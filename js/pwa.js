// ==========================================================
// PWA.JS
// Domain: Progressive Web App Manifest & Service Worker
// ==========================================================

const PWAManager = {
    init() {
        this.injectManifest();
        this.registerServiceWorker();
        this.setupInstallPrompt();
    },

    injectManifest() {
        const manifest = {
            name: "Etch Portal",
            short_name: "Etch",
            description: "Etch Signage Internal Portal",
            start_url: "/",
            display: "standalone",
            background_color: "#ffffff",
            theme_color: "#4f46e5",
            icons: [
                {
                    src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzRmNDZlNSI+PHBhdGggZD0iTTEyIDJMMiAxMmwzIDloMTRsMy05eiIvPjwvc3ZnPg==",
                    sizes: "192x192",
                    type: "image/svg+xml",
                    purpose: "any maskable"
                }
            ]
        };

        const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
        const manifestURL = URL.createObjectURL(blob);
        
        let link = document.querySelector('link[rel="manifest"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'manifest';
            document.head.appendChild(link);
        }
        link.href = manifestURL;
    },

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            // Dynamically generate the service worker code to satisfy static deploy constraints
            const swCode = `
                const CACHE_NAME = 'etch-portal-v2';
                const ASSETS = [
                    './',
                    './index.html',
                    './styles.css',
                    './js/router.js',
                    './js/globals.js',
                    './js/components.js',
                    './js/ui.js',
                    './js/dashboard.js',
                    './js/project.js',
                    './js/ledger.js',
                    './js/quotation-form.js',
                    './js/quotation-history.js',
                    './js/quotation_pdf.js',
                    './js/soa_pdf.js',
                    './js/customer.js',
                    './js/pwa.js',
                    './js/privacy.js'
                ];

                self.addEventListener('install', (event) => {
                    self.skipWaiting();
                    event.waitUntil(
                        caches.open(CACHE_NAME).then(async (cache) => {
                            // Using a loop with try/catch bypasses the 'addAll' TypeError
                            // by ensuring one missing file doesn't crash the entire caching process.
                            for (let url of ASSETS) {
                                try {
                                    const req = new Request(url, { cache: 'reload' });
                                    await cache.add(req);
                                } catch (err) {
                                    console.warn('PWA SW: Failed to cache asset - ' + url, err);
                                }
                            }
                        })
                    );
                });

                self.addEventListener('activate', (event) => {
                    event.waitUntil(
                        caches.keys().then((keyList) => {
                            return Promise.all(keyList.map((key) => {
                                if (key !== CACHE_NAME) {
                                    return caches.delete(key);
                                }
                            }));
                        })
                    );
                    self.clients.claim();
                });

                self.addEventListener('fetch', (event) => {
                    if (event.request.method !== 'GET') return;
                    
                    // Network first, falling back to cache
                    event.respondWith(
                        fetch(event.request).then((networkResponse) => {
                            return caches.open(CACHE_NAME).then((cache) => {
                                if (event.request.url.startsWith(self.location.origin)) {
                                    cache.put(event.request, networkResponse.clone());
                                }
                                return networkResponse;
                            });
                        }).catch(() => caches.match(event.request))
                    );
                });
            `;

            const blob = new Blob([swCode], { type: 'application/javascript' });
            const swUrl = URL.createObjectURL(blob);

            window.addEventListener('load', () => {
                navigator.serviceWorker.register(swUrl)
                    .then(reg => console.log('Service Worker registered successfully'))
                    .catch(err => console.error('Service Worker registration failed: ', err));
            });
        }
    },

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            window._deferredInstallPrompt = e;
        });
    }
};

PWAManager.init();
