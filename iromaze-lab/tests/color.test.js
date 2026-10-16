// node --test iromaze-lab/tests/*.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const C = require("../color.js");

const sum = (a) => a.reduce((s, n) => s + n, 0);
const one = (id, n = 1) => { const c = [0, 0, 0, 0, 0]; c[C.IDX[id]] = n; return c; };

test("Lab: しろ は L=100、くろ は L=0", () => {
  const w = C.rgbToLab([1, 1, 1]), k = C.rgbToLab([0, 0, 0]);
  assert.ok(Math.abs(w[0] - 100) < 0.01 && Math.abs(w[1]) < 0.01 && Math.abs(w[2]) < 0.01, `${w}`);
  assert.ok(Math.abs(k[0]) < 1e-9);
  // よく しられた あたい: sRGB あか ≈ (53.24, 80.09, 67.20)
  const r = C.rgbToLab([1, 0, 0]);
  assert.ok(Math.abs(r[0] - 53.24) < 0.1 && Math.abs(r[1] - 80.09) < 0.2 && Math.abs(r[2] - 67.2) < 0.2, `${r}`);
});

test("RYB 立方体の かど は Gossett & Chen の いろ", () => {
  assert.deepEqual(C.rybToRgb(0, 0, 0), [1, 1, 1]);
  assert.deepEqual(C.rybToRgb(1, 1, 0), [1, 0.5, 0]);
  assert.deepEqual(C.rybToRgb(0, 1, 1), [0, 0.66, 0.2]);
});

test("あお＋きいろ は はいいろ では なく みどり", () => {
  const g = C.mix([0, 1, 1, 0, 0]);
  const lab = C.rgbToLab(g);
  assert.ok(lab[1] < -40, `a*=${lab[1]} は みどりがわ`);
  // RGB の たんじゅん へいきん（だめな れい）とは ぜんぜん ちがう
  const naive = C.fromHex("#e53935").map(() => 0).map((_, i) => (C.fromHex("#fdd835")[i] + C.fromHex("#1e63c4")[i]) / 2);
  assert.ok(C.deltaE(g, naive) > 30);
});

test("あか＋きいろ は だいだい、あか＋あお は むらさき", () => {
  assert.equal(C.toHex(C.mix([1, 1, 0, 0, 0])), "#ff8000");
  assert.equal(C.toHex(C.mix([1, 0, 1, 0, 0])), "#800080");
});

test("わりあい だけで きまる（1:1 と 2:2 は おなじ いろ）", () => {
  assert.deepEqual(C.mix([1, 1, 0, 0, 0]), C.mix([2, 2, 0, 0, 0]));
  assert.deepEqual(C.mix([0, 1, 1, 1, 0]), C.mix([0, 2, 2, 2, 0]));
});

test("しろ を たすと あかるく、くろ を たすと くらく なる", () => {
  for (const base of [[1, 0, 0], [0, 1, 1], [2, 2, 1]]) {
    const L = (c) => C.rgbToLab(C.mix(c))[0];
    const b = [...base, 0, 0];
    assert.ok(L([...base, 1, 0]) > L(b), `しろ ${base}`);
    assert.ok(L([...base, 2, 0]) > L([...base, 1, 0]));
    assert.ok(L([...base, 0, 1]) < L(b), `くろ ${base}`);
    assert.ok(L([...base, 0, 2]) < L([...base, 0, 1]));
  }
  assert.equal(C.mix([0, 0, 0, 0, 0]), null);
  const gray = C.rgbToLab(C.mix(one("w").map((n, i) => (i === 4 ? 1 : n))));
  assert.ok(Math.abs(gray[1]) < 1 && Math.abs(gray[2]) < 1, "しろ＋くろ は いろみ の ない はいいろ");
});

test("ほし の さかいめ", () => {
  assert.equal(C.stars(0), 3);
  assert.equal(C.stars(C.STAR3 - 0.01), 3);
  assert.equal(C.stars(C.STAR3), 2);
  assert.equal(C.stars(C.STAR2), 1);
  assert.equal(C.stars(C.STAR1), 0);
});

test("ステージ は 15こ、みほん は ぜんぶ てきすう から つくれる", () => {
  assert.equal(C.STAGES.length, 15);
  for (const s of C.STAGES) {
    const col = C.COLORS[s.color];
    assert.ok(col, s.color);
    assert.equal(C.toHex(C.mix(col.recipe)), col.hex, `${col.name} は レシピどおりで ぴったり`);
    assert.equal(C.deltaE(C.mix(col.recipe), col.rgb), 0);
    assert.ok(col.drops <= 6, `${col.name} は 6てき いない`);
    col.recipe.forEach((n, i) => { if (n) assert.ok(s.paints.includes(C.PAINTS[i].id), `${col.name} に ${C.PAINTS[i].name} が つかえる`); });
  }
});

test("ステージ の ならび: 2しょく → 3しょく → しろ/くろ", () => {
  const kinds = C.STAGES.map((s) => {
    const r = C.COLORS[s.color].recipe;
    if (r[3] || r[4]) return 3;
    return r.slice(0, 3).filter(Boolean).length === 3 ? 2 : 1;
  });
  for (let i = 1; i < kinds.length; i++) assert.ok(kinds[i] >= kinds[i - 1], `${i}: ${kinds}`);
  assert.deepEqual([...new Set(kinds)], [1, 2, 3]);
});

test("どの ステージ も えのぐ 1しょく だけ では ほし が もらえない", () => {
  for (const s of C.STAGES) {
    const col = C.COLORS[s.color];
    for (const p of s.paints) {
      const dE = C.deltaE(C.mix(one(p)), col.rgb);
      assert.equal(C.stars(dE), 0, `${col.name} に ${p} だけ: ΔE=${dE.toFixed(1)}`);
    }
  }
});

// ΔE 15 いじょう なら ならべて みて はっきり ちがう いろ
test("みほん どうし は くべつ できる くらい はなれている", () => {
  const keys = Object.keys(C.COLORS);
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const d = C.deltaE(C.COLORS[keys[i]].rgb, C.COLORS[keys[j]].rgb);
    assert.ok(d >= 15, `${keys[i]} と ${keys[j]}: ΔE=${d.toFixed(1)}`);
  }
});

// ヒントの とおりに うごかす こども
function followHints(counts, target, paints, maxSteps = 40) {
  const steps = [];
  for (let i = 0; i < maxSteps; i++) {
    const h = C.hint(counts, target, paints, 12);
    steps.push(h.kind + (h.paint ? h.paint.id : ""));
    if (h.kind === "ok") return { counts, steps };
    if (h.kind === "reset") counts = [0, 0, 0, 0, 0];
    else if (h.kind === "remove") counts[h.index]--;
    else counts[h.index]++;
    assert.ok(sum(counts) <= 12, "おさらから あふれない");
    assert.ok(counts.every((n, k) => n === 0 || paints.includes(C.PAINTS[k].id)), "つかえない えのぐは すすめない");
  }
  return { counts, steps };
}

test("ヒント を たどると からっぽ から どの ステージ も ★3 に とどく", () => {
  for (const s of C.STAGES) {
    const col = C.COLORS[s.color];
    const { counts, steps } = followHints([0, 0, 0, 0, 0], col.rgb, s.paints);
    assert.equal(C.stars(C.deltaE(C.mix(counts), col.rgb)), 3, `${col.name}: ${steps.join(" ")}`);
    assert.ok(steps.length <= 10, `${col.name} は ちかみち: ${steps.join(" ")}`);
  }
});

test("まちがえて いれても ヒントで もどってこられる", () => {
  const starts = [[0, 0, 3, 0, 2], [5, 0, 0, 0, 0], [0, 0, 0, 4, 4], [3, 3, 3, 3, 0], [0, 6, 0, 0, 6]];
  for (const s of C.STAGES) {
    const col = C.COLORS[s.color];
    for (const st of starts) {
      const start = st.map((n, k) => (s.paints.includes(C.PAINTS[k].id) ? n : 0));
      const { counts, steps } = followHints(start, col.rgb, s.paints, 60);
      assert.equal(C.stars(C.deltaE(C.mix(counts), col.rgb)), 3, `${col.name} ${start}: ${steps.join(" ")}`);
    }
  }
});

test("ヒント: きいろ が たりない ときは きいろ を すすめる", () => {
  const h = C.hint([1, 1, 0, 0, 0], C.COLORS.mikan.rgb, "ryb", 12);
  assert.equal(h.kind, "add");
  assert.equal(h.paint.id, "y");
  const h2 = C.hint([0, 0, 0, 0, 0], C.COLORS.pink.rgb, "rybwk", 12);
  assert.equal(h2.kind, "start");
  assert.ok(["r", "w"].includes(h2.paint.id));
});
