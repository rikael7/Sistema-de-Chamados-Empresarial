const { pool } = require('../config/dbpg'); // ajuste o caminho conforme seu projeto

const HORAS_BLOQUEIO = 5;

/**
 * Verifica se o usuário logado ainda está impedido de abrir um novo chamado.
 * Não escreve nada no banco — só lê o campo chamado_bloqueado_ate e compara
 * com o horário atual. Quem grava a data de bloqueio é o controller,
 * depois que o chamado é criado com sucesso (ver criarChamado).
 */
async function verificarLimiteChamados(req, res, next) {
  const usuarioId = req.session?.userId;

  if (!usuarioId) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada' });
  }

  try {
    const result = await pool.query(
      'SELECT chamado_bloqueado_ate FROM users WHERE id = $1',
      [usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Usuário não encontrado' });
    }

    const bloqueadoAte = result.rows[0].chamado_bloqueado_ate;

    if (bloqueadoAte && new Date(bloqueadoAte) > new Date()) {
      const minutosRestantes = Math.ceil((new Date(bloqueadoAte) - new Date()) / 60000);
      return res.status(429).json({
        erro: 'Limite de chamados atingido',
        detalhes: [`Você poderá abrir um novo chamado em aproximadamente ${minutosRestantes} minuto(s).`],
        bloqueado_ate: bloqueadoAte,
      });
    }

    next();
  } catch (erro) {
    console.error('Erro ao verificar limite de chamados:', erro);
    return res.status(500).json({ erro: 'Erro ao verificar limite de chamados' });
  }
}

module.exports = { verificarLimiteChamados, HORAS_BLOQUEIO };