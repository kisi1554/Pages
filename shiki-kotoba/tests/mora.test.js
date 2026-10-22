// node --test shiki-kotoba/tests/*.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const M = require("../mora.js");

test("ふつうの かな は 1字 1拍", () => {
  assert.equal(M.count("さくら"), 3);
  assert.equal(M.count("ふるいけや"), 5);
  assert.equal(M.count("かわずとびこむ"), 7);
  assert.equal(M.count("みずのおと"), 5);
});

test("ちいさい ゃゅょ は まえの 字と あわせて 1拍", () => {
  assert.deepEqual(M.split("ちょっと"), ["ちょ", "っ", "と"]);
  assert.equal(M.count("きゅうしゅう"), 4);
  assert.equal(M.count("おたまじゃくし"), 6);
  assert.equal(M.count("しゃぼんだま"), 5);
  assert.equal(M.count("ファ"), 1);
});

test("ちいさい っ・のばす ー・ん は 1拍", () => {
  assert.equal(M.count("きって"), 3);
  assert.equal(M.count("ラーメン"), 4);
  assert.deepEqual(M.split("チューリップ"), ["チュ", "ー", "リ", "ッ", "プ"]);
  assert.equal(M.count("しんぶんし"), 5);
  assert.equal(M.count("きゃっきゃ"), 3);
  assert.equal(M.count("おかあさん"), 5);
  assert.equal(M.count("がっこう"), 4);
});

test("くうはく・くとうてん は かぞえない", () => {
  assert.equal(M.count("さくら さく"), 5);
  assert.equal(M.count("あ、い。う！"), 3);
  assert.equal(M.count(""), 0);
  assert.equal(M.count(undefined), 0);
});

test("ゆうめいな はいく が 5・7・5 に なる", () => {
  const ku = [["かきくえば", "かねがなるなり", "ほうりゅうじ"], ["やせがえる", "まけるないっさ", "これにあり"]];
  for (const k of ku) assert.deepEqual(k.map(M.count), [5, 7, 5]);
});
