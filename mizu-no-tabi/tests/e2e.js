// NODE_PATH=$(npm root -g) node mizu-no-tabi/tests/e2e.js [スクショの でぐち]
// Playwright で スマホたて（390×844）・タブレットよこ（1024×768）を うごかし、
// たびの 3ルート（＋ゆきの みち）を ほんものの タッチ操作で 1しゅう、じっけん室・クイズも ためす。
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const out = process.argv[2] || path.join(__dirname, "shots");
const url = "file://" + path.resolve(__dirname, "../index.html");
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  let failed = 0;
  const check = (ok, msg) => { if (!ok) { failed++; console.log("NG", msg); } else console.log("ok", msg); };
  for (const [tag, vp] of [["phone", { width: 390, height: 844 }], ["tablet", { width: 1024, height: 768 }]]) {
    const page = await browser.newPage({ viewport: vp });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(url);
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem("mizu-no-tabi-v1", JSON.stringify({ speech: false, sound: false })); });
    await page.reload();
    const shot = (n) => page.screenshot({ path: path.join(out, `${tag}-${n}.png`) });
    const noHScroll = async (where) => {
      const bw = await page.evaluate(() => document.documentElement.scrollWidth);
      check(bw <= vp.width, `${tag} ${where}: よこに はみださない (${bw})`);
    };
    const S = () => page.evaluate(() => { const s = MizuTest.story.state(); return { step: s.step, ready: s.ready, anim: !!s.anim, route: s.route }; });
    const w2s = (x, y) => page.evaluate(([x, y]) => MizuTest.story.w2s(x, y), [x, y]);
    const tapW = async (x, y) => { const p = await w2s(x, y); await page.mouse.click(p[0], p[1]); };
    const waitStep = (st) => page.waitForFunction((st) => MizuTest.story.state().step === st, st, { timeout: 20000 });
    const next = async () => { await page.locator("#nextBtn").last().waitFor({ timeout: 20000 }); await page.waitForTimeout(250); await page.locator("#nextBtn").last().click(); };
    const settle = () => page.waitForFunction(() => !MizuTest.story.state().anim, null, { timeout: 20000 });

    await shot("home"); await noHScroll("ホーム");

    async function lap(route, groundT) {
      if (await page.locator("#againBtn").isVisible().catch(() => false)) await page.locator("#againBtn").click();
      else await page.goto(url + "#tabi");
      await page.waitForTimeout(500);
      check((await S()).step === "sea", `${tag} ${route}: うみ から スタート`);
      // ① たいようを こする
      const sun = await page.evaluate(() => World.P.sun);
      const c = await w2s(sun.x, sun.y);
      await page.mouse.move(c[0], c[1]); await page.mouse.down();
      for (let i = 0; i < 120 && (await page.evaluate(() => MizuTest.story.state().heat)) < 100; i++) {
        await page.mouse.move(c[0] + Math.cos(i) * 25, c[1] + Math.sin(i) * 25, { steps: 2 });
      }
      await page.mouse.up();
      check((await page.evaluate(() => MizuTest.story.state().pota.mode)) === "vapor", `${tag} ${route}: すいじょうき（見えない）に なった`);
      if (route === "kawa") await shot("1-vapor");
      await next(); await waitStep("rise");
      // ② ぽたを うえへ ドラッグ
      await page.waitForTimeout(700);
      const p0 = await page.evaluate(() => { const p = MizuTest.story.state().pota; return [p.x, p.y]; });
      let q = await w2s(p0[0], p0[1]);
      await page.mouse.move(q[0], q[1]); await page.mouse.down();
      for (let y = p0[1]; y >= 380; y -= 15) { q = await w2s(p0[0], y); await page.mouse.move(q[0], q[1]); }
      await page.mouse.up();
      check((await page.evaluate(() => MizuTest.story.state().pota.mode)) === "tiny", `${tag} ${route}: ひえて 水の つぶに もどった`);
      if (route === "kawa") await shot("2-rise");
      await next(); await waitStep("cloud"); await page.waitForTimeout(700);
      // ③ つぶを あつめる
      const n = await page.evaluate(() => MizuTest.story.state().specks.length);
      for (let i = 0; i < n; i++) {
        const sp = await page.evaluate((i) => { const s = MizuTest.story.state(); return [s.specks[i].x, s.specks[i].y, s.cloudPos[0], s.cloudPos[1]]; }, i);
        const a = await w2s(sp[0], sp[1]), b = await w2s(sp[2], sp[3]);
        await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(b[0], b[1], { steps: 8 }); await page.mouse.up();
      }
      check((await page.evaluate(() => MizuTest.story.state().cloudN)) === n, `${tag} ${route}: くもが できた（${n}こ）`);
      if (route === "kawa") await shot("3-cloud");
      await next(); await waitStep("fall"); await page.waitForTimeout(600);
      // ④ あめ か ゆき
      await page.evaluate((v) => { const r = document.getElementById("gt"); r.value = v; r.dispatchEvent(new Event("input")); }, groundT);
      await page.locator("#fallBtn").click();
      await page.waitForTimeout(500);
      if (route === "kawa") await shot("4-fall");
      await page.locator("#nextBtn").waitFor({ timeout: 20000 });
      const weather = await page.evaluate(() => MizuTest.story.state().weather);
      check(weather === (groundT <= 1 ? "snow" : groundT <= 3 ? "sleet" : "rain"), `${tag} ${route}: ${groundT}℃ → ${weather}`);
      if (weather === "snow") {
        await next(); await waitStep("spring_snow"); await page.waitForTimeout(500);
        await shot("5-snow");
        await page.locator("#springBtn").click();
        check((await page.evaluate(() => MizuTest.story.state().pota.mode)) === "drop", `${tag}: はるに なって ゆきが とけた`);
      }
      await next(); await waitStep("choose"); await page.waitForTimeout(600);
      if (route === "kawa") await shot("6-choose");
      await page.locator(`.route[data-r="${route}"]`).click();

      if (route === "kawa") {
        await page.waitForTimeout(700);
        const pts = await page.evaluate(() => { const A = MizuTest.story.state().along, o = []; for (let i = 0; i < A.path.pts.length; i += 2) o.push(MizuTest.story.w2s(A.path.pts[i][0], A.path.pts[i][1])); o.push(MizuTest.story.w2s(...A.path.pts[A.path.pts.length - 1])); return o; });
        await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down();
        for (const p of pts) await page.mouse.move(p[0], p[1], { steps: 2 });
        await page.mouse.up();
        await shot("7-river");
      } else if (route === "chika") {
        await waitStep("soak"); await settle();
        const cl = await page.evaluate(() => World.P.clay); await tapW(cl.x, cl.y); await page.waitForTimeout(300);
        check(!(await S()).ready, `${tag}: ねんどは しみこまない`);
        await settle();
        const sd = await page.evaluate(() => World.P.sand); await tapW(sd.x, sd.y);
        await next(); await waitStep("aquifer"); await page.waitForTimeout(600);
        await shot("7-aquifer");
        const g = await page.locator("#goBtn").boundingBox();
        await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await page.mouse.down();
        await page.locator("#nextBtn").waitFor({ timeout: 20000 }); await page.mouse.up();
        await shot("8-spring");
        await next();
      } else {
        await waitStep("dam"); await page.waitForFunction(() => MizuTest.story.state().ready, null, { timeout: 20000 });
        await page.waitForTimeout(500);
        await shot("7-dam");
        const d = await page.evaluate(() => World.P.dam); await tapW(d.x, 470);
        await waitStep("plant"); await page.waitForTimeout(700);
        const tanks = await page.evaluate(() => World.P.tanks);
        await tapW(tanks[1][0], tanks[1][1]);
        check((await page.evaluate(() => MizuTest.story.state().plantStep)) === 0, `${tag}: じゅんばんが ちがうと すすまない`);
        for (const t of tanks) { await tapW(t[0], t[1]); await settle(); }
        await shot("8-plant");
        await next(); await waitStep("faucet"); await page.waitForFunction(() => MizuTest.story.state().ready, null, { timeout: 20000 });
        await page.waitForTimeout(500);
        await tapW(800, 548);
        await page.locator("#nextBtn").waitFor({ timeout: 20000 }); await shot("9-faucet");
        await next(); await waitStep("sewage"); await page.waitForTimeout(500);
        const sw = await page.evaluate(() => World.P.sewage); await tapW(sw.x + 41, sw.y - 14);
        await shot("10-sewage");
        await next();
      }
      await waitStep("arrive"); await page.waitForTimeout(900);
      const st = await page.evaluate(() => MizuTest.data().stamps);
      const key = route;
      check(st[key] >= 1, `${tag} ${route}: 1しゅう して スタンプ（${JSON.stringify(st)}）`);
      await shot(`arrive-${route}`);
      await noHScroll(`たび ${route}`);
    }
    await lap("kawa", 10);
    await lap("chika", 3);
    await lap("machi", -2);
    check((await page.evaluate(() => MizuTest.data().stamps.yuki)) >= 1, `${tag}: ゆきの みち スタンプ`);

    // ---------- じっけん室 ----------
    await page.goto(url + "#lab"); await page.waitForTimeout(400);
    await page.locator("#spdBtn").click();
    await page.locator('[data-mode="heat"]').click();
    await page.waitForTimeout(1500); await shot("lab-heat");
    await page.waitForFunction(() => MizuTest.lab.state().found.boil, null, { timeout: 20000 });
    await page.locator("#spoonBtn").click();
    await page.waitForFunction(() => MizuTest.lab.state().found.flat, null, { timeout: 20000 });
    await page.waitForTimeout(400); await shot("lab-boil");
    const lb = await page.evaluate(() => ({ T: MizuTest.lab.state().T, f: MizuTest.lab.state().found }));
    check(Math.abs(lb.T - 100) < 0.01 && lb.f.yuge, `${tag}: ふっとう中は 100℃のまま・ゆげを しらべた (${lb.T})`);
    await page.locator('[data-mode="cool"]').click();
    await page.waitForFunction(() => MizuTest.lab.state().found.freeze, null, { timeout: 30000 });
    const fz = await page.evaluate(() => MizuTest.lab.state().T);
    check(fz === 0, `${tag}: こおっている あいだは 0℃ (${fz})`);
    await page.waitForFunction(() => MizuTest.lab.state().found.expand, null, { timeout: 30000 });
    const v = await page.evaluate(() => MizuTest.lab.vol());
    check(v > 100, `${tag}: こおると かさが ふえた (${v.toFixed(1)} mL)`);
    await page.waitForTimeout(800); await shot("lab-ice");
    await page.locator('[data-mode="heat"]').click();
    await page.waitForFunction(() => MizuTest.lab.state().found.melt, null, { timeout: 30000 });
    check((await page.evaluate(() => MizuTest.data().stamps.lab)) >= 1, `${tag}: じっけん はかせ スタンプ`);
    await noHScroll("じっけん室");

    // ---------- クイズ ----------
    await page.goto(url + "#quiz"); await page.waitForTimeout(300);
    await shot("quiz");
    const qn = await page.evaluate(() => QUIZ.length);
    check(qn === 10, `${tag}: クイズ 10もん`);
    for (let i = 0; i < qn; i++) {
      const ans = await page.evaluate((i) => QUIZ[i].ans, i);
      await page.locator(".choice").nth(ans).click();
      if (i === 2) await shot("quiz-ans");
      await page.locator("#qNext").click();
    }
    check((await page.locator("#qScore").textContent()).includes("10 / 10"), `${tag}: ぜんもん せいかい`);
    await page.goto(url + "#stamps"); await page.waitForTimeout(300);
    await shot("stamps"); await noHScroll("スタンプ");
    check((await page.locator(".st.got").count()) === 6, `${tag}: スタンプ 6つ ぜんぶ`);
    check(errors.length === 0, `${tag}: エラーなし ${errors.join(" / ")}`);
    await page.close();
  }
  await browser.close();
  console.log(failed ? `\n${failed} こ NG` : "\nぜんぶ ok");
  process.exit(failed ? 1 : 0);
})();
