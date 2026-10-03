'use strict';
/* =========================================================
   ころがす … さいころ（立体）と、かたちを ころがす（平面）
   ========================================================= */

/* さいころの 目（めの もよう） */
const PIPS = {
  1: [[0, 0]], 2: [[-0.5, -0.5], [0.5, 0.5]], 3: [[-0.5, -0.5], [0, 0], [0.5, 0.5]],
  4: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]], 5: [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]],
  6: [[-0.5, -0.55], [-0.5, 0], [-0.5, 0.55], [0.5, -0.55], [0.5, 0], [0.5, 0.55]],
};
/* 外むきの 法線 → 目の かず（むかいあう めの わは 7） */
const DIE_NUM = [[[0, 1, 0], 1], [[0, -1, 0], 6], [[0, 0, 1], 2], [[0, 0, -1], 5], [[1, 0, 0], 3], [[-1, 0, 0], 4]];
function dieFaces(s = 1) {
  const m = prepMesh(cubeMesh(s));
  return m.polys.map(poly => {
    const n = newell(poly.p);
    const num = DIE_NUM.find(([v]) => V3.dot(v, n) > 0.9)[1];
    let u = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const w = V3.cross(n, u);
    const pips = PIPS[num].map(([a, b]) => {
      const c = V3.add(V3.mul(n, s * 1.001), V3.add(V3.mul(u, a * s), V3.mul(w, b * s)));
      const r = (num === 1 ? 0.3 : 0.17) * s;
      return [...Array(14)].map((_, k) => { const t = k / 14 * Math.PI * 2; return V3.add(c, V3.add(V3.mul(u, Math.cos(t) * r), V3.mul(w, Math.sin(t) * r))); });
    });
    return { p: poly.p, n, num, pips, nb: poly.nb, hard: poly.hard };
  });
}
function dieItems(faces, tf, red1 = true) {
  return faces.map(f => ({
    p: f.p.map(tf), col: [250, 250, 248], nb: f.nb, hard: f.hard, num: f.num,
    decor: (it, ctx, v) => {
      for (const pip of f.pips) {
        const sp = pip.map(q => v.proj(tf(q)));
        ctx.beginPath(); sp.forEach((s, i) => i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1])); ctx.closePath();
        ctx.fillStyle = f.num === 1 && red1 ? '#e5484d' : '#263238'; ctx.fill();
      }
    },
  }));
}

const RollMode = (() => {
  /* ===== さいころ ===== */
  const cv = $('cvDice');
  const view = new View3D(cv);
  view.R = M3.mul(M3.rotX(0.75), M3.rotY(-0.35)); view.R0 = view.R.slice();
  view.fitTo([0, -1, 0], 5.2);
  bindZoom(cv.parentElement, () => (sub === 'dice' ? view : null));
  const NB = 5, faces = dieFaces(1);
  let pos = [2, 2], O = M3.I(), anim = null, queue = [], stamps = {}, showStamp = true, rolls = Store.get('rolls', 0);
  let quiz = null, qWins = Store.get('diceWins', 0), sub = 'dice';
  const cellC = (i, j) => [(i - 2) * 2, -1, (j - 2) * 2];
  const DIRS = { px: [1, 0], nx: [-1, 0], pz: [0, 1], nz: [0, -1] };
  function rollSpec(d) {
    const [di, dj] = DIRS[d], c = cellC(pos[0], pos[1]);
    if (di) return { pivot: [c[0] + di, -1, 0], axis: [0, 0, 1], ang: -di * Math.PI / 2 };
    return { pivot: [0, -1, c[2] + dj], axis: [1, 0, 0], ang: dj * Math.PI / 2 };
  }
  function faceUp(dir) { // その むきの 目
    const Ot = M3.T(O); const local = M3.ap(Ot, dir);
    return DIE_NUM.find(([v]) => V3.dot(v, local) > 0.9)[1];
  }
  function stampHere() { stamps[pos.join(',')] = faceUp([0, -1, 0]); }
  function resetDice() { pos = [2, 2]; O = M3.I(); anim = null; queue = []; stamps = {}; stampHere(); quiz = null; $('diceChoices').innerHTML = ''; updRead(); view.dirty = true; }
  function updRead() {
    $('diceTop').textContent = faceUp([0, 1, 0]); $('diceBottom').textContent = faceUp([0, -1, 0]);
  }
  /* 画面の むき → 世界の むき（カメラを まわしても やじるしの とおりに うごく） */
  function screenDir(sx, sy) {
    let best = null, bd = -Infinity;
    for (const [k, [di, dj]] of Object.entries(DIRS)) {
      const a = view.proj([0, -1, 0]), b = view.proj([di, -1, dj]);
      const vx = b[0] - a[0], vy = b[1] - a[1], l = Math.hypot(vx, vy) || 1;
      const s = (vx * sx + vy * sy) / l;
      if (s > bd) { bd = s; best = k; }
    }
    return best;
  }
  function tryRoll(d) {
    if (anim) { if (queue.length < 4) queue.push(d); return; }
    const [di, dj] = DIRS[d], ni = pos[0] + di, nj = pos[1] + dj;
    if (ni < 0 || nj < 0 || ni >= NB || nj >= NB) { Snd.bump(); $('diceMsg').innerHTML = 'ばんの そとには いけないよ'; return; }
    anim = { d, t: 0, spec: rollSpec(d) };
  }
  function finishRoll() {
    const { d, spec } = anim;
    O = M3.round(M3.mul(M3.axis(spec.axis, spec.ang), O));
    pos = [pos[0] + DIRS[d][0], pos[1] + DIRS[d][1]];
    anim = null; Snd.roll(); stampHere(); updRead();
    rolls++; Store.set('rolls', rolls); if (rolls >= 20) Stickers.give('roll');
    if (!quiz) $('diceMsg').innerHTML = `うえは ${faceUp([0, 1, 0])}、したは ${faceUp([0, -1, 0])}。たすと 7！`;
    if (queue.length) tryRoll(queue.shift());
    else if (quiz && quiz.running) quizEnd();
    view.dirty = true;
  }
  document.querySelectorAll('.pad button').forEach(b => b.addEventListener('click', () => {
    Snd.ensure();
    const k = b.dataset.d;
    if (k === 'center') { view.rotTo(M3.mul(M3.rotX(0.75), M3.rotY(-0.35))); return; }
    if (quiz && quiz.running) return;
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[k];
    tryRoll(screenDir(v[0], v[1]));
  }));
  window.addEventListener('keydown', e => {
    if (App.tab !== 'roll' || sub !== 'dice') return;
    const v = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (v) { e.preventDefault(); if (!(quiz && quiz.running)) tryRoll(screenDir(v[0], v[1])); }
  });
  $('tgStamp').addEventListener('click', e => { showStamp = !showStamp; e.currentTarget.classList.toggle('on', showStamp); view.dirty = true; Snd.tap(); });
  $('btnDiceReset').addEventListener('click', () => { Snd.tap(); resetDice(); $('diceMsg').innerHTML = 'さいころの むかいあう めを たすと いつも 7 だよ。'; });

  /* よそう もんだい */
  $('btnDiceQ').addEventListener('click', () => {
    if (anim) return; Snd.tap();
    const len = 3 + rnd(2), path = []; let p = pos.slice(), guard = 0;
    while (path.length < len && guard++ < 200) {
      const d = pick(Object.keys(DIRS)), [di, dj] = DIRS[d], np = [p[0] + di, p[1] + dj];
      if (np[0] < 0 || np[1] < 0 || np[0] >= NB || np[1] >= NB) continue;
      if (path.length && DIRS[path[path.length - 1].d][0] === -di && DIRS[path[path.length - 1].d][1] === -dj) continue;
      path.push({ d, from: p.slice(), to: np }); p = np;
    }
    // こたえを けいさん
    let o = O.slice();
    for (const s of path) {
      const [di, dj] = DIRS[s.d];
      o = M3.round(M3.mul(di ? M3.axis([0, 0, 1], -di * Math.PI / 2) : M3.axis([1, 0, 0], dj * Math.PI / 2), o));
    }
    const local = M3.ap(M3.T(o), [0, 1, 0]);
    const ans = DIE_NUM.find(([v]) => V3.dot(v, local) > 0.9)[1];
    quiz = { path, ans, running: false };
    $('diceMsg').innerHTML = `やじるしの とおりに ${path.length}かい ころがすと、さいごに <b>うえ</b>に なる めは いくつ？`;
    const box = $('diceChoices'); box.innerHTML = '';
    for (let n = 1; n <= 6; n++) {
      const b = document.createElement('button'); b.textContent = n;
      b.addEventListener('click', () => {
        if (!quiz || quiz.running || quiz.guess) return;
        quiz.guess = n; b.classList.add('now'); Snd.tap();
        box.querySelectorAll('button').forEach(x => { x.disabled = true; });
        quiz.running = true; quiz.btn = b;
        path.forEach(s => tryRoll(s.d));
      });
      box.appendChild(b);
    }
    view.dirty = true;
  });
  function quizEnd() {
    const ok = quiz.guess === quiz.ans;
    quiz.btn.classList.add(ok ? 'ok' : 'ng');
    if (!ok) $('diceChoices').children[quiz.ans - 1].classList.add('ok');
    if (ok) { Snd.ok(); qWins++; Store.set('diceWins', qWins); if (qWins >= 3) Stickers.give('dice'); }
    else Snd.ng();
    $('diceMsg').innerHTML = ok ? `せいかい！ うえは ${quiz.ans}！` : `ざんねん、うえは ${quiz.ans} だったよ。ころがる とき、どの めが うえに くるか かんがえてみよう`;
    quiz = null; view.dirty = true;
  }

  function boardItems() {
    const items = [];
    for (let i = 0; i < NB; i++) for (let j = 0; j < NB; j++) {
      const c = cellC(i, j), k = i + ',' + j;
      const pts = [[c[0] - 1, -1, c[2] - 1], [c[0] - 1, -1, c[2] + 1], [c[0] + 1, -1, c[2] + 1], [c[0] + 1, -1, c[2] - 1]];
      items.push({
        p: pts, col: (i + j) % 2 ? [205, 230, 255] : [235, 245, 255], layer: 0, lw: 1, edgeCol: '#a9c3e6', noPick: true,
        decor: (it, ctx, v) => {
          if (showStamp && stamps[k] && !(pos[0] === i && pos[1] === j)) v.label(c, String(stamps[k]), { size: 22, color: '#7b8ca3' });
        },
      });
    }
    return items;
  }
  function drawDice() {
    view.clear();
    const c = cellC(pos[0], pos[1]), center = [c[0], 0, c[2]];
    let tf = p => V3.add(M3.ap(O, p), center);
    if (anim) {
      const A = AF.aboutLine(anim.spec.pivot, anim.spec.axis, anim.spec.ang * ease(anim.t));
      const base = tf; tf = p => AF.ap(A, base(p));
    }
    view.drawPolys(boardItems(), { cull: true });
    if (quiz) {
      quiz.path.forEach((st, k) => {
        const c0 = cellC(st.from[0], st.from[1]), [di, dj] = DIRS[st.d];
        const a = [c0[0] + di * 0.3, -1, c0[2] + dj * 0.3], b = [c0[0] + di * 1.7, -1, c0[2] + dj * 1.7];
        const h1 = [b[0] - di * 0.55 + dj * 0.45, -1, b[2] - dj * 0.55 + di * 0.45], h2 = [b[0] - di * 0.55 - dj * 0.45, -1, b[2] - dj * 0.55 - di * 0.45];
        view.line(a, b, '#ff9100', 7); view.line(b, h1, '#ff9100', 7); view.line(b, h2, '#ff9100', 7);
        view.label(V3.lerp(a, b, 0.35), String(k + 1), { size: 12, bg: '#ff9100', color: '#fff' });
      });
      const last = quiz.path[quiz.path.length - 1], lc = cellC(last.to[0], last.to[1]);
      view.label(lc, '★', { size: 28, color: '#ff9100' });
    }
    view.drawPolys(dieItems(faces, tf), { cull: true });
  }

  /* ===== かたちを ころがす（平面） ===== */
  const cv2 = $('cvRoll2'), ctx2 = cv2.getContext('2d');
  const SHAPES = [
    { id: 3, name: R('正三角形', 'せいさんかくけい') }, { id: 4, name: R('正方形', 'せいほうけい') },
    { id: 6, name: R('正六角形', 'せいろっかくけい') }, { id: 0, name: R('円', 'えん') },
  ];
  let shape = 4, st2 = null, playing = false, stepLeft = 0;
  const shapeBox = $('roll2Shapes');
  SHAPES.forEach(s => {
    const b = document.createElement('button'); b.innerHTML = s.name; b.dataset.id = s.id;
    b.addEventListener('click', () => { Snd.tap(); shape = s.id; reset2(); }); shapeBox.appendChild(b);
  });
  function reset2() {
    shapeBox.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.id === shape));
    fitCanvas(cv2);
    const Wd = cv2.width, Hd = cv2.height, s = Math.min(Wd / 7.5, Hd / 3.2);
    const ground = Hd * 0.72, x0 = Wd * 0.08;
    st2 = { s, ground, x0, path: [], pivots: [], ang: 0, steps: 0, turn: 0 };
    if (shape) {
      const n = shape, R0 = s / (2 * Math.sin(Math.PI / n));
      const cx = x0 + s / 2, cy = ground - R0 * Math.cos(Math.PI / n);
      const V = [];
      for (let k = 0; k < n; k++) { const a = Math.PI / 2 + Math.PI / n + k * 2 * Math.PI / n; V.push([cx + R0 * Math.cos(a), cy + R0 * Math.sin(a)]); }
      st2.V = V;
      // しるしは いちばん うえの かど
      let mi = 0; V.forEach((p, i) => { if (p[1] < V[mi][1] - 1e-6 || (Math.abs(p[1] - V[mi][1]) < 1e-6 && p[0] < V[mi][0])) mi = i; });
      st2.mark = mi; st2.path.push(V[mi].slice());
    } else {
      st2.r = s * 0.55; st2.theta = 0; st2.path.push([x0 + st2.r, ground]);
    }
    playing = false; stepLeft = 0;
    msg2();
  }
  function msg2() {
    $('roll2Msg').innerHTML = shape ? `あかい ● の とおった あとを みてみよう。${R('円', 'えん')}の いちぶ（${R('弧', 'こ')}）を つないだ みちに なるよ。1かいで まわる ${W.kakudo}は ${360 / shape}°（${R('外角', 'がいかく')}）。`
      : `あかい ● が えがく アーチを ${R('サイクロイド', 'さいくろいど')}と いうよ。1しゅう ころがると ${R('直径', 'ちょっけい')}の やく 3.14ばい すすむ（${R('円周', 'えんしゅう')}）！`;
  }
  function advance(dt) {
    const sp = dt * 1.6;
    if (shape) {
      const n = shape, ext = 2 * Math.PI / n;
      const V = st2.V;
      if (st2.ang === 0) {
        // いちばん みぎの したの かどが じく
        let pi = 0; V.forEach((p, i) => { if (p[1] > V[pi][1] - 1 && p[0] > V[pi][0]) pi = i; });
        const gy = Math.max(...V.map(p => p[1]));
        pi = V.reduce((b, p, i) => (Math.abs(p[1] - gy) < 1 && p[0] > V[b][0] ? i : b), V.findIndex(p => Math.abs(p[1] - gy) < 1));
        st2.pv = pi; st2.base = V.map(p => p.slice());
        st2.pivots.push(V[pi].slice());
      }
      st2.ang = Math.min(ext, st2.ang + sp);
      const P0 = st2.base[st2.pv], c = Math.cos(st2.ang), s = Math.sin(st2.ang);
      st2.V = st2.base.map(p => { const dx = p[0] - P0[0], dy = p[1] - P0[1]; return [P0[0] + dx * c - dy * s, P0[1] + dx * s + dy * c]; });
      st2.path.push(st2.V[st2.mark].slice());
      if (st2.ang >= ext) { st2.ang = 0; st2.steps++; Snd.tap(); return true; }
      return false;
    }
    const r = st2.r, before = Math.floor(st2.theta / (Math.PI / 2));
    st2.theta += sp;
    const cx = st2.x0 + r + r * st2.theta, cy = st2.ground - r;
    st2.path.push([cx - r * Math.sin(st2.theta), cy + r * Math.cos(st2.theta)]);
    if (Math.floor(st2.theta / (Math.PI / 2)) !== before) { Snd.tap(); return true; }
    return false;
  }
  function drawRoll2() {
    if (fitCanvas(cv2)) reset2();
    const c = ctx2, Wd = cv2.width, Hd = cv2.height, d = Math.min(window.devicePixelRatio || 1, 2);
    c.clearRect(0, 0, Wd, Hd);
    c.strokeStyle = '#8a9bb3'; c.lineWidth = 3 * d;
    c.beginPath(); c.moveTo(0, st2.ground); c.lineTo(Wd, st2.ground); c.stroke();
    c.fillStyle = 'rgba(138,155,179,.12)'; c.fillRect(0, st2.ground, Wd, Hd - st2.ground);
    if (!shape) {
      const D = st2.r * 2;
      c.font = `bold ${12 * d}px sans-serif`; c.fillStyle = '#50627a'; c.textAlign = 'center';
      for (let k = 0; k * D + st2.x0 <= Wd; k++) {
        const x = st2.x0 + k * D; c.fillRect(x - 1 * d, st2.ground, 2 * d, 12 * d);
        if (k) c.fillText(k, x, st2.ground + 26 * d);
      }
      c.fillText('ちょっけいの ながさで めもり', Wd / 2, st2.ground + 48 * d);
      const L = Math.PI * D, x1 = st2.x0 + L;
      c.strokeStyle = '#2fa86b'; c.lineWidth = 4 * d; c.beginPath(); c.moveTo(st2.x0, st2.ground + 6 * d); c.lineTo(Math.min(x1, st2.x0 + st2.r * st2.theta), st2.ground + 6 * d); c.stroke();
      if (st2.theta >= Math.PI * 2) { c.fillStyle = '#2fa86b'; c.fillText('1しゅう ＝ やく 3.14', x1, st2.ground - 2 * st2.r - 14 * d); }
    }
    // とおった あと
    c.strokeStyle = '#e5484d'; c.lineWidth = 3 * d; c.setLineDash([]);
    c.beginPath(); st2.path.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
    if (shape) {
      st2.pivots.forEach(p => { c.fillStyle = '#3b6fd8'; c.beginPath(); c.arc(p[0], p[1], 5 * d, 0, 7); c.fill(); });
      c.beginPath(); st2.V.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
      c.fillStyle = 'rgba(255,209,102,.85)'; c.fill(); c.strokeStyle = '#2a3645'; c.lineWidth = 3 * d; c.stroke();
      if (st2.ang > 0) {
        const P0 = st2.base[st2.pv]; c.strokeStyle = 'rgba(59,111,216,.6)'; c.setLineDash([5 * d, 5 * d]);
        c.beginPath(); c.moveTo(P0[0], P0[1]); c.lineTo(st2.V[st2.mark][0], st2.V[st2.mark][1]); c.stroke(); c.setLineDash([]);
      }
      const m = st2.V[st2.mark];
      c.fillStyle = '#e5484d'; c.beginPath(); c.arc(m[0], m[1], 9 * d, 0, 7); c.fill();
    } else {
      const r = st2.r, cx = st2.x0 + r + r * st2.theta, cy = st2.ground - r;
      c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fillStyle = 'rgba(144,202,249,.8)'; c.fill(); c.strokeStyle = '#2a3645'; c.lineWidth = 3 * d; c.stroke();
      c.beginPath(); c.moveTo(cx, cy); const mx = cx - r * Math.sin(st2.theta), my = cy + r * Math.cos(st2.theta); c.lineTo(mx, my); c.strokeStyle = '#3b6fd8'; c.stroke();
      c.fillStyle = '#e5484d'; c.beginPath(); c.arc(mx, my, 9 * d, 0, 7); c.fill();
      c.fillStyle = '#2a3645'; c.beginPath(); c.arc(cx, cy, 4 * d, 0, 7); c.fill();
    }
  }
  $('btnRoll2').addEventListener('click', () => { Snd.tap(); playing = !playing; $('btnRoll2').textContent = playing ? '⏸ とめる' : '▶️ ころがす'; });
  $('btnRoll2Step').addEventListener('click', () => { Snd.tap(); playing = false; $('btnRoll2').textContent = '▶️ ころがす'; stepLeft = 1; });
  $('btnRoll2Reset').addEventListener('click', () => { Snd.tap(); reset2(); $('btnRoll2').textContent = '▶️ ころがす'; });
  function offEdge() {
    const Wd = cv2.width;
    if (shape) return Math.max(...st2.V.map(p => p[0])) > Wd - 4;
    return st2.x0 + st2.r * 2 + st2.r * st2.theta > Wd - 4;
  }

  /* ===== きりかえ ===== */
  function setSub(s) {
    sub = s;
    document.querySelectorAll('#rollSeg button').forEach(b => b.classList.toggle('on', b.dataset.r === s));
    $('rollDice').classList.toggle('hide', s !== 'dice'); $('rollPlane').classList.toggle('hide', s !== 'plane');
    cv.classList.toggle('hide', s !== 'dice'); cv2.classList.toggle('hide', s !== 'plane');
    $('diceZoom').classList.toggle('hide', s !== 'dice');
    $('rollHint').textContent = s === 'dice' ? 'やじるしで さいころを ころがそう（ゆびで まわして みる ほうこうも かえられるよ）' : 'まっすぐな みちの うえを ころがるよ';
    if (s === 'plane') { requestAnimationFrame(() => { fitCanvas(cv2); reset2(); }); }
    view.dirty = true;
  }
  document.querySelectorAll('#rollSeg button').forEach(b => b.addEventListener('click', () => { Snd.tap(); setSub(b.dataset.r); }));

  Loop.add(dt => {
    if (App.tab !== 'roll') return;
    if (sub === 'dice') {
      view.step(dt);
      if (anim) { anim.t = Math.min(1, anim.t + dt * 3.2); view.dirty = true; if (anim.t >= 1) finishRoll(); }
      if (view.dirty) { view.dirty = false; drawDice(); }
    } else if (st2) {
      if ((playing || stepLeft > 0) && !offEdge()) {
        const stepDone = advance(dt);
        if (stepDone && stepLeft > 0) stepLeft--;
        if (!shape && st2.theta >= Math.PI * 2 && !st2.done) { st2.done = true; Stickers.give('cycloid'); }
      } else if (playing && offEdge()) { playing = false; $('btnRoll2').textContent = '▶️ ころがす'; if (!shape) Stickers.give('cycloid'); }
      drawRoll2();
    }
  });
  resetDice(); setSub('dice');
  return { view };
})();
