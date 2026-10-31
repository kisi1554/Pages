#!/usr/bin/env node
/* ブラウザ で ぜんぶ の じけん を じどう で かいけつ する:  node ashiato-tantei/tests/e2e.js [スクショ の だしさき]
 * 390×844（たて スマホ）と 1024×768（よこ タブレット）で、
 * ルーペ で てがかり を みつける → ノート に しるし → はんにん を えらぶ → かいけつ がめん、を 30こ ぶん。
 */
"use strict";
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const OUT = process.argv[2] || path.join(__dirname, "shots");
fs.mkdirSync(OUT, { recursive: true });
const URL = "file://" + path.join(__dirname, "..", "index.html");
const { CASES } = require(path.join(__dirname, "..", "cases.js"));
const { CLUES } = require(path.join(__dirname, "..", "data.js"));

let fail = 0;
const check = (ok, m) => { if (!ok) fail++; console.log((ok ? "  ✓ " : "  ✗ ") + m); };

(async () => {
  const browser = await chromium.launch();
  for (const [tag, vp] of [["phone", { width: 390, height: 844 }], ["tablet", { width: 1024, height: 768 }]]) {
    const page = await browser.newPage({ viewport: vp, hasTouch: tag === "phone" });
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await page.goto(URL);
    const shot = (n) => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
    const noHScroll = async (where) => {
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      check(w[0] <= w[1] + 1, `${tag} ${where}: よこ スクロール なし（${w[0]} ≦ ${w[1]}）`);
    };
    await shot("0-home"); await noHScroll("ホーム");
    await page.click("#goCases"); await shot("1-list"); await noHScroll("いちらん");

    for (const cs of CASES) {
      await page.evaluate((id) => ATTest.startCase(id), cs.id);
      await page.waitForSelector("#vCase:not([hidden])");
      for (const id of cs.clues) {
        await page.evaluate((id) => { const sp = ATTest.cur().spots.find((s) => s.id === id); document.getElementById(`scene`).scrollIntoView({ block: "center" }); return sp; }, id);
        const p = await page.evaluate((id) => ATTest.spotClient(id), id);
        // マウス: そのまま うごかす（ドラッグ の ように 2だんかい）
        await page.mouse.move(p.x - 60, p.y - 30); await page.mouse.down(); await page.mouse.move(p.x, p.y, { steps: 6 }); await page.mouse.up();
      }
      const found = await page.evaluate(() => ATTest.cur().spots.filter((s) => s.found).length);
      if (found !== cs.clues.length) check(false, `${tag} じけん${cs.id}: てがかり ${found}/${cs.clues.length}`);
      if (cs.id === 11 || cs.id === 22) { await page.waitForTimeout(300); await shot(`2-scene-${cs.id}`); await noHScroll(`げんば ${cs.id}`); }
      await page.click("#noteBtn");
      await page.waitForSelector("#vNote:not([hidden])");
      // ただしい しるし を つける
      for (const id of cs.clues) for (const a of cs.suspects) {
        const n = CLUES[id].matches.includes(a) ? 1 : 2;
        for (let i = 0; i < n; i++) await page.click(`.cell[data-id="${id}"][data-a="${a}"]`);
      }
      await page.click("#checkBtn");
      const bad = await page.locator(".cell.bad").count();
      if (bad) check(false, `${tag} じけん${cs.id}: しるし が あかい（${bad}）`);
      if (cs.id === 11 || cs.id === 22) { await shot(`3-note-${cs.id}`); await noHScroll(`ノート ${cs.id}`); }
      if (cs.id === 11) {
        const wrong = cs.suspects.find((a) => a !== cs.culprit);
        await page.click(`#accuse button[data-a="${wrong}"]`);
        const msg = await page.textContent("#noteMsg");
        check(/ざんねん/.test(msg), `${tag} じけん11: まちがい → 「${msg}」`);
      }
      await page.click(`#accuse button[data-a="${cs.culprit}"]`);
      await page.waitForSelector("#vSolve:not([hidden])");
      const title = await page.textContent("#solveTitle");
      const nr = await page.locator(".reason:not(.final)").count();
      if (!title.includes("かいけつ") || nr < 1) check(false, `${tag} じけん${cs.id}: かいけつ がめん`);
      if (cs.id === 11 || cs.id === 30) { await page.waitForTimeout(900); await shot(`4-solve-${cs.id}`); await noHScroll(`かいけつ ${cs.id}`); }
    }
    const solved = await page.evaluate(() => Object.keys(ATTest.save().solved).length);
    check(solved === 30, `${tag}: 30こ ぜんぶ かいけつ（${solved}）`);
    const stars = await page.evaluate(() => ATTest.save().solved[11]);
    check(stars === 2, `${tag}: 1かい まちがえた じけん11 は ★2（${stars}）`);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ashiato-tantei-v1")).met);
    check(Object.keys(saved).length === 12, `${tag}: ずかん 12しゅるい ぜんぶ であった（${Object.keys(saved).length}）`);

    await page.evaluate(() => ATTest.show("vZukan")); await shot("5-zukan"); await noHScroll("ずかん");
    await page.click('.zcard[data-id="kitsune"]'); await page.waitForTimeout(200); await shot("6-zukan-kitsune");
    await page.click("#mclose");
    await page.click('.zcard[data-id="inoshishi"]'); await page.waitForTimeout(200); await shot("6-zukan-inoshishi");
    await page.click("#mclose");
    await page.evaluate(() => ATTest.show("vCases")); await shot("7-list-done");
    // ズーム たいさく が はいって いる
    const vp2 = await page.getAttribute('meta[name="viewport"]', "content");
    check(/user-scalable=no/.test(vp2), `${tag}: viewport で ズーム しない`);
    check(errs.length === 0, `${tag}: エラー なし ${errs.slice(0, 3).join(" / ")}`);
    await page.close();
  }
  await browser.close();
  if (fail) { console.log(`\n✗ ${fail}こ しっぱい`); process.exit(1); }
  console.log("\n✓ ぜんぶ OK");
})();
