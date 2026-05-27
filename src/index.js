// ═══════════════════════════════════════
// KYNEXA BACKEND — src/index.js
// ═══════════════════════════════════════
const express = require('express');
const cors    = require('cors');

// Importa las rutas
const orderRoutes   = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// ── Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rutas
app.use('/api/orders',   orderRoutes);
app.use('/api/payments', paymentRoutes);

// ── Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    status:    'ok', 
    message:   'KYNEXA Backend corriendo',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`KYNEXA Backend corriendo en http://localhost:${PORT}`);
});