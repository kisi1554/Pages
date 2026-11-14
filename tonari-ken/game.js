// となりの けん たんけん — けんの「つながり」を つかって たびを する
(() => {
'use strict';
const $ = s => document.querySelector(s);
const P = PREFECTURES, N = P.length;
const short = P.map(p => p.kana.replace(/(けん|ふ)$/, '').replace(/^とうきょうと$/, 'とうきょう'));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---- となりの データ（けんコード。りくで くっついて いる くみ） ----
const LAND_PAIRS = '2-3 2-5 3-4 3-5 4-5 4-6 4-7 5-6 6-7 6-15 7-8 7-9 7-10 7-15 8-9 8-11 8-12 9-10 9-11 10-11 10-15 10-20 ' +
  '11-12 11-13 11-19 11-20 12-13 13-14 13-19 14-19 14-22 15-16 15-20 16-17 16-20 16-21 17-18 17-21 18-21 18-25 18-26 ' +
  '19-20 19-22 20-21 20-22 20-23 21-23 21-24 21-25 22-23 23-24 24-25 24-26 24-29 24-30 25-26 26-27 26-28 26-29 27-28 27-29 27-30 ' +
  '28-31 28-33 29-30 31-32 31-33 31-34 32-34 32-35 33-34 34-35 36-37 36-38 36-39 37-38 38-39 ' +
  '40-41 40-43 40-44 41-42 43-44 43-45 43-46 44-45 45-46';
// うみを わたる みち [けんA, けんB, えもじ, なまえ, Aがわ(けいど,いど), Bがわ]
const SEA_LINKS = [
  [1, 2, '🚇', 'せいかん トンネル', [140.25, 41.5], [140.38, 41.2]],
  [12, 14, '🌉', 'アクアライン', [139.93, 35.42], [139.76, 35.52]],
  [28, 36, '🌉', 'おおなると きょう', [134.68, 34.27], [134.6, 34.17]],
  [33, 37, '🌉', 'せと おおはし', [133.82, 34.46], [133.83, 34.31]],
  [34, 38, '🌉', 'しまなみ かいどう', [133.2, 34.4], [133.0, 34.07]],
  [35, 40, '🚇', 'かんもん トンネル', [130.93, 33.97], [130.96, 33.88]],
  [46, 47, '⛴', 'フェリー', null, null],
];
const INLAND = [9, 10, 11, 19, 20, 21, 25, 29].map(c => c - 1);
const land = P.map(() => new Set()), adj = P.map(() => new Set()), seaName = {};
LAND_PAIRS.split(' ').forEach(s => { const [a, b] = s.split('-').map(n => n - 1); land[a].add(b); land[b].add(a); adj[a].add(b); adj[b].add(a); });
SEA_LINKS.forEach(l => { const a = l[0] - 1, b = l[1] - 1; adj[a].add(b); adj[b].add(a); seaName[a + '-' + b] = seaName[b + '-' + a] = l; });

function bfs(from) {
  const d = new Array(N).fill(-1); d[from] = 0; const q = [from];
  while (q.length) { const v = q.shift(); adj[v].forEach(w => { if (d[w] < 0) { d[w] = d[v] + 1; q.push(w); } }); }
  return d;
}
function shortestPath(a, b) {
  const d = bfs(b), path = [a]; let v = a;
  while (v !== b) { v = [...adj[v]].find(w => d[w] === d[v] - 1); path.push(v); }
  return path;
}

// たびの ステージ（けんコード）
const STAGES = [[14, 13], [14, 11], [13, 20], [14, 23], [13, 15], [2, 4], [27, 25], [40, 46], [37, 39], [23, 17], [14, 7],
  [33, 38], [35, 42], [30, 18], [31, 39], [13, 26], [15, 27], [14, 27], [1, 13], [2, 35], [47, 1]].map(s => [s[0] - 1, s[1] - 1]);

// ---- ほぞん ----
const KEY = 'tonari-ken-v1';
const S = { sound: true, mode: 'easy', stars: {}, crown: {}, seen: [], quiz: 0 };
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

// ---- おと ----
let ac = null;
function tone(f, d, type, v, when) {
  if (!S.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + (when || 0);
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(v || .14, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + d);
    o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + d);
  } catch (e) {}
}
const sfx = {
  move() { tone(150, .09, 'square', .1); tone(110, .09, 'square', .1, .12); tone(150, .09, 'square', .1, .3); tone(110, .09, 'square', .1, .42); },
  ok() { tone(660, .12); tone(880, .2, 'sine', .14, .1); },
  ng() { tone(180, .25, 'sawtooth', .08); },
  tap() { tone(520, .06); },
  clear() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .25, 'triangle', .15, i * .13)); },
};
function say(text) {
  if (!S.sound || !('speechSynthesis' in window)) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ja-JP'; u.rate = .95; speechSynthesis.speak(u); } catch (e) {}
}

// ---- ちず ----
const NS = 'http://www.w3.org/2000/svg';
const svg = $('#map'), gPref = $('#gPref'), gLbl = $('#gLbl'), gMk = $('#gMk'), gLink = $('#gLink');
const train = $('#train'), flag = $('#flag'), rail = $('#rail');
const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
const W = MAP_VIEWBOX.split(' ').map(Number), WHOLE = { x: W[0], y: W[1], w: W[2], h: W[3] };
const paths = [], box = [];

P.forEach((p, i) => {
  paths.push(el('path', { d: p.path, class: 'pref', 'data-i': i }, gPref));
  // いちばん おおきい しま だけで わくを はかる（はなれじまで ズームが ひろがらないように）
  let best = null;
  p.path.split('M').forEach(sub => {
    const n = sub.match(/-?[\d.]+/g); if (!n) return;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let k = 0; k + 1 < n.length; k += 2) { const x = +n[k], y = +n[k + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const a = (x1 - x0) * (y1 - y0);
    if (!best || a > best.a) best = { a, x0, y0, x1, y1 };
  });
  box.push(best);
});
const fr = $('#okiFrame'); fr.setAttribute('x', OKI_FRAME.x); fr.setAttribute('y', OKI_FRAME.y); fr.setAttribute('width', OKI_FRAME.w); fr.setAttribute('height', OKI_FRAME.h);

function ov(g, x, y) { g._x = x; g._y = y; return g; }
ov(train, 0, 0); ov(flag, 0, 0);
train.firstElementChild.setAttribute('y', -20); flag.firstElementChild.setAttribute('y', -20);

// はし・トンネル・ふね の しるし
const markers = [];
let ferry = null;
function addMarker(link, x, y, toName) {
  const g = ov(el('g', { class: 'mk ov' + (toName ? ' to' : ''), 'data-mk': markers.length }, gMk), x, y);
  el('circle', { r: 13 }, g);
  el('text', {}, g).textContent = link[2];
  if (toName) el('text', { class: 't', y: 24 }, g).textContent = toName + 'へ';
  markers.push(link);
}
SEA_LINKS.forEach(l => {
  if (l[4]) {
    const a = project(l[4][0], l[4][1]), b = project(l[5][0], l[5][1]);
    el('line', { class: 'link', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, gLink);
    addMarker(l, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  } else {
    const k = box[45];
    ferry = [k.x0 + (k.x1 - k.x0) * .2, Math.min(k.y1 + 26, WHOLE.y + WHOLE.h - 34)];
    addMarker(l, ferry[0], ferry[1], 'おきなわ');
    addMarker(l, OKI_FRAME.x + OKI_FRAME.w * .72, OKI_FRAME.y + OKI_FRAME.h * .42, 'かごしま');
  }
});

// ミニちず
const mini = $('#miniSvg');
mini.setAttribute('viewBox', MAP_VIEWBOX);
el('path', { d: P.map(p => p.path).join('') }, mini);
const miniGoal = el('circle', { r: 46, fill: '#e8483f', stroke: '#fff', 'stroke-width': 12 }, mini);
const miniCur = el('circle', { r: 46, fill: '#2b7fd9', stroke: '#fff', 'stroke-width': 12 }, mini);
function setMini(cur, goal) {
  [[miniCur, cur], [miniGoal, goal]].forEach(([c, i]) => {
    if (i == null) { c.style.display = 'none'; return; }
    c.style.display = ''; c.setAttribute('cx', P[i].lx); c.setAttribute('cy', P[i].ly);
  });
}

let vb = Object.assign({}, WHOLE), viewMode = 'near', vbTween = 0;
function scaleOv() {
  const r = svg.getBoundingClientRect(); if (!r.width) return;
  const u = Math.max(vb.w / r.width, vb.h / r.height);
  svg.querySelectorAll('.ov').forEach(g => g.setAttribute('transform', `translate(${g._x},${g._y}) scale(${u})`));
}
function applyVB() { svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); scaleOv(); }
function tween(ms, fn, done) {
  const t0 = performance.now(); let dead = false;
  const step = t => { if (dead) return; let k = Math.min(1, (t - t0) / ms); fn(k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2); if (k < 1) requestAnimationFrame(step); else if (done) done(); };
  requestAnimationFrame(step);
  return () => { dead = true; };
}
function setView(t, anim) {
  if (vbTween) vbTween();
  if (!anim) { vb = Object.assign({}, t); applyVB(); return; }
  const s = Object.assign({}, vb);
  vbTween = tween(550, k => { for (const p of 'xywh') vb[p] = s[p] + (t[p] - s[p]) * k; applyVB(); });
}
function fitOf(list) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  list.forEach(i => { const b = box[i]; x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1); });
  if (list.includes(45) && !list.includes(46)) y1 = Math.max(y1, ferry[1] + 30);
  let w = x1 - x0, h = y1 - y0; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  w = Math.max(w * 1.3, 170); h = Math.max(h * 1.3, 170);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
// ちかくを みる とき: じぶんと となり（おきなわは とおいので ぜんたい）
function nearOf(list) {
  const s = new Set();
  list.forEach(i => { s.add(i); adj[i].forEach(j => { if (i !== 46 && j !== 46) s.add(j); }); });
  return s.has(46) ? WHOLE : fitOf([...s]);
}
let focusList = null;
function refreshView(anim) {
  setView(viewMode === 'whole' || !focusList ? WHOLE : nearOf(focusList), anim !== false);
  $('#miniLab').textContent = viewMode === 'whole' ? '🔍 ちかく' : '🗾 ぜんたい';
}
$('#mini').addEventListener('click', () => { sfx.tap(); viewMode = viewMode === 'whole' ? 'near' : 'whole'; refreshView(); });
window.addEventListener('resize', scaleOv);

function clearMap() {
  paths.forEach(p => p.setAttribute('class', 'pref'));
  gLbl.textContent = ''; rail.setAttribute('d', '');
  train.style.display = flag.style.display = 'none';
}
const mark = (i, c) => paths[i].classList.add(c);
const railD = t => t.map((i, n) => (n && !(t[n - 1] + i === 91 && Math.abs(t[n - 1] - i) === 1) ? 'L' : 'M') + P[i].lx + ',' + P[i].ly).join('');
function label(i) {
  const g = ov(el('g', { class: 'ov' }, gLbl), P[i].lx, P[i].ly);
  el('text', { class: 'lbl' }, g).textContent = short[i];
}
function labels(list) { gLbl.textContent = ''; [...new Set(list)].forEach(label); scaleOv(); }

let toastT = 0;
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 2200); }
const panel = $('#panel');
const chip = (i, c) => `<span class="chip ${c || ''}">${short[i]}</span>`;
const ruby = i => `<ruby>${P[i].name}<rt>${P[i].kana}</rt></ruby>`;

// ---- がめん ----
let screen = 'home', mode = null;
function show(name) {
  screen = name;
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === name));
  $('#btnHome').style.visibility = name === 'home' ? 'hidden' : 'visible';
  $('#title').textContent = name === 'home' ? 'となりの けん たんけん' : name === 'stages' ? '🚃 となりへ たび' :
    mode === 'journey' ? '🚃 となりへ たび' : mode === 'quiz' ? '❓ となり クイズ' : '📖 となり ずかん';
  if (name === 'home') renderHome();
  if (name === 'stages') renderStages();
  if (name === 'play') requestAnimationFrame(scaleOv);
}
function renderHome() {
  const st = Object.values(S.stars).reduce((a, b) => a + b, 0);
  $('#homeStat').textContent = `⭐ ${st}こ　🚃 とおった けん ${S.seen.length}/47` + (S.quiz ? `　❓ ${S.quiz}てん` : '');
}
$('#btnHome').addEventListener('click', () => {
  sfx.tap(); try { speechSynthesis.cancel(); } catch (e) {}
  if (screen === 'play' && mode === 'journey') { mode = null; show('stages'); } else { mode = null; show('home'); }
});
const soundBtn = $('#btnSound');
const drawSound = () => { soundBtn.textContent = S.sound ? '🔊' : '🔇'; };
soundBtn.addEventListener('click', () => { S.sound = !S.sound; save(); drawSound(); if (S.sound) sfx.ok(); else try { speechSynthesis.cancel(); } catch (e) {} });
drawSound();
$('#home').addEventListener('click', e => {
  const b = e.target.closest('[data-go]'); if (!b) return; sfx.tap();
  if (b.dataset.go === 'stages') show('stages'); else if (b.dataset.go === 'quiz') startQuiz(); else startZukan();
});

// ---- ステージ えらび ----
function renderStages() {
  document.querySelectorAll('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === S.mode));
  $('#stageGrid').innerHTML = STAGES.map((s, k) => {
    const st = S.stars[k] || 0;
    return `<button class="stage" data-k="${k}"><span class="n">${k + 1}ばん ${S.crown[k] ? '👑' : ''}</span><br>${short[s[0]]}<br>⬇<br>${short[s[1]]}<br><span class="st">${'⭐'.repeat(st)}${'☆'.repeat(3 - st)}</span></button>`;
  }).join('') + '<button class="stage rand" data-k="-1">🎲<br>おまかせ<br>たび</button>';
}
$('#modeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.mode = b.dataset.mode; save(); sfx.tap(); renderStages(); });
$('#stageGrid').addEventListener('click', e => { const b = e.target.closest('.stage'); if (!b) return; sfx.tap(); startStage(+b.dataset.k); });
function startStage(k) {
  if (k >= 0 && k < STAGES.length) return startJourney(k, STAGES[k][0], STAGES[k][1]);
  let a, b, d;
  do { a = rnd(N); b = rnd(N); d = bfs(a)[b]; } while (d < 3 || d > 9);
  startJourney(-1, a, b);
}

// ---- たび ----
let J = null;
function startJourney(k, a, b) {
  mode = 'journey';
  J = { k, a, b, trail: [a], miss: 0, missHere: 0, hint: false, hintAt: -1, flash: false, done: false, busy: false, best: bfs(b)[a], dist: bfs(b) };
  viewMode = 'near'; show('play');
  ov(train, P[a].lx, P[a].ly);
  drawJourney(false);
  say(`${P[a].kana}から、${P[b].kana}へ、しゅっぱつ！`);
}
const jCur = () => J.trail[J.trail.length - 1];
function drawJourney(anim) {
  const cur = jCur(), easy = S.mode === 'easy';
  clearMap();
  J.trail.forEach(i => mark(i, 'trail'));
  const lit = (easy || J.flash) && !J.done;
  if (lit) adj[cur].forEach(i => mark(i, 'nb'));
  mark(J.b, 'goal'); mark(cur, 'cur');
  if (J.hintAt >= 0) mark(J.hintAt, 'hint');
  labels([...J.trail, J.b, ...(lit ? adj[cur] : [])]);
  rail.setAttribute('d', railD(J.trail));
  train.style.display = ''; flag.style.display = J.done ? 'none' : '';
  ov(flag, P[J.b].lx, P[J.b].ly);
  setMini(cur, J.b);
  focusList = [cur];
  refreshView(anim);
  if (!J.done) panel.innerHTML =
    `<div class="route"><span class="chip c">🚃 いま：${short[cur]}</span>➡<span class="chip g">🚩 ゴール：${short[J.b]}</span></div>
     <p class="msg">となりの けんを タッチして すすもう！　いま <b>${J.trail.length - 1}</b>かい すすんだよ</p>
     <div class="row"><button class="btn" data-a="undo" ${J.trail.length < 2 ? 'disabled' : ''}>↩ もどる</button>
     <button class="btn" data-a="hint">💡 ヒント</button><button class="btn" data-a="retry">🔄 さいしょから</button></div>`;
}
function jTap(i) {
  if (!J || J.done || J.busy) return;
  const cur = jCur();
  if (i === cur) return;
  if (!adj[cur].has(i)) {
    J.miss++; J.missHere++; sfx.ng();
    toast(`${short[i]}は ${short[cur]}の となりじゃ ないよ`);
    mark(i, 'wrong'); setTimeout(() => paths[i].classList.remove('wrong'), 700);
    if (S.mode === 'hard' && J.missHere >= 2) { J.flash = true; drawJourney(); toast('となりを ひからせたよ。よく みてね'); }
    return;
  }
  J.busy = true; J.missHere = 0; J.flash = false; J.hintAt = -1;
  const from = cur, sea = seaName[from + '-' + i];
  J.trail.push(i);
  if (!S.seen.includes(i)) S.seen.push(i);
  if (!S.seen.includes(J.a)) S.seen.push(J.a);
  sfx.move();
  if (sea) toast(`${sea[2]} ${sea[3]}${sea[2] === '⛴' ? 'で' : 'を'} うみを わたったよ！`);
  tween(650, k => { ov(train, P[from].lx + (P[i].lx - P[from].lx) * k, P[from].ly + (P[i].ly - P[from].ly) * k); scaleOv(); },
    () => { J.busy = false; if (i === J.b) jClear(); else say(P[i].kana); });
  drawJourney();
}
function jClear() {
  J.done = true;
  const steps = J.trail.length - 1;
  let st = steps <= J.best ? 3 : steps <= J.best + 2 ? 2 : 1;
  if (J.hint && st > 2) st = 2;
  const crown = S.mode === 'hard' && J.miss === 0 && st === 3;
  if (J.k >= 0) { S.stars[J.k] = Math.max(S.stars[J.k] || 0, st); if (crown) S.crown[J.k] = 1; }
  save(); sfx.clear();
  say(`${P[J.b].kana}に、とうちゃく！`);
  drawJourney();
  viewMode = 'whole'; focusList = J.trail; setView(fitOf(J.trail), true); $('#miniLab').textContent = '🔍 ちかく';
  const note = steps <= J.best ? (J.hint ? 'いちばん ちかい みち！（ヒントを つかったので ⭐2つ）' : '<b>いちばん ちかい みち</b>で ついたよ！ すごい！')
    : `いちばん ちかい みちは <b>${J.best}</b>かい。もっと ちかみちが あるよ`;
  panel.innerHTML =
    `<div class="stars">${'⭐'.repeat(st)}${'☆'.repeat(3 - st)}${crown ? ' 👑' : ''}</div>
     <p class="msg"><b>${short[J.b]}</b>に とうちゃく！　${steps}かいで ついたよ<br>${note}${crown ? '<br>👑 むずかしいで まちがい なし！' : ''}</p>
     <div class="trail">${J.trail.map(i => chip(i, i === J.b ? 'g' : '')).join(' → ')}</div>
     <div class="row">${steps > J.best ? '<button class="btn" data-a="best">👀 ちかみちを みる</button>' : ''}
     <button class="btn" data-a="retry">🔄 もういちど</button><button class="btn main" data-a="next">つぎの たび ▶</button></div>`;
}
function showBest() {
  const path = shortestPath(J.a, J.b);
  clearMap(); mark(J.b, 'goal'); train.style.display = '';
  setView(fitOf(path), true); setMini(J.a, J.b);
  let n = 0;
  const step = () => {
    if (mode !== 'journey' || !J.done) return;
    const i = path[n]; mark(i, 'right'); label(i); ov(train, P[i].lx, P[i].ly); scaleOv();
    rail.setAttribute('d', railD(path.slice(0, n + 1)));
    tone(440 + n * 60, .12); n++;
    if (n < path.length) setTimeout(step, 600);
  };
  step();
  toast(`ちかみち：${path.map(i => short[i]).join(' → ')}`);
}

// ---- クイズ ----
let Q = null;
const QTYPES = ['nb', 'count', 'nb', 'not', 'umi', 'common', 'nb', 'not', 'common', 'count'];
function startQuiz() { mode = 'quiz'; Q = { n: 0, ok: 0 }; viewMode = 'near'; show('play'); nextQ(); }
function nearWrong(s, bad, max) {   // s の ちかくで、bad に はいって いない けん
  const d = bfs(s);
  let c = P.map((_, i) => i).filter(i => !bad.has(i) && d[i] >= 2 && d[i] <= max);
  if (c.length < 3) c = P.map((_, i) => i).filter(i => !bad.has(i));
  return shuffle(c);
}
function nextQ() {
  const type = QTYPES[Q.n], q = { type, done: false }; let s;
  if (type === 'nb') {
    do s = rnd(N); while (!land[s].size);
    q.s = [s]; q.ans = pick([...land[s]]);
    q.ch = shuffle([q.ans, ...nearWrong(s, new Set([s, ...adj[s]]), 3).slice(0, 3)]);
    q.text = `<span class="chip c">${short[s]}</span> と くっついて いる<br>となりの けんは どれ？`;
    q.say = `${P[s].kana}の、となりは どれ？`;
  } else if (type === 'not') {
    do s = rnd(N); while (land[s].size < 3);
    q.s = [s]; q.ans = nearWrong(s, new Set([s, ...adj[s]]), 2)[0];
    q.ch = shuffle([q.ans, ...shuffle([...land[s]]).slice(0, 3)]);
    q.text = `<span class="chip c">${short[s]}</span> の となり<b>じゃ ない</b>のは どれ？`;
    q.say = `${P[s].kana}の、となりじゃ ないのは どれ？`;
  } else if (type === 'common') {
    let a, b, c;
    do { c = rnd(N); } while (land[c].size < 2);
    [a, b] = shuffle([...land[c]]);
    const both = new Set([...land[a]].filter(i => land[b].has(i)));
    q.s = [a, b]; q.ans = c;
    q.ch = shuffle([c, ...nearWrong(a, new Set([a, b, ...both]), 2).slice(0, 3)]);
    q.text = `<span class="chip c">${short[a]}</span> と <span class="chip c">${short[b]}</span><br>りょうほうの となりに あるのは？`;
    q.say = `${P[a].kana}と、${P[b].kana}、りょうほうの となりは どれ？`;
  } else if (type === 'umi') {
    q.ans = pick(INLAND); q.s = [];
    q.ch = shuffle([q.ans, ...nearWrong(q.ans, new Set([q.ans, ...INLAND]), 3).slice(0, 3)]);
    q.text = '🌊 <b>うみに くっついて いない</b> けんは どれ？';
    q.say = 'うみに、くっついて いない けんは どれ？';
  } else {
    do s = rnd(N); while (!land[s].size);
    const n = land[s].size, set = new Set([n]);
    [n + 1, n - 1, n + 2, n - 2, n + 3].forEach(v => { if (v > 0 && set.size < 4) set.add(v); });
    q.s = [s]; q.ans = n; q.ch = [...set].sort((x, y) => x - y); q.num = true;
    q.text = `<span class="chip c">${short[s]}</span> と くっついて いる<br>となりの けんは いくつ？`;
    q.say = `${P[s].kana}の、となりは いくつ？`;
  }
  Q.q = q; drawQ(false);
  say(q.say);
}
function drawQ() {
  const q = Q.q; clearMap();
  q.s.forEach(i => mark(i, 'cur'));
  if (q.type === 'umi') {
    focusList = null; setMini(null, null);
    setView(fitOf(q.ch.concat(...q.ch.map(i => [...land[i]]))), true); labels(q.ch);
    if (q.done) { INLAND.forEach(i => mark(i, 'umi')); mark(q.ans, 'right'); }
  } else {
    focusList = q.s; setMini(q.s[0], null); viewMode = 'near'; refreshView();
    const show = [...q.s];
    if (q.done) {
      if (q.type === 'common') { mark(q.ans, 'right'); show.push(q.ans); }
      else q.s.forEach(s => land[s].forEach(i => { mark(i, 'nb'); show.push(i); }));
      if (q.type === 'not') { mark(q.ans, 'wrong'); show.push(q.ans); }
    }
    labels(show);
  }
  panel.innerHTML = `<div class="prog">${Q.n + 1}もんめ / 10もん　⭕ ${Q.ok}</div><p class="q">${q.text}</p>
    <div class="choices">${q.ch.map(c => `<button class="btn ${q.done ? (c === q.ans ? 'ok' : c === q.picked ? 'ng' : '') : ''}" data-c="${c}" ${q.done ? 'disabled' : ''}>${q.num ? c + 'つ' : short[c]}</button>`).join('')}</div>
    ${q.done ? `<p class="msg">${q.msg}</p><div class="row"><button class="btn main" data-a="qnext">${Q.n < 9 ? 'つぎへ ▶' : 'けっかを みる ▶'}</button></div>` : ''}`;
  panel.scrollTop = 0;
}
function answer(c) {
  const q = Q.q; if (q.done) return;
  q.done = true; q.picked = c;
  const ok = c === q.ans; if (ok) { Q.ok++; sfx.ok(); } else sfx.ng();
  const a = q.num ? q.ans + 'つ' : short[q.ans];
  const why = q.type === 'umi' ? `うみが ない けんは ぜんぶで 8つ（むらさき）` :
    q.type === 'not' ? `${a}は くっついて いないね` : q.type === 'count' ? `きいろい けんを かぞえて みよう` : `ちずで たしかめよう`;
  q.msg = (ok ? '⭕ <b>せいかい！</b>　' : `❌ こたえは <b>${a}</b>　`) + why;
  say(ok ? 'せいかい！' : `こたえは、${q.num ? q.ans + 'つ' : P[q.ans].kana}`);
  drawQ();
}
function quizEnd() {
  const st = Q.ok >= 9 ? 3 : Q.ok >= 6 ? 2 : 1;
  S.quiz = Math.max(S.quiz || 0, Q.ok * 10); save(); sfx.clear();
  clearMap(); focusList = null; setMini(null, null); setView(WHOLE, true);
  say(`10もんちゅう、${Q.ok}もん せいかい！`);
  panel.innerHTML = `<div class="stars">${'⭐'.repeat(st)}${'☆'.repeat(3 - st)}</div>
    <p class="msg">10もんちゅう <b>${Q.ok}</b>もん せいかい！<br>${Q.ok >= 9 ? 'となり はかせ だね！' : Q.ok >= 6 ? 'いい ちょうし！' : 'ずかんで となりを みて みよう'}</p>
    <div class="row"><button class="btn" data-a="zukan">📖 ずかん</button><button class="btn main" data-a="quiz">🔄 もういちど</button></div>`;
}

// ---- ずかん ----
let Z = null;
const NOTE = { 19: 'にっぽんで いちばん となりが おおい！', 41: 'となりが 1つだけ なのは にっぽんで ここだけ！',
  0: 'りくの となりは なし。トンネルで あおもりへ', 46: 'まわりは ぜんぶ うみ。ふねか ひこうきで いくよ', 10: 'となりが 7つも ある', 20: 'となりが 7つも ある' };
function startZukan() { mode = 'zukan'; Z = { sel: null }; viewMode = 'whole'; show('play'); drawZukan(false); }
function drawZukan(anim) {
  const s = Z.sel; clearMap();
  if (s == null) {
    focusList = null; setMini(null, null); S.seen.forEach(i => mark(i, 'trail')); refreshView(anim);
    panel.innerHTML = `<p class="q">けんを タッチ してね</p><p class="msg">となりの けんが きいろく ひかるよ<br>🚃 たびで とおった けん（みどり）：<b>${S.seen.length}</b> / 47</p>
      <div class="row"><button class="btn" data-a="umi">🌊 うみが ない けん</button><button class="btn" data-a="many">🏆 となりが おおい けん</button></div>`;
    return;
  }
  const seas = [...adj[s]].filter(i => !land[s].has(i));
  land[s].forEach(i => mark(i, 'nb')); seas.forEach(i => mark(i, 'umi')); mark(s, 'cur');
  labels([s, ...adj[s]]);
  focusList = [s]; setMini(s, null); refreshView(anim);
  panel.innerHTML = `<p class="pname">${ruby(s)} ${S.seen.includes(s) ? '🚃' : ''}</p>
    <p class="msg">${land[s].size ? `くっついて いる となりは <b>${land[s].size}</b>つ` : 'くっついて いる となりは <b>ない</b>よ'}${NOTE[s] ? `<br>✨ ${NOTE[s]}` : ''}${INLAND.includes(s) ? '<br>⛰️ うみが ない けん' : ''}</p>
    <div class="trail">${[...land[s]].map(i => chip(i, 'y')).join(' ')}</div>
    ${seas.length ? `<p class="msg">うみを わたって いける となり</p><div class="trail">${seas.map(i => `<span class="chip p">${seaName[s + '-' + i][2]} ${short[i]}（${seaName[s + '-' + i][3]}）</span>`).join(' ')}</div>` : ''}
    <div class="row"><button class="btn" data-a="zall">🗾 ぜんたいに もどる</button></div>`;
}
function zSpecial(kind) {
  clearMap(); focusList = null; setMini(null, null); viewMode = 'whole'; refreshView();
  if (kind === 'umi') {
    INLAND.forEach(i => mark(i, 'umi')); labels(INLAND);
    panel.innerHTML = `<p class="q">🌊 うみが ない けんは 8つ</p><div class="trail">${INLAND.map(i => chip(i, 'p')).join(' ')}</div>`;
    say('うみが ない けんは、やっつ');
  } else {
    const top = P.map((_, i) => i).filter(i => land[i].size >= 6).sort((a, b) => land[b].size - land[a].size);
    top.forEach(i => mark(i, 'nb')); labels(top);
    panel.innerHTML = `<p class="q">🏆 となりが おおい けん</p><div class="trail">${top.map(i => `<span class="chip y">${short[i]} ${land[i].size}つ</span>`).join(' ')}</div>`;
    say('いちばん となりが おおいのは、ながのけん。やっつ');
  }
  panel.innerHTML += '<div class="row"><button class="btn" data-a="zall">◀ もどる</button></div>';
}

// ---- タッチ ----
svg.addEventListener('click', e => {
  const m = e.target.closest('[data-mk]');
  if (m) {
    const l = markers[+m.dataset.mk], a = l[0] - 1, b = l[1] - 1;
    if (mode === 'journey' && J && !J.done) { const c = jCur(); if (c === a) return jTap(b); if (c === b) return jTap(a); }
    toast(`${l[2]} ${l[3]}：${short[a]} ⇄ ${short[b]}`); sfx.tap(); return;
  }
  const p = e.target.closest('[data-i]'); if (!p) return;
  const i = +p.dataset.i;
  if (mode === 'journey') jTap(i);
  else if (mode === 'zukan') { sfx.tap(); Z.sel = i; viewMode = 'near'; drawZukan(); say(P[i].kana); }
});
panel.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.c != null) return answer(+b.dataset.c);
  const a = b.dataset.a; sfx.tap();
  if (a === 'undo') { if (J.trail.length > 1 && !J.busy) { J.trail.pop(); J.hintAt = -1; J.flash = false; const c = jCur(); ov(train, P[c].lx, P[c].ly); drawJourney(); } }
  else if (a === 'hint') { const c = jCur(); J.hint = true; J.hintAt = [...adj[c]].find(i => J.dist[i] === J.dist[c] - 1); viewMode = 'near'; drawJourney(); toast('ひかって いる けんへ すすんで みよう'); }
  else if (a === 'retry') startJourney(J.k, J.a, J.b);
  else if (a === 'next') startStage(J.k >= 0 ? J.k + 1 : -1);
  else if (a === 'best') showBest();
  else if (a === 'qnext') { Q.n++; if (Q.n >= 10) quizEnd(); else nextQ(); }
  else if (a === 'quiz') startQuiz();
  else if (a === 'zukan') startZukan();
  else if (a === 'zall') { Z = Z || { sel: null }; Z.sel = null; viewMode = 'whole'; drawZukan(); }
  else if (a === 'umi' || a === 'many') zSpecial(a);
});

applyVB(); show('home');
window.__tonari = { land, adj, bfs, STAGES, short, S };
})();
