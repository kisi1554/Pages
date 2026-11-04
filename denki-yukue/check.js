#!/usr/bin/env node
/* ブラウザで うごかして みる:  node denki-yukue/check.js [スクショの だしさき]
 * 390×844（たて スマホ）・1024×768（よこ タブレット）・844×390（よこ スマホ）で
 *  - ステージ 1 を ドラッグ で たてて、1にち さいご まで（★ が ほぞん される）
 *  - スライダー が タッチ（ゆび で ひっぱる）で うごく。でんち の ためる／だす
 *  - なにも たりない と まっくら → けっか
 *  - ステージ 15（ぜんぶ の しゅるい・カード）の じゅんび と プレイ が はみださない
 *  - れんだ・ダブルタップ で ズーム しない、JS エラー・よこスクロール が ない
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
  const screens = [["phone", { width: 390, height: 844 }], ["tablet", { width: 1024, height: 768 }], ["phone-yoko", { width: 844, height: 390 }]];
  for (const [tag, vp] of screens) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: tag.startsWith("phone") });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await page.goto(URL);
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* */ } });
    await page.reload();
    const shot = (n) => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
    const noH = async (where) => {
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      check(w[0] <= w[1] + 1, `${tag} ${where}: よこスクロール なし（${w[0]} ≦ ${w[1]}）`);
    };
    const center = async (sel) => { const b = await page.locator(sel).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2, b]; };
    const touchDrag = async (x0, y0, x1, y1) => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
      for (let k = 1; k <= 8; k++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * k) / 8, y: y0 + ((y1 - y0) * k) / 8 }] });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(80);
    };

    check(await page.locator(".st-btn").count() === 15, `${tag} タイトル: ステージ 15`);
    check(await page.locator(".st-btn.lock").count() === 14, `${tag} タイトル: はじめ は ステージ 1 だけ`);
    await shot("0-title"); await noH("タイトル");

    // ステージ 1: ゆび で ドラッグ して たてる
    await page.click('.st-btn[data-id="1"]');
    await page.waitForSelector("#vPrep:not([hidden])");
    for (const [t, id] of [["solar", "h1"], ["solar", "h2"], ["fire", "h3"], ["fire", "h4"]]) {
      await page.locator(`.slot[data-id="${id}"]`).scrollIntoViewIfNeeded();
      const [x1, y1] = await center(`.slot[data-id="${id}"]`);
      await page.locator(`.pal[data-t="${t}"]`).scrollIntoViewIfNeeded();
      const [x0, y0] = await center(`.pal[data-t="${t}"]`);
      const [xs, ys] = await center(`.slot[data-id="${id}"]`);
      await touchDrag(x0, y0, xs, ys);
      void x1; void y1;
    }
    const b1 = await page.evaluate(() => DYTest.build());
    check(b1.h1 === "solar" && b1.h2 === "solar" && b1.h3 === "fire" && b1.h4 === "fire", `${tag} ドラッグ で たてた ${JSON.stringify(b1)}`);
    // タップ で えらんで タップ で おく → タップ で とりけす
    await page.click('.pal[data-t="solar"]'); await page.click('.slot[data-id="u1"]');
    check((await page.evaluate(() => DYTest.build())).u1 === "solar", `${tag} タップ でも おける`);
    await page.click('.slot[data-id="u1"]');
    check(!(await page.evaluate(() => DYTest.build())).u1, `${tag} タップ で とりけせる`);
    check((await page.textContent("#budget")).includes("2 / 12"), `${tag} よさん: ${(await page.textContent("#budget")).trim()}`);
    await shot("1-prep"); await noH("じゅんび");

    // スタート → スライダー を ゆび で
    await page.click("#startBtn");
    await page.waitForSelector("#vPlay:not([hidden])");
    await page.evaluate(() => DYTest.pause(true));
    await page.evaluate(() => { document.querySelector("#pauseCover").hidden = true; });
    await page.locator("#fireSlider").scrollIntoViewIfNeeded();
    const [, sy, sb] = await center("#fireSlider .track");
    await touchDrag(sb.x + sb.width * 0.2, sy, sb.x + sb.width * 0.8, sy);
    const f80 = (await page.evaluate(() => DYTest.ctl())).fire;
    check(Math.abs(f80 - 0.8) < 0.06, `${tag} スライダー: ゆび で 80% に（${f80}）`);
    await touchDrag(sb.x + sb.width * 0.8, sy, sb.x - 30, sy);
    check((await page.evaluate(() => DYTest.ctl())).fire === 0, `${tag} スライダー: ひだり はし で 0%`);
    const fs16 = await page.evaluate(() => Math.min(...[...document.querySelectorAll("#vPlay button")].filter((b) => b.offsetParent).map((b) => parseFloat(getComputedStyle(b).fontSize))));
    check(fs16 >= 16, `${tag} ボタン の もじ ${fs16}px ≧ 16px`);
    await page.evaluate(() => { DYTest.autopilot(true); DYTest.speed(25); DYTest.pause(false); });
    await page.waitForTimeout(900);
    await shot("2-play"); await noH("プレイ");
    await page.waitForSelector("#vResult:not([hidden])", { timeout: 20000 });
    await page.waitForTimeout(300);
    const s1 = await page.evaluate(() => DYTest.sim());
    check(s1.done && !s1.blackout && s1.i === 120, `${tag} ステージ 1: 1にち さいご まで（まっくら なし）`);
    const n1 = (await page.evaluate(() => DYTest.save())).stars[1] || 0;
    check(n1 >= 1, `${tag} ★ が ほぞん された（★${n1}）`);
    check(await page.locator("#nextBtn:not([hidden])").count() === 1, `${tag} けっか: つぎ の ステージ ボタン`);
    await shot("3-result"); await noH("けっか");

    // まっくら: たいようこう 1つ だけ で よる
    await page.click("#rebuildBtn");
    for (const id of ["h1", "h2", "h3", "h4"]) await page.click(`.slot[data-id="${id}"]`);
    await page.click('.pal[data-t="solar"]'); await page.click('.slot[data-id="h1"]');
    await page.click("#startBtn");
    await page.evaluate(() => { DYTest.autopilot(false); DYTest.speed(25); });
    await page.waitForSelector("#blackout:not([hidden])", { timeout: 8000 });
    await shot("4-blackout");
    await page.waitForSelector("#vResult:not([hidden])", { timeout: 5000 });
    check((await page.textContent("#resTitle")).includes("まっくら"), `${tag} まっくら → けっか「${(await page.textContent("#resTitle")).trim()}」`);
    check(((await page.evaluate(() => DYTest.save())).stars[1] || 0) === n1, `${tag} まっくら でも まえ の ★ は へらない`);

    // ステージ 15（ぜんぶ ひらいた ことに する）
    await page.evaluate(() => { const s = {}; for (let i = 1; i <= 14; i++) s[i] = 1; localStorage.setItem("denki-yukue-v1", JSON.stringify({ stars: s, set: { sound: false } })); });
    await page.reload();
    check(await page.locator(".st-btn.lock").count() === 0, `${tag} ★ が ある と ぜんぶ ひらく`);
    check((await page.textContent("#sndBtn")).includes("🔇"), `${tag} おと オフ が ほぞん される`);
    await page.click('.st-btn[data-id="15"]');
    check(await page.locator(".pal").count() === 5, `${tag} ステージ 15: はつでんしょ 5しゅるい`);
    const put = [["wind", "y1"], ["wind", "y2"], ["dam", "y3"], ["wind", "u1"], ["wind", "u2"], ["wind", "u3"], ["solar", "h1"], ["fire", "h2"], ["fire", "h3"], ["batt", "h4"]];
    for (const [t, id] of put) { await page.click(`.pal[data-t="${t}"]`); await page.click(`.slot[data-id="${id}"]`); }
    await page.click('.slot[data-id="u3"]'); await page.click('.pal[data-t="dam"]'); await page.click('.slot[data-id="u3"]');
    check(!(await page.evaluate(() => DYTest.build())).u3, `${tag} ダム は うみ に おけない`);
    await page.click('.pal[data-t="wind"]'); await page.click('.slot[data-id="u3"]');
    await page.waitForTimeout(100);
    await shot("5-prep15"); await noH("じゅんび 15");
    await page.click("#startBtn");
    await page.evaluate(() => DYTest.speed(60));
    check(await page.locator("#ctlDam:not([hidden])").count() === 1 && await page.locator("#ctlBatt:not([hidden])").count() === 1 &&
      await page.locator("#cardBtn:not([hidden])").count() === 1, `${tag} プレイ 15: ダム・でんち・カード が でる`);
    await page.click('.bmode[data-m="discharge"]');
    check((await page.evaluate(() => DYTest.ctl())).batt === "discharge", `${tag} でんち: だす に きりかえ`);
    await page.evaluate(() => DYTest.autopilot(true));
    await page.waitForTimeout(2600);
    await shot("6-play15"); await noH("プレイ 15");
    await page.evaluate(() => DYTest.speed(15));
    await page.waitForSelector("#vResult:not([hidden])", { timeout: 20000 });
    const s15 = await page.evaluate(() => DYTest.sim());
    check(s15.done && !s15.blackout && s15.cards === 0, `${tag} ステージ 15: おてほん で さいご まで（けむり ${Math.round(s15.co2)}・カード のこり ${s15.cards}）`);

    // れんだ・ダブルタップ で ズーム しない
    await page.click("#menuBtn");
    const [zx, zy] = await center(".hero");
    for (let i = 0; i < 12; i++) await page.touchscreen.tap(zx, zy);
    await page.waitForTimeout(300);
    const sc = await page.evaluate(() => (window.visualViewport ? window.visualViewport.scale : 1));
    check(sc <= 1.01, `${tag} れんだ しても ズーム しない（scale ${sc}）`);
    const vpm = await page.getAttribute('meta[name="viewport"]', "content");
    check(/user-scalable=no/.test(vpm), `${tag} viewport: ${vpm}`);

    // ずかん
    await page.click("#zukanBtn");
    check(await page.locator(".zcard").count() === 7, `${tag} ずかん: 5しゅるい ＋ げんしりょく ＋ きほん`);
    check(await page.locator("ruby").count() >= 1, `${tag} かんじ に ふりがな`);
    await shot("7-zukan"); await noH("ずかん");

    check(errs.length === 0, `${tag} JS エラー なし${errs.length ? "（" + errs.slice(0, 3).join(" / ") + "）" : ""}`);
    await ctx.close();
  }
  await browser.close();
  console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
  process.exit(fail ? 1 : 0);
})();
