/* ゆうびん はいたつ — みちさがし（BFS）と くばる じゅんばんの さいたん。DOM なし。 */
(function (root) {
  "use strict";
  const Town = typeof module !== "undefined" && module.exports ? require("./town.js") : root.YHTown;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  /* from から みちを つかって ぜんぶの マスまでの きょり（とどかない ＝ -1） */
  function bfs(t, from) {
    const N = t.W * t.H, dist = new Int32Array(N).fill(-1), prev = new Int32Array(N).fill(-1);
    const s = from.y * t.W + from.x;
    if (!t.road[s]) return { dist, prev };
    const q = new Int32Array(N); let h = 0, e = 0;
    q[e++] = s; dist[s] = 0;
    while (h < e) {
      const c = q[h++], x = c % t.W, y = (c / t.W) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= t.W || ny >= t.H) continue;
        const k = ny * t.W + nx;
        if (t.road[k] && dist[k] < 0) { dist[k] = dist[c] + 1; prev[k] = c; q[e++] = k; }
      }
    }
    return { dist, prev };
  }

  const memo = new WeakMap();
  function bfsMemo(t, p) {
    let m = memo.get(t); if (!m) { m = {}; memo.set(t, m); }
    const k = p.y * t.W + p.x;
    return m[k] || (m[k] = bfs(t, p));
  }
  function dist(t, a, b) { return bfsMemo(t, a).dist[b.y * t.W + b.x]; }

  /* a → b の マスの ならび（a も b も ふくむ） */
  function path(t, a, b) {
    const { prev, dist: d } = bfsMemo(t, a);
    let k = b.y * t.W + b.x;
    if (d[k] < 0) return null;
    const out = [];
    while (k >= 0) { out.push({ x: k % t.W, y: (k / t.W) | 0 }); k = prev[k]; }
    return out.reverse();
  }

  /* start → stops を ある じゅんばんで → end の ながさ */
  function routeLength(t, start, stops, end) {
    let len = 0, cur = start;
    for (const s of stops) { len += dist(t, cur, s); cur = s; }
    if (end) len += dist(t, cur, end);
    return len;
  }

  /* いちばん みじかい じゅんばん（ぜんぶ ためす。えだかり つき で こたえは かわらない） */
  function bestOrder(t, start, stops, end) {
    const n = stops.length;
    const pts = [start].concat(stops);
    const D = pts.map((a) => pts.map((b) => dist(t, a, b)));
    const toEnd = pts.map((a) => (end ? dist(t, a, end) : 0));
    let best = Infinity, bestSeq = [];
    const used = new Array(n).fill(false), seq = [];
    (function go(cur, len) {
      if (len >= best) return;
      if (seq.length === n) {
        const total = len + toEnd[cur];
        if (total < best) { best = total; bestSeq = seq.slice(); }
        return;
      }
      for (let i = 0; i < n; i++) {
        if (used[i]) continue;
        used[i] = true; seq.push(i);
        go(i + 1, len + D[cur][i + 1]);
        seq.pop(); used[i] = false;
      }
    })(0, 0);
    return { order: bestSeq, length: best };
  }

  /* じゅんばん どおりに はしる ときの マスの ならび */
  function fullPath(t, start, stops, end) {
    const out = [start];
    let cur = start;
    for (const s of stops.concat(end ? [end] : [])) {
      const p = path(t, cur, s);
      out.push(...p.slice(1)); cur = s;
    }
    return out;
  }

  const api = { bfs, dist, path, routeLength, bestOrder, fullPath };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.YHRoute = api;
  void Town;
})(typeof window !== "undefined" ? window : globalThis);
