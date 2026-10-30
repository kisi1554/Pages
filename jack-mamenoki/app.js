'use strict';

/*
 * えほん の すすめかた
 *  - ひょうし → ほん（9ページ）→ おしまい
 *  - ページ の しかけ（steps）を じゅんに こなす と「つぎ ▶」が ひらく
 *  - え は Art.scene で かいて、うごき は まいフレーム transform を かきかえる
 *  - のばす・そーっと は mame.js（Mame.poll で ゆび の うごき を うけとり、Mame.model で けいさん）
 *  - のぼる・おりる は ひだり／みぎ の タップ（Mame.model.climbTap で こうご か しらべる）
 *  - おしまい の「もういちど のぼる」で ページ 3〜7 を じゆう に あそべる
 *  - しおり・せってい は localStorage（よみかき は try/catch）
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'jack-mamenoki-v1';
  const PAGES = Story.PAGES;
  const POS = Art.POS;
  const M = Mame.model;
  const FREE_FIRST = PAGES.findIndex((p) => p.id === Story.FREE[0]);
  const FREE_LAST = PAGES.findIndex((p) => p.id === Story.FREE[Story.FREE.length - 1]);
  const SNEAK_GOAL = (POS.sneak.to - POS.sneak.from) / 800; // そーっと すすむ きょり（え の はば が 1）

  /* ============================ ほぞん ============================ */

  const save = { page: 0, done: [], sound: true, voice: true, lang: 'ja', finished: 0, climbs: 0, eggs: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(save, JSON.parse(raw));
  } catch (e) {
    /* よめなくても あそべる */
  }
  if (!Array.isArray(save.done)) save.done = [];
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

  function makeScene(page) {
    const sc = page.scene;
    const climb = sc.place === 'climb';
    const s = {
      place: sc.place, time: sc.time || 'day', dir: sc.dir || 'up',
      jack: sc.jack ? Object.assign({ x: POS.climbJack.x, face: 'smile', pose: climb ? 'climbL' : 'stand' }, sc.jack) : null,
      mother: sc.mother ? Object.assign({}, sc.mother) : null,
      oldman: sc.oldman ? Object.assign({}, sc.oldman) : null,
      cow: sc.cow ? Object.assign({ tx: sc.cow.x, flip: false }, sc.cow) : null,
      hen: sc.hen ? Object.assign({}, sc.hen) : null,
      holes: sc.holes || 0, planted: [false, false, false], can: !!sc.can,
      stalk: sc.stalk == null ? null : sc.stalk,
      giant: sc.giant || null, cage: sc.cage ? Object.assign({}, sc.cage) : null,
      gate: !!sc.gate, gateOpen: false, giantTop: !!sc.giantTop, eggs: 0,
      m: M.create(),
      dy: 0, ty: 0, fall: null, wobble: 0, canTilt: 0,
      parts: [], said: {}, z: 0,
    };
    if (s.jack && !climb) s.jack.tx = s.jack.x;
    if (s.stalk != null) s.m.height = s.stalk;
    if (climb && s.dir === 'down') {
      s.dy = POS.ride;
      s.ty = POS.ride;
    }
    if (sc.near) s.jack.x = s.jack.tx = POS.sneak.to;
    return s;
  }

  function sceneData() {
    return {
      place: S.place, time: S.time, dir: S.dir,
      jack: S.jack, mother: S.mother, oldman: S.oldman, cow: S.cow, hen: S.hen, eggs: S.eggs,
      holes: S.holes, planted: S.planted, can: S.can,
      stalk: S.stalk == null ? null : S.m.height,
      giant: S.giant, cage: S.cage, gate: S.gate, giantTop: S.giantTop,
    };
  }

  function draw() {
    svgBox.innerHTML = Art.scene(sceneData());
    if (S.gateOpen) {
      const d = svgBox.querySelector('#gate .door');
      if (d) d.style.transform = 'scaleX(0.15)';
    }
  }

  function setJack(patch) {
    if (!S.jack) return;
    let changed = false;
    Object.keys(patch).forEach((k) => {
      if (S.jack[k] !== patch[k]) {
        S.jack[k] = patch[k];
        changed = true;
      }
    });
    if (!changed) return;
    const g = svgBox.querySelector('#jack .jack-in');
    if (g) g.innerHTML = Art.jackInner(S.jack);
  }
  function setGiant(mood) {
    if (!S.giant || S.giant === mood) return;
    S.giant = mood;
    const g = svgBox.querySelector('#giant .giant-in');
    if (g) g.innerHTML = Art.giantInner(mood);
  }
  function setStalk() {
    const g = svgBox.querySelector('#stalk .stalk-in');
    if (g) g.innerHTML = Art.stalkPath(POS.stalk.x, POS.stalk.y, S.m.height);
  }

  /* ============================ まいフレーム ============================ */

  let lastT = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    if (!S || !$('screen-book').classList.contains('is-on')) return;
    const k = 1 - Math.pow(0.004, dt); // なめらかさ
    const st = step();
    const inp = Mame.poll();

    if (S.mode === 'grow') {
      const before = S.m.height;
      M.growStep(S.m, inp.ups);
      onGrow(S.m.height - before, inp.fingers);
    } else if (S.mode === 'sneak') {
      let dx = 0;
      inp.dxs.forEach((d) => { dx += d; });
      onSneak(dx, dt);
    }

    // ジャック（あるく・そーっと）
    if (S.jack && S.place !== 'climb') {
      const j = S.jack;
      const dx = j.tx - j.x;
      if (Math.abs(dx) > 0.5) j.x += S.mode === 'sneak' ? dx : Math.sign(dx) * Math.min(Math.abs(dx), 200 * dt);
      const g = svgBox.querySelector('#jack');
      if (g) g.setAttribute('transform', `translate(${j.x.toFixed(1)} ${POS.ground})`);
    }
    // うし（あるく）
    if (S.cow) {
      const c = S.cow;
      const dx = c.tx - c.x;
      const walking = Math.abs(dx) > 0.5;
      if (walking) c.x += Math.sign(dx) * Math.min(Math.abs(dx), 140 * dt);
      const g = svgBox.querySelector('#cow');
      const bob = walking ? Math.abs(Math.sin(t / 110)) * -4 : 0;
      if (g) g.setAttribute('transform', `translate(${c.x.toFixed(1)} ${POS.ground + bob})${c.flip ? ' scale(-1 1)' : ''}`);
    }
    // のぼる・おりる の けしき
    if (S.place === 'climb') {
      S.dy += (S.ty - S.dy) * k;
      const w = svgBox.querySelector('#world');
      if (w) w.setAttribute('transform', `translate(0 ${S.dy.toFixed(1)})`);
    }
    // じょうろ
    if (S.can) {
      S.canTilt *= Math.pow(0.02, dt);
      const g = svgBox.querySelector('#can');
      if (g) g.setAttribute('transform', `translate(${POS.can.x} ${POS.can.y}) rotate(${(-S.canTilt).toFixed(1)})`);
    }
    // まめのき（ゆれる・たおれる）
    if (S.stalk != null) {
      S.wobble *= Math.pow(0.05, dt);
      let a = Math.sin(t / 60) * S.wobble * 4;
      if (S.fall) {
        S.fall.t += dt;
        const q = Math.min(1, S.fall.t / 1.3);
        a = 84 * q * q;
      }
      const g = svgBox.querySelector('#stalk');
      if (g) g.setAttribute('transform', `rotate(${a.toFixed(2)} ${POS.stalk.x} ${POS.stalk.y})`);
    }
    // きょじん の いびき（Zzz）
    if (S.giant === 'sleep') {
      S.z += dt;
      if (S.z > 1.6) {
        S.z = 0;
        fx(`<text class="zz" x="${POS.giant.x + 90}" y="${POS.giant.y - 70}" font-size="34" font-weight="800" fill="#4c6ef5">Z</text>`, 1800);
        if (!S.said.snored || t - S.said.snored > 4800) {
          S.said.snored = t;
          Sound.sfx('snore');
        }
      }
      const g = svgBox.querySelector('#giant');
      if (g) g.setAttribute('transform', `translate(${POS.giant.x} ${(POS.giant.y + Math.sin(t / 500) * 3).toFixed(1)})`);
    }
    particles(dt);
    updateMeters();
    if (st && (st.kind === 'climb' || st.kind === 'down')) markSide();
  }
  requestAnimationFrame(frame);

  /* ============================ とぶ もの ============================ */

  const NS = 'http://www.w3.org/2000/svg';
  function addPart(html, p) {
    const layer = svgBox.querySelector('#parts');
    if (!layer || S.parts.length > 60) return;
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = html;
    layer.appendChild(g);
    S.parts.push(Object.assign({ el: g, age: 0, vx: 0, vy: 0, g: 0, life: 2 }, p));
  }

  function particles(dt) {
    for (let i = S.parts.length - 1; i >= 0; i -= 1) {
      const p = S.parts[i];
      p.age += dt;
      if (p.to) {
        // from → to へ ふわっ と とぶ
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
    if (who === 'jack' && S.jack) {
      x = S.place === 'climb' ? POS.climbJack.x + 60 : S.jack.tx;
      y = (S.place === 'climb' ? POS.climbJack.y : POS.ground) - 170;
    } else if (who === 'mother' && S.mother) {
      x = S.mother.x;
      y = POS.ground - 190;
    } else if (who === 'oldman' && S.oldman) {
      x = S.oldman.x;
      y = POS.ground - 190;
    } else if (who === 'cow' && S.cow) {
      x = S.cow.tx + (S.cow.flip ? -60 : 60);
      y = POS.ground - 130;
    } else if (who === 'hen') {
      x = S.hen ? S.hen.x + 10 : POS.cage.x;
      y = S.hen ? POS.ground - 70 : POS.cage.y - 110;
    } else if (who === 'giant') {
      x = POS.giant.x + 40;
      y = POS.giant.y - 110;
    } else if (who === 'giantTop') {
      x = POS.giantTop.x - 60;
      y = POS.giantTop.y + 110;
    } else if (who === 'peek') {
      x = 300;
      y = 120;
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
  const ring2 = $('ring2');
  const hand = $('hand');
  const meters = $('meters');
  const badge = $('badge');
  const sideL = $('sideL');
  const sideR = $('sideR');

  function pct(x, y) {
    return { left: (x / 800) * 100 + '%', top: (y / 500) * 100 + '%' };
  }
  function showRing(x, y, second) {
    const r = second ? ring2 : ring;
    Object.assign(r.style, pct(x, y));
    r.classList.remove('is-hidden');
  }
  function showHand(x, y, mode, dx) {
    hand.className = 'hand' + (mode ? ' ' + mode : '');
    hand.textContent = mode === 'up' ? '☝️' : '👉';
    Object.assign(hand.style, pct(x, y));
    if (dx != null) hand.style.setProperty('--dx', dx + 'px');
  }
  function hideHints() {
    ring.classList.add('is-hidden');
    ring2.classList.add('is-hidden');
    hand.classList.add('is-hidden');
  }
  function showSides(on) {
    sideL.classList.toggle('is-hidden', !on);
    sideR.classList.toggle('is-hidden', !on);
  }
  function markSide() {
    const next = S.m.last === 'L' ? 'R' : S.m.last === 'R' ? 'L' : null;
    sideL.classList.toggle('next', next !== 'R');
    sideR.classList.toggle('next', next !== 'L');
  }

  let meterKinds = [];
  const ICON = { height: '🌱', climb: '🪜', down: '🪜', quiet: '🤫' };
  function setMeters(kinds) {
    meterKinds = kinds;
    meters.innerHTML = kinds.map((m) => `<div class="meter ${m}"><span>${ICON[m]} ${label()[m]}</span><span class="bar"><i></i></span></div>`).join('');
  }
  function updateMeters() {
    if (!meterKinds.length) return;
    const st = step();
    meters.querySelectorAll('.meter').forEach((el, i) => {
      const m = meterKinds[i];
      let v = 0;
      if (m === 'height') v = S.m.height;
      else if (m === 'climb' || m === 'down') v = st ? S.m.steps / st.need : 1;
      else if (m === 'quiet') v = S.m.noise;
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

  // 1ぎょう は { ja, en }。いま の ことば（save.lang）で かく
  function renderLine(p) {
    const s = p._line[save.lang];
    p.lang = save.lang;
    p.classList.toggle('serif', /^[「“]/.test(s));
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

  // 1ぎょう ずつ よみ、よんで いる ぎょう を ひからせる
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
      Sound.speak(en ? Story.plainEn(raw) : Story.plain(raw), next, { lang: save.lang });
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
  let free = false; // 「もういちど のぼる」（ページ 3〜7 を じゆう に）
  let pageTimers = [];
  function later(ms, f) {
    pageTimers.push(setTimeout(f, ms));
  }

  function openPage(n) {
    hush();
    Mame.detach();
    pageTimers.forEach(clearTimeout);
    pageTimers = [];
    clearTimeout(idleTimer);
    const lo = free ? FREE_FIRST : 0;
    const hi = free ? FREE_LAST : PAGES.length - 1;
    pageNo = Math.max(lo, Math.min(hi, n));
    if (!free) {
      save.page = pageNo;
      store();
    }
    const page = PAGES[pageNo];
    S = makeScene(page);
    draw();
    words.innerHTML = '';
    hideHints();
    showSides(false);
    setMeters([]);
    badge.classList.add('is-hidden');
    $('pageNo').textContent = free ? `${label().free} ${pageNo + 1}` : `${pageNo + 1} / ${PAGES.length}`;
    $('btn-prev').disabled = pageNo === lo;
    Sound.birds(save.sound && page.id === 'nobiru');
    stepNo = 0;
    pageDone = false;
    busy = false;
    words.scrollTop = 0;
    const els = addLines(page.text);
    updateNext();
    startStep();
    read(els);
    if (page.id === 'ushi') later(700, () => { bubbleOn('cow', say().moo, { ms: 1200 }); Sound.sfx('moo'); });
    if (page.id === 'nigeru') later(500, () => { bubbleOn('peek', say().fee, { ms: 2200 }); Sound.sfx('fee'); });
    if (page.id === 'shiro') later(900, () => bubbleOn('giant', say().zzz, { ms: 1400 }));
  }

  function updateNext() {
    const open = free || pageDone || save.done.indexOf(PAGES[pageNo].id) >= 0;
    const btn = $('btn-next');
    btn.classList.toggle('locked', !open);
    btn.classList.toggle('glow', pageDone);
    const last = free ? pageNo === FREE_LAST : pageNo === PAGES.length - 1;
    btn.innerHTML = open ? (last ? 'おしまい ▶' : 'つぎ ▶') : '🔒 つぎ';
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
    if (st.kind === 'grow') {
      S.mode = 'grow';
      setMeters(['height']);
      Mame.attach(artEl);
    } else if (st.kind === 'sneak') {
      S.mode = 'sneak';
      setMeters(['quiet']);
      Mame.attach(artEl);
    } else if (st.kind === 'climb' || st.kind === 'down') {
      S.mode = st.kind;
      S.m.steps = 0;
      S.m.last = null;
      setMeters([st.kind]);
      showSides(true);
    }
  }

  // いま の しかけ で さわる ところ（え の ざひょう）。たしかめ（check.js）も つかう
  function target() {
    const st = step();
    if (!st || !S) return null;
    if (st.kind === 'trade') return { x: S.oldman.x, y: POS.ground - 90 };
    if (st.kind === 'plant') {
      const i = S.planted.indexOf(false);
      return i < 0 ? null : { x: POS.holes[i].x, y: POS.holes[i].y };
    }
    if (st.kind === 'water') return { x: POS.can.x - 10, y: POS.can.y - 20 };
    if (st.kind === 'grow') return { x: POS.stalk.x, y: 400 };
    if (st.kind === 'sneak') return { x: S.jack.x, y: POS.ground - 80 };
    if (st.kind === 'cage') return { x: POS.lock.x + 46, y: POS.lock.y - 46 };
    if (st.kind === 'chop') return { x: POS.stalk.x, y: POS.stalk.y - 40 };
    if (st.kind === 'egg') return { x: S.hen.x, y: POS.ground - 30 };
    if (st.kind === 'cow') return { x: POS.gate.x, y: POS.gate.y - 50 };
    return null;
  }

  function showStepHint() {
    const st = step();
    if (!st || busy) return;
    const p = target();
    if (st.kind === 'grow') showHand(POS.stalk.x + 40, 380, 'up');
    else if (st.kind === 'sneak') {
      const w = artEl.getBoundingClientRect().width;
      showHand(S.jack.x + 30, POS.ground - 60, 'drag', Math.round((160 / 800) * w));
    } else if (p) showRing(p.x, p.y);
  }

  // しばらく さわらないと、もう いちど ヒント
  function poke() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showStepHint, 3500);
  }

  function finishStep() {
    const st = step();
    Mame.detach();
    S.mode = null;
    hideHints();
    showSides(false);
    setMeters([]);
    hintEl.classList.add('is-hidden');
    const els = addLines(st.then, 'new');
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
    // つぎ の しかけ は すぐ はじめられる（さわると よみあげ は とまる）
    if (more) startStep();
  }

  function after(ms, f) {
    busy = true;
    later(ms, () => {
      busy = false;
      f();
    });
  }

  /* ---------- のばす（grow） ---------- */

  function onGrow(delta, fingers) {
    if (delta <= 0) return;
    hush();
    hideHints();
    poke();
    twoFingers(fingers);
    setStalk();
    const now = performance.now();
    if (now - (S.said.grow || 0) > 160) {
      S.said.grow = now;
      Sound.sfx('grow', S.m.height);
    }
    if (S.m.height > 0.35 && !S.said.wow) {
      S.said.wow = true;
      bubbleOn('jack', say().wow, { ms: 1300 });
    }
    const st = step();
    if (!st || st.kind !== 'grow' || busy || S.m.height < st.need - 1e-6) return;
    busy = true;
    Mame.detach();
    later(300, () => {
      busy = false;
      bubbleOn('mother', say().nyoki, { ms: 1800 });
      stars(POS.stalk.x, 120, 8, '✨');
      Sound.sfx('magic');
      finishStep();
    });
  }

  /* ---------- そーっと（sneak） ---------- */

  function onSneak(dx, dt) {
    const st = step();
    if (!st || st.kind !== 'sneak' || busy) {
      if (dx > 0) hush();
      return;
    }
    if (dx > 0) {
      hush();
      hideHints();
      poke();
    }
    const ev = M.sneakStep(S.m, dx, dt);
    S.jack.tx = POS.sneak.from + S.m.x * 800;
    if (dx > 0) setJack({ pose: 'tiptoe', face: 'shh' });
    if (ev === 'wake') {
      // むにゃむにゃ… ジャック は びっくり して すこし もどる
      setGiant('stir');
      setJack({ face: 'wow', pose: 'stand' });
      fx(Art.bubble(POS.giant.x + 170, POS.giant.y - 40, say().munya, { ms: 1400 }), 1400);
      bubbleOn('jack', say().shh, { ms: 1400 });
      Sound.sfx('stir');
      busy = true;
      later(1300, () => {
        busy = false;
        setGiant('sleep');
        setJack({ face: 'shh' });
      });
      return;
    }
    if (S.m.x < SNEAK_GOAL - 1e-6) return;
    busy = true;
    Mame.detach();
    setJack({ pose: 'stand', face: 'smile' });
    later(400, () => {
      busy = false;
      finishStep();
    });
  }

  /* ---------- のぼる・おりる（climb / down） ---------- */

  const downNow = new Set();
  function climbTap(side) {
    const st = step();
    if (!st || (st.kind !== 'climb' && st.kind !== 'down') || busy) return;
    hush();
    hideHints();
    poke();
    if (downNow.size >= 2) twoFingers(downNow.size);
    if (!M.climbTap(S.m, side)) {
      bubbleOn('jack', say().slip, { ms: 900 });
      Sound.sfx('slip');
      return;
    }
    const q = Math.min(1, S.m.steps / st.need);
    S.ty = st.kind === 'climb' ? q * POS.ride : (1 - q) * POS.ride;
    setJack({ pose: side === 'L' ? 'climbL' : 'climbR' });
    Sound.sfx(st.kind === 'climb' ? 'step' : 'stepDown', S.m.steps);
    if (S.m.steps % 4 === 0) bubbleOn('jack', st.kind === 'climb' ? say().yoisho : say().hurry, { ms: 800 });
    if (S.m.steps < st.need) return;
    busy = true;
    showSides(false);
    later(900, () => {
      busy = false;
      if (st.kind === 'climb') {
        bubbleOn('jack', say().clouds, { ms: 1800 });
        save.climbs = (save.climbs || 0) + 1;
        store();
      } else {
        setJack({ face: 'happy' });
      }
      stars(POS.climbJack.x, POS.climbJack.y - 100, 8, '✨');
      finishStep();
    });
  }

  /* ---------- タップ の しかけ ---------- */

  function svgPoint(e) {
    const r = artEl.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 800, y: ((e.clientY - r.top) / r.height) * 500 };
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  artEl.addEventListener('pointerdown', (e) => {
    Sound.unlock();
    const st = step();
    if (!st) return;
    const p = svgPoint(e);
    if (st.kind === 'climb' || st.kind === 'down') {
      e.preventDefault();
      downNow.add(e.pointerId);
      climbTap(p.x < 400 ? 'L' : 'R');
      return;
    }
    if (busy || st.kind === 'grow' || st.kind === 'sneak') return;
    tapStep(st, p);
  });
  const endPtr = (e) => downNow.delete(e.pointerId);
  window.addEventListener('pointerup', endPtr);
  window.addEventListener('pointercancel', endPtr);

  function tapStep(st, p) {
    hush();
    hideHints();
    poke();
    if (st.kind === 'trade') {
      if (Math.abs(p.x - S.oldman.x) > 80 || p.y < POS.ground - 200) return;
      trade();
    } else if (st.kind === 'plant') {
      const i = POS.holes.findIndex((h, n) => !S.planted[n] && dist(p, h) < 56);
      if (i < 0) return;
      S.planted[i] = true;
      counter += 1;
      Sound.sfx('plant', counter);
      const h = POS.holes[i];
      addPart(Art.bean(0, 0, 1.2), { from: { x: S.jack.x + 40, y: POS.ground - 100 }, to: { x: h.x, y: h.y - 6 }, dur: 0.5, arc: 50,
        done: () => {
          const g = svgBox.querySelector('#hole-' + i + ' ellipse');
          if (g) g.setAttribute('fill', '#a0522d');
        } });
      fx(Art.bubble(h.x, h.y - 40, say().pon, { ms: 800 }), 800);
      if (counter >= st.need) {
        setJack({ beans: false, pose: 'cheer', face: 'happy' });
        after(700, () => {
          setJack({ pose: 'stand', face: 'smile' });
          finishStep();
        });
      }
    } else if (st.kind === 'water') {
      if (dist(p, { x: POS.can.x - 20, y: POS.can.y - 20 }) > 80) return;
      counter += 1;
      S.canTilt = 34;
      Sound.sfx('water');
      for (let i = 0; i < 6; i += 1) {
        addPart('<path d="M0 0 q4 7 0 10 q-4 -3 0 -10 Z" fill="#74c0fc"/>', { x: POS.can.x - 70 - Math.random() * 20, y: POS.can.y - 50, vx: -60 - Math.random() * 90, vy: 30, g: 420, life: 0.7 });
      }
      fx(Art.bubble(POS.can.x - 60, POS.can.y - 70, say().jyaa, { ms: 700 }), 700);
      if (counter >= st.need) after(800, nightFalls);
    } else if (st.kind === 'cage') {
      if (Math.abs(p.x - POS.cage.x) > 90 || p.y < POS.cage.y - 170 || p.y > POS.cage.y + 30) return;
      openCage();
    } else if (st.kind === 'chop') {
      if (Math.abs(p.x - POS.stalk.x) > 70 || p.y < 300) return;
      counter += 1;
      S.wobble = 1;
      setJack({ pose: counter % 2 ? 'axe' : 'stand' });
      later(160, () => setJack({ pose: 'axe' }));
      Sound.sfx('chop', counter);
      fx(Art.bubble(POS.stalk.x - 40, POS.stalk.y - 80, say().kon, { ms: 700 }), 700);
      stars(POS.stalk.x, POS.stalk.y - 40, 4, '💥');
      if (counter >= st.need) fallStalk();
    } else if (st.kind === 'egg') {
      if (!S.hen || Math.abs(p.x - S.hen.x) > 70 || p.y < POS.ground - 110) return;
      counter += 1;
      S.eggs = counter;
      save.eggs = (save.eggs || 0) + 1;
      store();
      Sound.sfx('cluck');
      later(250, () => Sound.sfx('egg', counter));
      addPart(Art.egg(0, 0, 0.9), { from: { x: S.hen.x, y: POS.ground - 30 }, to: { x: S.hen.x + 40 + (counter - 1) * 22, y: POS.ground - 14 }, dur: 0.5, arc: 40,
        done: () => draw() });
      bubbleOn('hen', counter === 1 ? say().kokko : say().golden, { ms: 1000 });
      if (counter >= st.need) after(900, finishStep);
    } else if (st.kind === 'cow') {
      if (Math.abs(p.x - POS.gate.x) > 80 || p.y < POS.ground - 140) return;
      cowHome();
    }
  }

  // おじいさん と とりかえっこ: まめ が ジャック の て へ、ミルキー は おじいさん の ほう へ
  function trade() {
    busy = true;
    const om = S.oldman;
    const beans = svgBox.querySelector('#oldman .beans');
    if (beans) beans.style.display = 'none';
    Sound.sfx('magic');
    bubbleOn('oldman', say().magic, { ms: 1600 });
    addPart(`${Art.bean(-6, 0)}${Art.bean(6, -2)}${Art.bean(0, -9)}`, {
      from: { x: om.x - 50, y: POS.ground - 92 }, to: { x: S.jack.x + 42, y: POS.ground - 104 }, dur: 0.9, arc: 80,
      done: () => {
        setJack({ beans: true, face: 'wow', pose: 'beans' });
        stars(S.jack.x + 42, POS.ground - 104, 6, '✨');
        bubbleOn('jack', say().trade, { ms: 1400 });
        // ミルキー は おじいさん と いっしょ に
        S.cow.tx = om.x + 110;
        Sound.sfx('moo');
        later(1600, () => {
          setJack({ face: 'smile' });
          busy = false;
          finishStep();
        });
      },
    });
  }

  // みず を やったら よる に なって、はたけ が きらきら
  function nightFalls() {
    S.time = 'night';
    draw();
    S.planted.forEach((on, i) => {
      if (!on) return;
      const h = POS.holes[i];
      stars(h.x, h.y - 10, 5, '✨');
    });
    Sound.sfx('magic');
    fx(Art.bubble(520, 380, say().sparkle, { ms: 1600 }), 1600);
    finishStep();
  }

  // とりかご を あける → にわとり が ジャック の ところ へ
  function openCage() {
    busy = true;
    S.cage.open = true;
    const g = svgBox.querySelector('#cage');
    if (g) g.innerHTML = Art.cageInner(true, true);
    Sound.sfx('unlock');
    fx(Art.bubble(POS.cage.x + 40, POS.cage.y - 120, say().open, { ms: 900 }), 900);
    later(900, () => {
      Sound.sfx('cluck');
      S.cage.empty = true;
      if (g) g.innerHTML = Art.cageInner(true, false);
      addPart(Art.hen(0, 0, 0.8, 'happy'), {
        from: { x: POS.cage.x, y: POS.cage.y - 6 }, to: { x: S.jack.x, y: POS.ground - 50 }, dur: 0.8, arc: 70,
        done: () => {
          setJack({ hen: true, pose: 'hold', face: 'happy' });
          bubbleOn('jack', say().together, { ms: 1600 });
          later(900, () => {
            busy = false;
            finishStep();
          });
        },
      });
    });
  }

  // まめのき が たおれる（くも の うえ の きょじん は ぷんぷん）
  function fallStalk() {
    busy = true;
    later(500, () => {
      S.fall = { t: 0 };
      Sound.sfx('fall');
      bubbleOn('jack', say().fall, { ms: 1200 });
      later(1500, () => {
        stars(POS.stalk.x + 200, POS.ground - 30, 8, '💨');
        bubbleOn('giantTop', say().punpun, { ms: 2000 });
        setJack({ face: 'happy', pose: 'cheer' });
        later(900, () => {
          busy = false;
          finishStep();
        });
      });
    });
  }

  // もん を あけると ミルキー が かえって くる
  function cowHome() {
    busy = true;
    S.gateOpen = true;
    const d = svgBox.querySelector('#gate .door');
    if (d) d.style.transform = 'scaleX(0.15)';
    Sound.sfx('gate');
    S.cow = { x: 900, tx: 600, flip: true };
    draw();
    Sound.sfx('walk');
    later(2000, () => {
      Sound.sfx('moo');
      bubbleOn('cow', say().moo, { ms: 1500 });
      bubbleOn('mother', say().home, { ms: 1500 });
      setJack({ pose: 'cheer', face: 'happy' });
      stars(640, POS.ground - 80, 8, '💛', 'heart');
      later(800, () => {
        busy = false;
        finishStep();
      });
    });
  }

  /* ---------- キーボード（パソコン よう） ---------- */

  document.addEventListener('keydown', (e) => {
    if (!$('screen-book').classList.contains('is-on')) return;
    const a = document.activeElement;
    if (a && a !== document.body && a !== artEl && a.closest('button, a')) return;
    const st = step();
    if (!st) return;
    if (st.kind === 'climb' || st.kind === 'down') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        Sound.unlock();
        climbTap(e.key === 'ArrowLeft' ? 'L' : 'R');
      }
      return;
    }
    if (busy || st.kind === 'grow' || st.kind === 'sneak') return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    Sound.unlock();
    const p = target();
    if (p) tapStep(st, p);
  });

  /* ============================ ボタン ============================ */

  $('btn-prev').addEventListener('click', () => {
    Sound.sfx('tap');
    if (pageNo > (free ? FREE_FIRST : 0)) openPage(pageNo - 1);
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
    if (pageNo === (free ? FREE_LAST : PAGES.length - 1)) {
      showEnd();
      return;
    }
    openPage(pageNo + 1);
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
    Mame.detach();
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
      place: 'home', time: 'day', drift: true, stalk: 1,
      jack: { x: 330, face: 'wow', pose: 'cheer' }, mother: { x: 640, face: 'wow' }, hen: { x: 250 },
    });
    const cont = save.page > 0 && save.done.indexOf(PAGES[PAGES.length - 1].id) < 0;
    $('btn-continue').classList.toggle('is-hidden', !cont);
    $('btn-continue').innerHTML = `🔖 つづき から <small>（${save.page + 1}ページ）</small>`;
    show('title');
  }

  function renderEnd() {
    const E = Story.END[save.lang];
    document.querySelectorAll('#screen-end').forEach((el) => { el.lang = save.lang; });
    $('endBig').textContent = E.big;
    $('endSub').textContent = E.sub;
    $('endGuess').textContent = `${E.eggs} × ${save.eggs || 0}　${E.climbs} × ${save.climbs || 0}`;
    return E;
  }

  function showEnd() {
    hush();
    Mame.detach();
    Sound.birds(false);
    $('endArt').innerHTML = Art.scene({
      place: 'home', time: 'day', gate: true,
      jack: { x: 330, face: 'happy', pose: 'cheer' }, mother: { x: 160, face: 'smile' }, hen: { x: 460 }, eggs: 3, cow: { x: 650, flip: true },
    });
    const E = renderEnd();
    if (!free) {
      save.finished = (save.finished || 0) + 1;
      save.page = 0;
      store();
    }
    Sound.sfx('fanfare');
    show('end');
    Sound.speak(`${E.big}。 ${E.sub}`, null, { lang: save.lang });
  }
  $('btn-end-try').addEventListener('click', () => start(FREE_FIRST, true));
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

  // たしかめ（tools/jack-mamenoki/check.js）よう に、いま の ようす を よめる ように する
  window.JackDebug = {
    state: () => (S ? { height: S.m.height, steps: S.m.steps, last: S.m.last, x: S.m.x, noise: S.m.noise, wakes: S.m.wakes, mode: S.mode, jackX: S.jack && S.jack.x } : null),
    where: () => ({ page: pageNo, step: stepNo, free, done: pageDone, busy }),
    target,
  };

  syncToggles();
  syncLang();
  showTitle();
})();
