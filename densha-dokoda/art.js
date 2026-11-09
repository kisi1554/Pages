/* でんしゃ どこだ？ の え（ぜんぶ オリジナル の SVG）
 * ART[name] = { w, h, d(o) }  … (0,0)-(w,h) の なか に かく。でんしゃ は みぎ むき、
 * そこ（y = h）が レール の うえ。o は いろ など の オプション。
 */
(function (root) {
  "use strict";
  var OL = ' stroke="#2b2b2b" stroke-width="2" stroke-linejoin="round"';
  function R(x, y, w, h, f, rx, ex) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + f + '"' + (rx ? ' rx="' + rx + '"' : "") + (ex || "") + "/>"; }
  function C(cx, cy, r, f, ex) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + f + '"' + (ex || "") + "/>"; }
  function E(cx, cy, rx, ry, f, ex) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + f + '"' + (ex || "") + "/>"; }
  function P(d, f, ex) { return '<path d="' + d + '" fill="' + f + '"' + (ex || "") + "/>"; }
  function L(x1, y1, x2, y2, s, w, ex) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + s + '" stroke-width="' + (w || 2) + '" stroke-linecap="round"' + (ex || "") + "/>"; }
  function T(x, y, s, size, f, ex) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + f + '" text-anchor="middle" font-weight="bold" font-family="sans-serif"' + (ex || "") + ">" + s + "</text>"; }
  function wheel(cx, cy, r, rim) { return C(cx, cy, r, "#333") + C(cx, cy, r * 0.45, rim || "#999"); }
  function wheels(xs, cy, r, rim) { return xs.map(function (x) { return wheel(x, cy, r, rim); }).join(""); }
  function bogie(x, cy, r) { return R(x - r * 2.4, cy - r * 0.9, r * 4.8, r * 1.2, "#444", 2) + wheel(x - r * 1.2, cy, r) + wheel(x + r * 1.2, cy, r); }
  function winRow(x0, y, n, w, h, gap, f) { var s = ""; for (var i = 0; i < n; i++) s += R(x0 + i * (w + gap), y, w, h, f || "#a5d8ff", 3, ' stroke="#3a3a3a" stroke-width="1.5"'); return s; }
  function smoke(x, y, k, f) { k = k || 1; f = f || "#ced4da"; return C(x, y, 10 * k, f) + C(x + 14 * k, y - 10 * k, 13 * k, f) + C(x + 34 * k, y - 18 * k, 16 * k, f, ' opacity=".85"'); }
  function panto(x, y) { return P("M" + (x - 12) + " " + y + " L" + x + " " + (y - 10) + " L" + (x + 12) + " " + y, "none", ' stroke="#333" stroke-width="2"') + L(x - 14, y - 10, x + 14, y - 10, "#333", 2); }
  function person(x, y, shirt, k, hair) { k = k || 1; return C(x, y - 30 * k, 6 * k, "#ffd8a8", ' stroke="#2b2b2b" stroke-width="1"') + P("M" + (x - 6 * k) + " " + (y - 34 * k) + " a" + 6 * k + " " + 6 * k + " 0 0 1 " + 12 * k + " 0z", hair || "#5c3d2e") + R(x - 6 * k, y - 24 * k, 12 * k, 14 * k, shirt, 3 * k) + R(x - 5 * k, y - 10 * k, 4 * k, 10 * k, "#495057") + R(x + 1 * k, y - 10 * k, 4 * k, 10 * k, "#495057"); }
  function head(x, y, r, hair, arms) {
    var s = C(x, y, r, "#ffd8a8", ' stroke="#2b2b2b" stroke-width="1"') + P("M" + (x - r) + " " + (y - 1) + " a" + r + " " + r + " 0 0 1 " + 2 * r + " 0z", hair || "#5c3d2e");
    if (arms) s += L(x - r, y + r, x - r - 6, y - r - 8, "#ffd8a8", 3) + L(x + r, y + r, x + r + 6, y - r - 8, "#ffd8a8", 3);
    return s;
  }
  function container(x, y, w, h, f) {
    var s = R(x, y, w, h, f, 2, OL);
    for (var i = x + 8; i < x + w - 4; i += 8) s += L(i, y + 4, i, y + h - 4, "rgba(0,0,0,.18)", 2);
    return s;
  }
  function gear(cx, cy, r, f) {
    var s = "", n = 10;
    for (var i = 0; i < n; i++) { var a = (i / n) * Math.PI * 2; s += R(-3, -r - 4, 6, 6, f, 0, ' transform="translate(' + cx + " " + cy + ") rotate(" + (a * 180 / Math.PI).toFixed(1) + ')"'); }
    return s + C(cx, cy, r, f, OL) + C(cx, cy, r * 0.35, "#fff", ' stroke="#2b2b2b" stroke-width="1.5"');
  }

  var ART = {
    /* ---------- おおきな えき の まち ---------- */
    tsukin: { w: 372, h: 74, d: function () {
      var s = "";
      for (var c = 0; c < 3; c++) {
        var x = c * 126;
        s += R(x, 12, 120, 52, "#dee2e6", c === 2 ? 0 : 4, OL);
        if (c === 2) s += P("M" + (x + 100) + " 12 Q" + (x + 122) + " 12 " + (x + 122) + " 34 L" + (x + 122) + " 64 L" + (x + 100) + " 64Z", "#dee2e6", OL);
        s += R(x + 1, 46, c === 2 ? 120 : 118, 7, "#2f9e44");
        for (var d = 0; d < 3; d++) s += R(x + 10 + d * 38, 20, 16, 40, "#ced4da", 2, ' stroke="#555" stroke-width="1.5"') + R(x + 13 + d * 38, 24, 10, 12, "#a5d8ff");
        s += winRow(x + 30, 24, 3, 14, 14, 24);
        s += bogie(x + 24, 66, 6) + bogie(x + 96, 66, 6);
      }
      s += R(358, 22, 12, 14, "#a5d8ff", 2) + C(366, 56, 3, "#ffe066");
      return s + panto(189, 12);
    } },
    shinkansen: { w: 400, h: 62, d: function () {
      var body = "M0 14 L280 14 Q350 14 398 46 Q400 54 392 56 L0 56Z";
      return P(body, "#f8f9fa", OL) + P("M0 40 L330 40 Q370 42 396 50 L392 54 L0 54Z", "#1c7ed6") + P("M0 36 L320 36 L326 39 L0 39Z", "#1c7ed6") +
        winRow(14, 22, 16, 9, 8, 6, "#495057") + P("M300 18 Q332 18 352 30 L318 30Z", "#343a40") +
        L(134, 15, 134, 55, "#adb5bd", 1.5) + L(266, 15, 266, 55, "#adb5bd", 1.5) +
        R(0, 54, 400, 4, "#868e96") + wheels([30, 52, 110, 160, 182, 240, 290, 312, 360], 58, 4) + C(388, 50, 2.5, "#ffe066");
    } },
    chikatetsu: { w: 84, h: 78, d: function () {
      var s = R(6, 30, 72, 46, "#adb5bd", 3, OL) + P("M14 76 L14 40 L70 40 L70 76Z", "#343a40");
      for (var i = 0; i < 5; i++) s += R(16, 44 + i * 7, 52, 3, "#868e96");
      s += P("M0 30 L84 30 L76 20 L8 20Z", "#74c0fc", OL) + R(30, 0, 24, 20, "#1971c2", 4, OL) + T(42, 15, "ち", 14, "#fff");
      return s + person(56, 72, "#f783ac", 0.6);
    } },
    kamotsu: { w: 430, h: 66, d: function () {
      var s = R(0, 14, 110, 42, "#c92a2a", 5, OL) + R(6, 20, 16, 14, "#a5d8ff", 2) + R(88, 20, 16, 14, "#a5d8ff", 2) + R(0, 40, 110, 5, "#fff3bf") + R(30, 22, 50, 12, "#a61e4d", 2) +
        panto(30, 14) + panto(80, 14) + bogie(24, 60, 6) + bogie(86, 60, 6);
      var cols = ["#e8590c", "#1971c2", "#2f9e44", "#7048e8", "#e8590c", "#f59f00"];
      for (var c = 0; c < 2; c++) {
        var x = 116 + c * 158;
        s += R(x, 48, 152, 7, "#495057", 1) + bogie(x + 22, 60, 5) + bogie(x + 130, 60, 5);
        for (var k = 0; k < 3; k++) s += container(x + 3 + k * 50, 22, 46, 26, cols[c * 3 + k]);
      }
      return s;
    } },
    marutai: { w: 170, h: 70, d: function () {
      var s = R(0, 18, 170, 36, "#fab005", 4, OL) + R(4, 22, 20, 14, "#a5d8ff", 2) + R(146, 22, 20, 14, "#a5d8ff", 2) + R(60, 10, 50, 10, "#f08c00", 2, OL);
      s += R(78, 2, 10, 8, "#ff922b", 2) + C(83, 4, 4, "#ff6b6b");
      for (var i = 0; i < 4; i++) s += R(66 + i * 11, 54, 5, 12, "#868e96");
      for (var j = 0; j < 7; j++) s += L(10 + j * 22, 30, 22 + j * 22, 46, "#2b2b2b", 2, ' opacity=".35"');
      return s + wheels([22, 44, 126, 148], 62, 7);
    } },
    /* ---------- やま の まち ---------- */
    cablecar: { w: 110, h: 100, d: function () {
      // そこ は さか（かたむき 0.5）。まど は まっすぐ。
      var s = P("M0 100 L110 45 L110 5 L0 60Z", "#f03e3e", OL) + P("M0 92 L110 37 L110 31 L0 86Z", "#fff");
      for (var i = 0; i < 4; i++) { var x = 8 + i * 25, y = 60 - x * 0.5; s += R(x, y - 18 + 4, 18, 18, "#a5d8ff", 2, ' stroke="#333" stroke-width="1.5"'); }
      s += wheel(18, 98 - 9, 6) + wheel(92, 98 - 46, 6);
      return s + L(110, 40, 118, 36, "#555", 2);
    } },
    ropeway: { w: 70, h: 96, d: function () {
      return R(22, 0, 26, 8, "#495057", 3) + C(28, 4, 4, "#868e96") + C(42, 4, 4, "#868e96") + L(35, 8, 35, 34, "#495057", 4) + L(35, 30, 14, 40, "#495057", 3) + L(35, 30, 56, 40, "#495057", 3) +
        R(6, 36, 58, 56, "#e03131", 10, OL) + R(12, 44, 46, 22, "#a5d8ff", 4) + R(6, 74, 58, 5, "#fff3bf") + head(24, 58, 5, "#212529") + head(44, 58, 5, "#e8590c");
    } },
    tunnel: { w: 230, h: 120, d: function () {
      var s = R(0, 0, 96, 120, "#868e96", 4, OL);
      for (var y = 10; y < 120; y += 18) for (var x = (y / 18) % 2 ? 0 : 12; x < 96; x += 24) s += R(x + 2, y, 20, 14, "#adb5bd", 2);
      s += P("M14 120 L14 58 Q14 22 48 22 Q82 22 82 58 L82 120Z", "#212529");
      s += P("M60 60 L196 60 Q228 60 228 92 L228 116 L60 116Z", "#ff922b", OL) + R(60, 98, 168, 6, "#fff") + R(196, 68, 22, 18, "#a5d8ff", 3) + winRow(80, 70, 4, 18, 16, 10) + C(222, 104, 3, "#ffe066") + wheels([170, 196], 116, 5);
      return s;
    } },
    tekkyo: { w: 250, h: 62, d: function () {
      var s = "";
      for (var c = 0; c < 2; c++) {
        var x = c * 126;
        s += R(x, 8, 120, 48, "#fff3bf", c === 1 ? 0 : 4, OL) + R(x + 1, 34, 118, 12, "#e8590c") + winRow(x + 10, 16, 5, 16, 14, 6) + bogie(x + 24, 58, 5) + bogie(x + 96, 58, 5);
      }
      s += P("M226 8 Q250 8 250 34 L250 56 L226 56Z", "#fff3bf", OL) + R(230, 14, 14, 16, "#a5d8ff", 2) + C(244, 48, 3, "#ffe066");
      return s + smoke(110, 4, 0.5, "#868e96");
    } },
    abt: { w: 170, h: 70, d: function () {
      return R(0, 10, 96, 46, "#fff", 4, OL) + R(1, 36, 94, 8, "#1971c2") + winRow(8, 18, 4, 16, 14, 6) + bogie(20, 62, 5) + bogie(76, 62, 5) +
        R(100, 14, 70, 42, "#1971c2", 4, OL) + R(150, 20, 14, 14, "#a5d8ff", 2) + R(110, 4, 22, 10, "#1864ab", 2) + gear(135, 60, 10, "#fcc419") + wheel(110, 62, 5) + wheel(160, 62, 5);
    } },
    /* ---------- みなと の まち ---------- */
    monorail: { w: 330, h: 66, d: function () {
      var s = "";
      for (var c = 0; c < 3; c++) {
        var x = c * 110;
        s += R(x, 6, 106, 60, "#f8f9fa", c === 2 ? 0 : 6, OL) + R(x + 1, 36, 104, 8, "#e8590c") + R(x + 1, 46, 104, 4, "#1c7ed6") + winRow(x + 10, 14, 4, 16, 16, 8) + R(x + 1, 52, 104, 13, "#dee2e6");
      }
      s += P("M300 6 Q330 6 330 40 L330 66 L300 66Z", "#f8f9fa", OL) + P("M306 12 Q324 14 326 32 L306 32Z", "#495057");
      return s;
    } },
    container: { w: 200, h: 54, d: function () {
      return R(0, 36, 200, 8, "#495057", 1) + bogie(28, 48, 5) + bogie(172, 48, 5) + container(4, 6, 92, 30, "#d9480f") + container(104, 6, 92, 30, "#1971c2") +
        R(30, 14, 40, 8, "rgba(255,255,255,.8)", 2) + R(130, 14, 40, 8, "rgba(255,255,255,.8)", 2);
    } },
    ferry: { w: 320, h: 130, d: function () {
      var s = P("M0 76 L320 76 L296 124 L22 124Z", "#1864ab", OL) + R(10, 76, 300, 12, "#fff");
      s += R(36, 46, 250, 30, "#f8f9fa", 4, OL) + R(66, 22, 186, 26, "#f8f9fa", 4, OL) + winRow(46, 54, 11, 14, 10, 8, "#4dabf7") + winRow(76, 28, 8, 14, 10, 8, "#4dabf7");
      s += R(190, 0, 30, 24, "#e03131", 3, OL) + R(190, 6, 30, 5, "#fff");
      return s + P("M4 112 Q30 104 60 112 Q90 120 120 112", "none", ' stroke="#fff" stroke-width="3" opacity=".8"');
    } },
    shunter: { w: 130, h: 64, d: function () {
      return R(0, 26, 130, 26, "#e8590c", 3, OL) + R(36, 6, 34, 46, "#e8590c", 3, OL) + R(41, 12, 24, 14, "#a5d8ff", 2) + R(0, 40, 130, 4, "#f8f9fa") + R(84, 18, 8, 8, "#495057") +
        wheels([16, 38, 92, 114], 56, 8);
    } },
    agt: { w: 230, h: 58, d: function () {
      var s = "";
      for (var c = 0; c < 2; c++) {
        var x = c * 116;
        s += R(x, 6, 112, 40, "#f8f9fa", c === 1 ? 0 : 8, OL) + R(x + 1, 32, 110, 6, "#4dabf7") + winRow(x + 10, 13, 5, 14, 14, 6);
        s += C(x + 22, 50, 8, "#212529") + C(x + 90, 50, 8, "#212529") + C(x + 22, 50, 3, "#adb5bd") + C(x + 90, 50, 3, "#adb5bd");
      }
      return s + P("M206 6 Q230 8 230 30 L230 46 L206 46Z", "#f8f9fa", OL) + P("M210 12 Q224 14 226 28 L210 28Z", "#495057");
    } },
    /* ---------- むかし の まち ---------- */
    romen: { w: 190, h: 88, d: function () {
      var s = R(0, 24, 190, 54, "#2f9e44", 8, OL) + R(1, 54, 188, 23, "#fff3bf", 0) + R(0, 54, 190, 4, "#2b8a3e") + winRow(18, 32, 6, 18, 16, 7) + R(4, 32, 10, 30, "#a5d8ff", 2) + R(176, 32, 10, 30, "#a5d8ff", 2);
      s += R(70, 18, 50, 8, "#495057", 2) + P("M84 18 L104 2 L118 2", "none", ' stroke="#333" stroke-width="3"') + C(182, 70, 3, "#ffe066");
      return s + wheels([30, 52, 138, 160], 82, 6);
    } },
    sl: { w: 280, h: 118, d: function () {
      var s = smoke(40, 30, 1.1, "#adb5bd") + smoke(10, 16, 0.8, "#dee2e6");
      s += R(52, 52, 140, 40, "#212529", 18, OL) + R(66, 30, 14, 24, "#212529", 2, OL) + E(120, 52, 14, 8, "#343a40", OL) + R(192, 38, 46, 56, "#212529", 3, OL) + R(200, 46, 18, 16, "#ffd43b", 2) + R(188, 34, 54, 6, "#343a40");
      s += R(40, 74, 20, 18, "#343a40", 2) + R(244, 52, 36, 42, "#343a40", 3, OL) + C(52, 72, 8, "#f8f9fa", ' stroke="#2b2b2b" stroke-width="1.5"');
      s += C(100, 98, 18, "#c92a2a", OL) + C(100, 98, 7, "#212529") + C(148, 98, 18, "#c92a2a", OL) + C(148, 98, 7, "#212529") + C(196, 100, 13, "#c92a2a", OL) + L(100, 98, 148, 98, "#adb5bd", 4) + wheels([62, 254, 272], 108, 9, "#c92a2a");
      return s + smoke(70, 14, 0.9);
    } },
    torokko: { w: 210, h: 60, d: function () {
      var s = R(160, 18, 50, 30, "#5c940d", 3, OL) + R(166, 8, 24, 12, "#495057", 2) + wheels([172, 198], 54, 6);
      for (var c = 0; c < 3; c++) { var x = c * 52; s += head(x + 16, 24, 6, ["#212529", "#e8590c", "#7048e8"][c], c === 1) + head(x + 32, 26, 6, "#5c3d2e") + P("M" + x + " 26 L" + (x + 48) + " 26 L" + (x + 44) + " 48 L" + (x + 4) + " 48Z", "#a0522d", OL) + wheels([x + 12, x + 36], 54, 6); }
      return s;
    } },
    bashatetsudo: { w: 220, h: 96, d: function () {
      var s = R(0, 20, 120, 52, "#2b8a3e", 6, OL) + R(-4, 14, 128, 10, "#5c3d2e", 3) + winRow(10, 30, 4, 20, 18, 8, "#fff3bf") + R(1, 58, 118, 6, "#fcc419") + wheels([24, 96], 84, 11) + head(132, 30, 7, "#212529") + R(124, 38, 16, 18, "#1971c2", 3);
      s += L(120, 60, 156, 60, "#5c3d2e", 3);
      s += E(186, 52, 30, 16, "#a0522d", OL) + P("M206 46 L220 22 L214 18 L198 36Z", "#a0522d", OL) + C(214, 22, 8, "#a0522d", OL) + C(216, 20, 1.6, "#212529") + P("M200 38 Q206 24 214 14", "none", ' stroke="#3d2814" stroke-width="4"');
      s += R(164, 62, 5, 30, "#8a4b20") + R(178, 62, 5, 30, "#8a4b20") + R(192, 62, 5, 30, "#8a4b20") + R(204, 62, 5, 30, "#8a4b20") + P("M156 50 Q148 60 152 70", "none", ' stroke="#3d2814" stroke-width="4"');
      return s;
    } },
    jinrikisha: { w: 130, h: 96, d: function () {
      var s = C(42, 70, 24, "none", ' stroke="#2b2b2b" stroke-width="4"') + L(42, 46, 42, 94, "#555", 2) + L(18, 70, 66, 70, "#555", 2) + L(25, 53, 59, 87, "#555", 2) + L(25, 87, 59, 53, "#555", 2);
      s += P("M18 56 L18 24 Q40 14 62 24 L66 56Z", "#212529", OL) + R(22, 44, 44, 12, "#c92a2a", 3) + head(46, 36, 8, "#212529");
      s += L(62, 58, 112, 66, "#5c3d2e", 4) + C(110, 32, 8, "#ffd8a8", ' stroke="#2b2b2b" stroke-width="1"') + P("M96 30 L124 30 L110 18Z", "#e9c46a", OL) + R(102, 40, 16, 26, "#1c7ed6", 4) + L(106, 66, 100, 94, "#495057", 5) + L(114, 66, 122, 94, "#495057", 5);
      return s;
    } },
    /* ---------- ゆき の まち ---------- */
    russell: { w: 230, h: 92, d: function () {
      var s = P("M168 24 L206 24 L230 86 L168 86Z", "#212529", OL) + P("M176 32 L204 32 L222 80 L176 80Z", "#e03131") + R(60, 30, 110, 44, "#e03131", 4, OL) + R(0, 30, 62, 44, "#212529", 4, OL);
      s += R(70, 20, 40, 14, "#e03131", 2, OL) + R(76, 24, 12, 8, "#a5d8ff") + R(8, 38, 14, 12, "#a5d8ff", 2) + R(130, 38, 14, 12, "#a5d8ff", 2) + wheels([20, 44, 90, 116, 146, 190], 82, 8);
      return s + C(228, 52, 14, "#fff", ' opacity=".95"') + C(222, 36, 10, "#fff") + C(214, 20, 8, "#f1f3f5");
    } },
    rotary: { w: 220, h: 120, d: function () {
      var s = P("M120 34 Q170 -6 214 18", "none", ' stroke="#fff" stroke-width="14" stroke-linecap="round" opacity=".95"') + C(214, 18, 9, "#fff");
      s += R(0, 50, 120, 52, "#f08c00", 4, OL) + R(10, 58, 16, 14, "#a5d8ff", 2) + R(94, 58, 16, 14, "#a5d8ff", 2) + R(112, 38, 16, 18, "#495057", 2);
      s += R(124, 52, 50, 50, "#212529", 6, OL) + C(176, 76, 26, "#adb5bd", OL);
      for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; s += L(176, 76, (176 + 24 * Math.cos(a)).toFixed(1), (76 + 24 * Math.sin(a)).toFixed(1), "#495057", 4); }
      return s + C(176, 76, 6, "#fff", OL) + wheels([22, 50, 80, 110, 150], 108, 9);
    } },
    shindai: { w: 440, h: 62, d: function () {
      var s = R(0, 12, 100, 44, "#1864ab", 4, OL) + R(8, 18, 16, 14, "#ffe066", 2) + panto(36, 12) + panto(76, 12) + R(0, 40, 100, 4, "#e9ecef") + bogie(24, 58, 5) + bogie(76, 58, 5) + C(4, 48, 3, "#fff");
      for (var c = 0; c < 2; c++) {
        var x = 106 + c * 168;
        s += R(x, 10, 162, 46, "#1c2a6b", 5, OL) + R(x + 1, 44, 160, 2, "#f8f9fa") + R(x + 1, 48, 160, 2, "#f8f9fa") + winRow(x + 10, 18, 6, 18, 14, 8, "#ffe066") + bogie(x + 26, 58, 5) + bogie(x + 136, 58, 5);
      }
      return s;
    } },
    diesel: { w: 170, h: 72, d: function () {
      return smoke(70, 10, 0.55, "#868e96") + R(0, 22, 170, 42, "#fff3bf", 6, OL) + R(1, 46, 168, 10, "#e03131") + winRow(24, 30, 5, 18, 12, 6) + R(4, 30, 12, 14, "#a5d8ff", 2) + R(154, 30, 12, 14, "#a5d8ff", 2) + R(60, 16, 24, 7, "#495057", 2) + bogie(30, 66, 5) + bogie(140, 66, 5) + C(164, 58, 3, "#ffe066");
    } },
    stove: { w: 180, h: 80, d: function () {
      return smoke(96, 12, 0.6, "#adb5bd") + R(94, 14, 8, 20, "#343a40") + R(0, 30, 180, 42, "#a0522d", 6, OL) + R(-2, 26, 184, 8, "#5c3d2e", 3) + winRow(12, 40, 6, 20, 14, 8, "#ffd43b") + C(120, 47, 4, "#ff6b6b") + R(1, 60, 178, 4, "#fcc419") + bogie(30, 74, 5) + bogie(150, 74, 5);
    } },
    /* ---------- ゆうえんち ---------- */
    kodomo: { w: 230, h: 66, d: function () {
      var s = R(160, 20, 60, 34, "#e64980", 8, OL) + R(150, 8, 30, 46, "#e64980", 4, OL) + R(155, 14, 20, 14, "#a5d8ff", 3) + R(196, 6, 12, 16, "#fcc419", 2, OL) + C(222, 38, 5, "#ffe066", OL) + wheels([170, 204], 58, 8, "#fcc419");
      var cols = ["#4dabf7", "#69db7c"];
      for (var c = 0; c < 2; c++) { var x = c * 74; s += head(x + 22, 26, 7, "#212529", true) + head(x + 46, 26, 7, "#e8590c", c === 0) + R(x, 30, 68, 24, cols[c], 6, OL) + wheels([x + 14, x + 54], 58, 7, "#fcc419"); }
      return s;
    } },
    coaster: { w: 190, h: 76, d: function () {
      var s = "", cols = ["#f03e3e", "#fcc419", "#4dabf7"];
      for (var c = 0; c < 3; c++) { var x = c * 62; s += head(x + 20, 30, 7, ["#212529", "#e8590c", "#7048e8"][c], true) + head(x + 40, 30, 7, "#5c3d2e", true) + P("M" + x + " 36 L" + (x + 58) + " 36 L" + (x + 58) + " 62 L" + (x + 6) + " 62 Q" + x + " 62 " + x + " 54Z", cols[c], OL) + R(x + 12, 36, 36, 4, "#adb5bd") + wheels([x + 14, x + 46], 68, 6); }
      return s + P("M186 36 L190 36 L190 62 L186 62Z", "#f03e3e");
    } },
    kanransha: { w: 230, h: 250, d: function () {
      var s = L(115, 115, 40, 248, "#adb5bd", 8) + L(115, 115, 190, 248, "#adb5bd", 8) + C(115, 115, 100, "none", ' stroke="#e64980" stroke-width="6"') + C(115, 115, 80, "none", ' stroke="#f783ac" stroke-width="2"');
      var cols = ["#f03e3e", "#fcc419", "#4dabf7", "#69db7c", "#9775fa", "#ff922b", "#3bc9db", "#f783ac"];
      for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, x = 115 + 100 * Math.cos(a), y = 115 + 100 * Math.sin(a); s += L(115, 115, x.toFixed(1), y.toFixed(1), "#ced4da", 2) + R((x - 11).toFixed(1), (y + 2).toFixed(1), 22, 18, cols[i], 5, OL); }
      return s + C(115, 115, 12, "#fcc419", OL);
    } },
    minisl: { w: 160, h: 66, d: function () {
      var s = R(70, 30, 66, 22, "#212529", 10, OL) + R(78, 14, 10, 18, "#212529", 2) + C(83, 8, 7, "#dee2e6") + R(120, 22, 26, 30, "#2b8a3e", 3, OL) + C(70, 42, 5, "#fcc419") + wheels([90, 116, 140], 58, 8, "#e03131");
      s += R(0, 44, 64, 10, "#5c940d", 3, OL) + wheels([12, 52], 58, 7) + R(4, 50, 66, 4, "#343a40");
      return s + person(32, 46, "#f76707", 1.15);
    } },
    roadtrain: { w: 240, h: 78, d: function () {
      var s = R(170, 24, 70, 40, "#fcc419", 8, OL) + R(166, 10, 34, 54, "#fcc419", 4, OL) + R(172, 16, 22, 16, "#a5d8ff", 3) + R(216, 12, 12, 14, "#e03131", 2, OL) + C(234, 46, 5, "#fff", OL);
      for (var c = 0; c < 2; c++) { var x = c * 82; s += R(x, 14, 76, 6, "#e03131", 3) + L(x + 4, 20, x + 4, 40, "#555", 2) + L(x + 72, 20, x + 72, 40, "#555", 2) + head(x + 24, 38, 6, "#212529", c === 1) + head(x + 50, 38, 6, "#e8590c") + R(x, 42, 76, 22, "#f8f9fa", 6, OL); }
      // タイヤ（ゴム）で みち を はしる
      return s + [16, 60, 98, 142, 186, 222].map(function (x) { return C(x, 66, 11, "#212529") + C(x, 66, 4, "#adb5bd"); }).join("");
    } },

    /* ---------- おまけ（へんな もの） ---------- */
    cat: { w: 56, h: 32, d: function () {
      return E(26, 22, 22, 10, "#ff922b", OL) + C(44, 18, 9, "#ff922b", OL) + P("M38 11 L40 3 L45 10Z", "#ff922b", OL) + P("M46 10 L51 3 L52 12Z", "#ff922b", OL) + P("M40 19 q2 2 4 0 M46 19 q2 2 4 0", "none", ' stroke="#2b2b2b" stroke-width="1.5"') +
        P("M6 26 Q-2 18 8 14", "none", ' stroke="#ff922b" stroke-width="6" stroke-linecap="round"') + T(14, 8, "z", 10, "#4dabf7") + T(22, 2, "z", 8, "#4dabf7");
    } },
    monkey: { w: 50, h: 82, d: function () {
      return R(20, 0, 10, 10, "#868e96") + C(25, 18, 12, "#fff", OL) + L(25, 12, 25, 18, "#333", 2) + L(25, 18, 30, 21, "#333", 2) + L(14, 34, 20, 26, "#a0522d", 5) + L(36, 34, 30, 26, "#a0522d", 5) +
        E(25, 54, 12, 16, "#a0522d", OL) + C(25, 38, 10, "#a0522d", OL) + E(25, 41, 7, 5, "#ffd8a8") + C(22, 37, 1.5, "#212529") + C(28, 37, 1.5, "#212529") + C(14, 37, 4, "#ffd8a8") + C(36, 37, 4, "#ffd8a8") + P("M37 66 Q50 70 44 80", "none", ' stroke="#a0522d" stroke-width="4" stroke-linecap="round"');
    } },
    bear: { w: 74, h: 78, d: function () {
      return L(0, 72, 72, 60, "#e03131", 4) + L(4, 78, 74, 66, "#e03131", 4) + E(36, 48, 16, 18, "#8d5524", OL) + C(36, 24, 13, "#8d5524", OL) + C(26, 13, 5, "#8d5524", OL) + C(46, 13, 5, "#8d5524", OL) + E(37, 28, 6, 4, "#d9a066") + C(32, 21, 1.6, "#212529") + C(41, 21, 1.6, "#212529") +
        R(22, 6, 28, 6, "#4dabf7", 3) + L(18, 46, 6, 28, "#8d5524", 5) + L(54, 46, 66, 30, "#8d5524", 5) + L(6, 28, 4, 70, "#495057", 2) + L(66, 30, 64, 66, "#495057", 2) + E(28, 66, 6, 5, "#8d5524") + E(44, 64, 6, 5, "#8d5524");
    } },
    elephant: { w: 110, h: 76, d: function () {
      return container(0, 30, 110, 46, "#2f9e44") + E(56, 28, 26, 20, "#adb5bd", OL) + E(30, 26, 14, 16, "#ced4da", OL) + E(82, 26, 14, 16, "#ced4da", OL) + C(48, 22, 2.5, "#212529") + C(64, 22, 2.5, "#212529") + P("M56 34 Q58 56 74 54 Q80 52 78 46", "none", ' stroke="#adb5bd" stroke-width="9" stroke-linecap="round"') + R(0, 30, 110, 6, "#2b8a3e");
    } },
    frog: { w: 52, h: 66, d: function () {
      return P("M2 24 Q26 -6 50 24Z", "#e64980", OL) + L(26, 24, 26, 46, "#495057", 2) + E(26, 54, 14, 11, "#51cf66", OL) + C(18, 38, 6, "#51cf66", OL) + C(34, 38, 6, "#51cf66", OL) + C(18, 37, 2.5, "#212529") + C(34, 37, 2.5, "#212529") + P("M20 48 Q26 52 32 48", "none", ' stroke="#2b2b2b" stroke-width="1.5"') + E(14, 64, 6, 3, "#51cf66") + E(38, 64, 6, 3, "#51cf66");
    } },
    penguin: { w: 92, h: 70, d: function () {
      return P("M4 70 Q4 4 46 4 Q88 4 88 70Z", "#f8f9fa", OL) + P("M28 70 Q28 30 46 30 Q64 30 64 70Z", "#343a40") + E(46, 56, 12, 14, "#212529") + E(46, 60, 8, 10, "#fff") + C(42, 50, 1.8, "#fff") + C(50, 50, 1.8, "#fff") + P("M43 54 L49 54 L46 58Z", "#fab005") + R(4, 64, 84, 6, "#e7f5ff");
    } },
    snowman: { w: 62, h: 82, d: function () {
      return C(30, 60, 20, "#f8f9fa", OL) + C(30, 28, 15, "#f8f9fa", OL) + R(18, 4, 24, 12, "#c92a2a", 3) + C(25, 26, 2, "#212529") + C(35, 26, 2, "#212529") + P("M30 30 L40 32 L30 34Z", "#ff922b") +
        L(44, 52, 60, 36, "#8a4b20", 2.5) + C(58, 38, 4, "#e9c46a", OL) + P("M54 30 L60 24 L64 32Z", "#dee2e6", OL) + C(56, 46, 4, "#f8f9fa", OL) + R(52, 52, 8, 4, "#868e96");
    } },
    cow: { w: 82, h: 66, d: function () {
      return E(42, 34, 24, 16, "#fff", OL) + C(32, 30, 6, "#212529") + C(52, 38, 5, "#212529") + C(66, 18, 13, "#fff", OL) + E(70, 24, 8, 6, "#ffc9c9") + C(62, 15, 1.8, "#212529") + C(72, 15, 1.8, "#212529") + P("M56 8 L54 0 M76 8 L80 1", "none", ' stroke="#868e96" stroke-width="3"') +
        L(46, 34, 62, 20, "#fff", 4) + R(8, 38, 70, 20, "#7048e8", 6, OL) + R(14, 38, 58, 4, "#adb5bd") + wheels([20, 64], 60, 6);
    } },

    /* ---------- まち の かざり（さがす もの では ない） ---------- */
    person: { w: 18, h: 44, d: function (o) { return person(9, 44, o.c || "#4dabf7", 1.2, o.hair); } },
    kid: { w: 14, h: 32, d: function (o) { return person(7, 32, o.c || "#ff8787", 0.85, o.hair); } },
    car: { w: 74, h: 36, d: function (o) {
      return P("M4 26 L4 16 L18 16 L28 4 L54 4 L64 16 L72 18 L72 28 L4 28Z", o.c || "#f03e3e", OL) + R(32, 8, 12, 9, "#a5d8ff") + R(46, 8, 12, 9, "#a5d8ff") + wheel(18, 29, 7) + wheel(58, 29, 7);
    } },
    bus: { w: 150, h: 58, d: function (o) { return R(0, 6, 150, 42, o.c || "#fab005", 8, OL) + winRow(10, 14, 6, 16, 14, 6) + R(130, 14, 14, 20, "#a5d8ff", 3) + R(1, 36, 148, 4, "#fff") + wheel(30, 50, 8) + wheel(118, 50, 8); } },
    truck: { w: 128, h: 56, d: function (o) { return container(0, 4, 90, 40, o.c || "#1971c2") + R(92, 16, 34, 28, "#f8f9fa", 6, OL) + R(104, 20, 18, 10, "#a5d8ff") + R(0, 44, 126, 4, "#495057") + wheel(20, 48, 8) + wheel(60, 48, 8) + wheel(108, 48, 8); } },
    house: { w: 92, h: 90, d: function (o) { return R(8, 40, 76, 50, o.c || "#fff3bf", 0, OL) + P("M0 42 L46 6 L92 42Z", o.r || "#c92a2a", OL) + R(20, 52, 18, 16, "#a5d8ff", 2, OL) + R(54, 58, 18, 32, "#8a4b20", 2, OL) + C(68, 75, 1.8, "#fcc419"); } },
    machiya: { w: 120, h: 92, d: function (o) {
      var s = R(4, 34, 112, 58, o.c || "#e9c46a", 0, OL) + P("M0 36 L12 14 L108 14 L120 36Z", "#495057", OL) + R(0, 30, 120, 6, "#343a40");
      for (var i = 10; i < 110; i += 7) s += L(i, 44, i, 70, "#8a4b20", 2);
      return s + R(40, 72, 40, 20, "#5c3d2e", 2) + R(90, 74, 20, 18, "#c92a2a", 2) + T(100, 87, "や", 12, "#fff");
    } },
    shop: { w: 110, h: 90, d: function (o) { var s = R(4, 20, 102, 70, "#f8f9fa", 0, OL), cl = o.c || "#f03e3e"; for (var i = 0; i < 6; i++) s += P("M" + (4 + i * 17) + " 20 l17 0 l0 16 q-8.5 8 -17 0z", i % 2 ? "#fff" : cl, ' stroke="#2b2b2b" stroke-width="1"'); return s + R(14, 46, 40, 30, "#a5d8ff", 2, OL) + R(66, 50, 28, 40, "#8a4b20", 2, OL); } },
    building: { w: 80, h: 160, d: function (o) {
      var w = o.bw || 80, h = o.bh || 160, s = R(0, 0, w, h, o.c || "#a5b4c8", 2, ' stroke="#64748b" stroke-width="2"');
      for (var y = 10; y < h - 14; y += 20) for (var x = 8; x < w - 12; x += 18) s += R(x, y, 10, 12, o.lit && ((x * 7 + y) % 3) ? "#ffe066" : "#e7f5ff", 1);
      return s;
    } },
    tree: { w: 52, h: 84, d: function (o) { return R(22, 52, 8, 32, "#8a4b20") + C(26, 36, 22, o.c || "#51cf66", OL) + C(16, 46, 12, o.c || "#51cf66") + C(36, 44, 13, o.c || "#51cf66"); } },
    pine: { w: 46, h: 92, d: function (o) { return R(20, 72, 8, 20, "#8a4b20") + P("M23 0 L44 40 L32 40 L46 74 L0 74 L14 40 L2 40Z", o.c || "#2b8a3e", OL) + (o.snow ? P("M23 0 L32 18 L14 18Z M14 40 L32 40 L36 50 L10 50Z", "#fff") : ""); } },
    dog: { w: 40, h: 28, d: function (o) { return E(18, 16, 14, 8, o.c || "#e9c46a", OL) + C(32, 10, 7, o.c || "#e9c46a", OL) + E(32, 6, 3, 6, "#8a4b20") + C(34, 10, 1.4, "#212529") + R(8, 20, 4, 8, o.c || "#e9c46a") + R(24, 20, 4, 8, o.c || "#e9c46a") + L(4, 14, 0, 6, o.c || "#e9c46a", 3); } },
    bird: { w: 24, h: 12, d: function (o) { return P("M0 4 Q6 -2 12 6 Q18 -2 24 4", "none", ' stroke="' + (o.c || "#495057") + '" stroke-width="2.5" stroke-linecap="round"'); } },
    cloud: { w: 120, h: 50, d: function (o) { var f = o.c || "#fff"; return C(30, 32, 18, f) + C(56, 22, 22, f) + C(84, 30, 18, f) + R(20, 30, 80, 20, f, 10); } },
    lamp: { w: 18, h: 90, d: function (o) { return R(7, 14, 4, 76, "#495057") + R(1, 4, 16, 12, "#343a40", 3) + C(9, 12, 5, o.on ? "#ffe066" : "#fff9db"); } },
    boat: { w: 96, h: 50, d: function (o) { return P("M0 30 L96 30 L84 50 L10 50Z", o.c || "#f8f9fa", OL) + R(40, 12, 30, 18, "#fff", 2, OL) + R(46, 16, 8, 8, "#a5d8ff") + L(30, 0, 30, 30, "#495057", 2) + P("M30 2 L46 18 L30 18Z", "#ffe066"); } },
    crane: { w: 150, h: 220, d: function (o) { return R(20, 40, 10, 180, o.c || "#f03e3e") + R(110, 40, 10, 180, o.c || "#f03e3e") + R(0, 40, 150, 14, o.c || "#f03e3e", 0, OL) + R(56, 54, 28, 18, "#495057") + L(70, 72, 70, 130, "#495057", 2) + container(44, 130, 52, 24, "#fcc419") + L(20, 220, 120, 220, "#495057", 4); } },
    stack: { w: 120, h: 96, d: function (o) { var cl = o.cs || ["#1971c2", "#f08c00", "#2f9e44", "#c92a2a", "#7048e8", "#e8590c"]; return container(0, 64, 58, 32, cl[0]) + container(62, 64, 58, 32, cl[1]) + container(0, 32, 58, 32, cl[2]) + container(62, 32, 58, 32, cl[3]) + container(30, 0, 58, 32, cl[4]); } },
    lighthouse: { w: 50, h: 150, d: function () { return P("M12 150 L18 30 L32 30 L38 150Z", "#f8f9fa", OL) + R(15, 60, 21, 14, "#e03131") + R(13, 100, 24, 14, "#e03131") + R(14, 14, 22, 16, "#ffe066", 2, OL) + P("M10 14 L25 0 L40 14Z", "#e03131", OL); } },
    kura: { w: 80, h: 90, d: function () { return R(6, 26, 68, 64, "#f8f9fa", 0, OL) + R(6, 70, 68, 20, "#495057") + P("M0 28 L40 4 L80 28Z", "#343a40", OL) + R(30, 40, 20, 16, "#495057", 2); } },
    snowhouse: { w: 92, h: 90, d: function () { return R(8, 40, 76, 50, "#e9c46a", 0, OL) + P("M0 42 L46 6 L92 42Z", "#1864ab", OL) + P("M4 40 L46 8 L88 40 L80 34 L46 14 L12 34Z", "#fff") + R(22, 52, 18, 16, "#ffe066", 2, OL) + R(54, 58, 18, 32, "#8a4b20", 2, OL); } },
    station: { w: 300, h: 110, d: function (o) { return R(10, 30, 280, 80, o.c || "#fff4e6", 0, OL) + P("M0 34 L150 0 L300 34Z", o.r || "#1971c2", OL) + R(110, 40, 80, 24, "#fff", 4, OL) + T(150, 58, o.t || "えき", 18, "#1971c2") + winRow(24, 74, 4, 18, 18, 8, o.lit ? "#ffe066" : "#a5d8ff") + winRow(200, 74, 4, 18, 18, 8, o.lit ? "#ffe066" : "#a5d8ff") + R(130, 72, 40, 38, "#8a4b20", 2, OL); } },
    clock: { w: 40, h: 120, d: function () { return R(18, 30, 4, 90, "#495057") + C(20, 20, 18, "#fff", OL) + L(20, 20, 20, 8, "#333", 2) + L(20, 20, 28, 24, "#333", 2); } },
    bench: { w: 60, h: 24, d: function () { return R(0, 6, 60, 6, "#a0522d", 2, OL) + R(4, 12, 4, 12, "#495057") + R(52, 12, 4, 12, "#495057") + R(0, 0, 60, 4, "#a0522d", 2); } },
    tent: { w: 90, h: 80, d: function (o) { return P("M0 80 L45 0 L90 80Z", o.c || "#f783ac", OL) + P("M30 80 L45 40 L60 80Z", "#fff"); } },
    balloon: { w: 24, h: 50, d: function (o) { return L(12, 26, 12, 50, "#495057", 1) + E(12, 12, 10, 12, o.c || "#f03e3e", OL); } },
    mill: { w: 100, h: 60, d: function () { return R(0, 10, 100, 50, "#868e96", 2, OL) + R(10, 0, 20, 12, "#495057") + R(40, 24, 18, 14, "#ffe066"); } }
  };

  var api = { ART: ART, R: R, C: C, E: E, P: P, L: L, T: T, container: container };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DDArt = api;
})(this);
