// ═══════════════════════════════════════
// KYNEXA BACKEND — src/controllers/orderController.js
// Recibe los requests del frontend,
// coordina los servicios y devuelve respuestas.
// ═══════════════════════════════════════

const { findOrCreateCustomer } = require('../services/customerService');
const { createOrder, getOrderById } = require('../services/orderService');
const { saveFile } = require('../services/fileService');

// POST /api/orders
// Recibe todos los datos del builder y crea el pedido
async function createOrderHandler(req, res) {
  try {
    const {
      // Datos del cliente (Step 3)
      userData,
      // Datos del plan (Step 1)
      plan,
      planPrice,
      // Datos del diseño (Step 2)
      palette,
      style,
      fonts,
      // Archivos subidos (Step 3)
      files
    } = req.body;

    // Valida que los datos mínimos existan
    if (!userData?.email || !userData?.name || !plan || !planPrice) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos: email, nombre, plan y precio son obligatorios' 
      });
    }

    // 1. Busca o crea el cliente
    const customer = await findOrCreateCustomer({
      name:     userData.name,
      email:    userData.email,
      role:     userData.role,
      github:   userData.github,
      linkedin: userData.linkedin
    });

    // 2. Crea el pedido
    const order = await createOrder({
      customerId: customer.id,
      plan,
      price: planPrice,
      palette,
      style,
      fonts
    });

    // 3. Guarda los archivos si existen
    if (files && files.length > 0) {
      await Promise.all(
        files.map(file => saveFile({
          orderId:  order.id,
          slotId:   file.slotId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          dataURL:  file.dataURL
        }))
      );
    }

    // Devuelve el pedido creado con su ID
    return res.status(201).json({
      success:  true,
      orderId:  order.id,
      message:  'Pedido creado correctamente'
    });

  } catch (error) {
    console.error('[orderController] Error:', error.message);
    return res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
}

// GET /api/orders/:id
// Devuelve un pedido completo con sus relaciones
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
    return res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
}

module.exports = { createOrderHandler, getOrderHandler };