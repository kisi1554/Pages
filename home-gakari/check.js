#!/usr/bin/env node
/* ブラウザ で うごかして みる:  node home-gakari/check.js [スクショ の だしさき]
 * 390×844（たて スマホ）・1024×768（よこ タブレット）・768×1024（たて タブレット）で、
 * タイトル → あそびかた・えき の しごと → れんしゅう（ひる）の でんしゃ 1ぽん を ほんとう の タップ・ドラッグ で さいご まで:
 *   はし の ひと → ドア が あく → あわてて あいず（まって！）→ ふさぐ ひと → スロープ を ドラッグ → まいご・おとしもの
 *   → はさまり・かけこみ → ゆびさし（まちがい → ただしく）→ ながおし で しゅっぱつ → けっか
 * 1にち の しごと（9ほん）を デバッグ フック で さいご まで → ★ の ほぞん。
 * ながおし で メニュー・ズーム が でない、れんだ・ピンチ で ズーム しない、よこスクロール なし、ルビ なし の かんじ なし、JS エラー なし。
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
    await page.addInitScript(() => {
      window.__menu = 0;
      document.addEventListener("contextmenu", (e) => { setTimeout(() => { if (!e.defaultPrevented) window.__menu++; }, 0); }, true);
      // よみあげ は テスト では しずか に
      try { if (window.speechSynthesis) window.speechSynthesis.speak = () => {}; } catch (e) { /* */ }
    });
    await page.goto(URL);
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* */ } });
    await page.reload();
    const shot = (n) => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
    const st = () => page.evaluate(() => HGTest.state());
    const zoom = () => page.evaluate(() => (window.visualViewport ? visualViewport.scale : 1));
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
    const inView = async (sel) => {
      const r = await page.locator(sel).first().boundingBox();
      return r && r.x >= -1 && r.y >= -1 && r.x + r.width <= vp.width + 1 && r.y + r.height <= vp.height + 1;
    };
    // うごいて いる ひと も タップ できる よう に、いま の ばしょ を タップ
    const tapEl = async (sel) => {
      const r = await page.locator(sel).first().boundingBox();
      if (!r) return false;
      const x = r.x + r.width / 2, y = r.y + r.height * 0.6;
      if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
      await page.waitForTimeout(60);
      return true;
    };
    const waitFor = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 20000 });
    // ながおし（タッチ なら ほんとう の タッチ で）
    const longPress = async (sel, ms) => {
      const r = await page.locator(sel).boundingBox();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      if (touch) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await page.waitForTimeout(ms);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await cdp.detach();
      } else {
        await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up();
      }
      await page.waitForTimeout(80);
    };

    // タイトル
    await shot("1-title");
    await noHScroll("タイトル"); await noKanji("タイトル");
    await page.click("#bHelp");
    check(await page.isVisible("#modal"), "あそびかた が ひらく");
    await noKanji("あそびかた");
    await page.click("#mBtns button");
    await page.click("#bZukan");
    check(await page.locator(".zitem").count() >= 8, `えき の しごと（${await page.locator(".zitem").count()} こ）`);
    await noKanji("えき の しごと");
    await shot("2-zukan");
    await page.click("#mBtns button");

    // れんしゅう: ひる（くるまいす・まいご・おとしもの が かならず いる）
    await page.click('.bOne[data-period="hiru"]');
    let s = await st();
    check(s.view === "game" && s.trains === 1, "れんしゅう（ひる・1ぽん）が はじまる");
    check(await inView("#sceneBox") && await inView("#bSig") && await inView('.pb[data-pt="clock"]') && await inView("#tRamp"), "ホーム・あいず・ゆびさし・スロープ が がめん に おさまる");
    const box = await page.locator("#sceneBox").boundingBox();
    check(box.width >= Math.min(vp.width, 700) * 0.9, `ホーム が じゅうぶん おおきい（${Math.round(box.width)}px）`);
    await page.evaluate(() => HGTest.fast(2));
    // はし の ひと
    for (let i = 0; i < 6; i++) {
      s = await st();
      if (!s.roles.includes("edge")) break;
      await tapEl(".pp.edge");
    }
    s = await st();
    check(!s.roles.includes("edge"), "はし の ひと を タップ → うちがわ へ さがる");
    await waitFor(() => HGTest.state().phase === "open");
    await shot("3-open");
    await noHScroll("ゲーム"); await noKanji("ゲーム");
    // あわてて あいず → まって！
    const m0 = (await st()).matte;
    await longPress("#bSig", 1100);
    s = await st();
    check(s.matte === m0 + 1 && s.phase === "open", "のりおり ちゅう に あいず → とまる");
    check(/まって/.test(await page.textContent("#msg")), `「${(await page.textContent("#msg")).trim()}」`);
    check(await page.evaluate(() => window.__menu) === 0, "ながおし で メニュー が でない");
    check(await zoom() <= 1.01, "ながおし で ズーム しない");
    // みじかく おす と「ながおし だよ」
    await tapEl("#bSig");
    check(/ながおし/.test(await page.textContent("#msg")) && (await st()).matte === m0 + 1, "みじかく おす と ながおし の おしらせ");

    // しごと を ぜんぶ ほんとう の そうさ で
    let dragged = false, lost = false, item = false, guard = 0;
    while (guard++ < 200) {
      s = await st();
      if (s.phase !== "open") break;
      const hz = s.hazards;
      if (s.roles.includes("block")) { await tapEl(".pp.block"); continue; }
      const wheelDoor = await page.evaluate(() => { const w = HGTest.game().people.find((p) => p.needRamp && p.role === "board"); return w ? w.door : -1; });
      if (wheelDoor >= 0 && s.ramp !== wheelDoor) {
        const from = await page.locator("#tRamp").boundingBox();
        const to = await page.evaluate((d) => HGTest.scenePoint(HomeGakari.DOORS[d], 150), wheelDoor);
        const fx = from.x + from.width / 2, fy = from.y + from.height / 2;
        await page.mouse.move(fx, fy); await page.mouse.down();
        for (let i = 1; i <= 10; i++) await page.mouse.move(fx + (to.x - fx) * i / 10, fy + (to.y - fy) * i / 10);
        if (!dragged) await shot("4-drag");
        await page.mouse.up();
        s = await st();
        dragged = s.ramp === wheelDoor;
        continue;
      }
      if (s.roles.includes("lost")) { await tapEl(".pp.lost"); lost = true; continue; }
      if (await page.locator(".it.lostitem").count()) { await tapEl(".it.lostitem"); item = true; continue; }
      if (s.roles.includes("runner")) { await tapEl(".pp.runner"); continue; }
      if (await page.locator(".it.stuck").count()) { await shot("5-stuck"); await tapEl(".it.stuck"); continue; }
      if (hz.length === 1 && hz[0] === "point") {
        const g = await page.evaluate(() => { const t = HGTest.game().tr; return (t.runnerAt < 0 || t.runnerSpawned) && !t.stuckPlan.length; });
        if (g) break;
      }
      await page.waitForTimeout(150);
    }
    check(dragged, "スロープ を ドラッグ で くるまいす の ドア に かけられる");
    check(lost && item, "まいご の こ・おとしもの を タップ で たすけられる");
    await waitFor(() => HGTest.state().ramp === -1);
    s = await st();
    check(s.helped === s.chances && s.chances === 3, `たすけた かず ${s.helped}/${s.chances}`);
    check(JSON.stringify(s.hazards) === '["point"]', "のこる の は ゆびさし かくにん だけ");
    // ゆびさし: まちがい → ただしく
    await page.click('.pb[data-pt="clock"]');
    check((await st()).point === 0 && /じゅん/.test(await page.textContent("#msg")), "とけい から だと「じゅん だよ」");
    for (const w of ["door", "signal", "clock"]) await page.click(`.pb[data-pt="${w}"]`);
    await page.waitForTimeout(100);
    s = await st();
    check(s.point === 3 && await page.locator(".pb.done").count() === 3, "ドア → しんごう → とけい で ✓ が 3つ");
    await shot("6-point");
    await longPress("#bSig", 1100);
    s = await st();
    check(s.phase === "melody" || s.phase === "closing", "ながおし で しゅっぱつ OK！");
    await page.waitForTimeout(400);
    await shot("7-depart");
    await waitFor(() => !document.querySelector("#modal").hidden && !!document.querySelector(".result"), null, 30000);
    const res = await page.textContent(".result .stars");
    // わざと 1かい「まって！」に した ので あんぜん の ★ は なし（ていじ・しんせつ は ★）
    check(res === "★★☆" && /まって/.test(await page.textContent(".result")), `けっか ${res}（あんぜん だけ ☆）`);
    await noKanji("けっか"); await noHScroll("けっか");
    let saved = await page.evaluate(() => JSON.parse(localStorage.getItem("home-gakari-v1")));
    check(saved && saved.best.hiru === 2, "れんしゅう の ★ が ほぞん される");
    await page.click("#mBtns button:has-text('タイトル')");

    // れんだ・ピンチ で ズーム しない
    await page.click("#bDay");
    await page.evaluate(() => HGTest.fast(1));
    const b2 = await page.locator("#sceneBox").boundingBox();
    const mid = { x: b2.x + b2.width / 2, y: b2.y + b2.height * 0.8 };
    if (touch) { for (let i = 0; i < 6; i++) await page.touchscreen.tap(mid.x, mid.y); }
    else await page.mouse.dblclick(mid.x, mid.y);
    await page.waitForTimeout(150);
    check(await zoom() === 1, "れんだ で ズーム しない");
    if (touch) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.synthesizePinchGesture", { x: Math.round(mid.x), y: Math.round(mid.y), scaleFactor: 2, relativeSpeed: 800, gestureSourceType: "touch" });
      await page.waitForTimeout(500);
      check(await zoom() <= 1.01, "ピンチ で ズーム しない");
    }

    // 1にち の しごと を さいご まで（デバッグ フック）
    await page.evaluate(() => HGTest.fast(6));
    let cards = 0;
    for (let i = 0; i < 2000; i++) {
      const q = await page.evaluate(() => {
        const c = document.querySelector("#card");
        const card = !c.hidden;
        if (card) c.click(); else HGTest.auto();
        return { card, done: !document.querySelector("#modal").hidden };
      });
      if (q.card) { cards++; if (cards === 1) await shot("8-period"); }
      if (q.done) break;
      if (i === 40) await shot("9-asa");
      await page.waitForTimeout(40);
    }
    await page.waitForSelector(".result", { timeout: 5000 });
    s = await st();
    check(s.done && s.trains === 9, "1にち（でんしゃ 9ほん）を さいご まで");
    check(cards === 2, `ひる・ゆうがた の おしらせ が でる（${cards}）`);
    await shot("10-result");
    saved = await page.evaluate(() => JSON.parse(localStorage.getItem("home-gakari-v1")));
    check(saved && saved.best.day !== undefined && saved.days === 1, `1にち の ★ が ほぞん される（${saved && saved.best.day}）`);
    await page.click("#mBtns button:has-text('タイトル')");
    check(/★/.test(await page.textContent("#bestDay")), "タイトル に さいこう の ★");

    check(errs.length === 0, "JS エラー なし" + (errs.length ? "（" + errs.slice(0, 2).join(" / ") + "）" : ""));
    await page.close();
  }
  await browser.close();
  console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
  process.exit(fail ? 1 : 0);
})();
