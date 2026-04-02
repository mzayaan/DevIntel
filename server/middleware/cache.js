'use strict';

/**
 * Simple in-memory cache with per-entry TTL.
 * Avoids Redis dependency for a project at this scale.
 */
class MemoryCache {
  constructor() {
    this._store = new Map();
  }

  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs) {
    this._store.set(key, { value: value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key) {
    this._store.delete(key);
  }

  size() {
    return this._store.size;
  }
}

module.exports = new MemoryCache();
