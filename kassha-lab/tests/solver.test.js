// node --test kassha-lab/tests/*.test.js
// つりあいの ソルバー・もんだいの こたえ・くみたて パズル・たいけん を たしかめる
const { test } = require("node:test");
const assert = require("node:assert/strict");
const S = require("../solver.js");
const L = require("../levels.js");
const { PROBLEMS } = require("../problems.js");

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} ≠ ${b}`);
const C = { t: "ceil", y: 20 };

test("もんだいは 20もん いじょう。ぜんぶ ソルバーの こたえ と ans が おなじ", () => {
  assert.ok(PROBLEMS.length >= 20, `もんだいの かず ${PROBLEMS.length}`);
  PROBLEMS.forEach((p) => {
    const v = S.ask(p.sys, p.ask);
    assert.ok(v != null, `#${p.id} ソルバーが とけない`);
    near(v, p.ans, `#${p.id} ${p.title}`);
    assert.ok(p.hints.length >= 3, `#${p.id} ヒントは 3だんかい`);
    assert.ok(p.text.includes("□"), `#${p.id} もんだいぶんに □`);
    assert.ok(["g", "cm"].includes(p.unit), `#${p.id} たんい`);
    assert.ok(/\{[^|}]+\|[^}]+\}/.test(p.text), `#${p.id} ふりがな つき`);
  });
});

test("てけいさん と てらしあわせ（だいひょうてきな もんだい）", () => {
  const byTitle = (t) => PROBLEMS.find((p) => p.title === t);
  const v = (t) => S.ask(byTitle(t).sys, byTitle(t).ask);
  near(v("{定滑車|ていかっしゃ}"), 40, "定滑車: 引く力＝おもり");
  near(v("{動滑車|どうかっしゃ}"), 60 / 2, "軽い動滑車: 60÷2");
  near(v("{重|おも}さの ある {動滑車|どうかっしゃ}"), (60 + 20) / 2, "動滑車1こ・おもさあり: (60+20)÷2");
  near(v("{引|ひ}く {長|なが}さ"), 30 / 2, "動滑車: 30cm 引くと 15cm");
  near(v("{定滑車|ていかっしゃ}を ささえる {力|ちから}"), 2 * ((80 + 20) / 2) + 10, "定滑車を ささえる: 2T＋10");
  near(v("{重|おも}さの ある {動滑車|どうかっしゃ} 2こ"), ((110 + 10) / 2 + 10) / 2, "組み合わせ: ((110+10)÷2+10)÷2");
  near(v("ひも A の {力|ちから}"), (110 + 10) / 2, "ひもA");
  near(v("{動滑車|どうかっしゃ} 3こ"), 160 / 8, "動滑車3こ");
  near(v("{動滑車|どうかっしゃ} 3こ と {長|なが}さ"), 5 * 8, "動滑車3こ: 5cm × 8");
  near(v("3本で ささえる"), 90 / 3, "3本");
  near(v("2れんの {動滑車|どうかっしゃ}"), (120 + 20) / 4, "4本");
  near(v("{輪軸|りんじく}"), 60 * 10 / 30, "輪軸: 60×10÷30");
  near(v("{輪軸|りんじく}と {動滑車|どうかっしゃ}"), (120 / 2) * 10 / 30, "輪軸＋動滑車");
  near(v("ゴンドラ"), 90 / 2, "ゴンドラ");
  near(v("{何|なん}g まで {持|も}ち{上|あ}がる？"), 25 * 2 - 10, "ぎゃく: 25×2−10");
  near(v("{動滑車|どうかっしゃ}の {重|おも}さ"), 30 * 2 - 50, "ぎゃく: 30×2−50");
  near(v("{棒|ぼう}を つるす"), 60 * 20 / 60, "棒: 60×20÷60");
  near(v("おもりの {位置|いち}"), 45 * 60 / 60, "棒: 45×60÷60");
  near(v("{重|おも}さの ある {棒|ぼう}"), (80 * 60 + 20 * 40) / 80, "おもさの ある 棒");
  near(v("{天井|てんじょう} ぜんたい"), 80 + 20, "天井ぜんたい＝おもり＋手の力");
});

test("しごとの げんり: ちから × ひく ながさ ＝ もちあげた おもさ × たかさ（ぜんぶの もんだい）", () => {
  PROBLEMS.forEach((p) => {
    const r = S.solve(p.sys);
    assert.ok(r.ok, `#${p.id} とける`);
    if (r.hand == null) return;
    // て を 1 ひくと: F × 1 ＝ Σ m × (うえへの うごき)
    let work = 0;
    Object.entries(p.sys.bodies).forEach(([id, b]) => {
      if (!b.m || b.t === "fixed" || b.t === "ceil" || b.t === "wheel") return;
      const x = b.t === "bar" ? (b.mx != null ? b.mx : (b.x1 + b.x2) / 2) : b.x;
      work += b.m * S.liftOf(r, id, x);
    });
    near(r.hand * 1, work, `#${p.id} しごと`);
  });
});

test("ソルバー: しくみが おかしい ときは エラー", () => {
  // おもりに ひもが ない → おちる
  let r = S.solve({ bodies: { c: C, w: { t: "weight", x: 100, y: 300, m: 10 } }, ropes: [] });
  assert.equal(r.err.code, "fall");
  // てんじょう から 2本 → ちからが きまらない
  r = S.solve({ bodies: { c: C, w: { t: "weight", x: 100, y: 300, m: 10 } },
    ropes: [{ id: "A", pts: [{ b: "c", x: 90 }, { b: "w", dx: -10 }] }, { id: "B", pts: [{ b: "c", x: 110 }, { b: "w", dx: 10 }] }] });
  assert.equal(r.err.code, "many");
  // 滑車の よこを とおる（うえ と した） → wrapSide
  r = S.solve({ bodies: { c: C, m: { t: "move", x: 100, y: 200, r: 20 }, w: { t: "weight", x: 100, y: 300, m: 10 } },
    ropes: [{ id: "A", pts: [{ b: "c", x: 80 }, { b: "m" }, { b: "w" }] }] });
  assert.equal(r.err.code, "wrapSide");
  // 滑車を はしに しない
  r = S.solve({ bodies: { c: C, f: { t: "fixed", x: 100, y: 70, r: 20 }, w: { t: "weight", x: 80, y: 300, m: 10 } },
    ropes: [{ id: "A", pts: [{ b: "w" }, { b: "f" }] }] });
  assert.equal(r.err.code, "wrapEnd");
  // ひもが たるむ（したから おしあげる ことは できない）
  r = S.solve({ bodies: { c: C, m: { t: "move", x: 100, y: 200, r: 20, m: 0 }, w: { t: "weight", x: 100, y: 120, m: 10 } },
    ropes: [{ id: "A", pts: [{ b: "w" }, { b: "m", hook: 1 }] }, { id: "B", pts: [{ b: "c", x: 60 }, { b: "m", hook: 1 }] }] });
  assert.ok(!r.ok);
});

test("ソルバー: ひもの ちからは どこでも おなじ・天井の ささえ", () => {
  const sys = { bodies: { c: C, f: { t: "fixed", x: 200, y: 70, r: 20, m: 5 }, m: { t: "move", x: 160, y: 230, r: 20, m: 20 },
    w: { t: "weight", x: 160, y: 280, m: 60, hang: "m" }, h: { t: "hand", y: 300 } },
    ropes: [{ id: "A", pts: [{ b: "c", x: 140 }, { b: "m" }, { b: "f" }, { b: "h" }] }] };
  const r = S.solve(sys);
  near(r.T.A, 40, "張力"); near(r.hand, 40, "て");
  near(S.supportOf(r, "f"), 2 * 40 + 5, "定滑車");
  near(S.supportOf(r, "c"), 40 + 85, "天井ぜんぶ");
  near(S.liftOf(r, "w"), 0.5, "ひく ながさ の はんぶん あがる");
  assert.equal(r.handDir, "down");
});

test("たいけん: 定滑車 1・動滑車 2・定＋動 2・動滑車2こ 4・3こ 8・輪軸 3", () => {
  const want = { fixed: [1, "down"], move: [2, "up"], fixmove: [2, "down"], move2: [4, "down"], move3: [8, "down"], wheel: [3, "down"] };
  assert.equal(L.TAIKEN.list.length, 6);
  L.TAIKEN.list.forEach((t) => {
    L.TAIKEN.weights.forEach((W) => {
      const sys = JSON.parse(JSON.stringify(t.sys)); sys.bodies.w.m = W;
      const r = S.solve(sys);
      assert.ok(r.ok, t.id);
      near(r.hand, W / want[t.id][0], `${t.id} ${W}g の ちから`);
      near(1 / S.liftOf(r, "w"), want[t.id][0], `${t.id} ひく ながさ の ばい`);
      assert.equal(r.handDir, want[t.id][1], `${t.id} ひく むき`);
      // 48cm ひいても ぶつからない（おもりの あがる たかさ が はいる）
      assert.ok(Number.isInteger(L.TAIKEN.pullMax * S.liftOf(r, "w")), `${t.id} あがる たかさ が せいすう`);
    });
  });
});

test("くみたて: 12ステージ。こたえの れい で クリア、まちがった れい は しっぱい", () => {
  assert.equal(L.STAGES.length, 12);
  L.STAGES.forEach((st, i) => {
    const out = L.evaluate(st, st.sol);
    assert.equal(out.code, "clear", `#${i + 1} ${st.name}`);
    assert.ok(out.F <= st.Fmax + 1e-9 && out.pull <= st.reach + 1e-9, `#${i + 1}`);
    assert.equal(L.stars(st, st.sol), 3, `#${i + 1} ★3`);
    const n = st.sol.fixed.length, m = st.sol.move.length, r = st.sol.ropes.length;
    assert.ok(n <= st.tb.f && m <= st.tb.m && r <= st.tb.r, `#${i + 1} どうぐばこ で たりる`);
    // 1本ずつ、おなじ 車には 1かい だけ
    const wraps = st.sol.ropes.flat().filter((p) => p.b !== "c" && p.b !== "w" && p.b !== "h" && !p.hook).map((p) => p.b);
    assert.equal(new Set(wraps).size, wraps.length, `#${i + 1} おなじ 滑車に 2かい かけない`);
  });
  const st = (n) => L.STAGES[n - 1];
  const one = { fixed: [160], move: [0], ropes: [[{ b: "c", x: 100 }, { b: "m0" }, { b: "f0" }, { b: "h" }]] };
  // 1: 定滑車 なしで まっすぐ うえ → うえには ひけない
  assert.equal(L.evaluate(st(1), { fixed: [], move: [], ropes: [[{ b: "w" }, { b: "h" }]] }).code, "up");
  // 5: 動滑車 1こ だけ → 30 で おもすぎる
  const r5 = L.evaluate(st(5), one);
  assert.equal(r5.code, "heavy"); near(r5.F, 30, "#5 の ちから");
  // 6: 動滑車 2こ → ちからは 10 だけど 120cm ひく → とどかない
  const r6 = L.evaluate(st(6), L.STAGES[4].sol);
  assert.equal(r6.code, "long"); near(r6.pull, 120, "#6 の ひく ながさ");
  // 8: 滑車 20 の とき 動滑車 1こ → (60+20)/2 = 40
  const r8 = L.evaluate(st(8), { fixed: [180], move: [0], ropes: [[{ b: "c", x: 100 }, { b: "m0" }, { b: "f0" }, { b: "h" }]] });
  assert.equal(r8.code, "heavy"); near(r8.F, 40, "#8");
  // 9: 2本 だと 30 で おもい
  assert.equal(L.evaluate(st(9), one).code, "heavy");
  // ひもが とちゅう・ て が ない
  assert.equal(L.evaluate(st(1), { fixed: [140], move: [], ropes: [], cur: [{ b: "w" }] }).code, "open");
  assert.equal(L.evaluate(st(1), { fixed: [140], move: [], ropes: [[{ b: "w" }, { b: "c", x: 100 }]] }).code, "noHand");
  // うえの 動滑車を なにも ささえて いない → ぐらぐら（おちる）
  const loose = L.evaluate(st(4), { fixed: [], move: [0, 1], ropes: [
    [{ b: "c", x: 100 }, { b: "m0" }, { b: "m1", hook: 1 }], [{ b: "w", dx: 0 }, { b: "h" }]] });
  assert.ok(loose.code !== "clear", `#4 ぐらぐら: ${loose.code}`);
});
