/* ============================================================
   いろまぜ ラボ — いろの けいさん
   ・えのぐ（あか・きいろ・あお）の わりあい → RGB
       Gossett & Chen (2004) "Paint Inspired Color Compositing" の
       RYB 立方体の 8かどを つかった 3次元（トリリニア）補間
   ・しろ は あかるく、くろ は くらく する まぜを あとから かける
   ・はんてい は Lab 色空間の ΔE（CIE76）
   ブラウザでは window.IroColor、node では module.exports で つかう
   ============================================================ */
(function (root) {
  "use strict";

  /* えのぐ 5しゅるい（じゅんばんは てきすう はいれつの ならび） */
  var PAINTS = [
    { id: "r", name: "あか",   hex: "#e53935" },
    { id: "y", name: "きいろ", hex: "#fdd835" },
    { id: "b", name: "あお",   hex: "#1e63c4" },
    { id: "w", name: "しろ",   hex: "#ffffff" },
    { id: "k", name: "くろ",   hex: "#262626" }
  ];
  var IDX = { r: 0, y: 1, b: 2, w: 3, k: 4 };

  /* RYB 立方体の 8かど（Gossett & Chen） [r][y][b] → [R,G,B] 0..1 */
  var CUBE = {
    "000": [1, 1, 1],          // しろ（なにも ない）
    "100": [1, 0, 0],          // あか
    "010": [1, 1, 0],          // きいろ
    "001": [0.163, 0.373, 0.6],// あお
    "110": [1, 0.5, 0],        // だいだい
    "101": [0.5, 0, 0.5],      // むらさき
    "011": [0, 0.66, 0.2],     // みどり
    "111": [0.2, 0.094, 0]     // くろ（ほぼ こげちゃ）
  };

  function lerp(a, b, t) { return a + (b - a) * t; }

  /* r,y,b は 0..1。立方体の なかを トリリニア補間 */
  function rybToRgb(r, y, b) {
    var out = [0, 0, 0];
    for (var i = 0; i < 3; i++) {
      var c000 = CUBE["000"][i], c100 = CUBE["100"][i], c010 = CUBE["010"][i], c001 = CUBE["001"][i];
      var c110 = CUBE["110"][i], c101 = CUBE["101"][i], c011 = CUBE["011"][i], c111 = CUBE["111"][i];
      var x00 = lerp(c000, c100, r), x10 = lerp(c010, c110, r);
      var x01 = lerp(c001, c101, r), x11 = lerp(c011, c111, r);
      var y0 = lerp(x00, x10, y), y1 = lerp(x01, x11, y);
      out[i] = lerp(y0, y1, b);
    }
    return out;
  }

  var WHITE_PAINT = 0.97;   // しろ えのぐ の あかるさ
  var BLACK_POWER = 0.82;   // くろ 1てき の つよさ（ぜんぶ くろ で 0.18 の あかるさ）

  /* counts = [あか, きいろ, あお, しろ, くろ] の てきすう → [R,G,B] 0..1（からっぽ は null） */
  function mix(counts) {
    var r = counts[0] || 0, y = counts[1] || 0, b = counts[2] || 0, w = counts[3] || 0, k = counts[4] || 0;
    var nc = r + y + b, total = nc + w + k;
    if (total <= 0) return null;
    var base;
    if (nc > 0) {
      var m = Math.max(r, y, b);              // わりあい だけで きまる（いちばん おおい いろ = 1）
      base = rybToRgb(r / m, y / m, b / m);
    } else {
      base = [WHITE_PAINT, WHITE_PAINT, WHITE_PAINT];
    }
    // しろ: いろの えのぐ と しろ の わりあいで うすめる
    if (w > 0 && nc > 0) {
      var tw = w / (nc + w);
      base = base.map(function (c) { return lerp(c, WHITE_PAINT, tw); });
    }
    // くろ: ぜんたいの なかの くろの わりあいで くらく する（かけざん なので いろあいは のこる）
    if (k > 0) {
      var f = 1 - BLACK_POWER * (k / total);
      base = base.map(function (c) { return c * f; });
    }
    return base.map(function (c) { return Math.max(0, Math.min(1, c)); });
  }

  /* ---------- へんかん ---------- */
  function toHex(rgb) {
    if (!rgb) return null;
    return "#" + rgb.map(function (c) {
      var v = Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16);
      return v.length < 2 ? "0" + v : v;
    }).join("");
  }
  function fromHex(hex) {
    var h = hex.replace("#", "");
    return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16) / 255; });
  }

  /* sRGB(0..1) → Lab（D65） */
  function rgbToLab(rgb) {
    var lin = rgb.map(function (c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    var X = lin[0] * 0.4124564 + lin[1] * 0.3575761 + lin[2] * 0.1804375;
    var Y = lin[0] * 0.2126729 + lin[1] * 0.7151522 + lin[2] * 0.0721750;
    var Z = lin[0] * 0.0193339 + lin[1] * 0.1191920 + lin[2] * 0.9503041;
    var xn = X / 0.95047, yn = Y / 1.0, zn = Z / 1.08883;
    function f(t) { return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116; }
    var fx = f(xn), fy = f(yn), fz = f(zn);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function deltaE(rgb1, rgb2) {
    if (!rgb1 || !rgb2) return Infinity;
    var a = rgbToLab(rgb1), b = rgbToLab(rgb2);
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2));
  }

  /* ---------- はんてい ---------- */
  var STAR3 = 10, STAR2 = 20, STAR1 = 30;
  function stars(dE) { return dE < STAR3 ? 3 : dE < STAR2 ? 2 : dE < STAR1 ? 1 : 0; }

  /* いまの てきすう から「たすだけ」で いける くみあわせの うち、いちばん ちかい もの
     （ΔE が おなじ くらいなら てきすうが すくない ほう） */
  function bestPlan(counts, targetRgb, allowed, maxDrops) {
    var total = counts.reduce(function (s, c) { return s + c; }, 0);
    var best = { counts: counts.slice(), dE: deltaE(mix(counts), targetRgb), drops: total };
    var c = counts.slice();
    (function walk(i, left) {
      if (i === 5) {
        var used = maxDrops - left;
        if (used === 0) return;
        var dE = deltaE(mix(c), targetRgb);
        if (dE < best.dE - 0.3 || (Math.abs(dE - best.dE) <= 0.3 && used < best.drops)) {
          best = { counts: c.slice(), dE: dE, drops: used };
        }
        return;
      }
      var canAdd = allowed.indexOf(PAINTS[i].id) >= 0 ? left : 0;
      for (var n = 0; n <= canAdd; n++) {
        c[i] = counts[i] + n;
        walk(i + 1, left - n);
      }
      c[i] = counts[i];
    })(0, maxDrops - total);
    return best;
  }

  /* たりない ぶんが いちばん おおい えのぐ */
  function biggestShort(from, to) {
    var bi = -1, bn = 0;
    for (var i = 0; i < 5; i++) {
      var d = to[i] - from[i];
      if (d > bn) { bn = d; bi = i; }
    }
    return bi;
  }

  /* ヒント: さきを よんで「なにを 1てき たす（へらす）と ゴールに ちかづくか」を えらぶ
     allowed = つかえる えのぐの id もじれつ（例 "rybwk"）、maxDrops = おさらの げんかい
     かえりち: { kind: "add" | "remove", paint, index } / { kind: "start" | "reset" | "ok" } */
  function hint(counts, targetRgb, allowed, maxDrops) {
    allowed = allowed || "rybwk";
    maxDrops = maxDrops || 12;
    var total = counts.reduce(function (s, c) { return s + c; }, 0);
    var now = deltaE(mix(counts), targetRgb);
    if (now < STAR3) return { kind: "ok" };
    var plan = bestPlan(counts, targetRgb, allowed, maxDrops);
    if (plan.dE < STAR3) {
      var ai = biggestShort(counts, plan.counts);
      return total === 0 ? { kind: "start", paint: PAINTS[ai], index: ai } : { kind: "add", paint: PAINTS[ai], index: ai };
    }
    // たすだけ では とどかない → 1てき へらすと どこまで いけるか
    var bestRm = null;
    for (var j = 0; j < 5; j++) {
      if (!counts[j]) continue;
      var d = counts.slice(); d[j]--;
      var p = bestPlan(d, targetRgb, allowed, maxDrops);
      if (!bestRm || p.dE < bestRm.dE) bestRm = { index: j, dE: p.dE };
    }
    if (bestRm && bestRm.dE < plan.dE - 1) return { kind: "remove", paint: PAINTS[bestRm.index], index: bestRm.index };
    if (plan.dE < now - 0.5) {
      var bi = biggestShort(counts, plan.counts);
      return { kind: "add", paint: PAINTS[bi], index: bi };
    }
    return { kind: "reset" };
  }

  /* ---------- みほんの いろ（かならず てきすう から つくる） ---------- */
  function C(r, y, b, w, k) { return [r, y, b, w || 0, k || 0]; }
  var COLORS = {
    mikan:      { name: "みかんいろ",   recipe: C(1, 2, 0) },
    daidai:     { name: "だいだいいろ", recipe: C(1, 1, 0) },
    midori:     { name: "みどり",       recipe: C(0, 1, 1) },
    murasaki:   { name: "むらさき",     recipe: C(1, 0, 1) },
    kimidori:   { name: "きみどり",     recipe: C(0, 2, 1) },
    aomurasaki: { name: "あおむらさき", recipe: C(1, 0, 2) },
    chairo:     { name: "ちゃいろ",     recipe: C(2, 2, 1) },
    oudo:       { name: "おうどいろ",   recipe: C(1, 3, 1) },
    azuki:      { name: "あずきいろ",   recipe: C(3, 1, 2) },
    pink:       { name: "ピンク",       recipe: C(1, 0, 0, 2) },
    sorairo:    { name: "そらいろ",     recipe: C(0, 0, 1, 1) },
    haiiro:     { name: "はいいろ",     recipe: C(0, 0, 0, 1, 1) },
    cream:      { name: "クリームいろ", recipe: C(0, 1, 0, 3) },
    lavender:   { name: "ラベンダー",   recipe: C(1, 0, 1, 3) },
    fukamidori: { name: "ふかみどり",   recipe: C(0, 1, 1, 0, 1) }
  };
  Object.keys(COLORS).forEach(function (key) {
    var c = COLORS[key];
    c.key = key;
    c.rgb = mix(c.recipe);
    c.hex = toHex(c.rgb);
    c.drops = c.recipe.reduce(function (s, n) { return s + n; }, 0);
  });

  /* おきゃくさん モードの ステージ 15こ
     paints = つかえる えのぐ */
  var STAGES = [
    // 2しょく まぜ
    { color: "daidai",     paints: "ryb",   animal: "🐰", who: "うさぎ" },
    { color: "midori",     paints: "ryb",   animal: "🐸", who: "かえる" },
    { color: "murasaki",   paints: "ryb",   animal: "🐱", who: "ねこ" },
    { color: "mikan",      paints: "ryb",   animal: "🐻", who: "くま" },
    { color: "kimidori",   paints: "ryb",   animal: "🐛", who: "いもむし" },
    { color: "aomurasaki", paints: "ryb",   animal: "🦉", who: "ふくろう" },
    // 3しょく
    { color: "chairo",     paints: "ryb",   animal: "🐶", who: "いぬ" },
    { color: "oudo",       paints: "ryb",   animal: "🦁", who: "らいおん" },
    { color: "azuki",      paints: "ryb",   animal: "🐿️", who: "りす" },
    // しろ / くろ で こさ ちょうせい
    { color: "pink",       paints: "rybwk", animal: "🐷", who: "ぶた" },
    { color: "sorairo",    paints: "rybwk", animal: "🐧", who: "ぺんぎん" },
    { color: "haiiro",     paints: "rybwk", animal: "🐘", who: "ぞう" },
    { color: "cream",      paints: "rybwk", animal: "🐥", who: "ひよこ" },
    { color: "fukamidori", paints: "rybwk", animal: "🐢", who: "かめ" },
    { color: "lavender",   paints: "rybwk", animal: "🦄", who: "ゆにこーん" }
  ];

  var IroColor = {
    PAINTS: PAINTS, IDX: IDX, CUBE: CUBE, COLORS: COLORS, STAGES: STAGES,
    STAR3: STAR3, STAR2: STAR2, STAR1: STAR1,
    rybToRgb: rybToRgb, mix: mix, toHex: toHex, fromHex: fromHex,
    rgbToLab: rgbToLab, deltaE: deltaE, stars: stars, hint: hint, bestPlan: bestPlan
  };
  if (typeof module !== "undefined" && module.exports) module.exports = IroColor;
  else root.IroColor = IroColor;
})(this);
