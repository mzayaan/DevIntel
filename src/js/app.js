// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  API_TIMEOUT: 8000,
  CACHE_DURATION: 600000, // 10 minutes
  AUTO_REFRESH_INTERVAL: 1800000, // 30 minutes
  MAX_BOOKMARKS: 100,
  DEBOUNCE_DELAY: 500,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Debounce function to limit API calls
 */
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, timeout = CONFIG.API_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fetch with caching and error handling
 */
async function fetchWithCache(key, url, duration = CONFIG.CACHE_DURATION) {
  try {
    // Check cache
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < duration) {
          console.log(`Cache hit: ${key}`);
          return data;
        }
      } catch (e) {
        console.warn(`Cache parse error for ${key}`, e);
        localStorage.removeItem(key);
      }
    }

    // Fetch fresh data
    const response = await fetchWithTimeout(url);
    const data = await response.json();

    // Store in cache
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.warn('LocalStorage quota exceeded', e);
    }

    return data;
  } catch (error) {
    console.error(`Fetch error for ${key}:`, error);
    throw error;
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHTML(str = '') {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(str).replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Safe URL validation
 */
function isValidURL(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Show loading skeleton
 */
function showSkeleton(containerId, count = 6) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const skeletons = Array(count)
    .fill(0)
    .map(
      () => `
    <div class="card animate-pulse">
      <div class="skeleton h-6 w-3/4 mb-4"></div>
      <div class="skeleton h-4 w-full mb-2"></div>
      <div class="skeleton h-4 w-2/3"></div>
    </div>
  `
    )
    .join('');

  container.innerHTML = skeletons;
}

/**
 * Create card HTML
 */
function createCard(title, description, url, extra = '') {
  if (!isValidURL(url)) {
    console.warn('Invalid URL:', url);
    return '';
  }

  const safeTitle = escapeHTML(title);
  const safeDescription = escapeHTML(description || '');
  const safeUrl = escapeHTML(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  return `
    <article class="card group">
      <h3 class="text-lg font-semibold mb-2 text-blue-600 dark:text-blue-400 line-clamp-2 group-hover:text-blue-700 dark:group-hover:text-blue-300">
        ${safeTitle}
      </h3>

      <p class="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
        ${safeDescription}
      </p>

      ${extra}

      <div class="flex gap-2 pt-4 border-t border-gray-200 dark:border-slate-700">
        <a
          href="${safeUrl}"
          target="_blank"
          rel="noopener noreferrer"
          class="flex-1 text-sm text-center py-2 rounded bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition"
          aria-label="Read article: ${safeTitle}">
          Read →
        </a>

        <button
          onclick="saveBookmark('${encodedTitle}','${encodedUrl}')"
          class="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-medium transition"
          aria-label="Save article: ${safeTitle}"
          title="Save to bookmarks">
          ⭐
        </button>
      </div>
    </article>
  `;
}

/**
 * Show error message
 */
function showError(containerId, message = 'Failed to load content') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900">
      <p class="text-red-700 dark:text-red-400 font-medium">⚠️ ${escapeHTML(message)}</p>
      <p class="text-sm text-red-600 dark:text-red-300 mt-2">Please try again later or check your internet connection.</p>
    </div>
  `;
}

/**
 * Update last refresh time
 */
function updateRefreshTime() {
  const element = document.getElementById('updateTime');
  if (!element) return;

  const now = new Date();
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };
  element.textContent = now.toLocaleTimeString(undefined, options);
}

// ============================================
// DEV NEWS
// ============================================

async function loadDevNews() {
  const container = document.getElementById('newsContainer');
  if (!container) return;

  showSkeleton('newsContainer');
  updateRefreshTime();

  try {
    const articles = await fetchWithCache(
      'devNews',
      'https://dev.to/api/articles?tag=programming&per_page=12'
    );

    if (!Array.isArray(articles)) {
      throw new Error('Invalid API response');
    }

    const html = articles
      .map((article) =>
        createCard(
          article.title,
          article.description,
          article.url,
          `<div class="flex gap-2 text-xs">
          <span class="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
            ${escapeHTML(article.tag_list?.[0] || 'General')}
          </span>
        </div>`
        )
      )
      .join('');

    container.innerHTML = html || '<p class="col-span-full text-gray-500">No articles found</p>';
  } catch (error) {
    console.error('Load dev news error:', error);
    showError('newsContainer', 'Failed to load developer news');
  }
}

/**
 * Filter tech news with debouncing
 */
const filterTech = debounce(async (tag) => {
  showSkeleton('newsContainer');

  try {
    let url = 'https://dev.to/api/articles?per_page=12';
    if (tag !== 'all') {
      url += `&tag=${encodeURIComponent(tag)}`;
    }

    const articles = await fetchWithTimeout(url);
    const data = await articles.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid response');
    }

    const html = data
      .map((article) =>
        createCard(
          article.title,
          article.description,
          article.url
        )
      )
      .join('');

    document.getElementById('newsContainer').innerHTML =
      html || '<p class="col-span-full text-gray-500">No articles found</p>';
  } catch (error) {
    console.error('Filter tech error:', error);
    showError('newsContainer', `Failed to filter by "${tag}"`);
  }
}, CONFIG.DEBOUNCE_DELAY);

// ============================================
// GITHUB TRENDING
// ============================================

async function loadGithubTrending() {
  const container = document.getElementById('githubContainer');
  if (!container) return;

  showSkeleton('githubContainer');
  updateRefreshTime();

  try {
    const data = await fetchWithCache(
      'githubTrending',
      'https://api.github.com/search/repositories?q=stars:>5000&sort=stars&order=desc&per_page=9'
    );

    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid API response');
    }

    const html = data.items
      .map((repo) =>
        createCard(
          repo.name,
          repo.description || 'No description available',
          repo.html_url,
          `<div class="flex gap-2 text-xs">
          <span class="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
            ⭐ ${(repo.stargazers_count || 0).toLocaleString()}
          </span>
          <span class="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
            🍴 ${(repo.forks_count || 0).toLocaleString()}
          </span>
          <span class="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
            ${escapeHTML(repo.language || 'Unknown')}
          </span>
        </div>`
        )
      )
      .join('');

    container.innerHTML = html;
  } catch (error) {
    console.error('Load github trending error:', error);
    showError('githubContainer', 'Failed to load GitHub repositories');
  }
}

/**
 * Search framework with debouncing
 */
const searchFramework = debounce(async (framework) => {
  showSkeleton('githubContainer');

  try {
    const response = await fetchWithTimeout(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(framework)}&sort=stars&per_page=9`
    );
    const data = await response.json();

    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid response');
    }

    const html = data.items
      .map((repo) =>
        createCard(
          repo.name,
          repo.description || 'No description',
          repo.html_url
        )
      )
      .join('');

    document.getElementById('githubContainer').innerHTML =
      html || '<p class="col-span-full text-gray-500">No repositories found</p>';
  } catch (error) {
    console.error('Search framework error:', error);
    showError('githubContainer', `Failed to search for "${framework}"`);
  }
}, CONFIG.DEBOUNCE_DELAY);

// ============================================
// HACKER NEWS
// ============================================

async function loadHackerNews() {
  const container = document.getElementById('hnContainer');
  if (!container) return;

  showSkeleton('hnContainer');
  updateRefreshTime();

  try {
    const ids = await fetchWithCache(
      'hnTop',
      'https://hacker-news.firebaseio.com/v0/topstories.json'
    );

    if (!Array.isArray(ids)) {
      throw new Error('Invalid API response');
    }

    const topIds = ids.slice(0, 9);

    const stories = await Promise.allSettled(
      topIds.map((id) =>
        fetchWithTimeout(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json?print=pretty`
        ).then((res) => res.json())
      )
    );

    const html = stories
      .filter((result) => result.status === 'fulfilled')
      .map((result) => {
        const story = result.value;
        return createCard(
          story.title,
          `👤 ${escapeHTML(story.by || 'Anonymous')} | ⭐ ${(story.score || 0).toLocaleString()}`,
          story.url || `https://news.ycombinator.com/item?id=${story.id}`
        );
      })
      .join('');

    container.innerHTML = html;
  } catch (error) {
    console.error('Load hacker news error:', error);
    showError('hnContainer', 'Failed to load Hacker News');
  }
}

// ============================================
// AI NEWS
// ============================================

async function loadAINews() {
  const container = document.getElementById('aiContainer');
  if (!container) return;

  showSkeleton('aiContainer');
  updateRefreshTime();

  try {
    const articles = await fetchWithCache(
      'aiNews',
      'https://dev.to/api/articles?tag=ai&per_page=9'
    );

    if (!Array.isArray(articles)) {
      throw new Error('Invalid API response');
    }

    const html = articles
      .map((article) =>
        createCard(
          article.title,
          article.description,
          article.url,
          `<div class="text-xs text-gray-500 dark:text-gray-400">
          👤 ${escapeHTML(article.user?.name || 'Anonymous')}
        </div>`
        )
      )
      .join('');

    container.innerHTML = html;
  } catch (error) {
    console.error('Load AI news error:', error);
    showError('aiContainer', 'Failed to load AI news');
  }
}

// ============================================
// SECURITY NEWS
// ============================================

async function loadSecurityNews() {
  const container = document.getElementById('securityContainer');
  if (!container) return;

  showSkeleton('securityContainer');
  updateRefreshTime();

  try {
    const articles = await fetchWithCache(
      'securityNews',
      'https://dev.to/api/articles?tag=security&per_page=9'
    );

    if (!Array.isArray(articles)) {
      throw new Error('Invalid API response');
    }

    const html = articles
      .map((article) =>
        createCard(
          article.title,
          article.description,
          article.url
        )
      )
      .join('');

    container.innerHTML = html;
  } catch (error) {
    console.error('Load security news error:', error);
    showError('securityContainer', 'Failed to load security news');
  }
}

// ============================================
// SEARCH
// ============================================

const searchTech = debounce(async () => {
  const input = document.getElementById('searchInput');
  if (!input) return;

  const query = input.value.trim();
  if (!query) {
    document.getElementById('searchResults').innerHTML =
      '<p class="col-span-full text-gray-500">Enter a search term</p>';
    return;
  }

  showSkeleton('searchResults');

  try {
    const response = await fetchWithTimeout(
      `https://dev.to/api/articles?tag=${encodeURIComponent(query)}&per_page=9`
    );
    const articles = await response.json();

    if (!Array.isArray(articles)) {
      throw new Error('Invalid response');
    }

    const html = articles
      .map((article) =>
        createCard(
          article.title,
          article.description,
          article.url
        )
      )
      .join('');

    document.getElementById('searchResults').innerHTML =
      html || '<p class="col-span-full text-gray-500">No results found</p>';
  } catch (error) {
    console.error('Search error:', error);
    showError('searchResults', `Failed to search for "${query}"`);
  }
}, CONFIG.DEBOUNCE_DELAY);

// ============================================
// SEARCH INPUT EVENT
// ============================================

const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchTech();
    }
  });
}

// ============================================
// BOOKMARKS
// ============================================

function saveBookmark(encodedTitle, encodedUrl) {
  try {
    const title = decodeURIComponent(encodedTitle);
    const url = decodeURIComponent(encodedUrl);

    if (!isValidURL(url)) {
      console.warn('Invalid bookmark URL:', url);
      alert('Invalid URL cannot be bookmarked');
      return;
    }

    let bookmarks = JSON.parse(localStorage.getItem('devintelBookmarks')) || [];

    // Check if already bookmarked
    if (bookmarks.some((b) => b.url === url)) {
      alert('Already bookmarked!');
      return;
    }

    // Limit bookmarks
    if (bookmarks.length >= CONFIG.MAX_BOOKMARKS) {
      alert(`Maximum ${CONFIG.MAX_BOOKMARKS} bookmarks reached`);
      return;
    }

    bookmarks.push({
      title,
      url,
      savedAt: new Date().toISOString(),
    });

    localStorage.setItem('devintelBookmarks', JSON.stringify(bookmarks));
    loadBookmarks();
    showNotification('Bookmark saved!');
  } catch (error) {
    console.error('Bookmark save error:', error);
    alert('Failed to save bookmark');
  }
}

function loadBookmarks() {
  const container = document.getElementById('bookmarkContainer');
  if (!container) return;

  try {
    let bookmarks = JSON.parse(localStorage.getItem('devintelBookmarks')) || [];

    if (bookmarks.length === 0) {
      container.innerHTML = '<p class="col-span-full text-gray-500">No bookmarks yet. Save articles to see them here.</p>';
      return;
    }

    const html = bookmarks
      .map((b) =>
        createCard(b.title, `Saved ${new Date(b.savedAt || 0).toLocaleDateString()}`, b.url)
      )
      .join('');

    container.innerHTML = html;
  } catch (error) {
    console.error('Load bookmarks error:', error);
    container.innerHTML = '<p class="col-span-full text-red-500">Error loading bookmarks</p>';
  }
}

// ============================================
// ANALYTICS
// ============================================

function loadAnalytics() {
  const container = document.getElementById('analyticsContainer');
  if (!container) return;

  try {
    const bookmarks = JSON.parse(localStorage.getItem('devintelBookmarks')) || [];
    const cacheKeys = Object.keys(localStorage).filter(
      (key) => key.startsWith('devNews') || key.startsWith('github') || key.startsWith('hnTop')
    );

    const html = `
      <div class="card">
        <h3 class="font-semibold text-lg mb-2">⭐ Saved Articles</h3>
        <p class="text-3xl font-bold text-blue-600 dark:text-blue-400">${bookmarks.length}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Total bookmarked</p>
      </div>

      <div class="card">
        <h3 class="font-semibold text-lg mb-2">💾 Cached Data</h3>
        <p class="text-3xl font-bold text-green-600 dark:text-green-400">${cacheKeys.length}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Active caches</p>
      </div>

      <div class="card">
        <h3 class="font-semibold text-lg mb-2">📊 Active Feeds</h3>
        <p class="text-3xl font-bold text-purple-600 dark:text-purple-400">6</p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">News sources</p>
      </div>
    `;

    container.innerHTML = html;
  } catch (error) {
    console.error('Load analytics error:', error);
    container.innerHTML = '<p class="text-red-500">Error loading analytics</p>';
  }
}

// ============================================
// THEME MANAGEMENT
// ============================================

const themeToggle = document.getElementById('themeToggle');

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.classList.remove('dark');
    if (themeToggle) themeToggle.textContent = '🌙 Theme';
  } else {
    document.documentElement.classList.add('dark');
    if (themeToggle) themeToggle.textContent = '☀️ Theme';
  }

  localStorage.setItem('devintelTheme', theme);
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = localStorage.getItem('devintelTheme') || 'dark';
    const newTheme = current === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  });
}

// Initialize theme
const savedTheme = localStorage.getItem('devintelTheme') || 'dark';
applyTheme(savedTheme);

// ============================================
// NOTIFICATION
// ============================================

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  const bgColor =
    type === 'success'
      ? 'bg-green-600'
      : type === 'error'
        ? 'bg-red-600'
        : 'bg-blue-600';

  notification.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm animate-bounce`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// ============================================
// REFRESH FEEDS
// ============================================

function refreshFeeds() {
  console.log('Refreshing feeds...');
  updateRefreshTime();
  loadDevNews();
  loadGithubTrending();
  loadHackerNews();
  loadAINews();
  loadSecurityNews();
}

// Auto refresh every 30 minutes
setInterval(refreshFeeds, CONFIG.AUTO_REFRESH_INTERVAL);

// ============================================
// PWA INSTALLATION
// ============================================

let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) {
    installBtn.classList.remove('hidden');
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      deferredPrompt = null;
      installBtn.classList.add('hidden');
    }
  });
}

window.addEventListener('appinstalled', () => {
  console.log('PWA installed');
  showNotification('App installed successfully!');
});

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('pwa/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered successfully');

        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update();
        }, 60000);

        // Listen for controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          showNotification('Update available! Reload to get the latest version.', 'info');
        });
      })
      .catch((error) => {
        console.warn('Service Worker registration failed:', error);
      });
  });
}

// ============================================
// SMOOTH SCROLL ANCHOR LINKS
// ============================================

document.documentElement.style.scrollBehavior = 'smooth';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('DevIntel initialized');
  loadDevNews();
  loadGithubTrending();
  loadHackerNews();
  loadAINews();
  loadSecurityNews();
  loadBookmarks();
  loadAnalytics();
  updateRefreshTime();
});
