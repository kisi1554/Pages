// node --test shiki-kotoba/tests/*.test.js
// （node が ない ときは python tools/check-shiki-kotoba.py が おなじ ケースを Chromium で ためす）
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Mora = require("../mora.js");
const CASES = require("./mora-cases.js");
const { WORDS, PIECES } = require("../data.js");

test("音の かず と わけかた", () => {
  for (const [s, n, parts] of CASES) {
    assert.equal(Mora.count(s), n, `「${s}」は ${n}おん`);
    if (parts) assert.equal(Mora.split(s).join("・"), parts, `「${s}」の わけかた`);
  }
});

test("データの ことば は ぜんぶ かぞえられる（かな だけ）", () => {
  for (const w of [...WORDS.map((w) => w.kana), ...PIECES]) {
    assert.match(w, /^[ぁ-ゖー]+$/, `「${w}」に かな いがいが ある`);
    assert.ok(Mora.count(w) >= 1);
  }
});
