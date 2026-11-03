#!/usr/bin/env node
/* ブラウザで うごかして みる:  node yubin-haitatsu/check.js [スクショの だしさき]
 * 390×844（たて スマホ）・1024×768（よこ タブレット）・768×1024（たて タブレット）で、
 * しわけ → 3つう はいたつ → ゆうびんきょく に もどって おわり → クイズ → てがみを かこう を まわる。
 * ちずが はみださない、ピンチで ブラウザが ズームしない、ルビ なしの かんじが ない、JS エラー なし を たしかめる。
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
    const touch = tag !== "tablet";
    const page = await browser.newPage({ viewport: vp, hasTouch: touch });
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await page.goto(URL);
    await page.evaluate(() => YHTest.fast(true));
    const shot = (n) => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
    const noHScroll = async (where) => {
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      check(w[0] <= w[1] + 1, `${tag} ${where}: よこスクロール なし（${w[0]} ≦ ${w[1]}）`);
    };
    const noKanji = async (where) => {
      const bad = await page.evaluate(() => {
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const out = [];
        for (let n; (n = walk.nextNode());) {
          if (n.parentElement.closest("ruby, script, style")) continue;
          if (/[一-鿿]/.test(n.textContent)) out.push(n.textContent.trim());
        }
        return out;
      });
      check(bad.length === 0, `${tag} ${where}: ルビ なしの かんじ なし${bad.length ? "（" + bad.slice(0, 2).join(" / ") + "）" : ""}`);
    };
    const tapCell = async (fn, x, y) => {
      const p = await page.evaluate(([f, x, y]) => YHTest[f](x, y), [fn, x, y]);
      if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
    };
    const waitIdleAt = (x, y) => page.waitForFunction(([x, y]) => { const s = YHTest.state(); return s && !s.moving && s.bike.x === x && s.bike.y === y; }, [x, y], { timeout: 8000 });

    // 0. ホーム
    await shot("0-home"); await noHScroll("ホーム"); await noKanji("ホーム");

    // 1. しわけ
    await page.click('.mode[data-go="day"]');
    await page.waitForSelector("#vSort:not([hidden])");
    let st = await page.evaluate(() => YHTest.state());
    check(st.letters.length === 3, `${tag} 1にちめ: てがみ 3つう`);
    await shot("1-sort"); await noHScroll("しわけ");
    // まちがった ポケットは はいらない
    const L0 = st.letters[0];
    const wrongCh = L0.chome % 4 + 1;
    await page.click(`#sortBag .letter[data-id="${L0.id}"]`);
    await page.click(`.pocket[data-ch="${wrongCh}"]`);
    st = await page.evaluate(() => YHTest.state());
    check(!st.letters[0].pocket, `${tag} しわけ: ちがう ポケットには はいらない`);
    await page.click(`.pocket[data-ch="${L0.chome}"]`);
    // 2つめは マウスで ドラッグ
    const L1 = st.letters[1];
    const a = await page.locator(`#sortBag .letter[data-id="${L1.id}"]`).boundingBox();
    const b = await page.locator(`.pocket[data-ch="${L1.chome}"]`).boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(a.x + 40, a.y + 30, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
    // のこりは タップ
    for (const L of st.letters.slice(2)) {
      await page.click(`#sortBag .letter[data-id="${L.id}"]`);
      await page.click(`.pocket[data-ch="${L.chome}"]`);
    }
    st = await page.evaluate(() => YHTest.state());
    check(st.letters.every((l) => l.pocket === l.chome), `${tag} しわけ: ドラッグ と タップで ぜんぶ ポケットへ`);
    check(await page.isEnabled("#goBtn"), `${tag} しゅっぱつ ボタンが おせる`);
    await page.click("#goBtn");
    await page.waitForSelector("#vMap:not([hidden])");

    // 2. ちずが はみださない
    const fit = await page.evaluate(() => {
      const r = document.getElementById("map").getBoundingClientRect();
      const t = document.querySelector("#map > g").getBoundingClientRect();
      return { r: [r.left, r.top, r.right, r.bottom], t: [t.left, t.top, t.right, t.bottom], vw: innerWidth, vh: innerHeight };
    });
    check(fit.r[0] >= 0 && fit.r[2] <= fit.vw + 1 && fit.r[3] <= fit.vh + 1, `${tag} ちずの わくが がめんに おさまる`);
    check(fit.t[0] >= fit.r[0] - 1 && fit.t[2] <= fit.r[2] + 1 && fit.t[1] >= fit.r[1] - 1 && fit.t[3] <= fit.r[3] + 1, `${tag} まち ぜんたいが ちずの わくに おさまる`);
    await shot("2-map"); await noHScroll("はいたつ"); await noKanji("はいたつ");

    // なぞって すすむ（バイクから みちに そって 2マス）
    st = await page.evaluate(() => YHTest.state());
    const o = st.office.door;
    const dir = await page.evaluate(([x, y]) => { for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (YHTown.isRoad(YHTown.make(YHTest.state().town), x + dx * 2, y + dy * 2) && YHTown.isRoad(YHTown.make(YHTest.state().town), x + dx, y + dy)) return [dx, dy]; }, [o.x, o.y]);
    const p0 = await page.evaluate(([x, y]) => YHTest.cellToScreen(x, y), [o.x, o.y]);
    const p2 = await page.evaluate(([x, y]) => YHTest.cellToScreen(x, y), [o.x + dir[0] * 2, o.y + dir[1] * 2]);
    await page.mouse.move(p0.x, p0.y); await page.mouse.down();
    await page.mouse.move(p2.x, p2.y, { steps: 10 }); await page.mouse.up();
    await waitIdleAt(o.x + dir[0] * 2, o.y + dir[1] * 2);
    st = await page.evaluate(() => YHTest.state());
    check(st.steps === 2, `${tag} なぞって 2マス すすんだ（${st.steps}）`);

    // ちがう いえに いれると ヒント
    let tried = false;
    for (const L of st.letters) {
      await tapCell("cellToScreen", L.door.x, L.door.y);
      await waitIdleAt(L.door.x, L.door.y);
      await page.waitForSelector("#panel:not([hidden])");
      if (!tried) {
        const other = await page.evaluate((h) => [...document.querySelectorAll(".post")].map((p) => +p.dataset.h).find((x) => x !== h), L.house);
        if (other !== undefined) {
          await page.click(`#tray .letter[data-id="${L.id}"]`);
          await page.click(`.post[data-h="${other}"]`);
          const tx = await page.textContent("#toast");
          check(/となり|ちがう/.test(tx), `${tag} ちがう いえ: 「${tx}」`);
          tried = true;
          await page.click(`#tray .letter[data-id="${L.id}"]`); // えらびなおし（いったん はずす）
        }
      }
      if (L.kind === "kozutsumi") { await page.click(`.chime[data-chime="${L.house}"]`); await page.waitForSelector(`.post.hand[data-h="${L.house}"]`); }
      const sel = await page.locator("#tray .letter.sel").count();
      if (!sel) await page.click(`#tray .letter[data-id="${L.id}"]`);
      await page.click(`.post[data-h="${L.house}"]`);
    }
    st = await page.evaluate(() => YHTest.state());
    check(st.letters.every((l) => l.done), `${tag} 3つう ぜんぶ とどけた`);
    await shot("3-delivered");

    // ピンチ（スマホだけ）: アプリの ちずは おおきく なり、ブラウザは ズームしない
    if (touch) {
      const r = await page.locator("#map").boundingBox();
      const cdp = await page.context().newCDPSession(page);
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      const pts = (d) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(30) });
      for (let d = 40; d <= 140; d += 20) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(d) });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      const z = await page.evaluate(() => [YHTest.zoom(), window.visualViewport ? window.visualViewport.scale : 1]);
      check(z[0] > 1.5, `${tag} ピンチで ちずが おおきく なる（×${z[0].toFixed(2)}）`);
      check(z[1] === 1, `${tag} ピンチで ブラウザは ズームしない（scale ${z[1]}）`);
      await shot("3b-pinch");
      await page.click("#zoomOut"); await page.click("#zoomOut"); await page.click("#zoomOut"); await page.click("#zoomOut");
    }

    // ゆうびんきょく に もどる → おわり
    await tapCell("cellToScreen", st.office.x, st.office.y);
    await page.waitForSelector("#vResult:not([hidden])", { timeout: 8000 });
    const best = +(await page.textContent("#resBest")), mine = +(await page.textContent("#resDist"));
    check(best > 0 && mine >= best, `${tag} おわり: きみ ${mine}マス ≧ さいたん ${best}マス`);
    check(await page.locator("#resOrder li").count() === 4, `${tag} おわり: さいたん じゅんばん 3つう＋もどる`);
    await page.waitForTimeout(400);
    await shot("4-result"); await noHScroll("おわり"); await noKanji("おわり");
    const sv = await page.evaluate(() => YHTest.save());
    check(sv.day === 2 && sv.best[1], `${tag} ほぞん: つぎは 2にちめ`);

    // 3. クイズ
    await page.click("#backBtn");
    await page.click('.mode[data-go="quiz"]');
    await page.waitForSelector("#vQuiz:not([hidden])");
    let q = await page.evaluate(() => YHTest.quiz());
    check(q.type === "where", `${tag} クイズ 1もんめ: 「${q.ans.text}」は どこ？`);
    await tapCell("qCellToScreen", q.ans.x, q.ans.y);
    check(await page.textContent("#qScore") === "1", `${tag} クイズ: いえを タップして せいかい`);
    await page.waitForFunction(() => YHTest.quiz().type === "which", null, { timeout: 4000 });
    q = await page.evaluate(() => YHTest.quiz());
    await page.click(`.choice:text-is("${q.ans.text}")`);
    check(await page.textContent("#qScore") === "2", `${tag} クイズ: じゅうしょを えらんで せいかい`);
    await shot("5-quiz"); await noHScroll("クイズ"); await noKanji("クイズ");

    // 4. てがみを かこう
    await page.click("#backBtn");
    await page.click('.mode[data-go="write"]');
    await page.click("#wWho button >> nth=1");
    const h0 = await page.evaluate(() => { const t = YHTown.make(0); return t.houses[5]; });
    await tapCell("wCellToScreen", h0.x, h0.y);
    check(!(await page.isDisabled("#wPickBtn")), `${tag} かく: いえを えらべた`);
    await page.click("#wPickBtn");
    const fs16 = await page.evaluate(() => ["zip1", "zip2", "wBody"].map((id) => parseFloat(getComputedStyle(document.getElementById(id)).fontSize)));
    check(fs16.every((f) => f >= 16), `${tag} かく: にゅうりょくらんの もじは 16px いじょう（${fs16.join(",")}）`);
    await page.fill("#zip1", "512"); await page.fill("#zip2", "0109");
    await page.fill("#wBody", "げんき？ こんど あそびに いくね");
    await page.click("#wSendBtn");
    check(await page.isVisible("#wErr"), `${tag} かく: ゆうびんばんごうが ちがうと おしえる`);
    await page.fill("#zip2", "010" + h0.chome);
    await shot("6-write"); await noHScroll("かく"); await noKanji("かく");
    await page.click("#wSendBtn");
    await page.waitForSelector("#vMap:not([hidden])");
    await tapCell("cellToScreen", h0.x, h0.y);
    await waitIdleAt(h0.door.x, h0.door.y);
    await page.click("#tray .letter");
    await page.click(`.post[data-h="${h0.id}"]`);
    await page.waitForSelector("#vWrite:not([hidden])", { timeout: 4000 });
    check(await page.locator("#wList .wcard").count() === 1, `${tag} かく: とどけた てがみが のこる`);
    await shot("7-written");

    // ズーム: いつも 1
    const sc = await page.evaluate(() => (window.visualViewport ? window.visualViewport.scale : 1));
    check(sc === 1, `${tag} さいごまで ブラウザの ズームは 1`);
    check(errs.length === 0, `${tag} JS エラー なし${errs.length ? "（" + errs.slice(0, 2).join(" / ") + "）" : ""}`);
    await page.close();
  }
  await browser.close();
  console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
