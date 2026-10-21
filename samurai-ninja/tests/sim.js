// CPU どうしを たたかわせる（tests/balance.test.js と ちょうせい用）
// node samurai-ninja/tests/sim.js [lv] [かいすう]
const SN = require("../engine.js");
const AI = require("../ai.js");

function fight(c0, c1, lv0, lv1, seed) {
  const m = SN.createMatch({ p1: c0, p2: c1 });
  const a = new AI.CPU(0, lv0, seed * 2 + 1), b = new AI.CPU(1, lv1, seed * 2 + 2);
  while (!m.over) SN.step(m, [a.input(m), b.input(m)]);
  return m;
}

// samurai の かち（ひきわけは 0.5）を side を いれかえながら かぞえる
function series(lvS, lvN, n, seed0 = 1) {
  let win = 0, time = 0, frames = 0;
  for (let i = 0; i < n; i++) {
    const swap = i % 2 === 1;
    const m = swap ? fight("ninja", "samurai", lvN, lvS, seed0 + i) : fight("samurai", "ninja", lvS, lvN, seed0 + i);
    const sIdx = swap ? 1 : 0;
    if (m.winner === sIdx) win++; else if (m.winner === -1) win += 0.5;
    if (m.reason === "time") time++;
    frames += m.frame;
  }
  return { rate: win / n, time: time / n, avgSec: frames / n / 60 };
}

if (require.main === module) {
  const n = +process.argv[3] || 1000;
  const lvs = process.argv[2] ? [+process.argv[2]] : [0, 2, 4];
  for (const lv of lvs) console.log("lv", lv, series(lv, lv, n));
}
module.exports = { fight, series };
