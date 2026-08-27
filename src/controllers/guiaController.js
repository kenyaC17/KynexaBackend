// ═══════════════════════════════════════
// KYNEXA BACKEND — src/controllers/guiaController.js
// POST /api/guia
// ═══════════════════════════════════════

const { saveGuiaLead }  = require('../services/guiaService');
const { sendGuiaEmail } = require('../services/emailService');
const { withRetry }     = require('../utils/retry');

async function guiaHandler(req, res) {
  try {
    const { nombre, email } = req.validatedGuia;

    await saveGuiaLead({ nombre, email });

    // Responde apenas se guardó — el mail no debería demorar la respuesta al usuario
    res.status(201).json({ ok: true });

    // El envío de mail sigue en segundo plano, con reintentos
    try {
      await withRetry(() => sendGuiaEmail({ nombre, email }));
    } catch (emailErr) {
      console.error('[guiaController] No se pudo enviar el email de guía a', email, ':', emailErr.message);
    }

  } catch (err) {
    console.error('[guiaController] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'No se pudo procesar la solicitud' });
    }
  }
}

module.exports = { guiaHandler };