// NODE_PATH=$(npm root -g) node kassha-lab/tests/e2e.js [スクショの でぐち]
// Playwright（Chromium）で スマホたて（390×844）・タブレットよこ（1024×768）を うごかして スクショを とる
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const out = process.argv[2] || path.join(__dirname, "shots");
const url = "file://" + path.resolve(__dirname, "../index.html");
fs.mkdirSync(out, { recursive: true });

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
      const bw = await page.evaluate(() => document.documentElement.scrollWidth);
      check(bw <= vp.width, `${tag} ${where}: よこに はみださない (${bw})`);
    };
    // SVG の ざひょう → がめんの ざひょう
    const svgXY = (sel, x, y) => page.evaluate(([s, x, y]) => {
      const svg = document.querySelector(s), p = svg.createSVGPoint(); p.x = x; p.y = y;
      const q = p.matrixTransform(svg.getScreenCTM()); return [q.x, q.y];
    }, [sel, x, y]);
    const tap = async (sel, x, y) => {
      // ばんの うえを がめんの うえに あわせる（スマホは したに どうぐばこ が はりつく）
      await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight - 150) document.querySelector(s).scrollIntoView({ block: "start" }); }, sel);
      const [cx, cy] = await svgXY(sel, x, y);
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(80);
    };
    const num = async (sel) => parseFloat(await page.locator(sel).textContent());

    // ---------- たいけん ----------
    check((await page.locator("#tkChips .chip").count()) === 6, `${tag}: しくみは 6つ`);
    check((await page.locator("#tkChips .chip:disabled").count()) === 5, `${tag}: はじめは 定滑車 だけ`);
    await noHScroll("たいけん");
    const drag = async (fromY, toY) => {
      await page.locator("#tkSvg").scrollIntoViewIfNeeded();
      const [x0, y0] = await svgXY("#tkSvg", 220, fromY);
      const [, y1] = await svgXY("#tkSvg", 220, toY);
      await page.mouse.move(x0, y0); await page.mouse.down();
      for (let k = 1; k <= 12; k++) await page.mouse.move(x0, y0 + (y1 - y0) * k / 12);
      await page.mouse.up();
    };
    await drag(250, 322);                                   // 24cm ひく
    check(Math.abs((await num("#tkL")) - 24) < 0.6, `${tag}: 定滑車 24cm ひいた (${await num("#tkL")})`);
    check((await num("#tkF")) === 20, `${tag}: 定滑車の ちから 20g`);
    check(Math.abs((await num("#tkH")) - (await num("#tkL"))) < 0.11, `${tag}: 定滑車は おなじ たかさ`);
    await page.screenshot({ path: path.join(out, `${tag}-taiken.png`) });
    await drag(200, 400);                                   // さいごまで
    check((await num("#tkL")) === 48, `${tag}: 48cm まで ひいた`);
    check(await page.locator("#tkSay.good").isVisible(), `${tag}: とうちゃく メッセージ`);
    check(await page.locator("#tkNext").isVisible(), `${tag}: つぎへ ボタン`);
    await page.click("#tkNext");
    // 動滑車: うえに ひく
    await drag(300, 150);
    check((await num("#tkL")) === 48 && (await num("#tkH")) === 24 && (await num("#tkF")) === 10, `${tag}: 動滑車 ちから はんぶん・ながさ 2ばい`);
    // のこりは ほぞんで ときあかし → まとめ
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("kassha-lab-v1"));
      ["fixmove", "move2", "move3"].forEach((k) => (s.tk.done[k] = { W: 20 }));
      s.tk.cur = 5; localStorage.setItem("kassha-lab-v1", JSON.stringify(s));
    });
    await page.reload();
    check((await page.locator('#tkChips .chip[aria-pressed="true"]').getAttribute("data-i")) === "5", `${tag}: 輪軸 から はじまる`);
    await drag(200, 400);
    check((await num("#tkF")) === 6.67 || (await page.locator("#tkF").textContent()).includes("6.7"), `${tag}: 輪軸 20÷3 (${await page.locator("#tkF").textContent()})`);
    check(Math.abs((await num("#tkH")) - 16) < 1e-6, `${tag}: 輪軸 48÷3＝16cm`);
    check(await page.locator("#tkSum").isVisible(), `${tag}: まとめ が でる`);
    const sumText = await page.locator("#tkSum").textContent();
    check(sumText.includes("120") && sumText.includes("しごとの げんり"), `${tag}: しごとの げんり（20×6＝120）`);
    await page.locator("#tkSum").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `${tag}-taiken-sum.png`), fullPage: true });
    await noHScroll("まとめ");

    // ---------- くみたて ----------
    await page.click('.tab[data-tab="puzzle"]');
    await page.waitForTimeout(100);
    check((await page.locator("#pzList button").count()) === 12, `${tag}: ステージ 12`);
    await page.click('.tool[data-tool="fixed"]');
    await tap("#pzSvg", 140, 70);
    check((await page.locator("#pzSvg .pulley.fixed").count()) === 1, `${tag}: 定滑車を おいた`);
    await page.click('.tool[data-tool="rope"]');
    await tap("#pzSvg", 120, 470);      // おもり
    await tap("#pzSvg", 140, 70);       // 定滑車
    await page.click("#pzHand");
    await page.screenshot({ path: path.join(out, `${tag}-puzzle-build.png`) });
    await page.click("#pzGo");
    await page.waitForTimeout(2600);
    check(await page.locator("#pzSay.good").isVisible(), `${tag}: ステージ1 クリア (${await page.locator("#pzSay").textContent()})`);
    check((await page.locator("#pzList button").nth(0).textContent()).includes("★★★"), `${tag}: ★3`);
    // ステージ 5（ピアノ）: まず 動滑車 1こ で おもすぎる → 2こ で クリア
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("kassha-lab-v1"));
      s.pz.stars = [3, 3, 3, 3]; s.pz.cur = 4; localStorage.setItem("kassha-lab-v1", JSON.stringify(s));
    });
    await page.reload();
    await page.click('.tab[data-tab="puzzle"]');
    check((await page.locator('#pzList button[aria-pressed="true"]').getAttribute("data-i")) === "4", `${tag}: ステージ5`);
    await page.click('.tool[data-tool="move"]');
    await tap("#pzSvg", 120, 400);
    await page.click('.tool[data-tool="fixed"]');
    await tap("#pzSvg", 160, 70);
    await page.click('.tool[data-tool="rope"]');
    await tap("#pzSvg", 100, 10);       // てんじょう
    await tap("#pzSvg", 120, 400);      // 動滑車
    await tap("#pzSvg", 160, 70);       // 定滑車
    await page.click("#pzHand");
    await page.click("#pzGo");
    await page.waitForTimeout(1600);
    check(await page.locator("#pzSay.bad").isVisible() && (await page.locator("#pzSay").textContent()).includes("おもくて"), `${tag}: 動滑車 1こ は おもすぎ`);
    await page.screenshot({ path: path.join(out, `${tag}-puzzle-heavy.png`) });
    await page.click("#pzClear");
    await page.click('.tool[data-tool="move"]');
    await tap("#pzSvg", 120, 400);
    await tap("#pzSvg", 140, 320);
    await page.click('.tool[data-tool="fixed"]');
    await tap("#pzSvg", 180, 70);
    await page.click('.tool[data-tool="rope"]');
    await tap("#pzSvg", 100, 10);
    await tap("#pzSvg", 120, 400);
    await tap("#pzSvg", 140, 350);      // うえの 動滑車の フック（ひもは のこり 1。ひもの どうぐは その まま）
    check((await page.locator('.tool[data-tool="rope"]').getAttribute("aria-pressed")) === "true", `${tag}: ひもの どうぐが つづく`);
    await tap("#pzSvg", 120, 10);
    await tap("#pzSvg", 140, 320);
    await tap("#pzSvg", 180, 70);
    await page.click("#pzHand");
    await page.click("#pzGo");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, `${tag}-puzzle-anim.png`) });
    await page.waitForTimeout(2600);
    check(await page.locator("#pzSay.good").isVisible(), `${tag}: ピアノ クリア (${await page.locator("#pzSay").textContent()})`);
    await page.locator("#pzSvg").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `${tag}-puzzle-clear.png`) });
    await noHScroll("くみたて");

    // ---------- もんだい ----------
    await page.click('.tab[data-tab="mondai"]');
    check((await page.locator("#mqList button").count()) >= 20, `${tag}: もんだい 20もん いじょう`);
    await page.click('#mqList button[data-i="6"]');      // 重さのある動滑車 2こ → 35
    check((await page.locator("#mqText ruby").count()) > 3, `${tag}: もんだいぶんに ふりがな`);
    check((await page.locator("#mqSvg .pulley").count()) === 3, `${tag}: ず が SVG`);
    const press = async (s) => { for (const ch of s) await page.click(`#mqPad button[data-k="${ch}"]`); await page.click('#mqPad button[data-k="ent"]'); };
    await press("40");
    check(await page.locator("#mqSay.bad").isVisible(), `${tag}: まちがい`);
    await page.click("#mqHintBtn");
    check((await page.locator("#mqHints li").count()) === 1 && (await page.locator("#mqHints li").textContent()).includes("110"), `${tag}: ヒント 1`);
    await page.waitForTimeout(800);
    await press("35");
    check(await page.locator("#mqSay.good").isVisible(), `${tag}: せいかい 35g`);
    await page.screenshot({ path: path.join(out, `${tag}-mondai.png`) });
    await page.click("#mqBack");
    check((await page.locator('#mqList button[data-i="6"] .st').textContent()).includes("★"), `${tag}: ★が つく`);
    await noHScroll("もんだい");

    check(errors.length === 0, `${tag}: エラー なし ${errors.join(" / ")}`);
    await page.close();
  }
  await browser.close();
  console.log(failed ? `\n${failed} こ NG` : "\nぜんぶ ok");
  process.exit(failed ? 1 : 0);
})();
