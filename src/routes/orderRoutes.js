// ═══════════════════════════════════════
// KYNEXA BACKEND — src/routes/orderRoutes.js
// Define las rutas de pedidos.
// orderLimiter aplicado solo a POST /
// para no penalizar GET ni upload-url.
// ═══════════════════════════════════════

const express           = require('express');
const rateLimit         = require('express-rate-limit');
const router            = express.Router();
const { validateOrder } = require('../middlewares/validateOrder');

const {
  createOrderHandler,
  getOrderHandler,
  getUploadUrlHandler,
} = require('../controllers/orderController');

// ── Rate limiter específico para creación de pedidos
// Máximo 10 pedidos por IP por día — protege contra abuso del flujo de compra
// Solo se aplica a POST / — no afecta GET ni upload-url
const orderLimiter = rateLimit({
  windowMs:        24 * 60 * 60 * 1000,
  max:             10,
  message:         { error: 'Límite de pedidos alcanzado, intentá de nuevo mañana' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// POST /api/orders/upload-url — genera URL firmada para subida directa a Supabase Storage
// Debe ir ANTES de POST / para que Express no lo confunda con un ID de pedido
router.post('/upload-url', getUploadUrlHandler);

// POST /api/orders — crea un pedido draft
// orderLimiter + validateOrder antes de llegar al controller
router.post('/', orderLimiter, validateOrder, createOrderHandler);

// GET /api/orders/:id — obtiene un pedido por ID (usado por step5 para polling)
router.get('/:id', getOrderHandler);

module.exports = router;