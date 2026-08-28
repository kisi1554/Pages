"use strict";
/* ============================================================
   ぐるぐるアース：3D のせかい（すうがく・テクスチャ・WebGL・カメラ・そうさ）
   ============================================================ */

/* ============================================================
   1. ちいさな 3D すうがく（行列・ベクトル）
   ============================================================ */
const RAD = Math.PI / 180, DEG = 180 / Math.PI;
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp  = (a, b, t) => a + (b - a) * t;

function mat4() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
function mul(a, b) { // a * b
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
  }
  return o;
}
function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
}
function lookAt(eye, center, up) {
  const z = norm(sub(eye, center));
  const x = norm(cross(up, z));
  const y = cross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
  ]);
}
function translation(t) { const m = mat4(); m[12]=t[0]; m[13]=t[1]; m[14]=t[2]; return m; }
function scaling(s) { const m = mat4(); m[0]=s; m[5]=s; m[10]=s; return m; }
function rotY(a) { const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); }
function rotZ(a) { const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]); }
function mat3of(m) { return new Float32Array([m[0],m[1],m[2], m[4],m[5],m[6], m[8],m[9],m[10]]); }
function xform3(m, v) { // 4x4 の 回転部分だけを 使う
  return [ m[0]*v[0]+m[4]*v[1]+m[8]*v[2], m[1]*v[0]+m[5]*v[1]+m[9]*v[2], m[2]*v[0]+m[6]*v[1]+m[10]*v[2] ];
}
function xform3T(m, v) { // 転置（＝回転の 逆）
  return [ m[0]*v[0]+m[1]*v[1]+m[2]*v[2], m[4]*v[0]+m[5]*v[1]+m[6]*v[2], m[8]*v[0]+m[9]*v[1]+m[10]*v[2] ];
}
const sub  = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const add  = (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const scale= (a, s) => [a[0]*s, a[1]*s, a[2]*s];
const dot  = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross= (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const len  = a => Math.hypot(a[0], a[1], a[2]);
function norm(a) { const l = len(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; }

/* けいど・いど → 3D（ちきゅうの ローカル座標。テクスチャの むきと そろえてある） */
function lonLatToVec(lon, lat) {
  const la = lat * RAD, lo = lon * RAD, cl = Math.cos(la);
  return [-cl * Math.cos(lo), Math.sin(la), cl * Math.sin(lo)];
}
function eastVec(lon)      { const lo = lon * RAD; return [Math.sin(lo), 0, Math.cos(lo)]; }
function northVec(lon, lat){ const la = lat * RAD, lo = lon * RAD;
  return [Math.sin(la)*Math.cos(lo), Math.cos(la), -Math.sin(la)*Math.sin(lo)]; }

/* ============================================================
   2. せかいちず（おおまかな 海岸線）→ テクスチャを その場で えがく
   ============================================================ */


const TEX_W = 2048, TEX_H = 1024;
const px = lon => (lon + 180) / 360 * TEX_W;
const py = lat => (90 - lat) / 180 * TEX_H;

/** 国のリングを ひとつの パスに する（穴は evenodd で ぬく） */
function countryPath(ctx, c, q, W, H) {
  const sx = W / 360, sy = H / 180;
  ctx.beginPath();
  for (const s of c.r) {
    const ring = COUNTRIES.decode(s);
    for (let i = 0; i < ring.length; i++) {
      const x = (ring[i][0] / q + 180) * sx, y = (90 - ring[i][1] / q) * sy;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
}

function makeDayTexture() {
  const cv = document.createElement("canvas");
  cv.width = TEX_W; cv.height = TEX_H;
  const ctx = cv.getContext("2d");

  /* うみ：緯度で ふかさの いろを かえる */
  const sea = ctx.createLinearGradient(0, 0, 0, TEX_H);
  sea.addColorStop(0.00, "#dff2fb"); sea.addColorStop(0.10, "#7fb8dd");
  sea.addColorStop(0.28, "#1f5f9e"); sea.addColorStop(0.50, "#15508f");
  sea.addColorStop(0.72, "#1f5f9e"); sea.addColorStop(0.90, "#7fb8dd");
  sea.addColorStop(1.00, "#e6f5fc");
  ctx.fillStyle = sea; ctx.fillRect(0, 0, TEX_W, TEX_H);
  /* うみの ゆらぎ */
  ctx.globalAlpha = .07;
  for (let i = 0; i < 900; i++) {
    const x = Math.random()*TEX_W, y = Math.random()*TEX_H, r = 20 + Math.random()*90;
    ctx.fillStyle = Math.random() < .5 ? "#0b3f77" : "#4b96cd";
    ctx.beginPath(); ctx.ellipse(x, y, r, r*.35, 0, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* りく：緯度で バイオーム（氷・森・さばく）を ぬりわける */
  const land = ctx.createLinearGradient(0, 0, 0, TEX_H);
  land.addColorStop(0.00, "#f2f7ff"); land.addColorStop(0.11, "#e7eef6");
  land.addColorStop(0.18, "#8aa877"); land.addColorStop(0.28, "#5d9150");
  land.addColorStop(0.36, "#7fa855"); land.addColorStop(0.42, "#c8b06a");
  land.addColorStop(0.47, "#dcc078"); land.addColorStop(0.52, "#3f8c46");
  land.addColorStop(0.58, "#4f9450"); land.addColorStop(0.64, "#c2ad6c");
  land.addColorStop(0.72, "#6f9a55"); land.addColorStop(0.84, "#8fae7c");
  land.addColorStop(0.92, "#e7eef6"); land.addColorStop(1.00, "#f6faff");

  ctx.lineJoin = "round"; ctx.lineCap = "round";
  const drawSet = (list, q) => {
    for (const c of list) {
      countryPath(ctx, c, q, TEX_W, TEX_H);
      ctx.fillStyle = land; ctx.fill("evenodd");
      ctx.strokeStyle = "rgba(92,72,42,.5)"; ctx.lineWidth = 2.2; ctx.stroke();   // 国ざかい
    }
  };
  drawSet(COUNTRIES.plain, COUNTRIES.qPlain);
  drawSet(COUNTRIES.named, COUNTRIES.q);
  /* なんきょく（いちばん みなみの おび） */
  ctx.fillStyle = "#f4f9ff";
  ctx.fillRect(0, py(-66), TEX_W, TEX_H - py(-66));
  ctx.globalAlpha = .5; ctx.fillStyle = "#dbe8f7";
  ctx.fillRect(0, py(-63), TEX_W, py(-66) - py(-63));
  ctx.globalAlpha = 1;
  /* ほっきょくの こおり */
  const ice = ctx.createLinearGradient(0, 0, 0, py(72));
  ice.addColorStop(0, "rgba(244,249,255,1)"); ice.addColorStop(1, "rgba(244,249,255,0)");
  ctx.fillStyle = ice; ctx.fillRect(0, 0, TEX_W, py(72));

  return cv;
}

/* よるの まちあかり：ひるのテクスチャを よんで りくの うえだけに ともす */
function makeNightTexture(dayCanvas) {
  const cv = document.createElement("canvas");
  cv.width = TEX_W; cv.height = TEX_H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, TEX_W, TEX_H);

  const src = dayCanvas.getContext("2d").getImageData(0, 0, TEX_W, TEX_H).data;
  const isLand = (x, y) => {
    const i = ((y | 0) * TEX_W + (x | 0)) * 4;
    return src[i] + src[i+1] > src[i+2] * 1.15; // あおより あか+みどりが つよい＝りく
  };
  ctx.globalCompositeOperation = "lighter";
  let placed = 0, tries = 0;
  while (placed < 620 && tries < 60000) {
    tries++;
    const lon = -180 + Math.random() * 360;
    const lat = (Math.random() * 2 - 1) * 72;
    const x = px(lon), y = py(lat);
    if (!isLand(x, y)) continue;
    /* ひとが おおい ちいきほど まちあかりを おおく */
    const dense = (lon > -10 && lon < 60 && lat > 30 && lat < 62) || (lon > 100 && lon < 145 && lat > 20 && lat < 46)
      || (lon > -125 && lon < -70 && lat > 25 && lat < 50) || (lon > 65 && lon < 92 && lat > 8 && lat < 32);
    if (!dense && Math.random() < .55) continue;
    placed++;
    const r = 2 + Math.random() * 5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, "rgba(255,224,150,.95)");
    g.addColorStop(.35, "rgba(255,186,86,.42)");
    g.addColorStop(1, "rgba(255,150,40,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 7); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  return cv;
}

/* ============================================================
   3. WebGL：たいよう・ちきゅう・ほし を えがく
   ============================================================ */
const glCanvas = document.getElementById("gl");
const gl = glCanvas.getContext("webgl", { antialias: true, alpha: false, premultipliedAlpha: false });

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s), src);
  return s;
}
function program(vs, fs, attribs, uniforms) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
  const o = { p, a: {}, u: {} };
  attribs.forEach(n => o.a[n] = gl.getAttribLocation(p, n));
  uniforms.forEach(n => o.u[n] = gl.getUniformLocation(p, n));
  return o;
}
function buffer(data, type) {
  const b = gl.createBuffer();
  const t = type || gl.ARRAY_BUFFER;
  gl.bindBuffer(t, b); gl.bufferData(t, data, gl.STATIC_DRAW);
  return b;
}

/* きゅうたい（球）の 頂点 */
function makeSphere(stacks, slices) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= stacks; i++) {
    const v = i / stacks, phi = v * Math.PI;
    for (let j = 0; j <= slices; j++) {
      const u = j / slices, th = u * Math.PI * 2;
      pos.push(Math.sin(phi) * Math.cos(th), Math.cos(phi), -Math.sin(phi) * Math.sin(th));
      uv.push(u, v);
    }
  }
  for (let i = 0; i < stacks; i++) for (let j = 0; j < slices; j++) {
    const a = i * (slices + 1) + j, b = a + slices + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  return { pos: buffer(new Float32Array(pos)), uv: buffer(new Float32Array(uv)),
           idx: buffer(new Uint16Array(idx), gl.ELEMENT_ARRAY_BUFFER), n: idx.length };
}
const SPHERE = makeSphere(64, 128);

const QUAD = buffer(new Float32Array([-1,-1, 1,-1, -1,1, 1,1]));

/* ほしぞら */
const starData = [];
for (let i = 0; i < 900; i++) {
  const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
  const b = Math.pow(Math.random(), 2.2);
  starData.push(r * Math.cos(t) * 120, u * 120, r * Math.sin(t) * 120, 0.6 + b * 2.6, 0.35 + b * 0.65);
}
const STARS = buffer(new Float32Array(starData));

function texFromCanvas(cv) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
/* えらんだ国を 光らせる ための 小さなテクスチャ（タップのたびに 1枚だけ 更新する） */
const HI_W = 1024, HI_H = 512;
const hiCanvas = document.createElement("canvas");
hiCanvas.width = HI_W; hiCanvas.height = HI_H;
const hiCtx = hiCanvas.getContext("2d");

const dayCanvas = makeDayTexture();
const TEX_DAY   = texFromCanvas(dayCanvas);
const TEX_NIGHT = texFromCanvas(makeNightTexture(dayCanvas));

const TEX_HIGH = gl.createTexture();
function setHighlight(c) {
  hiCtx.clearRect(0, 0, HI_W, HI_H);
  if (c) {
    hiCtx.lineJoin = "round";
    countryPath(hiCtx, c, COUNTRIES.q, HI_W, HI_H);
    hiCtx.fillStyle = "rgba(255,255,255,.92)"; hiCtx.fill("evenodd");
    hiCtx.strokeStyle = "#fff"; hiCtx.lineWidth = 5; hiCtx.stroke();
    hiCtx.lineWidth = 9; hiCtx.strokeStyle = "rgba(255,255,255,.45)"; hiCtx.stroke();
  }
  gl.bindTexture(gl.TEXTURE_2D, TEX_HIGH);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, hiCanvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
setHighlight(null);

/* ---- シェーダ ---- */
const V_SPHERE = `
attribute vec3 aPos; attribute vec2 aUV;
uniform mat4 uMVP; uniform mat4 uModel;
varying vec2 vUV; varying vec3 vN; varying vec3 vW;
void main(){ vUV = aUV; vN = normalize(mat3(uModel[0].xyz, uModel[1].xyz, uModel[2].xyz) * aPos);
  vW = (uModel * vec4(aPos,1.0)).xyz; gl_Position = uMVP * vec4(aPos,1.0); }`;

const F_EARTH = `
precision highp float;
uniform sampler2D uDay, uNight, uHigh;
uniform vec3 uLight, uCam;
uniform float uTime;
varying vec2 vUV; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vW);
  float nl = dot(N, uLight);
  vec3 dayC   = texture2D(uDay, vUV).rgb;
  vec3 nightC = texture2D(uNight, vUV).rgb;
  float t = smoothstep(-0.09, 0.20, nl);
  vec3 lit   = dayC * (0.64 + 0.52 * clamp(nl, 0.0, 1.0));
  vec3 dark  = dayC * 0.055 + nightC * 1.5;
  vec3 col   = mix(dark, lit, t);
  // あさやけ・ゆうやけの おび
  float band = exp(-pow(nl / 0.17, 2.0));
  col += vec3(1.0, 0.42, 0.18) * band * 0.42;
  // うみの きらめき
  float ocean = smoothstep(0.03, 0.12, dayC.b - (dayC.r + dayC.g) * 0.5);
  vec3 H = normalize(uLight + V);
  col += vec3(1.0, 0.96, 0.85) * pow(max(dot(N, H), 0.0), 110.0) * ocean * 0.32 * step(0.0, nl);
  // たいきの ふちひかり
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += vec3(0.36, 0.62, 1.0) * rim * clamp(nl + 0.42, 0.0, 1.0) * 0.85;
  // えらんだ国を ゆっくり 光らせる
  float hl = texture2D(uHigh, vUV).a;
  col = mix(col, vec3(1.0, 0.82, 0.26), hl * (0.56 + 0.22 * sin(uTime * 3.0)));
  gl_FragColor = vec4(col, 1.0);
}`;

const F_SUN = `
precision highp float;
uniform float uTime; uniform vec3 uCam;
varying vec2 vUV; varying vec3 vN; varying vec3 vW;
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.99, 78.23, 45.16))) * 43758.5453); }
float noise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float n = mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
  return n;
}
float fbm(vec3 p){ float s = 0.0, a = 0.5; for(int i=0;i<4;i++){ s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vW);
  float f = fbm(N * 4.4 + vec3(0.0, uTime * 0.09, uTime * 0.05));
  float g = fbm(N * 11.0 - vec3(uTime * 0.13, 0.0, 0.0));
  float h = clamp(f * 0.75 + g * 0.42, 0.0, 1.3);
  vec3 col = mix(vec3(1.0, 0.44, 0.10), vec3(1.0, 0.76, 0.22), h);
  col = mix(col, vec3(1.0, 0.98, 0.86), smoothstep(0.55, 1.05, h));
  float limb = pow(1.0 - max(dot(N, V), 0.0), 2.2);
  col = mix(col, vec3(1.0, 0.58, 0.16), limb * 0.85);
  col += vec3(1.0, 0.72, 0.30) * limb * 0.7;
  gl_FragColor = vec4(col, 1.0);
}`;

const V_QUAD = `
attribute vec2 aPos;
uniform mat4 uVP; uniform vec3 uCenter; uniform vec3 uRight, uUp; uniform float uSize;
varying vec2 vP;
void main(){ vP = aPos;
  vec3 w = uCenter + uRight * (aPos.x * uSize) + uUp * (aPos.y * uSize);
  gl_Position = uVP * vec4(w, 1.0); }`;

const F_GLOW = `
precision mediump float;
uniform vec3 uColor; uniform float uPower;
varying vec2 vP;
void main(){
  float d = length(vP);
  float a = pow(max(1.0 - d, 0.0), uPower);
  float rays = 0.55 + 0.45 * pow(abs(cos(atan(vP.y, vP.x) * 6.0)), 6.0);
  gl_FragColor = vec4(uColor * (a * (0.72 + 0.5 * rays)), a);
}`;

const V_STAR = `
attribute vec3 aPos; attribute float aSize; attribute float aBright;
uniform mat4 uVP; varying float vB;
void main(){ vB = aBright; gl_Position = uVP * vec4(aPos, 1.0); gl_PointSize = aSize; }`;
const F_STAR = `
precision mediump float; varying float vB;
void main(){ vec2 d = gl_PointCoord - 0.5; float a = max(1.0 - length(d) * 2.0, 0.0);
  gl_FragColor = vec4(vec3(0.86, 0.90, 1.0) * vB, a * a * vB); }`;

const V_LINE = `
attribute vec3 aPos; attribute vec3 aCol; uniform mat4 uVP; varying vec3 vC;
void main(){ vC = aCol; gl_Position = uVP * vec4(aPos, 1.0); }`;
const F_LINE = `precision mediump float; varying vec3 vC;
void main(){ gl_FragColor = vec4(vC, 1.0); }`;

const V_PIN = `
attribute vec3 aPos; uniform mat4 uVP; uniform mat4 uModel; uniform float uSize;
void main(){ gl_Position = uVP * uModel * vec4(aPos, 1.0); gl_PointSize = uSize; }`;
const F_PIN = `precision mediump float; uniform vec3 uColor;
void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d);
  if (r > 0.5) discard;
  float ring = smoothstep(0.5, 0.42, r);
  float core = smoothstep(0.30, 0.16, r);
  gl_FragColor = vec4(mix(vec3(1.0), uColor, core), ring * 0.55 + core); }`;

const P_EARTH = program(V_SPHERE, F_EARTH, ["aPos","aUV"], ["uMVP","uModel","uDay","uNight","uHigh","uLight","uCam","uTime"]);
const P_SUN   = program(V_SPHERE, F_SUN,   ["aPos","aUV"], ["uMVP","uModel","uTime","uCam"]);
const P_GLOW  = program(V_QUAD,  F_GLOW,   ["aPos"], ["uVP","uCenter","uRight","uUp","uSize","uColor","uPower"]);
const P_STAR  = program(V_STAR,  F_STAR,   ["aPos","aSize","aBright"], ["uVP"]);
const P_LINE  = program(V_LINE,  F_LINE,   ["aPos","aCol"], ["uVP"]);
const P_PIN   = program(V_PIN,   F_PIN,    ["aPos"], ["uVP","uModel","uSize","uColor"]);

const lineBuf = gl.createBuffer();
const pinBuf  = gl.createBuffer();

/* ============================================================
   4. せかいの じょうたい
   ============================================================ */
const SUN_POS = [0, 0, 0], SUN_R = 3.6, EARTH_R = 1.6, ORBIT_R = 14.5, TILT = 23.4 * RAD;



const S = {
  spin: 0,            // ちきゅうの じてん（ラジアン）
  spinVel: 0,         // ドラッグの いきおい
  odo: 0,             // まわした ごうけい
  auto: 0,            // 0:とめる 1:ゆっくり 2:はやい
  season: 0,
  phi: 270 * RAD,     // たいようの まわりの いち（きせつ）
  phiTarget: 270 * RAD,
  camYaw: 62 * RAD,   // たいようの ほうこうからの かくど
  camPitch: 15 * RAD,
  camDist: 22,        // はじまりは ぜんたいの ながめ
  camDistTarget: 5.6,
  city: 0,
  countryId: null,   // えらんでいる 国
  rays: true, axis: false, sound: true,
  mode: "mission",    // mission | free
  stars: 0,
  time: 0
};

function earthPos() { return [ORBIT_R * Math.cos(S.phi), 0, ORBIT_R * Math.sin(S.phi)]; }
/* ズームアウトすると、みる ところが たいようと ちきゅうの まんなかへ */
function viewBlend() { return clamp((S.camDist - 7) / 12, 0, 1) * 0.46; }
function lightDir() { return norm(sub(SUN_POS, earthPos())); }
function earthRot() { return mul(rotZ(TILT), rotY(S.spin)); }
function earthModel() {
  return mul(mul(translation(earthPos()), earthRot()), scaling(EARTH_R));
}

/* たいようが まうえに くる いち（サブソーラーポイント） */
function subSolar() {
  const L = xform3T(earthRot(), lightDir());
  const lat = Math.asin(clamp(L[1], -1, 1)) * DEG;
  const lon = Math.atan2(L[2], -L[0]) * DEG;
  return { lat, lon };
}
/* その けいどの ちほうじ（たいようの いちで きまる 24じかん） */
function lonHour(lon) {
  const h = 12 + (lon - subSolar().lon) / 15;
  return ((h % 24) + 24) % 24;
}
const cityHour = c => lonHour(c.lon);
/* まちから みた たいようの たかさ と ほうい */
function sunSky(c) {
  const L = xform3T(earthRot(), lightDir());
  const up = lonLatToVec(c.lon, c.lat);
  const ea = eastVec(c.lon), no = northVec(c.lon, c.lat);
  const alt = Math.asin(clamp(dot(L, up), -1, 1)) * DEG;
  const az  = Math.atan2(dot(L, ea), dot(L, no)) * DEG;
  return { alt, az };
}
/* ひるの ながさ（じかん） */
function dayLength(c) {
  const dec = subSolar().lat * RAD, la = c.lat * RAD;
  const x = -Math.tan(la) * Math.tan(dec);
  if (x <= -1) return 24;
  if (x >=  1) return 0;
  return Math.acos(x) * DEG * 2 / 15;
}
function hourLabel(h) {
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return hh + ":" + String(mm).padStart(2, "0");
}
function partOfDay(h) {
  if (h < 4.5)  return { key: "night", label: "まよなか", face: "😴" };
  if (h < 7.5)  return { key: "dawn",  label: "あさ",     face: "🥱" };
  if (h < 11)   return { key: "morn",  label: "ごぜん",   face: "😄" };
  if (h < 14)   return { key: "noon",  label: "おひる",   face: "😆" };
  if (h < 16.5) return { key: "aft",   label: "ごご",     face: "🙂" };
  if (h < 19)   return { key: "eve",   label: "ゆうがた", face: "😌" };
  if (h < 22)   return { key: "eve2",  label: "よる",     face: "🌙" };
  return { key: "night", label: "よる", face: "😴" };
}

/* ============================================================
   5. カメラと えがきループ
   ============================================================ */
let VIEW = mat4(), PROJ = mat4(), VP = mat4(), camEye = [0, 0, 8];
let W = 1, H = 1, DPR = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const r = glCanvas.getBoundingClientRect();
  W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
  glCanvas.width = Math.round(W * DPR); glCanvas.height = Math.round(H * DPR);
  const fx = document.getElementById("fx");
  fx.width = Math.round(W * DPR); fx.height = Math.round(H * DPR);
  fx.style.width = W + "px"; fx.style.height = H + "px";
  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
}
window.addEventListener("resize", resize);

function updateCamera() {
  const E = earthPos();
  const L = lightDir();
  const base = Math.atan2(L[2], L[0]);          // ちきゅう から たいよう への むき
  const a = base + S.camYaw;
  const cp = Math.cos(S.camPitch);
  const dir = [cp * Math.cos(a), Math.sin(S.camPitch), cp * Math.sin(a)];
  const target = add(E, scale(sub(SUN_POS, E), viewBlend()));
  const fit = clamp(0.95 / (W / H), 1, 2.2);   // たてながの がめんでは すこし はなれて みる
  camEye = add(target, scale(dir, S.camDist * fit));
  VIEW = lookAt(camEye, target, [0, 1, 0]);
  PROJ = perspective(42 * RAD, W / H, 0.08, 600);
  VP = mul(PROJ, VIEW);
}

function bindAttrib(loc, buf, size, stride, offset) {
  if (loc < 0) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, (stride || 0) * 4, (offset || 0) * 4);
}
function drawSphere(prog) {
  bindAttrib(prog.a.aPos, SPHERE.pos, 3);
  bindAttrib(prog.a.aUV, SPHERE.uv, 2);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, SPHERE.idx);
  gl.drawElements(gl.TRIANGLES, SPHERE.n, gl.UNSIGNED_SHORT, 0);
}
function drawBillboard(center, size, color, power) {
  const right = [VIEW[0], VIEW[4], VIEW[8]], up = [VIEW[1], VIEW[5], VIEW[9]];
  gl.useProgram(P_GLOW.p);
  gl.uniformMatrix4fv(P_GLOW.u.uVP, false, VP);
  gl.uniform3fv(P_GLOW.u.uCenter, center);
  gl.uniform3fv(P_GLOW.u.uRight, right);
  gl.uniform3fv(P_GLOW.u.uUp, up);
  gl.uniform1f(P_GLOW.u.uSize, size);
  gl.uniform3fv(P_GLOW.u.uColor, color);
  gl.uniform1f(P_GLOW.u.uPower, power);
  bindAttrib(P_GLOW.a.aPos, QUAD, 2);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
function drawLines(verts) {
  if (!verts.length) return;
  gl.useProgram(P_LINE.p);
  gl.uniformMatrix4fv(P_LINE.u.uVP, false, VP);
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(P_LINE.a.aPos);
  gl.vertexAttribPointer(P_LINE.a.aPos, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(P_LINE.a.aCol);
  gl.vertexAttribPointer(P_LINE.a.aCol, 3, gl.FLOAT, false, 24, 12);
  gl.drawArrays(gl.LINES, 0, verts.length / 6);
}

function renderScene() {
  updateCamera();
  gl.clearColor(0.02, 0.03, 0.09, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);

  const E = earthPos(), L = lightDir();

  /* ほし（カメラの かいてんだけ） */
  const starVP = mul(PROJ, lookAt([0,0,0], scale(norm(sub(E, camEye)), 1), [0,1,0]));
  gl.depthMask(false);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.useProgram(P_STAR.p);
  gl.uniformMatrix4fv(P_STAR.u.uVP, false, starVP);
  bindAttrib(P_STAR.a.aPos, STARS, 3, 5, 0);
  bindAttrib(P_STAR.a.aSize, STARS, 1, 5, 3);
  bindAttrib(P_STAR.a.aBright, STARS, 1, 5, 4);
  gl.drawArrays(gl.POINTS, 0, starData.length / 5);

  /* こうてんの みち（ちきゅうが 1ねんかけて とおる みち） */
  const ringA = clamp((S.camDist - 9) / 7, 0, 1) * 0.5;
  if (ringA > 0.01) {
    const v = [];
    for (let i = 0; i < 96; i++) {
      const a0 = i / 96 * Math.PI * 2, a1 = (i + 1) / 96 * Math.PI * 2;
      const c = ringA * (0.45 + 0.55 * (i % 2));
      v.push(ORBIT_R * Math.cos(a0), 0, ORBIT_R * Math.sin(a0), c * 0.55, c * 0.68, c);
      v.push(ORBIT_R * Math.cos(a1), 0, ORBIT_R * Math.sin(a1), c * 0.55, c * 0.68, c);
    }
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    drawLines(v);
  }

  /* たいようの ひかりの かさ */
  drawBillboard(SUN_POS, SUN_R * 4.2, [1.0, 0.62, 0.20], 2.6);
  drawBillboard(SUN_POS, SUN_R * 1.9, [1.0, 0.84, 0.42], 1.7);
  gl.depthMask(true);
  gl.disable(gl.BLEND);

  /* たいよう */
  const sunModel = mul(translation(SUN_POS), scaling(SUN_R));
  gl.useProgram(P_SUN.p);
  gl.uniformMatrix4fv(P_SUN.u.uMVP, false, mul(VP, sunModel));
  gl.uniformMatrix4fv(P_SUN.u.uModel, false, sunModel);
  gl.uniform1f(P_SUN.u.uTime, S.time);
  gl.uniform3fv(P_SUN.u.uCam, camEye);
  drawSphere(P_SUN);

  /* ひかりの すじ */
  if (S.rays) {
    const v = [];
    const axisA = norm(cross(L, [0, 1, 0])), axisB = norm(cross(L, axisA));
    for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) {
      const off = add(scale(axisA, i * EARTH_R * 0.62), scale(axisB, j * EARTH_R * 0.62));
      const from = add(add(SUN_POS, scale(L, -SUN_R * 0.98)), scale(off, SUN_R / EARTH_R * 0.34));
      const to   = add(add(E, off), scale(L, EARTH_R * 0.55));
      const c = [1.0, 0.78, 0.34];
      v.push(from[0], from[1], from[2], c[0] * 0.06, c[1] * 0.06, c[2] * 0.06);
      v.push(to[0], to[1], to[2], c[0] * 0.85, c[1] * 0.7, c[2] * 0.36);
    }
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false);
    drawLines(v);
    gl.depthMask(true); gl.disable(gl.BLEND);
  }

  /* ちきゅう */
  const M = earthModel();
  gl.useProgram(P_EARTH.p);
  gl.uniformMatrix4fv(P_EARTH.u.uMVP, false, mul(VP, M));
  gl.uniformMatrix4fv(P_EARTH.u.uModel, false, M);
  gl.uniform3fv(P_EARTH.u.uLight, L);
  gl.uniform3fv(P_EARTH.u.uCam, camEye);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, TEX_DAY);
  gl.uniform1i(P_EARTH.u.uDay, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, TEX_NIGHT);
  gl.uniform1i(P_EARTH.u.uNight, 1);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, TEX_HIGH);
  gl.uniform1i(P_EARTH.u.uHigh, 2);
  gl.uniform1f(P_EARTH.u.uTime, S.time);
  drawSphere(P_EARTH);

  /* じてんじく */
  if (S.axis) {
    const ax = xform3(earthRot(), [0, 1, 0]);
    const v = [];
    const a1 = add(E, scale(ax, EARTH_R * 1.55)), a2 = add(E, scale(ax, -EARTH_R * 1.55));
    v.push(a1[0], a1[1], a1[2], 0.55, 0.88, 1.0, a2[0], a2[1], a2[2], 0.55, 0.88, 1.0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    drawLines(v);
    gl.disable(gl.BLEND);
    drawBillboard(a1, 0.30, [0.6, 0.92, 1.0], 2.2);
  }

  /* まちの ピン */
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const pts = [];
  CITIES.forEach(c => { const p = scale(lonLatToVec(c.lon, c.lat), 1.012); pts.push(p[0], p[1], p[2]); });
  gl.useProgram(P_PIN.p);
  gl.uniformMatrix4fv(P_PIN.u.uVP, false, VP);
  gl.uniformMatrix4fv(P_PIN.u.uModel, false, M);
  gl.bindBuffer(gl.ARRAY_BUFFER, pinBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(P_PIN.a.aPos);
  gl.vertexAttribPointer(P_PIN.a.aPos, 3, gl.FLOAT, false, 0, 0);
  CITIES.forEach((c, i) => {
    const on = i === S.city;
    gl.uniform1f(P_PIN.u.uSize, (on ? 17 : 11) * DPR);
    gl.uniform3fv(P_PIN.u.uColor, on ? [0.31, 0.85, 0.78] : [1.0, 0.71, 0.25]);
    gl.drawArrays(gl.POINTS, i, 1);
  });
  gl.disable(gl.BLEND);
}

/* ============================================================
   9. さわって うごかす
   ============================================================ */
const stage = document.getElementById("stage");
let drag = null, pinch = null;

function screenRay(clientX, clientY) {
  const r = glCanvas.getBoundingClientRect();
  const nx = ((clientX - r.left) / r.width) * 2 - 1;
  const ny = 1 - ((clientY - r.top) / r.height) * 2;
  const tanF = Math.tan(42 * RAD / 2);
  const right = [VIEW[0], VIEW[4], VIEW[8]], up = [VIEW[1], VIEW[5], VIEW[9]];
  const fwd = [-VIEW[2], -VIEW[6], -VIEW[10]];
  return norm(add(add(scale(right, nx * (W / H) * tanF), scale(up, ny * tanF)), fwd));
}
function rayHitsEarth(clientX, clientY) {
  const dir = screenRay(clientX, clientY);
  const oc = sub(camEye, earthPos()), rad = EARTH_R * 1.3;
  const b = dot(oc, dir), cc = dot(oc, oc) - rad * rad;
  return b * b - cc > 0 && b < 0;
}
/** さわった ところの けいど・いど（ちきゅうを 外していたら null） */
function hitLonLat(clientX, clientY) {
  const dir = screenRay(clientX, clientY);
  const E = earthPos(), oc = sub(camEye, E);
  const b = dot(oc, dir), cc = dot(oc, oc) - EARTH_R * EARTH_R;
  const disc = b * b - cc;
  if (disc <= 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t <= 0) return null;
  const p = scale(xform3T(earthRot(), sub(add(camEye, scale(dir, t)), E)), 1 / EARTH_R);
  return { lat: Math.asin(clamp(p[1], -1, 1)) * DEG, lon: Math.atan2(p[2], -p[0]) * DEG };
}

/* ---- 国さがし --------------------------------------------------
   ぴったり内側なら その国。外れていても ちかければ その国。
   海ぎわの まちや、太い指のため。tools/guruguru-earth/build-countries.mjs
   の 検算も 同じ規則を つかっている。                               */
const COUNTRY_TOL = 1.5;                       // これいじょう 外れたら 海
function countryRings(c) {
  if (!c._rings) c._rings = c.r.map(s => COUNTRIES.decode(s));
  return c._rings;
}
function countryBox(c) {
  if (!c._box) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const ring of countryRings(c)) for (const [x, y] of ring) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const q = COUNTRIES.q;
    c._box = [x0 / q, y0 / q, x1 / q, y1 / q];
  }
  return c._box;
}
function pointInCountry(lon, lat, c) {
  const q = COUNTRIES.q;
  let inside = false;
  for (const ring of countryRings(c)) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0] / q, yi = ring[i][1] / q, xj = ring[j][0] / q, yj = ring[j][1] / q;
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}
function distToCountry(lon, lat, c) {
  const q = COUNTRIES.q;
  let best = Infinity;
  for (const ring of countryRings(c)) {
    for (let i = 1; i < ring.length; i++) {
      const ax = ring[i-1][0] / q, ay = ring[i-1][1] / q;
      const bx = ring[i][0] / q,   by = ring[i][1] / q;
      const dx = bx - ax, dy = by - ay;
      const t = (dx || dy) ? clamp(((lon - ax) * dx + (lat - ay) * dy) / (dx * dx + dy * dy), 0, 1) : 0;
      const d = Math.hypot(lon - (ax + dx * t), lat - (ay + dy * t));
      if (d < best) best = d;
    }
  }
  return best;
}
function countryAt(lon, lat) {
  const cand = [], inside = [];
  for (const c of COUNTRIES.named) {
    const b = countryBox(c);
    if (lon < b[0] - COUNTRY_TOL || lon > b[2] + COUNTRY_TOL ||
        lat < b[1] - COUNTRY_TOL || lat > b[3] + COUNTRY_TOL) continue;
    (pointInCountry(lon, lat, c) ? inside : cand).push(c);
  }
  if (inside.length === 1) return inside[0];
  let best = null, bestD = COUNTRY_TOL;
  for (const c of (inside.length ? inside : cand)) {
    const d = distToCountry(lon, lat, c);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
const countryById = id => COUNTRIES.named.find(c => c.id === id) || null;

stage.addEventListener("pointerdown", e => {
  /* ボタンや ふきだしの うえでは ちきゅうを まわさない（クリックを じゃましない） */
  if (e.target !== glCanvas) return;
  stage.setPointerCapture(e.pointerId);
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, spin: rayHitsEarth(e.clientX, e.clientY), moved: 0 };
  S.spinVel = 0;
  ac();
});
stage.addEventListener("pointermove", e => {
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX; drag.y = e.clientY;
  drag.moved += Math.abs(dx) + Math.abs(dy);
  if (drag.spin) {
    const d = dx * 0.0072;
    S.spin += d; S.odo += Math.abs(d); S.spinVel = d;
    S.camPitch = clamp(S.camPitch + dy * 0.004, -1.25, 1.25);
  } else {
    S.camYaw -= dx * 0.006;
    S.camPitch = clamp(S.camPitch + dy * 0.005, -1.25, 1.25);
  }
});
function endDrag(e) { if (drag && drag.id === e.pointerId) drag = null; }
stage.addEventListener("pointerup", e => {
  if (drag && drag.id === e.pointerId && drag.moved < 8) {   // ほとんど 動かさなかった＝タップ
    const ll = hitLonLat(e.clientX, e.clientY);
    if (ll) selectCountry(countryAt(ll.lon, ll.lat), ll);
  }
  endDrag(e);
});
stage.addEventListener("pointercancel", endDrag);
stage.addEventListener("wheel", e => {
  e.preventDefault();
  S.camDistTarget = clamp(S.camDistTarget * Math.exp(e.deltaY * 0.0012), 2.9, 26);
}, { passive: false });

/* 2ほんゆびで ズーム */
stage.addEventListener("touchstart", e => {
  if (e.touches.length === 2) {
    pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    drag = null;
  }
}, { passive: true });
stage.addEventListener("touchmove", e => {
  if (e.touches.length === 2 && pinch) {
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    S.camDistTarget = clamp(S.camDistTarget * (pinch / d), 2.9, 26);
    pinch = d;
  }
}, { passive: true });
stage.addEventListener("touchend", () => { pinch = null; }, { passive: true });

/* キーボードでも まわせる */
window.addEventListener("keydown", e => {
  const step = 0.09;
  if (e.key === "ArrowRight") { S.spin += step; S.odo += step; }
  else if (e.key === "ArrowLeft") { S.spin -= step; S.odo += step; }
  else if (e.key === "ArrowUp") S.camPitch = clamp(S.camPitch + 0.06, -1.25, 1.25);
  else if (e.key === "ArrowDown") S.camPitch = clamp(S.camPitch - 0.06, -1.25, 1.25);
  else return;
  e.preventDefault();
});

/* ============================================================
   10. まちの ラベル（3D の うえに かさねる HTML）
   ============================================================ */
const hud = document.getElementById("hud");
const pinEls = CITIES.map((c, i) => {
  const el = document.createElement("button");
  el.className = "pin";
  el.textContent = c.face + " " + c.name;
  el.addEventListener("click", () => selectCity(i));
  hud.appendChild(el);
  return el;
});
/** けいど・いど → 画面の どこか（うら側なら null） */
function projectLonLat(lon, lat, lift = 1.02) {
  const E = earthPos();
  const w = add(E, xform3(mul(earthRot(), scaling(EARTH_R)), scale(lonLatToVec(lon, lat), lift)));
  const n = norm(sub(w, E));
  if (dot(n, norm(sub(camEye, w))) < 0.12) return null;
  const cl = [
    VP[0]*w[0] + VP[4]*w[1] + VP[8]*w[2] + VP[12],
    VP[1]*w[0] + VP[5]*w[1] + VP[9]*w[2] + VP[13],
    VP[3]*w[0] + VP[7]*w[1] + VP[11]*w[2] + VP[15]
  ];
  if (cl[2] <= 0) return null;
  return { x: (cl[0] / cl[2] * 0.5 + 0.5) * W, y: (0.5 - cl[1] / cl[2] * 0.5) * H };
}

/* えらんだ国の ふきだし */
const countryPin = document.createElement("button");
countryPin.className = "pin pin-country is-hidden";
countryPin.addEventListener("click", () => {
  const c = countryById(S.countryId);
  if (c) { speak(c.k); sfx.tap(); }
});
hud.appendChild(countryPin);

function updateCountryPin() {
  const c = countryById(S.countryId);
  if (!c) { countryPin.classList.add("is-hidden"); return; }
  const p = projectLonLat(c.p[0], c.p[1], 1.03);
  if (!p) { countryPin.classList.add("is-hidden"); return; }
  countryPin.classList.remove("is-hidden");
  countryPin.textContent = "🔊 " + c.n;
  countryPin.style.left = p.x + "px";
  countryPin.style.top = p.y + "px";
}

function updatePins() {
  updateCountryPin();
  const M = earthModel(), E = earthPos();
  const zoomedOut = S.camDist > 9;   // ひいた ときは えらんだ まちだけ
  CITIES.forEach((c, i) => {
    const local = scale(lonLatToVec(c.lon, c.lat), 1.02);
    const w = add(E, xform3(mul(earthRot(), scaling(EARTH_R)), local));
    const n = norm(sub(w, E));
    const toCam = norm(sub(camEye, w));
    const el = pinEls[i];
    if (dot(n, toCam) < 0.12 || (zoomedOut && i !== S.city)) { el.classList.add("is-hidden"); return; }
    const cl = [
      VP[0]*w[0] + VP[4]*w[1] + VP[8]*w[2] + VP[12],
      VP[1]*w[0] + VP[5]*w[1] + VP[9]*w[2] + VP[13],
      VP[3]*w[0] + VP[7]*w[1] + VP[11]*w[2] + VP[15]
    ];
    if (cl[2] <= 0) { el.classList.add("is-hidden"); return; }
    const sx = (cl[0] / cl[2] * 0.5 + 0.5) * W;
    const sy = (0.5 - cl[1] / cl[2] * 0.5) * H;
    el.classList.remove("is-hidden");
    el.classList.toggle("is-active", i === S.city);
    el.style.left = sx + "px";
    el.style.top = (sy - 20) + "px";
  });
}
