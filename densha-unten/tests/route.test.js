import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRoute, RouteError, parseTime } from "../route/loader.js";
import { buildAlignment, buildProfile, MAX_GRADE } from "../route/alignment.js";
import { toyoko, toyokoRaw, readJSON } from "./helpers.js";

test("東横線のJSONを読みこめる", () => {
  const r = toyoko();
  assert.equal(r.stations.length, 21);
  assert.equal(r.stations[0].name, "渋谷");
  assert.equal(r.stations.at(-1).stop, 24200);
  assert.equal(r.timetable.firstDeparture, 14 * 3600);
  assert.equal(r.timetable.startTime, 14 * 3600 - 30);
});

test("一覧にある路線ファイルはすべて検証を通る", () => {
  for (const f of readJSON("data/routes/index.json").routes) validateRoute(readJSON("data/routes/" + f));
});

test("検証: こわれたデータはエラーにする", () => {
  const bad = (mut) => { const r = toyokoRaw(); mut(r); return () => validateRoute(r); };
  assert.throws(bad(r => { r.stations[3].stop = 100; }), RouteError);
  assert.throws(bad(r => { r.curves.list[0][3] = "X"; }), RouteError);
  assert.throws(bad(r => { r.speedLimits.list[0][2] = 50; }), /ATC/);
  assert.throws(bad(r => { r.structures.list[0][2] = "sky"; }), RouteError);
  assert.throws(bad(r => { delete r.meta; }), RouteError);
  assert.throws(() => parseTime("25時"), RouteError);
});

test("線形: 曲率を積分した座標が連続している", () => {
  const al = buildAlignment(toyoko());
  for (let i = 1; i < al.n; i++) {
    const d = Math.hypot(al.X[i] - al.X[i - 1], al.Z[i] - al.Z[i - 1]);
    assert.ok(Math.abs(d - al.step) < 1e-6, `i=${i} d=${d}`);
    assert.ok(Math.abs(al.B[i] - al.B[i - 1]) < 1 / 250, "方位が飛ばない");
  }
  // 起点は原点で、方位は startBearing
  assert.ok(Math.hypot(al.x(0), al.z(0)) < 1e-9);
  assert.ok(Math.abs(al.bearing(0) * 180 / Math.PI - 225) < 1e-9);
});

test("線形: 曲線の中では曲率が 1/R、緩和曲線で漸増する", () => {
  const al = buildAlignment(toyoko());
  assert.ok(Math.abs(al.curvature(400) + 1 / 400) < 1e-9);   // 左 R400
  assert.ok(Math.abs(al.curvature(1200) - 1 / 300) < 1e-9);  // 右 R300
  assert.ok(Math.abs(al.curvature(325) + 0.5 / 400) < 1e-9); // 緩和曲線の中ほど
  assert.equal(al.curvature(4000), 0);
});

test("縦断: 勾配が35‰を超えない", () => {
  const al = buildAlignment(toyoko());
  let max = 0;
  for (let s = al.sMin + 2; s < al.sMax - 2; s += 1) max = Math.max(max, Math.abs(al.grade(s)));
  assert.ok(max <= MAX_GRADE + 1e-6, `最急勾配 ${max.toFixed(2)}‰`);
  assert.ok(max > 20, "渋谷の地下からの上り坂がある");
});

test("縦断: 急な段差でも勾配を制限する", () => {
  const p = buildProfile([{ start: 0, end: 100, type: "tunnel", height: -30 }, { start: 100, end: 2000, type: "elev", height: 20 }], -500, 2500);
  for (let i = 1; i < p.h.length; i++) assert.ok(Math.abs(p.h[i] - p.h[i - 1]) / p.step * 1000 <= 35 + 1e-9);
});

test("構造物: 渋谷と横浜は地下、多摩川は橋、中目黒は高架", () => {
  const al = buildAlignment(toyoko());
  assert.ok(al.inTunnel(0) && al.height(0) < -15);
  assert.ok(al.inTunnel(24200));
  assert.equal(al.type(9500), "bridge");
  assert.equal(al.type(2200), "elev");
  assert.ok(al.height(3000) > 7);
});

test("島式ホームの駅では線路の間隔が広がる", () => {
  const al = buildAlignment(toyoko());
  assert.ok(Math.abs(al.halfSpacing(4000) - 1.9) < 1e-9);
  assert.ok(al.halfSpacing(7000) > 4.5);
});
