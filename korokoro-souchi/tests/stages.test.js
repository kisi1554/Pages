// node --test korokoro-souchi/tests/*.test.js
// ステージの こたえ（sol）を おいて ヘッドレスで うごかし、ぜんぶ クリアできるか たしかめる
const { test } = require("node:test");
const assert = require("node:assert/strict");
const K = require("../parts.js");
const { STAGES, COURSES } = require("../stages.js");

const clone = (o) => JSON.parse(JSON.stringify(o));
const count = (arr) => arr.reduce((m, p) => ((m[p.t] = (m[p.t] || 0) + 1), m), {});

test("ステージは 70こ。1〜15・16〜30・31〜50（やさしい）・51〜70（コース3）", () => {
  assert.equal(STAGES.length, 70);
  STAGES.forEach((st, i) => {
    const n = Object.values(st.inv).reduce((a, b) => a + b, 0), j = i % 15;
    if (i >= 50) {
      // コース3 は だんだん ふえる: 1こ → 2こ → 2〜3こ → 2〜4こ
      const k = i - 50, min = [1, 2, 2, 2][Math.floor(k / 5)], max = [1, 2, 3, 4][Math.floor(k / 5)];
      assert.ok(n >= min && n <= max, `#${i + 1} コース3 の ぶひんの かず ${n}`);
    } else if (i >= 30) assert.ok(i < 48 ? n === 1 : n === 2, `#${i + 1} やさしい コースは 1こ（さいごの 2つは 2こ）`);
    else if (j < 5) assert.equal(n, 1, `#${i + 1}`);
    else if (j < 10) assert.ok(n >= 2 && n <= 3, `#${i + 1}`);
    else assert.ok(n >= (i < 15 ? 2 : 1), `#${i + 1}`);
    assert.ok(st.name && st.hint, `#${i + 1} なまえ と ヒント`);
    assert.ok(st.fixed.some((p) => p.t === "bell"), `#${i + 1} ベルが ある`);
    assert.ok(st.fixed.every((p) => p.f), `#${i + 1} さいしょの ぶひんは うごかせない`);
    assert.ok(st.sol.every((p) => !p.f && K.TYPES[p.t] && p.t !== "block"), `#${i + 1} こたえの ぶひん`);
  });
  [[10, 15], [25, 30]].forEach(([a, b]) => {
    const kinds = new Set(STAGES.slice(a, b).flatMap((st) => st.fixed.concat(st.sol).map((p) => p.t)));
    ["domino", "seesaw", "bucket"].forEach((t) => assert.ok(kinds.has(t), `${a + 1}〜${b} に ${t}`));
  });
  assert.equal(new Set(STAGES.map((st) => st.name)).size, 70, "なまえが かぶらない");
  // コースは すきまなく ぜんぶの ステージを わける
  const seen = new Array(70).fill(0);
  COURSES.forEach((c) => { for (let i = c.from; i < c.to; i++) seen[i]++; });
  assert.ok(seen.every((v) => v === 1), "コースの わけかた");
  assert.equal(COURSES[0].id, "easy");
});

test("やさしい コース: こたえの ぶひんを よこに ±20px ずらしても クリアできる", () => {
  STAGES.slice(30, 50).forEach((st, i) => {
    st.sol.forEach((_, k) => {
      [-20, 20].forEach((dx) => {
        const sol = clone(st.sol); sol[k].x += dx;
        const all = st.fixed.concat(sol);
        if (!K.canPlace(all.filter((q) => q !== sol[k]), sol[k])) return;
        assert.ok(K.simulate(clone(all), 25).cleared, `#${i + 31} ${sol[k].t} を ${dx}px ずらすと クリア できない`);
      });
    });
  });
});

test("バケツの need: ゴムだま だけでは さがらず、てつだま なら さがる（#29）", () => {
  const st = STAGES[28], bucket = st.fixed.find((p) => p.t === "bucket");
  const at = (t) => {
    const s = K.buildWorld([clone(bucket), { t, x: bucket.x, y: bucket.y - 10, a: 0 }]), w = s.world;
    for (let k = 0; k < 120 * 2; k++) w.step();
    return s.buckets[0].on;
  };
  assert.equal(at("rubber"), false);
  assert.equal(at("steel"), true);
});

test("こたえは つかえる ぶひんの かずと おなじで、ちゃんと おける", () => {
  STAGES.forEach((st, i) => {
    assert.deepEqual(count(st.sol), st.inv, `#${i + 1} かず`);
    const all = st.fixed.concat(st.sol);
    all.forEach((p, j) => assert.ok(K.canPlace(all, p, j), `#${i + 1} ${p.t} が めりこんでいる`));
  });
});

STAGES.forEach((st, i) => {
  test(`#${i + 1} ${st.name}: こたえを おくと ベルが なり、おかないと ならない`, () => {
    const r = K.simulate(clone(st.fixed.concat(st.sol)), 25);
    assert.ok(r.cleared, `#${i + 1} こたえで クリア できない`);
    assert.ok(!K.simulate(clone(st.fixed), 25).cleared, `#${i + 1} なにも おかなくても クリア できてしまう`);
    if (st.sol.length > 1) {
      st.sol.forEach((p, k) => {
        const l = st.fixed.concat(st.sol.filter((_, j) => j !== k));
        assert.ok(!K.simulate(clone(l), 25).cleared, `#${i + 1} ${p.t} が なくても クリア できてしまう`);
      });
    }
  });
});

test("1〜15: こたえの ぶひんを ±10px ずらしても クリアできる（ぎりぎりの そうちに しない）", () => {
  STAGES.slice(0, 15).forEach((st, i) => {
    st.sol.forEach((_, k) => {
      [-10, -5, 5, 10].forEach((dx) => {
        const sol = clone(st.sol); sol[k].x += dx;
        const all = st.fixed.concat(sol);
        if (!K.canPlace(all.filter((q) => q !== sol[k]), sol[k])) return;
        assert.ok(K.simulate(clone(all), 25).cleared, `#${i + 1} ${sol[k].t} を ${dx}px ずらすと クリア できない`);
      });
    });
  });
});

test("#11 シーソーで カーン: ドミノを どこに おいても 2こめの ボールが おちる", () => {
  const st = STAGES[10], shelf = st.fixed[2];
  for (let x = 470; x <= 530; x += 10) {
    const sol = clone(st.sol); sol[0].x = x;
    assert.ok(K.simulate(clone(st.fixed.concat(sol)), 25).cleared, `ドミノ x=${x}`);
  }
  assert.equal(shelf.t, "board_l");
});

test("コース3: こたえの ぶひんを ±10px ずらしても クリアできる", () => {
  STAGES.slice(50, 70).forEach((st, i) => {
    st.sol.forEach((_, k) => {
      [-10, -5, 5, 10].forEach((dx) => {
        const sol = clone(st.sol); sol[k].x += dx;
        const all = st.fixed.concat(sol);
        if (!K.canPlace(all.filter((q) => q !== sol[k]), sol[k])) return;
        assert.ok(K.simulate(clone(all), 25).cleared, `#${i + 51} ${sol[k].t} を ${dx}px ずらすと クリア できない`);
      });
    });
  });
});

test("コース3: ぶひんの かずが だんだん ふえる", () => {
  const n = STAGES.slice(50, 70).map((st) => Object.values(st.inv).reduce((a, b) => a + b, 0));
  for (let g = 1; g < 4; g++) {
    const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    assert.ok(avg(n.slice(g * 5, g * 5 + 5)) >= avg(n.slice(g * 5 - 5, g * 5)), `グループ ${g + 1}`);
  }
  assert.equal(Math.max(...n), n[19], "さいごが いちばん おおい");
});

test("けっていてき: おなじ はいちなら まいかい おなじ けっか", () => {
  [3, 12, 15, 23, 28, 30, 35, 45, 67, 70].forEach((n) => {
    const st = STAGES[n - 1], l = st.fixed.concat(st.sol);
    const run = () => {
      const s = K.buildWorld(clone(l)), w = s.world;
      for (let k = 0; k < 120 * 6; k++) w.step();
      return w.bodies.map((b) => [b.x, b.y, b.a].join(",")).join("|") + "#" + (w.bell ? w.bell.time : "-");
    };
    assert.equal(run(), run(), `#${n}`);
  });
});

test("ねむり: とまった ものは けいさんを やめる", () => {
  const s = K.buildWorld([{ t: "domino", x: 600, y: 729.5, a: 0 }, { t: "steel", x: 300, y: 745, a: 0 }]), w = s.world;
  for (let k = 0; k < 120 * 2; k++) w.step();
  assert.equal(w.awakeCount(), 0);
});
