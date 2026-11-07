#!/usr/bin/env node
/* ころころ ピンボール どうぶつえん — ぶつり と ルール の テスト:  node pinball-zoo/test.js
 *  - はやい ボール が かべ を すりぬけない（1000かい ランダム）
 *  - フリッパー で うえ に かえせる かくど の はんい
 *  - ボール が だい の そと に でない（ランダム に フリッパー を うごかして ながく あそぶ）
 *  - とくてん けいさん（ひらがな の よみ・ルール）
 */
"use strict";
const path = require("path");
const P = require(path.join(__dirname, "physics.js"));
const T = require(path.join(__dirname, "table.js"));

let fail = 0;
const check = (ok, m) => { if (!ok) fail++; console.log((ok ? "  ✓ " : "  ✗ ") + m); };
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

/* 1. はやい ボール が かべ を すりぬけない */
{
  let through = 0, worst = 0;
  for (let i = 0; i < 1000; i++) {
    const w = new P.World({ g: 0 });
    // たて・よこ・ななめ の かべ（だい と おなじ あつさ 0 の せんぶん）
    const kind = i % 3;
    if (kind === 0) w.addSeg(200, 0, 200, 400);
    else if (kind === 1) w.addSeg(0, 200, 400, 200);
    else w.addSeg(0, 0, 400, 400);
    const sp = 800 + rnd() * (P.MAX_SPEED + 400 - 800);    // MAX より はやい のも ためす
    let x, y, vx, vy;
    if (kind === 0) { x = 200 - 30 - rnd() * 60; y = 50 + rnd() * 300; const a = (rnd() - 0.5) * 2.6; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
    else if (kind === 1) { y = 200 - 30 - rnd() * 60; x = 50 + rnd() * 300; const a = Math.PI / 2 + (rnd() - 0.5) * 2.6; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
    else { const s = 60 + rnd() * 280; x = s + 20 + rnd() * 30; y = s - 20 - rnd() * 30; const a = 3 * Math.PI / 4 + (rnd() - 0.5) * 2.4; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
    const b = w.addBall(x, y, vx, vy, 9);
    const side0 = kind === 0 ? Math.sign(b.x - 200) : kind === 1 ? Math.sign(b.y - 200) : Math.sign(b.y - b.x);
    for (let k = 0; k < 30; k++) {
      w.step(1 / 60);
      const s = kind === 0 ? b.x - 200 : kind === 1 ? b.y - 200 : (b.y - b.x) / Math.SQRT2;
      const inside = kind < 2 ? (b.y > 0 && b.y < 400 && b.x > 0 && b.x < 400) : (b.x > 5 && b.x < 395);
      if (inside && Math.sign(s) !== side0) { through++; break; }
      if (inside) worst = Math.max(worst, -s * side0 > -9 ? 9 - Math.abs(s) : 0);
    }
  }
  check(through === 0, `はやい ボール 1000かい: かべ を すりぬけた かず ${through}`);
  check(worst < 9, `かべ に めりこんだ ふかさ さいだい ${worst.toFixed(2)}（ボール の はんけい 9 より ちいさい）`);
}

/* 1b. フリッパー を ふりながら でも すりぬけない */
{
  let through = 0;
  for (let i = 0; i < 300; i++) {
    const w = new P.World({ g: 1000 });
    const f = w.addFlipper({ px: 128, py: 622, len: 60, rest: 0.5, up: -0.45, side: "left" });
    const x = 135 + rnd() * 50, b = w.addBall(x, 560 - rnd() * 100, (rnd() - 0.5) * 400, 900 + rnd() * 700, 9);
    for (let k = 0; k < 60; k++) {
      if (k === 2 + (i % 6)) f.pressed = true;
      w.step(1 / 60);
      // フリッパー の うえ がわ から した がわ へ ぬけて いない か
      const tp = f.tip(), q = P.closest(b.x, b.y, f.px, f.py, tp[0], tp[1]);
      const cross = (tp[0] - f.px) * (b.y - f.py) - (tp[1] - f.py) * (b.x - f.px);
      if (q[2] > 0.05 && q[2] < 0.95 && cross > 0 && Math.hypot(b.x - q[0], b.y - q[1]) < 30 && b.vy > 0) { through++; break; }
    }
  }
  check(through === 0, `フリッパー を ふった とき に した へ すりぬけた かず ${through}/300`);
}

/* 2. フリッパー で うえ に かえせる かくど の はんい */
for (const side of ["left", "right"]) {
  const ok = [], angles = [];
  for (let fr = 0.1; fr <= 0.951; fr += 0.05) {
    const g = new T.Game({ mode: "normal", rand: () => 0.5 });
    g.world.balls.length = 0; g.phase = "play"; g.turtleState.next = 1e9;
    const f = g.fl[side], tp = f.tip();
    const bx = f.px + (tp[0] - f.px) * fr, by = f.py + (tp[1] - f.py) * fr;
    const ang = f.angle, nx = Math.sin(ang), ny = -Math.cos(ang);   // フリッパー の うえ むき
    const sgn = side === "left" ? 1 : -1;
    const b = g.world.addBall(bx + nx * sgn * 16.5, by + ny * sgn * 16.5, 0, 0, 9); b.sens = {};
    g.setFlipper(side, true);
    let best = null;
    for (let k = 0; k < 12; k++) { g.step(1 / 60); if (!best || b.vy < best.vy) best = { vx: b.vx, vy: b.vy }; }
    const deg = Math.atan2(-best.vy, best.vx) * 180 / Math.PI;
    angles.push(deg);
    ok.push(best.vy < -600 && deg > 20 && deg < 160);
  }
  const good = ok.filter(Boolean).length;
  check(good >= ok.length - 3, `${side === "left" ? "ひだり" : "みぎ"} フリッパー: ${ok.length}かしょ の うち ${good}かしょ で うえ に かえせる`);
  const inRange = angles.filter((a, i) => ok[i]);
  console.log(`      とぶ かくど ${Math.min(...inRange).toFixed(0)}°〜${Math.max(...inRange).toFixed(0)}°（よこ が 0°、まうえ が 90°）`);
  check(Math.max(...inRange) - Math.min(...inRange) > 15, `${side === "left" ? "ひだり" : "みぎ"}: あてる ばしょ で とぶ むき が かわる（ねらえる）`);
}

/* 2b. フリッパー の かくど の はんい */
{
  const g = new T.Game({});
  const L = g.fl.left, R = g.fl.right;
  check(L.rest > 0 && L.up < 0, `ひだり: やすみ ${(L.rest * 57.3).toFixed(0)}°（した むき）→ うえ ${(L.up * 57.3).toFixed(0)}°（うえ むき）`);
  check(Math.abs((Math.PI - R.rest) - L.rest) < 1e-9 && Math.abs((Math.PI - R.up) - L.up) < 1e-9, "みぎ は ひだり と ちょうど かがみ うつし");
  const lt = L.tip(), rt = R.tip(), gap = rt[0] - lt[0] - 2 * L.r;
  check(gap > 18 && gap < 30, `まんなか の すきま ${gap.toFixed(1)}（ボール 18 が とおれる けど ひろすぎない）`);
}

/* 3. ボール が だい の そと に でない（ながく あそぶ） */
{
  let outside = 0, lost = 0, stuck = 0, maxTime = 0, frames = 0, worst = null;
  for (let run = 0; run < 40; run++) {
    const g = new T.Game({ mode: run % 2 ? "normal" : "easy", rand: rnd });
    g.on((e) => { if (e.type === "lostInside") lost++; if (e.type === "nudge") { stuck++; if (stuck < 4) console.log("      とまった:", e.x.toFixed(1), e.y.toFixed(1)); } });
    let nextFlip = { left: 0, right: 0 };
    for (let k = 0; k < 60 * 120 && g.phase !== "over"; k++) {
      if (g.readyBall() && g.liveCount() === 0) { g.setPull(rnd()); g.release(); }
      for (const s of ["left", "right"]) if (k >= nextFlip[s]) { g.setFlipper(s, !g.fl[s].pressed); nextFlip[s] = k + 3 + Math.floor(rnd() * 30); }
      g.step(1 / 60); frames++;
      for (const b of g.world.balls) {
        if (b.rail) continue;
        if (!T.insideTable(b.x, b.y, b.r)) { outside++; if (!worst) worst = [b.x.toFixed(1), b.y.toFixed(1), b.vx.toFixed(0), b.vy.toFixed(0)]; }
      }
      maxTime = Math.max(maxTime, g.time);
    }
  }
  check(outside === 0, `${frames}フレーム あそんで、だい の そと に でた かず ${outside}${worst ? " " + worst.join(",") : ""}`);
  check(lost === 0, `あんぜん そうち（だい の そと → もどす）が うごいた かず ${lost}`);
  check(stuck === 0, `とちゅう で とまって しまった ボール ${stuck}`);
}

/* 3b. うちだし: よわく ても つよく ても だい に でる */
for (const p of [0, 0.5, 1]) {
  const g = new T.Game({ mode: "normal", rand: () => 0.5 });
  g.turtleState.next = 1e9;
  g.setPull(p); g.release();
  let left = false;
  for (let k = 0; k < 240; k++) { g.step(1 / 60); const b = g.world.balls[0]; if (b && b.x < T.LANE.x0 - 10) left = true; }
  check(left, `ばね ${Math.round(p * 100)}% で うちだす と、ボール が レーン から だい に でる`);
}

/* 4. とくてん けいさん */
{
  const Y = T.yomi;
  const cases = [[0, "ぜろ"], [100, "ひゃく"], [300, "さんびゃく"], [600, "ろっぴゃく"], [800, "はっぴゃく"], [1000, "せん"],
    [3000, "さんぜん"], [8000, "はっせん"], [1500, "せんごひゃく"], [10000, "いちまん"], [12300, "いちまん にせんさんびゃく"],
    [20000, "にまん"], [10000000, "いっせんまん"], [123456789, "いちおく にせんさんびゃくよんじゅうごまん ろくせんななひゃくはちじゅうきゅう"]];
  let bad = cases.filter(([n, s]) => Y(n) !== s);
  bad.forEach(([n, s]) => console.log(`      ${n}: 「${Y(n)}」 ≠ 「${s}」`));
  check(bad.length === 0, `すうじ の よみ ${cases.length - bad.length}/${cases.length}`);
  check(/^[ぁ-ん ]+$/.test(Y(987654321)), "よみ は ひらがな だけ");

  const g = new T.Game({ mode: "easy", rand: () => 0.5 });
  g.phase = "play";
  const b = g.world.balls[0];
  const s0 = g.score;
  g.onHit(g.bumpers[0], b, 300);
  check(g.score - s0 === T.SCORE.bumper, `バンパー ${T.SCORE.bumper}てん`);
  // ライオン を 3かい → おきる（+5000）→ マルチボール 3こ
  let multi = 0; g.on((e) => { if (e.type === "multiball") multi = e.n; });
  const s1 = g.score;
  for (let i = 0; i < 3; i++) g.onHit(g.lion, b, 300);
  check(g.score - s1 === T.SCORE.lion * 3 + T.SCORE.wake, `ライオン 3かい: ${g.score - s1}てん（あたり ×3 ＋ おきた ボーナス）`);
  check(multi === 3 && g.world.balls.length === 3, `ライオン が おきて マルチボール（${g.world.balls.length}こ）`);
  // ぜんぶ おこす → よる（とくてん 2ばい）
  for (const a of g.animals) if (!a.awake) { a.hits = a.need - 1; g.hitAnimal(a.id, 0, 0); }
  check(g.night && g.owl.active && g.bat.active, "6しゅ ぜんぶ おきた → よる の だい（フクロウ・コウモリ）");
  const s2 = g.score; g.onHit(g.bumpers[0], b, 300);
  check(g.score - s2 === T.SCORE.bumper * 2, "よる は とくてん 2ばい");
  for (const a of g.nightAnimals) { a.hits = a.need - 1; g.hitAnimal(a.id, 0, 0); }
  check(g.phase === "parade", "よる の どうぶつ も おきた → パレード");
  for (let k = 0; k < 60 * 8; k++) g.step(1 / 60);
  check(g.phase === "play" && !g.night && g.round === 2 && g.animals.every((a) => !a.awake), "パレード の あと は 2しゅうめ の ひる");
}

/* 5. ボール の かず・やさしい の もどる ボール */
{
  const g = new T.Game({ mode: "easy", rand: () => 0.5 });
  g.setPull(0.5); g.release();
  let saved = 0; g.on((e) => { if (e.type === "save") saved++; });
  g.world.balls[0].y = T.H + 50; g.step(1 / 60);
  check(saved === 1 && g.ballsLeft === 3, "やさしい: 30びょう いない に おちたら もどって くる");
  g.time += 31; g.setPull(0.5); g.release(); g.world.balls[0].y = T.H + 50; g.step(1 / 60);
  check(g.ballsLeft === 2, "30びょう すぎたら ボール が へる");
  const n = new T.Game({ mode: "normal", rand: () => 0.5 });
  n.setPull(0.5); n.release(); n.time += 7;
  for (let i = 0; i < 3; i++) { n.world.balls[0].y = T.H + 50; n.step(1 / 60); if (i < 2) { n.setPull(0.5); n.release(); n.time += 7; } }
  check(n.phase === "over", "ふつう: 3こ おちたら おしまい");
}

/* 6. カメ が 1かい だけ うけとめる */
{
  const g = new T.Game({ mode: "easy", rand: () => 0.5 });
  g.phase = "play"; g.time = g.turtleState.next; g.step(1 / 60);
  check(g.turtle.active, "カメ が でて くる");
  g.world.balls.length = 0;
  const b = g.world.addBall(200, 600, 0, 300, 9); b.sens = {};
  let caught = false;
  let up = false;
  for (let k = 0; k < 120; k++) { g.step(1 / 60); if (b.rail && b.rail.kind === "turtle") caught = true; if (caught && !b.rail && b.vy < -300) up = true; }
  check(caught && !g.turtle.active, "おちて きた ボール を うけとめて、カメ は いなく なる");
  check(up, "うけとめた ボール は うえ に もどる");
}

console.log(fail ? `\n✗ ${fail}こ しっぱい` : "\n✓ ぜんぶ OK");
process.exit(fail ? 1 : 0);
