const CACHE_NAME = 'devintel-v1';
const STATIC_CACHE = 'devintel-static-v1';
const DYNAMIC_CACHE = 'devintel-api-v1';

// Assets to cache on install
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/pwa/manifest.json',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network-first strategy for APIs, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // API calls - network-first with fallback to cache
  if (url.hostname !== location.hostname) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Assets - cache-first with fallback to network
  event.respondWith(cacheFirstStrategy(request));
});

/**
 * Network-first strategy for API calls
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);

    // Only cache successful responses
    if (response.ok && response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    return new Response(
      JSON.stringify({
        error: 'Offline - content from cache',
        message: 'You are offline. Showing cached content.',
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      }
    );
  }
}

/**
 * Cache-first strategy for assets
 */
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok && response.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Return offline fallback
    return new Response('Offline - content not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.delete(DYNAMIC_CACHE).then(() => {
      event.ports[0].postMessage({ cleared: true });
    });
  }
});
