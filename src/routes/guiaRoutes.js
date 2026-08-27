// ═══════════════════════════════════════
// KYNEXA BACKEND — src/routes/guiaRoutes.js
// ═══════════════════════════════════════

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const validateGuia       = require('../middlewares/validateGuia');
const { guiaHandler }    = require('../controllers/guiaController');

// Máximo 5 pedidos de guía por IP cada 15 minutos — generoso para
// uso normal, mucho para cualquier intento de spam
const guiaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos — probá de nuevo en un rato' },
});

// POST /api/guia — pide la guía gratuita
router.post('/', guiaLimiter, express.json({ limit: '100kb' }), validateGuia, guiaHandler);

module.exports = router;