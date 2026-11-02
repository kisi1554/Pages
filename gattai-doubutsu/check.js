#!/usr/bin/env node
/* ブラウザで うごかして みる:  node gattai-doubutsu/check.js [スクショの だしさき]
 * 390×844（たて スマホ）と 1024×768（よこ タブレット）で、
 * ラボで ぐるぐる（がったい）→ レース → ずかんに のこす → ずかん → おだい の 3がめんを まわる。
 * JS エラー・よこスクロールが ない ことを たしかめる。
 */
"use strict";
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const OUT = process.argv[2] || path.join(__dirname, "shots");
fs.mkdirSync(OUT, { recursive: true });
const URL = "file://" + path.join(__dirname, "index.html");

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
      check(w[0] <= w[1] + 1, `${tag} ${where}: よこスクロール なし（${w[0]} ≦ ${w[1]}）`);
    };

    // 1. ラボ: ぐるぐる → がったい
    check(await page.locator(".reel").count() === 4, `${tag} ラボ: スロットが 4つ`);
    await page.click("#spinBtn");
    await page.waitForFunction(() => !document.getElementById("spinBtn").disabled, null, { timeout: 5000 });
    const nm = await page.textContent("#cName");
    check(nm && nm.length >= 2, `${tag} がったい: なまえ「${nm}」`);
    // やじるしで 1つ かえる
    await page.click('.reel[data-slot="legs"] .arrow[data-d="1"]');
    await shot("1-lab"); await noHScroll("ラボ");

    // 2. レース → とちゅうで スクショ → ゴール
    await page.click("#raceBtn");
    await page.waitForSelector("#vRace:not([hidden])");
    await page.waitForTimeout(700);
    await shot("2-race"); await noHScroll("レース");
    await page.click("#skipBtn");
    await page.waitForSelector("#result:not([hidden])");
    const rows = await page.locator("#resTable tr").count();
    check(rows === 3, `${tag} けっか: くぎり 3つ（${rows}）`);
    const tip = await page.textContent("#resTip");
    check(/おかげ|ゆっくり/.test(tip), `${tag} まめちしき: ${tip.slice(0, 40)}…`);
    await page.click("#saveBtn");
    await shot("3-result"); await noHScroll("けっか");

    // 3. ずかん
    await page.click('.tab[data-view="zukan"]');
    check(await page.locator("#zukanReal .zcard").count() === 20, `${tag} ずかん: ほんものの どうぶつ 20しゅ`);
    await page.click("#zukanReal .zcard summary");
    await shot("4-zukan"); await noHScroll("ずかん");
    await page.click('.subtab[data-z="mine"]');
    check(await page.locator("#zukanMine .zcard").count() === 1, `${tag} ずかん: つくった どうぶつが 1ぴき`);
    await shot("5-mine");

    // 4. おだい: いちばん はやい こたえで クリア
    await page.click('.tab[data-view="odai"]');
    check(await page.locator(".odai-card").count() === 30, `${tag} おだい: 30もん`);
    await shot("6-odai"); await noHScroll("おだい");
    await page.click('.odai-card[data-id="8"]');
    await page.waitForSelector("#odaiBanner:not([hidden])");
    // チー＋チー＋シロ＋ペン（こおりの うみに つよい）
    await page.evaluate(() => GDTest.set({ head: 0, body: 0, legs: 5, tail: 1 }));
    await page.click("#raceBtn");
    await page.click("#skipBtn");
    await page.waitForSelector("#result:not([hidden])");
    const judge = await page.textContent("#resHead");
    check(/クリア！/.test(judge), `${tag} おだい 8: ${judge.replace(/\s+/g, " ").slice(0, 50)}`);
    await shot("7-odai-clear");
    const sv = await page.evaluate(() => GDTest.save());
    check(sv.odai[8] > 0 && sv.mine.length === 1, `${tag} ほぞん: おだい クリア と ずかん`);

    // 5. よみこみ なおし → ほぞんが のこる
    await page.reload();
    const sv2 = await page.evaluate(() => GDTest.save());
    check(sv2.odai[8] > 0 && sv2.mine.length === 1, `${tag} よみこみ なおしても ほぞんが のこる`);

    // 6. ズーム しない（viewport）
    const vpMeta = await page.getAttribute('meta[name="viewport"]', "content");
    check(/user-scalable=no/.test(vpMeta), `${tag} viewport: ${vpMeta}`);

    check(errs.length === 0, `${tag} JS エラー なし${errs.length ? "（" + errs.slice(0, 3).join(" / ") + "）" : ""}`);
    await page.close();
  }
  await browser.close();
  console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
  process.exit(fail ? 1 : 0);
})();
