/* ============================================================
   てんびん パズル — ステージ と すいりの けいさん
   ブラウザでは window.TenbinData、node では module.exports。
   ============================================================ */
(function (root) {
  "use strict";

  /* ---------- てんびんの かたむき ----------
     diff = ひだりの おもさ − みぎの おもさ。
     プラス なら ひだりが さがる（かくどは プラス）。
     さが 1 でも 5° かたむいて めで わかる。さが おおきいほど かたむき、18° で とまる。 */
  var MAX_ANGLE = 18;
  function tilt(diff) {
    if (!diff) return 0;
    var a = Math.min(MAX_ANGLE, 5 + 13 * Math.tanh((Math.abs(diff) - 1) / 6));
    return diff > 0 ? a : -a;
  }

  function rep(e, n) { var a = []; for (var i = 0; i < n; i++) a.push(e); return a; }

  /* ---------- 1. くらべっこ ----------
     items: { e: えもじ, w: おもさ（ないしょ） }。おもさは みんな ちがう。
     みためと おもさが ちがう もの（ふうせん・れんが など）も まぜる。 */
  var KURABE = [
    { items: [{ e: "🍉", w: 8 }, { e: "🍒", w: 1 }] },
    { items: [{ e: "🎈", w: 1 }, { e: "🧱", w: 6 }] },
    { items: [{ e: "🍎", w: 3 }, { e: "🍓", w: 1 }, { e: "🍉", w: 9 }] },
    { items: [{ e: "🧸", w: 2 }, { e: "📚", w: 5 }, { e: "✏️", w: 1 }] },
    { items: [{ e: "🥚", w: 2 }, { e: "🍍", w: 6 }, { e: "🍌", w: 3 }] },
    { items: [{ e: "🍃", w: 1 }, { e: "🔨", w: 7 }, { e: "🧦", w: 2 }] },
    { items: [{ e: "🍅", w: 3 }, { e: "🥕", w: 2 }, { e: "🎃", w: 9 }, { e: "🍇", w: 4 }] },
    { items: [{ e: "⚽", w: 4 }, { e: "🏀", w: 6 }, { e: "🎾", w: 2 }, { e: "🏓", w: 1 }] },
    { items: [{ e: "🍩", w: 2 }, { e: "🥛", w: 5 }, { e: "🍞", w: 4 }, { e: "🧀", w: 3 }] },
    { items: [{ e: "🐟", w: 5 }, { e: "🦀", w: 3 }, { e: "🐙", w: 7 }, { e: "🐚", w: 2 }] },
    { items: [{ e: "🔔", w: 6 }, { e: "🎁", w: 4 }, { e: "🧩", w: 2 }, { e: "🎲", w: 3 }] },
    { items: [{ e: "🎀", w: 1 }, { e: "💎", w: 3 }, { e: "👑", w: 8 }, { e: "💍", w: 2 }] }
  ];
  /* ぜんぶの じゅんばんを きめるのに ひつような くらべる かいすうの めやす（ソートの さいあく） */
  var KURABE_LIMIT = { 2: 1, 3: 3, 4: 5 };

  /* ---------- 2. おきかえ すいり ----------
     w: それぞれの おもさ、scales: つりあった てんびん [ひだり, みぎ]、
     ask: [きく もの, たんい]、answer: こたえ（たんい なんこ ぶん） */
  var OKIKAE = [
    { w: { "🍎": 2, "🍊": 1 },
      scales: [[["🍎"], rep("🍊", 2)]], ask: ["🍎", "🍊"], answer: 2 },
    { w: { "🍐": 3, "🍓": 1 },
      scales: [[["🍐"], rep("🍓", 3)]], ask: ["🍐", "🍓"], answer: 3 },
    { w: { "🍍": 4, "🍋": 1 },
      scales: [[rep("🍋", 4), ["🍍"]]], ask: ["🍍", "🍋"], answer: 4 },
    { w: { "🍌": 2, "🍇": 1 },
      scales: [[rep("🍌", 2), rep("🍇", 4)]], ask: ["🍌", "🍇"], answer: 2 },
    { w: { "🍎": 2, "🍊": 1, "🍌": 3 },
      scales: [[["🍎"], rep("🍊", 2)], [["🍌"], ["🍎", "🍊"]]], ask: ["🍌", "🍊"], answer: 3 },
    { w: { "🥥": 2, "🍋": 1, "🍉": 5 },
      scales: [[["🥥"], rep("🍋", 2)], [["🍉"], ["🥥", "🥥", "🍋"]]], ask: ["🍉", "🍋"], answer: 5 },
    { w: { "🍈": 6, "🍐": 3, "🍒": 1 },
      scales: [[["🍈"], rep("🍐", 2)], [["🍐"], rep("🍒", 3)]], ask: ["🍈", "🍒"], answer: 6 },
    { w: { "🍑": 3, "🍓": 1, "🍍": 4 },
      scales: [[rep("🍑", 2), rep("🍓", 6)], [["🍍"], ["🍑", "🍓"]]], ask: ["🍍", "🍓"], answer: 4 },
    { w: { "🍎": 2, "🍐": 3, "🍊": 1, "🍉": 5 },
      scales: [[["🍎"], rep("🍊", 2)], [["🍐"], rep("🍊", 3)], [["🍉"], ["🍎", "🍐"]]],
      ask: ["🍉", "🍊"], answer: 5 },
    { w: { "🍎": 3, "🍊": 1, "🍌": 5 },
      scales: [[["🍎"], rep("🍊", 3)], [["🍌", "🍊"], ["🍎", "🍎"]]], ask: ["🍌", "🍊"], answer: 5 },
    { w: { "🍇": 2, "🍒": 1, "🍈": 8 },
      scales: [[rep("🍇", 3), rep("🍒", 6)], [["🍈"], rep("🍇", 4)]], ask: ["🍈", "🍒"], answer: 8 },
    { w: { "🍍": 9, "🍎": 3, "🍊": 1 },
      scales: [[["🍍"], rep("🍎", 3)], [["🍎"], rep("🍊", 3)]], ask: ["🍍", "🍊"], answer: 9 },
    { w: { "🍉": 12, "🍈": 3, "🍋": 1 },
      scales: [[["🍉"], rep("🍈", 4)], [["🍈"], rep("🍋", 3)]], ask: ["🍉", "🍋"], answer: 12 }
  ];
  var PAD_MAX = 12;

  /* つりあった てんびんから、こどもと おなじ やりかた（わかって いない ものが 1しゅるい だけの
     てんびんを えらんで とく）で、それぞれの おもさを「たんい なんこ ぶん」で だす。
     steps: とけた じゅん、depth: なんだん めの すいりか（たんい は 0） */
  function deduce(st) {
    var unit = st.ask[1], known = {}, steps = [];
    known[unit] = { v: 1, d: 0 };
    var changed = true;
    while (changed) {
      changed = false;
      for (var s = 0; s < st.scales.length; s++) {
        var sides = st.scales[s], coef = {}, rest = 0, depth = 0, unknown = [];
        sides[0].forEach(function (e) { coef[e] = (coef[e] || 0) + 1; });
        sides[1].forEach(function (e) { coef[e] = (coef[e] || 0) - 1; });
        Object.keys(coef).forEach(function (e) {
          if (known[e]) { rest -= coef[e] * known[e].v; if (coef[e]) depth = Math.max(depth, known[e].d); }
          else if (coef[e]) unknown.push(e);
        });
        if (unknown.length !== 1) continue;
        var u = unknown[0], v = rest / coef[u];
        if (!(v > 0)) continue;
        known[u] = { v: v, d: depth + 1 };
        steps.push({ e: u, v: v, scale: s });
        changed = true;
      }
    }
    var t = known[st.ask[0]];
    return t ? { value: t.v, depth: t.d, steps: steps } : null;
  }

  /* ---------- 3. つりあわせ ----------
     e/w: ひだりに のる もの、inv: つかえる ぶんどう {おもさ: こすう}、
     show: おもさを みせる か、both: ひだりにも ぶんどうを のせて よい（ひきざん）、lv: むずかしさ */
  var INV = { 1: 2, 2: 2, 5: 1, 10: 1 };
  var TSURIAI = [
    { e: "🍎", w: 3, inv: INV, show: true, lv: 2 },
    { e: "🧸", w: 6, inv: INV, show: true, lv: 2 },
    { e: "🍉", w: 8, inv: INV, show: true, lv: 2 },
    { e: "🎃", w: 12, inv: INV, show: true, lv: 2 },
    { e: "🍍", w: 7, inv: INV, show: false, lv: 2 },
    { e: "🐟", w: 9, inv: INV, show: false, lv: 2 },
    { e: "🍈", w: 14, inv: INV, show: false, lv: 3 },
    { e: "🎁", w: 17, inv: INV, show: false, lv: 3 },
    { e: "🧺", w: 23, inv: { 1: 2, 2: 2, 5: 2, 10: 2 }, show: false, lv: 3 },
    { e: "🍐", w: 4, inv: { 1: 1, 5: 1, 10: 1 }, show: true, both: true, lv: 3 },
    { e: "🍉", w: 8, inv: { 2: 1, 5: 1, 10: 1 }, show: true, both: true, lv: 3 },
    { e: "🎃", w: 9, inv: { 1: 1, 5: 1, 10: 1 }, show: false, both: true, lv: 3 },
    { e: "🧳", w: 13, inv: { 2: 1, 5: 1, 10: 2 }, show: false, both: true, lv: 3 },
    { e: "🛢️", w: 18, inv: { 2: 1, 5: 1, 10: 2 }, show: false, both: true, lv: 3 }
  ];
  var WEIGHT_VALUES = [10, 5, 2, 1];

  function expandInv(inv) {
    var list = [];
    WEIGHT_VALUES.forEach(function (v) { for (var i = 0; i < (inv[v] || 0); i++) list.push(v); });
    return list;
  }

  /* ぶんどうの のせかたを ぜんぶ ためす。min: つりあう ときの いちばん すくない こすう（できなければ Infinity）
     rightOnly: みぎ だけで つりあう か */
  function weighOptions(w, inv, both) {
    var list = expandInv(inv), best = Infinity, rightOnly = false;
    (function go(i, diff, used, usedLeft) {
      if (i === list.length) {
        if (diff === w) { if (used < best) best = used; if (!usedLeft) rightOnly = true; }
        return;
      }
      go(i + 1, diff, used, usedLeft);
      go(i + 1, diff + list[i], used + 1, usedLeft);
      if (both) go(i + 1, diff - list[i], used + 1, true);
    })(0, 0, 0, false);
    return { min: best, rightOnly: rightOnly };
  }

  /* ---------- ボーナス: にせものの きんか ----------
     ほんもの 10、にせもの 9。history: [{ L:[ばんごう], R:[ばんごう], res: -1|0|1 }]
     res は ひだり − みぎ の ふごう。すべての けっかと むじゅんしない にせもの こうほを かえす。 */
  var COIN_N = 9, COIN_REAL = 10, COIN_FAKE = 9, COIN_TRIES = 2;
  function coinWeight(n, fake) { return n === fake ? COIN_FAKE : COIN_REAL; }
  function coinResult(L, R, fake) {
    var d = 0;
    L.forEach(function (n) { d += coinWeight(n, fake); });
    R.forEach(function (n) { d -= coinWeight(n, fake); });
    return d > 0 ? 1 : d < 0 ? -1 : 0;
  }
  function coinCandidates(history) {
    var out = [];
    for (var f = 1; f <= COIN_N; f++) {
      var ok = history.every(function (h) { return coinResult(h.L, h.R, f) === h.res; });
      if (ok) out.push(f);
    }
    return out;
  }

  var api = {
    MAX_ANGLE: MAX_ANGLE, tilt: tilt,
    KURABE: KURABE, KURABE_LIMIT: KURABE_LIMIT,
    OKIKAE: OKIKAE, PAD_MAX: PAD_MAX, deduce: deduce,
    TSURIAI: TSURIAI, WEIGHT_VALUES: WEIGHT_VALUES, expandInv: expandInv, weighOptions: weighOptions,
    COIN_N: COIN_N, COIN_REAL: COIN_REAL, COIN_FAKE: COIN_FAKE, COIN_TRIES: COIN_TRIES,
    coinResult: coinResult, coinCandidates: coinCandidates
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TenbinData = api;
})(this);
