// routes/chamados.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');


const path = require('path');



// Mcontroler
const chamadosController = require('../controllers/chamadosController');
const { statusUsuario } = require('../controllers/chamadosController');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'public/uploads/chamados');
  },
  filename(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5
    }
});

// Middleware
const { isAuthenticated, admin } = require('../middleware/authMiddleware');

const { criarchamado } = require('../middleware/validatorschamados');

// admin route
router.patch('/chamados/:id/status',isAuthenticated, admin, chamadosController.atualizarStatus);

router.delete('/chamados/:id/',isAuthenticated, admin, chamadosController.deletarChamado);






// verifica se o usar é admin 
router.get('/me/status', isAuthenticated, statusUsuario);

// Listar chamados (aceita ?status=&categoria=&prioridade=)
router.get('/chamados', isAuthenticated,  chamadosController.listarChamados);

// Detalhe de um chamado (com anexos e comentários)
router.get('/chamados/:id', isAuthenticated,  chamadosController.buscarChamado);






// POST
// Criar chamado (com até 5 fotos)
router.post('/chamados' ,   upload.array('anexos', 5), isAuthenticated, criarchamado({
    titulo: { required: true, type: 'string', minLength: 6, maxLength: 20 },
    categoria: { required: true, type: 'string', minLength: 6, maxLength: 50 },
    descricao: { required: true, type: 'string', minLength: 10, maxLength: 3000 }
  }), chamadosController.criarChamado);


// Adicionar mais fotos a um chamado existente
router.post('/chamados/:id/anexos', isAuthenticated,  chamadosController.adicionarAnexos);

// Adicionar comentário/observação de acompanhamento
router.post('/chamados/:id/comentarios', isAuthenticated, chamadosController.adicionarComentario);

module.exports = router;