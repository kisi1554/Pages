/* ============================================================
   きりがみ もよう — かたちの けいさん（ブラウザ と node の りょうほうで うごく）
   ------------------------------------------------------------
   ざひょう: ひらいた かみ の まんなか が (0,0)。y は うえむき。
   しかくの かみ は [-1,1]×[-1,1]、ゆき は はんけい 1 の 6かくけい。

   おる   = 「おりせん（げんてん を とおる ちょくせん）の かたがわ を はんたいがわへ うつす」を
            じゅんばんに くりかえす。おりおわった かたち（ドメイン）は 1まいぶん の かたち。
   きる   = ドメインの ざひょうで「きりとる かたち」を ためる（ポリゴン＋なぞった せんの おび）。
   ひらく = ひらいた かみ の 1てん p を おって ドメインの てん q に して、q が きられて いるか を みる。
            → 1か所 きると おりかたの まいすう ぶん（2/4/8/12か所）あく。
   ============================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.KG = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const rad = (d) => (d * Math.PI) / 180;
  const clean = (v) => (Math.abs(v) < 1e-12 ? 0 : v);

  const SQUARE = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const HEX = [0, 1, 2, 3, 4, 5].map((i) => [clean(Math.cos((i * Math.PI) / 3)), clean(Math.sin((i * Math.PI) / 3))]);

  // steps: おりせん の かくど（ど）。その せんより「かくどが ちいさい がわ」を のこして、はんたいがわを おりかえす。
  const DEFS = {
    half:    { id: "half",    name: "2つおり", shape: SQUARE, steps: [90],               sectors: 2,  viewRot: 0 },
    quarter: { id: "quarter", name: "4つおり", shape: SQUARE, steps: [90, 180],          sectors: 4,  viewRot: 0 },
    eighth:  { id: "eighth",  name: "8つおり", shape: SQUARE, steps: [90, 180, 45],      sectors: 8,  viewRot: 0 },
    snow:    { id: "snow",    name: "ゆき",    shape: HEX,    steps: [180, 120, 60, 30], sectors: 12, viewRot: rad(75) },
  };
  const FOLD_IDS = ["half", "quarter", "eighth", "snow"];

  // ---------- きほんの けいさん ----------
  function edgeHP(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    const n = [clean(-dy / l), clean(dx / l)];
    return { n, c: n[0] * a[0] + n[1] * a[1] };
  }
  function foldHP(deg) {
    const a = rad(deg);
    return { n: [clean(Math.sin(a)), clean(-Math.cos(a))], c: 0 };
  }
  // はんめん n·p >= c の がわ だけ のこす（Sutherland–Hodgman を 1かい）
  function clipHP(poly, hp) {
    const out = [], n = hp.n, c = hp.c;
    for (let i = 0; i < poly.length; i++) {
      const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length];
      const dc = n[0] * cur[0] + n[1] * cur[1] - c, dp = n[0] * prev[0] + n[1] * prev[1] - c;
      if (dc >= -1e-12) {
        if (dp < -1e-12) out.push(lerpAt(prev, cur, dp, dc));
        out.push(cur);
      } else if (dp >= -1e-12) out.push(lerpAt(prev, cur, dp, dc));
    }
    return dedupe(out, 1e-9, true);
  }
  function lerpAt(a, b, da, db) {
    const t = da / (da - db);
    return [clean(a[0] + (b[0] - a[0]) * t), clean(a[1] + (b[1] - a[1]) * t)];
  }
  function dedupe(pts, eps, closed) {
    const out = [];
    for (const p of pts) {
      const q = out[out.length - 1];
      if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > eps) out.push(p);
    }
    if (closed && out.length > 1) {
      const a = out[0], b = out[out.length - 1];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= eps) out.pop();
    }
    return out;
  }
  function area(poly) {
    let s = 0;
    for (let i = 0, n = poly.length; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  }
  function polylineLength(pts) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return s;
  }
  // ぬりつぶしと おなじ「nonzero」で なかか どうか
  function inPoly(x, y, poly) {
    let wn = 0;
    for (let i = 0, n = poly.length; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      const cross = (b[0] - a[0]) * (y - a[1]) - (x - a[0]) * (b[1] - a[1]);
      if (a[1] <= y) { if (b[1] > y && cross > 0) wn++; }
      else if (b[1] <= y && cross < 0) wn--;
    }
    return wn !== 0;
  }
  function segDist2(x, y, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    let t = l2 ? ((x - a[0]) * dx + (y - a[1]) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = a[0] + dx * t - x, ey = a[1] + dy * t - y;
    return ex * ex + ey * ey;
  }
  function nearLine(x, y, pts, r) {
    const r2 = r * r;
    if (pts.length === 1) return segDist2(x, y, pts[0], pts[0]) <= r2;
    for (let i = 1; i < pts.length; i++) if (segDist2(x, y, pts[i - 1], pts[i]) <= r2) return true;
    return false;
  }
  // まがった せん を すくない てんに（Ramer–Douglas–Peucker）
  function simplify(pts, eps) {
    if (pts.length < 3) return pts.slice();
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]], e2 = eps * eps;
    while (stack.length) {
      const [i, j] = stack.pop();
      let best = -1, bi = -1;
      for (let k = i + 1; k < j; k++) {
        const d = segDist2(pts[k][0], pts[k][1], pts[i], pts[j]);
        if (d > best) { best = d; bi = k; }
      }
      if (best > e2) { keep[bi] = 1; stack.push([i, bi], [bi, j]); }
    }
    return pts.filter((_, i) => keep[i]);
  }

  // ---------- おりかた ごとの じゅんび ----------
  for (const id of FOLD_IDS) {
    const F = DEFS[id];
    F.shapeHP = F.shape.map((a, i) => edgeHP(a, F.shape[(i + 1) % F.shape.length]));
    F.foldHP = F.steps.map(foldHP);
    let dom = F.shape.map((p) => p.slice());
    for (const hp of F.foldHP) dom = clipHP(dom, hp);
    F.domain = dom;
    F.domainHP = dom.map((a, i) => edgeHP(a, dom[(i + 1) % dom.length]));
    const xs = dom.map((p) => p[0]), ys = dom.map((p) => p[1]);
    F.bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    F.L = Math.max(F.bbox[2] - F.bbox[0], F.bbox[3] - F.bbox[1]);
    F.w = 0.028 * F.L; // なぞり せん の おびの はば（ほそい せんでも きれる ように）
    // ドメインの へん のうち、おりせん の うえに ある もの = おりめ（わ）
    F.creases = [];
    F.edges = dom.map((a, i) => {
      const b = dom[(i + 1) % dom.length];
      const crease = F.foldHP.some((hp) => Math.abs(hp.n[0] * a[0] + hp.n[1] * a[1]) < 1e-9 && Math.abs(hp.n[0] * b[0] + hp.n[1] * b[1]) < 1e-9);
      if (crease) F.creases.push([a, b]);
      return { a, b, crease };
    });
    F.domainArea = Math.abs(area(dom));
  }

  const get = (fid) => {
    const F = DEFS[fid];
    if (!F) throw new Error("しらない おりかた: " + fid);
    return F;
  };
  // k かい おった あと の かみ の はんい（はんめんの あつまり）
  function regionHP(fid, k) {
    const F = get(fid);
    return F.shapeHP.concat(F.foldHP.slice(0, k));
  }
  // k かい おった じょうたい の てん p を、のこりを ぜんぶ おって ドメインへ
  function foldFrom(fid, k, p) {
    const F = get(fid);
    let x = p[0], y = p[1];
    for (let i = k; i < F.foldHP.length; i++) {
      const n = F.foldHP[i].n, d = n[0] * x + n[1] * y;
      if (d < 0) { x -= 2 * d * n[0]; y -= 2 * d * n[1]; }
    }
    return [x, y];
  }
  const foldPoint = (fid, p) => foldFrom(fid, 0, p);
  // はんめんの あつまり の なかへの きょり（なか が +）
  function hpDist(hps, x, y) {
    let d = Infinity;
    for (const h of hps) {
      const v = h.n[0] * x + h.n[1] * y - h.c;
      if (v < d) d = v;
    }
    return d;
  }
  const domainDist = (fid, p) => hpDist(get(fid).domainHP, p[0], p[1]);
  const inShape = (fid, p) => hpDist(get(fid).shapeHP, p[0], p[1]) >= 0;

  // ドメインの ふち で いちばん ちかい てん と、ふち に そった いち t
  function nearestOnBoundary(poly, p) {
    let best = null, acc = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (len * len);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const q = [a[0] + dx * t, a[1] + dy * t];
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (!best || d < best.d) best = { pt: q, t: acc + len * t, d };
      acc += len;
    }
    best.P = acc;
    return best;
  }
  // ふち に そって tFrom から tTo へ すすむ ときに とおる かど（dir=+1 まえむき / -1 うしろむき）
  function boundaryArc(poly, tFrom, tTo, dir) {
    const cum = [];
    let acc = 0;
    for (let i = 0; i < poly.length; i++) {
      cum.push(acc);
      const a = poly[i], b = poly[(i + 1) % poly.length];
      acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    const P = acc, mod = (v) => ((v % P) + P) % P;
    const fwd = mod(tTo - tFrom);
    const span = dir > 0 ? fwd : P - fwd;
    const list = [];
    for (let i = 0; i < poly.length; i++) {
      const d = dir > 0 ? mod(cum[i] - tFrom) : mod(tFrom - cum[i]);
      if (d > 1e-9 && d < span - 1e-9) list.push([d, poly[i]]);
    }
    list.sort((a, b) => a[0] - b[0]);
    return list.map((x) => x[1]);
  }

  /* なぞった せん（ドメインの ざひょう）→ きりとり
     - ふち から ふち へ: せん と ふち で わけた 2つ の うち、ちいさい ほう を きりとる
     - はじめ と おわり が ちかい（とじた せん）: その なか を きりとる
     - それ いがい: せん の おび だけ（きりこみ）
     どれでも、なぞった せん そのもの も はば w の おび として きりとる。 */
  function makeCut(fid, ptsIn, opt) {
    const F = get(fid);
    opt = opt || {};
    const w = opt.w != null ? opt.w : F.w;
    const edgeTol = opt.edgeTol != null ? opt.edgeTol : 0.03 * F.L;
    const closeTol = opt.closeTol != null ? opt.closeTol : 0.08 * F.L;
    const pts = dedupe(ptsIn.map((p) => [p[0], p[1]]), 1e-5, false);
    if (pts.length < 2) return null;
    const len = polylineLength(pts);
    if (len < 0.02 * F.L) return null;
    const s = pts[0], e = pts[pts.length - 1];
    let poly = null, kind = "slit";
    if (domainDist(fid, s) < edgeTol && domainDist(fid, e) < edgeTol) {
      const E = nearestOnBoundary(F.domain, s), X = nearestOnBoundary(F.domain, e);
      const mid = pts.map((p) => (domainDist(fid, p) >= 0 ? p : nearestOnBoundary(F.domain, p).pt));
      const path = [E.pt].concat(mid, [X.pt]);
      const A = path.concat(boundaryArc(F.domain, X.t, E.t, +1));
      const B = path.concat(boundaryArc(F.domain, X.t, E.t, -1));
      const aA = Math.abs(area(A)), aB = Math.abs(area(B));
      if (Math.min(aA, aB) > 1e-5 * F.L * F.L) { poly = aA <= aB ? A : B; kind = "edge"; }
    } else if (Math.hypot(s[0] - e[0], s[1] - e[1]) < closeTol && len > 2.5 * closeTol) {
      poly = pts.slice();
      kind = "loop";
    }
    const eps = 0.0015 * F.L;
    return { k: kind, p: poly ? dedupe(simplify(poly, eps), 1e-6, true) : null, l: simplify(pts, eps), w };
  }

  // はやく しらべる ための はこ を つける
  function prep(cuts) {
    return cuts.map((c) => {
      const r = c.w / 2;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const p of c.l) { x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r); }
      if (c.p) for (const p of c.p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      return { p: c.p, l: c.l, r, bb: [x0, y0, x1, y1] };
    });
  }
  function inCuts(x, y, pc) {
    for (const c of pc) {
      const b = c.bb;
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      if (c.p && inPoly(x, y, c.p)) return true;
      if (nearLine(x, y, c.l, c.r)) return true;
    }
    return false;
  }

  // ドメインで ラスタ化して くらべる。ひらいた もよう は ドメインの コピー なので、
  // ひらいた かみ で くらべても ドメインで くらべても IoU は おなじ に なる。
  function iou(fid, cutsA, cutsB, N) {
    const F = get(fid);
    N = N || 200;
    const A = prep(cutsA), B = prep(cutsB), step = F.L / N;
    let inter = 0, uni = 0;
    for (let y = F.bbox[1] + step / 2; y < F.bbox[3]; y += step) {
      for (let x = F.bbox[0] + step / 2; x < F.bbox[2]; x += step) {
        if (hpDist(F.domainHP, x, y) < 0) continue;
        const a = inCuts(x, y, A), b = inCuts(x, y, B);
        if (a && b) inter++;
        if (a || b) uni++;
      }
    }
    return uni ? inter / uni : 1;
  }
  // ひらいた かみ を N×N で: 0=かみ の そと, 1=かみ, 2=あな
  function rasterUnfolded(fid, cuts, N) {
    const pc = prep(cuts), out = new Uint8Array(N * N), F = get(fid);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = -1 + ((i + 0.5) * 2) / N, y = 1 - ((j + 0.5) * 2) / N;
      if (hpDist(F.shapeHP, x, y) < 0) continue;
      const q = foldPoint(fid, [x, y]);
      out[j * N + i] = inCuts(q[0], q[1], pc) ? 2 : 1;
    }
    return out;
  }
  // つながった あな の かず（4きんぼう）
  function countRegions(r, N, v) {
    const seen = new Uint8Array(N * N);
    let count = 0;
    for (let s = 0; s < N * N; s++) {
      if (r[s] !== v || seen[s]) continue;
      count++;
      const st = [s];
      seen[s] = 1;
      while (st.length) {
        const i = st.pop(), x = i % N, y = (i / N) | 0;
        const nb = [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, y > 0 ? i - N : -1, y < N - 1 ? i + N : -1];
        for (const j of nb) if (j >= 0 && !seen[j] && r[j] === v) { seen[j] = 1; st.push(j); }
      }
    }
    return count;
  }

  /* k かい おった じょうたい の かみ を、せかいの ざひょう [-E,E]² の S×S がぞう に かく。
     sample(qx,qy) は ドメインの てん が かみ として のこっている わりあい（0..1）。
     k=0（ぜんぶ ひらいた）のときは おりめ を うすく かく。 */
  function renderStage(fid, k, sample, rgb, S, E, data) {
    const F = get(fid);
    const hps = regionHP(fid, k), nh = hps.length;
    const hn = hps.map((h) => h.n), hc = hps.map((h) => h.c);
    const fn = F.foldHP.slice(k).map((h) => h.n), nf = fn.length;
    const cr = k === 0 ? F.creases : [];
    const px = (2 * E) / S, crW = px * 1.3;
    for (let j = 0; j < S; j++) {
      const y0 = E - (j + 0.5) * px;
      for (let i = 0; i < S; i++) {
        const x0 = -E + (i + 0.5) * px;
        let d = Infinity;
        for (let h = 0; h < nh; h++) {
          const v = hn[h][0] * x0 + hn[h][1] * y0 - hc[h];
          if (v < d) { d = v; if (d <= -px) break; }
        }
        if (d <= -px / 2) continue;
        const cov = d >= px / 2 ? 1 : d / px + 0.5;
        let x = x0, y = y0;
        for (let f = 0; f < nf; f++) {
          const n = fn[f], dd = n[0] * x + n[1] * y;
          if (dd < 0) { x -= 2 * dd * n[0]; y -= 2 * dd * n[1]; }
        }
        const a = cov * sample(x, y);
        if (a <= 0.003) continue;
        let shade = 1;
        for (let c = 0; c < cr.length; c++) {
          const dc = Math.sqrt(segDist2(x, y, cr[c][0], cr[c][1]));
          if (dc < crW) shade = Math.min(shade, 1 - 0.13 * (1 - dc / crW));
        }
        const o = (j * S + i) * 4;
        data[o] = rgb[0] * shade; data[o + 1] = rgb[1] * shade; data[o + 2] = rgb[2] * shade; data[o + 3] = a * 255;
      }
    }
    return data;
  }

  // ---------- ほぞん（すうじ を まるめて ちいさく）----------
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const packPts = (pts) => pts.map((p) => [r3(p[0]), r3(p[1])]);
  function packCuts(cuts) {
    return cuts.map((c) => ({ k: c.k, p: c.p ? packPts(c.p) : null, l: packPts(c.l), w: r3(c.w) }));
  }
  function unpackCuts(data) {
    if (!Array.isArray(data)) return [];
    const okPts = (a) => Array.isArray(a) && a.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite));
    return data.filter((c) => c && okPts(c.l) && c.l.length && (c.p == null || okPts(c.p)) && Number.isFinite(c.w))
      .map((c) => ({ k: c.k || "slit", p: c.p || null, l: c.l, w: c.w }));
  }

  return {
    DEFS, FOLD_IDS, get, regionHP, foldFrom, foldPoint, domainDist, inShape, hpDist,
    clipHP, area, inPoly, simplify, polylineLength, nearestOnBoundary,
    makeCut, prep, inCuts, iou, rasterUnfolded, countRegions, renderStage, packCuts, unpackCuts,
  };
});
