/* にょこすけ レース
 * にょこすけ（いもむし）と おともだち 3びきの かけっこ。
 * え は ぜんぶ canvas に その場で かく。おとは WebAudio の ごうせいおん だけ。
 */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;

  /* ================= ほぞん ================= */
  const KEY = 'nyoko-race.v1';
  const DEF = { sound: true, diff: 'easy', best: {}, medal: {}, races: 0, wins: 0 };
  let save = load();
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || '{}');
      return Object.assign({}, DEF, o, { best: o.best || {}, medal: o.medal || {} });
    } catch (e) {
      return Object.assign({}, DEF, { best: {}, medal: {} });
    }
  }
  function store() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても あそべる */ }
  }

  /* ================= おと ================= */
  let AC = null;
  function ac() {
    if (!save.sound) return null;
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(f, d, type = 'sine', v = 0.2, f2 = 0, delay = 0) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + d + 0.03);
  }
  function noise(d, freq, v, delay = 0) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + delay;
    const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * d)), a.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(); s.buffer = buf;
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 0.8;
    const g = a.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(bp).connect(g).connect(a.destination);
    s.start(t);
  }
  function fartSound(len = 0.55) {
    const a = ac(); if (!a) return;
    const t = a.currentTime;
    const o = a.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(rand(95, 130), t);
    o.frequency.exponentialRampToValueAtTime(rand(45, 60), t + len);
    const lfo = a.createOscillator(); lfo.frequency.value = rand(22, 34);
    const lg = a.createGain(); lg.gain.value = 30;
    lfo.connect(lg).connect(o.frequency);
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.03);
    g.gain.setValueAtTime(0.3, t + len * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(lp).connect(g).connect(a.destination);
    o.start(t); lfo.start(t); o.stop(t + len + 0.05); lfo.stop(t + len + 0.05);
  }
  const SFX = {
    step: () => tone(480, 0.05, 'sine', 0.04, 720),
    tap: () => tone(660, 0.07, 'triangle', 0.1, 990),
    jump: () => tone(330, 0.26, 'sine', 0.17, 840),
    bump: () => { tone(150, 0.25, 'square', 0.1, 55); tone(1200, 0.12, 'triangle', 0.06, 700, 0.06); tone(1500, 0.12, 'triangle', 0.05, 900, 0.16); },
    imo: () => [660, 880, 1175].forEach((f, i) => tone(f, 0.12, 'triangle', 0.13, 0, i * 0.07)),
    boing: () => { tone(180, 0.45, 'sine', 0.2, 950); tone(360, 0.3, 'triangle', 0.06, 1400, 0.05); },
    splash: () => noise(0.22, 1700, 0.18),
    fart: () => fartSound(),
    smallFart: () => fartSound(0.3),
    beep: () => tone(784, 0.2, 'square', 0.09),
    go: () => { tone(1175, 0.5, 'square', 0.1); tone(1568, 0.5, 'triangle', 0.06); },
    special: () => [520, 700, 900].forEach((f, i) => tone(f, 0.1, 'sine', 0.08, f * 1.3, i * 0.05)),
    win: () => [523, 659, 784, 1047, 0, 784, 1047].forEach((f, i) => f && tone(f, 0.24, 'triangle', 0.16, 0, i * 0.12)),
    lose: () => [523, 494, 466, 440].forEach((f, i) => tone(f, 0.28, 'triangle', 0.12, 0, i * 0.18)),
    goal: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.16, 'square', 0.07, 0, i * 0.06)),
  };

  /* ================= キャラクター ================= */
  // かお（にょこすけと おなじ かきかた）。hx,hy = あたまの ちゅうしん、r = はんけい
  function drawFace(c, hx, hy, r, f, line, blinkSeed = 0) {
    const K = '#222';
    const lw = Math.max(1.6, r * 0.12);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const blink = f === 'normal' && ((T + blinkSeed) * 1000 % 3600) < 130;
    const E = [[hx + 0.12 * r, hy - 0.24 * r, 0.3 * r], [hx + 0.64 * r, hy - 0.28 * r, 0.26 * r]];
    E.forEach(([x, y, er], i) => {
      c.lineWidth = lw; c.strokeStyle = line;
      if (f === 'happy' || f === 'laugh') {
        c.beginPath(); c.moveTo(x - er * 0.8, y + er * 0.3); c.quadraticCurveTo(x, y - er * 1.1, x + er * 0.8, y + er * 0.3); c.stroke();
      } else if (f === 'effort') {
        const d = i ? -1 : 1;
        c.beginPath(); c.moveTo(x - er * 0.55 * d, y - er * 0.6); c.lineTo(x + er * 0.55 * d, y); c.lineTo(x - er * 0.55 * d, y + er * 0.6); c.stroke();
      } else if (blink) {
        c.beginPath(); c.moveTo(x - er * 0.7, y); c.lineTo(x + er * 0.7, y); c.stroke();
      } else {
        const big = f === 'wow' ? 1.15 : 1;
        c.fillStyle = '#fff'; c.strokeStyle = K; c.lineWidth = lw * 0.7;
        c.beginPath(); c.arc(x, y, er * big, 0, TAU); c.fill(); c.stroke();
        if (f === 'dizzy') {
          c.beginPath();
          for (let a = 0; a < 4 * Math.PI; a += 0.3) {
            const rr = er * 0.08 * a;
            const px = x + Math.cos(a + T * 9) * rr, py = y + Math.sin(a + T * 9) * rr;
            a === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
          }
          c.stroke();
        } else {
          const pr = f === 'wow' ? er * 0.28 : er * 0.52;
          c.fillStyle = K; c.beginPath(); c.arc(x + er * 0.25, y + er * 0.1, pr, 0, TAU); c.fill();
          c.fillStyle = '#fff'; c.beginPath(); c.arc(x + er * 0.38, y - er * 0.15, er * 0.2, 0, TAU); c.fill();
        }
      }
    });
    // ほっぺ
    c.fillStyle = 'rgba(255,120,150,.55)';
    c.beginPath(); c.arc(hx - 0.12 * r, hy + 0.32 * r, 0.2 * r, 0, TAU); c.fill();
    // くち
    const mx = hx + 0.48 * r, my = hy + 0.36 * r, m = r * 0.28;
    c.lineWidth = lw; c.strokeStyle = line;
    if (f === 'happy' || f === 'laugh') {
      c.fillStyle = '#b3261e';
      c.beginPath(); c.moveTo(mx - m, my - m * 0.15); c.lineTo(mx + m, my - m * 0.15); c.arc(mx, my - m * 0.15, m, 0, Math.PI); c.closePath(); c.fill();
      c.fillStyle = '#ff8fa3'; c.beginPath(); c.arc(mx, my + m * 0.45, m * 0.4, 0, TAU); c.fill();
    } else if (f === 'wow') {
      c.fillStyle = '#b3261e'; c.beginPath(); c.ellipse(mx, my + m * 0.1, m * 0.55, m * 0.75, 0, 0, TAU); c.fill();
    } else if (f === 'effort') {
      c.fillStyle = '#fff'; c.strokeStyle = K; c.lineWidth = lw * 0.7;
      c.beginPath(); c.roundRect(mx - m, my - m * 0.45, m * 2, m * 1.1, m * 0.35); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(mx - m, my + m * 0.1); c.lineTo(mx + m, my + m * 0.1); c.stroke();
    } else if (f === 'dizzy') {
      c.beginPath(); c.moveTo(mx - m, my);
      for (let k = 1; k <= 4; k++) c.lineTo(mx - m + k * m * 0.5, my + (k % 2 ? -m * 0.35 : 0));
      c.stroke();
    } else if (f === 'sad') {
      c.beginPath(); c.moveTo(mx - m * 0.8, my + m * 0.4); c.quadraticCurveTo(mx, my - m * 0.5, mx + m * 0.8, my + m * 0.4); c.stroke();
    } else {
      c.beginPath(); c.moveTo(mx - m * 0.85, my - m * 0.3); c.quadraticCurveTo(mx, my + m * 0.75, mx + m * 0.85, my - m * 0.3); c.stroke();
    }
  }

  function circ(c, x, y, r, fill, stroke, lw) {
    c.beginPath(); c.arc(x, y, r, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }

  // しょっかく
  function antenna(c, x0, y0, x1, y1, bend, col, tip) {
    c.strokeStyle = col; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1); c.stroke();
    circ(c, x1, y1, 4.3, tip, col, 2);
  }

  // ===== にょこすけ（いもむし）。しゃくとりむしの ように せなかを まるめて すすむ =====
  function drawNyoko(c, s) {
    const O = '#3f7f25';
    const hump = (1 - Math.cos(s.phase)) / 2;
    const span = 76 - 20 * hump;
    const pts = [];
    for (let i = 0; i < 7; i++) {
      const r = 9 + i * 0.75;
      const x = -40 + (i / 6) * span + (76 - span) * (i / 6 - 0.2);
      const y = -r - hump * 24 * Math.sin(Math.PI * i / 6);
      pts.push([x, y, r]);
    }
    c.fillStyle = O;
    pts.forEach(([x, y, r]) => { c.beginPath(); c.ellipse(x, y + r - 0.5, 3.2, 3.8, 0, 0, TAU); c.fill(); });
    pts.forEach(([x, y, r], i) => {
      circ(c, x, y, r, i % 2 ? '#8ad65a' : '#9fe36c', O, 2.6);
      circ(c, x - r * 0.3, y - r * 0.35, r * 0.3, 'rgba(255,255,255,.45)');
      if (i % 2 === 0 && i > 0) circ(c, x, y + 1, 2.6, '#ffd43b');
    });
    const [nx, ny] = pts[6];
    const hx = nx + 11, hy = ny - 17, hr = 19;
    const wob = Math.sin(s.phase) * 2;
    antenna(c, hx - 4, hy - hr + 4, hx - 11 - wob, hy - hr - 17, -4, O, '#ff8fab');
    antenna(c, hx + 6, hy - hr + 3, hx + 12 + wob, hy - hr - 16, 4, O, '#ff8fab');
    circ(c, hx, hy, hr, '#a8ea72', O, 2.6);
    circ(c, hx - 5, hy - 7, 5.5, 'rgba(255,255,255,.4)');
    drawFace(c, hx, hy, hr, s.face, '#222', 0);
  }

  // ===== でんきち（かたつむり）。のんびり。みずたまりは へっちゃら =====
  function drawDen(c, s) {
    const O = '#b5761a', B = '#ffe08a';
    const L = 1 + Math.sin(s.phase) * 0.07;
    const bob = Math.sin(s.phase) * 1.5;
    c.lineCap = 'round';
    // あし（からだ）と くび: ふちどり → なかみ
    const foot = () => { c.beginPath(); c.ellipse(-6, -7, 46 * L, 7.5, 0, 0, TAU); };
    const neck = () => { c.beginPath(); c.moveTo(16, -8); c.quadraticCurveTo(34, -10, 36, -28); };
    c.lineWidth = 5; c.strokeStyle = O; foot(); c.stroke();
    c.lineWidth = 22; neck(); c.stroke();
    c.fillStyle = B; foot(); c.fill();
    c.lineWidth = 17; c.strokeStyle = B; neck(); c.stroke();
    if (s.slide) { // ぬるぬる
      c.fillStyle = 'rgba(160,220,255,.7)';
      for (let i = 0; i < 4; i++) circ(c, -50 - i * 10, -3 + (i % 2) * 2, 3 - i * 0.5, 'rgba(160,220,255,.75)');
    }
    // から
    const cx = -10, cy = -36 + bob, cr = 27;
    circ(c, cx, cy, cr, '#f59f00', '#a85d00', 3);
    c.strokeStyle = '#a85d00'; c.lineWidth = 3;
    c.beginPath();
    for (let a = 0; a < Math.PI * 4.4; a += 0.15) {
      const rr = 1.5 + a * 1.72;
      const px = cx + Math.cos(a + 2.4) * rr, py = cy + Math.sin(a + 2.4) * rr;
      a === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
    }
    c.stroke();
    circ(c, cx - 9, cy - 11, 6, 'rgba(255,255,255,.45)');
    // めだま の つの
    const hx = 37, hy = -31, hr = 15;
    antenna(c, hx - 3, hy - hr + 3, hx - 8 + bob, hy - hr - 18, -3, O, B);
    antenna(c, hx + 5, hy - hr + 3, hx + 11 - bob, hy - hr - 17, 3, O, B);
    circ(c, hx, hy, hr, B, O, 2.6);
    circ(c, hx - 4, hy - 6, 4, 'rgba(255,255,255,.55)');
    drawFace(c, hx, hy, hr, s.face, '#222', 1.3);
  }

  // ===== ころまる（だんごむし）。ときどき まるまって ころころ =====
  function drawKoro(c, s) {
    const O = '#465a76';
    if (s.roll) {
      c.save(); c.translate(0, -29); c.rotate(s.rot);
      circ(c, 0, 0, 28, '#8fa3bf');
      c.save(); c.beginPath(); c.arc(0, 0, 28, 0, TAU); c.clip();
      c.fillStyle = '#7489a8';
      for (let k = -3; k <= 3; k++) c.fillRect(k * 10 - 2.5, -30, 5, 60);
      c.restore();
      circ(c, 0, 0, 28, null, O, 3);
      circ(c, -9, -10, 6, 'rgba(255,255,255,.45)');
      c.restore();
      // スピードせん
      c.strokeStyle = 'rgba(70,90,118,.45)'; c.lineWidth = 3;
      for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-36 - k * 4, -40 + k * 12); c.lineTo(-56 - k * 6, -40 + k * 12); c.stroke(); }
      return;
    }
    // あし
    c.strokeStyle = O; c.lineWidth = 2.6; c.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const lx = -36 + i * 11, sw = Math.sin(s.phase * 2 + i * 1.2) * 4;
      c.beginPath(); c.moveTo(lx, -6); c.lineTo(lx + sw, 0); c.stroke();
    }
    // こうら
    const dome = () => { c.beginPath(); c.ellipse(-4, -6, 42, 37, 0, Math.PI, TAU); c.closePath(); };
    c.fillStyle = '#8fa3bf'; dome(); c.fill();
    c.save(); dome(); c.clip();
    c.fillStyle = '#7489a8';
    for (let k = -4; k <= 4; k++) {
      c.beginPath(); c.ellipse(-4 + k * 10, -6, 2.6, 40, 0, 0, TAU); c.fill();
    }
    c.restore();
    c.strokeStyle = O; c.lineWidth = 3; dome(); c.stroke();
    c.beginPath(); c.ellipse(-16, -30, 12, 6, -0.3, 0, TAU); c.fillStyle = 'rgba(255,255,255,.4)'; c.fill();
    // あたま
    const hx = 37, hy = -15, hr = 14.5;
    const wob = Math.sin(s.phase * 2) * 2;
    antenna(c, hx + 4, hy - hr + 3, hx + 18, hy - hr - 12 + wob, -6, O, '#c6d3e6');
    antenna(c, hx - 2, hy - hr + 2, hx + 4, hy - hr - 17 - wob, -6, O, '#c6d3e6');
    circ(c, hx, hy, hr, '#b4c3d8', O, 2.6);
    circ(c, hx - 4, hy - 5, 4, 'rgba(255,255,255,.5)');
    drawFace(c, hx, hy, hr, s.face, '#222', 2.1);
  }

  // ===== てんとちゃん（てんとうむし）。ぱたぱた とんで いしを こえる =====
  function drawTen(c, s) {
    const O = '#8a1c1c';
    c.strokeStyle = '#222'; c.lineWidth = 2.6; c.lineCap = 'round';
    if (!s.fly) {
      for (let i = 0; i < 3; i++) {
        const lx = -20 + i * 18, sw = Math.sin(s.phase * 2 + i * 2) * 5;
        c.beginPath(); c.moveTo(lx, -6); c.lineTo(lx + sw, 0); c.stroke();
      }
    } else {
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-18 + i * 16, -6); c.lineTo(-22 + i * 16, 4); c.stroke(); }
    }
    // はね
    if (s.fly) {
      const fl = Math.sin(T * 45) * 0.45;
      [[-0.5 + fl, 'rgba(225,240,255,.8)'], [-0.9 + fl * 0.8, 'rgba(210,230,255,.7)']].forEach(([rt, col]) => {
        c.save(); c.translate(-6, -38); c.rotate(rt);
        c.beginPath(); c.ellipse(-24, 0, 26, 9, 0, 0, TAU); c.fillStyle = col; c.fill();
        c.strokeStyle = 'rgba(120,150,190,.8)'; c.lineWidth = 1.5; c.stroke();
        c.restore();
      });
    }
    const dome = () => { c.beginPath(); c.ellipse(-4, -6, 38, 35, 0, Math.PI, TAU); c.closePath(); };
    c.fillStyle = '#e8413c'; dome(); c.fill();
    c.save(); dome(); c.clip();
    c.fillStyle = '#222';
    [[-26, -16, 6], [-10, -30, 7], [8, -20, 6], [-16, -8, 4.5], [22, -8, 5], [-36, -4, 4]].forEach(([x, y, r]) => circ(c, x, y, r, '#222'));
    c.restore();
    c.strokeStyle = O; c.lineWidth = 3; dome(); c.stroke();
    c.beginPath(); c.ellipse(-18, -28, 11, 5.5, -0.35, 0, TAU); c.fillStyle = 'rgba(255,255,255,.45)'; c.fill();
    // あたま
    const hx = 34, hy = -15, hr = 15;
    const wob = Math.sin(s.phase * 2) * 2;
    antenna(c, hx - 2, hy - hr + 2, hx - 4, hy - hr - 15 + wob, -4, '#222', '#222');
    antenna(c, hx + 6, hy - hr + 3, hx + 14, hy - hr - 13 - wob, 4, '#222', '#222');
    circ(c, hx, hy, hr, '#2d2d2d', '#111', 2.6);
    // リボン
    c.save(); c.translate(hx - 8, hy - hr + 1); c.rotate(-0.3);
    c.fillStyle = '#ff6fae'; c.strokeStyle = '#c2266d'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-10, -6); c.lineTo(-10, 6); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(0, 0); c.lineTo(10, -6); c.lineTo(10, 6); c.closePath(); c.fill(); c.stroke();
    circ(c, 0, 0, 3.2, '#ff6fae', '#c2266d', 1.5);
    c.restore();
    drawFace(c, hx, hy, hr, s.face, '#fff', 0.7);
  }

  const CH = {
    nyoko: {
      name: 'にょこすけ', short: 'に', color: '#4caf3c', draw: drawNyoko,
      desc: 'いもが だいすきな いもむし。🍠で おならダッシュ！',
      hi: 'いくぞ〜！', ouch: 'いてて…', win: 'やったー！ いちばん！', lose: 'くやしい〜',
    },
    den: {
      name: 'でんきち', short: 'で', color: '#e67700', draw: drawDen, mult: 0.93,
      special: 'slide', specMult: 1.75, specDur: 1.7, specLine: 'ぬるぬる〜♪',
      desc: 'のんびり かたつむり。みずたまりは へっちゃら。',
      hi: 'のんびり いくよ〜', ouch: 'あいたた…', win: 'えっへん。のんびりが いちばん', lose: 'まって〜',
      fart: 'ぷぅ… ごめんね', water: 'みず だいすき〜',
    },
    koro: {
      name: 'ころまる', short: 'こ', color: '#4a6a96', draw: drawKoro, mult: 1.0,
      special: 'roll', specMult: 1.65, specDur: 1.6, specLine: 'ころころ〜！',
      desc: 'だんごむし。まるまって ころがると はやい！',
      hi: 'ころころ がんばる！', ouch: 'ごつん！', win: 'ころっと 1い！', lose: 'ころりん…',
      fart: 'ぷっ！ くさい？',
    },
    ten: {
      name: 'てんとちゃん', short: 'て', color: '#d6336c', draw: drawTen, mult: 0.97,
      special: 'fly', specMult: 1.45, specDur: 1.4, specLine: 'ぱたぱた〜！',
      desc: 'てんとうむし。ぱたぱた とんで いしを こえる。',
      hi: 'ぱたぱた まけないわ！', ouch: 'きゃっ！', win: 'やったわ！', lose: 'つぎは まけないわ',
      fart: 'やだ、ぷっ！',
    },
  };
  const ORDER = ['nyoko', 'den', 'koro', 'ten'];

  /* ================= コース ・ はやさ ================= */
  const COURSES = [
    {
      id: 'harappa', name: 'はらっぱ コース', emoji: '🌼', len: 7500,
      desc: 'はじめは ここ。おはなが いっぱい',
      sky: ['#78c6ff', '#dcf3ff'], far: '#b2df8a', near: '#8fcc63', ground: '#9fd46e',
      lane: '#f1dca6', laneLine: '#dcbf80', deco: 'flower', bgc: '#4caf3c', sh: '#2f7a22',
      mix: { rock: 5, puddle: 2, imo: 4, mush: 2 },
    },
    {
      id: 'imo', name: 'いもばたけ コース', emoji: '🍠', len: 9500,
      desc: '🍠が たくさん。みずたまりに ちゅうい',
      sky: ['#ffbe7d', '#fff0d8'], far: '#e5b37b', near: '#c98f55', ground: '#8cc35c',
      lane: '#c99b66', laneLine: '#a77945', deco: 'imo', bgc: '#d9822b', sh: '#9c5715',
      mix: { rock: 4, puddle: 4, imo: 8, mush: 2 },
    },
    {
      id: 'mori', name: 'もりの こみち', emoji: '🍄', len: 11500,
      desc: 'ながい コース。いしと キノコが いっぱい',
      sky: ['#8fd6bb', '#e6f7ee'], far: '#5fae7c', near: '#3f8d5c', ground: '#6db555',
      lane: '#dcc394', laneLine: '#bfa16b', deco: 'tree', bgc: '#2f8a57', sh: '#1d5c38',
      mix: { rock: 7, puddle: 3, imo: 5, mush: 5 },
    },
  ];
  const DIFFS = {
    easy:   { name: 'やさしい', sub: 'はじめて', cpu: 178, rb: [1500, -0.35, 0], jump: 0.55, stun: 0.55 },
    normal: { name: 'ふつう',   sub: 'れんだで かてる', cpu: 255, rb: [2000, -0.2, 0.12], jump: 0.8, stun: 0.85 },
    hard:   { name: 'はやい',   sub: 'むずかしい', cpu: 318, rb: [2600, -0.08, 0.18], jump: 0.93, stun: 1.05 },
  };
  const HOLD = 280, TAP = 80, CAP = 480, BOOST = 600;
  const JUMP = { dur: 0.62, h: 72 };

  /* ================= がめん ・ canvas ================= */
  const cv = $('#cv'), ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, laneH = 80, trackTop = 0, K = 1;
  function resize() {
    const r = cv.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    laneH = Math.min(H / 5.1, W / 5.2);
    trackTop = H - laneH * 4 - laneH * 0.08;
    K = laneH / 90;
    const top = $('.bar').getBoundingClientRect().bottom;
    document.querySelectorAll('.screen').forEach((s) => { s.style.top = top + 'px'; });
  }
  const baseY = (lane) => trackTop + laneH * lane + laneH * 0.74;

  /* ================= じょうたい ================= */
  let T = 0;
  let mode = 'title'; // title / count / race / finish / result
  let courseIdx = 0;
  let race = null;
  let camX = -200;
  let parts = [];
  const holds = new Set();
  let keyHold = false;
  const holding = () => holds.size > 0 || keyHold;

  function mkRacer(id, lane, cpu) {
    return {
      id, lane, cpu, x: 0, v: 0, phase: Math.random() * TAU, seed: Math.random() * 10,
      air: null, stunT: 0, boostT: 0, specT: 0, specCD: rand(4, 8),
      imo: 0, imoUseT: 0, face: 'normal', faceT: 0, say: '', sayT: 0,
      finished: false, time: 0, rank: 0, roll: 0, inPuddle: false,
    };
  }
  function demoScene() {
    const C = COURSES[courseIdx];
    return {
      C, len: C.len, t: 0, obs: [[], [], [], []],
      racers: [mkRacer('ten', 0, true), mkRacer('koro', 1, true), mkRacer('den', 2, true), mkRacer('nyoko', 3, false)],
      demo: true,
    };
  }
  function pick(mix) {
    const ent = Object.entries(mix);
    let s = ent.reduce((a, [, w]) => a + w, 0) * Math.random();
    for (const [k, w] of ent) { if ((s -= w) < 0) return k; }
    return ent[0][0];
  }
  function newRace() {
    const C = COURSES[courseIdx];
    const obs = [[], [], [], []];
    let x = 750, prev = '';
    while (x < C.len - 450) {
      let type = pick(C.mix);
      if (type === prev && type !== 'imo' && Math.random() < 0.5) type = pick(C.mix);
      for (let l = 0; l < 4; l++) obs[l].push({ x: x + rand(-28, 28), type, done: false, in: false, decided: false, sq: 0 });
      prev = type;
      x += rand(280, 540);
    }
    obs.forEach((L) => L.sort((a, b) => a.x - b.x));
    const racers = [mkRacer('ten', 0, true), mkRacer('koro', 1, true), mkRacer('den', 2, true), mkRacer('nyoko', 3, false)];
    race = { C, len: C.len, t: 0, obs, racers, P: racers[3], fin: 0, finT: 0, lastRank: 4, overCD: 0 };
    parts = [];
  }
  let scene = demoScene();

  /* ================= うごき ================= */
  function say(r, text, t = 1.6) { r.say = text; r.sayT = t; }
  function setFace(r, f, t) { r.face = f; r.faceT = t; }
  function airH(r) {
    let h = 0;
    if (r.air) { const p = r.air.t / r.air.dur; h += r.air.h * 4 * p * (1 - p); }
    if (r.id === 'ten' && r.specT > 0) {
      const d = CH.ten.specDur;
      h += 36 * Math.min(1, r.specT / 0.3, (d - r.specT) / 0.3);
    }
    return h;
  }
  const airborne = (r) => !!r.air || (r.id === 'ten' && r.specT > 0);

  function jump(r, h = JUMP.h, dur = JUMP.dur) {
    if (r.air || r.stunT > 0) return false;
    r.air = { t: 0, dur, h };
    return true;
  }
  function stun(r) {
    const d = DIFFS[save.diff];
    r.stunT = r.cpu ? 0.85 : d.stun;
    r.boostT = 0;
    setFace(r, 'dizzy', r.stunT);
    say(r, CH[r.id].ouch, 1.2);
    puff(r, 'dust', 6);
    if (!r.cpu) SFX.bump();
    else if (onScreen(r.x)) tone(220, 0.12, 'square', 0.04, 90);
  }
  function fart(r) {
    if (r.imo <= 0 || r.stunT > 0 || r.finished) return;
    r.imo--;
    r.boostT = 1.4;
    setFace(r, 'laugh', 1.4);
    if (!r.cpu) { say(r, 'ぷっ！', 1); SFX.fart(); }
    else { say(r, CH[r.id].fart, 1.4); if (onScreen(r.x)) SFX.smallFart(); }
    for (let i = 0; i < 9; i++) {
      parts.push({ k: 'cloud', x: r.x - 40 - rand(0, 30), lane: r.lane, y: airH(r) + rand(8, 36), vx: rand(-90, -30), vy: rand(5, 30), life: 0, max: rand(0.8, 1.3), s: rand(10, 18) });
    }
    parts.push({ k: 'text', x: r.x - 60, lane: r.lane, y: airH(r) + 50, vx: -30, vy: 40, life: 0, max: 1, txt: 'ぷっ', col: '#a0882a' });
  }
  function puff(r, k, n) {
    for (let i = 0; i < n; i++) {
      parts.push({ k, x: r.x + rand(-20, 20), lane: r.lane, y: rand(0, 10), vx: rand(-80, 40), vy: rand(30, 110), life: 0, max: rand(0.4, 0.7), s: rand(4, 8) });
    }
  }
  const onScreen = (x) => x > camX - 100 && x < camX + W / K + 100;

  function updRacer(r, dt) {
    const ch = CH[r.id], D = DIFFS[save.diff];
    if (r.sayT > 0) r.sayT -= dt;
    if (r.faceT > 0) { r.faceT -= dt; if (r.faceT <= 0) r.face = 'normal'; }
    if (r.boostT > 0) r.boostT -= dt;
    if (r.specT > 0) r.specT -= dt;
    if (r.air) {
      r.air.t += dt;
      if (r.air.t >= r.air.dur) { r.air = null; puff(r, 'dust', 3); }
    }

    if (r.stunT > 0) {
      r.stunT -= dt;
      r.v = Math.max(0, r.v - 1400 * dt);
    } else if (!r.cpu) {
      if (r.finished) r.v += (110 - r.v) * Math.min(1, dt * 1.5);
      else {
        const target = holding() ? HOLD : 0;
        r.v += (target - r.v) * Math.min(1, dt * (target > r.v ? 2.8 : 1.9));
      }
      if (r.boostT > 0) r.v = Math.max(r.v, BOOST);
      else r.v = Math.min(r.v, CAP);
    } else {
      const P = race.P;
      const wander = 1 + 0.07 * Math.sin(T * 0.6 + r.seed) + 0.04 * Math.sin(T * 1.7 + r.seed * 2);
      const rb = clamp((P.x - r.x) / D.rb[0], D.rb[1], D.rb[2]);
      let target = D.cpu * ch.mult * wander * (1 + rb);
      if (r.specT > 0) target *= ch.specMult;
      if (r.finished) target = 120;
      r.v += (target - r.v) * Math.min(1, dt * 2.2);
      if (r.boostT > 0) r.v = Math.max(r.v, D.cpu * 1.8); // おならダッシュは じぶんの はやさの 1.8ばい
      // とくいわざ
      if (!r.finished && r.x > 300) {
        r.specCD -= dt;
        if (r.specCD <= 0 && !r.air) {
          r.specCD = rand(6, 11); r.specT = ch.specDur;
          setFace(r, 'laugh', ch.specDur);
          say(r, ch.specLine, 1.4);
          if (onScreen(r.x)) SFX.special();
        }
      }
      // いもを つかう
      if (r.imo > 0) { r.imoUseT -= dt; if (r.imoUseT <= 0) { fart(r); r.imoUseT = rand(1.5, 4); } }
    }

    // みずたまり
    if (r.inPuddle && !airborne(r) && r.id !== 'den') r.v = Math.min(r.v, r.boostT > 0 ? 340 : 170);
    if (r.id === 'den' && r.specT > 0 && Math.random() < dt * 20) {
      parts.push({ k: 'spark', x: r.x - 45, lane: r.lane, y: rand(2, 12), vx: -20, vy: rand(10, 40), life: 0, max: 0.6, s: rand(2, 4) });
    }

    const prevPhase = r.phase;
    r.x += r.v * dt;
    r.phase += (r.v * dt) / 24;
    if (r.id === 'koro') r.roll += (r.v * dt) / 28;
    if (!r.cpu && mode === 'race' && Math.floor(r.phase / TAU) !== Math.floor(prevPhase / TAU) && !r.air) SFX.step();
    if (r.boostT > 0 && Math.random() < dt * 25) {
      parts.push({ k: 'cloud', x: r.x - 45, lane: r.lane, y: airH(r) + rand(10, 30), vx: rand(-60, -20), vy: rand(0, 20), life: 0, max: 0.7, s: rand(7, 12) });
    }

    // じゃまもの・アイテム
    r.inPuddle = false;
    for (const o of scene.obs[r.lane]) {
      if (o.x < r.x - 140) continue;
      if (o.x > r.x + 200) break;
      const dx = Math.abs(o.x - r.x);
      if (o.sq > 0) o.sq -= dt;
      if (o.type === 'rock') {
        if (r.cpu && !o.decided && o.x > r.x && o.x - r.x < r.v * 0.3 + 34 && r.stunT <= 0) {
          o.decided = true;
          const p = r.id === 'ten' ? Math.min(0.97, D.jump + 0.1) : D.jump;
          if (Math.random() < p) jump(r);
        }
        if (!o.done && dx < 32) {
          o.done = true;
          if (airborne(r)) {
            if (!r.cpu) { parts.push({ k: 'text', x: o.x, lane: r.lane, y: 90, vx: 0, vy: 50, life: 0, max: 0.9, txt: 'ナイス！', col: '#1c7ed6' }); }
          } else if (r.id === 'koro' && r.specT > 0) {
            jump(r, 40, 0.4); // ころころ は いしを はねて こえる
          } else {
            stun(r);
          }
        }
      } else if (o.type === 'puddle') {
        if (dx < 46) {
          r.inPuddle = true;
          if (!o.in && !airborne(r)) {
            o.in = true;
            for (let i = 0; i < 8; i++) parts.push({ k: 'drop', x: r.x + rand(-10, 20), lane: r.lane, y: 4, vx: rand(-90, 90), vy: rand(90, 200), life: 0, max: 0.7, s: rand(2.5, 4.5) });
            if (!r.cpu) { SFX.splash(); say(r, 'ぴちゃっ', 0.9); }
            else if (r.id === 'den') say(r, CH.den.water, 1.2);
          }
        }
      } else if (o.type === 'imo') {
        if (!o.done && dx < 30 && airH(r) < 70) {
          o.done = true;
          if (r.imo === 0) r.imoUseT = rand(1, 3.5);
          r.imo = Math.min(3, r.imo + 1);
          parts.push({ k: 'text', x: o.x, lane: r.lane, y: 70, vx: 0, vy: 45, life: 0, max: 0.9, txt: '+🍠', col: '#a3407c' });
          if (!r.cpu) { SFX.imo(); say(r, 'いも ゲット！', 1); setFace(r, 'happy', 0.8); }
        }
      } else if (o.type === 'mush') {
        if (!o.done && dx < 26 && !airborne(r) && r.stunT <= 0) {
          o.done = true; o.sq = 0.35;
          r.air = null; jump(r, 130, 0.95);
          r.v += r.cpu ? D.cpu * 0.45 : 140;
          setFace(r, 'wow', 0.9);
          if (!r.cpu) { SFX.boing(); say(r, 'ぼよーん！', 1); }
          else if (onScreen(r.x)) tone(200, 0.3, 'sine', 0.06, 700);
        }
      }
    }

    // ゴール
    if (!scene.demo && !r.finished && r.x >= scene.len) {
      r.finished = true;
      r.time = race.t;
      r.rank = ++race.fin;
      if (r.rank === 1) say(r, ch.win, 2.5);
      if (!r.cpu) playerGoal();
      else if (onScreen(r.x)) SFX.goal();
    }
  }

  function faceOf(r) {
    if (r.faceT > 0) return r.face;
    if (r.stunT > 0) return 'dizzy';
    if (r.finished) return r.rank === 1 || !r.cpu ? 'happy' : 'normal';
    if (mode === 'title') return 'normal';
    if (r.boostT > 0) return 'laugh';
    if (r.v > 380) return 'effort';
    return 'normal';
  }

  /* ================= ながれ ================= */
  let countT = 0, countShown = '';
  const countEl = $('#count');
  function showCount(txt, small) {
    if (txt === countShown) return;
    countShown = txt;
    countEl.textContent = txt;
    countEl.classList.toggle('small', !!small);
    countEl.classList.remove('pop'); void countEl.offsetWidth; countEl.classList.add('pop');
  }

  function startRace() {
    ac();
    newRace();
    scene = race;
    mode = 'count';
    countT = 3.6; countShown = '';
    camX = -W * 0.3 / K;
    $('#title').hidden = true; $('#result').hidden = true;
    $('#barTitle').hidden = true; $('#prog').hidden = false; $('#rankBadge').hidden = false;
    $('#homeBtn').hidden = true; $('#quitBtn').hidden = false;
    buildProg();
    race.racers.forEach((r) => { if (r.cpu) say(r, CH[r.id].hi, 2.2); });
    say(race.P, CH.nyoko.hi, 2.2);
    updateHud();
  }

  function playerGoal() {
    mode = 'finish';
    race.finT = 0;
    const rk = race.P.rank;
    showCount(rk === 1 ? 'ゴール！🏆' : `ゴール！ ${rk}い`, true);
    say(race.P, rk === 1 ? CH.nyoko.win : (rk === 2 ? 'おしい〜！' : CH.nyoko.lose), 2.5);
    setFace(race.P, rk === 1 ? 'laugh' : (rk <= 2 ? 'happy' : 'sad'), 2.5);
    if (rk === 1) SFX.win(); else SFX.goal();
    for (let i = 0; i < 60; i++) {
      parts.push({ k: 'confetti', x: race.P.x + rand(-250, 350), lane: rand(-0.5, 3), y: rand(120, 260), vx: rand(-40, 40), vy: rand(-20, 60), life: 0, max: rand(1.8, 3), s: rand(4, 7), col: ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2'][i % 5], rot: rand(0, 6) });
    }
  }

  function finishAll() {
    // まだ ゴールしていない こは、いまの はやさで かかる じかんを よそうする
    const rest = race.racers.filter((r) => !r.finished)
      .map((r) => ({ r, t: race.t + (race.len - r.x) / Math.max(150, r.v) }))
      .sort((a, b) => a.t - b.t);
    rest.forEach(({ r, t }) => { r.finished = true; r.time = t; r.rank = ++race.fin; });
    showResult();
  }

  function showResult() {
    mode = 'result';
    showCount('');
    const P = race.P, C = race.C, dk = save.diff;
    const key = `${C.id}:${dk}`;
    const prevBest = save.best[key];
    const newBest = !prevBest || P.time < prevBest;
    if (newBest) save.best[key] = +P.time.toFixed(2);
    const prevMedal = save.medal[key] || 9;
    if (P.rank < prevMedal) save.medal[key] = P.rank;
    save.races++;
    if (P.rank === 1) save.wins++;
    store();

    const msg = ['', 'やったね！ いちばん！🏆', 'おしい！ 2い！🥈', '3い！ よく がんばった！🥉', '4い… でも ゴール できて えらい！'][P.rank];
    $('#resultTitle').textContent = msg;
    $('#resultSub').textContent = `${C.emoji} ${C.name}・${DIFFS[dk].name}` + (P.rank === 1 && dk !== 'hard' ? '　つぎは もっと はやい レースに ちょうせん！' : '');
    const pod = $('#podium');
    pod.innerHTML = '';
    [...race.racers].sort((a, b) => a.rank - b.rank).forEach((r) => {
      const ch = CH[r.id];
      const li = document.createElement('li');
      li.style.setProperty('--c', ch.color);
      if (!r.cpu) li.className = 'me';
      li.innerHTML = `<span class="pl">${['🥇', '🥈', '🥉', '4'][r.rank - 1]}</span>`;
      const pc = document.createElement('canvas');
      pc.dataset.id = r.id; pc.dataset.face = r.rank === 1 ? 'laugh' : (r.rank === 4 ? 'sad' : 'happy');
      li.appendChild(pc);
      li.insertAdjacentHTML('beforeend', `<span class="nm">${ch.name}${r.cpu ? '' : '<small>きみ</small>'}</span><span class="tm">${r.time.toFixed(1)}びょう${!r.cpu && newBest ? '<small>ベスト きろく！</small>' : ''}</span>`);
      pod.appendChild(li);
    });
    setTimeout(() => { if (P.rank === 1) SFX.win(); else if (P.rank === 4) SFX.lose(); }, 200);
    $('#result').hidden = false;
    $('#result').scrollTop = 0;
  }

  function toTitle() {
    mode = 'title';
    race = null;
    scene = demoScene();
    parts = [];
    showCount('');
    holds.clear(); keyHold = false;
    $('#title').hidden = false; $('#result').hidden = true;
    $('#barTitle').hidden = false; $('#prog').hidden = true; $('#rankBadge').hidden = true;
    $('#homeBtn').hidden = false; $('#quitBtn').hidden = true;
    renderTitle();
    updateHud();
  }

  /* ================= こうしん ================= */
  function update(dt) {
    T += dt;
    if (mode === 'title') {
      scene.racers.forEach((r) => { r.phase += dt * 2.2; if (r.sayT > 0) r.sayT -= dt; if (r.faceT > 0) { r.faceT -= dt; } });
      camX = -W * 0.3 / K;
    } else if (mode === 'count') {
      countT -= dt;
      race.racers.forEach((r) => { if (r.sayT > 0) r.sayT -= dt; r.phase += dt * 1.5; });
      const n = Math.ceil(countT - 0.6);
      if (n >= 1) { if (countShown !== String(n)) { showCount(String(n)); SFX.beep(); } }
      else if (countShown !== 'ドン！') { showCount('ドン！'); SFX.go(); }
      if (countT <= 0.6) { mode = 'race'; }
    } else if (mode === 'race' || mode === 'finish' || mode === 'result') {
      if (mode !== 'result') race.t += dt;
      race.racers.forEach((r) => updRacer(r, dt));
      if (mode === 'race') {
        if (countShown === 'ドン！' && race.t > 0.8) showCount('');
        // おいぬかれた こが ひとこと
        race.overCD -= dt;
        const rk = currentRank();
        if (rk < race.lastRank && race.overCD <= 0) {
          const passed = race.racers.filter((r) => r.cpu && !r.finished).sort((a, b) => b.x - a.x).find((r) => r.x < race.P.x);
          if (passed && passed.sayT <= 0) { say(passed, Math.random() < 0.5 ? 'まって〜！' : 'はやい〜！', 1.2); setFace(passed, 'wow', 0.8); }
          race.overCD = 3;
        }
        race.lastRank = rk;
      }
      if (mode === 'finish') {
        race.finT += dt;
        if (race.finT > 1.6 && countShown) showCount('');
        if (race.racers.every((r) => r.finished) ? race.finT > 1.4 : race.finT > 3.2) finishAll();
      }
      const target = race.P.x - W * 0.3 / K;
      camX += (target - camX) * Math.min(1, dt * 6);
    }
    // つぶつぶ
    for (const p of parts) {
      p.life += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'drop' || p.k === 'dust') p.vy -= 520 * dt;
      if (p.k === 'confetti') { p.vy -= 60 * dt; p.vx += Math.sin(p.life * 5 + p.rot) * 20 * dt; p.rot += dt * 6; }
      if (p.k === 'cloud') p.s += dt * 14;
    }
    parts = parts.filter((p) => p.life < p.max);
    updateHud();
  }

  function currentRank() {
    const P = race.P;
    if (P.finished) return P.rank;
    return 1 + race.racers.filter((r) => r !== P && (r.finished || r.x > P.x)).length;
  }

  /* ================= かく ================= */
  function hills(c, factor, col, base, amp, seed) {
    c.fillStyle = col;
    c.beginPath(); c.moveTo(0, H);
    for (let sx = 0; sx <= W + 10; sx += 10) {
      const wx = sx / K + camX * factor;
      const y = base - amp * (0.55 + 0.3 * Math.sin(wx / 260 + seed) + 0.15 * Math.sin(wx / 97 + seed * 2));
      c.lineTo(sx, y);
    }
    c.lineTo(W, H); c.closePath(); c.fill();
  }
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  function drawDeco(c, C) {
    const y0 = trackTop + laneH * 0.08;
    const step = 90;
    const from = Math.floor((camX - 100) / step), to = Math.ceil((camX + W / K + 100) / step);
    for (let n = from; n <= to; n++) {
      const h = hash(n + courseIdx * 1000);
      if (h < 0.35) continue;
      const wx = n * step + hash(n * 3.1) * 50;
      const sx = (wx - camX) * K;
      c.save(); c.translate(sx, y0); c.scale(K, K);
      if (C.deco === 'flower') {
        const col = ['#ff6b9a', '#ffd43b', '#ffffff', '#b197fc'][Math.floor(h * 40) % 4];
        c.strokeStyle = '#3f8f2e'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -16); c.stroke();
        for (let i = 0; i < 5; i++) circ(c, Math.cos(i * TAU / 5 + T) * 5, -18 + Math.sin(i * TAU / 5 + T) * 5, 4, col);
        circ(c, 0, -18, 3.2, '#f59f00');
      } else if (C.deco === 'imo') {
        c.fillStyle = '#4c9a2a';
        for (let i = -1; i <= 1; i++) { c.save(); c.rotate(i * 0.5 + Math.sin(T * 2 + n) * 0.06); c.beginPath(); c.ellipse(0, -12, 5, 11, 0, 0, TAU); c.fill(); c.restore(); }
        c.fillStyle = '#7a4b2a'; c.beginPath(); c.ellipse(0, 0, 12, 4, 0, 0, TAU); c.fill();
      } else {
        c.fillStyle = '#7a5230'; c.fillRect(-4, -28, 8, 28);
        circ(c, 0, -40, 20, h > 0.7 ? '#2f7d4a' : '#3d9a5a');
        circ(c, -10, -30, 13, h > 0.7 ? '#2f7d4a' : '#3d9a5a');
        circ(c, 11, -30, 13, h > 0.7 ? '#2f7d4a' : '#3d9a5a');
        if (h > 0.85) { circ(c, -6, -44, 3, '#ff6b6b'); circ(c, 7, -36, 3, '#ff6b6b'); }
      }
      c.restore();
    }
  }

  function drawLane(c, C, i) {
    const by = baseY(i);
    const top = by - laneH * 0.58, bot = by + laneH * 0.2;
    c.fillStyle = C.lane; c.fillRect(0, top, W, bot - top);
    c.fillStyle = C.laneLine;
    c.fillRect(0, top, W, Math.max(2, 3 * K));
    c.fillRect(0, bot - Math.max(2, 3 * K), W, Math.max(2, 3 * K));
    // こいしの もよう
    const step = 46;
    const from = Math.floor(camX / step) - 1, to = Math.ceil((camX + W / K) / step) + 1;
    c.fillStyle = 'rgba(0,0,0,.08)';
    for (let n = from; n <= to; n++) {
      const h = hash(n * 7 + i * 31);
      const sx = (n * step + h * 30 - camX) * K, sy = top + (0.2 + 0.6 * hash(n + i * 13)) * (bot - top);
      c.beginPath(); c.ellipse(sx, sy, 3 * K, 1.8 * K, 0, 0, TAU); c.fill();
    }
    // レーンばんごう（スタートの まえ）
    const sx0 = (-60 - camX) * K;
    if (sx0 > -40 && sx0 < W + 40) {
      circ(c, sx0, by - laneH * 0.2, 13 * K, '#fff', C.laneLine, 2);
      c.fillStyle = CH[scene.racers[i].id].color; c.font = `900 ${15 * K}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(i + 1), sx0, by - laneH * 0.2 + 1);
    }
  }

  function drawLines(c) {
    const len = scene.len;
    const top = baseY(0) - laneH * 0.58, bot = baseY(3) + laneH * 0.2;
    // スタート
    const s0 = (0 - camX) * K;
    if (s0 > -20 && s0 < W + 20) { c.fillStyle = '#fff'; c.fillRect(s0 - 3 * K, top, 6 * K, bot - top); }
    // ゴール
    const g = (len - camX) * K;
    if (g > -60 && g < W + 200) {
      const sq = 9 * K;
      for (let y = top, j = 0; y < bot; y += sq, j++) {
        for (let k = 0; k < 3; k++) { c.fillStyle = (j + k) % 2 ? '#222' : '#fff'; c.fillRect(g + k * sq - sq * 1.5, y, sq, Math.min(sq, bot - y)); }
      }
      // ゲート
      const gt = top - laneH * 0.9;
      c.fillStyle = '#c92a2a';
      c.fillRect(g - 34 * K, gt, 6 * K, top - gt + laneH * 0.1);
      c.fillRect(g + 28 * K, gt, 6 * K, top - gt + laneH * 0.1);
      c.fillStyle = '#ff6b6b'; c.strokeStyle = '#c92a2a'; c.lineWidth = 3 * K;
      c.beginPath(); c.roundRect(g - 60 * K, gt - 26 * K, 120 * K, 32 * K, 10 * K); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.font = `900 ${20 * K}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('ゴール', g, gt - 9 * K);
    }
  }

  function drawObs(c, o, lane, C) {
    if ((o.type === 'imo') && o.done) return;
    const sx = (o.x - camX) * K, by = baseY(lane);
    if (sx < -80 || sx > W + 80) return;
    c.save(); c.translate(sx, by); c.scale(K, K);
    if (o.type === 'rock') {
      c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(0, 1, 22, 4, 0, 0, TAU); c.fill();
      c.fillStyle = '#9aa0a6'; c.strokeStyle = '#5f656b'; c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(-20, 0); c.quadraticCurveTo(-22, -20, -6, -26); c.quadraticCurveTo(12, -30, 19, -14); c.quadraticCurveTo(23, -4, 20, 0); c.closePath(); c.fill(); c.stroke();
      circ(c, -8, -18, 4, 'rgba(255,255,255,.45)');
      c.strokeStyle = '#4a4f55'; c.lineWidth = 1.8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-4, -11); c.lineTo(0, -11); c.moveTo(6, -11); c.lineTo(10, -11); c.stroke();
    } else if (o.type === 'puddle') {
      c.fillStyle = '#5aa9e6'; c.beginPath(); c.ellipse(0, -2, 46, 8, 0, 0, TAU); c.fill();
      c.fillStyle = '#a5d8ff'; c.beginPath(); c.ellipse(-8, -3.5, 26, 3.5, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5;
      const rr = (T * 18) % 20;
      c.beginPath(); c.ellipse(14, -2, 4 + rr, 1 + rr * 0.2, 0, 0, TAU); c.globalAlpha = 1 - rr / 20; c.stroke(); c.globalAlpha = 1;
    } else if (o.type === 'imo') {
      const bob = Math.sin(T * 4 + o.x) * 3;
      c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(0, 0, 14, 3, 0, 0, TAU); c.fill();
      c.translate(0, -24 + bob);
      c.fillStyle = 'rgba(255,230,120,.35)'; c.beginPath(); c.arc(0, 0, 22 + Math.sin(T * 6) * 2, 0, TAU); c.fill();
      c.save(); c.rotate(-0.35);
      c.fillStyle = '#b5487f'; c.strokeStyle = '#6b2350'; c.lineWidth = 2.4;
      c.beginPath(); c.ellipse(0, 0, 17, 10, 0, 0, TAU); c.fill(); c.stroke();
      circ(c, -6, -3, 3, 'rgba(255,255,255,.4)');
      c.strokeStyle = '#7d3060'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-3, 3); c.lineTo(1, 2); c.moveTo(6, -2); c.lineTo(9, -3); c.stroke();
      c.fillStyle = '#4c9a2a'; c.beginPath(); c.ellipse(19, -2, 6, 3, 0.6, 0, TAU); c.fill();
      c.restore();
    } else if (o.type === 'mush') {
      const sq = o.sq > 0 ? Math.sin((o.sq / 0.35) * Math.PI) * 0.35 : 0;
      c.scale(1 + sq, 1 - sq);
      c.fillStyle = '#fff3d6'; c.strokeStyle = '#b08850'; c.lineWidth = 2.4;
      c.beginPath(); c.roundRect(-8, -18, 16, 18, 5); c.fill(); c.stroke();
      c.fillStyle = '#e8413c'; c.strokeStyle = '#8a1c1c';
      c.beginPath(); c.ellipse(0, -18, 22, 16, 0, Math.PI, TAU); c.closePath(); c.fill(); c.stroke();
      circ(c, -9, -25, 4, '#fff'); circ(c, 6, -29, 3.5, '#fff'); circ(c, 13, -21, 3, '#fff');
    }
    c.restore();
  }

  function drawRacer(c, r) {
    const sx = (r.x - camX) * K, by = baseY(r.lane);
    if (sx < -120 || sx > W + 120) return;
    const h = airH(r);
    c.fillStyle = 'rgba(0,0,0,.18)';
    c.beginPath(); c.ellipse(sx, by + 1, 38 * K * (1 - Math.min(0.6, h / 220)), 6 * K, 0, 0, TAU); c.fill();
    c.save();
    c.translate(sx, by - h * K);
    if (r.stunT > 0) c.rotate(Math.sin(T * 22) * 0.06);
    const sc = K * 0.85;
    c.scale(sc, sc);
    CH[r.id].draw(c, {
      phase: r.phase, face: faceOf(r),
      roll: r.id === 'koro' && r.specT > 0, rot: r.roll,
      fly: r.id === 'ten' && r.specT > 0,
      slide: r.id === 'den' && r.specT > 0,
    });
    c.restore();
    // ほし くらくら
    if (r.stunT > 0) {
      for (let i = 0; i < 3; i++) {
        const a = T * 6 + i * TAU / 3;
        star(c, sx + (20 + Math.cos(a) * 22) * K, by - h * K - (66 + Math.sin(a) * 6) * K, 6 * K, '#ffd43b');
      }
    }
    // きみ の しるし
    if (!r.cpu && (mode === 'count' || mode === 'title' || (mode === 'race' && race.t < 3))) {
      const ay = by - h * K - 84 * K + Math.sin(T * 6) * 3;
      c.fillStyle = '#ffd43b'; c.strokeStyle = '#c99700'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(sx + 8 * K, ay + 10 * K); c.lineTo(sx, ay); c.lineTo(sx + 16 * K, ay); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#c94a00'; c.font = `900 ${14 * K}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.fillText('きみ', sx + 8 * K, ay - 2);
    }
  }

  function star(c, x, y, r, col) {
    c.fillStyle = col; c.strokeStyle = '#c99700'; c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath(); c.fill(); c.stroke();
  }

  function drawBubble(c, r) {
    if (r.sayT <= 0 || !r.say) return;
    const sx = (r.x - camX) * K, by = baseY(r.lane) - airH(r) * K;
    if (sx < -150 || sx > W + 150) return;
    const fs = Math.max(12, 14.5 * K);
    c.font = `900 ${fs}px sans-serif`;
    const tw = c.measureText(r.say).width;
    const pw = tw + fs * 1.1, ph = fs * 1.75;
    let bx = sx + 14 * K - pw / 2;
    bx = clamp(bx, 4, W - pw - 4);
    const byy = Math.max(4, by - 70 * K - ph);
    c.globalAlpha = Math.min(1, r.sayT * 4);
    c.fillStyle = '#fff'; c.strokeStyle = CH[r.id].color; c.lineWidth = 2.5;
    c.beginPath(); c.roundRect(bx, byy, pw, ph, ph / 2); c.fill(); c.stroke();
    const tx = clamp(sx + 14 * K, bx + 14, bx + pw - 14);
    c.beginPath(); c.moveTo(tx - 6, byy + ph - 1); c.lineTo(tx, byy + ph + 8); c.lineTo(tx + 6, byy + ph - 1); c.fill();
    c.beginPath(); c.moveTo(tx - 6, byy + ph); c.lineTo(tx, byy + ph + 8); c.lineTo(tx + 6, byy + ph); c.stroke();
    c.fillStyle = '#333'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(r.say, bx + pw / 2, byy + ph / 2 + 1);
    c.globalAlpha = 1;
  }

  function drawParts(c) {
    for (const p of parts) {
      const sx = (p.x - camX) * K;
      if (sx < -50 || sx > W + 50) continue;
      const sy = baseY(p.lane) - p.y * K;
      const a = 1 - p.life / p.max;
      c.globalAlpha = Math.max(0, a);
      if (p.k === 'cloud') circ(c, sx, sy, p.s * K, 'rgba(196,206,120,.75)');
      else if (p.k === 'dust') circ(c, sx, sy, p.s * K, 'rgba(160,130,90,.6)');
      else if (p.k === 'drop') circ(c, sx, sy, p.s * K, '#74c0fc');
      else if (p.k === 'spark') star(c, sx, sy, p.s * 2 * K, '#a5d8ff');
      else if (p.k === 'text') {
        c.font = `900 ${18 * K}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 4; c.strokeStyle = '#fff'; c.strokeText(p.txt, sx, sy); c.fillStyle = p.col; c.fillText(p.txt, sx, sy);
      } else if (p.k === 'confetti') {
        c.globalAlpha = Math.min(1, a * 3);
        c.save(); c.translate(sx, sy); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.s * K / 2, -p.s * K / 4, p.s * K, p.s * K / 2); c.restore();
      }
    }
    c.globalAlpha = 1;
  }

  let jumpHint = false;
  function drawWarn(c) {
    jumpHint = false;
    if (mode !== 'race') return;
    const P = race.P;
    if (P.air || P.finished) return;
    const o = race.obs[P.lane].find((o) => o.type === 'rock' && !o.done && o.x > P.x - 10);
    if (!o || o.x - P.x > 330) return;
    jumpHint = true;
    const sx = (o.x - camX) * K, sy = baseY(P.lane) - 50 * K + Math.sin(T * 12) * 3;
    circ(c, sx, sy, 13 * K, '#ffd43b', '#e67700', 2.5);
    c.fillStyle = '#c92a2a'; c.font = `900 ${18 * K}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('!', sx, sy + 1);
  }

  function render() {
    const c = ctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const C = scene.C;
    const g = c.createLinearGradient(0, 0, 0, trackTop);
    g.addColorStop(0, C.sky[0]); g.addColorStop(1, C.sky[1]);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // おひさま・くも
    circ(c, W - 50 * K, 44 * K, 26 * K, 'rgba(255,236,150,.9)');
    circ(c, W - 50 * K, 44 * K, 34 * K, 'rgba(255,236,150,.3)');
    for (let i = 0; i < 6; i++) {
      const span = W + 300;
      let x = ((i * 337 - camX * 0.08 * K - T * 6) % span + span) % span - 150;
      const y = (20 + (i % 3) * 26) * K;
      c.fillStyle = 'rgba(255,255,255,.85)';
      [[0, 0, 18], [18, -6, 22], [38, 0, 16], [20, 6, 16]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(x + dx * K, y + dy * K, r * K, 0, TAU); c.fill(); });
    }
    hills(c, 0.15, C.far, trackTop - laneH * 0.1, laneH * 1.3, 1.3 + courseIdx);
    hills(c, 0.35, C.near, trackTop + laneH * 0.1, laneH * 0.9, 4.1 + courseIdx);
    c.fillStyle = C.ground; c.fillRect(0, trackTop, W, H - trackTop);
    drawDeco(c, C);
    for (let i = 0; i < 4; i++) drawLane(c, C, i);
    drawLines(c);
    for (let i = 0; i < 4; i++) {
      for (const o of scene.obs[i]) {
        if (o.x < camX - 100) continue;
        if (o.x > camX + W / K + 100) break;
        drawObs(c, o, i, C);
      }
      drawRacer(c, scene.racers[i]);
    }
    drawWarn(c);
    drawParts(c);
    scene.racers.forEach((r) => drawBubble(c, r));
  }

  /* ================= ちいさい え（タイトル・けっか） ================= */
  function drawPortraits() {
    document.querySelectorAll('canvas[data-id]').forEach((pc) => {
      if (!pc.offsetParent) return;
      const w = pc.clientWidth, h = pc.clientHeight;
      if (!w || !h) return;
      const d = Math.min(2, window.devicePixelRatio || 1);
      if (pc.width !== Math.round(w * d)) { pc.width = Math.round(w * d); pc.height = Math.round(h * d); }
      const c = pc.getContext('2d');
      c.setTransform(d, 0, 0, d, 0, 0);
      c.clearRect(0, 0, w, h);
      const id = pc.dataset.id;
      const s = Math.min(w / 130, h / 105);
      c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(w / 2, h * 0.9, 44 * s, 6 * s, 0, 0, TAU); c.fill();
      const tapT = +(pc.dataset.tap || 0);
      const hop = tapT > T ? Math.abs(Math.sin((tapT - T) * 9)) * 14 : 0;
      c.save(); c.translate(w / 2 - 4 * s, h * 0.9 - hop * s); c.scale(s, s);
      const face = tapT > T ? 'laugh' : (pc.dataset.face || 'normal');
      CH[id].draw(c, { phase: T * 3 + (id.length), face, roll: false, rot: 0, fly: id === 'ten' && tapT > T, slide: false });
      c.restore();
    });
  }

  /* ================= HUD ================= */
  const fartBtn = $('#fartBtn'), jumpBtn = $('#jumpBtn'), stepBtn = $('#stepBtn');
  let hudKey = '';
  function buildProg() {
    const tr = $('#progTrack');
    tr.querySelectorAll('.prog-dot').forEach((e) => e.remove());
    race.racers.forEach((r) => {
      const d = document.createElement('i');
      d.className = 'prog-dot' + (r.cpu ? '' : ' me');
      d.style.background = CH[r.id].color;
      d.textContent = CH[r.id].short;
      d.dataset.rid = r.id;
      tr.appendChild(d);
    });
  }
  function updateHud() {
    const racing = mode === 'race' || mode === 'count' || mode === 'finish';
    const P = race && race.P;
    const imo = P ? P.imo : 0;
    const rk = race ? currentRank() : 0;
    const key = `${racing}|${imo}|${rk}|${jumpHint}`;
    if (race) {
      race.racers.forEach((r) => {
        const d = document.querySelector(`.prog-dot[data-rid="${r.id}"]`);
        if (d) d.style.left = (clamp(r.x / race.len, 0, 1) * 100) + '%';
      });
    }
    if (key === hudKey) return;
    hudKey = key;
    $('#imoNum').textContent = imo;
    fartBtn.disabled = !racing || imo <= 0;
    fartBtn.classList.toggle('ready', racing && imo > 0);
    jumpBtn.classList.toggle('hint', jumpHint);
    if (race) $('#rankBadge').innerHTML = `いま <b>${rk}</b>い`;
  }

  /* ================= そうさ ================= */
  function tap() {
    if (mode !== 'race') return;
    const P = race.P;
    if (P.stunT > 0 || P.finished) return;
    P.v = Math.min(P.boostT > 0 ? BOOST : CAP, P.v + TAP);
  }
  function doJump() {
    if (mode !== 'race' || race.P.finished) return;
    if (jump(race.P)) SFX.jump();
  }
  function doFart() {
    if (mode !== 'race') return;
    fart(race.P);
  }

  function bindHold(el) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      ac();
      holds.add(e.pointerId);
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* なくても よい */ }
      stepBtn.classList.add('on');
      tap();
    });
    const up = (e) => { holds.delete(e.pointerId); if (!holds.size) stepBtn.classList.remove('on'); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  }
  bindHold(stepBtn);
  bindHold(cv);
  jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); ac(); doJump(); });
  fartBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); ac(); doFart(); });
  [stepBtn, jumpBtn, fartBtn].forEach((b) => b.addEventListener('contextmenu', (e) => e.preventDefault()));

  window.addEventListener('keydown', (e) => {
    if (mode === 'title' || mode === 'result') return;
    if (e.code === 'Space' || e.code === 'ArrowRight') {
      e.preventDefault();
      if (!e.repeat) tap();
      keyHold = true;
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyJ') {
      e.preventDefault(); if (!e.repeat) doJump();
    } else if (e.code === 'KeyF' || e.code === 'ArrowDown') {
      e.preventDefault(); if (!e.repeat) doFart();
    }
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'ArrowRight') keyHold = false; });
  window.addEventListener('blur', () => { holds.clear(); keyHold = false; stepBtn.classList.remove('on'); });

  const soundBtn = $('#soundBtn');
  function paintSound() { soundBtn.textContent = save.sound ? '🔊' : '🔇'; }
  soundBtn.addEventListener('click', () => {
    save.sound = !save.sound; store(); paintSound();
    if (save.sound) SFX.tap();
  });
  $('#quitBtn').addEventListener('click', toTitle);
  $('#againBtn').addEventListener('click', () => { SFX.tap(); startRace(); });
  $('#backBtn').addEventListener('click', () => { SFX.tap(); toTitle(); });

  /* ================= タイトル ================= */
  function renderTitle() {
    const cs = $('#chars');
    if (!cs.children.length) {
      ORDER.forEach((id) => {
        const ch = CH[id];
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'char';
        b.style.setProperty('--c', ch.color);
        b.innerHTML = `<canvas data-id="${id}"></canvas><span class="nm">${ch.name}</span>${id === 'nyoko' ? '<span class="me">きみ</span>' : ''}<span class="ds">${ch.desc}</span>`;
        b.addEventListener('click', () => {
          b.querySelector('canvas').dataset.tap = T + 0.9;
          const r = scene.racers.find((x) => x.id === id);
          if (r) { say(r, CH[id].hi, 1.6); setFace(r, 'laugh', 1); }
          if (id === 'nyoko') SFX.boing(); else if (id === 'den') SFX.splash(); else if (id === 'koro') SFX.special(); else SFX.jump();
        });
        cs.appendChild(b);
      });
    }
    const ds = $('#diffs'); ds.innerHTML = '';
    Object.entries(DIFFS).forEach(([k, d]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'diff' + (save.diff === k ? ' sel' : '');
      b.innerHTML = `${d.name}<small>${d.sub}</small>`;
      b.addEventListener('click', () => { save.diff = k; store(); SFX.tap(); renderTitle(); });
      ds.appendChild(b);
    });
    const co = $('#courses'); co.innerHTML = '';
    COURSES.forEach((C, i) => {
      const key = `${C.id}:${save.diff}`;
      const m = save.medal[key];
      const best = save.best[key];
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'course';
      b.style.setProperty('--bgc', C.bgc); b.style.setProperty('--sh', C.sh);
      b.innerHTML = `<span class="em">${C.emoji}</span><span class="tx"><span class="nm">${C.name}</span><span class="ds">${C.desc}</span>${best ? `<span class="bt">ベスト ${best.toFixed(1)}びょう</span>` : ''}</span><span class="md">${m ? ['🥇', '🥈', '🥉', '🎖️'][m - 1] : '▶'}</span>`;
      b.addEventListener('pointerenter', () => { if (courseIdx !== i) { courseIdx = i; scene = demoScene(); } });
      b.addEventListener('click', () => { courseIdx = i; SFX.tap(); startRace(); });
      co.appendChild(b);
    });
    const golds = COURSES.filter((C) => Object.keys(save.medal).some((k) => k.startsWith(C.id + ':') && save.medal[k] === 1)).length;
    $('#stats').textContent = save.races
      ? `レース ${save.races}かい ・ 1い ${save.wins}かい` + (golds === COURSES.length ? ' ・ 🏆 ぜんぶの コースで 1い！ チャンピオン！' : '')
      : '';
  }

  /* ================= はじまり ================= */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    drawPortraits();
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  document.addEventListener('visibilitychange', () => { holds.clear(); keyHold = false; last = performance.now(); });

  paintSound();
  resize();
  toTitle();
  say(scene.racers[3], 'いっしょに はしろう！', 3);
  requestAnimationFrame(frame);
  if (location.hash === '#debug') window.__nyokoRace = { get race() { return race; }, jump: doJump, fart: doFart };
})();
