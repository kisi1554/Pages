// node --test board-dojo/tests/
const { test } = require("node:test");
const assert = require("node:assert/strict");
const AI = require("../ai.js");
const GAMES = {
  reversi: require("../games/reversi.js"),
  gomoku: require("../games/gomoku.js"),
  marubatsu: require("../games/marubatsu.js"),
  yonnarabe: require("../games/yonnarabe.js"),
  hakotori: require("../games/hakotori.js")
};
const VARIANTS = {
  reversi: [{ size: 8 }, { size: 6 }],
  gomoku: [{ size: 15 }, { size: 9 }, { size: 9, ban33: true }, { size: 15, ban33: true }],
  marubatsu: [{}],
  yonnarabe: [{}],
  hakotori: [{ size: 2 }, { size: 3 }, { size: 4 }]
};

test("まるばつ: つよい CPU は どんな あいて にも ぜったい まけない（そうあたり）", () => {
  const T = GAMES.marubatsu;
  let positions = 0, games = 0;
  // cpu の ばん は「えらぶ かもしれない て ぜんぶ」、あいて の ばん は「おける て ぜんぶ」を ためす
  const walk = (s, cpu) => {
    const r = T.result(s);
    if (r !== null) { games++; assert.notEqual(r, 3 - cpu, "CPU が まけた: " + s.b.join("")); return; }
    positions++;
    if (T.turn(s) === cpu) {
      const ms = T.perfectMoves(s);
      assert.ok(ms.length > 0);
      for (const m of ms) { assert.ok(T.moves(s).includes(m)); walk(T.play(s, m), cpu); }
    } else for (const m of T.moves(s)) walk(T.play(s, m), cpu);
  };
  walk(T.init(), 1);
  walk(T.init(), 2);
  assert.ok(games > 1000, `${games} きょく`);
  // chooseMove(つよい) も perfectMoves から えらぶ
  const r = AI.rng(1);
  for (let k = 0; k < 200; k++) {
    let s = T.init();
    while (T.result(s) === null) {
      const m = T.turn(s) === 1 ? AI.chooseMove(T, s, 4, r) : T.moves(s)[Math.floor(r() * T.moves(s).length)];
      s = T.play(s, m);
    }
    assert.notEqual(T.result(s), 2);
  }
  // さいしょ の きょくめん は ひきわけ
  assert.equal(T.perfectValue(T.init()), 0);
});

test("CPU は はんそく しない: ランダム たいきょく 1まん きょく（ぜんぶ の ゲーム・つよさ）", () => {
  const ids = Object.keys(GAMES);
  const total = 10000;
  let played = 0, cpuMoves = 0;
  const r = AI.rng(12345);
  const t0 = Date.now();
  for (let g = 0; g < total; g++) {
    const id = ids[g % ids.length], G = GAMES[id];
    const vs = VARIANTS[id];
    const opts = vs[Math.floor(g / ids.length) % vs.length];
    const lvA = 1 + (g % 4), lvB = 1 + ((g >> 2) % 5); // 5 = ランダム な あいて
    let s = G.init(opts), n = 0;
    while (G.result(s) === null) {
      const legal = G.moves(s);
      assert.ok(legal.length > 0, `${id} うてる て が ない のに おわらない`);
      const lv = G.turn(s) === 1 ? lvA : lvB;
      let m;
      if (lv === 5) m = legal[Math.floor(r() * legal.length)];
      else {
        // テスト を はやく する ため に じかん を みじかく（えらびかた は おなじ）
        m = AI.chooseMove(G, s, lv, r, { timeMs: 2, maxDepth: lv === 4 ? 3 : undefined });
        cpuMoves++;
        assert.ok(legal.includes(m), `${id} lv${lv} の CPU が はんそく: ${m}`);
      }
      s = G.play(s, m);
      assert.ok(++n < 400, `${id} が おわらない`);
    }
    played++;
  }
  assert.equal(played, total);
  console.log(`  ${played} きょく / CPU の て ${cpuMoves} / ${((Date.now() - t0) / 1000).toFixed(1)}びょう`);
});

test("つよい CPU は 1て 1びょう いない（とちゅう の きょくめん）", () => {
  const r = AI.rng(7);
  for (const id of Object.keys(GAMES)) {
    const G = GAMES[id];
    for (const opts of VARIANTS[id]) {
      let s = G.init(opts), worst = 0;
      // すこし すすめた とちゅう の きょくめん から
      for (let k = 0; k < 6 && G.result(s) === null; k++) s = G.play(s, AI.chooseMove(G, s, 1, r));
      for (let k = 0; k < 4 && G.result(s) === null; k++) {
        const t = Date.now();
        const m = AI.chooseMove(G, s, 4, r);
        worst = Math.max(worst, Date.now() - t);
        s = G.play(s, m);
      }
      assert.ok(worst < 1000, `${id} ${JSON.stringify(opts)} ${worst}ms`);
    }
  }
});

test("つよい CPU は ふつう・ランダム に まけこさない", () => {
  const r = AI.rng(99);
  for (const id of ["reversi", "yonnarabe", "gomoku", "hakotori"]) {
    const G = GAMES[id];
    let win = 0, lose = 0;
    for (let g = 0; g < 4; g++) {
      let s = G.init(VARIANTS[id][id === "gomoku" ? 1 : 0]);
      const strong = 1 + (g % 2);
      while (G.result(s) === null) s = G.play(s, AI.chooseMove(G, s, G.turn(s) === strong ? 4 : 1, r, { timeMs: 150 }));
      const res = G.result(s);
      if (res === strong) win++; else if (res === 3 - strong) lose++;
    }
    assert.ok(win >= 3 && lose === 0, `${id} win ${win} lose ${lose}`);
  }
});

test("ヒント: かつ・ふさぐ を みつけて りゆう を いう", () => {
  const Go = GAMES.gomoku, N = 9;
  let s = Go.init({ size: N });
  // くろ 4つ（よこ）、しろ の ばん → ふさぐ
  for (const [m, w] of [[40, 0], [41, 1], [42, 2], [43, null]]) { s = Go.play(s, m); if (w !== null) s = Go.play(s, w); }
  const hb = AI.bestMoves(Go, s, 300);
  assert.ok(hb.moves.every((m) => m === 39 || m === 44), "ふさぐ " + hb.moves);
  assert.match(Go.reason(s, hb.moves[0]), /ふさがない と/);
  // しろ が ふさいだ あと、くろ の ばん → くろ は 4つ の もう かたほう で かち
  const s2 = Go.play(s, 44);
  const hw = AI.bestMoves(Go, s2, 300);
  assert.deepEqual(hw.moves, [39]);
  assert.match(Go.reason(s2, 39), /かち/);

  const C = GAMES.yonnarabe;
  let c = [0, 1, 0, 1, 0].reduce((st, m) => C.play(st, m), C.init());
  const hc = AI.bestMoves(C, c, 300);
  assert.deepEqual(hc.moves, [0]);
  assert.match(C.reason(c, 0), /4つ ならべちゃう/);

  const R = GAMES.reversi, rs = R.init({ size: 8 });
  assert.match(R.reason(rs, 19), /1まい かえせる/);

  const T = GAMES.marubatsu;
  const t = [0, 4, 1].reduce((st, m) => T.play(st, m), T.init());
  assert.deepEqual(AI.bestMoves(T, t).moves, [2]);
  assert.match(T.reason(t, 2), /ふさがない/);

  const B = GAMES.hakotori;
  let b = B.init({ size: 2 });
  const [top, , left, right] = B.geo(2, 2).boxEdges[0];
  b = B.play(B.play(B.play(b, top), left), right);
  assert.match(B.reason(b, B.geo(2, 2).boxEdges[0][1]), /とれる/);
});

test("ふりかえり: おおきな まちがい の て を みつけて、よい て を おしえる", () => {
  const T = GAMES.marubatsu;
  // せんて ○ が まんなか、ごて × が へん（1）に おく → ○ が かてる。 × の 1 が まちがい
  const moves = [4, 1, 0, 8, 6, 2, 3];
  const states = [T.init()];
  moves.forEach((m) => states.push(T.play(states[states.length - 1], m)));
  const vals = states.map((s) => AI.valueOf(T, s, 50));
  const ms = AI.findMistakes(T, states, moves, vals, (p) => p === 2);
  assert.ok(ms.length >= 1);
  assert.equal(ms[0].i, 1);
  assert.ok([0, 2, 6, 8].includes(ms[0].better));

  const C = GAMES.yonnarabe;
  // ごて が 3つ ならび を ふさがない
  const cm = [3, 0, 3, 6, 3, 6];
  const cs = [C.init()];
  cm.forEach((m) => cs.push(C.play(cs[cs.length - 1], m)));
  const cv = cs.map((s) => AI.valueOf(C, s, 80));
  const cmist = AI.findMistakes(C, cs, cm, cv, (p) => p === 2);
  assert.ok(cmist.some((x) => x.i === 5 && x.better === 3), JSON.stringify(cmist));
});
