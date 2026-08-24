/* Petanque Referee Pro - Service Worker */
const CACHE = "petanque-ref-pro-v12";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled(ASSETS.map((a) => cache.add(new Request(a, { cache: "reload" }))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.allSettled(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Navigations: network first, fall back to cached shell (offline support).
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put("./index.html", fresh.clone());
          return fresh;
        } catch (e) {
          const cache = await caches.open(CACHE);
          return (await cache.match("./index.html")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Fail teras app (html/js/json/css): network first supaya sentiasa terkini.
  const url = new URL(req.url);
  const isCore =
    url.origin === self.location.origin &&
    /\.(html|js|json|css)$/.test(url.pathname);
  if (isCore) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const fresh = await fetch(req, { cache: "no-store" });
          if (fresh && fresh.ok) cache.put(req, fresh.clone());
          return fresh;
        } catch (e) {
          return (await cache.match(req)) || Response.error();
        }
      })(),
    );
    return;
  }

  // Lain-lain GET (imej/font/CDN): cache first, then network.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
        return res;
      } catch (e) {
        return Response.error();
      }
    })(),
  );
});
