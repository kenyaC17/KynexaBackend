// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/reservaService.js
// Crea una reserva. La protección contra choque
// de turnos vive en la base de datos (constraint
// UNIQUE en horario_id) — si dos personas reservan
// el mismo turno al mismo tiempo, Postgres rechaza
// la segunda automáticamente con el código 23505.
// ═══════════════════════════════════════

const supabase = require('../db/supabase');
const { findOrCreateCustomer } = require('./customerService');

const POSTGRES_UNIQUE_VIOLATION = '23505';

async function createReserva({ horarioId, nombre, apellido, email, telefono, nota, cvFilePath }) {

  const customer = await findOrCreateCustomer({ nombre, apellido, email, telefono });

  const { data, error } = await supabase
    .from('reservas')
    .insert([{
      horario_id:   horarioId,
      customer_id:  customer.id,
      nota,
      cv_file_path: cvFilePath,
    }])
    .select()
    .single();

  if (error) {
    if (error.code === POSTGRES_UNIQUE_VIOLATION) {
      const err = new Error('Ese turno ya fue reservado por otra persona');
      err.horarioOcupado = true;
      throw err;
    }
    throw new Error(`Error creando reserva: ${error.message}`);
  }

  return { reserva: data, customer };
}

module.exports = { createReserva };