// Guarda la app en el celular: si la señal se cae, se puede volver a abrir.
const CACHE = 'genui-live-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('message', (e) => {
  const urls = e.data?.guardar;
  if (Array.isArray(urls)) e.waitUntil(caches.open(CACHE).then((c) => Promise.all(urls.map((u) => c.add(u).catch(() => undefined)))));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    // Siempre la versión más reciente; la guardada solo si no hay red.
    e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put('/live/', copia)); return r; }).catch(() => caches.match('/live/')));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/brand/')) {
    e.respondWith(caches.match(e.request).then((g) => g || fetch(e.request).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; })));
  }
});
