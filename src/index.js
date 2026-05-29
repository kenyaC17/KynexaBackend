// ═══════════════════════════════════════
// KYNEXA BACKEND — src/index.js
// Entry point del servidor Express.
// Configura middlewares de seguridad,
// rate limiting, CORS y rutas.
// Inicia el job de limpieza de Storage.
// ═══════════════════════════════════════

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const orderRoutes          = require('./routes/orderRoutes');
const paymentRoutes        = require('./routes/paymentRoutes');
const { startCleanupJob }  = require('./jobs/cleanupStorage');

const app = express();

// ── Necesario para Railway — permite que express-rate-limit
// identifique correctamente las IPs reales detrás del proxy
app.set('trust proxy', 1);

// ── Rate limiting general
// Protege todos los endpoints contra spam y scraping
const generalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             100,
  message:         { error: 'Demasiadas solicitudes, intentá de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Orígenes permitidos por CORS
const allowedOrigins = [
  'https://kynexa.studio',
  'https://www.kynexa.studio',
  'http://localhost:5173',
];

// ── Middlewares de seguridad
app.use(helmet());
app.use(generalLimiter);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('No permitido por CORS'));
  },
  methods:        ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token'],
}));

// ── Límite de 100kb para el body JSON
// El backend no recibe archivos — van directo a Supabase Storage
// Un payload mayor es señal de intento de ataque
app.use(express.json({ limit: '100kb' }));

// ── Ruta de salud — usada por Railway para health checks
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    message:   'KYNEXA Backend corriendo',
    timestamp: new Date().toISOString(),
  });
});

// ── Rutas
// orderLimiter vive en orderRoutes.js y se aplica solo a POST /
app.use('/api/orders',   orderRoutes);
app.use('/api/payments', paymentRoutes);

// ── Inicia el servidor solo si este archivo es el entry point
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT);

  // Inicia el job de limpieza de archivos huérfanos
  // Se ejecuta al arrancar y luego cada hora
  startCleanupJob();
}