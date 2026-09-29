/* かるた はらい — オフラインでも ひらけるように する service worker
 *
 * ネットに つながる ときは いつも さいしんを とりにいき（ネットワーク ゆうせん）、
 * とれた ものを キャッシュに いれておく。つながらない ときだけ キャッシュを つかう。
 * （キャッシュ ゆうせんに すると、こうしん しても ふるい がめんが でつづけるため）
 */
var CACHE = 'karuta-harai-v1';
var CORE = [
  './', 'index.html', 'ranking.html', 'zukan.html',
  'poems.js', 'scores.js', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      // ?v=… つきでも みつかるように
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined);
      });
    })
  );
});
