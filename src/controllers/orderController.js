// ═══════════════════════════════════════
// KYNEXA BACKEND — src/controllers/orderController.js
// Maneja creación de pedidos, consulta por ID
// y generación de URLs firmadas para upload.
// ═══════════════════════════════════════

const { findOrCreateCustomer }                = require('../services/customerService');
const { createOrder, getOrderById }           = require('../services/orderService');
const { saveFile, getUploadUrl, registerFile } = require('../services/fileService');
const { sendOrderRecoveryEmail }              = require('../services/emailService');

// POST /api/orders
// Crea un cliente si no existe y registra el pedido draft.
// La validación de datos ya fue hecha por validateOrder middleware.
// El email de recovery se envía sin bloquear la respuesta.
async function createOrderHandler(req, res) {
  try {
    const {
      userData,
      plan,
      planPrice,
      palette,
      style,
      fonts,
      files,
    } = req.body;

    // Busca o crea el cliente por email
    const customer = await findOrCreateCustomer({
      name:     userData.name,
      email:    userData.email,
      role:     userData.role     || null,
      github:   userData.github   || null,
      linkedin: userData.linkedin || null,
    });

    // Crea el pedido draft — idempotente en ventana de 10 minutos
    const order = await createOrder({
      customerId: customer.id,
      plan,
      price: planPrice,
      palette,
      style,
      fonts,
    });

    // Procesa archivos si vienen en el body (flujo fallback con dataURL)
    if (files && files.length > 0) {

      // Archivos con dataURL — subida desde el backend (fallback)
      const filesWithDataURL = files.filter(f => f.dataURL);
      if (filesWithDataURL.length > 0) {
        await Promise.all(
          filesWithDataURL.map(file => saveFile({
            orderId:  order.id,
            slotId:   file.slotId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            dataURL:  file.dataURL,
          }))
        );
      }

      // Archivos ya subidos directamente por el frontend — solo registrar en BD
      const filesWithPath = files.filter(f => f.filePath && !f.dataURL);
      if (filesWithPath.length > 0) {
        await Promise.all(
          filesWithPath.map(file => registerFile({
            orderId:  order.id,
            slotId:   file.slotId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            filePath: file.filePath,
          }))
        );
      }
    }

    // Envía email de recovery — no bloquea la respuesta si falla
    sendOrderRecoveryEmail({
      customerName:  userData.name,
      customerEmail: userData.email,
      plan,
      price:         planPrice,
      orderId:       order.id,
    }).catch(err => {
      console.error('[orderController] Error enviando recovery email:', err.message);
    });

    return res.status(201).json({
      success: true,
      orderId: order.id,
      message: 'Pedido creado correctamente',
    });

  } catch (error) {
    console.error('[orderController] createOrderHandler:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/orders/upload-url
// Genera una URL firmada para que el frontend suba directamente a Supabase Storage.
// Evita pasar el archivo por el backend — más rápido y sin cuello de botella.
async function getUploadUrlHandler(req, res) {
  try {
    const { orderId, slotId, fileName, fileType, fileSize } = req.body;

    if (!orderId || !slotId || !fileName || !fileType || !fileSize) {
      return res.status(400).json({ error: 'Faltan datos del archivo' });
    }

    // Validación de tipo — solo imágenes y PDF permitidos
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!ALLOWED_TYPES.includes(fileType)) {
      return res.status(400).json({ error: 'Tipo de archivo no permitido' });
    }

    // Validación de tamaño — máximo 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      return res.status(400).json({ error: 'El archivo supera el límite de 10MB' });
    }

    const result = await getUploadUrl({ orderId, slotId, fileName, fileType, fileSize });

    return res.status(200).json({
      success:   true,
      signedUrl: result.signedUrl,
      filePath:  result.filePath,
      token:     result.token,
    });

  } catch (error) {
    console.error('[orderController] getUploadUrlHandler:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/orders/:id
// Devuelve el pedido completo con customer, payments y archivos.
// Usado por step5Confirm para polling de estado post-pago.
// IMPORTANTE: devuelve el objeto order directamente — no anidado en { order }
// porque step5Confirm.js accede a order.status directamente.
async function getOrderHandler(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID de pedido requerido' });
    }

    const order = await getOrderById(id);

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Devuelve el order directamente — step5Confirm hace order.status
    return res.status(200).json(order);

  } catch (error) {
    console.error('[orderController] getOrderHandler:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { createOrderHandler, getOrderHandler, getUploadUrlHandler };