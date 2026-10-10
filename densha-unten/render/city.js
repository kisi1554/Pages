// 沿線の建物・樹木。区間ごとに InstancedMesh に入れる。線路と重ならないように置く。

import { GeoBuilder, Renderer, material } from "./gl.js";
import { CHUNK, inRiver, stationAt } from "./track.js";

/** 線路の近さを調べるための格子（10m おきの点を 50m の升に入れる） */
export function buildRouteGrid(al) {
  const cell = 50, map = new Map();
  for (let s = al.sMin; s <= al.sMax; s += 10) {
    const x = al.x(s), z = al.z(s);
    const k = Math.floor(x / cell) + "," + Math.floor(z / cell);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(x, z);
  }
  return {
    minDist(x, z) {
      const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
      let best = Infinity;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const pts = map.get((cx + i) + "," + (cz + j));
        if (!pts) continue;
        for (let p = 0; p < pts.length; p += 2) best = Math.min(best, Math.hypot(pts[p] - x, pts[p + 1] - z));
      }
      return best;
    },
  };
}

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const HOUSE = [[0.93, 0.91, 0.86], [0.85, 0.82, 0.76], [0.78, 0.74, 0.68], [0.95, 0.94, 0.92], [0.7, 0.66, 0.6], [0.82, 0.86, 0.88], [0.6, 0.55, 0.5]];
const TOWER = [[0.75, 0.8, 0.86], [0.66, 0.7, 0.76], [0.86, 0.86, 0.84], [0.55, 0.6, 0.66], [0.9, 0.88, 0.82]];

export function createCityGeometry() {
  const box = new GeoBuilder(); box.box(0, 0.5, 0, 1, 1, 1);
  // 木: 8角の錐を2段
  const tree = new GeoBuilder();
  const ring = (y, r) => Array.from({ length: 8 }, (_, i) => [Math.cos(i / 8 * Math.PI * 2) * r, y, Math.sin(i / 8 * Math.PI * 2) * r]);
  const layers = [[0.15, 0.45], [0.5, 0.35], [1.0, 0]];
  for (let l = 0; l + 1 < layers.length; l++) {
    const A = ring(layers[l][0], layers[l][1]), B = ring(layers[l + 1][0], Math.max(0.001, layers[l + 1][1]));
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      tree.quad(A[i], A[j], B[j], B[i]);
    }
  }
  return { box, tree };
}

export function createCityMaterials() {
  return {
    building: material([1, 1, 1], { windows: true }),
    tree: material([1, 1, 1], { doubleSided: true }),
  };
}

/** 区間 ci の建物と木を R.instanced の mesh に入れて返す */
export function buildCityChunk(R, ctx, ci) {
  const { route, al, grid } = ctx;
  const a = Math.max(al.sMin, ci * CHUNK), b = Math.min(al.sMax, (ci + 1) * CHUNK);
  const origin = al.point((a + b) / 2);
  const bld = R.instanced(ctx.cityGeo.box, ctx.cityMats.building, 400, origin);
  const trees = R.instanced(ctx.cityGeo.tree, ctx.cityMats.tree, 300, origin);
  const rnd = rng(ci + 17);
  const dense = s => route.dense.some(d => s >= d.start && s <= d.end);
  for (let s = a; s < b; s += 9) {
    if (inRiver(route, s) || route.rivers.some(r => Math.abs(s - r.start) < 40 || Math.abs(s - r.end) < 40)) continue;
    const bear = al.bearing(s);
    const busy = dense(s);
    for (const side of [-1, 1]) {
      if (rnd() < (busy ? 0.1 : 0.22)) continue;
      const near = rnd() < 0.55;
      const d = near ? 13 + rnd() * 30 : 45 + Math.pow(rnd(), 1.4) * 170;
      let w, dep, h, col, win = 0;
      if (busy && rnd() < 0.75) {
        w = 14 + rnd() * 26; dep = 14 + rnd() * 22; h = 18 + Math.pow(rnd(), 2) * 110; col = TOWER[Math.floor(rnd() * TOWER.length)]; win = 1;
      } else if (rnd() < 0.18) {
        w = 12 + rnd() * 18; dep = 9 + rnd() * 8; h = 9 + rnd() * 14; col = HOUSE[Math.floor(rnd() * HOUSE.length)]; win = 1;
      } else {
        w = 6 + rnd() * 6; dep = 6 + rnd() * 5; h = 5 + rnd() * 4; col = HOUSE[Math.floor(rnd() * HOUSE.length)];
      }
      const p = al.point(s, side * (d + dep / 2), 0);
      p[1] = 0;
      const r = Math.hypot(w, dep) / 2;
      if (grid.minDist(p[0], p[2]) < 9 + r) continue;
      if (stationAt(route, s, 30) && d < 20) continue;
      const shade = 0.9 + rnd() * 0.15;
      Renderer.addInstance(bld, p, bear + (rnd() - 0.5) * 0.1, 0, w, h, dep, [col[0] * shade, col[1] * shade, col[2] * shade, win]);
    }
    // 木
    if (rnd() < 0.5) {
      const side = rnd() < 0.5 ? -1 : 1;
      const d = 9 + rnd() * 60;
      const p = al.point(s + rnd() * 9, side * d, 0); p[1] = 0;
      if (grid.minDist(p[0], p[2]) > 7) {
        const hh = 4 + rnd() * 7, g = 0.75 + rnd() * 0.35;
        Renderer.addInstance(trees, p, rnd() * 6, 0, hh * 0.55, hh, hh * 0.55, [0.3 * g, 0.5 * g, 0.25 * g, 0]);
      }
    }
  }
  return [bld, trees];
}
