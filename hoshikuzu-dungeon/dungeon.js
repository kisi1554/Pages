/* ほしくず ダンジョン — ちず の せいせい と ターン の しくみ（DOM なし。node でも ブラウザ でも うごく）
 *
 *   const g = HD.newGame(seed);           // 1かい から はじめる
 *   HD.step(g, { type: "move", dir: [1, 0] });   // 1て すすむ → まもの も 1て うごく
 *   HD.step(g, { type: "wait" });         // その ばで 1て まつ
 *   HD.useItem(g, i); HD.useFriend(g, i); // もちもの・なかま（ターン は つかわない）
 *   if (g.atStairs) HD.descend(g);        // した の かい へ
 */
(function (root, factory) {
  const D = factory();
  if (typeof module === "object" && module.exports) module.exports = D; else root.HD = D;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const W = 25, H = 19, N = W * H, FLOORS = 10, MAX_ITEMS = 5, MAX_FRIENDS = 3;
  const WALL = 0, FLOOR = 1, STAIRS = 2, ICE = 3, DOOR = 4, OPEN = 5, SWITCH = 6, WARP = 7, CRACK = 8, TRAP = 9, GOAL = 10;
  //               W  F  S  I  D  O  Sw Wp C  T  G
  const PASS =    [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1]; // じぶん が とおれる
  const MPASS =   [0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0]; // まもの が とおれる（かいだん・ワープ には のらない）
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const K = (x, y) => y * W + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

  const MONS = {
    fuwa: { name: "ふわりん", emoji: "👻", intro: 1, move: "たて か よこ に いったり きたり", befriend: "🍬 あめ を となり で わたす", item: "candy" },
    noro: { name: "のろりん", emoji: "🐌", intro: 2, move: "おなじ へや に いると おいかけて くる。でも 2て に 1かい しか うごかない", befriend: "🍃 はっぱ を となり で わたす", item: "leaf" },
    goro: { name: "ごろた", emoji: "🪨", intro: 3, move: "まっすぐ ころがって、かべ で とまる", befriend: "ころがって くる まえ に たつ と あいさつ", item: null },
    pata: { name: "ぱたこ", emoji: "🦇", intro: 4, move: "2マス ずつ ななめ に とぶ", befriend: "🏮 ランタン の あかり で ねむらせる", item: "lantern" },
    mane: { name: "まねっこ", emoji: "🦊", intro: 5, move: "じぶん と おなじ むき に うごく", befriend: "🪞 かがみ を ちかく で みせる", item: "mirror" },
  };
  const ITEMS = {
    candy: { name: "あめ", emoji: "🍬" },
    leaf: { name: "はっぱ", emoji: "🍃" },
    lantern: { name: "ランタン", emoji: "🏮" },
    mirror: { name: "かがみ", emoji: "🪞" },
    map: { name: "ちず の かけら", emoji: "🗺️" },
    wing: { name: "はね", emoji: "🪽" },
  };
  const HELP = {
    fuwa: "わな を おしえる",
    noro: "ハート を 1つ かいふく",
    goro: "まえ の かべ を こわす",
    pata: "かいだん の ばしょ を おしえる",
    mane: "まもの を 3て とめる",
  };

  /* ---------- らんすう（シード つき） ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash() {
    let h = 2166136261;
    for (let i = 0; i < arguments.length; i++) { h ^= arguments[i] | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; }
    return h >>> 0;
  }
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  function shuffle(r, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- いどう（すべる ゆか・ワープ こみ） ---------- */
  function passable(f, x, y) { return inb(x, y) && PASS[f.grid[K(x, y)]] === 1; }

  // (x,y) から (dx,dy) へ 1て。すべる ゆか なら とまる まで すべり、ワープ に のれば とぶ。
  // blocked(x,y) は まもの など の じゃま。うごけない ときは null。
  function slideFrom(f, rocks, x, y, dx, dy, blocked) {
    let nx = x + dx, ny = y + dy;
    if (!passable(f, nx, ny) || rocks.has(K(nx, ny)) || (blocked && blocked(nx, ny))) return null;
    const path = [K(nx, ny)];
    while (f.grid[K(nx, ny)] === ICE) {
      const tx = nx + dx, ty = ny + dy;
      if (!passable(f, tx, ty) || rocks.has(K(tx, ty)) || (blocked && blocked(tx, ty))) break;
      nx = tx; ny = ty; path.push(K(nx, ny));
    }
    let warped = false;
    if (f.grid[K(nx, ny)] === WARP && f.warps) {
      const here = K(nx, ny), o = f.warps[0] === here ? f.warps[1] : f.warps[0];
      if (!(blocked && blocked(o % W, (o / W) | 0))) { nx = o % W; ny = (o / W) | 0; warped = true; }
    }
    return { x: nx, y: ny, path, warped };
  }

  // とどく か しらべる: start から いける マス（reach）と、そこ から かならず target に もどれる か（ok）。
  // いわ・とびら・ひび の かべ は かべ として あつかう（うごかさなくても かいだん に いける こと）。
  function analyze(f, rocks, startK, targetK) {
    const reach = new Uint8Array(N), radj = new Array(N);
    const q = [startK]; reach[startK] = 1;
    for (let qi = 0; qi < q.length; qi++) {
      const k = q[qi], x = k % W, y = (k / W) | 0;
      if (k === targetK) continue;
      for (let d = 0; d < 4; d++) {
        const r = slideFrom(f, rocks, x, y, DIRS[d][0], DIRS[d][1]);
        if (!r) continue;
        const nk = K(r.x, r.y);
        (radj[nk] || (radj[nk] = [])).push(k);
        if (!reach[nk]) { reach[nk] = 1; q.push(nk); }
      }
    }
    const dist = new Int16Array(N).fill(-1);
    if (!reach[targetK]) return { ok: false, reach, dist };
    const q2 = [targetK]; dist[targetK] = 0;
    for (let qi = 0; qi < q2.length; qi++) {
      const k = q2[qi], ps = radj[k];
      if (!ps) continue;
      for (const p of ps) if (dist[p] < 0) { dist[p] = dist[k] + 1; q2.push(p); }
    }
    let ok = true;
    for (let k = 0; k < N; k++) if (reach[k] && dist[k] < 0) { ok = false; break; }
    return { ok, reach, dist };
  }

  function plainDist(f, from) {
    const dist = new Int16Array(N).fill(-1), q = [from]; dist[from] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const k = q[qi], x = k % W, y = (k / W) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!passable(f, nx, ny)) continue;
        const nk = K(nx, ny);
        if (dist[nk] < 0) { dist[nk] = dist[k] + 1; q.push(nk); }
      }
    }
    return dist;
  }

  /* ---------- ちず を つくる ---------- */
  function blankFloor(n, seed) {
    return {
      n, seed, w: W, h: H,
      grid: new Uint8Array(N), roomId: new Int16Array(N).fill(-1), corr: new Uint8Array(N), doorCell: new Uint8Array(N),
      rooms: [], start: 0, target: 0, targetRoom: -1, warps: null, doors: [], switchK: -1, switchOn: false,
      traps: new Set(), trapKnown: new Set(), stars: new Set(), items: new Map(),
      rocksInit: [], monsInit: [], nooks: [], seen: new Uint8Array(N), lantern: false, starTotal: 0,
    };
  }

  // へや の マス で、つうろ（へや の そと の ゆか）に となりあう ところ と、ちいさな へや の まえ
  function markDoorCells(f) {
    f.doorCell.fill(0);
    for (let k = 0; k < N; k++) {
      if (f.roomId[k] < 0) continue;
      const x = k % W, y = (k / W) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (inb(nx, ny) && f.grid[K(nx, ny)] !== WALL && f.roomId[K(nx, ny)] < 0) { f.doorCell[k] = 1; break; }
      }
    }
    f.nooks.forEach((nk) => { f.doorCell[nk.o] = 1; });
  }

  function genFloor(seed, n) {
    for (let a = 0; a < 400; a++) {
      const f = tryGen(seed, n, a);
      if (f) return f;
    }
    throw new Error("ちず が つくれない: seed=" + seed + " n=" + n);
  }

  function tryGen(seed, n, attempt) {
    const r = rng(hash(seed, n, attempt, 0x5f3d));
    const f = blankFloor(n, seed);
    const g = f.grid;
    const maxRooms = 5 + Math.min(4, n >> 1);
    const rooms = f.rooms;
    for (let t = 0; t < 400 && rooms.length < maxRooms; t++) {
      const w = ri(r, 3, 6), h = ri(r, 3, 5);
      const x = ri(r, 1, W - w - 1), y = ri(r, 1, H - h - 1);
      if (rooms.some((o) => x < o.x + o.w + 2 && x + w + 2 > o.x && y < o.y + o.h + 2 && y + h + 2 > o.y)) continue;
      rooms.push({ x, y, w, h });
    }
    if (rooms.length < 4) return null;
    rooms.forEach((rm, i) => {
      for (let yy = rm.y; yy < rm.y + rm.h; yy++) for (let xx = rm.x; xx < rm.x + rm.w; xx++) { g[K(xx, yy)] = FLOOR; f.roomId[K(xx, yy)] = i; }
    });
    const cen = (rm) => [rm.x + (rm.w >> 1), rm.y + (rm.h >> 1)];
    const carve = (x, y) => { const k = K(x, y); if (g[k] === WALL) { g[k] = FLOOR; f.corr[k] = 1; } };
    const link = (A, B) => {
      let [x, y] = cen(A); const [x2, y2] = cen(B);
      if (r() < 0.5) {
        while (x !== x2) { carve(x, y); x += Math.sign(x2 - x); }
        while (y !== y2) { carve(x, y); y += Math.sign(y2 - y); }
      } else {
        while (y !== y2) { carve(x, y); y += Math.sign(y2 - y); }
        while (x !== x2) { carve(x, y); x += Math.sign(x2 - x); }
      }
      carve(x, y);
    };
    const con = [0], rest = rooms.map((_, i) => i).slice(1);
    while (rest.length) {
      let best = null;
      for (const i of rest) for (const j of con) {
        const [ax, ay] = cen(rooms[i]), [bx, by] = cen(rooms[j]);
        const d = Math.abs(ax - bx) + Math.abs(ay - by);
        if (!best || d < best.d) best = { i, j, d };
      }
      link(rooms[best.j], rooms[best.i]);
      con.push(best.i); rest.splice(rest.indexOf(best.i), 1);
    }
    for (let e = 0; e < 1 + (n > 4 ? 1 : 0); e++) {
      const i = ri(r, 0, rooms.length - 1), j = ri(r, 0, rooms.length - 1);
      if (i !== j) link(rooms[i], rooms[j]);
    }

    // いりぐち と かいだん（いちばん とおい へや）
    const r0 = rooms[0];
    f.start = K(ri(r, r0.x, r0.x + r0.w - 1), ri(r, r0.y, r0.y + r0.h - 1));
    let dist = plainDist(f, f.start);
    let far = -1, farD = -1;
    rooms.forEach((rm, i) => { if (i === 0) return; const d = dist[K(...cen(rm))]; if (d > farD) { farD = d; far = i; } });
    if (far < 0) return null;
    const tr = rooms[far];
    f.targetRoom = far;
    f.target = K(ri(r, tr.x, tr.x + tr.w - 1), ri(r, tr.y, tr.y + tr.h - 1));
    g[f.target] = n >= FLOORS ? GOAL : STAIRS;

    const check = () => analyze(f, new Set(f.rocksInit), f.start, f.target);
    let A = check();
    if (!A.ok) return null;
    const isFree = (k) => A.reach[k] && g[k] === FLOOR && k !== f.start && !f.rocksInit.includes(k) && !f.stars.has(k) && !f.items.has(k);
    const roomCells = (pred) => { const out = []; for (let k = 0; k < N; k++) if (pred(k)) out.push(k); return out; };
    const nearStart = (k) => cheb(k % W, (k / W) | 0, f.start % W, (f.start / W) | 0) <= 1;

    // ❄️ すべる ゆか（へや ひとつ が こおる。とまれる マス を すこし のこす）
    if (n >= 3 && r() < 0.75) {
      const cands = rooms.map((_, i) => i).filter((i) => i !== 0 && i !== far && rooms[i].w >= 3 && rooms[i].h >= 3);
      if (cands.length) {
        const rm = rooms[pick(r, cands)], changed = [];
        for (let yy = rm.y; yy < rm.y + rm.h; yy++) for (let xx = rm.x; xx < rm.x + rm.w; xx++) {
          const k = K(xx, yy);
          if (g[k] === FLOOR && r() < 0.85) { g[k] = ICE; changed.push(k); }
        }
        const B = check();
        if (B.ok) A = B; else changed.forEach((k) => { g[k] = FLOOR; });
      }
    }

    // くっついた ちいさな へや（いわ・とびら・ひみつ）
    const attach = (kind) => {
      for (let t = 0; t < 300; t++) {
        const w = 3, h = 3, x = ri(r, 2, W - w - 2), y = ri(r, 2, H - h - 2);
        let ok = true;
        for (let yy = y - 1; yy <= y + h && ok; yy++) for (let xx = x - 1; xx <= x + w; xx++) if (g[K(xx, yy)] !== WALL) { ok = false; break; }
        if (!ok) continue;
        const sides = shuffle(r, [[x + 1, y - 1, 0, 1], [x + w, y + 1, -1, 0], [x + 1, y + h, 0, -1], [x - 1, y + 1, 1, 0]]);
        for (const [ex, ey, dx, dy] of sides) {
          const ox = ex - dx, oy = ey - dy, ok2 = K(ox, oy);
          if (!inb(ox, oy) || g[ok2] !== FLOOR || !A.reach[ok2] || f.rocksInit.includes(ok2) || ok2 === f.start) continue;
          const id = rooms.length;
          const nook = { x, y, w, h, nook: kind, e: K(ex, ey), o: ok2, dx, dy };
          rooms.push(nook);
          for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { g[K(xx, yy)] = FLOOR; f.roomId[K(xx, yy)] = id; }
          f.nooks.push(nook);
          return nook;
        }
      }
      return null;
    };
    const corners = (nk) => [K(nk.x, nk.y), K(nk.x + 2, nk.y), K(nk.x, nk.y + 2), K(nk.x + 2, nk.y + 2)];
    const randItem = (list) => pick(r, list);

    if (n >= 2 && r() < 0.8) { // 🪨 おす いわ: いりぐち を いわ が ふさいで いる
      const nk = attach("rock");
      if (nk) {
        g[nk.e] = FLOOR; f.rocksInit.push(nk.e);
        const cs = shuffle(r, corners(nk));
        cs.slice(0, 3).forEach((k) => f.stars.add(k));
        f.items.set(cs[3], randItem(["candy", "leaf", "wing", "map"]));
      }
    }
    if (n >= 4 && r() < 0.8) { // 🔘 スイッチ と とびら
      const cands = roomCells((k) => isFree(k) && f.roomId[k] >= 0 && !rooms[f.roomId[k]].nook && f.roomId[k] !== 0 && !f.corr[k]);
      if (cands.length) {
        const nk = attach("door");
        if (nk) {
          g[nk.e] = DOOR; f.doors.push(nk.e);
          const sw = pick(r, cands.filter((k) => k !== nk.o));
          if (sw !== undefined) {
            g[sw] = SWITCH; f.switchK = sw;
            const cs = shuffle(r, corners(nk).concat([K(nk.x + 1, nk.y + 1)]));
            cs.slice(0, 3).forEach((k) => f.stars.add(k));
            f.items.set(cs[3], randItem(["map", "wing", "lantern", "mirror", "candy"]));
          } else { g[nk.e] = WALL; f.doors.pop(); }
        }
      }
    }
    if (n >= 2 && r() < 0.6) { // 🧱 ひみつ の へや: ひび の はいった かべ に ぶつかる と あく
      const nk = attach("secret");
      if (nk) {
        g[nk.e] = CRACK;
        const cs = shuffle(r, corners(nk).concat([K(nk.x + 1, nk.y + 1)]));
        cs.slice(0, 4).forEach((k) => f.stars.add(k));
        f.items.set(cs[4], randItem(["wing", "map"]));
      }
    }
    A = check();
    if (!A.ok) return null;

    // 🪨 ころがせる いわ（へや の なか）
    if (n >= 2) {
      const cnt = ri(r, 0, 2);
      for (let c = 0; c < cnt; c++) {
        const cands = roomCells((k) => isFree(k) && f.roomId[k] >= 0 && !rooms[f.roomId[k]].nook && !f.corr[k] && !nearStart(k));
        if (!cands.length) break;
        const k = pick(r, cands);
        f.rocksInit.push(k);
        const B = check();
        if (B.ok) A = B; else f.rocksInit.pop();
      }
    }
    // 🌀 ワープ の あな
    if (n >= 5 && r() < 0.75) {
      const cands = roomCells((k) => isFree(k) && f.roomId[k] > 0 && f.roomId[k] !== far && !rooms[f.roomId[k]].nook && !f.corr[k]);
      if (cands.length >= 2) {
        const a = pick(r, cands), b = pick(r, cands.filter((k) => f.roomId[k] !== f.roomId[a]));
        if (b !== undefined) {
          g[a] = WARP; g[b] = WARP; f.warps = [a, b];
          const B = check();
          if (B.ok) A = B; else { g[a] = FLOOR; g[b] = FLOOR; f.warps = null; }
        }
      }
    }
    // 🕸️ かくれた わな（つうろ に。ふむ と 1かい うごけない）
    if (n >= 3) {
      const cnt = 1 + (n >= 6 ? 1 : 0) + (n >= 9 ? 1 : 0);
      for (let c = 0; c < cnt; c++) {
        const cands = roomCells((k) => isFree(k) && f.corr[k] && cheb(k % W, (k / W) | 0, f.start % W, (f.start / W) | 0) > 3 && !f.nooks.some((nk) => nk.o === k));
        if (!cands.length) break;
        const k = pick(r, cands);
        g[k] = TRAP; f.traps.add(k);
      }
    }
    A = check();
    if (!A.ok) return null;

    // ⭐ ほしくず
    const nStars = 6 + (n >> 1);
    for (let c = 0; c < nStars; c++) {
      const cands = roomCells((k) => isFree(k) && !f.nooks.some((nk) => nk.o === k));
      if (!cands.length) break;
      f.stars.add(pick(r, cands));
    }

    // 👻 まもの
    dist = plainDist(f, f.start);
    const pool = Object.keys(MONS).filter((k) => MONS[k].intro <= n);
    const newest = Object.keys(MONS).find((k) => MONS[k].intro === n);
    const cnt = n === 1 ? 2 : Math.min(7, 2 + Math.ceil(n / 2));
    const kinds = [];
    if (newest) kinds.push(newest);
    while (kinds.length < cnt) kinds.push(pick(r, pool));
    markDoorCells(f);
    const monFree = (x, y, home) => inb(x, y) && MPASS[g[K(x, y)]] === 1 && !f.rocksInit.includes(K(x, y)) && f.roomId[K(x, y)] === home && !f.doorCell[K(x, y)];
    const run = (x, y, dx, dy) => { const h = f.roomId[K(x, y)]; let c = 0; while (monFree(x + dx * (c + 1), y + dy * (c + 1), h) && c < 30) c++; return c; };
    let id = 0;
    for (const kind of kinds) {
      const cands = roomCells((k) => A.reach[k] && g[k] === FLOOR && dist[k] >= 6 && !f.items.has(k) && !f.rocksInit.includes(k) &&
        f.roomId[k] > 0 && !rooms[f.roomId[k]].nook && !f.doorCell[k] && !f.monsInit.some((m) => cheb(m.x, m.y, k % W, (k / W) | 0) <= 1));
      shuffle(r, cands);
      let placed = null;
      for (const k of cands) {
        const x = k % W, y = (k / W) | 0;
        const L = run(x, y, -1, 0), R = run(x, y, 1, 0), U = run(x, y, 0, -1), Dn = run(x, y, 0, 1);
        const m = { id: id, kind, x, y, dx: 0, dy: 0, t: 0, rest: 0, home: f.roomId[k] };
        if (kind === "fuwa" || kind === "goro") {
          if (Math.max(L, R, U, Dn) < 2) continue;
          if (L + R >= U + Dn) { m.dx = R >= L ? 1 : -1; } else { m.dy = Dn >= U ? 1 : -1; }
        } else if (kind === "pata") {
          m.dx = r() < 0.5 ? 1 : -1; m.dy = r() < 0.5 ? 1 : -1;
        }
        placed = m; break;
      }
      if (placed) { f.monsInit.push(placed); id++; }
    }

    // 🎒 もちもの（その かい の まもの と なかよく なれる もの を おく）
    const kindsHere = [...new Set(f.monsInit.map((m) => m.kind))];
    const want = [];
    for (const kd of kindsHere) if (MONS[kd].item && (kd === newest || r() < 0.7)) want.push(MONS[kd].item);
    if (!want.length) { const any = kindsHere.find((kd) => MONS[kd].item); if (any) want.push(MONS[any].item); }
    if (n >= 2 && r() < 0.3) want.push("map");
    if (n >= 2 && r() < 0.35) want.push("wing");
    for (const it of want) {
      const cands = roomCells((k) => isFree(k) && !f.monsInit.some((m) => K(m.x, m.y) === k) && !f.nooks.some((nk) => nk.o === k));
      if (!cands.length) break;
      f.items.set(pick(r, cands), it);
    }

    f.starTotal = f.stars.size;
    f.monsInit.forEach((m) => { m.x0 = m.x; m.y0 = m.y; });
    return f;
  }

  /* ---------- テスト よう: もじ で ちず を かく ---------- */
  // '#' かべ '.' ゆか 'S' いりぐち '>' かいだん 'G' ながれぼし '*' ほし 'i' こおり 'D' とびら 's' スイッチ
  // 'w' ワープ 'c' ひび 't' わな 'R' いわ / まもの: 'f' ふわりん(よこ) 'F' ふわりん(たて) 'p' ぱたこ 'n' のろりん
  // 'g' ごろた(→) 'h' ごろた(←) 'm' まねっこ / もちもの: '1' あめ '2' はっぱ '3' ランタン '4' かがみ '5' ちず '6' はね
  function floorFromAscii(lines, n) {
    const f = blankFloor(n || 1, 0);
    const itemCh = { 1: "candy", 2: "leaf", 3: "lantern", 4: "mirror", 5: "map", 6: "wing" };
    const warps = [];
    let id = 0;
    lines.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = row[x], k = K(x, y);
        let t = FLOOR;
        if (c === "#" || c === " ") t = WALL;
        else if (c === ">") { t = STAIRS; f.target = k; }
        else if (c === "G") { t = GOAL; f.target = k; }
        else if (c === "i") t = ICE;
        else if (c === "D") { t = DOOR; f.doors.push(k); }
        else if (c === "s") { t = SWITCH; f.switchK = k; }
        else if (c === "w") { t = WARP; warps.push(k); }
        else if (c === "c") t = CRACK;
        else if (c === "t") { t = TRAP; f.traps.add(k); }
        else if (c === "S") f.start = k;
        else if (c === "*") f.stars.add(k);
        else if (c === "R") f.rocksInit.push(k);
        else if (itemCh[c]) f.items.set(k, itemCh[c]);
        else if ("fFpnghm".includes(c)) {
          const kind = { f: "fuwa", F: "fuwa", p: "pata", n: "noro", g: "goro", h: "goro", m: "mane" }[c];
          const m = { id: id++, kind, x, y, x0: x, y0: y, dx: 0, dy: 0, t: 0, rest: 0, home: -1 };
          if (c === "f" || c === "g") m.dx = 1; else if (c === "h") m.dx = -1; else if (c === "F") m.dy = 1; else if (c === "p") { m.dx = 1; m.dy = 1; }
          f.monsInit.push(m);
        }
        f.grid[k] = t;
      }
    });
    if (warps.length === 2) f.warps = warps;
    f.starTotal = f.stars.size;
    return f;
  }

  /* ---------- ゲーム の じょうたい ---------- */
  function freshGame(seed) {
    return {
      seed: seed >>> 0, n: 0, f: null, x: 0, y: 0, hearts: 3, stars: 0, items: [], friends: [],
      mons: [], rocks: new Set(), wing: false, inv: 0, freeze: 0, lastDir: [0, 1], turn: 0, steps: 0,
      atStairs: false, done: false, msg: "", vis: new Uint8Array(N),
      stats: { bikkuri: 0, faint: 0, friends: 0, kinds: {}, seenKinds: {} },
    };
  }
  function newGame(seed, startFloor) {
    const g = freshGame(seed);
    enterFloor(g, startFloor || 1);
    return g;
  }
  function gameWithFloor(f) {
    const g = freshGame(0);
    g.n = f.n; g.f = f;
    resetFloor(g);
    updateSeen(g);
    return g;
  }
  function enterFloor(g, n) {
    g.n = n; g.f = genFloor(g.seed, n);
    g.hearts = 3; g.atStairs = false;
    resetFloor(g);
    updateSeen(g);
  }
  function resetFloor(g) {
    const f = g.f;
    g.x = f.start % W; g.y = (f.start / W) | 0;
    g.mons = f.monsInit.filter((m) => !(g.befriendedIds && g.befriendedIds[f.n + ":" + m.id])).map((m) => Object.assign({}, m, { x: m.x0, y: m.y0 }));
    g.rocks = new Set(f.rocksInit);
    g.wing = false; g.inv = 0; g.freeze = 0;
  }
  function descend(g) {
    if (!g.atStairs || g.n >= FLOORS) return false;
    enterFloor(g, g.n + 1);
    return true;
  }

  function monAt(g, x, y) { for (const m of g.mons) if (m.x === x && m.y === y) return m; return null; }

  /* ---------- みえる ところ ---------- */
  function markRoom(g, rid, vis) {
    const rm = g.f.rooms[rid];
    for (let yy = rm.y - 1; yy <= rm.y + rm.h; yy++) for (let xx = rm.x - 1; xx <= rm.x + rm.w; xx++) {
      if (!inb(xx, yy)) continue;
      const k = K(xx, yy); g.f.seen[k] = 1; if (vis) vis[k] = 1;
    }
  }
  function updateSeen(g) {
    const f = g.f, vis = new Uint8Array(N);
    const r = f.lantern ? 4.5 : 2.5;
    const R = Math.ceil(r);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const x = g.x + dx, y = g.y + dy;
      if (!inb(x, y) || dx * dx + dy * dy > r * r) continue;
      vis[K(x, y)] = 1; f.seen[K(x, y)] = 1;
    }
    const rid = f.roomId[K(g.x, g.y)];
    if (rid >= 0) markRoom(g, rid, vis);
    g.vis = vis;
    const newKinds = [];
    for (const m of g.mons) if (vis[K(m.x, m.y)] && !g.stats.seenKinds[m.kind]) { g.stats.seenKinds[m.kind] = 1; newKinds.push(m.kind); }
    return newKinds;
  }
  function visibleMons(g) { return g.mons.filter((m) => g.vis[K(m.x, m.y)]); }

  /* ---------- まもの の うごき ---------- */
  function monBlocked(g, x, y, self) {
    if (!inb(x, y) || MPASS[g.f.grid[K(x, y)]] !== 1 || g.rocks.has(K(x, y))) return true;
    if (self && g.f.roomId[K(x, y)] !== self.home) return true; // まもの は じぶん の へや から でない
    if (g.f.doorCell[K(x, y)]) return true; // へや の でいりぐち には たたない（とおせんぼ しない）
    for (const m of g.mons) if (m !== self && m.x === x && m.y === y) return true;
    return false;
  }
  function moveMon(g, m, pdir, ev) {
    if (m.kind === "fuwa") { // たて か よこ に いったり きたり
      if (monBlocked(g, m.x + m.dx, m.y + m.dy, m)) { m.dx = -m.dx; m.dy = -m.dy; }
      if (!monBlocked(g, m.x + m.dx, m.y + m.dy, m)) { m.x += m.dx; m.y += m.dy; }
    } else if (m.kind === "pata") { // 2マス ずつ ななめ に とぶ（はね かえる）
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const dx = m.dx * sx, dy = m.dy * sy;
        if (!monBlocked(g, m.x + 2 * dx, m.y + 2 * dy, m)) { m.dx = dx; m.dy = dy; m.x += 2 * dx; m.y += 2 * dy; break; }
      }
    } else if (m.kind === "noro") { // おいかける けど 2て に 1かい
      m.t++;
      if (m.t % 2 === 0) {
        // おなじ へや に いる あいだ だけ おいかける。でて いったら もと の ばしょ へ もどる
        const chase = g.f.roomId[K(g.x, g.y)] === m.home;
        const gx = chase ? g.x : m.x0, gy = chase ? g.y : m.y0;
        const ddx = Math.sign(gx - m.x), ddy = Math.sign(gy - m.y);
        const tries = Math.abs(gx - m.x) >= Math.abs(gy - m.y) ? [[ddx, 0], [0, ddy]] : [[0, ddy], [ddx, 0]];
        for (const [dx, dy] of tries) {
          if ((dx || dy) && !monBlocked(g, m.x + dx, m.y + dy, m)) { m.x += dx; m.y += dy; break; }
        }
      }
    } else if (m.kind === "goro") { // まっすぐ ころがり、かべ で とまる（2て やすんで ぎゃくむき）
      if (g.x === m.x + m.dx && g.y === m.y + m.dy) { befriend(g, m, ev, "greet"); return; }
      if (m.rest > 0) {
        m.rest--;
        if (m.rest === 0) { m.dx = -m.dx; m.dy = -m.dy; }
      } else if (monBlocked(g, m.x + m.dx, m.y + m.dy, m)) {
        m.rest = 2;
      } else { m.x += m.dx; m.y += m.dy; }
    } else if (m.kind === "mane") { // じぶん と おなじ むき
      if (pdir && !monBlocked(g, m.x + pdir[0], m.y + pdir[1], m)) { m.x += pdir[0]; m.y += pdir[1]; m.dx = pdir[0]; m.dy = pdir[1]; }
    }
  }

  function dropStars(g, cnt) {
    const f = g.f, out = [], seen = new Uint8Array(N), q = [K(g.x, g.y)];
    seen[q[0]] = 1;
    for (let qi = 0; qi < q.length && out.length < cnt; qi++) {
      const k = q[qi], x = k % W, y = (k / W) | 0;
      if (qi > 0 && f.grid[k] === FLOOR && !g.rocks.has(k) && !f.stars.has(k) && !f.items.has(k) && !monAt(g, x, y)) out.push(k);
      if (cheb(x, y, g.x, g.y) >= 4) continue;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!passable(f, nx, ny)) continue;
        const nk = K(nx, ny);
        if (!seen[nk]) { seen[nk] = 1; q.push(nk); }
      }
    }
    out.forEach((k) => f.stars.add(k));
    return out;
  }

  function bikkuri(g, m, ox, oy, ev) {
    ev.push("bikkuri");
    g.stats.bikkuri++;
    m.x = ox; m.y = oy;
    if (m.kind === "fuwa" || m.kind === "goro") { m.dx = -m.dx; m.dy = -m.dy; m.rest = 0; }
    const lose = Math.min(3, g.stars);
    g.stars -= lose;
    g.dropped = dropStars(g, lose);
    g.hearts--;
    g.lastHit = m.kind;
    if (g.hearts <= 0) {
      ev.push("faint");
      g.stats.faint++;
      resetFloor(g);
      g.hearts = 3;
      g.msg = "ハート が なくなった… いりぐち に もどったよ。ちず は のこって いる よ";
      return true;
    }
    g.inv = 3;
    g.msg = MONS[m.kind].name + " に ぶつかって びっくり！ ほしくず を " + lose + "こ おとしちゃった";
    return false;
  }

  function befriend(g, m, ev, how) {
    const i = g.mons.indexOf(m);
    if (i < 0) return;
    g.mons.splice(i, 1);
    g.befriendedIds = g.befriendedIds || {};
    g.befriendedIds[g.f.n + ":" + m.id] = 1;
    g.stats.friends++;
    g.stats.kinds[m.kind] = (g.stats.kinds[m.kind] || 0) + 1;
    const nm = MONS[m.kind].name;
    let msg = how === "greet" ? nm + " が とまって「こんにちは！」 なかよし に なった！"
      : how === "sleep" ? nm + " が あかり で すやすや… なかよし に なった！"
      : nm + " と なかよし に なった！";
    if (g.friends.length < MAX_FRIENDS) { g.friends.push(m.kind); msg += " なかま に なって くれた よ"; }
    else msg += "（なかま は 3にん まで。また あおうね）";
    g.msg = msg;
    ev.push("friend");
    g.lastFriend = m.kind;
  }

  function monstersMove(g, pdir, ev) {
    if (g.freeze > 0) { g.freeze--; return false; }
    for (const m of g.mons.slice()) {
      if (g.mons.indexOf(m) < 0) continue;
      const ox = m.x, oy = m.y;
      moveMon(g, m, pdir, ev);
      if (g.mons.indexOf(m) < 0) continue;
      if (g.inv === 0 && m.x === g.x && m.y === g.y) {
        if (bikkuri(g, m, ox, oy, ev)) return true;
      }
    }
    return false;
  }

  /* ---------- 1て すすめる ---------- */
  function collect(g, k, ev) {
    const f = g.f;
    if (f.stars.has(k)) { f.stars.delete(k); g.stars++; ev.push("star"); }
    if (f.items.has(k)) {
      const it = f.items.get(k);
      if (g.items.length < MAX_ITEMS) { f.items.delete(k); g.items.push(it); ev.push("item"); g.msg = ITEMS[it].emoji + " " + ITEMS[it].name + " を ひろった！"; g.lastItem = it; }
      else { g.msg = "もちもの が いっぱい（5こ まで）。つかって から また きてね"; ev.push("full"); }
    }
  }

  function step(g, act) {
    const ev = [];
    g.msg = ""; g.dropped = null;
    if (g.done || g.atStairs) return { ev, used: false };
    const f = g.f;
    let pdir = null, res = null, stuck = false, bumpFaint = false;
    const px0 = g.x, py0 = g.y;
    const byMon = (x, y) => g.inv === 0 && !!monAt(g, x, y);

    if (act.type === "move") {
      const dx = act.dir[0], dy = act.dir[1];
      g.lastDir = [dx, dy];
      const nx = g.x + dx, ny = g.y + dy, nk = K(nx, ny);
      if (g.wing) {
        const mt = inb(nx, ny) ? f.grid[nk] : WALL;
        const tx = g.x + 2 * dx, ty = g.y + 2 * dy;
        if (mt !== WALL && mt !== CRACK && mt !== DOOR && passable(f, tx, ty) && !g.rocks.has(K(tx, ty)) && !byMon(tx, ty)) {
          res = slideFrom(f, g.rocks, nx, ny, dx, dy, byMon);
          g.wing = false;
          g.items.splice(g.items.indexOf("wing"), 1);
          ev.push("jump");
        } else {
          g.msg = "そこ には とべない よ（かべ の むこう は だめ）";
          ev.push("nope");
          return { ev, used: false };
        }
      } else {
        const t = inb(nx, ny) ? f.grid[nk] : WALL;
        if (t === CRACK) {
          f.grid[nk] = FLOOR;
          ev.push("secret");
          g.msg = "ひび の かべ が くずれた！ ひみつ の へや だ！";
          const nook = f.nooks.find((q) => q.e === nk);
          if (nook) markRoom(g, f.rooms.indexOf(nook));
        } else if (t === WALL) {
          ev.push("wall");
          return { ev, used: false };
        } else if (t === DOOR) {
          g.msg = "とびら が しまって いる。🔘 スイッチ を さがそう";
          ev.push("nope");
          return { ev, used: false };
        } else if (g.inv === 0 && monAt(g, nx, ny)) {
          // じぶん から ぶつかって も びっくり（そのあと 2て は まもの を すりぬけられる）
          const m = monAt(g, nx, ny);
          bumpFaint = bikkuri(g, m, m.x, m.y, ev);
          if (!bumpFaint) g.msg += "。" + MONS[m.kind].befriend + " と なかよく なれる よ";
        } else if (g.rocks.has(nk)) {
          const bx = nx + dx, by = ny + dy, bk = K(bx, by);
          if (inb(bx, by) && f.grid[bk] === FLOOR && !g.rocks.has(bk) && !byMon(bx, by) && !f.stars.has(bk) && !f.items.has(bk)) {
            g.rocks.delete(nk); g.rocks.add(bk);
            ev.push("push");
            res = { x: nx, y: ny, path: [nk], warped: false };
          } else {
            g.msg = "いわ が うごかない…（むこう が ふさがって いる）";
            ev.push("nope");
            return { ev, used: false };
          }
        } else {
          res = slideFrom(f, g.rocks, g.x, g.y, dx, dy, byMon);
          if (!res) { ev.push("wall"); return { ev, used: false }; }
        }
      }
      if (res) {
        pdir = [dx, dy];
        g.x = res.x; g.y = res.y; g.steps++;
        ev.push(res.path.length > 1 ? "slide" : "step");
        for (const k of res.path) collect(g, k, ev);
        if (res.warped) { ev.push("warp"); collect(g, K(g.x, g.y), ev); g.msg = g.msg || "ワープ の あな で ひゅーん！"; }
        const t = f.grid[K(g.x, g.y)];
        if (t === STAIRS) { g.atStairs = true; ev.push("stairs"); g.turn++; return { ev, used: true }; }
        if (t === GOAL) { g.done = true; ev.push("clear"); g.turn++; return { ev, used: true }; }
        if (t === SWITCH && !f.switchOn) {
          f.switchOn = true;
          f.doors.forEach((k) => { f.grid[k] = OPEN; });
          ev.push("switch");
          g.msg = "カチッ！ どこか で とびら が あいた おと が した";
        }
        if (t === TRAP) {
          f.trapKnown.add(K(g.x, g.y));
          ev.push("trap");
          g.msg = "ねばねば の わな！ 1かい うごけない…";
          stuck = true;
        }
      }
    } else if (act.type !== "wait") {
      return { ev, used: false };
    }

    let fainted = bumpFaint;
    // ワープ で まもの の ところ に でた とき
    const hit = !fainted && monAt(g, g.x, g.y);
    if (hit && g.inv === 0) fainted = bikkuri(g, hit, hit.x, hit.y, ev);
    if (!fainted) fainted = monstersMove(g, pdir, ev);
    if (!fainted && stuck) fainted = monstersMove(g, null, ev);
    g.turn++;
    if (g.inv > 0) g.inv--;
    const nk = updateSeen(g);
    if (nk.length) ev.push("spot");
    g.newKinds = nk;
    return { ev, used: true, from: [px0, py0] };
  }

  /* ---------- もちもの・なかま ---------- */
  function useItem(g, idx) {
    const ev = [], it = g.items[idx], f = g.f;
    g.msg = "";
    if (!it || g.done) return { ev, ok: false };
    const near = (kind, d) => g.mons.filter((m) => m.kind === kind && cheb(m.x, m.y, g.x, g.y) <= d);
    const give = (kind, d, how) => {
      const ms = near(kind, d);
      if (!ms.length) {
        g.msg = MONS[kind].emoji + " " + MONS[kind].name + " が ちかく に いない よ。" + (d === 1 ? "となり" : "2マス いない") + " で つかってね";
        ev.push("nope");
        return false;
      }
      g.items.splice(idx, 1);
      befriend(g, ms[0], ev, how);
      return true;
    };
    let ok = false;
    if (it === "candy") ok = give("fuwa", 1);
    else if (it === "leaf") ok = give("noro", 1);
    else if (it === "mirror") ok = give("mane", 2);
    else if (it === "lantern") {
      g.items.splice(idx, 1);
      f.lantern = true;
      const ms = near("pata", 3);
      ev.push("light");
      g.msg = "ランタン で まわり が あかるく なった！";
      ms.forEach((m) => befriend(g, m, ev, "sleep"));
      if (ms.length) g.msg = "ランタン の あかり で " + g.msg;
      ok = true;
      updateSeen(g);
    } else if (it === "map") {
      g.items.splice(idx, 1);
      const secret = new Set();
      f.nooks.forEach((nk) => { if (nk.nook === "secret" && f.grid[nk.e] === CRACK) for (let yy = nk.y; yy < nk.y + nk.h; yy++) for (let xx = nk.x; xx < nk.x + nk.w; xx++) secret.add(K(xx, yy)); });
      for (let k = 0; k < N; k++) {
        if (secret.has(k)) continue;
        const x = k % W, y = (k / W) | 0;
        let show = f.grid[k] !== WALL;
        for (let dy = -1; dy <= 1 && !show; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (inb(xx, yy) && f.grid[K(xx, yy)] !== WALL && !secret.has(K(xx, yy))) { show = true; break; }
        }
        if (show) f.seen[k] = 1;
      }
      ev.push("map");
      g.msg = "🗺️ この かい の ちず が ぜんぶ みえた！";
      ok = true;
    } else if (it === "wing") {
      g.wing = !g.wing;
      ev.push(g.wing ? "wingOn" : "wingOff");
      g.msg = g.wing ? "🪽 はね の じゅんび OK！ つぎ の 1て で 2マス とぶ よ" : "はね を しまった";
      ok = true;
    }
    return { ev, ok };
  }

  function useFriend(g, idx) {
    const ev = [], kind = g.friends[idx], f = g.f;
    g.msg = "";
    if (!kind || g.done) return { ev, ok: false };
    let ok = true;
    if (kind === "fuwa") {
      f.traps.forEach((k) => { if (f.grid[k] === TRAP) { f.trapKnown.add(k); f.seen[k] = 1; } });
      g.msg = f.traps.size ? "👻 ふわりん が わな の ばしょ を おしえて くれた！" : "👻「この かい に わな は ない みたい」";
      if (!f.traps.size) ok = false;
    } else if (kind === "pata") {
      const rid = f.roomId[f.target];
      if (rid >= 0) markRoom(g, rid); else f.seen[f.target] = 1;
      g.msg = "🦇 ぱたこ が " + (f.grid[f.target] === GOAL ? "ながれぼし" : "かいだん") + " の ばしょ を おしえて くれた！ ちず を みてね";
    } else if (kind === "noro") {
      if (g.hearts >= 3) { g.msg = "🐌「ハート は もう いっぱい だよ」"; ok = false; }
      else { g.hearts++; g.msg = "🐌 のろりん が ハート を 1つ なおして くれた！"; }
    } else if (kind === "goro") {
      const tx = g.x + g.lastDir[0], ty = g.y + g.lastDir[1], tk = K(tx, ty);
      const inner = tx > 0 && ty > 0 && tx < W - 1 && ty < H - 1;
      let nearIce = f.grid[K(g.x, g.y)] === ICE;
      for (const [dx, dy] of DIRS) if (inb(tx + dx, ty + dy) && f.grid[K(tx + dx, ty + dy)] === ICE) nearIce = true;
      if (inner && (f.grid[tk] === WALL || f.grid[tk] === CRACK) && !nearIce) {
        f.grid[tk] = FLOOR; f.seen[tk] = 1;
        const nook = f.nooks.find((q) => q.e === tk);
        if (nook) markRoom(g, f.rooms.indexOf(nook));
        g.msg = "🪨 ごろた が ごろーん！ かべ を こわして くれた！";
        ev.push("break");
      } else { g.msg = "🪨「こわせる かべ に むかって から よんでね」"; ok = false; }
    } else if (kind === "mane") {
      g.freeze = 3;
      g.msg = "🦊 まねっこ が「とまれ！」 3て の あいだ みんな とまる よ";
    }
    if (ok) { g.friends.splice(idx, 1); ev.push("help"); } else ev.push("nope");
    updateSeen(g);
    return { ev, ok };
  }

  function resetRocks(g) {
    const f = g.f;
    const busy = f.rocksInit.some((k) => (k === K(g.x, g.y)) || monAt(g, k % W, (k / W) | 0) || (f.stars.has(k) && !g.rocks.has(k)) || (f.items.has(k) && !g.rocks.has(k)));
    if (busy) { g.msg = "いわ の もと の ばしょ に だれか が いる よ。すこし どいてね"; return false; }
    g.rocks = new Set(f.rocksInit);
    g.msg = "🔄 いわ が もと の ばしょ に もどった";
    return true;
  }

  /* ---------- みちさがし ---------- */
  // tx,ty へ いく 1て ずつ の むき（すべる ゆか こみ）。known=true なら みた こと の ある マス だけ、みえて いる まもの を さける。
  function planPath(g, tx, ty, known) {
    const f = g.f, start = K(g.x, g.y), goal = K(tx, ty);
    if (start === goal) return [];
    const blocked = (x, y) => (known && !f.seen[K(x, y)]) || (known ? g.mons.some((m) => g.vis[K(m.x, m.y)] && m.x === x && m.y === y) : !!monAt(g, x, y));
    const prev = new Int32Array(N).fill(-1), pd = new Int8Array(N).fill(-1);
    const q = [start]; prev[start] = start;
    for (let qi = 0; qi < q.length; qi++) {
      const k = q[qi], x = k % W, y = (k / W) | 0;
      if (k === goal) break;
      if (k !== start && (f.grid[k] === STAIRS || f.grid[k] === GOAL)) continue;
      for (let d = 0; d < 4; d++) {
        const r = slideFrom(f, g.rocks, x, y, DIRS[d][0], DIRS[d][1], blocked);
        if (!r) continue;
        const nk = K(r.x, r.y);
        if (prev[nk] >= 0) continue;
        if (known && r.path.some((p) => !f.seen[p])) continue;
        prev[nk] = k; pd[nk] = d; q.push(nk);
      }
    }
    if (prev[goal] < 0) return null;
    const out = [];
    for (let k = goal; k !== start; k = prev[k]) out.push(DIRS[pd[k]]);
    return out.reverse();
  }

  function distMap(g) { return analyze(g.f, g.rocks, K(g.x, g.y), g.f.target).dist; }

  function clone(g) {
    const f = g.f;
    const f2 = Object.assign({}, f, { grid: f.grid.slice(), stars: new Set(f.stars), items: new Map(f.items), trapKnown: new Set(f.trapKnown), seen: f.seen.slice() });
    return Object.assign({}, g, {
      f: f2, items: g.items.slice(), friends: g.friends.slice(), mons: g.mons.map((m) => Object.assign({}, m)),
      rocks: new Set(g.rocks), lastDir: g.lastDir.slice(), vis: g.vis.slice(),
      stats: JSON.parse(JSON.stringify(g.stats)), befriendedIds: Object.assign({}, g.befriendedIds || {}),
    });
  }

  // じどう で すすむ（テスト・デバッグ よう）: いちばん ちかい みち を すすむ。
  // つぎ の 1て で ぶつかる なら すこし まつ（まちすぎたら ぶつかって でも すすむ）。
  function autoAction(g, memo) {
    memo = memo || {};
    // なかよく なれる もちもの が あって、あいて が ちかく に いれば つかう
    const reach = { candy: ["fuwa", 1], leaf: ["noro", 1], mirror: ["mane", 2], lantern: ["pata", 3] };
    for (let i = 0; i < g.items.length; i++) {
      const rr = reach[g.items[i]];
      if (rr && g.mons.some((m) => m.kind === rr[0] && cheb(m.x, m.y, g.x, g.y) <= rr[1])) return { type: "item", idx: i };
    }
    const dist = distMap(g);
    const here = dist[K(g.x, g.y)];
    const sim = (a) => { const c = clone(g); const r = step(c, a); return { a, c, r, bad: r.ev.includes("bikkuri") }; };
    const moves = DIRS.map((d) => sim({ type: "move", dir: d })).filter((o) => o.r.used);
    const closer = (k) => dist[k] >= 0 && dist[k] < here;
    const prog = moves.filter((o) => o.c.atStairs || o.c.done || closer(K(o.c.x, o.c.y)) ||
      (o.bad && ((o.c.x === g.x && o.c.y === g.y) || o.r.ev.includes("faint")) && closer(K(g.x + o.a.dir[0], g.y + o.a.dir[1]))));
    const goal = prog.find((o) => o.c.atStairs || o.c.done);
    if (goal) return goal.a;
    if (memo.n !== g.n || memo.best === undefined || here < memo.best) { memo.n = g.n; memo.best = here; memo.stall = 0; } else memo.stall++;
    if (memo.stall > 8) {
      memo.stall = 0; memo.kick = (memo.kick || 0) + 1;
      if (prog.length) return prog[memo.kick % prog.length].a;
      memo.r = ((memo.r || 7) * 1103515245 + 12345) & 0x7fffffff;
      if (moves.length) return moves[memo.r % moves.length].a;
    }
    const safeProg = prog.find((o) => !o.bad);
    if (memo.faints) { // いちど たおれたら ときどき まって、まもの との タイミング を ずらす
      memo.r = ((memo.r || 7) * 1103515245 + 12345) & 0x7fffffff;
      if ((memo.r >> 8) % 100 < 20) { const w0 = sim({ type: "wait" }); if (!w0.bad) return w0.a; }
    }
    if (safeProg) return safeProg.a;
    const w = sim({ type: "wait" });
    if (!w.bad) return w.a;
    const side = moves.find((o) => !o.bad);
    if (side) return side.a;
    return prog.length ? prog[0].a : w.a;
  }
  function autoStep(g, memo) {
    memo = memo || {};
    const a = autoAction(g, memo);
    if (a.type === "item") { const u = useItem(g, a.idx); return { a, r: { ev: u.ev, used: false } }; }
    const r = step(g, a);
    if (r.ev.includes("faint")) memo.faints = (memo.faints || 0) + 1;
    if (g.atStairs) memo.faints = 0;
    if (r.ev.includes("faint") || g.atStairs) memo.best = undefined;
    return { a, r };
  }

  /* ---------- ほぞん ---------- */
  function snapshot(g) {
    return { seed: g.seed, n: g.n, stars: g.stars, items: g.items.slice(), friends: g.friends.slice(), turn: g.turn, steps: g.steps, stats: JSON.parse(JSON.stringify(g.stats)) };
  }
  function restore(s) {
    const g = freshGame(s.seed);
    g.stars = s.stars | 0; g.items = (s.items || []).filter((i) => ITEMS[i]).slice(0, MAX_ITEMS);
    g.friends = (s.friends || []).filter((k) => MONS[k]).slice(0, MAX_FRIENDS);
    g.turn = s.turn | 0; g.steps = s.steps | 0;
    if (s.stats) Object.assign(g.stats, s.stats);
    enterFloor(g, Math.max(1, Math.min(FLOORS, s.n | 0)));
    return g;
  }

  return {
    W, H, N, FLOORS, MAX_ITEMS, MAX_FRIENDS, K, DIRS, MONS, ITEMS, HELP,
    T: { WALL, FLOOR, STAIRS, ICE, DOOR, OPEN, SWITCH, WARP, CRACK, TRAP, GOAL }, PASS, MPASS,
    rng, hash, genFloor, analyze, slideFrom, floorFromAscii, newGame, gameWithFloor, enterFloor, resetFloor, descend,
    step, useItem, useFriend, resetRocks, updateSeen, visibleMons, monAt, planPath, distMap, clone, autoAction, autoStep,
    snapshot, restore, passable,
  };
});
