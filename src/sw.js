// Offline support: cache the app shell, try the network first for the page so updates arrive,
// but fall back to the cached page after a few seconds on a bad connection.
const CACHE = 'twominds-__VERSION__';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const good = res => res && res.ok && !res.redirected && res.type === 'basic';
function withTimeout(p, ms){ return new Promise((ok, bad) => { const t = setTimeout(() => bad(new Error('slow')), ms); p.then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); bad(e); }); }); }
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate'){
    const net = fetch(req).then(res => { if (good(res)){ const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); } return res; });
    e.respondWith(withTimeout(net, 4000).catch(() => caches.match('./index.html').then(hit => hit || net)));
    return;
  }
  if (url.origin === location.origin || url.host.endsWith('gstatic.com') || url.host.endsWith('googleapis.com')){
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (good(res) || (res.type === 'opaque' && url.origin !== location.origin) || (res.ok && res.type === 'cors')){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
