// ═══════════════════════════════════════
// KYNEXA BACKEND — src/routes/reservaRoutes.js
// ═══════════════════════════════════════

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const validateReserva = require('../middlewares/validateReserva');
const { createReservaHandler, uploadCvHandler } = require('../controllers/reservaController');

// Máximo 3 reservas por IP cada 60 minutos — a propósito más
// estricto que un simple anti-spam: el objetivo puntual es que
// una sola persona no pueda acaparar varios turnos disponibles
// (además de la protección por email en reservaService.js).
const reservaLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
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