/**
 * @jest-environment node
 *
 * Server route integration tests using supertest.
 * Upstream HTTP calls are mocked via jest.spyOn(global, 'fetch') since Node 18+
 * uses native undici fetch which nock cannot intercept.
 */

process.env.NODE_ENV = 'test';

const request = require('supertest');
const cache   = require('../../server/middleware/cache');
const app     = require('../../server/index');

// Helper: create a mock fetch response
function mockFetchResponse(body, status) {
  status = status || 200;
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  });
}

let fetchSpy;

beforeEach(() => {
  // Clear server-side cache so tests are independent
  cache._store.clear();
  // Mock global.fetch — intercepts all native fetch calls in server routes
  fetchSpy = jest.spyOn(global, 'fetch');
});

afterEach(() => {
  fetchSpy.mockRestore();
});

// ---- GET /api/news ----

describe('GET /api/news', () => {
  const mockArticles = [
    { id: 1, title: 'Test Article', url: 'https://dev.to/a', description: 'Desc', tag_list: ['js'] },
  ];

  test('returns 200 with array for default tag', async () => {
    fetchSpy.mockReturnValue(mockFetchResponse(mockArticles));

    const res = await request(app).get('/api/news');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].title).toBe('Test Article');
  });

  test('returns 200 with custom tag', async () => {
    fetchSpy.mockReturnValue(mockFetchResponse(mockArticles));

    const res = await request(app).get('/api/news?tag=typescript');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns 400 for invalid tag characters', async () => {
    const res = await request(app).get('/api/news?tag=!!invalid@@');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: true, code: 'INVALID_PARAMS' });
    // fetch should NOT have been called for invalid input
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('returns cached data on second identical request (one upstream call)', async () => {
    fetchSpy.mockReturnValue(mockFetchResponse(mockArticles));

    await request(app).get('/api/news?tag=rust');
    await request(app).get('/api/news?tag=rust');

    // Cache should serve the second request — fetch only called once
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

// ---- GET /api/github ----

describe('GET /api/github', () => {
  const mockGithubResp = {
    total_count: 1,
    items: [{ id: 1, name: 'cool-repo', html_url: 'https://github.com/a/b', stargazers_count: 9999 }],
  };

  test('returns 200 with items array', async () => {
    fetchSpy.mockReturnValue(mockFetchResponse(mockGithubResp));

    const res = await request(app).get('/api/github');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items[0].name).toBe('cool-repo');
  });

  test('returns 429 when GitHub responds with 403 (rate limited)', async () => {
    fetchSpy.mockReturnValue(mockFetchResponse({ message: 'rate limit exceeded' }, 403));

    const res = await request(app).get('/api/github?q=uniquequery12345');
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMITED');
  });
});

// ---- GET /api/hn/top ----

describe('GET /api/hn/top', () => {
  test('returns 200 with array of IDs (max 30)', async () => {
    const ids = Array.from({ length: 50 }, (_, i) => i + 100);
    fetchSpy.mockReturnValue(mockFetchResponse(ids));

    const res = await request(app).get('/api/hn/top');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeLessThanOrEqual(30);
  });
});

// ---- GET /api/hn/item/:id ----

describe('GET /api/hn/item/:id', () => {
  test('returns 200 with story object', async () => {
    const mockStory = { id: 999, title: 'Test HN Story', by: 'tester', score: 42 };
    fetchSpy.mockReturnValue(mockFetchResponse(mockStory));

    const res = await request(app).get('/api/hn/item/999');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(999);
    expect(res.body.title).toBe('Test HN Story');
  });

  test('returns 400 for non-numeric ID', async () => {
    const res = await request(app).get('/api/hn/item/notanumber');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_PARAMS');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ---- Static file serving ----

describe('Static file serving', () => {
  test('GET / serves index.html', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  test('GET /manifest.json returns manifest+json content type', async () => {
    const res = await request(app).get('/manifest.json');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/manifest\+json/);
  });
});
