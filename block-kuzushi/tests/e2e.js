// NODE_PATH=$(npm root -g) node block-kuzushi/tests/e2e.js [スクショの でぐち]
// Playwright（Chromium）で スマホたて（390×844）・タブレットよこ（1024×768）を うごかして スクショを とる
// ボール 30こ・パーティクル 1000こ で 1フレームの けいさん＋びょうが じかん も はかる
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
    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await wait(400);
    const noScroll = async (where) => {
      const [sw, sh] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
      check(sw <= vp.width && sh <= vp.height, `${tag} ${where}: スクロールしない (${sw}×${sh})`);
    };
    const minBtn = async (where) => {
      const small = await page.evaluate(() => Array.from(document.querySelectorAll("button")).filter((e) => e.offsetParent)
        .map((e) => e.getBoundingClientRect()).filter((r) => r.width < 55.5 || r.height < 55.5).length);
      check(small === 0, `${tag} ${where}: ボタンは 56px いじょう`);
    };

    await noScroll("タイトル"); await minBtn("タイトル");
    await page.screenshot({ path: path.join(out, `${tag}-title.png`) });

    await page.click("#btnSelect"); await wait(200);
    await minBtn("ステージえらび");
    const nBtn = await page.$$eval(".stage-btn", (a) => a.length);
    check(nBtn === 40, `${tag} ステージボタン 40こ`);
    const locked = await page.$$eval(".stage-btn:disabled", (a) => a.length);
    check(locked === 39, `${tag} はじめは 1 だけ ひらいている`);
    await page.screenshot({ path: path.join(out, `${tag}-select.png`) });
    await page.click("[data-go=title]");

    // ステージ 1: タップで はっしゃ → ブロックが こわれる
    await page.click("#btnPlay"); await wait(500);
    const cvBox = await page.evaluate(() => { const r = document.getElementById("cv").getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; });
    check(cvBox.l >= 0 && cvBox.r <= vp.width + 0.5 && cvBox.t >= 0 && cvBox.b <= vp.height + 0.5, `${tag} ばんめんが がめんに おさまる`);
    check(Math.abs(cvBox.w / cvBox.h - 360 / 640) < 0.02, `${tag} ばんめんは たてなが 9:16`);
    if (tag === "tablet") check(Math.abs((cvBox.l + cvBox.r) / 2 - vp.width / 2) < 2, `${tag} ばんめんは まんなか`);
    const ta = await page.evaluate(() => getComputedStyle(document.getElementById("play")).touchAction);
    check(ta === "none", `${tag} あそぶ がめんは touch-action: none`);
    await noScroll("あそぶ");
    await page.screenshot({ path: path.join(out, `${tag}-play-start.png`) });

    // ゆびで ドラッグ → パドルが ついてくる
    const cx = cvBox.l + cvBox.w * 0.25, cy = cvBox.t + cvBox.h * 0.95;
    await page.evaluate(([x, y]) => {
      const el = document.getElementById("play");
      const ev = (type, xx) => el.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "touch", clientX: xx, clientY: y, bubbles: true, cancelable: true }));
      ev("pointerdown", x + 40); ev("pointermove", x + 20); ev("pointermove", x);
    }, [cx, cy]);
    await wait(100);
    const px = await page.evaluate(() => __bk.g.paddle.x);
    check(Math.abs(px - 90) < 8, `${tag} パドルが ゆびに ついてくる (${px.toFixed(1)})`);
    await page.evaluate(([x, y]) => document.getElementById("play").dispatchEvent(new PointerEvent("pointerup", { pointerId: 7, pointerType: "touch", clientX: x, clientY: y, bubbles: true })), [cx, cy]);
    // タップ → はっしゃ
    await page.mouse.click(cvBox.l + cvBox.w / 2, cvBox.t + cvBox.h * 0.9);
    await wait(50);
    const stuck = await page.evaluate(() => __bk.g.balls.some((b) => b.stuck));
    check(!stuck, `${tag} タップで はっしゃ`);
    // まもる バーで ずっと あそばせて ブロックが へるか
    const before = await page.evaluate(() => __bk.g.remain);
    await page.evaluate(() => { __bk.g.invincible = true; __bk.give("m"); __bk.give("f"); });
    await wait(1500);
    const after = await page.evaluate(() => __bk.g.remain);
    check(after < before, `${tag} ブロックが こわれる (${before}→${after})`);
    await page.screenshot({ path: path.join(out, `${tag}-play-multi.png`) });

    // ばくだん れんさ（ステージ 9）
    await page.evaluate(() => { __bk.start(9); __bk.g.invincible = true; });
    const r0 = await page.evaluate(() => __bk.g.remain);
    await page.evaluate(() => { const g = __bk.g; const b = g.blocks.find((k) => k.type === "bomb" && k.r === 1 && k.c === 0); g.balls[0].stuck = false; g.balls[0].x = b.x + 16; g.balls[0].y = b.y + 30; g.balls[0].dx = 0.3; g.balls[0].dy = -0.95; });
    await wait(700);
    const r1 = await page.evaluate(() => __bk.g.remain);
    check(r0 - r1 >= 10, `${tag} ばくだんが れんさする (${r0}→${r1})`);
    await page.screenshot({ path: path.join(out, `${tag}-bomb.png`) });

    // ボス（ステージ 10）
    await page.evaluate(() => { __bk.start(10); __bk.g.invincible = true; __bk.launchAll(); __bk.give("m"); });
    await wait(2500);
    const boss = await page.evaluate(() => ({ hp: __bk.g.boss.hp, max: __bk.g.boss.max, bullets: __bk.g.bullets.length }));
    console.log("   boss", JSON.stringify(boss));
    await page.screenshot({ path: path.join(out, `${tag}-boss.png`) });
    await page.evaluate(() => { const g = __bk.g, B = g.boss; for (let i = 0; i < 40 && !B.dead; i++) { g.balls[0].fire = false; } B.hp = 1; });
    await page.evaluate(() => { const g = __bk.g, B = g.boss; const b = g.balls[0]; b.stuck = false; b.x = B.x + B.w / 2; b.y = B.y + B.h + 40; b.dx = 0; b.dy = -1; B.vx = 0; });
    await wait(400);
    check(await page.evaluate(() => __bk.g.boss.dead), `${tag} じゃくてんに あてると ボスを たおせる`);
    await page.evaluate(() => { __bk.g.invincible = false; });
    await wait(2600);
    check(await page.evaluate(() => !document.getElementById("ovClear").hidden), `${tag} ボスを たおすと クリア`);
    await page.screenshot({ path: path.join(out, `${tag}-clear.png`) });
    check(await page.evaluate(() => JSON.parse(localStorage.getItem("block-kuzushi-v1")).done[10] === true), `${tag} クリアを ほぞん`);

    // ボール 30こ・パーティクル 1000こ
    await page.evaluate(() => __bk.start(31));
    const bench = await page.evaluate(() => __bk.bench(240));
    console.log("   bench", JSON.stringify(bench));
    check(bench.balls === 30 && bench.particles >= 950, `${tag} ボール 30・パーティクル ~1000`);
    check(bench.avg < 12, `${tag} 1フレーム へいきん ${bench.avg.toFixed(2)}ms（60fps に まにあう）`);
    await page.screenshot({ path: path.join(out, `${tag}-bench.png`) });

    // いちじていし と せってい
    await page.click("#btnPause"); await wait(100);
    await minBtn("いちじていし");
    await page.screenshot({ path: path.join(out, `${tag}-pause.png`) });
    await page.click("#btnQuit");
    await page.click("#btnSettings"); await page.click("#tgShake");
    check(await page.evaluate(() => JSON.parse(localStorage.getItem("block-kuzushi-v1")).set.shake === false), `${tag} ゆれ オフを ほぞん`);
    await page.screenshot({ path: path.join(out, `${tag}-settings.png`) });

    check(errors.length === 0, `${tag} エラーなし ${errors.join(" / ")}`);
    await page.close();
  }
  await browser.close();
  console.log(failed ? `NG ${failed}` : "ぜんぶ ok");
  process.exit(failed ? 1 : 0);
})();
