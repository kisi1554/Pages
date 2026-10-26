// しんかい たんけん: えがく ぶぶん（いきもの・せんすいてい・うみ の そこ）
// いきもの は ぜんぶ コード で えがく。ローカル ざひょう で みぎ むき、
// およぐ もの は まんなか が (0,0)、そこ に いる もの は そこ に ついた ところ が (0,0)。
// mode: "body" … からだ / "glow" … ひかる ところ だけ（あと から lighter で かさねる）
(function (root) {
  "use strict";
  var TAU = Math.PI * 2;

  // ---- ちいさな どうぐ ----
  function ell(c, x, y, rx, ry, rot) {
    c.beginPath(); c.ellipse(x, y, Math.max(rx, 0.1), Math.max(ry, 0.1), rot || 0, 0, TAU);
  }
  function fillEll(c, x, y, rx, ry, color, rot) { ell(c, x, y, rx, ry, rot); c.fillStyle = color; c.fill(); }
  function circle(c, x, y, r, color) { c.beginPath(); c.arc(x, y, Math.max(r, 0.1), 0, TAU); c.fillStyle = color; c.fill(); }
  // かわいい 目: しろめ・くろめ・ひかり
  function eye(c, x, y, r, iris) {
    circle(c, x, y, r, "#ffffff");
    circle(c, x + r * 0.15, y, r * 0.62, iris || "#1b1b2f");
    circle(c, x + r * 0.32, y - r * 0.28, r * 0.24, "#ffffff");
  }
  function glowDot(c, x, y, r, color, a) {
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255," + (a == null ? 1 : a) + ")");
    g.addColorStop(0.25, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  function line(c, pts, color, w) {
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.strokeStyle = color; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; c.stroke();
  }
  function quad(c, x0, y0, cx, cy, x1, y1, color, w) {
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1);
    c.strokeStyle = color; c.lineWidth = w; c.lineCap = "round"; c.stroke();
  }
  function vgrad(c, y0, y1, a, b) {
    var g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g;
  }
  // さかな の からだ（はな が +x）。L: ながさ, h: たかさ
  function fishBody(c, L, h, top, belly, opt) {
    opt = opt || {};
    var nose = L * 0.5, tb = -L * 0.32, th = h * (opt.thinTail ? 0.08 : 0.14);
    c.beginPath();
    c.moveTo(nose, opt.bluntNose ? -h * 0.1 : 0);
    if (opt.bluntNose) c.quadraticCurveTo(nose + L * 0.02, -h * 0.55, L * 0.28, -h * 0.5);
    else c.bezierCurveTo(nose - L * 0.06, -h * 0.4, L * 0.25, -h * 0.52, L * 0.1, -h * 0.5);
    c.bezierCurveTo(-L * 0.08, -h * 0.48, -L * 0.22, -h * 0.25, tb, -th);
    c.lineTo(tb, th);
    c.bezierCurveTo(-L * 0.22, h * 0.25, -L * 0.08, h * 0.48, L * 0.1, h * 0.48);
    c.bezierCurveTo(L * 0.3, h * 0.45, nose - L * 0.04, h * 0.3, nose, opt.bluntNose ? h * 0.15 : 0);
    c.closePath();
    c.fillStyle = vgrad(c, -h * 0.5, h * 0.5, top, belly); c.fill();
  }
  function tailFin(c, L, h, color, wig, fork) {
    c.save(); c.translate(-L * 0.31, 0); c.rotate(wig);
    c.beginPath(); c.moveTo(0, 0);
    c.lineTo(-L * 0.2, -h * 0.5);
    if (fork) c.lineTo(-L * 0.11, 0); else c.quadraticCurveTo(-L * 0.24, 0, -L * 0.2, 0);
    c.lineTo(-L * 0.2, h * 0.5); c.closePath();
    c.fillStyle = color; c.fill(); c.restore();
  }
  function tri(c, x0, y0, x1, y1, x2, y2, color) {
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x2, y2); c.closePath(); c.fillStyle = color; c.fill();
  }
  function teeth(c, x0, y0, x1, y1, n, size, up) {
    c.fillStyle = "#fffdf5";
    for (var i = 0; i < n; i++) {
      var f = (i + 0.5) / n, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
      c.beginPath(); c.moveTo(x - size * 0.4, y); c.lineTo(x, y + (up ? -size : size)); c.lineTo(x + size * 0.4, y); c.closePath(); c.fill();
    }
  }

  // ---- いきもの ----
  var DRAW = {};

  DRAW.fish = function (c, u, t, mode, sp) {
    var o = sp.opt || {}, col = sp.c, L = u, h = u * (o.deep ? 0.42 : o.round ? 0.34 : 0.27);
    if (mode === "glow") return;
    var wig = Math.sin(t * (o.fork ? 9 : 5)) * 0.22;
    tailFin(c, L, h * 0.95, col.fin, wig, o.fork);
    tri(c, L * 0.05, -h * 0.45, -L * 0.18, -h * 0.4, -L * 0.05, -h * 0.75, col.fin);
    tri(c, -L * 0.05, h * 0.42, -L * 0.2, h * 0.3, -L * 0.14, h * 0.6, col.fin);
    fishBody(c, L, h, col.body, col.belly, { bluntNose: o.bigHead });
    if (o.stripes) for (var i = 0; i < 4; i++) line(c, [L * 0.2, h * (0.08 + i * 0.08), -L * 0.25, h * (0.04 + i * 0.05)], col.stripe, Math.max(1, u * 0.012));
    fillEll(c, L * 0.12, h * 0.05, L * 0.08, h * 0.08, col.fin, -0.4);
    var er = h * (o.bigEye ? 0.27 : o.bigHead ? 0.13 : 0.16);
    if (o.gold) circle(c, L * 0.3, -h * 0.1, er * 1.15, "#ffd43b");
    eye(c, L * 0.3, -h * 0.1, er, o.gold ? "#3b2a00" : null);
    quad(c, L * 0.5, h * 0.05, L * 0.44, h * 0.14, L * 0.38, h * 0.12, "rgba(0,0,0,.45)", Math.max(1, u * 0.014));
  };

  function sardine(c, x, y, L, t) {
    c.save(); c.translate(x, y);
    var h = L * 0.24;
    tailFin(c, L, h, "#355c8a", Math.sin(t * 10) * 0.25, true);
    fishBody(c, L, h, "#3a6a9e", "#eef3f8");
    for (var i = 0; i < 5; i++) circle(c, L * (0.12 - i * 0.08), -h * 0.05, L * 0.018, "#20344f");
    eye(c, L * 0.32, -h * 0.06, h * 0.2);
    c.restore();
  }
  DRAW.school = function (c, u, t, mode) {
    if (mode === "glow") return;
    var pos = [[0.1, -0.12], [-0.2, 0.05], [0.25, 0.14], [-0.05, 0.22], [0.32, -0.28], [-0.32, -0.2], [0.02, 0.0]];
    for (var i = 0; i < pos.length; i++) {
      var p = pos[i], bob = Math.sin(t * 2 + i) * u * 0.02;
      sardine(c, p[0] * u, p[1] * u + bob, u * 0.32, t + i * 0.37);
    }
  };

  DRAW.jelly = function (c, u, t, mode) {
    if (mode === "glow") return;
    var pulse = 1 + Math.sin(t * 2.2) * 0.08, r = u * 0.45 * pulse, hh = u * 0.28 / pulse;
    c.save();
    // あし
    for (var i = -5; i <= 5; i++) {
      var x = i * r * 0.17, sw = Math.sin(t * 2 + i) * u * 0.05;
      quad(c, x, hh * 0.2, x + sw, hh * 0.9, x - sw * 0.5, hh * 1.5, "rgba(230,230,255,.55)", Math.max(1, u * 0.012));
    }
    c.beginPath(); c.moveTo(-r, hh * 0.25);
    c.bezierCurveTo(-r, -hh * 1.3, r, -hh * 1.3, r, hh * 0.25);
    c.quadraticCurveTo(0, hh * 0.05, -r, hh * 0.25);
    c.fillStyle = "rgba(225,235,255,.55)"; c.fill();
    c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = Math.max(1, u * 0.015); c.stroke();
    for (var k = 0; k < 4; k++) {
      var a = (k - 1.5) * 0.42, cx = Math.sin(a) * r * 0.55, cy = -hh * 0.45 + Math.abs(a) * hh * 0.25;
      c.beginPath(); c.arc(cx, cy, r * 0.13, 0.2, Math.PI * 1.8);
      c.strokeStyle = "rgba(205,120,190,.85)"; c.lineWidth = Math.max(1.5, u * 0.03); c.stroke();
    }
    c.restore();
  };

  DRAW.turtle = function (c, u, t, mode) {
    if (mode === "glow") return;
    var f = Math.sin(t * 2.5) * 0.5;
    c.save(); c.translate(u * 0.18, u * 0.02); c.rotate(-0.4 + f);
    fillEll(c, 0, u * 0.12, u * 0.08, u * 0.22, "#8a6a3a", 0.3); c.restore();
    c.save(); c.translate(-u * 0.2, u * 0.05); c.rotate(0.4 - f * 0.6);
    fillEll(c, 0, u * 0.08, u * 0.06, u * 0.12, "#8a6a3a", 0.5); c.restore();
    fillEll(c, u * 0.38, -u * 0.02, u * 0.12, u * 0.09, "#a7834a");
    eye(c, u * 0.42, -u * 0.05, u * 0.035);
    fillEll(c, 0, 0, u * 0.34, u * 0.19, "#b0572b");
    c.fillStyle = "rgba(70,30,10,.35)";
    for (var i = -1; i <= 1; i++) { ell(c, i * u * 0.17, -u * 0.04, u * 0.08, u * 0.07); c.fill(); }
    fillEll(c, 0, u * 0.12, u * 0.3, u * 0.06, "#e9c58a");
  };

  DRAW.sunfish = function (c, u, t, mode) {
    if (mode === "glow") return;
    var f = Math.sin(t * 2) * 0.25, r = u * 0.34;
    c.save(); c.rotate(f); tri(c, -r * 0.2, -r * 0.6, r * 0.25, -r * 0.6, -r * 0.1, -r * 1.65, "#7f8c99"); c.restore();
    c.save(); c.rotate(-f); tri(c, -r * 0.2, r * 0.6, r * 0.25, r * 0.6, -r * 0.1, r * 1.65, "#7f8c99"); c.restore();
    c.beginPath();
    c.moveTo(r * 1.1, 0);
    c.bezierCurveTo(r * 1.0, -r * 1.05, -r * 0.6, -r * 1.05, -r * 0.85, -r * 0.55);
    for (var i = 0; i <= 6; i++) c.quadraticCurveTo(-r * 1.15, -r * 0.55 + (i + 0.5) * r * 0.18, -r * 0.85, -r * 0.55 + (i + 1) * r * 0.18);
    c.bezierCurveTo(-r * 0.6, r * 1.05, r * 1.0, r * 1.05, r * 1.1, 0);
    c.fillStyle = vgrad(c, -r, r, "#8e9aa6", "#dfe6ec"); c.fill();
    eye(c, r * 0.62, -r * 0.18, r * 0.12);
    circle(c, r * 1.06, r * 0.08, r * 0.06, "#5c6670");
    fillEll(c, r * 0.3, r * 0.05, r * 0.12, r * 0.07, "#7f8c99", -0.3);
  };

  DRAW.whale = function (c, u, t, mode) {
    if (mode === "glow") return;
    var L = u, h = u * 0.22, f = Math.sin(t * 1.2) * 0.25;
    c.save(); c.translate(-L * 0.42, 0); c.rotate(f);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-L * 0.08, -h * 0.6, -L * 0.13, -h * 0.55);
    c.quadraticCurveTo(-L * 0.06, 0, -L * 0.13, h * 0.55); c.quadraticCurveTo(-L * 0.08, h * 0.6, 0, 0);
    c.fillStyle = "#4a5260"; c.fill(); c.restore();
    c.beginPath();
    c.moveTo(L * 0.5, -h * 0.35);
    c.lineTo(L * 0.5, h * 0.25);
    c.quadraticCurveTo(L * 0.46, h * 0.52, L * 0.2, h * 0.5);
    c.quadraticCurveTo(-L * 0.2, h * 0.45, -L * 0.42, h * 0.05);
    c.lineTo(-L * 0.42, -h * 0.05);
    c.quadraticCurveTo(-L * 0.1, -h * 0.55, L * 0.15, -h * 0.55);
    c.quadraticCurveTo(L * 0.48, -h * 0.58, L * 0.5, -h * 0.35);
    c.fillStyle = vgrad(c, -h * 0.5, h * 0.5, "#5b6472", "#8a93a0"); c.fill();
    // こぶ
    for (var i = 0; i < 5; i++) circle(c, -L * (0.05 + i * 0.07), -h * (0.42 - i * 0.07), h * 0.06, "#535b68");
    line(c, [L * 0.48, h * 0.28, L * 0.14, h * 0.36], "#3b414c", Math.max(1.5, u * 0.008));
    eye(c, L * 0.2, h * 0.18, h * 0.07);
    quad(c, L * 0.38, h * 0.3, L * 0.3, h * 0.42, L * 0.24, h * 0.33, "#3b414c", Math.max(1, u * 0.006));
    fillEll(c, L * 0.05, h * 0.42, L * 0.07, h * 0.12, "#4f5764", 0.6);
  };

  DRAW.lantern = function (c, u, t, mode) {
    var L = u, h = u * 0.25, i;
    if (mode === "glow") {
      for (i = 0; i < 7; i++) glowDot(c, L * (0.3 - i * 0.09), h * (0.22 - i * 0.015), u * 0.06, "rgba(90,220,255,.85)");
      glowDot(c, L * 0.42, -h * 0.25, u * 0.05, "rgba(120,255,220,.8)");
      return;
    }
    tailFin(c, L, h, "#3c4f72", Math.sin(t * 8) * 0.22, true);
    fishBody(c, L, h, "#3d527a", "#b9c6dc");
    for (i = 0; i < 7; i++) circle(c, L * (0.3 - i * 0.09), h * (0.22 - i * 0.015), u * 0.018, "#9fe8ff");
    eye(c, L * 0.32, -h * 0.08, h * 0.25);
  };

  DRAW.hatchet = function (c, u, t, mode) {
    var L = u, i;
    if (mode === "glow") {
      for (i = 0; i < 8; i++) glowDot(c, L * (0.28 - i * 0.075), L * (0.32 - i * 0.025), u * 0.07, "rgba(110,200,255,.85)");
      return;
    }
    c.save(); c.translate(-L * 0.28, 0); c.rotate(Math.sin(t * 7) * 0.2);
    tri(c, 0, 0, -L * 0.18, -L * 0.13, -L * 0.18, L * 0.13, "#9aa8bb"); c.restore();
    c.beginPath();
    c.moveTo(L * 0.4, -L * 0.12);
    c.quadraticCurveTo(L * 0.25, -L * 0.24, 0, -L * 0.22);
    c.lineTo(-L * 0.3, -L * 0.05); c.lineTo(-L * 0.3, L * 0.05);
    c.lineTo(-L * 0.05, L * 0.2);
    c.quadraticCurveTo(L * 0.2, L * 0.42, L * 0.36, L * 0.25);
    c.quadraticCurveTo(L * 0.46, L * 0.1, L * 0.4, -L * 0.12);
    c.fillStyle = vgrad(c, -L * 0.24, L * 0.4, "#5b6b84", "#e6edf6"); c.fill();
    tri(c, L * 0.05, -L * 0.21, -L * 0.12, -L * 0.16, -L * 0.02, -L * 0.32, "#8ea0b8");
    for (i = 0; i < 8; i++) circle(c, L * (0.28 - i * 0.075), L * (0.32 - i * 0.025), u * 0.02, "#bfe6ff");
    eye(c, L * 0.27, -L * 0.07, L * 0.085);
  };

  DRAW.angler = function (c, u, t, mode) {
    var r = u * 0.32, sw = Math.sin(t * 1.6) * 0.08;
    var lx = r * 1.35 + Math.cos(t * 1.6) * r * 0.08, ly = -r * 1.55 + Math.sin(t * 1.6) * r * 0.1;
    if (mode === "glow") {
      glowDot(c, lx, ly, u * 0.35, "rgba(190,255,230,.6)", 1);
      glowDot(c, lx, ly, u * 0.12, "rgba(255,255,200,.95)", 1);
      return;
    }
    c.save(); c.translate(-r * 0.9, 0); c.rotate(Math.sin(t * 3) * 0.25);
    tri(c, 0, 0, -r * 0.6, -r * 0.45, -r * 0.6, r * 0.45, "#3d2a26"); c.restore();
    quad(c, r * 0.3, -r * 0.85, r * 1.0, -r * 1.9 + sw * r, lx, ly, "#4a3530", Math.max(2, u * 0.03));
    circle(c, lx, ly, u * 0.06, "#fff7c2");
    circle(c, 0, 0, r, "#4a3530");
    fillEll(c, -r * 0.15, r * 0.25, r * 0.75, r * 0.6, "#5c423b");
    // くち
    c.beginPath(); c.moveTo(r * 0.98, -r * 0.05);
    c.quadraticCurveTo(r * 0.55, r * 0.75, -r * 0.05, r * 0.55);
    c.quadraticCurveTo(r * 0.6, r * 0.3, r * 0.98, -r * 0.05);
    c.fillStyle = "#2a1916"; c.fill();
    teeth(c, r * 0.9, r * 0.0, r * 0.15, r * 0.45, 6, r * 0.14, false);
    teeth(c, r * 0.75, r * 0.4, r * 0.15, r * 0.6, 4, r * 0.12, true);
    eye(c, r * 0.45, -r * 0.4, r * 0.18);
    fillEll(c, -r * 0.2, r * 0.05, r * 0.25, r * 0.15, "#3d2a26", -0.6);
  };

  DRAW.mendako = function (c, u, t, mode) {
    if (mode === "glow") return;
    var w = u * 0.5, bob = Math.sin(t * 1.5), f = Math.sin(t * 2.2) * 0.3;
    c.save(); c.translate(-w * 0.35, -w * 0.52); c.rotate(-0.4 - f); fillEll(c, 0, -w * 0.12, w * 0.12, w * 0.2, "#f08a4b"); c.restore();
    c.save(); c.translate(w * 0.35, -w * 0.52); c.rotate(0.4 + f); fillEll(c, 0, -w * 0.12, w * 0.12, w * 0.2, "#f08a4b"); c.restore();
    c.beginPath();
    c.moveTo(-w, w * 0.15);
    c.bezierCurveTo(-w * 0.95, -w * 0.75, w * 0.95, -w * 0.75, w, w * 0.15);
    for (var i = 4; i >= -4; i--) {
      var x = i * w * 0.22, y = w * (0.18 + 0.06 * Math.sin(t * 2 + i) + 0.04 * bob);
      c.quadraticCurveTo(x + w * 0.11, y + w * 0.1, x, y);
    }
    c.closePath();
    c.fillStyle = vgrad(c, -w * 0.6, w * 0.3, "#f4a261", "#e76f51"); c.fill();
    eye(c, -w * 0.25, -w * 0.25, w * 0.11);
    eye(c, w * 0.25, -w * 0.25, w * 0.11);
    fillEll(c, 0, -w * 0.05, w * 0.12, w * 0.05, "rgba(255,200,170,.6)");
  };

  DRAW.squid = function (c, u, t, mode) {
    if (mode === "glow") return;
    var L = u, i;
    // うで（まえ）
    for (i = 0; i < 8; i++) {
      var a = (i - 3.5) * 0.09, w = Math.sin(t * 1.5 + i) * L * 0.04;
      quad(c, L * 0.12, a * L * 0.3, L * 0.3, a * L * 0.9 + w, L * 0.42, a * L * 1.3 - w, "#c4523e", Math.max(2, L * 0.022));
    }
    for (i = -1; i <= 1; i += 2) {
      var ww = Math.sin(t * 1.2 + i) * L * 0.06;
      c.beginPath(); c.moveTo(L * 0.12, i * L * 0.02);
      c.bezierCurveTo(L * 0.35, i * L * 0.12 + ww, L * 0.48, -i * L * 0.05, L * 0.58, i * L * 0.08 + ww);
      c.strokeStyle = "#b8473a"; c.lineWidth = Math.max(1.5, L * 0.01); c.stroke();
      fillEll(c, L * 0.58, i * L * 0.08 + ww, L * 0.03, L * 0.014, "#b8473a");
    }
    // どう
    c.beginPath();
    c.moveTo(L * 0.1, -L * 0.075);
    c.quadraticCurveTo(-L * 0.2, -L * 0.09, -L * 0.42, 0);
    c.quadraticCurveTo(-L * 0.2, L * 0.09, L * 0.1, L * 0.075);
    c.closePath();
    c.fillStyle = vgrad(c, -L * 0.09, L * 0.09, "#d9644a", "#f0a07a"); c.fill();
    var fw = Math.sin(t * 2) * L * 0.02;
    tri(c, -L * 0.3, -L * 0.03, -L * 0.45, 0, -L * 0.36, -L * 0.1 - fw, "#c4523e");
    tri(c, -L * 0.3, L * 0.03, -L * 0.45, 0, -L * 0.36, L * 0.1 + fw, "#c4523e");
    fillEll(c, L * 0.12, 0, L * 0.06, L * 0.055, "#d9644a");
    eye(c, L * 0.12, -L * 0.005, L * 0.035, "#1e2240");
  };

  DRAW.oarfish = function (c, u, t, mode) {
    if (mode === "glow") return;
    var L = u, n = 24, i, pts = [];
    for (i = 0; i <= n; i++) {
      var f = i / n, x = L * 0.5 - f * L;
      pts.push([x, Math.sin(t * 1.8 - f * 5) * L * 0.035 * f]);
    }
    // あかい せびれ
    for (i = 1; i < n; i++) {
      var p = pts[i];
      line(c, [p[0], p[1] - L * 0.02, p[0] - L * 0.01, p[1] - L * 0.055], "#e8414b", Math.max(1.5, L * 0.008));
    }
    c.beginPath();
    for (i = 0; i <= n; i++) { var q = pts[i], hh = L * 0.03 * (1 - (i / n) * 0.8); if (i) c.lineTo(q[0], q[1] - hh); else c.moveTo(q[0], q[1] - hh); }
    for (i = n; i >= 0; i--) { var r = pts[i], h2 = L * 0.03 * (1 - (i / n) * 0.8); c.lineTo(r[0], r[1] + h2); }
    c.closePath();
    c.fillStyle = vgrad(c, -L * 0.03, L * 0.03, "#c9d4e3", "#ffffff"); c.fill();
    for (i = 3; i < n; i += 3) circle(c, pts[i][0], pts[i][1] - L * 0.008, L * 0.006, "#7d8ba1");
    // あたま の かざり
    for (i = 0; i < 5; i++) quad(c, L * 0.46, -L * 0.025, L * (0.42 - i * 0.02), -L * 0.1, L * (0.38 - i * 0.04), -L * (0.13 + i * 0.01), "#e8414b", Math.max(1.5, L * 0.007));
    quad(c, L * 0.42, L * 0.02, L * 0.38, L * 0.1, L * 0.3, L * 0.16 + Math.sin(t) * L * 0.02, "#e8414b", Math.max(1.5, L * 0.006));
    eye(c, L * 0.46, -L * 0.004, L * 0.016);
  };

  DRAW.viper = function (c, u, t, mode) {
    var L = u, h = u * 0.18, i;
    var lx = L * 0.42 + Math.sin(t * 2) * L * 0.03, ly = -h * 1.9;
    if (mode === "glow") {
      glowDot(c, lx, ly, u * 0.12, "rgba(160,220,255,.8)");
      for (i = 0; i < 9; i++) glowDot(c, L * (0.3 - i * 0.07), h * 0.3, u * 0.04, "rgba(120,170,255,.75)");
      return;
    }
    tailFin(c, L, h, "#1f2a3d", Math.sin(t * 6) * 0.2, true);
    quad(c, L * 0.18, -h * 0.45, L * 0.32, -h * 2.0, lx, ly, "#36465f", Math.max(1.5, u * 0.012));
    circle(c, lx, ly, u * 0.025, "#cfe8ff");
    fishBody(c, L, h, "#2c3b55", "#56688a", { thinTail: true });
    for (i = 0; i < 9; i++) circle(c, L * (0.3 - i * 0.07), h * 0.3, u * 0.012, "#9cc0ff");
    c.beginPath(); c.moveTo(L * 0.5, 0); c.lineTo(L * 0.22, h * 0.25); c.lineTo(L * 0.48, h * 0.18); c.closePath(); c.fillStyle = "#151d2b"; c.fill();
    teeth(c, L * 0.5, -h * 0.02, L * 0.42, -h * 0.02, 2, h * 0.75, false);
    teeth(c, L * 0.47, h * 0.2, L * 0.38, h * 0.2, 2, h * 0.6, true);
    eye(c, L * 0.35, -h * 0.15, h * 0.22);
  };

  DRAW.barreleye = function (c, u, t, mode) {
    if (mode === "glow") return;
    var L = u, h = u * 0.28;
    tailFin(c, L, h, "#4b3426", Math.sin(t * 4) * 0.2, false);
    c.save(); c.translate(L * 0.02, h * 0.3); c.rotate(0.5 + Math.sin(t * 2) * 0.2);
    fillEll(c, 0, h * 0.4, L * 0.07, h * 0.5, "rgba(120,80,60,.75)"); c.restore();
    fishBody(c, L, h, "#5a3d2c", "#7a5640");
    fillEll(c, L * 0.42, -h * 0.05, L * 0.02, L * 0.02, "#1a1a1a");
    fillEll(c, L * 0.46, h * 0.08, L * 0.025, L * 0.012, "#2b1b12");
    // すきとおった ドーム
    ell(c, L * 0.24, -h * 0.55, L * 0.2, h * 0.55);
    c.fillStyle = "rgba(200,240,255,.28)"; c.fill();
    c.strokeStyle = "rgba(230,250,255,.85)"; c.lineWidth = Math.max(1, u * 0.012); c.stroke();
    fillEll(c, L * 0.22, -h * 0.55, L * 0.06, h * 0.22, "#5fd36b");
    circle(c, L * 0.22, -h * 0.75, L * 0.045, "#9cf5a5");
    circle(c, L * 0.23, -h * 0.78, L * 0.015, "#ffffff");
  };

  DRAW.vampire = function (c, u, t, mode) {
    var w = u * 0.42, op = 0.5 + 0.5 * Math.sin(t * 1.2), i;
    if (mode === "glow") {
      glowDot(c, -w * 0.55, -w * 0.75, u * 0.08, "rgba(120,180,255,.7)");
      glowDot(c, w * 0.55, -w * 0.75, u * 0.08, "rgba(120,180,255,.7)");
      for (i = 0; i < 6; i++) glowDot(c, (i - 2.5) * w * 0.32, w * (0.55 + op * 0.1), u * 0.06, "rgba(110,170,255,.8)");
      return;
    }
    var f = Math.sin(t * 2) * 0.35;
    c.save(); c.translate(-w * 0.45, -w * 0.75); c.rotate(-0.6 - f); fillEll(c, 0, 0, w * 0.22, w * 0.1, "#6b1e2b"); c.restore();
    c.save(); c.translate(w * 0.45, -w * 0.75); c.rotate(0.6 + f); fillEll(c, 0, 0, w * 0.22, w * 0.1, "#6b1e2b"); c.restore();
    // マント
    c.beginPath(); c.moveTo(-w * 0.6, -w * 0.2);
    c.quadraticCurveTo(-w * (1 + op * 0.2), w * 0.3, -w * 0.8, w * (0.55 + op * 0.1));
    for (i = -3; i <= 3; i++) c.quadraticCurveTo(i * w * 0.27, w * (0.85 + op * 0.1), (i + 0.5) * w * 0.27, w * (0.55 + op * 0.1));
    c.quadraticCurveTo(w * (1 + op * 0.2), w * 0.3, w * 0.6, -w * 0.2);
    c.closePath(); c.fillStyle = "#4a1420"; c.fill();
    fillEll(c, 0, -w * 0.45, w * 0.55, w * 0.62, "#7a2333");
    for (i = 0; i < 6; i++) circle(c, (i - 2.5) * w * 0.32, w * (0.55 + op * 0.1), u * 0.022, "#bcd6ff");
    eye(c, -w * 0.25, -w * 0.25, w * 0.17, "#2050c0");
    eye(c, w * 0.25, -w * 0.25, w * 0.17, "#2050c0");
  };

  function legSeg(c, x0, y0, x1, y1, x2, y2, color, w) { line(c, [x0, y0, x1, y1, x2, y2], color, w); }

  DRAW.spider = function (c, u, t, mode) {
    if (mode === "glow") return;
    var L = u, bw = L * 0.16, by = -L * 0.2, i, lw = Math.max(2, L * 0.022);
    for (i = 0; i < 4; i++) {
      var s = 0.25 + i * 0.22, sway = Math.sin(t * 1.2 + i) * L * 0.01;
      legSeg(c, bw * 0.3, by, L * s, by - L * (0.2 - i * 0.03) + sway, L * (s + 0.12), 0, "#e8743b", lw);
      legSeg(c, -bw * 0.3, by, -L * s, by - L * (0.2 - i * 0.03) - sway, -L * (s + 0.12), 0, "#e8743b", lw);
    }
    legSeg(c, bw * 0.5, by + bw * 0.2, L * 0.25, by - L * 0.05, L * 0.32, by + L * 0.1, "#e8743b", lw * 1.2);
    fillEll(c, L * 0.32, by + L * 0.11, L * 0.03, L * 0.02, "#f8a26b");
    fillEll(c, 0, by, bw, bw * 0.85, "#e8743b");
    for (i = 0; i < 5; i++) circle(c, (i - 2) * bw * 0.35, by - bw * 0.2 + (i % 2) * bw * 0.25, bw * 0.08, "#ffd9b8");
    eye(c, bw * 0.6, by - bw * 0.7, bw * 0.16);
  };

  DRAW.frilled = function (c, u, t, mode) {
    if (mode === "glow") return;
    var L = u, n = 18, i, pts = [];
    for (i = 0; i <= n; i++) { var f = i / n; pts.push([L * 0.5 - f * L, Math.sin(t * 2 - f * 4) * L * 0.04 * f]); }
    c.beginPath();
    for (i = 0; i <= n; i++) { var hh = L * 0.055 * (1 - (i / n) * 0.75); if (i) c.lineTo(pts[i][0], pts[i][1] - hh); else c.moveTo(pts[i][0], pts[i][1] - hh * 0.6); }
    for (i = n; i >= 0; i--) { var h2 = L * 0.055 * (1 - (i / n) * 0.75); c.lineTo(pts[i][0], pts[i][1] + h2 * (i ? 1 : 0.6)); }
    c.closePath(); c.fillStyle = vgrad(c, -L * 0.05, L * 0.05, "#5b4636", "#8a7158"); c.fill();
    for (i = 0; i < 6; i++) {
      var x = L * (0.4 - i * 0.025), y = pts[2][1];
      c.beginPath(); c.moveTo(x, y - L * 0.045);
      for (var k = 0; k <= 4; k++) c.lineTo(x + (k % 2 ? L * 0.008 : -L * 0.004), y - L * 0.045 + k * L * 0.022);
      c.strokeStyle = "#f2e2cf"; c.lineWidth = Math.max(1, L * 0.006); c.stroke();
    }
    tri(c, pts[14][0], pts[14][1] - L * 0.02, pts[16][0], pts[16][1] - L * 0.02, pts[15][0], pts[15][1] - L * 0.06, "#5b4636");
    eye(c, L * 0.46, pts[0][1] - L * 0.012, L * 0.015);
    line(c, [L * 0.5, pts[0][1] + L * 0.015, L * 0.45, pts[0][1] + L * 0.02], "#2a1e15", Math.max(1, L * 0.006));
  };

  DRAW.goblin = function (c, u, t, mode) {
    if (mode === "glow") return;
    var L = u, h = u * 0.15, jaw = Math.max(0, Math.sin(t * 0.7)) * h * 0.25;
    c.save(); c.translate(-L * 0.32, 0); c.rotate(Math.sin(t * 2.5) * 0.15);
    c.beginPath(); c.moveTo(0, -h * 0.1); c.lineTo(-L * 0.22, -h * 0.55); c.lineTo(-L * 0.18, h * 0.05); c.lineTo(-L * 0.06, h * 0.25); c.closePath();
    c.fillStyle = "#d9a3a3"; c.fill(); c.restore();
    tri(c, -L * 0.05, -h * 0.45, -L * 0.15, -h * 0.4, -L * 0.1, -h * 0.75, "#d49a9a");
    tri(c, -L * 0.2, -h * 0.3, -L * 0.27, -h * 0.25, -L * 0.24, -h * 0.55, "#d49a9a");
    tri(c, L * 0.1, h * 0.35, -L * 0.02, h * 0.4, L * 0.0, h * 0.85, "#d49a9a");
    fishBody(c, L * 0.85, h, "#e6b3b3", "#f7d9d9", { thinTail: true });
    // ながい はな
    c.beginPath(); c.moveTo(L * 0.36, -h * 0.25); c.quadraticCurveTo(L * 0.58, -h * 0.3, L * 0.6, -h * 0.05);
    c.quadraticCurveTo(L * 0.5, h * 0.02, L * 0.36, h * 0.05); c.closePath(); c.fillStyle = "#efc2c2"; c.fill();
    c.beginPath(); c.moveTo(L * 0.4, h * 0.12); c.lineTo(L * 0.44, h * 0.32 + jaw); c.lineTo(L * 0.3, h * 0.32 + jaw * 0.6); c.closePath(); c.fillStyle = "#b07373"; c.fill();
    teeth(c, L * 0.42, h * 0.16, L * 0.32, h * 0.2, 3, h * 0.12, false);
    eye(c, L * 0.32, -h * 0.12, h * 0.12);
    for (var i = 0; i < 4; i++) line(c, [L * (0.24 - i * 0.025), -h * 0.15, L * (0.23 - i * 0.025), h * 0.15], "#c98d8d", Math.max(1, L * 0.004));
  };

  DRAW.tunicate = function (c, u, t, mode) {
    if (mode === "glow") return;
    var s = u, open = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.8));
    line(c, [0, 0, -s * 0.02, -s * 0.25, s * 0.05, -s * 0.4], "#d8c7b8", Math.max(3, s * 0.07));
    c.save(); c.translate(s * 0.08, -s * 0.55);
    fillEll(c, -s * 0.05, 0, s * 0.3, s * 0.24, "rgba(250,220,215,.9)");
    // くち（うわくちびる と したくちびる）
    c.beginPath(); c.moveTo(s * 0.0, -s * 0.05);
    c.quadraticCurveTo(s * 0.3, -s * (0.1 + open * 0.3), s * 0.45, -s * (0.05 + open * 0.2));
    c.quadraticCurveTo(s * 0.3, 0, s * 0.45, s * (0.05 + open * 0.2));
    c.quadraticCurveTo(s * 0.3, s * (0.1 + open * 0.3), 0, s * 0.05);
    c.closePath(); c.fillStyle = "rgba(255,200,195,.95)"; c.fill();
    fillEll(c, s * 0.22, 0, s * 0.1, s * open * 0.16, "#b8505a");
    c.restore();
  };

  DRAW.sponge = function (c, u, t, mode) {
    if (mode === "glow") return;
    var H = u, w0 = u * 0.12, w1 = u * 0.2, i;
    c.beginPath(); c.moveTo(-w0, 0); c.quadraticCurveTo(-w1 * 1.1, -H * 0.5, -w1, -H); c.lineTo(w1, -H); c.quadraticCurveTo(w1 * 1.1, -H * 0.5, w0, 0); c.closePath();
    c.fillStyle = "rgba(245,236,214,.55)"; c.fill();
    c.save(); c.clip();
    for (i = 0; i < 9; i++) line(c, [-w1 * 1.2, -H * (i / 8), w1 * 1.2, -H * (i / 8) - H * 0.05], "rgba(255,248,230,.95)", Math.max(1, u * 0.012));
    for (i = -3; i <= 3; i++) line(c, [i * w0 * 0.35, 0, i * w1 * 0.35, -H], "rgba(255,248,230,.95)", Math.max(1, u * 0.012));
    for (i = -4; i <= 4; i++) line(c, [i * w1 * 0.3 - w1, 0, i * w1 * 0.3 + w1, -H], "rgba(255,248,230,.6)", Math.max(1, u * 0.008));
    c.restore();
    ell(c, 0, -H, w1, w1 * 0.25); c.fillStyle = "rgba(255,248,230,.95)"; c.fill();
    // なか の エビ
    var sy = -H * (0.45 + 0.03 * Math.sin(t));
    fillEll(c, -w0 * 0.2, sy, w0 * 0.35, w0 * 0.15, "rgba(255,170,150,.9)", 0.3);
    fillEll(c, w0 * 0.25, sy - H * 0.12, w0 * 0.35, w0 * 0.15, "rgba(255,170,150,.9)", -0.3);
  };

  DRAW.isopod = function (c, u, t, mode) {
    if (mode === "glow") return;
    var L = u, h = u * 0.3, i, wk = Math.sin(t * 3) * L * 0.01;
    for (i = 0; i < 7; i++) {
      var x = L * (0.3 - i * 0.09);
      line(c, [x, -h * 0.15, x + L * 0.03 + (i % 2 ? wk : -wk), 0], "#9b8fb0", Math.max(2, L * 0.02));
    }
    quad(c, L * 0.42, -h * 0.35, L * 0.6, -h * 0.75, L * 0.66, -h * 0.4, "#9b8fb0", Math.max(1.5, L * 0.012));
    tri(c, -L * 0.4, -h * 0.25, -L * 0.52, -h * 0.05, -L * 0.36, -h * 0.05, "#b4a8c8");
    c.beginPath(); c.moveTo(-L * 0.42, -h * 0.12);
    c.bezierCurveTo(-L * 0.35, -h * 1.15, L * 0.35, -h * 1.15, L * 0.46, -h * 0.25);
    c.lineTo(L * 0.42, -h * 0.12); c.closePath();
    c.fillStyle = vgrad(c, -h, 0, "#d6cfe0", "#a99cc0"); c.fill();
    for (i = 1; i < 8; i++) {
      var sx = L * (0.38 - i * 0.1);
      quad(c, sx, -h * 0.15, sx + L * 0.03, -h * 0.85, sx + L * 0.015, -h * 0.88, "rgba(120,105,150,.55)", Math.max(1, L * 0.01));
    }
    fillEll(c, L * 0.36, -h * 0.4, L * 0.05, h * 0.12, "#2d2a3a", -0.3);
    circle(c, L * 0.375, -h * 0.45, L * 0.012, "#ffffff");
  };

  DRAW.fangtooth = function (c, u, t, mode) {
    if (mode === "glow") return;
    var L = u, h = u * 0.48;
    tailFin(c, L, h * 0.7, "#2a2522", Math.sin(t * 5) * 0.2, false);
    fishBody(c, L, h, "#3a322d", "#544a43", { bluntNose: true });
    tri(c, L * 0.0, -h * 0.45, -L * 0.18, -h * 0.35, -L * 0.1, -h * 0.65, "#2a2522");
    c.beginPath(); c.moveTo(L * 0.5, h * 0.0); c.lineTo(L * 0.12, h * 0.22); c.lineTo(L * 0.48, h * 0.3); c.closePath(); c.fillStyle = "#1a1512"; c.fill();
    teeth(c, L * 0.5, -h * 0.0, L * 0.25, h * 0.1, 3, h * 0.28, false);
    teeth(c, L * 0.48, h * 0.3, L * 0.22, h * 0.25, 3, h * 0.25, true);
    eye(c, L * 0.3, -h * 0.22, h * 0.11);
  };

  DRAW.gulper = function (c, u, t, mode) {
    var L = u, n = 16, i, pts = [], open = 0.6 + 0.4 * Math.sin(t * 0.9);
    for (i = 0; i <= n; i++) { var f = i / n; pts.push([L * 0.18 - f * L * 0.7, Math.sin(t * 2.4 - f * 5) * L * 0.05 * f]); }
    var tip = pts[n];
    if (mode === "glow") { glowDot(c, tip[0] - L * 0.02, tip[1], u * 0.1, "rgba(255,120,180,.85)"); return; }
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1] - L * 0.04);
    for (i = 1; i <= n; i++) c.lineTo(pts[i][0], pts[i][1] - L * 0.03 * (1 - i / n) - 0.5);
    for (i = n; i >= 0; i--) c.lineTo(pts[i][0], pts[i][1] + L * 0.03 * (1 - i / n) + 0.5);
    c.closePath(); c.fillStyle = "#1e1b26"; c.fill();
    circle(c, tip[0] - L * 0.02, tip[1], L * 0.014, "#ff9ac6");
    // ふくろ の くち
    c.beginPath(); c.moveTo(L * 0.12, -L * 0.04);
    c.lineTo(L * 0.5, -L * (0.05 + 0.08 * open));
    c.quadraticCurveTo(L * 0.4, L * 0.0, L * 0.5, L * (0.04 + 0.16 * open));
    c.quadraticCurveTo(L * 0.25, L * (0.24 * open + 0.06), L * 0.12, L * 0.05);
    c.closePath(); c.fillStyle = "#2c2836"; c.fill();
    c.beginPath(); c.moveTo(L * 0.48, -L * (0.04 + 0.07 * open)); c.quadraticCurveTo(L * 0.38, 0, L * 0.48, L * (0.03 + 0.14 * open));
    c.strokeStyle = "#5a5070"; c.lineWidth = Math.max(1, L * 0.01); c.stroke();
    eye(c, L * 0.46, -L * (0.06 + 0.07 * open), L * 0.018);
  };

  DRAW.tripod = function (c, u, t, mode) {
    if (mode === "glow") return;
    var L = u * 0.75, h = L * 0.2, top = -u * 0.42, lw = Math.max(1.5, u * 0.012);
    line(c, [L * 0.05, top + h * 0.4, L * 0.15, 0], "#d7d2c4", lw);
    line(c, [-L * 0.05, top + h * 0.4, -L * 0.05, 0], "#d7d2c4", lw);
    line(c, [-L * 0.35, top + h * 0.1, -L * 0.6, 0], "#d7d2c4", lw);
    c.save(); c.translate(0, top);
    var sw = Math.sin(t * 1.3) * L * 0.04;
    quad(c, L * 0.2, -h * 0.1, L * 0.35, -h * 2.2 + sw, L * 0.55, -h * 2.4, "#d7d2c4", lw * 0.8);
    quad(c, L * 0.18, -h * 0.05, L * 0.45, -h * 1.6 - sw, L * 0.7, -h * 1.9, "#d7d2c4", lw * 0.8);
    tailFin(c, L, h, "#6d6458", 0, false);
    fishBody(c, L, h, "#7d7468", "#b9b1a3");
    eye(c, L * 0.38, -h * 0.12, h * 0.13);
    c.restore();
  };

  DRAW.dumbo = function (c, u, t, mode) {
    if (mode === "glow") return;
    var w = u * 0.4, f = Math.sin(t * 2.4) * 0.5, i;
    c.save(); c.translate(-w * 0.6, -w * 0.6); c.rotate(-0.3 - f); fillEll(c, -w * 0.15, 0, w * 0.32, w * 0.16, "#f3c8c0"); c.restore();
    c.save(); c.translate(w * 0.6, -w * 0.6); c.rotate(0.3 + f); fillEll(c, w * 0.15, 0, w * 0.32, w * 0.16, "#f3c8c0"); c.restore();
    c.beginPath(); c.moveTo(-w * 0.75, w * 0.0);
    for (i = -3; i <= 3; i++) {
      var x = i * w * 0.25, y = w * (0.8 + 0.08 * Math.sin(t * 2 + i));
      c.quadraticCurveTo(x - w * 0.12, y + w * 0.12, x, y);
    }
    c.lineTo(w * 0.75, 0); c.closePath(); c.fillStyle = "rgba(240,190,180,.95)"; c.fill();
    fillEll(c, 0, -w * 0.25, w * 0.68, w * 0.72, "#f6d3cb");
    fillEll(c, -w * 0.15, -w * 0.55, w * 0.25, w * 0.18, "rgba(255,240,236,.7)");
    eye(c, -w * 0.3, -w * 0.05, w * 0.16);
    eye(c, w * 0.3, -w * 0.05, w * 0.16);
  };

  DRAW.cucumber = function (c, u, t, mode) {
    if (mode === "glow") return;
    var L = u, h = u * 0.32, i, wk = Math.sin(t * 2);
    for (i = 0; i < 6; i++) {
      var x = L * (0.32 - i * 0.13);
      line(c, [x, -h * 0.25, x + (i % 2 ? 1 : -1) * wk * L * 0.02, 0], "#f2a7b8", Math.max(2, L * 0.04));
    }
    c.beginPath(); c.moveTo(-L * 0.45, -h * 0.2);
    c.bezierCurveTo(-L * 0.45, -h * 1.2, L * 0.48, -h * 1.25, L * 0.48, -h * 0.3);
    c.quadraticCurveTo(L * 0.4, -h * 0.05, -L * 0.45, -h * 0.2);
    c.fillStyle = "rgba(246,170,190,.92)"; c.fill();
    quad(c, L * 0.12, -h * 0.9, L * 0.1, -h * 1.6 + wk * h * 0.1, L * 0.2, -h * 1.9, "#f2a7b8", Math.max(2, L * 0.035));
    quad(c, L * 0.25, -h * 0.85, L * 0.3, -h * 1.5 - wk * h * 0.1, L * 0.38, -h * 1.7, "#f2a7b8", Math.max(2, L * 0.035));
    fillEll(c, -L * 0.1, -h * 0.75, L * 0.2, h * 0.15, "rgba(255,220,228,.6)");
    circle(c, L * 0.4, -h * 0.45, L * 0.02, "#a94a64");
  };

  DRAW.rattail = function (c, u, t, mode) {
    if (mode === "glow") return;
    var L = u, h = u * 0.22, i, pts = [];
    for (i = 0; i <= 10; i++) { var f = i / 10; pts.push([L * 0.15 - f * L * 0.62, Math.sin(t * 3 - f * 3) * L * 0.025 * f]); }
    c.beginPath(); c.moveTo(pts[0][0], -h * 0.45);
    for (i = 1; i <= 10; i++) c.lineTo(pts[i][0], pts[i][1] - h * 0.45 * (1 - i / 10));
    for (i = 10; i >= 0; i--) c.lineTo(pts[i][0], pts[i][1] + h * 0.4 * (1 - i / 10));
    c.closePath(); c.fillStyle = "#857a6c"; c.fill();
    c.beginPath(); c.moveTo(L * 0.5, -h * 0.05);
    c.quadraticCurveTo(L * 0.45, -h * 0.55, L * 0.15, -h * 0.5);
    c.lineTo(L * 0.1, h * 0.45); c.quadraticCurveTo(L * 0.42, h * 0.45, L * 0.5, -h * 0.05);
    c.fillStyle = vgrad(c, -h * 0.5, h * 0.5, "#95897a", "#c6bcae"); c.fill();
    tri(c, L * 0.1, -h * 0.45, -L * 0.02, -h * 0.4, L * 0.04, -h * 0.85, "#857a6c");
    line(c, [L * 0.4, h * 0.3, L * 0.42, h * 0.55], "#857a6c", Math.max(1, L * 0.008));
    eye(c, L * 0.34, -h * 0.15, h * 0.2);
  };

  DRAW.crab = function (c, u, t, mode) {
    if (mode === "glow") return;
    var w = u * 0.36, by = -u * 0.2, i, lw = Math.max(2, u * 0.04), cl = Math.sin(t * 1.5) * 0.15;
    for (i = 0; i < 3; i++) {
      line(c, [w * 0.5, by, w * (0.9 + i * 0.12), by - w * 0.25, w * (1.0 + i * 0.15), 0], "#f4efe6", lw);
      line(c, [-w * 0.5, by, -w * (0.9 + i * 0.12), by - w * 0.25, -w * (1.0 + i * 0.15), 0], "#f4efe6", lw);
    }
    c.save(); c.translate(w * 0.7, by - w * 0.4); c.rotate(-0.3 + cl);
    line(c, [-w * 0.3, w * 0.35, 0, 0], "#f4efe6", lw); fillEll(c, w * 0.05, -w * 0.12, w * 0.22, w * 0.14, "#fffaf0", -0.6); c.restore();
    c.save(); c.translate(-w * 0.7, by - w * 0.4); c.rotate(0.3 - cl);
    line(c, [w * 0.3, w * 0.35, 0, 0], "#f4efe6", lw); fillEll(c, -w * 0.05, -w * 0.12, w * 0.22, w * 0.14, "#fffaf0", 0.6); c.restore();
    fillEll(c, 0, by, w * 0.75, w * 0.55, "#fbf6ec");
    fillEll(c, 0, by + w * 0.15, w * 0.6, w * 0.3, "#efe5d3");
    circle(c, -w * 0.2, by - w * 0.35, w * 0.08, "#c9bfae");
    circle(c, w * 0.2, by - w * 0.35, w * 0.08, "#c9bfae");
  };

  DRAW.squat = function (c, u, t, mode) {
    if (mode === "glow") return;
    var L = u, h = u * 0.22, i, lw = Math.max(2, u * 0.035), cl = Math.sin(t * 1.3) * 0.12;
    for (i = 0; i < 3; i++) line(c, [L * (0.05 - i * 0.12), -h * 0.4, L * (0.1 - i * 0.14), -h * 0.15, L * (0.12 - i * 0.16), 0], "#f1e6d2", lw);
    c.save(); c.translate(L * 0.15, -h * 0.65); c.rotate(cl);
    line(c, [0, 0, L * 0.25, -h * 0.25, L * 0.45, -h * 0.1], "#f1e6d2", lw * 1.2);
    fillEll(c, L * 0.47, -h * 0.12, L * 0.06, h * 0.12, "#fff7ea"); c.restore();
    fillEll(c, 0, -h * 0.7, L * 0.22, h * 0.45, "#f8efdf");
    fillEll(c, -L * 0.25, -h * 0.55, L * 0.14, h * 0.32, "#efe2cb");
    // むね の け（バクテリア の はたけ）
    for (i = 0; i < 12; i++) {
      var x = L * (0.15 - i * 0.03);
      line(c, [x, -h * 0.35, x - L * 0.01, -h * 0.1], "rgba(255,255,255,.95)", Math.max(1, u * 0.012));
    }
    circle(c, L * 0.16, -h * 0.95, L * 0.025, "#d8b990");
    line(c, [L * 0.18, -h * 1.0, L * 0.45, -h * 1.9], "#f1e6d2", Math.max(1, u * 0.012));
  };

  DRAW.tubeworm = function (c, u, t, mode) {
    if (mode === "glow") return;
    var tubes = [[-0.18, 0.95, -0.08], [-0.05, 0.75, 0.05], [0.1, 1.05, 0.12], [0.22, 0.6, 0.2], [-0.28, 0.55, -0.2]];
    for (var i = 0; i < tubes.length; i++) {
      var tb = tubes[i], x = tb[0] * u, H = tb[1] * u, lean = tb[2] * u * 0.4 + Math.sin(t * 0.8 + i) * u * 0.02;
      quad(c, x, 0, x + lean * 0.3, -H * 0.5, x + lean, -H, "#f3eee2", Math.max(4, u * 0.08));
      var pr = u * 0.07 * (0.85 + 0.15 * Math.sin(t * 2 + i));
      fillEll(c, x + lean, -H - pr * 0.6, pr * 0.8, pr * 1.2, "#e03140");
      fillEll(c, x + lean - pr * 0.3, -H - pr * 0.9, pr * 0.4, pr * 0.6, "#ff6b6b");
    }
  };

  DRAW.snail = function (c, u, t, mode) {
    if (mode === "glow") return;
    var s = u, i, wk = Math.sin(t) * s * 0.01;
    c.beginPath(); c.moveTo(-s * 0.4, 0); c.quadraticCurveTo(-s * 0.4, -s * 0.18, -s * 0.1, -s * 0.2);
    c.lineTo(s * 0.4 + wk, -s * 0.12); c.quadraticCurveTo(s * 0.45 + wk, 0, s * 0.3, 0); c.closePath();
    c.fillStyle = "#2a2a2e"; c.fill();
    for (i = 0; i < 7; i++) {
      var x = -s * 0.32 + i * s * 0.1;
      c.beginPath(); c.arc(x, -s * 0.08, s * 0.07, Math.PI, 0); c.fillStyle = i % 2 ? "#3b3b44" : "#1d1d22"; c.fill();
      c.strokeStyle = "#7a7a88"; c.lineWidth = Math.max(1, s * 0.012); c.stroke();
    }
    circle(c, -s * 0.05, -s * 0.42, s * 0.26, "#8a5a2b");
    circle(c, -s * 0.02, -s * 0.46, s * 0.17, "#a8743d");
    circle(c, 0.01 * s, -s * 0.49, s * 0.09, "#c9935a");
    circle(c, 0.02 * s, -s * 0.5, s * 0.035, "#e6b680");
    line(c, [s * 0.32, -s * 0.12, s * 0.42, -s * 0.28], "#3b3b44", Math.max(1.5, s * 0.03));
  };

  DRAW.snailfish = function (c, u, t, mode) {
    if (mode === "glow") return;
    var L = u, h = u * 0.3, n = 12, i, pts = [];
    for (i = 0; i <= n; i++) { var f = i / n; pts.push([L * 0.2 - f * L * 0.7, Math.sin(t * 2.2 - f * 4) * L * 0.035 * f]); }
    c.beginPath(); c.moveTo(pts[0][0], -h * 0.45);
    for (i = 1; i <= n; i++) c.lineTo(pts[i][0], pts[i][1] - h * 0.5 * (1 - i / n * 0.9));
    for (i = n; i >= 0; i--) c.lineTo(pts[i][0], pts[i][1] + h * 0.45 * (1 - i / n * 0.9));
    c.closePath(); c.fillStyle = "rgba(250,215,220,.75)"; c.fill();
    c.beginPath(); c.moveTo(pts[0][0], -h * 0.3);
    for (i = 1; i <= n; i++) c.lineTo(pts[i][0], pts[i][1] - h * 0.3 * (1 - i / n));
    for (i = n; i >= 0; i--) c.lineTo(pts[i][0], pts[i][1] + h * 0.28 * (1 - i / n));
    c.closePath(); c.fillStyle = "rgba(255,228,232,.95)"; c.fill();
    fillEll(c, L * 0.25, 0, L * 0.25, h * 0.5, "#ffe4e8");
    fillEll(c, L * 0.18, h * 0.1, L * 0.1, h * 0.18, "rgba(240,160,170,.5)");
    eye(c, L * 0.36, -h * 0.12, h * 0.13);
    quad(c, L * 0.5, h * 0.02, L * 0.46, h * 0.12, L * 0.42, h * 0.1, "#c97b88", Math.max(1, L * 0.012));
  };

  function amphi(c, s, t) {
    var i;
    for (i = 0; i < 5; i++) line(c, [s * (0.15 - i * 0.1), s * 0.05, s * (0.18 - i * 0.1), s * 0.25 + Math.sin(t * 6 + i) * s * 0.03], "#f2ddd0", Math.max(1, s * 0.035));
    quad(c, s * 0.35, -s * 0.05, s * 0.6, -s * 0.3, s * 0.7, -s * 0.1, "#f2ddd0", Math.max(1, s * 0.03));
    c.beginPath(); c.moveTo(s * 0.4, 0);
    c.bezierCurveTo(s * 0.35, -s * 0.38, -s * 0.35, -s * 0.38, -s * 0.45, s * 0.05);
    c.quadraticCurveTo(-s * 0.4, s * 0.2, -s * 0.3, s * 0.12);
    c.quadraticCurveTo(0, s * 0.15, s * 0.4, 0);
    c.fillStyle = "#fbe9df"; c.fill();
    for (i = 1; i < 6; i++) line(c, [s * (0.35 - i * 0.13), -s * 0.22, s * (0.33 - i * 0.13), s * 0.08], "rgba(220,170,150,.7)", Math.max(1, s * 0.02));
    circle(c, s * 0.3, -s * 0.1, s * 0.05, "#4a2b2b");
  }
  DRAW.amphipod = function (c, u, t, mode) {
    if (mode === "glow") return;
    var g = [[0, 0, 1], [-0.45, 0.25, 0.8], [0.4, 0.35, 0.7]];
    for (var i = 0; i < g.length; i++) {
      c.save(); c.translate(g[i][0] * u, g[i][1] * u + Math.sin(t * 2 + i) * u * 0.03);
      amphi(c, u * 0.55 * g[i][2], t + i); c.restore();
    }
  };

  // ---- せんすいてい「たんけんごう」 ----
  function drawSub(c, L, t, mode, light, moving) {
    var h = L * 0.42;
    if (mode === "glow") {
      if (light) { glowDot(c, L * 0.42, -h * 0.55, L * 0.22, "rgba(255,250,220,.9)"); glowDot(c, L * 0.42, h * 0.1, L * 0.18, "rgba(255,250,220,.8)"); }
      return;
    }
    // プロペラ
    var pr = Math.sin(t * (moving ? 30 : 6));
    fillEll(c, -L * 0.55, 0, L * 0.03, h * 0.4 * Math.abs(pr) + 2, "#495057");
    line(c, [-L * 0.47, 0, -L * 0.56, 0], "#495057", Math.max(2, L * 0.03));
    // からだ
    c.beginPath();
    c.moveTo(-L * 0.45, -h * 0.25); c.quadraticCurveTo(-L * 0.45, -h * 0.5, -L * 0.25, -h * 0.5);
    c.lineTo(L * 0.25, -h * 0.5); c.quadraticCurveTo(L * 0.5, -h * 0.5, L * 0.5, 0);
    c.quadraticCurveTo(L * 0.5, h * 0.5, L * 0.25, h * 0.5);
    c.lineTo(-L * 0.25, h * 0.5); c.quadraticCurveTo(-L * 0.45, h * 0.5, -L * 0.45, h * 0.25);
    c.closePath();
    c.fillStyle = vgrad(c, -h * 0.5, h * 0.5, "#ffe066", "#f59f00"); c.fill();
    c.strokeStyle = "#e67700"; c.lineWidth = Math.max(1.5, L * 0.02); c.stroke();
    // せなか の ひれ
    c.beginPath(); c.moveTo(-L * 0.2, -h * 0.5); c.lineTo(-L * 0.1, -h * 0.85); c.lineTo(L * 0.12, -h * 0.85); c.lineTo(L * 0.2, -h * 0.5); c.closePath();
    c.fillStyle = "#ff922b"; c.fill();
    // まど と のって いる ひと
    circle(c, L * 0.24, -h * 0.05, h * 0.3, "#e67700");
    circle(c, L * 0.24, -h * 0.05, h * 0.25, "#a5d8ff");
    circle(c, L * 0.22, -h * 0.02, h * 0.12, "#ffd8a8");
    circle(c, L * 0.255, -h * 0.05, h * 0.02, "#343a40");
    circle(c, L * 0.2, -h * 0.05, h * 0.02, "#343a40");
    c.beginPath(); c.arc(L * 0.22, -h * 0.1, h * 0.12, Math.PI, 0); c.fillStyle = "#e03131"; c.fill();
    circle(c, L * 0.28, -h * 0.17, h * 0.05, "rgba(255,255,255,.8)");
    // ライト
    circle(c, L * 0.42, -h * 0.55, L * 0.035, light ? "#fffbe6" : "#868e96");
    circle(c, L * 0.42, h * 0.1, L * 0.03, light ? "#fffbe6" : "#868e96");
    line(c, [L * 0.42, -h * 0.5, L * 0.3, -h * 0.5], "#495057", Math.max(1.5, L * 0.02));
    // アーム
    line(c, [L * 0.1, h * 0.5, L * 0.3, h * 0.7, L * 0.42, h * 0.62], "#868e96", Math.max(2, L * 0.03));
    line(c, [L * 0.42, h * 0.62, L * 0.47, h * 0.55], "#868e96", Math.max(1.5, L * 0.02));
    line(c, [L * 0.42, h * 0.62, L * 0.48, h * 0.68], "#868e96", Math.max(1.5, L * 0.02));
    // しるし
    c.fillStyle = "#e67700"; c.font = "bold " + Math.round(h * 0.28) + "px sans-serif"; c.textAlign = "center";
    c.fillText("たんけん", -L * 0.12, h * 0.15);
  }

  // ---- うみ の そこ の かたち（よこ x[m] → ふかさ[m]） ----
  var FLOOR_PTS = [[0, 15], [300, 80], [600, 200], [800, 500], [1000, 1100], [1050, 1200], [1150, 1200],
    [1400, 1700], [1800, 2450], [1880, 2600], [2020, 2600], [2300, 3600], [2700, 4800], [3200, 5300],
    [4000, 5600], [4800, 6000], [5200, 7000], [5600, 8600], [6000, 10200], [6200, 10920], [6400, 10920],
    [6600, 9600], [7000, 7600], [7500, 6200], [8000, 6000]];
  var WORLD_W = 8000;
  function flat(x) { // でこぼこ を なくす ばしょ（ねっすい・海溝 の そこ・みなと）
    var f = 1, z = [[1100, 90], [1950, 100], [6300, 130]];
    for (var i = 0; i < z.length; i++) { var d = Math.abs(x - z[i][0]); if (d < z[i][1]) f = Math.min(f, d / z[i][1]); }
    if (x < 400) f = Math.min(f, x / 400);
    return f;
  }
  function floorAt(x) {
    if (x <= 0) return FLOOR_PTS[0][1];
    if (x >= WORLD_W) return FLOOR_PTS[FLOOR_PTS.length - 1][1];
    var i = 1; while (FLOOR_PTS[i][0] < x) i++;
    var a = FLOOR_PTS[i - 1], b = FLOOR_PTS[i], f = (x - a[0]) / (b[0] - a[0]);
    var s = f * f * (3 - 2 * f), base = a[1] + (b[1] - a[1]) * s;
    var bump = (Math.sin(x * 0.031) * 14 + Math.sin(x * 0.0113 + 1) * 22 + Math.sin(x * 0.071) * 6) * flat(x);
    return Math.max(10, base + bump * Math.min(1, base / 300));
  }

  root.SHINKAI_R = { DRAW: DRAW, drawSub: drawSub, floorAt: floorAt, WORLD_W: WORLD_W, glowDot: glowDot,
    eye: eye, circle: circle, line: line, vgrad: vgrad };
})(this);
