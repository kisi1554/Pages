/* ============================================================
   ⑤ どれが いちばん はねる？ — ボール・ゆか・はねかえりけいすう の データ
   もどる たかさ ≒ けいすう² × おとした たかさ（すうちは「だいたい」）
   ============================================================ */
(function (root) {
  "use strict";
  var BALLS = [
    { id: "super", name: "スーパーボール", r: 15, col: "#f03e3e" },
    { id: "gomu", name: "ゴムボール", r: 24, col: "#f783ac" },
    { id: "tennis", name: "テニスボール", r: 20, col: "#c0eb75" },
    { id: "pingpong", name: "ピンポンだま", r: 13, col: "#ffffff" },
    { id: "bowling", name: "ボウリングの たま", r: 32, col: "#364fc7" }
  ];
  var FLOORS = [
    { id: "concrete", name: "コンクリート", ic: "🧱" },
    { id: "wood", name: "フローリング", ic: "🪵" },
    { id: "tatami", name: "たたみ", ic: "🟩" },
    { id: "futon", name: "ふとん", ic: "🛏️" },
    { id: "tramp", name: "トランポリン", ic: "🤸" }
  ];
  // はねかえりけいすう（ボール × ゆか）。もどる たかさ ≒ けいすう² × おとした たかさ
  var E = {
    super:    { concrete: 0.90, wood: 0.88, tatami: 0.68, futon: 0.30, tramp: 0.93 },
    gomu:     { concrete: 0.78, wood: 0.75, tatami: 0.55, futon: 0.25, tramp: 0.86 },
    tennis:   { concrete: 0.74, wood: 0.71, tatami: 0.50, futon: 0.22, tramp: 0.82 },
    pingpong: { concrete: 0.88, wood: 0.85, tatami: 0.58, futon: 0.15, tramp: 0.78 },
    bowling:  { concrete: 0.12, wood: 0.18, tatami: 0.08, futon: 0.03, tramp: 0.62 }
  };

  var api = { BALLS: BALLS, FLOORS: FLOORS, E: E };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SBHazumu = api;
})(typeof self !== "undefined" ? self : this);
