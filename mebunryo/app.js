/* めぶんりょう チャレンジ — がめん と あそびかた */
(function () {
  'use strict';
  const M = window.Measure;
  const SND = window.Sound;
  const KEY = 'mebunryo-v1';
  const view = document.getElementById('view');
  const backBtn = document.getElementById('back');
  const sndBtn = document.getElementById('snd');
  const titleEl = document.getElementById('title');
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- ほぞん ---------- */
  function defaults() {
    return {
      pxPerMm: null, best: {}, daily: { last: null, streak: 0, max: 0, date: null, points: null, rank: null, text: '' },
      body: { palm: null, finger: null }, sound: true, names: [], minnaKind: 'mix', minnaRounds: 3
    };
  }
  function load() {
    const d = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const o = JSON.parse(raw) || {};
        if (M.validPxPerMm(o.pxPerMm)) d.pxPerMm = o.pxPerMm;
        if (o.best && typeof o.best === 'object') d.best = o.best;
        if (o.daily && typeof o.daily === 'object') Object.assign(d.daily, o.daily);
        if (o.body && typeof o.body === 'object') Object.assign(d.body, o.body);
        if (typeof o.sound === 'boolean') d.sound = o.sound;
        if (Array.isArray(o.names)) d.names = o.names.filter((n) => typeof n === 'string').slice(0, 6);
        if (o.minnaKind) d.minnaKind = o.minnaKind;
        if (o.minnaRounds) d.minnaRounds = o.minnaRounds;
      }
    } catch (e) { /* よめなくても あそべる */ }
    return d;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ほぞん できなくても あそべる */ }
  }
  const S = load();
  SND.setOn(S.sound);

  /* ---------- こまかい どうぐ ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function $(sel) { return view.querySelector(sel); }
  function on(sel, fn) {
    const el = typeof sel === 'string' ? $(sel) : sel;
    if (el) el.addEventListener('click', (e) => { SND.unlock(); fn(e); });
    return el;
  }
  function svgEl(tag, attrs, parent) {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  let timers = [];
  let rafs = [];
  let cleanup = [];
  let screen = 'title';
  let backTarget = null;
  function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function frame(fn) { const id = requestAnimationFrame(fn); rafs.push(id); return id; }
  function setScreen(name, title, back) {
    timers.forEach(clearTimeout); timers = [];
    rafs.forEach(cancelAnimationFrame); rafs = [];
    cleanup.forEach((f) => { try { f(); } catch (e) { /* */ } }); cleanup = [];
    screen = name;
    titleEl.textContent = title || '📏 めぶんりょう';
    backTarget = back || null;
    backBtn.hidden = !back;
  }
  function render(html) { view.innerHTML = html; view.scrollTop = 0; }
  function onKey(fn) {
    document.addEventListener('keydown', fn);
    cleanup.push(() => document.removeEventListener('keydown', fn));
  }
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }
  backBtn.addEventListener('click', () => { SND.play('tap'); (backTarget || showTitle)(); });
  function paintSnd() { sndBtn.textContent = S.sound ? '🔊' : '🔇'; }
  sndBtn.addEventListener('click', () => {
    S.sound = !S.sound; SND.setOn(S.sound); save(); paintSnd();
    if (S.sound) { SND.unlock(); SND.play('tap'); }
  });
  paintSnd();

  function calibrated() { return M.validPxPerMm(S.pxPerMm); }
  function newRng() { return M.rng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0); }
  function shortLandscape() { return window.innerWidth > window.innerHeight && window.innerHeight < 560; }
  // ながさ もんだい: ひける いちばん ながい せん（ななめ も OK）
  function lengthOpts() {
    if (!calibrated()) return {};
    let w = Math.min(window.innerWidth, 900) - 40, h = window.innerHeight - 280;
    if (shortLandscape()) { w = w * 0.58; h = window.innerHeight - 90; }
    const d = Math.hypot(Math.max(w, 120), Math.max(h, 120));
    return { pxPerMm: S.pxPerMm, maxMm: d / S.pxPerMm };
  }
  let forced = null;
  let curP = null;
  function genProblem(kind, r) {
    const p = M.makeProblem(kind, r, lengthOpts());
    if (forced && forced.kind === kind) {
      Object.assign(p, forced);
      if (kind === 'time') p.text = M.fmtSec(p.target, true);
      forced = null;
    }
    return p;
  }
  function judgeP(p, ans, ctx) {
    return M.judge(p, ans, { pxPerUnit: ctx && ctx.pxPerUnit, pxPerMm: calibrated() ? S.pxPerMm : null });
  }
  function streakNow() {
    const d = S.daily, today = M.dateStr(new Date());
    if (!d.last) return 0;
    const gap = M.dayNum(today) - M.dayNum(d.last);
    return gap <= 1 ? (d.streak || 0) : 0;
  }

  /* ================= タイトル ================= */
  function showTitle() {
    setScreen('title', '📏 めぶんりょう', null);
    G = null;
    const today = M.dateStr(new Date());
    const done = S.daily.date === today;
    const st = streakNow();
    render(`<div class="wrap">
      <h2 class="big-title">めぶんりょう チャレンジ</h2>
      <p class="lead">ものさし・とけい なし で「だいたい」で こたえよう！<br>いちばん ちかい の は だれ？</p>
      ${calibrated() ? '' : `<div class="note"><span class="grow">📏 さいしょ に <b>1えんだま</b> で がめん の おおきさ を あわせよう。ながさ の もんだい が cm に なるよ。</span><button class="btn small" id="cal">あわせる</button></div>`}
      <div class="menu">
        <button class="mcard" id="go-solo"><span class="em">👤</span><span><span class="nm">ひとりで</span><span class="ds">5もん で 1セット。ベスト を めざそう</span></span></button>
        <button class="mcard" id="go-minna"><span class="em">👨‍👩‍👧</span><span><span class="nm">みんなで</span><span class="ds">2〜6にん で じゅんばん に。いちばん ちかい ひと に 👑</span></span></button>
        <button class="mcard" id="go-daily"><span class="em">📅</span><span><span class="nm">まいにち 1もん</span><span class="ds">${done ? 'きょう は できた！' : 'きょう の もんだい に ちょうせん'}${st ? `　🔥 ${st}にち れんぞく` : ''}</span></span></button>
        <button class="mcard" id="go-set"><span class="em">⚙️</span><span><span class="nm">せってい</span><span class="ds">1えんだま で あわせる・からだ ものさし</span></span></button>
      </div>
    </div>`);
    on('#cal', () => { SND.play('tap'); showCalib(showTitle); });
    on('#go-solo', () => { SND.play('tap'); showSoloSelect(); });
    on('#go-minna', () => { SND.play('tap'); showMinnaSetup(); });
    on('#go-daily', () => { SND.play('tap'); startDaily(); });
    on('#go-set', () => { SND.play('tap'); showSettings(); });
  }

  /* ================= ひとりで ================= */
  let G = null;
  function kindCards(bestOf) {
    const list = [['mix', '🎲', 'いろいろ', 'ぜんぶ の しゅるい から 1もん ずつ']].concat(M.KINDS.map((k) => {
      const ds = {
        length: calibrated() ? 'ちょうど ○cm の せん を ひく' : 'わく の はんぶん の せん を ひく',
        time: 'とけい を みないで ○びょう',
        count: '3びょう だけ みて なんこ？',
        center: 'まんなか・ちょっかく を あてる',
        weight: 'どっち が おもい？ なんこ で つりあう？'
      }[k];
      return [k, M.KIND_INFO[k].emoji, M.KIND_INFO[k].name, ds];
    }));
    return list.map((x) => `<button class="mcard" data-k="${x[0]}"><span class="em">${x[1]}</span><span><span class="nm">${x[2]}</span><span class="ds">${x[3]}${bestOf ? '<br>' + bestOf(x[0]) : ''}</span></span></button>`).join('');
  }
  function showSoloSelect() {
    setScreen('solo-select', '👤 ひとりで', showTitle);
    render(`<div class="wrap"><p class="lead">どの チャレンジ に する？（5もん）</p>
      <div class="menu">${kindCards((k) => S.best[k] != null ? `🏆 ベスト ${S.best[k]}てん` : 'きろく まだ なし')}</div></div>`);
    view.querySelectorAll('[data-k]').forEach((b) => on(b, () => { SND.play('tap'); startSolo(b.dataset.k); }));
  }
  function startSolo(sel) {
    const r = newRng();
    const kinds = sel === 'mix' ? M.shuffle(r, M.KINDS) : [sel, sel, sel, sel, sel];
    G = { mode: 'solo', sel, kinds, idx: 0, results: [], r };
    nextSolo();
  }
  function nextSolo() {
    if (G.idx >= G.kinds.length) { soloEnd(); return; }
    const p = genProblem(G.kinds[G.idx], G.r);
    runProblem(p, { label: `${G.idx + 1} / ${G.kinds.length}もん`, back: showSoloSelect }, (ans, ctx) => {
      const j = judgeP(p, ans, ctx);
      G.results.push({ kind: p.kind, j });
      G.idx += 1;
      const last = G.idx >= G.kinds.length;
      showReveal(p, ans, j, ctx, last ? 'けっか を みる' : 'つぎ の もんだい', nextSolo, showSoloSelect);
    });
  }
  function soloEnd() {
    setScreen('solo-end', '🏁 けっか', showSoloSelect);
    const total = G.results.reduce((a, x) => a + x.j.points, 0);
    const prev = S.best[G.sel];
    const isNew = prev == null || total > prev;
    if (isNew) { S.best[G.sel] = total; save(); }
    const rows = G.results.map((x, i) => {
      const R = M.RANKS[x.j.rank];
      return `<div class="prow"><span class="crown">${R.emoji}</span><span class="pn">${i + 1}. ${M.KIND_INFO[x.kind].emoji} ${M.KIND_INFO[x.kind].name}</span><span class="pr">${x.j.points}てん</span>
        <span class="pa" style="grid-column:2/4">${esc(x.j.err)}${x.j.dir ? '（' + x.j.dir + '）' : ''}</span></div>`;
    }).join('');
    render(`<div class="wrap result">
      <div class="verdict pop"><div class="em">${isNew ? '🏆' : '🏁'}</div><div class="rk">${total}てん <span style="font-size:.6em;color:var(--sub)">/ ${G.results.length * 100}</span></div>
      <div class="ln">${isNew ? '<b>しんきろく！</b>' : `ベスト は ${prev}てん`}</div></div>
      <div class="board">${rows}</div>
      <div class="row"><button class="btn" id="again">もういちど</button><button class="btn sub" id="menu">メニュー</button></div></div>`);
    if (isNew) SND.play('fanfare'); else SND.play('good');
    const sel = G.sel;
    on('#again', () => { SND.play('tap'); startSolo(sel); });
    on('#menu', () => { SND.play('tap'); showTitle(); });
  }

  /* ================= まいにち 1もん ================= */
  function startDaily() {
    const today = M.dateStr(new Date());
    if (S.daily.date === today) { dailyDone(); return; }
    const p = M.daily(today, lengthOpts());
    if (forced && forced.kind === p.kind) { Object.assign(p, forced); forced = null; }
    G = { mode: 'daily' };
    runProblem(p, { label: '📅 ' + today, back: showTitle }, (ans, ctx) => {
      const j = judgeP(p, ans, ctx);
      const st = M.nextStreak(S.daily, today);
      Object.assign(S.daily, { last: st.last, streak: st.streak, max: Math.max(S.daily.max || 0, st.streak), date: today, points: j.points, rank: j.rank, text: j.err, kind: p.kind });
      save();
      showReveal(p, ans, j, ctx, 'つぎへ', dailyDone, showTitle);
    });
  }
  function dailyDone() {
    setScreen('daily-done', '📅 まいにち 1もん', showTitle);
    const d = S.daily;
    const R = M.RANKS[d.rank] || M.RANKS.motto;
    const K = M.KIND_INFO[d.kind] || { emoji: '📅', name: '' };
    render(`<div class="handoff">
      <div class="em">🔥</div><div class="who">${d.streak || 1}にち れんぞく！</div>
      <div class="verdict" style="width:100%"><div class="ln">きょう の もんだい: ${K.emoji} ${K.name}</div>
      <div class="rk">${R.emoji} ${R.text}　${d.points}てん</div><div class="ln">${esc(d.text || '')}</div></div>
      <p class="lead">あした も また ちょうせん してね（いちばん ながい れんぞく: ${d.max || d.streak || 1}にち）</p>
      <button class="btn" id="menu">メニュー</button></div>`);
    on('#menu', () => { SND.play('tap'); showTitle(); });
  }

  /* ================= みんなで ================= */
  function showMinnaSetup() {
    setScreen('minna-setup', '👨‍👩‍👧 みんなで', showTitle);
    let names = S.names.length >= 2 ? S.names.slice() : ['', ''];
    let kind = S.minnaKind || 'mix';
    let rounds = S.minnaRounds || 3;
    const draw = () => {
      render(`<div class="wrap">
        <div class="panel"><h2>なまえ（2〜6にん）</h2><div class="names">${names.map((n, i) =>
          `<label>${i + 1}. <input type="text" maxlength="8" value="${esc(n)}" placeholder="なまえ" data-i="${i}" autocomplete="off"></label>`).join('')}</div>
          <div class="row"><button class="btn sub small" id="add" ${names.length >= 6 ? 'disabled' : ''}>＋ ふやす</button><button class="btn sub small" id="del" ${names.length <= 2 ? 'disabled' : ''}>− へらす</button></div></div>
        <div class="panel"><h2>しゅるい</h2><div class="chips">${[['mix', '🎲 いろいろ']].concat(M.KINDS.map((k) => [k, M.KIND_INFO[k].emoji + ' ' + M.KIND_INFO[k].name])).map((x) =>
          `<button class="chip ${x[0] === kind ? 'on' : ''}" data-kind="${x[0]}">${x[1]}</button>`).join('')}</div>
          <div class="chips">${[3, 5].map((n) => `<button class="chip ${n === rounds ? 'on' : ''}" data-rounds="${n}">${n}もん</button>`).join('')}</div></div>
        <button class="btn" id="start">はじめる</button></div>`);
      const grab = () => { view.querySelectorAll('input[data-i]').forEach((el) => { names[+el.dataset.i] = el.value; }); };
      on('#add', () => { grab(); if (names.length < 6) names.push(''); SND.play('tap'); draw(); });
      on('#del', () => { grab(); if (names.length > 2) names.pop(); SND.play('tap'); draw(); });
      view.querySelectorAll('[data-kind]').forEach((b) => on(b, () => { grab(); kind = b.dataset.kind; SND.play('tap'); draw(); }));
      view.querySelectorAll('[data-rounds]').forEach((b) => on(b, () => { grab(); rounds = +b.dataset.rounds; SND.play('tap'); draw(); }));
      on('#start', () => { grab(); SND.play('start'); startMinna(names, kind, rounds); });
    };
    draw();
  }
  function startMinna(names, kind, rounds) {
    S.names = names.map((n) => n.trim()); S.minnaKind = kind; S.minnaRounds = rounds; save();
    const players = names.map((n, i) => ({ name: n.trim() || ('プレイヤー' + (i + 1)), crowns: 0, pts: 0 }));
    const r = newRng();
    let kinds;
    if (kind === 'mix') { kinds = M.shuffle(r, M.KINDS).slice(0, rounds); while (kinds.length < rounds) kinds.push(M.KINDS[kinds.length % 5]); }
    else kinds = Array(rounds).fill(kind);
    G = { mode: 'minna', players, kinds, round: 0, rounds, turn: 0, p: null, answers: [], r, setup: { names, kind, rounds } };
    minnaNextRound();
  }
  function minnaNextRound() {
    if (G.round >= G.rounds) { minnaEnd(); return; }
    G.p = genProblem(G.kinds[G.round], G.r);
    G.turn = 0; G.answers = [];
    handoff();
  }
  function handoff() {
    setScreen('handoff', '👨‍👩‍👧 みんなで', showTitle);
    const pl = G.players[G.turn];
    const K = M.KIND_INFO[G.p.kind];
    render(`<div class="handoff">
      ${G.turn > 0 ? '<p class="lead">できた！ つぎ の ひと に わたしてね</p>' : ''}
      <div class="stat">もんだい ${G.round + 1} / ${G.rounds}　${K.emoji} ${K.name}</div>
      <div class="em">🙈</div><div class="who">${esc(pl.name)} さん の ばん</div>
      <p class="lead">ほかの ひと は みないでね</p>
      <button class="btn" id="go">はじめる</button></div>`);
    on('#go', () => {
      SND.play('tap');
      runProblem(G.p, { label: pl.name + ' さん', back: showTitle }, (ans, ctx) => {
        G.answers[G.turn] = { ans, ctx, j: judgeP(G.p, ans, ctx) };
        G.turn += 1;
        if (G.turn < G.players.length) handoff(); else allAnswered();
      });
    });
  }
  function allAnswered() {
    setScreen('all-done', '👨‍👩‍👧 みんなで', showTitle);
    render(`<div class="handoff"><div class="em">🙌</div><div class="who">みんな できた！</div>
      <p class="lead">みんな で がめん を みよう</p><button class="btn gold" id="open">いっせい に はっぴょう！</button></div>`);
    on('#open', () => {
      render(`<div class="doki"><span class="drum">🥁</span>どきどき…</div>`);
      SND.play('drumroll', 1.1);
      later(minnaReveal, 1250);
    });
  }
  function truthLine(p, j) {
    if (p.kind === 'center' && p.sub !== 'right') return 'こたえ: ちょうど まんなか';
    if (p.kind === 'weight' && p.sub === 'which') return 'おもい のは ' + j.truth;
    if (p.kind === 'weight') return 'こたえ: ' + j.truth;
    return 'こたえ: ' + j.truth;
  }
  function minnaReveal() {
    setScreen('minna-reveal', '👨‍👩‍👧 はっぴょう', showTitle);
    const p = G.p;
    const min = Math.min.apply(null, G.answers.map((a) => a.j.rel));
    const order = G.players.map((pl, i) => i).sort((a, b) => G.answers[a].j.rel - G.answers[b].j.rel);
    order.forEach((i) => {
      const a = G.answers[i];
      a.win = a.j.rel <= min + 1e-9;
      if (a.win) G.players[i].crowns += 1;
      G.players[i].pts += a.j.points;
    });
    const rows = order.map((i) => {
      const a = G.answers[i], R = M.RANKS[a.j.rank];
      const ans = p.kind === 'center' && p.sub !== 'right' ? '' : `${esc(a.j.ans)}　`;
      return `<div class="prow ${a.win ? 'win' : ''}"><span class="crown">${a.win ? '👑' : R.emoji}</span><span class="pn">${esc(G.players[i].name)}</span><span class="pr">${a.j.points}てん</span>
        <span class="pa" style="grid-column:2/4">${ans}${esc(a.j.err)}</span><span class="barbg"><i data-w="${a.j.points}"></i></span></div>`;
    }).join('');
    const last = G.round + 1 >= G.rounds;
    render(`<div class="wrap result">
      <div class="truth pop">${esc(truthLine(p, G.answers[0].j))}</div>
      ${p.kind === 'weight' && p.sub === 'howmany' ? `<p class="lead">${esc(G.answers[0].j.detail || '')}</p>` : ''}
      <div class="board">${rows}</div>
      ${p.kind === 'count' ? '<div class="vis" id="vis"></div>' : ''}
      <div class="row"><button class="btn" id="next">${last ? 'さいご の けっか' : 'つぎ の もんだい'}</button></div></div>`);
    SND.play(min <= 0.05 ? 'kiran' : 'good');
    later(() => view.querySelectorAll('.barbg i').forEach((el) => { el.style.width = el.dataset.w + '%'; }), 60);
    if (p.kind === 'count') VIS.count($('#vis'), p);
    on('#next', () => { SND.play('tap'); G.round += 1; minnaNextRound(); });
  }
  function minnaEnd() {
    setScreen('minna-end', '👑 けっか', showTitle);
    const ps = G.players.map((p, i) => Object.assign({ i }, p)).sort((a, b) => b.crowns - a.crowns || b.pts - a.pts);
    const top = ps[0];
    const winners = ps.filter((p) => p.crowns === top.crowns && p.pts === top.pts);
    render(`<div class="wrap result">
      <div class="verdict pop"><div class="em">👑</div><div class="rk">${winners.map((w) => esc(w.name) + ' さん').join('・')} の かち！</div>
      <div class="pt">👑 ${top.crowns}こ（${top.pts}てん）</div></div>
      <div class="board">${ps.map((p) => `<div class="prow ${winners.indexOf(p) >= 0 ? 'win' : ''}"><span class="crown">${winners.indexOf(p) >= 0 ? '👑' : '🙂'}</span><span class="pn">${esc(p.name)}</span><span class="pr">👑×${p.crowns}</span>
        <span class="pa" style="grid-column:2/4">ごうけい ${p.pts}てん</span></div>`).join('')}</div>
      <div class="row"><button class="btn" id="again">もういちど</button><button class="btn sub" id="menu">メニュー</button></div></div>`);
    SND.play('fanfare');
    const st = G.setup;
    on('#again', () => { SND.play('start'); startMinna(st.names, st.kind, st.rounds); });
    on('#menu', () => { SND.play('tap'); showTitle(); });
  }

  /* ================= もんだい を とく ================= */
  const RUN = {};
  function runProblem(p, meta, done) {
    curP = p;
    const K = M.KIND_INFO[p.kind];
    setScreen('play-' + p.kind, K.emoji + ' ' + K.name, meta.back);
    render(`<div class="play"><div class="q"><div class="meta"><span>${esc(meta.label)}</span><span>${K.emoji} ${K.name}</span></div>
      <div class="txt" id="qt"></div><div class="hint" id="qh"></div></div>
      <div class="stage" id="stage"></div><div class="act" id="act"></div></div>`);
    let answered = false;
    RUN[p.kind](p, (ans, ctx) => {
      if (answered) return;
      answered = true;
      done(ans, ctx || {});
    });
  }
  function pointIn(svg, e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  }

  /* --- 📏 ながさ --- */
  RUN.length = function (p, done) {
    const mm = p.mode === 'mm';
    $('#qt').innerHTML = mm ? `ちょうど <b>${esc(p.text)}</b> の せん を ひいて` : `<b>${esc(p.text)}</b> の ながさ の せん を ひいて`;
    $('#qh').textContent = (p.sub ? p.sub + '。' : '') + (mm ? 'ゆび で なぞって せん を ひこう（ななめ でも OK）' : 'わく ＝ この しろい しかく。ゆび で なぞって ひこう');
    $('#stage').innerHTML = `<div class="pad ${mm ? '' : 'frame'}" id="pad"><svg id="psvg"></svg><div class="ghost" id="gh">ここ に ゆび で<br>せん を ひこう ✍️</div></div>`;
    const hintable = mm && (S.body.palm || S.body.finger);
    $('#act').innerHTML = `${hintable ? '<button class="btn sub" id="hint">💡 ヒント</button>' : ''}<button class="btn sub" id="redo" disabled>かきなおす</button><button class="btn" id="ok" disabled>これで OK</button>`;
    const pad = $('#pad'), svg = $('#psvg');
    let W = 0, H = 0, line = null, a = null, b = null, drag = false, seg = null;
    const fit = () => { const r = pad.getBoundingClientRect(); W = r.width; H = r.height; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); };
    fit();
    window.addEventListener('resize', fit);
    cleanup.push(() => window.removeEventListener('resize', fit));
    const draw = () => {
      svg.innerHTML = '';
      if (!seg) return;
      svgEl('line', { x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2, stroke: '#f76707', 'stroke-width': 6, 'stroke-linecap': 'round' }, svg);
      svgEl('circle', { cx: seg.x1, cy: seg.y1, r: 7, fill: '#f76707' }, svg);
      svgEl('circle', { cx: seg.x2, cy: seg.y2, r: 7, fill: '#f76707' }, svg);
    };
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault(); SND.unlock();
      fit();
      try { pad.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      const r = pad.getBoundingClientRect();
      a = { x: e.clientX - r.left, y: e.clientY - r.top }; b = a;
      drag = true; seg = { x1: a.x, y1: a.y, x2: a.x, y2: a.y };
      $('#gh').style.display = 'none';
      draw();
    });
    pad.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const r = pad.getBoundingClientRect();
      b = { x: Math.max(0, Math.min(W, e.clientX - r.left)), y: Math.max(0, Math.min(H, e.clientY - r.top)) };
      seg = { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
      draw();
    });
    const end = () => {
      if (!drag) return;
      drag = false;
      const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
      if (len < 6) { seg = null; draw(); $('#gh').style.display = ''; $('#ok').disabled = true; $('#redo').disabled = true; return; }
      line = seg;
      SND.play('key');
      $('#ok').disabled = false; $('#redo').disabled = false;
    };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
    on('#redo', () => { seg = null; line = null; draw(); $('#gh').style.display = ''; $('#ok').disabled = true; $('#redo').disabled = true; });
    on('#hint', () => { SND.play('tap'); toast('💡 ' + M.bodyHint(p.target, S.body)); });
    on('#ok', () => {
      if (!line) return;
      SND.play('stop');
      const len = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
      done({ px: len, mm: calibrated() ? len / S.pxPerMm : null, frac: len / W }, { line, W, H });
    });
  };

  /* --- ⏱️ じかん（とけい は みせない・こちこち も ならさない） --- */
  RUN.time = function (p, done) {
    $('#qt').innerHTML = `とけい を みないで <b>${esc(p.text)}</b> たったら おして`;
    $('#qh').textContent = 'スタート を おしたら、こころ の なか で かぞえよう';
    $('#stage').innerHTML = `<div class="timebox"><button class="press wait" id="press">スタート</button><div class="secret" id="sec">じゅんび が できたら おしてね</div></div>`;
    let t0 = 0;
    const press = () => {
      const now = performance.now();
      const btn = $('#press');
      if (!btn) return;
      if (!t0) {
        t0 = now;
        SND.play('start');
        btn.classList.remove('wait'); btn.textContent = 'おして！';
        $('#sec').textContent = `🤫 こころ の なか で かぞえて…（${p.text} で おす）`;
        return;
      }
      if (now - t0 < 300) return;
      SND.play('stop');
      done((now - t0) / 1000, {});
    };
    on('#press', press);
    onKey((e) => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) press(); } });
  };

  /* --- 🫘 かず --- */
  function countSvg(p, withBg) {
    let s = `<svg viewBox="0 0 1000 1000">`;
    p.items.forEach((it, i) => {
      if (withBg) s += `<circle id="cb${i}" cx="${it.x}" cy="${it.y}" r="${(p.size * 0.55).toFixed(1)}" fill="#f1f3f5"/>`;
      s += `<text x="${it.x}" y="${it.y}" font-size="${(p.size * 0.82).toFixed(1)}" text-anchor="middle" dominant-baseline="central">${p.item}</text>`;
    });
    return s + '</svg>';
  }
  function numpad(container, unit, maxLen, onOk) {
    container.innerHTML = `<div class="numwrap"><div class="numdisp"><span id="nd">？</span><span class="unit">${esc(unit)}</span></div>
      <div class="numpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-n="${n}">${n}</button>`).join('')}<button data-n="del" aria-label="けす">⌫</button><button data-n="0">0</button><button data-n="ok" class="ok" disabled>OK</button></div></div>`;
    let v = '';
    const paint = () => {
      container.querySelector('#nd').textContent = v || '？';
      container.querySelector('[data-n=ok]').disabled = !v || +v === 0;
    };
    const key = (k) => {
      if (k === 'ok') { if (v && +v > 0) { SND.play('stop'); onOk(+v); } return; }
      SND.play('key');
      if (k === 'del') v = v.slice(0, -1);
      else if (v.length < maxLen) v = (v === '0' ? '' : v) + k;
      paint();
    };
    container.querySelectorAll('[data-n]').forEach((b) => on(b, () => key(b.dataset.n)));
    onKey((e) => {
      if (/^[0-9]$/.test(e.key)) key(e.key);
      else if (e.key === 'Backspace') key('del');
      else if (e.key === 'Enter') { e.preventDefault(); key('ok'); }
    });
  }
  RUN.count = function (p, done) {
    const q = p.josu === 'にん' ? 'なんにん' : 'いくつ';
    $('#qt').innerHTML = `${p.item} ${esc(p.name)} は <b>${q}</b>？`;
    $('#qh').textContent = '3びょう だけ みえる よ。よく みて！';
    $('#stage').innerHTML = `<button class="press wait" id="look">👀 みる</button>`;
    on('#look', () => {
      SND.play('start');
      const st = $('#stage');
      st.innerHTML = `<div class="sq" id="sq"><div class="timer-bar" id="tb"></div>${countSvg(p, false)}</div>`;
      const tb = $('#tb');
      frame(() => frame(() => { tb.style.transition = 'width 3s linear'; tb.style.width = '0%'; }));
      later(() => {
        $('#qh').textContent = 'かず を いれて OK';
        numpad(st, p.josu, 3, (n) => done(n, {}));
      }, 3000);
    });
  };

  /* --- 📐 かくど・まんなか --- */
  function shapeSvg(p) {
    if (p.sub === 'segment') return `<line x1="${p.a.x}" y1="${p.a.y}" x2="${p.b.x}" y2="${p.b.y}" stroke="#1f2d33" stroke-width="10" stroke-linecap="round"/>`;
    if (p.sub === 'circle') return `<circle cx="${p.c.x}" cy="${p.c.y}" r="${p.r}" fill="#e3fafc" stroke="#1f2d33" stroke-width="8"/>`;
    if (p.sub === 'rect') return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#fff4e6" stroke="#1f2d33" stroke-width="8"/>`;
    return '';
  }
  function rayEnd(v, deg, len) {
    const r = deg * Math.PI / 180;
    return { x: v.x + Math.cos(r) * len, y: v.y + Math.sin(r) * len };
  }
  RUN.center = function (p, done) {
    $('#qt').innerHTML = `<b>${esc(p.text)}</b>`;
    const st = $('#stage');
    if (p.sub !== 'right') {
      $('#qh').textContent = 'ここ だ！ と おもう ところ を 1かい タップ';
      st.innerHTML = `<div class="sq" id="sq"><svg viewBox="0 0 1000 1000" id="csvg">${shapeSvg(p)}<g id="mk"></g></svg></div>`;
      const svg = $('#csvg');
      let tapped = false;
      svg.addEventListener('pointerup', (e) => {
        if (tapped) return;
        tapped = true;
        const pt = pointIn(svg, e);
        const ans = { x: pt.x, y: pt.y };
        svgEl('circle', { cx: ans.x, cy: ans.y, r: 16, fill: '#f76707', stroke: '#fff', 'stroke-width': 4 }, $('#mk'));
        SND.play('stop');
        const w = svg.getBoundingClientRect().width;
        later(() => done(ans, { pxPerUnit: w / 1000 }), 400);
      });
      return;
    }
    $('#qh').textContent = 'ゆび で うごかして、L の かたち に なったら OK';
    st.innerHTML = `<div class="sq" id="sq"><svg viewBox="0 0 1000 1000" id="csvg"></svg></div>`;
    $('#act').innerHTML = `<button class="btn" id="ok">これで OK</button>`;
    const svg = $('#csvg');
    let cur = p.start, drag = false;
    const draw = () => {
      svg.innerHTML = '';
      const f = rayEnd(p.v, p.a0, 300), m = rayEnd(p.v, cur, 300);
      svgEl('line', { x1: p.v.x, y1: p.v.y, x2: f.x, y2: f.y, stroke: '#1f2d33', 'stroke-width': 12, 'stroke-linecap': 'round' }, svg);
      svgEl('line', { x1: p.v.x, y1: p.v.y, x2: m.x, y2: m.y, stroke: '#f76707', 'stroke-width': 12, 'stroke-linecap': 'round' }, svg);
      svgEl('circle', { cx: m.x, cy: m.y, r: 30, fill: '#f76707', opacity: 0.85 }, svg);
      svgEl('circle', { cx: p.v.x, cy: p.v.y, r: 14, fill: '#1f2d33' }, svg);
    };
    const move = (e) => {
      const pt = pointIn(svg, e);
      if (Math.hypot(pt.x - p.v.x, pt.y - p.v.y) < 20) return;
      cur = (Math.atan2(pt.y - p.v.y, pt.x - p.v.x) * 180 / Math.PI + 360) % 360;
      draw();
    };
    svg.addEventListener('pointerdown', (e) => { e.preventDefault(); drag = true; try { svg.setPointerCapture(e.pointerId); } catch (er) { /* */ } move(e); });
    svg.addEventListener('pointermove', (e) => { if (drag) move(e); });
    svg.addEventListener('pointerup', () => { drag = false; });
    svg.addEventListener('pointercancel', () => { drag = false; });
    draw();
    on('#ok', () => { SND.play('stop'); done(cur, {}); });
  };

  /* --- ⚖️ おもさ --- */
  RUN.weight = function (p, done) {
    const st = $('#stage');
    if (p.sub === 'which') {
      const L = M.weightById(p.left), R = M.weightById(p.right);
      $('#qt').innerHTML = `<b>どっち が おもい？</b>`;
      $('#qh').textContent = 'おもい と おもう ほう を タップ';
      st.innerHTML = `<div class="wpair">${[L, R].map((w) => `<button class="witem" data-w="${w.id}"><span class="em">${w.e}</span><span class="nm">${esc(w.name)}</span></button>`).join('')}</div>`;
      st.querySelectorAll('[data-w]').forEach((b) => on(b, () => { SND.play('stop'); done(b.dataset.w, {}); }));
      return;
    }
    const H = M.weightById(p.heavy), L = M.weightById(p.light);
    $('#qt').innerHTML = esc(p.text).replace('いくつ？', '<b>いくつ？</b>');
    $('#qh').textContent = 'てんびん が つりあう かず を いれて OK';
    st.innerHTML = `<div class="wq"><div class="vs"><span>${H.e}</span><span>＝</span><span>${L.e} × ？</span></div><div id="np" style="flex:1;width:100%;display:flex;justify-content:center;min-height:0"></div></div>`;
    numpad($('#np'), 'こ', 2, (n) => done(n, {}));
  };

  /* ================= こたえあわせ ================= */
  function showReveal(p, ans, j, ctx, nextLabel, onNext, back) {
    setScreen('reveal', '🥁 こたえあわせ', back);
    render(`<div class="doki"><span class="drum">🥁</span>どきどき…</div>`);
    SND.play('drumroll', 0.9);
    later(() => {
      const R = M.RANKS[j.rank];
      let ln;
      if (p.kind === 'center' && p.sub !== 'right') ln = `<b>${esc(j.err)}</b>`;
      else if (p.kind === 'weight' && p.sub === 'which') ln = `おもい のは <b>${esc(j.truth)}</b>　${esc(j.err)}`;
      else ln = `あなた: <b>${esc(j.ans)}</b>　ほんとう: <b>${esc(j.truth)}</b><br>${esc(j.err)}${j.dir ? '（' + j.dir + '）' : ''}`;
      if (j.detail) ln += `<br><span style="font-size:.85em">${esc(j.detail)}</span>`;
      render(`<div class="wrap result rv">
        <div class="verdict pop"><div class="em">${R.emoji}</div><div class="rk">${R.text}</div><div class="pt">${j.points}てん</div><div class="ln">${ln}</div></div>
        <div class="vis" id="vis"></div>
        <div class="row"><button class="btn" id="next">${esc(nextLabel)}</button></div></div>`);
      SND.play({ pittari: 'kiran', oshii: 'good', maamaa: 'soso', motto: 'boo' }[j.rank]);
      VIS[p.kind]($('#vis'), p, ans, ctx);
      on('#next', () => { SND.play('tap'); onNext(); });
    }, 1000);
  }

  const VIS = {};
  /* ものさし を ひいた せん に そって おく */
  VIS.length = function (el, p, ans, ctx) {
    let { x1, y1, x2, y2 } = ctx.line;
    if (x2 < x1) { [x1, x2] = [x2, x1]; [y1, y2] = [y2, y1]; }
    const W = ctx.W, H = ctx.H;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const mm = p.mode === 'mm';
    const tgt = mm ? p.target * S.pxPerMm : p.target * W;
    const rl = Math.max(len, tgt) * 1.06 + 12;
    const rh = mm ? Math.max(24, 11 * S.pxPerMm) : Math.max(26, Math.min(60, H * 0.12));
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    const pts = [[x1, y1], [x1 + ux * rl, y1 + uy * rl], [x1 + nx * (rh + 44), y1 + ny * (rh + 44)], [x1 + ux * rl + nx * (rh + 44), y1 + uy * rl + ny * (rh + 44)], [x2, y2], [0, 0], [W, H]];
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const minX = Math.min.apply(null, xs) - 20, minY = Math.min.apply(null, ys) - 20;
    const vbW = Math.max.apply(null, xs) + 20 - minX, vbH = Math.max.apply(null, ys) + 20 - minY;
    const deg = ang * 180 / Math.PI;
    let ticks = '';
    if (mm) {
      const step = S.pxPerMm;
      const every = step < 2.5 ? 5 : 1;
      const fs = Math.max(11, Math.min(16, step * 3.2));
      for (let i = 0; i * step <= rl; i += every) {
        const x = (i * step).toFixed(1);
        const th = i % 10 === 0 ? rh * 0.6 : i % 5 === 0 ? rh * 0.42 : rh * 0.25;
        ticks += `<line x1="${x}" y1="4" x2="${x}" y2="${(4 + th).toFixed(1)}" stroke="#5c3d00" stroke-width="${i % 10 === 0 ? 1.6 : 1}"/>`;
        if (i % 10 === 0) ticks += `<text x="${x}" y="${(rh + 1).toFixed(1)}" font-size="${fs}" text-anchor="middle" fill="#5c3d00">${i / 10}</text>`;
      }
    } else {
      for (let i = 0; i * W / 20 <= rl; i += 1) {
        const x = (i * W / 20).toFixed(1);
        const th = i % 5 === 0 ? rh * 0.6 : rh * 0.3;
        ticks += `<line x1="${x}" y1="4" x2="${x}" y2="${(4 + th).toFixed(1)}" stroke="#5c3d00" stroke-width="${i % 5 === 0 ? 1.6 : 1}"/>`;
        if (i % 5 === 0) ticks += `<text x="${x}" y="${(rh + 1).toFixed(1)}" font-size="13" text-anchor="middle" fill="#5c3d00">${['0', '1/4', '1/2', '3/4', '1', '5/4', '3/2'][i / 5] || ''}</text>`;
      }
    }
    const tLabel = mm ? (p.target % 10 ? M.fmtMm(p.target) : p.target / 10 + 'cm') : M.FRACS.filter((f) => f.f === p.target).map((f) => f.text)[0] || '';
    el.innerHTML = `<svg viewBox="${minX.toFixed(1)} ${minY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">
      <rect x="0" y="0" width="${W}" height="${H}" rx="14" fill="#fff" stroke="${mm ? '#c5e4ea' : '#0b7285'}" stroke-width="${mm ? 3 : 4}"/>
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f76707" stroke-width="6" stroke-linecap="round"/>
      <g transform="translate(${x1.toFixed(1)} ${y1.toFixed(1)}) rotate(${deg.toFixed(2)})" class="fadein">
        <rect x="-6" y="4" width="${(rl + 12).toFixed(1)}" height="${rh.toFixed(1)}" rx="4" fill="#fff3bf" stroke="#e8b100" stroke-width="2" opacity=".95"/>
        ${ticks}
        <line x1="${tgt.toFixed(1)}" y1="-10" x2="${tgt.toFixed(1)}" y2="${(rh + 12).toFixed(1)}" stroke="#2b8a3e" stroke-width="4"/>
        <text x="${tgt.toFixed(1)}" y="${(rh + 32).toFixed(1)}" font-size="17" font-weight="800" text-anchor="middle" fill="#2b8a3e">🚩 ${esc(tLabel)}</text>
        <circle cx="${len.toFixed(1)}" cy="0" r="8" fill="#f76707"/>
      </g></svg>`;
  };

  /* とけい アニメ（こたえあわせ だけ こちこち が なる） */
  VIS.time = function (el, p, ans) {
    const want = Math.max(p.target * 1.5, Math.min(ans, p.target * 2) * 1.08);
    const face = [10, 15, 20, 30, 40, 60, 90, 120].find((v) => v >= want) || 120;
    const step = face <= 20 ? 1 : face <= 60 ? 5 : 10;
    const major = face <= 20 ? 5 : face <= 60 ? 10 : 30;
    const A = (s) => (s / face) * 360 - 90;
    let s = '<svg viewBox="-125 -125 250 250" style="width:100%;height:100%">';
    s += '<circle r="112" fill="#fff" stroke="#0b7285" stroke-width="6"/>';
    const tr = A(p.target) * Math.PI / 180;
    const big = p.target / face > 0.5 ? 1 : 0;
    s += `<path d="M0 0 L0 -100 A100 100 0 ${big} 1 ${(Math.cos(tr) * 100).toFixed(2)} ${(Math.sin(tr) * 100).toFixed(2)} Z" fill="#d3f9d8"/>`;
    for (let t = 0; t < face; t += step) {
      const a = A(t) * Math.PI / 180, isM = t % major === 0;
      const r1 = isM ? 88 : 96;
      s += `<line x1="${(Math.cos(a) * r1).toFixed(2)}" y1="${(Math.sin(a) * r1).toFixed(2)}" x2="${(Math.cos(a) * 106).toFixed(2)}" y2="${(Math.sin(a) * 106).toFixed(2)}" stroke="#1f2d33" stroke-width="${isM ? 3 : 1.5}"/>`;
      if (isM) s += `<text x="${(Math.cos(a) * 74).toFixed(2)}" y="${(Math.sin(a) * 74).toFixed(2)}" font-size="14" text-anchor="middle" dominant-baseline="central" fill="#1f2d33">${t}</text>`;
    }
    s += `<line x1="0" y1="0" x2="${(Math.cos(tr) * 110).toFixed(2)}" y2="${(Math.sin(tr) * 110).toFixed(2)}" stroke="#2b8a3e" stroke-width="5" stroke-linecap="round"/>`;
    s += '<line id="hand" x1="0" y1="0" x2="0" y2="-96" stroke="#f76707" stroke-width="6" stroke-linecap="round"/>';
    s += '<circle r="8" fill="#f76707"/><text id="secs" y="40" font-size="22" font-weight="800" text-anchor="middle" fill="#f76707">0.0</text></svg>';
    el.innerHTML = s;
    const hand = el.querySelector('#hand'), secs = el.querySelector('#secs');
    const end = Math.min(ans, face * 0.999), dur = 1700, t0 = performance.now();
    let lastTick = -1;
    const stepAnim = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 2);
      const v = end * e;
      const a = A(v) * Math.PI / 180;
      hand.setAttribute('x2', (Math.cos(a) * 96).toFixed(2));
      hand.setAttribute('y2', (Math.sin(a) * 96).toFixed(2));
      secs.textContent = (Math.round(v * 10) / 10).toFixed(1);
      const tk = Math.floor(v / step);
      if (tk !== lastTick) { lastTick = tk; SND.play('tick', tk % 2); }
      if (k < 1) frame(stepAnim);
      else secs.textContent = (Math.round(ans * 10) / 10).toFixed(1);
    };
    frame(stepAnim);
  };

  /* 10こ ずつ いろ を かえて かぞえる */
  VIS.count = function (el, p) {
    el.innerHTML = `<div style="height:100%;display:flex;justify-content:center"><div class="sq">${countSvg(p, true)}<div class="ghost" id="cnt" style="top:12px;transform:translateX(-50%);color:#0b7285;font-size:26px;font-weight:900;white-space:nowrap;background:rgba(255,255,255,.85);border-radius:12px;padding:2px 12px">0</div></div></div>`;
    const groups = M.countGroups(p);
    const colors = ['#ffc9c9', '#ffec99', '#b2f2bb', '#a5d8ff', '#d0bfff', '#ffd8a8'];
    const gap = Math.min(260, 2600 / groups.length);
    let n = 0;
    groups.forEach((g, gi) => {
      later(() => {
        g.forEach((idx) => { const c = el.querySelector('#cb' + idx); if (c) c.setAttribute('fill', colors[gi % colors.length]); });
        n += g.length;
        const cnt = el.querySelector('#cnt');
        if (cnt) cnt.textContent = n + p.josu;
        SND.play('count', gi);
      }, 300 + gi * gap);
    });
  };

  VIS.center = function (el, p, ans) {
    let s = `<div style="height:100%;display:flex;justify-content:center"><div class="sq"><svg viewBox="0 0 1000 1000">${shapeSvg(p)}`;
    if (p.sub !== 'right') {
      const c = p.answer;
      s += `<line x1="${ans.x}" y1="${ans.y}" x2="${c.x}" y2="${c.y}" stroke="#868e96" stroke-width="4" stroke-dasharray="10 8"/>`;
      s += `<g class="fadein"><circle cx="${c.x}" cy="${c.y}" r="26" fill="none" stroke="#2b8a3e" stroke-width="6"/><line x1="${c.x - 40}" y1="${c.y}" x2="${c.x + 40}" y2="${c.y}" stroke="#2b8a3e" stroke-width="5"/><line x1="${c.x}" y1="${c.y - 40}" x2="${c.x}" y2="${c.y + 40}" stroke="#2b8a3e" stroke-width="5"/></g>`;
      s += `<circle cx="${ans.x}" cy="${ans.y}" r="16" fill="#f76707" stroke="#fff" stroke-width="4"/>`;
    } else {
      const v = p.v, f = rayEnd(v, p.a0, 300), m = rayEnd(v, ans, 300);
      const d1 = M.angleBetween(ans, p.a0 + 90), d2 = M.angleBetween(ans, p.a0 - 90);
      const ta = d1 <= d2 ? p.a0 + 90 : p.a0 - 90;
      const t = rayEnd(v, ta, 300);
      const q1 = rayEnd(v, p.a0, 50), q3 = rayEnd(v, ta, 50), q2 = { x: q1.x + q3.x - v.x, y: q1.y + q3.y - v.y };
      s += `<line x1="${v.x}" y1="${v.y}" x2="${f.x}" y2="${f.y}" stroke="#1f2d33" stroke-width="12" stroke-linecap="round"/>`;
      s += `<g class="fadein"><line x1="${v.x}" y1="${v.y}" x2="${t.x}" y2="${t.y}" stroke="#2b8a3e" stroke-width="10" stroke-dasharray="20 12" stroke-linecap="round"/>
        <polyline points="${q1.x},${q1.y} ${q2.x},${q2.y} ${q3.x},${q3.y}" fill="none" stroke="#2b8a3e" stroke-width="6"/></g>`;
      s += `<line x1="${v.x}" y1="${v.y}" x2="${m.x}" y2="${m.y}" stroke="#f76707" stroke-width="12" stroke-linecap="round"/><circle cx="${v.x}" cy="${v.y}" r="14" fill="#1f2d33"/>`;
    }
    el.innerHTML = s + '</svg></div></div>';
  };

  /* てんびん アニメ */
  VIS.weight = function (el, p, ans) {
    let left, right, lw, rw;
    if (p.sub === 'which') {
      const L = M.weightById(p.left), R = M.weightById(p.right);
      left = [L.e]; right = [R.e]; lw = L.g; rw = R.g;
    } else {
      const H = M.weightById(p.heavy), L = M.weightById(p.light);
      left = [H.e]; right = Array(Math.min(ans, 12)).fill(L.e); lw = H.g; rw = L.g * ans;
      if (ans > 12) right.push('…');
    }
    const target = Math.max(-14, Math.min(14, (rw - lw) / (rw + lw) * 40));
    el.innerHTML = `<svg viewBox="0 0 400 270" style="width:100%;height:100%">
      <polygon points="200,92 170,250 230,250" fill="#adb5bd"/><rect x="120" y="248" width="160" height="12" rx="6" fill="#868e96"/>
      <line id="beam" x1="60" y1="90" x2="340" y2="90" stroke="#495057" stroke-width="10" stroke-linecap="round"/>
      <circle cx="200" cy="90" r="9" fill="#212529"/>
      <g id="pl"></g><g id="pr"></g></svg>`;
    const pan = (g, items) => {
      g.innerHTML = '';
      svgEl('line', { x1: -45, y1: 0, x2: 0, y2: -70, stroke: '#868e96', 'stroke-width': 2 }, g);
      svgEl('line', { x1: 45, y1: 0, x2: 0, y2: -70, stroke: '#868e96', 'stroke-width': 2 }, g);
      svgEl('path', { d: 'M-55 0 Q0 26 55 0 Z', fill: '#ced4da', stroke: '#868e96', 'stroke-width': 2 }, g);
      const per = items.length > 6 ? 6 : items.length;
      const fs = items.length > 1 ? 22 : 40;
      items.forEach((e, i) => {
        const row = Math.floor(i / per), col = i % per;
        const t = svgEl('text', { x: (col - (per - 1) / 2) * 17, y: -6 - row * 20, 'font-size': fs, 'text-anchor': 'middle' }, g);
        t.textContent = e;
      });
    };
    const gl = el.querySelector('#pl'), gr = el.querySelector('#pr'), beam = el.querySelector('#beam');
    pan(gl, left); pan(gr, right);
    const place = (deg) => {
      const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      const lx = 200 - 140 * c, ly = 90 - 140 * s, rx = 200 + 140 * c, ry = 90 + 140 * s;
      beam.setAttribute('x1', lx); beam.setAttribute('y1', ly); beam.setAttribute('x2', rx); beam.setAttribute('y2', ry);
      gl.setAttribute('transform', `translate(${lx.toFixed(1)} ${(ly + 80).toFixed(1)})`);
      gr.setAttribute('transform', `translate(${rx.toFixed(1)} ${(ry + 80).toFixed(1)})`);
    };
    place(0);
    later(() => {
      SND.play('balance');
      const t0 = performance.now();
      const anim = (now) => {
        const k = Math.min(1, (now - t0) / 1100);
        const e = 1 - Math.pow(1 - k, 3) * Math.cos(k * 6);
        place(target * Math.min(1.15, e));
        if (k < 1) frame(anim); else place(target);
      };
      frame(anim);
    }, 350);
  };

  /* ================= せってい ================= */
  function showSettings() {
    setScreen('settings', '⚙️ せってい', showTitle);
    const b = S.body;
    render(`<div class="wrap">
      <div class="panel"><h2>📏 がめん の ながさ あわせ</h2>
        <p>${calibrated() ? `✅ あわせて あるよ（1cm ＝ ${(S.pxPerMm * 10).toFixed(1)} てん）` : 'まだ あわせて いないよ。あわせる まで ながさ の もんだい は「わく の はんぶん」など に なるよ。'}</p>
        <div class="row"><button class="btn" id="cal">1えんだま で あわせる</button>${calibrated() ? '<button class="btn sub" id="uncal">あわせない に もどす</button>' : ''}</div></div>
      <div class="panel"><h2>✋ からだ ものさし</h2>
        <p>じぶん の てのひら と ゆび の はば を はかって おくと、ながさ の もんだい で ヒント が でるよ。</p>
        <p>${b.palm ? `てのひら: ${M.fmtMm(b.palm)}` : 'てのひら: まだ'}　${b.finger ? `ゆび: ${M.fmtMm(b.finger)}` : 'ゆび: まだ'}</p>
        <div class="row"><button class="btn" id="body" ${calibrated() ? '' : 'disabled'}>はかる</button></div>
        ${calibrated() ? '' : '<p style="color:var(--sub)">さき に 1えんだま で あわせてね</p>'}</div>
      <div class="panel"><h2>🔊 おと</h2><div class="row"><button class="btn sub" id="snd2">${S.sound ? '🔊 オン' : '🔇 オフ'}</button></div></div>
    </div>`);
    on('#cal', () => { SND.play('tap'); showCalib(showSettings); });
    on('#uncal', () => { S.pxPerMm = null; save(); SND.play('tap'); showSettings(); });
    on('#body', () => { SND.play('tap'); showBody(); });
    on('#snd2', () => { sndBtn.click(); showSettings(); });
  }

  function showCalib(after) {
    setScreen('calib', '📏 1えんだま で あわせる', after);
    let px = calibrated() ? M.coinPxFrom(S.pxPerMm) : Math.round(20 / 25.4 * 96 * 10) / 10;
    render(`<div class="wrap">
      <div class="panel"><p>1えんだま を がめん の まる の うえ に おいて、まる の おおきさ を <b>ぴったり おなじ</b> に しよう。ふち が かさなれば OK！</p></div>
      <div class="calgrid"><div class="coinbox"><div class="coin" id="coin">1</div></div>
      <div class="calctl"><div class="sizer"><button class="btn sub" id="minus" aria-label="ちいさく">−</button>
        <input type="range" id="rng" min="30" max="200" step="0.5" value="${px}" aria-label="まる の おおきさ">
        <button class="btn sub" id="plus" aria-label="おおきく">＋</button></div>
      <div class="row"><button class="btn" id="ok">これで OK</button></div></div></div></div>`);
    const coin = $('#coin'), rng = $('#rng');
    const paint = () => { coin.style.width = coin.style.height = px + 'px'; coin.style.fontSize = Math.max(12, px * 0.35) + 'px'; rng.value = px; };
    paint();
    rng.addEventListener('input', () => { px = +rng.value; paint(); });
    on('#minus', () => { px = Math.max(30, px - 0.5); SND.play('key'); paint(); });
    on('#plus', () => { px = Math.min(200, px + 0.5); SND.play('key'); paint(); });
    on('#ok', () => {
      S.pxPerMm = M.pxPerMmFromCoin(px); save();
      SND.play('good'); toast('✅ あわせたよ！ ながさ は cm で でるよ');
      after();
    });
  }

  function showBody() {
    setScreen('body', '✋ からだ ものさし', showSettings);
    let part = 'palm';
    const vals = { palm: S.body.palm || 70, finger: S.body.finger || 16 };
    const lim = { palm: [30, 130], finger: [8, 30] };
    const draw = () => {
      const vertical = window.innerHeight > window.innerWidth;
      render(`<div class="wrap">
        <div class="chips"><button class="chip ${part === 'palm' ? 'on' : ''}" data-p="palm">✋ てのひら の はば</button><button class="chip ${part === 'finger' ? 'on' : ''}" data-p="finger">☝️ ゆび 1ぽん の はば</button></div>
        <div class="panel"><p>${part === 'palm' ? 'てのひら（おやゆび いがい の 4ほん）を がめん に おいて、オレンジ の はば を あわせよう' : 'ひとさしゆび を がめん に おいて、オレンジ の はば を あわせよう'}</p></div>
        <div class="val" id="v"></div>
        <div style="display:flex;justify-content:center"><div class="palmbar" id="bar"></div></div>
        <div class="sizer"><button class="btn sub" id="minus">−</button><input type="range" id="rng" min="${lim[part][0]}" max="${lim[part][1]}" step="1" value="${vals[part]}" aria-label="はば"><button class="btn sub" id="plus">＋</button></div>
        <div class="row"><button class="btn" id="ok">ほぞん</button></div></div>`);
      const bar = $('#bar'), rng = $('#rng');
      const paint = () => {
        const px = vals[part] * S.pxPerMm;
        if (vertical) { bar.style.width = '70px'; bar.style.height = px + 'px'; bar.style.background = 'repeating-linear-gradient(0deg, #ffd8a8 0 10px, #ffc078 10px 20px)'; }
        else { bar.style.height = '70px'; bar.style.width = px + 'px'; }
        $('#v').textContent = (vertical ? '↕ ' : '↔ ') + M.fmtMm(vals[part]);
        rng.value = vals[part];
      };
      paint();
      rng.addEventListener('input', () => { vals[part] = +rng.value; paint(); });
      on('#minus', () => { vals[part] = Math.max(lim[part][0], vals[part] - 1); SND.play('key'); paint(); });
      on('#plus', () => { vals[part] = Math.min(lim[part][1], vals[part] + 1); SND.play('key'); paint(); });
      view.querySelectorAll('[data-p]').forEach((b) => on(b, () => { part = b.dataset.p; SND.play('tap'); draw(); }));
      on('#ok', () => {
        S.body[part] = vals[part]; save(); SND.play('good');
        toast('✅ ' + (part === 'palm' ? 'てのひら' : 'ゆび') + ' を ほぞん したよ');
        if (part === 'palm' && !S.body.finger) { part = 'finger'; draw(); } else showSettings();
      });
    };
    draw();
  }

  /* ---------- テスト よう ---------- */
  window.MebunryoDebug = {
    state: () => ({
      screen, mode: G && G.mode, problem: curP, S: JSON.parse(JSON.stringify(S)),
      results: G && G.results ? G.results.map((x) => x.j) : null,
      players: G && G.players ? G.players.map((p) => ({ name: p.name, crowns: p.crowns, pts: p.pts })) : null,
      answers: G && G.answers ? G.answers.map((a) => a && a.j) : null
    }),
    force: (o) => { forced = o; }
  };

  showTitle();
})();
