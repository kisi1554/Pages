/* 横浜グルメマップ
 * 外部ライブラリなし。地図は OpenStreetMap のタイル画像を自前で並べている。
 */
'use strict';

/* =========================================================
 * 記録の保存（localStorage）
 * =======================================================*/
const STORE_KEY = 'yokohama-gourmet-map:v1';
const EMPTY = { status: '', stars: 0, date: '', memo: '' };

const store = {
  data: { v: 1, updatedAt: '', records: {} },

  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.records) {
          this.data = { v: 1, updatedAt: parsed.updatedAt || '', records: {} };
          for (const [id, r] of Object.entries(parsed.records)) {
            this.data.records[id] = normalizeRecord(r);
          }
        }
      }
    } catch (e) {
      console.warn('記録の読み込みに失敗しました', e);
    }
  },

  save() {
    try {
      this.data.updatedAt = new Date().toISOString();
      localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
      return true;
    } catch (e) {
      console.warn('記録の保存に失敗しました', e);
      return false;
    }
  },

  get(id) {
    return this.data.records[id] || EMPTY;
  },

  set(id, patch) {
    const next = normalizeRecord({ ...this.get(id), ...patch });
    if (!next.status && !next.stars && !next.date && !next.memo) {
      delete this.data.records[id];
    } else {
      this.data.records[id] = next;
    }
    return this.save();
  },

  replaceAll(records) {
    const clean = {};
    const known = new Set(SPOTS.map((s) => s.id));
    for (const [id, r] of Object.entries(records)) {
      if (known.has(id)) clean[id] = normalizeRecord(r);
    }
    this.data.records = clean;
    return this.save();
  },
};

/** 状態の定義。'' は未設定。skip（興味なし）は「すべて」から隠す。 */
const STATUSES = [
  { id: 'want', label: '行きたい', flag: '☆' },
  { id: 'been', label: '行った',   flag: '✓' },
  { id: 'skip', label: '興味なし', flag: '✕' },
];
const STATUS_IDS = STATUSES.map((s) => s.id);
const statusOf = (id) => STATUSES.find((s) => s.id === id);

function normalizeRecord(r) {
  r = r && typeof r === 'object' ? r : {};
  const status = STATUS_IDS.includes(r.status) ? r.status : '';
  let stars = Number(r.stars);
  if (!Number.isFinite(stars) || stars < 0) stars = 0;
  stars = Math.min(5, Math.round(stars));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(r.date || '')) ? String(r.date) : '';
  const memo = String(r.memo || '').slice(0, 1000);
  return { status, stars, date, memo };
}

/* =========================================================
 * 小物
 * =======================================================*/
const $ = (sel) => document.querySelector(sel);
const genreOf = (id) => GENRES.find((g) => g.id === id) || GENRES[GENRES.length - 1];
const areaOf = (id) => AREAS.find((a) => a.id === id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function starText(n) {
  return '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i>';
}

/* =========================================================
 * 画面の状態
 * =======================================================*/
const ui = {
  area: AREAS[0].id,
  genres: new Set(),   // 空 = すべて
  status: 'all',       // all | been | want | none
  q: '',
  sort: 'default',
  selected: null,
};

/* =========================================================
 * 地図エンジン（Web メルカトル + OSM タイル）
 * =======================================================*/
const TILE = 256;
const MIN_Z = 13;
const MAX_Z = 19;

const mapEl = $('#map');
const tilesEl = $('#tiles');
const pinsEl = $('#pins');
const meEl = $('#me');

const view = { lat: AREAS[0].center[0], lng: AREAS[0].center[1], zoom: AREAS[0].zoom };

const lngToX = (lng, z) => ((lng + 180) / 360) * TILE * Math.pow(2, z);
const latToY = (lat, z) => {
  const s = Math.sin(Math.max(-85.05, Math.min(85.05, lat)) * Math.PI / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE * Math.pow(2, z);
};
const xToLng = (x, z) => (x / (TILE * Math.pow(2, z))) * 360 - 180;
const yToLat = (y, z) => {
  const n = Math.PI - (2 * Math.PI * y) / (TILE * Math.pow(2, z));
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

function mapSize() {
  return { w: mapEl.clientWidth || 1, h: mapEl.clientHeight || 1 };
}

/** 画面座標 → 緯度経度 */
function screenToLatLng(sx, sy) {
  const { w, h } = mapSize();
  const ox = lngToX(view.lng, view.zoom) - w / 2;
  const oy = latToY(view.lat, view.zoom) - h / 2;
  return { lat: yToLat(oy + sy, view.zoom), lng: xToLng(ox + sx, view.zoom) };
}

/** p（緯度経度）が画面の (sx,sy) に来るように中心を動かす */
function anchorAt(p, sx, sy) {
  const { w, h } = mapSize();
  const ox = lngToX(p.lng, view.zoom) - sx;
  const oy = latToY(p.lat, view.zoom) - sy;
  view.lng = xToLng(ox + w / 2, view.zoom);
  view.lat = yToLat(oy + h / 2, view.zoom);
}

function setZoomAt(z, sx, sy) {
  const clamped = Math.max(MIN_Z, Math.min(MAX_Z, z));
  if (clamped === view.zoom) return;
  const p = screenToLatLng(sx, sy);
  view.zoom = clamped;
  anchorAt(p, sx, sy);
  scheduleRender();
}

const tileCache = new Map(); // key -> img
let tileErrors = 0;

function renderTiles() {
  const { w, h } = mapSize();
  const tz = Math.max(MIN_Z, Math.min(MAX_Z, Math.round(view.zoom)));
  const scale = Math.pow(2, view.zoom - tz);
  tilesEl.style.transform = scale === 1 ? '' : `scale(${scale})`;

  const ew = w / scale;
  const eh = h / scale;
  const ox = lngToX(view.lng, tz) - ew / 2;
  const oy = latToY(view.lat, tz) - eh / 2;
  const n = Math.pow(2, tz);

  const x0 = Math.floor(ox / TILE) - 1;
  const x1 = Math.floor((ox + ew) / TILE) + 1;
  const y0 = Math.max(0, Math.floor(oy / TILE) - 1);
  const y1 = Math.min(n - 1, Math.floor((oy + eh) / TILE) + 1);

  const keep = new Set();
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const key = `${tz}/${x}/${y}`;
      keep.add(key);
      let img = tileCache.get(key);
      if (!img) {
        const wx = ((x % n) + n) % n;
        img = new Image();
        img.alt = '';
        img.draggable = false;
        img.decoding = 'async';
        img.src = `https://tile.openstreetmap.org/${tz}/${wx}/${y}.png`;
        img.addEventListener('error', () => {
          img.style.visibility = 'hidden';
          tileErrors++;
          if (tileErrors > 3) $('#maphint').hidden = false;
        });
        tileCache.set(key, img);
        tilesEl.appendChild(img);
      }
      img.style.left = x * TILE - ox + 'px';
      img.style.top = y * TILE - oy + 'px';
    }
  }
  for (const [key, img] of tileCache) {
    if (!keep.has(key)) {
      img.remove();
      tileCache.delete(key);
    }
  }
}

const pinCache = new Map(); // spot id -> element

function renderPins() {
  const { w, h } = mapSize();
  const ox = lngToX(view.lng, view.zoom) - w / 2;
  const oy = latToY(view.lat, view.zoom) - h / 2;
  const shown = visibleSpots();
  const keep = new Set();

  for (const spot of shown) {
    const x = lngToX(spot.lng, view.zoom) - ox;
    const y = latToY(spot.lat, view.zoom) - oy;
    if (x < -60 || y < -60 || x > w + 60 || y > h + 60) continue;
    keep.add(spot.id);

    let el = pinCache.get(spot.id);
    if (!el) {
      const g = genreOf(spot.genre);
      el = document.createElement('button');
      el.type = 'button';
      el.className = 'pin';
      el.style.setProperty('--c', g.color);
      el.title = spot.name;
      el.setAttribute('aria-label', `${spot.name}（${g.name}）`);
      el.innerHTML =
        `<span class="pin__body"><span class="pin__emoji">${g.emoji}</span></span><span class="pin__flag"></span>`;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (dragMoved > 8) return; // 地図をドラッグしただけ
        select(spot.id, false);
      });
      pinCache.set(spot.id, el);
      pinsEl.appendChild(el);
    }
    const rec = store.get(spot.id);
    const st = statusOf(rec.status);
    const flag = el.querySelector('.pin__flag');
    flag.textContent = st ? st.flag : '';
    flag.hidden = !st;
    el.className =
      'pin pin--' + (rec.status || 'none') + (ui.selected === spot.id ? ' pin--sel' : '');
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  }
  for (const [id, el] of pinCache) {
    if (!keep.has(id)) {
      el.remove();
      pinCache.delete(id);
    }
  }
}

let rafId = 0;
function scheduleRender() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    renderTiles();
    renderPins();
    renderMe();
  });
}

/** そのエリアの店がぜんぶ入るように中心とズームを決める */
function fitArea(areaId) {
  const list = SPOTS.filter((s) => s.area === areaId);
  const a = areaOf(areaId) || AREAS[0];
  if (!list.length) return flyTo(a.center[0], a.center[1], a.zoom);

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const s of list) {
    minLat = Math.min(minLat, s.lat); maxLat = Math.max(maxLat, s.lat);
    minLng = Math.min(minLng, s.lng); maxLng = Math.max(maxLng, s.lng);
  }
  const { w, h } = mapSize();
  const availW = Math.max(80, w - Math.min(100, w * 0.2)); // 右上のボタンぶん
  const availH = Math.max(80, h - Math.min(90, h * 0.2));   // ピンの高さぶん
  // 引きすぎの下限はエリアごと（data.js の fitMin）。密集した街ほど大きく、
  // 広く散った街ほど小さくする。小さい画面では端の数店が画面外から始まるが、
  // リストのカードをタップすればその店へ地図が飛ぶ。
  const FIT_MIN = typeof a.fitMin === 'number' ? a.fitMin : 16.0;
  let z = MAX_Z;
  for (; z > FIT_MIN; z -= 0.1) {
    const dx = Math.abs(lngToX(maxLng, z) - lngToX(minLng, z));
    const dy = Math.abs(latToY(minLat, z) - latToY(maxLat, z));
    if (dx <= availW && dy <= availH) break;
  }
  flyTo((minLat + maxLat) / 2, (minLng + maxLng) / 2, z);
}

function flyTo(lat, lng, zoom) {
  view.lat = lat;
  view.lng = lng;
  if (zoom != null) view.zoom = Math.max(MIN_Z, Math.min(MAX_Z, zoom));
  scheduleRender();
}

/* --- 操作（ドラッグ・ホイール・ピンチ） --- */
const pointers = new Map();
let pinchStart = null;
let dragMoved = 0;

/* ピンの click を奪わないよう setPointerCapture は使わず、window で追う */
mapEl.addEventListener('pointerdown', (e) => {
  if (e.button !== undefined && e.button !== 0) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  dragMoved = 0;
  if (pointers.size === 2) startPinch();
  mapEl.classList.add('dragging');
});

window.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  const dx = e.clientX - prev.x;
  const dy = e.clientY - prev.y;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  dragMoved += Math.abs(dx) + Math.abs(dy);

  if (pointers.size >= 2) {
    updatePinch();
    return;
  }
  const { w, h } = mapSize();
  const ox = lngToX(view.lng, view.zoom) - w / 2 - dx;
  const oy = latToY(view.lat, view.zoom) - h / 2 - dy;
  view.lng = xToLng(ox + w / 2, view.zoom);
  view.lat = Math.max(-85, Math.min(85, yToLat(oy + h / 2, view.zoom)));
  scheduleRender();
});

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchStart = null;
  if (pointers.size === 0) mapEl.classList.remove('dragging');
}
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);

function twoPointers() {
  const [a, b] = [...pointers.values()];
  const rect = mapEl.getBoundingClientRect();
  return {
    dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
    mx: (a.x + b.x) / 2 - rect.left,
    my: (a.y + b.y) / 2 - rect.top,
  };
}
function startPinch() {
  const t = twoPointers();
  pinchStart = { dist: t.dist, zoom: view.zoom };
}
function updatePinch() {
  if (!pinchStart) return startPinch();
  const t = twoPointers();
  setZoomAt(pinchStart.zoom + Math.log2(t.dist / pinchStart.dist), t.mx, t.my);
}

mapEl.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const rect = mapEl.getBoundingClientRect();
    const step = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY;
    setZoomAt(view.zoom - step * 0.0022, e.clientX - rect.left, e.clientY - rect.top);
  },
  { passive: false }
);

mapEl.addEventListener('dblclick', (e) => {
  const rect = mapEl.getBoundingClientRect();
  setZoomAt(Math.floor(view.zoom) + 1, e.clientX - rect.left, e.clientY - rect.top);
});

$('#zin').addEventListener('click', () => {
  const { w, h } = mapSize();
  setZoomAt(Math.floor(view.zoom + 0.001) + 1, w / 2, h / 2);
});
$('#zout').addEventListener('click', () => {
  const { w, h } = mapSize();
  setZoomAt(Math.ceil(view.zoom - 0.001) - 1, w / 2, h / 2);
});

let mePos = null;
$('#loc').addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('この端末では現在地を取得できません。');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      mePos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      flyTo(mePos.lat, mePos.lng, Math.max(view.zoom, 17));
      renderMe();
    },
    () => alert('現在地を取得できませんでした。位置情報の許可を確認してください。'),
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

function renderMe() {
  if (!mePos) {
    meEl.hidden = true;
    return;
  }
  const { w, h } = mapSize();
  const ox = lngToX(view.lng, view.zoom) - w / 2;
  const oy = latToY(view.lat, view.zoom) - h / 2;
  meEl.style.left = lngToX(mePos.lng, view.zoom) - ox + 'px';
  meEl.style.top = latToY(mePos.lat, view.zoom) - oy + 'px';
  meEl.hidden = false;
}

window.addEventListener('resize', () => scheduleRender());

/* =========================================================
 * しぼりこみ・並べかえ
 * =======================================================*/
/** 状態のしぼりこみに合うか。'all' のときは「興味なし」だけ外す。 */
function matchesStatus(status) {
  if (ui.status === 'all') return status !== 'skip';
  if (ui.status === 'none') return !status;
  return status === ui.status;
}

/** エリアと状態だけを見た、ジャンルチップの母集団 */
function baseSpots() {
  return SPOTS.filter((s) => s.area === ui.area && matchesStatus(store.get(s.id).status));
}

function visibleSpots() {
  const q = ui.q.trim().toLowerCase();
  let list = SPOTS.filter((s) => {
    if (s.area !== ui.area) return false;
    if (ui.genres.size && !ui.genres.has(s.genre)) return false;
    const rec = store.get(s.id);
    if (!matchesStatus(rec.status)) return false;
    if (q) {
      const hay = (s.name + ' ' + (s.note || '') + ' ' + rec.memo + ' ' + genreOf(s.genre).name).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (ui.sort === 'star') {
    list = list.slice().sort((a, b) => store.get(b.id).stars - store.get(a.id).stars || a.name.localeCompare(b.name, 'ja'));
  } else if (ui.sort === 'name') {
    list = list.slice().sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  } else if (ui.sort === 'near') {
    const d = (s) => Math.pow(s.lat - view.lat, 2) + Math.pow((s.lng - view.lng) * 0.81, 2);
    list = list.slice().sort((a, b) => d(a) - d(b));
  }
  return list;
}

/* =========================================================
 * 描画：エリア・フィルタ・リスト・件数
 * =======================================================*/
function renderAreas() {
  const el = $('#areas');
  el.innerHTML = '';
  for (const a of AREAS) {
    const n = SPOTS.filter((s) => s.area === a.id).length;
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-selected', String(a.id === ui.area));
    b.innerHTML = n
      ? `${esc(a.name)} <span class="soon">${n}</span>`
      : `${esc(a.name)} <span class="soon">準備中</span>`;
    b.disabled = !n;
    b.addEventListener('click', () => {
      ui.area = a.id;
      ui.selected = null;
      renderAll();
      fitArea(a.id);
    });
    el.appendChild(b);
  }
}

function renderFilters() {
  const sf = $('#statusFilter');
  sf.innerHTML = '';
  const inArea = SPOTS.filter((s) => s.area === ui.area);
  const n = { all: 0, been: 0, want: 0, none: 0, skip: 0 };
  for (const s of inArea) {
    const st = store.get(s.id).status;
    n[st || 'none']++;
    if (st !== 'skip') n.all++; // 「すべて」に興味なしは入れない
  }

  const states = [
    ['all', 'すべて', 'var(--accent)'],
    ['want', '行きたい', 'var(--want)'],
    ['been', '行った', 'var(--been)'],
    ['none', '未設定', 'var(--fg3)'],
    ['skip', '興味なし', 'var(--skip)'],
  ];
  for (const [v, label, color] of states) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.style.setProperty('--c', color);
    b.setAttribute('aria-pressed', String(ui.status === v));
    b.textContent = `${label} ${n[v]}`;
    b.addEventListener('click', () => {
      ui.status = v;
      renderAll();
    });
    sf.appendChild(b);
  }

  const gf = $('#genreFilter');
  gf.innerHTML = '';
  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'chip';
  all.style.setProperty('--c', 'var(--accent)');
  all.setAttribute('aria-pressed', String(ui.genres.size === 0));
  all.textContent = '全ジャンル';
  all.addEventListener('click', () => {
    ui.genres.clear();
    renderAll();
  });
  gf.appendChild(all);

  const base = baseSpots();
  const inAreaAll = SPOTS.filter((s) => s.area === ui.area);
  for (const g of GENRES) {
    if (!inAreaAll.some((s) => s.genre === g.id)) continue; // このエリアに無いジャンルは出さない
    const n = base.filter((s) => s.genre === g.id).length;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.style.setProperty('--c', g.color);
    b.setAttribute('aria-pressed', String(ui.genres.has(g.id)));
    b.innerHTML = `<span class="chip__dot"></span>${g.emoji} ${esc(g.name)} ${n}`;
    b.addEventListener('click', () => {
      if (ui.genres.has(g.id)) ui.genres.delete(g.id);
      else ui.genres.add(g.id);
      renderAll();
    });
    gf.appendChild(b);
  }
}

function renderList() {
  const list = visibleSpots();
  const el = $('#list');
  el.innerHTML = '';
  $('#empty').hidden = list.length > 0;

  for (const s of list) {
    const g = genreOf(s.genre);
    const rec = store.get(s.id);
    const li = document.createElement('li');
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card' + (ui.selected === s.id ? ' card--sel' : '');
    card.style.setProperty('--c', g.color);
    const st = statusOf(rec.status);
    const badge = st ? `<span class="badge badge--${st.id}">${st.label}</span>` : '';
    card.innerHTML =
      `<span class="card__mark">${g.emoji}</span>` +
      `<span class="card__body">` +
      `<span class="card__name">${esc(s.name)}${badge}</span>` +
      `<span class="card__meta"><span class="card__genre">${esc(g.name)}</span>` +
      (rec.stars ? `<span class="stars-ro">${starText(rec.stars)}</span>` : '') +
      (rec.date ? `<span>${esc(rec.date.replace(/-/g, '/'))}</span>` : '') +
      `</span>` +
      `<span class="card__memo">${esc(rec.memo || s.note || '')}</span>` +
      `</span>`;
    card.addEventListener('click', () => select(s.id, true));
    li.appendChild(card);
    el.appendChild(li);
  }
}

function renderCounts() {
  // 興味なしにした店は分母から外す（状態チップの「すべて」と数をそろえる）
  const target = SPOTS.filter((s) => s.area === ui.area && store.get(s.id).status !== 'skip');
  const been = target.filter((s) => store.get(s.id).status === 'been').length;
  $('#counts').innerHTML = `行った <b>${been}</b>／${target.length}`;
}

function renderAll() {
  renderAreas();
  renderFilters();
  renderList();
  renderCounts();
  scheduleRender();
}

/* =========================================================
 * 詳細シート
 * =======================================================*/
const sheet = $('#sheet');
const dataDlg = $('#dataDlg');
let current = null;
let savedTimer = 0;

function select(id, moveMap) {
  const spot = SPOTS.find((s) => s.id === id);
  if (!spot) return;
  current = spot;
  ui.selected = id;

  const g = genreOf(spot.genre);
  const rec = store.get(id);
  const panel = sheet.querySelector('.sheet__panel');
  panel.style.setProperty('--c', g.color);
  $('#sheetGenre').textContent = `${g.emoji} ${g.name}`;
  $('#sheetName').textContent = spot.name;
  $('#sheetNote').textContent = spot.note || '';
  $('#sheetNote').hidden = !spot.note;

  for (const b of $('#fStatus').children) b.setAttribute('aria-pressed', String(b.dataset.v === rec.status));
  paintStars(rec.stars);
  $('#fDate').value = rec.date;
  $('#fMemo').value = rec.memo;

  const areaName = (areaOf(spot.area) || {}).name || '';
  const q = encodeURIComponent(`${spot.name} 横浜 ${areaName}`);
  $('#gmapName').href = `https://www.google.com/maps/search/?api=1&query=${q}`;
  $('#gmapPin').href = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;

  clearTimeout(closeTimer);
  closeTimer = 0;
  $('#saved').hidden = true;
  sheet.hidden = false;

  if (moveMap) flyTo(spot.lat, spot.lng, Math.max(view.zoom, 17));
  renderList();
  scheduleRender();
}

function paintStars(n) {
  for (const b of $('#fStars').children) {
    if (b.classList.contains('stars__clear')) continue;
    b.classList.toggle('on', Number(b.dataset.v) <= n);
  }
}

function flashSaved(ok) {
  const el = $('#saved');
  el.textContent = ok ? '保存しました' : '保存できませんでした（ブラウザの設定を確認してください）';
  el.classList.toggle('err', !ok);
  el.hidden = false;
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => {
    el.hidden = true;
  }, 1600);
}

function patch(p) {
  if (!current) return false;
  const ok = store.set(current.id, p);
  flashSaved(ok);
  renderFilters();
  renderList();
  renderCounts();
  scheduleRender();
  return ok;
}

/* --- 状態を押したあと、少し待ってから自動でとじる ---
 * 待っているあいだに★・訪問日・メモに触れたら、とじるのをやめる。
 * サッと記録したいときと、じっくり書きたいときの両方に効く。 */
const AUTO_CLOSE_MS = 800;
let closeTimer = 0;

function armAutoClose() {
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    closeTimer = 0;
    closeSheet();
  }, AUTO_CLOSE_MS);
  const el = $('#saved');
  if (!el.hidden && !el.classList.contains('err')) el.textContent = '保存しました · とじます';
}

function cancelAutoClose() {
  if (!closeTimer) return;
  clearTimeout(closeTimer);
  closeTimer = 0;
  const el = $('#saved');
  if (!el.hidden && !el.classList.contains('err')) el.textContent = '保存しました';
}

$('#fStatus').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || !current) return;
  const v = b.dataset.v;
  const next = store.get(current.id).status === v ? '' : v;
  for (const x of $('#fStatus').children) x.setAttribute('aria-pressed', String(x.dataset.v === next));
  if (patch({ status: next })) armAutoClose();
});

$('#fStars').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || !current) return;
  const v = Number(b.dataset.v);
  const next = store.get(current.id).stars === v ? 0 : v;
  paintStars(next);
  patch({ stars: next });
});

$('#fDate').addEventListener('change', (e) => patch({ date: e.target.value }));

let memoTimer = 0;
$('#fMemo').addEventListener('input', (e) => {
  const v = e.target.value;
  clearTimeout(memoTimer);
  memoTimer = setTimeout(() => patch({ memo: v }), 400);
});

/* 状態ボタン以外をさわったら、自動でとじるのをやめる */
{
  const panel = sheet.querySelector('.sheet__panel');
  const keepOpen = (e) => {
    if (!e.target.closest('#fStatus')) cancelAutoClose();
  };
  panel.addEventListener('pointerdown', keepOpen);
  panel.addEventListener('focusin', keepOpen);
  panel.addEventListener('scroll', cancelAutoClose, { passive: true });
}

/* シートを閉じる */
function closeSheet() {
  clearTimeout(closeTimer);
  closeTimer = 0;
  sheet.hidden = true;
  ui.selected = null;
  renderList();
  scheduleRender();
}

sheet.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) closeSheet();
});
dataDlg.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) dataDlg.hidden = true;
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!dataDlg.hidden) dataDlg.hidden = true;
  else if (!sheet.hidden) closeSheet();
});

/* =========================================================
 * バックアップ（JSON 書き出し／読み込み）
 * =======================================================*/
$('#btnData').addEventListener('click', () => {
  $('#ioText').value = '';
  $('#ioMsg').hidden = true;
  dataDlg.hidden = false;
});

function exportJson() {
  return JSON.stringify({ app: 'yokohama-gourmet-map', v: 1, updatedAt: store.data.updatedAt, records: store.data.records }, null, 2);
}

function ioMsg(text, err) {
  const el = $('#ioMsg');
  el.textContent = text;
  el.classList.toggle('err', !!err);
  el.hidden = false;
}

$('#dlJson').addEventListener('click', () => {
  try {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yokohama-gourmet-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ioMsg('ファイルを保存しました');
  } catch (e) {
    ioMsg('保存できませんでした。下のテキストをコピーして使ってください。', true);
    $('#ioText').value = exportJson();
  }
});

$('#copyJson').addEventListener('click', async () => {
  const text = exportJson();
  try {
    await navigator.clipboard.writeText(text);
    ioMsg('コピーしました');
  } catch (e) {
    $('#ioText').value = text;
    ioMsg('コピーできませんでした。下の欄の文字を手で選んでコピーしてください。', true);
  }
});

$('#ioFile').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    $('#ioText').value = String(reader.result || '');
    ioMsg('ファイルを読みました。「読み込む」を押してください。');
  };
  reader.onerror = () => ioMsg('ファイルを読めませんでした。', true);
  reader.readAsText(file);
  e.target.value = '';
});

$('#doImport').addEventListener('click', () => {
  const text = $('#ioText').value.trim();
  if (!text) return ioMsg('JSONを貼りつけるか、ファイルを選んでください。', true);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return ioMsg('JSONとして読めませんでした。', true);
  }
  const records = parsed && parsed.records;
  if (!records || typeof records !== 'object') return ioMsg('records が見つかりません。', true);
  if (!confirm('いまの記録を、このJSONの内容で置きかえます。よろしいですか？')) return;
  const ok = store.replaceAll(records);
  renderAll();
  if (current && !sheet.hidden) select(current.id, false); // 開いているときだけ中身を入れ直す
  ioMsg(ok ? `${Object.keys(store.data.records).length}件の記録を読み込みました。` : '読み込めましたが保存できませんでした。', !ok);
});

/* =========================================================
 * ツールバーの操作
 * =======================================================*/
let qTimer = 0;
$('#q').addEventListener('input', (e) => {
  const v = e.target.value;
  clearTimeout(qTimer);
  qTimer = setTimeout(() => {
    ui.q = v;
    renderList();
    scheduleRender();
  }, 180);
});
$('#sort').addEventListener('change', (e) => {
  ui.sort = e.target.value;
  renderList();
});

/* =========================================================
 * 起動
 * =======================================================*/
store.load();
const first = AREAS.find((a) => SPOTS.some((s) => s.area === a.id)) || AREAS[0];
ui.area = first.id;
view.lat = first.center[0];
view.lng = first.center[1];
view.zoom = first.zoom;
renderAll();
requestAnimationFrame(() => fitArea(ui.area));
