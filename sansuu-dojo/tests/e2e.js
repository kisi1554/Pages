// NODE_PATH=$(npm root -g) node sansuu-dojo/tests/e2e.js [スクショ の でぐち]
// Playwright（Chromium）で スマホ たて（390×844）・タブレット よこ（1024×768）を うごかす。
// ぜんぶ の 単元 を おてほん → れんしゅう、各おび の しょうきゅう しけん を ごうかく まで すすめる。
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const out = process.argv[2] || path.join(__dirname, "shots");
fs.mkdirSync(out, { recursive: true });
const url = "file://" + path.resolve(__dirname, "../index.html") + "?fast=1";

(async () => {
  const browser = await chromium.launch();
  let failed = 0;
  const check = (ok, msg) => { if (!ok) { failed++; console.log("NG", msg); } else if (process.env.VERBOSE) console.log("ok", msg); };
  for (const [tag, vp] of [["phone", { width: 390, height: 844 }], ["tablet", { width: 1024, height: 768 }]]) {
    const page = await browser.newPage({ viewport: vp, hasTouch: true });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // タブレット は 1ねんせい（すうじ キーパッド）、スマホ は ねんちょう（えらぶ）
    if (tag === "tablet") await page.evaluate(() => { window.__sd.st.rec[window.__sd.st.cur].grade = "1a"; });
    const wait = (ms) => page.waitForTimeout(ms);
    const shot = (name) => page.screenshot({ path: `${out}/${tag}-${name}.png` });
    const noHScroll = async (where) => {
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      check(sw <= vp.width, `${tag} ${where}: よこ に はみださない (${sw})`);
    };
    const bigTargets = async (where) => {
      const small = await page.evaluate(() => [...document.querySelectorAll(".key, .choice, .btn:not(.small), .tbtn, .tile, .ucard, .keiko, .testbtn")]
        .filter((e) => e.offsetParent && e.getBoundingClientRect().height < 55.5).map((e) => e.className + ":" + Math.round(e.getBoundingClientRect().height)));
      check(small.length === 0, `${tag} ${where}: タップ りょういき 56px いじょう ${small.join(",")}`);
    };
    const units = await page.evaluate(() => SD.units.map((u) => ({ id: u.id, belt: u.belt })));
    const belts = await page.evaluate(() => SD.BELTS.map((b) => b.id).filter((b) => SD.testUnits(b).length));

    await shot("01-home");
    await noHScroll("home");
    await bigTargets("home");

    // こたえ を いれる（ほんとう の ボタン を おす）
    async function answer(wrongFirst) {
      const p = await page.evaluate(() => { const p = window.__sd.p; return p && { ans: p.ans, toolAnswer: !!p.toolAnswer, choices: p.choices ? p.choices.map((c) => String(c.v)) : null, u: p.u }; });
      if (!p) return false;
      const mode = await page.evaluate(() => (document.querySelector("#q-choices").children.length ? "choice" : document.querySelector("#q-pad").children.length ? "pad" : "tool"));
      if (wrongFirst && mode === "pad") {
        const wrong = String(Number(p.ans) + 1);
        for (const d of wrong) await page.click(`#q-pad [data-k="${d}"]`);
        await page.click('#q-pad [data-k="こたえる"]');
        await wait(80);
        const hint = await page.textContent("#q-fb");
        check(/💡/.test(hint), `${tag}: まちがえる と ヒント が でる (${hint.slice(0, 40)})`);
        await shot("05-hint");
      }
      if (mode === "tool") {
        await page.evaluate((a) => window.__sd.tool.set(a), p.ans);
        await page.click("#q-btns .btn.main");
      } else if (mode === "choice") {
        await page.click(`#q-choices .choice[data-v="${p.ans}"]`);
      } else {
        for (const d of String(p.ans)) await page.click(`#q-pad [data-k="${d}"]`);
        await page.click('#q-pad [data-k="こたえる"]');
      }
      await wait(60);
      return true;
    }
    async function finishQuiz(label, wrongFirst) {
      let n = 0, shotTaken = false;
      while ((await page.evaluate(() => window.__sd.view)) === "q" && n < 40) {
        if (!shotTaken && label) { await shot(label); await noHScroll(label); await bigTargets(label); shotTaken = true; }
        const ok = await answer(wrongFirst && n === 0);
        if (!ok) break;
        n++;
      }
      return n;
    }

    // ぜんぶ の 単元 → おび ごと に しけん
    let shotN = 10;
    for (const b of belts) {
      for (const u of units.filter((x) => x.belt === b)) {
        await page.evaluate((id) => window.__sd.openUnit(id, "demo"), u.id);
        await page.waitForSelector("#u-btns .btn.main", { timeout: 15000 });
        if (u.id === units[0].id || ["kuriagari", "tokei1"].includes(u.id)) await shot(`${shotN++}-demo-${u.id}`);
        await noHScroll(`demo ${u.id}`);
        const ta = await page.evaluate(() => getComputedStyle(document.querySelector("#u-tool")).touchAction);
        check(ta === "none", `${tag} ${u.id}: どうぐ は touch-action none (${ta})`);
        const done = await page.evaluate((id) => window.__sd.st.rec[window.__sd.st.cur].units[id].demo, u.id);
        check(done === 1, `${tag} ${u.id}: おてほん が さいご まで`);
        await page.evaluate((id) => window.__sd.openUnit(id, "prac"), u.id);
        await finishQuiz(u.id === units[0].id || u.id === "kurisagari" ? `${shotN++}-q-${u.id}` : null, u.id === "kurisagari");
        const stars = await page.evaluate((id) => window.__sd.st.rec[window.__sd.st.cur].units[id].stars, u.id);
        check(stars >= 1, `${tag} ${u.id}: れんしゅう で ★ (${stars})`);
      }
      await page.evaluate(() => window.__sd.map());
      await wait(50);
      const btn = await page.$(`[data-test="${b}"]`);
      check(btn && !(await btn.isDisabled()), `${tag} ${b}: しけん が ひらく`);
      await btn.click();
      await finishQuiz(b === belts[0] ? `${shotN++}-test-${b}` : null);
      await wait(100);
      const passed = await page.evaluate((b) => window.__sd.st.rec[window.__sd.st.cur].belts.includes(b), b);
      check(passed, `${tag} ${b}: しょうきゅう しけん ごうかく`);
      const menjo = await page.isVisible("#menjo");
      check(menjo, `${tag} ${b}: めんじょう が でる`);
      await wait(900);
      if (b === belts[0] || b === "kuro") await shot(`${shotN++}-menjo-${b}`);
      if (menjo) await page.click("#menjo-ok");
    }

    // ほんとう の ゆび で どうぐ を さわる
    await page.evaluate(() => window.__sd.openUnit("kazu10", "exp"));
    const fr = await page.$("#u-tool .frame");
    const bb = await fr.boundingBox();
    for (let i = 0; i < 3; i++) await page.mouse.click(bb.x + bb.width * 0.9, bb.y + bb.height * 0.5);
    check((await page.evaluate(() => window.__sd.tool.value())) === 3, `${tag}: わく を 3かい タップ → ブロック 3こ`);
    await page.click("#u-btns .btn.main");
    await wait(80);
    check(/7こ/.test(await page.textContent("#u-say")), `${tag}: やってみる の つぎ の おだい へ`);

    await page.evaluate(() => window.__sd.openUnit("tokei1", "exp"));
    const ck = await (await page.$("#u-tool svg")).boundingBox();
    const cx = ck.x + ck.width / 2, cy = ck.y + ck.height / 2, r = ck.width * 0.33;
    // ながい はり を 12 から 1しゅう（とけい まわり）→ 12じ が 1じ に
    await page.mouse.move(cx, cy - r);
    await page.mouse.down();
    for (let a = 0; a <= 360; a += 15) { const t = a * Math.PI / 180; await page.mouse.move(cx + Math.sin(t) * r, cy - Math.cos(t) * r); }
    await page.mouse.up();
    const tv = await page.evaluate(() => window.__sd.tool.value());
    check(tv === "1:0", `${tag}: ながい はり を 1しゅう → みじかい はり も 1じ へ (${tv})`);
    await shot(`${shotN++}-clock`);

    await page.evaluate(() => window.__sd.openUnit("kaku", "exp"));
    const tr = await (await page.$("#u-tool svg")).boundingBox();
    // 5 の 1かくめ（たて → まる）と 2かくめ（よこ）を ゆび で なぞる
    const strokes = await page.evaluate(() => SD.TRACE[5]);
    for (const s of strokes) {
      await page.mouse.move(tr.x + s[0][0] / 100 * tr.width, tr.y + s[0][1] / 140 * tr.height);
      await page.mouse.down();
      for (const q of s) await page.mouse.move(tr.x + q[0] / 100 * tr.width, tr.y + q[1] / 140 * tr.height, { steps: 3 });
      await page.mouse.up();
    }
    check((await page.evaluate(() => window.__sd.tool.value())) === 5, `${tag}: 5 を なぞって ごうかく`);
    await shot(`${shotN++}-trace`);

    // きょう の けいこ → はんこ
    await page.evaluate(() => window.__sd.home());
    await page.click("#go-keiko");
    await finishQuiz(`${shotN++}-keiko`);
    const stamped = await page.evaluate(() => Object.keys(window.__sd.st.rec[window.__sd.st.cur].stamps).length);
    check(stamped === 1, `${tag}: けいこ で はんこ`);
    await shot(`${shotN++}-keiko-done`);
    await page.click("#r-btns .btn:not(.main)");
    await shot(`${shotN++}-book`);
    await noHScroll("book");

    await page.evaluate(() => window.__sd.home());
    await shot(`${shotN++}-home-after`);
    await page.click('[data-go="map"]');
    await page.screenshot({ path: `${out}/${tag}-${shotN++}-map.png`, fullPage: true });
    await noHScroll("map");
    await page.evaluate(() => window.__sd.home());
    await page.click('[data-go="parent"]');
    await page.screenshot({ path: `${out}/${tag}-${shotN++}-parent.png`, fullPage: true });
    await noHScroll("parent");
    check((await page.$$(".ptable tr")).length > 5, `${tag}: ほごしゃ の ひょう`);
    await page.evaluate(() => window.__sd.home());
    await page.click('[data-go="rooms"]');
    await shot(`${shotN++}-rooms`);
    check((await page.$$(".room")).length >= 8, `${tag}: となり の へや`);

    // きょうだい: 2にんめ を ふやして きりかえ
    await page.evaluate(() => window.__sd.home());
    await page.click("#kid");
    await page.fill("#kid-new", "いもうと");
    await page.click("#kid-add");
    const kids = await page.evaluate(() => window.__sd.st.kids.length);
    check(kids === 2, `${tag}: きょうだい を ふやせる`);
    const fresh = await page.evaluate(() => SD.curBelt(window.__sd.st.rec[window.__sd.st.cur]));
    check(fresh === -1, `${tag}: あたらしい でし は みならい から`);
    await shot(`${shotN++}-kid2`);

    check(errors.length === 0, `${tag}: エラー なし ${errors.slice(0, 3).join(" / ")}`);
    await page.close();
  }
  await browser.close();
  console.log(failed ? `NG ${failed}` : "ALL OK");
  process.exit(failed ? 1 : 0);
})();
