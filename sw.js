/**
 * sw.js
 * Core Service Worker for Etch System PWA
 */

const CACHE_NAME = 'etch-system-v1';
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/js/globals.js',
    '/js/components.js',
    '/js/router.js',
    '/js/ui.js',
    '/manifest.json'
];

// Install Event: Cache core assets
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching core assets');
            return cache.addAll(CORE_ASSETS);
        })
    );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing old cache');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event: Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).catch(() => {
                // Optional: Return a specific offline page here if network fails
                console.error('[Service Worker] Fetch failed, no cache available.');
            });
        })
    );
});