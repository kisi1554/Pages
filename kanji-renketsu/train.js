'use strict';

/* かんじ れんけつ - 車両 の 描画 と れんけつ
 *
 *  Train.car(part)      … 車両 の 要素 を つくる（SVG を コード で 描く。連結器 つき）
 *     part = { role, ch, label }
 *     role  L = へん の 車両（むらさき）  R = つくり の 車両（オレンジ）
 *           T = うえ（かんむり）の 車両   B = した（あし）の 車両
 *           S = そのまま 1両（みどり）    K = できあがった 漢字 の 車両
 *  Train.yard(el, h)    … 車両 置き場。ドラッグ でも「タップ → タップ」でも 連結 できる。
 *     h.onPair(a, b)    … くみあわせ を ためす（a は うごかした／さきに えらんだ 車両）
 *     h.onSingle(car)   … そのまま 1両 を つかう
 *  Train.couple(a, b, kanji, vertical) … ガチャン！ と つながって 1両 に かわる アニメ
 *  Train.reject(car, target)           … ぷしゅー と もどる アニメ
 */

const Train = (() => {
  const PAIR = { L: 'R', R: 'L', T: 'B', B: 'T' };

  function svgFor(role) {
    if (role === 'K') {
      return `<svg class="car-svg" viewBox="0 0 220 112" aria-hidden="true">
        <rect x="0" y="62" width="10" height="10" rx="2" class="cp"/><rect x="210" y="62" width="10" height="10" rx="2" class="cp"/>
        <rect x="8" y="4" width="204" height="84" rx="14" class="body"/>
        <rect x="8" y="4" width="204" height="10" rx="6" class="roof"/>
        <rect x="8" y="80" width="204" height="5" class="stripe"/>
        <rect x="50" y="15" width="120" height="62" rx="10" class="win"/>
        <rect x="18" y="20" width="24" height="34" rx="5" class="win2"/><rect x="178" y="20" width="24" height="34" rx="5" class="win2"/>
        <rect x="20" y="88" width="42" height="6" class="bogie"/><rect x="158" y="88" width="42" height="6" class="bogie"/>
        <circle cx="29" cy="101" r="7" class="wheel"/><circle cx="53" cy="101" r="7" class="wheel"/>
        <circle cx="167" cy="101" r="7" class="wheel"/><circle cx="191" cy="101" r="7" class="wheel"/>
      </svg>`;
    }
    let cp = '';
    if (role === 'L') cp = '<rect x="108" y="62" width="12" height="10" rx="2" class="cp"/><rect x="114" y="57" width="6" height="20" rx="2" class="cp"/>';
    if (role === 'R') cp = '<rect x="0" y="62" width="12" height="10" rx="2" class="cp"/><rect x="0" y="57" width="6" height="20" rx="2" class="cp"/>';
    if (role === 'S') cp = '<rect x="0" y="62" width="10" height="10" rx="2" class="cp"/><rect x="110" y="62" width="10" height="10" rx="2" class="cp"/>';
    if (role === 'B') cp = '<rect x="48" y="0" width="24" height="7" rx="2" class="cp"/>';
    const wheels = role === 'T'
      ? '<rect x="48" y="88" width="24" height="10" rx="2" class="cp"/><rect x="22" y="88" width="76" height="4" rx="2" class="bogie"/>'
      : `<rect x="16" y="88" width="28" height="6" class="bogie"/><rect x="76" y="88" width="28" height="6" class="bogie"/>
         <circle cx="23" cy="101" r="7" class="wheel"/><circle cx="39" cy="101" r="7" class="wheel"/>
         <circle cx="81" cy="101" r="7" class="wheel"/><circle cx="97" cy="101" r="7" class="wheel"/>`;
    return `<svg class="car-svg" viewBox="0 0 120 112" aria-hidden="true">
      ${cp}
      <rect x="8" y="4" width="104" height="84" rx="12" class="body"/>
      <rect x="8" y="4" width="104" height="10" rx="6" class="roof"/>
      <rect x="8" y="80" width="104" height="5" class="stripe"/>
      <rect x="16" y="15" width="88" height="62" rx="9" class="win"/>
      ${wheels}
    </svg>`;
  }

  let uid = 0;
  function car(part) {
    const el = document.createElement('div');
    el.className = 'car role-' + part.role;
    el.dataset.role = part.role;
    el.dataset.ch = part.ch;
    el.dataset.id = part.id || ('c' + (++uid));
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    const label = part.label != null ? part.label : partName(part.role, part.ch);
    const roleName = { L: 'へん', R: 'つくり', T: 'うえ', B: 'した', S: 'そのまま', K: 'かんじ' }[part.role] || '';
    el.setAttribute('aria-label', roleName + ' の しゃりょう ' + part.ch + (label ? '（' + label + '）' : ''));
    el.innerHTML = `${svgFor(part.role)}<span class="car-glyph" lang="ja">${part.ch}</span>` +
      `<span class="car-label">${label || '&nbsp;'}</span>`;
    return el;
  }

  /* ------------------------- 車両 置き場 ------------------------- */
  function yard(root, h) {
    let selected = null;
    let busy = false;
    let drag = null;

    function clearSel() {
      if (selected) selected.classList.remove('selected');
      selected = null;
      root.classList.remove('has-sel');
      if (h.onSelect) h.onSelect(null);
    }
    function select(el) {
      clearSel();
      selected = el;
      el.classList.add('selected');
      root.classList.add('has-sel');
      root.querySelectorAll('.car').forEach((c) => c.classList.toggle('can-pair', c !== el && PAIR[el.dataset.role] === c.dataset.role));
      if (h.onSelect) h.onSelect(el);
    }

    async function run(fn) {
      busy = true;
      root.classList.add('busy');
      try { await fn(); } finally { busy = false; root.classList.remove('busy'); }
    }

    function tap(el) {
      if (busy || el.classList.contains('used')) return;
      Sound.play('tap');
      const role = el.dataset.role;
      if (role === 'S') { clearSel(); run(() => h.onSingle(el)); return; }
      if (!selected) { select(el); return; }
      if (selected === el) { clearSel(); root.querySelectorAll('.can-pair').forEach((c) => c.classList.remove('can-pair')); return; }
      if (PAIR[selected.dataset.role] === role) {
        const a = selected;
        clearSel();
        root.querySelectorAll('.can-pair').forEach((c) => c.classList.remove('can-pair'));
        run(() => h.onPair(a, el));
        return;
      }
      select(el);
    }

    root.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.car');
      if (!el || !root.contains(el) || busy || el.classList.contains('used')) return;
      if (e.button != null && e.button > 0) return;
      e.preventDefault();
      drag = { el, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moved: false };
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* むし */ }
    });
    root.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x0;
      drag.dy = e.clientY - drag.y0;
      if (!drag.moved && Math.hypot(drag.dx, drag.dy) > 10) {
        drag.moved = true;
        drag.el.classList.add('dragging');
        if (selected !== drag.el) select(drag.el);
      }
      if (drag.moved) drag.el.style.transform = `translate(${drag.dx}px, ${drag.dy}px) scale(1.06)`;
    });
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      try { d.el.releasePointerCapture(d.id); } catch (err) { /* むし */ }
      if (!d.moved) { tap(d.el); return; }
      d.el.classList.remove('dragging');
      // ゆび の した の 車両 を さがす
      d.el.style.pointerEvents = 'none';
      const under = document.elementFromPoint(e.clientX, e.clientY);
      d.el.style.pointerEvents = '';
      const target = under && under.closest ? under.closest('.car') : null;
      const role = d.el.dataset.role;
      clearSel();
      root.querySelectorAll('.can-pair').forEach((c) => c.classList.remove('can-pair'));
      if (role === 'S') {
        d.el.style.transform = '';
        run(() => h.onSingle(d.el));
        return;
      }
      if (target && target !== d.el && root.contains(target) && PAIR[role] === target.dataset.role && !target.classList.contains('used')) {
        run(() => h.onPair(d.el, target));
        return;
      }
      // どこ にも つながらない → もとの ばしょ へ
      const from = d.el.style.transform;
      d.el.style.transform = '';
      try {
        d.el.animate([{ transform: from }, { transform: 'translate(0,0)' }], { duration: 220, easing: 'ease-out' });
      } catch (err) { /* むし */ }
    }
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.el.classList.remove('dragging');
      drag.el.style.transform = '';
      drag = null;
    });
    root.addEventListener('keydown', (e) => {
      const el = e.target.closest && e.target.closest('.car');
      if (!el) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(el); }
    });

    return {
      set(parts) {
        clearSel();
        root.innerHTML = '';
        return parts.map((p) => { const c = car(p); root.appendChild(c); return c; });
      },
      clearSel,
      get busy() { return busy; },
      run,
    };
  }

  /* ------------------------- アニメ ------------------------- */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function anim(el, frames, opt) {
    try {
      const a = el.animate(frames, opt);
      return new Promise((r) => { a.onfinish = r; a.oncancel = r; setTimeout(r, (opt.duration || 300) + (opt.delay || 0) + 80); });
    } catch (e) { return wait(opt.duration || 300); }
  }

  function ghost(el, layer) {
    const r = el.getBoundingClientRect();
    const g = el.cloneNode(true);
    g.classList.remove('selected', 'dragging', 'can-pair');
    g.classList.add('ghost');
    g.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;transform:none;`;
    layer.appendChild(g);
    return { g, r };
  }

  // a, b … 車両。kanji … できる 字。vertical … 2かいだて
  async function couple(a, b, kanji, vertical) {
    const layer = document.createElement('div');
    layer.className = 'couple-layer';
    document.body.appendChild(layer);
    // うごかした 車両 も もとの ばしょ から とぶ ように みせる
    let first = a, second = b;
    if (vertical ? a.dataset.role === 'B' : a.dataset.role === 'R') { first = b; second = a; }
    const A = ghost(first, layer);
    const B = ghost(second, layer);
    a.style.transform = ''; b.style.transform = '';
    a.classList.add('hidden-car'); b.classList.add('hidden-car');

    const vw = window.innerWidth, vh = window.innerHeight;
    const w = A.r.width, hgt = A.r.height;
    const cx = vw / 2, cy = Math.min(vh * 0.45, vh - hgt * 1.5);
    let ta, tb;
    if (vertical) {
      const lift = (w * 112 / 120) * 0.8;  // うえ の 車両 は した の 車両 に のる
      ta = { x: cx - w / 2, y: cy - lift };
      tb = { x: cx - w / 2, y: cy };
    } else {
      ta = { x: cx - w + 4, y: cy - hgt / 2 };
      tb = { x: cx - 4, y: cy - hgt / 2 };
    }
    const mv = (o, t) => [{ transform: 'translate(0,0)' }, { transform: `translate(${t.x - o.r.left}px, ${t.y - o.r.top}px)` }];
    // すこし はなれた ところ まで → ガチャン
    const near = (t, dx, dy) => ({ x: t.x + dx, y: t.y + dy });
    const pa = vertical ? near(ta, 0, -24) : near(ta, -26, 0);
    const pb = vertical ? near(tb, 0, 0) : near(tb, 26, 0);
    await Promise.all([
      anim(A.g, mv(A, pa), { duration: 420, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'forwards' }),
      anim(B.g, mv(B, pb), { duration: 420, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'forwards' }),
    ]);
    await Promise.all([
      anim(A.g, [{ transform: `translate(${pa.x - A.r.left}px, ${pa.y - A.r.top}px)` }, { transform: `translate(${ta.x - A.r.left}px, ${ta.y - A.r.top}px)` }], { duration: 140, easing: 'ease-in', fill: 'forwards' }),
      anim(B.g, [{ transform: `translate(${pb.x - B.r.left}px, ${pb.y - B.r.top}px)` }, { transform: `translate(${tb.x - B.r.left}px, ${tb.y - B.r.top}px)` }], { duration: 140, easing: 'ease-in', fill: 'forwards' }),
    ]);
    Sound.play('gachan');
    const boom = document.createElement('div');
    boom.className = 'gachan-text';
    boom.textContent = 'ガチャン！';
    boom.style.left = cx + 'px';
    boom.style.top = (vertical ? cy - hgt : cy - hgt) + 'px';
    layer.appendChild(boom);
    layer.classList.add('shake');
    await wait(380);

    // 2両 が 1両 の 大きな 漢字 の 車両 に かわる
    const k = car({ role: 'K', ch: kanji, label: '' });
    k.classList.add('ghost', 'big-kanji');
    layer.appendChild(k);
    const kr = k.getBoundingClientRect();
    k.style.cssText = `position:fixed;left:${cx - kr.width / 2}px;top:${(vertical ? cy - hgt * 0.4 : cy) - kr.height / 2}px;margin:0;`;
    const flash = document.createElement('div');
    flash.className = 'flash';
    flash.style.left = cx + 'px';
    flash.style.top = (vertical ? cy - hgt * 0.4 : cy) + 'px';
    layer.appendChild(flash);
    await Promise.all([
      anim(A.g, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }),
      anim(B.g, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }),
      anim(k, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420, easing: 'ease-out', fill: 'forwards' }),
    ]);
    await wait(650);
    await anim(layer, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
    layer.remove();
    a.classList.remove('hidden-car'); b.classList.remove('hidden-car');
  }

  async function reject(el, target) {
    Sound.play('pushu');
    const from = el.style.transform || 'translate(0,0)';
    el.style.transform = '';
    let toward = 'translate(0,0)';
    if (target) {
      const r1 = el.getBoundingClientRect(), r2 = target.getBoundingClientRect();
      const dx = (r2.left - r1.left) * 0.35, dy = (r2.top - r1.top) * 0.35;
      toward = `translate(${dx}px, ${dy}px)`;
    }
    el.classList.add('pushu');
    if (target) target.classList.add('pushu');
    await anim(el, [
      { transform: from }, { transform: toward, offset: 0.3 },
      { transform: 'translate(-8px,0)', offset: 0.55 }, { transform: 'translate(8px,0)', offset: 0.7 },
      { transform: 'translate(-4px,0)', offset: 0.85 }, { transform: 'translate(0,0)' },
    ], { duration: 700, easing: 'ease-out' });
    el.classList.remove('pushu');
    if (target) target.classList.remove('pushu');
  }

  return { car, yard, couple, reject, wait, anim };
})();
