// node --test tenbin-puzzle/tests/*.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const D = require("../stages.js");

const sum = (arr, w) => arr.reduce((s, e) => s + w[e], 0);

test("かたむき: つりあうと 0、おもい ほうが さがる、うえ の げんかいが ある", () => {
  assert.equal(D.tilt(0), 0);
  assert.ok(D.tilt(1) > 0 && D.tilt(-1) < 0, "ひだりが おもいと プラス");
  assert.ok(D.tilt(1) >= 4, "さが 1 でも めで わかる");
  for (let d = 1; d < 40; d++) {
    assert.ok(D.tilt(d + 1) >= D.tilt(d), "さが おおきいほど かたむく");
    assert.ok(D.tilt(d) <= D.MAX_ANGLE);
    assert.equal(D.tilt(-d), -D.tilt(d));
  }
});

test("くらべっこ: 10ステージ いじょう、2〜4こ、おもさは みんな ちがう", () => {
  assert.ok(D.KURABE.length >= 10);
  D.KURABE.forEach((st, i) => {
    const n = st.items.length;
    assert.ok(n >= 2 && n <= 4, `#${i + 1} こすう`);
    assert.ok(D.KURABE_LIMIT[n] >= n - 1, `#${i + 1} めやす`);
    const ws = st.items.map((x) => x.w), es = st.items.map((x) => x.e);
    assert.equal(new Set(ws).size, n, `#${i + 1} おなじ おもさ が ある`);
    assert.equal(new Set(es).size, n, `#${i + 1} おなじ えもじ が ある`);
    ws.forEach((w) => assert.ok(Number.isInteger(w) && w > 0));
  });
  // だんだん ふえる
  for (let i = 1; i < D.KURABE.length; i++) assert.ok(D.KURABE[i].items.length >= D.KURABE[i - 1].items.length);
});

test("おきかえ すいり: てんびんは つりあい、こたえは すいりで だせて、2だん まで", () => {
  assert.ok(D.OKIKAE.length >= 10);
  let needMul = 0, twoStep = 0;
  D.OKIKAE.forEach((st, i) => {
    const tag = `#${i + 1}`;
    assert.ok(st.scales.length >= 1 && st.scales.length <= 3, `${tag} てんびんの かず`);
    st.scales.forEach(([L, R], k) => {
      assert.ok(L.length && R.length);
      assert.equal(sum(L, st.w), sum(R, st.w), `${tag} てんびん${k + 1} が つりあって いない`);
      L.concat(R).forEach((e) => assert.ok(st.w[e] > 0, `${tag} ${e} の おもさ が ない`));
    });
    const [target, unit] = st.ask;
    assert.notEqual(target, unit);
    assert.equal(st.w[target] / st.w[unit], st.answer, `${tag} こたえ と おもさ が あわない`);
    const r = D.deduce(st);
    assert.ok(r, `${tag} てんびん から すいり できない`);
    assert.equal(r.value, st.answer, `${tag} すいり の こたえ`);
    assert.ok(r.depth >= 1 && r.depth <= 2, `${tag} ${r.depth}だん すいり`);
    r.steps.forEach((s) => {
      assert.ok(Number.isInteger(s.v), `${tag} とちゅうが せいすう でない`);
      assert.equal(s.v, st.w[s.e] / st.w[unit], `${tag} とちゅうの ${s.e}`);
    });
    assert.ok(Number.isInteger(st.answer) && st.answer >= 1 && st.answer <= D.PAD_MAX, `${tag} すうじボタンに ない`);
    // てんびんに でてくる もの と きいて いる もの は つかう
    const shown = new Set(st.scales.flat(2));
    assert.ok(shown.has(target) && shown.has(unit), `${tag} てんびんに でて こない`);
    if (r.depth === 2) twoStep++;
    if (st.answer >= 6 && r.steps.some((s) => s.v > 1 && s.e !== target) && r.depth === 2) needMul++;
  });
  assert.ok(twoStep >= 4, "2だん すいり が すくない");
  assert.ok(needMul >= 2, "かけざん が いる もんだい が すくない");
});

test("つりあわせ: ぶんどうで ぴったり できる、ひきざん ステージは ひだりにも のせないと できない", () => {
  assert.ok(D.TSURIAI.length >= 10);
  D.TSURIAI.forEach((st, i) => {
    const tag = `#${i + 1} ${st.e}${st.w}`;
    Object.keys(st.inv).forEach((v) => assert.ok(D.WEIGHT_VALUES.includes(+v), `${tag} ぶんどう ${v}`));
    const r = D.weighOptions(st.w, st.inv, !!st.both);
    assert.ok(Number.isFinite(r.min), `${tag} つりあわない`);
    if (st.both) assert.equal(r.rightOnly, false, `${tag} みぎ だけで できて しまう`);
    else assert.equal(r.rightOnly, true);
    assert.ok(st.lv === 2 || st.lv === 3);
  });
  assert.equal(D.weighOptions(8, { 10: 1, 2: 1 }, true).min, 2);
  assert.equal(D.weighOptions(17, { 1: 2, 2: 2, 5: 1, 10: 1 }, false).min, 3);
  assert.equal(D.weighOptions(4, { 5: 1 }, false).min, Infinity);
});

test("にせもの きんか: 3まいずつ ×2かい で かならず みつかる", () => {
  for (let fake = 1; fake <= D.COIN_N; fake++) {
    const h1 = { L: [1, 2, 3], R: [4, 5, 6] };
    h1.res = D.coinResult(h1.L, h1.R, fake);
    const g = h1.res === -1 ? [1, 2, 3] : h1.res === 1 ? [4, 5, 6] : [7, 8, 9];
    const h2 = { L: [g[0]], R: [g[1]] };
    h2.res = D.coinResult(h2.L, h2.R, fake);
    assert.deepEqual(D.coinCandidates([h1, h2]), [fake]);
  }
  // 1かい だけ では しぼりきれない
  assert.equal(D.coinCandidates([{ L: [1, 2, 3], R: [4, 5, 6], res: 0 }]).length, 3);
  assert.equal(D.coinCandidates([]).length, 9);
});
