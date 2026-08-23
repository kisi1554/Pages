/* にっぽん一周すごろく — ゲーム本体
 * ビルド不要。index.html を開くだけで動く。
 * ルールの ぜんたいぞうは README.md を みてね。
 */
'use strict';

/* ══════════════ ていすう ══════════════ */

const TURNS_PER_YEAR = 8;      // 1ねん = 8ターン（2ターンで 1きせつ）
const TOTAL_YEARS    = 3;      // 3ねん あそんで しゅうりょう
const START_MONEY    = 1000;
const QUIZ_REWARD    = 150;
const DEST_REWARD    = 800;
const MAX_QUESTS     = 2;
const SHOP_RETURN    = 0.42;   // おみせの ねんかん しゅうえき = ねだん x これ

const SEASONS = [
  { name: 'はる', emoji: '🌸' },
  { name: 'なつ', emoji: '🌻' },
  { name: 'あき', emoji: '🍁' },
  { name: 'ふゆ', emoji: '⛄' },
];

const TOKENS = [
  { emoji: '🐶', name: 'いぬた',   color: '#e08a3c', light: '#fdf0e2' },
  { emoji: '🐱', name: 'ねこみ',   color: '#c96b8e', light: '#fbeef3' },
  { emoji: '🐻', name: 'くまお',   color: '#8a6a4f', light: '#f4efe9' },
  { emoji: '🦊', name: 'きつね',   color: '#d9645e', light: '#fceeed' },
  { emoji: '🐼', name: 'ぱんだ',   color: '#5b6b7a', light: '#eef1f4' },
  { emoji: '🐧', name: 'ぺんぎん', color: '#3f8fc0', light: '#e8f3fa' },
];

/* 3つの もくひょうが だいたい おなじ おもさに なるように きめた てんすう。
 * めやす（3ねんあそんだとき）：おかね 100〜250てん／カード 300〜450てん／
 * もくてきち 0〜600てん／おみせ 100〜300てん */
const SCORE = { yenPerPoint: 20, perCard: 15, perArrival: 200, perShop: 15 };

const SAVE_KEY = 'nippon-sugoroku-save-v1';
const DEX_KEY  = 'nippon-sugoroku-dex-v1';

/* ゆきの ふる ちほう（ふゆの イベントで つかう） */
const SNOWY = new Set(['hokkaido', 'tohoku']);
const SNOWY_PREFS = new Set(['niigata', 'toyama', 'ishikawa', 'fukui', 'nagano', 'gifu']);

/* ══════════════ こまごました どうぐ ══════════════ */

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randInt = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[randInt(arr.length)];
const yen = (n) => n.toLocaleString('ja-JP') + 'えん';

const PREF_BY_ID = Object.fromEntries(PREFS.map((p) => [p.id, p]));
const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const CARDS_BY_PREF = {};
for (const c of CARDS) (CARDS_BY_PREF[c.pref] = CARDS_BY_PREF[c.pref] || []).push(c);

const RARE_LABEL = { 1: 'ふつう', 2: 'めずらしい', 3: 'でんせつ' };

/** となりの けんまでの あるきかず（はばゆうせん たんさく） */
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

/* ══════════════ ちずの ざひょう ══════════════ */

const MAP_SCALE_X = 105;
const MAP_SCALE_Y = 96;
const MAP_PAD = 80;
let MAP_W = 0, MAP_H = 0;

(function layoutMap() {
  const lons = PREFS.map((p) => p.mapLon ?? p.lon);
  const lats = PREFS.map((p) => p.mapLat ?? p.lat);
  const minLon = Math.min(...lons);
  const maxLat = Math.max(...lats);
  for (const p of PREFS) {
    p.x = ((p.mapLon ?? p.lon) - minLon) * MAP_SCALE_X + MAP_PAD;
    p.y = (maxLat - (p.mapLat ?? p.lat)) * MAP_SCALE_Y + MAP_PAD;
  }
  MAP_W = Math.max(...PREFS.map((p) => p.x)) + MAP_PAD;
  MAP_H = Math.max(...PREFS.map((p) => p.y)) + MAP_PAD;
})();

/* ══════════════ ずかん（ずっと のこる） ══════════════ */

function loadDex() {
  try {
    const raw = localStorage.getItem(DEX_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) { return new Set(); }
}
function saveDex(set) {
  try { localStorage.setItem(DEX_KEY, JSON.stringify([...set])); } catch (e) { /* むし */ }
}
let DEX = loadDex();

/* ══════════════ ゲームの じょうたい ══════════════ */

let S = null;             // いまの ゲーム
let busy = false;         // しょり ちゅうは そうさを うけつけない
let pendingClick = null;  // ちずの タップまち

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
  S = {
    v: 1, year: 1, turnInYear: 0, cur: 0,
    players, dest: null, destTakenBy: null, usedDests: [],
  };
  S.players.forEach((p, i) => { p.pos = 'tokyo'; });
  chooseDestination();
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* むし */ }
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
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* むし */ }
}

/** ことしの もくてきち を きめる（みんなから そこそこ とおい ところ） */
function chooseDestination() {
  const used = new Set(S.usedDests);
  const dists = S.players.map((p) => bfsFrom(p.pos));
  const scored = PREFS
    .filter((p) => !used.has(p.id))
    .map((p) => ({ id: p.id, d: Math.min(...dists.map((dm) => dm[p.id] ?? 99)) }));
  let cands = scored.filter((s) => s.d >= 6 && s.d <= 12);
  if (!cands.length) cands = scored.filter((s) => s.d >= 4);
  if (!cands.length) cands = scored;
  const best = pick(cands);
  S.dest = best.id;
  S.destTakenBy = null;
  S.usedDests.push(best.id);
}

/* ══════════════ ちずの えがき ══════════════ */

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
  svg.setAttribute('viewBox', `0 0 ${MAP_W} ${MAP_H}`);
  svg.setAttribute('width', MAP_W);
  svg.setAttribute('height', MAP_H);

  const gLinks = el('g', { id: 'links' });
  const drawn = new Set();
  for (const p of PREFS) {
    for (const q of p.adj) {
      const key = [p.id, q].sort().join('|');
      if (drawn.has(key)) continue;
      drawn.add(key);
      const o = PREF_BY_ID[q];
      const line = el('line', {
        x1: p.x, y1: p.y, x2: o.x, y2: o.y,
        class: 'link-line' + (SEA_LINKS.has(key) ? ' sea' : ''),
      });
      gLinks.appendChild(line);
    }
  }
  svg.appendChild(gLinks);

  const gNodes = el('g', { id: 'nodes' });
  for (const p of PREFS) {
    const g = el('g', { class: 'node', 'data-id': p.id, transform: `translate(${p.x},${p.y})` });
    g.appendChild(el('circle', { class: 'node-ring', r: 30 }));
    g.appendChild(el('circle', { class: 'node-pick', r: 30, fill: 'transparent' }));
    g.appendChild(el('circle', {
      class: 'node-circle', r: 21, fill: REGIONS[p.region].color, stroke: '#fff',
    }));
    g.appendChild(el('text', { class: 'node-emoji', y: 6, fill: '#fff' }, ''));
    g.appendChild(el('text', { class: 'node-label', y: 41 }, p.kana));
    g.appendChild(el('circle', { class: 'node-hit', r: 34 }));
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

  for (const g of $$('#map .node')) {
    const id = g.dataset.id;
    g.classList.toggle('selectable', sel.has(id));
    g.classList.toggle('is-dest', S.dest === id && S.destTakenBy === null);
    // カードを ぜんぶ あつめた けんには ✔ を つける（のこりが ある けんは まっさら）
    const left = (CARDS_BY_PREF[id] || []).some((c) => c.rare < 3 && !me.cards.includes(c.id));
    g.querySelector('.node-emoji').textContent = left ? '' : '✔';
  }

  // おみせの もちぬしを しめす ちいさな まる
  const gOwners = $('#owners');
  gOwners.innerHTML = '';
  for (const prefId in owned) {
    const p = PREF_BY_ID[prefId];
    owned[prefId].slice(0, 3).forEach((pl, i) => {
      gOwners.appendChild(el('circle', {
        cx: p.x + 15 + i * 10, cy: p.y - 17, r: 5,
        fill: pl.color, stroke: '#fff', 'stroke-width': 2,
      }));
    });
  }

  // こま
  const gTokens = $('#tokens');
  gTokens.innerHTML = '';
  const byPos = {};
  S.players.forEach((pl, i) => (byPos[pl.pos] = byPos[pl.pos] || []).push(i));
  for (const posId in byPos) {
    const p = PREF_BY_ID[posId];
    const list = byPos[posId];
    list.forEach((pi, k) => {
      const pl = S.players[pi];
      const ang = (Math.PI * 2 * k) / list.length - Math.PI / 2;
      const r = list.length === 1 ? 0 : 17;
      const cx = p.x + Math.cos(ang) * r;
      const cy = p.y + Math.sin(ang) * r - 2;
      gTokens.appendChild(el('circle', {
        class: 'token-bg', cx, cy: cy + 1, r: 14, fill: pl.color,
        opacity: pi === S.cur ? 1 : 0.72,
      }));
      gTokens.appendChild(el('text', { class: 'token', x: cx, y: cy + 7 }, pl.emoji));
    });
  }
}

/* 3だんかい：ふつう → すこし ひいた → にっぽん ぜんたい（がめんに ぴったり） */
const ZOOM_LEVELS = [1, 0.68, 'fit'];
let zoomIndex = 0;

function zoomValue(i) {
  const v = ZOOM_LEVELS[i];
  if (v !== 'fit') return v;
  const w = $('#map-wrap').clientWidth || MAP_W;
  return Math.max(0.2, Math.min(0.95, w / MAP_W));
}

function applyZoom(i) {
  zoomIndex = ((i % ZOOM_LEVELS.length) + ZOOM_LEVELS.length) % ZOOM_LEVELS.length;
  const z = zoomValue(zoomIndex);
  const svg = $('#map');
  svg.style.width = (MAP_W * z) + 'px';
  svg.style.height = (MAP_H * z) + 'px';
  // ちいさすぎて けんめいが よめない ときは、まるだけの「ぜんたいマップ」にする
  svg.classList.toggle('overview', z < 0.5);
  const btn = $('#btn-zoom');
  if (btn) btn.textContent = ZOOM_LEVELS[zoomIndex] === 'fit' ? '🔍 ぜんたい' : `🔍 ${Math.round(z * 100)}%`;
}

function centerOn(prefId) {
  const wrap = $('#map-wrap');
  const p = PREF_BY_ID[prefId];
  const svg = $('#map');
  const scale = svg.clientWidth / MAP_W || 1;
  wrap.scrollTo({
    left: p.x * scale - wrap.clientWidth / 2,
    top: p.y * scale - wrap.clientHeight / 2,
    behavior: 'smooth',
  });
}

function onNodeClick(id) {
  if (!pendingClick) return;
  if (!pendingClick.allowed.has(id)) return;
  const fn = pendingClick.resolve;
  pendingClick = null;
  renderMap([]);
  fn(id);
}

/* ══════════════ まど（モーダル）と トースト ══════════════ */

function modal(opts) {
  return new Promise((resolve) => {
    const box = $('#overlay-box');
    const acts = opts.actions && opts.actions.length
      ? opts.actions
      : [{ label: 'つぎへ', value: 'ok', primary: true }];
    box.innerHTML = `
      ${opts.kicker ? `<p class="m-kicker">${opts.kicker}</p>` : ''}
      ${opts.emoji ? `<div class="m-emoji">${opts.emoji}</div>` : ''}
      ${opts.title ? `<h2 class="m-title">${opts.title}${opts.yomi ? `<span class="yomi">${opts.yomi}</span>` : ''}</h2>` : ''}
      ${opts.html || ''}
      <div class="m-actions"></div>`;
    const wrap = box.querySelector('.m-actions');
    acts.forEach((a) => {
      const b = document.createElement('button');
      b.className = a.primary ? 'primary' : '';
      b.innerHTML = a.label + (a.sub ? `<span class="sub">${a.sub}</span>` : '');
      b.disabled = !!a.disabled;
      b.addEventListener('click', () => {
        if (opts.onPick) { opts.onPick(a.value, b, wrap, resolve); return; }
        close();
        resolve(a.value);
      });
      wrap.appendChild(b);
    });
    $('#overlay').hidden = false;
    box.scrollTop = 0;
    function close() { $('#overlay').hidden = true; }
    resolve.close = close;
  });
}
function closeModal() { $('#overlay').hidden = true; }

function toast(msg, ms = 1700) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = msg;
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
    <div class="cv-meta">No.${c.id} ／ ${pref.name}（${pref.kana}） ／ ${cat.label}</div>
    <p class="cv-text">${c.text}</p>
  </div>`;
}

/** その けんで まだ もっていない カードを 1まい えらぶ（でんせつは のぞく） */
function drawCard(player, prefId, includeLegendary) {
  const pool = (CARDS_BY_PREF[prefId] || []).filter(
    (c) => !player.cards.includes(c.id) && (includeLegendary ? true : c.rare < 3)
  );
  if (!pool.length) return null;
  // ふつうの カードが でやすい ように おもみを つける
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

/* ══════════════ おつかい（クエスト） ══════════════ */

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
  return `${PREF_BY_ID[q.from].kana}の「${q.item}」を <b>${PREF_BY_ID[q.to].kana}</b> へ とどける`;
}

/* ══════════════ おみせ ══════════════ */

const shopIncome = (price) => Math.round((price * SHOP_RETURN) / 10) * 10;

function shopsOf(prefId) {
  return PREF_BY_ID[prefId].shops.map(([name, price], idx) => ({
    prefId, idx, name, price, income: shopIncome(price),
  }));
}
function shopOwner(prefId, idx) {
  return S.players.find((p) => p.shops.some((s) => s.pref === prefId && s.idx === idx)) || null;
}

/* ══════════════ きせつの できごと ══════════════ */

const EVENTS = [
  { id: 'snow', season: 3, when: (p) => SNOWY.has(PREF_BY_ID[p.pos].region) || SNOWY_PREFS.has(p.pos),
    emoji: '❄️', title: 'おおゆき！',
    text: (p) => `${PREF_BY_ID[p.pos].kana}は ゆきで でんしゃが とまってしまった。つぎの ターンは おやすみ。`,
    apply: (p) => { p.rest = 1; } },
  { id: 'festival', season: 1, emoji: '🎆', title: 'なつまつり！',
    text: (p) => `${PREF_BY_ID[p.pos].kana}の おまつりを てつだったら おれいを もらったよ。`,
    money: 220 },
  { id: 'hanami', season: 0, emoji: '🌸', title: 'おはなみ',
    text: (p) => `${PREF_BY_ID[p.pos].kana}の さくらが まんかい。かんこうきゃくの あんないを して おこづかいを もらった。`,
    money: 170 },
  { id: 'harvest', season: 2, emoji: '🌾', title: 'しゅうかくの てつだい',
    text: (p) => `${PREF_BY_ID[p.pos].kana}の はたけを てつだって、おれいを もらったよ。`,
    money: 200 },
  { id: 'souvenir', emoji: '🎁', title: 'おみやげを かった',
    text: (p) => `${PREF_BY_ID[p.pos].kana}の おみやげやさんで つい かいすぎちゃった。`,
    money: -120 },
  { id: 'lost', emoji: '💸', title: 'さいふを おとした',
    text: () => 'あわてて さがしたけれど、すこし なくなっていた…。',
    money: -150 },
  { id: 'localtrain', emoji: '🚃', title: 'かんこう れっしゃ',
    text: (p) => `${PREF_BY_ID[p.pos].kana}の かんこう れっしゃに のって きぶんてんかん。えきべんも もらった！`,
    money: 130 },
];

function rollEvent(player, seasonIdx) {
  const pool = EVENTS.filter((e) => (e.season === undefined || e.season === seasonIdx)
    && (!e.when || e.when(player)));
  if (!pool.length) return null;
  return pick(pool);
}

/* ══════════════ ゲームの ながれ ══════════════ */

/* 1ねんの さいごの しょりちゅうは turnInYear が 8 に なるので、はみださないように する */
const seasonIndex = () => Math.min(Math.floor(S.turnInYear / 2), SEASONS.length - 1);

function renderHUD() {
  const s = SEASONS[seasonIndex()];
  $('#hud-year').textContent = `${S.year}ねんめ / ${TOTAL_YEARS}`;
  $('#hud-season').textContent = `${s.emoji} ${s.name}`;
  const d = PREF_BY_ID[S.dest];
  $('#hud-dest').textContent = S.destTakenBy === null
    ? `📍 ${d.kana}`
    : `${d.kana}（${S.players[S.destTakenBy].name} とうちゃく）`;
  $('.hud-dest').classList.toggle('reached', S.destTakenBy !== null);
  $('#hud-turns').textContent = `${TURNS_PER_YEAR - S.turnInYear}かい`;
}

function renderPlayers() {
  const box = $('#players');
  box.innerHTML = '';
  S.players.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'pstat' + (i === S.cur ? ' is-cur' : '');
    d.style.setProperty('--pc', p.color);
    d.style.setProperty('--pc-l', p.light);
    d.innerHTML = `
      <div class="pname">${p.emoji} ${p.name}${p.cpu ? '<span class="cpu-tag">CPU</span>' : ''}</div>
      <div class="pnums">
        <span>💰<b>${p.money.toLocaleString('ja-JP')}</b></span>
        <span>🃏<b>${p.cards.length}</b></span>
        <span>📍<b>${p.arrivals}</b></span>
        <span>🏪<b>${p.shops.length}</b></span>
      </div>`;
    box.appendChild(d);
  });
}

function renderBanner() {
  const p = S.players[S.cur];
  $('#turn-banner-text').innerHTML =
    `${p.emoji} <b style="color:${p.color}">${p.name}</b> の ばん — いま ${PREF_BY_ID[p.pos].kana}`;
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
  if (label) b.textContent = label;
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
    $('#step-info').textContent = `${p.name}は おやすみ…`;
    await toast(`😴 ${p.name}は 1かい おやすみ`, 1500);
    await sleep(500);
    return endTurn();
  }

  if (p.cpu) {
    setDiceEnabled(false);
    $('#step-info').textContent = `${p.name}（CPU）が かんがえています…`;
    await sleep(700);
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
  for (let i = 0; i < 6; i++) { $('#dice-face').textContent = faces[randInt(6)]; await sleep(65); }
  const n = 1 + randInt(6);
  box.classList.remove('rolling');
  $('#dice-face').textContent = faces[n - 1];
  await toast(`🎲 ${n} が でた！`, 1000);

  await moveSteps(p, n);
  await resolveLanding(p);
  endTurn();
}

/** サイコロの めの かず だけ、1ますずつ すすむ */
async function moveSteps(player, steps) {
  let prev = null;
  for (let i = steps; i > 0; i--) {
    const here = PREF_BY_ID[player.pos];
    let options = here.adj.filter((id) => id !== prev);
    if (!options.length) options = here.adj.slice();   // いきどまり は もどれる

    let next;
    if (player.cpu) {
      next = cpuChoose(player, options);
      render(options);
      await sleep(220);
    } else {
      $('#step-info').innerHTML = `あと <b>${i}</b> ます — すすむ さきを タップしてね`;
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
  return new Promise((resolve) => {
    pendingClick = { allowed: new Set(options), resolve };
  });
}

/** CPUの いきさき えらび：いまの ねらいに いちばん ちかづく となりの けん */
const CPU_WANDER = 0.25;   // これくらいの かくりつで さいたんルートを えらばない

function cpuChoose(player, options) {
  if (options.length > 1 && Math.random() < CPU_WANDER) return pick(options);
  const target = cpuTarget(player);
  const dist = bfsFrom(target);
  let best = options[0], bestD = Infinity;
  for (const o of options) {
    let d = dist[o] ?? 99;
    // まだ とっていない カードが ある けんは すこし おとくに みる
    const left = (CARDS_BY_PREF[o] || []).some((c) => c.rare < 3 && !player.cards.includes(c.id));
    if (left) d -= 0.4;
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

function cpuTarget(player) {
  if (S.destTakenBy === null) return S.dest;
  if (player.quests.length) return player.quests[0].to;
  // カードが のこっている いちばん ちかい けん
  const dist = bfsFrom(player.pos);
  const cands = PREFS
    .filter((p) => (CARDS_BY_PREF[p.id] || []).some((c) => c.rare < 3 && !player.cards.includes(c.id)))
    .sort((a, b) => (dist[a.id] ?? 99) - (dist[b.id] ?? 99));
  return cands.length ? cands[0].id : S.dest;
}

/* ══════════════ ますに とまったときの しょり ══════════════ */

async function resolveLanding(player) {
  const pref = PREF_BY_ID[player.pos];
  const cpu = player.cpu;
  const card = drawCard(player, player.pos, false);

  /* ① とうちゃく＋ごとうち じょうほう（＋カード） */
  if (card) giveCard(player, card);
  if (cpu) {
    await toast(`${player.emoji} ${player.name} が ${pref.kana} に とうちゃく`
      + (card ? `<br>🃏 カード「${card.name}」を はっけん` : ''), 1500);
  } else {
    await modal({
      kicker: `${REGIONS[pref.region].label}ちほう`,
      emoji: '🚩',
      title: pref.name,
      yomi: `${pref.kana} ／ けんちょうしょざいち：${pref.capital}`,
      html: `<p class="m-body">${pref.trivia}</p>`,
    });
    if (card) {
      await modal({ kicker: 'ひみつのカードを はっけん！', html: cardHTML(card) });
    } else {
      player.money += 100;
      await modal({
        emoji: '🃏', title: 'カードは そろっているよ',
        html: `<p class="m-body center">${pref.kana}の カードは ぜんぶ あつめずみ。<br>おみやげだいを もらった。</p>
               <p class="m-money plus">＋${yen(100)}</p>`,
      });
    }
  }
  render([]);

  /* ② もくてきち とうちゃく */
  if (player.pos === S.dest && S.destTakenBy === null) {
    S.destTakenBy = S.cur;
    player.arrivals++;
    player.money += DEST_REWARD;
    const legend = drawCard(player, player.pos, true);
    const bonus = legend && legend.rare === 3 ? legend : null;
    if (bonus) giveCard(player, bonus);
    if (cpu) {
      await toast(`📍 ${player.name} が もくてきち ${pref.kana} に いちばんのり！ ＋${yen(DEST_REWARD)}`, 2000);
      if (bonus) await toast(`👑 でんせつカード「${bonus.name}」を てにいれた`, 1800);
    } else {
      await modal({
        emoji: '🎉', kicker: 'いちばんのり！', title: 'もくてきち とうちゃく',
        html: `<p class="m-body center">${S.year}ねんめの もくてきち <b>${pref.name}</b> に とうちゃく！</p>
               <p class="m-money plus">＋${yen(DEST_REWARD)}</p>`,
      });
      if (bonus) await modal({ kicker: 'でんせつカードを もらった！', html: cardHTML(bonus) });
    }
    render([]);
  }
  // 2ばんめ いこうの ごほうびは、1ねんに 1かい だけ
  else if (player.pos === S.dest && S.destTakenBy !== S.cur && player.consolationYear !== S.year) {
    player.consolationYear = S.year;
    player.money += 250;
    if (cpu) {
      await toast(`📍 ${player.name} も もくてきちに とうちゃく ＋${yen(250)}`, 1200);
    } else {
      await modal({
        emoji: '🏳️', title: 'もくてきちに ついた！',
        html: `<p class="m-body center">いちばんのりは ${S.players[S.destTakenBy].name} だったけれど、<br>
               きねんひんを もらったよ。</p><p class="m-money plus">＋${yen(250)}</p>`,
      });
    }
    render([]);
  }

  /* ③ おつかいの たっせい */
  const done = player.quests.filter((q) => q.to === player.pos);
  for (const q of done) {
    player.quests = player.quests.filter((x) => x !== q);
    player.money += q.reward;
    if (cpu) {
      await toast(`📮 ${player.name} が おつかい たっせい ＋${yen(q.reward)}`, 1500);
    } else {
      await modal({
        emoji: '📮', title: 'おつかい たっせい！',
        html: `<p class="m-body center">${questText(q)}<br>ぶじに とどけたよ。</p>
               <p class="m-money plus">＋${yen(q.reward)}</p>`,
      });
    }
  }
  render([]);

  /* ④ ごとうちクイズ */
  await doQuiz(player, pref);
  render([]);

  /* ⑤ おみせ／おつかい の アクション */
  await doActions(player, pref);
  render([]);

  /* ⑥ きせつの できごと（ときどき） */
  if (Math.random() < 0.28) {
    const ev = rollEvent(player, seasonIndex());
    if (ev) {
      const delta = ev.money || 0;
      if (delta) player.money = Math.max(0, player.money + delta);
      if (ev.apply) ev.apply(player);
      if (cpu) {
        await toast(`${ev.emoji} ${player.name}：${ev.title}${delta ? `（${delta > 0 ? '＋' : '－'}${yen(Math.abs(delta))}）` : ''}`, 1600);
      } else {
        await modal({
          kicker: `${SEASONS[seasonIndex()].emoji} ${SEASONS[seasonIndex()].name}の できごと`,
          emoji: ev.emoji, title: ev.title,
          html: `<p class="m-body center">${ev.text(player)}</p>
                 ${delta ? `<p class="m-money ${delta > 0 ? 'plus' : 'minus'}">${delta > 0 ? '＋' : '－'}${yen(Math.abs(delta))}</p>` : ''}`,
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
    if (ok) player.money += QUIZ_REWARD;
    await toast(`❓ ${player.name} の クイズ：${ok ? `せいかい！ ＋${yen(QUIZ_REWARD)}` : 'ざんねん…'}`, 1200);
    return;
  }
  // せんたくしを シャッフルして だす
  const order = [0, 1, 2].sort(() => Math.random() - 0.5);
  await new Promise((done) => {
    modal({
      kicker: `${pref.kana}の クイズ`, emoji: '❓', title: q.q,
      html: `<p class="m-note" style="text-align:center">せいかいすると ${yen(QUIZ_REWARD)} もらえるよ</p>`,
      actions: order.map((i) => ({ label: q.a[i], value: i })),
      onPick: (val, btn, wrap, resolve) => {
        const correct = val === q.c;
        Array.from(wrap.children).forEach((b, k) => {
          b.disabled = true;
          if (order[k] === q.c) b.classList.add('right');
        });
        if (!correct) btn.classList.add('wrong');
        if (correct) player.money += QUIZ_REWARD;
        renderPlayers();
        const msg = document.createElement('p');
        msg.className = correct ? 'm-money plus' : 'm-money minus';
        msg.textContent = correct ? `せいかい！ ＋${yen(QUIZ_REWARD)}` : `ざんねん… こたえは「${q.a[q.c]}」`;
        wrap.parentElement.insertBefore(msg, wrap);
        const next = document.createElement('button');
        next.className = 'primary';
        next.textContent = 'つぎへ';
        next.addEventListener('click', () => { closeModal(); resolve('done'); done(); });
        wrap.appendChild(next);
        next.scrollIntoView({ block: 'nearest' });
      },
    });
  });
}

async function doActions(player, pref) {
  const free = shopsOf(pref.id).filter((s) => !shopOwner(s.prefId, s.idx));
  const canQuest = player.quests.length < MAX_QUESTS;

  if (player.cpu) {
    const buyable = free.filter((s) => player.money - s.price >= 500)
      .sort((a, b) => b.income / b.price - a.income / a.price);
    if (buyable.length) {
      const s = buyable[0];
      player.money -= s.price;
      player.shops.push({ pref: s.prefId, idx: s.idx });
      await toast(`🏪 ${player.name} が「${s.name}」を かった（${yen(s.price)}）`, 1200);
    } else if (canQuest) {
      const q = makeQuest(pref.id);
      player.quests.push(q);
      await toast(`📮 ${player.name} が おつかいを うけた（${PREF_BY_ID[q.to].kana}へ）`, 1200);
    }
    return;
  }

  while (true) {
    const stillFree = shopsOf(pref.id).filter((s) => !shopOwner(s.prefId, s.idx));
    const actions = [];
    for (const s of stillFree) {
      actions.push({
        label: `🏪 「${s.name}」を かう`,
        sub: `${yen(s.price)} ／ まいとし ${yen(s.income)} はいる`,
        value: { kind: 'buy', shop: s },
        disabled: player.money < s.price,
      });
    }
    if (player.quests.length < MAX_QUESTS) {
      actions.push({ label: '📮 おつかいを うける', sub: 'とどけると おかねが もらえる', value: { kind: 'quest' } });
    }
    actions.push({ label: 'つぎへ ▶', value: { kind: 'end' }, primary: true });

    const chosen = await modal({
      kicker: `${pref.kana}で できること`,
      title: `もちきん ${yen(player.money)}`,
      html: player.quests.length
        ? `<p class="m-note">📮 うけている おつかい：${player.quests.map((q) => questText(q)).join('／')}</p>`
        : '',
      actions,
    });

    if (chosen.kind === 'end') return;
    if (chosen.kind === 'buy') {
      const s = chosen.shop;
      player.money -= s.price;
      player.shops.push({ pref: s.prefId, idx: s.idx });
      renderPlayers();
      await modal({
        emoji: '🏪', title: 'おみせを かった！',
        html: `<p class="m-body center"><b>${pref.kana}</b> の「${s.name}」が あなたの おみせに。<br>
               まいとし 12がつに <b>${yen(s.income)}</b> はいってくるよ。</p>
               <p class="m-money minus">－${yen(s.price)}</p>`,
      });
    }
    if (chosen.kind === 'quest') {
      const q = makeQuest(pref.id);
      player.quests.push(q);
      await modal({
        emoji: '📮', title: 'おつかいを うけた',
        html: `<p class="m-body center">${questText(q)}</p>
               <p class="m-note center" style="text-align:center">とどけると <b>${yen(q.reward)}</b> もらえる（あるいて やく ${q.hops} けんぶん）</p>`,
      });
    }
  }
}

/* ══════════════ ターン／としの きりかえ ══════════════ */

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

  await modal({
    emoji: '📅', kicker: `${S.year}ねんめ おわり`, title: 'おみせの けっさん',
    html: `<div class="info-grid">${rows.map((r) =>
      `<dt>${r.p.emoji} ${r.p.name}</dt><dd>${r.income ? `＋${yen(r.income)}` : 'おみせ なし'}　→　${yen(r.p.money)}</dd>`
    ).join('')}</div>
    <p class="m-note">おみせは まいとし 12がつに しゅうえきが はいるよ。</p>`,
  });
  renderPlayers();

  if (S.year >= TOTAL_YEARS) { save(); return finish(); }

  S.year++;
  S.turnInYear = 0;
  S.cur = 0;
  chooseDestination();
  save();
  render([]);
  const d = PREF_BY_ID[S.dest];
  await modal({
    emoji: '📍', kicker: `${S.year}ねんめ スタート`, title: 'あたらしい もくてきち',
    html: `<p class="m-body center">ことしの もくてきちは<br><b style="font-size:24px">${d.name}（${d.kana}）</b></p>
           <p class="m-note center" style="text-align:center">いちばんのりで とうちゃくすると ${yen(DEST_REWARD)} と でんせつカード！</p>`,
  });
  centerOn(S.dest);
  startTurn();
}

/* ══════════════ けっか ══════════════ */

function scoreOf(p) {
  const money = Math.round(p.money / SCORE.yenPerPoint);
  const cards = p.cards.length * SCORE.perCard;
  const arr = p.arrivals * SCORE.perArrival;
  const shops = p.shops.length * SCORE.perShop;
  return { money, cards, arr, shops, total: money + cards + arr + shops };
}

function finish() {
  clearSave();
  const ranked = S.players
    .map((p) => ({ p, s: scoreOf(p) }))
    .sort((a, b) => b.s.total - a.s.total);
  const medals = ['🥇', '🥈', '🥉', '🏅'];

  $('#result-body').innerHTML = `
    <h2>🏁 3ねんかんの たびが おわった！</h2>
    <p class="winner">${medals[0]} ゆうしょう：${ranked[0].p.emoji} ${ranked[0].p.name}</p>
    ${ranked.map((r, i) => `
      <div class="rank-card${i === 0 ? ' first' : ''}">
        <div class="rank-head">
          <span class="medal">${medals[Math.min(i, 3)]}</span>
          <span>${r.p.emoji} ${r.p.name}</span>
          <span class="total">${r.s.total} てん</span>
        </div>
        <div class="rank-rows">
          <span class="lbl">💰 おかね</span><span class="val">${yen(r.p.money)}</span><span class="pts">${r.s.money} てん</span>
          <span class="lbl">🃏 ひみつのカード</span><span class="val">${r.p.cards.length} / 100 まい</span><span class="pts">${r.s.cards} てん</span>
          <span class="lbl">📍 もくてきち とうちゃく</span><span class="val">${r.p.arrivals} かい</span><span class="pts">${r.s.arr} てん</span>
          <span class="lbl">🏪 おみせ</span><span class="val">${r.p.shops.length} けん</span><span class="pts">${r.s.shops} てん</span>
        </div>
      </div>`).join('')}
    <p class="m-note" style="text-align:center;margin:18px 0">
      ずかんの あつめた カード：${DEX.size} / 100 まい</p>
    <div class="title-actions">
      <button class="big-btn" id="btn-again">▶ もういちど あそぶ</button>
      <button class="big-btn ghost" id="btn-result-dex">📕 カードずかんを みる</button>
    </div>`;
  $('#btn-again').addEventListener('click', () => showScreen('title'));
  $('#btn-result-dex').addEventListener('click', () => showDex());
  showScreen('result');
}

/* ══════════════ ずかん・いちらん ══════════════ */

function showDex() {
  const owned = S ? new Set(S.players[S.cur] ? S.players[S.cur].cards : []) : new Set();
  const byRegion = {};
  for (const p of PREFS) (byRegion[p.region] = byRegion[p.region] || []).push(p);

  let html = `<div class="dex-head"><h2>📕 カードずかん</h2>
    <span class="dex-count">これまでに ${DEX.size} / 100 まい</span></div>
    <div class="dex-bar"><span style="width:${DEX.size}%"></span></div>`;

  for (const rk in byRegion) {
    html += `<div class="dex-region">${REGIONS[rk].label}</div><div class="dex-grid">`;
    for (const pref of byRegion[rk]) {
      for (const c of (CARDS_BY_PREF[pref.id] || []).sort((a, b) => a.id - b.id)) {
        const cat = CARD_CATS[c.cat];
        const got = DEX.has(c.id);
        html += got
          ? `<div class="dex-cell got" style="--cc:${cat.color};--cc-l:${cat.color}22">
               <span class="dc-emoji">${cat.emoji}</span>
               <span class="dc-name">${c.name}</span>
               <span class="dc-pref">${pref.kana}${owned.has(c.id) ? ' ✔' : ''}</span></div>`
          : `<div class="dex-cell locked">
               <span class="dc-emoji">❔</span>
               <span class="dc-name">？？？</span>
               <span class="dc-pref">${pref.kana}</span></div>`;
      }
    }
    html += '</div>';
  }
  modal({ html, actions: [{ label: 'とじる', value: 'x', primary: true }] });
}

function showQuests() {
  const p = S.players[S.cur];
  const html = p.quests.length
    ? p.quests.map((q) => `<div class="list-item"><b>${questText(q)}</b>
        <div class="li-sub">おれい ${yen(q.reward)}</div></div>`).join('')
    : '<p class="list-empty">いまは おつかいを うけていないよ。<br>ますに とまったときに うけられる。</p>';
  modal({
    title: `📮 ${p.name}の おつかい`,
    html: html + `<p class="m-note">おなじときに ${MAX_QUESTS}つ まで うけられるよ。</p>`,
    actions: [{ label: 'とじる', value: 'x', primary: true }],
  });
}

function showShops() {
  const html = S.players.map((p) => {
    const income = p.shops.reduce((s, x) => s + shopIncome(PREF_BY_ID[x.pref].shops[x.idx][1]), 0);
    const list = p.shops.length
      ? p.shops.map((x) => `${PREF_BY_ID[x.pref].kana}「${PREF_BY_ID[x.pref].shops[x.idx][0]}」`).join('／')
      : 'まだ もっていない';
    return `<div class="list-item" style="border-color:${p.color}">
      <b>${p.emoji} ${p.name}</b>
      <div class="li-sub">${list}</div>
      <div class="li-sub">まいとしの しゅうえき：<b>${yen(income)}</b></div></div>`;
  }).join('');
  modal({ title: '🏪 おみせの もちぬし', html, actions: [{ label: 'とじる', value: 'x', primary: true }] });
}

function showHelp() {
  modal({
    emoji: '🗾', title: 'あそびかた',
    html: `<div class="m-body">
      <p><b>ゴールは 3つ！</b> 3ねんかん たびを して、そうごうてんすうを きそうよ。</p>
      <p>💰 <b>おかね</b>… クイズの せいかい・おつかい・おみせの しゅうえきで ふえる（100えん＝1てん）</p>
      <p>🃏 <b>ひみつのカード</b>… ぜんぶで 100まい。とまった けんで 1まい みつかる（1まい＝20てん）</p>
      <p>📍 <b>もくてきち</b>… 1ねんごとに かわる。いちばんのりで つくと ${yen(DEST_REWARD)}＋でんせつカード（1かい＝150てん）</p>
      <hr style="border:none;border-top:2px dashed var(--line);margin:12px 0">
      <p><b>すすみかた</b><br>サイコロを ふって、でた かずだけ となりの けんへ 1ますずつ すすむ。
      みどりに ひかった けんを タップしてね。すぐ もどることは できないよ。</p>
      <p><b>1ねん＝8ターン</b>（2ターンで きせつが かわる）。3ねんで しゅうりょう。</p>
      <p>てんてんの せん（‥‥）は ふね・はし・ひこうきで わたる みちだよ。</p>
      <p>✔が ついた けんは、カードを ぜんぶ あつめおわった けんだよ。</p>
      <p>とちゅうで やめても、じどうで ほぞんされて「つづきから」あそべる。</p>
    </div>`,
    actions: [{ label: 'とじる', value: 'x', primary: true }],
  });
}

/* ══════════════ がめんの きりかえ ══════════════ */

function showScreen(name) {
  $$('.screen').forEach((s) => s.classList.remove('is-active'));
  $(`#screen-${name}`).classList.add('is-active');
  if (name === 'title') refreshTitle();
}

/* ══════════════ タイトルがめん ══════════════ */

let setupHumans = 1;
let setupCpus = 1;
let setupTokens = [0, 1, 2, 3];

function buildChooser(box, values, get, set) {
  box.innerHTML = '';
  for (const v of values) {
    const b = document.createElement('button');
    b.textContent = v + 'にん';
    b.setAttribute('aria-pressed', String(get() === v));
    b.addEventListener('click', () => { set(v); refreshTitle(); });
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

  // こまの えらびかた
  const total = setupHumans + setupCpus;
  while (setupTokens.length < total) setupTokens.push(setupTokens.length);
  const box = $('#token-setup');
  box.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const isCpu = i >= setupHumans;
    const row = document.createElement('div');
    row.className = 'token-row';
    row.innerHTML = `<span class="who">${isCpu ? 'コンピューター' : `${i + 1}にんめ`}
      <small>${isCpu ? 'じどうで うごく' : 'あなたが うごかす'}</small></span>`;
    const pickBox = document.createElement('div');
    pickBox.className = 'token-pick';
    TOKENS.forEach((t, ti) => {
      const b = document.createElement('button');
      b.textContent = t.emoji;
      b.title = t.name;
      b.style.setProperty('--tk', t.color);
      b.style.setProperty('--tk-l', t.light);
      b.setAttribute('aria-pressed', String(setupTokens[i] === ti));
      b.disabled = setupTokens.slice(0, total).includes(ti) && setupTokens[i] !== ti;
      b.addEventListener('click', () => { setupTokens[i] = ti; refreshTitle(); });
      pickBox.appendChild(b);
    });
    row.appendChild(pickBox);
    box.appendChild(row);
  }

  $('#btn-continue').hidden = !loadSave();
  $('#dex-progress').textContent = `📕 これまでに あつめた カード：${DEX.size} / 100 まい`;
}

function startNewGame() {
  const total = setupHumans + setupCpus;
  const players = [];
  for (let i = 0; i < total; i++) {
    const isCpu = i >= setupHumans;
    const t = TOKENS[setupTokens[i]];
    const name = isCpu ? `${t.name}（CPU）` : (setupHumans === 1 ? t.name : `${t.name}`);
    players.push(newPlayer(name, setupTokens[i], isCpu));
  }
  newGame(players);
  save();
  enterGame(true);
}

async function enterGame(announce) {
  showScreen('game');
  buildMap();
  applyZoom(zoomIndex);
  render([]);
  centerOn(S.players[S.cur].pos);
  if (announce) {
    const d = PREF_BY_ID[S.dest];
    await modal({
      emoji: '🚩', kicker: 'たびの はじまり', title: 'とうきょうから スタート！',
      html: `<p class="m-body center">1ねんめの もくてきちは<br><b style="font-size:24px">${d.name}（${d.kana}）</b></p>
             <p class="m-note center" style="text-align:center">いちばんのりで とうちゃくすると ${yen(DEST_REWARD)} と でんせつカード！</p>`,
    });
  }
  startTurn();
}

/* ══════════════ はいせん（イベント とうろく） ══════════════ */

$('#btn-start').addEventListener('click', startNewGame);
$('#btn-continue').addEventListener('click', () => {
  const s = loadSave();
  if (!s) return;
  S = s;
  busy = false;
  enterGame(false);
});
$('#btn-title-dex').addEventListener('click', showDex);
$('#btn-title-help').addEventListener('click', showHelp);

$('#btn-zoom').addEventListener('click', () => {
  applyZoom(zoomIndex + 1);
  if (S) centerOn(S.players[S.cur].pos);
});
$('#btn-dice').addEventListener('click', doRoll);
$('#btn-dex').addEventListener('click', showDex);
$('#btn-quests').addEventListener('click', showQuests);
$('#btn-shops').addEventListener('click', showShops);
$('#btn-help').addEventListener('click', showHelp);
$('#btn-quit').addEventListener('click', async () => {
  const ans = await modal({
    emoji: '🏠', title: 'タイトルに もどる？',
    html: '<p class="m-body center">いまの ゲームは ほぞんされているので、<br>あとで「つづきから」あそべるよ。</p>',
    actions: [
      { label: 'もどる', value: 'yes' },
      { label: 'ゲームに もどる', value: 'no', primary: true },
    ],
  });
  if (ans === 'yes') { save(); pendingClick = null; showScreen('title'); }
});

refreshTitle();
