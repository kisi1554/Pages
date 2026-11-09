#!/usr/bin/env node
/* ブラウザ で うごかして みる:  node densha-dokoda/check.js [スクショ の だしさき]
 * 390×844（たて スマホ）・1024×768（よこ タブレット）・844×390（よこ スマホ）で
 *  - まち を 1つ えらび、デバッグ フック で ばしょ を えて タップ → 5つ ぜんぶ みつける → ごほうび → けっか
 *  - はずれ を タップ しても ふえない。ながおし で ヒント が ひかる。おまけ も みつけられる
 *  - 2ほん ゆび の ピンチ で え だけ ズーム（visualViewport.scale は 1 の まま）、ダブルタップ でも ズーム しない
 *  - ずかん に のる・localStorage に ほぞん。よこスクロール・JS エラー なし、バー の ボタン の もじ 16px いじょう
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
  const screens = [["phone", { width: 390, height: 844 }, 0], ["tablet", { width: 1024, height: 768 }, 1], ["phone-yoko", { width: 844, height: 390 }, 4]];
  for (const [tag, vp, townIdx] of screens) {
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
    const touch = async (pts, type) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })) });
    const tapAt = async (x, y) => { await touch([[x, y]], "touchStart"); await touch([], "touchEnd"); await page.waitForTimeout(60); };
    const scale = () => page.evaluate(() => (window.visualViewport ? window.visualViewport.scale : 1));

    check(await page.locator(".town").count() === 6, `${tag} まち 6まい`);
    await shot("0-home"); await noH("ホーム");

    await page.locator(".town").nth(townIdx).click();
    await page.waitForTimeout(200);
    const town = await page.evaluate(() => DDTest.town());
    check(await page.locator(".card").count() === 5, `${tag} ${town}: カード 5まい`);
    check(await page.locator(".card.sil").count() === 5, `${tag} はじめ は ぜんぶ シルエット`);
    const fs16 = await page.evaluate(() => Math.min(...[...document.querySelectorAll("#play .bar button, .zoombtns button")].filter((b) => b.offsetParent).map((b) => parseFloat(getComputedStyle(b).fontSize))));
    check(fs16 >= 16, `${tag} ボタン の もじ ${fs16}px ≧ 16px`);
    const inView = await page.evaluate(() => [...document.querySelectorAll("#play .card, #play .bar button")].filter((b) => { const r = b.getBoundingClientRect(); return r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.top < -1 || r.left < -1; }).length);
    check(inView === 0, `${tag} カード・ボタン が がめん から はみださない`);
    await shot("1-play"); await noH("プレイ");

    // はずれ: そら の いちばん うえ（なにも ない ところ）
    const sky = await page.evaluate(() => { const v = DDTest.view(); return DDTest.toClient(v.vx + 6, v.vy + 4); });
    await tapAt(sky.x + 2, sky.y + 2);
    check(await page.evaluate(() => DDTest.found()) === 0, `${tag} はずれ では ふえない`);

    // ピンチ: え だけ ズーム、ブラウザ は ズーム しない
    const box = await page.locator("#stage").boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await touch([[cx - 30, cy], [cx + 30, cy]], "touchStart");
    for (let k = 1; k <= 8; k++) await touch([[cx - 30 - k * 18, cy], [cx + 30 + k * 18, cy]], "touchMove");
    await touch([], "touchEnd");
    const z1 = await page.evaluate(() => DDTest.zoom());
    check(z1 > 1.5, `${tag} ピンチ で え が ${z1.toFixed(2)}ばい`);
    check(await scale() === 1, `${tag} ピンチ でも visualViewport.scale = 1`);
    // もっと ひろげても 3ばい で とまる
    for (let r = 0; r < 3; r++) {
      await touch([[cx - 20, cy], [cx + 20, cy]], "touchStart");
      for (let k = 1; k <= 8; k++) await touch([[cx - 20 - k * 25, cy], [cx + 20 + k * 25, cy]], "touchMove");
      await touch([], "touchEnd");
    }
    const z3 = await page.evaluate(() => DDTest.zoom());
    check(Math.abs(z3 - 3) < 0.01, `${tag} ズーム は 3ばい で とまる（${z3.toFixed(2)}）`);
    await shot("2-zoom");
    // ドラッグ で うごく・さかい で とまる
    const v0 = await page.evaluate(() => DDTest.view());
    await touch([[cx, cy]], "touchStart");
    for (let k = 1; k <= 10; k++) await touch([[cx + k * 40, cy]], "touchMove");
    await touch([], "touchEnd");
    const v1 = await page.evaluate(() => DDTest.view());
    check(v1.vx < v0.vx || v0.vx === 0, `${tag} ドラッグ で え が うごく`);
    check(v1.vx >= 0 && v1.vy >= 0, `${tag} さかい で とまる`);
    // ちぢめる: 1ばい で とまる
    await page.click("#zOut"); await page.click("#zOut"); await page.click("#zOut"); await page.click("#zOut");
    check(Math.abs(await page.evaluate(() => DDTest.zoom()) - 1) < 0.01, `${tag} － で 1ばい まで（それ より ちいさく ならない）`);

    // ヒント: ながおし
    const firstId = (await page.evaluate(() => DDTest.ids()))[0];
    const cb = await page.locator(`.card[data-id="${firstId}"]`).boundingBox();
    await touch([[cb.x + cb.width / 2, cb.y + cb.height / 2]], "touchStart");
    await page.waitForTimeout(800);
    await touch([], "touchEnd");
    check(await page.locator("#fx .hint").count() === 1, `${tag} ながおし で ヒント が ひかる`);
    await page.waitForTimeout(300);
    await shot("3-hint");
    check(await page.evaluate(() => DDTest.found()) === 0, `${tag} ヒント では みつけた に ならない`);

    // おまけ
    const ex = (await page.evaluate(() => DDTest.extras()))[0];
    let p = await page.evaluate((id) => DDTest.focus(id), ex);
    await tapAt(p.x, p.y);
    check(await page.locator("#omakeBadge").isVisible(), `${tag} おまけ「${ex}」を みつけた`);
    check(await page.evaluate(() => DDTest.found()) === 0, `${tag} おまけ は さがす もの に かぞえない`);

    // ぜんぶ みつける（さいご の 1つ は ダブルタップ: ズーム しない・2かい かぞえない）
    const ids = await page.evaluate(() => DDTest.ids());
    for (let i = 0; i < ids.length; i++) {
      p = await page.evaluate((id) => DDTest.focus(id), ids[i]);
      if (i === ids.length - 1) { await tapAt(p.x, p.y); await tapAt(p.x, p.y); }
      else await tapAt(p.x, p.y);
      check(await page.evaluate(() => DDTest.found()) === i + 1, `${tag} ${ids[i]} を みつけた（${i + 1}/5）`);
      if (i === 1) await shot("4-found");
    }
    check(await scale() === 1, `${tag} ダブルタップ でも visualViewport.scale = 1`);
    check(await page.locator(".card.ok").count() === 5, `${tag} カード ぜんぶ ✅`);
    await page.waitForTimeout(3200);
    await shot("5-celebrate");
    await page.waitForSelector("#result:not([hidden])", { timeout: 8000 });
    await shot("6-result"); await noH("けっか");
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("densha-dokoda-v1")));
    check(Object.keys(saved.found).length === 5 && saved.clears[town] === 1 && saved.omake[ex] === 1, `${tag} ほぞん: ずかん 5・クリア 1・おまけ 1`);

    // もういちど → いれかえ、ずかん
    await page.click("#againBtn");
    check(await page.evaluate(() => DDTest.found()) === 0 && await page.locator(".card.sil").count() === 5, `${tag} もういちど で あたらしく はじまる`);
    await page.click("#backBtn");
    check((await page.textContent("#zukanCount")).trim() === "5/30", `${tag} ホーム の ずかん 5/30`);
    await page.click("#zukanBtn");
    check(await page.locator(".zitem:not(.sil)").count() === 6, `${tag} ずかん に 5つ＋おまけ 1つ`);
    const rubyOk = await page.evaluate(() => !/[㐀-鿿]/.test([...document.querySelectorAll(".zitem")].map((z) => { const c = z.cloneNode(true); c.querySelectorAll("ruby").forEach((r) => r.remove()); return c.textContent; }).join("")));
    check(rubyOk, `${tag} ずかん の かんじ は ぜんぶ ふりがな つき`);
    await shot("7-zukan"); await noH("ずかん");

    check(errs.length === 0, `${tag} JS エラー なし ${errs.join(" / ")}`);
    await ctx.close();
  }
  await browser.close();
  console.log(fail ? `\n✗ ${fail} こ だめ` : "\nぜんぶ OK");
  process.exit(fail ? 1 : 0);
})();
