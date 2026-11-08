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
  const DIFF = {
    easy:   { hp: 7, khp: 16, cd: 1.35, orb: 5.0, warn: 1.35, ring: 6.0, label: 'やさしい' },
    normal: { hp: 5, khp: 24, cd: 1.0,  orb: 6.5, warn: 1.05, ring: 7.5, label: 'ふつう' },
    hard:   { hp: 4, khp: 32, cd: 0.75, orb: 8.0, warn: 0.85, ring: 9.0, label: 'むずかしい' },
  };
  const TH = { L: V3.norm([0.45, 0.85, 0.35]), lc: [1.0, 0.98, 0.92], amb: [0.34, 0.36, 0.48],
    fog: [0.02, 0.03, 0.09, 1], fogN: 42, fogF: 100, night: 0.6 };

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let seed = 1;
  const srnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function T(x, y, z, sx, sy, sz, ry, rx, rz) {
    const m = M4.ident(); M4.translate(m, x, y, z);
    if (ry) M4.rotY(m, ry); if (rx) M4.rotX(m, rx); if (rz) M4.rotZ(m, rz);
    M4.scale(m, sx, sy, sz); return m;
  }
  function mk(fn) { const b = new Builder(); fn(b); return R.mesh(b); }
  const H = hexc;

  // ---------------- メッシュ ----------------
  const groundMesh = mk((b) => {
    b.add('cyl', T(0, -0.5, 0, 240, 1, 240), H('#7a7c89'));
    b.add('cyl', T(0, -0.46, 0, ARENA * 2 + 3, 1, ARENA * 2 + 3), H('#a7a9b6'));
    seed = 11;
    for (let i = 0; i < 30; i++) { // クレーター
      const inside = i < 7, a = srnd() * Math.PI * 2;
      const d = inside ? 4 + srnd() * (ARENA - 8) : ARENA + 7 + srnd() * 55;
      const r = inside ? 1.3 + srnd() * 1.6 : 2 + srnd() * 6;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      b.add('cyl', T(x, 0.06, z, r * 2, 0.04, r * 2), H('#8d8f9c'));
      b.add('cyl', T(x, 0.1, z, r * 1.35, 0.04, r * 1.35), H('#787a88'));
      const n = Math.max(8, Math.round(r * 5));
      for (let j = 0; j < n; j++) {
        const q = j / n * Math.PI * 2;
        b.add('ball', T(x + Math.cos(q) * r, 0, z + Math.sin(q) * r, r * 0.55, r * (inside ? 0.12 : 0.25), r * 0.55), H('#b5b7c3'));
      }
    }
    seed = 23;
    for (let i = 0; i < 36; i++) { // まわりの いわ
      const a = i / 36 * Math.PI * 2 + srnd() * 0.08, d = ARENA + 1.8 + srnd() * 1.4, s = 1.2 + srnd() * 1.5;
      b.add('ball', T(Math.cos(a) * d, s * 0.2, Math.sin(a) * d, s * 1.4, s, s * 1.1, srnd() * 3), H(srnd() < 0.5 ? '#9a9ca8' : '#878995'));
    }
    // すすき
    seed = 5;
    for (let c = 0; c < 9; c++) {
      const a = c / 9 * Math.PI * 2 + 0.3, d = ARENA + 4.5;
      const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
      for (let k = 0; k < 7; k++) {
        const h = 2 + srnd() * 1.6, lean = (srnd() - 0.5) * 0.6, ox = cx + (srnd() - 0.5) * 1.4, oz = cz + (srnd() - 0.5) * 1.4;
        b.add('cube', T(ox, h / 2, oz, 0.07, h, 0.07, srnd() * 3, 0, lean), H('#8c7a4b'));
        const ty = h * Math.cos(lean);
        b.add('ball', T(ox - Math.sin(lean) * h, ty, oz, 0.28, 0.75, 0.28, 0, 0, lean), H('#e9d8a6'));
      }
    }
    // もちつきの うす と きね
    const ux = 7, uz = -(ARENA + 3.5);
    b.add('cyl', T(ux, 0.7, uz, 2.4, 1.4, 2.4), H('#9c5b2e'));
    b.add('cyl', T(ux, 1.3, uz, 2.6, 0.25, 2.6), H('#b8743f'));
    b.add('ball', T(ux, 1.45, uz, 1.9, 0.6, 1.9), H('#ffffff'));
    b.add('cyl', T(ux + 1.4, 1.6, uz + 0.4, 0.15, 3.0, 0.15, 0, 0, 0.55), H('#c48a54'));
    b.add('cyl', T(ux + 2.2, 2.9, uz + 0.4, 0.7, 1.3, 0.7, 0, 0, 0.55 + Math.PI / 2), H('#b8743f'));
  });

  const starMesh = mk((b) => {
    seed = 99;
    for (let i = 0; i < 420; i++) {
      const u = srnd() * 2 - 1, f = srnd() * Math.PI * 2, y = Math.abs(u) * 0.95 + 0.02, r = Math.sqrt(1 - y * y);
      const s = 0.35 + srnd() * 0.7, c = srnd();
      b.add('cube', T(Math.cos(f) * r * 160, y * 160, Math.sin(f) * r * 160, s, s, s, srnd() * 3, srnd() * 3),
        c < 0.7 ? [1, 1, 1, 1] : c < 0.85 ? [1, 0.93, 0.6, 1] : [0.7, 0.85, 1, 1]);
    }
  });
  const earthMesh = mk((b) => {
    b.add('sphere', M4.ident(), H('#3b8fe0', 0.5));
    seed = 42;
    for (let i = 0; i < 16; i++) {
      const u = srnd() * 2 - 1, f = srnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const p = [Math.cos(f) * r, u, Math.sin(f) * r], s = 0.18 + srnd() * 0.22;
      const cloud = i >= 11;
      b.add('ball', T(p[0] * (cloud ? 0.47 : 0.43), p[1] * (cloud ? 0.47 : 0.43), p[2] * (cloud ? 0.47 : 0.43), s, s * 0.7, s), cloud ? H('#ffffff', 0.5) : H('#51cf66', 0.5));
    }
  });

  const rabbitMesh = mk((b) => {
    const W = H('#fbfbfd'), P = H('#ffb3cf'), Rd = H('#d6336c');
    b.add('sphere', T(0, 0.62, 0, 1.0, 1.05, 0.9), W);
    b.add('cyl', T(0, 1.0, 0.04, 0.78, 0.14, 0.72), H('#f03e3e'));
    b.add('cube', T(0.26, 0.8, -0.32, 0.18, 0.4, 0.06, 0, 0.2, -0.3), H('#f03e3e'));
    b.add('sphere', T(0, 1.38, 0.1, 0.92, 0.84, 0.84), W);
    for (const s of [-1, 1]) {
      b.add('sphere', T(s * 0.2, 2.08, -0.02, 0.27, 0.98, 0.17, 0, -0.15, -s * 0.16), W);
      b.add('sphere', T(s * 0.21, 2.06, 0.05, 0.14, 0.72, 0.06, 0, -0.15, -s * 0.16), P);
      b.add('sphere', T(s * 0.2, 1.44, 0.46, 0.13, 0.16, 0.1), Rd);
      b.add('sphere', T(s * 0.17, 1.48, 0.5, 0.05, 0.05, 0.04), H('#ffffff', 1));
      b.add('sphere', T(s * 0.31, 1.27, 0.43, 0.15, 0.08, 0.06), P);
      b.add('sphere', T(s * 0.42, 0.85, 0.28, 0.24, 0.32, 0.24), W);
      b.add('sphere', T(s * 0.26, 0.1, 0.22, 0.34, 0.2, 0.52), W);
    }
    b.add('sphere', T(0, 1.32, 0.53, 0.1, 0.07, 0.06), P);
    b.add('sphere', T(0, 0.5, -0.46, 0.4, 0.4, 0.4), W);
  });

  const kaguyaMesh = mk((b) => {
    const skin = H('#ffe8d6'), hair = H('#1f1d2b'), gold = H('#fcc419', 0.5);
    b.add('cyl', T(0, 2.6, -0.6, 1.9, 0.05, 1.9, 0, Math.PI / 2), H('#fff3bf', 1)); // うしろの つき
    b.add('cone', T(0, 0.9, 0, 2.1, 1.8, 2.1), H('#2f9e44'));
    b.add('cone', T(0, 1.15, 0, 1.8, 1.9, 1.8), H('#e03131'));
    b.add('cone', T(0, 1.5, 0, 1.4, 1.7, 1.4), H('#f783ac'));
    b.add('cone', T(0, 2.0, 0.02, 0.8, 0.8, 0.8), H('#fff0f6'));
    for (const s of [-1, 1]) {
      b.add('cube', T(s * 0.72, 1.6, 0.15, 0.5, 1.0, 0.55, s * 0.25, 0, s * 0.2), H('#e03131'));
      b.add('cube', T(s * 0.82, 1.2, 0.17, 0.52, 0.12, 0.57, s * 0.25, 0, s * 0.2), H('#2f9e44'));
      b.add('cube', T(s * 0.42, 2.3, 0.05, 0.13, 0.85, 0.2), hair);
      b.add('sphere', T(s * 0.17, 2.66, 0.36, 0.1, 0.13, 0.08), hair);
      b.add('sphere', T(s * 0.27, 2.53, 0.35, 0.14, 0.08, 0.05), H('#ffa8a8'));
    }
    b.add('sphere', T(0, 1.75, 0.55, 0.36, 0.22, 0.2), skin);
    b.add('cube', T(0.62, 1.95, 0.55, 0.55, 0.38, 0.04, 0.3, 0, -0.5), gold); // おうぎ
    b.add('sphere', T(0, 2.65, 0, 0.85, 0.9, 0.82), skin);
    b.add('sphere', T(0, 2.76, -0.13, 0.93, 0.96, 0.84), hair);
    b.add('cube', T(0, 3.02, 0.27, 0.72, 0.17, 0.16), hair);
    b.add('cube', T(0, 1.8, -0.42, 0.86, 2.1, 0.18), hair);
    b.add('sphere', T(0, 2.45, 0.4, 0.11, 0.04, 0.04), H('#e03131'));
    b.add('cube', T(0, 3.25, 0, 0.5, 0.12, 0.3), gold);
    b.add('sphere', T(0.32, 3.18, 0.05, 0.16, 0.16, 0.16), gold);
    b.add('sphere', T(-0.32, 3.18, 0.05, 0.16, 0.16, 0.16), gold);
    b.add('ball', T(0, 0.02, 0, 2.6, 0.3, 2.6), H('#fff9db', 1)); // のっている つきの ひかり
  });

  const dangoMesh = mk((b) => {
    b.add('cyl', T(0, 0, 0, 0.06, 1.2, 0.06), H('#d9a066'));
    b.add('sphere', T(0, 0.3, 0, 0.36, 0.36, 0.36), H('#ffc9de'));
    b.add('sphere', T(0, 0, 0, 0.36, 0.36, 0.36), H('#ffffff'));
    b.add('sphere', T(0, -0.3, 0, 0.36, 0.36, 0.36), H('#a9e34b'));
  });
  const itemMesh = mk((b) => {
    b.add('cube', T(0, 0.18, 0, 1.0, 0.36, 1.0), H('#e0a458'));
    b.add('cube', T(0, 0.4, 0, 1.1, 0.08, 1.1), H('#f0c27a'));
    for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) b.add('sphere', T(x, 0.62, z, 0.4, 0.38, 0.4), H('#ffffff', 0.5));
    b.add('sphere', T(0, 0.92, 0, 0.4, 0.38, 0.4), H('#ffffff', 0.5));
  });
  const bambooMesh = mk((b) => {
    for (const [x, z, h] of [[0, 0, 4.2], [0.45, 0.25, 3.4], [-0.4, 0.3, 3.0]]) {
      b.add('cyl', T(x, h / 2, z, 0.38, h, 0.38), H('#5c940d'));
      for (let y = 0.8; y < h - 0.3; y += 0.8) b.add('cyl', T(x, y, z, 0.44, 0.08, 0.44), H('#2b8a3e'));
      b.add('cone', T(x, h + 0.3, z, 0.38, 0.6, 0.38), H('#94d82d'));
    }
  });

  // ---------------- じょうたい ----------------
  const S = { mode: 'title', paused: false, t: 0, time: 0, diff: 'normal', D: DIFF.normal, endT: 0, itemT: 0 };
  const P = { x: 0, y: 0, z: 10, vx: 0, vz: 0, vy: 0, face: Math.PI, hp: 5, maxHp: 5, inv: 0, jumps: 0, cd: 0, hop: 0, squash: 0, ground: true };
  const K = { x: 0, y: 3, z: -6, hp: 24, maxHp: 24, tx: 0, ty: 3, tz: -6, moveT: 0, atkT: 3, phase: 1, flash: 0, face: 0, spin: 0, charge: 0, last: '', gone: false };
  let shots = [], orbs = [], bamboos = [], rings = [], items = [], parts = [], pops = [], evts = [];
  const cam = { pos: [0, 6, 18], look: [0, 1.5, 0], dir: [0, 0, 1], shake: 0 };
  let vpMat = M4.ident();

  let best = {};
  try { best = JSON.parse(localStorage.getItem('tsuki-usagi-best') || '{}') || {}; } catch (e) { best = {}; }
  const fmt = (s) => `${Math.floor(s / 60)}ふん ${String(Math.floor(s % 60)).padStart(2, '0')}びょう`;

  function later(d, fn) { evts.push({ t: S.t + d, fn }); }

  // ---------------- にゅうりょく ----------------
  const keys = {};
  let jumpQ = false, throwBtn = false;
  const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
  addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true;
    Sound.init();
    if (e.code === 'Space' || e.code === 'KeyK') jumpQ = true;
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; throwBtn = false; });

  const zone = $('stick'), base = $('knobBase'), knob = $('knob');
  const resetStick = () => {
    stick.id = null; stick.x = stick.y = 0; knob.style.transform = '';
    base.classList.remove('on'); base.style.left = ''; base.style.top = '';
  };
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
    const l = Math.hypot(dx, dy), M = 55;
    if (l > M) { dx *= M / l; dy *= M / l; }
    stick.x = dx / M; stick.y = -dy / M;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(ev, (e) => { if (e.pointerId === stick.id) resetStick(); });

  function padBtn(el, down, up) {
    el.addEventListener('pointerdown', (e) => { Sound.init(); try { el.setPointerCapture(e.pointerId); } catch (er) { /* むし */ } el.classList.add('down'); down(); e.preventDefault(); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, () => { el.classList.remove('down'); if (up) up(); });
  }
  padBtn($('bJump'), () => { jumpQ = true; });
  padBtn($('bThrow'), () => { throwBtn = true; }, () => { throwBtn = false; });

  const markTouch = () => document.body.classList.add('touch');
  if (matchMedia('(pointer: coarse)').matches) markTouch();
  addEventListener('touchstart', markTouch, { passive: true, once: true });

  let gpJumpPrev = false;
  function readInput() {
    let x = 0, y = 0, thr = throwBtn;
    if (keys.ArrowLeft || keys.KeyA) x -= 1;
    if (keys.ArrowRight || keys.KeyD) x += 1;
    if (keys.ArrowUp || keys.KeyW) y += 1;
    if (keys.ArrowDown || keys.KeyS) y -= 1;
    if (keys.KeyJ || keys.KeyZ || keys.Enter) thr = true;
    x += stick.x; y += stick.y;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const g of pads) {
      if (!g) continue;
      const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
      if (Math.abs(ax) > 0.2) x += ax;
      if (Math.abs(ay) > 0.2) y -= ay;
      if (g.buttons[14] && g.buttons[14].pressed) x -= 1;
      if (g.buttons[15] && g.buttons[15].pressed) x += 1;
      if (g.buttons[12] && g.buttons[12].pressed) y += 1;
      if (g.buttons[13] && g.buttons[13].pressed) y -= 1;
      const jb = !!(g.buttons[0] && g.buttons[0].pressed);
      if (jb && !gpJumpPrev) jumpQ = true;
      gpJumpPrev = jb;
      if ((g.buttons[2] && g.buttons[2].pressed) || (g.buttons[1] && g.buttons[1].pressed) || (g.buttons[7] && g.buttons[7].pressed)) thr = true;
      break;
    }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y, thr };
  }

  // ---------------- HUD ----------------
  function drawHearts() {
    let s = '';
    for (let i = 0; i < P.maxHp; i++) s += `<span class="${i < P.hp ? '' : 'off'}">${i < P.hp ? '❤️' : '🤍'}</span>`;
    $('hearts').innerHTML = s;
  }
  function drawKbar() { $('kfill').style.width = (Math.max(0, K.hp) / K.maxHp * 100) + '%'; }
  let sayTimer = 0;
  function say(text, dur) { const el = $('say'); el.textContent = text; el.hidden = false; sayTimer = dur || 2.6; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  let hintTimer = 0;
  function hint(text, dur) { const el = $('hint'); el.textContent = text; el.hidden = false; hintTimer = dur || 2.5; }

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
        life: rnd(0.5, 0.9), max: 0.9, col: cols[i % cols.length], size: size * rnd(0.6, 1.2), g: g == null ? 6 : g });
    }
  }

  // ---------------- ゲームの ながれ ----------------
  function startGame(diff) {
    S.diff = diff; S.D = DIFF[diff];
    S.mode = 'intro'; S.paused = false; S.time = 0; S.endT = 0; S.itemT = 9;
    Object.assign(P, { x: 0, y: 0, z: 10, vx: 0, vz: 0, vy: 0, face: Math.PI, hp: S.D.hp, maxHp: S.D.hp, inv: 0, jumps: 0, cd: 0, squash: 0, ground: true });
    Object.assign(K, { x: 0, y: 14, z: -6, hp: S.D.khp, maxHp: S.D.khp, tx: 0, ty: 3, tz: -6, moveT: 2, atkT: 3.2, phase: 1, flash: 0, spin: 0, charge: 0, last: '', gone: false });
    shots = []; orbs = []; bamboos = []; rings = []; items = []; parts = []; evts = [];
    for (const p of pops) p.el.remove();
    pops = [];
    cam.dir = [0, 0, 1]; cam.pos = [0, 6, 20];
    drawHearts(); drawKbar();
    $('title').hidden = true; $('result').hidden = true; $('pause').hidden = true; $('hud').hidden = false;
    document.body.classList.add('playing');
    Sound.init(); Sound.setFast(false); Sound.bgm(true);
    say('おほほ… つきの おだんごは ぜんぶ わたくしの もの！', 3.2);
    hint('🕹️ うごく ・ ⬆️ ジャンプ（2かい とべる）・ 🍡 なげる', 5);
  }
  function toTitle() {
    S.mode = 'title'; S.paused = false;
    $('result').hidden = true; $('pause').hidden = true; $('hud').hidden = true; $('title').hidden = false;
    document.body.classList.remove('playing');
    Sound.bgm(false);
    Object.assign(K, { x: 0, y: 3, z: -4, gone: false, spin: 0 });
    Object.assign(P, { x: 0, y: 0, z: 3, face: Math.PI, inv: 0, squash: 0 });
    shots = []; orbs = []; bamboos = []; rings = []; items = []; evts = [];
    renderBest();
  }
  function togglePause() {
    if (S.mode !== 'play' && S.mode !== 'intro') return;
    S.paused = !S.paused;
    $('pause').hidden = !S.paused;
    Sound.bgm(!S.paused);
  }
  function hurtPlayer(from) {
    if (P.inv > 0 || S.mode !== 'play') return;
    P.hp--; P.inv = 1.6; drawHearts();
    cam.shake = 0.5;
    Sound.hurt();
    if (from) { const dx = P.x - from[0], dz = P.z - from[2], l = Math.hypot(dx, dz) || 1; P.vx = dx / l * 9; P.vz = dz / l * 9; }
    P.vy = Math.max(P.vy, 5); P.ground = false;
    burst([P.x, P.y + 1, P.z], 10, [[1, 0.6, 0.7], [1, 1, 1]], 5, 0.25);
    popText([P.x, P.y + 2.4, P.z], 'いたっ！', 'bad');
    if (P.hp <= 0) lose();
  }
  function hitKaguya(p) {
    K.hp--; K.flash = 0.18; drawKbar();
    Sound.hitK();
    burst(p, 12, [[1, 0.8, 0.88], [1, 1, 1], [0.66, 0.89, 0.29]], 6, 0.22);
    popText([K.x, K.y + 3.6, K.z], ['ぽこっ！', 'ぺたっ！', 'もちっ！', 'あたり！'][Math.floor(Math.random() * 4)]);
    if (Math.random() < 0.18 && K.hp > 0) say(['きゃっ！', 'おもちで べたべた〜！', 'あら、やりますわね', 'もう！ にがしませんわ'][Math.floor(Math.random() * 4)], 1.6);
    if (K.phase === 1 && K.hp <= K.maxHp / 2) {
      K.phase = 2; K.atkT = 2.2;
      Sound.phase(); Sound.setFast(true);
      say('まあ！ ほんきを だしますわよ！', 2.6);
      burst([K.x, K.y + 1.6, K.z], 30, [[1, 0.95, 0.6], [1, 1, 1]], 9, 0.25, 0);
    }
    if (K.hp <= 0) win();
  }
  function clearHazards() {
    orbs = []; bamboos = []; rings = []; evts = []; K.charge = 0;
  }
  function win() {
    S.mode = 'win'; S.endT = 0; clearHazards();
    Sound.bgm(false); Sound.win();
    say('まいりました… おだんごは おかえし しますわ。また あそびましょうね 🌕', 4);
    burst([K.x, K.y + 1.6, K.z], 50, [[1, 0.95, 0.6], [1, 0.8, 0.9], [1, 1, 1]], 10, 0.3, 1);
    const prev = best[S.diff];
    S.newBest = !prev || S.time < prev;
    if (S.newBest) { best[S.diff] = Math.round(S.time * 10) / 10; try { localStorage.setItem('tsuki-usagi-best', JSON.stringify(best)); } catch (e) { /* むし */ } }
  }
  function lose() {
    S.mode = 'lose'; S.endT = 0; clearHazards();
    Sound.bgm(false); Sound.lose();
    say('おほほ… また いつでも いらっしゃい', 3);
  }
  function showResult(won) {
    $('hud').hidden = true;
    const r = $('result');
    r.querySelector('.r-emoji').textContent = won ? '🐰🍡🌕' : '🐰💫';
    r.querySelector('.r-title').textContent = won ? 'おだんご とりかえした！' : 'ざんねん…';
    let msg = '';
    if (won) {
      msg = `<p>${S.D.label} を クリア！</p><p>じかん: <b>${fmt(S.time)}</b>${S.newBest ? ' <span class="new">🏅 しんきろく！</span>' : ''}</p>`;
      msg += `<p>のこった ハート: ${'❤️'.repeat(P.hp)}</p>`;
    } else {
      msg = `<p>かぐやひめの げんき: のこり <b>${K.hp}</b></p><p>💡 ${['ひかりの たまは よこに うごいて よけよう', 'あかい まるが でたら すぐ にげよう（たけのこが でるよ）', 'ひかる わっかは ジャンプで とびこえよう', 'おつきみ だんごを とると ハートが ふえるよ'][Math.floor(Math.random() * 4)]}</p>`;
    }
    r.querySelector('.r-msg').innerHTML = msg;
    r.hidden = false;
    document.body.classList.remove('playing');
  }
  function renderBest() {
    for (const k of Object.keys(DIFF)) {
      const el = document.querySelector(`[data-diff="${k}"] .best`);
      if (el) el.textContent = best[k] ? `🏅 ${fmt(best[k])}` : '';
    }
  }

  // ---------------- かぐやひめの わざ ----------------
  function attack() {
    const ph2 = K.phase === 2, list = ['orb', 'bamboo', 'ring'].filter((a) => a !== K.last);
    const a = list[Math.floor(Math.random() * list.length)];
    K.last = a;
    if (a === 'orb') {
      say(ph2 ? 'ひかりの たま、たくさん！' : 'ひかりの たま！', 1.4);
      const volleys = ph2 ? 2 : 1;
      for (let v = 0; v < volleys; v++) {
        later(v * 0.9, () => { K.charge = 0.55; });
        later(v * 0.9 + 0.55, () => {
          const o = [K.x, K.y + 1.9, K.z], n = ph2 ? 5 : 3;
          const dx = P.x - o[0], dz = P.z - o[2], base = Math.atan2(dx, dz), hd = Math.hypot(dx, dz);
          for (let i = 0; i < n; i++) {
            const ang = base + (i - (n - 1) / 2) * (ph2 ? 0.3 : 0.38);
            const d = V3.norm([Math.sin(ang) * hd, (P.y + 0.7) - o[1], Math.cos(ang) * hd]);
            orbs.push({ x: o[0], y: o[1], z: o[2], v: V3.mul(d, S.D.orb), life: 0 });
          }
          Sound.orb();
        });
      }
      K.atkT = (ph2 ? 2.6 : 3.0) * S.D.cd;
    } else if (a === 'bamboo') {
      say('たけのこ にょきにょき！', 1.4);
      hint('あかい まるから にげて！', 2);
      if (ph2) {
        for (let i = 0; i < 4; i++) later(i * 0.55, () => addBamboo(P.x + P.vx * 0.3, P.z + P.vz * 0.3));
      } else {
        addBamboo(P.x, P.z);
        for (let i = 0; i < 2; i++) { const a2 = rnd(0, Math.PI * 2), d = rnd(2.5, 5); addBamboo(P.x + Math.cos(a2) * d, P.z + Math.sin(a2) * d); }
      }
      K.atkT = (ph2 ? 3.2 : 2.8) * S.D.cd;
    } else {
      say('つきの わ！', 1.4);
      hint('ひかる わっかは ジャンプで とびこえて！', 2.6);
      K.charge = 0.6;
      const n = ph2 ? 2 : 1;
      for (let i = 0; i < n; i++) later(0.6 + i * 1.1, () => { rings.push({ x: K.x, z: K.z, r: 0.8 }); Sound.ring(); });
      K.atkT = (ph2 ? 3.4 : 3.2) * S.D.cd;
    }
  }
  function addBamboo(x, z) {
    const l = Math.hypot(x, z);
    if (l > ARENA - 1) { x *= (ARENA - 1) / l; z *= (ARENA - 1) / l; }
    bamboos.push({ x, z, t: 0, warn: S.D.warn, ry: rnd(0, 6.28) });
    Sound.warn();
  }

  // ---------------- こうしん ----------------
  function update(dt) {
    S.t += dt;
    if (sayTimer > 0 && (sayTimer -= dt) <= 0) $('say').hidden = true;
    if (hintTimer > 0 && (hintTimer -= dt) <= 0) $('hint').hidden = true;

    if (S.mode === 'title') {
      K.y = 3 + Math.sin(S.t * 1.5) * 0.3; K.face = Math.sin(S.t * 0.5) * 0.6;
      P.hop += dt * 6; P.face = Math.PI + Math.sin(S.t * 0.7) * 0.5;
      updateCam(dt); updateParts(dt);
      return;
    }

    for (let i = evts.length - 1; i >= 0; i--) if (S.t >= evts[i].t) { const e = evts[i]; evts.splice(i, 1); e.fn(); }

    const live = S.mode === 'play' || S.mode === 'intro';
    if (S.mode === 'play') S.time += dt;

    // うさぎ
    const inp = live ? readInput() : { x: 0, y: 0, thr: false };
    const fx = -cam.dir[0], fz = -cam.dir[2], rx = -fz, rz = fx;
    const tx = (fx * inp.y + rx * inp.x) * SPEED, tz = (fz * inp.y + rz * inp.x) * SPEED;
    const acc = 1 - Math.exp(-dt * (P.ground ? 12 : 4));
    P.vx += (tx - P.vx) * acc; P.vz += (tz - P.vz) * acc;
    if (jumpQ && live) {
      if (P.ground) { P.vy = 9; P.jumps = 1; P.ground = false; Sound.jump(); }
      else if (P.jumps < 2) { P.vy = 8; P.jumps = 2; Sound.jump2(); burst([P.x, P.y + 0.2, P.z], 6, [[1, 1, 1]], 2, 0.2, 0); }
    }
    jumpQ = false;
    P.vy -= GRAV * dt;
    P.x += P.vx * dt; P.y += P.vy * dt; P.z += P.vz * dt;
    if (P.y <= 0) {
      if (!P.ground && P.vy < -4) { P.squash = 0.35; Sound.land(); burst([P.x, 0.1, P.z], 5, [[0.75, 0.76, 0.82]], 2, 0.25, 4); }
      P.y = 0; P.vy = 0; P.ground = true; P.jumps = 0;
    }
    const pl = Math.hypot(P.x, P.z);
    if (pl > ARENA) { P.x *= ARENA / pl; P.z *= ARENA / pl; }
    const sp = Math.hypot(P.vx, P.vz);
    if (sp > 0.5) { P.hop += dt * sp * 1.6; }
    let want = sp > 0.8 ? Math.atan2(P.vx, P.vz) : P.face;
    if (S.mode === 'play' && (inp.thr || P.cd > 0.15)) want = Math.atan2(K.x - P.x, K.z - P.z);
    let da = want - P.face; da = Math.atan2(Math.sin(da), Math.cos(da));
    P.face += da * (1 - Math.exp(-dt * 14));
    P.squash = Math.max(0, P.squash - dt * 1.6);
    P.inv = Math.max(0, P.inv - dt);
    P.cd -= dt;
    if (S.mode === 'play' && inp.thr && P.cd <= 0) throwDango();

    // かぐやひめ
    updateKaguya(dt);

    // だんご（じぶんの たま）
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.v[1] -= 6 * dt; s.x += s.v[0] * dt; s.y += s.v[1] * dt; s.z += s.v[2] * dt; s.rot += dt * 14; s.life += dt;
      const kd = Math.hypot(s.x - K.x, s.y - (K.y + 1.7), s.z - K.z);
      if (kd < 1.9 && !K.gone && S.mode === 'play') { shots.splice(i, 1); hitKaguya([s.x, s.y, s.z]); continue; }
      if (s.y < 0 || s.life > 3) { shots.splice(i, 1); burst([s.x, 0.2, s.z], 5, [[1, 1, 1], [1, 0.8, 0.88]], 2, 0.18); Sound.puff(); }
    }
    // ひかりの たま
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      o.x += o.v[0] * dt; o.y += o.v[1] * dt; o.z += o.v[2] * dt; o.life += dt;
      if (Math.hypot(o.x - P.x, o.y - (P.y + 0.8), o.z - P.z) < 0.95) { orbs.splice(i, 1); hurtPlayer([o.x, o.y, o.z]); continue; }
      if (o.y < 0.25) { o.y = 0.25; o.v[1] = 0; }
      if (o.life > 6 || Math.hypot(o.x, o.z) > ARENA + 4) orbs.splice(i, 1);
    }
    // たけのこ
    for (let i = bamboos.length - 1; i >= 0; i--) {
      const b = bamboos[i];
      b.t += dt;
      const up = b.t - b.warn;
      if (up >= 0 && !b.popped) { b.popped = true; Sound.bamboo(); burst([b.x, 0.2, b.z], 10, [[0.55, 0.46, 0.3], [0.65, 0.66, 0.72]], 5, 0.3); }
      b.rise = up < 0 ? 0 : up < 0.15 ? up / 0.15 : up < 1.05 ? 1 : Math.max(0, 1 - (up - 1.05) / 0.35);
      if (b.rise > 0.5 && up < 1.05 && Math.hypot(P.x - b.x, P.z - b.z) < 1.15 && P.y < 4 * b.rise) hurtPlayer([b.x, 0, b.z]);
      if (up > 1.4) bamboos.splice(i, 1);
    }
    // つきの わ
    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i];
      g.r += S.D.ring * dt;
      if (P.y < 0.65 && Math.abs(Math.hypot(P.x - g.x, P.z - g.z) - g.r) < 0.5) hurtPlayer([g.x, 0, g.z]);
      if (g.r > ARENA * 2 + 4) rings.splice(i, 1);
    }
    // おつきみ だんご（かいふく）
    if (S.mode === 'play') {
      S.itemT -= dt;
      if (S.itemT <= 0) {
        S.itemT = 13 + Math.random() * 5;
        if (items.length === 0 && P.hp < P.maxHp) {
          const a = rnd(0, Math.PI * 2), d = rnd(4, ARENA - 4);
          items.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, t: 0 });
          hint('🍡 おつきみ だんご が でたよ！ とると ハートが ふえる', 2.6);
        }
      }
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

    updateParts(dt);
    updateCam(dt);

    if (S.mode === 'win' || S.mode === 'lose') {
      S.endT += dt;
      if (S.endT > 3.4 && $('result').hidden) showResult(S.mode === 'win');
    }
  }

  function throwDango() {
    P.cd = 0.32;
    const from = [P.x + Math.sin(P.face) * 0.4, P.y + 1.1, P.z + Math.cos(P.face) * 0.4];
    const tgt = [K.x, K.y + 1.7, K.z], d = V3.sub(tgt, from), tf = Math.max(0.25, V3.len(d) / 22);
    shots.push({ x: from[0], y: from[1], z: from[2], v: [d[0] / tf, d[1] / tf + 3 * tf, d[2] / tf], rot: 0, life: 0 });
    Sound.throw();
  }

  function updateKaguya(dt) {
    K.flash = Math.max(0, K.flash - dt);
    K.charge = Math.max(0, K.charge - dt);
    if (S.mode === 'win') {
      K.spin += dt * (4 + S.endT * 4); K.y += dt * (1 + S.endT * 3);
      if (S.t % 0.1 < dt) burst([K.x, K.y + 0.5, K.z], 2, [[1, 0.95, 0.6]], 2, 0.2, 0);
      if (K.y > 30) K.gone = true;
      return;
    }
    K.face = Math.atan2(P.x - K.x, P.z - K.z);
    if (S.mode === 'intro') {
      K.y += (3 - K.y) * (1 - Math.exp(-dt * 2.2));
      if (Math.abs(K.y - 3) < 0.15) { S.mode = 'play'; }
      return;
    }
    if (S.mode !== 'play') { K.y = K.ty + Math.sin(S.t * 1.8) * 0.3; return; }
    K.moveT -= dt;
    const dx = K.tx - K.x, dz = K.tz - K.z, dl = Math.hypot(dx, dz);
    if (K.moveT <= 0 || dl < 0.5) {
      // うさぎから すこし はなれた ばしょを えらぶ
      for (let tries = 0; tries < 8; tries++) {
        const a = rnd(0, Math.PI * 2), d = rnd(5, 15), x = Math.cos(a) * d, z = Math.sin(a) * d;
        K.tx = x; K.tz = z;
        if (Math.hypot(x - P.x, z - P.z) > 7) break;
      }
      K.ty = rnd(2.6, 4.2);
      K.moveT = rnd(2.5, 4.5);
    }
    const spd = K.phase === 2 ? 4.2 : 2.8;
    if (dl > 0.01) { const s = Math.min(dl, spd * dt); K.x += dx / dl * s; K.z += dz / dl * s; }
    const by = K.ty + Math.sin(S.t * 1.8) * 0.3;
    K.y += (by - K.y) * (1 - Math.exp(-dt * 2));
    K.atkT -= dt;
    if (K.atkT <= 0) attack();
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
    const asp = innerWidth / innerHeight, port = asp < 1;
    if (S.mode === 'title') {
      const a = S.t * 0.18;
      cam.pos = [Math.sin(a) * (port ? 13 : 10), 4.5, Math.cos(a) * (port ? 13 : 10)];
      cam.look = [0, 2, 0];
      return;
    }
    let dx = P.x - K.x, dz = P.z - K.z;
    const l = Math.hypot(dx, dz);
    if (l > 1.5 && S.mode !== 'win') {
      dx /= l; dz /= l;
      const k = 1 - Math.exp(-dt * 2.5);
      const nx = cam.dir[0] + (dx - cam.dir[0]) * k, nz = cam.dir[2] + (dz - cam.dir[2]) * k, nl = Math.hypot(nx, nz) || 1;
      cam.dir = [nx / nl, 0, nz / nl];
    }
    const back = port ? 9.5 : 7.5, up = port ? 5.0 : 3.8;
    const tp = [P.x + cam.dir[0] * back, P.y * 0.5 + up, P.z + cam.dir[2] * back];
    const kl = S.mode === 'win' ? 0.6 : 0.35;
    const tl = V3.lerp([P.x, P.y * 0.6 + 1.3, P.z], [K.x, K.y + 1.6, K.z], kl);
    const k2 = 1 - Math.exp(-dt * 7);
    cam.pos = V3.lerp(cam.pos, tp, k2);
    cam.look = V3.lerp(cam.look, tl, k2);
    cam.shake = Math.max(0, cam.shake - dt);
  }

  // ---------------- えがく ----------------
  function shadow(x, z, h, s) {
    const k = clamp(1 - h / 10, 0.35, 1) * s;
    R.draw('cyl', T(x, 0.15, z, k, 0.02, k), [0.3, 0.31, 0.38], 0);
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

    // そら（ほし と ちきゅう）
    R.fog(false);
    R.draw(starMesh, T(eye[0], eye[1], eye[2], 1, 1, 1, S.t * 0.004), null, 0);
    const ed = V3.norm([-0.55, 0.42, -0.72]);
    R.draw(earthMesh, T(eye[0] + ed[0] * 150, eye[1] + ed[1] * 150, eye[2] + ed[2] * 150, 26, 26, 26, S.t * 0.03, 0.4), null, 0);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    R.fog(true);

    R.draw(groundMesh, M4.ident(), null, 0);

    // あかい まる と たけのこ
    for (const b of bamboos) {
      const up = b.t - b.warn;
      if (up < 0.2) {
        const pulse = 0.5 + 0.5 * Math.sin(b.t * 18), s = 2.3 * (0.6 + 0.4 * Math.min(1, b.t / 0.3));
        R.draw('cyl', T(b.x, 0.17, b.z, s, 0.02, s), [1, 0.25 + pulse * 0.35, 0.2], 0.6);
      }
      if (b.rise > 0) R.draw(bambooMesh, T(b.x, -4.6 * (1 - b.rise), b.z, 1, 1, 1, b.ry), null, 0);
    }
    // つきの わ
    for (const g of rings) {
      const n = Math.round(clamp(g.r * 7, 18, 120));
      const seg = (2 * Math.PI * g.r / n) * 1.08;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        R.draw('cube', T(g.x + Math.cos(a) * g.r, 0.32, g.z + Math.sin(a) * g.r, 0.32, 0.6, seg, -a), [1, 0.85, 0.35], 1);
      }
    }
    // おつきみ だんご
    for (const it of items) {
      shadow(it.x, it.z, 0, 1.4);
      R.draw(itemMesh, T(it.x, 0.1 + Math.abs(Math.sin(it.t * 3)) * 0.3, it.z, 1.2, 1.2, 1.2, it.t * 1.5), null, 0.15 + 0.15 * Math.sin(it.t * 6));
    }

    // かぐやひめ
    if (!K.gone) {
      shadow(K.x, K.z, K.y, 2.6);
      const fl = K.flash > 0 ? [2, 2, 2] : null;
      R.draw(kaguyaMesh, T(K.x, K.y, K.z, 1, 1, 1, K.face + K.spin), fl, K.flash > 0 ? 0.5 : 0);
      if (K.charge > 0) {
        const s = 0.4 + (0.6 - K.charge) * 1.6;
        R.draw('sphere', T(K.x + Math.sin(K.face) * 1.0, K.y + 2.0, K.z + Math.cos(K.face) * 1.0, s, s, s), [1, 0.95, 0.55], 1);
      }
    }

    // うさぎ
    shadow(P.x, P.z, P.y, 1.3);
    const blink = P.inv > 0 && Math.floor(P.inv * 12) % 2 === 0;
    if (!blink) {
      const moving = P.ground && Math.hypot(P.vx, P.vz) > 0.8;
      const hopY = (moving || S.mode === 'title') ? Math.abs(Math.sin(P.hop)) * 0.28 : 0;
      let sq = 1 + P.squash * 0.6;
      if (S.mode === 'lose') sq = 1.5;
      if (!P.ground) sq = 0.92;
      R.draw(rabbitMesh, T(P.x, P.y + hopY, P.z, sq, 1 / sq, sq, P.face), null, 0);
    }

    for (const s of shots) R.draw(dangoMesh, T(s.x, s.y, s.z, 1, 1, 1, 0, s.rot, s.rot * 0.6), null, 0.2);
    for (const o of orbs) {
      const s = 0.75 + Math.sin(o.life * 20) * 0.08;
      R.draw('sphere', T(o.x, o.y, o.z, s, s, s), [1, 0.93, 0.5], 1);
      R.draw('ball', T(o.x, o.y, o.z, s * 1.5, s * 1.5, s * 1.5), [1, 0.98, 0.8], 0.55);
    }
    for (const p of parts) {
      const s = p.size * clamp(p.life / 0.4, 0.2, 1);
      R.draw('ball', T(p.x, p.y, p.z, s, s, s), p.col, 1);
    }

    // もじ（ぽこっ！ など）
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
  $('bAgain').addEventListener('click', () => { Sound.click(); startGame(S.diff); });
  $('bTitle').addEventListener('click', () => { Sound.click(); toTitle(); });
  $('bResume').addEventListener('click', () => { Sound.click(); togglePause(); });
  $('bQuit').addEventListener('click', () => { Sound.click(); toTitle(); });
  $('bPause').addEventListener('click', () => togglePause());
  const sndBtns = document.querySelectorAll('.snd');
  const showSnd = () => { for (const b of sndBtns) { b.textContent = Sound.isOn() ? '🔊' : '🔇'; b.setAttribute('aria-label', Sound.isOn() ? 'おと オン' : 'おと オフ'); } };
  for (const b of sndBtns) b.addEventListener('click', () => { Sound.init(); Sound.toggle(); showSnd(); });
  showSnd();
  document.addEventListener('visibilitychange', () => { if (document.hidden && !S.paused && (S.mode === 'play' || S.mode === 'intro')) togglePause(); });

  toTitle();
  requestAnimationFrame(frame);

  // テストよう
  window.__tsuki = { S, P, K, startGame, get counts() { return { shots: shots.length, orbs: orbs.length, bamboos: bamboos.length, rings: rings.length }; } };
})();
