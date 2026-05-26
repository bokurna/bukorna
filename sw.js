/* ================================================
   بخورنا — Service Worker v1
   ================================================ */

const CACHE = 'bukorna-v1';

const PRECACHE_URLS = [
  '/index.html',
  '/products.html',
  '/track.html',
  '/auth.html',
  '/manifest.json'
];

/* تثبيت — حفظ الصفحات مسبقاً */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(PRECACHE_URLS.map(u => c.add(u)))
    )
  );
  self.skipWaiting();
});

/* تفعيل — حذف الكاش القديم */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* الطلبات */
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  /* تجاهل Supabase وواتساب — دائماً شبكة */
  if (req.method !== 'GET' ||
      url.hostname.includes('supabase.co') ||
      url.hostname.includes('wa.me')) return;

  /* الخطوط وصور GitHub — Cache First */
  if (url.hostname.includes('fonts.g') ||
      url.hostname.includes('raw.githubusercontent.com') ||
      url.hostname.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  /* صفحات HTML — Network First */
  if (req.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  /* باقي الأصول — Stale While Revalidate */
  e.respondWith(
    caches.match(req).then(cached => {
      const fresh = fetch(req).then(res => {
        caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      });
      return cached || fresh;
    })
  );
});
