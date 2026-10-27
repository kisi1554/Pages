// ぶつり の テスト: すりぬけ ない・めりこまない・ゴール はんてい・こてい タイムステップ
//   node --test air-hockey/tests/
const { test } = require("node:test");
const assert = require("node:assert/strict");
const P = require("../physics.js");
const { W, L, PR, MR, PUCK_MAX } = P;
const TOL = 1e-6;

function world(opts) {
  const w = P.createWorld();
  // マレットを じゃまに ならない ところへ
  for (const m of w.mallets) { const h = P.home(m.side); m.x = m.tx = h.x; m.y = m.ty = h.y; }
  if (opts && opts.noMallets) { w.mallets[0].x = w.mallets[0].tx = 0.1; w.mallets[0].y = w.mallets[0].ty = L - 0.1; w.mallets[1].x = w.mallets[1].tx = 0.1; w.mallets[1].y = w.mallets[1].ty = 0.1; }
  return w;
}
function inside(w, p) {
  if (p.x < PR - TOL || p.x > W - PR + TOL) return "よこ " + p.x;
  if (p.y < PR - TOL && !P.inMouth(w, p.x, 1)) return "うえ " + p.y + " x=" + p.x;
  if (p.y > L - PR + TOL && !P.inMouth(w, p.x, 0)) return "した " + p.y + " x=" + p.x;
  for (const m of w.mallets) { const d = Math.hypot(p.x - m.x, p.y - m.y); if (d < PR + m.r - TOL) return "マレットに めりこみ " + (PR + m.r - d); }
  return null;
}

test("かべ: さいこう そくど の パックを 360ど ぜんぶの むき に うっても すりぬけない", () => {
  let n = 0;
  for (let deg = 0; deg < 360; deg += 1) for (const [sx, sy] of [[0.5, 0.85], [0.08, 0.3], [0.92, 1.5], [0.5, 0.06], [0.3, L - 0.06]]) {
    const w = world({ noMallets: true });
    w.mallets[0].x = w.mallets[0].tx = 0.5; w.mallets[0].y = w.mallets[0].ty = L - 0.07;   // あたっても よい
    const a = deg * Math.PI / 180;
    const p = P.addPuck(w, sx, sy, Math.cos(a) * PUCK_MAX, Math.sin(a) * PUCK_MAX);
    for (let t = 0; t < 240 && w.pucks.length; t++) {
      P.tick(w);
      if (w.pucks.length) { const bad = inside(w, p); assert.equal(bad, null, deg + "ど (" + sx + "," + sy + ") " + bad); }
    }
    for (const e of w.events) if (e.type === "goal") assert.ok(Math.abs(e.x - W / 2) < P.GW / 2, "ゴールの そと から はいった " + e.x);
    n++;
  }
  assert.ok(n > 1000);
});

test("とまった マレット: はやい パックが どの むき・ずれ で きても すりぬけない", () => {
  for (let deg = 0; deg < 360; deg += 2) for (const off of [-0.09, -0.05, 0, 0.04, 0.08]) {
    const w = world({ noMallets: true });
    const m = w.mallets[0]; m.x = m.tx = 0.5; m.y = m.ty = 1.3;
    const a = deg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
    // マレットの まんなか から 0.35 はなれた ところ から、マレットに むけて（すこし ずらして）うつ
    const sx = m.x - dx * 0.35 - dy * off, sy = m.y - dy * 0.35 + dx * off;
    if (sx < PR || sx > W - PR || sy < PR || sy > L - PR) continue;
    const p = P.addPuck(w, sx, sy, dx * PUCK_MAX, dy * PUCK_MAX);
    let hit = false;
    for (let t = 0; t < 30 && w.pucks.length; t++) {
      P.tick(w);
      if (!w.pucks.length) break;
      assert.equal(inside(w, p), null, deg + "ど ずれ" + off);
      if (w.events.some((e) => e.type === "hit")) hit = true;
    }
    if (Math.abs(off) < PR + MR - 0.01) assert.ok(hit, "あたらなかった " + deg + "ど ずれ" + off);
  }
});

test("うごく マレット: いきおいよく パックを うっても すりぬけず、はやさ が つたわる", () => {
  for (let deg = 0; deg < 360; deg += 3) {
    const w = world({ noMallets: true });
    const m = w.mallets[0];
    const a = deg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
    const px = 0.5, py = 1.27;
    m.x = P.clamp(px - dx * 0.3, MR, W - MR); m.y = P.clamp(py - dy * 0.3, L / 2 + MR, L - MR);
    m.tx = px + dx * 0.6; m.ty = py + dy * 0.6;
    const p = P.addPuck(w, px, py, 0, 0);
    let hit = false;
    for (let t = 0; t < 40 && w.pucks.length; t++) {
      P.tick(w);
      if (!w.pucks.length) break;
      assert.equal(inside(w, p), null, deg + "ど");
      if (w.events.some((e) => e.type === "hit")) hit = true;
    }
    assert.ok(hit, "あたらなかった " + deg);
  }
  // はやく うごかす ほど パックも はやい
  const speed = (v) => {
    const w = world({ noMallets: true }); const m = w.mallets[0];
    m.maxV = v; m.x = 0.5; m.y = 1.6; m.tx = 0.5; m.ty = 0.9;
    const p = P.addPuck(w, 0.5, 1.35, 0, 0);
    for (let t = 0; t < 40; t++) P.tick(w);
    return Math.hypot(p.vx, p.vy);
  };
  const s1 = speed(1), s3 = speed(2), s45 = speed(4.5);
  assert.ok(s1 < s3 && s3 < s45, [s1, s3, s45].join(" "));
  assert.ok(s45 <= PUCK_MAX + 0.02, "さいこう そくど を こえた " + s45);
});

test("はさみこみ: マレットで パックを かべ・かど に おしつけても めりこまない", () => {
  const cases = [
    { p: [PR, 1.2], m: [0.4, 1.2] }, { p: [W - PR, 1.1], m: [0.5, 1.1] },
    { p: [0.2, L - PR], m: [0.2, 1.3] }, { p: [PR, L - PR], m: [0.3, L - 0.3] }, { p: [W - PR, L - PR], m: [0.6, 1.4] },
  ];
  for (const c of cases) {
    const w = world({ noMallets: true });
    const m = w.mallets[0]; m.x = c.m[0]; m.y = c.m[1];
    const p = P.addPuck(w, c.p[0], c.p[1], 0, 0);
    for (let t = 0; t < 240; t++) {
      // ゆびは パックの むこうがわ（かべの そと）を ゆさぶる
      m.tx = c.p[0] + (c.p[0] - c.m[0]) + Math.sin(t) * 0.05; m.ty = c.p[1] + (c.p[1] - c.m[1]) + Math.cos(t) * 0.05;
      P.tick(w);
      if (!w.pucks.length) break;
      assert.equal(inside(w, p), null, JSON.stringify(c) + " t=" + t);
      assert.ok(Math.hypot(p.vx, p.vy) <= PUCK_MAX + 1e-6);
    }
  }
});

test("ゴール: あな に はいれば とくてん、あなの そとは はねかえる", () => {
  const shoot = (x, vy, gw) => {
    const w = world({ noMallets: true }); if (gw) w.goalW = [gw, gw];
    w.mallets[1].x = w.mallets[1].tx = 0.1;
    P.addPuck(w, x, 0.6, 0, vy);
    for (let t = 0; t < 120 && w.pucks.length; t++) P.tick(w);
    return w.events.find((e) => e.type === "goal") || null;
  };
  assert.equal(shoot(0.5, -3).scorer, 0, "うえの ゴール は あお の とくてん");
  const w = world({ noMallets: true }); w.mallets[0].x = w.mallets[0].tx = 0.1;
  P.addPuck(w, 0.5, 1.2, 0, 3);
  for (let t = 0; t < 120 && w.pucks.length; t++) P.tick(w);
  assert.equal(w.events.find((e) => e.type === "goal").scorer, 1, "したの ゴール は あか の とくてん");
  assert.equal(shoot(0.2, -3), null, "あなの そと");
  assert.equal(shoot(0.5 + P.GW / 2 + PR * 0.5, -3), null, "ポストに あたる");
  assert.ok(shoot(0.5 + 0.14, -3), "ふつう の はば なら はいる");
  assert.equal(shoot(0.5 + 0.14, -3, P.GW * 0.55), null, "せまい ゴール には はいらない");
});

test("こてい タイムステップ: 60Hz・120Hz・144Hz でも 1びょうご の いち が おなじ", () => {
  const run = (hz) => {
    const w = world({ noMallets: true });
    P.addPuck(w, 0.3, 1.0, 2.3, -3.1);
    w.mallets[0].tx = 0.8; w.mallets[0].ty = 1.2;
    let acc = 0;
    for (let i = 0; i < hz; i++) acc = P.advance(w, acc, 1 / hz);
    return { t: w.time, p: w.pucks.map((p) => [p.x, p.y, p.vx, p.vy]), m: [w.mallets[0].x, w.mallets[0].y] };
  };
  const a = run(60), b = run(120), c = run(144);
  assert.ok(Math.abs(a.t - 1) < 1e-6 && Math.abs(b.t - 1) < 1e-6 && Math.abs(c.t - 1) < 1e-6, [a.t, b.t, c.t].join(" "));
  assert.deepEqual(a, b);
  assert.deepEqual(a, c);
});

test("まんなかの かべ と こおり", () => {
  const w = world({ noMallets: true });
  P.setWall(w, true);
  const p = P.addPuck(w, 0.5, 1.2, 0, -4);
  for (let t = 0; t < 40; t++) { P.tick(w); assert.ok(p.y >= L / 2 + P.WALL_HALF + PR - TOL, "かべを すりぬけた " + p.y); }
  assert.ok(p.vy > 0, "はねかえらない");
  const w2 = world({ noMallets: true }); w2.ice = true;
  const q = P.addPuck(w2, 0.5, 1.2, 0.2, 0.1);
  for (let t = 0; t < 600; t++) P.tick(w2);
  assert.ok(Math.hypot(q.vx, q.vy) >= P.ICE_MIN - 1e-6, "こおり なのに とまった");
});
