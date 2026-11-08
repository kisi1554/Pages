/* ピクニック まもりたい — しくみ（DOM なし。ブラウザ でも node でも うごく）
 *  - こうえん は W×H の グリッド。まんなか 3×3 が シート（おべんとう）。
 *  - みち は グリッド の けいろ（まいかい シード で ちがう かたち）。
 *  - いきもの は みち を すすむ（カラス だけ そら から まっすぐ）。「びっくり ゲージ」が いっぱい に なる と
 *    くるっ と まわって もと の ばしょ へ かえる（きずつけない）。
 *  - どうぐ は はんい・つよさ・まちじかん を もつ。まちじかん ごと に はんい の なか の あいて の ゲージ を ふやす。
 */
(function (root, factory) {
  const P = (typeof module === "object" && module.exports) ? require("./parks.js") : root.PMParks;
  const api = factory(P);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PMDefense = api;
})(typeof self !== "undefined" ? self : this, function (PARKS) {
  "use strict";

  const W = 11, H = 11;
  const SHEET = { x0: 4, y0: 4, x1: 6, y1: 6 };      // シート の マス（りょうはし ふくむ）
  const CENTER = { x: 5.5, y: 5.5 };
  const BENTO = 10;
  const K = (x, y) => y * W + x;
  const inSheet = (x, y) => x >= SHEET.x0 && x <= SHEET.x1 && y >= SHEET.y0 && y <= SHEET.y1;
  const inBoard = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  /* ---------- いきもの ---------- */
  const CREATURES = {
    ant:      { name: "アリ",   emoji: "🐜", gauge: 3, speed: 1.0, coin: 1, air: false },
    pigeon:   { name: "ハト",   emoji: "🐦", gauge: 6, speed: 1.0, coin: 3, air: false },
    crow:     { name: "カラス", emoji: "🐦‍⬛", gauge: 4, speed: 2.4, coin: 4, air: true },
    squirrel: { name: "リス",   emoji: "🐿️", gauge: 5, speed: 1.8, coin: 3, air: false },
  };
  const CTYPES = Object.keys(CREATURES);

  /* ---------- どうぐ ---------- */
  // power: あいて ごと の 1かい の びっくり。range: はんい（マス）。cd: まちじかん（びょう）
  const TOOLS = {
    fan:      { name: "うちわ",     emoji: "🪭", cost: 10, range: 1.6, cd: 0.6, power: { ant: 1, pigeon: 1 }, push: 0.25,
                desc: "まえ に かぜ。ちかく の アリ・ハト を ゆっくり おしかえす" },
    umbrella: { name: "かさ",       emoji: "☂️", cost: 15, range: 2.6, cd: 0.8, power: { crow: 2, pigeon: 1.5 },
                desc: "そら から ちかよる カラス・ハト を ふせぐ" },
    crumb:    { name: "パンくず",   emoji: "🍞", cost: 12,  range: 1.6, cd: 1.0, power: { ant: 1, squirrel: 2.5 }, slow: 0.5,
                desc: "おとり。アリ・リス が つられて シート から はなれる" },
    whistle:  { name: "ふえ",       emoji: "📯", cost: 20, range: 2.6, cd: 2.0, power: { ant: 1, pigeon: 1, crow: 1, squirrel: 1 },
                desc: "まわり ぜんぶ を すこし だけ びっくり させる" },
    water:    { name: "みずまき",   emoji: "💧", cost: 12, range: 1.4, cd: 1.5, power: { ant: 3 },
                desc: "においの みち を けして アリ を まいご に する" },
  };
  const TTYPES = Object.keys(TOOLS);
  const REFUND = 0.7;
  const LAND = 1.8;   // カラス が シート の はし で きょろきょろ する じかん
  const WAVE_BONUS = 5;

  function starsFor(left) { return left >= 8 ? 3 : left >= 5 ? 2 : left >= 2 ? 1 : 0; }

  /* ---------- らんすう ---------- */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  function shuffle(r, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  /* ---------- こうえん（みち）を つくる ---------- */
  // side: 0 うえ 1 みぎ 2 した 3 ひだり
  function edgeCell(r, side) {
    const c = 1 + Math.floor(r() * (W - 2));
    return side === 0 ? [c, 0] : side === 1 ? [W - 1, c] : side === 2 ? [c, H - 1] : [0, c];
  }
  function sheetDoor(side, i) {     // シート の すぐ そと の マス と、その となり の シート の マス
    const c = SHEET.x0 + i;         // 4..6
    if (side === 0) return [[c, SHEET.y0 - 1], [c, SHEET.y0]];
    if (side === 1) return [[SHEET.x1 + 1, c], [SHEET.x1, c]];
    if (side === 2) return [[c, SHEET.y1 + 1], [c, SHEET.y1]];
    return [[SHEET.x0 - 1, c], [SHEET.x0, c]];
  }

  // ランダム な ふかさ ゆうせん たんさく で、ながさ が len の はんい の 1ぽんみち を さがす
  function genPath(r, side, door, blocked, len) {
    const start = edgeCell(r, side);
    if (blocked.has(K(start[0], start[1]))) return null;
    const goal = door[0], gk = K(goal[0], goal[1]);
    const own = new Set([K(start[0], start[1])]), cells = [start];
    let budget = 6000;
    const okCell = (nx, ny, px, py) => {
      if (!inBoard(nx, ny) || nx === 0 || ny === 0 || nx === W - 1 || ny === H - 1) return false;
      const nk = K(nx, ny);
      if (own.has(nk) || blocked.has(nk)) return false;
      for (const e of DIRS) {
        const ax = nx + e[0], ay = ny + e[1];
        if (ax === px && ay === py) continue;
        if (own.has(K(ax, ay))) return false;                       // じぶん に くっつかない
        if (inSheet(ax, ay) && nk !== gk) return false;              // シート に ふれる の は さいご だけ
      }
      return true;
    };
    function dfs() {
      if (--budget < 0) return false;
      const cur = cells[cells.length - 1];
      if (cur[0] === goal[0] && cur[1] === goal[1]) return cells.length - 1 >= len[0] - 1;
      const dist = Math.abs(cur[0] - goal[0]) + Math.abs(cur[1] - goal[1]);
      if (cells.length - 1 + dist > len[1] - 1) return false;
      for (const d of shuffle(r, DIRS.slice())) {
        const nx = cur[0] + d[0], ny = cur[1] + d[1];
        if (!okCell(nx, ny, cur[0], cur[1])) continue;
        own.add(K(nx, ny)); cells.push([nx, ny]);
        if (dfs()) return true;
        cells.pop(); own.delete(K(nx, ny));
      }
      return false;
    }
    if (!dfs()) return null;
    cells.push(door[1]);
    return cells;
  }

  function genPark(stage, seed) {
    for (let attempt = 0; attempt < 4000; attempt++) {
      const r = rng(seed * 7919 + attempt * 104729 + 17);
      const sides = shuffle(r, [0, 1, 2, 3]).slice(0, stage.paths);
      const blocked = new Set();
      for (let x = SHEET.x0; x <= SHEET.x1; x++) for (let y = SHEET.y0; y <= SHEET.y1; y++) blocked.add(K(x, y));
      const paths = [];
      let ok = true;
      for (const side of sides) {
        let p = null;
        for (let t = 0; t < 60 && !p; t++) {
          const door = sheetDoor(side, Math.floor(r() * 3));
          if (blocked.has(K(door[0][0], door[0][1]))) continue;
          p = genPath(r, side, door, blocked, stage.len);
        }
        if (!p) { ok = false; break; }
        paths.push(p);
        for (const c of p) {
          if (inSheet(c[0], c[1])) continue;
          blocked.add(K(c[0], c[1]));
          for (const e of DIRS) { const ax = c[0] + e[0], ay = c[1] + e[1]; if (inBoard(ax, ay) && !inSheet(ax, ay)) blocked.add(K(ax, ay)); }
        }
      }
      if (!ok) continue;
      // マス の しゅるい: 0 しばふ / 1 みち / 2 シート / 3 かざり（おけない）
      const grid = new Array(W * H).fill(0);
      for (let x = SHEET.x0; x <= SHEET.x1; x++) for (let y = SHEET.y0; y <= SHEET.y1; y++) grid[K(x, y)] = 2;
      for (const p of paths) for (const c of p) if (!inSheet(c[0], c[1])) grid[K(c[0], c[1])] = 1;
      // かざり: シート の まわり 1マス と、みち の でぐち の となり には おかない
      const near = (x, y) => x >= SHEET.x0 - 1 && x <= SHEET.x1 + 1 && y >= SHEET.y0 - 1 && y <= SHEET.y1 + 1;
      const free = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[K(x, y)] === 0 && !near(x, y)) free.push([x, y]);
      shuffle(r, free);
      const season = PARKS.SEASONS[stage.season] || PARKS.SEASONS.spring;
      const deco = [];
      for (const c of free.slice(0, stage.deco || 0)) {
        grid[K(c[0], c[1])] = 3;
        deco.push({ x: c[0], y: c[1], kind: pick(r, season.deco) });
      }
      return { seed, grid, paths, deco, attempt };
    }
    throw new Error("こうえん が つくれない");
  }

  /* ---------- みち の うえ の いち ---------- */
  function pathPos(path, s) {
    const L = path.length - 1;
    if (s <= 0) return { x: path[0][0] + 0.5, y: path[0][1] + 0.5, dx: path[1][0] - path[0][0], dy: path[1][1] - path[0][1] };
    if (s >= L) return { x: path[L][0] + 0.5, y: path[L][1] + 0.5, dx: path[L][0] - path[L - 1][0], dy: path[L][1] - path[L - 1][1] };
    const i = Math.floor(s), f = s - i, a = path[i], b = path[i + 1];
    return { x: a[0] + 0.5 + (b[0] - a[0]) * f, y: a[1] + 0.5 + (b[1] - a[1]) * f, dx: b[0] - a[0], dy: b[1] - a[1] };
  }

  /* ---------- ゲーム ---------- */
  function newGame(stageNo, seed, opt) {
    opt = opt || {};
    const free = stageNo === "free";
    const stage = free ? freeStage(opt.season || "spring", opt.paths || 2) : PARKS.STAGES[stageNo - 1];
    if (!stage) throw new Error("ステージ が ない: " + stageNo);
    const park = genPark(stage, seed);
    return {
      stageNo, stage, park, seed, free,
      r: rng(seed * 31 + 7),
      t: 0, waveT: 0, coins: free ? 999 : stage.coins, bento: BENTO,
      tools: [], cre: [], queue: [], nextId: 1,
      wave: 0, phase: free ? "free" : "prep",
      returned: 0, stolen: 0, stolenBy: {}, earned: 0, seen: {}, ev: [],
    };
  }
  function freeStage(season, paths) {
    return { name: "じゆう モード", season, paths, len: paths >= 3 ? [11, 15] : paths === 1 ? [14, 24] : [12, 18], coins: 999, deco: 8, tools: TTYPES.slice(), waves: [] };
  }

  function canPlace(G, x, y) {
    if (!inBoard(x, y) || G.park.grid[K(x, y)] !== 0) return false;
    return !G.tools.some((t) => t.x === x && t.y === y);
  }
  function place(G, type, x, y) {
    const T = TOOLS[type];
    if (!T || G.phase === "done" || !G.stage.tools.includes(type)) return null;
    if (!canPlace(G, x, y) || G.coins < T.cost) return null;
    G.coins -= T.cost;
    const tool = { id: G.nextId++, type, x, y, cx: x + 0.5, cy: y + 0.5, cd: 0, fired: 0, ang: 0 };
    G.tools.push(tool);
    G.ev.push({ k: "place", tool });
    return tool;
  }
  function refundOf(type) { return Math.floor(TOOLS[type].cost * REFUND); }
  function remove(G, id) {
    const i = G.tools.findIndex((t) => t.id === id);
    if (i < 0) return 0;
    const t = G.tools[i];
    G.tools.splice(i, 1);
    const back = refundOf(t.type);
    G.coins += back;
    G.ev.push({ k: "remove", tool: t, back });
    return back;
  }

  function startWave(G) {
    if (G.phase !== "prep") return false;
    const w = G.stage.waves[G.wave];
    if (!w) return false;
    G.queue = [];
    for (const [type, n, at, gap, p] of w) for (let i = 0; i < n; i++) G.queue.push({ t: at + i * gap, type, path: p % G.park.paths.length });
    G.queue.sort((a, b) => a.t - b.t);
    G.phase = "wave"; G.waveT = 0;
    G.ev.push({ k: "wave", n: G.wave + 1 });
    return true;
  }

  function spawn(G, type, pathIdx) {
    const C = CREATURES[type];
    const c = { id: G.nextId++, type, state: "go", g: 0, max: C.gauge, s: 0, t: 0, x: 0, y: 0, dx: 0, dy: 1, spin: 0, carry: false, hit: 0, fade: 1 };
    if (C.air) {
      const side = Math.floor(G.r() * 4);
      const u = 0.5 + G.r() * (W - 1);
      const e = side === 0 ? [u, 0.3] : side === 1 ? [W - 0.3, u] : side === 2 ? [u, H - 0.3] : [0.3, u];
      c.sx = e[0]; c.sy = e[1]; c.x = e[0]; c.y = e[1];
      c.state = "circle"; c.wait = 1.2;
      const d = Math.hypot(CENTER.x - c.sx, CENTER.y - c.sy);
      c.dx = (CENTER.x - c.sx) / d; c.dy = (CENTER.y - c.sy) / d;
      c.d = 0; c.L = d - 1.5;
    } else {
      c.path = pathIdx % G.park.paths.length;
      const p = pathPos(G.park.paths[c.path], 0);
      c.x = p.x; c.y = p.y; c.dx = p.dx; c.dy = p.dy;
      c.L = G.park.paths[c.path].length - 1;
      c.hop = G.r() * 0.9;
    }
    G.cre.push(c);
    if (!G.seen[type]) { G.seen[type] = true; G.ev.push({ k: "new", type }); }
    G.ev.push({ k: "spawn", c });
    return c;
  }

  const targetable = (c) => c.state === "go" || c.state === "circle" || c.state === "dive" || c.state === "land";

  function inRange(t, c) { return Math.hypot(c.x - t.cx, c.y - t.cy) <= TOOLS[t.type].range; }

  function scare(G, c) {
    c.state = "spin"; c.spin = 0.6; c.g = c.max;
    const coin = CREATURES[c.type].coin;
    G.coins += coin; G.earned += coin; G.returned++;
    G.ev.push({ k: "bikkuri", c, coin });
  }

  function step(G, dt) {
    if (G.phase === "done" || G.phase === "prep") return;
    G.t += dt;
    if (G.phase === "wave") {
      G.waveT += dt;
      while (G.queue.length && G.queue[0].t <= G.waveT) { const q = G.queue.shift(); spawn(G, q.type, q.path); }
    }
    // どうぐ
    for (const t of G.tools) {
      const T = TOOLS[t.type];
      if (t.cd > 0) t.cd -= dt;
      if (t.fired > 0) t.fired -= dt;
      if (t.cd > 0) continue;
      let hit = false, near = null, nd = 1e9;
      for (const c of G.cre) {
        if (!targetable(c) || !T.power[c.type] || !inRange(t, c)) continue;
        hit = true;
        c.g += T.power[c.type]; c.hit = 0.3;
        if (T.push && !CREATURES[c.type].air) c.s = Math.max(0, c.s - T.push);
        const d = Math.hypot(c.x - t.cx, c.y - t.cy);
        if (d < nd) { nd = d; near = c; }
      }
      if (hit) {
        t.cd = T.cd; t.fired = 0.35;
        if (near) t.ang = Math.atan2(near.y - t.cy, near.x - t.cx);
        G.ev.push({ k: "fire", tool: t });
        for (const c of G.cre) if (targetable(c) && c.g >= c.max) scare(G, c);
      }
    }
    // いきもの
    for (const c of G.cre) {
      const C = CREATURES[c.type];
      c.t += dt;
      if (c.hit > 0) c.hit -= dt;
      if (c.state === "spin") {
        c.spin -= dt;
        if (c.spin <= 0) c.state = "home";
        continue;
      }
      if (C.air) { stepAir(G, c, C, dt); continue; }
      const path = G.park.paths[c.path];
      if (c.state === "go") {
        let v = C.speed;
        if (c.type === "pigeon") { c.hop = (c.hop + dt) % 0.9; v = c.hop < 0.5 ? 1.7 : 0.1; }
        for (const t of G.tools) if (TOOLS[t.type].slow && TOOLS[t.type].power[c.type] && inRange(t, c)) { v *= TOOLS[t.type].slow; break; }
        c.s += v * dt;
        if (c.s >= c.L) { c.s = c.L; steal(G, c); }
      } else if (c.state === "home" || c.state === "carry") {
        c.s -= C.speed * 1.6 * dt;
        if (c.s <= 0) { c.s = 0; c.state = "gone"; }
      }
      const p = pathPos(path, c.s);
      c.x = p.x; c.y = p.y;
      const back = c.state === "home" || c.state === "carry";
      c.dx = back ? -p.dx : p.dx; c.dy = back ? -p.dy : p.dy;
    }
    // おわった いきもの を けす
    for (let i = G.cre.length - 1; i >= 0; i--) if (G.cre[i].state === "gone") G.cre.splice(i, 1);
    // ウェーブ の おわり
    if (G.phase === "wave" && !G.queue.length && !G.cre.length) {
      G.wave++;
      G.coins += WAVE_BONUS;
      if (G.wave >= G.stage.waves.length) { G.phase = "done"; G.ev.push({ k: "done", left: G.bento, stars: starsFor(G.bento) }); }
      else { G.phase = "prep"; G.ev.push({ k: "waveEnd", n: G.wave, bonus: WAVE_BONUS }); }
    }
  }

  function stepAir(G, c, C, dt) {
    if (c.state === "circle") {
      c.wait -= dt;
      c.x = c.sx + Math.cos(c.t * 4) * 0.35; c.y = c.sy + Math.sin(c.t * 4) * 0.2;
      if (c.wait <= 0) c.state = "dive";
    } else if (c.state === "dive") {
      c.d += C.speed * dt;
      if (c.d >= c.L) { c.d = c.L; c.state = "land"; c.wait = LAND; }
    } else if (c.state === "land") {
      // シート の はし に おりて、きょろきょろ（カラス は ようじんぶかい）してから とる
      c.wait -= dt;
      if (c.wait <= 0) steal(G, c);
    } else if (c.state === "home" || c.state === "carry") {
      c.d -= C.speed * 1.3 * dt;
      if (c.d <= -1.2) c.state = "gone";
    }
    if (c.state !== "circle") { c.x = c.sx + c.dx * c.d; c.y = c.sy + c.dy * c.d; }
  }

  function steal(G, c) {
    c.state = "carry";
    if (G.bento > 0) {
      G.bento--; G.stolen++; c.carry = true;
      G.stolenBy[c.type] = (G.stolenBy[c.type] || 0) + 1;
      G.ev.push({ k: "steal", c, left: G.bento });
    }
  }

  /* ---------- じどう で おく（ソルバー・デバッグ フック 用） ---------- */
  // これから くる いきもの の おもさ
  function upcoming(G) {
    const w = { ant: 0, pigeon: 0, crow: 0, squirrel: 0 }, byPath = {};
    const add = (type, path, n) => {
      const v = n * CREATURES[type].gauge;
      w[type] += v;
      if (!CREATURES[type].air) { const k = type + ":" + (path % G.park.paths.length); byPath[k] = (byPath[k] || 0) + v; }
    };
    if (G.phase === "wave") for (const q of G.queue) add(q.type, q.path, 1);
    for (let i = G.wave; i < G.stage.waves.length; i++) for (const [type, n, , , p] of G.stage.waves[i]) add(type, p, n);
    return { w, byPath };
  }

  // どうぐ が ある マス に おいた とき に、いきもの の けいろ を どれだけ カバー する か
  function coverage(G, type, x, y) {
    const T = TOOLS[type], cx = x + 0.5, cy = y + 0.5, out = {};
    G.park.paths.forEach((path, pi) => {
      let n = 0;
      const L = path.length - 1;
      for (let s = 0; s <= L; s += 0.25) { const p = pathPos(path, s); if (Math.hypot(p.x - cx, p.y - cy) <= T.range) n++; }
      out[pi] = n * 0.25;
    });
    // そら: 8ほうこう から シート へ の せん
    let air = 0;
    for (let a = 0; a < 16; a++) {
      const ang = a * Math.PI / 8, sx = CENTER.x + Math.cos(ang) * 7, sy = CENTER.y + Math.sin(ang) * 7;
      for (let d = 0; d <= 5.5; d += 0.25) {
        const px = sx + (CENTER.x - sx) * d / 7, py = sy + (CENTER.y - sy) * d / 7;
        if (Math.hypot(px - cx, py - cy) <= T.range) air += 0.25;
      }
    }
    // おりる ばしょ（シート の まんなか から 1.5）で きょろきょろ して いる あいだ も ねらえる
    let land = 0;
    for (let a = 0; a < 16; a++) {
      const ang = a * Math.PI / 8;
      if (Math.hypot(CENTER.x + Math.cos(ang) * 1.5 - cx, CENTER.y + Math.sin(ang) * 1.5 - cy) <= T.range) land++;
    }
    out.air = air / 16 + (land / 16) * LAND * CREATURES.crow.speed;
    return out;
  }

  // じどう で 1こ おく。おいた ら true
  function autoPlaceOne(G, opt) {
    opt = opt || {};
    const up = upcoming(G);
    const total = Object.values(up.w).reduce((a, b) => a + b, 0);
    if (!total) return false;
    // いま の まもり（みち/そら × いきもの ごと の びっくり/びょう × カバー の ながさ）
    const have = {};
    const cov = G._cov || (G._cov = new Map());
    const covOf = (type, x, y) => { const k = type + K(x, y); if (!cov.has(k)) cov.set(k, coverage(G, type, x, y)); return cov.get(k); };
    const contrib = (type, x, y) => {
      const T = TOOLS[type], cv = covOf(type, x, y), out = {};
      for (const ct of CTYPES) {
        const pw = T.power[ct]; if (!pw) continue;
        const C = CREATURES[ct];
        if (C.air) out[ct + ":air"] = cv.air / C.speed * pw / T.cd;
        else G.park.paths.forEach((_, pi) => { const sp = ct === "pigeon" ? 0.95 : C.speed * (T.slow ? T.slow : 1); out[ct + ":" + pi] = cv[pi] / sp * pw / T.cd; });
      }
      return out;
    };
    for (const t of G.tools) { const c = contrib(t.type, t.x, t.y); for (const k in c) have[k] = (have[k] || 0) + c[k]; }
    const need = {};
    for (const ct of CTYPES) {
      if (CREATURES[ct].air) { if (up.w[ct]) need[ct + ":air"] = up.w[ct]; }
      else G.park.paths.forEach((_, pi) => { const v = up.byPath[ct + ":" + pi]; if (v) need[ct + ":" + pi] = v; });
    }
    const want = opt.want || 2.2;   // ひつよう な まもり の めやす（ゲージ の なんばい か）
    let best = null;
    for (const type of G.stage.tools) {
      const T = TOOLS[type];
      if (T.cost > G.coins) continue;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!canPlace(G, x, y)) continue;
        const c = contrib(type, x, y);
        let score = 0;
        for (const k in c) {
          if (!need[k]) continue;
          const ct = k.split(":")[0];
          const target = want * CREATURES[ct].gauge * (opt.mult && opt.mult[ct] || 1);
          const h = have[k] || 0;
          const gain = Math.min(c[k], Math.max(0, target - h));
          score += gain * need[k] / CREATURES[ct].gauge + c[k] * 0.02;
        }
        score /= Math.pow(T.cost, opt.costExp == null ? 0.7 : opt.costExp);
        if (opt.jitter) score *= 1 + (opt.jitter() - 0.5) * 0.3;
        if (score > 0 && (!best || score > best.score)) best = { type, x, y, score };
      }
    }
    if (!best || best.score < (opt.minScore || 0.01)) return false;
    return !!place(G, best.type, best.x, best.y);
  }
  // カラス が おりる ばしょ（16ほうこう）を ぜんぶ かさ で まもる
  function umbrellaRing(G) {
    if (!G.stage.tools.includes("umbrella") || !upcoming(G).w.crow) return 0;
    const R = TOOLS.umbrella.range, pts = [];
    for (let a = 0; a < 16; a++) { const ang = a * Math.PI / 8; pts.push([CENTER.x + Math.cos(ang) * 1.5, CENTER.y + Math.sin(ang) * 1.5]); }
    const covered = (x, y) => pts.map((p) => Math.hypot(p[0] - x - 0.5, p[1] - y - 0.5) <= R);
    const have = pts.map(() => false);
    for (const t of G.tools) if (t.type === "umbrella") covered(t.x, t.y).forEach((v, i) => { if (v) have[i] = true; });
    let n = 0;
    while (have.some((v) => !v) && G.coins >= TOOLS.umbrella.cost) {
      let best = null;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!canPlace(G, x, y)) continue;
        const v = covered(x, y).filter((q, i) => q && !have[i]).length;
        if (v && (!best || v > best.v)) best = { x, y, v };
      }
      if (!best) break;
      place(G, "umbrella", best.x, best.y);
      covered(best.x, best.y).forEach((v, i) => { if (v) have[i] = true; });
      n++;
    }
    return n;
  }
  function autoPlace(G, opt) {
    let n = 0;
    if (opt && opt.ring) n += umbrellaRing(G);
    while (n < 40 && autoPlaceOne(G, opt)) n++;
    return n;
  }

  // さいご まで じどう で あそぶ（ソルバー）
  function play(stageNo, seed, opt) {
    opt = opt || {};
    const G = newGame(stageNo, seed);
    const dt = 0.05;
    let guard = 0;
    while (G.phase !== "done" && guard++ < 200000) {
      if (G.phase === "prep") { if (!opt.idle) autoPlace(G, opt); startWave(G); }
      if (!opt.idle && guard % 20 === 0) autoPlace(G, opt);
      step(G, dt);
      G.ev.length = 0;
    }
    return { left: G.bento, stars: starsFor(G.bento), G };
  }
  function solve(stageNo, seed) {
    const tries = [
      {}, { ring: true }, { want: 3 }, { ring: true, want: 3 }, { ring: true, costExp: 1 }, { want: 1.6 }, { costExp: 1 }, { costExp: 0.4 }, { want: 3, costExp: 1 },
      { mult: { crow: 1.6 } }, { mult: { squirrel: 1.6 } }, { mult: { ant: 1.5 } }, { want: 2.6, mult: { crow: 1.5, squirrel: 1.4 } },
      { mult: { crow: 2.2 } }, { mult: { squirrel: 2.2 } }, { want: 4 }, { want: 3, mult: { crow: 2, squirrel: 2 } }, { costExp: 1, mult: { crow: 2 } },
    ];
    let best = null;
    for (let i = 0; i < 40; i++) {
      const o = Object.assign({}, tries[i] || {});
      if (i >= tries.length) { const jr = rng(seed * 13 + i); o.jitter = jr; o.ring = i % 2 === 0; o.want = 1.6 + jr() * 1.8; o.costExp = 0.4 + jr() * 0.6; }
      const res = play(stageNo, seed, o);
      if (!best || res.left > best.left) best = Object.assign(res, { opt: o, tries: i + 1 });
      if (res.stars === 3) break;
    }
    return best;
  }

  return {
    W, H, K, SHEET, CENTER, BENTO, CREATURES, CTYPES, TOOLS, TTYPES, REFUND, WAVE_BONUS, PARKS,
    rng, genPark, pathPos, newGame, canPlace, place, remove, refundOf, startWave, spawn, step, starsFor,
    inRange, upcoming, coverage, autoPlaceOne, autoPlace, umbrellaRing, play, solve,
  };
});
