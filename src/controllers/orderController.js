// ═══════════════════════════════════════
// KYNEXA BACKEND — src/controllers/orderController.js
// ═══════════════════════════════════════

const { findOrCreateCustomer } = require('../services/customerService');
const { createOrder, getOrderById } = require('../services/orderService');
const { saveFile, getUploadUrl, registerFile } = require('../services/fileService');

// POST /api/orders
async function createOrderHandler(req, res) {
  try {
    const {
      userData,
      plan,
      planPrice,
      palette,
      style,
      fonts,
      files
    } = req.body;

    if (!userData?.email || !userData?.name || !plan || !planPrice) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos: email, nombre, plan y precio son obligatorios' 
      });
    }

    const customer = await findOrCreateCustomer({
      name:     userData.name,
      email:    userData.email,
      role:     userData.role,
      github:   userData.github,
      linkedin: userData.linkedin
    });

    const order = await createOrder({
      customerId: customer.id,
      plan,
      price: planPrice,
      palette,
      style,
      fonts
    });

    // Guarda archivos si vienen con dataURL (fallback)
    if (files && files.length > 0) {
      const filesWithDataURL = files.filter(f => f.dataURL);
      if (filesWithDataURL.length > 0) {
        await Promise.all(
          filesWithDataURL.map(file => saveFile({
            orderId:  order.id,
            slotId:   file.slotId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            dataURL:  file.dataURL
          }))
        );
      }

      // Registra archivos que ya fueron subidos directamente por el frontend
      const filesWithPath = files.filter(f => f.filePath && !f.dataURL);
      if (filesWithPath.length > 0) {
        await Promise.all(
          filesWithPath.map(file => registerFile({
            orderId:  order.id,
            slotId:   file.slotId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            filePath: file.filePath
          }))
        );
      }
    }

    return res.status(201).json({
      success: true,
      orderId: order.id,
      message: 'Pedido creado correctamente'
    });

  } catch (error) {
    console.error('[orderController] Error:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/orders/upload-url
// Genera una URL firmada para que el frontend suba directamente a Supabase Storage
async function getUploadUrlHandler(req, res) {
  try {
    const { orderId, slotId, fileName, fileType, fileSize } = req.body;

    if (!orderId || !slotId || !fileName || !fileType || !fileSize) {
      return res.status(400).json({ error: 'Faltan datos del archivo' });
    }

    const result = await getUploadUrl({ orderId, slotId, fileName, fileType, fileSize });

    return res.status(200).json({
      success:   true,
      signedUrl: result.signedUrl,
      filePath:  result.filePath,
      token:     result.token,
    });

  } catch (error) {
    console.error('[orderController] Error generando URL:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/orders/:id
async function getOrderHandler(req, res) {
  try {
    const { id } = req.params;
    const order = await getOrderById(id);

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    return res.status(200).json({ success: true, order });

  } catch (error) {
    console.error('[orderController] Error:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { createOrderHandler, getOrderHandler, getUploadUrlHandler };