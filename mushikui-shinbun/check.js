#!/usr/bin/env node
/* ブラウザで うごかして みる:  node mushikui-shinbun/check.js [スクショの だしさき]
 * 390×844（たて スマホ）・1024×768（よこ タブレット）・844×390（よこ スマホ）で
 *  - レベル1〜4 で 1もんずつ、しんぶん 1まいを ぜんぶ うめる（まちがい・おもしろ モードも）
 *  - 50おん パッドの もじが 16px いじょう
 *  - れんだ・ダブルタップ で ズーム しない
 *  - JS エラー・よこスクロールが ない
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
  const screens = [["phone", { width: 390, height: 844 }, true], ["tablet", { width: 1024, height: 768 }, true], ["phone-yoko", { width: 844, height: 390 }, true]];
  for (const [tag, vp, touch] of screens) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: tag.startsWith("phone") });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await page.goto(URL);
    const shot = (n) => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
    const noH = async (where) => {
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      check(w[0] <= w[1] + 1, `${tag} ${where}: よこスクロール なし（${w[0]} ≦ ${w[1]}）`);
    };
    const answerSel = async (wrongFirst) => {
      const k = await page.evaluate(() => MSTest.sel());
      const h = (await page.evaluate(() => MSTest.holes()))[k];
      if (wrongFirst) await page.click(`.choice[data-w="${h.d[0]}"]`);
      await page.click(`.choice[data-w="${h.a}"]`);
      await page.waitForTimeout(80);
    };

    check(await page.locator(".lv-card").count() === 5, `${tag} タイトル: レベル 5つ`);
    await shot("0-home"); await noH("タイトル");

    // レベル1〜4: 1もんずつ（さいしょは まちがえて むしゃむしゃ）
    for (const lv of [1, 2, 3, 4]) {
      await page.click(`.lv-card[data-lv="${lv}"]`);
      await page.click('.sheet-btn[data-i="0"]');
      await page.waitForSelector("#vPlay:not([hidden])");
      check(await page.locator("#paper .hole").count() === 5, `${tag} L${lv}: あな 5こ`);
      await page.waitForTimeout(1500);
      if (lv === 3) check((await page.textContent(".hole.sel .hint")).length > 0, `${tag} L3: よみ ヒント`);
      await answerSel(true);
      check(await page.locator(".filled").count() === 1, `${tag} L${lv}: まちがえた あと せいかいで 1こ うまる`);
      if (lv === 1 || lv === 4) await shot(`1-L${lv}`);
      await noH(`L${lv}`);
      await page.click("#backBtn"); await page.click("#backBtn");
    }

    // しんぶん 1まい ぜんぶ
    await page.click('.lv-card[data-lv="5"]');
    await page.click('.sheet-btn[data-i="0"]');
    await page.waitForTimeout(1500);
    await shot("2-news"); await noH("しんぶん");
    const n = await page.locator("#paper .hole").count();
    check(n >= 3 && n <= 5, `${tag} しんぶん: あな ${n}こ`);
    for (let i = 0; i < n; i++) await answerSel(false);
    await page.waitForSelector("#done:not([hidden])");
    check(await page.locator("#paper .hole").count() === 0, `${tag} しんぶん: ぜんぶ うまった`);
    await page.waitForTimeout(800);
    await shot("3-news-done");
    const sv = await page.evaluate(() => MSTest.save());
    check(sv.clear[5].includes(0), `${tag} ほぞん: しんぶん 1 クリア`);
    check(Object.values(sv.zukan).reduce((a, b) => a + b, 0) === 4 + n, `${tag} ずかん: にがした むし ${4 + n}ひき`);

    // おもしろ モード ＋ パッド
    await page.click("#backBtn"); await page.click("#backBtn");
    await page.click("#setBtn");
    await page.click("#setOmo"); await page.click("#setPad");
    await page.click("#backBtn");
    await page.click('.lv-card[data-lv="1"]');
    await page.click('.sheet-btn[data-i="1"]');
    await page.waitForTimeout(1500);
    const k = await page.evaluate(() => MSTest.sel());
    const h = (await page.evaluate(() => MSTest.holes()))[k];
    await page.click(`.choice[data-w="${h.d[0]}"]`);
    await page.waitForSelector("#funny:not([hidden])");
    check((await page.textContent("#funnyText")).includes(h.d[0]), `${tag} おもしろ: へんな ぶん「${(await page.textContent("#funnyText")).trim()}」`);
    await page.waitForTimeout(2000);
    await shot("4-omoshiro");
    await page.waitForSelector("#funny", { state: "hidden", timeout: 4000 });
    check(await page.locator(".filled").count() === 1, `${tag} おもしろ: そのあと せいかいで うまる`);
    await page.click("#backBtn"); await page.click("#backBtn");

    await page.click('.lv-card[data-lv="4"]');
    await page.click('.sheet-btn[data-i="0"]');
    await page.waitForTimeout(1500);
    check(await page.locator("#padWrap:not([hidden])").count() === 1, `${tag} パッド: でる`);
    const fs16 = await page.evaluate(() => Math.min(...[...document.querySelectorAll(".pk:not(.blank)")].map((b) => parseFloat(getComputedStyle(b).fontSize))));
    check(fs16 >= 16, `${tag} パッド: もじ ${fs16}px ≧ 16px`);
    const k4 = await page.evaluate(() => MSTest.sel());
    const a4 = (await page.evaluate(() => MSTest.holes()))[k4].a;
    // き → OK（さるも きから おちる）
    for (const c of a4) await page.click(`.pk[data-c="${c}"]`);
    await page.waitForTimeout(500);
    check(await page.locator(".filled").count() === 1, `${tag} パッド: 「${a4}」を いれて うまる`);
    await shot("5-pad"); await noH("パッド");

    // れんだ・ダブルタップ で ズーム しない
    if (touch) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.locator(".letter-head").scrollIntoViewIfNeeded();
      const box = await page.locator(".letter-head").boundingBox();
      for (let i = 0; i < 12; i++) await page.touchscreen.tap(box.x + box.width - 20, box.y + box.height / 2);
      const pk = await page.locator('.pk[data-f="del"]').boundingBox();
      for (let i = 0; i < 8; i++) await page.touchscreen.tap(pk.x + 5, pk.y + 5);
      await page.waitForTimeout(400);
      const sc = await page.evaluate(() => (window.visualViewport ? window.visualViewport.scale : 1));
      check(sc <= 1.01, `${tag} れんだ しても ズーム しない（scale ${sc}）`);
    }
    const vpm = await page.getAttribute('meta[name="viewport"]', "content");
    check(/user-scalable=no/.test(vpm), `${tag} viewport: ${vpm}`);

    // ずかん
    await page.click("#backBtn"); await page.click("#backBtn");
    await page.click("#zukanBtn");
    check(await page.locator(".zcard").count() === 10, `${tag} ずかん: 10しゅ`);
    await shot("6-zukan"); await noH("ずかん");

    // よみこみ なおし
    await page.reload();
    const sv2 = await page.evaluate(() => MSTest.save());
    check(sv2.clear[5].includes(0) && sv2.set.omo && sv2.set.pad, `${tag} よみこみ なおしても ほぞんが のこる`);

    check(errs.length === 0, `${tag} JS エラー なし${errs.length ? "（" + errs.slice(0, 3).join(" / ") + "）" : ""}`);
    await ctx.close();
  }
  await browser.close();
  console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
  process.exit(fail ? 1 : 0);
})();
