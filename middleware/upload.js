const multer = require('multer');

const TIPOS_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB por arquivo
    files: 5,
  },
  fileFilter: (req, arquivo, cb) => {
    if (!TIPOS_PERMITIDOS.includes(arquivo.mimetype)) {
      return cb(new Error('Tipo de arquivo não permitido'));
    }
    cb(null, true);
  },
});

module.exports = upload;