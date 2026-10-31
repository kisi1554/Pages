'use strict';

/*
 * えほん の すすめかた
 *  - ひょうし → ほん（10ページ）→ おしまい
 *  - ページ の しかけ（steps）を じゅんに こなす と「つぎ ▶」が ひらく
 *  - え は Art.scene で かいて、うごき は まいフレーム transform を かきかえる
 *  - ゆび の うごき は mori.js（Mori.attach で うけとり、Mori.model で けいさん）
 *  - おしまい の「もういちど もりへ」で ページ 2・4・7・8・9 を じゆう に あそべる
 *  - しおり・せってい・こたえ・つんだ おはな・やくそく は localStorage（よみかき は try/catch）
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'akazukin-v1';
  const PAGES = Story.PAGES;
  const POS = Art.POS;
  const M = Mori.model;
  const FREE_IDX = Story.FREE.map((id) => PAGES.findIndex((p) => p.id === id));
  const CHARS = ['mother', 'granny', 'kikori', 'wolf', 'aka'];
  const PARTS = ['ears', 'eyes', 'hands', 'mouth'];
  const C = POS.closet;

  /* ============================ ほぞん ============================ */

  const save = {
    page: 0, done: [], sound: true, voice: true, lang: 'ja', finished: 0,
    answer: null, flowers: 0, promise: [false, false],
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(save, JSON.parse(raw));
  } catch (e) {
    /* よめなくても あそべる */
  }
  if (!Array.isArray(save.done)) save.done = [];
  if (!Array.isArray(save.promise)) save.promise = [false, false];
  if (save.lang !== 'en') save.lang = 'ja';
  const say = () => Story.SAY[save.lang];
  const label = () => Story.LABEL[save.lang];
  function store() {
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch (e) {
      /* ほぞん できなくても あそべる */
    }
  }
  Sound.setSound(save.sound);
  Sound.setVoice(save.voice);

  /* ============================ がめん ============================ */

  function show(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('is-on', s.id === 'screen-' + name));
    if (name === 'book') fit();
  }

  function syncToggles() {
    document.querySelectorAll('[data-toggle]').forEach((b) => {
      const k = b.dataset.toggle;
      const on = !!save[k];
      b.classList.toggle('is-off', !on);
      b.setAttribute('aria-pressed', String(on));
      const lab = b.querySelector('b');
      if (lab) lab.textContent = on ? 'オン' : 'オフ';
    });
  }
  document.querySelectorAll('[data-toggle]').forEach((b) => {
    b.addEventListener('click', () => {
      Sound.unlock();
      const k = b.dataset.toggle;
      if (k === 'sound') {
        save.sound = !save.sound;
        Sound.setSound(save.sound);
        if (save.sound) Sound.startBgm();
      } else {
        save.voice = !save.voice;
        Sound.setVoice(save.voice);
      }
      store();
      syncToggles();
    });
  });

  /* ============================ え の じょうたい ============================ */

  const artEl = $('art');
  const svgBox = $('artSvg');
  let S = null; // いま の え

  function ch(o, base) {
    if (!o) return null;
    const c = Object.assign({ x: 0, y: POS.ground, s: 1, flip: false, face: 'smile', pose: 'stand', speed: 180 }, base || {}, o);
    c.tx = c.x;
    c.rest = c.pose;
    return c;
  }

  function makeScene(page) {
    const sc = page.scene;
    const s = {
      place: sc.place,
      aka: ch(sc.aka, { s: 0.95 }), wolf: ch(sc.wolf, { face: 'grin' }), granny: ch(sc.granny),
      kikori: ch(sc.kikori), mother: ch(sc.mother),
      items: sc.items ? POS.items.map((it) => Object.assign({}, it, { ox: it.x, oy: it.y, in: false, back: false })) : null,
      inBasket: [],
      choices: page.steps.some((st) => st.kind === 'choose'), answer: null,
      taken: [], sunShown: 0,
      closet: sc.closet == null ? 1 : sc.closet, closetT: sc.closet == null ? 1 : sc.closet, doorOpen: false,
      bed: sc.bed || null, bedFace: 'grin', blanket: 0,
      table: !!sc.table, plates: [false, false, false], slices: 0,
      kikoriWin: sc.kikoriWin ? Object.assign({}, sc.kikoriWin) : null,
      m: M.create(sc.place === 'path' ? POS.path : null),
      zoom: { ears: 1, eyes: 1, hands: 1, mouth: 1 }, zoomT: { ears: 1, eyes: 1, hands: 1, mouth: 1 },
      parts: [], said: {}, drag: null, tap: null, pinched: false, shake: 0,
    };
    if (s.granny && s.granny.inCloset) s.granny.s = 1;
    return s;
  }

  function sceneData() {
    return {
      place: S.place,
      aka: S.aka, wolf: S.wolf, granny: S.granny, kikori: S.kikori, mother: S.mother,
      items: S.items, inBasket: S.inBasket,
      choices: S.choices ? { house: say().house, secret: say().secret } : null, picked: S.answer,
      sun: S.sunShown, taken: S.taken,
      closet: S.closet, doorOpen: S.doorOpen, bed: S.bed, bedFace: S.bedFace,
      table: S.table, plates: S.plates, slices: S.slices, kikoriWin: S.kikoriWin,
    };
  }

  function draw() {
    svgBox.innerHTML = Art.scene(sceneData());
    S.parts = [];
    if (S.place === 'path') placeAka();
  }

  // ひと の かお・ポーズ を かえる（なか だけ かきなおす）
  function setChar(name, patch) {
    const c = S[name];
    if (!c) return;
    let changed = false;
    Object.keys(patch).forEach((k) => {
      if (c[k] !== patch[k]) {
        c[k] = patch[k];
        changed = true;
      }
    });
    if (!changed) return;
    const g = svgBox.querySelector('#' + name + ' > .in');
    if (g) g.innerHTML = Art.inner(name, c);
  }
  function rest(name, patch) {
    const c = S[name];
    if (!c) return;
    if (patch.pose) c.rest = patch.pose;
    setChar(name, patch);
  }
  function setKikoriWin(patch) {
    if (!S.kikoriWin) return;
    Object.assign(S.kikoriWin, patch);
    const g = svgBox.querySelector('#kikori > .in');
    if (g) g.innerHTML = Art.inner('kikori', S.kikoriWin);
  }
  function setBedFace(face) {
    if (S.bedFace === face) return;
    S.bedFace = face;
    const g = svgBox.querySelector('#bedwolf');
    if (g) g.innerHTML = Art.bedWolfInner(face);
  }

  /* ============================ まいフレーム ============================ */

  let lastT = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    if (!S || !$('screen-book').classList.contains('is-on')) return;
    const k = 1 - Math.pow(0.002, dt); // なめらかさ
    const st = step();

    // ひと（あるく）
    CHARS.forEach((name) => {
      const c = S[name];
      if (!c || c.inCloset) return;
      const g = svgBox.querySelector('#' + name);
      if (!g) return;
      if (S.place === 'path' && name === 'aka') {
        const walking = t - (c.movedAt || -9999) < 220;
        walkPose(name, c, walking, dt);
      } else if (!(S.drag && S.drag.kind === 'granny' && name === 'granny')) {
        const dx = c.tx - c.x;
        const walking = Math.abs(dx) > 0.5;
        if (walking) {
          c.x += Math.sign(dx) * Math.min(Math.abs(dx), c.speed * dt);
          if (!c.keepFlip) c.flip = dx < 0;
        }
        walkPose(name, c, walking, dt);
      }
      const bob = c.pose === 'walk1' || c.pose === 'walk2' || c.pose === 'run' ? -Math.abs(Math.sin(t / 90)) * 4 : 0;
      const sx = (c.flip ? -1 : 1) * c.s;
      g.setAttribute('transform', `translate(${c.x.toFixed(1)} ${(c.y + bob).toFixed(1)}) scale(${sx.toFixed(3)} ${c.s.toFixed(3)})`);
    });
    // かご へ もどる もの
    if (S.items) {
      S.items.forEach((it, i) => {
        if (!it.back) return;
        it.x += (it.ox - it.x) * k;
        it.y += (it.oy - it.y) * k;
        if (Math.hypot(it.ox - it.x, it.oy - it.y) < 1) {
          it.x = it.ox;
          it.y = it.oy;
          it.back = false;
        }
        placeItem(i);
      });
    }
    // おひさま（より道 で かたむく）
    if (S.place === 'meadow') {
      S.sunShown += (S.m.sun - S.sunShown) * k;
      const p = Art.sunXY(S.sunShown);
      const g = svgBox.querySelector('#sun');
      if (g) g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      const q = S.sunShown;
      const s0 = svgBox.querySelector('.sky0');
      const s1 = svgBox.querySelector('.sky1');
      if (s0) s0.setAttribute('stop-color', mix('#8fd0ff', '#ff922b', q * 0.85));
      if (s1) s1.setAttribute('stop-color', mix('#e7f7ff', '#ffe8cc', q));
    }
    // クローゼット の とびら
    if (S.place === 'room') {
      if (!(S.drag && S.drag.kind === 'shut')) S.closet += (S.closetT - S.closet) * k;
      const g = svgBox.querySelector('#cdoor');
      if (g) g.setAttribute('transform', `translate(${C.x0} 0) scale(${Art.closetK(S.closet).toFixed(3)} 1) translate(${-C.x0} 0)`);
      const d = svgBox.querySelector('#rdoor');
      if (d) d.style.transform = `scaleX(${S.doorOpen ? 0.25 : 1})`;
      const b = svgBox.querySelector('#blanket');
      if (b) b.setAttribute('transform', `translate(0 ${(S.blanket * 120).toFixed(1)})`);
      // みみ・め・て・くち
      PARTS.forEach((part) => {
        S.zoom[part] += (S.zoomT[part] - S.zoom[part]) * Math.min(1, k * 1.6);
        const el = svgBox.querySelector('#part-' + part);
        if (!el) return;
        el.style.transform = `scale(${S.zoom[part].toFixed(3)})`;
        el.classList.toggle('glow', !!(st && st.kind === 'zoom' && st.part === part && !busy));
      });
    }
    // ノック で ドア が ゆれる
    if (S.shake > 0) {
      S.shake = Math.max(0, S.shake - dt * 4);
      const d = svgBox.querySelector('#hdoor');
      if (d) d.setAttribute('transform', `translate(${(Math.sin(t / 18) * 3 * S.shake).toFixed(2)} 0)`);
    }
    // おおごえ は じかん で すこし へる
    if (st && st.kind === 'shout' && !busy) M.shoutDecay(S.m, dt);
    particles(dt);
    updateMeters();
  }
  requestAnimationFrame(frame);

  function walkPose(name, c, walking, dt) {
    if (walking) {
      c.walkT = (c.walkT || 0) + dt;
      if (c.walkT > 0.16 || (c.pose !== 'walk1' && c.pose !== 'walk2' && c.pose !== 'run')) {
        c.walkT = 0;
        if (c.rest === 'run') setChar(name, { pose: 'run' });
        else setChar(name, { pose: c.pose === 'walk1' ? 'walk2' : 'walk1' });
      }
    } else if (c.pose !== c.rest && (c.pose === 'walk1' || c.pose === 'walk2' || c.pose === 'run')) {
      setChar(name, { pose: c.rest });
    }
  }

  function mix(a, b, q) {
    const h = (s, i) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
    const c = [0, 1, 2].map((i) => Math.round(h(a, i) + (h(b, i) - h(a, i)) * Math.max(0, Math.min(1, q))));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  /* ============================ とぶ もの ============================ */

  const NS = 'http://www.w3.org/2000/svg';
  function addPart(html, p) {
    const layer = svgBox.querySelector('#parts');
    if (!layer || S.parts.length > 60) return null;
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = html;
    layer.appendChild(g);
    const part = Object.assign({ el: g, age: 0, vx: 0, vy: 0, g: 0, life: 2 }, p);
    S.parts.push(part);
    return part;
  }

  function particles(dt) {
    for (let i = S.parts.length - 1; i >= 0; i -= 1) {
      const p = S.parts[i];
      if (p.hold) continue;
      p.age += dt;
      if (p.to) {
        const q = Math.min(1, p.age / p.dur);
        const e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
        p.x = p.from.x + (p.to.x - p.from.x) * e;
        p.y = p.from.y + (p.to.y - p.from.y) * e - Math.sin(q * Math.PI) * (p.arc || 60);
      } else {
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      p.el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      const gone = p.to ? p.age > p.dur : p.age > p.life;
      if (gone) {
        p.el.remove();
        S.parts.splice(i, 1);
        if (p.done) p.done();
      }
    }
  }

  /* ============================ こうか（ふきだし・つぶ） ============================ */

  function fx(html, ms) {
    const layer = svgBox.querySelector('#fx');
    if (!layer) return null;
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = html;
    layer.appendChild(g);
    if (ms) setTimeout(() => g.remove(), ms);
    return g;
  }

  // だれ の ふきだし か で いち を きめる
  function bubbleOn(who, text, opt) {
    let x;
    let y;
    const c = S[who];
    if (c && !c.inCloset && CHARS.indexOf(who) >= 0) {
      x = c.x + (who === 'wolf' ? (c.flip ? -20 : 20) : 0);
      y = c.y - (who === 'aka' ? 175 * c.s : 205 * c.s);
    } else if (who === 'closet') {
      x = C.x - 30;
      y = C.y0 - 20;
    } else if (who === 'bed') {
      x = POS.bed.x + 60;
      y = 130;
    } else if (who === 'window') {
      x = POS.win.x;
      y = POS.win.y0 - 4;
    } else if (who === 'door') {
      x = POS.houseDoor.x + 40;
      y = POS.houseDoor.y - 90;
    } else return;
    fx(Art.bubble(x, y, text, opt), (opt && opt.ms) || 1500);
  }

  function stars(x, y, n, emoji, cls) {
    let h = '';
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2;
      h += `<text class="${cls || 'star'}" x="${x}" y="${y}" font-size="30" text-anchor="middle"
        style="--dx:${Math.cos(a) * 90}px; --dy:${Math.sin(a) * 70}px">${emoji || '⭐'}</text>`;
    }
    fx(h, 1400);
  }

  /* ============================ ヒント・メーター ============================ */

  const ring = $('ring');
  const hand = $('hand');
  const meters = $('meters');
  const badge = $('badge');
  const hurry = $('btn-hurry');

  function pct(x, y) {
    return { left: (x / 800) * 100 + '%', top: (y / 500) * 100 + '%' };
  }
  function showRing(x, y) {
    Object.assign(ring.style, pct(x, y));
    ring.classList.remove('is-hidden');
  }
  function showHand(x, y, mode, dx, dy) {
    hand.className = 'hand' + (mode ? ' ' + mode : '');
    hand.textContent = mode === 'down' ? '👇' : '👉';
    Object.assign(hand.style, pct(x, y));
    const w = artEl.getBoundingClientRect().width;
    hand.style.setProperty('--dx', Math.round(((dx || 0) / 800) * w) + 'px');
    hand.style.setProperty('--dy', Math.round(((dy || 0) / 800) * w) + 'px');
  }
  function hideHints() {
    ring.classList.add('is-hidden');
    hand.classList.add('is-hidden');
  }

  let meterKinds = [];
  const ICON = { path: '🧭', time: '⏰', shout: '📣' };
  function setMeters(kinds) {
    meterKinds = kinds;
    meters.innerHTML = kinds.map((m) => `<div class="meter ${m}"><span>${ICON[m]} ${label()[m]}</span><span class="bar"><i></i></span></div>`).join('');
  }
  function updateMeters() {
    if (!meterKinds.length) return;
    meters.querySelectorAll('.meter').forEach((el, i) => {
      const m = meterKinds[i];
      let v = 0;
      if (m === 'path') v = S.m.progress;
      else if (m === 'time') v = S.m.sun;
      else if (m === 'shout') v = S.m.shout;
      el.querySelector('i').style.width = (Math.max(0, Math.min(1, v)) * 100).toFixed(1) + '%';
    });
  }

  let badgeTimer = null;
  let badgeAt = 0;
  function showBadge(text) {
    badge.textContent = text;
    badge.classList.remove('is-hidden', 'pop');
    void badge.offsetWidth;
    badge.classList.add('pop');
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(() => badge.classList.add('is-hidden'), 1400);
  }
  function twoFingers(fingers) {
    const now = performance.now();
    if (fingers < 2 || now - badgeAt < 1200) return;
    badgeAt = now;
    showBadge(`👆×${fingers}  ${label().two}`);
  }

  /* ============================ ことば ============================ */

  const words = $('words');
  const hintEl = $('hint');
  let readToken = 0;

  // 1ぎょう は { ja, en, who }。いま の ことば（save.lang）で かく
  function renderLine(p) {
    const s = p._line[save.lang];
    p.lang = save.lang;
    p.classList.toggle('serif', /^[「“]/.test(s));
    p.classList.toggle('wolf', p._line.who === 'wolf');
    p.innerHTML = Story.ruby(s);
  }

  function addLines(lines, cls) {
    return lines.map((line) => {
      const p = document.createElement('p');
      p.className = 'line' + (cls ? ' ' + cls : '');
      p._line = line;
      renderLine(p);
      words.appendChild(p);
      return p;
    });
  }

  let hintLine = null;
  function renderHint() {
    if (!hintLine) return;
    hintEl.lang = save.lang;
    hintEl.innerHTML = Story.ruby(hintLine[save.lang]);
  }

  // 1ぎょう ずつ よみ、よんで いる ぎょう を ひからせる。おおかみ の せりふ は ひくい こえ
  function read(els, done) {
    const token = ++readToken;
    let i = 0;
    const next = () => {
      els.forEach((e) => e.classList.remove('reading'));
      if (token !== readToken) return;
      if (i >= els.length || !Sound.isVoiceOn()) {
        if (done) done();
        return;
      }
      const el = els[i];
      i += 1;
      el.classList.add('reading');
      const raw = el._line[save.lang];
      const en = save.lang === 'en';
      const wolf = el._line.who === 'wolf';
      Sound.speak(en ? Story.plainEn(raw) : Story.plain(raw), next, { lang: save.lang, pitch: wolf ? 0.7 : 0, rate: wolf ? 0.85 : 0 });
    };
    next();
  }
  function hush() {
    readToken += 1;
    Sound.stopSpeak();
    words.querySelectorAll('.reading').forEach((e) => e.classList.remove('reading'));
  }

  /* ============================ ページ ============================ */

  let pageNo = 0;
  let stepNo = 0;
  let counter = 0;
  let pageDone = false;
  let busy = false; // しかけ の アニメーション ちゅう
  let free = false; // 「もういちど もりへ」（ページ 2・4・7・8・9 を じゆう に）
  let pageTimers = [];
  function later(ms, f) {
    pageTimers.push(setTimeout(f, ms));
  }

  const freePos = () => FREE_IDX.indexOf(pageNo);
  const isFirst = () => (free ? freePos() <= 0 : pageNo === 0);
  const isLast = () => (free ? freePos() === FREE_IDX.length - 1 : pageNo === PAGES.length - 1);

  function openPage(n) {
    hush();
    pageTimers.forEach(clearTimeout);
    pageTimers = [];
    clearTimeout(idleTimer);
    pageNo = Math.max(0, Math.min(PAGES.length - 1, n));
    if (free && FREE_IDX.indexOf(pageNo) < 0) pageNo = FREE_IDX[0];
    if (!free) {
      save.page = pageNo;
      store();
    }
    const page = PAGES[pageNo];
    S = makeScene(page);
    draw();
    Mori.attach(artEl, { down: onDown, move: onMove, up: onUp });
    words.innerHTML = '';
    hideHints();
    setMeters([]);
    hurry.classList.add('is-hidden');
    badge.classList.add('is-hidden');
    $('pageNo').textContent = free ? `${label().free} ${pageNo + 1}` : `${pageNo + 1} / ${PAGES.length}`;
    $('btn-prev').disabled = isFirst();
    Sound.birds(save.sound && (page.id === 'michi' || page.id === 'ookami' || page.id === 'hana'));
    stepNo = 0;
    pageDone = false;
    busy = false;
    words.scrollTop = 0;
    const els = addLines(page.text);
    updateNext();
    startStep();
    read(els);
    if (page.id === 'ookami') later(600, () => bubbleOn('wolf', say().where, { ms: 1800 }));
    if (page.id === 'hana') {
      // おおかみ は どこか へ いって しまう
      later(1400, () => {
        if (!S.wolf) return;
        S.wolf.tx = 900;
        S.wolf.speed = 220;
      });
    }
    if (page.id === 'kakusu') later(500, () => { Sound.sfx('knock'); bubbleOn('closet', say().knockknock, { ms: 1100 }); });
    if (page.id === 'tashikameru' || page.id === 'miyaburu') later(700, () => { bubbleOn('aka', say().strange, { ms: 1400 }); });
    if (page.id === 'kikori') later(500, () => bubbleOn('aka', say().help, { ms: 1400 }));
    if (page.id === 'ochakai') later(800, () => bubbleOn('closet', say().safe + '？', { ms: 1600 }));
  }

  function updateNext() {
    const open = free || pageDone || save.done.indexOf(PAGES[pageNo].id) >= 0;
    const btn = $('btn-next');
    btn.classList.toggle('locked', !open);
    btn.classList.toggle('glow', pageDone);
    btn.innerHTML = open ? (isLast() ? 'おしまい ▶' : 'つぎ ▶') : '🔒 つぎ';
  }

  function step() {
    return PAGES[pageNo].steps[stepNo];
  }

  let idleTimer = null;
  function startStep() {
    const st = step();
    counter = 0;
    if (!st) return;
    hintLine = st.hint;
    renderHint();
    hintEl.classList.remove('is-hidden');
    showStepHint();
    if (st.kind === 'path') setMeters(['path']);
    else if (st.kind === 'flowers') {
      setMeters(['time']);
      hurry.innerHTML = label().hurry;
      hurry.classList.remove('is-hidden');
    } else if (st.kind === 'shout') setMeters(['shout']);
  }

  // いま の しかけ で さわる ところ（え の ざひょう）。to は ドラッグ の いきさき。たしかめ（check.js）も つかう
  function target() {
    const st = step();
    if (!st || !S) return null;
    const k = st.kind;
    if (k === 'basket') {
      const i = S.items.findIndex((it) => it.good && !it.in);
      return i < 0 ? null : { x: S.items[i].x, y: S.items[i].y, to: { x: POS.basket.x, y: POS.basket.y }, item: i };
    }
    if (k === 'path') {
      const p = M.pointAt(S.m.path, Math.min(1, S.m.progress + 0.05));
      return { x: p.x, y: p.y };
    }
    if (k === 'choose') return { x: POS.choice.secret.x, y: POS.choice.secret.y, alt: POS.choice.house };
    if (k === 'flowers') {
      const i = POS.flowers.findIndex((f, n) => !S.taken[n]);
      return i < 0 ? null : { x: POS.flowers[i][0], y: POS.flowers[i][1] };
    }
    if (k === 'hide') return { x: S.granny.x, y: S.granny.y - 80, to: { x: C.x, y: C.y } };
    if (k === 'shut') return { x: C.x0 - 30, y: C.y, to: { x: C.x0 + 140, y: C.y } };
    if (k === 'knock') return { x: POS.houseDoor.x, y: POS.houseDoor.y };
    if (k === 'zoom') return { x: POS.parts[st.part].x, y: POS.parts[st.part].y };
    if (k === 'flip') return { x: POS.blanket.x, y: 330, to: { x: POS.blanket.x, y: 470 } };
    if (k === 'shout') return { x: POS.win.x, y: POS.win.y + 20 };
    if (k === 'closet') return { x: C.x, y: C.y };
    if (k === 'cake') {
      const i = S.plates.indexOf(false);
      return i < 0 ? null : { x: POS.cake.x, y: POS.cake.y, to: { x: POS.plates[i].x, y: POS.plates[i].y } };
    }
    return null;
  }

  function showStepHint() {
    const st = step();
    if (!st || busy) return;
    const p = target();
    if (!p) return;
    if (p.to) {
      showHand(p.x, p.y, 'drag', p.to.x - p.x, p.to.y - p.y);
    } else if (st.kind === 'path') {
      const a = M.pointAt(S.m.path, S.m.progress);
      const b = M.pointAt(S.m.path, Math.min(1, S.m.progress + 0.12));
      showHand(a.x, a.y - 10, 'drag', b.x - a.x, b.y - a.y);
    } else if (st.kind === 'choose') {
      showRing(POS.choice.house.x, POS.choice.house.y);
      showHand(POS.choice.secret.x, POS.choice.secret.y + 30, 'tap');
    } else showRing(p.x, p.y);
  }

  // しばらく さわらないと、もう いちど ヒント
  function poke() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showStepHint, 3500);
  }

  function finishStep() {
    const st = step();
    S.drag = null;
    hideHints();
    setMeters([]);
    hurry.classList.add('is-hidden');
    hintEl.classList.add('is-hidden');
    const lines = (st.thenBy ? st.thenBy[S.answer] || [] : []).concat(st.then);
    const els = addLines(lines, 'new');
    els[els.length - 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    stepNo += 1;
    const more = !!step();
    if (!more) {
      pageDone = true;
      if (save.done.indexOf(PAGES[pageNo].id) < 0) save.done.push(PAGES[pageNo].id);
      store();
      updateNext();
    }
    read(els);
    if (more) startStep();
  }

  function after(ms, f) {
    busy = true;
    later(ms, () => {
      busy = false;
      f();
    });
  }

  /* ============================ ゆび ============================ */

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function touched() {
    hush();
    hideHints();
    poke();
  }

  function onDown(p, n, id) {
    Sound.unlock();
    const st = step();
    if (!st) return;
    const k = st.kind;
    if (k === 'shout') {
      if (busy) return;
      touched();
      twoFingers(n);
      shout();
      return;
    }
    if (k === 'zoom') {
      if (busy) return;
      touched();
      if (n >= 2) {
        S.pinched = true;
        twoFingers(n);
      } else S.tap = { id, p, moved: 0 };
      return;
    }
    if (busy || S.drag) return;
    if (k === 'path') {
      touched();
      S.drag = { kind: 'path', id };
      pathMove(p);
    } else if (k === 'basket') {
      let i = -1;
      S.items.forEach((it, j) => {
        if (!it.in && dist(p, it) < 62 && (i < 0 || dist(p, it) < dist(p, S.items[i]))) i = j;
      });
      if (i < 0) return;
      touched();
      S.items[i].back = false;
      S.drag = { kind: 'item', id, i, moved: 0 };
      raise('#item-' + i);
      Sound.sfx('lift');
    } else if (k === 'choose') {
      const which = ['house', 'secret'].find((c) => Math.abs(p.x - POS.choice[c].x) < 140 && Math.abs(p.y - POS.choice[c].y) < 56);
      if (!which) return;
      touched();
      answer(which);
    } else if (k === 'flowers') {
      const i = POS.flowers.findIndex((f, j) => !S.taken[j] && Math.hypot(p.x - f[0], p.y - f[1]) < 48);
      if (i < 0) return;
      touched();
      pickFlower(i);
    } else if (k === 'hide') {
      if (dist(p, { x: S.granny.x, y: S.granny.y - 80 }) > 90) return;
      touched();
      S.drag = { kind: 'granny', id, moved: 0, dx: S.granny.x - p.x, dy: S.granny.y - p.y };
      raise('#granny');
      setChar('granny', { face: 'wow' });
    } else if (k === 'shut') {
      if (p.x < C.x0 - 140 || p.y < C.y0 - 30 || p.y > C.y1 + 30) return;
      touched();
      S.drag = { kind: 'shut', id };
    } else if (k === 'knock') {
      if (Math.abs(p.x - POS.houseDoor.x) > 64 || Math.abs(p.y - POS.houseDoor.y) > 96) return;
      touched();
      knock();
    } else if (k === 'flip') {
      if (Math.abs(p.x - POS.blanket.x) > 190 || p.y < 230 || p.y > 450) return;
      touched();
      S.drag = { kind: 'flip', id };
    } else if (k === 'closet') {
      if (p.x < C.x0 - 30 || p.y < C.y0 - 30 || p.y > C.y1 + 20) return;
      touched();
      openCloset();
    } else if (k === 'cake') {
      if (dist(p, POS.cake) > 80 || S.slices >= 3) return;
      touched();
      const part = addPart(`<g transform="scale(1.3)">${Art.item('slice')}</g>`, { x: p.x, y: p.y, hold: true });
      if (!part) return;
      part.el.setAttribute('transform', `translate(${p.x} ${p.y})`);
      S.drag = { kind: 'slice', id, moved: 0, part };
      Sound.sfx('lift');
    }
  }

  function onMove(p, n, id, dx, dy) {
    const st = step();
    if (!st) return;
    if (st.kind === 'zoom') {
      if (S.tap && S.tap.id === id) S.tap.moved += Math.abs(dx) + Math.abs(dy);
      const pz = Mori.pinch();
      if (!pz || busy) return;
      const r = M.ratio(pz.d0, pz.d);
      S.zoomT[st.part] = Math.max(1, Math.min(1.9, 1 + (r - 1) * 1.3));
      if (M.isZoom(pz.d0, pz.d)) zoomDone();
      return;
    }
    const d = S.drag;
    if (!d || d.id !== id) return;
    d.moved = (d.moved || 0) + Math.abs(dx) + Math.abs(dy);
    if (d.kind === 'path') pathMove(p);
    else if (d.kind === 'item') {
      const it = S.items[d.i];
      it.x = p.x;
      it.y = p.y;
      placeItem(d.i);
    } else if (d.kind === 'granny') {
      S.granny.x = S.granny.tx = p.x + d.dx;
      S.granny.y = p.y + d.dy;
    } else if (d.kind === 'shut') {
      if (dx > 0) {
        S.closet = S.closetT = Math.min(1, S.closet + dx / 110);
        const now = performance.now();
        if (now - (S.said.creak || 0) > 260) {
          S.said.creak = now;
          Sound.sfx('creak');
        }
        if (S.closet >= 1) shutDone();
      }
    } else if (d.kind === 'flip') {
      if (dy > 0) {
        S.blanket = Math.min(1, S.blanket + dy / 100);
        if (S.blanket >= 1) flipDone();
      }
    } else if (d.kind === 'slice') {
      d.part.x = p.x;
      d.part.y = p.y;
      d.part.el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    }
  }

  function onUp(p, n, id) {
    const st = step();
    if (st && st.kind === 'zoom') {
      const tap = S.tap;
      if (tap && tap.id === id) S.tap = null;
      if (n === 0) {
        const was = S.pinched;
        S.pinched = false;
        if (!busy && !was && tap && tap.moved < 30 && dist(tap.p, POS.parts[st.part]) < 110) {
          zoomDone();
          return;
        }
        if (!busy) S.zoomT[st.part] = 1;
      }
      return;
    }
    const d = S.drag;
    if (!d || d.id !== id) return;
    S.drag = null;
    if (d.kind === 'path') {
      M.pathRelease(S.m);
      if (!busy) setChar('aka', { face: 'smile' });
    } else if (d.kind === 'item') dropItem(d.i, p, d.moved);
    else if (d.kind === 'granny') {
      if (d.moved > 15 && M.hit({ x: S.granny.x, y: S.granny.y - 70 }, C)) hideDone();
      else {
        S.granny.y = POS.ground;
        S.granny.tx = 330;
        setChar('granny', { face: 'wow' });
      }
    } else if (d.kind === 'slice') {
      const i = POS.plates.findIndex((pl, j) => !S.plates[j] && M.hit(p, pl, 0.09));
      const near = i >= 0 ? i : POS.plates.findIndex((pl, j) => !S.plates[j] && M.hit(p, pl));
      d.part.el.remove();
      S.parts.splice(S.parts.indexOf(d.part), 1);
      if (d.moved > 20 && near >= 0) placeSlice(near);
    }
  }

  function raise(sel) {
    const el = svgBox.querySelector(sel);
    const fxl = svgBox.querySelector('#parts');
    if (el && fxl) fxl.parentNode.insertBefore(el, fxl);
  }

  /* ---------- 1: かご に いれる ---------- */

  function placeItem(i) {
    const it = S.items[i];
    const g = svgBox.querySelector('#item-' + i);
    if (g) g.setAttribute('transform', `translate(${it.x.toFixed(1)} ${it.y.toFixed(1)}) scale(1.5)`);
  }

  function dropItem(i, p, moved) {
    const it = S.items[i];
    const st = step();
    if (moved > 12 && M.hit(p, POS.basket) && st && st.kind === 'basket') {
      if (!it.good) {
        // ボール は いらない（しっぱい に しない。もとへ もどる だけ）
        bubbleOn('mother', say().noNeed, { ms: 1300 });
        Sound.sfx('boing');
        it.back = true;
        return;
      }
      putInBasket(i);
      return;
    }
    it.back = true;
  }

  function putInBasket(i) {
    const st = step();
    const it = S.items[i];
    it.in = true;
    S.inBasket.push(it.k);
    const g = svgBox.querySelector('#item-' + i);
    if (g) g.remove();
    const b = svgBox.querySelector('#basket');
    if (b) b.innerHTML = Art.basket(S.inBasket);
    counter += 1;
    Sound.sfx('put', counter);
    stars(POS.basket.x, POS.basket.y - 50, 5, '✨');
    bubbleOn('aka', say().inBasket, { ms: 900 });
    if (counter >= st.need) {
      after(700, () => {
        rest('aka', { face: 'happy', pose: 'cheer', basket: true });
        bubbleOn('aka', say().itekimasu, { ms: 1800 });
        finishStep();
        later(1200, () => {
          rest('aka', { pose: 'stand' });
          S.aka.tx = 900;
        });
      });
    }
  }

  /* ---------- 2: みち を たどる ---------- */

  function placeAka() {
    if (!S.aka || !S.m.path) return;
    const pt = M.pointAt(S.m.path, S.m.progress);
    S.aka.x = S.aka.tx = pt.x;
    S.aka.y = pt.y + 8;
    S.aka.s = 0.44 + (0.36 * (pt.y - 200)) / 255;
    if (Math.abs(pt.dx) > 4) S.aka.flip = pt.dx < 0;
    const w = svgBox.querySelector('#walked');
    if (w) w.setAttribute('stroke-dasharray', `${(S.m.progress * S.m.path.total).toFixed(1)} 9999`);
  }

  function pathMove(p) {
    const st = step();
    if (!st || st.kind !== 'path' || busy) return;
    const before = S.m.progress;
    const r = M.pathStep(S.m, p);
    if (r.off) {
      const now = performance.now();
      setChar('aka', { face: 'worry' });
      if (now - (S.said.off || 0) > 1300) {
        S.said.off = now;
        bubbleOn('aka', say().keepPath, { ms: 1200 });
        Sound.sfx('grass');
      }
      return;
    }
    if (S.m.progress <= before) return;
    setChar('aka', { face: 'smile' });
    S.aka.movedAt = performance.now();
    placeAka();
    const now = performance.now();
    if (now - (S.said.step || 0) > 240) {
      S.said.step = now;
      Sound.sfx('step', Math.floor(S.m.progress * 20));
    }
    if (S.m.progress > 0.5 && !S.said.half) {
      S.said.half = true;
      bubbleOn('aka', say().tekuteku, { ms: 1000 });
    }
    if (S.m.progress >= 1) pathDone();
  }

  function pathDone() {
    S.drag = null;
    busy = true;
    later(300, () => {
      busy = false;
      rest('aka', { face: 'happy', pose: 'cheer' });
      bubbleOn('aka', say().arrived, { ms: 1600 });
      stars(S.aka.x, S.aka.y - 90, 8, '✨');
      Sound.sfx('magic');
      finishStep();
    });
  }

  /* ---------- 3: えらぶ ---------- */

  function answer(which) {
    busy = true;
    S.answer = which;
    save.answer = which;
    store();
    draw();
    Sound.sfx('pick', which === 'secret' ? 3 : 1);
    bubbleOn('aka', say()[which], { ms: 1500 });
    later(1300, () => {
      setChar('wolf', { face: 'grin' });
      bubbleOn('wolf', say().guess, { ms: 1400 });
      Sound.sfx('weird');
      later(900, () => {
        busy = false;
        finishStep();
      });
    });
  }

  /* ---------- 4: より道 ---------- */

  function pickFlower(i) {
    const st = step();
    S.taken[i] = true;
    const g = svgBox.querySelector('#flower-' + i);
    if (g) g.remove();
    const f = POS.flowers[i];
    const full = M.pick(S.m);
    Sound.sfx('pick', S.m.flowers);
    addPart(Art.flower(0, 0, '#ff8787', 0.8), { from: { x: f[0], y: f[1] }, to: { x: S.aka.x + 20, y: S.aka.y - 60 }, dur: 0.6, arc: 50 });
    if (S.m.flowers === 1) bubbleOn('aka', say().pretty, { ms: 1100 });
    setChar('aka', { face: 'happy' });
    if (full && st && st.kind === 'flowers') {
      busy = true;
      later(700, () => {
        bubbleOn('aka', say().enough, { ms: 1600 });
        setChar('aka', { face: 'wow' });
        later(900, () => {
          busy = false;
          flowersDone();
        });
      });
    }
  }

  function flowersDone() {
    const st = step();
    if (!st || st.kind !== 'flowers') return;
    save.flowers = S.m.flowers;
    store();
    hurry.classList.add('is-hidden');
    bubbleOn('aka', say().hurry, { ms: 1200 });
    Sound.sfx('hurry');
    rest('aka', { face: 'smile', pose: 'run' });
    S.aka.tx = 900;
    S.aka.speed = 260;
    finishStep();
  }
  hurry.addEventListener('click', () => {
    Sound.unlock();
    hush();
    if (busy) return;
    flowersDone();
  });

  /* ---------- 5: かくす・しめる ---------- */

  function hideDone() {
    busy = true;
    S.granny.inCloset = true;
    S.granny.s = 1;
    S.granny.face = 'smile';
    S.granny.y = POS.ground;
    draw();
    Sound.sfx('put', 2);
    later(300, () => {
      bubbleOn('closet', say().thanks, { ms: 1400 });
      later(400, () => {
        busy = false;
        finishStep();
      });
    });
  }

  function shutDone() {
    if (busy) return;
    S.drag = null;
    S.closet = S.closetT = 1;
    busy = true;
    Sound.sfx('shut');
    fx(Art.bubble(C.x, C.y0 - 10, say().shut, { ms: 800 }), 800);
    // おおかみ が はいって きて、へんそう して ベッド へ
    later(700, () => {
      S.doorOpen = true;
      Sound.sfx('door');
      S.wolf = ch({ x: -60, face: 'grin', speed: 200 });
      S.wolf.tx = 230;
      draw();
      later(1700, () => {
        Sound.sfx('poof');
        stars(S.wolf.x, POS.ground - 100, 10, '💫');
        bubbleOn('wolf', say().poof, { ms: 1000 });
        later(700, () => {
          S.wolf = null;
          S.bed = 'wolf';
          S.doorOpen = false;
          draw();
          bubbleOn('bed', say().hehe, { ms: 1500 });
          later(600, () => {
            busy = false;
            finishStep();
          });
        });
      });
    });
  }

  /* ---------- 6: ノック ---------- */

  function knock() {
    const st = step();
    counter += 1;
    S.shake = 1;
    Sound.sfx('knock');
    fx(Art.bubble(POS.houseDoor.x, POS.houseDoor.y - 80, say().tonton, { ms: 700 }), 700);
    setChar('aka', { pose: 'point' });
    if (counter >= st.need) {
      busy = true;
      later(800, () => {
        Sound.sfx('weird');
        bubbleOn('door', say().comein, { ms: 1800, fill: '#e9ecef' });
        rest('aka', { face: 'think', pose: 'think' });
        later(1500, () => {
          busy = false;
          finishStep();
        });
      });
    }
  }

  /* ---------- 7: さわって たしかめる ---------- */

  const BIG = { ears: 'bigEars', eyes: 'bigEyes', hands: 'bigHands', mouth: 'bigMouth' };
  function zoomDone() {
    const st = step();
    if (!st || st.kind !== 'zoom' || busy) return;
    busy = true;
    S.tap = null;
    const part = st.part;
    S.zoomT[part] = 1.9;
    Sound.sfx('boing');
    setChar('aka', { face: 'wow' });
    bubbleOn('aka', say()[BIG[part]], { ms: 1500 });
    later(1400, () => {
      S.zoomT[part] = 1.15;
      if (part === 'mouth') {
        setBedFace('oops');
        bubbleOn('bed', say().oops, { ms: 1400 });
      }
      setChar('aka', { face: 'think' });
      busy = false;
      finishStep();
    });
  }

  /* ---------- 8: みやぶる ---------- */

  function flipDone() {
    if (busy) return;
    S.drag = null;
    S.blanket = 1;
    busy = true;
    Sound.sfx('whoosh');
    setBedFace('scared');
    const tail = svgBox.querySelector('#tail');
    if (tail) tail.classList.add('wag');
    later(400, () => {
      bubbleOn('bed', say().tail, { ms: 1300 });
      later(900, () => {
        rest('aka', { face: 'wow', pose: 'run' });
        bubbleOn('aka', say().wolf, { ms: 1500, big: true });
        Sound.sfx('flee');
        S.aka.tx = 650;
        later(800, () => {
          rest('aka', { face: 'worry', pose: 'stand' });
          busy = false;
          finishStep();
        });
      });
    });
  }

  /* ---------- 9: おおごえ ---------- */

  function shout() {
    const st = step();
    const full = M.shoutTap(S.m, 1);
    Sound.sfx('call', S.m.shout);
    const now = performance.now();
    if (now - (S.said.help || 0) > 1800) {
      S.said.help = now;
      bubbleOn('aka', say().help, { ms: 900 });
    }
    if (S.m.shout > 0.4) setKikoriWin({ face: 'wow' });
    if (!full || !st || st.kind !== 'shout') return;
    busy = true;
    later(250, () => {
      setKikoriWin({ pose: 'shout' });
      Sound.sfx('shout');
      bubbleOn('window', say().kora, { ms: 1800, big: true });
      setChar('wolf', { face: 'scared', pose: 'stand' });
      stars(S.wolf.x, S.wolf.y - 200, 6, '💦');
      later(800, () => {
        S.doorOpen = true;
        Sound.sfx('flee');
        rest('wolf', { pose: 'run' });
        S.wolf.speed = 620;
        S.wolf.tx = -240;
        later(1300, () => {
          S.doorOpen = false;
          fx(Art.bubble(150, 110, say().sorry, { ms: 2200, fill: '#f1f3f5' }), 2200);
          Sound.sfx('far');
          rest('aka', { face: 'happy', pose: 'cheer' });
          later(500, () => {
            busy = false;
            finishStep();
          });
        });
      });
    });
  }

  /* ---------- 10: おちゃかい ---------- */

  function openCloset() {
    busy = true;
    S.closetT = 0;
    Sound.sfx('creak');
    fx(Art.bubble(C.x, C.y0 - 10, say().open, { ms: 800 }), 800);
    later(700, () => {
      S.granny.inCloset = false;
      S.granny.x = C.x;
      S.granny.tx = 640;
      S.granny.y = POS.ground;
      S.granny.speed = 120;
      draw();
      later(1000, () => {
        S.granny.flip = true;
        bubbleOn('granny', say().thanks, { ms: 1500 });
        rest('aka', { face: 'happy', pose: 'cheer' });
        stars(500, 260, 8, '💛', 'heart');
        Sound.sfx('magic');
        later(600, () => {
          rest('aka', { pose: 'stand' });
          busy = false;
          finishStep();
        });
      });
    });
  }

  function placeSlice(i) {
    const st = step();
    S.plates[i] = true;
    S.slices += 1;
    counter += 1;
    draw();
    Sound.sfx('plate', counter);
    stars(POS.plates[i].x, POS.plates[i].y - 20, 4, '✨');
    if (counter >= st.need) {
      busy = true;
      later(500, () => {
        ['aka', 'granny', 'kikori'].forEach((n) => rest(n, { face: 'happy', pose: n === 'granny' ? 'stand' : 'cheer' }));
        bubbleOn('aka', say().itadakimasu, { ms: 1800 });
        later(700, () => bubbleOn('kikori', say().yum, { ms: 1500 }));
        Sound.sfx('fanfare');
        busy = false;
        finishStep();
      });
    }
  }

  /* ---------- キーボード（パソコン よう） ---------- */

  function autoAct() {
    const st = step();
    if (!st || busy) return;
    const k = st.kind;
    if (k === 'basket') {
      const t = target();
      if (t) putInBasket(t.item);
    } else if (k === 'path') {
      M.pathKey(S.m, 0.05);
      S.aka.movedAt = performance.now();
      placeAka();
      Sound.sfx('step', Math.floor(S.m.progress * 20));
      if (S.m.progress >= 1) pathDone();
    } else if (k === 'choose') answer('secret');
    else if (k === 'flowers') {
      const i = POS.flowers.findIndex((f, n) => !S.taken[n]);
      if (i >= 0) pickFlower(i);
    } else if (k === 'hide') hideDone();
    else if (k === 'shut') shutDone();
    else if (k === 'knock') knock();
    else if (k === 'zoom') zoomDone();
    else if (k === 'flip') flipDone();
    else if (k === 'shout') shout();
    else if (k === 'closet') openCloset();
    else if (k === 'cake') {
      const i = S.plates.indexOf(false);
      if (i >= 0) placeSlice(i);
    }
  }

  document.addEventListener('keydown', (e) => {
    if (!$('screen-book').classList.contains('is-on')) return;
    const a = document.activeElement;
    if (a && a !== document.body && a !== artEl && a.closest('button, a')) return;
    const st = step();
    if (!st || busy) return;
    const k = st.kind;
    let go = false;
    if (k === 'path' && ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'].indexOf(e.key) >= 0) go = true;
    else if (k === 'choose' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      Sound.unlock();
      touched();
      answer(e.key === 'ArrowLeft' ? 'house' : 'secret');
      return;
    } else if (k === 'shout' && e.key === ' ') go = true;
    else if (e.key === 'Enter') go = true;
    if (!go) return;
    e.preventDefault();
    Sound.unlock();
    touched();
    autoAct();
  });

  /* ============================ ボタン ============================ */

  $('btn-prev').addEventListener('click', () => {
    Sound.sfx('tap');
    if (isFirst()) return;
    openPage(free ? FREE_IDX[freePos() - 1] : pageNo - 1);
  });
  $('btn-next').addEventListener('click', () => {
    const btn = $('btn-next');
    if (btn.classList.contains('locked')) {
      btn.classList.remove('nudge');
      void btn.offsetWidth;
      btn.classList.add('nudge');
      showStepHint();
      return;
    }
    Sound.sfx('tap');
    if (isLast()) {
      showEnd();
      return;
    }
    openPage(free ? FREE_IDX[freePos() + 1] : pageNo + 1);
  });

  /* ---------- 🇬🇧 えいご ⇄ 🇯🇵 にほんご（いつでも きりかえ） ---------- */

  function syncLang() {
    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      const en = save.lang === 'en';
      btn.innerHTML = en ? '🇯🇵 <span>にほんご</span>' : '🇬🇧 <span>English</span>';
      btn.setAttribute('aria-label', en ? 'にほんご で よむ' : 'えいご で よむ');
      btn.classList.toggle('is-en', en);
    });
    document.documentElement.classList.toggle('lang-en', save.lang === 'en');
  }
  document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      Sound.unlock();
      Sound.sfx('tap');
      save.lang = save.lang === 'en' ? 'ja' : 'en';
      store();
      syncLang();
      if ($('screen-end').classList.contains('is-on')) renderEnd();
      if (!$('screen-book').classList.contains('is-on')) return;
      // いま でている ぶん を ぜんぶ かきかえて、あたらしい ことば で よみなおす
      hush();
      const els = Array.from(words.querySelectorAll('.line'));
      els.forEach(renderLine);
      renderHint();
      setMeters(meterKinds);
      if (!hurry.classList.contains('is-hidden')) hurry.innerHTML = label().hurry;
      if (S && S.choices && !S.drag) draw();
      if (free) $('pageNo').textContent = `${label().free} ${pageNo + 1}`;
      read(els);
    });
  });

  $('btn-reread').addEventListener('click', () => {
    Sound.unlock();
    if (!Sound.isVoiceOn()) {
      save.voice = true;
      Sound.setVoice(true);
      store();
      syncToggles();
    }
    read(Array.from(words.querySelectorAll('.line')));
  });
  $('btn-home').addEventListener('click', () => {
    hush();
    Mori.detach();
    Sound.birds(false);
    showTitle();
  });

  function start(n, isFree) {
    Sound.unlock();
    if (save.sound) Sound.startBgm();
    free = !!isFree;
    show('book');
    openPage(n);
  }
  $('btn-start').addEventListener('click', () => start(0));
  $('coverArt').addEventListener('click', () => start(0));
  $('btn-continue').addEventListener('click', () => start(save.page || 0));

  /* ============================ ひょうし・おしまい ============================ */

  function showTitle() {
    $('coverArt').innerHTML = Art.scene({
      place: 'cover',
      aka: { x: 330, y: 452, s: 1.25, face: 'happy', pose: 'walk1', basket: true },
      wolf: { x: 640, y: 452, s: 0.9, flip: true, face: 'grin' },
    });
    const cont = save.page > 0 && save.done.indexOf(PAGES[PAGES.length - 1].id) < 0;
    $('btn-continue').classList.toggle('is-hidden', !cont);
    $('btn-continue').innerHTML = `🔖 つづき から <small>（${save.page + 1}ページ）</small>`;
    show('title');
  }

  function renderEnd() {
    const E = Story.END[save.lang];
    const end = $('screen-end');
    end.lang = save.lang;
    $('endBig').textContent = E.big;
    $('endSub').textContent = E.sub;
    $('promiseTitle').textContent = E.promiseTitle;
    document.querySelectorAll('.promise').forEach((b, i) => {
      const on = !!save.promise[i];
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      b.innerHTML = `<span class="box">${on ? '✅' : '⬜'}</span> ${Story.ruby(E.promise[i])}`;
    });
    $('endGuess').innerHTML = save.answer ? Story.ruby(E[save.answer] || '') : '';
    $('endFlowers').innerHTML = `🌼 ${Story.ruby(E.flowers(save.flowers || 0))}`;
    return E;
  }
  document.querySelectorAll('.promise').forEach((b, i) => {
    b.addEventListener('click', () => {
      Sound.unlock();
      save.promise[i] = !save.promise[i];
      store();
      Sound.sfx(save.promise[i] ? 'put' : 'tap', 3);
      renderEnd();
      if (save.promise[0] && save.promise[1]) Sound.sfx('fanfare');
    });
  });

  function showEnd() {
    hush();
    Mori.detach();
    Sound.birds(false);
    $('endArt').innerHTML = Art.scene({
      place: 'room', closet: 0, table: true, plates: [true, true, true], slices: 3,
      aka: { x: 190, y: 452, face: 'happy', pose: 'cheer' },
      granny: { x: 620, y: 452, face: 'smile', flip: true },
      kikori: { x: 80, y: 452, face: 'smile', s: 0.95 },
    });
    const E = renderEnd();
    if (!free) {
      save.finished = (save.finished || 0) + 1;
      save.page = 0;
      store();
    }
    Sound.sfx('fanfare');
    show('end');
    Sound.speak(`${E.big}。 ${save.lang === 'en' ? Story.plainEn(E.sub) : Story.plain(E.sub)}`, null, { lang: save.lang });
  }
  $('btn-end-try').addEventListener('click', () => start(FREE_IDX[0], true));
  $('btn-end-again').addEventListener('click', () => start(0));
  $('btn-end-home').addEventListener('click', showTitle);

  /* ============================ レイアウト ============================ */

  // え は いつも 8:5。たてならび の とき は ことば に すくなくとも textMin を のこす
  function fit() {
    const book = document.querySelector('.book');
    const leaf = $('leafArt');
    const row = getComputedStyle(book).flexDirection === 'row';
    let w;
    let h;
    if (row) {
      leaf.style.height = '';
      w = leaf.clientWidth;
      h = leaf.clientHeight;
    } else {
      const bh = book.clientHeight - 8;
      const textMin = Math.max(220, Math.min(340, bh * 0.36));
      w = book.clientWidth - 16;
      h = bh - textMin - 8;
    }
    if (!w || !h) return;
    const aw = Math.max(200, Math.min(w, h * 1.6));
    artEl.style.width = aw + 'px';
    artEl.style.height = aw / 1.6 + 'px';
    if (!row) leaf.style.height = aw / 1.6 + 'px';
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 200));

  // たしかめ（tools/akazukin/check.js）よう に、いま の ようす を よめる ように する
  window.AkazukinDebug = {
    state: () => (S ? {
      progress: S.m.progress, off: S.m.off, offs: S.m.offs, sun: S.m.sun, flowers: S.m.flowers, shout: S.m.shout, taps: S.m.taps,
      inBasket: S.inBasket.slice(), answer: S.answer, closet: S.closet, blanket: S.blanket, slices: S.slices,
      zoom: Object.assign({}, S.zoom), zoomT: Object.assign({}, S.zoomT), granny: S.granny && { x: S.granny.x, inCloset: !!S.granny.inCloset },
      akaX: S.aka && S.aka.x,
    } : null),
    where: () => ({ page: pageNo, step: stepNo, free, done: pageDone, busy }),
    target,
  };

  syncToggles();
  syncLang();
  showTitle();
})();
