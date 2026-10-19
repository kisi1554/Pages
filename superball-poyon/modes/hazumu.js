/* ============================================================
   ⑤ どれが いちばん はねる？
   - くらべる: 5つの ボールを おなじ たかさ（100cm）から ならべて おとし、
     はねかえった たかさを ものさしで くらべる。ゆかは 5しゅるい
     はねかえりけいすうは「ボール × ゆか」の ひょう（だいたいの あたい）
   - かいてんの ふしぎ: つくえの したに ななめに なげた スーパーボールが もどってくる
   ============================================================ */
(function (root) {
  "use strict";
  var P = root.SBPhysics, BL = root.SBBalls, AU = root.SBAudio, SB = root.SB, $ = SB.$, D = SB.data;

  var H = root.SBHazumu, BALLS = H.BALLS, FLOORS = H.FLOORS, E = H.E;

  var sub = "cmp", floor = "concrete", slow = false;
  var w = null, step = null, R = null, lay = null, recs = [], dropT = -1, ranked = false;
  var sw = null, sstep = null, spin = true, trail = [], sball = null, sk = 1, desk = null, thrown = false;

  function S() { return SB.S; }

  /* ---------- くらべる ---------- */
  function layoutCmp() {
    R = SB.rect();
    var top = R.y0 + 56, bot = R.y1 - 30, H = bot - top - 40;   // 100cm の たかさ（ピクセル）
    lay = { top: top, floor: bot, H: H, cm: H / 100, x0: R.x0 + 70, x1: R.x1 - 10 };
    lay.lane = (lay.x1 - lay.x0) / BALLS.length;
  }
  function buildCmp() {
    layoutCmp();
    w = new P.World({ gy: 980 * lay.cm, substeps: 8, air: 0, sleep: false });
    w.setBounds(R.x0 - 5000, R.y0 - 5000, R.x1 + 5000, lay.floor, { open: true });
    step = SB.stepper(function (h) { w.step(h); });
    recs = BALLS.map(function () { return null; });
    dropT = -1; ranked = false;
    BALLS.forEach(function (bd, i) {
      var r = bd.r * S();
      var b = w.add({ x: lay.x0 + lay.lane * (i + 0.5), y: lay.floor - lay.H - r, r: r, e: E[bd.id][floor], et: 0, mu: 0 });
      b.fixed = true;
      b.data = { bd: bd, i: i, hit: false, top: Infinity, done: false, sq: 0 };
    });
    w.onHit = function (b, o, sp) {
      var d = b.data;
      d.sq = Math.min(0.35, sp / 2500 * (1 - E[d.bd.id][floor] * 0.5));
      if (!d.hit) { d.hit = true; hitSound(d.bd, sp); }
    };
  }
  function hitSound(bd, sp) {
    if (bd.id === "bowling") AU.boom();
    else if (floor === "futon") AU.whoosh(false);
    else AU.poyon(bd.r * S() * 1.4, sp);
  }
  function drop() {
    buildCmp();
    w.bodies.forEach(function (b) { b.fixed = false; });
    dropT = 0;
    AU.whoosh(false);
  }

  function updCmp(dt) {
    if (!w) return;
    step(slow ? dt * 0.25 : dt);
    if (dropT < 0) return;
    dropT += slow ? dt * 0.25 : dt;
    w.bodies.forEach(function (b) {
      var d = b.data;
      if (d.sq > 0.002) d.sq *= Math.exp(-12 * dt); else d.sq = 0;
      if (!d.hit || d.done) return;
      d.top = Math.min(d.top, b.y);
      if (b.vy >= 0 && b.y < lay.floor - b.r - 1) {   // いちばん たかい ところ
        d.done = true;
        recs[d.i] = Math.max(0, Math.round((lay.floor - b.r - d.top) / lay.cm));
      } else if (dropT > 1.2 && b.y >= lay.floor - b.r - 1 && Math.abs(b.vy) < 5) { d.done = true; recs[d.i] = 0; }
    });
    if (!ranked && recs.every(function (r) { return r != null; })) {
      ranked = true;
      var best = recs.indexOf(Math.max.apply(null, recs));
      setTimeout(function () { if (SB.curId === "hazumu" && sub === "cmp") { AU.kira(); SB.toast("いちばん はねたのは " + BALLS[best].name + "！ " + recs[best] + "cm", 3000); } }, 400);
    }
  }

  function drawFloor(c) {
    var y = lay.floor, x0 = R.x0, x1 = R.x1, h = R.y1 - y;
    var cols = { concrete: ["#adb5bd", "#868e96"], wood: ["#d9a066", "#b07d45"], tatami: ["#c5d86d", "#9aa94b"], futon: ["#fff0f6", "#faa2c1"], tramp: ["#343a40", "#1c7ed6"] }[floor];
    c.fillStyle = cols[0]; c.fillRect(x0, y, x1 - x0, h);
    c.strokeStyle = cols[1]; c.lineWidth = 2;
    if (floor === "wood") for (var x = x0; x < x1; x += 70) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, R.y1); c.stroke(); }
    else if (floor === "tatami") { for (var t = y + 4; t < R.y1; t += 5) { c.beginPath(); c.moveTo(x0, t); c.lineTo(x1, t); c.stroke(); } c.fillStyle = "#2b8a3e"; c.fillRect(x0, y, x1 - x0, 5); }
    else if (floor === "futon") { c.fillStyle = cols[1]; for (var f = x0 + 10; f < x1; f += 40) { c.beginPath(); c.arc(f, y + 12, 5, 0, 7); c.fill(); } c.fillStyle = "#fff"; c.beginPath(); c.ellipse((x0 + x1) / 2, y + 2, (x1 - x0) / 2, 8, 0, Math.PI, 0); c.fill(); }
    else if (floor === "tramp") { c.fillStyle = cols[1]; c.fillRect(x0, y, x1 - x0, 6); }
    else { c.fillStyle = "rgba(0,0,0,.08)"; for (var g = 0; g < 40; g++) c.fillRect(x0 + (g * 97) % (x1 - x0), y + 4 + (g * 13) % Math.max(1, h - 6), 3, 3); }
  }

  function drawBallKind(c, bd, x, y, r, sq) {
    c.save(); c.translate(x, y);
    if (sq) c.scale(1 + sq * 0.6, 1 - sq);
    var g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, "#fff"); g.addColorStop(0.25, bd.col); g.addColorStop(1, BL.shade(bd.col, -0.35));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    if (bd.id === "tennis") { c.strokeStyle = "#fff"; c.lineWidth = r * 0.12; c.beginPath(); c.arc(-r * 1.1, 0, r * 0.95, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(r * 1.1, 0, r * 0.95, Math.PI - 0.9, Math.PI + 0.9); c.stroke(); }
    if (bd.id === "bowling") { c.fillStyle = "#1b1b3a"; [[-0.25, -0.35], [0.12, -0.42], [-0.05, -0.05]].forEach(function (q) { c.beginPath(); c.arc(q[0] * r, q[1] * r, r * 0.11, 0, 7); c.fill(); }); }
    if (bd.id === "gomu") { c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = r * 0.08; c.beginPath(); c.arc(0, 0, r * 0.98, -0.5, 1.2); c.stroke(); }
    if (bd.id === "pingpong") { c.strokeStyle = "rgba(0,0,0,.15)"; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); }
    c.restore();
  }

  function drawCmp(c) {
    var g = c.createLinearGradient(0, R.y0, 0, R.y1);
    g.addColorStop(0, "#f8f0fc"); g.addColorStop(1, "#e7f5ff");
    c.fillStyle = g; c.fillRect(R.x0, R.y0, R.w, R.h);
    drawFloor(c);
    // ものさし
    var rx = R.x0 + 14;
    c.fillStyle = "#fff3bf"; c.fillRect(rx, lay.floor - lay.H, 40, lay.H);
    c.strokeStyle = "#e67700"; c.lineWidth = 2; c.strokeRect(rx, lay.floor - lay.H, 40, lay.H);
    c.fillStyle = "#5c3d00"; c.font = "bold 12px sans-serif"; c.textAlign = "left"; c.textBaseline = "middle";
    for (var cm = 0; cm <= 100; cm += 5) {
      var y = lay.floor - cm * lay.cm, L = cm % 10 ? 8 : 16;
      c.beginPath(); c.moveTo(rx, y); c.lineTo(rx + L, y); c.stroke();
      if (cm % 20 === 0) c.fillText(cm + "", rx + 18, y);
    }
    c.fillText("cm", rx + 8, lay.floor - lay.H - 12);
    // おとす たかさ
    c.strokeStyle = "rgba(240,62,62,.5)"; c.setLineDash([8, 6]); c.lineWidth = 2;
    c.beginPath(); c.moveTo(lay.x0, lay.floor - lay.H); c.lineTo(lay.x1, lay.floor - lay.H); c.stroke(); c.setLineDash([]);
    c.fillStyle = "#e03131"; c.textAlign = "right"; c.fillText("100cm から おとす", lay.x1 - 4, lay.floor - lay.H - 12);
    // きろく
    var order = recs.every(function (r) { return r != null; }) ? recs.slice().sort(function (a, b) { return b - a; }) : null;
    w.bodies.forEach(function (b) {
      var d = b.data, cx = lay.x0 + lay.lane * (d.i + 0.5), rec = recs[d.i];
      if (rec != null) {
        var ry = lay.floor - rec * lay.cm;
        c.strokeStyle = d.bd.col === "#ffffff" ? "#868e96" : d.bd.col; c.lineWidth = 3;
        c.beginPath(); c.moveTo(cx - lay.lane * 0.42, ry); c.lineTo(cx + lay.lane * 0.42, ry); c.stroke();
        c.fillStyle = "#212529"; c.font = "bold " + Math.round(Math.min(20, lay.lane * 0.24)) + "px sans-serif"; c.textAlign = "center";
        c.fillText(rec + "cm", cx, ry - 14);
        if (order) {
          var rank = order.indexOf(rec);
          if (rank < 3) { c.font = Math.round(Math.min(30, lay.lane * 0.36)) + "px sans-serif"; c.fillText(["🥇", "🥈", "🥉"][rank], cx, ry - 38); }
        }
      }
      drawBallKind(c, d.bd, b.x, b.y, b.r, d.sq);
      c.fillStyle = "#495057"; c.font = "bold " + Math.round(Math.min(13, lay.lane * 0.16)) + "px sans-serif"; c.textAlign = "center";
      wrapName(c, d.bd.name, cx, lay.floor - lay.H - 44, lay.lane - 4);
    });
  }
  function wrapName(c, s, x, y, maxW) {
    if (c.measureText(s).width <= maxW) { c.fillText(s, x, y); return; }
    var parts = s.split(" ");
    if (parts.length > 1) { c.fillText(parts[0], x, y - 8); c.fillText(parts.slice(1).join(" "), x, y + 8); return; }
    var h = Math.ceil(s.length / 2);
    c.fillText(s.slice(0, h), x, y - 8); c.fillText(s.slice(h), x, y + 8);
  }

  function showTable() {
    var html = "<table class='e-table'><tr><th></th>" + FLOORS.map(function (f) { return "<th>" + f.ic + "<br>" + f.name + "</th>"; }).join("") + "</tr>";
    var best = {};
    FLOORS.forEach(function (f) { best[f.id] = Math.max.apply(null, BALLS.map(function (b) { return E[b.id][f.id]; })); });
    BALLS.forEach(function (b) {
      html += "<tr><th>" + b.name + "</th>" + FLOORS.map(function (f) {
        var e = E[b.id][f.id];
        return "<td" + (e === best[f.id] ? " class='top'" : "") + ">" + Math.round(e * e * 100) + "</td>";
      }).join("") + "</tr>";
    });
    html += "</table><small>100cm から おとした とき、もどる たかさ（cm・だいたい）。<br>" +
      "<ruby>反発係数<rt>はんぱつ けいすう</rt></ruby> e の 2じょう × 100 で けいさん。いちばん はねる ものに いろ</small>";
    SB.showResult({ badge: "📋 はねる たかさ の ひょう", title: "", msg: html, buttons: [{ label: "とじる", primary: true }] });
  }

  /* ---------- かいてんの ふしぎ ---------- */
  function buildSpin() {
    R = SB.rect();
    var floorY = R.y1 - 20, G = Math.min(R.h * 0.32, 220);
    sk = G / 150;
    var left = R.x0 + R.w * 0.38, right = R.x1 - 10;
    desk = { left: left, right: right, under: floorY - G, th: 40 * sk, floor: floorY };
    sw = new P.World({ gy: 1400 * sk, substeps: 8, air: 0, spinDamp: 0, sleep: false });
    sw.setBounds(R.x0 - 5000, R.y0 - 3000, R.x1 + 5000, floorY, { open: true });
    sw.boxes = [{ x: (left + right) / 2, y: desk.under - desk.th / 2, hw: (right - left) / 2, hh: desk.th / 2, e: 1 }];
    sstep = SB.stepper(function (h) { sw.step(h); });
    sw.onHit = function (b, o, sp) { b.data.sq = Math.min(0.3, sp / 5000); AU.poyon(b.r, sp, 1); };
    sball = null; trail = []; thrown = false;
  }
  function throwBall() {
    buildSpin();
    sball = sw.add({ x: desk.left - 100 * sk, y: desk.floor - 100 * sk, r: 15 * sk, vx: 900 * sk, vy: 600 * sk, e: 0.9, et: spin ? 0.85 : 0, mu: spin ? 1 : 0.02 });
    sball.data = { sq: 0 };
    thrown = true;
    AU.whoosh(false);
  }
  function updSpin(dt) {
    if (!sw) return;
    sstep(slow ? dt * 0.25 : dt);
    if (sball) {
      if (sball.data.sq > 0.002) sball.data.sq *= Math.exp(-12 * dt); else sball.data.sq = 0;
      trail.push([sball.x, sball.y]);
      if (trail.length > 400) trail.shift();
    }
  }
  function drawSpin(c) {
    var g = c.createLinearGradient(0, R.y0, 0, R.y1);
    g.addColorStop(0, "#fff9db"); g.addColorStop(1, "#ffe8cc");
    c.fillStyle = g; c.fillRect(R.x0, R.y0, R.w, R.h);
    c.fillStyle = "#d9a066"; c.fillRect(R.x0, desk.floor, R.w, R.y1 - desk.floor);
    // つくえ
    c.fillStyle = "#a0522d"; c.fillRect(desk.left, desk.under - desk.th, desk.right - desk.left, desk.th);
    c.fillStyle = "#8b4513";
    c.fillRect(desk.left + 6, desk.under, 16 * sk, desk.floor - desk.under);
    c.fillRect(desk.right - 22 * sk, desk.under, 16 * sk, desk.floor - desk.under);
    c.fillStyle = "#5c3d00"; c.font = "bold " + Math.round(16 * Math.max(1, sk * 0.8)) + "px sans-serif"; c.textAlign = "center";
    c.fillText("つくえ", (desk.left + desk.right) / 2, desk.under - desk.th - 12);
    // なげる ひと（て）
    c.font = Math.round(40 * sk) + "px sans-serif"; c.fillText("🫲", desk.left - 140 * sk, desk.floor - 110 * sk);
    // あと
    if (trail.length > 1) {
      c.strokeStyle = spin ? "rgba(240,62,62,.55)" : "rgba(28,126,214,.55)"; c.lineWidth = 3; c.setLineDash([6, 6]);
      c.beginPath(); c.moveTo(trail[0][0], trail[0][1]); trail.forEach(function (p) { c.lineTo(p[0], p[1]); }); c.stroke(); c.setLineDash([]);
    }
    if (sball) {
      BL.draw(c, spin ? "niko" : "mizuiro", sball.x, sball.y, sball.r, SB.dpr, { a: sball.a, sq: sball.data.sq, sqa: Math.PI / 2 });
      // かいてんの むき
      if (Math.abs(sball.w) > 2) {
        c.fillStyle = "#c92a2a"; c.font = "bold " + Math.round(22 * Math.max(1, sk * 0.8)) + "px sans-serif";
        c.fillText(sball.w > 0 ? "↻" : "↺", sball.x, sball.y - sball.r - 14);
      }
    }
    if (!thrown) {
      c.fillStyle = "#495057"; c.font = "bold 18px sans-serif"; c.textAlign = "center";
      c.fillText("「▶ なげる」で つくえの したへ ななめに なげるよ", (R.x0 + R.x1) / 2, R.y0 + 40);
    }
  }

  /* ---------- モード ---------- */
  function setSub(s) {
    sub = s;
    Array.prototype.forEach.call(document.querySelectorAll(".fl-btn"), function (b) { b.hidden = s !== "cmp"; });
    $("hzTable").hidden = s !== "cmp";
    $("hzSpinType").hidden = s !== "spin";
    $("hzTab").innerHTML = s === "cmp" ? "<span class='ic'>🌀</span><span>かいてん</span>" : "<span class='ic'>📏</span><span>くらべる</span>";
    $("hzGo").innerHTML = s === "cmp" ? "<span class='ic'>▶</span><span>おとす</span>" : "<span class='ic'>▶</span><span>なげる</span>";
    $("hzExplain").hidden = s !== "spin";
    if (s === "cmp") buildCmp(); else buildSpin();
    SB.cur.resize && setTimeout(function () { mode.resize(); }, 0);
  }
  function setFloor(f) {
    floor = f;
    Array.prototype.forEach.call(document.querySelectorAll(".fl-btn"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-fl") === f ? "true" : "false"); });
    buildCmp();
  }

  var mode = {
    title: "どれが いちばん はねる？",
    enter: function () {
      $("hazumuHud").hidden = false;
      slow = false; $("hzSlow").setAttribute("aria-pressed", "false");
      setFloor(floor);
      setSub("cmp");
    },
    exit: function () { $("hzExplain").hidden = true; },
    resize: function () {
      if (sub === "cmp") { var was = dropT >= 0; buildCmp(); if (was) dropT = -1; }
      else buildSpin();
    },
    update: function (dt) { if (sub === "cmp") updCmp(dt); else updSpin(dt); },
    draw: function (c) {
      c.fillStyle = "#fff5f5"; c.fillRect(0, 0, SB.W, SB.H);
      if (sub === "cmp") { if (w) drawCmp(c); } else if (sw) drawSpin(c);
    },
    down: function () {}
  };

  // ボタン
  var hud = $("hazumuHud");
  FLOORS.slice().reverse().forEach(function (f) {
    var b = document.createElement("button");
    b.className = "tool fl-btn"; b.setAttribute("data-fl", f.id); b.setAttribute("aria-pressed", "false");
    b.innerHTML = "<span class='ic'>" + f.ic + "</span><span>" + f.name + "</span>";
    b.addEventListener("click", function () { AU.tap(); setFloor(f.id); });
    hud.insertBefore(b, hud.firstChild);
  });
  $("hzGo").addEventListener("click", function () { AU.unlock(); if (sub === "cmp") drop(); else throwBall(); });
  $("hzSlow").addEventListener("click", function () { slow = !slow; $("hzSlow").setAttribute("aria-pressed", slow ? "true" : "false"); AU.tap(); });
  $("hzTable").addEventListener("click", function () { AU.tap(); showTable(); });
  $("hzTab").addEventListener("click", function () { AU.tap(); setSub(sub === "cmp" ? "spin" : "cmp"); });
  $("hzSpinType").addEventListener("click", function () {
    spin = !spin; AU.tap();
    $("hzSpinType").innerHTML = spin ? "<span class='ic'>🔴</span><span>スーパーボール</span>" : "<span class='ic'>🧊</span><span>つるつる</span>";
    throwBall();
  });

  mode.state = function () {
    return { sub: sub, floor: floor, recs: recs.slice(), ball: sball && { x: sball.x, y: sball.y, vx: sball.vx }, desk: desk };
  };
  mode.E = E; mode.BALLS = BALLS; mode.FLOORS = FLOORS;
  SB.modes.hazumu = mode;
})(window);
