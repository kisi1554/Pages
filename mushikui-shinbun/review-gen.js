// review.txt の もとを つくる（ちがう こうほを いれた ぶんを ぜんぶ ならべる）。 node review-gen.js > review.txt
"use strict";
const M = require("./mondai.js");
function lines() {
  const out = [];
  const strip = (s) => s.replace(/([一-鿿々]+)\{([^}]+)\}/g, "$1");
  for (const lv of [1, 2, 3, 4]) M.LV[lv].forEach((q, i) => {
    for (const d of q.d) out.push(`L${lv}-${String(i + 1).padStart(2, "0")} ${d}: ${strip(q.s).replace("＿", "［" + d + "］")}`);
  });
  M.SHINBUN.forEach((n, i) => n.h.forEach((h, j) => {
    for (const d of h.d) {
      let k = 0;
      const s = n.s.replace(/＿/g, () => (k++ === j ? "［" + d + "］" : n.h[k - 1].a));
      const sent = s.split(/(?<=。)\s*/).find((x) => x.includes("［"));
      out.push(`N${String(i + 1).padStart(2, "0")}-${j + 1} ${d}: ${sent}`);
    }
  }));
  return out;
}
if (require.main === module) {
  console.log("# むしくい しんぶん — ちがう こうほを いれた ぶん（てで よんで「せいかいの ぶんに ならない」と たしかめた リスト）");
  console.log("# もんだいを かえたら node review-gen.js > review.txt で つくりなおし、もういちど ぜんぶ よんで たしかめる。");
  lines().forEach((l) => console.log(l));
}
module.exports = lines;
