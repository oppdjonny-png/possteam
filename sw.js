const CACHE_NAME = 'jann-pos-shell-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/jann-logo.png',
  '/assets/jann-logo.jpeg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Delete any old caches that don't match current CACHE_NAME
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
          return Promise.resolve();
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // For navigation requests prefer network then fallback to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        // update navigation request in cache
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other requests, try cache first then network, and cache GET responses
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (req.method === 'GET' && res && res.status === 200 && req.url.startsWith(self.location.origin)) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      }
      return res;
    }).catch(() => caches.match('/index.html')))
  );
});

// Allow the page to message the SW to skipWaiting (useful when new SW is installed)
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data === 'SKIP_WAITING' || event.data.type === 'SKIP_WAITING') {      
    self.skipWaiting();
  }
});
