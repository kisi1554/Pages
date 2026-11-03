#!/usr/bin/env node
/* まちと みちさがしの テスト:  node yubin-haitatsu/test.js */
"use strict";
const fs = require("fs");
const path = require("path");
const T = require("./town.js");
const R = require("./route.js");

let fail = 0;
const check = (ok, m) => { if (!ok) fail++; console.log((ok ? "  ✓ " : "  ✗ ") + m); };

for (let i = 0; i < T.TOWNS.length; i++) {
  const t = T.make(i);
  const tag = t.name;
  // すべての いえに ゆいいつの じゅうしょ
  const addrs = new Set(t.houses.map((h) => T.addrText(t, h)));
  check(addrs.size === t.houses.length, `${tag}: いえ ${t.houses.length}けん、じゅうしょは ぜんぶ ちがう`);
  check(t.houses.length === t.def.bx * t.def.by * 4 - 1, `${tag}: ブロック × 4けん − ゆうびんきょく`);
  // じゅうしょ ⇄ いえ
  check(t.houses.every((h) => T.find(t, h.chome, h.ban, h.go) === h), `${tag}: じゅうしょ → いえ が いっち`);
  check(t.houses.every((h) => T.houseAt(t, h.x, h.y) === h), `${tag}: ちずの ばしょ → いえ が いっち`);
  // ちょうめ 1〜4、ばん は 1から とぎれない、ごう は ひだりうえ から とけいまわり
  const okCh = [1, 2, 3, 4].every((c) => {
    const bans = [...new Set(t.houses.filter((h) => h.chome === c).map((h) => h.ban))].sort((a, b) => a - b);
    return bans.length && bans.every((b, k) => b === k + 1);
  });
  check(okCh, `${tag}: 1〜4ちょうめ、ばんは 1から じゅんばん（${t.banCount.join("・")}）`);
  const goOk = t.blocks.every((b) => [[1, 0, 0], [2, 1, 0], [3, 1, 1], [4, 0, 1]].every(([g, dx, dy]) => {
    const h = T.find(t, b.chome, b.ban, g);
    return !h || (h.x === b.x0 + dx && h.y === b.y0 + dy);
  }));
  check(goOk, `${tag}: ごうは ひだりうえ から とけいまわり`);
  // ちょうめは ちずの 4つの かど
  const corner = t.houses.every((h) => h.chome === (h.y < t.H / 2 ? 0 : 2) + (h.x < t.W / 2 ? 1 : 2));
  check(corner, `${tag}: 1ひだりうえ・2みぎうえ・3ひだりした・4みぎした`);
  // すべての いえに みちが つながる
  const from = R.bfs(t, t.office.door).dist;
  check(T.isRoad(t, t.office.door.x, t.office.door.y), `${tag}: ゆうびんきょくの まえは みち`);
  const doorOk = t.houses.every((h) => T.isRoad(t, h.door.x, h.door.y) && Math.abs(h.door.x - h.x) + Math.abs(h.door.y - h.y) === 1);
  check(doorOk, `${tag}: どの いえも ドアの まえが みち`);
  const reach = t.houses.every((h) => from[h.door.y * t.W + h.door.x] >= 0);
  check(reach, `${tag}: ゆうびんきょく から ぜんぶの いえに いける`);
  let roads = 0, reached = 0;
  for (let k = 0; k < t.W * t.H; k++) if (t.road[k]) { roads++; if (from[k] >= 0) reached++; }
  check(roads === reached, `${tag}: みちは ぜんぶ つながって いる（${roads}マス、とおれない ところ ${t.cuts.length}）`);
  check(t.cuts.length === t.def.cuts, `${tag}: とおれない みちの かず ${t.def.cuts}`);
  // ゆうびんばんごう: 3けた-4けた、ちょうめで ちがう
  const zips = [1, 2, 3, 4].map((c) => T.postal(t, c));
  check(zips.every((z) => /^\d{3}-\d{4}$/.test(z)) && new Set(zips).size === 4, `${tag}: ゆうびんばんごう ${zips.join(" ")}`);
}
const zipsAll = new Set(T.TOWNS.flatMap((d, i) => [1, 2, 3, 4].map((c) => T.postal(T.make(i), c))));
check(zipsAll.size === 12, "ゆうびんばんごうは まちと ちょうめで ぜんぶ ちがう");
check(T.TOWNS.every((d) => !/[一-鿿]/.test(d.name)), "まちの なまえは オリジナルの ひらがな");

/* BFS: ちいさい まちで ぜんぶの くみあわせを フロイドで たしかめる */
{
  const t = T.make(1);
  const N = t.W * t.H, INF = 1e9;
  const ids = []; for (let k = 0; k < N; k++) if (t.road[k]) ids.push(k);
  const ix = new Map(ids.map((k, i) => [k, i]));
  const n = ids.length, D = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : INF)));
  for (const k of ids) {
    const x = k % t.W, y = (k / t.W) | 0;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (T.isRoad(t, nx, ny)) { const a = ix.get(k), b = ix.get(ny * t.W + nx); D[a][b] = D[b][a] = 1; }
    }
  }
  for (let m = 0; m < n; m++) for (let i = 0; i < n; i++) { const dim = D[i][m]; if (dim >= INF) continue; for (let j = 0; j < n; j++) if (dim + D[m][j] < D[i][j]) D[i][j] = dim + D[m][j]; }
  let bad = 0;
  for (let i = 0; i < n; i += 7) {
    const a = { x: ids[i] % t.W, y: (ids[i] / t.W) | 0 };
    const d = R.bfs(t, a).dist;
    for (let j = 0; j < n; j++) if (d[ids[j]] !== D[i][j]) bad++;
  }
  check(bad === 0, `BFS の きょり ＝ フロイドの きょり（${t.name}、${n}マス）`);
  // path は となりあう みちの マスで、ながさ ＝ きょり
  const a = t.office.door, b = t.houses[t.houses.length - 1].door;
  const p = R.path(t, a, b);
  const pOk = p.every((c, i) => T.isRoad(t, c.x, c.y) && (!i || Math.abs(c.x - p[i - 1].x) + Math.abs(c.y - p[i - 1].y) === 1));
  check(pOk && p.length - 1 === R.dist(t, a, b), `みちの ならび: ${p.length - 1}マス ＝ きょり`);
}

/* さいたん じゅんばん: ぜんぶの じゅんばんを ならべて くらべる */
function perms(a) { if (a.length <= 1) return [a]; const out = []; a.forEach((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).forEach((p) => out.push([x].concat(p)))); return out; }
{
  let bad = 0, cases = 0;
  const r = T.rng(99);
  for (let c = 0; c < 60; c++) {
    const t = T.make(c % 3);
    const k = 2 + (c % 5);
    const stops = T.shuffle(t.houses, r).slice(0, k).map((h) => h.door);
    const o = t.office.door;
    const best = R.bestOrder(t, o, stops, o);
    let brute = Infinity;
    for (const p of perms([...stops.keys()])) brute = Math.min(brute, R.routeLength(t, o, p.map((i) => stops[i]), o));
    const own = R.routeLength(t, o, best.order.map((i) => stops[i]), o);
    if (best.length !== brute || own !== best.length || best.order.length !== k) bad++;
    cases++;
  }
  check(bad === 0, `さいたん じゅんばん ＝ ぜんさく（${cases}もん、2〜6つう）`);
  // fullPath の ながさ
  const t = T.make(2), o = t.office.door, st = t.houses.slice(0, 5).map((h) => h.door);
  const b = R.bestOrder(t, o, st, o), fp = R.fullPath(t, o, b.order.map((i) => st[i]), o);
  check(fp.length - 1 === b.length, `ルートの マスの かず ＝ さいたん きょり（${b.length}）`);
}

/* ステージ */
{
  let ok = true, t8 = 0;
  for (let d = 1; d <= 40; d++) {
    const s = T.stage(d), t = T.make(s.town);
    const hs = s.letters.map((l) => l.house);
    if (new Set(hs).size !== hs.length || hs.some((h) => !t.houses[h])) ok = false;
    if (s.letters.length < 3 || s.letters.length > 8) ok = false;
    if (d === 1 && s.letters.some((l) => l.kind === "kozutsumi" || l.express)) ok = false;
    if (d >= 2 && !s.letters.some((l) => l.kind === "kozutsumi")) ok = false;
    if (d >= 3 && !s.letters.some((l) => l.express)) ok = false;
    if (s.letters.some((l) => l.express && l.kind === "kozutsumi")) ok = false;
    const st = JSON.stringify(T.stage(d));
    if (st !== JSON.stringify(s)) ok = false;
    const t0 = Date.now();
    R.bestOrder(t, t.office.door, s.letters.map((l) => t.houses[l.house].door), t.office.door);
    t8 = Math.max(t8, Date.now() - t0);
  }
  check(ok, "1〜40にちめ: てがみ 3〜8つう・おなじ いえ なし・こづつみ（2にちめ〜）・そくたつ（3にちめ〜）・おなじ シードで おなじ");
  check(T.stage(1).letters.length === 3 && T.stage(20).letters.length === 8, "てがみは 3つう から 8つう まで ふえる");
  check(T.townForDay(1) === 0 && T.townForDay(6) === 1 && T.townForDay(12) === 2, "まちが ひろがる（さくら → みなと → もり）");
  check(t8 < 500, `8つうの さいたん けいさん ${t8}ms`);
}

/* ヒント */
{
  const t = T.make(0);
  const a = T.find(t, 2, 3, 1), b = T.find(t, 2, 3, 2), c = T.find(t, 2, 1, 1), d = T.find(t, 4, 1, 1);
  check(/となり/.test(T.missHint(a, b)), "ヒント: おなじ ばん →「となりの いえ みたい」");
  check(/ばんが ちがう/.test(T.missHint(a, c)), "ヒント: おなじ ちょうめ →「ばんが ちがう」");
  check(/ちょうめが ちがう/.test(T.missHint(a, d)), "ヒント: ちがう ちょうめ →「ちょうめが ちがう」");
}

/* ふりがな: ルビの そとに かんじが ない */
const KANJI = /[一-鿿]/;
const noRuby = (s) => String(s).replace(/<ruby>[\s\S]*?<\/ruby>/g, "");
const texts = [];
for (const d of T.TOWNS) texts.push(d.name, d.cutName);
texts.push(...T.SURNAMES);
for (let i = 0; i < 3; i++) { const t = T.make(i); for (const h of t.houses) texts.push(T.addrText(t, h)); }
const badTxt = texts.filter((s) => KANJI.test(noRuby(s)));
check(badTxt.length === 0, `データの もじに ルビ なしの かんじが ない${badTxt.length ? "（" + badTxt.slice(0, 3).join(" / ") + "）" : ""}`);
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const body = html.slice(html.indexOf("<body"), html.indexOf("<script src")).replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ");
check(!KANJI.test(noRuby(body)), "index.html の がめんの もじに かんじが ない");
for (const f of ["app.js", "town.js"]) {
  const src = fs.readFileSync(path.join(__dirname, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const strs = src.match(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g) || [];
  const bad = strs.filter((s) => KANJI.test(noRuby(s)));
  check(bad.length === 0, `${f} の もじれつに かんじが ない${bad.length ? "（" + bad.slice(0, 3).join(" / ") + "）" : ""}`);
}

console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
process.exit(fail ? 1 : 0);
