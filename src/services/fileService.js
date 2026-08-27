// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/fileService.js
// Sube el CV adjunto de una reserva al
// Storage de Supabase. Simplificado respecto
// al flujo viejo: acá solo hay un archivo
// posible por reserva, no varios "slots".
// ═══════════════════════════════════════

const crypto   = require('crypto');
const supabase = require('../db/supabase');

const BUCKET          = 'kynexa-files';
const MAX_SIZE_MB      = 5;
const MAX_SIZE_BYTES   = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES     = ['application/pdf'];

// ── Genera una URL firmada para que el frontend suba el CV
// directo a Supabase Storage, antes de que la reserva exista.
// El filePath se genera con un id random propio — no depende
// de ningún id de reserva, porque en este punto todavía no existe.
async function getCvUploadUrl({ fileName, fileType, fileSize }) {

  if (fileSize > MAX_SIZE_BYTES) {
    throw new Error(`El archivo supera el límite de ${MAX_SIZE_MB}MB`);
  }

  if (!ALLOWED_TYPES.includes(fileType)) {
    throw new Error(`Tipo de archivo no permitido: ${fileType} (solo PDF)`);
  }

  const uniqueId = crypto.randomBytes(8).toString('hex');
  const filePath = `reservas-cv/${uniqueId}-${fileName}`;

  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .createSignedUploadUrl(filePath);

  if (error) throw new Error(`Error generando URL de subida: ${error.message}`);

  return {
    signedUrl: data.signedUrl,
    filePath,
    token:     data.token,
  };
}

module.exports = { getCvUploadUrl };