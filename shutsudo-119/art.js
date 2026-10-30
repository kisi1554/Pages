/* ============================================================
   しゅつどう！ 119 — え（くるま・ひと・ほのお の キャラ）
   ぜんぶ Canvas の コード で かく オリジナル デザイン。
   ほんもの の じちたい の マーク や せいふく の もよう は つかわない。
   ============================================================ */
(function (root) {
  "use strict";

  var FONT = '"Hiragino Maru Gothic ProN","BIZ UDPGothic","Yu Gothic","Meiryo",system-ui,sans-serif';

  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }
  function wheel(g, cx, cy, r) {
    g.fillStyle = "#212529"; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.fillStyle = "#ced4da"; g.beginPath(); g.arc(cx, cy, r * 0.48, 0, 7); g.fill();
    g.fillStyle = "#868e96"; g.beginPath(); g.arc(cx, cy, r * 0.18, 0, 7); g.fill();
  }
  function label(g, txt, x, y, size, col) {
    g.fillStyle = col; g.font = "800 " + size + "px " + FONT; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(txt, x, y);
  }
  function lightBar(g, x, y, w, h, t) {
    var on = Math.floor(t * 4) % 2 === 0;
    rr(g, x, y, w, h, h / 2); g.fillStyle = "#495057"; g.fill();
    g.fillStyle = on ? "#ff2a2a" : "#8f1d1d"; rr(g, x + 1, y + 1, w / 2 - 1.5, h - 2, h / 2); g.fill();
    g.fillStyle = on ? "#8f1d1d" : "#ff2a2a"; rr(g, x + w / 2 + 0.5, y + 1, w / 2 - 1.5, h - 2, h / 2); g.fill();
    if (on) { g.fillStyle = "rgba(255,60,60,.25)"; g.beginPath(); g.arc(x + w / 4, y + h / 2, h * 1.8, 0, 7); g.fill(); }
    else { g.fillStyle = "rgba(255,60,60,.25)"; g.beginPath(); g.arc(x + w * 3 / 4, y + h / 2, h * 1.8, 0, 7); g.fill(); }
  }

  // ---------------- よこ から みた くるま ----------------
  // (x, y) は じめん（タイヤ の した）の ひだりはし。みぎ むき。 w は ぜんちょう。
  function side(g, id, x, y, w, t, o) {
    o = o || {};
    var u = w / 100;
    g.save(); g.translate(x, y);
    // かげ
    g.fillStyle = "rgba(0,0,0,.15)"; g.beginPath(); g.ellipse(50 * u, 0, 50 * u, 4 * u, 0, 0, 7); g.fill();
    if (id === "bike") { bike(g, u, t); g.restore(); return; }
    if (id === "patrol") { patrol(g, u, t, o); g.restore(); return; }
    if (id === "amb") { amb(g, u, t, o); g.restore(); return; }
    var red = id === "rescue" ? "#e8590c" : "#e03131";
    // にだい
    rr(g, 0, -34 * u, 72 * u, 28 * u, 3 * u); g.fillStyle = red; g.fill();
    // うんてんせき
    g.beginPath(); g.moveTo(70 * u, -6 * u); g.lineTo(70 * u, -40 * u); g.lineTo(88 * u, -40 * u);
    g.quadraticCurveTo(99 * u, -38 * u, 100 * u, -24 * u); g.lineTo(100 * u, -6 * u); g.closePath(); g.fill();
    g.fillStyle = "#a5d8ff"; rr(g, 77 * u, -36 * u, 18 * u, 12 * u, 2 * u); g.fill();
    g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(79 * u, -35 * u, 4 * u, 10 * u);
    // しろ い せん
    g.fillStyle = "#fff"; g.fillRect(0, -15 * u, 100 * u, 3 * u);
    // シャッター
    g.fillStyle = "rgba(0,0,0,.12)";
    for (var k = 0; k < 3; k++) rr(g, (4 + k * 22) * u, -31 * u, 19 * u, 14 * u, 1.5 * u), g.fill();
    label(g, id === "rescue" ? "きゅうじょ" : "しょうぼう", 36 * u, -24 * u, 8.5 * u, "#fff");
    if (id === "pump") {
      // ホース の まきとり と はしご
      g.fillStyle = "#adb5bd"; g.fillRect(4 * u, -40 * u, 60 * u, 3 * u);
      g.strokeStyle = "#ced4da"; g.lineWidth = 1.6 * u;
      for (k = 0; k < 8; k++) { g.beginPath(); g.moveTo((8 + k * 7) * u, -40 * u); g.lineTo((8 + k * 7) * u, -37 * u); g.stroke(); }
      g.fillStyle = "#fff3bf"; g.beginPath(); g.arc(14 * u, -9 * u, 4 * u, 0, 7); g.fill();
    } else if (id === "ladder") {
      var ext = o.ext || 0;
      g.save(); g.translate(14 * u, -38 * u); g.rotate(-ext * 1.0);
      var L = (66 + ext * 120) * u;
      g.fillStyle = "#dee2e6"; g.fillRect(0, -3 * u, L, 6 * u);
      g.strokeStyle = "#868e96"; g.lineWidth = 1.2 * u;
      for (k = 0; k * 5 * u < L; k++) { g.beginPath(); g.moveTo(k * 5 * u, -3 * u); g.lineTo(k * 5 * u, 3 * u); g.stroke(); }
      if (ext > 0.05) { g.fillStyle = "#f8f9fa"; rr(g, L - 4 * u, -10 * u, 12 * u, 10 * u, 2 * u); g.fill(); g.strokeStyle = red; g.stroke(); }
      g.restore();
      g.fillStyle = "#868e96"; g.fillRect(10 * u, -42 * u, 10 * u, 8 * u);
    } else if (id === "rescue") {
      g.fillStyle = "#495057"; g.fillRect(6 * u, -44 * u, 6 * u, 10 * u);
      g.strokeStyle = "#495057"; g.lineWidth = 3 * u; g.beginPath(); g.moveTo(9 * u, -42 * u); g.lineTo(40 * u, -52 * u); g.stroke();
      g.strokeStyle = "#212529"; g.lineWidth = 1 * u; g.beginPath(); g.moveTo(40 * u, -52 * u); g.lineTo(40 * u, -40 * u); g.stroke();
      g.fillStyle = "#fab005"; g.fillRect(37 * u, -41 * u, 6 * u, 3 * u);
    }
    lightBar(g, 76 * u, -46 * u, 18 * u, 6 * u, t);
    wheel(g, 18 * u, -6 * u, 8 * u); wheel(g, 40 * u, -6 * u, 8 * u); wheel(g, 84 * u, -6 * u, 8 * u);
    g.restore();
  }
  function amb(g, u, t, o) {
    g.beginPath(); g.moveTo(0, -6 * u); g.lineTo(0, -44 * u); g.lineTo(72 * u, -44 * u); g.lineTo(84 * u, -28 * u);
    g.lineTo(99 * u, -24 * u); g.quadraticCurveTo(101 * u, -22 * u, 100 * u, -6 * u); g.closePath();
    g.fillStyle = "#fff"; g.fill(); g.strokeStyle = "#ced4da"; g.lineWidth = 1 * u; g.stroke();
    g.fillStyle = "#e03131"; g.fillRect(0, -22 * u, 100 * u, 4 * u);
    g.fillStyle = "#a5d8ff"; g.beginPath(); g.moveTo(68 * u, -40 * u); g.lineTo(72 * u, -40 * u); g.lineTo(82 * u, -28 * u); g.lineTo(68 * u, -28 * u); g.closePath(); g.fill();
    g.fillStyle = "#e7f5ff"; rr(g, 30 * u, -40 * u, 30 * u, 11 * u, 2 * u); g.fill();
    // あかい じゅうじ では なく オリジナル の ほし マーク
    g.fillStyle = "#1c7ed6"; star6(g, 16 * u, -32 * u, 7 * u);
    label(g, "きゅうきゅう", 46 * u, -12 * u, 7.5 * u, "#e03131");
    if (o.open) { g.fillStyle = "#495057"; g.fillRect(-2 * u, -42 * u, 3 * u, 36 * u); }
    lightBar(g, 4 * u, -50 * u, 20 * u, 6 * u, t);
    lightBar(g, 60 * u, -50 * u, 14 * u, 6 * u, t + 0.13);
    wheel(g, 20 * u, -6 * u, 8 * u); wheel(g, 80 * u, -6 * u, 8 * u);
  }
  function star6(g, cx, cy, r) {
    g.save(); g.translate(cx, cy);
    for (var k = 0; k < 3; k++) { g.fillRect(-r * 0.18, -r, r * 0.36, r * 2); g.rotate(Math.PI / 3); }
    g.restore();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(cx, cy, r * 0.28, 0, 7); g.fill();
  }
  function patrol(g, u, t) {
    // した は くろ、まんなか（ドア）と やね は しろ
    g.beginPath(); g.moveTo(2 * u, -8 * u); g.lineTo(0, -20 * u); g.lineTo(22 * u, -24 * u); g.lineTo(34 * u, -38 * u);
    g.lineTo(70 * u, -38 * u); g.lineTo(82 * u, -24 * u); g.lineTo(99 * u, -21 * u); g.lineTo(100 * u, -8 * u); g.closePath();
    g.fillStyle = "#212529"; g.fill();
    g.fillStyle = "#fff"; g.fillRect(24 * u, -24 * u, 58 * u, 15 * u);
    g.beginPath(); g.moveTo(34 * u, -38 * u); g.lineTo(70 * u, -38 * u); g.lineTo(82 * u, -24 * u); g.lineTo(22 * u, -24 * u); g.closePath(); g.fill();
    g.fillStyle = "#a5d8ff";
    g.beginPath(); g.moveTo(36 * u, -35 * u); g.lineTo(51 * u, -35 * u); g.lineTo(51 * u, -26 * u); g.lineTo(28 * u, -26 * u); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(54 * u, -35 * u); g.lineTo(68 * u, -35 * u); g.lineTo(77 * u, -26 * u); g.lineTo(54 * u, -26 * u); g.closePath(); g.fill();
    label(g, "けいさつ", 53 * u, -16 * u, 7.5 * u, "#1c3d8f");
    g.fillStyle = "#ffd43b"; g.fillRect(96 * u, -19 * u, 4 * u, 3 * u);
    lightBar(g, 40 * u, -44 * u, 24 * u, 6 * u, t);
    wheel(g, 20 * u, -8 * u, 9 * u); wheel(g, 80 * u, -8 * u, 9 * u);
  }
  function bike(g, u, t) {
    wheel(g, 18 * u, -14 * u, 13 * u); wheel(g, 82 * u, -14 * u, 13 * u);
    g.fillStyle = "#f8f9fa"; g.strokeStyle = "#adb5bd"; g.lineWidth = 1 * u;
    g.beginPath(); g.moveTo(14 * u, -26 * u); g.lineTo(30 * u, -40 * u); g.lineTo(70 * u, -40 * u); g.lineTo(86 * u, -26 * u); g.lineTo(60 * u, -20 * u); g.lineTo(30 * u, -20 * u); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#212529"; g.fillRect(34 * u, -46 * u, 26 * u, 6 * u);
    g.strokeStyle = "#495057"; g.lineWidth = 3 * u; g.beginPath(); g.moveTo(74 * u, -40 * u); g.lineTo(82 * u, -14 * u); g.stroke();
    // のって いる ひと
    g.fillStyle = "#1c3d8f"; rr(g, 40 * u, -78 * u, 16 * u, 32 * u, 6 * u); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(50 * u, -88 * u, 10 * u, 0, 7); g.fill();
    g.fillStyle = "#212529"; g.fillRect(52 * u, -90 * u, 8 * u, 4 * u);
    g.strokeStyle = "#1c3d8f"; g.lineWidth = 5 * u; g.beginPath(); g.moveTo(52 * u, -68 * u); g.lineTo(72 * u, -52 * u); g.stroke();
    label(g, "けいさつ", 50 * u, -30 * u, 7 * u, "#1c3d8f");
    lightBar(g, 70 * u, -56 * u, 12 * u, 6 * u, t);
  }

  // ---------------- うえ から みた くるま ----------------
  // ちゅうしん (0,0)、みぎ むき（+x が まえ）。len は ながさ（px）
  function top(g, id, len, t, siren, blink) {
    var wd = len * (id === "bike" ? 0.32 : 0.48);
    var hl = len / 2, hw = wd / 2;
    g.fillStyle = "rgba(0,0,0,.22)"; rr(g, -hl + 2, -hw + 2, len, wd, wd * 0.3); g.fill();
    if (id === "bike") {
      g.fillStyle = "#f8f9fa"; rr(g, -hl, -hw, len, wd, hw); g.fill();
      g.fillStyle = "#1c3d8f"; g.beginPath(); g.arc(-len * 0.05, 0, hw * 0.85, 0, 7); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(len * 0.02, 0, hw * 0.55, 0, 7); g.fill();
    } else {
      var body = id === "pump" || id === "ladder" ? "#e03131" : id === "rescue" ? "#e8590c" : id === "npc" ? null : "#fff";
      g.fillStyle = body || "#74c0fc";
      rr(g, -hl, -hw, len, wd, wd * 0.25); g.fill();
      g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 0.8; g.stroke();
      if (id === "patrol") {
        g.fillStyle = "#212529"; rr(g, -hl, -hw, len * 0.22, wd, wd * 0.25); g.fill(); rr(g, hl - len * 0.2, -hw, len * 0.2, wd, wd * 0.25); g.fill();
        g.fillStyle = "#fff"; g.fillRect(-len * 0.16, -hw * 0.82, len * 0.38, wd * 0.82);
      }
      if (id === "amb") { g.fillStyle = "#e03131"; g.fillRect(-hl, -hw, len, wd * 0.12); g.fillRect(-hl, hw - wd * 0.12, len, wd * 0.12); }
      // まどガラス
      g.fillStyle = "#a5d8ff";
      rr(g, hl - len * (id === "patrol" ? 0.36 : 0.24), -hw * 0.75, len * 0.1, wd * 0.75, 1.5); g.fill();
      if (id === "ladder") {
        g.fillStyle = "#dee2e6"; g.fillRect(-hl - len * 0.12, -wd * 0.16, len * 0.86, wd * 0.32);
        g.strokeStyle = "#868e96"; g.lineWidth = 0.7;
        for (var k = 0; k < 8; k++) { var lx = -hl - len * 0.1 + k * len * 0.1; g.beginPath(); g.moveTo(lx, -wd * 0.16); g.lineTo(lx, wd * 0.16); g.stroke(); }
      }
      if (id === "pump") { g.fillStyle = "#adb5bd"; g.fillRect(-hl + len * 0.08, -wd * 0.2, len * 0.5, wd * 0.4); }
      if (id === "rescue") { g.fillStyle = "#495057"; g.fillRect(-hl + len * 0.05, -wd * 0.12, len * 0.45, wd * 0.24); }
      // あかい ランプ
      if (id !== "npc") {
        var on = Math.floor(t * 4) % 2 === 0, lx2 = hl - len * (id === "patrol" ? 0.5 : 0.36);
        g.fillStyle = siren && on ? "#ff2a2a" : "#a61e1e"; rr(g, lx2, -hw * 0.75, len * 0.08, hw * 0.7, 1.2); g.fill();
        g.fillStyle = siren && !on ? "#ff2a2a" : "#a61e1e"; rr(g, lx2, hw * 0.05, len * 0.08, hw * 0.7, 1.2); g.fill();
        if (siren) { g.fillStyle = "rgba(255,40,40,.22)"; g.beginPath(); g.arc(lx2, on ? -hw * 0.4 : hw * 0.4, len * 0.42, 0, 7); g.fill(); }
      }
    }
    // ウインカー
    if (blink) {
      var bo = Math.floor(t * 3) % 2 === 0;
      if (bo) {
        g.fillStyle = "#ffa94d";
        var sy = blink < 0 ? -hw : hw;
        g.beginPath(); g.arc(hl - 1.5, sy, 2.2, 0, 7); g.arc(-hl + 1.5, sy, 2.2, 0, 7); g.fill();
      }
    }
  }
  function npcTop(g, len, col, t, hazard) {
    var wd = len * 0.5, hl = len / 2, hw = wd / 2;
    g.fillStyle = "rgba(0,0,0,.22)"; rr(g, -hl + 2, -hw + 2, len, wd, wd * 0.3); g.fill();
    g.fillStyle = col; rr(g, -hl, -hw, len, wd, wd * 0.3); g.fill();
    g.fillStyle = "rgba(255,255,255,.25)"; rr(g, -hl * 0.4, -hw * 0.75, len * 0.42, wd * 0.75, 2); g.fill();
    g.fillStyle = "#a5d8ff"; rr(g, hl - len * 0.3, -hw * 0.72, len * 0.11, wd * 0.72, 1.5); g.fill();
    if (hazard && Math.floor(t * 3) % 2 === 0) {
      g.fillStyle = "#ffa94d";
      [[hl - 1.5, -hw], [hl - 1.5, hw], [-hl + 1.5, -hw], [-hl + 1.5, hw]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 2, 0, 7); g.fill(); });
    }
  }

  // ---------------- ひと（よこ から） ----------------
  // (x, y) は あしもと。h は せ の たかさ。
  function person(g, x, y, h, o) {
    o = o || {};
    var s = h / 100;
    g.save(); g.translate(x, y);
    if (o.flip) g.scale(-1, 1);
    g.fillStyle = "rgba(0,0,0,.15)"; g.beginPath(); g.ellipse(0, 0, 22 * s, 5 * s, 0, 0, 7); g.fill();
    var bob = o.walk ? Math.sin(o.walk * 10) * 3 * s : 0;
    // あし
    g.fillStyle = o.pants || "#495057";
    g.fillRect(-10 * s, -34 * s, 8 * s, 34 * s + (o.walk ? Math.sin(o.walk * 10) * 3 * s : 0));
    g.fillRect(2 * s, -34 * s, 8 * s, 34 * s - (o.walk ? Math.sin(o.walk * 10) * 3 * s : 0));
    // からだ
    g.fillStyle = o.shirt || "#4dabf7";
    rr(g, -16 * s, -72 * s + bob, 32 * s, 42 * s, 10 * s); g.fill();
    if (o.vest) { g.fillStyle = o.vest; g.fillRect(-16 * s, -50 * s + bob, 32 * s, 5 * s); }
    // うで
    g.strokeStyle = o.shirt || "#4dabf7"; g.lineWidth = 8 * s; g.lineCap = "round";
    var arm = o.wave ? Math.sin(o.wave * 8) * 0.5 - 1.6 : 0.2;
    g.beginPath(); g.moveTo(12 * s, -64 * s + bob); g.lineTo(12 * s + Math.sin(arm) * 26 * s, -64 * s + bob + Math.cos(arm) * 26 * s); g.stroke();
    g.beginPath(); g.moveTo(-12 * s, -64 * s + bob); g.lineTo(-18 * s, -40 * s + bob); g.stroke();
    // あたま
    var hy = -88 * s + bob;
    g.fillStyle = "#ffd8a8"; g.beginPath(); g.arc(0, hy, 18 * s, 0, 7); g.fill();
    g.fillStyle = o.hair || "#343a40";
    g.beginPath(); g.arc(0, hy - 3 * s, 18 * s, Math.PI * 1.05, Math.PI * 1.95); g.fill();
    if (o.white) { g.fillStyle = "#f1f3f5"; g.beginPath(); g.arc(0, hy - 3 * s, 18 * s, Math.PI * 1.05, Math.PI * 1.95); g.fill(); }
    if (o.hat) {
      g.fillStyle = o.hat; g.beginPath(); g.arc(0, hy - 6 * s, 17 * s, Math.PI, 0); g.fill();
      g.fillRect(0, hy - 8 * s, 24 * s, 4 * s);
    }
    if (o.helmet) {
      g.fillStyle = o.helmet; g.beginPath(); g.arc(0, hy - 4 * s, 20 * s, Math.PI, 0); g.fill();
      g.fillRect(-22 * s, hy - 6 * s, 44 * s, 4 * s);
    }
    // かお
    g.fillStyle = "#343a40";
    if (o.cry) {
      g.lineWidth = 2 * s; g.strokeStyle = "#343a40";
      g.beginPath(); g.moveTo(3 * s, hy - 2 * s); g.lineTo(9 * s, hy); g.stroke();
      g.fillStyle = "#74c0fc"; g.beginPath(); g.ellipse(8 * s, hy + 6 * s + ((o.t || 0) * 20 % 8) * s, 2.5 * s, 4 * s, 0, 0, 7); g.fill();
      g.strokeStyle = "#343a40"; g.beginPath(); g.arc(8 * s, hy + 12 * s, 4 * s, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    } else if (o.sleepy) {
      g.lineWidth = 2 * s; g.strokeStyle = "#343a40";
      g.beginPath(); g.moveTo(3 * s, hy); g.lineTo(10 * s, hy); g.stroke();
      g.beginPath(); g.arc(8 * s, hy + 8 * s, 3 * s, 0.2, Math.PI - 0.2); g.stroke();
    } else {
      g.beginPath(); g.arc(7 * s, hy - 1 * s, 2.4 * s, 0, 7); g.fill();
      g.strokeStyle = "#343a40"; g.lineWidth = 2 * s;
      g.beginPath(); g.arc(8 * s, hy + 6 * s, 4 * s, 0.2, Math.PI - 0.6); g.stroke();
    }
    if (o.mask) { g.fillStyle = "rgba(208,235,255,.9)"; g.beginPath(); g.ellipse(12 * s, hy + 6 * s, 7 * s, 8 * s, 0, 0, 7); g.fill(); g.strokeStyle = "#74c0fc"; g.lineWidth = 1.5 * s; g.stroke(); }
    g.fillStyle = "#ffc9c9"; g.beginPath(); g.arc(4 * s, hy + 5 * s, 3 * s, 0, 7); g.fill();
    g.restore();
  }

  // ---------------- ほのお の キャラ ----------------
  // hp: 0〜1（ちいさく なる）。hit: みず が あたって いる。run: にげて いる（0〜1）
  function flame(g, x, y, s, t, o) {
    o = o || {};
    var hp = o.hp == null ? 1 : o.hp, sc = s * (0.45 + 0.55 * hp);
    g.save(); g.translate(x, y);
    if (o.run) { g.globalAlpha = Math.max(0, 1 - o.run * 0.6); }
    var w = Math.sin(t * 9 + (o.seed || 0)) * 0.08;
    g.scale(sc, sc);
    g.rotate(w * 0.5);
    function blob(r, h, col) {
      g.fillStyle = col; g.beginPath();
      g.moveTo(0, -h); g.bezierCurveTo(r * 0.5, -h * 0.6, r, -h * 0.25, r, 0);
      g.arc(0, 0, r, 0, Math.PI); g.bezierCurveTo(-r, -h * 0.25, -r * 0.5, -h * 0.6, 0, -h); g.fill();
    }
    blob(30, 72 + Math.sin(t * 11) * 5, "#ff6b00");
    blob(21, 52 + Math.sin(t * 13) * 4, "#ffa94d");
    blob(13, 32, "#ffe066");
    // かお
    g.fillStyle = "#5c2b00"; g.strokeStyle = "#5c2b00"; g.lineWidth = 2.6;
    if (o.hit || o.run) {
      g.beginPath(); g.moveTo(-12, -14); g.lineTo(-6, -10); g.lineTo(-12, -6); g.stroke();
      g.beginPath(); g.moveTo(12, -14); g.lineTo(6, -10); g.lineTo(12, -6); g.stroke();
      g.beginPath(); g.ellipse(0, 6, 5, 6, 0, 0, 7); g.fill();
      g.fillStyle = "#74c0fc"; g.beginPath(); g.ellipse(22, -26, 4, 6, 0.4, 0, 7); g.fill();
    } else {
      g.beginPath(); g.arc(-9, -10, 3.4, 0, 7); g.arc(9, -10, 3.4, 0, 7); g.fill();
      g.beginPath(); g.arc(0, 2, 7, 0.15, Math.PI - 0.15); g.stroke();
      g.fillStyle = "rgba(255,80,80,.5)"; g.beginPath(); g.arc(-17, 0, 4, 0, 7); g.arc(17, 0, 4, 0, 7); g.fill();
    }
    g.restore();
  }

  function cloud(g, x, y, r, a) {
    g.fillStyle = "rgba(120,120,130," + (a == null ? 0.45 : a) + ")";
    g.beginPath(); g.arc(x, y, r, 0, 7); g.arc(x + r * 0.9, y + r * 0.2, r * 0.8, 0, 7); g.arc(x - r * 0.9, y + r * 0.25, r * 0.75, 0, 7); g.fill();
  }

  root.S119_ART = { side: side, top: top, npcTop: npcTop, person: person, flame: flame, cloud: cloud, rr: rr, label: label, FONT: FONT };
})(window);
