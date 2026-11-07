'use strict';
/*
 * こうじょう けんがく — がめん と ミニ そうさ
 *   タイトル → こうじょう → ステーション ごと に そうさ（カメラ が すすむ）→ じゅんばん パズル → かんせい → たな
 *   window.KojoDebug … check.js から よぶ
 */
(() => {
  const { OPS, LINES, FACTORIES } = window.KojoLines;
  const Lg = window.KojoLogic;
  const S = window.Sound;
  const KEY = 'kojo-kengaku-v1';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);

  // ---------- ほぞん ----------
  const blank = () => ({ made: {}, stars: {}, choice: {}, sound: true, bgm: true });
  let save = blank();
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v === 'object') save = Object.assign(blank(), v);
  } catch (e) { /* よめなくても あそべる */ }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても あそべる */ } }
  S.setOn(save.sound); S.setBgm(save.bgm);

  // ---------- こまかい どうぐ ----------
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, str, size, fill, extra) {
    const t = el('text', Object.assign({ x, y, 'font-size': size || 18, fill: fill || '#243447', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-weight': 'bold' }, extra || {}), parent);
    t.textContent = str;
    return t;
  }
  function svgPt(svg, e) {
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const m = svg.getScreenCTM();
    return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  }
  let toastT = 0;
  function toast(msg, ms) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 1300);
  }
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('');
  };
  function setTheme(color, tint) {
    document.documentElement.style.setProperty('--accent', color || '#1971c2');
    document.documentElement.style.setProperty('--tint', tint || '#e7f5ff');
  }
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== id; });
    window.scrollTo(0, 0);
  }
  document.addEventListener('pointerdown', () => S.unlock(), { capture: true });

  // ---------- せいひん の え（オリジナル SVG） ----------
  function productSvg(lineId, choice) {
    const c = (v) => (choice && choice.color) || v;
    const w = (inner) => `<svg viewBox="0 0 200 200" xmlns="${NS}" aria-hidden="true">${inner}</svg>`;
    switch (lineId) {
      case 'enpitsu':
        return w(`<g transform="rotate(-35 100 100)">
          <rect x="28" y="86" width="120" height="28" rx="4" fill="${c('#f59f00')}"/>
          <rect x="28" y="86" width="120" height="9" fill="#fff" opacity=".25"/>
          <rect x="18" y="86" width="14" height="28" rx="3" fill="#ced4da"/><rect x="8" y="88" width="12" height="24" rx="5" fill="#ffa8a8"/>
          <path d="M148 86 L180 100 L148 114 Z" fill="#f1d3a6"/><path d="M170 95.5 L180 100 L170 104.5 Z" fill="#343a40"/></g>`);
      case 'kami':
        return w(`<ellipse cx="100" cy="160" rx="70" ry="12" fill="#000" opacity=".08"/>
          <rect x="40" y="50" width="120" height="100" rx="8" fill="#fff" stroke="#adb5bd" stroke-width="3"/>
          <ellipse cx="40" cy="100" rx="18" ry="50" fill="#f1f3f5" stroke="#adb5bd" stroke-width="3"/>
          <ellipse cx="40" cy="100" rx="6" ry="16" fill="#ced4da"/>
          <path d="M160 60 L185 60 L185 150 L160 150" fill="#fff" stroke="#adb5bd" stroke-width="3"/>`);
      case 'kami-recycle':
        return w(`<rect x="45" y="35" width="110" height="140" rx="6" fill="#f1f3f5" stroke="#adb5bd" stroke-width="3"/>
          ${[60, 78, 96, 114, 132].map((y) => `<line x1="60" y1="${y}" x2="140" y2="${y}" stroke="#a5d8ff" stroke-width="3"/>`).join('')}
          <circle cx="135" cy="150" r="22" fill="#2b8a3e"/><text x="135" y="152" font-size="26" text-anchor="middle" dominant-baseline="middle" fill="#fff">♻</text>`);
      case 'choco':
        return w(`<rect x="35" y="45" width="130" height="110" rx="10" fill="#6b3e22"/>
          ${[0, 1, 2].map((i) => [0, 1].map((j) => `<rect x="${44 + i * 40}" y="${54 + j * 48}" width="32" height="40" rx="5" fill="#8c5a3c" stroke="#4a2a14" stroke-width="2"/>`).join('')).join('')}
          <path d="M35 125 L165 95 L165 155 L35 155 Z" fill="#e7f5ff" opacity=".0"/>
          <rect x="35" y="120" width="130" height="40" rx="6" fill="#ffd43b"/><rect x="35" y="120" width="130" height="8" fill="#fab005"/>`);
      case 'pet':
        if (choice && choice.id === 'fuku') {
          return w(`<path d="M60 40 L85 30 Q100 45 115 30 L140 40 L175 70 L155 92 L140 82 L140 170 L60 170 L60 82 L45 92 L25 70 Z" fill="#4dabf7" stroke="#1971c2" stroke-width="3" stroke-linejoin="round"/>
            <circle cx="100" cy="115" r="20" fill="#fff" opacity=".9"/><text x="100" y="117" font-size="24" text-anchor="middle" dominant-baseline="middle" fill="#1c7ed6">♻</text>`);
        }
        return w(`<rect x="84" y="22" width="32" height="16" rx="4" fill="#40c057"/>
          <path d="M88 38 L112 38 L112 52 Q140 66 140 92 L140 168 Q140 180 128 180 L72 180 Q60 180 60 168 L60 92 Q60 66 88 52 Z" fill="#d0ebff" stroke="#74c0fc" stroke-width="3"/>
          <rect x="62" y="110" width="76" height="34" fill="#74c0fc" opacity=".6"/><text x="100" y="128" font-size="22" text-anchor="middle" dominant-baseline="middle" fill="#fff">♻</text>`);
      case 'glass':
        return w(`<rect x="76" y="26" width="48" height="20" rx="5" fill="#868e96"/>
          <path d="M80 46 L120 46 L120 58 Q150 66 150 96 L150 166 Q150 178 138 178 L62 178 Q50 178 50 166 L50 96 Q50 66 80 58 Z" fill="#c5f6fa" stroke="#3bc9db" stroke-width="3" opacity=".9"/>
          <path d="M64 96 Q64 78 80 72" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>`);
    }
    return w('');
  }
  const productName = (line, choice) => (line.id === 'pet' && choice ? choice.label : line.product);

  // ---------- ステーション の え ----------
  function drawPanelBase(svg, line, step, i) {
    const col = line.color;
    el('rect', { x: 0, y: 0, width: 400, height: 300, fill: 'transparent' }, svg);
    // かべ の まど
    for (let k = 0; k < 3; k++) el('rect', { x: 30 + k * 130, y: 14, width: 80, height: 34, rx: 8, fill: '#d0ebff', opacity: 0.5 }, svg);
    // ゆか
    el('rect', { x: -600, y: 262, width: 1600, height: 400, fill: '#dee2e6' }, svg);
    // ベルトコンベア（よこ に はみだして つぎ の パネル と つながって みえる）
    el('rect', { x: -600, y: 244, width: 1600, height: 18, rx: 0, fill: '#495057' }, svg);
    el('line', { x1: -600, y1: 246, x2: 1000, y2: 246, stroke: '#adb5bd', 'stroke-width': 3, class: 'belt-dash' }, svg);
    for (let x = -610; x < 1000; x += 45) el('circle', { cx: x, cy: 253, r: 6, fill: '#868e96' }, svg);
    // かんばん
    const sign = el('g', {}, svg);
    el('rect', { x: 120, y: 56, width: 160, height: 30, rx: 15, fill: col }, sign);
    txt(sign, 200, 72, `${i + 1}  ${step.emoji}`, 18, '#fff');
    if (step.adult) {
      el('rect', { x: 296, y: 56, width: 92, height: 30, rx: 15, fill: '#ffe066' }, svg);
      txt(svg, 342, 72, '⚠️ おとな', 14, '#5c3d00');
    }
    // きかい の だい
    el('rect', { x: 70, y: 226, width: 260, height: 18, rx: 8, fill: shade(col, -0.25) }, svg);
    // ベルト に のって きた もの
    const pc = el('g', { transform: 'translate(36 226)' }, svg);
    txt(el('g', { class: 'piece' }, pc), 0, 0, line.emoji, 30);
  }

  // ---------- ミニ そうさ ----------
  // ctx: { svg, g, step, line, prog(p, label), done(extra), sfx }
  const OPFN = {};

  OPFN.stir = (ctx) => {
    const { g, svg, step } = ctx, cx = 200, cy = 150, need = step.n || 3;
    el('circle', { cx, cy, r: 92, fill: '#ced4da', stroke: shade(ctx.line.color, -0.2), 'stroke-width': 8 }, g);
    el('circle', { cx, cy, r: 78, fill: step.mat }, g);
    const swirl = el('g', {}, g);
    for (let k = 0; k < 3; k++) {
      el('path', { d: `M ${cx} ${cy} q 30 -${20 + k * 14} ${48 + k * 6} ${4 + k * 6}`, stroke: '#fff', 'stroke-width': 5, fill: 'none', opacity: 0.45, 'stroke-linecap': 'round', transform: `rotate(${k * 120} ${cx} ${cy})` }, swirl);
    }
    el('circle', { cx, cy, r: 58, fill: 'none', stroke: '#fff', 'stroke-width': 3, 'stroke-dasharray': '6 8', opacity: 0.9 }, g);
    txt(g, cx + 58, cy - 34, '↻', 30, '#fff');
    const stick = el('g', {}, g);
    el('circle', { cx: 0, cy: 0, r: 18, fill: '#fff', stroke: '#868e96', 'stroke-width': 4 }, stick);
    txt(stick, 0, 1, '👆', 18);
    stick.setAttribute('transform', `translate(${cx + 58} ${cy})`);
    const tr = Lg.stirTracker(cx, cy, need);
    let lastQ = 0, active = false;
    const upd = (p) => {
      swirl.setAttribute('transform', `rotate(${(tr.angle * 180) / Math.PI} ${cx} ${cy})`);
      const q = Math.floor(tr.turns * 4);
      if (q > lastQ) { lastQ = q; ctx.sfx('guru'); }
      ctx.prog(p, `${Math.min(need, Math.floor(tr.turns))} / ${need} ${OPS.stir.unit}`);
      if (p >= 1) ctx.done();
    };
    const dn = (e) => { active = true; svg.setPointerCapture && svg.setPointerCapture(e.pointerId); tr.reset(); mv(e); };
    const mv = (e) => {
      if (!active) return;
      const p = svgPt(svg, e);
      stick.setAttribute('transform', `translate(${p.x} ${p.y})`);
      upd(tr.add(p.x, p.y));
    };
    const up = () => { active = false; tr.reset(); };
    ctx.on('pointerdown', dn); ctx.on('pointermove', mv); ctx.on('pointerup', up); ctx.on('pointercancel', up);
    ctx.prog(0, `0 / ${need} ${OPS.stir.unit}`);
    ctx.debugDone = () => { for (let a = 0; a <= need * 64 + 2; a++) { const t = (a / 16) * Math.PI / 2; tr.add(cx + 60 * Math.cos(t), cy + 60 * Math.sin(t)); } upd(tr.progress()); };
  };

  OPFN.swipe = (ctx) => {
    const { g, svg, step } = ctx, need = step.n || 3;
    const col = ctx.line.color;
    // ざいりょう
    const mat = el('g', {}, g);
    el('rect', { x: 110, y: 186, width: 180, height: 40, rx: 10, fill: step.mat, stroke: shade(step.mat, -0.3), 'stroke-width': 3 }, mat);
    const cuts = el('g', {}, g);
    // プレス
    el('rect', { x: 186, y: 92, width: 28, height: 40, fill: '#adb5bd' }, g);
    const press = el('g', {}, g);
    el('rect', { x: 140, y: 128, width: 120, height: 26, rx: 8, fill: shade(col, -0.1) }, press);
    el('rect', { x: 150, y: 152, width: 100, height: 8, rx: 3, fill: '#dee2e6' }, press);
    txt(g, 330, 150, '⬇', 40, col);
    let count = 0;
    const det = Lg.swipeDetector(46);
    const hit = () => {
      count++;
      ctx.sfx(step.id === 'oshidasu' ? 'puff' : 'shakin');
      press.style.transition = 'transform .12s'; press.style.transform = 'translateY(30px)';
      setTimeout(() => { press.style.transform = ''; }, 160);
      const x = 110 + (180 / (need + 1)) * count;
      el('line', { x1: x, y1: 184, x2: x, y2: 228, stroke: '#fff', 'stroke-width': 4 }, cuts);
      ctx.prog(count / need, `${count} / ${need} ${OPS.swipe.unit}`);
      if (count >= need) ctx.done();
    };
    let active = false;
    ctx.on('pointerdown', (e) => { active = true; svg.setPointerCapture && svg.setPointerCapture(e.pointerId); const p = svgPt(svg, e); det.down(p.x, p.y); });
    ctx.on('pointermove', (e) => { if (!active) return; const p = svgPt(svg, e); if (det.move(p.x, p.y)) hit(); });
    const up = () => { active = false; det.up(); };
    ctx.on('pointerup', up); ctx.on('pointercancel', up);
    ctx.prog(0, `0 / ${need} ${OPS.swipe.unit}`);
    ctx.debugDone = () => { while (count < need) hit(); };
  };

  OPFN.timing = (ctx) => {
    const { g, step } = ctx, need = step.n || 1, zone = step.zone || [0.42, 0.6];
    const x0 = 60, x1 = 340, gy = 120;
    // なべ
    el('path', { d: 'M120 160 L280 160 L268 222 Q266 228 258 228 L142 228 Q134 228 132 222 Z', fill: '#868e96' }, g);
    el('ellipse', { cx: 200, cy: 162, rx: 78, ry: 10, fill: step.mat }, g);
    // めもり
    el('rect', { x: x0, y: gy - 14, width: x1 - x0, height: 28, rx: 14, fill: '#e9ecef', stroke: '#adb5bd', 'stroke-width': 2 }, g);
    el('rect', { x: x0 + (x1 - x0) * zone[0], y: gy - 14, width: (x1 - x0) * (zone[1] - zone[0]), height: 28, fill: '#8ce99a' }, g);
    txt(g, x0 + (x1 - x0) * (zone[0] + zone[1]) / 2, gy - 28, step.temp || 'ちょうど', 15, '#2b8a3e');
    txt(g, x0, gy + 28, step.op === 'timing' && step.temp && step.temp.includes('ど') ? 'ひくい' : 'すくない', 13, '#5c6b7a');
    txt(g, x1, gy + 28, step.temp && step.temp.includes('ど') ? 'たかい' : 'おおい', 13, '#5c6b7a');
    const needle = el('g', {}, g);
    el('path', { d: 'M0 -22 L9 -36 L-9 -36 Z', fill: '#e03131' }, needle);
    el('rect', { x: -3, y: -20, width: 6, height: 40, rx: 3, fill: '#e03131' }, needle);
    // ボタン
    const btn = el('g', { class: 'tapme', role: 'button', 'data-act': 'stop' }, g);
    el('rect', { x: 290, y: 184, width: 100, height: 50, rx: 25, fill: '#e03131' }, btn);
    txt(btn, 340, 210, 'ストップ', 18, '#fff');
    let hits = 0, t = 0, p = 0, raf = 0, last = performance.now(), locked = 0;
    const speed = 0.55;
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (now > locked) t += dt;
      p = Lg.pingpong(t, speed);
      needle.setAttribute('transform', `translate(${x0 + (x1 - x0) * p} ${gy})`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    ctx.cleanup(() => cancelAnimationFrame(raf));
    const stop = () => {
      if (performance.now() < locked) return;
      locked = performance.now() + 450;
      if (Lg.inZone(p, zone)) {
        hits++; ctx.sfx('pon'); toast('ぴったり！', 900);
        ctx.prog(hits / need, `${hits} / ${need} ${OPS.timing.unit}`);
        if (hits >= need) { cancelAnimationFrame(raf); ctx.done(); }
      } else { ctx.sfx('boo'); toast(p < zone[0] ? 'まだ はやい！ もういちど' : 'すぎちゃった！ もういちど', 1100); }
    };
    ctx.on('pointerdown', stop);
    ctx.prog(0, `0 / ${need} ${OPS.timing.unit}`);
    ctx.peek = () => ({ p, zone });
    ctx.debugDone = () => { while (hits < need) { locked = 0; t = ((zone[0] + zone[1]) / 2) / speed; p = Lg.pingpong(t, speed); stop(); } };
  };

  const DRAG_LOOK = {
    hasamu: { item: '✏️', target: '🪵', tlabel: 'いた の みぞ' },
    nagasu: { item: '🫗', target: '🍫', tlabel: 'チョコ の かた' },
    kata: { item: '🟠', target: '🫙', tlabel: 'びん の かた' },
    atsumeru: { item: null, target: '🚚', tlabel: 'トラック' },
  };
  OPFN.drag = (ctx) => {
    const { g, svg, step, line } = ctx, need = step.n || 1;
    const look = DRAG_LOOK[step.id] || { item: '📦', target: '📥', tlabel: 'ここ' };
    const itemEmoji = look.item || (line.id === 'pet' ? '🧴' : '📰');
    const T = { x: 250, y: 120, w: 130, h: 104 };
    el('rect', { x: T.x, y: T.y, width: T.w, height: T.h, rx: 18, fill: '#fff', stroke: line.color, 'stroke-width': 4, 'stroke-dasharray': '10 8' }, g);
    txt(g, T.x + T.w / 2, T.y + 46, look.target, 44);
    txt(g, T.x + T.w / 2, T.y + 90, look.tlabel, 14, line.color);
    txt(g, 200, 170, '➡', 34, line.color);
    let count = 0;
    const items = [];
    for (let k = 0; k < need; k++) {
      const hx = 70 + (need > 1 ? (k % 2) * 50 : 20), hy = 110 + k * 46 + (need > 1 ? 0 : 50);
      const it = el('g', { class: 'tapme', 'data-item': k }, g);
      el('circle', { cx: 0, cy: 0, r: 30, fill: '#fff', stroke: '#adb5bd', 'stroke-width': 3 }, it);
      txt(it, 0, 2, itemEmoji, 34);
      it.setAttribute('transform', `translate(${hx} ${hy})`);
      items.push({ it, hx, hy, done: false });
    }
    let cur = null;
    const place = (o, x, y) => o.it.setAttribute('transform', `translate(${x} ${y})`);
    ctx.on('pointerdown', (e) => {
      const p = svgPt(svg, e);
      let best = null, bd = 48;
      items.forEach((o) => {
        if (o.done) return;
        const m = o.it.transform.baseVal.consolidate().matrix;
        const d = Math.hypot(p.x - m.e, p.y - m.f);
        if (d < bd) { bd = d; best = o; }
      });
      if (best) { cur = best; svg.setPointerCapture && svg.setPointerCapture(e.pointerId); ctx.sfx('pi'); place(cur, p.x, p.y); }
    });
    ctx.on('pointermove', (e) => { if (!cur) return; const p = svgPt(svg, e); place(cur, p.x, p.y); });
    const drop = (o, p) => {
      if (p.x > T.x - 10 && p.x < T.x + T.w + 10 && p.y > T.y - 10 && p.y < T.y + T.h + 10) {
        o.done = true; count++;
        place(o, T.x + T.w / 2 + (count - 1 - (need - 1) / 2) * 26, T.y + T.h / 2 + 4);
        o.it.setAttribute('opacity', 0.85);
        ctx.sfx('pon');
        ctx.prog(count / need, `${count} / ${need} ${OPS.drag.unit}`);
        if (count >= need) ctx.done();
      } else { place(o, o.hx, o.hy); ctx.sfx('boo'); }
    };
    const up = (e) => { if (!cur) return; const o = cur; cur = null; drop(o, svgPt(svg, e)); };
    ctx.on('pointerup', up); ctx.on('pointercancel', () => { if (cur) { place(cur, cur.hx, cur.hy); cur = null; } });
    ctx.prog(0, `0 / ${need} ${OPS.drag.unit}`);
    ctx.target = T;
    ctx.items = () => items.filter((o) => !o.done).map((o) => ({ x: o.hx, y: o.hy }));
    ctx.debugDone = () => items.forEach((o) => { if (!o.done) drop(o, { x: T.x + 20, y: T.y + 20 }); });
  };

  OPFN.shake = (ctx) => {
    const { g, svg, step, line } = ctx, need = step.n || 8;
    el('rect', { x: 60, y: 190, width: 280, height: 36, rx: 10, fill: '#a5d8ff', opacity: 0.7 }, g); // みず
    const frame = el('g', {}, g);
    el('rect', { x: -80, y: -34, width: 160, height: 68, rx: 10, fill: step.mat, stroke: shade(line.color, -0.2), 'stroke-width': 6 }, frame);
    for (let k = -60; k <= 60; k += 20) el('line', { x1: k, y1: -30, x2: k, y2: 30, stroke: '#adb5bd', 'stroke-width': 1.5 }, frame);
    for (let k = -20; k <= 20; k += 20) el('line', { x1: -76, y1: k, x2: 76, y2: k, stroke: '#adb5bd', 'stroke-width': 1.5 }, frame);
    let fx = 200;
    frame.setAttribute('transform', `translate(${fx} 150)`);
    txt(g, 200, 108, '⬅  ➡', 30, line.color);
    const drops = el('g', {}, g);
    const sc = Lg.shakeCounter(28);
    let active = false, lastC = 0;
    const upd = (c) => {
      if (c > lastC) {
        lastC = c; ctx.sfx('pata');
        el('circle', { cx: fx - 60 + Math.random() * 120, cy: 196 + Math.random() * 20, r: 4, fill: '#4dabf7' }, drops);
      }
      ctx.prog(Math.min(1, c / need), `${Math.min(c, need)} / ${need} ${OPS.shake.unit}`);
      if (c >= need) ctx.done();
    };
    ctx.on('pointerdown', (e) => { active = true; svg.setPointerCapture && svg.setPointerCapture(e.pointerId); sc.reset(); });
    ctx.on('pointermove', (e) => {
      if (!active) return;
      const p = svgPt(svg, e);
      fx = Math.max(110, Math.min(290, p.x));
      frame.setAttribute('transform', `translate(${fx} 150)`);
      upd(sc.add(p.x));
    });
    const up = () => { active = false; };
    ctx.on('pointerup', up); ctx.on('pointercancel', up);
    ctx.prog(0, `0 / ${need} ${OPS.shake.unit}`);
    ctx.debugDone = () => { let x = 200; for (let k = 0; k < need * 2 + 4; k++) { x = x === 140 ? 260 : 140; upd(sc.add(x)); } };
  };

  OPFN.tap = (ctx) => {
    const { g, step, line } = ctx, need = step.n || 5;
    const glass = line.id === 'glass';
    const obj = el('g', {}, g);
    if (glass) {
      el('rect', { x: 140, y: 100, width: 120, height: 124, rx: 14, fill: 'none', stroke: '#868e96', 'stroke-width': 6, 'stroke-dasharray': '4 6' }, g);
      el('ellipse', { cx: 0, cy: 0, rx: 30, ry: 30, fill: step.mat, stroke: '#e8590c', 'stroke-width': 3 }, obj);
    } else {
      el('rect', { x: 110, y: 120, width: 180, height: 104, rx: 14, fill: step.mat, stroke: '#868e96', 'stroke-width': 4 }, g);
      el('g', { id: 'inkdots' }, g);
    }
    obj.setAttribute('transform', 'translate(200 168)');
    const btn = el('g', { class: 'tapme', role: 'button' }, g);
    el('circle', { cx: 340, cy: 150, r: 42, fill: line.color }, btn);
    txt(btn, 340, 150, glass ? '💨' : '🫧', 34);
    let count = 0;
    const hit = () => {
      count++; ctx.sfx('puff');
      btn.classList.remove('bounce'); void btn.getBBox(); btn.classList.add('bounce');
      if (glass) obj.firstChild.setAttribute('rx', 30 + count * 6), obj.firstChild.setAttribute('ry', 30 + count * 5);
      else {
        for (let k = 0; k < 4; k++) el('circle', { cx: 120 + Math.random() * 160, cy: 128 + Math.random() * 30, r: 5 + Math.random() * 6, fill: '#fff', stroke: '#868e96', opacity: 0.9 }, g);
        g.querySelector('rect').setAttribute('fill', shade(step.mat, (count / need) * 0.8));
      }
      ctx.prog(count / need, `${count} / ${need} ${OPS.tap.unit}`);
      if (count >= need) ctx.done();
    };
    btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); hit(); });
    ctx.prog(0, `0 / ${need} ${OPS.tap.unit}`);
    ctx.button = { x: 340, y: 150 };
    ctx.debugDone = () => { while (count < need) hit(); };
  };

  OPFN.hold = (ctx) => {
    const { g, step, line } = ctx, dur = 2.4;
    const cold = /hiyasu/.test(step.id);
    el('rect', { x: 70, y: 96, width: 200, height: 130, rx: 18, fill: shade(line.color, 0.55), stroke: shade(line.color, -0.2), 'stroke-width': 5 }, g);
    el('rect', { x: 96, y: 120, width: 148, height: 82, rx: 10, fill: '#343a40' }, g);
    const glow = el('rect', { x: 96, y: 120, width: 148, height: 82, rx: 10, fill: cold ? '#74c0fc' : '#ff922b', opacity: 0 }, g);
    txt(g, 170, 162, step.emoji, 38);
    // ゲージ
    el('rect', { x: 96, y: 210, width: 148, height: 10, rx: 5, fill: '#e9ecef' }, g);
    const gauge = el('rect', { x: 96, y: 210, width: 0, height: 10, rx: 5, fill: line.color }, g);
    const btn = el('g', { class: 'tapme', role: 'button' }, g);
    el('circle', { cx: 330, cy: 160, r: 46, fill: line.color }, btn);
    txt(btn, 330, 152, cold ? '❄️' : '🔥', 28);
    txt(btn, 330, 184, 'おしつづけて', 11, '#fff');
    let p = 0, held = false, raf = 0, last = 0, tick = 0;
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (held) {
        p = Math.min(1, p + dt / dur);
        tick += dt; if (tick > 0.45) { tick = 0; ctx.sfx(cold ? 'puff' : 'fire'); }
      }
      glow.setAttribute('opacity', held ? 0.5 + 0.4 * Math.sin(now / 90) : p * 0.3);
      gauge.setAttribute('width', 148 * p);
      ctx.prog(p, `${Math.round(p * 100)} %`);
      if (p >= 1) { ctx.done(); return; }
      raf = requestAnimationFrame(loop);
    };
    btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); held = true; last = performance.now(); tick = 1; });
    const rel = () => { held = false; };
    ctx.on('pointerup', rel); ctx.on('pointercancel', rel); ctx.on('pointerleave', rel);
    window.addEventListener('pointerup', rel);
    ctx.cleanup(() => { cancelAnimationFrame(raf); window.removeEventListener('pointerup', rel); });
    last = performance.now();
    raf = requestAnimationFrame(loop);
    ctx.prog(0, '0 %');
    ctx.button = { x: 330, y: 160 };
    ctx.debugDone = () => { p = 1; };
  };

  OPFN.watch = (ctx) => {
    const { g, step, line } = ctx, dur = 3;
    el('rect', { x: 60, y: 92, width: 210, height: 134, rx: 22, fill: '#868e96', stroke: '#495057', 'stroke-width': 5 }, g);
    el('rect', { x: 90, y: 118, width: 150, height: 80, rx: 40, fill: '#343a40' }, g);
    const fire = el('rect', { x: 90, y: 118, width: 150, height: 80, rx: 40, fill: step.id === 'tokasu' && line.id === 'pet' ? '#ffa94d' : '#ff6b00', opacity: 0.15 }, g);
    txt(g, 165, 158, step.emoji, 36);
    const adult = el('g', {}, g);
    txt(adult, 0, 0, '👷', 42);
    adult.setAttribute('transform', 'translate(330 210)');
    el('rect', { x: 286, y: 92, width: 104, height: 56, rx: 12, fill: '#fff3bf', stroke: '#fab005', 'stroke-width': 2 }, g);
    txt(g, 338, 110, 'あぶない！', 14, '#5c3d00');
    txt(g, 338, 132, 'みて いよう', 14, '#5c3d00');
    const btn = el('g', { class: 'tapme', role: 'button' }, g);
    el('rect', { x: 286, y: 160, width: 104, height: 34, rx: 17, fill: line.color }, btn);
    txt(btn, 338, 177, 'おねがい！', 15, '#fff');
    let started = false, raf = 0, t0 = 0;
    const loop = (now) => {
      const p = Math.min(1, (now - t0) / 1000 / dur);
      fire.setAttribute('opacity', 0.3 + 0.6 * Math.abs(Math.sin(now / 160)));
      adult.setAttribute('transform', `translate(${330 - 40 * Math.sin(p * Math.PI)} 210)`);
      ctx.prog(p, `${Math.round(p * 100)} %`);
      if (p >= 1) { ctx.done(); return; }
      raf = requestAnimationFrame(loop);
    };
    const go = () => {
      if (started) return;
      started = true; btn.setAttribute('opacity', 0.4); ctx.sfx('fire'); setTimeout(() => ctx.sfx('fire'), 700); setTimeout(() => ctx.sfx('fire'), 1500);
      toast('おとな が うごかす よ。はなれて みて いよう', 1800);
      t0 = performance.now(); raf = requestAnimationFrame(loop);
    };
    btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); go(); });
    ctx.cleanup(() => cancelAnimationFrame(raf));
    ctx.prog(0, '');
    ctx.button = { x: 338, y: 177 };
    ctx.debugDone = () => { go(); t0 = -1e9; };
  };

  OPFN.sort = (ctx) => {
    const { g, step, line } = ctx;
    const queue = Lg.shuffle(step.items.length).map((i) => step.items[i]);
    const need = queue.length;
    const shown = el('g', {}, g);
    const bins = step.bins;
    const bw = Math.min(110, 340 / bins.length - 10);
    const binEls = bins.map((b, k) => {
      const x = 200 + (k - (bins.length - 1) / 2) * (bw + 12);
      const be = el('g', { class: 'tapme', role: 'button', 'data-bin': b.id }, g);
      el('rect', { x: x - bw / 2, y: 156, width: bw, height: 66, rx: 14, fill: '#fff', stroke: line.color, 'stroke-width': 4 }, be);
      txt(be, x, 178, b.emoji, 24);
      txt(be, x, 206, b.label, 15, line.color);
      return { b, be, x };
    });
    let idx = 0;
    const drawItem = () => {
      shown.innerHTML = '';
      if (idx >= need) return;
      const it = queue[idx];
      el('circle', { cx: 200, cy: 120, r: 30, fill: '#fff', stroke: '#adb5bd', 'stroke-width': 3 }, shown);
      txt(shown, 200, 119, it.emoji, 32);
      txt(shown, 290, 120, `のこり ${need - idx}`, 15, '#5c6b7a');
    };
    const pick = (binId) => {
      if (idx >= need) return;
      const it = queue[idx];
      if (it.bin === binId) {
        idx++; ctx.sfx('pon');
        ctx.prog(idx / need, `${idx} / ${need} ${OPS.sort.unit}`);
        drawItem();
        if (idx >= need) ctx.done();
      } else {
        ctx.sfx('boo'); toast(`${it.label} は ちがう はこ だよ`, 1100);
        shown.classList.remove('shake-x'); void shown.getBBox(); shown.classList.add('shake-x');
      }
    };
    binEls.forEach(({ b, be }) => be.addEventListener('pointerdown', (e) => { e.stopPropagation(); pick(b.id); }));
    drawItem();
    ctx.prog(0, `0 / ${need} ${OPS.sort.unit}`);
    ctx.current = () => (idx < need ? queue[idx].bin : null);
    ctx.binPos = (id) => { const o = binEls.find((x) => x.b.id === id); return { x: o.x, y: 190 }; };
    ctx.debugDone = () => { while (idx < need) pick(queue[idx].bin); };
  };

  OPFN.pick = (ctx) => {
    const { g, step } = ctx;
    const opts = step.opts, cols = opts.length > 3 ? 3 : opts.length;
    const bw = opts.length > 3 ? 104 : 150, bh = opts.length > 3 ? 64 : 110;
    if (ctx.line.id === 'enpitsu') {
      const pen = el('g', { transform: 'translate(120 96)' }, g);
      ctx.penBody = el('rect', { x: 0, y: 0, width: 140, height: 22, rx: 4, fill: step.mat }, pen);
      el('path', { d: 'M140 0 L166 11 L140 22 Z', fill: '#f1d3a6' }, pen);
    }
    opts.forEach((o, k) => {
      const r = Math.floor(k / cols), c = k % cols;
      const x = 200 + (c - (cols - 1) / 2) * (bw + 10), y = (opts.length > 3 ? 160 : 170) + r * (bh + 8);
      const be = el('g', { class: 'tapme', role: 'button', 'data-opt': o.id }, g);
      el('rect', { x: x - bw / 2, y: y - bh / 2, width: bw, height: bh, rx: 16, fill: o.emoji ? '#fff' : o.color, stroke: shade(o.color, -0.3), 'stroke-width': 4 }, be);
      if (o.emoji) { txt(be, x, y - 14, o.emoji, 40); txt(be, x, y + 32, o.label, 15, shade(o.color, -0.4)); }
      else txt(be, x, y, o.label, 17, '#fff', { stroke: shade(o.color, -0.45), 'stroke-width': 0.6 });
      be.addEventListener('pointerdown', (e) => { e.stopPropagation(); choose(o); });
    });
    let chosen = false;
    const choose = (o) => {
      if (chosen) return;
      chosen = true; ctx.sfx('kira');
      if (ctx.penBody) ctx.penBody.setAttribute('fill', o.color);
      toast(`${o.label} に した よ！`, 1100);
      ctx.prog(1, o.label);
      ctx.done({ choice: o });
    };
    ctx.prog(0, '');
    ctx.debugDone = () => choose(opts[0]);
  };

  OPFN.find = (ctx) => {
    const { g, step, line } = ctx, need = step.n || 2, N = 5;
    const bad = Lg.shuffle(N).slice(0, need);
    let found = 0;
    for (let k = 0; k < N; k++) {
      const x = 60 + k * 70, y = 176;
      const be = el('g', { class: 'tapme', role: 'button', 'data-jar': k, 'data-bad': bad.includes(k) ? 1 : 0 }, g);
      el('rect', { x: x - 24, y: y - 44, width: 48, height: 14, rx: 4, fill: '#868e96' }, be);
      el('rect', { x: x - 28, y: y - 30, width: 56, height: 96, rx: 14, fill: step.mat, stroke: '#3bc9db', 'stroke-width': 3 }, be);
      if (bad.includes(k)) el('path', { d: `M${x - 12} ${y - 14} l10 12 l-8 10 l12 14 l-6 12`, stroke: '#495057', 'stroke-width': 3, fill: 'none' }, be);
      be.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (be.dataset.gone) return;
        if (bad.includes(k)) {
          be.dataset.gone = '1'; found++; ctx.sfx('pon');
          be.style.transition = 'transform .5s, opacity .5s'; be.style.transform = 'translateY(-60px)'; be.style.opacity = '0.2';
          ctx.prog(found / need, `${found} / ${need} ${OPS.find.unit}`);
          if (found >= need) ctx.done();
        } else { ctx.sfx('boo'); toast('これ は きれい！ だいじょうぶ', 1000); }
      });
    }
    txt(g, 200, 104, '🔍 よく みて', 18, line.color);
    ctx.prog(0, `0 / ${need} ${OPS.find.unit}`);
    ctx.debugDone = () => g.querySelectorAll('[data-bad="1"]').forEach((b) => { if (!b.dataset.gone) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
  };

  // ---------- ライン ----------
  const st = { screen: 'title', line: null, idx: 0, ctx: null, choice: null, moving: false, puzzle: null, drawColor: '#343a40' };

  function startLine(lineId) {
    const line = LINES.find((l) => l.id === lineId);
    st.line = line; st.idx = 0; st.choice = null; st.moving = false;
    setTheme(line.color, line.tint);
    $('lineTitle').textContent = `${line.emoji} ${line.name} の こうじょう`;
    const track = $('track');
    track.innerHTML = ''; track.style.transition = 'none'; track.style.transform = 'translateX(0)';
    line.steps.forEach((step, i) => {
      const panel = document.createElement('div');
      panel.className = 'panel';
      const svg = el('svg', { viewBox: '0 0 400 300', preserveAspectRatio: 'xMidYMid meet', 'data-step': step.id });
      panel.appendChild(svg);
      drawPanelBase(svg, line, step, i);
      el('g', { class: 'op' }, svg);
      track.appendChild(panel);
    });
    void track.offsetWidth; track.style.transition = '';
    $('dots').innerHTML = line.steps.map(() => '<i></i>').join('');
    show('line'); st.screen = 'line';
    S.bgm(line.bgm);
    startStation();
  }

  function stopOp() {
    const c = st.ctx;
    if (!c) return;
    c.listeners.forEach(([ev, fn]) => c.svg.removeEventListener(ev, fn));
    c.cleanups.forEach((f) => { try { f(); } catch (e) { /* むし */ } });
    c.dead = true;
    st.ctx = null;
  }

  function startStation() {
    stopOp();
    const line = st.line, step = line.steps[st.idx];
    const panel = $('track').children[st.idx];
    const svg = panel.querySelector('svg');
    const g = svg.querySelector('g.op');
    g.innerHTML = '';
    $('stepName').innerHTML = `${st.idx + 1}. ${Lg.ruby(step.name)}`;
    $('stepText').innerHTML = Lg.ruby(step.text);
    $('adultNote').hidden = !step.adult;
    $('stepHow').textContent = OPS[step.op].how;
    [...$('dots').children].forEach((d, i) => { d.className = i < st.idx ? 'on' : i === st.idx ? 'now' : ''; });
    const ctx = {
      svg, g, step, line, listeners: [], cleanups: [], dead: false, finished: false,
      on(ev, fn) { svg.addEventListener(ev, fn); this.listeners.push([ev, fn]); },
      cleanup(fn) { this.cleanups.push(fn); },
      sfx: (n) => S.sfx(n),
      prog(p, label) {
        if (this.dead) return;
        $('stepBar').style.width = `${Math.round(p * 100)}%`;
        $('stepProg').textContent = label || '';
      },
      done(extra) {
        if (this.dead || this.finished) return;
        this.finished = true;
        if (extra && extra.choice) st.choice = extra.choice;
        stationDone();
      },
    };
    st.ctx = ctx;
    OPFN[step.op](ctx);
  }

  function stationDone() {
    S.sfx('step');
    const n = st.line.steps.length;
    [...$('dots').children][st.idx].className = 'on';
    setTimeout(() => {
      if (st.screen !== 'line') return;
      stopOp();
      if (st.idx + 1 >= n) { startPuzzle(); return; }
      st.idx++;
      st.moving = true;
      const stage = $('stage');
      stage.classList.add('run');
      S.sfx('goto');
      $('track').style.transform = `translateX(${-100 * st.idx}%)`;
      setTimeout(() => {
        stage.classList.remove('run');
        st.moving = false;
        if (st.screen === 'line') startStation();
      }, 950);
    }, 650);
  }

  // ---------- じゅんばん パズル ----------
  function startPuzzle() {
    const line = st.line;
    const order = Lg.shuffle(line.steps.length);
    st.puzzle = { pool: order.map((i) => line.steps[i].id), slots: Array(line.steps.length).fill(null), locked: Array(line.steps.length).fill(false), tries: 0 };
    show('puzzle'); st.screen = 'puzzle';
    $('puzMsg').textContent = '';
    renderPuzzle();
  }
  const stepById = (id) => st.line.steps.find((s) => s.id === id);
  const cardHtml = (s) => `<span class="e">${s.emoji}</span><span>${Lg.ruby(s.name)}</span>`;
  function renderPuzzle() {
    const P = st.puzzle;
    const slots = $('slots'); slots.innerHTML = '';
    P.slots.forEach((id, i) => {
      const li = document.createElement('li');
      li.className = 'slot' + (P.locked[i] ? ' ok' : '');
      li.innerHTML = `<span class="no">${i + 1}</span>`;
      if (id) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pcard' + (P.locked[i] ? ' locked' : ''); b.dataset.id = id; b.dataset.slot = i;
        b.innerHTML = cardHtml(stepById(id));
        b.disabled = P.locked[i];
        b.addEventListener('click', () => { P.slots[i] = null; P.pool.push(id); S.sfx('pi'); renderPuzzle(); });
        li.appendChild(b);
      }
      slots.appendChild(li);
    });
    const pool = $('pool'); pool.innerHTML = '';
    P.pool.forEach((id) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pcard'; b.dataset.id = id;
      b.innerHTML = cardHtml(stepById(id));
      b.addEventListener('click', () => {
        const k = P.slots.indexOf(null);
        if (k < 0) return;
        P.slots[k] = id; P.pool.splice(P.pool.indexOf(id), 1); S.sfx('pon'); renderPuzzle();
      });
      pool.appendChild(b);
    });
    $('puzCheck').disabled = P.slots.includes(null);
  }
  function checkPuzzle() {
    const P = st.puzzle;
    if (P.slots.includes(null)) return;
    P.tries++;
    const res = Lg.checkOrder(st.line, P.slots);
    if (res.all) { S.sfx('kira'); P.slots.forEach((_, i) => { P.locked[i] = true; }); renderPuzzle(); setTimeout(finishLine, 700); return; }
    S.sfx('boo');
    const wrongIds = [];
    res.marks.forEach((ok, i) => { if (ok) P.locked[i] = true; else { wrongIds.push(P.slots[i]); P.slots[i] = null; } });
    P.pool.push(...wrongIds);
    const n = res.marks.filter(Boolean).length;
    $('puzMsg').textContent = `${n} こ あたり！ のこり を もういちど ならべよう`;
    renderPuzzle();
    wrongIds.forEach((id) => { const b = $('pool').querySelector(`[data-id="${id}"]`); if (b) b.classList.add('wrong'); });
  }

  // ---------- かんせい ----------
  function finishLine() {
    const line = st.line, P = st.puzzle;
    const stars = Lg.starsFor(P ? P.tries : 1);
    save.made[line.id] = (save.made[line.id] || 0) + 1;
    save.stars[line.id] = Math.max(save.stars[line.id] || 0, stars);
    if (st.choice) save.choice[line.id] = { id: st.choice.id, label: st.choice.label, color: st.choice.color };
    persist();
    S.clearBgm();
    S.sfx('chin');
    const choice = save.choice[line.id] && (line.id === 'enpitsu' || line.id === 'pet') ? save.choice[line.id] : null;
    $('doneProduct').innerHTML = productSvg(line.id, choice);
    $('doneName').textContent = productName(line, choice);
    $('doneStars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    $('drawBtn').hidden = line.id !== 'enpitsu';
    st.drawColor = choice ? choice.color : '#343a40';
    show('done'); st.screen = 'done';
  }

  // ---------- かく ----------
  let drawCtx = null;
  function openDraw() {
    show('draw'); st.screen = 'draw';
    const cv = $('canvas');
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    drawCtx = cv.getContext('2d');
    drawCtx.scale(dpr, dpr);
    drawCtx.lineCap = 'round'; drawCtx.lineJoin = 'round'; drawCtx.lineWidth = 6; drawCtx.strokeStyle = st.drawColor;
  }
  (() => {
    const cv = $('canvas');
    const pts = new Map();
    const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, pos(e)); });
    cv.addEventListener('pointermove', (e) => {
      const a = pts.get(e.pointerId);
      if (!a || !drawCtx) return;
      const b = pos(e);
      drawCtx.beginPath(); drawCtx.moveTo(a.x, a.y); drawCtx.lineTo(b.x, b.y); drawCtx.stroke();
      pts.set(e.pointerId, b);
    });
    const end = (e) => pts.delete(e.pointerId);
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  })();

  // ---------- たな ----------
  function openShelf() {
    setTheme('#1971c2', '#e7f5ff');
    const grid = $('shelfGrid'); grid.innerHTML = '';
    let made = 0;
    LINES.forEach((line) => {
      const n = save.made[line.id] || 0;
      const d = document.createElement('div');
      d.className = 'shelf-item' + (n ? '' : ' empty');
      d.dataset.line = line.id;
      if (n) {
        made++;
        const choice = save.choice[line.id] && (line.id === 'enpitsu' || line.id === 'pet') ? save.choice[line.id] : null;
        const s = save.stars[line.id] || 0;
        d.innerHTML = `<div class="pic">${productSvg(line.id, choice)}</div><div class="nm">${Lg.esc(productName(line, choice))}</div><div class="st">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</div><div class="ds">${n} かい つくった</div>`;
      } else d.innerHTML = `<div class="pic">？</div><div class="nm">${line.emoji} ${Lg.esc(line.name)}</div><div class="ds">まだ だよ</div>`;
      grid.appendChild(d);
    });
    $('shelfLead').textContent = made === LINES.length ? 'ぜんぶ の こうじょう を けんがく した！ すごい！' : `${made} / ${LINES.length} こ かざって ある よ`;
    show('shelf'); st.screen = 'shelf';
  }

  // ---------- タイトル ----------
  function openTitle() {
    stopOp(); S.clearBgm();
    setTheme('#1971c2', '#e7f5ff');
    const box = $('factories'); box.innerHTML = '';
    FACTORIES.forEach((f) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'fcard'; b.dataset.factory = f.id; b.style.setProperty('--c', f.color);
      const made = f.lines.some((id) => save.made[id]);
      b.innerHTML = `<span class="em">${f.emoji}</span><span><span class="nm">${Lg.esc(f.name)}</span><span class="ds">${Lg.esc(f.desc)}</span></span>${made ? '<span class="made">✅</span>' : ''}`;
      b.addEventListener('click', () => {
        S.sfx('pon');
        if (f.lines.length === 1) startLine(f.lines[0]);
        else openChoose(f);
      });
      box.appendChild(b);
    });
    show('title'); st.screen = 'title';
  }
  function openChoose(f) {
    const box = $('chooseBtns'); box.innerHTML = '';
    f.lines.forEach((id) => {
      const line = LINES.find((l) => l.id === id);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'big'; b.dataset.line = id;
      b.textContent = id === 'kami' ? '🌲 き から つくる' : '♻️ ふるい かみ から つくる';
      b.addEventListener('click', () => { $('choose').hidden = true; startLine(line.id); });
      box.appendChild(b);
    });
    $('choose').hidden = false;
  }
  function refreshToggles() {
    $('sndBtn').classList.toggle('off', !save.sound); $('sndBtn').textContent = save.sound ? '🔊' : '🔇';
    $('bgmBtn').classList.toggle('off', !save.bgm);
    $('sndBtn').setAttribute('aria-pressed', save.sound); $('bgmBtn').setAttribute('aria-pressed', save.bgm);
  }
  $('sndBtn').addEventListener('click', () => { save.sound = !save.sound; S.setOn(save.sound); persist(); refreshToggles(); S.sfx('pon'); });
  $('bgmBtn').addEventListener('click', () => { save.bgm = !save.bgm; S.setBgm(save.bgm); persist(); refreshToggles(); });
  $('chooseClose').addEventListener('click', () => { $('choose').hidden = true; });
  $('shelfBtn').addEventListener('click', openShelf);
  $('shelfBack').addEventListener('click', openTitle);
  $('lineBack').addEventListener('click', openTitle);
  $('puzBack').addEventListener('click', openTitle);
  $('retryBtn').addEventListener('click', () => { if (!st.moving && st.ctx && !st.ctx.finished) { S.sfx('pi'); startStation(); } });
  $('puzCheck').addEventListener('click', checkPuzzle);
  $('doneShelf').addEventListener('click', openShelf);
  $('doneMenu').addEventListener('click', openTitle);
  $('drawBtn').addEventListener('click', openDraw);
  $('drawBack').addEventListener('click', () => { show('done'); st.screen = 'done'; });
  $('drawClear').addEventListener('click', () => { const cv = $('canvas'); if (drawCtx) drawCtx.clearRect(0, 0, cv.width, cv.height); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('choose').hidden) $('choose').hidden = true; });

  refreshToggles();
  openTitle();

  window.KojoDebug = {
    state: () => ({ screen: st.screen, line: st.line && st.line.id, idx: st.idx, moving: st.moving, op: st.ctx && st.ctx.step.op, finished: !!(st.ctx && st.ctx.finished), puzzle: st.puzzle && { tries: st.puzzle.tries, slots: st.puzzle.slots.slice(), pool: st.puzzle.pool.slice() }, save: JSON.parse(JSON.stringify(save)) }),
    ctx: () => st.ctx,
    finishStep: () => { if (st.ctx && st.ctx.debugDone) st.ctx.debugDone(); },
    startLine, openTitle, openShelf,
  };
})();
