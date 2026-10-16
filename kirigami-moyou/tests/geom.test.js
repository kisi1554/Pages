// node --test kirigami-moyou/tests/*.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const K = require("../geom.js");
const P = require("../puzzles.js");

const circle = (cx, cy, r, n = 48) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)]);
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const holes = (fid, cuts, N = 300) => K.countRegions(K.rasterUnfolded(fid, cuts, N), N, 2);

test("おった かたち（ドメイン）: はんぶん・しかく・三角・30° の くさび", () => {
  assert.deepEqual(K.DEFS.half.domain, [[0, -1], [1, -1], [1, 1], [0, 1]]);
  assert.deepEqual(K.DEFS.quarter.domain, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  assert.deepEqual(K.DEFS.eighth.domain, [[0, 0], [1, 0], [1, 1]]);
  const s = K.DEFS.snow.domain;
  assert.equal(s.length, 3);
  const ang = (p) => (Math.atan2(p[1], p[0]) * 180) / Math.PI;
  assert.ok(near(ang(s[2]), 30, 1e-9), "くさび の ひらき は 30°");
  // めんせき: 2つおり は 1/2、4つおり は 1/4、8つおり は 1/8、ゆき は 6かくけい の 1/12
  assert.ok(near(K.DEFS.half.domainArea, 4 / 2));
  assert.ok(near(K.DEFS.quarter.domainArea, 4 / 4));
  assert.ok(near(K.DEFS.eighth.domainArea, 4 / 8));
  assert.ok(near(K.DEFS.snow.domainArea, ((3 * Math.sqrt(3)) / 2) / 12));
});

test("おりめ（わ）の へん: 2つおり 1ぽん、ほか 2ほん", () => {
  assert.equal(K.DEFS.half.creases.length, 1);
  for (const id of ["quarter", "eighth", "snow"]) assert.equal(K.DEFS[id].creases.length, 2, id);
});

test("foldPoint: かみの どこ でも ドメインに はいり、ドメインの なか は うごかない", () => {
  for (const id of K.FOLD_IDS) {
    for (let i = 0; i < 400; i++) {
      const p = [Math.random() * 2 - 1, Math.random() * 2 - 1];
      if (!K.inShape(id, p)) continue;
      const q = K.foldPoint(id, p);
      assert.ok(K.domainDist(id, q) > -1e-9, `${id} ${p} → ${q}`);
      assert.ok(near(Math.hypot(...p), Math.hypot(...q), 1e-9), "おっても まんなか から の きょり は おなじ");
      const q2 = K.foldPoint(id, q);
      assert.ok(near(q[0], q2[0]) && near(q[1], q2[1]), "2かい おっても おなじ");
    }
  }
});

test("1まいの てん が ひらくと 2・4・8・12 か所 に なる（鏡映・回転の 合成）", () => {
  const N = 400;
  for (const [id, n] of [["half", 2], ["quarter", 4], ["eighth", 8], ["snow", 12]]) {
    const q0 = id === "snow" ? [0.5, 0.12] : id === "eighth" ? [0.6, 0.2] : [0.55, 0.35];
    const seen = new Set();
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const p = [-1 + ((i + 0.5) * 2) / N, 1 - ((j + 0.5) * 2) / N];
      if (!K.inShape(id, p)) continue;
      const q = K.foldPoint(id, p);
      if (Math.hypot(q[0] - q0[0], q[1] - q0[1]) < 0.01) seen.add(`${Math.round(Math.atan2(p[1], p[0]) * 4)}`);
    }
    assert.equal(seen.size, n, id);
  }
});

test("とじた せん で 1か所 きると 2・4・8・12 か所 あく", () => {
  assert.equal(holes("half", [K.makeCut("half", circle(0.5, 0.3, 0.12))]), 2);
  assert.equal(holes("quarter", [K.makeCut("quarter", circle(0.5, 0.5, 0.1))]), 4);
  assert.equal(holes("eighth", [K.makeCut("eighth", circle(0.6, 0.22, 0.07))]), 8);
  assert.equal(holes("snow", [K.makeCut("snow", circle(0.5, 0.13, 0.05))]), 12);
  const c = K.makeCut("quarter", circle(0.5, 0.5, 0.1));
  assert.equal(c.k, "loop");
});

test("おりめ に かかる きりかた は つながった 1つの あな に なる", () => {
  // 4つおり の まんなか の かど を きる → まんなか に ひしがた 1つ
  const corner = K.makeCut("quarter", [[0.4, -0.02], [-0.02, 0.4]]);
  assert.equal(corner.k, "edge");
  assert.equal(holes("quarter", [corner]), 1);
  // 2つおり で おりめ に はんぶん の まる → まる 1つ
  const half = K.makeCut("half", Array.from({ length: 21 }, (_, i) => [0.4 * Math.sin((i / 20) * Math.PI), 0.4 * Math.cos((i / 20) * Math.PI)]));
  assert.equal(half.k, "edge");
  assert.equal(holes("half", [half]), 1);
});

test("ふち から ふち: ちいさい ほう（そとがわ）を きりとる", () => {
  // 4つおり の そとの かど を ななめに おとす → かみ の かど が 4つ かける
  const c = K.makeCut("quarter", [[1.02, 0.7], [0.7, 1.02]]);
  assert.equal(c.k, "edge");
  assert.ok(Math.abs(K.area(c.p)) < 0.06, "きりとる のは ちいさい 三角");
  const r = K.rasterUnfolded("quarter", [c], 200);
  assert.equal(r[0], 2, "ひだりうえ の かど は なくなる");
  assert.equal(r[100 * 200 + 100], 1, "まんなか は のこる");
  // ふち の おなじ ところ から でて もどる（くぼみ）
  const bump = K.makeCut("quarter", [[0.5, 1.0], [0.55, 0.85], [0.65, 0.85], [0.7, 1.0]]);
  assert.equal(bump.k, "edge");
  assert.ok(Math.abs(K.area(bump.p)) < 0.05);
});

test("ほそい きりこみ も おび として きれる。みじかすぎる タップ は きらない", () => {
  const slit = K.makeCut("quarter", [[0.3, 0.5], [0.7, 0.5]]);
  assert.equal(slit.k, "slit");
  assert.equal(slit.p, null);
  assert.equal(holes("quarter", [slit]), 4);
  assert.equal(K.makeCut("quarter", [[0.5, 0.5], [0.501, 0.5]]), null);
});

test("ほぞん → よみこみ で おなじ もよう", () => {
  const cuts = [K.makeCut("snow", circle(0.5, 0.13, 0.05)), K.makeCut("snow", [[0.11, 0], [0.095, 0.055]])];
  const back = K.unpackCuts(JSON.parse(JSON.stringify(K.packCuts(cuts))));
  assert.equal(back.length, 2);
  assert.ok(K.iou("snow", cuts, back) > 0.98);
  assert.deepEqual(K.unpackCuts([{ l: "x" }, null, { l: [[0, 0]], w: 0.03 }]).length, 1, "こわれた データ は すてる");
});

test("IoU: ドメインで くらべても ひらいた かみ で くらべても おなじ", () => {
  const a = [K.makeCut("quarter", circle(0.5, 0.5, 0.2))], b = [K.makeCut("quarter", circle(0.55, 0.5, 0.2))];
  const N = 400, ra = K.rasterUnfolded("quarter", a, N), rb = K.rasterUnfolded("quarter", b, N);
  let i = 0, u = 0;
  for (let k = 0; k < N * N; k++) { const x = ra[k] === 2, y = rb[k] === 2; if (x && y) i++; if (x || y) u++; }
  assert.ok(Math.abs(i / u - K.iou("quarter", a, b, 300)) < 0.02);
});

test("もんだい 12もん: おてほん どおり なら 100%、きらなければ 0%、すこし ずれても クリア", () => {
  assert.equal(P.LIST.length, 12);
  assert.equal(new Set(P.LIST.map((p) => p.id)).size, 12);
  for (const p of P.LIST) {
    assert.equal(p.cuts.length, p.strokes.length, `${p.id}: ぜんぶの せん が きりとり に なる`);
    assert.equal(K.iou(p.fold, p.cuts, p.cuts), 1, p.id);
    assert.equal(K.iou(p.fold, [], p.cuts), 0, p.id);
    const F = K.DEFS[p.fold], o = 0.008 * F.L;
    const shifted = p.strokes.map((s) => K.makeCut(p.fold, s.map((q) => [q[0] + o, q[1] + o * 0.5]), { edgeTol: 0.05 * F.L }));
    assert.ok(K.iou(p.fold, shifted.filter(Boolean), p.cuts) >= P.CLEAR, `${p.id}: ${K.iou(p.fold, shifted, p.cuts)}`);
    // かみ は ばらばら に ならない（のこった かみ は 1まい）
    assert.equal(K.countRegions(K.rasterUnfolded(p.fold, p.cuts, 240), 240, 1), 1, `${p.id}: かみ が 1まい`);
  }
});

test("もんだい: ちがう もよう では クリア に ならない", () => {
  const maru = P.LIST.find((p) => p.id === "maru"), heart = P.LIST.find((p) => p.id === "heart");
  assert.ok(K.iou("half", heart.cuts, maru.cuts) < P.CLEAR);
  const hana = P.LIST.find((p) => p.id === "hana");
  assert.ok(K.iou("eighth", hana.cuts.slice(0, 1), hana.cuts) < P.CLEAR, "はんぶん だけ では だめ");
});
