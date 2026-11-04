'use strict';
/* あおちゃんの みなとみらい だいぼうけん
   WebGL だけで かいた 3D の たんけん ゲーム（がいぶ ライブラリ なし）
   せかいは ぜんぶ 「じくに そった はこ（AABB）」で できていて、
   その はこが そのまま あたりはんてい・よじのぼれる かべ に なる。 */
(function () {
  const $ = (id) => document.getElementById(id);
  const cv = $('cv');
  const gl = cv.getContext('webgl', { antialias: true }) || cv.getContext('experimental-webgl');
  if (!gl) { $('nogl').hidden = false; return; }

  // ================= セーブ =================
  const SAVE_KEY = 'minatomirai-bouken-v1';
  const START = { x: -36, y: 0, z: 56, yaw: 0 };
  function fresh() { return { stars: [], stamps: [], oni: 2, bal: 1, pos: null, sound: true, seenTitle: false }; }
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

  // ================= せかい =================
  const WATER = -0.6;
  const solids = [];   // あたる はこ
  const mapBoxes = []; // ちずに かく たてもの
  const LAND = [];
  const G = new Geo();
  function B(x0, y0, z0, x1, y1, z1, col, k, top, opt) {
    G.box(x0, y0, z0, x1, y1, z1, col, k, top);
    const b = { x0, y0, z0, x1, y1, z1, climb: !(opt && opt.noclimb) };
    solids.push(b);
    if (y1 - y0 > 1.5 && y1 > 2 && !(opt && opt.nomap)) mapBoxes.push({ x0, z0, x1, z1, col });
    return b;
  }
  function land(x0, z0, x1, z1, top) {
    B(x0, -4, z0, x1, 0, z1, C.wall, 0, top || C.land, { nomap: true });
    LAND.push({ x0, z0, x1, z1, col: top || C.land });
  }
  function flat(x0, z0, x1, z1, y, col, k) { G.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, 1, 0], col, k || 0); }
  function tree(x, z, y, s) {
    y = y || 0; s = s || 1;
    G.cyl(x, y, z, 0.22 * s, 1.3 * s, 6, C.trunk);
    G.cone(x, y + 1.0 * s, z, 1.3 * s, 2.0 * s, 7, C.leaf);
    G.cone(x, y + 2.1 * s, z, 0.95 * s, 1.6 * s, 7, C.leaf2);
  }

  // --- じめん ---
  land(-110, -60, -8, 100);       // ランドマーク・さくらぎちょう がわ
  land(-110, -100, 32, -60);      // ミッドスクエア・マークイズ がわ（きた）
  land(-8, -60, 32, 0);           // クイーンズ がわ
  land(12, 0, 32, 100);           // ドックの ひがし
  land(-8, 45, 12, 100);          // ドックの みなみ
  land(32, -95, 92, -15);         // パシフィコ・りんこうパーク
  flat(32, -95, 92, -64, 0.01, C.grass, 4); LAND.push({ x0: 32, z0: -95, x1: 92, z1: -64, col: C.grass }); // りんこうパークの しばふ
  land(46, 8, 125, 105);          // しんこう（コスモワールド・あかレンガ）
  land(110, 105, 185, 125);       // やました がわ
  // うみ
  G.quad([-700, WATER, -700], [900, WATER, -700], [900, WATER, 900], [-700, WATER, 900], [0, 1, 0], C.water, 2);

  // --- みち ---
  flat(-110, -12, 32, -6, 0.02, C.road); flat(-110, -9.15, 32, -8.85, 0.03, C.line);
  flat(-16, -100, -10, 100, 0.02, C.road); flat(-110, -66, 32, -61, 0.02, C.road); flat(-110, -63.65, 32, -63.35, 0.03, C.line);
  flat(-110, 48, 12, 53, 0.02, C.road);
  flat(46, 78, 125, 82, 0.02, C.road);
  flat(58, 8, 63, 105, 0.02, C.road);

  // --- きしゃみち（はし）---
  B(32, -1, 57, 46, 0, 61, C.wood, 0, C.wood, { nomap: true });
  LAND.push({ x0: 32, z0: 57, x1: 46, z1: 61, col: C.wood });
  for (let x = 33; x <= 45; x += 3) {
    G.beam([x, 0, 57.2], [x + 1.5, 2.6, 57.2], 0.12, C.red); G.beam([x + 3, 0, 57.2], [x + 1.5, 2.6, 57.2], 0.12, C.red);
    G.beam([x, 0, 60.8], [x + 1.5, 2.6, 60.8], 0.12, C.red); G.beam([x + 3, 0, 60.8], [x + 1.5, 2.6, 60.8], 0.12, C.red);
  }
  G.beam([32, 2.6, 57.2], [46, 2.6, 57.2], 0.12, C.red); G.beam([32, 2.6, 60.8], [46, 2.6, 60.8], 0.12, C.red);
  // パシフィコ → しんこう の はし
  B(60, -1, -15, 64, 0, 8, C.land, 0, C.land, { nomap: true });
  LAND.push({ x0: 60, z0: -15, x1: 64, z1: 8, col: C.land });

  // --- ランドマークタワー ---
  const LM = { cx: -30, cz: 8 };
  const tiers = [[0, 20, 8], [20, 40, 7], [40, 54, 6], [54, 60, 5]];
  tiers.forEach(([y0, y1, h]) => B(LM.cx - h, y0, LM.cz - h, LM.cx + h, y1, LM.cz + h, C.landmark, 1, C.lmTop));
  B(LM.cx - 3.5, 60, LM.cz - 3.5, LM.cx + 3.5, 61.6, LM.cz + 3.5, C.lmTop, 0, hex('#8d8676'));
  G.cyl(LM.cx, 61.6, LM.cz, 2.6, 0.05, 16, C.yellow); // ヘリポートの まる
  // ひとやすみ バルコニー（かべの でっぱり）
  [[12, 8], [30, 7], [47, 6]].forEach(([y, h]) => {
    const e = 1.3, t = 0.5;
    B(LM.cx - h - e, y - t, LM.cz - h - e, LM.cx + h + e, y, LM.cz - h, C.white, 0, C.white, { nomap: true });
    B(LM.cx - h - e, y - t, LM.cz + h, LM.cx + h + e, y, LM.cz + h + e, C.white, 0, C.white, { nomap: true });
    B(LM.cx - h - e, y - t, LM.cz - h, LM.cx - h, y, LM.cz + h, C.white, 0, C.white, { nomap: true });
    B(LM.cx + h, y - t, LM.cz - h, LM.cx + h + e, y, LM.cz + h, C.white, 0, C.white, { nomap: true });
  });
  // ランドマークプラザ
  B(-44, 0, 16, -14, 7, 38, hex('#e2dccf'), 1, hex('#c7c0b0'));
  flat(-40, 22, -18, 34, 7.02, hex('#a5d8ff'));
  // ドックヤードガーデン の ふち
  B(-14, 0, 40, -8, 1.2, 44, C.wall, 0, C.wall, { nomap: true });

  // --- マークイズ みなとみらい（めじるし）---
  B(-33, 0, -44, -11, 7, -26, hex('#f1e3c8'), 1, hex('#c9b896'));
  G.box(-33.02, 5.4, -44.02, -10.98, 6.2, -25.98, hex('#ff922b'));
  // --- みなとみらいミッドスクエア（くもん みなとみらい きょうしつ は 3かい）---
  // ばしょ: よこはましにしく みなとみらい4ちょうめ7-1。ランドマークタワーの やく 110m にし・410m きた
  //（こくどちりいん の じゅうしょけんさく で たしかめた いち を、この せかいの しゅくしゃく に なおした）
  const KUMON = { x: -51, z: -66.6, door: { x0: -52.4, x1: -49.6 } };
  B(-57, 0, -80, -45, 6, -68, hex('#e9ecef'), 1, hex('#ced4da')).door = KUMON.door; // いりぐちの ところは のぼらない
  B(-55.5, 6, -78.5, -46.5, 34, -70.5, hex('#dde3ea'), 1, hex('#adb5bd'));
  G.box(-57.03, 4, -80.03, -44.97, 5.6, -67.97, hex('#74c0fc'));          // 3かい（きょうしつ）の まど
  G.box(-52.4, 0, -68.06, -49.6, 2.7, -67.9, hex('#20b26b'));             // いりぐち
  G.box(-53.6, 2.9, -68.4, -48.4, 3.15, -67.6, hex('#2b8a3e'));           // ひさし
  G.box(-53, 3.3, -68.12, -49, 3.9, -67.9, C.white);                      // かんばん
  [[-60, -70], [-60, -78], [-42, -70], [-42, -78]].forEach(([x, z]) => tree(x, z));
  // --- さくらぎちょう えき ---
  B(-48, 0, 64, -24, 4.5, 74, C.white, 1, hex('#5c6b7a'));
  B(-50, 4.5, 63, -22, 5, 75, hex('#5c6b7a'), 0, hex('#495057'), { nomap: true });

  // --- エアキャビン の えき と かいだん ---
  const AC1 = { x0: -22, x1: -14 }, AC2 = { x0: 50, x1: 58 }, ACY = 12, ACZ = [62.5, 67.5];
  B(AC1.x0, 0, 60, AC1.x1, ACY, 70, hex('#dee2e6'), 1, hex('#ced4da'));
  B(AC2.x0, 0, 60, AC2.x1, ACY, 70, hex('#dee2e6'), 1, hex('#ced4da'));
  for (let i = 0; i < 23; i++) {
    const top = ACY - 0.5 * (i + 1);
    B(-22, 0, 70 + i, -19, top, 71 + i, hex('#adb5bd'), 0, hex('#ced4da'), { nomap: true });
    B(55, 0, 70 + i, 58, top, 71 + i, hex('#adb5bd'), 0, hex('#ced4da'), { nomap: true });
  }
  B(17, 0, 64, 19, 16, 66, C.white, 0, C.gray); // まんなかの はしら
  G.beam([17, 15.5, 62.5], [19, 15.5, 67.5], 0.3, C.white);
  ACZ.forEach((z) => G.beam([-18, 14, z], [54, 14, z], 0.06, C.navy));

  // --- にっぽんまる（ドックの ふね）---
  B(-1, -2, 6, 5, 2, 40, C.white, 0, C.wood);
  B(0, -2, 40, 4, 2, 44, C.white, 0, C.wood);
  B(0.5, 2, 30, 3.5, 3.6, 36, C.white, 0, hex('#ced4da'));
  G.box(-1.03, -0.4, 5.97, 5.03, 0.2, 40.03, hex('#1c3f8f')); // ふなばたの せん
  const MASTS = [12, 19, 26, 33];
  MASTS.forEach((mz, i) => {
    const h = i === 1 ? 22 : 19;
    B(1.7, 2, mz - 0.3, 2.3, h, mz + 0.3, C.tan, 0, C.tan, { nomap: true });
    [h - 12, h - 8, h - 4].forEach((y, j) => G.box(-2.5 + j * 0.7, y, mz - 0.12, 6.5 - j * 0.7, y + 0.24, mz + 0.12, C.tan));
  });
  G.beam([2, 22, 19], [2, 2, 44], 0.04, C.navy); G.beam([2, 19, 12], [2, 2, 6], 0.04, C.navy);
  // わたる はしご（タラップ）
  for (let i = 0; i < 4; i++) B(-8 + i * 1.75, 0, 22.5, -6.25 + i * 1.75, 0.5 * (i + 1), 24.5, C.wood, 0, C.wood, { nomap: true });

  // --- クイーンズスクエア ---
  B(-5, 0, -25, 31, 5, -17, hex('#dfe6ec'), 1, hex('#b8c4cc'));
  B(-5, 0, -38, 5, 34, -25, C.glass, 1, hex('#7b8f9e'));
  B(8, 0, -36, 18, 30, -25, C.glass, 1, hex('#7b8f9e'));
  B(21, 0, -34, 31, 26, -25, C.glass, 1, hex('#7b8f9e'));
  B(-4, 34, -37, 4, 35.5, -26, hex('#7b8f9e'));

  // --- パシフィコよこはま ---
  B(40, 0, -62, 66, 5, -46, C.white, 1, hex('#a5d8ff'));
  B(42, 5, -60, 64, 6, -48, hex('#d0ebff'), 0, hex('#d0ebff'), { nomap: true });
  // ホテル（ほの かたち）
  for (let i = 0; i < 8; i++) {
    const y0 = i * 4, y1 = y0 + 4, inset = i * i * 0.1;
    B(68 + inset, y0, -28, 82 - inset * 0.4, y1, -22, C.hotel, 1, C.white, i ? { nomap: true } : undefined);
  }
  // りんこうパーク の おか と き
  B(52, 0, -88, 68, 1.5, -72, C.grass, 4, C.grass, { nomap: true });
  B(55, 1.5, -85, 65, 3, -75, C.grass, 4, C.grass, { nomap: true });
  B(58, 3, -82, 62, 4.5, -78, C.grass, 4, C.grass, { nomap: true });
  [[36, -70], [40, -88], [46, -76], [72, -90], [78, -70], [86, -84], [84, -74], [44, -68], [74, -80], [88, -66], [36, -82], [50, -92]].forEach(([x, z]) => tree(x, z));
  [[-60, -20], [-56, -20], [-52, -20], [-48, -20], [-60, 0], [-60, 10], [-60, 20], [-6, 50], [0, 50], [6, 50], [20, 30], [20, 40], [26, 10], [26, 20], [40, -20], [48, -20], [56, -20], [100, 20], [110, 20], [118, 40], [118, 60], [70, 100], [80, 100], [130, 112], [150, 112], [160, 112]].forEach(([x, z]) => tree(x, z));

  // --- コスモクロック21（かんらんしゃ）---
  const FW = { cx: 70, cz: 25, hub: 17.5, R: 16, N: 16, period: 80 };
  B(69, 0, 21.8, 71, FW.hub + 1, 23.2, C.white, 0, C.white, { nomap: true });
  B(69, 0, 26.8, 71, FW.hub + 1, 28.2, C.white, 0, C.white, { nomap: true });
  B(69, FW.hub - 1, 21.8, 71, FW.hub + 1, 28.2, C.white, 0, C.white, { nomap: true });
  B(60, 0, 23.3, 80, 0.5, 26.7, hex('#ffe066'), 0, hex('#ffe066'), { nomap: true });
  G.beam([63, 0, 22.5], [70, FW.hub, 22.5], 0.4, C.white); G.beam([77, 0, 22.5], [70, FW.hub, 22.5], 0.4, C.white);
  G.beam([63, 0, 27.5], [70, FW.hub, 27.5], 0.4, C.white); G.beam([77, 0, 27.5], [70, FW.hub, 27.5], 0.4, C.white);
  mapBoxes.push({ x0: 54, z0: 23, x1: 86, z1: 27, col: C.white });
  // コスモワールドの ちいさな のりもの（かざり）
  B(84, 0, 12, 96, 3, 20, hex('#ffa8a8'), 0, hex('#ff6b6b'));
  B(98, 0, 12, 108, 4, 22, hex('#a5d8ff'), 0, hex('#4dabf7'));

  // --- カップヌードルミュージアム / ワールドポーターズ ---
  B(78, 0, 40, 96, 9, 52, C.white, 1, hex('#dee2e6'));
  G.box(77.98, 6.5, 39.98, 96.02, 7.6, 52.02, C.red);
  B(66, 0, 60, 90, 8, 76, C.beige, 1, hex('#ced4da'));

  // --- あかレンガそうこ ---
  B(92, 0, 82, 118, 7, 88, C.brick, 3, C.roofG);
  B(92, 0, 94, 122, 7, 100, C.brick, 3, C.roofG);
  G.box(91.8, 7, 81.8, 118.2, 7.3, 88.2, hex('#5c6b70')); G.box(91.8, 7, 93.8, 122.2, 7.3, 100.2, hex('#5c6b70'));

  // --- おおさんばし ---
  B(128, 0, 121, 144, 0.5, 125, C.wood, 0, C.wood, { nomap: true });
  B(128, -4, 125, 144, 1, 190, C.wall, 0, C.wood);
  LAND.push({ x0: 128, z0: 125, x1: 144, z1: 190, col: C.wood });
  B(131, 1, 140, 141, 2.2, 175, C.grass, 4, C.grass, { nomap: true });
  // マリンタワー（かざり）
  B(168, 0, 113, 172, 3, 117, C.white);
  G.cyl(170, 3, 115, 1.6, 26, 10, C.red, 0, 0.9); G.cyl(170, 29, 115, 2.4, 2, 10, C.white);
  // ベイブリッジ（とおくの かざり）
  G.box(220, -1, 175, 226, 30, 181, C.white); G.box(220, -1, 255, 226, 30, 261, C.white);
  G.box(221, 10, 120, 225, 11.5, 320, C.white);
  for (let z = 120; z <= 320; z += 8) {
    const towerZ = z < 218 ? 178 : 258; const dz = Math.abs(z - towerZ);
    if (dz > 2) G.beam([223, 11.5, z], [223, 30 - Math.min(dz, 60) * 0.25, towerZ + Math.sign(z - towerZ) * 2], 0.06, C.white);
  }
  // うみの ブイ
  B(99, -2, -41, 101, 0.6, -39, C.red, 0, C.white, { nomap: true });

  // ================= うごく あしば（かんらんしゃ・ゴンドラ）=================
  const plats = [];
  function plat(hx, hz) { const p = { hx, hz, cx: 0, cy: 0, cz: 0, dx: 0, dy: 0, dz: 0, init: false, x0: 0, x1: 0, z0: 0, z1: 0, y1: 0 }; plats.push(p); return p; }
  function setPlat(p, cx, top, cz) {
    if (p.init) { p.dx = cx - p.cx; p.dy = top - p.cy; p.dz = cz - p.cz; } p.init = true;
    if (Math.abs(p.dx) + Math.abs(p.dz) > 1.5) { p.dx = p.dy = p.dz = 0; } // レーンの のりかえは はこばない
    p.cx = cx; p.cy = top; p.cz = cz; p.x0 = cx - p.hx; p.x1 = cx + p.hx; p.z0 = cz - p.hz; p.z1 = cz + p.hz; p.y1 = top;
  }
  const cabins = []; for (let i = 0; i < FW.N; i++) cabins.push(plat(1.1, 1.1));
  const gondolas = []; for (let i = 0; i < 8; i++) gondolas.push(plat(1.15, 1.15));
  const CAB_COL = [C.red, C.yellow, C.teal, C.purple, C.orange, C.blue, C.pink, C.green];
  function updatePlats(t) {
    cabins.forEach((p, i) => {
      const a = t * Math.PI * 2 / FW.period + i * Math.PI * 2 / FW.N;
      setPlat(p, FW.cx + Math.cos(a) * FW.R, FW.hub + Math.sin(a) * FW.R, FW.cz);
    });
    gondolas.forEach((p, i) => {
      const u = ((t / 70 + i / gondolas.length) % 1 + 1) % 1;
      const xs = -18, xe = 54;
      if (u < 0.5) setPlat(p, xs + (xe - xs) * u * 2, ACY, ACZ[0]);
      else setPlat(p, xe - (xe - xs) * (u - 0.5) * 2, ACY, ACZ[1]);
    });
  }

  // ================= ほし・アイテム・ひと・ばしょ =================
  const STARS = [
    { id: 'lm-top', x: LM.cx, y: 63.4, z: LM.cz, big: true },
    { id: 'lm-30', x: LM.cx, y: 31.2, z: LM.cz + 7.9 },
    { id: 'plaza', x: -18, y: 8.2, z: 36 },
    { id: 'queens', x: 0, y: 36.8, z: -31.5 },
    { id: 'mast', x: 2, y: 23.3, z: 19 },
    { id: 'fw-hub', x: 70, y: FW.hub + 2.3, z: 25 },
    { id: 'fw-top', x: 70, y: FW.hub + FW.R + 1.1, z: 25 },
    { id: 'cup', x: 87, y: 10.3, z: 46 },
    { id: 'brick', x: 105, y: 8.6, z: 85 },
    { id: 'pier', x: 136, y: 2.3, z: 187 },
    { id: 'buoy', x: 100, y: 1.9, z: -40 },
    { id: 'hotel', x: 74, y: 33.3, z: -25 },
    { id: 'pacifico', x: 53, y: 7.3, z: -54 },
    { id: 'hill', x: 60, y: 5.8, z: -80 },
    { id: 'cable', x: 18, y: 17.3, z: 65 },
    { id: 'station', x: -36, y: 6.3, z: 69 },
    { id: 'porters', x: 78, y: 9.3, z: 68 },
  ];
  $('starT').textContent = STARS.length;
  const PICKS = [
    { t: 'oni', x: -30, y: 0.8, z: 50 }, { t: 'oni', x: -20, y: 7.8, z: 20 }, { t: 'oni', x: LM.cx - 7.9, y: 30.8, z: LM.cz },
    { t: 'oni', x: LM.cx + 6.8, y: 47.8, z: LM.cz }, { t: 'oni', x: 105, y: 0.8, z: 91 }, { t: 'oni', x: 13, y: 5.8, z: -21 },
    { t: 'oni', x: 80, y: 0.8, z: 56 }, { t: 'oni', x: 136, y: 1.8, z: 130 }, { t: 'oni', x: 2, y: 2.8, z: 28 },
    { t: 'bal', x: 64, y: 0.8, z: 32 }, { t: 'bal', x: 67, y: 0.8, z: 32 }, { t: 'bal', x: 60, y: 0.8, z: -70 },
    { t: 'bal', x: -38, y: 0.8, z: 50 }, { t: 'bal', x: 15, y: 0.8, z: -14 }, { t: 'bal', x: 120, y: 0.8, z: 115 },
  ].map((p) => Object.assign(p, { took: -1e9 }));
  const NPCS = [
    { x: -32, z: 52, y: 0, col: C.orange, who: 'えきの おにいさん', say: 'あおちゃん！ ランドマークタワーの てっぺんに きんいろの ほしが あるんだって。かべに むかって すすむと よじのぼれるよ！' },
    { x: -24, z: 30, y: 7, col: C.pink, who: 'おねえさん', say: 'みどりの わが へったら、しろい でっぱりで ひとやすみ。🍙 を たべると げんき まんたん！' },
    { x: -10, z: 18, y: 0, col: C.teal, who: 'ふなのりさん', say: 'にっぽんまるの まんなかの マストの うえに ほしが ひかっているよ。はしごで ふねに のれるよ。' },
    { x: 62, z: 31, y: 0, col: C.purple, who: 'かんらんしゃの ひと', say: 'きいろい だいから はこの やねに とびのってごらん。そらの てっぺんまで はこんでくれるよ。' },
    { x: -17, z: 95, y: 0, col: C.green, who: 'えきいんさん', say: 'かいだんを のぼると エアキャビン！ ゴンドラの やねに のって うみを わたれるよ。' },
    { x: 104, z: 91, y: 0, col: C.red, who: 'パンやさん', say: 'たかい ところから とびおりたら、そらで もういちど ジャンプ！ かさで ふわふわ とべるよ ☂️' },
    { x: 136, z: 178, y: 1, col: C.yellow, who: 'つりびと', say: 'うみに おちても およげるよ。かべに むかって およぐと よじのぼれるんだ。' },
    { x: -40, z: -52, y: 0, col: C.orange, who: 'おかあさん', say: 'くもんの みなとみらい きょうしつは、ミッドスクエアの 3かい。みどりの いりぐちから はいれるよ ✏️' },
    { x: 54, z: -40, y: 0, col: C.blue, who: 'ガイドさん', say: 'ふうせん 🎈 を つかうと そらに ぷかぷか うかぶよ。ホテルの てっぺんにも ほしが あるみたい。' },
  ];
  const ZONES = [
    { id: 'sakuragicho', name: 'さくらぎちょう えき', x: -36, z: 66, r: 14 },
    { id: 'landmark', name: 'ランドマークタワー', x: LM.cx, z: LM.cz + 4, r: 20 },
    { id: 'lmtop', name: 'ランドマークの てっぺん', x: LM.cx, z: LM.cz, r: 10, minY: 59 },
    { id: 'nipponmaru', name: 'にっぽんまる', x: 2, z: 24, r: 14 },
    { id: 'queens', name: 'クイーンズスクエア', x: 13, z: -28, r: 18 },
    { id: 'pacifico', name: 'パシフィコよこはま', x: 60, z: -40, r: 22 },
    { id: 'rinko', name: 'りんこうパーク', x: 60, z: -80, r: 20 },
    { id: 'cosmo', name: 'コスモクロック21', x: 70, z: 25, r: 18 },
    { id: 'cupnoodle', name: 'カップヌードル ミュージアム', x: 87, z: 46, r: 12 },
    { id: 'aircabin', name: 'エアキャビン', x: 18, z: 65, r: 40, minY: 9, rect: [-14, 60, 50, 70] },
    { id: 'kishamichi', name: 'きしゃみち', x: 39, z: 59, r: 8 },
    { id: 'akarenga', name: 'あかレンガそうこ', x: 106, z: 91, r: 18 },
    { id: 'osanbashi', name: 'おおさんばし', x: 136, z: 160, r: 32 },
    { id: 'kumon', name: 'くもん みなとみらい きょうしつ', x: -51, z: -70, r: 9 },
  ];
  $('stampT').textContent = ZONES.length;

  const staticMesh = G.upload();

  // ================= うごく もの の かたち =================
  function mk(f) { const g = new Geo(); f(g); return g.upload(); }
  const W = [1, 1, 1];
  const mCube = mk((g) => g.box(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, W));
  const mStar = mk((g) => g.star(0.8, 0.36, 0.28, W));
  const mSphere = mk((g) => g.sphere(0, 0, 0, 1, 7, W));
  const mDisc = mk((g) => g.cyl(0, 0, 0, 1, 0.02, 16, W));
  const mUmb = mk((g) => { g.cone(0, 0, 0, 1.25, 0.6, 8, hex('#74c0fc'), C.white); g.cyl(0, -1.1, 0, 0.04, 1.75, 5, C.navy); });
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
  const mWheel = mk((g) => {
    const R = FW.R, n = 48;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      g.beam([Math.cos(a0) * R, Math.sin(a0) * R, 0], [Math.cos(a1) * R, Math.sin(a1) * R, 0], 0.25, C.white);
      g.beam([Math.cos(a0) * (R - 1.4), Math.sin(a0) * (R - 1.4), 0], [Math.cos(a1) * (R - 1.4), Math.sin(a1) * (R - 1.4), 0], 0.15, hex('#a5d8ff'));
    }
    for (let i = 0; i < FW.N; i++) { const a = i / FW.N * Math.PI * 2; g.beam([0, 0, 0], [Math.cos(a) * R, Math.sin(a) * R, 0], 0.08, C.white); }
  });
  const mClock = mk((g) => {
    for (let i = 0; i < 24; i++) {
      const a0 = i / 24 * Math.PI * 2, a1 = (i + 1) / 24 * Math.PI * 2;
      g.tri([0, 0, 0], [Math.cos(a0) * 3, Math.sin(a0) * 3, 0], [Math.cos(a1) * 3, Math.sin(a1) * 3, 0], [0, 0, 1], hex('#0b7285'), 0);
    }
  });

  // ================= あおちゃん =================
  const R = 0.35, H = 1.5, STEP = 0.55, GRAV = 26, JUMP = 9.2;
  const P = {
    x: START.x, y: START.y, z: START.z, vx: 0, vy: 0, vz: 0, yaw: Math.PI, face: Math.PI,
    state: 'ground', wall: null, plat: null, glide: false, bal: 0, boost: 0, cool: 0,
    st: 1, tired: false, phase: 0, speed: 0, ground: true,
  };
  function maxSt() { return 1 + save.stars.filter((s) => s !== 'lm-top').length * 0.12 + (save.stars.includes('lm-top') ? 0.3 : 0); }
  if (save.pos) { P.x = save.pos.x; P.y = save.pos.y; P.z = save.pos.z; }
  P.st = maxSt();

  function hits(b, x, y, z) {
    const e = 1e-4;
    return x + R > b.x0 + e && x - R < b.x1 - e && y + H > b.y0 + e && y < b.y1 - e && z + R > b.z0 + e && z - R < b.z1 - e;
  }
  function anyHit(x, y, z) { for (const b of solids) if (hits(b, x, y, z)) return b; return null; }
  function moveH(axis, d, canStep) {
    if (!d) return null;
    P[axis] += d; let hit = null;
    for (const b of solids) {
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
    for (const b of solids) {
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
  const inp = { mx: 0, my: 0, jump: false, let: false };
  const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
  const cam = { yaw: 0, pitch: 0.32, dist: 9, id: null, lx: 0, ly: 0 };
  let paused = true;
  addEventListener('keydown', (e) => {
    if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); return; }
    keys[e.code] = true;
    if (paused) return;
    if (e.code === 'Space') { inp.jump = true; e.preventDefault(); }
    if (e.code === 'KeyX') inp.let = true;
    if (e.code === 'KeyE') useOni();
    if (e.code === 'KeyQ') useBal();
    if (e.code === 'KeyM') openMap();
    if (e.code === 'Enter' && nearDoor()) enterKumon();
    if (e.code === 'Escape') { show('ovMenu', true); setPaused(); }
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; joy.id = null; cam.id = null; $('joy').style.display = 'none'; });
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
  cv.addEventListener('wheel', (e) => { cam.dist = clamp(cam.dist + e.deltaY * 0.01, 5, 16); e.preventDefault(); }, { passive: false });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  function holdBtn(el, fn) {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); ac(); el.classList.add('on'); fn(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => el.addEventListener(t, () => el.classList.remove('on')));
    el.addEventListener('click', (e) => e.preventDefault());
  }
  holdBtn($('bJump'), () => { inp.jump = true; });
  holdBtn($('bLet'), () => { inp.let = true; });
  holdBtn($('bOni'), useOni);
  holdBtn($('bBal'), useBal);
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
  function noise(dur, vol, freq) {
    const a = ac(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'bandpass'; f.frequency.value = freq || 800; g.gain.value = vol || 0.2;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }
  const SFX = {
    jump: () => tone(380, 0.14, 'square', 0.05, 720),
    land: () => tone(140, 0.09, 'sine', 0.12, 70),
    star: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, null, i * 0.08)),
    big: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.13, null, i * 0.12)),
    pick: () => { tone(880, 0.08, 'square', 0.05); tone(1320, 0.12, 'square', 0.05, null, 0.07); },
    eat: () => { [0, 0.12, 0.24].forEach((d) => tone(300, 0.07, 'square', 0.05, 200, d)); tone(660, 0.3, 'triangle', 0.1, 990, 0.38); },
    bal: () => tone(300, 0.6, 'sine', 0.12, 900),
    umb: () => noise(0.25, 0.2, 1200),
    stamp: () => [659, 880].forEach((f, i) => tone(f, 0.35, 'sine', 0.13, null, i * 0.15)),
    climb: () => tone(220 + Math.random() * 40, 0.05, 'triangle', 0.04),
    splash: () => noise(0.4, 0.3, 500),
    tired: () => tone(330, 0.3, 'sawtooth', 0.04, 160),
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
    $('oniN').textContent = save.oni; $('balN').textContent = save.bal;
    $('bOni').classList.toggle('zero', !save.oni); $('bBal').classList.toggle('zero', !save.bal);
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
  function useBal() {
    if (paused) return;
    if (!save.bal) { banner('🎈 ふうせんが ないよ<small>コスモワールドの ちかくに あるかも</small>', 1.6); return; }
    save.bal--; P.bal = 2.6; P.glide = false; if (P.state === 'climb') { P.state = 'air'; P.wall = null; P.cool = 0.4; }
    SFX.bal(); store(); refreshHud();
  }

  // ================= ゲームの すすみ =================
  let time = 0, saveT = 0, climbSnd = 0, lastTalk = null, lastLab = '', lastDoor = false;
  function update(dt) {
    time += dt;
    updatePlats(time);
    if (P.plat) { P.x += P.plat.dx; P.y += P.plat.dy; P.z += P.plat.dz; }
    readMove();
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    const dx = rx * inp.mx + fx * inp.my, dz = rz * inp.mx + fz * inp.my;
    const mag = Math.hypot(dx, dz);
    const MS = maxSt();
    P.cool = Math.max(0, P.cool - dt);

    if (P.state === 'climb') climbUpdate(dt, rx, rz);
    else {
      const swim = P.state === 'swim';
      const speed = swim ? 3.6 : P.glide ? 7.5 : 7;
      const k = P.ground ? 14 : P.glide ? 3 : 5;
      P.vx += (dx * speed - P.vx) * Math.min(1, k * dt); P.vz += (dz * speed - P.vz) * Math.min(1, k * dt);
      if (inp.jump) {
        if (P.ground) { P.vy = JUMP; P.ground = false; P.plat = null; SFX.jump(); }
        else if (swim) { P.vy = 5.5; SFX.splash(); }
        else if (P.bal <= 0) { P.glide = !P.glide; if (P.glide) SFX.umb(); }
      }
      if (P.bal > 0) { P.bal -= dt; P.vy = 6.5; }
      else if (P.glide) { P.vy = Math.max(P.vy - GRAV * dt, -2.2); }
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

      // みず
      let inWater = false;
      if (!P.ground && P.y < WATER - 1.0) {
        if (P.state !== 'swim' && fallV < -4) SFX.splash();
        P.y = WATER - 1.0; if (P.vy < 0) P.vy = 0; inWater = true; P.glide = false;
      }
      if (!P.ground && P.y <= WATER - 0.99 && P.vy <= 0.01) inWater = true;

      // かべ のぼり の はじまり
      const hit = hx || hz;
      const atDoorway = hit && hit.b.door && P.x > hit.b.door.x0 - 0.3 && P.x < hit.b.door.x1 + 0.3 && P.y < 0.5;
      if (hit && hit.b.climb && !atDoorway && mag > 0.3 && !P.tired && P.cool <= 0 && P.bal <= 0) {
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

    // スタミナ
    if (P.state === 'ground') { P.st = Math.min(MS, P.st + MS * 0.45 * dt); if (P.tired && P.st >= MS * 0.5) P.tired = false; }
    P.phase += dt * (P.state === 'climb' ? P.speed * 2.2 : P.speed * 1.5);

    // ほし
    const cy = P.y + 0.8;
    for (const s of STARS) {
      if (save.stars.includes(s.id)) continue;
      if (Math.hypot(s.x - P.x, s.y - cy, s.z - P.z) < (s.big ? 2.4 : 1.6)) {
        save.stars.push(s.id); P.st = maxSt(); store();
        if (s.big) {
          SFX.big(); confetti();
          banner('🌟 やったー！ きんいろの ほしを ゲット！<small>そらで ジャンプして かさで とびおりてみよう ☂️</small>', 5);
        } else if (save.stars.length === STARS.length) {
          SFX.big(); confetti(); banner('🏆 ほしを ぜんぶ あつめた！<small>みなとみらい マスターだ！</small>', 5);
        } else { SFX.star(); banner(`⭐ ほしを みつけた！（${save.stars.length}/${STARS.length}）<small>のぼれる ながさが のびたよ</small>`, 2.4); }
        refreshHud();
      }
    }
    // アイテム
    for (const p of PICKS) {
      if (time - p.took < 45) continue;
      if (Math.hypot(p.x - P.x, p.y - cy, p.z - P.z) < 1.4) {
        if (p.t === 'oni') { if (save.oni >= 9) continue; save.oni++; banner('🍙 おにぎりを ひろった！', 1.4); }
        else { if (save.bal >= 5) continue; save.bal++; banner('🎈 ふうせんを ひろった！', 1.4); }
        p.took = time; SFX.pick(); store(); refreshHud();
      }
    }
    // ばしょ スタンプ
    for (const z of ZONES) {
      if (save.stamps.includes(z.id)) continue;
      let inside = z.rect ? (P.x > z.rect[0] && P.x < z.rect[2] && P.z > z.rect[1] && P.z < z.rect[3]) : Math.hypot(z.x - P.x, z.z - P.z) < z.r;
      if (inside && z.minY !== undefined && P.y < z.minY) inside = false;
      if (inside) {
        save.stamps.push(z.id); store(); refreshHud(); SFX.stamp();
        if (bannerT < 1) banner(`📍 ${z.name} に ついた！<small>スタンプ ${save.stamps.length}/${ZONES.length}</small>`, 2.4);
      }
    }
    // おはなし
    let near = null, nd = 4.5;
    for (const n of NPCS) { const d = Math.hypot(n.x - P.x, n.z - P.z); if (d < nd && Math.abs(n.y - P.y) < 3) { nd = d; near = n; } }
    if (near !== lastTalk) {
      lastTalk = near; const t = $('talk');
      if (near) { t.dataset.who = near.who; t.textContent = near.say; t.style.display = 'block'; } else t.style.display = 'none';
    }
    if (P.y < -40) respawn();
    const atDoor = nearDoor();
    if (atDoor !== lastDoor) { lastDoor = atDoor; $("bEnter").hidden = !atDoor; }
    saveT += dt; if (saveT > 4) { saveT = 0; if (P.state === 'ground' && !P.plat) { save.pos = { x: P.x, y: P.y, z: P.z }; store(); } }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
    const lab = P.state === 'climb' ? 'うえへ<br>ジャンプ' : (P.state === 'air' && P.bal <= 0) ? (P.glide ? 'かさを<br>とじる' : '☂️<br>かさ') : 'ジャンプ';
    if (lab !== lastLab) { lastLab = lab; $('bJump').innerHTML = lab; $('bLet').hidden = P.state !== 'climb'; }
  }

  function climbUpdate(dt, rx, rz) {
    const w = P.wall, b = w.b, a = w.axis, t = a === 'x' ? 'z' : 'x';
    // みぎ・ひだり の むき（カメラの みぎ を かべに そって）
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
    if (P.st <= 0) { P.st = 0; P.tired = true; SFX.tired(); banner('😵 へとへと… てが はなれちゃった', 1.6); release(); return; }
    P[a] = wallCoord(w);
    // よこ
    const hit = moveH(t, vl * dt, false);
    if (hit && hit.b.climb && hit.b !== b) { P.wall = hit; faceWall(hit); return; }
    // かどを まわる
    if (P[t] > b[t + '1'] + R * 0.6 || P[t] < b[t + '0'] - R * 0.6) {
      const side = P[t] > b[t + '1'] ? 1 : -1;
      const nw = { b, axis: t, side };
      const along = w.side > 0 ? b[a + '1'] - R - 0.05 : b[a + '0'] + R + 0.05;
      const ox = P.x, oz = P.z;
      P[t] = wallCoord(nw); P[a] = along;
      if (anyHit(P.x, P.y, P.z)) { P.x = ox; P.z = oz; P[t] = side > 0 ? b[t + '1'] + R * 0.6 : b[t + '0'] - R * 0.6; }
      else { P.wall = nw; faceWall(nw); return; }
    }
    // たて
    const r = moveV(vy * dt);
    if (r === 1) { P.state = 'ground'; P.ground = true; P.wall = null; return; }
    if (r === -1 && ceilB && ceilB.climb && ceilB.y1 - P.y < 3.2 && !anyHit(P.x, ceilB.y1 + 0.001, P.z)) {
      P.y = ceilB.y1; P.state = 'ground'; P.ground = true; P.wall = null; P.boost = 0; SFX.land(); return; // でっぱりに よじのぼる
    }
    // うえまで ついた
    if (P.y > b.y1 - 0.35) {
      const coord = w.side > 0 ? b[a + '1'] : b[a + '0'];
      for (const o of solids) { // うえに つづく かべ
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
    P.bal = 0; P.plat = null; P.st = maxSt(); P.tired = false; cam.yaw = START.yaw; P.face = Math.PI;
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
  function person(x, y, z, face, shirt, pose, phase) {
    const base = M(T(x, y, z), RY(face));
    let lg = 0, ar = 0, al = 0;
    if (pose === 'walk') { lg = Math.sin(phase) * 0.7; ar = -lg; al = lg; }
    else if (pose === 'climb') { lg = Math.sin(phase) * 0.5; ar = Math.PI * 0.85 + Math.sin(phase) * 0.35; al = Math.PI * 0.85 - Math.sin(phase) * 0.35; }
    else if (pose === 'up') { ar = al = Math.PI * 0.92; lg = 0.15; }
    else if (pose === 'swim') { ar = Math.PI * 0.5 + Math.sin(phase * 2) * 0.8; al = Math.PI * 0.5 - Math.sin(phase * 2) * 0.8; lg = Math.sin(phase * 3) * 0.4; }
    else if (pose === 'air') { ar = al = 2.4; lg = 0.4; }
    part(base, -0.13, 0.72, 0, 0.2, 0.72, 0.22, C.navy, RX(lg));
    part(base, 0.13, 0.72, 0, 0.2, 0.72, 0.22, C.navy, RX(-lg));
    part(base, 0, 0.98, 0, 0.56, 0.58, 0.36, shirt);
    part(base, -0.36, 1.24, 0, 0.16, 0.54, 0.18, shirt, RX(-al));
    part(base, 0.36, 1.24, 0, 0.16, 0.54, 0.18, shirt, RX(-ar));
    part(base, 0, 1.5, 0, 0.52, 0.48, 0.48, C.skin);
    part(base, 0, 1.56, -0.06, 0.55, 0.42, 0.42, C.hair);
    part(base, -0.11, 1.5, 0.245, 0.07, 0.1, 0.02, C.black); part(base, 0.11, 1.5, 0.245, 0.07, 0.1, 0.02, C.black);
    part(base, -0.18, 1.41, 0.245, 0.08, 0.05, 0.02, C.pink); part(base, 0.18, 1.41, 0.245, 0.08, 0.05, 0.02, C.pink);
    return base;
  }
  function drawAo() {
    let pose = 'stand';
    if (P.state === 'climb') pose = 'climb';
    else if (P.state === 'swim') pose = 'swim';
    else if (P.glide || P.bal > 0) pose = 'up';
    else if (P.state === 'air') pose = 'air';
    else if (P.speed > 0.5) pose = 'walk';
    const base = person(P.x, P.y, P.z, P.face, C.blue, pose, P.phase);
    // ぼうし（あおちゃん の しるし）
    part(base, 0, 1.78, 0, 0.57, 0.14, 0.52, C.cap);
    part(base, 0, 1.73, 0.33, 0.5, 0.05, 0.26, C.cap);
    draw(mStar, M(base, T(0, 1.79, 0.265), S(0.11, 0.11, 0.1)), C.yellow, 1);
    if (P.glide) draw(mUmb, M(base, T(0, 2.75, 0)), W);
    if (P.bal > 0) {
      draw(mSphere, M(base, T(0, 3.3, 0), S(0.55, 0.65, 0.55)), C.red);
      part(base, 0, 2.65, 0, 0.03, 0.9, 0.03, C.white);
    }
  }
  function groundBelow(x, y, z) {
    let g = WATER;
    for (const b of solids) if (x + 0.1 > b.x0 && x - 0.1 < b.x1 && z + 0.1 > b.z0 && z - 0.1 < b.z1 && b.y1 <= y + 0.05 && b.y1 > g) g = b.y1;
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

  function render() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.floor(innerWidth * dpr), h = Math.floor(innerHeight * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    gl.viewport(0, 0, w, h);
    gl.clearColor(C.sky[0], C.sky[1], C.sky[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);

    // カメラ
    const tgt = [P.x, P.y + 1.3, P.z];
    const cp = Math.cos(cam.pitch);
    const dir = [Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp];
    let dist = cam.dist + (P.state === 'climb' ? 2 : 0) + (P.glide ? 3 : 0);
    const d = [dir[0] * dist, dir[1] * dist, dir[2] * dist];
    let tm = 1; for (const b of solids) { const tt = rayBox(tgt, d, b); if (tt < tm) tm = tt; }
    dist = Math.max(1.2, dist * tm - 0.25);
    eye = [tgt[0] + dir[0] * dist, Math.max(WATER + 0.4, tgt[1] + dir[1] * dist), tgt[2] + dir[2] * dist];
    proj = persp(1.05, w / h, 0.1, 900); view = lookAt(eye, tgt);
    gl.uniformMatrix4fv(U.uProj, false, proj); gl.uniformMatrix4fv(U.uView, false, view);
    gl.uniform3fv(U.uSun, SUN); gl.uniform3fv(U.uFog, C.sky); gl.uniform3fv(U.uCam, eye); gl.uniform1f(U.uTime, time);
    bound = null;

    draw(staticMesh, I(), W);
    // かんらんしゃ
    const ang = time * Math.PI * 2 / FW.period;
    draw(mWheel, M(T(FW.cx, FW.hub, FW.cz), RZ(ang)), W);
    draw(mClock, M(T(FW.cx, FW.hub, FW.cz + 0.35)), W, 0.3);
    draw(mClock, M(T(FW.cx, FW.hub, FW.cz - 0.35)), W, 0.3);
    const now = new Date(), hr = (now.getHours() % 12 + now.getMinutes() / 60) / 12 * Math.PI * 2, mn = now.getMinutes() / 60 * Math.PI * 2;
    [0.4, -0.4].forEach((zo) => {
      draw(mCube, M(T(FW.cx, FW.hub, FW.cz + zo), RZ(-hr), T(0, 0.8, 0), S(0.25, 1.6, 0.05)), C.white, 1);
      draw(mCube, M(T(FW.cx, FW.hub, FW.cz + zo), RZ(-mn), T(0, 1.2, 0), S(0.15, 2.4, 0.05)), C.yellow, 1);
    });
    cabins.forEach((p, i) => {
      draw(mCube, M(T(p.cx, p.cy - 0.8, p.cz), S(2.2, 1.6, 2.2)), CAB_COL[i % CAB_COL.length]);
      draw(mCube, M(T(p.cx, p.cy - 0.75, p.cz), S(2.26, 0.6, 1.6)), [0.6, 0.85, 1]);
    });
    gondolas.forEach((p) => {
      draw(mCube, M(T(p.cx, p.cy - 0.9, p.cz), S(2.3, 1.8, 2.3)), C.white);
      draw(mCube, M(T(p.cx, p.cy - 0.8, p.cz), S(2.36, 0.7, 1.8)), [0.35, 0.6, 0.9]);
      draw(mCube, M(T(p.cx, p.cy + 1, p.cz), S(0.12, 2, 0.12)), C.navy);
    });
    // ひと
    NPCS.forEach((n) => {
      const f = Math.hypot(P.x - n.x, P.z - n.z) < 8 ? Math.atan2(P.x - n.x, P.z - n.z) : 0;
      person(n.x, n.y, n.z, f, n.col, 'stand', 0);
    });
    // アイテム
    PICKS.forEach((p) => {
      if (time - p.took < 45) return;
      const bob = Math.sin(time * 2 + p.x) * 0.15;
      if (p.t === 'oni') draw(mOni, M(T(p.x, p.y + bob, p.z), RY(time * 1.5), S(1.1)), W);
      else { draw(mSphere, M(T(p.x, p.y + 0.4 + bob, p.z), S(0.42, 0.5, 0.42)), C.red); draw(mCube, M(T(p.x, p.y - 0.2 + bob, p.z), S(0.03, 0.7, 0.03)), C.white); }
    });
    // ほし
    STARS.forEach((s) => {
      if (save.stars.includes(s.id)) return;
      const sc = s.big ? 1.8 : 1;
      draw(mStar, M(T(s.x, s.y + Math.sin(time * 2.2 + s.x) * 0.15, s.z), RY(time * 2), S(sc)), s.big ? C.gold : C.yellow, 0.75);
    });
    // かもめ
    for (let i = 0; i < 7; i++) {
      const a = time * 0.25 + i * 0.9, r = 30 + i * 9, cx = 30 + i * 12, cz = 20 - i * 6;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, y = 18 + i * 3 + Math.sin(time + i) * 2, fl = Math.sin(time * 8 + i) * 0.5;
      const base = M(T(x, y, z), RY(-a));
      draw(mCube, M(base, S(0.25, 0.25, 0.7)), C.white);
      draw(mCube, M(base, RZ(fl), T(0.6, 0, 0), S(1.2, 0.06, 0.4)), C.white);
      draw(mCube, M(base, RZ(-fl), T(-0.6, 0, 0), S(1.2, 0.06, 0.4)), C.white);
    }
    drawAo();

    // すきとおる もの（かげ・ひかりの はしら）
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    const gy = P.state === 'climb' ? null : groundBelow(P.x, P.y, P.z);
    if (gy !== null && P.y - gy < 30) draw(mDisc, M(T(P.x, gy + 0.03, P.z), S(0.45 * Math.max(0.4, 1 - (P.y - gy) / 30))), C.black, 1, 0.3);
    STARS.forEach((s) => {
      if (save.stars.includes(s.id)) return;
      const big = s.big;
      draw(mCube, M(T(s.x, s.y + 30, s.z), S(big ? 0.9 : 0.45, 60, big ? 0.9 : 0.45)), big ? C.gold : C.yellow, 1, big ? 0.32 : 0.2);
    });
    draw(mCube, M(T(KUMON.x, 20, KUMON.z), S(0.8, 40, 0.8)), [0.25, 0.85, 0.45], 1, 0.16 + 0.06 * Math.sin(time * 3)); // くもん の めじるし
    gl.depthMask(true); gl.disable(gl.BLEND);

    // スタミナの わ
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
  const MAPB = { x0: -112, x1: 190, z0: -100, z1: 200 };
  function drawMap() {
    const c = $('mapCv'), x = c.getContext('2d'), Wd = c.width, Hd = c.height;
    const sc = Math.min(Wd / (MAPB.x1 - MAPB.x0), Hd / (MAPB.z1 - MAPB.z0));
    const ox = (Wd - (MAPB.x1 - MAPB.x0) * sc) / 2, oz = (Hd - (MAPB.z1 - MAPB.z0) * sc) / 2;
    const px = (v) => ox + (v - MAPB.x0) * sc, pz = (v) => oz + (v - MAPB.z0) * sc;
    const css = (col) => `rgb(${col.map((v) => Math.round(v * 255)).join(',')})`;
    x.fillStyle = '#3d8fd6'; x.fillRect(0, 0, Wd, Hd);
    LAND.forEach((l) => { x.fillStyle = css(l.col); x.fillRect(px(l.x0), pz(l.z0), (l.x1 - l.x0) * sc, (l.z1 - l.z0) * sc); });
    mapBoxes.forEach((b) => { x.fillStyle = css(shade(b.col, 0.75)); x.fillRect(px(b.x0), pz(b.z0), (b.x1 - b.x0) * sc, (b.z1 - b.z0) * sc); });
    x.strokeStyle = '#1c2b4a'; x.lineWidth = 2; x.setLineDash([4, 4]);
    x.beginPath(); x.moveTo(px(-18), pz(65)); x.lineTo(px(54), pz(65)); x.stroke(); x.setLineDash([]);
    x.font = 'bold 15px sans-serif'; x.textAlign = 'center';
    ZONES.forEach((z) => {
      if (z.id === 'lmtop') return;
      const got = save.stamps.includes(z.id);
      const t = (got ? '📍' : '❔') + z.name;
      x.lineWidth = 4; x.strokeStyle = 'rgba(255,255,255,.9)'; x.strokeText(t, px(z.x), pz(z.z) - 8);
      x.fillStyle = got ? '#1c2b4a' : '#74819b'; x.fillText(t, px(z.x), pz(z.z) - 8);
    });
    x.font = 'bold 20px sans-serif';
    STARS.forEach((s) => {
      const got = save.stars.includes(s.id);
      x.fillStyle = got ? 'rgba(80,80,80,.55)' : (s.big ? '#ffb700' : '#ffd43b');
      x.lineWidth = 3; x.strokeStyle = '#5a3d00';
      if (!got) x.strokeText('★', px(s.x), pz(s.z) + 7);
      x.fillText('★', px(s.x), pz(s.z) + 7);
    });
    // あおちゃん
    x.save(); x.translate(px(P.x), pz(P.z)); x.rotate(-P.face + Math.PI);
    x.fillStyle = '#2f6fe0'; x.strokeStyle = '#fff'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(0, -13); x.lineTo(9, 9); x.lineTo(0, 4); x.lineTo(-9, 9); x.closePath(); x.stroke(); x.fill();
    x.restore();
    const box = $('stamps'); box.innerHTML = '';
    ZONES.forEach((z) => { const s = document.createElement('span'); s.textContent = (save.stamps.includes(z.id) ? '📍 ' : '') + z.name; if (save.stamps.includes(z.id)) s.className = 'got'; box.appendChild(s); });
  }

  // ================= がめん の きりかえ =================
  function show(id, on) { $(id).classList.toggle('show', on); }
  // ---- くもん きょうしつ に はいる ----
  function nearDoor() { return P.state === 'ground' && Math.abs(P.y) < 0.2 && Math.abs(P.x - KUMON.x) < 2.2 && P.z > -68.5 && P.z < -64.5; }
  function enterKumon() {
    if (!window.Kumon) return;
    SFX.stamp(); show('ovKumon', true); setPaused();
    window.Kumon.open({
      sfx: (n) => { if (n === 'tap') tone(660, 0.04, 'triangle', 0.05); else if (n === 'ng') SFX.tired(); else if (n === 'good') SFX.star(); else if (n === 'pass') { SFX.big(); confetti(); } },
      onReward: (r) => {
        if (r.type === 'print') { if (save.oni >= 9) return 'おにぎりは もう いっぱい！'; save.oni++; store(); refreshHud(); return 'ごほうびに 🍙 おにぎり を 1こ もらった！'; }
        save.bal = Math.min(5, save.bal + 2); save.oni = Math.min(9, save.oni + 2); store(); refreshHud();
        return 'ごうかくの ごほうびに 🎈 ふうせん と 🍙 おにぎり を 2こずつ もらった！';
      },
      onClose: () => { show('ovKumon', false); P.x = KUMON.x; P.z = -65.2; P.face = 0; cam.yaw = Math.PI; P.vx = P.vz = 0; lastDoor = null; setPaused(); banner('🏫 また きてね！<small>いまは ' + window.Kumon.level + ' きょうざい</small>', 2); },
    });
  }
  holdBtn($('bEnter'), enterKumon);
  function anyOv() { return ['ovTitle', 'ovHow', 'ovMap', 'ovMenu', 'ovKumon'].some((i) => $(i).classList.contains('show')); }
  function setPaused() { paused = anyOv(); if (paused) { joy.id = null; joy.x = joy.y = 0; $('joy').style.display = 'none'; } }
  function openMap() { drawMap(); show('ovMap', true); setPaused(); }
  $('bStart').addEventListener('click', () => { ac(); show('ovTitle', false); setPaused(); if (!save.seenTitle) { save.seenTitle = true; store(); banner('🧢 あおちゃんの だいぼうけん スタート！<small>まずは ランドマークタワーへ</small>', 3.5); } });
  $('bHow1').addEventListener('click', () => { show('ovHow', true); });
  $('bHow2').addEventListener('click', () => { show('ovMenu', false); show('ovHow', true); });
  $('bHowOk').addEventListener('click', () => { show('ovHow', false); setPaused(); });
  $('bMap').addEventListener('click', openMap);
  $('bMapOk').addEventListener('click', () => { show('ovMap', false); setPaused(); });
  $('bMenu').addEventListener('click', () => { show('ovMenu', true); setPaused(); });
  $('bResume').addEventListener('click', () => { show('ovMenu', false); setPaused(); });
  $('bHome').addEventListener('click', () => { respawn(); show('ovMenu', false); setPaused(); });
  $('bReset').addEventListener('click', () => {
    if (!confirm('ほし・スタンプ・アイテムを ぜんぶ けして、さいしょから はじめる？')) return;
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
      // こまかく わけて うごかす（はやく おちても かべを すりぬけない）
      const n = dt > 0.025 ? 2 : 1;
      for (let i = 0; i < n; i++) update(dt / n);
      bgm();
    }
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // テスト用の のぞき窓
  window.__mm = { P, save, cam, STARS, solids, inp, keys, update, set paused(v) { paused = v; } };
})();
