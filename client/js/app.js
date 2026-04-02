// ============================================
// APP ORCHESTRATION
// Depends on: config.js, api.js, ui.js
// ============================================

// ---- Mobile Menu ----

const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

function closeMobileMenu() {
  if (sidebar) sidebar.classList.add('-translate-x-full');
  if (overlay) overlay.classList.add('hidden');
  if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
}

if (menuToggle) {
  menuToggle.addEventListener('click', function() {
    const isOpen = !sidebar.classList.contains('-translate-x-full');
    sidebar.classList.toggle('-translate-x-full', isOpen);
    overlay.classList.toggle('hidden', isOpen);
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
  });
}

if (overlay) {
  overlay.addEventListener('click', closeMobileMenu);
}

window.addEventListener('resize', function() {
  if (window.innerWidth >= 768) closeMobileMenu();
});

// ---- Sidebar Collapse (desktop only) ----

const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarChevron = document.getElementById('sidebarChevron');

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  localStorage.setItem('devintelSidebarCollapsed', String(collapsed));
  if (sidebarChevron) {
    sidebarChevron.style.transform = collapsed ? 'rotate(180deg)' : '';
  }
  if (sidebarToggle) {
    sidebarToggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
  }
}

if (sidebarToggle) {
  sidebarToggle.addEventListener('click', function() {
    setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
  });
}

// Restore collapse state on load
setSidebarCollapsed(localStorage.getItem('devintelSidebarCollapsed') === 'true');

// ---- Theme Management ----

const themeToggle = document.getElementById('themeToggle');

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  if (themeToggle) {
    const icon = themeToggle.querySelector('.flex-shrink-0');
    const label = themeToggle.querySelector('.sidebar-label');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    if (label) label.textContent = isDark ? 'LIGHT MODE' : 'DARK MODE';
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  localStorage.setItem('devintelTheme', theme);
}

if (themeToggle) {
  themeToggle.addEventListener('click', function() {
    const current = localStorage.getItem('devintelTheme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
    showNotification(current === 'dark' ? 'Light mode active!' : 'Dark mode active!');
  });
}

// Initialise theme: stored preference → system preference → light
(function initTheme() {
  const stored = localStorage.getItem('devintelTheme');
  const preferred = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(stored || preferred);
})();

// ---- Bookmarks ----

function saveBookmark(encodedTitle, encodedUrl) {
  try {
    const title = decodeURIComponent(encodedTitle);
    const url = decodeURIComponent(encodedUrl);

    if (!isValidURL(url)) {
      showNotification('Invalid URL — cannot bookmark', 'error');
      return;
    }

    let bookmarks = JSON.parse(localStorage.getItem('devintelBookmarks')) || [];

    if (bookmarks.some(function(b) { return b.url === url; })) {
      showNotification('Already bookmarked!', 'info');
      return;
    }

    if (bookmarks.length >= CONFIG.MAX_BOOKMARKS) {
      showNotification('Maximum ' + CONFIG.MAX_BOOKMARKS + ' bookmarks reached', 'error');
      return;
    }

    bookmarks.push({ title: title, url: url, savedAt: new Date().toISOString() });
    localStorage.setItem('devintelBookmarks', JSON.stringify(bookmarks));
    loadBookmarks();
    showNotification('Bookmark saved!');
  } catch (error) {
    showNotification('Failed to save bookmark', 'error');
  }
}

function loadBookmarks() {
  const container = document.getElementById('bookmarkContainer');
  if (!container) return;

  try {
    const bookmarks = JSON.parse(localStorage.getItem('devintelBookmarks')) || [];

    if (bookmarks.length === 0) {
      container.innerHTML = '<p class="col-span-full text-slate-500 dark:text-slate-400">No bookmarks yet. Save articles to see them here.</p>';
      return;
    }

    const html = bookmarks.map(function(b) {
      return createCard(
        b.title,
        'Saved ' + new Date(b.savedAt || 0).toLocaleDateString(),
        b.url,
        '',
        'bookmark'
      );
    }).join('');

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = '<p class="col-span-full text-red-500">Error loading bookmarks</p>';
  }
}

// ---- Analytics ----

function loadAnalytics() {
  const container = document.getElementById('analyticsContainer');
  if (!container) return;

  try {
    const bookmarks = JSON.parse(localStorage.getItem('devintelBookmarks')) || [];
    const cacheKeys = Object.keys(localStorage).filter(function(k) {
      return k.startsWith(CONFIG.CACHE_VERSION + '_');
    });

    container.innerHTML =
      '<div class="cyber-card bookmark">' +
        '<h3 class="cyber-card-title text-yellow-600">⭐ SAVED</h3>' +
        '<p class="text-4xl font-black text-yellow-600 my-3">' + bookmarks.length + '</p>' +
        '<p class="text-sm text-slate-700 dark:text-slate-400 font-semibold">Bookmarked articles</p>' +
      '</div>' +
      '<div class="cyber-card search">' +
        '<h3 class="cyber-card-title text-cyan-600">💾 CACHED</h3>' +
        '<p class="text-4xl font-black text-cyan-600 my-3">' + cacheKeys.length + '</p>' +
        '<p class="text-sm text-slate-700 dark:text-slate-400 font-semibold">Active caches</p>' +
      '</div>' +
      '<div class="cyber-card ai">' +
        '<h3 class="cyber-card-title text-purple-600">📡 FEEDS</h3>' +
        '<p class="text-4xl font-black text-purple-600 my-3">6</p>' +
        '<p class="text-sm text-slate-700 dark:text-slate-400 font-semibold">News sources</p>' +
      '</div>';
  } catch (error) {
    container.innerHTML = '<p class="text-red-500">Error loading analytics</p>';
  }
}

// ---- Feed Refresh ----

function refreshFeeds() {
  updateRefreshTime();
  loadDevNews();
  loadGithubTrending();
  loadHackerNews();
  loadAINews();
  loadSecurityNews();
}

setInterval(refreshFeeds, CONFIG.AUTO_REFRESH_INTERVAL);

// ---- PWA Installation ----

let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.classList.remove('hidden');
});

if (installBtn) {
  installBtn.addEventListener('click', async function() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      showNotification('Installing DevIntel...', 'info');
    }
    deferredPrompt = null;
    installBtn.classList.add('hidden');
  });
}

window.addEventListener('appinstalled', function() {
  showNotification('App installed successfully!');
});

// ---- Service Worker ----

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('pwa/service-worker.js').then(function(registration) {
      // Check for updates when page becomes visible
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });

      navigator.serviceWorker.addEventListener('controllerchange', function() {
        showNotification('Update available! Reload to get the latest version.', 'info');
      });
    }).catch(function(error) {
      console.warn('Service Worker registration failed:', error);
    });
  });
}

// ---- Shortcut URL Handling ----

(function handleShortcuts() {
  const params = new URLSearchParams(window.location.search);
  const shortcut = params.get('shortcut');
  if (shortcut === 'search') {
    setTimeout(function() {
      const el = document.getElementById('searchSection');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  } else if (shortcut === 'bookmarks') {
    setTimeout(function() {
      const el = document.getElementById('bookmarksSection');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }
})();

// ---- Search Input Enter Key ----

const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchTech();
    }
  });
}

// ---- Smooth Scroll ----

document.documentElement.style.scrollBehavior = 'smooth';

// ---- Initialization ----

document.addEventListener('DOMContentLoaded', function() {
  loadDevNews();
  loadGithubTrending();
  loadHackerNews();
  loadAINews();
  loadSecurityNews();
  loadBookmarks();
  loadAnalytics();
  updateRefreshTime();
});
