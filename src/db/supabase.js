// ═══════════════════════════════════════
// KYNEXA BACKEND — src/db/supabase.js
// Conexión a Supabase.
// Este archivo exporta el cliente de Supabase
// que usan todos los servicios del backend.
// ═══════════════════════════════════════

// Importa el cliente de Supabase
const { createClient } = require('@supabase/supabase-js');

// Lee las credenciales desde .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('SUPABASE_KEY empieza con:', supabaseKey?.substring(0, 12));

// Valida que las credenciales existan
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las credenciales de Supabase en el .env');
}

// Crea y exporta el cliente
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
