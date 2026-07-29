// routes/chamados.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

const chamadosController = require('../controllers/chamadosController');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'public/uploads/chamados');
  },
  filename(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Middleware
const { isAuthenticated, admin } = require('../middleware/authMiddleware');


// admin route
router.patch('/chamados/:id/status',isAuthenticated, admin, chamadosController.atualizarStatus);

router.delete('/chamados/:id/',isAuthenticated, admin, chamadosController.deletarChamado);






// const upload = require('../middleware/authMiddleware');


// Criar chamado (com até 5 fotos)
router.post('/chamados', upload.array('anexos', 5), chamadosController.criarChamado);

// Listar chamados (aceita ?status=&categoria=&prioridade=)
router.get('/chamados', chamadosController.listarChamados);

// Detalhe de um chamado (com anexos e comentários)
router.get('/chamados/:id', chamadosController.buscarChamado);

// Adicionar mais fotos a um chamado existente
router.post('/chamados/:id/anexos', chamadosController.adicionarAnexos);

// Atualizar status do chamado


// Adicionar comentário/observação de acompanhamento
router.post('/chamados/:id/comentarios', chamadosController.adicionarComentario);

module.exports = router;