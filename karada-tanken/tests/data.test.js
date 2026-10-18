// node --test karada-tanken/tests/*.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const D = require("../data.js");

const KANJI = /[一-鿿々]/;
// {漢字|よみ} を はずしても 漢字が のこって いたら ふりがな もれ
const stripRuby = (s) => String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "");

function allStrings(o, out = [], where = "") {
  if (typeof o === "string") out.push([where, o]);
  else if (Array.isArray(o)) o.forEach((v, i) => allStrings(v, out, where + "[" + i + "]"));
  else if (o && typeof o === "object") for (const k in o) allStrings(o[k], out, where + "." + k);
  return out;
}

test("データの もじは ぜんぶ ふりがな つき（{漢字|よみ} の そとに 漢字が ない）", () => {
  for (const [where, s] of allStrings({ W: D.WORDS, C: D.COURSES, B: D.BONES })) {
    assert.ok(!KANJI.test(stripRuby(s)), "ふりがな もれ: " + where + " → " + s);
    // ふりがなの よみは ひらがな だけ
    for (const m of s.matchAll(/\{([^|}]+)\|([^}]+)\}/g)) assert.match(m[2], /^[ぁ-んー]+$/, where + " の よみ: " + m[2]);
  }
});

test("app.js / art.js / index.html の がめんの もじにも ふりがな もれが ない", () => {
  for (const f of ["app.js", "art.js", "index.html"]) {
    const src = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
    // コメントを のぞいて、もじれつ・タグの なかみ だけを みる
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").split("\n")
      .map((l) => l.replace(/^\s*\/\/.*$/, "").replace(/\s\/\/ .*$/, "")).join("\n");
    const noRuby = code.replace(/<ruby>[^<]*<rt>[^<]*<\/rt><\/ruby>/g, "");
    const lines = noRuby.split("\n").filter((l) => KANJI.test(l));
    assert.deepEqual(lines, [], f + " に ふりがな なしの 漢字");
  }
});

test("コースは 3つ。ばめんの しゅるいが ただしく、ことばは ずかんに ある", () => {
  assert.equal(D.COURSES.length, 3);
  for (const c of D.COURSES) {
    assert.ok(c.scenes.length >= 4, c.id);
    assert.ok(c.badge && c.badge.name);
    for (const s of c.scenes) {
      assert.ok(D.GAME_TYPES.includes(s.game.type), s.id + " の type");
      assert.ok(s.place && s.intro && s.art, s.id);
      for (const w of s.words || []) assert.ok(D.WORDS[w], s.id + " の ことば " + w);
      if (s.game.type === "explore") for (const sp of s.game.spots) assert.ok(D.WORDS[sp.word], sp.id);
      if (s.game.type === "choice") {
        assert.ok(s.game.options.length >= 2);
        if (s.game.quiz) assert.equal(s.game.options.filter((o) => o.correct).length, 1, s.id + " の せいかいは 1つ");
      }
    }
  }
});

test("コース1: しょうかの じゅんばん と ぶんき", () => {
  const ids = D.COURSES[0].scenes.map((s) => s.id);
  assert.deepEqual(ids.filter((i) => i !== "mizu"), ["kuchi", "shokudo", "i", "shocho", "daicho"]);
  const flags = new Set();
  D.COURSES[0].scenes.forEach((s) => (s.game.options || []).forEach((o) => Object.keys(o.set || {}).forEach((k) => flags.add(k))));
  assert.ok(flags.has("water"), "みずの ぶんき");
  for (const well of [true, false]) for (const water of [true, false]) {
    const e = D.ending({ well, water });
    assert.equal(e.poop, water ? "banana" : "koro");
    assert.ok(e.title && e.text);
  }
  // だいちょうで みずを すいとらないと やわらかい うんち
  assert.equal(D.poopKind(0, 6, true), "soft");
  assert.equal(D.poopKind(2, 6, true), "soft");
  assert.equal(D.poopKind(3, 6, true), "banana");
  assert.equal(D.poopKind(6, 6, true), "banana");
  assert.equal(D.poopKind(3, 3, false), "koro");
  assert.equal(D.poopKind(1, 3, false), "soft");
  assert.equal(D.ending({ well: true, water: true, poop: "soft" }).title, "やわらか うんち");
  const daicho = D.COURSES[0].scenes.find((s) => s.id === "daicho");
  for (const k of ["banana", "koro", "soft"]) assert.ok(daicho.done[k], "だいちょうの done." + k);
});

test("すうじは りかの はんいで「およそ」", () => {
  const txt = JSON.stringify(D);
  assert.match(txt, /\{小腸\|しょうちょう\}の ながさは およそ 6m/);
  assert.match(txt, /およそ 20m/);
  assert.match(txt, /およそ 1\.5m/);
  assert.match(txt, /およそ 200こ/);
});

test("すべての ことばは どこかの ばめんで おぼえられる", () => {
  const got = new Set();
  for (const c of D.COURSES) for (const s of c.scenes) {
    (s.words || []).forEach((w) => got.add(w));
    (s.game.spots || []).forEach((sp) => got.add(sp.word));
  }
  for (const k of Object.keys(D.WORDS)) assert.ok(got.has(k), k + " が とうろく されない");
});

test("ほね パズル: 10こ ていど、からだの なかに おさまる", () => {
  assert.ok(D.BONES.length >= 10 && D.BONES.length <= 12);
  for (const b of D.BONES) assert.ok(b.x > 120 && b.x < 280 && b.y > 20 && b.y < 380, b.id);
});
