/* Minimal service worker — caches the app shell so it loads even on flaky
   conference Wi-Fi. Bump CACHE_VERSION when you ship a new release. */

const CACHE_VERSION = "ff-v2";
const SHELL = [
  "./",
  "index.html",
  "signup.html",
  "dashboard.html",
  "tasks.html",
  "task.html",
  "connect.html",
  "profile.html",
  "css/styles.css",
  "js/config.js",
  "js/data.js",
  "js/api.js",
  "js/app.js",
  "js/proof.js",
  "manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate for HTML/CSS/JS, network-first for everything else.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const live = fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => cached);
      return cached || live;
    })
  );
});
