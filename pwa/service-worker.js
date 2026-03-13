const CACHE_NAME = "devintel-cache-v1";

const urlsToCache = [
"/",
"/index.html",
"/js/app.js",
"/pwa/manifest.json"
];

self.addEventListener("install", event => {

event.waitUntil(

caches.open(CACHE_NAME)
.then(cache => cache.addAll(urlsToCache))

);

});

self.addEventListener("fetch", event => {

event.respondWith(

caches.match(event.request)
.then(response => {

if (response) return response;

return fetch(event.request)
.then(networkResponse => {

return caches.open(CACHE_NAME)
.then(cache => {

cache.put(event.request, networkResponse.clone());

return networkResponse;

});

});

})

);

});