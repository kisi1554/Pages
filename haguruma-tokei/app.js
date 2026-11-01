/* はぐるま とけいだい — がめん */
(function () {
  'use strict';
  var G = window.Gear, D = window.STAGE_DATA, Sound = window.Sound;
  var STAGES = D.STAGES, CHAPTERS = D.CHAPTERS;
  var SAVE_KEY = 'haguruma-tokei-v1';
  var NS = 'http://www.w3.org/2000/svg';
  var COLORS = { 8: '#ff6b6b', 12: '#ff922b', 16: '#fcc419', 24: '#69db7c', 32: '#4dabf7', 48: '#b197fc' };

  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------------- ほぞん ---------------- */
  var save = { done: {}, sound: true };
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      var o = JSON.parse(raw);
      if (o && typeof o === 'object') {
        save.done = o.done && typeof o.done === 'object' ? o.done : {};
        save.sound = o.sound !== false;
      }
    }
  } catch (e) { /* よめなくても あそべる */ }
  function store() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても つづける */ }
  }
  Sound.on = save.sound;

  /* ---------------- がめん きりかえ ---------------- */
  function show(id) {
    ['title', 'select', 'play', 'ending'].forEach(function (s) { $(s).classList.toggle('hidden', s !== id); });
  }
  function syncSoundBtns() {
    Array.prototype.forEach.call(document.querySelectorAll('.btnSound'), function (b) {
      var t = b.classList.contains('pill') ? (save.sound ? '🔊 おと' : '🔇 おと') : (save.sound ? '🔊' : '🔇');
      b.textContent = t;
      b.setAttribute('aria-pressed', save.sound ? 'true' : 'false');
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('.btnSound'), function (b) {
    b.addEventListener('click', function () {
      save.sound = !save.sound;
      Sound.on = save.sound;
      store();
      syncSoundBtns();
      if (save.sound) { Sound.unlock(); Sound.click(); }
    });
  });
  syncSoundBtns();

  function unlocked(i) { return i === 0 || !!save.done[STAGES[i - 1].id] || !!save.done[STAGES[i].id]; }

  function renderSelect() {
    var box = $('chapters');
    box.innerHTML = '';
    CHAPTERS.forEach(function (c) {
      var d = document.createElement('div');
      d.className = 'chap';
      d.innerHTML = '<h3>' + c.icon + ' ' + c.no + '. ' + c.name + '</h3><p class="lesson">' + c.lesson + '</p>';
      var grid = document.createElement('div');
      grid.className = 'stageGrid';
      STAGES.filter(function (s) { return s.ch === c.no; }).forEach(function (s) {
        var b = document.createElement('button');
        var op = unlocked(s.index), dn = save.done[s.id];
        b.className = 'stBtn' + (dn ? ' done' : '') + (op ? '' : ' locked');
        b.setAttribute('data-stage', s.id);
        b.innerHTML = '<span class="no">' + s.id + '</span><span class="nm">' + s.title + '</span><span class="st">' +
          (dn === 2 ? '🌟' : dn ? '⭐' : op ? '' : '🔒') + '</span>';
        b.addEventListener('click', function () {
          if (!op) { toastSel(); return; }
          Sound.unlock();
          startStage(s.index);
        });
        grid.appendChild(b);
      });
      d.appendChild(grid);
      box.appendChild(d);
    });
  }
  function toastSel() { Sound.wrong(); }

  $('btnStart').addEventListener('click', function () {
    Sound.unlock(); Sound.click();
    renderSelect(); show('select');
  });
  $('btnSelBack').addEventListener('click', function () { show('title'); });
  $('btnBack').addEventListener('click', function () { stopAuto(); closeModal(); renderSelect(); show('select'); });
  $('btnEndBack').addEventListener('click', function () { renderSelect(); show('select'); });

  /* ---------------- あそぶ じょうたい ---------------- */
  var cur = null;     // { stage, gears, ev, ph, motor, turned, quiz, ... }
  var board = $('board');
  var layers = {};
  var VB = { x: 0, y: 0, w: 100, h: 100 };

  function maxTeeth(s) {
    var m = 8;
    Object.keys(s.shelf || {}).forEach(function (t) { m = Math.max(m, +t); });
    (s.fixed || []).concat(s.pre || []).forEach(function (f) { m = Math.max(m, f[2]); });
    return m;
  }

  function startStage(i) {
    var s = G.prepare(STAGES[i]);
    cur = {
      stage: s, gears: G.initial(s, true), motor: 0, turned: 0, judged: false, quiz: null,
      lockTurn: 0, tickIdx: null, hint: null,
    };
    var margin = G.radius(maxTeeth(s)) + G.MOD + 18;
    var xs = s._pinList.map(function (p) { return p.x; }), ys = s._pinList.map(function (p) { return p.y; });
    VB.x = Math.min.apply(null, xs) - margin; VB.y = Math.min.apply(null, ys) - margin;
    VB.w = Math.max.apply(null, xs) - VB.x + margin; VB.h = Math.max.apply(null, ys) - VB.y + margin + 14;
    board.setAttribute('viewBox', VB.x + ' ' + VB.y + ' ' + VB.w + ' ' + VB.h);
    $('stTitle').textContent = s.id + ' ' + s.title;
    $('quizBox').classList.add('hidden');
    $('shelf').classList.remove('hidden');
    show('play');
    closeModal();
    buildFace();
    refresh();
    setStatus('', '');
    goalText();
  }

  function goalDesc(s) {
    var g = s.goal;
    if (g.type === 'turn') return 'めあて: とけいの はりを まわそう';
    if (g.type === 'dir') return 'めあて: はりを ' + (g.dir > 0 ? 'みぎまわり ↻' : 'ひだりまわり ↺') + ' に';
    if (g.type === 'speed') {
      return 'めあて: ' + ratioWords(g.ratio) + (g.dir ? '（' + (g.dir > 0 ? 'みぎまわり ↻' : 'ひだりまわり ↺') + '）' : '');
    }
    return 'めあて: ちょうしんが 12かい まわると たんしんが 1かい（どちらも みぎ ↻）' +
      (g.minute && g.minute !== 1 ? '。ちょうしんは モーターの ' + g.minute + 'ばい' : g.minute === 1 ? '。ちょうしんは モーターと おなじ はやさ' : '');
  }
  function goalText() { $('goalText').innerHTML = goalDesc(cur.stage) + '<span class="intro"><br>' + cur.stage.intro + '</span>'; }

  /* ぶんすうに する（ぶんぼ 200 まで） */
  function frac(x) {
    x = Math.abs(x);
    for (var q = 1; q <= 200; q += 1) {
      var p = Math.round(x * q);
      if (p > 0 && Math.abs(p / q - x) < 1e-6) return [p, q];
    }
    return [Math.round(x * 100), 100];
  }
  function ratioWords(r) {
    var f = frac(r);
    if (f[1] === 1) return f[0] === 1 ? 'モーターと おなじ はやさ' : 'モーター 1かいで はりが ' + f[0] + 'かい（' + f[0] + 'ばい）';
    if (f[0] === 1) return 'モーターが ' + f[1] + 'かい まわると はりが 1かい';
    return 'モーターが ' + f[1] + 'かい まわると はりが ' + f[0] + 'かい';
  }
  function speedShort(s) {
    if (!s) return 'とまってる';
    var f = frac(s);
    var dir = s > 0 ? 'みぎ ↻' : 'ひだり ↺';
    return dir + ' ' + (f[1] === 1 ? '×' + f[0] : f[0] + '/' + f[1]);
  }

  /* ---------------- ばんめんを かく ---------------- */
  var pathCache = {};
  function gearShape(t, parent, cls, color) {
    var g = el('g', { 'class': 'rot' }, parent);
    if (!pathCache[t]) pathCache[t] = G.gearPath(t);
    el('path', { d: pathCache[t], 'class': 'gearBody', fill: color || COLORS[t] }, g);
    var r = G.radius(t);
    if (t >= 24) {
      var holes = t >= 48 ? 6 : t >= 32 ? 5 : 4, hr = r * 0.2;
      for (var k = 0; k < holes; k += 1) {
        var a = (k / holes) * Math.PI * 2;
        el('circle', { cx: (Math.cos(a) * r * 0.56).toFixed(1), cy: (Math.sin(a) * r * 0.56).toFixed(1), r: hr.toFixed(1), 'class': 'gearHole' }, g);
      }
    } else {
      el('rect', { x: -r * 0.55, y: -2, width: r * 1.1, height: 4, rx: 2, 'class': 'gearHole' }, g);
    }
    el('circle', { r: Math.max(7, r * 0.18), 'class': 'gearHub' }, g);
    return g;
  }

  function refresh() {
    var s = cur.stage;
    cur.ev = G.evaluate(s, cur.gears);
    cur.ph = G.phases(s, cur.gears, cur.ev);
    cur.turned = 0; cur.judged = false; cur.lockTurn = 0;
    drawBoard();
    renderShelf();
    updateFrame();
  }

  function drawBoard() {
    var s = cur.stage;
    board.innerHTML = '';
    layers.pins = el('g', null, board);
    layers.l0 = el('g', null, board);
    layers.l1 = el('g', null, board);
    layers.top = el('g', null, board);
    layers.hint = el('g', null, board);
    layers.prev = el('g', null, board);
    cur.pinRing = {};
    s._pinList.forEach(function (p) {
      if (p.kind === 'motor') {
        el('rect', { x: p.x - 26, y: p.y - 26, width: 52, height: 52, rx: 10, 'class': 'motorBox' }, layers.pins);
      }
      cur.pinRing[p.id] = el('circle', { cx: p.x, cy: p.y, r: 16, 'class': 'pinRing' }, layers.pins);
      el('circle', { cx: p.x, cy: p.y, r: 6, 'class': 'pin' }, layers.pins);
    });
    cur.gEls = cur.gears.map(function (g, i) {
      var p = s._pins[g.pin];
      var cls = 'gear l' + g.layer + (g.fixed ? ' fixedG' : '') + (cur.ev.driven[i] ? ' drv' : '') + (cur.justPlaced === i ? ' pop' : '');
      var wrap = el('g', { transform: 'translate(' + p.x + ' ' + p.y + ')' }, g.layer ? layers.l1 : layers.l0);
      var ge = el('g', { 'class': cls }, wrap);
      var rot = gearShape(g.teeth, ge);
      var t = el('text', { 'class': 'gearNum', y: 0 }, ge);
      t.textContent = g.teeth;
      if (g.layer === 0 && cur.gears.some(function (h) { return h.pin === g.pin && h.layer === 1; })) t.setAttribute('visibility', 'hidden');
      return { wrap: wrap, g: ge, rot: rot };
    });
    cur.justPlaced = null;
    // ロック して いる はぐるま
    if (cur.showLock) markLock();
    // はり と ラベル
    cur.hands = [];
    var outs = s.out;
    Object.keys(outs).forEach(function (k) {
      var p = s._pins[outs[k]];
      var len = k === 'hour' ? 34 : 52, w = k === 'hour' ? 9 : 6;
      var hg = el('g', { transform: 'translate(' + p.x + ' ' + p.y + ')' }, layers.top);
      var rg = el('g', null, hg);
      el('line', { x1: 0, y1: 8, x2: 0, y2: -len, 'class': 'handBar', 'stroke-width': w, stroke: k === 'hour' ? '#c92a2a' : k === 'minute' ? '#212529' : '#1c7ed6' }, rg);
      el('path', { d: 'M -9 ' + (-len + 6) + ' L 0 ' + (-len - 8) + ' L 9 ' + (-len + 6) + ' Z', fill: k === 'hour' ? '#c92a2a' : k === 'minute' ? '#212529' : '#1c7ed6' }, rg);
      el('circle', { r: 7, 'class': 'handCap' }, hg);
      cur.hands.push({ key: k, pin: outs[k], rot: rg });
    });
    // モーターの ゼンマイ
    var mp = s._pins[s._motor];
    var mg = el('g', { transform: 'translate(' + mp.x + ' ' + mp.y + ')' }, layers.top);
    cur.spring = el('g', null, mg);
    if (!outs.minute || outs.minute !== s._motor) {
      el('path', { d: 'M0 0 m0 -3 a3 3 0 1 1 -0.1 0 m0 -3 a6 6 0 1 1 -0.1 0', fill: 'none', stroke: '#fff', 'stroke-width': 2.4 }, cur.spring);
    }
    // ラベル
    s._pinList.forEach(function (p) {
      var lab = null;
      if (p.kind === 'motor') lab = 'モーター';
      if (outs.hand === p.id) lab = 'はり';
      if (outs.minute === p.id) lab = (lab ? lab + '・' : '') + 'ちょうしん';
      if (outs.hour === p.id) lab = 'たんしん';
      if (!lab) return;
      var t = el('text', { x: p.x, y: p.y + 36, 'class': 'pinLab' }, layers.top);
      t.textContent = lab;
    });
    drawHint();
  }

  function markLock() {
    var bad = {};
    cur.ev.lockPairs.forEach(function (pr) { bad[pr[0]] = 1; bad[pr[1]] = 1; });
    // わ ぜんたい: うごく はぐるま ぜんぶ を うすく、むじゅん した ところ を あかく
    cur.gEls.forEach(function (e, i) { if (bad[i]) e.g.classList.add('locked'); });
  }

  function angleOf(i) {
    var g = cur.gears[i];
    var sp = cur.ev.locked ? 0 : (cur.ev.speed[g.pin] || 0);
    return cur.ph[i] * 180 / Math.PI + sp * cur.motor;
  }
  function pinSpeed(pin) { return cur.ev.locked ? 0 : (cur.ev.speed[pin] || 0); }

  function updateFrame() {
    if (!cur || !cur.gEls) return;
    cur.gEls.forEach(function (e, i) { e.rot.setAttribute('transform', 'rotate(' + angleOf(i).toFixed(2) + ')'); });
    var base = cur.quiz ? cur.quiz.m0 : 0;
    cur.hands.forEach(function (h) {
      var a = pinSpeed(h.pin) * (cur.motor - base) + (cur.quiz ? cur.quiz.off[h.key] || 0 : 0);
      h.rot.setAttribute('transform', 'rotate(' + a.toFixed(2) + ')');
    });
    cur.spring.setAttribute('transform', 'rotate(' + cur.motor.toFixed(2) + ')');
    $('crankArm').setAttribute('transform', 'rotate(' + cur.motor.toFixed(2) + ')');
    updateFace();
  }

  /* ---------------- もじばん ---------------- */
  var faceHands = {};
  function buildFace() {
    var f = $('face');
    f.innerHTML = '';
    el('circle', { r: 56, 'class': 'faceBg' }, f);
    for (var k = 0; k < 12; k += 1) {
      var a = k * Math.PI / 6, r1 = k % 3 === 0 ? 40 : 45;
      el('line', { x1: Math.sin(a) * r1, y1: -Math.cos(a) * r1, x2: Math.sin(a) * 50, y2: -Math.cos(a) * 50, 'class': 'faceTick' }, f);
    }
    [[12, 0], [3, 90], [6, 180], [9, 270]].forEach(function (n) {
      var a = n[1] * Math.PI / 180;
      var t = el('text', { x: Math.sin(a) * 30, y: -Math.cos(a) * 30, 'class': 'faceNum' }, f);
      t.textContent = n[0];
    });
    faceHands = {};
    var outs = cur.stage.out;
    if (outs.hour) faceHands.hour = el('line', { x1: 0, y1: 6, x2: 0, y2: -28, 'class': 'faceHand hour' }, f);
    if (outs.minute) faceHands.minute = el('line', { x1: 0, y1: 8, x2: 0, y2: -46, 'class': 'faceHand min' }, f);
    if (outs.hand) faceHands.hand = el('line', { x1: 0, y1: 8, x2: 0, y2: -44, 'class': 'faceHand one' }, f);
    el('circle', { r: 5, fill: '#212529' }, f);
  }
  function updateFace() {
    var base = cur.quiz ? cur.quiz.m0 : 0;
    Object.keys(faceHands).forEach(function (k) {
      var a = pinSpeed(cur.stage.out[k]) * (cur.motor - base) + (cur.quiz ? cur.quiz.off[k] || 0 : 0);
      faceHands[k].setAttribute('transform', 'rotate(' + a.toFixed(2) + ')');
    });
  }

  /* ---------------- たな ---------------- */
  function remaining() {
    var inv = G.inventory(cur.stage);
    cur.gears.forEach(function (g) { if (!g.fixed) inv[g.teeth] -= 1; });
    return inv;
  }
  function shelfIcon(t, size) {
    var svg = document.createElementNS(NS, 'svg');
    var R = G.radius(t) + G.MOD + 1;
    svg.setAttribute('viewBox', (-R) + ' ' + (-R) + ' ' + 2 * R + ' ' + 2 * R);
    svg.setAttribute('width', size); svg.setAttribute('height', size);
    var g = el('g', { 'class': 'gear l1' }, svg);
    gearShape(t, g);
    return svg;
  }
  function iconSize(t) { return Math.round(22 + Math.sqrt(t) * 5); }
  function renderShelf() {
    var sh = $('shelf');
    sh.innerHTML = '';
    var inv = remaining();
    var ts = Object.keys(inv).map(Number).sort(function (a, b) { return a - b; });
    if (!ts.length) {
      var e = document.createElement('div');
      e.className = 'empty';
      e.textContent = 'たなは からっぽ。ばんの はぐるまを ドラッグで うごかせるよ';
      sh.appendChild(e);
      return;
    }
    ts.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'sItem' + (inv[t] > 0 ? '' : ' zero');
      b.setAttribute('data-teeth', t);
      b.setAttribute('aria-label', 'は ' + t + ' の はぐるま ' + inv[t] + 'まい');
      b.appendChild(shelfIcon(t, iconSize(t)));
      var l = document.createElement('span'); l.className = 'lab'; l.textContent = 'は' + t; b.appendChild(l);
      var c = document.createElement('span'); c.className = 'cnt'; c.textContent = '×' + inv[t]; b.appendChild(c);
      b.addEventListener('pointerdown', function (ev) {
        if (cur.quiz) return;
        Sound.unlock();
        if (remaining()[t] <= 0) { toast('もう ないよ'); return; }
        ev.preventDefault();
        beginDrag({ teeth: t, from: -1 }, ev);
      });
      sh.appendChild(b);
    });
  }

  /* ---------------- ドラッグ ---------------- */
  var drag = null;
  var ghost = $('ghost');
  function toBoard(cx, cy) {
    var m = board.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    var pt = board.createSVGPoint();
    pt.x = cx; pt.y = cy;
    var r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  }
  function scalePx() { var m = board.getScreenCTM(); return m ? m.a : 1; }

  function beginDrag(d, ev) {
    stopAuto();
    drag = d;
    drag.id = ev.pointerId;
    drag.sx = ev.clientX; drag.sy = ev.clientY;
    drag.moved = d.from < 0;
    drag.snap = null;
    if (d.from < 0) startGhost();
    window.addEventListener('pointermove', onDragMove, { passive: false });
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('pointercancel', onDragCancel);
    if (d.from < 0) moveGhost(ev.clientX, ev.clientY);
  }
  function startGhost() {
    var t = drag.teeth;
    ghost.innerHTML = '';
    var px = (G.radius(t) + G.MOD + 1) * 2 * scalePx();
    var svg = shelfIcon(t, Math.max(px, 30));
    ghost.appendChild(svg);
    ghost.style.width = ghost.style.height = Math.max(px, 30) + 'px';
    ghost.classList.remove('hidden');
    drag.ghostR = Math.max(px, 30) / 2;
    if (drag.from >= 0) {
      // ばんから もちあげた
      drag.orig = cur.gears[drag.from];
      cur.gears.splice(drag.from, 1);
      refresh();
      Sound.pop();
    }
  }
  function moveGhost(x, y) {
    // ゆびで かくれない ように すこし うえに
    var lift = (drag.pointerType === 'mouse') ? 0 : 0;
    ghost.style.transform = 'translate(' + (x - drag.ghostR) + 'px,' + (y - drag.ghostR - lift) + 'px)';
  }
  function findSnap(bp) {
    var s = cur.stage, best = null, bd = Infinity;
    var lim = Math.max(46, 34 / scalePx());
    s._pinList.forEach(function (p) {
      var d = Math.hypot(p.x - bp.x, p.y - bp.y);
      if (d < bd && d <= lim) { bd = d; best = p; }
    });
    return best;
  }
  function onDragMove(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    ev.preventDefault();
    if (!drag.moved) {
      if (Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) < 10) return;
      drag.moved = true;
      startGhost();
    }
    moveGhost(ev.clientX, ev.clientY);
    var bp = toBoard(ev.clientX, ev.clientY);
    var p = findSnap(bp);
    layers.prev.innerHTML = '';
    Object.keys(cur.pinRing).forEach(function (k) { cur.pinRing[k].classList.remove('snap'); });
    drag.snap = null;
    if (p) {
      var layer = G.autoLayer(cur.stage, cur.gears, p.id, drag.teeth, cur.ev);
      var okk = layer !== null;
      drag.snap = { pin: p.id, layer: okk ? layer : 0, ok: okk };
      cur.pinRing[p.id].classList.add('snap');
      var w = el('g', { transform: 'translate(' + p.x + ' ' + p.y + ')' }, layers.prev);
      var pg = el('g', { 'class': 'gear preview' + (okk ? '' : ' bad') }, w);
      gearShape(drag.teeth, pg);
      ghost.style.opacity = '0.25';
    } else {
      ghost.style.opacity = '';
    }
  }
  function cleanupDrag() {
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    window.removeEventListener('pointercancel', onDragCancel);
    ghost.classList.add('hidden');
    ghost.style.opacity = '';
    if (layers.prev) layers.prev.innerHTML = '';
    if (cur && cur.pinRing) Object.keys(cur.pinRing).forEach(function (k) { cur.pinRing[k].classList.remove('snap'); });
  }
  function onDragCancel(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var d = drag; drag = null;
    cleanupDrag();
    if (d.orig) { cur.gears.push(d.orig); refresh(); }
  }
  function onDragEnd(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var d = drag; drag = null;
    cleanupDrag();
    if (!d.moved) { tapGear(d.from); return; }
    if (d.snap && d.snap.ok) {
      place(d.snap.pin, d.snap.layer, d.teeth);
    } else if (d.snap) {
      var why = whyNot(d.snap.pin, d.teeth);
      Sound.bump();
      toast(why);
      if (d.orig) { cur.gears.push(d.orig); refresh(); }
    } else if (d.orig) {
      // たなに もどす
      cur.hint = null;
      refresh();
      setStatus('', '');
    }
  }
  function whyNot(pin, teeth) {
    var on = cur.gears.filter(function (h) { return h.pin === pin; });
    if (on.length >= 2) return 'この ピンは もう いっぱい（2まい まで）';
    return 'ほかの はぐるまに ぶつかっちゃう！';
  }
  function place(pin, layer, teeth) {
    cur.gears.push({ pin: pin, layer: layer, teeth: teeth });
    cur.justPlaced = cur.gears.length - 1;
    cur.showLock = false;
    Sound.click();
    if (cur.hint && cur.hint.pin === pin) cur.hint = null;
    refresh();
    setStatus(layer === 1 ? 'てまえに かさねたよ' : '', '');
  }
  function placeAt(pin, teeth) {
    var layer = G.autoLayer(cur.stage, cur.gears, pin, teeth, cur.ev);
    if (layer === null) return false;
    place(pin, layer, teeth);
    return true;
  }

  /* タップ: おく ⇔ てまえ を いれかえる */
  function tapGear(i) {
    var g = cur.gears[i];
    if (!g) return;
    var others = cur.gears.filter(function (h, k) { return k !== i; });
    var mate = others.filter(function (h) { return h.pin === g.pin; })[0];
    var s = cur.stage;
    if (mate) {
      if (mate.fixed) { toast('この はぐるまは うごかせないよ'); return; }
      var a = { pin: g.pin, layer: 1 - g.layer, teeth: g.teeth }, b = { pin: mate.pin, layer: 1 - mate.layer, teeth: mate.teeth };
      var rest = others.filter(function (h) { return h !== mate; });
      if (G.canPlace(s, rest, a.pin, a.layer, a.teeth).ok && G.canPlace(s, rest.concat([a]), b.pin, b.layer, b.teeth).ok) {
        g.layer = a.layer; mate.layer = b.layer;
        Sound.click(); refresh(); setStatus('おくと てまえを いれかえたよ', '');
      } else { Sound.bump(); toast('いれかえると ぶつかっちゃう'); }
      return;
    }
    var nl = 1 - g.layer;
    if (G.canPlace(s, others, g.pin, nl, g.teeth).ok) {
      g.layer = nl;
      Sound.click(); refresh();
      setStatus(nl ? 'てまえに うごかしたよ' : 'おくに うごかしたよ', '');
    } else { Sound.bump(); toast('そこだと ぶつかっちゃう'); }
  }

  function pickGear(bp) {
    var best = -1, bestScore = Infinity;
    cur.gears.forEach(function (g, i) {
      var p = cur.stage._pins[g.pin];
      var d = Math.hypot(p.x - bp.x, p.y - bp.y);
      var r = Math.max(G.radius(g.teeth) + G.MOD, 26);
      if (d > r) return;
      var score = (g.layer ? 0 : 1000) + d / r;
      if (score < bestScore) { bestScore = score; best = i; }
    });
    return best;
  }
  board.addEventListener('pointerdown', function (ev) {
    if (!cur || cur.quiz || drag) return;
    Sound.unlock();
    var bp = toBoard(ev.clientX, ev.clientY);
    var i = pickGear(bp);
    if (i < 0) return;
    ev.preventDefault();
    if (cur.gears[i].fixed) { Sound.bump(); toast('ねじで とめて ある。うごかせないよ'); return; }
    beginDrag({ teeth: cur.gears[i].teeth, from: i }, ev);
  });

  /* ---------------- ハンドル ---------------- */
  var crank = $('crank'), crankDrag = null;
  function crankAngle(ev) {
    var r = crank.getBoundingClientRect();
    return Math.atan2(ev.clientY - (r.top + r.height / 2), ev.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
  }
  crank.addEventListener('pointerdown', function (ev) {
    if (!cur || drag) return;
    ev.preventDefault();
    Sound.unlock();
    stopAuto();
    crankDrag = { id: ev.pointerId, a: crankAngle(ev), back: 0 };
    crank.classList.add('active');
    try { crank.setPointerCapture(ev.pointerId); } catch (e) { /* なくても よい */ }
  });
  crank.addEventListener('pointermove', function (ev) {
    if (!crankDrag || ev.pointerId !== crankDrag.id) return;
    ev.preventDefault();
    var a = crankAngle(ev), d = a - crankDrag.a;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    crankDrag.a = a;
    if (Math.abs(d) > 60) return;
    if (d < 0 && !cur.quiz) {
      crankDrag.back += d;
      if (crankDrag.back < -25) { crankDrag.back = 0; Sound.ratchet(); setStatus('ハンドルは みぎまわり ↻ だけ だよ', ''); }
      return;
    }
    turn(d);
  });
  function endCrank(ev) {
    if (!crankDrag || ev.pointerId !== crankDrag.id) return;
    crankDrag = null;
    crank.classList.remove('active');
    afterTurn(true);
  }
  crank.addEventListener('pointerup', endCrank);
  crank.addEventListener('pointercancel', endCrank);

  var auto = null;
  function runAuto(deg, ms, done) {
    stopAuto();
    var t0 = performance.now(), last = 0;
    auto = { raf: 0 };
    function step(now) {
      var k = Math.min(1, (now - t0) / ms);
      var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      var v = e * deg;
      turn(v - last);
      last = v;
      if (k < 1 && auto) auto.raf = requestAnimationFrame(step);
      else { auto = null; if (done) done(); }
    }
    auto.raf = requestAnimationFrame(step);
  }
  function stopAuto() { if (auto) { cancelAnimationFrame(auto.raf); auto = null; } }
  $('btnGo').addEventListener('click', function () {
    if (!cur) return;
    Sound.unlock();
    var deg = cur.quiz ? 360 : Math.max(360, 380 - cur.turned);
    runAuto(deg, 1700, function () { afterTurn(true); });
  });

  var lastTick = 0, lastGrind = 0;
  function turn(d) {
    if (!cur || !d) return;
    if (cur.ev.locked) {
      cur.lockTurn += Math.abs(d);
      var now = performance.now();
      if (now - lastGrind > 450) {
        lastGrind = now;
        Sound.grind();
        board.classList.remove('board-shake');
        void board.getBoundingClientRect();
        board.classList.add('board-shake');
      }
      if (cur.lockTurn > 60 && !cur.showLock) {
        cur.showLock = true;
        markLock();
        setStatus('ぎしぎし！ うごかない…。ぐるっと わに なって ひっぱりあって いる はぐるまが あるよ', 'ng');
      }
      return;
    }
    cur.motor += d;
    cur.turned += Math.abs(d);
    updateFrame();
    // こちこち: はりが 30ど すすむ ごとに（はりが うごかない ときは モーターで 90ど ごと）
    var key = cur.stage.out.hand || cur.stage.out.minute;
    var sp = pinSpeed(key);
    var idx = sp ? Math.floor(sp * cur.motor / 30) : Math.floor(cur.motor / 90);
    if (cur.tickIdx === null) cur.tickIdx = idx;
    if (idx !== cur.tickIdx) {
      cur.tickIdx = idx;
      var now2 = performance.now();
      if (now2 - lastTick > 45) { lastTick = now2; Sound.tick(idx % 2 === 0); }
    }
    if (!cur.quiz && !cur.judged) liveStatus();
    if (!cur.quiz && cur.turned >= 360 && !cur.judged) afterTurn(false);
  }
  function liveStatus() {
    var s = cur.stage;
    if (s.goal.type === 'clock') {
      setStatus('ちょうしん: ' + speedShort(pinSpeed(s.out.minute)) + '　たんしん: ' + speedShort(pinSpeed(s.out.hour)), '');
    } else {
      setStatus('はり: ' + speedShort(pinSpeed(s.out.hand)), '');
    }
  }

  function afterTurn(released) {
    if (!cur || cur.quiz || cur.judged || cur.ev.locked) return;
    if (cur.turned < 360) {
      if (released && cur.turned > 0) setStatus('もっと まわそう（ぐるっと 1しゅう）', '');
      return;
    }
    cur.judged = true;
    var j = G.judge(cur.stage, cur.gears, cur.ev);
    if (j.ok) { onClear(); return; }
    Sound.wrong();
    setStatus(failText(j), 'ng');
  }
  function failText(j) {
    var s = cur.stage;
    switch (j.code) {
      case 'still': return 'はりが まわって いないよ。モーターから はりの ピンまで はぐるまを つなごう';
      case 'dir': return 'はりが ' + (j.s > 0 ? 'みぎ' : 'ひだり') + 'まわりに なっちゃった。あいだの はぐるまの かずを かえてみよう';
      case 'speed': return 'いまは「' + ratioWords(Math.abs(j.s)) + '」。めあては「' + ratioWords(s.goal.ratio) + '」';
      case 'still-minute': return 'ちょうしんが まわって いないよ';
      case 'dir-minute': return 'ちょうしんが ひだりまわり！ みぎまわりに しよう';
      case 'speed-minute': return 'ちょうしんの はやさが ちがうよ（いまは モーターの ' + speedShort(j.sm) + '）';
      case 'still-hour': return 'たんしんが まわって いないよ。たんしんの ピンまで つなごう';
      case 'dir-hour': return 'たんしんが ひだりまわり！ みぎまわりに しよう';
      case 'ratio':
        var f = frac(j.sm / j.sh);
        return 'いまは ちょうしんが ' + (f[1] === 1 ? f[0] : (f[0] / f[1]).toFixed(1)) + 'かい まわると たんしんが 1かい。めあては 12かい';
      default: return 'もう すこし！';
    }
  }

  function setStatus(t, cls) {
    var e = $('status');
    e.textContent = t;
    e.className = 'status' + (cls ? ' ' + cls : '');
  }
  var toastT = 0;
  function toast(t) {
    var e = $('toast');
    e.textContent = t;
    e.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { e.classList.remove('show'); }, 1800);
  }

  /* ---------------- ヒント ---------------- */
  function sameG(a, b) { return a.pin === b[0] && a.layer === b[1] && a.teeth === b[2]; }
  function computeHint() {
    var s = cur.stage, sol = s.sol;
    var gs = cur.gears.filter(function (g) { return !g.fixed; });
    // ちがう はぐるまが こたえの ばしょに ある
    for (var i = 0; i < gs.length; i += 1) {
      var g = gs[i];
      var want = sol.filter(function (w) { return w[0] === g.pin && w[1] === g.layer; })[0];
      if (want && want[2] !== g.teeth) return { type: 'swap', pin: g.pin, teeth: want[2], have: g.teeth };
    }
    // こたえに ない ばしょの はぐるま（じゃまを して いる かも）
    var extra = gs.filter(function (g) { return !sol.some(function (w) { return w[0] === g.pin && w[1] === g.layer; }); });
    var missing = sol.filter(function (w) { return !gs.some(function (g) { return sameG(g, w); }); });
    if (extra.length && (cur.ev.locked || !missing.length)) return { type: 'remove', pin: extra[0].pin, teeth: extra[0].teeth };
    if (missing.length) return { type: 'put', pin: missing[0][0], teeth: missing[0][2], layer: missing[0][1] };
    if (extra.length) return { type: 'remove', pin: extra[0].pin, teeth: extra[0].teeth };
    return { type: 'turn' };
  }
  function drawHint() {
    if (!layers.hint) return;
    layers.hint.innerHTML = '';
    var h = cur.hint;
    if (!h || !h.pin) return;
    var p = cur.stage._pins[h.pin];
    if (h.type === 'put' || h.type === 'swap') {
      var w = el('g', { transform: 'translate(' + p.x + ' ' + p.y + ')' }, layers.hint);
      var g = el('g', { 'class': 'gear hintG' }, w);
      gearShape(h.teeth, g);
    } else {
      el('circle', { cx: p.x, cy: p.y, r: G.radius(h.teeth) + G.MOD + 6, 'class': 'hintX' }, layers.hint);
    }
  }
  $('btnHint').addEventListener('click', function () {
    if (!cur || cur.quiz) return;
    Sound.unlock();
    var h = computeHint();
    cur.hint = h;
    drawHint();
    var t = {
      put: 'ヒント: ひかって いる ピンに「は' + h.teeth + '」を ' + (h.layer ? 'かさねて ' : '') + 'さしてみよう',
      swap: 'ヒント: ひかって いる「は' + h.have + '」を「は' + h.teeth + '」に とりかえてみよう',
      remove: 'ヒント: ひかって いる はぐるまを はずしてみよう（たなへ ドラッグ）',
      turn: 'ヒント: ハンドルを ぐるっと 1しゅう まわしてみよう',
    }[h.type];
    setStatus(t, '');
  });
  $('btnReset').addEventListener('click', function () {
    if (!cur) return;
    stopAuto();
    var i = cur.stage.index;
    startStage(i);
    Sound.pop();
  });

  /* ---------------- クリア ---------------- */
  function usedCount() { return cur.gears.filter(function (g) { return !g.fixed; }).length; }
  function onClear() {
    Sound.ok();
    setStatus('うごいた！ ばっちり！', 'ok');
    if (cur.stage.quiz) { setTimeout(startQuiz, 700); return; }
    setTimeout(finishStage, 600);
  }
  var TIPS = {
    1: 'となりあう はぐるまは ぎゃくむき。あいだに 1こ いれると おなじ むきに なるよ。',
    2: 'は の かずの わりあいで はやさが きまる。あいだの はぐるまは はやさを かえない！',
    3: 'おなじ じくの 2まいは いっしょに まわる。わりあいを かけざん できるよ。',
    4: 'ほんものの とけいも はぐるまで ちょうしんと たんしんを 12:1 に して いるよ。',
  };
  function finishStage() {
    var s = cur.stage;
    var n = usedCount(), star = n <= s.par ? 2 : 1;
    var prev = save.done[s.id] || 0;
    if (star > prev) { save.done[s.id] = star; store(); }
    Sound.clear();
    var last = s.index === STAGES.length - 1;
    var body = '<div class="stars">' + (star === 2 ? '🌟' : '⭐') + '</div>' +
      'つかった はぐるま ' + n + 'まい' + (star === 2 ? '（いちばん すくない！）' : '（' + s.par + 'まいで できるよ）') +
      '<div class="tip">' + TIPS[s.ch] + '</div>';
    var btns = [];
    if (last) btns.push({ t: 'とけいだいの かねを ならす 🔔', main: true, f: ending });
    else btns.push({ t: 'つぎへ ▶', main: true, f: function () { startStage(s.index + 1); } });
    btns.push({ t: 'もういちど', f: function () { startStage(s.index); } });
    btns.push({ t: 'ステージ えらび', f: function () { closeModal(); renderSelect(); show('select'); } });
    openModal('🎉', 'クリア！', body, btns);
  }

  /* ---------------- じこく あわせ クイズ ---------------- */
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function timeWords(T) {
    var h = Math.floor(T / 60) % 12, m = T % 60;
    var hh = h === 0 ? 12 : h;
    if (m === 0) return hh + 'じ';
    if (m === 30) return hh + 'じ はん';
    return hh + 'じ ' + m + 'ふん';
  }
  function startQuiz() {
    var s = cur.stage;
    var T;
    if (s.quiz === 'hour') T = randInt(1, 11) * 60;
    else if (s.quiz === 'half') T = randInt(1, 11) * 60 + (Math.random() < 0.7 ? 30 : 0);
    else T = randInt(1, 11) * 60 + randInt(1, 11) * 5;
    cur.quiz = { target: T, m0: cur.motor, off: { minute: 0, hour: 0 }, miss: 0 };
    stopAuto();
    $('shelf').classList.add('hidden');
    $('quizBox').classList.remove('hidden');
    $('quizText').textContent = '「' + timeWords(T) + '」に しよう';
    updateFrame();
    openModal('🕰️', 'とけいが うごいた！', 'つぎは じこく あわせ。<br>ハンドルを まわして<br><b style="font-size:1.3em">「' + timeWords(T) + '」</b><br>に あわせて「できた！」を おしてね。<div class="tip">ハンドルは ぎゃくにも まわせるよ。「5ふん」ボタンでも うごく。</div>',
      [{ t: 'やってみる', main: true, f: closeModal }]);
    setStatus('いまは 12じ。ちょうしんを うごかして あわせよう', '');
  }
  function quizMinutes() {
    var sm = pinSpeed(cur.stage.out.minute);
    return sm * (cur.motor - cur.quiz.m0) / 6;   // 1ぷん = 6ど
  }
  function nowT() {
    var t = Math.round(quizMinutes());
    return ((t % 720) + 720) % 720;
  }
  function nudge(min) {
    if (!cur || !cur.quiz) return;
    var sm = pinSpeed(cur.stage.out.minute);
    // 5ふん きざみに そろえる
    var t = quizMinutes(), goal = Math.round((t + min) / 5) * 5;
    if (Math.abs(goal - t) < 0.01) goal += min;
    runAuto((goal - t) * 6 / sm, 260);
  }
  $('qPlus').addEventListener('click', function () { nudge(5); });
  $('qMinus').addEventListener('click', function () { nudge(-5); });
  $('qOk').addEventListener('click', function () {
    if (!cur || !cur.quiz) return;
    var T = nowT(), want = cur.quiz.target % 720;
    var diff = Math.abs(T - want); diff = Math.min(diff, 720 - diff);
    if (diff <= 2) {
      Sound.ok();
      setStatus('ぴったり「' + timeWords(want) + '」！', 'ok');
      cur.quiz = null;
      setTimeout(finishStage, 500);
      return;
    }
    cur.quiz.miss += 1;
    Sound.wrong();
    var tip = '';
    if (Math.floor(T / 60) % 12 !== Math.floor(want / 60) % 12 && cur.quiz.miss >= 1) tip = ' たんしん（みじかい はり）で「なんじ」を みるよ。';
    if (T % 60 !== want % 60) tip += ' ちょうしん（ながい はり）が ' + (want % 60 === 0 ? '12' : want % 60 === 30 ? '6' : (want % 60) / 5) + ' を さすと「' + (want % 60 === 0 ? 'ちょうど' : want % 60 === 30 ? 'はん' : (want % 60) + 'ふん') + '」。';
    setStatus('いまは「' + timeWords(T) + '」だよ。' + tip, 'ng');
  });

  /* ---------------- エンディング ---------------- */
  function ending() {
    closeModal();
    show('ending');
    Sound.bell(0); Sound.bell(2.2); Sound.bell(4.4);
  }

  /* ---------------- まど ---------------- */
  function openModal(icon, title, body, btns) {
    $('mIcon').textContent = icon;
    $('mTitle').textContent = title;
    $('mBody').innerHTML = body;
    var b = $('mBtns');
    b.innerHTML = '';
    btns.forEach(function (x) {
      var e = document.createElement('button');
      e.textContent = x.t;
      if (x.main) e.className = 'main';
      e.addEventListener('click', function () { Sound.click(); x.f(); });
      b.appendChild(e);
    });
    $('modal').classList.remove('hidden');
  }
  function closeModal() { $('modal').classList.add('hidden'); }

  /* ---------------- テスト よう ---------------- */
  window.HagurumaDebug = {
    stages: function () { return STAGES.map(function (s) { return s.id; }); },
    start: function (id) { var s = STAGES.filter(function (x) { return x.id === id; })[0]; startStage(s.index); },
    state: function () {
      if (!cur) return null;
      var j = G.judge(cur.stage, cur.gears, cur.ev);
      return {
        id: cur.stage.id, gears: cur.gears.map(function (g) { return [g.pin, g.layer, g.teeth, !!g.fixed]; }),
        locked: cur.ev.locked, judge: j.code, motor: cur.motor, turned: cur.turned,
        quiz: cur.quiz ? { target: cur.quiz.target, now: nowT() } : null,
        status: $('status').textContent, modal: !$('modal').classList.contains('hidden'),
        done: save.done,
      };
    },
    pinScreen: function (pin) {
      var p = cur.stage._pins[pin];
      var m = board.getScreenCTM(), pt = board.createSVGPoint();
      pt.x = p.x; pt.y = p.y;
      var r = pt.matrixTransform(m);
      return { x: r.x, y: r.y };
    },
    place: placeAt,
    clearGears: function () { cur.gears = G.initial(cur.stage, false); refresh(); },
    turn: function (d) { turn(d); afterTurn(true); },
    setQuizTime: function (T) {
      var sm = pinSpeed(cur.stage.out.minute);
      cur.motor = cur.quiz.m0 + T * 6 / sm; updateFrame();
    },
    reset: function () { save.done = {}; store(); },
  };
})();
