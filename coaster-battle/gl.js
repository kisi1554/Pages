'use strict';
// ちいさな 3D エンジン（WebGL を てがき。がいぶ ライブラリ なし）

const V3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  madd: (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  // ベクトル v を じく k（たんい）の まわりに ang だけ まわす
  rot: (v, k, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang), d = V3.dot(k, v) * (1 - c), x = V3.cross(k, v);
    return [v[0] * c + x[0] * s + k[0] * d, v[1] * c + x[1] * s + k[1] * d, v[2] * c + x[2] * s + k[2] * d];
  },
};

const M4 = {
  ident() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  clone(a) { return new Float32Array(a); },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  },
  persp(fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2), o = new Float32Array(16);
    o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f);
    return o;
  },
  lookAt(eye, ctr, up) {
    const z = V3.norm(V3.sub(eye, ctr)), x = V3.norm(V3.cross(up, z)), y = V3.cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -V3.dot(x, eye), -V3.dot(y, eye), -V3.dot(z, eye), 1]);
  },
  // R(よこ) U(うえ) F(まえ) を じくに した 行列
  frame(R, U, F, p) {
    return new Float32Array([R[0], R[1], R[2], 0, U[0], U[1], U[2], 0, F[0], F[1], F[2], 0, p[0], p[1], p[2], 1]);
  },
  translate(m, x, y, z) {
    m[12] += m[0] * x + m[4] * y + m[8] * z; m[13] += m[1] * x + m[5] * y + m[9] * z;
    m[14] += m[2] * x + m[6] * y + m[10] * z; m[15] += m[3] * x + m[7] * y + m[11] * z; return m;
  },
  rotX(m, a) {
    const c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < 4; i++) { const b = m[4 + i], d = m[8 + i]; m[4 + i] = c * b + s * d; m[8 + i] = -s * b + c * d; }
    return m;
  },
  rotY(m, a) {
    const c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < 4; i++) { const b = m[i], d = m[8 + i]; m[i] = c * b - s * d; m[8 + i] = s * b + c * d; }
    return m;
  },
  rotZ(m, a) {
    const c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < 4; i++) { const b = m[i], d = m[4 + i]; m[i] = c * b + s * d; m[4 + i] = -s * b + c * d; }
    return m;
  },
  scale(m, x, y, z) {
    for (let i = 0; i < 4; i++) { m[i] *= x; m[4 + i] *= y; m[8 + i] *= z; } return m;
  },
  xform(m, p) {
    const x = p[0], y = p[1], z = p[2];
    return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13],
      m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]];
  },
};

function hexc(h, a) {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a == null ? 0 : a];
}

// きほんの かたち（[px,py,pz,nx,ny,nz] の さんかくけい れつ）。おおきさ 1、まんなかが 0
const PRIM = (() => {
  const P = {};
  const cube = [];
  for (const n of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const u = Math.abs(n[1]) > 0.5 ? [1, 0, 0] : [0, 1, 0], v = V3.cross(n, u);
    const c = (a, b) => [n[0] * .5 + u[0] * a * .5 + v[0] * b * .5, n[1] * .5 + u[1] * a * .5 + v[1] * b * .5, n[2] * .5 + u[2] * a * .5 + v[2] * b * .5];
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) cube.push(...c(a, b), ...n);
  }
  P.cube = cube;
  const sph = [], LA = 10, LO = 16;
  const sp = (i, j) => { const t = Math.PI * i / LA, f = 2 * Math.PI * j / LO; return [Math.sin(t) * Math.cos(f), Math.cos(t), Math.sin(t) * Math.sin(f)]; };
  for (let i = 0; i < LA; i++) for (let j = 0; j < LO; j++) {
    const a = sp(i, j), b = sp(i + 1, j), c = sp(i + 1, j + 1), d = sp(i, j + 1);
    for (const q of [a, b, c, a, c, d]) sph.push(q[0] * .5, q[1] * .5, q[2] * .5, q[0], q[1], q[2]);
  }
  P.sphere = sph;
  const ball = [], BA = 5, BO = 8; // けしき よう の かるい たま
  const bp = (i, j) => { const t = Math.PI * i / BA, f = 2 * Math.PI * j / BO; return [Math.sin(t) * Math.cos(f), Math.cos(t), Math.sin(t) * Math.sin(f)]; };
  for (let i = 0; i < BA; i++) for (let j = 0; j < BO; j++) {
    const a = bp(i, j), b = bp(i + 1, j), c = bp(i + 1, j + 1), d = bp(i, j + 1);
    for (const q of [a, b, c, a, c, d]) ball.push(q[0] * .5, q[1] * .5, q[2] * .5, q[0], q[1], q[2]);
  }
  P.ball = ball;
  const cyl = [], cone = [], N = 14;
  for (let j = 0; j < N; j++) {
    const f0 = 2 * Math.PI * j / N, f1 = 2 * Math.PI * (j + 1) / N;
    const c0 = Math.cos(f0) * .5, s0 = Math.sin(f0) * .5, c1 = Math.cos(f1) * .5, s1 = Math.sin(f1) * .5;
    const n0 = [Math.cos(f0), 0, Math.sin(f0)], n1 = [Math.cos(f1), 0, Math.sin(f1)];
    cyl.push(c0, -.5, s0, ...n0, c1, -.5, s1, ...n1, c1, .5, s1, ...n1, c0, -.5, s0, ...n0, c1, .5, s1, ...n1, c0, .5, s0, ...n0);
    cyl.push(0, .5, 0, 0, 1, 0, c0, .5, s0, 0, 1, 0, c1, .5, s1, 0, 1, 0);
    cyl.push(0, -.5, 0, 0, -1, 0, c1, -.5, s1, 0, -1, 0, c0, -.5, s0, 0, -1, 0);
    const k = 0.447, m = 0.894; // かたむき 0.5:1
    cone.push(c0, -.5, s0, n0[0] * m, k, n0[2] * m, c1, -.5, s1, n1[0] * m, k, n1[2] * m, 0, .5, 0, (n0[0] + n1[0]) * .5 * m, k, (n0[2] + n1[2]) * .5 * m);
    cone.push(0, -.5, 0, 0, -1, 0, c1, -.5, s1, 0, -1, 0, c0, -.5, s0, 0, -1, 0);
  }
  P.cyl = cyl; P.cone = cone;
  return P;
})();

// いくつもの かたちを 1つの メッシュに まとめる
function Builder() { this.a = []; }
Builder.prototype.v = function (p, n, c) { this.a.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], c[3]); };
Builder.prototype.add = function (prim, m, c) {
  const d = PRIM[prim];
  for (let i = 0; i < d.length; i += 6) {
    const x = d[i], y = d[i + 1], z = d[i + 2], nx = d[i + 3], ny = d[i + 4], nz = d[i + 5];
    const px = m[0] * x + m[4] * y + m[8] * z + m[12], py = m[1] * x + m[5] * y + m[9] * z + m[13], pz = m[2] * x + m[6] * y + m[10] * z + m[14];
    let qx = m[0] * nx + m[4] * ny + m[8] * nz, qy = m[1] * nx + m[5] * ny + m[9] * nz, qz = m[2] * nx + m[6] * ny + m[10] * nz;
    const l = Math.hypot(qx, qy, qz) || 1;
    this.a.push(px, py, pz, qx / l, qy / l, qz / l, c[0], c[1], c[2], c[3]);
  }
};
// 位置と おおきさだけの はこ（よくつかうので みじかく）
Builder.prototype.box = function (x, y, z, sx, sy, sz, c, ry) {
  const m = M4.ident(); M4.translate(m, x, y, z); if (ry) M4.rotY(m, ry); M4.scale(m, sx, sy, sz); this.add('cube', m, c);
};

function Renderer(canvas) {
  const opts = { antialias: true, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
  const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
  if (!gl) throw new Error('webgl');
  this.gl = gl;
  const vs = `
attribute vec3 aP; attribute vec3 aN; attribute vec4 aC;
uniform mat4 uVP; uniform mat4 uM; uniform vec4 uCol;
varying vec3 vN; varying vec4 vC; varying vec3 vW;
void main(){ vec4 w = uM*vec4(aP,1.0); vW = w.xyz; vN = (uM*vec4(aN,0.0)).xyz;
  vC = vec4(aC.rgb*uCol.rgb, aC.a); gl_Position = uVP*w; }`;
  const fs = `
precision mediump float;
uniform vec3 uL; uniform vec3 uLC; uniform vec3 uAmb; uniform vec3 uFogC; uniform vec3 uCam;
uniform float uFogN; uniform float uFogF; uniform float uNight; uniform float uE; uniform float uFogOn;
varying vec3 vN; varying vec4 vC; varying vec3 vW;
void main(){
  vec3 n = normalize(vN);
  float d = max(dot(n, uL), 0.0);
  vec3 V = normalize(uCam - vW);
  float rim = pow(1.0 - abs(dot(n, V)), 3.0);
  vec3 lit = vC.rgb*(uAmb + uLC*d) + rim*0.22*uLC;
  float a = vC.a;
  float e = a > 0.75 ? 1.0 : (a > 0.25 ? uNight : 0.0);
  e = max(e, uE);
  vec3 col = mix(lit, vC.rgb*1.15, e);
  float f = clamp((length(uCam - vW) - uFogN)/(uFogF - uFogN), 0.0, 1.0)*uFogOn;
  gl_FragColor = vec4(mix(col, uFogC, f), 1.0);
}`;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(pr, 0, 'aP'); gl.bindAttribLocation(pr, 1, 'aN'); gl.bindAttribLocation(pr, 2, 'aC');
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  this.u = {};
  for (const n of ['uVP', 'uM', 'uCol', 'uL', 'uLC', 'uAmb', 'uFogC', 'uCam', 'uFogN', 'uFogF', 'uNight', 'uE', 'uFogOn']) this.u[n] = gl.getUniformLocation(pr, n);
  gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1); gl.enableVertexAttribArray(2);
  gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
  this.prims = {};
  for (const k in PRIM) { const b = new Builder(); b.add(k, M4.ident(), [1, 1, 1, 0]); this.prims[k] = this.mesh(b); }
  this.bound = null;
}
Renderer.prototype.mesh = function (b) {
  const gl = this.gl, data = new Float32Array(b.a), buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  this.bound = null;
  return { buf, n: data.length / 10 };
};
Renderer.prototype.free = function (m) { if (m) this.gl.deleteBuffer(m.buf); this.bound = null; };
Renderer.prototype.begin = function (w, h, vp, cam, th) {
  const gl = this.gl, u = this.u;
  gl.viewport(0, 0, w, h);
  gl.clearColor(th.fog[0], th.fog[1], th.fog[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u.uVP, false, vp);
  gl.uniform3fv(u.uL, th.L); gl.uniform3fv(u.uLC, th.lc.slice(0, 3)); gl.uniform3fv(u.uAmb, th.amb.slice(0, 3));
  gl.uniform3fv(u.uFogC, th.fog.slice(0, 3)); gl.uniform3fv(u.uCam, cam);
  gl.uniform1f(u.uFogN, th.fogN); gl.uniform1f(u.uFogF, th.fogF); gl.uniform1f(u.uNight, th.night);
  gl.uniform1f(u.uFogOn, 1);
};
Renderer.prototype.draw = function (mesh, m, col, e) {
  const gl = this.gl, u = this.u;
  if (typeof mesh === 'string') mesh = this.prims[mesh];
  if (this.bound !== mesh) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 40, 0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 40, 12);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 40, 24);
    this.bound = mesh;
  }
  gl.uniformMatrix4fv(u.uM, false, m);
  gl.uniform4f(u.uCol, col ? col[0] : 1, col ? col[1] : 1, col ? col[2] : 1, 1);
  gl.uniform1f(u.uE, e || 0);
  gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
};
Renderer.prototype.fog = function (on) { this.gl.uniform1f(this.u.uFogOn, on ? 1 : 0); };
Renderer.prototype.depth = function (on) { const gl = this.gl; if (on) { gl.enable(gl.DEPTH_TEST); gl.depthMask(true); } else { gl.disable(gl.DEPTH_TEST); gl.depthMask(false); } };

if (typeof module !== 'undefined') module.exports = { V3, M4, PRIM, Builder, hexc };
