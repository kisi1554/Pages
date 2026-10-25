/* ありの す たんけん ｜ シミュレーション（描画・DOM には さわらない）
 *
 * せかいは GW×GH の グリッド。y < SURF が そら、y = ROW（SURF-1）が じめんの うえを あるく みち。
 * あり は「きょりの ば」（BFS で つくる）を くだって あるくので、300ぴき でも かるい。
 * においの みち は pher（グリッド上の においの ば）。えさを もって かえる ありだけが のこし、時間で きえる。
 */
(function () {
  "use strict";
  const ARI = (window.ARI = window.ARI || {});

  const GW = 100, GH = 100, SURF = 24, ROW = SURF - 1, EX = 42;
  const T_EMPTY = 0, T_SOIL = 1, T_ROCK = 2, T_PLUG = 3, T_SKY = 4;
  const TICK = 1 / 30;
  const INF = 30000;
  const MAX_WORKERS = 300;
  const PMAX = 6;
  const FOOD_MAX = 300;          // えさの へやに ためられる りょう              // においの こさの うえかぎり
  const EVAP = Math.pow(0.5, 3 / (16 * 30)); // 3チックごと。はんぶんに なるまで やく16びょう
  const SEASONS = [
    { id: "spring", name: "はる", len: 120 },
    { id: "summer", name: "なつ", len: 120 },
    { id: "autumn", name: "あき", len: 120 },
    { id: "winter", name: "ふゆ", len: 80 },
  ];
  const ROOM_NAME = { queen: "じょおう", egg: "たまご", larva: "ようちゅう", pupa: "さなぎ", food: "えさ", winter: "ふゆごし" };

  // す の せっけいず。ありが じゅんばんに ほる（need = はたらきあり の かず が これ以上 で ほりはじめる）
  const PLAN = [
    { id: "shaft", pts: [[42, 22], [42, 32], [45, 40], [42, 48]], need: 0, pre: true },
    { id: "queen", type: "queen", c: [60, 46], r: [7, 3.5], pts: [[42, 46], [53, 46]], need: 0, pre: true },
    { id: "egg", type: "egg", c: [26, 38], r: [6, 3], pts: [[43, 37], [32, 38]], need: 0 },
    { id: "food", type: "food", c: [63, 31], r: [6, 3], pts: [[42, 31], [57, 31]], need: 0 },
    { id: "larva", type: "larva", c: [64, 59], r: [8, 3.5], pts: [[42, 48], [44, 57], [56, 59]], need: 3 },
    { id: "pupa", type: "pupa", c: [22, 66], r: [8, 3.5], pts: [[44, 57], [42, 66], [30, 66]], need: 8 },
    { id: "winter", type: "winter", c: [62, 90], r: [9, 4], pts: [[42, 66], [45, 76], [42, 86], [44, 90], [53, 90]], need: 14 },
    { id: "larva2", type: "larva", c: [20, 86], r: [7, 3.5], pts: [[43, 84], [27, 86]], need: 30 },
    { id: "pupa2", type: "pupa", c: [79, 73], r: [7, 3.5], pts: [[44, 72], [72, 73]], need: 50 },
    { id: "food2", type: "food", c: [84, 45], r: [6, 3], pts: [[66, 46], [78, 45]], need: 80 },
  ];
  const ROOM_TOTAL = PLAN.filter(p => p.type).length;

  const FOODS = {
    sugar: { name: "さとう", amount: 30, value: 3 },
    bread: { name: "パンくず", amount: 25, value: 3 },
    bug:   { name: "むし", amount: 30, value: 4 },
    mini:  { name: "ちいさな むし", amount: 5, value: 2 },
  };

  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = Math.random;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
    const qx = ax + t * dx - px, qy = ay + t * dy - py;
    return Math.sqrt(qx * qx + qy * qy);
  }
  function inEllipse(it, x, y) {
    if (!it.type) return false;
    const dx = (x - it.c[0]) / it.r[0], dy = (y - it.c[1]) / it.r[1];
    return dx * dx + dy * dy <= 1;
  }

  // ---------------------------------------------------------------- せかい を つくる
  function buildWorld(S) {
    const cell = (S.cell = new Uint8Array(GW * GH));
    const plan = (S.plan = new Int8Array(GW * GH).fill(-1));
    const room = (S.inRoom = new Int8Array(GW * GH).fill(-1));
    S.items = PLAN.map((p, k) => ({ k, id: p.id, type: p.type || null, c: p.c, r: p.r, need: p.need,
      cells: [], rcells: 0, dug: 0, rdug: 0, unlocked: !!p.pre || p.need === 0, usable: false }));
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) cell[y * GW + x] = y < SURF ? T_SKY : T_SOIL;
    PLAN.forEach((p, k) => {
      const it = S.items[k];
      for (let y = SURF; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
        const cx = x + 0.5, cy = y + 0.5;
        let on = false;
        for (let j = 0; j + 1 < p.pts.length && !on; j++) {
          const a = p.pts[j], b = p.pts[j + 1];
          if (distSeg(cx, cy, a[0] + 0.5, a[1] + 0.5, b[0] + 0.5, b[1] + 0.5) <= 1.55) on = true;
        }
        const inR = inEllipse(p, cx, cy);
        if (inR) room[y * GW + x] = k;
        if ((on || inR) && plan[y * GW + x] === -1) {
          plan[y * GW + x] = k;
          it.cells.push(y * GW + x);
          if (inR) it.rcells++;
        }
      }
    });
    // いし（せっけいずの ちかくには おかない）
    const r = mulberry32(S.seed);
    for (let n = 0; n < 16; n++) {
      const bx = 3 + r() * (GW - 6), by = SURF + 5 + r() * (GH - SURF - 8), br = 1.2 + r() * 2.2;
      let ok = true;
      for (let y = Math.floor(by - br - 2); y <= by + br + 2 && ok; y++)
        for (let x = Math.floor(bx - br - 2); x <= bx + br + 2; x++)
          if (x >= 0 && y >= 0 && x < GW && y < GH && plan[y * GW + x] >= 0) { ok = false; break; }
      if (!ok) continue;
      for (let y = Math.floor(by - br); y <= by + br; y++)
        for (let x = Math.floor(bx - br * 1.3); x <= bx + br * 1.3; x++) {
          const dx = (x + 0.5 - bx) / (br * 1.3), dy = (y + 0.5 - by) / br;
          if (dx * dx + dy * dy <= 1 && y >= SURF && y < GH) cell[y * GW + x] = T_ROCK;
        }
    }
  }

  function setEmpty(S, i) {
    const was = S.cell[i];
    if (was === T_EMPTY || was === T_SKY || was === T_ROCK) return false;
    S.cell[i] = T_EMPTY;
    S.dug.push(i);
    S.dirty = true;
    if (was === T_PLUG) {
      const k = S.plugs.indexOf(i);
      if (k >= 0) S.plugs.splice(k, 1);
      if (!S.plugs.length && S.wasPlugged && !S.rain) {
        S.wasPlugged = false;
        msg(S, "いりぐちが あいた！ また そとへ でかけるよ");
        badge(S, "rain");
      }
      return true;
    }
    const k = S.plan[i];
    if (k >= 0) {
      const it = S.items[k];
      it.dug++;
      if (S.inRoom[i] === k) {
        it.rdug++;
        if (!it.usable && it.rdug >= it.rcells * 0.85) {
          it.usable = true;
          if (!S.loading) {
            msg(S, ROOM_NAME[it.type] + "の へやが できた！");
            S.ev.push({ k: "room" });
          }
        }
      }
    }
    return true;
  }

  // ---------------------------------------------------------------- きょりの ば
  function bfs(S, sources, out) {
    out.fill(INF);
    const q = S.q, walk = S.walk;
    let h = 0, t = 0;
    for (const s of sources) { if (out[s] !== 0) { out[s] = 0; q[t++] = s; } }
    while (h < t) {
      const i = q[h++], d = out[i] + 1;
      const x = i % GW;
      for (let k = 0; k < 8; k++) {
        const dx = DIRS[k][0], dy = DIRS[k][1];
        const nx = x + dx;
        if (nx < 0 || nx >= GW) continue;
        const j = i + dx + dy * GW;
        if (j < 0 || j >= GW * GH || !walk[j] || out[j] <= d) continue;
        if (dx && dy && !(walk[i + dx] && walk[i + dy * GW])) continue;
        out[j] = d; q[t++] = j;
      }
    }
  }

  function diggable(S, i) {
    const c = S.cell[i];
    if (c === T_PLUG) return !S.rain;
    if (c !== T_SOIL) return false;
    const k = S.plan[i];
    return k >= 0 && S.items[k].active;
  }

  function recomputeFields(S) {
    const N = GW * GH;
    if (!S.walk) {
      S.walk = new Uint8Array(N); S.q = new Int32Array(N * 2);
      S.F = { ent: new Int16Array(N), front: new Int16Array(N), room: [] };
    }
    const walk = S.walk, cell = S.cell;
    for (let i = 0; i < N; i++) {
      const y = (i / GW) | 0, x = i % GW;
      walk[i] = cell[i] === T_EMPTY || (y === ROW && x >= 1 && x < GW - 1) ? 1 : 0;
    }
    bfs(S, [ROW * GW + EX], S.F.ent);
    // いっぺんに ほるのは 2つまで（へやが はやく できあがる ように）
    let na = 0;
    for (const it of S.items) {
      it.active = false;
      if (it.unlocked && it.dug < it.cells.length && na < 2) { it.active = true; na++; }
    }
    const fr = [];
    for (let i = GW; i < N - GW; i++) {
      if (!walk[i]) continue;
      if (diggable(S, i + 1) || diggable(S, i - 1) || diggable(S, i + GW) || diggable(S, i - GW)) fr.push(i);
    }
    S.frontierCount = fr.length;
    bfs(S, fr, S.F.front);
    S.items.forEach((it, k) => {
      if (!it.usable) return;
      const src = [];
      for (const i of it.cells) if (walk[i] && S.inRoom[i] === k) src.push(i);
      if (!S.F.room[k]) S.F.room[k] = new Int16Array(N);
      bfs(S, src, S.F.room[k]);
    });
    S.dirty = false;
    S.lastField = S.tick;
  }

  // ---------------------------------------------------------------- じょうたい
  function create(species, seed) {
    const S = {
      v: 1, species: species || "kurooo", seed: seed || ((Math.random() * 1e9) | 0),
      t: 0, tick: 0, season: 0, seasonT: 0, year: 1, winter: false,
      ants: [], brood: [], foods: [], hazards: [], plugs: [], dug: [], ev: [], msgs: [],
      food: 8, mound: [0, 0], recruit: 0, nextId: 1, rain: null, wasPlugged: false,
      rec: { maxAnts: 0, maxRooms: 0, born: 0, playT: 0, lineMax: 0 },
      badges: {}, foodsTried: {}, avoid: 0, alatePlan: 0, flightYear: 0, hadWinter: false, flight: false,
      nextRandom: 150, nextNatural: 20, lineN: 0, dirty: true, lastField: -99,
    };
    buildWorld(S);
    S.pher = new Float32Array(GW * GH);
    S.loading = true;
    S.items.forEach(it => { if (PLAN[it.k].pre) it.cells.forEach(i => setEmpty(S, i)); });
    S.loading = false;
    S.dug.length = 0;
    recomputeFields(S);
    const q = S.items[1];
    const qs = slot(S, 1);
    S.ants.push(makeAnt(S, "queen", qs.x, qs.y));
    for (let n = 0; n < 5; n++) {
      const p = slot(S, 1);
      const a = makeAnt(S, "worker", p.x, p.y);
      a.age = 60 + n * 30;
      S.ants.push(a);
    }
    for (const st of ["egg", "egg", "larva", "pupa"]) {
      const p = slot(S, 1);
      S.brood.push({ id: S.nextId++, stage: st, age: st === "pupa" ? 12 : 5, fed: st === "pupa" ? 3 : 1, lastFed: -99, room: q.k, x: p.x, y: p.y, carried: false, claim: 0, fclaim: 0, al: null });
    }
    updateRecords(S);
    return S;
  }

  function makeAnt(S, kind, x, y) {
    return { id: S.nextId++, kind, x, y, px: x, py: y, job: kind === "worker" ? "rest" : kind === "queen" ? "queen" : "alate",
      nj: null, st: "idle", carry: null, cv: 0, ref: null, tgt: -1, tm: 0, age: 0, dir: rnd() < 0.5 ? -1 : 1,
      hd: rnd() * 6.28, ph: rnd() * 6.28, jx: (rnd() - 0.5) * 0.5, jy: (rnd() - 0.5) * 0.4,
      tx: x, ty: y, sT: 0, lastCx: -1, mv: false, wait: false, alert: 0, layT: 0 };
  }

  function msg(S, text) { if (!S.quiet) S.msgs.push({ text, t: S.t }); }
  function badge(S, id) {
    if (S.badges[id]) return;
    S.badges[id] = Date.now();
    if (!S.quiet) S.ev.push({ k: "badge", id });
  }

  function workers(S) { let n = 0; for (const a of S.ants) if (a.kind === "worker") n++; return n; }

  // へやの ゆか の どこか
  function slot(S, k) {
    const it = S.items[k];
    for (let tries = 0; tries < 14; tries++) {
      const x = it.c[0] + (rnd() * 2 - 1) * (it.r[0] - 1.6);
      const cx = x | 0;
      for (let y = Math.ceil(it.c[1] + it.r[1]); y >= it.c[1] - it.r[1]; y--) {
        const i = y * GW + cx;
        if (S.cell[i] === T_EMPTY && S.inRoom[i] === k && S.cell[i + GW] !== T_EMPTY) return { x, y: y + 0.55 };
      }
    }
    return { x: it.c[0], y: it.c[1] + 0.5 };
  }

  function roomOfType(S, type, b) {
    let best = -1, bn = 1e9;
    for (const it of S.items) {
      if (it.type !== type || !it.usable) continue;
      if (b && b.room === it.k) return it.k;
      let n = 0; for (const o of S.brood) if (o.room === it.k) n++;
      if (n < bn) { bn = n; best = it.k; }
    }
    return best;
  }
  const QUEEN_ROOM = 1;
  function wantRoom(S, b) {
    const type = b.stage === "egg" ? "egg" : b.stage === "larva" ? "larva" : "pupa";
    const k = roomOfType(S, type, b);
    return k >= 0 ? k : QUEEN_ROOM;
  }
  function storeRoom(S) { const k = roomOfType(S, "food"); return k >= 0 ? k : QUEEN_ROOM; }
  function winterRoom(S) {
    const k = roomOfType(S, "winter");
    if (k >= 0) return k;
    let best = QUEEN_ROOM;
    for (const it of S.items) if (it.usable && it.c[1] > S.items[best].c[1]) best = it.k;
    return best;
  }
  function roomAt(S, x, y) {
    const i = (y | 0) * GW + (x | 0);
    const k = S.inRoom[i];
    return k >= 0 && S.items[k].usable ? k : -1;
  }
  function canGoOut(S) { return !S.rain && !S.winter && S.plugs.length === 0; }

  // ---------------------------------------------------------------- うごき
  function moveTo(a, tx, ty, sp) {
    const dx = tx - a.x, dy = ty - a.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const step = sp * TICK;
    if (d < 0.001) return true;
    const th = Math.atan2(dy, dx);
    let dh = th - a.hd;
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    a.hd += dh * 0.35;
    a.mv = true;
    a.ph += step * 2.6;
    if (d <= step) { a.x = tx; a.y = ty; return true; }
    a.x += (dx / d) * step; a.y += (dy / d) * step;
    return false;
  }

  function nearestWalk(S, cx, cy) {
    for (let r = 1; r <= 8; r++)
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
        if (S.walk[y * GW + x]) return y * GW + x;
      }
    return -1;
  }

  // ば を くだる。0 = ついた、1 = あるいてる、-1 = いけない
  function follow(S, a, f, sp) {
    if (!f) return -1;
    const cx = a.x | 0, cy = a.y | 0;
    const i = cy * GW + cx;
    if (!S.walk[i]) {
      const n = nearestWalk(S, cx, cy);
      if (n < 0) { const p = slot(S, QUEEN_ROOM); a.x = p.x; a.y = p.y; return 1; }
      moveTo(a, (n % GW) + 0.5, ((n / GW) | 0) + 0.5, sp * 1.5);
      return 1;
    }
    const d = f[i];
    if (d === 0) return 0;
    if (d >= INF) { a.wait = true; return -1; }
    a.wait = false;
    let best = -1, bd = d;
    const o = a.id & 7;
    for (let kk = 0; kk < 8; kk++) {
      const k = (kk + o) & 7;
      const dx = DIRS[k][0], dy = DIRS[k][1];
      const nx = cx + dx;
      if (nx < 0 || nx >= GW) continue;
      const j = i + dx + dy * GW;
      if (!S.walk[j] || f[j] >= bd) continue;
      if (dx && dy && !(S.walk[i + dx] && S.walk[i + dy * GW])) continue;
      best = j; bd = f[j];
    }
    if (best < 0) return -1;
    const by = (best / GW) | 0;
    const ty = by === ROW ? ROW + 0.7 : by + 0.5 + a.jy;
    moveTo(a, (best % GW) + 0.5 + a.jx, ty, sp);
    return 1;
  }

  function speed(S, a) {
    const base = S.species === "kuroyama" ? 6 : 5;
    let sp = base * (a.carry ? 0.85 : 1);
    if (a.kind === "queen") sp = 1.4;
    return sp;
  }
  function onSurface(a) { return (a.y | 0) === ROW; }

  function free(S, a) {
    if (a.nj) { a.job = a.nj; a.nj = null; }
    a.st = "idle"; a.ref = null; a.tgt = -1;
  }

  // ---------------------------------------------------------------- えさあつめ
  function sumP(S, x0, dir, n) {
    let s = 0;
    for (let k = 1; k <= n; k++) {
      const x = x0 + dir * k;
      if (x < 0 || x >= GW) break;
      s += S.pher[ROW * GW + x];
    }
    return s;
  }

  function forage(S, a, sp) {
    switch (a.st) {
      case "idle":
        if (!canGoOut(S)) { a.job = "rest"; a.st = "idle"; return; }
        a.st = "toExit";
        return;
      case "toExit": {
        if (!canGoOut(S)) { free(S, a); a.job = "rest"; return; }
        const r = follow(S, a, S.F.ent, sp);
        if (r === 0) {
          a.st = "search"; a.sT = 0; a.lastCx = -1;
          const L = sumP(S, EX, -1, 14), R = sumP(S, EX, 1, 14);
          if (L + R > 0.3) {
            const l2 = (L + 0.05) * (L + 0.05), r2 = (R + 0.05) * (R + 0.05);
            a.dir = rnd() < r2 / (l2 + r2) ? 1 : -1;
          } else a.dir = rnd() < 0.5 ? -1 : 1;
        }
        return;
      }
      case "search": {
        if (!canGoOut(S) || (a.nj && a.nj !== "forage")) { a.st = "goHome"; return; }
        const cx = a.x | 0;
        if (cx !== a.lastCx) {
          a.lastCx = cx;
          for (const f of S.foods) if (Math.abs(f.x - a.x) < 3) { a.st = "toFood"; a.ref = f; return; }
          for (const h of S.hazards) {
            const hx = h.cx;
            if (Math.abs(hx - a.x) < h.r + 3 && Math.sign(hx - a.x) === a.dir) {
              a.dir = -a.dir; a.alert = 1.2;
              if (!a.avoided) { a.avoided = true; S.avoid++; if (S.avoid >= 3) badge(S, "avoid"); }
              break;
            }
          }
          const ahead = sumP(S, cx, a.dir, 5);
          if (ahead < 0.15) {
            const back = sumP(S, cx, -a.dir, 5);
            if (back > 0.4 && Math.abs(cx - EX) < 3) a.dir = -a.dir;
            else if (rnd() < 0.035) a.dir = -a.dir;
          }
          if (cx <= 2) a.dir = 1;
          if (cx >= GW - 3) a.dir = -1;
        }
        moveTo(a, a.x + a.dir, ROW + 0.7, sp);
        a.sT += TICK;
        if (a.sT > 40) a.st = "goHome";
        return;
      }
      case "toFood": {
        const f = a.ref;
        if (!f || f.amount <= 0) { a.st = "search"; a.ref = null; return; }
        if (moveTo(a, f.x + (a.id % 3 - 1) * 0.5, ROW + 0.7, sp)) { a.st = "eat"; a.tm = 1.0; }
        return;
      }
      case "eat": {
        const f = a.ref;
        a.tm -= TICK;
        a.hd += Math.sin(S.t * 20 + a.id) * 0.03;
        if (a.tm > 0) return;
        if (!f || f.amount <= 0) { a.st = "search"; a.ref = null; return; }
        f.amount--;
        a.carry = f.type; a.cv = FOODS[f.type].value;
        if (!f.found) {
          f.found = true;
          S.ev.push({ k: "find", x: f.x });
          msg(S, FOODS[f.type].name + "を みつけた！ すに かえって なかまに しらせるよ");
        }
        if (f.type !== "mini") {
          S.foodsTried[f.type] = 1;
          if (Object.keys(S.foodsTried).length >= 3) badge(S, "foods3");
        }
        if (f.amount <= 0) {
          S.foods.splice(S.foods.indexOf(f), 1);
          if (f.type !== "mini") msg(S, FOODS[f.type].name + "が なくなった。においの みちも だんだん きえるよ");
        }
        a.ref = null; a.st = "return";
        return;
      }
      case "return": {
        const i = (a.y | 0) * GW + (a.x | 0);
        if (S.walk && S.walk[i]) S.pher[i] = Math.min(PMAX, S.pher[i] + (onSurface(a) ? 0.22 : 0.08));
        const k = storeRoom(S);
        const r = follow(S, a, S.F.room[k], sp);
        if (r === 0) { a.st = "store"; a.tgt = k; const p = slot(S, k); a.tx = p.x; a.ty = p.y; }
        return;
      }
      case "store":
        if (moveTo(a, a.tx, a.ty, sp * 0.8)) {
          S.food = Math.min(FOOD_MAX, S.food + a.cv); a.carry = null; a.cv = 0;
          S.recruit = Math.min(10, S.recruit + 1);
          if (a.nj && a.nj !== "forage") free(S, a);
          else a.st = "toExit";
        }
        return;
      case "goHome": {
        const r = follow(S, a, S.F.room[storeRoom(S)], sp);
        if (r === 0) { a.st = "pause"; a.tm = 2 + rnd() * 2; a.avoided = false; }
        return;
      }
      case "pause":
        a.tm -= TICK;
        if (a.tm <= 0) { a.avoided = false; free(S, a); }
        return;
      default: free(S, a);
    }
  }

  // ---------------------------------------------------------------- あなほり
  function dig(S, a, sp) {
    switch (a.st) {
      case "idle":
        if (S.rain || !S.frontierCount) { a.job = "rest"; a.st = "idle"; return; }
        a.st = "toFront"; return;
      case "toFront": {
        if (S.rain) { free(S, a); a.job = "rest"; return; }
        const r = follow(S, a, S.F.front, sp);
        if (r < 0) { free(S, a); if (a.job === "dig") a.job = "rest"; return; }
        if (r === 0) {
          const i = (a.y | 0) * GW + (a.x | 0);
          let best = -1, bk = 99;
          for (const j of [i + 1, i - 1, i + GW, i - GW]) {
            if (!diggable(S, j)) continue;
            const k = S.cell[j] === T_PLUG ? -1 : S.plan[j];
            if (k < bk) { bk = k; best = j; }
          }
          if (best < 0) { S.dirty = true; a.st = "idle"; return; }
          a.ref = best; a.st = "dig"; a.tm = 0.6;
          a.hd = Math.atan2(((best / GW) | 0) + 0.5 - a.y, (best % GW) + 0.5 - a.x);
        }
        return;
      }
      case "dig": {
        a.tm -= TICK;
        a.ph += 0.5;
        if (a.tm > 0) return;
        const j = a.ref;
        if (diggable(S, j)) {
          setEmpty(S, j);
          S.ev.push({ k: "dig", x: j % GW, y: (j / GW) | 0 });
          const k = S.plan[j];
          let extra = 2;
          for (const n of [j + 1, j - 1, j + GW, j - GW, j + 1 + GW, j - 1 + GW]) {
            if (extra > 0 && diggable(S, n) && S.plan[n] === k && S.cell[n] === T_SOIL) { setEmpty(S, n); extra--; }
          }
          a.carry = "soil"; a.st = "carryOut";
        } else a.st = "toFront";
        return;
      }
      case "carryOut": {
        const r = follow(S, a, S.F.ent, sp);
        // いりぐちが ふさがっている あいだは、つぶを すの なかで かためて しまう
        if (r < 0) { a.carry = null; a.wait = false; free(S, a); return; }
        if (r === 0) {
          const side = rnd() < 0.5 ? -1 : 1;
          a.tgt = side; a.tx = EX + side * (4 + rnd() * 5); a.st = "dump";
        }
        return;
      }
      case "dump":
        if (moveTo(a, a.tx, ROW + 0.7, sp)) {
          S.mound[a.tgt > 0 ? 1 : 0]++;
          a.carry = null; free(S, a);
        }
        return;
      default: free(S, a);
    }
  }

  // ---------------------------------------------------------------- こそだて
  function hungry(S, b) { return b.stage === "larva" && b.fed < 3 && S.t - b.lastFed > 5; }

  function nurse(S, a, sp) {
    const b = a.ref;
    const lost = () => { if (b) { if (b.claim === a.id) b.claim = 0; if (b.fclaim === a.id) b.fclaim = 0; } free(S, a); };
    switch (a.st) {
      case "idle": {
        for (const o of S.brood) {
          if (o.carried || o.claim || o.dead) continue;
          const w = wantRoom(S, o);
          if (w !== o.room) { o.claim = a.id; a.ref = o; a.st = "toBrood"; return; }
        }
        if (S.food >= 0.7) {
          for (const o of S.brood) {
            if (o.carried || o.fclaim || o.dead || !hungry(S, o)) continue;
            o.fclaim = a.id; a.ref = o; a.st = "getFood"; return;
          }
        }
        const pick = S.brood.length ? S.brood[(rnd() * S.brood.length) | 0] : null;
        a.ref = pick && !pick.carried ? pick : null;
        a.tgt = a.ref ? a.ref.room : QUEEN_ROOM;
        a.st = "toGroom";
        return;
      }
      case "toBrood": {
        if (!b || b.dead || b.carried) return lost();
        const r = follow(S, a, S.F.room[b.room], sp);
        if (r < 0) return lost();
        if (r === 0) a.st = "pickB";
        return;
      }
      case "pickB":
        if (!b || b.dead || b.carried) return lost();
        if (moveTo(a, b.x, b.y - 0.2, sp)) {
          b.carried = true; a.carry = "brood"; a.tgt = wantRoom(S, b); a.st = "carryB";
        }
        return;
      case "carryB": {
        if (!b || b.dead) { a.carry = null; return lost(); }
        const r = follow(S, a, S.F.room[a.tgt], sp);
        if (r < 0) { a.tgt = QUEEN_ROOM; return; }
        if (r === 0) { const p = slot(S, a.tgt); a.tx = p.x; a.ty = p.y; a.st = "placeB"; }
        return;
      }
      case "placeB":
        if (moveTo(a, a.tx, a.ty - 0.1, sp)) {
          b.room = a.tgt; b.x = a.tx; b.y = a.ty; b.carried = false; b.claim = 0;
          a.carry = null; free(S, a);
        }
        return;
      case "getFood": {
        if (!b || b.dead || b.carried) return lost();
        const r = follow(S, a, S.F.room[storeRoom(S)], sp);
        if (r < 0) return lost();
        if (r === 0) {
          if (S.food < 0.7) return lost();
          S.food -= 0.7; a.carry = "feed"; a.feedLeft = 3; a.st = "toLarva";
        }
        return;
      }
      case "toLarva": {
        if (!b || b.dead || b.carried || b.stage !== "larva") { S.food += a.carry ? 0.7 : 0; a.carry = null; return lost(); }
        const r = follow(S, a, S.F.room[b.room], sp);
        if (r < 0) { S.food += 0.7; a.carry = null; return lost(); }
        if (r === 0) a.st = "feedL";
        return;
      }
      case "feedL":
        if (!b || b.dead || b.carried) { S.food += 0.7; a.carry = null; return lost(); }
        if (moveTo(a, b.x + 0.9, b.y - 0.3, sp)) { a.st = "feeding"; a.tm = 0.9; a.hd = Math.PI; }
        return;
      case "feeding":
        a.tm -= TICK;
        if (a.tm <= 0) {
          if (b && !b.dead) { b.fed++; b.lastFed = S.t; b.fclaim = 0; }
          // ひとくちぶんで 3びきまで ごはんを あげられる。おなじ へやの つぎの こへ
          if (--a.feedLeft > 0) {
            const nx = S.brood.find(o => o.room === (b ? b.room : -1) && !o.carried && !o.fclaim && !o.dead && hungry(S, o));
            if (nx) { nx.fclaim = a.id; a.ref = nx; a.st = "feedL"; return; }
          }
          a.carry = null; free(S, a);
        }
        return;
      case "toGroom": {
        const r = follow(S, a, S.F.room[a.tgt] || S.F.room[QUEEN_ROOM], sp);
        if (r < 0) return lost();
        if (r === 0) {
          a.st = "groom"; a.tm = 2 + rnd() * 2;
          if (b && !b.carried) { a.tx = b.x + (rnd() < 0.5 ? -1 : 1); a.ty = b.y - 0.2; }
          else { const p = slot(S, a.tgt); a.tx = p.x; a.ty = p.y - 0.2; }
        }
        return;
      }
      case "groom":
        a.tm -= TICK;
        if (moveTo(a, a.tx, a.ty, sp * 0.5)) { a.mv = false; a.hd += Math.sin(S.t * 3 + a.id) * 0.02; }
        if (a.tm <= 0) free(S, a);
        return;
      default: lost();
    }
  }

  // ---------------------------------------------------------------- やすみ・ふゆ
  function rest(S, a, sp) {
    switch (a.st) {
      case "idle": {
        const rooms = S.items.filter(it => it.usable && it.type !== "winter");
        a.tgt = rooms.length ? rooms[(rnd() * rooms.length) | 0].k : QUEEN_ROOM;
        a.st = "toRest"; return;
      }
      case "toRest": {
        const r = follow(S, a, S.F.room[a.tgt], sp * 0.7);
        if (r < 0) { a.tm = 1; a.st = "resting"; a.tx = a.x; a.ty = a.y; return; }
        if (r === 0) { const p = slot(S, a.tgt); a.tx = p.x; a.ty = p.y - 0.15; a.tm = 3 + rnd() * 5; a.st = "resting"; }
        return;
      }
      case "resting":
        a.tm -= TICK;
        if (moveTo(a, a.tx, a.ty, sp * 0.4)) a.mv = false;
        if (a.tm <= 0) free(S, a);
        return;
      default: free(S, a);
    }
  }

  function winterJob(S, a, sp) {
    switch (a.st) {
      case "idle": a.tgt = winterRoom(S); a.st = "toWinter"; return;
      case "toWinter": {
        const r = follow(S, a, S.F.room[a.tgt], sp * 0.6);
        if (r !== 1) { const p = slot(S, a.tgt); a.tx = p.x; a.ty = p.y - 0.2; a.st = r === 0 ? "winterGo" : "still"; }
        return;
      }
      case "winterGo":
        if (moveTo(a, a.tx, a.ty, sp * 0.5)) a.st = "still";
        return;
      case "still": a.mv = false; return;
      default: a.st = "idle";
    }
  }

  function alate(S, a, sp) {
    switch (a.st) {
      case "idle": a.tgt = roomOfType(S, "food") >= 0 ? storeRoom(S) : QUEEN_ROOM; a.st = "toRest"; return;
      case "toRest": {
        const r = follow(S, a, S.F.room[a.tgt], sp * 0.6);
        if (r !== 1) { const p = slot(S, a.tgt); a.tx = p.x; a.ty = p.y - 0.2; a.st = "wait"; }
        return;
      }
      case "wait":
        if (moveTo(a, a.tx, a.ty, sp * 0.3)) a.mv = false;
        if (S.flight && !S.winter && canGoOut(S)) a.st = "toExit";
        return;
      case "toExit":
        if (!canGoOut(S)) { a.st = "idle"; return; }
        if (follow(S, a, S.F.ent, sp) === 0) { a.st = "prefly"; a.tm = 1.5 + rnd() * 3; a.tx = EX + (rnd() * 2 - 1) * 6; }
        return;
      case "prefly":
        a.tm -= TICK;
        moveTo(a, a.tx, ROW + 0.7, sp * 0.6);
        if (a.tm <= 0) { a.st = "fly"; a.tm = 0; a.dir = rnd() < 0.5 ? -1 : 1; }
        return;
      case "fly":
        a.tm += TICK;
        a.y -= 5 * TICK;
        a.x += a.dir * (1.5 + Math.sin(a.tm * 3 + a.id)) * TICK * 2;
        a.hd = -Math.PI / 2 + a.dir * 0.4;
        a.ph += 1.2;
        if (a.y < -4) a.gone = true;
        return;
      default: a.st = "idle";
    }
  }

  function queen(S, a, sp) {
    if (a.layT > 0) a.layT -= TICK;
    if (S.winter) { a.mv = false; return; }
    a.tm -= TICK;
    if (a.st === "walk") { if (moveTo(a, a.tx, a.ty, sp)) a.st = "idle"; }
    else if (rnd() < 0.004) { const p = slot(S, QUEEN_ROOM); a.tx = p.x; a.ty = p.y - 0.4; a.st = "walk"; }
    else a.mv = false;
    if (a.tm > 0) return;
    a.tm = 8 / (1 + Math.min(S.food, 50) / 8);
    const nw = workers(S);
    if (S.food >= 1.5 && S.brood.length < 6 + nw * 0.5 && nw + S.brood.length < MAX_WORKERS + 20) {
      S.food -= 0.6;
      let al = null;
      if (S.alatePlan > 0) { al = S.alatePlan % 2 ? "male" : "gyne"; S.alatePlan--; }
      S.brood.push({ id: S.nextId++, stage: "egg", age: 0, fed: 0, lastFed: -99, room: QUEEN_ROOM,
        x: a.x - 1.6 + rnd() * 0.6, y: Math.min(a.y + 0.35, S.items[QUEEN_ROOM].c[1] + 3), carried: false, claim: 0, fclaim: 0, al });
      a.layT = 1.6;
    }
  }

  // ---------------------------------------------------------------- そだつ
  function updBrood(S) {
    if (S.winter) return;
    let nw = -1;
    for (let k = S.brood.length - 1; k >= 0; k--) {
      const b = S.brood[k];
      b.age += TICK;
      if (b.carried) continue;
      if (b.stage === "egg" && b.age >= 18) { b.stage = "larva"; b.age = 0; b.fed = 0; b.lastFed = S.t; }
      else if (b.stage === "larva" && b.age >= 20 && b.fed >= 3) { b.stage = "pupa"; b.age = 0; }
      else if (b.stage === "pupa" && b.age >= 22) {
        if (nw < 0) nw = workers(S);
        if (!b.al && nw >= MAX_WORKERS) continue;
        const a = makeAnt(S, b.al || "worker", b.x, b.y - 0.3);
        if (b.al) a.job = "alate";
        S.ants.push(a);
        b.dead = true;
        S.brood.splice(k, 1);
        if (!b.al) {
          nw++;
          S.rec.born++;
          if (!S.quiet) S.ev.push({ k: "born" });
          if (S.rec.born === 1) msg(S, "まゆから あたらしい はたらきありが でてきた！");
          badge(S, "born");
        } else msg(S, b.al === "male" ? "はねの ある オスが うまれたよ" : "はねの ある あたらしい じょおうが うまれたよ");
      }
    }
  }

  // ---------------------------------------------------------------- しごとの わりふり
  function alloc(S) {
    const ws = S.ants.filter(a => a.kind === "worker");
    const n = ws.length;
    if (!n) return;
    ws.sort((p, q) => p.age - q.age);
    const plan = new Array(n);
    if (S.winter) plan.fill("winter");
    else {
      const bc = S.brood.length;
      let nn = bc ? clamp(Math.ceil(bc / 3), 1, Math.max(1, Math.round(n * 0.45))) : 0;
      let dg = S.frontierCount && !S.rain ? clamp(Math.round(n * 0.3), 1, 40) : 0;
      if (S.plugs.length && !S.rain) dg = Math.max(dg, Math.min(n, 3));
      if (nn + dg > n) { dg = Math.max(0, n - nn); if (dg === 0 && n > 1) { nn = n - 1; dg = 1; } }
      const restN = n - nn - dg;
      let fg = 0;
      if (canGoOut(S)) {
        fg = Math.round(restN * (S.food > 80 ? 0.35 : S.foods.length || S.recruit > 0.5 ? 0.95 : 0.5));
        if (restN > 0) fg = Math.max(fg, 1);
        if (S.foods.length && n >= 4 && fg < 2) { fg = 2; if (nn + dg + fg > n) dg = Math.max(1, n - nn - fg); }
      }
      for (let i = 0; i < n; i++) plan[i] = "rest";
      for (let i = 0; i < nn; i++) plan[i] = "nurse";
      for (let i = 0; i < fg; i++) plan[n - 1 - i] = "forage";
      for (let i = nn, c = 0; i < n && c < dg; i++) if (plan[i] === "rest") { plan[i] = "dig"; c++; }
    }
    for (let i = 0; i < n; i++) {
      const a = ws[i], want = plan[i];
      if (a.job === want) { a.nj = null; continue; }
      if (a.job === "rest" || a.st === "idle" || want === "winter") {
        if (want === "winter") dropAll(S, a);
        a.job = want; a.nj = null; a.st = "idle"; a.ref = null; a.tgt = -1;
      } else a.nj = want;
    }
  }

  function dropAll(S, a) {
    const b = a.ref;
    if (b && typeof b === "object" && "stage" in b) {
      if (b.claim === a.id) b.claim = 0;
      if (b.fclaim === a.id) b.fclaim = 0;
      if (a.carry === "brood") {
        b.carried = false;
        const k = roomAt(S, a.x, a.y);
        b.room = k >= 0 ? k : b.room;
        b.x = a.x; b.y = a.y + 0.3;
      }
    }
    if (a.carry === "feed") S.food += 0.7;
    if (a.carry && FOODS[a.carry]) S.food += a.cv;
    a.carry = null; a.cv = 0; a.ref = null;
  }

  // ---------------------------------------------------------------- できごと
  function startRain(S) {
    if (S.rain || S.winter) return false;
    S.rain = { t: 0, dur: 25, plugged: false };
    msg(S, "あめが ふってきた！ そとの ありは いそいで すへ かえるよ");
    S.ev.push({ k: "rain" });
    for (const a of S.ants) if (a.kind === "worker" && a.job === "forage" && ["search", "toFood", "eat", "toExit"].includes(a.st)) a.st = a.carry ? "return" : "goHome";
    return true;
  }
  function updRain(S) {
    const R = S.rain;
    R.t += TICK;
    for (let x = 0; x < GW; x++) S.pher[ROW * GW + x] *= 0.97;
    if (!R.plugged && R.t >= 4) {
      R.plugged = true;
      for (let y = SURF; y <= SURF + 1; y++) for (let x = EX - 2; x <= EX + 2; x++) {
        const i = y * GW + x;
        if (S.cell[i] === T_EMPTY) { S.cell[i] = T_PLUG; S.plugs.push(i); S.dug.push(i); }
      }
      if (S.plugs.length) {
        S.wasPlugged = true; S.dirty = true;
        for (const a of S.ants) if ((a.y | 0) >= SURF && (a.y | 0) <= SURF + 1 && Math.abs(a.x - EX - 0.5) < 3) a.y = SURF + 2.5;
        msg(S, "ありが つちで いりぐちを ふさいだよ。すの なかに みずが はいらない ように")
      }
    }
    if (R.t >= R.dur) {
      S.rain = null;
      S.dirty = true;
      msg(S, S.plugs.length ? "あめが やんだ。こんどは いりぐちを ほって あけるよ" : "あめが やんだ");
    }
  }

  function spawnHazard(S, type) {
    if (S.winter || S.hazards.length >= 2) return false;
    type = type || (rnd() < 0.5 ? "spider" : "antlion");
    let x;
    for (let k = 0; k < 20; k++) { x = 8 + rnd() * (GW - 16); if (Math.abs(x - EX) > 12) break; }
    if (type === "spider") {
      const from = x < GW / 2 ? -4 : GW + 4;
      S.hazards.push({ type, x, cx: from, r: 5, t: 0, dur: 30 });
      msg(S, "クモが きた！ ありは ちかづかない ように よけて いるよ");
    } else {
      S.hazards.push({ type, x, cx: x, r: 4, t: 0, dur: 50 });
      msg(S, "すなに アリジゴクの すが できた。ありは よけて とおるよ");
    }
    return true;
  }
  function updHazards(S) {
    for (let k = S.hazards.length - 1; k >= 0; k--) {
      const h = S.hazards[k];
      h.t += TICK;
      if (h.type === "spider") {
        const out = h.t > h.dur;
        const target = out ? (h.x < GW / 2 ? -6 : GW + 6) : h.x + Math.sin(h.t * 0.5) * 3;
        h.cx += clamp(target - h.cx, -3 * TICK, 3 * TICK);
        if (out && (h.cx < -5 || h.cx > GW + 5)) { S.hazards.splice(k, 1); msg(S, "クモは どこかへ いったよ"); }
      } else if (h.t > h.dur) { S.hazards.splice(k, 1); msg(S, "アリジゴクの すは かぜで うまったよ"); }
    }
  }

  function setSeason(S, idx) {
    const prev = S.season;
    S.season = idx; S.seasonT = 0;
    const was = S.winter;
    S.winter = SEASONS[idx].id === "winter";
    if (S.winter && !was) {
      S.rain = null;
      S.hazards.length = 0;
      S.wasPlugged = false;
      for (const i of S.plugs.slice()) setEmpty(S, i);
      msg(S, "ふゆが きた。ありは ふかい へやに あつまって じっと するよ");
      S.ev.push({ k: "winter" });
      for (const a of S.ants) {
        if (a.kind === "worker") { dropAll(S, a); a.job = "winter"; a.nj = null; a.st = "idle"; }
        else if (a.kind !== "queen" && a.st !== "fly") a.st = "idle";
      }
      S.hadWinter = true;
    }
    if (!S.winter && was) {
      if (idx === 0 && prev === 3) S.year++;
      msg(S, "はるだ！ ありたちが また うごきだしたよ");
      S.ev.push({ k: "spring" });
      if (S.hadWinter) badge(S, "winter");
      for (const a of S.ants) if (a.kind === "worker") { a.job = "rest"; a.nj = null; a.st = "idle"; }
      alloc(S);
    }
    if (idx === 0 && workers(S) >= 40 && !S.alatePlan) S.alatePlan = 6;
  }

  function updSeason(S) {
    S.seasonT += TICK;
    if (S.seasonT >= SEASONS[S.season].len) setSeason(S, (S.season + 1) % 4);
    const sid = SEASONS[S.season].id;
    if (sid === "summer" && S.seasonT > 30 && S.flightYear !== S.year && !S.rain) {
      if (S.ants.some(a => a.kind === "male" || a.kind === "gyne")) {
        S.flightYear = S.year; S.flight = true;
        msg(S, "けっこんひこう！ はねの ある オスと じょおうが そらへ とびたつよ");
        S.ev.push({ k: "flight" });
        badge(S, "flight");
      }
    }
    if (sid !== "summer") S.flight = false;
  }

  function placeFood(S, x, type) {
    if (!FOODS[type]) return "bad";
    x = clamp(x, 3, GW - 4);
    if (Math.abs(x - EX - 0.5) < 3) x = EX + 0.5 + (x < EX + 0.5 ? -3 : 3);
    if (S.foods.length >= 8) S.foods.shift();
    S.foods.push({ x, type, amount: FOODS[type].amount, max: FOODS[type].amount, found: false });
    S.ev.push({ k: "place" });
    if (S.winter) return "winter";
    if (S.rain) return "rain";
    return "ok";
  }

  function updateRecords(S) {
    const nw = workers(S);
    const rooms = S.items.filter(it => it.usable).length;
    S.rec.maxAnts = Math.max(S.rec.maxAnts, nw);
    S.rec.maxRooms = Math.max(S.rec.maxRooms, rooms);
    if (nw >= 30) badge(S, "ants30");
    if (nw >= 100) badge(S, "ants100");
    if (nw >= 300) badge(S, "ants300");
    if (rooms >= 3) badge(S, "rooms3");
    if (rooms >= ROOM_TOTAL) badge(S, "roomsAll");
    for (const it of S.items) if (!it.unlocked && nw >= it.need) { it.unlocked = true; S.dirty = true; }
  }

  function countLine(S) {
    let n = 0;
    for (const a of S.ants) {
      if (a.kind !== "worker" || a.job !== "forage" || !onSurface(a)) continue;
      if (!["search", "toFood", "eat", "return"].includes(a.st)) continue;
      if (S.pher[ROW * GW + (a.x | 0)] > 0.4) n++;
    }
    S.lineN = n;
    S.rec.lineMax = Math.max(S.rec.lineMax, n);
    if (n >= 6 && !S.badges.line) {
      badge(S, "line");
      msg(S, "ぎょうれつが できた！ においの みちを たどって あつまって いるよ");
    }
  }

  // ---------------------------------------------------------------- 1チック
  function step(S) {
    S.t += TICK; S.tick++; S.rec.playT += TICK;
    if (S.dirty && S.tick - S.lastField >= 4) recomputeFields(S);
    updSeason(S);
    if (S.rain) updRain(S);
    updHazards(S);
    if (!S.winter) {
      S.nextRandom -= TICK;
      if (S.nextRandom <= 0) {
        S.nextRandom = 80 + rnd() * 70;
        const r = rnd();
        if (r < 0.35) startRain(S); else if (r < 0.65) spawnHazard(S);
      }
      S.nextNatural -= TICK;
      if (S.nextNatural <= 0) {
        S.nextNatural = 25 + rnd() * 20;
        if (!S.foods.length && rnd() < 0.6) {
          let x = 0;
          for (let k = 0; k < 10; k++) { x = 6 + rnd() * (GW - 12); if (Math.abs(x - EX) > 10) break; }
          S.foods.push({ x, type: "mini", amount: FOODS.mini.amount, max: FOODS.mini.amount, found: false });
        }
      }
    }
    for (const a of S.ants) {
      a.px = a.x; a.py = a.y; a.mv = false;
      if (a.alert > 0) a.alert -= TICK;
      const sp = speed(S, a);
      if (a.kind === "queen") { queen(S, a, sp); continue; }
      if (a.kind !== "worker") { alate(S, a, sp); continue; }
      a.age += TICK;
      switch (a.job) {
        case "forage": forage(S, a, sp); break;
        case "dig": dig(S, a, sp); break;
        case "nurse": nurse(S, a, sp); break;
        case "winter": winterJob(S, a, sp); break;
        default: rest(S, a, sp);
      }
      if (a.carry === "brood" && a.ref) {
        a.ref.x = a.x + Math.cos(a.hd) * 1.6; a.ref.y = a.y + Math.sin(a.hd) * 1.6;
      }
    }
    if (S.ants.some(a => a.gone)) S.ants = S.ants.filter(a => !a.gone);
    updBrood(S);
    if (S.tick % 3 === 0) {
      const p = S.pher;
      for (let i = 0; i < p.length; i++) if (p[i] > 0) { p[i] *= EVAP; if (p[i] < 0.01) p[i] = 0; }
    }
    if (S.tick % 15 === 0) countLine(S);
    if (S.tick % 30 === 0) {
      const nw = workers(S);
      S.food = Math.max(0, S.food - nw * (S.winter ? 0.0003 : 0.0015));
      S.recruit *= 0.9;
      updateRecords(S);
    }
    if (S.tick % 60 === 1) alloc(S);
  }

  // ---------------------------------------------------------------- タップ・ことば
  function antAt(S, x, y, r) {
    let best = null, bd = r * r;
    for (const a of S.ants) {
      const dx = a.x - x, dy = a.y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

  const STAGE_NAME = { egg: "たまご", larva: "ようちゅう", pupa: "さなぎ" };
  function stateText(S, a) {
    if (a.kind === "queen") {
      if (S.winter) return "ふゆの あいだは じっと してる";
      return a.layT > 0 ? "たまごを うんでる" : "じょおうの へやで やすんでる";
    }
    if (a.kind === "male" || a.kind === "gyne") {
      if (a.st === "fly") return "とんでる！ けっこんひこう";
      if (a.st === "prefly") return "とびたつ じゅんび";
      return "けっこんひこうの ひを まってる";
    }
    if (a.wait) return S.rain && onSurface(a) ? "あまやどり してる" : "みちが ふさがってて まってる";
    const b = a.ref && typeof a.ref === "object" && a.ref.stage ? a.ref : null;
    const bn = b ? STAGE_NAME[b.stage] : "たまご";
    switch (a.job) {
      case "forage":
        switch (a.st) {
          case "toExit": return "そとへ えさを さがしに いく";
          case "search": return S.pher[ROW * GW + (a.x | 0)] > 0.4 ? "においの みちを たどってる" : "えさを さがしてる";
          case "toFood": return "えさに むかってる";
          case "eat": return "えさを かじって とってる";
          case "return": return "えさを はこんでる（においを のこしながら）";
          case "store": return "えさを えさの へやに おいてる";
          case "goHome": return "すに かえってる";
          case "pause": return "ひとやすみ";
        }
        return "えさを さがしてる";
      case "dig":
        switch (a.st) {
          case "dig": return "ほってる（さくさく）";
          case "carryOut": return "つちの つぶを そとへ はこんでる";
          case "dump": return "つちを すの そとに すてる";
        }
        return "ほる ばしょへ いく";
      case "nurse":
        switch (a.st) {
          case "toBrood": return bn + "を むかえに いく";
          case "pickB": case "carryB": case "placeB": return bn + "を はこんでる（せわ）";
          case "getFood": return "ようちゅうの ごはんを とりに いく";
          case "toLarva": case "feedL": case "feeding": return "ようちゅうに ごはんを あげてる（せわ）";
        }
        return "せわ してる（なめて きれいに する）";
      case "winter": return "ふゆごし。じっと してる";
    }
    return "やすんでる";
  }

  function stats(S) {
    const st = { workers: 0, males: 0, gynes: 0, egg: 0, larva: 0, pupa: 0 };
    for (const a of S.ants) { if (a.kind === "worker") st.workers++; else if (a.kind === "male") st.males++; else if (a.kind === "gyne") st.gynes++; }
    for (const b of S.brood) st[b.stage]++;
    st.rooms = S.items.filter(it => it.usable).length;
    st.roomTotal = ROOM_TOTAL;
    st.food = S.food;
    st.season = SEASONS[S.season].name;
    st.seasonId = SEASONS[S.season].id;
    st.line = S.lineN;
    return st;
  }

  // ---------------------------------------------------------------- ほぞん
  const JOBS = ["rest", "forage", "dig", "nurse", "winter", "queen", "alate"];
  const KINDS = ["worker", "queen", "male", "gyne"];
  const STAGES = ["egg", "larva", "pupa"];

  function serialize(S) {
    const dug = [];
    let cur = 0, run = 0;
    for (let i = SURF * GW; i < GW * GH; i++) {
      const v = S.cell[i] === T_EMPTY ? 1 : 0;
      if (v === cur) run++; else { dug.push(run); cur = v; run = 1; }
    }
    dug.push(run);
    let food = S.food;
    for (const a of S.ants) { if (a.carry === "feed") food += 0.7; else if (a.carry && FOODS[a.carry]) food += a.cv; }
    return {
      v: 1, species: S.species, seed: S.seed, t: Math.round(S.t), season: S.season, seasonT: Math.round(S.seasonT),
      year: S.year, food: Math.round(food * 10) / 10, mound: S.mound, dug: dug.join(","), plugs: S.plugs,
      unlocked: S.items.map(it => (it.unlocked ? 1 : 0)).join(""),
      ants: S.ants.filter(a => a.st !== "fly").map(a => [KINDS.indexOf(a.kind), Math.round(a.x * 10), Math.round(a.y * 10), JOBS.indexOf(a.job), Math.round(a.age)]),
      brood: S.brood.map(b => [STAGES.indexOf(b.stage), Math.round(b.age), b.fed, b.room, b.al === "male" ? 1 : b.al === "gyne" ? 2 : 0, Math.round(b.x * 10), Math.round(b.y * 10)]),
      foods: S.foods.map(f => [Math.round(f.x * 10) / 10, f.type, f.amount, f.found ? 1 : 0]),
      badges: S.badges, rec: S.rec, foodsTried: S.foodsTried, avoid: S.avoid, alatePlan: S.alatePlan,
      flightYear: S.flightYear, hadWinter: S.hadWinter, nextRandom: Math.round(S.nextRandom), wasPlugged: S.wasPlugged,
      savedAt: Date.now(),
    };
  }

  function deserialize(o) {
    if (!o || o.v !== 1 || typeof o.dug !== "string") return null;
    const S = create(o.species, o.seed);
    S.ants.length = 0; S.brood.length = 0;
    // ほった ところ
    const runs = o.dug.split(",").map(Number);
    let i = SURF * GW, v = 0;
    S.loading = true;
    for (const r of runs) {
      for (let k = 0; k < r && i < GW * GH; k++, i++) {
        if (v === 1 && S.cell[i] === T_SOIL) setEmpty(S, i);
        else if (v === 0 && S.cell[i] === T_EMPTY) S.cell[i] = T_SOIL;
      }
      v ^= 1;
    }
    // ふさいでいた ところ を もどす。あとで ありが ほって あける
    for (const p of o.plugs || []) if (S.cell[p] === T_EMPTY) { S.cell[p] = T_PLUG; S.plugs.push(p); }
    S.items.forEach(it => { it.dug = 0; it.rdug = 0; });
    for (let j = 0; j < GW * GH; j++) {
      const k = S.plan[j];
      if (k >= 0 && S.cell[j] === T_EMPTY) { const it = S.items[k]; it.dug++; if (S.inRoom[j] === k) it.rdug++; }
    }
    S.items.forEach((it, k) => { it.usable = !!it.type && it.rdug >= it.rcells * 0.85; it.unlocked = it.unlocked || o.unlocked[k] === "1"; });
    S.items[QUEEN_ROOM].usable = true;
    S.loading = false;
    S.dug.length = 0;
    Object.assign(S, {
      t: o.t || 0, season: o.season || 0, seasonT: o.seasonT || 0, year: o.year || 1, food: o.food || 0,
      mound: o.mound || [0, 0], badges: o.badges || {}, rec: Object.assign(S.rec, o.rec || {}),
      foodsTried: o.foodsTried || {}, avoid: o.avoid || 0, alatePlan: o.alatePlan || 0, flightYear: o.flightYear || 0,
      hadWinter: !!o.hadWinter, nextRandom: o.nextRandom || 120, wasPlugged: !!o.wasPlugged,
    });
    S.winter = SEASONS[S.season].id === "winter";
    S.dirty = true;
    recomputeFields(S);
    for (const r of o.ants || []) {
      const a = makeAnt(S, KINDS[r[0]] || "worker", r[1] / 10, r[2] / 10);
      a.job = JOBS[r[3]] || "rest"; a.age = r[4] || 0;
      if (a.kind === "worker" && a.job === "queen") a.job = "rest";
      S.ants.push(a);
    }
    if (!S.ants.some(a => a.kind === "queen")) { const p = slot(S, QUEEN_ROOM); S.ants.push(makeAnt(S, "queen", p.x, p.y)); }
    for (const r of o.brood || []) {
      const room = S.items[r[3]] && S.items[r[3]].usable ? r[3] : QUEEN_ROOM;
      S.brood.push({ id: S.nextId++, stage: STAGES[r[0]] || "egg", age: r[1] || 0, fed: r[2] || 0, lastFed: -99, room,
        x: r[5] / 10, y: r[6] / 10, carried: false, claim: 0, fclaim: 0, al: r[4] === 1 ? "male" : r[4] === 2 ? "gyne" : null });
    }
    for (const f of o.foods || []) if (FOODS[f[1]]) S.foods.push({ x: f[0], type: f[1], amount: f[2], max: FOODS[f[1]].amount, found: !!f[3] });
    S.savedAt = o.savedAt || Date.now();
    alloc(S);
    return S;
  }

  ARI.Sim = {
    GW, GH, SURF, ROW, EX, TICK, MAX_WORKERS, SEASONS, PLAN, ROOM_NAME, FOODS, ROOM_TOTAL,
    T_EMPTY, T_SOIL, T_ROCK, T_PLUG, T_SKY, PMAX,
    create, step, placeFood, startRain, spawnHazard, setSeason, antAt, stateText, stats,
    serialize, deserialize, badge, workers, makeAnt, slot, alloc,
  };
})();
