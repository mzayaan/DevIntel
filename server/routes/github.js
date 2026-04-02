'use strict';

const express = require('express');
const router = express.Router();
const cache = require('../middleware/cache');

const GITHUB_BASE = 'https://api.github.com/search/repositories';
const TTL_GITHUB = parseInt(process.env.CACHE_TTL_GITHUB) || 15 * 60 * 1000; // 15 min
const MAX_PER_PAGE = 30;

// GET /api/github?q=stars:>5000&sort=stars&order=desc&per_page=9
router.get('/', async (req, res, next) => {
  try {
    const q = req.query.q || 'stars:>5000';
    const sort = ['stars', 'forks', 'updated'].includes(req.query.sort) ? req.query.sort : 'stars';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';
    const perPage = Math.min(parseInt(req.query.per_page) || 9, MAX_PER_PAGE);

    const cacheKey = `github:${q}:${sort}:${order}:${perPage}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const url = `${GITHUB_BASE}?q=${encodeURIComponent(q)}&sort=${sort}&order=${order}&per_page=${perPage}`;

    const headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const upstream = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timeoutId);

    if (upstream.status === 403) {
      const err = new Error('GitHub rate limit exceeded. Set GITHUB_TOKEN env var to increase limits.');
      err.status = 429;
      err.code = 'RATE_LIMITED';
      err.retryAfter = parseInt(upstream.headers.get('x-ratelimit-reset')) || 3600;
      return next(err);
    }

    if (!upstream.ok) {
      const err = new Error(`GitHub API error: ${upstream.status}`);
      err.status = 502;
      err.code = 'UPSTREAM_ERROR';
      return next(err);
    }

    const data = await upstream.json();
    cache.set(cacheKey, data, TTL_GITHUB);

    res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      err.message = 'GitHub API request timed out';
      err.status = 504;
      err.code = 'UPSTREAM_TIMEOUT';
    }
    next(err);
  }
});

module.exports = router;
