// ブラウザで ぜんぶの がめんを うごかして スクショを とる（スマホ たて・タブレット よこ）。
//   NODE_PATH=$(npm root -g) node shiki-kotoba/tests/e2e.playwright.cjs [スクショの ほぞんさき]
// （node --test の たいしょう がいに するため .test.js に しない）
const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT = process.argv[2] || path.join(require("node:os").tmpdir(), "shiki-kotoba-shots");
const FILE = "file://" + path.join(__dirname, "..", "index.html");
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "tablet", width: 1024, height: 768 },
];
function assert(ok, msg) { if (!ok) throw new Error(msg); }

async function noOverflow(page, label) {
  const bad = await page.evaluate(() => {
    const vw = innerWidth, out = [];
    if (document.documentElement.scrollWidth > vw + 1) out.push("よこスクロール " + document.documentElement.scrollWidth);
    for (const e of document.querySelectorAll("main *, header *")) {
      if (!e.getClientRects().length || e.closest("[hidden], .pieces")) continue;
      const b = e.getBoundingClientRect();
      if (b.right > vw + 1 || b.left < -1) out.push((e.id || e.className || e.tagName) + " " + Math.round(b.left) + "-" + Math.round(b.right));
    }
    return out.slice(0, 5);
  });
  assert(!bad.length, label + ": はみだし " + bad.join(" / "));
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
    const shot = async (n, skip) => { if (!skip) await noOverflow(page, vp.name + "/" + n); await page.screenshot({ path: path.join(OUT, vp.name + "-" + n + ".png") }); };

    await page.goto(FILE);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await shot("1-home");

    // はこ: ただしい はこへ ドラッグ
    await page.click('[data-go="hako"]');
    await shot("2-hako-setup");
    await page.click('[data-rule="life"]');
    await page.waitForTimeout(400);
    await shot("3-hako");
    for (let i = 0; i < 3; i++) {
      const kana = await page.textContent("#hakoCard .w-kana");
      const life = await page.evaluate((k) => window.SK_WORDS.WORDS.find((w) => w.kana === k).life, kana);
      const c = await page.locator("#hakoCard").boundingBox();
      const b = await page.locator(`.box[data-s="${life}"]`).boundingBox();
      await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
      await page.mouse.down();
      await page.mouse.move(c.x + c.width / 2 + 20, c.y + c.height / 2 + 20, { steps: 3 });
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
      if (i === 0) await shot("4-hako-drag", true);
      await page.mouse.up();
      assert((await page.textContent("#hakoMsg")).includes("せいかい"), "はこ: ドラッグで せいかい に ならない");
      await page.waitForTimeout(2100);
    }
    // まちがえた はこを タップ
    const kana = await page.textContent("#hakoCard .w-kana");
    const life = await page.evaluate((k) => window.SK_WORDS.WORDS.find((w) => w.kana === k).life, kana);
    const wrong = ["haru", "natsu", "aki", "fuyu"].find((s) => s !== life);
    await page.click(`.box[data-s="${wrong}"]`);
    assert((await page.textContent("#hakoMsg")).includes("🤔"), "はこ: まちがい の ひょうじ");
    await shot("5-hako-wrong");

    // カルタ
    await page.click("#back");
    await page.click('[data-go="karuta"]');
    await shot("6-karuta-setup");
    await page.click("#kStart");
    await page.waitForTimeout(2200);
    const cur = await page.evaluate(() => document.querySelector(".yomi-t").textContent);
    assert(cur.length > 0, "カルタ: よみふだが でない");
    await page.waitForTimeout(1500);
    const id = await page.evaluate(() => {
      const t = document.querySelector(".yomi-t").textContent.replace(/\s/g, "");
      const ids = [...document.querySelectorAll(".fuda:not(.gone)")].map((f) => f.dataset.id);
      return ids.sort((a, b) => b.length - a.length).find((k) => t.includes(k)) || null;
    });
    await shot("7-karuta-read");
    if (id) {
      await page.click(`.fuda[data-id="${id}"]`);
      await page.waitForTimeout(300);
      await shot("8-karuta-take");
    }

    // クイズ
    await page.click("#back");
    await page.click('[data-go="quiz"]');
    await shot("9-quiz-setup");
    await page.click("#qStart");
    await page.click('.qbtn[data-s="haru"]');
    await page.waitForTimeout(400);
    assert(await page.isVisible("#qExplain"), "クイズ: せつめいが でない");
    await shot("10-quiz-answer");

    // はいく: さくら・さく・… で 5・7・5
    await page.click("#back");
    await page.click('[data-go="haiku"]');
    const tap = async (txt) => { await page.click(`.piece[data-text="${txt}"]`); };
    // さくら さく ／ まどのそと から ／ いいにおい
    await tap("さくら"); // haru タブ
    await page.click("#hkTabs button:nth-child(6)"); await tap("さく"); await tap("まどのそと"); await tap("ゆれる");
    await page.click("#hkUndo"); // 2ぎょうめ 8 → 5
    await page.click("#hkTabs button:nth-child(7)"); await tap("から");
    await page.click("#hkTabs button:nth-child(6)"); await tap("いいにおい");
    const counts = await page.$$eval(".hk-c", (es) => es.map((e) => parseInt(e.textContent)));
    assert(JSON.stringify(counts) === "[5,7,5]", "はいく: かず " + counts);
    assert((await page.textContent("#hkMsg")).includes("ぴったり"), "はいく: ぴったり が でない");
    await shot("11-haiku");
    // 季語を もう1つ いれると ちゅうい
    await page.click(".hk-line:nth-child(3)");
    await page.click("#hkTabs button:nth-child(4)"); await tap("ゆき");
    assert((await page.textContent("#hkMsg")).includes("きせつが ふたつ"), "はいく: 季語2つ の ちゅうい");
    await shot("12-haiku-2kigo");
    await page.click("#hkUndo");
    await page.click("#hkSave");
    assert((await page.$$(".hk-saved li:not(.empty)")).length === 1, "はいく: ほぞん");
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("shikiKotoba.v1")).haiku.length);
    assert(saved === 1, "はいく: localStorage");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await shot("13-haiku-saved");

    // ずかん
    await page.click("#back");
    await page.click('[data-go="zukan"]');
    await shot("14-zukan");
    const z = page.locator("#zkGrid .zk:not(.locked)").first();
    if (await z.count()) { await z.click(); await shot("15-zukan-detail"); await page.click("#modalClose"); }

    assert(!errors.length, vp.name + ": エラー " + errors.join(" / "));
    console.log("ok", vp.name);
    await ctx.close();
  }
  await browser.close();
  console.log("スクショ:", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
