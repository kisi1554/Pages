// Playwright で ひととおり あそぶ: node shinkansen-juudan/check.js [スクショの でる ディレクトリ]
// 縦スマホ・横タブレットで おおきな えき コースを ゴールまで（1回まちがい・のりかえ 1回まちがい ふくむ）
const { chromium, devices } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(require('os').tmpdir(), 'shinkansen-juudan-shots');
require('fs').mkdirSync(out, { recursive: true });
const url = 'file://' + path.join(__dirname, 'index.html');

async function waitPhase(page, ph, ms = 15000) {
  await page.waitForFunction(p => G && G.phase === p && document.querySelectorAll('#choices button:not([disabled])').length > 0, ph, { timeout: ms });
}
async function run(name, ctxOpt) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(ctxOpt);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  const ow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ow > 0) errs.push('よこに はみでる ' + ow);
  await page.screenshot({ path: `${out}/${name}-home.png` });
  await page.click('.course.big');
  let shots = 0, wrongDone = false, xferWrongDone = false;
  for (let guard = 0; guard < 40; guard++) {
    await page.waitForFunction(() => G && ['ask', 'xfer', 'detour', 'nakama'].includes(G.phase) &&
      document.querySelectorAll('#choices button:not([disabled])').length > 0, null, { timeout: 20000 });
    const ph = await page.evaluate(() => G.phase);
    if (ph === 'nakama') break;
    if (ph === 'detour') {
      if (shots < 9) await page.screenshot({ path: `${out}/${name}-detour.png` });
      await page.click('#choices .tbtn.go');
      await waitPhase(page, 'xfer');
      continue;
    }
    if (ph === 'xfer') {
      if (!xferWrongDone) {
        xferWrongDone = true;
        await page.screenshot({ path: `${out}/${name}-xfer.png` });
        const idx = await page.evaluate(() => [...document.querySelectorAll('#choices .ch')].findIndex(b => !b.textContent.includes(LINES[TRANSFER[curNode().n].ok].name)));
        await page.locator('#choices .ch').nth(idx).click();
        continue;
      }
      const idx = await page.evaluate(() => [...document.querySelectorAll('#choices .ch')].findIndex(b => b.textContent.includes(LINES[TRANSFER[curNode().n].ok].name)));
      await page.locator('#choices .ch').nth(idx).click();
      await page.waitForFunction(() => G.phase === 'ask', null, { timeout: 8000 });
      continue;
    }
    // ask
    const info = await page.evaluate(() => {
      const bs = [...document.querySelectorAll('#choices .ch')];
      return { ok: bs.findIndex(b => b.querySelector('.nm ruby').firstChild && b.querySelector('.nm').textContent.startsWith(G.ans)),
        names: bs.map(b => b.querySelector('.nm').textContent), ans: G.ans };
    });
    if (info.ok < 0) { errs.push('こたえの カードが ない ' + JSON.stringify(info)); break; }
    if (new Set(info.names).size !== 3) errs.push('カードが 3まい ちがう なまえで ない ' + info.names);
    if (shots++ === 1) await page.screenshot({ path: `${out}/${name}-ask.png` });
    if (!wrongDone) {
      wrongDone = true;
      await page.locator('#choices .ch').nth((info.ok + 1) % 3).click();
      await page.waitForTimeout(300);
    }
    await page.locator('#choices .ch').nth(info.ok).click();
    if (shots === 3) { await page.waitForSelector('#pop.on', { timeout: 8000 }); await page.screenshot({ path: `${out}/${name}-food.png` }); }
    await page.waitForFunction(() => G && G.phase !== 'move', null, { timeout: 15000 });
  }
  await page.screenshot({ path: `${out}/${name}-nakama.png` });
  // なかま あつめ: 正解を ぜんぶ タッチ
  const K = await page.evaluate(() => document.querySelector('#bubble .k').textContent);
  const cards = page.locator('#choices .nk .ch');
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    const t = await cards.nth(i).locator('.nm').evaluate(e => e.querySelector('ruby').childNodes ? [...e.querySelector('ruby').childNodes].filter(x => x.nodeName !== 'RT').map(x => x.textContent).join('') : '');
    if (t.includes(K)) await cards.nth(i).click();
  }
  await page.waitForSelector('#result.on', { timeout: 8000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${name}-result.png` });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('shinkansen-juudan-v1')));
  if (!saved.clears.big) errs.push('クリアが ほぞん されてない');
  console.log(name, 'えきべん', Object.keys(saved.foods).length, 'ほし', saved.clears.big);
  // ボーナスが ひらく・ずかん
  await page.click('#rHome');
  if (await page.locator('.course.lock').count()) errs.push('ボーナスが ひらかない');
  await page.click('#zkBtn');
  await page.screenshot({ path: `${out}/${name}-zukan.png` });
  // ほかの コースも はじめられる
  await page.click('#zkBack');
  for (const i of [1, 5, 7]) {
    await page.locator('.course').nth(i).click();
    await waitPhase(page, 'ask', 8000);
    await page.click('#homeBtn');
  }
  await browser.close();
  console.log(name, errs.length ? 'NG\n' + errs.join('\n') : 'OK');
  return errs.length;
}
(async () => {
  let bad = 0;
  bad += await run('phone', { ...devices['iPhone 13'] });
  bad += await run('tablet', { viewport: { width: 1180, height: 820 }, hasTouch: true });
  process.exit(bad ? 1 : 0);
})();
