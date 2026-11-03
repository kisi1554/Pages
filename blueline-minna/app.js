/* ブルーライン みんなで のろう
 *  はこの うえに おいた ブルーラインが、湘南台 ⇄ あざみ野 を はしる（ゲームでは なく、みて たのしむ）。
 *  ・とおくで ゾンビが おうえん（のらない）。にょこくん と つくぼう は 2つめの えきで のってくる。
 *  ・よるは でんしゃが ねむくて おそく なる → にょこくんの おなら「ブー！」で はやく なる。
 *  ・とまった えきの スタンプを スタンプちょうに あつめる。ろせんずも みられる。
 *  絵は ぜんぶ canvas に その場で かく。音は WebAudio の 合成音（＋ よみあげ）。
 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const FONT = '"Hiragino Maru Gothic ProN","Rounded Mplus 1c","BIZ UDPGothic","Hiragino Sans","Meiryo",sans-serif';

  /* ================= えき データ（B01 湘南台 〜 B32 あざみ野） ================= */
  const ST = [
    ['湘南台', 'しょうなんだい', '🚉', 'おだきゅう・そうてつ'], ['下飯田', 'しもいいだ', '🌾'], ['立場', 'たてば', '🏪'],
    ['中田', 'なかだ', '🌻'], ['踊場', 'おどりば', '🐈'], ['戸塚', 'とつか', '🏮', 'JR'], ['舞岡', 'まいおか', '🐄'],
    ['下永谷', 'しもながや', '🏘️'], ['上永谷', 'かみながや', '🚃'], ['港南中央', 'こうなんちゅうおう', '🏢'],
    ['上大岡', 'かみおおおか', '🛍️', 'けいきゅう'], ['弘明寺', 'ぐみょうじ', '🔔'], ['蒔田', 'まいた', '🌸'],
    ['吉野町', 'よしのちょう', '🏞️'], ['阪東橋', 'ばんどうばし', '🌉'], ['伊勢佐木長者町', 'いせざきちょうじゃまち', '🛒'],
    ['関内', 'かんない', '⚾', 'JR'], ['桜木町', 'さくらぎちょう', '🚡', 'JR'], ['高島町', 'たかしまちょう', '🏙️'],
    ['横浜', 'よこはま', '⚓', 'JR・とうきゅう・けいきゅう・そうてつ・みなとみらいせん'], ['三ツ沢下町', 'みつざわしもちょう', '⚽'],
    ['三ツ沢上町', 'みつざわかみちょう', '🏟️'], ['片倉町', 'かたくらちょう', '🌿'], ['岸根公園', 'きしねこうえん', '🌳'],
    ['新横浜', 'しんよこはま', '🚅', 'しんかんせん・JR'], ['北新横浜', 'きたしんよこはま', '🏃'], ['新羽', 'にっぱ', '🐦'],
    ['仲町台', 'なかまちだい', '🌷'], ['センター南', 'せんたーみなみ', '🏬', 'グリーンライン'],
    ['センター北', 'せんたーきた', '🎡', 'グリーンライン'], ['中川', 'なかがわ', '🍃'],
    ['あざみ野', 'あざみの', '🌼', 'とうきゅう でんえんとしせん'],
  ].map(([k, y, e, t], i) => ({ i, n: i + 1, k, y, e, t: t || '' }));
  const SPECIAL = [18, 19, 26, 27]; // 高島町・横浜・新羽・仲町台（0から かぞえた ばんごう）
  const INK = ['#d6336c', '#1c7ed6', '#2f9e44', '#7048e8', '#e8590c', '#0c8599'];
  const rb = (i) => `<ruby>${ST[i].k}<rt>${ST[i].y}</rt></ruby>`;
  const no = (i) => 'B' + String(i + 1).padStart(2, '0');

  /* ================= ほぞん ================= */
  const KEY = 'blueline-minna.v1';
  let save = { stamps: {}, rides: 0, set: { dir: 1, tod: 'hiru', mode: 'special', snd: true, fast: false } };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') {
      save.stamps = s.stamps || {}; save.rides = s.rides || 0;
      Object.assign(save.set, s.set || {});
    }
  } catch (e) { /* つかえない ときは ほぞん しない */ }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* むし */ } }

  /* ================= じかん（あさ・ひる・ゆうがた・よる） ================= */
  const TOD = {
    asa: { ico: '🌅', name: 'あさ', sky: ['#7ec8ff', '#ffe0b8'], hill: '#9cc5b4', hill2: '#86c47a', grass: '#7cb342', tint: 'rgba(255,190,120,.07)', sun: [0.2, 175, 34, '#ffd43b'] },
    hiru: { ico: '☀️', name: 'ひる', sky: ['#3d9df0', '#d0ebff'], hill: '#a9c9b6', hill2: '#8ccf7e', grass: '#82c341', tint: null, sun: [0.8, 70, 30, '#ffe066'] },
    yuu: { ico: '🌇', name: 'ゆうがた', sky: ['#5f3dc4', '#ff922b', '#ffd8a8'], hill: '#8f6a8c', hill2: '#a07a62', grass: '#8a8f3c', tint: 'rgba(255,100,40,.16)', sun: [0.74, 235, 44, '#ff6b4a'] },
    yoru: { ico: '🌙', name: 'よる', sky: ['#070c2b', '#22325e'], hill: '#1c2747', hill2: '#24365a', grass: '#2f4a3a', tint: 'rgba(6,12,44,.52)', night: true },
  };
  const TOD_ORDER = ['asa', 'hiru', 'yuu', 'yoru'];

  /* ================= せかいの おおきさ ================= */
  const GAP = 1300, X0 = 800;               // えきと えきの あいだ
  const CAR = 204, NCARS = 4;               // 4りょう へんせい（1りょう 200）
  const STOP_OFF = 400;                     // えきの まんなかに とまる
  const DECK = 440, PLAT = 470;             // はこの うえ（せんろ）・ホームの たかさ
  const VMAX = 560, ACC = 200, DEC = 240;
  const DOORS = []; for (let k = 0; k < NCARS; k++) DOORS.push(k * CAR + 55, k * CAR + 145);
  const sxOf = (i) => X0 + i * GAP;

  /* ================= きほんの じょうたい ================= */
  const cv = $('cv'), ctx = cv.getContext('2d');
  let W = 800, Hv = 600, offY = 0, scale = 1, dpr = 1;
  let gtime = 0, last = 0, camX = 0;
  let mode = 'setup';          // setup | run | end
  let token = 0, timers = [];
  let people = [], spawned = {}, bubbles = [], parts = [];
  const R = { dir: 1, stops: [], ptr: 0, front: 0, v: 0, phase: 'stop', doors: 0, doorTarget: 0,
    heads: [[], [], [], []], announced: -1, sawNyoko: false, nyokoSt: -1, passIdx: 0, clack: 0, seed: 1,
    got: [], sleepy: false, boost: 0, sleepyDone: -1, chatT: 0, booCool: 0 };
  const nyoko = { state: 'hidden', x: 0, f: 1, a: 1, cheer: false, tx: 0, hop: 0 };
  const tsuku = { state: 'hidden', x: 0, y: 0, tx: 0, ty: 0, a: 1, cheer: false };
  const stopFront = (i) => sxOf(i) + R.dir * STOP_OFF;
  const L = (local) => R.front - R.dir * local - camX;       // でんしゃの なかの いち → がめん

  function hs(n) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function wait(s) { const tk = token; return new Promise((res) => timers.push({ at: gtime + s, res, tk })); }
  async function until(fn, max) { const t0 = gtime; while (!fn() && gtime - t0 < max) await wait(0.1); }

  /* ================= おと ================= */
  let AC = null, master = null, motor = null;
  function ac() {
    if (!save.set.snd) return null;
    try {
      if (!AC) {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        master = AC.createGain(); master.gain.value = 0.55; master.connect(AC.destination);
      }
      if (AC.state === 'suspended') AC.resume();
    } catch (e) { return null; }
    return AC;
  }
  function tone(f, d, type = 'sine', vol = 0.2, when = 0, to) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.05);
  }
  function noise(d, vol, when = 0, freq = 800, q = 1) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + when, n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  const sfx = {
    clack() { noise(0.07, 0.5, 0, 260, 2); noise(0.07, 0.45, 0.13, 200, 2); },
    chime() { tone(1175, 0.5, 'sine', 0.18); tone(880, 0.8, 'sine', 0.18, 0.32); },
    close() { for (let i = 0; i < 3; i++) tone(988, 0.16, 'square', 0.05, i * 0.22); },
    melody() { [659, 784, 988, 880, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, i * 0.16)); },
    horn() { tone(440, 0.5, 'square', 0.06, 0, 430); tone(554, 0.5, 'square', 0.05, 0, 545); },
    stamp() { noise(0.12, 0.7, 0, 180, 1); [1319, 1568, 2093].forEach((f, i) => tone(f, 0.25, 'sine', 0.1, 0.12 + i * 0.08)); },
    boo() { tone(110, 0.7, 'sawtooth', 0.22, 0, 60); tone(90, 0.7, 'square', 0.1, 0.02, 55); noise(0.6, 0.35, 0, 140, 3); },
    pi() { tone(1500, 0.08, 'sine', 0.08); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.14, i * 0.14)); tone(1047, 0.8, 'triangle', 0.14, 0.6); },
  };
  function motorUpdate() {
    if (!AC || !save.set.snd) { if (motor) motor.g.gain.value = 0; return; }
    if (!motor) {
      const o1 = AC.createOscillator(), o2 = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = 0;
      const g2 = AC.createGain(); g2.gain.value = 0.25;
      o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(master); o1.start(); o2.start();
      motor = { o1, o2, g };
    }
    const v = R.v, now = AC.currentTime;
    motor.o1.frequency.setTargetAtTime(38 + v * 0.18, now, 0.1);
    motor.o2.frequency.setTargetAtTime(180 + v * 1.4, now, 0.1);
    motor.g.gain.setTargetAtTime(mode === 'run' && v > 3 ? 0.05 : 0, now, 0.15);
  }
  function speak(text, pitch = 1) {
    if (!save.set.snd || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'ja-JP'; u.rate = 1.05; u.pitch = pitch;
      const v = speechSynthesis.getVoices().find((x) => /^ja/i.test(x.lang)); if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { /* よみあげ なし */ }
  }

  /* ================= もじ・ふきだし ================= */
  let capTimer = 0;
  function caption(html, sayText, small, dur = 4) {
    const c = $('cap'); c.innerHTML = html; c.className = 'cap' + (small ? ' small' : '');
    void c.offsetWidth; c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
    capTimer = dur; if (sayText) speak(sayText);
  }
  function say(pos, text, dur = 2.4, color = '#1b2a41', pitch) {
    bubbles = bubbles.filter((b) => b.pos !== pos);
    bubbles.push({ pos, text, until: gtime + dur, color });
    if (pitch) speak(text, pitch);
  }
  const nyokoPos = () => nyoko.state === 'train' ? { x: L(98), y: 340 } : { x: nyoko.x - camX, y: PLAT - 66 - nyoko.hop };
  const tsukuPos = () => tsuku.state === 'train' ? { x: L(116), y: 344 } : { x: tsuku.x - camX, y: tsuku.y - 30 };

  /* ================= ゾンビ（とおくの おか で おうえん） ================= */
  const PZ = 0.3, ZSLOT = 230;
  const hill1 = (u) => 255 + 28 * Math.sin(u * 0.0035) + 14 * Math.sin(u * 0.0101 + 1.3);
  const hill2 = (u) => 300 + 9 * Math.sin(u * 0.006 + 2) + 6 * Math.sin(u * 0.0173);
  const zHas = (j) => hs(j * 3.1) < 0.62;
  const zCount = (j) => 1 + Math.floor(hs(j * 7.7) * 3);
  const zU = (id) => { const j = Math.floor(id / 10), m = id % 10; return j * ZSLOT + 40 + m * 38 + hs(j + m) * 10; };
  function zombieSay(text, dur = 2.6) {
    const c = Math.floor((camX * PZ + W * 0.5) / ZSLOT);
    for (let d = 0; d < 6; d++) for (const j of [c + d, c - d]) {
      if (zHas(j)) { const id = j * 10 + Math.floor(hs(gtime + j) * zCount(j)); say(() => { const u = zU(id); return { x: u - camX * PZ, y: hill2(u) - 56 }; }, text, dur, '#2b8a3e'); return; }
    }
  }

  /* ================= ひと ================= */
  const SKIN = ['#f8d7b5', '#f1c27d', '#e0ac69', '#ffe0c7'], HAIR = ['#2b2b2b', '#5c3d1e', '#868e96', '#e8b04a', '#3b2f5c'];
  const SHIRT = ['#e64980', '#4dabf7', '#40c057', '#fab005', '#7950f2', '#fd7e14', '#20c997', '#f8f9fa'], PANTS = ['#364fc7', '#495057', '#5c3d1e', '#212529'];
  function makePerson(r, x, st) {
    return { x, y: PLAT, st, state: 'wait', a: 1, t: r() * 9, f: r() < 0.5 ? 1 : -1, kid: r() < 0.3, skin: SKIN[r() * 4 | 0],
      hair: HAIR[r() * 5 | 0], shirt: SHIRT[r() * 8 | 0], pants: PANTS[r() * 4 | 0], bag: r() < 0.3, wave: 0, tx: x, rise: 0 };
  }
  function spawnStation(i) {
    spawned[i] = true;
    const r = rng(i * 1013 + (R.dir > 0 ? 7 : 13) + R.seed * 31);
    const cnt = 4 + Math.floor(r() * 5);
    const sf = stopFront(i);
    const used = {};
    for (let c = 0; c < cnt; c++) {
      let d = DOORS[Math.floor(r() * DOORS.length)];
      if (i === R.nyokoSt && d === 55) d = 145;
      used[d] = (used[d] || 0) + 1;
      const local = d + (used[d] % 2 ? -1 : 1) * (10 + used[d] * 9) + (r() - 0.5) * 6;
      people.push(makePerson(r, sf - R.dir * local, i));
    }
  }
  function nearestDoorX(x) {
    let best = 0, bd = 1e9;
    for (let d = 0; d < DOORS.length; d++) { const dx = Math.abs(R.front - R.dir * DOORS[d] - x); if (dx < bd) { bd = dx; best = d; } }
    return { x: R.front - R.dir * DOORS[best], car: Math.floor(best / 2) };
  }
  const SLOTS = [[174, 188], [16, 28, 86, 100, 114, 174, 188], [16, 28, 86, 100, 114, 174, 188], [16, 28, 86, 100, 114]];
  function addHead(car, p) {
    for (let k = 0; k < NCARS; k++) {
      const c = (car + k) % NCARS, used = R.heads[c].map((h) => h.slot), free = SLOTS[c].filter((s) => !used.includes(s));
      if (free.length) { R.heads[c].push({ slot: free[Math.floor(hs(gtime * 7 + k) * free.length)], skin: p.skin, hair: p.hair, shirt: p.shirt, kid: p.kid }); return; }
    }
  }
  function alight(n) {
    for (let c = 0; c < n; c++) {
      const cars = R.heads.map((h, k) => h.length ? k : -1).filter((k) => k >= 0);
      if (!cars.length) return;
      const k = cars[Math.floor(Math.random() * cars.length)], h = R.heads[k].splice(Math.floor(Math.random() * R.heads[k].length), 1)[0];
      const d = h.slot < 100 ? k * CAR + 55 : k * CAR + 145, x = R.front - R.dir * d;
      const p = makePerson(Math.random, x, -1); Object.assign(p, { skin: h.skin, hair: h.hair, shirt: h.shirt, kid: h.kid, state: 'leave', a: 0.01, t: c * 0.5 });
      p.f = Math.random() < 0.5 ? 1 : -1; people.push(p);
    }
  }

  /* ================= スタンプ ================= */
  const today = () => { const d = new Date(); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };
  function stampHTML(i, got = true, rot = 0) {
    const s = ST[i];
    return `<div class="stamp ${got ? '' : 'no'} ${SPECIAL.includes(i) ? 'sp' : ''}" style="--ink:${INK[i % INK.length]};--rot:${rot}deg">` +
      `<span class="sn">${no(i)}</span><span class="se">${got ? s.e : '？'}</span><span class="sy">${s.y}</span><span class="sk">${s.k}</span></div>`;
  }
  let popTimer = 0;
  function giveStamp(i) {
    const key = String(i + 1), s = save.stamps[key] || { n: 0, first: today() }, isNew = !s.n;
    s.n++; save.stamps[key] = s; persist(); R.got.push(i);
    $('pop').innerHTML = stampHTML(i, true, -8) + `<p>${rb(i)}の スタンプ ゲット！</p>` + (isNew ? '<p class="new">✨ はじめての スタンプ！</p>' : '');
    $('pop').classList.remove('hidden'); popTimer = 2.2; sfx.stamp(); buildRail();
  }

  /* ================= えきの じゅんばん ================= */
  function setupRoute() {
    R.dir = save.set.dir;
    let list = save.set.mode === 'all' ? ST.map((s) => s.i) : [0, ...SPECIAL, 31];
    list = [...new Set(list)].sort((a, b) => a - b);
    if (R.dir < 0) list.reverse();
    R.stops = list; R.ptr = 0; R.nyokoSt = list[1];
  }
  function resetWorld() {
    token++; timers = [];
    setupRoute();
    R.seed = (R.seed + 1) % 1000;
    R.front = stopFront(R.stops[0]); R.v = 0; R.phase = 'stop'; R.doors = 0; R.doorTarget = 0;
    R.heads = [[], [], [], []]; R.announced = -1; R.sawNyoko = false; R.got = []; R.sleepy = false; R.boost = 0; R.sleepyDone = -1; R.booCool = 0;
    R.passIdx = R.stops[0] + R.dir;
    people = []; spawned = {}; bubbles = []; parts = [];
    Object.assign(nyoko, { state: 'stand', x: R.front + R.dir * 70, f: -R.dir, a: 1, cheer: true, hop: 0 });
    Object.assign(tsuku, { state: 'hover', x: R.front + R.dir * 110, y: PLAT - 80, a: 1, cheer: true });
    camX = R.front - (R.dir > 0 ? W * 0.64 : W * 0.36);
    $('booBtn').classList.add('hidden');
    buildRail();
  }

  /* ================= おはなし（えきに とまったとき） ================= */
  async function stationScript(i, kind) {
    R.phase = 'stop';
    if (kind !== 'start') caption(`${rb(i)}に つきました`, `${ST[i].y}、${ST[i].y}です`);
    giveStamp(i);
    await wait(1.0);
    sfx.chime(); R.doorTarget = 1; await wait(0.8);
    if (kind === 'mid') alight(1 + Math.floor(Math.random() * 3));
    if (kind === 'end') { alight(30); await endScript(i); return; }
    await wait(0.6);
    for (const p of people) if (p.st === i && p.state === 'wait') { const d = nearestDoorX(p.x); p.state = 'walk'; p.tx = d.x; p.car = d.car; p.f = d.x > p.x ? 1 : -1; }
    if (kind === 'start') {
      say(nyokoPos, 'がんばれー！ ブルーライン！', 2.4, '#2b8a3e', 1.5); await wait(1.4);
      say(tsukuPos, 'つくつく おうえん♪', 2.2, '#5c940d'); await wait(1.2);
      zombieSay('うー！ がんばれ〜！'); await wait(1.0);
    }
    if (i === R.nyokoSt) await nyokoScript();
    await until(() => !people.some((p) => p.st === i && (p.state === 'walk' || p.state === 'enter')), 6);
    if (kind === 'start') { say(nyokoPos, 'さきの えきで まってるね！', 2.6, '#2b8a3e', 1.5); await wait(2.0); }
    await wait(0.4);
    sfx.close(); R.doorTarget = 0; caption('ドアが しまります', null, true, 2); await wait(1.2);
    sfx.melody(); caption('しゅっぱつ しんこう！', 'しゅっぱつ しんこう！'); await wait(1.0); sfx.horn();
    R.ptr++; R.phase = 'run';
  }
  async function nyokoScript() {
    caption('にょこくんが のるよ！', null, false, 3);
    say(nyokoPos, 'ぼくも のる！', 2.4, '#2b8a3e', 1.5); await wait(1.4);
    nyoko.cheer = false; nyoko.state = 'walk'; nyoko.tx = R.front - R.dir * 55; nyoko.f = nyoko.tx > nyoko.x ? 1 : -1;
    await until(() => nyoko.state === 'train', 8);
    say(nyokoPos, 'のれた！ わーい！', 2.2, '#2b8a3e'); await wait(1.2);
    Object.assign(tsuku, { state: 'fly', x: R.front + R.dir * (W * 0.3), y: 60, tx: R.front - R.dir * 145, ty: PLAT - 60, a: 1, cheer: false });
    say(tsukuPos, 'まって〜！ つくぼうも のる〜！', 2.8, '#5c940d', 1.8);
    caption('つくぼうも のってきた！', null, false, 3);
    await until(() => tsuku.state === 'train', 8);
    say(tsukuPos, 'つくつく ぼーし♪', 2, '#5c940d'); await wait(1.2);
    zombieSay('ゾンビは のらないよ〜！ がんばれ〜！', 3);
    caption('ゾンビは のらないで、とおくから おうえん！', null, false, 3.5); await wait(2.4);
  }
  async function endScript(i) {
    caption(`しゅうてん ${rb(i)}です。おつかれさま！`, `しゅうてん、${ST[i].y}です。おつかれさまでした`, false, 5);
    await wait(1.2);
    if (nyoko.state === 'train') {
      Object.assign(nyoko, { state: 'out', x: R.front - R.dir * 55, f: R.dir, a: 0, tx: R.front + R.dir * 60 });
      Object.assign(tsuku, { state: 'hover', x: R.front - R.dir * 145, y: PLAT - 70, a: 1, cheer: true });
    }
    await wait(1.6); nyoko.cheer = true;
    say(nyokoPos, 'たのしかった〜！', 2.4, '#2b8a3e', 1.5); await wait(1.6);
    say(tsukuPos, 'また のろうね！', 2.2, '#5c940d', 1.8); await wait(1.2);
    zombieSay('おつかれさま〜！'); sfx.fanfare(); await wait(2.2);
    save.rides++; persist(); showEnd();
  }

  /* ================= よるの おなら ブー ================= */
  function boo(auto) {
    if (nyoko.state !== 'train' || R.booCool > 0) return;
    R.booCool = 4; R.sleepy = false; R.boost = 3.2; sfx.boo();
    say(nyokoPos, auto ? 'はやく しよう！ おなら… ブー！' : 'ブー！', 2.2, '#8a5a2b');
    speak('ぶー！', 0.6);
    caption('💨 ブー！ でんしゃが びゅーんと はやく なった！', null, false, 3);
    const rearL = NCARS * CAR - 4;
    for (let n = 0; n < 16; n++) {
      parts.push({ x: R.front - R.dir * (rearL + 10), y: 400 + Math.random() * 30, vx: -R.dir * (40 + Math.random() * 80), vy: -20 - Math.random() * 40, r: 14 + Math.random() * 16, life: 1.6 + Math.random() * 0.6, t: 0, rel: false, kind: 'cloud' });
      if (n < 6) parts.push({ lx: 98 + (Math.random() - 0.5) * 20, y: 370, vx: 0, vy: -30 - Math.random() * 30, r: 6 + Math.random() * 6, life: 1.2, t: 0, rel: true, kind: 'cloud' });
    }
    parts.push({ lx: 98, y: 320, vx: 0, vy: -26, r: 0, life: 1.6, t: 0, rel: true, kind: 'text' });
    $('booBtn').classList.add('hidden');
  }

  /* ================= うごき ================= */
  function update(dt) {
    for (let k = timers.length - 1; k >= 0; k--) {
      const tm = timers[k];
      if (tm.tk !== token) timers.splice(k, 1);
      else if (tm.at <= gtime) { timers.splice(k, 1); tm.res(); }
    }
    R.doors += Math.sign(R.doorTarget - R.doors) * Math.min(Math.abs(R.doorTarget - R.doors), dt * 2.2);
    if (capTimer > 0 && (capTimer -= dt) <= 0) $('cap').classList.add('hidden'); else if (capTimer > 0) $('cap').classList.remove('hidden');
    if (popTimer > 0 && (popTimer -= dt) <= 0) $('pop').classList.add('hidden');
    R.booCool = Math.max(0, R.booCool - dt); R.boost = Math.max(0, R.boost - dt);

    if (mode === 'run' && R.phase === 'run') runTrain(dt);
    camX = R.front - (R.dir > 0 ? W * 0.64 : W * 0.36);

    // えきの ひと
    const cc = camX + W / 2;
    for (const s of ST) if (!spawned[s.i] && Math.abs(stopFront(s.i) - R.dir * 400 - cc) < W + 1400) spawnStation(s.i);
    for (const p of people) {
      p.t += dt;
      if (p.state === 'walk') {
        const dx = p.tx - p.x; p.f = Math.sign(dx) || p.f;
        p.x += Math.sign(dx) * Math.min(Math.abs(dx), 70 * dt);
        if (Math.abs(dx) < 2) p.state = 'enter';
      } else if (p.state === 'enter') {
        p.a -= dt * 3; p.rise += dt * 20;
        if (p.a <= 0) { p.state = 'gone'; addHead(p.car || 0, p); }
      } else if (p.state === 'leave') {
        p.a = Math.min(1, p.a + dt * 3); if (p.t > 0) p.x += p.f * 55 * dt;
        if (p.t > 3) { p.a = Math.max(0, 1 - (p.t - 3)); if (p.a <= 0) p.state = 'gone'; }
      } else if (p.state === 'wait') {
        const near = Math.abs(p.x - (R.front - R.dir * 400)) < 700 && R.v > 20;
        p.wave = near ? 1 : Math.max(0, p.wave - dt);
      }
    }
    people = people.filter((p) => p.state !== 'gone' && Math.abs(p.x - cc) < W + 3000);

    // にょこくん
    nyoko.hop = nyoko.cheer ? Math.abs(Math.sin(gtime * 5)) * 10 : 0;
    if (nyoko.state === 'walk') {
      const dx = nyoko.tx - nyoko.x; nyoko.x += Math.sign(dx) * Math.min(Math.abs(dx), 48 * dt);
      if (Math.abs(dx) < 2) nyoko.state = 'enter';
    } else if (nyoko.state === 'enter') {
      nyoko.a -= dt * 2.5; if (nyoko.a <= 0) { nyoko.state = 'train'; nyoko.a = 1; }
    } else if (nyoko.state === 'out') {
      nyoko.a = Math.min(1, nyoko.a + dt * 2.5);
      const dx = nyoko.tx - nyoko.x; nyoko.x += Math.sign(dx) * Math.min(Math.abs(dx), 48 * dt); nyoko.f = Math.sign(dx) || nyoko.f;
      if (Math.abs(dx) < 2) { nyoko.state = 'stand'; nyoko.f = -R.dir; }
    }
    // スタートで まってた ふたりは、みえなく なったら さきの えきへ
    if (mode === 'run' && R.ptr >= 1 && nyoko.state === 'stand' && R.stops[R.ptr] === R.nyokoSt && Math.abs(nyoko.x - cc) > W * 0.7) {
      Object.assign(nyoko, { x: stopFront(R.nyokoSt) + R.dir * 34, f: -R.dir, cheer: true });
      tsuku.state = 'hidden';
    }
    // つくぼう
    if (tsuku.state === 'fly') {
      const dx = tsuku.tx - tsuku.x, dy = tsuku.ty - tsuku.y, d = Math.hypot(dx, dy), sp = 190 * dt;
      if (d < sp) { tsuku.state = 'enter'; } else { tsuku.x += dx / d * sp; tsuku.y += dy / d * sp; }
    } else if (tsuku.state === 'enter') { tsuku.a -= dt * 2.5; if (tsuku.a <= 0) { tsuku.state = 'train'; tsuku.a = 1; } }

    // けむり
    for (const p of parts) {
      p.t += dt; p.y += p.vy * dt;
      if (p.rel) p.lx += p.vx * dt; else p.x += p.vx * dt;
      if (p.kind === 'cloud') p.r += dt * 10;
    }
    parts = parts.filter((p) => p.t < p.life);
    bubbles = bubbles.filter((b) => b.until > gtime);

    chatter(dt);
    updateRail();
    motorUpdate();
  }

  function runTrain(dt) {
    const tgt = R.stops[R.ptr], target = stopFront(tgt);
    const dist = (target - R.front) * R.dir;
    // よるは ねむくて おそく なる
    const night = TOD[save.set.tod].night;
    if (night && nyoko.state === 'train' && R.sleepyDone !== R.ptr && dist > 1000 && dist < GAP * 40 && R.v > 300 && R.boost <= 0) {
      R.sleepyDone = R.ptr; R.sleepy = true;
      caption('よるが おそくて、でんしゃが ねむそう… ゆっくりに なっちゃった', 'よるが おそくて、でんしゃが ゆっくりに なっちゃった', false, 4);
      say(tsukuPos, 'ふぁ〜 ねむい…', 2, '#5c940d');
      $('booBtn').classList.remove('hidden');
      wait(4.5).then(() => { if (R.sleepy && mode === 'run') boo(true); });
    }
    if (!night) { R.sleepy = false; $('booBtn').classList.add('hidden'); }
    const vcap = R.boost > 0 ? 980 : R.sleepy ? 130 : VMAX;
    if (R.v > vcap) R.v = Math.max(vcap, R.v - DEC * 1.3 * dt); else R.v = Math.min(vcap, R.v + ACC * (R.boost > 0 ? 3 : 1) * dt);
    if (R.v * R.v / (2 * DEC) >= dist) R.v = Math.max(12, Math.sqrt(2 * DEC * Math.max(dist, 0)));
    const step = Math.min(R.v * dt, dist);
    R.front += R.dir * step;
    R.clack += step; if (R.clack > 200) { R.clack = 0; sfx.clack(); }

    if (R.announced !== R.ptr && dist < 1600) {
      R.announced = R.ptr;
      const last = R.ptr === R.stops.length - 1;
      caption(`つぎは ${rb(tgt)}${last ? '（しゅうてん）' : ''}`, `つぎは、${ST[tgt].y}`);
    }
    if (!R.sawNyoko && tgt === R.nyokoSt && dist < W * 0.75 + 200) {
      R.sawNyoko = true;
      caption('あっ！ にょこくんが みえてきた！', 'あっ！ にょこくんが みえてきた！');
      say(nyokoPos, 'おーい！ ブルーライン〜！', 2.6, '#2b8a3e');
    }
    // とおりすぎる えき
    while (R.passIdx >= 0 && R.passIdx < ST.length && (R.front - stopFront(R.passIdx)) * R.dir >= 0) {
      if (!R.stops.includes(R.passIdx) && R.announced !== R.ptr) caption(`${rb(R.passIdx)}を とおりすぎるよ`, null, true, 1.8);
      R.passIdx += R.dir;
    }
    if (dist <= 0.5) {
      R.front = target; R.v = 0; R.sleepy = false; $('booBtn').classList.add('hidden');
      stationScript(tgt, R.ptr === R.stops.length - 1 ? 'end' : 'mid');
    }
  }

  const ZLINES = ['がんばれ〜！', 'ブルーライン〜！', 'うー！ いけ〜！', 'はやいぞ〜！', 'ばんざ〜い！'];
  const NLINES = ['はやーい！', 'ガタン ゴトン♪', 'ゾンビさーん！ ありがとう〜', 'つぎは どこかな？', 'まどから みえるよ！', 'はこの うえ たかいね！'];
  const TLINES = ['つくつく ぼーし♪', 'みんみん… じゃなくて つくつく！', 'たのしいね〜！'];
  function chatter(dt) {
    R.chatT -= dt; if (R.chatT > 0) return;
    R.chatT = 3 + Math.random() * 3;
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    if (mode === 'setup') {
      const r = Math.random();
      if (r < 0.4) zombieSay(pick(ZLINES));
      else if (r < 0.7) say(nyokoPos, pick(['がんばれー！', 'ブルーライン かっこいい！', 'はこの うえに のってる！']), 2.2, '#2b8a3e');
      else say(tsukuPos, pick(['つくつく おうえん♪', 'がんばれ〜！']), 2.2, '#5c940d');
    } else if (mode === 'run' && R.phase === 'run' && R.v > 200) {
      const r = Math.random();
      if (r < 0.45) zombieSay(pick(ZLINES));
      else if (nyoko.state === 'train' && r < 0.8) say(nyokoPos, pick(NLINES), 2.2, '#2b8a3e');
      else if (tsuku.state === 'train') say(tsukuPos, pick(TLINES), 2.2, '#5c940d');
    }
  }

  /* ================= え ================= */
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function span(a, b) { const x1 = L(a), x2 = L(b); return [Math.min(x1, x2), Math.abs(x2 - x1)]; }
  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function star(x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); ctx.fill(); }

  let crateImg = null, crateScale = 0;
  function crate() {
    const s = Math.max(1, dpr * scale);
    if (crateImg && crateScale === s) return crateImg;
    const c = document.createElement('canvas'); c.width = c.height = Math.ceil(60 * s); const g = c.getContext('2d'); g.scale(s, s);
    g.fillStyle = '#c98b4e'; g.fillRect(0, 0, 60, 60);
    g.strokeStyle = '#7a4a22'; g.lineWidth = 4; g.strokeRect(2, 2, 56, 56); g.lineWidth = 3; g.strokeRect(8, 8, 44, 44);
    g.beginPath(); g.moveTo(10, 10); g.lineTo(50, 50); g.moveTo(50, 10); g.lineTo(10, 50); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(3, 3, 54, 4);
    crateImg = c; crateScale = s; return c;
  }

  function draw() {
    const T = TOD[save.set.tod];
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.translate(0, offY);
    // そら
    const g = ctx.createLinearGradient(0, -offY, 0, 440);
    T.sky.forEach((c, k) => g.addColorStop(k / (T.sky.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(0, -offY, W, 440 + offY);
    if (T.night) {
      ctx.fillStyle = '#fff';
      for (let k = 0; k < 60; k++) { const x = ((hs(k) * 2000 - camX * 0.03) % W + W) % W, y = -offY + hs(k + 99) * (offY + 240); ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(gtime + k)); ctx.fillRect(x, y, 2.4, 2.4); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff3bf'; ctx.beginPath(); ctx.arc(W * 0.8, 80, 26, 0, 7); ctx.fill();
      ctx.fillStyle = T.sky[0]; ctx.beginPath(); ctx.arc(W * 0.8 + 11, 73, 22, 0, 7); ctx.fill();
    } else {
      const [sxp, sy, sr, sc] = T.sun;
      ctx.fillStyle = sc; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(W * sxp, sy, sr * 1.6, 0, 7); ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(W * sxp, sy, sr, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let k = -1; k < W / 260 + 2; k++) {
        const j = Math.floor((camX * 0.06 + gtime * 6) / 260) - k;
        const x = k * 260 - ((camX * 0.06 + gtime * 6) % 260), y = 40 + hs(j) * 110;
        if (hs(j * 3) < 0.6) { ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.arc(x + 22, y - 8, 22, 0, 7); ctx.arc(x + 46, y, 17, 0, 7); ctx.fill(); }
      }
    }
    // とおくの やま
    ctx.fillStyle = T.hill; ctx.beginPath(); ctx.moveTo(0, 440);
    for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, hill1(x + camX * 0.15)); ctx.lineTo(W, 440); ctx.fill();
    // ゾンビの おか
    ctx.fillStyle = T.hill2; ctx.beginPath(); ctx.moveTo(0, 440);
    for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, hill2(x + camX * PZ)); ctx.lineTo(W, 440); ctx.fill();
    drawZombies(false);
    drawCity(false);
    // じめん
    ctx.fillStyle = T.grass; ctx.fillRect(0, 548, W, 52);
    ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, 548, W, 6);
    // えき（うしろ がわ）
    const vis = visibleStations();
    for (const i of vis) drawStationBack(i);
    // まっすぐ ならんだ はこ ＋ せんろ
    const img = crate();
    for (let x = Math.floor(camX / 60) * 60; x < camX + W + 60; x += 60) {
      ctx.drawImage(img, x - camX, DECK, 60, 60); ctx.drawImage(img, x - camX, DECK + 60, 60, 60);
    }
    ctx.fillStyle = '#5c3d1e'; ctx.fillRect(0, DECK - 3, W, 5);
    ctx.fillStyle = '#868e96'; ctx.fillRect(0, DECK - 6, W, 4);
    drawTrain();
    for (const i of vis) drawPlatform(i);
    for (const p of people) if (p.x - camX > -40 && p.x - camX < W + 40) drawPerson(p);
    // じかんの いろ
    if (T.tint) { ctx.fillStyle = T.tint; ctx.fillRect(0, -offY, W, Hv); }
    if (T.night) {
      drawCity(true); drawZombies(true);
      for (const i of vis) drawStationLights(i);
      drawWindows(true);
      // ヘッドライト
      const hx = L(0), gr = ctx.createLinearGradient(hx, 0, hx + R.dir * 260, 0);
      gr.addColorStop(0, 'rgba(255,244,200,.55)'); gr.addColorStop(1, 'rgba(255,244,200,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(hx, 406); ctx.lineTo(hx + R.dir * 260, 370); ctx.lineTo(hx + R.dir * 260, 450); ctx.closePath(); ctx.fill();
    }
    // にょこくん・つくぼう（いつも はっきり みえるように さいごに）
    if (['stand', 'walk', 'enter', 'out'].includes(nyoko.state)) {
      ctx.save(); ctx.globalAlpha = Math.max(0, nyoko.a);
      drawNyoko(nyoko.x - camX, PLAT - nyoko.hop, 1, nyoko.f, gtime, nyoko.state === 'walk' || nyoko.state === 'out');
      ctx.restore();
    }
    if (['hover', 'fly', 'enter'].includes(tsuku.state)) {
      const by = tsuku.state === 'hover' ? Math.sin(gtime * 3) * 6 : 0;
      ctx.save(); ctx.globalAlpha = Math.max(0, tsuku.a); drawTsuku(tsuku.x - camX, tsuku.y + by, 22, gtime, tsuku.cheer); ctx.restore();
    }
    drawParts();
    drawBubbles();
  }

  function visibleStations() {
    const out = [];
    for (const s of ST) {
      const a = stopFront(s.i) + R.dir * 150, b = stopFront(s.i) - R.dir * 840;
      if (Math.max(a, b) > camX - 60 && Math.min(a, b) < camX + W + 60) out.push(s.i);
    }
    return out;
  }
  // ステーションの いち（えきの なかの いち → がめん）
  const SL = (i, local) => stopFront(i) - R.dir * local - camX;
  function sspan(i, a, b) { const x1 = SL(i, a), x2 = SL(i, b); return [Math.min(x1, x2), Math.abs(x2 - x1)]; }

  function drawStationBack(i) {
    const [x, w] = sspan(i, -150, 840);
    ctx.fillStyle = '#868e96';
    for (let l = -120; l <= 820; l += 170) { const px = SL(i, l); ctx.fillRect(px - 4, 312, 8, 130); }
    ctx.fillStyle = '#495057'; ctx.fillRect(x, 298, w, 14);
    ctx.fillStyle = '#0067c0'; ctx.fillRect(x, 298, w, 5);
    drawBoard(i);
  }
  function drawBoard(i) {
    const bx = SL(i, 230);
    ctx.strokeStyle = '#495057'; ctx.lineWidth = 4; line(bx - 80, 290, bx - 80, 298); line(bx + 80, 290, bx + 80, 298);
    ctx.fillStyle = '#fff'; rr(bx - 125, 218, 250, 74, 10); ctx.fill();
    ctx.strokeStyle = '#0067c0'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#0067c0'; ctx.fillRect(bx - 123, 278, 246, 12);
    ctx.beginPath(); ctx.arc(bx - 100, 248, 17, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(no(i), bx - 100, 249);
    const k = ST[i].k, fs = k.length > 5 ? 22 : 30;
    ctx.fillStyle = '#1b2a41'; ctx.font = `bold 14px ${FONT}`; ctx.fillText(ST[i].y, bx + 10, 233);
    ctx.font = `bold ${fs}px ${FONT}`; ctx.fillText(k, bx + 10, 260);
    if (SPECIAL.includes(i)) { ctx.fillStyle = '#fab005'; star(bx + 108, 232, 11); }
  }
  function drawPlatform(i) {
    const [x, w] = sspan(i, -150, 840);
    ctx.fillStyle = '#ced4da'; ctx.fillRect(x, 462, w, 12);
    ctx.fillStyle = '#fcc419'; ctx.fillRect(x, 464, w, 4);
    ctx.fillStyle = '#adb5bd'; ctx.fillRect(x, 474, w, 126);
    ctx.fillStyle = '#868e96'; ctx.fillRect(x, 474, w, 4);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    for (let xx = x + 20; xx < x + w; xx += 44) ctx.fillRect(xx, 480, 3, 120);
    // ちいさい えきめい ひょうしき
    const px = SL(i, -110);
    ctx.fillStyle = '#495057'; ctx.fillRect(px - 3, 420, 6, 44);
    ctx.fillStyle = '#fff'; rr(px - 46, 394, 92, 30, 6); ctx.fill(); ctx.strokeStyle = '#0067c0'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#1b2a41'; ctx.font = `bold ${ST[i].y.length > 7 ? 9 : 12}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ST[i].y, px, 409);
  }
  function drawStationLights(i) {
    const [x, w] = sspan(i, -150, 840);
    const gr = ctx.createLinearGradient(0, 312, 0, 600);
    gr.addColorStop(0, 'rgba(255,240,190,.32)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = gr; ctx.fillRect(x, 312, w, 288);
    ctx.fillStyle = '#fff9db'; for (let l = -100; l <= 800; l += 120) ctx.fillRect(SL(i, l) - 12, 311, 24, 4);
    // ボードは よるも よめるように
    drawBoard(i);
    for (const p of people) if (p.st === i && p.x - camX > -40 && p.x - camX < W + 40) drawPerson(p);
  }

  function cityness(wx) {
    let c = 0;
    for (const [idx, s] of [[19, 1], [18, 0.9], [17, 0.9], [16, 0.8], [24, 0.85], [10, 0.6], [5, 0.55], [28, 0.5], [29, 0.5], [0, 0.4], [31, 0.4]]) {
      const d = (wx - sxOf(idx)) / (GAP * 1.7); c = Math.max(c, s * Math.exp(-d * d));
    }
    return c;
  }
  const BCOL = ['#dee2e6', '#c5d3e8', '#e9dcc9', '#d3e4cd', '#f1e3f3', '#cfd8dc'];
  function drawCity(lights) {
    const P = 0.5, SLOT = 96, u0 = camX * P;
    for (let j = Math.floor((u0 - 120) / SLOT); j <= Math.floor((u0 + W + 20) / SLOT); j++) {
      const x = j * SLOT + hs(j * 4.4) * 18 - u0, wx = (j * SLOT - W * 0.5) / P + W * 0.5, c = cityness(wx);
      if (hs(j * 5.5) < 0.3 + c * 0.9) {
        const w = 56 + hs(j * 1.3) * 30, h = 50 + hs(j * 2.1) * 50 + c * 200, y = 440 - h;
        if (!lights) {
          ctx.fillStyle = BCOL[Math.floor(hs(j * 6.6) * BCOL.length)]; ctx.fillRect(x, y, w, h);
          ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x + w - 8, y, 8, h);
        }
        for (let yy = y + 10; yy < 432; yy += 20) for (let xx = x + 8; xx < x + w - 14; xx += 16) {
          if (lights) { if (hs(xx * 0.37 + yy * 1.7 + j) < 0.45) { ctx.fillStyle = '#ffe066'; ctx.fillRect(xx, yy, 8, 10); } }
          else { ctx.fillStyle = 'rgba(80,120,170,.35)'; ctx.fillRect(xx, yy, 8, 10); }
        }
      } else if (!lights && hs(j * 9.1) < 0.7) {
        const h = 60 + hs(j * 3.3) * 40, tx = x + 30;
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(tx - 5, 440 - h * 0.45, 10, h * 0.45);
        ctx.fillStyle = hs(j) < 0.5 ? '#51cf66' : '#40a057';
        ctx.beginPath(); ctx.arc(tx, 440 - h * 0.6, h * 0.32, 0, 7); ctx.arc(tx - 14, 440 - h * 0.45, h * 0.22, 0, 7); ctx.arc(tx + 14, 440 - h * 0.45, h * 0.22, 0, 7); ctx.fill();
      }
    }
  }

  function drawZombies(lights) {
    const u0 = camX * PZ;
    for (let j = Math.floor((u0 - 140) / ZSLOT); j <= Math.floor((u0 + W + 40) / ZSLOT); j++) {
      if (!zHas(j)) continue;
      for (let m = 0; m < zCount(j); m++) {
        const u = zU(j * 10 + m);
        drawZombieCheer(u - u0, hill2(u) + 4, 0.55, gtime * 1.0 + j + m * 1.7, hs(j * 5 + m) < 0.35, lights);
      }
    }
  }
  function drawZombieCheer(x, y, s, t, flag, lights) {
    ctx.save(); ctx.translate(x, y - Math.abs(Math.sin(t * 4)) * 5); ctx.scale(s, s);
    const wave = Math.sin(t * 6) * 0.35;
    if (lights) { // よるは ペンライト
      for (const sgn of [-1, 1]) {
        const a = -Math.PI / 2 + sgn * (0.45 + wave * sgn), hx = sgn * 14 + Math.cos(a) * 34, hy = -58 + Math.sin(a) * 34;
        ctx.strokeStyle = sgn < 0 ? '#ff6b9a' : '#66d9e8'; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 14;
        line(hx, hy, hx + Math.cos(a) * 18, hy + Math.sin(a) * 18);
      }
      ctx.restore(); return;
    }
    ctx.fillStyle = '#4c6ef5'; ctx.fillRect(-14, -30, 11, 30); ctx.fillRect(3, -30, 11, 30);
    ctx.fillStyle = '#5c4033'; ctx.fillRect(-16, -6, 15, 6); ctx.fillRect(1, -6, 15, 6);
    ctx.fillStyle = '#e8590c'; rr(-20, -62, 40, 36, 8); ctx.fill();
    // ばんざいの うで
    ctx.strokeStyle = '#8ce99a'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    for (const sgn of [-1, 1]) {
      const a = -Math.PI / 2 + sgn * (0.45 + wave * sgn);
      const hx = sgn * 14 + Math.cos(a) * 34, hy = -58 + Math.sin(a) * 34;
      line(sgn * 14, -56, hx, hy);
      if (flag && sgn > 0) {
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; line(hx, hy, hx, hy - 34);
        ctx.fillStyle = '#0067c0'; ctx.beginPath(); ctx.moveTo(hx, hy - 34); ctx.lineTo(hx + 30, hy - 26); ctx.lineTo(hx, hy - 18); ctx.fill();
        ctx.strokeStyle = '#8ce99a'; ctx.lineWidth = 10;
      }
    }
    ctx.fillStyle = '#8ce99a'; rr(-18, -92, 36, 34, 12); ctx.fill();
    ctx.fillStyle = '#495057'; ctx.fillRect(-18, -92, 36, 7); ctx.fillRect(-18, -92, 7, 14);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-6, -76, 6, 0, 7); ctx.arc(7, -76, 5.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-5, -76, 2.6, 0, 7); ctx.arc(8, -76, 2.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.ellipse(1, -65, 6, 4 + Math.abs(Math.sin(t * 6)) * 3, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawPerson(p) {
    const s = p.kid ? 0.72 : 1, x = p.x - camX;
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, p.a)); ctx.translate(x, p.y - p.rise); ctx.scale(s, s);
    const mv = p.state === 'walk' || p.state === 'leave' ? Math.sin(p.t * 11) : 0;
    ctx.lineCap = 'round';
    ctx.strokeStyle = p.pants; ctx.lineWidth = 7; line(-4, -26, -4 + mv * 6, -3); line(4, -26, 4 - mv * 6, -3);
    ctx.fillStyle = p.shirt; rr(-11, -54, 22, 32, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = p.shirt; ctx.lineWidth = 6;
    line(-10, -48, -14, -30);
    const up = p.wave > 0.1;
    const wx = up ? 18 + Math.sin(p.t * 9) * 4 : 14, wy = up ? -72 : -30;
    line(10, -48, wx, wy);
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(-14, -29, 3.5, 0, 7); ctx.arc(wx, wy, 3.5, 0, 7); ctx.fill();
    if (p.bag) { ctx.fillStyle = '#5c3d1e'; rr(-22, -36, 10, 12, 3); ctx.fill(); }
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(0, -65, 11, 0, 7); ctx.fill();
    ctx.fillStyle = p.hair; ctx.beginPath(); ctx.arc(0, -67, 11.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-4, -65, 1.8, 0, 7); ctx.arc(4, -65, 1.8, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -61, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
  }

  function drawTrain() {
    for (let k = 0; k < NCARS; k++) {
      const a = k * CAR, b = a + 200, nf = k === 0, nr = k === NCARS - 1;
      // つなぎめ
      if (k > 0) { const [gx, gw] = span(a - 6, a); ctx.fillStyle = '#343a40'; ctx.fillRect(gx, 344, gw, 72); }
      ctx.beginPath();
      ctx.moveTo(L(a + (nf ? 20 : 0)), 330);
      ctx.lineTo(L(b - (nr ? 20 : 0)), 330);
      if (nr) ctx.quadraticCurveTo(L(b), 330, L(b), 354); else ctx.lineTo(L(b), 330);
      ctx.lineTo(L(b), 426); ctx.lineTo(L(a), 426);
      if (nf) { ctx.lineTo(L(a), 354); ctx.quadraticCurveTo(L(a), 330, L(a + 20), 330); } else ctx.lineTo(L(a), 330);
      ctx.closePath();
      ctx.fillStyle = '#e9ecef'; ctx.fill();
      ctx.save(); ctx.clip();
      const [x, w] = span(a, b);
      ctx.fillStyle = '#ced4da'; ctx.fillRect(x, 330, w, 8);
      ctx.fillStyle = '#1971c2'; ctx.fillRect(x, 394, w, 11);
      ctx.fillStyle = '#74c0fc'; ctx.fillRect(x, 405, w, 5);
      ctx.fillStyle = '#ced4da'; ctx.fillRect(x, 418, w, 8);
      if (nf) { const [fx, fw] = span(a, a + 6); ctx.fillStyle = '#1971c2'; ctx.fillRect(fx, 330, fw, 96); }
      if (nr) { const [fx, fw] = span(b - 6, b); ctx.fillStyle = '#1971c2'; ctx.fillRect(fx, 330, fw, 96); }
      ctx.restore();
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2; ctx.stroke();
      // ドア
      for (const d of [55, 145]) {
        const c = a + d, op = R.doors * 15;
        const [dx, dw] = span(c - 15, c + 15);
        ctx.fillStyle = '#343a40'; ctx.fillRect(dx, 344, dw, 82);
        for (const sg of [-1, 1]) {
          const [px, pw] = span(sg < 0 ? c - 15 - op : c + op, sg < 0 ? c - op : c + 15 + op);
          ctx.fillStyle = '#dee2e6'; ctx.fillRect(px, 344, pw, 82);
          ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; ctx.strokeRect(px, 344, pw, 82);
          ctx.fillStyle = '#a5d8ff'; ctx.fillRect(px + 3, 352, pw - 6, 30);
        }
      }
      // したまわり
      ctx.fillStyle = '#495057'; ctx.fillRect(x + 4, 426, w - 8, 6);
      for (const bg of [32, 168]) {
        const bx = L(a + bg);
        ctx.fillStyle = '#343a40'; rr(bx - 24, 424, 48, 8, 3); ctx.fill();
        for (const o of [-13, 13]) {
          ctx.fillStyle = '#212529'; ctx.beginPath(); ctx.arc(bx + o, 432, 7.5, 0, 7); ctx.fill();
          ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.arc(bx + o, 432, 2.5, 0, 7); ctx.fill();
        }
      }
    }
    drawWindows(false);
    // ライト
    ctx.fillStyle = '#fff3bf'; ctx.beginPath(); ctx.arc(L(3), 414, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(L(NCARS * CAR - 7), 414, 4, 0, 7); ctx.fill();
  }

  function winRanges(k) {
    const a = k * CAR, r = [];
    r.push([a + 8, a + 36, k === 0 ? 'cab' : 'w']);
    r.push([a + 76, a + 124, k === 0 ? 'friends' : 'w']);
    r.push([a + 166, a + 194, k === NCARS - 1 ? 'cab2' : 'w']);
    return r;
  }
  function drawWindows(night) {
    for (let k = 0; k < NCARS; k++) {
      for (const [a, b, kind] of winRanges(k)) {
        const [x, w] = span(a, b);
        ctx.save();
        rr(x, 346, w, 38, 4); ctx.fillStyle = night ? '#ffe8a3' : '#bfe3ff'; ctx.fill(); ctx.clip();
        if (kind === 'cab') drawHead(L(22), '#f8d7b5', '#1b2a41', '#1c3d6e', false, true);
        for (const h of R.heads[k]) if (k * CAR + h.slot > a && k * CAR + h.slot < b) drawHead(L(k * CAR + h.slot), h.skin, h.hair, h.shirt, h.kid);
        if (kind === 'friends') {
          if (nyoko.state === 'train') drawNyoko(L(98), 400 - Math.abs(Math.sin(gtime * 4)) * 3, 0.55, R.dir, gtime, false);
          if (tsuku.state === 'train') drawTsuku(L(116), 368 - Math.abs(Math.sin(gtime * 5)) * 2, 12, gtime, false);
        }
        if (!night) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4; line(x + 4, 380, x + 16, 350); }
        ctx.restore();
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2; rr(x, 346, w, 38, 4); ctx.stroke();
      }
    }
  }
  function drawHead(x, skin, hair, shirt, kid, cap) {
    const y = kid ? 376 : 368;
    ctx.fillStyle = shirt; ctx.beginPath(); ctx.ellipse(x, y + 22, 13, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
    ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(x, y - 2, 9.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    if (cap) { ctx.fillStyle = '#1c3d6e'; ctx.fillRect(x - 10, y - 10, 20, 5); ctx.fillRect(x - 2 + R.dir * 6, y - 6, 8, 2); }
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x - 3, y, 1.5, 0, 7); ctx.arc(x + 3, y, 1.5, 0, 7); ctx.fill();
  }

  // にょこすけ（いもむし。「わらって いもほり」の いろ と かお）
  function drawNyoko(x, y, s, f, t, walk) {
    ctx.save(); ctx.translate(x, y); ctx.scale(f * s, s);
    const O = '#3f7f25', ph = walk ? Math.sin(t * 9) : 0;
    for (let i = 0; i < 7; i++) {
      const sx = -78 + i * 11 + (walk ? ph * (6 - i) * 0.8 : 0), r = 9 + i * 0.9;
      const lift = walk ? Math.max(0, Math.sin(Math.PI * i / 6)) * Math.max(0, ph) * 14 : 0;
      const sy = -r - lift;
      ctx.fillStyle = O; ctx.beginPath(); ctx.ellipse(sx, -2, 3, 3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = i % 2 ? '#8ad65a' : '#9fe36c'; ctx.strokeStyle = O; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill(); ctx.stroke();
      if (i % 2 === 0) { ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(sx, sy + 1, 2.4, 0, 7); ctx.fill(); }
    }
    const hx = 2, hy = -36, hr = 21;
    ctx.strokeStyle = O; ctx.lineWidth = 3;
    const wig = Math.sin(t * 6) * 3;
    ctx.beginPath(); ctx.moveTo(hx - 6, hy - 17); ctx.quadraticCurveTo(hx - 10, hy - 30, hx - 14 + wig, hy - 38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 7, hy - 17); ctx.quadraticCurveTo(hx + 10, hy - 30, hx + 13 - wig, hy - 37); ctx.stroke();
    ctx.fillStyle = '#ff8fab'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx - 14 + wig, hy - 38, 5, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx + 13 - wig, hy - 37, 5, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a8ea72'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(hx - 6, hy - 8, 6, 0, 7); ctx.fill();
    for (const [ex, ey, er] of [[hx + 3, hy - 5, 6.5], [hx + 14, hy - 6, 5.6]]) {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(ex, ey, er, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(ex + 1.8, ey + 0.6, er * 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 2.6, ey - 1, 1.3, 0, 7); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,120,150,.55)'; ctx.beginPath(); ctx.arc(hx - 4, hy + 7, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#b3261e'; ctx.beginPath(); ctx.moveTo(hx + 4, hy + 8); ctx.lineTo(hx + 16, hy + 8); ctx.arc(hx + 10, hy + 8, 6, 0, Math.PI); ctx.fill();
    ctx.restore();
  }
  // つくぼう（ツクツクボウシ。ほっぺに ★）
  function drawTsuku(x, y, r, t, sing) {
    ctx.save(); ctx.translate(x, y); const s = r / 33; ctx.scale(s, s);
    const fl = Math.sin(t * 30) * 0.35;
    for (const sg of [-1, 1]) {
      ctx.save(); ctx.rotate(sg * (0.5 + fl)); ctx.fillStyle = 'rgba(236,255,220,.85)'; ctx.strokeStyle = '#82b04a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sg * 30, -6, 30, 14, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = '#a9e34b'; ctx.strokeStyle = '#5c940d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 33, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-10, -17, 9, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(-17, -8, 7.5, 0, 7); ctx.arc(17, -8, 7.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-14.5, -10.8, 2.6, 0, 7); ctx.arc(19.5, -10.8, 2.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd43b'; star(-28, 7, 8.5); star(28, 7, 8.5);
    if (sing) { ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.ellipse(0, 11, 6, 7, 0, 0, 7); ctx.fill(); }
    else { ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 6, 7, 0.3, Math.PI - 0.3); ctx.stroke(); }
    ctx.restore();
  }

  function drawParts() {
    for (const p of parts) {
      const x = p.rel ? L(p.lx) : p.x - camX, k = p.t / p.life;
      ctx.globalAlpha = Math.max(0, 1 - k);
      if (p.kind === 'cloud') { ctx.fillStyle = k < 0.3 ? '#e9c46a' : '#d4b483'; ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, 7); ctx.fill(); }
      else {
        ctx.font = `bold 40px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.strokeText('ブー！', x, p.y); ctx.fillStyle = '#8a5a2b'; ctx.fillText('ブー！', x, p.y);
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawBubbles() {
    ctx.font = `bold 17px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const b of bubbles) {
      const p = b.pos(); if (!p) continue;
      const tw = ctx.measureText(b.text).width + 22;
      const bx = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, p.x)), by = Math.max(-offY + 24, p.y - 28);
      ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(bx - tw / 2, by - 17, tw, 34, 14); ctx.fill();
      ctx.strokeStyle = b.color; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.beginPath(); ctx.moveTo(p.x - 7, by + 15); ctx.lineTo(p.x + 7, by + 15); ctx.lineTo(p.x, by + 27); ctx.fill();
      ctx.fillStyle = b.color; ctx.fillText(b.text, bx, by + 1);
    }
  }

  /* ================= したの ろせん バー ================= */
  function buildRail() {
    const rail = $('rail'); rail.querySelectorAll('.dot').forEach((d) => d.remove());
    for (const s of ST) {
      const d = document.createElement('div');
      d.className = 'dot' + (R.stops.includes(s.i) ? ' stop' : '') + (save.stamps[String(s.n)] ? ' got' : '');
      d.style.left = (s.i / (ST.length - 1) * 100) + '%'; rail.insertBefore(d, $('mini'));
    }
    $('mini').classList.toggle('rev', R.dir < 0);
    $('dest').innerHTML = mode === 'setup' ? 'ブルーライン みんなで のろう' : `${rb(R.dir > 0 ? 31 : 0)} ゆき`;
  }
  let lastFrac = -1;
  function updateRail() {
    const c = R.front - R.dir * 400, f = Math.max(0, Math.min(1, (c - sxOf(0)) / (sxOf(31) - sxOf(0))));
    if (Math.abs(f - lastFrac) > 0.001) { lastFrac = f; $('mini').style.left = (f * 100) + '%'; }
  }

  /* ================= パネル ================= */
  function openOv(id) { $(id).classList.remove('hidden'); }
  function showBook() {
    const got = ST.filter((s) => save.stamps[String(s.n)]).length;
    $('bookCount').textContent = `${got} / ${ST.length}`;
    $('bookGrid').innerHTML = ST.map((s) => `<button type="button" data-i="${s.i}" aria-label="${s.y}">${stampHTML(s.i, !!save.stamps[String(s.n)], Math.round((hs(s.i) - 0.5) * 16))}</button>`).join('');
    $('bookDetail').classList.add('hidden');
    openOv('book');
  }
  $('bookGrid').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const i = +b.dataset.i, s = ST[i], g = save.stamps[String(s.n)];
    sfx.pi();
    $('bookDetail').innerHTML = stampHTML(i, !!g) + `<div class="dt"><b>${rb(i)}</b>　${no(i)}<br>` +
      (g ? `${g.n}かい とまったよ。はじめて: ${g.first}` : 'まだ スタンプが ないよ。このえきに とまる でんしゃに のろう！') +
      (s.t ? `<br>のりかえ: ${s.t}` : '') + (SPECIAL.includes(i) ? '<br>⭐ とくべつな えき' : '') + '</div>';
    $('bookDetail').classList.remove('hidden');
  });
  function showMap() {
    const c = R.front - R.dir * 400;
    let here = 0, bd = 1e9; for (const s of ST) { const d = Math.abs(sxOf(s.i) - c); if (d < bd) { bd = d; here = s.i; } }
    $('mapList').innerHTML = ST.map((s) => `<li class="${R.stops.includes(s.i) ? 'stop' : ''} ${SPECIAL.includes(s.i) ? 'sp' : ''}">` +
      `<span class="no">${no(s.i)}</span><span class="nm">${rb(s.i)}</span><span class="em">${s.e}</span>` +
      (save.stamps[String(s.n)] ? '✅' : '') + (s.t ? `<span class="tr">🔁 ${s.t}</span>` : '') +
      (s.i === here ? `<span class="here">🚇 ${bd < 300 ? 'いま ここ' : 'このへん'}</span>` : '') + '</li>').join('');
    openOv('map');
    setTimeout(() => { const h = $('mapList').querySelector('.here'); if (h) h.scrollIntoView({ block: 'center' }); }, 30);
  }
  function showEnd() {
    mode = 'end';
    const last = R.stops[R.stops.length - 1];
    $('endTitle').innerHTML = `${rb(last)}に とうちゃく！`;
    const total = ST.filter((s) => save.stamps[String(s.n)]).length;
    $('endMsg').innerHTML = `スタンプを ${R.got.length}こ おしたよ。<br>スタンプちょうは ${total} / ${ST.length}`;
    $('endStamps').innerHTML = R.got.map((i) => stampHTML(i, true, Math.round((hs(i) - 0.5) * 16))).join('');
    $('backRide').innerHTML = `かえりも のる（${rb(R.dir > 0 ? 0 : 31)} ゆき）`;
    openOv('end');
  }
  document.querySelectorAll('.ov').forEach((o) => o.addEventListener('click', (e) => {
    if (e.target === o || e.target.closest('[data-close]')) { if (o.id !== 'end') o.classList.add('hidden'); }
  }));

  /* ================= ボタン ================= */
  function syncSeg() {
    for (const [id, v] of [['dirSeg', String(save.set.dir)], ['todSeg', save.set.tod], ['modeSeg', save.set.mode]])
      $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.v === v));
    $('todBtn').textContent = TOD[save.set.tod].ico;
    $('sndBtn').textContent = save.set.snd ? '🔊' : '🔇'; $('sndBtn').classList.toggle('off', !save.set.snd);
    $('fastBtn').classList.toggle('on', !!save.set.fast);
  }
  function seg(id, fn) { $(id).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; ac(); sfx.pi(); fn(b.dataset.v); persist(); syncSeg(); }); }
  seg('dirSeg', (v) => { save.set.dir = +v; if (mode === 'setup') { resetWorld(); } });
  seg('todSeg', (v) => { save.set.tod = v; });
  seg('modeSeg', (v) => { save.set.mode = v; if (mode === 'setup') resetWorld(); });
  $('todBtn').addEventListener('click', () => { save.set.tod = TOD_ORDER[(TOD_ORDER.indexOf(save.set.tod) + 1) % 4]; persist(); syncSeg(); caption(`${TOD[save.set.tod].ico} ${TOD[save.set.tod].name}に なったよ`, null, true, 2); });
  $('fastBtn').addEventListener('click', () => { save.set.fast = !save.set.fast; persist(); syncSeg(); });
  $('sndBtn').addEventListener('click', () => {
    save.set.snd = !save.set.snd; persist(); syncSeg();
    if (!save.set.snd) { try { speechSynthesis.cancel(); } catch (e) { /* なし */ } } else { ac(); sfx.pi(); }
  });
  $('mapBtn').addEventListener('click', showMap); $('mapBtn2').addEventListener('click', showMap); $('line').addEventListener('click', showMap);
  $('bookBtn').addEventListener('click', showBook); $('bookBtn2').addEventListener('click', showBook);
  $('endBook').addEventListener('click', showBook);
  $('booBtn').addEventListener('click', () => { ac(); boo(false); });
  function goHome() {
    mode = 'setup'; $('end').classList.add('hidden'); $('setup').classList.remove('hidden'); $('cap').classList.add('hidden');
    capTimer = 0; resetWorld();
  }
  $('homeBtn').addEventListener('click', goHome); $('endHome').addEventListener('click', goHome);
  function start() {
    ac(); $('setup').classList.add('hidden'); $('end').classList.add('hidden');
    resetWorld(); mode = 'run'; buildRail();
    const i0 = R.stops[0];
    caption(`${rb(i0)}から ${rb(R.dir > 0 ? 31 : 0)}ゆき しゅっぱつ！`, `${ST[i0].y}から、${ST[R.dir > 0 ? 31 : 0].y}ゆき、しゅっぱつします`, false, 4);
    stationScript(i0, 'start');
  }
  $('goBtn').addEventListener('click', start);
  $('backRide').addEventListener('click', () => { save.set.dir = -save.set.dir; persist(); syncSeg(); start(); });

  // がめんを タッチ: でんしゃ → ファーン、にょこくん・つくぼう・ゾンビ → おしゃべり
  cv.addEventListener('pointerdown', (e) => {
    ac();
    const rect = cv.getBoundingClientRect(), x = (e.clientX - rect.left) / scale, y = (e.clientY - rect.top) / scale - offY;
    const np = nyokoPos(), tp = tsukuPos();
    if (nyoko.state !== 'hidden' && Math.hypot(x - np.x, y - (np.y + 40)) < 50) { say(nyokoPos, ['にょこにょこ〜！', 'えへへ', 'ブルーライン だいすき！'][Math.floor(Math.random() * 3)], 2, '#2b8a3e', 1.5); return; }
    if (tsuku.state !== 'hidden' && Math.hypot(x - tp.x, y - (tp.y + 30)) < 40) { say(tsukuPos, 'つくつく ぼーし♪', 2, '#5c940d', 1.8); return; }
    const tx1 = Math.min(L(0), L(NCARS * CAR)), tx2 = Math.max(L(0), L(NCARS * CAR));
    if (y > 326 && y < 440 && x > tx1 && x < tx2) { sfx.horn(); return; }
    if (y < 320 && y > 180) zombieSay(ZLINES[Math.floor(Math.random() * ZLINES.length)]);
  });

  /* ================= がめんの おおきさ ================= */
  function resize() {
    const r = $('stage').getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    scale = Math.min(r.height / 600, r.width / 380);
    W = r.width / scale; Hv = r.height / scale; offY = Hv - 600;
  }
  window.addEventListener('resize', resize);

  let dbgMult = 1;
  function frame(ts) {
    const rdt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    const dt = rdt * (save.set.fast && mode === 'run' ? 2 : 1) * dbgMult;
    gtime += dt;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  resize(); syncSeg(); resetWorld(); buildRail();
  if (location.hash === '#debug') window.__blue = { R, nyoko, tsuku, people, start, boo, save: () => save, mult: (m) => { dbgMult = m; }, get mode() { return mode; } };
  requestAnimationFrame(frame);
})();
