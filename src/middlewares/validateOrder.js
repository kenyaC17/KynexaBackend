// ═══════════════════════════════════════
// KYNEXA BACKEND — src/middlewares/validateOrder.js
// Valida los datos del pedido antes de
// que lleguen al controller.
// Precios leídos desde variables de entorno
// con fallback a valores por defecto.
// ═══════════════════════════════════════

// ── Precios válidos por plan
// Se leen desde variables de entorno para poder actualizarlos sin tocar el código.
// Fallback a los valores actuales de producción.
const PLAN_PRICES = {
  basico: parseInt(process.env.PRICE_BASICO || '115', 10),
  medio:  parseInt(process.env.PRICE_MEDIO  || '173', 10),
  pro:    parseInt(process.env.PRICE_PRO    || '245', 10),
};

// ── Plans válidos — derivados de PLAN_PRICES para mantener una sola fuente de verdad
const VALID_PLANS = Object.keys(PLAN_PRICES);

// ── Regex de validación de email — definido una vez, no en cada request
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Verifica el token de Turnstile contra la API de Cloudflare
// Devuelve true si el challenge fue resuelto por un humano
async function verifyTurnstileToken(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error('[FATAL] TURNSTILE_SECRET_KEY no está configurado — rechazando');
    return false;
  }

  if (!token) return false;

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
    });
    if (remoteIp) body.append('remoteip', remoteIp);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = await res.json();
    return data.success === true;

  } catch (err) {
    console.error('[verifyTurnstileToken] Error verificando con Cloudflare:', err.message);
    return false;
  }
}

// ── Valida el token de sesión, el captcha, los datos del usuario y el pedido.
// Si algo falla devuelve 400 o 403 antes de llegar al controller.
async function validateOrder(req, res, next) {

  // Valida token de sesión — protege contra bots y requests automatizados
  // El token es un hex de 64 caracteres generado por el frontend al iniciar el builder
  const token = req.headers['x-session-token'];
  if (!token || token.length !== 64) {
    return res.status(403).json({ error: 'Token de sesión inválido' });
  }

  const { userData, plan, planPrice, turnstileToken } = req.body;

  // Valida el CAPTCHA — protege contra bots que generan órdenes masivas
  const captchaOk = await verifyTurnstileToken(turnstileToken, req.ip);
  if (!captchaOk) {
    return res.status(403).json({ error: 'Verificación de seguridad fallida' });
  }

  // Valida existencia de userData
  if (!userData) {
    return res.status(400).json({ error: 'userData es requerido' });
  }

  // Valida nombre — mínimo 2 caracteres después de trim
  if (!userData.name || userData.name.trim().length < 2) {
    return res.status(400).json({ error: 'Nombre inválido' });
  }

  // Valida formato de email
  if (!userData.email || !EMAIL_REGEX.test(userData.email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  // Valida plan — debe ser uno de los planes configurados
  if (!plan || !VALID_PLANS.includes(plan)) {
    return res.status(400).json({ error: 'Plan inválido' });
  }

  // Valida precio — protege contra manipulación del precio desde el frontend
  // Compara el precio enviado con el precio real del plan en el servidor
  if (!planPrice || planPrice !== PLAN_PRICES[plan]) {
    return res.status(400).json({ error: 'Precio inválido' });
  }

  // Todo válido — continúa al controller
  next();
}

module.exports = { validateOrder, PLAN_PRICES };