/* ============================================================
   ぽよよん スーパーボール — きほん（ほぞん・キャンバス・ループ・ゆび・がめん きりかえ）
   モードは modes/*.js が SB.modes に とうろく する
   { enter, exit, update(dt), draw(c), down(p), move(p), up(p), resize() }
   ============================================================ */
(function (root) {
  "use strict";
  var P = root.SBPhysics, BL = root.SBBalls, AU = root.SBAudio;
  var $ = function (id) { return document.getElementById(id); };
  var SB = root.SB = { modes: {}, cur: null, curId: "", W: 0, H: 0, dpr: 1, S: 1, fps: 60, t: 0, $: $ };

  /* ---------- ほぞん（localStorage は かならず try/catch）---------- */
  var KEY = "superball-poyon-v1";
  var DEF = {
    snd: true, vol: 0.7,
    total: 0, day: "", today: 0, acc: 0,       // はねた かず（これまで・きょう）、⭐ までの のこり
    stars: 5, own: { aka: 1, ao: 1, kiiro: 1 }, // ⭐ と もっている ボール（かず）
    sel: "random", night: false, music: false,
    sukuiBest: 0, nerai: {}
  };
  function load() {
    var d = JSON.parse(JSON.stringify(DEF));
    try {
      var raw = root.localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o === "object") for (var k in o) if (Object.prototype.hasOwnProperty.call(d, k)) d[k] = o[k];
      }
    } catch (e) { /* よめなくても あそべる */ }
    if (!d.own || typeof d.own !== "object") d.own = JSON.parse(JSON.stringify(DEF.own));
    return d;
  }
  var D = SB.data = load();
  var saveTimer = 0;
  // まとめて ほぞん（はねている あいだも 0.4びょう ごとに かならず ほぞん される）
  SB.save = function (now) {
    var go = function () { saveTimer = 0; try { root.localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* むし */ } };
    if (now) { clearTimeout(saveTimer); go(); } else if (!saveTimer) saveTimer = setTimeout(go, 400);
  };
  function dayKey() { var t = new Date(); return t.getFullYear() + "-" + (t.getMonth() + 1) + "-" + t.getDate(); }
  function checkDay() { var k = dayKey(); if (D.day !== k) { D.day = k; D.today = 0; } }
  checkDay();

  /* ---------- はねた かず と ⭐ ---------- */
  SB.run = 0;
  SB.addBounce = function (n) {
    n = n || 1;
    checkDay();
    SB.run += n; D.today += n; D.total += n; D.acc += n;
    while (D.acc >= 100) { D.acc -= 100; SB.addStars(1); }
    SB.save();
  };
  SB.addStars = function (n, x, y) {
    D.stars += n;
    SB.save();
    var p = $("starPill");
    p.classList.remove("bump"); void p.offsetWidth; p.classList.add("bump");
    AU.star();
    if (x != null) SB.fx.text(x, y, "⭐+" + n, "#f59f00");
    else { var r = p.getBoundingClientRect(); SB.fx.text(r.left + r.width / 2, r.bottom + 18, "⭐+" + n, "#f59f00"); }
    updateBar();
  };
  // ボールを もらう。はじめての ときは true
  SB.giveBall = function (id) {
    var isNew = !D.own[id];
    D.own[id] = (D.own[id] || 0) + 1;
    SB.save();
    return isNew;
  };
  SB.ownedKinds = function () { return BL.KINDS.filter(function (k) { return D.own[k.id] > 0; }); };

  // ふるい ブラウザ よう（roundRect が ない とき）
  if (root.CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(typeof r === "number" ? r : 0, w / 2, h / 2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }

  /* ---------- キャンバス ---------- */
  var cv = $("cv"), ctx = cv.getContext("2d");
  SB.cv = cv; SB.ctx = ctx;
  function resize() {
    var W = root.innerWidth, H = root.innerHeight;
    SB.dpr = Math.min(2, root.devicePixelRatio || 1);   // 3 だと おもく なるので 2 まで
    SB.W = W; SB.H = H;
    SB.S = Math.max(0.9, Math.min(1.6, Math.min(W, H) / 390));
    cv.width = Math.round(W * SB.dpr); cv.height = Math.round(H * SB.dpr);
    if (SB.cur && SB.cur.resize) SB.cur.resize();
  }
  // あそべる ばしょ（バーと どうぐの あいだ）
  SB.rect = function () {
    var top = $("bar").getBoundingClientRect().bottom, x1 = SB.W, y1 = SB.H;
    var tools = document.querySelector(".tools:not([hidden])");
    if (tools) {
      var r = tools.getBoundingClientRect();
      if (r.width < SB.W * 0.6) x1 = r.left; else y1 = r.top;
    }
    return { x0: 0, y0: top, x1: x1, y1: y1, w: x1, h: y1 - top };
  };

  /* ---------- こうか（つぶつぶ・もじ）---------- */
  var parts = [], texts = [];
  SB.fx = {
    burst: function (x, y, col, n, sp) {
      n = n || 10; sp = sp || 260;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random() * 0.8);
        parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.3, t: 0, col: col, r: 2 + Math.random() * 3 });
      }
      if (parts.length > 500) parts.splice(0, parts.length - 500);
    },
    text: function (x, y, s, col, size) { texts.push({ x: x, y: y, s: s, col: col || "#fff", t: 0, size: size || 22 }); },
    clear: function () { parts.length = 0; texts.length = 0; }
  };
  function drawFx(c, dt) {
    var i, p;
    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i]; p.t += dt;
      if (p.t > p.life) { parts.splice(i, 1); continue; }
      p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      c.globalAlpha = 1 - p.t / p.life; c.fillStyle = p.col;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
    c.textAlign = "center"; c.textBaseline = "middle";
    for (i = texts.length - 1; i >= 0; i--) {
      p = texts[i]; p.t += dt;
      if (p.t > 1.1) { texts.splice(i, 1); continue; }
      c.globalAlpha = Math.min(1, 2.2 - p.t * 2);
      c.font = "bold " + p.size + "px " + getComputedStyle(document.body).fontFamily;
      c.lineWidth = 4; c.strokeStyle = "rgba(0,0,0,.35)";
      c.strokeText(p.s, p.x, p.y - p.t * 40); c.fillStyle = p.col; c.fillText(p.s, p.x, p.y - p.t * 40);
    }
    c.globalAlpha = 1;
  }

  /* ---------- ボール（ぶつり ＋ みため）---------- */
  SB.makeBall = function (w, kind, x, y, r, o) {
    var k = typeof kind === "string" ? BL.BY[kind] : kind;
    o = o || {};
    var b = w.add({
      x: x, y: y, r: r, vx: o.vx || 0, vy: o.vy || 0, w: o.w || 0, a: Math.random() * 6.28,
      e: k.e, et: k.et, mu: k.mu, rho: o.rho || k.rho, noSleep: !!k.fx.nonstop, air: k.fx.nonstop ? 0 : 1,
      data: { k: k, sq: 0, sqa: 0, born: SB.t, ht: -1, gen: o.gen || 0, ghost: Math.random() * 6 }
    });
    return b;
  };
  SB.randR = function (k, f) { f = f || 1; return (k.r[0] + Math.random() * (k.r[1] - k.r[0])) * SB.S * f; };
  // ぶつかった ときの つぶれ
  SB.squash = function (b, sp, nx, ny) {
    var d = b.data; if (!d) return;
    var s = Math.min(0.32, sp / 5200);
    if (d.k.fx.sticky) s *= 1.6;
    if (s > d.sq) { d.sq = s; d.sqa = Math.atan2(ny, nx); }
  };
  SB.tickBall = function (b, dt) {
    var d = b.data;
    if (d.sq > 0.002) d.sq *= Math.exp(-14 * dt); else d.sq = 0;
  };
  SB.drawBall = function (c, b, o) {
    var d = b.data, k = d.k, age = SB.t - d.born, sc = age < 0.14 ? 0.4 + 0.6 * Math.sin(age / 0.14 * Math.PI / 2) : 1;
    var alpha = o && o.alpha != null ? o.alpha : 1;
    if (k.fx.ghost && b.noBall) alpha *= 0.35;
    BL.draw(c, k, b.x, b.y, b.r * sc, SB.dpr, { a: b.a, sq: d.sq, sqa: d.sqa, alpha: alpha });
  };

  /* ---------- おしらせ ---------- */
  var toastTimer = 0;
  SB.toast = function (msg, ms) {
    var t = $("toast");
    t.innerHTML = msg; t.hidden = false;
    t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, ms || 2200);
  };

  /* ---------- けっかの シート ---------- */
  SB.showResult = function (o) {
    $("resBadge").textContent = o.badge || "";
    $("resTitle").innerHTML = o.title || "";
    $("resMsg").innerHTML = o.msg || "";
    var big = $("resCv"), list = $("resList");
    big.hidden = !o.kind;
    list.innerHTML = "";
    $("result").hidden = false;
    if (o.kind) BL.thumb(big, o.kind);
    (o.list || []).forEach(function (k) {
      var c = document.createElement("canvas"); list.appendChild(c); BL.thumb(c, k);
    });
    var row = $("resBtns"); row.innerHTML = "";
    (o.buttons || []).forEach(function (bt) {
      var b = document.createElement("button");
      b.className = "pill wide" + (bt.primary ? " primary" : "");
      b.innerHTML = bt.label;
      b.addEventListener("click", function () { $("result").hidden = true; AU.tap(); bt.fn && bt.fn(); });
      row.appendChild(b);
    });
  };

  /* ---------- バー ---------- */
  var lastBar = 0;
  function updateBar() {
    $("starN").textContent = D.stars;
    $("cRun").textContent = SB.run;
    $("cDay").textContent = D.today;
    $("cAll").textContent = D.total;
  }
  SB.updateBar = updateBar;

  function setSoundUI() {
    $("sndBtn").textContent = D.snd ? (D.vol < 0.35 ? "🔉" : "🔊") : "🔇";
    $("sndToggle").textContent = D.snd ? "🔊 おと オン" : "🔇 おと オフ";
    $("sndToggle").setAttribute("aria-pressed", D.snd ? "true" : "false");
    $("sndVol").value = Math.round(D.vol * 100);
  }

  /* ---------- がめん きりかえ ---------- */
  var TITLES = { home: "ぽよよん スーパーボール", free: "じゆう あそび", sukui: "スーパーボール すくい", gacha: "ガチャガチャ", zukan: "ボール ずかん", nerai: "ねらって ぽよん", hazumu: "どれが いちばん はねる？" };
  SB.go = function (id, arg) {
    if (SB.cur && SB.cur.exit) SB.cur.exit();
    ["home", "zukan", "freeTools", "sukuiHud", "gachaHud", "neraiSel", "neraiHud", "hazumuHud", "hzExplain", "palette", "detail", "result", "counts", "sndPop"].forEach(function (x) { $(x).hidden = true; });
    document.body.className = "mode-" + id;
    $("homeBtn").hidden = id === "home";
    $("titleText").textContent = TITLES[id] || SB.modes[id].title || "";
    SB.fx.clear();
    $("toast").hidden = true;
    SB.cur = SB.modes[id]; SB.curId = id;
    pointers.clear();
    SB.cur.enter(arg);
    if (SB.cur.resize) SB.cur.resize();
    updateBar();
  };

  /* ---------- ゆび ---------- */
  var pointers = new Map();
  function pt(e) { return { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() / 1000 }; }
  cv.addEventListener("pointerdown", function (e) {
    AU.unlock();
    $("sndPop").hidden = true;
    try { cv.setPointerCapture(e.pointerId); } catch (er) { /* むし */ }
    var p = pt(e); pointers.set(e.pointerId, true);
    if (SB.cur && SB.cur.down) SB.cur.down(p);
    e.preventDefault();
  });
  cv.addEventListener("pointermove", function (e) {
    if (!pointers.has(e.pointerId)) { if (SB.cur && SB.cur.hover) SB.cur.hover(pt(e)); return; }
    if (SB.cur && SB.cur.move) SB.cur.move(pt(e));
  });
  function up(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (SB.cur && SB.cur.up) SB.cur.up(pt(e), e.type === "pointercancel");
  }
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);
  cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  // ひっぱって こうしん・スクロールを ふせぐ（ずかん と シートの なかは スクロール できる）
  document.addEventListener("touchmove", function (e) {
    if (!e.target.closest || !e.target.closest("#zukan, .sheet-card")) { if (e.cancelable) e.preventDefault(); }
  }, { passive: false });

  /* ---------- ループ ---------- */
  var last = 0;
  function frame(ts) {
    root.requestAnimationFrame(frame);
    var dt = last ? (ts - last) / 1000 : 1 / 60;
    last = ts;
    if (dt <= 0) return;
    if (dt > 0.25) dt = 1 / 60;          // べつの タブから もどった とき
    SB.fps = SB.fps * 0.94 + Math.min(240, 1 / dt) * 0.06;
    SB.t += dt;
    var c = ctx;
    c.setTransform(SB.dpr, 0, 0, SB.dpr, 0, 0);
    if (SB.cur) {
      SB.cur.update(Math.min(dt, 1 / 20));
      SB.cur.draw(c);
    }
    drawFx(c, Math.min(dt, 1 / 20));
    if (ts - lastBar > 120) { lastBar = ts; if (SB.curId === "free") updateBar(); }
  }
  // こてい タイムステップ（けっていてき）。ステップの かずは 1フレーム 3かい まで
  SB.stepper = function (fn, h) {
    var acc = 0; h = h || 1 / 60;
    return function (dt) {
      acc += dt;
      var n = 0;
      while (acc >= h && n < 3) { fn(h); acc -= h; n++; }
      if (n === 3) acc = 0;
    };
  };

  /* ---------- ホーム（うしろで ボールが はねる）---------- */
  var home = (function () {
    var w = null, step = null, rect = null;
    function build() {
      rect = SB.rect();
      if (!w) {
        w = new P.World({ gy: 1300 * SB.S, substeps: 4 });
        w.onHit = function (b, o, sp, nx, ny) { SB.squash(b, sp, nx, ny); if (o.data) SB.squash(o, sp, -nx, -ny); };
        step = SB.stepper(function (h) { w.step(h); });
      }
      w.setBounds(rect.x0, rect.y0 - 400, rect.x1, rect.y1, { open: true });
      w.bodies.forEach(function (b) { b.x = Math.max(rect.x0 + b.r, Math.min(rect.x1 - b.r, b.x)); b.y = Math.min(rect.y1 - b.r, b.y); });
    }
    return {
      enter: function () {
        $("home").hidden = false;
        var own = SB.ownedKinds();
        $("zukanSub").textContent = "あつめた かず " + own.length + " / " + BL.KINDS.length;
        build();
        if (w.bodies.length === 0) {
          for (var i = 0; i < 14; i++) {
            var k = BL.KINDS[i % 12];
            SB.makeBall(w, k, rect.x0 + Math.random() * rect.w, rect.y0 - Math.random() * 300, SB.randR(k, 1.2), { vx: (Math.random() - 0.5) * 600 });
          }
        }
      },
      exit: function () {},
      resize: build,
      update: function (dt) { step(dt); w.bodies.forEach(function (b) { SB.tickBall(b, dt); }); },
      draw: function (c) {
        var g = c.createLinearGradient(0, 0, 0, SB.H);
        g.addColorStop(0, "#fff0f6"); g.addColorStop(1, "#fff3bf");
        c.fillStyle = g; c.fillRect(0, 0, SB.W, SB.H);
        w.bodies.forEach(function (b) { SB.drawBall(c, b); });
      },
      down: function (p) {
        var b = w.pick(p.x, p.y, 10);
        if (b) { w.wake(b); b.vy = -900 * SB.S; b.vx += (Math.random() - 0.5) * 400; AU.poyon(b.r, 900, b.id); return; }
        if (w.bodies.length > 40) w.remove(w.bodies[0]);
        var k = BL.KINDS[Math.floor(Math.random() * 12)];
        SB.makeBall(w, k, p.x, p.y, SB.randR(k), { vy: -200 });
        AU.pon();
      }
    };
  })();
  SB.modes.home = home;

  /* ---------- ボタン ---------- */
  function wire() {
    $("homeBtn").addEventListener("click", function () { AU.tap(); SB.go("home"); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-go]"), function (b) {
      b.addEventListener("click", function () { AU.unlock(); AU.tap(); SB.go(b.getAttribute("data-go")); });
    });
    $("sndBtn").addEventListener("click", function () { AU.unlock(); $("sndPop").hidden = !$("sndPop").hidden; });
    $("sndToggle").addEventListener("click", function () {
      D.snd = !D.snd; AU.setOn(D.snd); SB.save(); setSoundUI(); if (D.snd) AU.tap();
    });
    $("sndVol").addEventListener("input", function () {
      D.vol = $("sndVol").value / 100; AU.setVol(D.vol); if (!D.snd && D.vol > 0) { D.snd = true; AU.setOn(true); }
      SB.save(); setSoundUI();
    });
    $("sndVol").addEventListener("change", function () { AU.poyon(20, 1000); });
    root.addEventListener("resize", resize);
    root.addEventListener("orientationchange", function () { setTimeout(resize, 200); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) SB.save(true); });
    root.addEventListener("pagehide", function () { SB.save(true); });
  }

  SB.start = function () {
    AU.setOn(D.snd); AU.setVol(D.vol);
    setSoundUI();
    wire();
    resize();
    var q = /[?&]mode=(\w+)/.exec(location.search);
    SB.go(q && SB.modes[q[1]] ? q[1] : "home");
    root.requestAnimationFrame(frame);
  };
})(window);
