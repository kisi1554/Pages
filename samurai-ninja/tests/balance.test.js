// node --test samurai-ninja/tests/*.test.js
// CPU どうしを 1000せん ずつ たたかわせて、さむらい と にんじゃ の かちが かたよりすぎない（35〜65%）ことを たしかめる
const { test } = require("node:test");
const assert = require("node:assert/strict");
const SN = require("../engine.js");
const AI = require("../ai.js");
const { series } = require("./sim.js");

for (const [lv, name] of [[0, "よわい"], [2, "ふつう"], [4, "つよい"]]) {
  test(`${name} どうし 1000せん: さむらい の かちは 35〜65%`, () => {
    const r = series(lv, lv, 1000);
    console.log(`  ${name}: さむらい ${(r.rate * 100).toFixed(1)}%  じかんぎれ ${(r.time * 100).toFixed(1)}%  へいきん ${r.avgSec.toFixed(1)}びょう`);
    assert.ok(r.rate >= 0.35 && r.rate <= 0.65, `かちりつ ${r.rate}`);
    assert.ok(r.time < 0.2, "ほとんどは じかんぎれ に ならず けっちゃく");
  });
}

test("つよい CPU は よわい CPU に かちこす（つよさの じゅんばん）", () => {
  let win = 0;
  for (let i = 0; i < 200; i++) {
    const ch = i % 2 ? ["samurai", "ninja"] : ["ninja", "samurai"];
    const m = SN.createMatch({ p1: ch[0], p2: ch[1] });
    const a = new AI.CPU(0, 4, i * 3 + 1), b = new AI.CPU(1, 0, i * 3 + 2);
    while (!m.over) SN.step(m, [a.input(m), b.input(m)]);
    if (m.winner === 0) win++;
  }
  assert.ok(win / 200 > 0.6, `つよい の かちりつ ${win / 200}`);
});

// こどもの そうさ（ちかづいて こうげき れんだ、ときどき ジャンプ・ひっさつ）でも つよい に かてる ことが ある
function kid(idx, seed) {
  const r = SN.rng(seed); let t = 0;
  return (m) => {
    const me = m.fighters[idx], o = m.fighters[1 - idx], I = {};
    t++;
    const d = o.x - me.x;
    if (Math.abs(d) > 110) I[d > 0 ? "r" : "l"] = true;
    if (t % 6 < 3 && r() < 0.7) I.a = true;
    if (r() < 0.01) I.j = true;
    if (me.sp >= 100 && r() < 0.05) I.s = true;
    if (me.C.guard && r() < 0.02) I.b = true;
    if (me.C.shuriken && Math.abs(d) > 250 && r() < 0.03) I.b = true;
    return I;
  };
}
test("こどもの れんだ でも つよい CPU に かてる ことが ある（でも かんたん すぎない）", () => {
  let win = 0;
  for (let i = 0; i < 400; i++) {
    const ch = i % 4 < 2 ? "samurai" : "ninja", foe = i % 2 ? "samurai" : "ninja";
    const m = SN.createMatch({ p1: ch, p2: foe });
    const k = kid(0, i + 7), c = new AI.CPU(1, 4, i + 99);
    while (!m.over) SN.step(m, [k(m), c.input(m)]);
    if (m.winner === 0) win++;
  }
  console.log(`  こども vs つよい: ${(win / 4).toFixed(1)}%`);
  assert.ok(win / 400 >= 0.05 && win / 400 <= 0.7, `かちりつ ${win / 400}`);
});
