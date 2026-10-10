// 線形（平面・縦断）の生成と、距離 s(m) → 座標の変換。
//
// 座標系: x=東, y=上, z=南（北は -z）。方位 bearing は北=0 の時計回り（ラジアン）。
//   進行方向 f = (sin b, -cos b)、右 r = (cos b, sin b)。
// 線路の中心線は「上下線のまん中」。自列車（下り）は左側 = 横位置 -halfSpacing を走る。

const STEP = 1;          // 平面線形の刻み (m)
const H_STEP = 5;        // 縦断線形の刻み (m)
export const MAX_GRADE = 35;   // ‰
const VC_WINDOW = 150;   // 縦曲線をつくる移動平均の幅 (m)
const ISLAND_WIDTH = 7;  // 島式ホームの幅 (m)
const PLATFORM_GAP = 1.45; // 線路中心 → ホーム端 (m)

/** 曲率（右曲がりが正、1/m）。両端に緩和曲線を入れる。 */
export function curvatureAt(curves, transition, s) {
  for (const c of curves) {
    if (s <= c.start || s >= c.end) continue;
    const k = (c.dir === "R" ? 1 : -1) / c.radius;
    const t = Math.min(transition, (c.end - c.start) / 2);
    if (s < c.start + t) return k * (s - c.start) / t;
    if (s > c.end - t) return k * (c.end - s) / t;
    return k;
  }
  return 0;
}

function structureIndex(structures, s) {
  for (let i = 0; i < structures.length; i++) {
    const st = structures[i];
    if (s >= st.start && s < st.end) return i;
  }
  return -1;
}

/** 縦断線形: 目標高さ → 勾配制限（前後から）→ 移動平均。h[i] は s = sMin + i*H_STEP の高さ */
export function buildProfile(structures, sMin, sMax, maxGrade = MAX_GRADE) {
  const n = Math.ceil((sMax - sMin) / H_STEP) + 1;
  const target = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const k = structureIndex(structures, sMin + i * H_STEP);
    target[i] = k >= 0 ? structures[k].height : 0;
  }
  const g = maxGrade / 1000 * H_STEP;
  const f = new Float64Array(n), b = new Float64Array(n);
  f[0] = target[0];
  for (let i = 1; i < n; i++) f[i] = Math.min(Math.max(target[i], f[i - 1] - g), f[i - 1] + g);
  b[n - 1] = target[n - 1];
  for (let i = n - 2; i >= 0; i--) b[i] = Math.min(Math.max(target[i], b[i + 1] - g), b[i + 1] + g);
  const avg = new Float64Array(n);
  for (let i = 0; i < n; i++) avg[i] = (f[i] + b[i]) / 2;
  // 移動平均（端は端の値でのばす）。勾配の上限は平均しても超えない。
  const w = Math.round(VC_WINDOW / H_STEP / 2);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = -w; j <= w; j++) sum += avg[Math.min(n - 1, Math.max(0, i + j))];
    out[i] = sum / (2 * w + 1);
  }
  return { h: out, step: H_STEP, sMin };
}

function smoothstep(x) { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }

/** 上下線の中心間隔の半分。島式ホームの駅では線路を広げる。 */
export function halfSpacingAt(route, s) {
  const base = route.meta.trackSpacing / 2;
  const wide = PLATFORM_GAP + ISLAND_WIDTH / 2;
  let o = base;
  for (const st of route.stations) {
    if (st.platform !== "island") continue;
    const p0 = st.stop + 15 - st.length, p1 = st.stop + 15;
    const ramp = 150;
    let w = 0;
    if (s >= p0 && s <= p1) w = 1;
    else if (s < p0) w = smoothstep(1 - (p0 - s) / ramp);
    else w = smoothstep(1 - (s - p1) / ramp);
    o = Math.max(o, base + (wide - base) * w);
  }
  return o;
}

export function buildAlignment(route) {
  const sMin = route.sMin, sMax = route.sMax;
  const n = Math.ceil((sMax - sMin) / STEP) + 1;
  const X = new Float64Array(n), Z = new Float64Array(n), B = new Float64Array(n);
  const K = new Float64Array(n), Y = new Float64Array(n), O = new Float64Array(n);
  const T = new Int8Array(n); // 構造物の種別番号

  // 平面線形: 曲率を積分して方位、方位を積分して座標（中点則）
  const b0 = route.meta.startBearing * Math.PI / 180;
  // 起点（s=0）を原点にするため、まず sMin から積分してあとで平行移動する
  B[0] = b0; X[0] = 0; Z[0] = 0;
  for (let i = 0; i < n; i++) K[i] = curvatureAt(route.curves, route.transition, sMin + i * STEP);
  for (let i = 1; i < n; i++) {
    const kMid = curvatureAt(route.curves, route.transition, sMin + (i - 0.5) * STEP);
    B[i] = B[i - 1] + kMid * STEP;
    const bm = B[i - 1] + kMid * STEP / 2;
    X[i] = X[i - 1] + Math.sin(bm) * STEP;
    Z[i] = Z[i - 1] - Math.cos(bm) * STEP;
  }
  // s<0 の区間で曲がっていると起点の方位がずれるので、s=0 で startBearing になるよう回す
  const i0 = Math.round((0 - sMin) / STEP);
  const rot = b0 - B[i0], cr = Math.cos(rot), sr = Math.sin(rot);
  const ox = X[i0], oz = Z[i0];
  for (let i = 0; i < n; i++) {
    const dx = X[i] - ox, dz = Z[i] - oz;
    // 方位を +rot 回す = 画面上で時計回りに回す（x=東, z=南 では (x,z) の回転と同じ向き）
    X[i] = dx * cr - dz * sr;
    Z[i] = dx * sr + dz * cr;
    B[i] += rot;
  }

  const prof = buildProfile(route.structures, sMin, sMax);
  const TYPES = ["ground", "tunnel", "cut", "elev", "bridge"];
  for (let i = 0; i < n; i++) {
    const s = sMin + i * STEP;
    const fi = (s - sMin) / prof.step, j = Math.min(prof.h.length - 2, Math.floor(fi));
    const t = fi - j;
    Y[i] = prof.h[j] * (1 - t) + prof.h[j + 1] * t;
    O[i] = halfSpacingAt(route, s);
    const k = structureIndex(route.structures, s);
    T[i] = k >= 0 ? TYPES.indexOf(route.structures[k].type) : 0;
  }

  const clampS = s => Math.min(sMax, Math.max(sMin, s));
  const lerp = (A, s) => {
    const fi = (clampS(s) - sMin) / STEP;
    const j = Math.min(n - 2, Math.floor(fi)), t = fi - j;
    return A[j] * (1 - t) + A[j + 1] * t;
  };
  const idx = s => Math.min(n - 1, Math.max(0, Math.round((s - sMin) / STEP)));

  const al = {
    sMin, sMax, n, step: STEP, X, Z, B, Y, K, O, T, TYPES,
    x: s => lerp(X, s),
    z: s => lerp(Z, s),
    height: s => lerp(Y, s),
    bearing: s => lerp(B, s),
    curvature: s => lerp(K, s),
    halfSpacing: s => lerp(O, s),
    /** 勾配 ‰（進行方向に上りが正） */
    grade: s => {
      const d = 2;
      return (lerp(Y, s + d) - lerp(Y, s - d)) / (2 * d) * 1000;
    },
    type: s => TYPES[T[idx(s)]],
    inTunnel: s => T[idx(s)] === 1,
    /** 中心線から右に lateral(m)、レール面から上に up(m) の点 */
    point(s, lateral = 0, up = 0, out = [0, 0, 0]) {
      const b = lerp(B, s);
      out[0] = lerp(X, s) + Math.cos(b) * lateral;
      out[1] = lerp(Y, s) + up;
      out[2] = lerp(Z, s) + Math.sin(b) * lateral;
      return out;
    },
    /** 自列車の線路（下り＝左側）の横位置 */
    downTrack: s => -lerp(O, s),
    upTrack: s => lerp(O, s),
  };
  return al;
}
