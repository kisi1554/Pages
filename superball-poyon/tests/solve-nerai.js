// node superball-poyon/tests/solve-nerai.js [ステージばんごう...]
// ④ の こたえを さがす（かいはつ よう）。ひっぱる むき・つよさを こまかく ためし、
// まわり（±0.75°・±1.5°・±1〜3%）も クリア できる「まんなかの こたえ」を えらんで だす（まるめた あたいで たしかめる）
const N = require("../nerai-stages.js");
const only = process.argv.slice(2).map(Number);
const out = [];
const vmax = N.K * N.MAXPULL;
N.STAGES.forEach((st, i) => {
  if (only.length && !only.includes(i + 1)) { out.push(st.sol || null); return; }
  const okv = (vx, vy) => N.run(st, vx, vy).ok;
  const ok = (a, s) => okv(Math.cos(a) * s, Math.sin(a) * s);
  const NB = [];
  for (const da of [-1.5, -0.75, 0, 0.75, 1.5]) for (const ds of [0.97, 0.98, 0.99, 1, 1.01, 1.02, 1.03]) if (da || ds !== 1) NB.push([da, ds]);
  let best = null, bestScore = -1;
  for (let deg = -85; deg <= 60 && bestScore < NB.length; deg += 1.5) {
    const a = deg * Math.PI / 180;
    for (let s = 300; s <= vmax; s += 25) {
      const v = [Math.round(Math.cos(a) * s), Math.round(Math.sin(a) * s)];
      if (!okv(v[0], v[1])) continue;
      let score = 0;
      for (const [da, ds] of NB) if (ok(a + da * Math.PI / 180, Math.min(vmax, s * ds))) score++;
      if (score > bestScore) { bestScore = score; best = v; }
      if (score === NB.length) break;
    }
  }
  console.log(`#${i + 1} ${st.name}: ${best ? JSON.stringify(best) + " まわり " + bestScore + "/" + NB.length : "こたえ なし！"}`);
  out.push(best);
});
console.log("var SOL = " + JSON.stringify(out) + ";");
