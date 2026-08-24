/* にっぽん一周すごろく — ゲーム本体
 * ビルド不要。index.html を開くだけで動く。ルールの全体像は README.md を見てね。
 *
 * 盤面は map-data.js（国土数値情報由来の実際の県境データ）の上に置く。
 * 文章中の 漢字{よみ} は ruby() が ふりがな付きの HTML に変換する。
 */
'use strict';

/* ══════════════ 定数 ══════════════ */

const TURNS_PER_YEAR = 8;      // 1年 = 8ターン（2ターンで 1季節）
const TOTAL_YEARS    = 3;      // 3年 遊んで終了
const START_MONEY    = 1000;
const QUIZ_REWARD    = 150;
const DEST_REWARD    = 800;
const DEST_CONSOLE   = 250;    // 2番目以降に 目的地へ着いた人のごほうび
const MAX_QUESTS     = 2;
const SHOP_RETURN    = 0.42;   // お店の年間収益 = ねだん x これ

const SEASONS = [
  { name: '春{はる}', emoji: '🌸' },
  { name: '夏{なつ}', emoji: '🌻' },
  { name: '秋{あき}', emoji: '🍁' },
  { name: '冬{ふゆ}', emoji: '⛄' },
];

const TOKENS = [
  { emoji: '🐶', name: '犬{いぬ}のイヌタ',   short: 'イヌタ',   color: '#e08a3c', light: '#fdf0e2' },
  { emoji: '🐱', name: '猫{ねこ}のネコミ',   short: 'ネコミ',   color: '#c96b8e', light: '#fbeef3' },
  { emoji: '🐻', name: '熊{くま}のクマオ',   short: 'クマオ',   color: '#8a6a4f', light: '#f4efe9' },
  { emoji: '🦊', name: '狐{きつね}のキツネ', short: 'キツネ',   color: '#d9645e', light: '#fceeed' },
  { emoji: '🐼', name: 'パンダのパンタ',      short: 'パンタ',   color: '#5b6b7a', light: '#eef1f4' },
  { emoji: '🐧', name: 'ペンギンのペンコ',    short: 'ペンコ',   color: '#3f8fc0', light: '#e8f3fa' },
];

/* 3つの目的が だいたい同じ重さになるように決めた点数。
 * 目安（3年遊んだとき）：お金 100〜250点／カード 300〜450点／
 * 目的地 0〜600点／お店 100〜300点 */
const SCORE = { yenPerPoint: 20, perCard: 15, perArrival: 200, perShop: 15 };

const SAVE_KEY  = 'nippon-sugoroku-save-v1';
const DEX_KEY   = 'nippon-sugoroku-dex-v1';
const SOUND_KEY = 'nippon-sugoroku-sound-v1';

/* 雪の降る地方（冬のイベントで使う） */
const SNOWY_REGIONS = new Set(['hokkaido', 'tohoku']);
const SNOWY_PREFS = new Set(['niigata', 'toyama', 'ishikawa', 'fukui', 'nagano', 'gifu']);

/* ══════════════ 小道具 ══════════════ */

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randInt = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[randInt(arr.length)];

/* ルビの土台になれる文字＝漢字の並び、または数字（9.4 のような小数も）。
 * ここを「空白以外なんでも」にすると、HTMLのタグや属性まで巻きこんでしまう。 */
const RUBY_RE = /((?:[\u3005\u3006\u30F6\u4E00-\u9FFF\uF900-\uFAFF]+)|(?:[0-9\uFF10-\uFF19][0-9\uFF10-\uFF19.]*))\{([^}]*)\}/g;

/** 漢字{よみ} → <ruby>漢字<rt>よみ</rt></ruby> */
function ruby(s) {
  return String(s).replace(RUBY_RE, '<ruby>$1<rt>$2</rt></ruby>');
}
/** ふりがな記法と ruby タグを取り除いた ふつうの文字列（読み上げ・SVG用） */
function plain(s) {
  return String(s)
    .replace(/<rt>.*?<\/rt>/g, '')   // ふりがなの中身は 読み上げない
    .replace(/<[^>]*>/g, '')
    .replace(/\{[^}]*\}/g, '');
}
/** 「1,200円」。数字がルビの土台に入らないよう、ここだけ ruby タグを直接書く */
const yen = (n) => n.toLocaleString('ja-JP') + '<ruby>円<rt>えん</rt></ruby>';

const PREF_BY_ID = Object.fromEntries(PREFS.map((p) => [p.id, p]));
const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const CARDS_BY_PREF = {};
for (const c of CARDS) (CARDS_BY_PREF[c.pref] = CARDS_BY_PREF[c.pref] || []).push(c);

const RARE_LABEL = { 1: 'ふつう', 2: 'めずらしい', 3: 'でんせつ' };

/** 隣の県までの歩数（幅優先探索） */
function bfsFrom(startId) {
  const dist = { [startId]: 0 };
  const queue = [startId];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    for (const nx of PREF_BY_ID[cur].adj) {
      if (dist[nx] === undefined) { dist[nx] = dist[cur] + 1; queue.push(nx); }
    }
  }
  return dist;
}

/* ══════════════ 盤面の座標（実際の地図の上） ══════════════ */

/* 地図の表示範囲。沖縄のインセット枠が 元の viewBox より 左に はみ出るので、
 * その分だけ 左へ広げる */
const VB = (() => {
  const v = MAP_VIEWBOX.split(/\s+/).map(Number);   // [x, y, w, h]
  const extra = Math.max(0, v[0] - (OKI_FRAME.x - 6));
  return [v[0] - extra, v[1], v[2] + extra, v[3]];
})();
const NODE_R = 12;          // 駒のマルの半径（地図の単位）
const MIN_NODE_GAP = 46;    // 駒どうしの最小の間かく
const MAX_NODE_MOVE = 32;   // 県の代表点から どれだけ ずらしてよいか

(function layoutNodes() {
  const byName = Object.fromEntries(PREFECTURES.map((p) => [p.name, p]));
  for (const p of PREFS) {
    const m = byName[p.name];
    p.path = m.path;
    p.hx = m.lx; p.hy = m.ly;   // 県の代表点（引き出し線のもと）
    p.x = m.lx;  p.y = m.ly;    // 駒を置く場所
  }
  // 重ならないように押し広げつつ、代表点から離れすぎないよう引きもどす
  for (let it = 0; it < 900; it++) {
    for (let i = 0; i < PREFS.length; i++) {
      for (let j = i + 1; j < PREFS.length; j++) {
        const a = PREFS[i], b = PREFS[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < MIN_NODE_GAP) {
          const push = ((MIN_NODE_GAP - d) / 2) * 0.6, ux = dx / d, uy = dy / d;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
        }
      }
    }
    for (const p of PREFS) {
      const dx = p.x - p.hx, dy = p.y - p.hy, d = Math.hypot(dx, dy);
      if (d > MAX_NODE_MOVE) { p.x = p.hx + (dx / d) * MAX_NODE_MOVE; p.y = p.hy + (dy / d) * MAX_NODE_MOVE; }
    }
  }
  // 地図に書く短い名前（「県」「府」「都」を落とす。北海道はそのまま）
  for (const p of PREFS) p.shortName = p.name.replace(/[都府県]$/, '');
})();

/* ══════════════ 音 ══════════════ */

const sound = { bgm: true, se: true, voice: true };
(function loadSound() {
  try {
    const raw = localStorage.getItem(SOUND_KEY);
    if (raw) Object.assign(sound, JSON.parse(raw));
  } catch (e) { /* 無視 */ }
})();
function saveSound() {
  try { localStorage.setItem(SOUND_KEY, JSON.stringify(sound)); } catch (e) { /* 無視 */ }
}
function applySound() {
  SoundEngine.setSeEnabled(sound.se);
  SoundEngine.setVoiceEnabled(sound.voice);
  SoundEngine.setBgmEnabled(sound.bgm && inGame);
}
/** 文章を読み上げる（ふりがな記法は外す） */
function say(text) {
  if (sound.voice) SoundEngine.speak(plain(text));
}
/** お金の増減に あわせて 音を鳴らす */
function moneySound(delta) {
  if (delta > 0) SoundEngine.seCoin();
  else if (delta < 0) SoundEngine.seLose();
}

/* ══════════════ ずかん（ずっと残る） ══════════════ */

function loadDex() {
  try {
    const raw = localStorage.getItem(DEX_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) { return new Set(); }
}
function saveDex(set) {
  try { localStorage.setItem(DEX_KEY, JSON.stringify([...set])); } catch (e) { /* 無視 */ }
}
let DEX = loadDex();

/* ══════════════ ゲームの状態 ══════════════ */

let S = null;             // いまのゲーム
let busy = false;         // 処理中は操作を受けつけない
let pendingClick = null;  // 地図のタップ待ち
let inGame = false;

function newPlayer(name, tokenIndex, cpu) {
  const t = TOKENS[tokenIndex];
  return {
    name, cpu, token: tokenIndex,
    emoji: t.emoji, color: t.color, light: t.light,
    pos: 'tokyo', money: START_MONEY,
    cards: [], shops: [], quests: [],
    arrivals: 0, rest: 0, consolationYear: 0,
  };
}

function newGame(players) {
  S = { v: 1, year: 1, turnInYear: 0, cur: 0, players, dest: null, destTakenBy: null, usedDests: [] };
  chooseDestination();
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 無視 */ }
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return (s && s.v === 1 && Array.isArray(s.players) && s.players.length) ? s : null;
  } catch (e) { return null; }
}
function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 無視 */ }
}

/** 今年の目的地を決める（みんなから そこそこ遠いところ） */
function chooseDestination() {
  const used = new Set(S.usedDests);
  const dists = S.players.map((p) => bfsFrom(p.pos));
  const scored = PREFS.filter((p) => !used.has(p.id))
    .map((p) => ({ id: p.id, d: Math.min(...dists.map((dm) => dm[p.id] ?? 99)) }));
  let cands = scored.filter((s) => s.d >= 6 && s.d <= 12);
  if (!cands.length) cands = scored.filter((s) => s.d >= 4);
  if (!cands.length) cands = scored;
  const best = pick(cands);
  S.dest = best.id;
  S.destTakenBy = null;
  S.usedDests.push(best.id);
}

/* ══════════════ 地図を描く ══════════════ */

const SVG_NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, text) => {
  const n = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text !== undefined) n.textContent = text;
  return n;
};

function buildMap() {
  const svg = $('#map');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', VB.join(' '));

  // ① 都道府県のかたち
  const gShapes = el('g', { id: 'shapes' });
  for (const p of PREFS) {
    const path = el('path', {
      class: 'pref-shape', 'data-id': p.id, d: p.path,
      fill: REGIONS[p.region].fill,
    });
    path.addEventListener('click', () => onNodeClick(p.id));
    gShapes.appendChild(path);
  }
  svg.appendChild(gShapes);

  // ② 沖縄県のインセット枠
  const f = OKI_FRAME;
  const gOki = el('g', { id: 'oki-frame' });
  gOki.appendChild(el('rect', { x: f.x, y: f.y, width: f.w, height: f.h, rx: 10, class: 'oki-rect' }));
  gOki.appendChild(el('text', { x: f.x + 8, y: f.y + 22, class: 'oki-label' }, '沖縄県（拡大）'));
  svg.appendChild(gOki);

  // ③ 県と県をむすぶ道
  const gLinks = el('g', { id: 'links' });
  const drawn = new Set();
  for (const p of PREFS) {
    for (const q of p.adj) {
      const key = [p.id, q].sort().join('|');
      if (drawn.has(key)) continue;
      drawn.add(key);
      const o = PREF_BY_ID[q];
      gLinks.appendChild(el('line', {
        x1: p.x, y1: p.y, x2: o.x, y2: o.y,
        class: 'link-line' + (SEA_LINKS.has(key) ? ' sea' : ''),
      }));
    }
  }
  svg.appendChild(gLinks);

  // ④ 駒を置くマル＋県名（ふりがなは上に小さく）
  const gNodes = el('g', { id: 'nodes' });
  for (const p of PREFS) {
    // 代表点から ずれている駒には 引き出し線をひく
    if (Math.hypot(p.x - p.hx, p.y - p.hy) > 8) {
      gNodes.appendChild(el('line', { x1: p.hx, y1: p.hy, x2: p.x, y2: p.y, class: 'leader' }));
      gNodes.appendChild(el('circle', { cx: p.hx, cy: p.hy, r: 2.6, class: 'leader-dot' }));
    }
    const g = el('g', { class: 'node', 'data-id': p.id, transform: `translate(${p.x},${p.y})` });
    g.appendChild(el('circle', { class: 'node-ring', r: NODE_R + 9 }));
    g.appendChild(el('circle', { class: 'node-circle', r: NODE_R, fill: REGIONS[p.region].color }));
    g.appendChild(el('text', { class: 'node-check', y: 4 }, ''));
    g.appendChild(el('text', { class: 'node-kana', y: NODE_R + 8 }, p.kana));
    g.appendChild(el('text', { class: 'node-name', y: NODE_R + 20 }, p.shortName));
    g.appendChild(el('circle', { class: 'node-hit', r: NODE_R + 10 }));
    g.addEventListener('click', () => onNodeClick(p.id));
    gNodes.appendChild(g);
  }
  svg.appendChild(gNodes);
  svg.appendChild(el('g', { id: 'owners' }));
  svg.appendChild(el('g', { id: 'tokens' }));
}

function renderMap(selectable) {
  const sel = new Set(selectable || []);
  const me = S.players[S.cur];
  const owned = {};
  for (const p of S.players) for (const s of p.shops) (owned[s.pref] = owned[s.pref] || []).push(p);

  for (const shape of $$('#map .pref-shape')) {
    const id = shape.dataset.id;
    shape.classList.toggle('selectable', sel.has(id));
    shape.classList.toggle('is-dest', S.dest === id && S.destTakenBy === null);
    shape.classList.toggle('is-here', me.pos === id);
  }
  for (const g of $$('#map .node')) {
    const id = g.dataset.id;
    g.classList.toggle('selectable', sel.has(id));
    g.classList.toggle('is-dest', S.dest === id && S.destTakenBy === null);
    // カードを全部あつめた県には ✔
    const left = (CARDS_BY_PREF[id] || []).some((c) => c.rare < 3 && !me.cards.includes(c.id));
    g.querySelector('.node-check').textContent = left ? '' : '✓';
  }

  // お店の持ち主を示す小さなマル
  const gOwners = $('#owners');
  gOwners.innerHTML = '';
  for (const prefId in owned) {
    const p = PREF_BY_ID[prefId];
    owned[prefId].slice(0, 3).forEach((pl, i) => {
      gOwners.appendChild(el('circle', {
        cx: p.x + NODE_R - 2 + i * 7, cy: p.y - NODE_R - 3, r: 3.4,
        fill: pl.color, stroke: '#fff', 'stroke-width': 1.4,
      }));
    });
  }

  // 駒
  const gTokens = $('#tokens');
  gTokens.innerHTML = '';
  const byPos = {};
  S.players.forEach((pl, i) => (byPos[pl.pos] = byPos[pl.pos] || []).push(i));
  for (const posId in byPos) {
    const p = PREF_BY_ID[posId];
    const list = byPos[posId];
    list.forEach((pi, k) => {
      const pl = S.players[pi];
      const gap = list.length > 2 ? 9 : 10;
      const cx = p.x + (k - (list.length - 1) / 2) * gap;
      const cy = p.y;
      gTokens.appendChild(el('circle', {
        class: 'token-bg', cx, cy, r: 9.5, fill: pl.color,
        opacity: pi === S.cur ? 1 : 0.7,
      }));
      gTokens.appendChild(el('text', { class: 'token', x: cx, y: cy + 4.6 }, pl.emoji));
    });
  }
}

/* 3段階：ふつう → すこし引いた → 日本ぜんたい（画面にぴったり） */
const ZOOM_LEVELS = [1.5, 1.0, 'fit'];
let zoomIndex = 0;

function zoomValue(i) {
  const v = ZOOM_LEVELS[i];
  if (v !== 'fit') return v;
  const w = $('#map-wrap').clientWidth || VB[2];
  return Math.max(0.15, Math.min(1.4, w / VB[2]));
}

function applyZoom(i) {
  zoomIndex = ((i % ZOOM_LEVELS.length) + ZOOM_LEVELS.length) % ZOOM_LEVELS.length;
  const z = zoomValue(zoomIndex);
  const svg = $('#map');
  svg.style.width = (VB[2] * z) + 'px';
  svg.style.height = (VB[3] * z) + 'px';
  // 小さすぎて県名が読めないときは、かたちだけの「ぜんたい地図」にする
  svg.classList.toggle('overview', z < 0.7);
  const btn = $('#btn-zoom');
  if (btn) {
    btn.innerHTML = ruby(ZOOM_LEVELS[zoomIndex] === 'fit'
      ? '🔍 全体{ぜんたい}'
      : `🔍 ${Math.round((z / ZOOM_LEVELS[0]) * 100)}%`);
  }
}

function centerOn(prefId) {
  const wrap = $('#map-wrap');
  const p = PREF_BY_ID[prefId];
  const svg = $('#map');
  const scale = (svg.clientWidth || VB[2]) / VB[2];
  wrap.scrollTo({
    left: (p.x - VB[0]) * scale - wrap.clientWidth / 2,
    top: (p.y - VB[1]) * scale - wrap.clientHeight / 2,
    behavior: 'smooth',
  });
}

function onNodeClick(id) {
  if (!pendingClick || !pendingClick.allowed.has(id)) return;
  const fn = pendingClick.resolve;
  pendingClick = null;
  SoundEngine.seStep();
  renderMap([]);
  fn(id);
}

/* ══════════════ まど（モーダル）とトースト ══════════════ */

function modal(opts) {
  return new Promise((resolve) => {
    const box = $('#overlay-box');
    const acts = opts.actions && opts.actions.length
      ? opts.actions
      : [{ label: '次{つぎ}へ', value: 'ok', primary: true }];
    box.innerHTML = ruby(`
      ${opts.kicker ? `<p class="m-kicker">${opts.kicker}</p>` : ''}
      ${opts.emoji ? `<div class="m-emoji">${opts.emoji}</div>` : ''}
      ${opts.title ? `<h2 class="m-title">${opts.title}${opts.yomi ? `<span class="yomi">${opts.yomi}</span>` : ''}</h2>` : ''}
      ${opts.html || ''}`) + '<div class="m-actions"></div>';
    const wrap = box.querySelector('.m-actions');
    acts.forEach((a) => {
      const b = document.createElement('button');
      b.className = a.primary ? 'primary' : '';
      b.innerHTML = ruby(a.label + (a.sub ? `<span class="sub">${a.sub}</span>` : ''));
      b.disabled = !!a.disabled;
      b.addEventListener('click', () => {
        SoundEngine.seTap();
        if (opts.onPick) { opts.onPick(a.value, b, wrap, resolve); return; }
        SoundEngine.stopSpeak();
        closeModal();
        resolve(a.value);
      });
      wrap.appendChild(b);
    });
    $('#overlay').hidden = false;
    box.scrollTop = 0;
    if (opts.speak) say(opts.speak);
  });
}
function closeModal() { $('#overlay').hidden = true; }

function toast(msg, ms = 1700) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = ruby(msg);
  $('#toast-area').appendChild(t);
  setTimeout(() => t.remove(), ms);
  return sleep(Math.min(ms, 650));
}

/* ══════════════ カード ══════════════ */

function cardHTML(c) {
  const cat = CARD_CATS[c.cat];
  const pref = PREF_BY_ID[c.pref];
  return `<div class="cardview" style="--cc:${cat.color};--cc-l:${cat.color}1a">
    <div class="cv-emoji">${cat.emoji}</div>
    <span class="cv-rare">${RARE_LABEL[c.rare]}</span>
    <div class="cv-name">${c.name}</div>
    <div class="cv-meta">No.${c.id} ／ ${pref.name} ／ ${cat.label}</div>
    <p class="cv-text">${c.text}</p>
  </div>`;
}

/** その県で まだ持っていないカードを1枚えらぶ（でんせつは のぞく） */
function drawCard(player, prefId, includeLegendary) {
  const pool = (CARDS_BY_PREF[prefId] || []).filter(
    (c) => !player.cards.includes(c.id) && (includeLegendary ? true : c.rare < 3)
  );
  if (!pool.length) return null;
  const weighted = [];
  for (const c of pool) {
    const w = c.rare === 1 ? 4 : c.rare === 2 ? 2 : 1;
    for (let i = 0; i < w; i++) weighted.push(c);
  }
  return pick(weighted);
}

function giveCard(player, card) {
  player.cards.push(card.id);
  DEX.add(card.id);
  saveDex(DEX);
}

/* ══════════════ お使い（クエスト） ══════════════ */

function makeQuest(fromPrefId) {
  const dist = bfsFrom(fromPrefId);
  let cands = PREFS.filter((p) => dist[p.id] >= 3 && dist[p.id] <= 7);
  if (!cands.length) cands = PREFS.filter((p) => dist[p.id] >= 2);
  const to = pick(cands);
  const goods = (CARDS_BY_PREF[fromPrefId] || []).filter((c) => c.cat === 'food' || c.cat === 'craft');
  const item = (goods.length ? pick(goods) : pick(CARDS_BY_PREF[fromPrefId])).name;
  const hops = dist[to.id];
  return { from: fromPrefId, to: to.id, item, reward: hops * 70 + 140, hops };
}

function questText(q) {
  return `${PREF_BY_ID[q.from].name}の「${q.item}」を <b>${PREF_BY_ID[q.to].name}</b> へ 届{とど}ける`;
}

/* ══════════════ お店 ══════════════ */

const shopIncome = (price) => Math.round((price * SHOP_RETURN) / 10) * 10;

function shopsOf(prefId) {
  return PREF_BY_ID[prefId].shops.map(([name, price], idx) => ({
    prefId, idx, name, price, income: shopIncome(price),
  }));
}
function shopOwner(prefId, idx) {
  return S.players.find((p) => p.shops.some((s) => s.pref === prefId && s.idx === idx)) || null;
}

/* ══════════════ 季節のできごと ══════════════ */

const EVENTS = [
  { id: 'snow', season: 3,
    when: (p) => SNOWY_REGIONS.has(PREF_BY_ID[p.pos].region) || SNOWY_PREFS.has(p.pos),
    emoji: '❄️', title: '大雪{おおゆき}！',
    text: (p) => `${PREF_BY_ID[p.pos].name}は 雪{ゆき}で 電車{でんしゃ}が 止{と}まってしまった。次{つぎ}の ターンは お休{やす}み。`,
    apply: (p) => { p.rest = 1; SoundEngine.seRest(); } },
  { id: 'festival', season: 1, emoji: '🎆', title: '夏祭{なつまつ}り！',
    text: (p) => `${PREF_BY_ID[p.pos].name}の お祭{まつ}りを 手伝{てつだ}ったら お礼{れい}を もらったよ。`,
    money: 220 },
  { id: 'hanami', season: 0, emoji: '🌸', title: 'お花見{はなみ}',
    text: (p) => `${PREF_BY_ID[p.pos].name}の 桜{さくら}が 満開{まんかい}。観光客{かんこうきゃく}の 案内{あんない}を して お小遣{こづか}いを もらった。`,
    money: 170 },
  { id: 'harvest', season: 2, emoji: '🌾', title: '収穫{しゅうかく}の 手伝{てつだ}い',
    text: (p) => `${PREF_BY_ID[p.pos].name}の 畑{はたけ}を 手伝{てつだ}って、お礼{れい}を もらったよ。`,
    money: 200 },
  { id: 'souvenir', emoji: '🎁', title: 'お土産{みやげ}を 買{か}った',
    text: (p) => `${PREF_BY_ID[p.pos].name}の お土産屋{みやげや}さんで つい 買{か}いすぎちゃった。`,
    money: -120 },
  { id: 'lost', emoji: '💸', title: '財布{さいふ}を 落{お}とした',
    text: () => 'あわてて 探{さが}したけれど、少{すこ}し なくなっていた…。',
    money: -150 },
  { id: 'localtrain', emoji: '🚃', title: '観光列車{かんこうれっしゃ}',
    text: (p) => `${PREF_BY_ID[p.pos].name}の 観光列車{かんこうれっしゃ}に 乗{の}って 気分転換{きぶんてんかん}。駅弁{えきべん}も もらった！`,
    money: 130 },
];

function rollEvent(player, seasonIdx) {
  const pool = EVENTS.filter((e) => (e.season === undefined || e.season === seasonIdx)
    && (!e.when || e.when(player)));
  return pool.length ? pick(pool) : null;
}

/* ══════════════ ゲームの流れ ══════════════ */

/* 1年の最後の処理中は turnInYear が 8 になるので、はみ出さないようにする */
const seasonIndex = () => Math.min(Math.floor(S.turnInYear / 2), SEASONS.length - 1);

function renderHUD() {
  const s = SEASONS[seasonIndex()];
  $('#hud-year').innerHTML = ruby(`${S.year}年目{ねんめ} / ${TOTAL_YEARS}`);
  $('#hud-season').innerHTML = ruby(`${s.emoji} ${s.name}`);
  const d = PREF_BY_ID[S.dest];
  $('#hud-dest').innerHTML = ruby(S.destTakenBy === null
    ? `📍 ${d.name}`
    : `${d.name}（${S.players[S.destTakenBy].name} 到着{とうちゃく}）`);
  $('.hud-dest').classList.toggle('reached', S.destTakenBy !== null);
  $('#hud-turns').innerHTML = ruby(`${TURNS_PER_YEAR - S.turnInYear}回{かい}`);
}

function renderPlayers() {
  const box = $('#players');
  box.innerHTML = '';
  S.players.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'pstat' + (i === S.cur ? ' is-cur' : '');
    d.style.setProperty('--pc', p.color);
    d.style.setProperty('--pc-l', p.light);
    d.innerHTML = ruby(`
      <div class="pname">${p.emoji} ${p.name}${p.cpu ? '<span class="cpu-tag">CPU</span>' : ''}</div>
      <div class="pnums">
        <span>💰<b>${p.money.toLocaleString('ja-JP')}</b></span>
        <span>🃏<b>${p.cards.length}</b></span>
        <span>📍<b>${p.arrivals}</b></span>
        <span>🏪<b>${p.shops.length}</b></span>
      </div>`);
    box.appendChild(d);
  });
}

function renderBanner() {
  const p = S.players[S.cur];
  $('#turn-banner-text').innerHTML = ruby(
    `${p.emoji} <b style="color:${p.color}">${p.name}</b> の番{ばん} — いま ${PREF_BY_ID[p.pos].name}`);
}

function render(selectable) {
  renderHUD();
  renderPlayers();
  renderBanner();
  renderMap(selectable);
}

function setDiceEnabled(on, label) {
  const b = $('#btn-dice');
  b.disabled = !on;
  b.hidden = !on;
  if (label) b.innerHTML = ruby(label);
  $('#step-info').hidden = on;
}

async function startTurn() {
  busy = false;
  const p = S.players[S.cur];
  render([]);
  centerOn(p.pos);

  if (p.rest > 0) {
    p.rest--;
    setDiceEnabled(false);
    SoundEngine.seRest();
    $('#step-info').innerHTML = ruby(`${p.name}は お休{やす}み…`);
    await toast(`😴 ${p.name}は 1回{かい} お休{やす}み`, 1500);
    await sleep(400);
    return endTurn();
  }

  if (p.cpu) {
    setDiceEnabled(false);
    $('#step-info').innerHTML = ruby(`${p.name}（CPU）が 考{かんが}えています…`);
    await sleep(600);
    return doRoll();
  }

  setDiceEnabled(true, '🎲 サイコロを ふる');
}

async function doRoll() {
  if (busy) return;
  busy = true;
  setDiceEnabled(false);
  const p = S.players[S.cur];

  const box = $('#dice-box');
  const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  box.classList.add('rolling');
  SoundEngine.seDice();
  for (let i = 0; i < 6; i++) { $('#dice-face').textContent = faces[randInt(6)]; await sleep(65); }
  const n = 1 + randInt(6);
  box.classList.remove('rolling');
  $('#dice-face').textContent = faces[n - 1];
  SoundEngine.seDiceStop();
  await toast(`🎲 ${n} が 出{で}た！`, 1000);

  await moveSteps(p, n);
  await resolveLanding(p);
  endTurn();
}

/** サイコロの目の数だけ、1マスずつ進む */
async function moveSteps(player, steps) {
  let prev = null;
  for (let i = steps; i > 0; i--) {
    const here = PREF_BY_ID[player.pos];
    let options = here.adj.filter((id) => id !== prev);
    if (!options.length) options = here.adj.slice();   // 行き止まりは もどれる

    let next;
    if (player.cpu) {
      next = cpuChoose(player, options);
      render(options);
      await sleep(220);
      SoundEngine.seStep();
    } else {
      $('#step-info').innerHTML = ruby(`あと <b>${i}</b> マス — 進{すす}む先{さき}を タップしてね`);
      render(options);
      next = await waitForNode(options);
    }
    prev = player.pos;
    player.pos = next;
    render([]);
    centerOn(next);
    if (i > 1) await sleep(player.cpu ? 150 : 200);
  }
  $('#step-info').textContent = '';
}

function waitForNode(options) {
  return new Promise((resolve) => { pendingClick = { allowed: new Set(options), resolve }; });
}

const CPU_WANDER = 0.25;   // これくらいの確率で 最短ルートを選ばない

/** CPUの行き先えらび：いまの ねらいに いちばん近づく 隣の県 */
function cpuChoose(player, options) {
  if (options.length > 1 && Math.random() < CPU_WANDER) return pick(options);
  const target = cpuTarget(player);
  const dist = bfsFrom(target);
  let best = options[0], bestD = Infinity;
  for (const o of options) {
    let d = dist[o] ?? 99;
    const left = (CARDS_BY_PREF[o] || []).some((c) => c.rare < 3 && !player.cards.includes(c.id));
    if (left) d -= 0.4;
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

function cpuTarget(player) {
  if (S.destTakenBy === null) return S.dest;
  if (player.quests.length) return player.quests[0].to;
  const dist = bfsFrom(player.pos);
  const cands = PREFS
    .filter((p) => (CARDS_BY_PREF[p.id] || []).some((c) => c.rare < 3 && !player.cards.includes(c.id)))
    .sort((a, b) => (dist[a.id] ?? 99) - (dist[b.id] ?? 99));
  return cands.length ? cands[0].id : S.dest;
}

/* ══════════════ マスに止まったときの処理 ══════════════ */

async function resolveLanding(player) {
  const pref = PREF_BY_ID[player.pos];
  const cpu = player.cpu;
  const card = drawCard(player, player.pos, false);

  /* ① 到着＋ご当地情報（＋カード） */
  if (card) giveCard(player, card);
  if (cpu) {
    await toast(`${player.emoji} ${player.name} が ${pref.name} に 到着{とうちゃく}`
      + (card ? `<br>🃏 カード「${card.name}」を 発見{はっけん}` : ''), 1500);
    if (card) SoundEngine.seCard();
  } else {
    await modal({
      kicker: `${REGIONS[pref.region].label}地方{ちほう}`,
      emoji: '🚩',
      title: pref.name,
      yomi: `${pref.kana} ／ 県庁所在地{けんちょうしょざいち}：${pref.capital}`,
      html: `<p class="m-body">${pref.trivia}</p>`,
      speak: `${pref.name}。${pref.trivia}`,
    });
    if (card) {
      SoundEngine.seCard();
      await modal({ kicker: 'ひみつのカードを 発見{はっけん}！', html: cardHTML(card),
        speak: `${card.name}。${card.text}` });
    } else {
      player.money += 100;
      SoundEngine.seCoin();
      await modal({
        emoji: '🃏', title: 'カードは そろっているよ',
        html: `<p class="m-body center">${pref.name}の カードは 全部{ぜんぶ} 集{あつ}めずみ。<br>お土産代{みやげだい}を もらった。</p>
               <p class="m-money plus">＋${yen(100)}</p>`,
      });
    }
  }
  render([]);

  /* ② 目的地に到着 */
  if (player.pos === S.dest && S.destTakenBy === null) {
    S.destTakenBy = S.cur;
    player.arrivals++;
    player.money += DEST_REWARD;
    const legend = drawCard(player, player.pos, true);
    const bonus = legend && legend.rare === 3 ? legend : null;
    if (bonus) giveCard(player, bonus);
    SoundEngine.seFanfare();
    if (cpu) {
      await toast(`📍 ${player.name} が 目的地{もくてきち} ${pref.name} に 一番{いちばん}のり！ ＋${yen(DEST_REWARD)}`, 2000);
      if (bonus) await toast(`👑 でんせつカード「${bonus.name}」を 手{て}に入{い}れた`, 1800);
    } else {
      await modal({
        emoji: '🎉', kicker: '一番{いちばん}のり！', title: '目的地{もくてきち} 到着{とうちゃく}',
        html: `<p class="m-body center">${S.year}年目{ねんめ}の 目的地{もくてきち} <b>${pref.name}</b> に 到着{とうちゃく}！</p>
               <p class="m-money plus">＋${yen(DEST_REWARD)}</p>`,
        speak: `目的地 ${pref.name} に 一番のり！`,
      });
      if (bonus) await modal({ kicker: 'でんせつカードを もらった！', html: cardHTML(bonus),
        speak: `${bonus.name}。${bonus.text}` });
    }
    render([]);
  }
  // 2番目以降のごほうびは 1年に1回だけ
  else if (player.pos === S.dest && S.destTakenBy !== S.cur && player.consolationYear !== S.year) {
    player.consolationYear = S.year;
    player.money += DEST_CONSOLE;
    SoundEngine.seCoin();
    if (cpu) {
      await toast(`📍 ${player.name} も 目的地{もくてきち}に 到着{とうちゃく} ＋${yen(DEST_CONSOLE)}`, 1200);
    } else {
      await modal({
        emoji: '🏳️', title: '目的地{もくてきち}に ついた！',
        html: `<p class="m-body center">一番{いちばん}のりは ${S.players[S.destTakenBy].name} だったけれど、<br>
               記念品{きねんひん}を もらったよ。</p><p class="m-money plus">＋${yen(DEST_CONSOLE)}</p>`,
      });
    }
    render([]);
  }

  /* ③ お使いの達成 */
  const done = player.quests.filter((q) => q.to === player.pos);
  for (const q of done) {
    player.quests = player.quests.filter((x) => x !== q);
    player.money += q.reward;
    SoundEngine.seCoin();
    if (cpu) {
      await toast(`📮 ${player.name} が お使{つか}い 達成{たっせい} ＋${yen(q.reward)}`, 1500);
    } else {
      await modal({
        emoji: '📮', title: 'お使{つか}い 達成{たっせい}！',
        html: `<p class="m-body center">${questText(q)}<br>ぶじに 届{とど}けたよ。</p>
               <p class="m-money plus">＋${yen(q.reward)}</p>`,
      });
    }
  }
  render([]);

  /* ④ ご当地クイズ */
  await doQuiz(player, pref);
  render([]);

  /* ⑤ お店／お使い のアクション */
  await doActions(player, pref);
  render([]);

  /* ⑥ 季節のできごと（ときどき） */
  if (Math.random() < 0.28) {
    const ev = rollEvent(player, seasonIndex());
    if (ev) {
      const delta = ev.money || 0;
      if (delta) { player.money = Math.max(0, player.money + delta); moneySound(delta); }
      if (ev.apply) ev.apply(player);
      const s = SEASONS[seasonIndex()];
      if (cpu) {
        await toast(`${ev.emoji} ${player.name}：${ev.title}`
          + (delta ? `（${delta > 0 ? '＋' : '－'}${yen(Math.abs(delta))}）` : ''), 1600);
      } else {
        await modal({
          kicker: `${s.emoji} ${s.name}の できごと`,
          emoji: ev.emoji, title: ev.title,
          html: `<p class="m-body center">${ev.text(player)}</p>
                 ${delta ? `<p class="m-money ${delta > 0 ? 'plus' : 'minus'}">${delta > 0 ? '＋' : '－'}${yen(Math.abs(delta))}</p>` : ''}`,
          speak: ev.text(player),
        });
      }
    }
  }
  render([]);
}

async function doQuiz(player, pref) {
  const q = pref.quiz;
  if (player.cpu) {
    const ok = Math.random() < 0.65;
    if (ok) { player.money += QUIZ_REWARD; SoundEngine.seCorrect(); } else SoundEngine.seWrong();
    await toast(`❓ ${player.name} のクイズ：${ok ? `正解{せいかい}！ ＋${yen(QUIZ_REWARD)}` : '残念{ざんねん}…'}`, 1200);
    return;
  }
  const order = [0, 1, 2].sort(() => Math.random() - 0.5);
  await new Promise((done) => {
    modal({
      kicker: `${pref.name}のクイズ`, emoji: '❓', title: q.q,
      html: `<p class="m-note" style="text-align:center">正解{せいかい}すると ${yen(QUIZ_REWARD)} もらえるよ</p>`,
      actions: order.map((i) => ({ label: q.a[i], value: i })),
      speak: q.q,
      onPick: (val, btn, wrap, resolve) => {
        const correct = val === q.c;
        Array.from(wrap.children).forEach((b, k) => {
          b.disabled = true;
          if (order[k] === q.c) b.classList.add('right');
        });
        if (!correct) btn.classList.add('wrong');
        if (correct) { player.money += QUIZ_REWARD; SoundEngine.seCorrect(); } else SoundEngine.seWrong();
        renderPlayers();
        const msg = document.createElement('p');
        msg.className = correct ? 'm-money plus' : 'm-money minus';
        msg.innerHTML = ruby(correct
          ? `正解{せいかい}！ ＋${yen(QUIZ_REWARD)}`
          : `残念{ざんねん}… 答{こた}えは「${plain(q.a[q.c])}」`);
        wrap.parentElement.insertBefore(msg, wrap);
        say(correct ? '正解！' : `残念。答えは ${plain(q.a[q.c])}`);
        const next = document.createElement('button');
        next.className = 'primary';
        next.innerHTML = ruby('次{つぎ}へ');
        next.addEventListener('click', () => {
          SoundEngine.seTap(); SoundEngine.stopSpeak(); closeModal(); resolve('done'); done();
        });
        wrap.appendChild(next);
        next.scrollIntoView({ block: 'nearest' });
      },
    });
  });
}

async function doActions(player, pref) {
  if (player.cpu) {
    const free = shopsOf(pref.id).filter((s) => !shopOwner(s.prefId, s.idx));
    const buyable = free.filter((s) => player.money - s.price >= 500)
      .sort((a, b) => b.income / b.price - a.income / a.price);
    if (buyable.length) {
      const s = buyable[0];
      player.money -= s.price;
      player.shops.push({ pref: s.prefId, idx: s.idx });
      SoundEngine.seStamp();
      await toast(`🏪 ${player.name} が「${s.name}」を 買{か}った（${yen(s.price)}）`, 1200);
    } else if (player.quests.length < MAX_QUESTS) {
      const q = makeQuest(pref.id);
      player.quests.push(q);
      await toast(`📮 ${player.name} が お使{つか}いを 受{う}けた（${PREF_BY_ID[q.to].name}へ）`, 1200);
    }
    return;
  }

  while (true) {
    const stillFree = shopsOf(pref.id).filter((s) => !shopOwner(s.prefId, s.idx));
    const actions = [];
    for (const s of stillFree) {
      actions.push({
        label: `🏪 「${s.name}」を 買{か}う`,
        sub: `${yen(s.price)} ／ 毎年{まいとし} ${yen(s.income)} 入{はい}る`,
        value: { kind: 'buy', shop: s },
        disabled: player.money < s.price,
      });
    }
    if (player.quests.length < MAX_QUESTS) {
      actions.push({ label: '📮 お使{つか}いを 受{う}ける', sub: '届{とど}けると お金{かね}が もらえる', value: { kind: 'quest' } });
    }
    actions.push({ label: '次{つぎ}へ ▶', value: { kind: 'end' }, primary: true });

    const chosen = await modal({
      kicker: `${pref.name}で できること`,
      title: `持{も}ち金{きん} ${yen(player.money)}`,
      html: player.quests.length
        ? `<p class="m-note">📮 受{う}けている お使{つか}い：${player.quests.map((q) => questText(q)).join('／')}</p>`
        : '',
      actions,
    });

    if (chosen.kind === 'end') return;
    if (chosen.kind === 'buy') {
      const s = chosen.shop;
      player.money -= s.price;
      player.shops.push({ pref: s.prefId, idx: s.idx });
      renderPlayers();
      SoundEngine.seStamp();
      await modal({
        emoji: '🏪', title: 'お店{みせ}を 買{か}った！',
        html: `<p class="m-body center"><b>${pref.name}</b> の「${s.name}」が あなたの お店{みせ}に。<br>
               毎年{まいとし} 12月{がつ}に <b>${yen(s.income)}</b> 入{はい}ってくるよ。</p>
               <p class="m-money minus">－${yen(s.price)}</p>`,
      });
    }
    if (chosen.kind === 'quest') {
      const q = makeQuest(pref.id);
      player.quests.push(q);
      await modal({
        emoji: '📮', title: 'お使{つか}いを 受{う}けた',
        html: `<p class="m-body center">${questText(q)}</p>
               <p class="m-note" style="text-align:center">届{とど}けると <b>${yen(q.reward)}</b> もらえる（歩{ある}いて 約{やく} ${q.hops} 県分{けんぶん}）</p>`,
        speak: `${plain(PREF_BY_ID[q.from].name)}の ${plain(q.item)} を ${plain(PREF_BY_ID[q.to].name)} へ 届けよう`,
      });
    }
  }
}

/* ══════════════ ターン／年の切りかえ ══════════════ */

function endTurn() {
  S.cur++;
  if (S.cur >= S.players.length) {
    S.cur = 0;
    S.turnInYear++;
    if (S.turnInYear >= TURNS_PER_YEAR) { save(); return yearEnd(); }
  }
  save();
  startTurn();
}

async function yearEnd() {
  render([]);
  const rows = S.players.map((p) => {
    const income = p.shops.reduce((sum, s) => sum + shopIncome(PREF_BY_ID[s.pref].shops[s.idx][1]), 0);
    p.money += income;
    return { p, income };
  });
  if (rows.some((r) => r.income > 0)) SoundEngine.seCoin();

  await modal({
    emoji: '📅', kicker: `${S.year}年目{ねんめ} おわり`, title: 'お店{みせ}の 決算{けっさん}',
    html: `<div class="info-grid">${rows.map((r) =>
      `<dt>${r.p.emoji} ${r.p.name}</dt><dd>${r.income ? `＋${yen(r.income)}` : 'お店{みせ} なし'}　→　${yen(r.p.money)}</dd>`
    ).join('')}</div>
    <p class="m-note">お店{みせ}は 毎年{まいとし} 12月{がつ}に 収益{しゅうえき}が 入{はい}るよ。</p>`,
  });
  renderPlayers();

  if (S.year >= TOTAL_YEARS) { save(); return finish(); }

  S.year++;
  S.turnInYear = 0;
  S.cur = 0;
  chooseDestination();
  save();
  render([]);
  await announceDestination();
  startTurn();
}

function announceDestination() {
  const d = PREF_BY_ID[S.dest];
  centerOn(S.dest);
  return modal({
    emoji: '📍', kicker: `${S.year}年目{ねんめ} スタート`, title: '新{あたら}しい 目的地{もくてきち}',
    html: `<p class="m-body center">今年{ことし}の 目的地{もくてきち}は<br>
           <b style="font-size:24px">${d.name}（${d.kana}）</b></p>
           <p class="m-note" style="text-align:center">一番{いちばん}のりで 到着{とうちゃく}すると ${yen(DEST_REWARD)} と でんせつカード！</p>`,
    speak: `今年の 目的地は ${plain(d.name)}`,
  });
}

/* ══════════════ 結果 ══════════════ */

function scoreOf(p) {
  const money = Math.round(p.money / SCORE.yenPerPoint);
  const cards = p.cards.length * SCORE.perCard;
  const arr = p.arrivals * SCORE.perArrival;
  const shops = p.shops.length * SCORE.perShop;
  return { money, cards, arr, shops, total: money + cards + arr + shops };
}

function finish() {
  clearSave();
  SoundEngine.seFanfare();
  const ranked = S.players.map((p) => ({ p, s: scoreOf(p) })).sort((a, b) => b.s.total - a.s.total);
  const medals = ['🥇', '🥈', '🥉', '🏅'];

  $('#result-body').innerHTML = ruby(`
    <h2>🏁 3年間{ねんかん}の 旅{たび}が おわった！</h2>
    <p class="winner">${medals[0]} 優勝{ゆうしょう}：${ranked[0].p.emoji} ${ranked[0].p.name}</p>
    ${ranked.map((r, i) => `
      <div class="rank-card${i === 0 ? ' first' : ''}">
        <div class="rank-head">
          <span class="medal">${medals[Math.min(i, 3)]}</span>
          <span>${r.p.emoji} ${r.p.name}</span>
          <span class="total">${r.s.total} 点{てん}</span>
        </div>
        <div class="rank-rows">
          <span class="lbl">💰 お金{かね}</span><span class="val">${yen(r.p.money)}</span><span class="pts">${r.s.money} 点{てん}</span>
          <span class="lbl">🃏 ひみつのカード</span><span class="val">${r.p.cards.length} / 100 枚{まい}</span><span class="pts">${r.s.cards} 点{てん}</span>
          <span class="lbl">📍 目的地{もくてきち} 到着{とうちゃく}</span><span class="val">${r.p.arrivals} 回{かい}</span><span class="pts">${r.s.arr} 点{てん}</span>
          <span class="lbl">🏪 お店{みせ}</span><span class="val">${r.p.shops.length} 軒{けん}</span><span class="pts">${r.s.shops} 点{てん}</span>
        </div>
      </div>`).join('')}
    <p class="m-note" style="text-align:center;margin:18px 0">
      ずかんに 集{あつ}めたカード：${DEX.size} / 100 枚{まい}</p>
    <div class="title-actions">
      <button class="big-btn" id="btn-again">▶ もう一度{いちど} 遊{あそ}ぶ</button>
      <button class="big-btn ghost" id="btn-result-dex">📕 カードずかんを 見{み}る</button>
    </div>`);
  $('#btn-again').addEventListener('click', () => { SoundEngine.seTap(); leaveGame(); });
  $('#btn-result-dex').addEventListener('click', () => { SoundEngine.seTap(); showDex(); });
  say(`優勝は ${plain(ranked[0].p.name)}`);
  showScreen('result');
}

/* ══════════════ ずかん・一覧 ══════════════ */

function showDex() {
  const owned = new Set(S && S.players[S.cur] ? S.players[S.cur].cards : []);
  const byRegion = {};
  for (const p of PREFS) (byRegion[p.region] = byRegion[p.region] || []).push(p);

  let html = `<div class="dex-head"><h2>📕 カードずかん</h2>
    <span class="dex-count">これまでに ${DEX.size} / 100 枚{まい}</span></div>
    <div class="dex-bar"><span style="width:${DEX.size}%"></span></div>`;

  for (const rk in byRegion) {
    html += `<div class="dex-region">${REGIONS[rk].label}地方{ちほう}</div><div class="dex-grid">`;
    for (const pref of byRegion[rk]) {
      for (const c of (CARDS_BY_PREF[pref.id] || []).slice().sort((a, b) => a.id - b.id)) {
        const cat = CARD_CATS[c.cat];
        html += DEX.has(c.id)
          ? `<div class="dex-cell got" style="--cc:${cat.color};--cc-l:${cat.color}22">
               <span class="dc-emoji">${cat.emoji}</span>
               <span class="dc-name">${c.name}</span>
               <span class="dc-pref">${pref.shortName}${owned.has(c.id) ? ' ✓' : ''}</span></div>`
          : `<div class="dex-cell locked">
               <span class="dc-emoji">❔</span>
               <span class="dc-name">？？？</span>
               <span class="dc-pref">${pref.shortName}</span></div>`;
      }
    }
    html += '</div>';
  }
  modal({ html, actions: [{ label: '閉{と}じる', value: 'x', primary: true }] });
}

function showQuests() {
  const p = S.players[S.cur];
  const html = p.quests.length
    ? p.quests.map((q) => `<div class="list-item"><b>${questText(q)}</b>
        <div class="li-sub">お礼{れい} ${yen(q.reward)}</div></div>`).join('')
    : '<p class="list-empty">いまは お使{つか}いを 受{う}けていないよ。<br>マスに 止{と}まったときに 受{う}けられる。</p>';
  modal({
    title: `📮 ${p.name}の お使{つか}い`,
    html: html + `<p class="m-note">同時{どうじ}に ${MAX_QUESTS}つ まで 受{う}けられるよ。</p>`,
    actions: [{ label: '閉{と}じる', value: 'x', primary: true }],
  });
}

function showShops() {
  const html = S.players.map((p) => {
    const income = p.shops.reduce((s, x) => s + shopIncome(PREF_BY_ID[x.pref].shops[x.idx][1]), 0);
    const list = p.shops.length
      ? p.shops.map((x) => `${PREF_BY_ID[x.pref].name}「${PREF_BY_ID[x.pref].shops[x.idx][0]}」`).join('／')
      : 'まだ 持{も}っていない';
    return `<div class="list-item" style="border-color:${p.color}">
      <b>${p.emoji} ${p.name}</b>
      <div class="li-sub">${list}</div>
      <div class="li-sub">毎年{まいとし}の 収益{しゅうえき}：<b>${yen(income)}</b></div></div>`;
  }).join('');
  modal({ title: '🏪 お店{みせ}の 持{も}ち主{ぬし}', html, actions: [{ label: '閉{と}じる', value: 'x', primary: true }] });
}

function showHelp() {
  modal({
    emoji: '🗾', title: '遊{あそ}び方{かた}',
    html: `<div class="m-body">
      <p><b>ゴールは 3つ！</b> 3年間{ねんかん} 旅{たび}を して、総合点{そうごうてん}を きそうよ。</p>
      <p>💰 <b>お金{かね}</b>… クイズの 正解{せいかい}・お使{つか}い・お店{みせ}の 収益{しゅうえき}で ふえる（${SCORE.yenPerPoint}円{えん}＝1点{てん}）</p>
      <p>🃏 <b>ひみつのカード</b>… 全部{ぜんぶ}で 100枚{まい}。止{と}まった 県{けん}で 1枚{まい} 見{み}つかる（1枚{まい}＝${SCORE.perCard}点{てん}）</p>
      <p>📍 <b>目的地{もくてきち}</b>… 1年{ねん}ごとに 変{か}わる。一番{いちばん}のりで つくと ${yen(DEST_REWARD)}＋でんせつカード（1回{かい}＝${SCORE.perArrival}点{てん}）</p>
      <hr style="border:none;border-top:2px dashed var(--line);margin:12px 0">
      <p><b>進{すす}みかた</b><br>サイコロを ふって、出{で}た 数{かず}だけ 隣{となり}の 県{けん}へ 1マスずつ 進{すす}む。
      緑{みどり}に 光{ひか}った 県{けん}を タップしてね。すぐ もどることは できないよ。</p>
      <p><b>1年{ねん}＝8ターン</b>（2ターンで 季節{きせつ}が 変{か}わる）。3年{ねん}で 終了{しゅうりょう}。</p>
      <p>点線{てんせん}（‥‥）は 船{ふね}・橋{はし}・飛行機{ひこうき}で わたる 道{みち}だよ。</p>
      <p>✓が ついた 県{けん}は、カードを 全部{ぜんぶ} 集{あつ}め終{お}わった 県{けん}。</p>
      <p>沖縄県{おきなわけん}は 地図{ちず}の 左上{ひだりうえ}の 枠{わく}に 大{おお}きく 描{か}いてあるよ。</p>
      <p>途中{とちゅう}で やめても、自動{じどう}で 保存{ほぞん}されて「続{つづ}きから」遊{あそ}べる。</p>
    </div>`,
    actions: [{ label: '閉{と}じる', value: 'x', primary: true }],
  });
}

function showSound() {
  const row = (key, icon, label, note) => {
    const on = sound[key];
    return { label: `${icon} ${label} <span class="toggle ${on ? 'on' : 'off'}">${on ? 'オン' : 'オフ'}</span>`,
      sub: note, value: key };
  };
  modal({
    emoji: '🔊', title: '音{おと}の 設定{せってい}',
    html: `<p class="m-note" style="text-align:center">タップで 切{き}りかえられるよ。<br>
           いまの BGM：${SoundEngine.currentTrackName() || '－'}</p>`,
    actions: [
      row('bgm', '🎵', 'BGM', '旅{たび}の 音楽{おんがく}'),
      row('se', '🔔', '効果音{こうかおん}', 'サイコロ・正解{せいかい}などの 音{おと}'),
      row('voice', '🗣️', '読{よ}み上{あ}げ', '県{けん}の せつめいを 声{こえ}で 読{よ}む'),
      { label: '閉{と}じる', value: null, primary: true },
    ],
    onPick: (key, btn, wrap, resolve) => {
      if (key === null) { closeModal(); resolve('x'); return; }
      sound[key] = !sound[key];
      saveSound();
      applySound();
      if (key === 'se' && sound.se) SoundEngine.seCoin();
      closeModal();
      showSound();
      resolve('x');
    },
  });
}

/* ══════════════ 画面の切りかえ ══════════════ */

function showScreen(name) {
  $$('.screen').forEach((s) => s.classList.remove('is-active'));
  $(`#screen-${name}`).classList.add('is-active');
  if (name === 'title') refreshTitle();
}

function leaveGame() {
  inGame = false;
  pendingClick = null;
  SoundEngine.stopSpeak();
  SoundEngine.setBgmEnabled(false);
  showScreen('title');
}

/* ══════════════ タイトル画面 ══════════════ */

let setupHumans = 1;
let setupCpus = 1;
let setupTokens = [0, 1, 2, 3];

function buildChooser(box, values, get, set) {
  box.innerHTML = '';
  for (const v of values) {
    const b = document.createElement('button');
    b.innerHTML = ruby(v + '人{にん}');
    b.setAttribute('aria-pressed', String(get() === v));
    b.addEventListener('click', () => { SoundEngine.seTap(); set(v); refreshTitle(); });
    box.appendChild(b);
  }
}

function refreshTitle() {
  if (setupHumans + setupCpus > 4) setupCpus = 4 - setupHumans;
  if (setupHumans + setupCpus < 2) setupCpus = 2 - setupHumans;

  buildChooser($('#choose-humans'), [1, 2, 3, 4], () => setupHumans, (v) => {
    setupHumans = v;
    if (setupHumans + setupCpus > 4) setupCpus = 4 - setupHumans;
    if (setupHumans + setupCpus < 2) setupCpus = 2 - setupHumans;
  });
  buildChooser($('#choose-cpus'), [0, 1, 2, 3].filter((v) => v + setupHumans <= 4 && v + setupHumans >= 2),
    () => setupCpus, (v) => { setupCpus = v; });

  const total = setupHumans + setupCpus;
  while (setupTokens.length < total) setupTokens.push(setupTokens.length);
  const box = $('#token-setup');
  box.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const isCpu = i >= setupHumans;
    const row = document.createElement('div');
    row.className = 'token-row';
    row.innerHTML = ruby(`<span class="who">${isCpu ? 'コンピューター' : `${i + 1}人目{にんめ}`}
      <small>${isCpu ? '自動{じどう}で 動{うご}く' : 'あなたが 動{うご}かす'}</small></span>`);
    const pickBox = document.createElement('div');
    pickBox.className = 'token-pick';
    TOKENS.forEach((t, ti) => {
      const b = document.createElement('button');
      b.textContent = t.emoji;
      b.title = plain(t.name);
      b.style.setProperty('--tk', t.color);
      b.style.setProperty('--tk-l', t.light);
      b.setAttribute('aria-pressed', String(setupTokens[i] === ti));
      b.disabled = setupTokens.slice(0, total).includes(ti) && setupTokens[i] !== ti;
      b.addEventListener('click', () => { SoundEngine.seTap(); setupTokens[i] = ti; refreshTitle(); });
      pickBox.appendChild(b);
    });
    row.appendChild(pickBox);
    box.appendChild(row);
  }

  $('#btn-continue').hidden = !loadSave();
  $('#dex-progress').innerHTML = ruby(`📕 これまでに 集{あつ}めたカード：${DEX.size} / 100 枚{まい}`);
}

function startNewGame() {
  const total = setupHumans + setupCpus;
  const players = [];
  for (let i = 0; i < total; i++) {
    const isCpu = i >= setupHumans;
    const t = TOKENS[setupTokens[i]];
    players.push(newPlayer(isCpu ? `${t.short}（CPU）` : t.short, setupTokens[i], isCpu));
  }
  newGame(players);
  save();
  enterGame(true);
}

async function enterGame(announce) {
  inGame = true;
  SoundEngine.unlock();
  applySound();
  showScreen('game');
  buildMap();
  applyZoom(zoomIndex);
  render([]);
  centerOn(S.players[S.cur].pos);
  if (announce) {
    const d = PREF_BY_ID[S.dest];
    await modal({
      emoji: '🚩', kicker: '旅{たび}の はじまり', title: '東京{とうきょう}から スタート！',
      html: `<p class="m-body center">1年目{ねんめ}の 目的地{もくてきち}は<br>
             <b style="font-size:24px">${d.name}（${d.kana}）</b></p>
             <p class="m-note" style="text-align:center">一番{いちばん}のりで 到着{とうちゃく}すると ${yen(DEST_REWARD)} と でんせつカード！</p>`,
      speak: `東京から スタート。1年目の 目的地は ${plain(d.name)}`,
    });
  }
  startTurn();
}

/* ══════════════ 配線（イベント登録） ══════════════ */

$('#btn-start').addEventListener('click', () => { SoundEngine.seTap(); startNewGame(); });
$('#btn-continue').addEventListener('click', () => {
  const s = loadSave();
  if (!s) return;
  SoundEngine.seTap();
  S = s;
  busy = false;
  enterGame(false);
});
$('#btn-title-dex').addEventListener('click', showDex);
$('#btn-title-help').addEventListener('click', showHelp);
$('#btn-title-sound').addEventListener('click', () => { SoundEngine.unlock(); showSound(); });

$('#btn-zoom').addEventListener('click', () => {
  SoundEngine.seTap();
  applyZoom(zoomIndex + 1);
  if (S) centerOn(S.players[S.cur].pos);
});
$('#btn-dice').addEventListener('click', doRoll);
$('#btn-dex').addEventListener('click', showDex);
$('#btn-quests').addEventListener('click', showQuests);
$('#btn-shops').addEventListener('click', showShops);
$('#btn-sound').addEventListener('click', showSound);
$('#btn-help').addEventListener('click', showHelp);
$('#btn-quit').addEventListener('click', async () => {
  const ans = await modal({
    emoji: '🏠', title: 'タイトルに もどる？',
    html: '<p class="m-body center">いまの ゲームは 保存{ほぞん}されているので、<br>あとで「続{つづ}きから」遊{あそ}べるよ。</p>',
    actions: [
      { label: 'もどる', value: 'yes' },
      { label: 'ゲームに もどる', value: 'no', primary: true },
    ],
  });
  if (ans === 'yes') { save(); leaveGame(); }
});

SoundEngine.onTrackChange(() => { /* 曲が変わったときの表示は 設定まどで見る */ });
applySound();
refreshTitle();
