/* ============================================================
   ③ ガチャガチャ と ボール ずかん
   - ⭐ 5こで 1かい。ハンドルを ぐるっと 1しゅう まわすと カプセルが ころころ
   - カプセルを タップすると パカッ。おなじ ものが でたら ⭐ を 1こ かえす
   - ずかん: もっている ボール と まだの ボール（シルエット）
   ============================================================ */
(function (root) {
  "use strict";
  var P = root.SBPhysics, BL = root.SBBalls, AU = root.SBAudio, SB = root.SB, $ = SB.$, D = SB.data;
  var COST = 5;
  var CAPS = [["#ff8787", "#fff"], ["#74c0fc", "#fff"], ["#ffe066", "#fff"], ["#8ce99a", "#fff"], ["#e599f7", "#fff"], ["#ffa94d", "#fff"]];
  var w = null, step = null, R = null, M = null, turn = null, total = 0, tick = 0, cap = null, wiggle = 0, knobA = 0;

  function layout() {
    R = SB.rect();
    var s = Math.min(R.w * 0.86, R.h * 0.9, 520);
    var cx = R.x0 + R.w / 2, top = R.y0 + (R.h - s) / 2;
    M = {
      s: s, cx: cx, domeY: top + s * 0.27, domeR: s * 0.25,
      bodyX: cx - s * 0.34, bodyY: top + s * 0.52, bodyW: s * 0.68, bodyH: s * 0.36,
      knobX: cx + s * 0.08, knobY: top + s * 0.70, knobR: s * 0.085,
      chuteX: cx - s * 0.2, chuteY: top + s * 0.8,
      trayY: top + s * 0.97
    };
  }

  function build() {
    layout();
    w = new P.World({ gy: 1200 * SB.S, substeps: 4, sleep: false, air: 0.2 });
    var n = 28, segs = [];
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      segs.push({ ax: M.cx + Math.cos(a0) * M.domeR, ay: M.domeY + Math.sin(a0) * M.domeR, bx: M.cx + Math.cos(a1) * M.domeR, by: M.domeY + Math.sin(a1) * M.domeR, rad: 2, e: 0.4 });
    }
    w.segs = segs;
    w.onHit = function (b, o, sp) { if (sp > 300 && turn) AU.karakara(); };
    var cr = M.domeR * 0.2;
    for (i = 0; i < 13; i++) {
      var b = w.add({ x: M.cx + (Math.random() - 0.5) * M.domeR, y: M.domeY + (Math.random() - 0.2) * M.domeR * 0.6, r: cr, e: 0.4, et: 0.2, mu: 0.6 });
      b.data = { c: CAPS[i % CAPS.length] };
    }
    step = SB.stepper(function (h) { w.step(h); });
  }

  function msg() {
    var m = D.stars >= COST ? "⭐" + COST + "こで 1かい！ ハンドルを ぐるっと まわそう" : "⭐が あと " + (COST - D.stars) + "こ たりないよ。じゆう あそび や すくい で あつめよう";
    if (cap && cap.state === "wait") m = "カプセルを タップして あけよう！";
    $("gachaMsg").textContent = m;
  }

  function jostle() {
    w.bodies.forEach(function (b) { b.vx += (Math.random() - 0.5) * 500; b.vy -= 200 + Math.random() * 400; });
  }

  function dispense() {
    D.stars -= COST; SB.save(true); SB.updateBar();
    var k = BL.pickGacha();
    var c = w.bodies[Math.floor(Math.random() * w.bodies.length)];
    var col = c ? c.data.c : CAPS[0];
    if (c && w.bodies.length > 6) w.remove(c);
    cap = { k: k, col: col, x: M.chuteX, y: M.chuteY, vx: -60 - Math.random() * 60, vy: 0, a: 0, state: "drop", t: 0, r: M.s * 0.07 };
    AU.gorogoro();
    msg();
  }

  function openCap() {
    cap.state = "open"; cap.t = 0;
    AU.paka();
    SB.fx.burst(cap.x, cap.y, "#ffe066", 18, 320);
    setTimeout(reveal, 650);
  }

  function reveal() {
    if (!cap) return;
    var k = cap.k, isNew = SB.giveBall(k.id);
    var badge = isNew ? "✨ あたらしい ボール！" : "もっている ボール";
    var rar = "★★★★".slice(0, k.rar);
    var m = k.desc + "<br><span style='color:#f59f00'>" + rar + "</span>";
    if (!isNew) { D.stars += 1; SB.save(true); m += "<br>おなじ ボールが でたから ⭐ を 1こ かえすね"; AU.star(); }
    else if (k.rar >= 3) AU.fanfare(); else AU.kira();
    SB.updateBar();
    SB.showResult({
      badge: badge, kind: k, title: k.name, msg: m,
      buttons: [
        { label: "🎰 もういちど", primary: true, fn: function () { cap = null; msg(); } },
        { label: "🔴 だして あそぶ", fn: function () { D.sel = k.id; SB.save(); SB.go("free"); } },
        { label: "📖 ずかん", fn: function () { SB.go("zukan"); } }
      ]
    });
  }

  function drawCapsule(c, x, y, r, a, col, open) {
    c.save(); c.translate(x, y); c.rotate(a);
    var o = open || 0;
    // うえ はんぶん（いろ）
    c.save(); c.translate(0, -o * r * 1.6); c.rotate(-o * 0.8);
    c.fillStyle = col[0]; c.beginPath(); c.arc(0, 0, r, Math.PI, 0); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.ellipse(-r * 0.4, -r * 0.5, r * 0.22, r * 0.12, -0.6, 0, 7); c.fill();
    c.restore();
    // した はんぶん（とうめい）
    c.save(); c.translate(0, o * r * 1.2); c.rotate(o * 0.6);
    c.fillStyle = "rgba(255,255,255,.75)"; c.beginPath(); c.arc(0, 0, r, 0, Math.PI); c.closePath(); c.fill();
    c.strokeStyle = "rgba(0,0,0,.2)"; c.lineWidth = 2; c.stroke();
    c.restore();
    c.restore();
  }

  var mode = {
    enter: function () {
      $("gachaHud").hidden = false;
      cap = null; turn = null; total = 0;
      build(); msg();
    },
    exit: function () { if (cap && cap.state !== "drop") { /* ひらいて いない カプセルは あとで ひらく */ } },
    resize: function () {
      var keep = cap;
      build();
      if (keep) { keep.x = Math.max(M.cx - M.s * 0.4, Math.min(M.cx + M.s * 0.4, keep.x)); keep.y = M.trayY - keep.r; }
    },
    update: function (dt) {
      step(dt);
      if (wiggle > 0) wiggle -= dt;
      if (cap) {
        cap.t += dt;
        if (cap.state === "drop") {
          cap.vy += 1600 * dt; cap.x += cap.vx * dt; cap.y += cap.vy * dt; cap.a += cap.vx * dt / cap.r;
          var fl = M.trayY - cap.r;
          if (cap.y > fl) { cap.y = fl; if (cap.vy > 120) { cap.vy *= -0.45; AU.karakara(); } else cap.vy = 0; cap.vx *= 0.985; }
          if (cap.x < M.cx - M.s * 0.42) { cap.x = M.cx - M.s * 0.42; cap.vx = Math.abs(cap.vx) * 0.5; }
          if (cap.t > 1.3) { cap.state = "wait"; msg(); }
        }
      }
    },
    draw: function (c) {
      var s = M.s;
      var g = c.createLinearGradient(0, R.y0, 0, R.y1);
      g.addColorStop(0, "#fff9db"); g.addColorStop(1, "#ffe8cc");
      c.fillStyle = "#fff5f5"; c.fillRect(0, 0, SB.W, SB.H);
      c.fillStyle = g; c.fillRect(R.x0, R.y0, R.w, R.h);
      // きらきら
      c.fillStyle = "rgba(255,212,59,.35)";
      for (var i = 0; i < 12; i++) { var a = i * 0.52 + SB.t * 0.2; c.beginPath(); c.arc(M.cx + Math.cos(a) * s * 0.55, M.domeY + s * 0.2 + Math.sin(a) * s * 0.45, 4 + (i % 3) * 2, 0, 7); c.fill(); }
      var wx = wiggle > 0 ? Math.sin(wiggle * 60) * 4 : 0;
      c.save(); c.translate(wx, 0);
      // だい
      c.fillStyle = "#c92a2a";
      c.beginPath(); c.roundRect(M.bodyX - s * 0.02, M.bodyY + M.bodyH - 6, M.bodyW + s * 0.04, s * 0.06, 8); c.fill();
      // からだ
      c.fillStyle = "#f03e3e";
      c.beginPath(); c.roundRect(M.bodyX, M.bodyY, M.bodyW, M.bodyH, 18); c.fill();
      c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.roundRect(M.bodyX + 10, M.bodyY + 8, M.bodyW * 0.18, M.bodyH - 16, 10); c.fill();
      // ⭐ の まど
      c.fillStyle = "#fff"; c.beginPath(); c.roundRect(M.cx - s * 0.28, M.bodyY + s * 0.04, s * 0.2, s * 0.08, 10); c.fill();
      c.fillStyle = "#e67700"; c.font = "bold " + Math.round(s * 0.045) + "px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("⭐×" + COST, M.cx - s * 0.18, M.bodyY + s * 0.08);
      // でぐち
      c.fillStyle = "#343a40"; c.beginPath(); c.roundRect(M.chuteX - s * 0.08, M.chuteY - s * 0.05, s * 0.16, s * 0.1, 12); c.fill();
      // ドーム
      c.fillStyle = "rgba(231,245,255,.55)"; c.beginPath(); c.arc(M.cx, M.domeY, M.domeR, 0, 7); c.fill();
      w.bodies.forEach(function (b) { drawCapsule(c, b.x, b.y, b.r, b.a, b.data.c, 0); });
      c.strokeStyle = "rgba(255,255,255,.95)"; c.lineWidth = 6; c.beginPath(); c.arc(M.cx, M.domeY, M.domeR, 0, 7); c.stroke();
      c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 8; c.beginPath(); c.arc(M.cx, M.domeY, M.domeR * 0.8, 3.6, 4.4); c.stroke();
      c.fillStyle = "#c92a2a"; c.beginPath(); c.roundRect(M.cx - M.domeR * 0.9, M.domeY + M.domeR * 0.82, M.domeR * 1.8, M.bodyY - (M.domeY + M.domeR * 0.82) + 4, 6); c.fill();
      // ハンドル
      var kr = M.knobR;
      c.fillStyle = "#fff"; c.beginPath(); c.arc(M.knobX, M.knobY, kr * 1.15, 0, 7); c.fill();
      c.fillStyle = "#adb5bd"; c.beginPath(); c.arc(M.knobX, M.knobY, kr, 0, 7); c.fill();
      c.save(); c.translate(M.knobX, M.knobY); c.rotate(knobA);
      c.fillStyle = "#f8f9fa"; c.strokeStyle = "#495057"; c.lineWidth = 3;
      c.beginPath(); c.roundRect(-kr * 1.1, -kr * 0.28, kr * 2.2, kr * 0.56, kr * 0.28); c.fill(); c.stroke();
      c.restore();
      // まわす やじるし
      if (!cap && D.stars >= COST) {
        c.strokeStyle = "rgba(255,255,255," + (0.6 + 0.4 * Math.sin(SB.t * 5)) + ")"; c.lineWidth = 5; c.lineCap = "round";
        var ar = kr * 1.6, a0 = SB.t * 2;
        c.beginPath(); c.arc(M.knobX, M.knobY, ar, a0, a0 + 4.5); c.stroke();
        var ex = M.knobX + Math.cos(a0 + 4.5) * ar, ey = M.knobY + Math.sin(a0 + 4.5) * ar, ta = a0 + 4.5 + Math.PI / 2;
        c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex - Math.cos(ta - 0.6) * 12, ey - Math.sin(ta - 0.6) * 12); c.moveTo(ex, ey); c.lineTo(ex - Math.cos(ta + 0.6) * 12, ey - Math.sin(ta + 0.6) * 12); c.stroke();
      }
      c.restore();
      // うけざら
      c.fillStyle = "#ffc9c9"; c.beginPath(); c.roundRect(M.cx - s * 0.46, M.trayY - 2, s * 0.92, s * 0.03, 6); c.fill();
      // カプセル
      if (cap) {
        var o = cap.state === "open" ? Math.min(1, cap.t / 0.35) : 0;
        if (cap.state === "open") {
          var br = cap.r * (0.6 + Math.min(1, cap.t / 0.5) * 0.9);
          BL.draw(c, cap.k, cap.x, cap.y - Math.min(1, cap.t / 0.5) * cap.r * 1.4, br, SB.dpr, { a: cap.t * 4 });
        }
        var pul = cap.state === "wait" ? 1 + Math.sin(SB.t * 8) * 0.06 : 1;
        drawCapsule(c, cap.x, cap.y, cap.r * pul, cap.state === "open" ? 0 : cap.a, cap.col, o);
        if (cap.state === "wait") {
          c.fillStyle = "#c92a2a"; c.font = "bold " + Math.round(s * 0.05) + "px sans-serif"; c.textAlign = "center";
          c.fillText("タップ！", cap.x, cap.y - cap.r * 1.8);
        }
      }
    },
    down: function (p) {
      if (cap && cap.state === "wait" && Math.hypot(p.x - cap.x, p.y - cap.y) < cap.r * 2.2) { openCap(); return; }
      if (cap) return;
      if (Math.hypot(p.x - M.knobX, p.y - M.knobY) < M.knobR * 2.4) {
        if (D.stars < COST) {
          wiggle = 0.3; AU.sad();
          SB.toast("⭐が " + COST + "こ いるよ。<br>ボールを 100かい はねさせる か、すくいで 1こ すくうと ⭐+1");
          return;
        }
        turn = { id: p.id, a: Math.atan2(p.y - M.knobY, p.x - M.knobX) };
      }
    },
    move: function (p) {
      if (!turn || turn.id !== p.id) return;
      var a = Math.atan2(p.y - M.knobY, p.x - M.knobX), d = a - turn.a;
      if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
      turn.a = a;
      if (d <= 0) return;           // とけいまわり だけ
      total += d; knobA += d; tick += d;
      if (tick > Math.PI / 6) { tick = 0; AU.karakara(); jostle(); }
      if (total >= Math.PI * 2) { total = 0; turn = null; dispense(); }
    },
    up: function (p) { if (turn && turn.id === p.id) turn = null; }
  };
  mode.state = function () { return { total: total, cap: cap && { state: cap.state, x: cap.x, y: cap.y, id: cap.k.id }, knob: M && { x: M.knobX, y: M.knobY, r: M.knobR } }; };
  SB.modes.gacha = mode;

  /* ---------- ずかん ---------- */
  function stars(n) { return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); }
  function openDetail(k) {
    $("dtNo").textContent = "No." + k.no;
    $("dtName").textContent = k.name;
    $("dtRar").textContent = "レアど " + "★★★★".slice(0, k.rar);
    $("dtDesc").textContent = k.desc;
    var bounce = k.e >= 1 ? 5 : k.e >= 0.85 ? 4 : k.e >= 0.6 ? 3 : 2;
    var size = (k.r[0] + k.r[1]) / 2, sz = size > 50 ? 5 : size > 20 ? 3 : 1;
    var fx = k.fx.glow ? "よるに ひかる" : k.fx.ghost ? "すけて すりぬける" : k.fx.split ? "2こに わかれる" : k.fx.sticky ? "くっつく" : k.fx.nonstop ? "とまらない" : "―";
    $("dtSpec").innerHTML = "<dt>はねる</dt><dd>" + stars(bounce) + "</dd><dt>おおきさ</dt><dd>" + stars(sz) + "</dd><dt>とくちょう</dt><dd>" + fx + "</dd><dt>もっている</dt><dd>" + (D.own[k.id] || 0) + "こ</dd>";
    $("detail").hidden = false;
    BL.thumb($("dtCv"), k);
    $("dtUse").onclick = function () { D.sel = k.id; SB.save(); $("detail").hidden = true; SB.go("free"); };
  }
  function buildZukan() {
    var g = $("zkGrid"); g.innerHTML = "";
    var have = 0;
    BL.KINDS.forEach(function (k) {
      var own = D.own[k.id] > 0;
      if (own) have++;
      var b = document.createElement("button");
      b.className = "zk-card r" + k.rar + (own ? "" : " no-have");
      b.innerHTML = "<span class='no'>" + k.no + "</span>" + (own ? "<span class='cnt'>×" + D.own[k.id] + "</span>" : "") +
        "<canvas></canvas><span class='nm'>" + (own ? k.name : "？？？") + "</span><span class='rr'>" + "★★★★".slice(0, k.rar) + "</span>";
      b.addEventListener("click", function () {
        AU.tap();
        if (own) openDetail(k); else SB.toast("まだ もっていないよ。ガチャや すくいで あつめよう");
      });
      g.appendChild(b);
      BL.thumb(b.querySelector("canvas"), k, !own);
    });
    $("zkN").textContent = have; $("zkAll").textContent = BL.KINDS.length;
  }
  SB.modes.zukan = {
    enter: function () { $("zukan").hidden = false; $("zukan").scrollTop = 0; buildZukan(); },
    exit: function () {},
    update: function () {},
    draw: function (c) { c.fillStyle = "#f4fce3"; c.fillRect(0, 0, SB.W, SB.H); }
  };
  $("toZukan").addEventListener("click", function () { AU.tap(); SB.go("zukan"); });
  $("zkGacha").addEventListener("click", function () { AU.tap(); SB.go("gacha"); });
  $("dtClose").addEventListener("click", function () { $("detail").hidden = true; });
})(window);
