(() => {
  'use strict';

  // {漢字|よみ} を <ruby> にする / ふりがなを はずした なまえ
  const rb = s => s.replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
  const plain = s => s.replace(/\{([^|}]+)\|[^}]+\}/g, '$1');

  // ── ほぞん ──
  const KEY = 'chugakko-tanken:v1';
  let save = { went: [], sound: true, line: 'blue' };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && Array.isArray(s.went)) {
      save = { went: s.went, sound: s.sound !== false, line: LINES.some(l => l.id === s.line) ? s.line : 'blue' };
    }
  } catch (e) { /* つかえなくても あそべる */ }
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} };

  // ── おと（WebAudio） ──
  let ac = null;
  const ctx = () => {
    if (!save.sound) return null;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch (e) { return null; }
  };
  const tone = (f1, f2, t0, dur, type = 'sine', vol = .18) => {
    const a = ctx(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    const t = a.currentTime + t0;
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur + .05);
  };
  const sfx = {
    poko: () => { tone(300, 900, 0, .12); tone(400, 1100, .09, .1, 'sine', .12); },
    back: () => tone(700, 300, 0, .14, 'triangle', .14),
    // キーンコーンカーンコーン
    chime: () => { [659, 523, 587, 392, 392, 587, 659, 523].forEach((f, i) => tone(f, f, i * .16 + (i > 3 ? .12 : 0), .3, 'sine', .14)); },
    undo: () => tone(400, 250, 0, .18, 'triangle', .12),
    train: () => { tone(660, 660, 0, .12, 'square', .07); tone(880, 880, .14, .16, 'square', .07); }
  };

  // ── じかんの よみかた ──
  const jifun = ([h, m]) => (h < 12 ? 'あさ ' : 'ひる ') + (h > 12 ? h - 12 : h) + 'じ' +
    (m === 30 ? 'はん' : m ? ' ' + m + ([1, 3, 4, 6, 8, 10].includes(m % 10 || 10) ? 'ぷん' : 'ふん') : '');
  const nanpun = n => {
    const h = Math.floor(n / 60), m = n % 60;
    const fun = m => m + ([1, 3, 4, 6, 8, 10].includes(m % 10 || 10) ? 'ぷん' : 'ふん');
    return h ? h + 'じかん' + (m ? ' ' + fun(m) : '') : fun(m);
  };

  // ── ひょうじ ──
  const $ = id => document.getElementById(id);
  const route = $('route'), panel = $('panel');
  let current = null, filter = 'all';

  const line = () => LINES.find(l => l.id === save.line);
  const schoolsAt = st => SCHOOLS.filter(s => s.at[st]);
  const LABEL = {};
  LINES.forEach(l => l.stations.forEach(s => { if (typeof s === 'string') LABEL[plain(s)] = s; }));
  const passes = s => filter === 'all' || (filter === 'boys' && s.boys) || (filter === 'coed' && !s.boys) ||
    (filter === 'near' && s.home.min <= 45) || (filter === 'notyet' && !save.went.includes(s.id));

  function drawLines() {
    const box = $('lines');
    box.innerHTML = '';
    LINES.forEach(l => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'linetab';
      btn.style.setProperty('--lc', l.color);
      btn.setAttribute('aria-pressed', String(l.id === save.line));
      const n = new Set(l.stations.filter(s => typeof s === 'string').flatMap(s => schoolsAt(plain(s)).map(x => x.id))).size;
      btn.innerHTML = `<span class="dot" aria-hidden="true"></span><span>${l.name}</span><small style="margin-left:auto;white-space:nowrap">🏫 ${n}こう</small>`;
      btn.addEventListener('click', () => {
        if (save.line === l.id) return;
        save.line = l.id; store(); sfx.train();
        if (current) close(true);
        drawLines(); drawRoute();
      });
      box.appendChild(btn);
    });
    $('routeBox').style.setProperty('--lc', line().color);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', line().color);
  }

  function drawRoute() {
    route.innerHTML = '';
    line().stations.forEach(s => {
      const li = document.createElement('li');
      if (typeof s !== 'string') {
        li.innerHTML = `<span class="sep">${s.sep}</span>`;
        route.appendChild(li);
        return;
      }
      const key = plain(s);
      const list = schoolsAt(key);
      li.className = 'stn' + (list.length ? ' has' : '');
      if (list.length) {
        if (!list.some(passes)) li.classList.add('dim');
        const done = list.every(x => save.went.includes(x.id));
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stn__btn';
        btn.setAttribute('aria-current', String(current === key));
        btn.innerHTML = `<span class="yu" aria-hidden="true">🏫</span><span>${rb(s)}</span><span class="num">${done ? '✅ ' : ''}${list.length}こう</span>`;
        btn.addEventListener('click', () => open(key, s));
        li.appendChild(btn);
      } else {
        li.innerHTML = `<span class="stn__name">${rb(s)}</span>`;
      }
      route.appendChild(li);
    });
  }

  function schoolCard(s, st) {
    const went = save.went.includes(s.id);
    const others = Object.keys(s.at).filter(k => k !== st);
    const el = document.createElement('article');
    el.className = 'bath' + (went ? ' went' : '');
    el.innerHTML = `
      <div class="bath__top">
        <div class="bath__icon" aria-hidden="true">${s.icon}</div>
        <div>
          <h3 class="bath__name">${rb(s.name)}</h3>
          <div class="bath__kind">${s.boys ? '👦 おとこのこの がっこう' : '👦👧 おとこのこも おんなのこも'}</div>
        </div>
      </div>
      <div class="facts">
        <span class="i" aria-hidden="true">🚉</span><span>${s.at[st]}${others.length ? '（' + others.map(k => rb(LABEL[k] || k)).join('・') + 'からも いけるよ）' : ''}</span>
        <span class="i" aria-hidden="true">🔔</span><span><b>${jifun(s.start)}</b>に がっこうが はじまるよ</span>
        <span class="i" aria-hidden="true">🏠</span><span>おうちから やく <b>${nanpun(s.home.min)}</b>（のりかえ ${s.home.change ? s.home.change + 'かい' : 'なし'}）<br>
          ${jifun(s.home.leave)}に おうちを でれば まにあうよ</span>
      </div>
      <div class="say">💬 ${s.say}</div>
      <div class="bath__btns">
        <button type="button" class="went-btn" aria-pressed="${went}">${went ? '✅ いったよ！' : '🏫 いったよ'}</button>
        <a class="gsearch" href="https://www.google.com/search?q=${encodeURIComponent(s.q)}" target="_blank" rel="noopener">🔍 おうちの ひとと しらべる</a>
      </div>
      <div class="parent">おうちの かたへ：${s.parent}</div>`;
    const btn = el.querySelector('.went-btn');
    btn.addEventListener('click', () => {
      const i = save.went.indexOf(s.id);
      if (i < 0) { save.went.push(s.id); sfx.chime(); } else { save.went.splice(i, 1); sfx.undo(); }
      store();
      const on = save.went.includes(s.id);
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? '✅ いったよ！' : '🏫 いったよ';
      el.classList.toggle('went', on);
      btn.classList.remove('pop'); void btn.offsetWidth; if (on) btn.classList.add('pop');
      drawStamps(); drawRoute();
    });
    return el;
  }

  function open(key, label) {
    current = key;
    sfx.poko();
    panel.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'panel__head';
    head.innerHTML = `<h2>🚉 ${rb(label)}</h2><button type="button" class="back">◀ もどる</button>`;
    head.querySelector('.back').addEventListener('click', () => close());
    panel.appendChild(head);
    const list = schoolsAt(key);
    const shown = list.filter(passes);
    (shown.length ? shown : list).forEach(s => panel.appendChild(schoolCard(s, key)));
    document.body.classList.add('show');
    panel.scrollTop = 0;
    drawRoute();
  }

  const HELLO = '<div class="hello"><span class="big">🏫</span>えきを えらぶと<br>ちゅうがっこうが でてくるよ</div>';
  function close(quiet) {
    if (!quiet) sfx.back();
    document.body.classList.remove('show');
    current = null;
    panel.innerHTML = HELLO;
    drawRoute();
  }

  function drawStamps() {
    const total = SCHOOLS.length;
    const n = save.went.filter(id => SCHOOLS.some(s => s.id === id)).length;
    $('stampCount').textContent = n + ' / ' + total;
    $('stampBar').style.width = (total ? n / total * 100 : 0) + '%';
  }

  function drawSound() {
    const s = $('sound');
    s.textContent = save.sound ? '🔊' : '🔇';
    s.setAttribute('aria-label', save.sound ? 'おと オン' : 'おと オフ');
  }

  $('sound').addEventListener('click', () => {
    save.sound = !save.sound; store(); drawSound();
    if (save.sound) sfx.poko();
  });

  document.querySelectorAll('.chip[data-f]').forEach(el => el.addEventListener('click', () => {
    filter = el.dataset.f; sfx.poko();
    document.querySelectorAll('.chip[data-f]').forEach(e2 => e2.setAttribute('aria-pressed', String(e2 === el)));
    drawRoute();
    if (current) {
      const s = line().stations.find(x => typeof x === 'string' && plain(x) === current);
      if (s) open(current, s); else close(true);
    }
  }));

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && current) close(); });

  drawSound();
  drawStamps();
  drawLines();
  drawRoute();
})();
