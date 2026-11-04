#!/usr/bin/env node
/* でんき の ゆくえ — けいさん の テスト:  node denki-yukue/test.js
 *  - ステージ 15。スロット・しゅるい・よさん が ただしい
 *  - どの ステージ も ★3 が とれる くみあわせ が ある（ソルバー: ひと が できそう な うごかしかた で）
 *  - でんち は 0〜まんたん を こえない（でたらめ に うごかして も）。ダム の みず も マイナス に ならない
 *  - かりょく だけ なら まっくら に ならない が、けむり が ★ の めやす より おおい
 *  - たいようこう は よる 0。せつでん カード で つかう でんき が へる
 *  - なにも たてない と 3びょう（6ステップ）で まっくら
 *  - おなじ シード なら まいかい おなじ
 */
"use strict";
const path = require("path");
const Grid = require(path.join(__dirname, "grid.js"));
const STAGES = require(path.join(__dirname, "stages.js"));
const S = require(path.join(__dirname, "../tools/denki-yukue/solver.js"));

let fail = 0;
const check = (ok, m) => { if (!ok) fail++; if (!ok || process.env.V) console.log((ok ? "  ✓ " : "  ✗ ") + m); };
const sum = (ok, m) => { if (!ok) fail++; console.log((ok ? "  ✓ " : "  ✗ ") + m); };

sum(STAGES.length === 15 && STAGES.every((s, i) => s.id === i + 1), `ステージ ${STAGES.length}（id 1〜15）`);
for (const st of STAGES) {
  check(st.slots.every((id) => Grid.SLOTS[id]), `${st.id}: スロット が ちず に ある`);
  check(new Set(st.slots).size === st.slots.length, `${st.id}: スロット が かさならない`);
  check(st.types.every((t) => Grid.PLANTS[t]), `${st.id}: しゅるい`);
  check(st.co2Max > 0 && st.wasteMax > 0, `${st.id}: ★ の めやす が ある`);
  check(st.intro && st.tip && st.name && st.icon, `${st.id}: せつめい`);
  check(!/[一-鿿]/.test(st.name + st.intro + st.tip), `${st.id}: かんじ を つかって いない（ひらがな）`);
  if (st.types.includes("dam")) check(st.slots.some((id) => Grid.SLOTS[id] === "yama") && st.water > 0, `${st.id}: ダム の ばしょ と みず`);
}
sum(fail === 0, "ステージ の データ");

// おなじ シード なら おなじ
const f1 = Grid.forecast(STAGES[4]), f2 = Grid.forecast(STAGES[4]);
sum(JSON.stringify(f1) === JSON.stringify(f2), "おなじ シード なら おなじ よそう");

// たいようこう は よる 0
let night = 0, bad = 0;
for (const st of STAGES) {
  const fc = Grid.forecast(st);
  fc.hour.forEach((h, i) => { if (h < st.sun[0] || h > st.sun[1]) { night++; if (fc.sun[i] !== 0) bad++; } });
}
sum(bad === 0 && night > 0, `たいようこう は よる 0（よる ${night} ステップ、0 で ない ${bad}）`);

// なにも たてない と まっくら
{
  const s = Grid.createSim(STAGES[0], {});
  while (!s.done) s.step({});
  sum(s.blackout && s.i === Grid.BLACKOUT_STEPS, `なにも たてない と ${s.i} ステップ（${s.i / 2}びょう）で まっくら`);
}

// せつでん カード
{
  const st = STAGES[8], b = { h1: "fire", h2: "fire", h3: "fire" };
  const a = Grid.createSim(st, b), c = Grid.createSim(st, b);
  const ra = a.step({ fire: 1 }), rc = c.step({ fire: 1, card: true });
  sum(Math.abs(rc.demand - ra.demand * (1 - Grid.CARD_CUT)) < 1e-9 && c.cards === st.cards - 1,
    `せつでん カード で つかう でんき が ${Grid.CARD_CUT * 100}% へる（のこり ${c.cards}まい）`);
  for (let k = 1; k < Grid.CARD_STEPS + 2; k++) c.step({ fire: 1, card: true });
  sum(c.cards === 0, "カード は もって いる かず だけ");
}

// おいて よい ばしょ
{
  const st = STAGES[14];
  sum(Grid.canPlace(st, {}, "y1", "dam") && !Grid.canPlace(st, {}, "h1", "dam") && !Grid.canPlace(st, {}, "y1", "fire") &&
    !Grid.canPlace(st, { y1: "solar" }, "y1", "wind") && !Grid.canPlace(STAGES[0], {}, "u1", "wind"),
  "ダム は やま だけ・かりょく は やま に おけない・1スロット 1つ・つかえない しゅるい は おけない");
  const big = {}; let cost = 0;
  for (const id of st.slots) if (Grid.PLANTS.solar.where.includes(Grid.SLOTS[id]) && cost + 2 <= st.budget) { big[id] = "solar"; cost += 2; }
  const left = st.slots.find((id) => !big[id]);
  sum(!left || !Grid.canPlace(Object.assign({}, st, { budget: cost }), big, left, "solar"), "よさん を こえて おけない");
}

// でたらめ に うごかして も でんち・みず は はみださない
{
  const rnd = Grid.mulberry32(7);
  let over = 0, steps = 0;
  for (const st of STAGES) {
    for (let k = 0; k < 6; k++) {
      const b = {}; const types = st.types;
      for (const id of st.slots) {
        const t = types[Math.floor(rnd() * types.length)];
        if (rnd() < 0.8 && Grid.canPlace(st, b, id, t)) b[id] = t;
      }
      const s = Grid.createSim(st, b);
      while (!s.done) {
        const r = s.step({ dam: rnd(), fire: rnd() * 1.4 - 0.2, batt: rnd() < 0.5 ? "charge" : "discharge", card: rnd() < 0.05 });
        steps++;
        if (r.batt < -1e-9 || r.batt > s.cap.battSize + 1e-9 || r.water < -1e-9 || r.water > s.cap.waterMax + 1e-9) over++;
      }
    }
  }
  sum(over === 0, `でんち 0〜まんたん・みず マイナス なし（${steps} ステップ、はみだし ${over}）`);
}

// ★3 が とれる / かりょく だけ
for (const st of STAGES) {
  const b = S.best(st);
  sum(b.build && b.co2 <= st.co2Max && b.waste <= st.wasteMax,
    `${st.id} ${st.name}: ★3 の くみあわせ ${JSON.stringify(b.build)}（けむり ${b.co2}/${st.co2Max}・むだ ${b.waste}/${st.wasteMax}、${b.tried}とおり）`);
  const r = Grid.play(st, b.build, S.HUMAN);
  check(r.count === 3, `${st.id}: おてほん で ★3`);
  const fo = Grid.play(st, S.fireOnly(st), { every: 1 });
  sum(!fo.blackout && fo.co2 > st.co2Max * 1.1,
    `${st.id}: かりょく だけ → まっくら ${fo.blackout ? "あり" : "なし"}、けむり ${fo.co2}（めやす ${st.co2Max}）`);
}

console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
process.exit(fail ? 1 : 0);
