// ═══════════════════════════════════════
// KYNEXA BACKEND — src/controllers/paymentController.js
// Maneja la creación de preferencias de pago
// y el webhook de Mercado Pago.
// ═══════════════════════════════════════

const crypto = require('crypto');

const { createPaymentPreference, savePayment } = require('../services/paymentService');
const { updateOrderStatus, getOrderById }       = require('../services/orderService');
const { sendConfirmationEmail }                  = require('../services/emailService');

// Valida la firma del webhook de MP
// Protege contra requests falsos que no vengan de MP
function validateWebhookSignature(req) {
  const secret    = process.env.MP_WEBHOOK_SECRET;
  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];

  // Si no hay secret configurado, salteamos la validación
  if (!secret) return true;

  // Si no hay firma en el header, rechazamos
  if (!signature) return false;

  // Extraemos ts y v1 del header x-signature
  // Formato: ts=123456,v1=abc123...
  const parts = {};
  signature.split(',').forEach(part => {
    const [key, value] = part.split('=');
    parts[key] = value;
  });

  if (!parts.ts || !parts.v1) return false;

  // Construimos el string a firmar según la doc de MP
  const dataId   = req.body?.data?.id || '';
  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;

  // Calculamos el HMAC-SHA256
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  // Comparamos de forma segura para evitar timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(parts.v1)
  );
}

// Reintenta una función async hasta maxAttempts veces
// con espera exponencial entre intentos
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
// Recibe el orderId y crea la preferencia de pago en MP
// Devuelve la URL de pago al frontend
async function createPaymentHandler(req, res) {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId es requerido' });
    }

    // Obtiene el pedido completo con datos del cliente
    const order = await getOrderById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Crea la preferencia de pago en MP
    const preference = await createPaymentPreference({
      orderId:       order.id,
      plan:          order.plan,
      price:         order.price,
      customerEmail: order.customers.email,
      customerName:  order.customers.name,
    });

    // Devuelve la URL de pago al frontend
    // init_point para producción — sandbox_init_point solo para pruebas
    return res.status(200).json({
      success:     true,
      checkoutUrl: preference.init_point,
    });

  } catch (error) {
    console.error('[paymentController] Error:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/payments/webhook
// MP llama a este endpoint cuando confirma un pago
// Solo aquí se envía el email de confirmación
async function webhookHandler(req, res) {
  try {
    // Valida que el request venga realmente de MP
    if (!validateWebhookSignature(req)) {
      console.warn('[webhook] Firma inválida — request rechazado');
      return res.status(401).json({ error: 'Firma inválida' });
    }

    // MP puede mandar 'type' o 'action' según la versión
    const type = req.body.type || req.body.action;
    const data = req.body.data;

    // Solo procesamos notificaciones de pagos
    if (type !== 'payment' && type !== 'payment.created' && type !== 'payment.updated') {
      return res.status(200).json({ received: true });
    }

    if (!data?.id) {
      return res.status(200).json({ received: true });
    }

    const { MercadoPagoConfig, Payment } = require('mercadopago');
    const client  = new MercadoPagoConfig({ 
      accessToken: process.env.MP_ACCESS_TOKEN 
    });
    const payment = new Payment(client);

    // Obtiene los detalles del pago desde MP
    // Si el ID no existe (ej: simulación del panel), ignoramos sin error
    let paymentData;
    try {
      paymentData = await payment.get({ id: data.id });
    } catch (mpError) {
      return res.status(200).json({ received: true });
    }

    // Solo procesamos pagos aprobados
    if (paymentData.status !== 'approved') {
      return res.status(200).json({ received: true });
    }

    const orderId = paymentData.external_reference;

    // Guarda el pago en la BD
    await savePayment({
      orderId,
      mpPaymentId: String(paymentData.id),
      amount:      paymentData.transaction_amount,
      status:      'succeeded'
    });

    // Actualiza el estado del pedido a 'paid'
    await updateOrderStatus(orderId, 'paid');

    // Obtiene los datos del cliente para el email
    const fullOrder = await getOrderById(orderId);

    // Envía el email con retry — 3 intentos con espera exponencial
    // El pago ya está confirmado aunque el email falle
    await withRetry(() => sendConfirmationEmail({
      customerName:  fullOrder.customers.name,
      customerEmail: fullOrder.customers.email,
      plan:          fullOrder.plan,
      price:         fullOrder.price,
      orderId:       fullOrder.id,
    }));

    console.log(`✓ Pago confirmado y email enviado — Orden ${orderId}`);

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('[webhookHandler] Error:', error.message);
    return res.status(500).json({ error: 'Error procesando webhook' });
  }
}

module.exports = { createPaymentHandler, webhookHandler };