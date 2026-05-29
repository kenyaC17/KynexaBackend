// ═══════════════════════════════════════
// KYNEXA BACKEND — src/controllers/paymentController.js
// Maneja la creación de preferencias de pago
// y el webhook de Mercado Pago.
// ═══════════════════════════════════════

const crypto = require('crypto');

// Importado al tope — no dentro de los handlers
// Evita el overhead de require() en cada request del webhook
const { MercadoPagoConfig, Payment } = require('mercadopago');

const { createPaymentPreference, savePayment } = require('../services/paymentService');
const { updateOrderStatus, getOrderById }       = require('../services/orderService');
const { sendConfirmationEmail }                 = require('../services/emailService');

// ── Cliente de MP inicializado una sola vez al arrancar el servidor
// Si MP_ACCESS_TOKEN no está configurado el servidor falla al iniciar — correcto
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

// ── Valida la firma HMAC-SHA256 del webhook de MP.
// Protege contra requests falsos que no vengan de MP.
// Formato del header x-signature: ts=123456,v1=abc123...
function validateWebhookSignature(req) {
  const secret    = process.env.MP_WEBHOOK_SECRET;
  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];

  // Sin secret configurado en Railway — salteamos validación (no recomendado en prod)
  if (!secret) return true;

  // Sin firma en el header — rechazamos
  if (!signature) return false;

  // Parseamos ts y v1 del header
  const parts = {};
  signature.split(',').forEach(part => {
    const [key, value] = part.split('=');
    if (key && value) parts[key] = value;
  });

  if (!parts.ts || !parts.v1) return false;

  // Construimos el manifest según la documentación de MP
  const dataId   = req.body?.data?.id || '';
  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;

  // Calculamos el HMAC esperado
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  // Comparación segura contra timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(parts.v1)
    );
  } catch {
    // Buffer.from lanza si los strings tienen longitudes distintas
    return false;
  }
}

// ── Reintenta una función async con espera exponencial entre intentos.
// Usado para el envío del email de confirmación post-pago.
async function withRetry(fn, maxAttempts = 3, delayMs = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`[retry] Intento ${attempt}/${maxAttempts} fallido: ${err.message}`);
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

// POST /api/payments/create
// Recibe el orderId, obtiene el pedido y crea la preferencia en MP.
// Devuelve la checkoutUrl al frontend para redirigir al usuario.
async function createPaymentHandler(req, res) {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId es requerido' });
    }

    const order = await getOrderById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Optional chaining — protege si el join de customers devuelve null
    const customerEmail = order.customers?.email;
    const customerName  = order.customers?.name;

    if (!customerEmail) {
      return res.status(400).json({ error: 'Datos del cliente incompletos' });
    }

    const preference = await createPaymentPreference({
      orderId:       order.id,
      plan:          order.plan,
      price:         order.price,
      customerEmail,
      customerName,
    });

    return res.status(200).json({
      success:     true,
      checkoutUrl: preference.init_point,
    });

  } catch (error) {
    console.error('[paymentController] createPaymentHandler:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/payments/webhook
// MP llama a este endpoint cuando confirma un pago.
// Verifica la firma, guarda el pago, actualiza el pedido y envía el email.
async function webhookHandler(req, res) {
  try {

    // Valida que el request venga realmente de MP
    if (!validateWebhookSignature(req)) {
      console.warn('[webhook] Firma inválida — request rechazado');
      return res.status(401).json({ error: 'Firma inválida' });
    }

    // MP puede mandar 'type' o 'action' según la versión del webhook
    const type = req.body.type || req.body.action;
    const data = req.body.data;

    // Solo procesamos notificaciones de pagos
    if (type !== 'payment' && type !== 'payment.created' && type !== 'payment.updated') {
      return res.status(200).json({ received: true });
    }

    if (!data?.id) {
      return res.status(200).json({ received: true });
    }

    // Usa el cliente inicializado al tope — no requiere nuevo MercadoPagoConfig
    const paymentClient = new Payment(mpClient);

    // Obtiene los detalles del pago desde la API de MP
    let paymentData;
    try {
      paymentData = await paymentClient.get({ id: data.id });
    } catch (mpError) {
      // ID no existe o error de MP — ignoramos sin romper
      console.warn('[webhook] Error obteniendo pago de MP:', mpError.message);
      return res.status(200).json({ received: true });
    }

    // Solo procesamos pagos aprobados
    if (paymentData.status !== 'approved') {
      return res.status(200).json({ received: true });
    }

    const orderId = paymentData.external_reference;

    if (!orderId) {
      console.warn('[webhook] Pago aprobado sin external_reference — ignorado');
      return res.status(200).json({ received: true });
    }

    // Guarda el pago en la BD
    await savePayment({
      orderId,
      mpPaymentId: String(paymentData.id),
      amount:      paymentData.transaction_amount,
      status:      'succeeded',
    });

    // Actualiza el estado del pedido a 'paid'
    await updateOrderStatus(orderId, 'paid');

    // Obtiene los datos completos del pedido para el email
    const fullOrder = await getOrderById(orderId);

    // Envía email de confirmación con retry x3 — espera exponencial
    // El pago ya está confirmado aunque el email falle
    await withRetry(() => sendConfirmationEmail({
      customerName:  fullOrder.customers?.name  || 'Cliente',
      customerEmail: fullOrder.customers?.email || '',
      plan:          fullOrder.plan,
      price:         fullOrder.price,
      orderId:       fullOrder.id,
    }));

    console.log(`[webhook] Pago confirmado — Orden ${orderId}`);

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('[webhookHandler]:', error.message);
    return res.status(500).json({ error: 'Error procesando webhook' });
  }
}

module.exports = { createPaymentHandler, webhookHandler };