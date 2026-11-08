#!/usr/bin/env node
/* しくみ の テスト:  node home-gakari/test.js [シード の かず（きほん 40）]
 *  1. きけん が のこって いる と しゅっぱつ できない（ひとつ ずつ）／ ぜんぶ かたづける と できる
 *  2. ホーム の はし に ひと が いる と でんしゃ が はいって こない。おりる ひと が さき（ドア ごと）
 *  3. ゆびさし かくにん の じゅんばん、スロープ は ただしい ドア だけ
 *  4. 1にち を さいご まで（じどう）＆ ★ の けいさん（ていねい／うっかり／しんせつ なし／おそい）
 *  5. おなじ シード で おなじ 1にち
 *  6. ふりがな: がめん に でる もじ に ルビ なし の かんじ が ない
 */
"use strict";
const fs = require("fs");
const path = require("path");
const E = require("./platform.js");

let fail = 0;
const check = (ok, m) => { if (!ok) fail++; console.log((ok ? "  ✓ " : "  ✗ ") + m); };
const SEEDS = +process.argv[2] || 40;

// open に なる まで すすめる（はし の ひと は さがって もらう）
function toOpen(g) {
  for (let i = 0; i < 4000 && g.phase !== "open"; i++) {
    g.people.filter((p) => p.role === "edge").forEach((p) => E.tapPerson(g, p.id));
    E.step(g, 0.05);
  }
  g.events.length = 0;
  return g;
}
// のりおり を ぜんぶ おわらせる（あいず は ださない）
function settle(g) {
  for (let i = 0; i < 6000 && g.phase === "open"; i++) {
    g.people.filter((p) => p.role === "block").forEach((p) => E.tapPerson(g, p.id));
    const w = g.people.find((p) => p.needRamp && p.role === "board");
    if (w && g.ramp !== w.door) E.placeRamp(g, w.door);
    E.step(g, 0.05);
    if (E.boardingDone(g) && (g.tr.runnerAt < 0 || g.tr.runnerSpawned) && g.tr.stuckPlan.length === 0) break;
  }
  g.events.length = 0;
  return g;
}

/* ---------- 1. きけん ---------- */
console.log("■ きけん が ある と しゅっぱつ できない");
{
  const seen = {};
  let blockedAll = true, okAfter = true, n = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    for (const period of ["asa", "hiru", "yuu"]) {
      const g = toOpen(E.newDay(seed, { period }));
      // ドア が あいて すぐ は のりおり が のこって いる
      let r = E.signal(g);
      if (r.ok) blockedAll = false;
      r.reasons.forEach((h) => { seen[h.key] = true; });
      settle(g);
      // はさまり・かけこみ が のこって いたら とめる
      E.hazards(g).forEach((h) => { seen[h.key] = true; });
      if (g.stuck.length || g.people.some((p) => p.role === "runner")) {
        r = E.signal(g);
        if (r.ok) blockedAll = false;
      }
      g.stuck.slice().forEach((s) => E.tapItem(g, s.id));
      g.people.filter((p) => p.role === "runner").forEach((p) => E.tapPerson(g, p.id));
      // ゆびさし が まだ だと とまる
      r = E.signal(g);
      if (r.ok || r.reasons[0].key !== "point") blockedAll = false;
      E.POINT_ORDER.forEach((w) => E.point(g, w));
      r = E.signal(g);
      if (!r.ok) { okAfter = false; console.log("    のこり:", r.reasons.map((h) => h.key)); }
      n++;
    }
  }
  check(blockedAll, `${n} かい: きけん が のこって いる と「まって！」で とまる`);
  check(okAfter, "ぜんぶ かたづける と しゅっぱつ できる");
  const keys = ["block", "alight", "board", "wheel", "runner", "stuck", "point"];
  check(keys.every((k) => seen[k]), "きけん の しゅるい が ぜんぶ でて くる（" + keys.filter((k) => seen[k]).join("・") + "）");
  // まって の ことば
  const g = toOpen(E.newDay(5, { period: "asa" }));
  const r = E.signal(g);
  check(/^まって！ /.test(r.say) && g.stats.matte === 1 && g.stats.matteTrains === 1, `「${r.say}」`);
  E.signal(g);
  check(g.stats.matteTrains === 1, "おなじ でんしゃ で なんど とまっても 1ぽん と かぞえる");
}

/* ---------- 2. はし の ひと・おりる ひと が さき ---------- */
console.log("■ ホーム の はし・おりる ひと が さき");
{
  let waited = true, firstOk = true, blockOk = true, cnt = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const g = E.newDay(seed, { period: "asa" });
    for (let i = 0; i < 200; i++) E.step(g, 0.05);   // 10びょう まつ（はし の ひと は そのまま）
    if (g.people.some((p) => p.role === "edge")) { cnt++; if (g.phase !== "approach") waited = false; }
    toOpen(g);
    // ドア ごと に、おりる ひと が のこって いる あいだ は だれ も のりはじめない
    for (let i = 0; i < 3000 && !E.boardingDone(g); i++) {
      if (i > 60) g.people.filter((p) => p.role === "block").forEach((p) => E.tapPerson(g, p.id));
      const before = new Set(g.people.filter((p) => p.role === "boarding").map((p) => p.id));
      const wasOut = new Set(g.people.filter((p) => p.role === "alighting").map((p) => p.id));
      const blocked = new Set(g.people.filter((p) => p.role === "block").map((p) => p.door));
      const alightingDoors = new Set(g.people.filter((p) => p.role === "alight").map((p) => p.door));
      const w = g.people.find((p) => p.needRamp && p.role === "board");
      if (w) E.placeRamp(g, w.door);
      E.step(g, 0.05);
      g.people.filter((p) => p.role === "boarding" && !before.has(p.id)).forEach((p) => { if (alightingDoors.has(p.door)) firstOk = false; });
      // ふさがれて いる ドア から は おりられない
      g.people.filter((p) => p.role === "alighting" && !wasOut.has(p.id) && blocked.has(p.door)).forEach(() => { blockOk = false; });
    }
  }
  check(cnt > SEEDS * 0.8 && waited, `はし に ひと が いる あいだ は でんしゃ が はいって こない（${cnt} かい）`);
  check(firstOk, "おりる ひと が ぜんぶ おりて から のる（ドア ごと）");
  check(blockOk, "ドア の まえ を ふさがれて いる と おりられない");
}

/* ---------- 3. ゆびさし・スロープ ---------- */
console.log("■ ゆびさし かくにん・スロープ");
{
  const g = settle(toOpen(E.newDay(7, { period: "hiru" })));
  check(g.people.length >= 0 && E.boardingDone(g), "ひる の 1ぽん で のりおり が おわる");
  let r = E.point(g, "signal");
  check(!r.ok && g.point === 0, "しんごう から は だめ（ドア → しんごう → とけい）");
  r = E.point(g, "door"); E.point(g, "clock");
  check(g.point === 0, "じゅんばん を まちがえる と さいしょ から");
  E.point(g, "door"); E.point(g, "signal"); r = E.point(g, "clock");
  check(r.ok && g.point === 3, "ドア → しんごう → とけい で かくにん おわり");

  const h = toOpen(E.newDay(3, { period: "hiru" }));
  const w = h.people.find((p) => p.needRamp);
  check(!!w, "ひる の れんしゅう には くるまいす の ひと が いる");
  check(!E.point(h, "door").ok, "のりおり が おわる まえ は ゆびさし できない");
  const other = (w.door + 1) % 3;
  check(!E.placeRamp(h, other).ok && h.ramp === -1, "ちがう ドア には スロープ を かけない");
  for (let i = 0; i < 1200; i++) { h.people.filter((p) => p.role === "block").forEach((p) => E.tapPerson(h, p.id)); E.step(h, 0.05); }
  check(h.people.includes(w) && w.role === "board", "スロープ が ない と くるまいす の ひと は のれない（まって いる）");
  check(E.hazards(h).some((x) => x.key === "wheel"), "くるまいす の ひと が まって いる と しゅっぱつ できない");
  check(E.placeRamp(h, w.door).ok, "ただしい ドア に スロープ を かけられる");
  for (let i = 0; i < 1200 && h.people.includes(w); i++) E.step(h, 0.05);
  check(!h.people.includes(w) && h.ramp === -1, "くるまいす の ひと が のって、スロープ を かたづける");
}

/* ---------- 4. 1にち と ★ ---------- */
console.log(`■ 1にち を さいご まで（${SEEDS} シード）`);
{
  const res = { good: [], careless: [], unkind: [], slow: [] };
  let trainsOk = true, kindOk = true;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const g = E.autoDay(E.newDay(seed), { react: 1.5 });
    if (g.stats.trains !== 9 || g.phase !== "done") trainsOk = false;
    if (g.stats.chances < 3) kindOk = false;
    res.good.push(E.stars(g));
    res.careless.push(E.stars(E.autoDay(E.newDay(seed), { careless: true })));
    res.unkind.push(E.stars(E.autoDay(E.newDay(seed), { unkind: true, react: 1.5 })));
    res.slow.push(E.stars(E.autoDay(E.newDay(seed), { react: 6 })));
  }
  check(trainsOk, "でんしゃ 9ほん（あさ 3・ひる 3・ゆうがた 3）を ぜんぶ みおくる");
  check(kindOk, "1にち に くるまいす・まいご・おとしもの が ある");
  check(res.good.every((s) => s.total === 3), "ていねい に やる と ★3");
  check(res.careless.every((s) => !s.safe), "あいず を あわてて だす と あんぜん の ★ なし");
  check(res.unkind.every((s) => !s.kind && s.safe), "まいご・おとしもの を ほうって おく と しんせつ の ★ なし");
  check(res.slow.every((s) => !s.onTime), "ゆっくり すぎる と ていじ の ★ なし");
  // 1ぽん だけ
  const one = E.autoDay(E.newDay(9, { period: "yuu" }), { react: 1.5 });
  check(one.stats.trains === 1 && E.stars(one).total === 3, "れんしゅう（1ぽん）も さいご まで できる");
}

/* ---------- 5. シード ---------- */
console.log("■ シード");
{
  const a = E.autoDay(E.newDay(1234), { react: 1 }), b = E.autoDay(E.newDay(1234), { react: 1 });
  check(JSON.stringify(a.log) === JSON.stringify(b.log), "おなじ シード なら おなじ 1にち");
  const c = E.autoDay(E.newDay(99), { react: 1 });
  check(JSON.stringify(a.log) !== JSON.stringify(c.log), "シード が ちがえば ちがう 1にち");
}

/* ---------- 6. ふりがな ---------- */
console.log("■ ふりがな");
{
  const bad = [];
  for (const f of ["index.html", "app.js", "platform.js", "audio.js"]) {
    let s = fs.readFileSync(path.join(__dirname, f), "utf8");
    s = s.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
    s = s.replace(/<ruby>[\s\S]*?<\/ruby>/g, "");
    s = s.replace(/<style>[\s\S]*?<\/style>/g, "");
    s.split("\n").forEach((line, i) => { if (/[一-鿿]/.test(line)) bad.push(`${f}:${i + 1} ${line.trim().slice(0, 40)}`); });
  }
  check(bad.length === 0, "ルビ なし の かんじ が ない" + (bad.length ? "（" + bad.slice(0, 3).join(" / ") + "）" : ""));
}

console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
process.exit(fail ? 1 : 0);
