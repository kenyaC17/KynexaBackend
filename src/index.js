// ═══════════════════════════════════════
// KYNEXA BACKEND — src/index.js
// ═══════════════════════════════════════
const express      = require('express');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');

// Importa las rutas
const orderRoutes   = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// ── Rate limiting
// Protege contra spam y abuso de los endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max:      100,             // máximo 100 requests por IP cada 15 minutos
  message:  { error: 'Demasiadas solicitudes, intentá de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders:   false,
});

const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max:      10,              // máximo 10 pedidos por IP por hora
  message:  { error: 'Límite de pedidos alcanzado, intentá de nuevo en 1 hora' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Middlewares (deben ir ANTES de las rutas)
app.use(generalLimiter);
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
// orderLimiter aplicado solo a creación de pedidos
app.use('/api/orders',   orderLimiter, orderRoutes);
app.use('/api/payments', paymentRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`KYNEXA Backend corriendo en http://localhost:${PORT}`);
});