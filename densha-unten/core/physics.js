// 車両の運動計算。描画に依存しない純粋な関数だけを置く。
// 速度 v は km/h（後退は負）、加速度は km/h/s、抵抗は N/kN。

export const EB = -8;            // 非常ブレーキのノッチ番号
export const MAX_NOTCH = 5;      // P5
export const MAX_DT = 1 / 60;    // 1刻みの最大時間 (s)

/** ノッチ番号 → 表示名 */
export function notchLabel(n) {
  if (n > 0) return "P" + n;
  if (n === 0) return "N";
  if (n === EB) return "EB";
  return "B" + (-n);
}

/** 引張力（起動加速度に対する割合をかけた加速度, km/h/s） */
export function tractionAccel(veh, startAccel, v) {
  const { constantUntil: v1, inverseUntil: v2 } = veh.tractionCurve;
  const a = Math.abs(v);
  if (a <= v1) return startAccel;
  if (a <= v2) return startAccel * v1 / a;
  return startAccel * v1 * v2 / (a * a);
}

/** 走行抵抗 N/kN */
export function runningResistance(veh, v, inTunnel) {
  const r = veh.resistance, a = Math.abs(v);
  return r.a + r.b * a + (inTunnel ? r.cTunnel : r.c) * a * a;
}

/** ノッチ → 目標の力行（起動加速度）と目標のブレーキ減速度 */
export function notchTargets(veh, notch) {
  if (notch > 0) return { power: veh.powerNotches[Math.min(notch, veh.powerNotches.length) - 1], brake: 0 };
  if (notch === 0) return { power: 0, brake: 0 };
  if (notch <= EB) return { power: 0, brake: veh.emergencyBrake };
  return { power: 0, brake: veh.brakeNotches[Math.min(-notch, veh.brakeNotches.length) - 1] };
}

export function createTrainState(s = 0) {
  return {
    s,            // 先頭の位置 (m)
    v: 0,         // 速度 (km/h)
    notch: -7,    // 運転士のノッチ
    power: 0,     // 実際に出ている力行（起動加速度換算, km/h/s）
    brake: 0,     // 実際に出ているブレーキ減速度 (km/h/s)
    accel: 0,     // 直前の刻みの加速度 (km/h/s)
    atcBrake: false,
  };
}

function approach(cur, target, up, down, dt) {
  if (target > cur) return Math.min(target, cur + up * dt);
  return Math.max(target, cur - down * dt);
}

/**
 * 1刻み進める（dt は MAX_DT 以下を想定）。
 * env: { grade ‰（編成中央、上りが正）, curvature 1/m, inTunnel, doorsClosed, atcBrake km/h/s(0なら無し) }
 */
export function stepTrain(st, veh, env, dt) {
  const t = notchTargets(veh, st.notch);
  const atc = env.atcBrake || 0;
  const brakeTarget = Math.max(t.brake, atc);
  const powerTarget = brakeTarget > 0 || !env.doorsClosed ? 0 : t.power;
  const rs = veh.response;
  st.power = approach(st.power, powerTarget, rs.powerUp, rs.powerDown, dt);
  // 非常ブレーキは込めの速さを上げる
  const bUp = st.notch <= EB ? rs.brakeUp * 1.5 : rs.brakeUp;
  st.brake = approach(st.brake, brakeTarget, bUp, rs.brakeDown, dt);
  st.atcBrake = atc > 0;

  const k = veh.kmhPerNkn;
  const drive = tractionAccel(veh, st.power, st.v) - (env.grade || 0) * k; // 進行方向が正
  const curveRes = env.curvature ? veh.resistance.curve * Math.abs(env.curvature) : 0;
  // 動きをさまたげる力（大きさ）。停止中は静止摩擦のようにはたらく
  const resist = st.brake + (runningResistance(veh, st.v, env.inTunnel) + curveRes) * k;

  let a;
  const v0 = st.v;
  if (Math.abs(v0) > 1e-6) {
    a = drive - Math.sign(v0) * resist;
    let v1 = v0 + a * dt;
    if (Math.sign(v1) !== Math.sign(v0) && Math.abs(drive) <= resist) v1 = 0; // 止まりきる
    st.v = v1;
  } else if (Math.abs(drive) > resist) {
    a = drive - Math.sign(drive) * resist;   // 動き出す（勾配での転動もここ）
    st.v = a * dt;
  } else {
    a = 0; st.v = 0;
  }
  st.accel = (st.v - v0) / dt;
  st.s += (v0 + st.v) / 2 / 3.6 * dt;
  return st;
}

/** 経過時間 dt を MAX_DT 以下に分けて進める。fnEnv(st) は刻みごとの環境を返す */
export function advance(st, veh, fnEnv, dt) {
  const n = Math.max(1, Math.ceil(dt / MAX_DT - 1e-9));
  const h = dt / n;
  for (let i = 0; i < n; i++) stepTrain(st, veh, fnEnv(st), h);
  return st;
}

/** BC圧 (kPa) の表示用 */
export function bcPressure(veh, st) {
  return st.brake / veh.emergencyBrake * veh.bcMax;
}
