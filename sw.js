/* Petanque Referee Pro - Service Worker (offline penuh) */
const CACHE = "petanque-ref-pro-v11";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png",
  "./vendor/opencv.js",
  "./vendor/qrcode.js",
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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Navigations: cache first for instant offline start, refresh in background.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match("./index.html");
        const network = fetch(req)
          .then((fresh) => {
            cache.put("./index.html", fresh.clone());
            return fresh;
          })
          .catch(() => null);
        return cached || (await network) || Response.error();
      })(),
    );
    return;
  }

  // Other GETs: cache first, then network (stores same-origin + CDN/font responses).
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
