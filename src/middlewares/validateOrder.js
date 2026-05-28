// ═══════════════════════════════════════
// KYNEXA BACKEND — src/middlewares/validateOrder.js
// Valida los datos del pedido antes de
// que lleguen al controller.
// Si algo falta devuelve error 400/403.
// ═══════════════════════════════════════

function validateOrder(req, res, next) {
  // Valida token de sesión — protege contra bots y requests automatizados
  // El token es generado por el frontend al iniciar el builder
  const token = req.headers['x-session-token'];
  if (!token || token.length !== 64) {
    return res.status(403).json({ error: 'Token de sesión inválido' });
  }

  const {
    userData,
    plan,
    planPrice,
  } = req.body;

  // Valida datos del usuario
  if (!userData) {
    return res.status(400).json({ error: 'userData es requerido' });
  }

  if (!userData.name || userData.name.trim().length < 2) {
    return res.status(400).json({ error: 'Nombre inválido' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!userData.email || !emailRegex.test(userData.email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  // Valida plan
  const validPlans = ['basico', 'medio', 'pro'];
  if (!plan || !validPlans.includes(plan)) {
    return res.status(400).json({ error: 'Plan inválido' });
  }

  // Valida precio — protege contra manipulación del precio en el frontend
  const validPrices = { basico: 115, medio: 173, pro: 245 };
  if (!planPrice || planPrice !== validPrices[plan]) {
    return res.status(400).json({ error: 'Precio inválido' });
  }

  // Todo válido — continúa al controller
  next();
}

module.exports = { validateOrder };