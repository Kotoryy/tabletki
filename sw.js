// Кэш для работы без интернета: сначала сеть (чтобы получать обновления), при её отсутствии — кэш.
// Плюс показ напоминаний, которые присылает сервер.
const CACHE = 'pills-v4';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  // Запросы к серверу списка не кэшируем — только файлы самого сайта
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});

self.addEventListener('push', e => {
  let msg = {};
  try { msg = e.data ? e.data.json() : {}; } catch {}
  e.waitUntil(self.registration.showNotification(msg.title || 'Пора принять лекарство', {
    body: msg.body || '',
    tag: msg.tag || 'pills',
    icon: 'icon-180.png',
    badge: 'icon-180.png',
    renotify: true,
    requireInteraction: true,
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      c.postMessage('open-today');
      if ('focus' in c) return c.focus();
    }
    return self.clients.openWindow('./');
  })());
});
