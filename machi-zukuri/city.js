/* ============================================================
   まちづくり — まち の データ（マス目）
   ・マス ごとに base（0 くさ / 1 かわ）・road・rail・obj（data.js の OBJ の ばんごう）。
   ・みち と せんろ は となりどうし で つながる（かど・こうさてん・ふみきり は じどう）。
   ・かわ の うえ の みち は はし、せんろ は てっきょう。
   ・けいろ は「しせつ から の きょり の ちず」（BFS）を つくって さかのぼる。
   ・node でも よめる（ためし の スクリプト から require する）。
   ============================================================ */
(function (root) {
  "use strict";

  var D = (typeof module !== "undefined" && module.exports) ? require("./data.js") : root.MACHI_DATA;
  var O = D.OBJ_ID;
  var MAX = 60, STEP = 10;
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // N E S W

  function create(w, h) {
    var n = w * h;
    var c = { w: w, h: h, base: new Uint8Array(n), road: new Uint8Array(n), rail: new Uint8Array(n), obj: new Uint8Array(n),
      ver: 0, fields: {}, byType: {}, happy: null };
    reindex(c);
    return c;
  }

  function nb(c, i, d) {
    var x = i % c.w + DX[d], y = (i / c.w | 0) + DY[d];
    if (x < 0 || y < 0 || x >= c.w || y >= c.h) return -1;
    return y * c.w + x;
  }
  // つながり（N=1 E=2 S=4 W=8）
  function mask(c, layer, i) {
    var m = 0, a = c[layer];
    for (var d = 0; d < 4; d++) { var j = nb(c, i, d); if (j >= 0 && a[j]) m |= 1 << d; }
    return m;
  }

  // ---------- へんしゅう ----------
  function snap(c, i) { return [c.base[i], c.road[i], c.rail[i], c.obj[i]]; }
  function put(c, i, s) { c.base[i] = s[0]; c.road[i] = s[1]; c.rail[i] = s[2]; c.obj[i] = s[3]; }
  function same(a, b) { return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]; }
  var SOFT = { 0: 1 }; SOFT[O.tree] = 1; SOFT[O.field] = 1; // うわがき して よい もの

  // どうぐ を 1マス に つかう。かわったら [i, まえ, あと] を かえす
  function apply(c, tool, i) {
    var s = snap(c, i), t = s.slice();
    var obj = t[3];
    if (tool === "road") {
      if (obj === O.station) return null;
      if (!SOFT[obj]) return null;
      t[1] = 1; t[3] = 0;
    } else if (tool === "rail") {
      if (!SOFT[obj] && obj !== O.station) return null;
      t[2] = 1; if (obj !== O.station) t[3] = 0;
    } else if (tool === "river") {
      if (!SOFT[obj]) return null;
      t[0] = 1; t[3] = 0;
    } else if (tool === "erase") {
      if (obj) t[3] = 0;
      else if (t[1] || t[2]) { t[1] = 0; t[2] = 0; }
      else t[0] = 0;
    } else if (tool === "station") {
      if (t[0] || t[1] || (obj && !SOFT[obj])) return null;
      t[2] = 1; t[3] = O.station;
    } else if (O[tool]) {
      var n = O[tool];
      if (t[1] || t[2]) return null;
      if (t[0]) return null; // かわ には おけない
      t[3] = n;
    } else return null;
    if (same(s, t)) return null;
    put(c, i, t);
    return [i, s, t];
  }
  function revert(c, changes) {
    for (var k = changes.length - 1; k >= 0; k--) put(c, changes[k][0], changes[k][1]);
    changed(c);
  }
  function redo(c, changes) {
    for (var k = 0; k < changes.length; k++) put(c, changes[k][0], changes[k][2]);
    changed(c);
  }

  function changed(c) { c.ver++; c.fields = {}; reindex(c); c.happy = null; }

  function reindex(c) {
    var by = {}, n = c.w * c.h;
    for (var i = 0; i < n; i++) { var o = c.obj[i]; if (o) (by[o] || (by[o] = [])).push(i); }
    c.byType = by;
  }
  function list(c, id) { return c.byType[O[id]] || []; }

  // ---------- けいろ ----------
  // たてもの i の いりぐち（となり の みち）
  function doors(c, i) {
    var out = [];
    if (c.road[i]) out.push(i);
    for (var d = 0; d < 4; d++) { var j = nb(c, i, d); if (j >= 0 && c.road[j]) out.push(j); }
    return out;
  }
  // i へ の みち の きょり（みち の マス だけ。とどかない ところ は -1）
  function field(c, i) {
    var f = c.fields[i];
    if (f) return f;
    var n = c.w * c.h;
    f = new Int16Array(n); f.fill(-1);
    var q = new Int32Array(n), qh = 0, qt = 0;
    doors(c, i).forEach(function (j) { if (f[j] < 0) { f[j] = 0; q[qt++] = j; } });
    while (qh < qt) {
      var a = q[qh++];
      for (var d = 0; d < 4; d++) {
        var b = nb(c, a, d);
        if (b >= 0 && c.road[b] && f[b] < 0) { f[b] = f[a] + 1; q[qt++] = b; }
      }
    }
    c.fields[i] = f;
    return f;
  }
  // from（たてもの）から to（たてもの）へ の みち の マス の ならび。いけなければ null
  function route(c, from, to) {
    var f = field(c, to), best = -1;
    doors(c, from).forEach(function (j) { if (f[j] >= 0 && (best < 0 || f[j] < f[best])) best = j; });
    if (best < 0) return null;
    var path = [best], cur = best, guard = 0;
    while (f[cur] > 0 && guard++ < 4000) {
      var nx = -1, opts = [];
      for (var d = 0; d < 4; d++) { var b = nb(c, cur, d); if (b >= 0 && f[b] === f[cur] - 1) opts.push(b); }
      if (!opts.length) break;
      nx = opts[(cur * 7 + guard) % opts.length];
      path.push(nx); cur = nx;
    }
    return path;
  }
  function roadDist(c, from, to) {
    var f = field(c, to), best = -1;
    doors(c, from).forEach(function (j) { if (f[j] >= 0 && (best < 0 || f[j] < best)) best = f[j]; });
    return best;
  }
  // いちばん ちかい しせつ（みち で）
  function nearest(c, types, from) {
    var best = null;
    types.forEach(function (id) {
      list(c, id).forEach(function (s) {
        var dd = roadDist(c, s, from);
        if (dd >= 0 && (!best || dd < best.d)) best = { i: s, d: dd };
      });
    });
    return best;
  }
  function manhattan(c, a, b) { return Math.abs(a % c.w - b % c.w) + Math.abs((a / c.w | 0) - (b / c.w | 0)); }

  // ---------- にこにこ ----------
  function houseMood(c, i) {
    var res = { score: 0, wish: [], good: [], road: doors(c, i).length > 0 };
    var tot = 0, got = 0;
    D.NEEDS.forEach(function (nd) {
      tot += nd.w;
      var best = 999;
      nd.types.forEach(function (id) { list(c, id).forEach(function (s) { var d = manhattan(c, i, s); if (d < best) best = d; }); });
      if (best <= nd.r) {
        var part = best <= nd.r * 0.6 ? 1 : 0.7;
        got += nd.w * part; res.good.push(nd.good);
      } else res.wish.push(best === 999 ? nd.none : nd.far);
    });
    var sc = got / tot;
    if (!res.road) { sc *= 0.4; res.wish.unshift("みち が なくて でかけられない"); }
    else {
      var st = list(c, "station");
      if (st.length && !st.some(function (s) { return roadDist(c, i, s) >= 0; })) res.wish.unshift("えき まで みち が ない");
    }
    // うるさい・きもちいい
    var noisy = false, green = 0;
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
      var x = i % c.w + dx, y = (i / c.w | 0) + dy;
      if (x < 0 || y < 0 || x >= c.w || y >= c.h) continue;
      var o = c.obj[y * c.w + x];
      if (o === O.factory && Math.abs(dx) + Math.abs(dy) <= 2) noisy = true;
      if (o === O.tree || o === O.park) green++;
    }
    if (noisy) { sc -= 0.15; res.wish.unshift("こうじょう の おと が うるさい"); }
    if (green) { sc += Math.min(0.08, green * 0.03); res.good.push("きが あって きもちいい"); }
    res.score = Math.max(0, Math.min(1, sc));
    return res;
  }
  function happiness(c) {
    if (c.happy) return c.happy;
    var hs = list(c, "house").concat(list(c, "mansion"));
    var sum = 0, wt = 0, moods = {}, wishes = {};
    hs.forEach(function (i) {
      var m = houseMood(c, i), k = c.obj[i] === O.mansion ? 3 : 1;
      moods[i] = m; sum += m.score * k; wt += k;
      m.wish.forEach(function (w) { wishes[w] = (wishes[w] || 0) + k; });
    });
    c.happy = { value: wt ? Math.round(sum / wt * 100) : 0, houses: hs, moods: moods, wishes: wishes, pop: population(c) };
    return c.happy;
  }
  function population(c) {
    var p = 0;
    for (var k in c.byType) { var o = D.OBJ[k]; if (o && o.pop) p += o.pop * c.byType[k].length; }
    return p;
  }

  // ---------- ひろげる ----------
  function expand(c) {
    if (c.w >= MAX && c.h >= MAX) return null;
    var w = Math.min(MAX, c.w + STEP), h = Math.min(MAX, c.h + STEP);
    var ox = (w - c.w) >> 1, oy = (h - c.h) >> 1;
    var n = create(w, h);
    for (var y = 0; y < c.h; y++) for (var x = 0; x < c.w; x++) {
      var a = y * c.w + x, b = (y + oy) * w + x + ox;
      n.base[b] = c.base[a]; n.road[b] = c.road[a]; n.rail[b] = c.rail[a]; n.obj[b] = c.obj[a];
    }
    // かわ は はし まで のばす
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (x >= ox && x < ox + c.w && y >= oy && y < oy + c.h) continue;
      var sx = Math.max(ox, Math.min(ox + c.w - 1, x)), sy = Math.max(oy, Math.min(oy + c.h - 1, y));
      var edge = sx === x || sy === y; // まっすぐ そと がわ だけ
      if (edge && n.base[sy * w + sx]) n.base[y * w + x] = 1;
    }
    reindex(n);
    return { city: n, ox: ox, oy: oy };
  }

  // ---------- ほぞん（ランレングス で ちぢめる） ----------
  function encode(c) {
    var n = c.w * c.h, out = [], prev = -1, cnt = 0;
    function flush() { if (cnt) out.push(prev.toString(36) + (cnt > 1 ? "*" + cnt.toString(36) : "")); }
    for (var i = 0; i < n; i++) {
      var v = c.base[i] | c.road[i] << 1 | c.rail[i] << 2 | c.obj[i] << 3;
      if (v === prev) cnt++; else { flush(); prev = v; cnt = 1; }
    }
    flush();
    return out.join(",");
  }
  function decode(w, h, s) {
    var c = create(w, h), i = 0, n = w * h;
    s.split(",").forEach(function (tok) {
      if (!tok) return;
      var p = tok.split("*"), v = parseInt(p[0], 36), k = p[1] ? parseInt(p[1], 36) : 1;
      for (; k > 0 && i < n; k--, i++) {
        c.base[i] = v & 1; c.road[i] = v >> 1 & 1; c.rail[i] = v >> 2 & 1;
        var o = v >> 3; c.obj[i] = D.OBJ[o] ? o : 0;
      }
    });
    reindex(c);
    return c;
  }
  function toJSON(c, extra) {
    var j = { v: 1, w: c.w, h: c.h, d: encode(c) };
    for (var k in extra) j[k] = extra[k];
    return JSON.stringify(j);
  }
  function fromJSON(str) {
    var j = JSON.parse(str);
    if (!j || j.v !== 1 || !(j.w >= 10 && j.w <= MAX && j.h >= 10 && j.h <= MAX)) return null;
    return { city: decode(j.w, j.h, j.d || ""), meta: j };
  }

  // ---------- さいしょ の まち ----------
  function blank(w, h) {
    var c = create(w || 20, h || 20);
    // かわ を 1ぽん
    var x = Math.round(c.w * 0.78);
    for (var y = 0; y < c.h; y++) {
      if (y === 8) x--;
      if (y === 14) x++;
      c.base[y * c.w + x] = 1;
    }
    [[2, 2], [5, 16], [12, 3], [17, 17], [9, 13], [3, 12], [18, 2]].forEach(function (p) {
      var i = p[1] * c.w + p[0]; if (!c.base[i]) c.obj[i] = O.tree;
    });
    changed(c);
    return c;
  }
  function sample() {
    var c = create(20, 20), w = 20, x, y;
    function at(x, y) { return y * w + x; }
    for (y = 0; y < 20; y++) c.base[at(15, y)] = 1;
    [4, 10, 16].forEach(function (yy) { for (x = 0; x < 20; x++) c.road[at(x, yy)] = 1; });
    [3, 9].forEach(function (xx) { for (y = 0; y < 20; y++) c.road[at(xx, y)] = 1; });
    for (y = 4; y <= 16; y++) c.road[at(18, y)] = 1;
    for (x = 4; x <= 8; x++) c.road[at(x, 8)] = 1; // えき の まえ の みち
    for (x = 0; x < 20; x++) c.rail[at(x, 7)] = 1;
    c.obj[at(6, 7)] = O.station; c.obj[at(7, 7)] = O.station;
    var fixed = { school: [5, 11], hospital: [11, 9], fire: [10, 5], post: [4, 3], super: [8, 9], bakery: [2, 5],
      library: [10, 11], koban: [4, 9], park: [6, 13], factory: [17, 17], police: [12, 15] };
    for (var k in fixed) c.obj[at(fixed[k][0], fixed[k][1])] = O[k];
    c.obj[at(7, 13)] = O.park; c.obj[at(6, 14)] = O.park; c.obj[at(7, 14)] = O.park;
    [[16, 12], [17, 12], [16, 13], [17, 13], [16, 11], [17, 11]].forEach(function (p) { c.obj[at(p[0], p[1])] = O.field; });
    var mans = { "1,11": 1, "7,5": 1, "12,3": 1, "6,17": 1 };
    for (y = 0; y < 20; y++) for (x = 0; x < 20; x++) {
      var i = at(x, y);
      if (c.base[i] || c.road[i] || c.rail[i] || c.obj[i]) continue;
      var near = false;
      for (var d = 0; d < 4; d++) { var j = nb(c, i, d); if (j >= 0 && c.road[j]) near = true; }
      if (near && x < 15) c.obj[i] = mans[x + "," + y] ? O.mansion : O.house;
      else if ((x * 7 + y * 13) % 5 < 2) c.obj[i] = O.tree;
    }
    changed(c);
    return c;
  }

  var API = { create: create, nb: nb, mask: mask, apply: apply, revert: revert, redo: redo, changed: changed,
    list: list, doors: doors, field: field, route: route, roadDist: roadDist, nearest: nearest, manhattan: manhattan,
    houseMood: houseMood, happiness: happiness, population: population, expand: expand,
    encode: encode, decode: decode, toJSON: toJSON, fromJSON: fromJSON, blank: blank, sample: sample,
    MAX: MAX, DX: DX, DY: DY };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.MACHI_CITY = API;
})(this);
