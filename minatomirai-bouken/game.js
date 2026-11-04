'use strict';
/* あおちゃんの みなとみらい だいぼうけん（あおちゃん は 5さいの おとこのこ）
   WebGL だけで かいた 3D の たんけん ゲーム（がいぶ ライブラリ なし）
   せかいは ぜんぶ 「じくに そった はこ（AABB）」で できていて、
   その はこが そのまま あたりはんてい・よじのぼれる かべ に なる。 */
(function () {
  const $ = (id) => document.getElementById(id);
  const cv = $('cv');
  const gl = cv.getContext('webgl', { antialias: true }) || cv.getContext('experimental-webgl');
  if (!gl) { $('nogl').hidden = false; return; }

  // ================= セーブ =================
  const SAVE_KEY = 'minatomirai-bouken-v2'; // v2: ほんものの ちず（ふるい いち は つかわない）
  function fresh() { return { stars: [], stamps: [], oni: 2, pos: null, sound: true, seenTitle: false, wallet: { 1000: 5 }, items: [], gacha: {} }; }
  let save = fresh();
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s === 'object') save = Object.assign(fresh(), s); } catch (e) { /* つかえない */ }
  function store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* つかえない */ } }

  // ================= すうがく =================
  function I() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
  function mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  function T(x, y, z) { const m = I(); m[12] = x; m[13] = y; m[14] = z; return m; }
  function S(x, y, z) { const m = I(); m[0] = x; m[5] = y === undefined ? x : y; m[10] = z === undefined ? x : z; return m; }
  function RY(a) { const m = I(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
  function RX(a) { const m = I(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
  function RZ(a) { const m = I(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
  function M() { let m = arguments[0]; for (let i = 1; i < arguments.length; i++) m = mul(m, arguments[i]); return m; }
  function persp(fy, asp, n, f) {
    const t = 1 / Math.tan(fy / 2), m = new Float32Array(16);
    m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m;
  }
  function lookAt(e, t) {
    let zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2]; let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = zz, xy = 0, xz = -zx; l = Math.hypot(xx, xz) || 1; xx /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    const m = new Float32Array(16);
    m[0] = xx; m[4] = xy; m[8] = xz; m[1] = yx; m[5] = yy; m[9] = yz; m[2] = zx; m[6] = zy; m[10] = zz;
    m[12] = -(xx * e[0] + xy * e[1] + xz * e[2]); m[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
    m[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); m[15] = 1; return m;
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  // ================= シェーダ =================
  const VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aCol; attribute float aKind;
uniform mat4 uProj, uView, uModel; uniform vec3 uTint;
varying vec3 vCol; varying vec3 vNor; varying vec3 vW; varying float vKind;
void main(){
  vec4 w = uModel * vec4(aPos, 1.0);
  vW = w.xyz; vNor = (uModel * vec4(aNor, 0.0)).xyz; vCol = aCol * uTint; vKind = aKind;
  gl_Position = uProj * uView * w;
}`;
  const FS = `
precision mediump float;
varying vec3 vCol; varying vec3 vNor; varying vec3 vW; varying float vKind;
uniform vec3 uSun; uniform vec3 uFog; uniform vec3 uCam; uniform float uTime; uniform float uEmit; uniform float uAlpha;
void main(){
  vec3 n = normalize(vNor); vec3 col = vCol;
  if (vKind > 0.5 && vKind < 1.5) {          // まど
    float side = 1.0 - abs(n.y);
    float wy = step(0.42, fract(vW.y * 0.9));
    float wx = step(0.3, fract((vW.x + vW.z) * 0.75));
    col = mix(col, vec3(0.32, 0.47, 0.62), wy * wx * side * 0.8);
  } else if (vKind > 1.5 && vKind < 2.5) {   // うみ
    float s = sin(vW.x * 0.35 + uTime * 1.3) * sin(vW.z * 0.3 - uTime * 1.1);
    float s2 = sin((vW.x + vW.z) * 0.9 + uTime * 2.0);
    col += vec3(0.06, 0.08, 0.1) * s + vec3(0.05) * step(0.93, s2 * s);
  } else if (vKind > 2.5 && vKind < 3.5) {   // レンガ
    float row = floor(vW.y * 3.0);
    float bx = fract((vW.x + vW.z) * 1.4 + mod(row, 2.0) * 0.5);
    float by = fract(vW.y * 3.0);
    col *= 1.0 - 0.25 * (step(0.88, by) + step(0.92, bx)) * (1.0 - abs(n.y));
  } else if (vKind > 3.5) {                  // しばふ
    col *= 0.94 + 0.08 * sin(vW.x * 1.7) * sin(vW.z * 1.3);
  }
  float d = max(dot(n, uSun), 0.0);
  vec3 lit = col * (0.5 + 0.12 * n.y + 0.55 * d);
  lit = mix(lit, col, uEmit);
  float dist = length(vW - uCam);
  float f = clamp((dist - 70.0) / 280.0, 0.0, 1.0);
  gl_FragColor = vec4(mix(lit, uFog, f * f), uAlpha);
}`;
  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog); gl.useProgram(prog);
  const A = {}, U = {};
  ['aPos', 'aNor', 'aCol', 'aKind'].forEach((n) => { A[n] = gl.getAttribLocation(prog, n); gl.enableVertexAttribArray(A[n]); });
  ['uProj', 'uView', 'uModel', 'uTint', 'uSun', 'uFog', 'uCam', 'uTime', 'uEmit', 'uAlpha'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  // ================= かたち づくり =================
  class Geo {
    constructor() { this.d = []; }
    v(p, n, c, k) { this.d.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], k); }
    tri(a, b, c, n, col, k) { this.v(a, n, col, k); this.v(b, n, col, k); this.v(c, n, col, k); }
    quad(a, b, c, d, n, col, k) { this.tri(a, b, c, n, col, k); this.tri(a, c, d, n, col, k); }
    box(x0, y0, z0, x1, y1, z1, col, k, top) {
      k = k || 0; const t = top || col;
      this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], t, k === 1 || k === 3 ? 0 : k);
      this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], col, 0);
      this.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0], col, k);
      this.quad([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [-1, 0, 0], col, k);
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, k);
      this.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], col, k);
    }
    obox(c, u, v, w, hu, hv, hw, col, k) {
      k = k || 0;
      const p = (a, b, d) => [c[0] + a * hu * u[0] + b * hv * v[0] + d * hw * w[0], c[1] + a * hu * u[1] + b * hv * v[1] + d * hw * w[1], c[2] + a * hu * u[2] + b * hv * v[2] + d * hw * w[2]];
      const neg = (x) => [-x[0], -x[1], -x[2]];
      this.quad(p(1, -1, -1), p(1, 1, -1), p(1, 1, 1), p(1, -1, 1), u, col, k);
      this.quad(p(-1, -1, -1), p(-1, 1, -1), p(-1, 1, 1), p(-1, -1, 1), neg(u), col, k);
      this.quad(p(-1, 1, -1), p(1, 1, -1), p(1, 1, 1), p(-1, 1, 1), v, col, k);
      this.quad(p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1), neg(v), col, k);
      this.quad(p(-1, -1, 1), p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1), w, col, k);
      this.quad(p(-1, -1, -1), p(1, -1, -1), p(1, 1, -1), p(-1, 1, -1), neg(w), col, k);
    }
    // a から b へ のびる ぼう
    beam(a, b, t, col) {
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const L = Math.hypot(d[0], d[1], d[2]);
      const u = [d[0] / L, d[1] / L, d[2] / L];
      let v = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      let w = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      let l = Math.hypot(w[0], w[1], w[2]); w = [w[0] / l, w[1] / l, w[2] / l];
      v = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]];
      this.obox([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], u, v, w, L / 2, t, t, col);
    }
    cyl(cx, y0, cz, r, h, seg, col, k, r2) {
      k = k || 0; if (r2 === undefined) r2 = r;
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, am = (a0 + a1) / 2;
        const n = [Math.cos(am), (r - r2) / h, Math.sin(am)];
        this.quad([cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r],
          [cx + Math.cos(a1) * r2, y0 + h, cz + Math.sin(a1) * r2], [cx + Math.cos(a0) * r2, y0 + h, cz + Math.sin(a0) * r2], n, col, k);
        this.tri([cx, y0 + h, cz], [cx + Math.cos(a0) * r2, y0 + h, cz + Math.sin(a0) * r2], [cx + Math.cos(a1) * r2, y0 + h, cz + Math.sin(a1) * r2], [0, 1, 0], col, 0);
      }
    }
    cone(cx, y0, cz, r, h, seg, col, alt) {
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, am = (a0 + a1) / 2;
        const n = [Math.cos(am) * h, r, Math.sin(am) * h]; const l = Math.hypot(n[0], n[1], n[2]);
        const c = alt && i % 2 ? alt : col;
        this.tri([cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r], [cx, y0 + h, cz], [n[0] / l, n[1] / l, n[2] / l], c, 0);
        this.tri([cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r], [cx, y0, cz], [0, -1, 0], shade(c, 0.8), 0);
      }
    }
    sphere(cx, cy, cz, r, seg, col) {
      for (let i = 0; i < seg; i++) for (let j = 0; j < seg * 2; j++) {
        const p = (a, b) => { const th = a / seg * Math.PI, ph = b / (seg * 2) * Math.PI * 2; return [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; };
        const q = [p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1)];
        const m = p(i + 0.5, j + 0.5);
        const w = q.map((n) => [cx + n[0] * r, cy + n[1] * r, cz + n[2] * r]);
        this.quad(w[0], w[1], w[2], w[3], m, col, 0);
      }
    }
    star(r1, r2, th, col) {
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? r2 : r1; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      for (let i = 0; i < 10; i++) {
        const a = pts[i], b = pts[(i + 1) % 10];
        this.tri([0, 0, th], [a[0], a[1], th * 0.3], [b[0], b[1], th * 0.3], [0, 0, 1], col, 0);
        this.tri([0, 0, -th], [a[0], a[1], -th * 0.3], [b[0], b[1], -th * 0.3], [0, 0, -1], col, 0);
        const nx = b[1] - a[1], ny = -(b[0] - a[0]), l = Math.hypot(nx, ny);
        this.quad([a[0], a[1], th * 0.3], [b[0], b[1], th * 0.3], [b[0], b[1], -th * 0.3], [a[0], a[1], -th * 0.3], [nx / l, ny / l, 0], shade(col, 0.85), 0);
      }
    }
    upload() {
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.d), gl.STATIC_DRAW);
      return { buf, n: this.d.length / 10 };
    }
  }

  // ================= いろ =================
  const C = {
    land: hex('#d9d3c5'), wall: hex('#9a978f'), grass: hex('#7cc36b'), road: hex('#6d7480'), line: hex('#f1f3f5'),
    landmark: hex('#d3cec4'), lmTop: hex('#b9b3a6'), glass: hex('#9fbad0'), white: hex('#f4f6f8'), hotel: hex('#eef2f6'),
    brick: hex('#b5523b'), roofG: hex('#6b7a80'), red: hex('#e03131'), wood: hex('#c89b62'), tan: hex('#caa472'),
    trunk: hex('#8a5a33'), leaf: hex('#4caf50'), leaf2: hex('#2f9e44'), water: hex('#3d8fd6'), sky: hex('#bfe3ff'),
    navy: hex('#27324a'), blue: hex('#2f6fe0'), cap: hex('#1c4fd0'), skin: hex('#ffd7b0'), hair: hex('#4a2f1d'),
    yellow: hex('#ffd43b'), gold: hex('#ffb700'), black: hex('#222'), pink: hex('#ff8fa3'), teal: hex('#20c997'),
    orange: hex('#ff922b'), purple: hex('#9775fa'), green: hex('#51cf66'), beige: hex('#e9dcc0'), gray: hex('#adb5bd'),
  };

  // ================= せかい（ほんものの ちず から つくる）=================
  // ちず: window.MM_MAP（tools/minatomirai-map.py が OpenStreetMap から つくる）
  const MAP = window.MM_MAP;
  const R = 0.35, H = 1.5, STEP = 0.55, GRAV = 26, JUMP = 9.2; // あおちゃんの おおきさ・うごき
  const WATER = -0.6;
  const solids = [];
  // --- はこ を さがしやすく する ます（くうかん ハッシュ）---
  const HC = 8, HASH = new Map();
  const hk = (i, j) => (i + 4096) * 8192 + (j + 4096);
  function addSolid(b) {
    if (b.climb === undefined) b.climb = true;
    solids.push(b);
    for (let i = Math.floor(b.x0 / HC); i <= Math.floor(b.x1 / HC); i++) for (let j = Math.floor(b.z0 / HC); j <= Math.floor(b.z1 / HC); j++) {
      const k = hk(i, j); let l = HASH.get(k); if (!l) { l = []; HASH.set(k, l); } l.push(b);
    }
    return b;
  }
  let qid = 0;
  function near(x0, z0, x1, z1) {
    qid++; const out = [];
    for (let i = Math.floor(x0 / HC); i <= Math.floor(x1 / HC); i++) for (let j = Math.floor(z0 / HC); j <= Math.floor(z1 / HC); j++) {
      const l = HASH.get(hk(i, j)); if (!l) continue;
      for (const b of l) if (b._q !== qid) { b._q = qid; out.push(b); }
    }
    return out;
  }
  const G = new Geo();
  function B(x0, y0, z0, x1, y1, z1, col, k, top, opt) {
    if (col) G.box(x0, y0, z0, x1, y1, z1, col, k, top);
    return addSolid({ x0, y0, z0, x1, y1, z1, climb: !(opt && opt.noclimb) });
  }
  function flat(x0, z0, x1, z1, y, col, k) { G.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, 1, 0], col, k || 0); }
  function tree(x, z, y, s) {
    y = y || 0; s = s || 1;
    G.cyl(x, y, z, 0.2 * s, 1.1 * s, 4, C.trunk);
    G.cone(x, y + 0.8 * s, z, 1.2 * s, 2.6 * s, 6, (Math.abs(x * 7 + z * 3) | 0) % 3 ? C.leaf : C.leaf2);
  }
  function hash01(a, b) { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); }
  // うみ
  G.quad([-1500, WATER, -1500], [1500, WATER, -1500], [1500, WATER, 1500], [-1500, WATER, 1500], [0, 1, 0], C.water, 2);
  // りくち（はこ）と うみぞいの かべ
  const CELL = MAP.cell, OX = MAP.o[0], OZ = MAP.o[1];
  MAP.land.forEach(([i0, j0, i1, j1]) => {
    const x0 = OX + i0 * CELL, z0 = OZ + j0 * CELL, x1 = OX + i1 * CELL, z1 = OZ + j1 * CELL;
    flat(x0, z0, x1, z1, 0, C.land);
    addSolid({ x0, y0: -4, z0, x1, y1: 0, z1 });
  });
  MAP.coast.forEach(([i0, j0, i1, j1]) => {
    const x0 = OX + i0 * CELL, z0 = OZ + j0 * CELL, x1 = OX + i1 * CELL, z1 = OZ + j1 * CELL;
    const n = j0 === j1 ? [0, 0, 1] : [1, 0, 0];
    G.quad([x0, -1.4, z0], [x1, -1.4, z1], [x1, 0, z1], [x0, 0, z0], n, C.wall, 0);
  });
  // こうえん・しばふ
  MAP.green.forEach((g) => {
    const p = g.p, col = g.c === 'pitch' ? hex('#5cb85c') : C.grass;
    for (let k = 0; k < g.t.length; k += 3) {
      const a = g.t[k] * 2, b = g.t[k + 1] * 2, c = g.t[k + 2] * 2;
      G.tri([p[a], 0.012, p[a + 1]], [p[b], 0.012, p[b + 1]], [p[c], 0.012, p[c + 1]], [0, 1, 0], col, 4);
    }
  });
  // みち
  const ROADCOL = { major: hex('#6d7480'), minor: hex('#80868f'), walk: hex('#d4cab6'), plaza: hex('#ddd3c0') };
  const MAJOR = { trunk: 1, primary: 1, secondary: 1, tertiary: 1, tertiary_link: 1 };
  const WALK = { pedestrian: 1, footway: 1, cycleway: 1, path: 1 };
  function ribbon(p, w, y, col) {
    for (let k = 0; k + 3 < p.length; k += 2) {
      const xa = p[k], za = p[k + 1], xb = p[k + 2], zb = p[k + 3];
      const dx = xb - xa, dz = zb - za, L = Math.hypot(dx, dz); if (L < 1e-3) continue;
      const nx = -dz / L * w / 2, nz = dx / L * w / 2, ex = dx / L * w * 0.25, ez = dz / L * w * 0.25;
      G.quad([xa - nx - ex, y, za - nz - ez], [xb - nx + ex, y, zb - nz + ez], [xb + nx + ex, y, zb + nz + ez], [xa + nx - ex, y, za + nz - ez], [0, 1, 0], col, 0);
    }
  }
  MAP.roads.forEach((r) => {
    if (r.a) {
      for (let k = 0; k < r.t.length; k += 3) {
        const a = r.t[k] * 2, b = r.t[k + 1] * 2, c = r.t[k + 2] * 2, p = r.p;
        G.tri([p[a], 0.016, p[a + 1]], [p[b], 0.016, p[b + 1]], [p[c], 0.016, p[c + 1]], [0, 1, 0], ROADCOL.plaza, 0);
      }
      return;
    }
    if (WALK[r.c]) ribbon(r.p, r.w, 0.02, ROADCOL.walk);
    else if (MAJOR[r.c]) { ribbon(r.p, r.w, 0.028, ROADCOL.major); if (r.w > 3) ribbon(r.p, 0.15, 0.032, C.line); }
    else ribbon(r.p, r.w, 0.024, ROADCOL.minor);
  });
  // せんろ（たかい ところは はしらの うえ）
  MAP.rail.forEach((r) => {
    const y = r.e ? 3 : 0.035;
    ribbon(r.p, 1.4, y, hex('#8d7b68'));
    if (r.e) for (let k = 0; k + 1 < r.p.length; k += 4) G.box(r.p[k] - 0.3, 0, r.p[k + 1] - 0.3, r.p[k] + 0.3, y, r.p[k + 1] + 0.3, C.gray);
  });
  // き（おおすぎる ときは まびく）
  { const n = MAP.trees.length / 2, step = n > 1400 ? n / 1400 : 1;
    for (let f = 0; f < n; f += step) { const i = Math.floor(f) * 2; tree(MAP.trees[i], MAP.trees[i + 1], 0, 0.8 + hash01(i, 3) * 0.5); } }

  // --- たてもの ---
  const BCOL = {
    tower: '#d6cfc2', office: '#9fb6c8', commercial: '#b3c3cf', apartments: '#e6dccb', residential: '#e9e1d2', hotel: '#eef2f6',
    retail: '#e9e3d6', house: '#f1d7b4', warehouse: '#c9c4b8', industrial: '#c3beb3', train_station: '#dee2e6', public: '#e3ebe6',
    school: '#efe3c8', yes: '#dcd6cc', brick: '#b5523b', roof: '#c8c8c8', ship: '#ffffff',
  };
  const NAMECOL = { '横浜ランドマークタワー': '#d9d2c4', 'ヨコハマ グランド インターコンチネンタル ホテル': '#f4f7fa', 'Yokohama World Porters': '#efe2c9', 'MARK IS minatomirai': '#f1e3c8', 'Cupnoodles Museum': '#f3f3f3' };
  const BLD = [];   // ちず と ドアさがし よう
  MAP.bld.forEach((b, bi) => {
    const p = b.p, n = p.length / 2;
    let base = NAMECOL[b.n] || (b.c && /^#[0-9a-f]{6}$/i.test(b.c) ? b.c : null) || BCOL[b.k] || BCOL.yes;
    let col = hex(base);
    if (!NAMECOL[b.n] && b.k !== 'brick') col = shade(col, 0.92 + hash01(bi, 1) * 0.14);
    const tall = b.y1 - b.y0 > 3.2;
    const kind = b.k === 'brick' ? 3 : tall ? 1 : 0;
    for (let i = 0; i < n; i++) {
      const xa = p[i * 2], za = p[i * 2 + 1], xb = p[((i + 1) % n) * 2], zb = p[((i + 1) % n) * 2 + 1];
      const dx = xb - xa, dz = zb - za, L = Math.hypot(dx, dz) || 1;
      G.quad([xa, b.y0, za], [xb, b.y0, zb], [xb, b.y1, zb], [xa, b.y1, za], [dz / L, 0, -dx / L], col, kind);
    }
    const roof = shade(col, b.k === 'brick' ? 0.55 : 0.82);
    for (let k = 0; k < b.t.length; k += 3) {
      const a = b.t[k] * 2, c2 = b.t[k + 1] * 2, d = b.t[k + 2] * 2;
      G.tri([p[a], b.y1, p[a + 1]], [p[c2], b.y1, p[c2 + 1]], [p[d], b.y1, p[d + 1]], [0, 1, 0], roof, 0);
      if (b.y0 > 0.3) G.tri([p[a], b.y0, p[a + 1]], [p[c2], b.y0, p[c2 + 1]], [p[d], b.y0, p[d + 1]], [0, -1, 0], shade(col, 0.6), 0);
    }
    b.b.forEach(([x0, z0, x1, z1]) => addSolid({ x0, y0: b.y0, z0, x1, y1: b.y1, z1 }));
    BLD.push({ n: b.n, p, y1: b.y1, col });
  });
  const POI = MAP.poi;
  const poi = (n) => POI[n] || { x: 0, z: 0, h: 0, bb: [0, 0, 0, 0] };

  // --- たすけ: その ばしょ に たてるか ---
  function blockedAt(x, y, z) {
    for (const b of near(x - 0.6, z - 0.6, x + 0.6, z + 0.6)) if (x + R > b.x0 && x - R < b.x1 && z + R > b.z0 && z - R < b.z1 && y + H > b.y0 + 0.01 && y < b.y1 - 0.01) return true;
    return false;
  }
  function isLand(x, z) { for (const b of near(x, z, x, z)) if (b.y1 === 0 && b.y0 === -4 && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return true; return false; }
  function freeSpot(x, z) { // ちかくの あるける ばしょ
    for (let r = 0; r < 40; r += 0.75) {
      for (let a = 0; a < 16; a++) {
        const xx = x + Math.cos(a / 16 * Math.PI * 2) * r, zz = z + Math.sin(a / 16 * Math.PI * 2) * r;
        if (isLand(xx, zz) && !blockedAt(xx, 0, zz) && isLand(xx + 0.6, zz) && isLand(xx - 0.6, zz) && isLand(xx, zz + 0.6) && isLand(xx, zz - 0.6)) return { x: xx, z: zz };
        if (r === 0) break;
      }
    }
    return { x, z };
  }
  // たてものの へり で、めあて の ほうを むいた ドアの ばしょ
  function doorOn(name, tx, tz) {
    let best = null;
    // なまえの ついた かたちが なければ（パーツで かいた たてもの）、その ばしょの なかの パーツを つかう
    const bb = POI[name] && POI[name].bb;
    const named = BLD.some((b) => b.n === name);
    const mine = (b) => {
      if (named) return b.n === name;
      if (!bb) return false;
      let cx = 0, cz = 0; const n = b.p.length / 2; for (let i = 0; i < n; i++) { cx += b.p[i * 2]; cz += b.p[i * 2 + 1]; }
      cx /= n; cz /= n; return cx > bb[0] && cx < bb[2] && cz > bb[1] && cz < bb[3] && b.y1 > 2;
    };
    BLD.forEach((b) => {
      if (!mine(b)) return;
      const p = b.p, n = p.length / 2;
      for (let i = 0; i < n; i++) {
        const xa = p[i * 2], za = p[i * 2 + 1], xb = p[((i + 1) % n) * 2], zb = p[((i + 1) % n) * 2 + 1];
        const dx = xb - xa, dz = zb - za, L2 = dx * dx + dz * dz; if (L2 < 4) continue;
        const t = clamp(((tx - xa) * dx + (tz - za) * dz) / L2, 0.2, 0.8);
        const x = xa + dx * t, z = za + dz * t, d = Math.hypot(tx - x, tz - z);
        if (!best || d < best.d) { const L = Math.sqrt(L2); best = { d, x, z, nx: dz / L, nz: -dx / L, ux: dx / L, uz: dz / L }; }
      }
    });
    if (!best) return null;
    let k = 1.1;
    while (k < 6 && (blockedAt(best.x + best.nx * k, 0, best.z + best.nz * k) || !isLand(best.x + best.nx * k, best.z + best.nz * k))) k += 0.4;
    best.ox = best.x + best.nx * k; best.oz = best.z + best.nz * k;
    return best;
  }

  // --- ランドマークタワー: ひとやすみ バルコニー ---
  const LMP = poi('横浜ランドマークタワー'), LMH = LMP.h || 74;
  const LMB = LMP.bb; const LMC = { x: (LMB[0] + LMB[2]) / 2, z: (LMB[1] + LMB[3]) / 2 };
  const BALC = [14, 28, 42, 56];
  BALC.forEach((y) => {
    const e = 1.3, t = 0.5, [x0, z0, x1, z1] = LMB;
    B(x0 - e, y - t, z0 - e, x1 + e, y, z0, C.white, 0, C.white);
    B(x0 - e, y - t, z1, x1 + e, y, z1 + e, C.white, 0, C.white);
    B(x0 - e, y - t, z0, x0, y, z1, C.white, 0, C.white);
    B(x1, y - t, z0, x1 + e, y, z1, C.white, 0, C.white);
  });
  G.cyl(LMC.x, LMH + 0.02, LMC.z, 3, 0.04, 16, C.yellow);

  // --- にっぽんまる（ほんとうの むき に ふねを おく）---
  const SHIP = (() => {
    const sp = POI['日本丸']; if (!sp || !sp.poly) return null;
    const p = sp.poly, n = p.length / 2; let a = 0, b = 0, best = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = Math.hypot(p[i * 2] - p[j * 2], p[i * 2 + 1] - p[j * 2 + 1]); if (d > best) { best = d; a = i; b = j; } }
    const ax = p[a * 2], az = p[a * 2 + 1], bx = p[b * 2], bz = p[b * 2 + 1];
    const ux = (bx - ax) / best, uz = (bz - az) / best;
    // ふねの かたち（へさき が とがった ながしかく）
    const hw = 1.7, pts = [];
    const at = (t, s) => [ax + ux * best * t - uz * s, az + uz * best * t + ux * s];
    pts.push(at(0, -hw), at(0.85, -hw), at(1, 0), at(0.85, hw), at(0, hw));
    // かべ
    for (let i = 0; i < pts.length; i++) {
      const [xa, za] = pts[i], [xb, zb] = pts[(i + 1) % pts.length]; const dx = xb - xa, dz = zb - za, L = Math.hypot(dx, dz);
      G.quad([xa, -1.2, za], [xb, -1.2, zb], [xb, 2.4, zb], [xa, 2.4, za], [dz / L, 0, -dx / L], C.white, 0);
      G.quad([xa, 0.9, za], [xb, 0.9, zb], [xb, 1.3, zb], [xa, 1.3, za], [dz / L * 1.01, 0, -dx / L * 1.01], hex('#1c3f8f'), 0);
    }
    G.tri([...[pts[0][0], 2.4, pts[0][1]]], [pts[1][0], 2.4, pts[1][1]], [pts[4][0], 2.4, pts[4][1]], [0, 1, 0], C.wood, 0);
    G.tri([pts[1][0], 2.4, pts[1][1]], [pts[3][0], 2.4, pts[3][1]], [pts[4][0], 2.4, pts[4][1]], [0, 1, 0], C.wood, 0);
    G.tri([pts[1][0], 2.4, pts[1][1]], [pts[2][0], 2.4, pts[2][1]], [pts[3][0], 2.4, pts[3][1]], [0, 1, 0], C.wood, 0);
    // あたり: ふねに そって ちいさな はこを ならべる
    for (let t = 0; t < 0.95; t += 0.05) {
      const w = t > 0.85 ? hw * (1 - (t - 0.85) / 0.15) : hw;
      const [cx, cz] = at(t + 0.025, 0); const r = Math.max(0.5, w * 0.8);
      addSolid({ x0: cx - r, y0: -2, z0: cz - r, x1: cx + r, y1: 2.4, z1: cz + r });
    }
    const masts = [0.2, 0.4, 0.6, 0.78].map((t, i) => {
      const [x, z] = at(t, 0), h = i === 1 ? 13.5 : 12;
      B(x - 0.3, 2.4, z - 0.3, x + 0.3, h, z + 0.3, C.tan, 0, C.tan);
      [h - 8, h - 5.3, h - 2.6].forEach((y, j) => {
        const L = 3.2 - j * 0.6; G.beam([x - uz * L, y, z + ux * L], [x + uz * L, y, z - ux * L], 0.12, C.tan);
      });
      return { x, z, h };
    });
    const [bx2, bz2] = at(1, 0); G.beam([masts[3].x, 9, masts[3].z], [bx2, 2.4, bz2], 0.05, C.navy);
    return { masts, cx: (ax + bx) / 2, cz: (az + bz) / 2 };
  })();

  // --- コスモクロック21（かんらんしゃ）---
  const FWP = POI['コスモクロック21'] || { x: 114, z: 46, bb: [109, 41, 119, 52] };
  const FW = { cx: FWP.x, cz: FWP.z, R: 12.5, N: 16, period: 80, axis: (FWP.bb[2] - FWP.bb[0]) < (FWP.bb[3] - FWP.bb[1]) ? 'x' : 'z' };
  FW.hub = FW.R + 2.2;
  // ほうこう: axis='x' なら わは YZ めん
  const fwPos = (u, y, w) => FW.axis === 'x' ? [FW.cx + w, y, FW.cz + u] : [FW.cx + u, y, FW.cz + w];
  {
    const box = (u0, y0, w0, u1, y1, w1, col) => { const a = fwPos(u0, y0, w0), b = fwPos(u1, y1, w1); return B(Math.min(a[0], b[0]), y0, Math.min(a[2], b[2]), Math.max(a[0], b[0]), y1, Math.max(a[2], b[2]), col, 0, col); };
    box(-1, 0, -3.2, 1, FW.hub + 1, -1.8, C.white); box(-1, 0, 1.8, 1, FW.hub + 1, 3.2, C.white);
    box(-1, FW.hub - 1, -3.2, 1, FW.hub + 1, 3.2, C.white);
    box(-7, 0, -1.7, 7, 0.5, 1.7, hex('#ffe066'));
    [-2.5, 2.5].forEach((w) => { G.beam(fwPos(-7, 0, w), fwPos(0, FW.hub, w), 0.4, C.white); G.beam(fwPos(7, 0, w), fwPos(0, FW.hub, w), 0.4, C.white); });
  }

  // --- エアキャビン（ほんとうの ルート）---
  const CAB = (() => {
    const a = MAP.aerial; if (!a || a.length < 4) return null;
    const pts = []; for (let i = 0; i < a.length; i += 2) pts.push([a[i], a[i + 1]]);
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = L[L.length - 1], Y = 12;
    function at(s) { // 0..total
      s = clamp(s, 0, total); let i = 1; while (i < L.length - 1 && L[i] < s) i++;
      const t = (s - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
      const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, z = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
      const dx = pts[i][0] - pts[i - 1][0], dz = pts[i][1] - pts[i - 1][1], l = Math.hypot(dx, dz) || 1;
      return { x, z, ux: dx / l, uz: dz / l };
    }
    // ケーブル 2ほん
    [-1.6, 1.6].forEach((o) => {
      for (let i = 1; i < pts.length; i++) {
        const p0 = at(L[i - 1] + 0.01), p1 = at(L[i] - 0.01);
        G.beam([pts[i - 1][0] - p0.uz * o, Y + 1.6, pts[i - 1][1] + p0.ux * o], [pts[i][0] - p1.uz * o, Y + 1.6, pts[i][1] + p1.ux * o], 0.05, C.navy);
      }
    });
    // まんなかの はしら（のぼれる）
    const towers = [];
    for (let i = 1; i < pts.length - 1; i++) {
      if (L[i] < 15 || total - L[i] < 15) continue;
      if (towers.some((t) => Math.hypot(t.x - pts[i][0], t.z - pts[i][1]) < 20)) continue;
      const [x, z] = pts[i]; towers.push({ x, z });
      B(x - 0.8, 0, z - 0.8, x + 0.8, Y + 2.2, z + 0.8, C.white, 0, C.gray);
      const p = at(L[i]); G.beam([x + p.uz * 2.4, Y + 1.8, z - p.ux * 2.4], [x - p.uz * 2.4, Y + 1.8, z + p.ux * 2.4], 0.3, C.white);
    }
    // えき（ケーブルの はし）
    const ends = [{ s: 0 }, { s: total }].map((e, k) => {
      const p = at(e.s), dir = k === 0 ? -1 : 1;
      const cx = p.x + p.ux * dir * 2, cz = p.z + p.uz * dir * 2;
      // やね と はしら（みため）
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a2, b2]) => G.box(cx + a2 * 3.2 - 0.25, 0, cz + b2 * 3.2 - 0.25, cx + a2 * 3.2 + 0.25, Y + 2.6, cz + b2 * 3.2 + 0.25, C.white));
      G.box(cx - 3.8, Y + 2.6, cz - 3.8, cx + 3.8, Y + 3.3, cz + 3.8, hex('#d0ebff'));
      G.box(cx - 3.5, Y - 0.6, cz - 3.5, cx + 3.5, Y - 0.2, cz + 3.5, C.gray);
      // きっぷうりば（じめん）
      const kx = cx + p.ux * dir * 5, kz = cz + p.uz * dir * 5;
      const f = freeSpot(kx, kz);
      B(f.x - 1.2, 0, f.z - 1.2, f.x + 1.2, 2.6, f.z + 1.2, hex('#4dabf7'), 0, C.white);
      return { x: f.x, z: f.z, s: e.s, door: freeSpot(f.x + p.ux * dir * 2.2, f.z + p.uz * dir * 2.2) };
    });
    return { pts, L, total, Y, at, ends, towers };
  })();

  // --- りんこうパークの おか ---
  const RINKO = POI['臨港パーク'] || { x: 206, z: -88 };
  const HILL = freeSpot(RINKO.x, RINKO.z);
  [[8, 1.4], [5, 2.8], [2.5, 4.2]].forEach(([r, h], i) => B(HILL.x - r, h - 1.4, HILL.z - r, HILL.x + r, h, HILL.z + r, C.grass, 4, C.grass));
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; tree(HILL.x + Math.cos(a) * 12, HILL.z + Math.sin(a) * 12); }

  // --- うみの ブイ ---
  const BUOY = (() => {
    let x = RINKO.x, z = RINKO.z;
    for (let k = 0; k < 200 && isLand(x, z); k++) { x += 2; z += 0.5; }
    x += 25; return { x, z };
  })();
  B(BUOY.x - 1, -2, BUOY.z - 1, BUOY.x + 1, 0.6, BUOY.z + 1, C.red, 0, C.white);

  // ================= ドア（はいれる ところ）=================
  const DOORS = [];
  function addDoor(id, d, label, color, run) {
    if (!d) return;
    DOORS.push({ id, x: d.ox, z: d.oz, label, color, run });
    // みための とびら と かんばん
    const c = [d.x + d.nx * 0.06, 1.35, d.z + d.nz * 0.06];
    G.obox(c, [d.ux, 0, d.uz], [0, 1, 0], [d.nx, 0, d.nz], 1.3, 1.35, 0.06, color);
    G.obox([c[0] + d.nx * 0.05, 3.2, c[2] + d.nz * 0.05], [d.ux, 0, d.uz], [0, 1, 0], [d.nx, 0, d.nz], 1.8, 0.4, 0.06, C.white);
  }
  const MARKP = poi('MARK IS minatomirai'), MIDP = poi('M.M.MID Square'), WPP = poi('Yokohama World Porters');
  addDoor('kumon', doorOn('M.M.MID Square', MARKP.x, MARKP.z), '🏫<br>くもん', hex('#20b26b'), () => enterKumon());
  addDoor('toys', doorOn('MARK IS minatomirai', LMC.x, LMC.z), '🧸<br>はいる', hex('#e8590c'), () => openShop('toys'));
  addDoor('wp', doorOn('Yokohama World Porters', CAB ? CAB.ends[0].x : WPP.x - 30, CAB ? CAB.ends[0].z : WPP.z), '🎪<br>はいる', hex('#7048e8'), () => openShop('wp'));
  if (CAB) CAB.ends.forEach((e, k) => DOORS.push({ id: 'cab' + k, x: e.door.x, z: e.door.z, label: '🚡<br>のる', color: hex('#1c7ed6'), run: () => openShop('cabin', k) }));

  const staticMesh = G.upload();

  // ================= うごく あしば（かんらんしゃ）=================
  const plats = [];
  function plat(hx, hz) { const p = { hx, hz, cx: 0, cy: 0, cz: 0, dx: 0, dy: 0, dz: 0, init: false, x0: 0, x1: 0, z0: 0, z1: 0, y1: 0 }; plats.push(p); return p; }
  function setPlat(p, cx, top, cz) {
    if (p.init) { p.dx = cx - p.cx; p.dy = top - p.cy; p.dz = cz - p.cz; } p.init = true;
    if (Math.abs(p.dx) + Math.abs(p.dz) > 1.5) { p.dx = p.dy = p.dz = 0; }
    p.cx = cx; p.cy = top; p.cz = cz; p.x0 = cx - p.hx; p.x1 = cx + p.hx; p.z0 = cz - p.hz; p.z1 = cz + p.hz; p.y1 = top;
  }
  const cabins = []; for (let i = 0; i < FW.N; i++) cabins.push(plat(1.1, 1.1));
  const CAB_COL = [C.red, C.yellow, C.teal, C.purple, C.orange, C.blue, C.pink, C.green];
  function updatePlats(t) {
    cabins.forEach((p, i) => {
      const a = t * Math.PI * 2 / FW.period + i * Math.PI * 2 / FW.N;
      const q = fwPos(Math.cos(a) * FW.R, FW.hub + Math.sin(a) * FW.R, 0);
      setPlat(p, q[0], q[1], q[2]);
    });
  }

  // ================= ほし・アイテム・ひと・ばしょ =================
  const top = (n, dy) => { const q = poi(n); return { x: q.x, y: (q.h || 0) + (dy || 1.3), z: q.z }; };
  const STARS = [];
  function star(id, p, big) { if (p) STARS.push(Object.assign({ id, big: !!big }, p)); }
  star('lm-top', { x: LMC.x, y: LMH + 1.8, z: LMC.z }, true);
  star('lm-28', { x: LMC.x, y: 28 + 1.2, z: LMB[3] + 0.65 });
  star('queens', top('クイーンズタワーA棟'));
  if (SHIP) star('mast', { x: SHIP.masts[1].x, y: SHIP.masts[1].h + 1.3, z: SHIP.masts[1].z });
  { const q = fwPos(0, FW.hub + 2.3, 0); star('fw-hub', { x: q[0], y: q[1], z: q[2] }); const t2 = fwPos(0, FW.hub + FW.R + 1.1, 0); star('fw-top', { x: t2[0], y: t2[1], z: t2[2] }); }
  star('cup', top('Cupnoodles Museum'));
  star('brick', top('横浜赤レンガ倉庫1号館'));
  { // おおさんばし の さき
    const q = poi('大さん橋'); let best = null;
    MAP.land.forEach(([i0, j0, i1, j1]) => {
      const x = OX + (i0 + i1) / 2 * CELL, z = OZ + (j0 + j1) / 2 * CELL;
      if (x < q.bb[0] || x > q.bb[2] || z < q.bb[1] || z > q.bb[3]) return;
      const d = Math.hypot(x - LMC.x, z - LMC.z); if (!best || d > best.d) best = { d, x, z };
    });
    if (best) star('pier', { x: best.x, y: 1.4, z: best.z });
  }
  star('buoy', { x: BUOY.x, y: 1.9, z: BUOY.z });
  star('hotel', top('ヨコハマ グランド インターコンチネンタル ホテル'));
  star('pacifico', top('パシフィコ横浜ノース'));
  star('hill', { x: HILL.x, y: 5.6, z: HILL.z });
  if (CAB && CAB.towers[0]) star('cable', { x: CAB.towers[0].x, y: CAB.Y + 3.5, z: CAB.towers[0].z });
  star('markis', top('MARK IS minatomirai'));
  star('porters', top('Yokohama World Porters'));
  star('hammer', top('横浜ハンマーヘッド'));
  star('mid', top('M.M.MID Square'));
  $('starT').textContent = STARS.length;

  const PICKS = [];
  function pick(t, x, z, y) { const f = y === undefined ? freeSpot(x, z) : { x, z }; PICKS.push({ t, x: f.x, y: (y || 0) + 0.8, z: f.z, took: -1e9 }); }
  pick('oni', LMC.x - 4, LMB[3] + 6); pick('oni', LMB[0] - 0.6, LMC.z, 28); pick('oni', LMB[2] + 0.6, LMC.z, 42); pick('oni', LMC.x, LMB[1] - 0.6, 56);
  pick('oni', poi('横浜赤レンガ倉庫2号館').x, poi('横浜赤レンガ倉庫2号館').bb[3] + 3); pick('oni', MARKP.x, MARKP.bb[3] + 4);
  pick('oni', WPP.x, WPP.bb[1] - 3); pick('oni', poi('大さん橋').x, poi('大さん橋').z);
  pick('imo', FW.cx + 6, FW.cz + 8); pick('imo', HILL.x + 9, HILL.z); pick('imo', -40, 50); pick('imo', poi('クイーンズタワーB棟').x, poi('クイーンズタワーB棟').bb[3] + 5);
  pick('imo', poi('横浜ハンマーヘッド').x, poi('横浜ハンマーヘッド').bb[3] + 4); pick('imo', poi('パシフィコ横浜').x, poi('パシフィコ横浜').bb[3] + 4);

  const STA = poi('桜木町駅');
  const START = (() => { const f = freeSpot(STA.bb[2] + 8, STA.z - 8); const dx = LMC.x - f.x, dz = LMC.z - f.z; return { x: f.x, y: 0, z: f.z, yaw: Math.atan2(-dx, -dz), face: Math.atan2(dx, dz) }; })();
  const NPCS = [];
  function npc(x, z, col, who, say, y) { const f = y ? { x, z } : freeSpot(x, z); NPCS.push({ x: f.x, z: f.z, y: y || 0, col, who, say }); }
  npc(START.x + 3, START.z - 2, C.orange, 'えきの おにいさん', 'あおちゃん！ ランドマークタワーの てっぺんに きんいろの ほしが あるんだって。かべに むかって すすむと よじのぼれるよ！');
  npc(LMC.x + 6, LMB[3] + 4, C.pink, 'おねえさん', 'みどりの わが へったら、しろい バルコニーで ひとやすみ。🍙 を たべると げんき まんたん！');
  if (CAB) npc(CAB.ends[1].door.x + 2, CAB.ends[1].door.z + 1, C.green, 'えきいんさん', 'エアキャビンは こども 500えん。うみの うえを とんで、ワールドポーターズの ちかくまで いけるよ 🚡');
  if (SHIP) npc(SHIP.cx + 6, SHIP.cz + 6, C.teal, 'ふなのりさん', 'にっぽんまるの まんなかの マストの うえに ほしが ひかっているよ。');
  npc(FW.cx + 8, FW.cz + 6, C.purple, 'かんらんしゃの ひと', 'きいろい だいから はこの やねに とびのってごらん。そらの てっぺんまで はこんでくれるよ。');
  npc(MARKP.x + 4, MARKP.bb[3] + 5, C.red, 'おもちゃやさん', 'マークイズの 3かいに トイザらスが あるよ。プラレールが いっぱい！ 🚄');
  npc(MIDP.x - 4, MIDP.bb[3] + 4, C.orange, 'おかあさん', 'くもんの みなとみらい きょうしつは ミッドスクエアの 3かい。プリントを 1まい やると 1000えん もらえるよ ✏️');
  npc(WPP.x - 3, WPP.bb[1] - 4, C.blue, 'ガイドさん', 'ワールドポーターズには ガチャガチャと えいがかんが あるよ。100えんだまが いるから りょうがえきを つかってね。');
  npc(poi('横浜赤レンガ倉庫1号館').x + 4, poi('横浜赤レンガ倉庫1号館').bb[3] + 4, C.yellow, 'パンやさん', 'スーパーおなら 💨 で そらへ！ おちる ときは ジャンプで パラシュート 🪂 を ひらいてね。');

  const zp = (id, name, n, extra) => { const q = POI[n]; if (!q) return null; const bb = q.bb || [q.x, q.z, q.x, q.z]; return Object.assign({ id, name, x: q.x, z: q.z, r: Math.max(bb[2] - bb[0], bb[3] - bb[1]) / 2 + 6 }, extra || {}); };
  const ZONES = [
    zp('sakuragicho', 'さくらぎちょう えき', '桜木町駅'),
    zp('landmark', 'ランドマークタワー', '横浜ランドマークタワー'),
    { id: 'lmtop', name: 'ランドマークの てっぺん', x: LMC.x, z: LMC.z, r: 12, minY: LMH - 1 },
    zp('nipponmaru', 'にっぽんまる', '日本丸'),
    zp('queens', 'クイーンズスクエア', 'クイーンズタワーB棟'),
    zp('markis', 'マークイズ みなとみらい', 'MARK IS minatomirai'),
    zp('kumon', 'くもん みなとみらい きょうしつ', 'M.M.MID Square', { r: 14 }),
    zp('pacifico', 'パシフィコよこはま', 'パシフィコ横浜'),
    zp('rinko', 'りんこうパーク', '臨港パーク', { r: 30 }),
    zp('cosmo', 'コスモクロック21', 'コスモクロック21', { r: 16 }),
    zp('cupnoodle', 'カップヌードル ミュージアム', 'Cupnoodles Museum'),
    zp('worldporters', 'ワールドポーターズ', 'Yokohama World Porters'),
    { id: 'aircabin', name: 'エアキャビン', x: CAB ? CAB.at(CAB.total / 2).x : 0, z: CAB ? CAB.at(CAB.total / 2).z : 0, r: 0, ride: true },
    zp('kishamichi', 'きしゃみち', '汽車道', { r: 10 }),
    zp('akarenga', 'あかレンガそうこ', '横浜赤レンガ倉庫2号館', { r: 22 }),
    zp('hammerhead', 'ハンマーヘッド', '横浜ハンマーヘッド'),
    zp('osanbashi', 'おおさんばし', '大さん橋', { r: 40 }),
    zp('zounohana', 'ぞうのはなパーク', '象の鼻パーク', { r: 25 }),
  ].filter(Boolean);
  $('stampT').textContent = ZONES.length;

  // ================= うごく もの の かたち =================
  function mk(f) { const g = new Geo(); f(g); return g.upload(); }
  const W = [1, 1, 1];
  const mCube = mk((g) => g.box(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, W));
  const mStar = mk((g) => g.star(0.8, 0.36, 0.28, W));
  const mSphere = mk((g) => g.sphere(0, 0, 0, 1, 7, W));
  const mDisc = mk((g) => g.cyl(0, 0, 0, 1, 0.02, 16, W));
  const mChute = mk((g) => {   // パラシュート
    const R2 = 2.3, segs = 10, cols = [C.red, C.white, C.yellow, C.white];
    for (let i = 0; i < segs; i++) for (let j = 0; j < 4; j++) {
      const a0 = i / segs * Math.PI * 2, a1 = (i + 1) / segs * Math.PI * 2, b0 = j / 4 * Math.PI / 2, b1 = (j + 1) / 4 * Math.PI / 2;
      const p = (a, b) => [Math.cos(a) * Math.cos(b) * R2, Math.sin(b) * R2 * 0.6, Math.sin(a) * Math.cos(b) * R2];
      const m = p((a0 + a1) / 2, (b0 + b1) / 2), l = Math.hypot(...m);
      g.quad(p(a0, b0), p(a1, b0), p(a1, b1), p(a0, b1), [m[0] / l, m[1] / l, m[2] / l], cols[i % 4], 0);
    }
    for (let i = 0; i < segs; i += 2) { const a = i / segs * Math.PI * 2; g.beam([Math.cos(a) * R2, 0, Math.sin(a) * R2], [0, -2.1, 0], 0.02, C.white); }
  });
  const mOni = mk((g) => {
    const th = 0.22, p = [[0, 0.42], [-0.42, -0.3], [0.42, -0.3]];
    g.tri([p[0][0], p[0][1], th], [p[1][0], p[1][1], th], [p[2][0], p[2][1], th], [0, 0, 1], C.white, 0);
    g.tri([p[0][0], p[0][1], -th], [p[1][0], p[1][1], -th], [p[2][0], p[2][1], -th], [0, 0, -1], C.white, 0);
    for (let i = 0; i < 3; i++) {
      const a = p[i], b = p[(i + 1) % 3]; const nx = b[1] - a[1], ny = -(b[0] - a[0]), l = Math.hypot(nx, ny);
      g.quad([a[0], a[1], th], [b[0], b[1], th], [b[0], b[1], -th], [a[0], a[1], -th], [nx / l, ny / l, 0], C.white, 0);
    }
    g.box(-0.18, -0.34, -th - 0.02, 0.18, 0.02, th + 0.02, C.black);
  });
  const mImo = mk((g) => { g.sphere(0, 0, 0, 0.5, 6, hex('#a64ca6')); g.cyl(0.42, -0.08, 0, 0.12, 0.16, 5, hex('#f5d76e')); });
  const mWheel = mk((g) => {
    const R2 = FW.R, n = 48;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      g.beam([Math.cos(a0) * R2, Math.sin(a0) * R2, 0], [Math.cos(a1) * R2, Math.sin(a1) * R2, 0], 0.25, C.white);
      g.beam([Math.cos(a0) * (R2 - 1.4), Math.sin(a0) * (R2 - 1.4), 0], [Math.cos(a1) * (R2 - 1.4), Math.sin(a1) * (R2 - 1.4), 0], 0.15, hex('#a5d8ff'));
    }
    for (let i = 0; i < FW.N; i++) { const a = i / FW.N * Math.PI * 2; g.beam([0, 0, 0], [Math.cos(a) * R2, Math.sin(a) * R2, 0], 0.08, C.white); }
  });
  const mClock = mk((g) => {
    for (let i = 0; i < 24; i++) {
      const a0 = i / 24 * Math.PI * 2, a1 = (i + 1) / 24 * Math.PI * 2;
      g.tri([0, 0, 0], [Math.cos(a0) * 3, Math.sin(a0) * 3, 0], [Math.cos(a1) * 3, Math.sin(a1) * 3, 0], [0, 0, 1], hex('#0b7285'), 0);
    }
  });

  // ================= あおちゃん（5さいの おとこのこ）=================
  const P = {
    x: START.x, y: START.y, z: START.z, vx: 0, vy: 0, vz: 0, face: START.face,
    state: 'ground', wall: null, plat: null, glide: false, boost: 0, cool: 0,
    st: 1, tired: false, phase: 0, speed: 0, ground: true, gas: 1, farting: false, ride: null,
  };
  function maxSt() { return 1 + save.stars.filter((s) => s !== 'lm-top').length * 0.12 + (save.stars.includes('lm-top') ? 0.3 : 0); }
  if (save.pos && !blockedAt(save.pos.x, save.pos.y, save.pos.z)) { P.x = save.pos.x; P.y = save.pos.y; P.z = save.pos.z; }
  P.st = maxSt();

  function hits(b, x, y, z) {
    const e = 1e-4;
    return x + R > b.x0 + e && x - R < b.x1 - e && y + H > b.y0 + e && y < b.y1 - e && z + R > b.z0 + e && z - R < b.z1 - e;
  }
  const around = (x, z) => near(x - R - 0.2, z - R - 0.2, x + R + 0.2, z + R + 0.2);
  function anyHit(x, y, z) { for (const b of around(x, z)) if (hits(b, x, y, z)) return b; return null; }
  function moveH(axis, d, canStep) {
    if (!d) return null;
    P[axis] += d; let hit = null;
    for (const b of around(P.x, P.z)) {
      if (!hits(b, P.x, P.y, P.z)) continue;
      const up = b.y1 - P.y;
      if (canStep && up > 0 && up <= STEP && !anyHit(P.x, b.y1 + 0.001, P.z)) { P.y = b.y1; continue; }
      if (d > 0) { P[axis] = b[axis + '0'] - R; hit = { b, axis, side: -1 }; }
      else { P[axis] = b[axis + '1'] + R; hit = { b, axis, side: 1 }; }
    }
    return hit;
  }
  let ceilB = null;
  function moveV(d) {
    const y0 = P.y; P.y += d; let res = 0; ceilB = null;
    for (const b of around(P.x, P.z)) {
      if (!hits(b, P.x, P.y, P.z)) continue;
      if (d < 0) { P.y = b.y1; res = 1; } else { P.y = b.y0 - H; res = -1; ceilB = b; }
    }
    if (d <= 0) {
      for (const p of plats) {
        if (P.x + R > p.x0 && P.x - R < p.x1 && P.z + R > p.z0 && P.z - R < p.z1 && y0 >= p.y1 - 0.08 && P.y < p.y1) {
          P.y = p.y1; res = 1; P.plat = p;
        }
      }
    }
    return res;
  }
  function wallCoord(w) { return w.side > 0 ? w.b[w.axis + '1'] + R : w.b[w.axis + '0'] - R; }
  function faceWall(w) { const n = w.axis === 'x' ? [w.side, 0] : [0, w.side]; P.face = Math.atan2(-n[0], -n[1]); }

  // ================= にゅうりょく =================
  const keys = {};
  const inp = { mx: 0, my: 0, jump: false, let: false, fart: false };
  const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
  const cam = { yaw: START.yaw, pitch: 0.32, dist: 9, id: null, lx: 0, ly: 0 };
  if (save.pos) cam.yaw = save.pos.yaw || 0;
  let paused = true;
  addEventListener('keydown', (e) => {
    if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); return; }
    keys[e.code] = true;
    if (paused) return;
    if (e.code === 'Space') { inp.jump = true; e.preventDefault(); }
    if (e.code === 'KeyX') inp.let = true;
    if (e.code === 'KeyE') useOni();
    if (e.code === 'KeyF' || e.code === 'KeyQ') inp.fart = true;
    if (e.code === 'KeyM') openMap();
    if (e.code === 'Enter' && curDoor) curDoor.run();
    if (e.code === 'Escape') { show('ovMenu', true); setPaused(); }
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'KeyF' || e.code === 'KeyQ') inp.fart = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; inp.fart = false; joy.id = null; cam.id = null; $('joy').style.display = 'none'; });
  cv.addEventListener('pointerdown', (e) => {
    ac();
    if (e.pointerType !== 'mouse' && e.clientX < innerWidth * 0.45 && joy.id === null) {
      joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0;
      const j = $('joy'); j.style.display = 'block'; j.style.left = e.clientX + 'px'; j.style.top = e.clientY + 'px';
      $('joyHint').style.display = 'none';
    } else if (cam.id === null) { cam.id = e.pointerId; cam.lx = e.clientX; cam.ly = e.clientY; }
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* むし */ }
    e.preventDefault();
  });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerId === joy.id) {
      let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const l = Math.hypot(dx, dy), mx = 55;
      if (l > mx) { dx *= mx / l; dy *= mx / l; }
      joy.x = dx / mx; joy.y = dy / mx;
      $('joy').firstElementChild.style.transform = `translate(${dx}px,${dy}px)`;
    } else if (e.pointerId === cam.id) {
      cam.yaw -= (e.clientX - cam.lx) * 0.008; cam.pitch = clamp(cam.pitch + (e.clientY - cam.ly) * 0.006, -0.25, 1.25);
      cam.lx = e.clientX; cam.ly = e.clientY;
    }
  });
  function endPtr(e) {
    if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; $('joy').style.display = 'none'; $('joy').firstElementChild.style.transform = ''; }
    if (e.pointerId === cam.id) cam.id = null;
  }
  cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
  cv.addEventListener('wheel', (e) => { cam.dist = clamp(cam.dist + e.deltaY * 0.01, 5, 18); e.preventDefault(); }, { passive: false });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  function holdBtn(el, fn, up) {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); ac(); el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch (err) { /* むし */ } fn(); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => el.addEventListener(t, () => { el.classList.remove('on'); if (up) up(); }));
    el.addEventListener('click', (e) => e.preventDefault());
  }
  holdBtn($('bJump'), () => { inp.jump = true; });
  holdBtn($('bLet'), () => { inp.let = true; });
  holdBtn($('bOni'), useOni);
  holdBtn($('bFart'), () => { inp.fart = true; }, () => { inp.fart = false; });
  holdBtn($('bEnter'), () => { if (curDoor) curDoor.run(); });
  function readMove() {
    let mx = joy.x, my = -joy.y;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
    if (keys.KeyW || keys.ArrowUp) my += 1; if (keys.KeyS || keys.ArrowDown) my -= 1;
    const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
    if (l < 0.12) { mx = 0; my = 0; }
    inp.mx = mx; inp.my = my;
  }

  // ================= おと（WebAudio の ごうせいおん）=================
  let AC = null;
  function ac() {
    if (!save.sound) return null;
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(f, dur, type, vol, to, delay) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq, type) {
    const a = ac(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = type || 'bandpass'; f.frequency.value = freq || 800; g.gain.value = vol || 0.2;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }
  // おなら の おと（おしている あいだ ぶぶぶ…）
  let fartNode = null;
  function fartStart() {
    const a = ac(); if (!a || fartNode) return;
    const o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), f = a.createBiquadFilter(), g = a.createGain();
    o.type = 'sawtooth'; o.frequency.value = 78; lfo.frequency.value = 11; lg.gain.value = 26;
    lfo.connect(lg); lg.connect(o.frequency);
    f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 6;
    g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(0.22, a.currentTime + 0.04);
    o.connect(f); f.connect(g); g.connect(a.destination); o.start(); lfo.start();
    fartNode = { o, lfo, g }; noise(0.15, 0.25, 300, 'lowpass');
  }
  function fartStop() {
    if (!fartNode || !AC) { fartNode = null; return; }
    const { o, lfo, g } = fartNode, t = AC.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.frequency.setValueAtTime(o.frequency.value, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.12);
    o.stop(t + 0.15); lfo.stop(t + 0.15); fartNode = null;
  }
  const SFX = {
    jump: () => tone(380, 0.14, 'square', 0.05, 720),
    land: () => tone(140, 0.09, 'sine', 0.12, 70),
    star: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, null, i * 0.08)),
    big: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.13, null, i * 0.12)),
    pick: () => { tone(880, 0.08, 'square', 0.05); tone(1320, 0.12, 'square', 0.05, null, 0.07); },
    eat: () => { [0, 0.12, 0.24].forEach((d) => tone(300, 0.07, 'square', 0.05, 200, d)); tone(660, 0.3, 'triangle', 0.1, 990, 0.38); },
    chute: () => { noise(0.3, 0.25, 1400); tone(500, 0.2, 'triangle', 0.06, 800, 0.05); },
    stamp: () => [659, 880].forEach((f, i) => tone(f, 0.35, 'sine', 0.13, null, i * 0.15)),
    climb: () => tone(220 + Math.random() * 40, 0.05, 'triangle', 0.04),
    splash: () => noise(0.4, 0.3, 500),
    tired: () => tone(330, 0.3, 'sawtooth', 0.04, 160),
    door: () => [523, 784].forEach((f, i) => tone(f, 0.2, 'sine', 0.1, null, i * 0.1)),
    coin: () => { tone(1568, 0.08, 'square', 0.05); tone(2093, 0.25, 'square', 0.05, null, 0.06); },
    tap: () => tone(660, 0.04, 'triangle', 0.05),
  };
  // BGM（やさしい ループ）
  const MEL = [67, 69, 72, 74, 76, 74, 72, 69, 67, 64, 67, 69, 72, 0, 74, 0, 76, 79, 76, 74, 72, 74, 72, 69, 67, 69, 64, 62, 60, 0, 0, 0];
  const BASS = [48, 48, 55, 55, 53, 53, 48, 48];
  let bgmStep = 0, bgmNext = 0;
  function bgm() {
    const a = save.sound && AC; if (!a || paused || a.state !== 'running') return;
    if (bgmNext < a.currentTime) bgmNext = a.currentTime + 0.05;
    while (bgmNext < a.currentTime + 0.3) {
      const n = MEL[bgmStep % MEL.length], d = bgmNext - a.currentTime;
      if (n) tone(440 * Math.pow(2, (n - 69) / 12), 0.32, 'triangle', 0.035, null, d);
      if (bgmStep % 4 === 0) tone(440 * Math.pow(2, (BASS[(bgmStep / 4) % BASS.length] - 69) / 12), 0.7, 'sine', 0.05, null, d);
      bgmStep++; bgmNext += 0.26;
    }
  }

  // ================= おさいふ =================
  const DENOM = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];
  function walletTotal() { return DENOM.reduce((s, d) => s + d * (save.wallet[d] || 0), 0); }
  const Wallet = {
    get: () => Object.assign({}, save.wallet), total: walletTotal,
    set: (w) => { save.wallet = {}; DENOM.forEach((d) => { if (w[d]) save.wallet[d] = w[d]; }); store(); refreshHud(); },
    items: () => save.items.slice(), addItem: (id) => { save.items.push(id); store(); },
    gacha: () => Object.assign({}, save.gacha), addGacha: (id) => { save.gacha[id] = (save.gacha[id] || 0) + 1; store(); },
  };

  // ================= HUD =================
  let bannerT = 0;
  function banner(html, sec) { const b = $('banner'); b.innerHTML = html; b.classList.add('show'); bannerT = sec || 2.6; }
  function confetti() {
    const cols = ['#ffd43b', '#ff6b6b', '#4dabf7', '#51cf66', '#cc5de8', '#ff922b'];
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('div'); c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % cols.length];
      c.style.animationDelay = Math.random() * 0.8 + 's'; c.style.animationDuration = 2 + Math.random() * 1.5 + 's';
      document.body.appendChild(c); setTimeout(() => c.remove(), 4500);
    }
  }
  function refreshHud() {
    $('starN').textContent = save.stars.length; $('stampN').textContent = save.stamps.length;
    $('oniN').textContent = save.oni; $('bOni').classList.toggle('zero', !save.oni);
    $('money').textContent = walletTotal().toLocaleString();
    $('bSound').textContent = save.sound ? '🔊' : '🔇';
    let g;
    if (!save.stars.includes('lm-top')) g = '🎯 ランドマークタワーの てっぺんの きんの ほしを とろう！';
    else if (save.stars.length < STARS.length) g = '⭐ みなとみらいに かくれた ほしを ぜんぶ あつめよう';
    else if (save.stamps.length < ZONES.length) g = '📍 ぜんぶの ばしょに いってみよう（ちずで たしかめよう）';
    else g = '🏆 みなとみらい マスター！ すきなだけ たんけんしよう';
    $('goal').textContent = g;
  }
  function useOni() {
    if (paused) return;
    if (!save.oni) { banner('🍙 おにぎりが ないよ<small>まちの どこかで みつけよう</small>', 1.6); return; }
    save.oni--; P.st = maxSt(); P.tired = false; SFX.eat(); banner('🍙 もぐもぐ… げんき まんたん！', 1.4); store(); refreshHud();
  }

  // ================= ゲームの すすみ =================
  let time = 0, saveT = 0, climbSnd = 0, lastTalk = null, lastLab = '', curDoor = null, lastDoorId = '';
  const puffs = [];
  function update(dt) {
    time += dt;
    updatePlats(time);
    if (P.state === 'ride') { rideUpdate(dt); inp.jump = false; inp.let = false; afterUpdate(dt); return; }
    if (P.plat) { P.x += P.plat.dx; P.y += P.plat.dy; P.z += P.plat.dz; }
    readMove();
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    const dx = rx * inp.mx + fx * inp.my, dz = rz * inp.mx + fz * inp.my;
    const mag = Math.hypot(dx, dz);
    P.cool = Math.max(0, P.cool - dt);

    // スーパーおなら
    const wantFart = inp.fart && P.gas > 0.02;
    if (inp.fart && P.gas <= 0.02 && !P.noGasMsg) { P.noGasMsg = true; banner('💨 おならが でない…<small>じめんで まつか、🍠 おいも を たべよう</small>', 1.8); }
    if (!inp.fart) P.noGasMsg = false;
    if (wantFart) {
      if (P.state === 'climb') { release(); }
      if (!P.farting) { P.farting = true; fartStart(); }
      P.gas = Math.max(0, P.gas - 0.42 * dt);
      P.vy = Math.min(11, Math.max(P.vy, 0) + 40 * dt); P.glide = false; P.ground = false; P.plat = null;
      if (Math.random() < dt * 30) puffs.push({ x: P.x - Math.sin(P.face) * 0.3 + (Math.random() - 0.5) * 0.4, y: P.y + 0.5, z: P.z - Math.cos(P.face) * 0.3 + (Math.random() - 0.5) * 0.4, t: 0, vy: -2 - Math.random() * 2 });
    } else if (P.farting) { P.farting = false; fartStop(); }

    if (P.state === 'climb') climbUpdate(dt, rx, rz);
    else {
      const swim = P.state === 'swim';
      const speed = swim ? 3.6 : P.glide ? 7.5 : P.farting ? 8 : 7;
      const k = P.ground ? 14 : P.glide ? 3 : 5;
      P.vx += (dx * speed - P.vx) * Math.min(1, k * dt); P.vz += (dz * speed - P.vz) * Math.min(1, k * dt);
      if (inp.jump) {
        if (P.ground) { P.vy = JUMP; P.ground = false; P.plat = null; SFX.jump(); }
        else if (swim) { P.vy = 5.5; SFX.splash(); }
        else if (!P.farting) { P.glide = !P.glide; if (P.glide) SFX.chute(); }
      }
      if (P.farting) { /* うえ むきの ちから は うえで */ }
      else if (P.glide) { P.vy = Math.max(P.vy - GRAV * dt, -2.0); }
      else P.vy = Math.max(P.vy - GRAV * dt, -45);
      if (swim && P.vy < 0 && P.y <= WATER - 1.0 + 0.01) P.vy = 0;

      const wasGround = P.ground, fallV = P.vy;
      const hx = moveH('x', P.vx * dt, wasGround || swim);
      const hz = moveH('z', P.vz * dt, wasGround || swim);
      P.plat = null;
      const r = moveV(P.vy * dt);
      P.ground = r === 1;
      if (r !== 0) P.vy = 0;
      if (P.ground) { if (!wasGround && fallV < -8) SFX.land(); P.glide = false; }

      let inWater = false;
      if (!P.ground && P.y < WATER - 1.0) {
        if (P.state !== 'swim' && fallV < -4) SFX.splash();
        P.y = WATER - 1.0; if (P.vy < 0) P.vy = 0; inWater = true; P.glide = false;
      }
      if (!P.ground && P.y <= WATER - 0.99 && P.vy <= 0.01) inWater = true;

      // かべ のぼり の はじまり（ドアの まえ では のぼらない）
      const hit = hx || hz;
      const atDoorway = DOORS.some((d) => Math.hypot(d.x - P.x, d.z - P.z) < 2.6) && P.y < 0.5;
      if (hit && hit.b.climb && !atDoorway && mag > 0.3 && !P.tired && P.cool <= 0 && !P.farting) {
        const nx = hit.axis === 'x' ? hit.side : 0, nz = hit.axis === 'z' ? hit.side : 0;
        if ((dx * -nx + dz * -nz) / mag > 0.55 && hit.b.y1 - P.y > STEP) {
          P.state = 'climb'; P.wall = hit; P.vx = P.vy = P.vz = 0; P.glide = false; P.ground = false; P.plat = null; faceWall(hit);
        }
      }
      if (P.state !== 'climb') {
        P.state = P.ground ? 'ground' : inWater ? 'swim' : 'air';
        if (mag > 0.1) {
          const want = Math.atan2(dx, dz); let d = want - P.face;
          while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
          P.face += d * Math.min(1, 12 * dt);
        }
        P.speed = Math.hypot(P.vx, P.vz);
      }
    }
    inp.jump = false; inp.let = false;
    afterUpdate(dt);
  }

  function afterUpdate(dt) {
    const MS = maxSt();
    if (P.state === 'ground') {
      P.st = Math.min(MS, P.st + MS * 0.45 * dt); if (P.tired && P.st >= MS * 0.5) P.tired = false;
      P.gas = Math.min(1, P.gas + 0.16 * dt);
    }
    P.phase += dt * (P.state === 'climb' ? P.speed * 2.2 : P.speed * 1.5);
    for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.t += dt; p.y += p.vy * dt; p.vy *= 0.96; if (p.t > 1.3) puffs.splice(i, 1); }
    // ほし
    const cy = P.y + 0.8;
    for (const s of STARS) {
      if (save.stars.includes(s.id)) continue;
      if (Math.hypot(s.x - P.x, s.y - cy, s.z - P.z) < (s.big ? 2.4 : 1.6)) {
        save.stars.push(s.id); P.st = maxSt(); store();
        if (s.big) {
          SFX.big(); confetti();
          banner('🌟 やったー！ きんいろの ほしを ゲット！<small>とびおりて、そらで ジャンプ → パラシュート 🪂</small>', 5);
        } else if (save.stars.length === STARS.length) {
          SFX.big(); confetti(); banner('🏆 ほしを ぜんぶ あつめた！<small>みなとみらい マスターだ！</small>', 5);
        } else { SFX.star(); banner(`⭐ ほしを みつけた！（${save.stars.length}/${STARS.length}）<small>のぼれる ながさが のびたよ</small>`, 2.4); }
        refreshHud();
      }
    }
    for (const p of PICKS) {
      if (time - p.took < 45) continue;
      if (Math.hypot(p.x - P.x, p.y - cy, p.z - P.z) < 1.4) {
        if (p.t === 'oni') { if (save.oni >= 9) continue; save.oni++; banner('🍙 おにぎりを ひろった！', 1.4); }
        else { P.gas = 1; banner('🍠 おいもを たべた！ おならが まんたん 💨', 1.6); }
        p.took = time; SFX.pick(); store(); refreshHud();
      }
    }
    for (const z of ZONES) {
      if (save.stamps.includes(z.id)) continue;
      let inside = z.ride ? P.state === 'ride' : Math.hypot(z.x - P.x, z.z - P.z) < z.r;
      if (inside && z.minY !== undefined && P.y < z.minY) inside = false;
      if (inside) {
        save.stamps.push(z.id); store(); refreshHud(); SFX.stamp();
        if (bannerT < 1) banner(`📍 ${z.name} に ついた！<small>スタンプ ${save.stamps.length}/${ZONES.length}</small>`, 2.4);
      }
    }
    let nearN = null, nd = 4.5;
    for (const n of NPCS) { const d = Math.hypot(n.x - P.x, n.z - P.z); if (d < nd && Math.abs(n.y - P.y) < 3) { nd = d; nearN = n; } }
    if (P.state === 'ride') nearN = null;
    if (nearN !== lastTalk) {
      lastTalk = nearN; const t = $('talk');
      if (nearN) { t.dataset.who = nearN.who; t.textContent = nearN.say; t.style.display = 'block'; } else t.style.display = 'none';
    }
    if (P.y < -40) respawn();
    curDoor = null;
    if (P.state === 'ground' && P.y < 0.6) for (const d of DOORS) if (Math.hypot(d.x - P.x, d.z - P.z) < 2.4) { curDoor = d; break; }
    const did = curDoor ? curDoor.id : '';
    if (did !== lastDoorId) { lastDoorId = did; const b = $('bEnter'); b.hidden = !curDoor; if (curDoor) { b.innerHTML = curDoor.label; b.style.background = `rgb(${curDoor.color.map((v) => v * 255 | 0).join(',')})`; } }
    saveT += dt; if (saveT > 4) { saveT = 0; if (P.state === 'ground' && !P.plat) { save.pos = { x: P.x, y: P.y, z: P.z, yaw: cam.yaw }; store(); } }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
    const lab = P.state === 'ride' ? 'のって<br>いるよ' : P.state === 'climb' ? 'うえへ<br>ジャンプ' : (P.state === 'air' && !P.farting) ? (P.glide ? 'とじる' : '🪂<br>ひらく') : 'ジャンプ';
    if (lab !== lastLab) { lastLab = lab; $('bJump').innerHTML = lab; $('bLet').hidden = P.state !== 'climb'; }
    $('fartGauge').style.setProperty('--g', Math.round(P.gas * 100) + '%');
  }

  // --- エアキャビンに のる ---
  function startRide(from) {
    if (!CAB) return;
    P.ride = { s: from === 0 ? 0 : CAB.total, dir: from === 0 ? 1 : -1, to: from === 0 ? 1 : 0 };
    P.state = 'ride'; P.glide = false; P.vx = P.vy = P.vz = 0; P.wall = null; P.plat = null;
    banner('🚡 エアキャビン しゅっぱつ！<small>' + (from === 0 ? 'さくらぎちょう へ' : 'うんがパーク（ワールドポーターズ）へ') + '</small>', 3);
  }
  function rideUpdate(dt) {
    const r = P.ride; r.s += r.dir * dt * 5.2; readMove();
    const done = r.s <= 0 || r.s >= CAB.total;
    const p = CAB.at(r.s), o = r.dir > 0 ? 1.6 : -1.6;
    P.x = p.x - p.uz * o; P.z = p.z + p.ux * o; P.y = CAB.Y - 2.3; P.face = Math.atan2(p.ux * r.dir, p.uz * r.dir); P.speed = 0;
    if (done) {
      const e = CAB.ends[r.to]; P.x = e.door.x; P.z = e.door.z; P.y = 0; P.state = 'ground'; P.ground = true; P.ride = null;
      SFX.door(); banner(r.to === 0 ? '🚡 うんがパーク えきに ついた！<small>ワールドポーターズは すぐ そこ 🎪</small>' : '🚡 さくらぎちょう えきに ついた！', 3);
    }
  }

  function climbUpdate(dt, rx, rz) {
    const w = P.wall, b = w.b, a = w.axis, t = a === 'x' ? 'z' : 'x';
    let rt = t === 'x' ? rx : rz;
    if (Math.abs(rt) < 0.3) { const fr = t === 'x' ? Math.cos(P.face) : -Math.sin(P.face); rt = fr; }
    const s = rt >= 0 ? 1 : -1;
    if (inp.let) { release(); return; }
    if (inp.jump && P.st > 0.05) { P.boost = 0.28; P.st -= 0.16; SFX.jump(); }
    const moving = Math.abs(inp.mx) + Math.abs(inp.my) > 0.1;
    let vy = inp.my * 3.2, vl = inp.mx * s * 3.2;
    if (P.boost > 0) { P.boost -= dt; vy = 9; }
    if (moving || P.boost > 0) P.st -= 0.09 * dt;
    P.speed = Math.hypot(vy, vl);
    if (P.st <= 0) { P.st = 0; P.tired = true; SFX.tired(); banner('😵 へとへと… てが はなれちゃった<small>ジャンプで パラシュート！</small>', 1.8); release(); return; }
    P[a] = wallCoord(w);
    const hit = moveH(t, vl * dt, false);
    if (hit && hit.b.climb && hit.b !== b) { P.wall = hit; faceWall(hit); return; }
    if (P[t] > b[t + '1'] + R * 0.6 || P[t] < b[t + '0'] - R * 0.6) {
      const side = P[t] > b[t + '1'] ? 1 : -1;
      const nw = { b, axis: t, side };
      const along = w.side > 0 ? b[a + '1'] - R - 0.05 : b[a + '0'] + R + 0.05;
      const ox = P.x, oz = P.z;
      P[t] = wallCoord(nw); P[a] = along;
      if (anyHit(P.x, P.y, P.z)) { P.x = ox; P.z = oz; P[t] = side > 0 ? b[t + '1'] + R * 0.6 : b[t + '0'] - R * 0.6; }
      else { P.wall = nw; faceWall(nw); return; }
    }
    // となりの はこ が おなじ かべを つづけて いたら のりかえる（ななめの たてもの）
    if (Math.abs(P[t] - (vl > 0 ? b[t + '1'] : b[t + '0'])) < R && vl !== 0) {
      const coord = w.side > 0 ? b[a + '1'] : b[a + '0'];
      for (const o of around(P.x, P.z)) {
        if (o === b || !o.climb || o.y1 <= P.y + 0.3 || o.y0 > P.y + 1) continue;
        const oc = w.side > 0 ? o[a + '1'] : o[a + '0'];
        if (Math.abs(oc - coord) < 0.6 && P[t] > o[t + '0'] - R && P[t] < o[t + '1'] + R) { P.wall = { b: o, axis: a, side: w.side }; P[a] = wallCoord(P.wall); return; }
      }
    }
    const r = moveV(vy * dt);
    if (r === 1) { P.state = 'ground'; P.ground = true; P.wall = null; return; }
    if (r === -1 && ceilB && ceilB.climb && ceilB.y1 - P.y < 3.2 && !anyHit(P.x, ceilB.y1 + 0.001, P.z)) {
      P.y = ceilB.y1; P.state = 'ground'; P.ground = true; P.wall = null; P.boost = 0; SFX.land(); return;
    }
    if (P.y > b.y1 - 0.35) {
      const coord = w.side > 0 ? b[a + '1'] : b[a + '0'];
      for (const o of around(P.x, P.z)) {
        if (o === b || !o.climb) continue;
        const oc = w.side > 0 ? o[a + '1'] : o[a + '0'], inward = (coord - oc) * w.side;
        if (inward > -0.02 && inward < 0.9 && Math.abs(o.y0 - b.y1) < 0.05 && o.y1 > b.y1 && P[t] > o[t + '0'] - R && P[t] < o[t + '1'] + R) {
          P.wall = { b: o, axis: a, side: w.side }; P[a] = wallCoord(P.wall); return;
        }
      }
      const inw = Math.min(R + 0.12, (b[a + '1'] - b[a + '0']) / 2);
      const nx = w.side > 0 ? b[a + '1'] - inw : b[a + '0'] + inw;
      const ox = P[a], oy = P.y; P[a] = nx; P.y = b.y1;
      if (!anyHit(P.x, P.y + 0.001, P.z)) { P.state = 'ground'; P.ground = true; P.wall = null; P.boost = 0; P.vy = 0; return; }
      P[a] = ox; P.y = Math.min(oy, b.y1 - 0.35);
    }
    if (P.y + 1.2 < b.y0) { release(); return; }
    if (moving && (climbSnd -= dt) < 0) { climbSnd = 0.32; SFX.climb(); }
  }
  function release() {
    const w = P.wall; P.state = 'air'; P.wall = null; P.cool = 0.45; P.ground = false; P.boost = 0;
    if (w) { const push = 2.2; if (w.axis === 'x') P.vx = w.side * push; else P.vz = w.side * push; } P.vy = 0;
  }
  function respawn() {
    P.x = START.x; P.y = START.y; P.z = START.z; P.vx = P.vy = P.vz = 0; P.state = 'ground'; P.wall = null; P.glide = false;
    P.plat = null; P.ride = null; P.st = maxSt(); P.tired = false; cam.yaw = START.yaw; P.face = START.face;
  }

  // ================= えがく =================
  const SUN = (() => { const v = [0.45, 0.8, 0.35]; const l = Math.hypot(...v); return v.map((x) => x / l); })();
  let proj = I(), view = I(), eye = [0, 0, 0];
  function bindMesh(m) {
    gl.bindBuffer(gl.ARRAY_BUFFER, m.buf);
    gl.vertexAttribPointer(A.aPos, 3, gl.FLOAT, false, 40, 0);
    gl.vertexAttribPointer(A.aNor, 3, gl.FLOAT, false, 40, 12);
    gl.vertexAttribPointer(A.aCol, 3, gl.FLOAT, false, 40, 24);
    gl.vertexAttribPointer(A.aKind, 1, gl.FLOAT, false, 40, 36);
  }
  let bound = null;
  function draw(m, model, tint, emit, alpha) {
    if (bound !== m) { bindMesh(m); bound = m; }
    gl.uniformMatrix4fv(U.uModel, false, model);
    gl.uniform3fv(U.uTint, tint || W); gl.uniform1f(U.uEmit, emit || 0); gl.uniform1f(U.uAlpha, alpha === undefined ? 1 : alpha);
    gl.drawArrays(gl.TRIANGLES, 0, m.n);
  }
  function part(base, x, y, z, sx, sy, sz, col, rot) {
    draw(mCube, rot ? M(base, T(x, y, z), rot, T(0, -sy / 2, 0), S(sx, sy, sz)) : M(base, T(x, y, z), S(sx, sy, sz)), col);
  }
  function poseAngles(pose, phase) {
    let lg = 0, ar = 0, al = 0;
    if (pose === 'walk') { lg = Math.sin(phase) * 0.7; ar = -lg; al = lg; }
    else if (pose === 'climb') { lg = Math.sin(phase) * 0.5; ar = Math.PI * 0.85 + Math.sin(phase) * 0.35; al = Math.PI * 0.85 - Math.sin(phase) * 0.35; }
    else if (pose === 'up') { ar = al = Math.PI * 0.92; lg = 0.15; }
    else if (pose === 'swim') { ar = Math.PI * 0.5 + Math.sin(phase * 2) * 0.8; al = Math.PI * 0.5 - Math.sin(phase * 2) * 0.8; lg = Math.sin(phase * 3) * 0.4; }
    else if (pose === 'air') { ar = al = 2.4; lg = 0.4; }
    else if (pose === 'fart') { ar = al = 2.9; lg = 0.6 + Math.sin(phase * 6) * 0.2; }
    else if (pose === 'sit') { lg = 1.4; }
    return { lg, ar, al };
  }
  function person(x, y, z, face, shirt, pose, phase) { // おとなの ひと
    const base = M(T(x, y, z), RY(face)); const { lg, ar, al } = poseAngles(pose, phase);
    part(base, -0.13, 0.72, 0, 0.2, 0.72, 0.22, C.navy, RX(lg));
    part(base, 0.13, 0.72, 0, 0.2, 0.72, 0.22, C.navy, RX(-lg));
    part(base, 0, 0.98, 0, 0.56, 0.58, 0.36, shirt);
    part(base, -0.36, 1.24, 0, 0.16, 0.54, 0.18, shirt, RX(-al));
    part(base, 0.36, 1.24, 0, 0.16, 0.54, 0.18, shirt, RX(-ar));
    part(base, 0, 1.5, 0, 0.52, 0.48, 0.48, C.skin);
    part(base, 0, 1.56, -0.06, 0.55, 0.42, 0.42, C.hair);
    part(base, -0.11, 1.5, 0.245, 0.07, 0.1, 0.02, C.black); part(base, 0.11, 1.5, 0.245, 0.07, 0.1, 0.02, C.black);
    return base;
  }
  function drawAo() { // 5さいの おとこのこ: あたま おおきめ・あし みじかめ
    let pose = 'stand';
    if (P.state === 'ride') pose = 'sit';
    else if (P.state === 'climb') pose = 'climb';
    else if (P.state === 'swim') pose = 'swim';
    else if (P.farting) pose = 'fart';
    else if (P.glide) pose = 'up';
    else if (P.state === 'air') pose = 'air';
    else if (P.speed > 0.5) pose = 'walk';
    const base = M(T(P.x, P.y, P.z), RY(P.face)); const { lg, ar, al } = poseAngles(pose, P.phase);
    part(base, -0.12, 0.52, 0, 0.19, 0.5, 0.2, hex('#3b4a6b'), RX(lg));          // はんズボン
    part(base, 0.12, 0.52, 0, 0.19, 0.5, 0.2, hex('#3b4a6b'), RX(-lg));
    part(base, -0.12, 0.1, 0.03, 0.2, 0.14, 0.28, C.white, lg ? RX(lg * 0.6) : null); // くつ
    part(base, 0.12, 0.1, 0.03, 0.2, 0.14, 0.28, C.white, lg ? RX(-lg * 0.6) : null);
    part(base, 0, 0.76, 0, 0.5, 0.5, 0.32, C.blue);                                   // あおい Tシャツ
    draw(mStar, M(base, T(0, 0.8, 0.17), S(0.13, 0.13, 0.06)), C.yellow, 0.6);
    part(base, -0.31, 0.98, 0, 0.14, 0.44, 0.16, C.blue, RX(-al));
    part(base, 0.31, 0.98, 0, 0.14, 0.44, 0.16, C.blue, RX(-ar));
    part(base, 0, 1.32, 0, 0.62, 0.58, 0.56, C.skin);                                 // おおきな あたま
    part(base, 0, 1.4, -0.06, 0.65, 0.46, 0.5, hex('#2b1d14'));                         // みじかい かみ
    part(base, -0.13, 1.3, 0.285, 0.08, 0.12, 0.02, C.black); part(base, 0.13, 1.3, 0.285, 0.08, 0.12, 0.02, C.black);
    part(base, -0.2, 1.2, 0.285, 0.09, 0.05, 0.02, C.pink); part(base, 0.2, 1.2, 0.285, 0.09, 0.05, 0.02, C.pink);
    part(base, 0, 1.15, 0.285, 0.12, 0.04, 0.02, hex('#c2410c'));                     // くち
    part(base, 0, 1.66, 0, 0.66, 0.16, 0.6, C.cap);                                    // あおい ぼうし
    part(base, 0, 1.61, 0.38, 0.56, 0.05, 0.28, C.cap);
    if (P.glide) draw(mChute, M(base, T(0, 4.0, 0)), W);
  }
  function groundBelow(x, y, z) {
    let g = WATER;
    for (const b of near(x - 0.2, z - 0.2, x + 0.2, z + 0.2)) if (x + 0.1 > b.x0 && x - 0.1 < b.x1 && z + 0.1 > b.z0 && z - 0.1 < b.z1 && b.y1 <= y + 0.05 && b.y1 > g) g = b.y1;
    for (const p of plats) if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1 && p.y1 <= y + 0.05 && p.y1 > g) g = p.y1;
    return g;
  }
  function rayBox(o, d, b) {
    let t0 = 0, t1 = 1;
    for (const [ax, i] of [['x', 0], ['y', 1], ['z', 2]]) {
      const lo = b[ax + '0'] - 0.2, hi = b[ax + '1'] + 0.2;
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < lo || o[i] > hi) return 2; continue; }
      let a = (lo - o[i]) / d[i], c = (hi - o[i]) / d[i]; if (a > c) { const s = a; a = c; c = s; }
      t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return 2;
    }
    return t0;
  }
  function project(x, y, z) {
    const v = mul(proj, view);
    const cx = v[0] * x + v[4] * y + v[8] * z + v[12], cy = v[1] * x + v[5] * y + v[9] * z + v[13], cw = v[3] * x + v[7] * y + v[11] * z + v[15];
    if (cw <= 0) return null;
    return [(cx / cw * 0.5 + 0.5) * innerWidth, (0.5 - cy / cw * 0.5) * innerHeight];
  }
  function gondola(x, y, z, face, col) {
    const base = M(T(x, y, z), RY(face));
    draw(mCube, M(base, T(0, 1.0, 0), S(2.1, 2.0, 2.1)), col);
    draw(mCube, M(base, T(0, 1.2, 0), S(2.16, 0.9, 1.7)), [0.55, 0.8, 1]);
    draw(mCube, M(base, T(0, 1.2, 0), S(1.7, 0.9, 2.16)), [0.55, 0.8, 1]);
    draw(mCube, M(base, T(0, 2.1, 0), S(2.2, 0.2, 2.2)), C.white);
    draw(mCube, M(base, T(0, 2.9, 0), S(0.12, 1.5, 0.12)), C.navy);
  }

  function render() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.floor(innerWidth * dpr), h = Math.floor(innerHeight * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    gl.viewport(0, 0, w, h);
    gl.clearColor(C.sky[0], C.sky[1], C.sky[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);

    const tgt = [P.x, P.y + 1.2, P.z];
    const cp = Math.cos(cam.pitch);
    const dir = [Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp];
    let dist = cam.dist + (P.state === 'climb' ? 2 : 0) + (P.glide || P.farting ? 3 : 0) + (P.state === 'ride' ? 5 : 0);
    const d = [dir[0] * dist, dir[1] * dist, dir[2] * dist];
    let tm = 1;
    if (P.state !== 'ride') {
      const ex = tgt[0] + d[0], ez = tgt[2] + d[2];
      for (const b of near(Math.min(tgt[0], ex), Math.min(tgt[2], ez), Math.max(tgt[0], ex), Math.max(tgt[2], ez))) { const tt = rayBox(tgt, d, b); if (tt < tm) tm = tt; }
    }
    dist = Math.max(1.2, dist * tm - 0.25);
    eye = [tgt[0] + dir[0] * dist, Math.max(WATER + 0.4, tgt[1] + dir[1] * dist), tgt[2] + dir[2] * dist];
    proj = persp(1.05, w / h, 0.1, 1200); view = lookAt(eye, tgt);
    gl.uniformMatrix4fv(U.uProj, false, proj); gl.uniformMatrix4fv(U.uView, false, view);
    gl.uniform3fv(U.uSun, SUN); gl.uniform3fv(U.uFog, C.sky); gl.uniform3fv(U.uCam, eye); gl.uniform1f(U.uTime, time);
    bound = null;

    draw(staticMesh, I(), W);
    // かんらんしゃ
    const ang = time * Math.PI * 2 / FW.period, rotP = FW.axis === 'x' ? -Math.PI / 2 : 0;
    draw(mWheel, M(T(FW.cx, FW.hub, FW.cz), RY(rotP), RZ(ang)), W);
    draw(mClock, M(T(FW.cx, FW.hub, FW.cz), RY(rotP), T(0, 0, 0.35)), W, 0.3);
    draw(mClock, M(T(FW.cx, FW.hub, FW.cz), RY(rotP), T(0, 0, -0.35)), W, 0.3);
    const now = new Date(), hr = (now.getHours() % 12 + now.getMinutes() / 60) / 12 * Math.PI * 2, mn = now.getMinutes() / 60 * Math.PI * 2;
    [0.4, -0.4].forEach((zo) => {
      draw(mCube, M(T(FW.cx, FW.hub, FW.cz), RY(rotP), T(0, 0, zo), RZ(-hr), T(0, 0.8, 0), S(0.25, 1.6, 0.05)), C.white, 1);
      draw(mCube, M(T(FW.cx, FW.hub, FW.cz), RY(rotP), T(0, 0, zo), RZ(-mn), T(0, 1.2, 0), S(0.15, 2.4, 0.05)), C.yellow, 1);
    });
    cabins.forEach((p, i) => {
      draw(mCube, M(T(p.cx, p.cy - 0.8, p.cz), S(2.2, 1.6, 2.2)), CAB_COL[i % CAB_COL.length]);
      draw(mCube, M(T(p.cx, p.cy - 0.75, p.cz), S(2.26, 0.6, 1.6)), [0.6, 0.85, 1]);
    });
    // エアキャビンの ゴンドラ
    if (CAB) {
      const n = 12, cyc = CAB.total * 2;
      for (let i = 0; i < n; i++) {
        const u = ((time * 5.2 + i / n * cyc) % cyc + cyc) % cyc;
        const fwd = u < CAB.total, s = fwd ? u : cyc - u, p = CAB.at(s), o = fwd ? 1.6 : -1.6;
        const x = p.x - p.uz * o, z = p.z + p.ux * o;
        if (P.state === 'ride' && Math.hypot(x - P.x, z - P.z) < 4) continue;
        gondola(x, CAB.Y - 2.4, z, Math.atan2(p.ux, p.uz), i % 3 ? C.white : hex('#d0ebff'));
      }
      if (P.state === 'ride') gondola(P.x, CAB.Y - 2.4, P.z, P.face, hex('#ffe066'));
    }
    NPCS.forEach((n) => {
      const f = Math.hypot(P.x - n.x, P.z - n.z) < 8 ? Math.atan2(P.x - n.x, P.z - n.z) : 0;
      person(n.x, n.y, n.z, f, n.col, 'stand', 0);
    });
    PICKS.forEach((p) => {
      if (time - p.took < 45) return;
      const bob = Math.sin(time * 2 + p.x) * 0.15;
      if (p.t === 'oni') draw(mOni, M(T(p.x, p.y + bob, p.z), RY(time * 1.5), S(1.1)), W);
      else draw(mImo, M(T(p.x, p.y + bob, p.z), RY(time * 1.5), S(1, 0.75, 0.75)), W);
    });
    STARS.forEach((s) => {
      if (save.stars.includes(s.id)) return;
      const sc = s.big ? 1.8 : 1;
      draw(mStar, M(T(s.x, s.y + Math.sin(time * 2.2 + s.x) * 0.15, s.z), RY(time * 2), S(sc)), s.big ? C.gold : C.yellow, 0.75);
    });
    for (let i = 0; i < 9; i++) {
      const a = time * 0.22 + i * 0.9, r = 40 + i * 12, cx = 80 + i * 15, cz = 20 - i * 10;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, y = 22 + i * 3 + Math.sin(time + i) * 2, fl = Math.sin(time * 8 + i) * 0.5;
      const base = M(T(x, y, z), RY(-a));
      draw(mCube, M(base, S(0.25, 0.25, 0.7)), C.white);
      draw(mCube, M(base, RZ(fl), T(0.6, 0, 0), S(1.2, 0.06, 0.4)), C.white);
      draw(mCube, M(base, RZ(-fl), T(-0.6, 0, 0), S(1.2, 0.06, 0.4)), C.white);
    }
    drawAo();

    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    puffs.forEach((p) => { const s = 0.3 + p.t * 0.9; draw(mSphere, M(T(p.x, p.y, p.z), S(s)), [0.78, 0.82, 0.35], 0.6, 0.55 * (1 - p.t / 1.3)); });
    const gy = P.state === 'climb' || P.state === 'ride' ? null : groundBelow(P.x, P.y, P.z);
    if (gy !== null && P.y - gy < 30) draw(mDisc, M(T(P.x, gy + 0.03, P.z), S(0.45 * Math.max(0.4, 1 - (P.y - gy) / 30))), C.black, 1, 0.3);
    STARS.forEach((s) => {
      if (save.stars.includes(s.id)) return;
      const big = s.big;
      draw(mCube, M(T(s.x, s.y + 30, s.z), S(big ? 0.9 : 0.45, 60, big ? 0.9 : 0.45)), big ? C.gold : C.yellow, 1, big ? 0.32 : 0.2);
    });
    DOORS.forEach((dd) => draw(mCube, M(T(dd.x, 20, dd.z), S(0.8, 40, 0.8)), dd.color, 1, 0.14 + 0.06 * Math.sin(time * 3)));
    gl.depthMask(true); gl.disable(gl.BLEND);

    const MS = maxSt(), sv = $('stam');
    const showSt = P.st < MS - 0.01 || P.state === 'climb';
    sv.style.opacity = showSt ? 1 : 0;
    if (showSt) {
      const sp = project(P.x, P.y + 1.3, P.z);
      if (sp) { sv.style.transform = `translate(${sp[0] + 34}px, ${sp[1] - 70}px)`; }
      const c = 2 * Math.PI * 23; const fg = $('stamFg');
      fg.style.strokeDasharray = c; fg.style.strokeDashoffset = c * (1 - clamp(P.st / MS, 0, 1));
      sv.classList.toggle('tired', P.tired || P.st / MS < 0.25);
    }
  }

  // ================= ちず =================
  const MAPB = (() => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; MAP.land.forEach(([a, b, c, d]) => { x0 = Math.min(x0, OX + a * CELL); z0 = Math.min(z0, OZ + b * CELL); x1 = Math.max(x1, OX + c * CELL); z1 = Math.max(z1, OZ + d * CELL); }); return { x0: x0 - 10, z0: z0 - 10, x1: x1 + 10, z1: z1 + 10 }; })();
  let mapBase = null;
  function drawMap() {
    const c = $('mapCv'), x = c.getContext('2d'), Wd = c.width, Hd = c.height;
    const sc = Math.min(Wd / (MAPB.x1 - MAPB.x0), Hd / (MAPB.z1 - MAPB.z0));
    const ox = (Wd - (MAPB.x1 - MAPB.x0) * sc) / 2, oz = (Hd - (MAPB.z1 - MAPB.z0) * sc) / 2;
    const px = (v) => ox + (v - MAPB.x0) * sc, pz = (v) => oz + (v - MAPB.z0) * sc;
    const css = (col) => `rgb(${col.map((v) => Math.round(v * 255)).join(',')})`;
    if (!mapBase) {
      const m = document.createElement('canvas'); m.width = Wd; m.height = Hd; const y = m.getContext('2d');
      y.fillStyle = '#3d8fd6'; y.fillRect(0, 0, Wd, Hd);
      y.fillStyle = css(C.land);
      MAP.land.forEach(([a, b, cc, d]) => y.fillRect(px(OX + a * CELL) - 0.3, pz(OZ + b * CELL) - 0.3, (cc - a) * CELL * sc + 0.6, (d - b) * CELL * sc + 0.6));
      y.fillStyle = css(C.grass);
      MAP.green.forEach((g) => { y.beginPath(); for (let i = 0; i < g.p.length; i += 2) y[i ? 'lineTo' : 'moveTo'](px(g.p[i]), pz(g.p[i + 1])); y.closePath(); y.fill(); });
      y.strokeStyle = '#9aa1ab'; y.lineCap = 'round';
      MAP.roads.forEach((r) => { if (r.a || WALK[r.c]) return; y.lineWidth = Math.max(1, r.w * sc); y.beginPath(); for (let i = 0; i < r.p.length; i += 2) y[i ? 'lineTo' : 'moveTo'](px(r.p[i]), pz(r.p[i + 1])); y.stroke(); });
      BLD.forEach((b) => { y.fillStyle = css(shade(b.col, b.y1 > 10 ? 0.6 : 0.78)); y.beginPath(); for (let i = 0; i < b.p.length; i += 2) y[i ? 'lineTo' : 'moveTo'](px(b.p[i]), pz(b.p[i + 1])); y.closePath(); y.fill(); });
      if (CAB) { y.strokeStyle = '#1c2b4a'; y.lineWidth = 2; y.setLineDash([5, 4]); y.beginPath(); CAB.pts.forEach((q, i) => y[i ? 'lineTo' : 'moveTo'](px(q[0]), pz(q[1]))); y.stroke(); y.setLineDash([]); }
      mapBase = m;
    }
    x.drawImage(mapBase, 0, 0);
    x.font = 'bold 13px sans-serif'; x.textAlign = 'center';
    ZONES.forEach((z) => {
      if (z.id === 'lmtop' || z.id === 'aircabin') return;
      const got = save.stamps.includes(z.id);
      const t = (got ? '📍' : '❔') + z.name;
      x.lineWidth = 4; x.strokeStyle = 'rgba(255,255,255,.9)'; x.strokeText(t, px(z.x), pz(z.z) - 8);
      x.fillStyle = got ? '#1c2b4a' : '#74819b'; x.fillText(t, px(z.x), pz(z.z) - 8);
    });
    x.font = '18px sans-serif';
    DOORS.forEach((d) => { const ic = d.label.split('<')[0]; x.fillText(ic, px(d.x), pz(d.z) + 6); });
    x.font = 'bold 18px sans-serif';
    STARS.forEach((s) => {
      const got = save.stars.includes(s.id);
      x.fillStyle = got ? 'rgba(80,80,80,.55)' : (s.big ? '#ffb700' : '#ffd43b');
      x.lineWidth = 3; x.strokeStyle = '#5a3d00';
      if (!got) x.strokeText('★', px(s.x), pz(s.z) + 6);
      x.fillText('★', px(s.x), pz(s.z) + 6);
    });
    x.save(); x.translate(px(P.x), pz(P.z)); x.rotate(-P.face + Math.PI);
    x.fillStyle = '#2f6fe0'; x.strokeStyle = '#fff'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(0, -13); x.lineTo(9, 9); x.lineTo(0, 4); x.lineTo(-9, 9); x.closePath(); x.stroke(); x.fill();
    x.restore();
    x.font = '11px sans-serif'; x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,.9)'; x.fillText('© OpenStreetMap contributors', Wd - 6, Hd - 6);
    const box = $('stamps'); box.innerHTML = '';
    ZONES.forEach((z) => { const s = document.createElement('span'); s.textContent = (save.stamps.includes(z.id) ? '📍 ' : '') + z.name; if (save.stamps.includes(z.id)) s.className = 'got'; box.appendChild(s); });
  }

  // ================= がめん の きりかえ =================
  function show(id, on) { $(id).classList.toggle('show', on); }
  function stepOut() { if (curDoor) { const d = curDoor; P.x = d.x; P.z = d.z; P.y = 0; } P.vx = P.vz = 0; lastDoorId = '-'; }
  function enterKumon() {
    if (!window.Kumon) return;
    SFX.door(); show('ovKumon', true); setPaused();
    window.Kumon.open({
      sfx: (n) => { if (n === 'tap') SFX.tap(); else if (n === 'ng') SFX.tired(); else if (n === 'good') SFX.star(); else if (n === 'pass') { SFX.big(); confetti(); } },
      onReward: (r) => {
        if (r.type === 'print') { save.wallet[1000] = (save.wallet[1000] || 0) + 1; store(); refreshHud(); SFX.coin(); return 'ごほうびに 💴 1000えん もらった！（おさいふ ' + walletTotal().toLocaleString() + 'えん）'; }
        save.oni = Math.min(9, save.oni + 3); store(); refreshHud();
        return 'ごうかくの ごほうびに 🍙 おにぎり を 3こ もらった！';
      },
      onClose: () => { show('ovKumon', false); stepOut(); setPaused(); banner('🏫 また きてね！<small>いまは ' + window.Kumon.level + ' きょうざい</small>', 2); },
    });
  }
  function openShop(kind, arg) {
    if (!window.Shops) return;
    SFX.door(); show('ovShop', true); setPaused();
    window.Shops.open(kind, {
      arg, wallet: Wallet, sfx: (n) => (SFX[n] ? SFX[n]() : SFX.tap()), tone, confetti,
      onClose: (res) => {
        show('ovShop', false); setPaused(); refreshHud();
        if (res && res.ride !== undefined) { startRide(res.ride); return; }
        stepOut();
      },
    });
  }
  function anyOv() { return ['ovTitle', 'ovHow', 'ovMap', 'ovMenu', 'ovKumon', 'ovShop'].some((i) => $(i).classList.contains('show')); }
  function setPaused() {
    paused = anyOv();
    if (paused) { joy.id = null; joy.x = joy.y = 0; inp.fart = false; $('joy').style.display = 'none'; if (P.farting) { P.farting = false; fartStop(); } }
  }
  function openMap() { drawMap(); show('ovMap', true); setPaused(); }
  $('money').parentElement.addEventListener('click', () => openShop('wallet'));
  $('bStart').addEventListener('click', () => { ac(); show('ovTitle', false); setPaused(); if (!save.seenTitle) { save.seenTitle = true; store(); banner('🧢 あおちゃんの だいぼうけん スタート！<small>おさいふに 5000えん。まずは ランドマークタワーへ</small>', 3.5); } });
  $('bHow1').addEventListener('click', () => { show('ovHow', true); });
  $('bHow2').addEventListener('click', () => { show('ovMenu', false); show('ovHow', true); });
  $('bHowOk').addEventListener('click', () => { show('ovHow', false); setPaused(); });
  $('bMap').addEventListener('click', openMap);
  $('bMapOk').addEventListener('click', () => { show('ovMap', false); setPaused(); });
  $('bMenu').addEventListener('click', () => { show('ovMenu', true); setPaused(); });
  $('bResume').addEventListener('click', () => { show('ovMenu', false); setPaused(); });
  $('bHome').addEventListener('click', () => { respawn(); show('ovMenu', false); setPaused(); });
  $('bReset').addEventListener('click', () => {
    if (!confirm('ほし・スタンプ・おかね・かったもの を ぜんぶ けして、さいしょから はじめる？')) return;
    const snd = save.sound; save = fresh(); save.sound = snd; save.seenTitle = true; store(); respawn(); refreshHud();
    show('ovMenu', false); setPaused();
  });
  $('bSound').addEventListener('click', () => { save.sound = !save.sound; store(); refreshHud(); if (save.sound) ac(); else if (AC) AC.suspend(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && !anyOv()) { show('ovMenu', true); setPaused(); } });
  if (save.seenTitle) $('bStart').textContent = 'つづきから';

  // ================= ループ =================
  refreshHud();
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!paused) {
      const n = dt > 0.025 ? 2 : 1;
      for (let i = 0; i < n; i++) update(dt / n);
      bgm();
    }
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // テスト用の のぞき窓
  window.__mm = { P, get save() { return save; }, cam, STARS, solids, inp, keys, update, DOORS, POI, CAB, ZONES, START, startRide, openShop, near, set paused(v) { paused = v; } };
})();
