/* ダイヤ を つくろう の しくみ（DOM なし。node でも ブラウザ でも うごく）
 *
 *  せんろ (line):  えき の ならび と、えき と えき の あいだ（くかん）。
 *    stations: [{ n:"A", name:"あおば", km, p（ホーム の かず）, ex（きゅうこう が とまる）, depot（しゃこ） }]
 *    secs:     [{ d: 1=たんせん / 2=ふくせん, t: ふつう の ぷん, te: きゅうこう の ぷん }]
 *    ふくせん に となりあう えき は のぼり・くだり べつ に p ほん ずつ。たんせん だけ の えき は p ほん を みんな で つかう。
 *  でんしゃ (train): { type:"L"|"E", dir:+1(くだり)/-1(のぼり), from, to, stops:[[えき, つく, でる], ...] }
 *    じこく は 0じ から の「ぷん」。1ぷん きざみ。
 *  しよう (spec):   { type, from, to, dep, w:{ えき: よぶん に まつ ぷん } } ⇄ もじ "L0-3@8:00/2+3"
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Diagram = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TYPES = {
    L: { name: "ふつう", color: "#1c7ed6", dark: "#1864ab" },
    E: { name: "きゅうこう", color: "#e8590c", dark: "#c2410c" }
  };

  /* ---------- せんろ ---------- */
  function makeLine(def) {
    var st = def.stations.map(function (s, i) {
      return { n: s.n, name: s.name, km: s.km, p: s.p || 1, ex: !!s.ex, depot: !!s.depot, i: i };
    });
    var secs = def.secs.map(function (s) { return { d: s.d, t: s.t, te: s.te || s.t }; });
    st.forEach(function (s, i) {
      var l = i > 0 ? secs[i - 1].d : 0, r = i < secs.length ? secs[i].d : 0;
      s.shared = !(l === 2 || r === 2);          // ふくせん に となりあう えき は むき ごと
    });
    return { stations: st, secs: secs, turn: def.turn == null ? 3 : def.turn, id: def.id };
  }
  function secOf(i, j) { return Math.min(i, j); }
  function runTime(line, type, sec) { return type === "E" ? line.secs[sec].te : line.secs[sec].t; }
  function minDwell(line, type, i) { return type === "L" ? 1 : (line.stations[i].ex ? 1 : 0); }
  function kmPerMin(line, type, sec) {
    var a = line.stations[sec].km, b = line.stations[sec + 1].km;
    return (b - a) / runTime(line, type, sec);
  }

  /* ---------- じこく の もじ ---------- */
  function hm(t) { var h = Math.floor(t / 60), m = t - h * 60; return h + ":" + (m < 10 ? "0" : "") + m; }
  function hmKana(t) { var h = Math.floor(t / 60), m = t - h * 60; return h + "じ" + (m ? m + "ふん" : ""); }
  function parseHM(s) { var m = /^(\d+):(\d\d)$/.exec(s); return +m[1] * 60 + +m[2]; }

  /* ---------- しよう ⇄ でんしゃ ---------- */
  function build(line, spec) {
    var dir = spec.to > spec.from ? 1 : -1, i = spec.from, t = spec.dep;
    var stops = [[i, t, t]];
    while (i !== spec.to) {
      t += runTime(line, spec.type, secOf(i, i + dir));
      i += dir;
      if (i === spec.to) { stops.push([i, t, t]); break; }
      var dep = t + minDwell(line, spec.type, i) + ((spec.w && spec.w[i]) || 0);
      stops.push([i, t, dep]);
      t = dep;
    }
    return { type: spec.type, dir: dir, from: spec.from, to: spec.to, stops: stops };
  }
  function toSpec(line, tr) {
    var w = {}, s = tr.stops;
    for (var k = 1; k < s.length - 1; k++) {
      var x = s[k][2] - s[k][1] - minDwell(line, tr.type, s[k][0]);
      if (x > 0) w[s[k][0]] = x;
    }
    return { type: tr.type, from: tr.from, to: tr.to, dep: s[0][2], w: w };
  }
  function fmtSpec(sp) {
    var s = sp.type + sp.from + "-" + sp.to + "@" + hm(sp.dep);
    Object.keys(sp.w || {}).sort(function (a, b) { return a - b; }).forEach(function (k) { if (sp.w[k]) s += "/" + k + "+" + sp.w[k]; });
    return s;
  }
  function parseSpec(str) {
    var m = /^([LE])(\d+)-(\d+)@(\d+:\d\d)((?:\/\d+\+\d+)*)$/.exec(str.replace(/\s+/g, ""));
    if (!m) throw new Error("bad spec " + str);
    var w = {};
    (m[5] || "").split("/").filter(Boolean).forEach(function (p) { var q = p.split("+"); w[+q[0]] = +q[1]; });
    return { type: m[1], from: +m[2], to: +m[3], dep: parseHM(m[4]), w: w };
  }
  function trainOf(line, str) { return build(line, parseSpec(str)); }
  function same(a, b) { return JSON.stringify(a.stops) === JSON.stringify(b.stops) && a.type === b.type; }

  function waitOf(line, tr) {           // よぶん に まった ぷん（ふつう の 1ぷん などは いれない）
    var w = 0, s = tr.stops;
    for (var k = 1; k < s.length - 1; k++) w += s[k][2] - s[k][1] - minDwell(line, tr.type, s[k][0]);
    return w;
  }
  function travel(tr) { return tr.stops[tr.stops.length - 1][1] - tr.stops[0][2]; }
  function stopAt(tr, st) { for (var k = 0; k < tr.stops.length; k++) if (tr.stops[k][0] === st) return tr.stops[k]; return null; }

  /* ---------- いち（どこ に いる？） ---------- */
  function posAt(line, tr, t) {
    var s = tr.stops, km = function (i) { return line.stations[i].km; };
    if (t < s[0][2] || t > s[s.length - 1][1]) return null;
    for (var k = 0; k < s.length; k++) {
      if (t >= s[k][1] && t <= s[k][2]) return { km: km(s[k][0]), stop: k, st: s[k][0] };
      if (k + 1 < s.length && t > s[k][2] && t < s[k + 1][1]) {
        var f = (t - s[k][2]) / (s[k + 1][1] - s[k][2]);
        return { km: km(s[k][0]) + (km(s[k + 1][0]) - km(s[k][0])) * f, seg: k, f: f, sec: secOf(s[k][0], s[k + 1][0]) };
      }
    }
    return null;
  }

  /* ---------- しょうとつ ---------- */
  function occupancy(line, trains) {
    var secs = [], visits = [];
    trains.forEach(function (tr, ti) {
      var s = tr.stops;
      for (var k = 0; k < s.length; k++) {
        var last = k === s.length - 1;
        var a = k === 0 ? s[k][2] : s[k][1], d = last ? s[k][1] : s[k][2];
        visits.push({ tr: ti, k: k, st: s[k][0], dir: tr.dir, a: a, d: d, stop: d > a });
        if (!last) {
          secs.push({ tr: ti, k: k, sec: secOf(s[k][0], s[k + 1][0]), dir: tr.dir,
            t0: s[k][2], t1: s[k + 1][1], km0: line.stations[s[k][0]].km, km1: line.stations[s[k + 1][0]].km });
        }
      }
    });
    return { secs: secs, visits: visits };
  }
  function meetPoint(a, b) {
    var va = (a.km1 - a.km0) / (a.t1 - a.t0), vb = (b.km1 - b.km0) / (b.t1 - b.t0);
    var lo = Math.max(a.t0, b.t0), hi = Math.min(a.t1, b.t1), t;
    if (Math.abs(va - vb) < 1e-9) t = lo;
    else t = (b.km0 - a.km0 + va * a.t0 - vb * b.t0) / (va - vb);
    t = Math.max(lo, Math.min(hi, t));
    return { t: t, km: a.km0 + va * (t - a.t0) };
  }
  /* ぶつかる ところ を ぜんぶ かえす。
   *  くかん は ひらいた はば（つく ぷん に はんたい むき が でる のは OK）、えき は とじた はば（おなじ ぷん に 2ほん いたら 2つ ホーム が いる）。
   *  meet: たんせん で むかいあわせ／pass: おなじ むき で くかん の なか で おいこし（または おなじ ぷん に はいる・でる）
   *  plat: えき の ホーム が たりない */
  function conflicts(line, trains) {
    var o = occupancy(line, trains), out = [], seen = {};
    var add = function (c) {
      var key = c.kind + ":" + Math.min(c.a, c.b) + ":" + Math.max(c.a, c.b) + ":" + (c.sec != null ? "s" + c.sec : "t" + c.st);
      if (seen[key]) return; seen[key] = 1; out.push(c);
    };
    var S = o.secs;
    for (var x = 0; x < S.length; x++) {
      for (var y = x + 1; y < S.length; y++) {
        var a = S[x], b = S[y];
        if (a.sec !== b.sec || a.tr === b.tr) continue;
        var p;
        if (a.dir !== b.dir) {
          if (line.secs[a.sec].d !== 1) continue;
          if (a.t0 < b.t1 && b.t0 < a.t1) {
            p = meetPoint(a, b);
            add({ kind: "meet", a: a.tr, b: b.tr, ka: a.k, kb: b.k, sec: a.sec, t: p.t, km: p.km });
          }
        } else {
          if (a.t1 < b.t0 || b.t1 < a.t0) continue;
          var d0 = a.t0 - b.t0, d1 = a.t1 - b.t1;
          if (d0 === 0 || d1 === 0 || (d0 > 0) !== (d1 > 0)) {
            p = d0 === 0 ? { t: a.t0, km: a.km0 } : d1 === 0 ? { t: a.t1, km: a.km1 } : meetPoint(a, b);
            add({ kind: "pass", a: a.tr, b: b.tr, ka: a.k, kb: b.k, sec: a.sec, t: p.t, km: p.km });
          }
        }
      }
    }
    // ホーム の かず
    var groups = {};
    o.visits.forEach(function (v) {
      var s = line.stations[v.st];
      var key = v.st + (s.shared ? "" : (v.dir > 0 ? "d" : "u"));
      (groups[key] = groups[key] || []).push(v);
    });
    Object.keys(groups).forEach(function (key) {
      var g = groups[key].slice().sort(function (p, q) { return p.a - q.a || p.d - q.d; });
      var cap = line.stations[g[0].st].p, here = [];
      g.forEach(function (v) {
        here = here.filter(function (h) { return h.d >= v.a; });   // おなじ ぷん に いる のも だめ（とじた はば）
        if (here.length >= cap) {
          var h = here[here.length - 1];
          add({ kind: "plat", a: h.tr, b: v.tr, ka: h.k, kb: v.k, st: v.st, t: v.a, km: line.stations[v.st].km });
        }
        here.push(v);
      });
    });
    out.sort(function (p, q) { return p.t - q.t; });
    return out;
  }

  /* ホーム の わりあて（はしらせる アニメ で どの せん に いる か） */
  function assignTracks(line, trains) {
    var o = occupancy(line, trains), groups = {}, res = {};
    o.visits.forEach(function (v) {
      var s = line.stations[v.st];
      var key = v.st + (s.shared ? "" : (v.dir > 0 ? "d" : "u"));
      (groups[key] = groups[key] || []).push(v);
    });
    Object.keys(groups).forEach(function (key) {
      var g = groups[key].slice().sort(function (p, q) { return p.a - q.a; });
      var cap = line.stations[g[0].st].p, busy = [];
      g.forEach(function (v) {
        var free = [];
        for (var j = 0; j < cap; j++) if (busy[j] == null || busy[j] < v.a) free.push(j);
        var j2 = free.length ? (v.stop ? free[free.length - 1] : free[0]) : cap - 1;
        if (cap > 1 && free.length && !v.stop && free.indexOf(0) >= 0) j2 = 0;
        busy[j2] = v.d;
        res[v.tr + ":" + v.k] = j2;
      });
    });
    return res;
  }

  /* つかう でんしゃ の かず（おりかえし は line.turn ぷん いじょう あけて） */
  function fleet(line, trains) {
    var per = {}, matched = 0;
    trains.forEach(function (tr) {
      var s = tr.stops, f = s[0], l = s[s.length - 1];
      (per[f[0]] = per[f[0]] || { a: [], d: [] }).d.push(f[2]);
      (per[l[0]] = per[l[0]] || { a: [], d: [] }).a.push(l[1] + line.turn);
    });
    Object.keys(per).forEach(function (k) {
      var a = per[k].a.sort(function (x, y) { return x - y; }), d = per[k].d.sort(function (x, y) { return x - y; });
      var ia = 0, ready = 0;
      d.forEach(function (t) {
        while (ia < a.length && a[ia] <= t) { ia++; ready++; }
        if (ready > 0) { ready--; matched++; }
      });
    });
    return trains.length - matched;
  }

  /* ---------- おだい の はんてい ---------- */
  function reqOK(tr, r) {
    if (r.type !== "*" && tr.type !== r.type) return false;
    if (tr.from !== r.from || tr.to !== r.to) return false;
    var d = tr.stops[0][2];
    if (r.win && (d < r.win[0] || d > r.win[1])) return false;
    if (r.by != null && tr.stops[tr.stops.length - 1][1] > r.by) return false;
    return true;
  }
  // でんしゃ → おだい の わく（n こ ずつ）を さいだい マッチング
  function match(trains, reqs) {
    var slots = [];
    reqs.forEach(function (r, ri) { for (var j = 0; j < (r.n || 1); j++) slots.push(ri); });
    var owner = slots.map(function () { return -1; }), of = trains.map(function () { return -1; });
    function aug(ti, seen) {
      for (var s = 0; s < slots.length; s++) {
        if (seen[s] || !reqOK(trains[ti], reqs[slots[s]])) continue;
        seen[s] = 1;
        if (owner[s] < 0 || aug(owner[s], seen)) { owner[s] = ti; of[ti] = s; return true; }
      }
      return false;
    }
    trains.forEach(function (_, ti) { aug(ti, {}); });
    var got = reqs.map(function () { return 0; });
    owner.forEach(function (ti, s) { if (ti >= 0) got[slots[s]]++; });
    return { got: got, slotOf: of.map(function (s) { return s < 0 ? -1 : slots[s]; }),
      extra: of.map(function (s, i) { return s < 0 ? i : -1; }).filter(function (i) { return i >= 0; }) };
  }
  function bonusOK(line, trains, b) {
    if (!b) return true;
    if (b.k === "fleet") return fleet(line, trains) <= b.max;
    if (b.k === "xfer") {      // ふつう から きゅうこう へ b.at えき で のりかえ（まち 1〜b.max ふん）
      return trains.some(function (l) {
        if (l.type !== "L" || l.dir !== b.dir) return false;
        var sl = stopAt(l, b.at); if (!sl) return false;
        return trains.some(function (e) {
          if (e.type !== "E" || e.dir !== b.dir) return false;
          var se = stopAt(e, b.at); if (!se || se[2] - se[1] < 1 && se !== e.stops[0]) return false;
          var gap = se[2] - sl[1];
          return gap >= 1 && gap <= b.max;
        });
      });
    }
    return true;
  }
  function judge(line, stage, fixed, user) {
    var all = fixed.concat(user);
    var cs = conflicts(line, all);
    var m = match(user, stage.req || []);
    var need = (stage.req || []).every(function (r, i) { return m.got[i] >= (r.n || 1); });
    var fl = fleet(line, all);
    var fleetOK = stage.fleet == null || fl <= stage.fleet;
    var wait = user.reduce(function (s, tr) { return s + waitOf(line, tr); }, 0);
    var clear = cs.length === 0 && need && m.extra.length === 0 && fleetOK && user.length > 0;
    var bok = bonusOK(line, all, stage.bonus);
    var par = stage.par || 0, stars = 0;
    if (clear) { stars = 1; if (wait <= par + 3) stars = 2; if (wait <= par && bok) stars = 3; }
    return { conflicts: cs, match: m, need: need, fleet: fl, fleetOK: fleetOK, wait: wait, bonus: bok, clear: clear, stars: stars };
  }

  /* ---------- ゆび で なぞる → でんしゃ ----------
   * pts: [{t, km}]（ずひょう の うえ の ゆび の あと。t は ふえる じゅん）
   * えき の よこ（band km いない）に ゆび が ある あいだ は とまる。えき から さき へ でたら しゅっぱつ。
   * かたむき（はやさ）は しゅるい で きまる。 */
  function trace(line, type, s0, t0, pts, band) {
    var st = line.stations, n = st.length;
    var res = { dir: 0, stops: [[s0, t0, null]], tip: null, state: "wait" };
    var k = 0, dir = 0;
    for (; k < pts.length; k++) {
      var dk = pts[k].km - st[s0].km;
      if (Math.abs(dk) > band) { dir = dk > 0 ? 1 : -1; break; }
    }
    var lastT = pts.length ? pts[pts.length - 1].t : t0;
    if (!dir || s0 + dir < 0 || s0 + dir >= n) { res.tip = { t: Math.max(t0, lastT), km: st[s0].km }; res.dir = dir; return res; }
    res.dir = dir;
    var i = s0, arr = t0, origin = true;
    for (;;) {
      var minDep = arr + (origin ? 0 : minDwell(line, type, i));
      if (i + dir < 0 || i + dir >= n) { res.stops[res.stops.length - 1][2] = arr; res.state = "end"; res.tip = null; return res; }
      var row = st[i].km, sec = secOf(i, i + dir), v = kmPerMin(line, type, sec) * 1;
      var kk = -1;
      for (var q = k; q < pts.length; q++) if ((pts[q].km - row) * dir > band) { kk = q; break; }
      if (kk < 0) {
        res.state = "wait";
        res.stops[res.stops.length - 1][2] = null;
        res.tip = { t: Math.max(minDep, lastT), km: row };
        return res;
      }
      var cand = pts[kk].t - ((pts[kk].km - row) * dir) / v;
      var dep = Math.max(minDep, Math.round(cand));
      var arrN = dep + runTime(line, type, sec);
      res.stops[res.stops.length - 1][2] = dep;
      if (lastT < arrN) {
        res.state = "run";
        var f = Math.max(0, (lastT - dep) / (arrN - dep));
        res.tip = { t: dep + f * (arrN - dep), km: row + (st[i + dir].km - row) * f, f: f, next: i + dir, arr: arrN };
        return res;
      }
      res.stops.push([i + dir, arrN, null]);
      i += dir; arr = arrN; k = kk; origin = false;
    }
  }
  // ゆび を はなした とき: えき で まって いれば そこ が しゅうてん。はしって いる とちゅう なら はんぶん いじょう で つぎ の えき まで。
  function finish(line, type, tr) {
    var s = tr.stops.map(function (x) { return x.slice(); });
    if (tr.state === "run") {
      if (tr.tip.f >= 0.5) s.push([tr.tip.next, tr.tip.arr, tr.tip.arr]);
      else s[s.length - 1][2] = null;
    }
    var last = s[s.length - 1];
    if (last[2] == null) last[2] = last[1];
    if (s.length > 1) last[2] = last[1];
    if (s.length < 2) return null;
    s[0][1] = s[0][2];
    return { type: type, dir: tr.dir, from: s[0][0], to: last[0], stops: s };
  }

  /* ---------- ずひょう ⇄ じこく・えき ---------- */
  function view(line, t0, t1, box) {
    var kms = line.stations.map(function (s) { return s.km; });
    var k0 = Math.min.apply(null, kms), k1 = Math.max.apply(null, kms);
    var sx = box.w / (t1 - t0), sy = box.h / (k1 - k0 || 1);
    return {
      t0: t0, t1: t1, box: box, pxPerMin: sx, pxPerKm: sy,
      x: function (t) { return box.x + (t - t0) * sx; },
      y: function (km) { return box.y + (km - k0) * sy; },
      t: function (x) { return t0 + (x - box.x) / sx; },
      km: function (y) { return k0 + (y - box.y) / sy; },
      stationAt: function (y, tol) {
        var best = -1, bd = tol;
        kms.forEach(function (km, i) { var d = Math.abs(box.y + (km - k0) * sy - y); if (d <= bd) { bd = d; best = i; } });
        return best;
      }
    };
  }

  /* ---------- ダイヤ を よむ もんだい ---------- */
  function quizAnswer(line, trains, q) {
    var tr = q.tr != null ? trains[q.tr] : null;
    if (q.q === "arr" || q.q === "dep") { var s = stopAt(tr, q.st); return q.q === "arr" ? s[1] : s[2]; }
    if (q.q === "fast") {
      var best = -1, bt = 1e9, tie = false;
      q.among.forEach(function (i) { var v = travel(trains[i]); if (v < bt) { bt = v; best = i; tie = false; } else if (v === bt) tie = true; });
      return tie ? null : best;
    }
    if (q.q === "long") {     // いちばん ながく とまる えき
      var bs = -1, bw = -1, t2 = false;
      tr.stops.slice(1, -1).forEach(function (x) { var w = x[2] - x[1]; if (w > bw) { bw = w; bs = x[0]; t2 = false; } else if (w === bw) t2 = true; });
      return t2 ? null : bs;
    }
    if (q.q === "meet") {     // a と b が すれちがう えき（えき で まちあわせ）
      var A = trains[q.a], B = trains[q.b], hit = [];
      A.stops.forEach(function (x) {
        var y = stopAt(B, x[0]); if (!y) return;
        if (Math.max(x[1], y[1]) <= Math.min(x[2], y[2])) hit.push(x[0]);
      });
      return hit.length === 1 ? hit[0] : null;
    }
    if (q.q === "pass") {     // q.a（ふつう）が q.b に ぬかれる えき
      var L = trains[q.a], E = trains[q.b], at = [];
      L.stops.slice(1, -1).forEach(function (x) {
        var y = stopAt(E, x[0]); if (!y) return;
        if (x[1] <= y[1] && x[2] >= y[2]) at.push(x[0]);
      });
      return at.length === 1 ? at[0] : null;
    }
    if (q.q === "count") {
      return trains.filter(function (t) { var s = stopAt(t, q.st); return s && t.dir === q.dir && s[2] >= q.win[0] && s[2] <= q.win[1] && s !== t.stops[t.stops.length - 1]; }).length;
    }
    return null;
  }

  /* ステージ の データ（もじ の じこく）を つかえる かたち に */
  function prepStage(lines, stage) {
    var line = makeLine(lines[stage.line]);
    var T = function (s) { return typeof s === "number" ? s : parseHM(s); };
    return {
      stage: stage, line: line, t0: T(stage.view[0]), t1: T(stage.view[1]),
      fixed: (stage.fix || []).map(function (s) { return trainOf(line, s); }),
      ans: (stage.ans || []).map(function (s) { return trainOf(line, s); }),
      req: (stage.req || []).map(function (r) {
        return { type: r.type, from: r.from, to: r.to, n: r.n || 1, win: r.win ? [T(r.win[0]), T(r.win[1])] : null, by: r.by != null ? T(r.by) : null };
      }),
      quiz: (stage.quiz || []).map(function (q) {
        var o = {}; Object.keys(q).forEach(function (k) { o[k] = q[k]; });
        if (o.win) o.win = [T(o.win[0]), T(o.win[1])];
        return o;
      }),
      fleet: stage.fleet, bonus: stage.bonus, par: stage.par || 0
    };
  }
  function judgeStage(P, user) {
    return judge(P.line, { req: P.req, fleet: P.fleet, bonus: P.bonus, par: P.par }, P.fixed, user);
  }

  return {
    prepStage: prepStage, judgeStage: judgeStage,
    TYPES: TYPES, makeLine: makeLine, runTime: runTime, minDwell: minDwell, secOf: secOf, kmPerMin: kmPerMin,
    hm: hm, hmKana: hmKana, parseHM: parseHM,
    build: build, toSpec: toSpec, fmtSpec: fmtSpec, parseSpec: parseSpec, trainOf: trainOf, same: same,
    waitOf: waitOf, travel: travel, stopAt: stopAt, posAt: posAt,
    conflicts: conflicts, assignTracks: assignTracks, fleet: fleet,
    reqOK: reqOK, match: match, bonusOK: bonusOK, judge: judge,
    trace: trace, finish: finish, view: view, quizAnswer: quizAnswer
  };
});
