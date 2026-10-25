// node --test soroban-dojo/tests/*.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const S = require("../soroban.js");

const K = { "+": ["direct", "five", "ten", "fiveten"], "-": ["direct", "five", "ten", "fiveten"] };

test("たま ⇔ かず: 0〜99999 を いったり きたり", () => {
  for (let n = 0; n <= 99999; n += 7) {
    const rods = S.fromNumber(n, 13, 11);
    assert.equal(S.toNumber(rods, 11), n);
    rods.forEach((b) => assert.ok(b.five >= 0 && b.five <= 1 && b.ones >= 0 && b.ones <= 4));
  }
  assert.equal(S.toNumber(S.fromNumber(999999, 7, 5), 5), 999999);
  assert.throws(() => S.fromNumber(1000000, 7, 5));
});

test("たまの かたち: 7 は 5だま＋1だま2こ、ていいてんの みぎは しょうすう", () => {
  assert.deepEqual(S.beadOf(7), { five: 1, ones: 2 });
  assert.deepEqual(S.beadOf(4), { five: 0, ones: 4 });
  const rods = S.fromNumber(0, 5, 3);
  rods[4] = { five: 1, ones: 0 };
  assert.equal(S.toNumber(rods, 3), 0.5);
  rods[0] = { five: 0, ones: 3 };
  assert.equal(S.toNumber(rods, 3), 3000.5);
});

// 1けた どうし を ぜんぶ（c=0..9, d=1..9, となりの けた 0..9）
for (const op of ["+", "-"]) {
  test(`1けた どうしの ${op}: ぜんパターンで こたえが あい、たまの うごきが ありえる`, () => {
    const seen = {};
    for (let t = 0; t <= 9; t++) for (let c = 0; c <= 9; c++) for (let d = 1; d <= 9; d++) {
      const a = t * 10 + c;
      if (op === "-" && a < d) continue;
      const kind = S.classify(c, d, op);
      seen[kind] = (seen[kind] || 0) + 1;
      const st = S.placesFromNumber(a, 5);
      const phases = op === "+" ? S.planAdd(st, d) : S.planSub(st, d);
      assert.equal(S.placesToNumber(st), op === "+" ? a + d : a - d, `${a}${op}${d}`);
      // おなじ うごきを はじめから もういちど やっても エラーに ならない（applyMove が けんさ）
      const again = S.placesFromNumber(a, 5);
      const moves = S.flatMoves(phases);
      moves.forEach((m) => S.applyMove(again, m));
      assert.deepEqual(again, st);
      // ゆび: 1だまを あげる＝おやゆび、さげる・5だま＝ひとさしゆび
      moves.forEach((m) => assert.equal(m.finger, m.bead === "one" && m.delta > 0 ? "thumb" : "index"));
      // いちのくらいの うごきの しゅるいは classify と おなじ
      moves.filter((m) => m.place === 0).forEach((m) => assert.equal(m.kind, kind, `${a}${op}${d}`));
      // しゅるいごとの かたち
      const u = moves.filter((m) => m.place === 0), hi = moves.filter((m) => m.place > 0);
      if (kind === "direct") {
        assert.equal(hi.length, 0);
        u.forEach((m) => assert.ok(op === "+" ? m.delta > 0 : m.delta < 0, "そのまま は いれる／はらう だけ"));
      } else if (kind === "five") {
        assert.equal(hi.length, 0);
        const f = u.find((m) => m.bead === "five"), o = u.find((m) => m.bead === "one");
        assert.ok(f && o);
        assert.equal(f.delta, op === "+" ? 1 : -1);
        assert.equal(Math.abs(o.delta), 5 - d, "5の あいかた");
        assert.ok(op === "+" ? o.delta < 0 : o.delta > 0);
      } else {
        assert.ok(hi.length > 0, "となりの けたを つかう");
        const net = u.reduce((s, m) => s + (m.bead === "five" ? 5 : 1) * m.delta, 0);
        assert.equal(net, op === "+" ? -(10 - d) : 10 - d, "10の あいかた");
        const usesFive = u.some((m) => m.bead === "five") && u.some((m) => m.bead === "one" && Math.sign(m.delta) !== Math.sign(net));
        if (kind === "fiveten") assert.ok(usesFive, `${a}${op}${d} は 5も つかう`);
      }
    }
    for (const k of K[op]) assert.ok(seen[k] > 0, `${op} の ${k} が ある`);
  });
}

test("ずかんの れい", () => {
  const one = (a, op, b) => { const st = S.placesFromNumber(a, 5); const ph = op === "+" ? S.planAdd(st, b) : S.planSub(st, b); return S.flatMoves(ph).map((m) => [m.place, m.bead, m.delta]); };
  assert.equal(S.classify(1, 4, "+"), "five");
  assert.deepEqual(one(1, "+", 4), [[0, "five", 1], [0, "one", -1]]);           // 5 を いれて 1 を はらう
  assert.equal(S.classify(3, 7, "+"), "ten");
  assert.deepEqual(one(3, "+", 7), [[0, "one", -3], [1, "one", 1]]);            // 3 を はらって となりに 1
  assert.equal(S.classify(6, 7, "+"), "fiveten");
  assert.deepEqual(one(6, "+", 7), [[0, "one", 2], [0, "five", -1], [1, "one", 1]]); // 6+7
  assert.equal(S.classify(6, 4, "-"), "five");
  assert.deepEqual(one(6, "-", 4), [[0, "one", 1], [0, "five", -1]]);           // 1 を いれて 5 を はらう
  assert.equal(S.classify(1, 7, "-"), "ten");
  assert.deepEqual(one(11, "-", 7), [[1, "one", -1], [0, "one", 3]]);           // となりから 1、3 を いれる
  assert.equal(S.classify(3, 6, "-"), "fiveten");
  assert.deepEqual(one(13, "-", 6), [[1, "one", -1], [0, "five", 1], [0, "one", -1]]);
  assert.equal(S.classify(2, 7, "+"), "direct");
  assert.equal(S.classify(4, 4, "+"), "five");
});

test("れんさする くりあがり・くりさがり（999+1, 1000-1）", () => {
  let r = S.planSeries(999, [1], 5);
  assert.equal(r.result, 1000);
  r = S.planSeries(1000, [-1], 5);
  assert.equal(r.result, 999);
  assert.ok(r.phases[0].carry);
});

test("たかい くらい から じゅんに うごかす", () => {
  const r = S.planSeries(0, [352], 5);
  assert.deepEqual(r.phases.map((p) => p.place), [2, 1, 0]);
});

test("みとりざん: てじゅんの こたえ ＝ たしざん", () => {
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 400; i++) {
    const g = S.GRADES[i % S.GRADES.length];
    const p = S.makeMitori(g.digits, g.count, g.minus, rand);
    assert.equal(p.terms.length, g.count);
    let run = 0;
    p.terms.forEach((t) => { run += t; assert.ok(run >= 0, "とちゅうで マイナスに ならない"); });
    assert.equal(run, p.answer);
    if (!g.minus) assert.ok(p.terms.every((t) => t > 0));
    assert.equal(S.planSeries(0, p.terms, 6).result, p.answer);
  }
});

test("ステップの もんだいは しゅるいが あっている", () => {
  let seed = 3; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const op of ["+", "-"]) for (const k of ["direct", "five", "ten", "fiveten"]) for (let i = 0; i < 50; i++) {
    const p = S.makeStepProblem(k, op, rand);
    assert.equal(S.classify(p.a % 10, p.b, op), k);
    assert.ok(p.answer >= 0 && p.answer < 100);
  }
  for (let i = 0; i < 50; i++) {
    const p = S.makeDirect2(i % 2 ? "+" : "-", rand);
    const ph = S.planSeries(p.a, [p.op === "+" ? p.b : -p.b], 4).phases;
    assert.ok(ph.every((x) => x.kind === "direct"));
  }
});

test("しんさ: 10きゅう → 1きゅう、ごうかくの はんてい", () => {
  assert.deepEqual(S.GRADES.map((g) => g.kyu), [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  const g = S.GRADES[0];
  assert.ok(S.judge(g, g.pass, g.sec));
  assert.ok(!S.judge(g, g.pass - 1, 10));
  assert.ok(!S.judge(g, g.n, g.sec + 1));
});
