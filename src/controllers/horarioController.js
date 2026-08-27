// ═══════════════════════════════════════
// KYNEXA BACKEND — src/controllers/horarioController.js
// GET /api/horarios — pública, sin validación especial
// (solo lectura, no expone datos de nadie).
// ═══════════════════════════════════════

const { listAvailableHorarios } = require('../services/horarioService');

async function listHorariosHandler(req, res) {
  try {
    const horarios = await listAvailableHorarios();
    res.status(200).json({ horarios });
  } catch (err) {
    console.error('[horarioController] Error:', err.message);
    res.status(500).json({ error: 'No se pudieron obtener los turnos disponibles' });
  }
}

module.exports = { listHorariosHandler };