'use strict';

/*
 * えほん の すすめかた
 *  - ひょうし → ほん（9ページ）→ おしまい
 *  - ページ の しかけ（steps）を じゅんに こなす と「つぎ ▶」が ひらく
 *  - え は Art.scene で 1かい かいて、うごき は まいフレーム transform を かきかえる
 *  - しおり・せってい は localStorage（よみかき は try/catch）
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'ookina-kabu-v1';
  const PAGES = Story.PAGES;

  /* ============================ ほぞん ============================ */

  const save = { page: 0, done: [], sound: true, voice: true, finished: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(save, JSON.parse(raw));
  } catch (e) {
    /* よめなくても あそべる */
  }
  if (!Array.isArray(save.done)) save.done = [];
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
      const on = b.dataset.toggle === 'sound' ? save.sound : save.voice;
      b.classList.toggle('is-off', !on);
      b.setAttribute('aria-pressed', String(on));
      const lab = b.querySelector('b');
      if (lab) lab.textContent = on ? 'オン' : 'オフ';
    });
  }
  document.querySelectorAll('[data-toggle]').forEach((b) => {
    b.addEventListener('click', () => {
      Sound.unlock();
      if (b.dataset.toggle === 'sound') {
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
  const ui = $('artUi');
  let S = null; // いま の え
  const IN_CHAIN = new Set();

  function makeScene(page) {
    const sc = page.scene;
    const s = { chars: {}, kabu: null, mound: !!sc.mound, jouro: !!sc.jouro, pot: !!sc.pot, shake: 0, bump: 0, pull: 0, pullT: 0 };
    if (sc.kabu) s.kabu = { scale: sc.kabu.scale, tscale: sc.kabu.scale, lift: 0, tlift: 0, rot: 0, trot: 0 };
    IN_CHAIN.clear();
    const put = (id, x, pose, flip) => {
      s.chars[id] = { x, tx: x, lean: 0, tlean: 0, pose, flip: !!flip };
    };
    if (sc.party) {
      [['jiji', 200, 1], ['baba', 285, 1], ['mago', 540], ['inu', 615], ['neko', 690], ['nezumi', 750]]
        .forEach(([id, x, f]) => put(id, x, 'stand', f));
    } else {
      Object.keys(sc.chars || {}).forEach((id) => {
        const pose = sc.chars[id];
        put(id, pose === 'stand' ? 300 : Story.SLOT[id], pose);
        if (pose === 'reach') IN_CHAIN.add(id);
      });
      if (sc.waiting) put(sc.waiting, Story.WAIT[sc.waiting], 'stand');
    }
    return s;
  }

  function draw() {
    const chars = {};
    Object.keys(S.chars).forEach((id) => { chars[id] = S.chars[id]; });
    svgBox.innerHTML = Art.scene({ kabu: S.kabu, mound: S.mound, jouro: S.jouro, pot: S.pot, chars });
  }

  function setPose(id, pose) {
    const c = S.chars[id];
    if (!c || c.pose === pose) return;
    c.pose = pose;
    const g = svgBox.querySelector(`#c-${id} .lean`);
    if (g) g.innerHTML = Art.WHO[id](pose);
  }

  // まいフレーム：めざす あたい へ すこしずつ ちかづける
  let lastT = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    if (!S || !$('screen-book').classList.contains('is-on')) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    const k = 1 - Math.pow(0.0005, dt); // なめらかさ
    S.pull += (S.pullT - S.pull) * (1 - Math.pow(0.00002, dt));
    S.shake *= Math.pow(0.02, dt);
    S.bump *= Math.pow(0.01, dt);

    Object.keys(S.chars).forEach((id) => {
      const c = S.chars[id];
      c.x += (c.tx - c.x) * k;
      c.lean += (c.tlean - c.lean) * k;
      const g = svgBox.querySelector('#c-' + id);
      if (!g) return;
      const inChain = IN_CHAIN.has(id);
      const px = inChain ? S.pull * 16 : 0;
      const pl = inChain ? S.pull * 12 + Math.sin(t / 40) * S.shake * 2 : 0;
      const walk = Math.abs(c.tx - c.x) > 2 ? Math.abs(Math.sin(t / 70)) * -6 : 0;
      g.setAttribute('transform', `translate(${(c.x + px).toFixed(1)},${(Art.GROUND + walk).toFixed(1)})${c.flip ? ' scale(-1,1)' : ''}`);
      g.firstElementChild.setAttribute('transform', `rotate(${(c.lean + pl).toFixed(2)})`);
    });

    if (S.kabu) {
      const kb = S.kabu;
      kb.scale += (kb.tscale - kb.scale) * k;
      kb.lift += (kb.tlift - kb.lift) * (kb.fast ? 1 - Math.pow(0.00001, dt) : k);
      kb.rot += (kb.trot - kb.rot) * k;
      const g = svgBox.querySelector('#kabu');
      if (g) {
        const lift = kb.lift + S.pull * 7 + S.bump;
        const rot = kb.rot + S.pull * 4 + Math.sin(t / 30) * S.shake * 3;
        g.setAttribute('transform', `translate(150 ${(Art.GROUND - lift).toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${kb.scale.toFixed(3)})`);
      }
    }
  }
  requestAnimationFrame(frame);

  /* ============================ こうか（ふきだし・つぶ） ============================ */

  function fx(html, ms) {
    const layer = svgBox.querySelector('#fx');
    if (!layer) return;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.innerHTML = html;
    layer.appendChild(g);
    setTimeout(() => g.remove(), ms || 1400);
  }

  function bubbleOver(id, text, opt) {
    const c = S.chars[id];
    if (!c) return;
    fx(Art.bubble(c.tx, Art.GROUND - Story.HEAD[id] - 6, text, opt), (opt && opt.ms) || 1500);
  }

  function dust(x, y, n) {
    let h = '';
    for (let i = 0; i < (n || 6); i += 1) {
      const dx = (Math.random() - 0.5) * 120;
      const r = 6 + Math.random() * 8;
      h += `<circle class="dust" cx="${x + dx}" cy="${y - Math.random() * 10}" r="${r}" fill="#c9a27e" style="--dx:${dx * 0.4}px"/>`;
    }
    fx(h, 900);
  }

  function stars(x, y, n, emoji) {
    let h = '';
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2;
      h += `<text class="star" x="${x}" y="${y}" font-size="30" text-anchor="middle"
        style="--dx:${Math.cos(a) * 90}px; --dy:${Math.sin(a) * 70}px">${emoji || '⭐'}</text>`;
    }
    fx(h, 1300);
  }

  function drops() {
    let h = '';
    for (let i = 0; i < 5; i += 1) {
      h += `<ellipse class="drop" cx="${130 + i * 10}" cy="${290 + (i % 2) * 8}" rx="4" ry="7" fill="#4dabf7" style="animation-delay:${i * 60}ms"/>`;
    }
    fx(h, 1000);
  }

  /* ============================ ヒント ============================ */

  const ring = $('ring');
  const hand = $('hand');
  const meter = $('meter');
  const badge = $('badge');

  function pct(x, y) {
    return { left: (x / 800) * 100 + '%', top: (y / 500) * 100 + '%' };
  }
  function showRing(x, y) {
    Object.assign(ring.style, pct(x, y));
    ring.classList.remove('is-hidden');
  }
  function hideHints() {
    ring.classList.add('is-hidden');
    hand.classList.add('is-hidden');
  }
  function showHand() {
    const last = Story.ORDER.filter((id) => IN_CHAIN.has(id)).pop() || 'jiji';
    Object.assign(hand.style, pct(S.chars[last].tx + 20, Art.GROUND - Math.max(60, Story.HEAD[last] * 0.55)));
    hand.classList.remove('is-hidden');
  }

  function setMeter(have, need) {
    if (!need) {
      meter.classList.add('is-hidden');
      return;
    }
    meter.classList.remove('is-hidden');
    let h = '<span class="m-lab">ちから</span>';
    for (let i = 0; i < need; i += 1) h += `<i class="${i < have ? 'on' : ''}"></i>`;
    meter.innerHTML = h;
  }

  let badgeTimer = null;
  function showBadge(text) {
    badge.textContent = text;
    badge.classList.remove('is-hidden', 'pop');
    void badge.offsetWidth;
    badge.classList.add('pop');
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(() => badge.classList.add('is-hidden'), 1400);
  }

  /* ============================ ことば ============================ */

  const words = $('words');
  const hintEl = $('hint');
  let readToken = 0;

  function addLines(lines, cls) {
    return lines.map((s) => {
      const p = document.createElement('p');
      p.className = 'line' + (s.charAt(0) === '「' ? ' serif' : '') + (cls ? ' ' + cls : '');
      p.textContent = s;
      words.appendChild(p);
      return p;
    });
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
      Sound.speak(Story.plain(el.textContent), next);
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

  function openPage(n) {
    hush();
    Pull.detach();
    clearTimeout(idleTimer);
    pageNo = Math.max(0, Math.min(PAGES.length - 1, n));
    save.page = pageNo;
    store();
    const page = PAGES[pageNo];
    S = makeScene(page);
    draw();
    words.innerHTML = '';
    hideHints();
    setMeter(0, 0);
    badge.classList.add('is-hidden');
    $('pageNo').textContent = `${pageNo + 1} / ${PAGES.length}`;
    $('btn-prev').disabled = pageNo === 0;
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
    const open = pageDone || save.done.indexOf(PAGES[pageNo].id) >= 0;
    const btn = $('btn-next');
    btn.classList.toggle('locked', !open);
    btn.classList.toggle('glow', pageDone);
    btn.innerHTML = open ? (pageNo === PAGES.length - 1 ? 'おしまい ▶' : 'つぎ ▶') : '🔒 つぎ';
  }

  function step() {
    return PAGES[pageNo].steps[stepNo];
  }

  let idleTimer = null;
  function startStep() {
    const st = step();
    counter = 0;
    if (!st) return;
    hintEl.textContent = st.hint;
    hintEl.classList.remove('is-hidden');
    showStepHint();
    if (st.kind === 'pull') {
      setMeter(0, st.goal === 'out' ? st.need : 0);
      Pull.attach(artEl, {
        onMove(a) {
          S.pullT = a;
          if (a > 0.05) { hush(); hideHints(); }
          if (a > 0.3 && Math.random() < 0.15) Sound.sfx('creak', a);
        },
        onHeave: heave,
        onRelease() {
          S.pullT = 0;
          poke();
        },
      });
    }
  }

  function showStepHint() {
    const st = step();
    if (!st || busy) return;
    if (st.kind === 'water') showRing(150, 400);
    else if (st.kind === 'grow') showRing(150, Art.GROUND - 60 - S.kabu.tscale * 120);
    else if (st.kind === 'call') showRing(Story.WAIT[st.who], Art.GROUND - Story.HEAD[st.who] * 0.5);
    else if (st.kind === 'soup') showRing(400, 360);
    else if (st.kind === 'pull') showHand();
  }

  // しばらく さわらないと、もう いちど ヒント
  function poke() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showStepHint, 3500);
  }

  function finishStep() {
    const st = step();
    Pull.detach();
    S.pullT = 0;
    hideHints();
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

  /* ---------- タップ の しかけ ---------- */

  function svgPoint(e) {
    const r = artEl.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 800, y: ((e.clientY - r.top) / r.height) * 500 };
  }

  let swipe = null;
  artEl.addEventListener('pointerdown', (e) => {
    Sound.unlock();
    const st = step();
    if (!st || busy || st.kind === 'pull') return;
    swipe = { y: e.clientY, used: false };
    tapStep(st, svgPoint(e));
  });
  artEl.addEventListener('pointermove', (e) => {
    const st = step();
    if (!swipe || !st || st.kind !== 'grow' || busy) return;
    // うえ に なぞっても そだつ
    if (swipe.y - e.clientY > 50) {
      swipe.y = e.clientY;
      tapStep(st, svgPoint(e));
    }
  });
  window.addEventListener('pointerup', () => { swipe = null; });

  function tapStep(st, p) {
    hush();
    hideHints();
    poke();
    if (st.kind === 'water') {
      counter += 1;
      Sound.sfx('water');
      const j = svgBox.querySelector('#jouro');
      if (j) {
        j.classList.remove('pour');
        void j.getBoundingClientRect();
        j.classList.add('pour');
      }
      drops();
      if (counter >= st.need) {
        busy = true;
        setTimeout(() => {
          const m = svgBox.querySelector('#mound .seed');
          if (m) m.remove();
          const jj = svgBox.querySelector('#jouro');
          if (jj) jj.classList.add('away');
          S.kabu.tscale = 0.16;
          Sound.sfx('sprout');
          stars(150, 380, 6, '✨');
          setPose('jiji', 'cheer');
          busy = false;
          finishStep();
        }, 700);
      }
    } else if (st.kind === 'grow') {
      counter += 1;
      S.kabu.tscale = 0.16 + (0.84 * counter) / st.need;
      Sound.sfx('grow', counter);
      stars(150, Art.GROUND - 40 - S.kabu.tscale * 150, 5, '✨');
      if (counter >= st.need) {
        busy = true;
        setPose('jiji', 'cheer');
        bubbleOver('jiji', 'おおきい！', { ms: 1800 });
        setTimeout(() => {
          busy = false;
          finishStep();
        }, 800);
      }
    } else if (st.kind === 'call') {
      busy = true;
      const id = st.who;
      Sound.sfx('call');
      bubbleOver(id, Story.CALL[id], { ms: 1300 });
      setTimeout(() => {
        S.chars[id].tx = Story.SLOT[id];
        Sound.sfx('walk');
        setTimeout(() => {
          setPose(id, 'reach');
          IN_CHAIN.add(id);
          busy = false;
          finishStep();
        }, 900);
      }, 500);
    } else if (st.kind === 'soup') {
      busy = true;
      const steam = svgBox.querySelector('#pot .steam');
      if (steam) steam.classList.add('on');
      Sound.sfx('bubble');
      Object.keys(S.chars).forEach((id, i) => setTimeout(() => setPose(id, 'cheer'), i * 120));
      stars(400, 240, 8, '💛');
      setTimeout(() => {
        Sound.sfx('fanfare');
        busy = false;
        finishStep();
      }, 900);
    }
  }

  /* ---------- ひっぱる しかけ ---------- */

  function heave(fingers) {
    const st = step();
    if (!st || st.kind !== 'pull' || busy) return;
    counter += 1;
    const power = st.goal === 'out' ? fingers : 1;
    const before = st.goal === 'out' ? artEl._power || 0 : 0;
    const total = before + power;
    if (st.goal === 'out') artEl._power = total;
    const word = counter % 2 ? 'うんとこしょ！' : 'どっこいしょ！';
    Sound.sfx('heave', counter);
    Sound.speak(word.replace('！', ''), null, { rate: 1.25, pitch: 1.25 });
    bubbleOver('jiji', word, { ms: 1100 });
    S.shake = 1;
    S.bump = 10 + power * 3;
    dust(150, Art.GROUND, 5 + power * 2);
    if (fingers >= 2) showBadge(`👆×${fingers}  ちから ${fingers}ばい！`);
    const have = st.goal === 'out' ? total : counter;
    if (st.goal === 'out') setMeter(Math.min(total, st.need), st.need);
    else if (S.kabu) S.kabu.tlift = Math.min(10, counter * 4);
    if (have < st.need) return;

    busy = true;
    Pull.detach();
    S.pullT = 0;
    artEl._power = 0;
    if (st.goal === 'fail') {
      setTimeout(() => {
        Sound.sfx('nope');
        S.kabu.tlift = 0;
        bubbleOver('jiji', 'ぬけない…', { ms: 1600 });
        fx('<text class="sweat" x="245" y="210" font-size="30">💦</text>', 1400);
        busy = false;
        finishStep();
      }, 450);
      return;
    }
    popOut();
  }

  // すっぽーん！ → すってんころりん → ばんざい
  function popOut() {
    const kb = S.kabu;
    kb.fast = true;
    kb.tlift = 190;
    kb.trot = -14;
    Sound.sfx('pop');
    dust(150, Art.GROUND, 16);
    stars(150, 240, 10, '⭐');
    Story.ORDER.forEach((id, i) => {
      setTimeout(() => {
        const c = S.chars[id];
        c.tx = Story.SLOT[id] + 34;
        c.tlean = 78;
      }, 120 + i * 70);
    });
    setTimeout(() => Sound.sfx('tumble'), 350);
    setTimeout(() => {
      Story.ORDER.forEach((id) => fx(Art.bubble(S.chars[id].tx + 10, Art.GROUND - 40, '💫', { cls: 'dizzy' }), 900));
    }, 700);
    setTimeout(() => {
      kb.fast = false;
      kb.tlift = 166;
      kb.trot = -6;
      Story.ORDER.forEach((id, i) => {
        const c = S.chars[id];
        c.tlean = 0;
        c.tx = Story.SLOT[id] + 20;
        setTimeout(() => setPose(id, 'cheer'), i * 90);
      });
      IN_CHAIN.clear();
      Sound.sfx('fanfare');
      stars(400, 200, 12, '🎉');
      save.finished = (save.finished || 0) + 1;
      busy = false;
      finishStep();
    }, 1900);
  }

  /* ============================ ボタン ============================ */

  $('btn-prev').addEventListener('click', () => {
    Sound.sfx('tap');
    if (pageNo > 0) openPage(pageNo - 1);
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
    if (pageNo === PAGES.length - 1) {
      showEnd();
      return;
    }
    openPage(pageNo + 1);
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
    Pull.detach();
    showTitle();
  });

  function start(n) {
    Sound.unlock();
    if (save.sound) Sound.startBgm();
    show('book');
    openPage(n);
  }
  $('btn-start').addEventListener('click', () => start(0));
  $('btn-continue').addEventListener('click', () => start(save.page || 0));

  /* ============================ ひょうし・おしまい ============================ */

  function chainScene(pose, lean) {
    const chars = {};
    Story.ORDER.forEach((id) => { chars[id] = { x: Story.SLOT[id] + (pose === 'cheer' ? 20 : 0), lean, pose }; });
    return chars;
  }

  function showTitle() {
    $('coverArt').innerHTML = Art.scene({ kabu: { scale: 1, lift: 8, rot: 3 }, chars: chainScene('reach', 10) });
    const cont = save.page > 0 && save.done.indexOf(PAGES[PAGES.length - 1].id) < 0;
    $('btn-continue').classList.toggle('is-hidden', !cont);
    $('btn-continue').innerHTML = `🔖 つづき から <small>（${save.page + 1}ページ）</small>`;
    show('title');
  }

  function showEnd() {
    hush();
    Pull.detach();
    $('endArt').innerHTML = Art.scene({ kabu: { scale: 0.9, lift: 150, rot: -6 }, chars: chainScene('cheer', 0) });
    $('endCount').textContent = save.finished || 1;
    save.page = 0;
    store();
    Sound.sfx('fanfare');
    show('end');
    Sound.speak('おしまい');
  }
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

  syncToggles();
  showTitle();
})();
