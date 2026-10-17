// てつどう ちずちょう — いった えきを ぬりつぶす かんとう・しずおかの てつどう ちず
(function () {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';
  const STORE = 'tetsudo-chizucho-v1';
  const $ = (id) => document.getElementById(id);

  // ---- データ ----------------------------------------------------------
  // ST[i] = [なまえ, よみ, x, y, けん]
  const ST = DATA.st;
  const LINES = DATA.lines;
  const N = ST.length;
  const stLines = ST.map(() => []);
  LINES.forEach((L, li) => {
    L.s.forEach((i) => stLines[i].push(li));
    L.adj = new Map();
    L.e.forEach(([a, b]) => {
      if (!L.adj.has(a)) L.adj.set(a, []);
      if (!L.adj.has(b)) L.adj.set(b, []);
      L.adj.get(a).push(b);
      L.adj.get(b).push(a);
    });
  });
  const PREF_KANA = ['いばらきけん', 'とちぎけん', 'ぐんまけん', 'さいたまけん', 'ちばけん', 'とうきょうと', 'かながわけん', 'しずおかけん'];
  const CATS = [
    ['shin', 'しんかんせん'], ['jr', 'JR'], ['metro', 'ちかてつ'], ['shitetsu', 'してつ'], ['other', 'そのほか'],
  ];
  const OP_KANA = {
    'JR東日本': 'じぇいあーるひがしにほん', 'JR東海': 'じぇいあーるとうかい', '東京メトロ': 'とうきょうめとろ',
    '都営': 'とえい', '横浜市営': 'よこはましえい', '東急': 'とうきゅう', '京急': 'けいきゅう', '小田急': 'おだきゅう',
    '京王': 'けいおう', '西武': 'せいぶ', '東武': 'とうぶ', '京成': 'けいせい', '相鉄': 'そうてつ',
  };

  // ---- ほぞん -----------------------------------------------------------
  const visited = new Map();   // 駅番号 -> 'YYYY-MM-DD'
  const settings = { sound: true, kana: true, view: null };

  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { raw = null; }
    if (!raw) return;
    if (typeof raw.sound === 'boolean') settings.sound = raw.sound;
    if (typeof raw.kana === 'boolean') settings.kana = raw.kana;
    if (raw.view && isFinite(raw.view.s)) settings.view = raw.view;
    mergeVisits(raw.visits || []);
  }
  function save() {
    const visits = [];
    visited.forEach((d, i) => visits.push([ST[i][0], ST[i][2], ST[i][3], d]));
    try {
      localStorage.setItem(STORE, JSON.stringify({ v: 1, sound: settings.sound, kana: settings.kana, view: view, visits }));
    } catch (e) { /* ほぞん できなくても あそべる */ }
  }
  // [なまえ, x, y, ひづけ] の リストを とりこむ (データが かわっても なまえと ばしょで さがす)
  const byName = new Map();
  ST.forEach((s, i) => { if (!byName.has(s[0])) byName.set(s[0], []); byName.get(s[0]).push(i); });
  function mergeVisits(list) {
    let n = 0;
    list.forEach((v) => {
      if (!Array.isArray(v)) return;
      const cand = byName.get(v[0]) || [];
      let best = -1, bd = 400;
      cand.forEach((i) => {
        const d = Math.hypot(ST[i][2] - v[1], ST[i][3] - v[2]);
        if (d < bd) { bd = d; best = i; }
      });
      if (best >= 0 && !visited.has(best)) { visited.set(best, String(v[3] || today())); n++; }
    });
    return n;
  }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

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
      if (kind === 'on') { tone(880, 0, 0.18, 'triangle'); tone(1320, 0.09, 0.25, 'triangle'); }
      else if (kind === 'off') { tone(520, 0, 0.15, 'sine', 0.12); }
      else if (kind === 'tap') { tone(1000, 0, 0.06, 'sine', 0.06); }
      else if (kind === 'fan') {
        [523, 659, 784, 1047].forEach((f, k) => tone(f, k * 0.12, 0.3, 'square', 0.08));
        tone(1047, 0.5, 0.6, 'triangle', 0.18);
      }
    } catch (e) { /* おとが でなくても あそべる */ }
  }

  // ---- ひょうじの ヘルパー ---------------------------------------------
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function ruby(kanji, kana) {
    if (!kana || kana === kanji) return esc(kanji);
    return '<ruby>' + esc(kanji) + '<rt>' + esc(kana) + '</rt></ruby>';
  }
  function stRuby(i) { return ruby(ST[i][0], ST[i][1]); }
  function lineRuby(L) {
    // 「東北線（宇都宮線・京浜東北線）」は かっこの まえだけに ふりがな
    const m = /^(.+?)(（.*）)$/.exec(L.n);
    return m ? ruby(m[1], L.k) + '<small>' + esc(m[2]) + '</small>' : ruby(L.n, L.k);
  }
  function opRuby(op) { return ruby(op, OP_KANA[op]); }
  function label(i) { return settings.kana && ST[i][1] ? ST[i][1] : ST[i][0]; }
  function lineDone(L) { let n = 0; L.s.forEach((i) => { if (visited.has(i)) n++; }); return n; }

  // ---- ちず -----------------------------------------------------------
  const svg = $('map');
  const world = $('world');
  let W = 0, H = 0;
  const view = { s: 0.05, tx: 0, ty: 0 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  ST.forEach((s) => {
    minX = Math.min(minX, s[2]); maxX = Math.max(maxX, s[2]);
    minY = Math.min(minY, s[3]); maxY = Math.max(maxY, s[3]);
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

  // けんの かたち
  (function drawPrefs() {
    const g = $('prefs');
    DATA.prefs.forEach((p) => {
      let d = '';
      let big = null, bigA = 0;
      p.p.forEach((ring) => {
        d += 'M' + ring.map((q) => q[0] + ' ' + q[1]).join('L') + 'Z';
        let a = 0, cx = 0, cy = 0;
        for (let k = 0; k < ring.length; k++) {
          const [x1, y1] = ring[k], [x2, y2] = ring[(k + 1) % ring.length];
          const c = x1 * y2 - x2 * y1;
          a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c;
        }
        if (Math.abs(a) > bigA) { bigA = Math.abs(a); big = [cx / (3 * a), cy / (3 * a)]; }
      });
      el('path', { d, class: p.k ? 'kanto' : 'out', 'fill-rule': 'evenodd' }, g);
      if (p.k && big) {
        const t = el('text', { x: Math.round(big[0]), y: Math.round(big[1]), class: 'prefName' }, g);
        t.textContent = p.n;
        t.dataset.kana = PREF_KANA[PREF_NAMES.indexOf(p.n)] || p.n;
      }
    });
  })();

  // せんろ (ぜんぶ うすく)
  const trackPaths = [];
  (function drawTracks() {
    const g = $('tracks');
    // ほそい ろせんを したに、しんかんせんを うえに
    LINES.map((L, li) => li).sort((a, b) => (LINES[a].cat === 'shin') - (LINES[b].cat === 'shin')).forEach((li) => {
      const L = LINES[li];
      const d = L.e.map((e) => segD(e[2])).join('');
      trackPaths[li] = el('path', { d, stroke: L.c }, g);
    });
  })();

  const riddenG = $('ridden');
  const dotsG = $('dots');
  const selRing = el('path', { stroke: '#ffd400', 'stroke-opacity': '.9' }, dotsG);
  const dotOut = el('path', { stroke: '#4a5a70' }, dotsG);
  const dotIn = el('path', { stroke: '#fff' }, dotsG);
  const vOut = el('path', { stroke: '#fff' }, dotsG);
  const vIn = el('path', { stroke: 'var(--visit)' }, dotsG);
  const gpsOut = el('path', { stroke: '#fff' }, $('marks'));
  const gpsIn = el('path', { stroke: '#1a73e8' }, $('marks'));

  function dotD(ids) {
    let d = '';
    ids.forEach((i) => { d += 'M' + ST[i][2] + ' ' + ST[i][3] + 'h0.01'; });
    return d || 'M0 0';
  }

  function drawVisited() {
    const all = [], vis = [];
    for (let i = 0; i < N; i++) (visited.has(i) ? vis : all).push(i);
    dotOut.setAttribute('d', dotD(all));
    dotIn.setAttribute('d', dotD(all));
    vOut.setAttribute('d', dotD(vis));
    vIn.setAttribute('d', dotD(vis));
    // のった せんろ: となりあう 2えきを どちらも いったら ぬる
    riddenG.textContent = '';
    LINES.forEach((L) => {
      let d = '';
      L.e.forEach((e) => { if (visited.has(e[0]) && visited.has(e[1])) d += segD(e[2]); });
      if (d) el('path', { d, stroke: L.c }, riddenG);
    });
    $('countChip').textContent = '🚉 ' + visited.size + ' / ' + N;
    scheduleLabels();
  }

  // ---- ひょうじの たてよこ ----------------------------------------------
  let labelTimer = 0;
  function sizes() {
    // ズームに あわせて まるの おおきさを かえる (画面の px)
    const s = view.s;
    const z = s < 0.03 ? 0 : s < 0.08 ? 1 : s < 0.2 ? 2 : 3;
    const base = [1.8, 4.5, 8, 12][z];
    const vis = [6, 8, 11, 15][z];
    dotOut.setAttribute('stroke-width', base);
    dotIn.setAttribute('stroke-width', Math.max(0, base - 3));
    vOut.setAttribute('stroke-width', vis + 3);
    vIn.setAttribute('stroke-width', vis);
    selRing.setAttribute('stroke-width', vis + 14);
    gpsOut.setAttribute('stroke-width', 20);
    gpsIn.setAttribute('stroke-width', 14);
    $('tracks').setAttribute('stroke-width', [1.2, 2, 3, 4][z]);
    riddenG.setAttribute('stroke-width', [3, 4, 6, 8][z]);
    $('focusLine').setAttribute('stroke-width', [8, 12, 16, 20][z]);
    const lab = $('labels');
    lab.setAttribute('font-size', 13 / s);
    lab.setAttribute('stroke-width', 3.5 / s);
    const pg = $('prefs');
    pg.setAttribute('font-size', 15 / s);
    pg.style.display = '';
    pg.querySelectorAll('text').forEach((t) => {
      t.style.display = s < 0.12 ? '' : 'none';
      t.textContent = settings.kana ? t.dataset.kana : PREF_NAMES[PREF_KANA.indexOf(t.dataset.kana)];
    });
  }
  function applyView() {
    world.setAttribute('transform', 'matrix(' + view.s + ' 0 0 ' + view.s + ' ' + view.tx + ' ' + view.ty + ')');
    sizes();
    scheduleLabels();
  }
  function scheduleLabels() {
    clearTimeout(labelTimer);
    labelTimer = setTimeout(drawLabels, 90);
  }
  function drawLabels() {
    const g = $('labels');
    g.textContent = '';
    const x0 = -view.tx / view.s, y0 = -view.ty / view.s;
    const x1 = x0 + W / view.s, y1 = y0 + H / view.s;
    const inview = [];
    for (let i = 0; i < N; i++) {
      const s = ST[i];
      if (s[2] >= x0 && s[2] <= x1 && s[3] >= y0 && s[3] <= y1) inview.push(i);
    }
    let show = inview;
    if (inview.length > 140) {
      show = inview.filter((i) => stLines[i].length >= 3 || (visited.has(i) && view.s > 0.05));
      if (show.length > 90) show = inview.filter((i) => stLines[i].length >= 4);
      if (show.length > 60 || view.s < 0.03) show = [];
    }
    // かさならない ように えらぶ
    const placed = [];
    const off = 9 / view.s;
    show.sort((a, b) => stLines[b].length - stLines[a].length);
    show.forEach((i) => {
      const sx = ST[i][2] * view.s + view.tx, sy = ST[i][3] * view.s + view.ty;
      const w = label(i).length * 13 + 10;
      const box = [sx + 8, sy - 9, sx + 8 + w, sy + 9];
      if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) return;
      placed.push(box);
      const t = el('text', { x: ST[i][2] + off, y: ST[i][3] }, g);
      if (visited.has(i)) t.setAttribute('class', 'v');
      t.textContent = label(i);
    });
  }

  function resize() {
    const r = svg.getBoundingClientRect();
    const cx = (W / 2 - view.tx) / view.s, cy = (H / 2 - view.ty) / view.s;
    const had = W > 0;
    W = r.width; H = r.height;
    if (had) { view.tx = W / 2 - cx * view.s; view.ty = H / 2 - cy * view.s; }
    applyView();
  }
  function fit(x0, y0, x1, y1, pad, animate) {
    pad = pad == null ? 40 : pad;
    const s = clampS(Math.min((W - pad * 2) / Math.max(x1 - x0, 50), (H - pad * 2) / Math.max(y1 - y0, 50)));
    const target = { s, tx: W / 2 - (x0 + x1) / 2 * s, ty: H / 2 - (y0 + y1) / 2 * s };
    if (animate) flyTo(target); else { Object.assign(view, target); applyView(); }
  }
  function clampS(s) { return Math.max(0.008, Math.min(3, s)); }
  let flyRaf = 0;
  function flyTo(target) {
    cancelAnimationFrame(flyRaf);
    const from = Object.assign({}, view);
    const t0 = performance.now();
    const dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
    const step = (now) => {
      const t = dur ? Math.min(1, (now - t0) / dur) : 1;
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      // ズームは かけざんで おぎなう
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
  function centerOn(i, s) {
    const target = { s: s || Math.max(view.s, 0.25) };
    // シートに かくれない ように すこし うえに
    target.tx = W / 2 - ST[i][2] * target.s;
    target.ty = H * 0.38 - ST[i][3] * target.s;
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
      gesture = { type: 'pan', sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty, t: Date.now(), moved: false, r };
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
      tapAt(e.clientX - r.left, e.clientY - r.top, e.pointerType === 'mouse' ? 14 : 26);
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
    let best = -1, bd = radius;
    for (let i = 0; i < N; i++) {
      const d = Math.hypot(ST[i][2] * view.s + view.tx - sx, ST[i][3] * view.s + view.ty - sy);
      if (d < bd || (d === bd && visited.has(i))) { bd = d; best = i; }
    }
    if (best >= 0) { sound('tap'); openStation(best, false); }
    else if (!$('stSheet').hidden) closeSheet();
    else if (view.s < 0.05) {
      // とおくから みているときは タップした ところを ちかづける
      zoomAt(2.2, sx, sy); laterSave();
    }
  }

  $('zoomIn').onclick = () => { zoomAt(1.8, W / 2, H / 2); laterSave(); };
  $('zoomOut').onclick = () => { zoomAt(1 / 1.8, W / 2, H / 2); laterSave(); };
  $('zoomAll').onclick = () => fit(minX, minY, maxX, maxY, 20, true);

  // ---- えきの シート -----------------------------------------------------
  let curSt = -1;
  function openStation(i, center) {
    curSt = i;
    $('hint').hidden = true;
    $('stName').innerHTML = stRuby(i);
    $('stPref').textContent = PREF_KANA[ST[i][4]];
    const box = $('stLines');
    box.innerHTML = '';
    stLines[i].forEach((li) => {
      const L = LINES[li];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lchip';
      b.style.setProperty('--c', L.c);
      b.innerHTML = '<i></i><span>' + lineRuby(L) + '</span>';
      b.onclick = () => { sound('tap'); openLine(li, i); };
      box.appendChild(b);
    });
    updateSheet();
    $('stSheet').hidden = false;
    selRing.setAttribute('d', dotD([i]));
    if (center) centerOn(i);
  }
  function updateSheet() {
    if (curSt < 0) return;
    const v = visited.has(curSt);
    const b = $('visitBtn');
    b.className = 'bigBtn' + (v ? ' done' : '');
    b.textContent = v ? '✅ いったよ！（とりけす）' : '🎉 いった！';
    $('stDate').textContent = v ? fmtDate(visited.get(curSt)) + ' に いったよ' : '';
  }
  function fmtDate(d) {
    const m = /^(\d+)-(\d+)-(\d+)$/.exec(d || '');
    return m ? (+m[2]) + 'がつ ' + (+m[3]) + 'にち' : d;
  }
  function closeSheet() {
    $('stSheet').hidden = true;
    curSt = -1;
    selRing.setAttribute('d', 'M0 0');
  }
  $('visitBtn').onclick = () => {
    if (curSt < 0) return;
    if (visited.has(curSt)) {
      setVisits([curSt], false);
    } else {
      setVisits([curSt], true);
    }
  };

  // ---- いった／とりけす ---------------------------------------------------
  const MILESTONES = [1, 10, 30, 50, 100, 200, 300, 500, 1000, 1500];
  function setVisits(ids, on) {
    const beforeCount = visited.size;
    const beforeDone = LINES.map((L) => lineDone(L) === L.s.length);
    ids.forEach((i) => { if (on) { if (!visited.has(i)) visited.set(i, today()); } else visited.delete(i); });
    save();
    drawVisited();
    updateSheet();
    refreshPanel();
    if (!on) { sound('off'); return; }
    // おいわい
    const newly = LINES.filter((L, li) => !beforeDone[li] && lineDone(L) === L.s.length);
    const ms = MILESTONES.filter((m) => beforeCount < m && visited.size >= m).pop();
    if (newly.length) {
      sound('fan');
      toast('🏅', newly.map((L) => L.n).slice(0, 3).join('・') + '<br>ぜんぶの えきに いったよ！');
    } else if (ms) {
      sound('fan');
      toast('🎖️', ms + 'えき たっせい！');
    } else {
      sound('on');
    }
  }
  let toastTimer = 0;
  function toast(emoji, html) {
    const t = $('toast');
    t.innerHTML = '<span class="e">' + emoji + '</span>' + html;
    t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  // ---- パネル ------------------------------------------------------------
  const panel = $('panel');
  const body = $('panelBody');
  let panelState = null;   // { tab, line?, cat?, from? }
  let curCat = 'jr';
  let range = null;        // まとめて ぬる: null | { a: 駅番号 | -1 }
  let focusLi = -1;

  function setTab(tab) {
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  }
  function openPanel(state) {
    panelState = state;
    range = null;
    setTab(state.tab);
    panel.hidden = false;
    closeSheet();
    renderPanel();
    body.scrollTop = 0;
  }
  function closePanel() {
    panel.hidden = true;
    panelState = null;
    setFocusLine(-1);
    setTab('map');
  }
  function refreshPanel() {
    if (!panel.hidden && panelState) {
      const y = body.scrollTop;
      renderPanel();
      body.scrollTop = y;
    }
  }
  function renderPanel() {
    const st = panelState;
    $('panelBack').hidden = !(st.tab === 'lines' && st.line != null);
    if (st.tab === 'lines') st.line != null ? renderLine(st.line) : renderLineList();
    else if (st.tab === 'search') renderSearch();
    else if (st.tab === 'gps') renderGps();
    else if (st.tab === 'record') renderRecord();
  }
  $('panelBack').onclick = () => { sound('tap'); openPanel({ tab: 'lines' }); };
  document.querySelectorAll('[data-close]').forEach((b) => {
    b.onclick = () => { if (b.closest('.panel')) closePanel(); else closeSheet(); };
  });
  document.querySelectorAll('#tabs button').forEach((b) => {
    b.onclick = () => {
      sound('tap');
      const t = b.dataset.tab;
      if (t === 'map') { closePanel(); return; }
      if (panelState && panelState.tab === t && !(t === 'lines' && panelState.line != null)) { closePanel(); return; }
      openPanel({ tab: t });
    };
  });

  // ろせん いちらん
  function renderLineList() {
    $('panelTitle').innerHTML = 'ろせん';
    let h = '<div class="cats">';
    CATS.forEach(([k, n]) => { h += '<button type="button" data-cat="' + k + '" class="' + (k === curCat ? 'on' : '') + '">' + n + '</button>'; });
    h += '</div>';
    let lastOp = null;
    LINES.forEach((L, li) => {
      if (L.cat !== curCat) return;
      if (L.op !== lastOp) { h += '<div class="op">' + opRuby(L.op) + '</div>'; lastOp = L.op; }
      const n = lineDone(L), all = L.s.length;
      h += '<button type="button" class="lrow" data-li="' + li + '" style="--c:' + L.c + '">' +
        '<span class="bar"></span><span class="nm">' + lineRuby(L) + '</span>' +
        (n === all ? '<span class="medal">🏅</span>' : '') +
        '<span class="pg">' + n + ' / ' + all + '<div class="meter"><i style="width:' + (100 * n / all) + '%"></i></div></span></button>';
    });
    body.innerHTML = h;
    body.querySelectorAll('[data-cat]').forEach((b) => { b.onclick = () => { sound('tap'); curCat = b.dataset.cat; renderLineList(); }; });
    body.querySelectorAll('[data-li]').forEach((b) => { b.onclick = () => { sound('tap'); openLine(+b.dataset.li); }; });
  }

  function openLine(li, from) {
    openPanel({ tab: 'lines', line: li });
    curCat = LINES[li].cat;
    setFocusLine(li);
    if (from != null) {
      const row = body.querySelector('[data-st="' + from + '"]');
      if (row) row.scrollIntoView({ block: 'center' });
    }
  }
  function setFocusLine(li) {
    focusLi = li;
    const g = $('focusLine');
    g.textContent = '';
    if (li < 0) return;
    el('path', { d: LINES[li].e.map((e) => segD(e[2])).join('') }, g);
  }
  function lineBox(L) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    L.s.forEach((i) => { x0 = Math.min(x0, ST[i][2]); x1 = Math.max(x1, ST[i][2]); y0 = Math.min(y0, ST[i][3]); y1 = Math.max(y1, ST[i][3]); });
    return [x0, y0, x1, y1];
  }

  // ろせんの えき いちらん
  function renderLine(li) {
    const L = LINES[li];
    const n = lineDone(L), all = L.s.length;
    $('panelTitle').innerHTML = lineRuby(L);
    let h = '<div class="lineTop"><span class="big">' + opRuby(L.op) + '　' + n + ' / ' + all + ' えき' + (n === all ? ' 🏅' : '') + '</span>' +
      '<button type="button" class="pill" id="lnMap">🗺️ ちずで みる</button>' +
      '<button type="button" class="pill' + (range ? ' on' : '') + '" id="lnRange">✏️ まとめて ぬる</button></div>';
    if (range) {
      h += '<p class="rangeNote">' + (range.a < 0 ? 'のった えきを タップしてね（はじめ）' :
        '<b>' + esc(label(range.a)) + '</b> から どこまで のった？ おりた えきを タップしてね') + '</p>';
    }
    h += '<ul class="stList" style="--c:' + L.c + '">';
    let prev = -1;
    L.s.forEach((i, k) => {
      // となりの えきと つながって いなければ 枝の はじまり
      const linked = prev >= 0 && (L.adj.get(prev) || []).includes(i);
      const cls = [];
      if (k > 0 && !linked) cls.push('branch');
      const next = L.s[k + 1];
      if (next == null || !(L.adj.get(i) || []).includes(next)) cls.push('gapEnd');
      h += '<li class="' + cls.join(' ') + '"><div class="srow' + (visited.has(i) ? ' v' : '') + (range && range.a === i ? ' pick' : '') + '" data-st="' + i + '">' +
        '<button type="button" class="dot" data-tog="' + i + '" aria-label="いった">' + (visited.has(i) ? '✓' : '') + '</button>' +
        '<span class="nm" data-tog="' + i + '">' + stRuby(i) + '</span>' +
        '<button type="button" class="go" data-go="' + i + '" aria-label="ちずで みる">🗺️</button></div></li>';
      prev = i;
    });
    h += '</ul>';
    body.innerHTML = h;
    $('lnMap').onclick = () => {
      sound('tap');
      const b = lineBox(L);
      panel.hidden = true;
      setTab('map');
      fit(b[0], b[1], b[2], b[3], 50, true);
      toast('🛤️', esc(L.n));
    };
    $('lnRange').onclick = () => { sound('tap'); range = range ? null : { a: -1 }; refreshPanel(); };
    body.querySelectorAll('[data-tog]').forEach((b) => {
      b.onclick = () => {
        const i = +b.dataset.tog;
        if (range) {
          if (range.a < 0) { sound('tap'); range.a = i; refreshPanel(); return; }
          const path = linePath(L, range.a, i);
          range = null;
          setVisits(path, true);
          return;
        }
        setVisits([i], !visited.has(i));
      };
    });
    body.querySelectorAll('[data-go]').forEach((b) => {
      b.onclick = () => {
        sound('tap');
        const i = +b.dataset.go;
        panel.hidden = true;
        setTab('map');
        openStation(i, true);
      };
    });
  }
  // ろせんの うえで a から b までの えき (はばゆうせん たんさく)
  function linePath(L, a, b) {
    const prev = new Map([[a, -1]]);
    const q = [a];
    while (q.length) {
      const c = q.shift();
      if (c === b) break;
      (L.adj.get(c) || []).forEach((n) => { if (!prev.has(n)) { prev.set(n, c); q.push(n); } });
    }
    if (!prev.has(b)) return [a, b];
    const out = [];
    for (let c = b; c !== -1; c = prev.get(c)) out.push(c);
    return out;
  }

  // さがす
  function toHira(s) {
    return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/[\s・･]/g, '');
  }
  let lastQuery = '';
  function renderSearch() {
    $('panelTitle').textContent = 'えきを さがす';
    body.innerHTML = '<input class="searchBox" id="q" type="search" inputmode="search" autocomplete="off" placeholder="ひらがなで いれてね（れい: よこはま）">' +
      '<div id="results"></div>';
    const q = $('q');
    q.value = lastQuery;
    q.addEventListener('input', () => { lastQuery = q.value; showResults(); });
    showResults();
    if (!matchMedia('(pointer: coarse)').matches) q.focus();
  }
  function showResults() {
    const box = $('results');
    if (!box) return;
    const raw = lastQuery.trim();
    if (!raw) { box.innerHTML = '<p class="empty">えきの なまえを いれると<br>ここに でてくるよ</p>'; return; }
    const q = toHira(raw);
    const hits = [];
    for (let i = 0; i < N; i++) {
      const k = ST[i][1], nm = ST[i][0];
      let score = -1;
      if (k.startsWith(q) || nm.startsWith(raw)) score = 0;
      else if (k.includes(q) || nm.includes(raw)) score = 1;
      if (score >= 0) hits.push([score, k.length, i]);
    }
    hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (!hits.length) { box.innerHTML = '<p class="empty">みつからなかったよ</p>'; return; }
    box.innerHTML = hits.slice(0, 60).map(([, , i]) => resRow(i, ST[i][1] && PREF_KANA[ST[i][4]])).join('');
    bindRes(box);
  }
  function resRow(i, sub) {
    return '<button type="button" class="res" data-res="' + i + '"><span class="ck">' + (visited.has(i) ? '✅' : '⚪') + '</span>' +
      '<span class="nm">' + stRuby(i) + (sub ? '<br><span class="dist">' + esc(sub) + '</span>' : '') + '</span>' +
      '<span class="cs">' + stLines[i].map((li) => '<i style="--c:' + LINES[li].c + '"></i>').join('') + '</span></button>';
  }
  function bindRes(box) {
    box.querySelectorAll('[data-res]').forEach((b) => {
      b.onclick = () => {
        sound('tap');
        const i = +b.dataset.res;
        panel.hidden = true;
        panelState = null;
        setTab('map');
        openStation(i, true);
      };
    });
  }

  // いまここ
  let gpsState = { status: 'idle', list: [], msg: '' };
  function renderGps() {
    $('panelTitle').textContent = 'いまいる ばしょ';
    let h = '<button type="button" class="gpsBtn" id="gpsGo">📍 ちかくの えきを しらべる</button>';
    if (gpsState.status === 'busy') h += '<p class="empty">しらべているよ…</p>';
    else if (gpsState.status === 'err') h += '<p class="empty">' + gpsState.msg + '</p>';
    else if (gpsState.status === 'ok') {
      h += gpsState.msg ? '<p class="empty">' + gpsState.msg + '</p>' : '';
      h += gpsState.list.map(([i, m]) => resRow(i, m < 1000 ? 'あと ' + Math.round(m / 10) * 10 + 'm' : 'あと ' + (m / 1000).toFixed(1) + 'km')).join('');
    } else {
      h += '<p class="note">おうちの ひとと いっしょに つかってね。ばしょの じょうほうは この スマホの なかだけで つかい、どこにも おくらないよ。</p>';
    }
    body.innerHTML = h;
    $('gpsGo').onclick = locate;
    bindRes(body);
  }
  function toLonLat(i) {
    const lon = DATA.lon0 + ST[i][2] / DATA.k;
    const y0 = Math.log(Math.tan(Math.PI / 4 + DATA.lat0 * Math.PI / 360)) * 180 / Math.PI;
    const my = y0 - ST[i][3] / DATA.k;
    const lat = (2 * Math.atan(Math.exp(my * Math.PI / 180)) - Math.PI / 2) * 180 / Math.PI;
    return [lon, lat];
  }
  function project(lon, lat) {
    const y0 = Math.log(Math.tan(Math.PI / 4 + DATA.lat0 * Math.PI / 360));
    const y = Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
    return [(lon - DATA.lon0) * DATA.k, (y0 - y) * 180 / Math.PI * DATA.k];
  }
  function locate() {
    sound('tap');
    if (!navigator.geolocation) { gpsState = { status: 'err', msg: 'この きかいでは ばしょが わからないよ', list: [] }; refreshPanel(); return; }
    gpsState = { status: 'busy', list: [], msg: '' };
    refreshPanel();
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      const arr = [];
      for (let i = 0; i < N; i++) {
        const [slon, slat] = toLonLat(i);
        const dx = (slon - lon) * 111320 * Math.cos(lat * Math.PI / 180), dy = (slat - lat) * 110570;
        arr.push([i, Math.hypot(dx, dy)]);
      }
      arr.sort((a, b) => a[1] - b[1]);
      const far = arr[0][1] > 30000;
      gpsState = { status: 'ok', list: arr.slice(0, 6), msg: far ? 'ちずの そとに いるみたい。いちばん ちかい えきは…' : '' };
      const [x, y] = project(lon, lat);
      const d = 'M' + x + ' ' + y + 'h0.01';
      gpsOut.setAttribute('d', d);
      gpsIn.setAttribute('d', d);
      refreshPanel();
    }, (err) => {
      gpsState = {
        status: 'err', list: [],
        msg: err.code === 1 ? 'ばしょを つかうのが ゆるされて いないよ。<br>おうちの ひとに せっていを みてもらってね' : 'ばしょが わからなかったよ。もういちど ためしてね',
      };
      refreshPanel();
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }

  // きろく
  function renderRecord() {
    $('panelTitle').textContent = 'きろく';
    const n = visited.size;
    let h = '<div class="recTop"><span class="n">' + n + '</span><span class="of"> / ' + N + ' えき（' + (Math.floor(1000 * n / N) / 10) + '%）</span></div>';
    // けんごと
    h += '<h3 class="sec">けんごと</h3>';
    PREF_NAMES.forEach((p, pi) => {
      let all = 0, v = 0;
      for (let i = 0; i < N; i++) if (ST[i][4] === pi) { all++; if (visited.has(i)) v++; }
      h += '<div class="prefRow"><b>' + ruby(p, PREF_KANA[pi]) + '</b><div class="meter"><i style="width:' + (100 * v / all) + '%"></i></div><span>' + v + ' / ' + all + '</span></div>';
    });
    // メダル
    const done = LINES.filter((L) => lineDone(L) === L.s.length);
    h += '<h3 class="sec">🏅 ぜんえき せいは（' + done.length + ' / ' + LINES.length + ' ろせん）</h3>';
    if (done.length) {
      h += '<div class="medals">' + done.map((L) => '<div class="mdl" style="border-bottom:5px solid ' + L.c + '"><span class="e">🏅</span>' + lineRuby(L) + '</div>').join('') + '</div>';
    } else {
      h += '<p class="note">ひとつの ろせんの えきを ぜんぶ ぬると メダルが もらえるよ。みじかい ろせん（ケーブルカーなど）から ねらってみよう！</p>';
    }
    h += '<h3 class="sec">🎖️ えきの かず</h3><div class="medals">' + MILESTONES.concat([N]).map((m) =>
      '<div class="mdl' + (n >= m ? '' : ' off') + '"><span class="e">' + (m === N ? '👑' : '🎖️') + '</span>' + (m === N ? 'ぜんぶ' : m + 'えき') + '</div>').join('') + '</div>';
    // さいきん
    const rec = [...visited.entries()].sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : b[0] - a[0])).slice(0, 10);
    if (rec.length) {
      h += '<h3 class="sec">🕒 さいきん いった えき</h3><ul class="recent">' + rec.map(([i, d]) =>
        '<li><button type="button" data-res="' + i + '">' + stRuby(i) + ' <span>' + fmtDate(d) + '</span></button></li>').join('') + '</ul>';
    }
    h += '<h3 class="sec">💾 バックアップ</h3><div class="backup">' +
      '<button type="button" id="bkSave">ファイルに ほぞん</button>' +
      '<button type="button" id="bkLoad">ファイルから よみこむ</button>' +
      '<button type="button" class="danger" id="bkClear">ぜんぶ けす</button></div>' +
      '<p class="note">きろくは この ブラウザの なかに ほぞん しているよ。スマホを かえる まえや、ブラウザの データを けす まえに 「ファイルに ほぞん」 しておくと あんしん。よみこむと いまの きろくに たしあわせるよ。</p>' +
      '<p class="note">データ: 国土数値情報（鉄道データ・行政区域）国土交通省、Wikidata。</p>';
    body.innerHTML = h;
    bindRes(body);
    $('bkSave').onclick = exportFile;
    $('bkLoad').onclick = () => $('importFile').click();
    $('bkClear').onclick = () => {
      if (!visited.size) return;
      if (!confirm('いった えきの きろくを ぜんぶ けすよ。ほんとうに いい？')) return;
      if (!confirm('もとに もどせないよ。ほんとうに けす？')) return;
      visited.clear();
      save(); drawVisited(); refreshPanel(); sound('off');
    };
  }
  function exportFile() {
    sound('tap');
    const visits = [];
    visited.forEach((d, i) => visits.push([ST[i][0], ST[i][2], ST[i][3], d]));
    const blob = new Blob([JSON.stringify({ app: 'tetsudo-chizucho', v: 1, saved: new Date().toISOString(), visits }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tetsudo-chizucho-' + today() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  $('importFile').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let data = null;
      try { data = JSON.parse(r.result); } catch (err) { data = null; }
      if (!data || !Array.isArray(data.visits)) { toast('⚠️', 'この ファイルは よめなかったよ'); return; }
      const n = mergeVisits(data.visits);
      save(); drawVisited(); refreshPanel();
      sound('on');
      toast('📥', n + 'えき ふえたよ');
    };
    r.readAsText(f);
  });

  // ---- ヘッダーの ボタン ------------------------------------------------
  function updateHeader() {
    $('soundBtn').textContent = settings.sound ? '🔊' : '🔇';
    $('soundBtn').setAttribute('aria-pressed', String(settings.sound));
    $('kanaBtn').textContent = settings.kana ? 'あ' : '漢';
  }
  $('soundBtn').onclick = () => { settings.sound = !settings.sound; updateHeader(); save(); sound('tap'); };
  $('kanaBtn').onclick = () => {
    settings.kana = !settings.kana;
    updateHeader(); save(); sizes(); drawLabels(); sound('tap');
    toast(settings.kana ? 'あ' : '漢', settings.kana ? 'ちずの えきめいを ひらがなで' : 'ちずの えきめいを かんじで');
  };

  // ---- はじめる ----------------------------------------------------------
  load();
  updateHeader();
  const r0 = svg.getBoundingClientRect();
  W = r0.width; H = r0.height;
  if (settings.view) {
    Object.assign(view, settings.view);
    applyView();
  } else {
    // さいしょは とうきょう・よこはま あたり
    const a = project(139.45, 35.78), b = project(139.85, 35.4);
    fit(a[0], a[1], b[0], b[1], 10, false);
  }
  if (visited.size) $('hint').hidden = true;
  drawVisited();
  window.addEventListener('resize', resize);
})();
