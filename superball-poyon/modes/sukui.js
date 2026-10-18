/* ============================================================
   ② スーパーボール すくい（よこから みた プール）
   - みずは ゆっくり ながれる（りゅうそく ば）。ボールは ふりょく＋みずの ていこうで ぷかぷか
   - ポイは ゆびで うごかす。みずに つけている じかん・はやく うごかした りょう・
     のせた ボールの おもさ で「かみの つよさ」が へり、0 で やぶれる
   - ポイに のせて おわんの うえまで はこぶと はいる。1かい 3まい
   ============================================================ */
(function (root) {
  "use strict";
  var P = root.SBPhysics, BL = root.SBBalls, AU = root.SBAudio, SB = root.SB, $ = SB.$, D = SB.data;
  var w = null, step = null, R = null, pool = null, bowl = null, water = 0, statics = [];
  var poi = null, finger = null, poisLeft = 3, caught = [], inBowl = [], refill = [], endT = -1, newKinds = [];
  var M0 = 1;

  function S() { return SB.S; }
  function surf(x) {
    var t = w ? w.time : 0, s = S();
    return water + Math.sin(x * 0.025 / s - t * 2.2) * 3 * s + Math.sin(x * 0.011 / s + t * 1.3) * 2.5 * s;
  }
  function flow(x, y) {
    var t = w.time, s = S();
    var deep = Math.max(0, Math.min(1, (y - water) / (pool.bot - water)));
    return 32 * s * (0.6 * Math.sin(t * 0.35) + 0.6 * Math.sin(x * 0.008 / s - t * 0.5)) * (1 - deep * 0.7);
  }
  function inPool(x, y) { return x > pool.x0 && x < pool.x1 && y > pool.top - 10; }

  function layout() {
    R = SB.rect();
    var s = S(), land = R.w > R.h * 1.1;
    if (land) {
      pool = { x0: R.x0 + 14, x1: R.x0 + R.w * 0.70, top: R.y0 + R.h * 0.40, bot: R.y1 - 12 };
      var bw = Math.min(130 * s, (R.x1 - pool.x1) * 0.8);
      bowl = { cx: (pool.x1 + R.x1) / 2 + 6, w: bw, h: bw * 0.42, base: pool.top - 30 * s };
    } else {
      pool = { x0: R.x0 + 10, x1: R.x1 - 10, top: R.y0 + R.h * 0.42, bot: R.y1 - 10 };
      var bw2 = Math.min(130 * s, R.w * 0.36);
      bowl = { cx: R.x1 - bw2 / 2 - 22, w: bw2, h: bw2 * 0.42, base: R.y0 + R.h * 0.30 };
    }
    bowl.top = bowl.base - bowl.h;
    water = pool.top + 24 * s;
    M0 = Math.pow(20 * s, 2);
  }

  function build() {
    layout();
    var s = S();
    if (!w) {
      w = new P.World({ gy: 1100 * s, substeps: 6, maxSpeed: 2400 * s, air: 0.05 });
      w.onHit = function (b, o, sp, nx, ny) {
        SB.squash(b, sp, nx, ny);
        if (sp > 200 && w.time - b.data.ht > 0.08) { b.data.ht = w.time; AU.poyon(b.r, sp * 0.7, b.id); }
      };
      w.force = waterForce;
      step = SB.stepper(fixedStep);
    }
    w.gy = 1100 * s; w.maxSpeed = 2400 * s;
    w.setBounds(R.x0, R.y0 - 2000, R.x1, R.y1, { open: true });
    var th = 30 * s;
    w.boxes = [
      { x: pool.x0 - th / 2, y: (pool.top + pool.bot) / 2, hw: th / 2, hh: (pool.bot - pool.top) / 2 + 6, e: 0.5 },
      { x: pool.x1 + th / 2, y: (pool.top + pool.bot) / 2, hw: th / 2, hh: (pool.bot - pool.top) / 2 + 6, e: 0.5 },
      { x: (pool.x0 + pool.x1) / 2, y: pool.bot + th / 2, hw: (pool.x1 - pool.x0) / 2 + th, hh: th / 2, e: 0.5 }
    ];
    var b = bowl, hw = b.w / 2;
    statics = [
      { ax: b.cx - hw, ay: b.top, bx: b.cx - hw * 0.62, by: b.base, rad: 4 * s, e: 0.5, tag: "bowl" },
      { ax: b.cx - hw * 0.62, ay: b.base, bx: b.cx + hw * 0.62, by: b.base, rad: 4 * s, e: 0.5, tag: "bowl" },
      { ax: b.cx + hw * 0.62, ay: b.base, bx: b.cx + hw, by: b.top, rad: 4 * s, e: 0.5, tag: "bowl" }
    ];
    // よこの だい（プールへ ころがり おちる さか）
    if (pool.x1 < R.x1 - 40) statics.push({ ax: pool.x1, ay: pool.top - 2, bx: R.x1, by: pool.top - 46 * s, rad: 4 * s, e: 0.4, tag: "table" });
    setSegs();
    w.bodies.forEach(function (bb) {
      bb.x = Math.max(pool.x0 + bb.r, Math.min(pool.x1 - bb.r, bb.x));
      if (bb.y > pool.bot - bb.r) bb.y = pool.bot - bb.r;
    });
    w.wakeAll();
    if (poi) { poi.x = Math.max(R.x0 + 60 * s, Math.min(R.x1 - 60 * s, poi.x)); poi.y = Math.max(R.y0 + 20, Math.min(pool.bot - 14 * s, poi.y)); }
  }

  function poiSegs() {
    if (!poi || poi.torn) return [];
    var s = S(), hw = poi.w / 2, x = poi.x, y = poi.y, sag = 9 * s, inn = 16 * s;
    var mk = function (ax, ay, bx, by) { return { ax: x + ax, ay: y + ay, bx: x + bx, by: y + by, rad: 3 * s, e: 0.15, mu: 1.2, et: 0, vx: poi.vx, vy: poi.vy, tag: "poi" }; };
    return poi.segs = [mk(-hw, -sag, -hw + inn, 0), mk(-hw + inn, 0, hw - inn, 0), mk(hw - inn, 0, hw, -sag)];
  }
  function setSegs() { w.segs = statics.concat(poiSegs()); }

  function waterForce(b, h) {
    if (!inPool(b.x, b.y)) { b.data.inW = false; return; }
    var dep = b.y - surf(b.x), f = (dep + b.r) / (2 * b.r);
    if (f <= 0) { b.data.inW = false; return; }
    if (f > 1) f = 1;
    if (!b.data.inW && b.vy > 260 * S()) {
      AU.chapon(b.r > 26 * S());
      SB.fx.burst(b.x, surf(b.x), "rgba(165,216,255,.9)", 8, 200);
    }
    b.data.inW = true;
    b.vy -= w.gy * f / b.data.rel * h;
    var k = 2.8 * f;
    b.vx += (flow(b.x, b.y) - b.vx) * k * h;
    b.vy -= b.vy * k * h;
    b.w *= 1 - Math.min(1, 2.5 * f * h);
    b.sleeping = false;
  }

  function pickPoolKind() {
    if (Math.random() < 0.72) return BL.KINDS[Math.floor(Math.random() * 12)];
    var k;
    do { k = BL.pickGacha(); } while (k.rar >= 4 && Math.random() < 0.9);
    return k;
  }
  function addPoolBall(drop) {
    var s = S(), k = pickPoolKind();
    var r = Math.min(34 * s, Math.max(9 * s, SB.randR(k, 0.75)));
    var x = pool.x0 + r + Math.random() * (pool.x1 - pool.x0 - 2 * r);
    var y = drop ? R.y0 + 10 : water + (Math.random() - 0.5) * 20 * s;
    var b = SB.makeBall(w, k, x, y, r, { vx: (Math.random() - 0.5) * 60 });
    b.data.rel = Math.max(0.35, Math.min(0.85, 0.5 + (k.rho - 1) * 0.6 + (Math.random() - 0.5) * 0.12));
    b.data.inW = !drop;
    b.noSleep = true;
    return b;
  }

  function newPoi() {
    var s = S();
    poi = { x: pool.x0 + 90 * s, y: pool.top - 50 * s, vx: 0, vy: 0, w: 112 * s, hp: 100, wet: false, torn: false, tornT: 0, pieces: null, segs: [] };
    if (finger) { finger.ox = poi.x - finger.x; finger.oy = poi.y - finger.y; }
    setSegs();
    updateHud();
  }

  function onPoi(b) {
    return poi && !poi.torn && poi.segs.indexOf(b.last) >= 0 && w.time - b.lastT < 0.06;
  }

  function tear() {
    poi.torn = true; poi.tornT = 0; poi.hp = 0;
    var s = S(), pieces = [];
    for (var i = 0; i < 7; i++) pieces.push({ x: (Math.random() - 0.5) * poi.w * 0.8, y: 0, vy: 20 + Math.random() * 60, rot: Math.random() * 6, sz: (6 + Math.random() * 10) * s });
    poi.pieces = pieces;
    AU.biri();
    SB.fx.text(poi.x, poi.y - 30 * s, "びりっ！", "#fa5252", 28);
    setSegs();
    w.wakeAll();
    poisLeft--;
    updateHud();
  }

  function catchBall(b) {
    w.remove(b);
    var k = b.data.k;
    caught.push(k);
    if (SB.giveBall(k.id)) newKinds.push(k);
    var s = S();
    inBowl.push({ k: k, r: Math.min(b.r, bowl.w * 0.16), fx: b.x, fy: b.y, x: bowl.cx + (Math.random() - 0.5) * bowl.w * 0.45, y: bowl.base - 8 * s - Math.random() * bowl.h * 0.35, t: 0, a: b.a });
    if (inBowl.length > 14) inBowl.shift();
    AU.bowl();
    SB.addStars(1, bowl.cx, bowl.top - 24 * s);
    refill.push(1.6);
    updateHud();
  }

  function fixedStep(h) {
    var s = S();
    if (poi && !poi.torn) {
      var tx = poi.x, ty = poi.y;
      if (finger) { tx = finger.x + finger.ox; ty = finger.y + finger.oy; }
      tx = Math.max(R.x0 + poi.w / 2, Math.min(R.x1 - poi.w / 2, tx));
      ty = Math.max(R.y0 + 10 * s, Math.min(pool.bot - 14 * s, ty));
      var dx = tx - poi.x, dy = ty - poi.y, d = Math.hypot(dx, dy), mx = 1800 * s * h;
      if (d > mx) { dx *= mx / d; dy *= mx / d; }
      poi.vx = dx / h; poi.vy = dy / h;
      setSegs();
      w.step(h);
      poi.x += dx; poi.y += dy;
      // かみの つよさ
      var sub = poi.y > surf(poi.x) - 2 * s, sp = Math.hypot(poi.vx, poi.vy) / s, dmg = 0;
      if (sub) { poi.wet = true; dmg += (finger ? 5 : 2.5) + sp * 0.012; }
      var wetK = poi.wet ? 1.5 : 1;
      for (var i = 0; i < w.bodies.length; i++) {
        var b = w.bodies[i];
        if (!onPoi(b)) continue;
        dmg += (b.m / M0) * (b.data.inW ? 1.5 : 7) * wetK;
      }
      poi.hp -= dmg * h;
      if (poi.hp <= 0) tear();
    } else {
      setSegs();
      w.step(h);
    }
    // おわんの うえに きた ボールは はいる
    var hw = bowl.w * 0.42;
    for (var j = w.bodies.length - 1; j >= 0; j--) {
      var c = w.bodies[j];
      if (c.data.inW) continue;
      if (Math.abs(c.x - bowl.cx) < hw && c.y < bowl.top + 6 * s && c.y > bowl.top - 220 * s) catchBall(c);
    }
  }

  function updateHud() {
    var ic = "";
    for (var i = 0; i < 3; i++) ic += i < poisLeft ? "🏓" : "▫️";
    $("poiIcons").textContent = ic;
    $("caughtN").textContent = caught.length;
    $("meterIn").style.width = Math.max(0, poi ? poi.hp : 0) + "%";
  }

  function finish() {
    endT = -1;
    var n = caught.length;
    if (n > D.sukuiBest) D.sukuiBest = n;
    SB.save(true);
    if (n) AU.fanfare(); else AU.sad();
    var msg = n ? "⭐ を " + n + "こ もらったよ<br>すくった ボールは じゆう あそびで だせるよ" : "ざんねん！ ポイを みずに つけすぎない のが コツだよ";
    if (newKinds.length) msg = "あたらしい ボール: " + newKinds.map(function (k) { return k.name; }).join("・") + "<br>" + msg;
    SB.showResult({
      badge: n ? "🎉 おしまい！" : "おしまい", title: n + "こ すくえた！", list: caught.slice(0, 30), msg: msg,
      buttons: [
        { label: "↺ もういちど", primary: true, fn: function () { SB.go("sukui"); } },
        { label: "🔴 じゆう あそび", fn: function () { SB.go("free"); } },
        { label: "🏠 ホーム", fn: function () { SB.go("home"); } }
      ]
    });
  }

  var mode = {
    enter: function () {
      $("sukuiHud").hidden = false;
      w = null; poi = null; finger = null; poisLeft = 3; caught = []; inBowl = []; refill = []; endT = -1; newKinds = [];
      build();
      var n = Math.max(10, Math.min(24, Math.round((pool.x1 - pool.x0) / (30 * S()))));
      for (var i = 0; i < n; i++) addPoolBall(false);
      newPoi();
      SB.toast("ポイを ゆびで うごかして ボールを すくい、🥣 おわんへ はこぼう！", 3200);
    },
    exit: function () { finger = null; },
    resize: build,
    update: function (dt) {
      step(dt);
      w.bodies.forEach(function (b) { SB.tickBall(b, dt); });
      if (poi && poi.torn) {
        poi.tornT += dt;
        if (poi.tornT > 1.1 && endT < 0) { if (poisLeft > 0) newPoi(); else endT = 1.0; }
      }
      if (endT > 0) { endT -= dt; if (endT <= 0) finish(); }
      for (var i = refill.length - 1; i >= 0; i--) { refill[i] -= dt; if (refill[i] <= 0) { refill.splice(i, 1); addPoolBall(true); } }
      inBowl.forEach(function (q) { q.t = Math.min(1, q.t + dt * 3); });
      updateHud();
    },
    draw: function (c) {
      var s = S();
      c.fillStyle = "#fff4e6"; c.fillRect(0, 0, SB.W, SB.H);
      var g = c.createLinearGradient(0, R.y0, 0, R.y1);
      g.addColorStop(0, "#fff9db"); g.addColorStop(1, "#ffe8cc");
      c.fillStyle = g; c.fillRect(R.x0, R.y0, R.w, R.h);
      // やたいの まく
      var sw = 36 * s, ch = 22 * s;
      for (var x = R.x0, i = 0; x < R.x1; x += sw, i++) {
        c.fillStyle = i % 2 ? "#fff" : "#f03e3e";
        c.beginPath(); c.moveTo(x, R.y0); c.lineTo(x + sw, R.y0); c.lineTo(x + sw, R.y0 + ch); c.arc(x + sw / 2, R.y0 + ch, sw / 2, 0, Math.PI); c.fill();
      }
      // ちょうちん
      for (var lx = R.x0 + 50 * s; lx < R.x1 - 20 * s; lx += 150 * s) {
        c.fillStyle = "#ff922b"; c.beginPath(); c.ellipse(lx, R.y0 + ch + 30 * s, 12 * s, 16 * s, 0, 0, 7); c.fill();
        c.fillStyle = "#212529"; c.fillRect(lx - 8 * s, R.y0 + ch + 12 * s, 16 * s, 4 * s); c.fillRect(lx - 8 * s, R.y0 + ch + 44 * s, 16 * s, 4 * s);
      }
      // だい・さか
      statics.forEach(function (sg) {
        if (sg.tag !== "table") return;
        c.strokeStyle = "#c08457"; c.lineWidth = 10 * s; c.lineCap = "round";
        c.beginPath(); c.moveTo(sg.ax, sg.ay); c.lineTo(sg.bx, sg.by); c.stroke();
      });
      // おわんの だい
      c.fillStyle = "#c08457";
      var table = statics.filter(function (t) { return t.tag === "table"; })[0];
      var standBot = table ? table.ay + (table.by - table.ay) * (bowl.cx - table.ax) / (table.bx - table.ax) : bowl.base + 26 * s;
      c.fillRect(bowl.cx - 6 * s, bowl.base, 12 * s, Math.max(0, standBot - bowl.base));
      if (!table) { c.fillRect(bowl.cx - bowl.w * 0.3, bowl.base + 4 * s, R.x1 - (bowl.cx - bowl.w * 0.3), 8 * s); }
      // プール（おく）
      c.fillStyle = "#4dabf7"; c.fillRect(pool.x0 - 30 * s, pool.top, pool.x1 - pool.x0 + 60 * s, pool.bot - pool.top + 30 * s);
      c.fillStyle = "#d0ebff"; c.fillRect(pool.x0, pool.top, pool.x1 - pool.x0, pool.bot - pool.top);
      // ボール
      w.bodies.forEach(function (b) { SB.drawBall(c, b); });
      // ポイ
      drawPoi(c, s);
      // みず（てまえ）
      c.beginPath(); c.moveTo(pool.x0, pool.bot);
      for (var wx = pool.x0; wx <= pool.x1; wx += 8) c.lineTo(wx, surf(wx));
      c.lineTo(pool.x1, surf(pool.x1)); c.lineTo(pool.x1, pool.bot); c.closePath();
      c.fillStyle = "rgba(51,154,240,.38)"; c.fill();
      c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 3;
      c.beginPath(); for (wx = pool.x0; wx <= pool.x1; wx += 8) c.lineTo(wx, surf(wx)); c.stroke();
      // ながれの しるし
      c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 2;
      for (var fx = pool.x0 + 40 * s; fx < pool.x1 - 30 * s; fx += 110 * s) {
        var fy = water + 40 * s + ((fx / s) % 3) * 18 * s, u = flow(fx, fy), dir = u >= 0 ? 1 : -1, len = Math.min(26 * s, Math.abs(u) * 0.8 + 6);
        c.beginPath(); c.moveTo(fx - dir * len, fy); c.lineTo(fx + dir * len, fy); c.lineTo(fx + dir * (len - 6), fy - 5); c.moveTo(fx + dir * len, fy); c.lineTo(fx + dir * (len - 6), fy + 5); c.stroke();
      }
      // プールの ふち
      c.fillStyle = "#1971c2";
      c.fillRect(pool.x0 - 30 * s, pool.top - 6 * s, 30 * s, pool.bot - pool.top + 36 * s);
      c.fillRect(pool.x1, pool.top - 6 * s, 30 * s, pool.bot - pool.top + 36 * s);
      c.fillRect(pool.x0 - 30 * s, pool.bot, pool.x1 - pool.x0 + 60 * s, 30 * s);
      drawBowl(c, s);
    },
    down: function (p) {
      if (!poi) return;
      finger = { id: p.id, x: p.x, y: p.y, ox: poi.x - p.x, oy: poi.y - p.y };
      // ポイから はなれた ところを さわったら、ポイを ゆびの ちかくへ
      if (Math.hypot(finger.ox, finger.oy) > 160 * S()) { finger.ox = -(poi.w / 2 + 30 * S()); finger.oy = -50 * S(); }
    },
    move: function (p) { if (finger && finger.id === p.id) { finger.x = p.x; finger.y = p.y; } },
    up: function (p) { if (finger && finger.id === p.id) finger = null; }
  };

  function drawPoi(c, s) {
    if (!poi) return;
    var x = poi.x, y = poi.y, hw = poi.w / 2;
    // もちて
    c.strokeStyle = "#f783ac"; c.lineWidth = 9 * s; c.lineCap = "round";
    c.beginPath(); c.moveTo(x + hw - 4 * s, y - 2 * s); c.lineTo(x + hw + 30 * s, y + 50 * s); c.stroke();
    if (!poi.torn) {
      var wet = poi.wet ? 0.55 : 0.85;
      c.fillStyle = "rgba(255,255,255," + wet + ")";
      c.beginPath(); c.ellipse(x, y - 3 * s, hw, 7 * s, 0, 0, 7); c.fill();
      // やぶれそう: しわ
      if (poi.hp < 40) {
        c.strokeStyle = "rgba(134,142,150," + (0.8 - poi.hp / 50) + ")"; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(x - hw * 0.4, y - 4 * s); c.lineTo(x - hw * 0.1, y - 1 * s); c.lineTo(x + hw * 0.2, y - 5 * s); c.stroke();
      }
    } else if (poi.pieces) {
      c.fillStyle = "rgba(255,255,255,.8)";
      poi.pieces.forEach(function (pc) {
        var t = poi.tornT;
        c.save(); c.translate(x + pc.x, y + pc.vy * t + 200 * t * t); c.rotate(pc.rot + t * 3);
        c.globalAlpha = Math.max(0, 1 - t); c.fillRect(-pc.sz / 2, -pc.sz / 4, pc.sz, pc.sz / 2); c.restore();
      });
      c.globalAlpha = 1;
    }
    c.strokeStyle = "#e64980"; c.lineWidth = 4 * s;
    c.beginPath(); c.ellipse(x, y - 3 * s, hw, 7 * s, 0, 0, 7); c.stroke();
    // かみの つよさ（ポイの うえに ちいさく）
    if (!poi.torn && poi.hp < 100) {
      c.fillStyle = "rgba(0,0,0,.15)"; c.fillRect(x - hw * 0.6, y - 26 * s, hw * 1.2, 7 * s);
      c.fillStyle = poi.hp > 50 ? "#51cf66" : poi.hp > 25 ? "#fcc419" : "#ff6b6b";
      c.fillRect(x - hw * 0.6, y - 26 * s, hw * 1.2 * poi.hp / 100, 7 * s);
    }
  }

  function drawBowl(c, s) {
    var b = bowl, hw = b.w / 2;
    inBowl.forEach(function (q) {
      var t = q.t, e = 1 - Math.pow(1 - t, 3);
      var x = q.fx + (q.x - q.fx) * e, y = q.fy + (q.y - q.fy) * e - Math.sin(t * Math.PI) * 30 * s;
      BL.draw(c, q.k, x, y, q.r, SB.dpr, { a: q.a });
    });
    c.fillStyle = "rgba(255,255,255,.25)";
    c.beginPath(); c.moveTo(b.cx - hw, b.top); c.lineTo(b.cx - hw * 0.62, b.base); c.lineTo(b.cx + hw * 0.62, b.base); c.lineTo(b.cx + hw, b.top); c.closePath(); c.fill();
    c.strokeStyle = "#e03131"; c.lineWidth = 8 * s; c.lineJoin = "round"; c.lineCap = "round";
    c.beginPath(); c.moveTo(b.cx - hw, b.top); c.lineTo(b.cx - hw * 0.62, b.base); c.lineTo(b.cx + hw * 0.62, b.base); c.lineTo(b.cx + hw, b.top); c.stroke();
    c.font = "bold " + Math.round(14 * s) + "px sans-serif"; c.textAlign = "center"; c.fillStyle = "#c92a2a";
    c.fillText("おわん", b.cx, b.top - 10 * s);
  }

  $("sukuiEnd").addEventListener("click", function () { AU.tap(); if (endT < 0) finish(); });
  mode.state = function () { return { balls: w.bodies.length, poi: poi && { x: poi.x, y: poi.y, hp: poi.hp, torn: poi.torn }, caught: caught.length, pool: pool, bowl: bowl, water: water, left: poisLeft }; };
  mode.world = function () { return w; };
  SB.modes.sukui = mode;
})(window);
