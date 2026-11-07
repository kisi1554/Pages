/* うちゅう ステーション の いちにち — うく もの の しくみ（DOM なし。ブラウザ と node の りょうほう で つかう）
 *
 *  - body: いち (x, y) と はやさ (vx, vy)。ちから が なければ まっすぐ すすみ つづける（かんせい）。
 *    くうき の ていこう は ほんの すこし（drag）。かべ に あたると すこし よわく なって はねかえる。
 *    ちきゅう モード は じゅうりょく (gravity) を たす だけ。
 *  - ring: みず の たま。ばね で つないだ てん の わ。つつく と ぷるぷる ゆれて、まるく もどる。
 *  - orbit: ステーション は やく 90ぷん で ちきゅう を 1しゅう → 1にち に ひので が やく 16かい。
 */
(function (root) {
  "use strict";

  const SPACE = { gravity: 0, drag: 0.03, restitution: 0.6 };
  const EARTH = { gravity: 900, drag: 0.03, restitution: 0.35 };

  function body(o) {
    o = o || {};
    return { x: o.x || 0, y: o.y || 0, vx: o.vx || 0, vy: o.vy || 0, r: o.r == null ? 10 : o.r };
  }

  function speed(b) { return Math.hypot(b.vx, b.vy); }

  /* dt びょう すすめる。bounds = {x0, y0, x1, y1}。かべ に あたった ら hit: true */
  function step(b, dt, opt, bounds) {
    opt = opt || SPACE;
    const g = opt.gravity || 0, drag = opt.drag || 0, e = opt.restitution == null ? 0.6 : opt.restitution;
    b.vy += g * dt;
    const k = Math.max(0, 1 - drag * dt);
    b.vx *= k; b.vy *= k;
    b.x += b.vx * dt; b.y += b.vy * dt;
    let hit = false;
    if (bounds) {
      const r = b.r;
      if (b.x - r < bounds.x0) { b.x = bounds.x0 + r; b.vx = Math.abs(b.vx) * e; hit = true; }
      if (b.x + r > bounds.x1) { b.x = bounds.x1 - r; b.vx = -Math.abs(b.vx) * e; hit = true; }
      if (b.y - r < bounds.y0) { b.y = bounds.y0 + r; b.vy = Math.abs(b.vy) * e; hit = true; }
      if (b.y + r > bounds.y1) {
        b.y = bounds.y1 - r; b.vy = -Math.abs(b.vy) * e; hit = true;
        // ちきゅう で ゆか に ついた ら、こまかい はずみ は とめる
        if (g > 0 && Math.abs(b.vy) < 40) { b.vy = 0; b.vx *= 0.9; }
      }
    }
    return { hit };
  }

  /* かべ を ける（スワイプ）: dx, dy の むき に、ながさ に おうじた はやさ を もらう */
  function kick(b, dx, dy, power) {
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    const sp = Math.min(len, 160) * (power || 1.2);
    b.vx = (dx / len) * sp; b.vy = (dy / len) * sp;
  }

  /* てすり を つかむ: とまる */
  function grab(b) { b.vx = 0; b.vy = 0; }

  /* ---- みず の たま（ばね の わ） ---- */
  function ring(n, radius) {
    const pts = [];
    for (let i = 0; i < n; i++) pts.push({ r: radius, v: 0 });
    return { n, rest: radius, pts };
  }

  /* angle (ラジアン) の あたり を ぐっと おす */
  function poke(rg, angle, amount) {
    const n = rg.n;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      let d = Math.abs(a - angle) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      const w = Math.max(0, 1 - d / 0.9);
      rg.pts[i].v -= amount * w;
    }
  }

  function stepRing(rg, dt) {
    const n = rg.n, K = 120, KN = 60, DAMP = 2.2;
    const acc = rg.pts.map((p, i) => {
      const a = rg.pts[(i + n - 1) % n], c = rg.pts[(i + 1) % n];
      return -K * (p.r - rg.rest) + KN * (a.r + c.r - 2 * p.r) - DAMP * p.v;
    });
    // たいせき（おおきさ）を たもつ: へこんだ ぶん ほか が ふくらむ
    let mean = 0;
    rg.pts.forEach((p, i) => { p.v += acc[i] * dt; p.r += p.v * dt; mean += p.r; });
    mean /= n;
    const fix = rg.rest - mean;
    rg.pts.forEach((p) => { p.r += fix * 0.5; if (p.r < rg.rest * 0.4) p.r = rg.rest * 0.4; });
  }

  /* ゆれ の おおきさ（0 なら まんまる） */
  function wobble(rg) {
    let m = 0;
    for (const p of rg.pts) m = Math.max(m, Math.abs(p.r - rg.rest));
    return m;
  }

  /* SVG の path の d（てん の あいだ を なめらか に つなぐ） */
  function ringPath(rg, cx, cy) {
    const n = rg.n;
    const P = rg.pts.map((p, i) => {
      const a = (i / n) * Math.PI * 2;
      return [cx + Math.cos(a) * p.r, cy + Math.sin(a) * p.r];
    });
    const mid = (i) => { const a = P[i % n], b = P[(i + 1) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    const f = (v) => v.toFixed(1);
    let d = "M" + f(mid(0)[0]) + " " + f(mid(0)[1]);
    for (let i = 1; i <= n; i++) {
      const c = P[i % n], m = mid(i);
      d += " Q" + f(c[0]) + " " + f(c[1]) + " " + f(m[0]) + " " + f(m[1]);
    }
    return d + "Z";
  }

  /* ---- ちきゅう の まわり を まわる ----
   * きた から みた ず。たいよう は みぎ（かく 0°）。かく が -90°〜90° の あいだ が ひる。
   * t=0 は ひる の まんなか。はんとけいまわり に すすむ。 */
  const PERIOD = 90;        // ぷん（ISS は やく 90ぷん で 1しゅう）
  const DAY = 24 * 60;      // ぷん

  function stationAngle(t, period) { return (360 * t) / (period || PERIOD); }
  function norm(a) { a %= 360; return a < 0 ? a + 360 : a; }
  function isDay(angle) { const a = norm(angle); return a < 90 || a > 270; }

  /* t0 より あと 〜 t1 まで の ひので（よる → ひる）の かず。ひので は かく 270° の とき */
  function sunrises(t0, t1, period) {
    period = period || PERIOD;
    const first = 0.75 * period; // t = period*(0.75 + k)
    const count = (t) => (t < first ? 0 : Math.floor((t - first) / period) + 1);
    return count(t1) - count(t0);
  }

  function sunrisesPerDay(period) { return sunrises(0, DAY, period || PERIOD); }

  /* ちきゅう は 24じかん で 1かいてん。にほん の かく（きた から みて） */
  function japanAngle(t, start) { return (start == null ? 140 : start) + (360 * t) / DAY; }

  function angleGap(a, b) { let d = Math.abs(norm(a) - norm(b)); return d > 180 ? 360 - d : d; }

  const F = {
    SPACE, EARTH, body, speed, step, kick, grab,
    ring, poke, stepRing, wobble, ringPath,
    PERIOD, DAY, stationAngle, norm, isDay, sunrises, sunrisesPerDay, japanAngle, angleGap,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = F;
  else root.Float = F;
})(typeof window !== "undefined" ? window : this);
