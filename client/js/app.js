// ============================================
// APP ORCHESTRATION
// Depends on: config.js, api.js, ui.js
// ============================================

const SECTIONS = ['news', 'github', 'hn', 'ai', 'security'];

// Global state — articles in memory, filter selection, notifications.
const state = {
  feeds: { news: [], github: [], hn: [], ai: [], security: [] },
  filters: { news: 'all', github: 'all' },
  search: '',
  searchResults: [],
  notifications: [],
  unread: 0,
  // Map<url, firstSeenTimestamp>
  seen: {},
};

// ---- "Seen" persistence (for NEW detection) ----

(function loadSeen() {
  try { state.seen = JSON.parse(localStorage.getItem('devintelSeen')) || {}; }
  catch (_) { state.seen = {}; }
})();

function persistSeen() {
  try {
    // Trim — keep only entries < 24h old to bound size
    const cutoff = Date.now() - 86400000;
    const trimmed = {};
    Object.keys(state.seen).forEach(function (k) {
      if (state.seen[k] > cutoff) trimmed[k] = state.seen[k];
    });
    state.seen = trimmed;
    localStorage.setItem('devintelSeen', JSON.stringify(trimmed));
  } catch (_) {}
}

function isNew(url) {
  const t = state.seen[url];
  return t && (Date.now() - t) < CONFIG.NEW_ARTICLE_WINDOW;
}

// ---- Feed loaded handler (called by api.js) ----

function handleFeedLoaded(section, articles, opts) {
  opts = opts || {};
  const previous = state.feeds[section] || [];
  const previousUrls = new Set(previous.map(function (a) { return a.url; }));

  // Detect new articles (not in previous load and not in seen registry)
  const now = Date.now();
  const freshlyNew = [];
  articles.forEach(function (a) {
    if (!state.seen[a.url]) {
      state.seen[a.url] = now;
      if (previous.length > 0 && !previousUrls.has(a.url)) {
        freshlyNew.push(a);
      }
    }
  });
  persistSeen();

  state.feeds[section] = articles;

  if (freshlyNew.length > 0) {
    pushNewArticleNotifications(section, freshlyNew);
    _pendingNewArticleCount += freshlyNew.length;
    maybeBrowserNotify(freshlyNew);
  }

  if (opts.container) renderFeed(section, opts.container);
  updateRefreshTime();
  loadAnalytics();
}

// ---- Rendering ----

function renderFeed(section, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const articles = state.feeds[section] || [];
  const filtered = applyFilters(section, articles);

  if (filtered.length === 0) {
    const isFiltered = state.search || (state.filters[section] && state.filters[section] !== 'all');
    showEmpty(containerId,
      isFiltered ? 'No articles match your filters' : 'Nothing to show yet',
      isFiltered ? '⌕' : '∅');
    return;
  }

  const html = filtered.map(function (a) {
    return cardForArticle(a, section);
  }).join('');
  container.innerHTML = html;
  staggerCards(containerId);
}

function cardForArticle(a, section) {
  const meta = [];
  if (isNew(a.url)) meta.push('<span class="new-badge">NEW</span>');
  meta.push('<span class="source-badge">' + escapeHTML(a.source || section) + '</span>');
  if (typeof a.stars === 'number') meta.push('<span class="source-badge">★ ' + a.stars.toLocaleString() + '</span>');
  if (a.language)                  meta.push('<span class="source-badge">' + escapeHTML(a.language) + '</span>');
  if (typeof a.score === 'number') meta.push('<span class="source-badge">▲ ' + a.score + '</span>');
  if (a.tags && a.tags.length && !a.language && typeof a.stars !== 'number') {
    meta.push('<span class="source-badge">#' + escapeHTML(a.tags[0]) + '</span>');
  }
  return createCard(a.title, a.description, a.url, meta.join(''), section);
}

function applyFilters(section, articles) {
  const q = state.search.trim().toLowerCase();
  const tag = state.filters[section] || 'all';

  return articles.filter(function (a) {
    if (tag !== 'all') {
      const haystack = (a.title + ' ' + (a.description || '') + ' ' + (a.tags || []).join(' ') + ' ' + (a.language || '')).toLowerCase();
      if (haystack.indexOf(tag.toLowerCase()) === -1) return false;
    }
    if (q) {
      const hay = (a.title + ' ' + (a.description || '') + ' ' + (a.tags || []).join(' ')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

function rerenderAll() {
  renderFeed('news',     'newsContainer');
  renderFeed('github',   'githubContainer');
  renderFeed('hn',       'hnContainer');
  renderFeed('ai',       'aiContainer');
  renderFeed('security', 'securityContainer');
}

// ---- Search (real-time, debounced) ----

const searchInput = document.getElementById('searchInput');

const handleSearch = debounce(function () {
  rerenderAll();
  renderSearchResults();
}, CONFIG.DEBOUNCE_DELAY);

if (searchInput) {
  searchInput.addEventListener('input', function (e) {
    state.search = e.target.value || '';
    handleSearch();
  });
}

function renderSearchResults() {
  const container = document.getElementById('searchResults');
  if (!container) return;
  const q = state.search.trim().toLowerCase();
  if (!q) { container.innerHTML = ''; return; }

  const all = SECTIONS.reduce(function (acc, s) { return acc.concat(state.feeds[s] || []); }, []);
  const seenUrls = new Set();
  const matches = [];
  all.forEach(function (a) {
    if (seenUrls.has(a.url)) return;
    const hay = (a.title + ' ' + (a.description || '') + ' ' + (a.tags || []).join(' ')).toLowerCase();
    if (hay.indexOf(q) !== -1) {
      seenUrls.add(a.url);
      matches.push(a);
    }
  });

  if (matches.length === 0) {
    showEmpty('searchResults', 'No matches for "' + state.search + '"', '⌕');
    return;
  }
  container.innerHTML = matches.slice(0, 12).map(function (a) {
    return cardForArticle(a, 'search');
  }).join('');
  staggerCards('searchResults');
}

// ---- Filters ----

document.querySelectorAll('[data-filter-group]').forEach(function (group) {
  const section = group.getAttribute('data-filter-group');
  group.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    const filter = btn.getAttribute('data-filter');
    state.filters[section] = filter;
    group.querySelectorAll('[data-filter]').forEach(function (b) {
      b.classList.toggle('active', b === btn);
    });
    const containerId = section === 'news' ? 'newsContainer' : 'githubContainer';
    renderFeed(section, containerId);
  });
});

// ---- Bookmarks ----

function _readBookmarks() {
  try { return JSON.parse(localStorage.getItem('devintelBookmarks')) || []; }
  catch (_) { return []; }
}
function _writeBookmarks(list) {
  localStorage.setItem('devintelBookmarks', JSON.stringify(list));
}

/**
 * Add-only — kept stable for tests.
 */
function saveBookmark(encodedTitle, encodedUrl) {
  try {
    const title = decodeURIComponent(encodedTitle);
    const url = decodeURIComponent(encodedUrl);
    if (!isValidURL(url)) { showNotification('Invalid URL — cannot bookmark', 'error'); return; }

    const bookmarks = _readBookmarks();
    if (bookmarks.some(function (b) { return b.url === url; })) {
      showNotification('Already bookmarked!', 'info');
      return;
    }
    if (bookmarks.length >= CONFIG.MAX_BOOKMARKS) {
      showNotification('Maximum ' + CONFIG.MAX_BOOKMARKS + ' bookmarks reached', 'error');
      return;
    }
    bookmarks.push({ title: title, url: url, savedAt: new Date().toISOString() });
    _writeBookmarks(bookmarks);
    loadBookmarks();
    rerenderAll();
    showNotification('Bookmark saved!');
  } catch (_) {
    showNotification('Failed to save bookmark', 'error');
  }
}

/**
 * Toggle add/remove — wired to card star icons.
 */
function toggleBookmark(encodedTitle, encodedUrl) {
  try {
    const title = decodeURIComponent(encodedTitle);
    const url = decodeURIComponent(encodedUrl);
    if (!isValidURL(url)) { showNotification('Invalid URL', 'error'); return; }

    let bookmarks = _readBookmarks();
    const idx = bookmarks.findIndex(function (b) { return b.url === url; });
    if (idx >= 0) {
      bookmarks.splice(idx, 1);
      _writeBookmarks(bookmarks);
      loadBookmarks();
      rerenderAll();
      showNotification('Removed from saved', 'info');
    } else {
      if (bookmarks.length >= CONFIG.MAX_BOOKMARKS) {
        showNotification('Maximum ' + CONFIG.MAX_BOOKMARKS + ' bookmarks reached', 'error');
        return;
      }
      bookmarks.push({ title: title, url: url, savedAt: new Date().toISOString() });
      _writeBookmarks(bookmarks);
      loadBookmarks();
      rerenderAll();
      showNotification('Saved');
    }
  } catch (_) {
    showNotification('Failed', 'error');
  }
}

// Event delegation — captures clicks from any save-btn anywhere on the page.
// Robust against titles containing apostrophes (which broke inline onclick).
document.addEventListener('click', function (e) {
  const btn = e.target.closest('[data-action="toggle-bookmark"]');
  if (!btn) return;
  e.preventDefault();
  const payload = btn.getAttribute('data-url') || '';
  const sep = payload.indexOf('|');
  if (sep < 0) return;
  const encTitle = payload.slice(0, sep);
  const encUrl   = payload.slice(sep + 1);

  // Optimistic UI: flip icon + aria-pressed instantly, before any re-render.
  let url; try { url = decodeURIComponent(encUrl); } catch (_) { url = ''; }
  const willBeSaved = !isBookmarked(url);
  btn.classList.toggle('saved', willBeSaved);
  btn.setAttribute('aria-pressed', String(willBeSaved));
  btn.setAttribute('aria-label', willBeSaved ? 'Remove bookmark' : 'Save article');
  btn.setAttribute('title',      willBeSaved ? 'Remove bookmark' : 'Save article');
  btn.innerHTML = starSvg(willBeSaved);

  toggleBookmark(encTitle, encUrl);
});

function loadBookmarks() {
  const container = document.getElementById('bookmarkContainer');
  if (!container) return;
  const bookmarks = _readBookmarks();
  if (bookmarks.length === 0) {
    container.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">★</div>' +
        '<p>No bookmarks yet</p>' +
        '<p class="text-xs mt-1">Save articles to find them here.</p>' +
      '</div>';
    return;
  }

  container.innerHTML = bookmarks.map(function (b) {
    const meta = '<span class="source-badge">Saved ' + new Date(b.savedAt || 0).toLocaleDateString() + '</span>';
    return createCard(b.title, '', b.url, meta, 'bookmark');
  }).join('');
  staggerCards('bookmarkContainer');
}

// ---- Analytics ----

function loadAnalytics() {
  const container = document.getElementById('analyticsContainer');
  if (!container) return;
  try {
    const bookmarks = _readBookmarks();
    const totalArticles = SECTIONS.reduce(function (s, k) { return s + (state.feeds[k] || []).length; }, 0);
    const stat = function (label, value, hint) {
      return '<div class="cyber-card" style="animation-delay:0ms">' +
        '<div class="text-xs uppercase tracking-wide" style="color: var(--muted);">' + escapeHTML(label) + '</div>' +
        '<div class="text-3xl font-semibold mt-2 mb-1" style="color: var(--accent);">' + value + '</div>' +
        '<div class="text-xs" style="color: var(--muted);">' + escapeHTML(hint || '') + '</div>' +
      '</div>';
    };
    container.innerHTML =
      stat('Saved',   bookmarks.length,    'Articles bookmarked') +
      stat('Tracked', totalArticles,       'Across all feeds') +
      stat('Sources', '5',                 'Live feeds');
    staggerCards('analyticsContainer');
  } catch (_) {
    container.innerHTML = '<div class="empty-state">Error loading analytics</div>';
  }
}

// ---- Notifications system ----

const bellBtn        = document.getElementById('bellBtn');
const bellBadge      = document.getElementById('bellBadge');
const bellBtnMobile  = document.getElementById('bellBtnMobile');
const bellBadgeMobile = document.getElementById('bellBadgeMobile');
const notifDrawer   = document.getElementById('notifDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const closeDrawer   = document.getElementById('closeDrawer');
const markAllRead   = document.getElementById('markAllRead');
const notifList     = document.getElementById('notifList');

function pushNewArticleNotifications(section, articles) {
  articles.slice(0, 5).forEach(function (a) {
    state.notifications.unshift({
      id: a.url,
      title: a.title,
      source: a.source || section,
      time: Date.now(),
      read: false,
      url: a.url,
    });
  });
  if (state.notifications.length > CONFIG.MAX_NOTIFICATIONS) {
    state.notifications.length = CONFIG.MAX_NOTIFICATIONS;
  }
  state.unread = state.notifications.filter(function (n) { return !n.read; }).length;
  renderNotifications();
}

function _updateBellBadge(badge) {
  if (!badge) return;
  if (state.unread > 0) {
    badge.textContent = state.unread > 99 ? '99+' : String(state.unread);
    badge.classList.add('visible');
  } else {
    badge.classList.remove('visible');
  }
}

function renderNotifications() {
  _updateBellBadge(bellBadge);
  _updateBellBadge(bellBadgeMobile);
  if (!notifList) return;
  if (state.notifications.length === 0) {
    notifList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔔</div><p>No notifications yet</p><p class="text-xs mt-1">You\'ll see new articles here.</p></div>';
    return;
  }
  notifList.innerHTML = state.notifications.map(function (n) {
    const cls = 'notif-item' + (n.read ? '' : ' unread');
    const ago = relTime(n.time);
    return '<div class="' + cls + '" data-url="' + escapeHTML(n.url) + '">' +
        '<div class="text-sm font-medium" style="color: var(--text);">' + escapeHTML(n.title) + '</div>' +
        '<div class="text-xs flex items-center justify-between" style="color: var(--muted);">' +
          '<span>' + escapeHTML(n.source) + '</span><span>' + ago + '</span>' +
        '</div>' +
      '</div>';
  }).join('');
}

function relTime(ts) {
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 60) return sec + 's ago';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
  return Math.floor(sec / 86400) + 'd ago';
}

function openDrawer() {
  if (notifDrawer)   notifDrawer.classList.add('open');
  if (drawerOverlay) drawerOverlay.classList.add('visible');
  if (notifDrawer)   notifDrawer.setAttribute('aria-hidden', 'false');
}
function closeDrawerFn() {
  if (notifDrawer)   notifDrawer.classList.remove('open');
  if (drawerOverlay) drawerOverlay.classList.remove('visible');
  if (notifDrawer)   notifDrawer.setAttribute('aria-hidden', 'true');
}

if (bellBtn)       bellBtn.addEventListener('click', openDrawer);
if (bellBtnMobile) bellBtnMobile.addEventListener('click', openDrawer);
if (closeDrawer)   closeDrawer.addEventListener('click', closeDrawerFn);
if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawerFn);
if (markAllRead) {
  markAllRead.addEventListener('click', function () {
    state.notifications.forEach(function (n) { n.read = true; });
    state.unread = 0;
    renderNotifications();
  });
}
if (notifList) {
  notifList.addEventListener('click', function (e) {
    const item = e.target.closest('.notif-item');
    if (!item) return;
    const url = item.getAttribute('data-url');
    const n = state.notifications.find(function (x) { return x.url === url; });
    if (n && !n.read) { n.read = true; state.unread = Math.max(0, state.unread - 1); }
    renderNotifications();
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  });
}

// ---- New-articles floating banner ----
//
// Strict rules:
//   1. ONLY shown when newArticlesCount > 0.
//   2. Hidden on initial mount and immediately if count is 0/null/undefined.
//   3. Auto-dismissed after 4s; instantly on × click or banner-body click.
//   4. Shown ONCE per refresh cycle (one per fetch that returned new content).
//   5. Re-show requires the NEXT refresh cycle to add genuinely-new article URLs
//      that weren't in `state.seen` already.

const newBanner      = document.getElementById('newBanner');
const newBannerCount = document.getElementById('newBannerCount');

let _pendingNewArticleCount = 0;   // accumulator for the current refresh cycle
let _bannerDismissTimer = null;

function hideBanner() {
  if (!newBanner) return;
  newBanner.classList.remove('visible');
  clearTimeout(_bannerDismissTimer);
  _bannerDismissTimer = null;
}

/**
 * Render the banner — strict guard.
 * @param {number} newArticlesCount
 */
function renderBanner(newArticlesCount) {
  // Rule 1 + root-cause guard: never render anything when count is non-positive.
  const count = Number(newArticlesCount) || 0;
  if (count <= 0) {
    hideBanner();
    return;
  }
  if (!newBanner || !newBannerCount) return;

  newBannerCount.textContent = String(count);
  newBanner.classList.add('visible');
  clearTimeout(_bannerDismissTimer);
  _bannerDismissTimer = setTimeout(hideBanner, 4000);
}

/**
 * Called once per refresh cycle, after all loaders settle.
 * Emits the banner exactly once for that batch (or not at all if count is 0).
 */
function commitNewArticleBanner() {
  const count = _pendingNewArticleCount;
  _pendingNewArticleCount = 0;   // reset BEFORE render so a second call is a no-op
  renderBanner(count);
}

if (newBanner) {
  newBanner.addEventListener('click', function (e) {
    // Both × and the banner body dismiss; banner body also scrolls to top.
    if (!e.target.closest('#newBannerClose')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    hideBanner();
  });
}

// Rule 2: explicit hide on mount, in case the element somehow inherited `.visible`.
hideBanner();

// ---- Browser notifications (background-tab alerts) ----

let browserNotifAllowed = false;
function requestBrowserNotifPerm() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') { browserNotifAllowed = true; return; }
  if (Notification.permission === 'denied') return;
  // Request only after user interaction — first bell click
  if (bellBtn) {
    bellBtn.addEventListener('click', function once() {
      bellBtn.removeEventListener('click', once);
      Notification.requestPermission().then(function (p) {
        browserNotifAllowed = (p === 'granted');
      });
    });
  }
}
requestBrowserNotifPerm();

function maybeBrowserNotify(articles) {
  if (!browserNotifAllowed) return;
  if (document.visibilityState === 'visible') return;
  if (articles.length === 0) return;
  try {
    new Notification('DevIntel — ' + articles.length + ' new article' + (articles.length > 1 ? 's' : ''), {
      body: articles[0].title,
      icon: 'icons/icon-192.png',
      tag: 'devintel-new',
    });
  } catch (_) {}
}

// ---- Refresh ----

const refreshBtn = document.getElementById('refreshBtn');

async function refreshFeeds(opts) {
  opts = opts || {};
  const fresh = !!opts.fresh;
  const silent = !!opts.silent;
  if (refreshBtn) {
    refreshBtn.style.transition = 'transform .6s';
    refreshBtn.style.transform = 'rotate(360deg)';
    setTimeout(function () { refreshBtn.style.transition = 'none'; refreshBtn.style.transform = 'rotate(0deg)'; }, 650);
  }

  // Reset the per-cycle accumulator before any loader runs.
  _pendingNewArticleCount = 0;

  await Promise.all([
    loadDevNews({ fresh: fresh, silent: silent }),
    loadGithubTrending({ fresh: fresh, silent: silent }),
    loadHackerNews({ fresh: fresh, silent: silent }),
    loadAINews({ fresh: fresh, silent: silent }),
    loadSecurityNews({ fresh: fresh, silent: silent }),
  ]);

  // Show banner exactly once for this cycle — the function guards count <= 0.
  commitNewArticleBanner();
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', function () {
    refreshFeeds({ fresh: true });
    showNotification('Refreshing feeds…', 'info');
  });
}

// Polling — silent background refresh
setInterval(function () {
  refreshFeeds({ fresh: true, silent: true });
}, CONFIG.AUTO_REFRESH_INTERVAL);

// ---- Theme ----

const themeToggle = document.getElementById('themeToggle');

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('devintelTheme', theme);
  if (themeToggle) {
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }
}

if (themeToggle) {
  themeToggle.addEventListener('click', function () {
    const current = localStorage.getItem('devintelTheme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

(function initTheme() {
  const stored = localStorage.getItem('devintelTheme');
  const preferred = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  applyTheme(stored || preferred);
})();

// ---- Mobile menu (kept as no-op for sidebar onclick= attributes) ----

function closeMobileMenu() { /* sidebar is hidden on mobile — no action needed */ }

// ---- Bottom nav active state ----

(function initBottomNav() {
  const sectionIds = ['searchSection', 'newsSection', 'githubSection', 'hnSection', 'bookmarksSection'];
  const navMap = { searchSection: 'search', newsSection: 'news', githubSection: 'github', hnSection: 'hn', bookmarksSection: 'saved' };

  function updateBottomNav() {
    if (window.innerWidth >= 768) return;
    let active = sectionIds[0];
    sectionIds.forEach(function (id) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= 80) active = id;
    });
    document.querySelectorAll('[data-bottom-nav]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-bottom-nav') === navMap[active]);
    });
  }

  window.addEventListener('scroll', updateBottomNav, { passive: true });
  updateBottomNav();
})();

// ---- Sidebar collapse ----

const sidebarToggle  = document.getElementById('sidebarToggle');
const sidebarChevron = document.getElementById('sidebarChevron');
function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  localStorage.setItem('devintelSidebarCollapsed', String(collapsed));
  if (sidebarChevron) sidebarChevron.style.transform = collapsed ? 'rotate(180deg)' : '';
}
if (sidebarToggle) {
  sidebarToggle.addEventListener('click', function () {
    setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
  });
}
setSidebarCollapsed(localStorage.getItem('devintelSidebarCollapsed') === 'true');

// ---- PWA ----

let deferredPrompt;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.classList.remove('hidden');
});
if (installBtn) {
  installBtn.addEventListener('click', async function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') showNotification('Installing DevIntel…', 'info');
    deferredPrompt = null;
    installBtn.classList.add('hidden');
  });
}
window.addEventListener('appinstalled', function () { showNotification('App installed'); });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('pwa/service-worker.js').then(function (reg) {
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') reg.update();
      });
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        showNotification('Update available — reload to get it', 'info');
      });
    }).catch(function () { /* offline-friendly: ignore */ });
  });
}

// ---- Init ----

document.addEventListener('DOMContentLoaded', function () {
  refreshFeeds({});
  loadBookmarks();
  loadAnalytics();
  renderNotifications();
  updateRefreshTime();
});
