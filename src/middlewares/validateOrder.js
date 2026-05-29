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

// ── Valida el token de sesión, los datos del usuario y el pedido.
// Si algo falla devuelve 400 o 403 antes de llegar al controller.
function validateOrder(req, res, next) {

  // Valida token de sesión — protege contra bots y requests automatizados
  // El token es un hex de 64 caracteres generado por el frontend al iniciar el builder
  const token = req.headers['x-session-token'];
  if (!token || token.length !== 64) {
    return res.status(403).json({ error: 'Token de sesión inválido' });
  }

  const { userData, plan, planPrice } = req.body;

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