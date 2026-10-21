// CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome NODE_PATH=$(npm root -g) node samurai-ninja/tests/e2e.js [スクショの でぐち]
// たてスマホ（390×844）・よこタブレット（1024×768）で うごかして スクショを とる
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
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const [tag, vp] of [["phone", { width: 390, height: 844 }], ["tablet", { width: 1024, height: 768 }]]) {
    const page = await browser.newPage({ viewport: vp, hasTouch: true, deviceScaleFactor: 2 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    // よみあげ を きろく する（こえ の テスト）
    await page.addInitScript(() => {
      window.__said = [];
      if (window.speechSynthesis) window.speechSynthesis.speak = (u) => window.__said.push(u.text);
    });
    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await wait(400);
    const noHScroll = async (where) => {
      const bw = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll(".screen:not([hidden])")].map((s) => s.scrollWidth)));
      check(bw <= vp.width, `${tag} ${where}: よこに はみださない (${bw})`);
    };
    const minBtn = async (where, sel) => {
      const small = await page.evaluate((s) => [...document.querySelectorAll(s)].filter((b) => b.offsetParent).map((b) => { const r = b.getBoundingClientRect(); return [b.textContent.trim().slice(0, 8), Math.round(r.width), Math.round(r.height)]; }).filter((x) => x[1] < 64 || x[2] < 64), sel);
      check(small.length === 0, `${tag} ${where}: ボタンは 64px いじょう ${JSON.stringify(small)}`);
    };
    const inView = async (where, sel) => {
      const bad = await page.evaluate(([s, w, h]) => [...document.querySelectorAll(s)].map((e) => e.getBoundingClientRect()).filter((r) => r.bottom > h + 1 || r.top < 0 || r.left < 0 || r.right > w + 1).length, [sel, vp.width, vp.height]);
      check(bad === 0, `${tag} ${where}: ${sel} が がめんに おさまる`);
    };

    await page.screenshot({ path: `${out}/${tag}-1-title.png` });
    await noHScroll("タイトル"); await minBtn("タイトル", "#scr-title button");

    // CPU と たいせん
    await page.click('[data-go="cpu"]'); await wait(200);
    await page.screenshot({ path: `${out}/${tag}-2-pick.png` });
    await noHScroll("えらぶ"); await minBtn("えらぶ", "#scr-pick button");
    await page.click("#pick-go");
    await wait(4200); // れい → はじめ！
    const phase = await page.evaluate(() => window.__sn.B.phase);
    check(phase === "fight", `${tag} れい の あとに たたかいが はじまる (${phase})`);
    const said0 = await page.evaluate(() => window.__said.slice());
    check(said0.includes("れい") && said0.includes("はじめ！"), `${tag} こえ: れい・はじめ ${JSON.stringify(said0)}`);
    // みぎへ あるいて こうげき（CPU は しばらく おやすみ）
    const cpu = await page.evaluate(() => { const B = window.__sn.B; B.cpuSave = B.cpu; B.cpu = { input: () => ({}) }; });
    const before = await page.evaluate(() => window.__sn.B.m.fighters[0].x);
    const rb = await page.locator('.pk[data-k="r"]').boundingBox();
    await page.touchscreen.tap(rb.x + rb.width / 2, rb.y + rb.height / 2);
    await page.dispatchEvent('.pk[data-k="r"]', "pointerdown", { pointerId: 7, isPrimary: true, pointerType: "touch" });
    await wait(500);
    const mid = await page.evaluate(() => window.__sn.B.m.fighters[0].x);
    await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7 })));
    check(mid > before + 20, `${tag} ▶ ボタンで まえに すすむ (${before.toFixed(0)}→${mid.toFixed(0)})`);
    await page.keyboard.down("KeyF"); await wait(60); await page.keyboard.up("KeyF");
    await page.evaluate(() => { const B = window.__sn.B; B.cpu = B.cpuSave; });
    await wait(900);
    await page.screenshot({ path: `${out}/${tag}-3-battle.png` });
    // ひっさつ（いあい）: カットイン と こえ
    await page.evaluate(() => { const B = window.__sn.B; B.cpuSave = B.cpu; B.cpu = { input: () => ({}) }; B.m.fighters[0].sp = 100; });
    await page.keyboard.down("KeyH"); await wait(250);
    const cut = await page.evaluate(() => !!window.__sn.B.cutin);
    check(cut, `${tag} ひっさつで カットイン`);
    await page.screenshot({ path: `${out}/${tag}-3b-cutin.png` });
    await wait(900); await page.keyboard.up("KeyH"); await wait(300);
    await page.screenshot({ path: `${out}/${tag}-3c-iai.png` });
    const said1 = await page.evaluate(() => window.__said.slice());
    check(said1.includes("いあい ぎり！"), `${tag} こえ: いあい ぎり！`);
    await page.evaluate(() => { const B = window.__sn.B; B.cpu = B.cpuSave; });
    await noHScroll("たたかい"); await minBtn("たたかい", "#scr-battle button");
    await inView("たたかい", ".pk"); await inView("たたかい", "#cv");
    const cvBox = await page.locator("#cv").boundingBox(), padBox = await page.locator("#pads").boundingBox();
    check(cvBox.y + cvBox.height <= padBox.y + 1, `${tag} ステージは ボタンの うえ`);
    // ずっと たたかわせて けっかまで（P1 は CPU に まかせる）
    await page.evaluate(() => { const B = window.__sn.B; B.m.fighters[1].hp = 1; B.m.fighters[0].sp = 100; });
    await page.evaluate(() => { const B = window.__sn.B; B.m.fighters[1].hp = 0; });
    await page.keyboard.down("KeyF"); await wait(60); await page.keyboard.up("KeyF");
    await wait(700);
    await page.screenshot({ path: `${out}/${tag}-4a-shoubuari.png` });
    await wait(2300);
    await page.screenshot({ path: `${out}/${tag}-4-maitta.png` });
    const said2 = await page.evaluate(() => window.__said.slice());
    check(said2.includes("しょうぶ あり！") && said2.includes("まいった！"), `${tag} こえ: しょうぶ あり・まいった`);
    await wait(4500);
    const resOpen = await page.evaluate(() => !document.querySelector("#modal").hidden);
    check(resOpen, `${tag} まいった → おじぎ → けっか が でる`);
    await page.screenshot({ path: `${out}/${tag}-5-result.png` });
    await page.click("#modal-btns button:last-child"); await wait(200);

    // ストーリー
    await page.click('[data-go="story"]'); await wait(200);
    await page.screenshot({ path: `${out}/${tag}-6-story.png` });
    await noHScroll("ストーリー"); await minBtn("ストーリー", "#scr-story button:not(:disabled)");
    await page.click(".st-item.next"); await wait(1000);
    await page.screenshot({ path: `${out}/${tag}-7-story-intro.png` });
    // かった ことに する
    await wait(3500);
    await page.evaluate(() => { window.__sn.B.m.fighters[1].hp = 0; });
    await page.keyboard.down("KeyF"); await wait(60); await page.keyboard.up("KeyF");
    await wait(8500);
    const got = await page.evaluate(() => window.__sn.save.cards.slice());
    check(got.includes("bushi"), `${tag} ストーリー 1 を かつと ずかん カード (${got})`);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("samurai-ninja-v1")));
    check(stored && stored.story.samurai === 1, `${tag} localStorage に しんちょく`);
    await page.screenshot({ path: `${out}/${tag}-8-story-win.png` });
    await page.click("#modal-btns button:last-child"); await wait(200);
    await page.click('#scr-story [data-go="title"]'); await wait(100);

    // ずかん（ぜんぶ ひらいて みる）
    await page.evaluate(() => { window.__sn.save.cards = ["bushi", "katana", "yoroi", "shiro", "rei", "shinobi", "shuriken", "kunai", "igakoga", "fuku"]; });
    await page.click('[data-go="zukan"]'); await wait(200);
    await page.screenshot({ path: `${out}/${tag}-9-zukan.png`, fullPage: true });
    await noHScroll("ずかん");
    const rubies = await page.evaluate(() => document.querySelectorAll("#cards ruby").length);
    check(rubies > 0, `${tag} ずかん の かんじに ふりがな (${rubies})`);
    await page.click(".zcard:nth-child(6)"); await wait(200);
    await page.screenshot({ path: `${out}/${tag}-10-card.png` });
    const both = await page.evaluate(() => [!!document.querySelector("#modal-body .box.story"), !!document.querySelector("#modal-body .box.real")]);
    check(both[0] && both[1], `${tag} しのび の カードは「おはなし」と「ほんとう」を わけて かく`);
    await page.click("#modal-btns button"); await wait(100);
    await page.click('#scr-zukan [data-go="title"]'); await wait(100);

    // 2人 たいせん（マルチタッチ）
    await page.click('[data-go="vs"]'); await wait(200);
    await page.click("#pick-go"); await wait(4200);
    await page.evaluate(() => {
      const fire = (sel, id) => document.querySelector(sel).dispatchEvent(new PointerEvent("pointerdown", { pointerId: id, bubbles: true, pointerType: "touch" }));
      fire('.p1c .pk[data-k="r"]', 11); fire('.p2c .pk[data-k="l"]', 12); fire('.p2c .pk[data-k="j"]', 13);
    });
    const ins = await page.evaluate(() => [window.__sn.readInput(0), window.__sn.readInput(1)]);
    check(ins[0].r && !ins[0].l && ins[1].l && ins[1].j && !ins[1].r, `${tag} 2人: ひだり＝1P、みぎ＝2P を どうじに おせる ${JSON.stringify(ins)}`);
    await wait(500);
    await page.screenshot({ path: `${out}/${tag}-11-vs.png` });
    await noHScroll("2人"); await minBtn("2人", "#scr-battle button"); await inView("2人", ".pk");
    const halves = await page.evaluate(() => { const a = document.querySelector(".p1c").getBoundingClientRect(), b = document.querySelector(".p2c").getBoundingClientRect(); return [a.right, b.left, innerWidth / 2]; });
    check(halves[0] <= halves[2] + 8 && halves[1] >= halves[2] - 8, `${tag} 2人: 1P は ひだり半分、2P は みぎ半分 ${JSON.stringify(halves)}`);
    await page.evaluate(() => [11, 12, 13].forEach((id) => window.dispatchEvent(new PointerEvent("pointerup", { pointerId: id }))));

    check(errors.length === 0, `${tag} エラーなし ${errors.join(" / ")}`);
    await page.close();
  }
  await browser.close();
  console.log(failed ? `\n${failed} こ NG` : "\nぜんぶ ok");
  process.exit(failed ? 1 : 0);
})();
