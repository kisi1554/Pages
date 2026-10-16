/* ============================================================
   ころころ そうち — ぶひん
   part = { t: しゅるい, x, y, a: かくど(°), fixed: うごかせない, ... }
   - build(world, parts) で ぶつりの からだを つくる
   - draw(ctx, ...) で かく
   node でも ブラウザでも よめる（window.KoroParts）
   ============================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./physics.js"));
  else root.KoroParts = factory(root.KoroPhysics);
})(typeof self !== "undefined" ? self : this, function (KP) {
  "use strict";

  var W = 1000, H = 600, FLOOR_Y = 580;
  var RAD = Math.PI / 180;
  var BUCKET_NEED = 3;      // バケツが さがる おもさ
  var BUCKET_DROP = 80;     // さがる きょり

  // ruby: [ひょうじめい, ふりがな つき HTML]
  var TYPES = {
    iron:   { name: "てつの ボール", html: "てつの ボール", icon: "⚫", group: "ball", r: 16, m: 5, e: 0.12, mu: 0.5 },
    rubber: { name: "ゴムの ボール", html: "ゴムの ボール", icon: "🔴", group: "ball", r: 18, m: 1, e: 0.62, mu: 0.6 },
    plateS: { name: "いた（みじかい）", html: "いた<small>みじかい</small>", icon: "▬", group: "plate", hw: 60, hh: 6 },
    plateM: { name: "いた（ふつう）", html: "いた<small>ふつう</small>", icon: "▬", group: "plate", hw: 100, hh: 6 },
    plateL: { name: "いた（ながい）", html: "いた<small>ながい</small>", icon: "▬", group: "plate", hw: 150, hh: 6 },
    domino: { name: "ドミノ", html: "ドミノ", icon: "▮", group: "domino", hw: 6, hh: 30, m: 1.2 },
    seesaw: { name: "シーソー", html: "シーソー", icon: "⚖️", group: "seesaw", hw: 130, hh: 6, m: 2.5, lim: 20 },
    spring: { name: "ばね", html: "ばね", icon: "🌀", group: "spring", hw: 38, hh: 10 },
    bucket: { name: "バケツ", html: "バケツ", icon: "🪣", group: "bucket" },
    wall:   { name: "かべ", html: "かべ", icon: "🧱", group: "wall", hw: 10, hh: 70 },
    fan:    { name: "ファン", html: "ファン", icon: "🌬️", group: "fan", hw: 22, hh: 22, len: 340, bw: 36, force: 2600 },
    bell:   { name: "ベル", html: "ベル", icon: "🔔", group: "bell", r: 22 },
    block:  { name: "だい", html: "だい", icon: "■", group: "block" }
  };
  // どうぐばこ の ならび
  var ORDER = ["iron", "rubber", "plateS", "plateM", "plateL", "domino", "seesaw", "spring", "bucket", "wall", "fan", "bell"];

  function clone(p) { return JSON.parse(JSON.stringify(p)); }

  /* ---------- からだを つくる ---------- */
  function build(parts, opt) {
    opt = opt || {};
    var world = new KP.World({ gravity: 1400, bounds: [-300, -1500, W + 300, H + 200] });
    // ゆか と みえない よこの かべ
    world.add({ type: "static", x: W / 2, y: FLOOR_Y + 40, shapes: [{ t: "b", hw: W / 2 + 60, hh: 40 }], e: 0.1, mu: 0.6, data: { floor: true } });
    world.add({ type: "static", x: -20, y: 0, shapes: [{ t: "b", hw: 20, hh: H * 2 }], e: 0.3, mu: 0.2, data: { edge: true } });
    world.add({ type: "static", x: W + 20, y: 0, shapes: [{ t: "b", hw: 20, hh: H * 2 }], e: 0.3, mu: 0.2, data: { edge: true } });
    var fans = [], dominoN = 0;
    parts.forEach(function (p, idx) {
      if (p.t === "domino") p._di = dominoN++;
      var T = TYPES[p.t]; if (!T) return;
      var a = (p.a || 0) * RAD, d = { part: p, idx: idx };
      var bodies = [];
      switch (T.group) {
        case "ball":
          bodies.push(world.add({ type: "dynamic", x: p.x, y: p.y, shapes: [{ t: "c", r: T.r }], m: T.m, e: T.e, mu: T.mu,
                                  linDamp: 0.03, angDamp: 0.35, data: d }));
          break;
        case "plate": case "wall":
          bodies.push(world.add({ type: "static", x: p.x, y: p.y, a: a, shapes: [{ t: "b", hw: T.hw, hh: T.hh }], e: 0.15, mu: 0.6, data: d }));
          break;
        case "block":
          bodies.push(world.add({ type: "static", x: p.x, y: p.y, a: a, shapes: [{ t: "b", hw: p.w / 2, hh: p.h / 2 }], e: 0.15, mu: 0.6, data: d }));
          break;
        case "spring":
          bodies.push(world.add({ type: "static", x: p.x, y: p.y, a: a, shapes: [{ t: "b", hw: T.hw, hh: T.hh }], e: 0.9, mu: 0.4, spring: true, data: d }));
          break;
        case "domino":
          bodies.push(world.add({ type: "dynamic", x: p.x, y: p.y, a: a, shapes: [{ t: "b", hw: T.hw, hh: T.hh }], m: T.m, e: 0.05, mu: 0.55,
                                  linDamp: 0.05, angDamp: 0.2, data: d }));
          break;
        case "seesaw":
          var lim = T.lim * RAD;
          bodies.push(world.add({ type: "pinned", x: p.x, y: p.y, a: Math.max(-lim, Math.min(lim, a)), m: T.m, e: 0.1, mu: 0.7,
                                  shapes: [{ t: "b", hw: T.hw, hh: T.hh }, { t: "b", ox: -T.hw + 4, oy: -T.hh - 9, hw: 4, hh: 9 }, { t: "b", ox: T.hw - 4, oy: -T.hh - 9, hw: 4, hh: 9 }],
                                  minA: -lim, maxA: lim, angDamp: 0.6, data: d }));
          bodies.push(world.add({ type: "static", x: p.x, y: p.y + 30, shapes: [{ t: "b", hw: 9, hh: 22 }], e: 0.1, mu: 0.6, data: { part: p, idx: idx, stand: true } }));
          break;
        case "fan":
          var fb = world.add({ type: "static", x: p.x, y: p.y, a: a, shapes: [{ t: "b", hw: T.hw, hh: T.hh }], e: 0.2, mu: 0.5, data: d });
          bodies.push(fb);
          fans.push({ b: fb, ux: Math.cos(a), uy: Math.sin(a) });
          break;
        case "bell":
          bodies.push(world.add({ type: "static", x: p.x, y: p.y, shapes: [{ t: "c", r: T.r }], e: 0.3, mu: 0.4, bell: true, data: d }));
          break;
        case "bucket":
          var dir = p.flip ? -1 : 1, span = p.span || 200, gy = p.gy || 0;
          var bk = world.add({ type: "kinematic", x: p.x, y: p.y, e: 0.05, mu: 0.6, data: d,
                               shapes: [{ t: "b", oy: 34, hw: 41, hh: 5 }, { t: "b", ox: -40, hw: 5, hh: 36 }, { t: "b", ox: 40, hw: 5, hh: 36 }] });
          var gate = world.add({ type: "kinematic", x: p.x + dir * span, y: p.y + gy, e: 0.1, mu: 0.4,
                                 shapes: [{ t: "b", hw: 8, hh: 60 }], data: { part: p, idx: idx, gate: true } });
          bodies.push(bk, gate);
          var st = { moved: 0, on: false, top: p.y - 130 };
          d.bucket = st;
          world.scripts.push(function (wd, dt) {
            if (!st.on) {
              var m = 0;
              for (var i = 0; i < wd.bodies.length; i++) {
                var o = wd.bodies[i];
                if (o.type !== "dynamic" || o.out) continue;
                var lx = o.x - bk.x, ly = o.y - bk.y;
                if (Math.abs(lx) < 36 && ly > -40 && ly < 32) m += o.m;
              }
              if (m >= BUCKET_NEED) { st.on = true; wd.events.push({ k: "bucket", a: bk, b: gate, v: 0 }); }
            }
            if (st.on && st.moved < BUCKET_DROP) {
              var v = 170, dd = Math.min(v * dt, BUCKET_DROP - st.moved);
              st.moved += dd;
              bk.vy = dd / dt; gate.vy = -dd / dt;
            } else { bk.vy = 0; gate.vy = 0; }
          });
          break;
      }
      p._bodies = bodies;
    });
    if (fans.length) {
      world.forces.push(function (wd, b, dt) {
        for (var i = 0; i < fans.length; i++) {
          var f = fans[i], T = TYPES.fan;
          var dx = b.x - f.b.x, dy = b.y - f.b.y;
          var along = dx * f.ux + dy * f.uy, side = -dx * f.uy + dy * f.ux;
          if (along < T.hw || along > T.len || Math.abs(side) > T.bw + b.radius * 0.5) continue;
          var F = T.force * (1 - 0.6 * along / T.len);
          if (b.sleeping) b.wake();
          b.vx += F * f.ux * dt / b.m; b.vy += F * f.uy * dt / b.m;
        }
      });
    }
    return world;
  }

  // ヘッドレスで うごかして ベルが なるか
  function simulate(parts, maxSec) {
    var world = build(clone(parts));
    var maxSteps = Math.round((maxSec || 20) / KP.DT);
    for (var i = 0; i < maxSteps; i++) {
      world.step();
      world.events.length = 0;
      if (world.bellHit) break;
    }
    return { hit: world.bellHit, time: world.bellTime, world: world };
  }

  /* ---------- あたり（タップ・ドラッグ） ---------- */
  function hitTest(world, x, y, pad) {
    var best = null, bestD = Infinity;
    for (var i = world.bodies.length - 1; i >= 0; i--) {
      var b = world.bodies[i];
      if (!b.data || !b.data.part) continue;
      for (var k = 0; k < b.shapes.length; k++) {
        var s = b.shapes[k], d;
        if (s.t === "c") d = Math.hypot(x - s.x, y - s.y) - s.r;
        else {
          var dx = x - s.x, dy = y - s.y;
          var lx = Math.abs(dx * s.ux + dy * s.uy) - s.hw, ly = Math.abs(-dx * s.uy + dy * s.ux) - s.hh;
          d = Math.hypot(Math.max(lx, 0), Math.max(ly, 0)) + Math.min(Math.max(lx, ly), 0);
        }
        if (d < pad && d < bestD) { bestD = d; best = b.data.part; }
      }
    }
    return best;
  }

  // タップで まわす
  function rotate(p) {
    var g = TYPES[p.t].group;
    if (g === "ball" || g === "bell" || g === "block") return false;
    if (g === "bucket") { p.flip = !p.flip; return true; }
    if (g === "seesaw") { var seq = { "0": 15, "15": -15, "-15": 0 }; p.a = seq[String(p.a || 0)] != null ? seq[String(p.a || 0)] : 0; return true; }
    p.a = ((p.a || 0) + 15) % 360;
    return true;
  }

  /* ---------- かく ---------- */
  var GRAY = { fill: "#c7cbd1", line: "#7b818a" };
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function boxPath(ctx, s, round) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.uy, s.ux));
    rr(ctx, -s.hw, -s.hh, s.hw * 2, s.hh * 2, Math.min(round || 3, s.hw, s.hh));
    ctx.restore();
  }
  function fillBox(ctx, s, fill, line, round) {
    boxPath(ctx, s, round);
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = line; ctx.stroke();
  }
  function pin(ctx, x, y) {   // うごかせない しるし（ねじ）
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#eef0f2"; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "#5c636b"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 2.6, y - 2.6); ctx.lineTo(x + 2.6, y + 2.6); ctx.stroke();
  }
  var DOMINO_COLORS = ["#4dabf7", "#ff6b6b", "#51cf66", "#fcc419", "#cc5de8"];

  function drawPart(ctx, p, t, sel) {
    var T = TYPES[p.t], bs = p._bodies; if (!T || !bs || !bs.length) return;
    var b = bs[0], s = b.shapes[0], fx = p.fixed;
    ctx.save();
    if (sel) { ctx.shadowColor = "rgba(95,61,196,.9)"; ctx.shadowBlur = 18; }
    switch (T.group) {
      case "ball":
        var r = s.r, gx = s.x - r * 0.35, gy = s.y - r * 0.4;
        var g = ctx.createRadialGradient(gx, gy, r * 0.15, s.x, s.y, r);
        if (p.t === "iron") { g.addColorStop(0, "#e9ecef"); g.addColorStop(0.45, "#6c757d"); g.addColorStop(1, "#343a40"); }
        else { g.addColorStop(0, "#ffc9c9"); g.addColorStop(0.5, "#fa5252"); g.addColorStop(1, "#c92a2a"); }
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = p.t === "iron" ? "#212529" : "#a61e1e"; ctx.stroke();
        ctx.shadowBlur = 0;
        // ころがりが わかる せん
        ctx.beginPath(); ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + Math.cos(b.a) * r * 0.8, s.y + Math.sin(b.a) * r * 0.8);
        ctx.strokeStyle = "rgba(255,255,255,.65)"; ctx.lineWidth = 3; ctx.stroke();
        if (p.t === "rubber") {
          ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.55, b.a + 1.2, b.a + 2.6);
          ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 2; ctx.stroke();
        }
        if (fx) pin(ctx, s.x, s.y);
        break;
      case "plate":
        fillBox(ctx, s, fx ? GRAY.fill : "#e8a85c", fx ? GRAY.line : "#9c5b17", 5);
        if (!fx) { // もくめ
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.uy, s.ux));
          ctx.strokeStyle = "rgba(156,91,23,.35)"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-s.hw * 0.7, -1); ctx.lineTo(s.hw * 0.3, -1); ctx.moveTo(-s.hw * 0.2, 2); ctx.lineTo(s.hw * 0.8, 2); ctx.stroke();
          ctx.restore();
        } else { pin(ctx, s.x - s.ux * (s.hw - 10), s.y - s.uy * (s.hw - 10)); pin(ctx, s.x + s.ux * (s.hw - 10), s.y + s.uy * (s.hw - 10)); }
        break;
      case "block":
        fillBox(ctx, s, "#d5d9de", "#868e96", 4);
        ctx.save(); boxPath(ctx, s, 4); ctx.clip();
        ctx.strokeStyle = "rgba(134,142,150,.35)"; ctx.lineWidth = 2;
        for (var k = -400; k < 400; k += 18) { ctx.beginPath(); ctx.moveTo(s.x + k, s.y - 300); ctx.lineTo(s.x + k + 300, s.y + 300); ctx.stroke(); }
        ctx.restore();
        break;
      case "wall":
        fillBox(ctx, s, fx ? GRAY.fill : "#f08c4a", fx ? GRAY.line : "#a3450e", 3);
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.uy, s.ux));
        ctx.strokeStyle = fx ? "rgba(91,99,107,.45)" : "rgba(163,69,14,.5)"; ctx.lineWidth = 1.5;
        for (var yy = -s.hh + 20; yy < s.hh; yy += 20) { ctx.beginPath(); ctx.moveTo(-s.hw, yy); ctx.lineTo(s.hw, yy); ctx.stroke(); }
        ctx.restore();
        if (fx) pin(ctx, s.x, s.y);
        break;
      case "domino":
        var ci = (p._di || 0) % DOMINO_COLORS.length;
        fillBox(ctx, s, fx ? GRAY.fill : DOMINO_COLORS[ci], fx ? GRAY.line : "#1f2d3d", 3);
        ctx.shadowBlur = 0;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.uy, s.ux));
        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.beginPath(); ctx.arc(0, -12, 2.4, 0, 7); ctx.arc(0, 12, 2.4, 0, 7); ctx.fill();
        ctx.restore();
        break;
      case "seesaw":
        var st = bs[1].shapes[0];
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - 22, st.y + st.hh); ctx.lineTo(b.x + 22, st.y + st.hh); ctx.closePath();
        ctx.fillStyle = fx ? GRAY.fill : "#ffd43b"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = fx ? GRAY.line : "#b07d00"; ctx.stroke();
        for (var q = 0; q < b.shapes.length; q++) fillBox(ctx, b.shapes[q], fx ? GRAY.fill : "#ff922b", fx ? GRAY.line : "#a14a00", 3);
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 7); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#5c3d00"; ctx.lineWidth = 2; ctx.stroke();
        break;
      case "spring":
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.uy, s.ux));
        var hw = s.hw, hh = s.hh, lc = fx ? GRAY.line : "#c92a2a";
        ctx.lineWidth = 3; ctx.strokeStyle = lc; ctx.beginPath();
        var n = 5;
        for (var i2 = 0; i2 <= n * 2; i2++) {
          var xx = -hw + 8 + (2 * hw - 16) * i2 / (n * 2), y2 = (i2 % 2 ? -1 : 1) * (hh - 4);
          if (i2 === 0) ctx.moveTo(xx, y2); else ctx.lineTo(xx, y2);
        }
        ctx.stroke();
        rr(ctx, -hw, -hh - 3, hw * 2, 6, 3); ctx.fillStyle = fx ? GRAY.fill : "#ff8787"; ctx.fill(); ctx.strokeStyle = lc; ctx.lineWidth = 2; ctx.stroke();
        rr(ctx, -hw, hh - 3, hw * 2, 6, 3); ctx.fill(); ctx.stroke();
        ctx.restore();
        break;
      case "fan":
        var ux = Math.cos((p.a || 0) * RAD), uy = Math.sin((p.a || 0) * RAD);
        // かぜ
        ctx.save(); ctx.shadowBlur = 0;
        ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(uy, ux));
        var Tf = TYPES.fan, ph = (t * 260) % 60;
        var grad = ctx.createLinearGradient(Tf.hw, 0, Tf.len, 0);
        grad.addColorStop(0, "rgba(116,192,252,.32)"); grad.addColorStop(1, "rgba(116,192,252,0)");
        ctx.fillStyle = grad; ctx.fillRect(Tf.hw, -Tf.bw, Tf.len - Tf.hw, Tf.bw * 2);
        ctx.strokeStyle = "rgba(51,154,240,.45)"; ctx.lineWidth = 2;
        for (var wx = Tf.hw + ph; wx < Tf.len - 20; wx += 60) {
          for (var wy = -22; wy <= 22; wy += 22) { ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 10, wy - 5, wx + 22, wy); ctx.stroke(); }
        }
        ctx.restore();
        fillBox(ctx, s, fx ? GRAY.fill : "#38d9a9", fx ? GRAY.line : "#087f5b", 8);
        ctx.shadowBlur = 0;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(t * 18);
        ctx.fillStyle = fx ? "#868e96" : "#e6fcf5";
        for (var bl = 0; bl < 3; bl++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.ellipse(0, -9, 5, 10, 0, 0, 7); ctx.fill(); }
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fillStyle = "#087f5b"; ctx.fill();
        ctx.restore();
        // むき やじるし
        ctx.save(); ctx.translate(s.x + ux * 30, s.y + uy * 30); ctx.rotate(Math.atan2(uy, ux));
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-2, -7); ctx.lineTo(-2, 7); ctx.closePath();
        ctx.fillStyle = fx ? "#868e96" : "#087f5b"; ctx.fill(); ctx.restore();
        break;
      case "bell":
        drawBell(ctx, s.x, s.y, s.r, p._ring || 0, t);
        break;
      case "bucket":
        var gate = bs[1], dir = p.flip ? -1 : 1, span = p.span || 200;
        var py = p.y - (p.ph || 160), p1 = p.x, p2 = p.x + dir * span;
        ctx.shadowBlur = 0;
        // ひも
        ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 2.5; ctx.beginPath();
        ctx.moveTo(b.x - 34, b.y - 30); ctx.lineTo(b.x, b.y - 58); ctx.lineTo(b.x + 34, b.y - 30);
        ctx.moveTo(b.x, b.y - 58); ctx.lineTo(p1, py + 12);
        ctx.moveTo(p1, py - 12); ctx.lineTo(p2, py - 12);
        ctx.moveTo(p2 + dir * 12 * 0, py + 12); ctx.lineTo(gate.x, gate.y - 60);
        ctx.stroke();
        [p1, p2].forEach(function (px) {
          ctx.beginPath(); ctx.arc(px, py, 12, 0, 7); ctx.fillStyle = fx ? "#dee2e6" : "#fff3bf"; ctx.fill();
          ctx.strokeStyle = fx ? GRAY.line : "#e67700"; ctx.lineWidth = 3; ctx.stroke();
          ctx.beginPath(); ctx.arc(px, py, 3, 0, 7); ctx.fillStyle = "#495057"; ctx.fill();
        });
        // バケツ
        if (sel) { ctx.shadowColor = "rgba(95,61,196,.9)"; ctx.shadowBlur = 18; }
        for (var q2 = 0; q2 < b.shapes.length; q2++) fillBox(ctx, b.shapes[q2], fx ? GRAY.fill : "#74c0fc", fx ? GRAY.line : "#1864ab", 3);
        // とびら
        fillBox(ctx, gate.shapes[0], fx ? "#ced4da" : "#d0bfff", fx ? GRAY.line : "#5f3dc4", 3);
        ctx.shadowBlur = 0;
        ctx.fillStyle = fx ? GRAY.line : "#5f3dc4";
        ctx.beginPath(); ctx.arc(gate.x, gate.y - 48, 3.5, 0, 7); ctx.fill();
        if (fx) pin(ctx, b.x, b.y + 34);
        break;
    }
    ctx.restore();
  }
  function drawBell(ctx, x, y, r, ring, t) {
    var sw = ring > 0 ? Math.sin(t * 30) * 0.35 * ring : 0;
    ctx.save();
    ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y - r - 22); ctx.lineTo(x - 16, y - r - 22); ctx.stroke();
    ctx.translate(x, y - r * 0.95); ctx.rotate(sw);
    var g = ctx.createLinearGradient(-r, 0, r, 0);
    g.addColorStop(0, "#f59f00"); g.addColorStop(0.45, "#ffe066"); g.addColorStop(1, "#e67700");
    ctx.beginPath();
    ctx.moveTo(-r * 0.15, 0); ctx.quadraticCurveTo(-r * 0.8, r * 0.1, -r * 0.8, r * 1.0);
    ctx.quadraticCurveTo(-r * 0.85, r * 1.45, -r * 1.15, r * 1.6);
    ctx.lineTo(r * 1.15, r * 1.6);
    ctx.quadraticCurveTo(r * 0.85, r * 1.45, r * 0.8, r * 1.0);
    ctx.quadraticCurveTo(r * 0.8, r * 0.1, r * 0.15, 0); ctx.closePath();
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#a35d00"; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, r * 1.75, r * 0.25, 0, 7); ctx.fillStyle = "#a35d00"; ctx.fill();
    ctx.beginPath(); ctx.arc(0, -2, r * 0.18, 0, 7); ctx.fill();
    ctx.restore();
    if (ring > 0) {
      ctx.save(); ctx.strokeStyle = "rgba(250,176,5," + Math.min(1, ring) + ")"; ctx.lineWidth = 3;
      for (var k = 1; k <= 2; k++) {
        ctx.beginPath(); ctx.arc(x, y, r + 14 * k + (t * 40) % 14, -0.9, 0.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, r + 14 * k + (t * 40) % 14, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
      }
      ctx.restore();
    }
  }

  return {
    W: W, H: H, FLOOR_Y: FLOOR_Y, TYPES: TYPES, ORDER: ORDER, BUCKET_NEED: BUCKET_NEED,
    build: build, simulate: simulate, hitTest: hitTest, rotate: rotate, drawPart: drawPart, clone: clone
  };
});
