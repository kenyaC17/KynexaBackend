// ═══════════════════════════════════════
// KYNEXA BACKEND — src/index.js
// ═══════════════════════════════════════
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');

// Importa las rutas
const orderRoutes   = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// ── Necesario para Railway y cualquier hosting con proxy inverso
// Permite que express-rate-limit identifique correctamente las IPs reales
app.set('trust proxy', 1);

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
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max:      10,                   // máximo 10 pedidos por IP por día
  message:  { error: 'Límite de pedidos alcanzado, intentá de nuevo mañana' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Orígenes permitidos
// En producción: kynexa.studio
// En desarrollo: localhost:5173
const allowedOrigins = [
  'https://kynexa.studio',
  'https://www.kynexa.studio',
  'http://localhost:5173',
];

// ── Middlewares (deben ir ANTES de las rutas)
app.use(helmet());        // headers de seguridad HTTP
app.use(generalLimiter);  // rate limiting general
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (Postman, Railway health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('No permitido por CORS'));
  },
  methods:        ['GET', 'POST'],
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