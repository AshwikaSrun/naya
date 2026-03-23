const CACHE_NAME = 'naya-v3';

const PRECACHE_URLS = [
  '/',
  '/icon.svg',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Network-first for API routes and search
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Network-first for HTML navigation (always get fresh pages)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Cache-first for static assets (images, fonts, CSS, JS)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && (
          url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|jpg|jpeg|webp|ico)$/) ||
          url.hostname === 'fonts.googleapis.com' ||
          url.hostname === 'fonts.gstatic.com'
        )) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

// ── Web Push: Purdue deal alerts (and future campaigns) ──
self.addEventListener('push', (event) => {
  let payload = {
    title: 'naya',
    body: 'check this deal — something good just dropped.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'naya-push',
    data: { url: '/' },
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) payload.body = text;
    } catch {
      /* ignore */
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      tag: payload.tag || 'naya-push',
      data: payload.data || { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data && event.notification.data.url;
  const url = typeof rawUrl === 'string' && rawUrl.startsWith('http')
    ? rawUrl
    : `${self.location.origin}${rawUrl && rawUrl.startsWith('/') ? rawUrl : '/campus/purdue'}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const sameOrigin = clientList.find(
        (c) => c.url.startsWith(self.location.origin) && 'focus' in c
      );
      if (sameOrigin && 'navigate' in sameOrigin && typeof sameOrigin.navigate === 'function') {
        return sameOrigin.navigate(url).then(() => sameOrigin.focus()).catch(() => {
          if (self.clients.openWindow) return self.clients.openWindow(url);
        });
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      if (sameOrigin) return sameOrigin.focus();
    })
  );
});
