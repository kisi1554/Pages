/* ============================================================
   さんすう どうじょう — もんだい の え（みどり〜ちゃおび）
   ============================================================ */
(function (SD) {
  "use strict";
  var P = SD.pics, svg = P.svg, tx = P.tx, em = P.em;

  // 10 の たば と ばら（1年）
  P.sticks = function (tens, ones) {
    var w = Math.max(320, tens * 26 + 40 + Math.ceil(ones / 5) * 22 + 30), h = 120, s = "";
    for (var t = 0; t < tens; t++) {
      var x = 10 + t * 26;
      for (var k = 0; k < 10; k++) s += '<rect x="' + x + '" y="' + (8 + k * 10) + '" width="18" height="9" rx="2" fill="#f08c00" stroke="#c45f00"/>';
      s += '<rect x="' + (x - 1) + '" y="52" width="20" height="6" fill="#c92a2a" opacity=".8"/>';
    }
    var x0 = 30 + tens * 26;
    for (var o = 0; o < ones; o++) s += '<rect x="' + (x0 + Math.floor(o / 5) * 22) + '" y="' + (58 + (o % 5) * 12) + '" width="18" height="10" rx="2" fill="#ffd8a8" stroke="#c45f00"/>';
    return svg(w, h, s, "sticks");
  };
  // おかね（1円・10円・100円・1000）
  P.COIN = {
    1: { r: 11, fill: "#e9ecef", stroke: "#868e96", t: "1" },
    10: { r: 13, fill: "#e8a15a", stroke: "#a0522d", t: "10" },
    100: { r: 15, fill: "#dee2e6", stroke: "#495057", t: "100" },
    1000: { r: 16, fill: "#b2f2bb", stroke: "#2b8a3e", t: "1000", rect: 1 }
  };
  P.coin = function (v, x, y) {
    var c = P.COIN[v];
    if (c.rect) return '<rect x="' + (x - 22) + '" y="' + (y - 12) + '" width="44" height="24" rx="3" fill="' + c.fill + '" stroke="' + c.stroke + '" stroke-width="2"/>' + tx(x, y, c.t, 11, "#1b4d2b");
    return '<circle cx="' + x + '" cy="' + y + '" r="' + c.r + '" fill="' + c.fill + '" stroke="' + c.stroke + '" stroke-width="2"/>' + tx(x, y, c.t, c.t.length > 2 ? 9 : 11, "#3b2a1e");
  };
  P.coins = function (counts) { // {1000:a, 100:b, 10:c, 1:d}
    var cols = [1000, 100, 10, 1].filter(function (v) { return counts[v] != null; }), cw = 80, w = Math.max(320, cols.length * cw), h = 40 + 5 * 30, s = "";
    cols.forEach(function (v, i) {
      var x0 = i * cw + cw / 2;
      for (var k = 0; k < counts[v]; k++) s += P.coin(v, x0 + (k % 2 ? 18 : -18) * (v === 1000 ? 1.2 : 1), 20 + Math.floor(k / 2) * 30);
    });
    return svg(w, h, s, "coins");
  };

  // ひっ算（たて の しき）
  P.hissan = function (a, b, op) {
    var n = Math.max(String(a).length, String(b).length) + 1, cw = 40, w = n * cw + 20, h = 150, s = "";
    var put = function (num, y) { String(num).split("").reverse().forEach(function (d, i) { s += tx(10 + (n - 1 - i) * cw + cw / 2, y, d, 32); }); };
    put(a, 30); put(b, 76); s += tx(10 + cw / 2, 76, op === "-" ? "−" : "+", 30);
    s += '<line x1="6" y1="100" x2="' + (w - 6) + '" y2="100" stroke="#3b2a1e" stroke-width="3"/>';
    for (var i = 1; i < n; i++) s += '<rect x="' + (10 + i * cw + 4) + '" y="108" width="' + (cw - 8) + '" height="36" rx="5" fill="none" stroke="#d8c6b2" stroke-dasharray="4 3"/>';
    return svg(w, h, s, "hissanpic");
  };

  // ものさし（mm）と えんぴつ
  P.ruler = function (len, opt) {
    opt = opt || {};
    var cm = opt.cm || 12, k = 320 / (cm * 10), x0 = 12, w = 344, h = 104, s = "";
    if (len) {
      s += '<rect x="' + x0 + '" y="14" width="' + (len * k - 14) + '" height="16" fill="' + (opt.color || "#fab005") + '"/><path d="M' + (x0 + len * k - 14) + ' 14 l14 8 l-14 8 z" fill="#f1dcc0"/><path d="M' + (x0 + len * k - 4) + ' 20 l4 2 l-4 2 z" fill="#212529"/>';
    }
    s += '<rect x="4" y="40" width="' + (w - 8) + '" height="54" rx="4" fill="#fff9db" stroke="#c9a227" stroke-width="2"/>';
    for (var i = 0; i <= cm * 10; i++) {
      var x = x0 + i * k, tall = i % 10 === 0 ? 18 : i % 5 === 0 ? 12 : 7;
      s += '<line x1="' + x.toFixed(1) + '" y1="40" x2="' + x.toFixed(1) + '" y2="' + (40 + tall) + '" stroke="#3b2a1e" stroke-width="' + (i % 10 ? 0.8 : 1.6) + '"/>';
      if (i % 10 === 0) s += tx(x, 72, i / 10, 12, "#3b2a1e", "normal");
    }
    s += tx(w - 18, 86, "cm", 10, "#7a6555", "normal");
    return svg(w, h, s, "ruler");
  };

  // 1L ます と dL
  P.masu = function (L, dL) {
    var n = L + (dL ? 1 : 0), cw = 70, w = Math.max(320, n * (cw + 16) + 20), h = 150, s = "";
    for (var i = 0; i < n; i++) {
      var x = 14 + i * (cw + 16), full = i < L ? 10 : dL, lv = full * 11;
      s += '<rect x="' + x + '" y="12" width="' + cw + '" height="110" rx="4" fill="#f8f9fa" stroke="#495057" stroke-width="2.5"/>';
      s += '<rect x="' + (x + 2) + '" y="' + (122 - lv) + '" width="' + (cw - 4) + '" height="' + lv + '" fill="#74c0fc" opacity=".8"/>';
      for (var k = 1; k < 10; k++) s += '<line x1="' + x + '" y1="' + (122 - k * 11) + '" x2="' + (x + (k === 5 ? 22 : 12)) + '" y2="' + (122 - k * 11) + '" stroke="#495057"/>';
      s += tx(x + cw / 2, 138, "1L ます", 12, "#495057", "normal");
    }
    return svg(w, h, s, "masu");
  };

  // ひょう と グラフ（○ を つむ）
  P.graph = function (items, mode) {
    var cw = 56, w = Math.max(300, items.length * cw + 30), max = Math.max.apply(null, items.map(function (x) { return x.n; })), s = "";
    if (mode === "table") {
      var h0 = 90;
      items.forEach(function (it, i) {
        var x = 10 + i * cw;
        s += '<rect x="' + x + '" y="6" width="' + cw + '" height="38" fill="#fff4e6" stroke="#8b5e3c"/>' + em(x + cw / 2, 25, it.e, 24);
        s += '<rect x="' + x + '" y="44" width="' + cw + '" height="38" fill="#fff" stroke="#8b5e3c"/>' + tx(x + cw / 2, 63, it.n, 20);
      });
      return svg(w, h0, s, "table");
    }
    var h = 40 + max * 22;
    items.forEach(function (it, i) {
      var x = 10 + i * cw + cw / 2;
      for (var k = 0; k < it.n; k++) s += '<circle cx="' + x + '" cy="' + (h - 44 - k * 22) + '" r="9" fill="none" stroke="#1c7ed6" stroke-width="3"/>';
      s += em(x, h - 18, it.e, 24);
    });
    s += '<line x1="6" y1="' + (h - 33) + '" x2="' + (w - 6) + '" y2="' + (h - 33) + '" stroke="#3b2a1e" stroke-width="2"/>';
    return svg(w, h, s, "graph");
  };

  // おさら（○こ ずつ）と アレイ
  P.plates = function (per, n, e) {
    var cols = Math.min(n, 4), rows = Math.ceil(n / 4), pw = 80, w = Math.max(320, cols * pw + 10), h = rows * 74 + 6, s = "";
    for (var i = 0; i < n; i++) {
      var cx = 10 + (i % 4) * pw + pw / 2 - 5, cy = 40 + Math.floor(i / 4) * 74;
      s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="36" ry="30" fill="#fff" stroke="#adb5bd" stroke-width="3"/>';
      for (var k = 0; k < per; k++) { var a = k / per * Math.PI * 2, r = per === 1 ? 0 : 16; s += em(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, e, 15); }
    }
    return svg(w, h, s, "plates");
  };
  P.array = function (rows, cols, mark) {
    var g = Math.min(28, 300 / cols), w = cols * g + 20, h = rows * g + 20, s = "";
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) s += '<circle cx="' + (10 + c * g + g / 2) + '" cy="' + (10 + r * g + g / 2) + '" r="' + (g * 0.36) + '" fill="' + (mark != null && r < mark ? "#e8590c" : "#ffa94d") + '"/>';
    return svg(w, h, s, "array");
  };

  // かたち（てん の ならび）
  P.poly = function (pts, opt) {
    opt = opt || {};
    var g = opt.g || 26, w = (opt.cols || 6) * g + 10, h = (opt.rows || 5) * g + 10, s = "";
    if (opt.dots !== false) for (var y = 0; y < (opt.rows || 5); y++) for (var x = 0; x < (opt.cols || 6); x++) s += '<circle cx="' + (5 + x * g + g / 2) + '" cy="' + (5 + y * g + g / 2) + '" r="2" fill="#ced4da"/>';
    s += '<polygon points="' + pts.map(function (p) { return (5 + p[0] * g + g / 2) + "," + (5 + p[1] * g + g / 2); }).join(" ") + '" fill="' + (opt.fill || "#ffe8cc") + '" stroke="#e8590c" stroke-width="3" stroke-linejoin="round"/>';
    return svg(w, h, s, "poly");
  };

  // はこ（みとりず）と ひらいた かたち
  P.box = function (w0, h0, d0, opt) {
    opt = opt || {};
    var k = 14, W = w0 * k, Hh = h0 * k, D = d0 * k * 0.6, x = 20, y = 20 + D, s = "";
    s += '<polygon points="' + x + "," + y + " " + (x + W) + "," + y + " " + (x + W) + "," + (y + Hh) + " " + x + "," + (y + Hh) + '" fill="#ffd8a8" stroke="#8b5e3c" stroke-width="2.5"/>';
    s += '<polygon points="' + x + "," + y + " " + (x + D) + "," + (y - D) + " " + (x + W + D) + "," + (y - D) + " " + (x + W) + "," + y + '" fill="#ffe8cc" stroke="#8b5e3c" stroke-width="2.5"/>';
    s += '<polygon points="' + (x + W) + "," + y + " " + (x + W + D) + "," + (y - D) + " " + (x + W + D) + "," + (y - D + Hh) + " " + (x + W) + "," + (y + Hh) + '" fill="#f4b67a" stroke="#8b5e3c" stroke-width="2.5"/>';
    if (opt.dots) [[x, y], [x + W, y], [x + W, y + Hh], [x, y + Hh], [x + D, y - D], [x + W + D, y - D], [x + W + D, y - D + Hh]].forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#c92a2a"/>'; });
    return svg(W + D + 40, Hh + D + 40, s, "box");
  };
  P.NETS = {
    ok: [
      [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
      [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]],
      [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
      [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
      [[2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]]
    ],
    ng: [
      [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
      [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
      [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2]]
    ]
  };
  P.net = function (cells, size) {
    var g = size || 26, w = 0, h = 0, s = "";
    cells.forEach(function (c) { w = Math.max(w, (c[0] + 1) * g); h = Math.max(h, (c[1] + 1) * g); s += '<rect x="' + (4 + c[0] * g) + '" y="' + (4 + c[1] * g) + '" width="' + g + '" height="' + g + '" fill="#d0ebff" stroke="#1c7ed6" stroke-width="2"/>'; });
    return svg(w + 8, h + 8, s, "net");
  };

  // ぶんすう: かたち を k こ に わけて c こ ぬる（uneven: わけかた が ふぞろい）
  P.fracShape = function (shape, k, c, opt) {
    opt = opt || {};
    var W = opt.w || 120, s = "", col = "#ffa94d";
    if (shape === "tape") {
      var tw = opt.len || 110, x0 = 6, cuts = [];
      for (var i = 0; i <= k; i++) cuts.push(opt.uneven ? [0, 0.3, 0.55, 0.8, 1][i] || i / k : i / k);
      if (opt.uneven && k === 2) cuts = [0, 0.35, 1];
      for (var j = 0; j < k; j++) s += '<rect x="' + (x0 + cuts[j] * tw) + '" y="10" width="' + ((cuts[j + 1] - cuts[j]) * tw) + '" height="26" fill="' + (j < c ? col : "#fff") + '" stroke="#8b5e3c" stroke-width="2"/>';
      return svg(tw + 12, 46, s, "frac");
    }
    if (shape === "circle") {
      var R = 48, cx = 56, cy = 56;
      for (var q = 0; q < k; q++) {
        var a0 = (q / k) * Math.PI * 2 - Math.PI / 2, a1 = ((q + 1) / k) * Math.PI * 2 - Math.PI / 2;
        if (k === 1) s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="' + (c ? col : "#fff") + '" stroke="#8b5e3c" stroke-width="2"/>';
        else s += '<path d="M' + cx + " " + cy + " L" + (cx + R * Math.cos(a0)).toFixed(1) + " " + (cy + R * Math.sin(a0)).toFixed(1) + " A" + R + " " + R + " 0 " + (a1 - a0 > Math.PI ? 1 : 0) + " 1 " + (cx + R * Math.cos(a1)).toFixed(1) + " " + (cy + R * Math.sin(a1)).toFixed(1) + ' z" fill="' + (q < c ? col : "#fff") + '" stroke="#8b5e3c" stroke-width="2"/>';
      }
      return svg(112, 112, s, "frac");
    }
    // square: 2 → たて 半分、4 → たて よこ
    var S = 96, x = 8, y = 8, rects = [];
    if (k === 1) rects = [[0, 0, 1, 1]];
    if (k === 2) rects = opt.uneven ? [[0, 0, 0.3, 1], [0.3, 0, 0.7, 1]] : [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]];
    if (k === 3) rects = [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]];
    if (k === 4) rects = [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]];
    rects.forEach(function (r, i) { s += '<rect x="' + (x + r[0] * S) + '" y="' + (y + r[1] * S) + '" width="' + r[2] * S + '" height="' + r[3] * S + '" fill="' + (i < c ? col : "#fff") + '" stroke="#8b5e3c" stroke-width="2"/>'; });
    return svg(S + 16, S + 16, s, "frac");
  };
  SD.frac = function (n, d) { return '<span class="frac"><i>' + n + "</i><i>" + d + "</i></span>"; };

  // テープ図: parts [{v,c}], whole: 'ぜんたい' の ラベル
  P.tape = function (parts, whole, opt) {
    opt = opt || {};
    var tot = parts.reduce(function (s, p) { return s + p.w; }, 0), W = 300, k = W / tot, x = 20, s = "", y = 30;
    parts.forEach(function (p) {
      s += '<rect x="' + x + '" y="' + y + '" width="' + p.w * k + '" height="30" fill="' + (p.q ? "#fff4c4" : p.c || "#d0ebff") + '" stroke="#1c7ed6" stroke-width="2"/>' + tx(x + p.w * k / 2, y + 15, p.label, 17, p.q ? "#d9480f" : "#1c4f80");
      x += p.w * k;
    });
    s += '<path d="M20 ' + (y + 38) + " q0 10 10 10 h" + (W / 2 - 20) + " l10 8 l10 -8 h" + (W / 2 - 20) + " q10 0 10 -10" + '" fill="none" stroke="#495057" stroke-width="2"/>' + tx(20 + W / 2, y + 72, whole, 17, whole.indexOf("？") >= 0 ? "#d9480f" : "#3b2a1e");
    if (opt.second) {
      var y2 = y + 92, w2 = opt.second.w * k;
      s += '<rect x="20" y="' + y2 + '" width="' + w2 + '" height="30" fill="#ffe3e3" stroke="#e03131" stroke-width="2"/>' + tx(20 + w2 / 2, y2 + 15, opt.second.label, 17, "#a61e1e");
      return svg(W + 40, y2 + 40, s, "tape");
    }
    return svg(W + 40, y + 84, s, "tape");
  };
})(typeof window !== "undefined" ? window.SD : globalThis.SD);
