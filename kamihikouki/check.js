#!/usr/bin/env node
/* ブラウザ で うごかして みる:  node kamihikouki/check.js [スクショ の だしさき]
 * 390×844（たて スマホ）・1024×768（よこ タブレット）・844×390（よこ スマホ）で、
 *  - えらぶ → おる（ゆび で なぞる）→ なげる（スワイプ）→ とぶ（おさえる）→ ちゃくち → もういちど
 *  - ながおし で メニュー が でない、れんだ で ズーム しない、JS エラー・はみだし が ない
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
  const screens = [["phone", { width: 390, height: 844 }, "heso"], ["tablet", { width: 1024, height: 768 }, "yari"], ["phone-yoko", { width: 844, height: 390 }, "tsubasa"]];
  for (const [tag, vp, plane] of screens) {
    console.log(`■ ${tag} ${vp.width}×${vp.height}（${plane}）`);
    const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: tag.startsWith("phone") });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await page.goto(URL);
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* */ } });
    await page.reload();
    await page.waitForTimeout(200);
    const shot = (n) => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
    const noH = async (where) => {
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth, document.documentElement.scrollHeight, window.innerHeight]);
      check(w[0] <= w[1] + 1 && w[2] <= w[3] + 1, `${where}: はみださない（${w[0]}×${w[2]} ≦ ${w[1]}×${w[3]}）`);
    };

    /* 1. えらぶ */
    await noH("えらぶ");
    await page.click(`[data-plane="${plane}"]`);
    await page.click('[data-color="1"]');
    await page.click('[data-pat="dots"]');
    await page.click('[data-sky="daily"]');
    const sel = await page.evaluate(() => ({ p: __kami.save.plane, c: __kami.save.color, pat: __kami.save.pat, sky: __kami.save.sky }));
    check(sel.p === plane && sel.c === 1 && sel.pat === "dots" && sel.sky === "daily", `えらべる（${JSON.stringify(sel)}）`);
    await shot("1-pick");

    /* 2. おる: やじるし の むき に ゆび で なぞる */
    await page.click("#goFold");
    await page.waitForTimeout(100);
    await noH("おる");
    await shot("2-fold");
    const n = await page.evaluate(() => __kami.Fo.STEPS[__kami.save.plane].length);
    for (let i = 0; i < n; i++) {
      const ar = await page.evaluate(() => {
        const k = window.__kami, st = k.Fo.STEPS[k.save.plane][k.fold.i];
        const a = k.Fo.flapArrow(k.fold.layers, st.folds[0]);
        const m = document.getElementById("foldSvg").getScreenCTM();
        const tp = (p) => { const q = new DOMPoint(p[0], p[1]).matrixTransform(m); return [q.x, q.y]; };
        const f = tp(a.from), t = tp(a.to);
        /* みじかい やじるし でも なぞれる よう に のばす */
        const dx = t[0] - f[0], dy = t[1] - f[1], L = Math.hypot(dx, dy), need = 140;
        const kk = L < need ? need / L : 1;
        return { x0: f[0], y0: f[1], x1: f[0] + dx * kk, y1: f[1] + dy * kk };
      });
      await page.mouse.move(ar.x0, ar.y0);
      await page.mouse.down();
      for (let k = 1; k <= 8; k++) await page.mouse.move(ar.x0 + (ar.x1 - ar.x0) * k / 8, ar.y0 + (ar.y1 - ar.y0) * k / 8);
      await page.mouse.up();
      await page.waitForTimeout(600);
      const fi = await page.evaluate(() => __kami.fold.i);
      check(fi === i + 1, `おる ${i + 1}/${n}: なぞって おれた`);
      if (i === 0) await shot("3-fold1");
    }
    check(await page.isVisible("#foldNext"), "できた！ → なげ に いく ボタン");
    await page.waitForTimeout(500);
    await shot("4-folded");

    /* 3. なげる（スワイプ） */
    await page.click("#foldNext");
    await page.waitForTimeout(200);
    await noH("とぶ");
    await shot("5-aim");
    /* ながおし（うごかさない）では なげない・メニュー も でない */
    const box = await page.locator("#sky").boundingBox();
    const cx = box.x + box.width * 0.35, cy = box.y + box.height * 0.6;
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up();
    check(await page.evaluate(() => __kami.fl.phase) === "aim", "ながおし だけ では なげない");
    const cm = await page.evaluate(() => {
      const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
      document.getElementById("sky").dispatchEvent(e);
      return e.defaultPrevented && getComputedStyle(document.body).userSelect === "none";
    });
    check(cm, "ながおし で メニュー が でない（contextmenu を とめる・もじ を えらばせない）");

    await page.evaluate(() => __kami.setSim(6));
    await page.mouse.move(cx - 60, cy + 40);
    await page.mouse.down();
    for (let k = 1; k <= 6; k++) { await page.mouse.move(cx - 60 + k * 25, cy + 40 - k * 22); await page.waitForTimeout(16); }
    await shot("6-swipe");
    await page.mouse.up();
    const th = await page.evaluate(() => ({ ph: __kami.fl.phase, vx: __kami.fl.s && __kami.fl.s.vx, vy: __kami.fl.s && __kami.fl.s.vy }));
    check(th.ph === "fly" && th.vx > 0 && th.vy > 0, `スワイプ で ななめ うえ に なげた（vx ${th.vx && th.vx.toFixed(1)}, vy ${th.vy && th.vy.toFixed(1)}）`);

    /* とんで いる あいだ おさえる → はな が うえ */
    await page.waitForTimeout(400);
    await page.mouse.down();
    await page.waitForTimeout(150);
    /* いま の じょうたい を 2つ に わけて、おさえた ほう が はな が あがる か くらべる */
    const hold = await page.evaluate(() => {
      const k = __kami, a = JSON.parse(JSON.stringify(k.fl.s)), b = JSON.parse(JSON.stringify(k.fl.s));
      a.hold = true; b.hold = false;
      const w = k.F.makeWorld(1, { calm: true });
      for (let i = 0; i < 20; i++) { k.F.step(a, 1 / 60, w); k.F.step(b, 1 / 60, w); }
      return { h: k.fl.s.hold, up: a.cl - b.cl };
    });
    await shot("7-fly");
    await page.mouse.up();
    check(hold.h && hold.up > 0, `おさえる と はな が あがる（CL の さ +${hold.up.toFixed(2)}）`);
    check(!(await page.evaluate(() => __kami.fl.s.hold)), "はなす と もどる");

    /* ちゃくち まで まつ */
    await page.waitForFunction(() => !document.getElementById("ovResult").hidden, null, { timeout: 60000 }).catch(() => {});
    const res = await page.evaluate(() => ({ vis: !document.getElementById("ovResult").hidden, d: __kami.F.distance(__kami.fl.s), txt: document.getElementById("rTitle").textContent, best: __kami.save.daily.best }));
    check(res.vis && /メートル！/.test(res.txt) && res.d > 0, `ちゃくち → 「${res.txt}」`);
    check(res.best === res.d, `きょう の きろく を ほぞん（${res.best}）`);
    await noH("けっか");
    await shot("8-result");

    /* もういちど（ぽいっ ボタン） */
    await page.click("#again");
    await page.waitForTimeout(100);
    check(await page.evaluate(() => __kami.fl.phase) === "aim", "もういちど → なげる まえ に もどる");
    await page.click("#easyThrow");
    check(await page.evaluate(() => __kami.fl.phase) === "fly", "🖐️ ぽいっ と なげる");
    await page.waitForTimeout(1500);
    await shot("9-fly2");

    /* れんだ で ズーム しない */
    for (let k = 0; k < 4; k++) await page.touchscreen.tap(cx, cy - 50);
    const sc = await page.evaluate(() => (window.visualViewport ? window.visualViewport.scale : 1));
    check(sc === 1, `れんだ で ズーム しない（scale ${sc}）`);

    /* ほぞん が よみもどせる */
    await page.reload();
    await page.waitForTimeout(200);
    const kept = await page.evaluate(() => ({ p: __kami.save.plane, d: __kami.save.daily.best }));
    check(kept.p === plane && kept.d === res.d, "リロード しても えらんだ ひこうき と きろく が のこる");

    check(errs.length === 0, "JS エラー なし" + (errs.length ? "：" + errs.join(" / ") : ""));
    await ctx.close();
  }
  await browser.close();
  console.log(fail ? `\n✗ ${fail} こ だめ` : "\n✓ ぜんぶ OK");
  process.exit(fail ? 1 : 0);
})();
