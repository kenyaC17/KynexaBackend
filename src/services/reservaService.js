// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/reservaService.js
// Crea una reserva. Dos protecciones:
// 1) contra choque de turnos, vía constraint UNIQUE
//    en horario_id (Postgres rechaza con 23505).
// 2) contra que un mismo cliente acapare varios
//    turnos: se chequea si ya tiene una reserva
//    con fecha futura antes de crear la nueva.
// ═══════════════════════════════════════

const supabase = require('../db/supabase');
const { findOrCreateCustomer } = require('./customerService');

const POSTGRES_UNIQUE_VIOLATION = '23505';

// ── ¿Este cliente ya tiene una reserva con fecha >= hoy?
// Dos consultas simples en vez de un join — mismo patrón
// que ya usa horarioService.js.
async function customerTieneReservaFutura(customerId) {

  const { data: reservasCliente, error: reservasError } = await supabase
    .from('reservas')
    .select('horario_id')
    .eq('customer_id', customerId);

  if (reservasError) throw new Error(`Error consultando reservas del cliente: ${reservasError.message}`);

  const idsHorarios = (reservasCliente || []).map(r => r.horario_id);
  if (idsHorarios.length === 0) return false;

  const hoy = new Date().toISOString().split('T')[0];

  const { data: horariosFuturos, error: horariosError } = await supabase
    .from('horarios_disponibles')
    .select('id')
    .in('id', idsHorarios)
    .gte('fecha', hoy);

  if (horariosError) throw new Error(`Error consultando horarios del cliente: ${horariosError.message}`);

  return (horariosFuturos || []).length > 0;
}

async function createReserva({ horarioId, nombre, apellido, email, telefono, nota, cvFilePath }) {

  const customer = await findOrCreateCustomer({ nombre, apellido, email, telefono });

  const yaTieneTurno = await customerTieneReservaFutura(customer.id);
  if (yaTieneTurno) {
    const err = new Error('Ya tenés una consulta agendada — escribinos si necesitás cambiar el horario');
    err.turnoExistente = true;
    throw err;
  }

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