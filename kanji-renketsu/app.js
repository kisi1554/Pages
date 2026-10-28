'use strict';

/* かんじ れんけつ - 画面 の きりかえ・きろく・ずかん・スタンプちょう */

const Store = (() => {
  const KEY = 'kanjiRenketsu.v1';
  const base = () => ({
    made: {},        // つくった 漢字 → かいすう
    stages: {},      // おだい の ステージ → 'clear'
    hakken: 0,       // はっけん を クリア した かず
    nikai: 0,        // 2かいだて を クリア した かず
    quiz: { n: 0, best: 0, srs: {} },  // srs: へん → { box, due }（due は クイズ の もんだい ばんごう）
    lines: {},       // 路線 → { next, stamps: [駅名] , clear }
    sound: true,
    voice: true,
  });
  let d = base();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const o = JSON.parse(raw);
        d = Object.assign(base(), o);
        d.quiz = Object.assign(base().quiz, o.quiz || {});
      }
    } catch (e) { d = base(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* ほぞん できなくても あそべる */ }
  }
  return { load, save, get d() { return d; } };
})();

const U = {
  $: (s, r) => (r || document).querySelector(s),
  $$: (s, r) => Array.from((r || document).querySelectorAll(s)),
  shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  },
  pick(a) { return a[Math.floor(Math.random() * a.length)]; },
  esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },
  isKanji(c) { return /[一-鿿㐀-䶿]/.test(c); },
  isKana(c) { return /[぀-ヿ]/.test(c); },
  // ことば に ふりがな。おくりがな など の かな は ふりがな の そと に だす
  ruby(w, y) {
    if (!y) return U.esc(w);
    const W = Array.from(w), Y = Array.from(y);
    let pre = 0;
    while (pre < W.length && pre < Y.length && U.isKana(W[pre]) && W[pre] === Y[pre]) pre++;
    let suf = 0;
    while (suf < W.length - pre && suf < Y.length - pre && U.isKana(W[W.length - 1 - suf]) && W[W.length - 1 - suf] === Y[Y.length - 1 - suf]) suf++;
    const mid = W.slice(pre, W.length - suf).join('');
    const midY = Y.slice(pre, Y.length - suf).join('');
    // まんなか に かな が まじる（時計の針 など）とき は まるごと ふりがな
    return U.esc(W.slice(0, pre).join('')) + `<ruby>${U.esc(mid)}<rt>${U.esc(midY)}</rt></ruby>` + U.esc(W.slice(W.length - suf).join(''));
  },
  kataToHira(s) { return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)); },
};

const App = (() => {
  let current = 'title';
  const onShow = {};

  function go(name) {
    if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) { /* むし */ } }
    U.$$('.screen').forEach((s) => s.classList.toggle('is-active', s.id === 'screen-' + name));
    current = name;
    window.scrollTo(0, 0);
    if (onShow[name]) onShow[name]();
  }

  function made(k) {
    const m = Store.d.made;
    const first = !m[k];
    m[k] = (m[k] || 0) + 1;
    Store.save();
    return first;
  }

  /* ---------------- 漢字 カード ---------------- */
  function partChip(role, ch) {
    const name = partName(role, ch);
    return `<span class="chip chip-${role}"><b lang="ja">${U.esc(ch)}</b>${name ? `<small>${U.esc(name)}</small>` : ''}</span>`;
  }
  function formula(e) {
    const r1 = e.kind === 'lr' ? 'L' : 'T', r2 = e.kind === 'lr' ? 'R' : 'B';
    return `${partChip(r1, e.a)}<span class="op">${e.kind === 'lr' ? '＋' : '／'}</span>${partChip(r2, e.b)}<span class="op">＝</span><b class="eq" lang="ja">${U.esc(e.k)}</b>`;
  }
  function yomiHtml(y) {
    return y.split('・').map((s) => `<span class="${/[ァ-ヶ]/.test(s) ? 'on' : 'kun'}">${U.esc(s)}</span>`).join('');
  }
  function speakKanji(e) {
    Sound.speak(`${e.ex.y}。 ${e.imi.replace(/ /g, '')}`);
  }
  function showKanji(e, opts) {
    opts = opts || {};
    U.$('#kc-grade').textContent = `${GRADE_LABEL[e.g]}${e.g <= 6 ? ' で ならう' : ''}${opts.first ? '　✨ はじめて つくった！' : ''}`;
    U.$('#kc-kanji').textContent = e.k;
    U.$('#kc-formula').innerHTML = formula(e);
    U.$('#kc-yomi').innerHTML = yomiHtml(e.yomi);
    U.$('#kc-imi').textContent = e.imi;
    U.$('#kc-ex').innerHTML = `れい：<span class="ex-word">${U.ruby(e.ex.w, e.ex.y)}</span>`;
    const bn = e.bushu.name ? `（${e.bushu.name}）` : '';
    U.$('#kc-bushu').innerHTML = `ぶしゅ：<b lang="ja">${U.esc(e.bushu.ch)}</b>${U.esc(bn)}`;
    const next = U.$('#kc-next');
    next.textContent = opts.nextLabel || 'つぎ ▶';
    const ov = U.$('#kcard');
    ov.classList.add('is-active');
    speakKanji(e);
    return new Promise((res) => {
      const done = () => { ov.classList.remove('is-active'); next.removeEventListener('click', done); res(); };
      next.addEventListener('click', done);
      setTimeout(() => next.focus({ preventScroll: true }), 50);
    });
  }

  /* ---------------- クリア ---------------- */
  function showClear(o) {
    U.$('#clear-emoji').textContent = o.emoji || '🎉';
    U.$('#clear-title').textContent = o.title;
    U.$('#clear-text').innerHTML = o.text || '';
    const box = U.$('#clear-btns');
    box.innerHTML = '';
    const ov = U.$('#clear');
    (o.buttons || []).forEach((b, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = i === 0 ? 'big-btn' : 'pill';
      el.textContent = b.label;
      el.addEventListener('click', () => { ov.classList.remove('is-active'); b.fn(); });
      box.appendChild(el);
    });
    ov.classList.add('is-active');
    Sound.play('fanfare');
  }

  /* ---------------- タイトル ---------------- */
  function renderTitle() {
    const total = KANJI_LR.length + KANJI_TB.length;
    const n = Object.keys(Store.d.made).filter((k) => KANJI_BY[k]).length;
    U.$('#zukan-count').textContent = `${n}/${total}`;
    let st = 0, all = 0;
    LINES.forEach((l) => { all += l.stations.length; st += ((Store.d.lines[l.id] || {}).stamps || []).length; });
    U.$('#stamp-count').textContent = `${st}/${all}`;
    const demo = U.$('#title-demo');
    if (!demo.childElementCount) {
      const ex = LR_BY['海'];
      demo.appendChild(Train.car({ role: 'L', ch: ex.a }));
      const p = document.createElement('span'); p.className = 'demo-op'; p.textContent = '＋'; demo.appendChild(p);
      demo.appendChild(Train.car({ role: 'R', ch: ex.b }));
      const q = document.createElement('span'); q.className = 'demo-op'; q.textContent = '＝'; demo.appendChild(q);
      demo.appendChild(Train.car({ role: 'K', ch: ex.k, label: '' }));
      demo.querySelectorAll('.car').forEach((c) => { c.removeAttribute('tabindex'); c.removeAttribute('role'); });
    }
  }
  function syncSettings() {
    Sound.enabled = Store.d.sound;
    Sound.voice = Store.d.voice;
    U.$('#btn-sound').textContent = Store.d.sound ? '🔊 おと オン' : '🔇 おと オフ';
    U.$('#btn-voice').textContent = Store.d.voice ? '🗣️ よみあげ オン' : '🤐 よみあげ オフ';
    U.$('#btn-sound').setAttribute('aria-pressed', String(Store.d.sound));
    U.$('#btn-voice').setAttribute('aria-pressed', String(Store.d.voice));
  }

  /* ---------------- ずかん ---------------- */
  function renderZukan() {
    const body = U.$('#zukan-body');
    const m = Store.d.made;
    let html = '<p class="sec-note">つくった かんじ が へん ごと に ならぶよ。れつ が ぜんぶ うまると マスター バッジ！ タップ で くわしく。</p>';
    let badges = 0;
    const rows = [];
    HEN_INFO.forEach(([ch]) => {
      const list = KANJI_LR.filter((e) => e.a === ch);
      if (list.length) rows.push({ key: ch, role: 'L', title: henLabel(ch), list, master: henLabel(ch).replace(/（.）/, '') + ' マスター' });
    });
    const other = KANJI_LR.filter((e) => !HEN[e.a]);
    rows.push({ key: 'other', role: 'L', title: 'そのほか の ひだり（つくり が ぶしゅ）', list: other, master: 'つくり マスター' });
    rows.push({ key: 'tb', role: 'T', title: '2かいだて（かんむり ＋ あし）', list: KANJI_TB, master: '2かいだて マスター' });
    let done = 0, all = 0;
    const out = rows.map((r) => {
      const got = r.list.filter((e) => m[e.k]).length;
      done += got; all += r.list.length;
      const full = got === r.list.length;
      if (full) badges++;
      const head = r.key === 'other' || r.key === 'tb'
        ? `<span class="z-hen z-hen-${r.role}">${r.key === 'tb' ? '🚌' : '➕'}</span>`
        : `<span class="z-hen z-hen-L" lang="ja">${U.esc(r.key)}</span>`;
      const cells = r.list.map((e) => m[e.k]
        ? `<button class="z-cell got" type="button" data-k="${U.esc(e.k)}" lang="ja">${U.esc(e.k)}</button>`
        : `<span class="z-cell">？</span>`).join('');
      return `<div class="z-row${full ? ' full' : ''}">
        <div class="z-head">${head}<span class="z-title">${U.esc(r.title)}</span><span class="z-num">${got}/${r.list.length}</span>
        ${full ? `<span class="badge">🏅 ${U.esc(r.master)}</span>` : ''}</div>
        <div class="z-cells">${cells}</div></div>`;
    }).join('');
    html += `<p class="z-badges">🏅 バッジ ${badges}こ</p>` + out;
    body.innerHTML = html;
    U.$('#zukan-prog').textContent = `${done}/${all}`;
    body.querySelectorAll('.z-cell.got').forEach((b) => b.addEventListener('click', () => showKanji(KANJI_BY[b.dataset.k], { nextLabel: 'とじる' })));
  }

  /* ---------------- スタンプちょう ---------------- */
  function stampHtml(line, name, cls) {
    const len = Array.from(name).length;
    const sz = len >= 6 ? ' xlong' : len >= 4 ? ' long' : '';
    return `<div class="stamp ${cls || ''}" style="--c:${line.color}">
      <span class="s-motif">🚉</span><span class="s-name${sz}">${U.esc(name)}</span><span class="s-line">${U.esc(line.name)}</span></div>`;
  }
  function renderStamps() {
    const body = U.$('#stamps-body');
    let got = 0, all = 0;
    body.innerHTML = LINES.map((l) => {
      const st = (Store.d.lines[l.id] || {}).stamps || [];
      got += st.length; all += l.stations.length;
      const cells = l.stations.map(([n]) => st.includes(n)
        ? `<div class="book-slot">${stampHtml(l, n)}</div>`
        : `<div class="book-slot empty"><span>${U.esc(n.length > 5 ? n.slice(0, 5) + '…' : n)}</span></div>`).join('');
      const clear = (Store.d.lines[l.id] || {}).clear ? '<span class="badge">🏁 ろせん クリア</span>' : '';
      return `<div class="book-line" style="--line:${l.color}">
        <div class="book-head"><span class="sym">${U.esc(l.symbol)}</span><b>${U.esc(l.name)}</b><span>${st.length}/${l.stations.length}</span>${clear}</div>
        <div class="book-grid">${cells}</div></div>`;
    }).join('');
    U.$('#stamps-prog').textContent = `${got}/${all}`;
  }

  function init() {
    Store.load();
    syncSettings();
    onShow.title = renderTitle;
    onShow.zukan = renderZukan;
    onShow.stamps = renderStamps;
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]');
      if (!b) return;
      Sound.unlock();
      Sound.play('tap');
      const to = b.dataset.go;
      if (to === 'nikai') { Game.startNikai(); return; }
      if (to === 'quiz') { Quiz.start(); return; }
      go(to);
    });
    U.$('#btn-sound').addEventListener('click', () => { Store.d.sound = !Store.d.sound; Store.save(); syncSettings(); Sound.unlock(); Sound.play('tap'); });
    U.$('#btn-voice').addEventListener('click', () => { Store.d.voice = !Store.d.voice; Store.save(); syncSettings(); if (Store.d.voice) Sound.speak('よみあげ オン'); });
    U.$('#kc-speak').addEventListener('click', () => { const k = U.$('#kc-kanji').textContent; if (KANJI_BY[k]) { const was = Sound.voice; Sound.voice = true; speakKanji(KANJI_BY[k]); Sound.voice = was; } });
    document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });
    renderTitle();
  }

  return { init, go, made, showKanji, showClear, stampHtml, onShow, renderTitle, get current() { return current; } };
})();
