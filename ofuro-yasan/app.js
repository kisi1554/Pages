(() => {
  'use strict';

  // {漢字|よみ} を <ruby> にする / ふりがなを はずした なまえ
  const rb = s => s.replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
  const plain = s => s.replace(/\{([^|}]+)\|[^}]+\}/g, '$1');

  // ── ほぞん ──
  const KEY = 'ofuro-yasan:v1';
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
    stamp: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, i * .09, .18, 'triangle', .16)); },
    undo: () => tone(400, 250, 0, .18, 'triangle', .12),
    train: () => { tone(660, 660, 0, .12, 'square', .07); tone(880, 880, .14, .16, 'square', .07); }
  };

  // ── きょう やってる？ ──
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const isRestDay = (b, d) => {
    const r = b.rest || {};
    if (r.until && ymd(d) <= r.until) return true;
    if (r.dow && r.dow.includes(d.getDay())) return true;
    if (r.date && r.date.includes(d.getDate())) return true;
    if (r.nth && r.nth.some(x => x.dow === d.getDay() && Math.ceil(d.getDate() / 7) === x.n &&
        (!x.months || x.months.includes(d.getMonth() + 1)))) return true;
    return false;
  };
  const hoursOf = (b, d) => (b.openDow && b.openDow[d.getDay()]) || b.open;
  const hhmm = m => {
    const h = Math.floor(m / 60), mm = m % 60;
    const when = h < 12 ? 'あさ ' + h : h === 12 ? 'ひる 12' : h < 17 ? 'ひる ' + (h - 12)
      : h <= 24 ? 'よる ' + (h - 12) : (h - 24 < 5 ? 'よなか ' : 'つぎの ひの あさ ') + (h - 24);
    return when + 'じ' + (mm === 30 ? 'はん' : mm ? ' ' + mm + 'ふん' : '');
  };
  const allDay = b => b.open[0] === 0 && b.open[1] === 1440;
  const status = (b, now = new Date()) => {
    if (isRestDay(b, now)) return { cls: 'rest', text: '💤 きょうは おやすみ', open: false };
    if (allDay(b)) return { cls: 'open', text: '😊 いつでも あいてるよ', open: true };
    const [o, c] = hoursOf(b, now);
    const m = now.getHours() * 60 + now.getMinutes();
    if (m < o) {
      // よなかまで やっている おみせの 「きのうの つづき」
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const [, cy] = hoursOf(b, y);
      if (cy > 1440 && m < cy - 1440 && !isRestDay(b, y)) return { cls: 'open', text: '😊 いま あいてるよ！', open: true };
      return { cls: 'later', text: '⏰ きょうは ' + hhmm(o) + 'から', open: true };
    }
    if (m >= c) return { cls: 'rest', text: '🌙 きょうは もう おしまい', open: true };
    return { cls: 'open', text: '😊 いま あいてるよ！', open: true };
  };

  // ── ひょうじ ──
  const $ = id => document.getElementById(id);
  const route = $('route'), panel = $('panel');
  let current = null, filter = 'all', kind = 'all';

  const line = () => LINES.find(l => l.id === save.line);
  // at の キーは 'えきめい' か 'ろせんID:えきめい'（おなじ なまえの えきでも ろせんで あるく じかんが ちがう とき）
  const walkOf = (b, st, lid = save.line) => b.at[lid + ':' + st] || b.at[st];
  const bathsAt = (st, lid) => BATHS.filter(b => walkOf(b, st, lid)).sort((a, b) => !!a.adult - !!b.adult);
  const stKey = k => k.replace(/^[a-z]+:/, '');
  const LABEL = {};
  LINES.forEach(l => l.stations.forEach(s => { if (typeof s === 'string') LABEL[plain(s)] = s; }));
  // しゅるい：せんとう／スーパーせんとう（スパ・おんせん しせつも こちら）
  const isSento = b => b.kind === 'せんとう';
  const kindOK = b => kind === 'all' || (kind === 'sento') === isSento(b);
  const passes = b => kindOK(b) && (filter === 'all' || (filter === 'kids' && !b.adult) ||
    (filter === 'today' && status(b).open) || (filter === 'baby' && b.baby && !b.adult));
  const shownAt = (st, lid) => bathsAt(st, lid).filter(passes);
  const countLine = l => new Set(l.stations.filter(s => typeof s === 'string').flatMap(s => shownAt(plain(s), l.id).map(b => b.id))).size;

  function drawLines() {
    const box = $('lines');
    box.innerHTML = '';
    LINES.forEach(l => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'linetab';
      btn.style.setProperty('--lc', l.color);
      btn.setAttribute('aria-pressed', String(l.id === save.line));
      const n = countLine(l);
      btn.innerHTML = `<span class="dot" aria-hidden="true"></span><span>${l.name}<br><small>♨️ ${n}けん</small></span>`;
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
    const total = countLine(line());
    $('routeTitle').innerHTML = `♨️ の えきを おしてね <b class="hits">${total}けん</b>`;
    line().stations.forEach(s => {
      const li = document.createElement('li');
      if (typeof s !== 'string') {
        li.innerHTML = `<span class="sep">${s.sep}</span>`;
        route.appendChild(li);
        return;
      }
      const key = plain(s);
      const list = bathsAt(key);
      li.className = 'stn' + (list.length ? ' has' : '');
      if (list.length) {
        const n = list.filter(passes).length;
        if (!n) li.classList.add('dim');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stn__btn';
        btn.setAttribute('aria-current', String(current === key));
        btn.innerHTML = `<span class="yu" aria-hidden="true">♨️</span><span>${rb(s)}</span><span class="num">${n}けん</span>`;
        btn.addEventListener('click', () => open(key, s));
        li.appendChild(btn);
      } else {
        li.innerHTML = `<span class="stn__name">${rb(s)}</span>`;
      }
      route.appendChild(li);
    });
  }

  function bathCard(b, st) {
    const now = new Date();
    const sts = status(b, now);
    const went = save.went.includes(b.id);
    const [o, c] = hoursOf(b, now);
    const others = [...new Set(Object.keys(b.at).map(stKey))].filter(k => k !== st);
    const el = document.createElement('article');
    el.className = 'bath' + (went ? ' went' : '') + (b.adult ? ' only-adult' : '');
    el.innerHTML = `
      <div class="bath__top">
        <div class="bath__icon" aria-hidden="true">${b.icon}</div>
        <div>
          <h3 class="bath__name">${rb(b.name)}</h3>
          <div class="bath__kind">${b.kind}</div>
        </div>
      </div>
      <div><span class="today ${sts.cls}">${sts.text}</span>${b.adult ? `<span class="adult">🙅 こどもは はいれないよ（${b.adult}）</span>` : ''}</div>
      <div class="facts">
        <span class="i" aria-hidden="true">🚉</span><span>${walkOf(b, st)}${others.length ? '（' + others.map(k => rb(LABEL[k] || k)).join('・') + 'からも いけるよ）' : ''}</span>
        <span class="i" aria-hidden="true">🕒</span><span>${allDay(b) ? '24じかん' : hhmm(o) + ' 〜 ' + hhmm(c)}</span>
        <span class="i" aria-hidden="true">💤</span><span>おやすみ：${b.restText}</span>
        <span class="i" aria-hidden="true">🪙</span><span>${b.price}</span>
      </div>
      <div class="feat">${b.feat.map(f => `<span>${FEATURES[f]}</span>`).join('')}</div>
      <div class="say">💬 ${b.say}</div>
      <div class="bath__btns">
        ${b.adult ? '' : `<button type="button" class="went-btn" aria-pressed="${went}">${went ? '✅ いったよ！' : '♨️ いったよ'}</button>`}
        <a class="gsearch" href="https://www.google.com/search?q=${encodeURIComponent(b.q)}" target="_blank" rel="noopener">🔍 おうちの ひとと しらべる</a>
      </div>
      <div class="parent">おうちの かたへ：${b.parent}</div>`;
    const btn = el.querySelector('.went-btn');
    if (btn) btn.addEventListener('click', () => {
      const i = save.went.indexOf(b.id);
      if (i < 0) { save.went.push(b.id); sfx.stamp(); } else { save.went.splice(i, 1); sfx.undo(); }
      store();
      const on = save.went.includes(b.id);
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? '✅ いったよ！' : '♨️ いったよ';
      el.classList.toggle('went', on);
      btn.classList.remove('pop'); void btn.offsetWidth; if (on) btn.classList.add('pop');
      drawStamps();
    });
    return el;
  }

  function open(key, label) {
    current = key;
    sfx.poko();
    panel.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'panel__head';
    head.innerHTML = `<h2>♨️ ${rb(label)}</h2><button type="button" class="back">◀ もどる</button>`;
    head.querySelector('.back').addEventListener('click', () => close());
    panel.appendChild(head);
    const list = bathsAt(key);
    const shown = list.filter(passes);
    shown.forEach(b => panel.appendChild(bathCard(b, key)));
    if (!shown.length) {
      const none = document.createElement('div');
      none.className = 'hello';
      none.innerHTML = '<span class="big">🔍</span>この えきには えらんだ じょうけんの<br>おふろやさんが ないよ';
      panel.appendChild(none);
    }
    document.body.classList.add('show');
    panel.scrollTop = 0;
    drawRoute();
  }

  function close(quiet) {
    if (!quiet) sfx.back();
    document.body.classList.remove('show');
    current = null;
    panel.innerHTML = '<div class="hello"><span class="big">♨️</span>えきを えらぶと<br>おふろやさんが でてくるよ</div>';
    drawRoute();
  }

  function drawStamps() {
    const total = BATHS.filter(b => !b.adult).length;
    const n = save.went.filter(id => BATHS.some(b => b.id === id && !b.adult)).length;
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

  const refilter = () => {
    drawLines();
    drawRoute();
    if (current) {
      const s = line().stations.find(x => typeof x === 'string' && plain(x) === current);
      if (s) open(current, s); else close(true);
    }
  };
  document.querySelectorAll('.chip[data-f]').forEach(el => el.addEventListener('click', () => {
    filter = el.dataset.f; sfx.poko();
    document.querySelectorAll('.chip[data-f]').forEach(e2 => e2.setAttribute('aria-pressed', String(e2 === el)));
    refilter();
  }));
  document.querySelectorAll('.chip[data-k]').forEach(el => el.addEventListener('click', () => {
    kind = el.dataset.k; sfx.poko();
    document.querySelectorAll('.chip[data-k]').forEach(e2 => e2.setAttribute('aria-pressed', String(e2 === el)));
    refilter();
  }));

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && current) close(); });

  drawSound();
  drawStamps();
  drawLines();
  drawRoute();
})();
