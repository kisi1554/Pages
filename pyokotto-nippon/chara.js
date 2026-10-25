// ぴょこっと にっぽん リズム — 県の かたち の 計算 と キャラ「ぴょこ」
//
// ぴょこ は 県の かたち（いちばん 大きい 島）を からだ に して、目・口・手足 を コードで 描く。
// かお は かたち の 「いちばん 内がわ の 点」（polylabel）に おくので、どんな かたち でも
// からだ の 中に おさまる。手足 は かお から 外へ のばした 線 が ふち に ぶつかる ところ から 生える。

const Geo = (() => {
  const P = {};
  const PALETTE = ['#ffd43b', '#74c0fc', '#ff8787', '#8ce99a', '#e599f7', '#ffa94d', '#63e6be', '#f783ac', '#b197fc'];

  function parseRings(d) {
    return d.split('M').map((seg) => seg.replace(/z/gi, '').trim()).filter(Boolean)
      .map((seg) => seg.split(/\s+/).map((pt) => pt.split(',').map(Number)))
      .filter((r) => r.length > 2);
  }
  function area(r) {
    let a = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
    return Math.abs(a / 2);
  }
  function bbox(rings) {
    const b = [Infinity, Infinity, -Infinity, -Infinity];
    rings.forEach((r) => r.forEach(([x, y]) => {
      if (x < b[0]) b[0] = x;
      if (y < b[1]) b[1] = y;
      if (x > b[2]) b[2] = x;
      if (y > b[3]) b[3] = y;
    }));
    return { x: b[0], y: b[1], w: b[2] - b[0], h: b[3] - b[1] };
  }
  function inRing(x, y, r) {
    let c = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function segDist2(px, py, a, b) {
    let x = a[0], y = a[1];
    let dx = b[0] - x, dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = b[0]; y = b[1]; } else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = px - x;
    dy = py - y;
    return dx * dx + dy * dy;
  }
  function edgeDist(x, y, r) {
    let m = Infinity;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) m = Math.min(m, segDist2(x, y, r[j], r[i]));
    return Math.sqrt(m);
  }
  // かたち の 中で、ふち から いちばん とおい 点（mapbox の polylabel と おなじ 考え）
  function polylabel(r, precision) {
    const b = bbox([r]);
    const cell = (x, y, h) => {
      const d = (inRing(x, y, r) ? 1 : -1) * edgeDist(x, y, r);
      return { x, y, h, d, max: d + h * Math.SQRT2 };
    };
    const size = Math.min(b.w, b.h);
    let h = size / 2;
    const q = [];
    for (let x = b.x; x < b.x + b.w; x += size) for (let y = b.y; y < b.y + b.h; y += size) q.push(cell(x + h, y + h, h));
    let best = cell(b.x + b.w / 2, b.y + b.h / 2, 0);
    while (q.length) {
      let mi = 0;
      for (let i = 1; i < q.length; i++) if (q[i].max > q[mi].max) mi = i;
      const c = q.splice(mi, 1)[0];
      if (c.d > best.d) best = c;
      if (c.max - best.d <= precision) continue;
      h = c.h / 2;
      q.push(cell(c.x - h, c.y - h, h), cell(c.x + h, c.y - h, h), cell(c.x - h, c.y + h, h), cell(c.x + h, c.y + h, h));
    }
    return [best.x, best.y, best.d];
  }
  // (cx,cy) から (dx,dy) の むき に のばした 線 が ふち に あたる 点
  function rayHit(r, cx, cy, dx, dy) {
    let best = Infinity;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const ax = r[j][0], ay = r[j][1], bx = r[i][0], by = r[i][1];
      const ex = bx - ax, ey = by - ay;
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((ax - cx) * ey - (ay - cy) * ex) / den;
      const u = ((ax - cx) * dy - (ay - cy) * dx) / den;
      if (t > 0 && u >= 0 && u <= 1 && t < best) best = t;
    }
    if (!isFinite(best)) best = 0;
    return [cx + dx * best, cy + dy * best];
  }
  const ringPath = (r, step) => {
    const s = step || 1;
    let d = '';
    for (let i = 0; i < r.length; i += s) d += (i ? ' ' : 'M') + r[i][0].toFixed(1) + ',' + r[i][1].toFixed(1);
    return d + 'z';
  };

  function init() {
    REGIONS.forEach((reg, ri) => {
      reg.codes.forEach((code, i) => {
        const src = PREFECTURES[code - 1];
        const rings = parseRings(src.path);
        let main = rings[0];
        rings.forEach((r) => { if (area(r) > area(main)) main = r; });
        const pl = polylabel(main, 0.5);
        const mb = bbox([main]);
        const kana = PREF_KANA[code];
        P[code] = {
          code, region: reg.id, regionIndex: ri,
          name: src.name, short: kana[0], suffix: kana[1],
          kanjiShort: kana[1] ? src.name.slice(0, -1) : src.name,
          kanjiSuffix: kana[1] ? src.name.slice(-1) : '',
          path: src.path, rings, main, box: bbox(rings), mainBox: mb,
          center: [pl[0], pl[1]], innerR: pl[2],
          color: PALETTE[(i + ri * 2) % PALETTE.length],
          xf: { s: 1, tx: 0, ty: 0 },
        };
      });
    });
    // 沖縄は 九州 の 画面 の 枠 の 中 へ（OKI_FRAME → OKI_VIEW_FRAME）
    const F = OKI_VIEW_FRAME, O = OKI_SRC;
    const s = Math.min(F.w / O.w, F.h / O.h);
    P[47].xf = { s, tx: F.x + (F.w - O.w * s) / 2 - O.x * s, ty: F.y + (F.h - O.h * s) / 2 - O.y * s };
    P[47].clip = F;
  }

  const toView = (p, x, y) => [x * p.xf.s + p.xf.tx, y * p.xf.s + p.xf.ty];
  const toLocal = (p, x, y) => [(x - p.xf.tx) / p.xf.s, (y - p.xf.ty) / p.xf.s];
  const centerView = (p) => toView(p, p.center[0], p.center[1]);
  const inside = (p, x, y) => {
    const [lx, ly] = toLocal(p, x, y);
    return p.rings.some((r) => inRing(lx, ly, r));
  };

  /*
   * 当たり判定（SVG の 座標 vx,vy と、1ユニット が 何px か）
   *   1. かたち の 中、または 中心 の まわり 44px 角（小さい 県 は 56px 角）に 入って いる 県 を あつめる
   *   2. その 中で 中心 に いちばん 近い 県 を えらぶ（となり と かさなる ところ は 中心 が 近い 方）
   *   3. どこにも 入って いなければ、ふち から 12px 以内 の いちばん 近い 県
   */
  function hitTest(vx, vy, pxPerUnit, codes) {
    let best = null, bestD = Infinity;
    codes.forEach((code) => {
      const p = P[code];
      const [cx, cy] = centerView(p);
      const half = (SMALL_PREFS.indexOf(code) >= 0 ? 28 : 22) / pxPerUnit;
      const inBox = Math.abs(vx - cx) <= half && Math.abs(vy - cy) <= half;
      // 沖縄 は 枠 の 外 に はみでた 島 を さわれない ように する
      if (p.clip && !inBox && (vx < p.clip.x || vx > p.clip.x + p.clip.w || vy < p.clip.y || vy > p.clip.y + p.clip.h)) return;
      if (!inBox && !inside(p, vx, vy)) return;
      const d = Math.hypot(vx - cx, vy - cy);
      if (d < bestD) { bestD = d; best = code; }
    });
    if (best) return best;
    let near = null, nearD = 12 / pxPerUnit;
    codes.forEach((code) => {
      const p = P[code];
      const [lx, ly] = toLocal(p, vx, vy);
      p.rings.forEach((r) => {
        const d = edgeDist(lx, ly, r) * p.xf.s;
        if (d < nearD) { nearD = d; near = code; }
      });
    });
    return near;
  }

  return { P, init, ringPath, rayHit, toView, centerView, inside, hitTest, inRing };
})();

const Pyoko = (() => {
  const INK = '#3b2f2a';

  // 1ぴき ぶん の <g>（県 の もとの 座標 の まま）。mood: sleep / normal / smile / genki / happy / wow
  function body(code, mood, opts) {
    const o = opts || {};
    const p = Geo.P[code];
    const b = p.mainBox;
    const m = Math.sqrt(b.w * b.h);
    const [cx, cy] = p.center;
    const u = Math.max(m * 0.13, Math.min(p.innerR * 0.92, m * 0.3));
    const L = m * 0.26;
    const sw = m * 0.038;
    const happy = mood === 'happy' || mood === 'genki';
    let s = '';

    // あし
    [[-0.3, 1], [0.3, 1]].forEach(([dx, dy]) => {
      const [ex, ey] = Geo.rayHit(p.main, cx, cy, dx, dy);
      const fy = ey + L * 0.75;
      s += `<path d="M${ex.toFixed(1)},${(ey - sw).toFixed(1)} L${ex.toFixed(1)},${fy.toFixed(1)}" stroke="${INK}" stroke-width="${(sw * 1.3).toFixed(2)}" stroke-linecap="round" fill="none"/>`;
      s += `<ellipse cx="${(ex + (dx < 0 ? -1 : 1) * L * 0.12).toFixed(1)}" cy="${fy.toFixed(1)}" rx="${(L * 0.28).toFixed(1)}" ry="${(L * 0.15).toFixed(1)}" fill="${INK}"/>`;
    });
    // うで（うれしい とき は 上 に あげる）
    [-1, 1].forEach((side) => {
      const [ex, ey] = Geo.rayHit(p.main, cx, cy, side, 0.15);
      const ang = happy ? -0.75 : o.wave ? -0.35 : 0.45;
      const hx = ex + side * L * Math.cos(ang), hy = ey + L * Math.sin(ang);
      s += `<path d="M${(ex - side * sw).toFixed(1)},${ey.toFixed(1)} L${hx.toFixed(1)},${hy.toFixed(1)}" stroke="${INK}" stroke-width="${(sw * 1.2).toFixed(2)}" stroke-linecap="round" fill="none"/>`;
      s += `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${(L * 0.17).toFixed(1)}" fill="#fff" stroke="${INK}" stroke-width="${(sw * 0.7).toFixed(2)}"/>`;
    });
    // からだ（県 の かたち）
    s += `<path d="${Geo.ringPath(p.main)}" fill="${o.fill || p.color}" stroke="${INK}" stroke-width="${sw.toFixed(2)}" stroke-linejoin="round"/>`;
    // かお
    s += face(cx, cy, u, mood);
    if (mood === 'genki') {
      [[-1.25, -0.9], [1.3, -0.75]].forEach(([dx, dy]) => { s += sparkle(cx + dx * u, cy + dy * u, u * 0.3); });
    }
    return `<g class="pyoko-body">${s}</g>`;
  }

  function sparkle(x, y, r) {
    return `<path d="M${x},${y - r} Q${x},${y} ${x + r},${y} Q${x},${y} ${x},${y + r} Q${x},${y} ${x - r},${y} Q${x},${y} ${x},${y - r}z" fill="#fff59d" stroke="#f59f00" stroke-width="${(r * 0.15).toFixed(2)}"/>`;
  }

  function face(cx, cy, u, mood) {
    const f = (v) => v.toFixed(1);
    const ex = u * 0.42, ey = cy - u * 0.14, lw = u * 0.11;
    let s = '';
    if (mood !== 'sleep') {
      s += `<ellipse cx="${f(cx - u * 0.72)}" cy="${f(cy + u * 0.2)}" rx="${f(u * 0.17)}" ry="${f(u * 0.1)}" fill="#ff8fab" opacity=".7"/>`;
      s += `<ellipse cx="${f(cx + u * 0.72)}" cy="${f(cy + u * 0.2)}" rx="${f(u * 0.17)}" ry="${f(u * 0.1)}" fill="#ff8fab" opacity=".7"/>`;
    }
    [-1, 1].forEach((sd) => {
      const x = cx + sd * ex;
      if (mood === 'sleep') {
        s += `<path d="M${f(x - u * 0.15)},${f(ey)} Q${f(x)},${f(ey + u * 0.12)} ${f(x + u * 0.15)},${f(ey)}" stroke="${INK}" stroke-width="${f(lw)}" fill="none" stroke-linecap="round"/>`;
      } else if (mood === 'happy') {
        s += `<path d="M${f(x - u * 0.16)},${f(ey + u * 0.04)} Q${f(x)},${f(ey - u * 0.18)} ${f(x + u * 0.16)},${f(ey + u * 0.04)}" stroke="${INK}" stroke-width="${f(lw)}" fill="none" stroke-linecap="round"/>`;
      } else {
        const r = mood === 'wow' ? u * 0.17 : mood === 'genki' ? u * 0.18 : u * 0.14;
        s += `<ellipse cx="${f(x)}" cy="${f(ey)}" rx="${f(r * 0.85)}" ry="${f(r)}" fill="${INK}"/>`;
        s += `<circle cx="${f(x - r * 0.3)}" cy="${f(ey - r * 0.35)}" r="${f(r * 0.32)}" fill="#fff"/>`;
        if (mood === 'genki') s += `<circle cx="${f(x + r * 0.3)}" cy="${f(ey + r * 0.35)}" r="${f(r * 0.16)}" fill="#fff"/>`;
      }
    });
    const my = cy + u * 0.3;
    if (mood === 'sleep') {
      s += `<ellipse cx="${f(cx)}" cy="${f(my)}" rx="${f(u * 0.08)}" ry="${f(u * 0.07)}" fill="${INK}"/>`;
    } else if (mood === 'wow') {
      s += `<ellipse cx="${f(cx)}" cy="${f(my + u * 0.02)}" rx="${f(u * 0.12)}" ry="${f(u * 0.15)}" fill="#c92a2a" stroke="${INK}" stroke-width="${f(lw * 0.7)}"/>`;
    } else if (mood === 'genki' || mood === 'happy') {
      s += `<path d="M${f(cx - u * 0.26)},${f(my - u * 0.06)} Q${f(cx)},${f(my - u * 0.1)} ${f(cx + u * 0.26)},${f(my - u * 0.06)} Q${f(cx + u * 0.2)},${f(my + u * 0.3)} ${f(cx)},${f(my + u * 0.3)} Q${f(cx - u * 0.2)},${f(my + u * 0.3)} ${f(cx - u * 0.26)},${f(my - u * 0.06)}z" fill="#c92a2a" stroke="${INK}" stroke-width="${f(lw * 0.7)}" stroke-linejoin="round"/>`;
      s += `<ellipse cx="${f(cx)}" cy="${f(my + u * 0.2)}" rx="${f(u * 0.11)}" ry="${f(u * 0.06)}" fill="#ff8787"/>`;
    } else {
      const w = mood === 'smile' ? u * 0.24 : u * 0.16;
      const d = mood === 'smile' ? u * 0.2 : u * 0.12;
      s += `<path d="M${f(cx - w)},${f(my - u * 0.04)} Q${f(cx)},${f(my - u * 0.04 + d)} ${f(cx + w)},${f(my - u * 0.04)}" stroke="${INK}" stroke-width="${f(lw)}" fill="none" stroke-linecap="round"/>`;
    }
    return s;
  }

  // ひとり で 立つ ぴょこ の <svg>（ずかん・ダンス・タイトル 用）
  function svg(code, mood, opts) {
    const p = Geo.P[code];
    const b = p.mainBox;
    const m = Math.sqrt(b.w * b.h);
    const L = m * 0.26;
    const side = Math.max(b.w + L * 2.6, b.h + L * 1.8);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2 + L * 0.35;
    const vb = [cx - side / 2, cy - side / 2, side, side].map((v) => v.toFixed(1)).join(' ');
    return `<svg class="pyoko-svg" viewBox="${vb}" aria-hidden="true">${body(code, mood, opts)}</svg>`;
  }

  // おぼえ度（★）と その とき の 気分 から 表情 を きめる
  function moodFor(stars) {
    return ['sleep', 'normal', 'smile', 'genki'][Math.max(0, Math.min(3, stars | 0))];
  }

  return { body, svg, moodFor };
})();
