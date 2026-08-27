// ═══════════════════════════════════════
// KYNEXA BACKEND — src/routes/horarioRoutes.js
// ═══════════════════════════════════════

const express = require('express');
const router = express.Router();

const { listHorariosHandler } = require('../controllers/horarioController');

// GET /api/horarios — pública, solo lectura
router.get('/', listHorariosHandler);

module.exports = router;