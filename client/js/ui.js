// ============================================
// UI HELPERS
// ============================================

function debounce(func, delay) {
  let timeoutId;
  return function () {
    const args = arguments;
    const ctx = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(function () { func.apply(ctx, args); }, delay);
  };
}

function escapeHTML(str) {
  if (str === undefined || str === null) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(str).replace(/[&<>"']/g, function (c) { return map[c]; });
}

function isValidURL(str) {
  try { new URL(str); return true; } catch (_) { return false; }
}

function _bookmarkSet() {
  try {
    const list = JSON.parse(localStorage.getItem('devintelBookmarks')) || [];
    return new Set(list.map(function (b) { return b.url; }));
  } catch (_) { return new Set(); }
}

function isBookmarked(url) {
  return _bookmarkSet().has(url);
}

/**
 * Skeleton loader.
 */
function showSkeleton(containerId, count) {
  count = count || 6;
  const container = document.getElementById(containerId);
  if (!container) return;

  const html = Array(count).fill(0).map(function (_, i) {
    return '<div class="cyber-card skeleton" style="animation-delay:' + (i * 40) + 'ms">' +
      '<div class="skeleton-line" style="height:14px;width:60%;margin-bottom:12px"></div>' +
      '<div class="skeleton-line" style="height:10px;width:100%;margin-bottom:8px"></div>' +
      '<div class="skeleton-line" style="height:10px;width:85%;margin-bottom:8px"></div>' +
      '<div class="skeleton-line" style="height:10px;width:50%"></div>' +
      '</div>';
  }).join('');
  container.innerHTML = html;
}

/**
 * Build an article/repo card.
 * Signature kept stable: (title, description, url, extra, type)
 * `extra` is opaque HTML rendered in the meta row area — used for badges.
 */
function createCard(title, description, url, extra, type) {
  extra = extra || '';
  type = type || 'news';

  if (!isValidURL(url)) return '';

  const safeTitle = escapeHTML(title);
  const safeDesc  = escapeHTML(description || '');
  const safeUrl   = escapeHTML(url);
  const encTitle  = encodeURIComponent(title);
  const encUrl    = encodeURIComponent(url);

  const saved = isBookmarked(url);
  const savedClass = saved ? ' saved' : '';
  const savedLabel = saved ? 'Remove bookmark' : 'Save article';

  return '<article class="cyber-card ' + escapeHTML(type) + '" data-url="' + safeUrl + '">' +
      (extra ? '<div class="meta-row">' + extra + '</div>' : '') +
      '<h3 class="cyber-card-title">' + safeTitle + '</h3>' +
      '<p class="cyber-card-desc">' + safeDesc + '</p>' +
      '<div class="cyber-card-footer">' +
        '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="card-link" aria-label="Read: ' + safeTitle + '">Read →</a>' +
        '<button type="button" class="save-btn' + savedClass + '"' +
          ' data-action="toggle-bookmark"' +
          ' data-url="' + encTitle + '|' + encUrl + '"' +
          ' aria-pressed="' + saved + '"' +
          ' aria-label="' + savedLabel + '" title="' + savedLabel + '">' +
          starSvg(saved) +
        '</button>' +
      '</div>' +
    '</article>';
}

function starSvg(filled) {
  return filled
    ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>'
    : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>';
}

function showError(containerId, message) {
  message = message || 'Failed to load content';
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<div class="empty-state">' +
      '<div class="empty-state-icon">⚠</div>' +
      '<p class="font-medium" style="color: var(--text);">' + escapeHTML(message) + '</p>' +
      '<p class="text-xs mt-1">Couldn\'t reach the feed. The other sections are unaffected.</p>' +
    '</div>';
}

function showEmpty(containerId, message, icon) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML =
    '<div class="empty-state">' +
      '<div class="empty-state-icon">' + (icon || '∅') + '</div>' +
      '<p>' + escapeHTML(message || 'Nothing to show') + '</p>' +
    '</div>';
}

/**
 * Toast notification.
 */
function showNotification(message, type) {
  type = type || 'success';
  const cls = type === 'error' ? 'notification error'
    : type === 'info' ? 'notification info'
    : 'notification success';

  const el = document.createElement('div');
  el.className = cls;
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'polite');
  el.textContent = message;
  document.body.appendChild(el);

  setTimeout(function () {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(function () { el.remove(); }, 260);
  }, 3000);
}

/**
 * Stagger card entry — assumes container.innerHTML was just set with .cyber-card children.
 */
function staggerCards(containerId, step) {
  step = step || 50;
  const container = document.getElementById(containerId);
  if (!container) return;
  const cards = container.querySelectorAll('.cyber-card');
  cards.forEach(function (c, i) {
    c.style.animationDelay = (i * step) + 'ms';
  });
}

/**
 * Update last-sync labels (footer + header).
 */
let _lastSyncTs = Date.now();
function updateRefreshTime() {
  _lastSyncTs = Date.now();
  const t = new Date(_lastSyncTs).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const a = document.getElementById('updateTime');
  if (a) a.textContent = t;
  refreshRelativeLabel();
}

function refreshRelativeLabel() {
  const el = document.getElementById('lastUpdatedRel');
  if (!el) return;
  const sec = Math.max(0, Math.round((Date.now() - _lastSyncTs) / 1000));
  let txt;
  if (sec < 10) txt = 'just now';
  else if (sec < 60) txt = sec + 's ago';
  else if (sec < 3600) txt = Math.floor(sec / 60) + 'm ago';
  else txt = Math.floor(sec / 3600) + 'h ago';
  el.textContent = txt;
}

setInterval(refreshRelativeLabel, 15000);

// CommonJS export — no-op in browser
if (typeof module !== 'undefined') {
  module.exports = {
    debounce, escapeHTML, isValidURL, isBookmarked, starSvg,
    showSkeleton, createCard, showError, showEmpty,
    showNotification, updateRefreshTime, staggerCards,
  };
}
