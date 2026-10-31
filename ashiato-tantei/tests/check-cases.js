#!/usr/bin/env node
/* じけん データ の チェック:  node ashiato-tantei/tests/check-cases.js
 *  - てがかり の matches（とくちょう ひょう）だけ で、はんにん が 1とう に きまる
 *  - はんにん は ぜんぶ の てがかり に あう（ようぎしゃ の だれか では なく）
 *  - てがかり 3〜5こ、ようぎしゃ 3〜4にん、id は 1〜30
 *  - むずかしい: てがかり 4こ いじょう、どの てがかり も 1つ だけ では きまらない
 *  - 「1つ だけ では きまらない」じけん が はんぶん より おおい
 */
"use strict";
const path = require("path");
const { ANIMALS, CLUES } = require(path.join(__dirname, "..", "data.js"));
const { CASES } = require(path.join(__dirname, "..", "cases.js"));

let fail = 0;
const ng = (m) => { fail++; console.log("  ✗ " + m); };

// とくちょう ひょう の かたち
for (const [id, c] of Object.entries(CLUES)) {
  if (!c.matches || !c.matches.length) ng(`${id}: matches が からっぽ`);
  for (const a of c.matches) if (!ANIMALS[a]) ng(`${id}: しらない どうぶつ ${a}`);
}

/* 1つ だけ で きまる てがかり の かず と、きめる のに いる さいしょう の かず */
function narrow(cs, clueIds) {
  let left = cs.suspects.slice();
  for (const id of clueIds) left = left.filter((a) => CLUES[id].matches.includes(a));
  return left;
}
function minNeeded(cs) {
  const ids = cs.clues;
  for (let k = 1; k <= ids.length; k++) {
    const combo = (start, pick) => {
      if (pick.length === k) { const l = narrow(cs, pick); return l.length === 1 && l[0] === cs.culprit; }
      for (let i = start; i < ids.length; i++) if (combo(i + 1, pick.concat(ids[i]))) return true;
      return false;
    };
    if (combo(0, [])) return k;
  }
  return Infinity;
}

const seen = new Set();
let needCombo = 0;
const used = new Set(), culprits = {};
for (const cs of CASES) {
  const tag = `じけん${cs.id}「${cs.title}」`;
  if (seen.has(cs.id)) ng(`${tag}: id が かぶって いる`);
  seen.add(cs.id);
  if (!cs.suspects.includes(cs.culprit)) ng(`${tag}: はんにん が ようぎしゃ に いない`);
  if (new Set(cs.suspects).size !== cs.suspects.length) ng(`${tag}: ようぎしゃ が かぶって いる`);
  if (cs.suspects.length < 3 || cs.suspects.length > 4) ng(`${tag}: ようぎしゃ は 3〜4にん（${cs.suspects.length}）`);
  if (cs.clues.length < 3 || cs.clues.length > 5) ng(`${tag}: てがかり は 3〜5こ（${cs.clues.length}）`);
  for (const id of cs.clues) {
    if (!CLUES[id]) { ng(`${tag}: しらない てがかり ${id}`); continue; }
    used.add(id);
    if (!CLUES[id].matches.includes(cs.culprit)) ng(`${tag}: はんにん ${cs.culprit} が てがかり ${id} に あわない`);
  }
  if (cs.clues.some((id) => !CLUES[id])) continue;
  const left = narrow(cs, cs.clues);
  if (left.length !== 1 || left[0] !== cs.culprit) ng(`${tag}: 1とう に きまらない → のこり [${left.join(", ")}]`);
  // ようぎしゃ は みんな、すくなくとも 1つ の てがかり で はずれる（＝ ふりかえり で りゆう が いえる）
  for (const a of cs.suspects) if (a !== cs.culprit && cs.clues.every((id) => CLUES[id].matches.includes(a))) ng(`${tag}: ${a} を はずす てがかり が ない`);
  const k = minNeeded(cs);
  if (k >= 2) needCombo++;
  if (cs.level === 3) {
    if (cs.clues.length < 4) ng(`${tag}: むずかしい は てがかり 4こ いじょう`);
    if (cs.suspects.length < 4) ng(`${tag}: むずかしい は ようぎしゃ 4にん`);
    if (k < 2) ng(`${tag}: むずかしい なのに てがかり 1つ で きまる`);
  }
  if (cs.level === 1) {
    // かんたん: あしあと（track / gait）だけ で きまる
    const tracks = cs.clues.filter((id) => CLUES[id].kind === "track" || CLUES[id].kind === "gait");
    const l = narrow(cs, tracks);
    if (l.length !== 1) ng(`${tag}: かんたん なのに あしあと だけ で きまらない [${l.join(", ")}]`);
  }
  culprits[cs.culprit] = (culprits[cs.culprit] || 0) + 1;
  console.log(`  ✓ ${tag}: ${cs.culprit}（さいしょう ${k}こ の くみあわせ で きまる）`);
}
if (CASES.length !== 30) ng(`じけん は 30こ（いま ${CASES.length}）`);
for (let i = 1; i <= 30; i++) if (!seen.has(i)) ng(`じけん${i} が ない`);
if (needCombo * 2 <= CASES.length) ng(`1つ では きまらない じけん が すくない（${needCombo}/${CASES.length}）`);
for (const a of Object.keys(ANIMALS)) if (!culprits[a]) ng(`${ANIMALS[a].name} が はんにん の じけん が ない`);
const unused = Object.keys(CLUES).filter((id) => !used.has(id));

console.log(`\n1つ では きまらない じけん: ${needCombo}/${CASES.length}`);
console.log(`つかって いない てがかり: ${unused.join(", ") || "なし"}`);
console.log(`はんにん の かず: ${JSON.stringify(culprits)}`);
if (fail) { console.log(`\n✗ ${fail}こ の もんだい`); process.exit(1); }
console.log("\n✓ ぜんぶ の じけん で はんにん が 1とう に きまる");
