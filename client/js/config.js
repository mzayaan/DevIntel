// ============================================
// DEVINTEL CONFIGURATION
// ============================================

const CONFIG = {
  // API base URL — empty string = same origin (production via Express server)
  // Override to 'http://localhost:3000' if running client separately from server
  API_BASE: '',

  API_TIMEOUT: 8000,
  CACHE_DURATION: 600000, // 10 minutes (client-side localStorage TTL)
  AUTO_REFRESH_INTERVAL: 1800000, // 30 minutes
  MAX_BOOKMARKS: 100,
  DEBOUNCE_DELAY: 500,
};
