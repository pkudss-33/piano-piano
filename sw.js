var CACHE = "wind-down-v2";
var ASSETS = [
  "/",
  "/index.html",
  "/css/variables.css",
  "/css/base.css",
  "/css/screens.css",
  "/js/state.js",
  "/js/screens.js",
  "/js/app.js",
  "/js/routine.js",
  "/js/worry-drop.js",
  "/js/sounds.js",
  "/js/settings.js",
  "/manifest.json",
];

self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("fetch", function(e) {
  e.respondWith(
    caches.match(e.request).then(function(response) {
      return response || fetch(e.request);
    })
  );
});
