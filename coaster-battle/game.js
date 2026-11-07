'use strict';
// ゲームの すすめかた・カメラ・HUD・にゅうりょく
(function () {
  const $ = (id) => document.getElementById(id);
  const cv = $('gl'), fxc = $('fx'), g2 = fxc.getContext('2d');
  let R;
  try { R = new Renderer(cv); } catch (e) { $('nogl').hidden = false; return; }

  const THEMES = [
    { name: 'ひるの そら', skyTop: '#2f7bff', skyHor: '#c4ecff', fog: '#cdeaff', L: [0.45, 0.8, 0.35], lc: '#fff4dc', amb: '#8ea1bb', sun: '#fff6b0', night: 0, fogN: 140, fogF: 1150, car: '#ff5d8f', car2: '#ffffff', trackColor: '#ff8a1c' },
    { name: 'ゆうやけ', skyTop: '#3d2f86', skyHor: '#ff9d57', fog: '#f4a06e', L: [-0.7, 0.32, 0.45], lc: '#ffc08a', amb: '#7c5f86', sun: '#ffdf8a', night: 0.35, fogN: 120, fogF: 1000, car: '#2ec4b6', car2: '#ffe066', trackColor: '#7b2ff7' },
    { name: 'よぞら', skyTop: '#03061c', skyHor: '#26306e', fog: '#141a44', L: [0.3, 0.7, -0.5], lc: '#7f93e8', amb: '#2b3468', sun: '#f2f4ff', night: 1, fogN: 70, fogF: 700, car: '#ffd23f', car2: '#ff4d6d', trackColor: '#20d8ff' },
  ].map((t) => ({ ...t, L: V3.norm(t.L), sunDir: V3.norm(t.L), skyTop: hexc(t.skyTop), skyHor: hexc(t.skyHor), fog: hexc(t.fog), lc: hexc(t.lc), amb: hexc(t.amb), sun: hexc(t.sun) }));

  const track = new Track();
  const scenery = buildScenery(track);
  const sceneMesh = R.mesh(scenery.b);
  window.__verts = sceneMesh.n;
  scenery.b = null;
  let theme = THEMES[0], themeI = -1, skyMesh = null, trackMesh = null;
  function applyTheme(i) {
    if (i === themeI) return;
    themeI = i; theme = THEMES[i];
    R.free(skyMesh); skyMesh = R.mesh(buildSky(theme));
    R.free(trackMesh); trackMesh = R.mesh(buildTrackMesh(track, theme));
  }

  // ---------- ほぞん ----------
  const SAVE_KEY = 'coaster-battle-v1';
  let save = { wins: [0, 0, 0], plays: 0, ch: 0, lv: 0 };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.wins) save = Object.assign(save, s); } catch (e) { /* むし */ }
  function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* むし */ } }

  // ---------- じょうたい ----------
  const S = {
    mode: 'title', paused: false, p: null, c: null, ais: [null, null], lv: 0, round: 1, wins: [0, 0], phase: 'intro', phaseT: 0,
    train: { s: 1, v: 0 }, fight: false, slowT: 0, koT: 0, hitstop: 0, shake: 0, flash: 0, parts: [], texts: [], rings: [], beams: [],
    gUp: 9.8, slide: 0, aTan: 0, tag: '', tagT: 0, time: 0, clackT: 0, roundWinner: -1, stats: { hits: 0, maxCombo: 0, supers: 0, ringouts: 0 },
  };
  const cam = { U: [0, 1, 0], yaw: 0.2, dist: 9, fov: 58, eye: [0, 10, 10], vp: M4.ident(), t: 0, koA: 0 };

  function arena(z, y, x) {
    const f = track.frameAt(S.train.s + z);
    return M4.frame(f.R, f.U, f.F, V3.madd(V3.madd(f.p, f.U, ROOF + y), f.R, x || 0));
  }
  function arenaPos(z, y, x) { const f = track.frameAt(S.train.s + z); return V3.madd(V3.madd(f.p, f.U, ROOF + y), f.R, x || 0); }

  // ---------- こうか ----------
  const sfxOK = () => S.mode === 'game';
  const play = (n, ...a) => { if (sfxOK() && Sound[n]) Sound[n](...a); };
  function burst(z, y, n, cols, sp, size, life) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * Math.PI;
      const v = sp * (0.4 + Math.random() * 0.8);
      S.parts.push({ z, y, x: 0, vz: Math.cos(a) * Math.cos(b) * v, vy: Math.sin(a) * Math.cos(b) * v + 1, vx: Math.sin(b) * v,
        life: life * (0.6 + Math.random() * 0.6), max: life, col: hexc(cols[i % cols.length]), size: size * (0.5 + Math.random()) });
    }
    if (S.parts.length > 260) S.parts.splice(0, S.parts.length - 260);
  }
  function text(z, y, txt, col, big) { S.texts.push({ z, y, txt, col, t: 0, max: big ? 1.3 : 0.8, big: !!big }); }
  const HIT_WORDS = [['ペシッ', 'ポコッ', 'パシッ'], ['ドカッ', 'バキッ', 'ボコッ'], ['ドッカーン！', 'ズガーン！', 'バッコーン！']];

  const env = {
    g: 21, slide: 0, fight: false,
    sfx: (n) => play(n),
    dust(f, n) { burst(f.z, 0.1, n, ['#ffffff', '#dfe6ee'], 3, 0.18, 0.4); },
    hit: doHit,
    superStart(f) {
      S.slowT = 0.5; S.flash = 0.6; S.stats.supers += f === S.p ? 1 : 0;
      burst(f.z, f.y + 1, 26, [f.ch.eye, '#ffffff', '#ffd23f'], 7, 0.2, 0.6);
      play('superStart');
      cutin(f);
    },
    shock(f, opp) {
      play('boom'); S.shake = 1; S.flash = 0.3;
      S.rings.push({ z: f.z, y: 0.05, t: 0, max: 0.5, r: 3.8, col: hexc(f.ch.eye) });
      burst(f.z, 0.2, 30, ['#ffffff', f.ch.eye, '#ffd23f'], 8, 0.25, 0.6);
      if (!f.hitDone && opp.y < 0.9 && Math.abs(opp.z - f.z) < 3.8) { f.hitDone = true; f.facing = opp.z > f.z ? 1 : -1; doHit(f, opp, SUPERS.press); }
    },
    beam(f) {
      S.beams.push({ z: f.z + f.facing * 0.9, y: f.y + 1.25 * f.ch.size, vz: f.facing * 15, owner: f, life: 1.3 });
      play('beam'); S.shake = 0.3;
    },
    ringout(f) {
      f.hp = Math.max(0, f.hp - 15);
      text(f.z, 1.5, 'おちたー！ -15', '#ffffff', true);
      play('ringout'); S.shake = 0.6;
      if (f !== S.p) S.stats.ringouts++;
      if (f.hp <= 0) koStart(f);
    },
  };

  function doHit(att, def, m) {
    const guard = def.state === 'guard' && def.y <= 0 && Math.sign(att.z - def.z) === def.facing;
    let dmg = m.dmg * att.ch.power * (att.cpu ? LEVELS[S.lv].dmg : 1);
    const hz = def.z - att.facing * 0.25, hy = def.y + 1.15 * def.ch.size;
    if (guard) {
      dmg *= m.sup ? 0.4 : 0.15;
      def.hp = Math.max(def.hp - dmg, def.hp > 1 ? 1 : 0);
      def.vz = att.facing * m.kb * 0.5 / def.ch.weight; def.state = 'gstun'; def.stun = m.sup ? 0.4 : 0.2;
      att.sp = Math.min(100, att.sp + 3); def.sp = Math.min(100, def.sp + 5);
      S.hitstop = 0.05; S.shake = Math.max(S.shake, 0.15);
      burst(hz, hy, 10, ['#9be7ff', '#ffffff'], 5, 0.14, 0.3);
      text(hz, hy + 0.4, 'ガード！', '#9be7ff');
      play('guard');
      return;
    }
    def.combo++; def.comboT = 1.1;
    if (def.combo > 3) dmg *= 0.75;
    def.hp = Math.max(0, def.hp - dmg);
    const kbm = (1 + (1 - def.hp / 100) * 0.8) / def.ch.weight;
    def.vz = att.facing * m.kb * kbm;
    if (m.kby > 0) { def.vy = m.kby * kbm; def.y = Math.max(def.y, 0.02); } else if (def.y > 0) def.vy = Math.max(def.vy, 1.5);
    def.tumble = def.vy > 3.5;
    def.state = 'hit'; def.stun = m.stun; def.flash = 0.14; def.move = null; def.facing = -att.facing;
    att.sp = Math.min(100, att.sp + dmg * 1.2); def.sp = Math.min(100, def.sp + dmg * 0.8);
    S.hitstop = 0.04 + m.pow * 0.1; S.shake = Math.max(S.shake, 0.15 + m.pow * 0.6);
    if (m.sup) S.flash = 0.5;
    burst(hz, hy, 8 + Math.round(m.pow * 22), ['#fff6a8', '#ffb02e', '#ffffff', att.ch.eye], 4 + m.pow * 6, 0.16 + m.pow * 0.1, 0.45);
    const words = HIT_WORDS[m.pow < 0.45 ? 0 : m.pow < 0.9 ? 1 : 2];
    text(hz, hy + 0.5, words[Math.floor(Math.random() * words.length)], m.pow >= 0.9 ? '#ff4d6d' : '#ffd23f', m.pow >= 0.6);
    if (def.combo >= 2) text(hz, hy + 1.3, def.combo + ' れんぞく！', '#ffffff');
    if (att === S.p) { S.stats.hits++; S.stats.maxCombo = Math.max(S.stats.maxCombo, def.combo); }
    play('hit', m.pow);
    if (def.hp <= 0) koStart(def, att);
  }

  function koStart(def) {
    if (S.phase !== 'fight') return;
    S.phase = 'ko'; S.phaseT = 0; S.fight = false; env.fight = false; S.koT = 1.4; S.flash = 0.8;
    if (def.state !== 'ringout') { def.state = 'ko'; def.vy = Math.max(def.vy, 10); def.vz = (def.vz >= 0 ? 1 : -1) * Math.max(Math.abs(def.vz), 12); def.y = Math.max(def.y, 0.05); }
    S.roundWinner = def === S.p ? 1 : 0;
    msg('KO！', 'ko', 1800);
    play('ko');
  }

  // ---------- ラウンド ----------
  function newMatch(pc, cc, lv, mode) {
    S.mode = mode; S.lv = lv; S.round = 1; S.wins = [0, 0];
    S.p = new Fighter(CHARS[pc], -1); S.c = new Fighter(CHARS[cc], 1);
    S.p.sp = 0; S.c.sp = 0;
    S.c.cpu = true; S.p.cpu = mode === 'demo';
    S.ais = [mode === 'demo' ? new AI(1) : null, new AI(mode === 'demo' ? 1 : lv)];
    S.stats = { hits: 0, maxCombo: 0, supers: 0, ringouts: 0 };
    startRound();
  }
  function startRound() {
    applyTheme((S.round - 1) % 3);
    // 2ラウンドめからは のりつづける（ゴールが ちかいときだけ えきから）
    if (S.round === 1 || S.train.s > track.len - 260) { S.train.s = 1; S.train.v = 0; }
    const sp = [S.p.sp, S.c.sp];
    S.p.reset(-2.6); S.c.reset(2.6); S.p.sp = sp[0]; S.c.sp = sp[1];
    S.parts = []; S.texts = []; S.rings = []; S.beams = [];
    S.phase = 'intro'; S.phaseT = 0; S.fight = false; env.fight = false; S.roundWinner = -1; S.koT = 0;
    cam.intro = 1; cam.koA = 0;
    if (S.mode === 'game') {
      $('rnd').innerHTML = 'ラウンド ' + S.round + '<span class="thn">・' + theme.name + '</span>';
      msg('ラウンド ' + S.round, 'round', 1400);
      play('bell');
      updWins();
    }
  }
  function endRound() {
    const w = S.roundWinner;
    if (w >= 0) S.wins[w]++;
    S.phase = 'roundEnd'; S.phaseT = 0;
    const W = w === 0 ? S.p : w === 1 ? S.c : null, L = w === 0 ? S.c : w === 1 ? S.p : null;
    if (W && W.state !== 'ringout') { W.state = 'win'; W.vz = 0; }
    if (L && L.state !== 'ringout' && L.state !== 'ko') L.state = 'lose';
    if (S.mode === 'game') {
      updWins();
      if (w < 0) msg('ひきわけ！', 'round', 1800);
      else msg(w === 0 ? 'きみの かち！' : S.c.ch.name + 'の かち…', w === 0 ? 'win' : 'lose', 1900);
      if (w === 0) play('win'); else if (w === 1) play('lose');
    }
  }
  function nextAfterRound() {
    if (S.wins[0] >= 2 || S.wins[1] >= 2) {
      if (S.mode === 'demo') { newMatch(Math.floor(Math.random() * 3), Math.floor(Math.random() * 3), 1, 'demo'); return; }
      matchEnd(); return;
    }
    S.round++; startRound();
  }
  function matchEnd() {
    const won = S.wins[0] >= 2;
    save.plays++; if (won) save.wins[S.lv]++; writeSave();
    S.mode = 'result';
    showHUD(false);
    $('resTitle').textContent = won ? '🏆 きみの かち！' : 'ざんねん… また あそぼう！';
    $('resTitle').className = won ? 'win' : 'lose';
    $('resBody').innerHTML =
      `<div class="vs"><span style="--c:${S.p.ch.color}">${S.p.ch.name}</span> ${S.wins[0]} − ${S.wins[1]} <span style="--c:${S.c.ch.color}">${S.c.ch.name}</span></div>` +
      `<ul><li>あてた かず: <b>${S.stats.hits}</b></li><li>いちばんの れんぞく: <b>${S.stats.maxCombo}</b></li>` +
      `<li>ひっさつ: <b>${S.stats.supers}</b>かい</li><li>あいてを おとした: <b>${S.stats.ringouts}</b>かい</li></ul>` +
      `<p class="lvwin">${LEVELS[S.lv].name} で かった かず: <b>${save.wins[S.lv]}</b></p>`;
    screen('result');
    Sound.quiet();
    if (won) Sound.win();
  }

  // ---------- にゅうりょく ----------
  const keys = {}, latch = {}, touch = {};
  const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
    KeyJ: 'punch', KeyZ: 'punch', KeyK: 'kick', KeyX: 'kick', KeyL: 'super', KeyC: 'super' };
  addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP') { if (S.mode === 'game') setPause(!S.paused); return; }
    const k = KEYMAP[e.code]; if (!k) return;
    if (S.mode === 'game') e.preventDefault();
    if (!e.repeat) latch[k] = true;
    keys[k] = true;
  });
  addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; for (const k in touch) touch[k] = false; });
  document.querySelectorAll('#pad [data-k]').forEach((b) => {
    const k = b.dataset.k;
    const dn = (e) => { e.preventDefault(); touch[k] = true; latch[k] = true; b.classList.add('on'); Sound.init(); try { b.setPointerCapture(e.pointerId); } catch (er) { /* むし */ } };
    const up = (e) => { e.preventDefault(); touch[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', dn); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  let padPrev = {};
  function readPad() {
    const out = {};
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find((g) => g && g.connected) : null;
    if (!gp) return out;
    const ax = gp.axes[0] || 0, bt = (i) => gp.buttons[i] && gp.buttons[i].pressed;
    out.left = ax < -0.4 || bt(14); out.right = ax > 0.4 || bt(15);
    const map = { jump: bt(0) || bt(12), super: bt(1) || bt(5) || bt(7), punch: bt(2), kick: bt(3) };
    for (const k in map) { out[k] = map[k]; if (map[k] && !padPrev[k]) latch[k] = true; }
    padPrev = map;
    return out;
  }
  function playerInput() {
    const pad = readPad();
    const h = (k) => !!(keys[k] || touch[k] || pad[k]);
    const I = { left: h('left'), right: h('right'), jumpP: !!latch.jump, punchP: !!latch.punch, kickP: !!latch.kick, superP: !!latch.super };
    for (const k in latch) latch[k] = false;
    return I;
  }

  // ---------- まいフレームの けいさん ----------
  function updTrain(dt) {
    const T = S.train, fr = track.frameAt(T.s), v0 = T.v;
    if (fr.f === 'station' && T.s < 40) T.v += (8 - T.v) * Math.min(1, dt * 1.2);
    else if (fr.f === 'lift') { T.v += (8 - T.v) * Math.min(1, dt * 2); S.clackT -= dt; if (S.clackT <= 0) { S.clackT = 0.22; play('clack'); } }
    else if (fr.f === 'brake') T.v += (5 - T.v) * Math.min(1, dt * 1.2);
    else if (fr.f === 'station') T.v += (2.5 - T.v) * Math.min(1, dt * 2);
    else {
      T.v += (-9.8 * fr.F[1] - 0.0012 * T.v * T.v) * dt;
      if (fr.f === 'boost' && T.v < 27) T.v += (27 - T.v) * Math.min(1, dt * 2.5);
      T.v = Math.max(T.v, 9);
    }
    T.s = Math.min(track.len - 1, T.s + T.v * dt);
    const aTan = dt > 0 ? (T.v - v0) / dt : 0;
    S.aTan += (aTan - S.aTan) * Math.min(1, dt * 6);
    const fc = track.frameAt(T.s), k = track.curv(T.s);
    const acc = V3.add(V3.mul(fc.F, S.aTan), V3.mul(k, T.v * T.v));
    const G = [-acc[0], -9.8 - acc[1], -acc[2]];
    const gUp = -V3.dot(G, fc.U);
    S.gUp += (gUp - S.gUp) * Math.min(1, dt * 5);
    env.g = Math.max(8, Math.min(48, S.gUp * 2.2));
    env.slide = Math.abs(S.aTan) < 1 ? 0 : Math.max(-2, Math.min(2, -S.aTan * 0.16));
    if (sfxOK()) Sound.ride(T.v, fc.f === 'tunnel');
    // じょうきょうの ことば
    let tag = '';
    if (fc.U[1] < -0.2) tag = 'さかさま！🙃';
    else if (fc.F[1] < -0.45 && T.v > 13) tag = 'ひゃっほー！⬇️';
    else if (S.gUp < 5) tag = 'ふわっ！🎈';
    else if (S.gUp > 17) tag = 'ずっしり！💪';
    else if (fc.f === 'lift') tag = 'カタカタ…⬆️';
    else if (fc.f === 'tunnel') tag = 'トンネル！';
    else if (fc.f === 'boost') tag = 'ブースト！🔥';
    S.tagT -= dt;
    if (tag !== S.tag && (S.tagT <= 0 || tag)) { S.tag = tag; S.tagT = 0.8; const el = $('gtag'); el.textContent = tag; el.classList.remove('pop'); void el.offsetWidth; if (tag) el.classList.add('pop'); }
  }

  function updFighters(dt) {
    const p = S.p, c = S.c;
    env.fight = S.fight;
    const ip = S.ais[0] ? S.ais[0].think(dt, p, c) : (S.mode === 'game' && !S.paused ? playerInput() : {});
    const ic = S.ais[1].think(dt, c, p);
    if (!S.fight) { for (const I of [ip, ic]) { I.left = I.right = false; } }
    p.update(dt, ip, c, env); c.update(dt, ic, p, env);
    // ぶつかり
    const ok = (f) => f.state !== 'ringout' && f.state !== 'ko';
    if (ok(p) && ok(c)) {
      const dz = c.z - p.z, minD = 0.4 * (p.ch.size + c.ch.size);
      if (Math.abs(dz) < minD && Math.abs(p.y - c.y) < 1.3) {
        const dir = Math.sign(dz) || (p.side < c.side ? 1 : -1), push = (minD - Math.abs(dz)) / 2;
        p.z -= dir * push; c.z += dir * push;
      }
    }
    // ビーム
    for (const b of S.beams) {
      b.z += b.vz * dt; b.life -= dt;
      const o = b.owner === p ? c : p;
      if (b.life > 0 && Math.abs(o.z - b.z) < 0.7 && b.y > o.y - 0.3 && b.y < o.y + o.height() + 0.3 && o.inv <= 0 && ok(o) && o.state !== 'down' && o.state !== 'getup') {
        b.life = 0; const f = b.owner, fc = f.facing; f.facing = Math.sign(b.vz); doHit(f, o, SUPERS.beam); f.facing = fc;
      }
      if (Math.random() < 0.8) S.parts.push({ z: b.z, y: b.y + (Math.random() - 0.5) * 0.4, x: (Math.random() - 0.5) * 0.4, vz: -b.vz * 0.1, vy: (Math.random() - 0.5), vx: 0, life: 0.3, max: 0.3, col: hexc(b.owner.ch.eye), size: 0.18 });
    }
    S.beams = S.beams.filter((b) => b.life > 0);
  }

  function updFx(dt) {
    for (const q of S.parts) { q.life -= dt; q.vy -= 9 * dt; q.z += q.vz * dt; q.y += q.vy * dt; q.x += q.vx * dt; }
    S.parts = S.parts.filter((q) => q.life > 0);
    for (const t of S.texts) t.t += dt;
    S.texts = S.texts.filter((t) => t.t < t.max);
    for (const r of S.rings) r.t += dt;
    S.rings = S.rings.filter((r) => r.t < r.max);
  }

  function update(rdt) {
    S.time += rdt;
    if (S.slowT > 0) S.slowT -= rdt;
    if (S.koT > 0) S.koT -= rdt;
    const ts = S.slowT > 0 ? 0.2 : S.koT > 0 ? 0.3 : 1;
    const dt = rdt * ts;
    S.phaseT += rdt;
    updTrain(dt);
    if (S.hitstop > 0) S.hitstop -= rdt;
    else { const n = dt > 0.022 ? 2 : 1; for (let i = 0; i < n; i++) updFighters(dt / n); }
    updFx(dt);
    if (S.shake > 0) S.shake = Math.max(0, S.shake - rdt * 2.2);
    if (S.flash > 0) S.flash = Math.max(0, S.flash - rdt * 2.5);
    // ラウンドの ながれ
    if (S.phase === 'intro' && S.phaseT > (S.mode === 'demo' ? 0.5 : 1.7)) {
      S.phase = 'fight'; S.fight = true; S.phaseT = 0;
      if (S.mode === 'game') { msg('ファイト！', 'fight', 900); play('fight'); }
    } else if (S.phase === 'fight' && S.train.s > track.len - 30) {
      S.fight = false; env.fight = false; S.phase = 'timeup'; S.phaseT = 0;
      S.roundWinner = Math.abs(S.p.hp - S.c.hp) < 0.5 ? -1 : S.p.hp > S.c.hp ? 0 : 1;
      if (S.mode === 'game') { msg('ゴール！', 'round', 1300); play('bell'); }
    } else if (S.phase === 'ko' && S.phaseT > 2.6) endRound();
    else if (S.phase === 'timeup' && S.phaseT > 1.5) endRound();
    else if (S.phase === 'roundEnd' && S.phaseT > 2.6) nextAfterRound();
    if (S.mode === 'game') updHUD();
  }

  // ---------- カメラ ----------
  function updCam(rdt) {
    const p = S.p, c = S.c, T = S.train;
    const dt = Math.min(rdt, 0.05);
    const live = [p, c].filter((f) => f.state !== 'ringout' && f.state !== 'ko');
    const L = live.length ? live : [p, c];
    let mz = L.reduce((a, f) => a + f.z, 0) / L.length, my = L.reduce((a, f) => a + Math.max(0, f.y), 0) / L.length;
    let spread = L.length > 1 ? Math.abs(p.z - c.z) : 2;
    mz = Math.max(-HALF - 1, Math.min(HALF + 1, mz));
    let fr = track.frameAt(T.s + mz);
    let target = V3.madd(fr.p, fr.U, ROOF + 1.05 + Math.min(my, 8) * 0.6);
    let dYaw = 0.22 + Math.max(0, -fr.F[1]) * 0.6 + Math.sin(S.time * 0.21) * 0.12;
    if (fr.tag === 'loop' || fr.tag === 'roll') dYaw = 0.45;
    const asp = cv.width / cv.height;
    let dDist = (6.8 + Math.min(12, spread) * 0.55 + Math.min(my, 8) * 0.5) * (asp < 1 ? 1.25 : 1);
    if (S.mode === 'demo') { dYaw = 0.5 + Math.sin(S.time * 0.13) * 0.5; dDist += 3; }
    // KO の ときは まわりこむ
    const ko = [p, c].find((f) => f.state === 'ko');
    if (S.phase === 'ko' && ko) {
      cam.koA += rdt * 0.9; dYaw = 0.3 + cam.koA; dDist = 7.5;
      const kf = track.frameAt(T.s + Math.max(-HALF - 8, Math.min(HALF + 8, ko.z)));
      target = V3.madd(kf.p, kf.U, ROOF + 1 + Math.min(8, ko.y)); fr = kf;
    }
    if (cam.intro > 0) { cam.intro = Math.max(0, cam.intro - rdt * 0.55); const k = cam.intro * cam.intro; dDist += 22 * k; dYaw += 1.4 * k; }
    const kk = 1 - Math.exp(-dt * 3);
    cam.yaw += (dYaw - cam.yaw) * kk; cam.dist += (dDist - cam.dist) * kk;
    cam.U = V3.norm(V3.lerp(cam.U, fr.U, 1 - Math.exp(-dt * 4.5)));
    let Rr = V3.cross(fr.F, cam.U); if (V3.len(Rr) < 0.1) Rr = fr.R; Rr = V3.norm(Rr);
    const Uc = V3.cross(Rr, fr.F);
    const dir = V3.add(V3.mul(Rr, Math.cos(cam.yaw)), V3.mul(fr.F, Math.sin(cam.yaw)));
    let eye = V3.madd(V3.madd(target, dir, cam.dist), Uc, 1.3 + cam.dist * 0.17);
    if (S.shake > 0) { const s = S.shake * 0.35; eye = V3.add(eye, [(Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s]); }
    if (eye[1] < 1.6) eye[1] = 1.6; // じめんの なかに はいらない
    const dFov = 54 + Math.max(0, Math.min(22, (T.v - 9) * 1.1)) + (S.slowT > 0 ? -8 : 0);
    cam.fov += (dFov - cam.fov) * kk;
    let fovy = cam.fov * Math.PI / 180;
    if (asp < 1.25) fovy = Math.min(1.75, Math.max(fovy, 2 * Math.atan(Math.tan(0.56) / asp)));
    const proj = M4.persp(fovy, asp, 0.3, 3000);
    cam.eye = eye;
    cam.vp = M4.mul(proj, M4.lookAt(eye, target, Uc));
  }

  // ---------- えがく ----------
  function render() {
    const w = cv.width, h = cv.height;
    R.begin(w, h, cam.vp, cam.eye, theme);
    const sm = M4.ident(); M4.translate(sm, cam.eye[0], cam.eye[1], cam.eye[2]);
    R.depth(false); R.fog(false); R.draw(skyMesh, sm, null, 0); R.depth(true); R.fog(true);
    R.draw(sceneMesh, M4.ident());
    R.draw(trackMesh, M4.ident());
    drawTrain(R, arena, theme);
    for (const f of [S.p, S.c]) {
      if (f.onFloor() && f.state !== 'ringout' && f.y > -0.2) {
        const s = Math.max(0.3, 1 - f.y * 0.15) * f.ch.size;
        const m = arena(f.z, 0.02, 0); M4.scale(m, 0.95 * s, 0.02, 0.95 * s); R.draw('cyl', m, [0.15, 0.13, 0.2], 1);
      }
      drawFighter(R, f, arena(f.z, f.y, f.x), S.time);
    }
    for (const b of S.beams) {
      const m = arena(b.z, b.y, 0), s = 0.75 + Math.sin(S.time * 40) * 0.12; const m2 = M4.clone(m);
      M4.scale(m, s, s, s); R.draw('sphere', m, hexc(b.owner.ch.eye), 1);
      M4.scale(m2, s * 0.5, s * 0.5, s * 0.5); R.draw('sphere', m2, [1, 1, 1], 1);
    }
    for (const q of S.parts) {
      const m = arena(q.z, q.y, q.x), s = q.size * Math.min(1, q.life / q.max * 1.6);
      M4.rotY(m, q.life * 9); M4.rotX(m, q.life * 7); M4.scale(m, s, s, s); R.draw('cube', m, q.col, 1);
    }
    for (const r of S.rings) {
      const k = r.t / r.max, rad = 0.5 + r.r * k;
      for (let i = 0; i < 20; i++) {
        const a = i / 20 * Math.PI * 2, m = arena(r.z + Math.cos(a) * rad, r.y + 0.1, Math.sin(a) * rad);
        M4.scale(m, 0.35 * (1 - k) + 0.05, 0.15, 0.35 * (1 - k) + 0.05); R.draw('cube', m, r.col, 1);
      }
    }
    render2D();
  }

  function project(p) {
    const v = M4.xform(cam.vp, p);
    if (v[3] <= 0.1) return null;
    return [(v[0] / v[3] * 0.5 + 0.5) * fxc.width, (0.5 - v[1] / v[3] * 0.5) * fxc.height];
  }
  const lines = [];
  function render2D() {
    const w = fxc.width, h = fxc.height, d = fxc.width / innerWidth;
    g2.clearRect(0, 0, w, h);
    // スピードせん
    const v = S.train.v;
    if (v > 15) {
      const n = Math.round((v - 15) * 1.6);
      while (lines.length < n) lines.push({ a: Math.random() * Math.PI * 2, r: 0.4 + Math.random() * 0.4, l: 0.1 + Math.random() * 0.3, t: Math.random() });
      lines.length = Math.min(lines.length, n);
      g2.strokeStyle = 'rgba(255,255,255,' + Math.min(0.5, (v - 15) / 25) + ')';
      g2.lineWidth = 2 * d;
      g2.beginPath();
      const cx = w / 2, cy = h / 2, R0 = Math.hypot(w, h) / 2;
      for (const L of lines) {
        L.t += 0.06; if (L.t > 1) { L.t = 0; L.a = Math.random() * Math.PI * 2; L.r = 0.45 + Math.random() * 0.35; }
        const r1 = R0 * (L.r + L.t * 0.5), r2 = r1 + R0 * L.l;
        g2.moveTo(cx + Math.cos(L.a) * r1, cy + Math.sin(L.a) * r1); g2.lineTo(cx + Math.cos(L.a) * r2, cy + Math.sin(L.a) * r2);
      }
      g2.stroke();
    }
    // ドカッ！ の もじ
    g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.lineJoin = 'round';
    for (const t of S.texts) {
      const s = project(arenaPos(t.z, t.y + t.t * 0.8, 0)); if (!s) continue;
      const k = t.t / t.max, pop = k < 0.15 ? 0.6 + k / 0.15 * 0.6 : 1.2 - (k - 0.15) * 0.25;
      const size = (t.big ? 46 : 30) * pop * d * Math.min(1.3, innerWidth / 700 + 0.5);
      g2.font = '900 ' + size + 'px "Hiragino Maru Gothic ProN","Rounded Mplus 1c","Arial Rounded MT Bold",sans-serif';
      g2.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
      g2.lineWidth = size * 0.18; g2.strokeStyle = '#1b1035'; g2.strokeText(t.txt, s[0], s[1]);
      g2.fillStyle = t.col; g2.fillText(t.txt, s[0], s[1]);
      g2.globalAlpha = 1;
    }
    if (S.flash > 0) { g2.fillStyle = 'rgba(255,255,255,' + Math.min(0.7, S.flash) + ')'; g2.fillRect(0, 0, w, h); }
    if (S.slowT > 0 || S.koT > 0) {
      const gr = g2.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,0,40,0.55)'); g2.fillStyle = gr; g2.fillRect(0, 0, w, h);
    }
  }

  // ---------- HUD ----------
  function updHUD() {
    for (const [f, i] of [[S.p, 1], [S.c, 2]]) {
      f.dispHp += (f.hp - f.dispHp) * 0.06; if (f.dispHp < f.hp) f.dispHp = f.hp;
      $('hf' + i).style.width = f.hp + '%'; $('hb' + i).style.width = f.dispHp + '%';
      $('sf' + i).style.width = f.sp + '%';
      $('sp' + i).classList.toggle('full', f.sp >= 100);
    }
    $('padSuper').classList.toggle('ready', S.p.sp >= 100);
    $('rideFill').style.width = (S.train.s / track.len * 100) + '%';
    $('rideIcon').style.left = (S.train.s / track.len * 100) + '%';
  }
  function updWins() {
    for (let i = 0; i < 2; i++) $('w' + (i + 1)).textContent = '★'.repeat(S.wins[i]) + '☆'.repeat(2 - S.wins[i]);
  }
  let msgTimer = 0;
  function msg(t, cls, ms) {
    const el = $('msg'); el.textContent = t; el.className = 'show ' + (cls || ''); clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { el.className = ''; }, ms || 1200);
  }
  let cutTimer = 0;
  function cutin(f) {
    if (S.mode !== 'game') return;
    const el = $('cutin'); el.style.setProperty('--c', f.ch.color);
    el.innerHTML = `<span>ひっさつ！</span><b>${f.ch.supName}</b>`;
    el.className = 'show ' + (f === S.p ? 'l' : 'r'); clearTimeout(cutTimer);
    cutTimer = setTimeout(() => { el.className = ''; }, 1100);
  }
  function showHUD(on) { $('hud').hidden = !on; $('pad').hidden = !on; document.body.classList.toggle('ingame', on); }

  // ---------- がめん ----------
  function screen(name) {
    for (const id of ['title', 'select', 'result', 'pause']) $(id).hidden = id !== name;
  }
  function setPause(on) {
    S.paused = on; $('pause').hidden = !on;
    if (on) Sound.quiet();
  }
  let pick = save.ch || 0, lvPick = save.lv || 0;
  function buildSelect() {
    const box = $('chars'); box.innerHTML = '';
    CHARS.forEach((ch, i) => {
      const b = document.createElement('button');
      b.className = 'char' + (i === pick ? ' sel' : ''); b.style.setProperty('--c', ch.color); b.style.setProperty('--c2', ch.sub);
      const st = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
      b.innerHTML = `<span class="face f-${ch.id}"><i></i></span><span class="cn">${ch.name}</span><span class="ct">${ch.type}</span>` +
        `<span class="cs">パワー <em>${st(ch.stars[0])}</em><br>はやさ <em>${st(ch.stars[1])}</em><br>ジャンプ <em>${st(ch.stars[2])}</em></span>` +
        `<span class="csup">🔥 ${ch.supName}</span>`;
      b.onclick = () => { pick = i; Sound.click(); buildSelect(); };
      box.appendChild(b);
    });
    document.querySelectorAll('#levels button').forEach((b) => {
      b.classList.toggle('sel', +b.dataset.lv === lvPick);
      b.onclick = () => { lvPick = +b.dataset.lv; Sound.click(); buildSelect(); };
    });
  }
  function showTitleStats() {
    $('trophy').innerHTML = LEVELS.map((L, i) => `<span>${L.name} 🏆<b>${save.wins[i]}</b></span>`).join('');
  }
  function toTitle() {
    screen('title'); showHUD(false); setPause(false); S.paused = false; showTitleStats();
    newMatch(Math.floor(Math.random() * 3), Math.floor(Math.random() * 3), 1, 'demo');
    Sound.quiet();
  }
  $('btnPlay').onclick = () => { Sound.init(); Sound.click(); Sound.bgm(Sound.on); screen('select'); buildSelect(); };
  $('btnHow').onclick = () => { Sound.init(); Sound.click(); $('how').hidden = !$('how').hidden; };
  $('btnGo').onclick = () => {
    Sound.init(); Sound.click(); Sound.bgm(true);
    save.ch = pick; save.lv = lvPick; writeSave();
    let cc = Math.floor(Math.random() * 2); if (cc >= pick) cc++;
    screen(null); showHUD(true);
    $('n1').textContent = CHARS[pick].name; $('n2').textContent = CHARS[cc].name + '（CPU）';
    newMatch(pick, cc, lvPick, 'game');
  };
  $('btnBack').onclick = () => { Sound.click(); toTitle(); };
  $('btnAgain').onclick = () => { Sound.click(); $('btnGo').onclick(); };
  $('btnChange').onclick = () => { Sound.click(); screen('select'); buildSelect(); newMatch(Math.floor(Math.random() * 3), Math.floor(Math.random() * 3), 1, 'demo'); };
  $('btnTitle').onclick = () => { Sound.click(); toTitle(); };
  $('pauseBtn').onclick = () => { Sound.click(); setPause(true); };
  $('btnResume').onclick = () => { Sound.click(); setPause(false); };
  $('btnQuit').onclick = () => { Sound.click(); toTitle(); };
  const sndBtn = $('sndBtn');
  const sndShow = () => { sndBtn.textContent = Sound.on ? '🔊' : '🔇'; sndBtn.setAttribute('aria-label', Sound.on ? 'おと オン' : 'おと オフ'); $('btnSnd2').textContent = Sound.on ? '🔊 おと：オン' : '🔇 おと：オフ'; };
  sndBtn.onclick = () => { Sound.init(); Sound.setOn(!Sound.on); if (Sound.on) Sound.bgm(true); sndShow(); };
  $('btnSnd2').onclick = () => sndBtn.onclick();
  sndShow();
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'game' && !S.paused) setPause(true); });

  // ---------- おおきさ ----------
  function resize() {
    const d = Math.min(2, window.devicePixelRatio || 1), w = innerWidth, h = innerHeight;
    const k = w * h * d * d > 2.6e6 ? Math.sqrt(2.6e6 / (w * h)) : d;
    cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    fxc.width = Math.round(w * Math.min(d, 1.5)); fxc.height = Math.round(h * Math.min(d, 1.5));
  }
  addEventListener('resize', resize); resize();

  // ---------- ループ ----------
  let last = performance.now();
  function frame(t) {
    const rdt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t;
    if (!(S.mode === 'game' && S.paused) && S.mode !== 'result') update(rdt);
    updCam(rdt);
    render();
    requestAnimationFrame(frame);
  }
  toTitle();
  requestAnimationFrame(frame);
  window.__coaster = { S, track, cam, env, update, AI };
})();
