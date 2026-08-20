'use strict';

/*
 * 日本地理たんけん — 本体
 *
 *  MapView : 47都道府県の SVG地図(1つだけ つくって、画面のあいだで つかいまわす)
 *            指で うごかす / つまんで 大きくする / 県・地形・新幹線を タップ できる
 *  Quiz    : 6つの モードの もんだいを つくって、地図タップ or 4択で こたえる
 *  Zukan   : 正解した 県の カードが たまっていく 47けん図鑑
 *  Browse  : 「ちずをみる」自由に しらべる 地図帳モード
 */

const SAVE_KEY = 'nihon-chiri-tanken/v1';
const SVG_NS = 'http://www.w3.org/2000/svg';

/* ============================== セーブ ============================== */

const Store = (function createStore() {
  const initial = {
    pref: {},     // code -> { n: 正解数, x: まちがい数 }
    modes: {},    // modeId -> { ans: 出した数, ok: 正解数 }
    settings: { bgm: false, se: true, voice: true, furigana: true, buddy: 'auto' },
  };

  let data = null;

  function load() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          pref: parsed.pref || {},
          modes: parsed.modes || {},
          settings: Object.assign({}, initial.settings, parsed.settings || {}),
        };
      }
    } catch (e) { /* こわれていたら はじめから */ }
    return JSON.parse(JSON.stringify(initial));
  }

  function save() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) { /* ほぞんできなくても あそべる */ }
  }

  data = load();

  return {
    all: () => data,
    settings: () => data.settings,
    setSetting(key, value) {
      data.settings[key] = value;
      save();
    },
    prefStat(code) {
      return data.pref[code] || { n: 0, x: 0 };
    },
    addCorrect(codes) {
      codes.forEach((code) => {
        const s = data.pref[code] || { n: 0, x: 0 };
        s.n += 1;
        data.pref[code] = s;
      });
      save();
    },
    addWrong(code) {
      const s = data.pref[code] || { n: 0, x: 0 };
      s.x += 1;
      data.pref[code] = s;
      save();
    },
    modeStat(id) {
      return data.modes[id] || { ans: 0, ok: 0 };
    },
    addMode(id, ok) {
      const s = data.modes[id] || { ans: 0, ok: 0 };
      s.ans += 1;
      if (ok) s.ok += 1;
      data.modes[id] = s;
      save();
    },
    reset() {
      const keep = data.settings;
      data = JSON.parse(JSON.stringify(initial));
      data.settings = keep;
      save();
    },
  };
})();

// 正解数から カードの レベル(0〜3)
function prefLevel(code) {
  const n = Store.prefStat(code).n;
  if (n >= 6) return 3;
  if (n >= 3) return 2;
  if (n >= 1) return 1;
  return 0;
}

/* ============================== あいぼう ============================== */
/*
 * でんしゃトークの キャラクターを 「たんけんの あいぼう」として つれてくる。
 * せっていが 「おまかせ」なら、モードごとの あんないやくが 出てくる。
 */

/*
 * でんしゃトーク本体の 電車キャラを そのまま つかう。
 *   パンタグラフ・屋根・行先表示・顔(目・口)・前照灯・スカート の 一式。
 *   mood: 'happy' | 'think' | 'wow'  (でんしゃトークの is-happy/is-think/is-wow と 同じ)
 *   dest: 行先表示に 出す 文字(省略時は 路線名)
 */
function trainIcon(char, cls, mood, dest) {
  return '<span class="train-ic ' + (cls || '') + '" data-char="' + char.id
    + '" style="--c:' + char.color + ';--ink:' + char.ink + '">'
    + '<span class="ti-panta"></span>'
    + '<span class="ti-roof"></span>'
    + '<span class="ti-body">'
    + '<span class="ti-dest">' + (dest || char.line) + '</span>'
    + '<span class="ti-face ' + (mood ? 'is-' + mood : 'is-happy') + '">'
    + '<span class="ti-eye ti-eye-l"><i></i></span>'
    + '<span class="ti-eye ti-eye-r"><i></i></span>'
    + '<span class="ti-mouth"></span>'
    + '</span>'
    + '<span class="ti-lights"><i></i><i></i></span>'
    + '</span>'
    + '<span class="ti-skirt"></span>'
    + '</span>';
}

// トークちゅうの 口パクを 始める/止める(要素は trainIcon が つくった ものを 渡す)
function trainTalk(el, on) {
  if (!el) return;
  el.classList.toggle('is-talking', !!on);
}

// 表情を 変える('happy' | 'think' | 'wow')
function trainMood(el, mood) {
  if (!el) return;
  const face = el.querySelector('.ti-face');
  if (!face) return;
  face.classList.remove('is-happy', 'is-think', 'is-wow');
  face.classList.add('is-' + (mood || 'happy'));
}

const Buddy = (function createBuddy() {
  function current(modeId) {
    const chosen = Store.settings().buddy || 'auto';
    if (chosen !== 'auto' && CHAR_BY_ID[chosen]) return CHAR_BY_ID[chosen];
    if (modeId && CHAR_BY_MODE[modeId]) return CHAR_BY_MODE[modeId];
    return GUIDE_CHAR;
  }

  // key の セリフから ランダムに 1つ
  function line(char, key) {
    const arr = char[key];
    if (!arr || !arr.length) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ほかの キャラが よこから ひとこと
  function other(char) {
    const rest = CHARACTERS.filter((c) => c.id !== char.id);
    return rest[Math.floor(Math.random() * rest.length)];
  }

  // opts.talkEl : しゃべっている あいだ 口パクさせる 電車の DOM要素(train-ic)
  function speak(char, text, opts) {
    const o = opts || {};
    const talkEl = o.talkEl || null;
    const params = Object.assign({}, char.voice);
    if (talkEl) {
      params.onStart = () => trainTalk(talkEl, true);
      params.onDone = () => trainTalk(talkEl, false);
    }
    SoundEngine.speak(text, params);
  }

  return { current: current, line: line, other: other, speak: speak };
})();

/* ============================== こまごま ============================== */

const PREF_BY_CODE = {};
PREFECTURES.forEach((p) => { PREF_BY_CODE[p.code] = p; });

const REGION_BY_ID = {};
REGIONS.forEach((r) => { REGION_BY_ID[r.id] = r; });

function prefName(code) { return PREF_BY_CODE[code].name; }
function prefKana(code) { return PREF_BY_CODE[code].kana; }
function shortName(code) { return prefName(code).replace(/県$/, ''); }
function regionOf(code) { return REGION_BY_ID[PREF_INFO[code].region]; }

function ruby(text, kana) {
  return '<ruby>' + text + '<rt>' + kana + '</rt></ruby>';
}

function prefRuby(code) { return ruby(prefName(code), prefKana(code)); }

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function pickSome(arr, n, exclude) {
  const pool = arr.filter((v) => !exclude || exclude.indexOf(v) < 0);
  return shuffle(pool).slice(0, n);
}

function mixColor(hex, ratio) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const m = (v) => Math.round(v + (255 - v) * ratio);
  return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
}

// 「まだ おぼえていない 県」から えらびやすくする(レベルが 低い ほど 出やすい)
function weightedPref(codes) {
  const bag = [];
  codes.forEach((code) => {
    const lv = prefLevel(code);
    const w = lv === 0 ? 4 : lv === 1 ? 3 : lv === 2 ? 2 : 1;
    for (let i = 0; i < w; i += 1) bag.push(code);
  });
  return pick(bag);
}

/* ====================== パス文字列から はんいを 出す ====================== */
/* getBBox は 画面に 出ていない 要素で つかえないので、パスの 数字から 自分で 計算する */

const bboxCache = {};

function subPathBoxes(d) {
  return d.split('M').filter((s) => s.trim().length > 0).map((seg) => {
    const nums = seg.match(/-?\d+(?:\.\d+)?/g) || [];
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = parseFloat(nums[i]);
      const y = parseFloat(nums[i + 1]);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    return { x0: x0, y0: y0, x1: x1, y1: y1, area: (x1 - x0) * (y1 - y0) };
  });
}

function prefBox(code) {
  if (!bboxCache[code]) {
    const boxes = subPathBoxes(PREF_BY_CODE[code].path);
    const all = boxes.reduce((a, b) => ({
      x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0),
      x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1),
    }));
    const main = boxes.reduce((a, b) => (b.area > a.area ? b : a));
    bboxCache[code] = { all: all, main: main };
  }
  return bboxCache[code];
}

function unionBox(codes, useMain) {
  return codes.map((c) => (useMain ? prefBox(c).main : prefBox(c).all))
    .reduce((a, b) => ({
      x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0),
      x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1),
    }));
}

/* ============================== 地図 ============================== */

const MapView = (function createMap() {
  let host = null;
  let svg = null;
  const layers = {};
  const prefEls = {};
  const labelEls = {};
  let baseVB = null;
  let vb = null;
  let tapHandler = null;
  let animId = null;

  function el(name, attrs, text) {
    const n = document.createElementNS(SVG_NS, name);
    if (attrs) Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k]));
    if (text != null) n.textContent = text;
    return n;
  }

  function applyVB() {
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
  }

  function build() {
    host = document.createElement('div');
    host.className = 'map-host';
    svg = el('svg', { viewBox: MAP_VIEWBOX, preserveAspectRatio: 'xMidYMid meet' });
    const parts = MAP_VIEWBOX.split(' ').map(Number);
    baseVB = { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
    vb = Object.assign({}, baseVB);

    // 沖縄インセットの わく
    const frame = el('g');
    frame.appendChild(el('rect', {
      class: 'oki-frame', x: OKI_FRAME.x, y: OKI_FRAME.y,
      width: OKI_FRAME.w, height: OKI_FRAME.h, rx: 14,
    }));
    frame.appendChild(el('text', {
      class: 'oki-note', x: OKI_FRAME.x + 4, y: OKI_FRAME.y - 8,
    }, '沖縄県(2ばいの 大きさ)'));
    frame.appendChild(el('text', {
      class: 'oki-note small', x: OKI_FRAME.x + 4, y: OKI_FRAME.y + OKI_FRAME.h + 22,
    }, 'ほんとうは 九州の 南西の 海の 上'));
    svg.appendChild(frame);

    layers.lands = el('g');
    PREFECTURES.forEach((p) => {
      const path = el('path', { class: 'pref', d: p.path, 'data-pref': p.code });
      prefEls[p.code] = path;
      layers.lands.appendChild(path);
    });
    svg.appendChild(layers.lands);

    layers.geo = el('g');
    svg.appendChild(layers.geo);

    layers.sk = el('g');
    svg.appendChild(layers.sk);

    layers.cap = el('g');
    svg.appendChild(layers.cap);

    layers.labels = el('g');
    PREFECTURES.forEach((p) => {
      const short = shortName(p.code);
      const t = el('text', {
        class: 'pref-label' + (short.length >= 4 ? ' small' : ''),
        x: p.lx, y: p.ly, display: 'none',
      }, short);
      labelEls[p.code] = t;
      layers.labels.appendChild(t);
    });
    svg.appendChild(layers.labels);

    host.appendChild(svg);
    bindPointer();
    return host;
  }

  /* -------------------- 指の そうさ(パン・ピンチ) -------------------- */

  function toSvgPoint(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    return pt.matrixTransform(m.inverse());
  }

  function clampVB() {
    const maxW = baseVB.w * 1.05;
    const minW = baseVB.w * 0.12;
    if (vb.w > maxW) {
      const k = maxW / vb.w;
      vb.w *= k; vb.h *= k;
    }
    if (vb.w < minW) {
      const k = minW / vb.w;
      vb.w *= k; vb.h *= k;
    }
    const slackX = vb.w * 0.4;
    const slackY = vb.h * 0.4;
    vb.x = Math.min(Math.max(vb.x, baseVB.x - slackX), baseVB.x + baseVB.w - vb.w + slackX);
    vb.y = Math.min(Math.max(vb.y, baseVB.y - slackY), baseVB.y + baseVB.h - vb.h + slackY);
  }

  function zoomBy(factor, clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const cx = clientX == null ? rect.left + rect.width / 2 : clientX;
    const cy = clientY == null ? rect.top + rect.height / 2 : clientY;
    const before = toSvgPoint(cx, cy);
    vb.w *= factor;
    vb.h *= factor;
    clampVB();
    applyVB();
    const after = toSvgPoint(cx, cy);
    vb.x += before.x - after.x;
    vb.y += before.y - after.y;
    clampVB();
    applyVB();
  }

  function bindPointer() {
    const pts = new Map();
    let downTarget = null;
    let moved = 0;
    let last = null;
    let pinch = null;

    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

    svg.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) {
        downTarget = e.target;
        moved = 0;
        last = { x: e.clientX, y: e.clientY };
      } else if (pts.size === 2) {
        const v = Array.from(pts.values());
        pinch = { d: dist(v[0], v[1]) };
        downTarget = null;
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const v = Array.from(pts.values());
      if (v.length >= 2 && pinch) {
        const d = dist(v[0], v[1]);
        if (d > 4 && pinch.d > 4) {
          const mid = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
          zoomBy(pinch.d / d, mid.x, mid.y);
        }
        pinch.d = d;
        moved = 999;
        return;
      }
      if (v.length === 1 && last) {
        const rect = svg.getBoundingClientRect();
        const scale = vb.w / rect.width;
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;
        moved += Math.hypot(dx, dy);
        if (moved > 6) {
          vb.x -= dx * scale;
          vb.y -= dy * scale;
          clampVB();
          applyVB();
        }
        last = { x: e.clientX, y: e.clientY };
      }
    });

    function up(e) {
      if (!pts.has(e.pointerId)) return;
      const wasSingle = pts.size === 1;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 0) last = null;
      if (wasSingle && moved <= 8 && downTarget) fireTap(downTarget);
      if (pts.size === 0) downTarget = null;
    }

    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoomBy(e.deltaY > 0 ? 1.14 : 0.88, e.clientX, e.clientY);
    }, { passive: false });
  }

  function fireTap(target) {
    if (!tapHandler) return;
    let node = target;
    while (node && node !== svg) {
      if (node.dataset) {
        if (node.dataset.pref) { tapHandler({ type: 'pref', code: Number(node.dataset.pref) }); return; }
        if (node.dataset.geo) { tapHandler({ type: 'geo', index: Number(node.dataset.geo) }); return; }
        if (node.dataset.sk) { tapHandler({ type: 'sk', index: Number(node.dataset.sk) }); return; }
        if (node.dataset.cap) { tapHandler({ type: 'cap', code: Number(node.dataset.cap) }); return; }
      }
      node = node.parentNode;
    }
    tapHandler({ type: 'none' });
  }

  /* -------------------- 見た目の きりかえ -------------------- */

  function clearPrefs() {
    Object.keys(prefEls).forEach((code) => {
      prefEls[code].setAttribute('class', 'pref');
      prefEls[code].style.fill = '';
    });
  }

  function setPref(code, cls) {
    const p = prefEls[code];
    if (!p) return;
    p.setAttribute('class', 'pref' + (cls ? ' ' + cls : ''));
    // 地方の色ぬり(インラインの fill)が じゃまして 色が 変わらないので けす
    if (cls) p.style.fill = '';
  }

  function addPrefClass(code, cls) {
    const p = prefEls[code];
    if (p) p.setAttribute('class', p.getAttribute('class') + ' ' + cls);
  }

  function paintRegions(on) {
    Object.keys(prefEls).forEach((code) => {
      prefEls[code].style.fill = on ? mixColor(regionOf(Number(code)).color, 0.55) : '';
    });
  }

  function showLabels(codes) {
    Object.keys(labelEls).forEach((code) => {
      const show = codes === 'all' || (codes && codes.indexOf(Number(code)) >= 0);
      labelEls[code].setAttribute('display', show ? 'inline' : 'none');
    });
  }

  function setInteractive(on) {
    layers.lands.style.pointerEvents = on ? '' : 'none';
  }

  /* -------------------- 地形レイヤー -------------------- */

  function riverPath(pts) {
    return 'M' + pts.map((p) => {
      const q = project(p[0], p[1]);
      return q[0].toFixed(1) + ',' + q[1].toFixed(1);
    }).join(' ');
  }

  function renderGeo(items, opts) {
    const o = opts || {};
    layers.geo.textContent = '';
    layers.geo.setAttribute('class', o.names ? '' : 'geo-names-off');
    items.forEach((it) => {
      const g = el('g', { class: 'geo-item', 'data-geo': it.index });
      let nx = 0; let ny = 0;
      if (it.geo.cat === 'river') {
        const d = riverPath(it.geo.pts);
        g.appendChild(el('path', { class: 'geo-river-hit', d: d }));
        g.appendChild(el('path', { class: 'geo-river', d: d }));
        const mid = it.geo.pts[Math.floor(it.geo.pts.length / 2)];
        const q = project(mid[0], mid[1]);
        nx = q[0]; ny = q[1] - 16;
      } else {
        const q = project(it.geo.at[0], it.geo.at[1]);
        const dot = el('g', { class: 'geo-dot' });
        dot.appendChild(el('circle', { class: 'geo-hit', cx: q[0], cy: q[1], r: 34 }));
        dot.appendChild(el('circle', { cx: q[0], cy: q[1], r: 19 }));
        dot.appendChild(el('text', { x: q[0], y: q[1] }, GEO_CATS[it.geo.cat].emoji));
        g.appendChild(dot);
        nx = q[0]; ny = q[1] - 26;
      }
      g.appendChild(el('text', { class: 'geo-name', x: nx, y: ny }, it.geo.name));
      layers.geo.appendChild(g);
    });
  }

  function geoClass(index, cls) {
    const g = layers.geo.querySelector('[data-geo="' + index + '"]');
    if (g) g.setAttribute('class', 'geo-item' + (cls ? ' ' + cls : ''));
  }

  function geoNames(on) {
    layers.geo.setAttribute('class', on ? '' : 'geo-names-off');
  }

  function clearGeo() { layers.geo.textContent = ''; }

  /* -------------------- 新幹線レイヤー -------------------- */

  function renderSk(list, opts) {
    const o = opts || {};
    layers.sk.textContent = '';
    list.forEach((it) => {
      const line = it.line;
      const g = el('g', { class: 'sk-item', 'data-sk': it.index });
      const d = riverPath(line.pts);
      g.appendChild(el('path', { class: 'sk-line-hit', d: d }));
      g.appendChild(el('path', { class: 'sk-line', d: d, stroke: line.color }));
      if (o.stations) {
        line.stations.forEach((st) => {
          const q = project(st.lon, st.lat);
          const s = el('g', { class: 'sk-stop' });
          s.appendChild(el('circle', { cx: q[0], cy: q[1], r: 5 }));
          g.appendChild(s);
        });
      }
      // あいぼうが 路線の 上を 走る
      if (o.runner) {
        const run = el('g', { class: 'sk-runner' });
        run.appendChild(el('circle', { cx: 0, cy: 0, r: 17, stroke: o.runner.ink }));
        run.appendChild(el('text', { x: 0, y: 0 }, o.runner.face));
        const motion = el('animateMotion', {
          dur: '7s', repeatCount: 'indefinite', path: d, rotate: '0',
        });
        run.appendChild(motion);
        g.appendChild(run);
      }
      layers.sk.appendChild(g);
    });
  }

  function skClass(index, cls) {
    const g = layers.sk.querySelector('[data-sk="' + index + '"]');
    if (g) g.setAttribute('class', 'sk-item' + (cls ? ' ' + cls : ''));
  }

  function clearSk() { layers.sk.textContent = ''; }

  /* -------------------- 県庁所在地レイヤー -------------------- */

  function renderCaps(codes) {
    layers.cap.textContent = '';
    codes.forEach((code) => {
      const c = PREF_INFO[code].capital;
      const q = project(c.lon, c.lat);
      const g = el('g', { class: 'cap-dot', 'data-cap': code });
      g.appendChild(el('circle', { cx: q[0], cy: q[1], r: 8 }));
      layers.cap.appendChild(g);
    });
  }

  function capClass(code, cls) {
    const g = layers.cap.querySelector('[data-cap="' + code + '"]');
    if (g) g.setAttribute('class', 'cap-dot' + (cls ? ' ' + cls : ''));
  }

  function clearCaps() { layers.cap.textContent = ''; }

  /* -------------------- ズーム -------------------- */

  function animateTo(target) {
    if (animId) cancelAnimationFrame(animId);
    const from = Object.assign({}, vb);
    const t0 = performance.now();
    const dur = 380;
    function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      vb.x = from.x + (target.x - from.x) * e;
      vb.y = from.y + (target.y - from.y) * e;
      vb.w = from.w + (target.w - from.w) * e;
      vb.h = from.h + (target.h - from.h) * e;
      applyVB();
      if (t < 1) animId = requestAnimationFrame(step);
    }
    animId = requestAnimationFrame(step);
  }

  // codes を おさめる ように ズームする。factor を 大きく すると まわりも 見える
  function focus(codes, factor) {
    const box = unionBox(codes, true);
    const f = factor || 1.35;
    const cx = (box.x0 + box.x1) / 2;
    const cy = (box.y0 + box.y1) / 2;
    const ratio = baseVB.h / baseVB.w;
    let w = Math.max((box.x1 - box.x0), (box.y1 - box.y0) / ratio) * f;
    w = Math.min(Math.max(w, baseVB.w * 0.22), baseVB.w);
    animateTo({ x: cx - w / 2, y: cy - (w * ratio) / 2, w: w, h: w * ratio });
  }

  function reset() {
    animateTo(Object.assign({}, baseVB));
  }

  return {
    build: build,
    hostEl: () => host,
    onTap(fn) { tapHandler = fn; },
    clearPrefs: clearPrefs,
    setPref: setPref,
    addPrefClass: addPrefClass,
    paintRegions: paintRegions,
    showLabels: showLabels,
    setInteractive: setInteractive,
    renderGeo: renderGeo,
    geoClass: geoClass,
    geoNames: geoNames,
    clearGeo: clearGeo,
    renderSk: renderSk,
    skClass: skClass,
    clearSk: clearSk,
    renderCaps: renderCaps,
    capClass: capClass,
    clearCaps: clearCaps,
    focus: focus,
    reset: reset,
    zoomBy: zoomBy,
    clearAll() {
      clearPrefs();
      clearGeo();
      clearSk();
      clearCaps();
      showLabels(null);
      setInteractive(true);
      geoNames(false);
    },
  };
})();

/* ============================== 画面きりかえ ============================== */

const Screens = (function createScreens() {
  let current = 'title';
  function go(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('is-active'));
    const target = document.getElementById('sc-' + name);
    if (target) target.classList.add('is-active');
    current = name;
    if (name === 'title') Title.refresh();
    if (name === 'zukan') Zukan.render();
    if (name === 'settings') Settings.render();
  }
  return { go: go, current: () => current };
})();

/* ============================== モードの ていぎ ============================== */

const MODES = [
  {
    id: 'capital', emoji: '🏛️', name: '県庁所在地', kana: 'けんちょうしょざいち',
    desc: '県の 名前と ちがう 市が よく 出ます',
    make: makeCapitalQ,
  },
  {
    id: 'region', emoji: '🧩', name: '地方わけ', kana: 'ちほうわけ',
    desc: '8つの 地方に 分ける れんしゅう',
    make: makeRegionQ,
  },
  {
    id: 'chikei', emoji: '⛰️', name: '地形たんけん', kana: 'ちけいたんけん',
    desc: '川・山・平野・湖・半島・湾・岬',
    make: makeChikeiQ,
  },
  {
    id: 'meisan', emoji: '🍎', name: '名産・産業', kana: 'めいさん・さんぎょう',
    desc: '「日本一」の さんちを あてる',
    make: makeMeisanQ,
  },
  {
    id: 'kiko', emoji: '☀️', name: '気候', kana: 'きこう',
    desc: '6つの 気候に 分ける',
    make: makeKikoQ,
  },
  {
    id: 'shinkansen', emoji: '🚄', name: '新幹線', kana: 'しんかんせん',
    desc: '駅の ある 県、通る 県を あてる',
    make: makeShinkansenQ,
  },
];

const MODE_BY_ID = {};
MODES.forEach((m) => { MODE_BY_ID[m.id] = m; });

/* ---------------------------- 県庁所在地 ---------------------------- */

function makeCapitalQ() {
  const pool = Math.random() < 0.6 ? CAPITAL_DIFFERENT : PREFECTURES.map((p) => p.code);
  const code = weightedPref(pool);
  const cap = PREF_INFO[code].capital;

  if (Math.random() < 0.5) {
    // 4択: この県の 県庁所在地は?
    const others = pickSome(PREFECTURES.map((p) => p.code), 3, [code])
      .map((c) => PREF_INFO[c].capital);
    const choices = shuffle([cap].concat(others)).map((c) => ({
      label: ruby(c.name, c.kana),
      speak: c.kana,
      ok: c === cap,
    }));
    return {
      kind: 'choice',
      emoji: '🏛️',
      text: '<span class="q-strong">' + prefRuby(code) + '</span> の 県庁所在地は どこ?',
      speak: prefKana(code) + 'の けんちょうしょざいちは どこ?',
      choices: choices,
      award: [code],
      explain: {
        title: prefName(code) + ' → ' + cap.name,
        note: PREF_INFO[code].fact,
      },
      setup() {
        MapView.setPref(code, 'is-target');
        MapView.setInteractive(false);
        MapView.focus([code], 3.2);
      },
      onDone() {
        MapView.renderCaps([code]);
        MapView.showLabels([code]);
      },
    };
  }

  // 地図タップ: この市が ある 県は?
  return {
    kind: 'tapPref',
    emoji: '🏛️',
    text: '<span class="q-strong">' + ruby(cap.name, cap.kana) + '</span> が ある 県は どこ?',
    speak: cap.kana + 'が ある けんは どこ?',
    answer: [code],
    award: [code],
    explain: {
      title: cap.name + ' → ' + prefName(code),
      note: PREF_INFO[code].fact,
    },
    onDone() {
      MapView.renderCaps([code]);
    },
  };
}

/* ---------------------------- 地方わけ ---------------------------- */

function makeRegionQ() {
  if (Math.random() < 0.5) {
    // 8択: この県は なに地方?
    const code = weightedPref(PREFECTURES.map((p) => p.code));
    const region = regionOf(code);
    return {
      kind: 'choice',
      cols: 2,
      emoji: '🧩',
      text: '<span class="q-strong">' + prefRuby(code) + '</span> は なに 地方?',
      speak: prefKana(code) + 'は なにちほう?',
      choices: REGIONS.map((r) => ({
        label: ruby(r.name, r.kana),
        speak: r.kana,
        ok: r.id === region.id,
      })),
      award: [code],
      explain: {
        title: prefName(code) + ' は ' + region.name,
        note: region.name + 'には ' + region.prefs.length + 'つの 都道府県が あります。',
      },
      setup() {
        MapView.setPref(code, 'is-target');
        MapView.setInteractive(false);
        MapView.focus([code], 3.2);
      },
      onDone() {
        region.prefs.forEach((c) => { if (c !== code) MapView.setPref(c, 'is-mark'); });
        MapView.setPref(code, 'is-ok');
        MapView.showLabels(region.prefs);
        MapView.focus(region.prefs, 1.6);
      },
    };
  }

  // 全部タップ: この地方の 県を ぜんぶ(北海道地方は 1つだけ なので のぞく)
  const region = pick(REGIONS.filter((r) => r.prefs.length >= 4));
  return {
    kind: 'tapMulti',
    emoji: '🧩',
    text: '<span class="q-strong">' + ruby(region.name, region.kana) + '</span> の 都道府県を ぜんぶ タップ!',
    speak: region.kana + 'の とどうふけんを ぜんぶ タップ',
    answer: region.prefs.slice(),
    award: region.prefs.slice(),
    explain: {
      title: region.name + ' ぜんぶ せいかい!',
      note: region.prefs.map((c) => shortName(c)).join('・'),
    },
    setup() {
      if (region.prefs.length >= 5) MapView.focus(region.prefs, 2.6);
    },
    onDone() {
      MapView.showLabels(region.prefs);
    },
  };
}

/* ---------------------------- 地形たんけん ---------------------------- */

function makeChikeiQ() {
  const cat = pick(Object.keys(GEO_CATS));
  const items = GEO.map((g, i) => ({ geo: g, index: i })).filter((it) => it.geo.cat === cat);
  const target = pick(items);
  const others = pickSome(items.filter((it) => it !== target), 11);
  const shown = shuffle([target].concat(others));
  const label = GEO_CATS[cat].label;

  if (Math.random() < 0.65) {
    // 地図タップ: ◯◯は どれ?
    return {
      kind: 'tapGeo',
      emoji: GEO_CATS[cat].emoji,
      text: '<span class="q-strong">' + ruby(target.geo.name, target.geo.kana) + '</span> は どれ? ' + label + 'の しるしを タップ',
      speak: target.geo.kana + 'は どれ?',
      answer: target.index,
      shown: shown.map((it) => it.index),
      award: target.geo.prefs.slice(0, 3),
      explain: { title: target.geo.name, note: target.geo.note + ' 〔' + target.geo.prefs.map((c) => shortName(c)).join('・') + '〕' },
      setup() {
        MapView.setInteractive(false);
        MapView.renderGeo(shown, { names: false });
      },
      onDone() {
        MapView.geoNames(true);
        target.geo.prefs.forEach((c) => MapView.setPref(c, 'is-mark'));
        MapView.showLabels(target.geo.prefs);
      },
    };
  }

  // 4択: これは なに?
  const wrong = pickSome(items.filter((it) => it !== target), 3);
  const choices = shuffle([target].concat(wrong)).map((it) => ({
    label: ruby(it.geo.name, it.geo.kana),
    speak: it.geo.kana,
    ok: it === target,
  }));
  return {
    kind: 'choice',
    emoji: GEO_CATS[cat].emoji,
    text: 'オレンジで 光っている ' + label + 'の 名前は?',
    speak: 'ひかっている ' + GEO_CATS[cat].kana + 'の なまえは?',
    choices: choices,
    award: target.geo.prefs.slice(0, 3),
    explain: { title: target.geo.name, note: target.geo.note + ' 〔' + target.geo.prefs.map((c) => shortName(c)).join('・') + '〕' },
    setup() {
      MapView.setInteractive(false);
      MapView.renderGeo([target], { names: false });
      MapView.geoClass(target.index, 'is-target');
      MapView.focus(target.geo.prefs, 2.4);
    },
    onDone() {
      MapView.geoNames(true);
      target.geo.prefs.forEach((c) => MapView.setPref(c, 'is-mark'));
      MapView.showLabels(target.geo.prefs);
    },
  };
}

/* ---------------------------- 名産・産業 ---------------------------- */

function makeMeisanQ() {
  const bag = [];
  MEISAN.forEach((m) => {
    const lv = prefLevel(m.pref);
    const w = lv === 0 ? 3 : lv === 1 ? 2 : 1;
    for (let i = 0; i < w; i += 1) bag.push(m);
  });
  const item = pick(bag);
  return {
    kind: 'tapPref',
    emoji: item.e,
    text: '<span class="q-strong">' + item.q + '</span> なのは どこの 県?',
    speak: item.q + ' なのは どこの けん?',
    answer: [item.pref],
    award: [item.pref],
    explain: { title: prefName(item.pref), note: item.note },
    onDone() {
      MapView.showLabels([item.pref]);
    },
  };
}

/* ---------------------------- 気候 ---------------------------- */

function makeKikoQ() {
  const codes = Object.keys(PREF_INFO).map(Number).filter((c) => PREF_INFO[c].climateQ);
  const code = weightedPref(codes);
  const key = PREF_INFO[code].climate;
  const keys = Object.keys(CLIMATES);
  return {
    kind: 'choice',
    cols: 2,
    emoji: '☀️',
    text: '<span class="q-strong">' + prefRuby(code) + '</span> は どの 気候?',
    speak: prefKana(code) + 'は どの きこう?',
    choices: keys.map((k) => ({
      label: ruby(CLIMATES[k].name, CLIMATES[k].kana),
      speak: CLIMATES[k].kana,
      ok: k === key,
    })),
    award: [code],
    explain: { title: prefName(code) + ' → ' + CLIMATES[key].name, note: CLIMATES[key].note },
    setup() {
      MapView.setPref(code, 'is-target');
      MapView.setInteractive(false);
      MapView.focus([code], 3.2);
    },
    onDone() {
      MapView.showLabels([code]);
    },
  };
}

/* ---------------------------- 新幹線 ---------------------------- */

// 路線の 上を 走る あいぼう
function skRunner() {
  const c = Buddy.current('shinkansen');
  return { face: c.face, ink: c.ink };
}

function makeShinkansenQ() {
  const r = Math.random();
  const lineIndex = Math.floor(Math.random() * SHINKANSEN.length);
  const line = SHINKANSEN[lineIndex];

  if (r < 0.4) {
    // 駅は どの県?
    const stations = [];
    SHINKANSEN.forEach((l) => l.stations.forEach((s) => stations.push(s)));
    const st = pick(stations);
    return {
      kind: 'tapPref',
      emoji: '🚉',
      text: '<span class="q-strong">' + ruby(st.name, st.kana) + '駅</span> は どの 県に ある?',
      speak: st.kana + 'えきは どの けんに ある?',
      answer: [st.pref],
      award: [st.pref],
      explain: { title: st.name + '駅 → ' + prefName(st.pref), note: PREF_INFO[st.pref].fact },
      onDone() {
        MapView.showLabels([st.pref]);
        const owners = SHINKANSEN.map((l, i) => ({ line: l, index: i }))
          .filter((it) => it.line.stations.some((s) => s.name === st.name));
        MapView.renderSk(owners, { stations: true, runner: skRunner() });
      },
    };
  }

  if (r < 0.72) {
    // 4択: この路線は?
    const wrong = pickSome(SHINKANSEN.filter((l) => l !== line), 3);
    const choices = shuffle([line].concat(wrong)).map((l) => ({
      label: ruby(l.name, l.kana),
      speak: l.kana,
      ok: l === line,
    }));
    return {
      kind: 'choice',
      emoji: '🚄',
      text: 'この 新幹線の 名前は?',
      speak: 'この しんかんせんの なまえは?',
      choices: choices,
      award: pickSome(line.prefs, 3),
      explain: { title: line.name, note: line.note + ' 〔' + line.prefs.map((c) => shortName(c)).join('・') + '〕' },
      setup() {
        MapView.setInteractive(false);
        MapView.renderSk([{ line: line, index: lineIndex }], { stations: true, runner: skRunner() });
        MapView.skClass(lineIndex, 'is-target');
        MapView.focus(line.prefs, 1.5);
      },
      onDone() {
        line.prefs.forEach((c) => MapView.setPref(c, 'is-mark'));
        MapView.showLabels(line.prefs);
      },
    };
  }

  // 通る県を ぜんぶ タップ
  return {
    kind: 'tapMulti',
    emoji: '🚄',
    text: '<span class="q-strong">' + ruby(line.name, line.kana) + '</span> が 通る 都道府県を ぜんぶ タップ!',
    speak: line.kana + 'が とおる とどうふけんを ぜんぶ タップ',
    answer: line.prefs.slice(),
    award: line.prefs.slice(),
    explain: { title: line.name, note: line.note + ' 〔' + line.prefs.map((c) => shortName(c)).join('・') + '〕' },
    onDone() {
      MapView.renderSk([{ line: line, index: lineIndex }], { stations: true, runner: skRunner() });
      MapView.showLabels(line.prefs);
    },
  };
}

/* ============================== クイズ画面 ============================== */

const Quiz = (function createQuiz() {
  let mode = null;
  let q = null;
  let answered = false;
  let hintUsed = false;
  let found = [];
  let session = { ans: 0, ok: 0 };
  let char = null;          // いまの あいぼう
  let popTimer = null;

  const elTitle = document.getElementById('quizTitle');
  const elScore = document.getElementById('quizScore');
  const elChar = document.getElementById('qChar');
  const elPop = document.getElementById('charPop');
  const elText = document.getElementById('qText');
  const elAnswers = document.getElementById('answers');
  const elFoot = document.querySelector('.qfoot');
  const elJudge = document.getElementById('judge');
  const elWrap = document.getElementById('quizMapWrap');

  function start(modeId) {
    mode = MODE_BY_ID[modeId];
    session = { ans: 0, ok: 0 };
    char = Buddy.current(mode.id);
    elTitle.innerHTML = mode.emoji + ' ' + ruby(mode.name, mode.kana);
    Screens.go('quiz');
    elWrap.appendChild(MapView.hostEl());
    next();
    // あいぼうの あいさつ(しゃべりながら 口パク)
    showPop(char.modeIntro, 'happy', 3400, char, false, true);
  }

  // 地図の 上に あいぼうの セリフを 出す(でんしゃトーク本体の 電車を 表示)
  //   mood : 'happy' | 'think' | 'wow'
  //   speakToo : true なら こえでも 読み上げて、口パクさせる
  function showPop(text, mood, dur, who, high, speakToo) {
    const c = who || char;
    elPop.innerHTML = trainIcon(c, 'lg is-hop', mood || 'happy')
      + '<div class="pop-bubble" style="--ink:' + c.ink + '">' + text + '</div>';
    elPop.classList.add('is-on');
    elPop.classList.toggle('is-high', !!high);
    window.clearTimeout(popTimer);
    popTimer = window.setTimeout(() => { elPop.classList.remove('is-on'); }, dur || 2600);
    if (speakToo) {
      const talkEl = elPop.querySelector('.train-ic');
      Buddy.speak(c, text.replace(/<br>/g, '。'), { talkEl: talkEl });
    }
  }

  function hidePop() {
    window.clearTimeout(popTimer);
    elPop.classList.remove('is-on');
  }

  // あいぼうの セリフを 出して、こえでも 言う('think' の 表情で)
  function charLine(key, mood, dur) {
    const text = Buddy.line(char, key);
    if (!text) return '';
    showPop(text, mood, dur, char, false, true);
    return text;
  }

  function updateScore() {
    elScore.textContent = session.ok + '/' + session.ans;
  }

  function clearExplain() {
    const old = elWrap.querySelector('.explain');
    if (old) old.remove();
  }

  function next() {
    answered = false;
    hintUsed = false;
    found = [];
    clearExplain();
    elJudge.classList.remove('is-on');
    elJudge.textContent = '';
    elFoot.classList.remove('is-answered');
    document.getElementById('btnHint').disabled = false;
    MapView.clearAll();
    MapView.reset();

    hidePop();
    char = Buddy.current(mode.id);
    elChar.innerHTML = trainIcon(char, '', 'happy');

    q = mode.make();
    elText.innerHTML = (q.emoji || '❓') + ' ' + q.text;

    if (q.setup) q.setup();
    renderAnswers();
    speakQuestion();
  }

  function speakQuestion() {
    if (q.speak) {
      const talkEl = elChar.querySelector('.train-ic');
      Buddy.speak(char, q.speak, { talkEl: talkEl });
    }
  }

  function renderAnswers() {
    elAnswers.innerHTML = '';
    if (q.kind === 'choice') {
      elAnswers.classList.add('is-on');
      const grid = document.createElement('div');
      grid.className = 'choice-grid' + (q.cols === 3 ? ' col3' : '');
      q.choices.forEach((c, i) => {
        const b = document.createElement('button');
        b.className = 'choice';
        b.innerHTML = c.label;
        b.addEventListener('click', () => onChoice(i, b));
        grid.appendChild(b);
      });
      elAnswers.appendChild(grid);
    } else if (q.kind === 'tapMulti') {
      elAnswers.classList.add('is-on');
      const info = document.createElement('div');
      info.className = 'multi-info';
      info.id = 'multiInfo';
      elAnswers.appendChild(info);
      updateMulti();
    } else {
      elAnswers.classList.remove('is-on');
    }
  }

  function updateMulti() {
    const info = document.getElementById('multiInfo');
    if (info) info.innerHTML = 'あと <b>' + (q.answer.length - found.length) + '</b> けん';
  }

  function judge(ok) {
    elJudge.innerHTML = '<div class="judge-mark ' + (ok ? 'ok">⭕' : 'ng">❌') + '</div>';
    elJudge.classList.add('is-on');
    window.setTimeout(() => { elJudge.classList.remove('is-on'); }, ok ? 700 : 520);
  }

  function finish(ok, skipped) {
    answered = true;
    session.ans += 1;
    if (ok) session.ok += 1;
    updateScore();
    Store.addMode(mode.id, ok);
    if (ok && q.award && q.award.length) Store.addCorrect(q.award);
    if (q.onDone) q.onDone();
    elFoot.classList.add('is-answered');

    // あいぼうの ひとこと(正解 / とばした / まちがえて おわった)
    const key = ok ? (q.kind === 'tapMulti' ? 'clear' : 'ok') : (skipped ? 'skip' : 'ng');
    const said = Buddy.line(char, key);
    const mood = ok ? 'wow' : (skipped ? 'happy' : 'think');

    hidePop();
    const box = document.createElement('div');
    box.className = 'explain';
    box.innerHTML =
      '<div class="ex-head">' + trainIcon(char, 'sm' + (ok ? ' is-hop' : ''), mood)
        + '<span class="ex-say">' + said + '</span></div>' +
      '<div class="ex-stamp">' + (ok ? '🎉' : skipped ? '👀' : '💡') + '</div>' +
      '<div class="ex-title">' + q.explain.title + '</div>' +
      '<div class="ex-note">' + q.explain.note + '</div>' +
      (ok && q.award && q.award.length
        ? '<div class="ex-note">スタンプ +' + q.award.length + '</div>' : '');
    elWrap.appendChild(box);

    if (ok) SoundEngine.seStamp();
    const exTalkEl = box.querySelector('.train-ic');
    Buddy.speak(char, said + '。' + q.explain.title, { talkEl: exTalkEl });

    // たまに ほかの キャラが よこから ひとこと 言いにくる
    if (ok && Math.random() < 0.3) {
      const guest = Buddy.other(char);
      window.setTimeout(() => {
        if (!answered) return;
        const cut = Buddy.line(guest, 'cutIn');
        showPop(cut, 'happy', 3000, guest, true, true);
      }, 2200);
    }
  }

  function onChoice(i, btn) {
    if (answered) return;
    const c = q.choices[i];
    if (c.ok) {
      btn.classList.add('is-ok');
      SoundEngine.seCorrect();
      judge(true);
      finish(true);
    } else {
      btn.classList.add('is-ng', 'is-gone');
      SoundEngine.seWrong();
      judge(false);
      charLine('ng', 'think', 2000);
      window.setTimeout(() => btn.classList.remove('is-ng'), 400);
      const left = Array.from(elAnswers.querySelectorAll('.choice')).filter((b) => !b.classList.contains('is-gone'));
      if (left.length === 1) {
        // のこり1つに なったら こたえを 見せて おわりに する
        left[0].classList.add('is-ok');
        finish(false);
      }
    }
  }

  function onTap(hit) {
    if (answered || !q) return;

    if (q.kind === 'tapPref' && hit.type === 'pref') {
      if (q.answer.indexOf(hit.code) >= 0) {
        MapView.setPref(hit.code, 'is-ok');
        SoundEngine.seCorrect();
        judge(true);
        finish(true);
      } else {
        MapView.setPref(hit.code, 'is-ng');
        Store.addWrong(hit.code);
        SoundEngine.seWrong();
        judge(false);
        charLine('ng', 'think', 2000);
        window.setTimeout(() => {
          if (!answered) MapView.setPref(hit.code, '');
        }, 700);
      }
      return;
    }

    if (q.kind === 'tapMulti' && hit.type === 'pref') {
      if (found.indexOf(hit.code) >= 0) return;
      if (q.answer.indexOf(hit.code) >= 0) {
        found.push(hit.code);
        MapView.setPref(hit.code, 'is-ok');
        MapView.showLabels(found);
        SoundEngine.seTap();
        Buddy.speak(char, prefKana(hit.code));
        updateMulti();
        if (found.length === q.answer.length) {
          SoundEngine.seFanfare();
          judge(true);
          finish(true);
        }
      } else {
        MapView.setPref(hit.code, 'is-ng');
        Store.addWrong(hit.code);
        SoundEngine.seWrong();
        charLine('ng', 'think', 1800);
        window.setTimeout(() => {
          if (found.indexOf(hit.code) < 0) MapView.setPref(hit.code, '');
        }, 600);
      }
      return;
    }

    if (q.kind === 'tapGeo' && hit.type === 'geo') {
      if (hit.index === q.answer) {
        MapView.geoClass(hit.index, 'is-ok');
        SoundEngine.seCorrect();
        judge(true);
        finish(true);
      } else {
        MapView.geoClass(hit.index, 'is-ng');
        SoundEngine.seWrong();
        judge(false);
        charLine('ng', 'think', 2000);
        window.setTimeout(() => {
          if (!answered) MapView.geoClass(hit.index, '');
        }, 700);
      }
    }
  }

  // ヒントは 「あいぼうの ヒントのセリフ + じっさいの ヒント」で 出す
  function hintSay(text) {
    const lead = Buddy.line(char, 'hint');
    showPop(lead + '<br>' + text, 'think', 3200, char, false, true);
  }

  function hint() {
    if (answered || hintUsed) return;
    hintUsed = true;
    document.getElementById('btnHint').disabled = true;

    if (q.kind === 'choice') {
      const left = Array.from(elAnswers.querySelectorAll('.choice'))
        .filter((b, i) => !b.classList.contains('is-gone') && !q.choices[i].ok);
      if (left.length) {
        const b = pick(left);
        b.classList.add('is-gone');
      }
      hintSay('ひとつ けしたよ');
      return;
    }

    if (q.kind === 'tapPref') {
      const region = regionOf(q.answer[0]);
      PREFECTURES.forEach((p) => {
        if (region.prefs.indexOf(p.code) < 0) MapView.setPref(p.code, 'is-dim');
      });
      MapView.focus(region.prefs, 1.9);
      hintSay(region.name + 'の なかだよ');
      return;
    }

    if (q.kind === 'tapMulti') {
      const rest = q.answer.filter((c) => found.indexOf(c) < 0);
      if (rest.length) {
        const c = pick(rest);
        MapView.setPref(c, 'is-target');
        MapView.showLabels(found.concat([c]));
        hintSay('ここも ' + shortName(c) + 'だよ');
      }
      return;
    }

    if (q.kind === 'tapGeo') {
      const wrongs = q.shown.filter((i) => i !== q.answer);
      shuffle(wrongs).slice(0, Math.floor(wrongs.length / 2)).forEach((i) => MapView.geoClass(i, 'is-hide'));
      hintSay('はんぶん けしたよ');
    }
  }

  function skip() {
    if (answered) return;
    if (q.kind === 'choice') {
      Array.from(elAnswers.querySelectorAll('.choice')).forEach((b, i) => {
        if (q.choices[i].ok) b.classList.add('is-ok');
        else b.classList.add('is-gone');
      });
    } else if (q.kind === 'tapPref' || q.kind === 'tapMulti') {
      MapView.clearPrefs();
      q.answer.forEach((c) => MapView.setPref(c, 'is-ok'));
      MapView.showLabels(q.answer);
      MapView.focus(q.answer, 1.8);
    } else if (q.kind === 'tapGeo') {
      MapView.geoClass(q.answer, 'is-ok');
      MapView.geoNames(true);
    }
    finish(false, true);
  }

  MapView.onTap(onTap);

  document.getElementById('btnHint').addEventListener('click', hint);
  document.getElementById('btnSkip').addEventListener('click', skip);
  document.getElementById('btnNext').addEventListener('click', next);
  document.getElementById('qSpeak').addEventListener('click', speakQuestion);

  return { start: start, tap: onTap };
})();

/* ============================== 図鑑 ============================== */

const Zukan = (function createZukan() {
  const body = document.getElementById('zukanBody');
  const count = document.getElementById('zukanCount');

  function miniSvg(code, cls) {
    const box = prefBox(code).main;
    const pad = Math.max((box.x1 - box.x0), (box.y1 - box.y0)) * 0.1 + 4;
    const w = box.x1 - box.x0 + pad * 2;
    const h = box.y1 - box.y0 + pad * 2;
    const side = Math.max(w, h);
    const vx = box.x0 - pad - (side - w) / 2;
    const vy = box.y0 - pad - (side - h) / 2;
    return '<svg class="' + cls + '" viewBox="' + vx + ' ' + vy + ' ' + side + ' ' + side + '">'
      + '<path d="' + PREF_BY_CODE[code].path + '"/></svg>';
  }

  function stars(lv) {
    return '★★★'.slice(0, lv) + '☆☆☆'.slice(0, 3 - lv);
  }

  function render() {
    const got = PREFECTURES.filter((p) => prefLevel(p.code) > 0).length;
    count.textContent = got + '/47';

    let html = '';
    REGIONS.forEach((r) => {
      const done = r.prefs.every((c) => prefLevel(c) > 0);
      const gold = r.prefs.every((c) => prefLevel(c) >= 3);
      html += '<div class="zk-region">';
      html += '<div class="zk-head"><span class="zk-dot" style="background:' + r.color + '"></span>'
        + ruby(r.name, r.kana)
        + '<span class="zk-badge' + (done ? ' is-done' : '') + '">'
        + (gold ? '👑 かんぺき!' : done ? '🏅 コンプリート' : r.prefs.filter((c) => prefLevel(c) > 0).length + '/' + r.prefs.length)
        + '</span></div>';
      html += '<div class="zk-grid">';
      r.prefs.forEach((c) => {
        const lv = prefLevel(c);
        html += '<button class="zk-card' + (lv === 0 ? ' is-locked' : ' lv' + lv) + '" data-card="' + c + '">'
          + miniSvg(c, 'zk-mini')
          + '<div class="zk-name">' + (lv === 0 ? '？？？' : shortName(c)) + '</div>'
          + '<div class="zk-star">' + (lv === 0 ? '' : stars(lv)) + '</div>'
          + '</button>';
      });
      html += '</div></div>';
    });
    body.innerHTML = html;

    body.querySelectorAll('[data-card]').forEach((b) => {
      b.addEventListener('click', () => {
        const code = Number(b.dataset.card);
        if (prefLevel(code) === 0) {
          SoundEngine.speak('まだ カードが ないよ。クイズで せいかいすると もらえるよ');
          return;
        }
        Card.open(code);
      });
    });
  }

  return { render: render, miniSvg: miniSvg, stars: stars };
})();

/* ============================== 県カード ============================== */

const Card = (function createCard() {
  const modal = document.getElementById('cardModal');
  const body = document.getElementById('cardBody');

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  function close() { modal.classList.remove('is-on'); }

  function open(code) {
    const info = PREF_INFO[code];
    const region = regionOf(code);
    const lv = prefLevel(code);
    const stat = Store.prefStat(code);
    const geos = GEO.filter((g) => g.prefs.indexOf(code) >= 0);
    const lines = SHINKANSEN.filter((l) => l.prefs.indexOf(code) >= 0);
    const climate = CLIMATES[info.climate];

    let html = '';
    html += '<div class="card-top">';
    html += Zukan.miniSvg(code, 'card-mini');
    html += '<div><div class="card-name">' + prefRuby(code) + '</div>';
    html += '<div class="card-region" style="background:' + region.color + '">' + ruby(region.name, region.kana) + '</div>';
    html += '<div class="card-star">' + Zukan.stars(lv) + ' <span style="color:#6b7a90;font-size:12px">せいかい ' + stat.n + 'かい</span></div>';
    html += '</div></div>';

    html += '<div class="card-rows">';
    html += '<div class="card-row"><div class="cr-key">県庁所在地</div><div class="cr-val"><b>'
      + ruby(info.capital.name, info.capital.kana) + '</b></div></div>';
    html += '<div class="card-row"><div class="cr-key">気候</div><div class="cr-val">'
      + ruby(climate.name, climate.kana) + '<br><span style="color:#6b7a90;font-size:12.5px">' + climate.note + '</span></div></div>';
    if (geos.length) {
      html += '<div class="card-row"><div class="cr-key">地形</div><div class="cr-val"><div class="tag-list">'
        + geos.map((g) => '<span class="tag">' + GEO_CATS[g.cat].emoji + ' ' + g.name + '</span>').join('')
        + '</div></div></div>';
    }
    if (lines.length) {
      html += '<div class="card-row"><div class="cr-key">新幹線</div><div class="cr-val"><div class="tag-list">'
        + lines.map((l) => '<span class="tag sk" style="background:' + l.color + '">🚄 ' + l.name + '</span>').join('')
        + '</div></div></div>';
    }
    html += '</div>';

    html += '<div class="card-fams">';
    info.famous.forEach((f) => {
      html += '<div class="card-fam"><div class="cf-e">' + f.e + '</div><div class="cf-n">'
        + ruby(f.name, f.kana) + '</div><div class="cf-note">' + f.note + '</div></div>';
    });
    html += '</div>';

    html += '<div class="card-fact">' + info.fact + '</div>';

    // その県を たんとうする キャラの ひとこと
    const voice = PREF_VOICE[code];
    const vc = CHAR_BY_ID[voice.c];
    html += '<div class="card-voice" style="--ink:' + vc.ink + '">'
      + trainIcon(vc, 'sm')
      + '<div class="cv-body"><div class="cv-who">' + vc.name + '</div>'
      + '<div class="cv-line">' + voice.t + '</div></div></div>';

    html += '<div class="card-btns">'
      + '<button class="btn" id="cardSpeak">🔊 よみあげ</button>'
      + '<button class="btn btn-sub" id="cardClose">とじる</button>'
      + '</div>';

    body.innerHTML = html;
    modal.classList.add('is-on');

    const speakText = prefKana(code) + '。けんちょうしょざいちは ' + info.capital.kana + '。'
      + region.kana + '。' + info.fact + ' ' + voice.t;
    const cardTalkEl = body.querySelector('.card-voice .train-ic');
    document.getElementById('cardSpeak').addEventListener('click', () => {
      Buddy.speak(vc, speakText, { talkEl: cardTalkEl });
    });
    document.getElementById('cardClose').addEventListener('click', close);
    Buddy.speak(vc, prefKana(code), { talkEl: cardTalkEl });
  }

  return { open: open, close: close };
})();

/* ============================== ちずをみる ============================== */

const Browse = (function createBrowse() {
  const wrap = document.getElementById('browseMapWrap');
  const bar = document.getElementById('layerBar');
  const info = document.getElementById('infoBar');

  const state = {
    names: false,
    regions: false,
    caps: false,
    sk: false,
    geo: {},
  };
  Object.keys(GEO_CATS).forEach((k) => { state.geo[k] = false; });

  let selected = null;

  function buildBar() {
    const buttons = [
      { key: 'names', label: '県名' },
      { key: 'regions', label: '地方の色' },
      { key: 'caps', label: '🏛️ 県庁所在地' },
      { key: 'sk', label: '🚄 新幹線' },
    ].concat(Object.keys(GEO_CATS).map((k) => ({ key: 'geo:' + k, label: GEO_CATS[k].emoji + ' ' + GEO_CATS[k].label })));

    bar.innerHTML = buttons.map((b) =>
      '<button class="layer-btn" data-layer="' + b.key + '">' + b.label + '</button>').join('');

    bar.querySelectorAll('[data-layer]').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.dataset.layer;
        if (key.indexOf('geo:') === 0) {
          const cat = key.slice(4);
          state.geo[cat] = !state.geo[cat];
        } else {
          state[key] = !state[key];
        }
        SoundEngine.seTap();
        syncBar();
        apply();
      });
    });
  }

  function syncBar() {
    bar.querySelectorAll('[data-layer]').forEach((b) => {
      const key = b.dataset.layer;
      const on = key.indexOf('geo:') === 0 ? state.geo[key.slice(4)] : state[key];
      b.classList.toggle('is-on', !!on);
    });
  }

  function apply() {
    MapView.clearPrefs();
    MapView.paintRegions(state.regions);
    if (selected) MapView.setPref(selected, 'is-sel');
    MapView.showLabels(state.names ? 'all' : (selected ? [selected] : null));

    const geoItems = GEO.map((g, i) => ({ geo: g, index: i })).filter((it) => state.geo[it.geo.cat]);
    MapView.renderGeo(geoItems, { names: true });

    MapView.renderSk(state.sk ? SHINKANSEN.map((l, i) => ({ line: l, index: i })) : [], { stations: true });
    MapView.renderCaps(state.caps ? PREFECTURES.map((p) => p.code) : []);
  }

  function showPref(code) {
    selected = code;
    const i = PREF_INFO[code];
    const region = regionOf(code);
    const lv = prefLevel(code);
    const voice = PREF_VOICE[code];
    const vc = CHAR_BY_ID[voice.c];
    info.innerHTML =
      '<div class="ib-title">' + prefRuby(code) + ' <span style="font-size:13px;color:' + region.color + '">'
        + region.name + '</span></div>'
      + '<div class="ib-sub">県庁所在地 ' + ruby(i.capital.name, i.capital.kana)
        + '　/　' + i.climate_label + '</div>'
      + '<div class="ib-rows"><div class="ib-row">' + i.fact + '</div>'
      + '<div class="ib-row">めいぶつ: ' + i.famous.map((f) => f.e + f.name).join('　') + '</div></div>'
      + '<div class="ib-guide" style="--ink:' + vc.ink + '">' + trainIcon(vc, 'sm')
      + '<span class="ibg-text">' + voice.t + '</span></div>'
      + '<div class="ib-btns">'
      + '<button class="btn" id="ibSpeak">🔊 よみあげ</button>'
      + (lv > 0 ? '<button class="btn btn-sub" id="ibCard">📔 カードを見る</button>' : '')
      + '</div>';
    const prefTalkEl = info.querySelector('.ib-guide .train-ic');
    document.getElementById('ibSpeak').addEventListener('click', () => {
      Buddy.speak(vc, prefKana(code) + '。けんちょうしょざいちは ' + i.capital.kana + '。'
        + i.fact + ' ' + voice.t, { talkEl: prefTalkEl });
    });
    const cardBtn = document.getElementById('ibCard');
    if (cardBtn) cardBtn.addEventListener('click', () => Card.open(code));
    Buddy.speak(vc, prefKana(code), { talkEl: prefTalkEl });
    apply();
  }

  function showGeo(index) {
    const g = GEO[index];
    selected = null;
    const guide = GUIDE_CHAR;
    info.innerHTML =
      '<div class="ib-title">' + GEO_CATS[g.cat].emoji + ' ' + ruby(g.name, g.kana) + '</div>'
      + '<div class="ib-sub">' + GEO_CATS[g.cat].label + '　/　' + g.prefs.map((c) => shortName(c)).join('・') + '</div>'
      + '<div class="ib-guide" style="--ink:' + guide.ink + '">' + trainIcon(guide, 'sm')
      + '<span class="ibg-text">' + g.note + '</span></div>'
      + '<div class="ib-btns"><button class="btn" id="ibSpeak">🔊 よみあげ</button></div>';
    const geoTalkEl = info.querySelector('.ib-guide .train-ic');
    document.getElementById('ibSpeak').addEventListener('click', () => {
      Buddy.speak(guide, g.kana + '。' + g.note, { talkEl: geoTalkEl });
    });
    Buddy.speak(guide, g.kana, { talkEl: geoTalkEl });
    MapView.clearPrefs();
    MapView.paintRegions(state.regions);
    g.prefs.forEach((c) => MapView.setPref(c, 'is-mark'));
    MapView.showLabels(state.names ? 'all' : g.prefs);
  }

  function showSk(index) {
    const l = SHINKANSEN[index];
    selected = null;
    const guide = CHAR_BY_MODE.shinkansen || GUIDE_CHAR;
    info.innerHTML =
      '<div class="ib-title">🚄 ' + ruby(l.name, l.kana) + '</div>'
      + '<div class="ib-sub">通る 都道府県: ' + l.prefs.map((c) => shortName(c)).join('・') + '</div>'
      + '<div class="ib-guide" style="--ink:' + guide.ink + '">' + trainIcon(guide, 'sm')
      + '<span class="ibg-text">' + l.note + '　おもな駅: ' + l.stations.map((s) => s.name).join('・') + '</span></div>'
      + '<div class="ib-btns"><button class="btn" id="ibSpeak">🔊 よみあげ</button></div>';
    const skTalkEl = info.querySelector('.ib-guide .train-ic');
    document.getElementById('ibSpeak').addEventListener('click', () => {
      Buddy.speak(guide, l.kana + '。' + l.note, { talkEl: skTalkEl });
    });
    Buddy.speak(guide, l.kana, { talkEl: skTalkEl });
    MapView.clearPrefs();
    MapView.paintRegions(state.regions);
    l.prefs.forEach((c) => MapView.setPref(c, 'is-mark'));
    MapView.showLabels(state.names ? 'all' : l.prefs);
  }

  function onTap(hit) {
    if (hit.type === 'geo') { showGeo(hit.index); return; }
    if (hit.type === 'sk') { showSk(hit.index); return; }
    if (hit.type === 'cap') { showPref(hit.code); return; }
    if (hit.type === 'pref') { showPref(hit.code); }
  }

  function enter() {
    Screens.go('map');
    wrap.appendChild(MapView.hostEl());
    MapView.clearAll();
    MapView.reset();
    MapView.setInteractive(true);
    selected = null;
    const guide = GUIDE_CHAR;
    info.innerHTML = '<div class="ib-guide" style="--ink:' + guide.ink + '">'
      + trainIcon(guide, 'lg', 'happy')
      + '<span class="ibg-text"><b>' + guide.name + '</b>「' + guide.hello + '」<br>'
      + '県や 地形を タップすると せつめいが 出るよ。'
      + '上の ボタンで 地形や 新幹線を かさねて 見られるんだ!</span></div>';
    Buddy.speak(guide, guide.hello, { talkEl: info.querySelector('.ib-guide .train-ic') });
    syncBar();
    apply();
  }

  buildBar();

  return { enter: enter, tap: onTap };
})();

/* ============================== タイトル ============================== */

const Title = (function createTitle() {
  const grid = document.getElementById('menuGrid');
  const stat = document.getElementById('heroStat');
  const strip = document.getElementById('buddyStrip');
  const say = document.getElementById('buddySay');

  // あいぼう えらび(おまかせ + 7キャラ)
  function buildStrip() {
    const now = Store.settings().buddy || 'auto';
    let html = '<button class="buddy-btn' + (now === 'auto' ? ' is-on' : '')
      + '" data-buddy="auto"><span class="bb-auto">🎲</span>'
      + '<span class="bb-name">おまかせ</span>'
      + '<span class="bb-sub">モードごと</span></button>';
    CHARACTERS.forEach((c) => {
      html += '<button class="buddy-btn' + (now === c.id ? ' is-on' : '')
        + '" data-buddy="' + c.id + '">' + trainIcon(c)
        + '<span class="bb-name">' + c.name + '</span>'
        + '<span class="bb-sub">' + c.line + '</span></button>';
    });
    strip.innerHTML = html;

    strip.querySelectorAll('[data-buddy]').forEach((b) => {
      b.addEventListener('click', () => {
        SoundEngine.unlock();
        Store.setSetting('buddy', b.dataset.buddy);
        SoundEngine.seTap();
        refresh();
        const c = Buddy.current(null);
        Buddy.speak(c, c.hello, { talkEl: say.querySelector('.train-ic') });
      });
    });
  }

  function buildMenu() {
    grid.innerHTML = MODES.map((m) => {
      const c = Buddy.current(m.id);
      return '<button class="menu-card" data-mode="' + m.id + '">'
        + '<div class="mc-top"><span class="mc-emoji">' + m.emoji + '</span>'
        + trainIcon(c, 'sm') + '</div>'
        + '<div class="mc-name">' + ruby(m.name, m.kana) + '</div>'
        + '<div class="mc-desc">' + m.desc + '</div>'
        + '<div class="mc-who">' + c.name + ' と いっしょに</div>'
        + '<div class="mc-bar"><i style="width:0%"></i></div>'
        + '</button>';
    }).join('');

    grid.querySelectorAll('[data-mode]').forEach((b) => {
      b.addEventListener('click', () => {
        SoundEngine.unlock();
        if (Store.settings().bgm) SoundEngine.startBgm();
        Quiz.start(b.dataset.mode);
      });
    });
  }

  function refresh() {
    const got = PREFECTURES.filter((p) => prefLevel(p.code) > 0).length;
    const master = PREFECTURES.filter((p) => prefLevel(p.code) >= 3).length;
    const total = PREFECTURES.reduce((a, p) => a + Store.prefStat(p.code).n, 0);
    stat.innerHTML =
      '<span class="chip">📔 カード ' + got + '/47</span>'
      + '<span class="chip">★★★ ' + master + 'けん</span>'
      + '<span class="chip">🎯 せいかい ' + total + '</span>';

    buildStrip();
    buildMenu();

    const c = Buddy.current(null);
    say.innerHTML = trainIcon(c, 'sm', 'happy') + '<span>' + c.hello + '</span>';

    grid.querySelectorAll('[data-mode]').forEach((b) => {
      const st = Store.modeStat(b.dataset.mode);
      const pct = st.ans === 0 ? 0 : Math.round((st.ok / st.ans) * 100);
      const bar = b.querySelector('.mc-bar > i');
      bar.style.width = pct + '%';
      bar.style.background = pct >= 80 ? '#17a35b' : pct >= 50 ? '#d9a227' : '#e2574c';
    });
  }

  return { refresh: refresh };
})();

/* ============================== せってい ============================== */

const Settings = (function createSettings() {
  const body = document.getElementById('settingsBody');

  const items = [
    { key: 'furigana', label: 'ふりがな', desc: 'オフに すると 漢字だけに なって、むずかしく なります' },
    { key: 'voice', label: 'よみあげ', desc: '問題や 県の 名前を 声で 読みます' },
    { key: 'se', label: 'こうかおん', desc: 'ピンポン・ブブー・スタンプの音' },
    { key: 'bgm', label: 'BGM', desc: 'たびの 音楽が ながれます' },
  ];

  function render() {
    const s = Store.settings();
    let html = '<div class="set-head">おと・もじ</div>';
    items.forEach((it) => {
      html += '<div class="set-row"><div class="sr-label">' + it.label
        + '<div class="sr-desc">' + it.desc + '</div></div>'
        + '<button class="toggle' + (s[it.key] ? ' is-on' : '') + '" data-key="' + it.key + '">'
        + (s[it.key] ? 'オン' : 'オフ') + '</button></div>';
    });
    html += '<div class="set-head">きろく</div>';
    html += '<div class="set-row"><div class="sr-label">図鑑を リセット'
      + '<div class="sr-desc">あつめた カードと せいかい数を ぜんぶ けします</div></div>'
      + '<button class="toggle is-danger" id="btnReset">けす</button></div>';
    body.innerHTML = html;

    body.querySelectorAll('[data-key]').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.dataset.key;
        const now = !Store.settings()[key];
        Store.setSetting(key, now);
        applySettings();
        render();
        SoundEngine.seTap();
      });
    });

    document.getElementById('btnReset').addEventListener('click', () => {
      if (window.confirm('あつめた カードを ぜんぶ けしますか?')) {
        Store.reset();
        render();
      }
    });
  }

  function applySettings() {
    const s = Store.settings();
    document.body.classList.toggle('no-furigana', !s.furigana);
    SoundEngine.setSeEnabled(s.se);
    SoundEngine.setVoiceEnabled(s.voice);
    SoundEngine.setBgmEnabled(s.bgm);
  }

  return { render: render, apply: applySettings };
})();

/* ============================== 起動 ============================== */

(function boot() {
  // 気候の 見出しを 使いやすい ように 展開しておく
  Object.keys(PREF_INFO).forEach((code) => {
    PREF_INFO[code].climate_label = CLIMATES[PREF_INFO[code].climate].name;
  });

  document.getElementById('quizMapWrap').appendChild(MapView.build());

  // 画面ごとに 地図タップの いき先を きりかえる
  MapView.onTap((hit) => {
    if (Screens.current() === 'quiz') Quiz.tap(hit);
    else if (Screens.current() === 'map') Browse.tap(hit);
  });

  document.querySelectorAll('[data-back]').forEach((b) => {
    b.addEventListener('click', () => {
      SoundEngine.stopSpeak();
      Screens.go(b.dataset.back);
    });
  });

  document.querySelectorAll('[data-go]').forEach((b) => {
    b.addEventListener('click', () => {
      SoundEngine.unlock();
      const to = b.dataset.go;
      if (to === 'map') Browse.enter();
      else Screens.go(to);
    });
  });

  document.querySelectorAll('[data-zoom]').forEach((b) => {
    b.addEventListener('click', () => {
      const k = b.dataset.zoom;
      if (k === 'in') MapView.zoomBy(0.7);
      else if (k === 'out') MapView.zoomBy(1.4);
      else MapView.reset();
    });
  });

  Settings.apply();
  Title.refresh();
})();
