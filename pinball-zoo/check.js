#!/usr/bin/env node
/* ブラウザ で うごかして みる:  node pinball-zoo/check.js [スクショ の だしさき]
 * 3がめん（たて スマホ・よこ タブレット・よこ スマホ）で、
 *  - やさしい で はじめる → ばね を ひっぱって はなす（CDP タッチ）→ ボール が だい に でる
 *  - りょう フリッパー の どうじ タップ（CDP マルチタッチ）→ ２まい とも あがる → はなす と さがる
 *  - おなじ ところ を れんだ しても ズーム しない（visualViewport.scale が 1 の まま）
 *  - よる の だい・パレード の がめん も かく
 *  - JS エラー・よこスクロール が ない
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
const SCREENS = [
  ["phone", { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ["tablet", { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }],
  ["phone-land", { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }]
];

(async () => {
  const browser = await chromium.launch();
  for (const [tag, opt] of SCREENS) {
    const ctx = await browser.newContext(opt);
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await page.goto(URL);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", {
      type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: p[2] == null ? i : p[2], radiusX: 5, radiusY: 5, force: 1 }))
    });
    const st = () => page.evaluate(() => PZTest.state());
    const shot = (n) => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
    const noHScroll = async (where) => {
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      check(w[0] <= w[1] + 1, `${tag} ${where}: よこスクロール なし（${w[0]} ≦ ${w[1]}）`);
    };

    await shot("0-title"); await noHScroll("タイトル");
    await page.tap('.mode[data-mode="easy"]');
    await page.waitForTimeout(300);
    let s = await st();
    check(s && s.phase === "ready" && s.ready, `${tag} はじまった: ばね の うえ に ボール`);

    // だい の ばしょ
    const box = await page.locator("#cv").boundingBox();
    check(box.width > 150 && box.height > 260, `${tag} だい の おおきさ ${Math.round(box.width)}×${Math.round(box.height)}`);
    check(box.x >= 0 && box.x + box.width <= opt.viewport.width + 1 && box.y + box.height <= opt.viewport.height + 1, `${tag} だい が がめん に おさまる`);
    const sc = box.width / 400;
    const at = (x, y) => [box.x + x * sc, box.y + y * sc];

    // うちだし: レーン の あたり を した へ ひっぱって はなす
    const p0 = at(374, 600);
    await touch("touchStart", [p0]);
    for (let i = 1; i <= 6; i++) { await touch("touchMove", [[p0[0], p0[1] + i * 15 * sc]]); await page.waitForTimeout(40); }
    await page.waitForTimeout(200);
    const pulled = await page.evaluate(() => PZTest.game().pull);
    check(pulled > 0.3, `${tag} ばね を ひっぱった（${pulled.toFixed(2)}）`);
    await shot("1-pull");
    await touch("touchEnd", []);
    await page.waitForTimeout(900);
    s = await st();
    check(s.phase === "play" && s.live >= 1 && !s.ready, `${tag} うちだし: ボール が だい に でた（live ${s.live}）`);
    await shot("2-play"); await noHScroll("あそび");

    // りょう フリッパー どうじ（マルチタッチ）。ボール が おちて ばね に もどって いたら だい に だして おく
    await page.evaluate(() => { const g = PZTest.game(), b = g.readyBall(); if (b) { b.x = 200; b.y = 200; b.vy = 0; } });
    const L = at(90, 500), R = at(310, 500);
    await touch("touchStart", [L, R]);
    await page.waitForTimeout(120);
    s = await st();
    check(s.left && s.right, `${tag} りょうほう どうじ: ひだり ${s.left} / みぎ ${s.right}`);
    check(s.leftAngle < 0 && s.rightAngle > Math.PI, `${tag} フリッパー が うえ を むいた（${s.leftAngle.toFixed(2)} / ${s.rightAngle.toFixed(2)}）`);
    await shot("3-both");
    await touch("touchEnd", []);
    await page.waitForTimeout(150);
    s = await st();
    check(!s.left && !s.right, `${tag} はなす と ２まい とも さがる`);

    // ひだり を おした まま、あとから みぎ を おす（ゆび を 1ぽん ずつ）
    await touch("touchStart", [[L[0], L[1], 1]]);
    await page.waitForTimeout(80);
    s = await st();
    check(s.left && !s.right, `${tag} ひだり だけ おす と ひだり だけ あがる`);
    await touch("touchStart", [[L[0], L[1], 1], [R[0], R[1], 2]]);
    await page.waitForTimeout(80);
    s = await st();
    check(s.left && s.right, `${tag} ひだり を おした まま みぎ も おせる`);
    await touch("touchEnd", []);

    // れんだ で ズーム しない
    const w0 = await page.evaluate(() => [window.visualViewport.scale, window.innerWidth]);
    for (let i = 0; i < 14; i++) {
      const p = i % 2 ? L : at(200, 300);
      await touch("touchStart", [p]); await page.waitForTimeout(25); await touch("touchEnd", []); await page.waitForTimeout(45);
    }
    // ２ほん ゆび で ひろげる（ピンチ）
    await touch("touchStart", [at(170, 300), at(230, 300)]);
    for (let i = 1; i <= 5; i++) await touch("touchMove", [at(170 - i * 20, 300), at(230 + i * 20, 300)]);
    await touch("touchEnd", []);
    await page.waitForTimeout(300);
    const w1 = await page.evaluate(() => [window.visualViewport.scale, window.innerWidth]);
    check(w1[0] === 1 && w1[1] === w0[1], `${tag} れんだ・ピンチ で ズーム しない（scale ${w1[0]}）`);

    // キーボード
    await page.keyboard.down("ArrowLeft");
    s = await st();
    check(s.left, `${tag} ← キー で ひだり`);
    await page.keyboard.up("ArrowLeft");

    // よる の だい
    await page.evaluate(() => { const g = PZTest.game(); g.animals.forEach((a) => { a.hits = a.need - 1; g.hitAnimal(a.id, 200, 300); }); });
    await page.waitForTimeout(1200);
    s = await st();
    check(s.night, `${tag} 6しゅ おきた → よる`);
    check(await page.evaluate(() => document.getElementById("app").classList.contains("night")), `${tag} がめん も よる の いろ`);
    await shot("4-night"); await noHScroll("よる");

    // パレード
    await page.evaluate(() => { const g = PZTest.game(); g.nightAnimals.forEach((a) => { a.hits = a.need - 1; g.hitAnimal(a.id, 200, 300); }); });
    await page.waitForTimeout(2500);
    s = await st();
    check(s.phase === "parade", `${tag} パレード`);
    await shot("5-parade");

    // おしまい の がめん
    await page.waitForTimeout(5500);
    await page.evaluate(() => { const g = PZTest.game(); g.ballsLeft = 1; g.saverUntil = -1; g.world.balls.forEach((b) => { b.y = 800; b.rail = null; }); });
    await page.waitForSelector("#over:not([hidden])", { timeout: 4000 });
    const ov = await page.textContent("#overYomi");
    check(/てん$/.test(ov), `${tag} おしまい: ${ov}`);
    await shot("6-over"); await noHScroll("おしまい");
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("pinball-zoo-v1") || "{}"));
    check(saved.hi && saved.hi.easy > 0, `${tag} ハイスコア ほぞん ${saved.hi && saved.hi.easy}`);

    check(errs.length === 0, `${tag} JS エラー なし${errs.length ? "：" + errs.join(" / ") : ""}`);
    await ctx.close();
  }
  await browser.close();
  console.log(fail ? `\n✗ ${fail}こ しっぱい` : "\n✓ ぜんぶ OK");
  process.exit(fail ? 1 : 0);
})();
