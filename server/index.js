const express = require('express');
const cors    = require('cors');
const path    = require('path');

// Initialise DB (creates file + tables + seed users) before routes are loaded
require('./db');

const authRoutes       = require('./routes/auth');
const inventoryRoutes  = require('./routes/inventory');
const purchasesRoutes  = require('./routes/purchases');
const uploadsRoutes    = require('./routes/uploads');
const storeRoutes      = require('./routes/store');
const customerRoutes   = require('./routes/customer');
const adminStoreRoutes = require('./routes/adminStore');
const platformRoutes   = require('./routes/platform');

const app  = express();
const PORT = process.env.PORT || 5001;
const isProd = process.env.NODE_ENV === 'production';

// ─── Middleware ──────────────────────────────────────────────────────────────

const allowedOrigins = isProd
  ? [
      'https://edepot.ca',
      'https://www.edepot.ca',
      /\.edepot\.ca$/,
    ]
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow curl / server-to-server
    const allowed = allowedOrigins.some((o) =>
      o instanceof RegExp ? o.test(origin) : o === origin
    );
    callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use('/api/auth',      authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/uploads',   uploadsRoutes);

// Public store routes (no auth)
app.use('/api/store',     storeRoutes);

// Customer routes (customer JWT)
app.use('/api/customer',  customerRoutes);

// Store admin extended routes (admin JWT)
app.use('/api/admin',     adminStoreRoutes);

// Platform super admin routes
app.use('/api/platform',  platformRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Serve React build in production ────────────────────────────────────────

if (isProd) {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  // SPA catch-all: serve index.html for any non-API route
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── 404 & global error handler ─────────────────────────────────────────────

if (!isProd) {
  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
}

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
