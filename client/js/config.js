// ============================================
// DEVINTEL CONFIGURATION
// ============================================

const CONFIG = {
  API_BASE: '',

  CACHE_VERSION: 'v3',
  API_TIMEOUT: 8000,
  CACHE_DURATION: 600000,        // 10 min — client-side localStorage TTL
  AUTO_REFRESH_INTERVAL: 300000, // 5 min — poll for new articles
  MAX_BOOKMARKS: 100,
  DEBOUNCE_DELAY: 200,           // search responsiveness
  NEW_ARTICLE_WINDOW: 7200000,   // 2 h — articles seen within window get NEW badge
  MAX_NOTIFICATIONS: 50,
};
