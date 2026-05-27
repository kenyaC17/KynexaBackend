// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/customerService.js
// Lógica de negocio para clientes.
// ═══════════════════════════════════════

const supabase = require('../db/supabase');

async function findOrCreateCustomer({ name, email, role, github, linkedin }) {

  // Busca si el cliente ya existe por email
  const { data: existing, error: findError } = await supabase
    .from('customers')
    .select('*')
    .eq('email', email)
    .maybeSingle(); // ← maybeSingle en lugar de single — no tira error si no encuentra

  if (findError) throw new Error(`Error buscando cliente: ${findError.message}`);

  // Si existe lo devuelve directamente
  if (existing) return existing;

  // Si no existe lo crea
  const { data: created, error: createError } = await supabase
    .from('customers')
    .insert([{ name, email, role, github, linkedin }])
    .select()
    .single();

  if (createError) throw new Error(`Error creando cliente: ${createError.message}`);

  return created;
}

module.exports = { findOrCreateCustomer };