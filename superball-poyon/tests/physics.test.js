// node --test superball-poyon/tests/*.test.js
// ぶつりエンジン と ボールの データを ヘッドレスで たしかめる
const { test } = require("node:test");
const assert = require("node:assert/strict");
const P = require("../physics.js");
const BL = require("../balls.js");

function drop(e, h0) {
  const w = new P.World({ gy: 1000, air: 0, sleep: false });
  w.setBounds(0, 0, 1000, 1000);
  const b = w.add({ x: 500, y: 1000 - h0, r: 20, e, et: 0.8, mu: 1 });
  const peaks = [];
  let pv = 0;
  for (let i = 0; i < 60 * 6; i++) { w.step(1 / 60); if (pv < 0 && b.vy >= 0) peaks.push(1000 - b.r - b.y); pv = b.vy; }
  return peaks;
}

test("はねかえり: もどる たかさは だいたい e² ばい", () => {
  const h = 880, p = drop(0.9, h + 20);
  assert.ok(Math.abs(p[0] / h - 0.81) < 0.03, `1かいめ ${p[0]}`);
  assert.ok(p[1] < p[0], "だんだん ひくく");
  const low = drop(0.45, h + 20);
  assert.ok(low[0] < p[0] * 0.4, "はねにくい ボールは ひくい");
});

test("スーパーボールの かいてん: つくえの したへ なげると もどってくる", () => {
  const w = new P.World({ gy: 1400, air: 0, sleep: false });
  w.setBounds(0, 0, 2000, 1000, { open: true });
  w.boxes.push({ x: 900, y: 830, hw: 500, hh: 20 });           // つくえの いた（うらが y=850）
  const b = w.add({ x: 300, y: 900, r: 15, vx: 900, vy: 600, e: 0.9, et: 0.85, mu: 1 });
  let maxX = 0, minX = 1e9;
  for (let i = 0; i < 90; i++) { w.step(1 / 60); maxX = Math.max(maxX, b.x); if (maxX > 400) minX = Math.min(minX, b.x); }
  assert.ok(maxX > 400, "いちど おくへ すすむ");
  assert.ok(minX < 250, `なげた ほうへ もどる x=${Math.round(minX)}`);
  // かいてん なし（et=0）だと もどらない
  const w2 = new P.World({ gy: 1400, air: 0, sleep: false });
  w2.setBounds(0, 0, 2000, 1000, { open: true });
  w2.boxes.push({ x: 900, y: 830, hw: 500, hh: 20 });
  const c = w2.add({ x: 300, y: 900, r: 15, vx: 900, vy: 600, e: 0.9, et: 0, mu: 0.2 });
  for (let i = 0; i < 90; i++) w2.step(1 / 60);
  assert.ok(c.x > b.x + 200, "かいてんの はねかえりが ないと すすんで いく");
});

test("ころがる: ゆかを すべると かいてんに かわる（v = ω r）", () => {
  const w = new P.World({ gy: 1000, air: 0, spinDamp: 0, sleep: false });
  w.setBounds(0, 0, 100000, 1000);
  const b = w.add({ x: 100, y: 980, r: 20, vx: 600, e: 0.2, et: 0, mu: 0.5 });
  for (let i = 0; i < 120; i++) w.step(1 / 60);
  assert.ok(Math.abs(b.vx - b.w * b.r) < 5, `v=${b.vx.toFixed(1)} ωr=${(b.w * b.r).toFixed(1)}`);
  assert.ok(Math.abs(b.vx - 600 * 5 / 7) < 20, "みの つまった たまは 5/7 の はやさで ころがる");
});

test("くうかん ハッシュ: ぜんぶ くらべる ほうほう と おなじ ぺアを みつける", () => {
  const w = new P.World({ gy: 0, sleep: false });
  let s = 7;
  const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 150; i++) w.add({ x: R() * 800, y: R() * 600, r: 5 + R() * (i % 10 === 0 ? 90 : 25) });
  const found = new Set();
  w._pair = (a, b) => {
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < a.r + b.r) found.add(Math.min(a.id, b.id) + "-" + Math.max(a.id, b.id));
  };
  w._pairs();
  const brute = new Set();
  const bs = w.bodies;
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    if (Math.hypot(bs[i].x - bs[j].x, bs[i].y - bs[j].y) < bs[i].r + bs[j].r) brute.add(Math.min(bs[i].id, bs[j].id) + "-" + Math.max(bs[i].id, bs[j].id));
  }
  assert.ok(brute.size > 20);
  assert.deepEqual([...found].sort(), [...brute].sort());
});

test("すりぬけない: とても はやい ちいさい ボールも かべの なか", () => {
  const w = new P.World({ gy: 0, air: 0, maxSpeed: 3200, sleep: false });
  w.setBounds(0, 0, 400, 400);
  const bs = [];
  for (let i = 0; i < 20; i++) bs.push(w.add({ x: 200, y: 200, r: 6, vx: Math.cos(i) * 9000, vy: Math.sin(i) * 9000 }));
  for (let i = 0; i < 300; i++) w.step(1 / 60);
  bs.forEach((b) => assert.ok(b.x >= 0 && b.x <= 400 && b.y >= 0 && b.y <= 400, `(${b.x}, ${b.y})`));
  bs.forEach((b) => assert.ok(Math.hypot(b.vx, b.vy) <= 3200 + 1, "はやさの じょうげん"));
});

test("ねむる: とまった ボールは ねむり、ぶつかると おきる", () => {
  const w = new P.World({ gy: 1000 });
  w.setBounds(0, 0, 600, 600);
  const a = w.add({ x: 300, y: 580, r: 20, e: 0.9 });
  for (let i = 0; i < 120; i++) w.step(1 / 60);
  assert.ok(a.sleeping, "ねむった");
  const b = w.add({ x: 300, y: 300, r: 20, e: 0.9 });
  let woke = false;
  for (let i = 0; i < 60; i++) { w.step(1 / 60); if (!a.sleeping) woke = true; }
  assert.ok(woke, "うえから おちてきた ボールで おきる");
  for (let i = 0; i < 600; i++) w.step(1 / 60);
  assert.ok(a.sleeping && b.sleeping, "また ねむる");
  assert.ok(a.y <= 580.5 && b.y < a.y, "かさなって とまる");
});

test("けっていてき: おなじ はじまりなら おなじ けっか", () => {
  const run = () => {
    const w = new P.World({ gy: 1400 });
    w.setBounds(0, 0, 800, 600);
    for (let i = 0; i < 60; i++) w.add({ x: 50 + (i * 37) % 700, y: 50 + (i * 53) % 400, r: 10 + (i % 7) * 3, vx: (i % 5) * 100 - 200, e: 0.9, et: 0.7 });
    for (let i = 0; i < 240; i++) w.step(1 / 60);
    return w.bodies.map((b) => [b.x.toFixed(6), b.y.toFixed(6), b.a.toFixed(6)].join()).join(";");
  };
  assert.equal(run(), run());
});

test("うごく ポイ（せんぶん）に のった ボールは いっしょに もちあがる", () => {
  const w = new P.World({ gy: 1000, sleep: false });
  w.setBounds(0, -2000, 1000, 1000, { open: true });
  const seg = { ax: 400, ay: 900, bx: 600, by: 900, rad: 3, e: 0.1, et: 0, mu: 1.2, vx: 0, vy: -200 };
  w.segs = [seg];
  const b = w.add({ x: 500, y: 870, r: 20, e: 0.9 });
  for (let i = 0; i < 60; i++) { seg.ay = seg.by = 900 - 200 * (i / 60); w.step(1 / 60); }
  assert.ok(Math.abs(b.y - (seg.ay - 23)) < 6, `ボールは ポイの うえ y=${b.y.toFixed(1)}`);
});

test("ボールの データ: 30しゅるい いじょう、ぜんぶ そろっている", () => {
  assert.ok(BL.KINDS.length >= 30, `${BL.KINDS.length}しゅるい`);
  const ids = new Set();
  BL.KINDS.forEach((k) => {
    assert.ok(k.id && !ids.has(k.id), "id は かぶらない"); ids.add(k.id);
    assert.ok(k.name && k.desc && k.col, k.id);
    assert.ok(k.rar >= 1 && k.rar <= 4, k.id);
    assert.ok(k.e > 0 && k.e <= 1, k.id);
    assert.ok(k.r[0] > 0 && k.r[1] >= k.r[0], k.id);
  });
  assert.equal(BL.KINDS.filter((k) => k.group === "ふつう").length, 12, "ふつうの いろ 12");
  assert.equal(BL.BY.tomaranai.e, 1.0, "ぜんぜん とまらない は はねかえり 1.0");
  assert.equal(BL.BY.tomaranai.rar, 4);
  assert.ok(BL.BY.slime.e < 0.6, "スライムは はねにくい");
  assert.ok(BL.BY.chibi.r[1] < BL.BY.aka.r[0] && BL.BY.kyodai.r[0] > BL.BY.aka.r[1], "ちいさい／きょだい");
  ["glow", "ghost", "split", "sticky", "nonstop"].forEach((fx) => assert.ok(BL.KINDS.some((k) => k.fx[fx]), fx));
});

test("ガチャ: レアど の でやすさ", () => {
  let s = 1;
  const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const n = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (let i = 0; i < 20000; i++) n[BL.pickGacha(R).rar]++;
  assert.ok(n[1] > n[2] && n[2] > n[3] && n[3] > n[4] && n[4] > 0, JSON.stringify(n));
});
