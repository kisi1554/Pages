'use strict';
// つきの うさぎ と かぐやひめ — げーむ ほんたい
(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $('gl');
  let R;
  try { R = new Renderer(canvas); } catch (e) { $('nogl').hidden = false; $('title').hidden = true; return; }
  const gl = R.gl;

  const ARENA = 22;          // うごける はんい（はんけい）
  const GRAV = 13;           // つきなので ふわっと
  const SPEED = 7;
  const M = buildMeshes(R, ARENA);
  const DIFF = {
    easy:   { hp: 8, khp: 18, ehp: 0.7, spd: 0.85, cd: 1.35, orb: 5.0, warn: 1.35, ring: 6.0, alive: 1, label: 'やさしい' },
    normal: { hp: 6, khp: 26, ehp: 1.0, spd: 1.0,  cd: 1.0,  orb: 6.5, warn: 1.05, ring: 7.5, alive: 2, label: 'ふつう' },
    hard:   { hp: 5, khp: 34, ehp: 1.3, spd: 1.15, cd: 0.8,  orb: 8.0, warn: 0.85, ring: 9.0, alive: 3, label: 'むずかしい' },
  };
  const WAVES = [
    ['takenoko', 'takenoko', 'heishi', 'takenoko', 'kani'],
    ['ishitsukuri', 'kuramochi', 'abe'],
    ['ootomo', 'isonokami', 'tsukai'],
  ];
  // うさぎの わざ（20こ）
  const WAZA = [
    { id: 'pet1', name: 'ぺったん', how: '🔨 きね' },
    { id: 'pet2', name: 'にだん ぺったん', how: '🔨 を 2かい つづけて' },
    { id: 'spin', name: 'ぐるぐる きね', how: '🔨 を 3かい つづけて（まわりの てきを ふっとばす）' },
    { id: 'tame', name: 'ため ぺったん', how: '🔨 を ながおし して はなす' },
    { id: 'drop', name: 'ぺったん ドロップ', how: 'ジャンプちゅうに 🔨（まわりの てきを ふらふらに）' },
    { id: 'dash', name: 'ぴょん ダッシュ', how: 'うごきながら 💨' },
    { id: 'tackle', name: 'うさぎ タックル', how: '💨 の すぐ あとに 🔨' },
    { id: 'long', name: 'ロング ジャンプ', how: '💨 の すぐ あとに ⬆️' },
    { id: 'hover', name: 'みみ ぱたぱた', how: 'くうちゅうで ⬆️ を おしっぱなし（ゆっくり おりる）' },
    { id: 'stomp', name: 'ふみつけ ジャンプ', how: 'てきの あたまに おちる' },
    { id: 'air3', name: 'くうちゅう 3れん なげ', how: 'ジャンプちゅうに 🍡' },
    { id: 'big', name: 'おおだんご', how: '🍡 を ながおし して はなす（てきを つらぬく）' },
    { id: 'trap', name: 'べたべた わな', how: '💨 の すぐ あとに 🍡（ふんだ てきが うごけない）' },
    { id: 'guard', name: 'もち バリア', how: 'とまったまま 💨 を おしっぱなし' },
    { id: 'reflect', name: 'はねかえし', how: 'たまが あたる ちょくぜんに もち バリア' },
    { id: 'just', name: 'ジャスト よけ', how: 'こうげきが あたる ちょくぜんに 💨（じかんが ゆっくりに）' },
    { id: 'mikiri', name: 'みきり ぺったん', how: 'ジャスト よけ の あとに 🔨（だいダメージ）' },
    { id: 'rain', name: 'だんごの あめ', how: 'ゲージ まんたんで ✨' },
    { id: 'beam', name: 'つきの ひかり ビーム', how: 'ゲージ まんたん、ジャンプちゅうに ✨' },
    { id: 'roll', name: 'もちもち ローリング', how: 'ゲージ まんたん、💨 の すぐ あとに ✨' },
  ];
  const QUIET_WAZA = { pet1: 1, dash: 1, hover: 1 };
  const TH = { L: V3.norm([0.45, 0.85, 0.35]), lc: [1.0, 0.98, 0.92], amb: [0.34, 0.36, 0.48],
    fog: [0.02, 0.03, 0.09, 1], fogN: 42, fogF: 100, night: 0.6 };
  // こうげきの しゅるいごとの ふっとび と ふらふら
  const KB = { pet: 4, spin: 9, tame: 10, drop: 7, tackle: 11, mikiri: 12, dango: 1.5, air3: 1.5, big: 4, rain: 1, beam: 6, roll: 10, stomp: 0, refl: 3 };
  const STUN = { tame: 0.8, drop: 1.2, mikiri: 1.3, spin: 0.4, roll: 0.5, tackle: 0.5 };

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  // ---------------- じょうたい ----------------
  const S = { mode: 'title', story: true, paused: false, t: 0, time: 0, diff: 'normal', D: DIFF.normal, endT: 0, itemT: 0,
    slow: 0, wave: -1, queue: [], spawnT: 0, waveT: 0, stage: '', target: null, kills: 0, newWaza: 0, boss: null };
  const P = { x: 0, y: 0, z: 10, vx: 0, vz: 0, vy: 0, face: Math.PI, hp: 6, maxHp: 6, inv: 0, jumps: 0, hop: 0, squash: 0, ground: true,
    st: 'normal', t: 0, combo: 0, comboWin: 0, after: 0, cd: 0, dashCd: 0, guardCd: 0, gauge: 0, counter: 0, sleepy: 0,
    hoverT: 0, spinA: 0, swing: -0.4, hitSet: new Set(), kineOk: false, justDone: false, dashDir: [0, 1], big: false, did: false };
  let en = [], shots = [], eshots = [], zones = [], rings = [], items = [], parts = [], pops = [], evts = [], shocks = [], beams = [];
  const cam = { pos: [0, 6, 18], look: [0, 1.5, 0], dir: [0, 0, 1], shake: 0 };
  let vpMat = M4.ident(), eid = 0;

  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* むし */ } };
  const best = load('tsuki-usagi-best2', {});
  const known = load('tsuki-usagi-waza', {});
  const met = load('tsuki-usagi-teki', {});
  const fmt = (s) => `${Math.floor(s / 60)}ふん ${String(Math.floor(s % 60)).padStart(2, '0')}びょう`;

  // ---------------- にゅうりょく ----------------
  const BTNS = ['jump', 'throw', 'kine', 'dash', 'sp'];
  const KEYMAP = { jump: ['Space'], throw: ['KeyJ', 'KeyZ', 'Enter'], kine: ['KeyK', 'KeyX'], dash: ['KeyL', 'ShiftLeft', 'ShiftRight', 'KeyC'], sp: ['KeyU', 'KeyV', 'KeyI'] };
  const GPMAP = { jump: [0], throw: [2, 7], kine: [1, 6], dash: [4, 5], sp: [3] };
  const keys = {}, touchHeld = {}, pressQ = {}, prevB = {}, holdT = {};
  for (const b of BTNS) { touchHeld[b] = false; pressQ[b] = false; prevB[b] = false; holdT[b] = 0; }
  const keyBtn = (code) => BTNS.find((b) => KEYMAP[b].includes(code));
  addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true; Sound.init();
    const b = keyBtn(e.code); if (b) pressQ[b] = true;
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; for (const b of BTNS) touchHeld[b] = false; });

  const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
  const zone = $('stick'), base = $('knobBase'), knob = $('knob');
  const resetStick = () => { stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; base.classList.remove('on'); base.style.left = ''; base.style.top = ''; };
  zone.addEventListener('pointerdown', (e) => {
    if (stick.id !== null) return;
    Sound.init();
    stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY;
    try { zone.setPointerCapture(e.pointerId); } catch (er) { /* むし */ }
    base.classList.add('on'); base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px';
    e.preventDefault();
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stick.id) return;
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
    const l = Math.hypot(dx, dy), MX = 55;
    if (l > MX) { dx *= MX / l; dy *= MX / l; }
    stick.x = dx / MX; stick.y = -dy / MX;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(ev, (e) => { if (e.pointerId === stick.id) resetStick(); });
  for (const el of document.querySelectorAll('.pad[data-b]')) {
    const b = el.dataset.b;
    el.addEventListener('pointerdown', (e) => { Sound.init(); try { el.setPointerCapture(e.pointerId); } catch (er) { /* むし */ } el.classList.add('down'); touchHeld[b] = true; pressQ[b] = true; e.preventDefault(); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, () => { el.classList.remove('down'); touchHeld[b] = false; });
  }
  const markTouch = () => document.body.classList.add('touch');
  if (matchMedia('(pointer: coarse)').matches) markTouch();
  addEventListener('touchstart', markTouch, { passive: true, once: true });

  function readInput(dt) {
    let x = 0, y = 0;
    if (keys.ArrowLeft || keys.KeyA) x -= 1;
    if (keys.ArrowRight || keys.KeyD) x += 1;
    if (keys.ArrowUp || keys.KeyW) y += 1;
    if (keys.ArrowDown || keys.KeyS) y -= 1;
    x += stick.x; y += stick.y;
    let gp = null;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const g of pads) if (g) { gp = g; break; }
    if (gp) {
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (Math.abs(ax) > 0.2) x += ax;
      if (Math.abs(ay) > 0.2) y -= ay;
      const pb = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
      if (pb(14)) x -= 1; if (pb(15)) x += 1; if (pb(12)) y += 1; if (pb(13)) y -= 1;
    }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    const B = { held: {}, pressed: {}, released: {}, hold: {} };
    for (const b of BTNS) {
      let cur = touchHeld[b] || KEYMAP[b].some((k) => keys[k]);
      if (gp) cur = cur || GPMAP[b].some((i) => gp.buttons[i] && gp.buttons[i].pressed);
      const pressed = (cur && !prevB[b]) || pressQ[b];
      const released = (!cur && prevB[b]) || (pressQ[b] && !cur);
      const now = performance.now() / 1000;
      if (pressed) holdT[b] = now;   // おした じこく（じっさいの じかんで ながおしを はかる）
      B.held[b] = cur; B.pressed[b] = pressed; B.released[b] = released; B.hold[b] = (cur || released) ? now - holdT[b] : 0;
      prevB[b] = cur; pressQ[b] = false;
    }
    return { x, y, mv: Math.hypot(x, y) > 0.25, B };
  }

  // ---------------- HUD ----------------
  function drawHearts() {
    let s = '';
    for (let i = 0; i < P.maxHp; i++) s += `<span class="${i < P.hp ? '' : 'off'}">${i < P.hp ? '❤️' : '🤍'}</span>`;
    $('hearts').innerHTML = s;
  }
  function drawGauge() {
    $('gfill').style.width = P.gauge + '%';
    const full = P.gauge >= 100;
    $('gauge').classList.toggle('full', full);
    $('bSp').classList.toggle('ready', full);
  }
  function drawInfo() {
    if (S.boss && !S.boss.dead) {
      $('kname').textContent = '👸 かぐやひめ';
      $('kfill').style.width = (Math.max(0, S.boss.hp) / S.boss.maxHp * 100) + '%';
      $('kfill').className = '';
    } else if (S.wave >= 0 && S.wave < WAVES.length) {
      const left = S.queue.length + en.filter((e) => !e.dead && !e.clone && !e.minion).length;
      $('kname').textContent = `🌙 ウェーブ ${S.wave + 1}/${WAVES.length}・のこり ${left}`;
      $('kfill').style.width = (left / WAVES[S.wave].length * 100) + '%';
      $('kfill').className = 'wave';
    }
  }
  let sayTimer = 0, hintTimer = 0, toastTimer = 0, bannerTimer = 0;
  function sayWho(who, text, dur) {
    const el = $('say'); el.innerHTML = ''; const b = document.createElement('b'); b.textContent = who; el.appendChild(b);
    el.appendChild(document.createTextNode(text)); el.hidden = false; sayTimer = dur || 2.6;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }
  function hint(text, dur) { const el = $('hint'); el.textContent = text; el.hidden = false; hintTimer = dur || 2.5; }
  function banner(text, dur) { const el = $('banner'); el.textContent = text; el.hidden = false; bannerTimer = dur || 2; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  function popText(p, text, cls) {
    const el = document.createElement('div');
    el.className = 'pop-t ' + (cls || ''); el.textContent = text;
    $('fx').appendChild(el);
    pops.push({ p: p.slice(), el, life: 0.9 });
  }
  function burst(p, n, cols, spd, size, g) {
    for (let i = 0; i < n; i++) {
      const u = rnd(-1, 1), f = rnd(0, Math.PI * 2), r = Math.sqrt(1 - u * u), s = rnd(0.4, 1) * spd;
      parts.push({ x: p[0], y: p[1], z: p[2], vx: Math.cos(f) * r * s, vy: u * s + spd * 0.3, vz: Math.sin(f) * r * s,
        life: rnd(0.5, 0.9), col: cols[i % cols.length], size: size * rnd(0.6, 1.2), g: g == null ? 6 : g });
    }
  }
  function learn(id) {
    const w = WAZA.find((q) => q.id === id);
    if (!w) return;
    if (!known[id]) {
      known[id] = 1; save('tsuki-usagi-waza', known); S.newWaza++;
      const el = $('toast'); el.innerHTML = ''; const s = document.createElement('small'); s.textContent = '✨ あたらしい わざ！';
      el.appendChild(s); el.appendChild(document.createTextNode(w.name)); el.hidden = false; toastTimer = 2.2;
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      Sound.newWaza();
    } else if (!QUIET_WAZA[id]) popText([P.x, P.y + 3, P.z], w.name, 'waza');
  }
  function addGauge(n) {
    const was = P.gauge >= 100;
    P.gauge = clamp(P.gauge + n, 0, 100); drawGauge();
    if (!was && P.gauge >= 100) { Sound.ready(); hint('✨ ひっさつわざ が つかえるよ！', 2.4); }
  }

  // ---------------- G（てきに わたす どうぐばこ） ----------------
  const G = {
    P, M, ARENA, snd: Sound, rnd,
    get D() { return S.D; },
    t: () => S.t,
    en: () => en,
    dist: (e) => Math.hypot(P.x - e.x, P.z - e.z),
    faceTo(e, x, z, dt, rate) {
      const want = Math.atan2(x - e.x, z - e.z);
      if (!dt) { e.face = want; return; }
      e.face += wrap(want - e.face) * (1 - Math.exp(-dt * (rate || 8)));
    },
    move(e, x, z, spd, dt) { const dx = x - e.x, dz = z - e.z, l = Math.hypot(dx, dz); if (l > 0.05) { const s = Math.min(l, spd * dt); e.x += dx / l * s; e.z += dz / l * s; } },
    keep(e, mn, mx, spd, dt) {
      const dx = e.x - P.x, dz = e.z - P.z, l = Math.hypot(dx, dz) || 1;
      if (l < mn) { e.x += dx / l * spd * dt; e.z += dz / l * spd * dt; } else if (l > mx) { e.x -= dx / l * spd * dt; e.z -= dz / l * spd * dt; }
    },
    strafe(e, dir, spd, dt) { const dx = e.x - P.x, dz = e.z - P.z, l = Math.hypot(dx, dz) || 1; e.x += -dz / l * dir * spd * dt; e.z += dx / l * dir * spd * dt; },
    local(e, lx, ly, lz) { const c = Math.cos(e.face), s = Math.sin(e.face); return [e.x + lx * c + lz * s, e.y + ly, e.z - lx * s + lz * c]; },
    shoot(o) { eshots.push(Object.assign({ life: 0, max: 5, r: 0.5, reflect: true }, o)); },
    zone(o) { zones.push(Object.assign({ t: 0, warn: 0, act: 1, r: 1 }, o)); },
    ring(x, z) { rings.push({ x, z, r: 0.8 }); },
    say(e, text, dur) { sayWho(`${e.def.emoji} ${e.def.name}`, text, dur); },
    hint, burst, hurt: (src) => hurt(src),
    spawn: (type, x, z, opt) => spawnEnemy(type, x, z, opt),
    later(owner, d, fn) { evts.push({ t: S.t + d, fn, owner }); },
    draw: (mesh, m, col, e) => R.draw(mesh, m, col, e),
    bossReady() { S.stage = 'boss'; Sound.bgm(true); },
  };

  // ---------------- てき ----------------
  function spawnEnemy(type, x, z, opt) {
    opt = opt || {};
    const D = ENEMY[type];
    const l = Math.hypot(x, z); if (l > ARENA - 1.5) { x *= (ARENA - 1.5) / l; z *= (ARENA - 1.5) / l; }
    const hp = opt.hp || (D.boss ? S.D.khp : Math.max(1, Math.round(D.hp * S.D.ehp)));
    const e = { type, def: D, x, z, y: D.fly ? (D.flyY || 3) : 0, vy: 0, kx: 0, kz: 0, face: Math.atan2(P.x - x, P.z - z),
      hp, maxHp: hp, flash: 0, stun: 0, slowT: 0, spawn: 0.8, dead: false, deadT: 0, st: '', t: 0, cd: rnd(1.2, 2.2),
      id: ++eid, touchOn: false, rollCd: 0, flipT: 0, wob: 0, clone: !!opt.clone, minion: !!opt.minion, trapped: {} };
    if (D.init) D.init(e, G);
    en.push(e);
    burst([x, 1, z], 12, [[1, 1, 1], [1, 0.95, 0.6]], 4, 0.25, 0);
    if (!e.clone) {
      if (!met[type] && !opt.noMeet) { met[type] = 1; save('tsuki-usagi-teki', met); }
      if (!opt.quiet) { G.say(e, D.intro[Math.floor(Math.random() * D.intro.length)], 2.8); Sound.spawn(); }
    }
    return e;
  }
  function spawnPos() {
    for (let i = 0; i < 12; i++) {
      const a = rnd(0, Math.PI * 2), d = rnd(12, 18), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.hypot(x - P.x, z - P.z) > 9) return [x, z];
    }
    return [-P.x * 0.7, -P.z * 0.7 - 8];
  }
  function damage(e, dmg, src, kind) {
    if (e.dead || e.leaving || e.spawn > 0 || (e.def.boss && e.intro)) return false;
    const D = e.def;
    if (D.guard && D.guard(e, src, kind, G)) {
      popText([e.x, e.y + D.h + 0.6, e.z], 'カキーン！', 'bad'); Sound.block();
      burst([e.x, e.y + 1.3, e.z], 6, [[0.8, 0.8, 0.85]], 3, 0.2);
      if (!S.guardHint) { S.guardHint = true; hint('まえからは きかない！ うしろから なげるか 🔨 で たたこう', 3); }
      return false;
    }
    const mul = D.weakMul ? D.weakMul(e, kind, G) : 1;
    e.hp -= dmg * mul; e.flash = 0.15;
    const sx = e.x - src[0], sz = e.z - src[2], sl = Math.hypot(sx, sz) || 1;
    if (!D.boss) {
      const kb = KB[kind] || 2;
      e.kx += sx / sl * kb; e.kz += sz / sl * kb;
      if (STUN[kind]) { e.stun = Math.max(e.stun, STUN[kind]); e.touchOn = false; if (D.reset) D.reset(e, G); }
    }
    const hp = [e.x, e.y + D.h * 0.6, e.z];
    burst(hp, 10, [[1, 0.8, 0.88], [1, 1, 1], [0.66, 0.89, 0.29]], 6, 0.22);
    if (mul > 1) popText([e.x, e.y + D.h + 0.8, e.z], 'じゃくてん！', 'good');
    else popText([e.x, e.y + D.h + 0.8, e.z], ['ぽこっ！', 'ぺたっ！', 'もちっ！', 'あたり！'][Math.floor(Math.random() * 4)]);
    Sound.hitE();
    addGauge(4 * dmg);
    if (D.onHit) D.onHit(e, G, kind);
    if (e.hp > 0 && !e.clone && Math.random() < 0.15) G.say(e, D.hurt[Math.floor(Math.random() * D.hurt.length)], 1.4);
    if (e.hp <= 0) kill(e);
    if (D.boss) drawInfo();
    return true;
  }
  function kill(e) {
    const D = e.def;
    if (D.boss) { e.leaving = true; e.hp = 0; win(e); return; }
    e.dead = true; e.deadT = 0; e.touchOn = false;
    burst([e.x, e.y + 1, e.z], e.clone ? 12 : 26, [[1, 0.95, 0.6], [1, 0.8, 0.9], [1, 1, 1]], 7, 0.28, 2);
    if (e.clone) { popText([e.x, e.y + 3, e.z], 'にせもの でした〜', 'good'); Sound.puff(); return; }
    S.kills++;
    popText([e.x, e.y + 3.2, e.z], 'やっつけた！', 'good'); Sound.defeat();
    if (D.bye) G.say(e, D.bye, 2.2);
    addGauge(8);
    if (e.type === 'kuramochi') for (const c of en) if (c.clone && !c.dead) kill(c);
    drawInfo();
  }

  // ---------------- うさぎが やられる ----------------
  function hurt(src, opt) {
    opt = opt || {};
    if (S.mode !== 'play') return 'inv';
    if (P.st === 'roll' || P.st === 'beam') return 'inv';
    if (P.st === 'dash') { if (!P.justDone) justDodge(); return 'dodge'; }
    if (P.st === 'guard') {
      Sound.block(); burst([P.x, P.y + 1, P.z], 6, [[1, 1, 1], [1, 0.8, 0.9]], 3, 0.2, 0);
      popText([P.x, P.y + 2.6, P.z], 'ガード！', 'good');
      return 'guard';
    }
    if (P.inv > 0) return 'inv';
    if (opt.effect === 'sleep') {
      P.sleepy = 3.2; P.inv = 0.8; popText([P.x, P.y + 2.6, P.z], 'ねむい… 💤', 'bad'); Sound.sleep();
      return 'hit';
    }
    P.hp--; P.inv = 1.6; drawHearts();
    cam.shake = 0.5; Sound.hurt();
    if (src) { const dx = P.x - src[0], dz = P.z - src[2], l = Math.hypot(dx, dz) || 1; P.vx = dx / l * 9; P.vz = dz / l * 9; }
    P.vy = Math.max(P.vy, 5); P.ground = false;
    if (P.st !== 'normal') { P.st = 'normal'; P.t = 0; }
    burst([P.x, P.y + 1, P.z], 10, [[1, 0.6, 0.7], [1, 1, 1]], 5, 0.25);
    popText([P.x, P.y + 2.4, P.z], 'いたっ！', 'bad');
    if (P.hp <= 0) lose();
    return 'hit';
  }
  function justDodge() {
    P.justDone = true; S.slow = 1.3; P.counter = 2.0;
    learn('just'); addGauge(20); Sound.just();
    popText([P.x, P.y + 2.6, P.z], 'ジャスト！', 'good');
    burst([P.x, P.y + 1, P.z], 14, [[0.6, 0.85, 1], [1, 1, 1]], 5, 0.22, 0);
    if (!known.mikiri) hint('いまだ！ 🔨 で みきり ぺったん！', 2);
  }

  // ---------------- うさぎの わざ ----------------
  function aimPoint() {
    const t = S.target;
    if (t && !t.dead && !t.leaving) return [t.x, t.y + t.def.h * 0.55, t.z];
    return [P.x + Math.sin(P.face) * 15, 1.2, P.z + Math.cos(P.face) * 15];
  }
  function faceTarget() { const a = aimPoint(); P.face = Math.atan2(a[0] - P.x, a[2] - P.z); }
  function throwDango(kind, spreadN) {
    const tgt = aimPoint(), n = spreadN || 1;
    const from = [P.x + Math.sin(P.face) * 0.4, P.y + 1.1, P.z + Math.cos(P.face) * 0.4];
    const d = V3.sub(tgt, from), spd = kind === 'big' ? 18 : 22, tf = Math.max(0.25, V3.len(d) / spd);
    const base = Math.atan2(d[0], d[2]), hd = Math.hypot(d[0], d[2]);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.28;
      shots.push({ kind, x: from[0], y: from[1], z: from[2], v: [Math.sin(a) * hd / tf, d[1] / tf + 3 * tf, Math.cos(a) * hd / tf],
        r: kind === 'big' ? 0.75 : 0.4, dmg: kind === 'big' ? 3 : 1, pierce: kind === 'big', hit: new Set(), rot: 0, life: 0, grav: 6 });
    }
    if (kind === 'big') Sound.bigThrow(); else Sound.throw();
  }
  // まえ（arc）に いる てきに あてる
  function melee(range, arc, dmg, kind, opt) {
    opt = opt || {};
    let hits = 0;
    for (const e of en) {
      if (e.dead || e.leaving || e.spawn > 0) continue;
      if (opt.once && P.hitSet.has(e.id)) continue;
      if (opt.groundOnly && e.y > 1.2) continue;
      const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
      if (d > range + e.def.r) continue;
      if (arc < Math.PI && d > 0.5 && Math.abs(wrap(Math.atan2(dx, dz) - P.face)) > arc) continue;
      if (e.y > P.y + (opt.reachUp || 2.3) || e.y + e.def.h < P.y - 0.4) continue;
      if (damage(e, dmg, [P.x, P.y, P.z], kind)) { hits++; if (opt.once) P.hitSet.add(e.id); }
    }
    if (hits) { Sound.kineHit(); cam.shake = Math.max(cam.shake, 0.18); }
    return hits;
  }
  function shock(x, z, r, col) { shocks.push({ x, z, r, t: 0, max: 0.4, col: col || [1, 1, 1] }); }
  function startKine(kind) {
    P.st = 'kine'; P.t = 0; P.kind = kind; P.did = false; P.did2 = false; P.hitSet.clear();
    P.dur = { pet: 0.34, spin: 0.55, tame: 0.5, mikiri: 0.5 }[kind];
    faceTarget(); Sound.swing();
    if (kind === 'pet') learn(P.combo === 2 ? 'pet2' : 'pet1');
    if (kind === 'spin') learn('spin');
    if (kind === 'tame') learn('tame');
    if (kind === 'mikiri') { learn('mikiri'); P.counter = 0; S.slow = Math.max(S.slow, 0.4); }
  }
  function useSpecial(fromDash) {
    if (P.gauge < 100) { if (!S.spHint) { S.spHint = true; hint('✨ は ゲージが まんたんに なったら つかえるよ', 2.2); } return; }
    P.gauge = 0; drawGauge(); Sound.special();
    if (fromDash) {
      P.st = 'roll'; P.t = 0; learn('roll'); banner('もちもち ローリング！', 1.4);
    } else if (!P.ground) {
      P.st = 'beam'; P.t = 0; P.vy = 0; P.did = false; faceTarget(); learn('beam'); banner('つきの ひかり ビーム！', 1.4);
    } else {
      learn('rain'); banner('だんごの あめ！', 1.4);
      for (const e of en) {
        if (e.dead || e.leaving) continue;
        for (let k = 0; k < 4; k++) shots.push({ kind: 'rain', x: e.x + rnd(-0.8, 0.8), y: e.y + e.def.h + 7 + k * 1.6, z: e.z + rnd(-0.8, 0.8), v: [0, -16, 0], r: 0.6, dmg: 1, hit: new Set(), rot: 0, life: 0, grav: 0, follow: e });
      }
      P.st = 'pose'; P.t = 0;
    }
  }

  function updatePlayer(dt, I) {
    const B = I.B, live = S.mode === 'play';
    P.inv = Math.max(0, P.inv - dt); P.cd -= dt; P.dashCd -= dt; P.guardCd -= dt; P.comboWin -= dt; P.after -= dt;
    P.counter = Math.max(0, P.counter - dt); P.sleepy = Math.max(0, P.sleepy - dt);
    P.squash = Math.max(0, P.squash - dt * 1.6);
    if (P.sleepy > 0 && Math.random() < dt * 2) popText([P.x, P.y + 2.6, P.z], '💤', 'bad');
    const fx = -cam.dir[0], fz = -cam.dir[2], rx = -fz, rz = fx;
    const mvx = fx * I.y + rx * I.x, mvz = fz * I.y + rz * I.x;
    const spd = SPEED * (P.sleepy > 0 ? 0.45 : 1);
    let tvx = mvx * spd, tvz = mvz * spd, control = P.ground ? 12 : 4, faceMove = true;

    if (!live) { tvx = 0; tvz = 0; for (const b of BTNS) { B.pressed[b] = false; B.released[b] = false; } }

    // ---- じょうたい ごとの うごき ----
    if (P.st === 'dash') {
      P.t += dt; tvx = P.dashDir[0] * 16; tvz = P.dashDir[1] * 16; control = 30;
      if (B.pressed.jump) { P.st = 'long'; P.vy = 8.5; P.ground = false; P.jumps = 2; learn('long'); Sound.jump(); }
      else if (B.pressed.kine && P.counter > 0) startKine('mikiri');
      else if (B.pressed.kine) { P.st = 'tackle'; P.t = 0; P.hitSet.clear(); learn('tackle'); Sound.swing(); }
      else if (B.pressed.throw) { placeTrap(); }
      else if (B.pressed.sp) { useSpecial(true); }
      else if (P.t > 0.32) { P.st = 'normal'; P.after = 0.22; P.dashCd = 0.3; }
    } else if (P.st === 'tackle') {
      P.t += dt; tvx = Math.sin(P.face) * 13; tvz = Math.cos(P.face) * 13; control = 30; faceMove = false;
      melee(1.3, 1.0, 2, 'tackle', { once: true });
      if (P.t > 0.35) P.st = 'normal';
    } else if (P.st === 'long') {
      tvx = P.dashDir[0] * 14; tvz = P.dashDir[1] * 14; control = 30;
      if (B.pressed.kine) { P.st = 'pound'; }
    } else if (P.st === 'kine') {
      P.t += dt; tvx *= 0.25; tvz *= 0.25; faceMove = false;
      const k = P.kind;
      if (k === 'pet' && !P.did && P.t > 0.13) { P.did = true; melee(2.0, 1.1, 1, 'pet'); shock(P.x + Math.sin(P.face) * 1.4, P.z + Math.cos(P.face) * 1.4, 1.2); }
      if (k === 'spin') {
        P.spinA = P.t / P.dur * Math.PI * 3;
        if (!P.did && P.t > 0.15) { P.did = true; melee(2.4, Math.PI, 1, 'spin', { once: true }); }
        if (!P.did2 && P.t > 0.35) { P.did2 = true; P.hitSet.clear(); melee(2.4, Math.PI, 1, 'spin', { once: true }); }
      }
      if (k === 'tame' && !P.did && P.t > 0.2) { P.did = true; melee(3.4, Math.PI, 3, 'tame'); shock(P.x, P.z, 3.6, [1, 0.9, 0.6]); Sound.pound(); cam.shake = 0.35; }
      if (k === 'mikiri' && !P.did && P.t > 0.18) { P.did = true; melee(3.0, 1.4, 5, 'mikiri'); shock(P.x + Math.sin(P.face) * 1.5, P.z + Math.cos(P.face) * 1.5, 2.6, [0.6, 0.85, 1]); Sound.pound(); cam.shake = 0.4; }
      if (P.t >= P.dur) { P.st = 'normal'; P.spinA = 0; P.comboWin = k === 'pet' ? 0.45 : 0; if (k !== 'pet') P.combo = 0; }
    } else if (P.st === 'pound') {
      tvx = 0; tvz = 0; control = 30; P.vy = -26;
    } else if (P.st === 'guard') {
      P.t += dt; tvx = 0; tvz = 0;
      if (!B.held.dash || P.t > 2.0) { P.st = 'normal'; P.guardCd = 0.7; }
    } else if (P.st === 'roll') {
      P.t += dt; control = 6;
      const dirx = I.mv ? mvx : Math.sin(P.face), dirz = I.mv ? mvz : Math.cos(P.face), dl = Math.hypot(dirx, dirz) || 1;
      tvx = dirx / dl * 12; tvz = dirz / dl * 12;
      for (const e of en) {
        if (e.dead || e.leaving || e.spawn > 0 || e.rollCd > 0) continue;
        if (Math.hypot(e.x - P.x, e.z - P.z) < 1.4 + e.def.r && e.y < P.y + 2.6) { damage(e, 2, [P.x, 0, P.z], 'roll'); e.rollCd = 0.6; Sound.kineHit(); }
      }
      if (Math.random() < dt * 20) burst([P.x, 0.2, P.z], 1, [[0.75, 0.76, 0.82]], 2, 0.3, 4);
      if (P.t > 3.5) { P.st = 'normal'; burst([P.x, 1.2, P.z], 20, [[1, 1, 1], [1, 0.8, 0.9]], 6, 0.3); Sound.puff(); }
    } else if (P.st === 'beam') {
      P.t += dt; tvx = 0; tvz = 0; P.vy = 0; faceMove = false;
      if (!P.did && P.t > 0.15) { P.did = true; fireBeam(); }
      if (P.t > 0.8) P.st = 'normal';
    } else if (P.st === 'pose') {
      P.t += dt; tvx = 0; tvz = 0; if (P.t > 0.5) P.st = 'normal';
    } else if (P.st === 'normal') {
      // ジャンプ
      if (B.pressed.jump) {
        if (P.ground) { P.vy = 9; P.jumps = 1; P.ground = false; P.hoverT = 0; Sound.jump(); }
        else if (P.jumps < 2) { P.vy = 8; P.jumps = 2; Sound.jump2(); burst([P.x, P.y + 0.2, P.z], 6, [[1, 1, 1]], 2, 0.2, 0); }
      }
      // みみ ぱたぱた
      if (!P.ground && B.held.jump && P.vy < 0 && P.hoverT < 1.6) {
        P.vy = Math.max(P.vy, -1.5); P.hoverT += dt;
        if (P.hoverT > 0.25) learn('hover');
        if (Math.random() < dt * 12) burst([P.x, P.y + 2.2, P.z], 1, [[1, 1, 1]], 1.5, 0.15, 0);
      }
      // きね
      if (B.pressed.kine) {
        P.kineOk = false;
        if (!P.ground && P.y > 0.8) { P.st = 'pound'; }
        else if (P.counter > 0) startKine('mikiri');
        else {
          P.kineOk = true;
          if (P.after > 0) { P.st = 'tackle'; P.t = 0; P.hitSet.clear(); learn('tackle'); Sound.swing(); }
          else {
            P.combo = P.comboWin > 0 ? P.combo + 1 : 1;
            startKine(P.combo >= 3 ? 'spin' : 'pet');
          }
        }
      } else if (B.released.kine && P.kineOk && B.hold.kine >= 0.9 && P.ground) { P.kineOk = false; P.combo = 0; startKine('tame'); }
      // なげる
      if (P.st === 'normal' && B.pressed.throw && live) {
        if (P.after > 0) placeTrap();
        else if (P.cd <= 0) {
          P.cd = 0.25; faceTarget();
          if (!P.ground) { throwDango('air3', 3); learn('air3'); } else throwDango('dango', 1);
        }
      } else if (P.st === 'normal' && B.released.throw && B.hold.throw >= 0.9 && live) { faceTarget(); throwDango('big'); learn('big'); }
      // ダッシュ / バリア
      if (P.st === 'normal' && B.pressed.dash) {
        if (I.mv && P.dashCd <= 0) {
          const l = Math.hypot(mvx, mvz) || 1;
          P.dashDir = [mvx / l, mvz / l]; P.st = 'dash'; P.t = 0; P.justDone = false; P.face = Math.atan2(mvx, mvz);
          learn('dash'); Sound.dash(); burst([P.x, 0.3, P.z], 6, [[0.85, 0.86, 0.9]], 3, 0.25, 3);
        } else if (!I.mv && P.guardCd <= 0) { P.st = 'guard'; P.t = 0; learn('guard'); Sound.guard(); }
      }
      if (P.st === 'normal' && B.pressed.sp) useSpecial(P.after > 0);
      P.charging = (B.held.kine && P.kineOk && B.hold.kine >= 0.9) || (B.held.throw && B.hold.throw >= 0.9);
      if (P.charging && !S.chargeSnd) { S.chargeSnd = true; Sound.charge(); }
      if (!P.charging) S.chargeSnd = false;
    }
    if (P.st !== 'normal') P.charging = false;

    // ---- うごかす ----
    const acc = 1 - Math.exp(-dt * control);
    P.vx += (tvx - P.vx) * acc; P.vz += (tvz - P.vz) * acc;
    if (P.st !== 'beam') P.vy -= GRAV * dt;
    P.x += P.vx * dt; P.y += P.vy * dt; P.z += P.vz * dt;
    const pl = Math.hypot(P.x, P.z);
    if (pl > ARENA) { P.x *= ARENA / pl; P.z *= ARENA / pl; }

    // ふみつけ
    if (P.vy < 0 && !P.ground && live) {
      for (const e of en) {
        if (e.dead || e.leaving || e.spawn > 0 || !(e.def.stomp || e.st === 'fallen')) continue;
        const top = e.y + e.def.h;
        if (Math.hypot(e.x - P.x, e.z - P.z) < e.def.r + 0.45 && P.y <= top + 0.4 && P.y >= top - 0.7) {
          if (e.def.onStomp) e.def.onStomp(e, G);
          damage(e, P.st === 'pound' ? 2 : 1, [P.x, P.y, P.z], 'stomp');
          P.vy = 11; P.jumps = 1; P.hoverT = 0; P.st = 'normal'; P.y = top + 0.05;
          learn('stomp'); Sound.stomp(); burst([P.x, P.y, P.z], 8, [[1, 1, 1]], 3, 0.2);
          break;
        }
      }
    }
    // ちゃくち
    if (P.y <= 0) {
      if (P.st === 'pound') {
        P.st = 'pose'; P.t = 0.2; learn('drop');
        melee(3.6, Math.PI, 2, 'drop', { groundOnly: true });
        shock(P.x, P.z, 4, [1, 0.95, 0.7]); Sound.pound(); cam.shake = 0.35; P.squash = 0.5;
        burst([P.x, 0.2, P.z], 16, [[0.75, 0.76, 0.82], [1, 1, 1]], 6, 0.3, 6);
      } else if (!P.ground && P.vy < -4) { P.squash = 0.35; Sound.land(); burst([P.x, 0.1, P.z], 5, [[0.75, 0.76, 0.82]], 2, 0.25, 4); }
      if (P.st === 'long') P.st = 'normal';
      P.y = 0; P.vy = 0; P.ground = true; P.jumps = 0; P.hoverT = 0;
    } else if (P.y > 0.05) P.ground = false;

    const sp = Math.hypot(P.vx, P.vz);
    if (sp > 0.5) P.hop += dt * sp * 1.6;
    if (faceMove && P.st !== 'guard' && P.st !== 'pose') {
      let want = sp > 0.8 ? Math.atan2(P.vx, P.vz) : P.face;
      if (P.st === 'normal' && (P.charging || P.cd > 0.1) && S.target) { const a = aimPoint(); want = Math.atan2(a[0] - P.x, a[2] - P.z); }
      P.face += wrap(want - P.face) * (1 - Math.exp(-dt * 14));
    }
  }
  function placeTrap() {
    zones.push({ kind: 'trap', x: P.x, z: P.z, r: 1.9, t: 0, warn: 0, act: 7 });
    learn('trap'); Sound.trap(); P.st = 'normal'; P.after = 0;
    burst([P.x, 0.3, P.z], 10, [[1, 1, 1], [1, 0.85, 0.9]], 3, 0.25, 4);
  }
  function fireBeam() {
    const from = [P.x, P.y + 1.2, P.z], to = aimPoint(), dir = V3.norm(V3.sub(to, from)), len = 34;
    beams.push({ p: from, dir, len, t: 0, max: 0.6 });
    Sound.beam(); cam.shake = 0.3;
    for (const e of en) {
      if (e.dead || e.leaving || e.spawn > 0) continue;
      const c = [e.x, e.y + e.def.h * 0.5, e.z], w = V3.sub(c, from), proj = V3.dot(w, dir);
      if (proj < 0 || proj > len) continue;
      const near = V3.add(from, V3.mul(dir, proj));
      if (V3.len(V3.sub(c, near)) < e.def.r + Math.max(0.9, e.def.h * 0.5)) damage(e, 5, from, 'beam');
    }
  }

  // ---------------- ゲームの ながれ ----------------
  function clearWorld() {
    for (const p of pops) p.el.remove();
    en = []; shots = []; eshots = []; zones = []; rings = []; items = []; parts = []; pops = []; evts = []; shocks = []; beams = [];
  }
  function startGame(diff) {
    S.diff = diff; S.D = DIFF[diff];
    S.mode = 'play'; S.paused = false; S.time = 0; S.endT = 0; S.itemT = 12; S.slow = 0; S.kills = 0; S.newWaza = 0;
    S.target = null; S.boss = null; S.wave = S.story ? -1 : WAVES.length - 1; S.queue = []; S.stage = '';
    Object.assign(P, { x: 0, y: 0, z: 10, vx: 0, vz: 0, vy: 0, face: Math.PI, hp: S.D.hp, maxHp: S.D.hp, inv: 0, jumps: 0, squash: 0, ground: true,
      st: 'normal', t: 0, combo: 0, comboWin: 0, after: 0, cd: 0, dashCd: 0, guardCd: 0, gauge: 0, counter: 0, sleepy: 0, hoverT: 0, spinA: 0, charging: false });
    clearWorld();
    cam.dir = [0, 0, 1]; cam.pos = [0, 6, 20];
    drawHearts(); drawGauge();
    $('title').hidden = true; $('result').hidden = true; $('pause').hidden = true; $('zukan').hidden = true; $('hud').hidden = false;
    document.body.classList.add('playing');
    Sound.init(); Sound.setFast(false); Sound.bgm(true);
    sayWho('👸 かぐやひめ', S.story ? 'おほほ… つきの おだんごは わたくしの もの！ みなさん、やっておしまい！' : 'おほほ… つきの おだんごは ぜんぶ わたくしの もの！', 3.2);
    hint('🕹️ うごく ・ ⬆️ ジャンプ ・ 🍡 なげる ・ 🔨 きね ・ 💨 ダッシュ', 5);
    nextWave();
  }
  function nextWave() {
    S.wave++;
    if (S.wave < WAVES.length) {
      S.stage = 'wave'; S.queue = WAVES[S.wave].slice(); S.spawnT = 1.2;
      banner(`ウェーブ ${S.wave + 1} / ${WAVES.length}`, 2);
    } else {
      S.stage = 'bossIntro';
      const dx = -P.x, dz = -P.z, l = Math.hypot(dx, dz);
      const [bx, bz] = l > 3 ? [P.x + dx / l * 9, P.z + dz / l * 9] : [P.x, P.z - 9];
      S.boss = spawnEnemy('kaguya', bx, bz, { quiet: true });
      sayWho('👸 かぐやひめ', S.story ? 'まあ、みんな やられて しまったの？ では わたくしが おあいて しますわ！' : 'おほほ、つかまえて ごらんなさい！', 3);
      banner('ボス: かぐやひめ', 2.2);
      Sound.bgm(false); Sound.boss();
    }
    drawInfo();
  }
  function updateWaves(dt) {
    if (S.mode !== 'play') return;
    if (S.stage === 'wave') {
      const alive = en.filter((e) => !e.dead && !e.clone).length;
      S.spawnT -= dt;
      if (S.queue.length && S.spawnT <= 0 && alive < S.D.alive) {
        const [x, z] = spawnPos(); spawnEnemy(S.queue.shift(), x, z); S.spawnT = 2.5; drawInfo();
      }
      if (!S.queue.length && alive === 0) {
        S.stage = 'between'; S.waveT = 3.2;
        banner(S.wave + 1 < WAVES.length ? 'ウェーブ クリア！' : 'ぜんぶ やっつけた！', 2); Sound.clear();
        if (P.hp < P.maxHp) dropItem(true);
      }
    } else if (S.stage === 'between') {
      S.waveT -= dt; if (S.waveT <= 0) nextWave();
    }
  }
  function dropItem(near) {
    const a = rnd(0, Math.PI * 2), d = near ? rnd(3, 6) : rnd(4, ARENA - 4);
    let x = (near ? P.x : 0) + Math.cos(a) * d, z = (near ? P.z : 0) + Math.sin(a) * d;
    const l = Math.hypot(x, z); if (l > ARENA - 2) { x *= (ARENA - 2) / l; z *= (ARENA - 2) / l; }
    items.push({ x, z, t: 0 });
    hint('🍡 おつきみ だんご！ とると ハートが ふえるよ', 2.6);
  }
  function toTitle() {
    S.mode = 'title'; S.paused = false; S.boss = null;
    $('result').hidden = true; $('pause').hidden = true; $('hud').hidden = true; $('title').hidden = false; $('zukan').hidden = true;
    document.body.classList.remove('playing', 'slowmo');
    Sound.bgm(false);
    clearWorld();
    Object.assign(P, { x: 0, y: 0, z: 3, face: Math.PI, inv: 0, squash: 0, st: 'normal', spinA: 0, charging: false });
    const k = spawnEnemy('kaguya', 0, -4, { quiet: true, noMeet: true });
    k.intro = false; k.y = 3; k.spawn = 0; k.title = true;
    renderTitle();
  }
  function togglePause() {
    if (S.mode !== 'play') return;
    S.paused = !S.paused;
    $('pause').hidden = !S.paused;
    Sound.bgm(!S.paused);
  }
  function win(k) {
    S.mode = 'win'; S.endT = 0; eshots = []; zones = zones.filter((z) => z.kind === 'trap'); rings = []; evts = [];
    for (const e of en) if (e !== k && !e.dead) { e.dead = true; e.deadT = 0; burst([e.x, e.y + 1, e.z], 10, [[1, 1, 1]], 4, 0.25); }
    Sound.bgm(false); Sound.win();
    sayWho('👸 かぐやひめ', 'まいりました… おだんごは おかえし しますわ。また あそびましょうね 🌕', 4);
    burst([k.x, k.y + 1.6, k.z], 50, [[1, 0.95, 0.6], [1, 0.8, 0.9], [1, 1, 1]], 10, 0.3, 1);
    const key = S.diff + (S.story ? '' : '-boss'), prev = best[key];
    S.newBest = !prev || S.time < prev;
    if (S.newBest) { best[key] = Math.round(S.time * 10) / 10; save('tsuki-usagi-best2', best); }
  }
  function lose() {
    S.mode = 'lose'; S.endT = 0; eshots = []; zones = []; rings = []; evts = [];
    Sound.bgm(false); Sound.lose();
    sayWho('👸 かぐやひめ', 'おほほ… また いつでも いらっしゃい', 3);
  }
  function showResult(won) {
    $('hud').hidden = true;
    const r = $('result');
    r.querySelector('.r-emoji').textContent = won ? '🐰🍡🌕' : '🐰💫';
    r.querySelector('.r-title').textContent = won ? 'おだんご とりかえした！' : 'ざんねん…';
    const nW = Object.keys(known).length, add = S.newWaza ? `（きょう ${S.newWaza}こ おぼえた！）` : '';
    let msg;
    if (won) {
      msg = `<p>${S.D.label}${S.story ? '' : '（かぐやひめ だけ）'} を クリア！</p><p>じかん: <b>${fmt(S.time)}</b>${S.newBest ? ' <span class="new">🏅 しんきろく！</span>' : ''}</p>`;
      msg += `<p>のこった ハート: ${'❤️'.repeat(Math.max(0, P.hp))}</p>`;
    } else {
      const tips = ['ひかりの たまは よこに うごいて よけよう', 'あかい まるが でたら すぐ にげよう', 'ひかる わっかは ジャンプで とびこえよう',
        'うごきながら 💨 で ジャスト よけ を ねらおう', 'とまって 💨 を おしっぱなし で もち バリア', 'ずかんで てきの じゃくてんを しらべよう'];
      msg = `<p>ウェーブ ${Math.min(S.wave + 1, WAVES.length)} まで すすんだ・やっつけた てき ${S.kills}</p><p>💡 ${tips[Math.floor(Math.random() * tips.length)]}</p>`;
    }
    msg += `<p class="small">📖 わざ ${nW} / ${WAZA.length} ${add}</p>`;
    r.querySelector('.r-msg').innerHTML = msg;
    r.hidden = false;
    document.body.classList.remove('playing', 'slowmo');
  }
  function renderTitle() {
    for (const k of Object.keys(DIFF)) {
      const el = document.querySelector(`[data-diff="${k}"] .best`);
      const v = best[k + (S.story ? '' : '-boss')];
      if (el) el.textContent = v ? `🏅 ${fmt(v)}` : '';
    }
    for (const b of document.querySelectorAll('[data-mode]')) b.classList.toggle('on', (b.dataset.mode === 'story') === S.story);
    $('bWaza').textContent = `📖 わざ ずかん ${Object.keys(known).filter((k) => WAZA.some((w) => w.id === k)).length}/${WAZA.length}`;
    $('bTeki').textContent = `👾 てき ずかん ${ENEMY_ORDER.filter((k) => met[k]).length}/${ENEMY_ORDER.length}`;
  }
  function openZukan(kind) {
    const list = $('zlist'); list.innerHTML = '';
    if (kind === 'waza') {
      $('ztitle').textContent = '📖 うさぎの わざ';
      WAZA.forEach((w, i) => {
        const li = document.createElement('li'); li.className = known[w.id] ? 'got' : '';
        li.innerHTML = `<span class="no">${i + 1}</span><span><b></b><small></small></span>`;
        li.querySelector('b').textContent = known[w.id] ? w.name : '？？？';
        li.querySelector('small').textContent = w.how;
        list.appendChild(li);
      });
    } else {
      $('ztitle').textContent = '👾 てき ずかん';
      for (const k of ENEMY_ORDER) {
        const D = ENEMY[k], li = document.createElement('li'); li.className = met[k] ? 'got' : '';
        li.innerHTML = `<span class="no"></span><span><b></b><small></small><small class="weak"></small></span>`;
        li.querySelector('.no').textContent = met[k] ? D.emoji : '？';
        li.querySelector('b').textContent = met[k] ? D.name : '？？？';
        li.querySelector('small').textContent = met[k] ? D.desc : 'まだ あっていない';
        li.querySelector('.weak').textContent = met[k] ? '💡 ' + D.weak : '';
        list.appendChild(li);
      }
    }
    $('zukan').hidden = false; $('title').hidden = true;
  }

  // ---------------- こうしん ----------------
  function update(dt) {
    S.t += dt;
    if (sayTimer > 0 && (sayTimer -= dt) <= 0) $('say').hidden = true;
    if (hintTimer > 0 && (hintTimer -= dt) <= 0) $('hint').hidden = true;
    if (toastTimer > 0 && (toastTimer -= dt) <= 0) $('toast').hidden = true;
    if (bannerTimer > 0 && (bannerTimer -= dt) <= 0) $('banner').hidden = true;

    if (S.mode === 'title') {
      const k = en[0];
      if (k) { k.y = 3 + Math.sin(S.t * 1.5) * 0.3; k.face = Math.sin(S.t * 0.5) * 0.6; }
      P.hop += dt * 6; P.face = Math.PI + Math.sin(S.t * 0.7) * 0.5;
      updateCam(dt); updateParts(dt);
      return;
    }

    S.slow = Math.max(0, S.slow - dt);
    document.body.classList.toggle('slowmo', S.slow > 0);
    const edt = dt * (S.slow > 0 ? 0.3 : 1);   // てきの じかん
    if (S.mode === 'play') S.time += dt;

    for (let i = evts.length - 1; i >= 0; i--) {
      if (S.t < evts[i].t) continue;
      const ev = evts[i]; evts.splice(i, 1);
      if (!ev.owner || (!ev.owner.dead && !ev.owner.leaving)) ev.fn();
    }

    pickTarget();
    const I = readInput(dt);
    updatePlayer(dt, I);
    updateEnemies(edt);
    updateShots(dt);
    updateEShots(edt);
    updateZones(edt, dt);
    updateWaves(dt);

    // おつきみ だんご
    if (S.mode === 'play') {
      S.itemT -= dt;
      if (S.itemT <= 0) { S.itemT = 16 + Math.random() * 6; if (items.length === 0 && P.hp < P.maxHp) dropItem(false); }
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]; it.t += dt;
      if (S.mode === 'play' && Math.hypot(P.x - it.x, P.z - it.z) < 1.4 && P.y < 1.6) {
        items.splice(i, 1);
        P.hp = Math.min(P.maxHp, P.hp + 1); drawHearts(); Sound.heal();
        burst([it.x, 1, it.z], 16, [[1, 1, 1], [1, 0.95, 0.6]], 5, 0.22, 2);
        popText([it.x, 2.4, it.z], 'ハート +1', 'good');
      }
    }
    for (let i = shocks.length - 1; i >= 0; i--) if ((shocks[i].t += dt) > shocks[i].max) shocks.splice(i, 1);
    for (let i = beams.length - 1; i >= 0; i--) if ((beams[i].t += dt) > beams[i].max) beams.splice(i, 1);

    updateParts(dt);
    updateCam(dt);

    if (S.mode === 'win' || S.mode === 'lose') {
      S.endT += dt;
      if (S.endT > 3.6 && $('result').hidden) showResult(S.mode === 'win');
    }
  }
  function pickTarget() {
    let bestE = null, bd = 1e9;
    const score = (e) => Math.hypot(e.x - P.x, e.z - P.z) * (e.def.boss ? 0.6 : 1);
    for (const e of en) { if (e.dead || e.leaving || e.spawn > 0.5) continue; const d = score(e); if (d < bd) { bd = d; bestE = e; } }
    const t = S.target;
    if (t && !t.dead && !t.leaving && en.includes(t)) { if (bestE && bestE !== t && bd < score(t) * 0.6) S.target = bestE; }
    else S.target = bestE;
  }
  function updateEnemies(dt) {
    for (let i = en.length - 1; i >= 0; i--) {
      const e = en[i], D = e.def;
      if (e.dead) { e.deadT += dt; if (e.deadT > 0.5) en.splice(i, 1); continue; }
      if (e.title) continue;
      if (e.leaving) {
        e.spin = (e.spin || 0) + dt * (4 + S.endT * 4); e.y += dt * (1 + S.endT * 3);
        if (Math.random() < dt * 20) burst([e.x, e.y + 0.5, e.z], 1, [[1, 0.95, 0.6]], 2, 0.2, 0);
        if (e.y > 30) en.splice(i, 1);
        continue;
      }
      if (e.spawn > 0) { e.spawn -= dt; continue; }
      e.flash = Math.max(0, e.flash - dt); e.rollCd -= dt; e.flipT = Math.max(0, e.flipT - dt);
      e.x += e.kx * dt; e.z += e.kz * dt;
      const kd = Math.exp(-dt * 6); e.kx *= kd; e.kz *= kd;
      const slowF = e.slowT > 0 ? 0.3 : 1; e.slowT -= dt;
      if (S.mode === 'play' || D.boss) {
        if (e.stun > 0) { e.stun -= dt; e.touchOn = false; if (Math.random() < dt * 4) burst([e.x, e.y + D.h + 0.3, e.z], 1, [[1, 1, 0.5]], 1, 0.18, -1); }
        else if (S.mode === 'play') D.update(e, G, dt * slowF);
      }
      if (!D.fly) { e.vy -= GRAV * dt; e.y += e.vy * dt; if (e.y < 0) { e.y = 0; e.vy = 0; } }
      const l = Math.hypot(e.x, e.z), lim = D.boss ? ARENA + 2 : ARENA - 0.5;
      if (l > lim) { e.x *= lim / l; e.z *= lim / l; }
      if (e.touchOn && S.mode === 'play' && Math.hypot(e.x - P.x, e.z - P.z) < D.r + 0.5 && P.y < e.y + D.h * 0.8) hurt([e.x, e.y, e.z]);
    }
  }
  function hitTest(s, e) {
    return Math.hypot(s.x - e.x, s.z - e.z) < e.def.r + s.r && s.y > e.y - s.r && s.y < e.y + e.def.h + s.r;
  }
  function updateShots(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.life += dt; s.rot += dt * 14;
      if (s.follow && !s.follow.dead) { s.x += (s.follow.x - s.x) * Math.min(1, dt * 3); s.z += (s.follow.z - s.z) * Math.min(1, dt * 3); }
      if (s.grav) s.v[1] -= s.grav * dt;
      s.x += s.v[0] * dt; s.y += s.v[1] * dt; s.z += s.v[2] * dt;
      let gone = false;
      for (const e of en) {
        if (e.dead || e.leaving || e.spawn > 0 || s.hit.has(e.id)) continue;
        if (!hitTest(s, e)) continue;
        s.hit.add(e.id);
        damage(e, s.dmg, [s.x - s.v[0] * 0.05, s.y, s.z - s.v[2] * 0.05], s.kind);
        if (!s.pierce) { gone = true; break; }
      }
      if (!gone && (s.y < 0 || s.life > 3)) { gone = true; burst([s.x, 0.2, s.z], 5, [[1, 1, 1], [1, 0.8, 0.88]], 2, 0.18); if (s.kind !== 'rain') Sound.puff(); }
      if (gone) shots.splice(i, 1);
    }
  }
  function updateEShots(dt) {
    for (let i = eshots.length - 1; i >= 0; i--) {
      const o = eshots[i];
      o.life += dt;
      if (o.home && o.life < o.home && S.mode === 'play') {
        const want = V3.norm([P.x - o.x, P.y + 0.8 - o.y, P.z - o.z]), cur = V3.norm(o.v);
        o.v = V3.mul(V3.norm(V3.lerp(cur, want, Math.min(1, o.turn * dt))), o.spd || V3.len(o.v));
      }
      if (o.float) { o.v[1] *= Math.exp(-dt * 2); o.y += Math.sin(o.life * 5) * dt * 0.6; }
      o.x += o.v[0] * dt; o.y += o.v[1] * dt; o.z += o.v[2] * dt;
      if (o.ground) o.y = o.r - 0.05;
      if (o.low && o.y < 0.25) { o.y = 0.25; o.v[1] = 0; }
      if (o.float && o.y < 0.4) o.y = 0.4;
      if (Math.hypot(o.x - P.x, o.y - (P.y + 0.8), o.z - P.z) < o.r + 0.55) {
        if (P.st === 'guard' && P.t < 0.3 && o.reflect) { reflect(o); eshots.splice(i, 1); continue; }
        const r = hurt([o.x, o.y, o.z], { effect: o.effect });
        if (r !== 'dodge' && r !== 'inv') { eshots.splice(i, 1); if (o.kind === 'bubble') Sound.bubble(); continue; }
      }
      if ((!o.ground && !o.low && !o.float && o.y < 0.1) || o.life > o.max || Math.hypot(o.x, o.z) > ARENA + 6) {
        if (o.y < 0.3) burst([o.x, 0.2, o.z], 4, [[1, 1, 0.8]], 2, 0.15);
        eshots.splice(i, 1);
      }
    }
  }
  function reflect(o) {
    learn('reflect'); Sound.reflect();
    popText([P.x, P.y + 2.6, P.z], 'はねかえし！', 'good');
    const a = aimPoint(), from = [o.x, o.y, o.z], d = V3.norm(V3.sub(a, from));
    shots.push({ kind: 'refl', x: o.x, y: o.y, z: o.z, v: V3.mul(d, 20), r: 0.5, dmg: 2, hit: new Set(), rot: 0, life: 0, grav: 0, col: o.col || [1, 0.8, 0.9] });
  }
  function updateZones(edt, dt) {
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i];
      const zdt = z.kind === 'trap' ? dt : edt;
      z.t += zdt;
      const up = z.t - z.warn;
      if (z.kind === 'trap') {
        for (const e of en) {
          if (e.dead || e.def.fly || e.spawn > 0) continue;
          if (Math.hypot(e.x - z.x, e.z - z.z) < z.r + e.def.r * 0.5) {
            e.slowT = 0.3;
            if (!e.trapped[i + ':' + z.x]) { e.trapped[i + ':' + z.x] = 1; e.stun = Math.max(e.stun, 1.5); e.touchOn = false; if (e.def.reset) e.def.reset(e, G); popText([e.x, e.y + e.def.h + 0.6, e.z], 'べたべた！', 'good'); Sound.trap(); }
          }
        }
      } else if (z.kind === 'bamboo') {
        if (up >= 0 && !z.popped) { z.popped = true; Sound.bamboo(); burst([z.x, 0.2, z.z], 10, [[0.55, 0.46, 0.3], [0.65, 0.66, 0.72]], 5, 0.3); }
        z.rise = up < 0 ? 0 : up < 0.15 ? up / 0.15 : up < 1.05 ? 1 : Math.max(0, 1 - (up - 1.05) / 0.35);
        if (z.rise > 0.5 && up < 1.05 && Math.hypot(P.x - z.x, P.z - z.z) < z.r && P.y < 4 * z.rise) hurt([z.x, 0, z.z]);
      } else if (z.kind === 'thunder') {
        if (up >= 0 && !z.popped) { z.popped = true; Sound.thunder(); cam.shake = Math.max(cam.shake, 0.25); burst([z.x, 0.3, z.z], 10, [[1, 1, 0.6], [1, 1, 1]], 6, 0.25); }
        if (up >= 0 && up < z.act && Math.hypot(P.x - z.x, P.z - z.z) < z.r && P.y < 8) hurt([z.x, 0, z.z]);
      } else if (z.kind === 'fire') {
        if (Math.hypot(P.x - z.x, P.z - z.z) < z.r && P.y < 0.6) hurt([z.x, 0, z.z]);
      }
      if (up > z.act) zones.splice(i, 1);
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i];
      g.r += S.D.ring * edt;
      if (P.y < 0.65 && Math.abs(Math.hypot(P.x - g.x, P.z - g.z) - g.r) < 0.5) hurt([g.x, 0, g.z]);
      if (g.r > ARENA * 2 + 4) rings.splice(i, 1);
    }
  }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.life -= dt;
      if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
      if (p.life <= 0) parts.splice(i, 1);
    }
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.life -= dt; p.p[1] += dt * 1.6;
      if (p.life <= 0) { p.el.remove(); pops.splice(i, 1); }
    }
  }
  function updateCam(dt) {
    const port = innerWidth / innerHeight < 1;
    if (S.mode === 'title') {
      const a = S.t * 0.18;
      cam.pos = [Math.sin(a) * (port ? 13 : 10), 4.5, Math.cos(a) * (port ? 13 : 10)];
      cam.look = [0, 2, 0];
      return;
    }
    const t = S.mode === 'win' ? S.boss : S.target;
    if (t && S.mode !== 'win') {
      let dx = P.x - t.x, dz = P.z - t.z;
      const l = Math.hypot(dx, dz);
      if (l > 1.5) {
        dx /= l; dz /= l;
        const k = 1 - Math.exp(-dt * 2.5);
        const nx = cam.dir[0] + (dx - cam.dir[0]) * k, nz = cam.dir[2] + (dz - cam.dir[2]) * k, nl = Math.hypot(nx, nz) || 1;
        cam.dir = [nx / nl, 0, nz / nl];
      }
    }
    const back = port ? 9.5 : 7.5, up = port ? 5.0 : 3.8;
    const tp = [P.x + cam.dir[0] * back, P.y * 0.5 + up, P.z + cam.dir[2] * back];
    const focus = t ? [t.x, t.y + t.def.h * 0.5, t.z] : [P.x - cam.dir[0] * 8, 1.5, P.z - cam.dir[2] * 8];
    const tl = V3.lerp([P.x, P.y * 0.6 + 1.3, P.z], focus, S.mode === 'win' ? 0.6 : 0.35);
    const k2 = 1 - Math.exp(-dt * 7);
    cam.pos = V3.lerp(cam.pos, tp, k2);
    cam.look = V3.lerp(cam.look, tl, k2);
    cam.shake = Math.max(0, cam.shake - dt);
  }

  // ---------------- えがく ----------------
  function shadow(x, z, h, s) {
    const k = clamp(1 - h / 10, 0.35, 1) * s;
    R.draw('cyl', TM(x, 0.15, z, k, 0.02, k), [0.3, 0.31, 0.38], 0);
  }
  function ringOf(x, z, r, y, h, w, col, em) {
    const n = Math.round(clamp(r * 7, 14, 120)), seg = (2 * Math.PI * r / n) * 1.08;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; R.draw('cube', TM(x + Math.cos(a) * r, y, z + Math.sin(a) * r, w, h, seg, -a), col, em); }
  }
  function drawEnemy(e) {
    const D = e.def;
    let s = 1;
    if (e.spawn > 0) s = 1 - e.spawn / 0.8 * 0.8;
    if (e.dead) { s = Math.max(0, 1 - e.deadT / 0.4); if (s <= 0.02) return; }
    if (e.clone && Math.sin(S.t * 7 + e.id * 2) > 0.9) return;
    shadow(e.x, e.z, e.y, D.r * 1.8);
    let col = e.flash > 0 ? [2, 2, 2] : null;
    if (!col && e.burn > 0) col = [1.4, 0.75, 0.55];
    if (!col && e.stun > 0 && Math.floor(S.t * 8) % 2) col = [1.25, 1.25, 1.0];
    let m;
    if (e.flipT > 0) m = TM(e.x, e.y + D.h * 0.6, e.z, s, s, s, e.face, 0, Math.PI);
    else m = TM(e.x, e.y, e.z, s, s, s, e.face + (e.spin || 0), 0, e.wob || 0);
    R.draw(M[D.mesh], m, col, e.flash > 0 ? 0.4 : 0);
    if (D.extra && !e.dead) D.extra(e, G, s);
    // げんき バー
    if (!D.boss && !e.clone && !e.dead && e.hp < e.maxHp) {
      const yaw = Math.atan2(cam.pos[0] - e.x, cam.pos[2] - e.z), y = e.y + D.h + 0.55, w = 1.5, f = Math.max(0, e.hp / e.maxHp);
      R.draw('cube', TM(e.x, y, e.z, w + 0.1, 0.22, 0.04, yaw), [0.15, 0.1, 0.25], 0.8);
      const mm = M4.ident(); M4.translate(mm, e.x, y, e.z); M4.rotY(mm, yaw); M4.translate(mm, -(w * (1 - f)) / 2, 0, 0.03); M4.scale(mm, w * f, 0.14, 0.04);
      R.draw('cube', mm, [1, 0.45, 0.65], 1);
    }
  }
  function drawRabbit() {
    shadow(P.x, P.z, P.y, 1.3);
    const blink = P.inv > 0 && Math.floor(P.inv * 12) % 2 === 0;
    if (blink) return;
    if (P.st === 'roll') {
      const m = TM(P.x, P.y + 1.25, P.z, 1, 1, 1, P.face, P.t * 12);
      R.draw(M.mochiBall, m, null, 0.1);
      R.draw(M.rabbit, TM(P.x, P.y + 0.6, P.z, 1, 1, 1, P.face), null, 0);
      return;
    }
    const moving = P.ground && Math.hypot(P.vx, P.vz) > 0.8;
    const hopY = (moving || S.mode === 'title') && P.st === 'normal' ? Math.abs(Math.sin(P.hop)) * 0.28 : 0;
    let sq = 1 + P.squash * 0.6;
    if (S.mode === 'lose') sq = 1.5;
    else if (!P.ground) sq = 0.92;
    const face = P.face + (P.spinA || 0);
    const wob = P.hoverT > 0 && !P.ground ? Math.sin(S.t * 30) * 0.12 : 0;
    const glow = P.charging ? 0.35 + 0.25 * Math.sin(S.t * 20) : (P.counter > 0 ? 0.3 : 0);
    const col = P.counter > 0 ? [0.85, 0.95, 1.3] : (P.sleepy > 0 ? [0.85, 0.8, 1.1] : null);
    R.draw(M.rabbit, TM(P.x, P.y + hopY, P.z, sq, 1 / sq, sq, face, 0, wob), col, glow);
    // きね
    let sw = -0.4;
    if (P.st === 'kine') {
      const t = P.t, d = P.dur;
      if (P.kind === 'spin') sw = Math.PI / 2;
      else if (t < 0.08) sw = -0.4 - 1.8 * (t / 0.08);
      else if (t < 0.17) sw = -2.2 + 3.8 * ((t - 0.08) / 0.09);
      else sw = 1.6 - 2.0 * ((t - 0.17) / Math.max(0.01, d - 0.17));
    } else if (P.st === 'pound' || P.charging) sw = -2.4;
    else if (P.st === 'tackle') sw = 1.1;
    else if (P.st === 'pose' && P.t < 0.4 && P.t > 0.1) sw = 1.6;
    const km = M4.ident(); M4.translate(km, P.x, P.y + hopY, P.z); M4.rotY(km, face);
    M4.translate(km, -0.5, 0.9, 0.2); M4.rotX(km, sw);
    const big = P.st === 'kine' && (P.kind === 'tame' || P.kind === 'mikiri') ? 1.5 : 1;
    M4.scale(km, big, big, big);
    R.draw(M.kine, km, P.counter > 0 ? [1, 1.2, 1.5] : null, P.charging || big > 1 ? 0.5 : 0);
    // もち バリア
    if (P.st === 'guard') {
      const just = P.t < 0.3;
      for (let i = 0; i < 8; i++) {
        const a = S.t * 6 + i * Math.PI / 4, r = 1.25;
        R.draw('sphere', TM(P.x + Math.cos(a) * r, P.y + 0.9 + Math.sin(a * 2) * 0.4, P.z + Math.sin(a) * r, 0.45, 0.45, 0.45), just ? [1, 0.75, 0.88] : [1, 1, 1], 0.7);
      }
      ringOf(P.x, P.z, 1.3, 0.2, 0.08, 0.12, just ? [1, 0.75, 0.88] : [1, 1, 1], 1);
    }
  }
  function render() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const asp = w / h;
    const proj = M4.persp((asp < 1 ? 68 : 55) * Math.PI / 180, asp, 0.4, 420);
    let eye = cam.pos;
    if (cam.shake > 0) eye = V3.add(eye, [rnd(-1, 1) * cam.shake * 0.4, rnd(-1, 1) * cam.shake * 0.4, 0]);
    const view = M4.lookAt(eye, cam.look, [0, 1, 0]);
    vpMat = M4.mul(proj, view);
    R.begin(w, h, vpMat, eye, TH);

    R.fog(false);
    R.draw(M.star, TM(eye[0], eye[1], eye[2], 1, 1, 1, S.t * 0.004), null, 0);
    const ed = V3.norm([-0.55, 0.42, -0.72]);
    R.draw(M.earth, TM(eye[0] + ed[0] * 150, eye[1] + ed[1] * 150, eye[2] + ed[2] * 150, 26, 26, 26, S.t * 0.03, 0.4), null, 0);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    R.fog(true);
    R.draw(M.ground, M4.ident(), null, 0);

    // ゆかの しかけ
    for (const z of zones) {
      const up = z.t - z.warn, pulse = 0.5 + 0.5 * Math.sin(z.t * 18);
      if (z.kind === 'bamboo') {
        if (up < 0.2) { const s = z.r * 2 * (0.6 + 0.4 * Math.min(1, z.t / 0.3)); R.draw('cyl', TM(z.x, 0.17, z.z, s, 0.02, s), [1, 0.25 + pulse * 0.35, 0.2], 0.6); }
        if (z.rise > 0) R.draw(M.bamboo, TM(z.x, -4.6 * (1 - z.rise), z.z, 1, 1, 1, z.x * 7), null, 0);
      } else if (z.kind === 'thunder') {
        if (up < 0) R.draw('cyl', TM(z.x, 0.17, z.z, z.r * 2, 0.02, z.r * 2), [1, 0.85 + pulse * 0.15, 0.2], 0.4 + pulse * 0.4);
        else {
          let px = z.x, pz = z.z;
          for (let k = 0; k < 5; k++) {
            const y0 = 16 - k * 3.2, nx = z.x + rnd(-0.7, 0.7), nz = z.z + rnd(-0.7, 0.7), y1 = y0 - 3.2;
            const p0 = [px, y0, pz], p1 = [k === 4 ? z.x : nx, Math.max(0, y1), k === 4 ? z.z : nz], d = V3.sub(p1, p0);
            R.draw('cube', orientY(V3.lerp(p0, p1, 0.5), d, 0.3, V3.len(d), 0.3), [1, 1, 0.75], 1);
            px = p1[0]; pz = p1[2];
          }
          R.draw('cyl', TM(z.x, 0.17, z.z, z.r * 2.4, 0.02, z.r * 2.4), [1, 1, 0.8], 1);
        }
      } else if (z.kind === 'fire') {
        const left = z.act - up, s = clamp(left / 0.6, 0, 1) * clamp(z.t / 0.2, 0, 1);
        for (let k = 0; k < 3; k++) {
          const a = k * 2.1 + z.x, fl = 0.8 + 0.3 * Math.sin(S.t * 20 + k + z.z);
          R.draw('cone', TM(z.x + Math.cos(a) * 0.3, 0.4 * s * fl, z.z + Math.sin(a) * 0.3, 0.5 * s, 0.9 * s * fl, 0.5 * s), k ? [1, 0.55, 0.1] : [1, 0.85, 0.25], 1);
        }
      } else if (z.kind === 'trap') {
        const s = clamp((z.act - up) / 0.5, 0, 1);
        R.draw('ball', TM(z.x, 0.12, z.z, z.r * 2 * s, 0.3, z.r * 2 * s), [1, 1, 1], 0.4);
        R.draw('ball', TM(z.x + 0.4, 0.2, z.z - 0.3, 0.5 * s, 0.25, 0.5 * s), [1, 0.8, 0.88], 0.4);
      }
    }
    for (const g of rings) ringOf(g.x, g.z, g.r, 0.32, 0.6, 0.32, [1, 0.85, 0.35], 1);
    for (const sh of shocks) { const k = sh.t / sh.max; ringOf(sh.x, sh.z, sh.r * (0.3 + 0.7 * k), 0.25, 0.4 * (1 - k) + 0.05, 0.25, sh.col, 1); }
    for (const it of items) {
      shadow(it.x, it.z, 0, 1.4);
      R.draw(M.item, TM(it.x, 0.1 + Math.abs(Math.sin(it.t * 3)) * 0.3, it.z, 1.2, 1.2, 1.2, it.t * 1.5), null, 0.15 + 0.15 * Math.sin(it.t * 6));
    }

    for (const e of en) drawEnemy(e);
    // ねらって いる てきの しるし
    const tg = S.target;
    if (tg && !tg.dead && !tg.leaving && S.mode === 'play') {
      R.draw('cone', TM(tg.x, tg.y + tg.def.h + 1.2 + Math.sin(S.t * 5) * 0.15, tg.z, 0.45, 0.55, 0.45, S.t * 3, Math.PI), [1, 0.5, 0.75], 1);
    }
    drawRabbit();

    for (const s of shots) {
      if (s.kind === 'refl') { R.draw('sphere', TM(s.x, s.y, s.z, 0.9, 0.9, 0.9), s.col, 1); continue; }
      const k = s.kind === 'big' ? 2.2 : s.kind === 'rain' ? 1.3 : 1;
      R.draw(M.dango, s.kind === 'rain' ? TM(s.x, s.y, s.z, k, k, k) : TM(s.x, s.y, s.z, k, k, k, 0, s.rot, s.rot * 0.6), null, s.kind === 'big' ? 0.4 : 0.2);
    }
    for (const o of eshots) {
      const sp = V3.len(o.v) > 0.1 ? o.v : [0, 0, 1];
      if (o.kind === 'orb') {
        const s = 0.75 + Math.sin(o.life * 20) * 0.08;
        R.draw('sphere', TM(o.x, o.y, o.z, s, s, s), [1, 0.93, 0.5], 1);
        R.draw('ball', TM(o.x, o.y, o.z, s * 1.5, s * 1.5, s * 1.5), [1, 0.98, 0.8], 0.55);
      } else if (o.kind === 'jewel') R.draw('cube', TM(o.x, o.y, o.z, 0.5, 0.5, 0.5, o.life * 8, o.life * 6), o.col, 1);
      else if (o.kind === 'bowl') R.draw(M.bowl, TM(o.x, o.y, o.z, 0.75, 0.75, 0.75, Math.atan2(o.v[0], o.v[2]), o.life * 10), null, 0);
      else if (o.kind === 'swallow') R.draw(M.swallow, orientZ([o.x, o.y, o.z], sp, 1.1), null, 0);
      else if (o.kind === 'arrow') R.draw(M.arrow, orientZ([o.x, o.y, o.z], sp, 1), null, 0);
      else if (o.kind === 'larrow') R.draw(M.arrow, orientZ([o.x, o.y, o.z], sp, 1), [1.2, 1.2, 0.9], 1);
      else if (o.kind === 'sleep') { const s = 1.2 + Math.sin(o.life * 8) * 0.15; R.draw('sphere', TM(o.x, o.y, o.z, s, s, s), [0.75, 0.55, 1], 1); }
      else if (o.kind === 'bubble') R.draw('sphere', TM(o.x, o.y, o.z, 0.75, 0.75, 0.75), [0.75, 0.9, 1], 0.6);
    }
    for (const b of beams) {
      const k = 1 - b.t / b.max, wdt = 1.3 * k + 0.1;
      const c = V3.add(b.p, V3.mul(b.dir, b.len / 2));
      R.draw('cyl', orientY(c, b.dir, wdt, b.len, wdt), [1, 0.97, 0.7], 1);
      R.draw('cyl', orientY(c, b.dir, wdt * 0.45, b.len, wdt * 0.45), [1, 1, 1], 1);
    }
    for (const p of parts) { const s = p.size * clamp(p.life / 0.4, 0.2, 1); R.draw('ball', TM(p.x, p.y, p.z, s, s, s), p.col, 1); }

    for (const p of pops) {
      const v = M4.xform(vpMat, p.p);
      if (v[3] <= 0) { p.el.style.opacity = 0; continue; }
      const x = (v[0] / v[3] * 0.5 + 0.5) * innerWidth, y = (1 - (v[1] / v[3] * 0.5 + 0.5)) * innerHeight;
      p.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      p.el.style.opacity = clamp(p.life / 0.3, 0, 1);
    }
  }

  // ---------------- ループ ----------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!S.paused) update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ---------------- ボタン ----------------
  for (const b of document.querySelectorAll('[data-diff]')) b.addEventListener('click', () => { Sound.init(); Sound.click(); startGame(b.dataset.diff); });
  for (const b of document.querySelectorAll('[data-mode]')) b.addEventListener('click', () => { Sound.init(); Sound.click(); S.story = b.dataset.mode === 'story'; renderTitle(); });
  $('bWaza').addEventListener('click', () => { Sound.click(); openZukan('waza'); });
  $('bTeki').addEventListener('click', () => { Sound.click(); openZukan('teki'); });
  $('bZclose').addEventListener('click', () => { Sound.click(); $('zukan').hidden = true; $('title').hidden = false; renderTitle(); });
  $('bAgain').addEventListener('click', () => { Sound.click(); startGame(S.diff); });
  $('bTitle').addEventListener('click', () => { Sound.click(); toTitle(); });
  $('bResume').addEventListener('click', () => { Sound.click(); togglePause(); });
  $('bQuit').addEventListener('click', () => { Sound.click(); toTitle(); });
  $('bPause').addEventListener('click', () => togglePause());
  const sndBtns = document.querySelectorAll('.snd');
  const showSnd = () => { for (const b of sndBtns) { b.textContent = Sound.isOn() ? '🔊' : '🔇'; b.setAttribute('aria-label', Sound.isOn() ? 'おと オン' : 'おと オフ'); } };
  for (const b of sndBtns) b.addEventListener('click', () => { Sound.init(); Sound.toggle(); showSnd(); });
  showSnd();
  document.addEventListener('visibilitychange', () => { if (document.hidden && !S.paused && S.mode === 'play') togglePause(); });

  toTitle();
  requestAnimationFrame(frame);

  // テストよう
  window.__tsuki = { S, P, G, WAZA, known, met, startGame, spawn: spawnEnemy, learn, eshots: () => eshots,
    get en() { return en; }, get counts() { return { en: en.length, shots: shots.length, eshots: eshots.length, zones: zones.length, rings: rings.length }; } };
})();
