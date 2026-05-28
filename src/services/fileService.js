// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/fileService.js
// Sube archivos al Storage de Supabase.
// Se llama desde orderController cuando
// el cliente adjunta archivos en el Step 3.
// ═══════════════════════════════════════

const supabase = require('../db/supabase');

const BUCKET         = 'kynexa-files';
const MAX_SIZE_MB    = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Tipos de archivo permitidos por slot
const ALLOWED_TYPES = {
  cv:        ['application/pdf'],
  portfolio: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  photo:     ['image/jpeg', 'image/png', 'image/webp'],
};

// Genera una URL firmada para que el frontend suba directamente a Supabase Storage
// Evita pasar el archivo por el backend — más rápido y liviano
async function getUploadUrl({ orderId, slotId, fileName, fileType, fileSize }) {

  // Valida tamaño
  if (fileSize > MAX_SIZE_BYTES) {
    throw new Error(`El archivo supera el límite de ${MAX_SIZE_MB}MB`);
  }

  // Valida tipo de archivo según el slot
  const allowedForSlot = ALLOWED_TYPES[slotId];
  if (!allowedForSlot || !allowedForSlot.includes(fileType)) {
    throw new Error(`Tipo de archivo no permitido para ${slotId}: ${fileType}`);
  }

  // Ruta del archivo dentro del bucket
  const filePath = `${orderId}/${slotId}-${fileName}`;

  // Genera URL firmada válida por 60 segundos
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

// Registra el archivo en la tabla order_files después de que el frontend lo subió
async function registerFile({ orderId, slotId, fileName, fileType, fileSize, filePath }) {

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

  if (error) throw new Error(`Error registrando archivo: ${error.message}`);

  return data;
}

// Sube un archivo al bucket de Supabase desde el backend (fallback)
// Se usa solo si el frontend no puede subir directamente
async function saveFile({ orderId, slotId, fileName, fileType, fileSize, dataURL }) {

  if (!dataURL) throw new Error(`El archivo ${fileName} no tiene contenido`);

  if (fileSize > MAX_SIZE_BYTES) {
    throw new Error(`El archivo ${fileName} supera el límite de ${MAX_SIZE_MB}MB`);
  }

  const allowedForSlot = ALLOWED_TYPES[slotId];
  if (!allowedForSlot || !allowedForSlot.includes(fileType)) {
    throw new Error(`Tipo de archivo no permitido para ${slotId}: ${fileType}`);
  }

  const base64 = dataURL.split(',')[1];
  if (!base64) throw new Error(`Formato de archivo inválido: ${fileName}`);
  const buffer = Buffer.from(base64, 'base64');

  if (buffer.length > MAX_SIZE_BYTES) {
    throw new Error(`El contenido del archivo ${fileName} supera el límite de ${MAX_SIZE_MB}MB`);
  }

  const filePath = `${orderId}/${slotId}-${fileName}`;

  const { error: uploadError } = await supabase
    .storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: fileType,
      upsert:      true,
    });

  if (uploadError) throw new Error(`Error subiendo archivo: ${uploadError.message}`);

  return await registerFile({ orderId, slotId, fileName, fileType, fileSize, filePath });
}

module.exports = { getUploadUrl, registerFile, saveFile };