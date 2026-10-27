// ブラウザで ほんとうに うごかして スクショを とる（node --test の たいしょう がい に するため .test.js に しない）
//   node air-hockey/tests/e2e.playwright.cjs [スクショの ほぞんさき]
// たてもち スマホ（390×844）と よこもち タブレット（1024×768）で:
//   メニュー → 2にん（2ほんの ゆびで どうじに マレットを うごかす）→ ひとやすみ → CPU どうし を さいごまで → けっか
const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT = process.argv[2] || path.join(require("node:os").tmpdir(), "air-hockey-shots");
const FILE = "file://" + path.join(__dirname, "..", "index.html");
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "tablet", width: 1024, height: 768, isMobile: true, hasTouch: true },
];
const ISSUES = [];
function assert(ok, msg) { if (!ok) throw new Error(msg); }

async function layoutCheck(page, label) {
  const bad = await page.evaluate(() => {
    const out = [], vw = innerWidth, vh = innerHeight;
    if (document.documentElement.scrollWidth > vw + 1) out.push("よこスクロール");
    for (const b of document.querySelectorAll("button, summary")) {
      if (!b.getClientRects().length || b.closest(".overlay:not(.show)") || getComputedStyle(b).display === "none" || b.closest("[hidden]")) continue;
      const r = b.getBoundingClientRect();
      if (r.width < 55.5 || r.height < 55.5) out.push("ちいさい " + (b.id || b.textContent.trim().slice(0, 8)) + " " + Math.round(r.width) + "x" + Math.round(r.height));
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (!b.closest(".box") && (cx < 0 || cx > vw || cy < 0 || cy > vh)) out.push("がめんの そと " + (b.id || b.textContent.trim()));
    }
    return out;
  });
  bad.forEach((b) => ISSUES.push(label + ": " + b));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(FILE + "?speed=6&seed=5");
    await page.waitForTimeout(800);
    await layoutCheck(page, vp.name + " メニュー");
    await page.screenshot({ path: path.join(OUT, vp.name + "-1-menu.png") });

    // 2にん: 2ほんの ゆび で どうじに
    await page.click('.mode[data-mode="duo"]');
    await page.click('.seg[data-key="theme"] button[data-v="neon"]');
    await page.click("#bStart");
    await page.waitForTimeout(300);
    const cdp = await ctx.newCDPSession(page);
    const pt = (x, y) => page.evaluate(([x, y]) => AHG.table(x, y), [x, y]);
    const a0 = await pt(0.5, 1.5), b0 = await pt(0.5, 0.2), a1 = await pt(0.2, 1.2), b1 = await pt(0.8, 0.45);
    const tp = (id, p) => ({ x: p.x, y: p.y, id, radiusX: 8, radiusY: 8, force: 1 });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [tp(1, a0), tp(2, b0)] });
    for (let i = 1; i <= 12; i++) {
      const k = i / 12, lerp = (p, q) => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [tp(1, lerp(a0, a1)), tp(2, lerp(b0, b1))] });
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(300);
    const ms = await page.evaluate(() => AHG.G.world.mallets.map((m) => [m.x, m.y]));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert(Math.hypot(ms[0][0] - 0.2, ms[0][1] - 1.2) < 0.03, vp.name + ": あお の マレットが ゆびに ついて こない " + ms[0]);
    assert(Math.hypot(ms[1][0] - 0.8, ms[1][1] - 0.45) < 0.03, vp.name + ": あか の マレットが ゆびに ついて こない " + ms[1]);
    const scroll = await page.evaluate(() => [scrollX, scrollY, visualViewport ? visualViewport.scale : 1]);
    assert(scroll[0] === 0 && scroll[1] === 0 && scroll[2] === 1, vp.name + ": スクロール／ズーム した " + scroll);
    await layoutCheck(page, vp.name + " 2にん");
    await page.screenshot({ path: path.join(OUT, vp.name + "-2-duo.png") });
    await page.click("#pause1");
    await page.waitForTimeout(200);
    assert(await page.evaluate(() => AHG.paused), vp.name + ": ひとやすみ できない");
    await layoutCheck(page, vp.name + " ひとやすみ");
    await page.screenshot({ path: path.join(OUT, vp.name + "-3-pause.png") });
    await page.click('#pauseOv .half[data-side="1"] [data-act="menu"]');
    await page.waitForTimeout(200);

    // CPU どうし を さいごまで（アイテム あり・3てん）
    await page.click('.mode[data-mode="watch"]');
    await page.click('.seg[data-key="level"] button[data-v="2"]');
    await page.click('.seg[data-key="target"] button[data-v="3"]');
    await page.click('.seg[data-key="items"] button[data-v="1"]');
    await page.click('.seg[data-key="theme"] button[data-v="' + (vp.name === "phone" ? "train" : "ice") + '"]');
    await page.click("#bStart");
    let shotGoal = false, shotItem = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 240000) {
      const st = await page.evaluate(() => ({ phase: AHG.G && AHG.G.phase, item: !!(AHG.G && AHG.G.world.item), over: document.getElementById("overOv").classList.contains("show"), score: AHG.G && AHG.G.match.score }));
      if (st.over) break;
      if (!shotGoal && st.phase === "goal") { shotGoal = true; await page.waitForTimeout(60); await page.screenshot({ path: path.join(OUT, vp.name + "-4-goal.png") }); }
      if (!shotItem && st.item && st.phase === "play") { shotItem = true; await page.screenshot({ path: path.join(OUT, vp.name + "-5-item.png") }); }
      await page.waitForTimeout(100);
    }
    const res = await page.evaluate(() => ({ score: AHG.G.match.score, winner: AHG.G.match.winner, over: document.getElementById("overOv").classList.contains("show"), res: [...document.querySelectorAll("#overOv .res")].map((e) => e.textContent) }));
    assert(res.over && res.winner >= 0 && Math.max(...res.score) === 3, vp.name + ": しあいが おわらない " + JSON.stringify(res));
    await layoutCheck(page, vp.name + " けっか");
    await page.screenshot({ path: path.join(OUT, vp.name + "-6-result.png") });
    console.log(vp.name, "CPU どうし", res.score.join("-"), res.res.join(" / "));
    assert(!errors.length, vp.name + ": エラー " + errors.join(" | "));
    await ctx.close();
  }
  await browser.close();
  if (ISSUES.length) { console.log("もんだい:\n  " + ISSUES.join("\n  ")); process.exit(1); }
  console.log("OK スクショ: " + OUT);
})().catch((e) => { console.error(e); process.exit(1); });
