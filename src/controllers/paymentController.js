// ═══════════════════════════════════════
// KYNEXA BACKEND — src/controllers/paymentController.js
// Maneja la creación de preferencias de pago
// y el webhook de Mercado Pago.
// ═══════════════════════════════════════

const { createPaymentPreference, savePayment } = require('../services/paymentService');
const { updateOrderStatus, getOrderById }       = require('../services/orderService');
const { sendConfirmationEmail }                  = require('../services/emailService');

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
    return res.status(200).json({
      success:     true,
      checkoutUrl: preference.sandbox_init_point, // ← en producción usar init_point
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
    const { type, data } = req.body;

    // Solo procesamos notificaciones de pagos
    if (type !== 'payment') {
      return res.status(200).json({ received: true });
    }

    const { MercadoPagoConfig, Payment } = require('mercadopago');
    const client  = new MercadoPagoConfig({ 
      accessToken: process.env.MP_ACCESS_TOKEN 
    });
    const payment = new Payment(client);

    // Obtiene los detalles del pago desde MP
    const paymentData = await payment.get({ id: data.id });

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
    const order = await updateOrderStatus(orderId, 'paid');

    // Obtiene los datos del cliente para el email
    const fullOrder = await getOrderById(orderId);

    // ← ÚNICO LUGAR donde se envía el email
    // Solo cuando MP confirma el pago
    await sendConfirmationEmail({
      customerName:  fullOrder.customers.name,
      customerEmail: fullOrder.customers.email,
      plan:          fullOrder.plan,
      price:         fullOrder.price,
      orderId:       fullOrder.id,
    });

    console.log(`✓ Pago confirmado y email enviado — Orden ${orderId}`);

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('[webhookHandler] Error:', error.message);
    return res.status(500).json({ error: 'Error procesando webhook' });
  }
}

module.exports = { createPaymentHandler, webhookHandler };