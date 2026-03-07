/**
 * sw.js — Service Worker
 * ──────────────────────
 * IMPORTANTE: Cambia el número de versión del CACHE
 * cada vez que publiques una actualización de la app.
 * Eso fuerza a los usuarios a descargar la versión nueva.
 */

const CACHE = 'zonas-bilbao-v6.1.0'; // ← actualiza esto en cada deploy

const ASSETS = [
    './index.html',
    './manifest.json',
    './css/styles.css',
    './js/data.js',
    './js/app.js',
    './assets/bilbo.jpg',
    './assets/images.png',
    './assets/icono192x192.png',
    './assets/icono512x512.png',
    'https://cdn.sheetjs.com/xlsx-0.19.3/package/dist/xlsx.full.min.js',
    'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap',
];

// Instalar: precachear todos los assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activar: limpiar cachés viejas
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// Fetch: cache-first
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cached => cached || fetch(event.request))
    );
});