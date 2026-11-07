#!/usr/bin/env node
/* ブラウザ で うごかして みる:  node uchu-ichinichi/check.js [スクショ の だしさき]
 * 390×844（たて スマホ）・1024×768（よこ タブレット）・844×390（よこ スマホ）で、
 *  - スワイプ で ひこうし が すすむ、てすり で とまる、5つ の へや を まわって「いどう」クリア
 *  - あさ〜よる の ミッション を ひととおり（さいご に おつかれさま）
 *  - ちきゅう と くらべる・まめちしき カード・ほぞん
 *  - れんだ・ながおし で ズーム しない、JS エラー・よこスクロール が ない
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
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await page.goto(URL);
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* */ } });
    await page.reload();
    await page.waitForTimeout(300);
    const shot = (n) => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
    const noH = async (where) => {
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth, document.documentElement.scrollHeight, window.innerHeight]);
      check(w[0] <= w[1] + 1 && w[2] <= w[3] + 1, `${tag} ${where}: はみださない（${w[0]}×${w[2]} ≦ ${w[1]}×${w[3]}）`);
    };
    const st = () => page.evaluate(() => ({ x: __uchu.A.x, y: __uchu.A.y, vx: __uchu.A.vx, vy: __uchu.A.vy, room: __uchu.room(), done: __uchu.st.done }));
    const box = await page.locator("#stage").boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const swipe = async (dx, dy) => {
      await page.mouse.move(cx, cy); await page.mouse.down();
      await page.mouse.move(cx + dx / 2, cy + dy / 2, { steps: 3 });
      await page.mouse.move(cx + dx, cy + dy, { steps: 3 }); await page.mouse.up();
    };
    const visible = (sel) => page.locator(sel).isVisible();
    const clickBtn = async (re) => { await page.locator("#mCtl .btn", { hasText: re }).first().click(); };

    await shot("1-station"); await noH("ステーション");

    // 1. スワイプ で すすむ（かんせい）
    const s0 = await st();
    await swipe(120, 0);
    await page.waitForTimeout(400);
    const s1 = await st();
    check(s1.vx > 30 && s1.x > s0.x + 20, `${tag} スワイプ で みぎ へ すすむ（x ${s0.x.toFixed(0)} → ${s1.x.toFixed(0)}, vx ${s1.vx.toFixed(0)}）`);
    await page.waitForTimeout(400);
    const s2 = await st();
    check(s2.vx > s1.vx * 0.8, `${tag} ちから が ないと すすみ つづける（vx ${s1.vx.toFixed(0)} → ${s2.vx.toFixed(0)}）`);
    // へや を つぎつぎ に まわる（ハッチ を とおる）
    let guard = 0;
    while ((await st()).room < 4 && guard++ < 40) {
      const s = await st();
      if (Math.abs(s.vx) < 40) await swipe(140, (150 - s.y) * 0.6);
      await page.waitForTimeout(350);
    }
    const s3 = await st();
    check(s3.room === 4, `${tag} スワイプ だけ で 5ばんめ の へや まで いけた（へや ${s3.room}）`);
    await shot("2-mado-room");
    // てすり で とまる（ちかく まで ういて いって から つかむ）
    await page.evaluate(() => { __uchu.A.y = 90; __uchu.A.vx = 0; __uchu.A.vy = 0; });
    await page.click("#grabBtn");
    await page.waitForTimeout(100);
    const s4 = await st();
    check(s4.vx === 0 && s4.vy === 0, `${tag} ✋ つかまる で とまる`);
    check(s4.done.idou === true, `${tag} いどう ミッション クリア（5つ の へや ＋ つかまる）`);

    // 2. まど（はやおくり）
    await page.click("#missionBtn");
    check(await visible("#ovMission"), `${tag} まど の ミッション が ひらく`);
    await page.click("#fastBtn");
    await page.waitForSelector("#mCtl .btn:has-text('ミッション クリア')", { timeout: 15000 });
    await shot("3-mado"); await noH("まど");
    await clickBtn("ミッション クリア");
    await page.waitForTimeout(100);
    check((await st()).done.mado === true, `${tag} まど: ひので 2かい ＋ にほん → クリア`);
    await clickBtn("もどる");

    // 3. あさ
    await page.evaluate(() => __uchu.teleport(0));
    await page.waitForTimeout(200);
    check((await page.textContent("#missionBtn")).includes("おきる"), `${tag} ねむる へや で「あさ」の ボタン`);
    // よる は まだ ダメ（ほか が のこって いる）… あさ を やる
    await page.click("#missionBtn");
    for (let i = 0; i < 4; i++) await clickBtn("ジッパー");
    await page.waitForTimeout(700);
    await shot("4-asa");
    for (let i = 0; i < 5; i++) await clickBtn("ごしごし");
    await page.waitForTimeout(600);
    // タオル は ゆび で なでる（ドラッグ）
    const ab = await page.locator("#mArt svg").boundingBox();
    await page.mouse.move(ab.x + ab.width * 0.35, ab.y + ab.height * 0.45); await page.mouse.down();
    for (let k = 0; k < 12; k++) await page.mouse.move(ab.x + ab.width * (k % 2 ? 0.62 : 0.38), ab.y + ab.height * 0.45, { steps: 4 });
    await page.mouse.up();
    for (let i = 0; i < 4 && !(await st()).done.asa; i++) { await clickBtn("ふきふき").catch(() => {}); await page.waitForTimeout(150); }
    await page.waitForTimeout(500);
    check((await st()).done.asa === true, `${tag} あさ: ジッパー → はみがき → タオル で クリア`);
    await clickBtn("もどる");

    // 4. あさごはん: スプーン を つかまえる
    await page.evaluate(() => __uchu.teleport(1));
    await page.waitForTimeout(200);
    await page.click("#missionBtn");
    for (let i = 0; i < 3; i++) await clickBtn("おゆ");
    await page.waitForSelector(".spoon", { timeout: 3000 });
    await page.waitForTimeout(500);
    await shot("5-spoon");
    const sp1 = await page.locator(".spoon").boundingBox();
    await page.waitForTimeout(300);
    const sp2 = await page.locator(".spoon").boundingBox();
    check(Math.hypot(sp2.x - sp1.x, sp2.y - sp1.y) > 2, `${tag} てを はなした スプーン が ただよう`);
    for (let i = 0; i < 5 && !(await st()).done.gohan; i++) {
      const b = await page.locator(".spoon").boundingBox();
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(900);
    }
    check((await st()).done.gohan === true, `${tag} あさごはん: スプーン を つかまえて クリア`);
    await clickBtn("もどる");

    // 5. じっけん
    await page.evaluate(() => __uchu.teleport(2));
    await page.waitForTimeout(200);
    await page.click("#missionBtn");
    const hb = page.locator("#mCtl .btn", { hasText: "みず を だす" });
    const hbb = await hb.boundingBox();
    await page.mouse.move(hbb.x + hbb.width / 2, hbb.y + hbb.height / 2); await page.mouse.down();
    await page.waitForTimeout(2000); await page.mouse.up();
    await page.waitForSelector("#mCtl .btn:has-text('つつく')", { timeout: 4000 });
    const ballBefore = await page.locator("#mArt path").nth(1).getAttribute("d");
    const art = await page.locator("#mArt svg").boundingBox();
    await page.mouse.click(art.x + art.width * 0.45, art.y + art.height * 0.47);
    await page.waitForTimeout(120);
    const ballAfter = await page.locator("#mArt path").nth(1).getAttribute("d");
    check(ballBefore !== ballAfter, `${tag} みず の たま を つつく と かたち が かわる`);
    await shot("6-mizutama");
    await clickBtn("つつく"); await clickBtn("つつく");
    await page.waitForSelector("#mCtl .btn:has-text('ひ を つける')", { timeout: 4000 });
    await clickBtn("ひ を つける");
    await clickBtn("つぎ の じっけん");
    for (let i = 0; i < 3; i++) await clickBtn("ひかり");
    await page.waitForTimeout(2200);
    check((await st()).done.jikken === true, `${tag} じっけん: みず の たま → ほのお → しょくぶつ で クリア`);
    await clickBtn("もどる");

    // 6. うんどう（こうご に）
    await page.evaluate(() => __uchu.teleport(3));
    await page.waitForTimeout(200);
    await page.click("#missionBtn");
    await clickBtn("ひだり"); await clickBtn("ひだり");
    check((await page.textContent("#mText")).includes("こうご"), `${tag} うんどう: おなじ あし 2かい だと「こうご に」`);
    for (let i = 0; i < 16; i++) await clickBtn(i % 2 ? "ひだり" : "みぎ");
    await page.waitForTimeout(1400);
    await shot("7-undou");
    check((await st()).done.undou === true, `${tag} うんどう: 120ぷん はしって クリア`);
    await clickBtn("もどる");

    // 7. よる → おつかれさま
    await page.evaluate(() => __uchu.teleport(0));
    await page.waitForTimeout(200);
    check((await page.textContent("#missionBtn")).includes("ねる"), `${tag} あさ の あと は「よる」の ボタン`);
    await page.click("#missionBtn");
    await clickBtn("ねぶくろ に はいる");
    await clickBtn("おやすみ");
    await page.waitForTimeout(1900);
    check((await st()).done.yoru === true, `${tag} よる: ねぶくろ で ねて クリア`);
    await clickBtn("おつかれさま");
    check(await visible("#ovEnd"), `${tag} ぜんぶ おわる と「おつかれさま！」`);
    await shot("8-end"); await noH("おつかれさま");
    await page.click("#endCards");
    const nCard = await page.locator(".kcard:not(.no)").count();
    check(nCard === 10, `${tag} ミッション で カード 10まい（${nCard}）`);
    await page.locator("#ovCards [data-close]").click();

    // かくれた「？」: トイレ
    await page.evaluate(() => __uchu.teleport(0));
    await page.waitForTimeout(800);
    const hot = await page.locator('.hot[data-card="toire"]').boundingBox();
    await page.mouse.click(hot.x + hot.width / 2, hot.y + hot.height / 2);
    await page.waitForTimeout(200);
    check((await page.textContent("#cardDetail")).includes("すいこむ"), `${tag} トイレ を タップ すると まめちしき`);
    await shot("9-cards"); await noH("カード");
    await page.locator("#ovCards [data-close]").click();

    // ちきゅう と くらべる
    await page.click("#compareBtn");
    await page.click("#cmpGo");
    await page.waitForTimeout(1500);
    await shot("10-compare"); await noH("くらべる");
    await page.click('.tab[data-exp="ball"]');
    await page.click("#cmpGo");
    await page.waitForTimeout(1500);
    const ys = await page.evaluate(() => ["cmpSpace", "cmpEarth"].map((id) => {
      const g = document.querySelector(`#${id} g`); const m = /translate\(([\d.]+) ([\d.]+)\)/.exec(g.getAttribute("transform")); return +m[2];
    }));
    check(ys[0] < 80 && ys[1] > 150, `${tag} ボール: うちゅう は うく（y ${ys[0].toFixed(0)}）、ちきゅう は おちる（y ${ys[1].toFixed(0)}）`);
    await page.locator("#ovCompare [data-close]").click();

    // ほぞん
    await page.reload();
    await page.waitForTimeout(300);
    const saved = await page.evaluate(() => Object.keys(__uchu.st.done).length + "/" + Object.keys(__uchu.st.cards).length);
    check(saved === "7/11", `${tag} よみこみ なおしても のこる（ミッション/カード ${saved}）`);

    // れんだ・ながおし で ズーム しない
    const hb2 = await page.locator(".hint").boundingBox();
    for (let i = 0; i < 12; i++) await page.touchscreen.tap(hb2.x + 20, hb2.y + 8);
    await page.mouse.move(hb2.x + 20, hb2.y + 8); await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up();
    await page.waitForTimeout(300);
    const sc = await page.evaluate(() => (window.visualViewport ? window.visualViewport.scale : 1));
    check(sc <= 1.01, `${tag} れんだ・ながおし しても ズーム しない（scale ${sc}）`);
    const vpm = await page.getAttribute('meta[name="viewport"]', "content");
    check(/user-scalable=no/.test(vpm), `${tag} viewport: ${vpm}`);

    check(errs.length === 0, `${tag} JS エラー なし${errs.length ? "（" + errs.slice(0, 3).join(" / ") + "）" : ""}`);
    await ctx.close();
  }
  await browser.close();
  console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
  process.exit(fail ? 1 : 0);
})();
