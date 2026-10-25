/* ============================================================
   きめつバトル — キャラの え（Canvas に コードで かく。がぞう ファイルは ない）
   LOOKS に 1キャラ 1つ。げんてんは あしもと、みぎむき（みかたは ひだりむきに はんてん して かく）
   st.pose: idle / attack / hurt / guard / down / cast / kick（アカザ）
   st.swing: こうげきの すすみぐあい 0〜1 / st.mark: あざ（ぎゆうの みずの もよう）
   あたらしい キャラは LOOKS に かきたす（swordsman() を つかうと けんしは かんたん）
   ============================================================ */
(function (root) {
  "use strict";
  var KB = root.KB = root.KB || {};
  var PI = Math.PI;

  /* ---------- きほんの かたち ---------- */
  function path(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
  function fillPath(g, pts, fill, stroke, lw) {
    path(g, pts);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1.4; g.lineJoin = "round"; g.stroke(); }
  }
  function circ(g, x, y, r, fill, stroke, lw) {
    g.beginPath(); g.arc(x, y, r, 0, PI * 2);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1.4; g.stroke(); }
  }
  function ell(g, x, y, rx, ry, rot, fill) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, PI * 2); g.fillStyle = fill; g.fill(); }
  function seg(g, x1, y1, x2, y2, col, lw, cap) {
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = cap || "round"; g.stroke();
  }
  // ふとさが かわる うで・あし（ねもと w1 → さき w2）
  function limb(g, x1, y1, x2, y2, w1, w2, fill, stroke) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    path(g, [x1 + nx * w1 / 2, y1 + ny * w1 / 2, x2 + nx * w2 / 2, y2 + ny * w2 / 2, x2 - nx * w2 / 2, y2 - ny * w2 / 2, x1 - nx * w1 / 2, y1 - ny * w1 / 2]);
    g.fillStyle = fill; g.fill();
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.1; g.stroke(); }
    circ(g, x2, y2, w2 / 2, fill);
  }
  function lerp(a, b, k) { return a + (b - a) * k; }

  /* ---------- もようの パターン ---------- */
  var pats = {};
  function pattern(g, name) {
    if (pats[name]) return pats[name];
    var c = document.createElement("canvas"), p = c.getContext("2d");
    if (name === "ichimatsu") { // たんじろうの はおり: みどりと くろの いちまつもよう
      c.width = c.height = 10;
      p.fillStyle = "#121318"; p.fillRect(0, 0, 10, 10);
      p.fillStyle = "#1c8f5c"; p.fillRect(0, 0, 5, 5); p.fillRect(5, 5, 5, 5);
      p.fillStyle = "rgba(255,255,255,.08)"; p.fillRect(0, 0, 5, 1); p.fillRect(5, 5, 5, 1);
    } else if (name === "kikko") { // ぎゆうの はおり: きいろ・みどり・オレンジの きかがく もよう
      c.width = 16; c.height = 14;
      p.fillStyle = "#e3c23c"; p.fillRect(0, 0, 16, 14);
      p.fillStyle = "#4f8a3c"; path(p, [0, 0, 8, 0, 4, 7]); p.fill(); path(p, [8, 7, 16, 7, 12, 14]); p.fill();
      p.fillStyle = "#e0782a"; path(p, [8, 0, 16, 0, 12, 7]); p.fill(); path(p, [0, 7, 8, 7, 4, 14]); p.fill();
      p.strokeStyle = "rgba(40,25,5,.75)"; p.lineWidth = 0.8;
      p.beginPath(); p.moveTo(0, 7); p.lineTo(16, 7); p.moveTo(0, 0); p.lineTo(8, 14); p.moveTo(8, 0); p.lineTo(16, 14); p.moveTo(8, 0); p.lineTo(0, 14); p.moveTo(16, 0); p.lineTo(8, 14); p.stroke();
    } else if (name === "akazaTop") { // アカザの うわぎ: ピンクに しろい ひしがた
      c.width = 10; c.height = 10;
      p.fillStyle = "#d9488f"; p.fillRect(0, 0, 10, 10);
      p.fillStyle = "rgba(255,230,245,.55)"; path(p, [5, 1, 8, 5, 5, 9, 2, 5]); p.fill();
    }
    return (pats[name] = g.createPattern(c, "repeat"));
  }

  /* ---------- かお（3/4 みぎむき） ---------- */
  function faceShape(g, hx, hy, skin, line) {
    g.beginPath();
    g.moveTo(hx - 15, hy - 3);
    g.bezierCurveTo(hx - 17, hy - 22, hx + 13, hy - 25, hx + 16, hy - 6);
    g.bezierCurveTo(hx + 17.5, hy + 3, hx + 15, hy + 11, hx + 9, hy + 16);
    g.quadraticCurveTo(hx + 3, hy + 19.5, hx - 3, hy + 15);
    g.bezierCurveTo(hx - 11, hy + 10, hx - 15, hy + 5, hx - 15, hy - 3);
    g.closePath();
    var gr = g.createLinearGradient(hx - 15, hy, hx + 16, hy);
    gr.addColorStop(0, shade(skin, -18)); gr.addColorStop(0.35, skin); gr.addColorStop(1, skin);
    g.fillStyle = gr; g.fill();
    g.strokeStyle = line; g.lineWidth = 1.2; g.stroke();
  }
  // かみの ベース: あたまの てっぺん〜うしろを かみで おおう（はげて みえないように）
  function hairCap(g, hx, hy, fill) {
    g.beginPath();
    g.moveTo(hx - 16.5, hy + 8);
    g.bezierCurveTo(hx - 19, hy - 12, hx - 6, hy - 26, hx + 4, hy - 25.5);
    g.bezierCurveTo(hx + 13, hy - 25, hx + 18, hy - 14, hx + 17, hy - 6);
    g.quadraticCurveTo(hx + 8, hy - 11, hx - 1, hy - 9.5);
    g.quadraticCurveTo(hx - 8, hy - 7, hx - 10, hy + 1);
    g.lineTo(hx - 11, hy + 9);
    g.closePath();
    g.fillStyle = fill; g.fill();
  }
  function ear(g, hx, hy, skin, line) {
    ell(g, hx - 7, hy + 3, 3.6, 5, 0.1, skin);
    g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.ellipse(hx - 7, hy + 3, 3.6, 5, 0.1, 0, PI * 2); g.stroke();
    g.beginPath(); g.arc(hx - 6.5, hy + 3, 1.8, -1.2, 1.4); g.stroke();
  }
  // アニメの め（w,h: しろめの おおきさ / iris: [こい, うすい] / lid: うえまぶたの さがりぐあい 0〜1）
  function eye(g, x, y, w, h, iris, o) {
    o = o || {};
    g.save();
    g.beginPath(); g.ellipse(x, y, w, h, 0, 0, PI * 2); g.fillStyle = o.sclera || "#fff"; g.fill();
    g.clip();
    var ix = x + w * 0.22, iy = y + h * 0.08;
    var gr = g.createLinearGradient(ix, iy - h, ix, iy + h);
    iris.forEach(function (c, i) { gr.addColorStop(i / (iris.length - 1), c); });
    g.beginPath(); g.ellipse(ix, iy, w * 0.72, h * 0.92, 0, 0, PI * 2); g.fillStyle = gr; g.fill();
    if (o.ring) { g.strokeStyle = o.ring; g.lineWidth = 0.7; g.stroke(); }
    if (!o.noPupil) ell(g, ix, iy, w * 0.32, h * 0.48, 0, o.pupil || "rgba(10,5,10,.85)");
    if (o.glyph) { g.fillStyle = o.glyph[1]; g.font = "bold " + (h * 0.75) + "px serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(o.glyph[0], ix, iy + h * 0.05); }
    circ(g, ix - w * 0.3, iy - h * 0.38, Math.max(0.6, w * 0.24), "rgba(255,255,255,.95)");
    circ(g, ix + w * 0.28, iy + h * 0.35, Math.max(0.4, w * 0.12), "rgba(255,255,255,.75)");
    if (o.lid) { g.fillStyle = o.lidColor; g.fillRect(x - w - 1, y - h - 1, w * 2 + 2, h * 2 * o.lid + 1); }
    g.restore();
    // まつげ（うえ）
    var ty = y - h + (o.lid ? h * 2 * o.lid : 0);
    g.strokeStyle = o.lash || "#1a0e0a"; g.lineWidth = Math.max(1.2, h * 0.38); g.lineCap = "round";
    g.beginPath(); g.moveTo(x - w * 1.05, ty + h * 0.35); g.quadraticCurveTo(x, ty - h * 0.25, x + w * 1.1, ty + h * 0.15); g.lineTo(x + w * 1.35, ty - h * 0.1); g.stroke();
    g.lineWidth = 0.8; g.beginPath(); g.moveTo(x - w * 0.6, y + h * 0.95); g.lineTo(x + w * 0.7, y + h * 0.9); g.stroke();
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) + amt, gg = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); gg = Math.max(0, Math.min(255, gg)); b = Math.max(0, Math.min(255, b));
    return "rgb(" + r + "," + gg + "," + b + ")";
  }

  /* ---------- けんしの からだ（たんじろう・ぎゆう きょうつう） ---------- */
  function swordsman(g, st, o) {
    var t = st.t || 0, pose = st.pose || "idle", sw = st.swing || 0;
    var bob = Math.sin(t * 3.2 + (o.phase || 0)) * 1.3, breathe = Math.sin(t * 3.2 + (o.phase || 0));
    // ポーズごとの かくど
    var ang = -0.75, lean = 0.04, stance = 0.25, back = 0, sway = Math.sin(t * 2.2 + (o.phase || 0)) * 2;
    if (pose === "attack") { var e = Math.sin(sw * PI); ang = -2.5 + sw * 3.7; lean = 0.22 * e + 0.08; stance = 0.55; sway = -8 * e - 4; }
    else if (pose === "hurt") { lean = -0.3; ang = -0.3; stance = 0.35; sway = 6; }
    else if (pose === "guard") { ang = -1.5; lean = 0; stance = 0.4; }
    else if (pose === "cast") { ang = -2.9 + Math.sin(t * 6) * 0.05; lean = -0.06; stance = 0.38; sway = -3; back = 1; }
    var downPose = pose === "down";
    g.save();
    if (downPose) { g.translate(-6, -5); g.rotate(-1.48); g.translate(0, 6); bob = 0; }

    var L = o.uniform, Ld = "#06070c";
    // --- うしろの あし ---
    var hipY = -40;
    leg(g, -4, hipY, -stance, o, true);
    // --- はおりの うしろがわ（すそが ゆれる） ---
    g.save(); g.translate(0, bob * 0.5);
    var hem = 6 + sway;
    var hb = o.hemY == null ? 0 : o.hemY + 20; // はおりの ながさ（hemY: すその たかさ）
    fillPath(g, [-13, -74, -4, -74, -6, -26 + hb, -22 + hem * 0.6, -18 + hb + Math.abs(sway) * 0.3, -19 + hem * 0.2, -40 + hb * 0.4], o.haoriBack, Ld, 1.1);
    g.restore();
    // --- まえの あし ---
    leg(g, 4, hipY, stance * 0.9, o, false);
    // スカート（カナヲ）
    if (o.skirt) {
      fillPath(g, [-12, -45, 13, -45, 18 + sway * 0.2, -24, -17 + sway * 0.3, -24], o.skirt, Ld, 1.1);
      for (var pl = -10; pl <= 12; pl += 5) seg(g, pl * 0.8, -44, pl * 1.25, -25, "rgba(255,255,255,.12)", 0.8);
    }

    // うえの からだ
    g.translate(0, hipY + bob); g.rotate(lean); g.translate(0, -hipY);
    // うしろの うで（りょうてで にぎる）
    var shX = 7, shY = -68;
    var gx = shX + 11 + Math.cos(ang + PI * 0.5) * 2, gy = shY + 10;
    if (pose === "attack") { gx = shX + 6 + Math.cos(ang) * 14; gy = shY + 4 + Math.sin(ang) * 14; }
    else if (pose === "cast") { gx = shX + 2; gy = shY - 14; }
    else if (pose === "guard") { gx = shX + 10; gy = shY + 2; }
    else if (pose === "hurt") { gx = shX + 10; gy = shY + 12; }
    limb(g, -5, shY + 1, gx - 4, gy + 2, 7, 6, o.backSleeve || o.sleeve, Ld);
    // どう（たいしの ふく）
    fillPath(g, [-11, -76, 11, -76, 13, -39, -12, -39], L, Ld, 1.2);
    var tg = g.createLinearGradient(-12, 0, 13, 0); tg.addColorStop(0, "rgba(0,0,0,.35)"); tg.addColorStop(1, "rgba(255,255,255,.06)");
    fillPath(g, [-11, -76, 11, -76, 13, -39, -12, -39], tg);
    seg(g, 4, -74, 6, -42, "rgba(255,255,255,.12)", 1); // まえの あわせ
    for (var b = 0; b < 3; b++) circ(g, 6 + b * 0.2, -66 + b * 8, 1.1, "#c9a640");
    fillPath(g, [-12, -45, 13, -45, 13, -40, -12, -40], "#ede8dc", Ld, 0.8); // しろい ベルト
    fillPath(g, [-6, -78, 9, -78, 10, -73, -7, -73], shade(L.length === 7 ? L : "#1a1c28", 12), Ld, 0.8); // えり
    // はおりの まえがわ（からだの ひだり はんぶん）
    var hf = o.hemY == null ? -20 : o.hemY, hpts = [-13, -76, -3, -77, -1, Math.max(-40, hf - 18), -6, hf - 2, -20 + sway * 0.4, hf, -17, Math.max(-50, hf - 20)];
    fillPath(g, hpts, o.haoriFront, Ld, 1.1);
    if (o.haoriDeco) o.haoriDeco(g, hf, sway);
    fillPath(g, hpts, "rgba(0,0,0,.14)");

    // あたま
    var hx = 4, hy = -94 + breathe * 0.4;
    seg(g, 2, -80, 4, -76, o.skin, 8); // くび
    if (o.hairBack) o.hairBack(g, hx, hy, t, st);
    faceShape(g, hx, hy, o.skin, "#3a2418");
    if (o.cap) hairCap(g, hx, hy, o.cap);
    ear(g, hx, hy, o.skin, "#7a4a32");
    if (o.earring) o.earring(g, hx, hy, t);
    // め
    var lidC = o.skin;
    eye(g, hx + 5, hy + 2, 3.8, 4.6, o.iris, { lid: o.lid, lidColor: lidC, lash: o.lash });
    eye(g, hx + 13.2, hy + 2, 2.3, 4.2, o.iris, { lid: o.lid, lidColor: lidC, lash: o.lash });
    // まゆ
    g.strokeStyle = o.brow; g.lineWidth = 1.6; g.lineCap = "round";
    g.beginPath(); g.moveTo(hx + 0.5, hy - 5 + (o.browTilt || 0)); g.quadraticCurveTo(hx + 5, hy - 7.5, hx + 9, hy - 6); g.stroke();
    g.beginPath(); g.moveTo(hx + 11.5, hy - 6); g.lineTo(hx + 15, hy - 5 + (o.browTilt || 0) * 0.5); g.stroke();
    // はな・くち
    seg(g, hx + 15.5, hy + 5, hx + 16.5, hy + 7.5, "rgba(120,60,40,.6)", 1);
    if (pose === "attack" || pose === "hurt" || pose === "cast" || st.shout) {
      ell(g, hx + 10.5, hy + 12, 2.6, pose === "hurt" ? 1.6 : 2.2, 0, "#6a1e1a");
    } else if (o.smile) { g.strokeStyle = "#8a4a3a"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(hx + 8, hy + 11); g.quadraticCurveTo(hx + 11, hy + 13.5, hx + 14, hy + 10.5); g.stroke(); }
    else seg(g, hx + 8.5, hy + 12, hx + 12.5, hy + 11.6, "#8a4a3a", 1.2);
    // ほお（あざ など）
    if (o.faceMark) o.faceMark(g, hx, hy, t, st);
    if (o.hairFront) o.hairFront(g, hx, hy, t, st);

    // まえの うで と かたな
    var hx1 = gx + 2, hy1 = gy + 1;
    limb(g, shX, shY, hx1, hy1, 8.5, 7, o.sleeve, Ld);
    // はおりの そで（たれる）
    var sl = [shX - 3, shY + 2, hx1 - 2, hy1 + 2, hx1 - 4, hy1 + 14, shX - 8, shY + 18];
    fillPath(g, sl, o.sleeve, Ld, 1);
    fillPath(g, sl, "rgba(0,0,0,.15)");
    sword(g, hx1, hy1, ang, o);
    circ(g, hx1, hy1, 3.6, o.skin, "#7a4a32", 0.8);
    circ(g, gx - 2, gy + 3, 3.4, o.skin, "#7a4a32", 0.8);
    g.restore();
  }

  function leg(g, x, y, a, o, behind) {
    var len1 = 20, len2 = 20;
    var kx = x + Math.sin(a) * len1, ky = y + Math.cos(a) * len1;
    var fx = kx + Math.sin(a * 0.4) * len2, fy = 0;
    var pants = behind ? shade(o.uniform, -6) : o.uniform;
    if (o.skirt) {
      limb(g, x, y, kx, ky, 9, 8, o.skin, "#7a4a32");
      limb(g, kx, ky, fx, fy - 5, 8, 7, "#f4f2ee", "#8a8478");
      fillPath(g, [fx - 5, -2.5, fx + 9, -2.5, fx + 10, 0, fx - 6, 0], "#b08a5a", "#3a2a1a", 0.8);
      return;
    }
    // ふくらんだ ズボン
    limb(g, x, y, kx, ky, 15, 12, pants, "#06070c");
    limb(g, kx, ky, fx, fy - 7, 11, 8, pants, "#06070c");
    // きゃはん（しろい まきぬの）
    limb(g, lerp(kx, fx, 0.45), lerp(ky, fy - 7, 0.45), fx, fy - 4, 8.5, 7.5, "#ece7da", "#8a8478");
    for (var i = 1; i < 4; i++) { var k = 0.45 + i * 0.13; seg(g, lerp(kx, fx, k) - 4, lerp(ky, fy - 6, k), lerp(kx, fx, k) + 4, lerp(ky, fy - 6, k) - 1, "rgba(120,110,100,.6)", 0.7); }
    // ぞうり
    fillPath(g, [fx - 5, -2.5, fx + 9, -2.5, fx + 10, 0, fx - 6, 0], "#b08a5a", "#3a2a1a", 0.8);
    ell(g, fx + 2, -4, 6, 2.6, 0, "#f2ede2");
  }

  function sword(g, x, y, ang, o) {
    var bx = Math.cos(ang), by = Math.sin(ang);
    g.save(); g.translate(x, y); g.rotate(ang);
    // つか（ひしがたの まきもよう）
    g.fillStyle = o.hilt || "#1a1210"; g.fillRect(-14, -2.4, 15, 4.8);
    g.fillStyle = o.hiltWrap || "#e8e0c8"; for (var i = -12; i < 0; i += 4) { path(g, [i, 0, i + 2, -2.4, i + 4, 0, i + 2, 2.4]); g.fill(); }
    // つば
    if (o.tsuba) o.tsuba(g); else { g.fillStyle = "#222"; g.fillRect(0, -5, 3, 10); }
    // は（やいば）
    if (o.stinger) { // はりの ような ほそい かたな（さきだけ ひろい）
      seg(g, 3, 0, 56, 0, o.blade[1], 1.6, "butt");
      g.fillStyle = o.blade[0]; path(g, [44, -2.4, 66, 0, 44, 2.4, 47, 0]); g.fill();
      if (o.bladeGlow) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.4; circ(g, 60, 0, 6, o.bladeGlow); }
      g.restore(); return;
    }
    var gr = g.createLinearGradient(0, -2.2, 0, 2.2);
    gr.addColorStop(0, o.blade[0]); gr.addColorStop(0.55, o.blade[1]); gr.addColorStop(1, o.blade[2] || o.blade[1]);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(3, -2); g.lineTo(54, -1.6); g.quadraticCurveTo(61, -0.8, 62, 1.2); g.lineTo(3, 2.1); g.closePath(); g.fill();
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(4, 1.4); g.lineTo(58, 0.9); g.stroke();
    if (o.bladeGlow) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.35; g.fillStyle = o.bladeGlow; g.fillRect(3, -3.5, 56, 7); }
    g.restore();
    void bx; void by;
  }

  // いのすけの ギザギザの かたな
  function jagged(g, x, y, ang, st) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = "#2a2a30"; g.fillRect(-12, -2.4, 13, 4.8);
    g.fillStyle = "#3a3a44"; g.fillRect(0, -4, 2.5, 8);
    var gr = g.createLinearGradient(0, -3, 0, 3); gr.addColorStop(0, "#c4cee0"); gr.addColorStop(1, "#4a5a7a");
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(3, -2.2);
    for (var i = 0; i < 9; i++) { var x0 = 6 + i * 5.4; g.lineTo(x0, -2.2); g.lineTo(x0 + 2.4, -4.6 - (i % 2)); g.lineTo(x0 + 4.4, -2); }
    g.lineTo(56, -1.4); g.lineTo(60, 0.6); g.lineTo(3, 2.2); g.closePath(); g.fill();
    g.strokeStyle = "rgba(30,30,50,.6)"; g.lineWidth = 0.6; g.stroke();
    if (st.beast) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.35; g.fillStyle = "#b8d0ff"; g.fillRect(3, -5, 56, 8); }
    g.restore();
  }
  // どうまの きんいろの てっせん（ひらいた おうぎ）
  function fan(g, x, y, ang, st, s) {
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
    var r = 26, a0 = -0.95, a1 = 0.95;
    var gr = g.createRadialGradient(0, 0, 4, 0, 0, r); gr.addColorStop(0, "#a07820"); gr.addColorStop(0.5, "#f2cc5a"); gr.addColorStop(1, "#ffe9a0");
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, a0, a1); g.closePath(); g.fillStyle = gr; g.fill();
    g.strokeStyle = "#6a4a10"; g.lineWidth = 1; g.stroke();
    g.strokeStyle = "rgba(106,74,16,.6)"; g.lineWidth = 0.7;
    for (var i = 1; i < 8; i++) { var a = a0 + (a1 - a0) * i / 8; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke(); }
    // はすの もよう
    g.fillStyle = "rgba(200,60,90,.7)";
    for (var j = -1; j <= 1; j++) { g.save(); g.translate(Math.cos(j * 0.4) * 17, Math.sin(j * 0.4) * 17); g.rotate(j * 0.4); ell(g, 0, 0, 3, 1.6, 0, "rgba(220,80,110,.75)"); g.restore(); }
    if (st.ice) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.4; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r + 3, a0, a1); g.closePath(); g.fillStyle = "#bfeaff"; g.fill(); }
    g.restore();
  }

  /* ---------- キャラごとの みため ---------- */
  var LOOKS = {
    tanjiro: function (g, st) {
      swordsman(g, st, {
        phase: 0, skin: "#f8dcc4", uniform: "#1b1d2b", cap: "#4a120c", iris: ["#4a0c0c", "#c2412e"], brow: "#4a1410", lash: "#2a0a08",
        haoriFront: pattern(g, "ichimatsu"), haoriBack: pattern(g, "ichimatsu"), sleeve: pattern(g, "ichimatsu"),
        blade: ["#4a4a52", "#0f0f14", "#2a2a30"], hilt: "#1a1210", hiltWrap: "#2c2c2c", bladeGlow: st.fire ? "#ff7a2a" : null,
        // れんごくさんの ほのおの つば
        tsuba: function (g) {
          g.fillStyle = "#c2301e";
          g.beginPath(); for (var i = 0; i < 8; i++) { var a = i * PI / 4, r = i % 2 ? 4 : 6.5; g.lineTo(1.5 + Math.cos(a) * 2, Math.sin(a) * r); } g.closePath(); g.fill();
          g.fillStyle = "#f2a22a"; g.fillRect(0.5, -3, 2, 6);
        },
        hairBack: function (g, hx, hy) {
          var gr = g.createLinearGradient(hx - 20, hy - 24, hx + 16, hy + 6); gr.addColorStop(0, "#2a0806"); gr.addColorStop(1, "#7a1f14");
          g.fillStyle = gr;
          path(g, [hx - 16, hy + 8, hx - 24, hy + 2, hx - 18, hy - 2, hx - 25, hy - 9, hx - 18, hy - 12, hx - 22, hy - 21, hx - 12, hy - 20,
                   hx - 10, hy - 29, hx - 2, hy - 22, hx + 4, hy - 29, hx + 8, hy - 21, hx + 16, hy - 24, hx + 15, hy - 14, hx + 4, hy - 10, hx - 10, hy + 4]);
          g.fill();
        },
        hairFront: function (g, hx, hy) {
          var gr = g.createLinearGradient(hx, hy - 24, hx, hy); gr.addColorStop(0, "#3a0c08"); gr.addColorStop(1, "#9a2c1a");
          g.fillStyle = gr;
          // まえがみ（とがった たば）
          path(g, [hx - 12, hy - 14, hx - 6, hy - 22, hx + 4, hy - 23, hx + 14, hy - 19, hx + 19, hy - 9, hx + 17, hy - 4, hx + 14, hy - 10, hx + 12, hy - 3,
                   hx + 9, hy - 11, hx + 6, hy - 5, hx + 4, hy - 12, hx - 1, hy - 8, hx - 3, hy - 13, hx - 8, hy - 6]);
          g.fill(); g.strokeStyle = "rgba(255,120,80,.35)"; g.lineWidth = 0.8;
          g.beginPath(); g.moveTo(hx + 2, hy - 20); g.lineTo(hx + 8, hy - 12); g.moveTo(hx + 10, hy - 18); g.lineTo(hx + 15, hy - 9); g.stroke();
        },
        // ひたいの ほのおの ような あざ
        faceMark: function (g, hx, hy) {
          g.fillStyle = "#a3291c";
          path(g, [hx - 1, hy - 7, hx + 2, hy - 12, hx + 3, hy - 9, hx + 6, hy - 11, hx + 6, hy - 7, hx + 3, hy - 4]); g.fill();
        },
        // はなふだの みみかざり（しろい いたに あかい たいよう）
        earring: function (g, hx, hy, t) {
          var sw = Math.sin(t * 3) * 0.12;
          g.save(); g.translate(hx - 7, hy + 7); g.rotate(sw);
          seg(g, 0, 0, 0, 2, "#666", 0.8);
          g.fillStyle = "#f6f2e8"; g.fillRect(-2.6, 2, 5.2, 9); g.strokeStyle = "#555"; g.lineWidth = 0.6; g.strokeRect(-2.6, 2, 5.2, 9);
          circ(g, 0, 5.5, 2, "#d0261c"); g.fillStyle = "#d0261c"; g.fillRect(-2.6, 8.4, 5.2, 0.8); g.fillRect(-2.6, 9.8, 5.2, 0.8);
          g.restore();
        }
      });
    },
    giyu: function (g, st) {
      swordsman(g, st, {
        phase: 1.7, skin: "#f6dac4", uniform: "#171a28", cap: "#0d0e16", iris: ["#0e1a40", "#3d64b8"], brow: "#0f1018", lash: "#0a0a12", lid: 0.28, browTilt: 1,
        haoriFront: pattern(g, "kikko"), haoriBack: "#7e1b36", sleeve: pattern(g, "kikko"), backSleeve: "#7e1b36",
        blade: ["#a8d4ff", "#2f7ae0", "#16408a"], hilt: "#141820", hiltWrap: "#3a3f4a", bladeGlow: st.water ? "#5ab4ff" : null,
        tsuba: function (g) { g.fillStyle = "#2a2e36"; g.fillRect(-0.5, -5.5, 3.5, 11); g.fillStyle = "#6a7080"; g.fillRect(0.3, -4.5, 1.6, 9); },
        hairBack: function (g, hx, hy, t) {
          g.fillStyle = "#0d0e16";
          var s = Math.sin(t * 2.4) * 2.5;
          // ひくい ポニーテール（ぼさぼさ）
          path(g, [hx - 13, hy + 6, hx - 24, hy + 14, hx - 28 + s, hy + 30, hx - 22 + s, hy + 26, hx - 24 + s, hy + 40, hx - 17 + s * 0.6, hy + 30, hx - 15, hy + 36, hx - 12, hy + 14]);
          g.fill();
          ell(g, hx - 13, hy + 9, 2.6, 2, 0.4, "#2a1a1a");
          path(g, [hx - 16, hy + 10, hx - 23, hy + 2, hx - 19, hy - 3, hx - 24, hy - 10, hx - 17, hy - 14, hx - 19, hy - 22, hx - 9, hy - 21,
                   hx - 5, hy - 27, hx + 2, hy - 22, hx + 9, hy - 26, hx + 11, hy - 19, hx + 18, hy - 18, hx + 12, hy - 9, hx - 10, hy + 2]);
          g.fill();
        },
        hairFront: function (g, hx, hy) {
          g.fillStyle = "#0d0e16";
          path(g, [hx - 12, hy - 13, hx - 4, hy - 23, hx + 8, hy - 23, hx + 17, hy - 16, hx + 20, hy - 5, hx + 17, hy - 7, hx + 16, hy + 1, hx + 13, hy - 8,
                   hx + 11, hy - 1, hx + 8, hy - 9, hx + 5, hy - 2, hx + 3, hy - 11, hx - 2, hy - 6, hx - 4, hy - 13, hx - 9, hy - 4]);
          g.fill();
          g.strokeStyle = "rgba(120,140,200,.35)"; g.lineWidth = 0.8;
          g.beginPath(); g.moveTo(hx + 1, hy - 20); g.lineTo(hx + 6, hy - 10); g.moveTo(hx + 10, hy - 20); g.lineTo(hx + 14, hy - 10); g.stroke();
        },
        // あざ（みずの うずの ような あおい もよう）… たたかいの とちゅうで でる
        faceMark: function (g, hx, hy, t, st) {
          if (!st.mark) return;
          g.save(); g.strokeStyle = "rgba(40,110,220,.85)"; g.lineWidth = 1.3;
          g.beginPath(); g.arc(hx + 6, hy + 9, 3.5, PI * 0.2, PI * 1.6); g.stroke();
          g.beginPath(); g.arc(hx + 6, hy + 9, 1.6, PI * 0.8, PI * 2.2); g.stroke();
          g.beginPath(); g.moveTo(hx + 2, hy + 6); g.quadraticCurveTo(hx - 1, hy + 12, hx + 3, hy + 15); g.stroke();
          g.restore();
        }
      });
    },
    akaza: function (g, st) {
      var t = st.t || 0, pose = st.pose || "idle", sw = st.swing || 0;
      var bob = Math.sin(t * 4) * 1.5, punch = 0, kick = 0, lean = 0.06, stance = 0.32;
      if (pose === "attack") { punch = Math.sin(Math.min(1, sw) * PI); lean = 0.18 * punch + 0.06; stance = 0.5; }
      else if (pose === "kick") { kick = Math.sin(Math.min(1, sw) * PI); lean = -0.25 * kick; }
      else if (pose === "hurt") { lean = -0.3; }
      else if (pose === "cast") { lean = -0.12; stance = 0.45; }
      var skin = "#f4e2dc", tat = "#2346b8", pants = "#2c2348", Ld = "#2a1020";
      g.save();
      var hipY = -42;
      // あし（はだし・あおい しま）
      function aleg(x, a, front) {
        var kx = x + Math.sin(a) * 21, ky = hipY + Math.cos(a) * 21, fx = kx + Math.sin(a * 0.3) * 18;
        var col = front ? pants : shade(pants, -8);
        limb(g, x, hipY, kx, ky, 16, 14, col, "#120c20");
        limb(g, kx, ky, lerp(kx, fx, 0.5), lerp(ky, -5, 0.5), 14, 12, col, "#120c20");
        limb(g, lerp(kx, fx, 0.5), lerp(ky, -5, 0.5), fx, -5, 7, 6, skin, Ld);
        seg(g, lerp(kx, fx, 0.5) - 4, lerp(ky, -5, 0.5) + 1, lerp(kx, fx, 0.5) + 4, lerp(ky, -5, 0.5), "#e8e4f0", 2.4); // すその ひも
        for (var i = 0; i < 2; i++) seg(g, fx - 3, -10 + i * 3, fx + 3, -11 + i * 3, tat, 1.2);
        ell(g, fx + 3, -2.5, 7, 3, 0, skin); g.strokeStyle = Ld; g.lineWidth = 0.8; g.beginPath(); g.ellipse(fx + 3, -2.5, 7, 3, 0, 0, PI * 2); g.stroke();
        seg(g, fx, -3, fx + 7, -3, tat, 1);
      }
      aleg(-5, -stance, false);
      if (kick > 0) {
        g.save(); g.translate(5, hipY); g.rotate(-kick * 2.1); g.translate(-5, -hipY); aleg(5, 0.1, true); g.restore();
      } else aleg(5, stance * 0.9, true);
      g.translate(0, hipY + bob); g.rotate(lean); g.translate(0, -hipY);
      // うしろの うで（かまえた こぶし）
      var bsx = -6, bsy = -71;
      limb(g, bsx, bsy, -12, -56, 8, 7, skin, Ld);
      limb(g, -12, -56, -2, -60, 7, 6.5, skin, Ld);
      seg(g, -10, -60, -6, -59, tat, 1.4); seg(g, -9, -64, -12, -66, tat, 1.4);
      circ(g, -1, -60, 5, skin, Ld, 1); seg(g, -3, -60, 1, -59, "#e8e4f0", 2.2);
      // どう（はだかに あおい しま）
      fillPath(g, [-11, -79, 11, -79, 10, -42, -10, -42], skin, Ld, 1.1);
      var sg = g.createLinearGradient(-11, 0, 11, 0); sg.addColorStop(0, "rgba(120,80,90,.3)"); sg.addColorStop(1, "rgba(255,255,255,0)");
      fillPath(g, [-11, -79, 11, -79, 10, -42, -10, -42], sg);
      g.strokeStyle = tat; g.lineWidth = 1.5;
      for (var i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-9, -73 + i * 6.5); g.quadraticCurveTo(0, -71 + i * 6.5, 9, -73.5 + i * 6.5); g.stroke(); }
      seg(g, 1, -78, 1, -46, tat, 1.2);
      seg(g, -5, -66, 6, -66, "rgba(120,60,70,.4)", 0.8); // きんにく
      // こしひも
      fillPath(g, [-11, -46, 11, -46, 11, -40, -11, -40], "#efeaf6", Ld, 0.8);
      seg(g, 9, -42, 13, -34, "#efeaf6", 2.4);
      // みじかい うわぎ（そでなし・まえが あいている）
      fillPath(g, [-13, -80, -3, -80, -5, -54, -13, -56], pattern(g, "akazaTop"), Ld, 1);
      fillPath(g, [6, -80, 13, -80, 14, -58, 9, -56], pattern(g, "akazaTop"), Ld, 1);
      seg(g, -3, -80, -5, -54, "#fff0f6", 1.2); seg(g, 6, -80, 9, -56, "#fff0f6", 1.2);
      // あたま
      var hx = 3, hy = -97;
      seg(g, 1, -84, 3, -79, skin, 8); seg(g, -1, -82, 6, -82, tat, 1.2);
      // うしろの かみ
      g.fillStyle = "#e86fa6";
      path(g, [hx - 15, hy + 6, hx - 22, hy - 1, hx - 17, hy - 5, hx - 23, hy - 13, hx - 15, hy - 15, hx - 16, hy - 24, hx - 7, hy - 21,
               hx - 3, hy - 29, hx + 3, hy - 21, hx + 11, hy - 26, hx + 12, hy - 17, hx + 4, hy - 10, hx - 9, hy + 4]);
      g.fill();
      faceShape(g, hx, hy, skin, "#6a3a40");
      hairCap(g, hx, hy, "#e86fa6");
      ear(g, hx, hy, skin, "#8a4a52");
      // かおの あおい しま
      g.strokeStyle = tat; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(hx + 1, hy - 3); g.lineTo(hx + 16, hy - 2); g.stroke();
      g.beginPath(); g.moveTo(hx + 3, hy + 7); g.lineTo(hx + 16, hy + 8); g.stroke();
      g.beginPath(); g.moveTo(hx - 6, hy + 9); g.lineTo(hx + 2, hy + 14); g.stroke();
      g.beginPath(); g.moveTo(hx - 13, hy - 1); g.lineTo(hx - 4, hy - 2); g.stroke();
      // め（あおい しろめ・きんいろの ひとみ・あかい ふち）
      var gl = st.big ? ["上弦", "#1a2a70"] : null, gl2 = st.big ? ["参", "#1a2a70"] : null;
      eye(g, hx + 5.5, hy + 2, 4, 4.3, ["#e0a020", "#ffe27a"], { sclera: "#a9dcff", lash: "#b8205a", noPupil: !!gl, glyph: gl, ring: "#6a4a00" });
      eye(g, hx + 13.5, hy + 2, 2.4, 4, ["#e0a020", "#ffe27a"], { sclera: "#a9dcff", lash: "#b8205a", noPupil: !!gl2, glyph: gl2, ring: "#6a4a00" });
      // まゆ（つりあがり）
      g.strokeStyle = "#c2306a"; g.lineWidth = 1.7; g.lineCap = "round";
      g.beginPath(); g.moveTo(hx + 1, hy - 6); g.lineTo(hx + 9, hy - 8); g.stroke();
      g.beginPath(); g.moveTo(hx + 11.5, hy - 8); g.lineTo(hx + 15.5, hy - 7); g.stroke();
      // くち（にやり / さけぶ）
      if (pose === "attack" || pose === "kick" || pose === "cast" || st.shout) {
        fillPath(g, [hx + 7, hy + 11, hx + 14, hy + 10.5, hx + 12, hy + 15], "#5a1020");
        seg(g, hx + 8, hy + 11.3, hx + 13.5, hy + 10.9, "#fff", 1);
      } else { g.strokeStyle = "#6a2a3a"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(hx + 8, hy + 12); g.quadraticCurveTo(hx + 11, hy + 13, hx + 14, hy + 10.5); g.stroke(); }
      seg(g, hx + 15.5, hy + 5, hx + 16.5, hy + 7.5, "rgba(120,60,70,.6)", 1);
      // まえがみ（ピンク）
      var hg = g.createLinearGradient(hx, hy - 26, hx, hy); hg.addColorStop(0, "#f7a6c8"); hg.addColorStop(1, "#e2609a");
      g.fillStyle = hg;
      path(g, [hx - 11, hy - 14, hx - 5, hy - 23, hx + 6, hy - 24, hx + 15, hy - 19, hx + 20, hy - 9, hx + 16, hy - 8, hx + 15, hy - 3, hx + 12, hy - 10,
               hx + 9, hy - 5, hx + 7, hy - 12, hx + 3, hy - 7, hx + 1, hy - 14, hx - 4, hy - 9, hx - 6, hy - 15]);
      g.fill();
      g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(hx + 2, hy - 21); g.lineTo(hx + 7, hy - 13); g.moveTo(hx + 10, hy - 21); g.lineTo(hx + 14, hy - 12); g.stroke();
      // まえの うで（パンチ）
      var sx = 8, sy = -72, ex = sx + 10 + punch * 34, ey = sy + 13 - punch * 10;
      var mx = lerp(sx, ex, 0.5) + (1 - punch) * 3, my = lerp(sy, ey, 0.5) + 6 * (1 - punch);
      if (pose === "cast") { ex = sx + 4; ey = sy - 20; mx = sx + 10; my = sy - 8; }
      limb(g, sx, sy, mx, my, 9, 8, skin, Ld);
      limb(g, mx, my, ex, ey, 8, 7, skin, Ld);
      seg(g, lerp(sx, mx, 0.5) - 3, lerp(sy, my, 0.5) - 1, lerp(sx, mx, 0.5) + 3, lerp(sy, my, 0.5) + 1, tat, 1.5);
      seg(g, lerp(mx, ex, 0.4) - 3, lerp(my, ey, 0.4) - 2, lerp(mx, ex, 0.4) + 2, lerp(my, ey, 0.4) + 2, tat, 1.5);
      seg(g, lerp(mx, ex, 0.75) - 3, lerp(my, ey, 0.75) - 2, lerp(mx, ex, 0.75) + 2, lerp(my, ey, 0.75) + 2, "#e8e4f0", 2.4); // てくびの わ
      if (punch > 0.3 || pose === "cast") {
        g.save(); g.globalCompositeOperation = "lighter";
        var rg = g.createRadialGradient(ex, ey, 1, ex, ey, 16); rg.addColorStop(0, "rgba(200,240,255,.9)"); rg.addColorStop(1, "rgba(60,140,255,0)");
        circ(g, ex, ey, 16, rg); g.restore();
      }
      circ(g, ex, ey, 5.5, skin, Ld, 1);
      seg(g, ex - 1, ey - 4, ex + 3, ey + 3, "rgba(120,60,70,.5)", 0.8);
      g.restore();
    },
    // こちょう しのぶ: ちょうの はねの はおり・ちょうの かみかざり・はりの ような かたな
    shinobu: function (g, st) {
      var wing = g.createLinearGradient(0, -76, 0, -22);
      wing.addColorStop(0, "#fbfbff"); wing.addColorStop(0.45, "#e8f4f4"); wing.addColorStop(0.7, "#8fd6c8"); wing.addColorStop(0.88, "#d8a0e0"); wing.addColorStop(1, "#7a3aa0");
      swordsman(g, st, {
        phase: 0.9, skin: "#fbe2d2", uniform: "#1a1a26", cap: "#1c1428", iris: ["#4a2a7a", "#b48ae8"], brow: "#2a1a3a", lash: "#1a1020", smile: true,
        haoriFront: wing, haoriBack: wing, sleeve: wing,
        blade: ["#c9b6ff", "#7a68b8"], stinger: true, hilt: "#2a1a3a", hiltWrap: "#8a6ac8", bladeGlow: st.poison ? "#c070ff" : null,
        tsuba: function (g) { g.fillStyle = "#6a3aa0"; path(g, [0, -5, 3, -3, 3, 3, 0, 5, -1, 0]); g.fill(); g.fillStyle = "#8fd6c8"; g.fillRect(0.5, -2, 2, 4); },
        // はねの すじ（ちょうの もよう）
        haoriDeco: function (g, hf) {
          g.strokeStyle = "rgba(40,20,60,.55)"; g.lineWidth = 0.8;
          g.beginPath(); g.moveTo(-8, -74); g.quadraticCurveTo(-14, -50, -18, hf); g.moveTo(-4, -60); g.quadraticCurveTo(-6, -40, -8, hf - 1); g.moveTo(-12, -40); g.lineTo(-3, -36); g.stroke();
          g.fillStyle = "rgba(255,255,255,.7)"; circ(g, -14, hf + 2, 1.2); circ(g, -9, hf + 1, 1.2); circ(g, -4, hf, 1);
        },
        hairBack: function (g, hx, hy) {
          var gr = g.createLinearGradient(hx, hy - 24, hx, hy + 16); gr.addColorStop(0, "#14101c"); gr.addColorStop(0.65, "#2a1a3a"); gr.addColorStop(1, "#7a4ab8");
          g.fillStyle = gr;
          // まとめがみ（うしろで ひとつに）
          path(g, [hx - 15, hy + 10, hx - 21, hy - 2, hx - 18, hy - 16, hx - 8, hy - 24, hx + 6, hy - 25, hx + 16, hy - 16, hx + 6, hy - 8, hx - 8, hy + 6]);
          g.fill();
          ell(g, hx - 17, hy - 4, 7, 6, 0, gr);
          // ちょうの かみかざり（むらさきと みどり）
          g.save(); g.translate(hx - 14, hy - 12);
          ell(g, -4, -3, 5.5, 3.6, -0.6, "#9a5ad0"); ell(g, -4, 3, 4.5, 3, 0.6, "#6ac0a8");
          ell(g, 4, -3, 5.5, 3.6, 0.6, "#9a5ad0"); ell(g, 4, 3, 4.5, 3, -0.6, "#6ac0a8");
          seg(g, 0, -4, 0, 4, "#2a1a3a", 1.4);
          g.restore();
        },
        hairFront: function (g, hx, hy) {
          var gr = g.createLinearGradient(hx, hy - 24, hx, hy + 6); gr.addColorStop(0, "#14101c"); gr.addColorStop(0.7, "#2a1a3a"); gr.addColorStop(1, "#8a5ac8");
          g.fillStyle = gr;
          path(g, [hx - 12, hy - 14, hx - 4, hy - 23, hx + 8, hy - 23, hx + 17, hy - 15, hx + 19, hy + 2, hx + 16, hy - 4, hx + 14, hy - 10, hx + 10, hy - 4, hx + 8, hy - 11, hx + 2, hy - 7, hx - 2, hy - 13, hx - 8, hy - 5]);
          g.fill();
        }
      });
    },
    // つゆり カナヲ: よこの ひとつむすび・ちょうの かみどめ・しろい マント・スカート・さくらいろの かたな
    kanao: function (g, st) {
      swordsman(g, st, {
        phase: 2.4, skin: "#fbe2d4", uniform: "#191b28", cap: "#0e0c14", iris: ["#6a2a6a", "#e8a0d8"], brow: "#1a1018", lash: "#140a10", lid: 0.12,
        haoriFront: "#f6f4f2", haoriBack: "#e6e2e0", sleeve: "#1d2030", backSleeve: "#1d2030", hemY: -46, skirt: "#191b28",
        blade: ["#ffd6ec", "#e46aa8", "#b03a7a"], hilt: "#2a1420", hiltWrap: "#f2a0c8", bladeGlow: st.flower ? "#ff9ad0" : null,
        tsuba: function (g) { g.fillStyle = "#e46aa8"; for (var i = 0; i < 4; i++) { var a = i * PI / 2; ell(g, 1.5 + Math.cos(a) * 2, Math.sin(a) * 3.2, 2.2, 2.2, 0, "#e46aa8"); } circ(g, 1.5, 0, 1.4, "#ffe066"); },
        hairBack: function (g, hx, hy, t) {
          g.fillStyle = "#0e0c14";
          path(g, [hx - 15, hy + 8, hx - 20, hy - 6, hx - 14, hy - 20, hx - 2, hy - 26, hx + 10, hy - 24, hx + 17, hy - 14, hx + 4, hy - 8, hx - 10, hy + 6]);
          g.fill();
          // よこの ひとつむすび（ゆれる）
          var s = Math.sin(t * 2.6) * 2;
          path(g, [hx - 14, hy - 8, hx - 26, hy, hx - 30 + s, hy + 18, hx - 24 + s, hy + 30, hx - 19 + s * 0.6, hy + 16, hx - 13, hy + 2]);
          g.fill();
          // ちょうの かみどめ（ピンク）
          g.save(); g.translate(hx - 15, hy - 8);
          ell(g, -4, -3, 5, 3.4, -0.6, "#f07ab8"); ell(g, -3, 3, 4, 2.8, 0.6, "#f7b6d8");
          ell(g, 4, -3, 5, 3.4, 0.6, "#f07ab8"); ell(g, 3, 3, 4, 2.8, -0.6, "#f7b6d8");
          seg(g, 0, -4, 0, 4, "#5a1a3a", 1.4);
          g.restore();
        },
        hairFront: function (g, hx, hy) {
          g.fillStyle = "#0e0c14";
          // まっすぐな まえがみ
          path(g, [hx - 12, hy - 14, hx - 4, hy - 24, hx + 9, hy - 24, hx + 18, hy - 15, hx + 19, hy - 5, hx + 15, hy - 6, hx + 12, hy - 6, hx + 8, hy - 6, hx + 4, hy - 6, hx - 1, hy - 8, hx - 6, hy - 6]);
          g.fill();
          seg(g, hx + 18, hy - 6, hx + 18, hy + 10, "#0e0c14", 2.5);
        }
      });
    },
    // はしびら いのすけ: いのししの かぶりもの・はだか・けがわの こしみの・ギザギザの にとう
    inosuke: function (g, st) {
      var t = st.t || 0, pose = st.pose || "idle", sw = st.swing || 0;
      var bob = Math.sin(t * 4.2 + 1) * 1.6, lean = 0.12, stance = 0.42, a1 = -0.6, a2 = -1.1;
      if (pose === "attack") { var e = Math.sin(sw * PI); a1 = -2.4 + sw * 3.6; a2 = 1.2 - sw * 3.2; lean = 0.3 * e + 0.12; stance = 0.65; }
      else if (pose === "hurt") { lean = -0.3; a1 = -0.2; a2 = -0.4; }
      else if (pose === "guard") { a1 = -1.6; a2 = -1.3; lean = 0; }
      else if (pose === "cast") { a1 = -2.6; a2 = -2.2; lean = -0.1; }
      var skin = "#f4d6be", Ld = "#2a1a10", o = { uniform: "#2c3148", skin: skin };
      g.save();
      if (pose === "down") { g.translate(-6, -5); g.rotate(-1.48); g.translate(0, 6); bob = 0; }
      var hipY = -40;
      leg(g, -5, hipY, -stance, o, true);
      leg(g, 5, hipY, stance * 0.9, o, false);
      g.translate(0, hipY + bob); g.rotate(lean); g.translate(0, -hipY);
      // けがわの こしみの（ギザギザの すそ）
      var fur = "#7a6a58";
      path(g, [-14, -47, 14, -47, 16, -34, 12, -30, 9, -35, 5, -29, 1, -34, -3, -28, -7, -34, -11, -29, -15, -35]); g.fillStyle = fur; g.fill(); g.strokeStyle = Ld; g.lineWidth = 1; g.stroke();
      // うしろの うでと かたな
      var bsx = -6, bsy = -70, bhx = bsx + 6 + Math.cos(a2) * 14, bhy = bsy + 10 + Math.sin(a2) * 10;
      limb(g, bsx, bsy, bhx, bhy, 9, 7.5, shade(skin, -14), Ld);
      jagged(g, bhx, bhy, a2, st);
      // はだかの どう（きんにく）
      fillPath(g, [-12, -79, 12, -79, 11, -46, -11, -46], skin, Ld, 1.1);
      var sg = g.createLinearGradient(-12, 0, 12, 0); sg.addColorStop(0, "rgba(140,90,60,.35)"); sg.addColorStop(1, "rgba(255,255,255,.08)");
      fillPath(g, [-12, -79, 12, -79, 11, -46, -11, -46], sg);
      g.strokeStyle = "rgba(140,90,60,.6)"; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-8, -66); g.quadraticCurveTo(-2, -62, 2, -66); g.moveTo(2, -66); g.quadraticCurveTo(7, -62, 11, -66);
      g.moveTo(1, -60); g.lineTo(1, -48); g.moveTo(-5, -56); g.lineTo(7, -56); g.moveTo(-5, -51); g.lineTo(7, -51); g.stroke();
      // いのししの あたま
      var hx = 4, hy = -96;
      g.fillStyle = "#4a3e34"; // うしろの たてがみ
      path(g, [hx - 16, hy + 16, hx - 28, hy + 8, hx - 22, hy + 2, hx - 30, hy - 6, hx - 21, hy - 10, hx - 26, hy - 20, hx - 14, hy - 18, hx - 12, hy - 28, hx - 2, hy - 20, hx + 2, hy + 10]);
      g.fill();
      var mg = g.createRadialGradient(hx + 2, hy - 6, 4, hx, hy, 24); mg.addColorStop(0, "#b4a694"); mg.addColorStop(1, "#6e6050");
      g.beginPath(); g.moveTo(hx - 16, hy + 14); g.bezierCurveTo(hx - 22, hy - 10, hx - 6, hy - 26, hx + 10, hy - 20);
      g.bezierCurveTo(hx + 22, hy - 14, hx + 26, hy - 2, hx + 31, hy + 4); // はなさき へ
      g.lineTo(hx + 31, hy + 13); g.bezierCurveTo(hx + 20, hy + 18, hx + 6, hy + 22, hx - 16, hy + 14); g.closePath();
      g.fillStyle = mg; g.fill(); g.strokeStyle = Ld; g.lineWidth = 1.2; g.stroke();
      // みみ
      fillPath(g, [hx - 6, hy - 18, hx - 12, hy - 32, hx + 1, hy - 22], "#8a7a68", Ld, 1);
      fillPath(g, [hx - 7, hy - 20, hx - 10, hy - 28, hx - 2, hy - 22], "#c79a8a");
      // はな（ぶたばな）と きば
      ell(g, hx + 30, hy + 8.5, 3.6, 5.6, 0, "#5a4a3c"); ell(g, hx + 30.5, hy + 6.5, 1.1, 1.5, 0, "#1a120c"); ell(g, hx + 30.5, hy + 10.5, 1.1, 1.5, 0, "#1a120c");
      fillPath(g, [hx + 22, hy + 14, hx + 27, hy + 9, hx + 25, hy + 16], "#f4f0e4", Ld, 0.6);
      // め（うつろな あな に あおい ひかり）
      ell(g, hx + 12, hy - 4, 4.4, 3.6, -0.2, "#1a1410");
      circ(g, hx + 13, hy - 4, 1.4, "#8fd0ff");
      g.strokeStyle = "rgba(60,40,30,.6)"; g.lineWidth = 0.8;
      for (var i = 0; i < 6; i++) { g.beginPath(); g.moveTo(hx - 10 + i * 4, hy - 16 + i); g.lineTo(hx - 6 + i * 4, hy - 10 + i); g.stroke(); }
      // まえの うでと かたな
      var sx = 7, sy = -71, hx1 = sx + 8 + Math.cos(a1) * 14, hy1 = sy + 10 + Math.sin(a1) * 10;
      limb(g, sx, sy, hx1, hy1, 10, 8, skin, Ld);
      jagged(g, hx1, hy1, a1, st);
      circ(g, hx1, hy1, 4, skin, Ld, 0.8);
      g.restore();
    },
    // どうま: うすい きんいろの かみ（あたまに あかい しみ）・にじいろの め・きんいろの てっせん
    douma: function (g, st) {
      var t = st.t || 0, pose = st.pose || "idle", sw = st.swing || 0;
      var bob = Math.sin(t * 2.4) * 1.4, lean = -0.02, fan1 = -0.4, fan2 = 0.6, f1x = 0, f1y = 0;
      if (pose === "attack") { var e = Math.sin(Math.min(1, sw) * PI); fan1 = -1.8 + sw * 3.2; lean = 0.14 * e; f1x = e * 14; f1y = -e * 4; }
      else if (pose === "hurt") lean = -0.25;
      else if (pose === "cast") { fan1 = -2.4; fan2 = -2.0; lean = -0.1; }
      var skin = "#f6ece8", Ld = "#2a1a20", hak = "#24161e";
      g.save();
      var hipY = -44;
      // はかま（ながく ひろい）
      fillPath(g, [-13, hipY, 13, hipY, 19, -4, 3, -4, 1, -24, -2, -4, -19, -4], hak, "#0e080c", 1.2);
      seg(g, -8, hipY + 4, -12, -6, "rgba(255,255,255,.07)", 1); seg(g, 8, hipY + 4, 12, -6, "rgba(255,255,255,.07)", 1);
      ell(g, -10, -3, 7, 3, 0, "#f4f0e8"); ell(g, 11, -3, 7, 3, 0, "#f4f0e8");
      g.translate(0, hipY + bob); g.rotate(lean); g.translate(0, -hipY);
      // うしろの うでと せんす
      limb(g, -6, -78, -12 + Math.cos(fan2) * 6, -62 + Math.sin(fan2) * 6, 9, 7.5, "#e9e2da", Ld);
      fan(g, -12 + Math.cos(fan2) * 6, -62 + Math.sin(fan2) * 6, fan2 - 0.6, st, 0.9);
      // うわぎ（しろい きもの＋あかい えり）と おび
      fillPath(g, [-12, -84, 12, -84, 14, -44, -13, -44], "#ece6dc", Ld, 1.1);
      fillPath(g, [-2, -84, 8, -84, 4, -60], "#9a1e2a", Ld, 0.8);
      fillPath(g, [-13, -52, 14, -52, 14, -44, -13, -44], "#d89a2a", Ld, 0.9);
      seg(g, -13, -48, 14, -48, "#7a1a1a", 1);
      // かたに かかる ぬの（くろ）
      fillPath(g, [-14, -86, -4, -86, -8, -56, -17, -50], "#1a1218", Ld, 1);
      // あたま
      var hx = 4, hy = -102;
      seg(g, 2, -90, 4, -84, skin, 8);
      var hg = g.createLinearGradient(hx, hy - 24, hx, hy + 26); hg.addColorStop(0, "#f8ecc4"); hg.addColorStop(1, "#d8c088");
      g.fillStyle = hg; // うしろがみ（ながめ）
      path(g, [hx - 15, hy + 22, hx - 22, hy + 8, hx - 20, hy - 12, hx - 8, hy - 25, hx + 8, hy - 25, hx + 18, hy - 14, hx + 6, hy - 6, hx - 8, hy + 20]);
      g.fill();
      faceShape(g, hx, hy, skin, "#6a4a40");
      hairCap(g, hx, hy, "#e8d498");
      ear(g, hx, hy, skin, "#8a6a5a");
      var gl = st.big ? ["上弦", "#2a2a4a"] : null, gl2 = st.big ? ["弐", "#2a2a4a"] : null;
      var rainbow = ["#6ad0ff", "#c890ff", "#ff8ac0", "#ffd36a", "#7ae0a8"];
      eye(g, hx + 5.5, hy + 2, 4, 4.4, rainbow, { lash: "#5a3a2a", noPupil: !!gl, glyph: gl, ring: "#4a3a6a" });
      eye(g, hx + 13.5, hy + 2, 2.4, 4.1, rainbow, { lash: "#5a3a2a", noPupil: !!gl2, glyph: gl2, ring: "#4a3a6a" });
      g.strokeStyle = "#a08850"; g.lineWidth = 1.4; g.lineCap = "round";
      g.beginPath(); g.moveTo(hx + 1, hy - 7); g.quadraticCurveTo(hx + 5, hy - 9, hx + 9, hy - 7.5); g.stroke();
      g.beginPath(); g.moveTo(hx + 11.5, hy - 7.5); g.lineTo(hx + 15, hy - 6.5); g.stroke();
      seg(g, hx + 15.5, hy + 5, hx + 16.5, hy + 7.5, "rgba(120,80,70,.6)", 1);
      // いつも にこにこ
      g.strokeStyle = "#7a3a3a"; g.lineWidth = 1.3; g.beginPath(); g.moveTo(hx + 6.5, hy + 10); g.quadraticCurveTo(hx + 11, hy + 15, hx + 15, hy + 9.5); g.stroke();
      if (pose === "attack" || pose === "cast" || st.shout) { fillPath(g, [hx + 7.5, hy + 10.8, hx + 14.5, hy + 10.3, hx + 11, hy + 14], "#6a1a24"); }
      // まえがみ＋あたまの あかい しみ
      g.fillStyle = hg;
      path(g, [hx - 12, hy - 14, hx - 2, hy - 25, hx + 10, hy - 24, hx + 18, hy - 14, hx + 20, hy + 2, hx + 16, hy - 6, hx + 13, hy - 12, hx + 9, hy - 5, hx + 6, hy - 13, hx, hy - 8, hx - 4, hy - 14, hx - 9, hy - 4]);
      g.fill();
      g.fillStyle = "rgba(150,20,30,.85)";
      path(g, [hx - 6, hy - 22, hx + 2, hy - 26, hx + 10, hy - 23, hx + 8, hy - 18, hx + 4, hy - 13, hx + 2, hy - 19, hx - 2, hy - 15, hx - 3, hy - 19]); g.fill();
      // まえの うでと せんす
      var sx = 8, sy = -79, ex = sx + 8 + f1x + Math.cos(fan1) * 6, ey = sy + 14 + f1y + Math.sin(fan1) * 6;
      limb(g, sx, sy, ex, ey, 10, 8, "#ece6dc", Ld);
      fan(g, ex, ey, fan1, st, 1);
      circ(g, ex, ey, 3.8, skin, Ld, 0.8);
      g.restore();
    }
  };

  KB.drawChar = function (g, look, x, y, st) {
    var f = LOOKS[look]; if (!f) return;
    var s = st.scale || 1;
    g.save(); g.translate(x, y);
    // かげ
    g.save(); g.scale(1, 0.28); circ(g, 0, 0, (st.pose === "down" ? 46 : 26) * s, "rgba(0,0,0,.45)"); g.restore();
    g.scale(st.flip ? -s : s, s);
    g.globalAlpha = st.alpha == null ? 1 : st.alpha;
    if (st.glow) { g.shadowColor = st.glow; g.shadowBlur = 16; }
    f(g, st);
    g.restore();
    if (st.flash > 0) { // ダメージの しろい ひかり
      g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = st.flash * 0.7;
      g.translate(x, y); g.scale(st.flip ? -s : s, s); f(g, st); g.restore();
    }
  };

  // カットインよう: かおを おおきく かく（cx,cy に かおの まんなか、s = おおきさ）
  KB.drawPortrait = function (g, look, cx, cy, s, st, flip) {
    var f = LOOKS[look]; if (!f) return;
    g.save(); g.translate(cx, cy); g.scale(flip ? -s : s, s);
    var hy = { akaza: -97, douma: -102, inosuke: -96 }[look] || -94;
    g.translate(-8, -hy + 6);
    f(g, Object.assign({ t: 0, pose: "idle", shout: true, big: true }, st || {}));
    g.restore();
  };
  KB.LOOKS = LOOKS;
})(window);
