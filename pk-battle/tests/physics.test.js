const { test } = require("node:test");
const assert = require("node:assert/strict");
const P = require("../physics.js");
const A = require("../ai.js");
const { TEAMS } = require("../teams.js");

const stay = { size: 1, dive: { cell: null, t: 0 }, catchSkill: 0.5 };
const dive = (cell, t, size) => ({ size: size || 1, dive: { cell, t }, catchSkill: 0.5 });
const S = (tx, ty, power, curve) => ({ tx, ty, power, curve: curve || 0, noScatter: true });

test("ねらった ところに とぶ（キーパーが いなければ はいる）", () => {
  const r = P.runShot(S(2.6, 0.5, 0.8), stay, 1);
  assert.equal(r.goal, true);
  assert.ok(Math.abs(r.cross.x - 2.6) < 0.1 && Math.abs(r.cross.y - 0.5) < 0.1, JSON.stringify(r.cross));
  assert.equal(r.cell, 8);
});

test("つよすぎる と バーの うえ（ふかす）", () => {
  const r = P.runShot(S(0, 1.6, 1.3), stay, 1);
  assert.equal(r.goal, false);
  assert.equal(r.kind, "over");
});

test("ずれすぎ は ポストの そと", () => {
  const r = P.runShot(S(4.4, 1.0, 0.8), stay, 1);
  assert.equal(r.kind, "wide");
});

test("ポスト・バーに あたると はねかえる（カーン）", () => {
  const r = P.runShot(S(3.72, 1.0, 0.8), stay, 1);
  assert.equal(r.posted, true);
  const b = P.runShot(S(-1, 2.5, 0.8), stay, 1);
  assert.equal(b.posted, true);
  // ポストの うちがわ に あたって はいる ことも ある
  let inPost = 0;
  for (let x = 3.5; x < 3.9; x += 0.01) { const q = P.runShot(S(x, 1.0, 0.8), stay, 1); if (q.detail === "goal_post") inPost++; }
  assert.ok(inPost > 0, "ポストに あたって はいる シュートが ない");
});

test("カーブ: さいごは まがった ほうへ", () => {
  const sim = P.createShot(S(0, 1.0, 0.7, 1), stay, 1);
  let mid = null;
  while (!sim.done) { P.stepShot(sim, 1 / 120); if (!mid && sim.pos.z > 5.5) mid = sim.pos.x; }
  assert.ok(mid < sim.result.cross.x - 0.2, "まがって いない " + mid + " " + sim.result.cross.x);
});

test("キーパー: ただしい むきに まにあえば とめる、おそいと まにあわない、ぎゃく だと とどかない", () => {
  assert.equal(P.runShot(S(2.4, 1.2, 0.8), dive(5, 0), 1).kind, "save");
  assert.equal(P.runShot(S(2.4, 1.2, 0.8), dive(5, 0.35), 1).goal, true);
  assert.equal(P.runShot(S(2.4, 1.2, 0.8), dive(3, 0), 1).goal, true);
  // すみの ぎりぎり は ただしく とんでも とどかない
  assert.equal(P.runShot(S(3.4, 2.25, 0.8), dive(2, 0), 1).goal, true);
});

test("キーパーの て の とどく はんい は からだ の おおきさ で かわる", () => {
  const big = P.keeperPose(P.keeperPlan(dive(5, 0, 1.1)), 1), small = P.keeperPose(P.keeperPlan(dive(5, 0, 0.9)), 1);
  assert.ok(big.hand.x > small.hand.x + 0.3);
  // まんなか に たって いる キーパーに まっすぐ けると あたる
  assert.equal(P.runShot(S(0, 1.0, 0.7), stay, 1).kind, "save");
});

test("マスの ばんごう", () => {
  assert.equal(P.cellOf(-3, 2.2), 0);
  assert.equal(P.cellOf(0, 1.2), 4);
  assert.equal(P.cellOf(3, 0.2), 8);
  for (let i = 0; i < 9; i++) { const c = P.cellCenter(i); assert.equal(P.cellOf(c.x, c.y), i); }
});

test("おなじ たね なら おなじ けっか（シミュレーションが さいげん できる）", () => {
  const a = A.simulateKick(TEAMS[0], 1, TEAMS[1], 1, P.rng(5));
  const b = A.simulateKick(TEAMS[0], 1, TEAMS[1], 1, P.rng(5));
  assert.deepEqual(a, b);
});

test("CPU の くせ: どうぶつ チーム は みぎ、おかし チーム は ひだり に おおく ける", () => {
  const r = P.rng(3), cnt = (team) => { const c = [0, 0, 0]; for (let i = 0; i < 3000; i++) c[A.cpuCell(team, 1, r) % 3]++; return c; };
  const an = cnt(TEAMS.find((t) => t.id === "animal")), sw = cnt(TEAMS.find((t) => t.id === "sweets"));
  assert.ok(an[2] > an[0] * 1.3); assert.ok(sw[0] > sw[2] * 1.4);
});

test("キーパーが はやく とびすぎると、つよい CPU は ぎゃくへ ける", () => {
  const r = P.rng(9); let opp = 0;
  for (let i = 0; i < 500; i++) if (A.exploit(5, 3, 2, r) % 3 === 2) opp++;
  assert.ok(opp > 0 && A.exploit(5, 5, 2, r) % 3 === 0);
});

test("8チーム: じつざいの なまえを つかわない・いろが ある", () => {
  assert.equal(TEAMS.length, 8);
  for (const t of TEAMS) {
    assert.match(t.shirt, /^#[0-9a-f]{6}$/i);
    assert.doesNotMatch(t.name, /FC|ユナイテッド|シティ|マドリー|バルセロナ|ジャパン|ニッポン|アントラーズ|レッズ|マリノス|フロンターレ/);
  }
});
