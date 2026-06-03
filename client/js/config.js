// ============================================
// DEVINTEL CONFIGURATION
// ============================================

const CONFIG = {
  API_BASE: '',

  // ---- Google AdSense ----
  // Replace placeholder strings with real IDs from your AdSense dashboard
  // (https://adsense.google.com/start) after account approval.
  // Publisher ID format: ca-pub-XXXXXXXXXXXXXXXX
  // Ad unit slot IDs: 10-digit numbers from each ad unit you create.
  IAP: {
    PRODUCT_ID: 'remove_ads',   // must match the product ID in Google Play Console
  },

  ADS: {
    ENABLED: true,
    PUBLISHER_ID: 'ca-pub-XXXXXXXXXXXXXXXX',
    BANNER_SLOT: 'XXXXXXXXXX',
    INFEED_SLOT: 'XXXXXXXXXX',
    INFEED_LAYOUT_KEY: '-fb+5w+4e-db+86',
    INTERSTITIAL_SLOT: 'XXXXXXXXXX',
    REWARDED_SLOT: 'XXXXXXXXXX',
    AD_FREQUENCY: 10,
    INTERSTITIAL_THRESHOLD: 5,
    INTERSTITIAL_COOLDOWN: 300000,
    SESSION_GRACE: 30000,
  },

  CACHE_VERSION: 'v3',
  API_TIMEOUT: 8000,
  CACHE_DURATION: 600000,        // 10 min — client-side localStorage TTL
  AUTO_REFRESH_INTERVAL: 300000, // 5 min — poll for new articles
  MAX_BOOKMARKS: 100,
  DEBOUNCE_DELAY: 200,           // search responsiveness
  NEW_ARTICLE_WINDOW: 7200000,   // 2 h — articles seen within window get NEW badge
  MAX_NOTIFICATIONS: 50,
};
