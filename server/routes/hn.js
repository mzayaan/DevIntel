'use strict';

const express = require('express');
const router = express.Router();
const cache = require('../middleware/cache');

const HN_BASE = 'https://hacker-news.firebaseio.com/v0';
const TTL_TOP = parseInt(process.env.CACHE_TTL_HN_TOP) || 5 * 60 * 1000;    // 5 min
const TTL_ITEM = parseInt(process.env.CACHE_TTL_HN_ITEM) || 30 * 60 * 1000; // 30 min

async function hnFetch(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw Object.assign(new Error(`HN API error: ${res.status}`), { status: 502, code: 'UPSTREAM_ERROR' });
    return res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw Object.assign(new Error('HN request timed out'), { status: 504, code: 'UPSTREAM_TIMEOUT' });
    }
    throw err;
  }
}

// GET /api/hn/top — returns top 30 story IDs
router.get('/top', async (req, res, next) => {
  try {
    const cached = cache.get('hn:top');
    if (cached) return res.json(cached);

    const ids = await hnFetch(`${HN_BASE}/topstories.json`);
    const top = ids.slice(0, 30);
    cache.set('hn:top', top, TTL_TOP);
    res.json(top);
  } catch (err) {
    next(err);
  }
});

// GET /api/hn/item/:id — returns a single story object
router.get('/item/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return next(Object.assign(new Error('Invalid story ID'), { status: 400, code: 'INVALID_PARAMS' }));
    }

    const cacheKey = `hn:item:${id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const item = await hnFetch(`${HN_BASE}/item/${id}.json`);
    cache.set(cacheKey, item, TTL_ITEM);
    res.json(item);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
