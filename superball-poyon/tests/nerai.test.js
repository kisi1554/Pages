// node --test superball-poyon/tests/*.test.js
// ④ の 30ステージ を こたえ（sol）で ヘッドレスに うごかし、ぜんぶ クリア できるか たしかめる
// ⑤ の はねかえりけいすう の ひょうが げんじつの じゅんばんと して おかしく ないか たしかめる
const { test } = require("node:test");
const assert = require("node:assert/strict");
const N = require("../nerai-stages.js");
const H = require("../hazumu-data.js");

test("④ ステージは 30こ。ぜんぶに なまえ・ヒント・こたえ", () => {
  assert.equal(N.STAGES.length, 30);
  assert.equal(new Set(N.STAGES.map((s) => s.name)).size, 30, "なまえが かぶらない");
  N.STAGES.forEach((st) => {
    assert.ok(st.name && st.hint && st.sling && st.goal, `#${st.no}`);
    assert.ok(Array.isArray(st.sol) && st.sol.length === 2, `#${st.no} こたえ`);
    assert.ok(Math.hypot(st.sol[0], st.sol[1]) <= N.K * N.MAXPULL + 1, `#${st.no} こたえは ひっぱれる はやさ`);
    if (st.goal.t === "bell") assert.ok(st.bells && st.bells.length, `#${st.no} ベル`);
    if (st.goal.t === "blocks") assert.ok(N.need(st) <= st.blocks.length, `#${st.no} ブロック`);
  });
  const kinds = new Set(N.STAGES.map((s) => s.goal.t));
  ["cup", "bell", "blocks"].forEach((t) => assert.ok(kinds.has(t), t));
  assert.ok(N.STAGES.some((s) => s.goal.bounce >= 3), "「3かい はねてから」が ある");
  assert.ok(N.STAGES.some((s) => s.goal.t === "blocks" && N.need(s) >= 2), "「ブロックを 2こ」が ある");
});

test("④ こたえで なげると 30ステージ ぜんぶ クリア", () => {
  N.STAGES.forEach((st) => {
    const sim = N.run(st, st.sol[0], st.sol[1]);
    assert.ok(sim.ok, `#${st.no} ${st.name}: ${sim.fail} はねた ${sim.bounces}`);
    assert.ok(sim.bounces >= (st.goal.bounce || 0), `#${st.no} はねた かず`);
  });
});

test("④ こたえを すこし ずらしても たいてい クリア（ぎりぎりの こたえ では ない）", () => {
  let ok = 0, all = 0;
  N.STAGES.forEach((st) => {
    for (const f of [0.98, 1.02]) { all++; if (N.run(st, st.sol[0] * f, st.sol[1] * f).ok) ok++; }
  });
  assert.ok(ok / all >= 0.85, `${ok}/${all}`);
});

test("④ けっていてき: おなじ なげかたなら おなじ けっか", () => {
  N.STAGES.forEach((st) => {
    const a = N.run(st, st.sol[0], st.sol[1]), b = N.run(st, st.sol[0], st.sol[1]);
    assert.equal(a.t, b.t, `#${st.no}`);
    assert.equal(a.ball.x, b.ball.x);
    assert.equal(a.bounces, b.bounces);
  });
});

test("④ なにも しないと クリア しない・じょうけんを まもらないと しっぱい", () => {
  N.STAGES.forEach((st) => {
    const sim = N.run(st, 0, 0);   // その ばに おとす だけ
    assert.ok(!sim.ok, `#${st.no} おとす だけ で クリア して しまう`);
  });
  // 「はねてから」: カップの まうえから おとすと はねずに はいる → しっぱい
  const st = { name: "t", hint: "t", sling: [600, 500], goal: { t: "cup", x: 600, y: 800, w: 200, bounce: 2 } };
  assert.equal(N.run(st, 0, 0).fail, "bounce");
  const st2 = { name: "t", hint: "t", sling: [600, 500], goal: { t: "cup", x: 600, y: 800, w: 200 } };
  assert.ok(N.run(st2, 0, 0).ok);
});

test("④ よそうせんは さいしょに はねる ところで とまる", () => {
  const st = N.STAGES[0], pts = N.preview(st, st.sol[0], st.sol[1]);
  assert.ok(pts.length > 10);
  const sim = N.build(st); N.launch(sim, st.sol[0], st.sol[1]);
  let first = null;
  sim.w.onHit = (b) => { if (!first) first = { x: b.x, y: b.y }; };
  for (let i = 0; i < 300 && !first; i++) sim.w.step(N.DT);
  const end = pts[pts.length - 1];
  assert.ok(Math.hypot(end[0] - first.x, end[1] - first.y) < 1, "はじめての しょうとつ ばしょ");
});

test("⑤ はねかえりけいすう の ひょう", () => {
  const { BALLS, FLOORS, E } = H;
  assert.equal(BALLS.length, 5); assert.equal(FLOORS.length, 5);
  BALLS.forEach((b) => FLOORS.forEach((f) => { const e = E[b.id][f.id]; assert.ok(e > 0 && e < 1, `${b.id}×${f.id}`); }));
  // かたい ゆか ほど よく はねる（ふつうの ゆか: コンクリート ≧ フローリング > たたみ > ふとん）
  BALLS.forEach((b) => {
    const e = E[b.id];
    assert.ok(e.concrete >= e.wood - 0.06 && e.wood > e.tatami && e.tatami > e.futon, b.id);
  });
  // コンクリートでは スーパーボールが いちばん、ボウリングの たまが いちばん はねない
  const on = (f) => BALLS.map((b) => [b.id, E[b.id][f]]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  assert.equal(on("concrete")[0], "super");
  FLOORS.forEach((f) => assert.equal(on(f.id)[4], "bowling", f.id));
  assert.ok(E.super.concrete > E.tennis.concrete && E.pingpong.concrete > E.tennis.concrete, "スーパーボール・ピンポン > テニス");
  // トランポリンは おもい ボウリングの たまでも はねる
  assert.ok(E.bowling.tramp > E.bowling.concrete * 3);
});
