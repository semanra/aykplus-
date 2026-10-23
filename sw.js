// AYK+ çevrimdışı önbellek. Uygulamayı güncellediğinde aşağıdaki sürümü artır (v2, v3...).
const CACHE = 'aykplus-v1';
const FILES = ['./', './index.html', './manifest.json', './icon.png', './icon-192.png', './icon-512.png'];
const TAILWIND = 'https://cdn.tailwindcss.com';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(FILES);
    try { await c.put(TAILWIND, await fetch(TAILWIND, { mode: 'no-cors' })); } catch (_) {}
  }));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Önce internetten dene (güncel kalsın), olmazsa önbellekten aç (çevrimdışı çalışsın).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
