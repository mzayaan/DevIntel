// ============================================
// API CLIENT — All fetch/data loading logic
// Depends on: config.js (CONFIG), ui.js (showSkeleton, createCard, showError, escapeHTML, updateRefreshTime)
// ============================================

/**
 * Fetch with AbortController timeout
 */
async function fetchWithTimeout(url, timeout) {
  timeout = timeout || CONFIG.API_TIMEOUT;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fetch with client-side localStorage caching
 */
async function fetchWithCache(key, url, duration) {
  duration = duration || CONFIG.CACHE_DURATION;
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < duration) {
          return parsed.data;
        }
      } catch (e) {
        localStorage.removeItem(key);
      }
    }

    const response = await fetchWithTimeout(url);
    const data = await response.json();

    try {
      localStorage.setItem(key, JSON.stringify({ data: data, timestamp: Date.now() }));
    } catch (e) {
      // localStorage quota exceeded — continue without caching
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// ============================================
// DATA LOADERS
// ============================================

async function loadDevNews() {
  showSkeleton('newsContainer');
  updateRefreshTime();

  try {
    const articles = await fetchWithCache(
      CONFIG.CACHE_VERSION + '_devNews',
      CONFIG.API_BASE + '/api/news?tag=programming&per_page=12'
    );

    if (!Array.isArray(articles)) throw new Error('Invalid API response');

    const html = articles.map(function(article) {
      return createCard(
        article.title,
        article.description,
        article.url,
        '<div class="flex gap-2 text-xs"><span class="cyber-badge magenta">' +
          escapeHTML(article.tag_list && article.tag_list[0] ? article.tag_list[0] : 'General') +
          '</span></div>',
        'news'
      );
    }).join('');

    document.getElementById('newsContainer').innerHTML =
      html || '<p class="col-span-full text-slate-500 dark:text-slate-400">No articles found</p>';
  } catch (error) {
    showError('newsContainer', 'Failed to load developer news');
  }
}

const filterTech = debounce(async function(tag) {
  showSkeleton('newsContainer');

  try {
    const url = tag === 'all'
      ? CONFIG.API_BASE + '/api/news?per_page=12'
      : CONFIG.API_BASE + '/api/news?tag=' + encodeURIComponent(tag) + '&per_page=12';

    const response = await fetchWithTimeout(url);
    const data = await response.json();

    if (!Array.isArray(data)) throw new Error('Invalid response');

    const html = data.map(function(article) {
      return createCard(article.title, article.description, article.url, '', 'news');
    }).join('');

    document.getElementById('newsContainer').innerHTML =
      html || '<p class="col-span-full text-slate-500 dark:text-slate-400">No articles found</p>';
  } catch (error) {
    showError('newsContainer', 'Failed to filter by "' + tag + '"');
  }
}, CONFIG.DEBOUNCE_DELAY);

async function loadGithubTrending() {
  showSkeleton('githubContainer');
  updateRefreshTime();

  try {
    const data = await fetchWithCache(
      CONFIG.CACHE_VERSION + '_githubTrending',
      CONFIG.API_BASE + '/api/github?q=stars:>5000&sort=stars&order=desc&per_page=9'
    );

    if (!data.items || !Array.isArray(data.items)) throw new Error('Invalid API response');

    const html = data.items.map(function(repo) {
      return createCard(
        repo.name,
        repo.description || 'No description available',
        repo.html_url,
        '<div class="flex flex-wrap gap-2 text-xs">' +
          '<span class="cyber-badge lime">⭐ ' + (repo.stargazers_count || 0).toLocaleString() + '</span>' +
          '<span class="cyber-badge lime">🍴 ' + (repo.forks_count || 0).toLocaleString() + '</span>' +
          '<span class="cyber-badge lime">' + escapeHTML(repo.language || 'Unknown') + '</span>' +
          '</div>',
        'github'
      );
    }).join('');

    document.getElementById('githubContainer').innerHTML = html;
  } catch (error) {
    showError('githubContainer', 'Failed to load GitHub repositories');
  }
}

const searchFramework = debounce(async function(framework) {
  showSkeleton('githubContainer');

  try {
    const response = await fetchWithTimeout(
      CONFIG.API_BASE + '/api/github?q=' + encodeURIComponent(framework) + '&sort=stars&per_page=9'
    );
    const data = await response.json();

    if (!data.items || !Array.isArray(data.items)) throw new Error('Invalid response');

    const html = data.items.map(function(repo) {
      return createCard(repo.name, repo.description || 'No description', repo.html_url, '', 'github');
    }).join('');

    document.getElementById('githubContainer').innerHTML =
      html || '<p class="col-span-full text-slate-500 dark:text-slate-400">No repositories found</p>';
  } catch (error) {
    showError('githubContainer', 'Failed to search for "' + framework + '"');
  }
}, CONFIG.DEBOUNCE_DELAY);

async function loadHackerNews() {
  showSkeleton('hnContainer');
  updateRefreshTime();

  try {
    const ids = await fetchWithCache(CONFIG.CACHE_VERSION + '_hnTop', CONFIG.API_BASE + '/api/hn/top');

    if (!Array.isArray(ids)) throw new Error('Invalid API response');

    const topIds = ids.slice(0, 9);

    const stories = await Promise.allSettled(
      topIds.map(function(id) {
        return fetchWithTimeout(CONFIG.API_BASE + '/api/hn/item/' + id).then(function(res) {
          return res.json();
        });
      })
    );

    const html = stories
      .filter(function(r) { return r.status === 'fulfilled' && r.value && r.value.title; })
      .map(function(r) {
        const story = r.value;
        return createCard(
          story.title,
          '👤 ' + escapeHTML(story.by || 'Anonymous') + ' | ⭐ ' + (story.score || 0).toLocaleString(),
          story.url || 'https://news.ycombinator.com/item?id=' + story.id,
          '',
          'hn'
        );
      }).join('');

    document.getElementById('hnContainer').innerHTML = html;
  } catch (error) {
    showError('hnContainer', 'Failed to load Hacker News');
  }
}

async function loadAINews() {
  showSkeleton('aiContainer');
  updateRefreshTime();

  try {
    const articles = await fetchWithCache(
      CONFIG.CACHE_VERSION + '_aiNews',
      CONFIG.API_BASE + '/api/news?tag=ai&per_page=9'
    );

    if (!Array.isArray(articles)) throw new Error('Invalid API response');

    const html = articles.map(function(article) {
      return createCard(
        article.title,
        article.description,
        article.url,
        '<div class="text-xs text-slate-600 dark:text-slate-400 font-semibold">👤 ' +
          escapeHTML((article.user && article.user.name) ? article.user.name : 'Anonymous') +
          '</div>',
        'ai'
      );
    }).join('');

    document.getElementById('aiContainer').innerHTML = html;
  } catch (error) {
    showError('aiContainer', 'Failed to load AI news');
  }
}

async function loadSecurityNews() {
  showSkeleton('securityContainer');
  updateRefreshTime();

  try {
    const articles = await fetchWithCache(
      CONFIG.CACHE_VERSION + '_securityNews',
      CONFIG.API_BASE + '/api/news?tag=security&per_page=9'
    );

    if (!Array.isArray(articles)) throw new Error('Invalid API response');

    const html = articles.map(function(article) {
      return createCard(article.title, article.description, article.url, '', 'security');
    }).join('');

    document.getElementById('securityContainer').innerHTML = html;
  } catch (error) {
    showError('securityContainer', 'Failed to load security news');
  }
}

const searchTech = debounce(async function() {
  const input = document.getElementById('searchInput');
  if (!input) return;

  const query = input.value.trim();
  if (!query) {
    document.getElementById('searchResults').innerHTML =
      '<p class="col-span-full text-slate-500 dark:text-slate-400">Enter a search term</p>';
    return;
  }

  showSkeleton('searchResults');

  try {
    const response = await fetchWithTimeout(
      CONFIG.API_BASE + '/api/news?tag=' + encodeURIComponent(query) + '&per_page=9'
    );
    const articles = await response.json();

    if (!Array.isArray(articles)) throw new Error('Invalid response');

    const html = articles.map(function(article) {
      return createCard(article.title, article.description, article.url, '', 'search');
    }).join('');

    document.getElementById('searchResults').innerHTML =
      html || '<p class="col-span-full text-slate-500 dark:text-slate-400">No results found</p>';
  } catch (error) {
    showError('searchResults', 'Failed to search for "' + query + '"');
  }
}, CONFIG.DEBOUNCE_DELAY);

// CommonJS export for testing (no-op in browser)
if (typeof module !== 'undefined') {
  module.exports = { fetchWithTimeout, fetchWithCache };
}
