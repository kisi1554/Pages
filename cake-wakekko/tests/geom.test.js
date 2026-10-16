// node --test cake-wakekko/tests/*.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const G = require("../geom.js");

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} ≈ ${b} (±${tol})`);

test("めんせき: しかく・まる", () => {
  near(G.area(G.rect(4, 3)), 12, 1e-9);
  const c = G.circle(100);
  near(G.area(c), Math.PI * 100 * 100, Math.PI * 100 * 100 * 0.002, "96かくけい は まるに ちかい");
  assert.ok(G.signedArea(c) > 0, "反時計まわり");
});

test("まるを ちゅうしんで きると ほぼ はんぶん", () => {
  const c = G.circle(100), A = G.area(c);
  for (const deg of [0, 17, 45, 90, 133]) {
    const a = deg * Math.PI / 180;
    const parts = G.splitByLine(c, [0, 0], [Math.cos(a), Math.sin(a)]);
    assert.equal(parts.length, 2, `${deg}°`);
    near(G.area(parts[0]), A / 2, A * 0.005, `${deg}°`);
    near(G.area(parts[0]) + G.area(parts[1]), A, 1e-6);
  }
});

test("しかくを たてに 1/4 の ところで きる", () => {
  const r = G.rect(400, 200);
  const parts = G.splitByLine(r, [-100, 0], [0, 1]).map(G.area).sort((a, b) => a - b);
  assert.deepEqual(parts.map(Math.round), [20000, 60000]);
});

test("かからない せん では きれない", () => {
  const r = G.rect(100, 100);
  assert.equal(G.splitByLine(r, [0, 500], [1, 0]).length, 1);
});

test("へこんだ かたち（コの字）を よこに きると 3つ", () => {
  // コの字: 0..30 x 0..30 から まんなか 10..20 x 10..30 を けずる
  const U = [[0, 0], [30, 0], [30, 30], [20, 30], [20, 10], [10, 10], [10, 30], [0, 30]];
  const total = G.area(U);
  const parts = G.splitByLine(U, [0, 20], [1, 0]);
  assert.equal(parts.length, 3);
  near(parts.reduce((s, p) => s + G.area(p), 0), total, 1e-6);
  const small = parts.map(G.area).sort((a, b) => a - b);
  assert.deepEqual(small.map(Math.round), [100, 100, 500]);
});

test("おうぎがた: 3つ あわせると まると おなじ、1つは 1/3", () => {
  const T = G.TAU, A = G.area(G.circle(100));
  const s = [0, 1, 2].map(i => G.sectorArea(100, i * T / 3, (i + 1) * T / 3));
  near(s[0] + s[1] + s[2], A, 1e-6);
  for (const v of s) near(v, A / 3, A * 0.003);
});

test("270°の おうぎがた（へこみ あり）を ちゅうしんの せんで きる", () => {
  const T = G.TAU, sec = G.sector(100, 0, T * 0.75);
  const A = G.area(sec);
  const parts = G.splitByLine(sec, [0, 0], [1, 1]);   // 45° と 225° の せん
  assert.ok(parts.length >= 2);
  near(parts.reduce((s, p) => s + G.area(p), 0), A, 1e-6);
});

test("きれた かけらの めんせきの ごうけいは かわらない（ランダム）", () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let pieces = [G.circle(200)];
  const total = G.area(pieces[0]);
  for (let k = 0; k < 6; k++) {
    const p = [rnd() * 200 - 100, rnd() * 200 - 100], a = rnd() * Math.PI;
    pieces = pieces.flatMap(poly => G.splitByLine(poly, p, [Math.cos(a), Math.sin(a)]));
  }
  assert.ok(pieces.length > 6);
  near(pieces.reduce((s, p) => s + G.area(p), 0), total, 1e-4);
});

test("ないがい はんてい と せんぶん", () => {
  const r = G.rect(10, 10);
  assert.ok(G.pointInPoly([0, 0], r));
  assert.ok(!G.pointInPoly([6, 0], r));
  assert.ok(G.segmentHitsPoly([-20, 0], [20, 0], r));
  assert.ok(!G.segmentHitsPoly([-20, 8], [20, 8], r));
});

test("はんてい: ゆるす はば", () => {
  assert.ok(G.judge([100, 112], 0.10).ok);
  assert.ok(!G.judge([100, 125], 0.10).ok);
  assert.ok(!G.judge([100, 112], 0.05).ok);
  assert.deepEqual(G.frac(2, 4), [1, 2]);
  assert.deepEqual(G.frac(3, 2), [3, 2]);
});
