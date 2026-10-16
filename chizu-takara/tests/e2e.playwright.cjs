// ブラウザで 15ステージを ヒントどおりに じどうで すすめ、カード・ちずづくり も うごかして スクショを とる。
//   NODE_PATH=$(npm root -g) node chizu-takara/tests/e2e.playwright.cjs [スクショの ほぞんさき]
// （node --test の たいしょう がいに するため .test.js に しない）
const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT = process.argv[2] || path.join(require("node:os").tmpdir(), "chizu-takara-shots");
const URL = "file://" + path.join(__dirname, "..", "index.html");
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "tablet", width: 1024, height: 768 }
];

function assert(ok, msg) { if (!ok) throw new Error(msg); }

async function fits(page, label) {
  const r = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight, bad = [];
    if (document.documentElement.scrollWidth > vw + 1) bad.push("よこスクロール " + document.documentElement.scrollWidth);
    const v = document.querySelector(".view:not([hidden])");
    for (const id of ["actBtn", "mapBox", "pad", "palette", "makeBox"]) {
      const e = document.getElementById(id);
      if (!e || !v.contains(e)) continue;
      const b = e.getBoundingClientRect();
      if (b.right > vw + 1 || b.bottom > vh + 1 || b.left < -1) bad.push(id + " が はみでる " + JSON.stringify([b.left, b.top, b.right, b.bottom].map(Math.round)));
    }
    return bad;
  });
  assert(!r.length, label + ": " + r.join(" / "));
}

async function walkTo(page, target, dirs) {
  for (let guard = 0; guard < 40; guard++) {
    const pos = (await page.getAttribute("#mapBox", "data-pos")).split(",").map(Number);
    let dx = target[0] - pos[0], dy = target[1] - pos[1];
    if (!dx && !dy) return;
    let dir, n;
    if (dirs === 8 && dx && dy) { dir = (dy < 0 ? "n" : "s") + (dx > 0 ? "e" : "w"); n = Math.min(Math.abs(dx), Math.abs(dy)); }
    else if (dx) { dir = dx > 0 ? "e" : "w"; n = Math.abs(dx); }
    else { dir = dy > 0 ? "s" : "n"; n = Math.abs(dy); }
    n = Math.min(n, 5);
    if (n === 1 && Math.random() < .5) {
      // となりの マスを タップして 1マス
      const box = await page.locator("#mapBox svg").boundingBox();
      const N = await page.evaluate(() => document.querySelectorAll("#mapBox .cells > g").length);
      const size = Math.round(Math.sqrt(N)), vb = size * 100 + 12;
      const D = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1] }[dir];
      const cx = (pos[0] + D[0]) * 100 + 56, cy = (pos[1] + D[1]) * 100 + 56;
      await page.mouse.click(box.x + cx / vb * box.width, box.y + cy / vb * box.height);
    } else {
      await page.click(`#steps .stepn[data-n="${n}"]`);
      await page.click(`#pad .dbtn[data-dir="${dir}"]`);
    }
    await page.waitForTimeout(n * 240 + 80);
  }
  throw new Error("たどりつけない " + target);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(URL);
    await fits(page, vp.name + " home");
    await page.screenshot({ path: path.join(OUT, vp.name + "-1-home.png") });

    // ---- きごう カード ----
    await page.click("#goCards");
    await page.screenshot({ path: path.join(OUT, vp.name + "-2-card.png") });
    for (let i = 0; i < 40 && await page.isVisible("#cards"); i++) {
      if (await page.isVisible("#modal")) break;
      // 1もんめは わざと まちがえて「もういちど」を たしかめる
      await page.click("#choices .choice >> nth=" + (i === 0 ? 0 : 1));
      if (i === 0) await page.screenshot({ path: path.join(OUT, vp.name + "-3-card-feed.png") });
      await page.click("#qNext");
    }
    assert(await page.isVisible("#modal"), "カードが おわらない");
    await page.click("#modalBtns button >> nth=2"); // ホームへ

    // ---- たからさがし 15ステージ ----
    await page.click("#goStages");
    const stages = await page.evaluate(() => window.CHIZU_STAGES.map((s) => ({ dirs: s.dirs, path: window.CHIZU_RULES.solve(s).path.map((p) => p.pos) })));
    for (let si = 0; si < stages.length; si++) {
      if (await page.isVisible("#stages")) {
        if (si === 0) await page.screenshot({ path: path.join(OUT, vp.name + "-4-stages.png") });
        await page.click(`.stage-btn[data-stage="${si + 1}"]`);
      }
      assert(await page.isVisible("#hunt"), "ステージ " + (si + 1) + " が ひらかない");
      if (si === 0) {
        // まちがった ばしょで「ここだ！」
        await page.click("#actBtn");
        const m = await page.textContent("#huntMsg");
        assert(m.includes("ここじゃ ない"), "まちがいの メッセージ: " + m);
      }
      const st = stages[si];
      for (let h = 0; h < st.path.length; h++) {
        await walkTo(page, st.path[h], st.dirs);
        if ((si === 0 || si === 12) && h === 1) {
          await fits(page, vp.name + " hunt " + (si + 1));
          await page.screenshot({ path: path.join(OUT, vp.name + "-5-hunt-" + (si + 1) + ".png") });
        }
        await page.click("#actBtn");
        if (h < st.path.length - 1) await page.waitForFunction((n) => document.getElementById("hunt").dataset.hint === String(n), h + 1);
      }
      await page.waitForSelector("#modal:not([hidden])", { timeout: 4000 });
      await page.waitForTimeout(400);
      if (si === 0 || si === 14) await page.screenshot({ path: path.join(OUT, vp.name + "-6-treasure-" + (si + 1) + ".png") });
      if (si < stages.length - 1) await page.click("#nextStage");
      else await page.click("#modalBtns button >> nth=1"); // ステージ えらび
    }
    const stars = await page.evaluate(() => JSON.parse(localStorage.getItem("chizu-takara-v1")).stars);
    assert(Object.keys(stars).length === 15, "ほし " + JSON.stringify(stars));
    assert(stars[1] === 2 && stars[2] === 3, "ほしの かず " + JSON.stringify(stars));

    // ---- ちず づくり ----
    await page.click("#backBtn");
    await page.click("#goMaker");
    const box = await page.locator("#makeBox svg").boundingBox();
    const at = (x, y) => ({ x: box.x + (x * 100 + 56) / 1012 * box.width, y: box.y + (y * 100 + 56) / 1012 * box.height });
    const place = async (code, cells) => {
      await page.click(`.pal[data-code="${code}"]`);
      for (const [x, y] of cells) { const p = at(x, y); await page.mouse.click(p.x, p.y); }
    };
    await place("=", [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [6, 5], [7, 5], [8, 5], [9, 5]]);
    await place("E", [[5, 5]]);
    await place("-", [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]]);
    await place("J", [[1, 1]]); await place("T", [[7, 2]]); await place("P", [[5, 3]]); await place("S", [[6, 7]]);
    await place("t", [[0, 7], [1, 7], [0, 8], [1, 8]]); await place("n", [[8, 8], [9, 8], [9, 9]]);
    await place("B", [[1, 3]]); await place("G", [[8, 0]]);
    await page.waitForTimeout(300);
    await fits(page, vp.name + " maker");
    await page.screenshot({ path: path.join(OUT, vp.name + "-7-maker.png") });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("chizu-takara-v1")).maps[0]);
    assert(saved && saved[5] === "=====E====" && saved[1][1] === "J", "ちずが ほぞん されない " + JSON.stringify(saved));
    await page.click(".slot >> nth=1");
    const empty = await page.evaluate(() => document.querySelectorAll("#makeBox .cells g g").length);
    assert(empty === 0, "スロット2 が からでない");
    await page.click(".slot >> nth=0");

    // ---- ずかん ----
    await page.click("#zukanBtn");
    await page.screenshot({ path: path.join(OUT, vp.name + "-8-zukan.png") });
    await page.click("#backBtn");
    assert(await page.isVisible("#maker"), "ずかんから もどれない");

    // ---- おと オフ が のこる ----
    await page.click("#soundBtn");
    await page.reload();
    assert((await page.textContent("#soundBtn")).includes("🔇"), "おと オフ が ほぞん されない");

    assert(!errors.length, "エラー: " + errors.join(" / "));
    console.log(vp.name + ": ok");
    await ctx.close();
  }
  await browser.close();
  console.log("スクショ: " + OUT);
})().catch((e) => { console.error(e); process.exit(1); });
