/* ============================================================
   きめつバトル — え（Canvas に コードで かく。がぞう ファイルは ない）
   - LOOKS … キャラの みため。あたらしい キャラは ここに 1つ たす
             （げんてんは あしもと、みぎむき。st.pose: idle / attack / hurt / guard / down / cast）
   - BGS   … はいけい。あたらしい ばしょは ここに 1つ たす
   - FX    … わざの エフェクト
   ============================================================ */
(function (root) {
  "use strict";
  var KB = root.KB = root.KB || {};
  var W = 640, H = 360;
  KB.W = W; KB.H = H;

  function poly(g, pts, fill, stroke, lw) {
    g.beginPath(); g.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1.5; g.stroke(); }
  }
  function circ(g, x, y, r, fill, stroke, lw) {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1.5; g.stroke(); }
  }
  function line(g, x1, y1, x2, y2, col, lw) {
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = "round"; g.stroke();
  }

  /* ---------- もようの パターン ---------- */
  var pats = {};
  function pattern(g, name) {
    if (pats[name]) return pats[name];
    var c = document.createElement("canvas"), p = c.getContext("2d");
    if (name === "ichimatsu") { // たんじろうの はおり（みどりと くろの いちまつもよう）
      c.width = c.height = 12;
      p.fillStyle = "#16171c"; p.fillRect(0, 0, 12, 12);
      p.fillStyle = "#1f9a63"; p.fillRect(0, 0, 6, 6); p.fillRect(6, 6, 6, 6);
    } else if (name === "kikko") { // ぎゆうの はおり（きいろ・みどり・オレンジの きっこうもよう）
      c.width = 14; c.height = 12;
      p.fillStyle = "#d9b93a"; p.fillRect(0, 0, 14, 12);
      p.fillStyle = "#5c8f3a"; p.fillRect(0, 0, 7, 6);
      p.fillStyle = "#e07a2c"; p.fillRect(7, 6, 7, 6);
      p.strokeStyle = "#3a2a10"; p.lineWidth = 1;
      p.beginPath(); p.moveTo(0, 6); p.lineTo(3, 0); p.lineTo(10, 0); p.lineTo(14, 6); p.lineTo(10, 12); p.lineTo(3, 12); p.closePath(); p.stroke();
    }
    return (pats[name] = g.createPattern(c, "repeat"));
  }

  /* ---------- けんしの からだ（たんじろう・ぎゆう きょうつう） ----------
     o: { skin, uniform, haori(g, x,y,w,h), hair(g,hx,hy), eye, blade } */
  function swordsman(g, st, o) {
    var t = st.t || 0, pose = st.pose || "idle", sw = st.swing || 0;
    var bob = Math.sin(t * 3.2 + (o.phase || 0)) * 1.4;
    var ang = -0.55, lean = 0, reach = 15;
    if (pose === "attack") { ang = -2.3 + sw * 3.4; lean = 0.12 * Math.sin(sw * Math.PI); reach = 17; }
    else if (pose === "hurt") { lean = -0.28; ang = -0.2; }
    else if (pose === "guard") { ang = -1.45; reach = 12; }
    else if (pose === "cast") { ang = -1.2; lean = -0.05; }
    g.save();
    if (pose === "down") { g.translate(0, -6); g.rotate(-1.45); g.translate(0, 8); bob = 0; }
    // あし（はかま）
    poly(g, [-12, -36, 12, -36, 16, 0, 3, 0, 0, -16, -3, 0, -16, 0], o.uniform, "#000", 1.2);
    poly(g, [-17, 0, -3, 0, -3, -4, -15, -4], "#e9e4d8"); poly(g, [3, 0, 17, 0, 17, -4, 4, -4], "#e9e4d8");
    g.translate(0, -36 + bob); g.rotate(lean); g.translate(0, 36);
    // うしろの うで
    line(g, -6, -60, -14, -44, o.uniform, 7);
    // どう
    poly(g, [-11, -67, 11, -67, 12, -35, -12, -35], o.uniform, "#000", 1.2);
    poly(g, [-12, -40, 12, -40, 12, -36, -12, -36], "#e9e4d8");
    // はおり
    o.haori(g);
    // あたま
    var hx = 3, hy = -84;
    circ(g, hx, hy, 16.5, o.skin, "#3a2418", 1.2);
    o.hair(g, hx, hy, t);
    // め・くち
    g.fillStyle = "#fff"; g.beginPath(); g.ellipse(hx + 9, hy + 1, 3.6, 4.2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = o.eye; g.beginPath(); g.ellipse(hx + 10, hy + 1.5, 2.3, 3.2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#000"; g.beginPath(); g.arc(hx + 10.5, hy + 1.5, 1.1, 0, Math.PI * 2); g.fill();
    line(g, hx + 6, hy - 5, hx + 13, hy - 4.5, "#2a1a10", 1.6);
    line(g, hx + 9, hy + 9, hx + 13, hy + 9, "#8a4a3a", 1.4);
    if (o.extraFace) o.extraFace(g, hx, hy);
    // まえの うでと かたな
    var sx = 6, sy = -60, ex = sx + Math.cos(ang * 0.5 + 0.6) * reach, ey = sy + Math.sin(ang * 0.5 + 0.6) * reach;
    line(g, sx, sy, ex, ey, o.sleeve || o.uniform, 7.5);
    circ(g, ex, ey, 3.6, o.skin);
    var bx = Math.cos(ang), by = Math.sin(ang);
    line(g, ex - bx * 8, ey - by * 8, ex + bx * 4, ey + by * 4, "#3a2a1c", 3.5); // つか
    g.save(); g.translate(ex + bx * 5, ey + by * 5); g.rotate(ang);
    g.fillStyle = "#c9a640"; g.fillRect(-1.5, -4, 3, 8); // つば
    var grd = g.createLinearGradient(0, -2, 0, 2); grd.addColorStop(0, o.blade[0]); grd.addColorStop(1, o.blade[1]);
    g.fillStyle = grd; g.beginPath(); g.moveTo(1.5, -1.8); g.lineTo(48, -1.4); g.lineTo(54, 0.6); g.lineTo(1.5, 1.8); g.closePath(); g.fill();
    g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(3, -1.2); g.lineTo(50, -0.9); g.stroke();
    g.restore();
    g.restore();
  }

  var LOOKS = {
    tanjiro: function (g, st) {
      swordsman(g, st, {
        skin: "#f7d6bb", uniform: "#1a1c28", eye: "#a2322a", blade: ["#2a2a30", "#0e0e12"], phase: 0,
        haori: function (g) {
          poly(g, [-15, -67, 7, -67, 9, -22, -19, -20], pattern(g, "ichimatsu"), "#0b0b0b", 1.2);
        },
        sleeve: pattern(g, "ichimatsu"),
        hair: function (g, hx, hy) {
          g.fillStyle = "#6e1f17";
          g.beginPath(); g.moveTo(hx - 17, hy + 4); g.lineTo(hx - 21, hy - 6); g.lineTo(hx - 15, hy - 10); g.lineTo(hx - 17, hy - 19);
          g.lineTo(hx - 7, hy - 17); g.lineTo(hx - 4, hy - 24); g.lineTo(hx + 4, hy - 18); g.lineTo(hx + 12, hy - 21); g.lineTo(hx + 14, hy - 13);
          g.lineTo(hx + 20, hy - 10); g.lineTo(hx + 13, hy - 6); g.lineTo(hx + 4, hy - 9); g.lineTo(hx - 6, hy - 7); g.lineTo(hx - 10, hy + 6); g.closePath(); g.fill();
        },
        extraFace: function (g, hx, hy) {
          g.fillStyle = "#b5473a"; g.beginPath(); g.ellipse(hx + 2, hy - 8, 3.5, 2.2, 0.3, 0, Math.PI * 2); g.fill(); // ひたいの あざ
          g.fillStyle = "#fff"; g.fillRect(hx - 6, hy + 4, 4, 7); g.fillStyle = "#d33"; circ(g, hx - 4, hy + 7.5, 1.4, "#d33"); // はなふだの みみかざり
        }
      });
    },
    giyu: function (g, st) {
      swordsman(g, st, {
        skin: "#f4d2b6", uniform: "#161a2a", eye: "#2e4f9a", blade: ["#5ea2ff", "#1c4fa8"], phase: 1.7,
        haori: function (g) {
          poly(g, [-15, -67, -3, -67, -3, -20, -19, -20], "#8a1f3d", "#0b0b0b", 1.2);
          poly(g, [-3, -67, 7, -67, 9, -22, -3, -20], pattern(g, "kikko"), "#0b0b0b", 1.2);
        },
        sleeve: "#8a1f3d",
        hair: function (g, hx, hy, t) {
          g.fillStyle = "#0f1018";
          // うしろの ポニーテール
          var sway = Math.sin(t * 2.5) * 2;
          g.beginPath(); g.moveTo(hx - 12, hy + 2); g.quadraticCurveTo(hx - 30, hy + 14 + sway, hx - 24 + sway, hy + 34); g.lineTo(hx - 16, hy + 14); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(hx - 18, hy + 6); g.lineTo(hx - 20, hy - 10); g.lineTo(hx - 12, hy - 19); g.lineTo(hx - 2, hy - 18);
          g.lineTo(hx + 8, hy - 19); g.lineTo(hx + 18, hy - 9); g.lineTo(hx + 15, hy - 4); g.lineTo(hx + 9, hy - 8); g.lineTo(hx + 6, hy - 2);
          g.lineTo(hx + 1, hy - 8); g.lineTo(hx - 8, hy - 6); g.lineTo(hx - 10, hy + 8); g.closePath(); g.fill();
        }
      });
    },
    akaza: function (g, st) {
      var t = st.t || 0, pose = st.pose || "idle", sw = st.swing || 0;
      var bob = Math.sin(t * 4) * 1.6, punch = 0, kick = 0, lean = 0;
      if (pose === "attack") punch = Math.sin(Math.min(1, sw) * Math.PI);
      else if (pose === "kick") kick = Math.sin(Math.min(1, sw) * Math.PI);
      else if (pose === "hurt") lean = -0.25;
      else if (pose === "cast") lean = -0.1;
      var skin = "#f3ddd6", line1 = "#3a64d8", pants = "#3a2a5c";
      g.save();
      // あし
      g.save(); g.translate(-5, -36);
      line(g, 0, 0, -7, 36, pants, 9); line(g, -7, 30, -7, 36, "#ddd", 9);
      g.restore();
      g.save(); g.translate(5, -36); g.rotate(-kick * 1.5);
      line(g, 0, 0, 6, 36, pants, 9); line(g, 6, 30, 6, 36, "#ddd", 9);
      line(g, 3, 20, 5, 24, line1, 1.6);
      g.restore();
      g.translate(0, -36 + bob); g.rotate(lean); g.translate(0, 36);
      // うしろの うで（こぶし）
      line(g, -7, -64, -15, -52, skin, 7); line(g, -15, -52, -6, -46, skin, 7); circ(g, -6, -46, 4.5, skin, "#7a5a50", 1);
      line(g, -12, -58, -13, -54, line1, 1.5);
      // どう（はだかに あおい もよう）
      poly(g, [-11, -70, 11, -70, 10, -36, -10, -36], skin, "#7a5a50", 1);
      for (var i = 0; i < 4; i++) line(g, -8, -64 + i * 7, 8, -62 + i * 7, line1, 1.6);
      line(g, 0, -70, 0, -40, line1, 1.4);
      poly(g, [-11, -40, 11, -40, 11, -35, -11, -35], "#e8e2f0");
      // みじかい うわぎ
      poly(g, [-13, -71, -4, -71, -6, -50, -14, -52], "#d6458a", "#5a1438", 1);
      poly(g, [6, -71, 13, -71, 14, -54, 8, -52], "#d6458a", "#5a1438", 1);
      // あたま
      var hx = 2, hy = -87;
      circ(g, hx, hy, 15.5, skin, "#7a5a50", 1);
      // かみ（ピンク）
      g.fillStyle = "#f07bab";
      g.beginPath(); g.moveTo(hx - 16, hy + 4); g.lineTo(hx - 22, hy - 4); g.lineTo(hx - 15, hy - 9); g.lineTo(hx - 19, hy - 18); g.lineTo(hx - 8, hy - 16);
      g.lineTo(hx - 6, hy - 26); g.lineTo(hx + 2, hy - 18); g.lineTo(hx + 10, hy - 25); g.lineTo(hx + 12, hy - 14); g.lineTo(hx + 21, hy - 13);
      g.lineTo(hx + 14, hy - 6); g.lineTo(hx + 6, hy - 9); g.lineTo(hx - 4, hy - 7); g.lineTo(hx - 9, hy + 5); g.closePath(); g.fill();
      // かおの あおい もよう
      line(g, hx + 4, hy - 4, hx + 15, hy - 3, line1, 1.6);
      line(g, hx + 6, hy + 6, hx + 14, hy + 7, line1, 1.6);
      line(g, hx - 4, hy + 8, hx + 2, hy + 12, line1, 1.6);
      // め（きいろ）
      g.fillStyle = "#ffd23a"; g.beginPath(); g.ellipse(hx + 9, hy + 1, 3.6, 3.8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#1a2a70"; g.fillRect(hx + 9, hy - 1.5, 1.6, 5);
      line(g, hx + 5, hy - 4.5, hx + 13, hy - 6, "#c0306a", 1.8);
      line(g, hx + 9, hy + 9.5, hx + 13, hy + 9, "#6a2a4a", 1.4);
      // まえの うで（パンチ）
      var sx = 7, sy = -64, ex = sx + 8 + punch * 30, ey = sy + 8 - punch * 4;
      line(g, sx, sy, ex, ey, skin, 7.5);
      line(g, sx + 4, sy + 3, sx + 6, sy + 6, line1, 1.6);
      if (punch > 0.3 || pose === "cast") circ(g, ex, ey, 9, "rgba(120,200,255,.35)");
      circ(g, ex, ey, 5, skin, "#7a5a50", 1);
      g.restore();
    }
  };

  KB.drawChar = function (g, look, x, y, st) {
    var f = LOOKS[look]; if (!f) return;
    g.save(); g.translate(x, y);
    var s = st.scale || 1; g.scale(st.flip ? -s : s, s);
    g.globalAlpha = st.alpha == null ? 1 : st.alpha;
    // かげ
    g.save(); g.scale(1, 0.3); circ(g, 0, 0, st.pose === "down" ? 40 : 22, "rgba(0,0,0,.4)"); g.restore();
    if (st.glow) { g.shadowColor = st.glow; g.shadowBlur = 18; }
    f(g, st);
    g.restore();
    if (st.flash > 0) { // ダメージの しろい ひかり
      g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = st.flash * 0.6;
      g.translate(x, y); g.scale(st.flip ? -(st.scale || 1) : (st.scale || 1), st.scale || 1);
      f(g, st); g.restore();
    }
  };

  /* ---------- はいけい ---------- */
  var bgCache = {};
  var BGS = {
    // むげんじょう: もくぞうの へや・しょうじ・てすりが どこまでも つづく。さかさまの へやも
    mugen: function (g) {
      var vx = 320, vy = 150;
      var sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#120a08"); sky.addColorStop(0.45, "#2b170e"); sky.addColorStop(1, "#1a0e08");
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // とおくの へや（しょうじが ひかる）
      function room(x, y, w, h, flip) {
        g.save(); g.translate(x, y); if (flip) { g.scale(1, -1); }
        g.fillStyle = "#3a2112"; g.fillRect(-w / 2 - 4, -h - 6, w + 8, h + 10);
        var n = Math.max(2, Math.round(w / 18));
        for (var i = 0; i < n; i++) {
          var px = -w / 2 + i * (w / n) + 1.5, pw = w / n - 3;
          var lg = g.createLinearGradient(0, -h, 0, 0); lg.addColorStop(0, "#f7d48a"); lg.addColorStop(1, "#c98a3a");
          g.fillStyle = lg; g.globalAlpha = 0.75; g.fillRect(px, -h, pw, h); g.globalAlpha = 1;
          g.strokeStyle = "#5a3418"; g.lineWidth = 1;
          for (var k = 1; k < 4; k++) { g.beginPath(); g.moveTo(px, -h + h * k / 4); g.lineTo(px + pw, -h + h * k / 4); g.stroke(); }
          g.beginPath(); g.moveTo(px + pw / 2, -h); g.lineTo(px + pw / 2, 0); g.stroke();
        }
        g.fillStyle = "#24130a"; g.fillRect(-w / 2 - 8, -h - 10, w + 16, 6); // のき
        g.fillRect(-w / 2 - 6, 0, w + 12, 4);
        g.restore();
      }
      // おく（ちいさく くらい）
      g.globalAlpha = 0.55;
      room(120, 120, 70, 30); room(250, 95, 50, 22); room(420, 110, 60, 26); room(540, 80, 50, 22);
      room(180, 40, 60, 24, true); room(470, 30, 80, 26, true); room(330, 60, 40, 18, true);
      g.globalAlpha = 0.85;
      room(40, 170, 90, 40); room(600, 160, 90, 40); room(320, 128, 110, 34);
      room(90, 8, 120, 34, true); room(560, 4, 110, 36, true);
      g.globalAlpha = 1;
      // かいだん・はしら（ななめの せん）
      g.strokeStyle = "rgba(90,52,26,.9)"; g.lineWidth = 5;
      [[0, 210, 160, 120], [640, 200, 470, 115], [200, 0, 260, 90], [430, 0, 380, 80]].forEach(function (a) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(a[2], a[3]); g.stroke(); });
      g.lineWidth = 2; g.strokeStyle = "rgba(140,88,44,.8)";
      for (var s = 0; s < 8; s++) { var u = s / 8; g.beginPath(); g.moveTo(u * 160, 210 - u * 90); g.lineTo(u * 160 + 8, 214 - u * 90); g.stroke(); }
      // ゆか（いたばり・おくへ すぼまる）
      var fy = 200;
      var fl = g.createLinearGradient(0, fy, 0, H); fl.addColorStop(0, "#4a2a14"); fl.addColorStop(1, "#7a4a22");
      g.fillStyle = fl; g.fillRect(0, fy, W, H - fy);
      g.strokeStyle = "rgba(40,20,8,.55)"; g.lineWidth = 1.2;
      for (var i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(vx + i * 12, fy); g.lineTo(vx + i * 80, H); g.stroke(); }
      for (var j = 0; j < 7; j++) { var yy = fy + Math.pow(j / 7, 1.8) * (H - fy); g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); }
      // ゆかの へり（てすり）
      g.fillStyle = "#2a160a"; g.fillRect(0, fy - 4, W, 6);
      g.fillStyle = "#8a2a1a"; for (var p = 0; p < W; p += 48) g.fillRect(p, fy - 18, 5, 16);
      g.fillRect(0, fy - 20, W, 3);
      void vy;
    }
  };
  KB.drawBg = function (g, name, t) {
    var c = bgCache[name];
    if (!c) {
      c = document.createElement("canvas"); c.width = W * 2; c.height = H * 2;
      var p = c.getContext("2d"); p.scale(2, 2);
      (BGS[name] || BGS.mugen)(p);
      bgCache[name] = c;
    }
    g.drawImage(c, 0, 0, W, H);
    // ちょうちんの あかりが ゆらゆら
    var a = 0.06 + Math.sin(t * 1.7) * 0.03;
    var rg = g.createRadialGradient(W / 2, 150, 20, W / 2, 150, 380);
    rg.addColorStop(0, "rgba(255,180,90," + a + ")"); rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
  };

  /* ---------- らしん（アカザの あしもとの ゆきの けっしょう） ---------- */
  KB.drawRashin = function (g, x, y, t, a) {
    g.save(); g.translate(x, y); g.scale(1, 0.32); g.rotate(t * 0.4);
    g.globalAlpha = a; g.strokeStyle = "#7fd8ff"; g.shadowColor = "#7fd8ff"; g.shadowBlur = 10; g.lineWidth = 2.5;
    circ(g, 0, 0, 92, null, "#7fd8ff", 2);
    circ(g, 0, 0, 70, null, "rgba(127,216,255,.6)", 1.5);
    for (var i = 0; i < 12; i++) {
      var an = i * Math.PI / 6, L = i % 2 ? 60 : 88;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(an) * L, Math.sin(an) * L); g.stroke();
      var mx = Math.cos(an) * L * 0.6, my = Math.sin(an) * L * 0.6;
      g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + Math.cos(an + 0.6) * 14, my + Math.sin(an + 0.6) * 14);
      g.moveTo(mx, my); g.lineTo(mx + Math.cos(an - 0.6) * 14, my + Math.sin(an - 0.6) * 14); g.stroke();
    }
    g.restore();
  };

  /* ---------- エフェクト ----------
     fx: { type, x, y, tx, ty, t（いまの じかん）, life（ながさ） ... } */
  var FX = {
    // かたなの ひとふり
    slash: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.rotate(f.rot || -0.6);
      g.globalAlpha = 1 - k; g.strokeStyle = "#fff"; g.lineWidth = 4 * (1 - k) + 1; g.shadowColor = "#fff"; g.shadowBlur = 10;
      g.beginPath(); g.arc(0, 0, 40, -1.2, -1.2 + Math.min(1, k * 3) * 2.4); g.stroke(); g.restore();
    },
    // みずの こきゅう: あおい なみの ような きりあと
    water: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.rotate(f.rot || -0.5);
      var e = Math.min(1, k * 2.5);
      for (var i = 0; i < 3; i++) {
        g.globalAlpha = (1 - k) * (1 - i * 0.25);
        g.strokeStyle = i === 0 ? "#e8f6ff" : (i === 1 ? "#5ab4ff" : "#1f5fd0");
        g.lineWidth = 9 - i * 2.5; g.shadowColor = "#5ab4ff"; g.shadowBlur = 14;
        g.beginPath(); g.arc(0, 0, 46 + i * 9, -1.6, -1.6 + e * 3.2); g.stroke();
      }
      // なみの くるくる
      g.globalAlpha = (1 - k) * 0.9; g.strokeStyle = "#bfe4ff"; g.lineWidth = 2.5;
      for (var j = 0; j < 4; j++) {
        var a = -1.6 + e * 3.2 * (j + 1) / 4, r = 56;
        g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, 7, a, a + 4.5); g.stroke();
      }
      g.restore();
    },
    // ヒノカミかぐら: あかい ほのおの きりあと
    fire: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.rotate(f.rot || -0.5);
      var e = Math.min(1, k * 2.5);
      g.globalCompositeOperation = "lighter";
      for (var i = 0; i < 3; i++) {
        g.globalAlpha = (1 - k) * (1 - i * 0.2);
        g.strokeStyle = ["#fff2a8", "#ff9a2a", "#e0301e"][i]; g.lineWidth = 12 - i * 3; g.shadowColor = "#ff7a1a"; g.shadowBlur = 20;
        g.beginPath(); g.arc(0, 0, 44 + i * 10, -1.7, -1.7 + e * 3.4); g.stroke();
      }
      g.restore();
    },
    // こぶしの しょうげき（あおい わ＋ゆきの けっしょう）
    punch: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.globalAlpha = 1 - k;
      circ(g, 0, 0, 10 + k * (f.big ? 70 : 38), null, "#9fe4ff", 4 * (1 - k) + 1);
      g.strokeStyle = "#dff6ff"; g.lineWidth = 2;
      for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3 + 0.3, L = 8 + k * (f.big ? 60 : 30);
        g.beginPath(); g.moveTo(Math.cos(a) * L * 0.4, Math.sin(a) * L * 0.4); g.lineTo(Math.cos(a) * L, Math.sin(a) * L); g.stroke(); }
      g.restore();
    },
    // とおくから とんでくる こぶし（くうしき）
    airpunch: function (g, f, k) {
      var x = f.sx + (f.x - f.sx) * Math.min(1, k * 1.6), y = f.sy + (f.y - f.sy) * Math.min(1, k * 1.6);
      g.save(); g.globalAlpha = 1 - k * 0.6; g.globalCompositeOperation = "lighter";
      var rg = g.createRadialGradient(x, y, 2, x, y, 22); rg.addColorStop(0, "#fff"); rg.addColorStop(0.4, "#7fd8ff"); rg.addColorStop(1, "rgba(30,90,220,0)");
      g.fillStyle = rg; circ(g, x, y, 22, rg);
      g.strokeStyle = "rgba(127,216,255,.6)"; g.lineWidth = 6; g.beginPath(); g.moveTo(f.sx, f.sy); g.lineTo(x, y); g.stroke();
      g.restore();
    },
    // しゅうしき: あおい ひかりが がめんじゅうに ふる
    shuushiki: function (g, f, k) {
      g.save(); g.globalCompositeOperation = "lighter";
      for (var i = 0; i < 26; i++) {
        var seed = (i * 97) % 26 / 26, d = Math.min(1, k * 1.8 - seed * 0.5); if (d <= 0) continue;
        var x0 = 150 + seed * 60, y0 = 120 + ((i * 53) % 60), x1 = 420 + ((i * 31) % 180), y1 = 150 + ((i * 71) % 150);
        var x = x0 + (x1 - x0) * d, y = y0 + (y1 - y0) * d;
        g.globalAlpha = (1 - k) * 0.9; g.strokeStyle = i % 3 ? "#7fd8ff" : "#e0f6ff"; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x - (x1 - x0) * 0.12, y - (y1 - y0) * 0.12); g.lineTo(x, y); g.stroke();
        circ(g, x, y, 3, "#fff");
      }
      g.restore();
    },
    // かいふく: みどりの きらきら
    heal: function (g, f, k) {
      g.save(); g.globalCompositeOperation = "lighter";
      for (var i = 0; i < 10; i++) {
        var a = i * 0.63, x = f.x + Math.cos(a + k * 3) * 22, y = f.y - k * 60 - (i % 3) * 10;
        g.globalAlpha = (1 - k); circ(g, x, y, 3.5, i % 2 ? "#9dffb0" : "#e8ffe8");
      }
      g.restore();
    },
    // こきゅうが もどる: あおい きらきら
    mp: function (g, f, k) {
      g.save(); g.globalCompositeOperation = "lighter";
      for (var i = 0; i < 10; i++) {
        var a = i * 0.63, x = f.x + Math.cos(a - k * 3) * 22, y = f.y - k * 60 - (i % 3) * 10;
        g.globalAlpha = (1 - k); circ(g, x, y, 3.5, i % 2 ? "#9dd4ff" : "#e8f4ff");
      }
      g.restore();
    },
    // すきとおる せかい
    clear: function (g, f, k) {
      g.save(); g.globalAlpha = (1 - k) * 0.8; g.strokeStyle = "#e8fbff"; g.lineWidth = 2;
      for (var i = 0; i < 3; i++) circ(g, f.x, f.y, 10 + ((k * 90 + i * 30) % 90), null, "#e8fbff", 2);
      g.restore();
    },
    // なぎ: しずかな みずの わ
    nagi: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.scale(1, 0.3);
      for (var i = 0; i < 4; i++) { var r = ((k * 160) + i * 40) % 160; g.globalAlpha = (1 - r / 160) * (1 - k * 0.5);
        circ(g, 0, 0, r, null, "#bfe4ff", 3); }
      g.restore();
    },
    // ひかりの つぶ（アカザが きえるとき）
    light: function (g, f, k) {
      g.save(); g.globalCompositeOperation = "lighter";
      for (var i = 0; i < 30; i++) {
        var sx = f.x + ((i * 37) % 60) - 30, sy = f.y - ((i * 53) % 110);
        var y = sy - k * (40 + (i % 5) * 20), x = sx + Math.sin(k * 6 + i) * 8;
        g.globalAlpha = (1 - k) * (0.5 + (i % 3) * 0.2); circ(g, x, y, 2 + (i % 3), i % 4 ? "#ffe6f2" : "#bfe8ff");
      }
      g.restore();
    }
  };
  KB.drawFx = function (g, f) {
    var k = Math.max(0, Math.min(1, f.t / f.life));
    if (FX[f.type]) FX[f.type](g, f, k);
  };
})(window);
