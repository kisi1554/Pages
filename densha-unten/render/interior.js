// 乗客視点: 客室（長いす・窓・ドア・ドア上の案内表示）と、長いすに座った人の目のカメラ。
// 客室の形は「車両の中の座標」でつくり、毎フレーム 車両の位置・向きに合わせて置く（InstancedMesh 1つずつ）。
// 車両の中の座標: x=右, y=上（レール面から）, z=後ろ（-z が前）

import { GeoBuilder, Renderer, material, hex } from "./gl.js";
import { FONT } from "./stations.js";

const FLOOR = 1.15;          // 床の高さ（レール面から）
const HALF_W = 1.4;          // 客室の内のりの半幅
const CEIL = FLOOR + 2.3;    // 天井
const SILL = FLOOR + 0.9;    // 窓の下
const WTOP = FLOOR + 1.85;   // 窓の上・ドアの上
const DOOR_W = 1.3;          // ドアの幅（両開き）
const WALL_T = 0.06;

/** ドアの位置（z）。20m 車は4つ、18m 車は3つ */
export function doorPositions(carLength) {
  const L = carLength - 0.5, n = carLength >= 19 ? 4 : 3;
  const step = L / n;
  return Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * step);
}

function mix(a, b, t) { return a.map((v, i) => v + (b[i] - v) * t); }
/** 室内は明るく見えるよう、色の半分ほどを発光にする（トンネルでも暗くならない） */
function lit(c, k = 0.35) { const col = typeof c === "string" ? hex(c) : c; return material(col, { emissive: col.map(v => v * k) }); }

export function createInterior(R, route, veh) {
  const L = veh.carLength - 0.5, Z = L / 2;
  const doors = doorPositions(veh.carLength);
  const line = hex(route.meta.lineColor);
  const G = { wall: new GeoBuilder(), floor: new GeoBuilder(), ceil: new GeoBuilder(), seat: new GeoBuilder(), back: new GeoBuilder(),
    light: new GeoBuilder(), pole: new GeoBuilder(), band: new GeoBuilder(), lcdFrame: new GeoBuilder(), lcd: new GeoBuilder(), glass: new GeoBuilder() };
  const box = (k, x0, x1, y0, y1, z0, z1) => G[k].box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));

  // 床・天井・照明
  box("floor", -HALF_W, HALF_W, FLOOR - 0.05, FLOOR, -Z, Z);
  box("ceil", -HALF_W, HALF_W, CEIL, CEIL + 0.05, -Z, Z);
  for (const x of [-0.55, 0.55]) box("light", x - 0.09, x + 0.09, CEIL - 0.04, CEIL, -Z + 0.6, Z - 0.6);

  // 区間: ドアの開口と、そのあいだ（窓・長いす）
  const openings = doors.map(z => [z - DOOR_W / 2, z + DOOR_W / 2]);
  const spans = [];
  let z0 = -Z;
  for (const [a, b] of openings) { spans.push([z0, a]); z0 = b; }
  spans.push([z0, Z]);

  for (const sd of [-1, 1]) {
    const xi = sd * HALF_W, xo = sd * (HALF_W + WALL_T);
    // 窓より上（ドアの上もつながっている）
    box("wall", xi, xo, WTOP, CEIL, -Z, Z);
    // ラインカラーの帯（窓の上）
    box("band", xi - sd * 0.005, xi, WTOP + 0.05, WTOP + 0.12, -Z, Z);
    for (const [a, b] of spans) {
      // 窓の下の壁
      box("wall", xi, xo, FLOOR, SILL, a, b);
      // 窓わくの柱（両はしと、まん中の仕切り）
      const m = (a + b) / 2;
      for (const zc of [a + 0.1, m, b - 0.1]) box("wall", xi, xo, SILL, WTOP, zc - (zc === m ? 0.04 : 0.1), zc + (zc === m ? 0.04 : 0.1));
      // 長いす: 座面・背もたれ・すそ
      const s0 = a + (a === -Z ? 0.15 : 0.25), s1 = b - (b === Z ? 0.15 : 0.25);
      if (s1 - s0 > 0.8) {
        box("seat", xi - sd * 0.5, xi, FLOOR + 0.36, FLOOR + 0.46, s0, s1);
        box("back", xi - sd * 0.12, xi, FLOOR + 0.46, SILL - 0.02, s0, s1);
        box("wall", xi - sd * 0.46, xi, FLOOR, FLOOR + 0.36, s0, s1);
        // 袖仕切りと手すり
        for (const zz of [s0, s1]) {
          box("pole", xi - sd * 0.55, xi, FLOOR + 0.46, FLOOR + 0.5, zz - 0.02, zz + 0.02);
          box("pole", xi - sd * 0.57, xi - sd * 0.53, FLOOR + 0.46, CEIL, zz - 0.02, zz + 0.02);
        }
      }
    }
    // ドアの上の案内表示（LCD）
    for (const z of doors) {
      box("lcdFrame", xi - sd * 0.07, xi, WTOP + 0.14, WTOP + 0.42, z - 0.42, z + 0.42);
      // 表示面（室内を向いた1枚）
      const x = xi - sd * 0.072;
      const P = (zz, y) => [x, y, zz];
      const y0 = WTOP + 0.17, y1 = WTOP + 0.39, za = z - 0.38, zb = z + 0.38;
      // 室内から見て読める向き: 右の壁(sd=+1)は手前(-z)が左、左の壁は奥(+z)が左
      if (sd > 0) G.lcd.quad(P(za, y0), P(zb, y0), P(zb, y1), P(za, y1), [-1, 0, 0]);
      else G.lcd.quad(P(zb, y0), P(za, y0), P(za, y1), P(zb, y1), [1, 0, 0]);
    }
  }
  // 車端の壁（貫通扉の窓）
  for (const zs of [-1, 1]) {
    const z = zs * Z;
    box("wall", -HALF_W, -0.45, FLOOR, CEIL, z, z + zs * WALL_T);
    box("wall", 0.45, HALF_W, FLOOR, CEIL, z, z + zs * WALL_T);
    box("wall", -0.45, 0.45, FLOOR, FLOOR + 0.95, z, z + zs * WALL_T);
    box("wall", -0.45, 0.45, FLOOR + 1.75, CEIL, z, z + zs * WALL_T);
    box("glass", -0.45, 0.45, FLOOR + 0.95, FLOOR + 1.75, z + zs * 0.02, z + zs * 0.03);
  }
  // つり革の棒
  for (const x of [-0.75, 0.75]) box("pole", x - 0.015, x + 0.015, CEIL - 0.3, CEIL - 0.27, -Z + 0.4, Z - 0.4);

  // ドアの扉（片側1枚ぶん。開き具合で前後にずらして置く）
  const leaf = new GeoBuilder();
  const hw = DOOR_W / 4; // 扉1枚の半幅
  leaf.box(0, FLOOR + 0.48, 0, 0.04, 0.96, hw * 2);          // 下の板
  leaf.box(0, WTOP - 0.07, 0, 0.04, 0.14, hw * 2);           // 上のわく
  for (const zz of [-hw + 0.05, hw - 0.05]) leaf.box(0, (FLOOR + 0.96 + WTOP - 0.14) / 2, zz, 0.04, WTOP - 0.14 - FLOOR - 0.96, 0.1);

  // 案内表示のテクスチャ（毎回かき直す）
  const lcdCanvas = document.createElement("canvas");
  lcdCanvas.width = 512; lcdCanvas.height = 144;
  const lcdTex = R.texture(lcdCanvas, { repeat: false, mip: false });

  const seatCol = mix(line, [0.15, 0.18, 0.25], 0.35);
  const mats = {
    wall: lit("#d9d4c8"), floor: lit("#7c8087", 0.35), ceil: lit("#ecebe6", 0.55), seat: lit(seatCol, 0.45), back: lit(mix(seatCol, [0, 0, 0], 0.12), 0.45),
    light: material("#000000", { unlit: true, emissive: [1, 1, 0.97] }), pole: lit("#c9ccd0", 0.5), band: lit(line, 0.5),
    lcdFrame: lit("#2a2d31", 0.3), lcd: material([1, 1, 1], { unlit: true, map: lcdTex }), glass: material("#1d2329"),
    leaf: lit("#c3c7cb", 0.5),
  };
  const parts = {};
  for (const k of Object.keys(G)) parts[k] = R.instanced(G[k], mats[k], 1);
  parts.leaf = R.instanced(leaf, mats.leaf, doors.length * 4);
  return { parts, doors, lcdCanvas, lcdTex, lcdKey: "", Z };
}

/** 車両の向きの基底（右・上・後ろ）。writeInstance と同じ */
function basis(bearing, pitch) {
  const cb = Math.cos(bearing), sb = Math.sin(bearing), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const f = [sb * cp, sp, -cb * cp], r = [cb, 0, sb];
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  return { r, u, b: f.map(v => -v) };
}
function toWorld(pose, x, y, z) {
  const { p, B } = pose;
  return [p[0] + B.r[0] * x + B.u[0] * y + B.b[0] * z, p[1] + B.r[1] * x + B.u[1] * y + B.b[1] * z, p[2] + B.r[2] * x + B.u[2] * y + B.b[2] * z];
}

/** 自列車の2両目の中心の姿勢 */
export function carPose(al, veh, headS) {
  const s = headS - veh.carLength * 1.5;
  const p = al.point(s, al.downTrack(s), 0);
  const bearing = al.bearing(s), pitch = Math.atan(al.grade(s) / 1000);
  return { s, p, bearing, pitch, B: basis(bearing, pitch) };
}

/**
 * 客室を置く。open: ドアの開き具合 0〜1、side: ドアが開く側（+1=右 / -1=左）
 */
export function placeInterior(I, pose, camPos, open, side) {
  for (const [k, m] of Object.entries(I.parts)) {
    m.n = 0; m.origin = camPos; m.dirty = true;
    if (k !== "leaf") Renderer.addInstance(m, pose.p, pose.bearing, pose.pitch, 1, 1, 1);
  }
  const shift = open * (DOOR_W / 2 - 0.04);
  for (const z of I.doors) for (const sd of [-1, 1]) for (const lr of [-1, 1]) {
    const o = sd === side ? shift : 0;
    const q = toWorld(pose, sd * (HALF_W + 0.02), 0, z + lr * (DOOR_W / 4 + o));
    Renderer.addInstance(I.parts.leaf, q, pose.bearing, pose.pitch, 1, 1, 1);
  }
  return Object.values(I.parts);
}

/** ドア上の案内表示をかく。info: { kind:"next"|"soon"|"stop", station, lineColor, lang } */
export function drawLcd(R, I, info) {
  const key = `${info.kind}|${info.station.id}|${info.lang}|${info.doorText}`;
  if (key === I.lcdKey) return;
  I.lcdKey = key;
  const c = I.lcdCanvas, g = c.getContext("2d");
  g.fillStyle = "#06080b"; g.fillRect(0, 0, 512, 144);
  g.fillStyle = info.lineColor; g.fillRect(0, 0, 512, 10);
  const st = info.station;
  const head = { next: ["つぎは", "つぎは", "Next"], soon: ["まもなく", "まもなく", "Arriving at"], stop: ["", "", ""] }[info.kind][info.lang];
  const name = [st.name, st.kana, st.roman][info.lang];
  g.textBaseline = "middle"; g.textAlign = "left";
  g.fillStyle = "#ffb43a"; g.font = `700 28px ${FONT}`;
  if (head) g.fillText(head, 18, 40);
  g.fillStyle = "#ffffff";
  let size = info.kind === "stop" ? 76 : 66;
  do { g.font = `900 ${size}px ${FONT}`; size -= 4; } while (g.measureText(name).width > 460 && size > 20);
  g.textAlign = info.kind === "stop" ? "center" : "left";
  g.fillText(name, info.kind === "stop" ? 256 : 18, info.kind === "stop" ? 70 : 96);
  if (info.doorText) { g.textAlign = "right"; g.fillStyle = "#7fe0ff"; g.font = `700 24px ${FONT}`; g.fillText(info.doorText, 500, 40); }
  R.updateTexture(I.lcdTex, c);
}

/**
 * 長いすに座った人の目のカメラ。lookSide: 見る向き（+1=右の窓 / -1=左の窓。なめらかに変えてよい）、yaw: 左右に見まわす角度
 */
export function passengerCamera(pose, lookSide, yaw, time, v, aspect) {
  const ls = Math.max(-1, Math.min(1, lookSide));
  const sway = Math.min(1, Math.abs(v) / 90);
  const x = -ls * 1.2, y = FLOOR + 1.18 + Math.sin(time * 6.1) * 0.006 * sway, z = -1.0;
  const pos = toWorld(pose, x, y, z);
  // 正面（向かいの窓）から少し前（-z。ドアのある側）へ向ける。yaw>0 で前、yaw<0 で後ろを見る
  const a = yaw + 0.22;
  const tgt = toWorld(pose, x + (ls >= 0 ? 1 : -1) * Math.cos(a), y + (aspect < 1 ? 0.04 : 0.14), z - Math.sin(a));
  const dir = [tgt[0] - pos[0], tgt[1] - pos[1], tgt[2] - pos[2]];
  const roll = Math.sin(time * 1.4) * 0.004 * sway;
  const up = [pose.B.u[0] + pose.B.b[0] * roll, pose.B.u[1], pose.B.u[2] + pose.B.b[2] * roll];
  const fov = (aspect < 1 ? 82 : 58) * Math.PI / 180;
  return { pos, dir, up, fov, near: 0.08, far: 2200, aspect };
}
