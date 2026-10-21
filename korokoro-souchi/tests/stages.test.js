// node --test korokoro-souchi/tests/*.test.js
// ステージの こたえ（sol）を おいて ヘッドレスで うごかし、ぜんぶ クリアできるか たしかめる
const { test } = require("node:test");
const assert = require("node:assert/strict");
const K = require("../parts.js");
const { STAGES, COURSES } = require("../stages.js");

const clone = (o) => JSON.parse(JSON.stringify(o));
const count = (arr) => arr.reduce((m, p) => ((m[p.t] = (m[p.t] || 0) + 1), m), {});

test("ステージは 160こ。1〜15・16〜30・31〜50（やさしい）・51〜70（コース3）・71〜100（コース4）・101〜110（コース5）・111〜160（コース6）", () => {
  assert.equal(STAGES.length, 160);
  STAGES.forEach((st, i) => {
    const n = Object.values(st.inv).reduce((a, b) => a + b, 0), j = i % 15;
    if (i >= 110) {
      assert.ok(n >= 4 && n <= 8, `#${i + 1} コース6 の ぶひんの かず ${n}`);
      if (i > 110) assert.ok(n >= Object.values(STAGES[i - 1].inv).reduce((a, b) => a + b, 0), `#${i + 1} コース6 は だんだん ふえる`);
    } else if (i >= 100) {
      assert.ok(n >= 6 && n <= 8, `#${i + 1} コース5 の ぶひんの かず ${n}`);
    } else if (i >= 70) {
      const g = Math.floor((i - 70) / 10);
      assert.ok(n >= 3 + g && n <= 4 + g, `#${i + 1} コース4 の ぶひんの かず ${n}`);
    } else if (i >= 50) {
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
  assert.equal(new Set(STAGES.map((st) => st.name)).size, 160, "なまえが かぶらない");
  // コースは すきまなく ぜんぶの ステージを わける
  const seen = new Array(160).fill(0);
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
        if (!K.canPlace(all.filter((q) => q !== sol[k]), sol[k], -1, st.ballZones, true)) return;
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
    all.forEach((p, j) => assert.ok(K.canPlace(all, p, j, st.ballZones, !p.f), `#${i + 1} ${p.t} が めりこんでいる（または ボールの わくの そと）`));
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
        if (!K.canPlace(all.filter((q) => q !== sol[k]), sol[k], -1, st.ballZones, true)) return;
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

test("コース3・4・5・6: こたえの ぶひんを ±10px ずらしても クリアできる", () => {
  STAGES.slice(50, 160).forEach((st, i) => {
    st.sol.forEach((_, k) => {
      [-10, -5, 5, 10].forEach((dx) => {
        const sol = clone(st.sol); sol[k].x += dx;
        const all = st.fixed.concat(sol);
        if (!K.canPlace(all.filter((q) => q !== sol[k]), sol[k], -1, st.ballZones, true)) return;
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

test("ボールの わく: ボールと ほかの ぶひんを おく ステージは、わくの なかに ボール 1こ だけでは クリア できない", () => {
  let n = 0;
  STAGES.forEach((st, i) => {
    const balls = st.sol.filter((p) => p.t === "steel" || p.t === "rubber");
    if (balls.length && st.sol.length >= 2) assert.ok(st.ballZones && st.ballZones.length === balls.length, `#${i + 1} わくが ない`);
    if (!st.ballZones) return;
    n++;
    st.ballZones.forEach((z) => {
      for (let x = z.x0; x <= z.x1; x += 10) for (let y = z.y0; y <= z.y1; y += 10) {
        const p = { t: z.t, x, y, a: 0 };
        if (!K.canPlace(st.fixed, p, -1, st.ballZones, true)) continue;
        assert.ok(!K.simulate(clone(st.fixed.concat([p])), 12).cleared, `#${i + 1} ${z.t} を (${x},${y}) に おくだけで クリア できてしまう`);
      }
    });
    // わくの そとには おけない
    const z = st.ballZones[0];
    assert.ok(!K.inBallZone(st.ballZones, { t: z.t, x: z.x1 + 30, y: z.y0 }), `#${i + 1} わくの そとに おけてしまう`);
  });
  assert.ok(n >= 25, "わくの ある ステージの かず");
});

test("ステージの きまり: ドミノは そらに おけない・ボールや シーソーは ベルに くっつけられない", () => {
  const st = STAGES[2], bell = st.fixed.find((p) => p.t === "bell");
  assert.ok(!K.canPlace(st.fixed, { t: "domino", x: 300, y: 100, a: 0 }, -1, null, true), "そらの ドミノ");
  assert.ok(K.canPlace(st.fixed, { t: "domino", x: 300, y: 100, a: 0 }, -1, null, false), "じゆう モードは おける");
  assert.ok(K.canPlace(st.fixed, st.sol[0], -1, null, true), "たなの うえの ドミノは おける");
  assert.ok(!K.canPlace(st.fixed, { t: "steel", x: bell.x, y: bell.y - 56, a: 0 }, -1, null, true), "ベルの うえの ボール");
});

test("ドミノ: 5px スナップの いちでも、たなに すとんと のって おける（#79 ひもを ひっぱれ）", () => {
  const snap = (v) => Math.round(v / 5) * 5;
  STAGES.forEach((st, i) => {
    const lay = st.fixed.slice();
    for (const q of st.sol) {
      if (q.t === "domino") {
        for (const dy of [-5, 0, 5]) {
          const p = K.seatDomino(lay, { ...q, x: snap(q.x), y: snap(q.y) + dy }, -1);
          assert.ok(K.canPlace(lay, p, -1, st.ballZones, true), `#${i + 1} ${st.name}: ドミノ (${snap(q.x)}, ${snap(q.y) + dy}) が おけない`);
        }
      }
      lay.push(q);
    }
  });
});

test("コース5・6: ボール（わくの なか）・ドミノ・シーソーを 1こ おくだけでは クリア できない", () => {
  STAGES.slice(100, 160).forEach((st, i) => {
    for (const t of Object.keys(st.inv)) {
      if (t === "steel" || t === "rubber") continue;   // ボールは「ボールの わく」の テストで しらべる
      if (t !== "domino" && t !== "seesaw") continue;
      const angs = t === "seesaw" ? [0, 15, -15] : [0];
      for (let x = 30; x <= 1170; x += 30) for (let y = 30; y <= 750; y += t === "domino" ? 60 : 30) for (const a of angs) {
        const p = K.seatDomino(st.fixed, { t, x, y, a }, -1);
        if (!K.canPlace(st.fixed, p, -1, st.ballZones, true)) continue;
        assert.ok(!K.simulate(clone(st.fixed.concat([p])), 12).cleared, `#${i + 101} ${t} を (${x},${y},${a}) に おくだけで クリア`);
      }
    }
  });
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
