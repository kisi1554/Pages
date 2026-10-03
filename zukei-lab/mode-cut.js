'use strict';
/* =========================================================
   きる … 3つの点を えらんで 立体を 切る → 切り口の かたち
   ========================================================= */
const CutMode = (() => {
  const cv = $('cvCut');
  const view = new View3D(cv, { onTap });
  bindZoom(cv.parentElement, () => view);
  const LIST = ['cube', 'box', 'tri', 'pyr', 'tetra', 'cyl', 'cone', 'sph', 'octa'];
  const N = v => V3.norm(v);
  const P = (pts) => ({ pts });
  const PRESETS = {
    cube: [P([[1, 0, 1], [1, 0, -1], [-1, 0, 1]]), P([[1, 1, 1], [-1, 1, 1], [1, -1, -1]]), P([[1, 1, -1], [1, -1, 1], [-1, 1, 1]]),
      P([[0, 1, 1], [1, 1, 0], [1, -1, 1]]), P([[1, 1, 1], [-1, -1, -1], [1, 0, -1]]), P([[1, 1, 0], [0, 1, 1], [-1, -1, 1]]),
      P([[1, 1, 0], [0, 1, 1], [-1, -1, -1]]), P([[1, -1, 0], [0, 1, -1], [-1, 0, 1]])],
    box: [P([[1.5, 0, 1], [1.5, 0, -1], [-1.5, 0, 1]]), P([[1.5, 0.8, 1], [-1.5, 0.8, 1], [1.5, -0.8, -1]]),
      P([[-1.5, 0.8, 1], [1.5, -0.8, 1], [1.5, 0.8, -1]]), P([[1.5, 0.8, 0], [0, 0.8, 1], [-1.5, -0.8, 1]])],
    tri: [{ n: [0, 1, 0], d: 0 }, { n: [0, 0, 1], d: 0 }, P([[-0.996, -1, 0.575], [0.996, -1, 0.575], [0, 1, -1.15]]), { n: N([0, 1, 0.7]), d: 0 }],
    pyr: [{ n: [0, 1, 0], d: -0.3 }, { n: [1, 0, 0], d: 0 }, { n: N([1, 0, -1]), d: 0 }, { n: N([0, 1, 0.8]), d: -0.2 }, { n: [1, 0, 0], d: 0.4 }],
    tetra: [{ n: [0, 1, 0], d: -0.2 }, { n: [1, 0, 0], d: 0 }, { n: N([0, 1, 0.9]), d: -0.3 }],
    cyl: [{ n: [0, 1, 0], d: 0 }, { n: [1, 0, 0], d: 0.3 }, { n: N([0, 1, 0.5]), d: 0 }, { n: N([0, 1, 1.3]), d: 0 }],
    cone: [{ n: [0, 1, 0], d: -0.3 }, { n: [1, 0, 0], d: 0 }, { n: N([0, 1, 0.6]), d: -0.2 }, { n: [1, 0, 0], d: 0.5 }],
    sph: [{ n: [0, 1, 0], d: 0 }, { n: [0, 1, 0], d: 0.9 }, { n: N([1, 1, 0.5]), d: 0.4 }],
    octa: [m => ({ n: N(m.verts[0].p), d: 0 }), m => ({ n: newell(m.polys[bottomPoly(m)].p), d: 0 }), m => ({ n: newell(m.polys[bottomPoly(m)].p), d: -0.4 })],
  };
  const found = new Set(Store.get('cutFound', []));
  let S, mesh, cands = [], sel = [], plane = null, base = 0, lim = [0, 0], off = 0, phase = 'setup', cut = null, sep = 0, show = 0;

  const chips = $('cutSolids');
  LIST.forEach(id => {
    const b = document.createElement('button'); b.dataset.id = id; b.innerHTML = solidById(id).name;
    b.addEventListener('click', () => { Snd.tap(); select(id); }); chips.appendChild(b);
  });
  function candidates() {
    const out = [], add = p => { if (!out.some(q => V3.dist(p, q) < 1e-3)) out.push(p); };
    if (S.id === 'cyl' || S.id === 'cone') {
      const bot = mesh.polys.find(p => mesh.groups[p.g].role === 'bottom').p;
      const top = S.id === 'cyl' ? mesh.polys.find(p => mesh.groups[p.g].role === 'top').p : null;
      const apex = S.id === 'cone' ? mesh.extraVerts[0] : null;
      const ang = p => Math.atan2(p[2], p[0]);
      const pick8 = ring => ring.filter((_, i) => i % 5 === 0);
      const B = pick8(bot);
      B.forEach(p => {
        add(p);
        if (top) { const q = top.reduce((a, b) => Math.abs(ang(b) - ang(p)) < Math.abs(ang(a) - ang(p)) ? b : a); add(q); add(V3.lerp(p, q, 0.5)); }
        else add(V3.lerp(p, apex, 0.5));
      });
      if (apex) add(apex);
    } else if (S.id === 'sph') {
      const r = 1.35; add([0, r, 0]); add([0, -r, 0]);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; add([r * Math.cos(a), 0, r * Math.sin(a)]); }
      for (const y of [-1, 1]) for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2, s = Math.SQRT1_2 * r; add([s * Math.cos(a), y * s, s * Math.sin(a)]); }
    } else {
      mesh.verts.forEach(v => add(v.p));
      mesh.edges.forEach(e => add(V3.lerp(e.a, e.b, 0.5)));
    }
    return out;
  }
  function select(id) {
    S = solidById(id); mesh = prepMesh(S.make());
    chips.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    cands = candidates(); sel = []; plane = null; phase = 'setup'; cut = null;
    view.fitTo(mesh.center, mesh.radius * 1.1);
    buildPresets(); refresh();
    $('cutTitle').innerHTML = S.name + 'を きってみよう';
    say('りったいの うえの ● を 3つ タップしてね。3つの ● を とおる まっすぐな めんで きるよ。');
  }
  const say = h => { $('cutMsg').innerHTML = h; };
  function setPlane(n, d, keepSel) {
    if (!keepSel) sel = [];
    plane = { n: V3.norm(n) }; base = d;
    let mn = Infinity, mx = -Infinity;
    mesh.polys.forEach(p => p.p.forEach(q => { const s = V3.dot(plane.n, q); mn = Math.min(mn, s); mx = Math.max(mx, s); }));
    lim = [mn, mx]; off = 0; $('rgCutOff').value = 0;
    phase = 'setup'; cut = null; refresh();
  }
  function curD() { return base + off; }
  function buildPresets() {
    const box = $('cutPresets'); box.innerHTML = '';
    (PRESETS[S.id] || []).forEach(pr => {
      const pl = presetPlane(pr); if (!pl) return;
      const sec = sectionOf(mesh, pl.n, pl.d); if (!sec) return;
      const c = classify2D(flatten(sec));
      const b = document.createElement('button'); b.innerHTML = c.name;
      b.addEventListener('click', () => {
        Snd.tap();
        setPlane(pl.n, pl.d);
        if (pr.pts) sel = pr.pts.map(p => p.slice());
        refresh();
        say('ここで きるよ。「きる！」を おしてね。');
      });
      box.appendChild(b);
    });
  }
  function presetPlane(pr) {
    if (typeof pr === 'function') return pr(mesh);
    if (pr.pts) { const [a, b, c] = pr.pts; const n = V3.norm(V3.cross(V3.sub(b, a), V3.sub(c, a))); return { n, d: V3.dot(n, a) }; }
    return { n: V3.norm(pr.n), d: pr.d };
  }
  function onTap(x, y) {
    if (phase !== 'setup') return;
    let best = -1, bd = 28 * view.dpr;
    cands.forEach((p, i) => { const s = view.proj(p); const d = Math.hypot(s[0] - x, s[1] - y); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return;
    const p = cands[best], k = sel.findIndex(q => V3.dist(q, p) < 1e-3);
    if (k >= 0) sel.splice(k, 1); else { if (sel.length >= 3) sel.shift(); sel.push(p.slice()); }
    Snd.pop(sel.length);
    if (sel.length === 3) {
      const [a, b, c] = sel, n = V3.cross(V3.sub(b, a), V3.sub(c, a));
      if (V3.len(n) < 1e-6) { plane = null; say('3つが いっちょくせんに ならんでいると、きる めんが きまらないよ。ほかの ● を えらんでね。'); Snd.ng(); refresh(); return; }
      const nn = V3.norm(n);
      setPlane(nn, V3.dot(nn, a), true);
      say('この ばしょで きるよ。「きる！」を おしてね。きりくちは どんな かたちかな？');
    } else { plane = null; say(`あと ${3 - sel.length}こ えらんでね。`); }
    refresh();
  }
  function refresh() {
    $('btnCut').disabled = !(plane && phase === 'setup' && sectionOf(mesh, plane.n, curD()));
    $('cutAfter').classList.toggle('hide', phase !== 'cut');
    $('cutHint').textContent = phase === 'cut' ? 'まわして きりくちを よく みてみよう' : '● を 3つ えらぶと きる ばしょが きまるよ';
    $('cutFound').innerHTML = [...found].map(k => `<span>${SHAPE[k] ? SHAPE[k][0] : k}</span>`).join('') || '<span class="small">まだ ないよ</span>';
    view.dirty = true;
  }
  $('rgCutOff').addEventListener('input', e => {
    if (!plane) return;
    const v = e.target.value / 100;
    off = v >= 0 ? v * (lim[1] - base) * 0.97 : v * (base - lim[0]) * 0.97;
    if (phase === 'cut') { phase = 'setup'; cut = null; }
    refresh();
  });
  $('btnCut').addEventListener('click', () => {
    if (!plane) return;
    const r = cutMesh(mesh, plane.n, curD()); if (!r) return;
    cut = r; phase = 'cut'; sep = 0; show = 0; Snd.cut();
    const c = classify2D(flatten(r.sec));
    $('cutTitle').innerHTML = `きりくちは <span style="color:#e5484d">${c.name}</span>！`;
    say(`${c.reason}<br><span class="small">きった ところの めんを ${W.setsudan}と いうよ</span>`);
    if (SHAPE[c.key]) {
      const isNew = !found.has(c.key);
      found.add(c.key); Store.set('cutFound', [...found]);
      if (isNew) setTimeout(() => toast(`あたらしい きりくち！ ${c.name}`), 900);
    }
    if (S.id === 'cube' && c.key === 'rhex') Stickers.give('hex');
    if (S.curved) Stickers.give('circle');
    if (found.size >= 5) Stickers.give('cut5');
    setTimeout(Snd.ok.bind(Snd), 450);
    refresh();
  });
  $('btnCutReset').addEventListener('click', () => { Snd.tap(); phase = 'setup'; cut = null; refresh(); $('cutTitle').innerHTML = S.name + 'を きってみよう'; });
  $('btnCutShow').addEventListener('click', () => { Snd.tap(); show = (show + 1) % 3; view.dirty = true; });
  $('btnCutFace').addEventListener('click', () => { if (!cut) return; Snd.tap(); show = 1; view.lookAlong(plane.n); view.dirty = true; });

  function pieceItems(m, shift, baseIdx) {
    return m.polys.map(poly => ({
      p: poly.p.map(q => V3.add(q, shift)), col: hexRgb(m.groups[poly.g].col),
      nb: poly.nb.map(k => k < 0 ? -1 : k + baseIdx), hard: poly.hard, g: poly.g,
    }));
  }
  function draw() {
    view.clear();
    if (phase === 'cut' && cut) {
      const s = 0.55 * ease(sep);
      let items = [];
      if (show !== 2) items = items.concat(pieceItems(cut.a, V3.mul(plane.n, -s), 0));
      if (show !== 1) items = items.concat(pieceItems(cut.b, V3.mul(plane.n, s), items.length));
      view.drawPolys(items, { cull: true });
      return;
    }
    const items = mesh.polys.map(poly => ({ p: poly.p, col: hexRgb(mesh.groups[poly.g].col), nb: poly.nb, hard: poly.hard }));
    view.drawPolys(items, { transparent: true });
    const ctx = view.ctx, d = view.dpr;
    if (plane) {
      const sec = sectionOf(mesh, plane.n, curD());
      if (sec) {
        const sp = sec.map(p => view.proj(p));
        ctx.beginPath(); sp.forEach((s, i) => i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1])); ctx.closePath();
        ctx.fillStyle = 'rgba(255,82,82,.42)'; ctx.fill();
        ctx.strokeStyle = '#e5484d'; ctx.lineWidth = 3 * d; ctx.stroke();
      }
    }
    cands.forEach(p => view.dot(p, 6, 'rgba(255,255,255,.95)', '#5a6b80'));
    const showSel = Math.abs(off) < 1e-6;
    sel.forEach((p, i) => { if (!showSel && plane) return; view.dot(p, 12, '#e5484d', '#fff'); view.label(p, String(i + 1), { size: 12, color: '#fff', stroke: 'rgba(0,0,0,0)' }); });
  }
  Loop.add(dt => {
    if (App.tab !== 'cut' || !mesh) return;
    view.step(dt);
    if (phase === 'cut' && sep < 1) { sep = Math.min(1, sep + dt * 1.2); view.dirty = true; }
    if (view.dirty) { view.dirty = false; draw(); }
  });
  select('cube');
  return { view, select };
})();
