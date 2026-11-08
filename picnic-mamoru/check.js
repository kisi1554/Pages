#!/usr/bin/env node
/* ブラウザ で うごかして みる:  node picnic-mamoru/check.js [スクショ の だしさき]
 * 390×844（たて スマホ）・1024×768（よこ タブレット）・768×1024（たて タブレット）で、
 * タイトル → こうえん えらび → ステージ1 → ドラッグ で おく → タップ で おく → おいた どうぐ を かたづける →
 * デバッグ フック で どうぐ を おきながら さいご の ウェーブ まで → パーティー の がめん。
 * じゆう モード で いきもの を よべる。ずかん・あそびかた が ひらく。
 * よこスクロール なし、れんだ・ピンチ で ズーム しない、ルビ なし の かんじ が ない、JS エラー なし。
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
  for (const [tag, vp] of [["phone", { width: 390, height: 844 }], ["tablet", { width: 1024, height: 768 }], ["tabtate", { width: 768, height: 1024 }]]) {
    console.log("■ " + tag);
    const touch = tag !== "tablet";
    const page = await browser.newPage({ viewport: vp, hasTouch: touch });
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await page.goto(URL);
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* */ } });
    await page.reload();
    const shot = (n) => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
    const st = () => page.evaluate(() => PMTest.state());
    const noHScroll = async (where) => {
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      check(w[0] <= w[1] + 1, `${where}: よこスクロール なし（${w[0]} ≦ ${w[1]}）`);
    };
    const noKanji = async (where) => {
      const bad = await page.evaluate(() => {
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), out = [];
        for (let n; (n = walk.nextNode());) {
          if (n.parentElement.closest("ruby, script, style")) continue;
          if (/[一-鿿]/.test(n.textContent)) out.push(n.textContent.trim());
        }
        return out;
      });
      check(bad.length === 0, `${where}: ルビ なし の かんじ なし${bad.length ? "（" + bad.slice(0, 2).join(" / ") + "）" : ""}`);
    };
    const zoom = () => page.evaluate(() => (window.visualViewport ? visualViewport.scale : 1));
    const inView = async (sel) => {
      const r = await page.locator(sel).first().boundingBox();
      return r && r.x >= -1 && r.y >= -1 && r.x + r.width <= vp.width + 1 && r.y + r.height <= vp.height + 1;
    };

    // タイトル
    await shot("1-title");
    await noHScroll("タイトル"); await noKanji("タイトル");
    // あそびかた・ずかん
    await page.click("#bHelp");
    check(await page.isVisible("#modal"), "あそびかた が ひらく");
    await noKanji("あそびかた");
    await page.click("#mBtns button");
    await page.click("#bZukan");
    check(await page.locator(".zitem").count() === 4, "ずかん に いきもの 4しゅるい");
    await noKanji("ずかん");
    await page.click("#mBtns button");

    // こうえん えらび
    await page.click("#bPlay");
    check(await page.isVisible("#vSelect"), "こうえん えらび が ひらく");
    check(await page.locator(".sbtn:not([disabled])").count() === 1, "はじめ は ステージ1 だけ えらべる");
    await shot("2-select");
    await noHScroll("こうえん えらび"); await noKanji("こうえん えらび");
    await page.click('.sbtn[data-stage="1"]');
    let s = await st();
    check(s.view === "game" && s.phase === "prep" && s.stageNo === 1, "ステージ1 が はじまる");
    check(await inView("#cv") && await inView("#bGo") && await inView('.tool[data-tool="fan"]'), "ばん・どうぐ・スタート が がめん に おさまる");
    const cvBox = await page.locator("#cv").boundingBox();
    check(cvBox.width >= Math.min(vp.width, vp.height) * 0.5, `ばん が じゅうぶん おおきい（${Math.round(cvBox.width)}px）`);
    await noHScroll("ゲーム"); await noKanji("ゲーム");

    // ドラッグ で うちわ を おく
    const cell = await page.evaluate(() => PMTest.freeCell("fan"));
    const to = await page.evaluate((c) => PMTest.cellPoint(c.x, c.y), cell);
    const fanBtn = await page.locator('.tool[data-tool="fan"]').boundingBox();
    await page.mouse.move(fanBtn.x + fanBtn.width / 2, fanBtn.y + fanBtn.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(fanBtn.x + fanBtn.width / 2 + (to.x - fanBtn.x - fanBtn.width / 2) * i / 8, fanBtn.y + fanBtn.height / 2 + (to.y - fanBtn.y - fanBtn.height / 2) * i / 8);
    await shot("3-drag");
    await page.mouse.up();
    s = await st();
    check(s.tools === 1 && s.coins === 30, `ドラッグ で うちわ が おける（どうぐ ${s.tools}・🌰${s.coins}）`);

    // タップ で えらんで おく
    await page.click('.tool[data-tool="crumb"]');
    const cell2 = await page.evaluate(() => PMTest.freeCell("crumb"));
    const to2 = await page.evaluate((c) => PMTest.cellPoint(c.x, c.y), cell2);
    if (touch) await page.touchscreen.tap(to2.x, to2.y); else await page.mouse.click(to2.x, to2.y);
    s = await st();
    check(s.tools === 2, "えらんで タップ で パンくず が おける");
    // みち の うえ には おけない
    const pathCell = await page.evaluate(() => { const p = PMTest.game().park.paths[0][3]; return PMTest.cellPoint(p[0], p[1]); });
    if (touch) await page.touchscreen.tap(pathCell.x, pathCell.y); else await page.mouse.click(pathCell.x, pathCell.y);
    s = await st();
    check(s.tools === 2 && /みち/.test(await page.textContent("#msg")), "みち の うえ には おけない（せつめい が でる）");
    // おいた どうぐ を タップ → かたづける
    await page.click('.tool[data-tool="crumb"]');   // えらぶ の を やめる
    if (touch) await page.touchscreen.tap(to2.x, to2.y); else await page.mouse.click(to2.x, to2.y);
    check(await page.isVisible("#tInfo"), "おいた どうぐ を タップ する と せつめい が でる");
    await shot("4-info");
    await page.click("#tiDel");
    s = await st();
    check(s.tools === 1 && s.coins === 30 - 12 + Math.floor(12 * 0.7), `かたづける と コイン が もどる（🌰${s.coins}）`);

    // れんだ・ピンチ で ズーム しない
    const mid = { x: cvBox.x + cvBox.width / 2, y: cvBox.y + cvBox.height / 2 };
    if (touch) { for (let i = 0; i < 6; i++) await page.touchscreen.tap(mid.x, mid.y); }
    else { await page.mouse.dblclick(mid.x, mid.y); }
    await page.waitForTimeout(150);
    check(await zoom() === 1, "れんだ で ズーム しない");
    if (touch) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.synthesizePinchGesture", { x: Math.round(mid.x), y: Math.round(mid.y), scaleFactor: 2, relativeSpeed: 800, gestureSourceType: "touch" });
      await page.waitForTimeout(500);
      check(await zoom() <= 1.01, "ピンチ で ズーム しない");
    }

    // さいご まで（デバッグ フック で どうぐ を おく）
    await page.evaluate(() => PMTest.fast(12));
    let waves = 0;
    for (let guard = 0; guard < 20; guard++) {
      s = await st();
      if (s.phase === "done") break;
      if (s.phase === "prep") {
        await page.evaluate(() => PMTest.autoPlace());
        await page.click("#bGo");
        waves++;
        if (waves === 1) { await page.waitForTimeout(400); await shot("5-wave"); }
      }
      await page.waitForFunction(() => { const q = PMTest.state(); return q.phase !== "wave"; }, null, { timeout: 30000 });
    }
    await page.waitForSelector("#modal:not([hidden]) .result", { timeout: 5000 });
    s = await st();
    check(s.phase === "done" && waves === 3, `3 ウェーブ を さいご まで（のこり 🍙${s.bento}）`);
    check(await page.isVisible(".result .stars"), "パーティー の がめん が でる");
    await page.waitForTimeout(400);
    await shot("6-result");
    await noHScroll("けっか"); await noKanji("けっか");
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("picnic-mamoru-v1")));
    check(saved && saved.stars["1"] !== undefined, `ほし が ほぞん される（★${saved && saved.stars["1"]}）`);
    await page.click("#mBtns button:has-text('こうえん えらび')");
    check(await page.locator(".sbtn:not([disabled])").count() === 2, "つぎ の こうえん が えらべる ように なる");

    // じゆう モード
    await page.click(".bBack");
    await page.click("#bFree");
    await page.click('#fSeason .chip[data-v="winter"]');
    await page.click('#fPaths .chip[data-v="3"]');
    await page.click("#bFreeGo");
    s = await st();
    check(s.view === "game" && s.phase === "free" && s.coins === 999, "じゆう モード が はじまる");
    await page.evaluate(() => PMTest.fast(0));
    let cards = 0;
    for (const t of ["ant", "pigeon", "crow", "squirrel"]) {
      await page.click(`.spawn[data-spawn="${t}"]`);
      await page.waitForTimeout(150);
      if (await page.isVisible("#modal .card")) {   // はじめて の いきもの は まめちしき カード
        cards++;
        if (cards === 1) await shot("8-card");
        await noKanji("カード");
        await page.click("#mBtns button");
      }
    }
    check(cards === 3, `はじめて あう いきもの の カード が でる（${cards}）`);
    await page.waitForTimeout(1200);
    s = await st();
    check(s.cre >= 4, `ボタン で いきもの を よべる（${s.cre}）`);
    check(await inView('.spawn[data-spawn="squirrel"]'), "よぶ ボタン が がめん に おさまる");
    await page.evaluate(() => PMTest.autoPlace());
    await page.waitForTimeout(800);
    await shot("7-free");
    await noHScroll("じゆう モード"); await noKanji("じゆう モード");

    check(errs.length === 0, "JS エラー なし" + (errs.length ? "（" + errs.slice(0, 2).join(" / ") + "）" : ""));
    await page.close();
  }
  await browser.close();
  console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
  process.exit(fail ? 1 : 0);
})();
