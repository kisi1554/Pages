'use strict';

/*
 * おべんとう づくり — あそび の すすめかた
 *
 *  おだい → つめる（ドラッグ か タップ→タップ）→ ふた を しめる（パチン）→ いただきます → かんそう
 *  バランス は 3しょく（あか・きいろ・みどり）の りょう、いろどり は 5しょく、
 *  おうち の かた むけ に 主食・主菜・副菜 の わりあい（3・1・2弁当箱法 の めやす）。
 *  しかる ことば は つかわない。「つぎ は 〜 を ふやして みよう」と さそう。
 */

// ---- おだい（箱 の 大きさ・しきり は おだい ごと） ----
// slots の 単位: 1 = たて よこ 1マス。main = ごはん・パン の ばしょ（しゅしょく だけ）
function grid(x0, y0, cols, rows, w, h) {
  const a = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) a.push({ x: x0 + c * w, y: y0 + r * h, w, h });
  return a;
}
const M = (s) => Object.assign(s, { main: true });

const THEMES = [
  {
    id: 'ensoku', emoji: '🎒', title: 'あした は えんそく！', ml: 500, scale: .9,
    story: 'やま まで あるく えんそく。ひるごはん は みんな で おべんとう。いろ が きれいで、げんき が でる おべんとう を つくろう。',
    box: { w: 6, h: 4, r: 34, edge: '#ffc9de', line: '#d6336c', floor: '#fff0f6', lid: '#ffdeeb', band: '#f06595' },
    slots: [M({ x: 0, y: 0, w: 3, h: 2 }), M({ x: 0, y: 2, w: 3, h: 2 })].concat(grid(3, 0, 2, 3, 1.5, 4 / 3)),
    char: { name: 'くま の くうちゃん', kind: 'bear', c: '#c08a5a' },
  },
  {
    id: 'undokai', emoji: '🏃', title: 'うんどうかい で いっぱい はしる', ml: 650, scale: 1,
    story: 'かけっこ や つなひき で いっぱい うごく ひ。きいろ（げんき の もと）と あか（からだ を つくる）を しっかり いれよう。みどり も わすれずに。',
    focus: ['y', 'r'],
    box: { w: 8, h: 4.2, r: 30, edge: '#a5d8ff', line: '#1971c2', floor: '#e7f5ff', lid: '#d0ebff', band: '#fa5252' },
    slots: [M({ x: 0, y: 0, w: 4, h: 2.1 }), M({ x: 0, y: 2.1, w: 4, h: 2.1 }),
      { x: 4, y: 0, w: 2, h: 1.4 }, { x: 6, y: 0, w: 2, h: 1.4 }, { x: 4, y: 1.4, w: 4, h: 1.4 },
      { x: 4, y: 2.8, w: 2, h: 1.4 }, { x: 6, y: 2.8, w: 2, h: 1.4 }],
    char: { name: 'そらくん', kind: 'kid', hat: 'hachimaki', hair: '#343a40' },
  },
  {
    id: 'ekiben', emoji: '🚃', title: 'でんしゃ の たび の えきべん ふう', ml: 600, scale: 1,
    story: 'ながい でんしゃ の たび。まど の けしき を みながら たべる えきべん みたいに、いろんな おかず を すこしずつ。でんしゃ の のり も のせて みよう！',
    goalDeco: ['nori-train', 'pick-train'],
    box: { w: 9, h: 3.2, r: 14, edge: '#e3c08d', line: '#8a5a2b', floor: '#f6e7c8', lid: '#d8b07a', band: '#c92a2a', wood: true },
    slots: [M({ x: 0, y: 0, w: 1.5, h: 3.2 }), M({ x: 1.5, y: 0, w: 1.5, h: 3.2 }), M({ x: 3, y: 0, w: 1.5, h: 3.2 })].concat(grid(4.5, 0, 3, 2, 1.5, 1.6)),
    char: { name: 'しゃしょう の みなとさん', kind: 'kid', hat: 'cap', hair: '#5c3d2e' },
  },
  {
    id: 'chiisana', emoji: '🧸', title: 'ちいさな <ruby>子<rt>こ</rt></ruby> の おべんとう', ml: 400, scale: .74,
    story: '3さい の いもうと、ももちゃん の おべんとう。ちいさな はこ に、たべやすい おかず を つめて あげよう。',
    small: true,
    box: { w: 5, h: 3.2, r: 44, edge: '#ffe066', line: '#e67700', floor: '#fff9db', lid: '#fff3bf', band: '#fab005' },
    slots: [M({ x: 0, y: 0, w: 2.5, h: 3.2 })].concat(grid(2.5, 0, 2, 2, 1.25, 1.6)),
    char: { name: 'いもうと の ももちゃん', kind: 'kid', hat: 'ribbon', hair: '#5c3d2e', small: true },
  },
  {
    id: 'picnic', emoji: '🧺', title: 'こうえん で パン の ピクニック', ml: 550, scale: .92,
    story: 'こうえん で ピクニック。サンドイッチ や ロールパン の おべんとう。やさい と くだもの も いれて みよう。',
    box: { w: 6.4, h: 4, r: 26, edge: '#b2f2bb', line: '#2b8a3e', floor: '#ebfbee', lid: '#d3f9d8', band: '#40c057' },
    slots: [M({ x: 0, y: 0, w: 3.2, h: 2 }), M({ x: 3.2, y: 0, w: 3.2, h: 2 })].concat(grid(0, 2, 4, 1, 1.6, 2)),
    char: { name: 'うさぎ の ぴょんちゃん', kind: 'rabbit', c: '#f8f9fa' },
  },
  {
    id: 'jiyuu', emoji: '🌈', title: 'じゆう に つくろう', ml: 550, scale: .95,
    story: 'すきな おかず を えらんで、じぶん だけ の おべんとう を つくろう。あか・きいろ・みどり は そろうかな？',
    box: { w: 7, h: 4, r: 36, edge: '#d0bfff', line: '#6741d9', floor: '#f3f0ff', lid: '#e5dbff', band: '#7950f2' },
    slots: [M({ x: 0, y: 0, w: 3.5, h: 4 })].concat(grid(3.5, 0, 2, 3, 1.75, 4 / 3)),
    char: { name: 'ねこ の みいちゃん', kind: 'cat', c: '#ffa94d' },
  },
];
THEMES.forEach((t) => t.slots.forEach((s) => { s.area = s.w * s.h; }));
// ふりがな つき の もじ → よみあげ 用 の ひらがな
const plain = (s) => s.replace(/<ruby>(.*?)<rt>(.*?)<\/rt><\/ruby>/g, '$2');
const THEME = {};
THEMES.forEach((t) => { THEME[t.id] = t; });

const TABS = [
  { id: 'gohan', label: 'ごはん・パン', emoji: '🍚' },
  { id: 'okazu', label: 'にく・さかな・たまご・まめ', short: 'おかず', emoji: '🍳' },
  { id: 'yasai', label: 'やさい・いも・きのこ', short: 'やさい', emoji: '🥦' },
  { id: 'fruit', label: 'くだもの', emoji: '🍓' },
  { id: 'deco', label: 'かざり', emoji: '⭐' },
];

// 3・1・2弁当箱法 の めやす を いろ に あてはめた もの（あか 1/6・きいろ 3/6・みどり 2/6）
const TARGET = { y: 3 / 6, r: 1 / 6, g: 2 / 6 };
const MORE = { r: 'たまごやき や やきざけ、とうふ', y: 'ごはん や おいも', g: 'ブロッコリー や ミニトマト、くだもの' };

// ---- ほぞん ----
const SAVE_KEY = 'obento-zukuri:v1';
const store = { done: {}, used: [], album: [], marks: false };
try {
  const v = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (v && typeof v === 'object') {
    if (v.done && typeof v.done === 'object') store.done = v.done;
    if (Array.isArray(v.used)) store.used = v.used.filter((id) => FOOD[id]);
    if (Array.isArray(v.album)) store.album = v.album.filter((a) => a && THEME[a.t]).slice(0, 10);
    store.marks = !!v.marks;
  }
} catch (e) { /* こわれて いたら さいしょ から */ }
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(store)); } catch (e) { /* ほぞん できなくても あそべる */ }
}

// ---- けいさん ----
function evaluate(theme, slots) {
  const total = theme.slots.reduce((a, s) => a + s.area, 0);
  const amt = { r: 0, y: 0, g: 0 }, role = { staple: 0, main: 0, side: 0, other: 0 };
  const colors = new Set();
  let filled = 0, gaps = 0, fry = 0, decos = 0, round = false;
  const allergens = new Set();
  const deco = [];
  theme.slots.forEach((sl, i) => {
    const st = slots[i];
    const f = st && st.food && FOOD[st.food];
    if (!f) { gaps++; return; }
    filled += sl.area;
    Object.keys(f.g).forEach((k) => { amt[k] += f.g[k] * sl.area; });
    role[f.role] += sl.area;
    f.colors.forEach((c) => colors.add(c));
    f.al.forEach((a) => allergens.add(a));
    if (f.fry) fry++;
    if (f.round) round = true;
    if (st.deco) { decos++; deco.push(st.deco); }
  });
  const lv = {};
  ['r', 'y', 'g'].forEach((k) => { lv[k] = amt[k] / (total * TARGET[k]); });
  const iro = IRODORI.filter((c) => colors.has(c));
  const balance = lv.r >= .6 && lv.y >= .6 && lv.g >= .6;
  const meal = role.staple + role.main + role.side;
  return { total, amt, lv, role, meal, filled, gaps, fry, decos, deco, iro, balance, allergens, round };
}
function levelWord(v) {
  if (v < .01) return 'まだ ない';
  if (v < .6) return 'もうすこし';
  if (v <= 1.6) return 'ちょうど いい';
  return 'たっぷり';
}

// ---- がめん ----
const $ = (id) => document.getElementById(id);
const screens = ['home', 'play', 'zukan', 'album', 'parent'];
let current = 'home';

function show(name) {
  screens.forEach((s) => { $(s).hidden = s !== name; });
  current = name;
  $('btnBack').hidden = name === 'home';
  const titles = { home: '🍱 おべんとう づくり', play: '🍱 おべんとう づくり', zukan: '📖 たべもの ずかん', album: '📷 おべんとう アルバム', parent: '👪 おうち の かた へ' };
  $('hTitle').textContent = titles[name];
  window.scrollTo(0, 0);
  if (name === 'home') renderHome();
  if (name === 'zukan') renderZukan();
  if (name === 'album') renderAlbum();
  if (name === 'parent') renderMarksToggle($('parentMarks'));
  Sound.stopSpeak();
}

function renderHome() {
  $('odaiList').innerHTML = THEMES.map((t) => {
    const n = store.done[t.id] || 0;
    return `<button class="odai-card" data-theme="${t.id}" style="--edge:${t.box.edge};--line:${t.box.line};--floor:${t.box.floor}">
      <span class="odai-emoji" aria-hidden="true">${t.emoji}</span>
      <span class="odai-txt"><b>${t.title}</b><small>おべんとうばこ ${t.ml}mL ・ しきり ${t.slots.length}こ</small></span>
      ${n ? `<span class="odai-done">できた ${n}</span>` : ''}
    </button>`;
  }).join('');
}

// ---- あそぶ ----
const game = { theme: null, slots: [], sel: null, tab: 'gohan', page: 0, closed: false, gapWarned: false, eating: false };

function startTheme(id) {
  const t = THEME[id];
  game.theme = t;
  game.slots = t.slots.map(() => ({ food: null, deco: null }));
  game.sel = null; game.closed = false; game.gapWarned = false; game.eating = false;
  game.tab = 'gohan'; game.page = 0;
  $('eat').hidden = true;
  $('odaiEmoji').textContent = t.emoji;
  $('odaiTitle').innerHTML = t.title;
  $('odaiSize').textContent = `おべんとうばこ ${t.ml}mL`;
  $('odaiStory').textContent = t.story;
  $('boxWrap').style.setProperty('--scale', t.scale);
  show('play');
  renderTabs();
  renderBox();
  renderShelf();
  updateLidBtn();
  say(t.small ? 'ちいさな はこ だよ。ごはん は ひだり の おおきい ところ。たべやすい おかず を えらぼう。'
    : 'たな から たべもの を えらんで、おべんとうばこ に つめよう。ごはん は おおきい ところ だよ。', false);
  Sound.speak(plain(t.title) + '。' + t.story);
}

function say(text, speakIt) {
  $('msg').textContent = text;
  $('msg').classList.remove('pop'); void $('msg').offsetWidth; $('msg').classList.add('pop');
  if (speakIt) Sound.speak(text);
}

function renderBox(opt) {
  const t = game.theme;
  const target = [];
  if (game.sel && !game.closed) {
    t.slots.forEach((sl, i) => {
      if (game.sel.kind === 'deco') { if (game.slots[i].food) target.push(i); return; }
      const f = FOOD[game.sel.id];
      if (!sl.main || f.role === 'staple') target.push(i);
    });
  }
  const b = Draw.box(t, game.slots, { uid: 'p', target });
  const svg = $('boxSvg');
  svg.setAttribute('viewBox', b.viewBox);
  svg.innerHTML = b.svg + `<g id="lidG" style="display:none">${Draw.lid(t)}</g>`;
  if (game.closed && !(opt && opt.animLid)) $('lidG').style.display = '';
  updateMeters();
}

function updateMeters() {
  const ev = evaluate(game.theme, game.slots);
  const m = ['r', 'y', 'g'].map((k) => {
    const v = ev.lv[k], w = Math.min(1.6, v) / 1.6 * 100;
    const ok = v >= .6;
    return `<div class="meter ${ok ? 'ok' : ''}" style="--gc:${GROUPS[k].color};--gs:${GROUPS[k].soft}">
      <span class="m-name"><i class="dot"></i>${GROUPS[k].name}<small>${GROUPS[k].long}</small></span>
      <span class="m-bar"><i style="width:${w.toFixed(1)}%"></i><b class="m-goal" style="left:${(.6 / 1.6 * 100).toFixed(1)}%"></b><b class="m-goal2" style="left:${(1 / 1.6 * 100).toFixed(1)}%"></b></span>
      <span class="m-word">${levelWord(v)}</span></div>`;
  }).join('');
  const iro = IRODORI.map((c) => `<i class="iro ${ev.iro.includes(c) ? 'on' : ''}" style="--ic:${COLORS[c].c}" title="${COLORS[c].name}"></i>`).join('');
  const r = ev.meal || 1;
  const pct = (v) => Math.round(v / r * 100);
  $('meters').innerHTML = `<div class="meter-row">${m}</div>` +
    `<div class="iro-row"><span>いろどり</span>${iro}<b>${ev.iro.length === 5 ? 'おいしそう！' : `${ev.iro.length}/5`}</b></div>`;
  $('ratio').innerHTML = `<details class="ratio" ${$('ratio').dataset.open === '1' ? 'open' : ''}><summary>おうち の かた へ：主食・主菜・副菜 の わりあい</summary>
      <div class="ratio-bars">
        <div class="rb"><span>いま</span><span class="rb-bar">${ratioBar(ev.role.staple, ev.role.main, ev.role.side, ev.meal)}</span></div>
        <div class="rb"><span>めやす</span><span class="rb-bar">${ratioBar(3, 1, 2, 6)}</span></div>
      </div>
      <p class="ratio-note">主食 ${ev.meal ? pct(ev.role.staple) : 0}%・主菜 ${ev.meal ? pct(ev.role.main) : 0}%・副菜 ${ev.meal ? pct(ev.role.side) : 0}%（めやす 3:1:2 ＝ 50%・17%・33%。容積の割合）。
      くだもの・乳製品は計算に入れていません。弁当箱 ${game.theme.ml}mL ≒ 1食 約${game.theme.ml}kcal が めやす（3・1・2弁当箱法）。
      ${ev.fry >= 2 ? '<br>※ 揚げ物が2品以上。弁当箱法では「同じ調理法（特に油を多く使う料理）は1品に」が めやす。' : ''}
      ${ev.allergens.size ? `<br>アレルギー表示の対象（例）: ${allergenText(ev.allergens)}` : ''}</p>
    </details>`;
  const det = $('ratio').querySelector('details');
  det.addEventListener('toggle', () => { $('ratio').dataset.open = det.open ? '1' : ''; });
}
function ratioBar(a, b, c, tot) {
  if (!tot) return '<i class="rb-empty">まだ ない</i>';
  return `<i class="rb-s" style="width:${a / tot * 100}%">主食</i><i class="rb-m" style="width:${b / tot * 100}%">主菜</i><i class="rb-f" style="width:${c / tot * 100}%">副菜</i>`;
}
function allergenText(set) {
  const keys = [...set];
  const must = keys.filter((k) => ALLERGENS[k].must).map((k) => `<b>${ALLERGENS[k].label}</b>`);
  const rec = keys.filter((k) => !ALLERGENS[k].must).map((k) => ALLERGENS[k].label);
  return [must.join('・'), rec.length ? `（推奨）${rec.join('・')}` : ''].filter(Boolean).join(' ');
}

function renderTabs() {
  $('tabs').innerHTML = TABS.map((t) => `<button role="tab" class="tab ${t.id === game.tab ? 'on' : ''}" data-tab="${t.id}" aria-selected="${t.id === game.tab}"><span aria-hidden="true">${t.emoji}</span><b>${t.short || t.label}</b></button>`).join('');
}

function shelfItems() {
  if (game.tab === 'deco') return DECOS.map((d) => ({ kind: 'deco', id: d.id }));
  return FOODS.filter((f) => f.tab === game.tab).map((f) => ({ kind: 'food', id: f.id }));
}
function perPage() {
  const el = $('shelf');
  const W = el.clientWidth, H = el.clientHeight;
  const iw = W < 420 ? 82 : 96, ih = W < 420 ? 98 : 112, gap = 8;
  const cols = Math.max(2, Math.floor((W + gap) / (iw + gap)));
  const rows = Math.max(1, Math.floor((H + gap) / (ih + gap)));
  el.style.setProperty('--cols', cols);
  el.style.setProperty('--rows', rows);
  return cols * rows;
}
function marksHTML(f) {
  if (!store.marks || !f.al.length) return '';
  const must = f.al.filter((k) => ALLERGENS[k].must);
  const rec = f.al.filter((k) => !ALLERGENS[k].must);
  return `<span class="al-marks">${must.map((k) => `<i class="al must">${ALLERGENS[k].label}</i>`).join('')}${rec.length ? `<i class="al rec">＋${rec.length}</i>` : ''}</span>`;
}
function groupDots(f) {
  return `<span class="gdots">${Object.keys(f.g).sort((a, b) => f.g[b] - f.g[a]).map((k) => `<i style="background:${GROUPS[k].color};flex:${f.g[k]}"></i>`).join('')}</span>`;
}
function renderShelf() {
  const items = shelfItems();
  const n = perPage();
  const pages = Math.max(1, Math.ceil(items.length / n));
  game.page = Math.min(game.page, pages - 1);
  const slice = items.slice(game.page * n, game.page * n + n);
  $('shelf').innerHTML = slice.map((it) => {
    const on = game.sel && game.sel.kind === it.kind && game.sel.id === it.id;
    if (it.kind === 'deco') {
      const d = DECO[it.id];
      return `<button class="shelf-item ${on ? 'on' : ''}" data-kind="deco" data-id="${d.id}">${Draw.decoIcon(d)}<span class="si-name">${d.name}</span></button>`;
    }
    const f = FOOD[it.id];
    return `<button class="shelf-item ${on ? 'on' : ''}" data-kind="food" data-id="${f.id}">${Draw.icon(f)}${groupDots(f)}<span class="si-name">${f.name}</span>${marksHTML(f)}</button>`;
  }).join('');
  $('pgNum').textContent = `${game.page + 1} / ${pages}`;
  $('pgPrev').disabled = game.page === 0;
  $('pgNext').disabled = game.page >= pages - 1;
  $('pager').hidden = pages <= 1;
  $('shelf').classList.toggle('locked', game.closed);
}

// えらんだ もの に しるし（たな は かきなおさない。ドラッグ中 の ゆび を はなさない ため）
function markShelf() {
  $('shelf').querySelectorAll('.shelf-item').forEach((el) => {
    el.classList.toggle('on', !!game.sel && game.sel.kind === el.dataset.kind && game.sel.id === el.dataset.id);
  });
}
function select(kind, id) {
  if (game.closed) return;
  if (game.sel && game.sel.kind === kind && game.sel.id === id) { game.sel = null; markShelf(); renderBox(); return; }
  game.sel = { kind, id };
  Sound.sfx('pick');
  markShelf(); renderBox();
  if (kind === 'deco') {
    say(`${DECO[id].name}。のせたい おかず を タップしてね。`, false);
    Sound.speak(DECO[id].name);
  } else {
    const f = FOOD[id];
    const g = mainGroup(f);
    say(`${f.name}（${GROUPS[g].name}）。いれたい ところ を タップ してね。`, false);
    Sound.speak(f.name);
  }
}

function place(i, sel) {
  sel = sel || game.sel;
  if (!sel || game.closed) return false;
  const sl = game.theme.slots[i], st = game.slots[i];
  if (sel.kind === 'deco') {
    if (!st.food) { Sound.sfx('hmm'); say('かざり は、つめた おかず や ごはん の うえ に のせよう。', true); return false; }
    st.deco = st.deco === sel.id ? null : sel.id;
    Sound.sfx('kira');
    renderBox(); popSlot(i);
    if (st.deco && game.theme.goalDeco && game.theme.goalDeco.includes(st.deco)) say('でんしゃ が はしって いる みたい！', true);
    return true;
  }
  const f = FOOD[sel.id];
  if (sl.main && f.role !== 'staple') {
    Sound.sfx('hmm');
    say('ここ は ごはん や パン の ばしょ だよ。おかず は ちいさい しきり に いれよう。', true);
    return false;
  }
  st.food = f.id; st.deco = null;
  game.gapWarned = false;
  if (!store.used.includes(f.id)) { store.used.push(f.id); persist(); }
  Sound.sfx('poko');
  renderBox(); popSlot(i);
  const ev = evaluate(game.theme, game.slots);
  let msg = `${f.name} を つめたよ。`;
  if (game.theme.small && f.round) msg += 'ちいさな 子 には、まるい もの は 4つ に きって あげよう。';
  else if (ev.gaps === 0) msg += 'ぎっしり！ ふた を しめられるよ。';
  else msg += `あと ${ev.gaps}こ の しきり が あいて いるよ。`;
  say(msg, false);
  updateLidBtn();
  return true;
}
function popSlot(i) {
  const g = $('boxSvg').querySelector(`.slot[data-slot="${i}"]`);
  if (g) g.classList.add('pop');
}
function removeAt(i) {
  const st = game.slots[i];
  if (!st.food || game.closed) return;
  const name = FOOD[st.food].name;
  st.food = null; st.deco = null;
  Sound.sfx('remove');
  renderBox();
  say(`${name} を とりだしたよ。`, false);
  updateLidBtn();
}

function updateLidBtn() {
  const btn = $('btnLid');
  if (game.closed) { btn.textContent = '🙏 いただきます！'; btn.classList.add('itadaki'); return; }
  btn.classList.remove('itadaki');
  btn.textContent = game.gapWarned ? 'このまま ふた を しめる' : 'ふた を しめる';
}

function onLid() {
  if (game.eating) return;
  if (game.closed) { eat(); return; }
  const ev = evaluate(game.theme, game.slots);
  if (!ev.filled) { Sound.sfx('hmm'); say('まず たべもの を つめよう。', true); return; }
  if (ev.gaps && !game.gapWarned) {
    game.gapWarned = true;
    Sound.sfx('hmm');
    say(`すきま が ${ev.gaps}こ あるよ。すきま が おおい と、もって あるいた とき に よって かたよっちゃう かも。レタス や ミニトマト で うめて みる？`, true);
    updateLidBtn();
    return;
  }
  closeLid(ev);
}

function closeLid(ev) {
  game.closed = true; game.sel = null;
  renderShelf();
  renderBox({ animLid: true });
  const lidG = $('lidG');
  lidG.style.display = '';
  const H = (game.theme.box.h + 1) * Draw.U;
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / 520);
    const e = 1 - Math.pow(1 - k, 3);
    lidG.setAttribute('transform', `translate(0 ${(-H * (1 - e)).toFixed(1)})`);
    if (k < 1) { requestAnimationFrame(step); return; }
    Sound.sfx('pachin');
    $('boxWrap').classList.add('snap');
    setTimeout(() => $('boxWrap').classList.remove('snap'), 300);
    if (ev.gaps) {
      setTimeout(() => {
        Sound.sfx('shake');
        $('boxWrap').classList.add('shake');
        setTimeout(() => $('boxWrap').classList.remove('shake'), 700);
        say('パチン！ ゆさゆさ… すきま が あった から、なかみ が よっちゃった かな？ さあ、いただきます を しよう。', true);
      }, 320);
    } else {
      say('パチン！ ふた が しまったよ。さあ、いただきます を しよう。', true);
    }
    updateLidBtn();
  };
  requestAnimationFrame(step);
}

// ---- たべる ----
function charSVG(c, open) {
  const skin = c.kind === 'kid' ? '#ffd8b5' : c.c;
  let ears = '', hat = '', extra = '';
  if (c.kind === 'bear') ears = `<circle cx="26" cy="26" r="14" fill="${skin}" stroke="#7a4e2d" stroke-width="3"/><circle cx="74" cy="26" r="14" fill="${skin}" stroke="#7a4e2d" stroke-width="3"/><circle cx="26" cy="26" r="7" fill="#e8b88a"/><circle cx="74" cy="26" r="7" fill="#e8b88a"/>`;
  if (c.kind === 'rabbit') ears = `<ellipse cx="36" cy="14" rx="9" ry="22" fill="${skin}" stroke="#adb5bd" stroke-width="3"/><ellipse cx="64" cy="14" rx="9" ry="22" fill="${skin}" stroke="#adb5bd" stroke-width="3"/><ellipse cx="36" cy="16" rx="4" ry="14" fill="#ffc9c9"/><ellipse cx="64" cy="16" rx="4" ry="14" fill="#ffc9c9"/>`;
  if (c.kind === 'cat') ears = `<path d="M18 36 L24 8 L44 24Z" fill="${skin}" stroke="#d9480f" stroke-width="3" stroke-linejoin="round"/><path d="M82 36 L76 8 L56 24Z" fill="${skin}" stroke="#d9480f" stroke-width="3" stroke-linejoin="round"/>`;
  if (c.kind === 'cat') extra = '<path d="M30 58 H14 M30 63 L15 68 M70 58 H86 M70 63 L85 68" stroke="#d9480f" stroke-width="2"/>';
  if (c.kind === 'kid') {
    ears = `<path d="M18 52 Q16 18 50 16 Q84 18 82 52 Q76 30 50 30 Q24 30 18 52Z" fill="${c.hair}"/>`;
    if (c.hat === 'hachimaki') hat = '<rect x="16" y="30" width="68" height="10" rx="4" fill="#fa5252"/><path d="M82 34 l12 -6 l-2 12z" fill="#fa5252"/>';
    if (c.hat === 'cap') hat = '<path d="M20 34 Q22 10 50 10 Q78 10 80 34Z" fill="#1c3d6e"/><rect x="16" y="30" width="68" height="8" rx="4" fill="#102a4c"/><circle cx="50" cy="22" r="5" fill="#fcc419"/>';
    if (c.hat === 'ribbon') hat = '<path d="M60 22 l14 -10 l2 18z M60 22 l-12 -10 l-2 18z" fill="#f783ac"/><circle cx="60" cy="22" r="4" fill="#e64980"/>';
  }
  const mouth = open
    ? '<ellipse cx="50" cy="70" rx="10" ry="9" fill="#c92a2a"/><ellipse cx="50" cy="74" rx="6" ry="3.5" fill="#ff8787"/>'
    : '<path d="M40 68 Q50 78 60 68" stroke="#5c2e1a" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${ears}<circle cx="50" cy="56" r="34" fill="${skin}" stroke="${c.kind === 'rabbit' ? '#adb5bd' : c.kind === 'kid' ? '#e8b88a' : '#7a4e2d'}" stroke-width="3"/>${c.kind === 'kid' ? ears : ''}${hat}
    ${c.kind === 'bear' ? '<ellipse cx="50" cy="68" rx="16" ry="12" fill="#e8c9a6"/>' : ''}
    <ellipse cx="38" cy="54" rx="4.5" ry="5.5" fill="#2b1a12"/><ellipse cx="62" cy="54" rx="4.5" ry="5.5" fill="#2b1a12"/>
    <circle cx="36.5" cy="52" r="1.6" fill="#fff"/><circle cx="60.5" cy="52" r="1.6" fill="#fff"/>
    <ellipse cx="28" cy="66" rx="6" ry="4" fill="#ff8787" opacity=".5"/><ellipse cx="72" cy="66" rx="6" ry="4" fill="#ff8787" opacity=".5"/>
    ${c.kind === 'bear' || c.kind === 'cat' ? '<ellipse cx="50" cy="62" rx="4" ry="3" fill="#5c2e1a"/>' : ''}${extra}${mouth}</svg>`;
}

function comments(theme, ev) {
  const lines = [];
  const weak = ['g', 'r', 'y'].filter((k) => ev.lv[k] < .6).sort((a, b) => ev.lv[a] - ev.lv[b]);
  if (ev.balance) lines.push('からだ が ぽかぽか、げんき いっぱい！');
  else lines.push('おいしかった！ ごちそうさま！');
  if (theme.focus && ev.lv.y >= .9 && ev.lv.r >= .8) lines.push('これ で いっぱい はしれるね！');
  if (theme.goalDeco && ev.deco.some((d) => theme.goalDeco.includes(d))) lines.push('でんしゃ の かざり、かっこいい！');
  if (ev.iro.length === 5) lines.push('いろ が いっぱい で、ふた を あけた とき わくわく したよ。');
  else if (ev.iro.length <= 3) {
    const miss = IRODORI.filter((c) => !ev.iro.includes(c)).map((c) => COLORS[c].name);
    lines.push(`${miss.slice(0, 2).join(' や ')} の いろ を たすと、もっと おいしそう に なるよ。`);
  }
  if (weak.length) lines.push(`つぎ は ${GROUPS[weak[0]].name} を ふやして みよう。${MORE[weak[0]]} が あるよ。`);
  if (ev.gaps) lines.push('すきま に レタス や ブロッコリー を つめると、なかみ が よらないよ。');
  return lines;
}

function badges(theme, ev) {
  const b = [];
  if (ev.balance) b.push(['balance', '🟢🟡🔴', '3しょく そろった']);
  if (ev.iro.length >= 4) b.push(['irodori', '🌈', ev.iro.length === 5 ? 'いろどり おいしそう！' : 'いろどり きれい']);
  if (!ev.gaps) b.push(['gisshiri', '📦', 'ぎっしり']);
  if (ev.decos) b.push(['kazari', '⭐', 'かざり かわいい']);
  if (theme.focus && ev.lv.y >= .9 && ev.lv.r >= .8) b.push(['genki', '💪', 'げんき まんたん']);
  if (theme.goalDeco && ev.deco.some((d) => theme.goalDeco.includes(d))) b.push(['train', '🚃', 'でんしゃ の たび']);
  if (!b.length) b.push(['try', '🍱', 'つくれた！']);
  return b;
}

function eat() {
  const t = game.theme;
  const ev = evaluate(t, game.slots);
  game.eating = true;
  Sound.sfx('chime');
  Sound.speak('いただきます！');
  const bs = badges(t, ev);
  // ほぞん（アルバム は 10こ まで、あたらしい じゅん）
  store.done[t.id] = (store.done[t.id] || 0) + 1;
  store.album.unshift({ t: t.id, d: new Date().toISOString(), s: game.slots.map((s) => [s.food, s.deco]), b: bs.map((x) => x[0]) });
  store.album = store.album.slice(0, 10);
  persist();

  $('eat').hidden = false;
  $('eatResult').hidden = true;
  $('charName').textContent = t.char.name;
  $('charBox').innerHTML = charSVG(t.char, false);
  $('bubble').textContent = 'いただきます！';
  const b = Draw.box(t, game.slots, { uid: 'e' });
  const svg = $('eatSvg');
  svg.setAttribute('viewBox', b.viewBox);
  svg.innerHTML = b.svg;
  const order = t.slots.map((_, i) => i).filter((i) => game.slots[i].food);
  let k = 0;
  const tick = () => {
    if (k >= order.length) { finishEat(t, ev, bs); return; }
    const i = order[k++];
    const g = svg.querySelector(`.slot[data-slot="${i}"] .slot-food`);
    const d = svg.querySelector(`.slot[data-slot="${i}"] .slot-deco`);
    if (g) g.classList.add('eaten');
    if (d) d.classList.add('eaten');
    $('charBox').innerHTML = charSVG(t.char, true);
    $('bubble').textContent = `もぐもぐ… ${FOOD[game.slots[i].food].name}`;
    Sound.sfx('mogu');
    setTimeout(() => { $('charBox').innerHTML = charSVG(t.char, false); }, 220);
    setTimeout(tick, 520);
  };
  setTimeout(tick, 1500);
}

function finishEat(t, ev, bs) {
  const lines = comments(t, ev);
  $('bubble').innerHTML = lines.map((l) => `<span>${l}</span>`).join('');
  $('badges').innerHTML = bs.map(([, e, n]) => `<span class="badge"><i aria-hidden="true">${e}</i>${n}</span>`).join('');
  $('eatMeters').innerHTML = ['r', 'y', 'g'].map((k) => `<span class="em" style="--gc:${GROUPS[k].color}"><i class="dot"></i>${GROUPS[k].name}: ${levelWord(ev.lv[k])}</span>`).join('');
  const pct = (v) => ev.meal ? Math.round(v / ev.meal * 100) : 0;
  $('eatParent').innerHTML = `<summary>おうち の かた へ</summary><p>主食 ${pct(ev.role.staple)}%・主菜 ${pct(ev.role.main)}%・副菜 ${pct(ev.role.side)}%（3・1・2弁当箱法のめやす 50%・17%・33%）。
    ${ev.fry >= 2 ? '揚げ物が2品以上ありました（めやすは同じ調理法1品）。' : ''}
    ${t.small ? 'ミニトマト・ぶどう など丸くてつるっとした食べ物は、小さい子には4等分などに切ると窒息予防になります（消費者庁・こども家庭庁）。' : ''}
    ${ev.allergens.size ? `アレルギー表示の対象（よくある作り方の例）: ${allergenText(ev.allergens)}` : ''}</p>`;
  $('eatResult').hidden = false;
  game.eating = false;
  Sound.sfx('yay');
  Sound.speak('ごちそうさま。' + lines.join(''));
}

// ---- ずかん ----
let zFilter = 'all';
function renderZukan() {
  $('zLegend').innerHTML = ['r', 'y', 'g'].map((k) => `<div class="legend" style="--gc:${GROUPS[k].color};--gs:${GROUPS[k].soft}"><b><i class="dot"></i>${GROUPS[k].name}</b><span>${GROUPS[k].long}</span><small>${GROUPS[k].desc}</small></div>`).join('');
  $('zFilters').innerHTML = [['all', 'ぜんぶ'], ['r', 'あか'], ['y', 'きいろ'], ['g', 'みどり']].map(([k, n]) =>
    `<button class="chip ${zFilter === k ? 'on' : ''}" data-zf="${k}" style="--gc:${k === 'all' ? '#495057' : GROUPS[k].color}">${n}</button>`).join('');
  renderMarksToggle($('zMarks'));
  const list = FOODS.filter((f) => zFilter === 'all' || mainGroup(f) === zFilter);
  $('zCount').textContent = `${list.length} しな（ぜんぶ で ${FOODS.length} しな・つめた ${store.used.length} しな）`;
  $('zGrid').innerHTML = list.map((f) => `<button class="z-card" data-food="${f.id}" style="--gc:${GROUPS[mainGroup(f)].color};--gs:${GROUPS[mainGroup(f)].soft}">
    ${Draw.icon(f)}${groupDots(f)}<b>${f.name}</b><small>${ROLES[f.role].name}</small>${store.used.includes(f.id) ? '<i class="used">つめた</i>' : ''}${marksHTML(f)}</button>`).join('');
}
function renderMarksToggle(el) {
  el.innerHTML = `<label class="marks-toggle"><input type="checkbox" ${store.marks ? 'checked' : ''}> おうち の かた むけ：アレルギー マーク を ひょうじ</label>`;
}
function openFood(id) {
  const f = FOOD[id];
  const gs = Object.keys(f.g).sort((a, b) => f.g[b] - f.g[a]);
  const al = f.al.length
    ? `<p class="m-al">アレルギー表示の対象（よくある作り方の例）: ${allergenText(new Set(f.al))}<br><small>太字＝特定原材料（表示義務）、（推奨）＝特定原材料に準ずるもの。実際の材料は商品の表示やレシピで確かめてください。</small></p>`
    : '<p class="m-al">アレルギー表示の対象（特定原材料等29品目）は、ふつうの作り方では入りません。<small>（商品によって異なることがあります）</small></p>';
  $('modalCard').innerHTML = `<button class="m-close" aria-label="とじる">✕</button>
    <div class="m-head">${Draw.icon(f, 'm-ic')}<div><h3>${f.name}</h3><p class="m-role">${ROLES[f.role].name}（${ROLES[f.role].kanji}）</p></div></div>
    <div class="m-groups">${gs.map((k) => `<span class="gchip" style="--gc:${GROUPS[k].color};--gs:${GROUPS[k].soft}"><i class="dot"></i>${GROUPS[k].name}・${GROUPS[k].long}${gs.length > 1 ? ` <small>${Math.round(f.g[k] * 10)}わり</small>` : ''}</span>`).join('')}</div>
    <p class="m-note">${f.note}</p>
    <details class="m-parent"><summary>おうち の かた へ</summary>${al}</details>`;
  $('modal').hidden = false;
  Sound.sfx('pick');
  Sound.speak(f.name + '。' + f.note);
}

// ---- アルバム ----
function renderAlbum() {
  if (!store.album.length) {
    $('albumGrid').innerHTML = '<p class="empty">まだ ないよ。おべんとう を つくって「いただきます」 すると、ここ に のこるよ（10こ まで）。</p>';
    return;
  }
  $('albumGrid').innerHTML = store.album.map((a, n) => {
    const t = THEME[a.t];
    const slots = t.slots.map((_, i) => {
      const v = a.s && a.s[i] || [];
      return { food: FOOD[v[0]] ? v[0] : null, deco: DECO[v[1]] ? v[1] : null };
    });
    const b = Draw.box(t, slots, { uid: 'a' + n, mini: true });
    const d = new Date(a.d);
    const ds = isNaN(d) ? '' : `${d.getMonth() + 1}がつ ${d.getDate()}にち`;
    const bs = (a.b || []).map((id) => ({ balance: '🟢', irodori: '🌈', gisshiri: '📦', kazari: '⭐', genki: '💪', train: '🚃', try: '🍱' }[id] || '')).join('');
    return `<div class="al-card"><svg viewBox="${b.viewBox}">${b.svg}</svg>
      <div class="al-info"><b>${t.emoji} ${t.title}</b><small>${ds}　${bs}</small></div>
      <button class="al-del" data-del="${n}" aria-label="けす">🗑️</button></div>`;
  }).join('');
}

// ---- ドラッグ と タップ ----
let drag = null;
function slotAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const s = el && el.closest && el.closest('#boxSvg .slot');
  return s ? +s.dataset.slot : -1;
}
function onShelfDown(e) {
  const it = e.target.closest('.shelf-item');
  if (!it || game.closed) return;
  e.preventDefault();
  Sound.unlock();
  drag = { kind: it.dataset.kind, id: it.dataset.id, x: e.clientX, y: e.clientY, on: false, pid: e.pointerId, hover: -1 };
}
function onShelfMove(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.on && dx * dx + dy * dy > 100) {
    drag.on = true;
    const g = $('ghost');
    g.innerHTML = drag.kind === 'deco' ? Draw.decoIcon(DECO[drag.id]) : Draw.icon(FOOD[drag.id]);
    g.hidden = false;
    if (!(game.sel && game.sel.id === drag.id)) select(drag.kind, drag.id);
  }
  if (drag.on) {
    const g = $('ghost');
    g.style.transform = `translate(${e.clientX - 44}px, ${e.clientY - 60}px)`;
    const s = slotAt(e.clientX, e.clientY);
    if (s !== drag.hover) {
      document.querySelectorAll('#boxSvg .slot.hover').forEach((n) => n.classList.remove('hover'));
      if (s >= 0) { const n = $('boxSvg').querySelector(`.slot[data-slot="${s}"]`); if (n) n.classList.add('hover'); }
      drag.hover = s;
    }
  }
}
function onShelfUp(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const d = drag;
  drag = null;
  $('ghost').hidden = true;
  if (d.on) {
    const s = slotAt(e.clientX, e.clientY);
    if (s >= 0) place(s, { kind: d.kind, id: d.id });
    else renderBox();
  } else {
    select(d.kind, d.id);
  }
}
function onBoxClick(e) {
  if (game.closed || drag) return;
  const s = e.target.closest('.slot');
  if (!s) return;
  Sound.unlock();
  const i = +s.dataset.slot;
  if (game.sel) {
    if (game.sel.kind === 'food' && game.slots[i].food === game.sel.id) { removeAt(i); return; }
    place(i);
  } else if (game.slots[i].food) removeAt(i);
  else { Sound.sfx('hmm'); say('したの たな から たべもの を えらんで ね。', true); }
}

// ---- はじめ ----
function init() {
  const syncToggles = () => {
    $('btnSound').setAttribute('aria-pressed', Sound.on);
    $('btnSound').querySelector('i').textContent = Sound.on ? '🔊' : '🔇';
    $('btnVoice').setAttribute('aria-pressed', Sound.voice);
    $('btnVoice').querySelector('i').textContent = Sound.voice ? '🗣️' : '🤐';
  };
  $('btnSound').addEventListener('click', () => { Sound.unlock(); Sound.setOn(!Sound.on); syncToggles(); Sound.sfx('pick'); });
  $('btnVoice').addEventListener('click', () => { Sound.setVoice(!Sound.voice); syncToggles(); Sound.speak('よみあげ オン'); });
  syncToggles();
  $('btnBack').addEventListener('click', () => { Sound.unlock(); show('home'); });
  $('odaiList').addEventListener('click', (e) => { const b = e.target.closest('[data-theme]'); if (b) { Sound.unlock(); Sound.sfx('pick'); startTheme(b.dataset.theme); } });
  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { Sound.unlock(); Sound.sfx('pick'); show(b.dataset.go); }));
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    game.tab = b.dataset.tab; game.page = 0;
    Sound.sfx('pick');
    renderTabs(); renderShelf();
  });
  $('pgPrev').addEventListener('click', () => { game.page = Math.max(0, game.page - 1); Sound.sfx('pick'); renderShelf(); });
  $('pgNext').addEventListener('click', () => { game.page++; Sound.sfx('pick'); renderShelf(); });
  const sh = $('shelf');
  sh.addEventListener('pointerdown', onShelfDown);
  // ドラッグ中 に たな を かきなおす ので、うごき は window で うける
  window.addEventListener('pointermove', onShelfMove);
  window.addEventListener('pointerup', onShelfUp);
  window.addEventListener('pointercancel', () => { drag = null; $('ghost').hidden = true; });
  sh.addEventListener('keydown', (e) => {
    const it = e.target.closest('.shelf-item');
    if (it && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(it.dataset.kind, it.dataset.id); }
  });
  $('boxSvg').addEventListener('click', onBoxClick);
  $('btnLid').addEventListener('click', () => { Sound.unlock(); onLid(); });
  $('btnClear').addEventListener('click', () => {
    if (game.closed) return;
    game.slots.forEach((s) => { s.food = null; s.deco = null; });
    game.sel = null; game.gapWarned = false;
    Sound.sfx('remove'); renderBox(); renderShelf(); updateLidBtn();
    say('ぜんぶ だしたよ。もういちど つめて みよう。', false);
  });
  $('btnStory').addEventListener('click', () => { Sound.unlock(); say(game.theme.story, false); Sound.speak(plain(game.theme.title) + '。' + game.theme.story); });
  $('btnAgain').addEventListener('click', () => startTheme(game.theme.id));
  $('btnHome').addEventListener('click', () => show('home'));
  $('btnAlbum').addEventListener('click', () => show('album'));
  $('zFilters').addEventListener('click', (e) => { const b = e.target.closest('[data-zf]'); if (b) { zFilter = b.dataset.zf; renderZukan(); } });
  $('zGrid').addEventListener('click', (e) => { const b = e.target.closest('[data-food]'); if (b) openFood(b.dataset.food); });
  document.addEventListener('change', (e) => {
    if (!e.target.closest('.marks-toggle')) return;
    store.marks = e.target.checked; persist();
    if (current === 'zukan') renderZukan();
  });
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.closest('.m-close')) { $('modal').hidden = true; Sound.stopSpeak(); } });
  $('albumGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    store.album.splice(+b.dataset.del, 1); persist(); Sound.sfx('remove'); renderAlbum();
  });
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (current === 'play') renderShelf(); }, 120); });
  show('home');
}
init();
