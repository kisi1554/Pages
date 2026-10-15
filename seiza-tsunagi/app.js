/* せいざ つなぎ — app.js */
(function () {
  "use strict";

  var LIST = window.SEIZA;
  var BY = {};
  LIST.forEach(function (c) { BY[c.id] = c; prep(c); });

  /* ---------- データの したごしらえ ---------- */
  function prep(c) {
    c.edges = []; c.order = []; var seen = {}, prev = -1, eseen = {};
    c.path.forEach(function (i) {
      if (i < 0) { prev = -1; return; }
      if (!(i in seen)) { seen[i] = c.order.length + 1; c.order.push(i); }
      if (prev >= 0) {
        var k = ekey(prev, i);
        if (!eseen[k]) { eseen[k] = 1; c.edges.push([prev, i]); }
      }
      prev = i;
    });
    c.num = seen;            // ほし → ばんごう（1から）
    // え と ほし を あわせた はんい
    var xs = [], ys = [];
    c.stars.forEach(function (s) { xs.push(s[1]); ys.push(s[2]); });
    (c.art || []).forEach(function (a) {
      if (a[0] === "c") { xs.push(a[1] - a[3], a[1] + a[3]); ys.push(a[2] - a[3], a[2] + a[3]); }
      else if (a[0] === "t") { xs.push(a[1] - .1, a[1] + .1); ys.push(a[2] - .04, a[2] + .04); }
      else { var st = a[0] === "s" ? 2 : 1; for (var j = st; j < a.length; j += 2) { xs.push(a[j]); ys.push(a[j + 1]); } }
    });
    var sx = c.stars.map(function (q) { return q[1]; }), sy = c.stars.map(function (q) { return q[2]; });
    c.sbox = { x0: Math.min.apply(0, sx), x1: Math.max.apply(0, sx), y0: Math.min.apply(0, sy), y1: Math.max.apply(0, sy) };
    c.box = { x0: Math.min.apply(0, xs), x1: Math.max.apply(0, xs), y0: Math.min.apply(0, ys), y1: Math.max.apply(0, ys) };
  }
  function ekey(a, b) { return a < b ? a + "-" + b : b + "-" + a; }

  /* ---------- ほぞん ---------- */
  var SKEY = "seizaTsunagi.v1";
  var save = { cleared: {}, sound: true, mode: "easy" };
  try { var raw = localStorage.getItem(SKEY); if (raw) { var o = JSON.parse(raw); if (o && typeof o === "object") { save.cleared = o.cleared || {}; save.sound = o.sound !== false; save.mode = o.mode === "hard" ? "hard" : "easy"; } } } catch (e) {}
  function persist() { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} }
  function isCleared(id) { return !!save.cleared[id]; }
  function isUnlocked(c) { return !c.bonus || c.bonus.every(isCleared); }

  /* ---------- おと（WebAudio ごうせい） ---------- */
  var Snd = (function () {
    var ctx = null, master, sfx, bgm, bgmTimer = 0, chordIx = 0;
    var CHORDS = [[130.81, 196.0, 246.94, 329.63], [110.0, 164.81, 261.63, 329.63], [87.31, 174.61, 220.0, 329.63], [98.0, 146.83, 246.94, 293.66]];
    var PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0];
    function init() {
      if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      try { ctx = new AC(); } catch (e) { return; }
      var comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
      master = ctx.createGain(); master.gain.value = .9; master.connect(comp);
      sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master);
      var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100; lp.connect(master);
      bgm = ctx.createGain(); bgm.gain.value = 0; bgm.connect(lp);
      if (save.sound) startBgm();
    }
    function ok() { return ctx && save.sound; }
    function ping(f, t, dur, vol, type) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(sfx); o.start(t); o.stop(t + dur + .05);
    }
    function chord() {
      if (!ok()) return;
      var t = ctx.currentTime + .05, notes = CHORDS[chordIx++ % CHORDS.length];
      notes.forEach(function (f) {
        [["sine", 0], ["triangle", 5]].forEach(function (v) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = v[0]; o.frequency.value = f; o.detune.value = v[1];
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + 2.6); g.gain.setValueAtTime(.05, t + 6); g.gain.linearRampToValueAtTime(0, t + 9.5);
          o.connect(g); g.connect(bgm); o.start(t); o.stop(t + 9.7);
        });
      });
      // ときどき ちいさく きらり
      if (Math.random() < .7) { var tt = t + 2 + Math.random() * 4; ping(PENTA[3 + (Math.random() * 7 | 0)], tt, 1.6, .025); }
    }
    function startBgm() {
      if (!ctx || bgmTimer) return;
      bgm.gain.cancelScheduledValues(ctx.currentTime);
      bgm.gain.setTargetAtTime(.55, ctx.currentTime, .8);
      chord(); bgmTimer = setInterval(chord, 8000);
    }
    function stopBgm() {
      if (!ctx) return;
      clearInterval(bgmTimer); bgmTimer = 0;
      bgm.gain.cancelScheduledValues(ctx.currentTime); bgm.gain.setTargetAtTime(0, ctx.currentTime, .3);
    }
    return {
      init: init,
      setOn: function (on) { if (!ctx) { if (on) init(); return; } if (on) { ctx.resume(); startBgm(); } else stopBgm(); },
      suspend: function (s) { if (!ctx) return; if (s) ctx.suspend(); else if (save.sound) ctx.resume(); },
      tick: function () { if (ok()) ping(1318.5, ctx.currentTime, .09, .05); },
      kiran: function (step) {
        if (!ok()) return; var t = ctx.currentTime, f = PENTA[Math.min(step, PENTA.length - 1)];
        ping(f, t, .5, .16); ping(f * 2, t + .07, .9, .09); ping(f * 3, t + .07, .5, .025);
      },
      oops: function () {
        if (!ok()) return; var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
        o.type = "triangle"; o.frequency.setValueAtTime(392, t); o.frequency.exponentialRampToValueAtTime(262, t + .3);
        lp.type = "lowpass"; lp.frequency.value = 900;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.13, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .45);
        o.connect(lp); lp.connect(g); g.connect(sfx); o.start(t); o.stop(t + .5);
      },
      fanfare: function () {
        if (!ok()) return; var t = ctx.currentTime + .05;
        [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach(function (f, i) { ping(f, t + i * .11, 1.0, .13); ping(f * 2, t + i * .11, .6, .04); });
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f) { ping(f, t + .66, 2.4, .07); });
      }
    };
  })();

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var cv = $("sky"), g = cv.getContext("2d"), svg = $("art");
  var SVGNS = "http://www.w3.org/2000/svg";
  var W = 0, H = 0, DPR = 1;

  /* ---------- じょうたい ---------- */
  var view = "home";
  var S = null; // あそんでいる せいざの じょうたい
  var bg = [];
  var particles = [];

  /* ---------- はいけいの ほし ---------- */
  function makeBg() {
    bg = []; var n = Math.round(W * H / 2400);
    for (var i = 0; i < n; i++) {
      bg.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() < .9 ? .4 + Math.random() * .7 : 1.1 + Math.random() * .6,
        a: .25 + Math.random() * .55, ph: Math.random() * 6.28, sp: .6 + Math.random() * 2.2, hue: Math.random() < .2 ? (Math.random() < .5 ? "255,226,190" : "190,210,255") : "255,255,255" });
    }
  }
  var bgGrad = null;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    bgGrad = g.createRadialGradient(W / 2, H * .05, 0, W / 2, H * .05, Math.max(W, H) * 1.1);
    bgGrad.addColorStop(0, "#16204A"); bgGrad.addColorStop(.45, "#0A1030"); bgGrad.addColorStop(1, "#060A1C");
    makeBg();
    if (S) { S.fit = calcFit(); S.cur = copyFit(S.fit); placeStars(); if (S.artShown) buildArt(false); }
  }

  /* ---------- ざひょうの あわせかた ---------- */
  function playArea() {
    var top = $("top").getBoundingClientRect().bottom + 52, bottom = H - 12, left = 0, right = W;
    var sheet = $("sheet");
    if (!sheet.hidden) {
      // アニメーション中でも きまった いちを つかう（transform を むしする）
      var card = sheet.querySelector(".sheet-card");
      if (sheet.offsetLeft > W * .3) right = sheet.offsetLeft; else bottom = Math.min(bottom, sheet.offsetTop + card.offsetTop);
    } else {
      var say = $("say").getBoundingClientRect(); if (say.height) bottom = say.top - 6;
    }
    return { x: left, y: top, w: right - left, h: Math.max(80, bottom - top) };
  }
  function calcFit() {
    // あそんでいる あいだは ほしだけで おおきく、かんせい したら え も はいる ように
    var a = playArea(), b = S.complete ? S.c.box : S.c.sbox, bw = Math.max(b.x1 - b.x0, .2), bh = Math.max(b.y1 - b.y0, .2);
    var pad = Math.min(a.w, a.h) * .06 + 26;
    var sc = Math.min((a.w - pad * 2) / bw, (a.h - pad * 2) / bh);
    sc = Math.min(sc, 900);
    return { s: sc, ox: a.x + a.w / 2 - (b.x0 + bw / 2) * sc, oy: a.y + a.h / 2 - (b.y0 + bh / 2) * sc };
  }
  function copyFit(f) { return { s: f.s, ox: f.ox, oy: f.oy }; }
  function tx(x) { return S.cur.ox + x * S.cur.s; }
  function ty(y) { return S.cur.oy + y * S.cur.s; }
  function placeStars() {
    var mult = Math.max(.85, Math.min(1.5, S.cur.s / 300));
    S.pts.forEach(function (p) { p.x = tx(p.nx); p.y = ty(p.ny); p.r = Math.max(2.4, Math.min(8.5, 6.6 - p.mag * 1.05)) * mult; });
    // あたりはんけい：みための ほしより おおきく。となりの ほしと かさならない はんいで
    var md = 1e9; for (var i = 0; i < S.pts.length; i++) for (var j = i + 1; j < S.pts.length; j++) md = Math.min(md, Math.hypot(S.pts[i].x - S.pts[j].x, S.pts[i].y - S.pts[j].y));
    S.hitR = Math.max(16, Math.min(38, md * .5));
    // ばんごうの ふだは ほかの ほし・ふだと かさならない むきに おく
    var placed = [];
    S.pts.forEach(function (p) {
      if (!p.real) return;
      var best = null, bs = -1;
      for (var k = 0; k < 8; k++) {
        var ang = -Math.PI / 4 + k * Math.PI / 4, d = p.r + 14, lx = p.x + Math.cos(ang) * d, ly = p.y + Math.sin(ang) * d, sc = 1e9;
        S.pts.forEach(function (o) { if (o !== p) sc = Math.min(sc, Math.hypot(o.x - lx, o.y - ly) - o.r); });
        placed.forEach(function (o) { sc = Math.min(sc, Math.hypot(o[0] - lx, o[1] - ly) - 6); });
        S.c.edges.forEach(function (e) { var A = S.pts[e[0]], B = S.pts[e[1]]; sc = Math.min(sc, segDist(lx, ly, A.x, A.y, B.x, B.y) + 4); });
        if (sc > bs + 2) { bs = sc; best = [lx, ly]; }
      }
      p.lx = best[0]; p.ly = best[1]; placed.push(best);
    });
  }

  /* ---------- あそびの はじまり ---------- */
  function startPlay(id, opts) {
    opts = opts || {};
    var c = BY[id]; if (!c) return;
    clearArt();
    var mode = opts.detail ? "easy" : save.mode;
    S = { c: c, mode: mode, drawn: {}, drawnList: [], wrongs: [], anchor: -1, selected: -1, dragging: false, moved: false,
      px: 0, py: 0, hintUntil: 0, complete: false, artShown: false, detail: !!opts.detail, t0: performance.now(), pts: [], namesAt: 0 };
    c.stars.forEach(function (s, i) { S.pts.push({ nx: s[1], ny: s[2], mag: s[3], name: s[0], real: true, i: i }); });
    if (mode === "hard" && !opts.detail) addDecoys();
    setView("play");
    $("titleEmoji").textContent = c.emoji;
    $("titleText").textContent = c.name;
    $("hintBtn").hidden = mode !== "hard";
    $("hintBtn").setAttribute("aria-pressed", "false");
    $("say").hidden = false;
    hideSheet();
    S.fit = calcFit(); S.cur = copyFit(S.fit); placeStars();
    if (opts.detail) {
      c.edges.forEach(function (e) { var k = ekey(e[0], e[1]); S.drawn[k] = 1; S.drawnList.push({ a: e[0], b: e[1], t: -1e9 }); });
      S.complete = true; S.namesAt = performance.now();
      $("say").hidden = true;
      showSheet(false);
      S.fit = calcFit(); S.cur = copyFit(S.fit); placeStars();
      buildArt(false);
    } else {
      say(mode === "easy" ? "1ばんの ほしから じゅんばんに、ゆびで なぞって つないでね。" : "ほしを つないで " + c.name + "を つくろう。こまったら 💡ヒント！", "🌙");
    }
    updateProg();
  }

  function addDecoys() {
    var c = S.c, real = c.stars, n = Math.min(8, Math.max(3, Math.round(real.length * .8)));
    var b = { x0: -0.08, x1: 1.08, y0: -0.08, y1: 1.08 };
    var tries = 0, decoys = [];
    while (decoys.length < n && tries++ < 600) {
      var x = b.x0 + Math.random() * (b.x1 - b.x0), y = b.y0 + Math.random() * (b.y1 - b.y0), ok = true;
      for (var i = 0; i < real.length && ok; i++) if (Math.hypot(real[i][1] - x, real[i][2] - y) < .14) ok = false;
      for (i = 0; i < decoys.length && ok; i++) if (Math.hypot(decoys[i][0] - x, decoys[i][1] - y) < .14) ok = false;
      for (i = 0; i < c.edges.length && ok; i++) { var A = real[c.edges[i][0]], B = real[c.edges[i][1]]; if (segDist(x, y, A[1], A[2], B[1], B[2]) < .07) ok = false; }
      if (ok) decoys.push([x, y]);
    }
    decoys.forEach(function (d) { S.pts.push({ nx: d[0], ny: d[1], mag: 1.6 + Math.random() * 2.4, name: "", real: false, i: S.pts.length }); });
  }
  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  function isEdge(a, b) {
    if (a < 0 || b < 0 || !S.pts[a].real || !S.pts[b].real) return false;
    var k = ekey(a, b); return S.c.edges.some(function (e) { return ekey(e[0], e[1]) === k; });
  }
  function hit(x, y) {
    var best = -1, bd = S.hitR;
    S.pts.forEach(function (p, i) { var d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  function connect(a, b) {
    var k = ekey(a, b); if (S.drawn[k]) return;
    S.drawn[k] = 1; S.drawnList.push({ a: a, b: b, t: performance.now() });
    burst(S.pts[b].x, S.pts[b].y, 14);
    Snd.kiran(S.drawnList.length - 1);
    updateProg();
    var left = S.c.edges.length - S.drawnList.length;
    if (left === 0) { complete(); return; }
    var msgs = ["キラン！ いいね！", "ぴかっ！ その ちょうし！", "すごい すごい！", "きれいに つながったよ！"];
    if (left <= 2) say("あと " + left + "ほん！", "✨");
    else say(msgs[S.drawnList.length % msgs.length], "⭐");
  }
  function wrong(a, b) {
    S.wrongs.push({ a: a, b: b, t: performance.now() });
    Snd.oops();
    if (S.mode === "easy") {
      var nt = nextTarget(a);
      say("あれれ、ちがう ほしみたい。" + (nt >= 0 ? (S.c.num[nt] + "ばんの ほしを さがしてね。") : ""), "🤔");
    } else say("おしい！ ちがう ほしだったよ。もういちど。", "🤔");
  }
  function nextTarget(fromStar) {
    var from = fromStar >= 0 ? fromStar : S.selected >= 0 ? S.selected : S.anchor, first = null;
    for (var i = 0; i < S.c.edges.length; i++) {
      var e = S.c.edges[i]; if (S.drawn[ekey(e[0], e[1])]) continue;
      if (!first) first = e;
      if (from >= 0 && (e[0] === from || e[1] === from)) return e[0] === from ? e[1] : e[0];
    }
    return first ? first[0] : -1;
  }

  function complete() {
    S.complete = true; S.anchor = S.selected = -1; S.dragging = false;
    var c = S.c, wasUnlocked = LIST.filter(isUnlocked).map(function (x) { return x.id; });
    var rec = save.cleared[c.id] || {}; rec[S.mode === "hard" ? "h" : "e"] = 1; save.cleared[c.id] = rec; persist();
    var newly = LIST.filter(function (x) { return x.bonus && isUnlocked(x) && wasUnlocked.indexOf(x.id) < 0; });
    setTimeout(function () { Snd.fanfare(); }, 250);
    say("やったね！ " + c.name + "の かんせい！", "🎉");
    S.pts.forEach(function (p) { if (p.real) burst(p.x, p.y, 6); });
    updateZukanCount();
    setTimeout(function () {
      if (!S || S.c !== c) return;
      $("say").hidden = true;
      showSheet(true, newly);
      S.fit = calcFit(); S.namesAt = performance.now() + 900;
      setTimeout(function () { if (S && S.c === c) buildArt(true); }, 650);
    }, 900);
  }

  /* ---------- え（SVG の せんが） ---------- */
  function clearArt() { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function smoothPath(pts, closed) {
    var n = pts.length; if (n < 2) return "";
    var P = function (i) { if (closed) return pts[(i + n) % n]; return pts[Math.max(0, Math.min(n - 1, i))]; };
    var d = "M" + f2(pts[0][0]) + " " + f2(pts[0][1]), segs = closed ? n : n - 1;
    for (var i = 0; i < segs; i++) {
      var p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      d += "C" + f2(p1[0] + (p2[0] - p0[0]) / 6) + " " + f2(p1[1] + (p2[1] - p0[1]) / 6) + " " + f2(p2[0] - (p3[0] - p1[0]) / 6) + " " + f2(p2[1] - (p3[1] - p1[1]) / 6) + " " + f2(p2[0]) + " " + f2(p2[1]);
    }
    return d + (closed ? "Z" : "");
  }
  function f2(v) { return Math.round(v * 10) / 10; }
  function artNodes(c, X, Y, scale, cls) {
    var out = [];
    (c.art || []).forEach(function (a) {
      var el, pts = [], j;
      if (a[0] === "c") {
        el = document.createElementNS(SVGNS, "circle");
        el.setAttribute("cx", f2(X(a[1]))); el.setAttribute("cy", f2(Y(a[2]))); el.setAttribute("r", f2(Math.max(1.5, a[3] * scale)));
        el.setAttribute("class", "a" + cls);
      } else if (a[0] === "t") {
        el = document.createElementNS(SVGNS, "text");
        el.setAttribute("x", f2(X(a[1]))); el.setAttribute("y", f2(Y(a[2])));
        el.setAttribute("font-size", Math.round(Math.max(12, Math.min(22, scale * .05))));
        el.textContent = a[3]; el.setAttribute("class", cls.indexOf("draw") >= 0 ? "fade" : "");
      } else {
        var st = a[0] === "s" ? 2 : 1;
        for (j = st; j < a.length; j += 2) pts.push([X(a[j]), Y(a[j + 1])]);
        el = document.createElementNS(SVGNS, "path");
        if (a[0] === "s") el.setAttribute("d", smoothPath(pts, a[1] === 1));
        else el.setAttribute("d", "M" + pts.map(function (p) { return f2(p[0]) + " " + f2(p[1]); }).join("L"));
        el.setAttribute("class", "a" + cls);
      }
      if (el.getAttribute("class") && el.getAttribute("class").indexOf("a") === 0) el.setAttribute("pathLength", "1");
      out.push(el);
    });
    return out;
  }
  function buildArt(animate) {
    clearArt(); if (!S) return;
    var f = S.fit;
    var nodes = artNodes(S.c, function (x) { return f.ox + x * f.s; }, function (y) { return f.oy + y * f.s; }, f.s, animate ? " draw" : "");
    nodes.forEach(function (n) { svg.appendChild(n); });
    S.artShown = true;
    if (animate) {
      svg.getBoundingClientRect();
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        nodes.forEach(function (n, i) { setTimeout(function () { n.classList.add("go"); }, i * 70); });
      }); });
    }
  }

  /* ---------- ちいさな ほしず（カード用） ---------- */
  function miniSvg(c, opt) {
    opt = opt || {};
    var s = document.createElementNS(SVGNS, "svg"); s.setAttribute("viewBox", "0 0 100 100");
    var b = opt.art ? c.box : { x0: 0, x1: 1, y0: 0, y1: 1 };
    if (!opt.art) { var xs = c.stars.map(function (q) { return q[1]; }), ys = c.stars.map(function (q) { return q[2]; }); b = { x0: Math.min.apply(0, xs), x1: Math.max.apply(0, xs), y0: Math.min.apply(0, ys), y1: Math.max.apply(0, ys) }; }
    var bw = Math.max(b.x1 - b.x0, .3), bh = Math.max(b.y1 - b.y0, .3), sc = 80 / Math.max(bw, bh);
    var ox = 50 - (b.x0 + bw / 2) * sc, oy = 50 - (b.y0 + bh / 2) * sc;
    var X = function (x) { return ox + x * sc; }, Y = function (y) { return oy + y * sc; };
    var inner = "";
    if (opt.art) {
      var tmp = artNodes(c, X, Y, sc, "");
      tmp.forEach(function (n) {
        if (n.tagName === "text") return;
        n.removeAttribute("class"); n.removeAttribute("pathLength");
        n.setAttribute("fill", "none"); n.setAttribute("stroke", "rgba(191,203,255,.55)"); n.setAttribute("stroke-width", "1.2"); n.setAttribute("stroke-linecap", "round");
        s.appendChild(n);
      });
    }
    if (opt.lines) c.edges.forEach(function (e) {
      var A = c.stars[e[0]], B = c.stars[e[1]];
      inner += '<line x1="' + f2(X(A[1])) + '" y1="' + f2(Y(A[2])) + '" x2="' + f2(X(B[1])) + '" y2="' + f2(Y(B[2])) + '" stroke="#FFD27A" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>';
    });
    c.stars.forEach(function (q) {
      var r = Math.max(1.6, Math.min(4.4, 3.6 - q[3] * .55));
      inner += '<circle cx="' + f2(X(q[1])) + '" cy="' + f2(Y(q[2])) + '" r="' + f2(r) + '" fill="' + (opt.dim ? "rgba(234,240,255,.55)" : "#FFF6DA") + '"/>';
    });
    s.insertAdjacentHTML("beforeend", inner);
    return s;
  }

  /* ---------- びょうが ---------- */
  function frame(now) {
    requestAnimationFrame(frame);
    var t = now / 1000;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.fillStyle = bgGrad; g.fillRect(0, 0, W, H);
    // あまのがわ っぽい うすい おび
    for (var i = 0; i < bg.length; i++) {
      var b = bg[i], a = b.a * (.55 + .45 * Math.sin(t * b.sp + b.ph));
      g.fillStyle = "rgba(" + b.hue + "," + a.toFixed(3) + ")";
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.283); g.fill();
    }
    if (view === "play" && S) drawPlay(now, t);
    drawParticles();
  }

  function drawPlay(now, t) {
    // ざひょうを なめらかに うごかす
    var k = .14, cur = S.cur, fit = S.fit;
    if (Math.abs(cur.s - fit.s) > .05 || Math.abs(cur.ox - fit.ox) > .1 || Math.abs(cur.oy - fit.oy) > .1) {
      cur.s += (fit.s - cur.s) * k; cur.ox += (fit.ox - cur.ox) * k; cur.oy += (fit.oy - cur.oy) * k; placeStars();
    }
    var P = S.pts;
    g.lineCap = "round";
    // ヒント
    var showHint = S.mode === "easy" ? false : now < S.hintUntil;
    if (showHint) {
      var ha = Math.min(1, (S.hintUntil - now) / 800) * .45;
      g.setLineDash([6, 8]); g.lineWidth = 2; g.strokeStyle = "rgba(180,200,255," + ha.toFixed(3) + ")";
      S.c.edges.forEach(function (e) { if (S.drawn[ekey(e[0], e[1])]) return; line(P[e[0]], P[e[1]]); });
      g.setLineDash([]);
    } else if (S.hintUntil && now >= S.hintUntil) { S.hintUntil = 0; $("hintBtn").setAttribute("aria-pressed", "false"); }
    // つないだ せん
    S.drawnList.forEach(function (d) {
      var A = P[d.a], B = P[d.b], p = Math.min(1, (now - d.t) / 220), bx = A.x + (B.x - A.x) * p, by = A.y + (B.y - A.y) * p;
      var glow = .28 + .08 * Math.sin(t * 2 + d.a);
      g.strokeStyle = "rgba(255,200,90," + glow.toFixed(3) + ")"; g.lineWidth = 9;
      g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(bx, by); g.stroke();
      g.strokeStyle = "#FFE9A8"; g.lineWidth = 2.6;
      g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(bx, by); g.stroke();
    });
    // まちがい（きえていく）
    S.wrongs = S.wrongs.filter(function (w) { return now - w.t < 700; });
    S.wrongs.forEach(function (w) {
      var a = 1 - (now - w.t) / 700;
      g.strokeStyle = "rgba(255,143,177," + (a * .8).toFixed(3) + ")"; g.lineWidth = 3;
      g.setLineDash([4, 6]); line(P[w.a], P[w.b]); g.setLineDash([]);
    });
    // ドラッグちゅうの せん
    if (S.dragging && S.anchor >= 0 && S.moved) {
      g.strokeStyle = "rgba(234,240,255,.6)"; g.lineWidth = 2.5; g.setLineDash([3, 7]);
      g.beginPath(); g.moveTo(P[S.anchor].x, P[S.anchor].y); g.lineTo(S.px, S.py); g.stroke(); g.setLineDash([]);
    }
    // つぎの ほし（かんたん）
    var nt = (S.mode === "easy" && !S.complete) ? nextTarget() : -1;
    // ほし
    P.forEach(function (p, i) {
      var tw = .85 + .15 * Math.sin(t * 2.3 + i * 1.7);
      var R = p.r * (p.real && S.complete ? 1.15 : 1);
      var gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, R * 4.2);
      var col = p.real && S.complete ? "255,226,150" : "210,225,255";
      gr.addColorStop(0, "rgba(" + col + "," + (.55 * tw).toFixed(3) + ")"); gr.addColorStop(1, "rgba(" + col + ",0)");
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, R * 4.2, 0, 6.283); g.fill();
      g.fillStyle = "#FFFDF2"; g.beginPath(); g.arc(p.x, p.y, R, 0, 6.283); g.fill();
      if (i === S.selected || (S.dragging && i === S.anchor)) {
        g.strokeStyle = "rgba(255,233,168,.95)"; g.lineWidth = 2.5; g.beginPath(); g.arc(p.x, p.y, R + 9, 0, 6.283); g.stroke();
      }
      if (i === nt) {
        var ph = (t * 1.2) % 1;
        g.strokeStyle = "rgba(79,216,198," + (1 - ph).toFixed(3) + ")"; g.lineWidth = 3;
        g.beginPath(); g.arc(p.x, p.y, R + 8 + ph * 18, 0, 6.283); g.stroke();
      }
      if (S.mode === "easy" && p.real && !S.complete) {
        var n = S.c.num[i], lx = p.lx, ly = p.ly;
        g.fillStyle = "rgba(16,24,56,.8)"; g.beginPath(); g.arc(lx, ly, 12, 0, 6.283); g.fill();
        g.strokeStyle = i === nt ? "#4FD8C6" : "rgba(150,175,255,.6)"; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = "#FFE9A8"; g.font = "800 15px " + getComputedStyle(document.body).fontFamily;
        g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(n), lx, ly + 1);
      }
    });
    // かんせい したら ほしの なまえ
    if (S.complete && S.namesAt && now > S.namesAt) {
      var na = Math.min(1, (now - S.namesAt) / 900);
      g.font = "700 " + Math.round(Math.max(11, Math.min(15, S.cur.s / 32))) + "px " + getComputedStyle(document.body).fontFamily;
      g.textAlign = "left"; g.textBaseline = "middle";
      var rects = [];
      P.filter(function (p) { return p.real && p.name && p.mag <= 2.9; }).sort(function (a, b) { return a.mag - b.mag; }).forEach(function (p) {
        var wdt = g.measureText(p.name).width, rx = p.x + p.r + 6, ry = p.y + p.r + 4, rw = wdt + 8;
        if (rects.some(function (q) { return rx < q[0] + q[2] && rx + rw > q[0] && ry < q[1] + 20 && ry + 20 > q[1]; })) return; // かさなる なまえは かかない
        rects.push([rx, ry, rw]);
        g.fillStyle = "rgba(6,10,28," + (.6 * na).toFixed(3) + ")";
        g.fillRect(rx, ry, rw, 20);
        g.fillStyle = "rgba(255,233,168," + na.toFixed(3) + ")";
        g.fillText(p.name, p.x + p.r + 10, p.y + p.r + 14);
      });
    }
  }
  function line(A, B) { g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); g.stroke(); }

  function burst(x, y, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, sp = 1 + Math.random() * 3.2;
      particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, r: 1 + Math.random() * 2 });
    }
  }
  function drawParticles() {
    particles = particles.filter(function (p) { return p.life > 0; });
    particles.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vx *= .95; p.vy *= .95; p.life -= .025;
      g.fillStyle = "rgba(255,233,168," + Math.max(0, p.life).toFixed(3) + ")";
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
    });
  }

  /* ---------- そうさ ---------- */
  function pos(e) { return { x: e.clientX, y: e.clientY }; }
  cv.addEventListener("pointerdown", function (e) {
    Snd.init();
    if (view !== "play" || !S || S.complete) return;
    var p = pos(e), h = hit(p.x, p.y);
    S.px = p.x; S.py = p.y; S.downX = p.x; S.downY = p.y; S.moved = false; S.pendingWrong = -1;
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    if (h < 0) { S.selected = -1; return; }
    if (S.selected >= 0 && h !== S.selected) {
      // じゅんばんに タップ
      var from = S.selected;
      if (isEdge(from, h)) { connect(from, h); if (S.complete) return; S.selected = h; S.anchor = h; S.dragging = true; return; }
      // タップなら まちがい。そのまま ドラッグを はじめたら あたらしい スタートと みなす
      S.pendingWrong = from; S.selected = -1;
    }
    S.anchor = h; S.dragging = true; Snd.tick();
  });
  cv.addEventListener("pointermove", function (e) {
    if (!S || !S.dragging) return;
    var p = pos(e); S.px = p.x; S.py = p.y;
    if (!S.moved && Math.hypot(p.x - S.downX, p.y - S.downY) > 10) S.moved = true;
    var h = hit(p.x, p.y);
    if (h >= 0 && h !== S.anchor && isEdge(S.anchor, h)) {
      if (!S.drawn[ekey(S.anchor, h)]) { connect(S.anchor, h); if (S.complete) return; }
      S.anchor = h; S.selected = -1;
    }
  });
  function endDrag(e) {
    if (!S || !S.dragging) return;
    S.dragging = false;
    var p = pos(e), h = hit(p.x, p.y);
    var pw = S.pendingWrong; S.pendingWrong = -1;
    if (!S.moved) {
      if (pw >= 0) { wrong(pw, S.anchor); S.selected = -1; return; }
      if (h === S.anchor) S.selected = h; // おなじ ほしを もういちど タップしても えらんだ まま
      return;
    }
    if (h >= 0 && h !== S.anchor) { wrong(S.anchor, h); S.selected = -1; }
    else if (h === S.anchor) S.selected = h;
    else S.selected = -1;
  }
  cv.addEventListener("pointerup", endDrag);
  cv.addEventListener("pointercancel", function () { if (S) { S.dragging = false; } });

  /* ---------- UI ---------- */
  function say(text, face) { $("sayText").textContent = text; if (face) document.querySelector(".say .face").textContent = face; }
  function updateProg() {
    if (!S) return; var n = S.drawnList.length, all = S.c.edges.length;
    $("progText").textContent = n + " / " + all; $("progBar").style.width = (n / all * 100) + "%";
  }
  function setView(v) {
    view = v;
    $("home").hidden = v !== "home"; $("zukan").hidden = v !== "zukan"; $("play").hidden = v !== "play";
    $("backBtn").hidden = v === "home";
    if (v !== "play") {
      clearArt(); hideSheet(); S = null;
      $("titleEmoji").textContent = v === "zukan" ? "📖" : "⭐";
      $("titleText").textContent = v === "zukan" ? "せいざ ずかん" : "せいざ つなぎ";
    }
    if (v === "home") renderHome();
    if (v === "zukan") renderZukan();
  }
  var backTo = "home";
  function showSheet(isNew, newly) {
    var c = S.c;
    $("hooray").textContent = isNew ? "✨ かんせい！ ずかんに とうろく したよ ✨" : "📖 せいざ ずかん";
    $("sEmoji").textContent = c.emoji;
    $("sName").textContent = c.name + (c.sub ? "（" + c.sub + "）" : "");
    $("sSeason").textContent = "みえる きせつ：" + c.season + (c.id === "cassiopeia" || c.id === "koguma" || c.id === "oogum" ? "（きたの そらで 1ねんじゅう）" : "");
    $("sStory").innerHTML = c.story;
    var names = c.stars.filter(function (q) { return q[0]; }).sort(function (a, b) { return a[3] - b[3]; }).slice(0, 5).map(function (q) { return "<b>" + q[0] + "</b>"; });
    $("sNames").innerHTML = "おもな ほし：" + names.join("・");
    var un = $("sUnlock");
    if (newly && newly.length) { un.hidden = false; un.textContent = "🎁 あたらしい ほしぞらが でたよ！「" + newly.map(function (x) { return x.name; }).join("」「") + "」"; }
    else un.hidden = true;
    var act = $("sActions"); act.innerHTML = "";
    function btn(label, cls, fn) { var b = document.createElement("button"); b.textContent = label; if (cls) b.className = cls; b.addEventListener("click", function () { Snd.init(); fn(); }); act.appendChild(b); }
    if (isNew) {
      var nx = nextId(c.id);
      if (newly && newly.length) btn("🎁 " + newly[0].name + " へ", "main wide", function () { startPlay(newly[0].id); });
      else if (nx) btn("つぎへ ▶", "main", function () { startPlay(nx); });
      btn("もういちど", "", function () { startPlay(c.id); });
      btn("📖 ずかん", "", function () { setView("zukan"); });
    } else {
      btn("⭐ あそぶ", "main", function () { backTo = "zukan"; startPlay(c.id); });
      btn("とじる", "", function () { setView(backTo === "home" ? "home" : "zukan"); });
    }
    $("sheet").hidden = false; $("hud").hidden = true;
    $("sheet").querySelector(".sheet-card").scrollTop = 0;
  }
  function hideSheet() { $("sheet").hidden = true; $("hud").hidden = false; }
  function nextId(id) {
    var avail = LIST.filter(isUnlocked), i = avail.findIndex(function (x) { return x.id === id; });
    for (var k = 1; k <= avail.length; k++) { var c = avail[(i + k) % avail.length]; if (!isCleared(c.id)) return c.id; }
    return avail[(i + 1) % avail.length].id;
  }
  function updateZukanCount() {
    $("zukanCount").textContent = LIST.filter(function (c) { return isCleared(c.id); }).length;
    $("zukanAll").textContent = LIST.length;
  }

  function tonight() {
    var d = new Date(), h = d.getHours(), m = d.getMonth() + 1, shift = 0, label;
    if (h >= 17 || h < 5) {
      var hh = h < 12 ? h + 24 : h; shift = Math.round((hh - 20) / 2);
      label = "いま（よる " + (h % 12 === 0 ? 12 : h % 12) + "じ）";
    } else label = "こんや 8じごろ";
    var em = ((m - 1 + shift) % 12 + 12) % 12 + 1;
    return { label: label, month: m, list: window.SEIZA_TONIGHT[em] || [] };
  }
  function renderHome() {
    $("modeEasy").setAttribute("aria-pressed", save.mode === "easy");
    $("modeHard").setAttribute("aria-pressed", save.mode === "hard");
    var tn = tonight();
    $("tonightSub").textContent = tn.month + "がつ・" + tn.label + "・よこはまの そらで みえる せいざ";
    var tl = $("tonightList"); tl.innerHTML = "";
    tn.list.forEach(function (it) {
      var c = BY[it[0]]; if (!c) return;
      var b = document.createElement("button"); b.className = "tcard";
      b.appendChild(miniSvg(c, { lines: isCleared(c.id) }));
      b.insertAdjacentHTML("beforeend", '<span class="nm"><i>' + c.emoji + "</i>" + c.name + '</span><span class="dir">' + it[1] + "の そら</span>");
      b.addEventListener("click", function () { Snd.init(); backTo = "home"; startPlay(c.id); });
      tl.appendChild(b);
    });
    var gr = $("grid"); gr.innerHTML = "";
    LIST.forEach(function (c) { gr.appendChild(card(c, false)); });
  }
  function card(c, zukan) {
    var b = document.createElement("button"), cl = isCleared(c.id), un = isUnlocked(c), rec = save.cleared[c.id] || {};
    b.className = "card" + (cl ? " cleared" : "") + (!un ? " locked" : "") + (c.bonus ? " bonus" : "") + (zukan && !cl ? " unseen" : "");
    if (!un) {
      b.insertAdjacentHTML("beforeend", '<span class="emo">🔒</span><svg viewBox="0 0 100 100"><text x="50" y="62" font-size="46" text-anchor="middle" fill="rgba(234,240,255,.35)">？</text></svg>' +
        '<span class="nm">ボーナス<small>' + c.bonus.map(function (id) { return BY[id].name.replace("ざ", ""); }).join("・") + "を クリアすると でるよ</small></span>");
      b.disabled = false;
      b.addEventListener("click", function () { b.animate && b.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }], { duration: 250 }); });
      return b;
    }
    b.insertAdjacentHTML("beforeend", '<span class="emo">' + c.emoji + "</span>" + (cl ? '<span class="done">' + (rec.e ? "⭐" : "") + (rec.h ? "🌟" : "") + "</span>" : ""));
    b.appendChild(miniSvg(c, { lines: cl, art: zukan && cl, dim: zukan && !cl }));
    b.insertAdjacentHTML("beforeend", '<span class="nm">' + (zukan && !cl ? "？？？" : c.name) + (c.sub && (!zukan || cl) ? "<small>" + c.sub + "</small>" : "") + '</span><span class="meta">' + c.season + (zukan && !cl ? "・まだ" : "") + "</span>");
    b.addEventListener("click", function () {
      Snd.init();
      if (zukan && cl) { backTo = "zukan"; startPlay(c.id, { detail: true }); }
      else { backTo = zukan ? "zukan" : "home"; startPlay(c.id); }
    });
    return b;
  }
  function renderZukan() {
    var n = LIST.filter(function (c) { return isCleared(c.id); }).length;
    $("zukanSub").textContent = n + " / " + LIST.length + " せいざ とうろく。⭐＝かんたん 🌟＝むずかしい で クリア。";
    var z = $("zgrid"); z.innerHTML = "";
    LIST.forEach(function (c) { z.appendChild(card(c, true)); });
  }

  $("backBtn").addEventListener("click", function () { Snd.init(); if (view === "play") setView(backTo); else setView("home"); });
  $("zukanBtn").addEventListener("click", function () { Snd.init(); setView("zukan"); });
  $("soundBtn").addEventListener("click", function () {
    save.sound = !save.sound; persist(); syncSound(); Snd.setOn(save.sound); if (save.sound) Snd.tick();
  });
  function syncSound() { $("soundBtn").setAttribute("aria-pressed", save.sound); $("soundBtn").textContent = save.sound ? "🔊" : "🔇"; }
  $("modeEasy").addEventListener("click", function () { Snd.init(); save.mode = "easy"; persist(); renderHome(); Snd.tick(); });
  $("modeHard").addEventListener("click", function () { Snd.init(); save.mode = "hard"; persist(); renderHome(); Snd.tick(); });
  $("hintBtn").addEventListener("click", function () {
    if (!S || S.complete) return; S.hintUntil = performance.now() + 4000; $("hintBtn").setAttribute("aria-pressed", "true");
    say("うすい せんを なぞって みよう。", "💡");
  });
  $("retryBtn").addEventListener("click", function () { if (S) startPlay(S.c.id); });
  document.addEventListener("visibilitychange", function () { Snd.suspend(document.hidden); });
  window.addEventListener("resize", resize);
  document.addEventListener("pointerdown", function () { Snd.init(); }, { once: true });

  // テスト・デバッグ用（?play=orion / ?detail=orion）
  window.__seiza = { get S() { return S; }, start: startPlay, connect: function (a, b) { connect(a, b); }, setView: setView };

  syncSound(); updateZukanCount(); resize(); setView("home");
  try {
    var q = new URLSearchParams(location.search);
    if (q.get("play") && BY[q.get("play")]) startPlay(q.get("play"));
    if (q.get("detail") && BY[q.get("detail")]) startPlay(q.get("detail"), { detail: true });
  } catch (e) {}
  requestAnimationFrame(frame);
})();
