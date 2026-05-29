// ═══════════════════════════════════════
// KYNEXA BACKEND — src/jobs/cleanupStorage.js
// Job de limpieza de archivos huérfanos.
// Elimina archivos de pedidos pending que
// no fueron pagados en las últimas 24hs.
// Corre cada hora via setInterval.
// ═══════════════════════════════════════

const supabase = require('../db/supabase');

const BUCKET              = 'kynexa-files';
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;      // cada 1 hora
const MAX_AGE_MS          = 24 * 60 * 60 * 1000; // archivos de más de 24hs

// ── Ejecuta una ronda de limpieza.
// Busca pedidos pending viejos, elimina sus archivos del Storage
// y limpia los registros de order_files.
// No elimina los pedidos ni los clientes — solo archivos huérfanos.
async function runCleanup() {
  try {
    const cutoffDate = new Date(Date.now() - MAX_AGE_MS).toISOString();

    // Busca pedidos pending con más de 24hs sin pagar
    const { data: stalePendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'pending')
      .lt('created_at', cutoffDate);

    if (ordersError) {
      console.error('[cleanupStorage] Error buscando pedidos viejos:', ordersError.message);
      return;
    }

    if (!stalePendingOrders || stalePendingOrders.length === 0) {
      return;
    }

    const staleOrderIds = stalePendingOrders.map(o => o.id);

    // Busca los archivos asociados a esos pedidos
    const { data: staleFiles, error: filesError } = await supabase
      .from('order_files')
      .select('id, file_path')
      .in('order_id', staleOrderIds);

    if (filesError) {
      console.error('[cleanupStorage] Error buscando archivos huérfanos:', filesError.message);
      return;
    }

    if (!staleFiles || staleFiles.length === 0) {
      return;
    }

    // Elimina los archivos del bucket de Supabase Storage
    const filePaths = staleFiles.map(f => f.file_path).filter(Boolean);
    if (filePaths.length > 0) {
      const { error: storageError } = await supabase
        .storage
        .from(BUCKET)
        .remove(filePaths);

      if (storageError) {
        console.error('[cleanupStorage] Error eliminando archivos del Storage:', storageError.message);
        // Continúa igual — intenta limpiar los registros de BD
      }
    }

    // Elimina los registros de order_files de la BD
    const staleFileIds = staleFiles.map(f => f.id);
    const { error: deleteError } = await supabase
      .from('order_files')
      .delete()
      .in('id', staleFileIds);

    if (deleteError) {
      console.error('[cleanupStorage] Error eliminando registros de order_files:', deleteError.message);
      return;
    }

    console.log(`[cleanupStorage] ${staleFiles.length} archivo(s) eliminado(s) de ${staleOrderIds.length} pedido(s) sin pagar`);

  } catch (err) {
    // Error inesperado — logguea pero no rompe el servidor
    console.error('[cleanupStorage] Error inesperado:', err.message);
  }
}

// ── Inicia el job de limpieza.
// Ejecuta una ronda inmediatamente al arrancar y luego cada hora.
// Exportado para ser iniciado desde index.js.
function startCleanupJob() {
  // Primera ejecución al arrancar — limpia archivos viejos de inmediato
  runCleanup();

  // Ejecución periódica cada hora
  setInterval(runCleanup, CLEANUP_INTERVAL_MS);

  console.log('[cleanupStorage] Job de limpieza iniciado — intervalo: 1 hora');
}

module.exports = { startCleanupJob };