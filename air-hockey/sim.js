// エアホッケー — しあいの すすめかた（サーブ・ゴール・アイテム・CPU）。がめん・おと とは べつ（node でも うごく）
(function (root) {
  "use strict";
  const NODE = typeof module !== "undefined" && module.exports;
  const P = NODE ? require("./physics.js") : root.AHPhys;
  const R = NODE ? require("./rules.js") : root.AHRules;
  const A = NODE ? require("./ai.js") : root.AHAI;
  const { TICK } = P;

  const ITEMS = [
    { kind: "multi", em: "🎱", name: "パックが 3つに！" },
    { kind: "big", em: "🍄", name: "マレットが おおきく！" },
    { kind: "narrow", em: "🥅", name: "ゴールが せまく！" },
    { kind: "ice", em: "🧊", name: "こおり！ パックが とまらない" },
    { kind: "wall", em: "🧱", name: "まんなかに かべ！" },
  ];
  const DUR = 10;               // こうかの ながさ（びょう）
  const GOAL_PAUSE = 1.6, START_PAUSE = 1.4, HALF_LIMIT = 10;

  // cfg: { target, ctrl: ["human"|"cpu", ...], levels: [n, n], items: bool, seed }
  function createGame(cfg) {
    const rng = P.rng(cfg.seed || (Date.now() >>> 0));
    const first = cfg.first === 0 || cfg.first === 1 ? cfg.first : (rng() < 0.5 ? 0 : 1);
    const G = {
      cfg, rng, world: P.createWorld(), match: R.createMatch(cfg.target, first),
      phase: "start", timer: START_PAUSE, ai: [{}, {}], out: [], time: 0,
      itemTimer: 5 + rng() * 5, itemLife: 0,
      fx: { big: [0, 0], narrow: [0, 0], ice: 0, wall: 0, multi: 0 },
      noHit: 0, acc: 0,
    };
    for (const s of [0, 1]) if (cfg.ctrl[s] === "cpu") G.world.mallets[s].maxV = A.LEVELS[cfg.levels[s]].speed;
    return G;
  }

  function serve(G, side) {
    const w = G.world, s = P.serveSpot(side);
    w.pucks = [];
    P.addPuck(w, s.x, s.y, 0, 0);
    P.resolve(w);
    G.phase = "play"; G.noHit = 0; G.half = -1; G.halfT = 0;
    G.out.push({ type: "serve", side });
  }

  function itemName(kind) { return ITEMS.find((i) => i.kind === kind); }
  function applyItem(G, kind, by) {
    const w = G.world;
    const side = by === 0 || by === 1 ? by : (G.rng() < 0.5 ? 0 : 1);
    if (kind === "multi") {
      const p = w.pucks[0];
      if (p && w.pucks.length < 3) P.splitPuck(w, p);
      G.fx.multi = DUR + 2;
    } else if (kind === "big") {
      G.fx.big[side] = DUR; P.setMalletR(w, side, P.MR * 1.45);
    } else if (kind === "narrow") {
      // とった ひとの ゴールが せまく なる（まもりやすい）
      G.fx.narrow[side] = DUR; w.goalW[side] = P.GW * 0.55;
    } else if (kind === "ice") {
      G.fx.ice = DUR; w.ice = true;
    } else if (kind === "wall") {
      G.fx.wall = DUR; P.setWall(w, true);
    }
    G.out.push({ type: "power", kind, side, info: itemName(kind) });
  }
  function clearFx(G) {
    const w = G.world;
    for (const s of [0, 1]) { G.fx.big[s] = 0; G.fx.narrow[s] = 0; w.goalW[s] = P.GW; P.setMalletR(w, s, P.MR); }
    G.fx.ice = 0; w.ice = false; G.fx.wall = 0; P.setWall(w, false); G.fx.multi = 0; w.item = null;
  }
  function stepFx(G) {
    const w = G.world, f = G.fx;
    for (const s of [0, 1]) {
      if (f.big[s] > 0 && (f.big[s] -= TICK) <= 0) { f.big[s] = 0; P.setMalletR(w, s, P.MR); G.out.push({ type: "fxEnd", kind: "big", side: s }); }
      if (f.narrow[s] > 0 && (f.narrow[s] -= TICK) <= 0) { f.narrow[s] = 0; w.goalW[s] = P.GW; G.out.push({ type: "fxEnd", kind: "narrow", side: s }); }
    }
    if (f.ice > 0 && (f.ice -= TICK) <= 0) { f.ice = 0; w.ice = false; G.out.push({ type: "fxEnd", kind: "ice" }); }
    if (f.wall > 0 && (f.wall -= TICK) <= 0) { f.wall = 0; P.setWall(w, false); G.out.push({ type: "fxEnd", kind: "wall" }); }
    if (f.multi > 0 && (f.multi -= TICK) <= 0) {
      f.multi = 0;
      // ふえた パックは きえる（1つは のこす）
      while (w.pucks.length > 1) {
        const i = w.pucks.findIndex((p) => p.extra);
        const k = i >= 0 ? i : w.pucks.length - 1;
        G.out.push({ type: "vanish", x: w.pucks[k].x, y: w.pucks[k].y });
        w.pucks.splice(k, 1);
      }
      if (w.pucks[0]) w.pucks[0].extra = false;
    }
  }
  function spawnItem(G) {
    const w = G.world, r = G.rng;
    const it = ITEMS[Math.floor(r() * ITEMS.length)];
    for (let k = 0; k < 10; k++) {
      const x = 0.22 + r() * 0.56, y = P.L / 2 + (r() < 0.5 ? -1 : 1) * (0.1 + r() * 0.12);
      if (w.pucks.every((p) => Math.hypot(p.x - x, p.y - y) > 0.15)) {
        w.item = { kind: it.kind, em: it.em, x, y, t: 0 };
        G.itemLife = 12;
        G.out.push({ type: "itemSpawn", kind: it.kind });
        return;
      }
    }
  }

  function tick(G) {
    const w = G.world, cfg = G.cfg;
    G.time += TICK;
    if (G.phase === "over") return;
    if (G.phase === "start" || G.phase === "goal") {
      G.timer -= TICK;
      if (G.timer <= 0) {
        if (G.match.winner >= 0) { G.phase = "over"; clearFx(G); G.out.push({ type: "over", winner: G.match.winner }); return; }
        serve(G, G.match.serve);
      }
    }
    for (const s of [0, 1]) if (cfg.ctrl[s] === "cpu") {
      const t = A.target(w, s, cfg.levels[s], G.ai[s], TICK, G.rng);
      w.mallets[s].tx = t.x; w.mallets[s].ty = t.y;
    }
    P.tick(w);
    for (const e of w.events) {
      if (e.type === "hit") G.noHit = 0;
      if (e.type === "goal") {
        R.goal(G.match, e.scorer);
        e.score = G.match.score.slice();
        e.winner = G.match.winner;
        if (G.match.winner >= 0 || w.pucks.length === 0) {
          w.pucks = [];
          G.phase = "goal"; G.timer = GOAL_PAUSE;
          e.last = true;
        }
      }
      G.out.push(e);
      if (e.type === "item") applyItem(G, e.kind, e.by);
    }
    w.events.length = 0;
    if (G.phase !== "play") return;
    stepFx(G);
    if (cfg.items) {
      if (w.item) {
        w.item.t += TICK;
        if ((G.itemLife -= TICK) <= 0) { w.item = null; G.out.push({ type: "itemGone" }); G.itemTimer = 4 + G.rng() * 4; }
      } else if ((G.itemTimer -= TICK) <= 0) {
        G.itemTimer = 7 + G.rng() * 7;
        spawnItem(G);
      }
    }
    // 10びょう ルール: パックが ずっと かたほう の じんち に ある（かどに はさまった・もった まま）と、あいてから さいかい
    if (w.pucks.length === 1) {
      const h = w.pucks[0].y > P.L / 2 ? 0 : 1;
      if (h !== G.half) { G.half = h; G.halfT = 0; }
      G.halfT += TICK;
      if (G.halfT > HALF_LIMIT) { G.out.push({ type: "reserve", side: h }); serve(G, 1 - h); }
    } else G.halfT = 0;
    // だれも さわらない まま 15びょう → パックを おきなおす（まんなかで とまって とどかない とき の ため）
    G.noHit += TICK;
    if (G.noHit > 15 && w.pucks.every((p) => Math.hypot(p.vx, p.vy) < 0.3)) {
      const p = w.pucks[0];
      serve(G, p && p.y < P.L / 2 ? 1 : 0);
    }
  }
  // フレームの ながさ（びょう）→ こてい ティック
  function update(G, dt) {
    G.acc += Math.min(dt, 0.25);
    let n = 0;
    while (G.acc >= TICK - 1e-9 && n < 60) { tick(G); G.acc -= TICK; n++; }
    if (n >= 60) G.acc = 0;
    return n;
  }
  function drain(G) { const o = G.out; G.out = []; return o; }

  // CPU どうし で 1しあい（テスト・バランス しらべ よう）
  function runCpuMatch(levels, target, items, seed, maxSec) {
    const G = createGame({ target, ctrl: ["cpu", "cpu"], levels, items, seed });
    const limit = (maxSec || 900) / TICK;
    let n = 0, hits = 0;
    while (G.phase !== "over" && n < limit) {
      tick(G); n++;
      for (const e of drain(G)) if (e.type === "hit") hits++;
    }
    return { done: G.phase === "over", winner: G.match.winner, score: G.match.score.slice(), sec: n * TICK, hits };
  }

  const api = { ITEMS, DUR, HALF_LIMIT, createGame, tick, update, drain, serve, applyItem, clearFx, runCpuMatch };
  if (NODE) module.exports = api;
  else root.AHSim = api;
})(this);
