'use strict';

/*
 * みち を たどる・ひろげる・おおごえ・ドラッグ の しくみ
 *
 *   Mori.model  … けいさん だけ（テスト できる ように ぜんぶ かんすう。え の ざひょう は 800×500）
 *   Mori.attach(el, h) … え の うえ の ゆび を みはって、h.down / h.move / h.up を よぶ
 *                         （ざひょう は え の ざひょう、n は いま おいて いる ゆび の かず）
 *   Mori.pinch() … ゆび 2ほん の とき { d0: さいしょ の きょり, d: いま の きょり, mid } を かえす
 *   Mori.detach()
 *
 * - path   : ゆび に いちばん ちかい みち の いち（0〜1）を もとめ、みち から ゆるし はば（え の はば 0.06）いない
 *            で、いま の いち より まえ（＋0.08 まで）の とき だけ すすむ。とびこし・ぎゃくもどり は しない。
 * - flowers: つむ たび に おひさま が 1/12 かたむく。12 で「もう いかなきゃ」。
 * - zoom   : タップ 1かい か、ゆび 2ほん の きょり が 1.4ばい で「おおきく なった」。がめん は ズーム しない。
 * - shout  : タップ 1かい ＝ ＋0.1、ゆび 2ほん どうじ なら ＋0.2。じかん で すこし へる。
 * - drop   : かご・クローゼット・おさら の あたり は おおきめ（え の はば 0.12）。
 */
const Mori = (() => {
  /* ============================ けいさん（model） ============================ */

  const W = 800;
  const TOL = 0.06; // みち の ゆるし はば（え の はば が 1）
  const AHEAD = 0.08; // 1かい で すすめる いちばん さき（みち の ながさ が 1）
  const BACK = 0.03; // ちょっと うしろ に ゆび が あっても みち の うえ と みなす
  const SUN_STEP = 1 / 12;
  const PINCH = 1.4;
  const SHOUT_TAP = 0.1;
  const SHOUT_DECAY = 0.04; // 1びょう で へる りょう（ゆっくり でも 1びょう に 1かい より はやければ たまる）
  const DROP = 0.12;

  // おれせん の ながさ を はかって おく
  function makePath(points) {
    const pts = points.map((p) => ({ x: p[0], y: p[1] }));
    const acc = [0];
    for (let i = 1; i < pts.length; i += 1) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const total = acc[acc.length - 1] || 1;
    return { pts, acc: acc.map((a) => a / total), total };
  }

  // みち の いち t（0〜1）→ え の ざひょう と すすむ むき
  function pointAt(path, t) {
    const q = Math.max(0, Math.min(1, t));
    const { pts, acc } = path;
    let i = 1;
    while (i < acc.length - 1 && acc[i] < q) i += 1;
    const a = acc[i - 1];
    const b = acc[i];
    const u = b > a ? (q - a) / (b - a) : 0;
    const p = pts[i - 1];
    const r = pts[i];
    return { x: p.x + (r.x - p.x) * u, y: p.y + (r.y - p.y) * u, dx: r.x - p.x, dy: r.y - p.y };
  }

  // t0〜t1 の あいだ で、点 p に いちばん ちかい みち の いち。d は え の はば を 1 と した きょり
  function nearest(path, p, t0, t1) {
    const lo = t0 == null ? 0 : t0;
    const hi = t1 == null ? 1 : t1;
    const { pts, acc } = path;
    let best = { t: lo, d: Infinity };
    for (let i = 1; i < pts.length; i += 1) {
      const a = acc[i - 1];
      const b = acc[i];
      if (b < lo || a > hi || b <= a) continue;
      const A = pts[i - 1];
      const B = pts[i];
      const vx = B.x - A.x;
      const vy = B.y - A.y;
      let u = ((p.x - A.x) * vx + (p.y - A.y) * vy) / (vx * vx + vy * vy);
      const uLo = Math.max(0, (lo - a) / (b - a));
      const uHi = Math.min(1, (hi - a) / (b - a));
      u = Math.max(uLo, Math.min(uHi, u));
      const d = Math.hypot(A.x + vx * u - p.x, A.y + vy * u - p.y) / W;
      if (d < best.d) best = { t: a + (b - a) * u, d };
    }
    return best;
  }

  function create(points) {
    return {
      path: points ? makePath(points) : null, progress: 0, off: false, offs: 0,
      sun: 0, flowers: 0, shout: 0, taps: 0,
    };
  }

  // みち を たどる。point は え の ざひょう。かえりち { progress, off }
  function pathStep(st, point) {
    const loc = nearest(st.path, point, Math.max(0, st.progress - BACK), Math.min(1, st.progress + AHEAD));
    if (loc.d <= TOL) {
      if (st.off) st.off = false;
      if (loc.t > st.progress) st.progress = loc.t > 0.985 ? 1 : loc.t;
    } else if (!st.off) {
      st.off = true;
      st.offs += 1;
    }
    return { progress: st.progress, off: st.off };
  }

  // ゆび を はなしたら みち に もどる（しっぱい に しない）
  function pathRelease(st) {
    st.off = false;
    return st;
  }

  // キーボード（→ ↑）で すこし すすむ
  function pathKey(st, d) {
    st.progress = Math.max(st.progress, Math.min(1, st.progress + (d || 0.03)));
    if (st.progress > 0.985) st.progress = 1;
    return st.progress;
  }

  // おはな を つむ。かえりち: もう いかなきゃ（おひさま が かたむききった）なら true
  function pick(st) {
    if (st.sun >= 1 - 1e-9) return true;
    st.flowers += 1;
    st.sun = Math.min(1, st.sun + SUN_STEP);
    if (st.sun > 1 - 1e-9) st.sun = 1;
    return st.sun >= 1;
  }

  // ゆび 2ほん の ひろげ ぐあい。1.4ばい で おおきく なる
  const ratio = (d0, d) => (d0 > 0 ? d / d0 : 1);
  const isZoom = (d0, d) => ratio(d0, d) >= PINCH;

  // おおごえ。n は いっしょに タップ した ゆび の かず
  function shoutTap(st, n) {
    const k = Math.max(1, n || 1);
    st.taps += k;
    st.shout = Math.min(1, st.shout + SHOUT_TAP * k + 1e-9);
    return st.shout >= 1;
  }
  function shoutDecay(st, dt) {
    if (st.shout < 1) st.shout = Math.max(0, st.shout - SHOUT_DECAY * (dt || 0));
    return st.shout;
  }

  // ドラッグ を はなした ところ が あたり か（え の はば の 0.12 いない）
  const hit = (p, target, tol) => Math.hypot(p.x - target.x, p.y - target.y) / W <= (tol == null ? DROP : tol);

  const model = {
    TOL, AHEAD, PINCH, SHOUT_TAP, SHOUT_DECAY, DROP, SUN_STEP,
    makePath, pointAt, nearest, create, pathStep, pathRelease, pathKey, pick, ratio, isZoom, shoutTap, shoutDecay, hit,
  };

  /* ============================ ゆび を みはる ============================ */

  let el = null;
  let H = null;
  const ptrs = new Map(); // pointerId → { x, y, x0, y0 }（え の ざひょう）
  let pinch0 = 0;

  function toArt(e) {
    const r = el.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / Math.max(1, r.width)) * 800, y: ((e.clientY - r.top) / Math.max(1, r.height)) * 500 };
  }
  function twoDist() {
    const a = Array.from(ptrs.values());
    if (a.length < 2) return 0;
    return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
  }

  function down(e) {
    if (!el) return;
    // え の うえ の ボタン（さき を いそぐ）は ふつう の ボタン として はたらかせる
    if (e.target && e.target.closest && e.target.closest('button')) return;
    e.preventDefault();
    const p = toArt(e);
    ptrs.set(e.pointerId, { x: p.x, y: p.y, x0: p.x, y0: p.y });
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      /* なにも しない */
    }
    if (ptrs.size === 2) pinch0 = twoDist();
    if (H && H.down) H.down(p, ptrs.size, e.pointerId);
  }

  function move(e) {
    const q = ptrs.get(e.pointerId);
    if (!q || !el) return;
    e.preventDefault();
    const p = toArt(e);
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    q.x = p.x;
    q.y = p.y;
    if (H && H.move) H.move(p, ptrs.size, e.pointerId, dx, dy, q);
  }

  function up(e) {
    const q = ptrs.get(e.pointerId);
    if (!q) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch0 = 0;
    if (H && H.up) H.up({ x: q.x, y: q.y }, ptrs.size, e.pointerId, q);
  }

  function pinch() {
    if (ptrs.size < 2 || !pinch0) return null;
    const a = Array.from(ptrs.values());
    return { d0: pinch0, d: twoDist(), mid: { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 } };
  }

  function attach(target, handlers) {
    detach();
    el = target;
    H = handlers || null;
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  }

  function detach() {
    if (el) {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('lostpointercapture', up);
    }
    el = null;
    H = null;
    ptrs.clear();
    pinch0 = 0;
  }

  return { attach, detach, pinch, fingers: () => ptrs.size, model };
})();
