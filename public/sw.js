// Service Worker - Tecno System Service Desk PWA
const CACHE_NAME = 'tecnodesk-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-tecnosystem.png',
  '/logo-tecnosystem.svg',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignora requisições de API/Supabase (devem ser sempre online e dinâmicas)
  if (
    event.request.url.includes('/rest/v1') ||
    event.request.url.includes('/auth/v1') ||
    event.request.url.includes('/storage/v1') ||
    event.request.url.includes('/functions/v1') ||
    event.request.url.includes(':54321')
  ) {
    return;
  }

  // Cache First para assets estáticos, Network First para navegações
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback offline se tentar acessar documento
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
