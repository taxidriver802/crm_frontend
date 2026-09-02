const CACHE_NAME = "crm-v2";

function canCache(request, response) {
  if (request.method !== "GET" || !response.ok) return false;
  if (new URL(request.url).origin !== self.location.origin) return false;

  const cacheControl = response.headers.get("Cache-Control") || "";
  if (cacheControl.includes("no-store") || cacheControl.includes("private")) {
    return false;
  }

  const dest = request.destination;
  return dest === "script" || dest === "style" || dest === "image" || dest === "font";
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim())
      .catch(() => {}),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/uploads")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (canCache(event.request, response)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
