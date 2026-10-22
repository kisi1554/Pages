// node --test shiki-kotoba/tests/*.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const W = require("../words.js");

const SEASONS = ["haru", "natsu", "aki", "fuyu"];

test("120語 いじょう・id が かぶらない", () => {
  assert.ok(W.WORDS.length >= 120, W.WORDS.length);
  assert.equal(new Set(W.WORDS.map((w) => w.id)).size, W.WORDS.length);
});

test("どの ことばも ひつような こうもくが そろって いる", () => {
  for (const w of W.WORDS) {
    assert.match(w.kana, /^[ぁ-ゖァ-ヺー]+$/, w.kana);
    assert.ok(w.emoji, w.kana);
    assert.ok(W.GENRES[w.genre], w.kana + " genre");
    assert.ok(SEASONS.includes(w.life), w.kana + " life");
    for (const k of w.kigo) assert.ok(SEASONS.includes(k) || k === "shinnen", w.kana + " kigo");
    assert.ok(w.yomi && w.note, w.kana);
    // よみふだ に その ことばが はいって いる
    assert.ok(w.yomi.replace(/\s/g, "").includes(w.kana), w.kana + " yomi");
  }
});

test("きせつ ごと・ジャンル ごと に ことばが ある", () => {
  for (const s of SEASONS) assert.ok(W.WORDS.filter((w) => w.life === s).length >= 25, s);
  for (const g of Object.keys(W.GENRES)) assert.ok(W.WORDS.some((w) => w.genre === g), g);
});

test("ずれる ことば には わけ が あり、ずれない ことば には ない", () => {
  const shifted = W.WORDS.filter(W.isShifted);
  assert.ok(shifted.length >= 12);
  for (const w of shifted) assert.ok(w.why, w.kana);
  const byKana = Object.fromEntries(W.WORDS.map((w) => [w.kana, w]));
  for (const k of ["たなばた", "あさがお", "すいか", "あまのがわ"]) {
    assert.equal(byKana[k].life, "natsu");
    assert.deepEqual(byKana[k].kigo, ["aki"]);
  }
  assert.deepEqual(byKana["はなび"].kigo, ["natsu", "aki"]);
  for (const w of W.WORDS) if (w.why) assert.ok(W.isShifted(w) || w.kigo.length === 2, w.kana);
});
