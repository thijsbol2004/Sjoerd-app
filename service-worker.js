// Simpele service worker: cachet de app-bestanden zodat Sjoerd ook offline
// werkt en op Android als "installeerbaar" wordt herkend.

const CACHE_NAAM = "sjoerd-cache-v2";
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

// Netwerk-eerst: haal bij internet altijd de nieuwste versie op (en werk de
// cache bij), val alleen terug op de cache als er geen verbinding is. Zo loop
// je nooit meer vast op een verouderde versie zolang je online bent.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((netwerkResponse) => {
        const kopie = netwerkResponse.clone();
        caches.open(CACHE_NAAM).then((cache) => cache.put(event.request, kopie));
        return netwerkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
