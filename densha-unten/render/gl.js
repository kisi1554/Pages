// 小さな WebGL2 描画エンジン（外部ライブラリを使わない）。
// ・形状は「原点 origin からの相対座標」で持ち、毎フレーム カメラ位置を引いて描く（遠くでも震えない）
// ・マテリアル: 色・テクスチャ・発光・窓もよう
// ・InstancedMesh: 1つの形を行列と色を変えて大量に描く

const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
#ifdef INSTANCED
layout(location=3) in vec4 aM0;
layout(location=4) in vec4 aM1;
layout(location=5) in vec4 aM2;
layout(location=6) in vec4 aM3;
layout(location=7) in vec4 aColor;
#endif
uniform mat4 uViewProj;
uniform vec3 uOffset;      // origin - camera
out vec3 vNormal;
out vec2 vUV;
out vec3 vRel;             // カメラからの相対位置
out vec4 vColor;
out vec3 vLocal;
void main(){
#ifdef INSTANCED
  mat4 m = mat4(aM0, aM1, aM2, aM3);
  vec4 p = m * vec4(aPos, 1.0);
  vNormal = normalize(mat3(m) * aNormal);
  vColor = aColor;
  vLocal = aPos * vec3(length(aM0.xyz), length(aM1.xyz), length(aM2.xyz));
#else
  vec4 p = vec4(aPos, 1.0);
  vNormal = aNormal;
  vColor = vec4(1.0);
  vLocal = aPos;
#endif
  vec3 rel = p.xyz + uOffset;
  vRel = rel;
  vUV = aUV;
  gl_Position = uViewProj * vec4(rel, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec2 vUV;
in vec3 vRel;
in vec4 vColor;
in vec3 vLocal;
uniform vec3 uColor;
uniform vec3 uEmissive;
uniform sampler2D uTex;
uniform int uUseTex;
uniform int uUnlit;
uniform int uWindows;
uniform vec3 uFogColor;
uniform vec2 uFog;         // near, far
uniform vec3 uLightDir;
uniform float uAmbient;
uniform float uSun;
uniform float uNight;      // 0..1 窓の明かり（トンネル内などで暗いとき）
out vec4 outColor;
void main(){
  vec3 base = uColor * vColor.rgb;
  if (uUseTex == 1) {
    vec4 t = texture(uTex, vUV);
    if (t.a < 0.5) discard;
    base *= t.rgb;
  }
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 col;
  if (uUnlit == 1) col = base;
  else {
    float d = max(dot(n, uLightDir), 0.0);
    float sky = 0.5 + 0.5 * n.y;
    col = base * (uAmbient * (0.75 + 0.25 * sky) + uSun * d);
  }
  if (uWindows == 1 && vColor.a > 0.5 && abs(n.y) < 0.5) {
    // 建物の窓: 箱の中の座標で格子をつくる
    float h = abs(n.x) > abs(n.z) ? vLocal.z : vLocal.x;
    vec2 g = vec2(fract(h / 3.2), fract(vLocal.y / 3.4));
    float win = step(0.18, g.x) * step(g.x, 0.82) * step(0.3, g.y) * step(g.y, 0.85);
    col = mix(col, mix(vec3(0.16, 0.2, 0.26), vec3(1.0, 0.86, 0.55), uNight), win * 0.85);
  }
  col += uEmissive;
  float dist = length(vRel);
  float f = smoothstep(uFog.x, uFog.y, dist);
  outColor = vec4(mix(col, uFogColor, f), 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
  return sh;
}
function program(gl, defs) {
  const p = gl.createProgram();
  const head = s => s.replace("#version 300 es", "#version 300 es\n" + defs);
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, head(VS)));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, head(FS)));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

// ---- 行列 -----------------------------------------------------------
export const mat4 = {
  perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
    return out;
  },
  /** 目は原点。f=前方向、up=上方向 */
  lookDir(out, f, up) {
    let [fx, fy, fz] = norm3(f);
    // s = f × up
    let sx = fy * up[2] - fz * up[1], sy = fz * up[0] - fx * up[2], sz = fx * up[1] - fy * up[0];
    [sx, sy, sz] = norm3([sx, sy, sz]);
    const ux = sy * fz - sz * fy, uy = sz * fx - sx * fz, uz = sx * fy - sy * fx;
    out[0] = sx; out[1] = ux; out[2] = -fx; out[3] = 0;
    out[4] = sy; out[5] = uy; out[6] = -fy; out[7] = 0;
    out[8] = sz; out[9] = uz; out[10] = -fz; out[11] = 0;
    out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
    return out;
  },
  multiply(out, a, b) {
    const r = new Float32Array(16);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      r[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
    }
    out.set(r);
    return out;
  },
};
export function norm3(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

/**
 * インスタンス行列を書きこむ（列優先）。
 * 位置 p、方位 bearing（北=0の時計回り）、縦の傾き pitch（上りが正）、横の傾き roll、大きさ sx,sy,sz。
 * 形のローカル座標: x=右, y=上, z=後ろ（-z が前）
 */
export function writeInstance(arr, o, p, bearing, pitch, sx, sy, sz, roll = 0) {
  // 前 f = (sin b cos p, sin p, -cos b cos p)
  const cb = Math.cos(bearing), sb = Math.sin(bearing), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const fx = sb * cp, fy = sp, fz = -cb * cp;
  let rx = cb, ry = 0, rz = sb;            // 右
  let ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx; // 上 = 右 × 前
  if (roll) {
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const nrx = rx * cr + ux * sr, nry = ry * cr + uy * sr, nrz = rz * cr + uz * sr;
    const nux = ux * cr - rx * sr, nuy = uy * cr - ry * sr, nuz = uz * cr - rz * sr;
    rx = nrx; ry = nry; rz = nrz; ux = nux; uy = nuy; uz = nuz;
  }
  arr[o] = rx * sx; arr[o + 1] = ry * sx; arr[o + 2] = rz * sx; arr[o + 3] = 0;
  arr[o + 4] = ux * sy; arr[o + 5] = uy * sy; arr[o + 6] = uz * sy; arr[o + 7] = 0;
  arr[o + 8] = -fx * sz; arr[o + 9] = -fy * sz; arr[o + 10] = -fz * sz; arr[o + 11] = 0;
  arr[o + 12] = p[0]; arr[o + 13] = p[1]; arr[o + 14] = p[2]; arr[o + 15] = 1;
}

// ---- 形をつくる道具 ---------------------------------------------------
export class GeoBuilder {
  constructor() { this.pos = []; this.nrm = []; this.uv = []; this.idx = []; }
  get count() { return this.pos.length / 3; }
  vert(p, n, u, v) { this.pos.push(p[0], p[1], p[2]); this.nrm.push(n[0], n[1], n[2]); this.uv.push(u, v); return this.count - 1; }
  /** 4点 a,b,c,d（反時計回りが表）の四角形 */
  quad(a, b, c, d, n, uv = [0, 0, 1, 0, 1, 1, 0, 1]) {
    const e1 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], e2 = [d[0] - b[0], d[1] - b[1], d[2] - b[2]];
    const g = norm3([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]);
    if (!n) n = g;
    const i = this.vert(a, n, uv[0], uv[1]);
    this.vert(b, n, uv[2], uv[3]); this.vert(c, n, uv[4], uv[5]); this.vert(d, n, uv[6], uv[7]);
    // 指定の法線と巻き順が逆なら、裏返して表を法線の側に向ける
    if (g[0] * n[0] + g[1] * n[1] + g[2] * n[2] < 0) this.idx.push(i, i + 2, i + 1, i, i + 3, i + 2);
    else this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  /** 中心 c、大きさ (w,h,d) の箱。ローカル: x=右,y=上,z=後ろ */
  box(cx, cy, cz, w, h, d, uvSide = null) {
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    const P = (x, y, z) => [x, y, z];
    this.quad(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), [0, 0, 1]);   // 後ろ
    this.quad(P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), [0, 0, -1]);  // 前
    this.quad(P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), [-1, 0, 0], uvSide || undefined); // 左
    this.quad(P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), [1, 0, 0], uvSide ? [uvSide[2], uvSide[3], uvSide[0], uvSide[1], uvSide[6], uvSide[7], uvSide[4], uvSide[5]] : undefined); // 右
    this.quad(P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0), [0, 1, 0]);   // 上
    this.quad(P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), [0, -1, 0]);  // 下
  }
}

export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 が使えません");
    this.gl = gl; this.canvas = canvas;
    this.prog = program(gl, "");
    this.progI = program(gl, "#define INSTANCED");
    this.white = this.texture(null);
    this.aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    this.viewProj = new Float32Array(16);
    this.env = { fogColor: [0.72, 0.82, 0.92], fog: [300, 2000], lightDir: norm3([0.35, 0.85, 0.4]), ambient: 0.6, sun: 0.55, night: 0 };
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    this.stats = { draws: 0 };
  }

  resize(maxDpr = 1.5) {
    const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr)), h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.gl.viewport(0, 0, w, h);
    return w / h;
  }

  texture(canvas, { repeat = true, mip = true } = {}) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (!canvas) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
      return t;
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);   // キャンバスの上 = v=1
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mip) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    return t;
  }

  /** GeoBuilder → Mesh */
  mesh(geo, material, origin = [0, 0, 0]) {
    if (!geo.count) return null;
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = (data, loc, size) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      return b;
    };
    const bufs = [buf(geo.pos, 0, 3), buf(geo.nrm, 1, 3), buf(geo.uv, 2, 2)];
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    const big = geo.count > 65535;
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, big ? new Uint32Array(geo.idx) : new Uint16Array(geo.idx), gl.STATIC_DRAW);
    bufs.push(ib);
    gl.bindVertexArray(null);
    return { vao, bufs, count: geo.idx.length, type: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, material, origin, instanced: false };
  }

  /** 同じ形をたくさん描く。maxCount 個ぶんの行列(16)と色(4)の領域をもつ */
  instanced(geo, material, maxCount, origin = [0, 0, 0]) {
    const m = this.mesh(geo, material, origin);
    const gl = this.gl;
    gl.bindVertexArray(m.vao);
    const data = new Float32Array(maxCount * 20);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
    for (let i = 0; i < 5; i++) {
      gl.enableVertexAttribArray(3 + i);
      gl.vertexAttribPointer(3 + i, 4, gl.FLOAT, false, 80, i * 16);
      gl.vertexAttribDivisor(3 + i, 1);
    }
    gl.bindVertexArray(null);
    Object.assign(m, { instanced: true, data, ib, n: 0, max: maxCount, dirty: true });
    m.bufs.push(ib);
    return m;
  }

  /** インスタンスを1つ足す（行列は writeInstance の引数） */
  static addInstance(m, p, bearing, pitch, sx, sy, sz, color = [1, 1, 1, 1], roll = 0) {
    if (m.n >= m.max) return;
    const o = m.n * 20;
    writeInstance(m.data, o, [p[0] - m.origin[0], p[1] - m.origin[1], p[2] - m.origin[2]], bearing, pitch, sx, sy, sz, roll);
    m.data[o + 16] = color[0]; m.data[o + 17] = color[1]; m.data[o + 18] = color[2]; m.data[o + 19] = color[3] ?? 1;
    m.n++; m.dirty = true;
  }

  dispose(m) {
    if (!m) return;
    const gl = this.gl;
    for (const b of m.bufs) gl.deleteBuffer(b);
    gl.deleteVertexArray(m.vao);
  }

  /** cam: { pos:[x,y,z]（倍精度）, dir:[...], up:[...], fov, near, far, aspect } */
  render(meshes, cam) {
    const gl = this.gl, e = this.env;
    const proj = mat4.perspective(new Float32Array(16), cam.fov, cam.aspect, cam.near, cam.far);
    const view = mat4.lookDir(new Float32Array(16), cam.dir, cam.up);
    mat4.multiply(this.viewProj, proj, view);
    gl.clearColor(e.fogColor[0], e.fogColor[1], e.fogColor[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.stats.draws = 0;
    for (const P of [this.prog, this.progI]) {
      gl.useProgram(P.p);
      const u = P.u;
      gl.uniformMatrix4fv(u.uViewProj, false, this.viewProj);
      gl.uniform3fv(u.uFogColor, e.fogColor);
      gl.uniform2fv(u.uFog, e.fog);
      gl.uniform3fv(u.uLightDir, e.lightDir);
      gl.uniform1f(u.uAmbient, e.ambient);
      gl.uniform1f(u.uSun, e.sun);
      gl.uniform1f(u.uNight, e.night);
      gl.uniform1i(u.uTex, 0);
      const list = meshes.filter(m => m && m.instanced === (P === this.progI) && (!m.instanced || m.n > 0));
      let lastMat = null;
      for (const m of list) {
        if (m.material !== lastMat) {
          const mt = m.material;
          gl.uniform3fv(u.uColor, mt.color);
          gl.uniform3fv(u.uEmissive, mt.emissive || [0, 0, 0]);
          gl.uniform1i(u.uUseTex, mt.map ? 1 : 0);
          gl.uniform1i(u.uUnlit, mt.unlit ? 1 : 0);
          gl.uniform1i(u.uWindows, mt.windows ? 1 : 0);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, mt.map || this.white);
          if (mt.doubleSided) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
          lastMat = mt;
        }
        gl.uniform3f(u.uOffset, m.origin[0] - cam.pos[0], m.origin[1] - cam.pos[1], m.origin[2] - cam.pos[2]);
        gl.bindVertexArray(m.vao);
        if (m.instanced) {
          if (m.dirty) {
            gl.bindBuffer(gl.ARRAY_BUFFER, m.ib);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, m.data, 0, m.n * 20);
            m.dirty = false;
          }
          gl.drawElementsInstanced(gl.TRIANGLES, m.count, m.type, 0, m.n);
        } else {
          gl.drawElements(gl.TRIANGLES, m.count, m.type, 0);
        }
        this.stats.draws++;
      }
    }
    gl.bindVertexArray(null);
  }
}

/** マテリアル（id は描く順をそろえるため） */
let MID = 0;
export function material(color, opt = {}) {
  const c = typeof color === "string" ? hex(color) : color;
  return Object.assign({ color: c, id: ++MID }, opt);
}
export function hex(h) {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
