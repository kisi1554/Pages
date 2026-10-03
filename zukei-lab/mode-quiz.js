'use strict';
/* =========================================================
   クイズ … 10もん。立体の かず・なまえ・展開図・角度・切り口・さいころ
   ========================================================= */
const QuizMode = (() => {
  const cv3 = $('cvQuiz3'), cv2 = $('cvQuiz2'), c2 = cv2.getContext('2d');
  const view = new View3D(cv3);
  let qs = [], qi = 0, score = 0, cur = null, answered = false, best = Store.get('quizBest', 0), anim = 0;
  const say = h => { $('quizMsg').innerHTML = h; };

  /* ---------- 2D の おえかき ---------- */
  function fit2(pts, pad = 0.18) {
    fitCanvas(cv2);
    const Wd = cv2.width, Hd = cv2.height;
    const mn = [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1]))], mx = [Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
    const s = Math.min(Wd * (1 - 2 * pad) / (mx[0] - mn[0] || 1), Hd * (1 - 2 * pad) / (mx[1] - mn[1] || 1));
    const cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2;
    return p => [Wd / 2 + (p[0] - cx) * s, Hd / 2 - (p[1] - cy) * s];
  }
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  function polyPath(S) { c2.beginPath(); S.forEach((s, i) => i ? c2.lineTo(s[0], s[1]) : c2.moveTo(s[0], s[1])); c2.closePath(); }
  function text2(t, s, col = '#1d2b3a', size = 18) {
    const d = dpr(); c2.font = `bold ${size * d}px "Hiragino Maru Gothic ProN",sans-serif`; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.lineWidth = 5 * d; c2.strokeStyle = '#fff'; c2.strokeText(t, s[0], s[1]); c2.fillStyle = col; c2.fillText(t, s[0], s[1]);
  }
  function drawShape2D(P, labels, opt = {}) {
    const tf = fit2(P), S = P.map(tf), d = dpr();
    c2.clearRect(0, 0, cv2.width, cv2.height);
    polyPath(S); c2.fillStyle = opt.fill || 'rgba(255,209,102,.75)'; c2.fill(); c2.strokeStyle = '#2a3645'; c2.lineWidth = 3 * d; c2.stroke();
    const n = P.length, cc = S.reduce((a, s) => [a[0] + s[0] / n, a[1] + s[1] / n], [0, 0]);
    if (opt.marks) {
      const A = polyAngles(P), L = P.map((p, i) => Math.hypot(P[(i + 1) % n][0] - p[0], P[(i + 1) % n][1] - p[1]));
      S.forEach((V, i) => {
        if (Math.abs(A[i] - 90) > 0.5) return;
        const a = S[(i + 1) % n], b = S[(i - 1 + n) % n], ua = norm2([a[0] - V[0], a[1] - V[1]]), ub = norm2([b[0] - V[0], b[1] - V[1]]), q = 16 * d;
        c2.strokeStyle = '#3b6fd8'; c2.lineWidth = 2.5 * d; c2.beginPath(); c2.moveTo(V[0] + ua[0] * q, V[1] + ua[1] * q); c2.lineTo(V[0] + (ua[0] + ub[0]) * q, V[1] + (ua[1] + ub[1]) * q); c2.lineTo(V[0] + ub[0] * q, V[1] + ub[1] * q); c2.stroke();
      });
      const groups = []; L.forEach((l, i) => { const g = groups.find(g => Math.abs(L[g[0]] - l) < 0.02 * l); if (g) g.push(i); else groups.push([i]); });
      let gi = 0;
      groups.filter(g => g.length > 1).forEach(g => { gi++; g.forEach(i => {
        const a = S[i], b = S[(i + 1) % n], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], u = norm2([b[0] - a[0], b[1] - a[1]]), nn = [-u[1], u[0]];
        c2.strokeStyle = '#e5484d'; c2.lineWidth = 2.5 * d;
        for (let k = 0; k < gi; k++) { const o = (k - (gi - 1) / 2) * 6 * d; c2.beginPath(); c2.moveTo(m[0] + u[0] * o - nn[0] * 8 * d, m[1] + u[1] * o - nn[1] * 8 * d); c2.lineTo(m[0] + u[0] * o + nn[0] * 8 * d, m[1] + u[1] * o + nn[1] * 8 * d); c2.stroke(); }
      }); });
    }
    if (labels) S.forEach((V, i) => {
      if (labels[i] == null) return;
      const v = norm2([cc[0] - V[0], cc[1] - V[1]]);
      text2(labels[i], [V[0] + v[0] * 40 * d, V[1] + v[1] * 40 * d], labels[i] === '？' ? '#e5484d' : '#3b6fd8', 20);
    });
  }
  const norm2 = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

  /* ---------- 立体を えがく ---------- */
  function solidDraw(m, opt = {}) {
    return v => {
      v.clear();
      v.drawPolys(m.polys.map(p => ({ p: p.p, col: hexRgb(m.groups[p.g].col), nb: p.nb, hard: p.hard })), { transparent: opt.see });
      if (opt.after) opt.after(v);
    };
  }
  function use3(m, fitR) { view.fitTo(m ? m.center : [0, 0, 0], fitR || (m.radius * 1.1)); view.resetView(); view.autoSpin = false; }

  /* ---------- もんだい ---------- */
  const numChoices = (ans, pool) => {
    const s = new Set([ans]); const cand = shuffle([...(pool || []), ans + 1, ans - 1, ans + 2, ans - 2, ans + 4].filter(v => v > 0 && v !== ans));
    for (const v of cand) { if (s.size >= 4) break; s.add(v); }
    return shuffle([...s]).map(v => ({ label: String(v), ok: v === ans }));
  };
  function qCount() {
    const S = solidById(pick(['cube', 'box', 'tri', 'hex', 'tetra', 'pyr', 'octa'])), m = prepMesh(S.make());
    const k = pick(['F', 'E', 'V']), val = { F: m.groupCount, E: m.edges.length, V: m.verts.length };
    const word = { F: W.men, E: W.hen, V: W.chou }[k], unit = { F: 'つ', E: 'ほん', V: 'こ' }[k];
    return {
      q: `この ${S.name}の ${word}は いくつ？`, hint: 'ゆびで まわして かぞえよう', kind: '3d', setup: () => use3(m), draw3: solidDraw(m),
      choices: numChoices(val[k], Object.values(val)), explain: `${S.name}の ${word}は ${val[k]}${unit}。`,
    };
  }
  function qName() {
    const S = pick(SOLIDS), m = prepMesh(S.make());
    const others = shuffle(SOLIDS.filter(s => s !== S)).slice(0, 3);
    return {
      q: 'この りったいの なまえは？', hint: 'まわして よく みてね', kind: '3d', setup: () => use3(m), draw3: solidDraw(m),
      choices: shuffle([S, ...others]).map(s => ({ label: s.name, ok: s === S })), explain: `${S.name}だよ。`,
    };
  }
  /* 展開図 */
  function hexomino() {
    const cells = [[0, 0]], has = (x, y) => cells.some(c => c[0] === x && c[1] === y);
    while (cells.length < 6) { const c = pick(cells), [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); if (!has(c[0] + dx, c[1] + dy)) cells.push([c[0] + dx, c[1] + dy]); }
    return cells;
  }
  function netTree(cells) {
    const idx = (x, y) => cells.findIndex(c => c[0] === x && c[1] === y);
    const par = new Array(cells.length).fill(-1), dir = [], O = [M3.I()], order = [0], seen = new Set([0]);
    for (let h = 0; h < order.length; h++) {
      const i = order[h], [x, y] = cells[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = idx(x + dx, y + dy); if (j < 0 || seen.has(j)) continue;
        seen.add(j); par[j] = i; dir[j] = [dx, 0, dy]; order.push(j);
        const roll = dx ? M3.axis([0, 0, 1], -dx * Math.PI / 2) : M3.axis([1, 0, 0], dy * Math.PI / 2);
        O[j] = M3.round(M3.mul(roll, O[i]));
      }
    }
    const facesHit = new Set(order.map(i => { const l = M3.ap(M3.T(O[i]), [0, -1, 0]); return l.map(Math.round).join(','); }));
    return { par, dir, order, ok: facesHit.size === 6 };
  }
  function netItems(cells, tree, t) {
    const T = []; T[0] = AF.I();
    for (const j of tree.order) {
      if (j === 0) continue;
      const i = tree.par[j], d = tree.dir[j], pc = [cells[i][0] * 2, 0, cells[i][1] * 2];
      T[j] = AF.compose(T[i], AF.aboutLine(V3.add(pc, d), V3.cross(d, [0, 1, 0]), Math.PI / 2 * t));
    }
    return cells.map(([x, y], i) => {
      const c = [x * 2, 0, y * 2];
      const p = [[-1, 0, -1], [-1, 0, 1], [1, 0, 1], [1, 0, -1]].map(q => AF.ap(T[i], V3.add(c, q)));
      return { p, col: hexRgb(FACE_COLS[i]), noCull: true };
    });
  }
  function qNet() {
    const wantOK = Math.random() < 0.5;
    let cells, tree, g = 0;
    do { cells = hexomino(); tree = netTree(cells); } while (tree.ok !== wantOK && g++ < 500);
    const P = cells.flatMap(([x, y]) => [[x, -y], [x + 1, -y - 1]]);
    let foldT = 0;
    const cen = centroid(cells.map(([x, y]) => [x * 2, 0, y * 2]));
    return {
      q: `この ${W.tenkai}を くみたてると ${R('立方体', 'りっぽうたい')}（さいころ）に なる？`, kind: '2d',
      draw2: () => {
        const tf = fit2(P, 0.2), d = dpr(); c2.clearRect(0, 0, cv2.width, cv2.height);
        cells.forEach(([x, y], i) => { const a = tf([x, -y]), b = tf([x + 1, -y - 1]); c2.fillStyle = FACE_COLS[i]; c2.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); c2.strokeStyle = '#2a3645'; c2.lineWidth = 3 * d; c2.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); });
      },
      choices: [{ label: '⭕ なる', ok: tree.ok }, { label: '❌ ならない', ok: !tree.ok }],
      explain: tree.ok ? 'ぴったり さいころに なるよ！ くみたてて みよう' : 'めんが かさなって、あなが あいちゃうね',
      after: () => {
        switchTo('3d'); view.fitTo(V3.add(cen, [0, 1, 0]), 3.4); view.R = M3.mul(M3.rotX(0.7), M3.rotY(-0.5));
        cur.draw3 = v => { v.clear(); v.drawPolys(netItems(cells, tree, ease(foldT)), { cull: false }); };
        cur.tick = dt => { if (foldT < 1) { foldT = Math.min(1, foldT + dt * 0.5); view.dirty = true; } };
      },
    };
  }
  /* 角度 */
  function qTri() {
    let A, B, C;
    do { A = 25 + 5 * rnd(16); B = 25 + 5 * rnd(16); C = 180 - A - B; } while (C < 25);
    const a = A * Math.PI / 180, b = B * Math.PI / 180, t = Math.sin(b) / Math.sin(a + b);
    const P = [[0, 0], [1, 0], [t * Math.cos(a), t * Math.sin(a)]];
    return {
      q: `？の ${W.kaku}は なんど？`, kind: '2d', draw2: () => drawShape2D(P, [A + '°', B + '°', '？']),
      choices: numChoices(C, [C + 10, C - 10, 180 - A, 180 - B].filter(v => v > 0 && v < 180)).map(c => ({ ...c, label: c.label + '°' })),
      explain: `さんかくけいの 3つの かくを たすと 180°。180 − ${A} − ${B} ＝ <b>${C}°</b>`,
    };
  }
  function qQuad() {
    let ang, P = null;
    for (let g = 0; g < 400 && !P; g++) {
      ang = [60 + 5 * rnd(19), 60 + 5 * rnd(19), 60 + 5 * rnd(19)]; ang.push(360 - ang[0] - ang[1] - ang[2]);
      if (ang[3] < 50 || ang[3] > 160) continue;
      let dir = 0; const u = [];
      for (let i = 0; i < 4; i++) { u.push([Math.cos(dir), Math.sin(dir)]); dir += Math.PI - ang[(i + 1) % 4] * Math.PI / 180; }
      const s0 = 1 + Math.random(), s1 = 0.8 + Math.random();
      // s2 u2 + s3 u3 = -(s0 u0 + s1 u1)
      const rx = -(s0 * u[0][0] + s1 * u[1][0]), ry = -(s0 * u[0][1] + s1 * u[1][1]);
      const det = u[2][0] * u[3][1] - u[2][1] * u[3][0]; if (Math.abs(det) < 1e-6) continue;
      const s2 = (rx * u[3][1] - ry * u[3][0]) / det, s3 = (u[2][0] * ry - u[2][1] * rx) / det;
      if (s2 < 0.6 || s3 < 0.6) continue;
      const Q = [[0, 0]]; [s0, s1, s2].forEach((s, i) => { const l = Q[Q.length - 1]; Q.push([l[0] + s * u[i][0], l[1] + s * u[i][1]]); });
      P = Q;
    }
    const ans = ang[0];
    return {
      q: `？の ${W.kaku}は なんど？`, kind: '2d', draw2: () => drawShape2D(P, ['？', ang[1] + '°', ang[2] + '°', ang[3] + '°']),
      choices: numChoices(ans, [ans + 10, ans - 10, 180 - ans]).map(c => ({ ...c, label: c.label + '°' })),
      explain: `しかくけいの 4つの かくを たすと 360°。360 − ${ang[1]} − ${ang[2]} − ${ang[3]} ＝ <b>${ans}°</b>`,
    };
  }
  /* 切り口 */
  const CUTQ = [
    [[1, 1, -1], [1, -1, 1], [-1, 1, 1]], [[1, -1, 0], [0, 1, -1], [-1, 0, 1]], [[1, 1, 1], [-1, 1, 1], [1, -1, -1]],
    [[1, 0, 1], [1, 0, -1], [-1, 0, 1]], [[1, 1, 0], [0, 1, 1], [-1, -1, 1]], [[1, 1, 0], [0, 1, 1], [-1, -1, -1]], [[1, 1, 1], [-1, -1, -1], [1, 0, -1]],
    [[0, 1, 1], [1, 1, 0], [1, -1, 1]],
  ];
  function qCut() {
    const m = prepMesh(cubeMesh()), pts = pick(CUTQ), [a, b, c] = pts;
    const n = V3.norm(V3.cross(V3.sub(b, a), V3.sub(c, a))), sec = sectionOf(m, n, V3.dot(n, a)), cl = classify2D(flatten(sec));
    const pool = ['eqtri', 'isotri', 'square', 'rect', 'rhombus', 'isotrap', 'pent', 'rhex'].filter(k => k !== cl.key);
    let show = false;
    const q = {
      q: `● の 3つを とおるように ${R('立方体', 'りっぽうたい')}を きると、きりくちは どんな かたち？`, hint: 'まわして かんがえよう', kind: '3d',
      setup: () => use3(m),
      draw3: solidDraw(m, {
        see: true, after: v => {
          if (show) { const S = sec.map(p => v.proj(p)); const x = v.ctx; x.beginPath(); S.forEach((s, i) => i ? x.lineTo(s[0], s[1]) : x.moveTo(s[0], s[1])); x.closePath(); x.fillStyle = 'rgba(255,82,82,.5)'; x.fill(); x.strokeStyle = '#e5484d'; x.lineWidth = 3 * v.dpr; x.stroke(); }
          pts.forEach(p => v.dot(p, 10, '#e5484d', '#fff'));
        },
      }),
      choices: shuffle([cl.key, ...shuffle(pool).slice(0, 3)]).map(k => ({ label: SHAPE[k][0], ok: k === cl.key })),
      explain: `きりくちは ${cl.name}。<span class="small">${cl.reason}</span>`,
      after: () => { show = true; view.dirty = true; },
    };
    return q;
  }
  function qDice() {
    const n = 1 + rnd(6), faces = dieFaces(1);
    return {
      q: `さいころの <b>${n}</b> の めの うら（はんたいがわ）は いくつ？`, hint: 'まわして たしかめてもいいよ', kind: '3d',
      setup: () => { view.fitTo([0, 0, 0], 1.9); view.resetView(); },
      draw3: v => { v.clear(); v.drawPolys(dieItems(faces, p => p), { cull: true }); },
      choices: numChoices(7 - n, [1, 2, 3, 4, 5, 6].filter(v => v !== n && v !== 7 - n)).filter(c => +c.label <= 6 && +c.label !== n),
      explain: `むかいあう めを たすと いつも 7。7 − ${n} ＝ <b>${7 - n}</b>`,
    };
  }
  function qShape() {
    const S3 = Math.sqrt(3), L = [
      ['square', [[0, 0], [2, 0], [2, 2], [0, 2]]], ['rect', [[0, 0], [3, 0], [3, 1.6], [0, 1.6]]],
      ['rhombus', [[0, 0], [2, 0], [3, S3], [1, S3]]], ['para', [[0, 0], [2.6, 0], [3.4, 1.5], [0.8, 1.5]]],
      ['trap', [[0, 0], [3.2, 0], [2.3, 1.6], [0.4, 1.6]]], ['eqtri', [[0, 0], [2, 0], [1, S3]]],
      ['isotri', [[0, 0], [2, 0], [1, 2.6]]], ['rtri', [[0, 0], [3, 0], [0, 1.8]]], ['risotri', [[0, 0], [2, 0], [0, 2]]],
    ];
    const [key, P0] = pick(L), rot = Math.random() * Math.PI * 2, P = P0.map(([x, y]) => [x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)]);
    const cl = classify2D(P), others = shuffle(L.map(l => l[0]).filter(k => k !== key)).slice(0, 3);
    return {
      q: 'この かたちの なまえは？', hint: 'しるし：〃おなじ ながさ　└ ちょっかく', kind: '2d', draw2: () => drawShape2D(P, null, { marks: true }),
      choices: shuffle([key, ...others]).map(k => ({ label: SHAPE[k][0], ok: k === key })), explain: `${SHAPE[key][0]}。<span class="small">${cl.reason}</span>`,
    };
  }
  const FACTS = [
    { q: `${R('円柱', 'えんちゅう')}を ひらくと、${W.sokumen}は どんな かたち？`, s: 'cyl', a: R('長方形', 'ちょうほうけい'), w: [R('円', 'えん'), R('おうぎ形', 'おうぎがた'), R('三角形', 'さんかくけい')], e: 'まるい めんを ひらくと ながしかく。よこは ' + R('円周', 'えんしゅう') + 'と おなじ ながさ' },
    { q: `${R('円', 'えん')}すいを ひらくと、${W.sokumen}は どんな かたち？`, s: 'cone', a: R('おうぎ形', 'おうぎがた'), w: [R('長方形', 'ちょうほうけい'), R('円', 'えん'), R('三角形', 'さんかくけい')], e: 'ピザを きったような おうぎ形に なるよ' },
    { q: `${R('立方体', 'りっぽうたい')}の ${W.tenkai}は ぜんぶで なんしゅるい？`, s: 'cube', a: '11', w: ['6', '8', '15'], e: '11しゅるい。「りったい」の「べつの ひらきかた」で さがしてみよう' },
    { q: `${R('球', 'きゅう')}を どこで きっても、きりくちは どんな かたち？`, s: 'sph', a: R('円', 'えん'), w: [R('だ円', 'だえん'), R('正方形', 'せいほうけい'), 'いろいろ'], e: 'きゅうは どこを きっても まる！' },
    { q: `${R('正六角形', 'せいろっかくけい')}の 1つの ${W.kaku}は なんど？`, a: '120°', w: ['60°', '90°', '108°'], e: '6つの かくの わは 720°。720 ÷ 6 ＝ 120°' },
    { q: `${W.chokkaku}は なんど？`, a: '90°', w: ['45°', '100°', '180°'], e: 'ちょっかくは 90°。2つで 180°（いっちょくせん）' },
    { q: `${R('円周', 'えんしゅう')}は ${R('直径', 'ちょっけい')}の やく なんばい？`, a: '3.14ばい', w: ['2ばい', '3ばい', '4ばい'], e: '3.14ばい。これを ' + R('円周率', 'えんしゅうりつ') + 'と いうよ' },
    { q: `1ぺん 2cmの ${R('立方体', 'りっぽうたい')}の ${R('体積', 'たいせき')}は？`, s: 'cube', a: '8cm³', w: ['6cm³', '4cm³', '12cm³'], e: '2 × 2 × 2 ＝ 8cm³' },
    { q: `おなじ ${W.teimen}・たかさの ${R('三角', 'さんかく')}すいの ${R('体積', 'たいせき')}は、${R('三角柱', 'さんかくちゅう')}の なんぶんの1？`, s: 'tetra', a: '3ぶんの1', w: ['2ぶんの1', '4ぶんの1', 'おなじ'], e: 'すいの たいせきは ちゅうの 3ぶんの1' },
    { q: `${R('四角', 'しかく')}すいの ${W.chou}は いくつ？`, s: 'pyr', a: '5', w: ['4', '6', '8'], e: 'そこの かど 4こ と てっぺん 1こ で 5こ' },
    { q: `${R('三角形', 'さんかくけい')}の 3つの ${W.kaku}を ぜんぶ たすと？`, a: '180°', w: ['90°', '270°', '360°'], e: 'どんな さんかくでも 180°' },
  ];
  function qFact() {
    const f = pick(FACTS), S = f.s ? solidById(f.s) : null, m = S ? prepMesh(S.make()) : null;
    return {
      q: f.q, kind: m ? '3d' : '2d', setup: () => m && use3(m), draw3: m ? solidDraw(m) : null,
      draw2: () => { fitCanvas(cv2); c2.clearRect(0, 0, cv2.width, cv2.height); text2('🤔', [cv2.width / 2, cv2.height / 2], '#000', 90); },
      choices: shuffle([{ label: f.a, ok: true }, ...f.w.map(w => ({ label: w, ok: false }))]), explain: f.e,
    };
  }

  /* ---------- すすめかた ---------- */
  function switchTo(kind) {
    cv3.classList.toggle('hide', kind !== '3d'); cv2.classList.toggle('hide', kind !== '2d');
    if (kind === '3d') requestAnimationFrame(() => { view.resize(); view.dirty = true; });
  }
  function progress() {
    $('quizProg').innerHTML = qs.map((q, i) => `<i class="${q.res || ''} ${i === qi && !q.res ? 'now' : ''}"></i>`).join('');
  }
  function start() {
    Snd.tap();
    qs = shuffle([qCount, qCount, qName, qNet, qTri, qQuad, qCut, qDice, qShape, qFact]).map(f => ({ f }));
    qi = 0; score = 0;
    $('btnQuizStart').classList.add('hide');
    show();
  }
  function show() {
    const slot = qs[qi]; cur = slot.f(); answered = false;
    $('quizQ').innerHTML = `もんだい ${qi + 1}`;
    say(cur.q);
    $('quizHint').textContent = cur.hint || '';
    $('quizHint').classList.toggle('hide', !cur.hint);
    switchTo(cur.kind);
    if (cur.setup) cur.setup();
    if (cur.kind === '2d') requestAnimationFrame(() => cur.draw2());
    view.dirty = true;
    const box = $('quizChoices'); box.innerHTML = '';
    cur.choices.forEach(ch => {
      const b = document.createElement('button'); b.innerHTML = ch.label;
      b.addEventListener('click', () => answer(ch, b)); box.appendChild(b);
    });
    $('btnQuizNext').classList.add('hide');
    progress();
  }
  function answer(ch, btn) {
    if (answered) return; answered = true;
    const box = $('quizChoices');
    [...box.children].forEach((b, i) => { b.disabled = true; if (cur.choices[i].ok) b.classList.add('ok'); });
    if (ch.ok) { score++; Snd.ok(); qs[qi].res = 'ok'; say(`⭕ せいかい！ ${cur.explain}`); }
    else { btn.classList.add('ng'); Snd.ng(); qs[qi].res = 'ng'; say(`ざんねん… ${cur.explain}`); }
    if (cur.after) cur.after();
    $('btnQuizNext').classList.remove('hide');
    $('btnQuizNext').textContent = qi === qs.length - 1 ? 'けっかを みる ▶' : 'つぎへ ▶';
    progress();
  }
  function finish() {
    cur = null;
    const stars = score >= 10 ? '👑' : score >= 8 ? '⭐⭐⭐' : score >= 5 ? '⭐⭐' : '⭐';
    $('quizQ').innerHTML = `けっか ${stars}`;
    say(`10もん ちゅう <b style="font-size:1.5em;color:#e5484d">${score}</b>もん せいかい！` + (score >= 8 ? ' すごい！' : ' もういちど ちょうせん しよう！'));
    $('quizChoices').innerHTML = ''; $('quizHint').classList.add('hide');
    $('btnQuizNext').classList.add('hide'); $('btnQuizStart').classList.remove('hide'); $('btnQuizStart').textContent = '🔁 もういちど';
    if (score > best) { best = score; Store.set('quizBest', best); }
    $('quizBest').textContent = `いままでの さいこう: ${best}もん`;
    if (score >= 8) { Snd.fanfare(); Stickers.give('quiz8'); }
    if (score >= 10) Stickers.give('quiz10');
    switchTo('2d'); fitCanvas(cv2); c2.clearRect(0, 0, cv2.width, cv2.height); text2(stars, [cv2.width / 2, cv2.height / 2], '#f2b705', 70);
  }
  $('btnQuizStart').addEventListener('click', start);
  $('btnQuizNext').addEventListener('click', () => { Snd.tap(); qi++; if (qi >= qs.length) finish(); else show(); });
  $('quizBest').textContent = best ? `いままでの さいこう: ${best}もん` : '';
  window.addEventListener('resize', () => { if (cur && cur.kind === '2d' && App.tab === 'quiz' && !cv2.classList.contains('hide')) cur.draw2(); });

  Loop.add(dt => {
    if (App.tab !== 'quiz') return;
    if (cv3.classList.contains('hide') || !cur || !cur.draw3) return;
    view.step(dt);
    if (cur.tick) cur.tick(dt);
    if (view.dirty) { view.dirty = false; cur.draw3(view); }
  });
  // さいしょの え
  requestAnimationFrame(() => { switchTo('2d'); fitCanvas(cv2); text2('❓🔷📐', [cv2.width / 2, cv2.height / 2], '#000', 60); });
  return { view };
})();
