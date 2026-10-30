// NODE_PATH=$(npm root -g) node oto-lab/tests/e2e.js [スクショの でぐち]
// Playwright（Chromium）で スマホたて（390×844）・タブレットよこ（1024×768）を うごかして スクショを とる。
// マイクは モック（getUserMedia を 220Hz の ごうせいおん の ストリームに おきかえる）
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const out = process.argv[2] || path.join(__dirname, "shots");
const url = "file://" + path.resolve(__dirname, "../index.html");
fs.mkdirSync(out, { recursive: true });

const MIC_MOCK = () => {
  window.__micCalls = 0;
  const md = navigator.mediaDevices || (navigator.mediaDevices = {});
  md.getUserMedia = async () => {
    window.__micCalls++;
    const ac = new AudioContext(), o = ac.createOscillator(), g = ac.createGain(), d = ac.createMediaStreamDestination();
    o.frequency.value = 220; g.gain.value = 0.5; o.connect(g); g.connect(d); o.start();
    return d.stream;
  };
};

(async () => {
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  let failed = 0;
  const check = (ok, msg) => { if (!ok) { failed++; console.log("NG", msg); } else console.log("ok", msg); };
  for (const [tag, vp] of [["phone", { width: 390, height: 844 }], ["tablet", { width: 1024, height: 768 }]]) {
    const page = await browser.newPage({ viewport: vp, hasTouch: true });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.addInitScript(MIC_MOCK);
    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const shot = (n) => page.screenshot({ path: path.join(out, `${tag}-${n}.png`) });
    const noHScroll = async (where) => {
      const bw = await page.evaluate(() => document.documentElement.scrollWidth);
      check(bw <= vp.width, `${tag} ${where}: よこに はみださない (${bw})`);
    };
    const found = (id) => page.evaluate((id) => { const s = JSON.parse(localStorage.getItem("oto-lab-v1") || "{}"); return s.exp && s.exp[id] ? s.exp[id].found : {}; }, id);
    const svgXY = (sel, x, y) => page.evaluate(([s, x, y]) => {
      const svg = document.querySelector(s), p = svg.createSVGPoint(); p.x = x; p.y = y;
      const q = p.matrixTransform(svg.getScreenCTM()); return [q.x, q.y];
    }, [sel, x, y]);
    const btn = (text) => page.locator("#expBody button", { hasText: text }).first();
    const open = async (i) => {
      await page.locator("#homeBtn").click();
      await page.locator(".excard").nth(i).click();
      await page.locator(".choice").first().waitFor();
    };
    const pickAndTry = async (n) => { await page.locator(".choice").nth(n).click(); await btn("ためして").click(); };

    // ---------- ホーム ----------
    check((await page.locator(".excard").count()) === 8, `${tag}: じっけん 8つ`);
    await noHScroll("ホーム");
    await shot("home");

    // ---------- 1 わゴム ----------
    await open(0); await shot("1-yosou"); await pickAndTry(0);
    await btn("そっと").click(); await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, `${tag}-1-gomu.png`) });
    await btn("ゆびで とめる").click();
    await page.locator("#expBody input[type=range]").first().fill("150"); // みじかく
    await page.locator("#expBody input[type=range]").nth(1).fill("225");  // ピン
    await btn("つよく").click(); await page.waitForTimeout(200);
    let f = await found("gomu");
    check(f.furue && f.tomeru && f.nagasa && f.hari && f.tsuyosa, `${tag}: わゴム 5つ みつけた ${JSON.stringify(f)}`);
    await noHScroll("わゴム");
    await shot("1-gomu-b");
    await page.locator(".step[data-step='3']").click();
    check((await page.locator(".res.hit").count()) === 1, `${tag}: よそう あたり`);
    await page.locator("#expBody button", { hasText: "はんこ" }).click();
    await shot("1-wakatta");

    // ---------- 2 たいこ ----------
    await open(1); await pickAndTry(0);
    await btn("そっと").click(); await page.waitForTimeout(100);
    await btn("つよく").click(); await page.waitForTimeout(120);
    await shot("2-taiko");
    await btn("おさえる").click();
    f = await found("taiko"); check(f.haneru && f.tsuyoku && f.osaeru, `${tag}: たいこ 3つ`);

    // ---------- 3 コップ ----------
    await open(2); await pickAndTry(1);
    const sel = "#expBody svg";
    await page.locator(sel).scrollIntoViewIfNeeded();
    for (const i of [0, 3]) { const [x, y] = await svgXY(sel, 180 - 2.5 * 58 + i * 58, 200); await page.mouse.click(x, y); await page.waitForTimeout(80); }
    await btn("ふく").click();
    for (const i of [0, 3]) { const [x, y] = await svgXY(sel, 180 - 2.5 * 58 + i * 58, 200); await page.mouse.click(x, y); await page.waitForTimeout(80); }
    await btn("たたく").click();
    // ドラッグで 水を へらす
    { const [x, y] = await svgXY(sel, 180 - 2.5 * 58 + 3 * 58, 110); await page.mouse.move(x, y); await page.mouse.down(); const [, y2] = await svgXY(sel, 0, 200); await page.mouse.move(x, y2, { steps: 6 }); await page.mouse.up(); }
    await btn("じどうで").click();
    check(await btn("ひいて みる").isEnabled(), `${tag}: ドレミが そろうと ひける`);
    await btn("ひいて みる").click();
    const P = await page.evaluate(() => OtoPhys.KAERU.map((n) => n[0]));
    await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: "start" }), sel);
    for (const i of P) { const [x, y] = await svgXY(sel, 180 - 2.5 * 58 + i * 58, 200); await page.mouse.click(x, y); }
    await page.waitForTimeout(100);
    f = await found("koppu"); check(f.tataku && f.fuku && f.uta, `${tag}: コップ 3つ ${JSON.stringify(f)}`);
    await shot("3-koppu");
    // むき: ドの コップ（水 いっぱい）が いちばん ひくい
    const fl = await page.evaluate(() => OtoPhys.NOTES.map((n) => OtoPhys.fillForStrike(n.f)));
    check(fl[0] > fl[5], `${tag}: ドの コップが いちばん 水が おおい`);

    // ---------- 4 いとでんわ ----------
    await open(3); await pickAndTry(1);
    for (const m of ["ピンと", "たるませる", "つまむ"]) {
      await btn(m).click(); await btn("もしもし").click();
      await page.waitForTimeout(m === "ピンと" ? 1100 : 900);
      if (m === "ピンと") await shot("4-itodenwa");
      await page.waitForTimeout(1700);
    }
    f = await found("itodenwa"); check(f.pin && f.slack && f.pinch, `${tag}: いとでんわ 3つ ${JSON.stringify(f)}`);

    // ---------- 5 かみなり ----------
    await open(4); await pickAndTry(0);
    await page.locator("#expBody input[type=checkbox]").check();
    for (let k = 0; k < 2; k++) {
      await btn("かみなりを まつ").click();
      await page.locator(".calc:not([hidden])").waitFor({ timeout: 15000 });
      if (!k) await shot("5-kaminari");
      const txt = await page.locator(".calc").textContent();
      const m = txt.match(/([\d.]+)秒(?:びょう)?\s*×\s*340m\s*＝\s*やく\s*(\d+)m/);
      check(m && Math.abs(+m[1] * 340 - +m[2]) < 1, `${tag}: びょう × 340 = きょり (${m && m[0]})`);
    }
    f = await found("kaminari"); check(f.saki && f.keisan && f.tooi, `${tag}: かみなり 3つ`);

    // ---------- 6 やまびこ ----------
    await open(5); await pickAndTry(1);
    await page.locator("#expBody input[type=range]").fill("170");
    await btn("やっほー").click(); await page.waitForTimeout(500); await shot("6-yamabiko");
    await page.waitForTimeout(800);
    check((await page.locator("#expBody svg text", { hasText: "1.0びょう" }).count()) === 1, `${tag}: 170m → 1.0びょう`);
    await page.locator("#expBody input[type=range]").fill("680");
    await btn("やっほー").click(); await page.waitForTimeout(4300);
    await btn("けいさん").click();
    check(/やく 680m/.test(await page.locator(".calc").textContent()), `${tag}: やまびこ 4びょう → 680m`);
    f = await found("yamabiko"); check(f.kaeru && f.tooi && f.nibai, `${tag}: やまびこ 3つ`);

    // ---------- 7 なみ（ごうせいおん → マイク モック）----------
    await open(6); await pickAndTry(0);
    await btn("ボー").click(); await page.waitForTimeout(100);
    await shot("7-nami-low");
    await btn("ピー").click();
    await page.locator("#expBody input[type=range]").nth(1).fill("100");
    await page.locator("#expBody input[type=range]").nth(1).fill("10");
    await page.waitForTimeout(100);
    await shot("7-nami-high");
    await btn("マイク").first().click();
    check((await btn("せってい を ひらく").count()) === 1, `${tag}: どうい まえは マイクを つかわない`);
    check((await page.evaluate(() => window.__micCalls)) === 0, `${tag}: どうい まえに getUserMedia を よばない`);
    await btn("せってい を ひらく").click();
    await page.locator("#micOk").check();
    await page.locator("#setClose").click();
    await btn("マイク").first().click();
    await btn("マイクで ためす").click();
    await page.waitForTimeout(500);
    check(await page.locator(".micon").isVisible(), `${tag}: マイク オン の しるし`);
    await shot("7-nami-mic");
    f = await found("nami"); check(f.koma && f.ookii && f.koe, `${tag}: なみ 3つ ${JSON.stringify(f)}`);
    const live = await page.evaluate(() => window.__micCalls);
    await page.locator("#homeBtn").click();
    check(live === 1, `${tag}: getUserMedia は 1かい`);

    // ---------- 8 うちゅう ----------
    await open(7); await pickAndTry(1);
    await btn("3つ どうじに").click(); await page.waitForTimeout(1500); await shot("8-uchu");
    await page.waitForTimeout(3300);
    await btn("なかの ベル").click();
    await page.locator("#expBody input[type=range]").fill("0");
    await btn("なかの ベル").click();
    f = await found("uchu"); check(f.uchu && f.mizu && f.nuku, `${tag}: うちゅう 3つ`);
    await noHScroll("うちゅう");

    // ---------- ノート ----------
    await page.locator("#noteBtn").click();
    const ns = await page.locator("#noteSum").textContent(); check(/26 \/ 26/.test(ns), `${tag}: ノート 26 / 26 (${ns})`);
    check((await page.locator(".hanko").count()) === 1, `${tag}: はんこ 1つ`);
    await shot("note");
    // ほぞん が のこる
    await page.reload();
    check((await page.locator(".excard.done").count()) === 1, `${tag}: リロード しても のこる`);
    check(errors.length === 0, `${tag}: エラー なし ${errors.join(" / ")}`);
    await page.close();
  }
  await browser.close();
  console.log(failed ? `\n${failed} こ NG` : "\nぜんぶ ok");
  process.exit(failed ? 1 : 0);
})();
