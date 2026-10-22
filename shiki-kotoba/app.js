"use strict";

(() => {
  const { WORDS, PIECES, SEASONS, GENRES } = SK_DATA;
  const $ = (id) => document.getElementById(id);
  const BY = Object.fromEntries(WORDS.map((w) => [w.id, w]));
  const FOUR = ['h', 'n', 'a', 'f'];

  // ---- ほぞん（localStorage） ------------------------------------
  const KEY = 'shiki-kotoba-v1';
  let save = { seen: {}, haiku: [], best: {}, sound: true, voice: true };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') save = Object.assign(save, s);
  } catch (e) {}
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
  function meet(w) {
    if (!save.seen[w.id]) { save.seen[w.id] = 1; store(); }
  }

  // ---- こまかい どうぐ --------------------------------------------
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sName = (k) => SEASONS[k].name;
  function ruby(w) { return w.kanji ? `<ruby>${esc(w.kanji)}<rt>${esc(w.kana)}</rt></ruby>` : ''; }
  function kigoText(w) {
    if (w.kigoSplit) return 'なつ と あき（どちらも ある）';
    if (!w.kigo) return 'きご では ない';
    return sName(w.kigo);
  }
  const differs = (w) => !!w.kigo && w.kigo !== w.life;
  let timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function toast(msg, ms) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { t.hidden = true; }, ms || 1800);
  }
  function modal(html) { $('modalBody').innerHTML = html; $('modal').hidden = false; }
  $('modalClose').onclick = () => { $('modal').hidden = true; Voice.cancel(); };
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('modalClose').onclick(); });

  // ---- おと オン/オフ ----------------------------------------------
  function paintToggles() {
    $('soundBtn').textContent = save.sound ? '🔊' : '🔇';
    $('voiceBtn').textContent = save.voice ? '🗣️' : '🤐';
    $('voiceBtn').hidden = !Voice.has;
    $('soundBtn').setAttribute('aria-pressed', save.sound);
    $('voiceBtn').setAttribute('aria-pressed', save.voice);
  }
  Snd.on = save.sound; Voice.on = save.voice; paintToggles();
  $('soundBtn').onclick = () => { save.sound = !save.sound; Snd.on = save.sound; store(); paintToggles(); Snd.tap(); };
  $('voiceBtn').onclick = () => { save.voice = !save.voice; Voice.on = save.voice; store(); paintToggles(); };
  document.addEventListener('pointerdown', () => { Snd.unlock(); Voice.unlock(); }, { capture: true });

  // ---- がめん きりかえ --------------------------------------------
  const TITLES = { home: 'しきの ことば', box: 'きせつの はこ', karuta: 'きせつ カルタ', quiz: 'はいくの きせつ', haiku: 'はいく を つくろう', zukan: 'ことば ずかん' };
  const START = {};
  let cur = 'home';
  function go(name) {
    clearTimers(); Voice.cancel();
    document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== name; });
    $('barTitle').textContent = TITLES[name];
    $('backBtn').hidden = name === 'home';
    document.body.dataset.screen = name;
    cur = name;
    if (START[name]) START[name]();
    if (name === 'home') paintHome();
    window.scrollTo(0, 0);
  }
  $('backBtn').onclick = () => { Snd.tap(); go('home'); };
  document.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => { Snd.tap(); go(b.dataset.go); }; });
  function paintHome() {
    const n = WORDS.filter((w) => save.seen[w.id]).length;
    $('zukanCount').textContent = `であった ことば ${n} / ${WORDS.length}`;
  }

  /* segmented ボタン。えらぶと cb(value) */
  function seg(el, cb) {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !el.contains(b)) return;
      el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      Snd.tap();
      cb(b.dataset.v || b.dataset.rule);
    });
  }
  const segVal = (el) => { const b = el.querySelector('button.on'); return b.dataset.v || b.dataset.rule; };

  function cardHTML(w, cls) {
    return `<div class="wcard ${cls || ''}"><div class="art">${Art.html(w.art)}</div>
      <div class="kana" style="--n:${w.kana.length}">${esc(w.kana)}</div><div class="kanji">${ruby(w)}</div></div>`;
  }
  function stars(ok, n) {
    const r = ok / n;
    return r >= 0.9 ? '⭐⭐⭐' : r >= 0.6 ? '⭐⭐' : '⭐';
  }
  function resultHTML(title, ok, n, extra) {
    return `<div class="result"><div class="r-stars">${stars(ok, n)}</div><h2>${title}</h2>
      <p class="r-score">${n}もん ちゅう <b>${ok}</b>もん せいかい</p>${extra || ''}</div>`;
  }

  // =================================================================
  // 1. きせつの はこ
  // =================================================================
  const box = { rule: 'life', list: [], i: 0, ok: 0, busy: false };
  const BOX_N = 10;
  $('boxes').innerHTML = FOUR.map((k) => `<button class="sbox" data-s="${k}" style="--c:${SEASONS[k].color};--t:${SEASONS[k].tint}">
      <span class="sb-art">${SEASONS[k].art}</span><span class="sb-name">${sName(k)}</span></button>`).join('');
  seg($('boxRule'), (v) => { box.rule = v; boxStart(); });
  function boxSeason(w) { return box.rule === 'kigo' ? w.kigo : w.life; }
  function boxStart() {
    let pool = WORDS.filter((w) => FOUR.includes(boxSeason(w)));
    if (box.rule === 'kigo') {     // ずれる ことば を すこし おおめに
      const d = shuffle(pool.filter(differs)).slice(0, 3);
      pool = d.concat(shuffle(pool.filter((w) => !d.includes(w))).slice(0, BOX_N - d.length));
    }
    box.list = shuffle(pool).slice(0, BOX_N);
    box.i = 0; box.ok = 0;
    $('boxAsk').textContent = box.rule === 'kigo' ? 'はいく では どの きせつ？' : 'どの きせつ の ことば かな？';
    $('boxes').hidden = false;
    boxShow();
  }
  START.box = boxStart;
  function boxProg() {
    $('boxProg').innerHTML = box.list.map((_, i) => `<i class="${i < box.i ? 'done' : i === box.i ? 'now' : ''}"></i>`).join('');
  }
  function boxShow() {
    box.busy = false;
    boxProg();
    $('boxFeed').innerHTML = '';
    document.querySelectorAll('.sbox').forEach((b) => b.classList.remove('hint', 'bounce'));
    if (box.i >= box.list.length) {
      $('cardSlot').innerHTML = resultHTML('おしまい！', box.ok, box.list.length,
        `<div class="r-btns"><button class="big" id="boxAgain">もういちど</button></div>`);
      $('boxes').hidden = true;
      $('boxAsk').textContent = '';
      Snd.fanfare();
      $('boxAgain').onclick = () => { Snd.tap(); boxStart(); };
      return;
    }
    const w = box.list[box.i];
    meet(w);
    $('cardSlot').innerHTML = cardHTML(w, 'drag');
    makeDraggable($('cardSlot').firstElementChild);
  }
  function makeDraggable(card) {
    let sx = 0, sy = 0, id = null, moved = false;
    card.addEventListener('pointerdown', (e) => {
      if (box.busy) return;
      id = e.pointerId; sx = e.clientX; sy = e.clientY; moved = false;
      card.setPointerCapture(id);
      card.classList.add('dragging');
    });
    card.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 20}deg)`;
      const t = boxAt(e.clientX, e.clientY, card);
      document.querySelectorAll('.sbox').forEach((b) => b.classList.toggle('over', b === t));
    });
    const up = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      card.classList.remove('dragging');
      const t = moved ? boxAt(e.clientX, e.clientY, card) : null;
      document.querySelectorAll('.sbox').forEach((b) => b.classList.remove('over'));
      if (t) { boxAnswer(t.dataset.s, t); return; }
      card.style.transform = '';
      if (!moved) toast('したの はこを タップ しても いいよ');
    };
    card.addEventListener('pointerup', up);
    card.addEventListener('pointercancel', up);
  }
  function boxAt(x, y, card) {
    card.style.visibility = 'hidden';
    const el = document.elementFromPoint(x, y);
    card.style.visibility = '';
    return el && el.closest('.sbox');
  }
  $('boxes').addEventListener('click', (e) => {
    const b = e.target.closest('.sbox');
    if (b) boxAnswer(b.dataset.s, b);
  });
  function flyTo(card, target) {
    const a = card.getBoundingClientRect(), b = target.getBoundingClientRect();
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    card.style.transition = 'transform .45s ease-in, opacity .45s';
    card.style.transform = `translate(${dx}px, ${dy}px) scale(.2)`;
    card.style.opacity = '0';
  }
  function boxAnswer(s, btn) {
    if (box.busy || box.i >= box.list.length) return;
    box.busy = true;
    const w = box.list[box.i];
    const right = boxSeason(w);
    const card = $('cardSlot').querySelector('.wcard');
    if (s === right) {
      box.ok++;
      Snd.season[s]();
      flyTo(card, btn);
      btn.classList.add('bounce');
      let msg = `⭕ ${sName(s)}！ ${esc(w.desc)}`;
      if (box.rule === 'life' && differs(w)) msg += `<br><small>🔁 でも はいく では ${sName(w.kigo)}</small>`;
      $('boxFeed').innerHTML = msg;
      later(() => { box.i++; boxShow(); }, differs(w) ? 2600 : 1700);
    } else {
      Snd.ng();
      card.style.transform = '';
      card.classList.add('shake');
      const ok = document.querySelector(`.sbox[data-s="${right}"]`);
      ok.classList.add('hint');
      let msg = `これは <b>${sName(right)}</b> の ことば。${esc(w.desc)}`;
      if (box.rule === 'kigo' && differs(w)) msg = `はいく では <b>${sName(right)}</b>。（くらし では ${sName(w.life)}）<br><small>${esc(w.why)}</small>`;
      $('boxFeed').innerHTML = `${msg}<br><button class="next" id="boxNext">つぎへ ▶</button>`;
      $('boxNext').onclick = () => { Snd.tap(); box.i++; boxShow(); };
    }
  }

  // =================================================================
  // 2. きせつ カルタ
  // =================================================================
  const kar = { list: [], order: [], i: 0, me: 0, cpu: 0, cpuLv: 0, lock: 0, live: false, cpuT: null };
  const K_N = 8;
  seg($('kSeason'), () => {});
  seg($('kCpu'), () => {});
  START.karuta = () => { $('karutaSetup').hidden = false; $('karutaPlay').hidden = true; };
  $('kStart').onclick = () => {
    Snd.tap();
    const s = segVal($('kSeason'));
    kar.cpuLv = +segVal($('kCpu'));
    const pool = shuffle(WORDS.filter((w) => s === 'all' || w.life === s));
    // おなじ え が ならばない ように
    const used = new Set(); kar.list = [];
    for (const w of pool) {
      if (used.has(w.art)) continue;
      used.add(w.art); kar.list.push(w);
      if (kar.list.length === K_N) break;
    }
    kar.order = shuffle(kar.list);
    kar.i = 0; kar.me = 0; kar.cpu = 0; kar.lock = 0;
    $('karutaSetup').hidden = true; $('karutaPlay').hidden = false;
    $('kTable').innerHTML = kar.list.map((w) => `<button class="fuda" data-id="${esc(w.id)}">
        <span class="f-head">${esc(w.kana[0])}</span><span class="art">${Art.html(w.art)}</span>
        <span class="f-kana">${esc(w.kana)}</span></button>`).join('');
    kScore();
    later(kRead, 500);
  };
  function kScore() {
    $('kScore').innerHTML = kar.cpuLv ? `<span>🧒 ${kar.me}</span><span>🤖 ${kar.cpu}</span>` : `<span>🧒 ${kar.me}</span>`;
  }
  function kRead() {
    clearTimeout(kar.cpuT);
    if (kar.i >= kar.order.length) return kEnd();
    const w = kar.order[kar.i];
    kar.live = true;
    $('yomifuda').innerHTML = `<span class="y-head">${esc(w.yomi[0])}</span><span class="y-text">${esc(w.yomi)}</span>`;
    $('yomifuda').classList.remove('pop'); void $('yomifuda').offsetWidth; $('yomifuda').classList.add('pop');
    Voice.say(w.yomi, () => {
      if (!kar.live || kar.order[kar.i] !== w || !kar.cpuLv || cur !== 'karuta') return;
      const wait = kar.cpuLv === 1 ? 4500 + Math.random() * 2500 : 1600 + Math.random() * 1400;
      kar.cpuT = later(() => kTake(w, 'cpu'), wait);
    });
  }
  $('kAgain').onclick = () => { const w = kar.order[kar.i]; if (w && kar.live) Voice.say(w.yomi); };
  $('kTable').addEventListener('click', (e) => {
    const b = e.target.closest('.fuda');
    if (!b || b.classList.contains('taken') || !kar.live) return;
    if (Date.now() < kar.lock) return;
    const w = kar.order[kar.i];
    if (b.dataset.id === w.id) kTake(w, 'me');
    else {
      Snd.ng();
      b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
      toast('おてつき！ ちょっと まってね', 1200);
      kar.lock = Date.now() + 1200;
    }
  });
  function kTake(w, who) {
    if (!kar.live || kar.order[kar.i] !== w) return;
    kar.live = false;
    clearTimeout(kar.cpuT);
    Voice.cancel();
    Snd.pashi();
    meet(w);
    if (who === 'me') kar.me++; else kar.cpu++;
    const b = $('kTable').querySelector(`.fuda[data-id="${CSS.escape(w.id)}"]`);
    b.classList.add('taken', who);
    b.insertAdjacentHTML('beforeend', `<span class="f-who">${who === 'me' ? '🧒' : '🤖'}</span>`);
    kScore();
    kar.i++;
    later(kRead, 1300);
  }
  function kEnd() {
    let title = 'ぜんぶ とれた！';
    if (kar.cpuLv) title = kar.me > kar.cpu ? 'きみの かち！' : kar.me === kar.cpu ? 'ひきわけ！' : 'つぎは かてるよ！';
    $('yomifuda').innerHTML = '';
    Snd.fanfare();
    modal(`<div class="result"><div class="r-stars">🎴</div><h2>${title}</h2>
      <p class="r-score">🧒 ${kar.me}まい${kar.cpuLv ? ` ／ 🤖 ${kar.cpu}まい` : ''}</p></div>`);
    START.karuta();
  }

  // =================================================================
  // 3. はいくの きせつ
  // =================================================================
  const quiz = { list: [], i: 0, ok: 0, done: false };
  const Q_CHOICES = ['h', 'n', 'a', 'f', 's'];
  START.quiz = () => {
    const d = shuffle(WORDS.filter(differs)).slice(0, 6);
    const same = shuffle(WORDS.filter((w) => w.kigo && w.kigo === w.life && FOUR.includes(w.kigo))).slice(0, 2);
    quiz.list = shuffle(d.concat(same));
    quiz.i = 0; quiz.ok = 0;
    qShow();
  };
  function qShow() {
    quiz.done = false;
    $('qProg').innerHTML = quiz.list.map((_, i) => `<i class="${i < quiz.i ? 'done' : i === quiz.i ? 'now' : ''}"></i>`).join('');
    $('qExplain').hidden = true;
    if (quiz.i >= quiz.list.length) {
      $('qCard').innerHTML = resultHTML('はいくの きせつ はかせ！', quiz.ok, quiz.list.length,
        `${calendarHTML()}<div class="r-btns"><button class="big" id="qAgain">もういちど</button></div>`);
      $('qChoices').innerHTML = '';
      Snd.fanfare();
      $('qAgain').onclick = () => { Snd.tap(); START.quiz(); };
      return;
    }
    const w = quiz.list[quiz.i];
    meet(w);
    $('qCard').innerHTML = `${cardHTML(w, 'small')}
      <p class="q-text">くらし では <b class="s-${w.life}">${sName(w.life)}</b>。<br>でも はいく では？</p>`;
    $('qChoices').innerHTML = Q_CHOICES.map((k) => `<button class="qc" data-s="${k}" style="--c:${SEASONS[k].color};--t:${SEASONS[k].tint}">
      <span>${SEASONS[k].art}</span>${sName(k)}</button>`).join('');
  }
  $('qChoices').addEventListener('click', (e) => {
    const b = e.target.closest('.qc');
    if (!b || quiz.done) return;
    quiz.done = true;
    const w = quiz.list[quiz.i];
    const right = b.dataset.s === w.kigo;
    if (right) { quiz.ok++; Snd.season[w.kigo](); } else Snd.ng();
    document.querySelectorAll('.qc').forEach((x) => {
      x.disabled = true;
      if (x.dataset.s === w.kigo) x.classList.add('right');
      else if (x === b) x.classList.add('wrong');
    });
    const head = right ? '⭕ せいかい！' : '❌ おしい！';
    const body = differs(w)
      ? `はいく では <b>${sName(w.kigo)}</b> の ことば。<br>${esc(w.why)}`
      : `くらし でも はいく でも おなじ <b>${sName(w.kigo)}</b>。<br>${esc(w.desc)}`;
    $('qExplain').innerHTML = `<p class="qe-head">${head}</p><p>${body}</p>${differs(w) && w.kigo !== 's' ? calendarHTML(w.kigo) : ''}
      <button class="big" id="qNext">つぎへ ▶</button>`;
    $('qExplain').hidden = false;
    $('qNext').onclick = () => { Snd.tap(); quiz.i++; qShow(); };
    $('qExplain').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  /* むかしの こよみ の きせつ */
  function calendarHTML(hl) {
    const rows = [['h', '1・2・3がつ'], ['n', '4・5・6がつ'], ['a', '7・8・9がつ'], ['f', '10・11・12がつ']];
    return `<div class="koyomi"><p class="ko-t">むかしの こよみ（いまより 1かげつ くらい おそい）</p><div class="ko-row">${rows.map(([k, m]) =>
      `<span class="${hl === k ? 'hl' : ''}" style="--c:${SEASONS[k].color};--t:${SEASONS[k].tint}">${SEASONS[k].art} ${sName(k)}<small>${m}</small></span>`).join('')}</div>
      <p class="ko-t">だから 7がつ の たなばた は あき。いまの こよみ でも はいく では りっしゅう（8がつ7か ごろ）から あき。</p></div>`;
  }

  // =================================================================
  // 4. はいく を つくろう
  // =================================================================
  const TARGET = [5, 7, 5];
  const hk = { rows: [[], [], []], active: 0, tab: 'kigo', season: 'h' };
  const KIGO_WORDS = WORDS.filter((w) => w.kigo || w.kigoSplit);
  const kigoOf = (p) => p.w && (p.w.kigo || p.w.kigoSplit) ? p.w : null;
  seg($('hTab'), (v) => { hk.tab = v; hPieces(); });
  seg($('hSeason'), (v) => { hk.season = v; hPieces(); });
  START.haiku = () => { hPaint(); hPieces(); };
  function hPieces() {
    $('hSeason').hidden = hk.tab !== 'kigo';
    let items;
    if (hk.tab === 'kigo') {
      items = KIGO_WORDS.filter((w) => w.kigo === hk.season || (w.kigoSplit && w.kigoSplit.includes(hk.season)))
        .map((w) => `<button class="piece kigo" data-w="${esc(w.id)}" style="--c:${SEASONS[hk.season].color};--t:${SEASONS[hk.season].tint}">
          <span class="p-art">${Art.html(w.art)}</span>${esc(w.kana)}<sup>${Mora.count(w.kana)}</sup></button>`);
    } else {
      items = PIECES.map((t) => `<button class="piece" data-t="${esc(t)}">${esc(t)}<sup>${Mora.count(t)}</sup></button>`);
    }
    $('hPieces').innerHTML = items.join('');
  }
  $('hPieces').addEventListener('click', (e) => {
    const b = e.target.closest('.piece');
    if (!b) return;
    const w = b.dataset.w ? BY[b.dataset.w] : null;
    const p = w ? { t: w.kana, w } : { t: b.dataset.t };
    if (w) meet(w);
    hk.rows[hk.active].push(p);
    Snd.tap();
    // ちょうど に なったら つぎの ぎょう へ
    const n = hCount(hk.active);
    if (n === TARGET[hk.active] && hk.active < 2) hk.active++;
    hPaint();
  });
  const hCount = (r) => Mora.count(hk.rows[r].map((p) => p.t).join(''));
  function hPaint() {
    $('hLines').innerHTML = hk.rows.map((row, r) => {
      const n = hCount(r), t = TARGET[r];
      const dots = Array.from({ length: Math.max(n, t) }, (_, i) => `<i class="${i < n ? (i < t ? 'f' : 'over') : ''}"></i>`).join('');
      const st = n === t ? 'just' : n > t ? 'over' : '';
      return `<div class="line ${r === hk.active ? 'active' : ''} ${st}" data-r="${r}">
        <div class="l-num">${t}</div>
        <div class="l-body">${row.map((p, i) => `<button class="chip ${kigoOf(p) ? 'kigo' : ''}" data-r="${r}" data-i="${i}"
          ${kigoOf(p) ? `style="--c:${SEASONS[p.w.kigo || 'n'].color};--t:${SEASONS[p.w.kigo || 'n'].tint}"` : ''}>${esc(p.t)}</button>`).join('')
          || `<span class="l-ph">ここを タップ して ことばを いれよう</span>`}</div>
        <div class="l-count"><span class="dots">${dots}</span><b>${n}</b>/${t}</div></div>`;
    }).join('');
    // きご の ひとこと
    const kigos = [];
    hk.rows.flat().forEach((p) => { const w = kigoOf(p); if (w && !kigos.includes(w)) kigos.push(w); });
    let msg;
    if (kigos.length >= 2) msg = `🌀 きせつが ふたつ あるよ（${kigos.map((w) => w.kana).join('・')}）。きご は 1つ に しよう`;
    else if (kigos.length === 1) msg = `きご：<b>${esc(kigos[0].kana)}</b>（はいく では ${kigoText(kigos[0])}）`;
    else msg = 'いろの ついた「きご」の ピースを 1つ いれよう';
    const all = hk.rows.every((_, r) => hCount(r) === TARGET[r]);
    if (all && kigos.length === 1) msg = `🎉 5・7・5 が できた！ ${msg}`;
    $('hMsg').innerHTML = msg;
    $('hSave').disabled = !all;
    $('hCount').textContent = save.haiku.length;
  }
  $('hLines').addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (c) {                                 // ピースを はずす
      hk.rows[+c.dataset.r].splice(+c.dataset.i, 1);
      hk.active = +c.dataset.r;
      Snd.tap(); hPaint(); return;
    }
    const l = e.target.closest('.line');
    if (l) { hk.active = +l.dataset.r; Snd.tap(); hPaint(); }
  });
  $('hUndo').onclick = () => {
    let r = hk.active;
    while (r > 0 && !hk.rows[r].length) r--;
    hk.rows[r].pop();
    hk.active = r;
    Snd.tap(); hPaint();
  };
  $('hClear').onclick = () => { hk.rows = [[], [], []]; hk.active = 0; Snd.tap(); hPaint(); };
  const hText = (rows) => rows.map((row) => row.map((p) => p.t).join('')).join('　');
  $('hRead').onclick = () => {
    const t = hText(hk.rows).trim();
    if (!t) { toast('まだ ことばが ないよ'); return; }
    if (!Voice.has || !save.voice) { toast('よみあげ が つかえないよ'); return; }
    Voice.say(t);
  };
  $('hSave').onclick = () => {
    if (!hk.rows.every((_, r) => hCount(r) === TARGET[r])) { toast('5・7・5 に なったら ほぞん できるよ'); return; }
    const kigo = hk.rows.flat().map(kigoOf).find(Boolean);
    save.haiku.unshift({
      lines: hk.rows.map((row) => row.map((p) => p.t).join(' ')),
      kigo: kigo ? kigo.id : '', at: Date.now(),
    });
    let note = 'ほぞん したよ！';
    if (save.haiku.length > 10) { save.haiku.length = 10; note = 'ほぞん したよ（いちばん ふるい はいく と いれかえた）'; }
    store();
    Snd.fanfare(); toast(note, 2400);
    hk.rows = [[], [], []]; hk.active = 0; hPaint();
  };
  $('hList').onclick = () => { Snd.tap(); hListShow(); };
  function hListShow() {
    const items = save.haiku.map((h, i) => {
      const w = BY[h.kigo];
      const tag = w ? `<span class="hl-tag" style="--c:${SEASONS[w.kigo || 'n'].color}">${esc(w.kana)}・${kigoText(w)}</span>` : '';
      return `<li><div class="hl-text">${h.lines.map(esc).join('<br>')}</div>${tag}
        <div class="hl-btns"><button data-read="${i}">🗣️ よむ</button><button data-del="${i}">🗑️ けす</button></div></li>`;
    }).join('');
    modal(`<h2>ほぞん した はいく（${save.haiku.length}/10）</h2>
      ${items ? `<ul class="hlist">${items}</ul>` : '<p>まだ ないよ。5・7・5 が できたら ほぞん しよう。</p>'}`);
    $('modalBody').onclick = (e) => {
      const r = e.target.closest('[data-read]'), d = e.target.closest('[data-del]');
      if (r) Voice.say(save.haiku[+r.dataset.read].lines.join('　'));
      if (d) { save.haiku.splice(+d.dataset.del, 1); store(); hListShow(); hPaint(); }
    };
  }

  // =================================================================
  // ずかん
  // =================================================================
  let zSeason = 'h';
  START.zukan = () => {
    $('zTab').innerHTML = FOUR.map((k) => {
      const all = WORDS.filter((w) => w.life === k);
      const n = all.filter((w) => save.seen[w.id]).length;
      return `<button data-v="${k}" class="${k === zSeason ? 'on' : ''}">${SEASONS[k].art} ${sName(k)} <small>${n}/${all.length}</small></button>`;
    }).join('');
    zPaint();
  };
  seg($('zTab'), (v) => { zSeason = v; zPaint(); });
  function zPaint() {
    $('zGrid').innerHTML = WORDS.filter((w) => w.life === zSeason).map((w) => save.seen[w.id]
      ? `<button class="z-cell" data-id="${esc(w.id)}"><span class="art">${Art.html(w.art)}</span><span class="z-kana">${esc(w.kana)}</span>${differs(w) || w.kigoSplit ? '<span class="z-diff">🔁</span>' : ''}</button>`
      : `<div class="z-cell none"><span class="art">？</span><span class="z-kana">・・・</span></div>`).join('');
  }
  $('zGrid').addEventListener('click', (e) => {
    const c = e.target.closest('.z-cell[data-id]');
    if (!c) return;
    const w = BY[c.dataset.id];
    Snd.tap();
    modal(`<div class="detail">${cardHTML(w)}
      <p class="d-genre">${GENRES[w.genre]}</p>
      <table class="d-season"><tr><th>くらし</th><td><b style="color:${SEASONS[w.life].color}">${SEASONS[w.life].art} ${sName(w.life)}</b></td></tr>
      <tr><th>はいく</th><td><b>${w.kigo ? SEASONS[w.kigo].art + ' ' : ''}${kigoText(w)}</b></td></tr></table>
      <p>${esc(w.desc)}</p>${w.why ? `<p class="d-why">🔁 ${esc(w.why)}</p>` : ''}
      <button class="next" id="dSay">🗣️ きく</button></div>`);
    $('dSay').onclick = () => Voice.say(`${w.kana}。${w.desc}`);
  });

  go('home');
  window.SK = { WORDS, Mora, go, save };   // テスト・しらべもの よう
})();
