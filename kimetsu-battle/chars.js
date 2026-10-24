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
    gr.addColorStop(0, iris[0]); gr.addColorStop(1, iris[1]);
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
    fillPath(g, [-13, -74, -4, -74, -6, -26, -22 + hem * 0.6, -18 + Math.abs(sway) * 0.3, -19 + hem * 0.2, -40], o.haoriBack, Ld, 1.1);
    g.restore();
    // --- まえの あし ---
    leg(g, 4, hipY, stance * 0.9, o, false);

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
    fillPath(g, [-13, -76, -3, -77, -1, -40, -6, -22, -20 + sway * 0.4, -20, -17, -50], o.haoriFront, Ld, 1.1);
    fillPath(g, [-13, -76, -3, -77, -1, -40, -6, -22, -20 + sway * 0.4, -20, -17, -50], "rgba(0,0,0,.18)");

    // あたま
    var hx = 4, hy = -94 + breathe * 0.4;
    seg(g, 2, -80, 4, -76, o.skin, 8); // くび
    if (o.hairBack) o.hairBack(g, hx, hy, t, st);
    faceShape(g, hx, hy, o.skin, "#3a2418");
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
    } else seg(g, hx + 8.5, hy + 12, hx + 12.5, hy + 11.6, "#8a4a3a", 1.2);
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
    var gr = g.createLinearGradient(0, -2.2, 0, 2.2);
    gr.addColorStop(0, o.blade[0]); gr.addColorStop(0.55, o.blade[1]); gr.addColorStop(1, o.blade[2] || o.blade[1]);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(3, -2); g.lineTo(54, -1.6); g.quadraticCurveTo(61, -0.8, 62, 1.2); g.lineTo(3, 2.1); g.closePath(); g.fill();
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(4, 1.4); g.lineTo(58, 0.9); g.stroke();
    if (o.bladeGlow) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.35; g.fillStyle = o.bladeGlow; g.fillRect(3, -3.5, 56, 7); }
    g.restore();
    void bx; void by;
  }

  /* ---------- キャラごとの みため ---------- */
  var LOOKS = {
    tanjiro: function (g, st) {
      swordsman(g, st, {
        phase: 0, skin: "#f8dcc4", uniform: "#1b1d2b", iris: ["#4a0c0c", "#c2412e"], brow: "#4a1410", lash: "#2a0a08",
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
        phase: 1.7, skin: "#f6dac4", uniform: "#171a28", iris: ["#0e1a40", "#3d64b8"], brow: "#0f1018", lash: "#0a0a12", lid: 0.28, browTilt: 1,
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
    var hy = look === "akaza" ? -97 : -94;
    g.translate(-8, -hy + 6);
    f(g, Object.assign({ t: 0, pose: "idle", shout: true, big: true }, st || {}));
    g.restore();
  };
  KB.LOOKS = LOOKS;
})(window);
