// controllers/chamadosController.js
const { pool } = require('../config/dbpg');


// // ========================== SUPABASE CONFIG ===================

const { subirAnexo, removerAnexos, gerarUrlAssinada } = require('../utils/supabaseAnexos');
const { HORAS_BLOQUEIO } = require('../middleware/Limitechamados');

// Formata o número exibido no dashboard, ex: 42 -> "Chamado-0042"
function formatarNumero(id) {
  return 'OS-' + String(id).padStart(4, '0');
}

// ========================== ADMIN CONTROLLER ===================

async function atualizarPrioridade(req, res) {
  const { id } = req.params;
  const { prioridade } = req.body;

  const prioridadesValidas = ['baixa', 'media', 'alta', 'urgente'];
  if (!prioridadesValidas.includes(prioridade)) {
    return res.status(400).json({ erro: `prioridade deve ser uma de: ${prioridadesValidas.join(', ')}` });
  }

  try {
    const result = await pool.query(
      'UPDATE chamados SET prioridade = $1 WHERE id = $2 RETURNING id, numero, prioridade, atualizado_em',
      [prioridade, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Chamado não encontrado' });
    }
    return res.json(result.rows[0]);
  } catch (erro) {
    console.error('Erro ao atualizar prioridade:', erro);
    return res.status(500).json({ erro: 'Erro ao atualizar prioridade' });
  }
}

// Atualiza o status do chamado (aberto | andamento | resolvido).
async function atualizarStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const statusValidos = ['aberto', 'andamento', 'resolvido'];
  if (!statusValidos.includes(status)) {
    return res.status(400).json({ erro: `status deve ser um de: ${statusValidos.join(', ')}` });
  }

  try {
    const result = await pool.query(
      'UPDATE chamados SET status = $1 WHERE id = $2 RETURNING id, numero, status, atualizado_em',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Chamado não encontrado' });
    }

    return res.json(result.rows[0]);
  } catch (erro) {
    console.error('Erro ao atualizar status:', erro);
    return res.status(500).json({ erro: 'Erro ao atualizar status' });
  }
}

async function deletarChamado(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const chamado = await client.query('SELECT id FROM chamados WHERE id = $1', [id]);
    if (chamado.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Chamado não encontrado' });
    }
    await client.query('DELETE FROM chamado_comentarios WHERE chamado_id = $1', [id]);
    await client.query('DELETE FROM chamado_anexos WHERE chamado_id = $1', [id]);
    await client.query('DELETE FROM chamados WHERE id = $1', [id]);
    await client.query('COMMIT');
    return res.status(204).send();
  } catch (erro) {
    await client.query('ROLLBACK');
    console.error('Erro ao excluir chamado:', erro);
    return res.status(500).json({ erro: 'Erro ao excluir chamado' });
  } finally {
    client.release();
  }
}

// ========================== PUBLIC CONTROLLER ===================
// front verifica se o user é admin para exibir botão que leva
// a pagina ao /admin
async function statusUsuario(req, res) {
  const usuarioId = req.session?.userId;

  if (!usuarioId) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada' });
  }

  try {
    const result = await pool.query(
      'SELECT adm FROM users WHERE id = $1',
      [usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Usuário não encontrado' });
    }

    const isAdmin = result.rows[0].adm === true;

    return res.json({ isAdmin });
  } catch (erro) {
    console.error('Erro ao buscar status do usuário:', erro);
    return res.status(500).json({ erro: 'Erro ao buscar status do usuário' });
  }
}

// ------------------------------------------------------------
// POST /api/chamados
// Cria um novo chamado. Aceita multipart/form-data com anexos[].
// ------------------------------------------------------------
async function criarChamado(req, res) {
  const { titulo, categoria, descricao } = req.body;

  if (!titulo || !categoria || !descricao) {
    return res.status(400).json({ erro: 'titulo, categoria, e descricao são obrigatórios' });
  }

  // O usuário JAMAIS decide quem criou o chamado — isso vem exclusivamente da sessão.
  const usuarioId = req.session?.userId;

  if (!usuarioId) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada' });
  }

  const client = await pool.connect();

  // Guarda os paths que subiram no Supabase, para poder limpar em caso de erro.
  const caminhosSupabaseUpload = [];

  try {
    await client.query('BEGIN');

    // Valida no banco que o usuário da sessão realmente existe.
    const usuarioResult = await client.query(
      'SELECT id, name FROM users WHERE id = $1',
      [usuarioId]
    );

    if (usuarioResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(401).json({ erro: 'Usuário não encontrado' });
    }

    const criador = usuarioResult.rows[0];

    const insertChamado = await client.query(
      `INSERT INTO chamados (titulo, descricao, categoria, status, usuario_id)
       VALUES ($1, $2, $3, 'aberto', $4)
       RETURNING id, titulo, descricao, categoria, status, criado_em`,
      [titulo, descricao, categoria, usuarioId]
    );

    const chamado = insertChamado.rows[0];
    const numero = formatarNumero(chamado.id);

    await client.query('UPDATE chamados SET numero = $1 WHERE id = $2', [numero, chamado.id]);

    // Registra o bloqueio: usuário só poderá abrir outro chamado depois de HORAS_BLOQUEIO horas.
    await client.query(
    `UPDATE users SET chamado_bloqueado_ate = NOW() + ($1 || ' hours')::interval WHERE id = $2`,
    [HORAS_BLOQUEIO, usuarioId]
    );
    const arquivos = req.files || [];
    const anexos = [];

    for (const arquivo of arquivos) {
      const { nomeArquivo, signedUrl } = await subirAnexo(chamado.id, arquivo);
      caminhosSupabaseUpload.push(nomeArquivo);

      const result = await client.query(
        `INSERT INTO chamado_anexos (chamado_id, caminho_arquivo, nome_original)
         VALUES ($1, $2, $3)
         RETURNING id, caminho_arquivo, nome_original`,
        [chamado.id, nomeArquivo, arquivo.originalname]
      );
      anexos.push({ ...result.rows[0], url: signedUrl });
    }

    await client.query('COMMIT');

    return res.status(201).json({
      id: numero,
      chamado_id: chamado.id,
      titulo: chamado.titulo,
      descricao: chamado.descricao,
      categoria: chamado.categoria,
      status: chamado.status,
      criado_em: chamado.criado_em,
      criado_por: criador.name,
      anexos,
    });
  } catch (erro) {
    await client.query('ROLLBACK');

    // Limpa os arquivos que já subiram no Supabase, já que o chamado foi revertido.
    await removerAnexos(caminhosSupabaseUpload);

    console.error('Erro ao criar chamado:', erro);
    return res.status(500).json({ erro: 'Erro ao criar chamado' });
  } finally {
    client.release();
  }
}

// ------------------------------------------------------------
// GET /api/chamados
// Lista chamados. Filtros opcionais via query string: ?status=&categoria=&prioridade=
// ------------------------------------------------------------
async function listarChamados(req, res) {
  const { status, categoria, prioridade } = req.query;

  const condicoes = [];
  const valores = [];

  if (status) {
    valores.push(status);
    condicoes.push(`c.status = $${valores.length}`);
  }
  if (categoria) {
    valores.push(categoria);
    condicoes.push(`c.categoria = $${valores.length}`);
  }
  if (prioridade) {
    valores.push(prioridade);
    condicoes.push(`c.prioridade = $${valores.length}`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT
         c.id, c.numero, c.titulo, c.categoria, c.prioridade, c.status,
         c.criado_em, c.atualizado_em,
         u.name AS criado_por,
         COUNT(ca.id) AS anexos
       FROM chamados c
       LEFT JOIN users u ON u.id = c.usuario_id
       LEFT JOIN chamado_anexos ca ON ca.chamado_id = c.id
       ${where}
       GROUP BY c.id, u.name
       ORDER BY c.criado_em DESC`,
      valores
    );
    return res.json(result.rows);
  } catch (erro) {
    console.error('Erro ao listar chamados:', erro);
    return res.status(500).json({ erro: 'Erro ao listar chamados' });
  }
}

// ------------------------------------------------------------
// GET /api/chamados/:id
// Detalhe de um chamado, incluindo anexos e comentários.
// ------------------------------------------------------------
async function buscarChamado(req, res) {
  const { id } = req.params;

  try {
    const chamado = await pool.query('SELECT * FROM chamados WHERE id = $1', [id]);

    if (chamado.rows.length === 0) {
      return res.status(404).json({ erro: 'Chamado não encontrado' });
    }

    const anexosResult = await pool.query(
      'SELECT id, caminho_arquivo, nome_original, criado_em FROM chamado_anexos WHERE chamado_id = $1 ORDER BY criado_em',
      [id]
    );

    // Gera uma signed URL nova pra cada anexo (a URL salva/gerada na criação expira em 1h).
    const anexos = await Promise.all(
      anexosResult.rows.map(async (anexo) => ({
        ...anexo,
        url: await gerarUrlAssinada(anexo.caminho_arquivo),
      }))
    );

    const comentarios = await pool.query(
      'SELECT id, autor_id, mensagem, criado_em FROM chamado_comentarios WHERE chamado_id = $1 ORDER BY criado_em',
      [id]
    );

    return res.json({
      ...chamado.rows[0],
      anexos,
      comentarios: comentarios.rows,
    });
  } catch (erro) {
    console.error('Erro ao buscar chamado:', erro);
    return res.status(500).json({ erro: 'Erro ao buscar chamado' });
  }
}

// ------------------------------------------------------------
// POST /api/chamados/:id/anexos
// Adiciona novos anexos a um chamado já existente.
// ------------------------------------------------------------
async function adicionarAnexos(req, res) {
  const { id } = req.params;
  const arquivos = req.files || [];

  if (arquivos.length === 0) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
  }

  const caminhosSupabaseUpload = [];

  try {
    const chamado = await pool.query('SELECT id FROM chamados WHERE id = $1', [id]);
    if (chamado.rows.length === 0) {
      return res.status(404).json({ erro: 'Chamado não encontrado' });
    }

    const anexos = [];
    for (const arquivo of arquivos) {
      const { nomeArquivo, signedUrl } = await subirAnexo(id, arquivo);
      caminhosSupabaseUpload.push(nomeArquivo);

      const result = await pool.query(
        `INSERT INTO chamado_anexos (chamado_id, caminho_arquivo, nome_original)
         VALUES ($1, $2, $3)
         RETURNING id, caminho_arquivo, nome_original, criado_em`,
        [id, nomeArquivo, arquivo.originalname]
      );
      anexos.push({ ...result.rows[0], url: signedUrl });
    }

    return res.status(201).json({ anexos });
  } catch (erro) {
    await removerAnexos(caminhosSupabaseUpload);
    console.error('Erro ao adicionar anexos:', erro);
    return res.status(500).json({ erro: 'Erro ao adicionar anexos' });
  }
}

// ------------------------------------------------------------
// POST /api/chamados/:id/comentarios
// Adiciona um comentário/observação de acompanhamento ao chamado.
// ------------------------------------------------------------
async function adicionarComentario(req, res) {
  const { id } = req.params;
  const { mensagem, autor_id } = req.body;

  if (!mensagem) {
    return res.status(400).json({ erro: 'mensagem é obrigatória' });
  }

  try {
    const chamado = await pool.query('SELECT id FROM chamados WHERE id = $1', [id]);
    if (chamado.rows.length === 0) {
      return res.status(404).json({ erro: 'Chamado não encontrado' });
    }

    const result = await pool.query(
      `INSERT INTO chamado_comentarios (chamado_id, autor_id, mensagem)
       VALUES ($1, $2, $3)
       RETURNING id, chamado_id, autor_id, mensagem, criado_em`,
      [id, autor_id || null, mensagem]
    );

    return res.status(201).json(result.rows[0]);
  } catch (erro) {
    console.error('Erro ao adicionar comentário:', erro);
    return res.status(500).json({ erro: 'Erro ao adicionar comentário' });
  }
}

// Carregar usuario
async function carregarUsuario(req, res) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, adm FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar usuário logado:', err);
    res.status(500).json({ erro: 'Erro ao buscar usuário' });
  }
}

module.exports = {
  criarChamado,
  listarChamados,
  buscarChamado,
  adicionarAnexos,
  atualizarPrioridade,
  atualizarStatus,
  deletarChamado,
  adicionarComentario,
  carregarUsuario,
  statusUsuario,
};