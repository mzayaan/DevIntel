// ============================================
// API CLIENT
// Depends on: config.js, ui.js
// Loaders populate `state.feeds[section]` with normalized articles.
// Rendering is delegated to app.js (renderFeed).
// ============================================

async function fetchWithTimeout(url, timeout) {
  timeout = timeout || CONFIG.API_TIMEOUT;
  const controller = new AbortController();
  const timeoutId = setTimeout(function () { controller.abort(); }, timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function fetchWithCache(key, url, duration) {
  duration = duration || CONFIG.CACHE_DURATION;
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < duration) return parsed.data;
      } catch (_) { localStorage.removeItem(key); }
    }
    const response = await fetchWithTimeout(url);
    const data = await response.json();
    try { localStorage.setItem(key, JSON.stringify({ data: data, timestamp: Date.now() })); }
    catch (_) { /* quota */ }
    return data;
  } catch (err) {
    throw err;
  }
}

/**
 * Force-bypass localStorage cache. Used by manual refresh + polling.
 */
async function fetchFresh(key, url) {
  const response = await fetchWithTimeout(url);
  const data = await response.json();
  try { localStorage.setItem(key, JSON.stringify({ data: data, timestamp: Date.now() })); }
  catch (_) { /* quota */ }
  return data;
}

// ============================================
// NORMALIZATION
// All loaders return { id, title, description, url, source, tags[], publishedAt }
// ============================================

function _normDevTo(a) {
  return {
    id: a.id || a.url,
    title: a.title || '',
    description: a.description || '',
    url: a.url || a.canonical_url || '',
    source: 'Dev.to',
    author: (a.user && a.user.name) || a.user_username || 'Anonymous',
    tags: Array.isArray(a.tag_list) ? a.tag_list : [],
    publishedAt: a.published_at || a.published_timestamp || null,
  };
}

function _normGithub(r) {
  return {
    id: r.id || r.html_url,
    title: r.full_name || r.name || '',
    description: r.description || 'No description',
    url: r.html_url,
    source: 'GitHub',
    author: r.owner && r.owner.login,
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
    language: r.language || '',
    tags: r.language ? [r.language] : [],
    publishedAt: r.created_at || null,
  };
}

function _normHN(s) {
  return {
    id: s.id,
    title: s.title || '',
    description: 'by ' + (s.by || 'anonymous') + ' · ' + (s.score || 0) + ' points · ' + (s.descendants || 0) + ' comments',
    url: s.url || ('https://news.ycombinator.com/item?id=' + s.id),
    source: 'Hacker News',
    author: s.by,
    score: s.score || 0,
    tags: [],
    publishedAt: s.time ? s.time * 1000 : null,
  };
}

// ============================================
// LOADERS
// ============================================

async function loadDevNews(opts) {
  opts = opts || {};
  const key = CONFIG.CACHE_VERSION + '_devNews';
  const url = CONFIG.API_BASE + '/api/news?tag=programming&per_page=12';
  if (!opts.silent) showSkeleton('newsContainer');
  try {
    const raw = opts.fresh ? await fetchFresh(key, url) : await fetchWithCache(key, url);
    if (!Array.isArray(raw)) throw new Error('bad shape');
    const articles = raw.map(_normDevTo).filter(function (a) { return a.url; });
    handleFeedLoaded('news', articles, { container: 'newsContainer' });
  } catch (e) {
    if (!opts.silent) showError('newsContainer', 'Failed to load developer news');
  }
}

async function loadGithubTrending(opts) {
  opts = opts || {};
  const key = CONFIG.CACHE_VERSION + '_githubTrending';
  const url = CONFIG.API_BASE + '/api/github?q=stars:>5000&sort=stars&order=desc&per_page=12';
  if (!opts.silent) showSkeleton('githubContainer');
  try {
    const raw = opts.fresh ? await fetchFresh(key, url) : await fetchWithCache(key, url);
    if (!raw || !Array.isArray(raw.items)) throw new Error('bad shape');
    const items = raw.items.map(_normGithub).filter(function (a) { return a.url; });
    handleFeedLoaded('github', items, { container: 'githubContainer' });
  } catch (e) {
    if (!opts.silent) showError('githubContainer', 'Failed to load repositories');
  }
}

async function loadHackerNews(opts) {
  opts = opts || {};
  const key = CONFIG.CACHE_VERSION + '_hnTop';
  const url = CONFIG.API_BASE + '/api/hn/top';
  if (!opts.silent) showSkeleton('hnContainer');
  try {
    const ids = opts.fresh ? await fetchFresh(key, url) : await fetchWithCache(key, url);
    if (!Array.isArray(ids)) throw new Error('bad shape');
    const settled = await Promise.allSettled(
      ids.slice(0, 12).map(function (id) {
        return fetchWithTimeout(CONFIG.API_BASE + '/api/hn/item/' + id).then(function (r) { return r.json(); });
      })
    );
    const stories = settled
      .filter(function (r) { return r.status === 'fulfilled' && r.value && r.value.title; })
      .map(function (r) { return _normHN(r.value); });
    handleFeedLoaded('hn', stories, { container: 'hnContainer' });
  } catch (e) {
    if (!opts.silent) showError('hnContainer', 'Failed to load Hacker News');
  }
}

async function loadAINews(opts) {
  opts = opts || {};
  const key = CONFIG.CACHE_VERSION + '_aiNews';
  const url = CONFIG.API_BASE + '/api/news?tag=ai&per_page=9';
  if (!opts.silent) showSkeleton('aiContainer');
  try {
    const raw = opts.fresh ? await fetchFresh(key, url) : await fetchWithCache(key, url);
    if (!Array.isArray(raw)) throw new Error('bad shape');
    handleFeedLoaded('ai', raw.map(_normDevTo).filter(function (a) { return a.url; }), { container: 'aiContainer' });
  } catch (e) {
    if (!opts.silent) showError('aiContainer', 'Failed to load AI news');
  }
}

async function loadSecurityNews(opts) {
  opts = opts || {};
  const key = CONFIG.CACHE_VERSION + '_securityNews';
  const url = CONFIG.API_BASE + '/api/news?tag=security&per_page=9';
  if (!opts.silent) showSkeleton('securityContainer');
  try {
    const raw = opts.fresh ? await fetchFresh(key, url) : await fetchWithCache(key, url);
    if (!Array.isArray(raw)) throw new Error('bad shape');
    handleFeedLoaded('security', raw.map(_normDevTo).filter(function (a) { return a.url; }), { container: 'securityContainer' });
  } catch (e) {
    if (!opts.silent) showError('securityContainer', 'Failed to load security news');
  }
}

if (typeof module !== 'undefined') {
  module.exports = { fetchWithTimeout, fetchWithCache, fetchFresh };
}
