// controllers/chamadosController.js
const { pool } = require('../config/dbpg');


// Formata o número exibido no dashboard, ex: 42 -> "OS-0042"
function formatarNumero(id) {
  return 'Chamado-' + String(id).padStart(4, '0');
}

// ADMIN CONTROLLER
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

// ========================== public controller ===================
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

    const arquivos = req.files || [];
    const anexos = [];

    for (const arquivo of arquivos) {
      const result = await client.query(
        `INSERT INTO chamado_anexos (chamado_id, caminho_arquivo, nome_original)
         VALUES ($1, $2, $3)
         RETURNING id, caminho_arquivo, nome_original`,
        [chamado.id, `/uploads/chamados/${arquivo.filename}`, arquivo.originalname]
      );
      anexos.push(result.rows[0]);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      id: numero,
      chamado_id: chamado.id,
      titulo: chamado.titulo,
      descricao: chamado.descricao,
      categoria: chamado.categoria,
      // prioridade: chamado.prioridade,
      status: chamado.status,
      criado_em: chamado.criado_em,
      criado_por: criador.name,
      anexos,
    });
  } catch (erro) {
    await client.query('ROLLBACK');
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
         u.name AS criado_por
       FROM chamados c
       LEFT JOIN users u ON u.id = c.usuario_id
       ${where}
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

    const anexos = await pool.query(
      'SELECT id, caminho_arquivo, nome_original, criado_em FROM chamado_anexos WHERE chamado_id = $1 ORDER BY criado_em',
      [id]
    );

    const comentarios = await pool.query(
      'SELECT id, autor_id, mensagem, criado_em FROM chamado_comentarios WHERE chamado_id = $1 ORDER BY criado_em',
      [id]
    );

    return res.json({
      ...chamado.rows[0],
      anexos: anexos.rows,
      comentarios: comentarios.rows,
    });
  } catch (erro) {
    console.error('Erro ao buscar chamado:', erro);
    return res.status(500).json({ erro: 'Erro ao buscar chamado' });
  }
}

// ------------------------------------------------------------
// POST /api/chamados/:id/anexos
// Adiciona novas fotos a um chamado já existente.
// ------------------------------------------------------------
async function adicionarAnexos(req, res) {
  const { id } = req.params;
  const arquivos = req.files || [];

  if (arquivos.length === 0) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
  }

  try {
    const chamado = await pool.query('SELECT id FROM chamados WHERE id = $1', [id]);
    if (chamado.rows.length === 0) {
      return res.status(404).json({ erro: 'Chamado não encontrado' });
    }

    const anexos = [];
    for (const arquivo of arquivos) {
      const result = await pool.query(
        `INSERT INTO chamado_anexos (chamado_id, caminho_arquivo, nome_original)
         VALUES ($1, $2, $3)
         RETURNING id, caminho_arquivo, nome_original, criado_em`,
        [id, `/uploads/chamados/${arquivo.filename}`, arquivo.originalname]
      );
      anexos.push(result.rows[0]);
    }

    return res.status(201).json({ anexos });
  } catch (erro) {
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

module.exports = {
  criarChamado,
  listarChamados,
  buscarChamado,
  adicionarAnexos,
  atualizarStatus,
  deletarChamado,
  adicionarComentario,
  statusUsuario 
};