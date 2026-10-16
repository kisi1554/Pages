// node --test korokoro-souchi-2/tests/*.test.js
// ステージの こたえを ヘッドレスで うごかして、ぜんぶ クリア できるか たしかめる
const { test } = require("node:test");
const assert = require("node:assert/strict");
const KP = require("../parts.js");
const { STAGES } = require("../stages.js");

const SEC = 20;

test("ステージは 15こ", () => {
  assert.equal(STAGES.length, 15);
});

STAGES.forEach((st, i) => {
  test(`ステージ${i + 1}「${st.name}」: こたえで ベルが なる`, () => {
    const r = KP.simulate(st.fixed.concat(st.sol), SEC);
    assert.ok(r.hit, "ベルが ならない");
  });
  test(`ステージ${i + 1}: なにも おかないと ならない`, () => {
    assert.ok(!KP.simulate(st.fixed, SEC).hit, "ぶひん なしで クリア できてしまう");
  });
  test(`ステージ${i + 1}: こたえの ぶひんは どれも ひつよう`, () => {
    if (st.sol.length < 2) return;
    st.sol.forEach((_, k) => {
      const parts = st.fixed.concat(st.sol.filter((_, j) => j !== k));
      assert.ok(!KP.simulate(parts, SEC).hit, `${st.sol[k].t} が なくても クリア できてしまう`);
    });
  });
  test(`ステージ${i + 1}: こたえは つかえる ぶひんの かず いない`, () => {
    const used = {};
    st.sol.forEach((p) => { used[p.t] = (used[p.t] || 0) + 1; });
    for (const t in used) assert.ok((st.tools[t] || 0) >= used[t], `${t} が おおすぎる`);
    st.fixed.forEach((p) => assert.ok(p.fixed, "fixed の ぶひんには fixed: true"));
  });
});

test("けっていてき: おなじ はいちなら まいかい おなじ けっか", () => {
  STAGES.forEach((st) => {
    const a = KP.simulate(st.fixed.concat(st.sol), SEC), b = KP.simulate(st.fixed.concat(st.sol), SEC);
    assert.equal(a.time, b.time);
    const pa = a.world.bodies.map((o) => [o.x, o.y, o.a]), pb = b.world.bodies.map((o) => [o.x, o.y, o.a]);
    assert.deepEqual(pa, pb);
  });
});

test("こたえを すこし ずらしても たいてい クリア できる（きびしすぎない）", () => {
  STAGES.forEach((st, i) => {
    let ok = 0, n = 0;
    for (const dx of [-10, 0, 10]) for (const dy of [-10, 0, 10]) {
      const sol = st.sol.map((p) => Object.assign({}, p, { x: p.x + dx, y: p.y + dy }));
      n++; if (KP.simulate(st.fixed.concat(sol), SEC).hit) ok++;
    }
    assert.ok(ok >= n / 2, `ステージ${i + 1}: ${ok}/${n}`);
  });
});

test("じゆう モードの ぶひんは ぜんぶ つくれる", () => {
  const parts = KP.ORDER.map((t, i) => ({ t, x: 80 + i * 70, y: 300 }));
  const w = KP.build(parts);
  for (let i = 0; i < 240; i++) w.step();
  w.bodies.forEach((b) => assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y)));
});
