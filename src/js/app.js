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
    <div class="cyber-card skeleton">
      <div class="h-6 w-3/4 mb-4 rounded"></div>
      <div class="h-4 w-full mb-2 rounded"></div>
      <div class="h-4 w-2/3 rounded"></div>
    </div>
  `
    )
    .join('');

  container.innerHTML = skeletons;
}

/**
 * Create card HTML with cyberpunk styling
 */
function createCard(title, description, url, extra = '', type = 'news') {
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
    <article class="cyber-card ${type}">
      <h3 class="cyber-card-title text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700">
        ${safeTitle}
      </h3>

      <p class="cyber-card-desc">
        ${safeDescription}
      </p>

      ${extra}

      <div class="cyber-card-footer gap-3">
        <a
          href="${safeUrl}"
          target="_blank"
          rel="noopener noreferrer"
          class="flex-1 text-sm text-center py-2 px-3 rounded font-black tracking-wide bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-white transition transform hover:scale-105 active:scale-95 shadow-md"
          aria-label="Read article: ${safeTitle}">
          VISIT →
        </a>

        <button
          onclick="saveBookmark('${encodedTitle}','${encodedUrl}')"
          class="px-4 py-2 rounded-lg font-black text-sm tracking-widest bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white transition transform hover:scale-105 active:scale-95 shadow-lg border-2 border-yellow-300"
          aria-label="Save article: ${safeTitle}"
          title="Save to bookmarks">
          ⭐ SAVE
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
    <div class="col-span-full cyber-card security border-red-400 hover:border-red-600">
      <p class="font-black text-red-700 mb-2">⚠️ ERROR</p>
      <p class="text-red-600 font-semibold">${escapeHTML(message)}</p>
      <p class="text-sm text-red-500 mt-2">Check your internet connection and try again.</p>
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
          <span class="cyber-badge magenta">
            ${escapeHTML(article.tag_list?.[0] || 'General')}
          </span>
        </div>`,
          'news'
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
          article.url,
          '',
          'news'
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
          <span class="cyber-badge lime">
            ⭐ ${(repo.stargazers_count || 0).toLocaleString()}
          </span>
          <span class="cyber-badge lime">
            🍴 ${(repo.forks_count || 0).toLocaleString()}
          </span>
          <span class="cyber-badge lime">
            ${escapeHTML(repo.language || 'Unknown')}
          </span>
        </div>`,
          'github'
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
          repo.html_url,
          '',
          'github'
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
          story.url || `https://news.ycombinator.com/item?id=${story.id}`,
          '',
          'hn'
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
          `<div class="text-xs text-slate-600 font-semibold">
          👤 ${escapeHTML(article.user?.name || 'Anonymous')}
        </div>`,
          'ai'
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
          article.url,
          '',
          'security'
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
          article.url,
          '',
          'search'
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
        createCard(b.title, `Saved ${new Date(b.savedAt || 0).toLocaleDateString()}`, b.url, '', 'bookmark')
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
      <div class="cyber-card bookmark">
        <h3 class="cyber-card-title text-yellow-600">⭐ SAVED</h3>
        <p class="text-4xl font-black text-yellow-600 my-3">${bookmarks.length}</p>
        <p class="text-sm text-slate-700 font-semibold">Bookmarked articles</p>
      </div>

      <div class="cyber-card search">
        <h3 class="cyber-card-title text-cyan-600">💾 CACHED</h3>
        <p class="text-4xl font-black text-cyan-600 my-3">${cacheKeys.length}</p>
        <p class="text-sm text-slate-700 font-semibold">Active caches</p>
      </div>

      <div class="cyber-card ai">
        <h3 class="cyber-card-title text-purple-600">📊 FEEDS</h3>
        <p class="text-4xl font-black text-purple-600 my-3">6</p>
        <p class="text-sm text-slate-700 font-semibold">News sources</p>
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

function applyTheme() {
  document.documentElement.classList.remove('dark');
  if (themeToggle) themeToggle.textContent = '💡 LIGHT MODE';
  localStorage.setItem('devintelTheme', 'light');
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    applyTheme();
    showNotification('Light mode active!');
  });
}

// Initialize theme to light
applyTheme();

// ============================================
// NOTIFICATION
// ============================================

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  const typeClass =
    type === 'success'
      ? 'notification success'
      : type === 'error'
        ? 'notification error'
        : 'notification info';

  notification.className = typeClass;
  notification.textContent = message;
  notification.style.animation = 'slide-up 0.4s ease-out';

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'none';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
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
