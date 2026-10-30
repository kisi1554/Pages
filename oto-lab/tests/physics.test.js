// node --test oto-lab/tests/*.test.js
// おとの けいさんの「むき」と すうちを たしかめる（README の 出典 と あわせる）
const { test } = require("node:test");
const assert = require("node:assert/strict");
const P = require("../physics.js");

const inc = (xs, f) => xs.slice(1).every((x, i) => f(x) > f(xs[i]));
const dec = (xs, f) => xs.slice(1).every((x, i) => f(x) < f(xs[i]));
const steps = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);

test("わゴム: みじかい ほど たかい（f ∝ 1/L）", () => {
  assert.ok(dec(steps(0.3, 1, 14), (l) => P.stringFreq(l, 1.4)));
  assert.ok(Math.abs(P.stringFreq(0.5, 1) / P.stringFreq(1, 1) - 2) < 1e-9, "はんぶんの ながさ で 2ばい（1オクターブ）");
});

test("わゴム: ピンと はる ほど たかい（f ∝ √T）", () => {
  assert.ok(inc(steps(1, 2.25, 10), (t) => P.stringFreq(0.8, t)));
  assert.ok(Math.abs(P.stringFreq(1, 4) / P.stringFreq(1, 1) - 2) < 1e-9, "はり 4ばい で 2ばい");
});

test("わゴム: はじく つよさ は おおきさ だけ。たかさ は かわらない", () => {
  assert.equal(P.stringFreq.length, 2, "stringFreq に つよさ は はいらない");
  assert.ok(P.pluckAmp(1) > P.pluckAmp(0.3));
  assert.equal(P.pluckAmp(5), 1);
});

test("コップ（たたく）: 水が おおい ほど ひくい", () => {
  assert.ok(dec(steps(0.05, 1, 19), P.glassStrikeFreq));
  assert.equal(P.glassStrikeFreq(0), P.GLASS_F0);
});

test("コップ（ふく）: 水が おおい ほど たかい（たたく ときと ぎゃく）", () => {
  assert.ok(inc(steps(0, 0.95, 19), P.glassBlowFreq));
  const lo = P.glassBlowFreq(0.2), hi = P.glassBlowFreq(0.8);
  assert.ok(hi > lo && P.glassStrikeFreq(0.8) < P.glassStrikeFreq(0.2), "ふく と たたく で むきが ぎゃく");
  // 空気の 柱 13.8cm → c/4L ≈ 616Hz
  assert.ok(Math.abs(P.glassBlowFreq(0) - 340 / (4 * 0.138)) < 1e-6);
});

test("コップ: ドレミファソラ ぜんぶ 水の りょう で つくれて、ドが いちばん 水が おおい", () => {
  const fills = P.NOTES.map((n) => P.fillForStrike(n.f));
  fills.forEach((f, i) => {
    assert.ok(f != null && f >= 0 && f <= 0.98, `${P.NOTES[i].n}: ${f}`);
    assert.ok(Math.abs(P.cents(P.glassStrikeFreq(f), P.NOTES[i].f)) < 0.01, `${P.NOTES[i].n} が ぴったり`);
  });
  assert.ok(dec(fills.map((_, i) => i), (i) => fills[i]), "ド → ラ で 水が へる");
});

test("かえるの うた は ド〜ラ の 6つで ひける", () => {
  assert.ok(P.KAERU.length > 20);
  P.KAERU.forEach(([n, d]) => { assert.ok(n >= 0 && n <= 5); assert.ok(d > 0); });
  assert.deepEqual(P.KAERU.slice(0, 7).map((x) => P.NOTES[x[0]].n), ["ド", "レ", "ミ", "ファ", "ミ", "レ", "ド"]);
});

test("ドレミの しゅうはすう（平均律 A=440 の ド5〜ラ5）", () => {
  P.NOTES.forEach((n, i) => {
    const semis = [0, 2, 4, 5, 7, 9][i];
    assert.ok(Math.abs(n.f - 440 * Math.pow(2, (semis - 9) / 12 + 1)) < 0.01, n.n);
  });
  assert.equal(P.nearestNote(659, 30), 2);
  assert.equal(P.nearestNote(620, 30), -1);
});

test("おとの はやさ: 空気 やく 340m/秒（15℃）、0℃ で 331.5、水 は 4ばい いじょう", () => {
  assert.equal(P.SPEED_AIR, 340);
  assert.ok(Math.abs(P.speedAir(15) - 340.5) < 1e-9);
  assert.equal(P.speedAir(0), 331.5);
  assert.ok(P.SPEED_WATER / P.SPEED_AIR > 4);
  assert.ok(P.travelTime(1500, "water") < P.travelTime(1500, "air"));
  assert.equal(P.travelTime(1500, "space"), Infinity);
  assert.ok(Math.abs(P.travelTime(1500, "air") - 4.41) < 0.01);
});

test("かみなり: 3びょう → やく 1020m", () => {
  assert.equal(P.thunderDistance(3), 1020);
  assert.ok(P.thunderDistance(8) > P.thunderDistance(2));
});

test("やまびこ: いって かえる ので 2ばい", () => {
  assert.equal(P.echoDelay(170), 1);
  assert.equal(P.echoDelay(1020), 6);
  assert.ok(P.echoDelay(680) > P.echoDelay(340));
});

test("音量の 上限: どんなに あげても MAX_GAIN（0.5）まで", () => {
  assert.equal(P.volumeGain(1), P.MAX_GAIN);
  assert.equal(P.volumeGain(10), P.MAX_GAIN);
  assert.equal(P.volumeGain(-1), 0);
  assert.ok(P.MAX_GAIN <= 0.5);
});
