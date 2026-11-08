#!/usr/bin/env node
/* しくみ の テスト:  node picnic-mamoru/test.js [シード の かず（きほん 20）]
 *  1. こうえん（みち）の かたち: ふち から シート まで つながる 1ぽんみち、ながさ が きまり どおり
 *  2. いきもの が みち を はずれない（そら の カラス いがい）
 *  3. コイン の けいさん（かう・かえす と もらえる・ウェーブ ボーナス・かたづけ）
 *  4. どうぐ の はんい はんてい と、きく あいて
 *  5. どの ステージ も、どの こうえん でも ★3 が とれる おきかた が ある（ソルバー）。なにも おかない と まもれない
 */
"use strict";
const D = require("./defense.js");
const { W, H, K, SHEET, TOOLS, CREATURES } = D;
const STAGES = D.PARKS.STAGES;

let fail = 0;
const check = (ok, m) => { if (!ok) fail++; console.log((ok ? "  ✓ " : "  ✗ ") + m); };
const SEEDS = +process.argv[2] || 20;
const inSheet = (x, y) => x >= SHEET.x0 && x <= SHEET.x1 && y >= SHEET.y0 && y <= SHEET.y1;

/* ---------- 1. みち ---------- */
console.log(`■ こうえん の かたち（${STAGES.length} ステージ × ${SEEDS * 5} シード）`);
{
  const bad = [];
  let total = 0;
  const shapes = new Set();
  STAGES.forEach((st, i) => {
    for (let seed = 1; seed <= SEEDS * 5; seed++) {
      const p = D.genPark(st, seed);
      total++;
      if (i === 0) shapes.add(JSON.stringify(p.paths));
      const why = (m) => bad.push(`${i + 1}-${seed}: ${m}`);
      if (p.paths.length !== st.paths) why("みち の かず");
      const used = new Set();
      p.paths.forEach((path) => {
        const L = path.length - 1;
        if (L < st.len[0] || L > st.len[1]) why("ながさ " + L);
        const [sx, sy] = path[0];
        if (!(sx === 0 || sy === 0 || sx === W - 1 || sy === H - 1)) why("ふち から はじまらない");
        const end = path[L];
        if (!inSheet(end[0], end[1])) why("シート で おわらない");
        for (let j = 1; j <= L; j++) {
          const a = path[j - 1], b = path[j];
          if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) why("つながって いない");
        }
        for (let j = 0; j < L; j++) {
          const [x, y] = path[j];
          if (inSheet(x, y)) why("とちゅう で シート に はいる");
          if (used.has(K(x, y))) why("みち が かさなる");
          used.add(K(x, y));
          if (p.grid[K(x, y)] !== 1) why("grid が みち に なって いない");
        }
      });
      for (const d of p.deco) if (p.paths.some((path) => path.some((c) => c[0] === d.x && c[1] === d.y))) why("かざり が みち の うえ");
      // おなじ シード なら おなじ こうえん
      if (JSON.stringify(D.genPark(st, seed).paths) !== JSON.stringify(p.paths)) why("おなじ シード で ちがう");
    }
  });
  check(bad.length === 0, `${total} こ の こうえん が きまり どおり${bad.length ? "（" + bad.slice(0, 3).join(" / ") + "）" : ""}`);
  check(shapes.size > SEEDS * 3, `シード ごと に みち の かたち が ちがう（ステージ1 で ${shapes.size} しゅるい）`);
}

/* ---------- 2. みち を はずれない ---------- */
console.log("■ いきもの が みち を はずれない");
{
  let ticks = 0, off = 0, airOk = true, spun = 0, stole = 0;
  for (let s = 1; s <= STAGES.length; s++) {
    for (let seed = 1; seed <= 3; seed++) {
      const G = D.newGame(s, seed);
      D.autoPlace(G, { want: 1.2 });   // すこし だけ まもって、かえる・とる の りょうほう を おこす
      let guard = 0;
      while (G.phase !== "done" && guard++ < 100000) {
        if (G.phase === "prep") D.startWave(G);
        D.step(G, 0.05);
        for (const e of G.ev) { if (e.k === "bikkuri") spun++; if (e.k === "steal") stole++; }
        G.ev.length = 0;
        for (const c of G.cre) {
          ticks++;
          if (CREATURES[c.type].air) {
            if (c.x < -2 || c.y < -2 || c.x > W + 2 || c.y > H + 2) airOk = false;
            continue;
          }
          const path = G.park.paths[c.path];
          const cx = Math.floor(c.x), cy = Math.floor(c.y);
          // セル の さかいめ では となり の みち の マス に いる
          const onPath = path.some((p) => Math.abs(p[0] + 0.5 - c.x) + Math.abs(p[1] + 0.5 - c.y) < 1e-6 ||
            (Math.abs(p[0] + 0.5 - c.x) < 1e-6 || Math.abs(p[1] + 0.5 - c.y) < 1e-6) && Math.hypot(p[0] + 0.5 - c.x, p[1] + 0.5 - c.y) <= 0.5 + 1e-6);
          if (!onPath || !(G.park.grid[K(cx, cy)] === 1 || G.park.grid[K(cx, cy)] === 2)) off++;
        }
      }
    }
  }
  check(off === 0, `${ticks} かい の いち が ぜんぶ みち の うえ（はずれ ${off}）`);
  check(airOk, "カラス は こうえん の そと へ とびださない");
  check(spun > 0 && stole > 0, `びっくり して かえる（${spun}）・とって かえる（${stole}）の りょうほう が おきる`);
}

/* ---------- 3. コイン ---------- */
console.log("■ コイン の けいさん");
{
  const G = D.newGame(1, 5);
  const c0 = G.coins;
  const path = G.park.paths[0];
  // みち の となり の しばふ を さがす
  let spot = null;
  for (const p of path) for (const d of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    const x = p[0] + d[0], y = p[1] + d[1];
    if (!spot && D.canPlace(G, x, y)) spot = [x, y];
  }
  check(!!spot, "みち の となり に おける マス が ある");
  const t = D.place(G, "fan", spot[0], spot[1]);
  check(t && G.coins === c0 - TOOLS.fan.cost, `うちわ を かう と 🌰${TOOLS.fan.cost} へる`);
  check(!D.place(G, "fan", spot[0], spot[1]), "おなじ マス には おけない");
  check(!D.place(G, "fan", path[2][0], path[2][1]), "みち の うえ には おけない");
  check(!D.place(G, "fan", 5, 5), "シート の うえ には おけない");
  check(!D.place(G, "whistle", 0, 0), "まだ つかえない どうぐ は おけない");
  const before = G.coins;
  const back = D.remove(G, t.id);
  check(back === Math.floor(TOOLS.fan.cost * D.REFUND) && G.coins === before + back, `かたづける と 🌰${back} もどる`);
  const G2 = D.newGame(1, 5);
  G2.coins = 5;
  check(!D.place(G2, "fan", spot[0], spot[1]) && G2.coins === 5, "コイン が たりない と かえない");
  // かえした かず × コイン ＋ ボーナス
  const G3 = D.newGame(2, 7);
  D.autoPlace(G3);
  let spent = G3.stage.coins - G3.coins, earned = 0, bonus = 0, guard = 0;
  while (G3.phase !== "done" && guard++ < 100000) {
    if (G3.phase === "prep") { const k = G3.coins; D.autoPlace(G3); spent += k - G3.coins; D.startWave(G3); }
    D.step(G3, 0.05);
    for (const e of G3.ev) { if (e.k === "bikkuri") earned += CREATURES[e.c.type].coin; if (e.k === "waveEnd") bonus += e.bonus; if (e.k === "done") bonus += D.WAVE_BONUS; }
    G3.ev.length = 0;
  }
  check(G3.coins === G3.stage.coins - spent + earned + bonus, `のこり コイン ＝ はじめ − つかった ＋ もらった ＋ ボーナス（${G3.coins}）`);
  check(G3.earned === earned, "もらった コイン の きろく が あう");
}

/* ---------- 4. はんい ---------- */
console.log("■ どうぐ の はんい");
{
  const G = D.newGame("free", 3, { season: "spring", paths: 1 });
  for (const type of D.TTYPES) {
    const T = TOOLS[type];
    const tool = { type, cx: 2.5, cy: 2.5 };
    const at = (d) => D.inRange(tool, { x: 2.5 + d, y: 2.5 });
    check(at(T.range - 0.01) && at(T.range) && !at(T.range + 0.01), `${T.emoji} ${T.name}: ${T.range} マス まで とどく`);
    // ななめ
    const r = T.range / Math.SQRT2;
    check(D.inRange(tool, { x: 2.5 + r - 0.01, y: 2.5 + r - 0.01 }) && !D.inRange(tool, { x: 2.5 + r + 0.02, y: 2.5 + r + 0.02 }), `${T.emoji} はんい は まるい`);
  }
  // きく あいて だけ が びっくり する
  for (const type of D.TTYPES) {
    for (const ct of D.CTYPES) {
      const g = D.newGame("free", 3, { season: "spring", paths: 1 });
      const path = g.park.paths[0];
      let spot = null;
      for (let j = 3; j < path.length - 3 && !spot; j++) for (const d of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const x = path[j][0] + d[0], y = path[j][1] + d[1];
        if (!spot && D.canPlace(g, x, y)) spot = [x, y];
      }
      const tool = D.place(g, type, spot[0], spot[1]);
      const c = D.spawn(g, ct, 0);
      // いきもの を どうぐ の すぐ よこ に おく
      if (CREATURES[ct].air) { c.state = "dive"; c.sx = tool.cx + 0.5; c.sy = tool.cy; c.dx = 0; c.dy = 0; c.d = 0; c.L = 99; c.x = c.sx; c.y = c.sy; }
      else { const j = path.findIndex((p) => Math.abs(p[0] - spot[0]) + Math.abs(p[1] - spot[1]) === 1); c.s = j; const pp = D.pathPos(path, j); c.x = pp.x; c.y = pp.y; }
      D.step(g, 0.01);
      const hit = c.g > 0;
      check(hit === !!TOOLS[type].power[ct], `${TOOLS[type].emoji} → ${CREATURES[ct].emoji} ${hit ? "きく" : "きかない"}`);
    }
  }
  // ゲージ が いっぱい → くるっ と まわって かえる（コイン）
  const g = D.newGame("free", 4, { season: "spring", paths: 1 });
  const c = D.spawn(g, "ant", 0);
  c.g = c.max - 0.5;
  const path = g.park.paths[0];
  let spot = null;
  for (const d of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const x = path[1][0] + d[0], y = path[1][1] + d[1]; if (!spot && D.canPlace(g, x, y)) spot = [x, y]; }
  if (spot) {
    D.place(g, "fan", spot[0], spot[1]);
    const coins = g.coins;
    c.s = 1;
    D.step(g, 0.02);
    check(c.state === "spin" && g.coins === coins + CREATURES.ant.coin, "ゲージ いっぱい → くるっ と まわって コイン");
    for (let i = 0; i < 200; i++) D.step(g, 0.05);
    check(!g.cre.includes(c) && g.bento === D.BENTO, "かえった いきもの は きえて、おべんとう は へらない");
  }
}

/* ---------- 5. ソルバー ---------- */
console.log(`■ どの ステージ も ★3 が とれる（${SEEDS} こうえん ずつ）`);
{
  const t0 = Date.now();
  for (let s = 1; s <= STAGES.length; s++) {
    let ok = 0, idleLeft = 0, tries = 0;
    const bad = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = D.solve(s, seed);
      tries += r.tries;
      if (r.stars === 3) ok++; else bad.push(seed + ":" + r.left);
      idleLeft += D.play(s, seed, { idle: true }).left;
    }
    check(ok === SEEDS, `${s}. ${STAGES[s - 1].name}: ★3 ${ok}/${SEEDS}（へいきん ${(tries / SEEDS).toFixed(1)} かい め で みつかる${bad.length ? "、だめ " + bad.join(",") : ""}）`);
    check(idleLeft / SEEDS <= 3, `${s}. なにも おかない と まもれない（のこり へいきん ${(idleLeft / SEEDS).toFixed(1)}）`);
  }
  console.log(`  （${((Date.now() - t0) / 1000).toFixed(1)} びょう）`);
}

console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
process.exit(fail ? 1 : 0);
