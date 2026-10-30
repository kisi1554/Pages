/* ============================================================
   しゅつどう！ 119 — まち の え（うえ から みた ちず）
   machi-zukuri/render.js と おなじ かきかた に そろえて いる：
   くさ の じめん・ほどう つき の はいいろ の みち・まんなか の てんせん・
   こうさてん の おうだんほどう・ななめうえ から みた はこ の たてもの。
   まち は うごかない ので、さいしょ に 1かい だけ べつ の キャンバス に かいて おく。
   ============================================================ */
(function (root) {
  "use strict";

  var D = root.S119_DATA, A = root.S119_ART;
  var T = 32, SC = 2; // 1マス = 32px、べつキャンバス は 2ばい で かく
  var EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  var ROOFS = ["#e8590c", "#c92a2a", "#1c7ed6", "#5f3dc4", "#2b8a3e", "#a0522d", "#495057"];

  function mask(c, x, y) {
    var m = 0;
    if (isR(c, x, y - 1)) m |= 1;
    if (isR(c, x + 1, y)) m |= 2;
    if (isR(c, x, y + 1)) m |= 4;
    if (isR(c, x - 1, y)) m |= 8;
    return m;
  }
  function isR(c, x, y) { return x >= 0 && y >= 0 && x < c.w && y < c.h && !!c.road[y * c.w + x]; }
  function nArms(m) { return (m & 1) + (m >> 1 & 1) + (m >> 2 & 1) + (m >> 3 & 1); }

  function arms(g, m, x, y, w, col) {
    var a = (T - w) / 2;
    g.fillStyle = col;
    g.fillRect(x * T + a, y * T + a, w, w);
    if (m & 1) g.fillRect(x * T + a, y * T - 0.4, w, a + 0.8);
    if (m & 4) g.fillRect(x * T + a, y * T + a + w - 0.4, w, a + 0.8);
    if (m & 8) g.fillRect(x * T - 0.4, y * T + a, a + 0.8, w);
    if (m & 2) g.fillRect(x * T + a + w - 0.4, y * T + a, a + 0.8, w);
  }
  var ROAD_W = T * 0.7;

  function road(g, c, x, y) {
    var m = mask(c, x, y), w = ROAD_W;
    arms(g, m, x, y, w + 4, "#d6d0c4"); // ほどう
    arms(g, m, x, y, w, "#6f7680");
    var cx = x * T + T / 2, cy = y * T + T / 2, n = nArms(m);
    g.strokeStyle = "#fff"; g.lineWidth = 1.6; g.setLineDash([4, 4]);
    g.beginPath();
    if (m === 5 || m === 1 || m === 4) { g.moveTo(cx, y * T + 2); g.lineTo(cx, y * T + T - 2); }
    else if (m === 10 || m === 2 || m === 8) { g.moveTo(x * T + 2, cy); g.lineTo(x * T + T - 2, cy); }
    g.stroke(); g.setLineDash([]);
    if (n >= 3) { // おうだんほどう
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
  }

  function box(g, x0, y0, w, d, h, wall, roof, side) {
    g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x0 + 3, y0 + 3, w, d);
    g.fillStyle = side || wall; g.fillRect(x0, y0 + d - h, w, h);
    g.fillStyle = roof; g.fillRect(x0, y0 - h, w, d);
  }
  function badge(g, cx, cy, txt) {
    g.fillStyle = "#fff"; g.beginPath(); g.arc(cx, cy, 6.5, 0, 7); g.fill();
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

  function obj(g, o, x, y, hv) {
    var X = x * T, Y = y * T, win = "#a5d8ff";
    switch (o) {
      case "house": case "houseBlue": {
        var rc = o === "houseBlue" ? "#1c7ed6" : ROOFS[hv % ROOFS.length], x0 = X + 5, y0 = Y + 9;
        box(g, x0, y0, 22, 18, 9, "#fff4e0", rc, "#f3e3c3");
        g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x0, y0 - 1, 22, 1.4);
        g.fillStyle = "#8d5b3a"; g.fillRect(x0 + 13, y0 + 11, 5, 7);
        g.fillStyle = win; g.fillRect(x0 + 3, y0 + 12, 6, 4);
        break;
      }
      case "mansion": {
        var mx = X + 3, my = Y + 8;
        box(g, mx, my, 26, 20, 28, "#e9ecef", "#adb5bd", "#dee2e6");
        windows(g, mx + 1, my - 6, 24, 5, 4, win);
        g.fillStyle = "#868e96"; g.fillRect(mx + 4, my - 24, 8, 6);
        break;
      }
      case "shop": {
        box(g, X + 4, Y + 11, 24, 16, 10, "#fff9db", "#f59f00", "#ffec99");
        for (var s = 0; s < 6; s++) { g.fillStyle = s % 2 ? "#fff" : "#f76707"; g.fillRect(X + 4 + s * 4, Y + 17, 4, 3); }
        g.fillStyle = win; g.fillRect(X + 7, Y + 21, 14, 4);
        break;
      }
      case "conbini": {
        box(g, X + 2, Y + 11, 28, 17, 11, "#f8f9fa", "#ced4da", "#e9ecef");
        g.fillStyle = "#1c7ed6"; g.fillRect(X + 2, Y + 17, 28, 2); g.fillStyle = "#40c057"; g.fillRect(X + 2, Y + 19, 28, 2);
        g.fillStyle = win; g.fillRect(X + 5, Y + 22, 22, 5);
        badge(g, X + 16, Y + 5, "🏪");
        break;
      }
      case "bakery": {
        box(g, X + 6, Y + 12, 20, 15, 10, "#fff4e6", "#d9480f", "#ffe8cc");
        for (var s2 = 0; s2 < 5; s2++) { g.fillStyle = s2 % 2 ? "#fff" : "#f76707"; g.fillRect(X + 6 + s2 * 4, Y + 17, 4, 3); }
        g.fillStyle = win; g.fillRect(X + 9, Y + 21, 8, 4);
        badge(g, X + 16, Y + 5, "🥐");
        break;
      }
      case "park": {
        g.fillStyle = "#8fd16a"; g.fillRect(X, Y, T, T);
        if (hv % 3 === 0) treeAt(g, X + 10, Y + 20, 0.8, hv);
        if (hv % 4 === 1) { g.fillStyle = "#e6d3a3"; g.beginPath(); g.ellipse(X + 16, Y + 18, 9, 5, 0, 0, 7); g.fill(); g.fillStyle = "#ff6b6b"; g.fillRect(X + 12, Y + 12, 8, 3); g.fillStyle = "#4dabf7"; g.fillRect(X + 20, Y + 12, 3, 8); }
        if (hv % 5 === 2) treeAt(g, X + 22, Y + 26, 0.7, hv + 1);
        break;
      }
      case "pond": {
        g.fillStyle = "#8fd16a"; g.fillRect(X, Y, T, T);
        g.fillStyle = "#5bb8ec"; g.beginPath(); g.ellipse(X + 16, Y + 16, 14, 10, 0, 0, 7); g.fill();
        g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(X + 9, Y + 15); g.quadraticCurveTo(X + 13, Y + 12, X + 17, Y + 15); g.stroke();
        break;
      }
      case "ground": {
        g.fillStyle = "#e3c58f"; g.fillRect(X, Y + 2, T, T - 2);
        g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1; g.strokeRect(X + 2, Y + 5, T - 4, T - 8);
        break;
      }
      case "school": case "schoolL": case "schoolR": {
        box(g, X, Y + 10, T, 18, 14, "#fff9db", "#f08c00", "#ffec99");
        windows(g, X + 1, Y + 16, T - 2, 2, 4, win);
        if (o === "school") {
          g.fillStyle = "#fff"; g.beginPath(); g.arc(X + 16, Y + 1, 4.5, 0, 7); g.fill();
          g.strokeStyle = "#333"; g.lineWidth = 0.8; g.stroke(); g.beginPath(); g.moveTo(X + 16, Y + 1); g.lineTo(X + 16, Y - 2); g.moveTo(X + 16, Y + 1); g.lineTo(X + 18, Y + 1); g.stroke();
        }
        break;
      }
      case "hospital": case "hospitalW": {
        box(g, X + (o === "hospital" ? 3 : 0), Y + 9, o === "hospital" ? 29 : 28, 19, 17, "#f8f9fa", "#ffffff", "#e9ecef");
        windows(g, X + 4, Y + 13, 24, 3, 4, win);
        if (o === "hospital") { g.fillStyle = "#1c7ed6"; g.fillRect(X + 20, Y - 6, 6, 14); g.fillRect(X + 16, Y - 2, 14, 6); }
        break;
      }
      case "fire": {
        box(g, X + 3, Y + 10, 29, 18, 13, "#ffe3e3", "#e03131", "#ffc9c9");
        g.fillStyle = "#adb5bd"; g.fillRect(X + 6, Y - 14, 4, 12);
        badge(g, X + 18, Y + 3, "🚒");
        break;
      }
      case "fireGarage": {
        box(g, X, Y + 10, 28, 18, 13, "#ffe3e3", "#e03131", "#ffc9c9");
        g.fillStyle = "#c92a2a"; g.fillRect(X + 3, Y + 19, 9, 9); g.fillRect(X + 15, Y + 19, 9, 9);
        break;
      }
      case "police": {
        box(g, X + 3, Y + 10, 26, 18, 14, "#e7f5ff", "#364fc7", "#d0ebff");
        windows(g, X + 4, Y + 16, 24, 2, 4, win);
        badge(g, X + 16, Y + 3, "🚓");
        break;
      }
      case "station": {
        box(g, X, Y + 6, T, 22, 10, "#e3fafc", "#0c8599", "#c5f6fa");
        g.fillStyle = win; g.fillRect(X + 3, Y + 20, T - 6, 5);
        break;
      }
      case "plaza": {
        g.fillStyle = "#e9ecef"; g.fillRect(X, Y, T, T);
        g.fillStyle = "#ced4da"; for (var q = 0; q < 4; q++) g.fillRect(X + q * 8, Y, 1, T);
        treeAt(g, X + 16, Y + 22, 0.7, hv);
        break;
      }
      case "tree": {
        treeAt(g, X + 11, Y + 18, 0.85, hv); treeAt(g, X + 22, Y + 26, 0.75, hv + 1);
        break;
      }
    }
  }

  // まち を べつ の キャンバス に かく
  function buildMap(c) {
    var cv = document.createElement("canvas");
    cv.width = c.w * T * SC; cv.height = c.h * T * SC;
    var g = cv.getContext("2d");
    g.scale(SC, SC);
    var x, y, i;
    for (y = 0; y < c.h; y++) for (x = 0; x < c.w; x++) {
      i = y * c.w + x;
      var hv = D.hash(i) % 3;
      g.fillStyle = hv === 0 ? "#a6d36a" : hv === 1 ? "#a0ce64" : "#abd770";
      g.fillRect(x * T - 0.3, y * T - 0.3, T + 0.6, T + 0.6);
    }
    for (y = 0; y < c.h; y++) for (x = 0; x < c.w; x++) if (c.road[y * c.w + x]) road(g, c, x, y);
    for (y = 0; y < c.h; y++) for (x = 0; x < c.w; x++) { i = y * c.w + x; if (c.obj[i]) obj(g, c.obj[i], x, y, D.hash(i)); }
    // なまえ の ふだ
    Object.keys(D.PLACES).forEach(function (k) {
      var p = D.PLACES[k];
      tag(g, p.name, p.x * T + T / 2 + (k === "station" ? T / 2 : 0), p.y * T + (k === "park" ? T / 2 : T - 2));
    });
    return cv;
  }
  function tag(g, txt, cx, cy) {
    g.font = "800 7.5px " + A.FONT;
    var w = g.measureText(txt).width + 8;
    g.fillStyle = "rgba(255,255,255,.92)"; A.rr(g, cx - w / 2, cy - 6, w, 12, 6); g.fill();
    g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = 0.6; g.stroke();
    g.fillStyle = "#343a40"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, cx, cy + 0.5);
  }

  root.S119_RENDER = { T: T, SC: SC, buildMap: buildMap, mask: mask, isR: isR, nArms: nArms, ROAD_W: ROAD_W, treeAt: treeAt };
})(window);
