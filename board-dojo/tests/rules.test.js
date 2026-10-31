// node --test board-dojo/tests/
const { test } = require("node:test");
const assert = require("node:assert/strict");
const R = require("../games/reversi.js");
const Go = require("../games/gomoku.js");
const T = require("../games/marubatsu.js");
const C4 = require("../games/yonnarabe.js");
const B = require("../games/hakotori.js");

// ばん を もじ で つくる（. から / x=1 / o=2）
const fromRows = (rows) => rows.join("").split("").map((ch) => (ch === "x" ? 1 : ch === "o" ? 2 : 0));

test("リバーシ: さいしょ は 4つ おける、8×8 と 6×6", () => {
  for (const N of [8, 6]) {
    const s = R.init({ size: N });
    assert.equal(R.moves(s).length, 4);
    assert.deepEqual(R.score(s), [0, 2, 2]);
    assert.equal(R.turn(s), 1);
  }
});

test("リバーシ: はさんだ コマ だけ が かえる（たて・よこ・ななめ）", () => {
  const s = R.init({ size: 8 });
  const m = 2 * 8 + 3; // d3
  assert.deepEqual(R.flips(s, m, 1), [3 * 8 + 3]);
  const n = R.play(s, m);
  assert.deepEqual(R.score(n), [0, 4, 1]);
  assert.equal(n.turn, 2);
  assert.throws(() => R.play(s, 0));
  // ななめ に 2まい
  const b = fromRows(["x.......", ".o......", "..o.....", "........", "........", "........", "........", "........"]);
  const t = { N: 8, b, turn: 1, passes: 0 };
  assert.deepEqual(R.flips(t, 27, 1).sort((a, b) => a - b), [9, 18]);
});

test("リバーシ: おけない とき は パス、りょうほう おけない と おわり", () => {
  // くろ の ばん: o x x _ … くろ は どこ にも はさめない、しろ は (0,3) に おける
  const s = { N: 8, b: fromRows(["oxx.....", "........", "........", "........", "........", "........", "........", "........"]), turn: 1, passes: 0 };
  assert.deepEqual(R.moves(s), [R.PASS]);
  assert.equal(R.result(s), null);
  const s2 = R.play(s, R.PASS);
  assert.equal(s2.turn, 2);
  assert.deepEqual(R.moves(s2), [3]);
  assert.throws(() => R.play(s2, R.PASS)); // おける のに パス は だめ
  const s3 = R.play(s2, 3);
  assert.equal(R.result(s3), 2); // しろ だけ に なって おわり
  // りょうほう おけない → おわり（かず の おおい ほう の かち）
  const s4 = { N: 8, b: fromRows(["xx......", "........", "........", "........", "........", "........", "........", "......o."]), turn: 1, passes: 0 };
  assert.equal(R.legal(s4, 1).length, 0);
  assert.equal(R.legal(s4, 2).length, 0);
  assert.equal(R.result(s4), 1);
  assert.deepEqual(R.moves(s4), []);
  // パス → パス でも おわり
  const s5 = { N: 8, b: fromRows(["x.......", "........", "........", "........", "........", "........", "........", "......o."]), turn: 1, passes: 0 };
  assert.equal(R.result(s5), 0);
  assert.equal(R.result({ ...R.init({ size: 8 }), passes: 2 }), 0);
  // ぜんぶ うまる と おわり
  const full = { N: 6, b: new Array(36).fill(0).map((x, i) => (i < 20 ? 1 : 2)), turn: 1, passes: 0 };
  assert.equal(R.result(full), 1);
});

test("リバーシ: ランダム に さいご まで うつ と、かならず おわり の ばんめん に なる", () => {
  for (let g = 0; g < 300; g++) {
    let s = R.init({ size: g % 2 ? 6 : 8 });
    let k = 0;
    while (R.result(s) === null) {
      const ms = R.moves(s);
      assert.ok(ms.length > 0);
      s = R.play(s, ms[(g * 7 + k++ * 13) % ms.length]);
      assert.ok(k < 200);
    }
    const c = R.score(s);
    assert.ok(c[1] + c[2] <= s.N * s.N);
  }
});

test("ごもく: たて・よこ・ななめ 2ほうこう で 5つ ならぶ と かち、4つ は まだ", () => {
  const N = 15;
  const lines = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of lines) {
    let s = Go.init({ size: N });
    const r0 = 5, c0 = 7;
    for (let k = 0; k < 5; k++) {
      s = Go.play(s, (r0 + k * dr) * N + c0 + k * dc); // くろ
      if (k < 4) {
        assert.equal(Go.result(s), null, `4つ まで は つづく ${dr},${dc}`);
        s = Go.play(s, 14 * N + k); // しろ は はしっこ
      }
    }
    assert.equal(Go.result(s), 1, `5つ で かち ${dr},${dc}`);
    assert.equal(s.line.length, 5);
    assert.deepEqual(Go.moves(s), []);
  }
  // 6つ でも かち（かんたん ルール）
  const b = new Array(81).fill(0);
  [0, 1, 2, 4, 5].forEach((c) => (b[c] = 1));
  const s = { N: 9, b, turn: 1, n: 5, win: 0, ban33: false };
  assert.equal(Go.result(Go.play(s, 3)), 1);
  // 9×9 が うまったら ひきわけ
  assert.equal(Go.result({ N: 9, b: new Array(81).fill(1), n: 81, win: 0 }), 0);
});

test("ごもく: 三三 きんし（せってい ON の とき だけ）、5つ に なる なら おいて よい", () => {
  const N = 15, b = new Array(N * N).fill(0);
  // ・x x _ ・ の よこ と たて が まじわる ところ
  const at = (r, c) => r * N + c;
  b[at(7, 5)] = 1; b[at(7, 6)] = 1; // よこ
  b[at(5, 7)] = 1; b[at(6, 7)] = 1; // たて
  const off = { N, b, turn: 1, n: 4, win: 0, ban33: false };
  const on = { ...off, ban33: true };
  assert.equal(Go.isForbidden(off, at(7, 7), 1), false);
  assert.equal(Go.isForbidden(on, at(7, 7), 1), true);
  assert.ok(!Go.moves(on).includes(at(7, 7)));
  assert.ok(Go.moves(off).includes(at(7, 7)));
  assert.throws(() => Go.play(on, at(7, 7)));
  // かたほう が ふさがれて いれば 三三 では ない
  const b2 = b.slice(); b2[at(7, 4)] = 2;
  assert.equal(Go.isForbidden({ ...on, b: b2 }, at(7, 7), 1), false);
  // 5つ に なる て は きんし でも OK
  const b3 = b.slice(); b3[at(7, 3)] = 1; b3[at(7, 4)] = 1;
  assert.equal(Go.isForbidden({ ...on, b: b3 }, at(7, 7), 1), false);
  // 三四 は きんし では ない
  const b4 = b.slice(); b4[at(7, 4)] = 1; // よこ が 4 に なる
  assert.equal(Go.isForbidden({ ...on, b: b4 }, at(7, 7), 1), false);
});

test("まるばつ: たて・よこ・ななめ、うまって ひきわけ", () => {
  const play = (seq) => seq.reduce((s, m) => T.play(s, m), T.init());
  assert.equal(T.result(play([0, 3, 1, 4, 2])), 1);
  assert.equal(T.result(play([0, 1, 3, 2, 6])), 1);
  assert.equal(T.result(play([1, 0, 2, 4, 3, 8])), 2);
  assert.equal(T.result(play([0, 2, 1, 4, 3, 6])), 2);
  assert.equal(T.result(play([0, 1, 2, 4, 3, 5, 7, 6, 8])), 0);
  assert.throws(() => T.play(play([0]), 0));
  assert.throws(() => T.play(play([0, 3, 1, 4, 2]), 8));
});

test("4つならべ: した から つもる、たて よこ ななめ、まんぱい で ひきわけ", () => {
  const play = (seq, s = C4.init()) => seq.reduce((st, m) => C4.play(st, m), s);
  let s = play([3, 3]);
  assert.equal(s.b[3], 1); assert.equal(s.b[7 + 3], 2);
  assert.equal(C4.result(play([0, 1, 0, 1, 0, 1, 0])), 1); // たて
  assert.equal(C4.result(play([0, 0, 1, 1, 2, 2, 3])), 1); // よこ
  assert.equal(C4.result(play([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3])), 1); // ななめ ／
  assert.equal(C4.result(play([6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3])), 1); // ななめ ＼
  // れつ が いっぱい なら おけない
  s = play([0, 0, 0, 0, 0, 0]);
  assert.ok(!C4.moves(s).includes(0));
  assert.throws(() => C4.play(s, 0));
  // かち の ない まんぱい = ひきわけ（たね つき ランダム で ひきわけ に なる てじゅん を さがす）
  let draw = null;
  for (let g = 1; g < 50000 && !draw; g++) {
    let t = C4.init(), x = g;
    while (C4.result(t) === null) {
      const ms = C4.moves(t);
      x = (x * 1103515245 + 12345) % 2147483648;
      t = C4.play(t, ms[x % ms.length]);
    }
    if (C4.result(t) === 0) draw = t;
  }
  assert.ok(draw, "ひきわけ の きょくめん が ある");
  assert.equal(draw.n, 42);
  assert.deepEqual(C4.moves(draw), []);
  assert.ok(draw.h.every((h) => h === 6));
});

test("はこ とり: 4へん め で とって もう いちど、2こ いっぺん に も とれる", () => {
  let s = B.init({ size: 2 }); // 2×2 = 12ほん
  assert.equal(B.moves(s).length, 12);
  const g = B.geo(2, 2);
  const [top, bottom, left, right] = g.boxEdges[0];
  s = B.play(s, top); assert.equal(s.turn, 2);
  s = B.play(s, left); assert.equal(s.turn, 1);
  s = B.play(s, bottom); assert.equal(s.turn, 2);
  s = B.play(s, right); // 2 が とる
  assert.equal(s.turn, 2, "とったら もう いちど");
  assert.deepEqual(B.score(s), [0, 0, 1]);
  assert.equal(s.box[0], 2);
  // まんなか の せん で 2こ どうじ
  let t = B.init({ size: 2 });
  const b0 = g.boxEdges[0], b1 = g.boxEdges[1];
  const shared = b0.find((e) => b1.includes(e));
  const others = [...new Set([...b0, ...b1])].filter((e) => e !== shared);
  for (const e of others) t = { ...B.play(t, e), turn: 1 };
  t = B.play(t, shared);
  assert.deepEqual(B.score(t), [0, 2, 0]);
  assert.deepEqual(t.got.sort(), [0, 1]);
  assert.equal(t.turn, 1);
  // ぜんぶ ひいたら おわり
  let u = B.init({ size: 3 });
  let k = 0;
  while (B.result(u) === null) { u = B.play(u, B.moves(u)[(k++ * 5) % B.moves(u).length]); }
  assert.equal(u.n, 24);
  assert.equal(u.sc[1] + u.sc[2], 9);
  assert.equal(B.result(u), u.sc[1] > u.sc[2] ? 1 : 2);
  assert.throws(() => B.play(B.play(B.init({ size: 2 }), 0), 0));
});
