const CACHE_NAME = "crm-v5";
const OFFLINE_URL = "/offline.html";

function isRscRequest(request, url) {
  if (url.searchParams.has("_rsc")) return true;
  if (request.headers.get("RSC")) return true;
  if (request.headers.get("Next-Router-Prefetch")) return true;
  if (request.headers.get("Next-Router-State-Tree")) return true;
  return false;
}

function shouldBypass(request, url) {
  if (request.method !== "GET") return true;
  if (url.origin !== self.location.origin) return true;
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/uploads") ||
    url.pathname === "/public" ||
    url.pathname.startsWith("/public/")
  ) {
    return true;
  }
  return isRscRequest(request, url);
}

function canCache(request, response) {
  if (!response || !response.ok) return false;
  const cacheControl = response.headers.get("Cache-Control") || "";
  if (cacheControl.includes("no-store") || cacheControl.includes("private")) {
    return false;
  }
  const dest = request.destination;
  return dest === "script" || dest === "style" || dest === "image" || dest === "font";
}

async function networkThenCache(request) {
  try {
    const response = await fetch(request);
    if (canCache(request, response)) {
      const copy = response.clone();
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.put(request, copy))
        .catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error("offline");
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
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
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (shouldBypass(event.request, url)) return;

  const dest = event.request.destination;
  if (dest === "script" || dest === "style" || dest === "image" || dest === "font") {
    event.respondWith(networkThenCache(event.request));
    return;
  }

  if (event.request.mode === "navigate" || dest === "document") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const offline = await caches.match(OFFLINE_URL);
        return offline || Response.error();
      }),
    );
  }
});
