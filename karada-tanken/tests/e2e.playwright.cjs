// ブラウザで 3コースを さいごまで じどうで すすめ、スクショを とる。
//   NODE_PATH=$(npm root -g) node karada-tanken/tests/e2e.playwright.cjs [スクショの ほぞんさき]
// （node --test の たいしょう がいに するため .test.js に しない）
const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT = process.argv[2] || path.join(require("node:os").tmpdir(), "karada-tanken-shots");
const URL = "file://" + path.join(__dirname, "..", "index.html");
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "tablet", width: 1024, height: 768 }
];

async function center(page, sel) {
  const b = await page.locator(sel).boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function svgPoint(page, x, y) {
  return page.evaluate(([x, y]) => {
    const svg = document.querySelector("#stageSvg svg"), p = svg.createSVGPoint();
    p.x = x; p.y = y; const q = p.matrixTransform(svg.getScreenCTM());
    return { x: q.x, y: q.y };
  }, [x, y]);
}
const done = (page) => page.evaluate(() => document.getElementById("stage").dataset.done === "1");

// タイミング ゲーム: data-hit="1" の あいだに タップ
async function rhythm(page) {
  const c = await center(page, "#stageSvg");
  for (let i = 0; i < 80 && !(await done(page)); i++) {
    try { await page.waitForSelector('#stage[data-hit="1"]', { timeout: 4000 }); } catch (e) { continue; }
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(260);
  }
}

async function playScene(page, opt, shots) {
  const type = await page.getAttribute("#stage", "data-game");
  const scene = await page.getAttribute("#stage", "data-scene");
  if (shots) await page.screenshot({ path: shots + "-" + scene + ".png" });
  if (type === "chew" && opt.quick) {
    const c = await center(page, "#stageSvg");
    for (let i = 0; i < 3; i++) { await page.waitForSelector('#stage[data-hit="1"]'); await page.mouse.click(c.x, c.y); await page.waitForTimeout(300); }
    await page.click("#gulpBtn");
  } else if (["chew", "push", "beat"].includes(type)) {
    await rhythm(page);
  } else if (type === "choice") {
    const correct = await page.$("#choices [data-correct]");
    if (correct) await correct.click();
    else await page.click("#choices [data-opt='" + (opt.quick ? 1 : 0) + "']");
  } else if (type === "stir") {
    const ctr = [238, 166];
    for (let k = 0; k < 8 && !(await done(page)); k++) {
      let p = await svgPoint(page, ctr[0] + 70, ctr[1]);
      await page.mouse.move(p.x, p.y); await page.mouse.down();
      for (let a = 0; a <= 64; a++) {
        p = await svgPoint(page, ctr[0] + Math.cos(a / 64 * Math.PI * 2) * 70, ctr[1] + Math.sin(a / 64 * Math.PI * 2) * 70);
        await page.mouse.move(p.x, p.y);
      }
      await page.mouse.up();
    }
  } else if (type === "nutrient") {
    for (let i = 0; i < 60 && !(await done(page)); i++) {
      const el = await page.$("[data-np]");
      if (el) await el.dispatchEvent("pointerdown");
      await page.waitForTimeout(150);
    }
  } else if (type === "absorb") {
    for (const el of await page.$$("[data-drop]")) { await el.dispatchEvent("pointerdown"); await page.waitForTimeout(120); }
  } else if (type === "breathe") {
    for (let i = 0; i < 8 && !(await done(page)); i++) {
      await page.waitForSelector('#stage[data-phase="idle"]', { timeout: 5000 });
      if (await done(page)) break;
      const b = await center(page, "#holdBtn");
      await page.mouse.move(b.x, b.y); await page.mouse.down();
      await page.waitForSelector('#stage[data-full="1"]', { timeout: 4000 });
      await page.waitForTimeout(150);
      await page.mouse.up();
      await page.waitForTimeout(300);
    }
  } else if (type === "explore") {
    for (const el of await page.$$("[data-spot]")) { await el.dispatchEvent("pointerdown"); await page.waitForTimeout(80); }
  } else if (type === "bones") {
    const ids = await page.$$eval("[data-piece]", (els) => els.map((e) => e.getAttribute("data-piece")));
    const pos = await page.evaluate(() => window.KaradaData.BONES.reduce((m, b) => (m[b.id] = b, m), {}));
    for (const id of ids) {
      const piece = await center(page, '[data-piece="' + id + '"] > circle.hit');
      await page.mouse.click(piece.x, piece.y);
      const b = pos[id], p = await svgPoint(page, b.x, b.y);
      await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(120);
    }
  } else if (type === "muscle") {
    for (const v of [50, 100, 60, 0]) {
      await page.$eval("#armSl", (el, v) => { el.value = v; el.dispatchEvent(new Event("input")); }, v);
      await page.waitForTimeout(250);
    }
  } else throw new Error("しらない type " + type);
  await page.waitForSelector('#stage[data-done="1"]', { timeout: 15000 });
  await page.waitForSelector("#nextBtn:not([hidden])");
  if (shots) await page.screenshot({ path: shots + "-" + scene + "-done.png" });
  return { type, scene };
}

async function playCourse(page, ci, opt, shots) {
  await page.click('.course[data-course="' + ci + '"]');
  await page.waitForTimeout(1600);
  const log = [];
  for (let s = 0; s < 10; s++) {
    log.push(await playScene(page, opt, s < 99 && shots ? shots : null));
    await page.click("#nextBtn", { force: true });
    await page.waitForTimeout(200);
    if (!(await page.isHidden("#modal"))) break;
  }
  return log;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(vp.name + ": " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(vp.name + ": " + m.text()); });
    await page.goto(URL);
    await page.screenshot({ path: path.join(OUT, vp.name + "-home.png") });
    for (let ci = 0; ci < 3; ci++) {
      const log = await playCourse(page, ci, {}, vp.name === "phone" || ci === 0 ? path.join(OUT, vp.name + "-c" + ci) : null);
      await page.screenshot({ path: path.join(OUT, vp.name + "-c" + ci + "-clear.png") });
      const title = await page.textContent("#mTitle");
      console.log(vp.name, "コース" + (ci + 1), log.map((l) => l.scene).join(" → "), "／", title);
      await page.click("#mHome");
    }
    // ぶんき: よく かまない＋みず なし
    const log = await playCourse(page, 0, { quick: true }, null);
    const end = await page.textContent("#mBody .end-title");
    console.log(vp.name, "ぶんき（かまない・みず なし）:", end);
    await page.click("#mHome");
    await page.screenshot({ path: path.join(OUT, vp.name + "-home-after.png") });
    await page.click("#zukanBtn");
    await page.screenshot({ path: path.join(OUT, vp.name + "-zukan.png"), fullPage: true });
    const words = await page.textContent("#zukanCount");
    const saved = await page.evaluate(() => localStorage.getItem("karada-tanken-v1"));
    console.log(vp.name, "ずかん", words, "ほぞん", saved.length, "bytes");
    // よこはみだし チェック
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) errors.push(vp.name + ": よこに はみだし");
    await ctx.close();
  }
  await browser.close();
  if (errors.length) { console.error("エラー:\n" + errors.join("\n")); process.exit(1); }
  console.log("OK");
})();
