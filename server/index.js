'use strict';

const path = require('path');

// Load .env in development
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (_) { /* dotenv optional */ }
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { generalLimiter, githubLimiter } = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');

const newsRouter    = require('./routes/news');
const githubRouter  = require('./routes/github');
const hnRouter      = require('./routes/hn');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Security & parsing ----
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // needed for inline mobile menu script
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || true,
  methods: ['GET'],
}));

app.use(express.json());

// ---- Rate limiting ----
app.use('/api/', generalLimiter);
app.use('/api/github', githubLimiter);

// ---- API routes ----
app.use('/api/news',   newsRouter);
app.use('/api/github', githubRouter);
app.use('/api/hn',     hnRouter);

// ---- Static client ----
const clientDir = path.join(__dirname, '..', 'client');
app.use(express.static(clientDir, {
  // Cache static assets for 1 day, HTML for no-cache
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.match(/\.(css|js|png|svg|webp|woff2?)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
    // Serve manifest with correct content type
    if (filePath.endsWith('manifest.json')) {
      res.setHeader('Content-Type', 'application/manifest+json');
    }
  },
}));

// SPA fallback — serve index.html for unknown routes (PWA deep links)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

// ---- Error handler (must be last) ----
app.use(errorHandler);

// ---- Start (skip in test — supertest creates its own server) ----
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`DevIntel server running at http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    if (!process.env.GITHUB_TOKEN) {
      console.warn('Warning: GITHUB_TOKEN not set — GitHub API limited to 60 req/hr');
    }
  });
}

module.exports = app; // for supertest
