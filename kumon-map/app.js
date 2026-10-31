// くもん きょうしつ マップ — かながわけんの くもんの きょうしつと、ちかくの えき・ろせんを みる ちず
(function () {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';
  const STORE = 'kumon-map-v1';
  const $ = (id) => document.getElementById(id);

  // ---- データ ----------------------------------------------------------
  // ST[i] = [なまえ, よみ, x, y, かながわけんなら 1]
  const ST = DATA.st;
  const LINES = DATA.lines;
  const NS = ST.length;
  const K = DATA.k;
  const Y0 = mercY(DATA.lat0);
  // 1 たんい ≒ なんメートル（かながわけんの あたり）
  const M_PER_UNIT = 111320 * Math.cos(35.45 * Math.PI / 180) / K;
  const NEAR_M = 2500;

  const stLines = ST.map(() => []);
  LINES.forEach((L, li) => L.s.forEach((i) => stLines[i].push(li)));
  const railSt = [];
  for (let i = 0; i < NS; i++) if (stLines[i].length) railSt.push(i);

  const CATS = [['all', 'ぜんぶ'], ['jr', 'JR'], ['shitetsu', 'してつ'], ['metro', 'ちかてつ'], ['other', 'そのほか'], ['shin', 'しんかんせん']];
  const OP_KANA = {
    'JR東日本': 'じぇいあーるひがしにほん', 'JR東海': 'じぇいあーるとうかい', '横浜市営': 'よこはましえい',
    '東急': 'とうきゅう', '京急': 'けいきゅう', '小田急': 'おだきゅう', '京王': 'けいおう', '相鉄': 'そうてつ',
    '横浜高速鉄道': 'よこはまこうそくてつどう', '江ノ電': 'えのでん', '湘南モノレール': 'しょうなんものれーる',
    '横浜シーサイドライン': 'よこはましーさいどらいん', '箱根登山鉄道': 'はこねとざんてつどう',
    '伊豆箱根鉄道': 'いずはこねてつどう', '大山観光電鉄': 'おおやまかんこうでんてつ', '東京メトロ': 'とうきょうめとろ',
    '都営': 'とえい', '多摩都市モノレール': 'たまとしものれーる',
  };

  // きょうしつ: { n なまえ, x, y, ns [[えき, m], ...], a じゅうしょ, c まち, mine じぶんで ふやした }
  let ROOMS = [];
  const BASE_ROOMS = DATA.rooms.map((r) => ({ n: r[0], x: r[1], y: r[2], ns: r[3], a: r[4], c: r[5], mine: false }));

  // ---- ほぞん -----------------------------------------------------------
  const settings = { sound: true, view: null, mine: [] };
  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { raw = null; }
    if (!raw) return;
    if (typeof raw.sound === 'boolean') settings.sound = raw.sound;
    if (raw.view && isFinite(raw.view.s)) settings.view = raw.view;
    if (Array.isArray(raw.mine)) {
      settings.mine = raw.mine.filter((m) => m && typeof m.n === 'string' && isFinite(m.lat) && isFinite(m.lon));
    }
  }
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ v: 1, sound: settings.sound, view: view, mine: settings.mine }));
    } catch (e) { /* ほぞん できなくても つかえる */ }
  }

  function mercY(lat) {
    return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 180 / Math.PI;
  }
  function project(lon, lat) { return [(lon - DATA.lon0) * K, (Y0 - mercY(lat)) * K]; }
  function nearStations(x, y) {
    const list = railSt.map((i) => [i, Math.hypot(ST[i][2] - x, ST[i][3] - y) * M_PER_UNIT]);
    list.sort((a, b) => a[1] - b[1]);
    const ns = list.slice(0, 3).filter((p) => p[1] <= NEAR_M).map((p) => [p[0], Math.round(p[1])]);
    return ns.length ? ns : [[list[0][0], Math.round(list[0][1])]];
  }
  function cityOf(addr) {
    const m = /^(?:神奈川県)?(.+?[市郡](?:.+?区)?|.+?[町村])/.exec(addr || '');
    return m ? m[1] : '';
  }
  function mineToRoom(m) {
    const [x, y] = project(m.lon, m.lat);
    return { n: m.n, x, y, ns: nearStations(x, y), a: (m.a || '').replace(/^神奈川県/, ''), c: cityOf(m.a), mine: true };
  }

  // えきごとの きょうしつ（いちばん ちかい えきで かぞえる）
  let stRooms = [];
  function rebuild() {
    ROOMS = BASE_ROOMS.concat(settings.mine.map(mineToRoom));
    stRooms = ST.map(() => []);
    ROOMS.forEach((r, ri) => stRooms[r.ns[0][0]].push(ri));
    $('countChip').textContent = '🏫 ' + ROOMS.length;
  }
  function lineRoomCount(L) { let n = 0; L.s.forEach((i) => { n += stRooms[i].length; }); return n; }

  // ---- おと (WebAudio の ごうせいおん) ---------------------------------
  let ac = null;
  function tone(freq, t0, dur, type, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ac.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, ac.currentTime + t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t0 + dur);
    o.connect(g).connect(ac.destination);
    o.start(ac.currentTime + t0);
    o.stop(ac.currentTime + t0 + dur + 0.05);
  }
  function sound(kind) {
    if (!settings.sound) return;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      if (kind === 'room') { tone(784, 0, 0.12, 'triangle', 0.15); tone(1175, 0.08, 0.2, 'triangle', 0.15); }
      else if (kind === 'st') { tone(660, 0, 0.1, 'square', 0.06); tone(880, 0.1, 0.16, 'square', 0.06); }
      else if (kind === 'tap') { tone(1000, 0, 0.06, 'sine', 0.06); }
      else if (kind === 'line') { [523, 659, 784].forEach((f, k) => tone(f, k * 0.08, 0.18, 'triangle', 0.12)); }
      else if (kind === 'ok') { [523, 659, 784, 1047].forEach((f, k) => tone(f, k * 0.1, 0.25, 'triangle', 0.14)); }
      else if (kind === 'ng') { tone(300, 0, 0.25, 'sine', 0.15); }
    } catch (e) { /* おとが でなくても つかえる */ }
  }

  // ---- ひょうじの ヘルパー ---------------------------------------------
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function ruby(kanji, kana) {
    if (!kana || kana === kanji) return esc(kanji);
    return '<ruby>' + esc(kanji) + '<rt>' + esc(kana) + '</rt></ruby>';
  }
  function stRuby(i) { return ruby(ST[i][0], ST[i][1]) + '<small>えき</small>'; }
  function lineRuby(L) {
    const m = /^(.+?)(（.*）)$/.exec(L.n);
    return m ? ruby(m[1], L.k) + '<small>' + esc(m[2]) + '</small>' : ruby(L.n, L.k);
  }
  function opRuby(op) { return ruby(op, OP_KANA[op]); }
  function roomName(r) {
    return '公文式 ' + r.n.replace(/教室$/, '') + ' <small>きょうしつ</small>';
  }
  function distText(m) {
    const min = Math.max(1, Math.round(m * 1.3 / 80));
    const d = m < 1000 ? m + 'm' : (m / 1000).toFixed(1) + 'km';
    return 'あるいて やく <b>' + min + 'ぷん</b>（まっすぐ ' + d + '）' + (m > 1600 ? ' 🚌 バスも べんりかも' : '');
  }
  function lineChips(i, asButtons) {
    return stLines[i].map((li) => {
      const L = LINES[li];
      const inner = '<i style="--c:' + L.c + '"></i>' + lineRuby(L);
      return asButtons
        ? '<button type="button" class="lchip" data-line="' + li + '">' + inner + '</button>'
        : '<span class="lchip">' + inner + '</span>';
    }).join('');
  }
  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // ---- ちず -----------------------------------------------------------
  const svg = $('map');
  const world = $('world');
  let W = 0, H = 0;
  const view = { s: 0.03, tx: 0, ty: 0 };

  // かながわけんの はんい
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  DATA.prefs.forEach((p) => {
    if (!p.k) return;
    p.p.forEach((ring) => ring.forEach((q) => {
      minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]);
      minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]);
    }));
  });

  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function segD(flat) {
    let d = 'M' + flat[0] + ' ' + flat[1];
    for (let k = 2; k < flat.length; k += 2) d += 'l' + flat[k] + ' ' + flat[k + 1];
    return d;
  }

  (function drawPrefs() {
    const g = $('prefs');
    DATA.prefs.forEach((p) => {
      let d = '';
      p.p.forEach((ring) => { d += 'M' + ring.map((q) => q[0] + ' ' + q[1]).join('L') + 'Z'; });
      el('path', { d, class: p.k ? 'home' : 'out', 'fill-rule': 'evenodd' }, g);
    });
  })();

  (function drawTracks() {
    const g = $('tracks');
    LINES.map((L, li) => li).sort((a, b) => (LINES[a].cat === 'shin') - (LINES[b].cat === 'shin')).forEach((li) => {
      const L = LINES[li];
      el('path', { d: L.e.map((e) => segD(e[2])).join(''), stroke: L.c }, g);
    });
  })();

  const roomsG = $('rooms');
  const roomOut = el('path', { stroke: '#fff' }, roomsG);
  const roomIn = el('path', { stroke: 'var(--room)' }, roomsG);
  const mineOut = el('path', { stroke: '#fff' }, roomsG);
  const mineIn = el('path', { stroke: 'var(--mine)' }, roomsG);
  const dotsG = $('dots');
  const selRing = el('path', { stroke: '#ffd400', 'stroke-opacity': '.95' }, $('marks'));
  const selDot = el('path', { stroke: 'var(--room)' }, $('marks'));
  const dotOut = el('path', { stroke: '#4a5a70' }, dotsG);
  const dotIn = el('path', { stroke: '#fff' }, dotsG);

  function ptD(list) {
    let d = '';
    list.forEach((p) => { d += 'M' + p[0] + ' ' + p[1] + 'h0.01'; });
    return d || 'M0 0';
  }
  function drawPoints() {
    const st = railSt.map((i) => [ST[i][2], ST[i][3]]);
    dotOut.setAttribute('d', ptD(st));
    dotIn.setAttribute('d', ptD(st));
    const base = [], mine = [];
    ROOMS.forEach((r) => (r.mine ? mine : base).push([r.x, r.y]));
    roomOut.setAttribute('d', ptD(base));
    roomIn.setAttribute('d', ptD(base));
    mineOut.setAttribute('d', ptD(mine));
    mineIn.setAttribute('d', ptD(mine));
  }

  // えらんでいる もの
  let sel = null; // { type: 'room'|'st', i }
  let focus = -1; // えらんだ ろせん
  function drawSel() {
    if (!sel) { selRing.setAttribute('d', 'M0 0'); selDot.setAttribute('d', 'M0 0'); return; }
    const p = sel.type === 'room' ? [ROOMS[sel.i].x, ROOMS[sel.i].y] : [ST[sel.i][2], ST[sel.i][3]];
    selRing.setAttribute('d', ptD([p]));
    selDot.setAttribute('d', sel.type === 'room' ? ptD([p]) : 'M0 0');
    selDot.setAttribute('stroke', sel.type === 'room' && ROOMS[sel.i].mine ? 'var(--mine)' : 'var(--room)');
  }
  function drawFocus() {
    const g = $('focusLine');
    g.textContent = '';
    $('tracks').classList.toggle('dim', focus >= 0);
    if (focus < 0) return;
    const L = LINES[focus];
    el('path', { d: L.e.map((e) => segD(e[2])).join(''), stroke: '#fff' }, g).classList.add('halo');
    el('path', { d: L.e.map((e) => segD(e[2])).join(''), stroke: L.c }, g);
  }

  let zLevel = -1;
  function sizes() {
    const s = view.s;
    const z = s < 0.04 ? 0 : s < 0.1 ? 1 : s < 0.3 ? 2 : s < 0.8 ? 3 : 4;
    const room = [5, 8, 13, 18, 22][z];
    const st = [0, 5, 9, 12, 14][z];
    roomOut.setAttribute('stroke-width', room + 3);
    roomIn.setAttribute('stroke-width', room);
    mineOut.setAttribute('stroke-width', room + 3);
    mineIn.setAttribute('stroke-width', room);
    dotOut.setAttribute('stroke-width', st);
    dotIn.setAttribute('stroke-width', Math.max(0, st - 5));
    selRing.setAttribute('stroke-width', Math.max(room, st) + 16);
    selDot.setAttribute('stroke-width', room + 2);
    $('tracks').setAttribute('stroke-width', [1.5, 2.5, 3.5, 5, 6][z]);
    const fl = $('focusLine');
    fl.setAttribute('stroke-width', [4, 6, 8, 10, 12][z]);
    fl.querySelectorAll('.halo').forEach((p) => p.setAttribute('stroke-width', [8, 10, 13, 16, 18][z]));
    const lab = $('labels');
    lab.setAttribute('font-size', 13 / s);
    lab.setAttribute('stroke-width', 3.5 / s);
    zLevel = z;
  }
  function applyView() {
    world.setAttribute('transform', 'matrix(' + view.s + ' 0 0 ' + view.s + ' ' + view.tx + ' ' + view.ty + ')');
    sizes();
    scheduleLabels();
  }
  let labelTimer = 0;
  function scheduleLabels() { clearTimeout(labelTimer); labelTimer = setTimeout(drawLabels, 90); }
  function drawLabels() {
    const g = $('labels');
    g.textContent = '';
    if (view.s < 0.04) return;
    const x0 = -view.tx / view.s, y0 = -view.ty / view.s;
    const x1 = x0 + W / view.s, y1 = y0 + H / view.s;
    const inv = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
    const items = [];
    // えき（ろせんが おおい えき から）
    railSt.forEach((i) => {
      if (!inv(ST[i][2], ST[i][3])) return;
      if (focus >= 0 && !stLines[i].includes(focus) && view.s < 0.3) return;
      items.push({ x: ST[i][2], y: ST[i][3], t: ST[i][0], p: 10 + stLines[i].length + (focus >= 0 && stLines[i].includes(focus) ? 20 : 0) });
    });
    // きょうしつ（ちかづいた とき だけ）
    if (view.s >= 0.5) {
      ROOMS.forEach((r) => {
        if (!inv(r.x, r.y)) return;
        items.push({ x: r.x, y: r.y, t: r.n.replace(/教室$/, ''), p: 5, cls: r.mine ? 'm' : 'r' });
      });
    }
    if (sel) {
      const p = sel.type === 'room' ? ROOMS[sel.i] : null;
      if (p) items.push({ x: p.x, y: p.y, t: p.n.replace(/教室$/, ''), p: 100, cls: p.mine ? 'm' : 'r' });
      else items.push({ x: ST[sel.i][2], y: ST[sel.i][3], t: ST[sel.i][0], p: 100 });
    }
    items.sort((a, b) => b.p - a.p);
    const placed = [];
    const off = 11 / view.s;
    let n = 0;
    for (const it of items) {
      if (n > 120) break;
      const sx = it.x * view.s + view.tx, sy = it.y * view.s + view.ty;
      const w = it.t.length * 13 + 8;
      const box = [sx + 10, sy - 9, sx + 10 + w, sy + 9];
      if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      placed.push(box);
      const t = el('text', { x: it.x + off, y: it.y }, g);
      if (it.cls) t.setAttribute('class', it.cls);
      t.textContent = it.t;
      n++;
    }
  }

  function clampS(s) { return Math.max(0.012, Math.min(4, s)); }
  function fit(x0, y0, x1, y1, pad, animate) {
    pad = pad == null ? 40 : pad;
    const s = clampS(Math.min((W - pad * 2) / Math.max(x1 - x0, 60), (H - pad * 2) / Math.max(y1 - y0, 60)));
    const target = { s, tx: W / 2 - (x0 + x1) / 2 * s, ty: H / 2 - (y0 + y1) / 2 * s };
    if (animate) flyTo(target); else { Object.assign(view, target); applyView(); }
  }
  function fitPoints(pts, maxS) {
    if (!pts.length) return;
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    pts.forEach((p) => { a = Math.min(a, p[0]); c = Math.max(c, p[0]); b = Math.min(b, p[1]); d = Math.max(d, p[1]); });
    const pad = 50;
    let s = clampS(Math.min((W - pad * 2) / Math.max(c - a, 60), (H * 0.55 - pad) / Math.max(d - b, 60)));
    if (maxS) s = Math.min(s, maxS);
    flyTo({ s, tx: W / 2 - (a + c) / 2 * s, ty: H * 0.3 - (b + d) / 2 * s });
  }
  let flyRaf = 0;
  function flyTo(target) {
    cancelAnimationFrame(flyRaf);
    const from = Object.assign({}, view);
    const t0 = performance.now();
    const dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
    const step = (now) => {
      const t = dur ? Math.min(1, (now - t0) / dur) : 1;
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const s = from.s * Math.pow(target.s / from.s, e);
      const cxF = (W / 2 - from.tx) / from.s, cyF = (H / 2 - from.ty) / from.s;
      const cxT = (W / 2 - target.tx) / target.s, cyT = (H / 2 - target.ty) / target.s;
      const cx = cxF + (cxT - cxF) * e, cy = cyF + (cyT - cyF) * e;
      view.s = s; view.tx = W / 2 - cx * s; view.ty = H / 2 - cy * s;
      applyView();
      if (t < 1) flyRaf = requestAnimationFrame(step); else save();
    };
    flyRaf = requestAnimationFrame(step);
  }
  function zoomAt(f, sx, sy) {
    const s = clampS(view.s * f);
    const k = s / view.s;
    view.tx = sx - (sx - view.tx) * k;
    view.ty = sy - (sy - view.ty) * k;
    view.s = s;
    applyView();
  }
  function centerOn(x, y, s) {
    const target = { s: Math.max(view.s, s || 0.35) };
    const wide = matchMedia('(min-width: 760px) and (orientation: landscape)').matches;
    target.tx = (wide ? W * 0.62 : W / 2) - x * target.s;
    target.ty = (wide ? H / 2 : H * 0.3) - y * target.s;
    flyTo(target);
  }

  // ---- ゆび・マウス ------------------------------------------------------
  const pts = new Map();
  let gesture = null;
  let saveTimer = 0;
  function laterSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 600); }

  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cancelAnimationFrame(flyRaf);
    const r = svg.getBoundingClientRect();
    if (pts.size === 1) {
      gesture = { type: 'pan', sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty, t: Date.now(), moved: false };
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      gesture = {
        type: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s, tx: view.tx, ty: view.ty,
        mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top, r, moved: true,
      };
    }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId) || !gesture) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture.type === 'pan' && pts.size === 1) {
      const dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
      if (!gesture.moved && Math.hypot(dx, dy) > 8) { gesture.moved = true; svg.classList.add('dragging'); }
      if (gesture.moved) { view.tx = gesture.tx + dx; view.ty = gesture.ty + dy; applyView(); }
    } else if (gesture.type === 'pinch' && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2 - gesture.r.left, my = (a.y + b.y) / 2 - gesture.r.top;
      const s = clampS(gesture.s * d / Math.max(gesture.d, 1));
      const k = s / gesture.s;
      view.s = s;
      view.tx = mx - (gesture.mx - gesture.tx) * k;
      view.ty = my - (gesture.my - gesture.ty) * k;
      applyView();
    }
  });
  function endPointer(e) {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    svg.classList.remove('dragging');
    if (gesture && gesture.type === 'pan' && !gesture.moved && e.type === 'pointerup' && Date.now() - gesture.t < 600) {
      const r = svg.getBoundingClientRect();
      tapAt(e.clientX - r.left, e.clientY - r.top, e.pointerType === 'mouse' ? 14 : 24);
    }
    if (pts.size === 1 && gesture && gesture.type === 'pinch') {
      const p = [...pts.values()][0];
      gesture = { type: 'pan', sx: p.x, sy: p.y, tx: view.tx, ty: view.ty, t: 0, moved: true };
    } else if (pts.size === 0) {
      gesture = null;
      laterSave();
    }
  }
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)), e.clientX - r.left, e.clientY - r.top);
    laterSave();
  }, { passive: false });

  function tapAt(sx, sy, radius) {
    let best = null, bd = radius;
    ROOMS.forEach((r, i) => {
      const d = Math.hypot(r.x * view.s + view.tx - sx, r.y * view.s + view.ty - sy);
      if (d < bd) { bd = d; best = { type: 'room', i }; }
    });
    if (view.s >= 0.04) {
      // えきは すこし ゆずる（きょうしつと かさなったら きょうしつ）
      railSt.forEach((i) => {
        const d = Math.hypot(ST[i][2] * view.s + view.tx - sx, ST[i][3] * view.s + view.ty - sy) + 4;
        if (d < bd) { bd = d; best = { type: 'st', i }; }
      });
    }
    if (best && view.s < 0.06) {
      // とおくから みている ときは まず ちかづける
      zoomAt(3, sx, sy); laterSave();
      return;
    }
    if (best) {
      if (best.type === 'room') openRoom(best.i, false); else openStation(best.i, false);
    } else if (!$('sheet').hidden) closeSheet();
    else if (view.s < 0.1) { zoomAt(2.2, sx, sy); laterSave(); }
  }

  $('zoomIn').onclick = () => { zoomAt(1.8, W / 2, H / 2); laterSave(); };
  $('zoomOut').onclick = () => { zoomAt(1 / 1.8, W / 2, H / 2); laterSave(); };
  $('zoomAll').onclick = () => { setFocus(-1); fit(minX, minY, maxX, maxY, 16, true); };

  // ---- シート -----------------------------------------------------------
  function closeSheet() {
    $('sheet').hidden = true;
    sel = null; drawSel(); scheduleLabels();
  }
  function showSheet(html) {
    $('sheetBody').innerHTML = html;
    $('sheet').hidden = false;
    $('sheet').scrollTop = 0;
    $('hint').hidden = true;
    if (matchMedia('(max-width: 759px), (orientation: portrait)').matches) $('panel').hidden = true;
  }

  function openRoom(ri, center) {
    const r = ROOMS[ri];
    sound('room');
    sel = { type: 'room', i: ri }; drawSel(); scheduleLabels();
    const near = r.ns.map((p, k) => {
      const i = p[0];
      return '<button type="button" class="nearRow' + (k === 0 ? ' first' : '') + '" data-st="' + i + '">' +
        '<span class="ico">' + (k === 0 ? '🚉' : '🚏') + '</span><span class="tx">' +
        '<span class="nm">' + stRuby(i) + '</span>' +
        '<span class="dist">' + distText(p[1]) + '</span>' +
        '<span class="lchips">' + lineChips(i, false) + '</span></span></button>';
    }).join('');
    const q = encodeURIComponent((r.mine ? '' : '公文式 ') + r.n + ' ' + (r.a.startsWith('神奈川') ? '' : '神奈川県') + r.a.split(/\s/)[0]);
    showSheet(
      '<span class="kind' + (r.mine ? ' mine' : '') + '">' + (r.mine ? 'ふやした きょうしつ' : 'くもんの きょうしつ') + '</span>' +
      '<div class="sName">' + (r.mine ? esc(r.n) : roomName(r)) + '</div>' +
      '<div class="sAddr">📍 ' + esc(r.a || '') + '</div>' +
      '<div class="sec">ちかくの えき</div><div class="near">' + near + '</div>' +
      '<p class="note">※ あるく じかんは まっすぐの きょりから だした めやす。きょうしつの じかんや ばしょは かわることが あるので、おうちの ひとと たしかめてね。</p>' +
      '<div class="btnRow"><a class="btn sub" href="https://www.google.com/maps/search/?api=1&query=' + q + '" target="_blank" rel="noopener">🗺️ ちずアプリで みる</a></div>'
    );
    if (center) centerOn(r.x, r.y, 0.6);
  }

  function openStation(i, center) {
    sound('st');
    sel = { type: 'st', i }; drawSel(); scheduleLabels();
    // この えきが いちばん ちかい きょうしつ ＋ 1.2km いないの きょうしつ
    const list = [];
    ROOMS.forEach((r, ri) => {
      const p = r.ns.find((q) => q[0] === i);
      if (p && (r.ns[0][0] === i || p[1] <= 1200)) list.push([ri, p[1], r.ns[0][0] === i]);
    });
    list.sort((a, b) => a[1] - b[1]);
    const rows = list.map(([ri, d, first]) => {
      const r = ROOMS[ri];
      return '<button type="button" class="nearRow' + (first ? ' first' : '') + '" data-room="' + ri + '">' +
        '<span class="ico">' + (r.mine ? '🟣' : '✏️') + '</span><span class="tx">' +
        '<span class="nm">' + esc(r.n) + '</span>' +
        '<span class="dist">' + distText(d) + (first ? '' : '　<small>（ほかの えきの ほうが ちかい）</small>') + '</span></span></button>';
    }).join('');
    const nFirst = stRooms[i].length;
    showSheet(
      '<span class="kind st">えき</span>' +
      '<div class="sName">' + stRuby(i) + '</div>' +
      '<div class="sAddr">' + (ST[i][4] ? 'かながわけん' : 'となりの とけん') + '</div>' +
      '<div class="lchips">' + lineChips(i, true) + '</div>' +
      '<div class="sec">この えきが いちばん ちかい きょうしつ：' + nFirst + 'こ</div>' +
      (rows ? '<div class="near">' + rows + '</div>' : '<p class="empty">ちかくに くもんの きょうしつは ないみたい</p>')
    );
    if (center) centerOn(ST[i][2], ST[i][3], 0.35);
  }

  $('sheet').addEventListener('click', (e) => {
    const b = e.target.closest('button, a');
    if (!b) return;
    if (b.hasAttribute('data-close')) { sound('tap'); closeSheet(); return; }
    if (b.dataset.st != null) { openStation(+b.dataset.st, true); return; }
    if (b.dataset.room != null) { openRoom(+b.dataset.room, true); return; }
    if (b.dataset.line != null) { openLine(+b.dataset.line); }
  });

  // ---- パネル -----------------------------------------------------------
  const st = { tab: 'map', cat: 'all', line: -1, q: '', town: '' };
  function setTab(tab) {
    st.tab = tab;
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    if (tab === 'map') { $('panel').hidden = true; return; }
    if (matchMedia('(max-width: 759px), (orientation: portrait)').matches) $('sheet').hidden = true;
    $('panel').hidden = false;
    $('hint').hidden = true;
    renderPanel();
    $('panelBody').scrollTop = 0;
  }
  document.querySelectorAll('#tabs button').forEach((b) => {
    b.onclick = () => { sound('tap'); setTab(b.dataset.tab); };
  });
  $('panel').querySelector('[data-close]').onclick = () => { sound('tap'); setTab('map'); };
  $('panelBack').onclick = () => {
    sound('tap');
    if (st.tab === 'lines') { st.line = -1; setFocus(-1); }
    if (st.tab === 'town') st.town = '';
    renderPanel();
  };

  function setFocus(li) {
    focus = li;
    drawFocus(); sizes(); scheduleLabels();
  }
  function openLine(li) {
    sound('line');
    st.line = li;
    setFocus(li);
    setTab('lines');
    const L = LINES[li];
    fitPoints(L.s.filter((i) => ST[i][4]).map((i) => [ST[i][2], ST[i][3]]));
  }

  function renderPanel() {
    const body = $('panelBody');
    $('panelBack').hidden = !((st.tab === 'lines' && st.line >= 0) || (st.tab === 'town' && st.town));
    if (st.tab === 'lines') {
      if (st.line >= 0) return renderLine(body);
      $('panelTitle').textContent = '🛤️ ろせんで さがす';
      const cats = CATS.filter(([c]) => c === 'all' || LINES.some((L) => L.cat === c));
      let h = '<div class="cats">' + cats.map(([c, n]) =>
        '<button type="button" data-cat="' + c + '" class="' + (st.cat === c ? 'on' : '') + '">' + n + '</button>').join('') + '</div>';
      h += '<p class="lead">ろせんを えらぶと、えきごとに ちかくの きょうしつの かずが わかるよ。</p>';
      const list = LINES.map((L, li) => ({ L, li, n: lineRoomCount(L) }))
        .filter((o) => st.cat === 'all' || o.L.cat === st.cat)
        .sort((a, b) => b.n - a.n);
      h += list.map((o) =>
        '<button type="button" class="row" data-line="' + o.li + '"><span class="bar" style="--c:' + o.L.c + '"></span>' +
        '<span class="nm">' + lineRuby(o.L) + '<small>' + opRuby(o.L.op) + '</small></span>' +
        '<span class="cnt' + (o.n ? '' : ' zero') + '">' + o.n + '</span></button>').join('');
      body.innerHTML = h;
    } else if (st.tab === 'search') {
      $('panelTitle').textContent = '🔍 さがす';
      body.innerHTML = '<input type="search" class="searchBox" id="q" placeholder="えき・きょうしつ・まちの なまえ" enterkeyhint="search" autocomplete="off">' +
        '<div id="results"></div>';
      const q = $('q');
      q.value = st.q;
      q.oninput = () => { st.q = q.value; renderResults(); };
      renderResults();
    } else if (st.tab === 'town') {
      if (st.town) return renderTown(body);
      $('panelTitle').textContent = '🏙️ まちで さがす';
      const cnt = new Map();
      ROOMS.forEach((r) => { if (r.c) cnt.set(r.c, (cnt.get(r.c) || 0) + 1); });
      const list = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
      body.innerHTML = '<p class="lead">しや くの なまえを えらぶと、その まちの きょうしつが でるよ。</p>' +
        list.map(([c, n]) => '<button type="button" class="row" data-town="' + esc(c) + '"><span class="ico">🏙️</span>' +
          '<span class="nm">' + esc(c) + '</span><span class="cnt">' + n + '</span></button>').join('');
    } else if (st.tab === 'add') {
      renderAdd(body);
    }
  }

  function renderLine(body) {
    const L = LINES[st.line];
    $('panelTitle').innerHTML = lineRuby(L);
    const total = lineRoomCount(L);
    let h = '<p class="lead">' + opRuby(L.op) + '　えきを タップすると ちかくの きょうしつが でるよ。<br>' +
      'この ろせんの えきが いちばん ちかい きょうしつ：<b>' + total + 'こ</b></p>';
    // となりの とけんの えきは、きょうしつが ある ときだけ だす
    h += '<ul class="stList" style="--c:' + L.c + '">' + L.s.filter((i) => ST[i][4] || stRooms[i].length).map((i) => {
      const n = stRooms[i].length;
      return '<li class="' + (n ? 'has' : '') + '"><button type="button" class="row" data-st="' + i + '">' +
        '<span class="dot">' + (n || '') + '</span><span class="nm">' + stRuby(i) +
        (ST[i][4] ? '' : '<small>となりの とけん</small>') + '</span>' +
        '<span class="cnt' + (n ? '' : ' zero') + '">' + n + '</span></button></li>';
    }).join('') + '</ul>';
    body.innerHTML = h;
  }

  function renderTown(body) {
    $('panelTitle').textContent = '🏙️ ' + st.town;
    const list = [];
    ROOMS.forEach((r, ri) => { if (r.c === st.town) list.push(ri); });
    list.sort((a, b) => ROOMS[a].ns[0][1] - ROOMS[b].ns[0][1]);
    body.innerHTML = '<p class="lead">' + list.length + 'この きょうしつ（えきに ちかい じゅん）</p>' + roomRows(list);
  }

  function roomRows(list) {
    return list.map((ri) => {
      const r = ROOMS[ri], s = r.ns[0][0];
      return '<button type="button" class="row" data-room="' + ri + '"><span class="ico">' + (r.mine ? '🟣' : '✏️') + '</span>' +
        '<span class="nm">' + esc(r.n) + '<small>🚉 ' + esc(ST[s][0]) + 'えき から あるいて やく ' +
        Math.max(1, Math.round(r.ns[0][1] * 1.3 / 80)) + 'ぷん</small></span></button>';
    }).join('');
  }

  // ひらがな・カタカナを そろえて くらべる
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[\s　]/g, '');
  }
  function renderResults() {
    const box = $('results');
    const q = norm(st.q).replace(/(えき|駅)$/, '');
    if (!q) {
      box.innerHTML = '<p class="lead">たとえば「よこはま」「新横浜」「鶴見」など。えきの なまえは ひらがなでも さがせるよ。</p>';
      return;
    }
    const sts = railSt.filter((i) => norm(ST[i][0]).includes(q) || norm(ST[i][1]).includes(q))
      .sort((a, b) => stRooms[b].length - stRooms[a].length).slice(0, 30);
    const rooms = [];
    ROOMS.forEach((r, ri) => { if (norm(r.n).includes(q) || norm(r.a).includes(q)) rooms.push(ri); });
    let h = '';
    if (sts.length) {
      h += '<div class="sec">🚉 えき</div>' + sts.map((i) =>
        '<button type="button" class="row" data-st="' + i + '"><span class="ico">🚉</span><span class="nm">' + stRuby(i) +
        '<small>' + stLines[i].map((li) => esc(LINES[li].n)).join('・') + '</small></span>' +
        '<span class="cnt' + (stRooms[i].length ? '' : ' zero') + '">' + stRooms[i].length + '</span></button>').join('');
    }
    if (rooms.length) {
      h += '<div class="sec">✏️ きょうしつ（' + rooms.length + 'こ）</div>' + roomRows(rooms.slice(0, 80));
      if (rooms.length > 80) h += '<p class="lead">ほかにも ' + (rooms.length - 80) + 'こ あるよ。ことばを ふやしてね。</p>';
    }
    box.innerHTML = h || '<p class="empty">みつからなかったよ</p>';
  }

  $('panelBody').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.cat) { sound('tap'); st.cat = b.dataset.cat; renderPanel(); return; }
    if (b.dataset.line != null) { openLine(+b.dataset.line); $('panelBody').scrollTop = 0; return; }
    if (b.dataset.st != null) { openStation(+b.dataset.st, true); return; }
    if (b.dataset.room != null) { openRoom(+b.dataset.room, true); return; }
    if (b.dataset.town) {
      sound('tap');
      st.town = b.dataset.town;
      renderPanel();
      $('panelBody').scrollTop = 0;
      fitPoints(ROOMS.filter((r) => r.c === st.town).map((r) => [r.x, r.y]), 0.5);
      return;
    }
    if (b.dataset.act) addAction(b.dataset.act);
  });

  // ---- ふやす (CSV) ----------------------------------------------------
  function renderAdd(body) {
    $('panelTitle').textContent = '➕ きょうしつを ふやす';
    const mine = settings.mine;
    body.innerHTML =
      '<p class="lead">おうちの ひと むけ：CSV（カンマ くぎり）を はりつけるか、ファイルを えらぶと、ちずに きょうしつを ふやせます。' +
      'この たんまつ だけに ほぞんされます。</p>' +
      '<div class="box">1ぎょう 1きょうしつ。れつは <code>なまえ,じゅうしょ,いど,けいど</code>。<br>' +
      'いど・けいどが なければ じゅうしょから ばしょを しらべます（国土地理院の 住所検索・インターネットが ひつよう）。<br>' +
      'れい：<br><code>公文式 ○○教室,神奈川県横浜市西区高島2丁目1-1</code><br><code>○○教室,,35.4658,139.6223</code></div>' +
      '<textarea class="csvBox" id="csv" placeholder="ここに はりつけ"></textarea>' +
      '<div class="btnRow"><button type="button" class="btn" data-act="import">📥 よみこむ</button>' +
      '<button type="button" class="btn sub" data-act="file">📄 ファイルを えらぶ</button></div>' +
      '<div class="sec">ふやした きょうしつ：' + mine.length + 'こ</div>' +
      roomRows(ROOMS.map((r, i) => i).filter((i) => ROOMS[i].mine)) +
      (mine.length ? '<div class="btnRow"><button type="button" class="btn sub" data-act="export">💾 CSVで ほぞん</button>' +
        '<button type="button" class="btn danger" data-act="clear">🗑️ ぜんぶ けす</button></div>' : '') +
      '<p class="credit">きょうしつの データ：<a href="https://diamond.jp/educate/brand/kumon/list/kanagawaken/" target="_blank" rel="noopener">ダイヤモンド教育ラボ「公文式（神奈川県）」</a>の いちらん（' +
      BASE_ROOMS.length + 'きょうしつ）を もとに、<a href="https://msearch.gsi.go.jp/" target="_blank" rel="noopener">国土地理院</a>の 住所検索で ばしょを つけたもの。' +
      'ばしょは ちょうめ くらいまでの めやすで、いまは ない きょうしつや あたらしい きょうしつが あるかも しれません。' +
      'さいしんの じょうほうは <a href="https://www.kumon.ne.jp/" target="_blank" rel="noopener">公文式の 公式サイト</a>で たしかめてね。<br>' +
      'えき・せんろ：国土数値情報 鉄道データ（国土交通省）、えきの よみ：Wikidata。</p>';
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',' || c === '\t') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    row.push(cell); rows.push(row);
    return rows.map((r) => r.map((s) => s.trim())).filter((r) => r.some((s) => s));
  }

  async function geocode(addr) {
    const res = await fetch('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + encodeURIComponent(addr.split(/[\s　]/)[0]));
    const js = await res.json();
    if (!js.length) return null;
    const [lon, lat] = js[0].geometry.coordinates;
    return { lat, lon };
  }

  let busy = false;
  async function importText(text) {
    if (busy) return;
    let rows = parseCSV(text.replace(/^﻿/, ''));
    if (rows.length && /なまえ|名前|name|教室名/i.test(rows[0][0])) rows = rows.slice(1);
    if (!rows.length) { sound('ng'); toast('よみこめる ぎょうが ないよ'); return; }
    busy = true;
    let ok = 0, ng = 0;
    for (let k = 0; k < rows.length; k++) {
      const [n, a, la, lo] = rows[k];
      if (!n) { ng++; continue; }
      let lat = parseFloat(la), lon = parseFloat(lo);
      if (!(isFinite(lat) && isFinite(lon))) {
        if (!a) { ng++; continue; }
        toast('ばしょを しらべているよ… ' + (k + 1) + '/' + rows.length);
        try {
          const g = await geocode(a);
          if (!g) { ng++; continue; }
          lat = g.lat; lon = g.lon;
        } catch (e) { ng++; continue; }
      }
      // かながわけんの まわりだけ
      if (lat < 34.9 || lat > 35.9 || lon < 138.7 || lon > 140.0) { ng++; continue; }
      settings.mine.push({ n: n.slice(0, 60), a: (a || '').slice(0, 120), lat: +lat.toFixed(6), lon: +lon.toFixed(6) });
      ok++;
    }
    busy = false;
    save();
    rebuild(); drawPoints();
    renderPanel();
    sound(ok ? 'ok' : 'ng');
    toast(ok + 'こ ふやしたよ' + (ng ? '（' + ng + 'こ よみこめなかった）' : ''));
  }

  function addAction(act) {
    if (act === 'import') { importText($('csv').value); }
    else if (act === 'file') { $('csvFile').click(); }
    else if (act === 'clear') {
      if (!confirm('ふやした きょうしつを ぜんぶ けしますか？')) return;
      settings.mine = []; save(); sel = null; drawSel(); $('sheet').hidden = true;
      rebuild(); drawPoints(); renderPanel(); sound('tap');
    } else if (act === 'export') {
      const lines = ['なまえ,じゅうしょ,いど,けいど'].concat(settings.mine.map((m) =>
        [m.n, m.a, m.lat, m.lon].map((v) => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(',')));
      const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'kumon-map-mine.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  }
  $('csvFile').onchange = () => {
    const f = $('csvFile').files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { importText(String(rd.result)); $('csvFile').value = ''; };
    rd.readAsText(f);
  };

  // ---- おと ボタン --------------------------------------------------------
  function drawSoundBtn() { $('soundBtn').textContent = settings.sound ? '🔊' : '🔇'; }
  $('soundBtn').onclick = () => {
    settings.sound = !settings.sound; drawSoundBtn(); save();
    if (settings.sound) sound('tap');
  };

  // ---- はじめる ---------------------------------------------------------
  function resize() {
    const r = svg.getBoundingClientRect();
    const cx = (W / 2 - view.tx) / view.s, cy = (H / 2 - view.ty) / view.s;
    const had = W > 0;
    W = r.width; H = r.height;
    if (had) { view.tx = W / 2 - cx * view.s; view.ty = H / 2 - cy * view.s; }
    applyView();
  }
  load();
  rebuild();
  drawSoundBtn();
  drawPoints();
  resize();
  if (settings.view) { Object.assign(view, settings.view); applyView(); }
  else fit(minX, minY, maxX, maxY, 16, false);
  window.addEventListener('resize', resize);
})();
