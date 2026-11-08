#!/usr/bin/env node
/* ブラウザ で うごかして みる:  node irekae-puzzle/check.js [スクショ の だしさき]
 * 390×844（たて スマホ）・1024×768（よこ タブレット）・844×390（よこ スマホ）で
 *  - ステージ 1 を ボタン で とく（ソルバー の て を ポイント・▶・−＋・◀ で うつ）→ ★ が ほぞん される
 *  - ステージ 2 を ゆび の スワイプ（▶／◀）と かしゃ の タップ で とく
 *  - 1て もどる・ヒント・ていいん の チェック
 *  - ステージ 40 が はみださない。よこスクロール・JS エラー なし、ボタン の もじ 16px いじょう
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
    const inView = async (where) => {
      const bad = await page.evaluate(() => [...document.querySelectorAll("#play button, #board")].filter((b) => b.offsetParent).filter((b) => {
        const r = b.getBoundingClientRect(); return r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.top < 0 || r.left < 0;
      }).map((b) => b.id || b.className));
      check(bad.length === 0, `${tag} ${where}: がめん から はみださない ${bad.join(",")}`);
    };
    const idle = (ph) => page.waitForFunction((p) => IPTest.phase() === p && !IPTest.busy(), ph, { timeout: 8000 });
    const swipe = async (dx) => {
      const b = await page.locator("#board").boundingBox();
      const x0 = b.x + b.width / 2 - dx / 2, y0 = b.y + b.height / 2;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
      for (let k = 1; k <= 6; k++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + (dx * k) / 6, y: y0 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };

    check(await page.locator(".st-btn").count() === 40, `${tag} ステージ 40`);
    check(await page.locator(".st-btn.lock").count() === 38, `${tag} はじめ は 1・2 だけ ひらく`);
    await shot("0-home"); await noH("ホーム");

    // ステージ 1: ボタン で
    await page.click('.st-btn[data-id="1"]');
    await page.evaluate(() => IPTest.fast(true));
    await idle("park");
    const fs16 = await page.evaluate(() => Math.min(...[...document.querySelectorAll("#play button")].filter((b) => b.offsetParent).map((b) => parseFloat(getComputedStyle(b).fontSize))));
    check(fs16 >= 16, `${tag} ボタン の もじ ${fs16}px ≧ 16px`);
    await shot("1-play"); await noH("プレイ"); await inView("プレイ");
    // ていいん: からっぽ の せんろ へ は すすめない／ひきあげせん より おおく は ひけない
    const path1 = await page.evaluate(() => IPTest.solve());
    let first = true;
    for (const [x, j] of path1) {
      await page.click(`.pt-btn[data-track="${x}"]`);
      await page.click("#goBtn");
      await idle("in");
      if (first) { await shot("2-in"); first = false; }
      for (let g = 0; g < 8 && (await page.evaluate(() => IPTest.cut())) !== j; g++) {
        await page.click((await page.evaluate(() => IPTest.cut())) < j ? "#cutPlus" : "#cutMinus");
      }
      check(await page.evaluate(() => IPTest.cut()) === j, `${tag} ✂ ${j}りょう`);
      await page.click("#backBtn2");
      await page.waitForFunction(() => IPTest.phase() !== "anim" && !IPTest.busy() || !document.querySelector("#result").hidden, null, { timeout: 8000 });
    }
    await page.waitForSelector("#result:not([hidden])", { timeout: 5000 });
    check((await page.textContent("#resStars")).trim() === "★★★", `${tag} ステージ 1: ★3（${path1.length}て）`);
    check((await page.evaluate(() => IPTest.save())).stars[1] === 3, `${tag} ★ が ほぞん された`);
    await shot("3-clear"); await inView("けっか");

    // ステージ 2: スワイプ と かしゃ タップ
    await page.click("#nextBtn");
    await idle("park");
    await page.evaluate(() => IPTest.fast(true));
    const path2 = await page.evaluate(() => IPTest.solve());
    for (const [x, j] of path2) {
      if ((await page.evaluate(() => IPTest.sel())) !== x) await page.click(`.pt-btn[data-track="${x}"]`);
      await swipe(120);
      await idle("in");
      // かしゃ を タップ（j りょう め）／きかんしゃ を タップ（0）
      const ids = await page.evaluate(() => [...document.querySelectorAll("#board .car")].map((g) => +g.dataset.id));
      void ids;
      if ((await page.evaluate(() => IPTest.cut())) !== j) {
        await page.evaluate((jj) => {
          // つないで いる かしゃ の じゅんばん は がめん の ひだり から
          const cars = [...document.querySelectorAll("#board .car")].map((g) => ({ g, r: g.getBoundingClientRect() }));
          const loco = document.querySelector("#board .loco").getBoundingClientRect();
          const row = cars.filter((c) => Math.abs((c.r.top + c.r.bottom) / 2 - (loco.top + loco.bottom) / 2) < 4 && c.r.left > loco.left).sort((a, b) => a.r.left - b.r.left);
          window.__tapTarget = jj === 0 ? "loco" : row[jj - 1] ? row[jj - 1].g.dataset.id : null;
        }, j);
        const tgt = await page.evaluate(() => window.__tapTarget);
        await page.locator(tgt === "loco" ? "#board .loco" : `#board .car[data-id="${tgt}"]`).tap();
      }
      check(await page.evaluate(() => IPTest.cut()) === j, `${tag} タップ で ✂ ${j}りょう`);
      await swipe(-120);
      await page.waitForFunction(() => IPTest.phase() !== "anim" && !IPTest.busy() || !document.querySelector("#result").hidden, null, { timeout: 8000 });
    }
    await page.waitForSelector("#result:not([hidden])", { timeout: 5000 });
    check((await page.evaluate(() => IPTest.save())).stars[2] === 3, `${tag} ステージ 2: スワイプ で ★3`);
    check(await page.evaluate(() => IPTest.moves()) === path2.length, `${tag} てかず ${path2.length}`);

    // 1て もどる・ヒント
    await page.click("#againBtn");
    await idle("park");
    await page.evaluate(() => IPTest.fast(true));
    const s0 = await page.evaluate(() => JSON.stringify(IPTest.state()));
    await page.click("#hintBtn");
    await page.waitForFunction(() => document.querySelector("#msg").textContent.includes("💡"));
    const p0 = await page.evaluate(() => IPTest.solve());
    check(await page.evaluate(() => IPTest.sel()) === p0[0][0], `${tag} ヒント で ポイント が きりかわる`);
    await page.click("#goBtn"); await idle("in");
    check(await page.evaluate(() => IPTest.cut()) === p0[0][1], `${tag} ヒント の かず が えらばれて いる`);
    await page.click("#backBtn2"); await idle("park");
    check(await page.evaluate(() => IPTest.moves()) === 1, `${tag} 1て すすんだ`);
    await page.click("#undoBtn");
    check(await page.evaluate(() => JSON.stringify(IPTest.state())) === s0 && await page.evaluate(() => IPTest.moves()) === 0, `${tag} 1て もどる で もと どおり`);

    // ステージ 40（ぜんぶ ひらいた こと に する）
    await page.evaluate(() => { const s = {}; for (let i = 1; i <= 39; i++) s[i] = 1; localStorage.setItem("irekae-puzzle-v1", JSON.stringify({ stars: s, sound: false })); });
    await page.reload();
    check(await page.locator(".st-btn.lock").count() === 0, `${tag} ★ が ある と ぜんぶ ひらく`);
    check((await page.textContent("#soundBtn")).includes("🔇"), `${tag} おと オフ が ほぞん される`);
    await page.click('.st-btn[data-id="40"]');
    await page.evaluate(() => IPTest.fast(true));
    await idle("park");
    check(await page.locator(".pt-btn").count() === 4, `${tag} ステージ 40: せんろ 4ほん`);
    await page.click('.pt-btn[data-track="0"]');
    await page.click("#goBtn"); await idle("in");
    for (let g = 0; g < 8; g++) await page.click("#cutPlus");
    check(await page.evaluate(() => IPTest.cut()) === 3, `${tag} ひきあげせん は 3りょう まで`);
    await shot("4-stage40"); await noH("ステージ 40"); await inView("ステージ 40");
    await page.click("#backBtn2"); await idle("park");

    // まいにち もんだい
    await page.click("#back");
    await page.click("#dailyBtn");
    await idle("park");
    check((await page.textContent("#titleText")).includes("まいにち"), `${tag} まいにち もんだい が ひらく`);
    await shot("5-daily"); await inView("まいにち");

    // ダブルタップ で ズーム しない
    const b = await page.locator("#board").boundingBox();
    for (let k = 0; k < 2; k++) await page.touchscreen.tap(b.x + 20, b.y + 20);
    await page.waitForTimeout(300);
    const sc = await page.evaluate(() => (window.visualViewport ? visualViewport.scale : 1));
    check(sc <= 1.01, `${tag} ダブルタップ で ズーム しない（${sc}）`);

    check(errs.length === 0, `${tag} JS エラー なし ${errs.join(" / ")}`);
    await ctx.close();
  }
  await browser.close();
  console.log(fail ? `✗ ${fail} こ だめ` : "ぜんぶ OK");
  process.exit(fail ? 1 : 0);
})();
