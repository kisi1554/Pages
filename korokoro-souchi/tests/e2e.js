// NODE_PATH=$(npm root -g) node korokoro-souchi/tests/e2e.js [スクショの でぐち]
// Playwright（Chromium）で スマホたて（390×844）・タブレットよこ（1024×768）を うごかして スクショを とる
const { chromium } = require("playwright");
const path = require("path");
const out = process.argv[2] || path.join(__dirname, "shots");
const url = "file://" + path.resolve(__dirname, "../index.html");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  let failed = 0;
  const check = (ok, msg) => { if (!ok) { failed++; console.log("NG", msg); } else console.log("ok", msg); };
  for (const [tag, vp] of [["phone", { width: 390, height: 844 }], ["tablet", { width: 1024, height: 768 }]]) {
    const page = await browser.newPage({ viewport: vp, hasTouch: true });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const inView = async (where, sel) => {
      const r = await page.evaluate((s) => { const e = document.querySelector(s).getBoundingClientRect(); return [e.top, e.bottom, e.left, e.right]; }, sel);
      check(r[1] <= vp.height + 1 && r[0] >= 0 && r[2] >= 0 && r[3] <= vp.width + 1, `${tag} ${where}: ${sel} が がめんに おさまる (${r.map(Math.round)})`);
    };
    const noHScroll = async (where) => {
      const bw = await page.evaluate(() => document.documentElement.scrollWidth);
      check(bw <= vp.width, `${tag} ${where}: よこに はみださない (${bw})`);
    };

    // ホーム
    check((await page.locator(".stage-btn").count()) === 70, `${tag}: ステージが 70こ`);
    check((await page.locator(".stage-btn.lock").count()) === 66, `${tag}: はじめは 4コースの 1ばんめ だけ ひらいている`);
    check((await page.locator(".stage-btn").first().getAttribute("data-i")) === "30", `${tag}: やさしい コースが いちばん うえ`);
    await noHScroll("ホーム");
    await page.screenshot({ path: path.join(out, `${tag}-home.png`) });

    // ステージ 1: どうぐばこから てつだまを えらんで タップで おく
    await page.locator('.stage-btn[data-i="0"]').click();
    await page.waitForTimeout(200);
    await inView("ステージ1", "#stageBox");
    await inView("ステージ1", "#goBtn");
    await inView("ステージ1", "#toolbox .tool");
    await noHScroll("ステージ1");
    let at;
    const measure = async () => {
      const b = await page.locator("#cv").boundingBox();
      const s = Math.min((b.width - 12) / 1200, (b.height - 12) / 800);
      const ox = b.x + (b.width - 1200 * s) / 2, oy = b.y + (b.height - 800 * s) / 2;
      at = (x, y) => [ox + x * s, oy + y * s];
    };
    await measure();
    await page.locator("#toolbox .tool").first().click();
    await page.mouse.click(...at(150, 180));
    await page.waitForTimeout(100);
    let lay = await page.evaluate(() => window.KoroApp.getLayout().filter((p) => !p.f));
    check(lay.length === 1 && lay[0].t === "steel", `${tag}: タップで てつだまを おけた`);
    check((await page.locator("#toolbox .tool .cnt").first().textContent()) === "0", `${tag}: のこりが 0 に なる`);
    // ドラッグで うごかす
    await page.mouse.move(...at(150, 180)); await page.mouse.down();
    await page.mouse.move(...at(190, 170), { steps: 6 }); await page.mouse.up();
    lay = await page.evaluate(() => window.KoroApp.getLayout().filter((p) => !p.f));
    check(Math.abs(lay[0].x - 190) <= 5, `${tag}: ドラッグで うごいた (x=${lay[0].x})`);
    await page.screenshot({ path: path.join(out, `${tag}-stage1-edit.png`) });
    await page.click("#goBtn");
    await page.waitForFunction(() => window.KoroApp.bell(), null, { timeout: 8000 }).catch(() => {});
    check(await page.evaluate(() => window.KoroApp.bell()), `${tag}: ステージ1 ベルが なった`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `${tag}-stage1-bell.png`) });
    await page.waitForSelector("#clearBox:not([hidden])", { timeout: 4000 }).catch(() => {});
    check(await page.isVisible("#clearBox"), `${tag}: クリア がめん`);
    await page.screenshot({ path: path.join(out, `${tag}-stage1-clear.png`) });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("korokoro-souchi-v1")).cleared);
    check(saved && saved[0] === true, `${tag}: しんちょくを ほぞん`);
    await page.click("#nextBtn");
    await page.waitForTimeout(200);
    check((await page.locator("#stageNo").textContent()).startsWith("コース1 2"), `${tag}: つぎの ステージへ`);

    // やさしい コース 1: ゴールの おとを ニャーン に して、さかに てつだまを おく
    await page.evaluate(() => window.KoroApp.showHome());
    await page.click("#goalBtn");
    await page.waitForTimeout(150);
    check((await page.locator(".goal-opt").count()) >= 10, `${tag}: ゴールの おとが 10しゅるい いじょう`);
    await page.screenshot({ path: path.join(out, `${tag}-goal-sounds.png`) });
    await page.locator(".goal-opt", { hasText: "ニャーン" }).click();
    await page.click("#goalClose");
    check(await page.evaluate(() => JSON.parse(localStorage.getItem("korokoro-souchi-v1")).goal === "nyan"), `${tag}: ゴールの おとを ほぞん`);
    await page.locator('.stage-btn[data-i="30"]').click();
    await page.waitForTimeout(200);
    await measure();
    check((await page.locator("#stageNo").textContent()).startsWith("やさしい 1"), `${tag}: やさしい 1`);
    await page.locator("#toolbox .tool").first().click();
    await page.mouse.click(...at(300, 200));
    await page.click("#goBtn");
    await page.waitForFunction(() => window.KoroApp.bell(), null, { timeout: 8000 }).catch(() => {});
    check(await page.evaluate(() => window.KoroApp.bell()), `${tag}: やさしい 1 ベルが なった`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, `${tag}-easy1-bell.png`) });
    await page.waitForSelector("#clearBox:not([hidden])", { timeout: 4000 }).catch(() => {});
    check((await page.locator("#clearIcon").textContent()) === "🐱", `${tag}: クリアがめんに ニャーンの えもじ`);
    await page.click("#nextBtn");
    await page.waitForTimeout(200);
    check((await page.locator("#stageNo").textContent()).startsWith("やさしい 2"), `${tag}: やさしい コースの つぎへ`);
    await page.screenshot({ path: path.join(out, `${tag}-easy2-edit.png`) });

    // ステージ 15 を こたえの はいちで うごかす（えの かくにん）
    await page.evaluate(() => { window.KoroApp.openStage(14); window.KoroApp.placeSolution(); });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(out, `${tag}-stage15-edit.png`) });
    await page.evaluate(() => window.KoroApp.start());
    await page.waitForTimeout(4500);
    await page.screenshot({ path: path.join(out, `${tag}-stage15-run.png`) });
    await page.waitForFunction(() => window.KoroApp.bell(), null, { timeout: 12000 }).catch(() => {});
    check(await page.evaluate(() => window.KoroApp.bell()), `${tag}: ステージ15 ベルが なった`);
    await page.click("#againBtn").catch(() => {});

    // もっと ステージ: 26（シーソー）と 30（バケツ → とびら → シーソー）を こたえで うごかす
    for (const n of [26, 30, 62, 65, 70]) {
      await page.evaluate((i) => { window.KoroApp.openStage(i); window.KoroApp.placeSolution(); }, n - 1);
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(out, `${tag}-stage${n}-edit.png`) });
      await page.evaluate(() => window.KoroApp.start());
      await page.waitForFunction(() => window.KoroApp.bell(), null, { timeout: 15000 }).catch(() => {});
      await page.screenshot({ path: path.join(out, `${tag}-stage${n}-run.png`) });
      check(await page.evaluate(() => window.KoroApp.bell()), `${tag}: ステージ${n} ベルが なった`);
      await page.click("#againBtn").catch(() => {});
    }

    // じゆう モード: ほぞん スロット
    await page.evaluate(() => window.KoroApp.showHome());
    await page.click("#freeBtn");
    await page.waitForTimeout(200);
    check((await page.locator("#toolbox .tool").count()) === 12, `${tag}: じゆう モードは ぶひん 12しゅるい`);
    await measure();
    await page.locator("#toolbox .tool").nth(5).click();          // ドミノ
    await page.mouse.click(...at(700, 720));
    await page.screenshot({ path: path.join(out, `${tag}-free.png`) });
    await page.click("#slotBtn");
    await page.locator(".slot .pill.primary").first().click();
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, `${tag}-slots.png`) });
    const slots = await page.evaluate(() => JSON.parse(localStorage.getItem("korokoro-souchi-v1")).slots);
    check(slots.length === 5 && Array.isArray(slots[0]) && slots[0].some((p) => p.t === "domino"), `${tag}: スロット1 に ほぞん`);
    await page.click("#slotClose");

    // おと オフ
    await page.click("#soundBtn");
    check((await page.getAttribute("#soundBtn", "aria-pressed")) === "false", `${tag}: おと オフ`);

    check(errors.length === 0, `${tag}: エラーなし ${errors.join(" / ")}`);
    await page.close();
  }
  await browser.close();
  console.log(failed ? `${failed} NG` : "ぜんぶ OK");
  process.exit(failed ? 1 : 0);
})();
