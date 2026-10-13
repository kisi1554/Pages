'use strict';
/* =========================================================
   まわして できる かたち（回転体）… 平面図形を じくの まわりに 1しゅう
   りったい タブの サブモード
   ========================================================= */
const RevolveMode = (() => {
  const cv = $('cvRevolve');
  const view = new View3D(cv);
  view.R = M3.mul(M3.rotX(0.35), M3.rotY(-0.5)); view.R0 = view.R.slice();
  const U = 0.42; // 1ます
  const arc = (cx, cy, r, a0, a1, n) => [...Array(n + 1)].map((_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  const PI = 3.14;
  const SH = [
    { id: 'rect', n: R('長方形', 'ちょうほうけい'), to: R('円柱', 'えんちゅう'), p: [[0, 0], [2, 0], [2, 4], [0, 4]],
      vol: { lv: 'mid', f: '2 × 2 × 3.14 × 4', v: 2 * 2 * PI * 4 },
      facts: ['じくに くっついた へんは うごかない。はなれた へんが まわって まがった めんに なる', 'よこの へんが まわると ' + R('円', 'えん') + 'の めん（' + R('底面', 'ていめん') + '）に なる'] },
    { id: 'rtri', n: R('直角三角形', 'ちょっかくさんかくけい'), to: R('円', 'えん') + 'すい', p: [[0, 0], [2, 0], [0, 4]],
      vol: { lv: 'exam', f: '2 × 2 × 3.14 × 4 ÷ 3', v: 2 * 2 * PI * 4 / 3 },
      facts: ['ななめの へんが まわって とがった まがった めんに なる', 'おなじ そこと たかさの ' + R('円柱', 'えんちゅう') + 'の 3ぶんの1の ' + R('体積', 'たいせき')] },
    { id: 'semi', n: R('半円', 'はんえん'), to: R('球', 'きゅう'), p: arc(0, 2, 2, -Math.PI / 2, Math.PI / 2, 24),
      vol: { lv: 'exam', f: '2 × 2 × 2 × 3.14 × 4 ÷ 3', v: 4 / 3 * PI * 8 },
      facts: ['はんえんの まっすぐな へんを じくに すると ' + R('球', 'きゅう'), 'どこから みても ' + R('円', 'えん')] },
    { id: 'trap', n: R('台形', 'だいけい'), to: R('円', 'えん') + 'すい' + R('台', 'だい'), p: [[0, 0], [3, 0], [1.5, 3], [0, 3]],
      vol: { lv: 'exam', f: 'おおきい ' + R('円', 'えん') + 'すい − ちいさい ' + R('円', 'えん') + 'すい', v: 3 * 3 * PI * 6 / 3 - 1.5 * 1.5 * PI * 3 / 3 },
      facts: [R('円', 'えん') + 'すいの あたまを きりとった かたち（バケツや プリンの かたち）', 'のばすと おおきな ' + R('円', 'えん') + 'すいに なる'] },
    { id: 'ring', n: 'はなれた ' + R('長方形', 'ちょうほうけい'), to: 'あなあき ' + R('円柱', 'えんちゅう'), p: [[1, 0], [3, 0], [3, 3], [1, 3]],
      vol: { lv: 'mid', f: '(3×3 − 1×1) × 3.14 × 3', v: (9 - 1) * PI * 3 },
      facts: ['じくから はなれていると まんなかに あなが あく', 'そとの ' + R('円柱', 'えんちゅう') + ' − あなの ' + R('円柱', 'えんちゅう') + ' で もとめられる'] },
    { id: 'step', n: 'L の かたち', to: '2だんの ' + R('円柱', 'えんちゅう'), p: [[0, 0], [3, 0], [3, 1.5], [1.5, 1.5], [1.5, 3.5], [0, 3.5]],
      vol: { lv: 'mid', f: '3×3×3.14×1.5 ＋ 1.5×1.5×3.14×2', v: 9 * PI * 1.5 + 2.25 * PI * 2 },
      facts: ['ケーキのような 2だんの かたち', 'したの ' + R('円柱', 'えんちゅう') + 'と うえの ' + R('円柱', 'えんちゅう') + 'を たす'] },
    { id: 'dbl', n: R('三角形', 'さんかくけい'), to: R('円', 'えん') + 'すい 2つ', p: [[0, 0], [2, 2], [0, 4]],
      vol: { lv: 'exam', f: '(2×2×3.14×2 ÷ 3) × 2', v: 2 * (4 * PI * 2 / 3) },
      facts: ['そろばんの たまの かたち', R('円', 'えん') + 'すいを そこどうしで くっつけた かたち'] },
    { id: 'torus', n: 'はなれた ' + R('円', 'えん'), to: 'ドーナツ', p: arc(2.4, 2, 1, -Math.PI / 2, Math.PI * 1.5, 28).slice(0, -1),
      vol: null, facts: ['じくから はなれた まるを まわすと ドーナツ（' + R('円環体', 'えんかんたい') + '）', 'うきわも この かたち'] },
  ];
  const done = new Set(Store.get('revolveDone', []));
  let cur = SH[0], th = 0, target = 0, half = false;
  const box = $('revShapes');
  SH.forEach(s => {
    const b = document.createElement('button'); b.innerHTML = s.n; b.dataset.id = s.id;
    b.addEventListener('click', () => { Snd.tap(); load(s); }); box.appendChild(b);
  });
  function load(s) {
    cur = s; th = 0; target = 0; $('rgRev').value = 0;
    box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.id === s.id));
    const ys = s.p.map(p => p[1]), xs = s.p.map(p => p[0]);
    const h = Math.max(...ys) - Math.min(...ys), w = Math.max(...xs);
    cur.y0 = (Math.max(...ys) + Math.min(...ys)) / 2;
    view.fitTo([0, 0, 0], Math.max(w, h / 2 + 0.3) * U * 1.25 + 0.4);
    $('revTitle').innerHTML = `${s.n} を まわすと…？`;
    $('revMsg').innerHTML = 'あかい ' + s.n + 'を、てんせんの じくの まわりに 1しゅう まわしてみよう。「🌀 まわす」を おしてね。';
    $('revVol').innerHTML = '';
    $('revFacts').innerHTML = '';
    view.dirty = true;
  }
  // おくがわへ まわす（てまえに あかい 図形と きりくちが みえるように）
  const P3 = ([x, y], a) => [x * U * Math.cos(a), (y - cur.y0) * U, -x * U * Math.sin(a)];
  function edgeCol(a, b) {
    if (cur.id === 'semi' || cur.id === 'torus') return [144, 202, 249];
    if (Math.abs(a[1] - b[1]) < 1e-6) return [255, 209, 102];
    if (Math.abs(a[0] - b[0]) < 1e-6) return [129, 212, 250];
    return [244, 143, 177];
  }
  function draw() {
    view.clear();
    const items = [], P = cur.p, n = P.length;
    const lim = half ? Math.min(th, 180) : th, A = lim * Math.PI / 180;
    const steps = Math.max(1, Math.ceil(lim / 7.5));
    const closed = cur.id !== 'semi'; // はんえんの まっすぐな へんは じくの うえ
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n];
      if (!closed && i === n - 1) break;
      if (a[0] < 1e-6 && b[0] < 1e-6) continue;
      const col = edgeCol(a, b);
      for (let k = 0; k < steps; k++) {
        const f0 = A * k / steps, f1 = A * (k + 1) / steps;
        let q = [P3(a, f0), P3(b, f0), P3(b, f1), P3(a, f1)];
        q = q.filter((p, j) => V3.dist(p, q[(j + 1) % 4]) > 1e-9);
        if (q.length >= 3) items.push({ p: q, col, noCull: true, noEdge: true });
      }
    }
    // あかい 平面図形（まわる ほう と、はじめの いち）
    const prof = a => ({ p: P.map(q => P3(q, a)), col: [255, 90, 95], alpha: 0.85, noCull: true, lw: 2.5, edgeCol: '#b71c1c' });
    if (lim < 360 || half) items.push(prof(A));
    if (half && lim >= 180) items.push(prof(0));
    else if (lim > 0 && lim < 360) items.push({ ...prof(0), alpha: 0.35 });
    if (lim === 0) items.push(prof(0));
    view.drawPolys(items, { cull: false });
    // じく
    const ys = P.map(p => p[1]);
    view.line([0, (Math.min(...ys) - cur.y0 - 1) * U, 0], [0, (Math.max(...ys) - cur.y0 + 1) * U, 0], '#e5484d', 3, [8, 6]);
    view.label([0, (Math.max(...ys) - cur.y0 + 1.4) * U, 0], 'じく', { size: 13, color: '#e5484d' });
  }
  function finished() {
    $('revTitle').innerHTML = `${cur.n} → <span style="color:#e5484d">${cur.to}</span>！`;
    $('revMsg').innerHTML = `${cur.n}を まわすと ${cur.to}が できたよ。「まっぷたつ」で なかを みると、もとの かたちが 2つ ならんでいるよ。`;
    $('revFacts').innerHTML = cur.facts.map(f => `<li>${f}</li>`).join('');
    updVol();
    if (!done.has(cur.id)) { done.add(cur.id); Store.set('revolveDone', [...done]); Snd.ok(); }
    if (done.size >= SH.length) Stickers.give('revolve');
  }
  function updVol() {
    const v = cur.vol;
    if (th < 360 || !v || !atLeast('mid')) { $('revVol').innerHTML = ''; return; }
    if (!atLeast(v.lv)) { $('revVol').innerHTML = `<span class="f">${R('体積', 'たいせき')}は「ちゅうがく じゅけん」レベルで でるよ</span>`; return; }
    $('revVol').innerHTML = `1ます 1cm と すると、${R('体積', 'たいせき')} ＝ <span class="f">${v.f}</span> ＝ <b>${numTxt(v.v)}</b> cm³`;
  }
  window.addEventListener('levelchange', updVol);
  $('btnRevPlay').addEventListener('click', () => {
    Snd.pop(3);
    if (th >= 360) { th = 0; }
    target = 360;
  });
  $('rgRev').addEventListener('input', e => { th = target = +e.target.value; view.dirty = true; if (th >= 360) finished(); });
  $('tgRevCut').addEventListener('click', e => { half = !half; e.currentTarget.classList.toggle('on', half); Snd.tap(); view.dirty = true; });
  $('btnRevFront').addEventListener('click', () => { Snd.tap(); view.rotTo(M3.rotX(0.12)); });

  /* ---- サブモードの きりかえ ---- */
  App.solidSub = 'zukan';
  function setSub(s) {
    App.solidSub = s;
    document.querySelectorAll('#solidSub button').forEach(b => b.classList.toggle('on', b.dataset.s === s));
    $('solidMain').classList.toggle('hide', s !== 'zukan'); $('revolvePanel').classList.toggle('hide', s !== 'revolve');
    $('cvSolid').classList.toggle('hide', s !== 'zukan'); cv.classList.toggle('hide', s !== 'revolve');
    $('solidHint').textContent = s === 'revolve' ? 'じくの まわりに まわすと りったいが できるよ' : 'ゆびで うごかすと 360° くるっと まわるよ';
    requestAnimationFrame(() => {
      const v = s === 'revolve' ? view : SolidMode.view; v.resize(); v.dirty = true;
    });
  }
  document.querySelectorAll('#solidSub button').forEach(b => b.addEventListener('click', () => { Snd.tap(); setSub(b.dataset.s); }));
  bindZoom(cv.parentElement, () => (App.solidSub === 'revolve' ? view : null));

  Loop.add(dt => {
    if (App.tab !== 'solid' || App.solidSub !== 'revolve') return;
    view.step(dt);
    if (th < target) {
      th = Math.min(target, th + dt * 110); $('rgRev').value = Math.round(th); view.dirty = true;
      if (th >= 360) finished();
    }
    if (view.dirty) { view.dirty = false; draw(); }
  });
  load(SH[0]);
  return { view };
})();
