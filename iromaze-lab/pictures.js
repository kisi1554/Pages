/* ============================================================
   いろまぜ ラボ — ぬりえの せんが（SVG を コードで かく）
   viewBox 0 0 400 300。f:true の ぶひんは タップで ぬれる。
   うしろ から じゅんに かく（はいけい → まえ）
   ============================================================ */
(function (root) {
  "use strict";

  function P(id, d, f) { return { tag: "path", id: id, d: d, f: f !== false }; }
  function Cc(id, cx, cy, r, f) { return { tag: "circle", id: id, cx: cx, cy: cy, r: r, f: f !== false }; }
  function R(id, x, y, w, h, rx, f) { return { tag: "rect", id: id, x: x, y: y, w: w, h: h, rx: rx || 0, f: f !== false }; }
  function L(d) { return { tag: "path", d: d, f: false, line: true }; }

  /* はなびら 6まい */
  function petals() {
    var out = [];
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3, cx = 200 + Math.cos(a) * 38, cy = 110 + Math.sin(a) * 38;
      out.push({ tag: "ellipse", id: "petal" + i, cx: +cx.toFixed(1), cy: +cy.toFixed(1), rx: 30, ry: 20,
        rot: +(a * 180 / Math.PI).toFixed(1), f: true });
    }
    return out;
  }

  var PICTURES = [
    {
      key: "densha", name: "でんしゃ", emoji: "🚃",
      parts: [
        R("sky", 0, 0, 400, 300),
        R("ground", 0, 236, 400, 64),
        L("M0 252 H400 M0 276 H400"),
        L("M150 70 L180 40 L210 70 M165 40 H195"),
        R("body", 40, 70, 320, 150, 26),
        R("stripe", 40, 170, 320, 22),
        R("win1", 64, 92, 56, 50, 8),
        R("win2", 136, 92, 56, 50, 8),
        R("door", 210, 92, 50, 108, 6),
        R("win3", 276, 92, 60, 50, 8),
        Cc("light", 342, 196, 9),
        Cc("wheel1", 100, 228, 22),
        Cc("wheel2", 300, 228, 22),
        Cc("hub1", 100, 228, 8),
        Cc("hub2", 300, 228, 8)
      ]
    },
    {
      key: "sakana", name: "さかな", emoji: "🐟",
      parts: [
        R("water", 0, 0, 400, 300),
        P("sand", "M0 250 Q100 230 200 250 T400 245 V300 H0 Z"),
        P("weed1", "M40 260 Q20 210 45 170 Q65 130 40 90 Q75 130 62 175 Q50 215 64 258 Z"),
        P("weed2", "M350 262 Q330 220 352 190 Q370 160 350 130 Q385 165 372 195 Q360 225 372 260 Z"),
        P("tail", "M270 140 L340 90 Q326 140 340 190 Z"),
        P("body", "M90 140 Q160 60 270 140 Q160 220 90 140 Z"),
        P("fin", "M170 112 Q190 70 228 108 Z"),
        P("belly", "M120 160 Q170 190 230 160 Q175 176 120 160 Z"),
        Cc("eye", 130, 132, 13),
        Cc("pupil", 127, 131, 5),
        Cc("bub1", 70, 90, 10),
        Cc("bub2", 56, 58, 7),
        Cc("bub3", 74, 32, 5)
      ]
    },
    {
      key: "hana", name: "はな", emoji: "🌷",
      parts: [
        R("sky", 0, 0, 400, 300),
        P("ground", "M0 240 Q200 220 400 240 V300 H0 Z"),
        Cc("sun", 340, 50, 30),
        P("stem", "M194 140 H206 V256 H194 Z"),
        P("leaf1", "M200 220 Q150 180 120 200 Q150 240 200 220 Z"),
        P("leaf2", "M200 200 Q250 160 284 178 Q252 222 200 200 Z")
      ].concat(petals()).concat([
        Cc("center", 200, 110, 26),
        P("bee", "M60 70 a18 13 0 1 0 36 0 a18 13 0 1 0 -36 0 Z"),
        L("M70 59 V81 M82 58 V82")
      ])
    },
    {
      key: "ie", name: "おうち", emoji: "🏠",
      parts: [
        R("sky", 0, 0, 400, 300),
        R("ground", 0, 240, 400, 60),
        Cc("sun", 60, 56, 30),
        P("cloud", "M250 70 a20 20 0 0 1 36 -14 a24 24 0 0 1 44 8 a18 18 0 0 1 4 34 H258 a18 18 0 0 1 -8 -28 Z"),
        R("chimney", 250, 70, 30, 60),
        R("wall", 110, 140, 180, 110),
        P("roof", "M90 145 L200 66 L310 145 Z"),
        R("door", 182, 180, 40, 70, 6),
        R("win1", 128, 162, 40, 40, 4),
        R("win2", 236, 162, 40, 40, 4),
        L("M148 162 V202 M128 182 H168 M256 162 V202 M236 182 H276"),
        Cc("knob", 214, 216, 4),
        P("bush", "M310 250 a18 18 0 0 1 20 -26 a20 20 0 0 1 36 4 a16 16 0 0 1 14 22 Z")
      ]
    }
  ];

  var Pictures = { PICTURES: PICTURES };
  if (typeof module !== "undefined" && module.exports) module.exports = Pictures;
  else root.Pictures = Pictures;
})(this);
