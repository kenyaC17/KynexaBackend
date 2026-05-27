// ═══════════════════════════════════════
// KYNEXA BACKEND — src/routes/paymentRoutes.js
// Define las rutas de la API para pagos.
// ═══════════════════════════════════════

const express = require('express');
const router  = express.Router();

const { 
  createPaymentHandler,
  webhookHandler 
} = require('../controllers/paymentController');

// POST /api/payments/create — crea preferencia de pago en MP
router.post('/create', createPaymentHandler);

// POST /api/payments/webhook — MP llama aquí cuando confirma un pago
router.post('/webhook', webhookHandler);

module.exports = router;