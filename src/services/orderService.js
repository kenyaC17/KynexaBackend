// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/orderService.js
// Lógica de negocio para pedidos.
// Crea y actualiza pedidos en la BD.
// ═══════════════════════════════════════

const supabase = require('../db/supabase');

// Crea un nuevo pedido en la BD
// Recibe el id del cliente y los datos del builder
async function createOrder({ customerId, plan, price, palette, style, fonts }) {

  const { data, error } = await supabase
    .from('orders')
    .insert([{
      customer_id: customerId,
      plan,
      price,
      palette,
      style,
      fonts,
      status: 'pending'
    }])
    .select()
    .single();

  if (error) throw new Error(`Error creando pedido: ${error.message}`);

  return data;
}

// Actualiza el estado de un pedido
// Se usa cuando Stripe confirma el pago
async function updateOrderStatus(orderId, status) {

  const { data, error } = await supabase
    .from('orders')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw new Error(`Error actualizando pedido: ${error.message}`);

  return data;
}

// Busca un pedido por ID
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