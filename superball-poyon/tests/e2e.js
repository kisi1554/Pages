// CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome NODE_PATH=$(npm root -g) node superball-poyon/tests/e2e.js [スクショの でぐち]
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
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const [tag, vp] of [["phone", { width: 390, height: 844 }], ["tablet", { width: 1024, height: 768 }]]) {
    const page = await browser.newPage({ viewport: vp, hasTouch: true, deviceScaleFactor: 2 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await wait(600);
    const noHScroll = async (where) => {
      const bw = await page.evaluate(() => document.documentElement.scrollWidth);
      check(bw <= vp.width, `${tag} ${where}: よこに はみださない (${bw})`);
    };
    const inView = async (where, sel) => {
      const r = await page.evaluate((s) => { const e = document.querySelector(s).getBoundingClientRect(); return [e.top, e.bottom, e.left, e.right]; }, sel);
      check(r[1] <= vp.height + 1 && r[0] >= 0 && r[2] >= 0 && r[3] <= vp.width + 1, `${tag} ${where}: ${sel} が がめんに おさまる`);
    };
    const minBtn = async (where, sel) => {
      const small = await page.evaluate((s) => Array.from(document.querySelectorAll(s)).filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect()).filter((r) => r.width < 55.5 || r.height < 55.5).length, sel);
      check(small === 0, `${tag} ${where}: ボタンは 56px いじょう`);
    };

    // ホーム
    await inView("ホーム", ".menu .mode:last-child");
    await noHScroll("ホーム");
    await page.screenshot({ path: path.join(out, `${tag}-home.png`) });

    // ① じゆう あそび
    await page.click('[data-go="free"]');
    await wait(300);
    await minBtn("じゆう", ".tools:not([hidden]) .tool, .bar .pill");
    const n0 = await page.evaluate(() => SB.modes.free.world().bodies.length);
    const R = await page.evaluate(() => SB.rect());
    const cx = (R.x0 + R.x1) / 2, cy = (R.y0 + R.y1) / 2;
    await page.mouse.click(cx - 60, R.y0 + 60);
    await page.mouse.click(cx + 60, R.y0 + 60);
    await wait(100);
    check(await page.evaluate(() => SB.modes.free.world().bodies.length) === n0 + 2, `${tag}: タップで ボールが でる`);
    // ながおしで ふくらむ
    await page.mouse.move(cx, cy - 40);
    await page.mouse.down();
    await wait(1400);
    const big = await page.evaluate(() => Math.max(...SB.modes.free.world().bodies.map((b) => b.r)));
    await page.mouse.up();
    check(big > 40, `${tag}: ながおしで ぷくーっと ふくらむ (r=${Math.round(big)})`);
    // フリック: つかんで はじく（ちいさめの ボールを えらぶ）
    await wait(1500);
    const pick = await page.evaluate(() => { const w = SB.modes.free.world(); const b = w.bodies.filter((q) => q.r < 40 * SB.S).sort((a, c) => c.y - a.y)[0]; return { x: b.x, y: b.y, id: b.id }; });
    await page.mouse.move(pick.x, pick.y);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) { await page.mouse.move(pick.x + i * 25, pick.y - i * 25); await wait(16); }
    await page.mouse.up();
    const v = await page.evaluate((id) => { const b = SB.modes.free.world().bodies.find((q) => q.id === id); return b ? [b.vx, b.vy] : [0, 0]; }, pick.id);
    check(v[0] > 300 && v[1] < -300, `${tag}: はじくと その むきに とぶ (${v.map(Math.round)})`);
    await wait(1200);
    const counts = await page.evaluate(() => [SB.run, SB.data.today, SB.data.total]);
    check(counts[0] > 0 && counts[1] === counts[2], `${tag}: はねた かずを かぞえる ${counts}`);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("superball-poyon-v1") || "{}").total);
    check(saved > 0, `${tag}: はねた かずを ほぞん (${saved})`);
    // ねむると かぞえない
    await wait(5000);
    const c1 = await page.evaluate(() => SB.data.total);
    await wait(1500);
    const c2 = await page.evaluate(() => SB.data.total);
    check(c2 - c1 < 5, `${tag}: とまった ボールは かぞえつづけない (${c2 - c1})`);
    await page.click("#tBoom");
    await wait(300);
    const up = await page.evaluate(() => SB.modes.free.world().bodies.filter((b) => b.vy < -200).length);
    check(up > 3, `${tag}: どかーん で とびあがる`);
    await wait(1200);
    await noHScroll("じゆう");
    await page.screenshot({ path: path.join(out, `${tag}-free.png`) });
    // 200こ の fps
    await page.evaluate(() => SB.modes.free.bench(200));
    await wait(600);
    const fps = await page.evaluate(() => new Promise((res) => {
      let n = 0; const t0 = performance.now();
      const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); };
      requestAnimationFrame(f);
    }));
    const nb = await page.evaluate(() => SB.modes.free.world().bodies.length);
    console.log(`fps ${tag}: ${fps.toFixed(1)} （ボール ${nb}こ）`);
    check(nb <= 200, `${tag}: ボールは 200こ まで (${nb})`);
    await page.click("#tNight"); await page.click("#tMusic");
    await wait(500);
    await page.screenshot({ path: path.join(out, `${tag}-free-night.png`) });
    await page.click("#tNight"); await page.click("#tMusic");
    await page.click("#tClean");
    await wait(nb * 40 + 500);
    check(await page.evaluate(() => SB.modes.free.world().bodies.length) === 0, `${tag}: おかたづけで ぜんぶ きえる`);
    await page.click("#tPal");
    check(await page.locator(".pal-item").count() === 4, `${tag}: パレットに おまかせ＋もっている 3こ`);
    await page.screenshot({ path: path.join(out, `${tag}-palette.png`) });
    await page.locator(".pal-item").nth(1).click();
    check(await page.evaluate(() => SB.data.sel) === "aka", `${tag}: パレットで えらべる`);

    // ② すくい
    await page.click("#homeBtn"); await page.click('[data-go="sukui"]');
    await wait(1500);
    let st = await page.evaluate(() => SB.modes.sukui.state());
    check(st.balls >= 10 && st.left === 3, `${tag}: すくい: ボール ${st.balls}こ・ポイ 3まい`);
    await page.screenshot({ path: path.join(out, `${tag}-sukui.png`) });
    // ポイを みずに いれて はやく うごかすと やぶれる
    const poi = st.poi, deep = st.water + 80;
    await page.mouse.move(poi.x, poi.y);
    await page.mouse.down();
    let x = poi.x;
    for (let i = 0; i < 40; i++) { await page.mouse.move(x, deep); await wait(60); x = i % 2 ? poi.x : poi.x + 120; }
    st = await page.evaluate(() => SB.modes.sukui.state());
    check(st.poi.hp < 100, `${tag}: みずの なかで うごかすと かみが よわる (${Math.round(st.poi.hp)})`);
    for (let i = 0; i < 200 && !(await page.evaluate(() => SB.modes.sukui.state().poi.torn)); i++) { await page.mouse.move(x, deep); await wait(50); x = i % 2 ? poi.x : poi.x + 140; }
    await page.mouse.up();
    st = await page.evaluate(() => SB.modes.sukui.state());
    check(st.poi.torn && st.left === 2, `${tag}: やぶれて ポイが へる`);
    await page.screenshot({ path: path.join(out, `${tag}-sukui-torn.png`) });
    // すくって おわんへ（ボールの したに もぐって もちあげる）
    await wait(1500);
    const before = await page.evaluate(() => [SB.data.stars, SB.modes.sukui.state().caught]);
    let got = before[1];
    for (let tries = 0; tries < 4 && got === before[1]; tries++) {
      st = await page.evaluate(() => SB.modes.sukui.state());
      const target = await page.evaluate(() => { const w = SB.modes.sukui.world(); const bs = w.bodies.filter((b) => b.data.inW && b.r < 26 * SB.S).sort((a, b) => a.r - b.r); return bs[0] && { x: bs[0].x, y: bs[0].y, r: bs[0].r, id: bs[0].id }; });
      if (!target) break;
      const p0 = st.poi;
      await page.mouse.move(p0.x, p0.y); await page.mouse.down();
      // ポイの ところを おさえたので、ゆびの いち ＝ ポイの いち
      const go = async (tx, ty, steps) => { const s = await page.evaluate(() => SB.modes.sukui.state().poi); for (let i = 1; i <= steps; i++) { await page.mouse.move(s.x + (tx - s.x) * i / steps, s.y + (ty - s.y) * i / steps); await wait(30); } };
      // よこから もぐって、ボールの したへ。ボールに あわせて ゆっくり もちあげる
      const side = target.x < (st.pool.x0 + st.pool.x1) / 2 ? 1 : -1;
      const bp = () => page.evaluate((id) => { const b = SB.modes.sukui.world().bodies.find((q) => q.id === id); return b ? { x: b.x, y: b.y } : null; }, target.id);
      await go(target.x + side * 150, st.water - 60, 8);
      await go(target.x + side * 150, st.water + 70, 6);
      let bb = await bp(); if (bb) await go(bb.x, st.water + 70, 10);
      for (let i = 0; i < 4; i++) { bb = await bp(); if (bb) await go(bb.x, st.water + 70 - i * 40, 5); }
      await go(st.bowl.cx, st.bowl.top - 40, 30);
      await wait(400);
      await page.mouse.up();
      got = await page.evaluate(() => SB.modes.sukui.state().caught);
      if (!got && process.env.DEBUG) console.log("すくい しっぱい", JSON.stringify(target), JSON.stringify(await bp()), JSON.stringify(await page.evaluate(() => SB.modes.sukui.state().poi)));
    }
    check(got > before[1], `${tag}: ポイで すくって おわんへ (${got}こ)`);
    if (got > before[1]) check(await page.evaluate(() => SB.data.stars) - before[0] === got - before[1], `${tag}: すくうと 1こ に つき ⭐+1`);
    await page.screenshot({ path: path.join(out, `${tag}-sukui-catch.png`) });
    await page.click("#sukuiEnd");
    await wait(300);
    check(await page.isVisible("#result"), `${tag}: おわり で けっか`);
    await page.screenshot({ path: path.join(out, `${tag}-sukui-result.png`) });
    await page.locator("#resBtns button").last().click();

    // ③ ガチャ
    await page.evaluate(() => { SB.data.stars = 12; SB.updateBar(); });
    await page.click('[data-go="gacha"]');
    await wait(500);
    await page.screenshot({ path: path.join(out, `${tag}-gacha.png`) });
    const k = await page.evaluate(() => SB.modes.gacha.state().knob);
    await page.mouse.move(k.x + k.r * 1.3, k.y);
    await page.mouse.down();
    for (let i = 1; i <= 26; i++) { const a = i / 24 * Math.PI * 2; await page.mouse.move(k.x + Math.cos(a) * k.r * 1.3, k.y + Math.sin(a) * k.r * 1.3); await wait(20); }
    await page.mouse.up();
    let cap = await page.evaluate(() => SB.modes.gacha.state().cap);
    check(!!cap, `${tag}: ハンドルを 1しゅう まわすと カプセルが でる`);
    check(await page.evaluate(() => SB.data.stars) === 7, `${tag}: ⭐ が 5こ へる`);
    await wait(1600);
    cap = await page.evaluate(() => SB.modes.gacha.state().cap);
    check(cap.state === "wait", `${tag}: カプセルが ころころ とまる`);
    await page.screenshot({ path: path.join(out, `${tag}-gacha-cap.png`) });
    await page.mouse.click(cap.x, cap.y);
    await wait(900);
    check(await page.isVisible("#result"), `${tag}: パカッと ひらいて けっか`);
    await inView("ガチャ けっか", "#result .sheet-card");
    const owned = await page.evaluate((id) => SB.data.own[id], cap.id);
    check(owned >= 1, `${tag}: でた ボールを もらえる (${cap.id})`);
    await page.screenshot({ path: path.join(out, `${tag}-gacha-result.png`) });
    await page.locator("#resBtns button").last().click();

    // ずかん
    await wait(300);
    check(await page.locator(".zk-card").count() >= 30, `${tag}: ずかんに 30しゅるい いじょう`);
    const have = await page.locator(".zk-card:not(.no-have)").count();
    check(have >= 3, `${tag}: もっている ボール ${have}`);
    await noHScroll("ずかん");
    await page.screenshot({ path: path.join(out, `${tag}-zukan.png`) });
    await page.locator(".zk-card:not(.no-have)").first().click();
    check(await page.isVisible("#detail"), `${tag}: ずかんの くわしく`);
    await page.screenshot({ path: path.join(out, `${tag}-zukan-detail.png`) });
    await page.click("#dtUse");
    check(await page.evaluate(() => SB.curId) === "free", `${tag}: ずかんから じゆう あそびへ`);

    check(errors.length === 0, `${tag}: エラー なし ${errors.join(" / ")}`);
    await page.close();
  }
  await browser.close();
  console.log(failed ? `\n${failed} こ NG` : "\nぜんぶ ok");
  process.exit(failed ? 1 : 0);
})();
