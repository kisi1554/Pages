'use strict';
/* =========================================================
   solids.js … 立体のデータ・てんかい・切断
   ========================================================= */

/* ---------- 凸包（点の あつまり → 面） ---------- */
function hullFaces(P) {
  const faces = [], seen = new Set(), n = P.length, eps = 1e-6;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    let nn = V3.cross(V3.sub(P[j], P[i]), V3.sub(P[k], P[i]));
    const L = V3.len(nn); if (L < 1e-9) continue;
    nn = V3.mul(nn, 1 / L); let d = V3.dot(nn, P[i]);
    let pos = 0, neg = 0;
    for (let m = 0; m < n; m++) {
      const s = V3.dot(nn, P[m]) - d;
      if (s > eps) pos++; else if (s < -eps) neg++;
      if (pos && neg) break;
    }
    if (pos && neg) continue;
    if (pos) { nn = V3.mul(nn, -1); d = -d; }
    const key = nn.map(v => Math.round(v * 1000)).join(',') + ',' + Math.round(d * 1000);
    if (seen.has(key)) continue; seen.add(key);
    const idx = [];
    for (let m = 0; m < n; m++) if (Math.abs(V3.dot(nn, P[m]) - d) < 1e-5) idx.push(m);
    const c = centroid(idx.map(m => P[m]));
    const u = V3.norm(V3.sub(P[idx[0]], c)), w = V3.cross(nn, u);
    const ang = m => { const v = V3.sub(P[m], c); return Math.atan2(V3.dot(v, w), V3.dot(v, u)); };
    idx.sort((a, b) => ang(a) - ang(b));
    faces.push({ idx, n: nn });
  }
  return faces;
}
const FACE_COLS = ['#ff8a80', '#ffd166', '#80deea', '#a5d6a7', '#b39ddb', '#ffab91', '#90caf9', '#f48fb1', '#c5e1a5', '#ffe082', '#80cbc4', '#ce93d8',
  '#ef9a9a', '#fff59d', '#81d4fa', '#aed581', '#9fa8da', '#ffcc80', '#4dd0e1', '#f8bbd0'];
function meshFromPoints(P, colorFn) {
  const F = hullFaces(P);
  return {
    polys: F.map((f, i) => ({ p: f.idx.map(k => P[k].slice()), g: i })),
    groups: F.map((f, i) => colorFn ? colorFn(f.n, i) : { col: FACE_COLS[i % FACE_COLS.length], role: '' }),
  };
}
function ring(n, r, y, off = 0) {
  return [...Array(n)].map((_, i) => { const a = off + i * 2 * Math.PI / n; return [r * Math.cos(a), y, r * Math.sin(a)]; });
}
function fixOrient(mesh) {
  const c = centroid(mesh.polys.flatMap(p => p.p));
  for (const poly of mesh.polys) if (V3.dot(newell(poly.p), V3.sub(centroid(poly.p), c)) < 0) poly.p.reverse();
  return mesh;
}
const roleCol = (base, sides) => (n, i) => {
  if (n[1] > 0.99) return { col: base, role: 'top' };
  if (n[1] < -0.99) return { col: base, role: 'bottom' };
  return { col: sides[i % sides.length], role: 'side' };
};
const SIDE_COLS = ['#81d4fa', '#a5d6a7', '#f48fb1', '#b39ddb', '#ffab91', '#80cbc4'];

/* ---------- いろいろな立体 ---------- */
function cubeMesh(s = 1) {
  const P = []; for (const x of [-s, s]) for (const y of [-s, s]) for (const z of [-s, s]) P.push([x, y, z]);
  return meshFromPoints(P, (n, i) => ({ col: ['#ff8a80', '#ffd166', '#80deea', '#a5d6a7', '#b39ddb', '#ffab91'][i % 6], role: '' }));
}
function boxMesh(a = 1.5, b = 0.8, c = 1) {
  const P = []; for (const x of [-a, a]) for (const y of [-b, b]) for (const z of [-c, c]) P.push([x, y, z]);
  return meshFromPoints(P, n => {
    const ax = Math.abs(n[0]) > 0.9 ? 0 : Math.abs(n[1]) > 0.9 ? 1 : 2;
    return { col: ['#ffab91', '#ffd166', '#90caf9'][ax], role: '' };
  });
}
function prismMesh(n, r = 1.15, h = 2, off = -Math.PI / 2) {
  const P = [...ring(n, r, -h / 2, off), ...ring(n, r, h / 2, off)];
  return meshFromPoints(P, roleCol('#ffd166', SIDE_COLS));
}
function pyramidMesh(n, r = 1.25, h = 2, off = -Math.PI / 2) {
  const P = [...ring(n, r, -h / 2, off), [0, h / 2, 0]];
  return meshFromPoints(P, roleCol('#ffd166', SIDE_COLS));
}
function octaMesh(s = 1.45) {
  const P = [[s, 0, 0], [-s, 0, 0], [0, s, 0], [0, -s, 0], [0, 0, s], [0, 0, -s]];
  return meshFromPoints(alignDown(P, hullFaces(P)[0].n));
}
function icosaPts(s) {
  const f = (1 + Math.sqrt(5)) / 2, P = [];
  for (const a of [-1, 1]) for (const b of [-f, f]) { P.push([0, a, b], [a, b, 0], [b, 0, a]); }
  const L = V3.len(P[0]); return P.map(p => V3.mul(p, s / L));
}
function icosaMesh(s = 1.45) {
  // 1つの面が 真下に くるように まわす
  let P = icosaPts(s);
  const F = hullFaces(P), n0 = F[0].n;
  P = alignDown(P, n0);
  return meshFromPoints(P);
}
function dodecaMesh(s = 1.45) {
  const f = (1 + Math.sqrt(5)) / 2, g = 1 / f, P = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) P.push([x, y, z]);
  for (const a of [-1, 1]) for (const b of [-1, 1]) { P.push([0, a * g, b * f], [a * g, b * f, 0], [b * f, 0, a * g]); }
  const L = V3.len(P[0]);
  let Q = P.map(p => V3.mul(p, s / L));
  Q = alignDown(Q, hullFaces(Q)[0].n);
  return meshFromPoints(Q);
}
function alignDown(P, n) {
  // n を (0,-1,0) に あわせる回転
  const t = [0, -1, 0], ax = V3.cross(n, t), s = V3.len(ax), c = V3.dot(n, t);
  if (s < 1e-9) return P;
  const M = M3.axis(V3.mul(ax, 1 / s), Math.atan2(s, c));
  return P.map(p => M3.ap(M, p));
}
function cylinderMesh(n = 40, r = 1.05, h = 2.1) {
  const B = ring(n, r, -h / 2), T = ring(n, r, h / 2);
  const polys = [{ p: B.slice(), g: 0 }, { p: T.slice(), g: 1 }];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; polys.push({ p: [B[i], B[j], T[j], T[i]], g: 2 }); }
  return fixOrient({ polys, groups: [{ col: '#ffd166', role: 'bottom' }, { col: '#ffd166', role: 'top' }, { col: '#81d4fa', role: 'curve' }] });
}
function coneMesh(n = 40, r = 1.2, h = 2.2) {
  const B = ring(n, r, -h / 2), A = [0, h / 2, 0];
  const polys = [{ p: B.slice(), g: 0 }];
  for (let i = 0; i < n; i++) polys.push({ p: [B[i], B[(i + 1) % n], A], g: 1 });
  const m = fixOrient({ polys, groups: [{ col: '#ffd166', role: 'bottom' }, { col: '#f48fb1', role: 'curve' }] });
  m.extraVerts = [A];
  return m;
}
function sphereMesh(r = 1.35, nLat = 14, nLon = 28) {
  const pt = (i, j) => {
    const th = Math.PI * i / nLat, ph = 2 * Math.PI * j / nLon;
    return [r * Math.sin(th) * Math.cos(ph), r * Math.cos(th), r * Math.sin(th) * Math.sin(ph)];
  };
  const G = [];
  for (let i = 0; i <= nLat; i++) { G.push([]); for (let j = 0; j < nLon; j++) G[i].push(i === 0 ? [0, r, 0] : i === nLat ? [0, -r, 0] : pt(i, j)); }
  const polys = [];
  for (let i = 0; i < nLat; i++) for (let j = 0; j < nLon; j++) {
    const j2 = (j + 1) % nLon;
    if (i === 0) polys.push({ p: [G[0][0], G[1][j], G[1][j2]], g: 0 });
    else if (i === nLat - 1) polys.push({ p: [G[i][j], G[nLat][0], G[i][j2]], g: 0 });
    else polys.push({ p: [G[i][j], G[i + 1][j], G[i + 1][j2], G[i][j2]], g: 0 });
  }
  return fixOrient({ polys, groups: [{ col: '#90caf9', role: 'curve' }] });
}

/* ---------- 面のつながりを しらべる ---------- */
const keyP = p => Math.round(p[0] * 1e4) + ',' + Math.round(p[1] * 1e4) + ',' + Math.round(p[2] * 1e4);
function prepMesh(mesh) {
  const map = new Map(), polys = mesh.polys;
  polys.forEach((poly, pi) => {
    const n = poly.p.length; poly.nb = new Array(n).fill(-1);
    poly.p.forEach((a, i) => map.set(keyP(a) + '|' + keyP(poly.p[(i + 1) % n]), pi));
  });
  polys.forEach(poly => {
    const n = poly.p.length;
    poly.p.forEach((a, i) => { const m = map.get(keyP(poly.p[(i + 1) % n]) + '|' + keyP(a)); if (m != null) poly.nb[i] = m; });
    poly.hard = poly.nb.map(nb => nb < 0 || polys[nb].g !== poly.g);
  });
  // ほんとうの辺・頂点
  const edges = [], ek = new Map(), deg = new Map(), vpos = new Map();
  polys.forEach((poly, pi) => {
    const n = poly.p.length;
    for (let i = 0; i < n; i++) {
      if (!poly.hard[i]) continue;
      const a = poly.p[i], b = poly.p[(i + 1) % n], ka = keyP(a), kb = keyP(b);
      const k = ka < kb ? ka + '|' + kb : kb + '|' + ka;
      if (ek.has(k)) { edges[ek.get(k)].f.push(pi); continue; }
      ek.set(k, edges.length); edges.push({ a, b, f: [pi] });
      for (const [kk, pp] of [[ka, a], [kb, b]]) { deg.set(kk, (deg.get(kk) || 0) + 1); vpos.set(kk, pp); }
    }
  });
  const verts = [];
  for (const [k, d] of deg) if (d >= 3) verts.push({ p: vpos.get(k), k });
  for (const p of (mesh.extraVerts || [])) verts.push({ p, k: keyP(p) });
  // 頂点 → 面
  const vf = new Map();
  polys.forEach((poly, pi) => poly.p.forEach(p => { const k = keyP(p); if (!vf.has(k)) vf.set(k, []); vf.get(k).push(pi); }));
  verts.forEach(v => { v.f = vf.get(v.k) || []; });
  mesh.edges = edges; mesh.verts = verts;
  mesh.groupCount = new Set(polys.map(p => p.g)).size;
  // 大きさ
  let r = 0; const c = centroid(polys.flatMap(p => p.p));
  polys.forEach(p => p.p.forEach(q => { r = Math.max(r, V3.dist(q, c)); }));
  mesh.radius = r; mesh.center = c;
  return mesh;
}

/* ---------- てんかいず ---------- */
function unfoldPlan(mesh, root, random) {
  const polys = mesh.polys, N = polys.length;
  const parent = new Array(N).fill(-1), hinge = new Array(N), ang = new Array(N).fill(0);
  const seen = new Uint8Array(N), order = [root]; seen[root] = 1;
  const add = (q, i) => {
    const c = polys[q].nb[i]; if (c < 0 || seen[c]) return false;
    seen[c] = 1; parent[c] = q; const n = polys[q].p.length;
    hinge[c] = [polys[q].p[i], polys[q].p[(i + 1) % n]]; order.push(c); return true;
  };
  if (!random) {
    // おなじ まがった めんは さきに つなげる（円柱の そくめんが 1まいの 長方形に なるように）
    const soft = [root], hard = [];
    const visit = q => polys[q].nb.forEach((c, i) => {
      if (c < 0 || seen[c]) return;
      if (polys[c].g === polys[q].g) { if (add(q, i)) soft.push(c); } else hard.push([q, i]);
    });
    while (soft.length || hard.length) {
      if (soft.length) visit(soft.shift());
      else { const [q, i] = hard.shift(); if (add(q, i)) soft.push(order[order.length - 1]); }
    }
  } else {
    const fr = []; const push = q => polys[q].nb.forEach((_, i) => fr.push([q, i]));
    push(root);
    while (fr.length) {
      const k = rnd(fr.length), [q, i] = fr[k]; fr.splice(k, 1);
      if (add(q, i)) push(order[order.length - 1]);
    }
  }
  for (const c of order) {
    if (c === root) continue;
    const [a, b] = hinge[c], e = V3.norm(V3.sub(b, a));
    const nc = newell(polys[c].p), np = newell(polys[parent[c]].p);
    ang[c] = Math.atan2(V3.dot(e, V3.cross(nc, np)), V3.dot(nc, np));
  }
  return { root, order, parent, hinge, ang };
}
function unfoldAt(mesh, plan, t) {
  const T = new Array(mesh.polys.length);
  T[plan.root] = AF.I();
  for (const c of plan.order) {
    if (c === plan.root) continue;
    const [a, b] = plan.hinge[c];
    T[c] = AF.compose(T[plan.parent[c]], AF.aboutLine(a, V3.norm(V3.sub(b, a)), plan.ang[c] * t));
  }
  return mesh.polys.map((poly, i) => poly.p.map(p => AF.ap(T[i], p)));
}
function bottomPoly(mesh) {
  let best = 0, by = Infinity;
  mesh.polys.forEach((p, i) => { const y = centroid(p.p)[1] - (mesh.groupCount < mesh.polys.length ? 0 : 0); if (y < by) { by = y; best = i; } });
  return best;
}
function frontPoly(mesh, g) {
  let best = 0, bz = -Infinity;
  mesh.polys.forEach((p, i) => { if (g != null && p.g !== g) return; const n = newell(p.p); if (n[2] > bz) { bz = n[2]; best = i; } });
  return best;
}

/* ---------- 切断 ---------- */
function clipPoly(pts, n, d, sg) {
  const out = [], E = 1e-7;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const sa = sg * (V3.dot(n, a) - d), sb = sg * (V3.dot(n, b) - d);
    if (sa <= E) out.push(a);
    if ((sa < -E && sb > E) || (sa > E && sb < -E)) out.push(V3.lerp(a, b, sa / (sa - sb)));
  }
  const res = out.filter((p, i) => V3.dist(p, out[(i + 1) % out.length]) > 1e-6);
  return res.length >= 3 ? res : null;
}
function orderAround(pts, n) {
  const c = centroid(pts);
  const u = V3.norm(V3.sub(pts[0], c)), w = V3.cross(n, u);
  return pts.slice().sort((a, b) => {
    const va = V3.sub(a, c), vb = V3.sub(b, c);
    return Math.atan2(V3.dot(va, w), V3.dot(va, u)) - Math.atan2(V3.dot(vb, w), V3.dot(vb, u));
  });
}
function sectionOf(mesh, n, d) {
  const S = [], E = 1e-6;
  for (const poly of mesh.polys) {
    const m = poly.p.length;
    for (let i = 0; i < m; i++) {
      const a = poly.p[i], b = poly.p[(i + 1) % m];
      const sa = V3.dot(n, a) - d, sb = V3.dot(n, b) - d;
      if (Math.abs(sa) < E) S.push(a);
      if ((sa < -E && sb > E) || (sa > E && sb < -E)) S.push(V3.lerp(a, b, sa / (sa - sb)));
    }
  }
  const U = [];
  for (const p of S) if (!U.some(q => V3.dist(p, q) < 1e-5)) U.push(p);
  if (U.length < 3) return null;
  const o = orderAround(U, n);
  // 面積が ほとんど ない（かすっただけ）ときは なし
  let ar = 0; for (let i = 0; i < o.length; i++) ar += V3.dot(V3.cross(o[i], o[(i + 1) % o.length]), n);
  return Math.abs(ar) < 1e-4 ? null : o;
}
function cutMesh(mesh, n, d) {
  const sec = sectionOf(mesh, n, d);
  if (!sec) return null;
  const capG = mesh.groups.length;
  const groups = [...mesh.groups, { col: '#ff5a5f', role: 'cut' }];
  const side = sg => {
    const polys = [];
    for (const poly of mesh.polys) { const c = clipPoly(poly.p, n, d, sg); if (c) polys.push({ p: c, g: poly.g }); }
    polys.push({ p: sg > 0 ? sec.slice() : sec.slice().reverse(), g: capG });
    return prepMesh({ polys, groups });
  };
  // a … n の うしろがわ（s ≦ 0）、b … まえがわ
  return { a: side(1), b: side(-1), sec };
}

/* ---------- 立体の いちらん ---------- */
const SOLIDS = [
  { id: 'cube', name: R('立方体', 'りっぽうたい'), kana: 'りっぽうたい', make: () => cubeMesh(), randomNet: true,
    facts: ['どの ' + W.men + 'も ' + R('正方形', 'せいほうけい') + '。おなじ おおきさの めんが 6つ', 'さいころや ルービックキューブの かたち',
      R('体積', 'たいせき') + ' ＝ 1ぺん × 1ぺん × 1ぺん', W.tenkai + 'は ぜんぶで 11しゅるい！ 「べつの ひらきかた」で さがそう'] },
  { id: 'box', name: R('直方体', 'ちょくほうたい'), kana: 'ちょくほうたい', make: () => boxMesh(),
    facts: [W.men + 'は ' + R('長方形', 'ちょうほうけい') + '（' + R('正方形', 'せいほうけい') + 'が まじることも ある）', 'むかいあう 面は おなじ かたちで ' + W.heikou,
      R('体積', 'たいせき') + ' ＝ たて × よこ × たかさ', 'おなじ ながさの ' + W.hen + 'が 4ほんずつ 3くみ'] },
  { id: 'tri', name: R('三角柱', 'さんかくちゅう'), kana: 'さんかくちゅう', make: () => prismMesh(3),
    facts: ['うえと したの ' + W.teimen + 'は ' + R('三角形', 'さんかくけい') + '。2つは ' + W.heikou, W.sokumen + 'は ' + R('長方形', 'ちょうほうけい') + 'が 3まい',
      R('体積', 'たいせき') + ' ＝ ' + R('底面積', 'ていめんせき') + ' × たかさ', 'テントや チーズの かたち'] },
  { id: 'hex', name: R('六角柱', 'ろっかくちゅう'), kana: 'ろっかくちゅう', make: () => prismMesh(6, 1.15, 1.8, 0),
    facts: [W.teimen + 'は ' + R('六角形', 'ろっかくけい') + '、' + W.sokumen + 'は 6まい', 'えんぴつの かたち！',
      'N' + R('角柱', 'かくちゅう') + 'の めんの かず ＝ N ＋ 2'] },
  { id: 'cyl', name: R('円柱', 'えんちゅう'), kana: 'えんちゅう', make: () => cylinderMesh(), curved: true,
    note: { F: '3（たいら 2・まがった 1）', E: 'なし', V: 'なし' },
    facts: [W.teimen + 'は ' + R('円', 'えん') + 'が 2つ。' + W.sokumen + 'は まがった めん', 'ひらくと ' + W.sokumen + 'は ' + R('長方形', 'ちょうほうけい') + '。よこの ながさは ' + R('円周', 'えんしゅう') + 'と おなじ',
      R('体積', 'たいせき') + ' ＝ ' + R('半径', 'はんけい') + '×' + R('半径', 'はんけい') + '×3.14×たかさ', 'まがった せんは 「へん」とは いわないよ'] },
  { id: 'tetra', name: R('三角', 'さんかく') + 'すい', kana: 'さんかくすい', make: () => pyramidMesh(3, 1.3, 1.9),
    facts: [W.teimen + 'が 1つ と ' + R('三角形', 'さんかくけい') + 'の ' + W.sokumen + 'が 3つ', 'とがった ところも ' + W.chou,
      R('体積', 'たいせき') + ' ＝ ' + R('底面積', 'ていめんせき') + ' × たかさ ÷ 3', 'おなじ ' + W.teimen + '・たかさの ' + R('三角柱', 'さんかくちゅう') + 'の 3ぶんの1'] },
  { id: 'pyr', name: R('四角', 'しかく') + 'すい', kana: 'しかくすい', make: () => pyramidMesh(4, 1.35, 1.9, Math.PI / 4),
    facts: ['ピラミッドの かたち', W.teimen + 'は ' + R('四角形', 'しかくけい') + '、' + W.sokumen + 'は ' + R('三角形', 'さんかくけい') + 'が 4まい',
      R('体積', 'たいせき') + ' ＝ ' + R('底面積', 'ていめんせき') + ' × たかさ ÷ 3'] },
  { id: 'cone', name: R('円', 'えん') + 'すい', kana: 'えんすい', make: () => coneMesh(), curved: true,
    note: { F: '2（たいら 1・まがった 1）', E: 'なし', V: '1' },
    facts: ['ソフトクリームの コーンの かたち', 'ひらくと ' + W.sokumen + 'は ' + R('おうぎ形', 'おうぎがた'),
      R('体積', 'たいせき') + ' ＝ ' + R('底面積', 'ていめんせき') + ' × たかさ ÷ 3', 'とがった ところは ' + W.chou + 'と いうよ'] },
  { id: 'sph', name: R('球', 'きゅう'), kana: 'きゅう', make: () => sphereMesh(), curved: true, noNet: true,
    note: { F: '1（まがった めん）', E: 'なし', V: 'なし' },
    facts: ['どこから みても ' + R('円', 'えん') + 'に みえる', 'どこを きっても きりくちは ' + R('円', 'えん') + '（「きる」で ためそう）',
      'まんなかで きると いちばん おおきな ' + R('円', 'えん'), 'ひらいて たいらには できないよ'] },
  { id: 'octa', name: R('正八面体', 'せいはちめんたい'), kana: 'せいはちめんたい', make: () => octaMesh(), randomNet: true,
    facts: [R('正三角形', 'せいさんかくけい') + 'が 8まい', '1つの ' + W.chou + 'に 4まいの めんが あつまる', R('四角', 'しかく') + 'すいを 2つ くっつけた かたち'] },
  { id: 'dode', name: R('正十二面体', 'せいじゅうにめんたい'), kana: 'せいじゅうにめんたい', make: () => dodecaMesh(), randomNet: true,
    facts: [R('正五角形', 'せいごかくけい') + 'が 12まい', '1つの ' + W.chou + 'に 3まいの めんが あつまる', 'カレンダーの かたちに つかわれることも'] },
  { id: 'ico', name: R('正二十面体', 'せいにじゅうめんたい'), kana: 'せいにじゅうめんたい', make: () => icosaMesh(), randomNet: true,
    facts: [R('正三角形', 'せいさんかくけい') + 'が 20まい', '1つの ' + W.chou + 'に 5まいの めんが あつまる', 'サッカーボールの もとに なった かたち'] },
];
const solidById = id => SOLIDS.find(s => s.id === id);
