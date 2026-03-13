self.addEventListener("install", event => {
console.log("DevIntel Service Worker Installed");
});

self.addEventListener("fetch", event => {
event.respondWith(fetch(event.request));
});