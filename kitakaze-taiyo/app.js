'use strict';

/*
 * えほん の すすめかた
 *  - ひょうし → ほん（8ページ）→ おしまい（よそう の ふりかえり）
 *  - ページ の しかけ（steps）を じゅんに こなす と「つぎ ▶」が ひらく
 *  - え は Art.scene で 1かい かいて、うごき は まいフレーム transform を かきかえる
 *  - ふく・こする は wind.js（Wind.poll で ゆび の うごき を うけとり、Wind.model で けいさん）
 *  - おしまい の「もういちど ためす」で ページ 3〜6 を じゆう に あそべる
 *  - しおり・せってい は localStorage（よみかき は try/catch）
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'kitakaze-taiyo-v1';
  const PAGES = Story.PAGES;
  const POS = Art.POS;
  const M = Wind.model;
  const FREE_FIRST = PAGES.findIndex((p) => p.id === Story.FREE[0]);
  const FREE_LAST = PAGES.findIndex((p) => p.id === Story.FREE[Story.FREE.length - 1]);

  /* ============================ ほぞん ============================ */

  const save = { page: 0, done: [], sound: true, voice: true, mic: false, micOk: false, lang: 'ja', guess: null, finished: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(save, JSON.parse(raw));
  } catch (e) {
    /* よめなくても あそべる */
  }
  if (!Array.isArray(save.done)) save.done = [];
  if (save.lang !== 'en') save.lang = 'ja';
  if (save.guess !== 'kaze' && save.guess !== 'taiyo') save.guess = null;
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
      if (k === 'mic') {
        micToggle();
        return;
      }
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

  /* ---------- いきで ふく（さいしょ に おうちの かた へ の せつめい と どうい） ---------- */

  const micDialog = $('micDialog');
  const micMsg = $('micMsg');
  function micToggle() {
    if (save.mic) {
      save.mic = false;
      Wind.Breath.stop();
      store();
      syncToggles();
      return;
    }
    micMsg.classList.add('is-hidden');
    micDialog.classList.remove('is-hidden');
    $('btn-mic-ok').focus();
  }
  $('btn-mic-ok').addEventListener('click', async () => {
    const ok = await Wind.Breath.start();
    // きょか を もらう だけ。じっさい に きく の は かぜ の ページ だけ
    Wind.Breath.stop();
    save.mic = ok;
    if (ok) save.micOk = true;
    store();
    syncToggles();
    if (ok) {
      micDialog.classList.add('is-hidden');
      return;
    }
    micMsg.textContent = 'マイクが つかえませんでした。ゆびで ふいて あそんでね。';
    micMsg.classList.remove('is-hidden');
    setTimeout(() => micDialog.classList.add('is-hidden'), 2200);
  });
  $('btn-mic-no').addEventListener('click', () => micDialog.classList.add('is-hidden'));

  /* ============================ え の じょうたい ============================ */

  const artEl = $('art');
  const svgBox = $('artSvg');
  let S = null; // いま の え

  function makeScene(page) {
    const sc = page.scene;
    const small = !!sc.small;
    const s = {
      kaze: null, sun: null, clouds: [], trav: null,
      m: M.create(sc.temp || 0),
      laundry: sc.laundry ? POS.laundry.map(() => true) : [],
      kakashi: sc.kakashi || false,
      kakashiHat: sc.kakashi === true,
      coatTree: !!sc.coatTree,
      mode: null, spin: 0, rub: 0, chilled: false,
      parts: [], emit: { streak: 0, leaf: 0 },
      said: {}, boasted: new Set(), drags: new Map(),
    };
    if (sc.kaze) {
      const k = small ? { x: 120, y: 112, s: 0.85 } : { x: POS.kaze.x, y: POS.kaze.y, s: 1 };
      s.kaze = { x: k.x, y: k.y, tx: k.x, ty: k.y, s: k.s, mood: sc.kaze };
    }
    if (sc.sun) {
      const p = small ? { x: 590, y: 74, s: 0.6 } : { x: POS.sun.x, y: POS.sun.y, s: 1 };
      s.sun = { x: p.x, y: p.y, tx: p.x, ty: p.y, s: p.s, mood: sc.clouds ? 'watch' : sc.sun };
    }
    if (sc.clouds) s.clouds = POS.clouds.map((c) => ({ x: c.x, y: c.y, x0: c.x, tx: c.x, ty: c.y, s: c.s, gone: false }));
    if (sc.trav) {
      const tr = sc.trav;
      const at = tr.rest ? POS.rest : POS.trav;
      s.trav = {
        x: tr.x == null ? at.x : tr.x, tx: at.x, y: at.y,
        look: {
          face: tr.face || 'smile', arms: tr.arms || 'side', coat: tr.coat || 'closed',
          buttons: tr.buttons == null ? 3 : tr.buttons, hat: tr.hat !== false, sweat: !!tr.sweat, sit: !!tr.rest,
        },
      };
    }
    s.stage = M.stage(s.m.temp);
    return s;
  }

  function draw() {
    svgBox.innerHTML = Art.scene({
      kaze: S.kaze, sun: S.sun, clouds: S.clouds,
      trav: S.trav ? Object.assign({ x: S.trav.x, y: S.trav.y }, S.trav.look) : null,
      laundry: S.laundry.length > 0, kakashi: S.kakashi, coatTree: S.coatTree, temp: S.m.temp,
    });
    S.windLayer = svgBox.querySelector('#wind');
  }

  function setLook(patch) {
    if (!S.trav) return;
    const lk = S.trav.look;
    let changed = false;
    Object.keys(patch).forEach((k) => {
      if (lk[k] !== patch[k]) {
        lk[k] = patch[k];
        changed = true;
      }
    });
    if (!changed) return;
    const g = svgBox.querySelector('#trav .shiver');
    if (g) g.innerHTML = Art.travInner(lk);
  }
  function setKaze(mood) {
    if (!S.kaze || S.kaze.mood === mood) return;
    S.kaze.mood = mood;
    const g = svgBox.querySelector('#kaze .kaze-in');
    if (g) g.innerHTML = Art.kazeInner(mood);
  }
  function setSun(mood) {
    if (!S.sun || S.sun.mood === mood) return;
    S.sun.mood = mood;
    const g = svgBox.querySelector('#sun .sun-in');
    if (g) g.innerHTML = Art.sunInner(mood);
  }

  /* ============================ まいフレーム ============================ */

  let lastT = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    if (!S || !$('screen-book').classList.contains('is-on')) {
      Sound.wind(0);
      return;
    }
    const k = 1 - Math.pow(0.002, dt); // なめらかさ
    const inp = Wind.poll();

    if (S.mode === 'blow') {
      if (Wind.Breath.active()) {
        const b = Wind.Breath.read();
        if (b > 0) inp.moves.push(b * dt * 7);
        $('micOn').style.setProperty('--lv', Math.min(1, b * 5).toFixed(2));
      }
      const before = S.m.blown;
      M.blowStep(S.m, inp.moves, dt);
      onBlow(S.m.blown - before, inp.fingers, dt);
    } else if (S.mode === 'warm') {
      const before = S.m.temp;
      M.warmStep(S.m, inp.turns, dt);
      onWarm(S.m.temp - before, inp.fingers, dt, inp.turns.some((a) => a > 0.002));
    } else {
      S.m.wind *= Math.exp(-1.6 * dt);
    }
    const w = S.m.wind;
    Sound.wind(w / M.MAXW);
    S.rub *= Math.pow(0.15, dt);

    // きたかぜ（ふく とき は ぷくぷく ふくらむ）
    if (S.kaze) {
      const kz = S.kaze;
      kz.x += (kz.tx - kz.x) * k;
      kz.y += (kz.ty - kz.y) * k;
      const g = svgBox.querySelector('#kaze');
      const puff = 1 + Math.sin(t / 70) * 0.04 * Math.min(1, w);
      if (g) g.setAttribute('transform', `translate(${kz.x.toFixed(1)} ${kz.y.toFixed(1)}) scale(${(kz.s * puff).toFixed(3)})`);
    }
    // たいよう（こする ほど ひかり が ひろがって くるくる まわる）
    if (S.sun) {
      const sn = S.sun;
      sn.x += (sn.tx - sn.x) * k;
      sn.y += (sn.ty - sn.y) * k;
      S.spin += dt * (6 + S.rub * 220);
      const g = svgBox.querySelector('#sun');
      if (g) {
        g.setAttribute('transform', `translate(${sn.x.toFixed(1)} ${sn.y.toFixed(1)}) scale(${sn.s})`);
        const r = g.querySelector('.rays');
        if (r) r.setAttribute('transform', `rotate(${(S.spin % 360).toFixed(1)}) scale(${(1 + S.rub * 0.12).toFixed(3)})`);
        const gl = g.querySelector('.glow');
        if (gl) gl.setAttribute('transform', `scale(${(0.9 + S.m.temp * 1.5 + Math.sin(t / 300) * 0.04).toFixed(3)})`);
      }
    }
    S.clouds.forEach((c, i) => {
      c.x += (c.tx - c.x) * k * 0.8;
      c.y += (c.ty - c.y) * k * 0.8;
      const g = svgBox.querySelector('#cloud-' + i);
      if (!g) return;
      g.setAttribute('transform', `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) scale(${c.s})`);
      if (c.gone) g.setAttribute('opacity', Math.max(0, 1 - Math.abs(c.x - c.x0) / 360).toFixed(2));
    });
    // たびびと（かぜ で ぶるぶる、あるく とき は ぴょこぴょこ）
    if (S.trav) {
      const tr = S.trav;
      const dx = tr.tx - tr.x;
      const walking = Math.abs(dx) > 1;
      if (walking) tr.x += Math.sign(dx) * Math.min(Math.abs(dx), 190 * dt);
      const g = svgBox.querySelector('#trav');
      if (g) {
        g.setAttribute('transform', `translate(${tr.x.toFixed(1)} ${tr.y})`);
        const sh = g.firstElementChild;
        const shake = Math.sin(t / 22) * Math.min(2.2, w) * 1.8;
        const bob = walking ? Math.abs(Math.sin(t / 90)) * -5 : 0;
        sh.setAttribute('transform', `translate(${shake.toFixed(2)} ${bob.toFixed(1)})`);
        const coat = sh.querySelector('.coat');
        if (coat) coat.setAttribute('transform', `translate(0 -120) skewX(${(-Math.min(2, w) * (4 + Math.sin(t / 50) * 2)).toFixed(2)}) translate(0 120)`);
      }
    }
    const tree = svgBox.querySelector('#tree');
    if (tree) tree.setAttribute('transform', `rotate(${(Math.min(2.5, w) * 2.2 + Math.sin(t / 260) * (0.4 + w * 1.2)).toFixed(2)} ${POS.tree.x} ${POS.tree.y})`);
    const cool = svgBox.querySelector('#coolTint');
    if (cool) cool.setAttribute('opacity', Math.min(0.32, w * 0.14).toFixed(3));
    if (Math.abs(S.m.temp - (S.skyT == null ? -1 : S.skyT)) > 0.004) {
      S.skyT = S.m.temp;
      const c = Art.sky(S.m.temp);
      svgBox.querySelectorAll('.sky0').forEach((e) => e.setAttribute('stop-color', c[0]));
      svgBox.querySelectorAll('.sky1').forEach((e) => e.setAttribute('stop-color', c[1]));
    }

    particles(dt, t);
    updateMeters();
  }
  requestAnimationFrame(frame);

  /* ============================ かぜ の つぶ・とぶ もの ============================ */

  const NS = 'http://www.w3.org/2000/svg';
  function addPart(html, p) {
    if (!S.windLayer || S.parts.length > 80) return;
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = html;
    S.windLayer.appendChild(g);
    S.parts.push(Object.assign({ el: g, age: 0, rot: 0, vr: 0, g: 0, wob: 0, ph: Math.random() * 6, life: 4 }, p));
  }

  function particles(dt, t) {
    const w = S.m.wind;
    // かぜ の すじ と はっぱ は つよい ほど たくさん
    S.emit.streak += w * 14 * dt;
    while (S.emit.streak >= 1) {
      S.emit.streak -= 1;
      const a = 0.4 + Math.random() * 0.45;
      addPart(`<path d="M0 0 q16 -7 32 0 t32 0" stroke="#fff" stroke-width="${(2.5 + Math.random() * 2).toFixed(1)}" fill="none" stroke-linecap="round" opacity="${a.toFixed(2)}"/>`,
        { x: 140 + Math.random() * 160, y: 60 + Math.random() * 380, vx: 520 + Math.random() * 360 + w * 80, vy: (Math.random() - 0.5) * 40, wob: 30, life: 1.6 });
    }
    S.emit.leaf += Math.max(0, w - 0.3) * 4 * dt;
    while (S.emit.leaf >= 1) {
      S.emit.leaf -= 1;
      const c = ['#69db7c', '#94d82d', '#ffa94d', '#ffd43b'][Math.floor(Math.random() * 4)];
      const fromTree = Math.random() < 0.4;
      addPart(Art.ITEM.leaf(c), {
        x: fromTree ? 640 + Math.random() * 120 : -20, y: fromTree ? 140 + Math.random() * 120 : 160 + Math.random() * 280,
        vx: 260 + Math.random() * 220 + w * 60, vy: -30 + Math.random() * 40, vr: 200 + Math.random() * 300, wob: 90, life: 4,
      });
    }
    for (let i = S.parts.length - 1; i >= 0; i -= 1) {
      const p = S.parts[i];
      p.age += dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt + Math.sin(p.age * 6 + p.ph) * p.wob * dt;
      p.rot += p.vr * dt;
      if (p.to) {
        // コート：えだ に むかって ふわっ と とぶ
        const q = Math.min(1, p.age / p.dur);
        const e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
        p.x = p.from.x + (p.to.x - p.from.x) * e;
        p.y = p.from.y + (p.to.y - p.from.y) * e - Math.sin(q * Math.PI) * 90;
        p.rot = Math.sin(q * Math.PI * 3) * 14 * (1 - q) + 4 * q;
      }
      p.el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(p.rot % 360).toFixed(1)})`);
      const gone = p.to ? p.age > p.dur : p.x > 880 || p.x < -120 || p.y < -80 || p.y > 580 || p.age > p.life;
      if (gone) {
        p.el.remove();
        S.parts.splice(i, 1);
        if (p.done) p.done();
      }
    }
  }

  // とまっている もの を とばす（せんたくもの・かかし の ぼうし）
  function flyAway(sel, kind, x, y) {
    const el = svgBox.querySelector(sel);
    if (el) el.remove();
    Sound.sfx('fly');
    addPart(Art.ITEM[kind](), { x, y, vx: 280 + S.m.wind * 120, vy: -140 - Math.random() * 60, g: 60, vr: 260, wob: 40, life: 5 });
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
    if (who === 'kaze' && S.kaze) {
      x = S.kaze.tx + 20;
      y = S.kaze.ty - 70 * S.kaze.s;
    } else if (who === 'sun' && S.sun) {
      x = S.sun.tx;
      y = S.sun.ty - 64 * S.sun.s;
    } else if (who === 'trav' && S.trav) {
      x = S.trav.tx;
      y = S.trav.y - (S.trav.look.sit ? 168 : 212);
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
    hand.textContent = mode === 'circle' ? '👆' : '👉';
    Object.assign(hand.style, pct(x, y));
    if (dx != null) hand.style.setProperty('--dx', dx + 'px');
  }
  function hideHints() {
    ring.classList.add('is-hidden');
    ring2.classList.add('is-hidden');
    hand.classList.add('is-hidden');
  }

  let meterKinds = [];
  function setMeters(kinds) {
    meterKinds = kinds;
    meters.innerHTML = kinds.map((m) => `<div class="meter ${m}"><span>${m === 'wind' ? '🌬️' : m === 'grip' ? '🧥' : '🌡️'} ${label()[m]}</span><span class="bar"><i></i></span></div>`).join('');
  }
  function updateMeters() {
    if (!meterKinds.length) return;
    meters.querySelectorAll('.meter').forEach((el, i) => {
      const m = meterKinds[i];
      const v = m === 'wind' ? S.m.wind / M.MAXW : m === 'grip' ? S.m.grip : S.m.temp;
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
  function twoFingers(fingers, text) {
    const now = performance.now();
    if (fingers < 2 || now - badgeAt < 1200) return;
    badgeAt = now;
    showBadge(`👆×${fingers}  ${text}`);
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
  let free = false; // 「もういちど ためす」（ページ 3〜6 を じゆう に）

  function stopToys() {
    Wind.detach();
    Wind.Breath.stop();
    $('micOn').classList.add('is-hidden');
    Sound.wind(0);
  }

  function openPage(n) {
    hush();
    stopToys();
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
    setMeters([]);
    badge.classList.add('is-hidden');
    $('pageNo').textContent = free ? `${label().free} ${pageNo + 1}` : `${pageNo + 1} / ${PAGES.length}`;
    $('btn-prev').disabled = pageNo === lo;
    Sound.birds(save.sound && (page.id === 'pokapoka' || page.id === 'nuida'));
    stepNo = 0;
    pageDone = false;
    busy = false;
    words.scrollTop = 0;
    const els = addLines(page.text);
    updateNext();
    startStep();
    read(els);
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

  // たいよう の まんなか（がめん の ざひょう）
  function sunCenter() {
    if (!S || !S.sun) return null;
    const r = artEl.getBoundingClientRect();
    const sc = r.width / 800;
    return { x: r.left + S.sun.x * sc, y: r.top + S.sun.y * sc, r: 52 * S.sun.s * sc };
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
    if (st.kind === 'blow') {
      S.mode = 'blow';
      S.blowStart = S.m.blown;
      setMeters(st.grip ? ['wind', 'grip'] : ['wind']);
      Wind.attach(artEl, {});
      if (save.mic) {
        Wind.Breath.start().then((ok) => {
          if (!ok) {
            save.mic = false;
            store();
            syncToggles();
          }
          $('micOn').classList.toggle('is-hidden', !(ok && S && S.mode === 'blow'));
        });
      }
    } else if (st.kind === 'warm') {
      S.mode = 'warm';
      setMeters(['temp']);
      Wind.attach(artEl, { center: sunCenter });
    }
  }

  function showStepHint() {
    const st = step();
    if (!st || busy) return;
    const kz = S.kaze;
    const sn = S.sun;
    const tr = S.trav;
    if (st.kind === 'boast' || st.kind === 'guess') {
      if (!S.boasted.has('kaze') || st.kind === 'guess') showRing(kz.tx, kz.ty);
      if (!S.boasted.has('sun') || st.kind === 'guess') showRing(sn.tx, sn.ty, true);
    } else if (st.kind === 'greet' || st.kind === 'coat') showRing(tr.tx, tr.y - 100);
    else if (st.kind === 'button') {
      const b = POS.buttons[Math.min(2, tr.look.buttons)];
      showRing(tr.tx + b.x, tr.y + b.y);
    } else if (st.kind === 'rest') showRing(POS.rest.x, POS.rest.y - 80);
    else if (st.kind === 'cloud') {
      const c = S.clouds.find((cl) => !cl.gone);
      if (c) showRing(c.tx, c.ty);
    } else if (st.kind === 'blow') showHand(300, 250);
    else if (st.kind === 'warm') showHand(sn.x, sn.y, 'circle');
    else if (st.kind === 'shake') {
      const w = artEl.getBoundingClientRect().width;
      showHand(kz.tx + 40, kz.ty + 30, 'drag', Math.round(((sn.tx - kz.tx) / 800) * w * 0.6));
    }
  }

  // しばらく さわらないと、もう いちど ヒント
  function poke() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showStepHint, 3500);
  }

  function finishStep() {
    const st = step();
    if (!free) {
      Wind.detach();
      Wind.Breath.stop();
      $('micOn').classList.add('is-hidden');
      S.mode = null;
    }
    hideHints();
    hintEl.classList.add('is-hidden');
    const then = Array.isArray(st.then) ? st.then : st.then[save.guess || 'taiyo'];
    const els = addLines(then, 'new');
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
    if (more) {
      Wind.detach();
      S.mode = null;
      startStep();
    }
  }

  /* ---------- ふく（blow） ---------- */

  function onBlow(delta, fingers) {
    const w = S.m.wind;
    const st = step();
    const now = performance.now();
    if (delta > 0.002) {
      hush();
      hideHints();
      poke();
    }
    twoFingers(fingers, label().twoWind);
    // きたかぜ は ほっぺ を ふくらませて びゅーっ
    if (S.kaze && S.kaze.mood !== 'tired') setKaze(w > 0.15 ? 'puff' : 'proud');
    if (w > 0.45 && now - (S.said.kaze || 0) > 2600) {
      S.said.kaze = now;
      bubbleOn('kaze', say().whoosh, { ms: 1100 });
    }
    // たびびと は さむくて ぶるぶる、コート を ぎゅっ
    if (S.trav) {
      if (w > 0.2) S.chilled = true;
      if (S.chilled) setLook({ face: w > 1 ? 'grip' : 'cold', arms: 'hug' });
      if (w > 0.35 && now - (S.said.trav || 0) > 3000) {
        S.said.trav = now;
        const lines = st && st.grip ? [say().hold, say().cold, say().brr] : [say().brr, say().cold];
        S.said.n = ((S.said.n || 0) + 1) % lines.length;
        bubbleOn('trav', lines[S.said.n], { ms: 1300 });
        Sound.sfx('brr');
      }
    }
    // せんたくもの・ぼうし が とぶ
    if (w > 0.6) {
      const i = S.laundry.indexOf(true);
      if (i >= 0 && Math.random() < w * 0.9 * 0.016) {
        S.laundry[i] = false;
        flyAway('#laundry-' + i, POS.laundry[i].kind, POS.laundry[i].x, 290);
      }
    }
    if (w > 0.9 && S.kakashiHat && Math.random() < 0.03) {
      S.kakashiHat = false;
      flyAway('#kakashiHat', 'strawHat', POS.kakashi.x, POS.kakashi.y - 136);
    }
    if (!st || st.kind !== 'blow' || busy) return;
    if (S.m.blown - S.blowStart < st.need) return;
    busy = true;
    setTimeout(() => {
      busy = false;
      if (st.grip) {
        setKaze('tired');
        bubbleOn('kaze', say().giveUp, { ms: 2000 });
        Sound.sfx('tired');
      } else {
        bubbleOn('trav', say().hold, { ms: 1400 });
      }
      finishStep();
    }, 300);
  }

  /* ---------- あたためる（warm） ---------- */

  function onWarm(dTemp, fingers, rubbing) {
    const st = step();
    const now = performance.now();
    if (rubbing) {
      hush();
      hideHints();
      poke();
      S.rub = Math.min(1, S.rub + 0.08);
      twoFingers(fingers, label().twoWarm);
      if (now - (S.said.spark || 0) > 320) {
        S.said.spark = now;
        Sound.sfx('sparkle', S.m.temp);
        const a = Math.random() * Math.PI * 2;
        fx(`<text class="twinkle" x="${(S.sun.x + Math.cos(a) * 80).toFixed(0)}" y="${(S.sun.y + Math.sin(a) * 70).toFixed(0)}" font-size="24" text-anchor="middle" style="--dx:${(Math.cos(a) * 40).toFixed(0)}px; --dy:${(Math.sin(a) * 30).toFixed(0)}px">✨</text>`, 1000);
      }
      if (S.sun && S.sun.mood !== 'shine') setSun('shine');
    }
    const n = M.stage(S.m.temp);
    while (S.stage < n) {
      S.stage += 1;
      applyStage(S.stage);
    }
    if (S.stage >= 2 && Math.random() < 0.004) Sound.sfx('drip');
    if (!st || st.kind !== 'warm' || busy) return;
    if (S.m.temp < st.goal - 1e-6) return;
    busy = true;
    setTimeout(() => {
      busy = false;
      finishStep();
    }, 500);
  }

  // おんど の だんかい ごと に たびびと が かわる: ほっ → あせ → あせ を ふく → ぼうし → ボタン → コート
  function applyStage(n) {
    if (n === 1) {
      setLook({ face: 'relief', arms: 'side' });
      bubbleOn('trav', say().ahh, { ms: 1200 });
    } else if (n === 2) {
      setLook({ face: 'hot', arms: 'side', sweat: true });
      bubbleOn('trav', say().warm, { ms: 1300 });
      Sound.sfx('drip');
    } else if (n === 3) {
      setLook({ arms: 'wipe' });
      bubbleOn('trav', say().phew, { ms: 1200 });
      Sound.sfx('drip');
      setTimeout(() => S && S.stage >= 3 && setLook({ arms: 'side' }), 1100);
    } else if (n === 4) {
      setLook({ hat: false, arms: 'side' });
      bubbleOn('trav', say().hot, { ms: 1200 });
      Sound.sfx('hatOff');
    } else if (n === 5) {
      setLook({ coat: 'open' });
      bubbleOn('trav', say().pop, { ms: 1200 });
      Sound.sfx('buttons');
    } else if (n === 6) {
      setLook({ coat: 'open', face: 'hot', hat: false, sweat: true });
    }
  }

  /* ---------- タップ・ドラッグ の しかけ ---------- */

  function svgPoint(e) {
    const r = artEl.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 800, y: ((e.clientY - r.top) / r.height) * 500 };
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const nearKaze = (p) => S.kaze && dist(p, S.kaze) < 92 * S.kaze.s;
  const nearSun = (p) => S.sun && dist(p, S.sun) < 88 * S.sun.s;
  function nearTrav(p) {
    const tr = S.trav;
    if (!tr) return false;
    const top = tr.y - (tr.look.sit ? 165 : 210);
    return Math.min(Math.abs(p.x - tr.x), Math.abs(p.x - tr.tx)) < 62 && p.y > top && p.y < tr.y + 14;
  }

  let swipe = null;
  artEl.addEventListener('pointerdown', (e) => {
    Sound.unlock();
    const st = step();
    if (!st || busy || st.kind === 'blow' || st.kind === 'warm') return;
    const p = svgPoint(e);
    if (st.kind === 'shake') {
      shakeDown(e, p);
      return;
    }
    if (st.kind === 'cloud') {
      swipe = { x: p.x, y: p.y, id: e.pointerId };
      flickAt(p, null);
      return;
    }
    tapStep(st, p);
  });
  artEl.addEventListener('pointermove', (e) => {
    const st = step();
    if (!st || busy) return;
    if (st.kind === 'shake') {
      shakeMove(e);
      return;
    }
    if (st.kind !== 'cloud' || !swipe || swipe.id !== e.pointerId) return;
    const p = svgPoint(e);
    const d = dist(p, swipe);
    if (d > 26) {
      flickAt(p, { x: (p.x - swipe.x) / d, y: (p.y - swipe.y) / d });
      swipe.x = p.x;
      swipe.y = p.y;
    }
  });
  const endPtr = (e) => {
    if (swipe && swipe.id === e.pointerId) swipe = null;
    if (S) S.drags.delete(e.pointerId);
  };
  window.addEventListener('pointerup', endPtr);
  window.addEventListener('pointercancel', endPtr);

  function after(ms, f) {
    busy = true;
    setTimeout(() => {
      busy = false;
      f();
    }, ms);
  }

  function tapStep(st, p) {
    hush();
    hideHints();
    poke();
    if (st.kind === 'boast') {
      const who = nearKaze(p) ? 'kaze' : nearSun(p) ? 'sun' : null;
      if (!who) return;
      Sound.sfx('boast', who);
      bubbleOn(who, who === 'kaze' ? say().boastKaze : say().boastSun, { ms: 1600 });
      if (who === 'kaze') setKaze('proud');
      else setSun('shine');
      S.boasted.add(who);
      if (S.boasted.size >= 2) after(900, finishStep);
    } else if (st.kind === 'guess') {
      const who = nearKaze(p) ? 'kaze' : nearSun(p) ? 'taiyo' : null;
      if (!who) return;
      save.guess = who;
      store();
      Sound.sfx('pick');
      bubbleOn(who === 'kaze' ? 'kaze' : 'sun', who === 'kaze' ? say().pickKaze : say().pickSun, { ms: 1800 });
      const c = who === 'kaze' ? S.kaze : S.sun;
      stars(c.x, c.y, 8, '⭐');
      after(800, finishStep);
    } else if (st.kind === 'greet') {
      if (!nearTrav(p)) return;
      S.trav.x = S.trav.tx;
      setLook({ arms: 'wave' });
      Sound.sfx('hello');
      bubbleOn('trav', say().hello, { ms: 1500 });
      after(1000, () => {
        setLook({ arms: 'side' });
        finishStep();
      });
    } else if (st.kind === 'button') {
      if (!nearTrav(p)) return;
      const n = Math.min(st.need, S.trav.look.buttons + 1);
      setLook({ buttons: n });
      Sound.sfx('snap', n);
      const b = POS.buttons[n - 1];
      fx(Art.bubble(S.trav.tx + b.x + 60, S.trav.y + b.y - 6, say().gyu, { ms: 900 }), 900);
      if (n >= st.need) {
        setLook({ face: 'relief' });
        after(700, () => {
          setLook({ face: 'smile' });
          finishStep();
        });
      }
    } else if (st.kind === 'coat') {
      if (!nearTrav(p)) return;
      coatFly();
    } else if (st.kind === 'rest') {
      if (!nearTrav(p)) return;
      setLook({ arms: 'stretch', face: 'yawn' });
      Sound.sfx('yawn');
      bubbleOn('trav', say().yawn, { ms: 1500 });
      after(1400, () => {
        setLook({ arms: 'side', face: 'relief' });
        finishStep();
      });
    }
  }

  // コート が ふわっ と 木 の えだ に → たびびと は 木かげ へ
  function coatFly() {
    busy = true;
    const tr = S.trav;
    setLook({ coat: 'off', face: 'relief', sweat: false });
    Sound.sfx('float');
    bubbleOn('trav', say().fuwa, { ms: 1300 });
    addPart(Art.ITEM.coat(), {
      from: { x: tr.x, y: tr.y - 80 }, to: { x: POS.branch.x, y: POS.branch.y + 36 }, dur: 1.5,
      x: tr.x, y: tr.y - 80, vx: 0, vy: 0,
      done: () => {
        const c = svgBox.querySelector('#coatTree');
        if (c) c.style.display = '';
        S.coatTree = true;
        stars(POS.branch.x, POS.branch.y + 30, 6, '✨');
        tr.tx = POS.rest.x;
        Sound.sfx('walk');
        setTimeout(() => {
          tr.y = POS.rest.y;
          setLook({ sit: true });
          busy = false;
          finishStep();
        }, 1400);
      },
    });
  }

  // くも を はじく
  function flickAt(p, dir) {
    const st = step();
    const i = S.clouds.findIndex((c) => !c.gone && dist(p, c) < 74 * c.s);
    if (i < 0) return;
    hush();
    hideHints();
    poke();
    const c = S.clouds[i];
    c.gone = true;
    const d = dir || { x: c.x >= POS.sun.x ? 1 : -1, y: -0.25 };
    c.tx = c.x + d.x * 460;
    c.ty = c.y + d.y * 200;
    Sound.sfx('poof');
    fx(Art.bubble(c.x, c.y - 30, say().poof, { ms: 800 }), 800);
    counter += 1;
    if (counter < st.need) return;
    busy = true;
    setTimeout(() => {
      setSun('shine');
      Sound.sfx('sparkle', 0.5);
      Sound.birds(save.sound);
      stars(S.sun.x, S.sun.y, 10, '✨');
      busy = false;
      finishStep();
    }, 600);
  }

  // きたかぜ と たいよう を ドラッグ（ゆび 2ほん で ふたり いっしょ に うごかしても よい）
  function shakeDown(e, p) {
    const who = nearKaze(p) ? 'kaze' : nearSun(p) ? 'sun' : null;
    if (!who) return;
    hush();
    hideHints();
    poke();
    const c = S[who];
    S.drags.set(e.pointerId, { who, dx: c.x - p.x, dy: c.y - p.y });
    try {
      artEl.setPointerCapture(e.pointerId);
    } catch (err) {
      /* なにも しない */
    }
  }
  function shakeMove(e) {
    const d = S.drags.get(e.pointerId);
    if (!d) return;
    e.preventDefault();
    const p = svgPoint(e);
    const c = S[d.who];
    c.x = c.tx = Math.max(60, Math.min(740, p.x + d.dx));
    c.y = c.ty = Math.max(60, Math.min(330, p.y + d.dy));
    checkShake();
  }
  function checkShake() {
    if (busy || dist(S.kaze, S.sun) > 210) return;
    busy = true;
    S.drags.clear();
    const mx = (S.kaze.x + S.sun.x) / 2;
    const my = Math.max(110, (S.kaze.y + S.sun.y) / 2);
    S.kaze.tx = mx - 95;
    S.kaze.ty = my;
    S.sun.tx = mx + 90;
    S.sun.ty = my;
    setKaze('smile');
    setSun('shine');
    setTimeout(() => {
      Sound.sfx('shake');
      fx(`<text class="bubble" x="${mx.toFixed(0)}" y="${(my + 22).toFixed(0)}" font-size="54" text-anchor="middle">🤝</text>`, 0);
      stars(mx, my - 20, 8, '💛', 'heart');
      bubbleOn('kaze', say().friends, { ms: 1800 });
      setTimeout(() => {
        busy = false;
        finishStep();
      }, 900);
    }, 450);
  }

  /* ---------- キーボード（パソコン よう） ---------- */

  document.addEventListener('keydown', (e) => {
    if (!$('screen-book').classList.contains('is-on') || !micDialog.classList.contains('is-hidden')) return;
    const a = document.activeElement;
    if (a && a !== document.body && a !== artEl && a.closest('button, a')) return;
    const st = step();
    if (!st || busy || st.kind === 'blow' || st.kind === 'warm') return;
    const go = e.key === 'Enter' || e.key === ' ';
    const arrow = /^Arrow/.test(e.key);
    if (!go && !arrow) return;
    e.preventDefault();
    Sound.unlock();
    const tr = S.trav;
    if (st.kind === 'boast') tapStep(st, S.boasted.has('kaze') ? S.sun : S.kaze);
    else if (st.kind === 'guess') {
      if (e.key === 'ArrowLeft') tapStep(st, S.kaze);
      else if (e.key === 'ArrowRight') tapStep(st, S.sun);
    } else if (st.kind === 'cloud') {
      const c = S.clouds.find((cl) => !cl.gone);
      if (c) flickAt(c, null);
    } else if (st.kind === 'shake') {
      hush();
      hideHints();
      const dx = S.sun.x - S.kaze.x;
      S.kaze.x = S.kaze.tx = S.kaze.x + Math.sign(dx) * 40;
      S.sun.x = S.sun.tx = S.sun.x - Math.sign(dx) * 40;
      checkShake();
    } else if (tr) tapStep(st, { x: tr.tx, y: tr.y - 90 });
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
    stopToys();
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
      kaze: { x: POS.kaze.x, y: POS.kaze.y, mood: 'puff' }, sun: { x: POS.sun.x, y: POS.sun.y, mood: 'smile' },
      trav: { x: POS.trav.x, y: POS.trav.y, face: 'cold', arms: 'hug' }, laundry: true, kakashi: true, drift: true,
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
    const g = save.guess;
    $('endGuess').innerHTML = `<small>${E.guessLabel}: ${g === 'kaze' ? '🌬️' : g === 'taiyo' ? '☀️' : '—'}</small>${E[g || 'none']}`;
    return E;
  }

  function showEnd() {
    hush();
    stopToys();
    Sound.birds(false);
    $('endArt').innerHTML = Art.scene({
      kaze: { x: 318, y: 132, mood: 'smile' }, sun: { x: 492, y: 120, mood: 'shine' }, hands: { x: 405, y: 168 },
      trav: { x: POS.rest.x, y: POS.rest.y, coat: 'off', face: 'relief', hat: false, sit: true }, coatTree: true, kakashi: 'nohat', temp: 0.5,
    });
    const E = renderEnd();
    if (!free) {
      save.finished = (save.finished || 0) + 1;
      save.page = 0;
      store();
    }
    Sound.sfx('fanfare');
    show('end');
    const g = E[save.guess || 'none'].replace(/[☀-➿\u{1f300}-\u{1faff}]️?/gu, '');
    Sound.speak(`${E.big}。 ${g}`, null, { lang: save.lang });
  }
  $('btn-end-try').addEventListener('click', () => start(FREE_FIRST, true));
  $('btn-end-again').addEventListener('click', () => start(0));
  $('btn-end-home').addEventListener('click', showTitle);
  document.querySelectorAll('[data-lang-btn]').forEach((btn) => btn.addEventListener('click', () => {
    if ($('screen-end').classList.contains('is-on')) renderEnd();
  }));

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

  // たしかめ（tools/kitakaze-taiyo/check.js）よう に、いま の ようす を よめる ように する
  window.KitakazeDebug = {
    state: () => (S ? { blown: S.m.blown, wind: S.m.wind, grip: S.m.grip, temp: S.m.temp, stage: S.stage, mode: S.mode } : null),
    where: () => ({ page: pageNo, step: stepNo, free, done: pageDone }),
    pos: () => (S ? {
      kaze: S.kaze && { x: S.kaze.x, y: S.kaze.y }, sun: S.sun && { x: S.sun.x, y: S.sun.y },
      trav: S.trav && { x: S.trav.tx, y: S.trav.y }, clouds: S.clouds.filter((c) => !c.gone).map((c) => ({ x: c.x, y: c.y })),
    } : null),
  };

  syncToggles();
  syncLang();
  showTitle();
})();
