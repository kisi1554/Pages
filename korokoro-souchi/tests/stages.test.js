// node --test korokoro-souchi/tests/*.test.js
// ステージの こたえ（sol）を おいて ヘッドレスで うごかし、ぜんぶ クリアできるか たしかめる
const { test } = require("node:test");
const assert = require("node:assert/strict");
const K = require("../parts.js");
const { STAGES } = require("../stages.js");

const clone = (o) => JSON.parse(JSON.stringify(o));
const count = (arr) => arr.reduce((m, p) => ((m[p.t] = (m[p.t] || 0) + 1), m), {});

test("ステージは 15こ。1〜5 は 1こ、6〜10 は 2〜3こ おく", () => {
  assert.equal(STAGES.length, 15);
  STAGES.forEach((st, i) => {
    const n = Object.values(st.inv).reduce((a, b) => a + b, 0);
    if (i < 5) assert.equal(n, 1, `#${i + 1}`);
    else if (i < 10) assert.ok(n >= 2 && n <= 3, `#${i + 1}`);
    else assert.ok(n >= 2, `#${i + 1}`);
    assert.ok(st.name && st.hint, `#${i + 1} なまえ と ヒント`);
    assert.ok(st.fixed.some((p) => p.t === "bell"), `#${i + 1} ベルが ある`);
    assert.ok(st.fixed.every((p) => p.f), `#${i + 1} さいしょの ぶひんは うごかせない`);
    assert.ok(st.sol.every((p) => !p.f && K.TYPES[p.t]), `#${i + 1} こたえの ぶひん`);
  });
  const kinds = new Set(STAGES.slice(10).flatMap((st) => st.fixed.concat(st.sol).map((p) => p.t)));
  ["domino", "seesaw", "bucket"].forEach((t) => assert.ok(kinds.has(t), `11〜15 に ${t}`));
});

test("こたえは つかえる ぶひんの かずと おなじで、ちゃんと おける", () => {
  STAGES.forEach((st, i) => {
    assert.deepEqual(count(st.sol), st.inv, `#${i + 1} かず`);
    const all = st.fixed.concat(st.sol);
    all.forEach((p, j) => assert.ok(K.canPlace(all, p, j), `#${i + 1} ${p.t} が めりこんでいる`));
  });
});

STAGES.forEach((st, i) => {
  test(`#${i + 1} ${st.name}: こたえを おくと ベルが なり、おかないと ならない`, () => {
    const r = K.simulate(clone(st.fixed.concat(st.sol)), 25);
    assert.ok(r.cleared, `#${i + 1} こたえで クリア できない`);
    assert.ok(!K.simulate(clone(st.fixed), 25).cleared, `#${i + 1} なにも おかなくても クリア できてしまう`);
    if (st.sol.length > 1) {
      st.sol.forEach((p, k) => {
        const l = st.fixed.concat(st.sol.filter((_, j) => j !== k));
        assert.ok(!K.simulate(clone(l), 25).cleared, `#${i + 1} ${p.t} が なくても クリア できてしまう`);
      });
    }
  });
});

test("けっていてき: おなじ はいちなら まいかい おなじ けっか", () => {
  [3, 12, 15].forEach((n) => {
    const st = STAGES[n - 1], l = st.fixed.concat(st.sol);
    const run = () => {
      const s = K.buildWorld(clone(l)), w = s.world;
      for (let k = 0; k < 120 * 6; k++) w.step();
      return w.bodies.map((b) => [b.x, b.y, b.a].join(",")).join("|") + "#" + (w.bell ? w.bell.time : "-");
    };
    assert.equal(run(), run(), `#${n}`);
  });
});

test("ねむり: とまった ものは けいさんを やめる", () => {
  const s = K.buildWorld([{ t: "domino", x: 600, y: 729.5, a: 0 }, { t: "steel", x: 300, y: 745, a: 0 }]), w = s.world;
  for (let k = 0; k < 120 * 2; k++) w.step();
  assert.equal(w.awakeCount(), 0);
});
