'use strict';

/*
 * ひっぱる しくみ（なんぼん の ゆび でも いっしょに ひっぱれる）
 *
 *   Pull.attach(el, { onMove(amount, fingers), onHeave(fingers), onRelease() })
 *   Pull.detach()
 *
 * - el の うえで ゆび を おいて みぎ へ うごかす と amount（0〜1）が ふえる。
 * - amount が HEAVE を こえた しゅんかん に 1かい「うんとこしょ」（onHeave）。
 *   ゆび を もどす か はなす（amount < REARM）と、つぎ の 1かい が できる。
 * - fingers は いま みぎ へ ひっぱって いる ゆび の かず。
 *   かぞく で 2ほん・3ぼん と おけば、その ぶん ちから が つよく なる。
 * - キーボード の → でも ひっぱれる（パソコン よう）。
 */
const Pull = (() => {
  const HEAVE = 0.68;
  const REARM = 0.3;
  const MIN_DX = 0.12; // この くらい うごいた ゆび を「ひっぱって いる」と かぞえる

  let el = null;
  let h = null;
  const ptrs = new Map(); // pointerId → { x0, dx }
  let armed = true;
  let lastAmount = 0;

  // ゆび 1ぽん で いっぱい まで ひっぱる きょり（え の はば の 22%）
  function span() {
    const r = el.getBoundingClientRect();
    return Math.max(80, r.width * 0.22);
  }

  function measure() {
    let best = 0;
    let fingers = 0;
    const s = span();
    ptrs.forEach((p) => {
      const a = Math.max(0, Math.min(1, p.dx / s));
      if (a > best) best = a;
      if (a >= MIN_DX) fingers += 1;
    });
    return { amount: best, fingers };
  }

  function update() {
    const m = measure();
    lastAmount = m.amount;
    if (h.onMove) h.onMove(m.amount, m.fingers);
    if (armed && m.amount >= HEAVE) {
      armed = false;
      if (h.onHeave) h.onHeave(Math.max(1, m.fingers));
    } else if (!armed && m.amount < REARM) {
      armed = true;
    }
  }

  function down(e) {
    if (!h) return;
    e.preventDefault();
    ptrs.set(e.pointerId, { x0: e.clientX, dx: 0 });
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      /* なにも しない */
    }
  }

  function move(e) {
    const p = ptrs.get(e.pointerId);
    if (!p || !h) return;
    e.preventDefault();
    // ひだり に もどしすぎた ぶん は はじまり を ずらす（もう いちど ひっぱり なおせる）
    if (e.clientX < p.x0) p.x0 = e.clientX;
    p.dx = e.clientX - p.x0;
    update();
  }

  function up(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (!h) return;
    update();
    if (!ptrs.size && h.onRelease) h.onRelease();
  }

  let keyAmt = 0;
  let keyTimer = null;
  function key(e) {
    if (!h || e.key !== 'ArrowRight' || e.repeat) return;
    e.preventDefault();
    clearInterval(keyTimer);
    keyAmt = 0;
    keyTimer = setInterval(() => {
      keyAmt += 0.12;
      const a = keyAmt < 1 ? keyAmt : Math.max(0, 2 - keyAmt);
      if (h.onMove) h.onMove(a, 1);
      if (armed && a >= HEAVE) {
        armed = false;
        if (h.onHeave) h.onHeave(1);
      }
      if (keyAmt >= 2) {
        clearInterval(keyTimer);
        armed = true;
        if (h.onRelease) h.onRelease();
      }
    }, 30);
  }

  function attach(target, handlers) {
    detach();
    el = target;
    h = handlers;
    armed = true;
    ptrs.clear();
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    document.addEventListener('keydown', key);
  }

  function detach() {
    if (el) {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('lostpointercapture', up);
    }
    document.removeEventListener('keydown', key);
    clearInterval(keyTimer);
    el = null;
    h = null;
    ptrs.clear();
    lastAmount = 0;
  }

  return { attach, detach, amount: () => lastAmount };
})();
