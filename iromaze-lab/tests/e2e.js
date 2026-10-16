// NODE_PATH=$(npm root -g) node iromaze-lab/tests/e2e.js [スクショの でぐち]
// Playwright（Chromium）で スマホたて・タブレットよこ を うごかして スクショを とる
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
    const noHScroll = async (where) => {
      const w = await page.evaluate(() => {
        const v = [...document.querySelectorAll(".view")].find((x) => !x.hidden);
        return { sw: v ? v.scrollWidth : 0, cw: v ? v.clientWidth : 0, bw: document.documentElement.scrollWidth };
      });
      check(w.sw <= w.cw + 1 && w.bw <= vp.width, `${tag} ${where}: よこに はみださない (${w.sw}/${w.cw})`);
    };
    const fits = async (where, sel) => {
      const r = await page.evaluate((s) => { const e = document.querySelector(s).getBoundingClientRect(); return [e.top, e.bottom, e.left, e.right]; }, sel);
      check(r[1] <= vp.height + 1 && r[0] >= 0 && r[3] <= vp.width + 1, `${tag} ${where}: ${sel} が がめんに おさまる (${r.map(Math.round)})`);
    };
    const minTap = async (sel) => {
      const smallList = await page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.offsetParent).filter((e) => { const r = e.getBoundingClientRect(); return r.width < 55.5 || r.height < 55.5; }).map((e) => e.id || e.className), sel); const small = smallList.length; if (small) console.log(smallList);
      check(small === 0, `${tag}: ${sel} は 56px いじょう`);
    };
    await page.screenshot({ path: `${out}/${tag}-1-menu.png` });
    await noHScroll("menu");

    await page.click('[data-go="stages"]');
    await page.screenshot({ path: `${out}/${tag}-2-stages.png` });
    await noHScroll("stages");

    // ステージ1: あか＋きいろ = だいだい
    await page.click(".stage >> nth=0");
    await page.click('.tube[data-i="0"]');
    await page.waitForTimeout(350);
    await page.click('.tube[data-i="1"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${tag}-3-lab-drops.png` });
    await fits("lab", ".actions");
    await fits("lab", "#hintText");
    await minTap(".tube, .act, .pill");
    await noHScroll("lab");
    await page.click("#doneBtn");
    await page.waitForSelector("#result:not([hidden])");
    await page.waitForTimeout(1200);
    const stars = await page.evaluate(() => window.__iromaze.save.stars[0]);
    check(stars === 3, `${tag}: あか＋きいろ で ★3 (${stars})`);
    await page.screenshot({ path: `${out}/${tag}-4-result.png` });
    await page.click("#resNext");

    // ステージ2: あお だけ → ぶぶー と ヒント
    await page.click('.tube[data-i="2"]');
    await page.waitForTimeout(350);
    await page.click("#doneBtn");
    await page.waitForTimeout(1200);
    const hint = await page.textContent("#hintText");
    check(/きいろ/.test(hint), `${tag}: ヒントで きいろを すすめる「${hint}」`);
    check(await page.isHidden("#result"), `${tag}: はずれ では けっかを ださない`);
    await page.screenshot({ path: `${out}/${tag}-5-hint.png` });
    // ぐるぐる なぞって まぜる
    await page.click('.tube[data-i="1"]');
    await page.waitForTimeout(400);
    const box = await page.locator("#plate").boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2, R = box.width * 0.3;
    await page.mouse.move(cx + R, cy); await page.mouse.down();
    for (let a = 0; a <= Math.PI * 2.6; a += 0.2) await page.mouse.move(cx + R * Math.cos(a), cy + R * Math.sin(a));
    await page.mouse.up();
    await page.waitForTimeout(1100);
    const mixed = await page.evaluate(() => { const l = window.__iromaze.lab; return l.mixed === l.drops.length; });
    check(mixed, `${tag}: なぞると まざる`);
    // ↩ と 🗑
    await page.click("#undoBtn");
    check((await page.evaluate(() => window.__iromaze.lab.drops.length)) === 1, `${tag}: ↩ で 1てき もどる`);
    await page.click("#washBtn");
    check((await page.evaluate(() => window.__iromaze.lab.drops.length)) === 0, `${tag}: 🗑 で からっぽ`);

    // しろ・くろ ステージの みため
    await page.evaluate(() => window.__iromaze.startStage(9));
    await page.click('.tube[data-i="0"]'); await page.waitForTimeout(350);
    await page.click('.tube[data-i="3"]'); await page.waitForTimeout(350);
    await page.click("#mixBtn"); await page.waitForTimeout(1100);
    await page.screenshot({ path: `${out}/${tag}-6-pink-mixed.png` });

    // じゆう モード → ずかんに のこす
    await page.click("#backBtn"); await page.click("#backBtn");
    await page.click('[data-go="free"]');
    for (const i of [2, 3, 3]) { await page.click(`.tube[data-i="${i}"]`); await page.waitForTimeout(300); }
    await page.click("#mixBtn"); await page.waitForTimeout(1100);
    await page.screenshot({ path: `${out}/${tag}-7-free.png` });
    await page.click("#saveBtn");
    await page.fill("#nameInput", "あさの そら");
    await page.screenshot({ path: `${out}/${tag}-8-name.png` });
    await page.click("#nameOk");
    const z = await page.evaluate(() => JSON.parse(localStorage.getItem("iromaze-lab-v1")).zukan);
    check(z.length === 1 && z[0].name === "あさの そら", `${tag}: ずかんに ほぞん`);
    await page.click("#backBtn");
    await page.click('[data-go="zukan"]');
    await page.screenshot({ path: `${out}/${tag}-9-zukan.png` });
    await page.click("#backBtn");

    // ぬりえ
    await page.click('[data-go="nurie"]');
    await page.click(".pal >> nth=0");
    await page.click('#nurieSvg .fill >> nth=4');
    await page.click(".pal >> nth=1");
    await page.click('#nurieSvg .fill >> nth=0', { position: { x: 30, y: 30 } });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${tag}-10-nurie.png` });
    await noHScroll("nurie");
    await fits("nurie", "#nurieClear");
    for (let i = 1; i < 4; i++) {
      await page.click(`#nurieTabs button >> nth=${i}`);
      await page.screenshot({ path: `${out}/${tag}-10-nurie-${i}.png` });
    }
    await page.click("#backBtn");

    // ひかり
    await page.click('[data-go="light"]');
    await page.waitForTimeout(200);
    const center = await page.evaluate(() => {
      const cv = document.getElementById("lightCanvas"), g = cv.getContext("2d");
      return [...g.getImageData(300, 252, 1, 1).data];
    });
    check(center[0] === 255 && center[1] === 255 && center[2] === 255, `${tag}: 3つ かさなると しろ (${center})`);
    await page.screenshot({ path: `${out}/${tag}-11-light.png` });
    await fits("light", ".light-note");

    // おと オフ が のこる
    await page.click("#soundBtn");
    await page.reload();
    check((await page.getAttribute("#soundBtn", "aria-pressed")) === "false", `${tag}: おと オフ を おぼえる`);

    check(errors.length === 0, `${tag}: エラーなし ${errors.join(" / ")}`);
    await page.close();
  }
  await browser.close();
  console.log(failed ? `\n${failed} NG` : "\nALL OK");
  process.exit(failed ? 1 : 0);
})();
