/* バクダン どっかーん！ — がめん・おと・そうさ */
(function () {
  "use strict";
  var C = window.BakudanCore;
  function $(id) { return document.getElementById(id); }

  /* ───────── ほぞん ───────── */
  var SAVE_KEY = "bakudan-dokkan-v1";
  var save = { stars: {}, sound: true };
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      var o = JSON.parse(raw);
      if (o && typeof o === "object") {
        if (o.stars && typeof o.stars === "object") save.stars = o.stars;
        save.sound = o.sound !== false;
      }
    }
  } catch (e) { /* よめなくても あそべる */ }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }

  /* ───────── おと（WebAudio の ごうせいおん だけ） ───────── */
  var AC = null, master = null, noiseBuf = null;
  function ac() {
    if (!save.sound) return null;
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        master = AC.createGain(); master.gain.value = 0.8; master.connect(AC.destination);
        var len = Math.floor(AC.sampleRate * 1.2);
        noiseBuf = AC.createBuffer(1, len, AC.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { AC = null; return null; }
    }
    if (AC.state === "suspended") { try { AC.resume(); } catch (e) { } }
    return AC;
  }
  function noise(dur, type, f0, f1, vol, q, when) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (when || 0);
    var s = a.createBufferSource(); s.buffer = noiseBuf;
    var f = a.createBiquadFilter(); f.type = type;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    if (q) f.Q.value = q;
    var g = a.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  }
  function tone(freq, dur, type, vol, when, f1) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (when || 0);
    var o = a.createOscillator(); o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var g = a.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  var SND = {
    boom: function (n) {
      var v = Math.min(0.95, 0.45 + 0.1 * n);
      noise(0.9 + 0.1 * Math.min(n, 4), "lowpass", 2200, 60, v);
      tone(120, 0.55, "sine", v, 0, 32);
      tone(70, 0.4, "triangle", v * 0.6, 0.02, 30);
    },
    crack: function () { noise(0.13, "highpass", 2600, 900, 0.3); tone(240, 0.09, "square", 0.06, 0, 110); },
    clink: function () { tone(1300, 0.18, "triangle", 0.16, 0, 900); tone(1900, 0.12, "sine", 0.08, 0.01); },
    fuse: function () { noise(0.32, "bandpass", 6000, 2500, 0.18, 1.5); },
    pick: function () { tone(660, 0.07, "triangle", 0.18); },
    place: function () { tone(420, 0.06, "sine", 0.2, 0, 560); },
    win: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, "square", 0.09, i * 0.11); });
      tone(1319, 0.6, "triangle", 0.16, 0.48); tone(1047, 0.6, "triangle", 0.1, 0.48);
    },
    lose: function () { [392, 330, 262].forEach(function (f, i) { tone(f, 0.32, "triangle", 0.16, i * 0.2); }); },
    hint: function () { tone(880, 0.12, "sine", 0.14); tone(1175, 0.18, "sine", 0.12, 0.1); }
  };

  /* ───────── がめん きりかえ ───────── */
  var screens = ["title", "select", "game"];
  function show(id) {
    screens.forEach(function (s) { $(s).classList.toggle("on", s === id); });
    if (id === "game") resize();
  }
  function toast(msg, ms) {
    var t = $("toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(toast.tm); toast.tm = setTimeout(function () { t.classList.remove("on"); }, ms || 2200);
  }
  function syncSound() {
    var on = save.sound;
    $("soundBtn").textContent = on ? "🔊" : "🔇";
    $("soundTitle").textContent = on ? "🔊 おと オン" : "🔇 おと オフ";
  }
  function toggleSound() { save.sound = !save.sound; persist(); syncSound(); if (save.sound) SND.pick(); }
  $("soundBtn").onclick = toggleSound;
  $("soundTitle").onclick = toggleSound;
  syncSound();

  /* ───────── ゲームの じょうたい ───────── */
  var G = {
    mode: "stage", level: 0, board: null, matches: 0, used: 0, par: 1,
    chains: [], busy: {}, fx: [], parts: [], pops: [], shake: 0,
    press: null, hint: null, over: false, tool: "fire", painting: false, lastPaint: -1
  };
  var FUSE_MS = 340, WAVE_MS = 210;

  function cloneBoard(b) { return { w: b.w, h: b.h, g: b.g.slice() }; }

  function startLevel(i) {
    G.mode = "stage"; G.level = i;
    var L = C.LEVELS[i];
    G.board = C.parse(L.map);
    if (L.par == null) { var s = C.solve(cloneBoard(G.board), 8); L.par = s ? s.moves : 3; }
    G.par = L.par; G.matches = L.par + 1; G.used = 0;
    resetCommon();
    $("game").classList.remove("free");
    $("gameTitle").textContent = (i + 1) + " / " + C.LEVELS.length;
    $("tip").innerHTML = "<b>" + (i + 1) + ". " + L.name + "</b><br>" + L.tip;
    $("hintBtn").classList.remove("glow");
    updateMatches();
    show("game");
  }
  function startFree(keep) {
    G.mode = "free";
    if (!keep || !G.freeBoard) G.freeBoard = randomFree();
    G.board = G.freeBoard;
    resetCommon();
    $("game").classList.add("free");
    $("gameTitle").textContent = "じゆうに どっかーん";
    buildPalette();
    show("game");
  }
  function resetCommon() {
    G.chains = []; G.busy = {}; G.fx = []; G.parts = []; G.pops = []; G.shake = 0;
    G.press = null; G.hint = null; G.over = false; G.painting = false;
    closeModal();
  }
  function randomFree() {
    var w = 8, h = 10, g = [];
    for (var i = 0; i < w * h; i++) {
      var r = Math.random(), c = ".";
      if (r < 0.04) c = "#";
      else if (r < 0.12) c = "123o-|"[Math.floor(Math.random() * 6)];
      else if (r < 0.2) c = "R";
      else if (r < 0.66) c = "r";
      g.push(c);
    }
    return { w: w, h: h, g: g };
  }
  function updateMatches() {
    var el = $("matches"), html = "";
    var total = G.par + 1;
    for (var i = 0; i < total; i++) html += '<span class="m' + (i < G.matches ? "" : " off") + '">🔥</span>';
    el.innerHTML = html;
  }

  /* ───────── ばくはつ ───────── */
  function inAnyCur(k) {
    for (var i = 0; i < G.chains.length; i++) {
      var cur = G.chains[i].cur;
      for (var j = 0; j < cur.length; j++) if (cur[j].y * G.board.w + cur[j].x === k) return true;
    }
    return false;
  }
  function ignite(list) {
    var now = performance.now(), cur = [];
    list.forEach(function (p) {
      var k = p.y * G.board.w + p.x;
      if (G.busy[k] || !C.isBomb(G.board.g[k])) return;
      G.busy[k] = 1; cur.push({ x: p.x, y: p.y });
    });
    if (!cur.length) return false;
    G.chains.push({ cur: cur, t: now + FUSE_MS, wave: 0, start: now });
    SND.fuse();
    return true;
  }
  var WORDS = ["どっかーん！", "ばーん！", "どかーん！", "ずどーん！", "ぼかーん！"];
  function doWave(ch, now) {
    var b = G.board;
    var res = C.stepWave(b, ch.cur, G.busy);
    ch.wave++;
    var cs = 1;
    res.rays.forEach(function (r) {
      r.cells.forEach(function (c) {
        var d = Math.abs(c.x - r.x) + Math.abs(c.y - r.y);
        G.fx.push({ k: "fire", x: c.x, y: c.y, t0: now + d * 28, dur: 480, big: d === 0 });
      });
      G.fx.push({ k: "ring", x: r.x, y: r.y, t0: now, dur: 520 });
      for (var i = 0; i < 10; i++) {
        var a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
        G.parts.push({ k: "spark", x: r.x + 0.5, y: r.y + 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 0, max: 0.4 + Math.random() * 0.4, s: 0.05 + Math.random() * 0.05 });
      }
      for (i = 0; i < 4; i++) {
        G.parts.push({ k: "smoke", x: r.x + 0.2 + Math.random() * 0.6, y: r.y + 0.3 + Math.random() * 0.4, vx: (Math.random() - 0.5) * 0.6, vy: -0.6 - Math.random() * 0.6, life: -0.15, max: 1.1 + Math.random() * 0.5, s: 0.25 + Math.random() * 0.2 });
      }
    });
    res.broken.forEach(function (c) {
      var hard = c.was === "h";
      for (var i = 0; i < 9; i++) {
        var a = -Math.PI * Math.random(), sp = 2 + Math.random() * 4;
        G.parts.push({ k: "chunk", x: c.x + 0.5, y: c.y + 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 0, max: 0.9 + Math.random() * 0.4, s: 0.07 + Math.random() * 0.09, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, col: hard ? "#4b5563" : "#8a6f55" });
      }
      if (Math.random() < 0.6) G.parts.push({ k: "star", x: c.x + 0.5, y: c.y + 0.4, vx: (Math.random() - 0.5) * 1.5, vy: -2.4, life: 0, max: 0.9, s: 0.22 });
    });
    res.cracked.forEach(function (c) {
      for (var i = 0; i < 6; i++) {
        var a = Math.random() * Math.PI * 2;
        G.parts.push({ k: "spark", x: c.x + 0.5, y: c.y + 0.5, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 0, max: 0.35, s: 0.05, col: "#e5f0ff" });
      }
    });
    var n = res.rays.length;
    G.shake = Math.min(22, G.shake + 7 + 2 * n);
    SND.boom(n);
    if (res.broken.length) setTimeout(SND.crack, 60);
    if (res.cracked.length) setTimeout(SND.clink, 40);
    var f = res.rays[0];
    if (ch.wave === 1) G.pops.push({ text: WORDS[Math.floor(Math.random() * WORDS.length)], x: f.x + 0.5, y: f.y + 0.2, t0: now, dur: 900, col: "#ffd23d", size: 0.9 });
    else G.pops.push({ text: "れんさ ×" + ch.wave + "！", x: f.x + 0.5, y: f.y + 0.2, t0: now, dur: 900, col: "#ff8bd1", size: 0.75 });
    ch.cur = res.next;
    ch.t = now + WAVE_MS;
  }
  function afterChains() {
    if (G.mode !== "stage" || G.over) return;
    var left = C.rocksLeft(G.board);
    if (!left) { G.over = true; setTimeout(winLevel, 650); return; }
    var bombs = G.board.g.some(C.isBomb);
    if (G.matches <= 0 || !bombs) {
      G.over = true;
      setTimeout(function () { loseLevel(!bombs && G.matches > 0); }, 650);
    }
  }

  /* ───────── けっか ───────── */
  function closeModal() { $("modal").classList.remove("on"); }
  function openModal(html, binds) {
    $("modalCard").innerHTML = html;
    $("modal").classList.add("on");
    Object.keys(binds).forEach(function (id) { $(id).onclick = function () { SND.pick(); binds[id](); }; });
  }
  function winLevel() {
    var stars = G.used <= G.par ? 3 : 2;
    var key = String(G.level);
    if (!(save.stars[key] >= stars)) { save.stars[key] = stars; persist(); }
    SND.win();
    for (var i = 0; i < 70; i++) {
      G.parts.push({ k: "confetti", x: Math.random() * G.board.w, y: -0.5 - Math.random() * 2, vx: (Math.random() - 0.5) * 1.5, vy: 1 + Math.random() * 2, life: 0, max: 2.6, s: 0.12 + Math.random() * 0.1, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, col: ["#ff5d5d", "#ffd23d", "#5dd39e", "#5db7ff", "#c58bff"][i % 5] });
    }
    var last = G.level >= C.LEVELS.length - 1;
    var st = "";
    for (i = 0; i < 3; i++) st += '<span class="' + (i < stars ? "" : "off") + '">⭐</span>';
    var msg = stars === 3 ? "いちばん すくない 🔥" + G.par + "かいで クリア！ すごい！" : "クリア！ 🔥" + G.par + "かいで できる ほうほうも あるよ";
    var binds = { mRetry: function () { startLevel(G.level); }, mSel: function () { openSelect(); } };
    if (!last) binds.mNext = function () { startLevel(G.level + 1); };
    setTimeout(function () {
      openModal(
        "<h3>" + (last ? "ぜんぶ クリア！🎉" : "クリア！") + '</h3><div class="stars">' + st + "</div><p>" + msg + '</p><div class="row">' +
        (last ? "" : '<button class="big" id="mNext">つぎの ステージ ▶</button>') +
        '<button class="big alt" id="mRetry">🔄 もういちど</button>' +
        '<button class="big alt" id="mSel">ステージ えらび</button></div>', binds);
    }, 700);
  }
  function loseLevel(noBomb) {
    SND.lose();
    openModal(
      "<h3>ざんねん！</h3><p>" + (noBomb ? "ばくだんが なくなっちゃった。" : "🔥マッチが なくなっちゃった。") +
      "<br>いわが まだ のこっているよ。<br>💡ヒントを つかっても いいよ！</p>" +
      '<div class="row"><button class="big" id="mRetry">🔄 もういちど</button><button class="big alt" id="mSel">ステージ えらび</button></div>',
      { mRetry: function () { startLevel(G.level); }, mSel: function () { openSelect(); } });
  }

  /* ───────── ステージ えらび ───────── */
  function openSelect() {
    closeModal();
    var box = $("levels"); box.innerHTML = "";
    var cleared = -1;
    C.LEVELS.forEach(function (L, i) { if (save.stars[i]) cleared = Math.max(cleared, i); });
    C.LEVELS.forEach(function (L, i) {
      var b = document.createElement("button");
      b.className = "lv";
      var st = save.stars[i] || 0, s = "";
      for (var j = 0; j < 3; j++) s += j < st ? "⭐" : "☆";
      b.innerHTML = "<b>" + (i + 1) + "</b><span>" + L.name + "</span><i>" + s + "</i>";
      var open = i <= cleared + 2;
      if (!open) { b.disabled = true; b.querySelector("span").textContent = "🔒 まだ ひみつ"; }
      b.onclick = function () { SND.pick(); startLevel(i); };
      box.appendChild(b);
    });
    show("select");
  }
  $("goStages").onclick = function () { ac(); SND.pick(); openSelect(); };
  $("goFree").onclick = function () { ac(); SND.pick(); startFree(true); };
  $("selBack").onclick = function () { SND.pick(); show("title"); };
  $("gameBack").onclick = function () {
    SND.pick();
    if (G.mode === "stage") openSelect(); else show("title");
  };
  $("retryBtn").onclick = function () {
    SND.pick();
    if (G.mode === "stage") startLevel(G.level);
    else { G.freeBoard = randomFree(); startFree(true); }
  };
  $("hintBtn").onclick = function () {
    if (G.mode !== "stage" || G.over) return;
    if (G.chains.length) return;
    var s = C.solve(cloneBoard(G.board), Math.max(1, G.matches));
    if (s && s.moves <= G.matches) {
      var p = s.first[0];
      G.hint = { x: p.x, y: p.y, t0: performance.now() };
      SND.hint();
      toast("ひかっている ばくだんから つけてみよう！", 2200);
    } else {
      SND.lose();
      $("hintBtn").classList.remove("glow");
      $("retryBtn").classList.add("glow");
      toast("ここからだと むずかしいかも…🔄 やりなおそう！", 2600);
      setTimeout(function () { $("retryBtn").classList.remove("glow"); }, 3000);
    }
  };

  /* ───────── じゆう モードの どうぐ ───────── */
  var TOOLS = [
    { id: "fire", label: "🔥", name: "つける" },
    { id: "1", bomb: "1" }, { id: "2", bomb: "2" }, { id: "3", bomb: "3" },
    { id: "o", bomb: "o" }, { id: "-", bomb: "-" }, { id: "|", bomb: "|" },
    { id: "r", cell: "r" }, { id: "R", cell: "R" }, { id: "#", cell: "#" },
    { id: ".", label: "🧽", name: "けす" }
  ];
  function buildPalette() {
    var p = $("palette");
    if (p.childNodes.length) { markTool(); return; }
    TOOLS.forEach(function (t) {
      var b = document.createElement("button");
      b.className = "tool"; b.dataset.tool = t.id;
      b.setAttribute("aria-label", t.name || t.id);
      if (t.label) b.textContent = t.label;
      else {
        var c = document.createElement("canvas"); c.width = 84; c.height = 84;
        var x = c.getContext("2d");
        if (t.bomb) drawBomb(x, 42, 46, 84, t.bomb, 0, 0, 0);
        else if (t.cell === "#") drawSteel(x, 0, 0, 84);
        else drawRock(x, 0, 0, 84, 7, t.cell);
        b.appendChild(c);
      }
      b.onclick = function () { G.tool = t.id; SND.pick(); markTool(); };
      p.appendChild(b);
    });
    var all = document.createElement("button");
    all.className = "tool wide boom"; all.textContent = "💥 ぜんぶ";
    all.onclick = function () {
      var list = [];
      G.board.g.forEach(function (c, k) { if (C.isBomb(c)) list.push({ x: k % G.board.w, y: (k / G.board.w) | 0 }); });
      if (!ignite(list)) toast("ばくだんを おいてね！");
    };
    p.appendChild(all);
    markTool();
  }
  function markTool() {
    Array.prototype.forEach.call($("palette").querySelectorAll(".tool[data-tool]"), function (b) {
      b.classList.toggle("on", b.dataset.tool === G.tool);
    });
  }
  function paint(cell) {
    var b = G.board, k = cell.y * b.w + cell.x;
    if (k === G.lastPaint) return;
    G.lastPaint = k;
    if (inAnyCur(k)) return;
    var t = G.tool, v = t === "." ? "." : t;
    if (b.g[k] === v) return;
    b.g[k] = v;
    if (C.isBomb(v)) delete G.busy[k];
    SND.place();
  }

  /* ───────── えがく ───────── */
  var cv = $("cv"), ctx = cv.getContext("2d");
  var DPR = 1, VW = 0, VH = 0, CS = 40, OX = 0, OY = 0;
  function resize() {
    var r = $("stage").getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2.5);
    VW = Math.max(1, r.width); VH = Math.max(1, r.height);
    cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
    layout();
  }
  function layout() {
    if (!G.board) return;
    var pad = 12;
    CS = Math.floor(Math.min((VW - pad * 2) / G.board.w, (VH - pad * 2) / G.board.h, 96));
    OX = Math.round((VW - CS * G.board.w) / 2);
    OY = Math.round((VH - CS * G.board.h) / 2);
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", function () { setTimeout(resize, 200); });

  function hash(k) { var x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function drawSteel(c, px, py, s) {
    var i = s * 0.04;
    var g = c.createLinearGradient(px, py, px + s, py + s);
    g.addColorStop(0, "#c3ccd6"); g.addColorStop(1, "#6b7685");
    c.fillStyle = "#3c4450"; rr(c, px + i, py + i + s * 0.04, s - 2 * i, s - 2 * i, s * 0.12); c.fill();
    c.fillStyle = g; rr(c, px + i, py + i, s - 2 * i, s - 2 * i, s * 0.12); c.fill();
    c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = s * 0.03;
    rr(c, px + s * 0.14, py + s * 0.14, s * 0.72, s * 0.72, s * 0.06); c.stroke();
    [[0.24, 0.24], [0.76, 0.24], [0.24, 0.76], [0.76, 0.76]].forEach(function (q) {
      c.fillStyle = "#4b5563"; c.beginPath(); c.arc(px + s * q[0], py + s * q[1], s * 0.05, 0, 7); c.fill();
      c.fillStyle = "#e5e7eb"; c.beginPath(); c.arc(px + s * q[0] - s * 0.015, py + s * q[1] - s * 0.015, s * 0.018, 0, 7); c.fill();
    });
  }
  function rockPath(c, cx, cy, s, k) {
    c.beginPath();
    for (var i = 0; i < 9; i++) {
      var a = (i / 9) * Math.PI * 2 - Math.PI / 2;
      var rad = s * (0.37 + 0.07 * hash(k * 9 + i));
      var x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * 0.92;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath();
  }
  function drawRock(c, px, py, s, k, kind) {
    var cx = px + s / 2, cy = py + s / 2 + s * 0.03;
    var hard = kind !== "r";
    var base = hard ? "#606c7c" : "#a88b6c", dark = hard ? "#363e4a" : "#6e5640", light = hard ? "#97a3b3" : "#d2bc9e";
    c.fillStyle = dark; rockPath(c, cx, cy + s * 0.05, s, k); c.fill();
    c.fillStyle = base; rockPath(c, cx, cy, s, k); c.fill();
    c.save(); rockPath(c, cx, cy, s, k); c.clip();
    c.fillStyle = light; c.beginPath(); c.ellipse(cx - s * 0.12, cy - s * 0.16, s * 0.2, s * 0.12, -0.5, 0, 7); c.fill();
    c.fillStyle = "rgba(0,0,0,.12)"; c.beginPath(); c.ellipse(cx + s * 0.12, cy + s * 0.2, s * 0.3, s * 0.14, 0, 0, 7); c.fill();
    if (hard) {
      c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = s * 0.05;
      c.beginPath(); c.moveTo(cx - s * 0.4, cy + s * 0.05); c.lineTo(cx + s * 0.4, cy - s * 0.1); c.stroke();
    }
    c.restore();
    if (kind === "h") {
      c.strokeStyle = "#1f2530"; c.lineWidth = Math.max(1.5, s * 0.035); c.lineJoin = "round";
      c.beginPath();
      c.moveTo(cx - s * 0.05, cy - s * 0.34); c.lineTo(cx + s * 0.04, cy - s * 0.12); c.lineTo(cx - s * 0.08, cy + s * 0.04);
      c.lineTo(cx + s * 0.06, cy + s * 0.3);
      c.moveTo(cx + s * 0.04, cy - s * 0.12); c.lineTo(cx + s * 0.26, cy - s * 0.04);
      c.moveTo(cx - s * 0.08, cy + s * 0.04); c.lineTo(cx - s * 0.28, cy + s * 0.12);
      c.stroke();
    }
  }
  var BOMB_COL = { "1": "#33313f", "2": "#33313f", "3": "#33313f", o: "#7c3aed", "-": "#e8590c", "|": "#1c7ed6" };
  function arrow(c, x1, y1, x2, y2, w) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    [[x2, y2, a], [x1, y1, a + Math.PI]].forEach(function (p) {
      c.beginPath();
      c.moveTo(p[0] + Math.cos(p[2]) * w * 0.4, p[1] + Math.sin(p[2]) * w * 0.4);
      c.lineTo(p[0] + Math.cos(p[2] + 2.3) * w, p[1] + Math.sin(p[2] + 2.3) * w);
      c.lineTo(p[0] + Math.cos(p[2] - 2.3) * w, p[1] + Math.sin(p[2] - 2.3) * w);
      c.closePath(); c.fill();
    });
  }
  function drawBomb(c, cx, cy, s, type, t, swell, k) {
    var r = s * 0.3 * (1 + swell);
    var col = BOMB_COL[type] || "#33313f";
    // かげ
    c.fillStyle = "rgba(0,0,0,.22)";
    c.beginPath(); c.ellipse(cx, cy + r * 0.95, r * 0.85, r * 0.25, 0, 0, 7); c.fill();
    // くちがね と どうかせん
    var ca = -Math.PI / 4, capx = cx + Math.cos(ca) * r * 0.92, capy = cy + Math.sin(ca) * r * 0.92;
    c.strokeStyle = "#8b5a2b"; c.lineWidth = Math.max(2, s * 0.045); c.lineCap = "round";
    var fx = capx + s * 0.12, fy = capy - s * 0.16;
    c.beginPath(); c.moveTo(capx, capy); c.quadraticCurveTo(capx + s * 0.1, capy - s * 0.02, fx, fy); c.stroke();
    c.save(); c.translate(capx, capy); c.rotate(ca + Math.PI / 2);
    c.fillStyle = "#9ca3af"; c.fillRect(-r * 0.32, -r * 0.2, r * 0.64, r * 0.32);
    c.fillStyle = "#d1d5db"; c.fillRect(-r * 0.32, -r * 0.2, r * 0.64, r * 0.1);
    c.restore();
    // ほんたい
    var g = c.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
    g.addColorStop(0, shade(col, 60)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -40));
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.55)";
    c.beginPath(); c.ellipse(cx - r * 0.4, cy - r * 0.45, r * 0.2, r * 0.12, -0.7, 0, 7); c.fill();
    // ひばな
    var fl = 1 + 0.35 * Math.sin(t * 0.03 + (k || 0) * 1.7) + (swell ? 0.6 : 0);
    var sr = s * 0.075 * fl;
    c.fillStyle = "#ffd23d";
    star(c, fx, fy, sr, sr * 0.45, 7, t * 0.01);
    c.fillStyle = "#fff6c2"; c.beginPath(); c.arc(fx, fy, sr * 0.35, 0, 7); c.fill();
    // しるし
    c.fillStyle = "#fff"; c.strokeStyle = "#fff"; c.lineWidth = Math.max(2, r * 0.13); c.lineCap = "round";
    if (type === "-") arrow(c, cx - r * 0.55, cy + r * 0.05, cx + r * 0.55, cy + r * 0.05, r * 0.3);
    else if (type === "|") arrow(c, cx, cy - r * 0.5, cx, cy + r * 0.6, r * 0.3);
    else if (type === "o") {
      c.beginPath(); c.arc(cx, cy + r * 0.05, r * 0.45, 0, 7); c.stroke();
      c.beginPath(); c.arc(cx, cy + r * 0.05, r * 0.12, 0, 7); c.fill();
    } else {
      c.font = "bold " + Math.round(r * 1.05) + "px system-ui, sans-serif";
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(type, cx, cy + r * 0.1);
    }
  }
  function star(c, x, y, R, r, n, rot) {
    c.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var a = rot + (i / (n * 2)) * Math.PI * 2, d = i % 2 ? r : R;
      if (i) c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); else c.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    c.closePath(); c.fill();
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, Math.min(255, (n >> 16) + amt)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)), b = Math.max(0, Math.min(255, (n & 255) + amt));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function swellOf(k, now) {
    for (var i = 0; i < G.chains.length; i++) {
      var ch = G.chains[i];
      for (var j = 0; j < ch.cur.length; j++) {
        if (ch.cur[j].y * G.board.w + ch.cur[j].x === k) {
          var left = Math.max(0, ch.t - now);
          return 0.12 + 0.1 * Math.sin(now * 0.06) + (1 - left / FUSE_MS) * 0.15;
        }
      }
    }
    return 0;
  }

  function render(now) {
    var c = ctx, b = G.board;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, VW, VH);
    if (!b) return;
    var sx = 0, sy = 0;
    if (G.shake > 0.3) { sx = (Math.random() - 0.5) * G.shake; sy = (Math.random() - 0.5) * G.shake; }
    c.translate(sx, sy);
    var s = CS;
    // ぶたい
    c.fillStyle = "#7a4f2a"; rr(c, OX - 8, OY - 8 + 5, s * b.w + 16, s * b.h + 16, 18); c.fill();
    c.fillStyle = "#b07a45"; rr(c, OX - 8, OY - 8, s * b.w + 16, s * b.h + 16, 18); c.fill();
    for (var y = 0; y < b.h; y++) for (var x = 0; x < b.w; x++) {
      c.fillStyle = (x + y) & 1 ? "#f1d6a2" : "#ead095";
      c.fillRect(OX + x * s, OY + y * s, s + 0.5, s + 0.5);
    }
    // ねらい（おしている あいだ）
    if (G.press && G.press.bomb) {
      var cells = C.blastCells(b, G.press.x, G.press.y);
      c.fillStyle = "rgba(255,110,30,.33)";
      cells.forEach(function (q) { c.fillRect(OX + q.x * s + 2, OY + q.y * s + 2, s - 4, s - 4); });
      c.strokeStyle = "rgba(230,70,0,.85)"; c.lineWidth = 3; c.setLineDash([6, 5]);
      cells.forEach(function (q) { c.strokeRect(OX + q.x * s + 3, OY + q.y * s + 3, s - 6, s - 6); });
      c.setLineDash([]);
    }
    // マス
    for (y = 0; y < b.h; y++) for (x = 0; x < b.w; x++) {
      var k = y * b.w + x, ch = b.g[k], px = OX + x * s, py = OY + y * s;
      if (ch === "#") drawSteel(c, px, py, s);
      else if (ch === "r" || ch === "R" || ch === "h") drawRock(c, px, py, s, k, ch);
      else if (C.isBomb(ch)) {
        var sw = swellOf(k, now);
        var bob = sw ? (Math.random() - 0.5) * s * 0.05 : Math.sin(now * 0.004 + k) * s * 0.015;
        drawBomb(c, px + s / 2 + (sw ? bob : 0), py + s * 0.54 + (sw ? 0 : bob), s, ch, now, sw, k);
      }
    }
    // ヒント
    if (G.hint) {
      var hp = (now - G.hint.t0) / 1000;
      var hx = OX + (G.hint.x + 0.5) * s, hy = OY + (G.hint.y + 0.5) * s;
      c.strokeStyle = "rgba(255,220,40," + (0.6 + 0.4 * Math.sin(hp * 8)) + ")";
      c.lineWidth = 5;
      c.beginPath(); c.arc(hx, hy, s * (0.46 + 0.05 * Math.sin(hp * 8)), 0, 7); c.stroke();
      c.font = Math.round(s * 0.5) + "px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("👆", hx + s * 0.2, hy + s * 0.55 + Math.abs(Math.sin(hp * 5)) * s * 0.12);
    }
    // ほのお
    G.fx.forEach(function (f) {
      var p = (now - f.t0) / f.dur;
      if (p < 0 || p > 1) return;
      var cx = OX + (f.x + 0.5) * s, cy = OY + (f.y + 0.5) * s;
      if (f.k === "fire") {
        var e = 1 - Math.pow(1 - p, 3), a = 1 - p;
        var rad = s * (f.big ? 0.4 + 0.5 * e : 0.3 + 0.38 * e);
        var g = c.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, "rgba(255,255,225," + a + ")");
        g.addColorStop(0.35, "rgba(255,210,60," + a + ")");
        g.addColorStop(0.7, "rgba(255,110,20," + a * 0.85 + ")");
        g.addColorStop(1, "rgba(200,40,10,0)");
        c.fillStyle = g; c.beginPath(); c.arc(cx, cy, rad, 0, 7); c.fill();
      } else if (f.k === "ring") {
        c.strokeStyle = "rgba(255,255,255," + (1 - p) * 0.9 + ")";
        c.lineWidth = Math.max(1, s * 0.12 * (1 - p));
        c.beginPath(); c.arc(cx, cy, s * (0.3 + 1.6 * p), 0, 7); c.stroke();
      }
    });
    // つぶ
    G.parts.forEach(function (q) {
      var a = 1 - Math.max(0, q.life) / q.max;
      if (q.life < 0) return;
      var x = OX + q.x * s, y = OY + q.y * s, r = q.s * s;
      if (q.k === "spark") {
        c.fillStyle = q.col || ("rgba(255," + (180 + Math.floor(70 * a)) + ",60," + a + ")");
        c.globalAlpha = a; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.globalAlpha = 1;
      } else if (q.k === "smoke") {
        c.fillStyle = "rgba(90,80,90," + a * 0.35 + ")";
        c.beginPath(); c.arc(x, y, r * (1.4 - a * 0.6), 0, 7); c.fill();
      } else if (q.k === "chunk" || q.k === "confetti") {
        c.save(); c.translate(x, y); c.rotate(q.rot); c.globalAlpha = Math.min(1, a * 2);
        c.fillStyle = q.col;
        if (q.k === "chunk") { c.beginPath(); c.moveTo(-r, -r * 0.6); c.lineTo(r * 0.8, -r); c.lineTo(r, r * 0.7); c.lineTo(-r * 0.6, r); c.closePath(); c.fill(); }
        else c.fillRect(-r, -r * 0.5, r * 2, r);
        c.restore(); c.globalAlpha = 1;
      } else if (q.k === "star") {
        c.globalAlpha = Math.min(1, a * 1.5);
        c.fillStyle = "#ffd23d"; star(c, x, y, r, r * 0.45, 5, -Math.PI / 2);
        c.globalAlpha = 1;
      }
    });
    // もじ
    G.pops.forEach(function (p) {
      var t = (now - p.t0) / p.dur;
      if (t < 0 || t > 1) return;
      var sc = t < 0.15 ? 0.5 + t / 0.15 * 0.7 : 1.2 - Math.min(0.2, (t - 0.15));
      var fs = Math.round(Math.max(22, s * p.size) * sc);
      var x = OX + p.x * s, y = OY + p.y * s - t * s * 0.8;
      x = Math.max(OX + fs * 2.2, Math.min(OX + b.w * s - fs * 2.2, x));
      c.globalAlpha = t > 0.75 ? (1 - t) / 0.25 : 1;
      c.font = "900 " + fs + "px 'Hiragino Maru Gothic ProN', system-ui, sans-serif";
      c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = fs * 0.22; c.strokeStyle = "#3a1500"; c.lineJoin = "round";
      c.strokeText(p.text, x, y);
      c.fillStyle = p.col; c.fillText(p.text, x, y);
      c.globalAlpha = 1;
    });
  }

  /* ───────── ループ ───────── */
  var lastT = performance.now();
  function loop(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if ($("game").classList.contains("on")) {
      // れんさ
      var had = G.chains.length > 0;
      for (var i = G.chains.length - 1; i >= 0; i--) {
        var ch = G.chains[i];
        if (now >= ch.t) {
          if (ch.cur.length) doWave(ch, now);
          if (!ch.cur.length) G.chains.splice(i, 1);
        }
      }
      if (had && !G.chains.length) afterChains();
      // つぶ
      G.parts.forEach(function (q) {
        q.life += dt;
        if (q.life < 0) return;
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.k === "chunk") { q.vy += 14 * dt; q.rot += q.vr * dt; }
        else if (q.k === "confetti") { q.vx += Math.sin(now * 0.003 + q.rot) * dt; q.rot += q.vr * dt; }
        else if (q.k === "spark") { q.vx *= 0.94; q.vy = q.vy * 0.94 + 4 * dt; }
        else if (q.k === "star") { q.vy += 2.5 * dt; }
      });
      G.parts = G.parts.filter(function (q) { return q.life < q.max; });
      G.fx = G.fx.filter(function (f) { return now - f.t0 < f.dur; });
      G.pops = G.pops.filter(function (p) { return now - p.t0 < p.dur; });
      G.shake *= Math.pow(0.0015, dt);
      if (G.parts.length > 900) G.parts.splice(0, G.parts.length - 900);
      render(now);
    } else if ($("title").classList.contains("on")) {
      renderTitle(now);
    }
    requestAnimationFrame(loop);
  }

  /* タイトルの ばくだん */
  var tc = $("titleCanvas"), tctx = tc.getContext("2d");
  (function () { var d = Math.min(window.devicePixelRatio || 1, 2); tc.width = 260 * d; tc.height = 260 * d; tctx.scale(d, d); })();
  var titleBoom = 0;
  function renderTitle(now) {
    tctx.clearRect(0, 0, 260, 260);
    var cyc = (now % 3200) / 3200;
    if (cyc > 0.82) {
      var p = (cyc - 0.82) / 0.18;
      var g = tctx.createRadialGradient(130, 140, 0, 130, 140, 40 + 100 * p);
      g.addColorStop(0, "rgba(255,255,220," + (1 - p) + ")");
      g.addColorStop(0.4, "rgba(255,200,50," + (1 - p) + ")");
      g.addColorStop(1, "rgba(255,90,20,0)");
      tctx.fillStyle = g; tctx.beginPath(); tctx.arc(130, 140, 40 + 100 * p, 0, 7); tctx.fill();
      if (p > 0.55) drawBomb(tctx, 130, 150, 230 * (p - 0.55) / 0.45, "3", now, 0, 0);
    } else {
      var sw = cyc > 0.6 ? (cyc - 0.6) * 0.6 + Math.sin(now * 0.05) * 0.03 : 0;
      drawBomb(tctx, 130, 150 + Math.sin(now * 0.004) * 4, 230, "3", now, sw, 0);
    }
  }

  /* ───────── そうさ ───────── */
  function cellAt(e) {
    var r = cv.getBoundingClientRect();
    var x = Math.floor((e.clientX - r.left - OX) / CS), y = Math.floor((e.clientY - r.top - OY) / CS);
    if (!G.board || x < 0 || y < 0 || x >= G.board.w || y >= G.board.h) return null;
    return { x: x, y: y };
  }
  cv.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    ac();
    if (G.over || $("modal").classList.contains("on")) return;
    var cell = cellAt(e); if (!cell) return;
    try { cv.setPointerCapture(e.pointerId); } catch (er) { }
    if (G.mode === "free" && G.tool !== "fire") {
      G.painting = true; G.lastPaint = -1; paint(cell); return;
    }
    if (G.mode === "stage" && G.chains.length) return;
    var k = cell.y * G.board.w + cell.x;
    var isB = C.isBomb(G.board.g[k]) && !G.busy[k];
    G.press = { x: cell.x, y: cell.y, id: e.pointerId, bomb: isB };
    if (isB) SND.pick();
  });
  cv.addEventListener("pointermove", function (e) {
    var cell = cellAt(e);
    if (G.painting) { if (cell) paint(cell); return; }
    if (!G.press || G.press.id !== e.pointerId) return;
    if (!cell || cell.x !== G.press.x || cell.y !== G.press.y) {
      // ゆびが うごいたら そっちの ばくだんを ねらう
      if (cell) {
        var k = cell.y * G.board.w + cell.x;
        G.press.x = cell.x; G.press.y = cell.y;
        G.press.bomb = C.isBomb(G.board.g[k]) && !G.busy[k];
      } else G.press.bomb = false;
    }
  });
  function release(e, cancel) {
    if (G.painting) { G.painting = false; G.lastPaint = -1; return; }
    var p = G.press; G.press = null;
    if (!p || p.id !== e.pointerId || cancel || !p.bomb) return;
    var k = p.y * G.board.w + p.x;
    if (!C.isBomb(G.board.g[k]) || G.busy[k]) return;
    if (G.mode === "stage") {
      if (G.matches <= 0 || G.chains.length) return;
      G.matches--; G.used++; updateMatches();
      if (G.hint && (G.hint.x !== p.x || G.hint.y !== p.y)) G.hint = null;
      else G.hint = null;
    }
    ignite([{ x: p.x, y: p.y }]);
  }
  cv.addEventListener("pointerup", function (e) { release(e, false); });
  cv.addEventListener("pointercancel", function (e) { release(e, true); });
  cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && AC && AC.state === "running") { try { AC.suspend(); } catch (e) { } }
  });

  // テスト用
  window.__bakudan = { G: G, startLevel: startLevel, startFree: startFree, ignite: ignite };

  resize();
  requestAnimationFrame(loop);
})();
