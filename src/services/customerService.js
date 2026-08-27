// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/customerService.js
// Lógica de negocio para clientes.
// Un solo lugar central de datos de contacto —
// tanto la guía como las reservas pasan por acá,
// así queda una sola lista para futura publicidad.
// ═══════════════════════════════════════

const supabase = require('../db/supabase');

// ── Busca un cliente por email; si no existe lo crea.
// Si ya existe y llegan datos nuevos (apellido/teléfono que antes
// no tenía), los completa — nunca pisa un dato que ya tenía por uno vacío.
async function findOrCreateCustomer({ nombre, apellido, email, telefono }) {

  const { data: existing, error: findError } = await supabase
    .from('customers')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (findError) throw new Error(`Error buscando cliente: ${findError.message}`);

  if (existing) {
    // Completa campos que antes estaban vacíos, sin pisar los que ya tenía
    const updates = {};
    if (!existing.apellido && apellido) updates.apellido = apellido;
    if (!existing.telefono && telefono) updates.telefono = telefono;

    if (Object.keys(updates).length === 0) return existing;

    const { data: updated, error: updateError } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) throw new Error(`Error actualizando cliente: ${updateError.message}`);
    return updated;
  }

  const { data: created, error: createError } = await supabase
    .from('customers')
    .insert([{ nombre, apellido: apellido || null, email, telefono: telefono || null }])
    .select()
    .single();

  if (createError) throw new Error(`Error creando cliente: ${createError.message}`);

  return created;
}

module.exports = { findOrCreateCustomer };