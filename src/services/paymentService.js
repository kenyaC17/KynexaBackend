// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/paymentService.js
// Integración con Mercado Pago Checkout Pro.
// Crea preferencias de pago y registra
// los pagos en la BD.
// ═══════════════════════════════════════

const { MercadoPagoConfig, Preference } = require('mercadopago');
const supabase = require('../db/supabase');

// Inicializa el cliente de MP con el Access Token del .env
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN 
});

// Crea una preferencia de pago en MP
// Devuelve la URL de pago a la que redirigir al cliente
async function createPaymentPreference({ orderId, plan, price, customerEmail, customerName }) {

  const preference = new Preference(client);

  const PLAN_LABELS = { basico: 'Plan Básico', medio: 'Plan Medio', pro: 'Plan Pro' };

  const result = await preference.create({
    body: {
      items: [{
        title:       `KYNEXA Studio — ${PLAN_LABELS[plan]}`,
        quantity:    1,
        unit_price:  price,
        currency_id: 'ARS', // ← cambiá a 'USD' si operás en dólares
      }],
      payer: {
        email: customerEmail,
        name:  customerName,
      },
      // URLs de redirección después del pago
      back_urls: {
        success: `${process.env.FRONTEND_URL}/builder.html?status=success&order=${orderId}`,
        failure: `${process.env.FRONTEND_URL}/builder.html?status=failure&order=${orderId}`,
        pending: `${process.env.FRONTEND_URL}/builder.html?status=pending&order=${orderId}`,
      },
      auto_return:        'approved',  // ← redirige automáticamente al aprobar
      external_reference: orderId,    // ← ID del pedido para identificarlo en el webhook
      notification_url:   `${process.env.BACKEND_URL}/api/payments/webhook`, // ← webhook
    }
  });

  // En producción usar init_point — sandbox_init_point es solo para pruebas
  return result;
}

// Registra el pago en la BD — idempotente
// Si el mpPaymentId ya existe, devuelve el registro existente sin duplicar
async function savePayment({ orderId, mpPaymentId, amount, status }) {

  // Verificamos si ya procesamos este pago — MP puede reintentar el webhook
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('mp_payment_id', mpPaymentId)
    .maybeSingle();

  if (existing) {
    console.log(`[savePayment] Pago ${mpPaymentId} ya registrado — ignorando duplicado`);
    return existing;
  }

  const { data, error } = await supabase
    .from('payments')
    .insert([{
      order_id:      orderId,
      mp_payment_id: mpPaymentId,
      amount,
      status
    }])
    .select()
    .single();

  if (error) throw new Error(`Error guardando pago: ${error.message}`);

  return data;
}

module.exports = { createPaymentPreference, savePayment };