// Eenvoudige service worker: app-bestanden offline beschikbaar, data altijd live.
const PREFIX = 'rooster-' + new URL(self.registration.scope).pathname + '-';
const CACHE = PREFIX + 'v103';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'config.js', 'icon-192-v3.png', 'brand/lilou-wordmark-rood.png', 'brand/lilou-wordmark-creme.png', 'manifest.webmanifest', 'vendor/fonts.css', 'vendor/supabase.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && (k.startsWith(PREFIX) || /^rooster-v\d+$/.test(k))).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API-verkeer niet cachen
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })   // altijd de nieuwste versie van de server; de cache alleen als er geen verbinding is
      .then(res => { if (res.ok && !url.searchParams.has('check')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});

// ---------- Pushmeldingen ----------
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'Rooster', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Rooster', {
    body: d.body || '',
    icon: 'icon-192-v3.png',
    badge: 'icon-192-v3.png',
    tag: d.id || undefined,
    data: { view: d.view || '' },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const view = (e.notification.data && e.notification.data.view) || '';
  const url = new URL('./' + (view ? '#' + view : ''), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.postMessage({ type: 'open', view }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
