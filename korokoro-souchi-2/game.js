/* ============================================================
   ころころ そうち — うごき（がめん・そうさ・おと・ほぞん）
   ============================================================ */
(function () {
  "use strict";

  var KP = window.KoroParts, PH = window.KoroPhysics, STAGES = window.KoroStages.STAGES;
  var TYPES = KP.TYPES, W = KP.W, H = KP.H;
  var SLOT_N = 5;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ---------- ほぞん ---------- */
  var SKEY = "korokoro-souchi-2-v1";
  var save = { sound: true, cleared: [], slots: [] };
  try {
    var raw = localStorage.getItem(SKEY);
    if (raw) {
      var s0 = JSON.parse(raw);
      if (s0 && typeof s0 === "object") {
        if (typeof s0.sound === "boolean") save.sound = s0.sound;
        if (Array.isArray(s0.cleared)) save.cleared = s0.cleared.map(function (v) { return !!v; });
        if (Array.isArray(s0.slots)) save.slots = s0.slots.slice(0, SLOT_N).map(cleanSlot);
      }
    }
  } catch (e) {}
  function cleanSlot(sl) {
    if (!sl || !Array.isArray(sl.parts)) return null;
    var parts = sl.parts.filter(function (p) { return p && TYPES[p.t] && p.t !== "block" && isFinite(p.x) && isFinite(p.y); })
      .slice(0, 80).map(function (p) { return strip(p); });
    return { parts: parts, at: sl.at || 0 };
  }
  function persist() { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} }
  function strip(p) {
    var o = { t: p.t, x: Math.round(p.x), y: Math.round(p.y) };
    if (p.a) o.a = p.a;
    if (p.flip) o.flip = true;
    if (p.fixed) o.fixed = true;
    ["w", "h", "span", "gy", "ph"].forEach(function (k) { if (p[k] != null) o[k] = p[k]; });
    return o;
  }

  /* ---------- おと（WebAudio の ごうせいおん だけ） ---------- */
  var actx = null, noiseBuf = null, roll = null;
  function ac() {
    if (!save.sound) return null;
    try {
      if (!actx) {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        actx = new AC();
      }
      if (actx.state === "suspended") actx.resume();
      return actx;
    } catch (e) { return null; }
  }
  function noise(c) {
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      var d = noiseBuf.getChannelData(0), seed = 12345;
      for (var i = 0; i < d.length; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = seed / 0x3fffffff - 1; }
    }
    return noiseBuf;
  }
  function tone(type, f0, f1, t0, dur, vol) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (t0 || 0);
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  var lastHit = 0;
  var SND = {
    tap: function () { tone("sine", 660, 880, 0, 0.08, 0.15); },
    put: function () { tone("triangle", 300, 180, 0, 0.12, 0.25); },
    turn: function () { tone("square", 900, 1200, 0, 0.05, 0.06); },
    trash: function () { tone("sawtooth", 400, 90, 0, 0.25, 0.12); },
    no: function () { tone("square", 220, 160, 0, 0.15, 0.08); },
    // カタン: ぶつかった はやさで おおきさを かえる
    katan: function (v) {
      var c = ac(); if (!c) return;
      if (c.currentTime - lastHit < 0.035) return;
      lastHit = c.currentTime;
      var vol = Math.min(0.5, 0.06 + v / 2400), t = c.currentTime;
      var src = c.createBufferSource(); src.buffer = noise(c);
      var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1400 + Math.min(v, 1500); bp.Q.value = 3;
      var g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      src.connect(bp); bp.connect(g); g.connect(c.destination);
      src.start(t, Math.random() * 0.5, 0.12);
      tone("triangle", 520, 300, 0, 0.07, vol * 0.5);
    },
    boyon: function () {
      var c = ac(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), t = c.currentTime;
      o.type = "sine"; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(520, t + 0.35);
      lfo.frequency.value = 22; lg.gain.value = 60; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(g); g.connect(c.destination);
      o.start(t); lfo.start(t); o.stop(t + 0.5); lfo.stop(t + 0.5);
    },
    chin: function () {
      [[1568, 0.32, 2.4], [3136, 0.12, 1.4], [4700, 0.06, 0.8], [2093, 0.1, 1.8]].forEach(function (h) { tone("sine", h[0], 0, 0, h[2], h[1]); });
      tone("sine", 1568, 0, 0.45, 2.0, 0.16);
    },
    clank: function () { tone("square", 160, 110, 0, 0.2, 0.08); tone("triangle", 90, 60, 0.05, 0.4, 0.2); },
    fanfare: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone("triangle", f, 0, 0.9 + i * 0.12, 0.3, 0.2); }); }
  };
  // ころころ: ころがる はやさで おおきさが かわる つづく おと
  function rollStart() {
    var c = ac(); if (!c || roll) return;
    var src = c.createBufferSource(); src.buffer = noise(c); src.loop = true;
    var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 260; bp.Q.value = 1.2;
    var g = c.createGain(); g.gain.value = 0;
    var am = c.createGain(); am.gain.value = 0.6;
    var lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 16; lg.gain.value = 0.4;
    lfo.connect(lg); lg.connect(am.gain);
    src.connect(bp); bp.connect(am); am.connect(g); g.connect(c.destination);
    src.start(); lfo.start();
    roll = { src: src, g: g, lfo: lfo, bp: bp };
  }
  function rollSet(v) {
    if (!roll || !actx) return;
    var vol = Math.min(0.32, v / 2600);
    roll.g.gain.setTargetAtTime(vol, actx.currentTime, 0.05);
    roll.lfo.frequency.setTargetAtTime(8 + Math.min(30, v / 30), actx.currentTime, 0.1);
    roll.bp.frequency.setTargetAtTime(200 + Math.min(500, v / 2), actx.currentTime, 0.1);
  }
  function rollStop() {
    if (!roll) return;
    try { roll.src.stop(); roll.lfo.stop(); } catch (e) {}
    roll = null;
  }
  function renderSoundBtn() {
    $("soundBtn").textContent = save.sound ? "🔊" : "🔇";
    $("soundBtn").setAttribute("aria-pressed", String(save.sound));
  }
  $("soundBtn").addEventListener("click", function () {
    save.sound = !save.sound; persist(); renderSoundBtn();
    if (!save.sound) rollStop(); else { SND.tap(); if (state.running) rollStart(); }
  });
  renderSoundBtn();

  /* ---------- じょうたい ---------- */
  var state = {
    mode: "menu",       // menu | stage | free
    stage: -1,
    fixed: [],          // うごかせない ぶひん
    placed: [],         // おいた ぶひん
    tools: {},          // のこりの かず（じゆう は Infinity）
    sel: null,          // えらんだ どうぐ
    world: null, parts: null, running: false, acc: 0, last: 0, t: 0,
    cleared: false, confetti: [], drag: null
  };

  /* ---------- メニュー ---------- */
  var GROUPS = [["1つ おこう", 0, 5], ["2〜3こ おこう", 5, 10], ["くみあわせよう", 10, 15]];
  function unlocked(i) { return i === 0 || !!save.cleared[i - 1] || !!save.cleared[i]; }
  function renderMenu() {
    var box = $("stageList"); box.innerHTML = "";
    GROUPS.forEach(function (g) {
      box.appendChild(el("h2", "group-title", g[0]));
      var grid = el("div", "stage-grid");
      for (var i = g[1]; i < g[2]; i++) {
        var st = STAGES[i], done = !!save.cleared[i], open = unlocked(i);
        var b = el("button", "stage" + (done ? " done" : "") + (open ? "" : " locked"),
          '<span class="num">' + (i + 1) + '</span><span class="nm">' + st.name + '</span>' +
          '<span class="badge">' + (done ? "🔔" : open ? "" : "🔒") + "</span>");
        b.type = "button"; b.dataset.i = i;
        b.setAttribute("aria-label", "ステージ" + (i + 1) + " " + st.name + (done ? " クリア" : open ? "" : " まだ あそべない"));
        if (!open) b.disabled = true;
        b.addEventListener("click", function () { SND.tap(); openStage(+this.dataset.i); });
        grid.appendChild(b);
      }
      box.appendChild(grid);
    });
  }
  $("freeBtn").addEventListener("click", function () { SND.tap(); openFree(); });
  $("backBtn").addEventListener("click", function () { SND.tap(); showMenu(); });

  function showMenu() {
    stopRun();
    state.mode = "menu";
    $("vPlay").hidden = true; $("vMenu").hidden = false; $("backBtn").hidden = true;
    $("title").textContent = "🎳 ころころ そうち 2";
    renderMenu();
  }

  /* ---------- ステージを ひらく ---------- */
  function openStage(i) {
    var st = STAGES[i];
    state.mode = "stage"; state.stage = i;
    state.fixed = st.fixed.map(KP.clone);
    state.placed = [];
    state.tools = {};
    for (var k in st.tools) state.tools[k] = st.tools[k];
    $("stageName").textContent = (i + 1) + ". " + st.name;
    $("hint").textContent = st.hint;
    $("slotBtn").hidden = true;
    enterPlay();
  }
  function openFree(parts) {
    state.mode = "free"; state.stage = -1;
    state.fixed = [];
    state.placed = (parts || []).map(KP.clone);
    state.tools = {};
    KP.ORDER.forEach(function (t) { state.tools[t] = Infinity; });
    $("stageName").textContent = "🛠️ じゆうに つくる";
    $("hint").textContent = "ぶひんを えらんで タップで おこう。ボールと ベルも おけるよ";
    $("slotBtn").hidden = false;
    enterPlay();
  }
  function enterPlay() {
    stopRun();
    state.sel = null; state.cleared = false; state.confetti = [];
    $("vMenu").hidden = true; $("vPlay").hidden = false; $("backBtn").hidden = false;
    $("title").textContent = "🎳 ころころ そうち 2";
    renderTools();
    rebuild();
    layout();
  }

  /* ---------- どうぐばこ ---------- */
  function renderTools() {
    var box = $("toolbox"); box.innerHTML = "";
    var list = KP.ORDER.filter(function (t) { return state.tools[t] != null; });
    if (!list.length) { box.appendChild(el("div", "empty-tools", "このステージは おく ぶひんが ないよ")); return; }
    list.forEach(function (t) {
      var T = TYPES[t], n = state.tools[t];
      var b = el("button", "tool" + (state.sel === t ? " sel" : ""));
      b.type = "button"; b.dataset.t = t;
      var cv = el("canvas"); cv.width = 152; cv.height = 88;
      b.appendChild(cv);
      b.appendChild(el("span", "lb", T.html));
      b.appendChild(el("span", "cnt", n === Infinity ? "∞" : String(n)));
      b.setAttribute("aria-label", T.name + " のこり " + (n === Infinity ? "いくつでも" : n));
      b.setAttribute("aria-pressed", String(state.sel === t));
      if (!n) b.disabled = true;
      b.addEventListener("click", function () {
        if (state.running) { toast("⏹ を おしてから おいてね"); SND.no(); return; }
        state.sel = state.sel === t ? null : t;
        SND.tap(); renderTools();
        if (state.sel) toast("おきたい ところを タップ！");
      });
      box.appendChild(b);
      drawIcon(cv, t);
    });
  }
  function drawIcon(cv, t) {
    var ctx = cv.getContext("2d");
    var p = { t: t, x: 0, y: 0 };
    if (t === "domino") p.a = 0;
    var wd = KP.build([p]);
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    wd.bodies.forEach(function (b) {
      if (!b.data || !b.data.part) return;
      x0 = Math.min(x0, b.aabb[0]); y0 = Math.min(y0, b.aabb[1]); x1 = Math.max(x1, b.aabb[2]); y1 = Math.max(y1, b.aabb[3]);
    });
    if (t === "bucket") y0 = Math.min(y0, -175);
    if (t === "bell") y0 -= 26;
    if (t === "fan") x1 = Math.max(x1, 120);
    var pad = 6, sc = Math.min((cv.width - pad * 2) / (x1 - x0), (cv.height - pad * 2) / (y1 - y0), 2.2);
    ctx.setTransform(sc, 0, 0, sc, cv.width / 2 - (x0 + x1) / 2 * sc, cv.height / 2 - (y0 + y1) / 2 * sc);
    KP.drawPart(ctx, p, 0.2, false);
  }

  /* ---------- せかいを つくりなおす ---------- */
  function allParts() { return state.fixed.concat(state.placed); }
  function rebuild() {
    state.parts = allParts().map(function (p) { var c = KP.clone(p); c._src = p; return c; });
    state.world = KP.build(state.parts);
    state.t = 0;
  }

  /* ---------- がめんの おおきさ ---------- */
  var cv = $("cv"), ctx = cv.getContext("2d"), scale = 1, dpr = 1;
  function layout() {
    if (state.mode === "menu") return;
    var wrap = $("stageWrap"), box = $("stageBox");
    var aw = wrap.clientWidth - 12, ah = wrap.clientHeight - 12;
    if (aw <= 0 || ah <= 0) return;
    var w = Math.min(aw, ah * W / H), h = w * H / W;
    box.style.width = Math.floor(w) + "px"; box.style.height = Math.floor(h) + "px";
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    scale = w / W;
    draw();
  }
  window.addEventListener("resize", layout);
  window.addEventListener("orientationchange", function () { setTimeout(layout, 200); });

  /* ---------- かく ---------- */
  function draw() {
    if (state.mode === "menu" || !state.world) return;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    // そら
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#d0ebff"); g.addColorStop(1, "#f3f0ff");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // くも
    ctx.fillStyle = "rgba(255,255,255,.8)";
    [[150, 70, 1], [620, 50, 1.3], [880, 110, 0.9]].forEach(function (c) {
      ctx.beginPath(); ctx.arc(c[0], c[1], 22 * c[2], 0, 7); ctx.arc(c[0] + 26 * c[2], c[1] - 10 * c[2], 28 * c[2], 0, 7); ctx.arc(c[0] + 56 * c[2], c[1], 20 * c[2], 0, 7); ctx.fill();
    });
    // じめん
    ctx.fillStyle = "#c6a173"; ctx.fillRect(0, KP.FLOOR_Y, W, H - KP.FLOOR_Y);
    ctx.fillStyle = "#69db7c"; ctx.fillRect(0, KP.FLOOR_Y, W, 6);
    // スタートの はた（とめているとき）
    if (!state.running) {
      state.parts.forEach(function (p) {
        if (p.fixed && TYPES[p.t].group === "ball") drawFlag(p.x - 4, p.y - TYPES[p.t].r - 4);
      });
    }
    var drag = state.drag && state.drag.moved ? state.drag.part : null;
    state.parts.forEach(function (p) {
      var sel = drag && p._src === drag;
      if (!p.fixed && !state.running && !sel) { ctx.save(); KP.drawPart(ctx, p, state.t, false); ctx.restore(); }
      else KP.drawPart(ctx, p, state.t, sel);
    });
    // かみふぶき
    state.confetti.forEach(function (c) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r);
      ctx.fillStyle = c.c; ctx.fillRect(-6, -3.5, 12, 7); ctx.restore();
    });
  }
  function drawFlag(x, y) {
    ctx.save();
    ctx.strokeStyle = "#495057"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 46); ctx.stroke();
    ctx.fillStyle = "#e03131";
    ctx.beginPath(); ctx.moveTo(x, y - 46); ctx.lineTo(x + 34, y - 37); ctx.lineTo(x, y - 28); ctx.closePath(); ctx.fill();
    ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
    ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.strokeText("スタート", x + 6, y - 52);
    ctx.fillStyle = "#c92a2a"; ctx.fillText("スタート", x + 6, y - 52);
    ctx.restore();
  }

  /* ---------- シミュレーション ---------- */
  $("runBtn").addEventListener("click", function () {
    if (state.running) { SND.tap(); stopRun(); rebuild(); draw(); }
    else startRun();
  });
  function startRun() {
    state.sel = null; renderTools();
    rebuild();
    state.running = true; state.acc = 0; state.last = 0; state.cleared = false;
    $("vPlay").classList.add("playing");
    $("runBtn").textContent = "⏹ もどす"; $("runBtn").classList.add("stop");
    SND.tap(); rollStart();
    requestAnimationFrame(frame);
  }
  function stopRun() {
    state.running = false; state.confetti = [];
    $("vPlay").classList.remove("playing");
    $("runBtn").textContent = "▶ スタート"; $("runBtn").classList.remove("stop");
    $("clearModal").hidden = true;
    rollStop();
  }
  var ringAt = 0;
  function frame(ts) {
    if (!state.running) return;
    if (!state.last) state.last = ts;
    var dt = Math.min(0.05, (ts - state.last) / 1000);
    state.last = ts;
    state.acc += dt;
    var wd = state.world, n = 0;
    while (state.acc >= PH.DT && n < 8) {
      wd.step(); state.acc -= PH.DT; n++;
      handleEvents(wd);
    }
    state.t = wd.time;
    // ころころ おと: ふれながら うごいている ボールの はやさ
    var rv = 0;
    wd.bodies.forEach(function (b) {
      if (b.touching && !b.sleeping && b.shapes[0].t === "c" && b.type === "dynamic") rv += Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    });
    rollSet(rv);
    state.parts.forEach(function (p) { if (p._ring > 0) p._ring = Math.max(0, p._ring - dt * 0.5); });
    stepConfetti(dt);
    draw();
    requestAnimationFrame(frame);
  }
  function handleEvents(wd) {
    for (var i = 0; i < wd.events.length; i++) {
      var e = wd.events[i];
      if (e.k === "hit") SND.katan(e.v);
      else if (e.k === "spring") SND.boyon();
      else if (e.k === "bucket") SND.clank();
      else if (e.k === "bell") onBell(e);
    }
    wd.events.length = 0;
  }
  function onBell(e) {
    var bell = e.a.bell ? e.a : e.b;
    bell.data.part._ring = 1.6;
    SND.chin();
    burst(bell.x, bell.y);
    if (state.cleared) return;
    state.cleared = true;
    if (state.mode === "stage") {
      var i = state.stage, first = !save.cleared[i];
      save.cleared[i] = true; persist();
      SND.fanfare();
      setTimeout(function () {
        if (!state.running || state.mode !== "stage" || state.stage !== i) return;
        var last = i === STAGES.length - 1;
        $("clearText").textContent = last ? "ぜんぶの ステージを クリア！ すごい！ じゆうに つくる でも あそんでね"
          : (first ? "つぎの ステージが ひらいたよ！" : "また ならせたね！");
        $("nextBtn").textContent = last ? "メニューへ ▶" : "つぎへ ▶";
        $("clearModal").hidden = false;
      }, 1500);
    }
  }
  $("againBtn").addEventListener("click", function () { SND.tap(); stopRun(); rebuild(); draw(); });
  $("nextBtn").addEventListener("click", function () {
    SND.tap();
    if (state.stage >= STAGES.length - 1) showMenu();
    else openStage(state.stage + 1);
  });

  /* ---------- かみふぶき ---------- */
  var CONF_COLORS = ["#ff6b6b", "#fcc419", "#51cf66", "#339af0", "#cc5de8", "#ff922b"];
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function burst(x, y) {
    for (var i = 0; i < 90; i++) {
      var a = -Math.PI / 2 + (rnd() - 0.5) * 2.4, sp = 300 + rnd() * 600;
      state.confetti.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rnd() * 6, w: (rnd() - 0.5) * 16,
                            c: CONF_COLORS[i % CONF_COLORS.length], life: 2.5 + rnd() });
    }
  }
  function stepConfetti(dt) {
    state.confetti = state.confetti.filter(function (c) {
      c.vy += 900 * dt; c.vx *= 1 - dt * 1.5; c.vy *= 1 - dt * 1.2;
      c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.w * dt; c.life -= dt;
      return c.life > 0 && c.y < H + 20;
    });
  }

  /* ---------- そうさ（おく・うごかす・まわす・すてる） ---------- */
  function toWorld(ev) {
    var r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H };
  }
  function clampPos(p) {
    p.x = Math.round(Math.max(10, Math.min(W - 10, p.x)));
    p.y = Math.round(Math.max(10, Math.min(KP.FLOOR_Y - 4, p.y)));
  }
  function overTrash(ev) {
    var r = $("trash").getBoundingClientRect(), m = 12;
    return ev.clientX >= r.left - m && ev.clientX <= r.right + m && ev.clientY >= r.top - m && ev.clientY <= r.bottom + m;
  }
  var toastTimer = 0;
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 1600);
  }
  function defaultPart(t, x, y) {
    var p = { t: t, x: x, y: y };
    var T = TYPES[t];
    // ゆかに ちかければ ゆかの うえに のせる
    if (T.group === "ball" && y > KP.FLOOR_Y - T.r - 24) p.y = KP.FLOOR_Y - T.r;
    if (t === "domino" && y > KP.FLOOR_Y - T.hh - 20) p.y = KP.FLOOR_Y - T.hh;
    if (t === "bell" && y > KP.FLOOR_Y - T.r - 20) p.y = KP.FLOOR_Y - T.r;
    if (t === "seesaw" && y > KP.FLOOR_Y - 60) p.y = KP.FLOOR_Y - 60;
    if (t === "bucket" && y > KP.FLOOR_Y - 140) p.y = KP.FLOOR_Y - 140;
    if (t === "bucket" && x > W - 230) p.flip = true;
    return p;
  }
  cv.addEventListener("pointerdown", function (ev) {
    if (state.running) return;
    ev.preventDefault();
    var w = toWorld(ev);
    if (state.sel) {
      var t = state.sel;
      if (!state.tools[t]) { state.sel = null; renderTools(); return; }
      var p = defaultPart(t, w.x, w.y); clampPos(p);
      state.placed.push(p);
      if (state.tools[t] !== Infinity) state.tools[t]--;
      state.sel = null;
      SND.put(); renderTools(); rebuild(); draw();
      return;
    }
    var hit = KP.hitTest(state.world, w.x, w.y, Math.max(8, 22 / scale));
    if (!hit) return;
    var src = hit._src || hit;
    if (src.fixed) { toast("グレーの ぶひんは うごかせないよ"); SND.no(); return; }
    try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    state.drag = { part: src, ox: src.x - w.x, oy: src.y - w.y, sx: ev.clientX, sy: ev.clientY, moved: false, id: ev.pointerId };
  });
  cv.addEventListener("pointermove", function (ev) {
    var d = state.drag; if (!d || d.id !== ev.pointerId) return;
    ev.preventDefault();
    if (!d.moved && Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 8) return;
    d.moved = true;
    var w = toWorld(ev);
    d.part.x = w.x + d.ox; d.part.y = w.y + d.oy; clampPos(d.part);
    $("trash").classList.toggle("hot", overTrash(ev));
    rebuild(); draw();
  });
  function endDrag(ev, cancel) {
    var d = state.drag; if (!d || d.id !== ev.pointerId) return;
    state.drag = null;
    $("trash").classList.remove("hot");
    if (!d.moved) {
      if (!cancel && KP.rotate(d.part)) SND.turn();
      else if (!cancel) toast("これは まわらないよ");
    } else if (!cancel && overTrash(ev)) {
      var i = state.placed.indexOf(d.part);
      if (i >= 0) {
        state.placed.splice(i, 1);
        if (state.tools[d.part.t] !== Infinity) state.tools[d.part.t] = (state.tools[d.part.t] || 0) + 1;
        SND.trash(); renderTools();
      }
    } else SND.put();
    rebuild(); draw();
  }
  cv.addEventListener("pointerup", function (ev) { endDrag(ev, false); });
  cv.addEventListener("pointercancel", function (ev) { endDrag(ev, true); });

  $("clearBtn").addEventListener("click", function () {
    if (state.running) { stopRun(); }
    if (!state.placed.length) { toast("おいた ぶひんは ないよ"); rebuild(); draw(); return; }
    state.placed.forEach(function (p) { if (state.tools[p.t] !== Infinity) state.tools[p.t] = (state.tools[p.t] || 0) + 1; });
    state.placed = [];
    SND.trash(); renderTools(); rebuild(); draw();
  });

  /* ---------- ほぞん スロット（じゆう モード） ---------- */
  $("slotBtn").addEventListener("click", function () {
    if (state.running) { stopRun(); rebuild(); draw(); }
    SND.tap(); renderSlots(); $("slotModal").hidden = false;
  });
  $("slotClose").addEventListener("click", function () { SND.tap(); $("slotModal").hidden = true; });
  function renderSlots() {
    var box = $("slots"); box.innerHTML = "";
    for (var i = 0; i < SLOT_N; i++) {
      var sl = save.slots[i];
      var row = el("div", "slot");
      var pv = el("canvas"); pv.width = 200; pv.height = 120; row.appendChild(pv);
      var d = sl ? new Date(sl.at) : null;
      row.appendChild(el("div", "sn", (i + 1) + "ばん" + (sl ? "<small>ぶひん " + sl.parts.length + "こ" +
        (d && !isNaN(d) ? "・" + (d.getMonth() + 1) + "がつ" + d.getDate() + "にち" : "") + "</small>" : "<small>からっぽ</small>")));
      var bs = el("button", "act", "ほぞん"); bs.type = "button"; bs.dataset.i = i;
      bs.addEventListener("click", function () {
        var k = +this.dataset.i;
        save.slots[k] = { parts: state.placed.map(strip), at: Date.now() };
        while (save.slots.length < SLOT_N) save.slots.push(null);
        persist(); SND.put(); renderSlots(); toast((k + 1) + "ばんに ほぞん したよ");
      });
      row.appendChild(bs);
      if (sl) {
        var bl = el("button", "act", "よむ"); bl.type = "button"; bl.dataset.i = i;
        bl.addEventListener("click", function () {
          var k = +this.dataset.i; SND.tap();
          $("slotModal").hidden = true;
          openFree(save.slots[k].parts);
          toast((k + 1) + "ばんを よみこんだよ");
        });
        row.appendChild(bl);
        var bd = el("button", "act", "けす"); bd.type = "button"; bd.dataset.i = i;
        bd.addEventListener("click", function () {
          var k = +this.dataset.i;
          if (this.dataset.ok !== "1") { this.dataset.ok = "1"; this.textContent = "ほんとう？"; return; }
          save.slots[k] = null; persist(); SND.trash(); renderSlots();
        });
        row.appendChild(bd);
        drawPreview(pv, sl.parts);
      } else drawPreview(pv, []);
      box.appendChild(row);
    }
  }
  function drawPreview(c, parts) {
    var x = c.getContext("2d"), sc = c.width / W;
    x.setTransform(sc, 0, 0, sc, 0, 0);
    x.fillStyle = "#dbeafe"; x.fillRect(0, 0, W, H);
    x.fillStyle = "#c6a173"; x.fillRect(0, KP.FLOOR_Y, W, H);
    var ps = parts.map(KP.clone); KP.build(ps);
    ps.forEach(function (p) { KP.drawPart(x, p, 0, false); });
  }

  // テスト・デバッグ よう
  window.__koro = {
    state: state, save: save, stages: STAGES,
    load: function (i, withSol) {
      openStage(i);
      if (withSol) {
        STAGES[i].sol.forEach(function (p) { state.placed.push(KP.clone(p)); state.tools[p.t]--; });
        renderTools(); rebuild(); draw();
      }
    }
  };

  showMenu();
})();
