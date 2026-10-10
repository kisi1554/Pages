// ATC（車内信号）の計算。線路を閉そく区間に分け、先頭がいる区間の信号を求める。

const toMs = v => v / 3.6, toKmh = v => v * 3.6;

/** 位置 s の制限速度（重なっていれば低いほう。どこにも無ければ最高速度） */
export function speedLimitAt(route, s) {
  let v = route.meta.maxSpeed;
  for (const L of route.speedLimits) if (s >= L.start && s < L.end) v = Math.min(v, L.speed);
  return v;
}

/** 区間 [a, b) にかかる制限の最小値 */
export function speedLimitIn(route, a, b) {
  let v = route.meta.maxSpeed;
  for (const L of route.speedLimits) if (L.start < b && L.end > a) v = Math.min(v, L.speed);
  return v;
}

/** 距離 d (m) で速度 vEnd まで減速度 decel (m/s²) で落とせる速度 km/h */
export function patternSpeed(vEnd, d, decel) {
  return toKmh(Math.sqrt(toMs(vEnd) ** 2 + 2 * decel * Math.max(0, d)));
}

/** 段階に切り下げ */
export function floorToStep(steps, v) {
  let out = steps[0];
  for (const st of steps) if (st <= v + 1e-9) out = st;
  return out;
}

export const blockOf = (atc, s) => Math.floor(s / atc.blockLength);

/** 線路の終端（終着駅の先）。ここから先は 0 */
export function trackEnd(route) {
  return route.stations[route.stations.length - 1].stop + 60;
}

/**
 * 信号の値 (km/h)。
 * leaderTail: 先行列車の最後尾の位置（いなければ null）
 */
export function computeSignal(route, s, leaderTail = null) {
  const atc = route.atc;
  const L = atc.blockLength;
  const i = blockOf(atc, s);
  const b0 = i * L, b1 = b0 + L;
  const end = trackEnd(route);
  // 1. 区間に掛かる制限
  let v = speedLimitIn(route, b0, b1);
  // 2. 前方の制限区間まで減速できる速度（区間の出口からの距離で計算）
  for (const lim of route.speedLimits) {
    if (lim.start >= b1 && lim.start - b1 < 4000) v = Math.min(v, patternSpeed(lim.speed, lim.start - b1, atc.patternDecel));
  }
  // 線路の終端: 終端のある区間は最低段（25）、その手前はそこまで落とせる速度
  const creep = atc.steps.find(x => x > 0) || 25;
  if (end <= b0) v = 0;
  else if (end <= b1) v = Math.min(v, creep);
  else v = Math.min(v, patternSpeed(creep, end - b1, atc.patternDecel));
  // 3. 先行列車の最後尾がいる区間の手前で止まれる速度
  if (leaderTail != null) {
    const j = blockOf(atc, leaderTail);
    if (j <= i + 1) v = 0;
    else v = Math.min(v, patternSpeed(0, j * L - b1, atc.patternDecel));
  }
  return floorToStep(atc.steps, v);
}

/**
 * ATC常用ブレーキの判定（ヒステリシスつき）。
 * 信号を超えたら掛け、信号以下に下がったら緩める。信号0では止まるまで掛けつづける。
 */
export function updateAtcBrake(prev, v, signal) {
  if (signal === 0) return true; // 停止中も掛けつづける
  if (v > signal + 0.5) return true;
  if (prev && v > signal) return true;
  return false;
}
