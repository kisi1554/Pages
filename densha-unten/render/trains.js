// 先行列車（尾灯つき）と対向列車（前照灯つき）。車体は InstancedMesh で毎フレーム置きなおす。

import { GeoBuilder, Renderer, material, hex } from "./gl.js";

const CAR_W = 2.8, CAR_H = 2.9, CAR_L = 19.5, FLOOR = 1.15;

function sideCanvas(lineColor) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 96;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 96);
  grd.addColorStop(0, "#d9dde0"); grd.addColorStop(1, "#aeb3b7");
  g.fillStyle = grd; g.fillRect(0, 0, 512, 96);
  // 4つのドアと窓（u: 前→後ろ）
  const door = x => { g.fillStyle = "#8f969b"; g.fillRect(x, 18, 24, 72); g.fillStyle = "#2c3640"; g.fillRect(x + 4, 24, 16, 26); };
  [40, 170, 300, 430].forEach(door);
  g.fillStyle = "#26313a";
  for (const [x, w] of [[8, 26], [72, 92], [202, 92], [332, 92], [462, 40]]) g.fillRect(x, 24, w, 28);
  g.fillStyle = lineColor; g.fillRect(0, 56, 512, 9);
  g.fillStyle = "#6c7378"; g.fillRect(0, 90, 512, 6);
  return c;
}

export function createTrainSet(R, route) {
  const body = new GeoBuilder();
  body.box(0, FLOOR + CAR_H / 2, 0, CAR_W, CAR_H, CAR_L, [0, 0, 1, 0, 1, 1, 0, 1]);
  // 前面・後面の窓（少しだけ外に出した板）
  const glass = new GeoBuilder();
  for (const z of [-CAR_L / 2 - 0.02, CAR_L / 2 + 0.02]) glass.box(0, FLOOR + 2.15, z, CAR_W - 0.5, 1.0, 0.02);
  const lamp = new GeoBuilder(); lamp.box(0, 0, 0, 1, 1, 1);
  const mats = {
    body: material([1, 1, 1], { map: R.texture(sideCanvas(route.meta.lineColor)) }),
    glass: material("#1d2329"),
    tail: material("#000000", { unlit: true, emissive: hex("#ff2a1a") }),
    head: material("#000000", { unlit: true, emissive: hex("#fffbe8") }),
  };
  const MAX = 40;
  return {
    body: R.instanced(body, mats.body, MAX),
    glass: R.instanced(glass, mats.glass, MAX),
    tail: R.instanced(lamp, mats.tail, 16),
    head: R.instanced(lamp, mats.head, 16),
  };
}

/**
 * 列車を置く。trains: [{ head, dir: +1(下り)/-1(上り), track: "down"/"up", lights: "tail"/"head" }]
 * camS: カメラの位置。遠すぎる車両は置かない。
 */
export function placeTrains(set, al, veh, trains, camS, camPos) {
  for (const k of ["body", "glass", "tail", "head"]) { set[k].n = 0; set[k].origin = camPos; set[k].dirty = true; }
  for (const tr of trains) {
    for (let c = 0; c < veh.cars; c++) {
      const sc = tr.head - tr.dir * (veh.carLength / 2 + c * veh.carLength);
      if (sc < camS - 300 || sc > camS + 2200 || sc < al.sMin || sc > al.sMax) continue;
      const lat = tr.track === "down" ? al.downTrack(sc) : al.upTrack(sc);
      const p = al.point(sc, lat, 0);
      const bear = al.bearing(sc) + (tr.dir < 0 ? Math.PI : 0);
      const pitch = Math.atan(al.grade(sc) / 1000) * tr.dir;
      Renderer.addInstance(set.body, p, bear, pitch, 1, 1, 1);
      Renderer.addInstance(set.glass, p, bear, pitch, 1, 1, 1);
      // 先頭車の前照灯 / 最後尾の尾灯
      const end = tr.lights === "head" ? (c === 0 ? -1 : 0) : (c === veh.cars - 1 ? 1 : 0);
      if (end) {
        const se = sc + (tr.dir * -end) * (CAR_L / 2 + 0.05);
        for (const x of [-0.95, 0.95]) {
          const q = al.point(se, lat + x * (tr.dir < 0 ? -1 : 1), FLOOR + 0.95);
          Renderer.addInstance(tr.lights === "head" ? set.head : set.tail, q, bear, 0, 0.42, 0.3, 0.08);
        }
      }
    }
  }
}
