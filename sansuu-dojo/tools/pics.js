/* ============================================================
   さんすう どうじょう — もんだいの え（SVG の もじれつ。DOM なし）
   ============================================================ */
(function (SD) {
  "use strict";
  var P = SD.pics = {};
  var svg = function (w, h, body, cls) {
    return '<svg class="pic ' + (cls || "") + '" viewBox="0 0 ' + w + " " + h + '" xmlns="http://www.w3.org/2000/svg" role="img">' + body + "</svg>";
  };
  P.svg = svg;
  var em = function (x, y, e, size) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 40) + '" text-anchor="middle" dominant-baseline="central">' + e + "</text>";
  };
  P.em = em;
  var tx = function (x, y, s, size, fill, weight) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 24) + '" text-anchor="middle" dominant-baseline="central" fill="' + (fill || "#3b2a1e") + '" font-weight="' + (weight || "bold") + '">' + s + "</text>";
  };
  P.tx = tx;

  // かぞえる もの（5こ ずつ の まとまりで ならべる か、ばらばら）
  P.ITEMS = ["🍎", "🍊", "🍓", "🍙", "🐟", "🌷", "⭐", "🚃", "🐤", "🍩", "🎈", "🐞"];
  P.place = function (n, w, h, size, scatter, seed) {
    var pts = [];
    if (!scatter) {
      var cols = Math.min(5, n), rows = Math.ceil(n / 5), gx = w / 5.5, gy = Math.min(h / Math.max(rows, 1), size * 1.3);
      for (var i = 0; i < n; i++) {
        var r = Math.floor(i / 5), c = i % 5;
        pts.push([w / 2 + (c - (Math.min(5, n - r * 5) - 1) / 2) * gx, h / 2 + (r - (rows - 1) / 2) * gy]);
      }
      return pts;
    }
    var R = SD.rng(seed || n * 7919), tries = 0;
    while (pts.length < n && tries++ < 3000) {
      var x = size * 0.6 + R.next() * (w - size * 1.2), y = size * 0.6 + R.next() * (h - size * 1.2);
      if (pts.every(function (p) { return Math.hypot(p[0] - x, p[1] - y) > size * 1.05; })) pts.push([x, y]);
    }
    return pts;
  };
  P.group = function (e, n, opt) {
    opt = opt || {};
    var w = opt.w || 320, h = opt.h || (n > 5 ? 150 : 90), size = opt.size || 40;
    var body = P.place(n, w, h, size, opt.scatter, opt.seed).map(function (p) { return em(p[0], p[1], e, size); }).join("");
    if (n === 0) body = '<ellipse cx="' + w / 2 + '" cy="' + h / 2 + '" rx="70" ry="22" fill="#fff" stroke="#c9b29b" stroke-width="3"/>' + tx(w / 2, h / 2 + 34, "（からっぽ）", 15, "#8a7360", "normal");
    return svg(w, h + (n === 0 ? 20 : 0), body);
  };
  // 2つの なかま（ひだり と みぎ）
  P.two = function (e1, a, e2, b, opt) {
    opt = opt || {};
    var w = 330, size = 34;
    var rows = Math.max(Math.ceil(a / 5), Math.ceil(b / 5), 1), h = Math.max(80, rows * 42 + 20);
    var one = function (e, n, x0) {
      var s = "";
      for (var i = 0; i < n; i++) s += em(x0 + (i % 5) * 30 + 15, 22 + Math.floor(i / 5) * 42, e, size);
      return s;
    };
    var body = one(e1, a, 2) + (opt.op ? tx(w / 2, h / 2 - 8, opt.op, 30, "#0b7285") : '<line x1="165" y1="6" x2="165" y2="' + (h - 6) + '" stroke="#e2d3c3" stroke-width="3" stroke-dasharray="6 6"/>') + one(e2, b, 178);
    return svg(w, h, body);
  };
  // 2れつ（くらべる。ならべて いない ときは かんかく が ばらばら）
  P.rows = function (e1, a, e2, b, aligned, seed) {
    var w = 340, gap = 32, h = 104, R = SD.rng(seed || a * 31 + b);
    var row = function (e, n, y, spread) {
      var s = "", x = 22;
      for (var i = 0; i < n; i++) { s += em(x, y, e, 30); x += aligned ? gap : (spread ? 22 + R.next() * 26 : 30); }
      return s;
    };
    return svg(w, h, row(e1, a, 26, !aligned && a < b) + row(e2, b, 78, !aligned && b < a));
  };

  // 10の わく（●の かず、かくす ばしょ）
  P.frame = function (n, opt) {
    opt = opt || {};
    var frames = opt.frames || Math.max(1, Math.ceil(n / 10)), cell = 30, pad = 6, fw = cell * 5 + pad * 2, gap = 14;
    var w = frames * fw + (frames - 1) * gap, h = cell * 2 + pad * 2, s = "";
    for (var f = 0; f < frames; f++) {
      var x0 = f * (fw + gap);
      s += '<rect x="' + x0 + '" y="0" width="' + fw + '" height="' + h + '" rx="6" fill="#fff" stroke="#8b5e3c" stroke-width="2"/>';
      for (var i = 0; i < 10; i++) {
        var cx = x0 + pad + (i % 5) * cell + cell / 2, cy = pad + Math.floor(i / 5) * cell + cell / 2, k = f * 10 + i;
        s += '<rect x="' + (cx - cell / 2) + '" y="' + (cy - cell / 2) + '" width="' + cell + '" height="' + cell + '" fill="none" stroke="#e2d3c3"/>';
        if (k < n) s += '<rect x="' + (cx - 12) + '" y="' + (cy - 12) + '" width="24" height="24" rx="5" fill="' + (opt.colorB && k >= opt.splitAt ? opt.colorB : (opt.color || "#e8590c")) + '"/>';
      }
    }
    return svg(w, h, s, "frame");
  };
  // いくつ と いくつ: T この うち a こ みえて、のこりは ？の ふた
  P.decomp = function (T, a) {
    var cell = 34, w = T * cell + 20, h = 76, s = "";
    for (var i = 0; i < T; i++) {
      var x = 10 + i * cell;
      s += '<rect x="' + (x + 3) + '" y="12" width="' + (cell - 6) + '" height="' + (cell - 6) + '" rx="6" fill="' + (i < a ? "#e8590c" : "#ffd8a8") + '"/>';
    }
    var cx = 10 + a * cell, cw = (T - a) * cell;
    if (T - a > 0) s += '<rect x="' + (cx + 1) + '" y="4" width="' + (cw - 2) + '" height="' + (cell + 8) + '" rx="10" fill="#8b5e3c"/>' + tx(cx + cw / 2, 4 + (cell + 8) / 2, "？", 26, "#fff");
    s += tx(w / 2, h - 12, "ぜんぶで " + T, 16, "#7a6555");
    return svg(w, h, s, "decomp");
  };

  // さくらんぼ けいさん（10を つくる）: [上の かず, わける かず の いち, ...]
  P.cherry = function (a, b, x, y, op) {
    // a op b を、b を x と y に わける
    var w = 260, h = 120, s = "";
    s += tx(50, 26, a, 30) + tx(95, 26, op || "+", 30) + tx(140, 26, b, 30) + tx(185, 26, "=", 30);
    s += '<path d="M140 44 L118 78 M140 44 L162 78" stroke="#c2255c" stroke-width="3" fill="none"/>';
    s += '<circle cx="114" cy="94" r="18" fill="#ffe3ec" stroke="#c2255c" stroke-width="3"/>' + tx(114, 94, x, 22);
    s += '<circle cx="166" cy="94" r="18" fill="#ffe3ec" stroke="#c2255c" stroke-width="3"/>' + tx(166, 94, y, 22);
    return svg(w, h, s, "cherry");
  };

  // ならんだ どうぶつ（ひだりが まえ）
  P.ANIMALS = ["🐶", "🐱", "🐰", "🐻", "🐼", "🦊", "🐸", "🐵", "🐷", "🐨"];
  P.line = function (list, mark) {
    var gap = 40, w = Math.max(320, list.length * gap + 70), h = 96, s = "";
    s += '<path d="M14 70 L14 18 L40 26 L14 34" fill="#e03131" stroke="#8b5e3c" stroke-width="3"/>' + tx(24, 86, "まえ", 13, "#8a7360");
    list.forEach(function (e, i) { s += em(64 + i * gap, 52, e, 34); if (mark === i) s += '<circle cx="' + (64 + i * gap) + '" cy="52" r="21" fill="none" stroke="#f08c00" stroke-width="4"/>'; });
    return svg(w, h, s);
  };

  /* ---------- とけい ---------- */
  P.clockFace = function (opt) {
    opt = opt || {};
    var s = '<circle cx="0" cy="0" r="96" fill="#fffdf5" stroke="#8b5e3c" stroke-width="7"/>';
    for (var i = 0; i < 60; i++) {
      var a = i * 6 * Math.PI / 180, big = i % 5 === 0;
      var r1 = big ? 80 : 85, r2 = 90;
      s += '<line x1="' + (Math.sin(a) * r1).toFixed(1) + '" y1="' + (-Math.cos(a) * r1).toFixed(1) + '" x2="' + (Math.sin(a) * r2).toFixed(1) + '" y2="' + (-Math.cos(a) * r2).toFixed(1) + '" stroke="#5d3f2a" stroke-width="' + (big ? 3 : 1.2) + '"/>';
    }
    for (var h = 1; h <= 12; h++) {
      var b = h * 30 * Math.PI / 180;
      s += '<text x="' + (Math.sin(b) * 66).toFixed(1) + '" y="' + (-Math.cos(b) * 66).toFixed(1) + '" font-size="19" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="#3b2a1e">' + h + "</text>";
      if (opt.minutes) s += '<text x="' + (Math.sin(b) * 106).toFixed(1) + '" y="' + (-Math.cos(b) * 106).toFixed(1) + '" font-size="10" text-anchor="middle" dominant-baseline="central" fill="#1c7ed6">' + (h * 5 % 60) + "</text>";
    }
    return s;
  };
  P.hands = function (h, m) {
    var A = SD.M.handAngles(h, m);
    return '<g class="hh" transform="rotate(' + A.hour + ')"><line x1="0" y1="10" x2="0" y2="-48" stroke="#c92a2a" stroke-width="9" stroke-linecap="round"/></g>' +
      '<g class="mh" transform="rotate(' + A.minute + ')"><line x1="0" y1="12" x2="0" y2="-80" stroke="#1c7ed6" stroke-width="5" stroke-linecap="round"/></g>' +
      '<circle r="7" fill="#3b2a1e"/>';
  };
  P.clock = function (h, m, opt) {
    opt = opt || {};
    var pad = opt.minutes ? 118 : 102;
    return svg(pad * 2, pad * 2, '<g transform="translate(' + pad + "," + pad + ')">' + P.clockFace(opt) + P.hands(h, m) + "</g>", "clock");
  };

  /* ---------- ながさ・かさ・ひろさ ---------- */
  var RIB = { red: ["#e03131", "あか"], blue: ["#1c7ed6", "あお"], green: ["#2f9e44", "みどり"] };
  P.RIB = RIB;
  // リボン: [{c:'red', len:5, off:0}], unit: クリップ の ながさ(px)。clips: クリップを ならべて みせる
  P.ribbons = function (list, opt) {
    opt = opt || {};
    var u = opt.unit || 30, w = 340, h = list.length * 54 + 10, s = "";
    list.forEach(function (r, i) {
      var y = 14 + i * 54, x = 12 + (r.off || 0) * u;
      s += '<rect x="' + x + '" y="' + y + '" width="' + r.len * u + '" height="18" rx="4" fill="' + RIB[r.c][0] + '"/>';
      if (opt.clips) for (var k = 0; k < r.len; k++) s += '<rect x="' + (x + k * u + 3) + '" y="' + (y + 22) + '" width="' + (u - 6) + '" height="12" rx="6" fill="none" stroke="#868e96" stroke-width="2.5"/>';
    });
    if (opt.aligned) s = '<line x1="12" y1="4" x2="12" y2="' + (h - 4) + '" stroke="#adb5bd" stroke-dasharray="4 4"/>' + s;
    return svg(w, h, s, "ribbons");
  };
  // コップ に うつした みず: [a, b] はいぶん
  P.cups = function (a, b) {
    var w = 340, h = 120, s = "";
    var cup = function (x, n, col, lab) {
      var t = "";
      for (var i = 0; i < n; i++) {
        var cx = x + (i % 5) * 30, cy = 18 + Math.floor(i / 5) * 46;
        t += '<path d="M' + (cx) + " " + cy + " l4 34 h16 l4 -34 z" + '" fill="#d0ebff" stroke="#1c7ed6" stroke-width="2"/><rect x="' + (cx + 3) + '" y="' + (cy + 10) + '" width="18" height="22" fill="' + col + '" opacity=".55"/>';
      }
      return t + tx(x + 70, h - 10, lab, 15, col);
    };
    s += cup(8, a, "#e03131", "あかい ポット") + cup(178, b, "#1c7ed6", "あおい ポット");
    return svg(w, h, s, "cups");
  };
  // ますめ の かたち（ひろさ）。cells: [[x,y],...]
  P.grid = function (shapes) {
    var c = 22, w = 340, h = 0, s = "";
    shapes.forEach(function (sh, i) {
      var x0 = 14 + i * 170;
      sh.cells.forEach(function (p) {
        s += '<rect x="' + (x0 + p[0] * c) + '" y="' + (10 + p[1] * c) + '" width="' + c + '" height="' + c + '" fill="' + RIB[sh.c][0] + '" fill-opacity=".35" stroke="' + RIB[sh.c][0] + '" stroke-width="1.5"/>';
        h = Math.max(h, 10 + (p[1] + 1) * c);
      });
    });
    return svg(w, h + 10, s, "grid");
  };

  // すうちょくせん（□ の ところ）
  P.numline = function (from, to, step, blanks, marks) {
    var w = 340, h = 70, n = (to - from) / step, gx = (w - 30) / n, s = '<line x1="10" y1="30" x2="' + (w - 6) + '" y2="30" stroke="#3b2a1e" stroke-width="3"/>';
    for (var i = 0; i <= n; i++) {
      var v = from + i * step, x = 15 + i * gx;
      s += '<line x1="' + x + '" y1="22" x2="' + x + '" y2="38" stroke="#3b2a1e" stroke-width="2"/>';
      if (blanks && blanks.indexOf(v) >= 0) s += '<rect x="' + (x - 15) + '" y="44" width="30" height="24" rx="4" fill="#fff4c4" stroke="#f08c00" stroke-width="2"/>' + tx(x, 56, "□", 18, "#f08c00");
      else if (!marks || marks.indexOf(v) >= 0) s += tx(x, 56, v, n > 12 ? 11 : 15);
    }
    return svg(w, h, s, "nl");
  };
})(typeof window !== "undefined" ? window.SD : globalThis.SD);
