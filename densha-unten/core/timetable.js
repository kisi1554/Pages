// 基準運転時分（自動運転シミュレーション）とダイヤ・先行列車の走行記録。

import { tractionAccel, runningResistance } from "./physics.js";
import { speedLimitAt } from "./atc.js";

const STOP_DECEL = 0.62;            // m/s²
const STOP_DECEL_KMH = STOP_DECEL * 3.6;
const DT = 0.1;

/**
 * 駅 s0 で止まっている状態から、s1 にぴったり止まるまでを理想的に運転する。
 * 制限速度の3km/h下を目標に P5 で加速 → 惰行 → 0.62m/s² で減速して停止。
 * onSample(t, s, v) を DT ごとに呼ぶ。所要時間 (s) を返す。
 */
export function autoRun(route, al, veh, s0, s1, onSample) {
  const k = veh.kmhPerNkn;
  const pStart = veh.powerNotches[veh.powerNotches.length - 1];
  let s = s0, v = 0, t = 0, powering = true;
  const limits = route.speedLimits;
  onSample && onSample(t, s, v);
  for (let guard = 0; guard < 20000; guard++) {
    const dStop = s1 - s;
    if (dStop <= 0.01 && v < 0.5) break;
    const vt = speedLimitAt(route, s) - 3;
    const vm = v / 3.6;
    let a;
    // 停止: 止まるのに必要な減速度が 0.62 に達したら、その減速度でぴったり止める
    const need = dStop > 0.05 ? vm * vm / (2 * dStop) : Infinity;
    let brakeFor = null;
    if (need >= STOP_DECEL) brakeFor = need * 3.6;
    else {
      for (const L of limits) {
        if (L.start <= s || L.start - s > 3000) continue;
        const tgt = (L.speed - 3) / 3.6;
        if (vm > tgt && (vm * vm - tgt * tgt) / (2 * (L.start - s)) >= STOP_DECEL) { brakeFor = STOP_DECEL_KMH; break; }
      }
    }
    const mid = s - veh.length / 2;
    const res = (runningResistance(veh, v, al.inTunnel(s)) + veh.resistance.curve * Math.abs(al.curvature(mid)) + al.grade(mid)) * k;
    if (brakeFor != null) a = -Math.min(brakeFor, 4.5);
    else if (v > vt + 0.5) a = -STOP_DECEL_KMH * 0.5;
    else {
      if (v >= vt) powering = false;
      else if (v < vt - 8) powering = true;
      a = (powering ? tractionAccel(veh, pStart, v) : 0) - res;
    }
    let v1 = v + a * DT;
    if (v1 < 0) v1 = 0;
    s += (v + v1) / 2 / 3.6 * DT;
    v = v1;
    t += DT;
    if (brakeFor != null && v === 0) { s = Math.max(s, s1); break; }
    onSample && onSample(t, s, v);
  }
  onSample && onSample(t, s1, 0);
  return t;
}

const ceil5 = x => Math.ceil(x / 5 - 1e-9) * 5;

/** 各駅間の基準運転時分（秒、補正前） */
export function computeRunTimes(route, al, veh) {
  const out = [];
  for (let i = 0; i + 1 < route.stations.length; i++) {
    out.push(autoRun(route, al, veh, route.stations[i].stop, route.stations[i + 1].stop));
  }
  return out;
}

/**
 * 時刻表。駅間の時分に5%の余裕と4秒を足し、5秒単位に切り上げる。
 * rows[i] = { station, arr, dep, run }（時刻はその日の0時からの秒）
 */
export function buildTimetable(route, runTimes, firstDeparture = route.timetable.firstDeparture) {
  const rows = [];
  let dep = firstDeparture;
  route.stations.forEach((st, i) => {
    if (i === 0) { rows.push({ station: st, arr: null, dep, run: 0 }); return; }
    const run = ceil5(runTimes[i - 1] * 1.05 + 4);
    const arr = dep + run;
    const last = i === route.stations.length - 1;
    dep = last ? null : arr + st.dwell;
    rows.push({ station: st, arr, dep, run });
  });
  return rows;
}

/**
 * 先行列車の走行記録。時刻表どおりに（headway 秒前に）発車し、早く着いたら発車時刻まで待つ。
 * 終着に着いたら turnback 秒後に消える（折り返し）。
 */
export function simulateLeader(route, al, veh, rows, headway = route.timetable.headway, turnback = 60) {
  const T = [], S = [];
  const push = (t, s) => {
    if (T.length && t <= T[T.length - 1]) { S[S.length - 1] = s; return; }
    T.push(t); S.push(s);
  };
  push(rows[0].dep - headway - 3600, route.stations[0].stop);
  for (let i = 0; i + 1 < rows.length; i++) {
    const t0 = rows[i].dep - headway;
    push(t0, route.stations[i].stop);
    let last = -1;
    const tEnd = t0 + autoRun(route, al, veh, route.stations[i].stop, route.stations[i + 1].stop, (t, s) => {
      if (t - last >= 1) { push(t0 + t, s); last = t; }
    });
    push(tEnd, route.stations[i + 1].stop);
  }
  const lastArr = T[T.length - 1];
  return { T, S, until: lastArr + turnback };
}

/** 走行記録から時刻 t の位置。消えていれば null */
export function leaderPositionAt(rec, t) {
  const { T, S } = rec;
  if (t > rec.until) return null;
  if (t <= T[0]) return S[0];
  if (t >= T[T.length - 1]) return S[S.length - 1];
  let lo = 0, hi = T.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
  const u = (t - T[lo]) / (T[hi] - T[lo]);
  return S[lo] + (S[hi] - S[lo]) * u;
}

/** 対向列車（上り線を駅に止まらず一定速度で走る）の先頭位置の一覧 */
export function oncomingPositions(route, t, from, to) {
  const { speed, interval } = route.timetable.oncoming;
  const v = speed / 3.6, gap = v * interval;
  const base = route.sMax - v * (t - route.timetable.startTime); // 0番目の列車
  const out = [];
  // base + k*gap が [from, to+gap] に入る k
  const kMin = Math.ceil((from - base) / gap), kMax = Math.floor((to + 200 - base) / gap);
  for (let k = kMin; k <= kMax; k++) {
    const s = base + k * gap;
    if (s >= route.sMin && s <= route.sMax + 200) out.push(s);
  }
  return out;
}
