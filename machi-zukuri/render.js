/* ============================================================
   まちづくり — え を かく（Canvas）
   ・bg: じめん・みち・せんろ・たてもの（みる ばしょ や まち が かわった とき だけ かきなおす）
   ・fg: ひと・くるま・でんしゃ・できごと・ふきだし（まいコマ）
   ・たてもの は ななめうえ から みた はこ（したの ぎょう ほど まえ に かく）。
   ・ちず モード は ちずきごう（kigou.js ＝ chizu-takara と おなじ かたち）で かく。
   ============================================================ */
(function (root) {
  "use strict";

  var D = root.MACHI_DATA, O = D.OBJ_ID, C = root.MACHI_CITY, K = root.CHIZU_SYMBOLS;
  var T = 32; // 1マス の おおきさ（せかい の px）
  var EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  var FONT = '"Hiragino Maru Gothic ProN","BIZ UDPGothic","Yu Gothic","Meiryo",system-ui,sans-serif';

  function hash(i) { i = (i ^ 61) ^ (i >>> 16); i = i + (i << 3); i = i ^ (i >>> 4); i = Math.imul(i, 0x27d4eb2d); return (i ^ (i >>> 15)) >>> 0; }

  // ちずきごう の え を Image に して おく
  var KIMG = {};
  function kigouImg(id, cb) {
    if (KIMG[id]) return KIMG[id];
    var im = new Image();
    im.onload = function () { im.ready = true; if (cb) cb(); };
    im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(K.svg(id, { bg: false }));
    KIMG[id] = im;
    return im;
  }

  function Renderer(bg, fg, onReady) {
    this.bg = bg; this.fg = fg;
    this.b = bg.getContext("2d"); this.f = fg.getContext("2d");
    this.view = { s: 1, ox: 0, oy: 0 };
    this.dpr = 1; this.W = 0; this.H = 0;
    this.map = false;
    var n = 0;
    ["post", "school", "hospital", "fire", "police", "koban", "library", "factory", "field", "broad"].forEach(function (id) { kigouImg(id, function () { if (onReady) onReady(); }); n++; });
  }
  var R = Renderer.prototype;
  Renderer.T = T;

  R.resize = function (w, h) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = w; this.H = h;
    [this.bg, this.fg].forEach(function (cv) {
      cv.width = Math.round(w * this.dpr); cv.height = Math.round(h * this.dpr);
      cv.style.width = w + "px"; cv.style.height = h + "px";
    }, this);
  };
  R.toWorld = function (sx, sy) { var v = this.view; return { x: (sx - v.ox) / v.s / T, y: (sy - v.oy) / v.s / T }; };
  R.toScreen = function (tx, ty) { var v = this.view; return { x: tx * T * v.s + v.ox, y: ty * T * v.s + v.oy }; };
  R.fit = function (c, pad) {
    pad = pad == null ? 12 : pad;
    var s = Math.min((this.W - pad * 2) / (c.w * T), (this.H - pad * 2) / (c.h * T));
    this.view.s = s;
    this.view.ox = (this.W - c.w * T * s) / 2; this.view.oy = (this.H - c.h * T * s) / 2;
  };
  R.clamp = function (c) {
    var v = this.view, minS = Math.min(this.W / (c.w * T), this.H / (c.h * T)) * 0.6;
    v.s = Math.max(minS, Math.min(4, v.s));
    var ww = c.w * T * v.s, hh = c.h * T * v.s, m = 80;
    v.ox = Math.min(this.W - m, Math.max(m - ww, v.ox));
    v.oy = Math.min(this.H - m, Math.max(m - hh, v.oy));
  };
  R.range = function (c, extra) {
    var a = this.toWorld(0, 0), b = this.toWorld(this.W, this.H), e = extra || 1;
    return { x0: Math.max(0, Math.floor(a.x) - e), y0: Math.max(0, Math.floor(a.y) - e), x1: Math.min(c.w - 1, Math.ceil(b.x) + e), y1: Math.min(c.h - 1, Math.ceil(b.y) + e + 1) };
  };
  R.setT = function (ctx) { var v = this.view, d = this.dpr; ctx.setTransform(d * v.s, 0, 0, d * v.s, d * v.ox, d * v.oy); };

  // ================= bg =================
  R.drawBG = function (c, light) {
    var g = this.b, d = this.dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = this.map ? "#e9e4d6" : "#7fae55";
    g.fillRect(0, 0, this.bg.width, this.bg.height);
    this.setT(g);
    var r = this.range(c, 1);
    if (this.map) { this.drawMap(c, r); return; }
    var x, y, i;
    // じめん
    for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) {
      i = y * c.w + x;
      if (c.base[i]) { g.fillStyle = "#5bb8ec"; g.fillRect(x * T - 0.3, y * T - 0.3, T + 0.6, T + 0.6); }
      else { var hv = hash(i) % 3; g.fillStyle = hv === 0 ? "#a6d36a" : hv === 1 ? "#a0ce64" : "#abd770"; g.fillRect(x * T - 0.3, y * T - 0.3, T + 0.6, T + 0.6); }
    }
    // かわ の きし と なみ
    for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) {
      i = y * c.w + x;
      if (!c.base[i]) continue;
      var m = C.mask(c, "base", i);
      g.fillStyle = "#e9d8a6";
      if (!(m & 1)) g.fillRect(x * T, y * T, T, 3);
      if (!(m & 4)) g.fillRect(x * T, y * T + T - 3, T, 3);
      if (!(m & 8)) g.fillRect(x * T, y * T, 3, T);
      if (!(m & 2)) g.fillRect(x * T + T - 3, y * T, 3, T);
      g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1.4;
      var hx = hash(i) % 12;
      g.beginPath(); g.moveTo(x * T + 6 + hx, y * T + 11); g.quadraticCurveTo(x * T + 10 + hx, y * T + 8, x * T + 14 + hx, y * T + 11); g.stroke();
      g.beginPath(); g.moveTo(x * T + 4 + (11 - hx), y * T + 23); g.quadraticCurveTo(x * T + 8 + (11 - hx), y * T + 20, x * T + 12 + (11 - hx), y * T + 23); g.stroke();
    }
    // みち
    for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) { i = y * c.w + x; if (c.road[i]) this.road(g, c, i, x, y); }
    // せんろ
    for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) { i = y * c.w + x; if (c.rail[i]) this.rail(g, c, i, x, y); }
    // たてもの（うえ の ぎょう から）
    for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) { i = y * c.w + x; if (c.obj[i]) this.obj(g, c, i, x, y, light); }
    // よる
    if (light < 0.98) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "rgba(18,26,68," + (0.6 * (1 - light)).toFixed(3) + ")";
      g.fillRect(0, 0, this.bg.width, this.bg.height);
      this.setT(g);
      if (light < 0.6) this.lights(g, c, r, 1 - light / 0.6);
    }
    void d;
  };

  function arms(g, m, x, y, w, col) {
    var a = (T - w) / 2;
    g.fillStyle = col;
    g.fillRect(x * T + a, y * T + a, w, w);
    if (m & 1) g.fillRect(x * T + a, y * T - 0.4, w, a + 0.8);
    if (m & 4) g.fillRect(x * T + a, y * T + a + w - 0.4, w, a + 0.8);
    if (m & 8) g.fillRect(x * T - 0.4, y * T + a, a + 0.8, w);
    if (m & 2) g.fillRect(x * T + a + w - 0.4, y * T + a, a + 0.8, w);
  }
  function nArms(m) { return (m & 1) + (m >> 1 & 1) + (m >> 2 & 1) + (m >> 3 & 1); }

  R.road = function (g, c, i, x, y) {
    var m = C.mask(c, "road", i), w = T * 0.66;
    var bridge = c.base[i];
    if (bridge) { // はし の らんかん
      arms(g, m, x, y, w + 6, "#b07a45");
    } else arms(g, m, x, y, w + 3, "#d6d0c4"); // ほどう
    arms(g, m, x, y, w, "#6f7680");
    var cx = x * T + T / 2, cy = y * T + T / 2, n = nArms(m);
    g.strokeStyle = "#fff"; g.lineWidth = 1.6; g.setLineDash([4, 4]);
    g.beginPath();
    if (m === 5 || m === 1 || m === 4) { g.moveTo(cx, y * T + 2); g.lineTo(cx, y * T + T - 2); }
    else if (m === 10 || m === 2 || m === 8) { g.moveTo(x * T + 2, cy); g.lineTo(x * T + T - 2, cy); }
    g.stroke(); g.setLineDash([]);
    if (n >= 3 && !c.rail[i]) { // おうだんほどう
      g.fillStyle = "rgba(255,255,255,.85)";
      var a = (T - w) / 2;
      for (var k = 0; k < 4; k++) {
        if (!(m & (1 << k))) continue;
        for (var s = 0; s < 4; s++) {
          var p = a + 2 + s * (w - 4) / 4;
          if (k === 0) g.fillRect(x * T + p, y * T + 1, 3, 4);
          if (k === 2) g.fillRect(x * T + p, y * T + T - 5, 3, 4);
          if (k === 3) g.fillRect(x * T + 1, y * T + p, 4, 3);
          if (k === 1) g.fillRect(x * T + T - 5, y * T + p, 4, 3);
        }
      }
    }
  };
  R.rail = function (g, c, i, x, y) {
    var m = C.mask(c, "rail", i), cross = c.road[i], cx = x * T + T / 2, cy = y * T + T / 2;
    if (!m) m = 10;
    if (!cross) arms(g, m, x, y, T * 0.46, c.base[i] ? "#5c5f66" : "#b8a88e");
    // まくらぎ
    g.fillStyle = "#7a5a3a";
    for (var k = 0; k < 4; k++) {
      if (!(m & (1 << k)) || cross) continue;
      for (var s = 0; s < 3; s++) {
        var t = 3 + s * 5;
        if (k === 0) g.fillRect(cx - 7, y * T + t, 14, 2.2);
        if (k === 2) g.fillRect(cx - 7, y * T + T - t - 2.2, 14, 2.2);
        if (k === 3) g.fillRect(x * T + t, cy - 7, 2.2, 14);
        if (k === 1) g.fillRect(x * T + T - t - 2.2, cy - 7, 2.2, 14);
      }
    }
    g.strokeStyle = "#454950"; g.lineWidth = 1.7;
    for (k = 0; k < 4; k++) {
      if (!(m & (1 << k))) continue;
      g.beginPath();
      var o = 4;
      if (k === 0) { g.moveTo(cx - o, cy + o); g.lineTo(cx - o, y * T); g.moveTo(cx + o, cy + o); g.lineTo(cx + o, y * T); }
      if (k === 2) { g.moveTo(cx - o, cy - o); g.lineTo(cx - o, y * T + T); g.moveTo(cx + o, cy - o); g.lineTo(cx + o, y * T + T); }
      if (k === 3) { g.moveTo(cx + o, cy - o); g.lineTo(x * T, cy - o); g.moveTo(cx + o, cy + o); g.lineTo(x * T, cy + o); }
      if (k === 1) { g.moveTo(cx - o, cy - o); g.lineTo(x * T + T, cy - o); g.moveTo(cx - o, cy + o); g.lineTo(x * T + T, cy + o); }
      g.stroke();
    }
    if (cross) { // ふみきり の しましま
      var vert = (m & 5) && !(m & 10);
      for (var q = 0; q < 2; q++) {
        var px = vert ? (q ? x * T + T - 6 : x * T + 1) : cx - 9, py = vert ? cy - 9 : (q ? y * T + T - 6 : y * T + 1);
        var ww = vert ? 5 : 18, hh = vert ? 18 : 5;
        g.fillStyle = "#ffd43b"; g.fillRect(px, py, ww, hh);
        g.fillStyle = "#222";
        for (var z = 0; z < 3; z++) vert ? g.fillRect(px, py + 2 + z * 6, ww, 3) : g.fillRect(px + 2 + z * 6, py, 3, hh);
      }
    }
  };

  // ---- たてもの ----
  function box(g, x0, y0, w, d, h, wall, roof, side) {
    g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x0 + 3, y0 + 3, w, d);
    g.fillStyle = side || wall; g.fillRect(x0, y0 + d - h, w, h);
    g.fillStyle = roof; g.fillRect(x0, y0 - h, w, d);
  }
  function badge(g, cx, cy, txt, bgc) {
    g.fillStyle = bgc || "#fff"; g.beginPath(); g.arc(cx, cy, 6.5, 0, 7); g.fill();
    g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 0.8; g.stroke();
    g.font = "8.5px " + EMOJI; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(txt, cx, cy + 0.5);
  }
  function windows(g, x0, y0, w, rows, cols, col) {
    g.fillStyle = col;
    var cw = w / cols;
    for (var r = 0; r < rows; r++) for (var k = 0; k < cols; k++) g.fillRect(x0 + k * cw + cw * 0.25, y0 + r * 5 + 1, cw * 0.5, 3);
  }
  function treeAt(g, cx, cy, s, seed) {
    g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.ellipse(cx + 2, cy + 3 * s, 7 * s, 3.5 * s, 0, 0, 7); g.fill();
    g.fillStyle = "#8a5a2b"; g.fillRect(cx - 1.3 * s, cy - 4 * s, 2.6 * s, 7 * s);
    g.fillStyle = seed % 2 ? "#2f9e44" : "#37b24d"; g.beginPath(); g.arc(cx, cy - 8 * s, 7 * s, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.arc(cx - 2.2 * s, cy - 10.5 * s, 3 * s, 0, 7); g.fill();
  }
  var ROOFS = ["#e8590c", "#c92a2a", "#1c7ed6", "#5f3dc4", "#2b8a3e", "#a0522d", "#495057"];

  R.obj = function (g, c, i, x, y, light) {
    var o = c.obj[i], X = x * T, Y = y * T, hv = hash(i), night = light < 0.6;
    var win = night ? "#ffe066" : "#a5d8ff";
    switch (o) {
      case O.house: {
        var rc = ROOFS[hv % ROOFS.length], x0 = X + 5, y0 = Y + 9;
        box(g, x0, y0, 22, 18, 9, "#fff4e0", rc, "#f3e3c3");
        g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x0, y0 - 9 + 8, 22, 1.4); // むね
        g.fillStyle = "#8d5b3a"; g.fillRect(x0 + 13, y0 + 18 - 7, 5, 7);
        g.fillStyle = win; g.fillRect(x0 + 3, y0 + 18 - 6, 6, 4);
        break;
      }
      case O.mansion: {
        var mx = X + 3, my = Y + 8;
        box(g, mx, my, 26, 20, 28, "#e9ecef", "#adb5bd", "#dee2e6");
        windows(g, mx + 1, my + 20 - 28 + 2, 24, 5, 4, win);
        g.fillStyle = "#868e96"; g.fillRect(mx + 4, my - 28 + 4, 8, 6);
        break;
      }
      case O.park: {
        g.fillStyle = "#8fd16a"; g.fillRect(X + 1, Y + 1, T - 2, T - 2);
        g.fillStyle = "#e6d3a3"; g.beginPath(); g.ellipse(X + 16, Y + 20, 9, 5, 0, 0, 7); g.fill();
        g.fillStyle = "#ff6b6b"; g.fillRect(X + 18, Y + 17, 6, 2); g.fillStyle = "#4dabf7"; g.fillRect(X + 9, Y + 21, 2, 4);
        treeAt(g, X + 8, Y + 14, 0.7, hv); treeAt(g, X + 24, Y + 11, 0.65, hv + 1);
        break;
      }
      case O.school: {
        box(g, X + 2, Y + 10, 28, 18, 14, "#fff9db", "#f08c00", "#ffec99");
        windows(g, X + 3, Y + 28 - 14 + 2, 26, 2, 6, win);
        g.fillStyle = "#fff"; g.beginPath(); g.arc(X + 16, Y + 3, 4, 0, 7); g.fill();
        g.strokeStyle = "#333"; g.lineWidth = 0.8; g.stroke(); g.beginPath(); g.moveTo(X + 16, Y + 3); g.lineTo(X + 16, Y + 0.6); g.moveTo(X + 16, Y + 3); g.lineTo(X + 17.8, Y + 3); g.stroke();
        break;
      }
      case O.hospital: {
        box(g, X + 3, Y + 9, 26, 19, 17, "#f8f9fa", "#ffffff", "#e9ecef");
        windows(g, X + 4, Y + 28 - 17 + 2, 24, 3, 4, win);
        g.fillStyle = "#e03131"; g.fillRect(X + 13, Y - 6, 6, 14); g.fillRect(X + 9, Y - 2, 14, 6);
        break;
      }
      case O.fire: {
        box(g, X + 3, Y + 10, 26, 18, 13, "#ffe3e3", "#e03131", "#ffc9c9");
        g.fillStyle = "#c92a2a"; g.fillRect(X + 6, Y + 28 - 9, 8, 9); g.fillRect(X + 17, Y + 28 - 9, 8, 9);
        g.fillStyle = "#adb5bd"; g.fillRect(X + 24, Y - 12, 4, 10);
        badge(g, X + 12, Y + 3, "🚒");
        break;
      }
      case O.police: {
        box(g, X + 3, Y + 10, 26, 18, 14, "#e7f5ff", "#364fc7", "#d0ebff");
        windows(g, X + 4, Y + 28 - 14 + 2, 24, 2, 4, win);
        badge(g, X + 16, Y + 3, "🚓");
        break;
      }
      case O.koban: {
        box(g, X + 8, Y + 13, 16, 14, 9, "#f1f3f5", "#495057", "#dee2e6");
        g.fillStyle = "#e03131"; g.beginPath(); g.arc(X + 16, Y + 3, 2.6, 0, 7); g.fill();
        g.fillStyle = win; g.fillRect(X + 11, Y + 27 - 6, 10, 4);
        badge(g, X + 24, Y + 8, "👮");
        break;
      }
      case O.post: {
        box(g, X + 3, Y + 10, 26, 18, 12, "#fff5f5", "#f03e3e", "#ffe3e3");
        windows(g, X + 4, Y + 28 - 12 + 2, 24, 1, 4, win);
        g.fillStyle = "#fff"; g.beginPath(); g.arc(X + 16, Y + 4, 6.5, 0, 7); g.fill();
        g.strokeStyle = "#e03131"; g.lineWidth = 1.6; g.beginPath();
        g.moveTo(X + 12.5, Y + 1.5); g.lineTo(X + 19.5, Y + 1.5); g.moveTo(X + 12.5, Y + 4); g.lineTo(X + 19.5, Y + 4); g.moveTo(X + 16, Y + 4); g.lineTo(X + 16, Y + 8.5); g.stroke();
        break;
      }
      case O.library: {
        box(g, X + 3, Y + 10, 26, 18, 13, "#fff4e6", "#2b8a3e", "#ffe8cc");
        windows(g, X + 4, Y + 28 - 13 + 2, 24, 2, 3, win);
        badge(g, X + 16, Y + 3, "📚");
        break;
      }
      case O.super: {
        box(g, X + 2, Y + 11, 28, 17, 11, "#f8f9fa", "#ced4da", "#e9ecef");
        for (var s = 0; s < 7; s++) { g.fillStyle = s % 2 ? "#fff" : "#2f9e44"; g.fillRect(X + 2 + s * 4, Y + 28 - 11, 4, 3); }
        g.fillStyle = win; g.fillRect(X + 5, Y + 28 - 7, 22, 5);
        badge(g, X + 16, Y + 5, "🛒");
        break;
      }
      case O.bakery: {
        box(g, X + 6, Y + 12, 20, 15, 10, "#fff4e6", "#d9480f", "#ffe8cc");
        for (var s2 = 0; s2 < 5; s2++) { g.fillStyle = s2 % 2 ? "#fff" : "#f76707"; g.fillRect(X + 6 + s2 * 4, Y + 27 - 10, 4, 3); }
        g.fillStyle = win; g.fillRect(X + 9, Y + 27 - 6, 8, 4);
        badge(g, X + 16, Y + 5, "🥐");
        break;
      }
      case O.factory: {
        box(g, X + 2, Y + 11, 28, 17, 12, "#dee2e6", "#868e96", "#ced4da");
        g.fillStyle = "#adb5bd";
        for (var z = 0; z < 3; z++) { g.beginPath(); g.moveTo(X + 3 + z * 9, Y + 9); g.lineTo(X + 3 + z * 9, Y + 1); g.lineTo(X + 12 + z * 9, Y + 9); g.fill(); }
        g.fillStyle = "#495057"; g.fillRect(X + 24, Y - 10, 4, 16);
        g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(X + 27, Y - 14, 3.5, 0, 7); g.arc(X + 30, Y - 18, 3, 0, 7); g.fill();
        break;
      }
      case O.field: {
        g.fillStyle = "#b07a45"; g.fillRect(X + 1, Y + 1, T - 2, T - 2);
        for (var rr = 0; rr < 4; rr++) {
          g.fillStyle = "#8a5a2b"; g.fillRect(X + 2, Y + 4 + rr * 7, T - 4, 2);
          g.fillStyle = "#51cf66";
          for (var q = 0; q < 4; q++) { g.beginPath(); g.arc(X + 6 + q * 7, Y + 4 + rr * 7, 2.2, 0, 7); g.fill(); }
        }
        break;
      }
      case O.tree: {
        treeAt(g, X + 11, Y + 18, 0.85, hv); treeAt(g, X + 22, Y + 26, 0.75, hv + 1);
        break;
      }
      case O.station: {
        var m = C.mask(c, "rail", i), vert = (m & 5) && !(m & 10);
        g.fillStyle = "#dee2e6";
        if (vert) { g.fillRect(X + 1, Y, 7, T); g.fillRect(X + T - 8, Y, 7, T); }
        else { g.fillRect(X, Y + 1, T, 7); g.fillRect(X, Y + T - 8, T, 7); }
        g.fillStyle = "rgba(0,0,0,.15)";
        if (vert) g.fillRect(X + 3, Y + 6, 4, T - 8); else g.fillRect(X + 3, Y + T - 6, T - 6, 3);
        g.fillStyle = "#0c8599";
        if (vert) { g.fillRect(X, Y + 3, 8, T - 8); g.fillRect(X + T - 8, Y + 3, 8, T - 8); }
        else { g.fillRect(X + 2, Y - 3, T - 4, 7); g.fillRect(X + 2, Y + T - 10, T - 4, 7); }
        var pl = C.nb(c, i, vert ? 0 : 3);
        if (pl < 0 || c.obj[pl] !== O.station) {
          g.fillStyle = "#fff"; g.fillRect(X + 8, Y + 9, 16, 9); g.strokeStyle = "#0c8599"; g.lineWidth = 1; g.strokeRect(X + 8, Y + 9, 16, 9);
          g.fillStyle = "#0b7285"; g.font = "bold 7px " + FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("えき", X + 16, Y + 13.8);
        }
        break;
      }
    }
  };

  // よる の あかり（まど と がいとう）
  R.lights = function (g, c, r, k) {
    var x, y, i;
    g.globalCompositeOperation = "lighter";
    for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) {
      i = y * c.w + x;
      if (c.road[i] && (x * 3 + y * 5) % 4 === 0) {
        var gr = g.createRadialGradient(x * T + 16, y * T + 16, 0, x * T + 16, y * T + 16, 18);
        gr.addColorStop(0, "rgba(255,220,120," + (0.35 * k).toFixed(2) + ")"); gr.addColorStop(1, "rgba(255,220,120,0)");
        g.fillStyle = gr; g.fillRect(x * T - 2, y * T - 2, T + 4, T + 4);
      }
      var o = c.obj[i];
      if (o && o !== O.tree && o !== O.field && o !== O.park && hash(i) % 5 !== 0) {
        g.fillStyle = "rgba(255,214,90," + (0.22 * k).toFixed(2) + ")";
        g.beginPath(); g.arc(x * T + 16, y * T + 18, 7, 0, 7); g.fill();
      }
    }
    g.globalCompositeOperation = "source-over";
  };

  // ================= ちず モード =================
  R.drawMap = function (c, r) {
    var g = this.b, x, y, i, m;
    g.fillStyle = "#fbf8ef"; g.fillRect(0, 0, c.w * T, c.h * T);
    for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) {
      i = y * c.w + x;
      if (c.base[i]) { g.fillStyle = "#bfe3fb"; g.fillRect(x * T - 0.3, y * T - 0.3, T + 0.6, T + 0.6); }
      else if (c.obj[i] === O.park) { g.fillStyle = "#e3f3d4"; g.fillRect(x * T - 0.3, y * T - 0.3, T + 0.6, T + 0.6); }
    }
    g.strokeStyle = "#3d8fd1"; g.lineWidth = 1.4;
    for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) {
      i = y * c.w + x; if (!c.base[i]) continue;
      m = C.mask(c, "base", i); g.beginPath();
      if (!(m & 1)) { g.moveTo(x * T, y * T); g.lineTo(x * T + T, y * T); }
      if (!(m & 4)) { g.moveTo(x * T, y * T + T); g.lineTo(x * T + T, y * T + T); }
      if (!(m & 8)) { g.moveTo(x * T, y * T); g.lineTo(x * T, y * T + T); }
      if (!(m & 2)) { g.moveTo(x * T + T, y * T); g.lineTo(x * T + T, y * T + T); }
      g.stroke();
    }
    // みち（くろ の ふち ＋ しろ）
    for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) { i = y * c.w + x; if (c.road[i]) arms(g, C.mask(c, "road", i), x, y, T * 0.5, "#333"); }
    for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) { i = y * c.w + x; if (c.road[i]) arms(g, C.mask(c, "road", i), x, y, T * 0.5 - 3, "#fff"); }
    // はし（みち の よこ に ふとい せん）
    g.strokeStyle = "#333"; g.lineWidth = 1.2;
    for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) {
      i = y * c.w + x; if (!c.road[i] || !c.base[i]) continue;
      m = C.mask(c, "road", i); var v = (m & 5) && !(m & 10), a = T * 0.25 + 3;
      g.beginPath();
      if (v) { g.moveTo(x * T + T / 2 - a, y * T + 2); g.lineTo(x * T + T / 2 - a, y * T + T - 2); g.moveTo(x * T + T / 2 + a, y * T + 2); g.lineTo(x * T + T / 2 + a, y * T + T - 2); }
      else { g.moveTo(x * T + 2, y * T + T / 2 - a); g.lineTo(x * T + T - 2, y * T + T / 2 - a); g.moveTo(x * T + 2, y * T + T / 2 + a); g.lineTo(x * T + T - 2, y * T + T / 2 + a); }
      g.stroke();
    }
    // てつどう（JR の しましま）
    for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) { i = y * c.w + x; if (c.rail[i]) arms(g, C.mask(c, "rail", i) || 10, x, y, 6, "#222"); }
    g.strokeStyle = "#fff"; g.lineWidth = 3; g.setLineDash([5, 5]);
    for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) {
      i = y * c.w + x; if (!c.rail[i]) continue;
      m = C.mask(c, "rail", i) || 10; var cx = x * T + T / 2, cy = y * T + T / 2;
      g.beginPath();
      if (m & 1) { g.moveTo(cx, cy); g.lineTo(cx, y * T); }
      if (m & 4) { g.moveTo(cx, cy); g.lineTo(cx, y * T + T); }
      if (m & 8) { g.moveTo(cx, cy); g.lineTo(x * T, cy); }
      if (m & 2) { g.moveTo(cx, cy); g.lineTo(x * T + T, cy); }
      g.stroke();
    }
    g.setLineDash([]);
    // たてもの と きごう
    for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) {
      i = y * c.w + x; var o = c.obj[i]; if (!o) continue;
      var X = x * T, Y = y * T, def = D.OBJ[o];
      if (o === O.station) {
        m = C.mask(c, "rail", i); var vt = (m & 5) && !(m & 10);
        g.fillStyle = "#fff"; g.strokeStyle = "#222"; g.lineWidth = 2;
        if (vt) { g.fillRect(X + 10, Y + 1, 12, T - 2); g.strokeRect(X + 10, Y + 1, 12, T - 2); }
        else { g.fillRect(X + 1, Y + 10, T - 2, 12); g.strokeRect(X + 1, Y + 10, T - 2, 12); }
      } else if (o === O.house || o === O.super || o === O.bakery) {
        g.fillStyle = "#c9c2b2"; g.strokeStyle = "#555"; g.lineWidth = 1;
        var sz = o === O.house ? 12 : 16;
        g.fillRect(X + (T - sz) / 2, Y + (T - sz) / 2, sz, sz); g.strokeRect(X + (T - sz) / 2, Y + (T - sz) / 2, sz, sz);
      } else if (o === O.mansion) {
        g.fillStyle = "#fff"; g.fillRect(X + 5, Y + 5, 22, 22);
        g.save(); g.beginPath(); g.rect(X + 5, Y + 5, 22, 22); g.clip();
        g.strokeStyle = "#777"; g.lineWidth = 1;
        for (var h = -22; h < 22; h += 4) { g.beginPath(); g.moveTo(X + 5 + h, Y + 27); g.lineTo(X + 27 + h, Y + 5); g.stroke(); }
        g.restore(); g.strokeStyle = "#444"; g.lineWidth = 1.2; g.strokeRect(X + 5, Y + 5, 22, 22);
      } else if (def.kigou) {
        var im = KIMG[o === O.park || o === O.tree ? "broad" : def.kigou];
        if (im && im.ready) {
          var S = o === O.field || o === O.tree || o === O.park ? 26 : 24;
          if (o !== O.field && o !== O.tree && o !== O.park) { g.fillStyle = "rgba(251,248,239,.9)"; g.fillRect(X + 3, Y + 3, T - 6, T - 6); }
          g.drawImage(im, X + (T - S) / 2, Y + (T - S) / 2, S, S);
        }
      }
    }
  };

  // ================= fg =================
  R.drawFG = function (c, sim, t, light) {
    var g = this.f;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.fg.width, this.fg.height);
    this.setT(g);
    var r = this.range(c, 2), x0 = r.x0, y0 = r.y0, x1 = r.x1 + 1, y1 = r.y1 + 1;
    function vis(a) { return a.x >= x0 && a.x <= x1 && a.y >= y0 && a.y <= y1; }
    var k, a, i;
    var night = light < 0.5;
    if (!this.map) {
      // ふみきり の しゃだんき
      for (k = 0; k < sim.closedList.length; k++) {
        i = sim.closedList[k];
        var cx = (i % c.w) * T, cy = (i / c.w | 0) * T, m = C.mask(c, "rail", i), vert = (m & 5) && !(m & 10);
        g.fillStyle = "#ffd43b";
        if (vert) { g.fillRect(cx + 2, cy + 3, 28, 2.5); g.fillRect(cx + 2, cy + T - 5.5, 28, 2.5); }
        else { g.fillRect(cx + 3, cy + 2, 2.5, 28); g.fillRect(cx + T - 5.5, cy + 2, 2.5, 28); }
        g.fillStyle = (t * 3 | 0) % 2 ? "#ff2222" : "#661111";
        g.beginPath(); g.arc(cx + 3, cy + 3, 2.4, 0, 7); g.arc(cx + T - 3, cy + T - 3, 2.4, 0, 7); g.fill();
      }
      // ひと
      for (k = 0; k < sim.people.length; k++) {
        a = sim.people[k]; if (!vis(a)) continue;
        var px = a.x * T, py = a.y * T, bob = Math.sin(t * 12 + k) * 0.5;
        var sc = a.kid ? 0.8 : 1;
        g.fillStyle = a.col; g.beginPath(); g.arc(px, py + bob, 2.6 * sc, 0, 7); g.fill();
        g.fillStyle = a.hat ? "#ffd43b" : "#3b2a1a"; g.beginPath(); g.arc(px, py - 2.6 * sc + bob, 1.9 * sc, 0, 7); g.fill();
      }
      // くるま
      for (k = 0; k < sim.cars.length; k++) { a = sim.cars[k]; if (vis(a)) this.car(g, a, a.truck ? 12 : 9, 5.6, a.col, null, night, t); }
      for (k = 0; k < sim.vehicles.length; k++) {
        a = sim.vehicles[k]; if (!vis(a)) continue;
        if (a.kind === "fire") this.car(g, a, 13, 6.4, "#e03131", "siren", night, t);
        else if (a.kind === "amb") this.car(g, a, 12, 6.2, "#ffffff", "amb", night, t);
        else if (a.kind === "police") this.car(g, a, 10, 5.8, "#212529", "police", night, t);
        else this.car(g, a, 6, 3.2, "#f03e3e", "bike", night, t);
      }
      // でんしゃ
      for (k = 0; k < sim.trains.length; k++) {
        var tr = sim.trains[k], cars = sim.trainCars(tr);
        for (var q = cars.length - 1; q >= 0; q--) {
          var cc = cars[q]; if (!vis(cc)) continue;
          g.save(); g.translate(cc.x * T, cc.y * T); g.rotate(cc.ang);
          g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(-13, -4.4, 28, 11);
          g.fillStyle = tr.col[1]; g.fillRect(-14, -5.6, 28, 11.2);
          g.fillStyle = tr.col[0]; g.fillRect(-14, 1.5, 28, 2.6); g.fillRect(-14, -5.6, 28, 1.6);
          g.fillStyle = night ? "#ffe066" : "#4a6c8c";
          for (var wnd = -11; wnd < 11; wnd += 5.5) g.fillRect(wnd, -3.2, 3.6, 3.6);
          if (cc.head) { g.fillStyle = tr.col[0]; g.fillRect(10, -5.6, 4, 11.2); g.fillStyle = "#1d2b3a"; g.fillRect(11, -4, 2.2, 8); }
          if (cc.tail) { g.fillStyle = tr.col[0]; g.fillRect(-14, -5.6, 3, 11.2); }
          g.restore();
        }
      }
      // かじ
      for (var fk in sim.fires) {
        var f = sim.fires[fk]; i = f.cell;
        var fx = (i % c.w) * T + 16, fy = (i / c.w | 0) * T + 6;
        if (f.spray > 0 && f.truck) {
          g.strokeStyle = "rgba(116,192,252,.9)"; g.lineWidth = 2.5; g.setLineDash([3, 3]); g.lineDashOffset = -t * 30;
          g.beginPath(); g.moveTo(f.truck.x * T, f.truck.y * T); g.quadraticCurveTo((f.truck.x * T + fx) / 2, fy - 20, fx, fy); g.stroke(); g.setLineDash([]);
        }
        var fl = f.spray > 0 ? 0.5 : 1;
        for (var z = 0; z < 3; z++) {
          var hh = (10 + Math.sin(t * 9 + z * 2) * 3) * fl;
          g.fillStyle = z === 1 ? "#ffd43b" : "#ff6b00";
          g.beginPath(); g.moveTo(fx - 9 + z * 6, fy + 8); g.quadraticCurveTo(fx - 10 + z * 6, fy - hh * 0.5, fx - 6 + z * 6, fy - hh); g.quadraticCurveTo(fx - 1 + z * 6, fy - hh * 0.4, fx - 2 + z * 6, fy + 8); g.fill();
        }
        g.fillStyle = "rgba(90,90,90,.35)"; g.beginPath(); g.arc(fx + 3, fy - 16 - (t * 8 % 8), 6, 0, 7); g.fill();
      }
      for (var sk in sim.sick) {
        i = sim.sick[sk].cell;
        g.font = "13px " + EMOJI; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText("🤒", (i % c.w) * T + 16, (i / c.w | 0) * T - 2 + Math.sin(t * 4) * 1.5);
      }
      for (k = 0; k < sim.pops.length; k++) {
        var p = sim.pops[k]; i = p.cell;
        g.globalAlpha = Math.min(1, p.life);
        g.font = "12px " + EMOJI; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(p.text, (i % c.w) * T + 16, (i / c.w | 0) * T - 6 - (2.2 - p.life) * 8);
        g.globalAlpha = 1;
      }
    }
    // ここから は がめん の ざひょう（ズーム しても おなじ おおきさ）
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!this.map) {
      for (var fk2 in sim.fires) {
        var f2 = sim.fires[fk2];
        if (!f2.truck || sim.vehicles.indexOf(f2.truck) < 0 || f2.spray > 0) continue;
        var sp = this.toScreen(f2.cell % c.w + 0.5, (f2.cell / c.w | 0) - 0.6);
        this.label(g, sp.x, sp.y, "🚒 あと " + root.MACHI_SIM.fun(sim.eta(f2.truck)), "#c92a2a");
      }
      for (k = 0; k < sim.vehicles.length; k++) {
        var v = sim.vehicles[k];
        if (v.kind !== "amb" || v.back) continue;
        var sp2 = this.toScreen(v.x, v.y - 0.7);
        this.label(g, sp2.x, sp2.y, "🚑 " + root.MACHI_SIM.fun(sim.eta(v)), "#1971c2");
      }
      for (k = 0; k < sim.bubbles.length; k++) this.bubble(g, c, sim.bubbles[k]);
    }
  };

  R.car = function (g, a, L, W, col, kind, night, t) {
    g.save(); g.translate(a.x * T, a.y * T); g.rotate(a.ang);
    if (night && kind !== "bike") {
      var gr = g.createLinearGradient(L / 2, 0, L / 2 + 14, 0);
      gr.addColorStop(0, "rgba(255,240,170,.55)"); gr.addColorStop(1, "rgba(255,240,170,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(L / 2, -W / 2); g.lineTo(L / 2 + 14, -W); g.lineTo(L / 2 + 14, W); g.lineTo(L / 2, W / 2); g.fill();
    }
    g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(-L / 2 + 1, -W / 2 + 1.2, L, W);
    g.fillStyle = col; g.fillRect(-L / 2, -W / 2, L, W);
    if (kind === "bike") { g.fillStyle = "#333"; g.beginPath(); g.arc(1, 0, 1.5, 0, 7); g.fill(); g.restore(); return; }
    g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 0.6; g.strokeRect(-L / 2, -W / 2, L, W);
    g.fillStyle = "#9ad0f5"; g.fillRect(L / 2 - 3.6, -W / 2 + 0.9, 2, W - 1.8);
    if (kind === "amb") { g.fillStyle = "#e03131"; g.fillRect(-L / 2, -0.6, L, 1.2); }
    if (kind === "police") { g.fillStyle = "#fff"; g.fillRect(-L / 2 + 2, -W / 2, L - 5, W); g.fillStyle = "#212529"; g.fillRect(-1.5, -1.6, 3, 3.2); }
    if (kind === "siren" || kind === "amb" || kind === "police") {
      var on = (t * 6 | 0) % 2;
      g.fillStyle = on ? "#ff3b3b" : "#ffb3b3"; g.fillRect(-1.2, -W / 2 + 0.6, 2.4, W - 1.2);
      if (on) { g.fillStyle = "rgba(255,60,60,.25)"; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill(); }
    }
    if (kind === "siren") { g.fillStyle = "#adb5bd"; g.fillRect(-L / 2 + 1, -1, L - 6, 2); }
    g.restore();
  };

  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  R.label = function (g, x, y, text, col) {
    g.font = "bold 13px " + FONT; g.textAlign = "center"; g.textBaseline = "middle";
    var w = g.measureText(text).width + 14;
    g.fillStyle = col; rr(g, x - w / 2, y - 12, w, 22, 11); g.fill();
    g.fillStyle = "#fff"; g.fillText(text, x, y);
  };
  R.bubble = function (g, c, b) {
    var p = this.toScreen(b.cell % c.w + 0.5, (b.cell / c.w | 0) + 0.1);
    var text = b.face + " " + b.text;
    g.font = "bold 14px " + FONT; g.textAlign = "center"; g.textBaseline = "middle";
    var w = Math.min(this.W - 16, g.measureText(text).width + 20), h = 30;
    var x = Math.max(8 + w / 2, Math.min(this.W - 8 - w / 2, p.x)), y = p.y - 26;
    if (y < 24) y = p.y + 50;
    var a = Math.min(1, b.life * 2, (4.5 - b.life) * 4);
    g.globalAlpha = Math.max(0, a);
    g.fillStyle = "rgba(0,0,0,.15)"; rr(g, x - w / 2 + 2, y - h / 2 + 3, w, h, 14); g.fill();
    g.fillStyle = "#fff"; rr(g, x - w / 2, y - h / 2, w, h, 14); g.fill();
    g.strokeStyle = "#74b816"; g.lineWidth = 2; g.stroke();
    g.beginPath();
    if (y < p.y) { g.moveTo(p.x - 6, y + h / 2 - 1); g.lineTo(p.x, p.y - 6); g.lineTo(p.x + 6, y + h / 2 - 1); }
    else { g.moveTo(p.x - 6, y - h / 2 + 1); g.lineTo(p.x, p.y + 4); g.lineTo(p.x + 6, y - h / 2 + 1); }
    g.fillStyle = "#fff"; g.fill(); g.stroke();
    g.fillStyle = "#fff"; g.fillRect(p.x - 5, (y < p.y ? y + h / 2 - 3 : y - h / 2), 10, 3);
    g.fillStyle = "#2f3a1e"; g.fillText(text, x, y + 1, w - 12);
    g.globalAlpha = 1;
  };

  root.MACHI_RENDER = Renderer;
})(this);
