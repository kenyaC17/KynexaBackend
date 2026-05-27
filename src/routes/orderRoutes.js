// ═══════════════════════════════════════
// KYNEXA BACKEND — src/routes/orderRoutes.js
// ═══════════════════════════════════════

const express          = require('express');
const router           = express.Router();
const { validateOrder } = require('../middlewares/validateOrder');

const { 
  createOrderHandler, 
  getOrderHandler 
} = require('../controllers/orderController');

// POST /api/orders — valida datos antes de crear el pedido
router.post('/', validateOrder, createOrderHandler);

// GET /api/orders/:id — obtiene un pedido por ID
router.get('/:id', getOrderHandler);

module.exports = router;