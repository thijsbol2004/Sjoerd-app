// Simpele service worker: cachet de app-bestanden zodat Sjoerd ook offline
// werkt en op Android als "installeerbaar" wordt herkend.

const CACHE_NAAM = "sjoerd-cache-v1";
const BESTANDEN_OM_TE_CACHEN = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAAM).then((cache) => cache.addAll(BESTANDEN_OM_TE_CACHEN))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((namen) =>
      Promise.all(
        namen.filter((naam) => naam !== CACHE_NAAM).map((naam) => caches.delete(naam))
      )
    )
  );
  self.clients.claim();
});

// Cache-first: probeer eerst uit de cache, val anders terug op het netwerk
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((gecached) => gecached || fetch(event.request))
  );
});
