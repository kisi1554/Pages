// きめつクエスト: ゲームの しくみ（いどう・はなす・メニュー・たたかい・おと・セーブ）
// おはなし（マップ・ひと・イベント）は ep1.js が EP に いれる。
'use strict';

const $ = s => document.querySelector(s);
const TS = 16, VW = 15, VH = 11;
const cv = $('#cv'), ctx = cv.getContext('2d');
const bcv = $('#bcv'), bctx = bcv.getContext('2d');
const stage = $('#stage');
const SAVE_KEY = 'kimetsu-quest-v1', SND_KEY = 'kimetsu-quest-sound';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random() * n);
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* むし */ } }
function load(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }

let EP = null;        // ep1.js が いれる
let G = null;         // セーブする じょうたい
let npcs = [];
let scriptOn = false; // イベントちゅうは うごけない
let battleOn = false;

// ---------------------------------------------------------------- おと
let AC = null, master = null, musicG = null, soundOn = load(SND_KEY, true);
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = soundOn ? .6 : 0; master.connect(AC.destination);
    musicG = AC.createGain(); musicG.gain.value = 1; musicG.connect(master);
  } catch (e) { AC = null; }
}
function tone(f, t, dur, type = 'square', vol = .1, dest = master) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .01);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .03);
  return o;
}
function noise(t, dur, vol = .2, hp = 800) {
  const len = Math.max(1, Math.floor(AC.sampleRate * dur)), buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
const SFX = {
  cursor: t => tone(880, t, .05, 'square', .05),
  ok: t => { tone(988, t, .06, 'square', .06); tone(1319, t + .06, .08, 'square', .06); },
  cancel: t => tone(440, t, .08, 'square', .05),
  ng: t => tone(150, t, .15, 'square', .07),
  hit: t => { noise(t, .12, .3, 1200); tone(220, t, .1, 'square', .08); },
  hurt: t => { noise(t, .2, .3, 300); tone(110, t, .2, 'sawtooth', .08); },
  miss: t => { const o = tone(600, t, .2, 'triangle', .08); o.frequency.exponentialRampToValueAtTime(1600, t + .2); },
  slash: t => { noise(t, .25, .35, 2500); },
  enc: t => { for (let i = 0; i < 6; i++) tone(300 + i * 140, t + i * .05, .07, 'square', .06); },
  heal: t => { [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * .07, .14, 'triangle', .09)); },
  lvl: t => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, t + i * .09, .16, 'square', .06)); },
  win: t => { [392, 523, 659, 784].forEach((f, i) => tone(f, t + i * .1, .2, 'square', .06)); },
  buy: t => { tone(1319, t, .07, 'square', .05); tone(1760, t + .07, .12, 'square', .05); },
  step: t => tone(90, t, .04, 'triangle', .05),
};
function sfx(n) { if (!AC || !soundOn) return; try { SFX[n](AC.currentTime + .01); } catch (e) { /* むし */ } }

const NOTE_CACHE = {};
function noteF(n) {
  if (NOTE_CACHE[n]) return NOTE_CACHE[n];
  const m = /^([A-G])(#|b)?(\d)$/.exec(n); if (!m) return 0;
  const semi = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return (NOTE_CACHE[n] = 440 * Math.pow(2, ((+m[3] + 1) * 12 + semi - 69) / 12));
}
for (const k in SONGS) { SONGS[k].mt = SONGS[k].m.trim().split(/\s+/); SONGS[k].bt = SONGS[k].b.trim().split(/\s+/); }
let song = null;
function playSong(name) {
  if (song && song.name === name) return;
  song = name ? { name, s: SONGS[name], step: 0, next: 0 } : null;
}
function voice(tokens, i, t, dt, w, v) {
  const n = tokens[i % tokens.length];
  if (n === '-' || n === '.') return;
  let len = 1; while (tokens[(i + len) % tokens.length] === '-' && len < 16) len++;
  tone(noteF(n), t, dt * len * .92, w, v, musicG);
}
setInterval(() => {
  if (!AC || !song || !soundOn) return;
  const s = song.s, dt = 60 / s.bpm / 2;
  if (song.next < AC.currentTime) song.next = AC.currentTime + .05;
  while (song.next < AC.currentTime + .3) {
    voice(s.mt, song.step, song.next, dt, s.mw, s.mv);
    voice(s.bt, song.step, song.next, dt, s.bw, s.bv);
    song.step++; song.next += dt;
  }
}, 60);
function setSound(on) {
  soundOn = on; store(SND_KEY, on);
  $('#sndBtn').textContent = on ? '🔊' : '🔇';
  if (master) master.gain.value = on ? .6 : 0;
  if (song) song.next = 0;
}

// ---------------------------------------------------------------- にゅうりょく
const handlers = [];
const pushH = h => handlers.push(h);
const popH = h => { const i = handlers.lastIndexOf(h); if (i >= 0) handlers.splice(i, 1); };
let held = null;
function input(k) {
  initAudio();
  if (handlers.length) { handlers[handlers.length - 1](k); return; }
  if (!fieldReady() || (mv.on && !DIRS.includes(k))) return;
  if (k === 'a') interact();
  else if (k === 'b' || k === 'menu') fieldMenu();
  else if (!mv.on) tryMove(k);
}
const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right',
  Enter: 'a', ' ': 'a', z: 'a', Z: 'a', Escape: 'b', x: 'b', X: 'b', Backspace: 'b', m: 'menu', M: 'menu' };
const DIRS = ['up', 'down', 'left', 'right'];
document.addEventListener('keydown', e => {
  const k = KEYMAP[e.key]; if (!k) return;
  e.preventDefault();
  if (DIRS.includes(k)) { held = k; if (!e.repeat || handlers.length) input(k); }
  else if (!e.repeat) input(k);
});
document.addEventListener('keyup', e => { if (KEYMAP[e.key] === held) held = null; });
document.querySelectorAll('[data-k]').forEach(b => {
  const k = b.dataset.k;
  let rep = null;
  const up = () => { b.classList.remove('on'); if (held === k) held = null; clearInterval(rep); };
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); b.classList.add('on');
    try { b.setPointerCapture(e.pointerId); } catch (er) { /* むし */ }
    if (DIRS.includes(k)) {
      held = k;
      clearInterval(rep); rep = setInterval(() => { if (handlers.length && held === k) input(k); }, 260);
    }
    input(k);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, up));
  b.addEventListener('contextmenu', e => e.preventDefault());
});
$('#msg').addEventListener('click', () => input('a'));
$('#info').addEventListener('click', () => input('a'));
$('#sndBtn').addEventListener('click', () => { initAudio(); setSound(!soundOn); });
$('#menuBtn').addEventListener('click', () => input('menu'));

// ---------------------------------------------------------------- ウィンドウ
const msgEl = $('#msg'), msgText = $('#msgText'), msgNext = $('#msgNext');
let msgHideT = null;
// say: ことばを 1まい だす。opt.auto=ミリびょう で じどうで すすむ
function say(text, who, opt = {}) {
  return new Promise(res => {
    clearTimeout(msgHideT);
    msgEl.hidden = false;
    const head = who ? `<span class="who">${esc(who)}</span>` : '';
    const body = who ? `「${text}」` : text;
    let i = 0, done = false, timer = null;
    msgNext.style.visibility = 'hidden';
    const draw = () => { msgText.innerHTML = head + esc(body.slice(0, i)).replace(/\n/g, '<br>'); };
    const iv = setInterval(() => { i += 1; draw(); if (i >= body.length) finish(); }, 26);
    function finish() {
      if (done) return;
      done = true; clearInterval(iv); i = body.length; draw();
      if (opt.auto) timer = setTimeout(close, opt.auto); else msgNext.style.visibility = 'visible';
    }
    function close() {
      clearTimeout(timer); popH(h);
      if (!opt.keep) msgHideT = setTimeout(() => { msgEl.hidden = true; }, 60);
      res();
    }
    const h = k => { if (k !== 'a' && k !== 'b') return; if (!done) finish(); else close(); };
    pushH(h); draw();
  });
}
async function talk(who, lines) { for (const l of [].concat(lines)) await say(l, who); }
function setMsg(text) { clearTimeout(msgHideT); msgEl.hidden = false; msgText.textContent = text; msgNext.style.visibility = 'hidden'; }
function hideMsg() { msgEl.hidden = true; }

// choose: えらぶ。キャンセルは -1
function choose(opts, o = {}) {
  return new Promise(res => {
    const el = $('#choice');
    el.className = 'win ' + (o.style || 'list'); el.hidden = false;
    const items = opts.map(x => typeof x === 'string' ? { label: x } : x);
    const cols = o.style === 'grid2' ? 2 : 1;
    let idx = Math.min(o.start || 0, items.length - 1);
    const draw = () => {
      el.innerHTML = (o.title ? `<div class="ctitle">${esc(o.title)}</div>` : '') + items.map((it, i) =>
        `<button type="button" class="opt${i === idx ? ' on' : ''}${it.disabled ? ' dis' : ''}" data-i="${i}"><span>${esc(it.label)}</span>${it.right != null ? `<span class="r">${esc(String(it.right))}</span>` : ''}</button>`).join('');
    };
    const finish = i => { popH(h); el.hidden = true; el.onclick = null; res(i); };
    const pick = i => { if (items[i].disabled) { sfx('ng'); return; } sfx('ok'); finish(i); };
    const move = d => { idx = (idx + d + items.length) % items.length; sfx('cursor'); draw(); };
    const h = k => {
      if (k === 'up') move(-cols); else if (k === 'down') move(cols);
      else if (k === 'left' && cols === 2) move(-1); else if (k === 'right' && cols === 2) move(1);
      else if (k === 'a') pick(idx);
      else if ((k === 'b' || k === 'menu') && o.cancel !== false) { sfx('cancel'); finish(-1); }
    };
    el.onclick = e => { const b = e.target.closest('.opt'); if (b) { idx = +b.dataset.i; pick(idx); } };
    pushH(h); draw();
  });
}
// info: ひょう などを だして、ボタンで とじる
function info(html) {
  return new Promise(res => {
    const el = $('#info'); el.innerHTML = html; el.hidden = false;
    const h = k => { if (k === 'a' || k === 'b' || k === 'menu') { popH(h); el.hidden = true; res(); } };
    pushH(h);
  });
}
const fadeEl = $('#fade');
async function fade(on, ms = 350) {
  fadeEl.classList.remove('white');
  fadeEl.style.transition = `opacity ${ms}ms`; fadeEl.style.opacity = on ? 1 : 0;
  await sleep(ms + 20);
}
async function flash(times = 2) {
  fadeEl.classList.add('white');
  for (let i = 0; i < times; i++) {
    fadeEl.style.transition = 'none'; fadeEl.style.opacity = .85; await sleep(70);
    fadeEl.style.opacity = 0; await sleep(70);
  }
  fadeEl.classList.remove('white');
}
function shake() { stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); }

// ---------------------------------------------------------------- つよさ
const NEXT = [0, 0, 6, 16, 32, 55, 90, 140, 200, 280, 1e9];
function stats() {
  const lv = G.lv; let def = lv;
  for (const g in G.gear) if (G.gear[g]) def += GEAR[g].def;
  return { maxhp: 14 + lv * 6, maxmp: 2 + lv * 2, atk: 5 + lv * 2, def, agi: 3 + lv };
}
function fullHeal() { const s = stats(); G.hp = s.maxhp; G.mp = s.maxmp; }
function addItem(id, n = 1) { G.items[id] = (G.items[id] || 0) + n; if (G.items[id] <= 0) delete G.items[id]; }
function save() { if (G) store(SAVE_KEY, G); }

// ---------------------------------------------------------------- ドット絵
function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
const WALK = '.,g#=';
function drawTile(ch, sx, sy, tx, ty, t) {
  const h = hash(tx, ty);
  const R = (x, y, w, hh, c) => { ctx.fillStyle = c; ctx.fillRect(sx + x, sy + y, w, hh); };
  const snow = () => { R(0, 0, 16, 16, '#e9eff6'); R(h % 13 + 1, (h >> 4) % 13 + 1, 2, 1, '#d2dce8'); R((h >> 8) % 14 + 1, (h >> 12) % 14 + 1, 1, 1, '#d2dce8'); };
  const wall = () => { R(0, 0, 16, 16, '#d8c8a8'); R(0, 0, 2, 16, '#5a3a20'); R(14, 0, 2, 16, '#5a3a20'); R(0, 14, 16, 2, '#5a3a20'); R(0, 0, 16, 1, '#5a3a20'); };
  switch (ch) {
    case '.': snow(); break;
    case 'g': snow(); R(3, 9, 1, 3, '#4f7f45'); R(4, 7, 1, 5, '#64985a'); R(5, 10, 1, 2, '#4f7f45'); R(10, 4, 1, 3, '#4f7f45'); R(11, 2, 1, 5, '#64985a'); R(12, 5, 1, 2, '#4f7f45'); break;
    case ',': R(0, 0, 16, 16, '#d9cdb7'); R(h % 12 + 2, (h >> 5) % 12 + 2, 2, 1, '#c3b296'); R((h >> 9) % 12 + 2, (h >> 13) % 12 + 2, 1, 1, '#b8a688'); break;
    case '#': R(0, 0, 16, 16, '#c3bcb0'); R(0, 7, 16, 1, '#a39c90'); R(0, 15, 16, 1, '#a39c90'); R(h % 2 ? 5 : 9, 0, 1, 7, '#a39c90'); R(h % 3 ? 3 : 12, 8, 1, 7, '#a39c90'); R((h >> 6) % 14, (h >> 3) % 14, 2, 1, '#eef2f6'); break;
    case 'T':
      snow(); R(7, 12, 2, 3, '#5a3a22');
      R(6, 1, 4, 3, '#1e5236'); R(4, 4, 8, 3, '#1e5236'); R(3, 7, 10, 3, '#1e5236'); R(2, 10, 12, 2, '#1e5236');
      R(8, 1, 2, 3, '#174530'); R(8, 4, 4, 3, '#174530'); R(8, 7, 5, 3, '#174530'); R(8, 10, 6, 2, '#174530');
      R(6, 1, 3, 1, '#fff'); R(4, 4, 3, 1, '#fff'); R(9, 4, 2, 1, '#f0f4fa'); R(3, 7, 4, 1, '#fff'); R(10, 7, 2, 1, '#f0f4fa'); R(2, 10, 5, 1, '#fff'); R(11, 10, 2, 1, '#f0f4fa');
      break;
    case '^': snow(); R(2, 5, 12, 9, '#8a8f99'); R(3, 4, 10, 1, '#8a8f99'); R(9, 6, 5, 8, '#6f747e'); R(3, 3, 8, 2, '#f4f7fb'); R(2, 5, 4, 1, '#f4f7fb'); break;
    case '~': {
      R(0, 0, 16, 16, '#4a7fb5'); const o = (t >> 4) % 2 ? 4 : 0;
      R((h % 8 + o) % 12, 4, 4, 1, '#7aa8d6'); R(((h >> 4) % 8 + o + 6) % 12, 11, 4, 1, '#7aa8d6'); break;
    }
    case '=': R(0, 0, 16, 16, '#4a7fb5'); R(1, 0, 14, 16, '#9a6a3a'); for (let i = 3; i < 16; i += 4) R(1, i, 14, 1, '#7a4f28'); R(0, 0, 1, 16, '#5a3a20'); R(15, 0, 1, 16, '#5a3a20'); break;
    case 'R': R(0, 0, 16, 16, '#7a5a38'); R(0, 5, 16, 1, '#664a2c'); R(0, 10, 16, 1, '#664a2c'); R(0, 15, 16, 1, '#5a3e24'); R(0, 0, 16, 3, '#eef3f8'); R(h % 10, 3, 5, 1, '#eef3f8'); break;
    case 'H': wall(); break;
    case 'W': wall(); R(4, 3, 8, 8, '#f4f0e4'); R(8, 3, 1, 8, '#8a6a4a'); R(4, 7, 8, 1, '#8a6a4a'); break;
    case 'D': wall(); R(3, 2, 10, 14, '#4a2c18'); R(4, 3, 8, 13, '#6a4024'); R(8, 3, 1, 13, '#4a2c18'); R(4, 1, 8, 1, '#3a2010'); break;
    case 'L': R(0, 0, 16, 16, '#c3bcb0'); R(6, 12, 4, 3, '#8f8f8f'); R(7, 7, 2, 5, '#a8a8a8'); R(5, 4, 6, 4, '#b8b8b8'); R(6, 5, 4, 2, (t >> 5) % 2 ? '#ffd27a' : '#ffc25a'); R(4, 2, 8, 2, '#888'); R(4, 2, 8, 1, '#eef2f6'); break;
    case 'b': snow(); R(1, 7, 7, 8, '#c8a860'); R(8, 6, 7, 9, '#bfa058'); R(1, 10, 14, 1, '#a08040'); R(2, 6, 5, 2, '#222'); R(9, 5, 5, 2, '#222'); break;
    case 'k': snow(); R(2, 6, 12, 9, '#8a6a50'); R(4, 3, 8, 3, '#8a6a50'); R(5, 2, 6, 1, '#eef3f8'); R(3, 5, 10, 1, '#eef3f8'); R(6, 10, 4, 5, '#2a1a10'); R(7, 11, 2, 3, (t >> 4) % 2 ? '#c84a1a' : '#e8702a'); break;
    case 's': snow(); R(7, 9, 2, 6, '#6a4024'); R(2, 3, 12, 6, '#b08050'); R(2, 3, 12, 1, '#8a5a30'); R(4, 5, 8, 1, '#5a3a20'); R(4, 7, 5, 1, '#5a3a20'); break;
    default: R(0, 0, 16, 16, '#000');
  }
}

// ひと（16x16）。dir=up/down/left/right, frame=0/1
function drawPerson(c, px, py, L, dir, frame, opt = {}) {
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(px + x, py + y, w, h); };
  const kid = !!L.kid, hy = kid ? 4 : 1, by = kid ? 11 : 8, bh = kid ? 3 : 5, ly = by + bh, lh = kid ? 1 : 2;
  const hair = L.hair, skin = L.skin, top = L.top, side = dir === 'left' || dir === 'right';
  R(3, 15, 10, 1, 'rgba(0,0,0,.2)');
  // うしろの かみ（ながい）
  if (L.long && dir !== 'up') {
    if (dir === 'down') { R(3, hy + 3, 1, 7, hair); R(12, hy + 3, 1, 7, hair); R(3, hy + 9, 1, 1, L.tip || hair); R(12, hy + 9, 1, 1, L.tip || hair); }
    else R(dir === 'left' ? 10 : 4, hy + 3, 2, 7, hair);
  }
  // あし
  const lc = L.legs || '#333';
  if (side) { R(6, ly, 2, lh - (frame ? 1 : 0), lc); R(8, ly, 2, lh - (frame ? 0 : 1), lc); }
  else { R(5, ly, 2, lh - (frame ? 1 : 0), lc); R(9, ly, 2, lh - (frame ? 0 : 1), lc); }
  // からだ
  const t2 = L.top2 || top;
  for (let y = 0; y < bh; y++) for (let x = 0; x < 8; x++) {
    let col = top;
    if (L.pat === 'check') col = ((x >> 1) + (y >> 1)) % 2 ? top : t2;
    else if (L.pat === 'asa') col = (x + y * 2) % 4 === 0 ? t2 : top;
    else if (L.pat === 'half') {
      const right = dir === 'up' ? x < 4 : dir === 'left' ? true : dir === 'right' ? false : x >= 4;
      col = right ? (((x >> 1) + y) % 2 ? t2 : L.top3) : top;
    } else if (y === bh - 2 && L.top2) col = t2;
    R(4 + x, by + y, 1, 1, col);
  }
  if (L.pat === 'half' || L.pat === 'check') R(4, by + bh - 2, 8, 1, L.pat === 'half' ? '#1a1a2a' : '#1a1a1a');
  // うで
  if (side) { const ax = dir === 'left' ? 6 + (frame ? -1 : 0) : 9 + (frame ? 1 : 0); R(ax, by + 1, 1, bh - 2, top); R(ax, by + bh - 1, 1, 1, skin); }
  else { R(3, by + 1, 1, bh - 2, top); R(12, by + 1, 1, bh - 2, top); R(3, by + bh - 1, 1, 1, skin); R(12, by + bh - 1, 1, 1, skin); }
  // しょいかご・せおう ねずこ
  if (opt.basket) {
    if (dir === 'up') { R(4, by - 1, 8, 6, '#a8783a'); R(4, by + 1, 8, 1, '#8a5a24'); R(4, by + 3, 8, 1, '#8a5a24'); R(5, by - 2, 6, 1, '#222'); }
    else if (side) { const bx = dir === 'left' ? 10 : 3; R(bx, by - 1, 3, 6, '#a8783a'); R(bx, by - 2, 3, 1, '#222'); }
  }
  if (opt.carry) {
    if (dir === 'up') { R(4, by - 1, 8, 6, '#ee92b0'); R(5, by, 1, 1, '#f9c8d8'); R(9, by + 2, 1, 1, '#f9c8d8'); }
    else if (side) { const bx = dir === 'left' ? 10 : 3; R(bx, by - 1, 3, 6, '#ee92b0'); }
    else { R(2, by, 2, 3, '#ee92b0'); R(12, by, 2, 3, '#ee92b0'); }
  }
  if (L.sword) {
    if (dir === 'down') { R(0, by + 2, 4, 1, '#222'); R(0, by + 2, 1, 1, '#c9a040'); }
    else if (dir === 'up') { R(12, by + 2, 4, 1, '#222'); }
    else if (dir === 'left') { R(8, by + 2, 6, 1, '#222'); R(13, by + 2, 1, 1, '#c9a040'); }
    else { R(2, by + 2, 6, 1, '#222'); R(2, by + 2, 1, 1, '#c9a040'); }
  }
  // あたま
  if (L.bald) { R(4, hy, 8, 3, skin); R(3, hy + 1, 1, 4, hair); R(12, hy + 1, 1, 4, hair); }
  else { R(4, hy, 8, 3, hair); R(3, hy + 1, 1, 4, hair); R(12, hy + 1, 1, 4, hair); }
  if (L.tip) { R(5, hy, 2, 1, L.tip); R(9, hy, 2, 1, L.tip); }
  if (L.bun) R(6, hy - 1, 4, 2, hair);
  const eye = L.eye || '#222';
  if (dir === 'up') {
    R(4, hy + 3, 8, 4, L.bald ? skin : hair);
    if (L.bald) { R(3, hy + 2, 10, 3, hair); }
    if (L.long) { R(4, hy + 3, 8, 7, hair); R(4, hy + 9, 8, 1, L.tip || hair); }
    if (L.pony) R(7, hy + 4, 2, 6, hair);
  } else if (dir === 'down') {
    R(4, hy + 3, 8, 4, skin); if (!L.bald) R(4, hy + 2, 8, 1, hair); else R(4, hy + 2, 8, 1, skin);
    R(6, hy + 4, 1, 2, eye); R(9, hy + 4, 1, 2, eye);
    if (L.scar) R(5, hy + 2, 2, 1, '#b0302a');
    if (L.ear) { R(3, hy + 5, 1, 2, '#f4f4f4'); R(12, hy + 5, 1, 2, '#f4f4f4'); R(3, hy + 6, 1, 1, '#d33'); R(12, hy + 6, 1, 1, '#d33'); }
    if (L.beard) R(5, hy + 6, 6, 2, '#e4e4e4');
  } else {
    const l = dir === 'left';
    R(l ? 4 : 6, hy + 3, 6, 4, skin); R(l ? 10 : 4, hy + 2, 2, 4, L.bald ? hair : hair);
    if (!L.bald) R(l ? 4 : 6, hy + 2, 6, 1, hair);
    R(l ? 5 : 10, hy + 4, 1, 2, eye);
    if (L.ear) { R(l ? 10 : 5, hy + 5, 1, 2, '#f4f4f4'); R(l ? 10 : 5, hy + 6, 1, 1, '#d33'); }
    if (L.pony) R(l ? 12 : 2, hy + 3, 2, 5, hair);
    if (L.beard) R(l ? 4 : 7, hy + 6, 5, 2, '#e4e4e4');
  }
  if (L.ribbon) { R(10, hy - 1, 3, 2, L.ribbon); R(11, hy - 1, 1, 2, '#fff0f4'); }
}
function drawArt(c, art, ox, oy, s) {
  const A = ART[art];
  A.px.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '.') continue; c.fillStyle = A.pal[ch]; c.fillRect(ox + x * s, oy + y * s, s, s); } });
}

// ---------------------------------------------------------------- フィールド
const mv = { on: false, fx: 0, fy: 0, t: 0, dur: 9 };
const DX = { up: 0, down: 0, left: -1, right: 1 }, DY = { up: -1, down: 1, left: 0, right: 0 };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
function curMap() { return EP.maps[G.map]; }
function tileAt(x, y) { const M = curMap(); if (y < 0 || y >= M.rows.length || x < 0 || x >= M.w) return M.edge || 'T'; return M.rows[y][x] || 'T'; }
function npcAt(x, y) { return npcs.find(n => n.x === x && n.y === y && !n.ghost); }
function fieldReady() { return G && !scriptOn && !battleOn && !handlers.length && $('#title').hidden; }
function refreshNPCs() { npcs = EP.buildNPCs(G); }
function tryMove(dir) {
  G.dir = dir;
  const nx = G.x + DX[dir], ny = G.y + DY[dir];
  if (!WALK.includes(tileAt(nx, ny)) || npcAt(nx, ny)) return false;
  mv.on = true; mv.fx = G.x; mv.fy = G.y; mv.t = 0;
  G.x = nx; G.y = ny;
  return true;
}
async function stepDone() {
  G.steps = (G.steps || 0) + 1;
  const ex = (curMap().exits || []).find(e => e.x === G.x && e.y === G.y);
  if (ex) { await run(() => changeMap(ex.to, ex.tx, ex.ty, ex.dir)); return; }
  if (await EP.onStep(G)) return;
  // ランダム エンカウント
  const M = curMap();
  if (M.enemies && EP.canEncounter(G)) {
    const ch = tileAt(G.x, G.y);
    const rate = ch === ',' ? 1 / 40 : 1 / 13;
    G.calm = (G.calm || 0) + 1;
    if (G.calm > 4 && Math.random() < rate) {
      G.calm = 0;
      const list = M.enemies(G.x, G.y);
      await run(() => fieldBattle(list[rnd(list.length)]));
    }
  }
}
async function changeMap(to, tx, ty, dir) {
  await fade(true, 250);
  G.map = to; G.x = tx; G.y = ty; if (dir) G.dir = dir;
  refreshNPCs(); playSong(EP.song(G));
  await fade(false, 250);
  save();
  await EP.onEnter(G);
}
// イベントを うごかす（うごけなく して、おわったら もどす）
async function run(fn) {
  if (scriptOn) return fn();
  scriptOn = true;
  try { await fn(); } finally { scriptOn = false; hideMsg(); }
}
function facing() { return { x: G.x + DX[G.dir], y: G.y + DY[G.dir] }; }
function interact() {
  const f = facing(), n = npcAt(f.x, f.y);
  if (n) {
    n.dir = OPP[G.dir];
    run(() => n.talk(n));
    return;
  }
  const ch = tileAt(f.x, f.y), t = EP.tileTalk(ch, f.x, f.y, G);
  if (t) run(() => say(t));
}
function spawn(id, x, y, dir, look, talkFn) {
  const o = { id, x, y, dir, look, talk: talkFn || (async () => {}) };
  npcs = npcs.filter(n => n.id !== id); npcs.push(o); return o;
}
function despawn(id) { npcs = npcs.filter(n => n.id !== id); }
function findNPC(id) { return npcs.find(n => n.id === id); }

// ---------------------------------------------------------------- メニュー
async function fieldMenu() {
  await run(async () => {
    sfx('ok');
    let start = 0;
    for (;;) {
      const i = await choose(['つよさ', 'どうぐ', 'きろくする', soundOn ? 'おと：オン' : 'おと：オフ', 'とじる'], { style: 'menu', start });
      start = Math.max(i, 0);
      if (i < 0 || i === 4) return;
      if (i === 0) await info(statusHTML());
      if (i === 1) await itemMenu(false);
      if (i === 2) { save(); sfx('heal'); await say('ぼうけんの きろくを かきました。\nつぎは「つづきから」で はじめられるよ。'); }
      if (i === 3) setSound(!soundOn);
    }
  });
}
function statusHTML() {
  const s = stats(), gear = Object.keys(G.gear).filter(g => G.gear[g]).map(g => GEAR[g].name);
  const toNext = G.lv < 9 ? NEXT[G.lv + 1] - G.exp : '-';
  return `<div class="h">たんじろう</div><table>
  <tr><td>レベル</td><td>${G.lv}</td><td>つぎまで</td><td>${toNext}</td></tr>
  <tr><td>HP</td><td>${G.hp}/${s.maxhp}</td><td>きあい</td><td>${G.mp}/${s.maxmp}</td></tr>
  <tr><td>ちから</td><td>${s.atk}</td><td>まもり</td><td>${s.def}</td></tr>
  <tr><td>おかね</td><td>${G.money} もん</td><td>ぶき</td><td>おの</td></tr></table>
  <div>そうび：${gear.length ? gear.join('、') : 'なし'}</div>
  <div>わざ：${skillsKnown().map(s => s.name).join('、') || 'なし'}</div>`;
}
function skillsKnown() {
  const l = [];
  if (G.lv >= 2) l.push({ id: 'zutsuki', name: 'ずつき', mp: 2 });
  if (G.lv >= 4) l.push({ id: 'nose', name: 'はなを きかせる', mp: 1 });
  return l;
}
async function itemMenu(inBattle) {
  for (;;) {
    const ids = Object.keys(G.items).filter(k => G.items[k] > 0);
    if (!ids.length) { await say('どうぐを なにも もっていない。', null, inBattle ? { auto: 900, keep: true } : {}); return false; }
    const i = await choose(ids.map(k => ({ label: ITEMS[k].name, right: '×' + G.items[k] })), { title: 'どうぐ' });
    if (i < 0) return false;
    const id = ids[i], it = ITEMS[id];
    if (it.key) { await say(it.desc, null, inBattle ? { auto: 1000, keep: true } : {}); if (inBattle) return false; continue; }
    const s = stats(); addItem(id, -1); sfx('heal');
    if (it.heal) { const before = G.hp; G.hp = Math.min(s.maxhp, G.hp + it.heal); await say(`たんじろうは ${it.name}を たべた！\nHPが ${G.hp - before} かいふくした！`, null, inBattle ? { auto: 1000, keep: true } : {}); }
    if (it.mp) { const before = G.mp; G.mp = Math.min(s.maxmp, G.mp + it.mp); await say(`たんじろうは ${it.name}を なめた！\nきあいが ${G.mp - before} かいふくした！`, null, inBattle ? { auto: 1000, keep: true } : {}); }
    return true;
  }
}

// ---------------------------------------------------------------- たたかい
const bmsg = t => say(t, null, { auto: 850, keep: true });
let curEnemy = null;
function drawEnemy(E) {
  bctx.clearRect(0, 0, 64, 48);
  if (E.person) { bctx.save(); bctx.translate(8, 0); bctx.scale(3, 3); drawPerson(bctx, 0, 0, LOOK[E.person], 'down', 0); bctx.restore(); }
  else drawArt(bctx, E.art, 8, 0, 3);
}
function updBStat() {
  const s = stats(), el = $('#bstat');
  el.innerHTML = `<span class="n">たんじろう</span>　LV ${G.lv}<br>HP ${G.hp}/${s.maxhp}　きあい ${G.mp}/${s.maxmp}`;
  el.classList.toggle('low', G.hp > 0 && G.hp <= s.maxhp / 4);
  el.classList.toggle('dead', G.hp <= 0);
}
function enemyBlink() { bcv.classList.remove('blink'); void bcv.offsetWidth; bcv.classList.add('blink'); }
function calcDmg(atk, def) { return Math.max(1, Math.round((atk - def / 2) * (0.8 + Math.random() * 0.4))); }

async function battle(key) {
  battleOn = true;
  const E = Object.assign({ key }, ENEMIES[key]); E.maxhp = E.hp;
  const B = { E, nose: false, axeUp: 0, fails: 0, calls: 0, turn: 0 };
  curEnemy = E;
  sfx('enc'); await flash(3);
  const bt = $('#battle'); bt.hidden = false; bt.classList.toggle('night', !!E.night || G.time === 'evening' || G.time === 'night');
  bcv.classList.remove('gone', 'blink'); drawEnemy(E); updBStat();
  const prevSong = song && song.name; playSong(E.song || 'battle');
  await bmsg(E.intro || `${E.name}が あらわれた！`);
  let result = null;
  while (!result) {
    updBStat();
    const act = await command(B);
    const enemyFirst = !E.boss && E.agi > stats().agi && Math.random() < .5;
    if (enemyFirst) result = await enemyTurn(B);
    if (!result) result = await playerAct(B, act);
    if (!result && !enemyFirst) result = await enemyTurn(B);
    B.turn++;
    if (result === 'lose' && E.boss) {
      updBStat();
      await bmsg('たんじろうは がくりと ひざを ついた……');
      if (EP.bossLose) await EP.bossLose(B);
      await say('でも、 ここで まける わけには いかない！');
      fullHeal(); sfx('heal'); updBStat();
      B.axeUp = 0; B.fails = Math.max(B.fails, 4); B.retry = true;
      if (EP.hint) await EP.hint(B, true);
      result = null;
    }
  }
  updBStat();
  if (result === 'win') {
    bcv.classList.add('gone'); sfx('win');
    await bmsg(`${E.name}は やまへ にげていった！`);
    G.money += E.gold;
    await say(`けいけんち ${E.exp}ポイント、${E.gold}もん てにいれた！`, null, { keep: true });
    await gainExp(E.exp);
  }
  if (result === 'run') await sleep(200);
  $('#battle').hidden = true; hideMsg();
  battleOn = false; curEnemy = null;
  if (result !== 'lose') playSong(prevSong || EP.song(G));
  return result;
}
async function gainExp(n) {
  G.exp += n;
  while (G.lv < 9 && G.exp >= NEXT[G.lv + 1]) {
    const before = stats(); G.lv++; const after = stats();
    G.hp += after.maxhp - before.maxhp; G.mp += after.maxmp - before.maxmp;
    sfx('lvl'); updBStat();
    await say(`たんじろうは レベル ${G.lv}に あがった！`, null, { keep: true });
    if (G.lv === 2) await say('わざ「ずつき」を おぼえた！\n（かたい あたまで ゴツン！ きあいを 2 つかう）', null, { keep: true });
    if (G.lv === 4) await say('わざ「はなを きかせる」を おぼえた！\n（においで よんで、 つぎの こうげきが かならず かいしんに なる）', null, { keep: true });
  }
}
async function command(B) {
  for (;;) {
    updBStat();
    const i = await choose(['こうげき', 'わざ', 'どうぐ', 'にげる'], { style: 'grid2', cancel: false, start: B.lastCmd || 0 });
    B.lastCmd = i;
    if (i === 0) return { t: 'atk' };
    if (i === 3) return { t: 'run' };
    if (i === 1) {
      const list = skillsKnown().concat(EP.extraSkills ? EP.extraSkills(B) : []);
      if (!list.length) { await bmsg('まだ わざを おぼえていない。'); continue; }
      const j = await choose(list.map(s => ({ label: s.name, right: s.mp ? s.mp : '', disabled: s.mp > G.mp })), { title: 'わざ（きあい）' });
      if (j < 0) continue;
      return { t: 'skill', s: list[j].id, mp: list[j].mp || 0 };
    }
    if (i === 2) { if (await itemMenu(true)) return { t: 'item' }; }
  }
}
async function playerAct(B, act) {
  const E = B.E, s = stats();
  if (EP.playerAct) { const r = await EP.playerAct(B, act); if (r !== undefined) return r; }
  if (act.t === 'item') return null;
  if (act.t === 'run') {
    if (E.boss) { await bmsg('にげられない！'); return null; }
    if (Math.random() < .65) { await bmsg('たんじろうは にげだした！'); return 'run'; }
    await bmsg('しかし まわりこまれて しまった！'); return null;
  }
  if (act.t === 'skill') {
    G.mp -= act.mp; updBStat();
    if (act.s === 'zutsuki') return attack(B, 1.7, 'たんじろうの ずつき！ ゴツン！');
    if (act.s === 'nose') { B.nose = true; await bmsg('たんじろうは はなを きかせた！'); await bmsg(`${E.name}の すきの においが わかる！`); return null; }
  }
  return attack(B, 1, 'たんじろうの こうげき！');
}
async function attack(B, mult, text) {
  const E = B.E, s = stats();
  await bmsg(text);
  if (!B.nose && Math.random() < .06) { sfx('miss'); await bmsg(`ミス！ ${E.name}は ひらりと みをかわした！`); return null; }
  const crit = B.nose || Math.random() < 1 / 16; B.nose = false;
  const d = crit ? Math.round(s.atk * mult * 1.6) : calcDmg(s.atk * mult, E.def);
  if (crit) await bmsg('かいしんの いちげき！');
  sfx('hit'); enemyBlink();
  E.hp -= d;
  await bmsg(`${E.name}に ${d}の ダメージ！`);
  return E.hp <= 0 ? 'win' : null;
}
async function enemyTurn(B) {
  const E = B.E;
  if (EP.enemyTurn) { const r = await EP.enemyTurn(B); if (r !== undefined) return r; }
  let m = 1;
  if (E.charge && Math.random() < .3) { await bmsg(`${E.name}の とっしん！`); m = 1.5; }
  else await bmsg(`${E.name}の こうげき！`);
  if (Math.random() < .08) { sfx('miss'); await bmsg('たんじろうは ひらりと かわした！'); return null; }
  return hurt(calcDmg(E.atk * m, stats().def));
}
async function hurt(d) {
  sfx('hurt'); shake();
  G.hp = Math.max(0, G.hp - d); updBStat();
  await bmsg(`たんじろうは ${d}の ダメージを うけた！`);
  return G.hp <= 0 ? 'lose' : null;
}
async function fieldBattle(key) {
  const r = await battle(key);
  if (r === 'lose') await EP.fieldLose(G);
}

// ---------------------------------------------------------------- えがく
const flakes = Array.from({ length: 46 }, () => ({ x: Math.random() * 240, y: Math.random() * 176, v: .25 + Math.random() * .5, s: Math.random() < .25 ? 2 : 1, p: Math.random() * 6 }));
const TINT = { day: null, evening: 'rgba(230,110,60,.18)', night: 'rgba(8,16,60,.55)', morning: 'rgba(255,245,230,.06)', gray: 'rgba(30,40,70,.30)' };
let tick = 0, lastGoal = '';
function render() {
  tick++;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 240, 176);
  if (!G) return;
  const M = curMap(), mw = M.w * TS, mh = M.rows.length * TS;
  // いどう
  if (mv.on) {
    mv.t++;
    if (mv.t >= mv.dur) { mv.on = false; stepDone(); }
  }
  if (!mv.on && held && fieldReady()) tryMove(held);
  const k = mv.on ? mv.t / mv.dur : 1;
  const ppx = (mv.on ? mv.fx + (G.x - mv.fx) * k : G.x) * TS, ppy = (mv.on ? mv.fy + (G.y - mv.fy) * k : G.y) * TS;
  let cx = mw <= 240 ? (mw - 240) / 2 : Math.max(0, Math.min(mw - 240, ppx + 8 - 120));
  let cy = mh <= 176 ? (mh - 176) / 2 : Math.max(0, Math.min(mh - 176, ppy + 8 - 88));
  cx = Math.round(cx); cy = Math.round(cy);
  const tx0 = Math.floor(cx / TS), ty0 = Math.floor(cy / TS);
  for (let ty = ty0; ty <= ty0 + VH + 1; ty++) for (let tx = tx0; tx <= tx0 + VW + 1; tx++) drawTile(tileAt(tx, ty), tx * TS - cx, ty * TS - cy, tx, ty, tick);
  const fr = Math.floor(tick / 18) % 2;
  const ents = npcs.map(n => ({ y: n.y * TS, f: () => drawPerson(ctx, n.x * TS - cx, n.y * TS - cy - 2, LOOK[n.look], n.dir, n.still ? 0 : fr) }));
  if (!G.hidePlayer) ents.push({ y: ppy, f: () => drawPerson(ctx, Math.round(ppx - cx), Math.round(ppy - cy) - 2, LOOK.tanjiro, G.dir, mv.on ? Math.floor(mv.t / 5) % 2 : fr, { basket: (G.items.sumi || 0) > 0, carry: G.flags.carry }) });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.f());
  const tint = TINT[G.time];
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, 240, 176); }
  if (M.snow) {
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (const f of flakes) {
      f.y += f.v; f.p += .03; if (f.y > 176) { f.y = -2; f.x = Math.random() * 240; }
      ctx.fillRect(Math.round(f.x + Math.sin(f.p) * 3), Math.round(f.y), f.s, f.s);
    }
  }
  const goal = EP.goal(G);
  if (goal !== lastGoal) { lastGoal = goal; $('#goal').textContent = goal; }
}
function loop() { render(); requestAnimationFrame(loop); }

// ---------------------------------------------------------------- タイトル
async function titleScreen() {
  G = null; npcs = []; lastGoal = ''; $('#goal').textContent = '';
  $('#title').hidden = false; fadeEl.style.opacity = 0;
  const saved = load(SAVE_KEY, null);
  const old = $('#title .tclear'); if (old) old.remove();
  if (saved && saved.flags && saved.flags.ep1clear) {
    const d = document.createElement('div'); d.className = 'tclear'; d.textContent = '★ だい1わ クリア！ つぎの おはなしを まってね';
    $('#title .tbox').appendChild(d);
  }
  const opts = ['はじめから'];
  if (saved) opts.unshift('つづきから');
  const i = await choose(opts, { style: 'title', cancel: false });
  initAudio();
  if (opts[i] === 'はじめから') {
    if (saved) {
      const j = await choose(['はじめから あそぶ', 'やめる'], { style: 'title', title: 'きろくが きえるけど いい？' });
      if (j !== 0) return titleScreen();
    }
    G = EP.newGame();
    await fade(true, 200); $('#title').hidden = true;
    refreshNPCs(); playSong(EP.song(G));
    await fade(false, 500);
    await run(() => EP.opening(G));
  } else {
    G = Object.assign(EP.newGame(), saved);
    await fade(true, 200); $('#title').hidden = true;
    refreshNPCs(); playSong(EP.song(G));
    await fade(false, 400);
    await run(() => EP.onEnter(G));
  }
}
function startEngine() {
  setSound(soundOn);
  requestAnimationFrame(loop);
  titleScreen();
}
