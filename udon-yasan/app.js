'use strict';

/*
 * うどんやさん たいけん（ステーション・ゆびの そうさ・えんしゅつ・保存）
 *  - めんうち（あさ）→ えいぎょう（ちゅうもん → ゆでる → もりつけ → てんぷら → おかいけい）→ へいてん
 *  - まちがえても おこらない。やりなおせる。ゲームオーバー なし
 *  - URL: ?speed=3（じかんを はやく）・?n=3（おきゃくさんの かず）・?seed=1・?day=3・?diff=normal（たしかめ用）
 */
(() => {
  const M = Menu;
  const KEY = 'udon-yasan-v1';
  const Q = new URLSearchParams(location.search);
  const SPEED = Math.max(0.5, Math.min(10, parseFloat(Q.get('speed')) || 1));
  const FORCE_N = parseInt(Q.get('n'), 10) || 0;
  const SEED = Q.get('seed') != null ? parseInt(Q.get('seed'), 10) : null;
  const $ = (id) => document.getElementById(id);
  const R = M.ruby;

  /* ---------- 保存 ---------- */
  const DEF = { day: 1, stamps: [], sales: 0, bowls: 0, bestNiko: 0, zukan: {}, clerk: { skin: 0, hair: 0 }, set: { bgm: true, sfx: true, voice: true }, diff: 'easy', koshi: 0 };
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null') || {};
      return Object.assign({}, DEF, s, {
        clerk: Object.assign({}, DEF.clerk, s.clerk || {}),
        set: Object.assign({}, DEF.set, s.set || {}),
        zukan: Object.assign({}, s.zukan || {}),
        stamps: Array.isArray(s.stamps) ? s.stamps : [],
      });
    } catch (e) {
      return JSON.parse(JSON.stringify(DEF));
    }
  }
  const save = load();
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても あそべる */ }
  }
  if (Q.get('day')) save.day = Math.max(1, parseInt(Q.get('day'), 10) || 1);
  if (M.DIFF[Q.get('diff')]) save.diff = Q.get('diff');
  if (!M.DIFF[save.diff]) save.diff = 'easy';
  Object.keys(save.set).forEach((k) => Sound.set(k, save.set[k]));

  /* ---------- じょうたい ---------- */
  const S = {
    screen: 'title', mode: null, D: M.DIFF.easy, day: 1, t: 0, station: 'counter',
    custs: [], stock: {}, build: null, fry: { stage: null, item: null, c: 0 }, reji: null,
    stats: { sales: 0, bowls: 0, niko: 0, served: 0 }, dayOver: false, holding: null,
    cat: { on: false, next: 25, until: 0, purr: 0 }, msgs: {}, r: Shop.rng(1), lastInput: 0, hotSaid: false,
    practice: 0, practiceOk: 0, dragging: false,
  };

  /* ---------- こまごま ---------- */
  let toastTimer = null;
  function toast(html, ms) {
    const el = $('toast');
    el.innerHTML = R(html);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2200);
  }
  function msg(st, text) {
    S.msgs[st] = text;
    const el = document.querySelector(`#st-${st} .st-msg`);
    if (el) el.innerHTML = R(text || '');
  }
  /* おなじ なかみ なら かきかえない（タップの とちゅうで ボタンが きえない ように） */
  function setHTML(el, html) {
    if (el._h === html) return;
    el.innerHTML = html;
    el._h = html;
  }
  function unlockTip(id) {
    if (!save.zukan[id]) { save.zukan[id] = true; persist(); }
  }
  function show(id) {
    ['title', 'menuchi', 'shop', 'end', 'zukan'].forEach((s) => $(s).classList.toggle('hidden', s !== id));
    S.screen = id;
    renderSound();
  }

  /* ---------- おと の オン/オフ ---------- */
  function renderSound() {
    document.querySelectorAll('.snd-slot').forEach((slot) => {
      slot.innerHTML = [['bgm', '🎵', 'BGM'], ['sfx', '🔊', 'こうかおん'], ['voice', '🗣', 'こえ']]
        .map(([k, ic, nm]) => `<button data-snd="${k}" class="${save.set[k] ? '' : 'off'}" aria-label="${nm}" aria-pressed="${save.set[k]}">${ic}</button>`).join('');
    });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-snd]');
    if (!b) return;
    const k = b.dataset.snd;
    save.set[k] = !save.set[k];
    Sound.set(k, save.set[k]);
    if (k === 'bgm' && save.set[k]) Sound.bgmStart();
    persist();
    renderSound();
  });
  document.addEventListener('pointerdown', () => { Sound.unlock(); S.lastInput = S.t; }, true);

  /* ================= ひょうし ================= */
  function renderTitle() {
    $('title-art').innerHTML = `
      <rect x="0" y="0" width="400" height="210" fill="#ffe8cc"/>
      <path d="M40 60 L200 18 L360 60Z" fill="#7a4b2a"/><rect x="50" y="60" width="300" height="140" fill="#fff8ec" stroke="#c9a06b" stroke-width="3"/>
      <rect x="120" y="66" width="160" height="30" rx="6" fill="#5c3d2e"/><text x="200" y="88" text-anchor="middle" font-size="18" font-weight="800" fill="#ffe8cc">こむぎや</text>
      <g>${[0, 1, 2].map((i) => `<rect x="${110 + i * 61}" y="100" width="58" height="56" fill="#364fc7"/><g transform="translate(${139 + i * 61} 124)"><ellipse rx="6" ry="11" fill="#fff"/><path d="M0 -14 L0 14" stroke="#fff" stroke-width="2"/></g>`).join('')}</g>
      <rect x="60" y="150" width="40" height="50" fill="#d8a46a"/><rect x="300" y="150" width="40" height="50" fill="#d8a46a"/>
      <g transform="translate(300 76) scale(.8)">${Art.clerk(save.clerk.skin, save.clerk.hair)}</g>
      ${Art.vessel({ kind: 'kake', balls: 1, soup: 0.8, soupKind: 'hotSoup', toppings: ['negi', 'tenkasu'] }, 170, 168, 80)}
      ${Art.steam(170, 150, 3)}`;
    $('clerk-prev').innerHTML = Art.clerk(save.clerk.skin, save.clerk.hair);
    $('skin-set').innerHTML = Art.SKIN.map((c, i) => `<button data-skin="${i}" class="${i === save.clerk.skin ? 'on' : ''}" style="background:${c}" aria-label="はだの いろ ${i + 1}"></button>`).join('');
    document.querySelectorAll('#hair-set button').forEach((b) => b.classList.toggle('on', +b.dataset.hair === save.clerk.hair));
    document.querySelectorAll('#diff-seg button').forEach((b) => b.classList.toggle('on', b.dataset.diff === save.diff));
    const notes = {
      easy: 'つぎに さわる ものが ひかるよ。おつりは なし。',
      normal: 'おきゃくさんが ならぶよ。おつりも わたそう。',
      tencho: '2[人|にん] どうじ。てんぷらの ほじゅうも じぶんで！',
    };
    $('diff-note').innerHTML = R(notes[save.diff]);
    $('day-label').textContent = `${save.day}にちめ`;
    const n = save.stamps.length;
    $('stamps-mini').textContent = n ? `🏮 スタンプ ${n}こ ／ うりあげ ごうけい ${save.sales}えん` : '';
  }
  document.addEventListener('click', (e) => {
    const t = e.target;
    const sk = t.closest('[data-skin]');
    if (sk) { save.clerk.skin = +sk.dataset.skin; persist(); renderTitle(); Sound.sfx('tap'); return; }
    const hr = t.closest('[data-hair]');
    if (hr) { save.clerk.hair = +hr.dataset.hair; persist(); renderTitle(); Sound.sfx('tap'); return; }
    const df = t.closest('[data-diff]');
    if (df) { save.diff = df.dataset.diff; persist(); renderTitle(); Sound.sfx('tap'); return; }
    const md = t.closest('[data-mode]');
    if (md) {
      Sound.unlock();
      if (save.set.bgm) Sound.bgmStart();
      const m = md.dataset.mode;
      if (m === 'shop') startMenuchi('shop');
      else if (m === 'menuchi') startMenuchi('only');
      else if (m === 'reji') startReji();
      else if (m === 'zukan') openZukan();
      return;
    }
    if (t.closest('[data-home]')) goHome();
  });
  function goHome() {
    Sound.stopLoops();
    S.holding = null;
    S.mode = null;
    renderTitle();
    show('title');
  }

  /* ================= めんうち ================= */
  const KSTEPS = [['mix', 'まぜる'], ['knead', 'こねる'], ['step', 'ふむ'], ['roll', 'のばす'], ['cut', 'きる']];
  const K = {};
  const K_NEED = { knead: Math.PI * 2 * 3, step: 12, roll: 6, cut: 6 };
  function startMenuchi(kind) {
    Object.assign(K, { kind, adv: false, step: 'mix', flour: false, water: false, knead: 0, lastAng: null, steps: 0, lastFoot: null, alts: 0, roll: 0, rollDir: 0, rollY: null, cuts: [], result: null, ptr: null });
    show('menuchi');
    renderK();
    unlockTip('menuchi');
  }
  /* つぎの だんかいへ（れんだで 2だん とばない ように 1かい だけ） */
  function kAdvance(ms) {
    if (K.adv) return;
    K.adv = true;
    K.ptr = null;
    setTimeout(() => { K.adv = false; kNext(); }, ms || 0);
  }
  function kNext() {
    const i = KSTEPS.findIndex((s) => s[0] === K.step);
    Sound.sfx('good');
    if (i < KSTEPS.length - 1) K.step = KSTEPS[i + 1][0];
    else {
      const stepAlt = K.steps > 1 ? K.alts / (K.steps - 1) : 0;
      const even = Shop.cutEven(K.cuts);
      K.result = { stars: Shop.koshi({ stepAlt, cutEven: even }), even, stepAlt };
      K.step = 'done';
      save.koshi = K.result.stars;
      persist();
    }
    renderK();
  }
  const K_GUIDE = {
    mix: 'こむぎこ と しおみず を ボウルに いれよう（タップ）',
    knead: 'ゆびで ぐるぐる なぞって こねよう',
    step: 'ひだり・みぎ こうごに ふもう！',
    roll: 'めんぼうを うえ・したに スワイプして のばそう',
    cut: 'たてに なぞって きろう。はばを そろえると ◎',
  };
  function renderK() {
    const st = K.step;
    $('k-steps').innerHTML = KSTEPS.map(([id, nm], i) => {
      const cur = KSTEPS.findIndex((s) => s[0] === st);
      const cls = id === st ? 'now' : (st === 'done' || i < cur ? 'done' : '');
      return `<span class="${cls}">${nm}</span>`;
    }).join('');
    let g = '<rect x="0" y="0" width="400" height="300" fill="#fff8ec"/><rect x="20" y="70" width="360" height="220" rx="16" fill="#e8c08a" stroke="#c9975b" stroke-width="3"/>';
    let prog = 0;
    let acts = '';
    if (st === 'mix') {
      g += '<ellipse cx="200" cy="200" rx="120" ry="40" fill="#adb5bd"/><path d="M80 200 Q80 270 200 270 Q320 270 320 200Z" fill="#ced4da"/><ellipse cx="200" cy="200" rx="110" ry="33" fill="#f1f3f5"/>';
      if (K.flour) g += '<ellipse cx="200" cy="196" rx="70" ry="20" fill="#fff"/><ellipse cx="200" cy="188" rx="40" ry="14" fill="#fff"/>';
      if (K.water) g += '<ellipse cx="200" cy="192" rx="60" ry="22" fill="#fff4d6" stroke="#e9d9a6" stroke-width="2"/>';
      g += `<g id="k-flour" data-k="flour" opacity="${K.flour ? 0.35 : 1}"><rect x="40" y="40" width="80" height="100" rx="10" fill="#fff" stroke="#c9a06b" stroke-width="3"/><text x="80" y="90" text-anchor="middle" font-size="16" font-weight="800" fill="#7a4b2a">こむぎこ</text><path d="M60 120 L100 120" stroke="#e9d9a6" stroke-width="6"/></g>`;
      g += `<g id="k-water" data-k="water" opacity="${K.water ? 0.35 : 1}"><path d="M290 50 L350 50 L356 140 L284 140Z" fill="#d0ebff" stroke="#4dabf7" stroke-width="3"/><path d="M350 66 Q372 74 362 100" fill="none" stroke="#4dabf7" stroke-width="5"/><text x="320" y="105" text-anchor="middle" font-size="14" font-weight="800" fill="#1864ab">しおみず</text></g>`;
      prog = (K.flour ? 0.5 : 0) + (K.water ? 0.5 : 0);
    } else if (st === 'knead') {
      prog = Math.min(1, K.knead / K_NEED.knead);
      const smooth = prog;
      g += `<circle cx="200" cy="180" r="92" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="10 10" opacity=".8"/>`;
      g += `<g id="k-dough"><circle cx="200" cy="180" r="${70 + smooth * 6}" fill="#fff4d6" stroke="${smooth > 0.9 ? '#e9d9a6' : '#d9c48c'}" stroke-width="3"/>`;
      if (smooth < 0.9) g += '<path d="M160 160 l14 6 M220 200 l12 -8 M190 210 l10 4 M230 150 l-8 10" stroke="#d9c48c" stroke-width="4" stroke-linecap="round"/>';
      g += '<circle cx="200" cy="180" r="110" fill="transparent"/></g>';
      g += '<path d="M300 110 A110 110 0 0 1 310 200" fill="none" stroke="#fd7e14" stroke-width="5" marker-end="url(#ar)"/><defs><marker id="ar" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="#fd7e14"/></marker></defs>';
    } else if (st === 'step') {
      prog = Math.min(1, K.steps / K_NEED.step);
      const w = 120 + prog * 90;
      g += `<ellipse cx="200" cy="190" rx="${w}" ry="${50 - prog * 18}" fill="#e7f5ff" opacity=".8" stroke="#a5d8ff" stroke-width="3"/><ellipse cx="200" cy="190" rx="${w - 16}" ry="${40 - prog * 16}" fill="#fff4d6"/>`;
      const foot = K.lastFoot;
      g += `<text x="140" y="140" font-size="52" text-anchor="middle" opacity="${foot === 'L' ? 1 : 0.3}">🦶</text><text x="260" y="140" font-size="52" text-anchor="middle" opacity="${foot === 'R' ? 1 : 0.3}" transform="scale(-1 1) translate(-520 0)">🦶</text>`;
      acts = '<button class="foot" id="k-left" data-foot="L">🦶 ひだり</button><button class="foot" id="k-right" data-foot="R">みぎ 🦶</button>';
    } else if (st === 'roll') {
      prog = Math.min(1, K.roll / K_NEED.roll);
      const w = 120 + prog * 200;
      const h = 90 + prog * 70;
      g += `<g id="k-dough"><rect x="${200 - w / 2}" y="${180 - h / 2}" width="${w}" height="${h}" rx="${30 - prog * 24}" fill="#fff4d6" stroke="#e9d9a6" stroke-width="3"/><rect x="20" y="70" width="360" height="220" fill="transparent"/></g>`;
      const py = K.rollY == null ? 180 : K.rollY;
      g += `<g pointer-events="none"><rect x="40" y="${py - 12}" width="320" height="24" rx="12" fill="#c08a4f" stroke="#8a5a2b" stroke-width="2"/><rect x="24" y="${py - 7}" width="24" height="14" rx="6" fill="#8a5a2b"/><rect x="352" y="${py - 7}" width="24" height="14" rx="6" fill="#8a5a2b"/></g>`;
    } else if (st === 'cut') {
      prog = Math.min(1, K.cuts.length / K_NEED.cut);
      g += '<g id="k-sheet"><rect x="80" y="90" width="240" height="160" rx="6" fill="#fff4d6" stroke="#e9d9a6" stroke-width="3"/><path d="M80 130 L320 130 M80 170 L320 170 M80 210 L320 210" stroke="#efe2bb" stroke-width="2"/></g>';
      K.cuts.forEach((x) => { const px = 80 + x * 240; g += `<path d="M${px} 86 L${px} 254" stroke="#868e96" stroke-width="3"/>`; });
      g += '<text x="200" y="84" text-anchor="middle" font-size="14" font-weight="800" fill="#7a4b2a">↓ たてに なぞる ↓</text>';
    } else if (st === 'done') {
      prog = 1;
      for (let i = 0; i < 16; i += 1) g += `<path d="M${90 + i * 14} 110 q-10 40 4 80 t-2 60" fill="none" stroke="#fff8e1" stroke-width="9" stroke-linecap="round"/><path d="M${90 + i * 14} 110 q-10 40 4 80 t-2 60" fill="none" stroke="#e9d9a6" stroke-width="1"/>`;
      const s = K.result.stars;
      g += `<text x="200" y="64" text-anchor="middle" font-size="40">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</text>`;
      acts = K.kind === 'shop'
        ? '<button class="main" id="k-open">🏮 おみせを あける</button>'
        : '<button class="main" id="k-again">🥣 もういちど</button><button id="k-home" data-home>🏠 おうちへ</button>';
    }
    if (st !== 'done') {
      g += `<rect x="40" y="20" width="320" height="16" rx="8" fill="#fff" stroke="#e2c8a8" stroke-width="2"/><rect x="42" y="22" width="${316 * prog}" height="12" rx="6" fill="#40c057"/>`;
      if (K.kind === 'shop' && save.day > 1 && st !== 'done') acts += '<button id="k-skip">⏭ とばして かいてん</button>';
    }
    $('k-svg').innerHTML = g;
    let guide = st === 'done'
      ? `きょうの こし ${'★'.repeat(K.result.stars)}！ ${K.result.stars === 3 ? 'もちもちの めんが できたよ！' : K.result.stars === 2 ? 'いい めんが できたよ！' : 'めんが できたよ！'}`
      : K_GUIDE[st];
    if (st === 'done' && K.result.even) guide += '（はばが そろって ◎）';
    $('k-guide').innerHTML = R(guide);
    $('k-acts').innerHTML = acts;
  }
  function svgPt(svg, e) {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  }
  $('k-acts').addEventListener('click', (e) => {
    const f = e.target.closest('[data-foot]');
    if (f && K.step === 'step' && !K.adv) {
      const foot = f.dataset.foot;
      if (K.lastFoot && K.lastFoot !== foot) K.alts += 1;
      K.lastFoot = foot;
      K.steps += 1;
      Sound.sfx('step');
      if (K.steps >= K_NEED.step) kAdvance(150); else renderK();
      return;
    }
    if (e.target.closest('#k-open')) { startDay(); return; }
    if (e.target.closest('#k-again')) { startMenuchi('only'); return; }
    if (e.target.closest('#k-skip')) { startDay(); }
  });
  const ksvg = $('k-svg');
  ksvg.addEventListener('pointerdown', (e) => {
    if (K.adv) return;
    const p = svgPt(ksvg, e);
    const tgt = e.target.closest('[data-k]');
    if (K.step === 'mix' && tgt) {
      const k = tgt.dataset.k;
      if (!K[k]) { K[k] = true; Sound.sfx(k === 'flour' ? 'whoosh' : 'pour'); }
      if (K.flour && K.water) { renderK(); kAdvance(350); } else renderK();
      return;
    }
    K.ptr = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y, lastY: p.y, dir: 0, acc: 0 };
    if (K.step === 'knead') K.lastAng = Math.atan2(p.y - 180, p.x - 200);
    if (K.step === 'roll') { K.rollY = p.y; renderK(); }
    try { ksvg.setPointerCapture(e.pointerId); } catch (err) { /* なし */ }
  });
  ksvg.addEventListener('pointermove', (e) => {
    const P = K.ptr;
    if (!P || P.id !== e.pointerId) return;
    const p = svgPt(ksvg, e);
    if (K.step === 'knead') {
      const a = Math.atan2(p.y - 180, p.x - 200);
      let d = a - K.lastAng;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.hypot(p.x - 200, p.y - 180) > 15) K.knead += Math.abs(d);
      K.lastAng = a;
      P.acc += Math.abs(d);
      if (P.acc > 1.4) { P.acc = 0; Sound.sfx('knead'); renderK(); }
      if (K.knead >= K_NEED.knead) kAdvance(0);
    } else if (K.step === 'roll') {
      K.rollY = Math.max(80, Math.min(280, p.y));
      const dy = p.y - P.lastY;
      if (Math.abs(dy) > 40) {
        const dir = Math.sign(dy);
        if (dir !== P.dir) { K.roll += 1; P.dir = dir; Sound.sfx('roll'); }
        P.lastY = p.y;
      }
      renderK();
      if (K.roll >= K_NEED.roll) kAdvance(200);
    }
    P.x = p.x; P.y = p.y;
  });
  function kUp(e) {
    const P = K.ptr;
    if (!P || P.id !== e.pointerId) return;
    K.ptr = null;
    if (K.step === 'cut') {
      const p = svgPt(ksvg, e);
      const dy = Math.abs(p.y - P.y0);
      const dx = Math.abs(p.x - P.x0);
      const x = (p.x + P.x0) / 2;
      if (dy > 70 && dx < 50 && x > 84 && x < 316) {
        K.cuts.push((x - 80) / 240);
        Sound.sfx('cut');
        if (K.cuts.length >= K_NEED.cut) { renderK(); kAdvance(300); return; }
      }
      renderK();
    }
  }
  ksvg.addEventListener('pointerup', kUp);
  ksvg.addEventListener('pointercancel', (e) => { if (K.ptr && K.ptr.id === e.pointerId) K.ptr = null; });

  /* ================= えいぎょう ================= */
  const ST_IDS = M.STATIONS.map((s) => s.id);
  function startDay() {
    S.mode = 'shop';
    S.D = M.DIFF[save.diff];
    S.day = save.day;
    S.t = 0;
    S.r = Shop.rng((SEED != null ? SEED : S.day * 977) + 5);
    const n = FORCE_N || M.customersFor(S.day);
    S.custs = Shop.makeDay(S.day, save.diff, SEED != null ? SEED : S.day * 7919 + 13, n).map((c) => Object.assign(c, {
      phase: 'out', redo: 0, boils: [], soups: [], picked: [], oi: 0, thanks: false,
    }));
    S.stock = {};
    Shop.unlocked(S.day).sides.forEach((k) => { S.stock[k] = M.SIDES[k].fry ? S.D.stock : 99; });
    S.build = null;
    S.fry = { stage: null, item: null, c: 0 };
    S.reji = null;
    S.stats = { sales: 0, bowls: 0, niko: 0, served: 0 };
    S.dayOver = false;
    S.station = 'counter';
    S.msgs = {};
    S.cat = { on: false, next: 20 + S.r() * 30, until: 0, purr: 0 };
    S.hotSaid = false;
    S.nextAt = null;
    show('shop');
    $('orders').classList.remove('hidden');
    $('tabs').classList.remove('hidden');
    buildStations();
    renderAll();
    toast(M.SAY.open);
    Sound.say(M.SAY.open);
  }
  function startReji() {
    S.mode = 'reji';
    S.D = M.DIFF[save.diff];
    S.day = Math.max(3, save.day);
    S.t = 0;
    S.r = Shop.rng(SEED != null ? SEED : Date.now() % 100000);
    S.custs = [];
    S.practice = 0;
    S.practiceOk = 0;
    S.stats = { sales: 0, bowls: 0, niko: 0, served: 0 };
    S.station = 'reji';
    S.msgs = {};
    S.reji = null;
    S.dayOver = false;
    show('shop');
    $('orders').classList.add('hidden');
    $('tabs').classList.add('hidden');
    buildStations();
    nextPractice();
    renderAll();
  }
  const PRACTICE_N = 5;
  function nextPractice() {
    const r = S.r;
    const kinds = M.KIND_ORDER;
    const sides = M.SIDE_ORDER;
    const types = M.CUSTOMER_ORDER.filter((x) => x !== 'oyako');
    const nItems = S.D.change ? 3 + r.int(2) : 2;
    const o = { kind: r.pick(kinds), size: r() < 0.5 ? 'nami' : 'dai', toppings: [], tempura: [] };
    const orders = [o];
    let left = nItems - 1;
    if (left >= 3 && r() < 0.5) { orders.push({ kind: r.pick(kinds), size: 'nami', toppings: [], tempura: [] }); left -= 1; }
    for (let i = 0; i < left; i += 1) o.tempura.push(r.pick(sides));
    const c = { id: 100 + S.practice, type: r.pick(types), orders, phase: 'reji', rejiAt: 0, picked: o.tempura.slice(), redo: 0, boils: [], soups: [], patience: 0, arrivedAt: 0, servedAt: 0 };
    S.custs.push(c);
    S.reji = null;
  }

  /* ---------- おきゃくさん ---------- */
  const inPhase = (p) => S.custs.filter((c) => c.phase === p);
  const curCust = () => inPhase('ordered').sort((a, b) => a.greetedAt - b.greetedAt)[0] || null;
  const curOrder = () => { const c = curCust(); return c ? c.orders[c.oi] : null; };
  const canGreet = () => S.mode === 'shop' && inPhase('line').length > 0 && inPhase('ordered').length < S.D.together;
  const rejiCust = () => inPhase('reji').sort((a, b) => a.rejiAt - b.rejiAt)[0] || null;
  const cname = (c) => M.CUSTOMERS[c.type].name;
  const sideList = (c) => c.orders.reduce((a, o) => a.concat(o.tempura || []), []);

  function arrive(c) {
    c.phase = 'line';
    c.arrivedAt = S.t;
    Sound.sfx('ding');
    if (S.station !== 'counter') toast('🔔 おきゃくさんが きたよ！');
    renderAll();
  }
  function orderWords(c) {
    const parts = c.orders.map((o) => `${M.KINDS[o.kind].name}の ${M.SIZE[o.size]}`);
    let s = `${parts.join('と ')}を ください。`;
    const tops = c.orders[0].toppings.map((t) => M.TOPPINGS[t].name);
    if (tops.length) s += `${tops.join('と ')}を のせてね。`;
    return s;
  }
  function greet() {
    if (!canGreet()) return;
    const c = inPhase('line').sort((a, b) => a.arrivedAt - b.arrivedAt)[0];
    c.phase = 'ordered';
    c.greetedAt = S.t;
    c.oi = 0;
    unlockTip('counter');
    Sound.say(M.SAY.hello);
    const cc = M.CUSTOMERS[c.type];
    if (cc.picturesOnly) {
      Sound.say(cc.hello, 'en-US', true);
      msg('counter', `${cname(c)}「${cc.hello}」（ちゅうもんは えカードを みてね）`);
    } else {
      Sound.say(orderWords(c), 'ja-JP', true);
      msg('counter', `${cname(c)}「${cc.hello}」`);
    }
    ensureBuild();
    renderAll();
  }
  function repeatOrder() {
    const c = curCust();
    if (!c) return;
    if (M.CUSTOMERS[c.type].picturesOnly) Sound.say(M.CUSTOMERS[c.type].hello, 'en-US');
    else Sound.say(orderWords(c));
  }

  /* ---------- つくる（ゆでる・もりつけ） ---------- */
  function newBuild() {
    const c = curCust();
    S.build = c ? { cid: c.id, oi: c.oi, stage: 'balls', balls: 0, boilT: 0, boil: null, steps: [], drainN: 0, chillN: 0, soup: 0, soupKind: null, toppings: [], dip: false, inBowl: false } : null;
    Sound.loop('boil', 0);
  }
  function ensureBuild() {
    const c = curCust();
    if (!c) { S.build = null; return null; }
    if (!S.build || S.build.cid !== c.id || S.build.oi !== c.oi) newBuild();
    return S.build;
  }
  function addBall() {
    const b = ensureBuild();
    if (!b) { msg('yude', 'ちゅうもんを きいてから ゆでよう。'); return; }
    if (b.stage !== 'balls') return;
    if (b.balls >= 2) { msg('yude', 'めんは 2たま まで（だい）。'); return; }
    b.balls += 1;
    Sound.sfx('plop');
    msg('yude', `めん ${b.balls}たま（${b.balls === 1 ? 'なみ' : 'だい'}）`);
  }
  function potBall() {
    const b = S.build;
    if (!b) return;
    if (b.stage === 'balls' && b.balls > 0) { b.balls -= 1; Sound.sfx('pop'); msg('yude', `めんを 1たま もどしたよ（${b.balls}たま）`); return; }
    if (b.stage === 'boiling') lift();
  }
  function startBoil() {
    const b = S.build;
    if (!b || b.stage !== 'balls' || !b.balls) return;
    b.stage = 'boiling';
    b.boilT = 0;
    Sound.loop('boil', 0.9);
    Sound.sfx('splash');
    unlockTip('yude');
    msg('yude', S.hotSaid ? 'みどりの ところで すくおう！' : `${M.SAY.hot} みどりの ところで すくおう！`);
    S.hotSaid = true;
  }
  function lift() {
    const b = S.build;
    if (!b || b.stage !== 'boiling') return;
    b.boil = Shop.boilJudge(b.boilT, S.D.boilWin);
    b.stage = 'lifted';
    b.steps.push('boil');
    Sound.loop('boil', 0);
    Sound.sfx('splash');
    msg('yude', { ok: M.SAY.boilOk, hard: M.SAY.boilHard, soft: M.SAY.boilSoft }[b.boil]);
    if (b.boil === 'ok') Sound.sfx('good');
  }
  function shake() {
    const b = S.build;
    if (!b) return;
    if (b.stage === 'boiling') { lift(); return; }
    if (b.stage !== 'lifted') return;
    b.drainN += 1;
    Sound.sfx('drain');
    if (b.drainN >= 3 && !b.steps.includes('drain')) { b.steps.push('drain'); msg('yude', 'ちゃっちゃっ！ ゆきり できた！'); unlockTip('tebo'); } else if (b.drainN < 3) msg('yude', `ゆきり ${b.drainN}／3`);
    const el = $('y-tebo');
    if (el) { el.classList.remove('shake'); void el.getBBox(); el.classList.add('shake'); }
  }
  function chill() {
    const b = S.build;
    if (!b || b.stage !== 'lifted') { msg('yude', 'めんを すくってから ひやそう。'); return; }
    b.chillN += 1;
    Sound.sfx('splash');
    if (b.chillN >= 2 && !b.steps.includes('chill')) { b.steps.push('chill'); msg('yude', 'きゅっと しまった！'); unlockTip('zaru'); } else if (b.chillN < 2) msg('yude', `ひやす ${b.chillN}／2`);
  }
  function toBowl() {
    const b = S.build;
    if (!b || b.stage !== 'lifted') return;
    b.steps.push('bowl');
    b.inBowl = true;
    b.stage = 'bowl';
    Sound.sfx('plop');
    msg('mori', 'つゆと トッピングを のせよう。');
    goStation('mori');
  }
  function holdStart(kind) {
    const b = S.build;
    if (!b || !b.inBowl) { msg('mori', 'まず めんを うつわに もろう。'); return; }
    S.holding = kind;
    b.soupKind = kind;
    S.pourAcc = 0;
  }
  function holdEnd() {
    const kind = S.holding;
    S.holding = null;
    const b = S.build;
    if (!kind || !b) return;
    if (b.soup > 0 && !b.steps.includes(kind)) b.steps.push(kind);
    const o = curOrder();
    if (o) {
      const j = Shop.soupJudge(b.soup, o.kind);
      msg('mori', { ok: M.SAY.soupOk, few: M.SAY.soupFew, many: M.SAY.soupMany }[j]);
    }
    renderAll();
  }
  function toggleDip() {
    const b = S.build;
    if (!b || !b.inBowl) { msg('mori', 'まず めんを うつわに もろう。'); return; }
    b.dip = !b.dip;
    if (b.dip) { if (!b.steps.includes('dipSoup')) b.steps.push('dipSoup'); } else b.steps = b.steps.filter((s) => s !== 'dipSoup');
    Sound.sfx('pop');
  }
  function addTop(id) {
    const b = S.build;
    if (!b || !b.inBowl) { msg('mori', 'まず めんを うつわに もろう。'); return; }
    if (!b.toppings.includes(id)) b.toppings.push(id);
    Sound.sfx('sprinkle');
    unlockTip('mori');
  }
  function unTop(id) {
    const b = S.build;
    if (!b) return;
    b.toppings = b.toppings.filter((t) => t !== id);
    Sound.sfx('pop');
    msg('mori', `${M.TOPPINGS[id].name}を とったよ。`);
  }
  function serve() {
    const b = S.build;
    const c = curCust();
    const o = curOrder();
    if (!b || !c || !o || !b.inBowl) { msg('mori', 'まず めんを ゆでて うつわに もろう。'); return; }
    const done = { steps: b.steps.concat('topping'), balls: b.balls, toppings: b.toppings.slice(), soup: b.soup, soupKind: b.soupKind };
    const res = Shop.check(o, done);
    if (res.ok) {
      const soupy = M.KINDS[o.kind].recipe.some((s) => s === 'hotSoup' || s === 'coldSoup' || s === 'hotWater');
      c.boils.push(b.boil || 'ok');
      c.soups.push(soupy ? Shop.soupJudge(b.soup, o.kind) : 'ok');
      c.oi += 1;
      S.stats.bowls += 1;
      Sound.sfx('good');
      toast(`${M.KINDS[o.kind].name}、おまちどおさま！`);
      if (c.oi >= c.orders.length) {
        c.phase = 'shelf';
        c.servedAt = S.t;
        c.lastPick = S.t;
        c.waiting = null;
        S.build = null;
        msg('mori', `${cname(c)}は てんぷらを とりに いったよ。`);
        if (!sideList(c).length) msg('tenpura', '');
      } else {
        newBuild();
        msg('yude', 'もう 1ぱい！ つぎの うどんを ゆでよう。');
        goStation('yude');
      }
    } else {
      c.redo += 1;
      const m0 = res.diffs[0].msg;
      Sound.sfx('soft');
      Sound.say(`あれ？ ${M.plain(m0)}`);
      if (Shop.onlyToppings(res)) {
        msg('mori', `あれ？ ${m0}`);
      } else {
        toast(`あれ？ ${m0}`, 3200);
        newBuild();
        msg('yude', `${M.SAY.redo}（${m0}）`);
        setTimeout(() => goStation('yude'), 900);
      }
    }
    renderAll();
  }
  function resetBuild() {
    if (!curCust()) return;
    newBuild();
    msg('yude', M.SAY.redo);
    goStation('yude');
  }

  /* ---------- てんぷら ---------- */
  function pickRaw(item) {
    if (S.fry.stage) { msg('tenpura', 'いま あげて いる ものが あるよ。'); return; }
    S.fry = { stage: 'battered', item, c: 0 };
    Sound.sfx('knead');
    msg('tenpura', `${M.SIDES[item].name}に ころもを つけたよ。あぶらへ いれよう！`);
  }
  function toOil() {
    if (S.fry.stage !== 'battered') return;
    S.fry.stage = 'frying';
    S.fry.c = 0;
    Sound.sfx('fryIn');
    msg('tenpura', `${M.SAY.hot} きつねいろで ひきあげよう！`);
  }
  function fryLift() {
    const f = S.fry;
    if (f.stage !== 'frying') return;
    const j = Shop.fryJudge(f.c, S.D.fryWin);
    const add = { good: 3, white: 2, burnt: 0 }[j];
    S.stock[f.item] = Math.min(6, (S.stock[f.item] || 0) + add);
    Sound.loop('fry', 0);
    Sound.sfx(j === 'good' ? 'good' : j === 'white' ? 'pop' : 'soft');
    msg('tenpura', `${{ good: M.SAY.fryGood, white: M.SAY.fryWhite, burnt: M.SAY.fryBurnt }[j]}${add ? `（${M.SIDES[f.item].name} ＋${add}）` : ''}`);
    S.fry = { stage: null, item: null, c: 0 };
    unlockTip('tenpura');
  }
  function oilTap() {
    if (S.fry.stage === 'battered') toOil();
    else if (S.fry.stage === 'frying') fryLift();
  }

  /* ---------- おかいけい ---------- */
  function ensureReji() {
    const c = rejiCust();
    if (!c) { S.reji = null; return null; }
    if (!S.reji || S.reji.cid !== c.id) {
      const items = Shop.itemsOf(c);
      S.reji = { cid: c.id, items, tapped: items.map(() => false), sum: 0, total: Shop.total(items), stage: 'sum', paid: 0, tray: [], wrong: 0, at: S.t };
    }
    return S.reji;
  }
  function tapItem(i) {
    const r = ensureReji();
    if (!r || r.stage !== 'sum' || r.tapped[i]) return;
    r.tapped[i] = true;
    r.sum += r.items[i].price;
    Sound.sfx('tap');
    msg('reji', `＋${r.items[i].price}えん → ${r.sum}えん`);
    if (r.tapped.every(Boolean)) {
      Sound.sfx('chin');
      r.paid = S.D.change ? Shop.payWith(r.total, S.r) : r.total;
      r.stage = r.paid === r.total ? 'pay' : 'change';
      Sound.say(`ごうけい ${r.total}えん です。`);
      msg('reji', r.stage === 'pay' ? `ごうけい ${r.total}えん。ちょうど もらったよ！` : `ごうけい ${r.total}えん。${r.paid}えん もらったよ。`);
      unlockTip('reji');
    }
  }
  function payExact() {
    const r = S.reji;
    if (!r || r.stage !== 'pay') return;
    Sound.sfx('coin');
    r.stage = 'thanks';
    r.at = S.t;
    msg('reji', 'さいごに ごあいさつ！');
  }
  function addCoin(v) {
    const r = S.reji;
    if (!r || r.stage !== 'change') return;
    if (r.tray.length >= 14) return;
    r.tray.push(v);
    Sound.sfx('coin');
  }
  function unTray(i) {
    const r = S.reji;
    if (!r || r.stage !== 'change') return;
    r.tray.splice(i, 1);
    Sound.sfx('pop');
  }
  function giveChange() {
    const r = S.reji;
    if (!r || r.stage !== 'change') return;
    const ch = Shop.change(r.paid, r.total);
    const sum = Shop.coinsSum(r.tray);
    if (sum === ch) {
      Sound.sfx('good');
      r.stage = 'thanks';
      r.at = S.t;
      msg('reji', `${M.SAY.changeOk} さいごに ごあいさつ！`);
      if (S.mode === 'reji' && !r.wrong) S.practiceOk += 1;
    } else {
      r.wrong += 1;
      Sound.sfx('soft');
      if (save.diff === 'tencho' && r.wrong === 1) msg('reji', `ちょっと ちがうみたい。${r.paid} − ${r.total} は いくつかな？`);
      else msg('reji', sum < ch ? `おしい！ あと ${ch - sum}えん たりないよ。` : `おしい！ ${sum - ch}えん おおいよ。`);
    }
  }
  function sayThanks(auto) {
    const r = S.reji;
    const c = rejiCust();
    if (!r || !c || r.stage !== 'thanks') return;
    if (!auto) { c.thanks = true; Sound.say(M.SAY.thanks); }
    const cc = M.CUSTOMERS[c.type];
    Sound.say(cc.thanks, cc.en ? 'en-US' : 'ja-JP', true);
    Sound.sfx('chin');
    if (S.mode === 'reji') {
      if (!S.D.change && !r.wrong) S.practiceOk += 1;
      c.phase = 'done';
      S.practice += 1;
      S.reji = null;
      toast(`${cname(c)}「${cc.thanks}」`);
      if (S.practice >= PRACTICE_N) { setTimeout(endPractice, 900); } else nextPractice();
      renderAll();
      return;
    }
    finishCustomer(c, r.total);
  }
  function worst(arr) {
    if (arr.includes('soft') || arr.includes('hard') || arr.includes('few') || arr.includes('many')) return arr.find((x) => x !== 'ok');
    return 'ok';
  }
  function curNiko(c) {
    return Shop.niko({
      redo: c.redo, boil: worst(c.boils), soup: worst(c.soups),
      waited: (c.servedAt || S.t) - c.arrivedAt, patience: c.patience, thanks: c.thanks,
    });
  }
  function finishCustomer(c, total) {
    c.niko = curNiko(c);
    c.phase = 'done';
    S.reji = null;
    S.stats.sales += total;
    S.stats.niko += c.niko;
    S.stats.served += 1;
    const cc = M.CUSTOMERS[c.type];
    toast(`${'😊'.repeat(c.niko)} ${cname(c)}「${cc.thanks}」`, 2600);
    msg('reji', '');
    renderAll();
    if (S.custs.every((x) => x.phase === 'done')) { S.dayOver = true; setTimeout(endDay, 1500); }
  }

  /* ---------- へいてん ---------- */
  function endDay() {
    Sound.stopLoops();
    const day = S.day;
    save.day = day + 1;
    save.stamps.push({ day, niko: S.stats.niko, sales: S.stats.sales });
    save.sales += S.stats.sales;
    save.bowls += S.stats.bowls;
    save.bestNiko = Math.max(save.bestNiko, S.stats.niko);
    unlockTip('sanuki');
    persist();
    $('end-ttl').innerHTML = R(`${day}にちめの えいぎょう おしまい！`);
    $('praise').innerHTML = day === 5 ? R(M.SAY.tencho5) : day === 10 ? R(M.SAY.tencho10) : '';
    $('end-stats').innerHTML = `<div>うりあげ<b>${S.stats.sales}</b>えん</div><div>だした うどん<b>${S.stats.bowls}</b>はい</div><div>ニコニコ<b>${S.stats.niko}</b>こ</div>`;
    const n = save.stamps.length;
    const start = Math.floor((n - 1) / 10) * 10;
    let h = '<div class="ttl">🏮 スタンプ カード</div>';
    for (let i = 0; i < 10; i += 1) {
      const k = start + i;
      const on = k < n;
      h += `<div class="stamp ${on ? 'on' : ''} ${k === n - 1 ? 'new' : ''}">${on ? '🍜' : k + 1}</div>`;
    }
    $('card-stamps').innerHTML = h;
    $('card-stamps').classList.remove('hidden');
    $('end-acts').innerHTML = '<button class="main" id="e-next">☀️ つぎの ひへ</button><button id="e-home" data-home>🏠 おうちへ</button>';
    show('end');
    Sound.sfx('stamp');
    if (day === 5 || day === 10) Sound.say(M.plain(day === 5 ? M.SAY.tencho5 : M.SAY.tencho10));
  }
  function endPractice() {
    $('end-ttl').innerHTML = R('レジ れんしゅう おしまい！');
    $('praise').innerHTML = R(S.practiceOk === PRACTICE_N ? 'ぜんぶ いっぱつで できたね！ すごい！' : 'よく がんばったね！');
    $('end-stats').innerHTML = `<div>おきゃくさん<b>${S.practice}</b>にん</div><div>いっぱつ せいかい<b>${S.practiceOk}</b>かい</div><div>むずかしさ<b style="font-size:18px">${S.D.name}</b></div>`;
    $('card-stamps').classList.add('hidden');
    $('end-acts').innerHTML = '<button class="main" id="e-reji">💴 もういちど</button><button id="e-home" data-home>🏠 おうちへ</button>';
    show('end');
  }
  $('end-acts').addEventListener('click', (e) => {
    if (e.target.closest('#e-next')) startMenuchi('shop');
    if (e.target.closest('#e-reji')) startReji();
  });

  /* ---------- ずかん ---------- */
  function openZukan() {
    const d = save.day;
    let h = '';
    M.KIND_ORDER.forEach((k) => {
      const v = M.KINDS[k];
      const lock = v.day > d;
      h += `<div class="mi ${lock ? 'locked' : ''}"><svg viewBox="-10 -14 140 82" class="oicon">${Art.vessel(Object.assign({ kind: k }, Shop.perfect({ kind: k, size: 'nami', toppings: ['negi'] }), { toppings: ['negi'], dip: v.recipe.includes('dipSoup') }), 50, 20, 90)}</svg><div>${lock ? '？？？' : v.name}</div><div>${lock ? `${v.day}にちめから` : `なみ ${v.price.nami}えん／だい ${v.price.dai}えん`}</div>${lock ? '' : `<small>${R(v.tip)}</small>`}</div>`;
    });
    M.SIDE_ORDER.forEach((k) => {
      const v = M.SIDES[k];
      const lock = v.day > d;
      h += `<div class="mi ${lock ? 'locked' : ''}">${Art.sideIcon(k)}<div>${lock ? '？？？' : v.name}</div><div>${lock ? `${v.day}にちめから` : `${v.price}えん`}</div></div>`;
    });
    $('menu-list').innerHTML = h;
    $('tips').innerHTML = M.ZUKAN.map((z) => {
      const open = save.zukan[z.id];
      return `<div class="tip ${open ? '' : 'locked'}"><b>${z.icon} ${z.title}</b><br>${open ? R(z.text) : 'まだ ひみつ。おしごとを すると ひらくよ。'}</div>`;
    }).join('');
    show('zukan');
  }

  /* ================= ステーションの え ================= */
  function buildStations() {
    const list = S.mode === 'reji' ? [M.STATIONS[4]] : M.STATIONS;
    const titles = { counter: '🗣 ちゅうもん カウンター', yude: '♨️ ゆでる・ゆきり', mori: '🍲 もりつけ', tenpura: '🍤 てんぷら', reji: '💴 おかいけい' };
    $('track').innerHTML = list.map((s) => `<section class="station" id="st-${s.id}" data-st="${s.id}"><div class="st-title">${titles[s.id]}</div><svg class="scene" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid meet"></svg><div class="st-msg"></div><div class="acts"></div></section>`).join('');
    $('tabs').innerHTML = M.STATIONS.map((s) => `<button id="tab-${s.id}" data-tab="${s.id}"><span class="ti">${s.icon}</span><span>${s.name}</span></button>`).join('');
    layoutTrack();
  }
  function stationIds() { return S.mode === 'reji' ? ['reji'] : ST_IDS; }
  function layoutTrack() {
    const stage = $('stage');
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const land = W > H * 1.25 && W >= 700 && S.mode !== 'reji';
    const sw = land ? Math.round(W * 0.66) : W;
    const ids = stationIds();
    document.querySelectorAll('.station').forEach((el) => { el.style.width = `${sw}px`; el.style.flex = `0 0 ${sw}px`; });
    const idx = Math.max(0, ids.indexOf(S.station));
    $('track').style.transform = `translateX(${-idx * sw + (W - sw) / 2}px)`;
    document.querySelectorAll('.station').forEach((el) => el.classList.toggle('away', el.dataset.st !== S.station));
  }
  function goStation(id) {
    if (!stationIds().includes(id)) return;
    if (S.station !== id) Sound.sfx('whoosh');
    S.station = id;
    layoutTrack();
    renderAll();
  }
  window.addEventListener('resize', () => { if (S.screen === 'shop') layoutTrack(); });
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) goStation(b.dataset.tab);
  });

  const BG = (wall) => `<rect x="0" y="0" width="400" height="260" fill="${wall || '#fff3e0'}"/>`;
  const counterTop = (y) => `<rect x="0" y="${y}" width="400" height="${260 - y}" fill="${Art.C.wood}"/><rect x="0" y="${y}" width="400" height="8" fill="${Art.C.woodDark}"/>`;
  function bubble(x, y, w, h, tailX, tailY, inner) {
    return `<g><path d="M${x + 12} ${y} H${x + w - 12} Q${x + w} ${y} ${x + w} ${y + 12} V${y + h - 12} Q${x + w} ${y + h} ${x + w - 12} ${y + h} H${Math.min(x + w - 20, tailX + 22)} L${tailX} ${tailY} L${Math.min(x + w - 40, tailX + 6)} ${y + h} H${x + 12} Q${x} ${y + h} ${x} ${y + h - 12} V${y + 12} Q${x} ${y} ${x + 12} ${y}Z" fill="#fff" stroke="#adb5bd" stroke-width="2"/>${inner}</g>`;
  }
  function moodOf(c) {
    if (c.patience && S.t - c.arrivedAt > c.patience * 0.75 && c.phase !== 'reji') return 'wait';
    if (c.phase === 'reji' && S.reji && S.reji.stage === 'thanks') return 'happy';
    return 'normal';
  }
  /* ちゅうもんの え（ふきだしの なか） */
  function orderPic(c, x, y) {
    let s = '';
    const pics = M.CUSTOMERS[c.type].picturesOnly;
    c.orders.forEach((o, i) => {
      const yy = y + i * 54;
      s += Art.vessel({ kind: o.kind, ...Shop.perfect(o), dip: M.KINDS[o.kind].recipe.includes('dipSoup'), toppings: o.toppings }, x + 34, yy + 14, 54);
      for (let k = 0; k < Menu.BALLS[o.size]; k += 1) s += `<circle cx="${x + 84 + k * 13}" cy="${yy + 6}" r="5.5" fill="#fff8e1" stroke="#c9a06b" stroke-width="2"/>`;
      if (!pics) s += `<text x="${x + 92}" y="${yy + 30}" font-size="14" font-weight="800" text-anchor="middle" fill="${o.size === 'dai' ? '#c92a2a' : '#b35c00'}">${M.SIZE[o.size]}</text>`;
      if (!pics && i === 0) s += `<text x="${x + 4}" y="${yy - 14}" font-size="11" font-weight="800" fill="#495057">${M.KINDS[o.kind].name}</text>`;
    });
    return s;
  }

  function renderCounter(svg, acts) {
    let g = BG('#fff3e0');
    g += '<rect x="0" y="0" width="400" height="40" fill="#364fc7"/>';
    for (let i = 1; i < 5; i += 1) g += `<path d="M${i * 80} 0 V40" stroke="#fff3e0" stroke-width="3"/>`;
    [120, 280].forEach((x) => { g += `<g transform="translate(${x} 20)"><ellipse rx="5" ry="10" fill="#fff"/><path d="M0 -13 L0 13" stroke="#fff" stroke-width="2"/></g>`; });
    const ordered = inPhase('ordered').sort((a, b) => a.greetedAt - b.greetedAt);
    const line = inPhase('line').sort((a, b) => a.arrivedAt - b.arrivedAt);
    // メニュー ばん（ねだん）
    if (!ordered.length) {
      const kinds = Shop.unlocked(S.day).kinds;
      g += '<rect x="160" y="50" width="140" height="132" rx="8" fill="#5c3d2e"/><text x="230" y="68" text-anchor="middle" font-size="12" font-weight="800" fill="#ffe8cc">おしながき</text>';
      kinds.forEach((k, i) => { g += `<text x="168" y="${88 + i * 22}" font-size="11" font-weight="700" fill="#fff">${M.KINDS[k].name}</text><text x="294" y="${88 + i * 22}" font-size="11" font-weight="700" fill="#ffd43b" text-anchor="end">${M.KINDS[k].price.nami}</text>`; });
    }
    g += `<g transform="translate(305 60) scale(.9)">${Art.clerk(save.clerk.skin, save.clerk.hair, 'happy')}</g>`;
    // ならんで いる ひと
    const front = ordered.length ? null : line[0];
    const waiters = front ? line.slice(1) : line;
    waiters.slice(0, 3).reverse().forEach((c, i, arr) => {
      const k = arr.length - 1 - i;
      g += `<g transform="translate(${-14 + k * -26} ${118 + k * 4}) scale(.62)">${Art.customer(c.type, moodOf(c))}</g>`;
    });
    if (front) g += `<g class="bob" transform="translate(64 92) scale(.95)">${Art.customer(front.type, moodOf(front))}</g>`;
    ordered.forEach((c, i) => {
      g += `<g transform="translate(${i === 0 ? 50 : 150} ${i === 0 ? 92 : 112}) scale(${i === 0 ? 0.95 : 0.7})">${Art.customer(c.type, moodOf(c))}</g>`;
    });
    if (ordered.length) {
      const c = ordered[0];
      const h = 32 + c.orders.length * 54;
      g += bubble(150, 46, 150, h, 130, 120, orderPic(c, 156, 72));
    }
    g += counterTop(196);
    if (S.cat.on) g += `<g id="c-cat" data-act="cat" transform="translate(216 142)">${Art.cat(S.cat.purr > S.t)}<rect x="0" y="0" width="90" height="60" fill="transparent"/></g>`;
    if (!line.length && !ordered.length) g += '<text x="110" y="150" text-anchor="middle" font-size="14" font-weight="800" fill="#868e96">おきゃくさんを まってるよ…</text>';
    svg.innerHTML = g;
    let a = `<button class="main" id="c-hello" ${canGreet() ? '' : 'disabled'}>🙇 いらっしゃいませ！</button>`;
    if (ordered.length) a += '<button id="c-repeat">🔁 もういちど きく</button>';
    acts.innerHTML = a;
  }

  function gauge(x, y, w, v, win, label, id) {
    return `<g><text x="${x}" y="${y - 4}" font-size="11" font-weight="800" fill="#495057">${label}</text><rect x="${x}" y="${y}" width="${w}" height="16" rx="8" fill="#e9ecef" stroke="#adb5bd" stroke-width="1.5"/>`
      + `<rect x="${x + w * win[0]}" y="${y}" width="${w * (win[1] - win[0])}" height="16" fill="#8ce99a"/>`
      + `<rect id="${id}" x="${x + Math.min(1, v) * w - 3}" y="${y - 4}" width="6" height="24" rx="3" fill="#e8590c"/></g>`;
  }
  function renderYude(svg, acts) {
    const b = curCust() ? ensureBuild() : null;
    let g = BG('#fdf3e7');
    for (let i = 0; i < 10; i += 1) g += `<path d="M${i * 40} 40 V200" stroke="#f3e3cf" stroke-width="1"/>`;
    g += '<rect x="0" y="200" width="400" height="60" fill="#ced4da"/><rect x="0" y="200" width="400" height="6" fill="#adb5bd"/>';
    const win = S.D.boilWin;
    g += gauge(110, 22, 180, b ? b.boilT : 0, win, 'ゆでじかん', 'y-needle');
    // かま
    g += '<g id="y-pot" data-drop="pot" data-act="potBall"><path d="M110 120 L118 222 Q200 236 282 222 L290 120Z" fill="#495057"/><ellipse cx="200" cy="120" rx="92" ry="22" fill="#343a40"/><ellipse cx="200" cy="122" rx="84" ry="17" fill="#d0ebff"/>';
    if (b && (b.stage === 'balls' || b.stage === 'boiling')) for (let i = 0; i < b.balls; i += 1) g += Art.ball(176 + i * 46, 122, 20);
    g += '<rect x="108" y="96" width="186" height="140" fill="transparent"/></g>';
    if (b && b.stage === 'boiling') g += Art.steam(200, 96, 3);
    // てぼ
    if (b && b.stage === 'boiling') {
      g += '<g id="y-tebo" data-act="lift"><path d="M246 118 L262 54" stroke="#868e96" stroke-width="7" stroke-linecap="round"/><ellipse cx="236" cy="122" rx="26" ry="9" fill="none" stroke="#868e96" stroke-width="4"/><rect x="200" y="40" width="80" height="96" fill="transparent"/></g>';
    } else if (b && b.stage === 'lifted') {
      g += `<g id="y-tebo" data-swipe="tebo"><path d="M200 108 L250 108 L244 150 Q225 160 206 150Z" fill="#dee2e6" stroke="#868e96" stroke-width="3"/>${Art.noodles(225, 118, 40, b.balls)}<path d="M250 110 L300 70" stroke="#868e96" stroke-width="7" stroke-linecap="round"/>`
        + `${b.steps.includes('drain') ? '' : '<g fill="#74c0fc"><circle cx="214" cy="164" r="3"/><circle cx="230" cy="170" r="3"/><circle cx="240" cy="162" r="2.5"/></g>'}<rect x="180" y="60" width="130" height="120" fill="transparent"/></g>`;
      g += '<text x="225" y="196" text-anchor="middle" font-size="11" font-weight="800" fill="#495057">↕ うえ・したに ふる</text>';
    }
    // めんの トレー
    g += '<rect x="8" y="152" width="92" height="56" rx="8" fill="#c08a4f" stroke="#8a5a2b" stroke-width="2"/>';
    if (b && b.stage === 'balls') for (let i = 0; i < 2 - b.balls; i += 1) g += `<g id="y-ball${i}" data-drag="ball">${Art.ball(32 + i * 42, 178, 19)}<rect x="${10 + i * 42}" y="152" width="44" height="54" fill="transparent"/></g>`;
    g += '<text x="54" y="226" text-anchor="middle" font-size="11" font-weight="800" fill="#495057">なみ 1たま</text><text x="54" y="242" text-anchor="middle" font-size="11" font-weight="800" fill="#c92a2a">だい 2たま</text>';
    // つめたい みず
    g += `<g id="y-tub" data-act="chill"><path d="M312 150 L392 150 L386 212 L318 212Z" fill="#a5d8ff" stroke="#1c7ed6" stroke-width="3"/><path d="M318 162 L386 162" stroke="#e7f5ff" stroke-width="4"/><text x="352" y="194" text-anchor="middle" font-size="11" font-weight="800" fill="#1864ab">つめたい みず</text>${b && b.chillN ? `<text x="352" y="142" text-anchor="middle" font-size="12" font-weight="800" fill="#1864ab">${'💧'.repeat(Math.min(2, b.chillN))}</text>` : ''}<rect x="306" y="130" width="92" height="88" fill="transparent"/></g>`;
    if (!b) g += '<rect x="90" y="70" width="220" height="40" rx="12" fill="#fff" opacity=".92"/><text x="200" y="96" text-anchor="middle" font-size="14" font-weight="800" fill="#868e96">ちゅうもんを まってるよ</text>';
    svg.innerHTML = g;
    let a = '';
    if (b && b.stage === 'balls') a += `<button class="main" id="y-start" ${b.balls ? '' : 'disabled'}>⏱ ゆでる</button>`;
    if (b && b.stage === 'boiling') a += '<button class="main" id="y-lift">🧺 すくう</button>';
    if (b && b.stage === 'lifted') a += '<button class="green" id="y-next">うつわへ ➡</button>';
    acts.innerHTML = a;
  }
  function renderMori(svg, acts) {
    const b = curCust() ? ensureBuild() : null;
    const o = curOrder();
    let g = BG('#fff3e0');
    g += counterTop(206);
    const pots = [['hotSoup', 'あったか つゆ', '#e03131', Art.C.hot], ['coldSoup', 'つめたい つゆ', '#1c7ed6', Art.C.cold], ['hotWater', 'ゆでじる', '#868e96', Art.C.water]];
    pots.forEach(([id, nm, lid, col], i) => {
      const y = 44 + i * 72;
      g += `<g id="m-${id}" data-hold="${id}"><rect x="12" y="${y}" width="64" height="46" rx="10" fill="${col}" stroke="#495057" stroke-width="2"/><rect x="8" y="${y - 6}" width="72" height="10" rx="5" fill="${lid}"/><path d="M76 ${y + 14} L92 ${y + 8}" stroke="#495057" stroke-width="5" stroke-linecap="round"/><text x="44" y="${y + 62}" text-anchor="middle" font-size="11" font-weight="800" fill="#495057">${nm}</text><rect x="4" y="${y - 10}" width="92" height="76" fill="transparent"/></g>`;
    });
    // つゆの メーター
    const sw = o ? Shop.soupWindow(o.kind) : [0.6, 0.88];
    g += `<g><rect x="104" y="60" width="14" height="130" rx="7" fill="#e9ecef" stroke="#adb5bd" stroke-width="1.5"/><rect x="104" y="${60 + 130 * (1 - sw[1])}" width="14" height="${130 * (sw[1] - sw[0])}" fill="#8ce99a"/><rect id="m-soupfill" x="107" y="${60 + 130 * (1 - Math.min(1, b ? b.soup : 0))}" width="8" height="${130 * Math.min(1, b ? b.soup : 0)}" rx="4" fill="#e8590c"/><text x="111" y="52" text-anchor="middle" font-size="10" font-weight="800" fill="#495057">つゆ</text></g>`;
    // うつわ
    g += `<g id="m-bowl" data-drop="bowl"><rect x="130" y="70" width="160" height="130" fill="transparent"/><g id="m-bowl-art">${b && b.inBowl ? Art.vessel({ kind: o.kind, balls: b.balls, soup: b.soup, soupKind: b.soupKind, toppings: b.toppings, dip: b.dip }, 205, 120, 140) : (o ? Art.vessel({ kind: o.kind }, 205, 120, 140) : '')}</g></g>`;
    if (S.holding && b) {
      const i = pots.findIndex((p) => p[0] === S.holding);
      g += `<path id="m-stream" d="M92 ${52 + i * 72} Q150 ${40 + i * 40} 196 118" fill="none" stroke="${pots[i][3]}" stroke-width="6" stroke-linecap="round" opacity=".85"/>`;
    }
    // つけつゆ
    g += `<g id="m-dip" data-act="dip"><path d="M286 214 L322 214 L316 244 L292 244Z" fill="#fff" stroke="#495057" stroke-width="2"/><ellipse cx="304" cy="214" rx="18" ry="5" fill="${Art.C.dip}"/><text x="304" y="256" text-anchor="middle" font-size="10" font-weight="800" fill="#495057">つけつゆ</text><rect x="276" y="200" width="56" height="60" fill="transparent"/></g>`;
    // トッピング
    M.TOPPING_ORDER.forEach((t, i) => {
      const y = 40 + i * 58;
      g += `<g id="m-top-${t}" data-drag="top" data-arg="${t}"><rect x="320" y="${y}" width="72" height="44" rx="10" fill="#fff" stroke="#e2c8a8" stroke-width="2"/>${Art.toppingArt(t, 348, y + 16)}${Art.toppingArt(t, 366, y + 20)}<text x="356" y="${y + 40}" text-anchor="middle" font-size="10" font-weight="800" fill="#495057">${M.TOPPINGS[t].name}</text></g>`;
    });
    if (!b || !b.inBowl) g += `<rect x="130" y="196" width="150" height="26" rx="10" fill="#fff" opacity=".92"/><text x="205" y="214" text-anchor="middle" font-size="12" font-weight="800" fill="#868e96">${b ? 'めんを ゆでてから' : 'ちゅうもんを まってるよ'}</text>`;
    svg.innerHTML = g;
    let a = '';
    if (b) a += `<button class="green" id="m-serve" ${b.inBowl ? '' : 'disabled'}>できあがり！ 🍜</button>`;
    if (b && (b.stage !== 'balls' || b.balls)) a += '<button id="m-reset">🔄 つくりなおす</button>';
    acts.innerHTML = a;
  }
  function renderTenpura(svg, acts) {
    let g = BG('#fff3e0');
    const sides = Shop.unlocked(S.day).sides;
    // たな
    g += '<rect x="96" y="8" width="300" height="92" rx="8" fill="#e8c08a" stroke="#a8743f" stroke-width="3"/><rect x="96" y="70" width="300" height="8" fill="#a8743f"/>';
    const w = 300 / sides.length;
    sides.forEach((s, i) => {
      const x = 96 + w * i + w / 2;
      const n = S.stock[s] || 0;
      for (let k = 0; k < Math.min(3, n); k += 1) g += Art.side(s, x - 8 + k * 8, 50 - k * 6, 0.62);
      g += `<text x="${x}" y="94" text-anchor="middle" font-size="11" font-weight="800" fill="${n ? '#5c3d2e' : '#e03131'}">${M.SIDES[s].fry ? (n ? `×${n}` : 'なし') : ''}</text>`;
      g += `<text x="${x}" y="22" text-anchor="middle" font-size="9" font-weight="800" fill="#5c3d2e">${M.SIDES[s].name}</text>`;
    });
    // たなの まえの おきゃくさん
    const shelfC = inPhase('shelf')[0];
    if (shelfC) {
      g += `<g transform="translate(0 96) scale(.72)">${Art.customer(shelfC.type, shelfC.waiting ? 'wait' : 'happy')}</g>`;
      if (shelfC.waiting) g += bubble(4, 40, 92, 50, 40, 100, `${Art.side(shelfC.waiting.item, 36, 64, 0.7)}<text x="72" y="70" font-size="18" font-weight="800" fill="#e03131">？</text>`);
    }
    // なまの ざいりょう
    const fry = sides.filter((s) => M.SIDES[s].fry);
    g += '<rect x="80" y="150" width="128" height="100" rx="10" fill="#fff" stroke="#e2c8a8" stroke-width="2"/><text x="144" y="144" text-anchor="middle" font-size="10" font-weight="800" fill="#495057">ざいりょう</text>';
    fry.forEach((s, i) => {
      const x = 104 + (i % 3) * 40;
      const y = 176 + Math.floor(i / 3) * 46;
      g += `<g id="t-raw-${s}" data-drag="raw" data-arg="${s}">${Art.side(s, x, y, 0.62, 0)}<rect x="${x - 20}" y="${y - 20}" width="40" height="40" fill="transparent"/></g>`;
    });
    // ころも
    g += `<g id="t-batter" data-drop="batter"><ellipse cx="248" cy="212" rx="34" ry="12" fill="#adb5bd"/><path d="M214 212 Q218 248 248 248 Q278 248 282 212Z" fill="#ced4da"/><ellipse cx="248" cy="212" rx="30" ry="9" fill="#fff9db"/><text x="248" y="257" text-anchor="middle" font-size="10" font-weight="800" fill="#495057">ころも</text><rect x="210" y="186" width="76" height="70" fill="transparent"/></g>`;
    if (S.fry.stage === 'battered') g += `<g id="t-bat" data-drag="bat">${Art.side(S.fry.item, 248, 206, 0.7, 0.15)}<rect x="222" y="186" width="52" height="40" fill="transparent"/></g>`;
    // あぶら
    const fr = S.fry.stage === 'frying';
    g += `<g id="t-oil" data-drop="oil" data-act="oil"><rect x="296" y="180" width="96" height="70" rx="10" fill="#343a40"/><ellipse cx="344" cy="184" rx="44" ry="10" fill="#f6c453"/>${fr ? `<g id="t-fryitem">${Art.side(S.fry.item, 344, 184, 0.75, S.fry.c)}</g><g fill="#fff" opacity=".8"><circle cx="318" cy="180" r="3"/><circle cx="370" cy="178" r="2.5"/><circle cx="356" cy="190" r="2"/></g>` : ''}<text x="344" y="232" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">あぶら</text><rect x="290" y="150" width="108" height="106" fill="transparent"/></g>`;
    g += gauge(296, 128, 96, fr ? S.fry.c : 0, S.D.fryWin, 'あげぐあい', 't-needle');
    svg.innerHTML = g;
    acts.innerHTML = fr ? '<button class="main" id="t-lift">🍤 ひきあげる</button>' : '';
  }
  function renderReji(svg, acts) {
    const c = rejiCust();
    const r = c ? ensureReji() : null;
    let g = BG('#fff3e0');
    g += counterTop(186);
    // レジ
    g += `<rect x="262" y="8" width="132" height="70" rx="10" fill="#495057"/><rect x="272" y="16" width="112" height="34" rx="6" fill="#d3f9d8"/><text id="r-lcd" x="378" y="42" text-anchor="end" font-size="22" font-weight="800" fill="#2b8a3e" font-family="monospace">${r ? r.sum : 0}</text><text x="282" y="68" font-size="11" font-weight="800" fill="#fff">${r && r.stage !== 'sum' ? 'ごうけい' : 'たしざん'}</text>`;
    if (c) g += `<g transform="translate(-4 66) scale(.78)">${Art.customer(c.type, moodOf(c))}</g>`;
    // トレー
    g += '<rect x="92" y="88" width="166" height="92" rx="10" fill="#8a5a2b"/><rect x="98" y="94" width="154" height="80" rx="8" fill="#a8743f"/>';
    if (r) {
      const n = r.items.length;
      const step = 154 / n;
      r.items.forEach((it, i) => {
        const x = 98 + step * i + step / 2;
        const art = it.kind ? Art.vessel({ kind: it.kind, ...Shop.perfect({ kind: it.kind, size: it.size, toppings: [] }), dip: M.KINDS[it.kind].recipe.includes('dipSoup') }, x, 116, Math.min(48, step - 6)) : Art.side(it.side, x, 124, Math.min(0.75, (step - 6) / 60));
        const done = r.tapped[i];
        g += `<g id="r-item${i}" data-act="item" data-arg="${i}">${art}<rect x="${x - step / 2 + 2}" y="96" width="${step - 4}" height="76" fill="transparent"/>`
          + `<rect x="${x - 21}" y="150" width="42" height="18" rx="9" fill="${done ? '#2b8a3e' : '#fff'}" stroke="#5c3d2e" stroke-width="1"/><text x="${x}" y="163" text-anchor="middle" font-size="11" font-weight="800" fill="${done ? '#fff' : '#5c3d2e'}">${done ? it.price : 'タップ'}</text></g>`;
      });
    }
    if (r && r.stage !== 'sum') {
      // もらった おかね
      g += '<text x="46" y="200" text-anchor="middle" font-size="10" font-weight="800" fill="#5c3d2e">もらった おかね</text>';
      const pay = [];
      let left = r.paid;
      while (left >= 1000) { pay.push(1000); left -= 1000; }
      (Shop.fewestCoins(left) || []).forEach((v) => pay.push(v));
      pay.slice(0, 5).forEach((v, i) => { g += Art.coin(v, v === 1000 ? 46 : 22 + (i % 3) * 24, v === 1000 ? 226 : 220 + Math.floor(i / 3) * 24, v === 1000 ? 1 : 0.6); });
      g += `<text x="46" y="256" text-anchor="middle" font-size="12" font-weight="800" fill="#2b8a3e">${r.paid}えん</text>`;
    }
    if (r && (r.stage === 'change' || (r.stage === 'thanks' && r.tray.length))) {
      const ch = Shop.change(r.paid, r.total);
      const info = save.diff === 'tencho' && r.stage === 'change' ? 'おつりは いくら？' : `おつりは ${ch}えん`;
      g += `<text x="262" y="100" font-size="13" font-weight="800" fill="#c92a2a">${info}</text>`;
      g += `<g id="r-tray" data-drop="tray"><rect x="96" y="194" width="150" height="60" rx="10" fill="#2f9e44"/><rect x="100" y="198" width="142" height="52" rx="8" fill="#40c057"/><text x="171" y="190" text-anchor="middle" font-size="10" font-weight="800" fill="#5c3d2e">おつり トレー（${Shop.coinsSum(r.tray)}えん）</text></g>`;
      r.tray.forEach((v, i) => {
        const x = 116 + (i % 7) * 19;
        const y = 214 + Math.floor(i / 7) * 22;
        g += `<g id="r-tc${i}" data-act="untray" data-arg="${i}">${Art.coin(v, x, y, 0.55)}</g>`;
      });
      if (r.stage === 'change') {
        g += '<rect x="258" y="150" width="138" height="106" rx="8" fill="#5c3d2e"/><text x="327" y="166" text-anchor="middle" font-size="10" font-weight="800" fill="#ffe8cc">レジの おかね</text>';
        M.COINS.forEach((v, i) => {
          const x = 294 + (i % 2) * 66;
          const y = 194 + Math.floor(i / 2) * 42;
          g += `<g id="r-coin-${v}" data-drag="coin" data-arg="${v}">${Art.coin(v, x, y, 0.95)}<rect x="${x - 28}" y="${y - 22}" width="56" height="44" fill="transparent"/></g>`;
        });
      }
    }
    if (!c) g += '<text x="175" y="140" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">おきゃくさんを まってるよ</text>';
    else if (r && r.stage === 'sum') g += '<text x="175" y="210" text-anchor="middle" font-size="13" font-weight="800" fill="#5c3d2e">しなものを 1つずつ タップして たそう</text>';
    svg.innerHTML = g;
    let a = '';
    if (r && r.stage === 'pay') a = '<button class="main" id="r-pay">💴 ちょうど いただきます</button>';
    if (r && r.stage === 'change') a = '<button class="main" id="r-give">おつりを わたす ➡</button>';
    if (r && r.stage === 'thanks') a = '<button class="green" id="r-thanks">🙇 ありがとうございました！</button>';
    acts.innerHTML = a;
  }

  function renderOrders() {
    const box = $('orders');
    if (S.mode !== 'shop') { setHTML(box, ''); return; }
    const list = S.custs.filter((c) => ['ordered', 'shelf', 'reji'].includes(c.phase)).sort((a, b) => (a.greetedAt || 0) - (b.greetedAt || 0));
    const cur = curCust();
    if (!list.length) { setHTML(box, '<div class="empty">ちゅうもん カード</div>'); return; }
    setHTML(box, list.map((c) => {
      const pics = M.CUSTOMERS[c.type].picturesOnly;
      const bowls = c.orders.map((o, i) => {
        const st = c.phase !== 'ordered' || i < c.oi ? 'done' : (c === cur && i === c.oi ? 'now' : '');
        return `<div class="obowl ${st}">${pics ? '' : `<div class="nm">${M.KINDS[o.kind].name}</div>`}${Art.orderIcon(o)}<div class="orow"><span class="sz ${o.size}">${pics ? '●'.repeat(M.BALLS[o.size]) : M.SIZE[o.size]}</span>${o.toppings.map(Art.toppingIcon).join('')}</div></div>`;
      }).join('');
      const sides = sideList(c);
      const status = c.phase === 'shelf' ? '🍤' : c.phase === 'reji' ? '💴' : '';
      return `<div class="ocard ${c === cur ? 'now' : ''}"><svg class="who" viewBox="0 0 100 150">${Art.customer(c.type, moodOf(c))}</svg>${bowls}${sides.length ? `<div class="orow">${sides.map(Art.sideIcon).join('')}</div>` : ''}${status ? `<div style="font-size:20px">${status}</div>` : ''}</div>`;
    }).join(''));
  }
  function renderTop() {
    if (S.mode === 'reji') {
      $('shop-ttl').textContent = `💴 レジ れんしゅう ${Math.min(S.practice + 1, PRACTICE_N)}／${PRACTICE_N}`;
      $('niko').innerHTML = '';
      return;
    }
    const done = S.custs.filter((c) => c.phase === 'done').length;
    $('shop-ttl').textContent = `${S.day}にちめ  おきゃくさん ${done}／${S.custs.length}`;
    const c = rejiCust() || curCust() || inPhase('shelf')[0];
    const v = c ? curNiko(c) : 3;
    $('niko').innerHTML = [0, 1, 2].map((i) => `<span class="${i < v ? '' : 'dim'}">😊</span>`).join('');
  }
  function renderTabs() {
    if (S.mode !== 'shop') return;
    const badges = {
      counter: inPhase('line').length,
      reji: inPhase('reji').length,
      tenpura: inPhase('shelf').some((c) => c.waiting) ? '!' : 0,
    };
    M.STATIONS.forEach((s) => {
      const b = $(`tab-${s.id}`);
      if (!b) return;
      b.classList.toggle('on', s.id === S.station);
      const n = badges[s.id];
      setHTML(b, `<span class="ti">${s.icon}</span><span>${s.name}</span>${n ? `<span class="badge">${n}</span>` : ''}`);
    });
  }
  const RENDER = { counter: renderCounter, yude: renderYude, mori: renderMori, tenpura: renderTenpura, reji: renderReji };
  function renderAll() {
    if (S.screen !== 'shop' || S.dragging) return;
    stationIds().forEach((id) => {
      const el = $(`st-${id}`);
      if (!el) return;
      const sc = { innerHTML: '' };
      const ac = { innerHTML: '' };
      RENDER[id](sc, ac);
      setHTML(el.querySelector('.scene'), sc.innerHTML);
      setHTML(el.querySelector('.acts'), ac.innerHTML);
      setHTML(el.querySelector('.st-msg'), R(S.msgs[id] || ''));
    });
    renderOrders();
    renderTop();
    renderTabs();
    applyGlow();
  }

  /* ---------- つぎに さわる もの（ひかる・たしかめ用） ---------- */
  const ACTIVE_SOUP = ['hotSoup', 'coldSoup', 'hotWater'];
  function buildTarget(o) {
    const b = S.build;
    const want = M.BALLS[o.size];
    const rec = Shop.RECIPE[o.kind];
    if (!b) return null;
    if (b.stage === 'balls') {
      if (b.balls < want) return { station: 'yude', sel: '#y-ball0', kind: 'drag', to: '#y-pot' };
      if (b.balls > want) return { station: 'yude', sel: '#y-pot', kind: 'tap' };
      return { station: 'yude', sel: '#y-start', kind: 'tap' };
    }
    if (b.stage === 'boiling') return { station: 'yude', sel: '#y-tebo', kind: 'timing', win: S.D.boilWin };
    if (b.stage === 'lifted') {
      if (rec.includes('drain') && !b.steps.includes('drain')) return { station: 'yude', sel: '#y-tebo', kind: 'swipe' };
      if (rec.includes('chill') && !b.steps.includes('chill')) return { station: 'yude', sel: '#y-tub', kind: 'tap' };
      return { station: 'yude', sel: '#y-next', kind: 'tap' };
    }
    const soup = rec.find((s) => ACTIVE_SOUP.includes(s));
    if (soup && (!b.steps.includes(soup) || Shop.soupJudge(b.soup, o.kind) === 'few')) return { station: 'mori', sel: `#m-${soup}`, kind: 'hold', win: Shop.soupWindow(o.kind) };
    if (rec.includes('dipSoup') && !b.dip) return { station: 'mori', sel: '#m-dip', kind: 'tap' };
    const miss = o.toppings.find((t) => !b.toppings.includes(t));
    if (miss) return { station: 'mori', sel: `#m-top-${miss}`, kind: 'drag', to: '#m-bowl' };
    const extra = b.toppings.find((t) => !o.toppings.includes(t));
    if (extra) return { station: 'mori', sel: `#m-bowl [data-top="${extra}"]`, kind: 'tap' };
    return { station: 'mori', sel: '#m-serve', kind: 'tap' };
  }
  function fryTarget(item) {
    if (S.fry.stage === 'battered') return { station: 'tenpura', sel: '#t-bat', kind: 'drag', to: '#t-oil' };
    if (S.fry.stage === 'frying') return { station: 'tenpura', sel: '#t-lift', kind: 'timing', win: S.D.fryWin };
    return { station: 'tenpura', sel: `#t-raw-${item}`, kind: 'drag', to: '#t-batter' };
  }
  function rejiTarget() {
    const r = ensureReji();
    if (!r) return null;
    if (r.stage === 'sum') return { station: 'reji', sel: `#r-item${r.tapped.indexOf(false)}`, kind: 'tap' };
    if (r.stage === 'pay') return { station: 'reji', sel: '#r-pay', kind: 'tap' };
    if (r.stage === 'change') {
      const ch = Shop.change(r.paid, r.total);
      const sum = Shop.coinsSum(r.tray);
      if (sum > ch) return { station: 'reji', sel: '#r-tc0', kind: 'tap' };
      if (sum < ch) {
        const v = M.COINS.find((x) => x <= ch - sum);
        return { station: 'reji', sel: `#r-coin-${v}`, kind: 'drag', to: '#r-tray' };
      }
      return { station: 'reji', sel: '#r-give', kind: 'tap' };
    }
    return { station: 'reji', sel: '#r-thanks', kind: 'tap' };
  }
  function rawTarget() {
    if (S.screen === 'menuchi') {
      const st = K.step;
      if (st === 'mix') return { sel: K.flour ? '#k-water' : '#k-flour', kind: 'tap' };
      if (st === 'knead') return { sel: '#k-dough', kind: 'circle' };
      if (st === 'step') return { sel: K.lastFoot === 'L' ? '#k-right' : '#k-left', kind: 'tap' };
      if (st === 'roll') return { sel: '#k-dough', kind: 'swipe' };
      if (st === 'cut') return { sel: '#k-sheet', kind: 'cut', x: (K.cuts.length + 0.5) / K_NEED.cut };
      return { sel: K.kind === 'shop' ? '#k-open' : '#k-again', kind: 'tap' };
    }
    if (S.screen !== 'shop' || S.dayOver) return null;
    if (S.mode === 'reji') return rejiTarget() || { kind: 'wait' };
    const b = S.build;
    if (b && b.stage === 'boiling') return { station: 'yude', sel: '#y-tebo', kind: 'timing', win: S.D.boilWin };
    if (S.fry.stage === 'frying') return { station: 'tenpura', sel: '#t-lift', kind: 'timing', win: S.D.fryWin };
    if (S.fry.stage === 'battered') return fryTarget(S.fry.item);
    const rt = rejiTarget();
    if (rt) return rt;
    const wc = inPhase('shelf').find((c) => c.waiting);
    if (wc) return fryTarget(wc.waiting.item);
    const o = curOrder();
    if (o) { ensureBuild(); const t = buildTarget(o); if (t) return t; }
    if (canGreet()) return { station: 'counter', sel: '#c-hello', kind: 'tap' };
    return { kind: 'wait' };
  }
  function target() {
    const t = rawTarget();
    if (!t) return null;
    if (t.station && S.mode === 'shop' && t.station !== S.station) return { station: S.station, sel: `#tab-${t.station}`, kind: 'tap', tab: t.station };
    return t;
  }
  let glowKey = '';
  function applyGlow() {
    const show = S.screen === 'shop' && (S.D.glow || S.t - S.lastInput > 8);
    const t = show ? target() : null;
    const key = t ? `${t.sel}|${S.station}` : '';
    document.querySelectorAll('.glow').forEach((el) => { if (!t || !el.matches(t.sel)) el.classList.remove('glow'); });
    if (t && t.sel) { const el = document.querySelector(t.sel); if (el) el.classList.add('glow'); }
    glowKey = key;
  }

  /* ---------- ゆびの そうさ（タップ・ドラッグ・ながおし・スワイプ） ---------- */
  let P = null;
  const stage = $('stage');
  stage.addEventListener('pointerdown', (e) => {
    const stEl = e.target.closest('.station');
    if (!stEl) return;
    if (stEl.dataset.st !== S.station) { S.switchedAt = performance.now(); goStation(stEl.dataset.st); return; }
    const el = e.target.closest('[data-drag],[data-hold],[data-swipe],[data-act]');
    if (!el || el.closest('.station') !== stEl) return;
    if (e.cancelable) e.preventDefault();
    let type = 'act';
    if (el.dataset.drag) type = 'drag';
    else if (el.dataset.hold) type = 'hold';
    else if (el.dataset.swipe) type = 'swipe';
    P = { el, st: stEl, id: e.pointerId, x0: e.clientX, y0: e.clientY, lastY: e.clientY, dir: 0, moved: false, type };
    if (type === 'hold') { holdStart(el.dataset.hold); renderAll(); }
    if (type === 'drag') S.dragging = true;
  });
  window.addEventListener('pointermove', (e) => {
    if (!P || P.id !== e.pointerId) return;
    const dx = e.clientX - P.x0;
    const dy = e.clientY - P.y0;
    if (Math.hypot(dx, dy) > 10) P.moved = true;
    if (P.type === 'drag' && P.moved) {
      const svg = P.el.ownerSVGElement;
      const m = svg && svg.getScreenCTM();
      const k = m ? m.a : 1;
      P.el.setAttribute('transform', `translate(${dx / k} ${dy / k})`);
      P.el.classList.add('dragging');
    }
    if (P.type === 'swipe') {
      const d = e.clientY - P.lastY;
      if (Math.abs(d) > 22) {
        const dir = Math.sign(d);
        if (dir !== P.dir) { P.dir = dir; shake(); }
        P.lastY = e.clientY;
      }
    }
  });
  function endPointer(e, cancel) {
    if (!P || P.id !== e.pointerId) return;
    const p = P;
    P = null;
    S.dragging = false;
    if (p.type === 'hold') { holdEnd(); return; }
    if (cancel) { p.el.removeAttribute('transform'); renderAll(); return; }
    if (p.type === 'drag') {
      p.el.removeAttribute('transform');
      p.el.classList.remove('dragging');
      const kind = p.el.dataset.drag;
      const arg = p.el.dataset.arg;
      if (p.moved) {
        let drop = null;
        p.st.querySelectorAll('[data-drop]').forEach((d) => {
          const r = d.getBoundingClientRect();
          if (e.clientX > r.left - 24 && e.clientX < r.right + 24 && e.clientY > r.top - 24 && e.clientY < r.bottom + 24) drop = drop || d.dataset.drop;
        });
        if (drop) onDrop(kind, arg, drop);
      } else onTap(kind, arg);
    } else if (p.type === 'swipe') {
      if (!p.moved) shake();
    } else if (!p.moved || Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 16) {
      act(p.el.dataset.act, p.el.dataset.arg);
    }
    renderAll();
  }
  window.addEventListener('pointerup', (e) => endPointer(e, false));
  window.addEventListener('pointercancel', (e) => endPointer(e, true));

  function onDrop(kind, arg, drop) {
    if (kind === 'ball' && drop === 'pot') addBall();
    else if (kind === 'top' && drop === 'bowl') addTop(arg);
    else if (kind === 'raw' && drop === 'batter') pickRaw(arg);
    else if (kind === 'raw' && drop === 'oil') msg('tenpura', 'さきに ころもを つけてね。');
    else if (kind === 'bat' && drop === 'oil') toOil();
    else if (kind === 'coin' && drop === 'tray') addCoin(+arg);
  }
  function onTap(kind, arg) {
    if (kind === 'ball') addBall();
    else if (kind === 'top') addTop(arg);
    else if (kind === 'raw') pickRaw(arg);
    else if (kind === 'bat') toOil();
    else if (kind === 'coin') addCoin(+arg);
  }
  function act(name, arg) {
    switch (name) {
      case 'potBall': potBall(); break;
      case 'lift': lift(); break;
      case 'chill': chill(); break;
      case 'dip': toggleDip(); break;
      case 'oil': oilTap(); break;
      case 'item': tapItem(+arg); break;
      case 'untray': unTray(+arg); break;
      case 'cat': S.cat.purr = S.t + 3; S.cat.until = Math.max(S.cat.until, S.t + 4); Sound.sfx('purr'); toast(`🐈 ${M.SAY.cat}`); break;
      default: break;
    }
    // うつわの トッピングを タップ → とる
  }
  stage.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.bowl-top');
    if (t && S.station === 'mori' && !P) { unTop(t.dataset.top); renderAll(); }
  });
  // ボタン（HTML）
  stage.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const st = b.closest('.station');
    if (st && st.dataset.st !== S.station) { goStation(st.dataset.st); return; }
    if (S.switchedAt && performance.now() - S.switchedAt < 450) return;
    const fn = {
      'c-hello': greet, 'c-repeat': repeatOrder, 'y-start': startBoil, 'y-lift': lift, 'y-next': toBowl,
      'm-serve': serve, 'm-reset': resetBuild, 't-lift': fryLift, 'r-pay': payExact, 'r-give': giveChange, 'r-thanks': () => sayThanks(false),
    }[b.id];
    if (fn) { fn(); renderAll(); }
  });

  /* ---------- じかん ---------- */
  let last = performance.now();
  let slow = 0;
  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000) * SPEED;
    last = now;
    if (S.screen === 'shop' && !S.dayOver) step(dt);
    requestAnimationFrame(tick);
  }
  function step(dt) {
    S.t += dt;
    let dirty = false;
    if (S.mode === 'shop') {
      // おきゃくさんが くる
      const next = S.custs.find((c) => c.phase === 'out');
      const active = S.custs.filter((c) => c.phase !== 'out' && c.phase !== 'done');
      if (next) {
        if (S.D.queue === 1) {
          if (!active.length) { if (S.nextAt == null) S.nextAt = S.t + 1.2; if (S.t >= S.nextAt) { S.nextAt = null; arrive(next); } }
        } else if (!active.length || (inPhase('line').length < S.D.queue && S.t >= next.arrive)) {
          arrive(next);
        }
      }
      // てんぷらを とる
      inPhase('shelf').forEach((c) => {
        const need = sideList(c).slice();
        c.picked.forEach((p) => { const i = need.indexOf(p); if (i >= 0) need.splice(i, 1); });
        if (S.t - c.lastPick < 1.1) return;
        if (!need.length) {
          c.phase = 'reji';
          c.rejiAt = S.t;
          c.waiting = null;
          if (S.station !== 'reji') toast('💴 おかいけいへ どうぞ！');
          dirty = true;
          return;
        }
        const it = need[0];
        if ((S.stock[it] || 0) > 0) {
          S.stock[it] -= 1;
          c.picked.push(it);
          c.lastPick = S.t;
          c.waiting = null;
          Sound.sfx('pop');
          dirty = true;
        } else if (!c.waiting) {
          c.waiting = { item: it, since: S.t };
          msg('tenpura', `${cname(c)}「${M.SIDES[it].name}が ないなあ…」 あげて あげよう！`);
          if (S.station !== 'tenpura') toast(`🍤 ${M.SIDES[it].name}が なくなったよ！`);
          dirty = true;
        } else if (S.D.autoRestock && S.t - c.waiting.since > S.D.autoRestock) {
          S.stock[it] = (S.stock[it] || 0) + 2;
          c.waiting.since = S.t;
          toast(M.SAY.restock);
          dirty = true;
        }
      });
      // ねこ
      if (!S.cat.on && S.t > S.cat.next) { S.cat.on = true; S.cat.until = S.t + 12; dirty = true; }
      if (S.cat.on && S.t > S.cat.until) { S.cat.on = false; S.cat.next = S.t + 40 + S.r() * 40; dirty = true; }
      // おかいけいで ありがとう を いわないと…
      const r = S.reji;
      if (r && r.stage === 'thanks' && S.t - r.at > 9) sayThanks(true);
    }
    // ゆでる
    const b = S.build;
    if (b && b.stage === 'boiling') {
      b.boilT = Math.min(1.15, b.boilT + dt / S.D.boilSec);
      const n = $('y-needle');
      if (n) n.setAttribute('x', 110 + Math.min(1, b.boilT) * 180 - 3);
    }
    // つゆを そそぐ
    if (S.holding && b && b.inBowl) {
      b.soup = Math.min(1, b.soup + dt * 0.32);
      S.pourAcc = (S.pourAcc || 0) + dt;
      if (S.pourAcc > 0.4) { S.pourAcc = 0; Sound.sfx('pour'); }
      const f = $('m-soupfill');
      if (f) { f.setAttribute('y', 60 + 130 * (1 - b.soup)); f.setAttribute('height', 130 * b.soup); }
      const o = curOrder();
      const art = $('m-bowl-art');
      if (art && o) art.innerHTML = Art.vessel({ kind: o.kind, balls: b.balls, soup: b.soup, soupKind: b.soupKind, toppings: b.toppings, dip: b.dip }, 205, 120, 140);
      if (b.soup >= 1 && !S.overSaid) { S.overSaid = true; msg('mori', 'あふれちゃう！ はなして！'); }
    } else S.overSaid = false;
    // あげる
    if (S.fry.stage === 'frying') {
      S.fry.c = Math.min(1, S.fry.c + dt / (S.D.fourSec * 1.25));
      Sound.loop('fry', S.fry.c);
      const it = $('t-fryitem');
      if (it) it.innerHTML = Art.side(S.fry.item, 344, 184, 0.75, S.fry.c);
      const n = $('t-needle');
      if (n) n.setAttribute('x', 296 + S.fry.c * 96 - 3);
    }
    slow += dt;
    if (slow > 0.5 * SPEED) { slow = 0; dirty = true; }
    if (dirty) renderAll();
  }
  requestAnimationFrame(tick);

  /* ---------- たしかめ用 ---------- */
  window.UdonDebug = {
    state: () => ({
      screen: S.screen, mode: S.mode, station: S.station, day: S.day, diff: save.diff, t: S.t, dayOver: S.dayOver,
      phases: S.custs.map((c) => c.phase),
      build: S.build ? { stage: S.build.stage, balls: S.build.balls, steps: S.build.steps.slice(), soup: S.build.soup, boilT: S.build.boilT, toppings: S.build.toppings.slice() } : null,
      boilT: S.build ? S.build.boilT : 0,
      soup: S.build ? S.build.soup : 0,
      fry: Object.assign({}, S.fry), stock: Object.assign({}, S.stock),
      reji: S.reji ? { stage: S.reji.stage, sum: S.reji.sum, total: S.reji.total, paid: S.reji.paid, tray: S.reji.tray.slice() } : null,
      stats: Object.assign({}, S.stats), k: K.step, koshi: save.koshi, practice: S.practice, savedDay: save.day,
      redo: S.custs.reduce((a, c) => a + (c.redo || 0), 0),
    }),
    where: () => ({ screen: S.screen, station: S.station, busy: !!P }),
    target,
    customers: () => S.custs.map((c) => ({ type: c.type, phase: c.phase, orders: c.orders, niko: c.niko })),
  };

  renderSound();
  renderTitle();
})();
