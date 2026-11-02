#!/usr/bin/env node
/* がったい どうぶつ ラボ — データ と けいさん の テスト:  node gattai-doubutsu/test.js
 *  - 20×20×20×20 ぜんぶの くみあわせで ゴール できる（タイムが ゆうげん・せいの すう）
 *  - ぜんぶ 満点（5つの のうりょくが ぜんぶ 5）に なる くみあわせは ない
 *  - ぜんぶの おだいに こたえ（ゴールタイム いないで ゴール できる くみあわせ）が ある
 *  - ふりがな: ひょうじ する もじに、ルビ なしの かんじが ない
 */
"use strict";
const path = require("path");
const fs = require("fs");
const P = require(path.join(__dirname, "parts.js"));
const L = require(path.join(__dirname, "lab.js"));

let fail = 0;
const check = (ok, m) => { if (!ok) fail++; console.log((ok ? "  ✓ " : "  ✗ ") + m); };
const N = P.SPECIES.length;

/* かたち */
check(N === 20, `どうぶつは 20しゅ（${N}）`);
check(new Set(P.SPECIES.map((s) => s.id)).size === N, "id が かぶって いない");
for (const sp of P.SPECIES) {
  for (const slot of P.SLOTS) {
    const p = sp[slot];
    if (!p || typeof p.svg !== "function") { check(false, `${sp.name}の ${slot} が ない`); continue; }
    for (const k in p.ab) if (!L.ABS.includes(k)) check(false, `${sp.name} ${slot}: しらない のうりょく ${k}`);
    for (const t of p.tr || []) if (!L.TRAITS.includes(t)) check(false, `${sp.name} ${slot}: しらない とくせい ${t}`);
    const svg = p.svg();
    const open = (svg.match(/<g[ >]/g) || []).length, close = (svg.match(/<\/g>/g) || []).length;
    if (open !== close) check(false, `${sp.name} ${slot}: <g> の かずが あわない`);
    if (svg && !p.tip) check(false, `${sp.name} ${slot}: まめちしき（tip）が ない`);
  }
  if (!sp.info) check(false, `${sp.name}: ずかんの せつめいが ない`);
}
check(P.SPECIES.find((s) => s.id === "snake").legs.svg() === "", "ヘビは あし なし");

/* ぜんぶの くみあわせ */
const combos = [];
for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) for (let c = 0; c < N; c++) for (let d = 0; d < N; d++) combos.push({ head: a, body: b, legs: c, tail: d });
check(combos.length === 160000, `くみあわせ ${combos.length} とおり`);

let allMax = 0, badStat = 0;
const statCache = combos.map((k) => {
  const s = L.stats(k);
  if (L.ABS.every((x) => s.ab[x] >= L.MAX)) allMax++;
  if (L.ABS.some((x) => !(s.ab[x] >= 0 && s.ab[x] <= L.MAX))) badStat++;
  return s;
});
check(allMax === 0, `ぜんぶ 満点の さいきょう どうぶつは つくれない（${allMax}）`);
check(badStat === 0, "のうりょくは ぜんぶ 0〜5");
// トレードオフ: とぶ が 4いじょう で たえる も 4いじょう は つくれない（おもい からだは とびにくい）
check(!statCache.some((s) => s.ab.fly >= 4 && s.ab.tough >= 4), "とぶ★4 と たえる★4 は りょうりつ しない（おもさ ペナルティ）");

/* ぜんぶの ばしょ × ぜんぶの くみあわせ で ゴール（1くぎりずつ しらべれば コースは たしざん） */
let stuck = 0, worst = 0;
for (const t of L.TERRAIN_KEYS) {
  for (const k of combos) {
    const r = L.race(k, [t, t, t]);
    if (!Number.isFinite(r.total) || r.total <= 0 || r.segs.some((g) => !(g.speed >= 1))) stuck++;
    if (r.total > worst) worst = r.total;
  }
}
check(stuck === 0, `ぜんぶの くみあわせ・ぜんぶの ばしょで ゴール できる（とまる のは ${stuck}）`);
check(worst <= 3 * L.SEG_LEN, `いちばん おそくても ${worst} びょう（${3 * L.SEG_LEN} いない）`);

/* おだい */
check(L.ODAI.length === 30, `おだいは 30もん（${L.ODAI.length}）`);
check(new Set(L.ODAI.map((o) => o.id)).size === L.ODAI.length, "おだいの id が かぶって いない");
// くぎり ごとの タイムを さきに けいさん → コースの タイムは たしざん
const segTime = {};
for (const t of L.TERRAIN_KEYS) segTime[t] = combos.map((k) => L.race(k, [t]).total);
for (const o of L.ODAI) {
  if (o.course.length !== 3 || o.course.some((t) => !L.TERRAINS[t])) { check(false, `おだい ${o.id}: コースが へん`); continue; }
  let ok = 0, ex = null;
  for (let i = 0; i < combos.length; i++) {
    const t = o.course.reduce((a, x) => a + segTime[x][i], 0);
    if (Math.round(t * 10) / 10 <= o.goal) { ok++; if (!ex) ex = combos[i]; }
  }
  const rate = ok / combos.length;
  check(ok > 0 && rate < 0.5, `おだい ${o.id}「${o.text}」: こたえ ${ok} とおり（${(rate * 100).toFixed(1)}%）れい ${ex ? L.name(ex) : "なし"}`);
}

/* まめちしき: ハイライトが だせる */
const ex = L.race({ head: 0, body: 0, legs: 2, tail: 3 }, ["field", "sea", "sky"]);
const hl = L.highlight({ head: 0, body: 0, legs: 2, tail: 3 }, ex);
check(/アヒルの あし/.test(hl.text) || /チーター/.test(hl.text), `まめちしき: ${hl.text}`);
check(L.name({ head: 0, body: 1, legs: 2, tail: 3 }) === "チーペンアヒワシ", "なまえ: チーペンアヒワシ");

/* ふりがな: ルビの そとに かんじが ない */
const KANJI = /[一-鿿]/;
const noRuby = (s) => String(s).replace(/<ruby>[\s\S]*?<\/ruby>/g, "");
const texts = [];
for (const sp of P.SPECIES) { texts.push(sp.name, sp.info); for (const s of P.SLOTS) texts.push(sp[s].tip || ""); }
for (const o of L.ODAI) texts.push(o.text);
for (const k in L.TERRAINS) texts.push(L.TERRAINS[k].name, L.TERRAINS[k].desc);
texts.push(...Object.values(L.AB_NAME), ...Object.values(L.TR_NAME));
const badTxt = texts.filter((t) => KANJI.test(noRuby(t)));
check(badTxt.length === 0, `データの もじに ルビ なしの かんじが ない${badTxt.length ? "（" + badTxt.slice(0, 3).join(" / ") + "）" : ""}`);
// がめんの もじ（index.html の body と app.js の もじれつ）
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const body = html.slice(html.indexOf("<body"), html.indexOf("<script src")).replace(/<[^>]+>/g, " ");
check(!KANJI.test(noRuby(body)), "index.html の がめんの もじに かんじが ない");
const appSrc = fs.readFileSync(path.join(__dirname, "app.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const strs = appSrc.match(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g) || [];
const badApp = strs.filter((s) => KANJI.test(noRuby(s)));
check(badApp.length === 0, `app.js の もじれつに かんじが ない${badApp.length ? "（" + badApp.slice(0, 3).join(" / ") + "）" : ""}`);

console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
process.exit(fail ? 1 : 0);
