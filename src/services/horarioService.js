// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/horarioService.js
// Turnos disponibles. Un horario está libre si
// ningún registro en "reservas" lo referencia —
// no hay una columna de estado separada que
// pueda desincronizarse; una sola fuente de verdad.
// ═══════════════════════════════════════

const supabase = require('../db/supabase');

// ── Lista los turnos futuros que todavía no fueron reservados
async function listAvailableHorarios() {

  const hoy = new Date().toISOString().split('T')[0];

  // Primero, los ids de turnos ya reservados
  const { data: reservados, error: reservadosError } = await supabase
    .from('reservas')
    .select('horario_id');

  if (reservadosError) throw new Error(`Error consultando reservas: ${reservadosError.message}`);

  const idsReservados = (reservados || []).map(r => r.horario_id);

  let query = supabase
    .from('horarios_disponibles')
    .select('id, fecha, hora')
    .gte('fecha', hoy)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true });

  if (idsReservados.length > 0) {
    query = query.not('id', 'in', `(${idsReservados.join(',')})`);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Error listando horarios: ${error.message}`);

  return data;
}

// ── Trae un horario puntual por id (usado al confirmar una reserva)
async function getHorarioById(id) {

  const { data, error } = await supabase
    .from('horarios_disponibles')
    .select('id, fecha, hora')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Error buscando horario: ${error.message}`);

  return data;
}

module.exports = { listAvailableHorarios, getHorarioById };