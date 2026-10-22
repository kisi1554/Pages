// =====================================================================
//  わくせい シューティング — ゲームの しくみ（うごき・あたり・ステージ・ボス・がめん）
//  data.js（データ）/ audio.js（おと）/ render.js（え）の あとに よみこむ
// =====================================================================
'use strict';
(() => {
  const { PLANETS, STAGES, ruby } = window.WK_DATA;
  const D = window.WKDraw, Snd = window.WKSnd;
  const W = 512, H = 288, TAU = Math.PI * 2;
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const LIMIT = { shots: 90, ebul: 200, en: 36, parts: 260, items: 12, haz: 8 };
  const BOSS_AT = 50;          // この びょうすうで ボスが くる
  const DEBUG = /debug/.test(location.hash);

  // ===================================================================
  //  きろく
  // ===================================================================
  const KEY = 'wakusei-shooting.v1';
  let save = { cleared: [], cards: [], hi: 0, best: {}, level: 'normal', sound: true };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') save = Object.assign(save, s);
    if (!Array.isArray(save.cleared)) save.cleared = [];
    if (!Array.isArray(save.cards)) save.cards = [];
    if (!save.best || typeof save.best !== 'object') save.best = {};
  } catch (_) { /* よめなくても あそべる */ }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (_) { /* ほぞん できなくても つづける */ } }
  const isCleared = k => save.cleared.includes(k);
  const unlocked = i => i === 0 || isCleared(STAGES[i - 1].key);
  const secretOpen = () => isCleared('neptune');

  function lvl() {
    return save.level === 'easy'
      ? { hearts: 6, bs: 0.6, fire: 0.55, bossHp: 0.75, push: 0.65, gap: 1.3 }
      : { hearts: 3, bs: 1, fire: 1, bossHp: 1, push: 1, gap: 1 };
  }

  // ===================================================================
  //  じょうたい
  // ===================================================================
  const G = {
    state: 'title', phase: '', paused: false, si: 0, t: 0, time: 0, scroll: 0,
    score: 0, startScore: 0, hearts: 3, maxHearts: 3, bombs: 2, inv: 0,
    weapon: 'normal', wlv: 1, barrier: 0, chibi: 0, carry: null,
    script: [], si2: 0, boss: null, endT: 0,
    msg: '', msgT: 0, banner: '', bannerT: 0,
    wind: { x: 0, y: 0 }, gust: null, storm: 0, belt: 0, beltT: 0, grainT: 0,
    flash: 0, shake: 0, god: false,
  };
  const P = { x: 90, y: H / 2, tx: null, ty: null, fire: 0, cfire: 0, hist: [], kx: 0, ky: 0 };
  let shots = [], ebul = [], enemies = [], items = [], parts = [], hazards = [], vortices = [], moonObj = null;
  const stage = () => STAGES[G.si];

  // ===================================================================
  //  つくる（てき・たま・こな）
  // ===================================================================
  function addEnemy(o) {
    if (enemies.length >= LIMIT.en) return null;
    const e = Object.assign({ kind: 'flyer', x: W + 20, y: H / 2, vx: -90, vy: 0, r: 9, hp: 2, t: 0, seed: Math.random() * 10,
      mv: 'drift', flash: 0, score: 100, rot: 0, vr: 0, entered: false }, o);
    e.maxHp = e.hp; e.by = e.y;
    enemies.push(e);
    return e;
  }
  function fire(x, y, ang, spd, o = {}) {
    if (ebul.length >= LIMIT.ebul) return null;
    const L = lvl();
    const s = spd * L.bs * (0.92 + stage().d * 0.08);
    const b = Object.assign({ x, y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, r: 3.5, col: '#ff4d6d', ay: 0, life: 12 }, o);
    ebul.push(b);
    return b;
  }
  const aim = (x, y) => Math.atan2(P.y - y, P.x - x);
  function fan(x, y, n, spread, spd, ang = aim(x, y), o) {
    for (let i = 0; i < n; i++) fire(x, y, ang + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), spd, o);
  }
  function ring(x, y, n, spd, off = 0, o) { for (let i = 0; i < n; i++) fire(x, y, off + i / n * TAU, spd, o); }
  function part(x, y, n, col, spd = 80, life = 0.6, r = 2) {
    for (let i = 0; i < n && parts.length < LIMIT.parts; i++) {
      const a = Math.random() * TAU, s = spd * (0.3 + Math.random());
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.6), max: life, col, r });
    }
  }
  function boom(x, y, big) {
    part(x, y, big ? 30 : 12, '#ffd43b', big ? 160 : 100, big ? 0.9 : 0.5, big ? 3 : 2);
    part(x, y, big ? 16 : 6, '#ff6b6b', big ? 120 : 70, 0.6, 2.5);
    Snd.play(big ? 'crash' : 'pop');
  }
  function dropItem(kind, x, y) { if (items.length < LIMIT.items) items.push({ kind, x, y, t: 0 }); }
  function say(m, t = 1.4) { G.msg = m; G.msgT = t; }

  // ---- たま けし（ボム・やられ）→ ほしに かわる ----
  function clearBullets(cx, cy, rad, toStar) {
    ebul = ebul.filter(b => {
      if (rad && Math.hypot(b.x - cx, b.y - cy) > rad) return true;
      if (toStar && items.length < LIMIT.items + 30) items.push({ kind: 'star', x: b.x, y: b.y, t: 0 });
      else part(b.x, b.y, 2, '#fff', 40, 0.3);
      return false;
    });
  }

  // ===================================================================
  //  ウェーブ
  // ===================================================================
  const fly = () => stage().key === 'mercury' && Math.random() < 0.3 ? 'rock' : 'flyer';
  function shootRate() { return Math.random() < (save.level === 'easy' ? 0.15 : 0.35); }
  const WAVES = [
    () => { // よこ いちれつ
      const y = rnd(50, H - 50);
      for (let i = 0; i < 5; i++) addEnemy({ x: W + 20 + i * 26, y, vx: -95, mv: 'sine', amp: 18, fq: 3, fireT: shootRate() ? rnd(0.8, 2) : 0 });
    },
    () => { // V の かたち
      const y = rnd(80, H - 80);
      for (let i = 0; i < 5; i++) addEnemy({ x: W + 20 + Math.abs(i - 2) * 24, y: y + (i - 2) * 22, vx: -105, fireT: shootRate() ? rnd(0.8, 2) : 0 });
    },
    () => { // シューター ふたり
      for (const yy of [H * 0.28, H * 0.72]) addEnemy({ kind: 'shooter', x: W + 20, y: yy, vx: -80, r: 12, hp: 6, mv: 'stop', stopX: W * 0.74, hold: 5, fireT: 1, score: 300 });
    },
    () => { // うえ か したから カーブ
      const top = Math.random() < 0.5;
      for (let i = 0; i < 5; i++) addEnemy({ x: W - 40 + i * 20, y: top ? -20 - i * 22 : H + 20 + i * 22, vx: -70, vy: top ? 120 : -120, ay: top ? -110 : 110, mv: 'arc', fireT: shootRate() ? rnd(0.6, 1.6) : 0 });
    },
    () => { // ばらばら
      for (let i = 0; i < 4; i++) addEnemy({ kind: fly(), x: W + 20 + i * 50, y: rnd(30, H - 30), vx: -rnd(70, 110), mv: 'sine', amp: 30, fq: 2, fireT: shootRate() ? rnd(0.6, 2) : 0 });
    },
  ];
  function carrier(kind) {
    addEnemy({ kind: 'carrier', x: W + 20, y: rnd(60, H - 60), vx: -55, r: 12, hp: 5, mv: 'sine', amp: 26, fq: 1.6, drop: kind, score: 300 });
  }
  function spawnRock(big = true, x = W + 30, y = rnd(30, H - 30), vx = -rnd(45, 75), vy = rnd(-20, 20)) {
    return addEnemy({ kind: big ? 'rock' : 'pebble', x, y, vx, vy, r: big ? 15 : 8, hp: big ? 7 : 2, vr: rnd(-2, 2), score: big ? 200 : 80 });
  }

  // ステージの しかけ
  const GIM = {
    rocks: { sched(add) { for (let t = 3; t < 47; t += 2.7) add(t, () => spawnRock()); } },
    geyser: { sched(add) {
      for (let t = 5; t < 47; t += 4.4) add(t, () => addHaz({ kind: 'geyser', x: rnd(W * 0.25, W - 30), w: 30, h: H * 0.62, warn: 1.4, act: 1.3, vx: -24 }));
    } },
    moon: { sched(add) {
      add(13, () => { moonObj = { x: W + 40, y: H * 0.5, r: 30, vx: -18, t: 0 }; say('つきが とおるよ。つきの うしろに かくれよう', 2.5); });
      for (let t = 8; t < 46; t += 9) add(t, () => { for (let i = 0; i < 3; i++) addEnemy({ x: W + 20 + i * 40, y: rnd(30, H - 30), vx: -60, vy: rnd(-15, 15), mv: 'drift', r: 8, hp: 2 }); });
    } },
    storm: { sched(add) {
      for (const t of [12, 31]) add(t, () => { G.storm = 7; say('すなあらしだ！ ながされるよ', 2); Snd.play('alert'); });
      for (let t = 6; t < 46; t += 6) add(t, () => spawnRock(true, W + 30, H - 30 - rnd(0, 40), -rnd(60, 90), 0));
    } },
    vortex: { sched(add) {
      for (const t of [8, 22, 36]) add(t, () => { vortices.push({ x: W + 90, y: rnd(90, H - 90), vx: -26, t: 0 }); say('うずに すいこまれないで！', 2); Snd.play('alert'); });
    } },
    grains: { sched(add) {
      for (const t of [8, 22, 36]) add(t, () => { G.belt = 7; G.beltT = 0; say('わの こおりを よけて すすめ！', 2); Snd.play('alert'); });
    } },
    spin: { sched(add) {
      for (const t of [6, 16, 26, 36, 44]) add(t, () => { for (const yy of [H * 0.3, H * 0.7]) addEnemy({ kind: 'spinner', x: W + 20, y: yy, vx: -45, mv: 'sine', amp: 40, fq: 1.2, r: 11, hp: 7, fireT: 1.2, score: 300 }); });
    } },
    wind: { sched(add) {
      for (let t = 6; t < 47; t += 8) add(t, () => {
        const v = pick([{ x: -1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -0.7, y: -0.7 }, { x: -0.7, y: 0.7 }]);
        G.gust = { x: v.x, y: v.y, t: 0, warn: 1.3, dur: 3.2 }; Snd.play('alert');
      });
    } },
    flare: { sched(add) {
      for (let t = 4; t < 47; t += 3.1) add(t, () => addFlare(rnd(40, W - 50)));
    } },
  };
  function addHaz(h) { if (hazards.length < LIMIT.haz) hazards.push(Object.assign({ t: 0, vx: 0 }, h)); }
  function addFlare(x) { addHaz({ kind: 'flare', x, w: 30, h: H * 0.62, top: Math.random() < 0.5, warn: 1.2, act: 0.9 }); }

  function buildScript() {
    const st = stage(), s = [];
    const add = (t, f) => s.push({ t, f });
    let k = 0;
    for (let t = 2; t < 46; t += 3.4) { add(t, WAVES[(k + G.si) % WAVES.length]); k++; }
    const its = st.items.split('');
    its.forEach((it, i) => add(6 + i * (34 / its.length), () => carrier(it)));
    add(42, () => carrier('H'));
    if (save.level === 'easy') add(24, () => carrier('H'));
    GIM[st.gim].sched(add);
    s.sort((a, b) => a.t - b.t);
    return s;
  }

  // ===================================================================
  //  ボス
  // ===================================================================
  const BOSS_R = { mercury: 34, venus: 34, earth: 26, mars: 30, jupiter: 36, saturn: 34, uranus: 36, neptune: 34, sun: 44 };
  function later(b, dt, f) { b.tasks.push({ t: b.t + dt, f }); }
  function spawnBoss() {
    const st = stage(), hp = Math.round(st.bossHp * lvl().bossHp);
    G.boss = { key: st.key, x: W + 90, y: st.key === 'mars' ? H - 66 : H / 2, r: BOSS_R[st.key], hp, maxHp: hp,
      t: 0, cool: 1.6, step: 0, tasks: [], flash: 0, enter: true, spin: 0, grains: 10, ga: 0, moonA: 0 };
    G.phase = 'boss';
    if (moonObj) moonObj.vx = -90;              // つきは さきに いって もらう
    Snd.music(st.key === 'sun' ? 'lastboss' : 'boss');
  }
  const ROCK_COL = { col: '#b5651d', r: 5 };
  const ATT = {
    mercury: [
      b => { for (let i = 0; i < 3; i++) later(b, i * 0.45, () => fan(b.x - 20, b.y, 5, 0.7, 80)); return 2.4; },
      b => { for (let i = 0; i < 2; i++) later(b, i * 0.5, () => { const a = aim(b.x, b.y); spawnRock(true, b.x - 30, b.y, Math.cos(a) * 85, Math.sin(a) * 85); }); return 2.2; },
      b => { ring(b.x, b.y, 14, 70); later(b, 0.6, () => ring(b.x, b.y, 14, 70, TAU / 28)); return 2.4; },
    ],
    venus: [
      b => { for (let i = 0; i < 3; i++) later(b, i * 0.6, () => fan(b.x - 20, b.y, 3, 0.8, 55, undefined, { r: 7, col: '#ff8800' })); return 2.6; },
      b => { for (let i = 0; i < 14; i++) later(b, i * 0.1, () => fire(rnd(20, W - 110), -6, Math.PI / 2 + rnd(0.1, 0.3), rnd(55, 85), { col: '#c0eb75' })); say('さんせいの あめ！', 1); return 2.8; },
      b => { addHaz({ kind: 'geyser', x: clamp(P.x, 30, W - 30), w: 30, h: H * 0.62, warn: 1.3, act: 1.2, vx: 0 }); fan(b.x - 20, b.y, 5, 1, 70); return 2.6; },
    ],
    earth: [
      b => { addHaz({ kind: 'beam', y: P.y, h: 12, warn: 1.0, act: 0.7 }); later(b, 0.8, () => addHaz({ kind: 'beam', y: P.y, h: 12, warn: 1.0, act: 0.7 })); say('ソーラー ビーム！', 1); return 2.9; },
      b => { for (let i = 0; i < 3; i++) later(b, i * 0.35, () => fan(b.x - 20, b.y, 3, 0.3, 95)); return 2.2; },
      b => { for (let i = 0; i < 3; i++) later(b, i * 0.3, () => fire(b.x - 20, b.y + (i - 1) * 20, Math.PI, 60, { home: 1.3, life: 3.5, r: 4.5, col: '#ffa94d' })); return 2.8; },
    ],
    mars: [
      b => { for (let k = 0; k < 2; k++) later(b, k * 0.8, () => { for (let i = 0; i < 8; i++) fire(b.x, b.y - b.r * 0.6, -Math.PI / 2 - rnd(0.2, 1.2), rnd(110, 170), Object.assign({ ay: 140 }, ROCK_COL)); }); Snd.play('crash'); return 3; },
      b => { G.storm = Math.max(G.storm, 4); ring(b.x, b.y, 10, 65, Math.PI / 2); say('すなあらし！', 1); return 3; },
      b => { fan(b.x - 10, b.y - 10, 7, 1.0, 85); return 2; },
    ],
    jupiter: [
      b => { for (let i = 0; i < 26; i++) later(b, i * 0.08, () => { const a = b.t * 3.2; fire(b.x, b.y, a, 75); fire(b.x, b.y, a + Math.PI, 75); }); return 2.8; },
      b => { const a0 = aim(b.x, b.y); for (let i = 0; i < 18; i++) { const a = a0 + i / 18 * TAU; if (Math.abs(((a - a0 + Math.PI) % TAU + TAU) % TAU - Math.PI) > 0.45) fire(b.x, b.y, a, 70); } return 2.4; },
      b => { for (let i = 0; i < 3; i++) later(b, i * 0.4, () => fan(b.x - 20, b.y, 5, 0.6, 90)); return 2.2; },
    ],
    saturn: [
      b => { if (b.grains > 0) { for (let i = 0; i < b.grains; i++) { const a = b.ga + i / 10 * TAU; fire(b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 60, a, 70, { r: 5, col: '#a5d8ff' }); } b.grains = 0; say('わが とんでくる！', 1); } return 2.6; },
      b => { fan(b.x - 20, b.y, 5, 0.8, 85); later(b, 0.5, () => fan(b.x - 20, b.y, 6, 0.9, 85)); return 2.2; },
      b => { for (let i = 0; i < 12; i++) later(b, i * 0.12, () => fire(rnd(W * 0.3, W), -6, Math.PI * 0.75, rnd(70, 95), { col: '#d0ebff' })); return 2.6; },
    ],
    uranus: [
      b => { for (let i = 0; i < 20; i++) later(b, i * 0.12, () => { for (let k = 0; k < 4; k++) fire(b.x, b.y, b.spin + k * Math.PI / 2, 80, { col: '#66d9e8' }); }); return 3; },
      b => { ring(b.x, b.y, 16, 70, b.spin); later(b, 0.5, () => ring(b.x, b.y, 16, 70, -b.spin)); return 2.4; },
      b => { for (let i = 0; i < 3; i++) later(b, i * 0.4, () => fan(b.x - 20, b.y, 5, 0.6, 90)); return 2.2; },
    ],
    neptune: [
      b => { const v = Math.random() < 0.5 ? -1 : 1; G.gust = { x: -0.4, y: v, t: 0, warn: 1.1, dur: 3 }; Snd.play('alert');
        for (let i = 0; i < 12; i++) later(b, 0.3 + i * 0.15, () => fire(b.x - 20, b.y, Math.PI, 75, { wave: 1, ph: i, col: '#91a7ff' })); return 3.2; },
      b => { fan(b.x - 20, b.y, 7, 1.1, 85); return 1.9; },
      b => { ring(b.x, b.y, 16, 65); later(b, 0.4, () => ring(b.x, b.y, 16, 65, TAU / 32)); return 2.4; },
    ],
    sun: [
      b => { for (let i = 0; i < 3; i++) later(b, i * 0.45, () => addFlare(i === 1 ? clamp(P.x, 30, W - 60) : rnd(30, W - 140))); say('フレアに ちゅうい！', 1); return 2.8; },
      b => { ring(b.x, b.y, 20, 70, b.t); later(b, 0.5, () => ring(b.x, b.y, 20, 70, -b.t)); return 2.4; },
      b => { for (let i = 0; i < 10; i++) later(b, i * 0.1, () => { const up = i % 2 ? -1 : 1; fire(b.x - 10, b.y, Math.PI + up * rnd(0.6, 1.1), rnd(100, 140), { ay: -up * 90, col: '#ff6b00', r: 5 }); }); return 2.6; },
    ],
  };
  function updateBoss(b, dt) {
    b.t += dt; b.flash = Math.max(0, b.flash - dt);
    const homeX = b.key === 'mars' ? W - 95 : W - 85;
    if (b.enter) { b.x -= 70 * dt; if (b.x <= homeX) { b.x = homeX; b.enter = false; } return; }
    if (b.dead) return;
    switch (b.key) {
      case 'mars': break; // かざんは うごかない
      case 'uranus': b.spin += dt * 2.4; b.y = H / 2 + Math.sin(b.t * 1.2) * H * 0.3; b.x = homeX + Math.sin(b.t * 0.7) * 20; break;
      case 'jupiter': b.y = H / 2 + Math.sin(b.t * 0.6) * H * 0.18; break;
      default: b.y = H / 2 + Math.sin(b.t * 0.8) * H * 0.24;
    }
    if (b.key === 'saturn') { b.ga += dt * 1.2; if (b.grains < 10) { b.regrow = (b.regrow || 0) + dt; if (b.regrow > 0.35) { b.regrow = 0; b.grains++; } } }
    if (b.key === 'earth') b.moonA += dt * 1.4;
    for (let i = b.tasks.length - 1; i >= 0; i--) if (b.t >= b.tasks[i].t) { const f = b.tasks[i].f; b.tasks.splice(i, 1); if (!b.dead) f(); }
    b.cool -= dt * (save.level === 'easy' ? 0.75 : 1);
    if (b.cool <= 0) {
      const L = ATT[b.key];
      const half = b.hp < b.maxHp * 0.5;
      b.cool = L[b.step % L.length](b) * (half ? 0.85 : 1);
      b.step++;
    }
  }
  // ボスの まわりの もの（あたりで つかう）
  function bossShields(b) {
    const out = [];
    if (b.key === 'earth') out.push({ x: b.x + Math.cos(b.moonA) * 58, y: b.y + Math.sin(b.moonA) * 58, r: 13 });
    if (b.key === 'saturn') for (let i = 0; i < b.grains; i++) { const a = b.ga + i / 10 * TAU; out.push({ x: b.x + Math.cos(a) * 60, y: b.y + Math.sin(a) * 60, r: 6 }); }
    return out;
  }

  // ===================================================================
  //  あそびの ながれ
  // ===================================================================
  function startStage(i, cont) {
    G.si = i;
    const L = lvl();
    if (!cont) { if (G.state !== 'card' || G.carry == null) G.carry = { weapon: 'normal', wlv: 1, chibi: 0, score: G.state === 'card' ? G.score : 0 }; }
    G.weapon = G.carry.weapon; G.wlv = G.carry.wlv; G.chibi = G.carry.chibi;
    G.score = G.startScore = G.carry.score;
    G.maxHearts = L.hearts; G.hearts = L.hearts; G.bombs = 2; G.inv = 2; G.barrier = 0;
    G.t = 0; G.scroll = 0; G.script = buildScript(); G.si2 = 0; G.boss = null; G.endT = 0;
    G.wind = { x: 0, y: 0 }; G.gust = null; G.storm = 0; G.belt = 0; G.flash = 0; G.shake = 0;
    shots = []; ebul = []; enemies = []; items = []; parts = []; hazards = []; vortices = []; moonObj = null;
    P.x = 90; P.y = H / 2; P.tx = null; P.ty = null; P.hist = [];
    G.state = 'play'; G.phase = 'waves'; G.paused = false;
    const st = stage();
    G.banner = st.secret ? 'かくし ステージ' : `ステージ ${i + 1}`; G.bannerT = 2.6;
    say(`${PLANETS[st.key].kana}  ${st.title}`, 2.6);
    showPanel(null);
    Snd.resume(); Snd.play('start'); Snd.music(st.key);
  }
  function stageClear() {
    const st = stage();
    if (!isCleared(st.key)) save.cleared.push(st.key);
    const isNew = !save.cards.includes(st.key);
    if (isNew) save.cards.push(st.key);
    if (st.key === 'neptune' && !save.cards.includes('pluto')) save.cards.push('pluto');
    save.best[st.key] = Math.max(save.best[st.key] || 0, G.score - G.startScore);
    save.hi = Math.max(save.hi || 0, G.score);
    persist();
    G.carry = { weapon: G.weapon, wlv: G.wlv, chibi: G.chibi, score: G.score };
    G.state = 'card';
    Snd.music('title'); Snd.play('card');
    showCard(st.key, { isNew, after: true });
  }
  function nextIndex() {
    const i = G.si + 1;
    if (i >= STAGES.length) return -1;
    if (STAGES[i].secret && !secretOpen()) return -1;
    return i;
  }

  function hurt() {
    if (G.inv > 0 || G.god || G.phase === 'dying' || G.phase === 'bossdown') return;
    if (G.barrier > 0) return;
    G.hearts--; G.inv = 2.2; G.shake = 0.4; G.flash = 0.25;
    Snd.play('hurt'); part(P.x, P.y, 14, '#ff8787', 120, 0.6);
    clearBullets(P.x, P.y, 70, false);
    if (G.hearts <= 0) {
      G.phase = 'dying'; G.endT = 0; boom(P.x, P.y, true); Snd.play('boom'); Snd.stopMusic();
      save.hi = Math.max(save.hi || 0, G.score); persist();
    }
  }
  function useBomb() {
    if (G.state !== 'play' || G.paused || G.bombs <= 0 || !['waves', 'warn', 'boss'].includes(G.phase)) return;
    G.bombs--; G.flash = 0.6; G.inv = Math.max(G.inv, 1.6); G.shake = 0.5;
    Snd.play('bomb');
    clearBullets(0, 0, 0, true);
    hazards = hazards.filter(h => h.kind === 'geyser' && h.t < h.warn);   // ふきだし まえ だけ のこす
    for (const e of enemies) if (e.hp < 99) damage(e, 20);
    if (G.boss && !G.boss.enter) hitBoss(G.boss, 30);
    refreshBomb();
  }
  function damage(e, d) {
    e.hp -= d; e.flash = 0.08;
    if (e.hp <= 0 && !e.dead) {
      e.dead = true; G.score += e.score; boom(e.x, e.y, e.kind === 'rock' || e.kind === 'shooter');
      if (e.kind === 'rock') { spawnRock(false, e.x, e.y - 6, e.vx * 1.2, -50); spawnRock(false, e.x, e.y + 6, e.vx * 1.2, 50); }
      if (e.drop) dropItem(e.drop, e.x, e.y);
      else if (Math.random() < 0.25) dropItem('star', e.x, e.y);
    }
  }
  function hitBoss(b, d) {
    if (b.dead || b.enter) return;
    G.score += Math.round(Math.min(d, b.hp) * 5);
    b.hp -= d; b.flash = 0.06;
    if (b.hp <= 0) {
      b.hp = 0; b.dead = true; G.phase = 'bossdown'; G.endT = 0; G.inv = 9;
      clearBullets(0, 0, 0, true); hazards = []; G.gust = null; G.storm = 0;
      G.score += 5000 + (G.hearts >= G.maxHearts ? 3000 : 0);
      Snd.play('boom'); Snd.stopMusic();
    }
  }
  function getItem(it) {
    switch (it.kind) {
      case 'star': G.score += 50; Snd.play('hit'); return;
      case 'S': case 'L': {
        const w = it.kind === 'S' ? '3way' : 'laser';
        if (G.weapon === w) G.wlv = Math.min(3, G.wlv + 1); else G.weapon = w;
        say(w === '3way' ? `3ウェイ ショット！ Lv${G.wlv}` : `レーザー！ Lv${G.wlv}`); Snd.play('power'); break;
      }
      case 'B': G.barrier = 12; say('バリア！ たまを ふせぐよ'); Snd.play('barrier'); break;
      case 'C':
        if (G.chibi < 2) { G.chibi++; say('ちびロケットが なかまに なった！'); } else { G.score += 1000; say('ボーナス +1000'); }
        Snd.play('power'); break;
      case 'H':
        if (G.hearts < G.maxHearts) { G.hearts++; say('ハート かいふく！'); } else { G.score += 1000; say('ボーナス +1000'); }
        Snd.play('heart'); break;
    }
    G.score += 200;
  }

  // ===================================================================
  //  うごかす
  // ===================================================================
  function update(dt) {
    G.time += dt;
    if (G.state !== 'play' || G.paused) { G.scroll += dt * 20; return; }
    const st = stage(), L = lvl();
    G.scroll += dt * 60;
    G.inv = Math.max(0, G.inv - dt); G.flash = Math.max(0, G.flash - dt); G.shake = Math.max(0, G.shake - dt);
    G.msgT = Math.max(0, G.msgT - dt); G.bannerT = Math.max(0, G.bannerT - dt);
    G.barrier = Math.max(0, G.barrier - dt);

    // ---- ながれ ----
    if (G.phase === 'waves') {
      G.t += dt;
      while (G.si2 < G.script.length && G.script[G.si2].t <= G.t) G.script[G.si2++].f();
      if (G.t >= BOSS_AT && (enemies.filter(e => e.kind !== 'grain').length === 0 || G.t >= BOSS_AT + 5)) {
        G.phase = 'warn'; G.endT = 0; Snd.stopMusic(); Snd.play('warn');
      }
    } else if (G.phase === 'warn') {
      G.endT += dt; if (G.endT > 2.3) spawnBoss();
    } else if (G.phase === 'bossdown') {
      G.endT += dt;
      const b = G.boss;
      if (b && G.endT < 2 && Math.random() < 0.3) boom(b.x + rnd(-b.r, b.r), b.y + rnd(-b.r, b.r), Math.random() < 0.3);
      if (G.endT > 2.8) { stageClear(); return; }
    } else if (G.phase === 'dying') {
      G.endT += dt; if (G.endT > 1.8) { G.state = 'over'; showPanel('over'); return; }
    }

    // ---- かぜ・うず ----
    let px = 0, py = 0;
    if (G.gust) {
      const g = G.gust; g.t += dt;
      const k = g.t < g.warn ? 0 : Math.min(1, (g.t - g.warn) * 2) * (g.t > g.warn + g.dur - 0.5 ? Math.max(0, (g.warn + g.dur - g.t) * 2) : 1);
      G.wind = { x: g.x * 110 * k * L.push, y: g.y * 95 * k * L.push };
      if (g.t > g.warn + g.dur) { G.gust = null; G.wind = { x: 0, y: 0 }; }
    } else G.wind = { x: 0, y: 0 };
    if (G.storm > 0) {
      G.storm -= dt;
      const k = Math.min(1, G.storm, (7 - G.storm) * 2);
      G.wind.x -= 70 * Math.max(0, k) * L.push;
      if (Math.random() < 0.6 && parts.length < LIMIT.parts) parts.push({ x: W + 5, y: rnd(0, H), vx: -rnd(250, 350), vy: rnd(-10, 10), life: 2, max: 2, col: 'rgba(230,150,90,.8)', r: 1.5, streak: 1 });
    }
    px += G.wind.x; py += G.wind.y;
    for (let i = vortices.length - 1; i >= 0; i--) {
      const v = vortices[i]; v.t += dt; v.x += v.vx * dt;
      const dx = v.x - P.x, dy = v.y - P.y, d = Math.hypot(dx, dy);
      if (d < 150 && d > 1) { const f = (30 + 130 * (1 - d / 150)) * L.push; px += dx / d * f; py += dy / d * f; }
      if (d < 11) hurt();
      if (v.x < -120) vortices.splice(i, 1);
    }
    if (G.boss && G.boss.key === 'jupiter' && !G.boss.enter && !G.boss.dead) {
      const b = G.boss, dx = b.x - P.x, dy = b.y - P.y, d = Math.hypot(dx, dy) || 1;
      px += dx / d * 45 * L.push; py += dy / d * 45 * L.push;
    }

    // ---- ロケット ----
    if (G.phase !== 'dying') {
      let vx = 0, vy = 0;
      if (P.tx != null) {
        vx = (P.tx - P.x) * 11; vy = (P.ty - P.y) * 11;
        const m = Math.hypot(vx, vy); if (m > 560) { vx *= 560 / m; vy *= 560 / m; }
      } else { vx = P.kx * 210; vy = P.ky * 210; }
      P.x = clamp(P.x + (vx + px) * dt, 22, W - 30);
      P.y = clamp(P.y + (vy + py) * dt, 10, H - 10);
      if (moonObj) {
        const dx = P.x - moonObj.x, dy = P.y - moonObj.y, d = Math.hypot(dx, dy);
        if (d < moonObj.r + 8 && d > 0.1) { P.x = moonObj.x + dx / d * (moonObj.r + 8); P.y = moonObj.y + dy / d * (moonObj.r + 8); }
      }
      P.hist.unshift({ x: P.x, y: P.y }); if (P.hist.length > 40) P.hist.length = 40;
      if (['waves', 'warn', 'boss'].includes(G.phase)) shoot(dt);
    }

    // ---- たま（じぶん）----
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.x > W + 10 || s.y < -10 || s.y > H + 10) { shots.splice(i, 1); continue; }
      let hit = false;
      if (moonObj && Math.hypot(s.x - moonObj.x, s.y - moonObj.y) < moonObj.r) hit = true;
      if (!hit) for (const e of enemies) {
        if (e.dead) continue;
        if ((s.x - e.x) ** 2 + (s.y - e.y) ** 2 < (e.r + s.r) ** 2) {
          if (e.hp > 99) { part(s.x, s.y, 2, '#d0ebff', 50, 0.2); Snd.play('hit'); }
          else damage(e, s.dmg);
          hit = true; break;
        }
      }
      const b = G.boss;
      if (!hit && b && !b.dead && !b.enter) {
        for (const sh of bossShields(b)) if ((s.x - sh.x) ** 2 + (s.y - sh.y) ** 2 < (sh.r + s.r) ** 2) { hit = true; part(s.x, s.y, 2, '#fff', 50, 0.2); break; }
        if (!hit && (s.x - b.x) ** 2 + (s.y - b.y) ** 2 < (b.r + s.r) ** 2) { hitBoss(b, s.dmg); hit = true; Snd.play('hit'); }
      }
      if (hit) shots.splice(i, 1);
    }
    // レーザー
    if (G.weapon === 'laser' && ['waves', 'warn', 'boss'].includes(G.phase)) laserHit(dt);

    // ---- てき ----
    const grainOn = G.belt > 0;
    if (grainOn) {
      G.belt -= dt; G.beltT += dt; G.grainT -= dt;
      if (G.grainT <= 0) {
        G.grainT = 0.13;
        const gap = H / 2 + Math.sin(G.beltT * 0.9) * H * 0.28, gw = 44 * L.gap;
        for (let k = 0; k < 2; k++) {
          let y = rnd(4, H - 4); if (Math.abs(y - gap) < gw) y = y < gap ? gap - gw - rnd(0, 10) : gap + gw + rnd(0, 10);
          const big = Math.random() < 0.25;
          addEnemy({ kind: 'grain', x: W + 14, y, vx: -85, r: big ? 10 : rnd(4, 6.5), hp: big ? 999 : 1, vr: rnd(-2, 2), score: 30 });
        }
      }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.dead) { enemies.splice(i, 1); continue; }
      e.t += dt; e.flash = Math.max(0, e.flash - dt); e.rot += e.vr * dt;
      switch (e.mv) {
        case 'sine': e.x += e.vx * dt; e.y = e.by + Math.sin(e.t * e.fq + e.seed) * e.amp; break;
        case 'arc': e.vy += e.ay * dt; e.x += e.vx * dt; e.y += e.vy * dt; break;
        case 'stop':
          if (!e.hold0 && e.x > e.stopX) e.x += e.vx * dt;
          else { e.hold0 = (e.hold0 || 0) + dt; if (e.hold0 > e.hold) e.x += 70 * dt; }
          break;
        default: e.x += e.vx * dt; e.y += e.vy * dt;
      }
      if (e.kind !== 'grain' && st.gim !== 'grains') { e.x += G.wind.x * 0.3 * dt; }
      if (e.x < W - 4) e.entered = true;
      // うつ
      if (e.fireT && e.x < W - 20 && e.x > P.x + 40) {
        e.fireT -= dt * L.fire;
        if (e.fireT <= 0) {
          if (e.kind === 'shooter') { fan(e.x - 8, e.y, 3, 0.35, 85); e.fireT = 1.4; }
          else if (e.kind === 'spinner') { ring(e.x, e.y, 6, 60, e.t * 2, { col: '#66d9e8' }); e.fireT = 1.3; }
          else { fire(e.x - 6, e.y, aim(e.x, e.y), 80); e.fireT = 0; }
        }
      }
      // ぶつかる
      if ((P.x - e.x) ** 2 + (P.y - e.y) ** 2 < (e.r * 0.8 + 4) ** 2) {
        if (G.barrier > 0 && e.hp < 99) damage(e, 99);
        else hurt();
      }
      if (e.x < -40 || (e.entered && e.x > W + 60) || e.y < -80 || e.y > H + 80) enemies.splice(i, 1);
    }

    // ---- ボス ----
    const b = G.boss;
    if (b) {
      updateBoss(b, dt);
      if (!b.dead && !b.enter && (P.x - b.x) ** 2 + (P.y - b.y) ** 2 < (b.r * 0.85 + 4) ** 2) hurt();
      if (!b.dead && !b.enter) for (const sh of bossShields(b)) if ((P.x - sh.x) ** 2 + (P.y - sh.y) ** 2 < (sh.r + 3) ** 2) hurt();
    }

    // ---- てきの たま ----
    for (let i = ebul.length - 1; i >= 0; i--) {
      const o = ebul[i];
      o.life -= dt;
      if (o.home && o.life > 0.5) {
        const want = aim(o.x, o.y), cur = Math.atan2(o.vy, o.vx), sp = Math.hypot(o.vx, o.vy);
        let d = ((want - cur + Math.PI) % TAU + TAU) % TAU - Math.PI;
        const na = cur + clamp(d, -o.home * dt, o.home * dt);
        o.vx = Math.cos(na) * sp; o.vy = Math.sin(na) * sp;
      }
      o.vy += o.ay * dt;
      o.x += o.vx * dt; o.y += (o.vy + (o.wave ? Math.cos(G.time * 4 + o.ph) * 70 : 0)) * dt;
      if (o.life <= 0 || o.x < -20 || o.x > W + 30 || o.y < -40 || o.y > H + 30) { ebul.splice(i, 1); continue; }
      if (moonObj && (o.x - moonObj.x) ** 2 + (o.y - moonObj.y) ** 2 < moonObj.r ** 2) { ebul.splice(i, 1); part(o.x, o.y, 2, '#ddd', 40, 0.3); continue; }
      const d2 = (o.x - P.x) ** 2 + (o.y - P.y) ** 2;
      if (G.barrier > 0 && d2 < 22 * 22) { ebul.splice(i, 1); Snd.play('shield'); part(o.x, o.y, 3, '#99e9f2', 60, 0.3); continue; }
      if (d2 < (o.r + 2.5) ** 2) { ebul.splice(i, 1); hurt(); }
    }

    // ---- しかけ ----
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i]; h.t += dt; if (h.vx) h.x += h.vx * dt;
      if (h.t > h.warn + h.act) { hazards.splice(i, 1); continue; }
      if (h.t > h.warn && G.barrier <= 0) {
        const r = hazRect(h);
        if (P.x > r.x && P.x < r.x + r.w && P.y > r.y && P.y < r.y + r.h) hurt();
      }
      if (h.t > h.warn && h.t - dt <= h.warn) Snd.play('crash');
    }
    if (moonObj) { moonObj.x += moonObj.vx * dt; moonObj.t += dt; if (moonObj.x < -50) moonObj = null; }

    // ---- アイテム ----
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]; it.t += dt;
      const dx = P.x - it.x, dy = P.y - it.y, d = Math.hypot(dx, dy);
      const mag = it.kind === 'star' ? 90 : 60;
      if (d < mag || (it.kind === 'star' && G.phase === 'bossdown')) { it.x += dx / (d || 1) * 260 * dt; it.y += dy / (d || 1) * 260 * dt; }
      else it.x -= (it.kind === 'star' ? 50 : 32) * dt;
      if (d < 16) { getItem(it); items.splice(i, 1); continue; }
      if (it.x < -20 || it.t > 20) items.splice(i, 1);
    }
    // ---- こな ----
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.streak) { p.vx *= 0.96; p.vy *= 0.96; }
      if (p.life <= 0) parts.splice(i, 1);
    }
  }
  function hazRect(h) {
    if (h.kind === 'beam') { const bx = G.boss ? G.boss.x - 30 : W; return { x: 0, y: h.y - h.h / 2, w: bx, h: h.h }; }
    if (h.kind === 'flare') return { x: h.x - h.w / 2, y: h.top ? 0 : H - h.h, w: h.w, h: h.h };
    return { x: h.x - h.w / 2, y: H - h.h, w: h.w, h: h.h };
  }

  function shoot(dt) {
    P.fire -= dt; P.cfire -= dt;
    const add = (x, y, a, dmg = 1, r = 3, spd = 430) => { if (shots.length < LIMIT.shots) shots.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg, r, w: G.weapon }); };
    if (P.fire <= 0 && G.weapon !== 'laser') {
      P.fire = 0.11;
      const x = P.x + 16, y = P.y;
      if (G.weapon === 'normal') {
        if (G.wlv === 1) add(x, y, 0);
        else if (G.wlv === 2) { add(x, y - 4, 0); add(x, y + 4, 0); }
        else { add(x, y - 5, 0); add(x, y + 5, 0); add(x, y, 0, 1.2); }
      } else {
        const sp = G.wlv === 1 ? [-0.18, 0, 0.18] : [-0.32, -0.15, 0, 0.15, 0.32];
        for (const a of sp) add(x, y, a, G.wlv === 3 ? 1.1 : 0.9);
      }
      Snd.play('shot');
    }
    if (G.weapon === 'laser') Snd.play('laser');
    if (P.cfire <= 0 && G.chibi > 0) {
      P.cfire = 0.2;
      for (const c of chibiPos()) add(c.x + 8, c.y, 0, 0.6, 2.5);
    }
  }
  function chibiPos() {
    const out = [];
    for (let i = 0; i < G.chibi; i++) {
      const h = P.hist[Math.min(P.hist.length - 1, 10 + i * 10)] || P;
      out.push({ x: h.x - 6, y: h.y + (i === 0 ? -16 : 16) });
    }
    return out;
  }
  function laserThick() { return [0, 4, 6, 9][G.wlv]; }
  function laserHit(dt) {
    const dps = [0, 14, 19, 25][G.wlv], th = laserThick();
    let endX = W + 10;
    if (moonObj && Math.abs(moonObj.y - P.y) < moonObj.r && moonObj.x > P.x) endX = moonObj.x - moonObj.r;
    for (const e of enemies) {
      if (e.dead || e.x < P.x || e.x > endX + e.r) continue;
      if (Math.abs(e.y - P.y) < e.r + th / 2) {
        if (e.hp > 99) { if (e.x < endX) endX = e.x - e.r; continue; }
        damage(e, dps * dt);
      }
    }
    const b = G.boss;
    if (b && !b.dead && !b.enter && b.x > P.x && b.x - b.r < endX && Math.abs(b.y - P.y) < b.r + th / 2) {
      let blocked = false;
      for (const sh of bossShields(b)) if (sh.x > P.x && sh.x < b.x && Math.abs(sh.y - P.y) < sh.r + th / 2) blocked = true;
      if (!blocked) { hitBoss(b, dps * dt); endX = Math.min(endX, b.x - b.r * 0.6); if (Math.random() < 0.3) part(b.x - b.r, P.y, 1, '#e5dbff', 80, 0.3); }
    }
    G.laserEnd = endX;
  }

  // ===================================================================
  //  えがく
  // ===================================================================
  const cv = $('cv'), ctx = cv.getContext('2d'), stageEl = $('stage');
  let cw = 0, ch = 0, dpr = 1, sc = 1, ox = 0, oy = 0, portrait = false;
  function resize() {
    const r = stageEl.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = r.width; ch = r.height;
    cv.width = Math.max(1, Math.round(cw * dpr)); cv.height = Math.max(1, Math.round(ch * dpr));
    sc = Math.min(cw / W, ch / H);
    ox = (cw - W * sc) / 2;
    const rest = ch - H * sc;
    portrait = ch > cw * 0.9 && rest > 130;       // たてもち: うえに ゲーム、したに そうさ パッド
    oy = portrait ? Math.min(rest * 0.1, 48) : rest / 2;
    document.body.classList.toggle('portrait', portrait);
    stageEl.style.setProperty('--game-bottom', `${Math.round(oy + H * sc)}px`);
  }

  function txt(c, s, x, y, size, fill, stroke, align = 'center') {
    c.font = `900 ${size}px "Hiragino Maru Gothic ProN","BIZ UDPGothic","Yu Gothic",system-ui,sans-serif`;
    c.textAlign = align; c.textBaseline = 'middle';
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = size * 0.22; c.lineJoin = 'round'; c.strokeText(s, x, y); }
    c.fillStyle = fill; c.fillText(s, x, y);
  }
  function heart(c, x, y, s, fill) {
    c.beginPath(); c.moveTo(x, y + s * 0.35);
    c.bezierCurveTo(x - s * 0.6, y - s * 0.05, x - s * 0.35, y - s * 0.55, x, y - s * 0.22);
    c.bezierCurveTo(x + s * 0.35, y - s * 0.55, x + s * 0.6, y - s * 0.05, x, y + s * 0.35);
    c.fillStyle = fill; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
  }
  const ITEM = { S: ['#40c057', '3'], L: ['#7950f2', 'L'], B: ['#15aabf', 'B'], C: ['#fab005', 'C'], H: ['#fa5252', '♥'] };
  function drawItem(c, it) {
    const bob = Math.sin(it.t * 6) * 2;
    if (it.kind === 'star') {
      c.save(); c.translate(it.x, it.y); c.rotate(it.t * 4); c.fillStyle = '#ffe066';
      c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.5 : 5.5, a = i * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.fill(); c.restore(); return;
    }
    const [col, ch2] = ITEM[it.kind];
    D.circ(c, it.x, it.y + bob, 13, 'rgba(255,255,255,.35)');
    D.circ(c, it.x, it.y + bob, 10, col, '#fff', 2.5);
    if (it.kind === 'C') D.drawShip(c, it.x - 1, it.y + bob, G.time, { scale: 0.42, chibi: true });
    else txt(c, ch2, it.x, it.y + bob + 1, 12, '#fff');
  }
  function drawHaz(c, h) {
    const r = hazRect(h), warn = h.t < h.warn;
    if (warn) {
      c.globalAlpha = 0.25 + 0.25 * Math.sin(h.t * 20);
      c.fillStyle = '#ff3b3b'; c.fillRect(r.x, r.y, r.w, r.h);
      c.globalAlpha = 1;
      c.setLineDash([5, 4]); c.strokeStyle = '#ffe066'; c.lineWidth = 1.5; c.strokeRect(r.x, r.y, r.w, r.h); c.setLineDash([]);
      const ix = h.kind === 'beam' ? 30 : h.x, iy = h.kind === 'beam' ? h.y : h.top ? 16 : H - 16;
      D.circ(c, ix, iy, 9, '#ffd43b', '#c92a2a', 2); txt(c, '!', ix, iy + 1, 12, '#c92a2a');
      return;
    }
    const k = Math.min(1, (h.t - h.warn) * 6);
    if (h.kind === 'beam') {
      const g = c.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, 'rgba(255,224,102,.2)'); g.addColorStop(0.5, '#fffbe0'); g.addColorStop(1, 'rgba(255,224,102,.2)');
      c.fillStyle = g; c.fillRect(r.x, r.y + r.h * (1 - k) / 2, r.w, r.h * k);
    } else {
      const hot = h.kind === 'flare';
      const g = c.createLinearGradient(r.x, 0, r.x + r.w, 0);
      g.addColorStop(0, hot ? 'rgba(255,90,0,.2)' : 'rgba(255,170,60,.2)'); g.addColorStop(0.5, hot ? '#fff3bf' : '#ffd8a8'); g.addColorStop(1, hot ? 'rgba(255,90,0,.2)' : 'rgba(255,170,60,.2)');
      c.fillStyle = g;
      const hh = r.h * k;
      c.fillRect(r.x, h.top ? 0 : H - hh, r.w, hh);
      for (let i = 0; i < 3; i++) D.circ(c, r.x + r.w / 2 + Math.sin(G.time * 20 + i) * 6, (h.top ? hh : H - hh) + (h.top ? -1 : 1) * i * 8, 8 - i * 2, hot ? '#ff922b' : '#ffc078');
    }
  }
  function drawVortex(c, v) {
    c.save(); c.translate(v.x, v.y);
    c.rotate(-v.t * 3);
    for (let i = 0; i < 6; i++) {
      c.beginPath(); c.arc(0, 0, 20 + i * 18, i * 1.1, i * 1.1 + 3.6);
      c.strokeStyle = `rgba(${200 - i * 10},${90 + i * 15},${50 + i * 10},${0.75 - i * 0.1})`; c.lineWidth = 7 - i * 0.6; c.stroke();
    }
    c.restore();
    D.circ(c, v.x, v.y, 11, '#7a2b13', '#ffb38a', 2);
    D.eyes(c, v.x, v.y, 7, 1);
  }

  function render() {
    const c = ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#05061a'; c.fillRect(0, 0, cw, ch);
    const key = G.state === 'title' || G.state === 'zukan' ? titleKey() : stage().key;
    const sx = G.shake > 0 ? rnd(-3, 3) : 0, sy = G.shake > 0 ? rnd(-3, 3) : 0;

    if (portrait) drawPad(c);

    c.save();
    c.translate(ox + sx, oy + sy); c.scale(sc, sc);
    c.beginPath(); c.rect(0, 0, W, H); c.clip();
    D.drawBg(c, key, W, H, G.time, G.scroll, { wind: !!(G.gust && G.gust.t > G.gust.warn), windY: G.wind.y });
    if (G.state === 'title' || G.state === 'zukan') {
      D.drawShip(c, 120 + Math.sin(G.time) * 20, H / 2 + Math.sin(G.time * 1.6) * 30, G.time, { scale: 1.6 });
      c.restore(); return;
    }
    for (const h of hazards) drawHaz(c, h);
    for (const v of vortices) drawVortex(c, v);
    if (moonObj) D.drawPlanet(c, 'moon', moonObj.x, moonObj.y, moonObj.r, G.time);
    for (const it of items) drawItem(c, it);
    for (const e of enemies) D.drawEnemy(c, key, e, G.time);
    const b = G.boss;
    if (b && !(b.dead && G.endT > 2)) {
      if (b.key === 'earth' && !b.dead) { const s = bossShields(b)[0]; D.drawPlanet(c, 'moon', s.x, s.y, s.r, G.time); }
      if (b.key === 'saturn') for (const s of bossShields(b)) D.drawEnemy(c, 'saturn', { kind: 'grain', x: s.x, y: s.y, r: s.r, hp: 1, rot: G.time }, G.time);
      D.drawBoss(c, b.key, b, G.time);
    }
    // じぶんの たま
    for (const s of shots) {
      if (s.r < 3) D.circ(c, s.x, s.y, 2.2, '#74c0fc');
      else { c.fillStyle = s.w === '3way' ? '#69db7c' : '#ffe066'; c.fillRect(s.x - 6, s.y - 1.6, 12, 3.2); c.fillStyle = '#fff'; c.fillRect(s.x - 2, s.y - 1, 6, 2); }
    }
    if (G.weapon === 'laser' && ['waves', 'warn', 'boss'].includes(G.phase)) {
      const th = laserThick(), ex = G.laserEnd || W;
      c.fillStyle = 'rgba(151,117,250,.45)'; c.fillRect(P.x + 16, P.y - th, ex - P.x - 16, th * 2);
      c.fillStyle = '#f3f0ff'; c.fillRect(P.x + 16, P.y - th / 3, ex - P.x - 16, th * 2 / 3);
      D.circ(c, P.x + 17, P.y, th * 0.9, '#e5dbff');
    }
    // ロケット
    if (G.phase !== 'dying') {
      for (const cp of chibiPos()) D.drawShip(c, cp.x, cp.y, G.time, { scale: 0.55, chibi: true });
      if (!(G.inv > 0 && Math.floor(G.time * 16) % 2 && G.phase !== 'bossdown')) D.drawShip(c, P.x, P.y, G.time);
      if (G.barrier > 0 && !(G.barrier < 2.5 && Math.floor(G.time * 10) % 2)) {
        D.circ(c, P.x, P.y, 22, 'rgba(102,217,232,.18)', 'rgba(153,233,242,.9)', 2);
      }
      D.circ(c, P.x, P.y, 2.2, '#fff', '#e03131', 1);
    }
    // てきの たま
    for (const o of ebul) {
      D.circ(c, o.x, o.y, o.r + 1.2, o.col);
      D.circ(c, o.x, o.y, o.r * 0.55, '#fff');
    }
    for (const p of parts) {
      c.globalAlpha = Math.max(0, p.life / p.max);
      if (p.streak) { c.fillStyle = p.col; c.fillRect(p.x, p.y, 14, p.r); }
      else D.circ(c, p.x, p.y, p.r, p.col);
    }
    c.globalAlpha = 1;
    if (G.storm > 0) { c.fillStyle = `rgba(190,100,50,${0.28 * Math.min(1, G.storm, 7 - G.storm)})`; c.fillRect(0, 0, W, H); }
    if (G.gust && G.gust.t < G.gust.warn + G.gust.dur) drawWindArrow(c, G.gust);
    if (G.flash > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(0.7, G.flash)})`; c.fillRect(0, 0, W, H); }
    // もじ
    if (G.bannerT > 0) txt(c, G.banner, W / 2, H * 0.36, 28, '#fff', '#3b5bdb');
    if (G.msgT > 0) txt(c, G.msg, W / 2, G.bannerT > 0 ? H * 0.5 : H * 0.18, 16, '#fff', '#1c2c6b');
    if (G.phase === 'warn' && Math.floor(G.endT * 4) % 2 === 0) {
      c.fillStyle = 'rgba(224,49,49,.35)'; c.fillRect(0, H / 2 - 24, W, 48);
      txt(c, 'ボスが くるよ！', W / 2, H / 2, 26, '#fff', '#c92a2a');
    }
    c.restore();
    drawHud(c);
  }
  function drawWindArrow(c, g) {
    const k = g.t < g.warn ? (Math.floor(g.t * 6) % 2 ? 1 : 0.4) : 0.55;
    c.save(); c.globalAlpha = k;
    c.translate(W / 2, H / 2); c.rotate(Math.atan2(g.y, g.x));
    c.fillStyle = '#e7f5ff'; c.strokeStyle = '#1c7ed6'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-40, -10); c.lineTo(15, -10); c.lineTo(15, -24); c.lineTo(45, 0); c.lineTo(15, 24); c.lineTo(15, 10); c.lineTo(-40, 10); c.closePath();
    c.stroke(); c.fill();
    c.restore();
    if (g.t < g.warn) txt(c, 'かぜが くるよ！', W / 2, H / 2 + 40, 16, '#fff', '#1c7ed6');
  }
  function drawPad(c) {
    const top = oy + H * sc + 52, bot = ch - 12;
    if (bot - top < 80) return;
    const x = 16, w = cw - 32;
    c.fillStyle = 'rgba(76,110,245,.12)'; c.strokeStyle = 'rgba(145,167,255,.35)'; c.lineWidth = 2;
    c.beginPath(); c.roundRect ? c.roundRect(x, top, w, bot - top, 22) : c.rect(x, top, w, bot - top); c.fill(); c.stroke();
    if (G.state === 'play') {
      const cx = x + w * 0.4, cy = (top + bot) / 2;
      c.globalAlpha = 0.55;
      txt(c, 'ここを ゆびで なぞっても うごくよ', cx, top + 22, 14, '#dbe4ff');
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        c.save(); c.translate(cx + dx * 40, cy + dy * 40); c.rotate(Math.atan2(dy, dx));
        c.fillStyle = '#91a7ff'; c.beginPath(); c.moveTo(12, 0); c.lineTo(-6, -10); c.lineTo(-6, 10); c.fill(); c.restore();
      }
      D.circ(c, cx, cy, 14, 'rgba(145,167,255,.5)');
      c.globalAlpha = 1;
    }
  }
  function drawHud(c) {
    if (G.state !== 'play') return;
    const s = clamp(sc, 0.9, 1.6);
    const hx = ox + 8, hy = portrait ? oy + H * sc + 20 : oy + 16 * s;
    for (let i = 0; i < G.maxHearts; i++) heart(c, hx + 10 * s + i * 20 * s, hy, 16 * s, i < G.hearts ? '#ff4d6d' : 'rgba(255,255,255,.2)');
    txt(c, `${G.score}`, ox + W * sc - 10, hy, 16 * s, '#fff', '#1c2c6b', 'right');
    // ぶき
    const wn = G.weapon === '3way' ? '3ウェイ' : G.weapon === 'laser' ? 'レーザー' : 'ショット';
    const wx = hx + G.maxHearts * 20 * s + 14 * s;
    txt(c, `${wn} Lv${G.wlv}` + (G.barrier > 0 ? ' バリア' : ''), wx, hy, 12 * s, '#dbe4ff', '#1c2c6b', 'left');
    const b = G.boss;
    if (b && !b.enter && G.phase !== 'bossdown') {
      const bw = W * sc * 0.42, bx = ox + (W * sc - bw) / 2, by = oy + (portrait ? 8 : 36 * s);
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(bx - 2, by - 2, bw + 4, 10);
      c.fillStyle = b.hp < b.maxHp * 0.3 ? '#ff6b6b' : '#ffd43b'; c.fillRect(bx, by, bw * b.hp / b.maxHp, 6);
      txt(c, stage().boss, bx + bw / 2, by + 16, 11 * Math.max(1, s * 0.9), '#fff', '#1c2c6b');
    }
  }

  // ===================================================================
  //  そうさ（ゆびの すこし うえに ロケット）
  // ===================================================================
  let drag = null;
  const FINGER_UP = 56, FINGER_RIGHT = 10;          // CSS px
  function toWorld(cx, cy) {
    const r = stageEl.getBoundingClientRect();
    return { x: (cx - r.left - ox) / sc, y: (cy - r.top - oy) / sc, sy: cy - r.top };
  }
  function aimAt(cx, cy) {
    const w = toWorld(cx, cy);
    P.tx = clamp(w.x + FINGER_RIGHT / sc, 22, W - 30);
    // がめんの したの はしでは ずらしを へらす（したまで いけるように）
    const up = FINGER_UP * clamp((ch - w.sy) / 70, 0, 1);
    P.ty = clamp(w.y - up / sc, 10, H - 10);
  }
  stageEl.addEventListener('pointerdown', e => {
    if (e.target.closest('.panel, .bomb, button')) return;
    Snd.resume();
    if (G.state !== 'play') return;
    const w = toWorld(e.clientX, e.clientY);
    const inPad = portrait && w.sy > oy + H * sc + 40;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, rel: inPad };
    if (inPad) { P.tx = P.x; P.ty = P.y; } else aimAt(e.clientX, e.clientY);
    try { stageEl.setPointerCapture(e.pointerId); } catch (_) { /* むし */ }
    e.preventDefault();
  });
  stageEl.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (G.state === 'play' && !G.paused) {
      if (drag.rel) {
        const k = 1.5 / sc;
        P.tx = clamp((P.tx ?? P.x) + (e.clientX - drag.x) * k, 22, W - 30);
        P.ty = clamp((P.ty ?? P.y) + (e.clientY - drag.y) * k, 10, H - 10);
      } else aimAt(e.clientX, e.clientY);
    }
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const endDrag = e => { if (drag && e.pointerId === drag.id) { drag = null; P.tx = null; P.ty = null; } };
  stageEl.addEventListener('pointerup', endDrag);
  stageEl.addEventListener('pointercancel', endDrag);

  const keys = {};
  function keyVec() {
    P.kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    P.ky = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
  }
  window.addEventListener('keydown', e => {
    keys[e.code] = true; keyVec();
    if (G.state !== 'play') return;
    if (e.code === 'KeyX' || e.code === 'Space') { useBomb(); e.preventDefault(); }
    if (e.code === 'Escape' || e.code === 'KeyP') setPause(!G.paused);
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; keyVec(); });

  // ===================================================================
  //  がめん（パネル）
  // ===================================================================
  const panels = { title: $('titleP'), pause: $('pauseP'), card: $('cardP'), over: $('overP'), end: $('endP'), zukan: $('zukanP') };
  function showPanel(name) {
    for (const k in panels) panels[k].hidden = k !== name;
    const playing = G.state === 'play';
    $('pauseBtn').hidden = !playing;
    $('bombBtn').hidden = !playing;
    refreshBomb();
  }
  function refreshBomb() { $('bombNum').textContent = G.bombs; $('bombBtn').disabled = G.bombs <= 0; }
  function setPause(v) {
    if (G.state !== 'play' || G.phase === 'dying' || G.phase === 'bossdown') return;
    G.paused = v; drag = null; P.tx = null; P.ty = null;
    panels.pause.hidden = !v;
    Snd.hold(v);
  }
  function titleKey() { return STAGES[Math.min(save.cleared.length, STAGES.length - 1)].key; }

  function planetCanvas(key, px) {
    const c = document.createElement('canvas');
    const d = Math.min(window.devicePixelRatio || 1, 2);
    c.width = px * d; c.height = px * d; c.style.width = px + 'px'; c.style.height = px + 'px';
    const g = c.getContext('2d'); g.scale(d, d);
    const r = key === 'saturn' ? px * 0.22 : key === 'uranus' ? px * 0.26 : key === 'sun' ? px * 0.32 : px * 0.36;
    D.drawPlanet(g, key, px / 2, px / 2, r, 0);
    return c;
  }

  function buildTitle() {
    const list = $('stageList'); list.innerHTML = '';
    STAGES.forEach((st, i) => {
      const hidden = st.secret && !secretOpen();
      const ok = unlocked(i) && !hidden;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'st' + (st.secret ? ' secret' : ''); btn.disabled = !ok;
      if (hidden) {
        btn.innerHTML = `<span class="num">？</span><span class="q">？</span><span class="bn">かくし</span>`;
      } else {
        btn.appendChild(planetCanvas(st.key, 56));
        btn.insertAdjacentHTML('afterbegin', `<span class="num">${st.secret ? '★' : i + 1}</span>`);
        btn.insertAdjacentHTML('beforeend', `<span class="bn">${PLANETS[st.key].name}</span>`);
        if (isCleared(st.key)) btn.insertAdjacentHTML('beforeend', '<span class="mark">⭐</span>');
        else if (!ok) btn.insertAdjacentHTML('beforeend', '<span class="mark">🔒</span>');
      }
      btn.addEventListener('click', () => { Snd.resume(); Snd.play('tap'); G.carry = null; G.state = 'title'; startStage(i); });
      list.appendChild(btn);
    });
    document.querySelectorAll('#levelSeg button').forEach(b => b.classList.toggle('on', b.dataset.lv === save.level));
    $('hiScore').textContent = save.hi || 0;
    $('cardCount').textContent = `${save.cards.filter(k => k !== 'pluto').length}/9`;
  }
  function goTitle() {
    G.state = 'title'; G.paused = false; G.boss = null; Snd.hold(false);
    buildTitle(); showPanel('title');
    Snd.music('title');
  }

  // ---- わくせい カード ----
  function cardHTML(key) {
    const p = PLANETS[key];
    const order = key === 'sun' ? 'たいようけいの まんなか'
      : p.dwarf ? `${ruby('準惑星', 'じゅんわくせい')}（かいおうせいより もっと そと）`
      : `たいようから <b>${p.order}</b>ばんめ`;
    return `
      <div class="pcard" data-key="${key}">
        <div class="pc-top">
          <div class="pc-art"></div>
          <div class="pc-name">
            <div class="pc-order">${order}</div>
            <h3>${p.name}</h3>
          </div>
        </div>
        <dl class="pc-facts">
          <dt>📏 ${ruby('大', 'おお')}きさ</dt><dd>${p.size}<div class="pc-cmp"></div></dd>
          <dt>🔄 ${ruby('1日', 'いちにち')}<small>（くるっと 1かいてん）</small></dt><dd>${p.day}</dd>
          <dt>☀️ ${ruby('1年', 'いちねん')}<small>（たいようを 1しゅう）</small></dt><dd>${p.year}</dd>
          <dt>🌙 ${ruby('衛星', 'えいせい')}</dt><dd>${p.moons}</dd>
        </dl>
        <p class="pc-note">💬 ${p.note}</p>
      </div>`;
  }
  function fillCardArt(root) {
    root.querySelectorAll('.pcard').forEach(el => {
      const key = el.dataset.key;
      el.querySelector('.pc-art').appendChild(planetCanvas(key, 92));
      const cmp = el.querySelector('.pc-cmp');
      if (cmp) cmp.appendChild(compareCanvas(key));
    });
  }
  // ちきゅうと ならべて おなじ しゅくしゃくで
  function compareCanvas(key) {
    const Wc = 240, Hc = 92, d = Math.min(window.devicePixelRatio || 1, 2);
    const c = document.createElement('canvas'); c.width = Wc * d; c.height = Hc * d; c.style.width = Wc + 'px'; c.style.height = Hc + 'px';
    const g = c.getContext('2d'); g.scale(d, d);
    g.fillStyle = '#0b1440'; g.fillRect(0, 0, Wc, Hc);
    const lab = (s, x, y) => { g.font = '700 11px system-ui,sans-serif'; g.fillStyle = '#dbe4ff'; g.textAlign = 'center'; g.fillText(s, x, y); };
    const p = PLANETS[key];
    if (key === 'earth') { D.drawPlanet(g, 'earth', Wc / 2, 42, 30, 0); lab('ちきゅう（1）', Wc / 2, Hc - 6); return c; }
    if (key === 'sun') {
      const R = 300, rE = R * PLANETS.earth.diam / p.diam;
      D.drawPlanet(g, 'sun', -R + 110, 42, R, 0);
      D.drawPlanet(g, 'earth', 175, 42, Math.max(1.2, rE), 0);
      g.strokeStyle = '#ffe066'; g.lineWidth = 1; g.beginPath(); g.moveTo(175, 50); g.lineTo(175, 70); g.stroke();
      lab('たいよう', 60, Hc - 6); lab('ちきゅう', 175, Hc - 6);
      return c;
    }
    const big = Math.max(p.diam, PLANETS.earth.diam);
    const maxR = key === 'saturn' ? 24 : 34;
    const rP = maxR * p.diam / big, rE = maxR * PLANETS.earth.diam / big;
    const xP = Wc * 0.62, xE = Wc * 0.2;
    D.drawPlanet(g, key, xP, 42, Math.max(1, rP), 0);
    D.drawPlanet(g, 'earth', xE, 42, Math.max(1, rE), 0);
    lab(p.kana, xP, Hc - 6); lab('ちきゅう', xE, Hc - 6);
    return c;
  }
  let cardCtx = null;
  function showCard(key, o) {
    cardCtx = Object.assign({ key }, o);
    $('cardHead').innerHTML = o.after ? (o.isNew ? '🎉 あたらしい わくせいカード！' : '⭐ ステージ クリア！') : '📖 わくせいカード';
    $('cardBody').innerHTML = cardHTML(key);
    fillCardArt($('cardBody'));
    const nx = nextIndex();
    let extra = '';
    if (o.after) {
      extra = `<p class="score">スコア <b>${G.score}</b></p>`;
      if (key === 'neptune') extra += `<p class="secret-msg">🌞 かくし ステージ「${ruby('太陽', 'たいよう')}」が あらわれた！<br>ずかんに おまけの ${ruby('冥王星', 'めいおうせい')}カードも ふえたよ</p>`;
    }
    $('cardExtra').innerHTML = extra;
    $('cardNext').hidden = !o.after || nx < 0;
    $('cardEnd').hidden = !o.after || nx >= 0;
    $('cardBack').hidden = !!o.after;
    $('cardTitle').hidden = !o.after;
    showPanel('card');
  }

  // ---- ずかん ----
  const ZUKAN = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  let zukanTab = 'cards', sizeMode = 'sun';
  function buildZukan() {
    $('zkTabCards').classList.toggle('on', zukanTab === 'cards');
    $('zkTabSize').classList.toggle('on', zukanTab === 'size');
    $('zkCards').hidden = zukanTab !== 'cards';
    $('zkSize').hidden = zukanTab !== 'size';
    const grid = $('zkCards'); grid.innerHTML = '';
    for (const k of ZUKAN) {
      const have = save.cards.includes(k);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'zk' + (have ? '' : ' none') + (k === 'pluto' ? ' bonus' : '');
      b.disabled = !have;
      if (have) { b.appendChild(planetCanvas(k, 60)); b.insertAdjacentHTML('beforeend', `<span>${PLANETS[k].name}</span>`); }
      else b.innerHTML = `<span class="q">？</span><span>${k === 'pluto' ? 'おまけ' : '？？？'}</span>`;
      if (k === 'pluto') b.insertAdjacentHTML('afterbegin', '<em>おまけ</em>');
      b.addEventListener('click', () => { Snd.play('tap'); showCard(k, { after: false }); });
      grid.appendChild(b);
    }
    $('zkCount').textContent = `${save.cards.filter(k => k !== 'pluto').length} / 9`;
    document.querySelectorAll('#sizeSeg button').forEach(b => b.classList.toggle('on', b.dataset.m === sizeMode));
    if (zukanTab === 'size') drawSizeView();
  }
  // おなじ しゅくしゃくで ならべる
  function drawSizeView() {
    const c = $('sizeCv');
    const Wc = 820, Hc = 300, d = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Wc * d; c.height = Hc * d; c.style.width = Wc + 'px'; c.style.height = Hc + 'px';
    const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
    g.fillStyle = '#060b2a'; g.fillRect(0, 0, Wc, Hc);
    for (let i = 0; i < 80; i++) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect((i * 97) % Wc, (i * 61) % Hc, 1, 1); }
    const withSun = sizeMode === 'sun';
    const cy = 130;
    let kmPx, x;
    if (withSun) {
      const R = 470; kmPx = R / (PLANETS.sun.diam / 2);
      D.drawPlanet(g, 'sun', 70 - R, cy, R, 0);
      label(g, 'たいよう', 34, Hc - 20, save.cards.includes('sun'));
      x = 92;
    } else { kmPx = 90 / (PLANETS.jupiter.diam / 2); x = 20; }
    const list = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    let row = 0;
    for (const k of list) {
      if (k === 'pluto' && !save.cards.includes('pluto')) continue;
      const r = PLANETS[k].diam / 2 * kmPx;
      const half = k === 'saturn' ? r * 2.25 : Math.max(r, 2);
      const gap = withSun ? 20 : 24;
      x += half + gap;
      const have = save.cards.includes(k);
      if (have) D.drawPlanet(g, k, x, cy, Math.max(0.8, r), 0);
      else { g.setLineDash([3, 3]); D.circ(g, x, cy, Math.max(2, r), null, 'rgba(255,255,255,.5)', 1); g.setLineDash([]); }
      const ly = row++ % 2 ? Hc - 18 : Hc - 40;
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, cy + Math.max(r, 2) + 3); g.lineTo(x, ly - 12); g.stroke();
      label(g, have ? PLANETS[k].kana : '？', x, ly, have);
      x += half;
    }
    g.font = '700 12px system-ui,sans-serif'; g.fillStyle = '#91a7ff'; g.textAlign = 'right';
    g.fillText(withSun ? 'たいようも わくせいも おなじ しゅくしゃく' : 'わくせいだけ（おなじ しゅくしゃく）', Wc - 10, 18);
  }
  function label(g, s, x, y, have) {
    g.font = '800 12px system-ui,sans-serif'; g.textAlign = 'center';
    g.fillStyle = have ? '#fff' : 'rgba(255,255,255,.4)'; g.fillText(s, x, y);
  }

  // ---- ボタン ----
  $('pauseBtn').addEventListener('click', () => setPause(!G.paused));
  $('resumeBtn').addEventListener('click', () => setPause(false));
  $('retryBtn2').addEventListener('click', () => { Snd.hold(false); G.paused = false; startStage(G.si, true); });
  $('retireBtn').addEventListener('click', () => { G.paused = false; goTitle(); });
  $('contBtn').addEventListener('click', () => { Snd.play('tap'); startStage(G.si, true); });
  $('overTitleBtn').addEventListener('click', goTitle);
  $('cardNext').addEventListener('click', () => { Snd.play('tap'); const nx = nextIndex(); if (nx >= 0) startStage(nx); });
  $('cardEnd').addEventListener('click', () => { G.state = 'end'; $('endScore').textContent = G.score; showPanel('end'); Snd.play('card'); });
  $('cardTitle').addEventListener('click', goTitle);
  $('cardBack').addEventListener('click', () => { G.state = 'zukan'; buildZukan(); showPanel('zukan'); });
  $('endTitleBtn').addEventListener('click', goTitle);
  $('zukanBtn').addEventListener('click', () => { Snd.resume(); Snd.play('tap'); G.state = 'zukan'; zukanTab = 'cards'; buildZukan(); showPanel('zukan'); });
  $('endZukanBtn').addEventListener('click', () => { G.state = 'zukan'; zukanTab = 'size'; buildZukan(); showPanel('zukan'); });
  $('zkBack').addEventListener('click', goTitle);
  $('zkTabCards').addEventListener('click', () => { zukanTab = 'cards'; buildZukan(); });
  $('zkTabSize').addEventListener('click', () => { zukanTab = 'size'; buildZukan(); });
  document.querySelectorAll('#sizeSeg button').forEach(b => b.addEventListener('click', () => { sizeMode = b.dataset.m; buildZukan(); }));
  document.querySelectorAll('#levelSeg button').forEach(b => b.addEventListener('click', () => {
    save.level = b.dataset.lv; persist(); Snd.resume(); Snd.play('tap'); buildTitle();
  }));
  $('bombBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); useBomb(); });

  const soundBtn = $('soundBtn');
  function refreshSound() { soundBtn.textContent = Snd.isOn() ? '🔊' : '🔇'; soundBtn.setAttribute('aria-pressed', String(Snd.isOn())); }
  soundBtn.addEventListener('click', () => {
    Snd.resume(); Snd.setOn(!Snd.isOn()); save.sound = Snd.isOn(); persist(); refreshSound();
  });
  Snd.setOn(save.sound !== false); refreshSound();
  panels.title.addEventListener('pointerdown', () => { Snd.resume(); if (G.state === 'title' && !Snd.song) Snd.music('title'); });

  // タブを はなれたら じどうで ポーズ
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; keyVec(); if (G.state === 'play' && !G.paused) setPause(true); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (G.state === 'play' && !G.paused) setPause(true); Snd.hold(true); }
    else if (!G.paused) Snd.hold(false);
  });

  // ===================================================================
  //  ループ
  // ===================================================================
  let lastT = 0;
  function loop(now) {
    const dt = Math.min(0.034, Math.max(0, (now - (lastT || now)) / 1000));
    lastT = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stageEl);
  resize();
  buildTitle(); showPanel('title');
  requestAnimationFrame(loop);

  if (DEBUG) {
    window.__wk = {
      G, P, save,
      start: i => { G.state = 'title'; G.carry = null; startStage(i); },
      boss: () => { G.t = BOSS_AT; enemies = []; G.phase = 'warn'; G.endT = 2.3; },
      kill: () => { if (G.boss) hitBoss(G.boss, 99999); },
      god: (v = true) => { G.god = v; },
      clearAll: () => { save.cleared = STAGES.map(s => s.key); save.cards = ZUKAN.slice(); persist(); buildTitle(); },
      step: (sec) => { for (let i = 0; i < sec * 60; i++) update(1 / 60); render(); },
      counts: () => ({ shots: shots.length, ebul: ebul.length, enemies: enemies.length, parts: parts.length, items: items.length }),
      card: k => showCard(k, { after: false }),
      zukan: tab => { G.state = 'zukan'; zukanTab = tab || 'cards'; buildZukan(); showPanel('zukan'); },
      weapon: (w, l = 3) => { G.weapon = w; G.wlv = l; },
      give: (k) => getItem({ kind: k }),
    };
  }
})();
