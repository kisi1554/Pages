const { test } = require("node:test");
const assert = require("node:assert/strict");
const R = require("../rules.js");

test("とくてん と かちまけ（3／5／7／10てん）", () => {
  for (const target of R.TARGETS) {
    const m = R.createMatch(target, 0);
    for (let i = 0; i < target - 1; i++) { R.goal(m, 0); assert.equal(m.winner, -1); }
    R.goal(m, 1);
    assert.deepEqual(m.score, [target - 1, 1]);
    R.goal(m, 0);
    assert.equal(m.winner, 0);
    R.goal(m, 1);   // おわったら もう ふえない
    assert.deepEqual(m.score, [target, 1]);
  }
});
test("いれられた がわ から さいかい", () => {
  const m = R.createMatch(7, 0);
  R.goal(m, 0); assert.equal(m.serve, 1);
  R.goal(m, 1); assert.equal(m.serve, 0);
});
test("へんな てんすう は 7てん", () => { assert.equal(R.createMatch(4).target, 7); });
