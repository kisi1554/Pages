#!/usr/bin/env node
/* うちゅう ステーション の いちにち — しくみ の テスト:  node uchu-ichinichi/test.js
 *  - ちから が ない と はやさ が ほぼ かわらない（かんせい）
 *  - かべ で はねかえる と はやさ が へる
 *  - ちきゅう モード では おちる
 *  - みず の たま: つつくと ゆれて、また まるく もどる
 *  - ひので の かず: 90ぷん しゅうき → 1にち 16かい
 *  - データ と ふりがな
 */
"use strict";
const path = require("path");
const fs = require("fs");
const F = require(path.join(__dirname, "float.js"));
const D = require(path.join(__dirname, "data.js"));

let fail = 0;
const check = (ok, m) => { if (!ok) fail++; console.log((ok ? "  ✓ " : "  ✗ ") + m); };
const run = (b, sec, opt, bounds) => { let hits = 0; for (let i = 0; i < sec * 60; i++) if (F.step(b, 1 / 60, opt, bounds).hit) hits++; return hits; };

/* かんせい */
{
  const b = F.body({ x: 0, y: 0, vx: 100, vy: 0 });
  run(b, 1, F.SPACE);
  check(Math.abs(F.speed(b) - 100) < 5, `うちゅう: 1びょう たっても はやさ は ほぼ おなじ（100 → ${F.speed(b).toFixed(1)}）`);
  check(b.x > 95 && Math.abs(b.y) < 1e-9, `まっすぐ すすむ（x=${b.x.toFixed(1)}, y=${b.y}）`);
  const s = F.body({ x: 5, y: 5 });
  run(s, 3, F.SPACE);
  check(s.x === 5 && s.y === 5, "とまって いる もの は とまった まま");
  const k = F.body(); F.kick(k, 30, 40);
  check(Math.abs(k.vx / k.vy - 0.75) < 1e-9, "ける と スワイプ の むき に すすむ");
  F.kick(k, 1000, 0);
  check(F.speed(k) <= 160 * 1.2 + 1e-9, "つよく けっても はやすぎない");
  F.grab(k);
  check(F.speed(k) === 0, "つかまる と とまる");
}

/* かべ */
{
  const b = F.body({ x: 50, y: 50, vx: 100, r: 10 });
  const hits = run(b, 1, F.SPACE, { x0: 0, y0: 0, x1: 100, y1: 100 });
  check(hits >= 1, "かべ に あたる");
  check(b.vx < 0, "はねかえって ぎゃく むき に すすむ");
  check(Math.abs(b.vx) < 70, `はねかえる と はやさ が へる（100 → ${Math.abs(b.vx).toFixed(1)}）`);
  check(b.x >= 10 && b.x <= 90, "かべ を つきぬけない");
}

/* ちきゅう モード */
{
  const sp = F.body({ x: 50, y: 20 }), ea = F.body({ x: 50, y: 20 });
  run(sp, 0.5, F.SPACE); run(ea, 0.5, F.EARTH);
  check(sp.y === 20, "うちゅう では はなしても おちない");
  check(ea.y > 100, `ちきゅう では おちる（0.5びょう で ${(ea.y - 20).toFixed(0)} すすむ）`);
  const fl = F.body({ x: 50, y: 20, r: 5 });
  run(fl, 5, F.EARTH, { x0: 0, y0: 0, x1: 100, y1: 100 });
  check(fl.y >= 94 && Math.abs(fl.vy) < 1, `ちきゅう では さいご に ゆか で とまる（y=${fl.y.toFixed(1)}）`);
}

/* みず の たま */
{
  const rg = F.ring(16, 40);
  check(F.wobble(rg) === 0, "さいしょ は まんまる");
  F.poke(rg, 0, 140);
  for (let i = 0; i < 6; i++) F.stepRing(rg, 1 / 60);
  const w1 = F.wobble(rg);
  check(w1 > 1, `つつく と ゆれる（${w1.toFixed(1)}）`);
  for (let i = 0; i < 60 * 6; i++) F.stepRing(rg, 1 / 60);
  check(F.wobble(rg) < 1, `しばらく する と まるく もどる（${F.wobble(rg).toFixed(2)}）`);
  const d = F.ringPath(rg, 100, 100);
  check(/^M[\d.]+ [\d.]+( Q[\d. ]+)+Z$/.test(d) && !/NaN/.test(d), "SVG の path が つくれる");
}

/* ひので */
{
  check(F.PERIOD === 90, "1しゅう は 90ぷん");
  check(F.sunrisesPerDay() === 16, `1にち の ひので は 16かい（${F.sunrisesPerDay()}）`);
  check(F.sunrises(0, 90) === 1, "1しゅう で ひので 1かい");
  check(F.sunrises(0, 45) === 0 && F.isDay(0) && !F.isDay(180), "t=0 は ひる、はんたいがわ は よる");
  check(!F.isDay(F.stationAngle(45 / 2 + 45 - 0.1)) && F.isDay(F.stationAngle(45 / 2 + 45 + 0.1)) && F.isDay(F.stationAngle(45 / 2 - 0.1)) && !F.isDay(F.stationAngle(45 / 2 + 0.1)), "ひる と よる は 45ふん ずつ（ひる の まんなか から 22.5ふん で ひのいり）");
  let s = 0; for (let t = 0; t < F.DAY; t += 0.7) s += F.sunrises(t, Math.min(F.DAY, t + 0.7));
  check(s === 16, `こまかく わけて かぞえても 16かい（${s}）`);
  check([15, 16].includes(F.sunrisesPerDay(92)), `92ぷん しゅうき でも やく 16かい（${F.sunrisesPerDay(92)}）`);
  check(F.angleGap(350, 10) === 20 && F.angleGap(10, 350) === 20, "かく の ちがい（0° を またぐ）");
  // にほん の うえ を 1にち の うち に とおる
  let pass = 0, near = false;
  for (let t = 0; t < F.DAY; t += 0.5) {
    const g = F.angleGap(F.stationAngle(t), F.japanAngle(t));
    if (g < 9 && !near) { near = true; pass++; } else if (g > 20) near = false;
  }
  check(pass >= 10, `1にち に なんかい も にほん の ちかく を とおる（${pass}かい）`);
}

/* データ */
{
  check(D.ROOMS.length === 5, "へや は 5つ");
  check(D.MISSIONS.length === 7, "ミッション は 7つ（あさ〜よる）");
  check(new Set(D.CARDS.map((c) => c.id)).size === D.CARDS.length, "カード の id が かぶらない");
  const given = new Set([].concat(...Object.values(D.MISSION_CARDS)));
  for (const id of given) if (!D.CARDS.find((c) => c.id === id)) check(false, `しらない カード ${id}`);
  const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const hot = [...app.matchAll(/hotspot\(g, [^,]+, [^,]+, "[^"]+", "(\w+)"/g)].map((m) => m[1]);
  const all = new Set([...given, ...hot]);
  check(D.CARDS.every((c) => all.has(c.id)), `ぜんぶ の カード が どこか で もらえる（${all.size}/${D.CARDS.length}）`);
  check(D.MISSIONS.every((m) => m.room === null || (m.room >= 0 && m.room < D.ROOMS.length)), "ミッション の へや が ある");
}

/* ふりがな: ルビ の そと に かんじ が ない */
{
  const KANJI = /[一-鿿]/;
  const noRuby = (s) => String(s).replace(/<ruby>[\s\S]*?<\/ruby>/g, "");
  const texts = [];
  D.ROOMS.forEach((r) => texts.push(r.name));
  D.MISSIONS.forEach((m) => texts.push(m.time, m.name, m.hint));
  D.CARDS.forEach((c) => texts.push(c.title, c.text));
  const bad = texts.filter((t) => KANJI.test(noRuby(t)));
  check(bad.length === 0, `データ の もじ に ルビ なし の かんじ が ない${bad.length ? "（" + bad.slice(0, 3).join(" / ") + "）" : ""}`);
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const body = html.slice(html.indexOf("<body"), html.indexOf("<script src")).replace(/<[^>]+>/g, " ");
  check(!KANJI.test(noRuby(body)), "index.html の がめん の もじ に かんじ が ない");
  const src = fs.readFileSync(path.join(__dirname, "app.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const strs = src.match(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g) || [];
  const badApp = strs.filter((s) => KANJI.test(noRuby(s)));
  check(badApp.length === 0, `app.js の もじれつ に かんじ が ない${badApp.length ? "（" + badApp.slice(0, 3).join(" / ") + "）" : ""}`);
}

console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
process.exit(fail ? 1 : 0);
