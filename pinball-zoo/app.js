/* ============================================================
   ころころ ピンボール どうぶつえん — がめん（canvas）・そうさ・ほぞん
   ============================================================ */
(function () {
  "use strict";
  var T = window.PZTable, A = window.PZAudio;
  var W = T.W, H = T.H, KEY = "pinball-zoo-v1";
  var $ = function (id) { return document.getElementById(id); };
  var app = $("app"), cv = $("cv"), cx = cv.getContext("2d"), stage = $("stage");
  var ALL = T.ANIMALS.concat(T.NIGHT_ANIMALS);
  var INFO = {}; ALL.forEach(function (a) { INFO[a.id] = a; });

  /* ---------- ほぞん ---------- */
  var save = { hi: { easy: 0, normal: 0 }, mode: "easy", sound: true, bgm: true, woke: {}, plays: 0 };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { var s = JSON.parse(raw); if (s && typeof s === "object") for (var k in save) if (s[k] != null) save[k] = s[k]; }
  } catch (e) { /* むし */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* むし */ } }
  A.on = save.sound; A.bgm = save.bgm;

  var game = null, running = false, paused = false;
  var floats = [], parts = [], msgTimer = 0, lastShown = {};

  /* ---------- がめん の おおきさ ---------- */
  var scale = 1, dpr = 1;
  function fit() {
    var r = stage.getBoundingClientRect();
    var s = Math.min(r.width / W, r.height / H);
    if (!(s > 0)) s = 0.5;
    scale = s; dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.style.width = Math.floor(W * s) + "px"; cv.style.height = Math.floor(H * s) + "px";
    cv.width = Math.floor(W * s * dpr); cv.height = Math.floor(H * s * dpr);
  }
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", function () { setTimeout(fit, 200); });

  /* ---------- HUD ---------- */
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function buildZoo() {
    var ul = $("zooList"), html = "";
    var list = game && game.night ? T.ANIMALS.concat(T.NIGHT_ANIMALS) : T.ANIMALS;
    list.forEach(function (a) {
      html += '<li data-id="' + a.id + '"><span class="em">' + a.emoji + '</span><span class="zz">💤</span>' +
        '<span class="nm">' + a.name + '</span><span class="dots"></span><span class="how">' + a.how + "</span></li>";
    });
    ul.innerHTML = html;
  }
  function updHud() {
    if (!game) return;
    $("scoreNum").textContent = fmt(game.score);
    var y = T.yomi(game.score) + " てん";
    if (lastShown.yomi !== y) { $("scoreYomi").textContent = y; lastShown.yomi = y; }
    var bl = "", n = game.ballsLeft;
    for (var i = 0; i < Math.min(n, 8); i++) bl += "⚪";
    if (n > 8) bl += "×" + n;
    $("balls").textContent = bl;
    $("hiNum").textContent = fmt(Math.max(save.hi[game.mode] || 0, game.score));
    var nm = (game.night ? "🌙 よる の どうぶつえん" : "☀️ ひる の どうぶつえん") + (game.round > 1 ? "（" + game.round + "しゅうめ）" : "");
    if (lastShown.nm !== nm) { $("stageName").textContent = nm; lastShown.nm = nm; }
    var left = game.saverUntil - game.time;
    var sv = $("saver");
    if (left > 0 && game.phase === "play") { sv.hidden = false; $("saverTxt").textContent = "おちても もどる あと " + Math.ceil(left) + "びょう"; }
    else sv.hidden = true;
    var items = document.querySelectorAll("#zooList li");
    for (i = 0; i < items.length; i++) {
      var li = items[i], a = game.findAnimal(li.getAttribute("data-id"));
      if (!a) continue;
      var d = "";
      for (var j = 0; j < a.need; j++) d += j < a.hits || a.awake ? "●" : "○";
      var key = li.getAttribute("data-id") + d + a.awake;
      if (li._k !== key) { li._k = key; li.classList.toggle("awake", a.awake); li.querySelector(".dots").textContent = a.awake ? "✨" : d; }
    }
  }

  function showMsg(t, sec) {
    var m = $("msg");
    m.textContent = t; m.hidden = false;
    m.style.animation = "none"; void m.offsetWidth; m.style.animation = "";
    msgTimer = sec || 1.6;
  }

  function floatText(t, x, y, color, size) { floats.push({ t: t, x: x, y: y, life: 1.1, color: color || "#e8590c", size: size || 20 }); }
  function burst(x, y, n, emo) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 200;
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0.9 + Math.random() * 0.5, e: emo || "⭐" });
    }
  }

  /* ---------- ゲーム を はじめる ---------- */
  function start(mode) {
    save.mode = mode; save.plays++; store();
    game = new T.Game({ mode: mode });
    floats = []; parts = [];
    game.on(onEvent);
    app.classList.remove("night"); A.setNight(false);
    buildZoo(); lastShown = {};
    $("title").hidden = true; $("over").hidden = true; $("pause").hidden = true;
    paused = false; running = true;
    A.unlock();
    if (save.bgm) A.startBgm();
    showMsg("ばね を ひっぱって ⬇️ はなそう！", 2.2);
    fit();
  }

  function onEvent(e) {
    switch (e.type) {
      case "flip": A.flip(); break;
      case "bump": A.bump(); if (e.food) burst(e.x, e.y, 3, e.food); break;
      case "thud": A.thud(); break;
      case "score": floatText("+" + e.pts, e.x, e.y - 14); break;
      case "animal": A.call(e.id); floatText(INFO[e.id].call, e.x, e.y - 36, "#1971c2", 18); break;
      case "wake":
        A.wake();
        save.woke[e.id] = (save.woke[e.id] || 0) + 1; store();
        showMsg(INFO[e.id].emoji + " " + INFO[e.id].name + " が おきた！", 1.8);
        burst(e.x, e.y, 12);
        break;
      case "multiball": A.fanfare(); showMsg("🦁 がおー！ マルチボール！", 2); break;
      case "launch": A.launch(e.power); break;
      case "railEnd":
        if (e.kind === "giraffe") { A.rail(); }
        break;
      case "penguin": A.ice(); showMsg("🐧 ペンギン " + e.n + "わ！", 1.2); break;
      case "turtleUp": showMsg("🐢 カメ さん が たすけに きた！", 1.6); break;
      case "save": A.save(); showMsg("🛟 だいじょうぶ！ もう いっかい", 1.8); break;
      case "ballLost": A.drain(); showMsg("あと " + e.left + "こ！", 1.6); break;
      case "night":
        A.fanfare(); app.classList.add("night"); A.setNight(true);
        if (A.playing()) { A.stopBgm(); A.startBgm(); }
        buildZoo(); lastShown = {};
        showMsg("🌙 よる の どうぶつえん！ 🦉🦇", 2.6);
        break;
      case "parade": A.fanfare(); break;
      case "nudge": A.thud(); floatText("ゆらゆら〜", e.x, e.y - 20, "#5f3dc4", 14); break;
      case "round":
        app.classList.remove("night"); A.setNight(false);
        if (A.playing()) { A.stopBgm(); A.startBgm(); }
        buildZoo(); lastShown = {};
        showMsg("☀️ あさ に なった！ ボール +1", 2.2);
        break;
      case "gameover": gameOver(); break;
    }
  }

  function gameOver() {
    A.over();
    var best = save.hi[game.mode] || 0, isNew = game.score > best;
    if (isNew) save.hi[game.mode] = game.score;
    store();
    $("overHead").textContent = isNew ? "🎉 ハイスコア！" : "おしまい！";
    $("overScore").textContent = fmt(game.score);
    $("overYomi").textContent = T.yomi(game.score) + " てん";
    var awake = game.animals.concat(game.nightAnimals).filter(function (a) { return a.awake; });
    $("overNote").textContent = awake.length ? "おきた どうぶつ（" + awake.length + "）" : "つぎ は どうぶつ を おこそう！";
    $("overWoke").textContent = awake.map(function (a) { return INFO[a.id].emoji; }).join(" ");
    setTimeout(function () { $("over").hidden = false; }, 700);
  }

  function setPause(p) {
    if (!game || game.phase === "over") return;
    paused = p; $("pause").hidden = !p;
    if (p) { A.stopBgm(); game.setFlipper("left", false); game.setFlipper("right", false); }
    else if (save.bgm) A.startBgm();
  }

  /* ---------- そうさ ---------- */
  var pointers = new Map();
  function toTable(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale, mid: r.left + r.width / 2 };
  }
  function flipperHeld(side) {
    var held = false;
    pointers.forEach(function (p) { if (p.kind === side) held = true; });
    return held || keys[side];
  }
  function down(e) {
    if (!game || paused || game.phase === "over" || !running) return;
    if (e.target.closest && e.target.closest("button, a, .overlay")) return;
    if (e.cancelable) e.preventDefault();
    A.unlock();
    var p = toTable(e), side = e.clientX < p.mid ? "left" : "right";
    var kind = side;
    if (side === "right" && game.readyBall() && (game.liveCount() === 0 || (p.x > 290 && p.y > 520))) kind = "plunger";
    pointers.set(e.pointerId, { kind: kind, y0: e.clientY, t0: performance.now() });
    if (kind === "plunger") game.setPull(0.05);
    else game.setFlipper(side, true);
    try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (err) { /* むし */ }
  }
  function move(e) {
    var p = pointers.get(e.pointerId);
    if (!p || p.kind !== "plunger") return;
    if (e.cancelable) e.preventDefault();
    p.drag = Math.max(0, (e.clientY - p.y0) / (150 * scale));
  }
  function up(e) {
    var p = pointers.get(e.pointerId);
    if (!p) return;
    pointers.delete(e.pointerId);
    if (p.kind === "plunger") game.release();
    else if (!flipperHeld(p.kind)) game.setFlipper(p.kind, false);
  }
  document.addEventListener("pointerdown", down, { passive: false });
  document.addEventListener("pointermove", move, { passive: false });
  document.addEventListener("pointerup", up);
  document.addEventListener("pointercancel", up);
  // ながおし メニュー・スクロール を とめる
  stage.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  stage.addEventListener("touchstart", function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });

  var keys = { left: false, right: false, plunger: false }, plungeT0 = 0;
  function keySide(k) {
    if (k === "ArrowLeft" || k === "z" || k === "Z") return "left";
    if (k === "ArrowRight" || k === "/" || k === "?") return "right";
    if (k === " " || k === "ArrowDown" || k === "Enter") return "plunger";
    return null;
  }
  document.addEventListener("keydown", function (e) {
    if (!game || !running) return;
    if (e.key === "Escape" || e.key === "p") { setPause(!paused); return; }
    var s = keySide(e.key);
    if (!s || paused) return;
    e.preventDefault();
    if (e.repeat || keys[s]) return;
    keys[s] = true; A.unlock();
    if (s === "plunger") { plungeT0 = performance.now(); game.setPull(0.05); }
    else game.setFlipper(s, true);
  });
  document.addEventListener("keyup", function (e) {
    var s = keySide(e.key);
    if (!s || !game) return;
    keys[s] = false;
    if (s === "plunger") game.release();
    else if (!flipperHeld(s)) game.setFlipper(s, false);
  });
  document.addEventListener("visibilitychange", function () { if (document.hidden && running && game && game.phase !== "over") setPause(true); });

  function updPull() {
    if (!game || !game.pulling) return;
    var now = performance.now(), v = 0;
    pointers.forEach(function (p) { if (p.kind === "plunger") v = Math.max(v, p.drag || 0, (now - p.t0) / 900); });
    if (keys.plunger) v = Math.max(v, (now - plungeT0) / 900);
    var old = game.pull;
    game.setPull(Math.max(0.05, v));
    if (Math.floor(game.pull * 8) !== Math.floor(old * 8)) A.spring(game.pull);
  }

  /* ---------- ボタン ---------- */
  function syncBtns() {
    $("sndBtn").classList.toggle("off", !save.sound); $("sndBtn").textContent = save.sound ? "🔊" : "🔈";
    $("bgmBtn").classList.toggle("off", !save.bgm);
  }
  $("sndBtn").addEventListener("click", function () { save.sound = !save.sound; A.on = save.sound; store(); syncBtns(); });
  $("bgmBtn").addEventListener("click", function () {
    save.bgm = !save.bgm; A.bgm = save.bgm; store(); syncBtns();
    if (save.bgm && running && !paused) { A.unlock(); A.startBgm(); }
  });
  $("pauseBtn").addEventListener("click", function () { setPause(!paused); });
  $("resumeBtn").addEventListener("click", function () { setPause(false); });
  $("quitBtn").addEventListener("click", toTitle);
  $("againBtn").addEventListener("click", function () { start(game.mode); });
  $("toTitleBtn").addEventListener("click", toTitle);
  Array.prototype.forEach.call(document.querySelectorAll(".mode[data-mode]"), function (b) {
    b.addEventListener("click", function () { start(b.getAttribute("data-mode")); });
  });
  function toTitle() {
    running = false; paused = false; A.stopBgm();
    $("pause").hidden = true; $("over").hidden = true; $("title").hidden = false;
    showBest();
  }
  function showBest() {
    var t = "ハイスコア: やさしい " + fmt(save.hi.easy || 0) + " ／ ふつう " + fmt(save.hi.normal || 0);
    var w = 0; for (var k in save.woke) w += save.woke[k];
    if (w) t += "　おこした どうぶつ " + w + "かい";
    $("bestTxt").textContent = t;
  }
  syncBtns(); showBest();

  /* ---------- かく ---------- */
  function em(t, x, y, size, alpha) {
    cx.globalAlpha = alpha == null ? 1 : alpha;
    cx.font = size + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText(t, x, y);
    cx.globalAlpha = 1;
  }
  function txt(t, x, y, size, color, stroke) {
    cx.font = "bold " + size + 'px "Hiragino Maru Gothic ProN","Hiragino Sans",sans-serif';
    cx.textAlign = "center"; cx.textBaseline = "middle";
    if (stroke) { cx.lineWidth = 4; cx.strokeStyle = stroke; cx.strokeText(t, x, y); }
    cx.fillStyle = color; cx.fillText(t, x, y);
  }
  function line(pts, w, c) {
    cx.beginPath(); cx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) cx.lineTo(pts[i][0], pts[i][1]);
    cx.lineWidth = w; cx.strokeStyle = c; cx.lineCap = "round"; cx.lineJoin = "round"; cx.stroke();
  }
  function circle(x, y, r, fill, stroke, lw) {
    cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { cx.fillStyle = fill; cx.fill(); }
    if (stroke) { cx.lineWidth = lw || 2; cx.strokeStyle = stroke; cx.stroke(); }
  }
  function awake(id) { var a = game.findAnimal(id); return a && a.awake; }
  function zz(x, y, t) { em("💤", x + Math.sin(t * 2) * 3, y - (t * 6) % 8, 14, 0.85); }

  var stars = []; for (var si = 0; si < 40; si++) stars.push([Math.random() * W, Math.random() * H, Math.random() * 6]);

  function drawTable(t) {
    var night = game.night, A_ = T.ARC, L = T.LANE;
    // しばふ
    var g = cx.createLinearGradient(0, 0, 0, H);
    if (night) { g.addColorStop(0, "#1b1f4b"); g.addColorStop(1, "#0d2b25"); }
    else { g.addColorStop(0, "#b2f2bb"); g.addColorStop(1, "#69db7c"); }
    cx.fillStyle = night ? "#0b0d24" : "#8c5a2b"; cx.fillRect(0, 0, W, H);
    cx.save();
    cx.beginPath();
    cx.arc(A_.x, A_.y, A_.r, Math.PI, 0);
    cx.lineTo(L.x1, L.floor); cx.lineTo(L.x0, L.floor); cx.lineTo(L.x0, 545); cx.lineTo(276, 616);
    cx.lineTo(276, H); cx.lineTo(124, H); cx.lineTo(124, 616); cx.lineTo(20, 545); cx.closePath();
    cx.fillStyle = g; cx.fill();
    cx.clip();
    if (night) {
      for (var i = 0; i < stars.length; i++) { var s = stars[i]; circle(s[0], s[1] * 0.5, 1.2, "rgba(255,255,220," + (0.4 + 0.4 * Math.sin(t * 2 + s[2])) + ")"); }
      // ライト
      [[60, 120], [340, 300], [60, 520], [200, 520], [330, 560]].forEach(function (p, k) {
        var rg = cx.createRadialGradient(p[0], p[1], 2, p[0], p[1], 70);
        var a = 0.28 + 0.1 * Math.sin(t * 3 + k);
        rg.addColorStop(0, "rgba(255,230,120," + a + ")"); rg.addColorStop(1, "rgba(255,230,120,0)");
        cx.fillStyle = rg; cx.fillRect(p[0] - 70, p[1] - 70, 140, 140);
      });
    } else {
      // こみち と くさ
      cx.fillStyle = "#ffec99aa";
      cx.beginPath(); cx.ellipse(200, 470, 130, 40, 0, 0, Math.PI * 2); cx.fill();
      for (i = 0; i < 18; i++) em("🌿", (i * 67) % 340 + 30, (i * 131) % 480 + 80, 12, 0.35);
    }
    // ペンギン の こおり ループ
    var lc = game.loopC;
    circle(lc.x, lc.y, lc.r + 10, night ? "#4dabf733" : "#d0ebffaa");
    circle(lc.x, lc.y, lc.r, null, night ? "#a5d8ff" : "#74c0fc", 7);
    line([[318, 262], [334, 210], [334, 165]], 7, night ? "#a5d8ff88" : "#74c0fc88");
    var np = Math.min(game.penguins, 10);
    for (i = 0; i < np; i++) {
      var pa = -t * 1.5 + i * (Math.PI * 2 / Math.max(np, 1));
      em("🐧", lc.x + Math.cos(pa) * lc.r, lc.y + Math.sin(pa) * lc.r, 14);
    }
    if (np === 0) em("🐧", lc.x, lc.y, 22, 0.6);
    if (!awake("penguin")) zz(lc.x + 14, lc.y - 10, t);
    // キリン
    var gw = game.anim.giraffe, gb = game.giraffeBody;
    line([[gb.x + 8, gb.y - 14], [80, 262], [74, 205], [76, 172]], 13, "#fcc419");
    line([[86, 322], [80, 262], [74, 205], [76, 172], [96, 124], [120, 104]], 3, gw > 0 ? "#fff" : "#e67700aa");
    for (i = 0; i < 5; i++) circle(78 - i * 0.6, 340 - i * 34, 3, "#a05a00");
    circle(gb.x, gb.y, gb.r, "#fcc419", "#e67700", 2);
    circle(gb.x - 7, gb.y - 4, 4, "#a05a00"); circle(gb.x + 6, gb.y + 6, 4, "#a05a00");
    em("🦒", 78, 160 - gw * 6, 30, awake("giraffe") ? 1 : 0.75);
    circle(86, 322, 12, null, "#e67700", 2);
    if (!awake("giraffe")) zz(98, 150, t);
    // ゾウ
    var eb = game.elephantBody, ew = game.anim.elephant;
    em("🐘", eb.x + 2, eb.y - 2, 50, awake("elephant") ? 1 : 0.8);
    var tipx = 304 + ew * 4, tipy = 478 - ew * 26;
    cx.beginPath(); cx.moveTo(eb.x - 14, eb.y + 10); cx.quadraticCurveTo(306, 462 - ew * 10, tipx, tipy);
    cx.lineWidth = 9; cx.strokeStyle = "#adb5bd"; cx.lineCap = "round"; cx.stroke();
    circle(304, 478, 13, null, "#868e96", 2);
    if (!awake("elephant")) zz(eb.x + 18, eb.y - 26, t);
    // ライオン の おり
    var li = game.lion, la = game.anim.lion;
    circle(li.x, li.y, li.r + 2, game.flash.has(li) ? "#ffe066" : (night ? "#5c4033" : "#ffd8a8"));
    em("🦁", li.x, li.y + 1, 30 + la * 8, awake("lion") ? 1 : 0.75);
    for (i = -2; i <= 2; i++) line([[li.x + i * 8, li.y - li.r], [li.x + i * 8, li.y + li.r]], 2.5, "#495057");
    circle(li.x, li.y, li.r + 2, null, "#495057", 3);
    if (!awake("lion")) zz(li.x + 22, li.y - 22, t);
    else if (game.lionCount) txt(game.lionCount + "/3", li.x, li.y + 34, 12, "#d9480f", "#fff");
    // バンパー（えさ）
    game.bumpers.forEach(function (b) {
      var f = game.flash.has(b);
      circle(b.x, b.y, b.r + (f ? 3 : 0), f ? "#fff3bf" : (night ? "#e64980" : "#ff8787"), night ? "#ffd43b" : "#c92a2a", 3);
      em(b.food, b.x, b.y + 1, 20);
    });
    // サル の ぶらんこ
    var m = game.monkey, sw = game.swing;
    line([[sw.px - 10, sw.py], [m.x - 8, m.y - 10]], 2, "#8c5a2b");
    line([[sw.px + 10, sw.py], [m.x + 8, m.y - 10]], 2, "#8c5a2b");
    line([[m.x - 14, m.y - 10], [m.x + 14, m.y - 10]], 4, "#8c5a2b");
    em("🐒", m.x, m.y + 2, 30, awake("monkey") ? 1 : 0.8);
    if (!awake("monkey")) zz(m.x + 16, m.y - 18, t);
    // よる の しかけ
    if (night) {
      var ow = game.owl;
      line([[ow.x - 18, ow.y + 14], [ow.x + 18, ow.y + 14]], 5, "#8c5a2b");
      em("🦉", ow.x, ow.y - 2, 28, 1);
      if (game.anim.owl > 0) em("❗", ow.x + 16, ow.y - 20, 14);
      if (!awake("owl")) zz(ow.x + 16, ow.y - 18, t);
      var bt = game.bat;
      em("🦇", bt.x, bt.y, 26);
      if (!awake("bat")) zz(bt.x + 14, bt.y - 14, t);
    }
    // カメ
    var ts = game.turtleState;
    if (game.turtle.active) em("🐢", 200, 678 + Math.sin(t * 6) * 1.5, 34);
    else if (ts.catching > 0) em("🐢", 200, 664 + (0.9 - ts.catching) * 30, 34);
    cx.restore();

    // かべ（さく）
    cx.lineCap = "round"; cx.lineJoin = "round";
    var wallC = night ? "#ffd43b" : "#8c5a2b", wallW = 6;
    cx.beginPath(); cx.arc(A_.x, A_.y, A_.r, Math.PI, 0); cx.lineWidth = wallW; cx.strokeStyle = wallC; cx.stroke();
    line([[20, A_.y], [20, 545], [124, 616]], wallW, wallC);
    line([[L.x0, L.top], [L.x0, 545], [276, 616]], wallW, wallC);
    line([[L.x0, 545], [L.x0, L.floor]], wallW, wallC);
    line([[L.x1, A_.y], [L.x1, L.floor]], wallW, wallC);
    line([[L.x1, 190], [L.x0, 214]], 3, night ? "#ffd43b88" : "#8c5a2b88");
    // ばね
    var pull = game.pulling ? game.pull : 0, top = L.floor + pull * 10;
    var sp = [], n = 8;
    for (i = 0; i <= n; i++) sp.push([L.cx + (i % 2 ? 9 : -9), top + i * (H - 4 - top) / n]);
    line(sp, 3, "#adb5bd");
    line([[L.x0 + 3, top], [L.x1 - 3, top]], 5, "#e03131");
    // フリッパー
    ["left", "right"].forEach(function (sd) {
      var f = game.fl[sd], tp = f.tip();
      line([[f.px, f.py], tp], f.r * 2 + 2, night ? "#ffd43b" : "#f08c00");
      line([[f.px, f.py], tp], f.r * 2 - 4, night ? "#fff3bf" : "#ffc078");
      circle(f.px, f.py, 3, "#7f3f00");
    });
  }

  function drawBall(b) {
    var g = cx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, b.r);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.5, "#ced4da"); g.addColorStop(1, "#495057");
    circle(b.x, b.y, b.r, g);
  }

  function drawParade(t) {
    var pt = game.paradeT;
    cx.fillStyle = "rgba(10,10,40,0.78)"; cx.fillRect(0, 0, W, H);
    for (var i = 0; i < 12; i++) {
      var x = 20 + i * 33, c = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7"][i % 4];
      line([[x, 150], [x + 33, 150]], 2, "#fff8");
      circle(x + 16, 160, 7, Math.sin(t * 6 + i) > 0 ? c : c + "66");
    }
    txt("🎉 どうぶつえん パレード！", 200, 100, 26, "#ffd43b", "#5f3dc4");
    var list = ALL;
    for (i = 0; i < list.length; i++) {
      var x2 = -60 + (pt * 90) - i * 52;
      var y2 = 400 + Math.sin(pt * 6 + i) * 10;
      if (x2 > -40 && x2 < W + 40) em(list[i].emoji, x2, y2, 40);
    }
    for (i = 0; i < list.length; i++) {
      var x3 = W + 60 - (pt * 90) + i * 52;
      if (x3 > -40 && x3 < W + 40) em(["🎈", "🎺", "🥁", "🎪", "🎵", "⭐", "🎈", "🎊"][i], x3, 520 + Math.cos(pt * 5 + i) * 10, 30);
    }
    txt("みんな おきて くれて ありがとう！", 200, 620, 18, "#fff", "#5f3dc4");
  }

  function draw(t, dt) {
    var s = scale * dpr;
    cx.setTransform(s, 0, 0, s, 0, 0);
    cx.clearRect(0, 0, W, H);
    if (!game) { drawIdle(t); return; }
    drawTable(t);
    game.world.balls.forEach(drawBall);
    // うちだし の ヒント
    if (game.readyBall() && game.liveCount() === 0 && game.phase !== "over") {
      var bob = Math.sin(t * 5) * 5;
      txt("⬇️", T.LANE.cx, 610 + bob, 22, "#e03131");
      txt("ひっぱる", T.LANE.cx - 40, 640, 13, "#c92a2a", "#fff");
    }
    // とんでいく もじ
    for (var i = floats.length - 1; i >= 0; i--) {
      var f = floats[i]; f.life -= dt; f.y -= 30 * dt;
      if (f.life <= 0) { floats.splice(i, 1); continue; }
      cx.globalAlpha = Math.min(1, f.life * 2);
      txt(f.t, f.x, f.y, f.size, f.color, "#fff");
      cx.globalAlpha = 1;
    }
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life -= dt; p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      em(p.e, p.x, p.y, 16, Math.min(1, p.life * 2));
    }
    if (game.phase === "parade") drawParade(t);
  }

  function drawIdle(t) {
    var g = cx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#b2f2bb"); g.addColorStop(1, "#69db7c");
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    var list = T.ANIMALS;
    for (var i = 0; i < list.length; i++) em(list[i].emoji, 70 + (i % 3) * 130, 250 + Math.floor(i / 3) * 140 + Math.sin(t * 2 + i) * 8, 50);
  }

  /* ---------- ループ ---------- */
  var lastT = performance.now(), acc = 0;
  function frame(now) {
    var dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    if (game && running && !paused) {
      updPull();
      acc += dt;
      var n = 0;
      while (acc >= 1 / 60 && n < 5) { game.step(1 / 60); acc -= 1 / 60; n++; }
      if (n === 5) acc = 0;
      updHud();
    }
    if (msgTimer > 0 && !paused) { msgTimer -= dt; if (msgTimer <= 0) $("msg").hidden = true; }
    draw(now / 1000, paused ? 0 : dt);
    requestAnimationFrame(frame);
  }
  fit();
  requestAnimationFrame(frame);

  /* テスト よう */
  window.PZTest = {
    game: function () { return game; },
    start: start,
    state: function () {
      if (!game) return null;
      return {
        phase: game.phase, score: game.score, balls: game.world.balls.length, ballsLeft: game.ballsLeft,
        left: game.fl.left.pressed, right: game.fl.right.pressed,
        leftAngle: game.fl.left.angle, rightAngle: game.fl.right.angle,
        ready: !!game.readyBall(), live: game.liveCount(), night: game.night,
        scale: window.visualViewport ? window.visualViewport.scale : 1
      };
    }
  };
})();
