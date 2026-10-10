import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRoute, validateVehicle } from "../route/loader.js";
import { buildAlignment } from "../route/alignment.js";
import { computeRunTimes, buildTimetable } from "../core/timetable.js";
import { announcement, soonDistance } from "../core/announce.js";
import { readJSON, toyoko } from "./helpers.js";

const kt = validateRoute(readJSON("data/routes/keihin-tohoku.json"));

test("京浜東北線: 15駅・東京→横浜 28.8km、E233系10両", () => {
  assert.equal(kt.stations.length, 15);
  assert.equal(kt.stations[0].name, "東京");
  assert.equal(kt.stations.at(-1).stop, 28800);
  const veh = validateVehicle(readJSON(`data/vehicles/${kt.meta.vehicle}.json`));
  assert.equal(veh.cars, 10);
  assert.equal(veh.length, 200);
  for (const st of kt.stations) assert.ok(st.length >= veh.length, `${st.name} のホームが短い`);
});

test("京浜東北線: ダイヤが約35〜45分", () => {
  const veh = validateVehicle(readJSON(`data/vehicles/${kt.meta.vehicle}.json`));
  const rows = buildTimetable(kt, computeRunTimes(kt, buildAlignment(kt), veh));
  const min = (rows.at(-1).arr - rows[0].dep) / 60;
  assert.ok(min >= 35 && min <= 45, `${min}分`);
});

test("アナウンス: 次は〜、乗りかえ、ドアの側（かなで読む）", () => {
  const a = announcement(kt, "next", 6); // 品川
  assert.match(a.text, /^次は、品川、品川。/);
  assert.match(a.text, /京急線/);
  assert.match(a.text, /お出口は、右側です。$/);           // 島式 → 右
  assert.match(a.speech, /^つぎは、しながわ、しながわ。/);
  assert.doesNotMatch(a.speech, /品川/);
  const ty = toyoko();
  assert.match(announcement(ty, "next", 1).text, /左側/);  // 代官山（相対式）→ 左
  assert.doesNotMatch(announcement(ty, "next", 1).text, /お乗り換え/);
});

test("アナウンス: 始発・まもなく・終点", () => {
  assert.match(announcement(kt, "start", 0).text, /京浜東北線.*各駅停車、横浜行き/);
  assert.match(announcement(kt, "soon", 3).text, /^まもなく、浜松町です。/);
  assert.match(announcement(kt, "next", 14).text, /^次は、終点、横浜/);
  assert.match(announcement(kt, "soon", 14).text, /お忘れ物/);
  assert.match(announcement(kt, "arrive", 14).text, /終点です/);
  assert.ok(soonDistance(kt, 1) <= 800 * 0.4 + 1e-9);   // 駅間が短いと手前で
  assert.equal(soonDistance(kt, 10), 450);
});

test("検証: 乗りかえの書き方がちがうとエラー", () => {
  const raw = readJSON("data/routes/keihin-tohoku.json");
  raw.stations[0].transfers = ["山手線"];
  assert.throws(() => validateRoute(raw), /transfers/);
});

import { reverseRoute } from "../route/reverse.js";

test("全路線 × 両方向: 検証・ホームの長さ・ダイヤ・勾配", () => {
  for (const f of readJSON("data/routes/index.json").routes) {
    const down = validateRoute(readJSON("data/routes/" + f));
    const veh = validateVehicle(readJSON(`data/vehicles/${down.meta.vehicle}.json`));
    for (const r of [down, reverseRoute(down)]) {
      const name = `${f} ${r.meta.service}`;
      for (const st of r.stations) assert.ok(st.length >= veh.length, `${name}: ${st.name} のホームが短い`);
      const al = buildAlignment(r);
      for (let s = r.sMin + 2; s < r.sMax - 2; s += 5) assert.ok(Math.abs(al.grade(s)) <= 35 + 1e-6, `${name}: 勾配 s=${s}`);
      const rows = buildTimetable(r, computeRunTimes(r, al, veh));
      const min = (rows.at(-1).arr - rows[0].dep) / 60;
      assert.ok(min > 25 && min < 55, `${name}: ${min}分`);
      assert.ok(announcement(r, "next", 1).text.startsWith("次は、" + r.stations[1].name));
    }
  }
});

test("相鉄線・京急線: 駅の数と距離、京急は標準軌・18m車6両", () => {
  const so = validateRoute(readJSON("data/routes/sotetsu.json"));
  assert.equal(so.stations.length, 18);
  assert.equal(so.stations.at(-1).name, "海老名");
  assert.equal(so.stations.at(-1).stop, 24600);
  const kk = validateRoute(readJSON("data/routes/keikyu.json"));
  assert.equal(kk.stations.length, 25);
  assert.equal(kk.stations.at(-1).stop, 22200);
  assert.equal(kk.meta.gauge, 1435);
  const v = validateVehicle(readJSON("data/vehicles/keikyu-1000.json"));
  assert.equal(v.cars * v.carLength, v.length);
});

test("ブルーライン: 横浜→あざみ野 13駅・17.9km、最高80km/h", () => {
  const b = validateRoute(readJSON("data/routes/blueline.json"));
  assert.equal(b.stations.length, 13);
  assert.equal(b.stations[0].name, "横浜");
  assert.equal(b.stations.at(-1).name, "あざみ野");
  assert.equal(b.stations.at(-1).stop, 17900);
  assert.equal(b.stations.find(s => s.name === "新横浜").stop, 7000);
  assert.equal(b.meta.maxSpeed, 80);
  assert.match(announcement(b, "next", 5).text, /新幹線/);
});
