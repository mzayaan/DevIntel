// ============================================
// UI HELPERS — DOM manipulation utilities
// Depends on: nothing (pure DOM + vanilla JS)
// ============================================

/**
 * Debounce — rate-limit repeated calls
 */
function debounce(func, delay) {
  let timeoutId;
  return function() {
    const args = arguments;
    const ctx = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(function() { func.apply(ctx, args); }, delay);
  };
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHTML(str) {
  if (str === undefined || str === null) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(str).replace(/[&<>"']/g, function(char) { return map[char]; });
}

/**
 * Validate URL safely
 */
function isValidURL(str) {
  try {
    new URL(str);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Show animated loading skeleton cards
 */
function showSkeleton(containerId, count) {
  count = count || 6;
  const container = document.getElementById(containerId);
  if (!container) return;

  const skeletons = Array(count).fill(0).map(function() {
    return '<div class="cyber-card skeleton dark:bg-slate-700">' +
      '<div class="h-6 w-3/4 mb-4 rounded bg-slate-300 dark:bg-slate-600"></div>' +
      '<div class="h-4 w-full mb-2 rounded bg-slate-200 dark:bg-slate-500"></div>' +
      '<div class="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-500"></div>' +
      '</div>';
  }).join('');

  container.innerHTML = skeletons;
}

/**
 * Create a cyberpunk article/repo card
 */
function createCard(title, description, url, extra, type) {
  extra = extra || '';
  type = type || 'news';

  if (!isValidURL(url)) {
    return '';
  }

  const safeTitle = escapeHTML(title);
  const safeDescription = escapeHTML(description || '');
  const safeUrl = escapeHTML(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  return '<article class="cyber-card ' + type + '">' +
    '<h3 class="cyber-card-title text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300">' +
      safeTitle +
    '</h3>' +
    '<p class="cyber-card-desc">' + safeDescription + '</p>' +
    extra +
    '<div class="cyber-card-footer gap-3">' +
      '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer"' +
        ' class="flex-1 text-sm text-center py-2 px-3 rounded font-black tracking-wide bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-white transition transform hover:scale-105 active:scale-95 shadow-md"' +
        ' aria-label="Read article: ' + safeTitle + '">VISIT →</a>' +
      '<button onclick="saveBookmark(\'' + encodedTitle + '\',\'' + encodedUrl + '\')"' +
        ' class="px-4 py-2 rounded-lg font-black text-sm tracking-widest bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white transition transform hover:scale-105 active:scale-95 shadow-lg border-2 border-yellow-300"' +
        ' aria-label="Save article: ' + safeTitle + '" title="Save to bookmarks">⭐ SAVE</button>' +
    '</div>' +
    '</article>';
}

/**
 * Show error state in a container
 */
function showError(containerId, message) {
  message = message || 'Failed to load content';
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<div class="col-span-full cyber-card security border-red-400 hover:border-red-600">' +
      '<p class="font-black text-red-700 dark:text-red-400 mb-2">⚠️ ERROR</p>' +
      '<p class="text-red-600 dark:text-red-400 font-semibold">' + escapeHTML(message) + '</p>' +
      '<p class="text-sm text-red-500 mt-2">Check your connection and try again.</p>' +
    '</div>';
}

/**
 * Show toast notification
 */
function showNotification(message, type) {
  type = type || 'success';
  const notification = document.createElement('div');
  const typeClass = type === 'error' ? 'notification error'
    : type === 'info' ? 'notification info'
    : 'notification success';

  notification.className = typeClass;
  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', 'polite');
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(function() {
    notification.style.transition = 'opacity 0.3s ease-out';
    notification.style.opacity = '0';
    setTimeout(function() { notification.remove(); }, 300);
  }, 3000);
}

/**
 * Update the "last sync" timestamp in the footer
 */
function updateRefreshTime() {
  const element = document.getElementById('updateTime');
  if (!element) return;
  element.textContent = new Date().toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// CommonJS export for testing (no-op in browser)
if (typeof module !== 'undefined') {
  module.exports = { debounce, escapeHTML, isValidURL, showSkeleton, createCard, showError, showNotification, updateRefreshTime };
}
