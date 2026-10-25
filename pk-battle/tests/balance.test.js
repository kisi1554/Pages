// CPU どうし 10000本 で せいこうりつ が げんじつに ちかい（70〜80% くらい）か
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { run } = require("./balance.js");

test("ふつう どうし: 10000本 で 70〜80%", () => {
  const c = run(1, 1, 1011);
  const g = c.goal / 10000;
  assert.ok(g >= 0.7 && g <= 0.8, "せいこうりつ " + g);
  assert.ok(c.save / 10000 > 0.1, "セーブ が すくない");
  assert.ok(c.miss / 10000 > 0.03 && c.miss / 10000 < 0.12, "はずれ " + c.miss);
});

test("キーパーが つよい ほど きまりにくい（よわい CPU なら こどもが かてる）", () => {
  const w = run(1, 0, 1).goal, n = run(1, 1, 2).goal, s = run(1, 2, 3).goal;
  assert.ok(w > n && n > s, [w, n, s].join(" "));
});

test("にんげんの キーパーの てだすけ: こどもモデル の キーパーで CPU が きめる かくりつ が さがる", () => {
  const A = require("../ai.js"), { kidVs } = require("./balance.js");
  const base = kidVs(1, 77, 600).cpu;
  const H = A.HUMAN_KEEPER, keep = Object.assign({}, H);
  Object.assign(H, { reach: 1, early: -0.18, exploit: 1, catchSkill: 0.55 });
  const hard = kidVs(1, 77, 600).cpu;
  Object.assign(H, keep);
  assert.ok(base < hard - 0.02, "てだすけ あり " + base + " / なし " + hard);
});
