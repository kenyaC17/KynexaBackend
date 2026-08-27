// ═══════════════════════════════════════
// KYNEXA BACKEND — src/routes/reservaRoutes.js
// ═══════════════════════════════════════

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const validateReserva = require('../middlewares/validateReserva');
const { createReservaHandler, uploadCvHandler } = require('../controllers/reservaController');

// Máximo 8 reservas por IP cada 15 minutos
const reservaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Demasiados intentos — probá de nuevo en un rato' },
});

// Límite propio para subir el CV — mismo cupo que reservas,
// para que no se pueda usar como vía separada de spam
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Demasiados intentos — probá de nuevo en un rato' },
});

// POST /api/reservas — confirma un turno (JSON chico, sin archivo)
router.post('/', reservaLimiter, express.json({ limit: '100kb' }), validateReserva, createReservaHandler);

// POST /api/reservas/upload-cv — sube el CV, en base64, directo
// al backend. Límite propio más grande (8mb: contempla el 5MB
// real del PDF + el ~33% extra que agrega la codificación base64).
router.post('/upload-cv', uploadLimiter, express.json({ limit: '8mb' }), uploadCvHandler);

module.exports = router;