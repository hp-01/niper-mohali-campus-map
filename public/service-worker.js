self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('my-pwa-cache-v1').then(cache => {
            return cache.addAll([
                '/',
                '/index.html',
                '/static/js/bundle.js',
                // Add paths to other static assets here
            ]);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
