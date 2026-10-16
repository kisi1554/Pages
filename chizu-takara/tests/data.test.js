// node --test chizu-takara/tests/*.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const S = require("../symbols.js");
const R = require("../rules.js");
const STAGES = require("../stages.js");

const KANJI = /[一-鿿々]/;
const stripRuby = (s) => String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "");
const plain = (parts) => parts.map((p) => typeof p === "string" ? p : p.sym ? S.BY_CODE[p.sym].name : R.DIRS[p.dir].name).join("");

test("きごうは 20こ いじょう、id・code が かぶらない", () => {
  assert.ok(S.SYMBOLS.length >= 20, "きごうの かず " + S.SYMBOLS.length);
  assert.equal(new Set(S.SYMBOLS.map((s) => s.id)).size, S.SYMBOLS.length);
  assert.equal(new Set(S.SYMBOLS.map((s) => s.code)).size, S.SYMBOLS.length);
});

test("たのまれた きごうが ぜんぶ ある", () => {
  for (const id of ["post", "school", "high", "police", "koban", "fire", "hospital", "city", "library", "museum",
    "shrine", "temple", "factory", "power", "elder", "rice", "field", "orchard", "tea", "broad", "needle", "jr", "rail", "station"])
    assert.ok(S.BY_ID[id], id);
});

test("きごうの え は SVG で かける（こわれた すうじが ない）", () => {
  for (const s of S.SYMBOLS) {
    const svg = S.svg(s.id);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 100 100"/);
    assert.ok(!/NaN|undefined/.test(svg), s.id);
    assert.ok(svg.length > 150, s.id);
  }
  assert.notEqual(S.svg("station", { conn: { n: 1, s: 1 } }), S.svg("station", { conn: { e: 1, w: 1 } }));
});

test("なまえ・なぜ この かたち？ は ふりがな つき（{漢字|よみ} の そとに 漢字が ない）", () => {
  for (const s of S.SYMBOLS) for (const k of ["name", "short", "kanji", "why"]) {
    if (!s[k]) continue;
    assert.ok(!KANJI.test(stripRuby(s[k])), s.id + "." + k + " ふりがな もれ: " + s[k]);
    for (const m of s[k].matchAll(/\{([^|}]+)\|([^}]+)\}/g)) assert.match(m[2], /^[ぁ-んー]+$/, s.id + " の よみ: " + m[2]);
  }
  for (const s of S.SYMBOLS) assert.ok(s.why && s.why.length > 8, s.id + " の なぜ");
});

test("まちがえやすい なかま は ある きごう だけ", () => {
  for (const g of S.CONFUSE) for (const id of g) assert.ok(S.BY_ID[id], id);
});

test("ステージは 15こ。4ほうい → 8ほうい、ヒントは 3 → 6", () => {
  assert.equal(STAGES.length, 15);
  STAGES.forEach((st, i) => {
    assert.equal(st.id, i + 1);
    const N = st.map.length;
    assert.ok(N >= 8 && N <= 10, "おおきさ " + N);
    st.map.forEach((row) => assert.equal(row.length, N, "ステージ " + st.id + " の ぎょう"));
    assert.ok(st.hints.length >= 3 && st.hints.length <= 6);
    if (i > 0) {
      assert.ok(st.hints.length >= STAGES[i - 1].hints.length, "ヒントが へった " + st.id);
      assert.ok(st.dirs >= STAGES[i - 1].dirs, "ほういが へった " + st.id);
    }
  });
  assert.equal(STAGES[0].dirs, 4); assert.equal(STAGES[0].hints.length, 3);
  assert.equal(STAGES[14].dirs, 8); assert.equal(STAGES[14].hints.length, 6);
});

test("ちずの もじは しって いる きごう だけ", () => {
  for (const st of STAGES) for (const row of st.map) for (const ch of row)
    assert.ok(ch === "." || S.BY_CODE[ch], "ステージ " + st.id + " の しらない もじ " + ch);
});

test("ぜんぶの ステージで ヒントを たどると たからに つく（むじゅん なし）", () => {
  for (const st of STAGES) {
    const r = R.solve(st);
    assert.deepEqual(r.errors, [], "ステージ " + st.id);
    assert.deepEqual(r.end, st.treasure, "ステージ " + st.id + " の たから");
    // たからは なにも ない マスに うまって いる
    assert.equal(st.map[st.treasure[1]][st.treasure[0]], ".", "ステージ " + st.id + " の たからの マス");
    // おなじ マスに 2かい とまらない（ヒントが むだに ならない）
    const seen = [st.start].concat(r.path.map((p) => p.pos)).map(String);
    assert.equal(new Set(seen).size, seen.length, "ステージ " + st.id + " で おなじ マスに もどる");
  }
});

test("ヒントで つかう きごうは ちずに 1こ だけ・ほういは そのステージで つかえる もの", () => {
  for (const st of STAGES) {
    const allow = R.dirKeys(st);
    for (const h of st.hints) {
      if (h.sym) assert.equal(R.find(st, h.sym).length, 1, "ステージ " + st.id + " の " + h.sym);
      if (h.dir) assert.ok(allow.includes(h.dir), "ステージ " + st.id + " の ほうい " + h.dir);
    }
    if (st.dirs === 8) assert.ok(st.hints.some((h) => h.dir && h.dir.length === 2), "ステージ " + st.id + " に ななめが ない");
  }
});

test("「〜が みえる ほう」は ほんとうに まっすぐ その ほうい（ヒントの ぶんと いっち）", () => {
  for (const st of STAGES) {
    let pos = st.start;
    st.hints.forEach((h, i) => {
      if (h.type === "toward") {
        const at = R.find(st, h.sym)[0];
        assert.equal(R.dirTo(pos, at), h.dir, "ステージ " + st.id + " ヒント " + (i + 1));
      }
      const text = plain(R.hintParts(st, h, i, pos, { showDir: true }));
      if (h.dir) assert.ok(text.includes(R.DIRS[h.dir].name), text);
      if (typeof h.n === "number") assert.ok(text.includes(h.n + "マス"), text);
      pos = R.step(st, pos, h).pos;
    });
  }
});

test("きまりの テスト: まちがった ヒントは エラーに なる", () => {
  const st = { dirs: 4, map: ["....", ".P..", "....", "...J"], start: [0, 3], hints: [] };
  assert.ok(R.step(st, [0, 0], { type: "move", dir: "ne", n: 1 }).error, "4ほうい で ななめ");
  assert.ok(R.step(st, [0, 0], { type: "move", dir: "n", n: 1 }).error, "ちずの そと");
  assert.ok(R.step(st, [0, 0], { type: "toward", sym: "J", n: 1 }).error, "4ほうい で ななめに みえる");
  assert.ok(R.step(st, [1, 3], { type: "toward", sym: "J", n: 2 }).error, "きごうに とどく");
  assert.deepEqual(R.step(st, [0, 3], { type: "toward", sym: "J", n: "until" }).pos, [2, 3]);
  assert.deepEqual(R.step(st, [3, 3], { type: "from", sym: "P", dir: "e", n: 2 }).pos, [3, 1]);
  assert.ok(R.step(st, [3, 3], { type: "goto", sym: "K" }).error, "ない きごう");
});

test("app.js / index.html の がめんの もじにも ふりがな もれが ない", () => {
  for (const f of ["app.js", "index.html", "rules.js"]) {
    let src = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
    src = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/ .*$/gm, "");
    if (f === "index.html") {
      src = src.replace(/<title>[\s\S]*?<\/title>/, "").replace(/<meta[^>]*>/g, "");
      src = src.replace(/<ruby>[^<]*<rt>[^<]*<\/rt><\/ruby>/g, "");
      const text = src.replace(/<[^>]+>/g, " ");
      assert.ok(!KANJI.test(text), f + ": " + (text.match(/.{0,12}[一-鿿々].{0,12}/) || [])[0]);
    } else {
      for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) {
        const s = m[1].replace(/<ruby>[^<]*<rt>[^<]*<\/rt><\/ruby>/g, "");
        assert.ok(!KANJI.test(stripRuby(s)), f + ": " + m[1]);
      }
    }
  }
});
