// 軌道・架線・構造物（高架・掘割・トンネル・地面）を、断面を線路に沿って押し出してつくる。

import { GeoBuilder, Renderer, material, hex } from "./gl.js";

export const CHUNK = 800;          // 形状を結合する単位 (m)
const STEP = 4;                    // 押し出しの刻み (m)
const SIDE_PLATFORM_W = 5;         // 相対式ホームの幅
export const PLATFORM_H = 1.1;     // ホームの高さ（レール面から）
const TUNNEL_H = 5.9;
const RAIL_HALF = 1.067 / 2 + 0.0325;

// ---- 断面を押し出す汎用関数 -------------------------------------------
// profileFn(s) → [[x, y, abs], ...]  x=右, y=上（abs が真なら y は絶対高さ、偽ならレール面から）
// 隣り合う2点を結ぶ辺の表は、辺の向き (dx,dy) を左へ90°回した (-dy, dx) の側。
// opt.uScale: 断面方向のテクスチャ座標（辺の長さ / uScale）。opt.uFixed: [u0,u1] を辺ごとに使う
// opt.vScale: 線路方向（s / vScale）
export function extrude(geo, al, origin, sList, profileFn, opt = {}) {
  const rings = [];
  for (const s of sList) {
    const prof = profileFn(s);
    const b = al.bearing(s), cb = Math.cos(b), sb = Math.sin(b);
    const x0 = al.x(s), z0 = al.z(s), h = al.height(s);
    rings.push({ s, prof, cb, sb, x0, z0, h });
  }
  if (rings.length < 2) return;
  const nPts = rings[0].prof.length;
  for (let j = 0; j + 1 < nPts; j++) {
    const base = geo.count;
    let ok = true;
    for (const r of rings) {
      const p = r.prof[j], q = r.prof[j + 1];
      if (!p || !q) { ok = false; break; }
      const dx = q[0] - p[0], dy = (q[2] ? q[1] : q[1] + r.h) - (p[2] ? p[1] : p[1] + r.h);
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L;
      const n = [r.cb * nx, ny, r.sb * nx];
      const u0 = opt.uFixed ? opt.uFixed[0] : 0, u1 = opt.uFixed ? opt.uFixed[1] : L / (opt.uScale || 1);
      const v = r.s / (opt.vScale || 4);
      for (const [pt, u] of [[p, u0], [q, u1]]) {
        const y = pt[2] ? pt[1] : pt[1] + r.h;
        geo.vert([r.x0 + r.cb * pt[0] - origin[0], y - origin[1], r.z0 + r.sb * pt[0] - origin[2]], n, u, v);
      }
    }
    if (!ok) { geo.pos.length = base * 3; geo.nrm.length = base * 3; geo.uv.length = base * 2; continue; }
    for (let i = 0; i + 1 < rings.length; i++) {
      const a = base + i * 2, b = a + 1, c = a + 3, d = a + 2;
      // 表 = 法線の側（a→b が辺の向き、a→d が進行方向。上 × 右 = 前 なので a,b,c が反時計回り）
      geo.idx.push(a, b, c, a, c, d);
    }
  }
}

// ---- 線路まわりの情報 -----------------------------------------------
/** 位置 s がホームの範囲にある駅 */
export function stationAt(route, s, margin = 0) {
  for (const st of route.stations) {
    if (s >= st.stop + 15 - st.length - margin && s <= st.stop + 15 + margin) return st;
  }
  return null;
}

/** 構造物の外側の半幅（相対式ホームがあれば その外まで広げる） */
export function outerHalfWidth(route, al, s, base) {
  const o = al.halfSpacing(s);
  const st = stationAt(route, s, 10);
  let w = o + base;
  if (st && st.platform === "side") w = Math.max(w, o + 1.45 + SIDE_PLATFORM_W + 0.3);
  return w;
}

/** 断面の様式: tunnel / cut / elev（高架・橋）/ emb（盛土）/ ground */
export function styleAt(al, s) {
  const t = al.type(s), h = al.height(s);
  if (t === "tunnel") return "tunnel";
  if (h < -0.3) return "cut";
  if (t === "elev" || t === "bridge") return h > 0.3 ? "elev" : "ground";
  if (h > 0.3) return "emb";
  return "ground";
}

export function inRiver(route, s) {
  return route.rivers.some(r => s >= r.start && s <= r.end);
}

/** 地面の帯の幅（曲線の内側で折り返さないよう、近くの最小半径で抑える） */
function terrainWidth(al, s) {
  let k = 0;
  for (let d = -200; d <= 200; d += 40) k = Math.max(k, Math.abs(al.curvature(s + d)));
  return Math.min(230, k > 0 ? 0.8 / k : 230);
}

// ---- テクスチャ ------------------------------------------------------
function noiseCanvas(w, h, base, spread, seed = 1) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  let r = seed;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < w * h; i++) {
    const n = (rnd() - 0.5) * spread;
    img.data[i * 4] = base[0] + n; img.data[i * 4 + 1] = base[1] + n; img.data[i * 4 + 2] = base[2] + n; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** 道床の上の枕木（0.6m 間隔で繰り返す）。u: 道床の幅 3m、v: 0.6m */
function sleeperCanvas() {
  const c = noiseCanvas(128, 64, [128, 122, 112], 70, 7);
  const g = c.getContext("2d");
  g.fillStyle = "#a9a59c";
  g.fillRect(128 * 0.18, 64 * 0.3, 128 * 0.64, 64 * 0.4);   // コンクリート枕木 2.0m × 0.24m
  g.fillStyle = "rgba(0,0,0,0.25)";
  g.fillRect(128 * 0.18, 64 * 0.68, 128 * 0.64, 3);
  g.fillStyle = "#4a4640";
  for (const u of [0.31, 0.69]) g.fillRect(128 * u - 3, 64 * 0.3, 6, 64 * 0.4); // 締結装置
  return c;
}

export function createTrackMaterials(renderer) {
  const tex = c => renderer.texture(c);
  return {
    ballastTop: material([1, 1, 1], { map: tex(sleeperCanvas()) }),
    ballast: material([1, 1, 1], { map: tex(noiseCanvas(64, 64, [120, 115, 105], 60, 3)) }),
    rail: material("#c9c6c0"),
    railSide: material("#5b4a3c"),
    wire: material("#3a3a3a"),
    concrete: material([1, 1, 1], { map: tex(noiseCanvas(64, 64, [190, 186, 178], 18, 5)) }),
    deck: material("#b7b3ab"),
    tunnel: material([1, 1, 1], { map: tex(noiseCanvas(64, 64, [140, 138, 132], 24, 9)) }),
    terrain: material([1, 1, 1], { map: tex(noiseCanvas(128, 128, [118, 140, 86], 34, 11)) }),
    water: material("#4f7fa0"),
    mast: material("#8d8f91"),
    lamp: material("#000000", { unlit: true, emissive: hex("#fff3cf") }),
    post: material("#f4f4f0"),
  };
}

// ---- 1つの区間（chunk）を組み立てる ---------------------------------
export function buildTrackChunk(R, ctx, ci) {
  const { route, al, mats } = ctx;
  const a = Math.max(al.sMin, ci * CHUNK), b = Math.min(al.sMax, (ci + 1) * CHUNK);
  if (b <= a) return [];
  const origin = al.point((a + b) / 2);
  const sList = [];
  for (let s = a; s < b; s += STEP) sList.push(s);
  sList.push(b);

  const G = {};
  const geo = k => (G[k] || (G[k] = new GeoBuilder()));

  // 道床・レール・架線（構造物の種類によらない）
  for (const side of [-1, 1]) {
    const c = s => side * al.halfSpacing(s);
    extrude(geo("ballastTop"), al, origin, sList, s => [[c(s) - 1.5, -0.17], [c(s) + 1.5, -0.17]], { uFixed: [0, 1], vScale: 0.6 });
    extrude(geo("ballast"), al, origin, sList, s => [[c(s) - 2.0, -0.55], [c(s) - 1.5, -0.17]], { uScale: 1 });
    extrude(geo("ballast"), al, origin, sList, s => [[c(s) + 1.5, -0.17], [c(s) + 2.0, -0.55]], { uScale: 1 });
    for (const rs of [-1, 1]) {
      const x = s => c(s) + rs * RAIL_HALF;
      extrude(geo("railSide"), al, origin, sList, s => [[x(s) - 0.035, -0.17], [x(s) - 0.035, 0]]);
      extrude(geo("rail"), al, origin, sList, s => [[x(s) - 0.035, 0], [x(s) + 0.035, 0]]);
      extrude(geo("railSide"), al, origin, sList, s => [[x(s) + 0.035, 0], [x(s) + 0.035, -0.17]]);
    }
    // トロリ線（細い三角柱）
    extrude(geo("wire"), al, origin, sList, s => [[c(s) - 0.025, 5.1], [c(s), 5.14], [c(s) + 0.025, 5.1], [c(s) - 0.025, 5.1]]);
  }

  // 構造物・地面: 様式が同じ部分ごとに押し出す
  const styles = sList.map(s => styleAt(al, s));
  const runs = [];
  for (let i = 0; i < sList.length; i++) {
    if (!runs.length || runs[runs.length - 1].style !== styles[i]) {
      if (runs.length) runs[runs.length - 1].list.push(sList[i]); // 境目の輪を共有
      runs.push({ style: styles[i], list: [sList[i]] });
    } else runs[runs.length - 1].list.push(sList[i]);
  }

  const inst = ctx.instanced;
  for (const run of runs) {
    const L = run.list;
    const W = base => s => outerHalfWidth(route, al, s, base);
    const E = s => terrainWidth(al, s);
    const terrainSegs = [];
    if (run.style === "tunnel") {
      const w = W(3.0);
      extrude(geo("tunnel"), al, origin, L, s => [[-w(s), -0.55], [w(s), -0.55], [w(s), TUNNEL_H], [-w(s), TUNNEL_H], [-w(s), -0.55]], { uScale: 4 });
      terrainSegs.push(s => [[-E(s), 0, 1], [E(s), 0, 1]]);
    } else if (run.style === "cut") {
      const w = W(3.2);
      extrude(geo("concrete"), al, origin, L, s => [
        [-w(s) - 0.4, 0, 1], [-w(s) - 0.4, 1, 1], [-w(s), 1, 1], [-w(s), -0.55], [w(s), -0.55], [w(s), 1, 1], [w(s) + 0.4, 1, 1], [w(s) + 0.4, 0, 1]], { uScale: 4 });
      terrainSegs.push(s => [[-E(s), 0, 1], [-w(s) - 0.4, 0, 1]], s => [[w(s) + 0.4, 0, 1], [E(s), 0, 1]]);
    } else if (run.style === "elev" || run.style === "emb") {
      const w = W(3.0);
      const emb = run.style === "emb";
      const bot = emb ? [0, 1] : [-1.6, 0];
      const prof = s => {
        const p = [[-w(s), bot[0], bot[1]], [-w(s), 0.7], [-w(s) + 0.25, 0.7], [-w(s) + 0.25, -0.55], [w(s) - 0.25, -0.55], [w(s) - 0.25, 0.7], [w(s), 0.7], [w(s), bot[0], bot[1]]];
        if (!emb) p.push([-w(s), -1.6]);
        return p;
      };
      extrude(geo("concrete"), al, origin, L, prof, { uScale: 4 });
      terrainSegs.push(s => [[-E(s), 0, 1], [E(s), 0, 1]]);
      // 高架橋の柱
      if (!emb) {
        for (let s = Math.ceil(L[0] / 10) * 10; s < L[L.length - 1]; s += 10) {
          const h = al.height(s);
          if (h < 2.5) continue;
          const river = inRiver(route, s);
          if (river && s % 40 !== 0) continue;
          const bottom = river ? -4 : 0;
          const ht = h - 1.6 - bottom;
          for (const sd of [-1, 1]) {
            const p = al.point(s, sd * (w(s) - 1.2), 0);
            p[1] = bottom;
            Renderer.addInstance(inst.pillar, p, al.bearing(s), 0, river ? 1.6 : 0.9, ht, river ? 2.4 : 0.9);
          }
        }
      }
    } else {
      const w = s => al.halfSpacing(s) + 2.6;
      terrainSegs.push(s => [[-E(s), 0, 1], [-w(s), 0, 1]], s => [[w(s), 0, 1], [E(s), 0, 1]]);
      // 線路わきの地面（道床の外）
      extrude(geo("ballast"), al, origin, L, s => [[-w(s), 0, 1], [-al.halfSpacing(s) - 1.8, -0.5]], { uScale: 1 });
      extrude(geo("ballast"), al, origin, L, s => [[al.halfSpacing(s) + 1.8, -0.5], [w(s), 0, 1]], { uScale: 1 });
    }
    // 地面（川の上は水面）
    const pieces = splitByRiver(route, L);
    for (const pc of pieces) {
      if (pc.river) {
        extrude(geo("water"), al, origin, pc.list, s => [[-E(s), -3, 1], [E(s), -3, 1]]);
      } else {
        for (const f of terrainSegs) extrude(geo("terrain"), al, origin, pc.list, f, { uScale: 8, vScale: 8 });
      }
    }
    if (run.style !== "tunnel") {
      extrude(geo("wire"), al, origin, L, s => {
        const o = al.halfSpacing(s);
        return [[-o - 0.02, 6.1], [-o, 6.13], [-o + 0.02, 6.1], [-o - 0.02, 6.1]];
      });
      extrude(geo("wire"), al, origin, L, s => {
        const o = al.halfSpacing(s);
        return [[o - 0.02, 6.1], [o, 6.13], [o + 0.02, 6.1], [o - 0.02, 6.1]];
      });
    }
  }

  // 川岸（地面と水面の段差）とトンネルの坑口
  for (const r of route.rivers) for (const [s, dir] of [[r.start, 1], [r.end, -1]]) {
    if (s < a || s >= b) continue;
    const e = terrainWidth(al, s);
    addCrossWall(geo("concrete"), al, origin, s, -e, e, -3, 0, dir);
  }
  for (let i = 1; i < sList.length; i++) {
    const t0 = styles[i - 1] === "tunnel", t1 = styles[i] === "tunnel";
    if (t0 === t1) continue;
    const s = t1 ? sList[i] : sList[i - 1];
    const h = al.height(s);
    const w = outerHalfWidth(route, al, s, 3.0);
    const top = Math.max(h + TUNNEL_H, 1.2);
    // 外に向いた面: トンネルが前方にあるなら手前（-f）向き
    addCrossWall(geo("concrete"), al, origin, s, -w - 6, w + 6, h + TUNNEL_H, top + 0.6, t1 ? -1 : 1);
  }

  const out = [];
  for (const k of Object.keys(G)) out.push(R.mesh(G[k], mats[k], origin));
  return out;
}

/** 線路に直交する壁（x0〜x1, 高さ y0〜y1 は絶対値）。dir=+1 で前を向く */
function addCrossWall(geo, al, origin, s, x0, x1, y0, y1, dir) {
  const P = (x, y) => { const p = al.point(s, x, 0); return [p[0] - origin[0], y - origin[1], p[2] - origin[2]]; };
  const b = al.bearing(s);
  const n = [Math.sin(b) * dir, 0, -Math.cos(b) * dir];
  geo.quad(P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1), n, [0, 0, (x1 - x0) / 4, 0, (x1 - x0) / 4, (y1 - y0) / 4, 0, (y1 - y0) / 4]);
}

function splitByRiver(route, L) {
  const out = [];
  for (const s of L) {
    const r = inRiver(route, s);
    if (!out.length || out[out.length - 1].river !== r) {
      if (out.length) out[out.length - 1].list.push(s);
      out.push({ river: r, list: [s] });
    } else out[out.length - 1].list.push(s);
  }
  return out.filter(p => p.list.length >= 2);
}

/** 区間ごとの InstancedMesh（柱・架線柱・トンネル照明・キロポスト）に中身を入れる */
export function fillChunkProps(ctx, ci) {
  const { route, al } = ctx;
  const inst = ctx.instanced;
  const a = Math.max(al.sMin, ci * CHUNK), b = Math.min(al.sMax, (ci + 1) * CHUNK);
  for (let s = Math.ceil(a / 50) * 50; s < b; s += 50) {
    const st = styleAt(al, s);
    const o = al.halfSpacing(s);
    if (st === "tunnel") continue;
    const w = st === "elev" || st === "emb" ? outerHalfWidth(route, al, s, 3.0) - 0.45 : o + 2.7;
    const bear = al.bearing(s);
    for (const sd of [-1, 1]) Renderer.addInstance(inst.mast, al.point(s, sd * w, -0.5), bear, 0, 0.28, 7.9, 0.28);
    Renderer.addInstance(inst.beam, al.point(s, 0, 7.2), bear, 0, w * 2 + 0.3, 0.35, 0.3);
  }
  for (let s = Math.ceil(a / 20) * 20; s < b; s += 20) {
    if (styleAt(al, s) !== "tunnel") continue;
    const w = outerHalfWidth(route, al, s, 3.0) - 0.08;
    for (const sd of [-1, 1]) Renderer.addInstance(inst.lamp, al.point(s, sd * w, 3.9), al.bearing(s), 0, 0.12, 0.22, 1.4);
  }
  for (let s = Math.ceil(a / 100) * 100; s < b; s += 100) {
    if (s < 0) continue;
    const o = al.halfSpacing(s);
    if (stationAt(route, s, 5)) continue;
    const p = al.point(s, -o - 2.25, -0.4);
    Renderer.addInstance(inst.post, p, al.bearing(s), 0, 0.14, s % 1000 === 0 ? 1.4 : 0.9, 0.14);
  }
}
