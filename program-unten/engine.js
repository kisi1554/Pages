// ===== プログラミング うんてんし：うごきの きまり（がめんに かかわらない ぶぶん） =====
// ブラウザでは window.PU_ENGINE、node では require('./engine.js') で つかう。
(function (root) {
  'use strict';

  // むき: 0=うえ 1=みぎ 2=した 3=ひだり
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const DIRS = { N: 0, E: 1, S: 2, W: 3 };
  // マップの もじ
  //  .  くさ      T き      W いけ     H いえ   （T W H は ぶつかる）
  //  S  スタート  G えき    C おきゃくさん      X ふみきり（とおれる）
  const BLOCK = { T: 'tree', W: 'pond', H: 'house' };

  function parseMap(stage) {
    const rows = stage.map;
    const h = rows.length, w = rows[0].length;
    let start = null, goal = null;
    const customers = [];
    for (let y = 0; y < h; y++) {
      if (rows[y].length !== w) throw new Error(`stage ${stage.id}: row ${y} width`);
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === 'S') start = { x, y, d: DIRS[stage.dir] };
        else if (ch === 'G') goal = { x, y };
        else if (ch === 'C') customers.push({ x, y });
        else if (!'.TWHX'.includes(ch)) throw new Error(`stage ${stage.id}: bad char ${ch}`);
      }
    }
    if (!start || start.d === undefined || !goal) throw new Error(`stage ${stage.id}: start/goal`);
    return { w, h, rows, start, goal, customers };
  }

  // "FF3(FR)S" → ['F','F',{loop:3, body:['F','R']},'S']
  function parseProg(str) {
    const out = [];
    let i = 0;
    while (i < str.length) {
      const c = str[i];
      if (c >= '2' && c <= '9') {
        const close = str.indexOf(')', i);
        if (str[i + 1] !== '(' || close < 0) throw new Error('bad loop: ' + str);
        out.push({ loop: +c, body: str.slice(i + 2, close).split('') });
        i = close + 1;
      } else { out.push(c); i++; }
    }
    return out;
  }
  function progToString(prog) {
    return prog.map(it => typeof it === 'string' ? it : `${it.loop}(${it.body.join('')})`).join('');
  }
  function countCards(prog) {
    let n = 0;
    for (const it of prog) n += typeof it === 'string' ? 1 : 1 + it.body.length;
    return n;
  }
  // ほんとうに うごく じゅんばんに ならべる（ref は プログラム欄の どこか）
  function flatten(prog) {
    const out = [];
    prog.forEach((it, i) => {
      if (typeof it === 'string') out.push({ op: it, ref: [i] });
      else for (let k = 0; k < it.loop; k++) it.body.forEach((op, j) => out.push({ op, ref: [i, j], iter: k + 1, of: it.loop }));
    });
    return out;
  }

  // 1まい ぶん うごかす。state = {x,y,d,got(Set of "x,y")}
  // かえりち: {kind, x,y,d, ...} kind = move|stop|board|fail|clear
  function step(M, st, op) {
    if (op === 'F' || op === 'L' || op === 'R') {
      const d = op === 'F' ? st.d : op === 'L' ? (st.d + 3) % 4 : (st.d + 1) % 4;
      const nx = st.x + DX[d], ny = st.y + DY[d];
      if (nx < 0 || ny < 0 || nx >= M.w || ny >= M.h) return { kind: 'fail', reason: 'out', x: st.x, y: st.y, d, bx: nx, by: ny };
      const ch = M.rows[ny][nx];
      if (BLOCK[ch]) return { kind: 'fail', reason: BLOCK[ch], x: st.x, y: st.y, d, bx: nx, by: ny };
      return { kind: 'move', x: nx, y: ny, d, turn: op !== 'F', cross: ch === 'X' };
    }
    if (op === 'B') {
      const key = st.x + ',' + st.y;
      if (M.rows[st.y][st.x] !== 'C') return { kind: 'fail', reason: 'nobody', x: st.x, y: st.y, d: st.d };
      if (st.got.has(key)) return { kind: 'fail', reason: 'already', x: st.x, y: st.y, d: st.d };
      return { kind: 'board', x: st.x, y: st.y, d: st.d, key };
    }
    if (op === 'S') {
      const atGoal = st.x === M.goal.x && st.y === M.goal.y;
      if (!atGoal) return { kind: 'fail', reason: 'nostation', x: st.x, y: st.y, d: st.d };
      if (st.got.size < M.customers.length) return { kind: 'fail', reason: 'notall', x: st.x, y: st.y, d: st.d };
      return { kind: 'clear', x: st.x, y: st.y, d: st.d };
    }
    throw new Error('bad op ' + op);
  }

  // プログラムを さいごまで うごかして、1まいずつの きろくを かえす
  function run(stage, prog) {
    const M = stage._M || (stage._M = parseMap(stage));
    const st = { x: M.start.x, y: M.start.y, d: M.start.d, got: new Set() };
    const steps = [];
    let passed = false;
    for (const f of flatten(prog)) {
      const r = step(M, st, f.op);
      const rec = Object.assign({ op: f.op, ref: f.ref, iter: f.iter, of: f.of, from: { x: st.x, y: st.y, d: st.d } }, r);
      steps.push(rec);
      if (r.kind === 'fail') return { steps, ok: false, reason: r.reason, at: rec };
      if (r.kind === 'clear') return { steps, ok: true, at: rec };
      st.x = r.x; st.y = r.y; st.d = r.d;
      if (r.kind === 'board') st.got.add(r.key);
      if (st.x === M.goal.x && st.y === M.goal.y) passed = true;
    }
    // とまらずに おわった
    const atGoal = st.x === M.goal.x && st.y === M.goal.y;
    const reason = !steps.length ? 'empty' : atGoal ? 'nostop' : passed ? 'passed' : 'short';
    return { steps, ok: false, reason, at: { x: st.x, y: st.y, d: st.d } };
  }

  // いちばん すくない まいすうを さがす（テスト・データづくり よう）。
  // じょうたい (x,y,むき,のせた人) ごとに さいしょうコストを もつ ダイクストラ。
  // cards: つかえる カード（'FLRSB' と ループ 'P'）、maxBody: ループの なかみの さいだい
  function solve(stage, cards, maxBody = 5) {
    const M = parseMap(stage);
    const prims = ['F', 'L', 'R', 'B'].filter(c => cards.includes(c));
    const ci = new Map(M.customers.map((c, i) => [c.x + ',' + c.y, i]));
    const bodies = [];
    if (cards.includes('P')) {
      let cur = [[]];
      for (let len = 1; len <= maxBody; len++) {
        const nx = [];
        for (const b of cur) for (const p of prims) nx.push(b.concat(p));
        cur = nx; bodies.push(...cur);
      }
    }
    const items = prims.map(p => ({ it: p, ops: [p], cost: 1 }));
    for (const b of bodies) for (let n = 2; n <= 4; n++) {
      const ops = []; for (let k = 0; k < n; k++) ops.push(...b);
      items.push({ it: { loop: n, body: b }, ops, cost: 1 + b.length });
    }
    const key = (x, y, d, m) => ((m * M.h + y) * M.w + x) * 4 + d;
    const best = new Map(), prev = new Map();
    const full = (1 << M.customers.length) - 1;
    // コストが ちいさいので バケツで ダイクストラ
    const buckets = [];
    const push = (c, s) => { (buckets[c] || (buckets[c] = [])).push(s); };
    const s0 = { x: M.start.x, y: M.start.y, d: M.start.d, m: 0 };
    best.set(key(s0.x, s0.y, s0.d, 0), 0); push(0, s0);
    for (let c = 0; c < buckets.length || c < 64; c++) {
      const b = buckets[c]; if (!b) { if (c > 60) break; continue; }
      for (const s of b) {
        const k0 = key(s.x, s.y, s.d, s.m);
        if (best.get(k0) !== c) continue;
        if (s.x === M.goal.x && s.y === M.goal.y && s.m === full) {
          // とまる で おわり
          const prog = ['S']; let k = k0;
          while (prev.has(k)) { const p = prev.get(k); prog.unshift(p.it); k = p.from; }
          return { min: c + 1, prog };
        }
        for (const item of items) {
          const st = { x: s.x, y: s.y, d: s.d, got: new Set() };
          let m = s.m, ok = true;
          for (const op of item.ops) {
            if (op === 'B') {
              const i = ci.get(st.x + ',' + st.y);
              if (i === undefined || (m >> i) & 1) { ok = false; break; }
              m |= 1 << i; continue;
            }
            const r = step(M, st, op);
            if (r.kind !== 'move') { ok = false; break; }
            st.x = r.x; st.y = r.y; st.d = r.d;
          }
          if (!ok) continue;
          const nc = c + item.cost, nk = key(st.x, st.y, st.d, m);
          if (best.has(nk) && best.get(nk) <= nc) continue;
          best.set(nk, nc); prev.set(nk, { from: k0, it: item.it });
          push(nc, { x: st.x, y: st.y, d: st.d, m });
        }
      }
    }
    return null;
  }

  const api = { DX, DY, DIRS, parseMap, parseProg, progToString, countCards, flatten, step, run, solve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PU_ENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
