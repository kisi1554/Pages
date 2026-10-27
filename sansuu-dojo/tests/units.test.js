// node --test sansuu-dojo/tests/*.test.js
// 単元ごとの 生成関数 を 1000もん ずつ ためす（こたえ・はんい・ちょうふく）
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const SD = require("../engine.js");
require("../tools/pics.js");
require("../tools/pics2.js");
const dir = path.join(__dirname, "../units");
const ORDER = ["shiro", "kiiro", "orange", "midori", "ao", "murasaki", "cha", "kuro"];
fs.readdirSync(dir).filter((f) => f.endsWith(".js"))
  .sort((a, b) => ORDER.indexOf(a.replace(".js", "")) - ORDER.indexOf(b.replace(".js", "")))
  .forEach((f) => require(path.join(dir, f)));

const N = 1000;
const num = (v) => typeof v === "number";

// しき の なかみ から こたえ を べつに けいさん して くらべる
function verify(u, p) {
  const k = p.kind || {};
  switch (k.op) {
    case "+": return p.ans === k.a + k.b;
    case "-": return p.ans === k.a - k.b && p.ans >= 0;
    case "*": return p.ans === k.a * k.b;
    case "3": return p.ans === k.terms.reduce((s, t) => s + t, 0);
    case "decomp": return p.ans === k.T - k.a;
    case "count": return p.ans === k.n;
    case "clock": return p.ans === `${k.h}:${k.m}`;
    case "kukurev": return k.a === undefined || p.ans === k.b;
    case "fracof": return p.ans * k.d === k.n;
    case "cmp":
      if (num(p.ans)) return p.ans === (k.less ? Math.min(k.a, k.b) : Math.max(k.a, k.b));
      return ["a", "b", "red", "blue"].includes(p.ans);
    case "check": return k.ok(p);
    default: return p.ans !== undefined && p.ans !== null && p.ans !== "";
  }
}

// 単元ごと の はんい の じょうけん（学年 の はんい を こえない）
const RANGE = {
  kazu10: (p) => p.ans >= 1 && p.ans <= 10,
  tasu10: (p) => p.kind.a + p.kind.b <= 10 && p.kind.a >= 1 && p.kind.b >= 1,
  hiku10: (p) => p.kind.a <= 10 && p.kind.b < p.kind.a,
  ikutsu: (p) => p.kind.T <= 10 && p.ans >= 1,
  zero: (p) => p.ans >= 0 && p.ans <= 9,
  kazu20: (p) => (num(p.ans) ? p.ans <= 20 : true),
  kuriagari: (p) => p.kind.a <= 9 && p.kind.b <= 9 && p.ans > 10,
  kurisagari: (p) => p.kind.a <= 18 && p.kind.a >= 11 && p.kind.a % 10 < p.kind.b && p.ans < 10,
  mittsu: (p) => { let s = 0; return p.kind.terms.every((t) => { s += t; return s >= 0 && s <= 20; }); },
  tokei1: (p) => [0, 30].includes(p.kind.m),
  kazu100: (p) => (typeof p.ans === "number" ? p.ans <= 120 : true),
  nanju: (p) => p.ans <= 100 && (p.kind.a % 10 === 0 || p.kind.b % 10 === p.kind.a % 10),
  hissan2: (p) => p.ans <= 99 && p.kind.a >= 10 && p.kind.a <= 99 && p.kind.b <= 99,
  hissan3: (p) => p.ans <= 999 && (p.kind.a >= 100 || p.ans >= 100),
  kake: (p) => typeof p.ans !== "number" || p.ans <= 45,
  kuku1: (p) => [2, 5, 3, 4].includes(p.kind.a) || p.kind.op !== "*",
  kuku2: (p) => [6, 7, 8, 9, 1].includes(p.kind.a) || p.kind.op !== "*",
  tokei2: (p) => p.kind.m >= 0 && p.kind.m < 60,
  tape: (p) => typeof p.ans !== "number" || (p.ans > 0 && p.ans <= 99)
};

for (const u of SD.units) {
  test(`${u.belt} / ${u.id}: ${N}もん つくって こたえ・はんい・ちょうふく`, () => {
    const r = SD.rng(12345);
    const seen = new Map();
    for (let i = 0; i < N; i++) {
      const lv = i % 3;
      const p = SD.genOne(u, r, lv);
      const where = `${u.id} lv${lv} ${JSON.stringify(p.params)}`;
      assert.ok(p.q, `もんだいぶん が ある ${where}`);
      assert.ok(p.ans !== undefined && p.ans !== null && p.ans !== "", `こたえ が ある ${where}`);
      assert.ok(verify(u, p), `こたえ が ただしい ${where} ans=${p.ans}`);
      if (num(p.ans)) {
        assert.ok(Number.isInteger(p.ans) || u.allowFrac, `せいすう ${where}`);
        assert.ok(p.ans >= 0, `0 いじょう ${where}`);
        if (u.maxAns != null) assert.ok(p.ans <= u.maxAns, `${u.maxAns} いか ${where} ans=${p.ans}`);
      }
      if (RANGE[u.id]) assert.ok(RANGE[u.id](p), `はんい の じょうけん ${where}`);
      if (p.choices) {
        const vs = p.choices.map((c) => String(c.v));
        assert.ok(vs.includes(String(p.ans)), `こたえ が せんたくし に ある ${where}`);
        assert.equal(new Set(vs).size, vs.length, `せんたくし が かぶらない ${where}`);
        assert.ok(vs.length >= 2, `せんたくし 2つ いじょう ${where}`);
      }
      if (p.toolAnswer) assert.ok(p.tool && p.tool.name, `どうぐ で こたえる もんだい に どうぐ ${where}`);
      if (p.accept) assert.ok(p.accept.includes(String(p.ans)), `accept に こたえ ${where}`);
      if (!num(p.ans)) assert.ok(p.choices || p.toolAnswer, `すうじ で ない こたえ は えらぶ か どうぐ ${where}`);
      if (lv === 2) assert.ok(!p.toolAnswer || u.testTool, `しけん は どうぐ なし で こたえられる ${where}`);
      const key = [p.q, p.expr, p.pic, String(p.ans), (p.choices || []).map((c) => c.v).join()].join("|");
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    const max = Math.max(...seen.values());
    assert.ok(seen.size >= (u.minUnique || 15), `${u.id}: しゅるい が すくなすぎない (${seen.size})`);
    assert.ok(max <= N * (u.maxFreq || 0.12), `${u.id}: おなじ もんだい が でて すぎない (さいだい ${max}かい)`);
  });

  test(`${u.belt} / ${u.id}: れんしゅう は どうぐ つき → なし、ちょうふく なし`, () => {
    const ps = SD.makePractice(u, SD.rng(7));
    assert.ok(ps.length >= 5);
    if (!u.timed) assert.equal(ps[0].lv, 0);
    assert.equal(ps[ps.length - 1].lv, 1);
    if (!u.timed) assert.equal(new Set(ps.map((p) => p.key)).size, ps.length, "おなじ もんだい が 2かい でない");
    else ps.slice(1).forEach((p, i) => assert.ok(ps.length >= 60, "1ぷん ぶん の もんだい"));
  });

  test(`${u.belt} / ${u.id}: おてほん・やってみる が ある`, () => {
    assert.ok(u.demo && u.demo.steps.length >= 3 && u.demo.tool, "おてほん");
    assert.ok(u.explore && u.explore.tasks.length >= 1 && u.explore.tool, "やってみる");
    u.explore.tasks.forEach((t) => assert.equal(typeof t.check, "function"));
  });
}

test("しょうきゅう しけん: どの おび も 10もん、その おび の 単元 だけ", () => {
  for (const b of SD.BELTS) {
    const us = SD.testUnits(b.id);
    if (!us.length) continue;
    const t = SD.makeTest(b.id, SD.rng(99));
    assert.equal(t.length, 10, b.id);
    const ids = new Set(us.map((u) => u.id).concat(SD.unitsOf("kuro").map((u) => u.id)));
    t.forEach((p) => assert.ok(ids.has(p.u), `${b.id} に ${p.u}`));
    if (b.id !== "kuro") assert.ok(new Set(t.map((p) => p.u)).size >= Math.min(us.length, 3), `${b.id}: いろいろ な 単元 から`);
  }
});

test("くりあがり・くりさがり の はんてい", () => {
  assert.equal(SD.M.carries(38, 25), 1);
  assert.equal(SD.M.carries(45, 32), 0);
  assert.equal(SD.M.carries(99, 1), 2);
  assert.equal(SD.M.carries(8, 5), 1);
  assert.equal(SD.M.carries(456, 278), 2);
  assert.equal(SD.M.carries(999, 1), 3);
  assert.equal(SD.M.borrows(52, 17), 1);
  assert.equal(SD.M.borrows(68, 25), 0);
  assert.equal(SD.M.borrows(100, 1), 2);
  assert.equal(SD.M.borrows(403, 128), 2);
  assert.equal(SD.M.borrows(13, 8), 1);
  // ぜんぶ の 2けた どうし で、たしかめ（ひっ算 を じっさい に する）
  for (let a = 10; a <= 99; a++) for (let b = 10; b <= 99; b++) {
    const c = ((a % 10) + (b % 10) >= 10 ? 1 : 0) + ((Math.floor(a / 10) + Math.floor(b / 10) + ((a % 10) + (b % 10) >= 10 ? 1 : 0)) >= 10 ? 1 : 0);
    assert.equal(SD.M.carries(a, b), c, `${a}+${b}`);
    if (a >= b) {
      const br = (a % 10) < (b % 10) ? 1 : 0;
      assert.equal(SD.M.borrows(a, b), br, `${a}-${b}`);
    }
  }
});

test("九九: 1〜9 の だん ぜんぶ", () => {
  const table = {};
  for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) {
    let s = 0; for (let i = 0; i < b; i++) s += a; // 「a の b こ ぶん」
    assert.equal(SD.M.kuku(a, b), s);
    table[`${a}x${b}`] = s;
  }
  assert.equal(table["7x8"], 56);
  assert.equal(table["9x9"], 81);
  assert.equal(table["6x7"], table["7x6"]);
});

test("とけい: はり の かくど ⇔ じこく（720ふん ぜんぶ）", () => {
  for (let t = 0; t < 720; t++) {
    const { h, m } = SD.M.fromMin(t);
    const A = SD.M.handAngles(h, m);
    assert.ok(A.hour >= 0 && A.hour < 360 && A.minute >= 0 && A.minute < 360);
    assert.deepEqual(SD.M.timeFromAngles(A.hour, A.minute), { h, m }, `${h}:${m}`);
    assert.equal(SD.M.toMin(h, m), t);
  }
  assert.deepEqual(SD.M.handAngles(3, 0), { hour: 90, minute: 0 });
  assert.deepEqual(SD.M.handAngles(6, 30), { hour: 195, minute: 180 });
  assert.deepEqual(SD.M.handAngles(12, 45), { hour: 22.5, minute: 270 });
  assert.equal(SD.M.fmtTime(3, 30), "3じはん");
  assert.equal(SD.M.fmtTime(7, 10), "7じ 10ぷん");
  assert.equal(SD.M.fmtTime(7, 25), "7じ 25ふん");
});

test("まちがえ方 の みたて", () => {
  const P = (u, kind, ans) => ({ u, kind, ans });
  assert.equal(SD.diagnose(P("tasu10", { op: "+", a: 7, b: 5 }, 12), 2), "op-swap-add");
  assert.equal(SD.diagnose(P("kazu20", { op: "+", a: 10, b: 2 }, 12), 102), "place");
  assert.equal(SD.diagnose(P("x", { op: "+", a: 38, b: 25 }, 63), 53), "carry-forgot");
  assert.equal(SD.diagnose(P("x", { op: "+", a: 7, b: 6 }, 13), 3), "make10-forgot");
  assert.equal(SD.diagnose(P("x", { op: "-", a: 52, b: 17 }, 35), 45), "borrow-swap");
  assert.equal(SD.diagnose(P("x", { op: "-", a: 52, b: 17 }, 35), 45), "borrow-swap");
  assert.equal(SD.diagnose(P("x", { op: "-", a: 13, b: 8 }, 5), 2), "genka-half");
  assert.equal(SD.diagnose(P("x", { op: "-", a: 9, b: 4 }, 5), 13), "op-swap-sub");
  assert.equal(SD.diagnose(P("x", { op: "*", a: 6, b: 7 }, 42), 13), "op-add-mul");
  assert.equal(SD.diagnose(P("x", { op: "*", a: 6, b: 7 }, 42), 48), "kuku-next");
  assert.equal(SD.diagnose(P("x", { op: "count", n: 7 }, 7), 6), "count-miss");
  assert.equal(SD.diagnose(P("x", { op: "+", a: 4, b: 3 }, 7), 1), "op-swap-add");
  assert.equal(SD.diagnose(P("x", { op: "+", a: 30, b: 4 }, 34), 43), "reverse");
  assert.equal(SD.diagnose(P("tokei1", { op: "clock", h: 2, m: 30 }, "2:30"), "3:30"), "hour-next");
  Object.values(SD.HINTS).forEach((h) => assert.ok(h.length > 5));
});

test("ライトナー: まちがえる と 1ばん、せいかい で すすみ、5ばん で そつぎょう", () => {
  const rec = SD.newRec();
  const u = SD.U("tasu10");
  const p = SD.build(u, { a: 3, b: 4, st: -1, e: 0 }, 1);
  const day = "2026-10-27";
  SD.leitnerUpdate(rec, p, false, day);
  assert.equal(rec.L[p.key].box, 1);
  assert.equal(SD.leitnerDue(rec, day).length, 0, "きょう は でない");
  let d = SD.dayNum(day) + 1;
  assert.equal(SD.leitnerDue(rec, SD.dayStr(d)).length, 1, "あした でる");
  for (let box = 2; box <= 5; box++) {
    SD.leitnerUpdate(rec, p, true, SD.dayStr(d));
    assert.equal(rec.L[p.key].box, box);
    assert.equal(rec.L[p.key].due, d + SD.GAP[box]);
    d = rec.L[p.key].due;
  }
  SD.leitnerUpdate(rec, p, true, SD.dayStr(d));
  assert.equal(rec.L[p.key], undefined, "そつぎょう");
  // せいかい だけ の もんだい は にがて ばこ に はいらない
  SD.leitnerUpdate(rec, p, true, day);
  assert.equal(Object.keys(rec.L).length, 0);
});

test("きょう の けいこ: にがて ＋ ふくしゅう ＋ あたらしい で 8もん", () => {
  const rec = SD.newRec();
  const day = "2026-10-27";
  let k = SD.makeKeiko(rec, SD.rng(1), day);
  assert.equal(k.list.length, SD.KEIKO_N);
  assert.equal(k.unit.id, SD.units[0].id);
  SD.uRec(rec, SD.units[0].id).stars = 2;
  const wrong = SD.build(SD.units[0], SD.units[0].gen(SD.rng(3), 1), 1);
  SD.leitnerUpdate(rec, wrong, false, "2026-10-26");
  k = SD.makeKeiko(rec, SD.rng(2), day);
  assert.equal(k.list.length, SD.KEIKO_N);
  assert.equal(k.list[0].key, wrong.key, "にがて が さいしょ");
  assert.ok(k.list.some((p) => p.from === "あたらしい" && p.u === SD.units[1].id), "つぎ の 単元");
});

test("ひらく じゅんばん と ほごしゃ の きりかえ", () => {
  const rec = SD.newRec();
  const [u1, u2] = SD.unitsOf("shiro");
  assert.ok(SD.unitOpen(rec, u1));
  assert.ok(!SD.unitOpen(rec, u2));
  assert.ok(!SD.testOpen(rec, "shiro"));
  SD.unitsOf("shiro").forEach((u) => (SD.uRec(rec, u.id).stars = 1));
  assert.ok(SD.unitOpen(rec, u2));
  assert.ok(SD.testOpen(rec, "shiro"));
  assert.ok(!SD.unitOpen(rec, SD.unitsOf("kiiro")[0]));
  rec.belts.push("shiro");
  assert.ok(SD.unitOpen(rec, SD.unitsOf("kiiro")[0]));
  const r2 = SD.newRec(); r2.free = true;
  assert.ok(SD.units.every((u) => SD.unitOpen(r2, u)));
  const r3 = SD.newRec(); SD.startFrom(r3, 2);
  assert.deepEqual(r3.belts, ["shiro", "kiiro"]);
  assert.ok(SD.unitOpen(r3, SD.unitsOf("orange")[0]));
});

test("よみあげ と ふりがな", () => {
  assert.equal(SD.h("{長|なが}さ"), "<ruby>長<rt>なが</rt></ruby>さ");
  assert.equal(SD.say("{長|なが}さ"), "ながさ");
  assert.equal(SD.say("7 + 5 = □"), "7 たす 5 は？");
  assert.equal(SD.say("13 − 8 = □"), "13 ひく 8 は？");
  assert.equal(SD.say("3 × 4 = □"), "3 かける 4 は？");
});

test("かたち の はんてい（てん を むすぶ）", () => {
  assert.equal(SD.classify([[0, 0], [0, 3], [4, 3]]), "righttri");
  assert.equal(SD.classify([[0, 3], [4, 3], [1, 0]]), "tri");
  assert.equal(SD.classify([[0, 0], [3, 0], [3, 3], [0, 3]]), "square");
  assert.equal(SD.classify([[0, 0], [5, 0], [5, 2], [0, 2]]), "rect");
  assert.equal(SD.classify([[0, 3], [5, 3], [4, 0], [1, 0]]), "quad");
  assert.equal(SD.classify([[0, 0], [1, 0], [2, 0]]), "", "いっちょくせん");
  assert.equal(SD.classify([[0, 0], [2, 2], [2, 0], [0, 2]]), "", "ねじれた 四角 は かたち に ならない");
  for (const k of ["tri", "righttri", "rect", "square", "quad"]) SD.SHAPES && SD.SHAPES[k].forEach((pts) => assert.equal(SD.classify(pts), k, JSON.stringify(pts)));
  assert.deepEqual(SD.rightCorners([[0, 0], [3, 0], [3, 3], [0, 3]]), [0, 1, 2, 3]);
});
