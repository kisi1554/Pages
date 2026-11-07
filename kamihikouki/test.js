#!/usr/bin/env node
/* かみひこうき グライダー — しくみ の テスト:  node kamihikouki/test.js
 *  - どの ひこうき も なにも しないで 50m いじょう とぶ（かぜ なし・いろいろ な そら）
 *  - のぼる かぜ で たかさ が あがる、つばさ ひろ が いちばん よく のぼる
 *  - ストール から もどれる、ビル に ぶつかって も こわれない
 *  - きょり けいさん・スワイプ → なげかた・シード・おりがみ
 */
"use strict";
const path = require("path");
const F = require(path.join(__dirname, "flight.js"));
const Fo = require(path.join(__dirname, "fold.js"));

let fail = 0;
const check = (ok, m) => { if (!ok) fail++; console.log((ok ? "  ✓ " : "  ✗ ") + m); };

console.log("■ なにも しないで とぶ");
for (const id of F.PLANE_IDS) {
  const calm = F.simulate(id, 15, 11, F.makeWorld(1, { calm: true }));
  check(calm.dist >= 50, `${id}: かぜ なし で ${calm.dist}m（50m いじょう）`);
  let min = Infinity;
  for (let seed = 1; seed <= 60; seed++) min = Math.min(min, F.simulate(id, 15, 11, F.makeWorld(F.hash("t" + seed))).dist);
  check(min >= 50, `${id}: いろいろ な そら 60かい の さいてい ${min}m`);
  let weak = Infinity;
  for (const [a, v] of [[0, 5], [-10, 5], [45, 8], [75, 19], [30, 19]]) weak = Math.min(weak, F.simulate(id, a, v, F.makeWorld(1, { calm: true })).dist);
  check(weak >= 50, `${id}: よわい／つよい／まうえ な なげかた でも ${weak}m いじょう`);
}

console.log("■ のぼる かぜ");
const gain = {};
for (const id of F.PLANE_IDS) {
  const w = F.makeWorld(1, { calm: true });
  w.chunks.set(1, [{ type: "thermal", id: 999, x: 150, w: 400, s: 2.6, top: 200 }]);
  w.chunks.set(0, []); w.chunks.set(2, []); w.chunks.set(3, []);
  const s = F.throwPlane(id, 0, 9, { x: 120, y: 30 });
  for (let i = 0; i < 60; i++) F.step(s, 1 / 60, w);
  const y0 = s.y;
  for (let i = 0; i < 180; i++) F.step(s, 1 / 60, w);
  gain[id] = s.y - y0;
  check(gain[id] > 0, `${id}: 3びょう で ${gain[id].toFixed(1)}m あがる`);
}
check(gain.tsubasa > gain.heso && gain.tsubasa > gain.yari, "つばさ ひろ が いちばん よく のぼる");

console.log("■ おさえる と はな が うえ");
{
  const w = F.makeWorld(1, { calm: true });
  const a = F.throwPlane("heso", 0, 8), b = F.throwPlane("heso", 0, 8);
  a.hold = true;
  for (let i = 0; i < 30; i++) { F.step(a, 1 / 60, w); F.step(b, 1 / 60, w); }
  check(a.cl > b.cl && a.vy > b.vy, `おさえる と のぼる（vy ${a.vy.toFixed(2)} > ${b.vy.toFixed(2)}）`);
  for (let i = 0; i < 300; i++) { F.step(a, 1 / 60, w); F.step(b, 1 / 60, w); }
  check(a.airspeed < b.airspeed + 0.5, `のぼる と はやさ が おちる（${a.airspeed.toFixed(1)} ≦ ${b.airspeed.toFixed(1)}）`);
}

console.log("■ ストール");
for (const id of F.PLANE_IDS) {
  const w = F.makeWorld(1, { calm: true });
  const s = F.throwPlane(id, 70, 15, { x: 100, y: 60 });
  s.hold = true;
  let stalled = false, recovered = false;
  for (let i = 0; i < 600 && !s.landed; i++) {
    for (const e of F.step(s, 1 / 60, w)) { if (e.type === "stall") stalled = true; if (e.type === "recover") recovered = true; }
    if (recovered) s.hold = false;
  }
  check(stalled && recovered, `${id}: まうえ に なげて ストール → たてなおす`);
  const s2 = F.throwPlane(id, 70, 15, { x: 100, y: 60 });
  for (let i = 0; i < 6000 && !s2.landed; i++) F.step(s2, 1 / 60, w);
  check(s2.landed && s2.x > 140, `${id}: ストール した あと も まえ へ とんで ちゃくち（${Math.round(s2.x - 100)}m）`);
}

console.log("■ ビル・ふうせん・とり");
{
  const w = F.makeWorld(1, { calm: true });
  w.chunks.set(6, [{ type: "bldg", id: 1, x0: 620, x1: 640, h: 30, color: 0 }]);
  const s = F.throwPlane("yari", 0, 10, { x: 600, y: 10 });
  const ev = [];
  for (let i = 0; i < 1200 && !s.landed; i++) for (const e of F.step(s, 1 / 60, w)) ev.push(e.type);
  check(ev.includes("bonk") && s.landed && s.x < 620, "ビル に ぶつかる と ぽよん → まえ に ふわっ と おりる");
  const w2 = F.makeWorld(1, { calm: true });
  w2.chunks.set(1, [{ type: "balloon", id: 5, x: 130, y: 20, hue: 0 }, { type: "birds", id: 6, x: 160, y: 18, n: 3 }]);
  const s2 = F.throwPlane("heso", 0, 7, { x: 110, y: 20 });
  const ev2 = [];
  for (let i = 0; i < 600; i++) for (const e of F.step(s2, 1 / 60, w2)) ev2.push(e.type);
  check(ev2.includes("balloon") && s2.balloons === 1, "ふうせん を とる");
  check(ev2.includes("bird"), "とり の むれ と いっしょ に とぶ");
}

console.log("■ きょり・なげかた・そら");
check(F.distance({ x: 123.4 }) === 123 && F.distance({ x: -5 }) === 0, "きょり＝なげた ところ から の x");
check(F.distanceText(52.6) === "53メートル", "きょり の ことば");
const up = F.swipeToThrow(200, -200, 150, 400), flat = F.swipeToThrow(40, 0, 400, 400);
check(Math.abs(up.angle - 45) < 1 && up.speed > flat.speed, `ななめ に はやく スワイプ → 45ど・つよい（${up.speed.toFixed(1)} > ${flat.speed.toFixed(1)}）`);
check(F.swipeToThrow(-200, -200, 150, 400).angle > 0, "ひだり に スワイプ しても まえ へ なげる");
const d1 = F.dailySeed(new Date(2026, 10, 7)), d2 = F.dailySeed(new Date(2026, 10, 8));
check(d1.seed !== d2.seed && d1.seed === F.dailySeed(new Date(2026, 10, 7, 20)).seed, "きょう の そら は ひ ごと に かわり、おなじ ひ は おなじ");
const A = F.simulate("heso", 15, 11, F.makeWorld(d1.seed)).dist, B = F.simulate("heso", 15, 11, F.makeWorld(d1.seed)).dist;
check(A === B, `おなじ シード なら おなじ きょり（${A}m）`);
check(F.zoneAt(0).id === "park" && F.zoneAt(600).id === "town" && F.zoneAt(2000).id === "cloud", "けしき: こうえん → … → くも の うえ");

console.log("■ おりがみ");
const full = Fo.totalArea(Fo.paper());
for (const id of F.PLANE_IDS) {
  const st = Fo.STEPS[id];
  check(st.length >= 3 && st.length <= 4, `${id}: ${st.length} ステップ`);
  check(Math.abs(Fo.totalArea(Fo.finalLayers(id)) - full) < 1, `${id}: おって も かみ の めんせき は おなじ`);
  let L = Fo.paper(), ok = true;
  for (const s of st) {
    const fr = Fo.stepFrame(L, s, 1), nx = Fo.applyStep(L, s);
    if (Math.abs(Fo.totalArea(fr) - Fo.totalArea(nx)) > 1 || !Fo.flapArrow(L, s.folds[0])) ok = false;
    L = nx;
  }
  check(ok, `${id}: どの ステップ も やじるし が あり、アニメ の さいご ＝ おった かたち`);
  const b = Fo.bbox(Fo.topView(id));
  check(b.y0 >= -Fo.H - 0.1 && b.x1 <= Fo.W + 0.1, `${id}: でき あがり は かみ の なか`);
}

console.log(fail ? `\n✗ ${fail} こ だめ` : "\n✓ ぜんぶ OK");
process.exit(fail ? 1 : 0);
