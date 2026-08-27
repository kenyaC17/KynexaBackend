// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/fileService.js
// Sube el CV adjunto de una reserva directo
// desde el backend (con la service_role) —
// el navegador nunca habla con Supabase.
// ═══════════════════════════════════════

const crypto   = require('crypto');
const supabase = require('../db/supabase');

const BUCKET          = 'kynexa-files';
const MAX_SIZE_MB      = 5;
const MAX_SIZE_BYTES   = MAX_SIZE_MB * 1024 * 1024;

// Firma real de un PDF: los primeros bytes de cualquier PDF
// válido son siempre "%PDF-" — esto no se puede falsear con
// solo cambiarle el nombre o el tipo declarado al archivo.
const FIRMA_PDF = Buffer.from('%PDF-', 'ascii');

// ── Sube el CV al Storage de Supabase, validando que sea
// realmente un PDF (por firma, no por nombre) y que no
// supere el límite de tamaño.
async function uploadCvToStorage({ fileContentBase64, fileName, fileType }) {

  if (fileType !== 'application/pdf') {
    throw new Error('Solo se aceptan archivos PDF');
  }

  let buffer;
  try {
    buffer = Buffer.from(fileContentBase64, 'base64');
  } catch {
    throw new Error('El archivo no pudo leerse correctamente');
  }

  if (buffer.length === 0) {
    throw new Error('El archivo está vacío');
  }

  if (buffer.length > MAX_SIZE_BYTES) {
    throw new Error(`El archivo supera el límite de ${MAX_SIZE_MB}MB`);
  }

  // Chequeo de firma real — rechaza cualquier cosa que no sea
  // genuinamente un PDF, sin importar qué diga el nombre o el
  // tipo declarado por quien lo subió.
  const firmaArchivo = buffer.subarray(0, 5);
  if (!firmaArchivo.equals(FIRMA_PDF)) {
    throw new Error('El archivo no es un PDF válido');
  }

  // Sanitizar el nombre — sacar cualquier caracter que no sea
  // letra, número, punto o guion, para evitar problemas de ruta
  const nombreSeguro = (fileName || 'cv.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId  = crypto.randomBytes(8).toString('hex');
  const filePath  = `reservas-cv/${uniqueId}-${nombreSeguro}`;

  const { error } = await supabase
    .storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType: 'application/pdf' });

  if (error) throw new Error(`Error subiendo el archivo: ${error.message}`);

  return filePath;
}

module.exports = { uploadCvToStorage };