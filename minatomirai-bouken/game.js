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
  function fresh() { return { stars: [], stamps: [], oni: 2, pos: null, sound: true, seenTitle: false, wallet: { 1000: 5 }, items: [], gacha: {}, clock: { day: 0, min: 450 }, zoo: {}, errand: null, cal: {}, settings: { vol: 80, cam: 1, big: false, talk: 1, speed: 1, gfx: 2, prop: 0 }, piggy: {} }; }
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
uniform vec3 uSun; uniform vec3 uFog; uniform vec3 uCam; uniform float uTime; uniform float uEmit; uniform float uAlpha; uniform float uFogN; uniform float uFogF; uniform float uLight; uniform float uNight;
void main(){
  vec3 n = normalize(vNor); vec3 col = vCol; float glow = 0.0;
  if (vKind > 0.5 && vKind < 1.5) {          // まど
    float side = 1.0 - abs(n.y);
    float wy = step(0.42, fract(vW.y * 0.9));
    float wx = step(0.3, fract((vW.x + vW.z) * 0.75));
    col = mix(col, vec3(0.32, 0.47, 0.62), wy * wx * side * 0.8);
    float on = step(0.55, fract(sin(dot(floor(vec3(vW.x * 0.75, vW.y * 0.9, vW.z * 0.75)), vec3(12.9, 78.2, 37.7))) * 43758.5));
    glow = wy * wx * side * on * uNight;
  } else if (vKind > 1.5 && vKind < 2.5) {   // うみ
    float s = sin(vW.x * 0.35 + uTime * 1.3) * sin(vW.z * 0.3 - uTime * 1.1);
    float s2 = sin((vW.x + vW.z) * 0.9 + uTime * 2.0);
    col += vec3(0.06, 0.08, 0.1) * s + vec3(0.05) * step(0.93, s2 * s);
  } else if (vKind > 2.5 && vKind < 3.5) {   // レンガ
    float row = floor(vW.y * 3.0);
    float bx = fract((vW.x + vW.z) * 1.4 + mod(row, 2.0) * 0.5);
    float by = fract(vW.y * 3.0);
    col *= 1.0 - 0.25 * (step(0.88, by) + step(0.92, bx)) * (1.0 - abs(n.y));
  } else if (vKind > 3.5 && vKind < 4.5) {   // しばふ
    col *= 0.94 + 0.08 * sin(vW.x * 1.7) * sin(vW.z * 1.3);
  }
  float d = max(dot(n, uSun), 0.0);
  vec3 lit = col * (0.5 + 0.12 * n.y + 0.55 * d) * (0.22 + 0.78 * uLight);
  lit = mix(lit, col, uEmit);
  if (vKind > 4.5) lit = col;                // ひかる もの（ちょうちん など）
  lit = mix(lit, vec3(1.0, 0.86, 0.5), glow * 0.85); // よるの まどの あかり
  float dist = length(vW - uCam);
  float f = clamp((dist - uFogN) / (uFogF - uFogN), 0.0, 1.0);
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
  ['uProj', 'uView', 'uModel', 'uTint', 'uSun', 'uFog', 'uCam', 'uTime', 'uEmit', 'uAlpha', 'uFogN', 'uFogF', 'uLight', 'uNight'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

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
  const LM_HEIGHT = 110; // ほんとうは 74（295.8m）。ゲームでは もっと たかく
  MAP.bld.forEach((b) => { if (b.n === '横浜ランドマークタワー') b.y1 = LM_HEIGHT; if (b.n === 'プラウド横浜桜木町') b.y1 = 8.4; }); // プラウドは 10かいだて
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
    const cands = [];
    BLD.forEach((b) => {
      if (!mine(b)) return;
      const p = b.p, n = p.length / 2;
      for (let i = 0; i < n; i++) {
        const xa = p[i * 2], za = p[i * 2 + 1], xb = p[((i + 1) % n) * 2], zb = p[((i + 1) % n) * 2 + 1];
        const dx = xb - xa, dz = zb - za, L2 = dx * dx + dz * dz; if (L2 < 4) continue;
        const t = clamp(((tx - xa) * dx + (tz - za) * dz) / L2, 0.2, 0.8);
        const x = xa + dx * t, z = za + dz * t, d = Math.hypot(tx - x, tz - z), L = Math.sqrt(L2);
        cands.push({ d, x, z, nx: dz / L, nz: -dx / L, ux: dx / L, uz: dz / L });
      }
    });
    // ドアの まえが ひろく あいている かべ（みち がわ）を ゆうせん する
    const open = (c) => { let n = 0; for (const k of [2.5, 4, 5.5]) for (const sd of [-1.2, 0, 1.2]) { const x = c.x + c.nx * k + c.ux * sd, z = c.z + c.nz * k + c.uz * sd; if (!blockedAt(x, 0, z) && isLand(x, z)) n++; } return n; };
    cands.forEach((c) => { c.score = c.d + (9 - open(c)) * 6; });
    cands.sort((a, b) => a.score - b.score);
    // ドアの そとが ほんとうに あいている かべ を えらぶ（となりの たてものの なか は だめ）
    for (const c of cands) {
      for (let k = 1.1; k < 6; k += 0.4) {
        const ox = c.x + c.nx * k, oz = c.z + c.nz * k;
        if (!blockedAt(ox, 0, oz) && isLand(ox, oz)) { best = Object.assign(c, { ox, oz }); return best; }
      }
    }
    if (!cands.length) return null;
    best = cands[0]; best.ox = best.x + best.nx * 1.1; best.oz = best.z + best.nz * 1.1;
    return best;
  }

  // --- ランドマークタワー: ひとやすみ バルコニー ---
  const LMP = poi('横浜ランドマークタワー'), LMH = LM_HEIGHT;
  const LMB = LMP.bb; const LMC = { x: (LMB[0] + LMB[2]) / 2, z: (LMB[1] + LMB[3]) / 2 };
  const BALC = [14, 28, 42, 56, 70, 84, 98];
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
    return { masts, cx: (ax + bx) / 2, cz: (az + bz) / 2, ux, uz, bow: { x: bx2, z: bz2 } };
  })();

  // --- コスモクロック21（かんらんしゃ）---
  const FWP = POI['コスモクロック21'] || { x: 114, z: 46, bb: [109, 41, 119, 52] };
  const FW = { cx: FWP.x, cz: FWP.z, R: 12.5, N: 16, period: 80, axis: (FWP.bb[2] - FWP.bb[0]) < (FWP.bb[3] - FWP.bb[1]) ? 'x' : 'z' };
  FW.Rc = FW.R + 1.9;            // はこ は わの そとがわに ぶらさがる
  FW.hub = FW.Rc + 2.2;
  // ほうこう: axis='x' なら わは YZ めん
  const fwPos = (u, y, w) => FW.axis === 'x' ? [FW.cx + w, y, FW.cz + u] : [FW.cx + u, y, FW.cz + w];
  {
    const box = (u0, y0, w0, u1, y1, w1, col) => { const a = fwPos(u0, y0, w0), b = fwPos(u1, y1, w1); return B(Math.min(a[0], b[0]), y0, Math.min(a[2], b[2]), Math.max(a[0], b[0]), y1, Math.max(a[2], b[2]), col, 0, col); };
    box(-1, 0, -3.2, 1, FW.hub + 1, -1.8, C.white); box(-1, 0, 1.8, 1, FW.hub + 1, 3.2, C.white);
    box(-1, FW.hub - 1, -3.2, 1, FW.hub + 1, 3.2, C.white);
    box(-7, 0, -1.7, 7, 1.0, 1.7, hex('#ffe066'));
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

  // ================= とおくの けしき（かんらんしゃ・ヘリから みえる）=================
  // ちずの いち（いど・けいど）→ ゲームの いち（tools/minatomirai-map.py と おなじ けいさん）
  const GEO = (() => {
    const la0 = MAP.origin[0], lo0 = MAP.origin[1], kx = Math.cos(la0 * Math.PI / 180) * 111320, kz = 110574;
    const r = -MAP.rot * Math.PI / 180, cr = Math.cos(r), sr = Math.sin(r), S0 = MAP.scale;
    return (lat, lon) => { const x = (lon - lo0) * kx, z = -(lat - la0) * kz; return [(x * cr - z * sr) * S0, (x * sr + z * cr) * S0]; };
  })();
  function pip(x, z, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i], [xj, zj] = poly[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
    }
    return c;
  }
  // ちずの そと の よこはまの まち（だいたいの かたち）。ちずの はんい（BBOX）の ふちに ぴったり つなぐ
  const BBX = { la0: 35.4489, la1: 35.4631, lo0: 139.6179, lo1: 139.6491 }; // tools/minatomirai-map.py の BBOX の うちがわ
  const OUTER = [[BBX.la1, 139.6320], [35.4660, 139.6330], [35.4720, 139.6390], [35.4820, 139.6480], [35.5000, 139.6700], [35.5600, 139.7300],
    [35.5600, 139.3800], [35.2800, 139.3800], [35.2800, 139.6600], [35.4200, 139.6700], [35.4380, 139.6620], [35.4440, 139.6560],
    [35.4470, 139.6520], [BBX.la0, BBX.lo1], [BBX.la0, BBX.lo0], [BBX.la1, BBX.lo0]].map(([a, b]) => GEO(a, b));
  const DAIKOKU = [[35.4600, 139.6760], [35.4720, 139.6760], [35.4720, 139.6950], [35.4600, 139.6950]].map(([a, b]) => GEO(a, b));
  const INNER = [[BBX.la0, BBX.lo0], [BBX.la0, BBX.lo1], [BBX.la1, BBX.lo1], [BBX.la1, BBX.lo0]].map(([a, b]) => GEO(a, b));
  // ちずの ついか はんい（やました こうえん・ちゅうかがい）も ちずの なか
  const INNERS = [INNER].concat((MAP.extra || []).map(([a0, a1, o0, o1]) => [[a0 + 0.0002, o0], [a0 + 0.0002, o1 - 0.0002], [a1, o1 - 0.0002], [a1, o0]].map(([a, b]) => GEO(a, b))));
  const onOuter = (x, z) => (pip(x, z, OUTER) || pip(x, z, DAIKOKU)) && !INNERS.some((q) => pip(x, z, q));
  function distInner(x, z) {
    let d = 1e9;
    for (const Q of INNERS) {
      if (pip(x, z, Q)) return 0;
      for (let i = 0; i < 4; i++) {
        const [ax, az] = Q[i], [bx, bz] = Q[(i + 1) % 4], dx = bx - ax, dz = bz - az;
        const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
      }
    }
    return d;
  }
  {
    const OUTCOL = shade(C.land, 0.93);
    // ちかく（あるける）: 2 ます、あたりはんてい つき
    const NB = 2, nx0 = -560, nx1 = 640, nz0 = -560, nz1 = 520;
    for (let z = nz0; z < nz1; z += NB) {
      let run = null;
      for (let x = nx0; x <= nx1; x += NB) {
        const inside = x < nx1 && onOuter(x + NB / 2, z + NB / 2);
        if (inside && run === null) run = x;
        if (!inside && run !== null) {
          flat(run, z, x, z + NB, -0.015, OUTCOL);
          if (distInner(run, z) < 140 || distInner(x, z) < 140) addSolid({ x0: run, y0: -4, z0: z, x1: x, y1: 0, z1: z + NB });
          run = null;
        }
      }
    }
    // とおく（みため だけ）: 24 ます
    const FB = 24;
    for (let z = -3000; z < 3000; z += FB) {
      let run = null;
      for (let x = -3000; x <= 3000; x += FB) {
        const near2 = x >= nx0 - FB && x <= nx1 && z >= nz0 - FB && z <= nz1;
        const inside = x < 3000 && !near2 && onOuter(x + FB / 2, z + FB / 2);
        if (inside && run === null) run = x;
        if (!inside && run !== null) { flat(run, z, x, z + FB, -0.02, OUTCOL); run = null; }
      }
    }
    // まちの たてもの（とおくは ひくく まばらに）
    for (let gx = -900; gx < 900; gx += 18) for (let gz = -900; gz < 900; gz += 18) {
      const x = gx + hash01(gx, gz) * 8, z = gz + hash01(gz, gx) * 8, di = distInner(x, z);
      if (di < 25 || !onOuter(x, z) || !onOuter(x + 8, z + 8) || !onOuter(x - 8, z - 8)) continue;
      if (hash01(gx * 3, gz * 7) < Math.min(0.85, di / 300)) continue;
      const w = 5 + hash01(gx, 9) * 7, d = 5 + hash01(9, gz) * 7, h = 2 + hash01(gx * 5, gz * 3) ** 2 * (di < 200 ? 16 : 9);
      const col = shade(hex(['#d9d3c7', '#cfd6dc', '#e4dccf', '#c9c3b8', '#dfe5ea'][(hash01(gx, gz * 2) * 5) | 0]), 0.95);
      if (di < 140) B(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, col, h > 4 ? 1 : 0, shade(col, 0.8));
      else G.box(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, col, h > 4 ? 1 : 0, shade(col, 0.8));
    }
    // よこはま えき の ビル
    [[35.4657, 139.6213, 185, 14], [35.4662, 139.6203, 170, 12], [35.4651, 139.6237, 50, 22], [35.4688, 139.6265, 99, 16], [35.4672, 139.6250, 40, 26], [35.4640, 139.6230, 80, 14]].forEach(([la, lo, hm, wm]) => {
      const [x, z] = GEO(la, lo), h = hm * 0.25, w = wm * 0.25 * 2.2;
      G.box(x - w, 0, z - w, x + w, h, z + w, hex('#c3ccd6'), 1, hex('#9aa5b1'));
    });
  }
  // うみ（ひろく）
  G.quad([-3600, WATER - 0.01, -3600], [3600, WATER - 0.01, -3600], [3600, WATER - 0.01, 3600], [-3600, WATER - 0.01, 3600], [0, 1, 0], C.water, 2);
  // マリンタワー（106m）
  // ちずの なかに あれば OSM の かたち（ぶひん）で かく。ここでは いち だけ
  const MARINE = (() => { const q = POI['横浜マリンタワー']; if (q) return { x: q.x, z: q.z, h: 26.5, osm: true }; const [x, z] = GEO(35.44375, 139.65055); return { x, z, h: 26.5 }; })();
  if (!MARINE.osm) {
    G.cyl(MARINE.x, 0, MARINE.z, 2.6, 22, 10, C.red, 0, 1.0); G.cyl(MARINE.x, 22, MARINE.z, 2.4, 2.2, 10, C.white); G.cyl(MARINE.x, 24.2, MARINE.z, 0.5, 2.6, 6, C.red);
    for (let k = 0; k < 22; k += 4) G.cyl(MARINE.x, k, MARINE.z, 2.62 - k * 0.07, 0.7, 10, C.white);
  }
  // よこはま ベイブリッジ（ほんとうの いち・おおきさ）
  const BAYB = (() => {
    const a = GEO(35.4475, 139.6705), b = GEO(35.4620, 139.6790), Y = 13, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, nx = -uz, nz = ux, at = (t, s, y) => [a[0] + ux * L * t + nx * s, y, a[1] + uz * L * t + nz * s];
    G.obox(at(0.5, 0, Y), [ux, 0, uz], [0, 1, 0], [nx, 0, nz], L / 2, 1.2, 5, C.white);
    [0.3, 0.7].forEach((t) => {
      [-4.2, 4.2].forEach((s) => G.obox(at(t, s, 21.5), [ux, 0, uz], [0, 1, 0], [nx, 0, nz], 1.2, 21.5, 1, C.white));
      G.obox(at(t, 0, 41), [ux, 0, uz], [0, 1, 0], [nx, 0, nz], 1.2, 1.2, 5, C.white);
      for (let k = 1; k <= 8; k++) [-1, 1].forEach((sd) => {
        const t2 = t + sd * k * 0.025; [-4.2, 4.2].forEach((s) => G.beam(at(t, s, 42), at(t2, s, Y + 1.2), 0.1, C.white));
      });
    });
    for (let t = 0.05; t < 1; t += 0.05) if (Math.abs(t - 0.3) > 0.03 && Math.abs(t - 0.7) > 0.03) [-3, 3].forEach((s) => G.obox(at(t, s, Y / 2), [ux, 0, uz], [0, 1, 0], [nx, 0, nz], 0.8, Y / 2, 0.8, C.gray));
    const m = at(0.5, 0, 42); return { x: m[0], y: 44, z: m[2] };
  })();
  // ふじさん・やま・とうきょう（とおい ものは ちかくに ちいさく おく。みえる おおきさ は ほんもの と おなじ）
  const FAR = 2500;
  function farPos(lat, lon) { const [x, z] = GEO(lat, lon), D = Math.hypot(x, z); return { x: x / D * FAR, z: z / D * FAR, s: FAR / D }; }
  const FUJI = (() => {
    const f = farPos(35.3606, 138.7274), r = 18000 * 0.25 * f.s, h = 3776 * 0.25 * f.s;
    G.cone(f.x, -1, f.z, r, h, 28, hex('#5b7fa6'));
    G.cone(f.x, h * 0.72, f.z, r * 0.28 * 1.02, h * 0.28, 28, C.white, hex('#e7f5ff'));
    return { x: f.x, y: h, z: f.z };
  })();
  [[35.4712, 139.1626, 1673, 9000], [35.4408, 139.2314, 1252, 7000], [35.2333, 139.0211, 1438, 12000], [35.5300, 139.2000, 1300, 9000], [35.3500, 139.1200, 1100, 9000], [35.6000, 139.1000, 1500, 11000]].forEach(([la, lo, hm, rm]) => {
    const f = farPos(la, lo); G.cone(f.x, -1, f.z, rm * 0.25 * f.s, hm * 0.25 * f.s, 14, hex('#6c8aa8'));
  });
  const TOKYO = (() => {
    const f = farPos(35.6812, 139.7671);
    for (let i = 0; i < 40; i++) {
      const a = (hash01(i, 1) - 0.5) * 9000 * 0.25 * f.s, b = (hash01(1, i) - 0.5) * 4000 * 0.25 * f.s, h = (60 + hash01(i, i) * 190) * 0.25 * f.s, w = 40 * 0.25 * f.s;
      G.box(f.x + a - w, -1, f.z + b - w, f.x + a + w, h, f.z + b + w, hex('#8fa3b8'));
    }
    const t = farPos(35.7101, 139.8107); G.cyl(t.x, -1, t.z, 60 * 0.25 * t.s, 634 * 0.25 * t.s, 8, hex('#a5b4c4'), 0, 10 * 0.25 * t.s);
    return { x: f.x, y: 20, z: f.z, sky: { x: t.x, y: 634 * 0.25 * t.s, z: t.z } };
  })();

  // ================= ランドマークの ヘリポート =================
  {
    const y = LMH + 0.03;
    G.cyl(LMC.x, y, LMC.z, 4.2, 0.03, 24, hex('#495057'));
    G.cyl(LMC.x, y + 0.01, LMC.z, 3.6, 0.03, 24, C.yellow); G.cyl(LMC.x, y + 0.02, LMC.z, 3.2, 0.03, 24, hex('#495057'));
    G.box(LMC.x - 1.3, y + 0.03, LMC.z - 1.4, LMC.x - 0.8, y + 0.06, LMC.z + 1.4, C.white);
    G.box(LMC.x + 0.8, y + 0.03, LMC.z - 1.4, LMC.x + 1.3, y + 0.06, LMC.z + 1.4, C.white);
    G.box(LMC.x - 0.8, y + 0.03, LMC.z - 0.25, LMC.x + 0.8, y + 0.06, LMC.z + 0.25, C.white);
    // てすり
    const [x0, z0, x1, z1] = LMB; const e = 0.2;
    [[x0, z0, x1, z0 + e], [x0, z1 - e, x1, z1], [x0, z0, x0 + e, z1], [x1 - e, z0, x1, z1]].forEach(([a, b, c, d]) => G.box(a, LMH, b, c, LMH + 1.0, d, C.gray));
  }
  const HELI = { x: LMC.x + 5, y: LMH, z: LMC.z, yaw: 0, rot: 0, vx: 0, vy: 0, vz: 0, home: true };

  // ================= コスモワールド: ジェットコースター =================
  const CWP = POI['よこはまコスモワールド'] || { bb: [50, 6, 127, 71] };
  const CO = (() => {
    const cx = (CWP.bb[0] + CWP.bb[2]) / 2 - 12, cz = (CWP.bb[1] + CWP.bb[3]) / 2 - 3, N = 520;
    const K = [[0, 2], [0.07, 2], [0.27, 22], [0.31, 22.4], [0.42, 1.3], [0.47, 1.3], [0.55, 12], [0.62, 5], [0.68, 9.5], [0.74, 3.5], [0.82, 7.5], [0.9, 2.6], [1, 2]];
    const hAt = (u) => { for (let i = 1; i < K.length; i++) if (u <= K[i][0]) { const t = (u - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * (0.5 - 0.5 * Math.cos(Math.PI * t)); } return 2; };
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, th = u * Math.PI * 2, r = 1 + 0.2 * Math.sin(3 * th) + (u > 0.6 && u < 0.85 ? 0.25 * Math.sin((u - 0.6) / 0.25 * Math.PI * 4) : 0);
      pts.push([cx + 22 * r * Math.cos(th), hAt(u), cz + 14 * r * Math.sin(th)]);
    }
    const L = [0]; for (let i = 1; i <= N; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
    const total = L[N];
    function at(s) {
      s = ((s % total) + total) % total; let lo = 0, hi = N; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= s) lo = m; else hi = m; }
      const t = (s - L[lo]) / (L[hi] - L[lo] || 1), a = pts[lo], b = pts[hi];
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.hypot(dx, dy, dz) || 1;
      return { x: a[0] + dx * t, y: a[1] + dy * t, z: a[2] + dz * t, tx: dx / l, ty: dy / l, tz: dz / l, u: s / total };
    }
    // レール・まくらぎ・はしら
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1, nx = -dz / l * 0.6, nz = dx / l * 0.6;
      G.beam([a[0] + nx, a[1], a[2] + nz], [b[0] + nx, b[1], b[2] + nz], 0.09, hex('#f8f9fa'));
      G.beam([a[0] - nx, a[1], a[2] - nz], [b[0] - nx, b[1], b[2] - nz], 0.09, hex('#f8f9fa'));
      G.beam([a[0], a[1] - 0.25, a[2]], [b[0], b[1] - 0.25, b[2]], 0.18, hex('#e03131'));
      if (i % 3 === 0) G.beam([a[0] + nx * 1.2, a[1] - 0.05, a[2] + nz * 1.2], [a[0] - nx * 1.2, a[1] - 0.05, a[2] - nz * 1.2], 0.07, hex('#adb5bd'));
      if (i % 8 === 0 && a[1] > 1.8) { G.beam([a[0], 0, a[2]], [a[0], a[1] - 0.3, a[2]], 0.22, hex('#ffd43b')); if (a[1] > 8) G.beam([a[0] + nx * 3, 0, a[2] + nz * 3], [a[0], a[1] * 0.6, a[2]], 0.12, hex('#ffd43b')); }
    }
    // スプラッシュ プール と トンネル
    const pp = at(0.445 * total);
    G.box(pp.x - 7, -0.2, pp.z - 7, pp.x + 7, 0.25, pp.z + 7, hex('#868e96'));
    G.quad([pp.x - 6.5, 0.3, pp.z - 6.5], [pp.x + 6.5, 0.3, pp.z - 6.5], [pp.x + 6.5, 0.3, pp.z + 6.5], [pp.x - 6.5, 0.3, pp.z + 6.5], [0, 1, 0], hex('#4dabf7'), 2);
    for (let s = 0.455; s < 0.475; s += 0.004) { const q = at(s * total); G.box(q.x - 2, q.y - 0.5, q.z - 2, q.x + 2, q.y + 2.6, q.z + 2, hex('#5f3dc4')); }
    // のりば
    const st = at(0.035 * total);
    G.box(st.x - 4, 0, st.z - 4, st.x + 4, 1.4, st.z + 4, hex('#e9ecef')); G.box(st.x - 4.5, 4.5, st.z - 4.5, st.x + 4.5, 5, st.z + 4.5, hex('#e03131'));
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => G.box(st.x + a * 4 - 0.2, 0, st.z + b * 4 - 0.2, st.x + a * 4 + 0.2, 4.5, st.z + b * 4 + 0.2, C.white));
    return { pts, total, at, st, pool: pp };
  })();

  // ================= コスモワールド: おばけやしき =================
  function freeArea(x, z, hx, hz) {
    for (let r = 0; r < 60; r += 2) for (let a = 0; a < 24; a++) {
      const xx = x + Math.cos(a / 24 * Math.PI * 2) * r, zz = z + Math.sin(a / 24 * Math.PI * 2) * r;
      let ok = isLand(xx - hx, zz - hz) && isLand(xx + hx, zz - hz) && isLand(xx - hx, zz + hz) && isLand(xx + hx, zz + hz) && isLand(xx, zz + hz + 3);
      if (ok) for (const b of near(xx - hx - 1, zz - hz - 1, xx + hx + 1, zz + hz + 5)) if (b.y1 > 0.05 && b.x1 > xx - hx - 1 && b.x0 < xx + hx + 1 && b.z1 > zz - hz - 1 && b.z0 < zz + hz + 5) { ok = false; break; }
      if (ok) { let co = false; for (let s = 0; s < 1; s += 0.01) { const q = CO.at(s * CO.total); if (Math.abs(q.x - xx) < hx + 3 && Math.abs(q.z - zz) < hz + 6) { co = true; break; } } if (!co) return { x: xx, z: zz }; }
      if (r === 0) break;
    }
    return { x, z };
  }
  const GH = (() => {
    const f = freeArea(CWP.bb[0] + 14, CWP.bb[1] + 14, 6, 5);
    const x = f.x, z = f.z, P2 = hex('#3b2f4a');
    B(x - 6, 0, z - 5, x + 6, 6.5, z + 5, P2, 1, hex('#241b2e'));
    for (let k = 0; k < 6; k++) G.box(x - 6 + k * 0.25, 6.5 + k * 0.5, z - 5, x + 6 - k * 0.25, 7 + k * 0.5, z + 5, hex('#241b2e'));
    G.box(x - 1, 6.5, z - 1, x + 1, 11, z + 1, hex('#241b2e')); G.cone(x, 11, z, 1.6, 2.5, 6, hex('#241b2e'));
    [[-4, 2.8], [4, 2.8], [-4, 5], [4, 5], [0, 9]].forEach(([dx, y]) => G.box(x + dx - 0.6, y - 0.6, z + 5.02, x + dx + 0.6, y + 0.6, z + 5.08, hex('#ffd43b'), 5));
    G.box(x - 3, 3.3, z + 5.05, x + 3, 4.3, z + 5.15, hex('#c92a2a'), 5);          // かんばん
    [[-8, 7], [-9.5, 9], [8.5, 8], [9.5, 10.5]].forEach(([dx, dz], i) => { G.box(x + dx - 0.5, 0, z + dz - 0.2, x + dx + 0.5, 1.3 - i * 0.1, z + dz + 0.2, hex('#868e96')); });
    G.cyl(x + 9, 0, z - 3, 0.3, 4.5, 5, hex('#3d2b1f')); G.beam([x + 9, 3.5, z - 3], [x + 11, 5, z - 2], 0.12, hex('#3d2b1f')); G.beam([x + 9, 3, z - 3], [x + 7.5, 4.6, z - 4], 0.12, hex('#3d2b1f'));
    return { x, z, door: { x, z: z + 6.4 } };
  })();
  // なかの めいろ（したの ほう に つくる。くらいので そとは みえない）
  const GHM = (() => {
    const g = new Geo(), Y = 0, hw = 1.7, HT = 3.2;
    const path = [[0, 0], [0, -12], [10, -12], [10, -24], [-6, -24], [-6, -36], [12, -36], [12, -46]];
    const segN = (i) => { const [ax, az] = path[i], [bx, bz] = path[i + 1], l = Math.hypot(bx - ax, bz - az); return [-(bz - az) / l, (bx - ax) / l]; };
    const off = (i, side) => { // わきの かべの せん
      let n;
      if (i === 0) n = segN(0); else if (i === path.length - 1) n = segN(i - 1);
      else { const a = segN(i - 1), b = segN(i); n = (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) < 1e-6) ? a : [a[0] + b[0], a[1] + b[1]]; }
      return [path[i][0] + n[0] * hw * side, path[i][1] + n[1] * hw * side];
    };
    const wallC = hex('#4a3b5c'), floorC = hex('#3a2a1c'), ceilC = hex('#1e1626');
    [-1, 1].forEach((side) => {
      for (let i = 0; i < path.length - 1; i++) {
        const a = off(i, side), b = off(i + 1, side);
        g.quad([a[0], Y, a[1]], [b[0], Y, b[1]], [b[0], Y + HT, b[1]], [a[0], Y + HT, a[1]], [0, 0, 1], wallC, 0);
        g.quad([a[0], Y + 0.9, a[1]], [b[0], Y + 0.9, b[1]], [b[0], Y + 1.0, b[1]], [a[0], Y + 1.0, a[1]], [0, 0, 1], hex('#6b4f2a'), 0);
      }
    });
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i], [bx, bz] = path[i + 1];
      const x0 = Math.min(ax, bx) - hw, x1 = Math.max(ax, bx) + hw, z0 = Math.min(az, bz) - hw, z1 = Math.max(az, bz) + hw;
      g.quad([x0, Y, z0], [x1, Y, z0], [x1, Y, z1], [x0, Y, z1], [0, 1, 0], floorC, 0);
      g.quad([x0, Y + HT, z0], [x1, Y + HT, z0], [x1, Y + HT, z1], [x0, Y + HT, z1], [0, -1, 0], ceilC, 0);
    }
    // いりぐち・でぐち の かべ
    [[0, 0, 1], [path.length - 1, -1, 0]].forEach(([i, , isStart]) => {
      const a = off(i, -1), b = off(i, 1), n = segN(isStart ? 0 : i - 1), d = isStart ? -0.01 : 0.01;
      g.quad([a[0] - n[1] * d, Y, a[1] + n[0] * d], [b[0] - n[1] * d, Y, b[1] + n[0] * d], [b[0], Y + HT, b[1]], [a[0], Y + HT, a[1]], [0, 0, 1], isStart ? wallC : hex('#fff9db'), isStart ? 0 : 5);
    });
    // ちょうちん・がくぶち・ちゃくもの
    const L = [0]; for (let i = 1; i < path.length; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    const total = L[L.length - 1];
    function at(s) {
      s = clamp(s, 0, total); let i = 1; while (i < L.length - 1 && L[i] < s) i++;
      const t = (s - L[i - 1]) / (L[i] - L[i - 1]), [ax, az] = path[i - 1], [bx, bz] = path[i];
      const l = Math.hypot(bx - ax, bz - az); return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, ux: (bx - ax) / l, uz: (bz - az) / l, i };
    }
    for (let s = 3; s < total - 2; s += 5.5) {
      const q = at(s), side = (Math.floor(s / 5.5) % 2) ? 1 : -1, nx = -q.uz * side, nz = q.ux * side;
      const px = q.x + nx * (hw - 0.12), pz = q.z + nz * (hw - 0.12);
      g.box(px - 0.15, 2.0, pz - 0.15, px + 0.15, 2.45, pz + 0.15, hex('#ff922b'), 5);
      if (Math.floor(s / 5.5) % 3 === 0) { // がくぶち
        const fx = q.x - nx * (hw - 0.06), fz = q.z - nz * (hw - 0.06);
        g.obox([fx, 1.9, fz], [q.ux, 0, q.uz], [0, 1, 0], [nx, 0, nz], 0.6, 0.75, 0.04, hex('#8d6e3f'));
        g.obox([fx + nx * 0.03, 1.9, fz + nz * 0.03], [q.ux, 0, q.uz], [0, 1, 0], [nx, 0, nz], 0.45, 0.6, 0.04, hex('#2b2b3a'));
        g.obox([fx + nx * 0.06 - q.ux * 0.15, 2.05, fz + nz * 0.06 - q.uz * 0.15], [q.ux, 0, q.uz], [0, 1, 0], [nx, 0, nz], 0.06, 0.04, 0.02, hex('#ff0000'), 5);
        g.obox([fx + nx * 0.06 + q.ux * 0.15, 2.05, fz + nz * 0.06 + q.uz * 0.15], [q.ux, 0, q.uz], [0, 1, 0], [nx, 0, nz], 0.06, 0.04, 0.02, hex('#ff0000'), 5);
      }
    }
    for (let i = 1; i < path.length - 1; i++) { // くものす
      const c = off(i, 1), d = off(i, -1);
      [c, d].forEach((p) => { g.beam([p[0], HT - 0.05, p[1]], [p[0] * 0.8 + path[i][0] * 0.2, HT - 0.9, p[1] * 0.8 + path[i][1] * 0.2], 0.015, hex('#dee2e6')); });
    }
    const EV = [[8, 'portrait'], [19, 'ghost'], [30, 'flicker'], [42, 'skeleton'], [55, 'coffin'], [68, 'hands'], [81, 'face']];
    // ひつぎ
    { const q = at(55), nx = -q.uz, nz = q.ux; const cx2 = q.x + nx * 1.1, cz2 = q.z + nz * 1.1; g.obox([cx2, 0.35, cz2], [q.ux, 0, q.uz], [0, 1, 0], [nx, 0, nz], 1.0, 0.35, 0.4, hex('#5c3d2e')); }
    return { mesh: g.upload(), at, total, hw, EV, Y: -400 };
  })();

  // ================= けいゆう びょういん =================
  const HOSP = POI['けいゆう病院'] || { x: 108, z: -89, h: 15, bb: [97, -96, 118, -80] };

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
  const KD = doorOn('M.M.MID Square', MARKP.x, MARKP.z);
  addDoor('kumon', KD, '🏫<br>くもん', hex('#20b26b'), () => enterKumon());
  addDoor('toys', doorOn('MARK IS minatomirai', LMC.x, LMC.z), '🧸<br>はいる', hex('#e8590c'), () => openShop('toys'));
  addDoor('piano', doorOn('MARK IS minatomirai', MIDP.x, MIDP.z), '🎹<br>ピアノ', hex('#845ef7'), () => openPlace('piano')); // しまむら がっき（3かい）
  addDoor('wp', doorOn('Yokohama World Porters', CAB ? CAB.ends[0].x : WPP.x - 30, CAB ? CAB.ends[0].z : WPP.z), '🎪<br>はいる', hex('#7048e8'), () => openShop('wp'));
  if (CAB) CAB.ends.forEach((e, k) => DOORS.push({ id: 'cab' + k, x: e.door.x, z: e.door.z, label: '🚡<br>のる', color: hex('#1c7ed6'), run: () => openShop('cabin', k) }));

  DOORS.push({ id: 'ghost', x: GH.door.x, z: GH.door.z, label: '👻<br>はいる', color: hex('#9c36b5'), run: () => openShop('ticket', { title: '👻 おばけやしき', sub: 'よこはま コスモワールド', price: 600, what: 'おばけやしき こども 1まい', go: 'ghost', icon: '👻' }) });
  { const s2 = freeSpot(CO.st.x + 6, CO.st.z); DOORS.push({ id: 'coaster', x: s2.x, z: s2.z, label: '🎢<br>のる', color: hex('#e03131'), run: () => openShop('ticket', { title: '🎢 ジェットコースター', sub: 'コスモワールド ・ みずに とびこむ コースター', price: 800, what: 'ジェットコースター こども 1まい', go: 'coaster', icon: '🎢' }) }); }
  { const q = fwPos(0, 0, 4.4), s2 = freeSpot(q[0], q[2]); DOORS.push({ id: 'wheel', x: s2.x, z: s2.z, label: '🎡<br>のる', color: hex('#1098ad'), run: () => openShop('ticket', { title: '🎡 コスモクロック21', sub: 'だいかんらんしゃ', price: 900, what: 'かんらんしゃ 1まい', go: 'wheel', icon: '🎡' }) }); }
  DOORS.push({ id: 'heli', get x() { return HELI.x; }, get z() { return HELI.z; }, get y() { return HELI.y; }, r: 3.8, label: '🚁<br>のる', color: hex('#e03131'), run: () => heliEnter() });
  const HELI_EXIT = { id: 'heliexit', x: 0, z: 0, label: '🚁<br>おりる', color: hex('#e03131'), run: () => heliExit() };
  const HOSPDOOR = (() => { const d = doorOn('けいゆう病院', MARKP.x, MARKP.z); return d ? { x: d.ox, z: d.oz } : null; })();
  // ママ の ベンチ（くもんの いりぐち）
  const MAMA = (() => {
    if (!KD) return null;
    for (const sg of [1, -1]) {
      const x = KD.ox + KD.ux * 3.4 * sg - KD.nx * 0.3, z = KD.oz + KD.uz * 3.4 * sg - KD.nz * 0.3;
      if (blockedAt(x, 0, z)) continue;
      const U2 = [KD.ux, 0, KD.uz], N2 = [KD.nx, 0, KD.nz], wood = hex('#a9743a');
      G.obox([x, 0.5, z], U2, [0, 1, 0], N2, 0.95, 0.06, 0.38, wood);
      G.obox([x - KD.nx * 0.35, 0.9, z - KD.nz * 0.35], U2, [0, 1, 0], N2, 0.95, 0.38, 0.05, wood);
      [[-0.8, -0.3], [0.8, -0.3], [-0.8, 0.3], [0.8, 0.3]].forEach(([a, b]) => G.obox([x + KD.ux * a + KD.nx * b, 0.25, z + KD.uz * a + KD.nz * b], U2, [0, 1, 0], N2, 0.05, 0.25, 0.05, C.gray));
      G.obox([x + KD.ux * 1.25, 0.6, z + KD.uz * 1.25], U2, [0, 1, 0], N2, 0.12, 0.12, 0.12, hex('#74c0fc'));  // すいとう
      return { x: x + KD.nx * 0.05, z: z + KD.nz * 0.05, face: Math.atan2(KD.nx, KD.nz) };
    }
    return null;
  })();
  // ================= おうち（プラウド横浜桜木町）・ようちえん・ようちえんバス =================
  const PROWD = POI['プラウド横浜桜木町'] || { x: -92, z: -92, bb: [-96, -96, -90, -87] };
  const YOCHI = POI['戸部幼稚園'] || { x: -192, z: -98, bb: [-197, -104, -187, -94] };
  // いわかめよこちょう（みち）の いちばん おうちに ちかい ところ に「いわかめどおり」の のりば
  const ROAD_GANKI = MAP.roads.find((r) => r.n === '岩亀横丁');
  function nearestOnLine(p, x, z) {
    let best = null;
    for (let k = 0; k + 3 < p.length; k += 2) {
      const ax = p[k], az = p[k + 1], bx = p[k + 2], bz = p[k + 3], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1), qx = ax + dx * t, qz = az + dz * t, d = Math.hypot(qx - x, qz - z);
      if (!best || d < best.d) { const L = Math.sqrt(L2); best = { d, x: qx, z: qz, ux: dx / L, uz: dz / L }; }
    }
    return best;
  }
  const HOMEDOOR = (() => {
    const g = ROAD_GANKI ? nearestOnLine(ROAD_GANKI.p, PROWD.x, PROWD.z) : null;
    const d = doorOn('プラウド横浜桜木町', g ? g.x : PROWD.x, g ? g.z : PROWD.bb[3] + 5);
    return d || { ox: PROWD.x, oz: PROWD.bb[3] + 2, x: PROWD.x, z: PROWD.bb[3], nx: 0, nz: 1, ux: 1, uz: 0 };
  })();
  addDoor('home', HOMEDOOR, '🏠<br>おうち', hex('#f59f00'), () => openPlace('home'));
  G.obox([HOMEDOOR.x + HOMEDOOR.nx * 0.1, 4.2, HOMEDOOR.z + HOMEDOOR.nz * 0.1], [HOMEDOOR.ux, 0, HOMEDOOR.uz], [0, 1, 0], [HOMEDOOR.nx, 0, HOMEDOOR.nz], 2.4, 0.45, 0.06, hex('#495057'));
  const STOP = (() => {
    const g = ROAD_GANKI ? nearestOnLine(ROAD_GANKI.p, HOMEDOOR.ox, HOMEDOOR.oz) : null;
    if (!g) return freeSpot(HOMEDOOR.ox + 6, HOMEDOOR.oz);
    // みちの はし（おうち がわ）
    const nx = -g.uz, nz = g.ux, sg = ((HOMEDOOR.ox - g.x) * nx + (HOMEDOOR.oz - g.z) * nz) > 0 ? 1 : -1;
    const f = freeSpot(g.x + nx * sg * 2.6, g.z + nz * sg * 2.6);
    return { x: f.x, z: f.z, rx: g.x, rz: g.z, ux: g.ux, uz: g.uz };
  })();
  // バスていの かんばん（ようちえんバスの のりば）
  G.cyl(STOP.x, 0, STOP.z, 0.09, 2.6, 6, C.gray);
  G.cyl(STOP.x, 2.6, STOP.z, 0.55, 0.12, 14, hex('#ffd43b'));
  G.box(STOP.x - 0.2, 1.2, STOP.z - 0.06, STOP.x + 0.2, 2.2, STOP.z + 0.06, C.white);
  // とべ ようちえん: ちずに たてものが なければ つくる
  const YDOOR = (() => {
    let d = doorOn('戸部幼稚園', STOP.x, STOP.z);
    if (!d) {
      const [x0, z0, x1, z1] = YOCHI.bb, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hx = Math.max(2.5, (x1 - x0) / 2 - 1), hz = Math.max(2, (z1 - z0) / 2 - 1);
      B(cx - hx, 0, cz - hz, cx + hx, 2.6, cz + hz, hex('#ffe8cc'), 0, hex('#ff922b'));
      BLD.push({ n: '戸部幼稚園', p: [cx - hx, cz - hz, cx + hx, cz - hz, cx + hx, cz + hz, cx - hx, cz + hz], y1: 2.6, col: hex('#ffe8cc') });
      d = doorOn('戸部幼稚園', STOP.x, STOP.z);
    }
    return d;
  })();
  if (YDOOR) {
    addDoor('yochien', YDOOR, '🎒<br>ようちえん', hex('#e64980'), () => openPlace('yochien'));
    // ようちえんの しるし: にじいろの かんばん と チューリップ
    const c = [YDOOR.x + YDOOR.nx * 0.12, 3.4, YDOOR.z + YDOOR.nz * 0.12];
    ['#ff6b6b', '#ffd43b', '#51cf66', '#4dabf7', '#cc5de8'].forEach((h, i) => G.obox([c[0] + YDOOR.ux * (i - 2) * 0.7, c[1], c[2] + YDOOR.uz * (i - 2) * 0.7], [YDOOR.ux, 0, YDOOR.uz], [0, 1, 0], [YDOOR.nx, 0, YDOOR.nz], 0.34, 0.34, 0.06, hex(h)));
    for (let i = -3; i <= 3; i++) if (i) { const x = YDOOR.ox + YDOOR.ux * i * 0.9 + YDOOR.nx * 0.6, z = YDOOR.oz + YDOOR.uz * i * 0.9 + YDOOR.nz * 0.6; G.cyl(x, 0, z, 0.03, 0.5, 4, C.leaf); G.sphere(x, 0.6, z, 0.16, 4, hex(['#ff6b6b', '#ffd43b', '#f783ac'][(i + 3) % 3])); }
  }
  // --- コンビニ（ちずの いち: OSM の shop=convenience）---
  const DRIVE_R = MAP.roads.filter((r) => !r.a && /^(trunk|primary|secondary|tertiary|tertiary_link|unclassified|residential|living_street)$/.test(r.c));
  function storeAt(lat, lon, name, colA, colB) {
    const [x, z] = GEO(lat, lon);
    let hit = BLD.find((b) => { const pts = []; for (let i = 0; i < b.p.length; i += 2) pts.push([b.p[i], b.p[i + 1]]); return pip(x, z, pts); });
    if (hit && hit.n && hit.n !== name) hit = null;
    if (!hit) { B(x - 3, 0, z - 2.5, x + 3, 2.6, z + 2.5, hex('#f8f9fa'), 0, hex('#dee2e6')); hit = { n: name, p: [x - 3, z - 2.5, x + 3, z - 2.5, x + 3, z + 2.5, x - 3, z + 2.5], y1: 2.6, col: hex('#f8f9fa') }; BLD.push(hit); }
    hit.n = name;
    let rb = null; DRIVE_R.forEach((r) => { const q = nearestOnLine(r.p, x, z); if (q && (!rb || q.d < rb.d)) rb = q; });
    const d = doorOn(name, rb ? rb.x : x, rb ? rb.z : z + 5);
    if (d) { // かんばん（おみせの いろ）
      const y = Math.min(hit.y1, 3.4) - 0.55, U3 = [d.ux, 0, d.uz], N3 = [d.nx, 0, d.nz], c = [d.x + d.nx * 0.08, y, d.z + d.nz * 0.08];
      G.obox(c, U3, [0, 1, 0], N3, 2.4, 0.42, 0.06, colA);
      colB.forEach((cb, i) => G.obox([c[0] + d.nx * 0.02, y - 0.2 + i * 0.13, c[2] + d.nz * 0.02], U3, [0, 1, 0], N3, 2.4, 0.04, 0.06, cb));
      G.obox([d.x + d.nx * 0.07, 1.1, d.z + d.nz * 0.07], U3, [0, 1, 0], N3, 1.6, 1.1, 0.04, [0.6, 0.85, 1]);
    }
    return { x, z, d, name };
  }
  const KONBINI = [
    storeAt(35.4551403, 139.6244046, 'セブン-イレブン', C.white, [hex('#f58220'), hex('#00a54f'), hex('#ee1c25')]),
    storeAt(35.4535322, 139.6241203, 'ローソン', hex('#0068b7'), [C.white]),
  ].filter((k) => k.d);
  KONBINI.forEach((k) => DOORS.push({ id: k.name === 'ローソン' ? 'lawson' : 'seven', x: k.d.ox, z: k.d.oz, label: '🏪<br>' + (k.name === 'ローソン' ? 'ローソン' : 'セブン'),
    color: k.name === 'ローソン' ? hex('#0068b7') : hex('#f58220'), run: () => openShop('konbini', k.name === 'ローソン' ? 'lawson' : 'seven') }));
  // --- ようちえんの すべりだい ---
  const SLIDE = (() => {
    if (!YDOOR) return null;
    const f = freeArea(YDOOR.ox + YDOOR.nx * 5 + YDOOR.ux * 4, YDOOR.oz + YDOOR.nz * 5 + YDOOR.uz * 4, 1.6, 3.4);
    const ux = YDOOR.ux, uz = YDOOR.uz, H3 = 3.2, U3 = [ux, 0, uz], N3 = [-uz, 0, ux];
    const A = { x: f.x - ux * 2.6, z: f.z - uz * 2.6 }, Bp = { x: f.x + ux * 3.4, z: f.z + uz * 3.4 }, top = { x: f.x - ux * 1.6, z: f.z - uz * 1.6 };
    // はしご
    [-0.55, 0.55].forEach((sd) => G.beam([A.x - uz * sd, 0, A.z + ux * sd], [top.x - uz * sd - ux * 0.3, H3 + 1, top.z + ux * sd - uz * 0.3], 0.07, hex('#1c7ed6')));
    for (let k = 1; k <= 5; k++) { const t = k / 6, x = A.x + (top.x - ux * 0.3 - A.x) * t, z = A.z + (top.z - uz * 0.3 - A.z) * t; G.beam([x - uz * 0.55, H3 * t, z + ux * 0.55], [x + uz * 0.55, H3 * t, z - ux * 0.55], 0.05, hex('#ffd43b')); }
    // うえの だい と やね
    G.obox([top.x, H3, top.z], U3, [0, 1, 0], N3, 0.7, 0.08, 0.75, hex('#ff922b'));
    [[-0.6, -0.65], [0.6, -0.65], [-0.6, 0.65], [0.6, 0.65]].forEach(([a, b]) => G.beam([top.x + ux * a - uz * b, 0, top.z + uz * a + ux * b], [top.x + ux * a - uz * b, H3 + 1.6, top.z + uz * a + ux * b], 0.06, C.white));
    G.cone(top.x, H3 + 1.6, top.z, 1.1, 0.9, 8, hex('#e64980'), hex('#ffd8e4'));
    // すべる ところ
    const sl = [top.x + ux * 0.7, top.z + uz * 0.7], L3 = Math.hypot(Bp.x - sl[0], Bp.z - sl[1]), ang = Math.atan2(H3 - 0.3, L3);
    const mid = [(sl[0] + Bp.x) / 2, (H3 + 0.3) / 2, (sl[1] + Bp.z) / 2], du = [ux * Math.cos(ang), -Math.sin(ang), uz * Math.cos(ang)], dv = [ux * Math.sin(ang), Math.cos(ang), uz * Math.sin(ang)];
    G.obox(mid, du, dv, N3, Math.hypot(L3, H3 - 0.3) / 2, 0.05, 0.55, hex('#ced4da'));
    [-0.6, 0.6].forEach((sd) => G.obox([mid[0] - uz * sd, mid[1] + 0.2, mid[2] + ux * sd], du, dv, N3, Math.hypot(L3, H3 - 0.3) / 2, 0.2, 0.05, hex('#51cf66')));
    G.box(f.x - 4, 0.005, f.z - 4, f.x + 4, 0.01, f.z + 4, hex('#e9d8a6'));      // すなば
    DOORS.push({ id: 'slide', x: A.x - ux * 1.2, z: A.z - uz * 1.2, label: '🛝<br>すべる', color: hex('#51cf66'), run: () => startSlide() });
    return { A, top, sl: { x: sl[0], z: sl[1] }, B: Bp, H: H3, yaw: Math.atan2(ux, uz), mom: { x: f.x - uz * 3, z: f.z + ux * 3 } };
  })();
  // --- ようちえんバスの みち（ほんものの みちを たどる）---
  const BUSR = (() => {
    const DRIVE = { trunk: 1, primary: 1, secondary: 1, tertiary: 1, tertiary_link: 1, unclassified: 1, residential: 1, service: 1, living_street: 1 };
    const key = (x, z) => x.toFixed(1) + ',' + z.toFixed(1), nodes = new Map();
    const node = (x, z) => { const k = key(x, z); let n = nodes.get(k); if (!n) { n = { x, z, e: [] }; nodes.set(k, n); } return n; };
    MAP.roads.forEach((r) => {
      if (r.a || !DRIVE[r.c]) return;
      for (let k = 0; k + 3 < r.p.length; k += 2) {
        const a = node(r.p[k], r.p[k + 1]), b = node(r.p[k + 2], r.p[k + 3]), w = Math.hypot(a.x - b.x, a.z - b.z);
        a.e.push([b, w]); b.e.push([a, w]);
      }
    });
    const all = [...nodes.values()];
    const nearest = (x, z) => { let b = null, bd = 1e9; for (const n of all) { const d = Math.hypot(n.x - x, n.z - z); if (d < bd && n.e.length) { bd = d; b = n; } } return b; };
    if (!YDOOR) return null;
    // ダイクストラ（ヒープ つき）で a → b の みち
    function route(s0, t0) {
      const dist = new Map([[s0, 0]]), prev = new Map(), H2 = [[0, s0]];
      const push = (it) => { H2.push(it); let i = H2.length - 1; while (i) { const q = (i - 1) >> 1; if (H2[q][0] <= H2[i][0]) break; [H2[q], H2[i]] = [H2[i], H2[q]]; i = q; } };
      const pop = () => { const top = H2[0], last = H2.pop(); if (H2.length) { H2[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < H2.length && H2[l][0] < H2[m][0]) m = l; if (r < H2.length && H2[r][0] < H2[m][0]) m = r; if (m === i) break; [H2[m], H2[i]] = [H2[i], H2[m]]; i = m; } } return top; };
      while (H2.length) {
        const [ud, u] = pop(); if (ud > dist.get(u)) continue; if (u === t0) break;
        for (const [v, w] of u.e) { const nd = ud + w; if (nd < (dist.has(v) ? dist.get(v) : 1e18)) { dist.set(v, nd); prev.set(v, u); push([nd, v]); } }
      }
      if (t0 !== s0 && !prev.has(t0)) return null;
      const out = []; let n = t0; while (n) { out.unshift([n.x, n.z]); n = prev.get(n); } return out;
    }
    // のりば → セブン-イレブン の まえ → ローソン の まえ → ようちえん（みちの とちゅうに ある おみせ）
    const ways = [[STOP.rx || STOP.x, STOP.rz || STOP.z], ...KONBINI.map((k) => [k.d.ox, k.d.oz]), [YDOOR.ox, YDOOR.oz]].map(([x, z]) => nearest(x, z));
    if (ways.some((w) => !w)) return null;
    const pts = [];
    for (let k = 0; k + 1 < ways.length; k++) { const seg = route(ways[k], ways[k + 1]); if (!seg) return null; (pts.length ? seg.slice(1) : seg).forEach((q) => pts.push(q)); }
    pts.unshift([STOP.x, STOP.z]); pts.push([YDOOR.ox, YDOOR.oz]);
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = L[L.length - 1];
    function at(s) {
      s = clamp(s, 0, total); let i = 1; while (i < L.length - 1 && L[i] < s) i++;
      const t = (s - L[i - 1]) / ((L[i] - L[i - 1]) || 1), [ax, az] = pts[i - 1], [bx, bz] = pts[i], l = Math.hypot(bx - ax, bz - az) || 1;
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, ux: (bx - ax) / l, uz: (bz - az) / l };
    }
    return { pts, total, at };
  })();
  const BUS = { s: 0, dir: 1, park: 'stop', yaw: STOP.ux !== undefined ? Math.atan2(STOP.ux, STOP.uz) : 0 };
  // ================= のげやま どうぶつえん（よこはまし にしく おいまつちょう 63-10・にゅうえん むりょう）=================
  const ZOOP = POI['横浜市立野毛山動物園'] || null;
  const ZOO = (() => {
    if (!ZOOP) return null;
    const [x0, z0, x1, z1] = ZOOP.bb, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    // いりぐち: おうちに ちかい がわ の へり
    const gx = clamp(HOMEDOOR.ox, x0 + 4, x1 - 4), gz = clamp(HOMEDOOR.oz, z0 + 4, z1 - 4);
    const g = freeSpot(gx, gz), green = hex('#2f9e44');
    G.box(g.x - 3.2, 0, g.z - 0.3, g.x - 2.6, 3.4, g.z + 0.3, green); G.box(g.x + 2.6, 0, g.z - 0.3, g.x + 3.2, 3.4, g.z + 0.3, green);
    G.box(g.x - 3.4, 3.4, g.z - 0.4, g.x + 3.4, 4.3, g.z + 0.4, hex('#ffd43b'));
    [-2, -1, 0, 1, 2].forEach((k) => G.sphere(g.x + k * 1.1, 4.7, g.z, 0.38, 5, [C.orange, C.green, C.pink, C.blue, C.purple][k + 2]));
    // どうぶつの へや（さく と かんばん）
    const KINDS = [
      { id: 'giraffe', name: 'キリン', e: '🦒', info: 'くびが ながくて、たかい きの はっぱを たべるよ。' },
      { id: 'redpanda', name: 'レッサーパンダ', e: '🐼', info: 'しっぽに しましま。きのぼりが じょうず。' },
      { id: 'zebra', name: 'グレビーシマウマ', e: '🦓', info: 'ほそい しまが いっぱい。みみが まるくて おおきい。' },
      { id: 'chimp', name: 'チンパンジー', e: '🐒', info: 'どうぐを つかう あたまの いい なかま。' },
      { id: 'penguin', name: 'フンボルトペンギン', e: '🐧', info: 'みなみアメリカの うみの ペンギン。およぐのが はやい！' },
      { id: 'manul', name: 'マヌルネコ', e: '🐱', info: 'ふわふわの けで、さむい ところに すむ ねこ。' },
      { id: 'guinea', name: 'なかよしひろば（モルモット）', e: '🐹', info: 'やさしく なでて あげてね。' },
    ];
    const pens = [];
    KINDS.forEach((k, i) => {
      const a = i / KINDS.length * Math.PI * 2, r = Math.min(x1 - x0, z1 - z0) * 0.28;
      const f = freeArea(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 3.2, 3.2);
      const hw = 3.2, col = hex('#8d6e3f');
      [[-hw, -hw, hw, -hw], [hw, -hw, hw, hw], [hw, hw, -hw, hw], [-hw, hw, -hw, -hw]].forEach(([ax, az, bx, bz]) => G.beam([f.x + ax, 0.9, f.z + az], [f.x + bx, 0.9, f.z + bz], 0.06, col));
      for (let q = -hw; q <= hw; q += 1.6) [[q, -hw], [q, hw], [-hw, q], [hw, q]].forEach(([dx, dz]) => G.box(f.x + dx - 0.06, 0, f.z + dz - 0.06, f.x + dx + 0.06, 1.0, f.z + dz + 0.06, col));
      G.box(f.x - hw + 0.1, 0.004, f.z - hw + 0.1, f.x + hw - 0.1, 0.012, f.z + hw - 0.1, k.id === 'penguin' ? hex('#e7f5ff') : hex('#c5e1a5'));
      if (k.id === 'penguin') G.quad([f.x - 2, 0.03, f.z - 2], [f.x + 2, 0.03, f.z - 2], [f.x + 2, 0.03, f.z + 0.5], [f.x - 2, 0.03, f.z + 0.5], [0, 1, 0], hex('#4dabf7'), 2);
      if (k.id === 'giraffe' || k.id === 'redpanda') { G.cyl(f.x + 2, 0, f.z + 2, 0.18, 3.2, 5, C.trunk); G.sphere(f.x + 2, 3.6, f.z + 2, 1.1, 5, C.leaf); }
      G.box(f.x - 0.8, 0, f.z + hw + 0.3, f.x + 0.8, 1.5, f.z + hw + 0.4, C.white); // かんばん
      pens.push(Object.assign({ x: f.x, z: f.z }, k));
    });
    return { gate: g, pens, cx, cz, bb: ZOOP.bb };
  })();
  if (ZOO) DOORS.push({ id: 'zoo', x: ZOO.gate.x, z: ZOO.gate.z + 1.2, label: '🦒<br>ずかん', color: hex('#2f9e44'), run: () => openPlace('zukan') });

  // ================= オーケー（みなとみらい 6ちょうめ）・おつかい =================
  const OKD = doorOn('オーケーみなとみらいビル', MARKP.x, MARKP.z);
  addDoor('okstore', OKD, '🛒<br>オーケー', hex('#e03131'), () => openShop('okstore'));
  if (OKD) { const y = 3.4, U3 = [OKD.ux, 0, OKD.uz], N3 = [OKD.nx, 0, OKD.nz]; G.obox([OKD.x + OKD.nx * 0.12, y, OKD.z + OKD.nz * 0.12], U3, [0, 1, 0], N3, 2.6, 0.45, 0.06, hex('#ffd43b')); }
  DOORS.push({ id: 'busstop', x: STOP.x, z: STOP.z, label: '🚌<br>のる', color: hex('#fab005'), run: () => startBus(1) });
  // ================= 1しゅうかんの よてい =================
  // ようちえん: へいじつ。くもん: かようび・きんようび（みなとみらい・かきん きょうしつ 14:00〜19:00）。
  // ピアノ: もくようび（しまむら がっき よこはま みなとみらいてん、マークイズ 3かい）。どにち は おやすみ。
  const SCHED = { 0: ['yochien'], 1: ['yochien', 'kumon'], 2: ['yochien'], 3: ['yochien', 'piano'], 4: ['yochien', 'kumon'], 5: [], 6: [] };
  const SCHED_IC = { yochien: '🎒', kumon: '✏️', piano: '🎹' };
  const SCHED_NM = { yochien: 'ようちえん', kumon: 'くもん', piano: 'ピアノ' };
  function calToday() { save.cal = save.cal || {}; return (save.cal[save.clock.day] = save.cal[save.clock.day] || {}); }
  function calDone(what) {
    const today = SCHED[CLK.wd] || [];
    if (!today.includes(what)) return false;
    const c = calToday(); if (c[what]) return false;
    c[what] = 1; store(); todayHud(); SFX.stamp();
    banner(`${SCHED_IC[what]} きょうの ${SCHED_NM[what]} できた！<small>カレンダーに シール 🌟</small>`, 3);
    return true;
  }
  function todayHud() {
    const t = SCHED[CLK.wd] || [], c = (save.cal || {})[save.clock.day] || {};
    $('today').textContent = t.length ? 'きょう ' + t.map((w) => SCHED_IC[w] + (c[w] ? '✅' : '')).join(' ') : 'きょう 🎈おやすみ';
  }
  let remind = '';
  function scheduleTick() {
    const h = CLK.h, wd = CLK.wd, key = save.clock.day + ':' + Math.floor(h * 2) / 2, t = SCHED[wd] || [], c = calToday();
    const say2 = (k, text) => { if (remind !== save.clock.day + k) { remind = save.clock.day + k; momSay(text, 4.5); } };
    if (h >= 7.5 && h < 8 && t.includes('yochien') && !c.yochien) say2('y', 'ようちえんの じかん！ いわかめどおり から さくらごう 🌸');
    if (h >= 14.5 && h < 15 && t.includes('kumon') && !c.kumon) say2('k', 'きょうは くもんの ひ ✏️ ミッドスクエアの 3かい へ いこう');
    if (h >= 14.5 && h < 15 && t.includes('piano') && !c.piano) say2('p', 'きょうは ピアノの レッスン 🎹 マークイズの 3かい、しまむら がっき だよ');
    if (h >= 8 && h < 8.5 && !t.length) say2('o', 'きょうは おやすみ！ どこに おでかけ しようか？ 🎈');
    void key;
  }
  function yochienOpen() { const h = CLK.h; return CLK.wd < 5 && h >= 8.5 && h < 15; }
  function busRuns() { const h = CLK.h; return CLK.wd < 5 && h >= 7 && h < 16; }
  function kumonOpen() { const h = CLK.h; return (CLK.wd === 1 || CLK.wd === 4) && h >= 14 && h < 19; }
  function pianoOpen() { const h = CLK.h; return h >= 10 && h < (CLK.wd >= 4 ? 21 : 20); }

  // ================= おてんき =================
  function weatherOf(day) {
    const r = hash01(day * 1.7 + 3, 11.3);
    return r < 0.16 ? 'rain' : r < 0.2 ? 'snow' : r < 0.36 ? 'cloud' : 'sun';
  }
  function weatherNow() {
    const w = weatherOf(save.clock.day), h = CLK.h;
    if (w === 'rain') return h >= 9 && h < 14 ? 'rain' : h >= 14 && h < 15.5 ? 'rainbow' : 'cloud';
    return w;
  }
  const WICON = { sun: '☀️', cloud: '☁️', rain: '☔', snow: '⛄', rainbow: '🌈' };
  let rainNode = null, lastW = '';
  function weatherTick() {
    const w = weatherNow();
    if (w !== lastW) {
      if (lastW) {
        if (w === 'rain') momSay('あめが ふってきたね ☔ かさを さそうね', 3.5);
        if (w === 'rainbow') momSay('みて！ にじが でてる 🌈', 4);
        if (w === 'snow') momSay('ゆきだ〜！ ⛄ さむいね', 3.5);
      }
      lastW = w;
    }
    const want = (w === 'rain') && !paused && P.state !== 'ghost';
    if (want && !rainNode) rainNode = loopNoise(0.06, 2500, 'highpass');
    if (!want && rainNode) { rainNode.stop(); rainNode = null; }
  }

  // ================= こうつう ルール（おうだんほどう・しんごう）=================
  const SIGS = (MAP.sig || []).map(([x, z, dx, dz], i) => ({ x, z, dx, dz, off: hash01(x, z) * 24, i }));
  const XINGS = (MAP.xing || []).map(([x, z, dx, dz]) => ({ x, z, dx, dz })).concat(SIGS.map((s) => ({ x: s.x, z: s.z, dx: s.dx, dz: s.dz, sig: s })));
  // おうだんほどう の しましま
  XINGS.forEach((c) => {
    const nx = -c.dz, nz = c.dx;
    for (let k = -3; k <= 3; k++) {
      const cx = c.x + nx * k * 0.6, cz = c.z + nz * k * 0.6;
      G.quad([cx - c.dx * 0.7 - nx * 0.18, 0.036, cz - c.dz * 0.7 - nz * 0.18], [cx + c.dx * 0.7 - nx * 0.18, 0.036, cz + c.dz * 0.7 - nz * 0.18],
        [cx + c.dx * 0.7 + nx * 0.18, 0.036, cz + c.dz * 0.7 + nz * 0.18], [cx - c.dx * 0.7 + nx * 0.18, 0.036, cz - c.dz * 0.7 + nz * 0.18], [0, 1, 0], C.white, 0);
    }
  });
  // しんごうの はしら（ほこうしゃ よう）
  SIGS.forEach((s) => { const px = s.x - s.dz * 2.4, pz = s.z + s.dx * 2.4; s.px = px; s.pz = pz; G.cyl(px, 0, pz, 0.07, 2.4, 5, C.gray); });
  function pedGreen(s) { const t = ((time + s.off) % 24 + 24) % 24; return t < 10 ? 'g' : t < 12 ? (Math.floor(t * 4) % 2 ? 'g' : 'o') : 'r'; }
  // おおきな みち の せぐめんと（ふみこんだ か しらべる）
  const RSEG = new Map();
  MAP.roads.forEach((r) => {
    if (r.a || !/^(trunk|primary|secondary|tertiary)$/.test(r.c)) return;
    for (let k = 0; k + 3 < r.p.length; k += 2) {
      const sg = { ax: r.p[k], az: r.p[k + 1], bx: r.p[k + 2], bz: r.p[k + 3], hw: r.w / 2 };
      const i0 = Math.floor(Math.min(sg.ax, sg.bx) / HC), i1 = Math.floor(Math.max(sg.ax, sg.bx) / HC), j0 = Math.floor(Math.min(sg.az, sg.bz) / HC), j1 = Math.floor(Math.max(sg.az, sg.bz) / HC);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const kk = hk(i, j); let l = RSEG.get(kk); if (!l) { l = []; RSEG.set(kk, l); } l.push(sg); }
    }
  });
  function onRoad(x, z) {
    const l = RSEG.get(hk(Math.floor(x / HC), Math.floor(z / HC))); if (!l) return false;
    for (const s of l) { const dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz || 1, t = clamp(((x - s.ax) * dx + (z - s.az) * dz) / L2, 0, 1); if (Math.hypot(s.ax + dx * t - x, s.az + dz * t - z) < s.hw - 0.2) return true; }
    return false;
  }
  function nearXing(x, z) { let b = null, bd = 1e9; for (const c of XINGS) { const d = Math.hypot(c.x - x, c.z - z), lim = c.sig ? 7 : 3.6; if (d < lim && d < bd) { bd = d; b = c; } } return b; } // しんごうの ある こうさてん は ひろめ
  function nearSig(x, z) { let b = null, bd = 14; for (const s of SIGS) { const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; b = s; } } return b; }
  const TR = { on: false, ok: false, warnT: -99 };
  function trafficTick() {
    if (P.state !== 'ground') { TR.on = false; return; }
    const on = onRoad(P.x, P.z);
    if (on && !TR.on) { // みちに ふみだした
      const c = nearXing(P.x, P.z), s = nearSig(P.x, P.z);
      if (c) {
        if (s && pedGreen(s) === 'r') { TR.ok = false; if (time - TR.warnT > 6) { TR.warnT = time; momSay('あかしんごう！ とまって、あおに なるまで まとうね 🚦', 3.5); } }
        else { TR.ok = true; P.handT = 3; momSay('てを あげて わたろうね ✋', 2.5); }
      } else { TR.ok = false; if (time - TR.warnT > 12) { TR.warnT = time; momSay('あぶないよ！ おうだんほどうを わたろうね 🚸', 3.5); } }
    }
    if (!on && TR.on && TR.ok) { TR.ok = false; save.traffic = (save.traffic || 0) + 1; store(); banner(`🚸 こうつう ルール まもれたね！<small>シール ${save.traffic}まい</small>`, 2.2); SFX.pick(); }
    TR.on = on;
    if (P.handT > 0) P.handT -= 1 / 60;
  }
  function drawSignals() {
    const g2 = [0.2, 1, 0.4], r2 = [1, 0.2, 0.2], off = [0.25, 0.25, 0.25];
    for (const s of SIGS) {
      if (Math.abs(s.px - P.x) > 50 || Math.abs(s.pz - P.z) > 50) continue;
      const st = pedGreen(s), b = M(T(s.px, 2.6, s.pz), RY(Math.atan2(s.dx, s.dz)));
      draw(mCube, M(b, S(0.36, 0.8, 0.22)), C.black);
      draw(mCube, M(b, T(0, 0.18, 0.12), S(0.26, 0.26, 0.04)), st === 'r' ? r2 : off, st === 'r' ? 1 : 0);
      draw(mCube, M(b, T(0, -0.18, 0.12), S(0.26, 0.26, 0.04)), st === 'g' ? g2 : off, st === 'g' ? 1 : 0);
      draw(mCube, M(b, T(0, 0.18, -0.12), S(0.26, 0.26, 0.04)), st === 'r' ? r2 : off, st === 'r' ? 1 : 0);
      draw(mCube, M(b, T(0, -0.18, -0.12), S(0.26, 0.26, 0.04)), st === 'g' ? g2 : off, st === 'g' ? 1 : 0);
    }
  }
  function drawWeather() {
    const w = weatherNow();
    if (w === 'rain' || w === 'snow') {
      const n = w === 'rain' ? 260 : 180;
      for (let i = 0; i < n; i++) {
        const ox = (hash01(i, 1) - 0.5) * 44, oz = (hash01(1, i) - 0.5) * 44, sp = w === 'rain' ? 26 : 3;
        const y = eye[1] + 14 - (((time * sp) + hash01(i, 2) * 28) % 28);
        const x = eye[0] + ox + (w === 'snow' ? Math.sin(time + i) * 0.6 : 0), z = eye[2] + oz;
        if (w === 'rain') draw(mCube, M(T(x, y, z), S(0.05, 1.0, 0.05)), [0.75, 0.85, 1], 1, 0.6);
        else draw(mSphere, M(T(x, y, z), S(0.1)), C.white, 1, 0.85);
      }
    }
    if (w === 'rainbow') {
      const cx = eye[0] + 360, cz = eye[2] - 360, R0 = 420; // いつも うみの ほう（ほくとう）に みえる
      ['#ff6b6b', '#ff922b', '#ffd43b', '#51cf66', '#4dabf7', '#5c7cfa', '#9775fa'].forEach((hc, k) => {
        const r = R0 - k * 9, col = hex(hc);
        for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI, x = cx + Math.cos(a) * r * 0.7, z = cz + Math.cos(a) * r * 0.7, y = Math.sin(a) * r * 0.62 - 20; draw(mCube, M(T(x, y, z), RY(-Math.PI / 4), RZ(a + Math.PI / 2), S(13, 36, 1)), col, 1, 0.5); }
      });
    }
  }

  // ================= せってい =================
  save.settings = Object.assign({ vol: 80, cam: 1, big: false, talk: 1, speed: 1, gfx: 2, prop: 0 }, save.settings || {});
  function applySettings() { document.body.classList.toggle('bigtext', !!save.settings.big); $('bProp').hidden = !save.settings.prop; if (!save.settings.prop && P.state === 'prop') { P.state = 'air'; P.ground = false; P.fallTop = P.y; } if (AC && AC._m) AC._m.gain.value = save.settings.vol / 100; }
  function OUT(a) { if (!a._m) { a._m = a.createGain(); a._m.connect(a.destination); } a._m.gain.value = save.settings.vol / 100; return a._m; }
  // ================= だい3だんかい: のりもの =================
  function lineOf(pts) {
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = L[L.length - 1];
    function at(s) {
      s = clamp(s, 0, total); let lo = 0, hi = L.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= s) lo = m; else hi = m; }
      const t = (s - L[lo]) / ((L[hi] - L[lo]) || 1), [ax, az] = pts[lo], [bx, bz] = pts[hi], l = Math.hypot(bx - ax, bz - az) || 1;
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, ux: (bx - ax) / l, uz: (bz - az) / l };
    }
    function sOf(x, z) { let best = 0, bd = 1e9; for (let i = 0; i + 1 < pts.length; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1), d = Math.hypot(ax + dx * t - x, az + dz * t - z); if (d < bd) { bd = d; best = L[i] + Math.sqrt(L2) * t; } } return best; }
    return { pts, L, total, at, sOf };
  }
  // --- あかいくつ（横浜市営バス・こども 110えん）: ちずの ルート どおり ---
  const AKAI = (MAP.akai || []).map((r, ri) => {
    const pts = []; for (let i = 0; i < r.p.length; i += 2) pts.push([r.p[i], r.p[i + 1]]);
    let ln = lineOf(pts); const seen = new Set();
    const named = r.stops.filter((st) => st.n && !seen.has(st.n) && seen.add(st.n));
    // バスていの じゅんばん（ちずの ルートの きろく どおり）に あわせて、せんの むきを そろえる
    if (named.length >= 2 && ln.sOf(named[0].x, named[0].z) > ln.sOf(named[named.length - 1].x, named[named.length - 1].z)) ln = lineOf(pts.slice().reverse());
    const stops = named.map((st) => Object.assign({}, st, { s: ln.sOf(st.x, st.z) }));
    for (let k = 1; k < stops.length; k++) if (stops[k].s < stops[k - 1].s) stops[k].s = stops[k - 1].s + 1;
    return Object.assign(ln, { name: r.n, stops, ri });
  }).filter((r) => r.stops.length >= 2);
  const AKAI_STOPS = [];
  AKAI.forEach((r, ri) => r.stops.forEach((st, si) => {
    if (si === r.stops.length - 1) return; // しゅうてん から は のれない（かえりの バスに のる）
    const f = freeSpot(st.x, st.z);
    G.cyl(f.x, 0, f.z, 0.08, 2.6, 6, C.gray); G.cyl(f.x, 2.6, f.z, 0.55, 0.12, 14, hex('#c92a2a')); G.box(f.x - 0.25, 1.1, f.z - 0.06, f.x + 0.25, 2.2, f.z + 0.06, C.white);
    AKAI_STOPS.push({ ri, si, x: f.x, z: f.z, name: st.n });
    DOORS.push({ id: 'akai' + ri + '_' + si, x: f.x, z: f.z, label: '👠<br>あかいくつ', color: hex('#c92a2a'),
      run: () => openShop('ticket', { title: '👠 あかいくつ', sub: st.n + ' から ・ ' + (r.stops[r.stops.length - 1].n) + ' ゆき', price: 110, what: 'あかいくつ こども', go: 'akai:' + ri + ':' + si, icon: '🚌' }) });
  }));
  // --- シーバス（Y Cruise）: よこはまえき ひがしぐち・ハンマーヘッド・ピアあかレンガ・やましたこうえん ---
  const SEA = (() => {
    const W0 = -340, Z0 = -470, CS = 4, NW = 200, NZ = 250;
    const wet = (x, z) => !isLand(x, z) && !onOuter(x, z) && !near(x - 1, z - 1, x + 1, z + 1).some((b) => b.y1 > -0.3 && x > b.x0 - 1 && x < b.x1 + 1 && z > b.z0 - 1 && z < b.z1 + 1);
    const cell = new Uint8Array(NW * NZ);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NW; i++) cell[j * NW + i] = wet(W0 + (i + 0.5) * CS, Z0 + (j + 0.5) * CS) ? 1 : 0;
    const toC = (x, z) => [Math.floor((x - W0) / CS), Math.floor((z - Z0) / CS)];
    const nearestWet = (x, z) => { const [ci, cj] = toC(x, z); for (let r = 0; r < 40; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = ci + di, j = cj + dj; if (i >= 0 && j >= 0 && i < NW && j < NZ && cell[j * NW + i]) return [i, j]; } return null; };
    function astar(a, b) {
      const N = NW * NZ, g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), open = [[0, a[1] * NW + a[0]]];
      g[a[1] * NW + a[0]] = 0; const goal = b[1] * NW + b[0];
      const push = (it) => { open.push(it); let i = open.length - 1; while (i) { const q = (i - 1) >> 1; if (open[q][0] <= open[i][0]) break; [open[q], open[i]] = [open[i], open[q]]; i = q; } };
      const pop = () => { const t = open[0], l = open.pop(); if (open.length) { open[0] = l; let i = 0; for (;;) { const x = i * 2 + 1, y = x + 1; let m = i; if (x < open.length && open[x][0] < open[m][0]) m = x; if (y < open.length && open[y][0] < open[m][0]) m = y; if (m === i) break; [open[m], open[i]] = [open[i], open[m]]; i = m; } } return t; };
      while (open.length) {
        const [, u] = pop(); if (u === goal) break; const ui = u % NW, uj = (u / NW) | 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue; const i = ui + di, j = uj + dj; if (i < 0 || j < 0 || i >= NW || j >= NZ) continue; const v = j * NW + i; if (!cell[v]) continue;
          const ng = g[u] + (di && dj ? 1.414 : 1); if (ng < g[v]) { g[v] = ng; from[v] = u; push([ng + Math.hypot(i - b[0], j - b[1]), v]); }
        }
      }
      if (from[goal] < 0 && goal !== a[1] * NW + a[0]) return null;
      const out = []; let u = goal; while (u >= 0) { out.unshift([W0 + (u % NW + 0.5) * CS, Z0 + (((u / NW) | 0) + 0.5) * CS]); u = from[u]; }
      // まっすぐ いける ところは まとめる
      const clear = (p, q) => { const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 2); for (let k = 1; k < n; k++) { const [ci, cj] = toC(p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n); if (!cell[cj * NW + ci]) return false; } return true; };
      const sm = [out[0]]; let k = 0; while (k < out.length - 1) { let m = out.length - 1; while (m > k + 1 && !clear(out[k], out[m])) m--; sm.push(out[m]); k = m; }
      return sm;
    }
    const PIERS = [
      { n: 'よこはまえき ひがしぐち（ベイクォーター）', p: GEO(35.4669, 139.6266) },
      { n: 'ハンマーヘッド', p: POI['新港さん橋'] ? [POI['新港さん橋'].x, POI['新港さん橋'].z] : [POI['横浜ハンマーヘッド'].x, POI['横浜ハンマーヘッド'].bb[3]] },
      { n: 'ピア あかレンガ', p: POI['ピア赤レンガ'] ? [POI['ピア赤レンガ'].x, POI['ピア赤レンガ'].z] : GEO(35.4528, 139.6440) },
      { n: 'やました こうえん', p: GEO(35.4456, 139.6503) },
    ].map((pr) => { const w = nearestWet(pr.p[0], pr.p[1]); return w ? Object.assign(pr, { w: [W0 + (w[0] + 0.5) * CS, Z0 + (w[1] + 0.5) * CS] }) : null; }).filter(Boolean);
    if (PIERS.length < 2) return null;
    const legs = [];
    for (let k = 0; k + 1 < PIERS.length; k++) { const a = toC(...PIERS[k].w), b = toC(...PIERS[k + 1].w), pth = astar(a, b); if (!pth) return null; legs.push(pth); }
    const all = []; legs.forEach((l, k) => (k ? l.slice(1) : l).forEach((q) => all.push(q)));
    const ln = lineOf(all);
    PIERS.forEach((pr) => { pr.s = ln.sOf(pr.w[0], pr.w[1]); });
    // のりば（りくの がわ）: かんばん と ドア
    PIERS.forEach((pr, k) => {
      const f = freeSpot(pr.w[0], pr.w[1]); pr.door = f;
      G.box(f.x - 0.1, 0, f.z - 0.1, f.x + 0.1, 2.8, f.z + 0.1, C.white); G.box(f.x - 0.9, 2.2, f.z - 0.08, f.x + 0.9, 2.9, f.z + 0.08, hex('#1971c2'));
      DOORS.push({ id: 'sea' + k, x: f.x, z: f.z, label: '⛴️<br>シーバス', color: hex('#1971c2'), run: () => openShop('seabass', { from: k, piers: PIERS.map((q) => q.n) }) });
    });
    return Object.assign(ln, { piers: PIERS });
  })();
  // --- くるま（みちを はしる。しんごうが あかなら とまる・ひとが いたら とまる）---
  const CARG = (() => {
    const DRV = { trunk: 1, primary: 1, secondary: 1, tertiary: 1, tertiary_link: 1, unclassified: 1, residential: 1 };
    const key = (x, z) => x.toFixed(1) + ',' + z.toFixed(1), nodes = new Map();
    const node = (x, z) => { const k = key(x, z); let n = nodes.get(k); if (!n) { n = { x, z, e: [] }; nodes.set(k, n); } return n; };
    MAP.roads.forEach((r) => { if (r.a || !DRV[r.c]) return; for (let k = 0; k + 3 < r.p.length; k += 2) { const a = node(r.p[k], r.p[k + 1]), b = node(r.p[k + 2], r.p[k + 3]); if (a === b) continue; a.e.push(b); b.e.push(a); } });
    const list = [...nodes.values()].filter((n) => n.e.length);
    list.forEach((n) => { n.sig = SIGS.find((s) => Math.hypot(s.x - n.x, s.z - n.z) < 6) || null; });
    return list;
  })();
  const CAR_COL = ['#e03131', '#1c7ed6', '#f8f9fa', '#212529', '#ffd43b', '#868e96', '#2f9e44', '#f783ac'].map(hex);
  const CARS = [];
  function spawnCar(c) {
    const near2 = CARG.filter((n) => Math.abs(n.x - P.x) < 120 && Math.abs(n.z - P.z) < 120);
    const a = (near2.length ? near2 : CARG)[Math.floor(Math.random() * (near2.length || CARG.length))]; if (!a) return;
    c.a = a; c.b = a.e[Math.floor(Math.random() * a.e.length)]; c.t = 0; c.v = 5; c.col = CAR_COL[Math.floor(Math.random() * CAR_COL.length)]; c.taxi = Math.random() < 0.15;
  }
  for (let i = 0; i < 34; i++) { const c = {}; CARS.push(c); }
  let carsReady = false;
  function carsTick(dt) {
    if (!CARG.length) return;
    if (!carsReady) { carsReady = true; CARS.forEach(spawnCar); }
    for (const c of CARS) {
      if (!c.a) { spawnCar(c); continue; }
      const L = Math.hypot(c.b.x - c.a.x, c.b.z - c.a.z) || 0.1, ux = (c.b.x - c.a.x) / L, uz = (c.b.z - c.a.z) / L;
      const x = c.a.x + ux * L * c.t + uz * 0.9, z = c.a.z + uz * L * c.t - ux * 0.9; // ひだり がわ つうこう
      // とまる りゆう: まえに ひと／しんごう あか（ほこうしゃ が あお の とき くるまは あか）
      let stop = false;
      const px = P.x - x, pz = P.z - z, ahead = px * ux + pz * uz, side = Math.abs(-px * uz + pz * ux);
      if (ahead > 0 && ahead < 5 && side < 1.8 && P.y < 2) stop = true;
      if (MOM && Math.hypot(MOM.x - x, MOM.z - z) < 2.5 && MOM.y < 2) stop = true;
      const remain = (1 - c.t) * L;
      if (c.b.sig && remain < 4 && remain > 0.5 && pedGreen(c.b.sig) !== 'r') stop = true;
      c.v += ((stop ? 0 : 5) - c.v) * Math.min(1, dt * (stop ? 6 : 1.5));
      if (stop && ahead > 0 && ahead < 5 && side < 1.8 && (!c.honk || time - c.honk > 4)) { c.honk = time; if (Math.hypot(px, pz) < 20) tone(440, 0.18, 'square', 0.03); }
      c.t += c.v * dt / L;
      if (c.t >= 1) { const nx = c.b.e.filter((n) => n !== c.a); c.a = c.b; c.b = (nx.length ? nx : c.b.e)[Math.floor(Math.random() * (nx.length || c.b.e.length))]; c.t = 0; }
      c.x = x; c.z = z; c.yaw = Math.atan2(ux, uz);
      if (Math.abs(x - P.x) > 170 || Math.abs(z - P.z) > 170) spawnCar(c);
    }
  }
  function drawCars(night) {
    for (const c of CARS) {
      const cr = save.settings.gfx >= 1 ? 140 : 70; if (c.x === undefined || Math.abs(c.x - P.x) > cr || Math.abs(c.z - P.z) > cr) continue;
      const b = M(T(c.x, 0, c.z), RY(c.yaw)), col = c.taxi ? hex('#ffd43b') : c.col;
      draw(mCube, M(b, T(0, 0.55, 0), S(1.6, 0.6, 3.2)), col);
      draw(mCube, M(b, T(0, 1.05, -0.2), S(1.4, 0.5, 1.7)), [0.55, 0.75, 0.9]);
      draw(mCube, M(b, T(0, 1.32, -0.2), S(1.42, 0.06, 1.72)), col);
      if (c.taxi) draw(mCube, M(b, T(0, 1.45, -0.2), S(0.5, 0.2, 0.25)), C.white, 0.5);
      [[-0.75, 1.0], [0.75, 1.0], [-0.75, -1.0], [0.75, -1.0]].forEach(([x, z]) => draw(mCube, M(b, T(x, 0.32, z), S(0.25, 0.64, 0.64)), C.black));
      [-0.55, 0.55].forEach((x) => { draw(mCube, M(b, T(x, 0.62, 1.61), S(0.3, 0.16, 0.04)), night > 0.3 ? [1, 1, 0.8] : C.white, night > 0.3 ? 1 : 0); draw(mCube, M(b, T(x, 0.62, -1.61), S(0.3, 0.14, 0.04)), C.red, night > 0.3 ? 1 : 0.2); });
    }
  }
  // --- のって いる あいだ ---
  function rideAkai(ri, si) {
    const r = AKAI[ri]; if (!r) return;
    P.state = 'akai'; P.ak = { ri, s: r.stops[si].s, next: si + 1, pause: 1.2 }; P.vx = P.vy = P.vz = 0; P.glide = false; lastDoorId = '-';
    $('talk').style.display = 'none'; lastTalk = null;
    banner('👠 あかいくつ しゅっぱつ！<small>つぎは ' + r.stops[si + 1].n + '</small>', 3);
  }
  function akaiUpdate(dt) {
    const a = P.ak, r = AKAI[a.ri];
    if (a.pause > 0) { a.pause -= dt; }
    else {
      a.s += 6.5 * dt;
      const st = r.stops[a.next];
      if (st && a.s >= st.s) {
        a.s = st.s; const last = a.next === r.stops.length - 1;
        tone(880, 0.12, 'sine', 0.1); tone(660, 0.2, 'sine', 0.1, null, 0.14);
        if (last) { endAkai('👠 しゅうてん「' + st.n + '」に つきました'); return; }
        banner('🚏 ' + st.n + '<small>おりる なら「おりる」。つぎは ' + r.stops[a.next + 1].n + '</small>', 3);
        a.pause = 3.2; a.next++;
      }
    }
    const q = r.at(a.s), want = Math.atan2(q.ux, q.uz); let d = want - (a.yaw === undefined ? want : a.yaw); while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; a.yaw = (a.yaw === undefined ? want : a.yaw) + d * Math.min(1, 5 * dt);
    a.x = q.x + q.uz * 0.9; a.z = q.z - q.ux * 0.9;
    P.x = a.x - Math.cos(a.yaw) * 0.6; P.z = a.z + Math.sin(a.yaw) * 0.6; P.y = 0.55; P.face = a.yaw; P.speed = 0;
  }
  function endAkai(msg) {
    const a = P.ak, f = freeSpot(a.x - Math.cos(a.yaw) * 3, a.z + Math.sin(a.yaw) * 3);
    P.x = f.x; P.z = f.z; P.y = 0; P.state = 'ground'; P.ground = true; P.ak = null; lastDoorId = '-'; banner(msg, 2.6); momSay('あかいくつ、たのしかったね 👠', 3);
  }
  function drawAkai(x, z, yaw) {
    const b = M(T(x, 0, z), RY(yaw)), red = hex('#c92a2a'), cream = hex('#fff3bf');
    draw(mCube, M(b, T(0, 1.0, 0), S(2.9, 1.2, 6.6)), red); draw(mCube, M(b, T(0, 1.65, 0), S(2.92, 0.12, 6.62)), cream);
    draw(mCube, M(b, T(0, 2.55, 0), S(2.9, 0.22, 6.6)), red); draw(mCube, M(b, T(0, 2.75, 0), S(2.4, 0.2, 5.6)), cream);
    [-1.42, 1.42].forEach((sx) => [3.1, -3.1].forEach((sz) => draw(mCube, M(b, T(sx, 2.05, sz), S(0.1, 0.8, 0.12)), red)));
    [-0.8, 0.8].forEach((sx) => draw(mSphere, M(b, T(sx, 1.0, 3.31), S(0.22, 0.22, 0.05)), [1, 1, 0.85], 0.8));
    draw(mCube, M(b, T(0, 2.25, 3.31), S(1.8, 0.35, 0.04)), C.white);
    [[-1.35, 2.1], [1.35, 2.1], [-1.35, -2.1], [1.35, -2.1]].forEach(([sx, sz]) => draw(mCube, M(b, T(sx, 0.4, sz), S(0.3, 0.8, 0.8)), C.black));
  }
  function akaiIdle() { // のって いない ときも 1だい まわって いる
    if (!AKAI.length) return null;
    const tot = AKAI.reduce((s, r) => s + r.total, 0); let s = (time * 6.5) % tot, k = 0; while (k < AKAI.length - 1 && s > AKAI[k].total) { s -= AKAI[k].total; k++; }
    const q = AKAI[k].at(s); return { x: q.x + q.uz * 0.9, z: q.z - q.ux * 0.9, yaw: Math.atan2(q.ux, q.uz) };
  }
  function rideSea(from, to) {
    if (!SEA) return;
    P.state = 'boat'; P.sb = { s: SEA.piers[from].s, dir: to > from ? 1 : -1, to }; P.vx = P.vy = P.vz = 0; P.glide = false; lastDoorId = '-';
    $('talk').style.display = 'none'; lastTalk = null;
    banner('⛴️ シーバス しゅっぱつ！<small>' + SEA.piers[to].n + ' まで</small>', 3);
  }
  function boatUpdate(dt) {
    const b = P.sb; b.s += b.dir * 9 * dt; const end = SEA.piers[b.to].s;
    const done = b.dir > 0 ? b.s >= end : b.s <= end; if (done) b.s = end;
    const q = SEA.at(b.s), want = Math.atan2(q.ux * b.dir, q.uz * b.dir); let d = want - (b.yaw === undefined ? want : b.yaw); while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; b.yaw = (b.yaw === undefined ? want : b.yaw) + d * Math.min(1, 3 * dt);
    b.x = q.x; b.z = q.z; P.x = q.x; P.z = q.z; P.y = WATER + 1.3; P.face = b.yaw; P.speed = 0;
    if (Math.random() < dt * 20) puffs.push({ x: q.x - Math.sin(b.yaw) * 3 + (Math.random() - 0.5), y: WATER + 0.3, z: q.z - Math.cos(b.yaw) * 3 + (Math.random() - 0.5), t: 0, vy: 0.3, w: 1 });
    if (done) {
      const f = SEA.piers[b.to].door; P.x = f.x; P.z = f.z; P.y = 0; P.state = 'ground'; P.ground = true; P.sb = null; lastDoorId = '-';
      tone(523, 0.3, 'sine', 0.1); tone(392, 0.4, 'sine', 0.1, null, 0.3); banner('⛴️ ' + SEA.piers[b.to].n + ' に つきました', 2.8); momSay('うみの うえ、きもち よかったね 🌊', 3);
    }
  }
  function drawBoat(x, z, yaw) {
    const b = M(T(x, WATER, z), RY(yaw));
    draw(mCube, M(b, T(0, 0.5, 0), S(3.4, 1.0, 8.4)), C.white); draw(mCube, M(b, T(0, 0.35, 0), S(3.44, 0.3, 8.44)), hex('#1971c2'));
    draw(mCube, M(b, T(0, 1.5, -0.4), S(2.8, 1.1, 5.4)), C.white); draw(mCube, M(b, T(0, 1.55, -0.4), S(2.84, 0.5, 5.2)), [0.5, 0.75, 0.95]);
    draw(mCube, M(b, T(0, 2.1, -0.4), S(2.9, 0.12, 5.6)), hex('#1971c2')); draw(mCube, M(b, T(0, 0.9, 4.1), S(2.4, 0.4, 0.6)), C.white);
  }
  function seaIdle() {
    if (!SEA) return null; const T2 = SEA.total * 2, u = (time * 9) % T2, fwd = u < SEA.total, s = fwd ? u : T2 - u, q = SEA.at(s);
    return { x: q.x, z: q.z, yaw: Math.atan2(q.ux * (fwd ? 1 : -1), q.uz * (fwd ? 1 : -1)) };
  }
  // ================= だい4だんかい: やました こうえん・ちゅうかがい・ひかわまる =================
  // ちゅうかがいの もん（ぱいろう）: OSM の いち に、みちを またぐ むきで たてる
  function nearRoad(x, z) {
    let best = null, bd = 1e9;
    for (const r of MAP.roads) for (let i = 0; i + 3 < r.p.length; i += 2) {
      const ax = r.p[i], az = r.p[i + 1], dx = r.p[i + 2] - ax, dz = r.p[i + 3] - az, L2 = dx * dx + dz * dz || 1;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1), d = Math.hypot(x - ax - dx * t, z - az - dz * t);
      if (d < bd) { bd = d; const L = Math.sqrt(L2); best = { r, d, ux: dx / L, uz: dz / L }; }
    }
    return best;
  }
  const GATES = [['善隣門', '#d6336c', 'ぜんりんもん'], ['玄武門', '#343a40', 'げんぶもん（きた・くろ）'], ['朝陽門(青龍門)', '#1c7ed6', 'ちょうようもん（ひがし・あお）']].map(([n, col, yomi]) => {
    const q = POI[n]; if (!q) return null;
    const rd = nearRoad(q.x, q.z), ux = rd ? rd.ux : 1, uz = rd ? rd.uz : 0, nx = -uz, nz = ux;
    const hs = Math.max(2.4, (rd ? rd.r.w : 3) / 2 + 1.1), big = n === '朝陽門(青龍門)' ? 1.15 : 1, Hh = 4.6 * big;
    const pc = hex(col), gold = C.gold, green = hex('#2b8a3e'), U = [nx, 0, nz], N2 = [ux, 0, uz];
    [-1, 1].forEach((sd) => { // はしら
      const px = q.x + nx * hs * sd, pz = q.z + nz * hs * sd;
      G.obox([px, Hh / 2, pz], U, [0, 1, 0], N2, 0.22, Hh / 2, 0.22, pc);
      G.obox([px, 0.25, pz], U, [0, 1, 0], N2, 0.38, 0.25, 0.38, C.white);
      addSolid({ x0: px - 0.25, y0: 0, z0: pz - 0.25, x1: px + 0.25, y1: Hh, z1: pz + 0.25, climb: true });
    });
    G.obox([q.x, Hh - 1.0, q.z], U, [0, 1, 0], N2, hs + 0.3, 0.16, 0.18, pc);       // よこぎ
    G.obox([q.x, Hh - 0.45, q.z], U, [0, 1, 0], N2, hs * 0.55, 0.32, 0.2, gold);     // がく（きんいろ）
    G.obox([q.x + ux * 0.21, Hh - 0.45, q.z + uz * 0.21], U, [0, 1, 0], N2, hs * 0.45, 0.22, 0.01, hex('#c92a2a'));
    G.obox([q.x, Hh + 0.05, q.z], U, [0, 1, 0], N2, hs + 0.9, 0.14, 0.75, green);   // やね
    G.obox([q.x, Hh + 0.32, q.z], U, [0, 1, 0], N2, hs + 0.5, 0.14, 0.5, green);
    G.obox([q.x, Hh + 0.52, q.z], U, [0, 1, 0], N2, hs + 0.1, 0.07, 0.12, gold);
    [-1, 1].forEach((sd) => G.obox([q.x + nx * (hs + 0.9) * sd, Hh + 0.25, q.z + nz * (hs + 0.9) * sd], U, [0, 1, 0], N2, 0.12, 0.22, 0.7, gold)); // はねあがる のき
    return { n, x: q.x, z: q.z, ux, uz, hs, yomi };
  }).filter(Boolean);
  // ちょうちん: ちゅうかがい おおどおり・かんていびょう どおり
  MAP.roads.forEach((r) => {
    if (r.n !== '中華街大通り' && r.n !== '関帝廟通り') return;
    for (let i = 0; i + 3 < r.p.length; i += 2) {
      const ax = r.p[i], az = r.p[i + 1], dx = r.p[i + 2] - ax, dz = r.p[i + 3] - az, L = Math.hypot(dx, dz); if (L < 1) continue;
      const nx = -dz / L, nz = dx / L, hw = r.w / 2 + 0.5;
      for (let s = 1.2; s < L; s += 2.4) {
        const x = ax + dx * s / L, z = az + dz * s / L;
        [-1, 1].forEach((sd) => { const lx = x + nx * hw * sd * 0.55, lz = z + nz * hw * sd * 0.55; G.cyl(lx, 3.1, lz, 0.26, 0.42, 8, hex('#f03e3e'), 5); G.cyl(lx, 3.52, lz, 0.18, 0.06, 8, C.gold); });
      }
      G.beam([ax + nx * (r.w / 2 + 0.3), 3.6, az + nz * (r.w / 2 + 0.3)], [r.p[i + 2] + nx * (r.w / 2 + 0.3), 3.6, r.p[i + 3] + nz * (r.w / 2 + 0.3)], 0.02, C.black);
      G.beam([ax - nx * (r.w / 2 + 0.3), 3.6, az - nz * (r.w / 2 + 0.3)], [r.p[i + 2] - nx * (r.w / 2 + 0.3), 3.6, r.p[i + 3] - nz * (r.w / 2 + 0.3)], 0.02, C.black);
    }
  });
  // びょう（おてら）: あかい かべ と みどりの やね を のせる
  function byoRoof(n) {
    const q = POI[n]; if (!q || !q.bb) return null;
    const [x0, z0, x1, z1] = q.bb, y = Math.max(q.h || 2.4, 2.4), red = hex('#c92a2a'), green = hex('#2b8a3e');
    G.box(x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, y, z1 + 0.05, red, 0, red);
    G.box(x0 - 0.7, y, z0 - 0.7, x1 + 0.7, y + 0.35, z1 + 0.7, green); G.box(x0 - 0.2, y + 0.35, z0 - 0.2, x1 + 0.2, y + 0.9, z1 + 0.2, green);
    G.box(x0 + 0.5, y + 0.9, z0 + 0.5, x1 - 0.5, y + 1.4, z1 - 0.5, hex('#37b24d'), 0, C.gold);
    G.cyl((x0 + x1) / 2, y + 1.4, (z0 + z1) / 2, 0.3, 0.7, 8, C.gold);
    return q;
  }
  const KANTEI = byoRoof('横浜関帝廟'), MAZU = byoRoof('横浜媽祖廟');
  // にくまん やさん（ぜんりんもん の ちかく）
  const NIKU = (() => {
    const g = GATES.find((q) => q.n === '善隣門'); if (!g) return null;
    for (const s of [7, -7, 11, -11, 15]) for (const sd of [1, -1]) {
      const x = g.x + g.ux * s - g.uz * (g.hs + 1.4) * sd, z = g.z + g.uz * s + g.ux * (g.hs + 1.4) * sd;
      if (!isLand(x, z) || blockedAt(x, 0, z) || blockedAt(x - g.uz * 1.6 * sd, 0, z + g.ux * 1.6 * sd)) continue;
      const bx = x - g.uz * 1.5 * sd, bz = z + g.ux * 1.5 * sd, U = [g.ux, 0, g.uz], N2 = [-g.uz * sd, 0, g.ux * sd];
      G.obox([bx, 0.55, bz], U, [0, 1, 0], N2, 1.3, 0.55, 0.5, hex('#c92a2a'));
      G.obox([bx, 1.15, bz], U, [0, 1, 0], N2, 1.1, 0.06, 0.4, C.white);
      [-0.6, 0, 0.6].forEach((o) => G.cyl(bx + g.ux * o, 1.21, bz + g.uz * o, 0.3, 0.22, 8, hex('#e9ecef')));
      G.obox([bx, 2.2, bz], U, [0, 1, 0], N2, 1.5, 0.08, 0.9, hex('#ffd43b'));
      G.obox([bx - N2[0] * 0.5, 2.6, bz - N2[2] * 0.5], U, [0, 1, 0], N2, 1.0, 0.3, 0.05, hex('#c92a2a'));
      addSolid({ x0: bx - 0.55, y0: 0, z0: bz - 0.55, x1: bx + 0.55, y1: 1.1, z1: bz + 0.55, climb: true });
      return { x, z };
    }
    return null;
  })();
  // ひかわまる（やました こうえんの まえに いる ふね）
  const HIKAWA = (() => {
    const sp = POI['氷川丸']; if (!sp || !sp.poly) return null;
    const p = sp.poly, n = p.length / 2; let a = 0, b = 0, best = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = Math.hypot(p[i * 2] - p[j * 2], p[i * 2 + 1] - p[j * 2 + 1]); if (d > best) { best = d; a = i; b = j; } }
    const ax = p[a * 2], az = p[a * 2 + 1], ux = (p[b * 2] - ax) / best, uz = (p[b * 2 + 1] - az) / best;
    const cx = ax + ux * best / 2, cz = az + uz * best / 2, hw = 2.5, U = [ux, 0, uz], N2 = [-uz, 0, ux];
    const at = (t, s) => [cx + ux * best * t - uz * s, cz + uz * best * t + ux * s];
    G.obox([cx, 0.6, cz], U, [0, 1, 0], N2, best / 2 - 1.2, 1.8, hw, C.black);
    G.obox([cx, 2.3, cz], U, [0, 1, 0], N2, best / 2 - 1.2, 0.12, hw + 0.02, C.white);
    { const [x, z] = at(0.5, 0); G.obox([x, 0.6, z], U, [0, 1, 0], N2, 1.2, 1.8, hw * 0.5, C.black); }
    { const [x, z] = at(-0.5, 0); G.obox([x, 0.6, z], U, [0, 1, 0], N2, 1.2, 1.8, hw * 0.6, C.black); }
    G.obox([cx, -0.9, cz], U, [0, 1, 0], N2, best / 2 - 1.2, 0.3, hw, hex('#c92a2a'));
    const deck = 2.45;
    G.obox([cx, deck, cz], U, [0, 1, 0], N2, best / 2 - 1.3, 0.05, hw - 0.1, C.wood);
    [[0, 0.24, 1.4], [0.02, 0.18, 2.6], [0.03, 0.12, 3.6]].forEach(([t, L, y]) => { const [x, z] = at(t, 0); G.obox([x, deck + y - 0.5, z], U, [0, 1, 0], N2, best * L, 0.5, hw - 0.4, C.white, 1); });
    { const [x, z] = at(0.02, 0); G.cyl(x, deck + 3.6, z, 0.9, 2.6, 10, C.black); G.cyl(x, deck + 4.4, z, 0.92, 0.5, 10, hex('#f8f9fa')); G.cyl(x, deck + 4.55, z, 0.93, 0.1, 10, hex('#c92a2a')); G.cyl(x, deck + 4.75, z, 0.93, 0.1, 10, hex('#c92a2a')); }
    [-0.33, 0.33].forEach((t) => { const [x, z] = at(t, 0); G.beam([x, deck, z], [x, deck + 8, z], 0.12, C.tan); });
    for (let t = -0.47; t < 0.48; t += 0.06) { const [x, z] = at(t, 0); const r = hw * (Math.abs(t) > 0.42 ? 0.6 : 0.95); addSolid({ x0: x - r, y0: -2, z0: z - r, x1: x + r, y1: deck, z1: z + r }); }
    return { x: cx, z: cz, ux, uz, len: best };
  })();
  // やました こうえん: ふんすい「みずの まもりがみ」と あかいくつの おんなのこ
  const YAMA = (() => {
    const q = POI['山下公園']; if (!q) return null;
    const f = freeSpot(q.x, q.z), x = f.x, z = f.z;
    G.cyl(x, 0, z, 3.0, 0.5, 18, hex('#ced4da')); G.cyl(x, 0.5, z, 2.7, 0.02, 18, C.water, 2);
    G.cyl(x, 0, z, 0.5, 2.2, 10, hex('#adb5bd')); G.sphere(x, 2.6, z, 0.42, 6, hex('#868e96'));
    addSolid({ x0: x - 2.6, y0: 0, z0: z - 2.6, x1: x + 2.6, y1: 0.5, z1: z + 2.6, climb: true });
    [[-5, 0], [5, 0], [0, -5], [0, 5]].forEach(([dx, dz]) => { if (!blockedAt(x + dx, 0, z + dz) && isLand(x + dx, z + dz)) { G.box(x + dx - 1, 0, z + dz - 1, x + dx + 1, 0.3, z + dz + 1, hex('#8a5a33')); for (let k = 0; k < 6; k++) G.sphere(x + dx + Math.cos(k) * 0.6, 0.42, z + dz + Math.sin(k) * 0.6, 0.22, 4, hex(['#ff6b6b', '#ffd43b', '#f783ac', '#ffffff', '#ff922b', '#cc5de8'][k])); } });
    // あかいくつの おんなのこ（うみの そば・だいたいの いち）
    let s = null;
    if (HIKAWA) { const w = freeSpot(HIKAWA.x - HIKAWA.uz * 9, HIKAWA.z + HIKAWA.ux * 9); s = w; }
    if (s) {
      G.box(s.x - 0.4, 0, s.z - 0.4, s.x + 0.4, 0.5, s.z + 0.4, hex('#adb5bd'));
      G.cyl(s.x, 0.5, s.z, 0.18, 0.12, 8, hex('#e03131')); G.cyl(s.x, 0.62, s.z, 0.2, 0.55, 8, hex('#7a6a58'), 0, 0.14); G.sphere(s.x, 1.32, s.z, 0.2, 6, hex('#7a6a58'));
      addSolid({ x0: s.x - 0.4, y0: 0, z0: s.z - 0.4, x1: s.x + 0.4, y1: 0.5, z1: s.z + 0.4, climb: true });
    }
    return { x, z, girl: s };
  })();
  // にっぽんまる の ほ（そうはん てんぱん の ひ だけ でる）
  const SAILG = new Geo();
  if (SHIP) {
    SHIP.masts.forEach((m, i) => {
      const L0 = 3.2, ys = [m.h - 8, m.h - 5.3, m.h - 2.6];
      ys.forEach((y, j) => {
        const L = L0 - j * 0.6, Lb = j === 0 ? L * 1.05 : L0 - (j - 1) * 0.6, yb = j === 0 ? 3.0 : ys[j - 1];
        const nx = -SHIP.uz, nz = SHIP.ux, bx = SHIP.ux * 0.35, bz = SHIP.uz * 0.35;
        const A = [m.x + nx * L, y, m.z + nz * L], Bp = [m.x - nx * L, y, m.z - nz * L], Cc = [m.x - nx * Lb + bx, yb + 0.2, m.z - nz * Lb + bz], D = [m.x + nx * Lb + bx, yb + 0.2, m.z + nz * Lb + bz];
        SAILG.quad(A, Bp, Cc, D, [SHIP.ux, 0, SHIP.uz], hex('#fffdf5'), 0);
        if (i < 3) SAILG.quad(A, Bp, Cc, D, [SHIP.ux, 0, SHIP.uz], hex('#fffdf5'), 0);
      });
    });
    // まえの さんかくの ほ（ジブ）
    const f = SHIP.masts[0], bw = SHIP.bow;
    [0.3, 0.55, 0.8].forEach((k) => SAILG.tri([f.x, 3 + (f.h - 3) * k, f.z], [bw.x, 2.6, bw.z], [f.x + (bw.x - f.x) * 0.25, 2.9, f.z + (bw.z - f.z) * 0.25], [-SHIP.uz, 0, SHIP.ux], hex('#fffdf5'), 0));
  }
  const NMDOOR = SHIP ? (() => { for (const s of [5, -5, 8]) { const f = freeSpot(SHIP.cx - SHIP.uz * s, SHIP.cz + SHIP.ux * s); if (Math.hypot(f.x - SHIP.cx, f.z - SHIP.cz) < 14) return f; } return freeSpot(SHIP.cx, SHIP.cz); })() : null;
  if (NMDOOR) DOORS.push({ id: 'nipponmaru', x: NMDOOR.x, z: NMDOOR.z, label: '⛵<br>みる', color: hex('#1864ab'), run: () => openShop('nipponmaru') });
  const CUPD = doorOn('Cupnoodles Museum', WPP.x, WPP.z);
  addDoor('cupnoodle', CUPD, '🍜<br>はいる', hex('#e03131'), () => openShop('cupnoodle'));
  // てつどう もけい の はくぶつかん（よこはま みつい ビルディング 2かい・たかしま 1-1-2）
  const HARAD = POI['横浜三井ビルディング'] ? doorOn('横浜三井ビルディング', POI['横浜三井ビルディング'].x + 30, POI['横浜三井ビルディング'].z + 30) : null;
  addDoor('hara', HARAD, '🚂<br>はくぶつかん', hex('#1864ab'), () => openShop('hara'));
  if (NIKU) DOORS.push({ id: 'nikuman', x: NIKU.x, z: NIKU.z, label: '🥟<br>かう', color: hex('#c92a2a'), run: () => openShop('chuka') });
  [[KANTEI, 'kantei', '横浜関帝廟'], [MAZU, 'mazu', '横浜媽祖廟']].forEach(([q, id, n]) => { if (!q) return; const d = doorOn(n, q.x + 30, q.z - 30), f = d ? { x: d.ox, z: d.oz } : freeSpot(q.x, q.z); if (f) DOORS.push({ id, x: f.x, z: f.z, label: '🙏<br>おまいり', color: hex('#c92a2a'), run: () => openShop('byo', id) }); });
  // ================= だい5だんかい: でんしゃ（JR・ブルーライン・みなとみらいせん）=================
  const EKI_YOMI = { '桜木町': 'さくらぎちょう', '関内': 'かんない', '高島町': 'たかしまちょう', '新高島': 'しんたかしま', 'みなとみらい': 'みなとみらい', '馬車道': 'ばしゃみち', '日本大通り': 'にほんおおどおり', '元町・中華街': 'もとまち・ちゅうかがい', '横浜': 'よこはま' };
  const LINE_INFO = {
    jr: { name: 'JR けいひんとうほくせん・ねぎしせん', short: 'JR', col: '#00b2e5', ic: '🚃', sub: false },
    blue: { name: 'よこはま しえい ちかてつ ブルーライン', short: 'ブルーライン', col: '#0067c0', ic: '🚇', sub: true },
    mm: { name: 'みなとみらいせん', short: 'みなとみらいせん', col: '#0b2a6b', ic: '🚇', sub: true },
  };
  // せんろの たかさ（ちずの せんろ が はし なら たかい ところ）
  function railY(x, z) {
    let bd = 1e9, y = 0.04;
    for (const r of MAP.rail) for (let i = 0; i + 3 < r.p.length; i += 2) {
      const ax = r.p[i], az = r.p[i + 1], dx = r.p[i + 2] - ax, dz = r.p[i + 3] - az, L2 = dx * dx + dz * dz || 1;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1), d = Math.hypot(ax + dx * t - x, az + dz * t - z);
      if (d < bd) { bd = d; y = r.e ? 3 : 0.04; }
    }
    return bd < 6 ? y : null;
  }
  const YOKOHAMA_EKI = GEO(35.4657, 139.6223);
  const TRAINS = (MAP.trains || []).map((t, li) => {
    const pts = []; for (let i = 0; i < t.p.length; i += 2) pts.push([t.p[i], t.p[i + 1]]);
    const ln = lineOf(pts);
    const stops = t.stops.map((st) => ({ n: st.n, x: st.x, z: st.z, s: ln.sOf(st.x, st.z) }));
    // よこはまえき は ちずの はし。せんが ちかくを とおって いれば えきに する
    const ys = ln.sOf(YOKOHAMA_EKI[0], YOKOHAMA_EKI[1]), yq = ln.at(ys);
    if (!stops.some((s) => s.n === '横浜') && Math.hypot(yq.x - YOKOHAMA_EKI[0], yq.z - YOKOHAMA_EKI[1]) < 45) stops.push({ n: '横浜', x: yq.x, z: yq.z, s: ys });
    stops.sort((a, b) => a.s - b.s);
    const info = LINE_INFO[t.k] || LINE_INFO.jr;
    let hs = null;
    if (!info.sub) { // JR は たかさ を じゅんびして なめらかに
      const raw = pts.map(([x, z]) => railY(x, z)); let lastY = 3; const fill = raw.map((y) => (y === null ? lastY : (lastY = y)));
      hs = fill.map((_, i) => { let s = 0, n = 0; for (let k = Math.max(0, i - 3); k <= Math.min(fill.length - 1, i + 3); k++) { s += fill[k]; n++; } return s / n; });
    }
    const yAt = (s) => { if (!hs) return 0; let lo = 0, hi = ln.L.length - 1; s = clamp(s, 0, ln.total); while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ln.L[m] <= s) lo = m; else hi = m; } const t2 = (s - ln.L[lo]) / ((ln.L[hi] - ln.L[lo]) || 1); return hs[lo] + (hs[hi] - hs[lo]) * t2; };
    stops.forEach((st, si) => {
      const f = freeSpot(st.x, st.z); st.door = f;
      const col = hex(info.col);
      if (info.sub) { // ちかてつの いりぐち
        G.box(f.x - 1.3, 0, f.z + 1.0, f.x + 1.3, 2.4, f.z + 1.3, hex('#dee2e6')); G.box(f.x - 1.4, 2.4, f.z - 0.6, f.x + 1.4, 2.6, f.z + 1.4, col);
        G.box(f.x - 1.3, 0, f.z - 0.4, f.x - 1.15, 2.4, f.z + 1.0, hex('#dee2e6')); G.box(f.x + 1.15, 0, f.z - 0.4, f.x + 1.3, 2.4, f.z + 1.0, hex('#dee2e6'));
      }
      G.box(f.x + 1.6, 0, f.z - 0.08, f.x + 1.72, 2.8, f.z + 0.08, C.gray); G.box(f.x + 1.2, 2.8, f.z - 0.1, f.x + 2.2, 3.5, f.z + 0.1, col, 5);
      DOORS.push({ id: 'eki_' + li + '_' + si, x: f.x, z: f.z, label: info.ic + '<br>えき', color: col, run: () => openShop('train', { li, si }) });
    });
    return Object.assign(ln, { k: t.k, info, stops, yAt, li });
  }).filter((t) => t.stops.length >= 2);
  const AKAI_OFF = { id: 'akaioff', x: 0, z: 0, label: '🚏<br>おりる', color: hex('#c92a2a'), run: () => endAkai('🚏 おりたよ') };
  const staticMesh = G.upload();
  const mSails = SAILG.upload();

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
      const q = fwPos(Math.cos(a) * FW.Rc, FW.hub + Math.sin(a) * FW.Rc, 0);
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
  { const q = fwPos(0, FW.hub + 2.3, 0); star('fw-hub', { x: q[0], y: q[1], z: q[2] }); const t2 = fwPos(0, FW.hub + FW.Rc + 1.1, 0); star('fw-top', { x: t2[0], y: t2[1], z: t2[2] }); }
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
  const START = (() => { const f = { x: HOMEDOOR.ox, z: HOMEDOOR.oz }, nx = HOMEDOOR.nx, nz = HOMEDOOR.nz; return { x: f.x, y: 0, z: f.z, yaw: Math.atan2(nx, nz), face: Math.atan2(-nx, -nz) }; })(); // おうちを みて たつ（カメラは みち がわ） // おうち（プラウド）の まえ から
  const NPCS = [];
  function npc(x, z, col, who, say, y) { const f = y ? { x, z } : freeSpot(x, z); NPCS.push({ x: f.x, z: f.z, y: y || 0, col, who, say }); }
  npc(START.x + 3, START.z - 2, C.orange, 'となりの おにいさん', 'あおちゃん！ ランドマークタワーの てっぺんに きんいろの ほしが あるんだって。かべに むかって すすむと よじのぼれるよ！');
  npc(LMC.x + 6, LMB[3] + 4, C.pink, 'おねえさん', 'みどりの わが へったら、しろい バルコニーで ひとやすみ。🍙 を たべると げんき まんたん！');
  if (CAB) npc(CAB.ends[1].door.x + 2, CAB.ends[1].door.z + 1, C.green, 'えきいんさん', 'エアキャビンは こども 500えん。うみの うえを とんで、ワールドポーターズの ちかくまで いけるよ 🚡');
  if (SHIP) npc(SHIP.cx + 6, SHIP.cz + 6, C.teal, 'ふなのりさん', 'にっぽんまるの まんなかの マストの うえに ほしが ひかっているよ。');
  npc(FW.cx + 8, FW.cz + 6, C.purple, 'かんらんしゃの ひと', 'きいろい だいから はこの やねに とびのってごらん。そらの てっぺんまで はこんでくれるよ。');
  npc(MARKP.x + 4, MARKP.bb[3] + 5, C.red, 'おもちゃやさん', 'マークイズの 3かいに トイザらスが あるよ。プラレールが いっぱい！ 🚄');
  // ママ は いつも あおちゃんに ついてくる（下の MOM）。くもんの まえの ベンチ だけ のこす
  npc(HOSP.x + 6, HOSP.bb[3] + 4, C.white, 'かんごしさん', 'ここは けいゆう びょういん。みんなの けがや びょうきを なおす ところだよ 🏥');
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
    zp('cupnoodle', 'カップヌードル ミュージアム', 'Cupnoodles Museum', { say: 'じぶんだけの カップヌードル つくろうか 🍜' }),
    zp('worldporters', 'ワールドポーターズ', 'Yokohama World Porters'),
    { id: 'aircabin', name: 'エアキャビン', x: CAB ? CAB.at(CAB.total / 2).x : 0, z: CAB ? CAB.at(CAB.total / 2).z : 0, r: 0, ride: true },
    zp('kishamichi', 'きしゃみち', '汽車道', { r: 10 }),
    zp('akarenga', 'あかレンガそうこ', '横浜赤レンガ倉庫2号館', { r: 22 }),
    zp('hammerhead', 'ハンマーヘッド', '横浜ハンマーヘッド'),
    zp('osanbashi', 'おおさんばし', '大さん橋', { r: 40 }),
    zp('zounohana', 'ぞうのはなパーク', '象の鼻パーク', { r: 25 }),
    { id: 'home', name: 'あおちゃんの おうち（プラウド）', x: PROWD.x, z: PROWD.z, r: 12 },
    { id: 'gankiro', name: 'いわかめどおり（バスてい）', x: STOP.x, z: STOP.z, r: 5 },
    { id: 'yochien', name: 'とべ ようちえん', x: YOCHI.x, z: YOCHI.z, r: 14 },
    zp('chukagai', 'よこはま ちゅうかがい', '横浜中華街', { r: 30, say: 'いい におい！ にくまん たべたいね 🥟' }),
    zp('kantei', 'かんていびょう', '横浜関帝廟', { r: 8, say: 'きらきらの おてらだね。おまいり しようか 🙏' }),
    zp('mazu', 'まそびょう', '横浜媽祖廟', { r: 8, say: 'うみを まもる かみさまの おてら だよ' }),
    YAMA ? { id: 'yamashita', name: 'やました こうえん', x: YAMA.x, z: YAMA.z, r: 18, say: 'うみの かぜが きもちいいね 🌊' } : null,
    HIKAWA ? { id: 'hikawa', name: 'ひかわまる', x: HIKAWA.x, z: HIKAWA.z, r: HIKAWA.len / 2 + 4, say: 'おおきな くろい ふね！ むかしは アメリカまで いったんだって' } : null,
    zp('marine', 'マリンタワー', '横浜マリンタワー', { r: 9, say: 'あかと しろの とう だね 🗼' }),
    zp('hara', 'てつどう もけい はくぶつかん', '横浜三井ビルディング', { r: 14, say: 'でんしゃの もけいが いっぱい あるんだって 🚂' }),
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
  const mHalo = mk((g) => { for (let i = 0; i < 20; i++) { const a0 = i / 20 * Math.PI * 2, a1 = (i + 1) / 20 * Math.PI * 2; g.beam([Math.cos(a0) * 0.3, 0, Math.sin(a0) * 0.3], [Math.cos(a1) * 0.3, 0, Math.sin(a1) * 0.3], 0.035, W); } });
  const mCone = mk((g) => g.cone(0, 0, 0, 1, 1, 10, W));
  const mArrow = mk((g) => { // いきさき の やじるし（+z を むく）
    const up = [0, 1, 0], dn = [0, -1, 0], t = 0.12;
    const P2 = [[-0.28, -0.9], [0.28, -0.9], [0.28, 0.05], [0.7, 0.05], [0, 1.0], [-0.7, 0.05], [-0.28, 0.05]];
    [[0, 1, 2], [0, 2, 6], [3, 4, 5]].forEach(([a, b, c]) => { g.tri([P2[a][0], t, P2[a][1]], [P2[b][0], t, P2[b][1]], [P2[c][0], t, P2[c][1]], up, W, 0); g.tri([P2[a][0], -t, P2[a][1]], [P2[b][0], -t, P2[b][1]], [P2[c][0], -t, P2[c][1]], dn, W, 0); });
    for (let i = 0; i < P2.length; i++) { const [ax, az] = P2[i], [bx, bz] = P2[(i + 1) % P2.length], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); g.quad([ax, -t, az], [bx, -t, bz], [bx, t, bz], [ax, t, az], [dz / L, 0, -dx / L], W, 0); }
  });
  const mImo = mk((g) => { g.sphere(0, 0, 0, 0.5, 6, hex('#a64ca6')); g.cyl(0.42, -0.08, 0, 0.12, 0.16, 5, hex('#f5d76e')); });
  const mWheel = mk((g) => {
    const R2 = FW.R, n = 48;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      g.beam([Math.cos(a0) * R2, Math.sin(a0) * R2, 0], [Math.cos(a1) * R2, Math.sin(a1) * R2, 0], 0.25, C.white);
      g.beam([Math.cos(a0) * (R2 - 1.4), Math.sin(a0) * (R2 - 1.4), 0], [Math.cos(a1) * (R2 - 1.4), Math.sin(a1) * (R2 - 1.4), 0], 0.15, hex('#a5d8ff'));
    }
    for (let i = 0; i < FW.N; i++) { const a = i / FW.N * Math.PI * 2; g.beam([0, 0, 0], [Math.cos(a) * R2, Math.sin(a) * R2, 0], 0.08, C.white); g.beam([Math.cos(a) * R2, Math.sin(a) * R2, 0.3], [Math.cos(a) * R2, Math.sin(a) * R2, 1.4], 0.06, C.gray); }
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
  const inp = { mx: 0, my: 0, jump: false, let: false, fart: false, up: false, down: false };
  const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
  const cam = { yaw: START.yaw, pitch: 0.32, dist: 9, id: null, lx: 0, ly: 0 };
  if (save.pos) cam.yaw = save.pos.yaw || 0;
  let paused = true;
  addEventListener('keydown', (e) => {
    if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); return; }
    keys[e.code] = true;
    if (paused) return;
    if (e.code === 'Space') { inp.jump = true; inp.up = true; e.preventDefault(); }
    if (e.code === 'KeyX' || e.code === 'ShiftLeft') inp.down = true;
    if (e.code === 'KeyX') inp.let = true;
    if (e.code === 'KeyE') useOni();
    if (e.code === 'KeyC' && !e.repeat) toggleProp();
    if (e.code === 'KeyF' || e.code === 'KeyQ') inp.fart = true;
    if (e.code === 'KeyM') openMap();
    if (e.code === 'Enter' && curDoor) curDoor.run();
    if (e.code === 'Escape') { show('ovMenu', true); setPaused(); }
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'KeyF' || e.code === 'KeyQ') inp.fart = false; if (e.code === 'Space') inp.up = false; if (e.code === 'KeyX' || e.code === 'ShiftLeft') inp.down = false; });
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
      if (FP[P.state]) { look.yaw -= (e.clientX - cam.lx) * 0.006 * save.settings.cam; look.pitch = clamp(look.pitch - (e.clientY - cam.ly) * 0.005, -1.2, 1.1); }
      else { cam.yaw -= (e.clientX - cam.lx) * 0.008 * save.settings.cam; cam.pitch = clamp(cam.pitch + (e.clientY - cam.ly) * 0.006 * save.settings.cam, -0.25, 1.25); }
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
  holdBtn($('bJump'), () => { inp.jump = true; inp.up = true; }, () => { inp.up = false; });
  holdBtn($('bLet'), () => { inp.let = true; inp.down = true; }, () => { inp.down = false; });
  holdBtn($('bOni'), useOni);
  holdBtn($('bFart'), () => { inp.fart = true; }, () => { inp.fart = false; });
  $('bProp').addEventListener('click', (e) => { e.preventDefault(); ac(); toggleProp(); });
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
    o.connect(g); g.connect(OUT(a)); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq, type) {
    const a = ac(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = type || 'bandpass'; f.frequency.value = freq || 800; g.gain.value = vol || 0.2;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(OUT(a)); s.start();
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
    o.connect(f); f.connect(g); g.connect(OUT(a)); o.start(); lfo.start();
    fartNode = { o, lfo, g }; noise(0.15, 0.25, 300, 'lowpass');
  }
  function fartStop() {
    if (!fartNode || !AC) { fartNode = null; return; }
    const { o, lfo, g } = fartNode, t = AC.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.frequency.setValueAtTime(o.frequency.value, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.12);
    o.stop(t + 0.15); lfo.stop(t + 0.15); fartNode = null;
  }
  const FP = { coaster: 1, wheel: 1, ghost: 1 }; // じぶんの め で みる とき
  const SFX = {
    drink: () => { [0, 0.18, 0.36].forEach((d) => tone(180, 0.12, 'sine', 0.12, 120, d)); tone(880, 0.2, 'triangle', 0.08, 1320, 0.6); },
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
    piggy: () => Object.assign({}, save.piggy || {}), setPiggy: (w) => { save.piggy = {}; DENOM.forEach((d) => { if (w[d]) save.piggy[d] = w[d]; }); store(); },
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
    $('money').textContent = walletTotal().toLocaleString(); errandHud();
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

  // ================= じかん と ようび（1びょう で 2ふん すすむ。1にち は やく 12ふん）=================
  const WEEK = ['げつ', 'か', 'すい', 'もく', 'きん', 'ど', 'にち'];
  if (!save.clock) save.clock = { day: 0, min: 7 * 60 + 30 };
  const CLK = { get h() { return save.clock.min / 60; }, get wd() { return save.clock.day % 7; } };
  function clockStr() { const m = Math.floor(save.clock.min), h = Math.floor(m / 60), mm = m % 60; return `${WEEK[CLK.wd]}ようび ${h}:${String(mm).padStart(2, '0')}`; }
  function partOfDay() { const h = CLK.h; return h < 5 ? 'よる' : h < 10 ? 'あさ' : h < 16 ? 'ひる' : h < 18.5 ? 'ゆうがた' : 'よる'; }
  function isNight() { const h = CLK.h; return h >= 19 || h < 5.5; }
  function zooOpen() { const h = CLK.h; return CLK.wd !== 0 && h >= 9.5 && h < 16.5; }
  let lastPart = '';
  function clockTick(dt) {
    save.clock.min += dt * 2 * save.settings.speed;
    if (save.clock.min >= 24 * 60) { save.clock.min -= 24 * 60; save.clock.day++; }
    const p = partOfDay();
    if (p !== lastPart) {
      if (lastPart) {
        if (p === 'あさ') momSay('おはよう、あおちゃん！ きょうは ' + WEEK[CLK.wd] + 'ようび だよ ☀️', 3.5);
        else if (p === 'ゆうがた') momSay('ゆうやけ きれいだね 🌇 そろそろ くもんの じかんかな？', 3.5);
        else if (p === 'よる') momSay('よるに なったね 🌙 ランドマークタワーが キラキラ。おうちに かえろうか', 4);
      }
      lastPart = p;
    }
    const wn = weatherNow(), ct = (wn !== 'sun' ? WICON[wn] + ' ' : isNight() ? '🌙 ' : CLK.h < 10 ? '🌅 ' : CLK.h < 16 ? '☀️ ' : '🌇 ') + clockStr();
    if (ct !== CLK.last) { CLK.last = ct; $('clock').textContent = ct; todayHud(); }
  }
  function sleepUntilMorning() { save.clock.day++; save.clock.min = 7 * 60; store(); }
  // そらの いろ・ひかり
  const SKY_DAY = hex('#bfe3ff'), SKY_SET = hex('#ffb48a'), SKY_NIGHT = hex('#0d1a38');
  function skyNow() {
    const h = CLK.h, s = Math.sin((h - 6) / 12 * Math.PI);
    const light = clamp(s * 1.6 + 0.25, 0.1, 1);
    const tw = Math.exp(-((h - 18) ** 2) / 0.9) + Math.exp(-((h - 6) ** 2) / 0.9);
    const base = SKY_NIGHT.map((v, i) => v + (SKY_DAY[i] - v) * light);
    const col = base.map((v, i) => v + (SKY_SET[i] - v) * Math.min(0.75, tw * 0.8));
    const wn = weatherNow(), dim = wn === 'rain' ? 0.62 : wn === 'snow' || wn === 'cloud' ? 0.8 : 1, gray = [0.62, 0.66, 0.72];
    const col2 = dim < 1 ? col.map((v, i) => v * dim + gray[i] * (1 - dim) * light) : col;
    return { col: col2, light: light * (0.55 + 0.45 * dim), night: clamp(1 - light * 1.4, 0, 1) };
  }

  // ================= おつかい =================
  const ERR_ITEMS = { milk: 'ぎゅうにゅう', egg: 'たまご', bread: 'しょくパン', banana: 'バナナ', carrot: 'にんじん', apple: 'りんご' };
  function startErrand() {
    const ks = Object.keys(ERR_ITEMS).sort(() => Math.random() - 0.5).slice(0, 2 + (Math.random() < 0.4 ? 1 : 0));
    save.errand = { list: ks, got: [] }; save.wallet[1000] = (save.wallet[1000] || 0) + 1; store(); refreshHud();
    banner('📝 ママから おつかい！<small>' + ks.map((k) => ERR_ITEMS[k]).join('・') + ' を オーケーで かってきてね（1000えん あずかった）</small>', 4.5);
    momSay('オーケーは マークイズの むこう、みなとみらい 6ちょうめ だよ 🛒 ママも いっしょに いくね', 4.5);
  }
  function errandHud() {
    const e = save.errand, el = $('memo');
    if (!e) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = '📝 ' + e.list.map((k) => (e.got.includes(k) ? '✅' : '⬜') + ERR_ITEMS[k]).join(' ') + (e.list.every((k) => e.got.includes(k)) ? ' → 🏠 おうちへ' : '');
  }
  function errandBought(id) {
    const e = save.errand; if (!e || !e.list.includes(id) || e.got.includes(id)) return;
    e.got.push(id); store(); errandHud();
    if (e.list.every((k) => e.got.includes(k))) momSay('ぜんぶ かえたね！ おうちに かえって ママに わたそう 🏠', 4);
  }
  function errandDoneAtHome() {
    const e = save.errand; if (!e || !e.list.every((k) => e.got.includes(k))) return false;
    save.errand = null; save.errandDone = (save.errandDone || 0) + 1; store(); errandHud(); SFX.big(); confetti();
    banner('🎉 おつかい できたね！<small>ママ「ありがとう！ おつりは おだちん に して いいよ」</small>', 4.5);
    return true;
  }

  // ================= ゲームの すすみ =================
  let photoOn = false, shootReq = false; let time = 0, saveT = 0, climbSnd = 0, lastTalk = null, lastLab = '', curDoor = null, lastDoorId = '';
  const puffs = [];
  function update(dt) {
    time += dt;
    updatePlats(time);
    if (P.state === 'ride') { rideUpdate(dt); inp.jump = false; inp.let = false; afterUpdate(dt); return; }
    const SP = { akai: akaiUpdate, boat: boatUpdate, slide: slideUpdate, bus: busUpdate, coaster: coasterUpdate, ghost: ghostUpdate, wheel: wheelUpdate, heli: heliUpdate, hurt: hurtUpdate, train: trainUpdate }[P.state];
    if (SP) { SP(dt); inp.jump = false; inp.let = false; afterUpdate(dt); return; }
    if (P.plat) { P.x += P.plat.dx; P.y += P.plat.dy; P.z += P.plat.dz; }
    readMove();
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    const dx = rx * inp.mx + fx * inp.my, dz = rz * inp.mx + fz * inp.my;
    const mag = Math.hypot(dx, dz);
    P.cool = Math.max(0, P.cool - dt);

    // スーパーおなら
    const wantFart = inp.fart && P.gas > 0.02 && P.state !== 'prop';
    if (inp.fart && P.gas <= 0.02 && !P.noGasMsg) { P.noGasMsg = true; banner('💨 おならが でない…<small>じめんに おりると すぐ たまるよ（🍠 おいも でも まんたん）</small>', 1.8); }
    if (!inp.fart) P.noGasMsg = false;
    if (wantFart) {
      if (P.state === 'climb') { release(); }
      if (!P.farting) { P.farting = true; fartStart(); }
      P.gas = Math.max(0, P.gas - 0.32 * dt);
      P.vy = Math.min(11, Math.max(P.vy, 0) + 40 * dt); P.glide = false; P.ground = false; P.plat = null;
      if (Math.random() < dt * 30) puffs.push({ x: P.x - Math.sin(P.face) * 0.3 + (Math.random() - 0.5) * 0.4, y: P.y + 0.5, z: P.z - Math.cos(P.face) * 0.3 + (Math.random() - 0.5) * 0.4, t: 0, vy: -2 - Math.random() * 2 });
    } else if (P.farting) { P.farting = false; fartStop(); }

    if (P.state === 'prop') propUpdate(dt, dx, dz);
    else if (P.state === 'climb') climbUpdate(dt, rx, rz);
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
      // たかい ところから おちても けが しない（ふわっと ちゃくち）
      if (P.ground && !wasGround && (P.fallTop || 0) - P.y > 14 && !P.glide) {
        P.fallTop = P.y;
        for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; puffs.push({ x: P.x + Math.cos(a) * 0.6, y: P.y + 0.1, z: P.z + Math.sin(a) * 0.6, t: 0, vy: 0.6, w: 1 }); }
        tone(220, 0.25, 'sine', 0.12, 660); tone(520, 0.2, 'triangle', 0.06, 900, 0.15);
        if (time - (P.softT || -1e9) > 20) { P.softT = time; banner('🌟 ふわっと ちゃくち！<small>たかい ところから おりても だいじょうぶ</small>', 2.2); momSay('ふわっと おりられたね！ さすが あおちゃん 👏', 3); }
      }
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
    if (P.ground || P.state === 'swim' || P.state === 'climb' || P.glide || P.farting) P.fallTop = P.y; else P.fallTop = Math.max(P.fallTop || P.y, P.y);
    inp.jump = false; inp.let = false;
    afterUpdate(dt);
  }

  // ================= ママ（いつも いっしょ。そらでは てんし 👼）=================
  const MOM = { x: P.x - 1.6, y: P.y, z: P.z + 1.2, face: P.face, fly: 0, phase: 0, speed: 0, airT: 0, sit: false, cup: 0,
    talkT: 10, waterT: 45, sayT: 0, prev: P.state, stars: save.stars.length, stamps: save.stamps.length, money: 0, wasFart: false, wasGlide: false };
  const MOMCOL = hex('#f783ac');
  function momSay(t, sec) { MOM.sayT = sec || 3.8; const b = $('momTalk'); b.textContent = t; b.style.display = 'block'; }
  const pickL = (a) => a[Math.floor(Math.random() * a.length)];
  const MOM_LINES = {
    ground: ['あおちゃん、てを つないで いこうね 🤝', 'おなか すいてない？ 🍙', 'くるまに きを つけてね 🚗', 'ランドマークタワー、おおきいね〜', 'くもんの プリント、1まい やると 1000えん だよ ✏️',
      'つぎは どこへ いく？', 'ママ、あおちゃんと おさんぽ たのしい！', 'ほしは あと いくつ かな？ ⭐', 'ちずを みてみよう 🗺️', 'かんらんしゃ のってみたいね 🎡', 'うみの かぜが きもちいいね 🌊', 'おばけやしき、こわくないかな？ 👻'],
    climb: ['がんばれ〜！ あおちゃん！ 💪', 'しっかり つかまってね', 'みどりの わが へったら バルコニーで ひとやすみ してね'],
    fly: ['ママも とぶよ〜 👼', 'たかいね〜！ ふわふわ', 'おりる まえに パラシュート ひらこうね 🪂', 'とおくまで みえるね！'],
    swim: ['じょうずに およげてる！ 🏊', 'かべに むかって およぐと あがれるよ'],
  };
  const MOM_STATE = {
    coaster: 'ママも うしろの せきに のるよ！ キャー！ 🎢', ghost: 'ママの てを はなさないでね… 👻', wheel: 'ママと いっしょに かんらんしゃ 🎡',
    prop: 'ふわ〜っ！ たかい たかい 🧢', train: 'でんしゃ！ まどの そと みてごらん 🚃', akai: 'あかいくつ、まっかで かわいいね 👠', boat: 'シーバスで うみの うえ〜 ⛴️ かぜが きもちいいね', bus: 'ピンクの さくらごう！ せんせいも のってるね 🌸', slide: 'すべりだい、いってらっしゃい！ 🛝', ride: 'エアキャビン、うみの うえだよ〜 🚡', heli: 'ママは てんしに なって ついていくね 👼', hurt: 'あおちゃん！ だいじょうぶ！？ ママが ついてるよ 🚑', climb: 'がんばれ〜！ 🧗',
  };
  function momUpdate(dt) {
    const m = MOM; m.phase += dt * 6;
    if (m.sayT > 0) { m.sayT -= dt; if (m.sayT <= 0) $('momTalk').style.display = 'none'; }
    if (m.cup > 0) m.cup -= dt;
    // できごと に あわせて はなす
    if (P.state !== m.prev) { const L = MOM_STATE[P.state]; if (L) momSay(L, 3.5); if (m.prev === 'ghost') momSay('こわかったね〜！ よく がんばった 👏', 3.5); m.prev = P.state; }
    if (P.farting && !m.wasFart) momSay('あおちゃんの おなら パワー！ ママも とぶよ 👼', 3); m.wasFart = P.farting;
    if (P.glide && !m.wasGlide) momSay('パラシュート じょうず！ 🪂', 2.5); m.wasGlide = P.glide;
    if (save.stars.length > m.stars) momSay('すごーい！ ほしを みつけたね ⭐', 3); m.stars = save.stars.length;
    if (save.stamps.length > m.stamps) { const z = ZONES.find((q) => q.id === save.stamps[save.stamps.length - 1]); if (z) momSay(z.say || `${z.name} に ついたね！`, 3); } m.stamps = save.stamps.length;
    const mon = walletTotal(); if (m.money && mon > m.money) momSay('おこづかい ふえたね！ だいじに つかおうね 💴', 3); m.money = mon;
    // ときどき はなしかける
    m.talkT -= dt;
    if (m.talkT < 0 && m.sayT <= 0 && save.settings.talk > 0) {
      m.talkT = (22 + Math.random() * 25) / save.settings.talk;
      const pool = P.state === 'climb' ? MOM_LINES.climb : P.state === 'swim' ? MOM_LINES.swim : (m.fly > 0.5 || P.state === 'heli') ? MOM_LINES.fly : MOM_LINES.ground;
      if (P.st < maxSt() * 0.35 && P.state === 'climb') momSay('つかれたら ひとやすみ しようね', 3); else momSay(pickL(pool), 3.8);
    }
    // ときどき おみず
    m.waterT -= dt;
    if (m.waterT < 0 && P.state === 'ground' && m.fly < 0.3 && Math.hypot(m.x - P.x, m.z - P.z) < 5) {
      m.waterT = 80; m.cup = 2.5; P.st = maxSt(); P.tired = false; SFX.drink(); momSay('のど かわいてない？ おみず どうぞ 🥤 ごくごく… ぷはー！', 3.5);
    }
    // どこへ いくか
    const st = P.state; let tx, ty, tz, wantFly = false, sit = false;
    if (st === 'slide' && SLIDE) { tx = SLIDE.mom.x; tz = SLIDE.mom.z; ty = 0; m.airT = 0; }
    else if (st === 'bus' || st === 'akai' || st === 'boat' || st === 'train') { tx = P.x + Math.cos(P.face) * 0.9; tz = P.z - Math.sin(P.face) * 0.9; ty = P.y; sit = true; }
    else if (st === 'ride' || st === 'wheel') { tx = P.x + Math.cos(P.face) * 0.75; tz = P.z - Math.sin(P.face) * 0.75; ty = P.y; sit = true; }
    else if (st === 'coaster') { const q = CO.at(P.co.s - 2.6); tx = q.x; ty = q.y + 0.2; tz = q.z; sit = true; m.face = Math.atan2(q.tx, q.tz); }
    else if (st === 'heli') { tx = HELI.x + Math.cos(HELI.yaw) * 3.4; tz = HELI.z - Math.sin(HELI.yaw) * 3.4; ty = HELI.y + 0.6; wantFly = true; }
    else if (st === 'ghost') { tx = GH.door.x + 1.2; tz = GH.door.z; ty = 0; }
    else if (st !== 'slide') {
      tx = P.x - Math.sin(P.face) * 0.5 + Math.cos(P.face) * 1.3; tz = P.z - Math.cos(P.face) * 0.5 - Math.sin(P.face) * 1.3; ty = P.y; // みぎどなり
      m.airT = (st === 'ground' || st === 'hurt') ? 0 : m.airT + dt;
      if (m.airT > 0.6) wantFly = true;
      else if (st !== 'ground' && st !== 'hurt') ty = groundBelow(P.x, P.y + 0.3, P.z); // ちょっと ジャンプ では とばない
    }
    const d = Math.hypot(tx - m.x, tz - m.z);
    if (d > 70 || Math.abs(ty - m.y) > 60) { m.x = tx; m.y = ty; m.z = tz; }  // とおすぎたら すぐ そばへ
    if (sit) { m.x = tx; m.y = ty; m.z = tz; m.sit = true; m.fly = 0; m.flying = false; m.speed = 0; if (st !== 'coaster') m.face = P.face; return; }
    m.sit = false;
    if (!wantFly) {
      const sp = d > 1.6 ? Math.min(13, 2.5 + d * 1.6) : 0;
      if (sp > 0) {
        const nx = m.x + (tx - m.x) / d * Math.min(d, sp * dt), nz = m.z + (tz - m.z) / d * Math.min(d, sp * dt);
        if (m.fly < 0.5 && blockedAt(nx, m.y + 0.05, nz)) wantFly = true; else { m.x = nx; m.z = nz; }
      }
      m.speed = sp;
      if (!wantFly) {
        const gy = groundBelow(m.x, Math.max(m.y, ty) + 0.6, m.z);
        if (Math.abs(gy - ty) > 0.8) wantFly = true;          // ちがう たかさ → とんで いく
        else { m.y += (gy - m.y) * Math.min(1, dt * 6); if (Math.abs(m.y - gy) < 0.2) m.fly = Math.max(0, m.fly - dt * 2.5); }
      }
    }
    if (wantFly) {
      m.fly = Math.min(1, m.fly + dt * 2.5);
      const k = Math.min(1, dt * 2.6), fy = ty + 1.1 + Math.sin(time * 2) * 0.25;
      m.x += (tx - m.x) * k; m.y += (fy - m.y) * k; m.z += (tz - m.z) * k; m.speed = 0;
    }
    // ほんとうに そらに いる ときだけ「とんでいる」（はね と わっか は この とき だけ）
    m.flying = wantFly || m.y - groundBelow(m.x, m.y + 0.3, m.z) > 0.4;
    if (!m.flying) m.fly = 0;
    const fd = Math.hypot(P.x - m.x, P.z - m.z);
    if (d > 0.4 && m.speed > 0) m.face = Math.atan2(tx - m.x, tz - m.z); else if (fd > 0.3) m.face = Math.atan2(P.x - m.x, P.z - m.z);
  }
  function drawMomAt(x, y, z, face, fly, sit, speed) {
    const pose = sit ? 'sit' : fly > 0.5 ? 'air' : speed > 0.5 ? 'walk' : 'stand';
    const b = person(x, y - (sit ? 0.17 : 0), z, face, MOMCOL, pose, MOM.phase);
    part(b, 0, 1.45, -0.18, 0.56, 0.75, 0.2, C.hair);                       // ながい かみ
    part(b, 0, 1.78, -0.05, 0.56, 0.14, 0.5, C.hair);
    if (!sit) part(b, 0, 0.62, 0, 0.66, 0.36, 0.44, hex('#ffd8e4'));       // スカート
    part(b, -0.18, 1.41, 0.245, 0.08, 0.05, 0.02, C.pink); part(b, 0.18, 1.41, 0.245, 0.08, 0.05, 0.02, C.pink);
    if (weatherNow() === 'rain' && fly < 0.03 && !sit) { draw(mCone, M(b, T(0, 2.35, 0), S(1.1, 0.45, 1.1)), hex('#f783ac')); part(b, 0, 2.35, 0, 0.04, 1.0, 0.04, C.navy); }
    if (MOM.cup > 0) draw(mCube, M(b, T(0.36, 1.1, 0.3), S(0.14, 0.3, 0.14)), hex('#74c0fc'));
    if (fly > 0.03) { // てんしの はね と わっか
      const fl = Math.sin(time * 7) * 0.45;
      [-1, 1].forEach((sd) => {
        const w0 = M(b, T(sd * 0.16, 1.22, -0.24), RY(-sd * 0.25), RZ(sd * (0.45 + fl)));
        draw(mCube, M(w0, T(sd * 0.85 * fly, 0.2, 0), S(1.7 * fly, 0.62 * fly, 0.08)), C.white, 0.8);
        draw(mCube, M(w0, T(sd * 0.7 * fly, -0.18, 0.02), S(1.35 * fly, 0.42 * fly, 0.07)), hex('#e7f5ff'), 0.8);
        draw(mCube, M(w0, T(sd * 0.55 * fly, -0.48, 0.04), S(0.95 * fly, 0.3 * fly, 0.06)), hex('#d0ebff'), 0.8);
        draw(mCube, M(w0, T(sd * 1.62 * fly, 0.36, 0), RZ(sd * 0.5), S(0.45 * fly, 0.32 * fly, 0.08)), C.white, 0.8);
      });
      draw(mHalo, M(b, T(0, 2.05, -0.02), RX(0.15), S(fly * 1.15)), C.yellow, 1);
    }
    return b;
  }
  function drawMom() {
    if (P.state === 'ghost') return;
    drawMomAt(MOM.x, MOM.y, MOM.z, MOM.face, MOM.flying ? MOM.fly : 0, MOM.sit, MOM.speed);
  }
  function placeMomTalk() {
    const b = $('momTalk'); if (MOM.sayT <= 0) return;
    let sp = null;
    if (P.state === 'ghost') { const q = GHM.at(Math.max(0, P.gh.s - 1.6)); sp = project(q.x, GHM.Y + 2.4, q.z); }
    else sp = project(MOM.x, MOM.y + 2.5, MOM.z);
    const ok = sp && sp[0] > 90 && sp[0] < innerWidth - 90 && sp[1] > 120 && sp[1] < innerHeight - 40;
    b.classList.toggle('fixed', !ok);
    if (ok) { b.style.left = sp[0] + 'px'; b.style.top = sp[1] + 'px'; } else { b.style.left = ''; b.style.top = ''; }
  }
  function afterUpdate(dt) {
    momUpdate(dt); papaUpdate(dt); hsTick(dt); clockTick(dt); scheduleTick(); weatherTick(); trafficTick(); if (P.state !== 'ghost') carsTick(dt);
    // どうぶつ ずかん
    if (ZOO && P.state === 'ground') {
      const open = zooOpen();
      for (const pn of ZOO.pens) {
        if (Math.hypot(pn.x - P.x, pn.z - P.z) > 5.5) continue;
        if (!open) { if (!P.zooMsg || time - P.zooMsg > 20) { P.zooMsg = time; banner('🦒 どうぶつたちは いま おやすみ<small>のげやま どうぶつえん は 9:30〜16:30、げつようび は おやすみ</small>', 3); } break; }
        if (!(save.zoo || {})[pn.id]) { save.zoo = save.zoo || {}; save.zoo[pn.id] = 1; store(); SFX.star(); banner(`${pn.e} ${pn.name} を みつけた！<small>${pn.info}（ずかん ${Object.keys(save.zoo).length}/${ZOO.pens.length}）</small>`, 3.5); momSay(pickL(['かわいいね〜！', 'おおきいね！', 'みて みて、うごいてる！']) + ' ' + pn.e, 3); }
      }
    }
    const MS = maxSt();
    if (P.state === 'ground') {
      P.st = Math.min(MS, P.st + MS * 0.45 * dt); if (P.tired && P.st >= MS * 0.5) P.tired = false;
    }
    // おならは すぐ たまる（じめん なら 1びょう ちょっとで まんたん、そらでも すこしずつ）
    if (!P.farting) P.gas = Math.min(1, P.gas + (P.state === 'ground' ? 1.1 : P.state === 'climb' || P.state === 'swim' ? 0.5 : 0.3) * dt);
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
    if (!{ ground: 1, air: 1, swim: 1, climb: 1 }[P.state]) nearN = null;
    if (nearN && nearN.mama && time - (P.waterT || -1e9) > 50) { P.waterT = time; P.st = maxSt(); P.tired = false; SFX.drink(); banner('🥤 ママ「おみず どうぞ」<small>ごくごく… ぷはー！ げんき まんたん</small>', 2.6); }
    if (nearN !== lastTalk) {
      lastTalk = nearN; const t = $('talk');
      if (nearN) { t.dataset.who = nearN.who; t.textContent = nearN.say; t.style.display = 'block'; } else t.style.display = 'none';
    }
    if (P.y < -40) respawn();
    curDoor = null;
    if (P.state === 'ground') for (const d of DOORS) if (Math.abs((d.y || 0) - P.y) < 0.8 && Math.hypot(d.x - P.x, d.z - P.z) < (d.r || 2.4)) { curDoor = d; break; }
    if (P.state === 'heli' && HELI.landed) curDoor = HELI_EXIT;
    if (P.state === 'akai' && P.ak && P.ak.pause > 0 && P.ak.next > 0) curDoor = AKAI_OFF;
    const did = curDoor ? curDoor.id : '';
    if (did !== lastDoorId) { lastDoorId = did; const b = $('bEnter'); b.hidden = !curDoor; if (curDoor) { b.innerHTML = curDoor.label; b.style.background = `rgb(${curDoor.color.map((v) => v * 255 | 0).join(',')})`; } }
    saveT += dt; if (saveT > 4) { saveT = 0; if (P.state === 'ground' && !P.plat) { save.pos = { x: P.x, y: P.y, z: P.z, yaw: cam.yaw }; store(); } }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
    const lab = { train: 'のって<br>いるよ', akai: 'のって<br>いるよ', boat: 'のって<br>いるよ', slide: 'わーい！', bus: 'のって<br>いるよ', ride: 'のって<br>いるよ', coaster: 'のって<br>いるよ', wheel: 'のって<br>いるよ', ghost: 'ドキ<br>ドキ…', heli: '⬆️<br>のぼる', prop: '⬆️<br>のぼる', hurt: 'いたた…', climb: 'うえへ<br>ジャンプ' }[P.state] ||
      ((P.state === 'air' && !P.farting) ? (P.glide ? 'とじる' : '🪂<br>ひらく') : 'ジャンプ');
    const letLab = { climb: 'はなす', heli: '⬇️<br>さがる', prop: '⬇️<br>さがる', ghost: '🚪<br>でる' }[P.state] || '';
    if (lab + letLab !== lastLab) { document.body.classList.toggle('propon', P.state === 'prop'); lastLab = lab + letLab; $('bJump').innerHTML = lab; $('bLet').hidden = !letLab; $('bLet').innerHTML = letLab; }
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

  // ================= のりもの・アトラクション =================
  const look = { yaw: 0, pitch: 0 };   // のって いる ときの みまわし
  let windNode = null, droneNode = null;
  function loopNoise(vol, freq, type) {
    const a = ac(); if (!a) return null;
    const n = a.sampleRate * 2, buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; s.loop = true; f.type = type || 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(OUT(a)); s.start();
    return { s, g, f, stop() { try { s.stop(); } catch (e) { /* むし */ } } };
  }
  function startDrone() {
    const a = ac(); if (!a) return null;
    const g = a.createGain(); g.gain.value = 0.05; g.connect(OUT(a));
    const os = [55, 58.3, 110.5].map((f) => { const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(); return o; });
    return { stop() { os.forEach((o) => { try { o.stop(); } catch (e) { /* むし */ } }); } };
  }
  function stopLoops() { if (windNode) { windNode.stop(); windNode = null; } if (droneNode) { droneNode.stop(); droneNode = null; } }
  function startAttraction(kind) {
    if (/^akai:/.test(kind)) { const [, a, b] = kind.split(':'); rideAkai(+a, +b); return; }
    if (/^sea:/.test(kind)) { const [, a, b] = kind.split(':'); rideSea(+a, +b); return; }
    look.yaw = 0; look.pitch = 0; P.vx = P.vy = P.vz = 0; P.glide = false; P.wall = null; P.plat = null;
    $('talk').style.display = 'none'; lastTalk = null;
    if (kind === 'coaster') {
      P.state = 'coaster'; P.co = { s: CO.total * 0.035, v: 2.2, lap: 0, scream: false, splash: false, chain: 0 };
      windNode = loopNoise(0.0001, 900, 'bandpass');
      banner('🎢 シートベルト よし！ しゅっぱつ！<small>みぎがわを なぞると まわりを みられるよ</small>', 2.5);
    } else if (kind === 'ghost') {
      P.state = 'ghost'; P.gh = { s: 0.5, pause: 0, ev: 0, et: 0, cur: null, beat: 0, flick: 0 };
      droneNode = startDrone();
      banner('👻 おばけやしき…<small>くらいよ。こわくなったら「でる」</small>', 2.5);
    } else if (kind === 'wheel') {
      let best = 0, bd = 1e9;
      cabins.forEach((p, i) => { const a = ((time * Math.PI * 2 / FW.period + i * Math.PI * 2 / FW.N) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); const d = Math.abs(a - Math.PI * 1.5); if (d < bd) { bd = d; best = i; } });
      P.state = 'wheel'; P.wh = { i: best, t0: time, top: false };
      banner('🎡 コスモクロック21 に のったよ<small>ぐるっと 1しゅう。みぎがわを なぞって とおくを みよう</small>', 3);
    }
  }
  function endAttraction(msg) {
    stopLoops(); const d = P.state === 'ghost' ? GH.door : P.state === 'coaster' ? DOORS.find((x) => x.id === 'coaster') : DOORS.find((x) => x.id === 'wheel');
    P.state = 'ground'; P.ground = true; P.y = 0; if (d) { P.x = d.x; P.z = d.z; }
    P.co = P.gh = P.wh = null; lastDoorId = '-'; if (msg) banner(msg, 3);
  }
  function coasterUpdate(dt) {
    const c = P.co, q0 = CO.at(c.s), u = q0.u;
    const g = 15;
    if (u > 0.07 && u < 0.27) { c.v = 3.6; if ((c.chain -= dt) < 0) { c.chain = 0.16; tone(1400, 0.03, 'square', 0.03); } }
    else if (u > 0.93 || (c.lap && u < 0.035)) { c.v = Math.max(1.8, c.v - 9 * dt); }
    else { const ahead = CO.at(c.s + c.v * dt); c.v = Math.sqrt(Math.max(2.5, c.v * c.v + 2 * g * (q0.y - ahead.y) - 0.006 * c.v * c.v * c.v * dt)); }
    const prevU = u; c.s += c.v * dt;
    const q = CO.at(c.s);
    if (q.u < prevU - 0.5) c.lap = 1;
    if (!c.scream && q.u > 0.31) { c.scream = true; banner('🎢 キャーーーーッ！！', 2); tone(900, 1.4, 'sawtooth', 0.04, 300); }
    if (!c.splash && q.u > 0.43) { c.splash = true; noise(0.9, 0.5, 700); splashFx(); banner('💦 ザッパーン！', 1.5); }
    P.x = q.x; P.y = q.y + 0.2; P.z = q.z; P.face = Math.atan2(q.tx, q.tz);
    if (windNode) { windNode.g.gain.value = Math.min(0.32, c.v * c.v * 0.0012); windNode.f.frequency.value = 400 + c.v * 60; }
    c.vis = q;
    if (c.lap && q.u >= 0.035 && q.u < 0.2) endAttraction('🎢 たのしかった！ もういっかい のる？');
  }
  function splashFx() {
    const d = document.createElement('div'); d.className = 'splash';
    for (let i = 0; i < 40; i++) { const s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 100 + '%'; s.style.animationDelay = Math.random() * 0.3 + 's'; d.appendChild(s); }
    document.body.appendChild(d); setTimeout(() => d.remove(), 2200);
  }
  const SCARE = {
    portrait: () => { tone(220, 1.2, 'triangle', 0.05, 110); noise(0.6, 0.08, 2500, 'highpass'); },
    ghost: () => { tone(500, 1.6, 'sine', 0.1, 900); tone(520, 1.6, 'sine', 0.06, 760, 0.2); },
    flicker: () => { noise(1.4, 0.45, 120, 'lowpass'); },
    skeleton: () => { for (let i = 0; i < 8; i++) tone(1200 + Math.random() * 800, 0.05, 'square', 0.04, null, i * 0.07); },
    coffin: () => { tone(90, 1.8, 'sawtooth', 0.09, 60); noise(0.5, 0.2, 300); },
    hands: () => { noise(2, 0.12, 3000, 'highpass'); },
    face: () => { tone(700, 0.9, 'sawtooth', 0.12, 1400); noise(0.5, 0.35, 1500); },
  };
  function ghostUpdate(dt) {
    const h = P.gh;
    if (inp.let) { endAttraction('🏃 でぐちから でたよ。こわかったね！'); return; }
    if ((h.beat -= dt) < 0) { h.beat = h.cur ? 0.45 : 0.9; tone(60, 0.12, 'sine', 0.18); tone(55, 0.12, 'sine', 0.14, null, 0.15); }
    if (h.cur) { h.et += dt; if (h.et > 2.2) h.cur = null; }
    else if (h.pause > 0) h.pause -= dt;
    else {
      h.s += 1.5 * dt;
      const ev = GHM.EV[h.ev];
      if (ev && h.s >= ev[0]) { h.cur = ev[1]; h.et = 0; h.ev++; h.pause = 0.4; SCARE[ev[1]](); if (ev[1] === 'face') banner('👻 ばあっ！！', 1.2); }
      if (h.s >= GHM.total - 0.8) { endAttraction('🎉 でられた！ おばけやしき クリア！ 👻'); return; }
    }
    h.flick = h.cur === 'flicker' ? (Math.random() < 0.5 ? 1 : 0) : 0;
  }
  function wheelUpdate(dt) {
    const w = P.wh, p = cabins[w.i];
    P.x = p.cx; P.y = p.cy - 1.5; P.z = p.cz; P.speed = 0;
    if (!w.top && time - w.t0 > FW.period / 2) { w.top = true; banner('🗻 てっぺん！ ふじさん・ベイブリッジ・マリンタワー が みえるかな？', 3.5); }
    if (time - w.t0 > FW.period) endAttraction('🎡 おかえりなさい！ たかかったね');
  }
  // --- ヘリコプター ---
  let rotorT = 0;
  function heliHits(x, y, z) {
    for (const b of near(x - 2, z - 2, x + 2, z + 2)) if (x + 1.6 > b.x0 && x - 1.6 < b.x1 && z + 1.6 > b.z0 && z - 1.6 < b.z1 && y + 2.2 > b.y0 && y < b.y1) return true;
    return false;
  }
  function heliFloor(x, y, z) { let f = WATER + 0.3; for (const b of near(x - 1.6, z - 1.6, x + 1.6, z + 1.6)) if (x + 1.4 > b.x0 && x - 1.4 < b.x1 && z + 1.4 > b.z0 && z - 1.4 < b.z1 && b.y1 <= y + 0.3 && b.y1 > f) f = b.y1; return f; }
  function heliUpdate(dt) {
    const Hh = HELI; readMove();
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    const dx = rx * inp.mx + fx * inp.my, dz = rz * inp.mx + fz * inp.my;
    const floor = heliFloor(Hh.x, Hh.y, Hh.z), landed = Hh.y - floor < 0.15;
    const up = inp.up ? 7 : 0, down = inp.down ? -6 : 0;
    Hh.vy += ((up + down) - Hh.vy) * Math.min(1, 3 * dt);
    const sp = landed && !inp.up ? 0 : 16;
    Hh.vx += (dx * sp - Hh.vx) * Math.min(1, 2.2 * dt); Hh.vz += (dz * sp - Hh.vz) * Math.min(1, 2.2 * dt);
    let nx = Hh.x + Hh.vx * dt; if (heliHits(nx, Hh.y + 0.05, Hh.z)) { nx = Hh.x; Hh.vx = 0; } Hh.x = nx;
    let nz = Hh.z + Hh.vz * dt; if (heliHits(Hh.x, Hh.y + 0.05, nz)) { nz = Hh.z; Hh.vz = 0; } Hh.z = nz;
    let ny = Math.min(220, Hh.y + Hh.vy * dt); if (Hh.vy > 0 && heliHits(Hh.x, ny, Hh.z)) { ny = Hh.y; Hh.vy = 0; }
    const f2 = heliFloor(Hh.x, Hh.y, Hh.z); if (ny < f2) { ny = f2; Hh.vy = Math.max(0, Hh.vy); } Hh.y = ny;
    if (Math.hypot(Hh.vx, Hh.vz) > 0.5) { const want = Math.atan2(Hh.vx, Hh.vz); let d = want - Hh.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; Hh.yaw += d * Math.min(1, 2.5 * dt); }
    Hh.rot += dt * 30;
    P.x = Hh.x; P.y = Hh.y + 0.45; P.z = Hh.z; P.face = Hh.yaw; P.speed = 0;
    if ((rotorT -= dt) < 0) { rotorT = 0.085; noise(0.06, 0.16, 110, 'lowpass'); }
    Hh.landed = Hh.y - heliFloor(Hh.x, Hh.y, Hh.z) < 0.2;
  }
  function heliExit() {
    const Hh = HELI; Hh.vx = Hh.vy = Hh.vz = 0;
    const s = [[2.6, 0], [-2.6, 0], [0, 2.8], [0, -2.8]].map(([a, b]) => ({ x: Hh.x + Math.cos(Hh.yaw) * a + Math.sin(Hh.yaw) * b, z: Hh.z - Math.sin(Hh.yaw) * a + Math.cos(Hh.yaw) * b }))
      .find((q) => !blockedAt(q.x, Hh.y + 0.02, q.z) && groundBelow(q.x, Hh.y + 0.1, q.z) > Hh.y - 0.5) || { x: Hh.x, z: Hh.z };
    P.x = s.x; P.z = s.z; P.y = Hh.y; P.state = 'ground'; P.ground = true; P.vx = P.vy = P.vz = 0; lastDoorId = '-';
    banner('🚁 ヘリから おりたよ', 1.6);
  }
  // --- けが → きゅうきゅうしゃ → けいゆう びょういん ---
  let sirenT = 0, sirenHi = false;
  function hurt(h) {
    P.state = 'hurt'; P.vx = P.vz = 0; P.glide = false; if (P.farting) { P.farting = false; fartStop(); }
    const dx = HOSP.x - P.x, dz = HOSP.z - P.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    const stop = { x: P.x + uz * 3.2, z: P.z - ux * 3.2 }, from = { x: stop.x + ux * Math.min(50, d), z: stop.z + uz * Math.min(50, d) };
    P.hurtS = { t: 0, from, stop, face: Math.atan2(-ux, -uz), y: P.y };
    tone(300, 0.5, 'sawtooth', 0.05, 120);
    banner('🤕 いたたた… たかい ところから おちちゃった！<small>だれか〜！ きゅうきゅうしゃ を よんで！</small>', 3.5);
    $('talk').style.display = 'none'; lastTalk = null;
  }
  function hurtUpdate(dt) {
    const s = P.hurtS; s.t += dt;
    if ((sirenT -= dt) < 0) { sirenT = 0.62; sirenHi = !sirenHi; const near2 = Math.min(1, 25 / Math.max(5, Math.hypot(ambPos().x - P.x, ambPos().z - P.z))); tone(sirenHi ? 960 : 770, 0.6, 'square', 0.035 * near2 + 0.01); }
    if (s.t > 7.3 && !s.done) { s.done = true; openHospital(); }
  }
  function ambPos() {
    const s = P.hurtS; if (!s) return { x: 0, z: 0, f: 0 };
    const k = clamp((s.t - 1.2) / 4, 0, 1), e = 1 - (1 - k) * (1 - k);
    return { x: s.from.x + (s.stop.x - s.from.x) * e, z: s.from.z + (s.stop.z - s.from.z) * e, f: s.face };
  }
  const HOSP_STEPS = [
    ['🚑', 'ピーポー ピーポー… きゅうきゅうしゃ で はこばれているよ'],
    ['🏥', 'けいゆう びょういん（みなとみらい 3ちょうめ）に ついたよ'],
    ['👩‍⚕️', 'かんごしさん「だいじょうぶ？ いたい ところを みせてね」'],
    ['👨‍⚕️', 'おいしゃさん「ひざを すりむいた だけ。ばんそうこう を はって おくね。よく がまん できたね！」'],
    ['🩹', 'げんきに なった！ たかい ところから おりる ときは、パラシュート 🪂 を ひらこうね'],
  ];
  function openHospital() {
    stopLoops(); let i = 0;
    const draw = () => {
      const [e, t] = HOSP_STEPS[i];
      $('hospBody').innerHTML = `<div class="hpic">${e}</div><p>${t}</p>`;
      $('bHospNext').textContent = i < HOSP_STEPS.length - 1 ? 'つぎへ ▶' : '🚪 びょういんの そとへ';
    };
    $('bHospNext').onclick = () => {
      i++; SFX.tap();
      if (i >= HOSP_STEPS.length) {
        show('ovHosp', false);
        const d = HOSPDOOR || freeSpot(HOSP.x, HOSP.bb[3] + 3);
        P.x = d.x; P.z = d.z; P.y = 0; P.state = 'ground'; P.ground = true; P.hurtS = null; P.st = maxSt(); P.tired = false; lastDoorId = '-';
        setPaused(); banner('🏥 けいゆう びょういん から でたよ<small>おだいじに！</small>', 3); return;
      }
      draw();
    };
    draw(); show('ovHosp', true); setPaused();
  }
  // --- ようちえんバス ---
  function busPose() {
    if (!BUSR) return { x: STOP.x, z: STOP.z, yaw: BUS.yaw };
    if (P.state === 'bus') return { x: BUS.x, z: BUS.z, yaw: BUS.yaw };
    const s0 = BUS.park === 'stop' ? 0.01 : BUSR.total - 0.01, q = BUSR.at(BUS.park === 'stop' ? Math.min(9, BUSR.total * 0.3) : BUSR.total - Math.min(9, BUSR.total * 0.3)); // いりぐちの まえ には とめない
    return { x: q.x, z: q.z, yaw: Math.atan2(q.ux, q.uz) + (BUS.park === 'stop' ? 0 : Math.PI) + 0 * s0 };
  }
  let busSnd = 0;
  function startBus(dir) {
    if (!BUSR) { banner('🚌 バスの みちが みつからないよ', 2); return; }
    if (!busRuns()) { banner('🌸 さくらごうは いま はしって いないよ<small>へいじつ（げつ〜きん）の 7じ〜16じ</small>', 3); return; }
    BUS.dir = dir; BUS.s = dir > 0 ? 0 : BUSR.total; const q = BUSR.at(BUS.s); BUS.x = q.x; BUS.z = q.z; BUS.yaw = Math.atan2(q.ux * dir, q.uz * dir);
    P.state = 'bus'; P.vx = P.vy = P.vz = 0; P.glide = false; P.wall = null; lastDoorId = '-';
    $('talk').style.display = 'none'; lastTalk = null; SFX.door();
    banner(dir > 0 ? '🌸 さくらごう しゅっぱつ！<small>せんせい「あおちゃん、おはよう！ シートベルト してね」</small>' : '🌸 かえりの さくらごう しゅっぱつ！<small>せんせい「きょうも たのしかったね。いわかめどおり まで おくるよ」</small>', 3.5);
  }
  function busUpdate(dt) {
    const b = BUS; b.s += b.dir * 6 * dt; const q = BUSR.at(b.s);
    b.x = q.x; b.z = q.z;
    const want = Math.atan2(q.ux * b.dir, q.uz * b.dir); let d = want - b.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; b.yaw += d * Math.min(1, 5 * dt);
    P.x = b.x - Math.cos(b.yaw) * 0.6; P.z = b.z + Math.sin(b.yaw) * 0.6; P.y = 0.55; P.face = b.yaw; P.speed = 0;
    if ((busSnd -= dt) < 0) { busSnd = 0.22; tone(65 + Math.random() * 6, 0.22, 'sawtooth', 0.025); }
    if (b.s <= 0 || b.s >= BUSR.total) {
      const toY = b.dir > 0, d2 = toY ? { x: YDOOR.ox, z: YDOOR.oz } : { x: STOP.x, z: STOP.z };
      b.park = toY ? 'yochien' : 'stop'; P.x = d2.x; P.z = d2.z; P.y = 0; P.state = 'ground'; P.ground = true; lastDoorId = '-';
      P.face = b.yaw; cam.yaw = b.yaw + Math.PI; cam.pitch = 0.45; // カメラは みちに そって うしろ
      tone(880, 0.15, 'sine', 0.1); tone(660, 0.25, 'sine', 0.1, null, 0.18);
      banner(toY ? '🎒 とべ ようちえん に ついたよ！<small>ピンクの ひかりの いりぐちから はいろう</small>' : '🏠 いわかめどおり に ついたよ！<small>おうちは すぐ そこ</small>', 3);
      if (!toY) momSay('おかえり、あおちゃん！ ようちえん たのしかった？', 4);
    }
  }
  function drawAnimals() {
    if (!ZOO || !zooOpen()) return;
    ZOO.pens.forEach((pn, i) => {
      const a = time * 0.35 + i, x = pn.x + Math.cos(a) * 1.6, z = pn.z + Math.sin(a * 0.8) * 1.4, f = -a + Math.PI / 2, st = Math.sin(time * 6 + i);
      const b = M(T(x, 0, z), RY(f));
      const leg = (lx, lz, h, c) => draw(mCube, M(b, T(lx, h / 2, lz), RX(st * 0.2 * Math.sign(lx * lz || 1)), S(0.12, h, 0.12)), c);
      if (pn.id === 'giraffe') {
        const y = hex('#f4c24d'), br = hex('#8d5a2b');
        draw(mCube, M(b, T(0, 2.0, 0), S(0.8, 0.8, 1.6)), y); [[-0.3, 0.6], [0.3, 0.6], [-0.3, -0.6], [0.3, -0.6]].forEach(([lx, lz]) => leg(lx, lz, 1.7, y));
        draw(mCube, M(b, T(0, 2.4, 0.75), RX(-0.45), T(0, 0.9, 0), S(0.3, 1.9, 0.3)), y); draw(mCube, M(b, T(0, 4.15, 1.6), S(0.35, 0.35, 0.6)), y);
        [[0.2, 2.3, 0.3], [-0.25, 2.1, -0.4], [0.15, 1.9, -0.1], [-0.2, 2.25, 0.5]].forEach(([sx, sy, sz]) => draw(mCube, M(b, T(sx * 2, sy, sz), S(0.84, 0.18, 0.18)), br));
        [-0.1, 0.1].forEach((ox) => draw(mCube, M(b, T(ox, 4.45, 1.5), S(0.06, 0.25, 0.06)), br));
      } else if (pn.id === 'zebra') {
        draw(mCube, M(b, T(0, 1.0, 0), S(0.6, 0.6, 1.3)), C.white); [[-0.2, 0.45], [0.2, 0.45], [-0.2, -0.45], [0.2, -0.45]].forEach(([lx, lz]) => leg(lx, lz, 0.8, C.white));
        for (let k = -2; k <= 2; k++) draw(mCube, M(b, T(0, 1.0, k * 0.24), S(0.62, 0.62, 0.07)), C.black);
        draw(mCube, M(b, T(0, 1.45, 0.75), RX(-0.6), S(0.3, 0.7, 0.3)), C.white); draw(mCube, M(b, T(0, 1.75, 1.0), S(0.28, 0.28, 0.5)), C.white);
      } else if (pn.id === 'redpanda') {
        const rd = hex('#c8552c'); draw(mCube, M(b, T(0, 0.45, 0), S(0.45, 0.4, 0.8)), rd); [[-0.15, 0.3], [0.15, 0.3], [-0.15, -0.3], [0.15, -0.3]].forEach(([lx, lz]) => leg(lx, lz, 0.3, C.black));
        draw(mCube, M(b, T(0, 0.7, 0.5), S(0.45, 0.38, 0.38)), rd); draw(mCube, M(b, T(0, 0.65, 0.7), S(0.32, 0.18, 0.04)), C.white);
        for (let k = 0; k < 4; k++) draw(mCube, M(b, T(0, 0.5 + Math.sin(time * 3) * 0.05, -0.5 - k * 0.18), S(0.22, 0.22, 0.18)), k % 2 ? hex('#f1d3b3') : rd);
      } else if (pn.id === 'chimp') {
        const pb = person(x, -0.25, z, f, hex('#3b2a20'), Math.sin(time * 2 + i) > 0.6 ? 'up' : 'sit', time); part(pb, 0, 1.5, 0.05, 0.4, 0.34, 0.4, hex('#c69c7c'));
      } else if (pn.id === 'penguin') {
        for (let k = 0; k < 3; k++) { const px = pn.x - 1 + k + Math.sin(time + k) * 0.5, pz = pn.z + 1.6 + Math.cos(time * 0.7 + k) * 0.4, pb = M(T(px, 0, pz), RY(f + k)); draw(mSphere, M(pb, T(0, 0.45, 0), S(0.22, 0.42, 0.2)), C.black); draw(mSphere, M(pb, T(0, 0.42, 0.06), S(0.16, 0.32, 0.16)), C.white); draw(mCube, M(pb, T(0, 0.7, 0.2), S(0.06, 0.05, 0.12)), C.orange); }
      } else if (pn.id === 'manul') {
        const gy = hex('#a39a8e'); draw(mSphere, M(b, T(0, 0.4, 0), S(0.45, 0.35, 0.55)), gy); draw(mSphere, M(b, T(0, 0.62, 0.45), S(0.3, 0.26, 0.26)), gy);
        [-0.12, 0.12].forEach((ox) => draw(mCube, M(b, T(ox, 0.66, 0.7), S(0.07, 0.05, 0.02)), hex('#f2c14e'))); draw(mCube, M(b, T(0, 0.4, -0.65), S(0.16, 0.16, 0.5)), gy);
      } else {
        for (let k = 0; k < 4; k++) { const px = pn.x - 1.5 + k, pz = pn.z + Math.sin(time * 1.5 + k) * 0.8; draw(mSphere, M(T(px, 0.18, pz), S(0.22, 0.17, 0.3)), k % 2 ? hex('#8d5a2b') : C.white); }
      }
    });
  }
  function drawBus() {
    const q = busPose(), b = M(T(q.x, 0, q.z), RY(q.yaw)), Y2 = hex('#f783ac'); // ピンクの「さくらごう」
    draw(mCube, M(b, T(0, 1.05, 0), S(3.0, 1.3, 6.4)), Y2);
    draw(mCube, M(b, T(0, 1.0, 0), S(3.04, 0.18, 6.44)), C.white);
    for (let k = 0; k < 6; k++) [-1, 1].forEach((sd) => { const zz = -2.6 + k * 1.05, yy = 0.65 + (k % 2) * 0.25; for (let pp = 0; pp < 5; pp++) { const a = pp / 5 * Math.PI * 2; draw(mSphere, M(b, T(sd * 1.52, yy + Math.sin(a) * 0.14, zz + Math.cos(a) * 0.14), S(0.03, 0.09, 0.09)), hex('#fff0f6'), 0.4); } draw(mSphere, M(b, T(sd * 1.53, yy, zz), S(0.03, 0.05, 0.05)), hex('#e64980'), 0.4); });
    draw(mCube, M(b, T(0, 2.25, 3.22), S(1.9, 0.38, 0.05)), C.white);                     // まえの なまえ いた
    [0, 1, 2].forEach((k) => draw(mSphere, M(b, T(-0.55 + k * 0.55, 2.25, 3.26), S(0.13, 0.13, 0.03)), hex('#e64980'), 0.6));
    [[-1.5, 2.05], [1.5, 2.05]].forEach(([x]) => { draw(mCube, M(b, T(x * 0.98, 2.05, 3.0), S(0.12, 0.8, 0.12)), Y2); draw(mCube, M(b, T(x * 0.98, 2.05, -2.8), S(0.12, 0.8, 0.12)), Y2); });
    draw(mCube, M(b, T(0, 2.55, 0), S(3.0, 0.2, 6.4)), Y2);
    draw(mCube, M(b, T(0, 2.75, 0.4), S(1.6, 0.25, 0.9)), C.white);
    [-0.6, 0.6].forEach((x) => { draw(mSphere, M(b, T(x, 1.55, 3.21), S(0.32, 0.32, 0.05)), C.white); draw(mSphere, M(b, T(x, 1.55, 3.25), S(0.15, 0.17, 0.04)), C.black); });
    draw(mCube, M(b, T(0, 1.1, 3.22), S(0.6, 0.1, 0.04)), hex('#e03131'));
    [[-1.4, 2.1], [1.4, 2.1], [-1.4, -2.1], [1.4, -2.1]].forEach(([x, z]) => draw(mCube, M(b, T(x, 0.42, z), S(0.32, 0.84, 0.84)), C.black));
    if (P.state === 'bus') { const tb = person(q.x - Math.cos(q.yaw) * 0.8 + Math.sin(q.yaw) * 2.0, 0.55, q.z + Math.sin(q.yaw) * 0.8 + Math.cos(q.yaw) * 2.0, q.yaw + Math.PI, hex('#ffa8a8'), 'sit', 0); part(tb, 0, 0.95, 0.19, 0.5, 0.5, 0.04, hex('#fff9db')); part(tb, 0, 1.45, -0.18, 0.56, 0.6, 0.2, C.hair); } // せんせい（エプロン）
    if (P.state === 'bus') for (let k = 0; k < 3; k++) person(q.x + Math.cos(q.yaw) * 0.7 - Math.sin(q.yaw) * (k * 1.6 - 2.4), 0.55, q.z - Math.sin(q.yaw) * 0.7 - Math.cos(q.yaw) * (k * 1.6 - 2.4), q.yaw, [C.green, C.orange, C.purple][k], 'sit', 0);
  }
  function startSlide() {
    if (!SLIDE) return; P.state = 'slide'; P.sl = { t: 0 }; P.vx = P.vy = P.vz = 0; lastDoorId = '-'; $('talk').style.display = 'none'; lastTalk = null;
    banner('🛝 すべりだい！', 1.5);
  }
  function slideUpdate(dt) {
    const s2 = P.sl, S2 = SLIDE; s2.t += dt; const t = s2.t;
    if (t < 1.6) { const k = t / 1.6; P.x = S2.A.x + (S2.top.x - S2.A.x) * k; P.z = S2.A.z + (S2.top.z - S2.A.z) * k; P.y = S2.H * k; P.face = S2.yaw; P.phase += dt * 8; P.speed = 3; }
    else if (t < 2.0) { P.x = S2.top.x; P.z = S2.top.z; P.y = S2.H; P.speed = 0; if (!s2.say) { s2.say = 1; momSay('がんばって〜！ 👏', 2); } }
    else if (t < 3.1) { const k = ((t - 2.0) / 1.1) ** 1.6; P.x = S2.sl.x + (S2.B.x - S2.sl.x) * k; P.z = S2.sl.z + (S2.B.z - S2.sl.z) * k; P.y = S2.H - (S2.H - 0.25) * k; P.speed = 0; if (!s2.wh) { s2.wh = 1; noise(1.0, 0.18, 1600); banner('🛝 わーーい！', 1.2); } }
    else { P.y = 0; P.state = 'ground'; P.ground = true; P.sl = null; lastDoorId = '-'; momSay('じょうず じょうず！ もういっかい する？', 3); SFX.star(); }
  }
  function openPlace(kind) {
    if (!window.Places) return;
    if (kind === 'yochien' && !yochienOpen()) { banner('🌷 ようちえんは いま おやすみ<small>へいじつ 8:30〜15:00</small>', 3); return; }
    if (kind === 'piano' && !pianoOpen()) { banner('🎹 しまむら がっき は しまってるよ<small>10:00〜20:00（きん〜にち は 21:00 まで）</small>', 3); return; }
    if (kind === 'yochien') calDone('yochien');
    SFX.door(); show('ovPlace', true); setPaused();
    if (kind === 'home' && errandDoneAtHome()) { const e2 = 100; save.wallet[100] = (save.wallet[100] || 0) + 1; store(); refreshHud(); void e2; }
    window.Places.open(kind, {
      night: isNight(), clock: clockStr(), lessonDay: CLK.wd === 3,
      week: (() => { const d0 = save.clock.day - CLK.wd; return { today: CLK.wd, days: WEEK.map((n, i) => ({ name: n, plan: SCHED[i], done: (save.cal || {})[d0 + i] || {} })) }; })(), errand: save.errand, zoo: ZOO ? { pens: ZOO.pens, found: save.zoo || {}, open: zooOpen() } : null,
      wallet: Wallet, tone, sfx: (n) => (SFX[n] ? SFX[n]() : SFX.tap()),
      stats: () => { let o = {}; try { o = JSON.parse(localStorage.getItem('minatomirai-bouken-odekake-v1')) || {}; } catch (e) { o = {}; } return { stamps: save.stamps.length, stars: save.stars.length, passed: window.Kumon ? window.Kumon.passed.length : 0, hs: save.hs || 0, photos: photos.length, cups: (o.cups || []).length, maru: Object.keys(o.maru || {}).length >= 5, toys: save.items.filter((id) => window.Shops && window.Shops.TOYS.some((t) => t.id === id && !t.acc)).length }; }, confetti,
      photos: () => photos.slice(), delPhoto: (i) => { photos.splice(i, 1); storePhotos(); $('photoN').textContent = photos.length; }, papa: PAPA.on, hs: save.hs || 0,
      onClose: (res) => {
        if (res && res.rest) { P.st = maxSt(); P.tired = false; }
        if (res && res.sleep) { sleepUntilMorning(); banner('☀️ おはよう！ あさに なったよ<small>きょうは ' + WEEK[CLK.wd] + 'ようび</small>', 3.5); }
        if (res && res.errand) startErrand();
        if (res && res.stay) { window.Places.again(res.stay); return; }
        show('ovPlace', false); setPaused(); stepOut();
        if (res && res.bus) startBus(res.bus);
        else if (res && res.slide) startSlide();
        if (res && res.piano) { if (!calDone('piano')) banner('🎹 れんしゅう できたね！<small>レッスンの シールは もくようび</small>', 2.5); momSay('ピアノ じょうずに なったね 🎹', 3); }
        else if (kind === 'home') momSay(res && res.rest ? 'よく ねたね！ さあ でかけよう' : 'いってきます！ ママも いっしょ', 3);
      },
    });
  }
  function heliEnter() {
    P.state = 'heli'; P.glide = false; P.vx = P.vy = P.vz = 0; HELI.vx = HELI.vy = HELI.vz = 0; HELI.home = false; lastDoorId = '-';
    $('talk').style.display = 'none'; lastTalk = null; cam.dist = Math.max(cam.dist, 10);
    banner('🚁 ヘリコプター しゅっぱつ！<small>ジャンプ＝のぼる・さがる ボタン＝さがる・ひだりで いどう。じめんに おりたら「おりる」</small>', 4);
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
  // ================= プロペラぼうし（じゆうに そらを とぶ）=================
  // あおい ぼうしの プロペラが まわって とぶ。スタミナ も おなら も いらない。ジャンプ＝のぼる・さがる ボタン＝さがる
  let propSnd = 0;
  function toggleProp() {
    if (paused || !save.settings.prop) return;
    if (P.state === 'prop') {
      P.state = 'air'; P.ground = false; P.fallTop = P.y; P.vy = Math.min(P.vy, 0);
      tone(500, 0.25, 'sine', 0.06, 220); banner('🧢 プロペラ ストップ<small>ふわっと おりるよ。🪂 も ひらけるよ</small>', 2); return;
    }
    if (!{ ground: 1, air: 1, swim: 1, climb: 1 }[P.state]) { banner('🧢 いまは プロペラが つかえないよ', 1.6); return; }
    if (P.state === 'climb') release();
    if (P.farting) { P.farting = false; fartStop(); }
    P.state = 'prop'; P.ground = false; P.glide = false; P.plat = null; P.vy = 5; P.propT = 0;
    tone(300, 0.35, 'triangle', 0.06, 900); banner('🧢 プロペラぼうし！ そらへ しゅっぱつ<small>ジャンプ＝のぼる ・ さがる ボタン＝さがる ・ ひだりで すすむ</small>', 3.5);
    if (save.settings.talk > 0) momSay('プロペラぼうし！ ママも はねで いっしょに とぶよ 👼', 3);
  }
  function propUpdate(dt, dx, dz) {
    P.propT = (P.propT || 0) + dt;
    const sp = 11, k = Math.min(1, 3 * dt);
    P.vx += (dx * sp - P.vx) * k; P.vz += (dz * sp - P.vz) * k;
    const ty = inp.up ? 6.5 : inp.down ? -6.5 : Math.sin(time * 2.5) * 0.25;
    P.vy += (ty - P.vy) * Math.min(1, 4 * dt);
    moveH('x', P.vx * dt, false); moveH('z', P.vz * dt, false);
    if (P.y + P.vy * dt > 230) P.vy = Math.min(0, P.vy);
    const r = moveV(P.vy * dt); if (r !== 0) P.vy = 0;
    if (Math.hypot(P.vx, P.vz) > 0.6) { const want = Math.atan2(P.vx, P.vz); let d = want - P.face; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; P.face += d * Math.min(1, 8 * dt); }
    P.speed = 0; P.glide = false; P.fallTop = P.y;
    if (P.y < WATER - 0.2) { P.y = WATER - 0.2; P.vy = Math.max(0, P.vy); }
    if ((propSnd -= dt) < 0) { propSnd = 0.11; tone(190 + Math.min(80, Math.abs(P.vy) * 12), 0.07, 'triangle', 0.018); }
    // じめんに ついたら しぜんに とまる（とびたって すぐ は とまらない）
    if (r === 1 && P.propT > 0.8 && !inp.up) { P.state = 'ground'; P.ground = true; P.vy = 0; tone(420, 0.2, 'sine', 0.06, 200); banner('🧢 ちゃくち！<small>また とぶ ときは 🧢 ボタン</small>', 1.8); }
  }
  function release() {
    const w = P.wall; P.state = 'air'; P.wall = null; P.cool = 0.45; P.ground = false; P.boost = 0;
    if (w) { const push = 2.2; if (w.axis === 'x') P.vx = w.side * push; else P.vz = w.side * push; } P.vy = 0;
  }
  function respawn() {
    stopLoops(); P.co = P.gh = P.wh = P.hurtS = null; P.fallTop = 0;
    if (P.state === 'heli') { HELI.vx = HELI.vy = HELI.vz = 0; }
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
    part(base, -0.13, 0.72, 0, 0.2, 0.72, 0.22, C.navy, RX(pose === 'sit' ? -1.45 : lg));
    part(base, 0.13, 0.72, 0, 0.2, 0.72, 0.22, C.navy, RX(pose === 'sit' ? -1.45 : -lg));
    part(base, 0, 0.98, 0, 0.56, 0.58, 0.36, shirt);
    part(base, -0.36, 1.24, 0, 0.16, 0.54, 0.18, shirt, RX(-al));
    part(base, 0.36, 1.24, 0, 0.16, 0.54, 0.18, shirt, RX(-ar));
    part(base, 0, 1.5, 0, 0.52, 0.48, 0.48, C.skin);
    part(base, 0, 1.56, -0.06, 0.55, 0.42, 0.42, C.hair);
    part(base, -0.11, 1.5, 0.245, 0.07, 0.1, 0.02, C.black); part(base, 0.11, 1.5, 0.245, 0.07, 0.1, 0.02, C.black);
    return base;
  }
  function drawHeli() {
    const h = HELI, b = M(T(h.x, h.y, h.z), RY(h.yaw)), red = hex('#e03131');
    draw(mCube, M(b, T(0, 0.75, -0.1), S(2.0, 1.1, 3.0)), red);
    draw(mCube, M(b, T(0, 0.72, -0.1), S(2.04, 0.22, 3.04)), C.white);
    draw(mCube, M(b, T(0, 1.55, -0.85), S(1.9, 0.75, 1.3)), red);
    draw(mCube, M(b, T(0, 1.0, -3.2), S(0.38, 0.38, 3.4)), red);
    draw(mCube, M(b, T(0, 1.55, -4.7), S(0.14, 1.2, 0.7)), C.white);
    draw(mCube, M(b, T(0.15, 1.55, -4.75), RX(h.rot * 1.4), S(0.05, 1.5, 0.16)), C.navy);
    [-0.9, 0.9].forEach((x) => { draw(mCube, M(b, T(x, 0.06, 0), S(0.12, 0.12, 3.4)), C.gray); draw(mCube, M(b, T(x, 0.2, 0.7), S(0.08, 0.35, 0.08)), C.gray); draw(mCube, M(b, T(x, 0.2, -0.8), S(0.08, 0.35, 0.08)), C.gray); });
    draw(mCube, M(b, T(0, 2.1, -0.3), S(0.22, 0.5, 0.22)), C.gray);
    [0, Math.PI / 2].forEach((a) => draw(mCube, M(b, T(0, 2.38, -0.3), RY(h.rot + a), S(9.5, 0.06, 0.32)), C.navy));
  }
  function drawCoaster() {
    const car = (q, col) => {
      const yw = Math.atan2(q.tx, q.tz), pt = Math.asin(clamp(q.ty, -1, 1)), b = M(T(q.x, q.y + 0.2, q.z), RY(yw), RX(-pt));
      draw(mCube, M(b, T(0, 0.15, 0), S(1.6, 0.5, 2.3)), col);
      draw(mCube, M(b, T(0, 0.55, -0.9), S(1.5, 0.45, 0.25)), shade(col, 0.7));
      draw(mCube, M(b, T(0, 0.45, 1.05), S(1.5, 0.3, 0.2)), C.white);
      draw(mCube, M(b, T(0, 0.75, 0.35), S(1.3, 0.08, 0.08)), C.yellow);
      [-0.75, 0.75].forEach((x) => draw(mCube, M(b, T(x, -0.1, 0), S(0.15, 0.25, 2)), C.gray));
    };
    if (P.state === 'coaster') { const s0 = P.co.s; car(CO.at(s0), hex('#e03131')); car(CO.at(s0 - 2.6), hex('#1c7ed6')); car(CO.at(s0 - 5.2), hex('#ffd43b')); }
    else {
      CO.idle = CO.idle || { s: 0, v: 3 }; const c = CO.idle, q = CO.at(c.s);
      if (q.u > 0.07 && q.u < 0.27) c.v = 3.6; else { const a = CO.at(c.s + 0.3); c.v = Math.sqrt(Math.max(4, c.v * c.v + 2 * 15 * (q.y - a.y) * (0.3 / Math.max(0.3, 0.3)))); if (q.u > 0.93) c.v = Math.max(3, c.v * 0.97); }
      c.s += c.v / 60;
      [0, 2.6, 5.2].forEach((o, k) => car(CO.at(c.s - o), [hex('#e03131'), hex('#1c7ed6'), hex('#ffd43b')][k]));
    }
  }
  function drawAmb() {
    const a = ambPos(), b = M(T(a.x, 0, a.z), RY(a.f)), red = hex('#e03131'), on = Math.floor(time * 6) % 2;
    draw(mCube, M(b, T(0, 1.35, -0.4), S(2.3, 2.1, 3.6)), C.white);
    draw(mCube, M(b, T(0, 0.95, 1.95), S(2.2, 1.3, 1.3)), C.white);
    draw(mCube, M(b, T(0, 1.35, 2.62), S(1.9, 0.55, 0.05)), [0.55, 0.8, 1]);
    draw(mCube, M(b, T(0, 1.0, -0.2), S(2.34, 0.3, 4.6)), red);
    draw(mCube, M(b, T(-0.6, 2.5, 1.0), S(0.45, 0.25, 0.4)), on ? red : shade(red, 0.4), on);
    draw(mCube, M(b, T(0.6, 2.5, 1.0), S(0.45, 0.25, 0.4)), on ? shade(red, 0.4) : red, 1 - on);
    draw(mCube, M(b, T(0, 1.8, -2.21), S(0.9, 0.9, 0.05)), red);
    [[-1.05, 1.7], [1.05, 1.7], [-1.05, -1.4], [1.05, -1.4]].forEach(([x, z]) => draw(mCube, M(b, T(x, 0.4, z), S(0.3, 0.8, 0.8)), C.black));
    if (P.hurtS.t > 5.3) { person(P.x + 1.2, 0, P.z + 0.8, a.f + Math.PI, C.white, 'stand', 0); person(P.x - 1.2, 0, P.z + 0.8, a.f + Math.PI, C.white, 'stand', 0); }
  }
  function drawGhostScene() {
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    draw(GHM.mesh, T(0, GHM.Y, 0), W);
    { const q = GHM.at(Math.max(0, P.gh.s - 1.6)); drawMomAt(q.x, GHM.Y, q.z, Math.atan2(q.ux, q.uz), 0, false, P.gh.cur ? 0 : 1); placeMomTalk(); }
    const h = P.gh, Y = GHM.Y, ev = h.cur, et = h.et, s0 = GHM.EV[Math.max(0, h.ev - 1)][0];
    const ghost = (x, y, z, sc, a) => {
      const f = Math.atan2(eye[0] - x, eye[2] - z), b = M(T(x, y, z), RY(f), S(sc));
      draw(mSphere, M(b, S(0.55, 0.6, 0.55)), [0.95, 0.97, 1], 0.5, a);
      draw(mCone, M(b, T(0, -0.15, 0), RX(Math.PI), S(0.55, 1.1, 0.55)), [0.95, 0.97, 1], 0.5, a);
      draw(mSphere, M(b, T(-0.2, 0.08, 0.48), S(0.1, 0.16, 0.06)), C.black, 1, a);
      draw(mSphere, M(b, T(0.2, 0.08, 0.48), S(0.1, 0.16, 0.06)), C.black, 1, a);
      draw(mSphere, M(b, T(0, -0.2, 0.5), S(0.12, 0.14, 0.05)), C.black, 1, a);
    };
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // ふわふわ ただよう ちいさな おばけ
    for (let k = 0; k < 4; k++) { const q = GHM.at((h.s + 7 + k * 9) % GHM.total); ghost(q.x + Math.sin(time + k) * 0.6, Y + 2.2 + Math.sin(time * 2 + k) * 0.2, q.z + Math.cos(time + k) * 0.6, 0.35, 0.35); }
    if (ev) {
      const q = GHM.at(s0 + 2.5), nx = -q.uz, nz = q.ux;
      if (ev === 'ghost') { const t = clamp(et / 1.6, 0, 1), sd = -GHM.hw + t * GHM.hw * 2; ghost(q.x + nx * sd, Y + 1.6 + Math.sin(et * 6) * 0.15, q.z + nz * sd, 1, 0.85); }
      if (ev === 'portrait') ghost(q.x + nx * 1.2, Y + 1.8, q.z + nz * 1.2, 0.7, Math.min(0.8, et));
      if (ev === 'skeleton') {
        const y = Y + Math.max(0.9, 3.4 - et * 6) + Math.abs(Math.sin(et * 9)) * 0.15 * Math.max(0, 1 - et);
        const b = M(T(q.x, y, q.z), RY(Math.atan2(eye[0] - q.x, eye[2] - q.z)));
        draw(mSphere, M(b, T(0, 1.2, 0), S(0.28, 0.3, 0.28)), C.white, 0.3);
        draw(mSphere, M(b, T(-0.1, 1.22, 0.24), S(0.07, 0.08, 0.04)), C.black); draw(mSphere, M(b, T(0.1, 1.22, 0.24), S(0.07, 0.08, 0.04)), C.black);
        for (let r = 0; r < 4; r++) draw(mCube, M(b, T(0, 0.85 - r * 0.15, 0), S(0.5 - r * 0.05, 0.05, 0.25)), C.white, 0.3);
        draw(mCube, M(b, T(0, 0.55, 0), S(0.06, 0.8, 0.06)), C.white, 0.3);
        [-1, 1].forEach((sd) => { draw(mCube, M(b, T(sd * 0.32, 0.6, 0), RZ(sd * (0.3 + Math.sin(time * 12) * 0.3)), S(0.06, 0.6, 0.06)), C.white, 0.3); draw(mCube, M(b, T(sd * 0.12, -0.1, 0), S(0.06, 0.7, 0.06)), C.white, 0.3); });
      }
      if (ev === 'coffin') { const c = GHM.at(55), y = Y - 1.4 + Math.min(1.4, et * 1.6), b = person(c.x - c.uz * 1.1, y, c.z + c.ux * 1.1, Math.atan2(eye[0] - c.x, eye[2] - c.z), hex('#5c7a4a'), 'up', 0); part(b, 0, 1.5, 0, 0.53, 0.49, 0.49, hex('#94d82d')); }
      if (ev === 'hands') for (let k = 0; k < 6; k++) { const qq = GHM.at(s0 + 0.5 + k * 0.7), sd = k % 2 ? 1 : -1, nx2 = -qq.uz * sd, nz2 = qq.ux * sd, out = Math.max(0, Math.sin(et * 3 + k)) * 0.7; draw(mCube, M(T(qq.x + nx2 * (GHM.hw - out / 2), Y + 1.2 + (k % 3) * 0.3, qq.z + nz2 * (GHM.hw - out / 2)), RY(Math.atan2(nx2, nz2)), S(0.14, 0.14, out + 0.05)), hex('#c0eb75')); }
      if (ev === 'face') { const t = clamp(et / 0.6, 0, 1), f = GHM.at(s0 + 7 - t * 6.4); ghost(f.x, Y + 1.4, f.z, 1.8, 0.9); }
    }
    gl.disable(gl.BLEND);
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
    if (P.state === 'heli' || P.state === 'coaster' || P.state === 'bus' || P.state === 'akai' || P.state === 'boat') pose = 'sit';
    if (P.state === 'slide') pose = P.sl && P.sl.t < 1.6 ? 'climb' : P.sl && P.sl.t > 2 ? 'up' : 'stand';
    if (P.state === 'coaster' || P.state === 'wheel') return; // じぶんの め で みている
    const base = P.state === 'hurt' ? M(T(P.x, P.y + 0.33, P.z), RY(P.face), RX(-Math.PI / 2)) : M(T(P.x, P.y, P.z), RY(P.face)); const { lg, ar, al } = poseAngles(pose, P.phase);
    const sitP = pose === 'sit';
    part(base, -0.12, 0.52, 0, 0.19, 0.5, 0.2, hex('#3b4a6b'), RX(sitP ? -1.45 : lg));          // はんズボン
    part(base, 0.12, 0.52, 0, 0.19, 0.5, 0.2, hex('#3b4a6b'), RX(sitP ? -1.45 : -lg));
    part(base, -0.12, 0.1, 0.03, 0.2, 0.14, 0.28, C.white, lg ? RX(lg * 0.6) : null); // くつ
    part(base, 0.12, 0.1, 0.03, 0.2, 0.14, 0.28, C.white, lg ? RX(-lg * 0.6) : null);
    part(base, 0, 0.76, 0, 0.5, 0.5, 0.32, C.blue);                                   // あおい Tシャツ
    draw(mStar, M(base, T(0, 0.8, 0.17), S(0.13, 0.13, 0.06)), C.yellow, 0.6);
    part(base, -0.31, 0.98, 0, 0.14, 0.44, 0.16, C.blue, RX(-al));
    part(base, 0.31, 0.98, 0, 0.14, 0.44, 0.16, C.blue, RX(P.handT > 0 && P.state === 'ground' ? -2.9 : -ar)); // おうだんほどうで てを あげる
    part(base, 0, 1.32, 0, 0.62, 0.58, 0.56, C.skin);                                 // おおきな あたま
    part(base, 0, 1.4, -0.06, 0.65, 0.46, 0.5, hex('#2b1d14'));                         // みじかい かみ
    part(base, -0.13, 1.3, 0.285, 0.08, 0.12, 0.02, C.black); part(base, 0.13, 1.3, 0.285, 0.08, 0.12, 0.02, C.black);
    part(base, -0.2, 1.2, 0.285, 0.09, 0.05, 0.02, C.pink); part(base, 0.2, 1.2, 0.285, 0.09, 0.05, 0.02, C.pink);
    part(base, 0, 1.15, 0.285, 0.12, 0.04, 0.02, hex('#c2410c'));                     // くち
    part(base, 0, 1.66, 0, 0.66, 0.16, 0.6, C.cap);                                    // あおい ぼうし
    part(base, 0, 1.61, 0.38, 0.56, 0.05, 0.28, C.cap);
    { // ぼうしの プロペラ（とぶ とき だけ まわる）
      const on = P.state === 'prop', a = on ? time * 28 : 0.6; if (save.settings.prop) {
      part(base, 0, 1.8, 0, 0.09, on ? 0.34 : 0.16, 0.09, C.gray);
      { const pb = M(base, T(0, on ? 2.02 : 1.88, 0), RY(a)), L = on ? 2.1 : 0.9, Wb = on ? 0.3 : 0.18; draw(mCube, M(pb, S(L, 0.07, Wb)), C.yellow, 0.3); draw(mCube, M(pb, RY(Math.PI / 2), S(L, 0.07, Wb)), hex('#ff6b6b'), 0.3); draw(mSphere, M(pb, S(0.12)), C.red); } }
    }
    if (P.glide) draw(mChute, M(base, T(0, 4.0, 0)), W);
    else if (weatherNow() === 'rain' && (P.state === 'ground' || P.state === 'air')) { draw(mCone, M(base, T(-0.3, 2.15, 0), S(1.05, 0.45, 1.05)), hex('#ffd43b')); part(base, -0.3, 2.15, 0, 0.04, 1.1, 0.04, C.navy); } // きいろい かさ
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
    return t0 <= 0.0001 ? 2 : t0; // すぐ そばの かべ（はじめから なか）は むし
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
    const gq = save.settings.gfx, dpr = gq >= 2 ? Math.min(devicePixelRatio || 1, 2) : gq >= 1 ? 1 : 0.6;
    const w = Math.floor(innerWidth * dpr), h = Math.floor(innerHeight * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    gl.viewport(0, 0, w, h);
    const SK = skyNow();
    gl.clearColor(SK.col[0], SK.col[1], SK.col[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);

    let fov = 1.05, tgt, inGhost = P.state === 'ghost';
    if (FP[P.state]) {
      let ex, ey, ez, by = 0, bp = 0;
      if (P.state === 'coaster') {
        const q = P.co.vis || CO.at(P.co.s); by = Math.atan2(q.tx, q.tz); const pt0 = Math.asin(clamp(q.ty, -1, 1)); bp = pt0 * 0.9;
        const ux = -Math.sin(by) * Math.sin(pt0), uy = Math.cos(pt0), uz = -Math.cos(by) * Math.sin(pt0);
        ex = q.x + ux * 1.25 + q.tx * 0.15; ey = q.y + 0.2 + uy * 1.25 + q.ty * 0.15; ez = q.z + uz * 1.25 + q.tz * 0.15; fov = 1.05 + Math.min(0.45, P.co.v * 0.022);
        const sh = Math.min(0.06, P.co.v * 0.0035); ex += (Math.random() - 0.5) * sh; ey += (Math.random() - 0.5) * sh;
      } else if (P.state === 'wheel') { ex = P.x; ey = P.y + 1.15; ez = P.z; by = FW.axis === 'x' ? -Math.PI / 2 : Math.PI; bp = -0.22; }
      else { const q = GHM.at(P.gh.s), want = Math.atan2(q.ux, q.uz); let d0 = want - (P.gh.yaw === undefined ? want : P.gh.yaw); while (d0 > Math.PI) d0 -= Math.PI * 2; while (d0 < -Math.PI) d0 += Math.PI * 2; P.gh.yaw = (P.gh.yaw === undefined ? want : P.gh.yaw) + d0 * 0.08; by = P.gh.yaw; ex = q.x; ey = GHM.Y + 1.35 + Math.sin(time * 6) * 0.02; ez = q.z; }
      const yw = by + look.yaw, pt = clamp(bp + look.pitch, -1.45, 1.45);
      eye = [ex, ey, ez]; tgt = [ex + Math.sin(yw) * Math.cos(pt), ey + Math.sin(pt), ez + Math.cos(yw) * Math.cos(pt)];
    }
    if (!FP[P.state]) {
    tgt = P.state === 'heli' ? [HELI.x, HELI.y + 1.6, HELI.z] : (P.state === 'bus' || P.state === 'akai') ? [P.x, 2.4, P.z] : P.state === 'boat' ? [P.x, WATER + 2.8, P.z] : [P.x, P.y + 1.2, P.z];
    let dist = cam.dist + (P.state === 'climb' ? 2 : 0) + (P.glide || P.farting ? 3 : 0) + (P.state === 'ride' ? 5 : 0) + (P.state === 'heli' ? 8 : 0) + (P.state === 'hurt' ? 4 : 0) + (P.state === 'bus' || P.state === 'akai' ? 6 : 0) + (P.state === 'boat' ? 8 : 0);
    const camTry = (pitch) => {
      const cp = Math.cos(pitch), dd = [Math.sin(cam.yaw) * cp, Math.sin(pitch), Math.cos(cam.yaw) * cp], d = [dd[0] * dist, dd[1] * dist, dd[2] * dist];
      let t2 = 1;
      if (P.state !== 'ride') { const ex = tgt[0] + d[0], ez = tgt[2] + d[2]; for (const b of near(Math.min(tgt[0], ex), Math.min(tgt[2], ez), Math.max(tgt[0], ex), Math.max(tgt[2], ez))) { const tt = rayBox(tgt, d, b); if (tt < t2) t2 = t2 = tt; } }
      return { dd, t2 };
    };
    // うしろが かべで ふさがって いたら、カメラを うえに にがして みおろす（ほそい みち）
    let best = camTry(cam.pitch);
    for (const pz of [0.75, 1.05, 1.3]) { if (best.t2 * dist >= 4.5 || pz <= cam.pitch) continue; const c2 = camTry(pz); if (c2.t2 * dist > best.t2 * dist + 1) best = c2; }
    const dir = best.dd, tm = best.t2;
    dist = Math.max(1.2, dist * tm - 0.25);
    eye = [tgt[0] + dir[0] * dist, Math.max(WATER + 0.4, tgt[1] + dir[1] * dist), tgt[2] + dir[2] * dist];
    }
    proj = persp(fov, w / h, 0.1, 3600); view = lookAt(eye, tgt);
    // きり: たかい ところほど とおくまで みえる。おばけやしき は まっくら
    const hy = Math.max(0, eye[1]);
    gl.uniform1f(U.uFogN, inGhost ? 0.8 : 70 + hy * 8); gl.uniform1f(U.uFogF, inGhost ? (P.gh.flick ? 3.5 : 11) : Math.min(3200, 350 + hy * 28));
    gl.uniformMatrix4fv(U.uProj, false, proj); gl.uniformMatrix4fv(U.uView, false, view);
    gl.uniform3fv(U.uSun, SUN); gl.uniform3fv(U.uFog, inGhost ? [0, 0, 0] : SK.col); gl.uniform1f(U.uLight, inGhost ? 1 : SK.light); gl.uniform1f(U.uNight, inGhost ? 0 : SK.night); gl.uniform3fv(U.uCam, eye); gl.uniform1f(U.uTime, time);
    bound = null;
    if (inGhost) { drawGhostScene(); return; }

    draw(staticMesh, I(), W);
    // かんらんしゃ
    const ang = time * Math.PI * 2 / FW.period, rotP = FW.axis === 'x' ? -Math.PI / 2 : 0;
    { const nt = SK.night, hue = (time * 0.15) % 1, rb = [0.5 + 0.5 * Math.sin(hue * 6.28), 0.5 + 0.5 * Math.sin(hue * 6.28 + 2.1), 0.5 + 0.5 * Math.sin(hue * 6.28 + 4.2)];
      draw(mWheel, M(T(FW.cx, FW.hub, FW.cz), RY(rotP), RZ(ang)), nt > 0.3 ? rb : W, nt); } // よるは にじいろに ひかる
    if (SK.night > 0.3 && Math.floor(time * 1.2) % 2) draw(mSphere, M(T(LMC.x, LMH + 2.4, LMC.z), S(0.35)), C.red, 1); // てっぺんの あかい ランプ
    draw(mClock, M(T(FW.cx, FW.hub, FW.cz), RY(rotP), T(0, 0, 0.35)), W, 0.3);
    draw(mClock, M(T(FW.cx, FW.hub, FW.cz), RY(rotP), T(0, 0, -0.35)), W, 0.3);
    const now = new Date(), hr = (now.getHours() % 12 + now.getMinutes() / 60) / 12 * Math.PI * 2, mn = now.getMinutes() / 60 * Math.PI * 2;
    [0.4, -0.4].forEach((zo) => {
      draw(mCube, M(T(FW.cx, FW.hub, FW.cz), RY(rotP), T(0, 0, zo), RZ(-hr), T(0, 0.8, 0), S(0.25, 1.6, 0.05)), C.white, 1);
      draw(mCube, M(T(FW.cx, FW.hub, FW.cz), RY(rotP), T(0, 0, zo), RZ(-mn), T(0, 1.2, 0), S(0.15, 2.4, 0.05)), C.yellow, 1);
    });
    cabins.forEach((p, i) => {
      if (P.state === 'wheel' && P.wh.i === i) { // のっている はこ は まどが あいて みえる
        const c = CAB_COL[i % CAB_COL.length];
        draw(mCube, M(T(p.cx, p.cy - 1.5, p.cz), S(2.2, 0.12, 2.2)), c);
        draw(mCube, M(T(p.cx, p.cy + 0.15, p.cz), S(2.3, 0.08, 2.3)), c);
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => draw(mCube, M(T(p.cx + a * 1.05, p.cy - 0.8, p.cz + b * 1.05), S(0.1, 1.5, 0.1)), c));
        [[0, -1.08, 2.2, 0.06], [0, 1.08, 2.2, 0.06], [-1.08, 0, 0.06, 2.2], [1.08, 0, 0.06, 2.2]].forEach(([a, b, sx, sz]) => draw(mCube, M(T(p.cx + a, p.cy - 1.25, p.cz + b), S(sx, 0.45, sz)), c));
        return;
      }
      draw(mCube, M(T(p.cx, p.cy - 0.8, p.cz), S(2.2, 1.6, 2.2)), CAB_COL[i % CAB_COL.length]);
      draw(mCube, M(T(p.cx, p.cy - 0.75, p.cz), S(2.26, 0.6, 1.6)), [0.6, 0.85, 1]);
    });
    drawCoaster(); drawHeli(); drawBus(); drawAnimals(); if (SHIP && save.sails === save.clock.day) draw(mSails, I(), W); drawSignals(); drawCars(SK.night);
    { const ak = P.state === 'akai' && P.ak ? { x: P.ak.x, z: P.ak.z, yaw: P.ak.yaw } : akaiIdle(); if (ak) drawAkai(ak.x, ak.z, ak.yaw); }
    { const bt = P.state === 'boat' && P.sb ? { x: P.sb.x, z: P.sb.z, yaw: P.sb.yaw } : seaIdle(); if (bt) drawBoat(bt.x, bt.z, bt.yaw); } if (P.state === 'hurt') drawAmb();
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
      const f = n.sit ? n.face : Math.hypot(P.x - n.x, P.z - n.z) < 8 ? Math.atan2(P.x - n.x, P.z - n.z) : 0;
      const b = person(n.x, n.y, n.z, f, n.col, n.sit ? 'sit' : 'stand', 0);
      if (n.mama) { part(b, 0, 1.45, -0.18, 0.56, 0.75, 0.2, C.hair); if (P.state === 'ground' && Math.hypot(P.x - n.x, P.z - n.z) < 4.5 && time - (P.waterT || -1e9) < 3) draw(mCube, M(b, T(0.36, 1.15, 0.35), S(0.14, 0.3, 0.14)), hex('#74c0fc')); }
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
    drawAo(); drawMom(); drawPapa(); drawFriends(); drawTrains();
    guideTick();
    if (save.dest && !FP[P.state]) { const g2 = save.dest, a = Math.atan2(g2.x - P.x, g2.z - P.z), bob = Math.sin(time * 4) * 0.12; draw(mArrow, M(T(P.x, P.y + 3.0 + bob, P.z), RY(a), S(0.9)), [1, 0.83, 0.1], 0.7); }

    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    drawWeather();
    puffs.forEach((p) => { const s = 0.3 + p.t * 0.9; draw(mSphere, M(T(p.x, p.y, p.z), S(s, p.w ? s * 0.4 : s, s)), p.w ? C.white : [0.78, 0.82, 0.35], 0.6, 0.55 * (1 - p.t / 1.3)); });
    const gy = { train: 1, akai: 1, boat: 1, bus: 1, climb: 1, ride: 1, coaster: 1, wheel: 1, heli: 1, hurt: 1 }[P.state] ? null : groundBelow(P.x, P.y, P.z);
    if (P.state === 'heli' || HELI.y > 1) { const hg = groundBelow(HELI.x, HELI.y + 0.2, HELI.z); if (HELI.y - hg < 60) draw(mDisc, M(T(HELI.x, hg + 0.04, HELI.z), S(2.6)), C.black, 1, 0.25); }
    if (gy !== null && P.y - gy < 30) draw(mDisc, M(T(P.x, gy + 0.03, P.z), S(0.45 * Math.max(0.4, 1 - (P.y - gy) / 30))), C.black, 1, 0.3);
    STARS.forEach((s) => {
      if (save.stars.includes(s.id)) return;
      const big = s.big;
      draw(mCube, M(T(s.x, s.y + 30, s.z), S(big ? 0.9 : 0.45, 60, big ? 0.9 : 0.45)), big ? C.gold : C.yellow, 1, big ? 0.32 : 0.2);
    });
    if (save.dest) { draw(mCube, M(T(save.dest.x, 40, save.dest.z), S(1.6, 80, 1.6)), [1, 0.8, 0.1], 1, 0.3 + 0.1 * Math.sin(time * 4)); draw(mDisc, M(T(save.dest.x, groundBelow(save.dest.x, 200, save.dest.z) + 0.06, save.dest.z), S(3)), [1, 0.8, 0.1], 1, 0.45); }
    DOORS.forEach((dd) => { if (dd.id === 'heli' && P.state === 'heli') return; draw(mCube, M(T(dd.x, (dd.y || 0) + 20, dd.z), S(0.8, 40, 0.8)), dd.color, 1, 0.14 + 0.06 * Math.sin(time * 3)); });
    { const hb = M(T(HELI.x, HELI.y, HELI.z), RY(HELI.yaw)); draw(mCube, M(hb, T(0, 1.55, 0.9), S(1.85, 0.95, 1.5)), [0.7, 0.88, 1], 0.2, 0.4); }
    { const bq = busPose(), bb = M(T(bq.x, 0, bq.z), RY(bq.yaw)); draw(mCube, M(bb, T(0, 2.05, 0.1), S(2.86, 0.8, 5.6)), [0.75, 0.9, 1], 0.2, 0.35); }
    gl.depthMask(true); gl.disable(gl.BLEND);

    drawTags(); placeMomTalk();
    { const b = $('papaTalk'); if (PAPA.sayT > 0) { const sp = PAPA.on ? project(PAPA.x, PAPA.y + 2.7, PAPA.z) : null; const ok = sp && sp[0] > 90 && sp[0] < innerWidth - 90 && sp[1] > 120 && sp[1] < innerHeight - 40; b.classList.toggle('fixed', !ok); if (ok) { b.style.left = sp[0] + 'px'; b.style.top = sp[1] + 'px'; } else { b.style.left = ''; b.style.top = ''; } } }
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

  const TAGS = [
    { t: '🗻 ふじさん', p: () => FUJI }, { t: '🌉 ベイブリッジ', p: () => BAYB }, { t: '🗼 マリンタワー', p: () => ({ x: MARINE.x, y: 28, z: MARINE.z }) },
    { t: '🏙️ よこはま えき', p: () => { const [x, z] = GEO(35.4658, 139.6223); return { x, y: 48, z }; } }, { t: '🗼 スカイツリー', p: () => TOKYO.sky },
    { t: '🏢 ランドマークタワー', p: () => ({ x: LMC.x, y: LMH + 3, z: LMC.z }) }, { t: '🎡 コスモクロック', p: () => ({ x: FW.cx, y: FW.hub + FW.R + 2, z: FW.cz }) },
  ];
  function drawTags() {
    const box = $('tags'), on = P.state === 'wheel' || P.state === 'heli' || (P.y > 30 && P.state !== 'ghost');
    if (!box._made) { box._made = true; TAGS.forEach((g) => { g.el = document.createElement('span'); g.el.className = 'tag'; g.el.textContent = g.t; box.appendChild(g.el); }); }
    const far = Math.min(3200, 350 + Math.max(0, eye[1]) * 28);
    TAGS.forEach((g) => {
      if (!on) { g.el.style.display = 'none'; return; }
      const q = g.p(), d = Math.hypot(q.x - eye[0], q.z - eye[2]), sp = d > 25 && d < far * 0.97 ? project(q.x, q.y, q.z) : null;
      if (!sp || sp[0] < 0 || sp[0] > innerWidth || sp[1] < 60 || sp[1] > innerHeight) { g.el.style.display = 'none'; return; }
      g.el.style.display = 'block'; g.el.style.left = sp[0] + 'px'; g.el.style.top = sp[1] + 'px';
    });
  }

  // ================= ちず =================
  const MAPB = (() => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; MAP.land.forEach(([a, b, c, d]) => { x0 = Math.min(x0, OX + a * CELL); z0 = Math.min(z0, OZ + b * CELL); x1 = Math.max(x1, OX + c * CELL); z1 = Math.max(z1, OZ + d * CELL); }); return { x0: x0 - 10, z0: z0 - 10, x1: x1 + 10, z1: z1 + 10 }; })();
  let mapBase = null;
  function drawMap() {
    const c = $('mapCv'), x = c.getContext('2d'), Wd = c.width, Hd = c.height;
    const sc = Math.min(Wd / (MAPB.x1 - MAPB.x0), Hd / (MAPB.z1 - MAPB.z0));
    const ox = (Wd - (MAPB.x1 - MAPB.x0) * sc) / 2, oz = (Hd - (MAPB.z1 - MAPB.z0) * sc) / 2;
    const px = (v) => ox + (v - MAPB.x0) * sc, pz = (v) => oz + (v - MAPB.z0) * sc;
    mapTf = { ox, oz, sc, x0: MAPB.x0, z0: MAPB.z0 };
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
    if (save.dest) {
      const g = save.dest; x.strokeStyle = '#f59f00'; x.lineWidth = 4; x.setLineDash([8, 6]); x.beginPath(); x.moveTo(px(P.x), pz(P.z)); x.lineTo(px(g.x), pz(g.z)); x.stroke(); x.setLineDash([]);
      x.font = '30px sans-serif'; x.textAlign = 'center'; x.fillText('🎯', px(g.x), pz(g.z) + 10);
      x.font = 'bold 15px sans-serif'; x.lineWidth = 4; x.strokeStyle = '#fff'; x.strokeText(g.name, px(g.x), pz(g.z) - 18); x.fillStyle = '#d9480f'; x.fillText(g.name, px(g.x), pz(g.z) - 18);
    }
    x.save(); x.translate(px(P.x), pz(P.z)); x.rotate(-P.face + Math.PI);
    x.fillStyle = '#2f6fe0'; x.strokeStyle = '#fff'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(0, -13); x.lineTo(9, 9); x.lineTo(0, 4); x.lineTo(-9, 9); x.closePath(); x.stroke(); x.fill();
    x.restore();
    x.font = '11px sans-serif'; x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,.9)'; x.fillText('© OpenStreetMap contributors', Wd - 6, Hd - 6);
    const box = $('stamps'); box.innerHTML = '';
    ZONES.forEach((z) => { const s = document.createElement('span'); s.textContent = (save.stamps.includes(z.id) ? '📍 ' : '') + z.name; if (save.stamps.includes(z.id)) s.className = 'got'; box.appendChild(s); });
  }

  // ================= いきさき あんない =================
  // ちずを タップ → いきさき。がめんの うえの やじるし と、あおちゃんの あたまの うえの やじるし、ひかりの はしら で しめす
  let mapTf = null;
  function setDest(d) {
    save.dest = d; store(); lastGuide = '';
    if (d) { momSay(`${d.name} に いこう！ きいろい やじるし の ほうだよ 🎯`, 3.5); SFX.tap(); }
    $('guide').hidden = !d; $('bDestX').hidden = !d;
  }
  let lastGuide = '';
  function guideTick() {
    const g = save.dest, el = $('guide');
    if (!g) { if (!el.hidden) el.hidden = true; return; }
    const dx = g.x - P.x, dz = g.z - P.z, d = Math.hypot(dx, dz);
    if (d < 7 && Math.abs(P.y - groundBelow(g.x, P.y + 1, g.z)) < 4) { banner(`🎯 ${g.name} に ついたよ！<small>ちずで つぎの いきさきを えらべるよ</small>`, 3); SFX.star(); momSay('ついたね！ じょうずに いけたね 👏', 3); setDest(null); return; }
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    const ang = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz) * 180 / Math.PI;
    const m = Math.round(d / 0.25), txt = m >= 1000 ? (m / 1000).toFixed(1) + 'キロ' : (Math.round(m / 10) * 10) + 'メートル';
    const word = Math.abs(ang) < 25 ? 'まっすぐ' : Math.abs(ang) > 150 ? 'うしろ' : ang > 0 ? 'みぎ' : 'ひだり';
    $('guideA').style.transform = `rotate(${ang.toFixed(0)}deg)`;
    const t = `${g.name} まで ${txt}・${word}`; if (t !== lastGuide) { lastGuide = t; $('guideT').textContent = t; }
    if (el.hidden) el.hidden = false;
  }
  $('mapCv').addEventListener('click', (e) => {
    if (!mapTf) return;
    const c = $('mapCv'), r = c.getBoundingClientRect(), cx = (e.clientX - r.left) * c.width / r.width, cy = (e.clientY - r.top) * c.height / r.height;
    let x = mapTf.x0 + (cx - mapTf.ox) / mapTf.sc, z = mapTf.z0 + (cy - mapTf.oz) / mapTf.sc, name = 'えらんだ ばしょ', best = 22 / mapTf.sc;
    const cand = ZONES.filter((q) => !q.ride && q.id !== 'lmtop').map((q) => ({ x: q.x, z: q.z, n: q.name }));
    cand.forEach((q) => { const dd = Math.hypot(q.x - x, q.z - z); if (dd < best) { best = dd; x = q.x; z = q.z; name = q.n; } });
    setDest({ x, z, name }); drawMap();
  });
  $('bDestX').addEventListener('click', () => { setDest(null); drawMap(); });
  $('bDestX').hidden = !save.dest;
  $('guide').addEventListener('click', () => openMap());

  // ================= がめん の きりかえ =================
  function show(id, on) { $(id).classList.toggle('show', on); }
  function stepOut() { if (curDoor) { const d = curDoor; P.x = d.x; P.z = d.z; P.y = 0; } P.vx = P.vz = 0; lastDoorId = '-'; }
  function enterKumon() {
    if (!window.Kumon) return;
    if (!kumonOpen()) { banner('✏️ くもんは きょうは おやすみ<small>かようび・きんようび の 14:00〜19:00</small>', 3); return; }
    SFX.door(); show('ovKumon', true); setPaused();
    window.Kumon.open({
      sfx: (n) => { if (n === 'drink') SFX.drink(); else if (n === 'tap') SFX.tap(); else if (n === 'ng') SFX.tired(); else if (n === 'good') SFX.star(); else if (n === 'pass') { SFX.big(); confetti(); } },
      onReward: (r) => {
        if (r.type === 'print') { calDone('kumon'); save.wallet[1000] = (save.wallet[1000] || 0) + 1; store(); refreshHud(); SFX.coin(); return 'ごほうびに 💴 1000えん もらった！（おさいふ ' + walletTotal().toLocaleString() + 'えん）'; }
        save.oni = Math.min(9, save.oni + 3); store(); refreshHud();
        return 'ごうかくの ごほうびに 🍙 おにぎり を 3こ もらった！';
      },
      onClose: () => { show('ovKumon', false); stepOut(); setPaused(); banner('🏫 また きてね！<small>いまは ' + window.Kumon.level + ' きょうざい</small>', 2); },
    });
  }
  function cupOpen() { const h = CLK.h; return CLK.wd !== 1 && h >= 10 && h < 18; }
  function nmOpen() { const h = CLK.h; return CLK.wd !== 0 && h >= 10 && h < 17; }
  function openShop(kind, arg) {
    if (!window.Shops) return;
    if (kind === 'cupnoodle' && !cupOpen()) { banner('🍜 カップヌードル ミュージアムは しまってるよ<small>10:00〜18:00 ・ かようび は おやすみ</small>', 3); return; }
    if (kind === 'hara' && !(CLK.wd !== 1 && CLK.wd !== 2 && CLK.h >= 10 && CLK.h < 17)) { banner('🚂 てつどう もけい の はくぶつかん は しまってるよ<small>10:00〜17:00 ・ かようび と すいようび は おやすみ（めやす）</small>', 3); return; }
    if (kind === 'nipponmaru' && !nmOpen()) { banner('⛵ にっぽんまるは しまってるよ<small>10:00〜17:00 ・ げつようび は おやすみ（めやす）</small>', 3); return; }
    SFX.door(); show('ovShop', true); setPaused();
    window.Shops.open(kind, {
      arg, wallet: Wallet, clock: clockStr(), trains: trainStations(), sailsToday: save.sails === save.clock.day, sfx: (n) => (SFX[n] ? SFX[n]() : SFX.tap()), tone, confetti,
      errand: save.errand, errandItems: ERR_ITEMS,
      reward: (r) => { if (r.errand) errandBought(r.errand); if (r.oni) save.oni = Math.min(9, save.oni + r.oni); if (r.full) { P.st = maxSt(); P.tired = false; } if (r.gas) P.gas = 1; if (r.sails) { save.sails = save.clock.day; momSay('ほが ぜんぶ ひらいたね！ そとから みてみよう ⛵', 4); } if (r.nikuman) momSay('ふーふー して たべてね。あついよ 🥟', 3); if (r.karaage) { save.karaage = (save.karaage || 0) + 1; momSay('からあげクン おいしいね！ ママにも ひとつ ちょうだい 😋', 4); } store(); refreshHud(); },
      onClose: (res) => {
        show('ovShop', false); setPaused(); refreshHud();
        if (res && res.go) { startAttraction(res.go); return; }
        if (res && res.jr) { startTrain(res.jr.li, res.jr.from, res.jr.to); return; }
        if (res && res.trainTo) { arriveTrain(res.trainTo.li, res.trainTo.si, 'ちかてつの でぐち から でたよ'); return; }
        if (res && res.ride !== undefined) { startRide(res.ride); return; }
        stepOut();
      },
    });
  }
  function anyOv() { return ['ovTitle', 'ovHow', 'ovMap', 'ovMenu', 'ovKumon', 'ovShop', 'ovHosp', 'ovPlace', 'ovSet'].some((i) => $(i).classList.contains('show')); }
  function setPaused() {
    paused = anyOv() || photoOn;
    if (paused) { joy.id = null; joy.x = joy.y = 0; inp.fart = false; inp.up = inp.down = false; $('joy').style.display = 'none'; if (P.farting) { P.farting = false; fartStop(); } }
  }
  function openMap() { drawMap(); show('ovMap', true); setPaused(); }
  $('money').parentElement.addEventListener('click', () => openShop('wallet'));
  $('bStart').addEventListener('click', () => { ac(); show('ovTitle', false); setPaused(); if (!save.seenTitle) { save.seenTitle = true; store(); banner('🧢 あおちゃんの だいぼうけん スタート！<small>おさいふに 5000えん。まずは ランドマークタワーへ</small>', 3.5); } });
  $('bHow1').addEventListener('click', () => { show('ovHow', true); });
  $('bHow2').addEventListener('click', () => { show('ovMenu', false); show('ovHow', true); });
  $('bHowOk').addEventListener('click', () => { show('ovHow', false); setPaused(); });
  $('bMap').addEventListener('click', openMap);
  $('bPhoto').addEventListener('click', () => { ac(); photoMode(true); });
  $('bShoot').addEventListener('click', () => { shootReq = true; });
  $('bPhotoX').addEventListener('click', () => photoMode(false));
  $('bAlbum').addEventListener('click', () => { photoMode(false); openPlace('album'); });
  $('bMapOk').addEventListener('click', () => { show('ovMap', false); setPaused(); });
  $('bMenu').addEventListener('click', () => { show('ovMenu', true); setPaused(); });
  function drawSet() {
    $('sVol').value = save.settings.vol; $('sCam').value = save.settings.cam;
    [['sBig', save.settings.big ? 1 : 0], ['sTalk', save.settings.talk], ['sSpeed', save.settings.speed], ['sGfx', save.settings.gfx], ['sProp', save.settings.prop]].forEach(([id, v]) => $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.v === +v)));
  }
  $('bSet').addEventListener('click', () => { show('ovMenu', false); drawSet(); show('ovSet', true); setPaused(); });
  $('bSetOk').addEventListener('click', () => { show('ovSet', false); setPaused(); });
  $('sVol').addEventListener('input', (e) => { save.settings.vol = +e.target.value; store(); applySettings(); SFX.tap(); });
  $('sCam').addEventListener('input', (e) => { save.settings.cam = +e.target.value; store(); });
  [['sBig', 'big'], ['sTalk', 'talk'], ['sSpeed', 'speed'], ['sGfx', 'gfx'], ['sProp', 'prop']].forEach(([id, k]) => $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; save.settings[k] = k === 'big' ? b.dataset.v === '1' : +b.dataset.v; store(); applySettings(); drawSet(); SFX.tap();
  }));
  applySettings();
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

  // ================= だい5だんかい: でんしゃに のる =================
  const ekiN = (n) => EKI_YOMI[n] || n;
  function trainStations() { return TRAINS.map((t) => ({ k: t.k, name: t.info.name, short: t.info.short, col: t.info.col, sub: t.info.sub, stops: t.stops.map((s) => ({ n: ekiN(s.n) })) })); }
  function arriveTrain(li, si, how) {
    const t = TRAINS[li], st = t && t.stops[si]; if (!st) return;
    P.x = st.door.x; P.z = st.door.z; P.y = 0; P.state = 'ground'; P.ground = true; P.vx = P.vy = P.vz = 0; P.tr = null; lastDoorId = 'eki_' + li + '_' + si;
    MOM.x = P.x + 1.2; MOM.z = P.z; MOM.y = 0; if (PAPA.on) { PAPA.x = P.x - 1.2; PAPA.z = P.z; }
    tone(660, 0.15, 'sine', 0.1); tone(880, 0.25, 'sine', 0.1, null, 0.18);
    banner(`${t.info.ic} ${ekiN(st.n)} に つきました<small>${t.info.short} ・ ${how || 'えきの そとに でたよ'}</small>`, 3); momSay('でんしゃ、たのしかったね 🚃', 3);
  }
  function startTrain(li, from, to) { // JR は そとが みえる ので 3D で はしる
    const t = TRAINS[li]; if (!t) return;
    const a = t.stops[from], b = t.stops[to];
    P.state = 'train'; P.tr = { li, s: a.s, to, dir: b.s > a.s ? 1 : -1, v: 0, wait: 1.5 }; P.vx = P.vy = P.vz = 0; P.glide = false; lastDoorId = '-';
    $('talk').style.display = 'none'; lastTalk = null; cam.dist = Math.max(cam.dist, 13);
    banner(`🚃 ${t.info.short} しゅっぱつ！<small>つぎは ${ekiN(b.n)}</small>`, 3);
    [0, 0.25, 0.5].forEach((d, i) => tone([784, 659, 523][i], 0.2, 'triangle', 0.07, null, d));
  }
  function trainUpdate(dt) {
    const r = P.tr, t = TRAINS[r.li], goal = t.stops[r.to].s;
    if (r.wait > 0) r.wait -= dt;
    else {
      const left = (goal - r.s) * r.dir, vmax = 13;
      r.v = left < 18 ? Math.max(1.5, Math.min(r.v, left * 0.7)) : Math.min(vmax, r.v + 3 * dt);
      r.s += r.v * r.dir * dt;
      if ((goal - r.s) * r.dir <= 0.05) { arriveTrain(r.li, r.to); return; }
      if (Math.random() < dt * r.v * 0.25) tone(90 + Math.random() * 20, 0.06, 'square', 0.025);
    }
    const q = t.at(r.s), y = t.yAt(r.s);
    P.x = q.x; P.z = q.z; P.y = y + 0.6; P.face = Math.atan2(q.ux * r.dir, q.uz * r.dir); P.speed = 0;
  }
  function drawTrainAt(t, s, dir) {
    const col = hex(t.info.col);
    for (let c = 0; c < 3; c++) {
      const sc = s - dir * c * 5.3, q = t.at(sc), y = t.yAt(sc), yaw = Math.atan2(q.ux, q.uz), b = M(T(q.x, y, q.z), RY(yaw));
      draw(mCube, M(b, T(0, 1.25, 0), S(2.6, 2.1, 5.0)), hex('#dee2e6'));
      draw(mCube, M(b, T(0, 1.55, 0), S(2.64, 0.7, 4.6)), [0.45, 0.62, 0.78]);
      draw(mCube, M(b, T(0, 0.85, 0), S(2.66, 0.28, 5.02)), col);
      draw(mCube, M(b, T(0, 2.35, 0), S(2.3, 0.12, 4.6)), hex('#adb5bd'));
      if (c === 0 || c === 2) draw(mCube, M(b, T(0, 1.55, (c === 0 ? 1 : -1) * dir * 2.51), S(1.8, 0.6, 0.04)), [0.25, 0.3, 0.38]);
    }
  }
  function drawTrains() {
    TRAINS.forEach((t) => {
      if (t.info.sub) return;
      if (P.state === 'train' && P.tr && P.tr.li === t.li) { drawTrainAt(t, P.tr.s + P.tr.dir * 1.5, P.tr.dir); return; }
      const T2 = t.total * 2, u = (time * 9) % T2, fwd = u < t.total;
      drawTrainAt(t, fwd ? u : T2 - u, fwd ? 1 : -1);
    });
  }

  // ================= パパ =================
  // どようび・にちようび（8じ〜20じ）と、へいじつ の よる（18:30〜21じ）は パパも いっしょ
  const PAPA = { on: false, x: 0, y: 0, z: 0, face: 0, phase: 0, speed: 0, sit: false, sayT: 0, talkT: 30, was: false };
  const PAPA_LINES = ['あおちゃん、パパと きょうそう しよう！ 🏃', 'でんしゃ みにいく？ パパは でんしゃが だいすき 🚃', 'おなか すいたら ちゅうかがいの にくまん たべよう 🥟', 'たかい ところは パパに まかせて… ちょっと こわいな 😅',
    'しゃしんを とろうか？ 📷 ボタンで パシャッ！', 'くもん がんばってて えらいね ✏️', 'みなとみらいは よる きらきら きれいだよ 🌃', 'パパの かたぐるま、たかいだろ〜！'];
  function papaWanted() { const h = CLK.h; return (CLK.wd >= 5 && h >= 8 && h < 20) || (CLK.wd < 5 && h >= 18.5 && h < 21); }
  function papaSay(t, sec) { PAPA.sayT = sec || 3.5; const b = $('papaTalk'); b.textContent = t; b.style.display = 'block'; }
  function papaUpdate(dt) {
    const p = PAPA, want = papaWanted();
    if (want && !p.on) { p.on = true; p.x = P.x - 2; p.z = P.z - 1; p.y = P.y; papaSay(CLK.wd >= 5 ? 'きょうは パパも おやすみ！ いっしょに あそぼう 🙌' : 'ただいま〜！ パパも まぜて 🙌', 3.5); }
    if (!want && p.on) { p.on = false; papaSay('パパは おしごとの じゅんび。またね 👋', 2.5); }
    if (p.sayT > 0) { p.sayT -= dt; if (p.sayT <= 0) $('papaTalk').style.display = 'none'; }
    if (!p.on) return;
    p.phase += dt * 6; p.talkT -= dt;
    if (p.talkT < 0 && p.sayT <= 0 && MOM.sayT <= 0 && save.settings.talk > 0) { p.talkT = (30 + Math.random() * 30) / save.settings.talk; papaSay(PAPA_LINES[(Math.random() * PAPA_LINES.length) | 0], 3.5); }
    const st = P.state;
    if ({ bus: 1, akai: 1, boat: 1, train: 1, ride: 1, wheel: 1 }[st]) { p.x = P.x - Math.cos(P.face) * 0.9; p.z = P.z + Math.sin(P.face) * 0.9; p.y = P.y; p.sit = true; p.face = P.face; return; }
    p.sit = false;
    const tx = P.x - Math.sin(P.face) * 0.6 - Math.cos(P.face) * 1.4, tz = P.z - Math.cos(P.face) * 0.6 + Math.sin(P.face) * 1.4;
    const ty = groundBelow(tx, Math.min(P.y, 2) + 0.6, tz), d = Math.hypot(tx - p.x, tz - p.z);
    if (d > 45 || Math.abs(p.y - ty) > 3) { p.x = tx; p.z = tz; p.y = ty; }
    const sp = d > 1.8 ? Math.min(12, 2.5 + d * 1.5) : 0;
    if (sp > 0) { const nx = p.x + (tx - p.x) / d * Math.min(d, sp * dt), nz = p.z + (tz - p.z) / d * Math.min(d, sp * dt); if (!blockedAt(nx, p.y + 0.05, nz)) { p.x = nx; p.z = nz; } else if (d > 8) { p.x = tx; p.z = tz; } p.face = Math.atan2(tx - p.x, tz - p.z); }
    else p.face = Math.atan2(P.x - p.x, P.z - p.z);
    p.speed = sp; p.y += (groundBelow(p.x, p.y + 0.6, p.z) - p.y) * Math.min(1, dt * 6);
    if (P.y - ty > 6 && !p.saidHigh) { p.saidHigh = true; papaSay('パパは したで みてるよ〜！ 👀', 2.5); } if (P.y - ty < 2) p.saidHigh = false;
  }
  function drawPapa() {
    if (!PAPA.on || P.state === 'ghost' || P.state === 'coaster' || P.state === 'heli') return;
    const pose = PAPA.sit ? 'sit' : PAPA.speed > 0.5 ? 'walk' : 'stand';
    const b = M(T(PAPA.x, PAPA.y - (PAPA.sit ? 0.17 : 0), PAPA.z), RY(PAPA.face), S(1.08));
    personAt(b, hex('#4dabf7'), pose, PAPA.phase, hex('#495057'), C.hair, false);
    part(b, -0.12, 1.53, 0.25, 0.14, 0.1, 0.02, C.black); part(b, 0.12, 1.53, 0.25, 0.14, 0.1, 0.02, C.black); // めがね
    part(b, 0, 1.53, 0.255, 0.1, 0.02, 0.02, C.black);
  }
  function personAt(base, shirt, pose, phase, pants, hair, girl) {
    const { lg, ar, al } = poseAngles(pose, phase);
    part(base, -0.13, 0.72, 0, 0.2, 0.72, 0.22, pants, RX(pose === 'sit' ? -1.45 : lg));
    part(base, 0.13, 0.72, 0, 0.2, 0.72, 0.22, pants, RX(pose === 'sit' ? -1.45 : -lg));
    part(base, 0, 0.98, 0, 0.56, 0.58, 0.36, shirt);
    part(base, -0.36, 1.24, 0, 0.16, 0.54, 0.18, shirt, RX(-al));
    part(base, 0.36, 1.24, 0, 0.16, 0.54, 0.18, shirt, RX(-ar));
    part(base, 0, 1.5, 0, 0.52, 0.48, 0.48, C.skin);
    part(base, 0, 1.56, -0.06, 0.55, 0.42, 0.42, hair);
    if (girl) { part(base, -0.3, 1.45, -0.05, 0.12, 0.3, 0.12, hair); part(base, 0.3, 1.45, -0.05, 0.12, 0.3, 0.12, hair); }
    part(base, -0.11, 1.5, 0.245, 0.07, 0.1, 0.02, C.black); part(base, 0.11, 1.5, 0.245, 0.07, 0.1, 0.02, C.black);
  }

  // ================= ともだち と かくれんぼ =================
  const FRIENDS = [
    { id: 'yuto', name: 'ゆうとくん', shirt: hex('#40c057'), hair: C.hair },
    { id: 'hana', name: 'はなちゃん', shirt: hex('#f06595'), hair: hex('#6b3e26'), girl: true },
    { id: 'sota', name: 'そうたくん', shirt: hex('#fab005'), hair: C.black },
  ];
  // こうえんで あそんで いる ばしょ
  const PARKS = [
    (() => { const q = POI['臨港パーク']; if (!q) return null; const f = freeSpot(q.x, q.z); return { id: 'rinko', name: 'りんこうパーク', x: f.x, z: f.z }; })(),
    YAMA ? (() => { const f = freeSpot(YAMA.x + 8, YAMA.z - 8); return { id: 'yama', name: 'やました こうえん', x: f.x, z: f.z }; })() : null,
  ].filter(Boolean);
  function friendsHere() { // ようちえんの じかん は ようちえんに いる
    const h = CLK.h; if (h < 9.5 || h >= 17.5) return null; if (CLK.wd < 5 && h < 15) return null;
    return PARKS[CLK.wd % PARKS.length];
  }
  let HS = null;
  const HSDOOR = { id: 'hs', r: 3, label: '🙈<br>かくれんぼ', color: hex('#7950f2'), get x() { const p = !HS && friendsHere(); return p ? p.x : 1e7; }, get z() { const p = !HS && friendsHere(); return p ? p.z : 1e7; }, run: () => startHS() };
  DOORS.push(HSDOOR);
  function hideScore(x, z) { let n = 0; for (let a = 0; a < 8; a++) if (blockedAt(x + Math.cos(a * 0.785) * 1.3, 0, z + Math.sin(a * 0.785) * 1.3)) n++; return n; }
  function startHS() {
    const park = friendsHere(); if (!park) return;
    const cand = [];
    for (let k = 0; k < 90; k++) {
      const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 26, f = freeSpot(park.x + Math.cos(a) * r, park.z + Math.sin(a) * r);
      if (Math.hypot(f.x - park.x, f.z - park.z) < 8 || Math.hypot(f.x - park.x, f.z - park.z) > 40) continue;
      cand.push({ x: f.x, z: f.z, sc: hideScore(f.x, f.z) + Math.random() * 1.5 });
    }
    cand.sort((a, b) => b.sc - a.sc);
    const spots = [];
    for (const c of cand) { if (spots.every((s) => Math.hypot(s.x - c.x, s.z - c.z) > 9)) spots.push(c); if (spots.length === 3) break; }
    while (spots.length < 3) spots.push({ x: park.x + (spots.length - 1) * 14, z: park.z + 12 });
    HS = { park, t: 0, phase: 'count', limit: 150, spots: spots.map((s, i) => ({ x: s.x, z: s.z, f: FRIENDS[i], found: false })), hintT: 22, giggleT: 4 };
    $('hsHud').hidden = false; SFX.tap();
    banner('🙈 かくれんぼ！ あおちゃんが おに<small>いーち、にー、さーん… みんなが かくれるまで まってね</small>', 4);
    momSay('ママも いっしょに さがすよ 🔍', 3);
  }
  function hsTick(dt) {
    if (!HS) return;
    HS.t += dt;
    if (HS.phase === 'count') {
      if (HS.t > 4) { HS.phase = 'seek'; HS.t = 0; banner('🗣️「もういいよー！」<small>3にんを さがそう。ちかくに いくと みつかるよ</small>', 3); tone(523, 0.2, 'sine', 0.08); tone(659, 0.3, 'sine', 0.08, null, 0.2); }
    } else {
      const left = HS.spots.filter((s) => !s.found);
      for (const s of left) if (Math.hypot(s.x - P.x, s.z - P.z) < 2.8 && Math.abs(P.y - 0) < 2.5) {
        s.found = true; SFX.stamp(); banner(`👀 ${s.f.name} みーつけた！<small>「みつかっちゃった〜！」</small>`, 2.4);
      }
      const rest = HS.spots.filter((s) => !s.found);
      if (!rest.length) {
        save.hs = (save.hs || 0) + 1; store(); confetti(); SFX.big && SFX.big();
        banner(`🏆 ぜんいん みつけた！ かくれんぼ めいじん<small>${Math.round(HS.t)}びょう で みつけたよ（${save.hs}かいめ）</small>`, 4); momSay('すごい！ あおちゃん さがすの じょうずだね 🏆', 3.5); endHS(); return;
      }
      if (HS.t > HS.limit) { banner('⏰ じかん ぎれ〜<small>みんな でてきたよ「ここに いたんだよ〜」</small>', 3.5); momSay('おしかったね。また あそぼう！', 3); endHS(); return; }
      HS.hintT -= dt; HS.giggleT -= dt;
      const near = rest.reduce((a, s) => (!a || Math.hypot(s.x - P.x, s.z - P.z) < Math.hypot(a.x - P.x, a.z - P.z) ? s : a), null), nd = Math.hypot(near.x - P.x, near.z - P.z);
      if (HS.giggleT < 0 && nd < 12) { HS.giggleT = 3; [0, 0.1, 0.2].forEach((d) => tone(1100 + Math.random() * 300, 0.06, 'sine', 0.04, null, d)); }
      if (HS.hintT < 0) {
        HS.hintT = 20;
        let a = Math.atan2(near.x - P.x, near.z - P.z) - (cam.yaw + Math.PI); while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2;
        const dir = Math.abs(a) < 0.8 ? 'まえ' : Math.abs(a) > 2.35 ? 'うしろ' : a > 0 ? 'ひだり' : 'みぎ';
        momSay(`${dir} の ほうから くすくす わらいごえが きこえるよ 👂${nd < 12 ? ' もう すぐ ちかく！' : ''}`, 4);
      }
      $('hsHud').textContent = `🙈 みつけた ${3 - rest.length}/3 ・ のこり ${Math.max(0, Math.ceil(HS.limit - HS.t))}びょう`;
    }
    if (HS && HS.phase === 'count') $('hsHud').textContent = `🙈 いーち、にー… ${Math.min(10, Math.ceil(HS.t * 2.5))}`;
  }
  function endHS() { HS = null; $('hsHud').hidden = true; lastDoorId = '-'; }
  function drawFriends() {
    const park = friendsHere();
    if (HS) {
      HS.spots.forEach((s, i) => {
        let x = s.x, z = s.z, pose = 'sit', y = -0.25;
        if (HS.phase === 'count') { const k = Math.min(1, HS.t / 3.5); x = HS.park.x + (s.x - HS.park.x) * k + i; z = HS.park.z + (s.z - HS.park.z) * k; pose = 'walk'; y = 0; }
        if (s.found) { x = P.x + Math.cos(time * 0.5 + i * 2.1) * 2.4; z = P.z + Math.sin(time * 0.5 + i * 2.1) * 2.4; pose = 'stand'; y = groundBelow(x, P.y + 0.6, z); }
        const b = M(T(x, y, z), RY(Math.atan2(P.x - x, P.z - z)), S(0.66));
        personAt(b, s.f.shirt, pose, time * 8, hex('#343a40'), s.f.hair, s.f.girl);
      });
      return;
    }
    if (!park || Math.abs(park.x - P.x) > 120 || Math.abs(park.z - P.z) > 120) return;
    FRIENDS.forEach((f, i) => {
      const a = time * 0.9 + i * 2.09, x = park.x + Math.cos(a) * 2.2, z = park.z + Math.sin(a) * 2.2;
      const b = M(T(x, Math.abs(Math.sin(time * 5 + i)) * 0.15, z), RY(a + Math.PI / 2 * (i % 2 ? 1 : -1) + Math.PI), S(0.66));
      personAt(b, f.shirt, 'walk', time * 9 + i, hex('#343a40'), f.hair, f.girl);
    });
  }

  // ================= しゃしん モード =================
  const PHOTO_KEY = 'minatomirai-bouken-photo-v1';
  let photos = []; try { const s = JSON.parse(localStorage.getItem(PHOTO_KEY)); if (Array.isArray(s)) photos = s; } catch (e) { /* つかえない */ }
  setTimeout(() => { $('photoN').textContent = photos.length; }, 0);
  const storePhotos = () => { try { localStorage.setItem(PHOTO_KEY, JSON.stringify(photos)); return true; } catch (e) { return false; } };
  function photoMode(on) {
    photoOn = on; document.body.classList.toggle('photo', on); $('photoUI').hidden = !on;
    if (on) { // みんな カメラの ほうを むく
      const f = cam.yaw; P.face = f; MOM.face = f; PAPA.face = f; banner('📷 しゃしん モード<small>みぎを なぞって アングルを きめて、まるい ボタンで パシャッ！</small>', 3);
    }
    setPaused();
  }
  function capturePhoto() {
    shootReq = false;
    try {
      const w = 360, h = Math.round(w * cv.height / cv.width), c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
      const g = c2.getContext('2d'); g.drawImage(cv, 0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(0, h - 22, w, 22); g.fillStyle = '#1c2b4a'; g.font = 'bold 13px sans-serif';
      g.fillText('📷 ' + clockStr() + ' ・ あおちゃんの だいぼうけん', 8, h - 7);
      const url = c2.toDataURL('image/jpeg', 0.72);
      photos.unshift({ url, t: clockStr() }); photos = photos.slice(0, 12);
      while (!storePhotos() && photos.length > 1) photos.pop();
      const fl = $('flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
      tone(1800, 0.04, 'square', 0.06); tone(900, 0.06, 'square', 0.05, null, 0.05);
      $('photoN').textContent = photos.length;
    } catch (e) { banner('📷 しゃしんが とれなかった…', 2); }
  }
  // ================= ループ =================
  refreshHud();
  let last = performance.now();
  const FPS = { t: 0, n: 0, done: false };
  function loop(now) {
    const last0 = last; const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!paused) {
      // うごきが おもい ときは がめんを かるく する（せってい で もどせる）
      if (!FPS.done) { FPS.t += now - last0; FPS.n++; if (FPS.t > 8000) { const fps = FPS.n / (FPS.t / 1000); FPS.done = true; if (fps < 24 && save.settings.gfx > 0 && !save.settings.gfxAuto) { save.settings.gfx--; save.settings.gfxAuto = 1; store(); banner('⚡ うごきを かるく したよ<small>せってい の「がめん」で もどせる</small>', 3.5); } } }
      const n = dt > 0.025 ? 2 : 1;
      for (let i = 0; i < n; i++) update(dt / n);
      bgm();
    }
    render(); if (shootReq) capturePhoto();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // テスト用の のぞき窓
  window.__mm = { HARAD, setDest, get mapTf() { return mapTf; }, TRAINS, PAPA, FRIENDS, friendsHere, startHS, get HS() { return HS; }, photoMode, get photos() { return photos; }, shoot: () => { shootReq = true; }, startTrain, arriveTrain, PARKS, GATES, NIKU, HIKAWA, YAMA, SHIP, KANTEI, MAZU, NMDOOR, CUPD, MARINE, AKAI, SEA, CARS, CARG, rideAkai, rideSea, weatherNow, calDone, XINGS, SIGS, onRoad, pedGreen, TR, ZOO, CLK, startErrand, skyNow, setTime: (h, d) => { save.clock.min = h * 60; if (d !== undefined) save.clock.day = d; }, KONBINI, SLIDE, startSlide, BUS, BUSR, STOP, YDOOR, HOMEDOOR, startBus, openPlace, MOM, momSay, HELI, CO, GHM, GH, FW, HOSP, MAMA, GEO, startAttraction, heliEnter, hurt, look, P, get save() { return save; }, cam, STARS, solids, inp, keys, update, DOORS, POI, CAB, ZONES, START, startRide, openShop, near, set paused(v) { paused = v; } };
})();
