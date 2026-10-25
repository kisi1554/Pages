/* ============================================================
   きめつバトル — はいけい・わざの エフェクト・カットイン（Canvas に コードで かく）
   - BGS … はいけい。あたらしい ばしょは ここに 1つ たす
   - FX  … わざの エフェクト（k = すすみぐあい 0〜1）。data.js の わざの anim から つかう
   - drawParts … みずしぶき・ひのこ・ゆきの けっしょう などの つぶ
   - drawCutin … ひっさつわざの カットイン（かおの アップ＋わざの なまえ）
   キャラの え は chars.js
   ============================================================ */
(function (root) {
  "use strict";
  var KB = root.KB = root.KB || {};
  var W = 640, H = 360, PI = Math.PI;
  KB.W = W; KB.H = H;

  function circ(g, x, y, r, fill, stroke, lw) {
    g.beginPath(); g.arc(x, y, r, 0, PI * 2);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1.5; g.stroke(); }
  }
  function ease(k) { return 1 - Math.pow(1 - k, 3); }
  function fade(k, a, b) { return k < a ? k / a : (k > b ? Math.max(0, (1 - k) / (1 - b)) : 1); }

  /* ---------- はいけい ---------- */
  var bgCache = {};
  var BGS = {
    // どうまの へや: こおりの はすが さく いけ（つめたい あおい ひかり）
    lotus: function (g) {
      var sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#050a16"); sky.addColorStop(0.5, "#0e1c34"); sky.addColorStop(1, "#08101e");
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // おくの しょうじ（あおじろく ひかる）
      for (var r = 0; r < 2; r++) for (var i = 0; i < 9; i++) {
        var x = i * 76 - 20 + r * 38, y = 40 + r * 70, w = 60, h = 50 - r * 6;
        g.fillStyle = "#162238"; g.fillRect(x - 3, y - 3, w + 6, h + 6);
        var lg = g.createLinearGradient(0, y, 0, y + h); lg.addColorStop(0, "rgba(190,225,255,.55)"); lg.addColorStop(1, "rgba(110,160,220,.35)");
        g.fillStyle = lg; g.fillRect(x, y, w, h);
        g.strokeStyle = "rgba(20,40,70,.8)"; g.lineWidth = 1;
        for (var k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x, y + h * k / 4); g.lineTo(x + w, y + h * k / 4); g.stroke(); g.beginPath(); g.moveTo(x + w * k / 4, y); g.lineTo(x + w * k / 4, y + h); g.stroke(); }
      }
      // いけ（みずめん＋こおり）
      var fy = 200;
      var wg = g.createLinearGradient(0, fy, 0, H); wg.addColorStop(0, "#1a3458"); wg.addColorStop(1, "#2e5a88");
      g.fillStyle = wg; g.fillRect(0, fy, W, H - fy);
      g.strokeStyle = "rgba(200,235,255,.25)"; g.lineWidth = 1;
      for (var j = 0; j < 14; j++) { var yy = fy + 6 + Math.pow(j / 14, 1.5) * (H - fy); g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(W * 0.3, yy - 3, W * 0.6, yy + 3, W, yy); g.stroke(); }
      // はすの は と こおりの はす
      function pad(x, y, s) {
        g.save(); g.translate(x, y); g.scale(1, 0.35);
        g.fillStyle = "#2a6a5a"; g.beginPath(); g.arc(0, 0, 22 * s, 0.3, PI * 2 - 0.1); g.lineTo(0, 0); g.fill();
        g.strokeStyle = "rgba(160,230,200,.4)"; g.lineWidth = 1.2; g.stroke(); g.restore();
      }
      function lotus(x, y, s) {
        g.save(); g.translate(x, y); g.scale(s, s);
        for (var i = 0; i < 7; i++) { g.save(); g.rotate((i - 3) * 0.32);
          var lg2 = g.createLinearGradient(0, 0, 0, -26); lg2.addColorStop(0, "rgba(140,200,255,.9)"); lg2.addColorStop(1, "rgba(245,252,255,.95)");
          g.fillStyle = lg2; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-8, -14, 0, -26); g.quadraticCurveTo(8, -14, 0, 0); g.fill(); g.restore(); }
        g.restore();
      }
      [[40, 238, 1], [120, 300, 1.3], [250, 228, 0.8], [330, 340, 1.4], [440, 232, 0.9], [610, 262, 1.2], [560, 345, 1.1], [190, 350, 1]].forEach(function (p) { pad(p[0], p[1], p[2]); });
      [[70, 236, 0.8], [300, 226, 0.7], [600, 255, 0.9], [150, 296, 1], [520, 228, 0.6]].forEach(function (p) { lotus(p[0], p[1], p[2]); });
      // こおりの はしら
      g.fillStyle = "rgba(200,235,255,.35)";
      [[10, 0, 30], [600, 0, 40], [300, 0, 18]].forEach(function (c) { g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0] + c[2], c[1]); g.lineTo(c[0] + c[2] / 2, 60 + c[2] * 2); g.closePath(); g.fill(); });
    },
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

  /* ---------- エフェクトの どうぐ ---------- */
  // さきが ほそい みかづき（R: はんけい、Wd: ふとさ、a0→a1 の とちゅう p まで）
  function crescent(g, R, Wd, a0, a1, p, tail) {
    var n = 28, aE = a0 + (a1 - a0) * p, aS = a0 + (a1 - a0) * Math.max(0, p - (tail || 1));
    g.beginPath();
    for (var i = 0; i <= n; i++) { var u = i / n, a = aS + (aE - aS) * u, w = Wd * Math.sin(PI * Math.min(1, u * 1.15)) + 0.5; g.lineTo(Math.cos(a) * (R + w / 2), Math.sin(a) * (R + w / 2)); }
    for (var j = n; j >= 0; j--) { var u2 = j / n, a2 = aS + (aE - aS) * u2, w2 = Wd * Math.sin(PI * Math.min(1, u2 * 1.15)) + 0.5; g.lineTo(Math.cos(a2) * (R - w2 / 2), Math.sin(a2) * (R - w2 / 2)); }
    g.closePath();
  }
  // みずの みかづき（あお→しろ の かさね＋なみの しぶき）
  function waterArc(g, R, Wd, a0, a1, p, alpha) {
    g.save(); g.globalAlpha = alpha;
    g.shadowColor = "#4aa8ff"; g.shadowBlur = 18;
    crescent(g, R, Wd * 1.25, a0, a1, p); g.fillStyle = "rgba(20,70,200,.75)"; g.fill();
    g.shadowBlur = 0;
    crescent(g, R + Wd * 0.1, Wd * 0.85, a0, a1, p); g.fillStyle = "#4fb0ff"; g.fill();
    crescent(g, R + Wd * 0.2, Wd * 0.4, a0, a1, p); g.fillStyle = "#e9f8ff"; g.fill();
    // うきよえ ふうの なみがしら（くるっと まく しぶき）
    g.strokeStyle = "#f2fbff"; g.lineWidth = 2; g.fillStyle = "#f2fbff";
    var aE = a0 + (a1 - a0) * p;
    for (var i = 1; i <= 6; i++) {
      var a = a0 + (aE - a0) * (i / 6.5), r = R + Wd * 0.55, x = Math.cos(a) * r, y = Math.sin(a) * r, s = 4 + Wd * 0.18;
      g.beginPath(); g.arc(x, y, s, a + 1.2, a + 5.2); g.stroke();
      circ(g, x + Math.cos(a) * s * 0.9, y + Math.sin(a) * s * 0.9, 1.6, "#fff");
    }
    g.restore();
  }
  // ほのおの みかづき（き→オレンジ→あか、そとがわに ほのおの した）
  function fireArc(g, R, Wd, a0, a1, p, alpha, t) {
    g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = "lighter";
    g.shadowColor = "#ff5a1a"; g.shadowBlur = 24;
    crescent(g, R, Wd * 1.35, a0, a1, p); g.fillStyle = "rgba(200,30,10,.8)"; g.fill();
    g.shadowBlur = 0;
    crescent(g, R + Wd * 0.1, Wd * 0.9, a0, a1, p); g.fillStyle = "#ff8a1e"; g.fill();
    crescent(g, R + Wd * 0.2, Wd * 0.45, a0, a1, p); g.fillStyle = "#fff3b0"; g.fill();
    var aE = a0 + (a1 - a0) * p;
    g.fillStyle = "rgba(255,120,30,.85)";
    for (var i = 0; i < 14; i++) {
      var a = a0 + (aE - a0) * (i / 14), r = R + Wd * 0.5, fl = 8 + Wd * 0.4 * (0.6 + 0.4 * Math.sin(t * 20 + i * 1.7));
      var x = Math.cos(a) * r, y = Math.sin(a) * r, nx = Math.cos(a - 0.35), ny = Math.sin(a - 0.35);
      g.beginPath(); g.moveTo(x - Math.sin(a) * 4, y + Math.cos(a) * 4); g.quadraticCurveTo(x + nx * fl * 0.6, y + ny * fl * 0.6, x + nx * fl, y + ny * fl);
      g.quadraticCurveTo(x + nx * fl * 0.3, y + ny * fl * 0.3, x + Math.sin(a) * 4, y - Math.cos(a) * 4); g.fill();
    }
    g.restore();
  }
  // ゆきの けっしょう（アカザの はかいさつ）
  function snowflake(g, r, lw, col) {
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = "round";
    for (var i = 0; i < 6; i++) {
      var a = i * PI / 3, c = Math.cos(a), s = Math.sin(a);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(c * r, s * r);
      for (var k = 1; k <= 2; k++) {
        var m = r * (0.35 + k * 0.22), b = r * 0.22;
        g.moveTo(c * m, s * m); g.lineTo(c * m + Math.cos(a + 0.7) * b, s * m + Math.sin(a + 0.7) * b);
        g.moveTo(c * m, s * m); g.lineTo(c * m + Math.cos(a - 0.7) * b, s * m + Math.sin(a - 0.7) * b);
      }
      g.stroke();
    }
    g.beginPath(); for (var j = 0; j < 6; j++) { var aa = j * PI / 3 + PI / 6; g.lineTo(Math.cos(aa) * r * 0.25, Math.sin(aa) * r * 0.25); } g.closePath(); g.stroke();
  }
  KB.snowflake = snowflake;
  // ちょう（はばたく）
  function drawButterfly(g, x, y, s, ph, col, a) {
    var fl = Math.abs(Math.sin(ph)) * 0.8 + 0.2;
    g.save(); g.translate(x, y); g.globalAlpha = a;
    g.fillStyle = col; g.strokeStyle = "rgba(40,10,60,.6)"; g.lineWidth = 0.6;
    g.beginPath(); g.ellipse(-s * 0.55 * fl, -s * 0.3, s * 0.6 * fl, s * 0.5, -0.4, 0, PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(s * 0.55 * fl, -s * 0.3, s * 0.6 * fl, s * 0.5, 0.4, 0, PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(-s * 0.4 * fl, s * 0.35, s * 0.4 * fl, s * 0.32, 0.4, 0, PI * 2); g.fill();
    g.beginPath(); g.ellipse(s * 0.4 * fl, s * 0.35, s * 0.4 * fl, s * 0.32, -0.4, 0, PI * 2); g.fill();
    g.fillStyle = "#1a0a20"; g.fillRect(-0.6, -s * 0.6, 1.2, s * 1.2);
    g.restore();
  }
  function shockRing(g, x, y, r, w, col, alpha, flat) {
    g.save(); g.translate(x, y); if (flat) g.scale(1, flat);
    g.globalAlpha = alpha; g.strokeStyle = col; g.lineWidth = w; g.shadowColor = col; g.shadowBlur = 12;
    g.beginPath(); g.arc(0, 0, r, 0, PI * 2); g.stroke(); g.restore();
  }

  /* ---------- エフェクト ----------
     f: { type, x, y, t, life, rot, sx, sy, ... }  k = t / life */
  var FX = {
    // ふつうの ひとふり
    slash: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.rotate(f.rot || -0.6); g.globalCompositeOperation = "lighter";
      g.shadowColor = "#fff"; g.shadowBlur = 14;
      crescent(g, 46, 9, -1.4, 1.4, Math.min(1, ease(k * 2.2)), 0.9); g.fillStyle = "rgba(255,255,255," + (1 - k) + ")"; g.fill();
      g.restore();
    },
    // みずの こきゅう（きほんの みかづき）
    water: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.rotate(f.rot || -0.5);
      waterArc(g, f.r || 70, f.w || 26, -1.7, 1.7, Math.min(1, ease(k * 2)), fade(k, 0.05, 0.6));
      g.restore();
    },
    // いちのかた みなもぎり: すいめんを よこに まっぷたつ
    minamo: function (g, f, k) {
      var p = ease(Math.min(1, k * 2.2)), a = fade(k, 0.02, 0.6);
      g.save(); g.translate(f.x, f.y); g.globalAlpha = a;
      var L = 420 * p, x0 = -210;
      // みずの やいば（ぶあつい よこの みかづき）
      g.shadowColor = "#4aa8ff"; g.shadowBlur = 26;
      [[22, "rgba(20,70,200,.8)"], [13, "#4fb0ff"], [5, "#f2fbff"]].forEach(function (l) {
        g.fillStyle = l[1]; g.beginPath(); g.moveTo(x0, 0);
        g.quadraticCurveTo(x0 + L * 0.5, -l[0] * 1.4, x0 + L, -2); g.quadraticCurveTo(x0 + L * 0.5, l[0], x0, 0); g.fill();
      });
      g.shadowBlur = 0;
      // たちあがる なみ（うきよえ ふうの なみがしら）
      for (var i = 0; i < 9; i++) {
        var x = x0 + 20 + i * 46; if (x > x0 + L) break;
        var hgt = (26 + (i % 3) * 10) * Math.min(1, (x0 + L - x) / 80);
        g.fillStyle = "rgba(60,150,255,.75)"; g.beginPath(); g.moveTo(x - 18, 4); g.quadraticCurveTo(x - 6, -hgt, x + 14, -hgt * 0.8); g.quadraticCurveTo(x + 2, -hgt * 0.5, x + 18, 4); g.fill();
        g.strokeStyle = "#f2fbff"; g.lineWidth = 2.5; g.beginPath(); g.arc(x + 9, -hgt * 0.75, 6, 0.3, 4.6); g.stroke();
        circ(g, x + 15, -hgt * 0.85, 2, "#fff");
      }
      g.restore();
    },
    // にのかた みずぐるま: たてに ぐるりと いっしゅう
    wheel: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.rotate(-PI / 2);
      waterArc(g, 88, 32, 0, PI * 2, Math.min(1, ease(k * 1.6)), fade(k, 0.02, 0.65));
      g.restore();
    },
    // ろくのかた ねじれうず: うずまき
    vortex: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.scale(1, 0.75);
      var a = fade(k, 0.05, 0.7);
      for (var i = 0; i < 4; i++) {
        g.save(); g.rotate(k * 9 + i * PI / 2);
        waterArc(g, 36 + i * 22, 20 - i * 2, 0, PI * 1.2, 1, a * (1 - i * 0.12));
        g.restore();
      }
      g.restore();
    },
    // さんのかた りゅうりゅうまい: みずの りゅうが ながれる ように
    dragon: function (g, f, k) {
      var p = ease(Math.min(1, k * 1.5)), a = fade(k, 0.02, 0.7);
      var sx = f.sx, sy = f.sy, ex = f.x, ey = f.y, n = 40, pts = [];
      for (var i = 0; i <= n * p; i++) {
        var u = i / n, x = sx + (ex - sx) * u, y = sy + (ey - sy) * u + Math.sin(u * PI * 3 + k * 6) * 34 * (1 - u * 0.4) - Math.sin(u * PI) * 50;
        pts.push([x, y]);
      }
      if (pts.length < 2) return;
      g.save(); g.globalAlpha = a; g.lineCap = "round"; g.lineJoin = "round";
      [[26, "rgba(20,70,200,.7)"], [17, "#4fb0ff"], [7, "#e9f8ff"]].forEach(function (s, si) {
        g.shadowColor = "#4aa8ff"; g.shadowBlur = si ? 0 : 18;
        for (var j = 1; j < pts.length; j++) { var w = s[0] * (0.35 + 0.65 * (j / pts.length)); g.lineWidth = w; g.strokeStyle = s[1]; g.beginPath(); g.moveTo(pts[j - 1][0], pts[j - 1][1]); g.lineTo(pts[j][0], pts[j][1]); g.stroke(); }
      });
      // あたま（つの・め）
      var h = pts[pts.length - 1], q = pts[pts.length - 2], an = Math.atan2(h[1] - q[1], h[0] - q[0]);
      g.translate(h[0], h[1]); g.rotate(an);
      g.fillStyle = "#6ac0ff"; g.beginPath(); g.moveTo(22, 0); g.lineTo(-6, -14); g.lineTo(-2, 0); g.lineTo(-6, 14); g.closePath(); g.fill();
      g.strokeStyle = "#e9f8ff"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-2, -8); g.quadraticCurveTo(-14, -20, -24, -16); g.moveTo(-2, 8); g.quadraticCurveTo(-14, 20, -24, 16); g.stroke();
      circ(g, 6, -5, 2.6, "#fff"); circ(g, 6, -5, 1.2, "#0a2a80");
      g.restore();
    },
    // はちのかた たきつぼ: うえから たきの ように たたきつける
    waterfall: function (g, f, k) {
      var p = ease(Math.min(1, k * 2.2)), a = fade(k, 0.02, 0.6), bottom = f.y + 60, top = -10, y = top + (bottom - top) * p;
      g.save(); g.globalAlpha = a;
      var gr = g.createLinearGradient(f.x - 56, 0, f.x + 56, 0);
      gr.addColorStop(0, "rgba(20,70,200,0)"); gr.addColorStop(0.2, "rgba(40,120,240,.85)"); gr.addColorStop(0.5, "#e9f8ff"); gr.addColorStop(0.8, "rgba(40,120,240,.85)"); gr.addColorStop(1, "rgba(20,70,200,0)");
      g.shadowColor = "#4aa8ff"; g.shadowBlur = 22;
      g.fillStyle = gr; g.fillRect(f.x - 56, top, 112, y - top);
      g.shadowBlur = 0; g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 2;
      for (var i = 0; i < 9; i++) { var xx = f.x - 32 + i * 8, off = (k * 900 + i * 37) % 60; for (var yy = top - 60 + off; yy < y; yy += 60) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, Math.min(y, yy + 30)); g.stroke(); } }
      if (p >= 1) { // たきつぼの しぶき
        var kk = (k - 0.45) / 0.55;
        shockRing(g, f.x, bottom, 30 + kk * 110, 6 * (1 - kk) + 1, "#bfe4ff", 1 - kk, 0.3);
        shockRing(g, f.x, bottom, 15 + kk * 70, 4 * (1 - kk) + 1, "#fff", 1 - kk, 0.3);
      }
      g.restore();
    },
    // ヒノカミかぐら（きほんの ほのおの みかづき）
    fire: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.rotate(f.rot || -0.5);
      fireArc(g, f.r || 70, f.w || 28, -1.8, 1.8, Math.min(1, ease(k * 2)), fade(k, 0.05, 0.6), k);
      g.restore();
    },
    // えんぶ: あたまの うえから おおきな ほのおの まるい きりあと
    enbu: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.rotate(-PI / 2 - 0.3);
      fireArc(g, 100, 40, -1.2, 2.6, Math.min(1, ease(k * 1.8)), fade(k, 0.03, 0.62), k);
      g.restore();
    },
    // へきらのてん: ほのおの わが ぐるぐる
    firering: function (g, f, k) {
      g.save(); g.translate(f.x, f.y);
      var a = fade(k, 0.03, 0.7);
      for (var i = 0; i < 2; i++) { g.save(); g.scale(1, i ? 0.35 : 1); g.rotate(k * 10 + i * 1.5); fireArc(g, 84 - i * 8, 30, 0, PI * 1.7, 1, a, k + i); g.restore(); }
      g.restore();
    },
    // れつじつこうきょう: うしろに おおきな たいよう
    sun: function (g, f, k) {
      var a = fade(k, 0.12, 0.7) * 0.6, r = 60 + ease(Math.min(1, k * 2)) * 50;
      g.save(); g.translate(f.x, f.y); g.globalAlpha = a; g.globalCompositeOperation = "lighter";
      var rg = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.6);
      rg.addColorStop(0, "rgba(255,250,210,1)"); rg.addColorStop(0.35, "rgba(255,170,40,.9)"); rg.addColorStop(0.6, "rgba(230,50,20,.6)"); rg.addColorStop(1, "rgba(120,0,0,0)");
      circ(g, 0, 0, r * 1.6, rg);
      g.rotate(k * 1.5); g.strokeStyle = "rgba(255,220,120,.7)"; g.lineWidth = 3;
      for (var i = 0; i < 16; i++) { var an = i * PI / 8; g.beginPath(); g.moveTo(Math.cos(an) * r * 1.05, Math.sin(an) * r * 1.05); g.lineTo(Math.cos(an) * r * 1.9, Math.sin(an) * r * 1.9); g.stroke(); }
      circ(g, 0, 0, r, null, "rgba(255,255,220,.9)", 4);
      g.restore();
    },
    // ばってんに きる（ひっさつの しめ）
    cross: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.globalCompositeOperation = "lighter";
      var p = ease(Math.min(1, k * 3)), a = fade(k, 0.02, 0.5), L = 150 * p;
      [0.75, -0.75].forEach(function (r, i) {
        g.save(); g.rotate(r + PI / 2); g.globalAlpha = a;
        g.shadowColor = f.col || "#ff7a1a"; g.shadowBlur = 26;
        g.fillStyle = f.col || "#ffb040"; g.beginPath(); g.moveTo(-L, 0); g.lineTo(0, -9); g.lineTo(L, 0); g.lineTo(0, 9); g.closePath(); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.moveTo(-L, 0); g.lineTo(0, -3); g.lineTo(L, 0); g.lineTo(0, 3); g.closePath(); g.fill();
        g.restore(); void i;
      });
      g.restore();
    },
    // こぶしの しょうげき（ゆきの けっしょう＋あおい わ）
    punch: function (g, f, k) {
      var big = f.big ? 2.2 : 1.35, a = 1 - k;
      g.save(); g.translate(f.x, f.y); g.globalCompositeOperation = "lighter";
      shockRing(g, 0, 0, (12 + ease(k) * 44) * big, 5 * a + 1, "#8fdcff", a);
      g.globalAlpha = a; g.shadowColor = "#7fd8ff"; g.shadowBlur = 14; g.rotate(f.rot || 0);
      snowflake(g, (10 + ease(k) * 30) * big, 2.6, "#e6f8ff");
      g.restore();
    },
    // くうしき: とおくから とんでくる こぶしの かたまり
    airpunch: function (g, f, k) {
      var u = Math.min(1, k * 1.5), x = f.sx + (f.x - f.sx) * u, y = f.sy + (f.y - f.sy) * u;
      g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = 1 - Math.max(0, (k - 0.66) * 3);
      var tr = g.createLinearGradient(f.sx, f.sy, x, y); tr.addColorStop(0, "rgba(60,140,255,0)"); tr.addColorStop(1, "rgba(160,225,255,.8)");
      g.strokeStyle = tr; g.lineWidth = 16; g.lineCap = "round"; g.beginPath(); g.moveTo(f.sx + (x - f.sx) * 0.4, f.sy + (y - f.sy) * 0.4); g.lineTo(x, y); g.stroke();
      var rg = g.createRadialGradient(x, y, 2, x, y, 26); rg.addColorStop(0, "#fff"); rg.addColorStop(0.4, "#8fdcff"); rg.addColorStop(1, "rgba(30,90,220,0)");
      circ(g, x, y, 26, rg);
      g.translate(x, y); g.rotate(k * 8); snowflake(g, 14, 2, "#fff");
      g.restore();
    },
    // かむろさきわり: したから うえへ あおい ひかりの はしら
    pillar: function (g, f, k) {
      var a = fade(k, 0.02, 0.6), w = 30 * (1 - k * 0.6);
      g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = a;
      var gr = g.createLinearGradient(f.x - w, 0, f.x + w, 0); gr.addColorStop(0, "rgba(40,120,255,0)"); gr.addColorStop(0.5, "rgba(220,245,255,1)"); gr.addColorStop(1, "rgba(40,120,255,0)");
      g.fillStyle = gr; g.fillRect(f.x - w, f.y - 400 * ease(Math.min(1, k * 2.5)), w * 2, 400 * ease(Math.min(1, k * 2.5)) + 20);
      shockRing(g, f.x, f.y + 20, 20 + k * 90, 4, "#8fdcff", a, 0.3);
      g.restore();
    },
    // めっしき: ばくはつ する ゆきの けっしょう
    bigburst: function (g, f, k) {
      var a = 1 - k;
      g.save(); g.translate(f.x, f.y); g.globalCompositeOperation = "lighter";
      var rg = g.createRadialGradient(0, 0, 4, 0, 0, 40 + k * 130); rg.addColorStop(0, "rgba(255,255,255," + a + ")"); rg.addColorStop(0.3, "rgba(140,220,255," + a * 0.8 + ")"); rg.addColorStop(1, "rgba(30,80,220,0)");
      circ(g, 0, 0, 40 + k * 130, rg);
      for (var i = 0; i < 3; i++) shockRing(g, 0, 0, 20 + ease(k) * (80 + i * 50), 6 * a + 1, i % 2 ? "#fff" : "#8fdcff", a);
      g.globalAlpha = a; g.rotate(k * 2); g.shadowColor = "#7fd8ff"; g.shadowBlur = 18;
      snowflake(g, 30 + ease(k) * 70, 4, "#e6f8ff");
      g.restore();
    },
    // しゅうしき あおぎんらんざんこう: あおい ひかりの すじが がめんじゅうに ふりそそぐ
    shuushiki: function (g, f, k) {
      g.save(); g.globalCompositeOperation = "lighter";
      for (var i = 0; i < 60; i++) {
        var seed = ((i * 97) % 60) / 60, d = Math.min(1, k * 2.2 - seed * 0.9); if (d <= 0 || d >= 1) continue;
        var x0 = 120 + ((i * 41) % 120), y0 = 60 + ((i * 53) % 200), x1 = 400 + ((i * 31) % 230), y1 = 120 + ((i * 71) % 220);
        var x = x0 + (x1 - x0) * d, y = y0 + (y1 - y0) * d;
        g.globalAlpha = 0.9 * (1 - d * 0.5); g.strokeStyle = i % 3 ? "#7fd8ff" : "#ffffff"; g.lineWidth = i % 4 ? 3 : 5;
        g.shadowColor = "#7fd8ff"; g.shadowBlur = 10;
        g.beginPath(); g.moveTo(x - (x1 - x0) * 0.18, y - (y1 - y0) * 0.18); g.lineTo(x, y); g.stroke();
        if (i % 5 === 0) { g.save(); g.translate(x, y); g.rotate(d * 6); snowflake(g, 8, 1.5, "#fff"); g.restore(); }
      }
      g.restore();
    },
    // ちからを ためる: あおい オーラが とげとげ
    aura: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.globalCompositeOperation = "lighter";
      var a = fade(k, 0.1, 0.8);
      for (var i = 0; i < 18; i++) {
        var an = -PI / 2 + (i - 9) * 0.13 + Math.sin(k * 30 + i) * 0.05, L = 60 + Math.sin(k * 40 + i * 2) * 25 + (i % 3) * 15;
        g.globalAlpha = a * 0.7; g.strokeStyle = i % 2 ? "#7fd8ff" : "#e6f8ff"; g.lineWidth = 3;
        g.beginPath(); g.moveTo(Math.cos(an) * 10, 10); g.lineTo(Math.cos(an) * L * 0.6, Math.sin(an) * L); g.stroke();
      }
      g.restore();
    },
    // じめんを はしる わ
    shock: function (g, f, k) { shockRing(g, f.x, f.y, 10 + ease(k) * (f.r || 120), 5 * (1 - k) + 1, f.col || "#fff", 1 - k, 0.3); },
    // かいふく: みどりの きらきら
    heal: function (g, f, k) {
      g.save(); g.globalCompositeOperation = "lighter";
      shockRing(g, f.x, f.y + 30, 10 + k * 40, 3, "#9dffb0", 1 - k, 0.3);
      for (var i = 0; i < 14; i++) { var a = i * 0.45, x = f.x + Math.cos(a + k * 3) * 22, y = f.y + 20 - k * 70 - (i % 4) * 10; g.globalAlpha = 1 - k; circ(g, x, y, 3, i % 2 ? "#9dffb0" : "#e8ffe8"); }
      g.restore();
    },
    mp: function (g, f, k) {
      g.save(); g.globalCompositeOperation = "lighter";
      shockRing(g, f.x, f.y + 30, 10 + k * 40, 3, "#9dd4ff", 1 - k, 0.3);
      for (var i = 0; i < 14; i++) { var a = i * 0.45, x = f.x + Math.cos(a - k * 3) * 22, y = f.y + 20 - k * 70 - (i % 4) * 10; g.globalAlpha = 1 - k; circ(g, x, y, 3, i % 2 ? "#9dd4ff" : "#e8f4ff"); }
      g.restore();
    },
    // すきとおる せかい: すきとおった わと ほそい せん
    clear: function (g, f, k) {
      g.save(); g.globalAlpha = fade(k, 0.1, 0.7);
      for (var i = 0; i < 4; i++) circ(g, f.x, f.y, 10 + ((k * 160 + i * 40) % 160), null, "#e8fbff", 1.5);
      g.strokeStyle = "rgba(230,250,255,.6)"; g.lineWidth = 1;
      for (var j = 0; j < 12; j++) { var an = j * PI / 6 + k; g.beginPath(); g.moveTo(f.x + Math.cos(an) * 20, f.y + Math.sin(an) * 20); g.lineTo(f.x + Math.cos(an) * 220, f.y + Math.sin(an) * 220); g.stroke(); }
      g.restore();
    },
    // なぎ: しずかな みずめんの わが ひろがる
    nagi: function (g, f, k) {
      var a0 = fade(k, 0.05, 0.8);
      g.save(); g.translate(f.x, f.y);
      g.save(); g.scale(1, 0.26);
      var rg = g.createRadialGradient(0, 0, 10, 0, 0, 340); rg.addColorStop(0, "rgba(160,215,255," + 0.45 * a0 + ")"); rg.addColorStop(1, "rgba(60,120,220,0)");
      circ(g, 0, 0, 340, rg);
      for (var i = 0; i < 6; i++) { var r = ((k * 420) + i * 70) % 420; g.globalAlpha = (1 - r / 420) * a0; circ(g, 0, 0, r, null, "#e8f6ff", 4); }
      g.restore();
      // すいめんの きらめき
      g.globalCompositeOperation = "lighter";
      for (var j = 0; j < 26; j++) {
        var sx = ((j * 73) % 360) - 180, sy = ((j * 37) % 50) - 25, w = 10 + (j % 4) * 6;
        g.globalAlpha = a0 * (0.4 + 0.6 * Math.abs(Math.sin(k * 8 + j)));
        g.fillStyle = "#e8f6ff"; g.fillRect(sx, sy, w, 1.6);
      }
      g.restore();
    },
    /* ----- むしのこきゅう（しのぶ） ----- */
    // ちょうのまい たわむれ: ちょうが まいながら つく
    butterfly: function (g, f, k) {
      g.save(); g.globalCompositeOperation = "lighter";
      for (var i = 0; i < 7; i++) {
        var u = Math.min(1, k * 1.6 - i * 0.06); if (u <= 0) continue;
        var x = f.x + Math.cos(i * 0.9 + k * 6) * (60 - u * 40), y = f.y + Math.sin(i * 1.3 + k * 5) * 40 - u * 20;
        drawButterfly(g, x, y, 9 + (i % 3) * 3, k * 30 + i, i % 2 ? "#b080f0" : "#7ad0b8", (1 - k) * 0.95);
      }
      g.restore();
    },
    // はちばのまい まなこい: とおくから いっしゅんで つきさす ひかりの せん
    sting: function (g, f, k) {
      var p = ease(Math.min(1, k * 3)), a = fade(k, 0.02, 0.5), sx = (f.sx || f.x + 200);
      g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = a;
      g.shadowColor = "#c070ff"; g.shadowBlur = 20;
      g.strokeStyle = "#e0c0ff"; g.lineWidth = 6; g.beginPath(); g.moveTo(sx, f.y); g.lineTo(sx + (f.x - sx) * p, f.y); g.stroke();
      g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke();
      if (p >= 1) { var kk = (k - 0.33) / 0.67; g.translate(f.x, f.y); for (var i = 0; i < 8; i++) { g.rotate(PI / 4); g.fillStyle = i % 2 ? "#c070ff" : "#fff"; g.beginPath(); g.moveTo(0, -2); g.lineTo(26 + kk * 40, 0); g.lineTo(0, 2); g.fill(); } }
      g.restore();
    },
    // つく（ちいさな ひかりの はり）
    stab: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.rotate(f.rot || 0); g.globalCompositeOperation = "lighter"; g.globalAlpha = 1 - k;
      g.shadowColor = "#c070ff"; g.shadowBlur = 14; g.fillStyle = "#f0e0ff";
      var L = 30 + k * 50; g.beginPath(); g.moveTo(-L, 0); g.lineTo(0, -3); g.lineTo(L * 0.3, 0); g.lineTo(0, 3); g.closePath(); g.fill();
      circ(g, 0, 0, 4 + k * 12, null, "#c070ff", 2);
      g.restore();
    },
    // せいれいのまい ふくがんろっかく: とんぼの めの ような ろっかくけい
    hexagon: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.globalCompositeOperation = "lighter";
      var a = fade(k, 0.05, 0.7);
      for (var j = 0; j < 7; j++) {
        var cx = j ? Math.cos(j * PI / 3) * 34 : 0, cy = j ? Math.sin(j * PI / 3) * 34 : 0, show = Math.min(1, k * 4 - j * 0.3); if (show <= 0) continue;
        g.globalAlpha = a * show; g.strokeStyle = j % 2 ? "#c090ff" : "#7ad0b8"; g.lineWidth = 2.5; g.shadowColor = "#c070ff"; g.shadowBlur = 12;
        g.beginPath(); for (var i = 0; i < 6; i++) { var an = i * PI / 3 + PI / 6; g.lineTo(cx + Math.cos(an) * 19, cy + Math.sin(an) * 19); } g.closePath(); g.stroke();
        g.fillStyle = "rgba(200,150,255,.18)"; g.fill();
      }
      g.restore();
    },
    // どくが ひろがる（むらさきの はなが ひらく）
    poisonBloom: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.globalCompositeOperation = "lighter"; g.globalAlpha = 1 - k;
      var rg = g.createRadialGradient(0, 0, 4, 0, 0, 30 + k * 70); rg.addColorStop(0, "rgba(230,200,255,.9)"); rg.addColorStop(0.5, "rgba(160,80,220,.5)"); rg.addColorStop(1, "rgba(80,20,140,0)");
      circ(g, 0, 0, 30 + k * 70, rg);
      for (var i = 0; i < 6; i++) { g.save(); g.rotate(i * PI / 3 + k); g.fillStyle = "rgba(200,140,255,.6)"; g.beginPath(); g.ellipse(18 + k * 30, 0, 14 + k * 10, 6, 0, 0, PI * 2); g.fill(); g.restore(); }
      g.restore();
    },
    /* ----- はなのこきゅう（カナヲ） ----- */
    petalburst: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.globalAlpha = fade(k, 0.03, 0.6);
      for (var i = 0; i < 5; i++) { // うめの はな
        var an = i * PI * 2 / 5 + k * 1.5, r = ease(Math.min(1, k * 2.5)) * 60;
        g.save(); g.rotate(an); g.translate(r * 0.5, 0);
        g.fillStyle = "#ffb8d8"; g.shadowColor = "#ff7ab8"; g.shadowBlur = 16;
        g.beginPath(); g.ellipse(r * 0.5, 0, 30 * ease(Math.min(1, k * 3)), 20 * ease(Math.min(1, k * 3)), 0, 0, PI * 2); g.fill(); g.restore();
      }
      circ(g, 0, 0, 14, "#ffe066");
      g.globalCompositeOperation = "lighter"; crescent(g, 60, 14, -1.6, 1.6, Math.min(1, k * 3), 1); g.fillStyle = "rgba(255,255,255,.8)"; g.fill();
      g.restore();
    },
    petalarc: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.rotate(-0.6);
      var p = Math.min(1, ease(k * 2)), a = fade(k, 0.03, 0.6);
      g.globalAlpha = a; g.shadowColor = "#ff5a9a"; g.shadowBlur = 20;
      crescent(g, 78, 32, -1.8, 1.8, p); g.fillStyle = "rgba(200,30,80,.75)"; g.fill();
      crescent(g, 80, 18, -1.8, 1.8, p); g.fillStyle = "#ff8ac0"; g.fill();
      crescent(g, 82, 7, -1.8, 1.8, p); g.fillStyle = "#fff0f6"; g.fill();
      g.restore();
    },
    flowerArc: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.rotate(f.rot || 0); g.globalAlpha = 1 - k; g.shadowColor = "#ff7ab8"; g.shadowBlur = 12;
      crescent(g, 44, 14, -1.5, 1.5, Math.min(1, ease(k * 2.5))); g.fillStyle = "#ffc0dc"; g.fill(); g.restore();
    },
    petalswirl: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.scale(1, 0.8);
      for (var i = 0; i < 40; i++) {
        var an = i * 0.5 + k * 9, r = 20 + (i % 10) * 7 * (0.5 + k);
        g.save(); g.translate(Math.cos(an) * r, Math.sin(an) * r); g.rotate(an * 2);
        g.globalAlpha = fade(k, 0.05, 0.7); g.fillStyle = i % 3 ? "#ffb0d0" : "#fff0f6";
        g.beginPath(); g.ellipse(0, 0, 6, 3.2, 0, 0, PI * 2); g.fill(); g.restore();
      }
      g.restore();
    },
    // ひがんしゅがん: おおきな め が ひらく
    eye: function (g, f, k) {
      var o = k < 0.2 ? k / 0.2 : (k > 0.8 ? (1 - k) / 0.2 : 1);
      g.save(); g.translate(f.x, f.y - 30); g.globalAlpha = o * 0.85;
      g.fillStyle = "rgba(255,240,248,.9)"; g.beginPath(); g.moveTo(-120, 0); g.quadraticCurveTo(0, -70 * o, 120, 0); g.quadraticCurveTo(0, 70 * o, -120, 0); g.fill();
      var rg = g.createRadialGradient(0, 0, 4, 0, 0, 40); rg.addColorStop(0, "#2a0a2a"); rg.addColorStop(0.35, "#8a3a8a"); rg.addColorStop(1, "#f0a0e0");
      circ(g, 0, 0, 40 * o, rg); circ(g, 0, 0, 14 * o, "#1a041a"); circ(g, -12, -12, 7 * o, "#fff");
      g.strokeStyle = "#5a1a4a"; g.lineWidth = 4; g.beginPath(); g.moveTo(-120, 0); g.quadraticCurveTo(0, -70 * o, 120, 0); g.stroke();
      g.restore();
    },
    /* ----- けもののこきゅう（いのすけ） ----- */
    claw: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.rotate((f.rot || 0) * 0.3 - 0.5); g.globalCompositeOperation = "lighter";
      var p = ease(Math.min(1, k * 3)), a = 1 - k;
      for (var i = 0; i < 4; i++) {
        var y = (i - 1.5) * 16; g.globalAlpha = a; g.strokeStyle = i % 2 ? "#c8d8ff" : "#fff"; g.lineWidth = 5 - i * 0.6; g.shadowColor = "#8ab0ff"; g.shadowBlur = 14;
        g.beginPath(); g.moveTo(-70, y - 20);
        for (var s = 1; s <= 8; s++) { var u = s / 8; if (u > p) break; g.lineTo(-70 + u * 140, y - 20 + u * 40 + (s % 2 ? -5 : 5)); }
        g.stroke();
      }
      g.restore();
    },
    beastpierce: function (g, f, k) {
      var p = ease(Math.min(1, k * 3)), a = fade(k, 0.02, 0.55), sx = f.sx || f.x + 200;
      g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = a; g.shadowColor = "#8ab0ff"; g.shadowBlur = 18;
      [-10, 10].forEach(function (dy) { g.fillStyle = "#dfe8ff"; g.beginPath(); g.moveTo(sx, f.y + dy - 6); g.lineTo(sx + (f.x - 10 - sx) * p, f.y + dy); g.lineTo(sx, f.y + dy + 6); g.fill(); });
      if (p >= 1) shockRing(g, f.x, f.y, 10 + (k - 0.33) * 120, 4, "#c8d8ff", 1 - k);
      g.restore();
    },
    /* ----- どうまの けっきじゅつ（こおり） ----- */
    icelotus: function (g, f, k) {
      var grow = ease(Math.min(1, k * 2.5)), a = fade(k, 0.02, 0.7);
      g.save(); g.translate(f.x, f.y + 50); g.globalAlpha = a;
      for (var ring = 0; ring < 2; ring++) for (var i = 0; i < 8; i++) {
        var an = -PI / 2 + (i - 3.5) * 0.36 * (ring ? 1.3 : 1);
        g.save(); g.rotate(an + PI / 2); g.scale(1, 1);
        var L = (ring ? 70 : 50) * grow, W = ring ? 20 : 15;
        var gr = g.createLinearGradient(0, 0, 0, -L); gr.addColorStop(0, "rgba(120,190,255,.9)"); gr.addColorStop(1, "rgba(240,252,255,.95)");
        g.fillStyle = gr; g.strokeStyle = "#ffffff"; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-W, -L * 0.5, 0, -L); g.quadraticCurveTo(W, -L * 0.5, 0, 0); g.fill(); g.stroke();
        g.restore();
      }
      g.restore();
    },
    icefan: function (g, f, k) {
      g.save(); g.translate(f.x, f.y); g.rotate(-0.4);
      var p = Math.min(1, ease(k * 2.2)), a = fade(k, 0.03, 0.6);
      g.globalAlpha = a; g.shadowColor = "#8fdcff"; g.shadowBlur = 22;
      crescent(g, 80, 36, -1.9, 1.9, p); g.fillStyle = "rgba(60,140,230,.7)"; g.fill();
      crescent(g, 84, 18, -1.9, 1.9, p); g.fillStyle = "#cfefff"; g.fill();
      g.shadowBlur = 0;
      for (var i = 0; i < 10; i++) { var an = -1.9 + 3.8 * (i / 10) * p, r = 96; g.save(); g.translate(Math.cos(an) * r, Math.sin(an) * r); g.rotate(an); g.fillStyle = "#f2fbff"; g.beginPath(); g.moveTo(0, -3); g.lineTo(14, 0); g.lineTo(0, 3); g.fill(); g.restore(); }
      g.restore();
    },
    icepetal: function (g, f, k) {
      var u = Math.min(1, k * 1.8), x = f.sx + (f.x - f.sx) * u, y = f.sy + (f.y - f.sy) * u - Math.sin(u * PI) * 40;
      g.save(); g.globalAlpha = 1 - Math.max(0, (k - 0.6) * 2.5);
      for (var i = 0; i < 6; i++) { g.save(); g.translate(x + Math.cos(i + k * 9) * 12, y + Math.sin(i * 2 + k * 9) * 10); g.rotate(k * 12 + i);
        g.fillStyle = i % 2 ? "#e8f8ff" : "#9fd8ff"; g.beginPath(); g.ellipse(0, 0, 8, 4, 0, 0, PI * 2); g.fill(); g.restore(); }
      g.restore();
    },
    // こなごおり: こおりの きりが みかたを つつむ
    icemist: function (g, f, k) {
      var a = fade(k, 0.15, 0.6);
      g.save(); g.globalAlpha = a * 0.75;
      for (var i = 0; i < 14; i++) {
        var x = f.x - 160 + ((i * 53) % 320) + Math.sin(k * 3 + i) * 20, y = f.y - 100 + ((i * 37) % 120);
        var rg = g.createRadialGradient(x, y, 4, x, y, 60); rg.addColorStop(0, "rgba(230,248,255,.7)"); rg.addColorStop(1, "rgba(180,220,255,0)");
        circ(g, x, y, 60, rg);
      }
      g.restore();
    },
    // ふゆざれつらら: うえから つららが ふる
    icicle: function (g, f, k) {
      g.save();
      for (var i = 0; i < 12; i++) {
        var x = f.x - 160 + i * 30, d = Math.min(1, Math.max(0, k * 2.2 - (i % 4) * 0.15)), y = -40 + (f.y + 60) * ease(d);
        g.globalAlpha = 1 - Math.max(0, (k - 0.7) * 3.3);
        var gr = g.createLinearGradient(x, y - 80, x, y); gr.addColorStop(0, "rgba(200,235,255,.4)"); gr.addColorStop(1, "#ffffff");
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - 11, y - 80); g.lineTo(x + 11, y - 80); g.lineTo(x, y); g.closePath(); g.fill();
        g.strokeStyle = "rgba(120,190,255,.8)"; g.lineWidth = 1; g.stroke();
        if (d >= 1) shockRing(g, x, f.y + 60, 6 + (k * 2.2 - 1) * 20, 2, "#e6f8ff", 1 - k, 0.3);
      }
      g.restore();
    },
    // けっしょうのみこ: ちいさな こおりの どうまが あらわれて こうげき
    iceclone: function (g, f, k) {
      var a = fade(k, 0.15, 0.75);
      for (var i = 0; i < 3; i++) {
        var x = f.x - 130 + i * 30, y = f.y + 40 - i * 8;
        KB.drawChar(g, "douma", x, y, { t: k * 4 + i, pose: k > 0.4 ? "attack" : "idle", swing: Math.min(1, Math.max(0, (k - 0.4) * 3)), scale: 0.7, alpha: a * 0.7, glow: "#9fdcff", ice: true });
      }
      g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = a * 0.35;
      var rg = g.createRadialGradient(f.x - 100, f.y + 30, 10, f.x - 100, f.y + 30, 110); rg.addColorStop(0, "rgba(160,220,255,.8)"); rg.addColorStop(1, "rgba(160,220,255,0)");
      circ(g, f.x - 100, f.y + 30, 110, rg); g.restore();
    },
    // むひょう すいれんぼさつ: こおりの おおきな ぼさつが あらわれる
    bodhisattva: function (g, f, k) {
      var rise = ease(Math.min(1, k * 2.5)), a = fade(k, 0.05, 0.8), x = f.x - 40, base = f.y + 60;
      g.save(); g.translate(x, base + (1 - rise) * 160); g.scale(1.3, 1.3); g.globalAlpha = a;
      var gr = g.createLinearGradient(0, -300, 0, 0); gr.addColorStop(0, "rgba(230,250,255,.9)"); gr.addColorStop(0.6, "rgba(130,200,255,.75)"); gr.addColorStop(1, "rgba(60,120,220,.5)");
      g.shadowColor = "#8fdcff"; g.shadowBlur = 30; g.fillStyle = gr; g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 2;
      // こうはい（うしろの わ）
      g.save(); g.globalAlpha = a * 0.5; circ(g, 0, -230, 70, null, "#e6f8ff", 5); g.restore();
      // はすの だい
      for (var i = 0; i < 9; i++) { g.save(); g.rotate((i - 4) * 0.22); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-18, -40, 0, -70); g.quadraticCurveTo(18, -40, 0, 0); g.fill(); g.stroke(); g.restore(); }
      // からだ
      g.beginPath(); g.moveTo(-90, -40); g.quadraticCurveTo(-100, -150, -50, -180); g.lineTo(50, -180); g.quadraticCurveTo(100, -150, 90, -40); g.closePath(); g.fill(); g.stroke();
      // あたま
      g.beginPath(); g.ellipse(0, -220, 36, 42, 0, 0, PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(0, -268, 16, 14, 0, 0, PI * 2); g.fill(); g.stroke();
      g.shadowBlur = 0; g.strokeStyle = "rgba(40,90,170,.7)"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-16, -222); g.quadraticCurveTo(-8, -216, 0, -222); g.moveTo(4, -222); g.quadraticCurveTo(12, -216, 20, -222); g.stroke();
      // がっしょう する て（ふりおろす）
      var slam = k > 0.4 ? Math.min(1, (k - 0.4) * 5) : 0;
      g.fillStyle = gr; g.save(); g.translate(0, -150 + slam * 90);
      g.beginPath(); g.moveTo(-14, 0); g.quadraticCurveTo(-18, -40, 0, -60); g.quadraticCurveTo(18, -40, 14, 0); g.closePath(); g.fill(); g.stroke(); g.restore();
      g.restore();
      if (k > 0.45 && k < 0.8) { var kk = (k - 0.45) / 0.35; shockRing(g, x, base, 30 + kk * 260, 6, "#e6f8ff", 1 - kk, 0.3); }
    },
    // ひかりの つぶ（アカザが きえるとき）
    light: function (g, f, k) {
      g.save(); g.globalCompositeOperation = "lighter";
      for (var i = 0; i < 50; i++) {
        var sx = f.x + ((i * 37) % 70) - 35, sy = f.y - ((i * 53) % 150);
        var y = sy - k * (50 + (i % 5) * 26), x = sx + Math.sin(k * 6 + i) * 10;
        g.globalAlpha = (1 - k) * (0.5 + (i % 3) * 0.2); circ(g, x, y, 1.6 + (i % 3), i % 4 ? "#ffe6f2" : "#bfe8ff");
      }
      g.restore();
    }
  };
  KB.drawFx = function (g, f) {
    var k = Math.max(0, Math.min(1, f.t / f.life));
    if (FX[f.type]) FX[f.type](g, f, k);
  };

  /* ---------- つぶ（しぶき・ひのこ・けっしょう・はなびら） ---------- */
  KB.drawParts = function (g, parts) {
    g.save(); g.globalCompositeOperation = "lighter";
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], k = p.t / p.life, a = (1 - k) * (p.a || 1);
      if (a <= 0) continue;
      g.globalAlpha = a;
      if (p.kind === "butterfly") { drawButterfly(g, p.x, p.y, p.size, p.t * 25, p.color, a); continue; }
      if (p.kind === "petal") { g.save(); g.translate(p.x, p.y); g.rotate(p.t * 5 + i); g.fillStyle = p.color; g.beginPath(); g.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, PI * 2); g.fill(); g.restore(); continue; }
      if (p.kind === "snow") { g.save(); g.translate(p.x, p.y); g.rotate(p.t * 4); snowflake(g, p.size, 1.2, p.color); g.restore(); }
      else if (p.kind === "streak") { g.strokeStyle = p.color; g.lineWidth = p.size; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); g.stroke(); }
      else { circ(g, p.x, p.y, p.size * (p.kind === "ember" ? (1 - k * 0.5) : 1), p.color); }
    }
    g.restore();
  };

  /* ---------- しゅうちゅうせん（ひっさつの とき） ---------- */
  KB.drawSpeedLines = function (g, cx, cy, a, t) {
    g.save(); g.globalAlpha = a; g.fillStyle = "rgba(255,255,255,.85)";
    for (var i = 0; i < 70; i++) {
      var an = i * 0.0898 * PI * 2 + ((i * 7919) % 13) * 0.01, r0 = 120 + ((i * 31 + Math.floor(t * 30) * 17) % 90), r1 = 800, w = 0.006 + (i % 3) * 0.004;
      g.beginPath(); g.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0);
      g.lineTo(cx + Math.cos(an - w) * r1, cy + Math.sin(an - w) * r1); g.lineTo(cx + Math.cos(an + w) * r1, cy + Math.sin(an + w) * r1); g.closePath(); g.fill();
    }
    g.restore();
  };

  /* ---------- カットイン ----------
     c: { look, name, sub, color, t, life, flip } … ななめの おびに かおの アップと わざの なまえ */
  KB.drawCutin = function (g, c, x0, vw) {
    var k = c.t / c.life, inK = Math.min(1, k / 0.15), outK = k > 0.82 ? (k - 0.82) / 0.18 : 0;
    var slide = (1 - ease(inK)) * vw * (c.flip ? -1 : 1) + outK * vw * (c.flip ? 1 : -1);
    var cy = 150, bh = 120;
    g.save();
    g.fillStyle = "rgba(0,0,0," + 0.55 * (1 - outK) + ")"; g.fillRect(x0, 0, vw, H);
    g.translate(slide, 0);
    g.save();
    g.beginPath(); g.moveTo(x0 - 40, cy - bh / 2 + 20); g.lineTo(x0 + vw + 40, cy - bh / 2 - 20); g.lineTo(x0 + vw + 40, cy + bh / 2 - 20); g.lineTo(x0 - 40, cy + bh / 2 + 20); g.closePath();
    var gr = g.createLinearGradient(x0, 0, x0 + vw, 0); gr.addColorStop(0, c.color[0]); gr.addColorStop(1, c.color[1]);
    g.fillStyle = gr; g.fill(); g.clip();
    // ながれる せん
    g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 2;
    for (var i = 0; i < 24; i++) { var yy = cy - bh / 2 + (i * 37) % bh, xx = x0 + ((i * 113 - c.t * 1400) % (vw + 200) + vw + 200) % (vw + 200) - 100; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + 80 + (i % 4) * 30, yy - 6); g.stroke(); }
    // かお
    var fx = c.flip ? x0 + vw - 120 : x0 + 120;
    KB.drawPortrait(g, c.look, fx + (c.flip ? -1 : 1) * k * 20, cy + 10, 3.4, c.st, c.flip);
    g.restore();
    // わざの なまえ
    g.textAlign = c.flip ? "left" : "right"; g.textBaseline = "middle";
    var tx = c.flip ? x0 + 30 : x0 + vw - 30;
    if (c.sub) { g.font = "bold 18px system-ui, sans-serif"; g.lineWidth = 4; g.strokeStyle = "#000"; g.strokeText(c.sub, tx, cy - 26); g.fillStyle = "#fff"; g.fillText(c.sub, tx, cy - 26); }
    var fs = Math.min(40, (vw - 260) / Math.max(4, c.name.length) * 1.1);
    g.font = "900 " + fs + "px system-ui, sans-serif"; g.lineWidth = 7; g.strokeStyle = "#000"; g.strokeText(c.name, tx, cy + 12);
    var tg = g.createLinearGradient(0, cy - 10, 0, cy + 30); tg.addColorStop(0, "#fff"); tg.addColorStop(1, c.textColor || "#ffe066");
    g.fillStyle = tg; g.fillText(c.name, tx, cy + 12);
    g.restore();
  };

  /* ---------- がめん ぜんたいの いろ（すきとおる・なぎ・ひっさつ） ---------- */
  KB.drawTint = function (g, x0, vw, col, a, mode) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = a;
    if (mode) { try { g.globalCompositeOperation = mode; } catch (e) { /* むし */ } }
    g.fillStyle = col; g.fillRect(x0, 0, vw, H); g.restore();
  };
})(window);
