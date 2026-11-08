#!/usr/bin/env node
/* しくみ の テスト:  node irekae-puzzle/test.js
 *  - 全 40 ステージ が ソルバー で とけて、めやす（par）＝ さいたん
 *  - はじめ の はいち が ていいん を こえない・まだ クリア して いない
 *  - どの て を うって も ていいん を こえない・かしゃ が ふえたり へったり しない
 *  - 1て もどる（まえ の じょうたい に もどす）で もと どおり
 *  - まいにち もんだい が かならず とける
 */
"use strict";
const assert = require("node:assert/strict");
const Y = require("./yard.js");
const STAGES = require("./stages.js");

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log("  ✓ " + name); };
const conv = (o) => ({
  id: o.id, H: o.H, par: o.par,
  tracks: o.tracks.map((c) => ({ cap: c })),
  start: { loco: o.start.loco.split(""), tr: o.start.tr.map((s) => s.split("")) },
  goal: { dep: o.goal.split(""), keep: o.keep ? [o.keep] : undefined }
});
const count = (s) => s.loco.concat(...s.tr).sort().join("");

ok("op: ぜんぶ つないで、きかんしゃ がわ から j りょう つれて もどる", () => {
  const st = { H: 3, tracks: [{ cap: 3 }, { cap: 3 }], goal: { dep: ["r"] } };
  const s = { loco: ["a", "b"], tr: [[], ["c", "d"]] };          // 1ばん: おく c、てまえ d
  assert.deepEqual(Y.combined(s, 1), ["a", "b", "d", "c"]);
  const t = Y.apply(s, 1, 3);
  assert.deepEqual(t, { loco: ["a", "b", "d"], tr: [[], ["c"]] });
  const u = Y.apply(s, 1, 0);
  assert.deepEqual(u.tr[1], ["c", "d", "b", "a"]);
  assert.equal(Y.valid(st, s, 1, 0), false, "4りょう は 3りょう の せんろ に はいらない");
  assert.equal(Y.valid(st, s, 1, 2), false, "なにも かわらない のは 1て に ならない");
  assert.equal(Y.valid(st, s, 1, 4), false, "ひきあげせん は 3りょう まで");
  assert.equal(Y.valid(st, s, 1, 1), true);
});

ok("40 ステージ・グループ ごと の せんろ と かしゃ の かず", () => {
  assert.equal(STAGES.length, 40);
  STAGES.forEach((o, i) => {
    assert.equal(o.id, i + 1);
    const sid = o.tracks.length - 1, cars = o.start.loco.length + o.start.tr.join("").length;
    if (o.id <= 10) { assert.equal(sid, 1); assert.equal(cars, 3); }
    else if (o.id <= 25) { assert.equal(sid, 2); assert.ok(cars >= 4 && cars <= 5); }
    else { assert.equal(sid, 3); assert.ok(cars >= 6 && cars <= 8, `#${o.id} ${cars}りょう`); }
    o.tracks.slice(1).forEach((c) => assert.ok(c >= 2 && c <= 5, `#${o.id} わきせん の ていいん ${c}`));
  });
  assert.ok(STAGES.slice(25).some((o) => o.keep) && STAGES.slice(25).some((o) => o.goal.includes("*")), "26〜40 に じょうけん つき が ある");
});

ok("全 ステージ が とけて、めやす ＝ さいたん、はじめ は ていいん いない", () => {
  STAGES.forEach((o) => {
    const st = conv(o), s = Y.startState(st);
    assert.ok(Y.fits(st, s), `#${o.id} ていいん`);
    assert.equal(Y.goalOk(st, s), false, `#${o.id} はじめ から できて いる`);
    const path = Y.solve(st, s);
    assert.ok(path, `#${o.id} とけない`);
    assert.equal(path.length, o.par, `#${o.id} さいたん ${path.length} と めやす ${o.par}`);
    // その とおり に うごかす と できあがる。とちゅう も ていいん を こえない
    let cur = s;
    for (const [x, j] of path) {
      assert.ok(Y.valid(st, cur, x, j), `#${o.id} ルール いはん の て`);
      const prev = cur;
      cur = Y.apply(cur, x, j);
      assert.ok(Y.fits(st, cur));
      assert.equal(count(cur), count(prev), "かしゃ の かず が かわった");
    }
    assert.ok(Y.goalOk(st, cur), `#${o.id} できあがらない`);
  });
});

ok("どの て でも ていいん を こえず、1て もどる で もと どおり", () => {
  const R = Y.rng(7);
  STAGES.forEach((o) => {
    const st = conv(o);
    let s = Y.startState(st);
    const hist = [];
    for (let step = 0; step < 40; step++) {
      const ms = Y.moves(st, s);
      assert.ok(ms.length > 0);
      ms.forEach(([x, j]) => assert.ok(Y.fits(st, Y.apply(s, x, j)) && !Y.same(Y.apply(s, x, j), s)));
      const [x, j] = ms[Math.floor(R() * ms.length)];
      hist.push(Y.clone(s));
      s = Y.apply(s, x, j);
    }
    while (hist.length) s = hist.pop();
    assert.ok(Y.same(s, Y.startState(st)), `#${o.id} もどらない`);
    // まえ の て を ぎゃく に うつ と もどる（j を もと の きかんしゃ の かず に）
    const a = Y.startState(st);
    Y.moves(st, a).forEach(([x, j]) => {
      const b = Y.apply(a, x, j);
      assert.ok(Y.same(Y.apply(b, x, a.loco.length), a), `#${o.id} ぎゃく の て`);
    });
  });
});

ok("じょうけん: ❔ は どれ でも、🔧 は きめた せんろ に", () => {
  const st = { H: 2, tracks: [{ cap: 3 }, { cap: 2 }, { cap: 2 }], goal: { dep: ["r", "*"], keep: [{ t: "x", tr: 2 }] } };
  assert.ok(Y.goalOk(st, { loco: [], tr: [["g", "r"], [], ["x"]] }));
  assert.ok(!Y.goalOk(st, { loco: [], tr: [["g", "r"], ["x"], []] }));
  assert.ok(!Y.goalOk(st, { loco: ["x"], tr: [["g", "r"], [], []] }));
  assert.ok(!Y.goalOk(st, { loco: [], tr: [["r", "g"], [], ["x"]] }));
});

ok("まいにち もんだい: 120にち ぶん とけて、めやす ＝ さいたん、おなじ ひ は おなじ もんだい", () => {
  const d0 = Date.UTC(2026, 10, 1);
  for (let i = 0; i < 120; i++) {
    const ds = new Date(d0 + i * 864e5).toISOString().slice(0, 10);
    const st = Y.makeDaily(ds);
    assert.ok(st && Y.fits(st, st.start) && !Y.goalOk(st, st.start), ds);
    const p = Y.solve(st, Y.startState(st));
    assert.ok(p && p.length === st.par && st.par >= 3, `${ds} ${st.par}`);
    assert.deepEqual(Y.makeDaily(ds).start, st.start);
  }
});

console.log(`ぜんぶ OK（${n}）`);
