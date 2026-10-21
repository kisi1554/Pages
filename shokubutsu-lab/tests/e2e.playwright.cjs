// ブラウザで 4つの モードを じどうで うごかし、スマホ（390×844）と タブレット（1024×768）で スクショを とる。
//   NODE_PATH=$(npm root -g) node shokubutsu-lab/tests/e2e.playwright.cjs [スクショの ほぞんさき]
// （node --test の たいしょう がいに するため .test.js に しない）
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const OUT = process.argv[2] || path.join(require('node:os').tmpdir(), 'shokubutsu-lab-shots');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'tablet', width: 1024, height: 768 }
];
const ISSUES = [];
function check(ok, msg) { if (!ok) ISSUES.push(msg); }

// よこスクロール・もじの はみだし
async function fits(page, label) {
  const bad = await page.evaluate(() => {
    const out = [];
    const vw = innerWidth;
    if (document.documentElement.scrollWidth > vw + 1) out.push('よこスクロール ' + document.documentElement.scrollWidth);
    for (const e of document.querySelectorAll('.view:not([hidden]) *, .topbar *, .dock *, .modal:not([hidden]) *')) {
      if (e.closest('[hidden], svg') || !e.getClientRects().length) continue;
      const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      const b = e.getBoundingClientRect();
      if (b.right > vw + 1 || b.left < -1) out.push('はみだし「' + e.textContent.trim().slice(0, 16) + '」');
      const cs = getComputedStyle(e);
      if (cs.overflowX === 'hidden' && cs.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 1) out.push('きれる「' + e.textContent.trim().slice(0, 16) + '」');
    }
    // ボタンは 40px いじょう
    for (const e of document.querySelectorAll('.view:not([hidden]) button, .dock button, .modal:not([hidden]) button')) {
      if (e.closest('[hidden]') || !e.getClientRects().length) continue;
      const b = e.getBoundingClientRect();
      if (b.height < 39.5) out.push('ちいさい ボタン「' + e.textContent.trim().slice(0, 12) + '」' + Math.round(b.height));
    }
    return [...new Set(out)];
  });
  bad.forEach((x) => ISSUES.push(label + ': ' + x));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(URL);
    const L = (s) => vp.name + ' ' + s;
    const shot = (n) => page.screenshot({ path: path.join(OUT, vp.name + '-' + n + '.png') });

    /* 1. めが でる */
    await page.click('.tg[data-pot="1"][data-k="water"]');
    await page.click('.tg[data-pot="2"][data-k="light"]');
    await page.click('.tg[data-pot="3"][data-k="temp"]');
    await page.click('.tg[data-pot="4"][data-k="fert"]');
    await page.click('#btnRun');
    await page.waitForFunction(() => document.querySelector('#potDay').textContent === '7にちめ');
    const res = await page.$$eval('.pot-res', (xs) => xs.map((x) => x.classList.contains('ok')));
    check(JSON.stringify(res) === JSON.stringify([true, false, true, false, true]), L('はつがの けっか ' + JSON.stringify(res)));
    await page.click('[data-pick="0"]'); await page.click('[data-pick="1"]');
    check(/みず は .*ひつよう/.test(await page.textContent('#cmpMsg')), L('みず ひつよう'));
    await page.click('[data-pick="0"]'); await page.click('[data-pick="2"]');
    check(/いらない/.test(await page.textContent('#cmpMsg')), L('ひかり いらない'));
    await page.click('[data-pick="0"]'); await page.click('[data-pick="3"]');
    check(/くらべられない/.test(await page.textContent('#cmpMsg')), L('れいぞうこは 2つ ちがう'));
    await page.click('[data-starch="before"]'); await page.click('[data-starch="after"]');
    await page.locator('#cmpBox').scrollIntoViewIfNeeded();
    await fits(page, L('めが でる'));
    await shot('1-hatsuga');

    /* 2. よく そだつ */
    await page.click('.dock-btn[data-view="seicho"]');
    await page.click('#btnGrow');
    await page.waitForFunction(() => document.querySelector('#growDay').textContent === '14にちめ', null, { timeout: 8000 });
    await page.click('[data-gpick="0"]'); await page.click('[data-gpick="2"]');
    check(/ひかり は せいちょうに ひつよう/.test(await page.textContent('#growMsg')), L('ひかり せいちょう'));
    await page.click('[data-gpick="1"]'); await page.click('[data-gpick="2"]');
    check(/くらべられない/.test(await page.textContent('#growMsg')), L('B と C は くらべられない'));
    check((await page.$$('#growChart rect')).length >= 14 * 3, L('ぼうグラフ'));
    await fits(page, L('よく そだつ'));
    await page.locator('#growChart').scrollIntoViewIfNeeded();
    await shot('2-seicho');

    /* 3. そだてる（アサガオ） */
    await page.click('.dock-btn[data-view="sodate"]');
    await page.click('#btnPlay');
    // みずやり しながら つぼみまで
    for (let i = 0; i < 200; i++) {
      const day = parseInt(await page.textContent('#sDay'), 10);
      if (day >= 52) break;
      const playing = (await page.textContent('#btnPlay')).includes('とめる');
      if (!playing) {
        if (await page.$('#btnWater.want')) await page.click('#btnWater', { force: true });
        await page.click('#btnPlay');
      }
      await page.waitForTimeout(300);
    }
    if ((await page.textContent('#btnPlay')).includes('とめる')) await page.click('#btnPlay');
    check(parseInt(await page.textContent('#sDay'), 10) >= 50, L('アサガオが そだつ'));
    await fits(page, L('そだてる'));
    await shot('3-sodate');
    await page.click('#btnCard');
    const leaves = await page.$$eval('#cmScene .honba', (x) => x.length);
    await page.fill('#cmHeight', '170');
    for (let i = 0; i < leaves; i++) await page.click('#lfPlus');
    await page.click('#cmSave');
    check(/はの かずも せいかい/.test(await page.textContent('#cmMsg')), L('はの かず せいかい ' + leaves));
    await fits(page, L('かんさつカード'));
    await shot('3b-card');
    await page.click('#cmClose');
    check((await page.$$('.kcard')).length >= 1, L('カードが のこる'));

    /* 4. はな */
    await page.click('.dock-btn[data-view="hana"]');
    await page.locator('#flower [data-part="meshibe"] circle').last().click();
    check(/めしべ/.test(await page.textContent('#partMsg')), L('めしべの なまえ'));
    // ふでで ほかの はなの おしべ → A の めしべ
    await page.click('[data-tool="brush"]');
    const tap = async (sel) => {
      const b = await page.locator(sel).boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down(); await page.mouse.up();
    };
    await tap('[data-pf="src"] [data-part="oshibe"] rect');
    await tap('[data-pf="a"] [data-part="meshibe"] circle:last-child');
    await page.click('#btnPollen');
    const fr = await page.$$eval('.pflower .result-svg', (xs) => xs.map((x) => x.textContent.trim()));
    check(fr[0] === 'み が できた' && fr[1] === 'かれて おちた', L('アサガオ じゅふん ' + JSON.stringify(fr)));
    await fits(page, L('はな'));
    await page.locator('#pGame').scrollIntoViewIfNeeded();
    await shot('4-hana');
    // ヘチマ
    await page.click('[data-fk="hechimaM"]');
    await page.click('[data-tool="bee"]');
    await tap('[data-pf="src"] [data-part="oshibe"] rect');
    await tap('[data-pf="b"] [data-part="meshibe"] circle:last-child');
    await page.click('#btnPollen');
    const fr2 = await page.$$eval('.pflower .result-svg', (xs) => xs.map((x) => x.textContent.trim()));
    check(fr2[0] === 'かれて おちた' && fr2[1] === 'み が できた', L('ヘチマ じゅふん ' + JSON.stringify(fr2)));
    await page.locator('#pGame').scrollIntoViewIfNeeded();
    await shot('4b-hechima');

    // ほぞん が のこる
    await page.reload();
    check(+(await page.textContent('#stampCount')) >= 5, L('スタンプが のこる'));
    errs.forEach((e) => ISSUES.push(L('エラー ' + e)));
    await ctx.close();
  }
  await browser.close();
  if (ISSUES.length) { console.log('NG\n' + ISSUES.join('\n')); process.exit(1); }
  console.log('OK スクショ: ' + OUT);
})();
