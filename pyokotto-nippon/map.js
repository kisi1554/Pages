// ぴょこっと にっぽん リズム — 地図（地方ごとの ズーム・ぴょこ の とびだし・当たり判定）

const MapView = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  let svg = null, gPop = null, mini = null, ripple = null;
  let view = [0, 0, 100, 100];
  let cam = null;
  let active = [];
  let tapCb = null;
  const pops = {};
  const els = {};

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function build(host, miniHost) {
    svg = el('svg', { class: 'map-svg', preserveAspectRatio: 'xMidYMid meet' });
    el('rect', { x: -600, y: -400, width: 2600, height: 2400, class: 'sea' }, svg);
    const lands = el('g', { class: 'lands' }, svg);
    for (let c = 1; c <= 47; c++) {
      const p = Geo.P[c];
      let parent = lands;
      if (c === 47) {
        // 沖縄 の 枠（九州・沖縄 の 画面 で 見える）
        const F = OKI_VIEW_FRAME;
        const fg = el('g', { class: 'oki-frame' }, lands);
        el('rect', { x: F.x, y: F.y, width: F.w, height: F.h, rx: 8 }, fg);
        const t = el('text', { x: F.x + 6, y: F.y + 15 }, fg);
        t.textContent = 'おきなわ';
        const t2 = el('text', { x: F.x + 6, y: F.y + 25, class: 'oki-note' }, fg);
        t2.textContent = 'ほんとうは みなみの うみ';
        const defs = el('defs', {}, svg);
        const cp = el('clipPath', { id: 'okiClip' }, defs);
        el('rect', { x: F.x, y: F.y, width: F.w, height: F.h, rx: 8 }, cp);
        const clipG = el('g', { 'clip-path': 'url(#okiClip)' }, lands);
        parent = el('g', { transform: `translate(${p.xf.tx.toFixed(2)},${p.xf.ty.toFixed(2)}) scale(${p.xf.s.toFixed(4)})` }, clipG);
      }
      const path = el('path', { d: p.path, class: 'pref', 'data-code': c }, parent);
      path.style.setProperty('--c', p.color);
      els[c] = path;
    }
    gPop = el('g', { class: 'pops' }, svg);
    ripple = el('circle', { class: 'ripple', r: 0, cx: 0, cy: 0 }, svg);
    host.appendChild(svg);
    svg.addEventListener('pointerdown', onDown);
    if (miniHost) buildMini(miniHost);
    requestAnimationFrame(frame);
  }

  // 小さな 案内図（日本 ぜんたい。沖縄 は ほんとう の 場所 に）
  function buildMini(host) {
    mini = el('svg', { class: 'mini-svg', viewBox: '-110 40 1420 1540', preserveAspectRatio: 'xMidYMid meet' });
    const g = el('g', {}, mini);
    const ok = PROJ.okiSrc, an = PROJ.okiAnchor, sc = 1 / PROJ.okiScale;
    for (let c = 1; c <= 47; c++) {
      const p = Geo.P[c];
      const d = p.rings.filter((r) => r.length > 12).map((r) => Geo.ringPath(r, 4)).join('');
      const parent = c === 47
        ? el('g', { transform: `translate(${(ok[0] - an[0] * sc).toFixed(2)},${(ok[1] - an[1] * sc).toFixed(2)}) scale(${sc})` }, g)
        : g;
      el('path', { d: d || Geo.ringPath(p.main, 2), class: 'mini-pref', 'data-region': p.region, 'data-code': c }, parent);
    }
    host.appendChild(mini);
  }

  function setMiniRegion(regionId, color) {
    if (!mini) return;
    mini.querySelectorAll('.mini-pref').forEach((e) => {
      const on = regionId === 'all' || e.getAttribute('data-region') === regionId;
      e.classList.toggle('is-on', on);
      e.style.fill = on ? color : '';
    });
  }

  /* ---------------- カメラ ---------------- */

  function setViewBox(v) {
    view = v;
    svg.setAttribute('viewBox', v.map((n) => n.toFixed(1)).join(' '));
  }
  function setView(v, ms) {
    if (!ms) { cam = null; setViewBox(v.slice()); return; }
    cam = { from: view.slice(), to: v.slice(), t0: performance.now(), ms };
  }

  // あそぶ 県（ほか の 県 は うすく して さわれない）
  function setActive(codes) {
    active = codes.slice();
    for (let c = 1; c <= 47; c++) {
      els[c].classList.toggle('is-off', active.indexOf(c) < 0);
      els[c].classList.remove('is-glow', 'is-hint', 'is-color', 'is-miss', 'is-ok');
    }
    clearPops();
  }
  function cls(code, name, on) { if (els[code]) els[code].classList.toggle(name, !!on); }
  function clearMarks(name) { active.forEach((c) => cls(c, name, false)); }

  /* ---------------- ぴょこ が とびだす ---------------- */

  function pxPerUnit() {
    const m = svg.getScreenCTM();
    return m ? Math.abs(m.a) : 1;
  }

  function pop(code, mood) {
    Object.keys(pops).forEach((k) => { if (+k !== code) retract(+k); });
    const p = Geo.P[code];
    const ppu = pxPerUnit();
    const r = svg.getBoundingClientRect();
    const size = Math.max(p.mainBox.w, p.mainBox.h) * p.xf.s * ppu;
    const maxSize = Math.min(r.width, r.height) * 0.34;
    let k = Math.min(3.2, Math.max(1, 80 / Math.max(1, size)));
    if (size * k > maxSize) k = Math.max(0.85, maxSize / size);
    let e = pops[code];
    if (!e) {
      e = { code, g: el('g', { class: 'pop' }, gPop), born: performance.now(), out: 0, bump: 0 };
      pops[code] = e;
    }
    e.k = k;
    e.lift = p.mainBox.h * p.xf.s * k * 0.32 + 10 / ppu;
    e.out = 0;
    e.born = performance.now();
    setMood(code, mood || 'normal');
    return e;
  }
  function setMood(code, mood, opts) {
    const e = pops[code];
    if (!e) return;
    e.mood = mood;
    e.g.innerHTML = Pyoko.body(code, mood, opts);
  }
  function bounce(code, big) {
    const e = pops[code];
    if (e) { e.bump = performance.now(); e.big = !!big; }
  }
  function retract(code) {
    const e = pops[code];
    if (e && !e.out) e.out = performance.now();
  }
  function clearPops() {
    Object.keys(pops).forEach((k) => { pops[k].g.remove(); delete pops[k]; });
  }

  const easeOutBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

  function frame(now) {
    if (cam) {
      const x = Math.min(1, (now - cam.t0) / cam.ms);
      const e = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
      setViewBox(cam.from.map((v, i) => v + (cam.to[i] - v) * e));
      if (x >= 1) cam = null;
    }
    Object.keys(pops).forEach((key) => {
      const e = pops[key];
      const p = Geo.P[e.code];
      let a = Math.min(1, (now - e.born) / 320);
      a = easeOutBack(a);
      if (e.out) {
        const o = Math.min(1, (now - e.out) / 260);
        a *= 1 - o;
        if (o >= 1) { e.g.remove(); delete pops[key]; return; }
      }
      let jump = 0, squash = 1;
      if (e.bump) {
        const b = (now - e.bump) / (e.big ? 520 : 340);
        if (b < 1) {
          jump = Math.sin(b * Math.PI) * (e.big ? 0.55 : 0.28);
          squash = 1 + Math.sin(b * Math.PI * 2) * 0.06;
        } else e.bump = 0;
      }
      const [cvx, cvy] = Geo.centerView(p);
      const s = Math.max(0.01, e.k * a) * p.xf.s;
      const ty = cvy - e.lift * a - jump * e.lift;
      e.g.setAttribute('transform',
        `translate(${cvx.toFixed(2)},${ty.toFixed(2)}) scale(${(s / squash).toFixed(4)},${(s * squash).toFixed(4)}) translate(${(-p.center[0]).toFixed(2)},${(-p.center[1]).toFixed(2)})`);
      e.g.style.opacity = Math.min(1, a * 1.5).toFixed(2);
    });
    requestAnimationFrame(frame);
  }

  /* ---------------- タップ ---------------- */

  function clientToView(x, y) {
    const m = svg.getScreenCTM();
    if (!m) return [0, 0];
    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const q = pt.matrixTransform(m.inverse());
    return [q.x, q.y];
  }
  function hitAt(clientX, clientY) {
    const [vx, vy] = clientToView(clientX, clientY);
    return Geo.hitTest(vx, vy, pxPerUnit(), active);
  }
  function onDown(e) {
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    const t = Sound.now() - Sound.latency();
    const code = hitAt(e.clientX, e.clientY);
    const [vx, vy] = clientToView(e.clientX, e.clientY);
    ripple.setAttribute('cx', vx);
    ripple.setAttribute('cy', vy);
    ripple.setAttribute('r', (16 / pxPerUnit()).toFixed(2));
    ripple.classList.remove('is-go');
    void ripple.getBoundingClientRect();
    ripple.classList.add('is-go');
    if (tapCb) tapCb(code, t);
  }
  // 県 の 中心 が 画面 の どこ に あるか（テスト や 案内 に つかう）
  function centerOnScreen(code) {
    const [vx, vy] = Geo.centerView(Geo.P[code]);
    const m = svg.getScreenCTM();
    const pt = svg.createSVGPoint();
    pt.x = vx;
    pt.y = vy;
    const q = pt.matrixTransform(m);
    return [q.x, q.y];
  }

  return {
    build, setView, setActive, setMiniRegion, cls, clearMarks,
    pop, setMood, bounce, retract, clearPops,
    onTap(fn) { tapCb = fn; }, hitAt, centerOnScreen, pxPerUnit,
    isMoving: () => !!cam,
  };
})();
