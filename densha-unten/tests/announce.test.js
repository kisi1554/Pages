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
