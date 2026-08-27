// ═══════════════════════════════════════
// KYNEXA BACKEND — src/controllers/reservaController.js
// POST /api/reservas
// POST /api/reservas/upload-cv-url
// ═══════════════════════════════════════

const { createReserva }              = require('../services/reservaService');
const { getHorarioById }             = require('../services/horarioService');
const { getCvUploadUrl }             = require('../services/fileService');
const { sendReservaConfirmationEmail, sendReservaAlertEmail } = require('../services/emailService');
const { withRetry } = require('../utils/retry');

async function createReservaHandler(req, res) {
  try {
    const { horarioId, nombre, apellido, email, telefono, nota, cvFilePath } = req.validatedReserva;

    const horario = await getHorarioById(horarioId);
    if (!horario) {
      return res.status(404).json({ error: 'Ese turno no existe' });
    }

    let resultado;
    try {
      resultado = await createReserva({ horarioId, nombre, apellido, email, telefono, nota, cvFilePath });
    } catch (err) {
      if (err.horarioOcupado) {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }

    res.status(201).json({ ok: true, fecha: horario.fecha, hora: horario.hora });

    // Los dos mails salen en segundo plano, con reintentos —
    // no hacen esperar a la persona por la respuesta.
    const nombreCompleto = `${nombre} ${apellido}`;

    try {
      await withRetry(() => sendReservaConfirmationEmail({ nombre, email, fecha: horario.fecha, hora: horario.hora }));
    } catch (emailErr) {
      console.error('[reservaController] No se pudo confirmar por mail a', email, ':', emailErr.message);
    }

    try {
      await withRetry(() => sendReservaAlertEmail({
        nombreCompleto, email, telefono,
        fecha: horario.fecha, hora: horario.hora,
        nota, tieneAdjuntoCv: Boolean(cvFilePath),
      }));
    } catch (emailErr) {
      console.error('[reservaController] No se pudo avisar por mail del turno nuevo:', emailErr.message);
    }

  } catch (err) {
    console.error('[reservaController] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'No se pudo procesar la reserva' });
    }
  }
}

// ── Genera la URL firmada para subir el CV antes de reservar
async function getCvUploadUrlHandler(req, res) {
  try {
    const { fileName, fileType, fileSize } = req.body;

    if (!fileName || !fileType || !fileSize) {
      return res.status(400).json({ error: 'Faltan datos del archivo' });
    }

    const resultado = await getCvUploadUrl({ fileName, fileType, fileSize });
    res.status(200).json(resultado);

  } catch (err) {
    console.error('[reservaController] Error generando URL de subida:', err.message);
    res.status(400).json({ error: err.message });
  }
}

module.exports = { createReservaHandler, getCvUploadUrlHandler };