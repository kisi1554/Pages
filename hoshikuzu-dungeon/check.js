#!/usr/bin/env node
/* ブラウザで うごかして みる:  node hoshikuzu-dungeon/check.js [スクショの だしさき]
 * 390×844（たて スマホ）・1024×768（よこ タブレット）・768×1024（たて タブレット）で、
 * タイトル → はじめる → スワイプ・ボタン・キー で 1マス → タップ で じどう いどう →
 * デバッグ フック で 1かい を かいだん まで → 2かい に ついた を たしかめる。
 * よこスクロール なし、れんだ・ピンチ で ズームしない、ルビ なしの かんじ が ない、JS エラー なし。
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
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* */ } HDTest.fast(true); });
    const shot = (n) => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
    const st = () => page.evaluate(() => HDTest.state());
    const idle = () => page.waitForFunction(() => !HDTest.busy(), null, { timeout: 5000 });
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
      check(bad.length === 0, `${where}: ルビ なしの かんじ なし${bad.length ? "（" + bad.slice(0, 2).join(" / ") + "）" : ""}`);
    };
    const zoom = () => page.evaluate(() => (window.visualViewport ? visualViewport.scale : 1));
    const fits = async (sel) => {
      const r = await page.locator(sel).boundingBox();
      return r && r.x >= -1 && r.y >= -1 && r.x + r.width <= vp.width + 1 && r.y + r.height <= vp.height + 1;
    };

    // 0. タイトル
    await shot("0-title"); await noHScroll("タイトル"); await noKanji("タイトル");
    await page.click("#bHelp");
    await noKanji("あそびかた");
    await page.click("#ovlClose");
    await page.click("#bZukan");
    await noKanji("ずかん");
    await page.click("#ovlClose");

    // 1. はじめる（シード こてい で くらべやすく）
    await page.evaluate(() => HDTest.start(12));
    await idle();
    let s = await st();
    check(s.n === 1 && s.hearts === 3, "1かい から はじまる");
    check(await fits("#pad") && await fits("#bag") && await fits("#cv"), "じゅうじ ボタン・もちもの・がめん が はみださない");
    const padH = await page.locator('#pad [data-dir="up"]').boundingBox();
    check(padH.width >= 52 && padH.height >= 52, `じゅうじ ボタン が おおきい（${Math.round(padH.width)}px）`);
    await shot("1-start"); await noHScroll("ゲーム"); await noKanji("ゲーム");

    // 2. キー で 1マス
    const moved = async (how, fn) => {
      await idle();
      const d = await page.evaluate(() => HDTest.freeDir());
      const a = await st();
      await fn(d);
      await page.waitForTimeout(80); await idle();
      const b = await st();
      check(b.turn === a.turn + 1 && b.x === a.x + d[0] && b.y === a.y + d[1], `${how} で 1マス すすむ（${a.x},${a.y} → ${b.x},${b.y}）`);
    };
    const keyOf = (d) => (d[0] > 0 ? "ArrowRight" : d[0] < 0 ? "ArrowLeft" : d[1] > 0 ? "ArrowDown" : "ArrowUp");
    const btnOf = (d) => (d[0] > 0 ? "right" : d[0] < 0 ? "left" : d[1] > 0 ? "down" : "up");
    await moved("キー", (d) => page.keyboard.press(keyOf(d)));
    await moved("じゅうじ ボタン", async (d) => {
      const r = await page.locator(`#pad [data-dir="${btnOf(d)}"]`).boundingBox();
      if (touch) await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
      else await page.click(`#pad [data-dir="${btnOf(d)}"]`);
    });
    // スワイプ（タッチ は CDP、マウス は ドラッグ）
    await moved("スワイプ", async (d) => {
      const r = await page.locator("#cv").boundingBox();
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2, ex = cx + d[0] * 90, ey = cy + d[1] * 90;
      if (touch) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy, id: 1 }] });
        for (let i = 1; i <= 6; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx + (ex - cx) * i / 6, y: cy + (ey - cy) * i / 6, id: 1 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } else {
        await page.mouse.move(cx, cy); await page.mouse.down();
        await page.mouse.move(ex, ey, { steps: 6 }); await page.mouse.up();
      }
    });
    // まつ ボタン
    {
      await idle();
      const a = await st();
      await page.click('#pad [data-dir="wait"]');
      await idle();
      const b = await st();
      check(b.turn === a.turn + 1 && b.x === a.x && b.y === a.y, "まつ ボタン で その ばで 1て");
    }
    // タップ した マス へ じどう で あるく
    {
      await idle();
      const target = await page.evaluate(() => {
        const g = HDTest.game();
        for (let r = 4; r >= 2; r--) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) + Math.abs(dy) !== r) continue;
          const x = g.x + dx, y = g.y + dy;
          if (x < 0 || y < 0 || x >= HD.W || y >= HD.H) continue;
          const p = HD.planPath(g, x, y, true);
          if (p && p.length >= 2 && g.f.grid[HD.K(x, y)] === HD.T.FLOOR) return [x, y];
        }
        return null;
      });
      if (target) {
        const p = await page.evaluate(([x, y]) => HDTest.cellToScreen(x, y), target);
        if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
        await page.waitForFunction(() => !HDTest.state().auto && !HDTest.busy(), null, { timeout: 8000 });
        const b = await st();
        check(b.x === target[0] && b.y === target[1], `タップ した マス（${target}）まで じどう で あるく → ${b.x},${b.y}`);
      } else check(false, "タップ で あるける マス が みつからない");
    }

    // 3. れんだ で ズームしない（ボタン・がめん）
    if (touch) {
      const r = await page.locator('#pad [data-dir="wait"]').boundingBox();
      for (let i = 0; i < 8; i++) { await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(60); }
      const c = await page.locator("#cv").boundingBox();
      for (let i = 0; i < 6; i++) { await page.touchscreen.tap(c.x + 30, c.y + c.height - 30); await page.waitForTimeout(70); }
      check(await zoom() === 1, `れんだ しても ズームしない（scale ${await zoom()}）`);
      const cdp = await page.context().newCDPSession(page);
      const cx = c.x + c.width / 2, cy = c.y + c.height / 2;
      const pts = (d) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(30) });
      for (let d = 40; d <= 120; d += 20) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(d) });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(200);
      check(await zoom() === 1, "ピンチ しても ズームしない");
    }
    await page.waitForTimeout(300); await idle();

    // 4. デバッグ フック で 1かい を さいご まで
    {
      let guard = 0;
      while (guard++ < 1500) {
        s = await st();
        if (s.n >= 2) break;
        await page.evaluate(() => HDTest.autoStep());
        await page.waitForTimeout(5);
      }
      await page.waitForTimeout(200);
      s = await st();
      check(s.n === 2 && s.hearts === 3, `1かい の かいだん に ついて 2かい へ（${guard}て くらい、⭐${s.stars}）`);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("hoshikuzu-dungeon-v1")));
      check(saved && saved.run && saved.run.n === 2, "2かい の いりぐち が ほぞん された（つづきから で あそべる）");
      for (let i = 0; i < 6; i++) { await page.evaluate(() => HDTest.autoStep()); await page.waitForTimeout(15); }
      await page.waitForTimeout(300);
      await shot("2-floor2"); await noHScroll("2かい"); await noKanji("2かい");
    }
    // ちず を おおきく
    await page.click("#mini");
    await page.waitForTimeout(100);
    check(await fits("#mini"), "ちず を タップ → おおきく して も はみださない");
    await shot("3-map");
    await page.click("#mini");

    // 5. タイトル に もどる → つづきから
    await page.click("#bHome");
    check(await page.isVisible("#bCont"), "タイトル に「つづきから」が でる");
    await page.click("#bCont");
    s = await st();
    check(s && s.n === 2, "つづきから で 2かい から");

    check(errs.length === 0, "JS エラー なし" + (errs.length ? "（" + errs.slice(0, 3).join(" / ") + "）" : ""));
    await page.close();
  }
  await browser.close();
  console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
  process.exit(fail ? 1 : 0);
})();
