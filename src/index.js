// ═══════════════════════════════════════
// KYNEXA BACKEND — src/index.js
// ═══════════════════════════════════════
const express = require('express');
const cors    = require('cors');

// Importa las rutas
const orderRoutes   = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// ── Middlewares (deben ir ANTES de las rutas)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));

// ── Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    status:    'ok', 
    message:   'KYNEXA Backend corriendo',
    timestamp: new Date().toISOString()
  });
});

// ── Rutas (siempre después de los middlewares)
app.use('/api/orders',   orderRoutes);
app.use('/api/payments', paymentRoutes);

// ── TODO: ELIMINAR ANTES DE PRODUCCIÓN
// Ruta temporal para probar el envío de emails con Resend
app.post('/test/email', async (req, res) => {
  const { sendConfirmationEmail } = require('./services/emailService');
  try {
    await sendConfirmationEmail({
      customerName:  'Kenya Contreras',
      customerEmail: req.body.email,
      plan:          'medio',
      price:         173,
      orderId:       'test-order-123'
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`KYNEXA Backend corriendo en http://localhost:${PORT}`);
});