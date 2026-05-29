// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/orderService.js
// Lógica de negocio para pedidos.
// Crea y actualiza pedidos en la BD.
// ═══════════════════════════════════════

const supabase = require('../db/supabase');

// ── Crea un pedido draft en la BD.
// Idempotente — si ya existe un pedido pending del mismo cliente
// con el mismo plan en los últimos 10 minutos, lo devuelve sin crear uno nuevo.
async function createOrder({ customerId, plan, price, palette, style, fonts }) {

  // Ventana de idempotencia — evita duplicados por doble click o retry del frontend
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from('orders')
    .select()
    .eq('customer_id', customerId)
    .eq('plan', plan)
    .eq('status', 'pending')
    .gte('created_at', tenMinutesAgo)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('orders')
    .insert([{
      customer_id: customerId,
      plan,
      price,
      palette,
      style,
      fonts,
      status: 'pending',
    }])
    .select()
    .single();

  if (error) throw new Error(`Error creando pedido: ${error.message}`);

  return data;
}

// ── Actualiza el estado de un pedido.
// Se usa cuando MP confirma el pago via webhook.
// updated_at es manejado automáticamente por Supabase — no se envía desde el código.
async function updateOrderStatus(orderId, status) {

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw new Error(`Error actualizando pedido: ${error.message}`);

  return data;
}

// ── Busca un pedido por ID con todos sus datos relacionados.
// Incluye customer, payments y archivos — usado por el webhook y el polling de step5.
async function getOrderById(orderId) {

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers (*),
      payments (*),
      order_files (*)
    `)
    .eq('id', orderId)
    .single();

  if (error) throw new Error(`Error buscando pedido: ${error.message}`);

  return data;
}

module.exports = { createOrder, updateOrderStatus, getOrderById };