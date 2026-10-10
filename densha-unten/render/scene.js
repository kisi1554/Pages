// シーン全体: 区間（800m）ごとの形状を、カメラの近くだけ必要に応じて作り・捨てる。

import { Renderer, GeoBuilder, material } from "./gl.js";
import { CHUNK, buildTrackChunk, createTrackMaterials, fillChunkProps } from "./track.js";
import { buildStation, createStationMaterials } from "./stations.js";
import { buildCityChunk, buildRouteGrid, createCityGeometry, createCityMaterials } from "./city.js";
import { createTrainSet, placeTrains } from "./trains.js";
import { cabCamera } from "./camera.js";

const AHEAD = 2300, BEHIND = 600;
const OUT = { fog: [250, 1900], color: [0.74, 0.83, 0.93], ambient: 0.62, sun: 0.55, night: 0.05 };
const TUN = { fog: [40, 420], color: [0.06, 0.06, 0.065], ambient: 0.22, sun: 0.05, night: 1 };

export class Scene {
  constructor(canvas, route, al, veh) {
    this.R = new Renderer(canvas);
    this.route = route; this.al = al; this.veh = veh;
    const R = this.R;
    const unit = new GeoBuilder(); unit.box(0, 0.5, 0, 1, 1, 1);
    const center = new GeoBuilder(); center.box(0, 0, 0, 1, 1, 1);
    const mats = createTrackMaterials(R);
    this.ctx = {
      route, al, mats,
      stationMats: createStationMaterials(R),
      cityGeo: createCityGeometry(), cityMats: createCityMaterials(),
      grid: buildRouteGrid(al),
      unit, center,
    };
    this.chunks = new Map();     // ci → meshes
    this.stations = new Map();   // i → { meshes, textures }
    this.trains = createTrainSet(R, route);
    // 地平線までの下地（掘割にふたをしないよう、深いところに置く）
    const g = new GeoBuilder();
    g.quad([-6000, 0, 6000], [6000, 0, 6000], [6000, 0, -6000], [-6000, 0, -6000], [0, 1, 0]);
    this.underlay = R.mesh(g, material([0.42, 0.5, 0.36]), [0, -30, 0]);
    this.tunnelMix = 0;
    this.queue = [];
  }

  _instancedFor(origin) {
    const R = this.R, c = this.ctx, m = c.mats;
    return {
      pillar: R.instanced(c.unit, m.concrete, 200, origin),
      mast: R.instanced(c.unit, m.mast, 80, origin),
      beam: R.instanced(c.center, m.mast, 40, origin),
      lamp: R.instanced(c.center, m.lamp, 100, origin),
      post: R.instanced(c.unit, m.post, 20, origin),
    };
  }

  _buildChunk(ci) {
    const al = this.al;
    const origin = al.point(Math.min(al.sMax, Math.max(al.sMin, (ci + 0.5) * CHUNK)));
    const inst = this._instancedFor(origin);
    this.ctx.instanced = inst;
    const meshes = buildTrackChunk(this.R, this.ctx, ci);
    fillChunkProps(this.ctx, ci);
    meshes.push(...Object.values(inst), ...buildCityChunk(this.R, this.ctx, ci));
    return meshes.filter(Boolean);
  }

  _buildStation(i) {
    const st = this.route.stations[i];
    const origin = this.al.point(st.stop);
    this.ctx.stationPosts = this.R.instanced(this.ctx.unit, this.ctx.stationMats.post, 120, origin);
    this.ctx.stationLights = this.R.instanced(this.ctx.center, this.ctx.stationMats.light, 80, origin);
    const r = buildStation(this.R, this.ctx, i);
    r.meshes.push(this.ctx.stationPosts, this.ctx.stationLights);
    r.meshes = r.meshes.filter(Boolean);
    return r;
  }

  /** カメラ位置 s のまわりを用意する。maxBuild: このフレームで作ってよい数（全部作るなら Infinity） */
  prepare(s, maxBuild = 1) {
    const al = this.al;
    const c0 = Math.floor(Math.max(al.sMin, s - BEHIND) / CHUNK), c1 = Math.floor(Math.min(al.sMax, s + AHEAD) / CHUNK);
    const want = new Set();
    for (let c = c0; c <= c1; c++) want.add(c);
    for (const [c, meshes] of this.chunks) if (!want.has(c)) { meshes.forEach(m => this.R.dispose(m)); this.chunks.delete(c); }
    let built = 0;
    // 近い順に作る
    const order = [...want].sort((a, b) => Math.abs((a + 0.5) * CHUNK - s) - Math.abs((b + 0.5) * CHUNK - s));
    for (const c of order) {
      if (this.chunks.has(c)) continue;
      if (built >= maxBuild) break;
      this.chunks.set(c, this._buildChunk(c)); built++;
    }
    this.route.stations.forEach((st, i) => {
      const near = st.stop > s - BEHIND - 200 && st.stop < s + AHEAD;
      if (near && !this.stations.has(i) && built < maxBuild) { this.stations.set(i, this._buildStation(i)); built++; }
      if (!near && this.stations.has(i)) {
        const r = this.stations.get(i);
        r.meshes.forEach(m => this.R.dispose(m));
        r.textures.forEach(t => this.R.gl.deleteTexture(t));
        this.stations.delete(i);
      }
    });
    return built;
  }

  /** 描く。train: 自列車, others: placeTrains の列車一覧 */
  render(train, others, time, dt) {
    const al = this.al;
    const aspect = this.R.resize(1.5);
    const cam = cabCamera(al, train.s, train.v, time, aspect);
    // トンネルの内と外で、空・霧・明るさをなめらかに切りかえる
    const sEye = train.s - 1.6;
    const inside = al.inTunnel(sEye) ? 1 : 0;
    const k = Math.min(1, dt * 2.5);
    this.tunnelMix += (inside - this.tunnelMix) * k;
    const m = this.tunnelMix, e = this.R.env;
    const mix = (a, b) => a + (b - a) * m;
    e.fog = [mix(OUT.fog[0], TUN.fog[0]), mix(OUT.fog[1], TUN.fog[1])];
    e.fogColor = OUT.color.map((c, i) => mix(c, TUN.color[i]));
    e.ambient = mix(OUT.ambient, TUN.ambient); e.sun = mix(OUT.sun, TUN.sun); e.night = mix(OUT.night, TUN.night);

    this.underlay.origin = [cam.pos[0], -30, cam.pos[2]];
    placeTrains(this.trains, al, this.veh, others, train.s, cam.pos);
    const list = [this.underlay];
    for (const meshes of this.chunks.values()) list.push(...meshes);
    for (const r of this.stations.values()) list.push(...r.meshes);
    list.push(this.trains.body, this.trains.glass, this.trains.tail, this.trains.head);
    // マテリアルの切りかえを減らす
    list.sort((a, b) => (a.material.id || 0) - (b.material.id || 0));
    this.R.render(list, cam);
    return cam;
  }
}
