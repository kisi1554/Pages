// NODE_PATH=$(npm root -g) node kirigami-moyou/tests/e2e.js [スクショの でぐち]
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
      const w = await page.evaluate(() => {
        const v = [...document.querySelectorAll(".view")].find((x) => !x.hidden);
        return { sw: v ? v.scrollWidth : 0, cw: v ? v.clientWidth : 0, bw: document.documentElement.scrollWidth };
      });
      check(w.sw <= w.cw + 1 && w.bw <= vp.width, `${tag} ${where}: よこに はみださない (${w.sw}/${w.cw})`);
    };
    const minTap = async (where) => {
      const small = await page.evaluate(() => [...document.querySelectorAll("button")].filter((e) => e.offsetParent)
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width < 47.5 || r.height < 47.5; }).map((e) => e.id || e.className));
      check(small.length === 0, `${tag} ${where}: ボタンは 48px いじょう ${small.join(",")}`);
    };
    const toolsFit = async (where) => {
      const r = await page.evaluate(() => [...document.querySelectorAll(".tool")].filter((e) => e.offsetParent).map((e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; }));
      check(r.every((b) => b[0] >= 0 && b[1] >= 0 && b[2] <= vp.width + 1 && b[3] <= vp.height + 1), `${tag} ${where}: ボタンが がめんに おさまる`);
    };
    const phase = () => page.evaluate(() => window.__kirigami.play.phase);
    const waitPhase = (ph) => page.waitForFunction((p) => window.__kirigami.play.phase === p, ph, { timeout: 15000 });
    // せかいの ざひょう の てん を ゆびで なぞる
    const drag = async (pts) => {
      const box = await page.locator("#cv").boundingBox();
      const sp = await page.evaluate((p) => p.map(window.__kirigami.toScreen), pts);
      await page.mouse.move(box.x + sp[0][0], box.y + sp[0][1]);
      await page.mouse.down();
      for (const p of sp.slice(1)) await page.mouse.move(box.x + p[0], box.y + p[1], { steps: 2 });
      await page.mouse.up();
    };

    await page.screenshot({ path: `${out}/${tag}-1-menu.png` });
    await noHScroll("menu"); await minTap("menu");

    // じゆうに きる
    await page.click('[data-go="setup"]');
    await page.click(".swatch:nth-child(7)");
    await page.screenshot({ path: `${out}/${tag}-2-setup.png` });
    await noHScroll("setup"); await minTap("setup");

    await page.click('[data-fold="quarter"]');
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/${tag}-3-folding.png` });
    await waitPhase("cut");
    await page.screenshot({ path: `${out}/${tag}-4-cut.png` });
    await toolsFit("cut"); await minTap("cut");
    // まるく なぞる（とじた せん）
    const circ = Array.from({ length: 25 }, (_, i) => [0.55 + 0.18 * Math.cos((i / 24) * 6.283), 0.55 + 0.18 * Math.sin((i / 24) * 6.283)]);
    await drag(circ);
    // ふち から ふち（まんなか の かど）
    await drag([[0.3, -0.05], [0.15, 0.12], [-0.05, 0.3]]);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${tag}-5-cutting.png` });
    let cuts = await page.evaluate(() => window.__kirigami.play.cuts.map((c) => c.k));
    check(cuts.join() === "loop,edge", `${tag}: なぞった きりかた が はんてい される (${cuts})`);
    await page.click("#undoBtn");
    cuts = await page.evaluate(() => window.__kirigami.play.cuts.length);
    check(cuts === 1, `${tag}: もどす で 1つ へる`);
    await drag([[0.3, -0.05], [0.15, 0.12], [-0.05, 0.3]]);
    await drag([[1.05, 0.62], [0.82, 0.8], [0.62, 1.05]]);
    await page.waitForTimeout(1600);
    await page.click("#openBtn");
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${tag}-6-opening.png` });
    await waitPhase("open");
    await page.screenshot({ path: `${out}/${tag}-7-open.png` });
    await toolsFit("open");
    await page.click("#saveBtn");
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kirigami-moyou:gallery")).length);
    check(saved === 1, `${tag}: ギャラリーに のこる`);
    // もっと きる → また おる
    await page.click("#moreBtn");
    await waitPhase("cut");
    check((await page.evaluate(() => window.__kirigami.play.cuts.length)) === 3, `${tag}: もっと きる で きりとり が のこる`);

    // ゆき
    await page.click("#backBtn");
    await page.click('[data-fold="snow"]');
    await waitPhase("cut");
    await drag([[0.12, -0.03], [0.14, 0.04], [0.09, 0.07]]);
    await drag(Array.from({ length: 17 }, (_, i) => [0.5 + 0.06 * Math.cos((i / 16) * 6.283), 0.13 + 0.06 * Math.sin((i / 16) * 6.283)]));
    await drag([[0.9, -0.05], [0.72, 0.1], [0.62, 0.42]]);
    await page.screenshot({ path: `${out}/${tag}-8-snow-cut.png` });
    await page.click("#openBtn");
    await waitPhase("open");
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}/${tag}-9-snow-open.png` });

    // ギャラリー
    await page.click("#backBtn"); await page.click("#backBtn");
    await page.click('[data-go="gallery"]');
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}/${tag}-10-gallery.png` });
    await page.click(".gal");
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}/${tag}-11-viewer.png` });
    await page.click("#viewerClose");
    await page.click("#backBtn");

    // もんだい: ヒントの せん を なぞって クリア
    await page.click('[data-go="puzzles"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${tag}-12-puzzles.png` });
    await noHScroll("puzzles"); await minTap("puzzles");
    await page.click(".pz:nth-child(2)");
    await waitPhase("cut");
    await page.click("#hintBtn");
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}/${tag}-13-puzzle-hint.png` });
    // まちがい: なにも きらずに ひらく
    await page.click("#openBtn");
    await waitPhase("open");
    await page.waitForTimeout(400);
    check(await page.evaluate(() => !window.__kirigami.play.result.ok), `${tag}: きらないと クリア に ならない`);
    await page.click("#fixBtn");
    await waitPhase("cut");
    const strokes = await page.evaluate(() => window.__kirigami.play.puzzle.strokes);
    for (const s of strokes) await drag(s.map((p) => [p[0] + 0.004, p[1] - 0.003]));
    await page.click("#openBtn");
    await waitPhase("open");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${tag}-14-puzzle-clear.png` });
    const res = await page.evaluate(() => window.__kirigami.play.result);
    check(res.ok, `${tag}: ヒントを なぞると クリア (${Math.round(res.s * 100)}%)`);
    check(await page.isVisible("#nextBtn"), `${tag}: つぎの もんだい ボタン`);
    // ゆき の もんだい も
    await page.click("#backBtn");
    await page.click(".pz:nth-child(12)");
    await waitPhase("cut");
    await page.click("#hintBtn");
    const s12 = await page.evaluate(() => window.__kirigami.play.puzzle.strokes);
    for (const s of s12) await drag(s);
    await page.screenshot({ path: `${out}/${tag}-15-snow-puzzle.png` });
    await page.click("#openBtn");
    await waitPhase("open");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${tag}-16-snow-puzzle-open.png` });
    const r12 = await page.evaluate(() => window.__kirigami.play.result);
    check(r12.ok, `${tag}: ゆきの もんだい も クリア (${Math.round(r12.s * 100)}%)`);
    await page.click("#backBtn");
    await page.waitForTimeout(300);
    const clears = await page.evaluate(() => document.querySelectorAll(".pz.clear").length);
    check(clears === 2, `${tag}: クリアの しるし が のこる (${clears})`);

    // おと オフ が のこる
    await page.click("#soundBtn");
    await page.reload();
    check((await page.getAttribute("#soundBtn", "aria-pressed")) === "false", `${tag}: おと オフ が のこる`);
    // localStorage が こわれていても うごく
    await page.evaluate(() => { localStorage.setItem("kirigami-moyou:gallery", "{bad"); localStorage.setItem("kirigami-moyou:puzzles", "null"); });
    await page.reload();
    await page.click('[data-go="gallery"]');
    await page.click("#backBtn");
    await page.click('[data-go="puzzles"]');
    check(errors.length === 0, `${tag}: エラー なし ${errors.join(" / ")}`);
    await page.close();
  }
  await browser.close();
  console.log(failed ? `${failed} NG` : "ぜんぶ ok");
  process.exit(failed ? 1 : 0);
})();
