'use strict';

/*
 * えほん の すすめかた（ページ めくり・よみあげ・しおり・かくれねこ・けつまつ）
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const BY_ID = {};
  PAGES.forEach((p) => { BY_ID[p.id] = p; });
  const TRUNK = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const BGM_OF = { asa: 'day', hiru: 'day', hiru2: 'day', yu1: 'yu', yu: 'yu', yugure: 'yu', yoru: 'yoru' };

  /* ============================ ほぞん ============================ */
  const KEY = 'shikake-ehon-v1';
  const save = {
    settings: { music: true, voice: true, mode: 'yonde' },
    bookmark: null,
    mike: [],
    endings: [],
  };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') {
      Object.assign(save.settings, raw.settings || {});
      save.bookmark = raw.bookmark || null;
      save.mike = Array.isArray(raw.mike) ? raw.mike.filter((id) => BY_ID[id]) : [];
      save.endings = Array.isArray(raw.endings) ? raw.endings.filter((n) => ENDINGS[n]) : [];
    }
  } catch (e) {
    /* よめなくても あそべる */
  }
  if (save.bookmark && !BY_ID[save.bookmark.page]) save.bookmark = null;
  function store() {
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch (e) {
      /* ほぞん できなくても あそべる */
    }
  }

  /* ============================ じょうたい ============================ */
  const st = {
    page: null,
    history: [],
    path1: null,
    path2: null,
    solved: new Set(),
    mode: save.settings.mode === 'jibun' ? 'jibun' : 'yonde',
  };
  let ctrl = null;
  let svgEl = null;
  let readRun = 0;
  let tapListeners = [];
  let idleTimer = 0;
  let turning = false;

  const el = {
    title: $('screen-title'), book: $('screen-book'), end: $('screen-end'),
    cover: $('coverArt'), art: $('art'), artSvg: $('artSvg'), fx: $('fx'), sparkles: $('sparkles'), artUi: $('artUi'),
    words: $('words'), spread: $('book'), prev: $('btn-prev'), next: $('btn-next'), reread: $('btn-reread'),
    place: $('placeName'), pageNo: $('pageNo'), mikeCount: $('mikeCount'), toast: $('toast'),
    tgMusic: $('tg-music'), tgVoice: $('tg-voice'), btnMusic: $('btn-music'), btnVoice: $('btn-voice'),
    cont: $('btn-continue'), titleCollect: $('titleCollect'),
    tocModal: $('modal-toc'), tocList: $('tocList'), shioriModal: $('modal-shiori'), shioriBody: $('shioriBody'),
  };

  function show(screen) {
    [el.title, el.book, el.end].forEach((s) => s.classList.toggle('is-on', s === screen));
  }

  /* ============================ ことば ============================ */
  const RUBY = /\[([^|\]]+)\|([^\]]+)\]/g;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function tokens(line) {
    return line.split(/\s+/).filter(Boolean).map((t) => ({
      html: esc(t).replace(/\[([^|\]]+)\|([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>'),
      say: t.replace(RUBY, '$2').replace(/[「」『』“”"]/g, ''),
    }));
  }

  function lineEl(line) {
    const p = document.createElement('p');
    p.className = 'line';
    tokens(line).forEach((t, i) => {
      if (i) p.appendChild(document.createTextNode(' '));
      const sp = document.createElement('span');
      sp.className = 'w';
      sp.innerHTML = t.html;
      sp.dataset.say = t.say;
      p.appendChild(sp);
    });
    return p;
  }

  function block(lines, cls) {
    const d = document.createElement('div');
    d.className = `lines ${cls}`;
    (lines || []).forEach((l) => d.appendChild(lineEl(l)));
    return d;
  }

  /* 1ぎょう を よむ。よんで いる ことば を ひからせる */
  function sayLine(p, cb) {
    const spans = [...p.querySelectorAll('.w')];
    let text = '';
    const starts = [];
    spans.forEach((s, i) => {
      if (i) text += ' ';
      starts.push(text.length);
      text += s.dataset.say;
    });
    let timer = 0;
    let byBoundary = false;
    const hl = (k) => spans.forEach((s, j) => s.classList.toggle('reading', j === k));
    const idxAt = (ci) => {
      let k = 0;
      for (let j = 0; j < starts.length; j += 1) if (starts[j] <= ci) k = j;
      return k;
    };
    Sound.speak(text, {
      onStart(rate) {
        hl(0);
        const per = 0.17 / rate;
        const t0 = performance.now();
        timer = setInterval(() => {
          if (byBoundary) return;
          hl(idxAt(((performance.now() - t0) / 1000) / per));
        }, 90);
      },
      onBoundary(ci) {
        byBoundary = true;
        hl(idxAt(ci));
      },
      onEnd() {
        clearInterval(timer);
        hl(-1);
        cb();
      },
    });
  }

  function readBlocks(blocks, cb) {
    const run = ++readRun;
    const lines = [];
    blocks.forEach((b) => b && lines.push(...b.querySelectorAll('.line')));
    let i = 0;
    const step = () => {
      if (run !== readRun) return;
      if (i >= lines.length) {
        if (cb) cb();
        return;
      }
      const ln = lines[i];
      i += 1;
      sayLine(ln, () => {
        if (run === readRun) setTimeout(step, 260);
      });
    };
    step();
  }

  function stopReading() {
    readRun += 1;
    Sound.stopSpeak();
    el.words.querySelectorAll('.reading').forEach((s) => s.classList.remove('reading'));
  }

  /* ============================ え ============================ */
  function toV(cx, cy) {
    const m = svgEl.getScreenCTM();
    const pt = svgEl.createSVGPoint();
    pt.x = cx;
    pt.y = cy;
    const r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  }
  function toC(vx, vy) {
    const m = svgEl.getScreenCTM();
    return { x: vx * m.a + m.e, y: vy * m.d + m.f };
  }
  function fit(cv) {
    const r = el.art.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    const m = svgEl.getScreenCTM();
    return [m.a * dpr, m.d * dpr, (m.e - r.left) * dpr, (m.f - r.top) * dpr];
  }

  function timeOf(page) {
    return typeof page.time === 'function' ? page.time(st) : page.time;
  }

  function drawPage(page) {
    let inner = page.draw(st);
    const mk = page.mike ? Art.mike(page.mike[0], page.mike[1], page.mike[2], page.mike[3]) : '';
    inner = inner.indexOf('<!--MIKE-->') >= 0 ? inner.replace('<!--MIKE-->', mk) : inner + mk;
    el.artSvg.innerHTML = `<svg viewBox="0 0 800 700" xmlns="http://www.w3.org/2000/svg" class="scene t-${timeOf(page)}">
      ${inner}${Art.tint(timeOf(page))}<g id="halos" pointer-events="none"></g></svg>`;
    svgEl = el.artSvg.querySelector('svg');
    const m = svgEl.querySelector('[data-mike]');
    if (m && save.mike.indexOf(page.id) >= 0) m.classList.add('seen');
  }

  /* うっすら ひかる わ（しかけ の ばしょ） */
  function refreshHalos() {
    if (!svgEl || !ctrl) return;
    const g = svgEl.querySelector('#halos');
    if (!g) return;
    g.innerHTML = ctrl.hot().map((s) => `<circle class="halo" cx="${s.x.toFixed(0)}" cy="${s.y.toFixed(0)}" r="${(s.r * 1.1).toFixed(0)}" fill="url(#halo)"/>`).join('');
  }

  function clearSparkles() {
    el.sparkles.innerHTML = '';
  }
  function showSparkles() {
    if (!ctrl || !svgEl) return;
    const box = el.art.getBoundingClientRect();
    const pts = ctrl.hints();
    if (!pts.length) return;
    el.sparkles.innerHTML = pts.slice(0, 6).map((s, i) => {
      const c = toC(s.x, s.y);
      return `<span class="spark" style="left:${(c.x - box.left).toFixed(0)}px;top:${(c.y - box.top).toFixed(0)}px;animation-delay:${i * 0.15}s">✨</span>`;
    }).join('');
  }
  function armIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showSparkles, 3000);
  }

  /* ============================ ページ ============================ */
  function pageNumber() {
    return st.history.length + 1;
  }

  function renderPage(id) {
    const page = BY_ID[id];
    if (!page) return;
    if (ctrl) ctrl.destroy();
    ctrl = null;
    tapListeners = [];
    stopReading();
    clearSparkles();
    el.artUi.innerHTML = '';
    el.fx.className = '';
    el.fx.style.display = 'none';
    st.page = id;

    drawPage(page);
    const solved = st.solved.has(id);
    const env = {
      svg: svgEl,
      art: el.art,
      toV,
      toC,
      fit,
      canvas() {
        el.fx.style.display = 'block';
        el.fx.className = solved ? 'fade' : '';
        return el.fx;
      },
      onTap(fn) {
        tapListeners.push(fn);
        return () => { tapListeners = tapListeners.filter((f) => f !== fn); };
      },
      uiButton(label, fn) {
        const b = document.createElement('button');
        b.className = 'art-btn';
        b.textContent = label;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          fn(b);
        });
        el.artUi.appendChild(b);
        return b;
      },
      sfx: (n) => Sound.sfx(n),
      interacted() {
        clearSparkles();
        armIdle();
        requestAnimationFrame(refreshHalos);
      },
      done: () => onSolved(id),
    };
    ctrl = Shikake.setup(page, env);

    /* ことば */
    el.words.innerHTML = '';
    const main = block(page.text, 'main');
    el.words.appendChild(main);
    if (page.hint) {
      const h = document.createElement('p');
      h.className = 'hint';
      h.innerHTML = `👆 ${tokens(page.hint).map((t) => t.html).join(' ')}`;
      el.words.appendChild(h);
    }
    const after = block(page.after, 'after');
    const tease = block(page.tease ? [page.tease] : [], 'tease');
    el.words.appendChild(after);
    el.words.appendChild(tease);
    const showAfter = solved || !ctrl.required;
    after.classList.toggle('is-hidden', !(solved && page.after));
    tease.classList.toggle('is-hidden', !showAfter);
    el.words.querySelector('.hint')?.classList.toggle('is-hidden', solved && ctrl.required);

    /* えらぶ ボタン */
    if (page.shikake && page.shikake.kind === 'choice') {
      const box = document.createElement('div');
      box.className = 'choices';
      page.shikake.options.forEach((o, i) => {
        const b = document.createElement('button');
        b.className = `choice c${i}`;
        b.innerHTML = `<span class="ci">${o.icon}</span><span>${o.label}</span>`;
        b.addEventListener('click', () => choose(page, o));
        box.appendChild(b);
      });
      el.words.appendChild(box);
    }
    el.words.scrollTop = 0;

    /* したの ボタン */
    updateNav();
    el.place.textContent = page.place;
    el.pageNo.textContent = `${pageNumber()} ページめ`;

    /* おと */
    Sound.playBgm(BGM_OF[timeOf(page)] || 'day');

    /* しおり */
    save.bookmark = { page: id, history: st.history.slice(), path1: st.path1, path2: st.path2, solved: [...st.solved], mode: st.mode };
    store();

    requestAnimationFrame(refreshHalos);
    armIdle();

    if (st.mode === 'yonde') {
      const blocks = [main];
      if (solved && page.after) blocks.push(after);
      if (showAfter) blocks.push(tease);
      readBlocks(blocks);
    }
  }

  function updateNav() {
    const page = BY_ID[st.page];
    const isChoice = page.shikake && page.shikake.kind === 'choice';
    const solved = st.solved.has(st.page) || !ctrl.required;
    el.prev.classList.toggle('is-hidden', st.history.length === 0);
    el.next.classList.toggle('is-hidden', isChoice);
    el.next.classList.toggle('locked', !solved);
    el.next.classList.toggle('ready', solved);
    el.next.innerHTML = page.ending ? (solved ? 'おしまい ▶' : '🔒 おしまい') : (solved ? 'つぎ ▶' : '🔒 つぎ');
    el.next.setAttribute('aria-label', solved ? 'つぎ の ページ' : 'しかけ を さわってね');
  }

  function onSolved(id) {
    if (id !== st.page || st.solved.has(id)) return;
    st.solved.add(id);
    const page = BY_ID[id];
    const after = el.words.querySelector('.after');
    const tease = el.words.querySelector('.tease');
    if (page.after) {
      after.classList.remove('is-hidden');
      after.classList.add('pop-in');
    }
    tease.classList.remove('is-hidden');
    tease.classList.add('pop-in');
    el.words.querySelector('.hint')?.classList.add('is-hidden');
    updateNav();
    clearSparkles();
    requestAnimationFrame(refreshHalos);
    setTimeout(() => {
      const target = page.after ? after : tease;
      if (target && target.scrollIntoView) target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 60);
    save.bookmark = { page: id, history: st.history.slice(), path1: st.path1, path2: st.path2, solved: [...st.solved], mode: st.mode };
    store();
    if (st.mode === 'yonde') setTimeout(() => readBlocks([page.after ? after : null, tease]), 700);
  }

  function choose(page, o) {
    if (turning) return;
    Object.assign(st, o.set || {});
    st.solved.add(page.id);
    Sound.sfx('choose');
    const nx = typeof o.next === 'function' ? o.next(st) : o.next;
    turn(nx, 1);
  }

  function turn(id, dir) {
    if (turning) return;
    stopReading();
    if (dir > 0) st.history.push(st.page);
    Sound.sfx('page');
    turning = true;
    el.spread.classList.remove('turn-in', 'turn-in-back');
    el.spread.classList.add(dir > 0 ? 'turn-out' : 'turn-out-back');
    setTimeout(() => {
      el.spread.classList.remove('turn-out', 'turn-out-back');
      renderPage(id);
      el.spread.classList.add(dir > 0 ? 'turn-in' : 'turn-in-back');
      turning = false;
      setTimeout(() => el.spread.classList.remove('turn-in', 'turn-in-back'), 400);
    }, 240);
  }

  function goNext() {
    const page = BY_ID[st.page];
    if (!page || turning) return;
    const solved = st.solved.has(st.page) || !ctrl.required;
    if (!solved) {
      Sound.sfx('nope');
      el.next.classList.remove('shake');
      void el.next.offsetWidth;
      el.next.classList.add('shake');
      showSparkles();
      return;
    }
    if (page.ending) {
      finishBook(page.ending);
      return;
    }
    const nx = typeof page.next === 'function' ? page.next(st) : page.next;
    if (nx) turn(nx, 1);
  }

  function goPrev() {
    if (!st.history.length || turning) return;
    const id = st.history.pop();
    if (id === 'p7') st.path1 = null;
    if (id === 'p11') st.path2 = null;
    turn(id, -1);
  }

  /* ============================ はじめる ============================ */
  function begin(opts) {
    Sound.unlock();
    st.history = opts.history || [];
    st.path1 = opts.path1 || null;
    st.path2 = opts.path2 || null;
    st.solved = new Set(opts.solved || []);
    if (opts.mode) {
      st.mode = opts.mode;
      save.settings.mode = opts.mode;
    }
    show(el.book);
    closeModals();
    el.spread.classList.remove('turn-out', 'turn-in', 'turn-out-back', 'turn-in-back');
    turning = false;
    renderPage(opts.page || 'p1');
  }

  function toTitle() {
    stopReading();
    if (ctrl) ctrl.destroy();
    ctrl = null;
    clearTimeout(idleTimer);
    Sound.playBgm('day');
    drawCover();
    refreshTitle();
    show(el.title);
  }

  /* ============================ おしまい ============================ */
  function finishBook(n) {
    stopReading();
    if (save.endings.indexOf(n) < 0) save.endings.push(n);
    save.bookmark = null;
    store();
    if (ctrl) ctrl.destroy();
    ctrl = null;
    clearTimeout(idleTimer);
    const e = ENDINGS[n];
    $('endIcon').textContent = e.icon;
    $('endTitle').textContent = `けつまつ ${'①②③'[n - 1]}「${e.title}」`;
    $('endCount').textContent = save.endings.length;
    $('endList').innerHTML = [1, 2, 3].map((k) => {
      const f = save.endings.indexOf(k) >= 0;
      const E = ENDINGS[k];
      return `<div class="end-item ${f ? 'got' : ''} ${k === n ? 'now' : ''}">
        <span class="ei">${f ? E.icon : '？'}</span>
        <span class="et">${f ? E.title : 'まだ みつけて いない よ'}</span>
        <span class="eh">${f ? E.how : ''}</span></div>`;
    }).join('');
    $('endHint').textContent = save.endings.length >= 3
      ? 'すごい！ ぜんぶ の けつまつ を みつけたね！'
      : 'わかれみち で ちがう ほう を えらぶと、 べつの おわり に なるよ。';
    $('endMike').textContent = `かくれねこ みけ: ${save.mike.length} / ${PAGES.length}`;
    Sound.playBgm(n === 3 ? 'yoru' : 'yu');
    Sound.sfx('ok');
    setTimeout(() => Sound.sfx('sparkle'), 700);
    show(el.end);
    if (st.mode === 'yonde') {
      setTimeout(() => Sound.speak(`おしまい。 ${e.title.replace(/\s+/g, '')}。 みつけた けつまつ は、 ${save.endings.length}こ。`), 600);
    }
  }

  /* ============================ もくじ・しおり ============================ */
  function trunkSolved(extra) {
    return TRUNK.concat(extra || []);
  }

  function tocItems() {
    const items = [
      { icon: '📖', label: 'はじめ から', go: () => begin({ page: 'p1' }) },
      { icon: '🔀', label: 'わかれみち 1「でんしゃ？ ふね？」', go: () => begin({ page: 'p7', history: TRUNK.slice(), solved: trunkSolved() }) },
      {
        icon: '🚃', label: 'わかれみち 2（でんしゃ で きた）',
        go: () => begin({ page: 'p11', path1: 'densha', history: TRUNK.concat(['p7', 'p8t', 'p9t', 'p10']), solved: trunkSolved(['p7', 'p8t', 'p9t', 'p10']) }),
      },
      {
        icon: '⛵', label: 'わかれみち 2（ふね で きた）',
        go: () => begin({ page: 'p11', path1: 'fune', history: TRUNK.concat(['p7', 'p8f', 'p9f', 'p10']), solved: trunkSolved(['p7', 'p8f', 'p9f', 'p10']) }),
      },
    ];
    const ROUTE = {
      1: { path1: 'fune', mid: ['p7', 'p8f', 'p9f', 'p10', 'p11'] },
      2: { path1: 'densha', mid: ['p7', 'p8t', 'p9t', 'p10', 'p11'] },
      3: { path1: 'densha', mid: ['p7', 'p8t', 'p9t', 'p10', 'p11'] },
    };
    [1, 2, 3].forEach((n) => {
      const f = save.endings.indexOf(n) >= 0;
      const E = ENDINGS[n];
      const r = ROUTE[n];
      items.push({
        icon: f ? E.icon : '🔒',
        label: f ? `けつまつ ${'①②③'[n - 1]} ${E.title}` : `けつまつ ${'①②③'[n - 1]} ？？？`,
        locked: !f,
        go: () => begin({
          page: E.page, path1: r.path1, path2: n === 3 ? 'matsu' : 'kamome',
          history: TRUNK.concat(r.mid), solved: trunkSolved(r.mid),
        }),
      });
    });
    return items;
  }

  function openToc() {
    Sound.unlock();
    Sound.sfx('pop');
    el.tocList.innerHTML = '';
    tocItems().forEach((it) => {
      const b = document.createElement('button');
      b.className = `toc-item ${it.locked ? 'locked' : ''}`;
      b.innerHTML = `<span class="ti">${it.icon}</span><span>${it.label}</span>`;
      b.addEventListener('click', () => {
        if (it.locked) {
          Sound.sfx('nope');
          return;
        }
        it.go();
      });
      el.tocList.appendChild(b);
    });
    el.tocModal.classList.add('is-on');
  }

  function openShiori() {
    Sound.unlock();
    Sound.sfx('pop');
    const cells = PAGES.map((p, i) => {
      const f = save.mike.indexOf(p.id) >= 0;
      return `<div class="stamp ${f ? 'got' : ''}"><span class="sn">${i + 1}</span><span class="sm">${f ? '🐱' : '？'}</span><span class="sp">${p.place}</span></div>`;
    }).join('');
    const ends = [1, 2, 3].map((k) => {
      const f = save.endings.indexOf(k) >= 0;
      return `<span class="mini-end ${f ? 'got' : ''}">${f ? ENDINGS[k].icon : '？'}</span>`;
    }).join('');
    el.shioriBody.innerHTML = `
      <p class="shiori-lead">ページ の どこか に ねこ の「みけ」が かくれて いるよ。 みつけると スタンプ が ぽん！</p>
      <p class="shiori-count">🐱 ${save.mike.length} / ${PAGES.length}　　みつけた けつまつ ${ends} ${save.endings.length} / 3</p>
      <div class="stamps">${cells}</div>`;
    el.shioriModal.classList.add('is-on');
  }

  function closeModals() {
    el.tocModal.classList.remove('is-on');
    el.shioriModal.classList.remove('is-on');
  }

  /* ============================ かくれねこ ============================ */
  let toastTimer = 0;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('is-on'), 2200);
  }

  function foundMike(m) {
    m.classList.remove('jump');
    void m.getBoundingClientRect();
    m.classList.add('jump');
    Sound.sfx('meow');
    if (save.mike.indexOf(st.page) < 0) {
      save.mike.push(st.page);
      store();
      m.classList.add('seen');
      setTimeout(() => Sound.sfx('stamp'), 350);
      toast(`みけ を みつけた！ スタンプ ぽん！ 🐾 ${save.mike.length} / ${PAGES.length}`);
      updateCounts();
      if (st.mode === 'yonde') Sound.speak('みけ を みつけた！');
    }
  }

  function updateCounts() {
    el.mikeCount.textContent = save.mike.length;
  }

  /* ============================ タップ ============================ */
  el.art.addEventListener('click', (e) => {
    if (!svgEl) return;
    const t = e.target;
    let m = t.closest && t.closest('[data-mike]');
    /* みけ は ものかげ に いるので、あたま の ちかく を さわれば みつけた ことに する */
    const pg = BY_ID[st.page];
    if (!m && pg && pg.mike) {
      const v = toV(e.clientX, e.clientY);
      const s = pg.mike[2] || 1;
      if (Math.hypot(v.x - pg.mike[0], v.y - (pg.mike[1] - 24 * s)) < 40 * s + 8) m = svgEl.querySelector('[data-mike]');
    }
    if (m) {
      foundMike(m);
      return;
    }
    const tap = t.closest && t.closest('[data-tap]');
    if (!tap) return;
    tap.classList.remove('go');
    void tap.getBoundingClientRect();
    tap.classList.add('go', 'on');
    Sound.sfx(tap.dataset.sfx || 'pop');
    const key = tap.dataset.key || null;
    tapListeners.slice().forEach((fn) => fn(key, tap));
    clearSparkles();
    armIdle();
    requestAnimationFrame(refreshHalos);
  });
  el.art.addEventListener('pointerdown', () => {
    Sound.unlock();
    clearSparkles();
    armIdle();
  });

  el.words.addEventListener('click', (e) => {
    const w = e.target.closest && e.target.closest('.w');
    if (!w) return;
    stopReading();
    w.classList.add('reading');
    if (!Sound.isVoiceOn() || !Sound.ttsSupported()) {
      Sound.sfx('word');
      setTimeout(() => w.classList.remove('reading'), 400);
      return;
    }
    Sound.speak(w.dataset.say, { onEnd: () => w.classList.remove('reading') });
  });

  /* ============================ ボタン ============================ */
  el.next.addEventListener('click', goNext);
  el.prev.addEventListener('click', goPrev);
  el.reread.addEventListener('click', () => {
    Sound.unlock();
    const blocks = [...el.words.querySelectorAll('.lines')].filter((b) => !b.classList.contains('is-hidden'));
    readBlocks(blocks);
  });
  $('btn-home').addEventListener('click', toTitle);
  $('btn-mike').addEventListener('click', openShiori);
  $('btn-yonde').addEventListener('click', () => begin({ page: 'p1', mode: 'yonde' }));
  $('btn-jibun').addEventListener('click', () => begin({ page: 'p1', mode: 'jibun' }));
  el.cont.addEventListener('click', () => {
    const b = save.bookmark;
    if (!b) return;
    begin({ page: b.page, history: b.history, path1: b.path1, path2: b.path2, solved: b.solved, mode: b.mode });
  });
  $('btn-toc').addEventListener('click', openToc);
  $('btn-shiori').addEventListener('click', openShiori);
  $('btn-end-toc').addEventListener('click', openToc);
  $('btn-end-again').addEventListener('click', () => begin({ page: 'p1' }));
  $('btn-end-home').addEventListener('click', toTitle);
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModals));
  [el.tocModal, el.shioriModal].forEach((m) => m.addEventListener('click', (e) => {
    if (e.target === m) closeModals();
  }));

  function setToggle(btn, on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    const b = btn.querySelector('b');
    if (b) b.textContent = on ? 'オン' : 'オフ';
    btn.classList.toggle('is-off', !on);
  }
  function applySettings() {
    Sound.setMusic(save.settings.music);
    Sound.setVoice(save.settings.voice);
    setToggle(el.tgMusic, save.settings.music);
    setToggle(el.tgVoice, save.settings.voice);
    setToggle(el.btnMusic, save.settings.music);
    setToggle(el.btnVoice, save.settings.voice);
  }
  const flipMusic = () => {
    save.settings.music = !save.settings.music;
    store();
    applySettings();
    Sound.sfx('pop');
  };
  const flipVoice = () => {
    save.settings.voice = !save.settings.voice;
    store();
    applySettings();
    Sound.sfx('pop');
  };
  el.tgMusic.addEventListener('click', flipMusic);
  el.btnMusic.addEventListener('click', flipMusic);
  el.tgVoice.addEventListener('click', flipVoice);
  el.btnVoice.addEventListener('click', flipVoice);

  document.addEventListener('keydown', (e) => {
    if (!el.book.classList.contains('is-on')) return;
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
  });

  let rz = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      if (ctrl && el.book.classList.contains('is-on')) {
        ctrl.resize();
        refreshHalos();
        clearSparkles();
      }
    }, 120);
  });

  /* ============================ ひょうし ============================ */
  function drawCover() {
    el.cover.innerHTML = `<svg viewBox="0 120 800 520" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      ${Art.sky('asa')}${Art.cloud(200, 190, 0.8)}${Art.cloud(620, 260, 0.6)}
      ${Art.hills('#b6e39a', '#8fd16a')}
      ${Art.tree(690, 520, 1.0)}
      ${Art.mike(110, 520, 0.7)}${Art.bush(110, 540, 0.9)}
      <path d="M440 330 q60 -40 120 -60 M450 360 q70 -30 130 -40" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".85"/>
      <g class="amb-float">${Art.hat(600, 230, 0.75, 24)}</g>
      ${Art.flower(250, 590, '#ff8fab')}${Art.flower(540, 610, '#ffd43b')}
      ${Art.pokke(380, 640, 1.0, { reach: true, mouth: 'o' })}
    </svg>`;
  }

  function refreshTitle() {
    const b = save.bookmark;
    el.cont.classList.toggle('is-hidden', !b);
    if (b) el.cont.innerHTML = `🔖 つづき から <small>（${BY_ID[b.page].place}）</small>`;
    el.titleCollect.innerHTML = `みつけた けつまつ <b>${save.endings.length}</b> / 3　・　かくれねこ 🐱 <b>${save.mike.length}</b> / ${PAGES.length}`;
    updateCounts();
  }

  $('defsInner').innerHTML = Art.defs();
  applySettings();
  drawCover();
  refreshTitle();

  /* じどう テスト よう（つかわなくても あそべる） */
  window.Ehon = {
    state: st,
    save,
    info: () => ({
      page: st.page,
      kind: (BY_ID[st.page] && BY_ID[st.page].shikake && BY_ID[st.page].shikake.kind) || 'tap',
      solved: st.page ? st.solved.has(st.page) || (ctrl && !ctrl.required) : false,
      auto: ctrl ? ctrl.auto() : null,
      mike: (() => {
        const pg = BY_ID[st.page];
        if (!svgEl || !pg || !pg.mike) return null;
        return toC(pg.mike[0], pg.mike[1] - 24 * (pg.mike[2] || 1));
      })(),
      screen: el.end.classList.contains('is-on') ? 'end' : el.book.classList.contains('is-on') ? 'book' : 'title',
    }),
  };
})();
