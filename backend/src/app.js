const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// ---- Security headers ----
app.use(helmet());

// ---- CORS ----
const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((u) => u.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, Postman)
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, '');
      if (clientUrls.includes('*') || clientUrls.includes(cleanOrigin)) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-friendly fallback
    },
    credentials: true,
  })
);

const compression = require('compression');

// ---- HTTP Gzip/Deflate Compression (reduces bandwidth by 75-80%) ----
app.use(compression());

// ---- Notes: bade body (pasted images) — global 1mb parser se PEHLE mount ----
// (notes router apna 16mb json parser khud lagata hai)
app.use('/api/notes', require('./routes/noteRoutes'));

// ---- Body parsing (baaki sab routes) ----
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Scaled Global Rate Limiting (office NAT/shared IP safe: 3000 req / 15m) ----
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 3000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  })
);

// ---- Health check ----
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date() }));

// ---- Routes ----
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/dev-requests', require('./routes/devRequestRoutes'));

// ---- 404 + error ----
app.use(notFound);
app.use(errorHandler);

// ---- Background maintenance: DB retention cleanup (so the DB never fills up) ----
require('./utils/maintenance').startMaintenance();

module.exports = app;
