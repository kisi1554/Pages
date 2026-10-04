// にょこすけ シューティング
// たてスクロール（したから うえへ すすむ）の シューティング。
// キャラ・てき・ボス・はいけいは ぜんぶ canvas に その場で かく。音は WebAudio の 合成音だけ。
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const W = 360, H = 640;      // ゲームの せかいの おおきさ（たてながの ろんり座標）
  const DT = 1 / 60;
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  const stageEl = $('stage');
  const DEBUG = /debug/.test(location.hash);

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function seeded(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ===== ほぞん =====
  const KEY = 'nyoko-shooting.v1';
  const save = { cleared: 0, best: 0, level: 'easy', sound: true };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') Object.assign(save, s); } catch (e) { /* つかえない ときは きにしない */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* むし */ } }

  // ===================================================================
  //  おと（WebAudio）: こうかおん ＋ BGM シーケンサー
  // ===================================================================
  const Snd = (() => {
    let ac = null, master, mus, sfx, echo, noise;
    let on = save.sound !== false;
    const last = {};

    function init() {
      if (ac) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ac = new AC();
      master = ac.createGain(); master.gain.value = on ? 0.9 : 0; master.connect(ac.destination);
      const comp = ac.createDynamicsCompressor(); comp.connect(master);
      mus = ac.createGain(); mus.gain.value = 0.55; mus.connect(comp);
      sfx = ac.createGain(); sfx.gain.value = 0.6; sfx.connect(comp);
      // リードに かける やまびこ
      echo = ac.createDelay(1); echo.delayTime.value = 0.21;
      const fb = ac.createGain(); fb.gain.value = 0.28;
      const eg = ac.createGain(); eg.gain.value = 0.35;
      echo.connect(fb); fb.connect(echo); echo.connect(eg); eg.connect(mus);
      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    }
    function resume() { if (init() && ac.state === 'suspended') ac.resume(); }
    function setOn(v) {
      on = v;
      if (ac) master.gain.setTargetAtTime(v ? 0.9 : 0, ac.currentTime, 0.02);
    }
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

    function env(g, t, a, peak, d, sus, end, rel) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.setTargetAtTime(sus, t + a, d);
      g.gain.setValueAtTime(sus, end);
      g.gain.linearRampToValueAtTime(0.0001, end + rel);
    }
    function osc(type, f, t, dur, vol, dest, o = {}) {
      const g = ac.createGain();
      const s = ac.createOscillator(); s.type = type; s.frequency.setValueAtTime(f, t);
      if (o.to) s.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || dur));
      if (o.detune) s.detune.value = o.detune;
      let node = s;
      if (o.lp) { const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; f2.Q.value = o.q || 1; s.connect(f2); node = f2; }
      node.connect(g); g.connect(dest);
      if (o.send) g.connect(o.send);
      env(g, t, o.a || 0.005, vol, o.d || 0.08, vol * (o.sus ?? 0.6), t + dur, o.r || 0.05);
      s.start(t); s.stop(t + dur + (o.r || 0.05) + 0.05);
      return s;
    }
    function nz(t, dur, vol, dest, type, freq, q = 1) {
      const src = ac.createBufferSource(); src.buffer = noise;
      const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ac.createGain();
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(dest);
      src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
    }

    // ---- こうかおん ----
    function play(name) {
      if (!ac || !on) return;
      const t = ac.currentTime;
      const gap = { shot: 0.09, hit: 0.05, pop: 0.04 }[name] || 0;
      if (gap && last[name] && t - last[name] < gap) return;
      last[name] = t;
      switch (name) {
        case 'shot': osc('square', 1400, t, 0.03, 0.025, sfx, { to: 900, r: 0.02 }); break;
        case 'hit': nz(t, 0.04, 0.08, sfx, 'highpass', 3000); break;
        case 'pop':
          osc('triangle', 500, t, 0.08, 0.18, sfx, { to: 1300, r: 0.05 });
          nz(t, 0.12, 0.16, sfx, 'bandpass', 1500, 0.8); break;
        case 'big':
          osc('sawtooth', 220, t, 0.3, 0.2, sfx, { to: 50, lp: 1200, r: 0.1 });
          nz(t, 0.5, 0.35, sfx, 'lowpass', 900); break;
        case 'item': [0, 4, 7, 12].forEach((k, i) => osc('square', mtof(76 + k), t + i * 0.05, 0.06, 0.08, sfx)); break;
        case 'power': [0, 4, 7, 12, 16].forEach((k, i) => osc('square', mtof(72 + k), t + i * 0.045, 0.07, 0.09, sfx, { lp: 4000 })); break;
        case 'heart': [0, 7, 12].forEach((k, i) => osc('triangle', mtof(79 + k), t + i * 0.08, 0.12, 0.18, sfx)); break;
        case 'bomb': { // ぷっ（おなら）
          const s = osc('sawtooth', 95, t, 0.55, 0.32, sfx, { to: 60, glide: 0.55, lp: 700, q: 4, r: 0.12 });
          const lfo = ac.createOscillator(); lfo.frequency.value = 28;
          const lg = ac.createGain(); lg.gain.value = 30; lfo.connect(lg); lg.connect(s.frequency);
          lfo.start(t); lfo.stop(t + 0.7);
          nz(t + 0.05, 0.9, 0.25, sfx, 'lowpass', 500);
          break;
        }
        case 'hurt': osc('square', 520, t, 0.35, 0.18, sfx, { to: 90, lp: 2500 }); nz(t, 0.3, 0.2, sfx, 'bandpass', 600); break;
        case 'warn':
          for (let i = 0; i < 6; i++) osc('sawtooth', i % 2 ? 660 : 880, t + i * 0.28, 0.26, 0.12, sfx, { lp: 2000, sus: 0.9 });
          break;
        case 'boom':
          nz(t, 1.6, 0.5, sfx, 'lowpass', 400);
          osc('sine', 120, t, 1.2, 0.5, sfx, { to: 30, glide: 1.2 });
          break;
        case 'say': osc('square', 660, t, 0.05, 0.06, sfx); osc('square', 880, t + 0.06, 0.05, 0.06, sfx); break;
        case 'start': [0, 7, 12, 19].forEach((k, i) => osc('square', mtof(64 + k), t + i * 0.09, 0.1, 0.1, sfx, { lp: 3500 })); break;
        case 'tap': osc('triangle', 880, t, 0.05, 0.12, sfx); break;
      }
    }

    // ---- BGM ----
    // メロディは 1しょうせつ＝16もじ。'0'〜'e' は スケールの なんばんめか、'-' は のばす、'.' は やすみ。
    const MINOR = [0, 2, 3, 5, 7, 8, 10], HARM = [0, 2, 3, 5, 7, 8, 11];
    const DG = '0123456789abcde';
    const dg = (sc, d) => sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    const SONGS = {
      title: {
        bpm: 126, root: 57, sc: MINOR, chords: [0, 5, 2, 6],
        lead: ['7-----9-a---9-7-', '5-----7-9---7-5-', '2-----4-5---7-9-', '8-------a-------'],
        bass: 'o.......o...O...', drum: 'k.......s.....h.', arp: true,
      },
      stageA: {
        bpm: 152, root: 57, sc: MINOR, chords: [0, 5, 6, 4, 0, 5, 6, 4],
        lead: ['4--4--7-6-4-3-4-', '5--5--9-7-5-4-5-', '6--6--8-9-8-6-5-', '4-------1-2-3-4-',
               '7--7--9-a-9-7-9-', '9--9--a-b-a-9-7-', '8-9-a-8-9-a-b-a-', 'b-------a-9-8-6-'],
        bass: 'o.o.O.o.o.o.O.5.', drum: 'k.h.s.h.k.k.s.h.', fill: 'k.h.s.h.k.s.sSSS', arp: true,
      },
      stageB: {
        bpm: 158, root: 50, sc: MINOR, chords: [0, 0, 5, 6, 0, 0, 3, 4],
        lead: ['7.7.9.7.a-9-7-4-', '7.7.9.7.b-a-9-a-', '9-9-7-5-9-9-7-5-', '8-8-6-4-8-9-a-b-',
               '7.7.9.7.a-9-7-4-', '7.7.9.7.b-a-9-a-', 'a---9---a---b---', 'b-------7-------'],
        bass: 'o.oo.oo.o.oo.O.5', drum: 'k.hhs.hhk.hhs.hk', fill: 'k.hhs.hhk.sSsSSS', arp: true,
      },
      boss: {
        bpm: 168, root: 52, sc: HARM, chords: [0, 0, 5, 4, 0, 0, 5, 4],
        lead: ['7.7.6.7...a.9.7.', '4.4.3.4...7.6.4.', '5-------7-8-9-a-', 'b-------6-------',
               '7.7.6.7...a.9.7.', '4.4.3.4...7.6.4.', 'c-b-a-9-8-7-6-5-', '6-------4---6---'],
        bass: 'o.o.o.o.o.o.O.O.', drum: 'x.hhS.hhx.xhS.hh', fill: 'x.hhS.hhx.SSSSSS', arp: true,
      },
      last: {
        bpm: 176, root: 53, sc: HARM, chords: [0, 3, 5, 4, 0, 3, 5, 4],
        lead: ['7-6-7-9-a---9-7-', '6-5-6-7-8---7-6-', '5-7-9-c-b-a-9-8-', '6---------4-6-8-',
               'e-d-c-d-e---c-a-', 'd-c-b-c-d---b-8-', 'c-b-a-9-a-b-c-d-', 'b---------------'],
        bass: 'oOoOoOoOoOoOoO5O', drum: 'x.hSx.hSx.xSx.hS', fill: 'xSxSxSxSSSSSSSSS', arp: true,
      },
      clear: {
        bpm: 150, root: 57, sc: MINOR, chords: [5, 6, 0], once: true,
        lead: ['9.9.9.7---9---a-', 'b.b.b.a---b---d-', 'e---------------'],
        bass: 'o...o...o...o...', drum: 'k...s...k...s...', fill: 'c...............',
      },
      over: {
        bpm: 110, root: 57, sc: MINOR, chords: [5, 4], once: true,
        lead: ['9-8-7-6-5-4-3-2-', '1-------0-------'],
        bass: 'o.......o.......', drum: '................',
      },
    };
    let song = null, songName = '', step = 0, nextT = 0, timer = null, tr = 0;

    function lead(f, t, dur) {
      osc('square', f, t, dur * 0.92, 0.075, mus, { lp: 3200, send: echo, d: 0.1, sus: 0.55 });
      osc('sawtooth', f, t, dur * 0.92, 0.04, mus, { lp: 2400, detune: 9, d: 0.1, sus: 0.5 });
    }
    function playStep(s, i, t, spb) {
      const bars = s.lead.length, bar = Math.floor(i / 16) % bars, st = i % 16;
      const cd = s.chords[bar % s.chords.length];
      const root = s.root + tr, croot = root + dg(s.sc, cd);
      const L = s.lead[bar], c = L[st];
      if (c && c !== '.' && c !== '-') {
        let len = 1; while (st + len < 16 && L[st + len] === '-') len++;
        lead(mtof(root + 12 + dg(s.sc, DG.indexOf(c))), t, len * spb);
      }
      const B = s.bass[st];
      if (B && B !== '.') {
        let m = croot - 12;
        if (B === 'O') m += 12;
        else if (B === '5') m = root + dg(s.sc, cd + 4) - 12;
        osc('sawtooth', mtof(m), t, spb * 0.85, 0.13, mus, { lp: 700, q: 3, d: 0.06, sus: 0.5 });
      }
      if (s.arp && st % 2 === 0) {
        const dd = [0, 2, 4, 7][(st / 2) % 4];
        osc('triangle', mtof(root + 12 + dg(s.sc, cd + dd)), t, spb * 1.5, 0.05, mus, { d: 0.05, sus: 0.3 });
      }
      const D = (bar === bars - 1 && s.fill) ? s.fill : s.drum, dc = D[st];
      if (dc === 'k' || dc === 'x') osc('sine', 150, t, 0.14, 0.55, mus, { to: 42, glide: 0.12, r: 0.03, sus: 0.3 });
      if (dc === 's' || dc === 'S') { nz(t, 0.14, 0.24, mus, 'bandpass', 1900, 0.7); osc('triangle', 210, t, 0.06, 0.12, mus); }
      if (dc === 'h' || dc === 'x' || dc === 'S') nz(t, 0.035, 0.07, mus, 'highpass', 7500);
      if (dc === 'c') nz(t, 1.1, 0.16, mus, 'highpass', 5000);
    }
    function tick() {
      if (!song || !ac) return;
      const spb = 60 / song.bpm / 4;
      while (nextT < ac.currentTime + 0.12) {
        playStep(song, step, nextT, spb);
        step++; nextT += spb;
        if (song.once && step >= song.lead.length * 16) { song = null; songName = ''; break; }
      }
    }
    function music(name, transpose = 0) {
      if (!init()) return;
      if (name === songName && transpose === tr) return;
      songName = name || ''; tr = transpose;
      song = name ? SONGS[name] : null;
      step = 0; nextT = ac.currentTime + 0.08;
      if (!timer) timer = setInterval(tick, 25);
    }
    function suspend(v) { if (!ac) return; v ? ac.suspend() : ac.resume(); }
    return { resume, play, music, setOn, isOn: () => on, suspend, get song() { return songName; } };
  })();

  // ===================================================================
  //  ステージ・ボスの データ
  // ===================================================================
  const STAGES = [
    { name: 'なつの もり', boss: 'semi', bossName: 'ミンミン キング', song: 'stageA', bg: 'forest',
      pats: ['line', 'vee', 'pair', 'turret', 'swoop'] },
    { name: 'きらきら いけ', boss: 'tonbo', bossName: 'ギンヤンマ ジェット', song: 'stageB', bg: 'pond',
      pats: ['line', 'vee', 'zig', 'turret', 'swoop', 'pair'] },
    { name: 'ざわざわ くさはら', boss: 'kamakiri', bossName: 'カマキリ しょうぐん', song: 'stageA', bg: 'grass',
      pats: ['zig', 'turret', 'tank', 'swoop', 'vee', 'pair'] },
    { name: 'よるの じゅえきば', boss: 'kuwagata', bossName: 'ノコギリ クワガタン', song: 'stageB', bg: 'night',
      pats: ['tank', 'turret', 'zig', 'swoop', 'mix', 'vee'] },
    { name: 'たいじゅの てっぺん', boss: 'hera', bossName: 'ヘラクレス オオカブト', song: 'stageA', bg: 'sky',
      pats: ['tank', 'mix', 'turret', 'zig', 'swoop', 'pair'] },
  ];
  const SONG_KEY = [0, 0, 5, 3, 7]; // ステージごとに BGM の たかさを かえる（すこし ちがって きこえる）

  const ETYPES = {
    hae:     { hp: 2,  up: 0.6, r: 12, score: 100 },
    ka:      { hp: 1,  up: 0.4, r: 10, score: 80 },
    hachi:   { hp: 7,  up: 1.6, r: 15, score: 300 },
    ga:      { hp: 4,  up: 1.0, r: 17, score: 200 },
    kanabun: { hp: 26, up: 6,   r: 22, score: 1000 },
  };

  // ===================================================================
  //  ゲームの じょうたい
  // ===================================================================
  const G = {
    state: 'title', // title | play | dying | clearing | clear | over | end
    paused: false,
    stage: 0, st: 0, t: 0,
    score: 0, startScore: 0, startPower: 1,
    hp: 3, maxHp: 3, bombs: 2, power: 1,
    easy: save.level !== 'normal',
    bs: 1, fr: 1, dens: 1,
    shots: [], en: [], eb: [], items: [], parts: [], texts: [],
    events: [], evi: 0, boss: null, warn: 0, intro: 0,
    bombT: 0, flash: 0, shake: 0, endT: 0,
    scroll: 0, deco: [], decoT: 0, bg: 'forest',
    wave: 0,
  };
  const P = { x: W / 2, y: H - 110, inv: 0, hurtT: 0, fireT: 0, homT: 0, tilt: 0, puffT: 0, vis: true };

  // ===================================================================
  //  えを かく ための どうぐ
  // ===================================================================
  function circ(c, x, y, r, fill, stroke, lw) {
    c.beginPath(); c.arc(x, y, r, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
  }
  function ell(c, x, y, rx, ry, rot, fill, stroke, lw) {
    c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
  }
  function line(c, pts, col, lw) {
    c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
  }
  function antenna(c, x0, y0, x1, y1, bend, col, tip) {
    c.strokeStyle = col; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1); c.stroke();
    if (tip) circ(c, x1, y1, 4, tip, col, 1.8);
  }
  // まんがの め（ひとみは にょこすけの ほうを みる）
  function eye(c, x, y, r, look, angry, side) {
    circ(c, x, y, r, '#fff', '#111', Math.max(1.5, r * 0.18));
    const lx = look ? clamp(look[0], -1, 1) : 0, ly = look ? clamp(look[1], -1, 1) : 0.6;
    circ(c, x + lx * r * 0.4, y + ly * r * 0.4, r * 0.5, '#111');
    circ(c, x + lx * r * 0.4 - r * 0.18, y + ly * r * 0.4 - r * 0.2, r * 0.17, '#fff');
    if (angry) {
      line(c, [[x - r * 1.1 * side, y - r * 1.25], [x + r * 0.9 * side, y - r * 0.55]], '#111', Math.max(2.5, r * 0.32));
    }
  }
  function lookAt(b, ox, oy) {
    const dx = P.x - (b.x + ox), dy = P.y - (b.y + oy), d = Math.hypot(dx, dy) || 1;
    return [dx / d, dy / d];
  }

  // ===== にょこすけ（うえから みた すがた。はねで とぶ。おしりから ぷっぷっ） =====
  function drawPlayer(c, x, y, t, tilt, face) {
    const O = '#2f6a1c';
    c.save(); c.translate(x, y);
    const segs = [];
    for (let i = 5; i >= 1; i--) {
      segs.push([Math.sin(t * 9 - i * 0.9) * 3 * (i / 5) - tilt * i * 1.4, 4 + i * 9.5, 10.5 - i * 0.85]);
    }
    // はね
    const fl = Math.sin(t * 32) * 0.35;
    for (const s of [-1, 1]) {
      c.save(); c.scale(s, 1); c.translate(7, 16); c.rotate(-0.35 - fl);
      ell(c, 15, 0, 15, 7, 0, 'rgba(225,250,255,.7)', 'rgba(70,140,170,.9)', 1.5);
      line(c, [[2, 0], [26, 0]], 'rgba(70,140,170,.6)', 1);
      c.restore();
    }
    segs.forEach(([sx, sy, r], k) => {
      circ(c, sx, sy, r, k % 2 ? '#8ad65a' : '#9fe36c', O, 2.2);
      circ(c, sx - r * 0.3, sy - r * 0.35, r * 0.28, 'rgba(255,255,255,.45)');
      if (k % 2 === 0) circ(c, sx, sy + 1, 2.3, '#ffd43b');
    });
    const wob = Math.sin(t * 6) * 2;
    antenna(c, -5, -11, -12 - wob, -30, -4, O, '#ff8fab');
    antenna(c, 5, -11, 12 + wob, -30, 4, O, '#ff8fab');
    circ(c, 0, 0, 14.5, '#a8ea72', O, 2.4);
    circ(c, -5, -6, 4.5, 'rgba(255,255,255,.45)');
    // かお
    circ(c, -8.5, 4, 2.8, 'rgba(255,120,150,.45)'); circ(c, 8.5, 4, 2.8, 'rgba(255,120,150,.45)');
    if (face === 'hurt') {
      line(c, [[-8, -3], [-3, 0], [-8, 3]], '#222', 2.2); line(c, [[8, -3], [3, 0], [8, 3]], '#222', 2.2);
      ell(c, 0, 7, 3, 2.5, 0, '#222');
    } else {
      ell(c, -5, -1, 2.4, 3.2, 0, '#222'); ell(c, 5, -1, 2.4, 3.2, 0, '#222');
      circ(c, -4.2, -2.2, 0.9, '#fff'); circ(c, 5.8, -2.2, 0.9, '#fff');
      c.strokeStyle = '#222'; c.lineWidth = 1.8; c.beginPath(); c.arc(0, 4, 3.5, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    }
    c.restore();
  }

  // ===== ざこ てき（みんな したむき＝にょこすけの ほうを むいている） =====
  function drawEnemy(c, e, t) {
    c.save(); c.translate(e.x, e.y);
    if (e.flash > 0) c.filter = 'brightness(2.2)';
    const k = t * 40 + e.ph * 10;
    switch (e.type) {
      case 'hae': {
        const f = Math.sin(k) * 0.3;
        for (const s of [-1, 1]) { c.save(); c.scale(s, 1); c.rotate(-0.5 + f); ell(c, 9, -10, 9, 5, 0.3, 'rgba(220,230,240,.75)', '#556', 1.2); c.restore(); }
        ell(c, 0, -3, 8, 10, 0, '#3a3f4a', '#111', 2);
        line(c, [[-5, -6], [5, -6]], '#6a7080', 1.5); line(c, [[-6, -1], [6, -1]], '#6a7080', 1.5);
        circ(c, 0, 7, 6.5, '#2a2e36', '#111', 1.5);
        circ(c, -5, 8, 4.2, '#d6332b', '#111', 1.4); circ(c, 5, 8, 4.2, '#d6332b', '#111', 1.4);
        circ(c, -6, 6.6, 1.3, '#fff'); circ(c, 4, 6.6, 1.3, '#fff');
        break;
      }
      case 'ka': {
        c.strokeStyle = '#333'; c.lineWidth = 1.2;
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) line(c, [[0, -2 + i * 4], [s * 12, -8 + i * 8], [s * 16, 2 + i * 8]], '#333', 1.1);
        const f = Math.sin(k * 1.4) * 0.3;
        for (const s of [-1, 1]) { c.save(); c.scale(s, 1); c.rotate(-0.25 + f); ell(c, 9, -6, 10, 3.5, 0.2, 'rgba(230,240,250,.7)', '#667', 1); c.restore(); }
        for (let i = 0; i < 4; i++) ell(c, 0, -12 + i * 4.5, 3.4, 2.6, 0, i % 2 ? '#fff' : '#222', '#111', 1);
        ell(c, 0, 4, 4.5, 4, 0, '#222'); circ(c, 0, 9, 3.5, '#222');
        circ(c, -1.8, 9, 1.4, '#fff'); circ(c, 1.8, 9, 1.4, '#fff');
        line(c, [[0, 12], [0, 22]], '#111', 1.6);
        break;
      }
      case 'hachi': {
        const f = Math.sin(k) * 0.35;
        for (const s of [-1, 1]) { c.save(); c.scale(s, 1); c.rotate(-0.55 + f); ell(c, 11, -10, 11, 6, 0.3, 'rgba(225,240,255,.75)', '#557', 1.2); c.restore(); }
        c.save(); c.beginPath(); c.ellipse(0, -6, 11, 14, 0, 0, TAU); c.clip();
        c.fillStyle = '#ffc61a'; c.fillRect(-12, -21, 24, 30);
        c.fillStyle = '#222'; for (let i = 0; i < 3; i++) c.fillRect(-12, -16 + i * 8, 24, 3.6);
        c.restore();
        ell(c, 0, -6, 11, 14, 0, null, '#3a2a00', 2);
        line(c, [[0, -20], [0, -26]], '#222', 2.5);
        circ(c, 0, 10, 8, '#2a2a2a', '#111', 1.5);
        eye(c, -3.5, 10, 3, [0, 1], true, -1); eye(c, 3.5, 10, 3, [0, 1], true, 1);
        break;
      }
      case 'ga': {
        const f = Math.sin(k * 0.35) * 0.18;
        for (const s of [-1, 1]) {
          c.save(); c.scale(s, 1); c.rotate(f);
          c.beginPath(); c.moveTo(2, -4); c.quadraticCurveTo(26, -22, 24, 2); c.quadraticCurveTo(20, 16, 3, 6); c.closePath();
          c.fillStyle = '#b58a55'; c.fill(); c.strokeStyle = '#5a3d1a'; c.lineWidth = 1.8; c.stroke();
          circ(c, 15, -3, 5, '#f4d9a4', '#5a3d1a', 1.4); circ(c, 15, -3, 2.4, '#3a2410');
          c.restore();
        }
        ell(c, 0, 0, 4.5, 11, 0, '#7a5530', '#4a3218', 1.5);
        antenna(c, -2, 9, -9, 18, -3, '#4a3218'); antenna(c, 2, 9, 9, 18, 3, '#4a3218');
        circ(c, -2.2, 9, 1.6, '#111'); circ(c, 2.2, 9, 1.6, '#111');
        break;
      }
      case 'kanabun': {
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) line(c, [[s * 12, -10 + i * 10], [s * 24, -14 + i * 12], [s * 27, -6 + i * 12]], '#1f3a1a', 2.4);
        const gr = c.createLinearGradient(-20, -20, 20, 20);
        gr.addColorStop(0, '#7cf06a'); gr.addColorStop(0.5, '#1f9e5a'); gr.addColorStop(1, '#0e4a3a');
        ell(c, 0, -4, 18, 22, 0, gr, '#0a2a1a', 2.4);
        line(c, [[0, -24], [0, 12]], '#0a2a1a', 1.6);
        ell(c, -7, -12, 4, 8, 0.3, 'rgba(255,255,255,.4)');
        ell(c, 0, 16, 11, 8, 0, '#178a50', '#0a2a1a', 2);
        circ(c, 0, 24, 6, '#0e5a38', '#0a2a1a', 1.5);
        eye(c, -6, 15, 3.5, [0, 1], true, -1); eye(c, 6, 15, 3.5, [0, 1], true, 1);
        break;
      }
    }
    c.restore();
  }

  // ===================================================================
  //  ボスの え
  // ===================================================================
  // ① せみ「ミンミン キング」: おうかんを かぶった ミンミンゼミ
  function drawSemi(c, b, t) {
    const fl = b.flap ? Math.sin(t * 45) * 0.22 : Math.sin(t * 2.5) * 0.04;
    for (const s of [-1, 1]) {
      c.save(); c.scale(s, 1);
      c.save(); c.translate(14, -4); c.rotate(0.62 + fl * 1.2);
      ell(c, 0, -38, 15, 38, 0, 'rgba(210,245,255,.45)', '#3b5b4a', 2);
      c.restore();
      c.save(); c.translate(10, -10); c.rotate(0.3 + fl);
      ell(c, 0, -62, 22, 64, 0, 'rgba(210,245,255,.5)', '#3b5b4a', 2.4);
      for (const a of [-0.5, 0, 0.5]) line(c, [[0, 0], [a * 14, -60], [a * 20, -118]], 'rgba(59,91,74,.6)', 1.4);
      line(c, [[-20, -95], [20, -95]], 'rgba(59,91,74,.45)', 1.2);
      c.restore();
      c.restore();
    }
    ell(c, 0, -38, 25, 40, 0, '#2b3a2a', '#111', 3);
    for (let i = 0; i < 4; i++) line(c, [[-20 + i * 2, -50 + i * 12], [20 - i * 2, -50 + i * 12]], 'rgba(230,240,230,.5)', 2.4);
    ell(c, 0, 0, 34, 24, 0, '#3f7a3c', '#111', 3);
    line(c, [[-18, -10], [-9, 6], [0, -6], [9, 6], [18, -10]], '#1a2a18', 4);
    ell(c, 0, 26, 40, 15, 0, '#3f7a3c', '#111', 3);
    // おうかん
    c.save(); c.translate(0, 8);
    c.beginPath(); c.moveTo(-16, 0); c.lineTo(-18, -18); c.lineTo(-8, -9); c.lineTo(0, -22); c.lineTo(8, -9); c.lineTo(18, -18); c.lineTo(16, 0); c.closePath();
    c.fillStyle = '#ffd43b'; c.fill(); c.strokeStyle = '#a86b00'; c.lineWidth = 2.4; c.stroke();
    circ(c, 0, -6, 3.2, '#e03131'); circ(c, -10, -4, 2.2, '#4dabf7'); circ(c, 10, -4, 2.2, '#4dabf7');
    c.restore();
    // め
    for (const s of [-1, 1]) {
      circ(c, s * 36, 24, 13, '#8a3b1d', '#111', 2.6);
      eye(c, s * 36, 25, 8.5, lookAt(b, s * 36, 25), true, s);
    }
    // くち（さけぶ とき）
    if (b.sayT > 0) ell(c, 0, 38, 9, 7 + Math.sin(t * 30) * 2, 0, '#5a1010', '#111', 2);
    else line(c, [[-6, 37], [0, 34], [6, 37]], '#111', 2.5);
  }

  // ② とんぼ「ギンヤンマ ジェット」: あかい マフラーの ひこうし
  function drawTonbo(c, b, t) {
    // しっぽ
    for (let i = 0; i < 9; i++) {
      const y = -24 - i * 14, w = 8 - i * 0.35;
      c.fillStyle = i < 2 ? '#38a8f0' : (i % 2 ? '#8a5a32' : '#6e4524');
      c.strokeStyle = '#2a1a0a'; c.lineWidth = 2;
      c.beginPath(); c.roundRect(-w, y - 7, w * 2, 14, 5); c.fill(); c.stroke();
    }
    // マフラー
    const wv = Math.sin(t * 9);
    c.strokeStyle = '#e03131'; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(4, 10); c.bezierCurveTo(30, 0 + wv * 6, 40, -30 - wv * 8, 62, -40 + wv * 10); c.stroke();
    c.beginPath(); c.moveTo(-2, 10); c.bezierCurveTo(-20, -6, -26, -34 + wv * 6, -44, -48 - wv * 8); c.stroke();
    // はね（4まい）
    const f = Math.sin(t * (b.flap ? 50 : 26));
    for (const s of [-1, 1]) {
      c.save(); c.scale(s, 1);
      c.save(); c.translate(10, 2); c.rotate(0.12 + f * 0.1);
      ell(c, 62, 0, 64, 13 + f * 2, 0, 'rgba(220,245,255,.5)', '#456', 2);
      line(c, [[4, 0], [124, -2]], 'rgba(60,80,100,.55)', 1.4);
      ell(c, 112, -2, 7, 4, 0, '#3b4a5a');
      c.restore();
      c.save(); c.translate(10, -16); c.rotate(-0.22 - f * 0.1);
      ell(c, 56, 0, 58, 15 + f * 2, 0, 'rgba(220,245,255,.5)', '#456', 2);
      line(c, [[4, 0], [112, 0]], 'rgba(60,80,100,.55)', 1.4);
      c.restore();
      c.restore();
    }
    ell(c, 0, -2, 18, 24, 0, '#58b84a', '#1a3a14', 3);
    line(c, [[-10, -14], [-4, 10]], '#2a5a20', 3); line(c, [[10, -14], [4, 10]], '#2a5a20', 3);
    // おおきな ふくがん
    for (const s of [-1, 1]) {
      const g = c.createRadialGradient(s * 13 - 4, 22, 2, s * 13, 26, 17);
      g.addColorStop(0, '#9ff5b8'); g.addColorStop(1, '#159a52');
      circ(c, s * 13, 26, 17, g, '#0a3a1a', 3);
      eye(c, s * 13, 28, 8, lookAt(b, s * 13, 28), true, s);
    }
    line(c, [[-5, 44], [0, 41], [5, 44]], '#0a3a1a', 2.4);
  }

  // かまの さきの いち（こうげきの でどころ）
  function armTip(b, s) {
    const a = -s * b.arm * 0.9;
    const x0 = s * 10, y0 = 26, tx = s * 60, ty = 74;
    const dx = tx - x0, dy = ty - y0;
    return [b.x + x0 + dx * Math.cos(a) - dy * Math.sin(a), b.y + y0 + dx * Math.sin(a) + dy * Math.cos(a)];
  }
  // ③ かまきり「カマキリ しょうぐん」: はちまきの さむらい
  function drawKamakiri(c, b, t) {
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) line(c, [[s * 14, -50 + i * 26], [s * 46, -64 + i * 30], [s * 56, -30 + i * 34]], '#2f6a1c', 3.4);
    ell(c, 0, -72, 26, 52, 0, '#6cc04a', '#1f4a14', 3);
    ell(c, 0, -76, 20, 46, 0, '#9bd36a', '#3a7a26', 2);
    line(c, [[0, -118], [0, -34]], '#3a7a26', 1.8);
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) line(c, [[0, -104 + i * 18], [s * 18, -96 + i * 18]], 'rgba(58,122,38,.6)', 1.3);
    c.fillStyle = '#5cb03c'; c.strokeStyle = '#1f4a14'; c.lineWidth = 3;
    c.beginPath(); c.roundRect(-8, -30, 16, 64, 7); c.fill(); c.stroke();
    // かま
    for (const s of [-1, 1]) {
      c.save(); c.translate(s * 10, 26); c.rotate(-s * b.arm * 0.9);
      const pts = [[0, 0], [s * 34, -18], [s * 50, 48]];
      line(c, pts, '#1f4a14', 14); line(c, pts, '#7ad04e', 9);
      // するどい かま
      c.beginPath(); c.moveTo(s * 50, 48); c.quadraticCurveTo(s * 64, 30, s * 42, 0); c.quadraticCurveTo(s * 50, 26, s * 44, 44); c.closePath();
      c.fillStyle = '#c8f0a0'; c.fill(); c.strokeStyle = '#1f4a14'; c.lineWidth = 2.4; c.stroke();
      for (let i = 0; i < 4; i++) line(c, [[s * (38 + i * 3), -6 + i * 13], [s * (32 + i * 3), -2 + i * 13]], '#1f4a14', 2.4);
      c.restore();
    }
    // あたま（さんかく）
    antenna(c, -8, 40, -40, -6 + Math.sin(t * 3) * 4, -10, '#2f6a1c');
    antenna(c, 8, 40, 40, -6 - Math.sin(t * 3) * 4, 10, '#2f6a1c');
    c.beginPath(); c.moveTo(-34, 36); c.quadraticCurveTo(0, 26, 34, 36); c.quadraticCurveTo(14, 58, 0, 74); c.quadraticCurveTo(-14, 58, -34, 36); c.closePath();
    c.fillStyle = '#7ad04e'; c.fill(); c.strokeStyle = '#1f4a14'; c.lineWidth = 3; c.stroke();
    // はちまき
    c.fillStyle = '#e03131'; c.fillRect(-26, 34, 52, 7); c.strokeStyle = '#8a1010'; c.lineWidth = 1.5; c.strokeRect(-26, 34, 52, 7);
    const wv = Math.sin(t * 8) * 5;
    line(c, [[24, 38], [40, 28 + wv], [52, 32 - wv]], '#e03131', 5);
    line(c, [[24, 38], [42, 40 - wv], [50, 48 + wv]], '#e03131', 5);
    for (const s of [-1, 1]) {
      circ(c, s * 27, 46, 10, '#c8f07a', '#1f4a14', 2.6);
      eye(c, s * 26, 47, 6.2, lookAt(b, s * 26, 47), true, s);
    }
    if (b.sayT > 0) ell(c, 0, 62, 5, 4, 0, '#5a1010'); else line(c, [[-4, 62], [4, 62]], '#1f4a14', 2.4);
  }

  // ④ くわがた「ノコギリ クワガタン」: ギザギザの おおあご
  function jawTip(b, s) { const o = b.jaw * 0.5; return [b.x + s * (26 + 30 * Math.sin(o)), b.y + 122 - o * 20]; }
  function drawKuwagata(c, b, t) {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const sw = Math.sin(t * 8 + i * 2) * (b.run ? 6 : 1);
      line(c, [[s * 30, -40 + i * 26], [s * 62, -50 + i * 32 + sw], [s * 72, -22 + i * 34 + sw]], '#1a0c06', 5);
    }
    const g = c.createLinearGradient(-40, -80, 40, 20);
    g.addColorStop(0, '#7a4428'); g.addColorStop(0.5, '#3a1d10'); g.addColorStop(1, '#1e0e06');
    ell(c, 0, -30, 42, 52, 0, g, '#0e0603', 3.4);
    line(c, [[0, -80], [0, 20]], '#0e0603', 2.4);
    ell(c, -16, -50, 7, 22, 0.15, 'rgba(255,230,200,.25)'); ell(c, 18, -48, 5, 16, -0.15, 'rgba(255,230,200,.2)');
    c.fillStyle = '#2a140a'; c.strokeStyle = '#0e0603'; c.lineWidth = 3;
    c.beginPath(); c.roundRect(-38, 6, 76, 32, 12); c.fill(); c.stroke();
    ell(c, -14, 16, 12, 4, 0, 'rgba(255,230,200,.2)');
    c.beginPath(); c.roundRect(-36, 36, 72, 30, 10); c.fill(); c.stroke();
    // おおあご
    for (const s of [-1, 1]) {
      c.save(); c.translate(s * 22, 60); c.rotate(s * b.jaw * 0.5);
      c.beginPath(); c.moveTo(-s * 6, 0); c.bezierCurveTo(s * 34, 18, s * 26, 48, s * 4, 62); c.lineTo(s * 0, 56);
      c.bezierCurveTo(s * 12, 40, s * 12, 22, -s * 8, 12); c.closePath();
      const mg = c.createLinearGradient(0, 0, s * 30, 60); mg.addColorStop(0, '#5a2e18'); mg.addColorStop(1, '#2a140a');
      c.fillStyle = mg; c.fill(); c.strokeStyle = '#0e0603'; c.lineWidth = 2.6; c.stroke();
      for (let i = 0; i < 4; i++) {
        const ty = 18 + i * 9, tx = s * (12 - i * 0.5);
        c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx - s * 7, ty + 3); c.lineTo(tx, ty + 6); c.fillStyle = '#e8d0b0'; c.fill();
      }
      c.restore();
    }
    for (const s of [-1, 1]) eye(c, s * 22, 48, 7, lookAt(b, s * 22, 48), true, s);
    line(c, [[-7, 60], [0, 57], [7, 60]], '#e8d0b0', 2.4);
  }

  // ⑤ ヘラクレス オオカブト: きいろい はねに くろい もよう、ながーい ツノ
  const HERA_SPOTS = [[-26, -60, 6], [-12, -30, 5], [-30, -20, 7], [-20, 0, 4], [24, -54, 7], [12, -22, 5], [30, -10, 6], [18, -76, 4], [-18, -82, 4]];
  function drawHera(c, b, t) {
    if (b.p2) {
      const gl = c.createRadialGradient(0, 0, 20, 0, 0, 130);
      gl.addColorStop(0, 'rgba(255,215,60,.45)'); gl.addColorStop(1, 'rgba(255,215,60,0)');
      circ(c, 0, 0, 130 + Math.sin(t * 8) * 6, gl);
    }
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const sw = Math.sin(t * 8 + i * 2) * (b.run ? 6 : 1);
      line(c, [[s * 34, -40 + i * 28], [s * 68, -52 + i * 34 + sw], [s * 80, -22 + i * 36 + sw]], '#111', 6);
    }
    const g = c.createLinearGradient(-46, -90, 46, 20);
    g.addColorStop(0, '#f0e08a'); g.addColorStop(0.55, '#c9a94a'); g.addColorStop(1, '#8a6a20');
    ell(c, 0, -30, 48, 58, 0, g, '#3a2a08', 3.4);
    HERA_SPOTS.forEach(([x, y, r]) => ell(c, x, y, r, r * 1.3, 0, '#2a1e06'));
    line(c, [[0, -88], [0, 26]], '#3a2a08', 2.4);
    ell(c, -18, -56, 8, 22, 0.15, 'rgba(255,255,240,.35)');
    // むね（くろくて ぴかぴか）
    const pg = c.createRadialGradient(-12, 14, 4, 0, 24, 46);
    pg.addColorStop(0, '#5a5a66'); pg.addColorStop(1, '#0a0a0e');
    c.fillStyle = pg; c.strokeStyle = '#000'; c.lineWidth = 3;
    c.beginPath(); c.roundRect(-44, 4, 88, 42, 18); c.fill(); c.stroke();
    // あたま と したの ツノ
    c.fillStyle = '#121216'; c.beginPath(); c.roundRect(-22, 42, 44, 22, 8); c.fill(); c.stroke();
    // ながい ツノ（むねから）
    c.beginPath(); c.moveTo(-12, 24); c.quadraticCurveTo(-10, 90, -4, 128); c.quadraticCurveTo(0, 138, 6, 126); c.quadraticCurveTo(10, 90, 12, 24); c.closePath();
    const hg = c.createLinearGradient(-12, 0, 12, 0); hg.addColorStop(0, '#000'); hg.addColorStop(0.4, '#4a4a55'); hg.addColorStop(1, '#000');
    c.fillStyle = hg; c.fill(); c.stroke();
    for (let i = 0; i < 9; i++) circ(c, (i % 2 ? 3 : -3), 60 + i * 7, 2, '#e8b830');
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 9, 66); c.lineTo(s * 16, 72); c.lineTo(s * 8, 76); c.fillStyle = '#111'; c.fill(); }
    // め
    for (const s of [-1, 1]) {
      if (b.p2) circ(c, s * 17, 52, 9 + Math.sin(t * 12) * 1.5, 'rgba(255,60,40,.55)');
      eye(c, s * 17, 52, 6, lookAt(b, s * 17, 52), true, s);
    }
  }

  const BOSSES = {
    semi:     { hp: 420, draw: drawSemi,     hit: [[0, -30, 34], [0, 10, 34], [-34, 24, 14], [34, 24, 14]] },
    tonbo:    { hp: 540, draw: drawTonbo,    hit: [[0, 0, 24], [0, 26, 22], [0, -60, 12], [0, -100, 10], [-60, -2, 18], [60, -2, 18]] },
    kamakiri: { hp: 680, draw: drawKamakiri, hit: [[0, -70, 30], [0, 0, 16], [0, 50, 26]] },
    kuwagata: { hp: 820, draw: drawKuwagata, hit: [[0, -30, 42], [0, 34, 34], [-26, 88, 12], [26, 88, 12]] },
    hera:     { hp: 1250, draw: drawHera,    hit: [[0, -30, 48], [0, 30, 36], [0, 84, 12], [0, 116, 9]], phase2: true },
  };

  // ===== てきの たま =====
  const BR = { ball: 6, note: 6, drop: 5, ring: 6, leaf: 6, blade: 15, chip: 6, gold: 6, big: 10, dust: 5 };
  const BCOL = { ball: '#ff5c8a', note: '#d633ff', drop: '#ffd43b', ring: '#22c6f0', leaf: '#5bd13a', chip: '#c07a3a', gold: '#ffc400', big: '#ff7a1a', dust: '#e8c07a' };
  function drawBullet(c, b) {
    const col = BCOL[b.kind] || '#ff5c8a';
    c.save(); c.translate(b.x, b.y);
    if (b.kind !== 'blade' && b.kind !== 'note') circ(c, 0, 0, (BR[b.kind] || 6) + 4, 'rgba(255,255,255,.5)');
    switch (b.kind) {
      case 'note':
        circ(c, 0, 0, 8.5, 'rgba(255,255,255,.55)');
        ell(c, -1, 2, 5, 4, -0.4, col, '#3a0050', 1.8);
        line(c, [[3, 1], [3, -10], [8, -6]], '#3a0050', 2.2);
        break;
      case 'drop': {
        const a = Math.atan2(b.vy, b.vx) - Math.PI / 2;
        c.rotate(a);
        c.beginPath(); c.moveTo(0, 8); c.quadraticCurveTo(6, -2, 0, -6); c.quadraticCurveTo(-6, -2, 0, 8);
        c.fillStyle = col; c.fill(); c.strokeStyle = '#7a5a00'; c.lineWidth = 1.8; c.stroke();
        circ(c, -1.5, -1, 1.6, '#fff');
        break;
      }
      case 'leaf':
        c.rotate(Math.atan2(b.vy, b.vx));
        ell(c, 0, 0, 9, 4.5, 0, col, '#1a5a10', 1.8); line(c, [[-8, 0], [8, 0]], '#1a5a10', 1.2);
        break;
      case 'blade':
        c.rotate(b.t * 14);
        c.beginPath(); c.arc(0, 0, 17, 0.2, Math.PI * 1.5); c.arc(5, -3, 11, Math.PI * 1.5, 0.2, true); c.closePath();
        c.fillStyle = '#d8f8b0'; c.fill(); c.strokeStyle = '#1f4a14'; c.lineWidth = 2.6; c.stroke();
        break;
      case 'chip':
        c.rotate(b.t * 8);
        c.fillStyle = col; c.strokeStyle = '#4a2a0a'; c.lineWidth = 1.8;
        c.beginPath(); c.moveTo(-6, -4); c.lineTo(5, -6); c.lineTo(7, 4); c.lineTo(-4, 6); c.closePath(); c.fill(); c.stroke();
        break;
      default: {
        const r = BR[b.kind] || 6;
        circ(c, 0, 0, r + 2.5, 'rgba(255,255,255,.5)');
        circ(c, 0, 0, r, col, 'rgba(40,0,20,.85)', 1.8);
        circ(c, -r * 0.25, -r * 0.25, r * 0.4, '#fff');
      }
    }
    c.restore();
  }

  // ===================================================================
  //  はいけい（ステージごと）
  // ===================================================================
  const BG = {
    forest: { top: '#5aa83e', bot: '#8acb62', step: [26, 60] },
    pond:   { top: '#2a86c0', bot: '#5cc0e2', step: [40, 80] },
    grass:  { top: '#86c24e', bot: '#b8e07a', step: [16, 36] },
    night:  { top: '#0b1030', bot: '#22305e', step: [40, 90] },
    sky:    { top: '#5a3a9a', bot: '#ff9a5a', step: [60, 120] },
  };
  function addDeco(y) {
    const k = G.bg;
    const d = { x: rand(-20, W + 20), y, s: rand(0.7, 1.3), r: rand(0, TAU), sp: 1, k };
    if (k === 'forest') { d.kind = Math.random() < 0.55 ? 'bush' : 'leaf'; if (d.kind === 'leaf') d.sp = 1.6; }
    else if (k === 'pond') { d.kind = pick(['pad', 'pad', 'ripple', 'reed']); if (d.kind === 'reed') d.x = Math.random() < 0.5 ? rand(-10, 30) : rand(W - 30, W + 10); }
    else if (k === 'grass') { d.kind = pick(['tuft', 'tuft', 'flower', 'stone']); }
    else if (k === 'night') { d.kind = pick(['tree', 'tree', 'fly', 'fly', 'sap']); if (d.kind === 'fly') d.sp = 0.6; }
    else { d.kind = pick(['cloud', 'cloud', 'spark']); d.sp = d.kind === 'cloud' ? rand(0.6, 1.4) : 2; }
    G.deco.push(d);
  }
  function resetBg(bg) {
    G.bg = bg; G.deco = []; G.scroll = 0;
    const st = BG[bg].step;
    for (let y = H + 60; y > -120; y -= rand(st[0], st[1])) addDeco(y);
    G.deco.sort((a, b) => (a.kind > b.kind ? 1 : -1));
    G.decoT = 0;
  }
  function updateBg(speed) {
    G.scroll += speed;
    for (const d of G.deco) d.y += speed * d.sp;
    G.deco = G.deco.filter(d => d.y < H + 160);
    G.decoT -= speed;
    if (G.decoT <= 0) { const st = BG[G.bg].step; addDeco(-150); G.decoT = rand(st[0], st[1]); }
  }
  function drawDeco(c, d, t) {
    c.save(); c.translate(d.x, d.y); c.scale(d.s, d.s);
    switch (d.kind) {
      case 'bush':
        for (let i = 0; i < 5; i++) { const a = d.r + i * 1.3; circ(c, Math.cos(a) * 22, Math.sin(a) * 16, 26 - i * 2, i % 2 ? '#3d8a2c' : '#468f32'); }
        circ(c, -6, -8, 14, 'rgba(160,230,120,.25)');
        break;
      case 'leaf':
        c.rotate(d.r + t * 0.8); ell(c, 0, 0, 10, 5, 0, '#b6e86a', '#5a9a2a', 1.5); break;
      case 'pad':
        c.rotate(d.r);
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 26, 0.3, TAU - 0.1); c.closePath();
        c.fillStyle = '#4caf50'; c.fill(); c.strokeStyle = '#2e7d32'; c.lineWidth = 2; c.stroke();
        if (d.s > 1.1) { circ(c, 8, -6, 7, '#ffc0e0', '#e66aa8', 1.5); circ(c, 8, -6, 2.5, '#ffe066'); }
        break;
      case 'ripple': {
        const rr = ((t * 20 + d.r * 10) % 40);
        c.globalAlpha = 1 - rr / 40; circ(c, 0, 0, 6 + rr, null, 'rgba(255,255,255,.8)', 2);
        break;
      }
      case 'reed':
        for (let i = 0; i < 4; i++) line(c, [[i * 6 - 9, 30], [i * 7 - 12 + Math.sin(t + i) * 3, -40]], '#3e7a2a', 4);
        ell(c, -2, -30, 4, 12, 0, '#7a4a20');
        break;
      case 'tuft':
        for (let i = 0; i < 5; i++) line(c, [[i * 4 - 8, 8], [i * 6 - 12 + Math.sin(t * 2 + d.r + i) * 2, -14]], i % 2 ? '#5a9a30' : '#4a8a28', 3);
        break;
      case 'flower':
        for (let i = 0; i < 5; i++) circ(c, Math.cos(i * 1.26) * 5, Math.sin(i * 1.26) * 5, 4, '#fff');
        circ(c, 0, 0, 3.5, '#ffd43b');
        break;
      case 'stone': ell(c, 0, 0, 14, 10, d.r, '#b9b29a', '#8a8470', 2); break;
      case 'tree':
        for (let i = 0; i < 5; i++) { const a = d.r + i * 1.3; circ(c, Math.cos(a) * 24, Math.sin(a) * 18, 28 - i * 2, '#14203a'); }
        circ(c, -8, -10, 16, 'rgba(120,150,220,.12)');
        break;
      case 'fly': {
        const a = 0.5 + 0.5 * Math.sin(t * 3 + d.r * 5);
        c.globalAlpha = a; circ(c, Math.sin(t + d.r) * 8, 0, 9, 'rgba(220,255,120,.25)'); circ(c, Math.sin(t + d.r) * 8, 0, 3, '#f4ff9a');
        break;
      }
      case 'sap': ell(c, 0, 0, 8, 12, d.r, 'rgba(220,140,30,.75)', 'rgba(255,200,100,.6)', 1.5); break;
      case 'cloud':
        c.globalAlpha = 0.85;
        for (let i = 0; i < 4; i++) circ(c, i * 18 - 27, Math.sin(i * 2 + d.r) * 6, 18 + (i % 2) * 6, '#ffe2d4');
        break;
      case 'spark': c.globalAlpha = 0.7; line(c, [[0, -8], [0, 8]], '#fff4c0', 2); break;
    }
    c.restore();
  }
  function drawBg(c, t) {
    const b = BG[G.bg];
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, b.top); g.addColorStop(1, b.bot);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (G.bg === 'forest') {
      c.fillStyle = 'rgba(255,255,200,.08)';
      for (let i = 0; i < 4; i++) { const x = ((i * 120 + G.scroll * 0.2) % 520) - 80; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 50, 0); c.lineTo(x - 70, H); c.lineTo(x - 120, H); c.fill(); }
    } else if (G.bg === 'night') {
      circ(c, 300, 70, 30, '#fff7c8'); circ(c, 312, 62, 26, b.top);
      for (let i = 0; i < 30; i++) circ(c, (i * 97) % W, (i * 53 + G.scroll * 0.1) % H, 1.2, 'rgba(255,255,255,.6)');
    } else if (G.bg === 'sky') {
      circ(c, 70, H - 120, 46, 'rgba(255,200,120,.6)');
    } else if (G.bg === 'grass') {
      c.fillStyle = 'rgba(80,140,40,.12)';
      for (let i = 0; i < 6; i++) { const y = ((i * 130 + G.scroll) % 780) - 140; c.fillRect(0, y, W, 50); }
    }
    for (const d of G.deco) drawDeco(c, d, t);
  }

  // ===================================================================
  //  てき・たま・アイテムを だす
  // ===================================================================
  function spawn(type, x, y, o = {}) {
    const d = ETYPES[type];
    const e = Object.assign({
      type, x, y, x0: x, y0: y, t: 0, vx: 0, vy: 1.6, ax: 0, ay: 0,
      hp: Math.round(d.hp + G.stage * d.up), r: d.r, ph: Math.random() * TAU,
      fireT: rand(0.6, 1.4), flash: 0, amp: 0, drop: null, mode: 0,
    }, o);
    G.en.push(e);
    return e;
  }
  function eb(x, y, ang, spd, kind, o) {
    const s = spd * G.bs;
    const b = { x, y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, kind, r: BR[kind] || 6, t: 0 };
    if (o) Object.assign(b, o);
    G.eb.push(b);
    return b;
  }
  const aim = (x, y) => Math.atan2(P.y - y, P.x - x);
  const N = n => Math.max(3, Math.round(n * G.dens));
  function ringB(x, y, n, spd, kind, off = 0) { const m = N(n); for (let i = 0; i < m; i++) eb(x, y, off + i * TAU / m, spd, kind); }
  function fan(x, y, ang, n, stepA, spd, kind) {
    const m = G.easy ? Math.max(1, n - (n > 3 ? 2 : 0)) : n;
    for (let i = 0; i < m; i++) eb(x, y, ang + (i - (m - 1) / 2) * stepA, spd, kind);
  }

  // ===== ウェーブ（てきの でかた）=====
  const WAVES = {
    line(ev, t, r, drop) {
      const x = 50 + r() * 260, amp = 20 + r() * 30;
      for (let i = 0; i < 5; i++) ev.push({ t: t + i * 0.3, f: () => spawn('hae', x, -20, { amp, vy: 1.8, drop: i === 4 ? drop : null }) });
      return 2.4;
    },
    pair(ev, t, r, drop) {
      for (let i = 0; i < 4; i++) for (const x of [90, 270]) {
        ev.push({ t: t + i * 0.32, f: () => spawn('hae', x, -20, { amp: 16, vy: 2, ph: i, drop: (i === 3 && x === 90) ? drop : null }) });
      }
      return 2.4;
    },
    vee(ev, t, r, drop) {
      for (let k = -2; k <= 2; k++) ev.push({ t: t + Math.abs(k) * 0.18, f: () => spawn('ka', W / 2 + k * 45, -20, { vy: 2.5, mode: 1, drop: k === 0 ? drop : null }) });
      return 2.2;
    },
    swoop(ev, t, r, drop) {
      const s = r() < 0.5 ? 1 : -1;
      for (let i = 0; i < 6; i++) ev.push({ t: t + i * 0.22, f: () => spawn('ka', s > 0 ? -20 : W + 20, 60, { vx: 3.2 * s, vy: 0.4, ay: 0.035, drop: i === 5 ? drop : null }) });
      return 2.6;
    },
    turret(ev, t, r, drop) {
      const xs = r() < 0.5 ? [100, 260] : [70, 180, 290];
      xs.forEach((x, i) => ev.push({ t: t + i * 0.4, f: () => spawn('hachi', x, -24, { vy: 0, stopY: 110 + (i % 2) * 60, drop: i === 0 ? drop : null }) }));
      return 3.6;
    },
    zig(ev, t, r, drop) {
      for (let i = 0; i < 4; i++) ev.push({ t: t + i * 0.45, f: () => spawn('ga', 70 + (i % 2) * 220, -24, { amp: 70, vy: 1.1, drop: i === 3 ? drop : null }) });
      return 3.2;
    },
    tank(ev, t, r, drop) {
      const x = 110 + r() * 140;
      ev.push({ t, f: () => spawn('kanabun', x, -30, { vy: 0.65, drop: drop || 'p' }) });
      for (let i = 0; i < 2; i++) for (const s of [-1, 1]) ev.push({ t: t + 0.5 + i * 0.4, f: () => spawn('hae', x + s * 60, -20, { amp: 10, vy: 1.6 }) });
      return 3.8;
    },
    mix(ev, t, r, drop) {
      WAVES.turret(ev, t, r, drop);
      WAVES.swoop(ev, t + 1.2, r, null);
      return 4;
    },
  };
  function buildStage(si) {
    const ev = [], r = seeded(si * 7919 + 13), st = STAGES[si];
    const len = 40 + si * 5;
    let t = 2.6, n = 0;
    let last = '';
    while (t < len) {
      let p = st.pats[Math.floor(r() * st.pats.length)];
      if (p === last) p = st.pats[(st.pats.indexOf(p) + 1) % st.pats.length];
      last = p;
      const drop = (n % 3 === 1) ? 'p' : null;
      const d = WAVES[p](ev, t, r, drop);
      t += d * (1 - si * 0.04) + 0.5;
      n++;
    }
    ev.push({ t: len + 3, boss: true });
    ev.sort((a, b) => a.t - b.t);
    return ev;
  }

  function updateEnemy(e) {
    e.t += DT;
    if (e.flash > 0) e.flash -= DT;
    switch (e.type) {
      case 'hae':
        e.y += e.vy; e.x = e.x0 + Math.sin(e.t * 3 + e.ph) * e.amp;
        break;
      case 'ka':
        if (e.mode === 1 && e.t < 1) e.vx += clamp((P.x - e.x) * 0.0018, -0.08, 0.08);
        e.vx += e.ax; e.vy += e.ay; e.x += e.vx; e.y += e.vy;
        break;
      case 'hachi':
        if (e.mode === 0) { e.y += (e.stopY - e.y) * 0.05; if (e.t > 1.2) { e.mode = 1; e.t2 = 0; } }
        else if (e.mode === 1) {
          e.x += Math.sin(e.t * 2) * 0.4; e.t2 += DT;
          if (e.t2 > 3.4) e.mode = 2;
        } else { e.vy -= 0.06; e.y += e.vy; }
        break;
      case 'ga':
        e.y += e.vy; e.x = e.x0 + Math.sin(e.t * 1.6) * e.amp * (e.x0 < W / 2 ? 1 : -1);
        break;
      case 'kanabun':
        e.y += e.y < 150 ? e.vy * 1.5 : e.vy * 0.4; e.x += Math.sin(e.t) * 0.3;
        break;
    }
    // こうげき
    if (e.y > 10 && e.y < H * 0.62) {
      e.fireT -= DT;
      if (e.fireT <= 0) {
        const si = G.stage;
        switch (e.type) {
          case 'hae': if (si >= 1 && Math.random() < 0.35) eb(e.x, e.y + 8, aim(e.x, e.y), 2.2, 'ball'); e.fireT = 1.8 * G.fr; break;
          case 'ka': e.fireT = 99; break;
          case 'hachi':
            if (e.mode === 1) { fan(e.x, e.y + 10, aim(e.x, e.y), si >= 2 ? 3 : 1, 0.22, 2.6, 'ball'); }
            e.fireT = 1.0 * G.fr; break;
          case 'ga': eb(e.x, e.y, Math.PI / 2 + rand(-0.5, 0.5), 1.4, 'dust'); e.fireT = 1.2 * G.fr; break;
          case 'kanabun': fan(e.x, e.y + 20, aim(e.x, e.y), 5, 0.25, 2.3, 'big'); e.fireT = 1.7 * G.fr; break;
        }
      }
    }
  }

  function dropItem(x, y, kind) { G.items.push({ x, y, kind, t: 0, vy: -1.5 }); }
  function burst(x, y, col, n, spd, size) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(0.3, 1) * spd;
      G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(0.5, 1) * size, col, life: rand(0.4, 0.8), t: 0 });
    }
  }
  function popText(x, y, text, col = '#fff', size = 14) { G.texts.push({ x, y, text, col, size, t: 0 }); }

  function killEnemy(e) {
    const d = ETYPES[e.type];
    G.score += d.score;
    burst(e.x, e.y, e.type === 'hachi' ? '#ffc61a' : e.type === 'kanabun' ? '#3fd07a' : '#fff', e.type === 'kanabun' ? 26 : 12, 4, 5);
    Snd.play(e.type === 'kanabun' ? 'big' : 'pop');
    popText(e.x, e.y - 10, String(d.score), '#fff', 12);
    if (e.drop) dropItem(e.x, e.y, e.drop);
    else {
      const k = Math.random(), m = G.easy ? 1.6 : 1;
      if (k < 0.03 * m) dropItem(e.x, e.y, 'imo');
      else if (k < 0.055 * m) dropItem(e.x, e.y, 'heart');
      else if (e.type === 'kanabun' || e.type === 'hachi') dropItem(e.x, e.y, 'star');
    }
  }

  // ===================================================================
  //  ボス
  // ===================================================================
  function every(ps, key, pt, iv) {
    if (ps[key] === undefined) ps[key] = 0;
    if (pt >= ps[key]) { ps[key] += iv; return true; }
    return false;
  }
  function moveTo(b, x, y, k) { b.x += (x - b.x) * k; b.y += (y - b.y) * k; }
  function say(b, text) { b.say = text; b.sayT = 1.6; Snd.play('say'); }
  const IV = (b, s) => s * G.fr / (b.rage || 1);

  // こうげきパターン: (b, pt, ps) → おわったら true
  const PATS = {
    semi: [
      (b, pt, ps) => { // ミーン リング
        if (pt === DT) say(b, 'ミーーン！');
        moveTo(b, W / 2 + Math.sin(b.t) * 50, b.ty, 0.04);
        b.flap = true;
        if (every(ps, 'f', pt, IV(b, 0.7))) {
          ps.n = (ps.n || 0) + 1;
          ringB(b.x, b.y + 30, 16, 2.1, 'note', ps.n * 0.2);
          G.parts.push({ ring: true, x: b.x, y: b.y + 30, t: 0, life: 0.6, col: 'rgba(214,51,255,.6)' });
        }
        return pt > 3.4;
      },
      (b, pt, ps) => { // おしっこ シャワー
        if (pt === DT) say(b, 'ちょろろ〜');
        b.flap = false;
        moveTo(b, W / 2 + Math.sin(b.t * 1.5) * 90, b.ty - 20, 0.03);
        if (pt > 0.4 && every(ps, 'f', pt, IV(b, 0.07))) {
          eb(b.x + rand(-10, 10), b.y + 40, Math.PI / 2 + rand(-1.25, 1.25), rand(1.6, 3.2), 'drop', { ay: 0.045, vmax: 4 });
        }
        return pt > 3.2;
      },
      (b, pt, ps) => { // ジジジッ！ よこに うごいて ねらいうち
        if (pt === DT) { say(b, 'ジジジッ！'); ps.k = 0; }
        b.flap = true;
        const tx = [70, 290, 180, 110, 250][ps.k % 5];
        moveTo(b, tx, b.ty + 10, 0.06);
        if (every(ps, 'm', pt, 0.7)) ps.k++;
        if (every(ps, 'f', pt, IV(b, 0.5))) fan(b.x, b.y + 30, aim(b.x, b.y + 30), 3, 0.25, 3, 'ball');
        return pt > 3.4;
      },
    ],
    tonbo: [
      (b, pt, ps) => { // ジェット ダッシュ
        if (pt === DT) say(b, 'ビューン！');
        const k = Math.floor(pt / 1.0), lt = pt - k;
        if (ps.k !== k) { ps.k = k; ps.tx = k % 2 ? 50 : W - 50; ps.ty = rand(90, 190); }
        if (lt > 0.3) { moveTo(b, ps.tx, ps.ty, 0.12); b.flap = true; if (every(ps, 'f', pt, IV(b, 0.05))) eb(b.x, b.y, Math.PI / 2 + rand(-0.2, 0.2), rand(0.8, 1.4), 'ring', { ay: 0.012, vmax: 3 }); }
        else b.flap = false;
        return pt > 3.9;
      },
      (b, pt, ps) => { // ロックオン ふくがん ビーム
        if (pt === DT) say(b, 'ロックオン！');
        moveTo(b, W / 2, b.ty, 0.05); b.flap = false;
        if (pt > 0.5 && every(ps, 'f', pt, IV(b, 0.8))) {
          for (const s of [-1, 1]) fan(b.x + s * 13, b.y + 26, aim(b.x + s * 13, b.y + 26), 5, 0.16, 3.2, 'ball');
        }
        return pt > 3.2;
      },
      (b, pt, ps) => { // ぐるぐる
        if (pt === DT) { say(b, 'ぐるぐる〜'); ps.a = 0; }
        b.flap = true;
        moveTo(b, W / 2 + Math.cos(pt * 2.2) * 80, 150 + Math.sin(pt * 2.2) * 40, 0.08);
        if (every(ps, 'f', pt, IV(b, 0.09))) {
          ps.a += 0.37;
          eb(b.x, b.y + 20, ps.a, 2.2, 'ring'); eb(b.x, b.y + 20, ps.a + Math.PI, 2.2, 'ring');
          if (!G.easy) eb(b.x, b.y + 20, ps.a + Math.PI / 2, 2.2, 'ring');
        }
        return pt > 3.8;
      },
    ],
    kamakiri: [
      (b, pt, ps) => { // カマ スラッシュ
        if (pt === DT) say(b, 'シャキーン！');
        moveTo(b, W / 2, b.ty, 0.04);
        const half = pt < 1.3 ? -1 : 1, lt = pt < 1.3 ? pt : pt - 1.3;
        b.arm = lt < 0.3 ? lt / 0.3 : Math.max(0, 1 - (lt - 0.3) * 1.2);
        if (lt > 0.3 && lt < 1.1 && every(ps, 'f' + half, lt, IV(b, 0.045))) {
          const [tx, ty] = armTip(b, half);
          const p = (lt - 0.3) / 0.8;
          const a = half < 0 ? 0.25 + p * 2.4 : Math.PI - 0.25 - p * 2.4;
          eb(tx, ty, a, 2.5, 'leaf');
        }
        return pt > 2.7;
      },
      (b, pt, ps) => { // カマ ブーメラン
        if (pt === DT) say(b, 'ブーメラン！');
        b.arm = pt < 0.4 ? pt / 0.4 : Math.max(0, 1 - (pt - 0.4) * 3);
        if (!ps.thrown && pt > 0.4) {
          ps.thrown = true;
          for (const s of [-1, 1]) { const [tx, ty] = armTip(b, s); eb(tx, ty, 0, 0, 'blade', { vx: s * 1.6, vy: 4.2 * G.bs, ay: -0.055 * G.bs, keep: true }); }
        }
        if (pt > 1 && every(ps, 'f', pt, IV(b, 0.7))) fan(b.x, b.y + 50, aim(b.x, b.y + 50), 3, 0.3, 2.5, 'ball');
        return pt > 3.8;
      },
      (b, pt, ps) => { // おいのり → つき
        if (pt === DT) { say(b, 'おいのり…'); ps.y0 = b.y; }
        if (pt < 1.0) { moveTo(b, P.x, b.ty, 0.06); b.warnLine = { x: b.x, w: 70 }; b.arm = 0.15; }
        else if (pt < 1.35) { if (!ps.go) { ps.go = true; say(b, 'てやーっ！'); b.warnLine = null; } b.y += (430 - b.y) * 0.22; b.arm = 1; }
        else if (pt < 1.4) { if (!ps.r) { ps.r = true; ringB(b.x, b.y + 40, 18, 2.2, 'leaf'); G.shake = 0.3; } }
        else { moveTo(b, b.x, b.ty, 0.06); b.arm = 0; }
        return pt > 2.6;
      },
    ],
    kuwagata: [
      (b, pt, ps) => { // チョッキン（はさみ うち）
        if (pt === DT) { say(b, 'チョッキン！'); }
        moveTo(b, W / 2 + Math.sin(pt * 1.2) * 60, b.ty, 0.04);
        b.jaw = 0.5 + Math.sin(pt * 10) * 0.5;
        if (every(ps, 'lock', pt, 1.0)) ps.px = P.x;
        if (every(ps, 'f', pt, IV(b, 0.13))) {
          for (const s of [-1, 1]) { const [tx, ty] = jawTip(b, s); eb(tx, ty, Math.atan2(H + 40 - ty, ps.px - tx), 2.8, 'chip'); }
        }
        return pt > 3.2;
      },
      (b, pt, ps) => { // どすこい とっしん（2かい）
        if (pt === DT) say(b, 'どすこーい！');
        const k = pt < 1.8 ? 0 : 1, lt = pt - k * 1.8;
        if (lt < 0.8) { moveTo(b, P.x, b.ty, 0.07); b.warnLine = { x: b.x, w: 110 }; b.jaw = 1; b.run = false; ps.hit = false; }
        else if (lt < 1.15) { b.warnLine = null; b.run = true; b.y += (440 - b.y) * 0.2; b.jaw = 0; }
        else { b.run = true; moveTo(b, b.x, b.ty, 0.08); if (!ps['r' + k]) { ps['r' + k] = true; ringB(b.x, b.y + 60, 14, 2.4, 'chip', rand(0, 1)); G.shake = 0.35; } }
        return pt > 3.6;
      },
      (b, pt, ps) => { // ガリガリ きくず
        if (pt === DT) say(b, 'ガリガリ！');
        b.run = false; b.jaw = Math.abs(Math.sin(pt * 14));
        moveTo(b, W / 2 + Math.sin(pt * 2) * 90, b.ty, 0.05);
        if (every(ps, 'f', pt, IV(b, 0.08))) eb(b.x, b.y + 100, Math.PI / 2 + rand(-0.9, 0.9), rand(1.8, 3.2), 'chip');
        return pt > 3;
      },
    ],
    hera: [
      (b, pt, ps) => { // ツノ ビーム
        if (pt === DT) say(b, 'ツノ ビーーム！');
        const per = b.p2 ? 1.25 : 1.5;
        const k = Math.floor(pt / per), lt = pt - k * per;
        if (ps.k !== k) { ps.k = k; ps.lx = clamp(P.x, 30, W - 30); }
        b.run = false;
        if (lt < 0.85) { moveTo(b, ps.lx, b.ty, 0.08); b.laser = { x: b.x, warn: true, w: 36 }; }
        else { b.laser = { x: b.x, warn: false, w: 36 }; if (every(ps, 'z' + k, lt, 0.12)) G.shake = 0.1; }
        if (b.p2 && every(ps, 'f', pt, IV(b, 0.9))) ringB(b.x, b.y, 12, 1.8, 'gold', pt);
        return pt > per * 3 - 0.01;
      },
      (b, pt, ps) => { // ツノ とっしん
        if (pt === DT) say(b, 'いくぞーっ！');
        const lt = pt;
        if (lt < 0.8) { moveTo(b, P.x, b.ty, 0.08); b.warnLine = { x: b.x, w: 120 }; }
        else if (lt < 1.15) { b.warnLine = null; b.run = true; b.y += (420 - b.y) * 0.22; }
        else { moveTo(b, b.x, b.ty, 0.07); if (!ps.r) { ps.r = true; ringB(b.x, b.y + 60, 20, 2.3, 'gold'); ringB(b.x, b.y + 60, 10, 1.5, 'big', 0.3); G.shake = 0.4; } }
        return pt > 2.4;
      },
      (b, pt, ps) => { // ゴールデン スパイラル
        if (pt === DT) { say(b, 'ゴールデン スパイラル！'); ps.a = 0; }
        b.run = false;
        moveTo(b, W / 2, b.ty, 0.05);
        if (every(ps, 'f', pt, IV(b, 0.08))) {
          ps.a += 0.26;
          const arms = b.p2 ? 4 : 3;
          for (let i = 0; i < arms; i++) eb(b.x, b.y + 20, ps.a + i * TAU / arms, 2.1, 'gold');
        }
        return pt > 3.6;
      },
      (b, pt, ps) => { // なかま よび（ほんきモード のみ）
        if (!b.p2) return true;
        if (pt === DT) {
          say(b, 'でてこい なかまたち！');
          if (!b.called) { b.called = true; spawn('kanabun', 70, -30, { vy: 0.8, drop: 'imo' }); spawn('kanabun', 290, -30, { vy: 0.8, drop: 'heart' }); }
          else for (let i = 0; i < 4; i++) spawn('hachi', 60 + i * 80, -24, { vy: 0, stopY: 100 + (i % 2) * 50 });
        }
        if (every(ps, 'f', pt, IV(b, 0.6))) fan(b.x, b.y + 90, aim(b.x, b.y + 90), 5, 0.2, 2.6, 'gold');
        return pt > 2.6;
      },
    ],
  };

  function startBoss() {
    const st = STAGES[G.stage], def = BOSSES[st.boss];
    const hp = Math.round(def.hp * (G.easy ? 0.75 : 1));
    G.boss = {
      kind: st.boss, name: st.bossName, x: W / 2, y: -170, ty: st.boss === 'tonbo' ? 160 : 130,
      hp, maxHp: hp, t: 0, enter: 2.6, idle: 0.6, pi: 0, pt: 0, ps: {},
      flash: 0, say: null, sayT: 0, flap: false, arm: 0, jaw: 0, run: false, rage: 1,
      laser: null, warnLine: null, dead: false, deadT: 0, p2: false,
    };
    Snd.music(G.stage === 4 ? 'last' : 'boss');
  }

  function updateBoss(b) {
    b.t += DT;
    if (b.flash > 0) b.flash -= DT;
    if (b.sayT > 0) b.sayT -= DT;
    if (b.dead) {
      b.deadT += DT;
      b.y += 0.3; b.x += Math.sin(b.t * 40) * 1.5;
      if (every(b, 'boomT', b.deadT, 0.12)) {
        burst(b.x + rand(-60, 60), b.y + rand(-70, 60), pick(['#fff', '#ffd43b', '#ff8a3a']), 14, 5, 7);
        Snd.play('pop');
      }
      if (b.deadT > 2.4) {
        burst(b.x, b.y, '#fff', 60, 8, 10); Snd.play('boom');
        G.flash = 0.6; G.boss = null;
        G.state = 'clearing'; G.endT = 0;
        Snd.music('clear');
      }
      return;
    }
    if (b.enter > 0) { b.enter -= DT; b.y += (b.ty - b.y) * 0.035; return; }
    if (b.idle > 0) { b.idle -= DT; b.flap = false; b.run = false; b.arm *= 0.9; b.jaw *= 0.9; moveTo(b, W / 2 + Math.sin(b.t * 0.8) * 50, b.ty, 0.04); return; }
    b.pt += DT;
    const pats = PATS[b.kind];
    if (pats[b.pi % pats.length](b, b.pt, b.ps)) {
      b.pi++; b.pt = 0; b.ps = {}; b.idle = 0.8 / b.rage; b.laser = null; b.warnLine = null;
    }
    if (BOSSES[b.kind].phase2 && !b.p2 && b.hp < b.maxHp * 0.5) {
      b.p2 = true; b.rage = 1.3; b.pi = 0; b.pt = 0; b.ps = {}; b.idle = 1.4; b.laser = null; b.warnLine = null;
      say(b, 'ほんきを だすぞ！');
      G.flash = 0.4; G.shake = 0.5;
      for (const x of G.eb) burst(x.x, x.y, '#ffd43b', 2, 2, 3);
      G.eb.length = 0;
    }
  }
  function bossHit(b, x, y, r) {
    const def = BOSSES[b.kind];
    for (const [hx, hy, hr] of def.hit) {
      const dx = x - (b.x + hx), dy = y - (b.y + hy);
      if (dx * dx + dy * dy < (hr + r) * (hr + r)) return true;
    }
    return false;
  }
  function damageBoss(b, dmg) {
    if (b.enter > 0 || b.dead) return;
    b.hp -= dmg; b.flash = 0.06;
    if (b.hp <= 0) {
      b.hp = 0; b.dead = true; b.deadT = 0; b.laser = null; b.warnLine = null;
      b.say = 'まいったーっ！'; b.sayT = 2.4;
      G.score += 10000 * (G.stage + 1);
      popText(b.x, b.y - 40, (10000 * (G.stage + 1)) + '', '#ffd43b', 22);
      for (const x of G.eb) G.items.push({ x: x.x, y: x.y, kind: 'star', t: 0, vy: -1, auto: true });
      G.eb.length = 0;
      for (const e of G.en) killEnemy(e);
      G.en.length = 0;
      P.inv = 5;
    }
  }

  // ===================================================================
  //  にょこすけ
  // ===================================================================
  const keys = {};
  function firePlayer() {
    const lv = G.power, sp = -11;
    const add = (dx, a, dmg = 1) => G.shots.push({ x: P.x + dx, y: P.y - 18, vx: Math.sin(a) * 11, vy: Math.cos(a) * sp, dmg, r: 5, a });
    add(-6, 0); add(6, 0);
    if (lv >= 2) { add(-10, -0.12); add(10, 0.12); }
    if (lv >= 3) { add(-14, -0.26); add(14, 0.26); }
    Snd.play('shot');
  }
  function fireHoming() {
    for (const s of [-1, 1]) G.shots.push({ x: P.x + s * 18, y: P.y, vx: s * 3, vy: -5, dmg: 2.5, r: 7, homing: true, t: 0 });
  }
  function nearestTarget(x, y) {
    let best = null, bd = 1e9;
    for (const e of G.en) { const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (e.y > 0 && d < bd) { bd = d; best = e; } }
    if (G.boss && !G.boss.dead && G.boss.enter <= 0) { const d = (G.boss.x - x) ** 2 + (G.boss.y - y) ** 2; if (d < bd) best = G.boss; }
    return best;
  }

  function hurt() {
    if (P.inv > 0 || G.bombT > 0 || G.state !== 'play') return;
    G.hp--;
    P.inv = 2.4; P.hurtT = 0.9; G.shake = 0.35; G.flash = 0.25;
    Snd.play('hurt');
    burst(P.x, P.y, '#9fe36c', 18, 4, 5);
    // まわりの たまを けして ひとやすみ
    G.eb = G.eb.filter(b => (b.x - P.x) ** 2 + (b.y - P.y) ** 2 > 110 * 110);
    if (G.hp <= 0) {
      G.state = 'dying'; G.endT = 0;
      burst(P.x, P.y, '#ffd43b', 40, 6, 7);
      Snd.play('boom'); Snd.music('over');
    } else {
      popText(P.x, P.y - 30, 'いたっ！', '#ff6b6b', 16);
    }
    updateBombBtn();
  }

  function useBomb() {
    if (G.state !== 'play' || G.paused || G.bombs <= 0 || G.bombT > 0) return;
    G.bombs--; G.bombT = 1.4; P.inv = Math.max(P.inv, 1.6);
    Snd.play('bomb');
    popText(P.x, P.y - 40, 'ぷっ！', '#fff59a', 30);
    for (const e of G.en) { e.hp -= 40; e.flash = 0.1; }
    if (G.boss) damageBoss(G.boss, G.easy ? 60 : 45);
    updateBombBtn();
  }

  function collect(it) {
    switch (it.kind) {
      case 'p':
        if (G.power < 4) { G.power++; popText(it.x, it.y - 10, G.power === 4 ? 'パワー マックス！' : 'パワーアップ！', '#ffd43b', 15); Snd.play('power'); }
        else { G.score += 1000; popText(it.x, it.y - 10, '1000', '#ffd43b'); Snd.play('item'); }
        break;
      case 'heart':
        if (G.hp < G.maxHp) { G.hp++; popText(it.x, it.y - 10, 'げんき！', '#ff8fab', 15); }
        else { G.score += 1000; popText(it.x, it.y - 10, '1000', '#ff8fab'); }
        Snd.play('heart'); break;
      case 'imo':
        if (G.bombs < 5) { G.bombs++; popText(it.x, it.y - 10, 'ボム＋1', '#ffb066', 15); }
        else { G.score += 1000; popText(it.x, it.y - 10, '1000', '#ffb066'); }
        Snd.play('item'); updateBombBtn(); break;
      case 'star': G.score += 100; Snd.play('item'); break;
    }
  }

  // ===================================================================
  //  1コマ すすめる
  // ===================================================================
  function step() {
    G.t += DT;
    if (G.flash > 0) G.flash -= DT;
    if (G.shake > 0) G.shake -= DT;
    const playing = G.state === 'play';
    updateBg(G.state === 'title' ? 1.0 : (G.boss ? 0.7 : 1.3));

    // うごく
    if (playing || G.state === 'clearing') {
      let mx = 0, my = 0;
      if (keys.ArrowLeft || keys.KeyA) mx -= 1;
      if (keys.ArrowRight || keys.KeyD) mx += 1;
      if (keys.ArrowUp || keys.KeyW) my -= 1;
      if (keys.ArrowDown || keys.KeyS) my += 1;
      if (mx || my) { const l = Math.hypot(mx, my); P.x += mx / l * 4.6; P.y += my / l * 4.6; }
      if (G.state === 'clearing') { G.endT += DT; if (G.endT > 1.5) P.y -= (G.endT - 1.5) * 9; }
      else { P.x = clamp(P.x, 14, W - 14); P.y = clamp(P.y, 40, H - 40); }
      P.tilt += ((P.x - (P.px ?? P.x)) * 0.25 - P.tilt) * 0.2; P.px = P.x;
      P.tilt = clamp(P.tilt, -2, 2);
    } else if (G.state === 'title') {
      P.x = W / 2 + Math.sin(G.t * 0.9) * 60; P.y = H - 150 + Math.sin(G.t * 1.7) * 14;
      P.tilt = Math.cos(G.t * 0.9) * 0.9;
    }
    if (P.inv > 0) P.inv -= DT;
    if (P.hurtT > 0) P.hurtT -= DT;
    // おしりから ぷっぷっ
    if (G.state !== 'dying' && G.state !== 'over') {
      P.puffT -= DT;
      if (P.puffT <= 0) { P.puffT = 0.07; G.parts.push({ x: P.x + rand(-3, 3), y: P.y + 55, vx: rand(-0.4, 0.4), vy: 2.2, r: rand(3, 5), grow: 0.25, col: 'rgba(240,255,190,.7)', life: 0.45, t: 0 }); }
    }

    if (playing) {
      // うつ
      P.fireT -= DT;
      if (P.fireT <= 0) { firePlayer(); P.fireT = 0.1; }
      if (G.power >= 4) { P.homT -= DT; if (P.homT <= 0) { fireHoming(); P.homT = 0.32; } }

      // ステージの すすみ
      if (G.intro > 0) G.intro -= DT;
      G.st += DT;
      while (G.evi < G.events.length && G.events[G.evi].t <= G.st) {
        const ev = G.events[G.evi++];
        if (ev.boss) { G.warn = 3.2; Snd.music(''); Snd.play('warn'); }
        else ev.f();
      }
      if (G.warn > 0) { G.warn -= DT; if (G.warn <= 0) startBoss(); }
    }

    // にょこすけの たま
    for (const s of G.shots) {
      if (s.homing) {
        s.t += DT;
        const tg = nearestTarget(s.x, s.y);
        if (tg) {
          const a = Math.atan2(tg.y - s.y, tg.x - s.x), sp = 8;
          s.vx += (Math.cos(a) * sp - s.vx) * 0.12; s.vy += (Math.sin(a) * sp - s.vy) * 0.12;
        } else s.vy -= 0.4;
      }
      s.x += s.vx; s.y += s.vy;
    }
    G.shots = G.shots.filter(s => s.y > -30 && s.y < H + 30 && s.x > -30 && s.x < W + 30 && !s.dead && (!s.homing || s.t < 2.5));

    // てき
    for (const e of G.en) updateEnemy(e);
    for (const s of G.shots) {
      for (const e of G.en) {
        if (e.hp <= 0) continue;
        const dx = s.x - e.x, dy = s.y - e.y;
        if (dx * dx + dy * dy < (e.r + s.r) ** 2) {
          e.hp -= s.dmg; e.flash = 0.06; s.dead = true; Snd.play('hit');
          break;
        }
      }
      if (!s.dead && G.boss && bossHit(G.boss, s.x, s.y, s.r)) {
        s.dead = true;
        if (G.boss.enter <= 0 && !G.boss.dead) { damageBoss(G.boss, s.dmg); if (Math.random() < 0.3) burst(s.x, s.y, '#fff', 2, 2, 3); Snd.play('hit'); }
      }
    }
    G.en = G.en.filter(e => {
      if (e.hp <= 0) { killEnemy(e); return false; }
      return e.y < H + 50 && e.y > -90 && e.x > -70 && e.x < W + 70;
    });

    // ボス
    if (G.boss) {
      updateBoss(G.boss);
      const b = G.boss;
      if (b && playing && !b.dead && b.enter <= 0) {
        if (bossHit(b, P.x, P.y, -2)) hurt();
        if (b.laser && !b.laser.warn && Math.abs(P.x - b.laser.x) < b.laser.w / 2 - 3 && P.y > b.y + 100) hurt();
      }
    }

    // てきの たま
    for (const b of G.eb) {
      b.t += DT;
      if (b.ay) b.vy += b.ay;
      if (b.vmax && b.vy > b.vmax) b.vy = b.vmax;
      b.x += b.vx; b.y += b.vy;
    }
    G.eb = G.eb.filter(b => b.x > -40 && b.x < W + 40 && b.y < H + 40 && (b.y > -40 || (b.keep && b.t < 0.5)));
    if (G.bombT > 0) {
      G.bombT -= DT;
      for (const b of G.eb) G.items.push({ x: b.x, y: b.y, kind: 'star', t: 0, vy: -1, auto: true });
      G.eb.length = 0;
    }
    if (playing) {
      for (const b of G.eb) {
        const dx = b.x - P.x, dy = b.y - P.y, rr = b.r * 0.8 + 4;
        if (dx * dx + dy * dy < rr * rr) { hurt(); break; }
      }
      for (const e of G.en) {
        const dx = e.x - P.x, dy = e.y - P.y, rr = e.r * 0.7 + 5;
        if (dx * dx + dy * dy < rr * rr) { hurt(); break; }
      }
    }

    // アイテム
    for (const it of G.items) {
      it.t += DT;
      const dx = P.x - it.x, dy = P.y - it.y, d = Math.hypot(dx, dy);
      if (it.auto || G.state === 'clearing' || (playing && d < 80)) {
        const sp = it.auto ? 9 : 6;
        it.x += dx / (d || 1) * sp; it.y += dy / (d || 1) * sp;
      } else { it.vy = Math.min(it.vy + 0.05, 1.3); it.y += it.vy; }
      if (d < 22 && (playing || G.state === 'clearing')) { it.got = true; collect(it); }
    }
    G.items = G.items.filter(it => !it.got && it.y < H + 30);

    // こまかい もの
    for (const p of G.parts) { p.t += DT; if (!p.ring) { p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; if (p.grow) p.r += p.grow; } }
    G.parts = G.parts.filter(p => p.t < p.life);
    for (const tx of G.texts) { tx.t += DT; tx.y -= 0.6; }
    G.texts = G.texts.filter(tx => tx.t < 1.1);

    if (G.state === 'dying') { G.endT += DT; if (G.endT > 1.8) showPanel('over'); }
    if (G.state === 'clearing' && G.endT > 3.2) stageClear();
  }

  // ===================================================================
  //  えがく
  // ===================================================================
  let cw = 0, ch = 0, dpr = 1, sc = 1, ox = 0, oy = 0;
  function resize() {
    const r = stageEl.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = r.width; ch = r.height;
    cv.width = Math.max(1, Math.round(cw * dpr)); cv.height = Math.max(1, Math.round(ch * dpr));
    sc = Math.min(cw / W, ch / H); ox = (cw - W * sc) / 2; oy = (ch - H * sc) / 2;
  }

  function txt(c, s, x, y, size, fill, stroke, align = 'center', lw) {
    c.font = `900 ${size}px "Hiragino Maru Gothic ProN","BIZ UDPGothic","Yu Gothic",system-ui,sans-serif`;
    c.textAlign = align; c.textBaseline = 'middle';
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || size * 0.22; c.lineJoin = 'round'; c.strokeText(s, x, y); }
    c.fillStyle = fill; c.fillText(s, x, y);
  }
  function drawItem(c, it) {
    const bob = Math.sin(it.t * 6) * 2;
    c.save(); c.translate(it.x, it.y + bob);
    if (it.kind === 'star') {
      c.rotate(it.t * 4); c.fillStyle = '#ffe066'; c.strokeStyle = '#b07a00'; c.lineWidth = 1.5;
      c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 3 : 7, a = i * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); c.fill(); c.stroke();
    } else {
      circ(c, 0, 0, 16, 'rgba(255,255,255,.55)');
      if (it.kind === 'p') { circ(c, 0, 0, 13, '#f08c00', '#fff', 3); txt(c, 'P', 0, 1, 17, '#fff'); }
      else { c.font = '22px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(it.kind === 'heart' ? '❤️' : '🍠', 0, 1); }
    }
    c.restore();
  }
  function drawBossFx(c, b, t) {
    if (b.warnLine) {
      c.fillStyle = `rgba(255,40,40,${0.12 + 0.1 * Math.sin(t * 30)})`;
      c.fillRect(b.warnLine.x - b.warnLine.w / 2, b.y, b.warnLine.w, H - b.y);
      txt(c, '！', b.warnLine.x, H - 80, 40, '#ff3b3b', '#fff');
    }
    if (b.laser) {
      const L = b.laser, y0 = b.y + 120;
      if (L.warn) {
        c.strokeStyle = `rgba(255,60,40,${0.5 + 0.5 * Math.sin(t * 40)})`; c.lineWidth = 2; c.setLineDash([10, 8]);
        c.beginPath(); c.moveTo(L.x - L.w / 2, y0); c.lineTo(L.x - L.w / 2, H); c.moveTo(L.x + L.w / 2, y0); c.lineTo(L.x + L.w / 2, H); c.stroke();
        c.setLineDash([]);
      } else {
        const g = c.createLinearGradient(L.x - L.w / 2, 0, L.x + L.w / 2, 0);
        g.addColorStop(0, 'rgba(255,200,40,0)'); g.addColorStop(0.25, 'rgba(255,200,40,.9)'); g.addColorStop(0.5, '#fffbe0');
        g.addColorStop(0.75, 'rgba(255,200,40,.9)'); g.addColorStop(1, 'rgba(255,200,40,0)');
        c.fillStyle = g; c.fillRect(L.x - L.w / 2 - 6 + Math.sin(t * 60) * 2, y0, L.w + 12, H - y0);
        circ(c, L.x, y0, 18 + Math.sin(t * 50) * 3, '#fffbe0');
      }
    }
  }
  function drawSay(c, b) {
    if (!(b.sayT > 0) || !b.say) return;
    c.save();
    c.font = '900 16px "Hiragino Maru Gothic ProN","BIZ UDPGothic",system-ui,sans-serif';
    const w = c.measureText(b.say).width + 22;
    const x = clamp(b.x + 70, 8 + w / 2, W - 8 - w / 2), y = clamp(b.y - 50, 86, H);
    c.globalAlpha = Math.min(1, b.sayT * 4);
    c.fillStyle = '#fff'; c.strokeStyle = '#222'; c.lineWidth = 2.5;
    c.beginPath(); c.roundRect(x - w / 2, y - 16, w, 32, 14); c.fill(); c.stroke();
    txt(c, b.say, x, y + 1, 16, '#222');
    c.restore();
  }
  function heartShape(c, x, y, s, fill) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.moveTo(0, 4); c.bezierCurveTo(-8, -2, -5, -9, 0, -5); c.bezierCurveTo(5, -9, 8, -2, 0, 4);
    c.fillStyle = fill; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke(); c.restore();
  }
  function drawHud(c, t) {
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, W, 34);
    txt(c, 'ステージ' + (G.stage + 1), 8, 17, 13, '#fff', null, 'left');
    txt(c, String(G.score).padStart(7, '0'), W / 2 - 8, 17, 16, '#ffe066', 'rgba(0,0,0,.5)', 'center', 3);
    for (let i = 0; i < G.maxHp; i++) heartShape(c, W - 14 - i * 18, 18, 1.35, i < G.hp ? '#ff4d6d' : 'rgba(255,255,255,.25)');
    // パワー
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.roundRect(6, H - 28, 86, 22, 11); c.fill();
    txt(c, 'P', 18, H - 17, 13, '#ffb84d');
    for (let i = 0; i < 4; i++) circ(c, 34 + i * 15, H - 17, 5.2, i < G.power ? '#ffb84d' : 'rgba(255,255,255,.25)');
    const b = G.boss;
    if (b && b.enter <= 0 || (b && b.enter < 1.5)) {
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(10, 40, W - 20, 22);
      const p = b.hp / b.maxHp;
      const g = c.createLinearGradient(12, 0, W - 12, 0); g.addColorStop(0, '#ff3b3b'); g.addColorStop(1, '#ffb84d');
      c.fillStyle = g; c.fillRect(13, 43, (W - 26) * p, 16);
      if (BOSSES[b.kind].phase2) { c.fillStyle = '#fff'; c.fillRect(13 + (W - 26) * 0.5 - 1, 43, 2, 16); }
      txt(c, b.name, W / 2, 51, 12, '#fff', 'rgba(0,0,0,.7)', 'center', 3);
    }
  }
  function drawOverlayText(c, t) {
    if (G.state === 'play' && G.intro > 0) {
      const a = Math.min(1, G.intro, (2.8 - G.intro) * 3);
      c.save(); c.globalAlpha = clamp(a, 0, 1);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, H / 2 - 70, W, 130);
      txt(c, 'ステージ ' + (G.stage + 1), W / 2, H / 2 - 36, 30, '#ffe066', '#3a2000');
      txt(c, STAGES[G.stage].name, W / 2, H / 2 + 4, 26, '#fff', '#1d3a14');
      txt(c, 'スタート！', W / 2, H / 2 + 40, 18, '#fff', '#1d3a14');
      c.restore();
    }
    if (G.warn > 0) {
      const a = 0.55 + 0.45 * Math.sin(t * 12);
      c.save();
      c.fillStyle = `rgba(200,0,0,${0.18 * a})`; c.fillRect(0, 0, W, H);
      for (const y of [H / 2 - 78, H / 2 + 62]) {
        c.fillStyle = 'rgba(255,40,40,.85)'; c.fillRect(0, y, W, 16);
        c.fillStyle = '#ffe066';
        for (let x = -40 + (t * 120) % 40; x < W; x += 40) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 20, y); c.lineTo(x + 10, y + 16); c.lineTo(x - 10, y + 16); c.fill(); }
      }
      c.globalAlpha = a;
      txt(c, 'WARNING!!', W / 2, H / 2 - 30, 42, '#ff3b3b', '#fff');
      c.globalAlpha = 1;
      txt(c, 'ボスが くるぞ！', W / 2, H / 2 + 10, 22, '#fff', '#600');
      txt(c, STAGES[G.stage].bossName, W / 2, H / 2 + 40, 20, '#ffe066', '#600');
      c.restore();
    }
    if (G.state === 'clearing') {
      const s = Math.min(1, G.endT * 2);
      c.save(); c.translate(W / 2, H / 2 - 40); c.scale(s, s);
      txt(c, 'やったー！', 0, 0, 40, '#ffe066', '#a85d00');
      txt(c, 'ボスを やっつけた！', 0, 42, 20, '#fff', '#1d3a14');
      c.restore();
    }
  }

  function render() {
    const c = ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#10200a'; c.fillRect(0, 0, cw, ch);
    c.save();
    c.translate(ox, oy); c.scale(sc, sc);
    c.beginPath(); c.rect(0, 0, W, H); c.clip();
    if (G.shake > 0) c.translate(rand(-4, 4) * G.shake * 2, rand(-4, 4) * G.shake * 2);
    const t = G.t;
    drawBg(c, t);
    // ぷっぷ
    for (const p of G.parts) if (p.grow) { c.globalAlpha = 1 - p.t / p.life; circ(c, p.x, p.y, p.r, p.col); }
    c.globalAlpha = 1;
    if (G.boss) {
      drawBossFx(c, G.boss, t);
      c.save(); c.translate(G.boss.x, G.boss.y);
      if (G.boss.flash > 0) c.filter = 'brightness(1.8)';
      BOSSES[G.boss.kind].draw(c, G.boss, t);
      c.restore();
    }
    for (const e of G.en) drawEnemy(c, e, t);
    for (const it of G.items) drawItem(c, it);
    // にょこすけの たま
    for (const s of G.shots) {
      if (s.homing) {
        c.save(); c.translate(s.x, s.y); c.rotate(Math.atan2(s.vy, s.vx) + Math.PI / 2);
        ell(c, 0, 0, 4, 8, 0, '#ff9ad1', '#c2387a', 1.5); circ(c, 0, -3, 2, '#fff'); c.restore();
      } else {
        c.save(); c.translate(s.x, s.y); c.rotate(s.a || 0);
        ell(c, 0, 0, 5, 11, 0, 'rgba(255,214,60,.55)'); ell(c, 0, 0, 2.8, 8.5, 0, '#fffbe0');
        c.restore();
      }
    }
    if (G.state !== 'dying' && G.state !== 'over' && !(P.inv > 0 && Math.floor(G.t * 16) % 2 && G.state === 'play')) {
      drawPlayer(c, P.x, P.y, t, P.tilt, P.hurtT > 0 ? 'hurt' : 'normal');
    }
    for (const b of G.eb) drawBullet(c, b);
    for (const p of G.parts) {
      if (p.grow) continue;
      const a = 1 - p.t / p.life;
      if (p.ring) { c.globalAlpha = a; circ(c, p.x, p.y, 10 + p.t * 180, null, p.col, 4); }
      else { c.globalAlpha = a; circ(c, p.x, p.y, p.r * a + 1, p.col); }
    }
    c.globalAlpha = 1;
    if (G.boss) drawSay(c, G.boss);
    if (G.bombT > 0) {
      const p = 1 - G.bombT / 1.4;
      c.save(); c.globalAlpha = Math.min(1, G.bombT * 1.5);
      for (let i = 0; i < 7; i++) {
        const a = i * TAU / 7 + p * 2;
        circ(c, P.x + Math.cos(a) * p * 140, P.y + Math.sin(a) * p * 140 - p * 80, 40 + p * 160, 'rgba(230,240,140,.22)');
      }
      c.restore();
    }
    for (const tx of G.texts) { c.globalAlpha = Math.min(1, (1.1 - tx.t) * 3); txt(c, tx.text, tx.x, tx.y, tx.size, tx.col, 'rgba(0,0,0,.6)', 'center', 3); }
    c.globalAlpha = 1;
    if (G.state !== 'title') drawHud(c, t);
    drawOverlayText(c, t);
    if (G.flash > 0) { c.fillStyle = `rgba(255,255,255,${G.flash})`; c.fillRect(0, 0, W, H); }
    c.restore();
  }

  // ===================================================================
  //  がめんの きりかえ
  // ===================================================================
  const panels = { title: $('titleP'), pause: $('pauseP'), clear: $('clearP'), over: $('overP'), end: $('endP') };
  function showPanel(name) {
    for (const k in panels) panels[k].hidden = k !== name;
    if (name === 'over') G.state = 'over';
    const inGame = !name || name === 'pause';
    $('bombBtn').hidden = !inGame;
    $('pauseBtn').hidden = !inGame;
    $('homeBtn').hidden = inGame;
  }
  function updateBombBtn() { $('bombNum').textContent = G.bombs; $('bombBtn').disabled = G.bombs <= 0; }

  function startStage(si, fresh) {
    Snd.resume();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    G.stage = si;
    G.easy = save.level !== 'normal';
    G.bs = (G.easy ? 0.72 : 1) * (1 + si * 0.06);
    G.fr = G.easy ? 1.45 : 1;
    G.dens = G.easy ? 0.7 : 1;
    G.maxHp = G.easy ? 5 : 3;
    if (fresh) { G.score = 0; G.power = Math.min(4, 1 + Math.ceil(si * 0.75)); }
    G.startScore = G.score; G.startPower = G.power;
    G.hp = G.maxHp; G.bombs = G.easy ? 3 : 2;
    G.shots = []; G.en = []; G.eb = []; G.items = []; G.parts = []; G.texts = [];
    G.events = buildStage(si); G.evi = 0; G.st = 0; G.boss = null; G.warn = 0;
    G.intro = 2.8; G.bombT = 0; G.flash = 0; G.shake = 0;
    P.x = W / 2; P.y = H - 110; P.inv = 2.8; P.fireT = 0.5; P.px = P.x;
    resetBg(STAGES[si].bg);
    G.state = 'play'; G.paused = false;
    $('barTitle').textContent = 'ステージ' + (si + 1) + '  ' + STAGES[si].name;
    showPanel(null); updateBombBtn();
    Snd.music(STAGES[si].song, SONG_KEY[si]);
    Snd.play('start');
  }
  function stageClear() {
    const si = G.stage;
    save.cleared = Math.max(save.cleared, si + 1);
    let rec = false;
    if (G.score > save.best) { save.best = G.score; rec = true; }
    store();
    G.state = 'clear';
    if (si === STAGES.length - 1) {
      $('endScore').textContent = G.score.toLocaleString();
      showPanel('end');
      Snd.music('title');
    } else {
      $('clearScore').textContent = G.score.toLocaleString();
      $('clearBest').textContent = rec ? '🎉 ハイスコア こうしん！' : '';
      $('clearBoss').textContent = ['🌳', '💧', '🌾', '🌙', '☀️'][si] + ' ' + STAGES[si].bossName + ' に かった！';
      $('clearBoss').style.fontSize = '18px';
      showPanel('clear');
    }
    buildTitle();
  }
  function toTitle() {
    G.state = 'title'; G.paused = false; G.boss = null; G.en = []; G.eb = []; G.items = []; G.shots = []; G.texts = [];
    resetBg('forest');
    $('barTitle').textContent = 'にょこすけ シューティング';
    buildTitle(); showPanel('title');
    Snd.music('title');
  }
  function setPause(v) {
    if (G.state !== 'play') return;
    G.paused = v; showPanel(v ? 'pause' : null);
    if (v) Snd.music(''); else if (G.boss) Snd.music(G.stage === 4 ? 'last' : 'boss'); else if (G.warn <= 0) Snd.music(STAGES[G.stage].song, SONG_KEY[G.stage]);
  }

  // ===== タイトルの ステージボタン（ボスの えを ちいさく かく）=====
  function buildTitle() {
    const box = $('stageList');
    box.innerHTML = '';
    STAGES.forEach((st, i) => {
      const open = DEBUG || i <= save.cleared;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'st'; btn.disabled = !open;
      btn.innerHTML = `<span class="num">ステージ${i + 1}</span><canvas width="128" height="128"></canvas><span class="bn">${open ? st.bossName.replace(' ', '<br>') : '？？？'}</span>` +
        (i < save.cleared ? '<span class="mark">⭐</span>' : (!open ? '<span class="mark">🔒</span>' : ''));
      const c = btn.querySelector('canvas').getContext('2d');
      const fake = { x: 0, y: 0, flap: false, arm: 0.2, jaw: 0.3, p2: false, sayT: 0, run: false };
      const scale = { semi: 0.42, tonbo: 0.36, kamakiri: 0.4, kuwagata: 0.42, hera: 0.36 }[st.boss];
      const oy = { semi: 82, tonbo: 92, kamakiri: 82, kuwagata: 64, hera: 70 }[st.boss];
      c.translate(64, oy); c.scale(scale, scale);
      const sx = P.x, sy = P.y; P.x = 0; P.y = 400;
      BOSSES[st.boss].draw(c, fake, 0.3);
      P.x = sx; P.y = sy;
      btn.addEventListener('click', () => { Snd.resume(); Snd.play('tap'); startStage(i, true); });
      box.appendChild(btn);
    });
    document.querySelectorAll('#levelSeg button').forEach(b => b.classList.toggle('on', b.dataset.lv === (save.level === 'normal' ? 'normal' : 'easy')));
  }

  // ===================================================================
  //  そうさ
  // ===================================================================
  let drag = null;
  stageEl.addEventListener('pointerdown', e => {
    if (e.target.closest('.panel, .bomb')) return;
    Snd.resume();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try { stageEl.setPointerCapture(e.pointerId); } catch (_) { /* むし */ }
    e.preventDefault();
  });
  stageEl.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (G.state === 'play' && !G.paused) {
      const k = 1.25 / sc;
      P.x = clamp(P.x + (e.clientX - drag.x) * k, 14, W - 14);
      P.y = clamp(P.y + (e.clientY - drag.y) * k, 40, H - 40);
    }
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const endDrag = e => { if (drag && e.pointerId === drag.id) drag = null; };
  stageEl.addEventListener('pointerup', endDrag);
  stageEl.addEventListener('pointercancel', endDrag);

  $('bombBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); useBomb(); });
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyX' || e.code === 'Space') { useBomb(); e.preventDefault(); }
    if (e.code === 'Escape' || e.code === 'KeyP') setPause(!G.paused);
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (G.state === 'play' && !G.paused) setPause(true); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (G.state === 'play' && !G.paused) setPause(true); Snd.suspend(true); }
    else Snd.suspend(false);
  });

  const soundBtn = $('soundBtn');
  function refreshSound() { soundBtn.textContent = Snd.isOn() ? '🔊' : '🔇'; }
  soundBtn.addEventListener('click', () => {
    Snd.resume(); Snd.setOn(!Snd.isOn()); save.sound = Snd.isOn(); store(); refreshSound();
    if (G.state === 'title') Snd.music('title');
  });
  $('pauseBtn').addEventListener('click', () => setPause(true));
  $('resumeBtn').addEventListener('click', () => setPause(false));
  $('retireBtn').addEventListener('click', toTitle);
  $('nextBtn').addEventListener('click', () => startStage(G.stage + 1, false));
  $('clearTitleBtn').addEventListener('click', toTitle);
  $('retryBtn').addEventListener('click', () => { G.score = G.startScore; G.power = G.startPower; startStage(G.stage, false); });
  $('overTitleBtn').addEventListener('click', toTitle);
  $('endTitleBtn').addEventListener('click', toTitle);
  document.querySelectorAll('#levelSeg button').forEach(b => b.addEventListener('click', () => {
    save.level = b.dataset.lv; store(); Snd.resume(); Snd.play('tap'); buildTitle();
    if (G.state === 'title') Snd.music('title');
  }));
  panels.title.addEventListener('pointerdown', () => { Snd.resume(); if (G.state === 'title' && !Snd.song) Snd.music('title'); });

  // ===================================================================
  //  ループ
  // ===================================================================
  let lastT = 0, acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - lastT) / 1000 || 0); lastT = now;
    if (!G.paused) {
      acc += dt;
      let n = 0;
      while (acc >= DT && n < 4) { step(); acc -= DT; n++; }
      if (n === 4) acc = 0;
    }
    render();
  }

  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stageEl);
  resize();
  refreshSound();
  resetBg('forest');
  buildTitle();
  showPanel('title');
  requestAnimationFrame(frame);

  if (DEBUG) {
    window.__nyokoShoot = {
      G, P, startStage,
      boss() { G.events = [{ t: 0, boss: true }]; G.evi = 0; G.st = 0; G.en = []; },
      bossNow() { G.warn = 0; G.events = []; G.evi = 0; G.intro = 0; startBoss(); G.boss.enter = 0; G.boss.y = G.boss.ty; },
      god() { P.inv = 1e9; },
      kill() { if (G.boss) damageBoss(G.boss, 1e6); },
      step(n = 1) { for (let i = 0; i < n; i++) step(); render(); },
    };
  }
})();
