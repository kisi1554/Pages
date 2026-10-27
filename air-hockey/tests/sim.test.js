// しあい ぜんたい: CPU どうし で さいごまで すすむ・アイテム・10びょう ルール
const { test } = require("node:test");
const assert = require("node:assert/strict");
const S = require("../sim.js");
const P = require("../physics.js");

test("CPU どうし: どの つよさ の くみあわせ でも しあいが さいごまで すすむ（アイテム あり／なし）", () => {
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (const items of [false, true]) {
    const r = S.runCpuMatch([a, b], 5, items, 11 + a * 4 + b, 900);
    assert.ok(r.done, a + " vs " + b + " items=" + items + " " + JSON.stringify(r));
    assert.equal(Math.max(...r.score), 5);
  }
});

test("つよい CPU ほど かつ", () => {
  let strong = 0;
  for (let k = 0; k < 10; k++) if (S.runCpuMatch(k % 2 ? [0, 3] : [3, 0], 5, false, 200 + k).winner === (k % 2 ? 1 : 0)) strong++;
  assert.ok(strong >= 9, "めっちゃつよい が よわい に " + strong + "/10");
  let s2 = 0;
  for (let k = 0; k < 10; k++) if (S.runCpuMatch(k % 2 ? [1, 2] : [2, 1], 5, false, 300 + k).winner === (k % 2 ? 1 : 0)) s2++;
  assert.ok(s2 >= 6, "つよい が ふつう に " + s2 + "/10");
});

test("アイテム: こうかが でて、10びょうで もとに もどる", () => {
  const G = S.createGame({ target: 7, ctrl: ["human", "human"], levels: [1, 1], items: true, seed: 1, first: 0 });
  while (G.phase !== "play") S.tick(G);
  const w = G.world;
  S.applyItem(G, "multi", 0); assert.equal(w.pucks.length, 3);
  S.applyItem(G, "big", 0); assert.ok(w.mallets[0].r > P.MR * 1.4);
  S.applyItem(G, "narrow", 1); assert.ok(w.goalW[1] < P.GW * 0.6); assert.equal(w.goalW[0], P.GW);
  S.applyItem(G, "ice", 0); assert.equal(w.ice, true);
  S.applyItem(G, "wall", 0); assert.equal(w.wall, true);
  for (let t = 0; t < 13 / P.TICK && G.phase === "play"; t++) S.tick(G);
  if (G.phase === "play") {
    assert.equal(w.mallets[0].r, P.MR); assert.equal(w.goalW[1], P.GW);
    assert.equal(w.ice, false); assert.equal(w.wall, false);
    assert.ok(w.pucks.length <= 1, "ふえた パックが きえない");
  }
});

test("3つの パック: 1つ はいっても しあいは つづく。ぜんぶ はいったら サーブ", () => {
  const G = S.createGame({ target: 7, ctrl: ["human", "human"], levels: [1, 1], items: true, seed: 2, first: 0 });
  while (G.phase !== "play") S.tick(G);
  const w = G.world;
  S.applyItem(G, "multi", 0);
  w.pucks[0].x = 0.5; w.pucks[0].y = 0.05; w.pucks[0].vx = 0; w.pucks[0].vy = -2;
  for (let t = 0; t < 10; t++) S.tick(G);
  assert.equal(G.match.score[0], 1);
  assert.equal(G.phase, "play");
  assert.equal(w.pucks.length, 2);
  for (const p of w.pucks) { p.x = 0.5; p.y = P.L - 0.05; p.vx = 0; p.vy = 3; }
  for (let t = 0; t < 10; t++) S.tick(G);
  assert.equal(G.phase, "goal");
  assert.equal(G.match.score[1], 2);
});

test("10びょう ルール: かたほう の じんち に パックを もちつづけると あいての ばん", () => {
  const G = S.createGame({ target: 7, ctrl: ["human", "human"], levels: [1, 1], items: false, seed: 3, first: 0 });
  while (G.phase !== "play") S.tick(G);
  assert.ok(G.world.pucks[0].y > P.L / 2);
  let res = null;
  for (let t = 0; t < 12 / P.TICK && !res; t++) {
    S.tick(G);   // あおの じんち に とまった まま
    res = S.drain(G).find((e) => e.type === "reserve");
  }
  assert.ok(res, "リセット されない");
  assert.ok(G.world.pucks[0].y < P.L / 2, "あいての じんち から さいかい");
});
