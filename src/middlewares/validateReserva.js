// ═══════════════════════════════════════
// KYNEXA BACKEND — src/middlewares/validateReserva.js
// Valida el formulario de reserva de turno
// antes de guardarlo. Mismo mecanismo anti-bot
// que el resto: token de sesión + Turnstile.
// ═══════════════════════════════════════

const { verifyTurnstileToken } = require('../utils/turnstile');

const EMAIL_REGEX         = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_TOKEN_REGEX = /^[a-f0-9]{64}$/;
const UUID_REGEX          = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function validateReserva(req, res, next) {
  try {
    const { horarioId, nombre, apellido, email, telefono, nota, cvFilePath, turnstileToken } = req.body;
    const sessionToken = req.headers['x-session-token'];

    if (!sessionToken || !SESSION_TOKEN_REGEX.test(sessionToken)) {
      return res.status(403).json({ error: 'Sesión inválida' });
    }

    if (!horarioId || !UUID_REGEX.test(horarioId)) {
      return res.status(400).json({ error: 'Turno inválido' });
    }

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return res.status(400).json({ error: 'Nombre inválido' });
    }

    if (!apellido || typeof apellido !== 'string' || apellido.trim().length < 2) {
      return res.status(400).json({ error: 'Apellido inválido' });
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Teléfono y nota son opcionales, pero si vienen deben ser texto razonable
    if (telefono && (typeof telefono !== 'string' || telefono.length > 40)) {
      return res.status(400).json({ error: 'Teléfono inválido' });
    }

    if (nota && (typeof nota !== 'string' || nota.length > 1000)) {
      return res.status(400).json({ error: 'Nota demasiado larga (máximo 1000 caracteres)' });
    }

    // cvFilePath es opcional — solo si la persona adjuntó CV
    if (cvFilePath && (typeof cvFilePath !== 'string' || !cvFilePath.startsWith('reservas-cv/'))) {
      return res.status(400).json({ error: 'Referencia de archivo inválida' });
    }

    const captchaOk = await verifyTurnstileToken(turnstileToken, req.ip);
    if (!captchaOk) {
      return res.status(403).json({ error: 'Verificación anti-bot fallida' });
    }

    req.validatedReserva = {
      horarioId,
      nombre:     nombre.trim(),
      apellido:   apellido.trim(),
      email:      email.trim().toLowerCase(),
      telefono:   telefono ? telefono.trim() : null,
      nota:       nota ? nota.trim() : null,
      cvFilePath: cvFilePath || null,
    };

    next();

  } catch (err) {
    console.error('[validateReserva] Error inesperado:', err.message);
    res.status(500).json({ error: 'Error validando la reserva' });
  }
}

module.exports = validateReserva;