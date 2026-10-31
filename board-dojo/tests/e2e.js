// NODE_PATH=$(npm root -g) node board-dojo/tests/e2e.js [スクショ の でぐち]
// ローカル HTTP サーバー で ひらいて（Web Worker を つかう ため）、スマホ たて・タブレット よこ で
// 5つ の ゲーム を CPU どうし で さいご まで すすめ、ひと の て・ヒント・まった・ふりかえり も ためす
const { chromium } = require("playwright");
const http = require("http");
const path = require("path");
const fs = require("fs");
const root = path.resolve(__dirname, "..");
const out = process.argv[2] || path.join(__dirname, "shots");
fs.mkdirSync(out, { recursive: true });
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    if (req.url.split("?")[0] === "/") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(fs.readFileSync(path.join(root, "index.html"))); }
    res.writeHead(404); return res.end();
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
});

(async () => {
  await new Promise((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  let failed = 0;
  const check = (ok, msg) => { if (!ok) { failed++; console.log("NG", msg); } else console.log("ok", msg); };
  const GAMES = [
    ["reversi", { size: 8 }], ["gomoku", { size: 15, ban33: false }], ["marubatsu", {}], ["yonnarabe", {}], ["hakotori", { size: 3 }]
  ];
  for (const [tag, vp] of [["phone", { width: 390, height: 844 }], ["tablet", { width: 1024, height: 768 }]]) {
    const page = await browser.newPage({ viewport: vp, hasTouch: true });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    check(await page.evaluate(() => window.BDapp.worker()), `${tag}: Web Worker で けいさん`);
    const noHScroll = async (where) => {
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      check(sw <= vp.width, `${tag} ${where}: よこ に はみださない (${sw})`);
    };
    const boardFits = async (where, sel = "#board") => {
      const r = await page.evaluate((s) => { const e = document.querySelector(s).getBoundingClientRect(); return [e.top, e.bottom, e.left, e.right, e.width]; }, sel);
      check(r[1] <= vp.height + 1 && r[0] >= 0 && r[2] >= 0 && r[3] <= vp.width + 1, `${tag} ${where}: ばん が がめん に おさまる (${r.map(Math.round)})`);
      return r;
    };
    await page.screenshot({ path: `${out}/${tag}-home.png`, fullPage: true });
    await noHScroll("ホーム");

    // じゅんび がめん
    await page.click('[data-game="gomoku"]');
    await page.screenshot({ path: `${out}/${tag}-setup.png`, fullPage: true });
    await noHScroll("じゅんび");
    await page.click("#back");

    // CPU どうし で 5つ とも さいご まで
    for (const [id, opts] of GAMES) {
      const level = id === "marubatsu" ? 4 : 2;
      await page.evaluate(([id, opts, level]) => window.BDapp.start({ id, opts, mode: "watch", level, human: 0, face: false }), [id, opts, level]);
      await page.waitForTimeout(1600);
      await boardFits(`${id} たいきょく`);
      await noHScroll(`${id} たいきょく`);
      await page.screenshot({ path: `${out}/${tag}-${id}-play.png` });
      const t0 = Date.now();
      await page.waitForFunction(() => window.BDapp.state().over, null, { timeout: 240000, polling: 300 });
      const s = await page.evaluate(() => window.BDapp.state());
      check(s.over && s.result !== null, `${tag} ${id}: CPU どうし で さいご まで（${s.moves}て・けっか ${s.result}・${Math.round((Date.now() - t0) / 1000)}びょう）`);
      await page.waitForSelector("#result:not([hidden])");
      await page.screenshot({ path: `${out}/${tag}-${id}-result.png` });
      await page.click("#res-board");
    }

    // ひと の て: リバーシ 6×6 で ほんとう に タップ → CPU が かえす → ヒント → まった
    await page.evaluate(() => window.BDapp.start({ id: "reversi", opts: { size: 6 }, mode: "cpu", level: 3, human: 1, face: false }));
    await page.waitForTimeout(300);
    const legal = await page.$$("#board .dot");
    check(legal.length === 4, `${tag} リバーシ: おける ところ の しるし 4つ (${legal.length})`);
    const rect = await page.$("#board rect[data-m='8']");
    const box = await rect.boundingBox();
    check(box.width >= 44, `${tag} リバーシ 6×6: ます が ゆび で おせる おおきさ (${Math.round(box.width)}px)`);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForFunction(() => window.BDapp.state().moves >= 2, null, { timeout: 5000 });
    check(true, `${tag} リバーシ: タップ で おけて、CPU が 1びょう いない に かえした`);
    await page.click('#side1 [data-act="hint"]');
    await page.waitForSelector("#board .hint", { timeout: 4000 });
    const coach = await page.textContent("#side1 [data-coach]");
    check(/かえせる/.test(coach), `${tag} ヒント に りゆう: ${coach.trim().slice(0, 40)}`);
    await page.screenshot({ path: `${out}/${tag}-reversi-hint.png` });
    await page.click('#side1 [data-act="undo"]');
    check((await page.evaluate(() => window.BDapp.state().moves)) === 0, `${tag} まった で もどる`);

    // ごもく 15×15: ちいさい ます は ズーム か 2かい タップ
    await page.evaluate(() => window.BDapp.start({ id: "gomoku", opts: { size: 15, ban33: true }, mode: "cpu", level: 1, human: 1, face: false }));
    await page.waitForTimeout(200);
    const cell = await (await page.$("#board rect[data-m='112']")).boundingBox();
    if (cell.width < 40) {
      const zb = await page.$('#side1 [data-act="zoom"]');
      check(!!zb, `${tag} ごもく 15×15: ます ${Math.round(cell.width)}px → ズーム ボタン が ある`);
      await zb.click();
      const big = await (await page.$("#board rect[data-m='112']")).boundingBox();
      check(big.width >= 40, `${tag} ズーム で ます が ${Math.round(big.width)}px`);
      await page.touchscreen.tap(big.x + big.width / 2, big.y + big.height / 2);
      await page.waitForFunction(() => window.BDapp.state().moves >= 1, null, { timeout: 3000 });
      await page.waitForTimeout(1300);
      await page.screenshot({ path: `${out}/${tag}-gomoku-zoom.png` });
    } else {
      check(true, `${tag} ごもく 15×15: ます ${Math.round(cell.width)}px（ズーム なし で おせる）`);
      await page.touchscreen.tap(cell.x + cell.width / 2, cell.y + cell.height / 2);
      await page.waitForFunction(() => window.BDapp.state().moves >= 1, null, { timeout: 3000 });
    }

    // ふたり・むかいあう
    await page.evaluate(() => window.BDapp.start({ id: "yonnarabe", opts: {}, mode: "pvp", level: 2, human: 0, face: true }));
    await page.waitForTimeout(200);
    for (const c of [3, 3, 2, 4]) await page.evaluate((c) => window.BDapp.tap(c), c);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${tag}-face.png` });
    await noHScroll("むかいあう");

    // ふりかえり: まるばつ で わざと まちがえる
    await page.evaluate(() => window.BDapp.start({ id: "marubatsu", opts: {}, mode: "cpu", level: 4, human: 2, face: false }));
    let guard = 0;
    while (!(await page.evaluate(() => window.BDapp.state().over)) && guard++ < 20) {
      await page.waitForFunction(() => { const s = window.BDapp.state(); return s.over || !s.busy; }, null, { timeout: 5000 });
      await page.waitForTimeout(150);
      await page.evaluate(() => { const r = document.querySelector("#board rect[data-m]"); if (r && !window.BDapp.state().busy) window.BDapp.tap(+r.getAttribute("data-m")); });
      await page.waitForTimeout(300);
    }
    await page.waitForSelector("#result:not([hidden])", { timeout: 5000 });
    await page.click("#res-review");
    await page.waitForFunction(() => !/かんがえちゅう/.test(document.querySelector("#rv-say").textContent), null, { timeout: 15000 });
    const say = await page.textContent("#rv-say");
    const pts = await page.$$("#rv-points [data-pt]");
    check(pts.length >= 1 && /わかれめ/.test(say), `${tag} ふりかえり: わかれめ を ${pts.length}か しょ（${say.trim().slice(0, 30)}）`);
    await boardFits("ふりかえり", "#rv-board");
    await page.screenshot({ path: `${out}/${tag}-review.png`, fullPage: true });
    await page.click("#rv-first");
    await page.click("#rv-next");
    check((await page.inputValue("#rv-slider")) === "1", `${tag} ふりかえり: 1て ずつ すすむ`);

    // せんせき
    await page.click("#back"); await page.click("#back");
    await page.click("#go-stats");
    await page.screenshot({ path: `${out}/${tag}-stats.png`, fullPage: true });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("board-dojo:v1")).stats.marubatsu.cpu4);
    check(saved && saved.w + saved.l + saved.d >= 1, `${tag} せんせき が ほぞん される ${JSON.stringify(saved)}`);
    check(errors.length === 0, `${tag}: エラー なし ${errors.join(" / ")}`);
    await page.close();
  }
  await browser.close();
  server.close();
  console.log(failed ? `NG ${failed}` : "ALL OK");
  process.exit(failed ? 1 : 0);
})();
