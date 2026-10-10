// 逆方向（上り）の路線をつくる。路線JSON は下り方向で書き、上りはここで自動生成する。
// 距離 s を L - s（L は終着駅の停止位置）に置きかえ、駅・区間を逆順にし、曲線の左右を入れかえる。
// 自列車はいつも中心線の左の線路を走るので、逆向きでは元の右の線路（上り線）を走ることになる。

import { buildAlignment } from "./alignment.js";

const flipRange = (L, r) => ({ ...r, start: L - r.end, end: L - r.start });
const byStart = (a, b) => a.start - b.start;

/** validateRoute 済みの路線（下り）から、上りの路線をつくる */
export function reverseRoute(route) {
  const first = route.stations[0].stop;
  const L = route.stations[route.stations.length - 1].stop;
  // 終点での向きの逆が、上りの起点の向き
  const al = buildAlignment(route);
  const endBearing = al.bearing(L) * 180 / Math.PI;
  const stations = route.stations.slice().reverse().map(st => {
    // ドアの側は、ホームの形から上り線で決めなおす（相対式=左、島式=右）
    const { doors, ...rest } = st;
    void doors;
    return { ...rest, stop: L - st.stop, doors: st.platform === "island" ? "right" : "left" };
  });
  const s0 = stations[0], s1 = stations[stations.length - 1];
  const tt = route.timetable;
  return {
    ...route,
    meta: {
      ...route.meta,
      direction: "up",
      startBearing: ((endBearing + 180) % 360 + 360) % 360,
      service: `${tt.type} ${s0.name} → ${s1.name}`,
      serviceKana: `${tt.typeKana || tt.type} ${s0.kana} → ${s1.kana}`,
    },
    stations,
    curves: route.curves.map(c => ({ ...flipRange(L, c), dir: c.dir === "L" ? "R" : "L" })).sort(byStart),
    structures: route.structures.map(r => flipRange(L, r)).sort(byStart),
    speedLimits: route.speedLimits.map(r => flipRange(L, r)).sort(byStart),
    rivers: route.rivers.map(r => flipRange(L, r)).sort(byStart),
    dense: route.dense.map(r => flipRange(L, r)).sort(byStart),
    sMin: s0.stop - 400,
    sMax: s1.stop + 400,
  };
}

/** 方向つきの路線。direction が "up" なら逆向きをつくる */
export function routeFor(route, direction) {
  return direction === "up" ? reverseRoute(route) : route;
}
