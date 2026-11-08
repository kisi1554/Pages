/* かもつ いれかえ パズル — せんろ の しくみ と ソルバー（DOM なし。node でも よめる）
 *
 * じょうたい state = { loco: [...], tr: [[...], ...] }
 *   loco … きかんしゃ に つながって いる かしゃ。きかんしゃ に ちかい じゅん（t1 … tk、tk が せんとう）
 *   tr[i] … せんろ i に おいて ある かしゃ。おく（くるまどめ がわ）から てまえ（ポイント がわ） の じゅん
 *   tr[0] が しゅっぱつ せん、tr[1..] が わきせん。ぜんぶ みぎ が いきどまり（スタック）。
 * かしゃ は 1もじ の しゅるい（r b g y …）。おなじ しゅるい は くべつ しない。
 *
 * 1て = op(x, j): ポイント を x に して すすみ、そこ の かしゃ に ぜんぶ れんけつ してから、
 *   きかんしゃ がわ から j りょう を つれて もどる（のこり は せんろ x に おいて くる）。
 *   ・つれて かえれる のは ひきあげせん の ながさ H りょう まで
 *   ・おいて くる のは せんろ x の ていいん cap りょう まで
 *   ・なにも かわらない（j が いま つないで いる かず と おなじ）のは 1て に ならない
 */
(function (root, factory) {
  var m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else root.Yard = m;
})(this, function () {
  "use strict";

  function clone(s) { return { loco: s.loco.slice(), tr: s.tr.map(function (a) { return a.slice(); }) }; }
  function key(s) { return s.loco.join("") + "/" + s.tr.map(function (a) { return a.join(""); }).join("/"); }
  function same(a, b) { return key(a) === key(b); }

  // せんろ x で えらべる j の はんい
  function range(stage, s, x) {
    var k = s.loco.length, m = s.tr[x].length, L = k + m;
    return { lo: Math.max(0, L - stage.tracks[x].cap), hi: Math.min(L, stage.H), k: k, m: m, L: L };
  }

  function valid(stage, s, x, j) {
    if (!(x >= 0 && x < s.tr.length) || !Number.isInteger(j)) return false;
    var r = range(stage, s, x);
    return j >= r.lo && j <= r.hi && j !== r.k;
  }

  // きかんしゃ から そと へ ならべた れつ（t1 … tk, sm … s1）
  function combined(s, x) { return s.loco.concat(s.tr[x].slice().reverse()); }

  function apply(s, x, j) {
    var c = combined(s, x);
    var n = clone(s);
    n.loco = c.slice(0, j);
    n.tr[x] = c.slice(j).reverse();
    return n;
  }

  function moves(stage, s) {
    var out = [];
    for (var x = 0; x < s.tr.length; x++) {
      var r = range(stage, s, x);
      for (var j = r.lo; j <= r.hi; j++) if (j !== r.k) out.push([x, j]);
    }
    return out;
  }

  // ちゅうもん は ひだり → みぎ（てまえ → おく）。"*" は どの かしゃ でも よい
  function goalOk(stage, s) {
    var want = stage.goal.dep, dep = s.tr[0];
    if (dep.length !== want.length) return false;
    for (var i = 0; i < want.length; i++) {
      var have = dep[dep.length - 1 - i];
      if (want[i] !== "*" && want[i] !== have) return false;
    }
    var keep = stage.goal.keep || [];
    for (var q = 0; q < keep.length; q++) {
      var t = keep[q].t, tr = keep[q].tr;
      if (s.loco.indexOf(t) >= 0) return false;
      for (var y = 0; y < s.tr.length; y++) if (y !== tr && s.tr[y].indexOf(t) >= 0) return false;
    }
    return true;
  }

  function startState(stage) { return clone(stage.start); }

  // はば ゆうせん たんさく。さいたん の て の れつ [[x, j], ...] を かえす（とけない ときは null）
  // ちゅうもん に も じょうけん に も でて こない しゅるい は「.」に まとめる（さがす かず が へる）
  function relabel(stage, s) {
    var need = {};
    stage.goal.dep.forEach(function (t) { need[t] = 1; });
    (stage.goal.keep || []).forEach(function (k) { need[k.t] = 1; });
    var f = function (t) { return need[t] ? t : "."; };
    return { loco: s.loco.map(f), tr: s.tr.map(function (a) { return a.map(f); }) };
  }

  // はやい ほう: せんろ を「てまえ → おく」の もじれつ に して、"/" で つなげた もの を キー に する
  function solve(stage, s, opt) {
    var limit = (opt && opt.limit) || 3000000;
    if (goalOk(stage, s)) return [];
    s = relabel(stage, s);
    var nT = s.tr.length, H = stage.H;
    var caps = stage.tracks.map(function (t) { return t.cap; });
    var want = stage.goal.dep.join(""), wl = want.length;
    var keep = stage.goal.keep || [];
    var isGoal = function (parts) {
      var d = parts[1];
      if (d.length !== wl) return false;
      for (var i = 0; i < wl; i++) { var c = want.charAt(i); if (c !== "*" && c !== d.charAt(i)) return false; }
      for (var q = 0; q < keep.length; q++) {
        for (var y = 0; y <= nT; y++) if (y !== keep[q].tr + 1 && parts[y].indexOf(keep[q].t) >= 0) return false;
      }
      return true;
    };
    var startParts = [s.loco.join("")].concat(s.tr.map(function (a) { return a.slice().reverse().join(""); }));
    var startK = startParts.join("/");
    var prev = new Map();
    prev.set(startK, null);
    var q = [startK], head = 0;
    while (head < q.length) {
      var ck = q[head++];
      var parts = ck.split("/");
      var loco = parts[0], k = loco.length;
      for (var x = 0; x < nT; x++) {
        var c = loco + parts[x + 1], L = c.length;
        var lo = L - caps[x] > 0 ? L - caps[x] : 0, hi = L < H ? L : H;
        for (var j = lo; j <= hi; j++) {
          if (j === k) continue;
          parts[0] = c.slice(0, j); parts[x + 1] = c.slice(j);
          var nk = parts.join("/");
          if (!prev.has(nk)) {
            prev.set(nk, [ck, x, j]);
            if (isGoal(parts)) {
              var path = [], k2 = nk;
              while (k2 !== startK) { var p = prev.get(k2); path.unshift([p[1], p[2]]); k2 = p[0]; }
              return path;
            }
            if (prev.size > limit) return null;
            q.push(nk);
          }
        }
        parts[0] = loco; parts[x + 1] = c.slice(k);
      }
    }
    return null;
  }

  // ていいん を こえて いない か
  function fits(stage, s) {
    if (s.loco.length > stage.H) return false;
    for (var i = 0; i < s.tr.length; i++) if (s.tr[i].length > stage.tracks[i].cap) return false;
    return true;
  }

  // ---------- まいにち もんだい ----------
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(a, R) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // cfg: { caps: [しゅっぱつ, わきせん…], H, cars: "rbgy..", goalLen, wild, keep: {t, tr} }
  // R の じゅんばん で ためして、さいたん が lo〜hi に はいる もの を かえす
  function generate(cfg, R, lo, hi, tries) {
    var best = null;
    for (var n = 0; n < (tries || 200); n++) {
      var cars = shuffle(cfg.cars.split(""), R);
      var keepT = cfg.keep ? cfg.keep.t : null;
      // ちゅうもん: こわれた かしゃ いがい から goalLen りょう
      var pool = shuffle(cars.filter(function (c) { return c !== keepT; }), R);
      var dep = pool.slice(0, cfg.goalLen);
      if (cfg.wild) {
        var idx = shuffle(dep.map(function (_, i) { return i; }), R).slice(0, cfg.wild);
        idx.forEach(function (i) { dep[i] = "*"; });
      }
      var tracks = cfg.caps.map(function (c) { return { cap: c }; });
      var st = { loco: [], tr: cfg.caps.map(function () { return []; }) };
      var ok = true;
      for (var c = 0; c < cars.length && ok; c++) {
        var room = [];
        for (var t = 0; t < tracks.length; t++) if (st.tr[t].length < tracks[t].cap) room.push(t);
        if (cfg.locoStart && st.loco.length < cfg.H && R() < 0.15) { st.loco.push(cars[c]); continue; }
        if (!room.length) { ok = false; break; }
        st.tr[room[Math.floor(R() * room.length)]].push(cars[c]);
      }
      if (!ok) continue;
      var stage = { tracks: tracks, H: cfg.H, start: st, goal: { dep: dep } };
      if (cfg.keep) stage.goal.keep = [{ t: cfg.keep.t, tr: cfg.keep.tr }];
      if (goalOk(stage, st)) continue;
      var path = solve(stage, st, { limit: cfg.limit || 400000 });
      if (!path) continue;
      stage.par = path.length;
      if (path.length >= lo && path.length <= hi) return stage;
      if (!best || Math.abs(path.length - (lo + hi) / 2) < Math.abs(best.par - (lo + hi) / 2)) best = stage;
    }
    return best;
  }

  var DAILY_CFG = [
    { caps: [4, 3, 3], H: 2, cars: "rbgyp", goalLen: 4 },
    { caps: [4, 3, 2], H: 3, cars: "rbgyk", goalLen: 4 },
    { caps: [4, 3, 3, 2], H: 2, cars: "rbgypw", goalLen: 4, wild: 1 },
    { caps: [5, 3, 2], H: 2, cars: "rbgyp", goalLen: 5 }
  ];

  // ひづけ（"2026-11-08"）で きまる もんだい。かならず とける もの だけ
  function makeDaily(dateStr) {
    var R = rng(hash("irekae:" + dateStr));
    var cfg = DAILY_CFG[Math.floor(R() * DAILY_CFG.length)];
    var st = generate(cfg, R, 5, 8, 60);
    st.id = "daily";
    st.date = dateStr;
    return st;
  }

  return {
    clone: clone, key: key, same: same, range: range, valid: valid, combined: combined,
    apply: apply, moves: moves, goalOk: goalOk, startState: startState, solve: solve, fits: fits,
    rng: rng, hash: hash, shuffle: shuffle, generate: generate, makeDaily: makeDaily, DAILY_CFG: DAILY_CFG
  };
});
