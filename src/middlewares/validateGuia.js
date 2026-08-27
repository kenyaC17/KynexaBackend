// ═══════════════════════════════════════
// KYNEXA BACKEND — src/middlewares/validateGuia.js
// Valida el formulario de la guía gratuita
// antes de guardarlo y mandar el mail.
// Mismo mecanismo anti-bot que ya se usaba
// en el flujo viejo: token de sesión + Turnstile.
// ═══════════════════════════════════════

const { verifyTurnstileToken } = require('../utils/turnstile');

const EMAIL_REGEX        = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_TOKEN_REGEX = /^[a-f0-9]{64}$/;

async function validateGuia(req, res, next) {
  try {
    const { nombre, email, turnstileToken } = req.body;
    const sessionToken = req.headers['x-session-token'];

    if (!sessionToken || !SESSION_TOKEN_REGEX.test(sessionToken)) {
      return res.status(403).json({ error: 'Sesión inválida' });
    }

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return res.status(400).json({ error: 'Nombre inválido' });
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const captchaOk = await verifyTurnstileToken(turnstileToken, req.ip);
    if (!captchaOk) {
      return res.status(403).json({ error: 'Verificación anti-bot fallida' });
    }

    req.validatedGuia = {
      nombre: nombre.trim(),
      email:  email.trim().toLowerCase(),
    };

    next();

  } catch (err) {
    console.error('[validateGuia] Error inesperado:', err.message);
    res.status(500).json({ error: 'Error validando el formulario' });
  }
}

module.exports = validateGuia;