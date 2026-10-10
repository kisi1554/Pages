import { test } from "node:test";
import assert from "node:assert/strict";
import { createTrainState, advance, stepTrain, tractionAccel, EB, notchLabel } from "../core/physics.js";
import { computeSignal, speedLimitAt, updateAtcBrake, floorToStep, patternSpeed } from "../core/atc.js";
import { computeRunTimes, buildTimetable, simulateLeader, leaderPositionAt, oncomingPositions } from "../core/timetable.js";
import { StationController, S } from "../core/station.js";
import { buildAlignment } from "../route/alignment.js";
import { formatTime, formatDelay } from "../core/clock.js";
import { toyoko, vehicle5050 } from "./helpers.js";

const veh = vehicle5050();
const flat = { grade: 0, curvature: 0, inTunnel: false, doorsClosed: true, atcBrake: 0 };

function runUntil(st, cond, env = flat, limit = 300) {
  let t = 0;
  while (!cond(st) && t < limit) { advance(st, veh, () => env, 0.05); t += 0.05; }
  return t;
}

test("車両: P5 で 0→40km/h が約12秒", () => {
  const st = createTrainState(); st.notch = 5;
  const t = runUntil(st, s => s.v >= 40);
  assert.ok(t > 11 && t < 13.5, `t=${t.toFixed(2)}`);
});

test("車両: B7 で 70km/h から約20秒で止まる", () => {
  const st = createTrainState(); st.v = 70; st.notch = -7;
  const t = runUntil(st, s => s.v <= 0);
  assert.ok(t > 18.5 && t < 21.5, `t=${t.toFixed(2)}`);
});

test("車両: 引張力は38km/hまで一定、それより上は下がる", () => {
  assert.equal(tractionAccel(veh, 3.3, 30), 3.3);
  assert.ok(Math.abs(tractionAccel(veh, 3.3, 76) - 3.3 * 38 / 76 * 72 / 76) < 1e-9);
  assert.ok(Math.abs(tractionAccel(veh, 3.3, 72) - 3.3 * 38 / 72) < 1e-9);
});

test("車両: ドアが開いているあいだは力行が効かない（戸閉インターロック）", () => {
  const st = createTrainState(); st.notch = 5;
  runUntil(st, () => false, { ...flat, doorsClosed: false }, 5);
  assert.equal(st.v, 0);
  assert.equal(st.power, 0);
});

test("車両: ブレーキを緩めて上り勾配にいると後退する（転動）", () => {
  const st = createTrainState(); st.notch = 0; st.brake = 0;
  runUntil(st, () => false, { ...flat, grade: 30 }, 5);
  assert.ok(st.v < 0 && st.s < 0, `v=${st.v}`);
  const held = createTrainState(); held.notch = -3;
  runUntil(held, () => false, { ...flat, grade: 30 }, 5);
  assert.equal(held.v, 0);
});

test("車両: 応答遅れ（力行は2.0km/h/s毎秒で立ち上がる）", () => {
  const st = createTrainState(); st.notch = 5; st.brake = 0;
  stepTrain(st, veh, flat, 0.5);
  assert.ok(Math.abs(st.power - 1.0) < 1e-9);
  assert.equal(notchLabel(EB), "EB");
});

test("計算の刻み: 大きな dt を渡しても 1/60 秒以下に分ける", () => {
  const a = createTrainState(), b = createTrainState();
  a.notch = b.notch = 5;
  advance(a, veh, () => flat, 1);
  for (let i = 0; i < 60; i++) advance(b, veh, () => flat, 1 / 60);
  assert.ok(Math.abs(a.v - b.v) < 1e-9);
});

const route = toyoko();

test("ATC: 先行列車が隣の区間にいると信号が0", () => {
  const L = route.atc.blockLength;
  assert.equal(computeSignal(route, 3 * L + 50, 4 * L + 10), 0);
  assert.equal(computeSignal(route, 3 * L + 50, 3 * L + 150), 0);
  assert.ok(computeSignal(route, 3 * L + 50, 6 * L + 10) > 0);
  // 遠いほど高い信号
  const near = computeSignal(route, 3000, 3600), far = computeSignal(route, 3000, 4600);
  assert.ok(far > near, `${near} → ${far}`);
});

test("ATC: 制限区間の手前で段階的に信号が下がる", () => {
  // 21200 から 55km/h の制限
  const seq = [];
  for (let s = 19700; s < 21200; s += 200) seq.push(computeSignal(route, s + 10));
  for (let i = 1; i < seq.length; i++) assert.ok(seq[i] <= seq[i - 1], seq.join(","));
  assert.equal(seq.at(-1), 55);
  assert.ok(new Set(seq).size >= 3, seq.join(","));
  for (const v of seq) assert.ok(route.atc.steps.includes(v));
});

test("ATC: 区間に掛かる制限が信号になる／段階に切り下げる", () => {
  assert.equal(speedLimitAt(route, 100), 45);
  assert.equal(computeSignal(route, 100), 45);
  assert.equal(floorToStep(route.atc.steps, 87), 75);
  assert.ok(Math.abs(patternSpeed(0, 100, 0.65) - Math.sqrt(130) * 3.6) < 1e-9);
});

test("ATC: 信号を超えたらブレーキ、信号以下で緩める", () => {
  assert.equal(updateAtcBrake(false, 66, 65), true);
  assert.equal(updateAtcBrake(true, 65.2, 65), true);
  assert.equal(updateAtcBrake(true, 64.9, 65), false);
  assert.equal(updateAtcBrake(false, 0, 0), true);
});

const al = buildAlignment(route);
const rows = buildTimetable(route, computeRunTimes(route, al, veh));

test("ダイヤ: 渋谷→横浜が約40〜45分", () => {
  const min = (rows.at(-1).arr - rows[0].dep) / 60;
  assert.ok(min >= 40 && min <= 45, `${min}分`);
  assert.equal(formatTime(rows[0].dep), "14:00:00");
  for (const r of rows.slice(1)) assert.equal(r.run % 5, 0);
  assert.equal(rows[2].dep - rows[2].arr, 30); // 中目黒は30秒
});

test("ダイヤ: 先行列車は3分前を走り、終着後に消える", () => {
  const rec = simulateLeader(route, al, veh, rows);
  assert.equal(leaderPositionAt(rec, rows[0].dep - 181), 0);
  const p = leaderPositionAt(rec, rows[0].dep);
  assert.ok(p > 1500, `p=${p}`);
  assert.equal(leaderPositionAt(rec, rows.at(-1).arr - 180 + 5), 24200);
  assert.equal(leaderPositionAt(rec, rows.at(-1).arr), null);
  assert.ok(oncomingPositions(route, rows[0].dep, -400, 5000).length >= 1);
  assert.equal(formatDelay(65), "+1:05");
});

// 停車判定
function stopAt(offset) {
  const sc = new StationController(rows, rows[0].dep - 30);
  // 渋谷を発車させる
  let t = rows[0].dep - 30, evs = [];
  while (sc.state !== S.READY) { sc.update(t, 0.1, { s: 0, v: 0, braking: true }); t += 0.1; }
  sc.update(t, 0.1, { s: 3, v: 10, braking: false });
  assert.equal(sc.state, S.RUN);
  const s = rows[1].station.stop - offset; // offset>0 で手前
  for (let i = 0; i < 40; i++) { evs.push(...sc.update(t, 0.1, { s, v: 0, braking: true })); t += 0.1; }
  return { sc, evs };
}

test("停車判定: 3mより手前は前進をうながし、ドアを開けない", () => {
  const { sc, evs } = stopAt(3.2);
  assert.equal(sc.state, S.RUN);
  assert.ok(evs.includes("short"));
  assert.match(sc.message, /てまえ/);
});

test("停車判定: ±3m以内はドアを開ける", () => {
  for (const off of [3, 0, -3]) {
    const { sc, evs } = stopAt(off);
    assert.ok(evs.includes("doorOpen"), `off=${off}`);
    assert.equal(sc.records[1].status, "ok");
  }
});

test("停車判定: 3〜10m行き過ぎはドアを開けて記録", () => {
  const { sc, evs } = stopAt(-3.5);
  assert.ok(evs.includes("doorOpen") && evs.includes("overrun"));
  assert.equal(sc.records[1].status, "over");
  const b = stopAt(-10);
  assert.equal(b.sc.records[1].status, "over");
});

test("停車判定: 10mを超えて行き過ぎたら記録して次の駅へ", () => {
  const { sc, evs } = stopAt(-10.5);
  assert.ok(evs.includes("pass"));
  assert.equal(sc.idx, 2);
  assert.equal(sc.records[1].status, "pass");
});

test("ドア: 発車10秒前に閉め、知らせ灯とブザー、2m進んで発車", () => {
  const start = rows[0].dep - 30;
  const sc = new StationController(rows, start);
  const seen = [];
  let t = start;
  for (; t < rows[0].dep; t += 0.1) for (const e of sc.update(t, 0.1, { s: 0, v: 0, braking: true })) seen.push([e, t]);
  const close = seen.find(e => e[0] === "doorClose");
  assert.ok(Math.abs(close[1] - (rows[0].dep - 10)) < 0.11);
  assert.ok(seen.some(e => e[0] === "buzzer"));
  assert.ok(sc.doorsClosed);
  sc.update(t, 0.1, { s: 1.9, v: 5, braking: false });
  assert.equal(sc.state, S.READY);
  sc.update(t, 0.1, { s: 2.1, v: 5, braking: false });
  assert.equal(sc.state, S.RUN);
  assert.ok(sc.records[0].dep >= rows[0].dep);
});
