'use strict';
/* =========================================================
   りったい … まわす・めん/へん/ちょうてんを かぞえる・ひらく
   ========================================================= */
const SolidMode = (() => {
  const cv = $('cvSolid');
  const view = new View3D(cv, { onTap });
  bindZoom(cv.parentElement, () => (App.solidSub === 'revolve' ? null : view));
  const PAINT = ['#ff5252', '#ffab00', '#00c853', '#2979ff', '#d500f9', '#ff6d00', '#00b8d4', '#c51162', '#64dd17', '#6200ea', '#ffd600', '#00bfa5'];
  const known = Store.get('known', {});
  const visited = new Set(Store.get('visited', []));
  const netDone = new Set(Store.get('netDone', []));
  let S = null, mesh = null, cmode = 'look', see = false;
  let paint = new Set(), eMark = new Set(), vMark = new Set(), reveal = false;
  let unfoldT = 0, unfoldTarget = 0, plan = null, rootN = [0, -1, 0], flash = null, flashT = 0;
  let paraSel = null, ruleOpen = false;
  const params = {};
  Object.keys(SIZE).forEach(id => { params[id] = {}; SIZE[id].params.forEach(p => { params[id][p.k] = p.v; }); });
  const pv = () => params[S.id];
  const kkey = () => S.id + (pv() && pv().n ? ':' + pv().n : '');

  const say = html => { $('solidMsg').innerHTML = html; };

  /* ---- 立体えらびボタン（小さな えつき） ---- */
  const picker = $('solidPicker');
  SOLIDS.forEach(s => {
    const b = document.createElement('button'); b.dataset.id = s.id;
    const c = document.createElement('canvas'); c.width = 112; c.height = 112;
    b.appendChild(c);
    const sp = document.createElement('span'); sp.innerHTML = s.name; b.appendChild(sp);
    picker.appendChild(b);
    const m = prepMesh(s.make());
    const v = new View3D(c, { static: true }); v.W = 112; v.H = 112; v.dpr = 1; v.fitR = m.radius * 0.95;
    v.drawPolys(m.polys.map(p => ({ p: p.p, col: hexRgb(m.groups[p.g].col), nb: p.nb, hard: p.hard })), { lw: 1.3 });
    b.addEventListener('click', () => { Snd.tap(); select(s.id); });
  });

  function rootIndex() {
    const cg = mesh.groups.findIndex(g => g.role === 'curve');
    if (S.curved && cg >= 0 && mesh.groups.length > 1) return frontPoly(mesh, cg);
    return bottomPoly(mesh);
  }
  function buildMesh() {
    mesh = prepMesh(SIZE[S.id] ? sizeMake(S.id, pv()) : S.make());
    const r = rootIndex(); plan = unfoldPlan(mesh, r, false); rootN = newell(mesh.polys[r].p);
  }
  const fitR = () => Math.max(1.9, mesh.radius * 1.05);
  const curName = () => (SIZE[S.id] ? sizeName(S.id, pv()) : S.name);
  function select(id) {
    S = solidById(id);
    paint = new Set(); eMark = new Set(); vMark = new Set(); reveal = false; paraSel = null;
    unfoldT = 0; unfoldTarget = 0; $('rgUnfold').value = 0;
    buildMesh();
    view.fitTo(mesh.center, fitR());
    picker.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    $('solidName').innerHTML = curName();
    showFacts(); buildSize();
    const noEdge = S.curved, noVert = S.curved && !mesh.verts.length;
    document.querySelector('#countSeg [data-c=edge]').disabled = noEdge;
    document.querySelector('#countSeg [data-c=vert]').disabled = noVert;
    document.querySelector('#countSeg [data-c=para]').disabled = noEdge;
    if (((cmode === 'edge' || cmode === 'para') && noEdge) || (cmode === 'vert' && noVert)) setMode('look');
    $('btnUnfold').disabled = !!S.noNet; $('rgUnfold').disabled = !!S.noNet;
    $('btnNet2').disabled = !S.randomNet;
    $('btnUnfold').textContent = '📦 ひらく';
    $('netMsg').innerHTML = S.noNet ? 'きゅうは たいらに ひらけないよ' : W.tenkai + '（ひらいた かたち）を みてみよう';
    visited.add(id); Store.set('visited', [...visited]);
    if (visited.size >= SOLIDS.length) Stickers.give('zukan');
    updateCounts(); modeHint();
    say(`${curName()}だよ。ゆびで まわして いろんな ほうこうから みてみよう。` + (cmode === 'look' ? 'めんを タップすると かたちを おしえるよ。' : ''));
    view.dirty = true;
  }
  function kn(k) { return reveal || (known[kkey()] && known[kkey()][k]); }
  function setKnown(k) { known[kkey()] = known[kkey()] || {}; known[kkey()][k] = 1; Store.set('known', known); }

  /* ---- かたちを かえる（おおきさ・かどの かず）---- */
  function showFacts() {
    const f = S.facts.filter(t => atLeast('mid') || !t.includes('体積'));
    $('solidFacts').innerHTML = f.map(t => `<li>${t}</li>`).join('');
  }
  function buildSize() {
    const z = SIZE[S.id], box = $('sizeSliders');
    $('sizeCard').classList.toggle('hide', !z);
    if (!z) return;
    box.innerHTML = '';
    z.params.forEach(p => {
      const l = document.createElement('label'); l.className = 'sl';
      l.innerHTML = `<span>${p.n}</span><input type="range" min="${p.min}" max="${p.max}" step="1" value="${pv()[p.k]}"><b>${pv()[p.k]}${p.unit}</b>`;
      const inp = l.querySelector('input'), out = l.querySelector('b');
      inp.addEventListener('input', () => {
        const v = +inp.value; if (v === pv()[p.k]) return;
        pv()[p.k] = v; out.textContent = v + p.unit; Snd.tap();
        resize(p.k === 'n');
      });
      box.appendChild(l);
    });
    $('btnRule').classList.toggle('hide', !z.kind);
    ruleOpen = ruleOpen && !!z.kind;
    updVol(); updRule();
  }
  function resize(topo) {
    buildMesh();
    if (topo) { paint = new Set(); eMark = new Set(); vMark = new Set(); reveal = false; paraSel = null; }
    $('solidName').innerHTML = curName();
    updateCounts(); updVol(); updRule();
    if (topo) say(`${curName()}に なったよ。${W.men}・${W.hen}・${W.chou}は いくつに なったかな？`);
    if (unfoldT === 0) view.fitTo(mesh.center, fitR());
    view.dirty = true;
  }
  function updVol() {
    const z = SIZE[S.id], box = $('volBox');
    if (!z || !atLeast('mid')) { box.innerHTML = atLeast('mid') || !z ? '' : '<span class="f">1ますは 1cm。おおきさを かえて くらべてみよう</span>'; return; }
    const o = sizeVolume(S.id, pv());
    if (!atLeast(o.lv)) { box.innerHTML = `<span class="f">${R('体積', 'たいせき')}の もとめかたは「ちゅうがく じゅけん」レベルで でるよ</span>`; return; }
    box.innerHTML = `${R('体積', 'たいせき')} ＝ <span class="f">${o.vf}</span> ＝ <b>${numTxt(o.V)}</b> cm³<br>` +
      `${R('表面積', 'ひょうめんせき')} ＝ <span class="f">${o.sf}</span> ＝ <b>${numTxt(o.S)}</b> cm²`;
  }
  function updRule() {
    const z = SIZE[S.id], el = $('ruleTable');
    if (!z || !z.kind || !ruleOpen) { el.innerHTML = ''; $('btnRule').textContent = '📊 きまりの ひょう'; return; }
    $('btnRule').textContent = '📊 ひょうを とじる';
    const pr = z.kind === 'prism', now = pv().n;
    const f = n => (pr ? [n + 2, n * 3, n * 2] : [n + 1, n * 2, n + 1]);
    let h = `<table class="rule"><tr><th></th><th>${W.men}</th><th>${W.hen}</th><th>${W.chou}</th></tr>`;
    for (let n = 3; n <= 8; n++) {
      const [F, E, V] = f(n), [k, y] = KNUM[n];
      h += `<tr class="${n === now ? 'now' : ''}"><td>${pr ? R(k + '角柱', y + 'かくちゅう') : R(k + '角', y + 'かく') + 'すい'}</td><td>${F}</td><td>${E}</td><td>${V}</td></tr>`;
    }
    h += pr ? `<tr class="law"><td>N${R('角柱', 'かくちゅう')}</td><td>N＋2</td><td>N×3</td><td>N×2</td></tr>`
      : `<tr class="law"><td>N${R('角', 'かく')}すい</td><td>N＋1</td><td>N×2</td><td>N＋1</td></tr>`;
    el.innerHTML = h + '</table>';
  }
  $('btnRule').addEventListener('click', () => { Snd.tap(); ruleOpen = !ruleOpen; updRule(); });
  window.addEventListener('levelchange', () => { if (S) { showFacts(); updVol(); } });
  function updateCounts() {
    const val = { F: mesh.groupCount, E: mesh.edges.length, V: mesh.verts.length };
    for (const k of ['F', 'E', 'V']) {
      const el = $('cnt' + k); let txt;
      if (S.note) txt = S.note[k] === 'なし' ? 'なし' : kn(k) ? S.note[k] : '？';
      else txt = kn(k) ? val[k] : '？';
      el.textContent = txt;
      el.classList.toggle('small-num', String(txt).length > 3);
      el.parentElement.classList.toggle('done', txt !== '？');
    }
  }
  function setMode(m) {
    cmode = m;
    document.querySelectorAll('#countSeg button').forEach(b => b.classList.toggle('on', b.dataset.c === m));
    if (m !== 'look' && unfoldT > 0 && m !== 'face') { unfoldTarget = 0; $('btnUnfold').textContent = '📦 ひらく'; }
    modeHint(); view.dirty = true;
  }
  function modeHint() {
    const h = {
      look: 'ゆびで うごかすと 360° くるっと まわるよ',
      face: 'めんを タップして ぬろう。うらがわも わすれずに！',
      edge: 'へん（めんと めんの さかいめ）を タップしよう',
      vert: 'ちょうてん（かど）を タップして シールを はろう',
      para: 'へん か めんを 1つ タップしてね',
    }[cmode];
    $('solidHint').textContent = h;
    if (!S) return;
    if (cmode === 'face') say(`${W.men}を ぜんぶ ぬって かぞえよう。ぬった めんには ばんごうが つくよ。もういちど タップで けせるよ。`);
    if (cmode === 'edge') say(`${W.hen}は めんと めんが くっついている せん。ぜんぶ なぞって かぞえよう。`);
    if (cmode === 'vert') say(`${W.chou}は ${W.hen}が あつまる かど。ぜんぶに シールを はろう。`);
    if (cmode === 'para') { paraSel = null; say(`${W.hen}か ${W.men}を タップすると、${W.heikou}な ものが <span class="legend" style="background:#00c853"></span>みどり、${W.suichoku}な ものが <span class="legend" style="background:#2979ff"></span>あおに なるよ。`); }
  }
  document.querySelectorAll('#countSeg button').forEach(b => b.addEventListener('click', () => { Snd.tap(); setMode(b.dataset.c); }));

  /* ---- タップ ---- */
  function visibleSet(list) {
    const items = view.items;
    return list.map(o => see || o.f.some(pi => items[pi] && items[pi].front));
  }
  function onTap(x, y) {
    if (!mesh) return;
    const d = view.dpr;
    if ((cmode === 'edge' || cmode === 'vert' || cmode === 'para') && unfoldT > 0) { say('とじてから かぞえよう（「とじる」を おしてね）'); return; }
    if (cmode === 'vert') {
      const vis = visibleSet(mesh.verts); let best = -1, bd = 30 * d;
      mesh.verts.forEach((v, i) => { if (!vis[i]) return; const s = view.proj(v.p); const dd = Math.hypot(s[0] - x, s[1] - y); if (dd < bd) { bd = dd; best = i; } });
      if (best < 0) { Snd.bump(); return; }
      if (vMark.has(best)) { vMark.delete(best); Snd.tap(); } else { vMark.add(best); Snd.pop(vMark.size % 8); }
      say(`${W.chou}: <b>${vMark.size}</b>こ`);
      if (vMark.size === mesh.verts.length) done('V');
      view.dirty = true; return;
    }
    if (cmode === 'edge') {
      const vis = visibleSet(mesh.edges); let best = -1, bd = 20 * d;
      mesh.edges.forEach((e, i) => { if (!vis[i]) return; const dd = segDist(x, y, view.proj(e.a), view.proj(e.b)); if (dd < bd) { bd = dd; best = i; } });
      if (best < 0) { Snd.bump(); return; }
      if (eMark.has(best)) { eMark.delete(best); Snd.tap(); } else { eMark.add(best); Snd.pop(eMark.size % 8); }
      say(`${W.hen}: <b>${eMark.size}</b>ほん`);
      if (eMark.size === mesh.edges.length) done('E');
      view.dirty = true; return;
    }
    if (cmode === 'para') { paraTap(x, y); return; }
    const it = view.pick(x, y); if (!it) return;
    const g = it.g;
    if (cmode === 'face') {
      if (paint.has(g)) { paint.delete(g); Snd.tap(); } else { paint.add(g); Snd.pop(paint.size % 8); }
      say(`ぬった ${W.men}: <b>${paint.size}</b>まい`);
      if (paint.size === mesh.groupCount) done('F');
      view.dirty = true; return;
    }
    describe(it); flash = g; flashT = 0.9; view.dirty = true; Snd.tap();
  }
  /* ---- 平行・垂直 ---- */
  const edir = e => V3.norm(V3.sub(e.b, e.a));
  const gNorm = g => newell(mesh.polys.find(p => p.g === g).p);
  function paraSets() {
    if (!paraSel) return null;
    if (paraSel.type === 'edge') {
      const e0 = mesh.edges[paraSel.i], d0 = edir(e0), ka = keyP(e0.a), kb = keyP(e0.b);
      const par = [], per = [];
      mesh.edges.forEach((e, i) => {
        if (i === paraSel.i) return;
        const d = edir(e);
        if (V3.len(V3.cross(d0, d)) < 1e-3) par.push(i);
        else if (Math.abs(V3.dot(d0, d)) < 1e-3 && [keyP(e.a), keyP(e.b)].some(k => k === ka || k === kb)) per.push(i);
      });
      return { par, per };
    }
    const n0 = gNorm(paraSel.g), par = [], per = [];
    for (let g = 0; g < mesh.groups.length; g++) {
      if (g === paraSel.g || !mesh.polys.some(p => p.g === g)) continue;
      const d = V3.dot(n0, gNorm(g));
      if (d < -0.999) par.push(g); else if (Math.abs(d) < 1e-3) per.push(g);
    }
    return { par, per };
  }
  function paraTap(x, y) {
    const vis = visibleSet(mesh.edges); let best = -1, bd = 16 * view.dpr;
    mesh.edges.forEach((e, i) => { if (!vis[i]) return; const dd = segDist(x, y, view.proj(e.a), view.proj(e.b)); if (dd < bd) { bd = dd; best = i; } });
    if (best >= 0) paraSel = { type: 'edge', i: best };
    else { const it = view.pick(x, y); if (!it) return; paraSel = { type: 'face', g: it.g }; }
    const s = paraSets(), w = paraSel.type === 'edge' ? W.hen : W.men, u = paraSel.type === 'edge' ? 'ほん' : 'まい';
    say(`えらんだ ${w}<span class="legend" style="background:#ff6d00"></span>に ${W.heikou}な ${w}は <b>${s.par.length}</b>${u}<span class="legend" style="background:#00c853"></span>、` +
      `${W.suichoku}な ${w}は <b>${s.per.length}</b>${u}<span class="legend" style="background:#2979ff"></span>` +
      (paraSel.type === 'edge' ? '<br><span class="small">（すいちょく ＝ まじわって ' + W.chokkaku + 'に なる へん）</span>' : ''));
    Snd.pop(2); Stickers.give('para'); view.dirty = true;
  }
  function describe(it) {
    const grp = mesh.groups[it.g];
    if (grp.role === 'curve') {
      say(S.id === 'sph' ? 'ぜんぶ まがった めん（' + R('曲面', 'きょくめん') + '）。だから どっちにも ころがるよ'
        : 'まがった めん（' + R('曲面', 'きょくめん') + '）だよ。ひらくと ' + (S.id === 'cone' ? R('おうぎ形', 'おうぎがた') : R('長方形', 'ちょうほうけい')) + 'に なるよ');
      return;
    }
    const poly = mesh.polys[it.idx];
    const c = classify2D(flatten(poly.p));
    let role = '';
    if (S.curved && (grp.role === 'top' || grp.role === 'bottom')) role = W.teimen + 'だよ。';
    else if (grp.role === 'top' || grp.role === 'bottom') role = W.teimen + '（したと うえの めん）だよ。';
    else if (grp.role === 'side') role = W.sokumen + '（よこの めん）だよ。';
    say(`この ${W.men}は <b>${c.name}</b>。${role}<br><span class="small">${c.reason}</span>`);
  }
  function done(k) {
    const val = { F: mesh.groupCount, E: mesh.edges.length, V: mesh.verts.length }[k];
    const word = { F: W.men, E: W.hen, V: W.chou }[k], unit = { F: 'つ', E: 'ほん', V: 'こ' }[k];
    setKnown(k); updateCounts(); Snd.ok();
    say(`やったね！ ${curName()}の ${word}は ぜんぶで <b style="font-size:1.4em;color:#e5484d">${val}</b>${unit}！`);
    Stickers.give({ F: 'face', E: 'edge', V: 'vert' }[k]);
    const kw = known[kkey()];
    if (!S.curved && kw.F && kw.E && kw.V) {
      setTimeout(() => {
        say(`ひみつ発見！ ${W.chou} ${mesh.verts.length} − ${W.hen} ${mesh.edges.length} ＋ ${W.men} ${mesh.groupCount} ＝ <b>2</b><br><span class="small">でこぼこの ない りったいなら いつでも 2 に なるよ（オイラーの ていり）</span>`.replace('発見', R('発見', 'はっけん')));
        Stickers.give('euler');
      }, 1600);
    }
  }

  /* ---- ボタン ---- */
  $('tgSpin').addEventListener('click', e => { view.autoSpin = !view.autoSpin; e.currentTarget.classList.toggle('on', view.autoSpin); Snd.tap(); });
  $('tgSee').addEventListener('click', e => { see = !see; e.currentTarget.classList.toggle('on', see); Snd.tap(); view.dirty = true; });
  $('btnAnswer').addEventListener('click', () => { reveal = true; updateCounts(); Snd.tap(); });
  $('btnUnfold').addEventListener('click', () => {
    if (S.noNet) return; Snd.pop(3);
    unfoldTarget = unfoldTarget > 0.5 || unfoldT > 0.5 ? 0 : 1;
    if (cmode === 'edge' || cmode === 'vert') setMode('look');
    $('btnUnfold').textContent = unfoldTarget ? '📦 とじる' : '📦 ひらく';
  });
  $('rgUnfold').addEventListener('input', e => { unfoldTarget = unfoldT = e.target.value / 100; $('btnUnfold').textContent = unfoldT > 0.5 ? '📦 とじる' : '📦 ひらく'; view.dirty = true; });
  $('btnNet2').addEventListener('click', () => {
    if (!S.randomNet) return; Snd.pop(5);
    plan = unfoldPlan(mesh, plan.root, true); unfoldT = 0; unfoldTarget = 1;
    $('btnUnfold').textContent = '📦 とじる';
  });
  $('btnTop').addEventListener('click', () => {
    Snd.tap();
    if (unfoldT < 0.5 && !S.noNet) { unfoldTarget = 1; $('btnUnfold').textContent = '📦 とじる'; }
    view.lookAlong(rootN, S.curved ? [0, 1, 0] : [0, 0, -1]);
  });

  /* ---- 描画 ---- */
  function colorFor(g) {
    if (flash === g && flashT > 0) return hexRgb('#fff176');
    if (cmode === 'para' && paraSel && paraSel.type === 'face') {
      const s = paraSets();
      return hexRgb(g === paraSel.g ? '#ff8f3a' : s.par.includes(g) ? '#4ade80' : s.per.includes(g) ? '#60a5fa' : '#eef1f6');
    }
    if (cmode === 'face') {
      if (!paint.has(g)) return hexRgb('#eef1f6');
      return hexRgb(PAINT[[...paint].indexOf(g) % PAINT.length]);
    }
    return hexRgb(mesh.groups[g].col);
  }
  function floorGrid() {
    if (!SIZE[S.id] || cmode !== 'look' || unfoldT > 0) return;
    let y = Infinity; mesh.polys.forEach(p => p.p.forEach(q => { y = Math.min(y, q[1]); }));
    const n = 4, c = 'rgba(80,110,160,.18)';
    for (let i = -n; i <= n; i++) {
      view.line([i * CM, y, -n * CM], [i * CM, y, n * CM], c, 1);
      view.line([-n * CM, y, i * CM], [n * CM, y, i * CM], c, 1);
    }
  }
  function draw() {
    view.clear();
    floorGrid();
    const pts = unfoldT > 0 ? unfoldAt(mesh, plan, ease(unfoldT)) : mesh.polys.map(p => p.p);
    const items = mesh.polys.map((poly, i) => ({ p: pts[i], col: colorFor(poly.g), nb: poly.nb, hard: poly.hard, g: poly.g, idx: i, noCull: unfoldT > 0 }));
    view.drawPolys(items, { cull: unfoldT === 0, transparent: see && unfoldT === 0 });
    // ぬった めんの ばんごう
    if (paint.size && cmode === 'face') {
      [...paint].forEach((g, k) => {
        const fr = items.filter(it => it.g === g && (it.front || see || unfoldT > 0));
        if (!fr.length) return;
        const c = centroid(fr.map(it => centroid(it.p)));
        view.label(c, String(k + 1), { size: 17, color: '#fff', stroke: 'rgba(0,0,0,.55)' });
      });
    }
    if (unfoldT === 0 && cmode === 'edge') {
      const vis = visibleSet(mesh.edges);
      [...eMark].forEach((i, k) => {
        const e = mesh.edges[i];
        view.line(e.a, e.b, vis[i] ? '#ff6d00' : 'rgba(255,109,0,.45)', 7, vis[i] ? null : [6, 6]);
        if (vis[i]) view.label(V3.lerp(e.a, e.b, 0.5), String(k + 1), { size: 13, bg: '#ff6d00', color: '#fff' });
      });
    }
    if (unfoldT === 0 && cmode === 'para' && paraSel && paraSel.type === 'edge') {
      const s = paraSets(), vis = visibleSet(mesh.edges);
      const ln = (i, col) => { const e = mesh.edges[i]; view.line(e.a, e.b, col, vis[i] ? 7 : 5, vis[i] ? null : [6, 6]); };
      s.par.forEach(i => ln(i, '#00c853')); s.per.forEach(i => ln(i, '#2979ff')); ln(paraSel.i, '#ff6d00');
    }
    if (unfoldT === 0 && cmode === 'vert') {
      const vis = visibleSet(mesh.verts), order = [...vMark];
      mesh.verts.forEach((v, i) => {
        const m = vMark.has(i);
        if (!vis[i] && !m) return;
        if (m) {
          view.dot(v.p, 13, vis[i] ? '#e5484d' : 'rgba(229,72,77,.4)', '#fff');
          if (vis[i]) view.label(v.p, String(order.indexOf(i) + 1), { size: 13, color: '#fff', stroke: 'rgba(0,0,0,0)' });
        } else view.dot(v.p, 7, '#fff', '#2a3645');
      });
    }
  }
  function fitUnfold() {
    if (unfoldT <= 0) { view.fitTo(mesh.center, fitR()); return; }
    const pts = unfoldAt(mesh, plan, ease(unfoldT)).flat();
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (const p of pts) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
    const c = V3.lerp(mn, mx, 0.5);
    let r = 0; for (const p of pts) r = Math.max(r, V3.dist(p, c));
    view.fitTo(c, Math.max(fitR(), r * 1.02));
  }
  Loop.add(dt => {
    if (App.tab !== 'solid' || !mesh || App.solidSub === 'revolve') return;
    view.step(dt);
    if (unfoldT !== unfoldTarget) {
      const sp = 0.55 * dt;
      unfoldT = unfoldT < unfoldTarget ? Math.min(unfoldTarget, unfoldT + sp) : Math.max(unfoldTarget, unfoldT - sp);
      $('rgUnfold').value = Math.round(unfoldT * 100);
      view.dirty = true;
      if (unfoldT >= 1) onUnfolded();
    }
    if (unfoldT > 0 || view.tCenter) fitUnfold();
    if (flashT > 0) { flashT -= dt; view.dirty = true; if (flashT <= 0) flash = null; }
    if (view.dirty) { view.dirty = false; draw(); }
  });
  function onUnfolded() {
    Snd.ok();
    const msg = {
      cyl: W.sokumen + 'は ' + R('長方形', 'ちょうほうけい') + '！ よこの ながさは ' + R('円周', 'えんしゅう') + '（まるの まわり）と おなじ',
      cone: W.sokumen + 'は ' + R('おうぎ形', 'おうぎがた') + '！ ' + R('円', 'えん') + 'を ピザみたいに きった かたち',
      cube: R('正方形', 'せいほうけい') + 'が 6まい つながったよ。「べつの ひらきかた」で 11しゅるい ぜんぶ さがせるかな？',
    }[S.id] || `ひらくと こうなるよ。これが ${curName()}の ${W.tenkai}`;
    $('netMsg').innerHTML = msg;
    netDone.add(S.id); Store.set('netDone', [...netDone]);
    Stickers.give('net'); if (netDone.size >= 5) Stickers.give('net5');
  }
  select('cube');
  return { view, select };
})();
