'use strict';

const rateLimit = require('express-rate-limit');

// General API limit — all /api/ routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    code: 'RATE_LIMITED',
    message: 'Too many requests — please try again in 15 minutes.',
    retryAfter: 900,
  },
});

// Tighter limit for GitHub (upstream cap is 60 req/hr unauthenticated)
const githubLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    code: 'RATE_LIMITED',
    message: 'GitHub search rate limited — please wait a moment.',
    retryAfter: 60,
  },
});

module.exports = { generalLimiter, githubLimiter };
