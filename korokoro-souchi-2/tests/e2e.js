// NODE_PATH=$(npm root -g) node korokoro-souchi-2/tests/e2e.js [スクショの でぐち]
// Playwright（Chromium）で スマホたて・タブレットよこ を うごかして スクショを とる
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const out = process.argv[2] || path.join(__dirname, "shots");
fs.mkdirSync(out, { recursive: true });
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
      const w = await page.evaluate(() => ({ bw: document.documentElement.scrollWidth }));
      check(w.bw <= vp.width, `${tag} ${where}: よこに はみださない (${w.bw})`);
    };
    const fits = async (where, sel) => {
      const r = await page.evaluate((s) => { const e = document.querySelector(s).getBoundingClientRect(); return [e.top, e.bottom, e.left, e.right]; }, sel);
      check(r[1] <= vp.height + 1 && r[0] >= 0 && r[3] <= vp.width + 1, `${tag} ${where}: ${sel} が がめんに おさまる (${r.map(Math.round)})`);
    };
    const minTap = async (sel) => {
      const small = await page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.offsetParent)
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width < 55.5 || r.height < 55.5; }).map((e) => e.id || e.className), sel);
      check(small.length === 0, `${tag}: ${sel} は 56px いじょう ${small.join(",")}`);
    };
    // world → がめん の ざひょう
    const screen = async (x, y) => page.evaluate(([x, y]) => {
      const r = document.getElementById("cv").getBoundingClientRect();
      return { x: r.left + x / 1000 * r.width, y: r.top + y / 600 * r.height };
    }, [x, y]);

    await page.screenshot({ path: `${out}/${tag}-1-menu.png` });
    await noHScroll("menu");
    await minTap(".stage, .free-card");

    // ステージ1: ながい いたを こたえの ばしょに おいて スタート
    await page.click('.stage[data-i="0"]');
    await page.waitForTimeout(200);
    await fits("play", "#toolbox");
    await fits("play", "#stageBox");
    await fits("play", "#runBtn");
    await minTap(".tool, .act");
    await noHScroll("play");
    await page.screenshot({ path: `${out}/${tag}-2-stage1.png` });
    await page.click('.tool[data-t="plateL"]');
    let p = await screen(380, 320);
    await page.mouse.click(p.x, p.y);
    let placed = await page.evaluate(() => window.__koro.state.placed.map((q) => [q.t, q.x, q.y, q.a || 0]));
    check(placed.length === 1 && placed[0][0] === "plateL", `${tag}: いたを おけた ${JSON.stringify(placed)}`);
    // タップで まわす（15° ずつ）
    await page.mouse.click(p.x, p.y);
    placed = await page.evaluate(() => window.__koro.state.placed[0].a || 0);
    check(placed === 15, `${tag}: タップで 15° まわる (${placed})`);
    // ドラッグで うごかす
    const q = await screen(330, 300);
    await page.mouse.move(p.x, p.y); await page.mouse.down();
    await page.mouse.move((p.x + q.x) / 2, (p.y + q.y) / 2, { steps: 4 }); await page.mouse.move(q.x, q.y, { steps: 4 });
    await page.mouse.up();
    placed = await page.evaluate(() => { const s = window.__koro.state.placed[0]; return [s.x, s.y, s.a]; });
    check(Math.abs(placed[0] - 330) < 6 && Math.abs(placed[1] - 300) < 6 && placed[2] === 15, `${tag}: ドラッグで うごく ${placed}`);
    // こたえの ばしょに もどす
    p = await screen(330, 300);
    const r = await screen(380, 320);
    await page.mouse.move(p.x, p.y); await page.mouse.down();
    await page.mouse.move(r.x, r.y, { steps: 6 }); await page.mouse.up();
    await page.screenshot({ path: `${out}/${tag}-3-placed.png` });
    await page.click("#runBtn");
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${out}/${tag}-4-rolling.png` });
    await page.waitForSelector("#clearModal:not([hidden])", { timeout: 9000 }).catch(() => {});
    check(await page.isVisible("#clearModal"), `${tag}: ベルが なって クリア`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${tag}-5-clear.png` });
    const cleared = await page.evaluate(() => JSON.parse(localStorage.getItem("korokoro-souchi-2-v1")).cleared[0]);
    check(cleared === true, `${tag}: しんちょくを ほぞん`);
    // ⏹ で もとに もどる
    await page.click("#againBtn");
    const back = await page.evaluate(() => [window.__koro.state.running, window.__koro.state.placed.length]);
    check(!back[0] && back[1] === 1, `${tag}: もういちど で はいちが のこる ${back}`);

    // ゴミばこへ ドラッグで けす
    p = await screen(380, 320);
    const tr = await page.evaluate(() => { const e = document.getElementById("trash").getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; });
    await page.mouse.move(p.x, p.y); await page.mouse.down();
    await page.mouse.move(tr.x, tr.y, { steps: 8 }); await page.mouse.up();
    const after = await page.evaluate(() => [window.__koro.state.placed.length, window.__koro.state.tools.plateL]);
    check(after[0] === 0 && after[1] === 1, `${tag}: ゴミばこで けせる ${after}`);

    // ステージ15 を こたえで うごかす（バケツ・シーソー）
    await page.evaluate(() => window.__koro.load(14, true));
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${out}/${tag}-6-stage15.png` });
    await page.click("#runBtn");
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${out}/${tag}-7-stage15-run.png` });
    await page.waitForSelector("#clearModal:not([hidden])", { timeout: 9000 }).catch(() => {});
    check(await page.isVisible("#clearModal"), `${tag}: ステージ15 クリア`);
    await page.click("#againBtn");

    // じゆう モード: おいて ほぞん → よみこみ
    await page.click("#backBtn");
    await page.click("#freeBtn");
    await page.click('.tool[data-t="rubber"]');
    p = await screen(200, 200); await page.mouse.click(p.x, p.y);
    await page.click('.tool[data-t="plateM"]');
    p = await screen(260, 330); await page.mouse.click(p.x, p.y);
    await page.click('.tool[data-t="bell"]');
    p = await screen(700, 560); await page.mouse.click(p.x, p.y);
    await page.screenshot({ path: `${out}/${tag}-8-free.png` });
    await page.click("#slotBtn");
    await page.click('.slot >> nth=1 >> text=ほぞん');
    await page.screenshot({ path: `${out}/${tag}-9-slots.png` });
    await fits("slots", "#slotModal .sheet");
    await page.click("#slotClose");
    await page.click("#clearBtn");
    check(await page.evaluate(() => window.__koro.state.placed.length) === 0, `${tag}: どける で からっぽ`);
    await page.click("#slotBtn");
    await page.click('.slot >> nth=1 >> text=よむ');
    const loaded = await page.evaluate(() => window.__koro.state.placed.map((q) => q.t).join(","));
    check(loaded === "rubber,plateM,bell", `${tag}: スロットから よみこめる (${loaded})`);
    const slots = await page.evaluate(() => JSON.parse(localStorage.getItem("korokoro-souchi-2-v1")).slots.length);
    check(slots === 5, `${tag}: スロットは 5つ (${slots})`);

    // おと オフ
    await page.click("#soundBtn");
    const snd = await page.evaluate(() => JSON.parse(localStorage.getItem("korokoro-souchi-2-v1")).sound);
    check(snd === false, `${tag}: おと オフ を ほぞん`);

    check(errors.length === 0, `${tag}: エラーなし ${errors.join(" / ")}`);
    await page.close();
  }
  await browser.close();
  console.log(failed ? `FAILED ${failed}` : "ALL OK");
  process.exit(failed ? 1 : 0);
})();
