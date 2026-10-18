/* ============================================================
   ① じゆう あそび
   タップ: ぽん！と でる / フリック: つかんで はじく / ながおし: ぷくーっと ふくらむ
   かたむき・ふる / どかーん・むじゅうりょく・おかたづけ・よる・おんがく
   ============================================================ */
(function (root) {
  "use strict";
  var P = root.SBPhysics, BL = root.SBBalls, AU = root.SBAudio, SB = root.SB, $ = SB.$, D = SB.data;
  var MAX = 200;
  var w = null, step = null, rect = null, enterT = 0;
  var ptrs = new Map(), popping = [], splits = [], cleaning = null, pending = 0, shakeT = 0;
  var zeroG = false, tiltOn = false, tiltG = null, tiltGot = false, lastShake = 0, prevAG = null;
  var flash = {}, nightStars = [];

  /* ---------- おんがく: かべ と ゆか に ドレミ（ペンタトニック）---------- */
  var SEMI = [0, 2, 4, 7, 9];
  function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
  var WALLS = {
    floor: { base: 60, names: ["ど", "れ", "み", "そ", "ら"], col: "#ff8787" },          // C4〜A4
    left: { base: 72, names: ["ど", "れ", "み", "そ", "ら"], col: "#74c0fc" },           // C5〜A5
    right: { base: 69, names: ["ら", "ど", "れ", "み", "そ"], col: "#8ce99a", minor: true }, // A4〜G5
    top: { base: 84, names: ["ど", "れ", "み", "そ", "ら"], col: "#ffd43b" }             // C6〜A6
  };
  var NOTE_COL = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7"];
  function zoneOf(tag, x, y) {
    var f = tag === "floor" || tag === "top" ? (x - rect.x0) / (rect.x1 - rect.x0) : (rect.y1 - y) / (rect.y1 - rect.y0);
    return Math.max(0, Math.min(4, Math.floor(f * 5)));
  }
  function noteFreq(tag, i) {
    var wl = WALLS[tag];
    if (wl.minor) return hz([69, 72, 74, 76, 79][i]);
    return hz(wl.base + SEMI[i]);
  }

  function G() { return 1500 * SB.S; }
  function applyGravity() {
    if (!w) return;
    var gx = 0, gy = G();
    if (zeroG) gy = 0;
    else if (tiltOn && tiltG) { gx = tiltG.x * G(); gy = tiltG.y * G(); }
    var ch = Math.abs(gx - w.gx) + Math.abs(gy - w.gy);
    w.gx = gx; w.gy = gy;
    if (ch > 40) w.wakeAll();
  }

  function build() {
    rect = SB.rect();
    if (!w) {
      w = new P.World({ gy: G(), substeps: 6, maxSpeed: 3200 * SB.S });
      w.onHit = onHit;
      step = SB.stepper(function (h) { w.step(h); });
    }
    w.maxSpeed = 3200 * SB.S;
    w.setBounds(rect.x0, rect.y0, rect.x1, rect.y1);
    // がめんが かわったら そとに でた ボールを なかへ もどす
    var maxR = Math.min(rect.w, rect.h) * 0.45;
    w.bodies.forEach(function (b) {
      if (b.r > maxR) w.setRadius(b, maxR);
      b.x = Math.max(rect.x0 + b.r, Math.min(rect.x1 - b.r, b.x));
      b.y = Math.max(rect.y0 + b.r, Math.min(rect.y1 - b.r, b.y));
    });
    w.wakeAll();
    applyGravity();
    nightStars = [];
    for (var i = 0; i < 70; i++) nightStars.push([Math.random(), Math.random(), Math.random() * 1.6 + 0.4, Math.random() * 6]);
  }

  function onHit(b, o, sp, nx, ny) {
    var isBall = !!(o && o.data && o.r);
    SB.squash(b, sp, nx, ny);
    if (isBall) SB.squash(o, sp, -nx, -ny);
    var d = b.data, k = d.k;
    if (sp > 140 && w.time - d.ht > 0.06) {
      d.ht = w.time;
      pending++;
      if (D.music) {
        if (!isBall && WALLS[o.tag]) {
          var z = zoneOf(o.tag, b.x, b.y);
          AU.note(noteFreq(o.tag, z), sp);
          flash[o.tag + z] = 1;
        }
      } else AU.poyon(b.r, sp, b.id);
    }
    if (k.fx.split && sp > 1150 * SB.S && b.r > 13 * SB.S && d.gen < 3) splits.push(b);
    if (k.fx.sticky && !isBall && sp > 260) d.stick = 0.45;
    if (k.fx.nonstop && !isBall) {
      // ぜんぜん とまらない: はねかえる はやさを さいてい 650 に
      var vn = b.vx * nx + b.vy * ny, need = 650 * SB.S;
      if (vn < need && !zeroG) { b.vx += nx * (need - vn); b.vy += ny * (need - vn); }
    }
  }

  /* ---------- ボールを だす・けす ---------- */
  function pickKind() {
    if (D.sel !== "random" && BL.BY[D.sel] && D.own[D.sel] > 0) return BL.BY[D.sel];
    var pool = BL.KINDS.filter(function (k) { return k.group === "ふつう" || D.own[k.id] > 0; });
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function oldest() {
    for (var i = 0; i < w.bodies.length; i++) if (!w.bodies[i].fixed) return w.bodies[i];
    return null;
  }
  // 200こ を こえる ときと、おそく なった（45fps みまん）ときは ふるい ボールを ぽんっと けす
  function makeRoom() {
    var low = SB.fps < 45 && SB.t - enterT > 1.5 && w.bodies.length > 30;
    var o;
    while (w.bodies.length >= MAX && (o = oldest())) popBall(o, true);
    if (low && (o = oldest())) popBall(o, true);
  }
  function spawn(x, y, r, vx, vy) {
    makeRoom();
    var k = pickKind();
    if (r == null) r = SB.randR(k);
    x = Math.max(rect.x0 + r, Math.min(rect.x1 - r, x));
    y = Math.max(rect.y0 + r, Math.min(rect.y1 - r, y));
    return SB.makeBall(w, k, x, y, r, { vx: vx || 0, vy: vy || 0, w: (Math.random() - 0.5) * 6 });
  }
  function popBall(b, quiet) {
    w.remove(b);
    popping.push({ b: b, t: 0 });
    SB.fx.burst(b.x, b.y, b.data.k.col, 8, 200);
    if (!quiet) AU.pop(popping.length);
  }
  function doSplits() {
    var seen = {};
    splits.forEach(function (b) {
      if (seen[b.id] || w.bodies.indexOf(b) < 0 || w.bodies.length >= MAX) return;
      seen[b.id] = 1;
      var r = b.r / Math.SQRT2, sp = Math.hypot(b.vx, b.vy) || 1, px = -b.vy / sp, py = b.vx / sp;
      w.setRadius(b, r); b.data.gen++;
      var c = SB.makeBall(w, b.data.k, b.x + px * r, b.y + py * r, r, { vx: b.vx + px * 250, vy: b.vy + py * 250, gen: b.data.gen });
      b.x -= px * r; b.y -= py * r; b.vx -= px * 250; b.vy -= py * 250;
      c.data.born = b.data.born = SB.t - 1;
      SB.fx.burst(b.x, b.y, b.data.k.col2 || "#fff", 10, 240);
      AU.pop(3);
    });
    splits.length = 0;
  }

  /* ---------- ボタンの うごき ---------- */
  function boom() {
    var gx = w.gx, gy = w.gy, gl = Math.hypot(gx, gy);
    var ux = gl > 1 ? -gx / gl : 0, uy = gl > 1 ? -gy / gl : -1;
    w.bodies.forEach(function (b) {
      if (b.fixed) return;
      w.wake(b);
      var v = (900 + Math.random() * 700) * SB.S;
      b.vx += ux * v + (Math.random() - 0.5) * 500 * SB.S;
      b.vy += uy * v + (Math.random() - 0.5) * 300 * SB.S;
      b.w += (Math.random() - 0.5) * 20;
    });
    shakeT = 0.35;
    AU.boom();
    SB.fx.text((rect.x0 + rect.x1) / 2, rect.y1 - 60, "どかーん！", "#ff922b", 34);
  }
  function jumpAll() {
    var gl = Math.hypot(w.gx, w.gy), ux = gl > 1 ? -w.gx / gl : 0, uy = gl > 1 ? -w.gy / gl : -1;
    w.bodies.forEach(function (b) {
      if (b.fixed) return;
      w.wake(b);
      var v = (600 + Math.random() * 600) * SB.S;
      b.vx += ux * v + (Math.random() - 0.5) * 400; b.vy += uy * v + (Math.random() - 0.5) * 400;
    });
    AU.whoosh(true);
  }
  function clean() {
    if (cleaning || !w.bodies.length) return;
    ptrs.forEach(function (q) { if (q.b) q.b.fixed = false; if (q.puku) AU.stopPuku(); });
    ptrs.clear();
    var list = w.bodies.slice().sort(function (a, b) { return a.y - b.y; });
    cleaning = { list: list, i: 0, t: 0 };
  }
  function setPressed(id, on) { $(id).setAttribute("aria-pressed", on ? "true" : "false"); }

  /* ---------- かたむき（DeviceOrientation）と ふる（DeviceMotion）---------- */
  function screenAngle() {
    var a = (root.screen && root.screen.orientation && root.screen.orientation.angle) || root.orientation || 0;
    return a * Math.PI / 180;
  }
  function onOri(e) {
    if (e.beta == null || e.gamma == null) return;
    tiltGot = true;
    var b = e.beta * Math.PI / 180, g = e.gamma * Math.PI / 180;
    var dx = Math.sin(g), dy = Math.sin(b), a = -screenAngle();
    var x = dx * Math.cos(a) - dy * Math.sin(a), y = dx * Math.sin(a) + dy * Math.cos(a);
    if (!tiltG) tiltG = { x: x, y: y };
    tiltG.x += (x - tiltG.x) * 0.3; tiltG.y += (y - tiltG.y) * 0.3;
    applyGravity();
  }
  function onMot(e) {
    var a = e.acceleration, mag = 0;
    if (a && a.x != null) mag = Math.sqrt(a.x * a.x + a.y * a.y + (a.z || 0) * (a.z || 0));
    else if (e.accelerationIncludingGravity && e.accelerationIncludingGravity.x != null) {
      var g = e.accelerationIncludingGravity;
      if (prevAG) mag = Math.hypot(g.x - prevAG.x, g.y - prevAG.y, (g.z || 0) - (prevAG.z || 0));
      prevAG = { x: g.x, y: g.y, z: g.z };
    }
    if (mag > 14 && SB.t - lastShake > 0.7 && SB.curId === "free") { lastShake = SB.t; jumpAll(); }
  }
  function tiltAvailable() {
    if (typeof root.DeviceOrientationEvent === "undefined") return false;
    if (typeof root.DeviceOrientationEvent.requestPermission === "function") return true;
    return !!(root.matchMedia && root.matchMedia("(pointer: coarse)").matches);
  }
  function hideTilt(msg) {
    $("tTilt").hidden = true; tiltOn = false; tiltG = null; applyGravity();
    root.removeEventListener("deviceorientation", onOri); root.removeEventListener("devicemotion", onMot);
    if (msg) SB.toast(msg);
  }
  function startTilt() {
    tiltOn = true; tiltGot = false; setPressed("tTilt", true);
    root.addEventListener("deviceorientation", onOri);
    root.addEventListener("devicemotion", onMot);
    setTimeout(function () { if (tiltOn && !tiltGot) hideTilt("この たんまつ では かたむきが つかえないみたい"); }, 2000);
    SB.toast("📱 かたむけてみよう！ ふると ぜんぶ とびはねるよ");
  }
  function toggleTilt() {
    if (tiltOn) { tiltOn = false; tiltG = null; setPressed("tTilt", false); root.removeEventListener("deviceorientation", onOri); root.removeEventListener("devicemotion", onMot); applyGravity(); return; }
    var DOE = root.DeviceOrientationEvent, DME = root.DeviceMotionEvent;
    if (DOE && typeof DOE.requestPermission === "function") {
      // iPhone / iPad は ボタンを おした ときに きく
      DOE.requestPermission().then(function (st) {
        if (st !== "granted") { hideTilt("かたむきは つかえません"); return; }
        if (DME && typeof DME.requestPermission === "function") DME.requestPermission().catch(function () {});
        startTilt();
      }).catch(function () { hideTilt("かたむきは つかえません"); });
    } else startTilt();
  }

  /* ---------- パレット ---------- */
  function openPalette() {
    var g = $("palGrid"); g.innerHTML = "";
    var add = function (id, label, sub, kind) {
      var b = document.createElement("button");
      b.className = "pal-item" + (D.sel === id ? " on" : "");
      if (kind) { var c = document.createElement("canvas"); b.appendChild(c); } else { var s = document.createElement("span"); s.className = "ic"; s.textContent = "🎲"; b.appendChild(s); }
      var n = document.createElement("span"); n.textContent = label; b.appendChild(n);
      if (sub) { var m = document.createElement("small"); m.textContent = sub; b.appendChild(m); }
      b.addEventListener("click", function () { D.sel = id; SB.save(); AU.tap(); $("palette").hidden = true; setPalIcon(); });
      g.appendChild(b);
      if (kind) BL.thumb(b.querySelector("canvas"), kind);
    };
    add("random", "おまかせ", "いろいろ でる");
    SB.ownedKinds().forEach(function (k) { add(k.id, k.name, "×" + D.own[k.id], k); });
    $("palette").hidden = false;
  }
  function setPalIcon() {
    var k = BL.BY[D.sel];
    $("palIc").textContent = k && D.own[k.id] ? "🎨" : "🎲";
  }

  /* ---------- ゆび ---------- */
  function inside(p) { return p.x >= rect.x0 && p.x <= rect.x1 && p.y >= rect.y0 && p.y <= rect.y1; }
  function grab(q, b) {
    q.b = b; b.fixed = true; w.wake(b);
    q.ox = b.x - q.x; q.oy = b.y - q.y; b.vx = b.vy = 0;
  }
  function grabbed(b) { var f = false; ptrs.forEach(function (q) { if (q.b === b) f = true; }); return f; }
  function flick(q) {
    var h = q.hist, last = h[h.length - 1], i = h.length - 1;
    while (i > 0 && last[0] - h[i - 1][0] <= 0.1) i--;
    var f = h[i], dt = last[0] - f[0];
    if (dt < 0.012) return [0, 0];
    return [(last[1] - f[1]) / dt, (last[2] - f[2]) / dt];
  }

  var mode = {
    enter: function () {
      $("freeTools").hidden = false; $("counts").hidden = false;
      $("tTilt").hidden = !tiltAvailable();
      setPressed("tZero", zeroG); setPressed("tNight", D.night); setPressed("tMusic", D.music); setPressed("tTilt", tiltOn);
      setPalIcon();
      SB.run = 0; enterT = SB.t;
      build();
      if (!w.bodies.length) {
        for (var i = 0; i < 6; i++) spawn(rect.x0 + rect.w * (0.15 + i * 0.14), rect.y0 + 60 + Math.random() * 80, null, (Math.random() - 0.5) * 300, 0);
      }
    },
    exit: function () {
      ptrs.forEach(function (q) { if (q.b) q.b.fixed = false; });
      ptrs.clear(); AU.stopPuku();
      if (pending) { SB.addBounce(pending); pending = 0; }
      SB.save(true);
    },
    resize: build,
    update: function (dt) {
      // ゆびの ボール
      ptrs.forEach(function (q) {
        if (!q.moved && !q.puku && SB.t - q.st > 0.35) {
          if (!q.b) { var nb = spawn(q.x0, q.y0, 10 * SB.S); grab(q, nb); q.ox = q.oy = 0; }
          q.puku = true; AU.startPuku();
        }
        var b = q.b;
        if (!b) return;
        if (q.puku) {
          var maxR = Math.min(rect.w, rect.h) / 4;
          var r = Math.min(maxR, b.r * (1 + 1.3 * dt) + 16 * SB.S * dt);
          w.setRadius(b, r);
          AU.pukuSize(r / maxR);
        }
        var tx = Math.max(rect.x0 + b.r, Math.min(rect.x1 - b.r, q.x + q.ox));
        var ty = Math.max(rect.y0 + b.r, Math.min(rect.y1 - b.r, q.y + q.oy));
        b.vx = (tx - b.x) / dt; b.vy = (ty - b.y) / dt; b.w *= 0.9;
        b.x = tx; b.y = ty;
      });
      // ゴースト・スライム
      for (var i = 0; i < w.bodies.length; i++) {
        var b = w.bodies[i], d = b.data;
        SB.tickBall(b, dt);
        if (d.k.fx.ghost) b.noBall = ((SB.t + d.ghost) % 6) > 4.4;
        if (d.stick > 0) { d.stick -= dt; b.vx *= 0.5; b.vy *= 0.5; b.gs = 0.05; if (d.stick <= 0) b.gs = 1; }
      }
      step(dt);
      if (splits.length) doSplits();
      if (pending) { SB.addBounce(pending); pending = 0; }
      for (var f in flash) { flash[f] -= dt * 2.5; if (flash[f] <= 0) delete flash[f]; }
      for (i = popping.length - 1; i >= 0; i--) { popping[i].t += dt; if (popping[i].t > 0.2) popping.splice(i, 1); }
      if (cleaning) {
        cleaning.t += dt;
        while (cleaning.t > 0.035 && cleaning.i < cleaning.list.length) {
          cleaning.t -= 0.035;
          var cb = cleaning.list[cleaning.i++];
          if (w.bodies.indexOf(cb) >= 0) { popBall(cb, true); AU.pop(cleaning.i); }
        }
        if (cleaning.i >= cleaning.list.length) { cleaning = null; w.bodies.length = 0; }
      }
      if (shakeT > 0) shakeT -= dt;
    },
    draw: function (c) {
      var night = D.night;
      // まわり
      c.fillStyle = night ? "#0b1026" : "#fff5f5"; c.fillRect(0, 0, SB.W, SB.H);
      c.save();
      if (shakeT > 0) c.translate((Math.random() - 0.5) * 12 * shakeT / 0.35, (Math.random() - 0.5) * 12 * shakeT / 0.35);
      var g = c.createLinearGradient(0, rect.y0, 0, rect.y1);
      if (night) { g.addColorStop(0, "#141a3d"); g.addColorStop(1, "#1f1747"); }
      else { g.addColorStop(0, "#e7f5ff"); g.addColorStop(1, "#fff9db"); }
      c.fillStyle = g; c.fillRect(rect.x0, rect.y0, rect.w, rect.h);
      if (night) {
        nightStars.forEach(function (s) {
          c.globalAlpha = 0.4 + 0.4 * Math.sin(SB.t * 2 + s[3]);
          c.fillStyle = "#fff"; c.beginPath(); c.arc(rect.x0 + s[0] * rect.w, rect.y0 + s[1] * rect.h, s[2], 0, 7); c.fill();
        });
        c.globalAlpha = 1;
      }
      var bs = w.bodies, i;
      for (i = 0; i < bs.length; i++) SB.drawBall(c, bs[i]);
      // ぽんっと きえる
      popping.forEach(function (p) {
        var k = p.t / 0.2;
        BL.draw(c, p.b.data.k, p.b.x, p.b.y, p.b.r * (1 + k * 0.5), SB.dpr, { a: p.b.a, alpha: 1 - k });
      });
      if (night) {
        c.fillStyle = "rgba(5,8,30,.55)"; c.fillRect(rect.x0, rect.y0, rect.w, rect.h);
        c.globalCompositeOperation = "lighter";
        for (i = 0; i < bs.length; i++) {
          var k = bs[i].data.k;
          if (k.fx.glow || k.fx.nonstop || k.pat === "rame" || k.pat === "stars") BL.drawGlow(c, k, bs[i].x, bs[i].y, bs[i].r, SB.dpr, k.fx.glow ? 0.9 : 0.4);
        }
        c.globalCompositeOperation = "source-over";
        for (i = 0; i < bs.length; i++) if (bs[i].data.k.fx.glow || bs[i].data.k.fx.nonstop) SB.drawBall(c, bs[i]);
      }
      if (D.music) drawZones(c);
      // ふくらませ ちゅう
      ptrs.forEach(function (q) {
        if (!q.puku || !q.b) return;
        c.strokeStyle = night ? "rgba(255,255,255,.6)" : "rgba(240,62,62,.5)"; c.lineWidth = 3; c.setLineDash([8, 6]);
        c.beginPath(); c.arc(q.b.x, q.b.y, q.b.r + 8, 0, 7); c.stroke(); c.setLineDash([]);
      });
      c.restore();
    },
    down: function (p) {
      if (!inside(p) || cleaning) return;
      $("palette").hidden = true;
      var b = w.pick(p.x, p.y, 14 * SB.S);
      var q = { id: p.id, x0: p.x, y0: p.y, x: p.x, y: p.y, st: SB.t, hist: [[p.t, p.x, p.y]], b: null, moved: false, puku: false, ox: 0, oy: 0 };
      if (b && !grabbed(b)) grab(q, b);
      ptrs.set(p.id, q);
    },
    move: function (p) {
      var q = ptrs.get(p.id);
      if (!q) return;
      q.x = p.x; q.y = p.y;
      q.hist.push([p.t, p.x, p.y]);
      while (q.hist.length > 2 && p.t - q.hist[0][0] > 0.2) q.hist.shift();
      if (!q.moved && Math.hypot(p.x - q.x0, p.y - q.y0) > 12) {
        q.moved = true;
        // なにも ない ところを はじいたら、あたらしい ボールを なげる
        if (!q.b && !q.puku) { var nb = spawn(p.x, p.y); grab(q, nb); q.ox = q.oy = 0; }
      }
    },
    up: function (p, cancel) {
      var q = ptrs.get(p.id);
      if (!q) return;
      ptrs.delete(p.id);
      q.hist.push([p.t, p.x, p.y]);
      if (q.puku) AU.stopPuku();
      var b = q.b;
      if (b) {
        b.fixed = false; w.wake(b);
        var v = flick(q), cap = 3000 * SB.S, s = Math.hypot(v[0], v[1]);
        if (s > cap) { v[0] *= cap / s; v[1] *= cap / s; }
        b.vx = v[0]; b.vy = v[1];
        if (q.puku) { b.vy -= 650 * SB.S; b.vx += (Math.random() - 0.5) * 300; AU.whoosh(true); SB.fx.burst(b.x, b.y, "#fff", 14, 320); }
        else if (!q.moved && !cancel) { b.vy = -850 * SB.S; b.vx += (Math.random() - 0.5) * 300; AU.poyon(b.r, 1000, b.id); }
        else if (s > 300) AU.whoosh(false);
      } else if (!q.moved && !cancel && inside(p)) {
        spawn(q.x0, q.y0, null, (Math.random() - 0.5) * 200, -150 * SB.S);
        AU.pon();
      }
    }
  };

  function drawZones(c) {
    var th = 10, names = ["floor", "left", "right", "top"];
    c.font = "bold 13px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    names.forEach(function (tag) {
      for (var i = 0; i < 5; i++) {
        var f = flash[tag + i] || 0, x, y, ww, hh, lx, ly;
        if (tag === "floor" || tag === "top") {
          ww = rect.w / 5; hh = th + f * 10; x = rect.x0 + i * ww; y = tag === "floor" ? rect.y1 - hh : rect.y0;
          lx = x + ww / 2; ly = tag === "floor" ? rect.y1 - th - 10 : rect.y0 + th + 10;
        } else {
          hh = rect.h / 5; ww = th + f * 10; y = rect.y1 - (i + 1) * hh; x = tag === "left" ? rect.x0 : rect.x1 - ww;
          ly = y + hh / 2; lx = tag === "left" ? rect.x0 + th + 10 : rect.x1 - th - 10;
        }
        c.fillStyle = NOTE_COL[(i + (WALLS[tag].minor ? 4 : 0)) % 5];
        c.globalAlpha = 0.55 + f * 0.45;
        c.fillRect(x, y, ww, hh);
        c.globalAlpha = 0.8;
        c.fillStyle = D.night ? "#fff" : "#495057";
        c.fillText(WALLS[tag].names[i], lx, ly);
      }
    });
    c.globalAlpha = 1;
  }

  // ボタン
  $("tPal").addEventListener("click", function () { AU.tap(); openPalette(); });
  $("palClose").addEventListener("click", function () { $("palette").hidden = true; });
  $("tBoom").addEventListener("click", function () { boom(); });
  $("tZero").addEventListener("click", function () {
    zeroG = !zeroG; setPressed("tZero", zeroG); applyGravity(); w.wakeAll();
    AU.whoosh(zeroG);
    if (zeroG) w.bodies.forEach(function (b) { b.vy -= 120 * SB.S; });
    SB.toast(zeroG ? "🎈 むじゅうりょく！ ふわふわ〜" : "じゅうりょく もどった");
  });
  $("tClean").addEventListener("click", function () { clean(); });
  $("tNight").addEventListener("click", function () { D.night = !D.night; setPressed("tNight", D.night); SB.save(); AU.tap(); if (D.night) SB.toast("🌙 よる だよ。ひかる ボールは どれかな？"); });
  $("tMusic").addEventListener("click", function () { D.music = !D.music; setPressed("tMusic", D.music); SB.save(); AU.tap(); if (D.music) SB.toast("🎵 かべと ゆかに あたると ドレミが なるよ"); });
  $("tTilt").addEventListener("click", function () { AU.tap(); toggleTilt(); });

  mode.world = function () { return w; };
  // テスト・けいそく よう: n こ いっきに だす
  mode.bench = function (n) {
    for (var i = 0; i < n; i++) {
      if (w.bodies.length >= MAX) break;
      var k = BL.KINDS[i % 12];
      SB.makeBall(w, k, rect.x0 + 20 + Math.random() * (rect.w - 40), rect.y0 + 20 + Math.random() * (rect.h - 40), 10 * SB.S + Math.random() * 10 * SB.S, { vx: (Math.random() - 0.5) * 800, vy: (Math.random() - 0.5) * 800 });
    }
    return w.bodies.length;
  };
  SB.modes.free = mode;
})(window);
