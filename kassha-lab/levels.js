/* ============================================================
   かっしゃ ラボ — たいけん と くみたて パズル の データ
   もじの {漢字|かんじ} は ふりがな（app.js が <ruby> に する）
   ブラウザでは window.KasshaLevels、node では module.exports。
   ============================================================ */
(function (root) {
  "use strict";
  var S = root.KasshaSolver || (typeof require === "function" ? require("./solver.js") : null);
  var C = { t: "ceil", y: 20 };

  // ---------- たいけん ----------
  // 1cm = 3px、て は 48cm まで ひく（1・2・4・8・3 で わりきれる）
  var TAIKEN = {
    pxPerCm: 3, pullMax: 48,
    weights: [10, 20, 40, 60],
    list: [
      {
        id: "fixed", name: "{定滑車|ていかっしゃ}", emoji: "🛞",
        sys: { w: 360, floor: 490, bodies: { c: C,
          f: { t: "fixed", x: 200, y: 80, r: 20 },
          w: { t: "weight", x: 180, y: 450, w: 48, h: 40 },
          h: { t: "hand", y: 220 } },
          ropes: [{ id: "A", pts: [{ b: "w" }, { b: "f" }, { b: "h" }] }] },
        say: "{定滑車|ていかっしゃ}は ひく むきを かえる だけ。ちからは おもりと おなじ、ひく ながさも あがる たかさと おなじ。",
        short: "ちからは おなじ・むきが かわる"
      },
      {
        id: "move", name: "{動滑車|どうかっしゃ}", emoji: "⬆️",
        sys: { w: 360, floor: 490, bodies: { c: C,
          m: { t: "move", x: 160, y: 400, r: 20 },
          w: { t: "weight", x: 160, y: 450, w: 48, h: 40, hang: "m" },
          h: { t: "hand", y: 270 } },
          ropes: [{ id: "A", pts: [{ b: "c", x: 140 }, { b: "m" }, { b: "h" }] }] },
        say: "{動滑車|どうかっしゃ}は 2ほんの ひもで ささえるから、ちからは はんぶん。でも ひく ながさは 2ばい。",
        short: "ちからは はんぶん・ながさは 2ばい"
      },
      {
        id: "fixmove", name: "{定滑車|ていかっしゃ}＋{動滑車|どうかっしゃ}", emoji: "🔁",
        sys: { w: 360, floor: 490, bodies: { c: C,
          m: { t: "move", x: 160, y: 400, r: 20 },
          w: { t: "weight", x: 160, y: 450, w: 48, h: 40, hang: "m" },
          f: { t: "fixed", x: 200, y: 80, r: 20 },
          h: { t: "hand", y: 220 } },
          ropes: [{ id: "A", pts: [{ b: "c", x: 140 }, { b: "m" }, { b: "f" }, { b: "h" }] }] },
        say: "ちからは はんぶんの まま、{定滑車|ていかっしゃ}で したに ひけるように なった。ひく ながさは 2ばい。",
        short: "はんぶんの ちからで したに ひける"
      },
      {
        id: "move2", name: "{動滑車|どうかっしゃ} 2こ", emoji: "✌️",
        sys: { w: 360, floor: 490, bodies: { c: C,
          m1: { t: "move", x: 140, y: 400, r: 20 },
          w: { t: "weight", x: 140, y: 450, w: 48, h: 40, hang: "m1" },
          m2: { t: "move", x: 160, y: 300, r: 20 },
          f: { t: "fixed", x: 200, y: 80, r: 20 },
          h: { t: "hand", y: 220 } },
          ropes: [
            { id: "A", pts: [{ b: "c", x: 120 }, { b: "m1" }, { b: "m2", hook: 1 }] },
            { id: "B", pts: [{ b: "c", x: 140 }, { b: "m2" }, { b: "f" }, { b: "h" }] }] },
        say: "{動滑車|どうかっしゃ}が 1こ ふえる たびに ちからは はんぶん。2こで 4ぶんの1。ひく ながさは 4ばい。",
        short: "ちからは 4ぶんの1・ながさは 4ばい"
      },
      {
        id: "move3", name: "{動滑車|どうかっしゃ} 3こ", emoji: "🤟",
        sys: { w: 360, floor: 490, bodies: { c: C,
          m1: { t: "move", x: 120, y: 400, r: 20 },
          w: { t: "weight", x: 120, y: 450, w: 48, h: 40, hang: "m1" },
          m2: { t: "move", x: 140, y: 320, r: 20 },
          m3: { t: "move", x: 160, y: 240, r: 20 },
          f: { t: "fixed", x: 200, y: 80, r: 20 },
          h: { t: "hand", y: 220 } },
          ropes: [
            { id: "A", pts: [{ b: "c", x: 100 }, { b: "m1" }, { b: "m2", hook: 1 }] },
            { id: "B", pts: [{ b: "c", x: 120 }, { b: "m2" }, { b: "m3", hook: 1 }] },
            { id: "C", pts: [{ b: "c", x: 140 }, { b: "m3" }, { b: "f" }, { b: "h" }] }] },
        say: "3こで 8ぶんの1！ とても かるい。でも 8ばい ひかないと あがらない。",
        short: "ちからは 8ぶんの1・ながさは 8ばい"
      },
      {
        id: "wheel", name: "{輪軸|りんじく}", emoji: "☸️",
        sys: { w: 360, floor: 490, bodies: { c: C,
          wa: { t: "wheel", x: 200, y: 110, R: 45, r: 15 },
          w: { t: "weight", x: 185, y: 450, w: 48, h: 40 },
          h: { t: "hand", y: 220 } },
          ropes: [
            { id: "A", pts: [{ b: "wa", on: "r", s: "L" }, { b: "w" }] },
            { id: "B", pts: [{ b: "wa", on: "R", s: "R" }, { b: "h" }] }] },
        say: "{輪軸|りんじく}は おおきい わ と ちいさい じく が いっしょに まわる。わの はんけいが 3ばい だから、ちからは 3ぶんの1、ひく ながさは 3ばい。",
        short: "ちからは 3ぶんの1・ながさは 3ばい"
      }
    ]
  };

  // ---------- くみたて パズル ----------
  // 1cm = 2px。ばしょ: てんじょう y=20、定滑車の レール y=70、おもり x=120（うえの へり y=450）
  var PZ = {
    pxPerCm: 2, reach: 80, w: 360, h: 520, floor: 490,
    ceilY: 20, railY: 70, railMin: 40, railMax: 320,
    weightX: 120, weightY: 450,
    slots: [{ x: 120, y: 400, hookAt: "top" }, { x: 140, y: 320, hookAt: "bot" }, { x: 160, y: 240, hookAt: "bot" }]
  };

  function R(x, k) { return { b: x, hook: k ? 1 : 0 }; }
  var STAGES = [
    { name: "したに ひっぱろう", W: 10, item: "📦", what: "つみき", Fmax: 10, rise: 30, down: 1, tb: { f: 1, m: 0, r: 1 },
      say: "てんじょうが たかくて うえには ひっぱれない。{定滑車|ていかっしゃ}で したに ひけるように しよう。",
      hint: "おもりの フック → {定滑車|ていかっしゃ} → ✋ の じゅんに ひもを かけよう",
      sol: { fixed: [140], move: [], ropes: [[{ b: "w" }, { b: "f0" }, { b: "h" }]] } },
    { name: "はんぶんの ちから", W: 20, item: "🐶", what: "こいぬ", Fmax: 10, rise: 20, tb: { f: 0, m: 1, r: 1 },
      say: "ちから 10 まで しか だせない ぼく。20の こいぬを もちあげたい。",
      hint: "{動滑車|どうかっしゃ}を おもりの うえに つけて、てんじょう → {動滑車|どうかっしゃ} → ✋",
      sol: { fixed: [], move: [0], ropes: [[{ b: "c", x: 100 }, { b: "m0" }, { b: "h" }]] } },
    { name: "したから はんぶん", W: 20, item: "🐶", what: "こいぬ", Fmax: 10, rise: 20, down: 1, tb: { f: 1, m: 1, r: 1 },
      say: "こんどは したに ひっぱって、はんぶんの ちからで あげよう。",
      hint: "てんじょう → {動滑車|どうかっしゃ} → {定滑車|ていかっしゃ} → ✋",
      sol: { fixed: [160], move: [0], ropes: [[{ b: "c", x: 100 }, { b: "m0" }, { b: "f0" }, { b: "h" }]] } },
    { name: "40の すいか", W: 40, item: "🍉", what: "すいか", Fmax: 10, rise: 10, tb: { f: 0, m: 2, r: 2 },
      say: "40の すいかを ちから 10で。{動滑車|どうかっしゃ}を 2こ つなごう。",
      hint: "したの {動滑車|どうかっしゃ}の ひもの はしを、うえの {動滑車|どうかっしゃ}の フックに むすぶ",
      sol: { fixed: [], move: [0, 1], ropes: [
        [{ b: "c", x: 100 }, { b: "m0" }, R("m1", 1)],
        [{ b: "c", x: 120 }, { b: "m1" }, { b: "h" }]] } },
    { name: "60の ピアノ", W: 60, item: "🎹", what: "ピアノ", Fmax: 15, rise: 10, down: 1, tb: { f: 1, m: 2, r: 2 },
      say: "ちから 15 いじょう ひけない ぼく が、60の ピアノを もちあげよう。",
      hint: "{動滑車|どうかっしゃ} 2こで 4ぶんの1。さいごに {定滑車|ていかっしゃ}で したむきに",
      sol: { fixed: [180], move: [0, 1], ropes: [
        [{ b: "c", x: 100 }, { b: "m0" }, R("m1", 1)],
        [{ b: "c", x: 120 }, { b: "m1" }, { b: "f0" }, { b: "h" }]] } },
    { name: "ひもの ながさに ちゅうい", W: 40, item: "🍉", what: "すいか", Fmax: 25, rise: 30, reach: 70, down: 1, tb: { f: 1, m: 2, r: 2 },
      say: "ちからは 25まで。でも ひもは 70cm しか ひけない。かるく しすぎると ひく ながさが たりなく なるよ。",
      hint: "ちからを はんぶんに すると ひく ながさは 2ばい。4ぶんの1 だと 4ばい…",
      sol: { fixed: [160], move: [0], ropes: [[{ b: "c", x: 100 }, { b: "m0" }, { b: "f0" }, { b: "h" }]] } },
    { name: "{滑車|かっしゃ}にも おもさ", W: 50, item: "🧸", what: "くま", Fmax: 30, rise: 20, down: 1, pm: 10, tb: { f: 1, m: 1, r: 1 },
      say: "こんどの {滑車|かっしゃ}は 1こ 10の おもさが ある。{動滑車|どうかっしゃ}も いっしょに もちあげるよ。",
      hint: "(くま 50 ＋ {動滑車|どうかっしゃ} 10) ÷ 2 は いくつ？",
      sol: { fixed: [160], move: [0], ropes: [[{ b: "c", x: 100 }, { b: "m0" }, { b: "f0" }, { b: "h" }]] } },
    { name: "おもい {滑車|かっしゃ} 2こ", W: 60, item: "🎹", what: "ピアノ", Fmax: 30, rise: 10, down: 1, pm: 20, tb: { f: 1, m: 2, r: 2 },
      say: "{滑車|かっしゃ}は 1こ 20。{動滑車|どうかっしゃ} 1こ だと (60＋20)÷2＝40 で おもすぎる…",
      hint: "{動滑車|どうかっしゃ}を 2こ つなぐと？ したの ひもは 40、うえは (40＋20)÷2",
      sol: { fixed: [180], move: [0, 1], ropes: [
        [{ b: "c", x: 100 }, { b: "m0" }, R("m1", 1)],
        [{ b: "c", x: 120 }, { b: "m1" }, { b: "f0" }, { b: "h" }]] } },
    { name: "3ぼんで ささえる", W: 60, item: "🎹", what: "ピアノ", Fmax: 20, rise: 20, down: 1, tb: { f: 2, m: 1, r: 1 },
      say: "{動滑車|どうかっしゃ}は 1こ だけ。でも ひもが {動滑車|どうかっしゃ}を 3ぼんで ささえれば…？",
      hint: "{動滑車|どうかっしゃ}の うえの フック → {定滑車|ていかっしゃ} → {動滑車|どうかっしゃ} → {定滑車|ていかっしゃ} → ✋",
      sol: { fixed: [140, 80], move: [0], ropes: [[R("m0", 1), { b: "f0" }, { b: "m0" }, { b: "f1" }, { b: "h" }]] } },
    { name: "80の くまさん", W: 80, item: "🧸", what: "おおきい くま", Fmax: 20, rise: 10, down: 1, tb: { f: 2, m: 2, r: 2 },
      say: "80を ちから 20で、したに ひいて あげよう。つかわない どうぐが あっても いいよ。",
      hint: "{動滑車|どうかっしゃ} 2こを つないで、{定滑車|ていかっしゃ}で したむきに",
      sol: { fixed: [180], move: [0, 1], ropes: [
        [{ b: "c", x: 100 }, { b: "m0" }, R("m1", 1)],
        [{ b: "c", x: 120 }, { b: "m1" }, { b: "f0" }, { b: "h" }]] } },
    { name: "{動滑車|どうかっしゃ} 3れんけつ", W: 80, item: "🧸", what: "おおきい くま", Fmax: 10, rise: 10, tb: { f: 0, m: 3, r: 3 },
      say: "ちから 10で 80を。{動滑車|どうかっしゃ}を 3こ つなげて 8ぶんの1 に しよう。",
      hint: "したから じゅんに、ひもの はしを うえの {動滑車|どうかっしゃ}の フックへ",
      sol: { fixed: [], move: [0, 1, 2], ropes: [
        [{ b: "c", x: 100 }, { b: "m0" }, R("m1", 1)],
        [{ b: "c", x: 120 }, { b: "m1" }, R("m2", 1)],
        [{ b: "c", x: 140 }, { b: "m2" }, { b: "h" }]] } },
    { name: "グランドピアノを 2かいへ", W: 120, item: "🎹", what: "グランドピアノ", Fmax: 15, rise: 10, down: 1, tb: { f: 1, m: 3, r: 3 },
      say: "さいごの もんだい！ 120の グランドピアノを、ちから 15で したに ひいて あげよう。",
      hint: "{動滑車|どうかっしゃ} 3こで 8ぶんの1、さいごに {定滑車|ていかっしゃ}",
      sol: { fixed: [200], move: [0, 1, 2], ropes: [
        [{ b: "c", x: 100 }, { b: "m0" }, R("m1", 1)],
        [{ b: "c", x: 120 }, { b: "m1" }, R("m2", 1)],
        [{ b: "c", x: 140 }, { b: "m2" }, { b: "f0" }, { b: "h" }]] } }
  ];
  STAGES.forEach(function (st) {
    st.par = st.sol.fixed.length + st.sol.move.length;
    if (!st.reach) st.reach = PZ.reach;
  });

  // ---------- くみたての ばめん → sys ----------
  // state = { fixed: [x...], move: [スロット番号...], ropes: [[点...], ...] }
  //   id: 定滑車は f0, f1…（おいた じゅん）、動滑車は m<スロット番号>
  function pzBodies(stage, state) {
    var B = { c: { t: "ceil", y: PZ.ceilY } }, pm = stage.pm || 0;
    state.fixed.forEach(function (x, i) { B["f" + i] = { t: "fixed", x: x, y: PZ.railY, r: 20, m: pm }; });
    state.move.forEach(function (k) {
      var s = PZ.slots[k];
      B["m" + k] = { t: "move", x: s.x, y: s.y, r: 20, m: pm, hookAt: s.hookAt, lab: pm ? String(pm) : "" };
    });
    B.w = { t: "weight", x: PZ.weightX, y: PZ.weightY, m: stage.W, w: 64, h: 40, emoji: stage.item, lab: String(stage.W) };
    if (state.move.indexOf(0) >= 0) B.w.hang = "m0";
    return B;
  }

  // ひもの 点の y（て の ばしょを きめる ため）
  function ptY(B, p, other) {
    var b = B[p.b];
    if (!b) return 0;
    if (b.t === "ceil") return b.y;
    if (p.hook) return b.y + (b.hookAt === "top" || (!b.hookAt && other != null && other < b.y) ? -30 : 30);
    return b.y;
  }

  // て の たかさ: さいごに かけた 滑車の まわりかた で きまる
  function handY(B, rope) {
    var n = rope.length, prev = rope[n - 2], pb = B[prev.b];
    if (!pb) return 220;
    var below;
    if (n >= 3 && (pb.t === "fixed" || pb.t === "move") && !prev.hook) {
      var pp = rope[n - 3];
      below = ptY(B, pp, pb.y) > pb.y;           // まえの 点が した → うえを まわる → て も した
    } else below = pb.t === "ceil";
    if (below) return 220;
    var py = ptY(B, prev, null);
    return Math.min(py - 30, Math.max(py - 140, 210));
  }

  function puzzleSys(stage, state, opts) {
    opts = opts || {};
    var B = pzBodies(stage, state), ropes = [], usedIds = { c: 1, w: 1 };
    (state.ropes || []).forEach(function (pts, i) {
      if (!pts.length) return;
      var hasHand = pts.some(function (p) { return p.b === "h"; });
      if (hasHand) B.h = { t: "hand", y: handY(B, pts) };
      ropes.push({ id: "r" + i, pts: pts.map(function (p) { var o = {}; for (var k in p) o[k] = p[k]; return o; }) });
      pts.forEach(function (p) { usedIds[p.b] = 1; });
    });
    if (B.w.hang) usedIds.m0 = 1;
    if (opts.solveOnly) {
      // つかって いない 滑車は けいさんに いれない
      Object.keys(B).forEach(function (id) { if (!usedIds[id] && id !== "h") delete B[id]; });
    }
    return { w: PZ.w, h: PZ.h, floor: PZ.floor, bodies: B, ropes: ropes };
  }

  // ためす: { code, F, pull, dir, res }
  //   code: clear / heavy / long / up / noRope / noHand / open / fall / many / wobble / slack / wrapSide / flat …
  function evaluate(stage, state) {
    if (state.cur && state.cur.length) return { code: "open" };
    if (!state.ropes.length) return { code: "noRope" };
    var hands = state.ropes.filter(function (r) { return r.some(function (p) { return p.b === "h"; }); }).length;
    if (!hands) return { code: "noHand" };
    var sys = puzzleSys(stage, state, { solveOnly: true });
    var res = S.solve(sys);
    if (!res.ok) return { code: res.err.code, err: res.err };
    var lift = S.liftOf(res, "w");
    if (!(lift > 1e-9)) return { code: "fall" };
    var F = res.hand, pull = stage.rise / lift;
    var out = { F: F, pull: pull, dir: res.handDir, res: res, sys: sys, lift: lift };
    if (stage.down && res.handDir !== "down") out.code = "up";
    else if (F > stage.Fmax + 1e-9) out.code = "heavy";
    else if (pull > stage.reach + 1e-9) out.code = "long";
    else out.code = "clear";
    return out;
  }

  function stars(stage, state) {
    var n = state.fixed.length + state.move.length;
    return n <= stage.par ? 3 : n <= stage.par + 1 ? 2 : 1;
  }

  var api = { TAIKEN: TAIKEN, PZ: PZ, STAGES: STAGES, puzzleSys: puzzleSys, evaluate: evaluate, stars: stars, handY: handY };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KasshaLevels = api;
})(this);
