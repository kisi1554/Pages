// node --test block-kuzushi/tests/
// 40ステージ ぜんぶが「こわれない かべで とじこめられた ブロックが ない」＝ クリアできる こと を たしかめる
const { test } = require("node:test");
const assert = require("node:assert/strict");
const S = require("../stages.js");

test("ステージは 40こ、なまえは かぶらない、ボスは 10・20・30・40", () => {
  assert.equal(S.STAGES.length, 40);
  assert.equal(new Set(S.STAGES.map((s) => s.name)).size, 40);
  S.STAGES.forEach((s, i) => {
    const n = i + 1;
    assert.equal(!!s.boss, n % 10 === 0, `#${n} ボス`);
    if (s.boss) assert.ok(s.boss.hp > 0 && s.boss.speed > 0 && s.boss.fire > 0 && s.boss.name, `#${n} ボスの せってい`);
  });
  const hp = S.STAGES.filter((s) => s.boss).map((s) => s.boss.hp);
  assert.deepEqual(hp, [...hp].sort((a, b) => a - b), "ボスは だんだん つよく");
});

test("どの ぎょうも 11もじ・つかえる もじ だけ・ばんめんに おさまる", () => {
  S.STAGES.forEach((s, i) => {
    assert.ok(s.map.length >= 3 && s.map.length <= (s.boss ? 8 : 14), `#${i + 1} ぎょうすう`);
    s.map.forEach((row, r) => {
      assert.equal(row.length, S.COLS, `#${i + 1} ${r}ぎょうめ "${row}"`);
      assert.match(row, S.VALID, `#${i + 1} ${r}ぎょうめ "${row}"`);
    });
  });
});

test("ぜんぶの ステージが クリアできる（かべに とじこめられた ブロックが ない）", () => {
  S.STAGES.forEach((s, i) => {
    const bad = S.unreachable(s);
    assert.deepEqual(bad, [], `#${i + 1} ${s.name}: とどかない ブロック ${JSON.stringify(bad)}`);
    const n = s.map.join("").split("").filter((ch) => S.BREAKABLE.test(ch)).length;
    assert.ok(s.boss || n > 0, `#${i + 1} こわせる ブロックが ある`);
  });
});

test("けんさ じしんが ただしい: とじこめると みつける", () => {
  const boxed = { map: ["...........", "..###......", "..#1#......", "..###......"] };
  assert.deepEqual(S.unreachable(boxed), [[2, 3]]);
  const lid = { map: ["###########", "11111111111", "###########"] };   // うえも したも ふさがれた
  assert.equal(S.unreachable(lid).length, 11);
  const gap = { map: ["...........", "..#1#......", "..#.#......"] };
  assert.deepEqual(S.unreachable(gap), []);
});

test("うごく ブロックは うごける すきまが ある", () => {
  S.STAGES.forEach((s, i) => s.map.forEach((row) => S.moverRuns(row).forEach((m) => {
    assert.ok(m.left + m.right >= 1, `#${i + 1} "${row}"`);
  })));
});

test("ブロックの しゅるいが ぜんぶ でてくる", () => {
  const all = S.STAGES.map((s) => s.map.join("")).join("");
  for (const ch of "HXBIM#mwlfscu?") assert.ok(all.includes(ch), ch);
  // ばくだん の となりに ばくだん（れんさ）が ある ステージ
  const chain = S.STAGES.some((s) => s.map.some((row, r) => [...row].some((ch, c) => ch === "B" &&
    [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].some(([dr, dc]) => (s.map[r + dr] || "")[c + dc] === "B"))));
  assert.ok(chain, "れんさ");
});
