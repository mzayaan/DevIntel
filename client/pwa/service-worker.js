const STATIC_CACHE = 'devintel-static-v10';
const DYNAMIC_CACHE = 'devintel-api-v10';
const ALL_CACHES = [STATIC_CACHE, DYNAMIC_CACHE];

const urlsToCache = [
  '/',
  '/manifest.json',
  '/css/styles.css',
  '/js/config.js',
  '/js/vendor/anime.min.js',
  '/js/api.js',
  '/js/ui.js',
  '/js/app.js',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
];

// Install — pre-cache shell assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function(cache) { return cache.addAll(urlsToCache); })
      .then(function() { return self.skipWaiting(); })
      .catch(function(err) { console.warn('SW install failed:', err); })
  );
});

// Activate — clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return !ALL_CACHES.includes(name); })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// Fetch — API calls: network-first; assets: cache-first
self.addEventListener('fetch', function(event) {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Same-origin API calls → network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Everything else (assets, pages) → cache-first
  event.respondWith(cacheFirstStrategy(request));
});

async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: true, message: 'Offline — no cached data available' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return new Response('Offline — content not available', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Message handler
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(DYNAMIC_CACHE).then(function() {
      if (event.ports[0]) event.ports[0].postMessage({ cleared: true });
    });
  }
});
