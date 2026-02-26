// sw.js - Service Worker for offline support and PWA caching

const CACHE_NAME = 'limiter-calculator-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // Add any other static assets here if you create separate CSS/JS files later
  // For now we cache the main HTML and root (covers manifest.json, icons, etc.)
];

// Install event: cache core files when the service worker is installed
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Cache addAll failed:', err);
      })
  );
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

// Activate event: clean up old caches
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
  // Take control of the page immediately
  self.clients.claim();
});

// Fetch event: serve from cache first, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the response from cache
        if (response) {
          return response;
        }

        // Clone the request because it's a stream and can only be consumed once
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone again to put in cache
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(() => {
          // Optional: fallback to a custom offline page if desired
          // return caches.match('/offline.html');
          // For now we just let it fail naturally (shows browser offline page)
        });
      })
  );
});