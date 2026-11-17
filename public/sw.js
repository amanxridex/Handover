const CACHE_NAME = 'handover-pwa-__SW_CACHE_VERSION__';
const PRECACHE_ASSETS = [
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const p = event.data.payload || {};
    event.waitUntil(
      self.registration.showNotification(p.title || 'Handover', {
        body: p.body || 'New activity on Handover',
        icon: p.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: p.tag || `handover-${Date.now()}`,
        renotify: true,
        vibrate: [120, 60, 120],
        data: { url: p.url || '/notifications' },
      })
    );
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : 'New notification on Handover' };
  }

  const title = payload.title || 'Handover';
  const options = {
    body: payload.body || 'You have new activity',
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || `handover-push-${Date.now()}`,
    renotify: true,
    vibrate: [120, 60, 120],
    data: { url: payload.url || '/notifications' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = event.notification?.data?.url || '/notifications';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'NAVIGATE_TO', url: targetPath });
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetPath);
        }
      })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never serve stale sw.js
  if (url.pathname === '/sw.js') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Network-first for HTML navigations so deployed updates arrive automatically
  if (event.request.mode === 'navigate' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          }
          return response;
        })
        .catch(async () => (await caches.match('/index.html')) || Response.error())
    );
    return;
  }

  // Content-hashed bundle assets can safely be served cache-first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Network-first fallback for icons/manifest so branding updates propagate
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => (await caches.match(event.request)) || Response.error())
  );
});
