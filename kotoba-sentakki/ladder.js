/* ことばの せんたくき の けいさん（画面に かんけい ない ぶぶん。test.js からも つかう）
 *   Ladder.build(WORDS)        … じしょ と「1もじ ちがい」の グラフ
 *   Ladder.diffIndex(a, b)     … 1もじ だけ ちがえば その ばしょ、ちがわなければ -1
 *   Ladder.bfs(g, from)        … さいたん てすう（dist）と もどりみち（prev）
 *   Ladder.path(g, a, b)       … さいたん の みちすじ（えもじ つきの ことばを ゆうせん）
 *   Ladder.nextStep(g, cur, goal) … ヒント: つぎに なる ことば と かえる ばしょ・もじ
 */
var Ladder = (function () {
  'use strict';
  function chars(w) { return Array.from(w); }

  function diffIndex(a, b) {
    var x = chars(a), y = chars(b);
    if (x.length !== y.length) return -1;
    var at = -1;
    for (var i = 0; i < x.length; i++) {
      if (x[i] !== y[i]) {
        if (at >= 0) return -1;
        at = i;
      }
    }
    return at;
  }

  function build(words) {
    var emoji = {}, byLen = {}, nb = {};
    words.forEach(function (e) {
      emoji[e[0]] = e[1] || '';
      var n = chars(e[0]).length;
      (byLen[n] = byLen[n] || []).push(e[0]);
      nb[e[0]] = [];
    });
    Object.keys(byLen).forEach(function (n) {
      var buckets = {};
      byLen[n].forEach(function (w) {
        var c = chars(w);
        for (var i = 0; i < c.length; i++) {
          var k = c.slice(0, i).join('') + '*' + c.slice(i + 1).join('');
          (buckets[k] = buckets[k] || []).push(w);
        }
      });
      Object.keys(buckets).forEach(function (k) {
        var g = buckets[k];
        g.forEach(function (a) { g.forEach(function (b) { if (a !== b) nb[a].push(b); }); });
      });
    });
    return { emoji: emoji, byLen: byLen, nb: nb, has: function (w) { return Object.prototype.hasOwnProperty.call(emoji, w); } };
  }

  function bfs(g, from) {
    var dist = {}, prev = {}, q = [from], h = 0;
    dist[from] = 0;
    while (h < q.length) {
      var a = q[h++];
      // えもじ つきの ことばを さきに たどる（みちすじが わかりやすく なる）
      var list = g.nb[a].slice().sort(function (x, y) { return (g.emoji[y] ? 1 : 0) - (g.emoji[x] ? 1 : 0); });
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (!(b in dist)) { dist[b] = dist[a] + 1; prev[b] = a; q.push(b); }
      }
    }
    return { dist: dist, prev: prev };
  }

  function path(g, a, b) {
    var r = bfs(g, b); // ゴール がわ から → prev を たどると a → b の じゅん
    if (!(a in r.dist)) return null;
    var out = [a];
    while (out[out.length - 1] !== b) out.push(r.prev[out[out.length - 1]]);
    return out;
  }

  var cache = {};
  function nextStep(g, cur, goal) {
    if (cur === goal) return null;
    var d = cache[goal] || (cache[goal] = bfs(g, goal).dist);
    if (!(cur in d)) return null;
    var best = null;
    g.nb[cur].forEach(function (b) {
      if (d[b] === d[cur] - 1 && (!best || (!g.emoji[best] && g.emoji[b]))) best = b;
    });
    if (!best) return null;
    var i = diffIndex(cur, best);
    return { word: best, index: i, ch: chars(best)[i], left: d[cur] };
  }

  return { chars: chars, diffIndex: diffIndex, build: build, bfs: bfs, path: path, nextStep: nextStep };
})();
if (typeof module !== 'undefined') module.exports = Ladder;
