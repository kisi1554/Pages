'use strict';
/* =========================================================
   りったい … まわす・めん/へん/ちょうてんを かぞえる・ひらく
   ========================================================= */
const SolidMode = (() => {
  const cv = $('cvSolid');
  const view = new View3D(cv, { onTap });
  bindZoom(cv.parentElement, () => view);
  const PAINT = ['#ff5252', '#ffab00', '#00c853', '#2979ff', '#d500f9', '#ff6d00', '#00b8d4', '#c51162', '#64dd17', '#6200ea', '#ffd600', '#00bfa5'];
  const known = Store.get('known', {});
  const visited = new Set(Store.get('visited', []));
  const netDone = new Set(Store.get('netDone', []));
  let S = null, mesh = null, cmode = 'look', see = false;
  let paint = new Set(), eMark = new Set(), vMark = new Set(), reveal = false;
  let unfoldT = 0, unfoldTarget = 0, plan = null, rootN = [0, -1, 0], flash = null, flashT = 0;

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
  function select(id) {
    S = solidById(id); mesh = prepMesh(S.make());
    paint = new Set(); eMark = new Set(); vMark = new Set(); reveal = false;
    unfoldT = 0; unfoldTarget = 0; $('rgUnfold').value = 0;
    const r = rootIndex(); plan = unfoldPlan(mesh, r, false); rootN = newell(mesh.polys[r].p);
    view.fitTo(mesh.center, mesh.radius * 1.05);
    picker.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    $('solidName').innerHTML = S.name;
    $('solidFacts').innerHTML = S.facts.map(f => `<li>${f}</li>`).join('');
    const noEdge = S.curved, noVert = S.curved && !mesh.verts.length;
    document.querySelector('#countSeg [data-c=edge]').disabled = noEdge;
    document.querySelector('#countSeg [data-c=vert]').disabled = noVert;
    if ((cmode === 'edge' && noEdge) || (cmode === 'vert' && noVert)) setMode('look');
    $('btnUnfold').disabled = !!S.noNet; $('rgUnfold').disabled = !!S.noNet;
    $('btnNet2').disabled = !S.randomNet;
    $('btnUnfold').textContent = '📦 ひらく';
    $('netMsg').innerHTML = S.noNet ? 'きゅうは たいらに ひらけないよ' : W.tenkai + '（ひらいた かたち）を みてみよう';
    visited.add(id); Store.set('visited', [...visited]);
    if (visited.size >= SOLIDS.length) Stickers.give('zukan');
    updateCounts(); modeHint();
    say(`${S.name}だよ。ゆびで まわして いろんな ほうこうから みてみよう。` + (cmode === 'look' ? 'めんを タップすると かたちを おしえるよ。' : ''));
    view.dirty = true;
  }
  function kn(k) { return reveal || (known[S.id] && known[S.id][k]); }
  function setKnown(k) { known[S.id] = known[S.id] || {}; known[S.id][k] = 1; Store.set('known', known); }
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
    }[cmode];
    $('solidHint').textContent = h;
    if (!S) return;
    if (cmode === 'face') say(`${W.men}を ぜんぶ ぬって かぞえよう。ぬった めんには ばんごうが つくよ。もういちど タップで けせるよ。`);
    if (cmode === 'edge') say(`${W.hen}は めんと めんが くっついている せん。ぜんぶ なぞって かぞえよう。`);
    if (cmode === 'vert') say(`${W.chou}は ${W.hen}が あつまる かど。ぜんぶに シールを はろう。`);
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
    if ((cmode === 'edge' || cmode === 'vert') && unfoldT > 0) { say('とじてから かぞえよう（「とじる」を おしてね）'); return; }
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
    say(`やったね！ ${S.name}の ${word}は ぜんぶで <b style="font-size:1.4em;color:#e5484d">${val}</b>${unit}！`);
    Stickers.give({ F: 'face', E: 'edge', V: 'vert' }[k]);
    if (!S.curved && known[S.id].F && known[S.id].E && known[S.id].V) {
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
    if (cmode === 'face') {
      if (!paint.has(g)) return hexRgb('#eef1f6');
      return hexRgb(PAINT[[...paint].indexOf(g) % PAINT.length]);
    }
    return hexRgb(mesh.groups[g].col);
  }
  function draw() {
    view.clear();
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
    if (unfoldT <= 0) { view.fitTo(mesh.center, mesh.radius * 1.05); return; }
    const pts = unfoldAt(mesh, plan, ease(unfoldT)).flat();
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (const p of pts) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
    const c = V3.lerp(mn, mx, 0.5);
    let r = 0; for (const p of pts) r = Math.max(r, V3.dist(p, c));
    view.fitTo(c, Math.max(mesh.radius, r) * 1.02);
  }
  Loop.add(dt => {
    if (App.tab !== 'solid' || !mesh) return;
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
    }[S.id] || `ひらくと こうなるよ。これが ${S.name}の ${W.tenkai}`;
    $('netMsg').innerHTML = msg;
    netDone.add(S.id); Store.set('netDone', [...netDone]);
    Stickers.give('net'); if (netDone.size >= 5) Stickers.give('net5');
  }
  select('cube');
  return { view, select };
})();
