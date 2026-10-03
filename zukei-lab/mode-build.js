'use strict';
/* =========================================================
   くっつける … つみき（立体）と かたちパズル（平面）
   ========================================================= */
const BuildMode = (() => {
  /* ================= つみき ================= */
  const G = 7, cv = $('cvBlock');
  const view = new View3D(cv, { onTap });
  view.R = M3.mul(M3.rotX(0.55), M3.rotY(-0.6)); view.R0 = view.R.slice();
  view.fitTo([0, -0.5, 0], 4.3);
  bindZoom(cv.parentElement, () => (sub === 'block' ? view : null));
  const COLS = ['#ff8a80', '#ffd166', '#80deea', '#a5d6a7', '#b39ddb', '#ffab91', '#90caf9', '#f48fb1'];
  let col = 0, tool = 'add', sub = 'block', odai = null, odaiIdx = -1, cleared = new Set(Store.get('odai', []));
  const cubes = new Map();
  const K = (x, y, z) => x + ',' + y + ',' + z;
  const DIR6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const wc = (x, y, z) => [x - 3, y - 1.5 + 0.5, z - 3]; // つみきの まんなか
  const ODAI = [
    { name: 'L の かたち', c: [[3, 0, 3], [4, 0, 3], [3, 1, 3]] },
    { name: 'かいだん', c: [[2, 0, 3], [3, 0, 3], [4, 0, 3], [3, 1, 3], [4, 1, 3], [4, 2, 3]] },
    { name: 'じゅうじ', c: [[3, 0, 3], [2, 0, 3], [4, 0, 3], [3, 0, 2], [3, 0, 4]] },
    { name: 'おおきな さいころ', c: [[3, 0, 3], [4, 0, 3], [3, 0, 4], [4, 0, 4], [3, 1, 3], [4, 1, 3], [3, 1, 4], [4, 1, 4]] },
    { name: 'タワー', c: [[3, 0, 3], [3, 1, 3], [3, 2, 3], [2, 0, 3], [3, 0, 2]] },
    { name: 'ベンチ', c: [[2, 0, 3], [4, 0, 3], [2, 1, 3], [3, 1, 3], [4, 1, 3]] },
    { name: 'ねじれ', c: [[2, 0, 3], [3, 0, 3], [3, 0, 2], [3, 1, 2], [3, 1, 1]] },
    { name: 'おしろ', c: [[2, 0, 2], [3, 0, 2], [4, 0, 2], [2, 0, 3], [3, 0, 3], [4, 0, 3], [2, 1, 2], [4, 1, 2], [3, 1, 3], [3, 2, 3]] },
  ];
  const colBox = $('blockColors');
  COLS.forEach((c, i) => {
    const b = document.createElement('button'); b.style.background = c; b.setAttribute('aria-label', 'いろ');
    b.addEventListener('click', () => { col = i; Snd.tap(); colBox.querySelectorAll('button').forEach((x, j) => x.classList.toggle('on', j === i)); });
    colBox.appendChild(b);
  });
  colBox.firstChild.classList.add('on');
  document.querySelectorAll('#blockTool button').forEach(b => b.addEventListener('click', () => {
    tool = b.dataset.t; Snd.tap();
    document.querySelectorAll('#blockTool button').forEach(x => x.classList.toggle('on', x === b));
    $('buildHint').textContent = tool === 'add' ? 'めんを タップすると つみきが くっつくよ' : 'とりたい つみきを タップしてね';
  }));
  function addCube(x, y, z, c = col) {
    if (x < 0 || y < 0 || z < 0 || x >= G || y >= G || z >= G) { Snd.bump(); return false; }
    if (cubes.has(K(x, y, z))) return false;
    cubes.set(K(x, y, z), { x, y, z, c }); return true;
  }
  function onTap(px, py) {
    if (sub !== 'block') return;
    const it = view.pick(px, py); if (!it) return;
    if (it.kind === 'ground') {
      if (tool === 'add' && addCube(it.x, 0, it.z)) Snd.pop(cubes.size % 8);
    } else if (it.kind === 'face') {
      const c = it.cube;
      if (tool === 'add') { const [dx, dy, dz] = DIR6[it.dir]; if (addCube(c.x + dx, c.y + dy, c.z + dz)) Snd.pop(cubes.size % 8); }
      else { cubes.delete(K(c.x, c.y, c.z)); Snd.tap(); }
    }
    changed();
  }
  function surface() {
    let s = 0;
    for (const c of cubes.values()) for (const [dx, dy, dz] of DIR6) if (!cubes.has(K(c.x + dx, c.y + dy, c.z + dz))) s++;
    return s;
  }
  function changed() {
    const n = cubes.size, s = surface();
    $('blkN').textContent = n; $('blkS').textContent = s;
    $('blkMsg').innerHTML = n <= 1 ? 'つみき 1こは ' + W.men + 'が 6まい。くっつけると どう かわるかな？'
      : `ばらばらなら 6×${n}＝${6 * n}まい。くっついて かくれた めんが ${6 * n - s}まい あるよ`;
    if (n >= 10) Stickers.give('block10');
    drawViews(); checkOdai(); view.dirty = true;
  }
  /* ---- 三面図 ---- */
  function proj(set) {
    const f = new Set(), t = new Set(), s = new Set();
    for (const [x, y, z] of set) { f.add(x + ',' + y); t.add(x + ',' + z); s.add(z + ',' + y); }
    return { f, t, s };
  }
  const cubeList = () => [...cubes.values()].map(c => [c.x, c.y, c.z]);
  function drawView(cvEl, cells, target, kind) {
    fitCanvas(cvEl);
    const c = cvEl.getContext('2d'), Wd = cvEl.width, u = Wd / G;
    c.clearRect(0, 0, Wd, Wd);
    c.strokeStyle = '#e1e8f3'; c.lineWidth = 1;
    for (let i = 0; i <= G; i++) { c.beginPath(); c.moveTo(i * u, 0); c.lineTo(i * u, Wd); c.stroke(); c.beginPath(); c.moveTo(0, i * u); c.lineTo(Wd, i * u); c.stroke(); }
    const cellXY = k => {
      const [a, b] = k.split(',').map(Number);
      if (kind === 'f') return [a, G - 1 - b];       // まえ: よこ=x, たて=y
      if (kind === 't') return [a, b];               // うえ: よこ=x, たて=z（てまえが した）
      return [G - 1 - a, G - 1 - b];                 // みぎ: よこ=−z, たて=y
    };
    if (target) for (const k of target) { const [i, j] = cellXY(k); c.fillStyle = 'rgba(255,145,0,.25)'; c.fillRect(i * u, j * u, u, u); c.strokeStyle = '#ff9100'; c.lineWidth = 2; c.strokeRect(i * u + 1, j * u + 1, u - 2, u - 2); }
    for (const k of cells) { const [i, j] = cellXY(k); c.fillStyle = target && !target.has(k) ? 'rgba(229,72,77,.75)' : 'rgba(59,111,216,.8)'; c.fillRect(i * u + 2, j * u + 2, u - 4, u - 4); }
  }
  function drawViews() {
    const p = proj(cubeList()), tp = odai ? proj(odai.c) : null;
    drawView($('pvFront'), p.f, tp && tp.f, 'f'); drawView($('pvTop'), p.t, tp && tp.t, 't'); drawView($('pvSide'), p.s, tp && tp.s, 's');
  }
  const same = (a, b) => a.size === b.size && [...a].every(k => b.has(k));
  function checkOdai() {
    if (!odai || !cubes.size) return;
    const p = proj(cubeList()), t = proj(odai.c);
    if (same(p.f, t.f) && same(p.t, t.t) && same(p.s, t.s)) {
      Snd.ok(); $('odaiMsg').innerHTML = `できた！ 「${odai.name}」 せいかい 🎉 ` + (cubes.size === odai.c.length ? '' : `<br><span class="small">（おなじ さんめんずでも つみきの かずが ちがう つくりかたも あるよ）</span>`);
      cleared.add(odaiIdx); Store.set('odai', [...cleared]); Stickers.give('odai'); odai.done = true;
    }
  }
  $('btnOdai').addEventListener('click', () => {
    Snd.tap(); odaiIdx = (odaiIdx + 1) % ODAI.length; odai = { ...ODAI[odaiIdx] };
    cubes.clear(); changed();
    $('odaiMsg').innerHTML = `おだい ${odaiIdx + 1}「${odai.name}」：オレンジの ${R('三面図', 'さんめんず')}と おなじに なるように つみきを おこう`;
  });
  $('btnOdaiAns').addEventListener('click', () => {
    if (!odai) return; Snd.tap(); cubes.clear();
    odai.c.forEach(([x, y, z], i) => cubes.set(K(x, y, z), { x, y, z, c: i % COLS.length }));
    changed();
  });
  $('btnBlkClear').addEventListener('click', () => { Snd.tap(); cubes.clear(); odai = null; $('odaiMsg').innerHTML = ''; changed(); });

  function drawBlock() {
    view.clear();
    const items = [];
    for (let x = 0; x < G; x++) for (let z = 0; z < G; z++) {
      const y0 = -1.5, a = x - 3.5, b = z - 3.5;
      items.push({ p: [[a, y0, b], [a, y0, b + 1], [a + 1, y0, b + 1], [a + 1, y0, b]], col: (x + z) % 2 ? [214, 230, 248] : [236, 244, 253], layer: 0, kind: 'ground', x, z, lw: 1, edgeCol: '#b9cde8' });
    }
    for (const c of cubes.values()) {
      const m = wc(c.x, c.y, c.z), rgb = hexRgb(COLS[c.c]);
      DIR6.forEach((d, di) => {
        if (cubes.has(K(c.x + d[0], c.y + d[1], c.z + d[2]))) return;
        if (d[1] === -1 && c.y === 0) return;
        const n = d, u = Math.abs(n[1]) > 0.5 ? [1, 0, 0] : [0, 1, 0], w = V3.cross(n, u);
        const ctr = V3.add(m, V3.mul(n, 0.5));
        const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => V3.add(ctr, V3.add(V3.mul(u, s * 0.5), V3.mul(w, t * 0.5))));
        items.push({ p: pts, col: rgb, layer: 1, kind: 'face', cube: c, dir: di, lw: 1.6 });
      });
    }
    view.drawPolys(items, { cull: true });
    if (!cubes.size) view.label([0, -1.5, 0], 'ゆかを タップしてね', { size: 16, bg: 'rgba(255,255,255,.9)' });
  }

  /* ================= かたちパズル ================= */
  const cv2 = $('cvPuzzle'), ctx = cv2.getContext('2d');
  const hex = k => [2 * Math.cos(Math.PI / 3 * k), 2 * Math.sin(Math.PI / 3 * k)];
  const H = [0, 1, 2, 3, 4, 5].map(hex), O = [0, 0];
  const PCOL = ['#ff8a80', '#ffd166', '#80deea', '#a5d6a7', '#b39ddb', '#ffab91', '#90caf9', '#f48fb1'];
  const PUZ = [
    { t: 'さんかく 2まいで ' + R('正方形', 'せいほうけい'), step: 45, sol: [[[0, 0], [2, 0], [2, 2]], [[0, 0], [2, 2], [0, 2]]] },
    { t: 'さんかく 2まいで おおきな さんかく', step: 45, sol: [[[0, 0], [2, 0], [2, 2]], [[2, 0], [4, 0], [2, 2]]] },
    { t: 'さんかく 2まいで ' + R('平行四辺形', 'へいこうしへんけい'), step: 45, sol: [[[0, 0], [2, 0], [2, 2]], [[2, 0], [4, 2], [2, 2]]] },
    { t: 'さんかく 4まいで ななめの しかく', step: 45, sol: [[[2, 2], [2, 0], [4, 2]], [[2, 2], [4, 2], [2, 4]], [[2, 2], [2, 4], [0, 2]], [[2, 2], [0, 2], [2, 0]]] },
    { t: R('正三角形', 'せいさんかくけい') + ' 6まいで ' + R('正六角形', 'せいろっかくけい'), step: 60, sol: H.map((p, k) => [O, p, H[(k + 1) % 6]]) },
    { t: R('台形', 'だいけい') + ' 2まいで ' + R('正六角形', 'せいろっかくけい'), step: 60, sol: [[H[0], H[1], H[2], H[3]], [H[3], H[4], H[5], H[0]]] },
    { t: R('ひし形', 'ひしがた') + ' 3まいで ' + R('正六角形', 'せいろっかくけい'), step: 60, sol: [[O, H[0], H[1], H[2]], [O, H[2], H[3], H[4]], [O, H[4], H[5], H[0]]] },
    { t: 'おうち', step: 45, sol: [[[0, 0], [2, 0], [2, 2]], [[0, 0], [2, 2], [0, 2]], [[-1, 2], [3, 2], [1, 4]]] },
    { t: 'おさかな', step: 45, sol: [[[0, 2], [4, 2], [2, 4]], [[0, 2], [2, 0], [4, 2]], [[4, 2], [6, 4], [6, 0]]] },
    { t: 'タングラムで ' + R('正方形', 'せいほうけい'), step: 45, sol: [[[0, 0], [4, 0], [2, 2]], [[0, 0], [2, 2], [0, 4]], [[2, 4], [4, 4], [4, 2]], [[2, 2], [3, 1], [4, 2], [3, 3]], [[3, 1], [4, 0], [4, 2]], [[2, 2], [3, 3], [1, 3]], [[0, 4], [1, 3], [3, 3], [2, 4]]] },
    { t: 'じゆうに つくろう', step: 15, free: true, sol: [] },
  ];
  const FREE = [
    { n: R('正方形', 'せいほうけい'), p: [[0, 0], [2, 0], [2, 2], [0, 2]] },
    { n: R('長方形', 'ちょうほうけい'), p: [[0, 0], [3, 0], [3, 1.5], [0, 1.5]] },
    { n: R('直角', 'ちょっかく') + 'さんかく', p: [[0, 0], [2, 0], [0, 2]] },
    { n: R('正三角形', 'せいさんかくけい'), p: [[0, 0], [2, 0], [1, Math.sqrt(3)]] },
    { n: R('平行四辺形', 'へいこうしへんけい'), p: [[0, 0], [2, 0], [3, 1.5], [1, 1.5]] },
    { n: R('台形', 'だいけい'), p: [[0, 0], [3, 0], [2, 1.5], [1, 1.5]] },
    { n: R('ひし形', 'ひしがた'), p: [[0, 0], [2, 0], [3, Math.sqrt(3)], [1, Math.sqrt(3)]] },
    { n: R('正六角形', 'せいろっかくけい'), p: H.map(q => [q[0] / 2, q[1] / 2]) },
    { n: R('円', 'えん'), p: [...Array(32)].map((_, k) => [Math.cos(k * Math.PI / 16), Math.sin(k * Math.PI / 16)]), round: true },
  ];
  const solved = new Set(Store.get('puzzle', []));
  let pz = 0, pieces = [], selP = null, drag = null, tOff = [0, 0], unit = 40, org = [0, 0], doneP = false;
  const sel = $('puzSel');
  PUZ.forEach((p, i) => { const o = document.createElement('option'); o.value = i; o.innerHTML = (i + 1) + '. ' + p.t.replace(/<rt>.*?<\/rt>/g, '').replace(/<\/?ruby>/g, ''); sel.appendChild(o); });
  sel.addEventListener('change', () => { Snd.tap(); loadPuz(+sel.value); });
  const cen = pts => { const n = pts.length; return pts.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n], [0, 0]); };
  function mkPiece(pts, color, x, y, rot, round) {
    const c = cen(pts);
    return { loc: pts.map(p => [p[0] - c[0], p[1] - c[1]]), x, y, rot, flip: false, col: color, round };
  }
  function world(pc) {
    const a = pc.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return pc.loc.map(([px, py]) => { const qx = pc.flip ? -px : px; return [pc.x + qx * c - py * s, pc.y + qx * s + py * c]; });
  }
  function layout() {
    fitCanvas(cv2);
    const Wd = cv2.width, Hd = cv2.height;
    unit = Math.min(Wd, Hd) / 11;
    org = [Wd / 2, Hd / 2];
  }
  function targetPolys() { const P = PUZ[pz]; return P.sol.map(poly => poly.map(([x, y]) => [x + tOff[0], y + tOff[1]])); }
  function loadPuz(i) {
    pz = i; sel.value = i; layout(); doneP = false; selP = null;
    const P = PUZ[i];
    $('puzTitle').innerHTML = P.t;
    $('puzPalette').classList.toggle('hide', !P.free);
    const Wu = cv2.width / unit, Hu = cv2.height / unit;
    pieces = [];
    if (P.free) { $('puzMsg').innerHTML = 'したの ボタンで かたちを だして、くっつけて いろんな かたちを つくろう。ピースを わくの そとに だすと きえるよ。'; return; }
    // おだいの いち
    const all = P.sol.flat(), mn = [Math.min(...all.map(p => p[0])), Math.min(...all.map(p => p[1]))], mx = [Math.max(...all.map(p => p[0])), Math.max(...all.map(p => p[1]))];
    const landscape = Wu > Hu;
    const tc = landscape ? [-Wu / 4, 0] : [0, Hu / 4 - 0.5];
    tOff = [tc[0] - (mn[0] + mx[0]) / 2, tc[1] - (mn[1] + mx[1]) / 2];
    // ピースを ばらまく
    const n = P.sol.length;
    P.sol.forEach((poly, k) => {
      const rot = P.step * (1 + rnd(Math.round(360 / P.step) - 1));
      let x, y;
      if (landscape) { const cols = Math.ceil(n / 3); x = Wu / 4 + ((k % cols) - (cols - 1) / 2) * (Wu / 2.2 / cols); y = (Math.floor(k / cols) - 1) * (Hu / 3.3); }
      else { const cols = Math.min(n, 4); x = ((k % cols) - (cols - 1) / 2) * (Wu / (cols + 0.4)); y = -Hu / 4 + (Math.floor(k / cols) - (Math.ceil(n / cols) - 1) / 2) * 2.4; }
      pieces.push(mkPiece(poly, PCOL[k % PCOL.length], x, y, rot));
    });
    $('puzMsg').innerHTML = 'グレーの かげに ぴったり あうように ピースを ならべよう。';
  }
  const toScr = ([x, y]) => [org[0] + x * unit, org[1] - y * unit];
  const toW = (sx, sy) => [(sx - org[0]) / unit, (org[1] - sy) / unit];
  function hitPiece(wx, wy) {
    for (let i = pieces.length - 1; i >= 0; i--) if (pointInPoly(wx, wy, world(pieces[i]))) return i;
    return -1;
  }
  cv2.style.touchAction = 'none';
  cv2.addEventListener('pointerdown', e => {
    Snd.ensure(); const r = cv2.getBoundingClientRect(), d = cv2.width / r.width;
    const [wx, wy] = toW((e.clientX - r.left) * d, (e.clientY - r.top) * d);
    const i = hitPiece(wx, wy);
    if (i < 0) { selP = null; return; }
    const pc = pieces.splice(i, 1)[0]; pieces.push(pc); selP = pc;
    drag = { pc, sx: wx, sy: wy, ox: pc.x, oy: pc.y, moved: 0, id: e.pointerId };
    try { cv2.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  });
  cv2.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const r = cv2.getBoundingClientRect(), d = cv2.width / r.width;
    const [wx, wy] = toW((e.clientX - r.left) * d, (e.clientY - r.top) * d);
    drag.pc.x = drag.ox + wx - drag.sx; drag.pc.y = drag.oy + wy - drag.sy;
    drag.moved = Math.max(drag.moved, Math.hypot(wx - drag.sx, wy - drag.sy) * unit);
  });
  const pUp = e => {
    if (!drag || drag.id !== e.pointerId) return;
    const pc = drag.pc;
    if (drag.moved < 8) { rotate(pc); }
    else {
      snap(pc); Snd.tap();
      if (PUZ[pz].free) {
        const Wu = cv2.width / unit / 2, Hu = cv2.height / unit / 2;
        if (Math.abs(pc.x) > Wu || Math.abs(pc.y) > Hu) { pieces.splice(pieces.indexOf(pc), 1); selP = null; Snd.bump(); }
      }
    }
    drag = null; check();
  };
  cv2.addEventListener('pointerup', pUp); cv2.addEventListener('pointercancel', pUp);
  function rotate(pc) { pc.rot = (pc.rot + PUZ[pz].step) % 360; Snd.pop(1); snap(pc); }
  function snap(pc) {
    const mine = world(pc), cand = [];
    targetPolys().forEach(p => cand.push(...p));
    pieces.forEach(o => { if (o !== pc) cand.push(...world(o)); });
    let best = null, bd = 0.45;
    for (const a of mine) for (const b of cand) { const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d < bd) { bd = d; best = [b[0] - a[0], b[1] - a[1]]; } }
    if (best) { pc.x += best[0]; pc.y += best[1]; }
  }
  function check() {
    const P = PUZ[pz]; if (P.free || doneP || !pieces.length) return;
    const T = targetPolys(), W2 = pieces.map(world);
    const all = T.flat(), mn = [Math.min(...all.map(p => p[0])) - 1, Math.min(...all.map(p => p[1])) - 1], mx = [Math.max(...all.map(p => p[0])) + 1, Math.max(...all.map(p => p[1])) + 1];
    let tin = 0, cov = 0, out = 0; const st = 0.1;
    for (let x = mn[0]; x <= mx[0]; x += st) for (let y = mn[1]; y <= mx[1]; y += st) {
      const inT = T.some(p => pointInPoly(x, y, p)), inP = W2.some(p => pointInPoly(x, y, p));
      if (inT) { tin++; if (inP) cov++; } else if (inP) out++;
    }
    const piecesOut = W2.some(p => p.some(q => q[0] < mn[0] || q[0] > mx[0] || q[1] < mn[1] || q[1] > mx[1]));
    if (!piecesOut && cov / tin > 0.97 && out < tin * 0.03) {
      doneP = true; Snd.ok(); solved.add(pz); Store.set('puzzle', [...solved]);
      $('puzMsg').innerHTML = 'ぴったり！ できたね 🎉 「つぎ ▶」で つぎの もんだいへ';
      Stickers.give('puzzle'); if (solved.size >= 5) Stickers.give('puzzle5');
    }
  }
  $('btnPRot').addEventListener('click', () => { if (selP) { rotate(selP); check(); } });
  $('btnPFlip').addEventListener('click', () => { if (selP) { selP.flip = !selP.flip; Snd.pop(2); snap(selP); check(); } });
  $('btnPReset').addEventListener('click', () => { Snd.tap(); loadPuz(pz); });
  $('btnPNext').addEventListener('click', () => { Snd.tap(); loadPuz((pz + 1) % PUZ.length); });
  const pal = $('puzPalette');
  FREE.forEach((f, k) => {
    const b = document.createElement('button'); b.innerHTML = f.n;
    b.addEventListener('click', () => { Snd.pop(k % 8); const pc = mkPiece(f.p, PCOL[k % PCOL.length], (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 0, f.round); pieces.push(pc); selP = pc; });
    pal.appendChild(b);
  });
  function drawPuzzle() {
    if (fitCanvas(cv2)) layout();
    const c = ctx, Wd = cv2.width, Hd = cv2.height, d = Math.min(window.devicePixelRatio || 1, 2);
    c.clearRect(0, 0, Wd, Hd);
    // ほうがん
    c.fillStyle = 'rgba(120,140,170,.25)';
    for (let x = Math.ceil(-Wd / 2 / unit); x <= Wd / 2 / unit; x++) for (let y = Math.ceil(-Hd / 2 / unit); y <= Hd / 2 / unit; y++) { const s = toScr([x, y]); c.beginPath(); c.arc(s[0], s[1], 1.6 * d, 0, 7); c.fill(); }
    const poly = (pts, fill, stroke, lw = 2) => {
      c.beginPath(); pts.map(toScr).forEach((s, i) => i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1])); c.closePath();
      if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw * d; c.stroke(); }
    };
    targetPolys().forEach(p => poly(p, doneP ? 'rgba(47,168,107,.3)' : 'rgba(80,98,122,.28)', null));
    if (PUZ[pz].t === 'おさかな') { const e = toScr([1.6 + tOff[0], 2.5 + tOff[1]]); c.fillStyle = '#50627a'; c.beginPath(); c.arc(e[0], e[1], unit * 0.15, 0, 7); c.fill(); }
    for (const pc of pieces) {
      const w = world(pc);
      poly(w, pc.col, '#2a3645', pc === selP ? 3.4 : 2);
    }
    // えらんだ ピースの 角度
    if (selP && !selP.round) {
      const w = world(selP), A = polyAngles(w), cc = cen(w);
      c.font = `bold ${13 * d}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      w.forEach((p, i) => {
        const dir = [cc[0] - p[0], cc[1] - p[1]], l = Math.hypot(...dir) || 1;
        const s = toScr([p[0] + dir[0] / l * 0.55, p[1] + dir[1] / l * 0.55]);
        const t = Math.round(A[i]) + '°';
        c.lineWidth = 4 * d; c.strokeStyle = '#fff'; c.strokeText(t, s[0], s[1]); c.fillStyle = '#1d2b3a'; c.fillText(t, s[0], s[1]);
      });
    }
  }

  /* ================= きりかえ ================= */
  function setSub(s) {
    sub = s;
    document.querySelectorAll('#buildSeg button').forEach(b => b.classList.toggle('on', b.dataset.b === s));
    $('buildBlock').classList.toggle('hide', s !== 'block'); $('buildPuzzle').classList.toggle('hide', s !== 'puzzle');
    cv.classList.toggle('hide', s !== 'block'); cv2.classList.toggle('hide', s !== 'puzzle');
    $('blockZoom').classList.toggle('hide', s !== 'block');
    $('buildHint').textContent = s === 'block' ? 'めんを タップすると つみきが くっつくよ' : 'ピースを うごかして かげに あわせよう';
    if (s === 'puzzle') requestAnimationFrame(() => loadPuz(pz));
    else requestAnimationFrame(drawViews);
    view.dirty = true;
  }
  document.querySelectorAll('#buildSeg button').forEach(b => b.addEventListener('click', () => { Snd.tap(); setSub(b.dataset.b); }));
  Loop.add(dt => {
    if (App.tab !== 'build') return;
    if (sub === 'block') { view.step(dt); if (view.dirty) { view.dirty = false; drawBlock(); } }
    else drawPuzzle();
  });
  addCube(3, 0, 3); changed();
  return { view, onShow() { drawViews(); if (sub === 'puzzle') loadPuz(pz); } };
})();
