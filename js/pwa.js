/**
 * pwa.js
 * Handles Service Worker registration and dynamic PWA manifest injection
 * Bypasses strict static uploader limits by generating the manifest in-memory.
 */

const PWAManager = {
    init: function() {
        this.injectManifest();
        this.registerServiceWorker();
    },

    injectManifest: function() {
        // 1. Define the manifest as a standard JS object
        const manifestData = {
            "name": "Etch System",
            "short_name": "Etch",
            "description": "Etch Signage Project and Ledger Management System",
            "start_url": "/",
            "display": "standalone",
            "background_color": "#f3f4f6",
            "theme_color": "#4338ca",
            "orientation": "portrait-primary",
            "icons": [
                {
                    "src": "https://www.etchsignage.com/icon-192x192.png",
                    "sizes": "192x192",
                    "type": "image/png",
                    "purpose": "any maskable"
                },
                {
                    "src": "https://www.etchsignage.com/icon-512x512.png",
                    "sizes": "512x512",
                    "type": "image/png",
                    "purpose": "any maskable"
                }
            ]
        };

        // 2. Convert to a JSON string and create a Blob
        const manifestString = JSON.stringify(manifestData);
        const blob = new Blob([manifestString], { type: 'application/manifest+json' });
        
        // 3. Create an object URL in the browser's memory
        const manifestUrl = URL.createObjectURL(blob);

        // 4. Create the <link> tag and inject it into the <head>
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = manifestUrl;
        
        // We append it before other scripts just to be safe
        document.head.appendChild(link);
        console.log('[PWA] Dynamic manifest injected successfully.');
    },

    registerServiceWorker: function() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                // Ensure your sw.js is uploaded as a static JS file!
                navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                        console.log('[PWA] ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch((err) => {
                        console.error('[PWA] ServiceWorker registration failed: ', err);
                    });
            });
        } else {
            console.warn('[PWA] Service workers are not supported by this browser.');
        }
    }
};

// Initialize immediately
PWAManager.init();