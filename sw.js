// AYK+ çevrimdışı önbellek. Uygulamayı güncellediğinde aşağıdaki sürümü artır (v4, v5...).
const CACHE = 'aykplus-v36';
const FILES = ['./', './index.html', './manifest.json', './icon.png', './icon-192.png', './icon-512.png', './anatomy.jpg', './vendor/zxing.min.js', './foods.js'];
// İnternet bu süre içinde yanıt vermezse (spor salonunda zayıf sinyal) önbellekteki kopya açılır.
const NET_TIMEOUT_MS = 3000;
// Bir istek zaman aşımına uğrar ya da internet yoksa, sonraki 30 sn boyunca dosyalar beklemeden önbellekten verilir
// (sayfa + foods.js için ayrı ayrı 3'er sn beklenmesin). İnternet yanıtı yine arka planda önbelleği günceller.
const SLOW_WINDOW_MS = 30000;
let netSlowUntil = 0;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// v25: Önce internetten dene (güncel kalsın). Şu durumlarda önbellekteki kopya açılır:
//  - internet yok,
//  - sunucu hata döndürdü (404 / 5xx; örn. GitHub Pages kapalı),
//  - 3 saniyede yanıt gelmedi (yanıt sonradan gelirse önbellek arka planda güncellenir).
// index.html yedeği yalnızca sayfa açılışında kullanılır (foods.js gibi dosyalara HTML dönmez).
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  const isPage = req.mode === 'navigate';
  const fromCache = () => caches.match(req, { ignoreSearch: true })
    .then(r => r || (isPage ? caches.match('./index.html') : undefined));

  const net = fetch(req).then(res => {
    if (res && res.ok) {
      const copy = res.clone();
      e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}));
    }
    return res;
  });
  // Ağ isteği zaman aşımından sonra da sürer; tamamlanana kadar service worker kapanmasın.
  e.waitUntil(net.then(() => {}, () => {}));

  e.respondWith(new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done && r) { done = true; resolve(r); } };
    const fallback = res => fromCache().then(r => {
      if (r) finish(r);
      else finish(res || Response.error());
    });
    const wait = Date.now() < netSlowUntil ? 0 : NET_TIMEOUT_MS;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (wait) netSlowUntil = Date.now() + SLOW_WINDOW_MS;
      fromCache().then(r => finish(r));   // önbellekte yoksa ağı beklemeye devam et
    }, wait);
    net.then(res => {
      clearTimeout(timer);
      if (res && wait && !timedOut) netSlowUntil = 0;   // zamanında yanıt geldi: internet iyi
      if (res && (res.ok || res.type === 'opaqueredirect')) finish(res);   // yönlendirme hata değildir
      else fallback(res);                 // 404 / 5xx → önbellek; o da yoksa sunucunun yanıtı
    }, () => {
      clearTimeout(timer);
      netSlowUntil = Date.now() + SLOW_WINDOW_MS;
      fallback(null);                      // internet yok → önbellek; o da yoksa ağ hatası
    });
  }));
});
