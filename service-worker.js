const CACHE_NAME = "weather-app-v1";

self.addEventListener("install", (event) => {
    console.log("Service Worker Installed");

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                "/",
                "/index.html",
                "/style.css",
                "/script.js",
                "/icon.png"
            ]);
        })
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});