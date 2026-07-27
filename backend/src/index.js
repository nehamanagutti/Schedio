// src/index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { verifyEmailTransport } = require('./utils/mailer');

const authRoutes = require('./routes/auth');
const classRoutes = require('./routes/classes');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const coverRoutes = require('./routes/cover');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 4000;

function requestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Allow multiple origins: local dev + your deployed frontend(s).
// Set FRONTEND_URL in your backend host's env vars to your Vercel URL,
// e.g. https://schedio.vercel.app (no trailing slash).
const allowedOrigins = [
  'http://localhost:5173',
  // Capacitor Android WebView uses this origin when androidScheme is "http".
  'http://localhost',
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || '').split(',').map(url => url.trim())
].filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // allow no-origin requests (curl, mobile webviews, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());

// Request/response trace logger. The client may provide an ID so browser and
// Render logs can be correlated; otherwise, generate one on the server.
app.use((req, res, next) => {
  req.requestId = req.get('X-Request-ID') || requestId();
  const startedAt = Date.now();
  console.log(`[request:${req.requestId}] incoming`, { method: req.method, path: req.path });
  res.on('finish', () => {
    console.log(`[request:${req.requestId}] response`, {
      status: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/cover', coverRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\nSchedio API running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  // Run asynchronously so a temporary email-provider problem never prevents
  // the API health check from starting. The result is clearly logged instead.
  void verifyEmailTransport();
});
