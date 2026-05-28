// ═══════════════════════════════════════
// KYNEXA BACKEND — src/routes/orderRoutes.js
// ═══════════════════════════════════════

const express           = require('express');
const router            = express.Router();
const { validateOrder } = require('../middlewares/validateOrder');

const { 
  createOrderHandler,
  getOrderHandler,
  getUploadUrlHandler,
} = require('../controllers/orderController');

// POST /api/orders/upload-url — genera URL firmada para subir archivo directamente
router.post('/upload-url', getUploadUrlHandler);

// POST /api/orders — valida datos antes de crear el pedido
router.post('/', validateOrder, createOrderHandler);

// GET /api/orders/:id — obtiene un pedido por ID
router.get('/:id', getOrderHandler);

module.exports = router;