// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/fileService.js
// Sube archivos al Storage de Supabase.
// Se llama desde orderController cuando
// el cliente adjunta archivos en el Step 3.
// ═══════════════════════════════════════

const supabase = require('../db/supabase');

const BUCKET       = 'kynexa-files';
const MAX_SIZE_MB  = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Tipos de archivo permitidos por slot
const ALLOWED_TYPES = {
  cv:        ['application/pdf'],
  portfolio: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  photo:     ['image/jpeg', 'image/png', 'image/webp'],
};

// Sube un archivo al bucket de Supabase
// Recibe el dataURL en base64 y lo convierte a buffer
async function saveFile({ orderId, slotId, fileName, fileType, fileSize, dataURL }) {

  // Valida que el dataURL existe
  if (!dataURL) throw new Error(`El archivo ${fileName} no tiene contenido`);

  // Valida tamaño
  if (fileSize > MAX_SIZE_BYTES) {
    throw new Error(`El archivo ${fileName} supera el límite de ${MAX_SIZE_MB}MB`);
  }

  // Valida tipo de archivo según el slot
  const allowedForSlot = ALLOWED_TYPES[slotId];
  if (!allowedForSlot || !allowedForSlot.includes(fileType)) {
    throw new Error(`Tipo de archivo no permitido para ${slotId}: ${fileType}`);
  }

  // Convierte dataURL base64 a buffer
  const base64 = dataURL.split(',')[1];
  if (!base64) throw new Error(`Formato de archivo inválido: ${fileName}`);
  const buffer = Buffer.from(base64, 'base64');

  // Valida que el tamaño real del buffer no supere el límite
  // (protege contra manipulación del fileSize en el frontend)
  if (buffer.length > MAX_SIZE_BYTES) {
    throw new Error(`El contenido del archivo ${fileName} supera el límite de ${MAX_SIZE_MB}MB`);
  }

  // Ruta del archivo dentro del bucket: orderId/slotId-fileName
  const filePath = `${orderId}/${slotId}-${fileName}`;

  // Sube el archivo al bucket
  const { error: uploadError } = await supabase
    .storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: fileType,
      upsert:      true,
    });

  if (uploadError) throw new Error(`Error subiendo archivo: ${uploadError.message}`);

  // Guarda el registro en la tabla order_files
  const { data, error } = await supabase
    .from('order_files')
    .insert([{
      order_id:  orderId,
      slot_id:   slotId,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      file_path: filePath,
    }])
    .select()
    .single();

  if (error) throw new Error(`Error guardando registro de archivo: ${error.message}`);

  return data;
}

module.exports = { saveFile };