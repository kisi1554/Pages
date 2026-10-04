"use strict";

/* かんじカード 1ねんせい - アプリの しくみ */

const WORDS = KanjiLib.build(KANJI);
const WORD_BY_ID = new Map(WORDS.map(w => [w.id, w]));
const KANJI_BY_CHAR = new Map(KANJI.map(k => [k.k, k]));

const LINE_COLORS = {
  kazu: '#e5171f', youbi: '#f39700', shizen: '#00a650', hito: '#e85298', basho: '#0079c2',
  yousu: '#9b7cb6', ikimono: '#8fc31f', machi: '#00a7db', ugoki: '#b5562c'
};
const KIND_NAME = { o: 'おんよみ', k: 'くんよみ', t: 'とくべつな よみ', e: 'えきめい' };
const INTERVAL = [0, 1, 2, 4, 7, 14, 30];   // はこ（b）ごとの つぎの ふくしゅうまでの 日すう
const MASTER = 3;                          // b が これ いじょうで 「しっかり おぼえた」

/* ---------------- ほぞん ---------------- */
const KEY = 'kanjiCard1.v1';
const DEFAULT = () => ({
  sound: true, voice: true, goal: 10,
  w: {}, xp: 0, days: {}, streak: 0, best: 0, lastGoal: '',
  stamps: [], badges: [], started: [], sessions: 0, maxCombo: 0, perfect: 0
});
let S = DEFAULT();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) S = Object.assign(DEFAULT(), JSON.parse(raw));
} catch (e) { /* よめなくても あそべる */ }
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ほぞん できなくても つづける */ }
}

/* ---------------- 日づけ ---------------- */
function dayKey(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function dayNum(d = new Date()) { return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
function keyOfNum(n) { const d = new Date(n * 864e5); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
const today = () => dayNum();
function streakNow() {
  if (S.lastGoal === dayKey() || S.lastGoal === keyOfNum(today() - 1)) return S.streak;
  return 0;
}

/* ---------------- べんり ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ふりがなつきの HTML。opt.hide=かくす segの番号 / opt.hl=めだたせる漢字 / opt.noRuby */
function rubyHTML(segs, opt = {}) {
  return segs.map((s, i) => {
    if (s.r == null) return esc(s.t);
    const hl = opt.hl && s.t.includes(opt.hl);
    const body = hl ? `<span class="hl">${esc(s.t)}</span>` : esc(s.t);
    if (opt.noRuby) return body;
    const rt = i === opt.hide ? '<span class="q">？</span>' : esc(s.r);
    return `<ruby>${body}<rt>${rt}</rt></ruby>`;
  }).join('');
}
const textHTML = src => src ? rubyHTML(KanjiLib.parse(src)) : '';
/* よみがなで、その漢字の ぶぶんに いろを つける */
function yomiHTML(w) {
  return w.segs.map((s, i) => {
    const r = esc(s.r != null ? s.r : s.t);
    return i === w.focus ? `<b class="hl">${r}</b>` : r;
  }).join('');
}
const kindOf = w => w.eki ? 'e' : w.kind;

/* ---------------- おと（WebAudio の 合成音だけ） ---------------- */
let actx = null;
function ac() {
  if (!S.sound) return null;
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  } catch (e) { return null; }
}
function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.05);
}
const SFX = {
  tap() { tone(660, 0, 0.08, 'triangle', 0.12); },
  flip() { tone(520, 0, 0.09, 'triangle', 0.12); tone(780, 0.07, 0.12, 'triangle', 0.12); },
  ok(combo = 0) {                                        // コンボで だんだん たかく
    const b = 660 * Math.pow(1.06, Math.min(combo, 12));
    tone(b, 0, 0.12, 'square', 0.09); tone(b * 1.26, 0.09, 0.22, 'square', 0.09);
  },
  ng() { tone(220, 0, 0.18, 'sawtooth', 0.08); tone(180, 0.12, 0.25, 'sawtooth', 0.07); },
  horn() { tone(392, 0, 0.35, 'square', 0.07); tone(494, 0, 0.35, 'square', 0.05); },   // ファーン
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'square', 0.08)); tone(1047, 0.5, 0.6, 'triangle', 0.12); },
  stamp() { tone(140, 0, 0.12, 'sine', 0.3); tone(1200, 0.12, 0.2, 'triangle', 0.08); tone(1600, 0.2, 0.25, 'triangle', 0.08); },
  level() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.25, 'triangle', 0.12)); }
};
function speak(text) {
  if (!S.sound || !S.voice || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch (e) { /* よみあげ できなくても よい */ }
}

/* ---------------- レベル ---------------- */
const TITLES = ['みならい', 'えきいん', 'しゃしょう', 'うんてんし', 'かいそくの うんてんし', 'とっきゅうの うんてんし',
  'しんかんせんの うんてんし', 'えきちょう', 'しれいいん', 'てつどう はかせ', 'かんじ そうさい'];
function levelInfo(xp = S.xp) {
  let lv = 1, need = 60, rest = xp;
  while (rest >= need) { rest -= need; lv++; need = 60 + (lv - 1) * 30; }
  return { lv, rest, need, title: TITLES[Math.min(TITLES.length - 1, Math.floor((lv - 1) / 2))] };
}

/* ---------------- しんちょく ---------------- */
const st = w => S.w[w.id];
const learned = w => { const x = st(w); return !!x && x.b >= 1; };
const mastered = w => { const x = st(w); return !!x && x.b >= MASTER; };
function kanjiStars(k) {
  const n = k.words.length, l = k.words.filter(learned).length;
  if (k.words.every(mastered)) return 3;
  if (l >= Math.ceil(n / 2)) return 2;
  if (l > 0) return 1;
  return 0;
}
function counts() {
  const l = WORDS.filter(learned).length, m = WORDS.filter(mastered).length;
  const stars = KANJI.map(kanjiStars);
  return {
    learned: l, mastered: m,
    started: stars.filter(s => s > 0).length,
    half: stars.filter(s => s >= 2).length,
    master: stars.filter(s => s >= 3).length,
    eki: WORDS.filter(w => w.eki && learned(w)).length,
    yomiMax: Math.max(0, ...KANJI.map(k => new Set(k.words.filter(learned).map(w => w.segs[w.focus].r)).size))
  };
}
function addToday(n = 1) { const k = dayKey(); S.days[k] = (S.days[k] || 0) + n; }
const todayCount = () => S.days[dayKey()] || 0;

/* ---------------- スタンプ と くんしょう ---------------- */
const STAMPS = [
  ['🚄', 'しんかんせん'], ['🚃', 'でんしゃ'], ['🚂', 'SL'], ['🚇', 'ちかてつ'], ['🚝', 'モノレール'], ['🚋', 'ろめんでんしゃ'],
  ['🚞', 'やまの でんしゃ'], ['🚉', 'えき'], ['🛤️', 'せんろ'], ['🚦', 'しんごう'], ['🎫', 'きっぷ'], ['🍱', 'えきべん'],
  ['🗻', 'ふじさん'], ['🌸', 'さくら'], ['🍎', 'りんご'], ['🍑', 'もも'], ['🍇', 'ぶどう'], ['🍊', 'みかん'],
  ['🦀', 'かに'], ['🐟', 'さかな'], ['🦊', 'きつね'], ['🐻', 'くま'], ['🦌', 'しか'], ['🐒', 'さる'],
  ['🏯', 'おしろ'], ['⛩️', 'じんじゃ'], ['🗼', 'タワー'], ['🌉', 'はし'], ['🌊', 'うみ'], ['♨️', 'おんせん'],
  ['🎆', 'はなび'], ['🎋', 'たなばた'], ['🎏', 'こいのぼり'], ['⛄', 'ゆきだるま'], ['🌻', 'ひまわり'], ['🍁', 'もみじ'],
  ['🌈', 'にじ'], ['⭐', 'ほし'], ['🌙', 'おつきさま'], ['👑', 'おうかん']
];
const BADGES = [
  { id: 'first', e: '🚩', name: 'はじめての しゅっぱつ', how: 'カードを 1かい やりきる', ok: () => S.sessions >= 1 },
  { id: 'st3', e: '🔥', name: '3にち れんぞく', how: 'めあてを 3にち つづけて クリア', ok: () => S.best >= 3 },
  { id: 'st7', e: '🔥', name: '1しゅうかん れんぞく', how: 'めあてを 7にち つづけて クリア', ok: () => S.best >= 7 },
  { id: 'st14', e: '🔥', name: '2しゅうかん れんぞく', how: 'めあてを 14にち つづけて クリア', ok: () => S.best >= 14 },
  { id: 'st30', e: '🌟', name: '1かげつ れんぞく', how: 'めあてを 30にち つづけて クリア', ok: () => S.best >= 30 },
  { id: 'w30', e: '📗', name: 'ことば 30', how: 'ことばを 30こ おぼえる', ok: c => c.learned >= 30 },
  { id: 'w100', e: '📘', name: 'ことば 100', how: 'ことばを 100こ おぼえる', ok: c => c.learned >= 100 },
  { id: 'w300', e: '📙', name: 'ことば 300', how: 'ことばを 300こ おぼえる', ok: c => c.learned >= 300 },
  { id: 'w600', e: '📚', name: 'ことば 600', how: 'ことばを 600こ おぼえる', ok: c => c.learned >= 600 },
  { id: 'wall', e: '🏆', name: 'ことば ぜんぶ', how: 'ぜんぶの ことばを おぼえる', ok: c => c.learned >= WORDS.length },
  { id: 'k10', e: '🚉', name: 'えき 10こ かいぎょう', how: 'かんじを 10こ はじめる', ok: c => c.started >= 10 },
  { id: 'k40', e: '🚉', name: 'えき 40こ かいぎょう', how: 'かんじを 40こ はじめる', ok: c => c.started >= 40 },
  { id: 'k80', e: '🗾', name: 'ぜんせん かいつう', how: 'かんじを 80こ ぜんぶ はじめる', ok: c => c.started >= 80 },
  { id: 'm1', e: '🥇', name: 'はじめての マスター', how: 'かんじを 1こ マスター', ok: c => c.master >= 1 },
  { id: 'm10', e: '🥇', name: 'マスター 10', how: 'かんじを 10こ マスター', ok: c => c.master >= 10 },
  { id: 'm80', e: '👑', name: 'かんじ そうさい', how: '80こ ぜんぶ マスター', ok: c => c.master >= 80 },
  { id: 'yomi4', e: '🎭', name: 'よみの へんしん', how: '1つの かんじで 4つの よみを おぼえる', ok: c => c.yomiMax >= 4 },
  { id: 'yomi6', e: '🎩', name: 'よみの まじゅつし', how: '1つの かんじで 6つの よみを おぼえる', ok: c => c.yomiMax >= 6 },
  { id: 'eki10', e: '🚏', name: 'えきめい はかせ', how: 'えきめいを 10こ おぼえる', ok: c => c.eki >= 10 },
  { id: 'eki50', e: '🗺️', name: 'えきめい めいじん', how: 'えきめいを 50こ おぼえる', ok: c => c.eki >= 50 },
  { id: 'perfect', e: '💮', name: 'パーフェクト', how: '1かいも まちがえずに やりきる', ok: () => S.perfect >= 1 },
  { id: 'combo10', e: '⚡', name: 'しんかんせん コンボ', how: '10かい つづけて せいかい', ok: () => S.maxCombo >= 10 },
  { id: 'morning', e: '🌅', name: 'いちばん でんしゃ', how: 'あさ 7じまえに れんしゅう', ok: () => S.morning },
  { id: 'stamp10', e: '🎫', name: 'スタンプ 10こ', how: 'えきスタンプを 10こ あつめる', ok: () => S.stamps.length >= 10 },
  { id: 'stampAll', e: '🎖️', name: 'スタンプ コンプリート', how: 'えきスタンプを ぜんぶ あつめる', ok: () => S.stamps.length >= STAMPS.length }
];
function checkBadges() {
  const c = counts(), got = [];
  BADGES.forEach(b => {
    if (!S.badges.includes(b.id) && b.ok(c)) { S.badges.push(b.id); got.push(b); }
  });
  return got;
}

/* ---------------- がめん きりかえ ---------------- */
let current = 'home';
function show(id) {
  document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== id; });
  $('#bottomNav').hidden = id === 'home' || id === 'study';
  current = id;
  window.scrollTo(0, 0);
  if (id === 'home') renderHome();
  if (id === 'map') renderMap();
  if (id === 'stamps') renderStamps();
  if (id === 'badges') renderBadges();
  if (id === 'settings') renderSettings();
}
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) { SFX.tap(); show(go.dataset.go); }
});

/* ---------------- ホーム ---------------- */
const CHEERS = [
  'きょうも いっしょに しゅっぱつ しんこう！', 'おなじ かんじでも よみかたが いろいろ あるよ。',
  'えきめいにも かんじが いっぱい！', 'まちがえても だいじょうぶ。また でて くるから おぼえられるよ。',
  'まいにち すこしずつ が いちばんの ちかみち！', 'カードを めくって、ことばを あつめよう！'
];
function renderHome() {
  const s = streakNow(), L = levelInfo(), c = counts();
  $('#stStreak').innerHTML = `<b>🔥 ${s}</b><span>にち れんぞく</span>`;
  $('#stLevel').innerHTML = `<b>Lv.${L.lv}</b><span>${L.title}</span><i class="bar"><i style="width:${Math.round(L.rest / L.need * 100)}%"></i></i>`;
  $('#stStamp').innerHTML = `<b>🎫 ${S.stamps.length}</b><span>スタンプ</span>`;

  const n = todayCount(), goal = S.goal, done = S.lastGoal === dayKey();
  const pct = Math.min(1, n / goal);
  $('#goalRing').innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" class="ring-bg"/>
    <circle cx="50" cy="50" r="42" class="ring-fg" style="stroke-dasharray:${(pct * 264).toFixed(1)} 264"/></svg>
    <div class="ring-text"><span>${done ? '🎉' : `${Math.min(n, goal)}<small>/${goal}</small>`}</span></div>`;
  $('#goalSub').textContent = done ? 'クリア！ もっと やると けいけんちが たまるよ' : `カードを ${goal}まい やろう`;
  $('#startBtn').textContent = done ? 'もっと やる！' : (n > 0 ? 'つづきから しゅっぱつ！' : 'しゅっぱつ！');

  const hour = new Date().getHours();
  let msg = hour < 10 ? 'おはよう！ ' : hour >= 17 ? 'こんばんは！ ' : 'こんにちは！ ';
  if (done) msg += `きょうの めあて クリア！ ${s}にち れんぞくだよ。`;
  else if (s > 0) msg += `いま ${s}にち れんぞく！ きょうも つづけよう。`;
  else msg += pick(CHEERS);
  const due = WORDS.filter(w => st(w) && st(w).d <= today()).length;
  if (due && !done) msg += ` ふくしゅうの カードが ${due}まい まってるよ。`;
  $('#bubble').textContent = msg;

  // この 1しゅうかん
  const names = ['にち', 'げつ', 'か', 'すい', 'もく', 'きん', 'ど'];
  const t = today();
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const k = keyOfNum(t - i), d = new Date((t - i) * 864e5);
    const cnt = S.days[k] || 0;
    const clear = cnt >= S.goal || (S.goalDays && S.goalDays.includes(k));
    html += `<div class="day ${i === 0 ? 'now' : ''}"><span>${names[d.getUTCDay()]}</span>
      <i class="${clear ? 'clear' : cnt ? 'some' : ''}">${clear ? '🚃' : cnt ? '・' : ''}</i></div>`;
  }
  $('#week').innerHTML = html;
  $('#mapSub').textContent = `${c.started}/80 えき`;
  $('#stampSub').textContent = `${S.stamps.length}/${STAMPS.length}`;
  $('#badgeSub').textContent = `${S.badges.length}/${BADGES.length}`;
}
$('#startBtn').addEventListener('click', () => { SFX.horn(); startSession(buildDaily(), 'daily'); });

/* ---------------- カードの くみたて ---------------- */
function buildDaily() {
  const size = S.goal, t = today();
  const due = WORDS.filter(w => st(w) && st(w).d <= t)
    .sort((a, b) => st(a).b - st(b).b || st(a).d - st(b).d);
  const newSlots = Math.max(Math.min(3, size), size - due.length);
  const reviews = due.slice(0, size - Math.min(newSlots, countUnseen()));
  const fresh = pickNew(size - reviews.length);
  let list = reviews.concat(fresh);
  if (list.length < size) {                        // たりない ときは おぼえた ことばから
    const more = shuffle(WORDS.filter(w => st(w) && !list.includes(w))).slice(0, size - list.length);
    list = list.concat(more);
  }
  return shuffle(list);
}
const countUnseen = () => WORDS.filter(w => !st(w)).length;
/* あたらしい ことばは、はじめた かんじ（3こ くらい）から 1つずつ。おわったら つぎの かんじへ */
function pickNew(n) {
  const out = [], per = {};
  const active = () => S.started.map(i => KANJI[i]).filter(k => k.words.some(w => !st(w) && !out.includes(w)));
  let guard = 0;
  while (out.length < n && guard++ < 200) {
    let act = active();
    const capped = act.length && act.every(k => (per[k.k] || 0) >= 2);
    if (act.length < 3 || capped) {
      const next = KANJI.find(k => !S.started.includes(k.index));
      if (next) { S.started.push(next.index); act = active(); }
      else if (!act.length || capped) {
        if (!act.length) break;
        act.forEach(k => { per[k.k] = 0; });
      }
    }
    const k = act.filter(k => (per[k.k] || 0) < 2).sort((a, b) => (per[a.k] || 0) - (per[b.k] || 0) || a.index - b.index)[0];
    if (!k) break;
    const w = k.words.find(w => !st(w) && !out.includes(w) && !w.eki) || k.words.find(w => !st(w) && !out.includes(w));
    if (!w) break;
    out.push(w); per[k.k] = (per[k.k] || 0) + 1;
  }
  return out;
}
function buildForKanji(k) {
  if (!S.started.includes(k.index)) S.started.push(k.index);
  const unseen = k.words.filter(w => !st(w));
  const due = k.words.filter(w => st(w) && st(w).d <= today());
  const rest = shuffle(k.words.filter(w => st(w) && st(w).d > today()));
  return shuffle(unseen.slice(0, 6).concat(due, rest).slice(0, S.goal));
}

/* ---------------- まちがいの えらびかた ---------------- */
function readingPool(k) {
  const set = new Set();
  k.words.forEach(w => { const s = w.segs[w.focus]; if (s && !s.group) set.add(s.r); });
  const { on, kun } = KanjiLib.readingsOf(k);
  on.concat(kun).forEach(r => set.add(r));
  return [...set];
}
const yomiOfText = new Map();
WORDS.forEach(w => { if (!yomiOfText.has(w.text)) yomiOfText.set(w.text, new Set()); yomiOfText.get(w.text).add(w.yomi); });

function yomiChoices(w) {
  const k = KANJI_BY_CHAR.get(w.kanji);
  const bad = yomiOfText.get(w.text);
  const cand = new Set();
  const fseg = w.segs[w.focus];
  if (!fseg.group) {
    shuffle(readingPool(k)).forEach(r => {
      if (r === fseg.r) return;
      const y = w.segs.map((s, i) => i === w.focus ? r : (s.r != null ? s.r : s.t)).join('');
      if (!bad.has(y) && !y.endsWith('っ')) cand.add(y);
    });
  } else {                                           // (一日)[ついたち] → いちにち・ひとひ など
    for (let tries = 0; tries < 30 && cand.size < 6; tries++) {
      const y = w.segs.map((s, i) => {
        if (i !== w.focus) return s.r != null ? s.r : s.t;
        return [...s.t].map(c => { const kk = KANJI_BY_CHAR.get(c); return kk ? pick(readingPool(kk)) : c; }).join('');
      }).join('');
      if (!bad.has(y)) cand.add(y);
    }
  }
  let list = [...cand].slice(0, 3);
  if (list.length < 3) {
    shuffle(WORDS.filter(x => x.kanji === w.kanji && !bad.has(x.yomi))).forEach(x => { if (list.length < 3 && !list.includes(x.yomi)) list.push(x.yomi); });
  }
  return shuffle(list.concat(w.yomi)).map(y => ({ label: esc(y), ok: y === w.yomi }));
}
function kakiChoices(w) {
  const same = shuffle(WORDS.filter(x => x.kanji === w.kanji && !x.eki && x.text !== w.text && x.yomi !== w.yomi));
  let list = same.slice(0, 3);
  if (list.length < 3) {
    const others = shuffle(WORDS.filter(x => !x.eki && x.kanji !== w.kanji && x.text !== w.text && x.yomi !== w.yomi));
    list = list.concat(others.slice(0, 3 - list.length));
  }
  return shuffle(list.concat(w)).map(x => ({ label: rubyHTML(x.segs, { noRuby: true }), ok: x === w }));
}

/* ---------------- れんしゅう ---------------- */
let SES = null;
function startSession(list, mode, kanji) {
  if (!list.length) { toast('🎉', 'ぜんぶ おぼえたよ！ また あした ふくしゅうしよう'); return; }
  SES = {
    mode, kanji, queue: list.map(w => ({ w, type: cardType(w) })), i: 0,
    ok: 0, ng: 0, combo: 0, maxCombo: 0, xp: 0, newWords: 0, retried: new Set(),
    lvBefore: levelInfo().lv, mistakes: []
  };
  const h = new Date().getHours();
  if (h >= 4 && h < 7) S.morning = true;
  save();
  show('study');
  renderCard();
}
function cardType(w) {
  if (!st(w)) return 'learn';
  if (w.eki) return 'yomi';
  return Math.random() < 0.6 ? 'yomi' : 'kaki';
}
function renderTrack() {
  const n = SES.queue.length;
  let dots = '';
  for (let i = 0; i < n; i++) dots += `<i class="${i < SES.i ? 'done' : i === SES.i ? 'now' : ''}"></i>`;
  const pct = n > 1 ? SES.i / (n - 1) * 100 : 0;
  $('#track').innerHTML = `<div class="rail">${dots}</div>
    <div class="train" style="left:calc(${Math.min(100, pct)}% * .92)">${SES.combo >= 8 ? '🚅' : SES.combo >= 5 ? '🚄' : '🚃'}</div>
    <button class="quit" data-quit aria-label="やめる">✕</button>
    <div class="track-label">${SES.i + 1 > n ? n : SES.i + 1} / ${n}えきめ</div>`;
}
function comboLabel(c) {
  if (c >= 8) return '🚅 しんかんせん コンボ！';
  if (c >= 5) return '🚄 とっきゅう コンボ！';
  if (c >= 3) return '🚃 かいそく コンボ！';
  return '';
}
function renderCombo() {
  const el = $('#combo');
  const lab = comboLabel(SES.combo);
  el.innerHTML = lab ? `${lab} <b>${SES.combo}</b>` : '';
  el.classList.remove('pop'); void el.offsetWidth; if (lab) el.classList.add('pop');
}

function head(w, label) {
  const k = KANJI_BY_CHAR.get(w.kanji);
  return `<div class="card-head">
    <span class="kbadge" style="--c:${LINE_COLORS[k.g]}">${esc(w.kanji)}</span>
    <span class="ctype">${label}</span>
    ${w.eki ? '<span class="tag tag-e">🚉 えきめい</span>' : ''}
  </div>`;
}
function focusNote(w) {
  const f = w.segs[w.focus];
  return f.group
    ? `<span class="tag">「${esc(f.t)}」 ぜんぶで「${esc(f.r)}」</span>`
    : `<span class="tag">「${esc(w.kanji)}」を「${esc(f.r)}」と よむ</span>`;
}
function infoHTML(w) {
  const kd = kindOf(w);
  return `<div class="info">
    <div class="yomi">${yomiHTML(w)} <button class="say" data-say="${esc(w.yomi)}" aria-label="よみあげ">🔊</button></div>
    <div class="tags"><span class="tag tag-${kd}">${KIND_NAME[kd]}</span>${w.eki ? '' : focusNote(w)}</div>
    <div class="imi"><span class="em">${w.emoji}</span>${textHTML(w.imi)}</div>
    ${w.rei ? `<div class="rei">📝 ${textHTML(w.rei)}</div>` : ''}
  </div>`;
}

function renderCard() {
  if (SES.i >= SES.queue.length) return finishSession();
  renderTrack(); renderCombo();
  const { w, type } = SES.queue[SES.i];
  const box = $('#cardBox');
  if (type === 'learn') {
    box.innerHTML = `<div class="card learn" id="card">
      ${head(w, '🆕 あたらしい ことば')}
      <div class="flip" id="flip">
        <div class="face face-front">
          <div class="word">${rubyHTML(w.segs, { hide: w.focus, hl: w.kanji })}</div>
          <div class="hint">${w.emoji} <span>なんて よむかな？</span></div>
          <button class="big-btn" id="flipBtn">めくる 👆</button>
        </div>
      </div>
    </div>`;
    const flip = () => {
      SFX.flip();
      $('#flip').innerHTML = `<div class="face face-back">
        <div class="word">${rubyHTML(w.segs, { hl: w.kanji })}</div>
        ${infoHTML(w)}
        <div class="two">
          <button class="big-btn alt" id="againBtn">もう いっかい 🔁</button>
          <button class="big-btn" id="gotBtn">おぼえた！ ⭕</button>
        </div>
      </div>`;
      $('#flip').classList.add('turned');
      speak(w.yomi);
      $('#gotBtn').onclick = () => { learnDone(w, true); };
      $('#againBtn').onclick = () => { learnDone(w, false); };
    };
    $('#flipBtn').onclick = flip;
    $('.face-front .word').onclick = flip;
    return;
  }
  const yomi = type === 'yomi';
  const choices = yomi ? yomiChoices(w) : kakiChoices(w);
  box.innerHTML = `<div class="card quiz" id="card">
    ${head(w, yomi ? '❓ なんて よむ？' : '❓ どの ことば？')}
    ${yomi
      ? `<div class="word">${rubyHTML(w.segs, { hide: w.focus, hl: w.kanji })}</div>`
      : `<div class="ask"><div class="ask-yomi">「${esc(w.yomi)}」</div><div class="imi"><span class="em">${w.emoji}</span>${textHTML(w.imi)}</div></div>`}
    <div class="choices ${yomi ? 'yomi-c' : 'kaki-c'}">
      ${choices.map((c, i) => `<button class="choice" data-i="${i}">${c.label}</button>`).join('')}
    </div>
    <div id="after"></div>
  </div>`;
  box.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => answer(w, choices, +b.dataset.i)));
}

function grade(w, ok) {
  const x = S.w[w.id] || (S.w[w.id] = { b: 0, d: 0, n: 0, ok: 0, ng: 0 });
  x.n++;
  if (ok) { x.ok++; x.b = Math.min(INTERVAL.length - 1, x.b + 1); x.d = today() + INTERVAL[x.b]; }
  else { x.ng++; x.b = Math.min(x.b, 1) || 0; x.d = today(); }
}
function gainXP(n) { SES.xp += n; S.xp += n; }

function learnDone(w, got) {
  const first = !st(w);
  if (got) {
    SFX.ok(0);
    const x = S.w[w.id] || (S.w[w.id] = { b: 0, d: 0, n: 0, ok: 0, ng: 0 });
    x.n++; x.b = Math.max(x.b, 1); x.d = today() + 1;
    if (first) SES.newWords++;
    gainXP(5);
  } else {
    SFX.tap();
    if (!SES.retried.has(w.id)) { SES.retried.add(w.id); SES.queue.push({ w, type: 'learn' }); }
    gainXP(2);
  }
  addToday(); save();
  SES.i++; renderCard();
}

function answer(w, choices, idx) {
  const btns = document.querySelectorAll('.choice');
  btns.forEach(b => { b.disabled = true; });
  const ok = choices[idx].ok;
  btns.forEach((b, i) => { if (choices[i].ok) b.classList.add('right'); });
  if (ok) {
    SES.ok++; SES.combo++; SES.maxCombo = Math.max(SES.maxCombo, SES.combo);
    SFX.ok(SES.combo);
    gainXP(10 + Math.min(SES.combo, 5) * 2);
    sparkle(btns[idx]);
  } else {
    btns[idx].classList.add('wrong');
    SES.ng++; SES.combo = 0;
    SFX.ng();
    gainXP(2);
    SES.mistakes.push(w);
    if (!SES.retried.has(w.id)) { SES.retried.add(w.id); SES.queue.push({ w, type: w.eki ? 'yomi' : cardType(w) }); }
  }
  grade(w, ok);
  addToday(); save();
  renderCombo(); renderTrack();
  $('#after').innerHTML = `<div class="result-line ${ok ? 'good' : 'bad'}">${ok ? pick(['せいかい！', 'すごい！', 'ぴったり！', 'やったね！']) : 'おしい！ こたえは こちら'}</div>
    <div class="word small">${rubyHTML(w.segs, { hl: w.kanji })}</div>
    ${infoHTML(w)}
    <button class="big-btn" id="nextBtn">つぎの えきへ ▶</button>`;
  speak(w.yomi);
  $('#nextBtn').onclick = () => { SFX.tap(); SES.i++; renderCard(); };
  $('#nextBtn').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-say]');
  if (b) { e.stopPropagation(); const was = S.voice; S.voice = true; speak(b.dataset.say); S.voice = was; }
});

/* ---------------- しゅうてん ---------------- */
function finishSession() {
  S.sessions++;
  S.maxCombo = Math.max(S.maxCombo, SES.maxCombo);
  const answered = SES.ok + SES.ng;
  if (answered >= 3 && SES.ng === 0) S.perfect++;
  gainXP(20);
  // きょうの めあて
  let stamp = null, goalNow = false;
  if (todayCount() >= S.goal && S.lastGoal !== dayKey()) {
    goalNow = true;
    S.streak = S.lastGoal === keyOfNum(today() - 1) ? S.streak + 1 : 1;
    S.best = Math.max(S.best, S.streak);
    S.lastGoal = dayKey();
    S.goalDays = (S.goalDays || []).concat(dayKey()).slice(-60);
    gainXP(30);
    const left = STAMPS.map((s, i) => i).filter(i => !S.stamps.includes(i));
    if (left.length) { stamp = pick(left); S.stamps.push(stamp); }
  }
  const newBadges = checkBadges();
  const L = levelInfo();
  save();

  const c = counts();
  $('#result').innerHTML = `<div class="finish panel">
      <div class="finish-train">🚃💨</div>
      <h2>しゅうてん とうちゃく！</h2>
      <div class="res-grid">
        <div><b>${SES.newWords}</b><span>あたらしい ことば</span></div>
        <div><b>${SES.ok}</b><span>せいかい</span></div>
        <div><b>${SES.maxCombo}</b><span>さいだい コンボ</span></div>
        <div><b>+${SES.xp}</b><span>けいけんち</span></div>
      </div>
      ${answered >= 3 && SES.ng === 0 ? '<div class="perfect">💮 パーフェクト！ 1かいも まちがえなかったね！</div>' : ''}
      <div class="res-total">おぼえた ことば <b>${c.learned}</b> / ${WORDS.length}</div>
      ${SES.mistakes.length ? `<div class="miss"><div class="miss-t">まちがえた ことば（また でて くるよ）</div>
        ${[...new Set(SES.mistakes)].map(w => `<span class="miss-w">${rubyHTML(w.segs, { hl: w.kanji })}</span>`).join('')}</div>` : ''}
      <div class="two">
        <button class="big-btn alt" data-go="home">🏠 ホーム</button>
        <button class="big-btn" id="againSes">もう 1かい！ 🚃</button>
      </div>
    </div>`;
  show('result');
  $('#againSes').onclick = () => {
    SFX.horn();
    if (SES.mode === 'kanji') startSession(buildForKanji(SES.kanji), 'kanji', SES.kanji);
    else startSession(buildDaily(), 'daily');
  };
  SFX.fanfare(); confetti();

  // ごほうびを じゅんばんに みせる
  const steps = [];
  if (goalNow) steps.push(() => goalOverlay(stamp));
  if (L.lv > SES.lvBefore) steps.push(() => overlay(`<div class="ov-big">⬆️</div><h2>レベル アップ！</h2>
      <p class="ov-lv">Lv.${L.lv}</p><p>「${L.title}」に なったよ！</p>`, () => SFX.level()));
  newBadges.forEach(b => steps.push(() => overlay(`<div class="ov-big">${b.e}</div><h2>くんしょう ゲット！</h2>
      <p class="ov-name">${b.name}</p><p class="ov-how">${b.how}</p>`, () => SFX.fanfare())));
  runSteps(steps);
}
function goalOverlay(stamp) {
  const s = stamp != null ? STAMPS[stamp] : null;
  overlay(`<h2>きょうの めあて クリア！</h2>
    <p>🔥 ${S.streak}にち れんぞく</p>
    ${s ? `<div class="stamp-get"><div class="stamp big" style="--h:${stamp * 37 % 360}"><span>${s[0]}</span><em>${s[1]}</em></div></div>
      <p>えきスタンプ「${s[1]}」を もらったよ！</p>` : '<p>スタンプは ぜんぶ あつめたよ！ すごい！</p>'}`, () => SFX.stamp());
}
let stepQ = [];
function runSteps(steps) { stepQ = steps; nextStep(); }
function nextStep() { const f = stepQ.shift(); if (f) setTimeout(f, 350); }
function overlay(html, sfx) {
  const ov = $('#overlay');
  ov.innerHTML = `<div class="ov-card">${html}<button class="big-btn" id="ovOk">やったね！</button></div>`;
  ov.hidden = false;
  if (sfx) sfx();
  confetti();
  $('#ovOk').onclick = () => { ov.hidden = true; SFX.tap(); nextStep(); };
}

/* ---------------- ろせんず ---------------- */
function renderMap() {
  $('#lines').innerHTML = GROUPS.map(g => {
    const ks = KANJI.filter(k => k.g === g.id);
    const col = LINE_COLORS[g.id];
    return `<div class="line" style="--c:${col}">
      <div class="line-name"><span class="line-mark">${g.emoji}</span>${g.name}せん</div>
      <div class="stations">${ks.map(k => {
        const s = kanjiStars(k);
        const l = k.words.filter(learned).length;
        return `<button class="station s${s}" data-k="${k.index}">
          <span class="st-k">${k.k}</span>
          <span class="st-stars">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</span>
          <span class="st-n">${l}/${k.words.length}</span></button>`;
      }).join('')}</div></div>`;
  }).join('');
  $('#lines').querySelectorAll('.station').forEach(b => b.addEventListener('click', () => { SFX.tap(); renderDetail(KANJI[+b.dataset.k]); }));
}

/* ---------------- かんじの くわしく ---------------- */
function renderDetail(k) {
  const groups = { o: [], k: [], t: [], e: [] };
  k.words.forEach(w => groups[kindOf(w)].push(w));
  const yomiSet = new Set(k.words.filter(w => !w.eki).map(w => w.segs[w.focus].r));
  const section = (kd, list) => !list.length ? '' : `<h3 class="sec sec-${kd}">${KIND_NAME[kd]}の ことば <small>${list.length}</small></h3>
    <div class="wlist">${list.map(w => {
      const x = st(w);
      const mark = !x ? '<i class="mk">🆕</i>' : x.b >= MASTER ? '<i class="mk">⭐</i>' : x.b >= 1 ? '<i class="mk">✅</i>' : '<i class="mk">🔁</i>';
      return `<div class="wrow">${mark}<div class="wmain"><div class="wword">${rubyHTML(w.segs, { hl: k.k })}
        <button class="say" data-say="${esc(w.yomi)}" aria-label="よみあげ">🔊</button></div>
        <div class="wimi">${w.emoji} ${textHTML(w.imi)}</div>
        ${w.rei ? `<div class="wrei">📝 ${textHTML(w.rei)}</div>` : ''}</div></div>`;
    }).join('')}</div>`;
  const s = kanjiStars(k);
  $('#detail').innerHTML = `
    <button class="link-back" data-go="map">‹ ろせんずに もどる</button>
    <div class="kd panel" style="--c:${LINE_COLORS[k.g]}">
      <div class="kd-big">${k.k}</div>
      <div class="kd-info">
        <div class="kd-stars">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</div>
        <div><span class="tag tag-o">おん</span> ${esc(k.on || '―')}</div>
        <div><span class="tag tag-k">くん</span> ${esc(k.kun || '―')}</div>
        <div class="kd-imi">いみ：${esc(k.imi)}　／　${k.kaku}かく</div>
        <div class="kd-imi">よみかたは ぜんぶで <b>${yomiSet.size}</b>とおり！</div>
      </div>
    </div>
    <button class="big-btn" id="kPractice">この かんじで れんしゅう 🚃</button>
    ${section('o', groups.o)}${section('k', groups.k)}${section('t', groups.t)}${section('e', groups.e)}`;
  show('detail');
  $('#kPractice').onclick = () => { SFX.horn(); startSession(buildForKanji(k), 'kanji', k); };
}

/* ---------------- スタンプ・くんしょう・せってい ---------------- */
function renderStamps() {
  $('#stampGrid').innerHTML = STAMPS.map((s, i) => S.stamps.includes(i)
    ? `<div class="stamp" style="--h:${i * 37 % 360}"><span>${s[0]}</span><em>${s[1]}</em></div>`
    : `<div class="stamp empty"><span>？</span><em>まだ</em></div>`).join('');
}
function renderBadges() {
  $('#badgeList').innerHTML = BADGES.map(b => {
    const got = S.badges.includes(b.id);
    return `<div class="badge ${got ? 'got' : ''}"><span class="be">${got ? b.e : '🔒'}</span>
      <div><b>${b.name}</b><small>${b.how}</small></div></div>`;
  }).join('');
}
function renderSettings() {
  document.querySelectorAll('#goalSeg button').forEach(b => b.classList.toggle('on', +b.dataset.goal === S.goal));
  document.querySelectorAll('#voiceSeg button').forEach(b => b.classList.toggle('on', (b.dataset.voice === '1') === !!S.voice));
}
$('#goalSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.goal = +b.dataset.goal; save(); SFX.tap(); renderSettings(); });
$('#voiceSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.voice = b.dataset.voice === '1'; save(); SFX.tap(); renderSettings(); });
$('#resetBtn').addEventListener('click', () => {
  if (!confirm('きろくを ぜんぶ けしても いい？（もとに もどせないよ）')) return;
  const keep = { sound: S.sound, voice: S.voice, goal: S.goal };
  S = Object.assign(DEFAULT(), keep); save(); show('home');
});

function renderSound() { $('#soundBtn').textContent = S.sound ? '🔊' : '🔇'; $('#soundBtn').setAttribute('aria-pressed', S.sound); }
$('#soundBtn').addEventListener('click', () => {
  S.sound = !S.sound; save(); renderSound();
  if (!S.sound && 'speechSynthesis' in window) speechSynthesis.cancel();
  SFX.tap();
});
document.addEventListener('click', e => {
  if (!e.target.closest('[data-quit]')) return;
  if (confirm('とちゅうで おりる？（おぼえた ぶんは のこるよ）')) show('home');
});
$('#title').addEventListener('click', () => {
  if (current === 'study' && !confirm('とちゅうで ホームに もどる？（おぼえた ぶんは のこるよ）')) return;
  show('home');
});

/* ---------------- きらきら ---------------- */
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'confetti';
  const em = ['🎉', '⭐', '✨', '🚃', '🌸', '🎊'];
  for (let i = 0; i < 26; i++) {
    const p = document.createElement('i');
    p.textContent = pick(em);
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDelay = Math.random() * 0.4 + 's';
    p.style.fontSize = 16 + Math.random() * 20 + 'px';
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2600);
}
function sparkle(el) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('i'); p.className = 'spark'; p.textContent = '✨';
    p.style.left = r.left + r.width / 2 + 'px'; p.style.top = r.top + r.height / 2 + 'px';
    p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
    p.style.setProperty('--dy', (Math.random() * -120 - 20) + 'px');
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}
function toast(e, msg) {
  const t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = `<span>${e}</span>${esc(msg)}`;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ---------------- はじめ ---------------- */
renderSound();
checkBadges(); save();
show('home');
