'use strict';

/*
 * のばす・のぼる・そーっと の しくみ（この ほん の いちばん の あそび）
 *
 *   Mame.attach(el)  … え の うえ の ゆび を みはる
 *   Mame.poll()      → { ups: [ゆび ごと の うえ へ うごいた きょり], dxs: [ゆび ごと の みぎ へ うごいた きょり], fingers }
 *   Mame.detach()
 *   Mame.model       … まめのき の たかさ・のぼる かず・そーっと の けいさん（テスト できる ように ぜんぶ かんすう）
 *
 * - grow : うえ へ なぞった きょり（え の たかさ を 1 と する）を ゆび ごと に あつめる。ゆび 2ほん なら 2ばい。
 * - climb: ひだり と みぎ を こうご に タップ した ときだけ 1だん のぼる（おなじ がわ を つづけて おすと「おっとっと」）。
 *          ゆび 2ほん で ひだり と みぎ を いっしょに おしても、こうご に なって いれば 2だん。
 * - sneak: みぎ へ うごいた きょり（え の はば を 1）で すすむ。はやすぎる と「もの おと」が たまって、
 *          いっぱい に なると きょじん が むにゃむにゃ（すこし もどされる）。ゆっくり なら ぜったい おきない。
 * - キーボード: ↑ と スペース で のばす、← → で のぼる、→ を ゆっくり で そーっと（パソコン よう）。
 */
const Mame = (() => {
  /* ============================ けいさん（model） ============================ */

  const GROW = 0.42; // え の たかさ 1つぶん うえ へ なぞる と のびる りょう
  const MAX_STEP = 0.3; // 1かい の うごき で かぞえる きょり の うえ の げんど（ゆび が とんだ とき）
  const SAFE = 0.32; // そーっと の はやさ（え の はば ／ びょう）。これ より おそければ ぜったい おきない
  const NOISE = 3.5; // はやすぎた ぶん の もの おと の たまりかた
  const CALM = 0.5; // もの おと が しずまる はやさ（1びょう）
  const PUSH = 0.1; // きょじん が むにゃむにゃ した とき もどされる きょり

  function create() {
    return { height: 0, steps: 0, last: null, slips: 0, x: 0, noise: 0, wakes: 0 };
  }

  // ゆび ごと の きょり を たす。ゆび 2ほん で おなじ だけ なぞれば ちょうど 2ばい
  function power(list) {
    let s = 0;
    for (let i = 0; i < list.length; i += 1) s += Math.max(0, Math.min(MAX_STEP, list[i]));
    return s;
  }

  // のばす。うえ へ なぞった ぶん だけ のびる（したへ なぞっても ちぢまない）
  function growStep(st, ups) {
    st.height = Math.min(1, st.height + power(ups) * GROW);
    return st;
  }

  // のぼる（おりる も おなじ）。side は 'L' か 'R'。こうご なら true
  function climbTap(st, side) {
    if (side !== 'L' && side !== 'R') return false;
    if (st.last === side) {
      st.slips += 1;
      return false;
    }
    st.last = side;
    st.steps += 1;
    return true;
  }

  // そーっと。dx は みぎ へ うごいた きょり（え の はば が 1）。かえりち: 'wake' なら きょじん が むにゃむにゃ
  function sneakStep(st, dx, dt) {
    const d = Math.max(0, Math.min(MAX_STEP, dx || 0));
    const speed = dt > 0 ? d / dt : 0;
    st.x = Math.min(1, st.x + d);
    if (speed > SAFE) st.noise += (speed - SAFE) * NOISE * dt;
    else st.noise = Math.max(0, st.noise - CALM * (dt || 0));
    if (st.noise >= 1) {
      st.noise = 0;
      st.wakes += 1;
      st.x = Math.max(0, st.x - PUSH);
      return 'wake';
    }
    return null;
  }

  const model = { GROW, SAFE, PUSH, create, power, growStep, climbTap, sneakStep };

  /* ============================ ゆび を みはる ============================ */

  let el = null;
  const ptrs = new Map(); // pointerId → { x, y, up, dx, moved }
  let keyUp = 0;
  let keyRight = 0;
  let keyLast = 0;

  function size() {
    const r = el ? el.getBoundingClientRect() : { width: 1, height: 1 };
    return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
  }

  function down(e) {
    if (!el) return;
    e.preventDefault();
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, up: 0, dx: 0, moved: 0 });
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      /* なにも しない */
    }
  }

  function move(e) {
    const p = ptrs.get(e.pointerId);
    if (!p || !el) return;
    e.preventDefault();
    const s = size();
    const up = (p.y - e.clientY) / s.h;
    const dx = (e.clientX - p.x) / s.w;
    if (up > 0) p.up += Math.min(MAX_STEP, up);
    if (dx > 0) p.dx += Math.min(MAX_STEP, dx);
    if (Math.abs(up) + Math.abs(dx) > 0.003) p.moved = performance.now();
    p.x = e.clientX;
    p.y = e.clientY;
  }

  function up(e) {
    ptrs.delete(e.pointerId);
  }

  function key(e) {
    if (!el) return;
    const a = document.activeElement;
    if (a && a !== document.body && a !== el && a.closest && a.closest('button, a')) return;
    if (e.key === 'ArrowUp' || e.key === ' ') {
      e.preventDefault();
      keyUp = performance.now();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      keyRight = performance.now();
    }
  }

  // いま までに あつまった うごき を わたして、からっぽ に する
  function poll() {
    const now = performance.now();
    const ups = [];
    const dxs = [];
    let fingers = 0;
    ptrs.forEach((p) => {
      ups.push(p.up);
      dxs.push(p.dx);
      p.up = 0;
      p.dx = 0;
      if (now - p.moved < 220) fingers += 1;
    });
    // キーボード: おしている あいだ、1びょう に え 1つぶん（のばす）／ゆっくり（そーっと）
    const dt = Math.min(0.1, (now - (keyLast || now)) / 1000);
    if (el && now - keyUp < 160) {
      ups.push(dt * 1.2);
      fingers = Math.max(fingers, 1);
    }
    if (el && now - keyRight < 160) dxs.push(dt * SAFE * 0.7);
    keyLast = now;
    return { ups, dxs, fingers };
  }

  function attach(target) {
    detach();
    el = target;
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
    el = null;
    ptrs.clear();
    keyUp = 0;
    keyRight = 0;
  }

  return { attach, detach, poll, model };
})();
