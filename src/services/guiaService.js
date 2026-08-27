// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/guiaService.js
// Guarda quién pidió la guía gratuita.
// ═══════════════════════════════════════

const supabase = require('../db/supabase');
const { findOrCreateCustomer } = require('./customerService');

async function saveGuiaLead({ nombre, email }) {

  const customer = await findOrCreateCustomer({ nombre, email });

  const { data, error } = await supabase
    .from('guia_leads')
    .insert([{ customer_id: customer.id }])
    .select()
    .single();

  if (error) throw new Error(`Error guardando lead de guía: ${error.message}`);

  return { lead: data, customer };
}

module.exports = { saveGuiaLead };