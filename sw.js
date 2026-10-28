const CACHE_NAME = "love-os-v9-special-notes";
const APP_FILES = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/assets/icon.svg",
  "/src/app.js?v=9",
  "/src/domain.js?v=9",
  "/src/storage.js?v=9",
  "/src/styles.css?v=9",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES.map((url) => new Request(url, { cache: "reload" })))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((name) => name.startsWith("love-os-") && name !== CACHE_NAME).map((name) => caches.delete(name)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
