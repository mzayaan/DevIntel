'use strict';

const express = require('express');
const router = express.Router();
const cache = require('../middleware/cache');

const DEVTO_BASE = 'https://dev.to/api/articles';
const TTL_NEWS = parseInt(process.env.CACHE_TTL_NEWS) || 10 * 60 * 1000; // 10 min

const VALID_TAG = /^[a-z0-9_-]{1,50}$/i;
const MAX_PER_PAGE = 30;

// GET /api/news?tag=programming&per_page=12
router.get('/', async (req, res, next) => {
  try {
    const tag = req.query.tag || 'programming';
    const perPage = Math.min(parseInt(req.query.per_page) || 12, MAX_PER_PAGE);

    if (req.query.tag && !VALID_TAG.test(tag)) {
      const err = new Error('Invalid tag parameter');
      err.status = 400;
      err.code = 'INVALID_PARAMS';
      return next(err);
    }

    const cacheKey = `news:${tag}:${perPage}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const url = tag === 'all'
      ? `${DEVTO_BASE}?per_page=${perPage}`
      : `${DEVTO_BASE}?tag=${encodeURIComponent(tag)}&per_page=${perPage}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const upstream = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!upstream.ok) {
      const err = new Error(`Dev.to API error: ${upstream.status}`);
      err.status = 502;
      err.code = 'UPSTREAM_ERROR';
      return next(err);
    }

    const data = await upstream.json();
    const result = { data, cachedAt: new Date().toISOString(), source: 'devto' };
    cache.set(cacheKey, result, TTL_NEWS);

    // Return the array directly for backwards-compat with client fetchWithCache
    res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      err.message = 'Dev.to request timed out';
      err.status = 504;
      err.code = 'UPSTREAM_TIMEOUT';
    }
    next(err);
  }
});

module.exports = router;
