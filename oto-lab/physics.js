/* ============================================================
   おとの ふしぎ ラボ — おとの けいさん（ブラウザ と node の りょうほうで うごく）
   すうちは README の 出典 を 参照。こどもに みせる ときは「やく」を つける
   ============================================================ */
(function (root) {
  "use strict";

  // ---- おとの はやさ ----
  // 空気: やく 331.5 + 0.6 × 気温(℃) m/秒。15℃ で やく 340 m/秒（学校では 340 を つかう）
  var SPEED_AIR = 340;
  var SPEED_WATER = 1500; // 水中: やく 1500 m/秒（水温・塩分で すこし かわる）
  function speedAir(tempC) { return 331.5 + 0.6 * tempC; }

  // ---- げん（わゴム）: メルセンヌの 法則 f = (1 / 2L) √(T / μ) ----
  // len: はしら から くぎ までの ながさ（1 = いちばん ながい）、tension: はりの つよさ（1 = ゆるめ）
  var STRING_BASE = 196; // len 1・tension 1 の とき（ソ3 くらい）
  function stringFreq(len, tension) {
    return STRING_BASE / len * Math.sqrt(tension);
  }
  // はじく つよさ は ふるえの おおきさ（ふりはば）だけを かえる。たかさ は かわらない
  function pluckAmp(strength) { return clamp(strength, 0, 1); }

  // ---- コップ ----
  // たたく: 水が ふえると ふるえる おもさが ふえて ひくく なる
  //   A. P. French (1983) の しき f = f0 / √(1 + α (h/H)^4)
  var GLASS_F0 = 1000, GLASS_ALPHA = 3; // からっぽ 1000Hz → いっぱい 500Hz（1オクターブ）
  function glassStrikeFreq(fill) {
    var x = clamp(fill, 0, 1);
    return GLASS_F0 / Math.sqrt(1 + GLASS_ALPHA * Math.pow(x, 4));
  }
  // ぎゃくに、ほしい たかさ に する 水の りょう（とどかなければ null）
  function fillForStrike(freq) {
    var r = GLASS_F0 / freq, v = (r * r - 1) / GLASS_ALPHA;
    if (v < 0 || v > 1) return null;
    return Math.pow(v, 0.25);
  }
  // ふく: コップの 中の 空気の 柱 が ふるえる（かたほう が とじた くだ f = c / 4L）
  //   水が ふえると 空気の 柱 が みじかく なって たかく なる（たたく ときと ぎゃく）
  var GLASS_H = 0.12, GLASS_END = 0.018; // コップの ふかさ 12cm・口の ほせい（0.6 × 半径 3cm）
  function glassBlowFreq(fill) {
    var air = GLASS_H * (1 - clamp(fill, 0, 1)) + GLASS_END;
    return SPEED_AIR / (4 * air);
  }

  // ---- ドレミ（ド5 〜 ラ5 ）と かえるのうた ----
  var NOTES = [
    { n: "ド", f: 523.25 }, { n: "レ", f: 587.33 }, { n: "ミ", f: 659.26 },
    { n: "ファ", f: 698.46 }, { n: "ソ", f: 783.99 }, { n: "ラ", f: 880.0 }
  ];
  // 0=ド 1=レ 2=ミ 3=ファ 4=ソ 5=ラ。[おと, ながさ(はく)]
  var KAERU = [
    [0, 1], [1, 1], [2, 1], [3, 1], [2, 1], [1, 1], [0, 2],
    [2, 1], [3, 1], [4, 1], [5, 1], [4, 1], [3, 1], [2, 2],
    [0, 2], [0, 2], [0, 2], [0, 2],
    [0, .5], [0, .5], [1, .5], [1, .5], [2, .5], [2, .5], [3, .5], [3, .5], [2, 1], [1, 1], [0, 2]
  ];
  function cents(f, ref) { return 1200 * Math.log(f / ref) / Math.LN2; }
  // いちばん ちかい ドレミ（±tol セント いない なら それを かえす）
  function nearestNote(f, tol) {
    var best = -1, bd = 1e9;
    NOTES.forEach(function (n, i) { var d = Math.abs(cents(f, n.f)); if (d < bd) { bd = d; best = i; } });
    return bd <= (tol == null ? 30 : tol) ? best : -1;
  }

  // ---- きょり と じかん ----
  function thunderDistance(sec) { return sec * SPEED_AIR; }        // ひかりは ほぼ すぐ とどく
  function echoDelay(dist) { return 2 * dist / SPEED_AIR; }        // いって かえる
  function travelTime(dist, medium) {
    if (medium === "space") return Infinity;                       // 空気が ないので つたわらない
    return dist / (medium === "water" ? SPEED_WATER : SPEED_AIR);
  }

  // ---- 音量の 上限（みみを まもる）----
  var MAX_GAIN = 0.5;
  function volumeGain(v) { return clamp(+v || 0, 0, 1) * MAX_GAIN; }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var api = {
    SPEED_AIR: SPEED_AIR, SPEED_WATER: SPEED_WATER, speedAir: speedAir,
    STRING_BASE: STRING_BASE, stringFreq: stringFreq, pluckAmp: pluckAmp,
    GLASS_F0: GLASS_F0, glassStrikeFreq: glassStrikeFreq, fillForStrike: fillForStrike, glassBlowFreq: glassBlowFreq,
    NOTES: NOTES, KAERU: KAERU, cents: cents, nearestNote: nearestNote,
    thunderDistance: thunderDistance, echoDelay: echoDelay, travelTime: travelTime,
    MAX_GAIN: MAX_GAIN, volumeGain: volumeGain, clamp: clamp
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.OtoPhys = api;
})(typeof window !== "undefined" ? window : globalThis);
