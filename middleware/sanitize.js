// middleware/sanitize.js
const xss = require('xss');

// Remove/escapa tags HTML e JS de todos os campos string do body.
// Roda antes das validações específicas de cada rota.
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key].trim());
      }
    }
  }
  next();
}

module.exports = { sanitizeBody };