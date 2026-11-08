#!/usr/bin/env node
/* ちず と ターン の テスト:  node hoshikuzu-dungeon/test.js [シードの かず（きほん 1000）]
 *  1. 1000 シード × 10かい: どの かい も かいだん（10かい は ながれぼし）に とどく。とちゅう で つまない。
 *  2. まもの の うごき が きまり どおり
 *  3. もちもの・しかけ の こうか
 *  4. ハート 0 で いりぐち へ（ちず は のこる）
 *  5. じどう で さいご まで あそべる（もちもの も つかう）
 */
"use strict";
const D = require("./dungeon.js");
const { T, K, W, H } = D;

let fail = 0;
const check = (ok, m) => { if (!ok) fail++; console.log((ok ? "  ✓ " : "  ✗ ") + m); };
const SEEDS = +process.argv[2] || 1000;

/* ---------- 1. ちず の せいせい ---------- */
console.log(`■ ${SEEDS} シード × ${D.FLOORS}かい の ちず`);
{
  const t0 = Date.now();
  let bad = [], border = 0, starBad = 0, monBad = 0, itemBad = 0, kinds = {}, feats = { ice: 0, rock: 0, door: 0, secret: 0, warp: 0, trap: 0 };
  for (let s = 1; s <= SEEDS; s++) {
    for (let n = 1; n <= D.FLOORS; n++) {
      const f = D.genFloor(s, n);
      const a = D.analyze(f, new Set(f.rocksInit), f.start, f.target);
      if (!a.ok || f.grid[f.target] !== (n === D.FLOORS ? T.GOAL : T.STAIRS)) bad.push(s + "-" + n);
      for (let x = 0; x < W; x++) if (f.grid[K(x, 0)] || f.grid[K(x, H - 1)]) border++;
      for (let y = 0; y < H; y++) if (f.grid[K(0, y)] || f.grid[K(W - 1, y)]) border++;
      for (const k of f.stars) if (!D.PASS[f.grid[k]]) starBad++;
      for (const [k] of f.items) if (!D.PASS[f.grid[k]]) itemBad++;
      for (const m of f.monsInit) {
        kinds[m.kind] = (kinds[m.kind] || 0) + 1;
        if (!D.MPASS[f.grid[K(m.x, m.y)]] || f.roomId[K(m.x, m.y)] !== m.home || f.doorCell[K(m.x, m.y)] || D.MONS[m.kind].intro > n) monBad++;
      }
      if (f.grid.includes(T.ICE)) feats.ice++;
      if (f.nooks.some((q) => q.nook === "rock")) feats.rock++;
      if (f.doors.length) feats.door++;
      if (f.nooks.some((q) => q.nook === "secret")) feats.secret++;
      if (f.warps) feats.warp++;
      if (f.traps.size) feats.trap++;
    }
  }
  check(bad.length === 0, `どの かい も いりぐち から かいだん に とどき、どこ に いっても もどれる${bad.length ? "（" + bad.slice(0, 5).join(" ") + "）" : ""}`);
  check(border === 0, "まわり は ぜんぶ かべ");
  check(starBad === 0 && itemBad === 0, "ほしくず・もちもの は あるける マス に ある");
  check(monBad === 0, "まもの は じぶん の へや の なか（でいりぐち には いない）、でて くる かい も きまり どおり");
  check(Object.keys(kinds).length === 5, "5しゅるい の まもの が ぜんぶ でる: " + JSON.stringify(kinds));
  check(Object.values(feats).every((v) => v > SEEDS * 0.2), "しかけ が ちゃんと でる: " + JSON.stringify(feats));
  const a = D.genFloor(42, 3), b = D.genFloor(42, 3), c = D.genFloor(43, 3);
  check(a.grid.join() === b.grid.join() && a.grid.join() !== c.grid.join(), "おなじ シード は おなじ ちず、ちがう シード は ちがう ちず");
  console.log(`    （${Date.now() - t0}ms）`);
}

/* ---------- 2. まもの の うごき ---------- */
console.log("■ まもの の うごき");
const game = (rows, n) => D.gameWithFloor(D.floorFromAscii(rows, n));
const pos = (m) => m.x + "," + m.y;
{ // 👻 ふわりん: よこ に いったり きたり
  const g = game(["#########", "#S......#", "#..f....#", "#.......#", "#######>#"]);
  const m = g.mons[0], xs = [];
  for (let i = 0; i < 12; i++) { D.step(g, { type: "wait" }); xs.push(m.x); }
  check(xs.join() === "4,5,6,7,6,5,4,3,2,1,2,3", "ふわりん: よこ に 1マス ずつ、かべ で はねかえる（" + xs.join() + "）");
  check(g.mons[0].y === 2, "ふわりん: たて には うごかない");
}
{ // 🦇 ぱたこ: 2マス ずつ ななめ、かべ で はねかえる
  const g = game(["#########", "#S......#", "#.p.....#", "#.......#", "#.......#", "#.......#", "#######>#"]);
  const m = g.mons[0], ps = [];
  for (let i = 0; i < 4; i++) { const ox = m.x, oy = m.y; D.step(g, { type: "wait" }); ps.push(pos(m)); if (Math.abs(m.x - ox) !== 2 || Math.abs(m.y - oy) !== 2) ps.push("NG"); }
  check(!ps.includes("NG"), "ぱたこ: まいかい ななめ に 2マス（" + ps.join(" ") + "）");
}
{ // 🐌 のろりん: 2て に 1かい、ちかづいて くる
  const g = game(["##########", "#S.......#", "#........#", "#.......n#", "########>#"]);
  const m = g.mons[0], d0 = Math.abs(m.x - g.x) + Math.abs(m.y - g.y), moves = [];
  for (let i = 0; i < 6; i++) { const p = pos(m); D.step(g, { type: "wait" }); moves.push(p !== pos(m) ? 1 : 0); }
  const d1 = Math.abs(m.x - g.x) + Math.abs(m.y - g.y);
  check(moves.join("") === "010101", "のろりん: 2て に 1かい だけ うごく（" + moves.join("") + "）");
  check(d1 === d0 - 3, "のろりん: じぶん に ちかづく（" + d0 + "→" + d1 + "）");
}
{ // 🪨 ごろた: まっすぐ ころがり、かべ で とまる → ぎゃくむき
  const g = game(["##########", "#S.......#", "#g.......#", "#........#", "########>#"]);
  const m = g.mons[0], xs = [];
  for (let i = 0; i < 12; i++) { D.step(g, { type: "wait" }); xs.push(m.x); }
  check(xs.join() === "2,3,4,5,6,7,8,8,8,8,7,6", "ごろた: かべ まで ころがって 2て やすみ、ぎゃくむき（" + xs.join() + "）");
}
{ // 🪨 ごろた: ころがる まえ に たつ と あいさつ して なかよし
  const g = game(["##########", "#.......S#", "#g.......#", "#........#", "########>#"]);
  D.step(g, { type: "move", dir: [-1, 0] }); // 7,1
  for (let i = 0; i < 4; i++) D.step(g, { type: "wait" }); // ごろた は 6,2 へ
  D.step(g, { type: "move", dir: [0, 1] }); // 7,2 に たつ → まえ に いる
  check(g.mons.length === 0 && g.friends[0] === "goro" && g.stats.bikkuri === 0, "ごろた: まえ に たつ と とまって あいさつ、なかま に なる");
}
{ // 🦊 まねっこ: じぶん と おなじ むき
  const g = game(["##########", "#S.......#", "#........#", "#....m...#", "#........#", "########>#"]);
  const m = g.mons[0];
  D.step(g, { type: "move", dir: [1, 0] }); const a = pos(m);
  D.step(g, { type: "move", dir: [0, 1] }); const b = pos(m);
  D.step(g, { type: "wait" }); const c = pos(m);
  check(a === "6,3" && b === "6,4" && c === "6,4", "まねっこ: みぎ→みぎ、した→した、まつ→うごかない（" + [a, b, c].join(" ") + "）");
}
{ // ぶつかる と びっくり: ハート −1、ほしくず 3こ おとす、2て すりぬけ
  const g = game(["##########", "#S.f.....#", "#........#", "########>#"]);
  g.stars = 5;
  const r = D.step(g, { type: "move", dir: [1, 0] }); // 2,1 へ → ふわりん(3,1→2,1?) は 4 へ… ぶつかる まで まつ
  let ev = r.ev;
  for (let i = 0; i < 20 && !ev.includes("bikkuri"); i++) ev = D.step(g, { type: "wait" }).ev;
  check(ev.includes("bikkuri") && g.hearts === 2 && g.stars === 2, "まもの が ぶつかる と ハート −1、ほしくず −3（ハート " + g.hearts + "・⭐" + g.stars + "）");
  check(g.f.stars.size === 3, "おとした ほしくず 3こ が ちかく の ゆか に ちらばる（ひろいなおせる）");
  check(g.inv > 0, "びっくり の あと しばらく は ぶつからない");
}

/* ---------- 3. もちもの と しかけ ---------- */
console.log("■ もちもの と しかけ");
{
  const g = game(["##########", "#S1f.....#", "#........#", "########>#"]);
  D.step(g, { type: "move", dir: [1, 0] });
  check(g.items[0] === "candy", "🍬 あめ を ひろう");
  const far = game(["##########", "#S.....f.#", "#........#", "########>#"]);
  far.items.push("candy");
  const r0 = D.useItem(far, 0);
  check(!r0.ok && far.items.length === 1, "とおく の ふわりん には あめ を わたせない（なくならない）");
  const g2 = game(["##########", "#Sf......#", "#........#", "########>#"]);
  g2.items.push("candy", "leaf");
  const r1 = D.useItem(g2, 1);
  check(!r1.ok, "ふわりん に はっぱ は だめ");
  const r2 = D.useItem(g2, 0);
  check(r2.ok && g2.mons.length === 0 && g2.friends[0] === "fuwa" && g2.items.join() === "leaf", "🍬 あめ で ふわりん と なかよし → なかま");
}
{
  const g = game(["##########", "#Sn......#", "#........#", "########>#"]);
  g.items.push("leaf");
  check(D.useItem(g, 0).ok && g.friends[0] === "noro", "🍃 はっぱ で のろりん と なかよし");
  const g2 = game(["##########", "#S.m.....#", "#........#", "########>#"]);
  g2.items.push("mirror");
  check(D.useItem(g2, 0).ok && g2.friends[0] === "mane", "🪞 かがみ を 2マス さき の まねっこ に みせる");
  const g3 = game(["###########", "#S........#", "#.........#", "#...p.....#", "#.........#", "#########>#"]);
  g3.items.push("lantern");
  const vis0 = g3.vis.reduce((a, b) => a + b, 0);
  check(D.useItem(g3, 0).ok && g3.friends[0] === "pata" && g3.f.lantern, "🏮 ランタン で ぱたこ が ねむって なかよし");
  check(g3.vis.reduce((a, b) => a + b, 0) > vis0, "🏮 ランタン で みえる ところ が ひろがる");
}
{
  const g = game(["##########", "#S.......#", "#.######.#", "#.#....#.#", "#.######.#", "#.......>#", "##########"]);
  g.items.push("map");
  const seen0 = g.f.seen.reduce((a, b) => a + b, 0);
  D.useItem(g, 0);
  check(g.f.seen[g.f.target] === 1 && g.f.seen.reduce((a, b) => a + b, 0) > seen0 && g.items.length === 0, "🗺️ ちず の かけら で その かい が ぜんぶ みえる");
}
{
  const g = game(["##########", "#SF.....>#", "##########"]);
  g.items.push("wing");
  D.useItem(g, 0);
  check(g.wing, "🪽 はね の じゅんび");
  const r = D.step(g, { type: "move", dir: [1, 0] });
  check(r.ev.includes("jump") && g.x === 3 && !r.ev.includes("bikkuri") && g.items.length === 0, "🪽 まもの を とびこえて 2マス すすむ（はね は なくなる）");
  const g2 = game(["##########", "#S#.....>#", "##########"]);
  g2.items.push("wing"); D.useItem(g2, 0);
  check(!D.step(g2, { type: "move", dir: [1, 0] }).used && g2.x === 1, "🪽 かべ は こえられない");
}
{
  const g = game(["##########", "#S123456.#", "#........#", "########>#"]);
  for (let i = 0; i < 6; i++) D.step(g, { type: "move", dir: [1, 0] });
  check(g.items.length === 5 && g.f.items.size === 1, "もちもの は 5こ まで（6こめ は ひろえない）");
}
{
  const g = game(["##########", "#Siii.#..#", "#....#...#", "########>#"]);
  const r = D.step(g, { type: "move", dir: [1, 0] });
  check(g.x === 5 && r.ev.includes("slide"), "🧊 すべる ゆか: とまれる ところ まで すべる（x=" + g.x + "）");
  const g2 = game(["###########", "#Sw......w#", "#.........#", "#########>#"]);
  D.step(g2, { type: "move", dir: [1, 0] });
  check(g2.x === 9, "🌀 ワープ の あな で もう ひとつ の あな へ");
  const g3 = game(["##########", "#SR.....##", "#........#", "########>#"]);
  D.step(g3, { type: "move", dir: [1, 0] });
  check(g3.x === 2 && g3.rocks.has(K(3, 1)), "🪨 いわ を おす");
  D.resetRocks(g3);
  check(g3.rocks.has(K(2, 1)) === false && g3.msg.length > 0, "🔄 じぶん が もと の ばしょ に いる と いわ は もどせない");
  D.step(g3, { type: "move", dir: [0, 1] });
  check(D.resetRocks(g3) && g3.rocks.has(K(2, 1)), "🔄 いわ を もと に もどす");
  const g4 = game(["##########", "#Ss..#D#.#", "#....#.#.#", "#........#", "########>#"]);
  D.step(g4, { type: "move", dir: [1, 0] });
  check(g4.f.switchOn && g4.f.grid[K(6, 1)] === T.OPEN, "🔘 スイッチ を ふむ と とびら が あく");
  const g5 = game(["##########", "#Sc.*....#", "#........#", "########>#"]);
  const r5 = D.step(g5, { type: "move", dir: [1, 0] });
  check(r5.ev.includes("secret") && g5.f.grid[K(2, 1)] === T.FLOOR, "🧱 ひび の かべ に ぶつかる と くずれる");
  const g6 = game(["##########", "#St.f....#", "#........#", "########>#"]);
  const m6 = g6.mons[0], x6 = m6.x;
  const r6 = D.step(g6, { type: "move", dir: [1, 0] });
  check(r6.ev.includes("trap") && m6.x === x6 + 2, "🕸️ わな: ふむ と まもの が 2て うごく（じぶん は 1かい やすみ）");
}
{ // なかま の たすけ
  const g = game(["##########", "#S.t.....#", "#........#", "########>#"]);
  g.friends = ["fuwa", "noro", "goro", "pata", "mane"].slice(0, 3);
  D.useFriend(g, 0);
  check(g.f.trapKnown.has(K(3, 1)) && g.friends.length === 2, "👻 なかま の ふわりん が わな を おしえる（1かい で おわり）");
  check(!D.useFriend(g, 0).ok, "🐌 ハート が いっぱい の ときは つかわない");
  g.hearts = 2; D.useFriend(g, 0);
  check(g.hearts === 3, "🐌 のろりん が ハート を なおす");
  g.lastDir = [0, -1];
  check(!D.useFriend(g, 0).ok, "🪨 そと の かべ は こわせない");
  const g2 = game(["##########", "#S#......#", "#........#", "########>#"]);
  g2.friends = ["goro"]; g2.lastDir = [1, 0];
  check(D.useFriend(g2, 0).ok && g2.f.grid[K(2, 1)] === T.FLOOR, "🪨 ごろた が まえ の かべ を こわす");
  const g3 = game(["##########", "#S...f...#", "#........#", "########>#"]);
  g3.friends = ["mane"]; D.useFriend(g3, 0);
  const x3 = g3.mons[0].x; D.step(g3, { type: "wait" }); D.step(g3, { type: "wait" });
  check(g3.mons[0].x === x3, "🦊 まねっこ が まもの を とめる");
}

/* ---------- 4. ハート 0 で いりぐち へ ---------- */
console.log("■ ハート が なくなったら");
{
  const g = D.newGame(7);
  const start = [g.x, g.y];
  let ev = [];
  g.hearts = 1;
  // わざと まもの の となり へ つれて いって ぶつかる
  const m = g.mons[0];
  g.x = m.x - (m.dx || 0); g.y = m.y - (m.dy || 0);
  if (!D.passable(g.f, g.x, g.y) || (g.x === m.x && g.y === m.y)) { g.x = m.x; g.y = m.y - 1; }
  D.updateSeen(g);
  const seen = g.f.seen.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 20 && !ev.includes("faint"); i++) {
    const t = g.mons[0];
    ev = D.step(g, { type: "move", dir: [Math.sign(t.x - g.x), Math.sign(t.x - g.x) ? 0 : Math.sign(t.y - g.y) || 1] }).ev;
  }
  check(ev.includes("faint"), "ハート 0 で たおれる");
  check(g.x === start[0] && g.y === start[1] && g.hearts === 3 && g.n === 1, "いりぐち に もどって ハート は 3 に もどる（ゲームオーバー なし）");
  check(g.f.seen.reduce((a, b) => a + b, 0) >= seen, "みた ちず は のこる");
}

/* ---------- 5. ほぞん ---------- */
{
  const g = D.newGame(99);
  g.stars = 12; g.items = ["candy", "map"]; g.friends = ["fuwa"];
  const s = JSON.parse(JSON.stringify(D.snapshot(g)));
  const g2 = D.restore(s);
  check(g2.seed === 99 && g2.stars === 12 && g2.items.join() === "candy,map" && g2.friends[0] === "fuwa" && g2.f.grid.join() === g.f.grid.join(), "ほぞん → つづきから で おなじ めいきゅう・もちもの");
}

/* ---------- 6. じどう で さいご まで ---------- */
console.log("■ じどう で 10かい まで");
{
  const N = Math.min(SEEDS, 150), t0 = Date.now();
  let ok = 0, turns = 0, bk = 0, fr = 0;
  const ng = [];
  for (let s = 1; s <= N; s++) {
    const g = D.newGame(s), memo = {};
    let t = 0;
    while (!g.done && t < 6000) { D.autoStep(g, memo); t++; if (g.atStairs) D.descend(g); }
    if (g.done) ok++; else ng.push(s + "@" + g.n);
    turns += g.turn; bk += g.stats.bikkuri; fr += g.stats.friends;
  }
  check(ok === N, `${N} シード ぜんぶ ながれぼし まで とどいた${ng.length ? "（" + ng.join(" ") + "）" : ""}`);
  console.log(`    へいきん ${Math.round(turns / N)}て・びっくり ${(bk / N).toFixed(1)}かい・なかよし ${(fr / N).toFixed(1)}（${Date.now() - t0}ms）`);
}

console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
process.exit(fail ? 1 : 0);
