const CACHE_NAME = 'petanque-pro-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Pasang Cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Semak dan Kemaskini Cache jika ada perubahan
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Network Intercept (Gunakan cache jika tiada internet)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika ada dalam cache, kembalikan. Jika tidak, ambil dari internet.
        return response || fetch(event.request);
      })
  );
});
