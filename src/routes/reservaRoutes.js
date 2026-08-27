// ═══════════════════════════════════════
// KYNEXA BACKEND — src/routes/reservaRoutes.js
// ═══════════════════════════════════════

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const validateReserva = require('../middlewares/validateReserva');
const { createReservaHandler, getCvUploadUrlHandler } = require('../controllers/reservaController');

// Máximo 8 reservas por IP cada 15 minutos
const reservaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Demasiados intentos — probá de nuevo en un rato' },
});

// URLs de subida — mismo límite, para que no se generen sin fin
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Demasiados intentos — probá de nuevo en un rato' },
});

// POST /api/reservas — confirma un turno
router.post('/', reservaLimiter, validateReserva, createReservaHandler);

// POST /api/reservas/upload-cv-url — URL firmada para subir el CV
router.post('/upload-cv-url', uploadLimiter, getCvUploadUrlHandler);

module.exports = router;