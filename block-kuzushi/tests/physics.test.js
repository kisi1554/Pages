// node --test block-kuzushi/tests/
// ボールの あたりはんてい: すりぬけない・かどで ただしく はねる・よこに おうふく しない
const { test } = require("node:test");
const assert = require("node:assert/strict");
const P = require("../physics.js");

const CW = 32, CH = 16;
function makeWorld(blocks, extra) {
  const hits = [];
  const w = Object.assign({
    W: 360, H: 640, top: 0, mul: 1, paddle: null, bar: null,
    query(x0, y0, x1, y1, out) { for (const b of blocks) if (!b.dead && b.x < x1 && b.x + b.w > x0 && b.y < y1 && b.y + b.h > y0) out.push(b); },
    mode: () => "bounce",
    hit(ball, blk, nx, ny) { hits.push({ blk, nx, ny }); if (blk.breakable) blk.dead = true; },
  }, extra);
  return { w, hits };
}
const ball = (x, y, ang, spd) => ({ x, y, dx: Math.cos(ang), dy: Math.sin(ang), spd, r: 6 });

test("とても はやい ボール（5000/びょう・1/20びょう）でも ブロックの れつを すりぬけない", () => {
  let rnd = 1;
  const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
  for (let trial = 0; trial < 2000; trial++) {
    const blocks = [];
    for (let c = 0; c < 11; c++) blocks.push({ x: 4 + c * CW, y: 200, w: CW, h: CH });
    const { w, hits } = makeWorld(blocks);
    const ang = -Math.PI / 2 + (rand() - 0.5) * 2.4;            // うえむき いろいろ
    const b = ball(30 + rand() * 300, 450, ang, 2000 + rand() * 3000);
    for (let f = 0; f < 40 && !hits.length; f++) {
      P.step(b, w, 1 / 20);
      assert.ok(b.y > 200 + CH / 2, `#${trial} ブロックの むこうへ ぬけた y=${b.y.toFixed(1)}`);
    }
    assert.ok(hits.length > 0, `#${trial} あたらなかった`);
  }
});

test("ボール 30こ が かべや ブロックの あいだを はねまわっても そとへ でない・すりぬけない", () => {
  const blocks = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 11; c++) blocks.push({ x: 4 + c * CW, y: 80 + r * CH, w: CW, h: CH });
  const { w } = makeWorld(blocks, { paddle: { x: 0, y: 560, w: 360, h: 12 } });
  const balls = [];
  for (let i = 0; i < 30; i++) balls.push(ball(20 + i * 10, 400, -0.3 - i * 0.08, 1500));
  for (let f = 0; f < 600; f++) for (const b of balls) {
    P.step(b, w, 1 / 30);
    assert.ok(b.x >= 5.99 && b.x <= 354.01 && b.y >= 5.99, "そとに でない");
    assert.ok(b.y < 80 || b.y > 80 + 6 * CH, `ブロックの なかに はいらない y=${b.y}`);
  }
});

test("たいらな めん は まっすぐ、つなぎめ でも かど あつかい しない", () => {
  const blocks = [{ x: 100, y: 200, w: CW, h: CH }, { x: 132, y: 200, w: CW, h: CH }];
  const { w, hits } = makeWorld(blocks);
  const b = ball(132, 260, -Math.PI / 2 + 0.4, 300);  // つなぎめ ふきんに した から
  const dx0 = b.dx;
  for (let f = 0; f < 60 && !hits.length; f++) P.step(b, w, 1 / 60);
  assert.ok(hits.length >= 1);
  assert.ok(Math.abs(b.dx - dx0) < 1e-9, "よこの むきは かわらない");
  assert.ok(b.dy > 0, "したへ はねかえる");
});

test("かど に ななめ 45° で あたると きた みちを もどる", () => {
  const blocks = [{ x: 200, y: 200, w: CW, h: CH }];
  const { w, hits } = makeWorld(blocks);
  // みぎうえ むきに すすんで ブロックの ひだりした の かどへ
  const d = 40 / Math.SQRT2;
  const b = ball(200 - d - 0.5, 216 + d + 0.5, -Math.PI / 4, 200);
  for (let f = 0; f < 60 && !hits.length; f++) P.step(b, w, 1 / 120);
  assert.equal(hits.length, 1);
  assert.ok(Math.abs(hits[0].nx + Math.SQRT1_2) < 0.05 && Math.abs(hits[0].ny - Math.SQRT1_2) < 0.05, "ななめの ほうせん");
  assert.ok(b.dx < -0.65 && b.dy > 0.65, `はんたいむき ${b.dx.toFixed(2)},${b.dy.toFixed(2)}`);
});

test("L じの くぼみ に はいると 2かい はねて もどる", () => {
  // うえ と みぎ が ふさがった すみ
  const blocks = [{ x: 100, y: 100, w: CW, h: CH }, { x: 132, y: 100, w: CW, h: CH }, { x: 132, y: 116, w: CW, h: CH }];
  const { w } = makeWorld(blocks);
  const b = ball(110, 160, -Math.PI / 4, 200);
  for (let f = 0; f < 120; f++) P.step(b, w, 1 / 60);
  assert.ok(b.dx < 0 && b.dy > 0, "ひだりした へ もどる");
});

test("すいへいに ちかい むきでも かべで はねたら さいてい かくどに なおる", () => {
  const { w } = makeWorld([]);
  const b = ball(180, 300, 0.01, 400);
  for (let f = 0; f < 120; f++) P.step(b, w, 1 / 60);
  assert.ok(Math.abs(b.dy) >= Math.sin(P.MIN_ANGLE) - 1e-9, `dy=${b.dy}`);
  assert.ok(Math.abs(Math.hypot(b.dx, b.dy) - 1) < 1e-9, "たんい ベクトル");
});

test("パドル: まんなかは まうえ、はしほど ななめ、さいだい 62°", () => {
  const pad = { x: 140, y: 560, w: 80, h: 12 };
  const at = (x) => { const b = { x, y: 550, dx: 0, dy: 1, r: 6 }; P.paddleDir(b, pad); return Math.atan2(b.dx, -b.dy) * 180 / Math.PI; };
  assert.ok(Math.abs(at(180)) < 1e-9);
  assert.ok(at(200) > 20 && at(200) < 40);
  assert.ok(at(150) < -40);
  assert.ok(Math.abs(at(400) - 62) < 1e-9 && Math.abs(at(-50) + 62) < 1e-9);
  assert.ok(at(190) < at(200) && at(200) < at(215), "はしへ いくほど ななめ");
});

test("パドルで はねる・したに おちると dead", () => {
  let paddled = 0, lost = 0;
  const { w } = makeWorld([], { paddle: { x: 140, y: 560, w: 80, h: 12 }, onPaddle: () => paddled++, onLost: () => lost++ });
  const b = ball(180, 500, Math.PI / 2, 400);
  for (let f = 0; f < 30; f++) P.step(b, w, 1 / 60);
  assert.equal(paddled, 1); assert.ok(b.dy < 0);
  const c = ball(20, 500, Math.PI / 2, 400);
  for (let f = 0; f < 60 && !c.dead; f++) P.step(c, w, 1 / 60);
  assert.ok(c.dead); assert.equal(lost, 1);
});

test("つらぬく（pass）ときは はねずに すすむ", () => {
  const blocks = [];
  for (let r = 0; r < 5; r++) blocks.push({ x: 164, y: 100 + r * CH, w: CW, h: CH, breakable: true });
  const { w, hits } = makeWorld(blocks, { mode: () => "pass", hit(b, blk, nx, ny, px, py, m) { hits.push(m); blk.dead = true; } });
  const b = ball(180, 300, -Math.PI / 2, 300);
  for (let f = 0; f < 60; f++) P.step(b, w, 1 / 60);
  assert.equal(hits.length, 5);
  assert.ok(hits.every((m) => m === "pass"));
  assert.ok(b.y < 100, "そのまま うえへ");
});
