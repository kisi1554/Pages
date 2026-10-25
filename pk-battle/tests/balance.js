// CPU どうし で たくさん けらせて せいこうりつ を しらべる（README の ひょう を つくる）
//   node pk-battle/tests/balance.js [ほんすう=10000]
const A = require("../ai.js"), P = require("../physics.js"), R = require("../rules.js");
const { TEAMS } = require("../teams.js");
const N = Number(process.argv[2]) || 10000;
const NAME = A.LEVEL_NAME;
function run(kl, gl, seed, n) {
  const M = n || N, r = P.rng(seed);
  const c = { goal: 0, save: 0, miss: 0, post: 0, catch: 0, n: M };
  for (let i = 0; i < M; i++) {
    const res = A.simulateKick(TEAMS[i % 8], kl, TEAMS[(i * 3 + 1) % 8], gl, r);
    if (res.goal) c.goal++; else if (res.kind === "save") c.save++; else c.miss++;
    if (res.posted) c.post++;
    if (res.detail === "catch") c.catch++;
  }
  return c;
}
// こどもの モデル
//   キッカー: 9マスの どこかを ねらう（ぶれ 0.45m、つよさ 0.6〜1.0）
//   キーパー: キッカーの め（くせ）を みて よこを きめ、たかさ は あてずっぽう、とぶ タイミングは けるまえ 0.45びょう〜けった あと 0.25びょう
function kidKick(gl, r, i) {
  const cell = Math.floor(r() * 9), c = P.cellCenter(cell);
  const shot = { tx: c.x + P.gauss(r) * 0.45, ty: Math.max(0.15, c.y + P.gauss(r) * 0.35), power: 0.6 + r() * 0.4, curve: 0 };
  const T = TEAMS[i % 8];
  const dive = A.cpuKeeper(gl, shot, null, null, false, r);
  return P.runShot(shot, A.keeperOf(T, gl, dive), i + 1).goal;
}
function kidKeep(kl, r, i) {
  const T = TEAMS[i % 8];
  let cell = A.cpuCell(T, kl, r);
  const tl = A.tells(cell, kl, r);
  let shot = A.cpuShotFor(cell, kl, r);
  const kc = Math.floor(r() * 3) * 3 + (tl.look + 1), t = -0.45 + r() * 0.7;
  if (t < -0.18) { const c2 = A.exploit(cell, kc, kl, r); if (c2 !== cell) { cell = c2; shot = A.cpuShotFor(c2, kl, r); } }
  return P.runShot(shot, { size: 1, catchSkill: 0.55, dive: { cell: kc, t } }, i + 1).goal;
}
function kidVs(level, seed, games) {
  const r = P.rng(seed);
  let kick = 0, keep = 0, nk = 0, nc = 0, win = 0;
  for (let g = 0; g < games; g++) {
    const kicks = [[], []];
    for (let st = R.status(kicks); !st.over; st = R.status(kicks)) {
      const i = nk + nc;
      if (st.next === 0) { const ok = kidKick(level, r, i); kicks[0].push(ok); kick += ok; nk++; }
      else { const ok = kidKeep(level, r, i); kicks[1].push(ok); keep += ok; nc++; }
    }
    if (R.status(kicks).winner === 0) win++;
  }
  return { kick: kick / nk, cpu: keep / nc, win: win / games };
}
module.exports = { run, kidVs };
if (require.main === module) {
  const pct = (n, d) => (n / (d || N) * 100).toFixed(1) + "%";
  console.log("| キッカー | キーパー | はいった | セーブ（うち キャッチ） | はずれ | ポスト・バーに あたった |");
  console.log("| --- | --- | --- | --- | --- | --- |");
  for (const [kl, gl] of [[1, 1], [0, 0], [2, 2], [1, 0], [1, 2], [0, 2], [2, 0]]) {
    const c = run(kl, gl, 1000 + kl * 10 + gl);
    console.log(`| ${NAME[kl]} | ${NAME[gl]} | **${pct(c.goal)}** | ${pct(c.save)}（${pct(c.catch)}） | ${pct(c.miss)} | ${pct(c.post)} |`);
  }
  console.log("\n| CPU の つよさ | こどもが けって はいる | CPU が けって はいる | こどもが PK せん に かつ |");
  console.log("| --- | --- | --- | --- |");
  for (const lv of [0, 1, 2]) {
    const k = kidVs(lv, 50 + lv, 3000);
    console.log(`| ${NAME[lv]} | ${pct(k.kick, 1)} | ${pct(k.cpu, 1)} | **${pct(k.win, 1)}** |`);
  }
}
