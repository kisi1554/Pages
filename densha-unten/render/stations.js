// 駅: ホーム・点状ブロックの線・上屋・駅名標（壁面と吊り下げ）・停止位置目標「8」

import { GeoBuilder, Renderer, material, hex } from "./gl.js";
import { extrude, PLATFORM_H, styleAt } from "./track.js";

const SIDE_W = 5;
const EDGE = 1.45;
export const FONT = `"Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`;

function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

function fitText(g, text, maxW, size, weight = 700) {
  let s = size;
  do { g.font = `${weight} ${s}px ${FONT}`; s -= 2; } while (g.measureText(text).width > maxW && s > 10);
}

/** 壁面の駅名標: 駅ナンバー・駅名・かな・ローマ字・前後の駅名 */
export function wallSignCanvas(route, i) {
  const st = route.stations[i], prev = route.stations[i - 1], next = route.stations[i + 1];
  const c = canvas(1024, 256), g = c.getContext("2d");
  const col = route.meta.lineColor;
  g.fillStyle = "#fbfbf8"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = col; g.fillRect(0, 176, 1024, 14);
  g.fillStyle = "#24303d"; g.fillRect(0, 190, 1024, 66);
  // 駅ナンバー
  g.fillStyle = "#fff"; g.strokeStyle = col; g.lineWidth = 10;
  g.beginPath(); g.roundRect(30, 30, 120, 120, 18); g.fill(); g.stroke();
  g.fillStyle = "#222"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `700 34px ${FONT}`; g.fillText(st.id.replace(/\d+$/, ""), 90, 66);
  g.font = `900 52px ${FONT}`; g.fillText(st.id.replace(/^\D+/, ""), 90, 116);
  // 駅名
  g.fillStyle = "#1a1a1a";
  fitText(g, st.name, 560, 104, 900);
  g.fillText(st.name, 560, 92);
  g.font = `700 32px ${FONT}`; g.fillStyle = "#444";
  g.fillText(st.kana, 560, 28);
  g.font = `600 30px ${FONT}`; g.fillText(st.roman, 560, 152);
  // 前後の駅（下り = 右へ進む）
  g.fillStyle = "#fff"; g.font = `700 30px ${FONT}`;
  if (prev) { g.textAlign = "left"; g.fillText("◀ " + prev.name, 24, 224); }
  if (next) { g.textAlign = "right"; g.fillText(next.name + " ▶", 1000, 224); }
  return c;
}

/** 吊り下げ駅名標 */
export function hangSignCanvas(route, i) {
  const st = route.stations[i];
  const c = canvas(1024, 192), g = c.getContext("2d");
  g.fillStyle = "#1e2833"; g.fillRect(0, 0, 1024, 192);
  g.fillStyle = route.meta.lineColor; g.fillRect(0, 0, 1024, 12);
  g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
  fitText(g, st.name, 700, 92, 900);
  g.fillText(st.name, 512, 86);
  g.font = `600 34px ${FONT}`; g.fillStyle = "#d6dde5";
  g.fillText(`${st.kana}   ${st.roman}`, 512, 156);
  g.fillStyle = route.meta.lineColor;
  g.beginPath(); g.roundRect(28, 52, 120, 76, 12); g.fill();
  g.fillStyle = "#fff"; g.font = `800 40px ${FONT}`; g.fillText(st.id, 88, 91);
  return c;
}

/** 停止位置目標「8」 */
export function stopMarkCanvas() {
  const c = canvas(128, 128), g = c.getContext("2d");
  g.fillStyle = "#111"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#ffd400"; g.fillRect(8, 8, 112, 112);
  g.fillStyle = "#111"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `900 96px ${FONT}`; g.fillText("8", 64, 70);
  return c;
}

export function createStationMaterials(R) {
  return {
    top: material("#d3d0c8"),
    face: material("#9c9890"),
    yellow: material("#f2c400"),
    roof: material("#e9e7e2"),
    roofUnder: material("#cfcac0"),
    fence: material("#7e858c"),
    post: material("#9aa0a6"),
    stop: material([1, 1, 1], { map: R.texture(stopMarkCanvas(), { repeat: false }), unlit: false }),
    light: material("#000000", { unlit: true, emissive: hex("#f4f7ff") }),
  };
}

/** 1駅ぶんの形状をつくる。{ meshes, textures } を返す */
export function buildStation(R, ctx, i) {
  const { route, al } = ctx;
  const M = ctx.stationMats;
  const st = route.stations[i];
  const p0 = st.stop + 15 - st.length, p1 = st.stop + 15;
  const origin = al.point(st.stop);
  const sList = [];
  for (let s = p0; s < p1; s += 4) sList.push(s);
  sList.push(p1);
  const G = {}, geo = k => (G[k] || (G[k] = new GeoBuilder()));
  const o = s => al.halfSpacing(s);
  const H = PLATFORM_H;

  // ホームの 内側の端（x）と 外側の端 の組。dir = 線路のある向き（-1:左, +1:右）
  const plats = st.platform === "island"
    ? [{ inner: s => -(o(s) - EDGE), outer: s => o(s) - EDGE, island: true }]
    : [{ inner: s => -(o(s) + EDGE), outer: s => -(o(s) + EDGE + SIDE_W), left: true },
       { inner: s => o(s) + EDGE, outer: s => o(s) + EDGE + SIDE_W, left: false }];

  for (const P of plats) {
    if (P.island) {
      extrude(geo("face"), al, origin, sList, s => [[P.inner(s), -0.5], [P.inner(s), H]]);
      extrude(geo("top"), al, origin, sList, s => [[P.inner(s), H], [P.outer(s), H]]);
      extrude(geo("face"), al, origin, sList, s => [[P.outer(s), H], [P.outer(s), -0.5]]);
      for (const sd of [-1, 1]) {
        const e = s => sd * (o(s) - EDGE - 0.8);
        extrude(geo("yellow"), al, origin, sList, s => sd < 0 ? [[e(s), H + 0.01], [e(s) + 0.3, H + 0.01]] : [[e(s) - 0.3, H + 0.01], [e(s), H + 0.01]]);
      }
    } else {
      const L = P.left;
      const a = L ? P.outer : P.inner, b = L ? P.inner : P.outer;
      extrude(geo("face"), al, origin, sList, s => [[a(s), -0.5], [a(s), H]]);
      extrude(geo("top"), al, origin, sList, s => [[a(s), H], [b(s), H]]);
      extrude(geo("face"), al, origin, sList, s => [[b(s), H], [b(s), -0.5]]);
      const e = s => P.inner(s) + (L ? -0.8 : 0.8);
      extrude(geo("yellow"), al, origin, sList, s => L ? [[e(s) - 0.3, H + 0.01], [e(s), H + 0.01]] : [[e(s), H + 0.01], [e(s) + 0.3, H + 0.01]]);
      // 外側の柵
      const f = s => P.outer(s) + (L ? 0.1 : -0.1);
      if (styleAt(al, st.stop) === "ground") extrude(geo("fence"), al, origin, sList, s => L ? [[f(s), H], [f(s), H + 1.2]] : [[f(s), H + 1.2], [f(s), H]]);
    }
  }

  // 上屋（地下駅は天井があるので無し）
  const underground = styleAt(al, st.stop) === "tunnel";
  const r0 = Math.max(p0, st.stop - 150), r1 = p1 - 5;
  const rList = sList.filter(s => s >= r0 && s <= r1);
  const lights = ctx.stationLights;
  if (!underground && rList.length > 1) {
    for (const P of plats) {
      const x0 = s => Math.min(P.inner(s), P.outer(s)) + (P.island ? 0.6 : 0.3), x1 = s => Math.max(P.inner(s), P.outer(s)) - (P.island ? 0.6 : 0.3);
      extrude(geo("roof"), al, origin, rList, s => [[x0(s), H + 3.4], [x1(s), H + 3.4]]);
      extrude(geo("roofUnder"), al, origin, rList, s => [[x1(s), H + 3.2], [x0(s), H + 3.2]]);
      extrude(geo("roofUnder"), al, origin, rList, s => [[x0(s), H + 3.2], [x0(s), H + 3.4]]);
      extrude(geo("roofUnder"), al, origin, rList, s => [[x1(s), H + 3.4], [x1(s), H + 3.2]]);
      for (let s = r0 + 6; s < r1; s += 12) {
        const xm = (P.inner(s) + P.outer(s)) / 2;
        Renderer.addInstance(ctx.stationPosts, al.point(s, xm, H), al.bearing(s), 0, 0.25, 3.2, 0.25);
      }
    }
  }
  for (let s = p0 + 5; s < p1; s += underground ? 8 : 12) {
    for (const P of plats) {
      if (!underground && (s < r0 || s > r1)) continue;
      const xm = (P.inner(s) + P.outer(s)) / 2;
      Renderer.addInstance(lights, al.point(s, xm, underground ? 4.9 : H + 3.15), al.bearing(s), 0, 0.25, 0.08, 2.4);
    }
  }

  // 駅名標
  const texWall = R.texture(wallSignCanvas(route, i), { repeat: false });
  const texHang = R.texture(hangSignCanvas(route, i), { repeat: false });
  const matWall = material([1, 1, 1], { map: texWall });
  const matHang = material([1, 1, 1], { map: texHang });
  const signW = 4.0, signH = 1.0;
  const fwd = s => { const b = al.bearing(s); return [Math.sin(b), 0, -Math.cos(b)]; };
  const sub = (p) => [p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]];
  const our = plats[0];
  // 壁面: 自分の線路から見える面に、ホームの長さに沿って並べる
  const wallX = s => our.island ? our.inner(s) + (our.outer(s) - our.inner(s)) / 2 - 0.05 : our.outer(s) + 0.15;
  for (let s = p0 + 20; s < p1 - 10; s += 45) {
    const x = wallX(s), y0 = H + 1.3, b = al.bearing(s);
    const A = sub(al.point(s - signW / 2, x, y0)), B = sub(al.point(s + signW / 2, x, y0));
    const C = sub(al.point(s + signW / 2, x, y0 + signH)), D = sub(al.point(s - signW / 2, x, y0 + signH));
    const right = [Math.cos(b), 0, Math.sin(b)];
    // 相対式: 看板は +x（線路）を向き、見る人の右手が +s。島式: -x を向き、右手が -s
    if (our.island) geo("wall").quad(B, A, D, C, right.map(v => -v));
    else geo("wall").quad(A, B, C, D, right);
  }
  // 吊り下げ: 進行方向（運転士）に向ける
  for (const ds of [-25, -105]) {
    const s = st.stop + ds;
    if (s < p0 + 5) continue;
    const xm = (our.inner(s) + our.outer(s)) / 2;
    const y0 = H + 2.3, w = 3.2, h = 0.6;
    const A = sub(al.point(s, xm - w / 2, y0)), B = sub(al.point(s, xm + w / 2, y0));
    const C = sub(al.point(s, xm + w / 2, y0 + h)), D = sub(al.point(s, xm - w / 2, y0 + h));
    const f = fwd(s);
    // 手前（-f）を向いた面。手前から見ると右手は +x
    geo("hang").quad(A, B, C, D, f.map(v => -v));
    geo("hang").quad(B, A, D, C, f);
    Renderer.addInstance(ctx.stationPosts, al.point(s, xm - w / 2 + 0.2, y0 + h), al.bearing(s), 0, 0.04, (underground ? 4.9 : H + 3.2) - y0 - h, 0.04);
    Renderer.addInstance(ctx.stationPosts, al.point(s, xm + w / 2 - 0.2, y0 + h), al.bearing(s), 0, 0.04, (underground ? 4.9 : H + 3.2) - y0 - h, 0.04);
  }
  // 停止位置目標「8」: 自分の線路側のホームの端、停止位置に立てる
  {
    const s = st.stop;
    const x = our.island ? our.inner(s) + 0.35 : our.inner(s) - 0.35;
    const y0 = H + 1.5, w = 0.55;
    const A = sub(al.point(s, x - w / 2, y0)), B = sub(al.point(s, x + w / 2, y0));
    const C = sub(al.point(s, x + w / 2, y0 + w)), D = sub(al.point(s, x - w / 2, y0 + w));
    geo("stop").quad(A, B, C, D, fwd(s).map(v => -v));
    Renderer.addInstance(ctx.stationPosts, al.point(s + 0.05, x, H), al.bearing(s), 0, 0.07, 1.5, 0.07);
  }

  const mats = { ...M, wall: matWall, hang: matHang };
  const meshes = Object.keys(G).map(k => R.mesh(G[k], mats[k], origin));
  return { meshes, textures: [texWall, texHang] };
}
