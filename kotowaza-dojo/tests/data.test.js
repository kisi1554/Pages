// node --test kotowaza-dojo/tests/*.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const D = require("../data.js");
const { KOTOWAZA, SYN, ANT, NEAR, BLANK_POOL } = D;

const KANJI = /[㐀-鿿々〆ヶ]/;
const RUBY = /([㐀-鿿々〆ヶ]+)\{([^}]+)\}/g;
const plain = (s) => s.replace(RUBY, "$1");
const ids = new Set(KOTOWAZA.map((e) => e.id));

test("かず", () => {
  const n = (k) => KOTOWAZA.filter((e) => k.includes(e.k)).length;
  assert.ok(n(["k", "ko"]) >= 100, `ことわざ ${n(["k", "ko"])}`);
  assert.ok(n(["g"]) >= 40, `慣用句 ${n(["g"])}`);
  assert.equal(ids.size, KOTOWAZA.length, "id が かぶって いる");
  assert.ok(KOTOWAZA.filter((e) => e.sc).length >= 30, "げきじょう 30こ");
  assert.ok(KOTOWAZA.filter((e) => e.miss).length >= 10, "まちがえやすい");
});

test("漢字には ぜんぶ ふりがな", () => {
  for (const e of KOTOWAZA) {
    for (const f of ["w", "m", "ex", "miss", "why", "yu", "n"]) {
      if (!e[f]) continue;
      const rest = e[f].replace(RUBY, "");
      assert.ok(!KANJI.test(rest), `${e.id}.${f}: ふりがな なし「${rest.match(KANJI)}」`);
      assert.ok(!/[{}]/.test(rest), `${e.id}.${f}: { } が へん`);
    }
    assert.match(e.y.replace(/ /g, ""), /^[ぁ-ゖー]+$/, `${e.id}.y`);
    assert.ok([1, 2, 3].includes(e.lv), `${e.id}.lv`);
  }
});

test("れいぶん に ことば が 入って いる（ことわざ）", () => {
  for (const e of KOTOWAZA) {
    assert.ok(/『.+?』/.test(e.ex), `${e.id}: 『』が ない`);
    if (e.k !== "g") assert.ok(e.ex.includes("『" + e.w + "』"), `${e.id}: れいぶん に そのまま 入って いない`);
  }
});

test("□ の こたえ", () => {
  for (const e of KOTOWAZA.filter((e) => e.b)) {
    assert.ok(BLANK_POOL[e.bc], `${e.id}: bc`);
    const segs = [...e.w.matchAll(RUBY)].map((m) => m[1]);
    assert.ok(segs.includes(e.b), `${e.id}: 「${e.b}」が ひとかたまり で ない`);
    const pool = BLANK_POOL[e.bc].list.split(" ").map((s) => s.match(/^([^ぁ-ゖ]+)/)[1]);
    assert.ok(pool.includes(e.b), `${e.id}: 「${e.b}」が BLANK_POOL.${e.bc} に ない`);
  }
});

test("なかま の id", () => {
  for (const g of [...SYN, ...ANT, ...NEAR]) for (const id of g) assert.ok(ids.has(id), `${id} が ない`);
  const seen = new Set();
  for (const g of SYN) for (const id of g) { assert.ok(!seen.has(id), `${id} が SYN に 2かい`); seen.add(id); }
});

test("ことば ひとつずつ が ちがう", () => {
  const w = new Set();
  for (const e of KOTOWAZA) { const p = plain(e.w); assert.ok(!w.has(p), p); w.add(p); }
});
