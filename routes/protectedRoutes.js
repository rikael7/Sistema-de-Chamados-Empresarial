const express = require('express');

// IMPORTAR MIDDLEWARES
const { isAuthenticated, admin } = require('../middleware/authMiddleware');

// IMPORTAR CONTROLLERS
const { findUserById } = require('../models/userModel'); // Controller
const adminController = require('../models/userModel'); // controler do admin
const path = require('path'); // biblioteca para manipulação de caminhos de arquivos
const router = express.Router();


//        IMPORTAR  PARA SUPORTAR TRANSPORTE DE ARQUIVOS
const multer = require('multer');
const pool = require('../config/dbpg'); // ajuste para o caminho real do seu módulo de conexão
const crypto = require('crypto');
const fs = require('fs'); // biblioteca para transições de arquivos 



//  CONFIG PARA USER FAZER UPLOAD DE AVATAR
const AVATAR_DIR = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
const AVATAR_PUBLIC_PATH = '/uploads/avatars';
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AVATAR_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.session.userId}-${uniqueSuffix}${ext}`);
  }
});
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);
 
  if (!mimeOk || !extOk) {
    return cb(new Error('Formato de arquivo não suportado. Envie JPG, PNG ou WEBP.'));
  }
  cb(null, true);
}
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});
// ////////////

// ===================
//  POST ROUTES ADMIN
// =================
router.post( '/videos', isAuthenticated, admin,
    upload.single('video'),
    adminController.uploadVideo
);

// ///////////////////////////////////////////////

// POST ROUTES USER NORMAL
router.post('/avatar', isAuthenticated, (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'A imagem deve ter no máximo 2MB.' });
      }
      return res.status(400).json({ error: 'Erro no upload do arquivo.' });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
 
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
 
    try {
      const user = await findUserById(req.session.userId);
      if (!user) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
 
      // Remove o avatar antigo do disco, se existir e for um arquivo local
      if (user.avatar_url && user.avatar_url.startsWith(AVATAR_PUBLIC_PATH)) {
        const oldPath = path.join(__dirname, '..', 'public', user.avatar_url);
        fs.unlink(oldPath, () => {});
      }
 
      const avatarUrl = `${AVATAR_PUBLIC_PATH}/${req.file.filename}`;
 
      await pool.query(
        'UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?',
        [avatarUrl, req.session.userId]
      );
 
      return res.status(200).json({
        message: 'Avatar atualizado com sucesso.',
        avatar_url: avatarUrl
      });
    } catch (dbErr) {
      console.error('Erro ao salvar avatar:', dbErr);
      fs.unlink(req.file.path, () => {});
      return res.status(500).json({ error: 'Erro interno ao salvar avatar.' });
    }
  });



});


// GET ROUTES USER NORMAL
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await findUserById(req.session.userId); // 
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    return res.status(200).json({ user });
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});


// api streaming de vídeo
router.get('/stream/:video', isAuthenticated, (req, res) => {
    const videoPath = path.join(
      __dirname,
        '..',
        'public',
        'uploads',
        'videos',
        req.params.video
    );
   
    if (!fs.existsSync(videoPath)) {
        return res.status(404).send('Vídeo não encontrado');
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (!range) {
        return res.status(400).send('Cabeçalho Range é obrigatório');
    }

    const CHUNK_SIZE = 1024 * 1024; // 1 MB
    const start = Number(range.replace(/\D/g, ''));
    const end = Math.min(
        start + CHUNK_SIZE - 1,
        fileSize - 1
    );

    const contentLength = end - start + 1;
    const headers = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4"
    };
    res.writeHead(206, headers);

    const stream = fs.createReadStream(videoPath, {
        start,
        end
    });

    stream.pipe(res);

});


module.exports = router;