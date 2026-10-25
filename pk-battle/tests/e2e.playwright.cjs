// ブラウザで ほんとうに スワイプ・タップ して PK せん を さいごまで すすめ、スクショを とる。
//   node pk-battle/tests/e2e.playwright.cjs [スクショの ほぞんさき]
// （node --test の たいしょう がいに するため .test.js に しない）
// たて もち スマホ（390×844）: 1にん（スワイプ）を 1しあい ＋ 2にん こうたい ＋ かんたん そうさ
// よこ もち タブレット（1024×768）: 1にん を 1しあい ＋ 2にん どうじ ＋ たいかいの 1かいせん
const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT = process.argv[2] || path.join(require("node:os").tmpdir(), "pk-battle-shots");
const FILE = "file://" + path.join(__dirname, "..", "index.html") + "?speed=3";
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "tablet", width: 1024, height: 768 },
];
const ISSUES = [];
function assert(ok, msg) { if (!ok) throw new Error(msg); }

// よこスクロール・がめんの そとに はみでた もじ
async function fits(page, label, sel) {
  const bad = await page.evaluate((sel) => {
    const vw = innerWidth, out = [];
    if (document.documentElement.scrollWidth > vw + 1) out.push("よこスクロール " + document.documentElement.scrollWidth);
    for (const root of document.querySelectorAll(sel)) {
      for (const e of [root, ...root.querySelectorAll("*")]) {
        if (e.closest("[hidden]") || !e.getClientRects().length) continue;
        const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!hasText) continue;
        const b = e.getBoundingClientRect();
        if (b.right > vw + 1 || b.left < -1) out.push((e.id || e.className || e.tagName) + "「" + e.textContent.trim().slice(0, 16) + "」");
      }
    }
    return out;
  }, sel);
  bad.forEach((b) => ISSUES.push(label + ": " + b));
}
// 56px より ちいさい ボタン
async function bigButtons(page, label) {
  const small = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => {
    if (b.closest("[hidden]") || !b.getClientRects().length || b.classList.contains("sw")) return false;
    const r = b.getBoundingClientRect();
    return r.width > 0 && (r.height < 55.5 || r.width < 55.5);
  }).map((b) => (b.id || b.className) + ":" + b.textContent.trim().slice(0, 8)));
  small.forEach((s) => ISSUES.push(label + ": ちいさい ボタン " + s));
}

const sleep = (page, ms) => page.waitForTimeout(ms);
// ボールから ゴールの (x, y) へ スワイプ。ms … かける じかん
async function swipe(page, tx, ty, ms, bend) {
  const a = await page.evaluate(() => PKG.ball());
  const b = await page.evaluate(([x, y]) => PKG.goalPoint(x, y), [tx, ty]);
  const n = 8;
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    const off = (bend || 0) * Math.sin(f * Math.PI) * 40;
    await page.mouse.move(a.x + (b.x - a.x) * f + off, a.y + (b.y - a.y) * f);
    await sleep(page, ms / n);
  }
  await page.mouse.up();
}
const AIMS = [[2.5, 0.5], [-2.4, 1.6], [0.6, 1.9], [-2.6, 0.4], [2.3, 1.7], [-1.0, 0.8], [1.5, 2.0]];

// しあいを さいごまで すすめる。shots … とる スクショの なまえ
async function playToEnd(page, shot, label, opt) {
  const o = opt || {};
  let kicks = 0, guard = 0, firstAim = true, firstDive = true, flightShot = false, firstPass = true;
  while (guard++ < 2000) {
    const ph = await page.evaluate(() => PKG.phase());
    if (ph === "result" || ph === "cup") return ph;
    if (ph === "pass") {
      if (firstPass && shot) { await shot(label + "-pass"); firstPass = false; }
      await page.click("#passGo");
    } else if (ph === "aim") {
      if (firstAim && shot) { await shot(label + "-aim"); firstAim = false; await fits(page, label + "-aim", "#app"); await bigButtons(page, label + "-aim"); }
      if (o.duoKeeper) {
        const btns = page.locator("#duoGrid button");
        await btns.nth(kicks % 9).dispatchEvent("pointerdown");
      }
      const [tx, ty] = AIMS[kicks % AIMS.length];
      await swipe(page, tx, ty, 40, kicks % 3 === 1 ? 1 : 0);
      kicks++;
      if (kicks === 1) { await sleep(page, 50); console.log(label, "スワイプ → シュート", JSON.stringify(await page.evaluate(() => PKG.pendingShot()))); }
      if (!flightShot && shot) { await sleep(page, 380); await shot(label + "-runup"); }
      if (!flightShot && shot) { await sleep(page, 330); await shot(label + "-flight"); flightShot = true; }
    } else if (ph === "easyPick") {
      if (firstAim && shot) { await shot(label + "-easy"); firstAim = false; }
      const p = await page.evaluate((i) => PKG.goalPoint([-2.5, 0, 2.5][i % 3], [2.0, 1.2, 0.4][Math.floor(i / 3) % 3]), kicks);
      await page.mouse.click(p.x, p.y);
    } else if (ph === "easyPower") {
      // みどりの ところで とめる
      for (let i = 0; i < 200; i++) { const v = await page.evaluate(() => PKG.gauge()); if (v !== null && v > 0.6 && v < 0.9) break; await sleep(page, 10); }
      if (shot && kicks === 0) await shot(label + "-gauge");
      await page.click("#bStop");
      kicks++;
    } else if (ph === "dive") {
      if (firstDive && shot) { await sleep(page, 250); await shot(label + "-keeper"); firstDive = false; await fits(page, label + "-keeper", "#app"); await bigButtons(page, label + "-keeper"); }
      await sleep(page, 150 + (kicks * 37) % 200);
      if (kicks % 2) {
        // スワイプで とぶ
        const box = await page.locator("#cv").boundingBox();
        const cx = box.x + box.width / 2, cy = box.y + box.height * 0.6;
        const dx = [-1, 0, 1][kicks % 3] * 120, dy = [-1, 0, 1][(kicks >> 1) % 3] * 80;
        await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + dx / 2, cy + dy / 2); await page.mouse.move(cx + dx + 1, cy + dy + 1); await page.mouse.up();
      } else {
        await page.locator("#diveGrid button").nth((kicks * 5) % 9).dispatchEvent("pointerdown");
      }
      kicks++;
      await sleep(page, 300);
    } else await sleep(page, 60);
  }
  throw new Error(label + ": しあいが おわらない");
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    const shot = (n) => page.screenshot({ path: path.join(OUT, vp.name + "-" + n + ".png") });
    await page.goto(FILE);
    await page.evaluate(() => localStorage.clear());
    await page.goto(FILE);
    await sleep(page, 300);
    await shot("01-menu");
    await fits(page, vp.name + "-menu", "#menu"); await bigButtons(page, vp.name + "-menu");

    // ---- 1にん: CPU（よわい）と PK せん を さいごまで ----
    await page.click('[data-mode="cpu"]');
    await page.click('#segLevel button[data-v="0"]');
    await shot("02-setup");
    await fits(page, vp.name + "-setup", "#setup"); await bigButtons(page, vp.name + "-setup");
    await page.click("#sGo");
    const ph = await playToEnd(page, (n) => shot("03-" + n), vp.name + "-cpu");
    assert(ph === "result", "けっか が でない");
    const st = await page.evaluate(() => PKG.status());
    assert(st.over, "しあいが おわって いない");
    const kicks = await page.evaluate(() => PKG.kicks());
    assert(kicks[0].length >= 3 && kicks[1].length >= 3, "けった かず が すくない " + JSON.stringify(kicks));
    await sleep(page, 400);
    await shot("04-result");
    await fits(page, vp.name + "-result", "#result");
    const sv = await page.evaluate(() => PKG.save());
    const nk = sv.kick.n.reduce((a, b) => a + b, 0), nd = sv.keep.faced;
    assert(nk === kicks[sv.order === 0 ? 0 : 1].length, "けった きろく が あわない " + nk);
    assert(nd > 0, "キーパーの きろく が ない");
    console.log(vp.name, "1にん: スコア", st.score.join("-"), "かち:", st.winner, "けった", JSON.stringify(kicks));

    // データ と まめちしき
    await page.click("#resBtns .btn:first-child"); // メニュー
    await page.click("#mData");
    await sleep(page, 200);
    await shot("05-data");
    await fits(page, vp.name + "-data", "#data");
    await page.click("#dataClose");
    await page.click("#mTips");
    await shot("06-tips");
    await page.click("#tipsClose");

    if (vp.name === "phone") {
      // ---- 2にん こうたい（かんたん そうさ） ----
      await page.click('[data-mode="pass"]');
      await page.click('#segEasy button[data-v="1"]');
      await page.click("#sGo");
      const p2 = await playToEnd(page, (n) => shot("07-" + n), vp.name + "-pass");
      assert(p2 === "result", "2にん こうたい が おわらない");
      await shot("08-pass-result");
      console.log(vp.name, "2にん こうたい:", JSON.stringify(await page.evaluate(() => PKG.status().score)));
      await page.click("#resBtns .btn:first-child");
    } else {
      // ---- 2にん どうじ（ひだり＝スワイプ、みぎ＝キーパーの ボタン） ----
      await page.click('[data-mode="duo"]');
      await page.click('#segEasy button[data-v="0"]');
      await page.click("#sGo");
      const p2 = await playToEnd(page, (n) => shot("07-" + n), vp.name + "-duo", { duoKeeper: true });
      assert(p2 === "result", "2にん どうじ が おわらない");
      await shot("08-duo-result");
      console.log(vp.name, "2にん どうじ:", JSON.stringify(await page.evaluate(() => PKG.status().score)));
      await page.click("#resBtns .btn:first-child");
      // ---- たいかい: くみあわせ → 1かいせん ----
      await page.click('[data-mode="cup"]');
      await page.click("#sGo");
      await sleep(page, 200);
      await shot("09-cup");
      await fits(page, vp.name + "-cup", "#cup");
      await page.click("#cupBtns .btn.red");
      const p3 = await playToEnd(page, null, vp.name + "-cup");
      assert(p3 === "result", "たいかいの しあい が おわらない");
      await page.click("#resBtns .btn.red");
      await sleep(page, 200);
      await shot("10-cup-after");
      const cupText = await page.textContent("#cupTitle");
      console.log(vp.name, "たいかい:", cupText);
    }
    if (errors.length) ISSUES.push(vp.name + " エラー: " + errors.join(" / "));
    await ctx.close();
  }
  await browser.close();
  console.log("スクショ:", OUT);
  if (ISSUES.length) { console.log("もんだい:\n" + ISSUES.join("\n")); process.exit(1); }
  console.log("OK");
})().catch((e) => { console.error(e); process.exit(1); });
