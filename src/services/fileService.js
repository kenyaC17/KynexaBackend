// ═══════════════════════════════════════
// KYNEXA BACKEND — src/services/fileService.js
// Sube archivos al Storage de Supabase.
// Se llama desde orderController cuando
// el cliente adjunta archivos en el Step 3.
// ═══════════════════════════════════════

const supabase = require('../db/supabase');

const BUCKET = 'kynexa-files';

// Sube un archivo al bucket de Supabase
// Recibe el dataURL en base64 y lo convierte a buffer
async function saveFile({ orderId, slotId, fileName, fileType, fileSize, dataURL }) {

  // Convierte dataURL base64 a buffer
  const base64 = dataURL.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');

  // Ruta del archivo dentro del bucket: orderId/slotId-fileName
  const filePath = `${orderId}/${slotId}-${fileName}`;

  // Sube el archivo al bucket
  const { error: uploadError } = await supabase
    .storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType:  fileType,
      upsert:       true,
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