// NODE_PATH=$(npm root -g) node soroban-dojo/tests/e2e.js [スクショの でぐち]
// Playwright（Chromium）で スマホたて・タブレットよこ を うごかして スクショを とる
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const out = process.argv[2] || path.join(__dirname, "shots");
fs.mkdirSync(out, { recursive: true });
const url = "file://" + path.resolve(__dirname, "../index.html");

(async () => {
  const browser = await chromium.launch();
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
      const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth }));
      check(w.sw <= vp.width, `${tag} ${where}: よこに はみださない (${w.sw})`);
    };
    const fits = async (where, sel) => {
      const r = await page.evaluate((s) => { const e = document.querySelector(s).getBoundingClientRect(); return [e.top, e.bottom, e.left, e.right]; }, sel);
      check(r[1] <= vp.height + 1 && r[0] >= 0 && r[3] <= vp.width + 1, `${tag} ${where}: ${sel} が がめんに おさまる (${r.map(Math.round)})`);
    };
    const beadAt = (rod, k) => page.evaluate(([rod, k]) => {
      const g = document.querySelector(`#soro .bead[data-r="${rod}"][data-k="${k}"]`).getBoundingClientRect();
      return { x: g.left + g.width / 2, y: g.top + g.height / 2 };
    }, [rod, k]);
    const tapBead = async (rod, k) => { const p = await beadAt(rod, k); await page.mouse.click(p.x, p.y); await page.waitForTimeout(180); };
    const value = () => page.evaluate(() => window.__soro.soro.value());
    const geo = () => page.evaluate(() => { const s = window.__soro.soro; return { N: s.N, unit: s.unit, colW: s.colW * s.svg.getBoundingClientRect().width / s.W }; });

    await page.screenshot({ path: `${out}/${tag}-1-home.png`, fullPage: true });
    await noHScroll("home");

    // じゆう: タップと スワイプ
    await page.click('[data-go="free"]');
    await page.waitForTimeout(400);
    const g = await geo();
    console.log(tag, g);
    check(g.N >= (tag === "tablet" ? 13 : 5), `${tag}: けたの かず ${g.N}`);
    if (tag === "tablet") check(g.colW >= 44, `${tag}: けた はば ${g.colW.toFixed(1)}px ≥ 44`);
    else check(g.colW >= 44, `${tag}: たてでも けた はば ${g.colW.toFixed(1)}px ≥ 44`);
    await fits("free", "#soro svg");
    await tapBead(g.unit, 2);                    // 1だま 2こめ → 2
    check(await value() === 2, `${tag}: 1だまを タップで 2`);
    await tapBead(g.unit, 0);                    // 5だま → 7
    check(await value() === 7, `${tag}: 5だまを タップで 7`);
    await tapBead(g.unit, 1);                    // 1だま 1こめ（あがっている）→ さげる → 5
    check(await value() === 5, `${tag}: あがった 1だまを タップで さげる`);
    // スワイプで じゅうの くらいに 3
    const b3 = await beadAt(g.unit - 1, 3);
    await page.mouse.move(b3.x, b3.y); await page.mouse.down(); await page.mouse.move(b3.x, b3.y - 40, { steps: 5 }); await page.mouse.up();
    await page.waitForTimeout(200);
    check(await value() === 35, `${tag}: スワイプで 1だまを あげる → 35 (${await value()})`);
    const fv = await page.evaluate(() => document.querySelector(".finger").className);
    check(/show/.test(fv), `${tag}: ゆびの アイコンが でる (${fv})`);
    await page.screenshot({ path: `${out}/${tag}-2-free.png` });
    await page.click("#b-clear");
    await page.waitForTimeout(1200);
    check(await value() === 0, `${tag}: ごはさんで 0`);

    // ステップ1: かずを おく → わざと まちがえる → あかい たま
    await page.click("#back");
    await page.click('[data-step="1"]');
    await page.waitForTimeout(600);
    const ans = await page.evaluate(() => document.querySelector("#prob .big").textContent);
    check(/^[1-9]$/.test(ans), `${tag}: ステップ1 もんだい ${ans}`);
    await page.click("#b-ok");                    // 0 の まま
    await page.waitForTimeout(400);
    const red = await page.evaluate(() => document.querySelectorAll("#soro .bead.wrong").length);
    check(red > 0, `${tag}: まちがいの たまが あかい (${red})`);
    await page.screenshot({ path: `${out}/${tag}-3-wrong.png` });
    await page.waitForTimeout(3600);
    await page.screenshot({ path: `${out}/${tag}-4-replay.png` });
    await page.click("#b-ok");                    // とばす
    await page.waitForTimeout(500);
    // ただしく おく
    const n = +ans;
    if (n >= 5) await tapBead(g.unit, 0);
    if (n % 5) await tapBead(g.unit, n % 5);
    check(await value() === n, `${tag}: ${n} を おけた`);
    await page.click("#b-ok");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${tag}-5-ok.png` });

    // ステップ5: こつの みほん
    await page.click("#back");
    await page.click('[data-step="5"]');
    await page.waitForTimeout(5200);
    await page.screenshot({ path: `${out}/${tag}-6-kotsu.png` });
    await fits("step5", "#b-ok");
    await page.click("#b-ok");                   // とばす
    await page.waitForTimeout(800);
    const p5 = await page.evaluate(() => document.querySelector("#prob .big").textContent);
    check(/[＋−]/.test(p5), `${tag}: ステップ5 もんだい ${p5}`);

    // ステップ6: みとりざん
    await page.click("#back");
    await page.click('[data-step="6"]');
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${tag}-7-mitori.png` });
    await fits("mitori", "#b-ok");
    await noHScroll("mitori");

    // しんさ
    await page.click("#back");
    await page.click('[data-go="test"]');
    await page.screenshot({ path: `${out}/${tag}-8-kyu.png`, fullPage: true });
    await page.click('[data-kyu="10"]');
    await page.waitForTimeout(500);
    for (let i = 0; i < 10; i++) {
      const a = await page.evaluate(() => { const p = document.querySelector("#prob .tate"); return [...p.children].filter((d) => d.textContent).map((d) => +d.textContent.replace("−", "-")).reduce((s, x) => s + x, 0); });
      await page.evaluate((a) => window.__soro.soro.setValue(a, false), a);
      if (i === 0) await page.screenshot({ path: `${out}/${tag}-9-test.png` });
      await page.click("#b-ok");
      await page.waitForTimeout(250);
    }
    const res = await page.evaluate(() => document.querySelector("#result h2").textContent);
    check(/ごうかく/.test(res), `${tag}: 10きゅう ごうかく (${res})`);
    await page.screenshot({ path: `${out}/${tag}-10-result.png`, fullPage: true });
    const kyu = await page.evaluate(() => JSON.parse(localStorage.getItem("soroban-dojo-v1")).kyu);
    check(kyu === 10, `${tag}: きゅうを ほぞん`);

    // ちょうせん
    await page.click("#r-home");
    await page.click('[data-go="chal"]');
    await page.click("#b-ok");
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => document.querySelector("#prob .testhead span").textContent);
    await page.evaluate(() => { const s = window.__soro.soro; const b = document.querySelector("#prob .big").textContent.split(/\s+/); const a = +b[0], c = +b[2]; s.setValue(b[1] === "−" ? a - c : a + c, false); s.onUser([], s.getRods()); });
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => document.querySelector("#prob .testhead span").textContent);
    check(before !== after, `${tag}: ちょうせん こたえで つぎへ (${before} → ${after})`);
    await page.screenshot({ path: `${out}/${tag}-11-chal.png` });

    // あんざん
    await page.click("#back");
    await page.click('[data-go="anzan"]');
    await page.screenshot({ path: `${out}/${tag}-12-anzan.png` });
    await page.click("#a-start");
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/${tag}-13-peek.png` });
    await page.waitForTimeout(1700);
    check(await page.evaluate(() => !document.querySelector("#a-cover").hidden), `${tag}: そろばんが かくれる`);
    await page.screenshot({ path: `${out}/${tag}-14-peek-q.png` });
    await fits("anzan keypad", "#keypad");
    await page.click("#back");
    await page.click('[data-go="anzan"]');
    await page.click('[data-am="flash"]');
    await page.click("#a-start");
    await page.waitForTimeout(2300);
    await page.screenshot({ path: `${out}/${tag}-15-flash.png` });

    check(errors.length === 0, `${tag}: エラーなし ${errors.join(" / ")}`);
    await page.close();
  }
  await browser.close();
  console.log(failed ? `NG ${failed}` : "ALL OK");
  process.exit(failed ? 1 : 0);
})();
