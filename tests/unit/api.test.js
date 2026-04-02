/**
 * Unit tests for client-side API utility functions (fetchWithTimeout, fetchWithCache).
 * api.js references CONFIG from config.js — set it up before requiring.
 */

// api.js reads CONFIG as a global — provide it before the require
global.CONFIG = {
  API_BASE: '',
  API_TIMEOUT: 8000,
  CACHE_DURATION: 600000,
  MAX_BOOKMARKS: 100,
  DEBOUNCE_DELAY: 500,
};

// api.js also references DOM/UI helpers — stub them (only needed for loader functions, not the pure utils)
global.showSkeleton      = jest.fn();
global.showError         = jest.fn();
global.updateRefreshTime = jest.fn();
global.createCard        = jest.fn(() => '');
global.debounce          = (fn) => fn; // no-op for import resolution
global.escapeHTML        = (s) => String(s || '');
global.isValidURL        = () => true;
global.document          = { getElementById: jest.fn(() => ({ innerHTML: '' })) };

const { fetchWithCache } = require('../../client/js/api.js');

// ---- fetchWithCache ----

describe('fetchWithCache', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
  });

  test('calls fetch on a cache miss and stores result', async () => {
    const mockData = [{ id: 1, title: 'Test Article' }];
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    const result = await fetchWithCache('key1', 'https://example.com/api', 60000);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockData);
    expect(localStorage.getItem('key1')).not.toBeNull();
  });

  test('returns cached data within TTL without calling fetch', async () => {
    const cachedData = [{ id: 2, title: 'Cached Article' }];
    localStorage.setItem('key2', JSON.stringify({ data: cachedData, timestamp: Date.now() }));

    const result = await fetchWithCache('key2', 'https://example.com/api', 60000);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual(cachedData);
  });

  test('calls fetch when cached entry is expired', async () => {
    const freshData = [{ id: 3, title: 'Fresh Article' }];
    localStorage.setItem('key3', JSON.stringify({
      data: [{ id: 0, title: 'Stale' }],
      timestamp: 1, // very old
    }));
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => freshData,
    });

    const result = await fetchWithCache('key3', 'https://example.com/api', 60000);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(freshData);
  });

  test('throws when fetch fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    await expect(fetchWithCache('key4', 'https://example.com/api', 60000)).rejects.toThrow();
  });
});
