// ブラウザで しあいを じどうで さいごまで すすめ（?auto=1）、いろいろな がめんの スクショを とる。
//   NODE_PATH=$(npm root -g) node yakyu-shiai/tests/e2e.playwright.cjs [スクショの ほぞんさき]
// （node --test の たいしょう がいに するため .test.js に しない）
const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT = process.argv[2] || path.join(require("node:os").tmpdir(), "yakyu-shiai-shots");
const FILE = "file://" + path.join(__dirname, "..", "index.html");
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "tablet", width: 1024, height: 768 },
];
const ISSUES = [];
function assert(ok, msg) { if (!ok) throw new Error(msg); }

// よこスクロール・がめんの そとに はみでた もじ が ないか
async function fits(page, label, sel) {
  const bad = await page.evaluate((sel) => {
    const vw = innerWidth, vh = innerHeight, out = [];
    if (document.documentElement.scrollWidth > vw + 1) out.push("よこスクロール " + document.documentElement.scrollWidth);
    for (const root of document.querySelectorAll(sel)) {
      for (const e of [root, ...root.querySelectorAll("*")]) {
        if (e.closest("[hidden], .tablewrap") || !e.getClientRects().length) continue;
        const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!hasText) continue;
        const b = e.getBoundingClientRect();
        if (b.right > vw + 1 || b.left < -1 || b.top < -1) out.push((e.id || e.className || e.tagName) + "「" + e.textContent.trim().slice(0, 16) + "」" + JSON.stringify([b.left, b.top, b.right, b.bottom].map(Math.round)));
      }
    }
    return out;
  }, sel);
  bad.forEach((b) => ISSUES.push(label + ": " + b));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({  });
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    const shot = (n) => page.screenshot({ path: path.join(OUT, vp.name + "-" + n + ".png") });

    // ふつうの メニュー
    await page.goto(FILE);
    await page.waitForTimeout(300);
    await shot("01-menu");
    await fits(page, vp.name + " menu", "#menu .box");
    await page.click('.mode[data-mode="cpu"]');
    await page.waitForTimeout(200);
    await shot("02-setup");
    await fits(page, vp.name + " setup", "#setup .box");
    await page.click("#teams1 .team:nth-child(1) .info");
    await page.waitForTimeout(150);
    await shot("03-roster");
    await page.click("#rosterClose");

    // じどうで しあい（きみは あとで うつ → さいしょは しゅび）
    await page.goto(FILE + "?auto=1");
    await page.click('.mode[data-mode="cpu"]');
    await page.click('#segOrder button[data-v="1"]');
    await page.click('#segInn button[data-v="3"]');
    await page.click("#sGo");
    await page.waitForSelector("#pPitch:not([hidden])", { timeout: 20000 });
    await shot("04-pitch-panel");
    await fits(page, vp.name + " pitch", "#top, #talk, #panel");
    // ボールが とんで いる ところ
    await page.waitForFunction(() => window.__yakyu.view.kind === "pitch" && window.__yakyu.view.pitchT0, null, { timeout: 20000 });
    await page.waitForTimeout(90);
    await shot("05-pitch-flight");
    await page.waitForFunction(() => window.__yakyu.view.kind === "play", null, { timeout: 60000 });
    await page.waitForTimeout(250);
    await shot("06-play");
    const thr = await page.waitForSelector("#throwPick:not([hidden])", { timeout: 90000 }).catch(() => null);
    if (thr) await shot("07-throw-pick");
    await page.waitForSelector("#change.show", { timeout: 120000 });
    await shot("08-change");
    await fits(page, vp.name + " change", "#change .box");
    await page.waitForSelector("#pBat:not([hidden])", { timeout: 30000 });
    await page.waitForFunction(() => window.__yakyu.view.pitchT0, null, { timeout: 20000 });
    await page.waitForTimeout(60);
    await shot("09-bat");
    await fits(page, vp.name + " bat", "#top, #talk, #panel");
    await page.click("#bBoard");
    await shot("10-board");
    await page.click("#boardClose");
    await page.waitForSelector("#result.show", { timeout: 240000 });
    await page.waitForTimeout(300);
    await shot("11-result");
    await fits(page, vp.name + " result", "#result .box");
    const g = await page.evaluate(() => { const G = window.__yakyu.G; return { over: G.st.over, runs: G.st.runs, inning: G.st.inning }; });
    assert(g.over, "しあいが おわって いない");
    assert(g.inning <= 3, "3かいで おわる " + g.inning);
    const rec = await page.evaluate(() => JSON.parse(localStorage.getItem("yakyu-shiai-v1")));
    assert(rec.rec[1].w + rec.rec[1].l + rec.rec[1].d === 1, "せいせきが ほぞん された");
    await page.click("#rMenu");
    await page.click("#mRecords");
    await page.waitForTimeout(150);
    await shot("12-records");
    await page.click("#recClose");

    // 2にん
    await page.click('.mode[data-mode="two"]');
    await page.click("#sGo");
    await page.waitForSelector("#pPitch:not([hidden])", { timeout: 20000 });
    await shot("13-two-pitch");
    await page.waitForSelector("#change.show", { timeout: 120000 });
    await shot("14-two-change");
    await page.click("#bQuit");
    await page.click("#qYes");

    // おけいこ
    await page.click('.mode[data-mode="lesson"]');
    await page.waitForSelector("#lesson.show");
    await shot("15-lesson");
    await fits(page, vp.name + " lesson", "#lesson .box");
    await page.waitForFunction(() => document.getElementById("lStep").textContent.startsWith("おけいこ 5"), null, { timeout: 60000 });
    await page.waitForFunction(() => !document.getElementById("lesson").classList.contains("show") && window.__yakyu.view.pitchT0, null, { timeout: 20000 });
    await shot("16-lesson-bat");
    await page.waitForFunction(() => /おわり/.test(document.getElementById("lGo").textContent), null, { timeout: 90000 });
    await shot("17-lesson-end");
    const fails = await page.evaluate(() => document.getElementById("lTitle").textContent);
    assert(/できた/.test(fails), "おけいこの さいごが できた " + fails);

    assert(errors.length === 0, vp.name + " エラー: " + errors.join("\n"));
    await ctx.close();
    console.log(vp.name, "OK", JSON.stringify(g));
  }
  await browser.close();
  if (ISSUES.length) { console.log("はみだし:\n" + ISSUES.join("\n")); process.exit(1); }
  console.log("スクショ:", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
