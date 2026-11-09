#!/usr/bin/env node
/* しくみ の テスト:  node densha-dokoda/test.js
 *  - どの まち も さがす もの が 5つ。どの はいち（いれかえ）でも かならず 5つ ある
 *  - さがす もの・おまけ が え の なか に あって、ほか と かさならない（どの くみあわせ でも）
 *  - せつめい の かんじ には ぜんぶ ふりがな、ふりがな は ひらがな
 *  - え（SVG）が こわれて いない
 */
"use strict";
const assert = require("node:assert/strict");
const A = require("./art.js");
const S = require("./scenes.js");

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log("  ✓ " + name); };
const HAN = /[㐀-鿿豈-﫿]/;

ok("まち は 6まい・さがす もの は ぜんぶ ちがう 30しゅるい", () => {
  assert.equal(S.TOWNS.length, 6);
  const all = S.TOWNS.flatMap((t) => t.targets.map((x) => x.kind));
  assert.equal(all.length, 30);
  assert.equal(new Set(all).size, 30);
  assert.deepEqual([...all].sort(), Object.keys(S.KINDS).sort());
  S.TOWNS.forEach((t) => assert.ok(t.extras.length >= 1, t.id + " に おまけ"));
});

ok("いれかえ（ランダム 500かい）でも かならず 5つ・ばしょ は こうほ の どれか", () => {
  S.TOWNS.forEach((t) => {
    for (let i = 0; i < 500; i++) {
      const L = S.layout(t);
      assert.equal(L.targets.length, 5);
      assert.equal(new Set(L.targets.map((x) => x.id)).size, 5);
      L.targets.forEach((x, k) => assert.ok(t.targets[k].spots.includes(x.spot)));
    }
    assert.ok(t.targets.some((x) => x.spots.length > 1), t.id + " は ばしょ が いれかわる");
  });
});

ok("ぜんぶ の ばしょ が え の なか（はみださない）", () => {
  S.TOWNS.forEach((t) => {
    [...t.targets.map((x) => [x.kind, x.spots]), ...t.extras.map((x) => [x.id, x.spots])].forEach(([art, spots]) => {
      assert.ok(A.ART[art], "え が ある: " + art);
      spots.forEach((sp) => {
        const b = S.bbox(art, sp);
        assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= S.W && b.y + b.h <= S.H, `${t.id}/${art} ${sp} → ${JSON.stringify(b)}`);
      });
    });
  });
});

ok("どの くみあわせ でも、ちがう もの どうし は かさならない", () => {
  let pairs = 0;
  S.TOWNS.forEach((t) => {
    const items = [...t.targets.map((x) => [x.kind, x.spots]), ...t.extras.map((x) => [x.id, x.spots])];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      items[i][1].forEach((a) => items[j][1].forEach((b) => {
        pairs++;
        assert.ok(!S.overlap(S.bbox(items[i][0], a), S.bbox(items[j][0], b)), `${t.id}: ${items[i][0]}${JSON.stringify(a)} と ${items[j][0]}${JSON.stringify(b)} が かさなる`);
      }));
    }
  });
  console.log("    （" + pairs + " くみ）");
});

ok("あたり はんてい は え より おおきい（すこし おおきめ）", () => {
  const b = S.bbox("cat", [100, 100]), h = S.hitbox("cat", [100, 100]);
  assert.ok(S.MARGIN >= 12);
  assert.ok(h.x < b.x && h.y < b.y && h.w > b.w && h.h > b.h);
  const r = S.bbox("abt", [1055, 378, 0, -19.8]);
  assert.ok(r.w > A.ART.abt.w && r.h > A.ART.abt.h, "まわした え は かこみ が ひろがる");
});

ok("せつめい・なまえ の かんじ には ふりがな（ふりがな は ひらがな）", () => {
  const texts = [];
  Object.values(S.KINDS).forEach((k) => texts.push(k.name, k.say, k.desc));
  Object.values(S.EXTRAS).forEach((k) => texts.push(k.name, k.say));
  S.TOWNS.forEach((t) => texts.push(t.name));
  texts.forEach((s) => {
    assert.ok(typeof s === "string" && s.length > 0);
    const rest = s.replace(/\{([^|}]+)\|([^}]+)\}/g, (m, k, y) => { assert.match(y, /^[ぁ-ゟー]+$/, "ふりがな は ひらがな: " + y); assert.match(k, HAN); return ""; });
    assert.ok(!HAN.test(rest), "ふりがな の ない かんじ: " + s);
  });
  assert.equal(S.ruby("{東京|とうきょう} の えき"), "<ruby>東京<rt>とうきょう</rt></ruby> の えき");
  assert.equal(S.plain("{東京|とうきょう} の えき"), "とうきょう の えき");
});

ok("せつめい の ないよう（しゅるい の とくちょう）", () => {
  const K = S.KINDS;
  assert.match(K.romen.desc, /みち の うえ/);
  assert.match(K.monorail.desc, /1ぽん の/);
  assert.match(K.cablecar.desc, /ケーブル/);
  assert.match(K.cablecar.desc, /ひっぱって/);
  assert.match(K.abt.desc, /はぐるま/);
  assert.match(K.abt.desc, /きゅう な さか/);
  assert.match(K.ropeway.desc, /てつどう の なかま/);
  ["ferry", "jinrikisha", "kanransha", "roadtrain"].forEach((k) => { assert.ok(K[k].trick, k + " は ひっかけ"); assert.match(K[k].say, /じゃ ない/); });
  assert.ok(K.coaster.quiz);
  Object.values(K).forEach((k) => assert.ok(k.desc.length >= 30 && k.desc.length <= 140, k.id + " の せつめい の ながさ " + k.desc.length));
});

ok("え（SVG）: ぜんぶ かけて、タグ が とじて いる・NaN なし", () => {
  Object.entries(A.ART).forEach(([k, a]) => {
    const s = a.d({});
    assert.ok(a.w > 0 && a.h > 0 && s.length > 20, k);
    assert.ok(!/NaN|undefined/.test(s), k + " に NaN/undefined");
    const open = (s.match(/<(?!\/)[a-z]+[^>]*[^/]>/g) || []).filter((t) => !t.startsWith("<text") && !/<(defs|linearGradient|g)/.test(t)).length;
    assert.equal(open, 0, k + " に とじて いない タグ");
  });
  S.TOWNS.forEach((t) => { const s = t.bg(); assert.ok(!/NaN|undefined/.test(s), t.id + " の はいけい"); assert.ok(t.decor.length >= 15, t.id + " の かざり " + t.decor.length); t.decor.forEach((d) => assert.ok(A.ART[d[0]], d[0])); });
});

ok("transform: flip と rot", () => {
  assert.equal(S.transform("cat", [10, 20]), "translate(10,20)");
  assert.equal(S.transform("cat", [10, 20, 1]), "translate(10,20) translate(56,0) scale(-1,1)");
  assert.match(S.transform("abt", [1, 2, 0, -19.8]), /rotate\(-19.8,85,70\)/);
});

console.log(`\n${n} こ ぜんぶ OK`);
