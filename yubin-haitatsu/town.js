/* ゆうびん はいたつ — まちの データ（グリッド・いえ・じゅうしょ）。DOM なし。
 *
 * まちは マス（グリッド）。x%3==0 か y%3==0 の マスが みち、のこりが いえ。
 * 3×3 マスの なかの 2×2 が 1ブロック（＝ばん）、ブロックの 4けんが ごう。
 * ごうは ほんものの まちと おなじく ひだりうえ から とけいまわり（1 ひだりうえ・2 みぎうえ・3 みぎした・4 ひだりした）。
 * ちょうめは まちを たて・よこ はんぶんに わけた 4つ（1 ひだりうえ・2 みぎうえ・3 ひだりした・4 みぎした）。
 * ばんは ちょうめの なかで ひだりうえ から よむ じゅん。
 * まちは いつも おなじ（シード こてい）なので、あそぶ ほど ちずを おぼえられる。
 */
(function (root) {
  "use strict";

  const TOWNS = [
    { id: "sakura", name: "さくらまち", emoji: "🌸", bx: 4, by: 4, code: "512", seed: 11, cuts: 0, cutName: "" },
    { id: "minato", name: "みなとまち", emoji: "⚓", bx: 6, by: 4, code: "513", seed: 23, cuts: 5, cutName: "こうじちゅう" },
    { id: "mori", name: "もりまち", emoji: "🌲", bx: 6, by: 6, code: "514", seed: 37, cuts: 9, cutName: "もりの き" },
  ];
  const CHOME_COLORS = ["#ffc9c9", "#a5d8ff", "#b2f2bb", "#ffec99"]; // 1〜4ちょうめ（うすい いろ）
  const CHOME_INKS = ["#e03131", "#1971c2", "#2f9e44", "#e67700"];   // かんばんの いろ
  const SURNAMES = [
    "やまだ", "すずき", "たなか", "さとう", "いとう", "わたなべ", "たかはし", "こばやし", "なかむら", "やまもと",
    "かとう", "よしだ", "やまぐち", "まつもと", "いのうえ", "きむら", "はやし", "しみず", "やまざき", "もり",
    "あべ", "いけだ", "はしもと", "いしかわ", "おがわ", "ごとう", "おかだ", "はせがわ", "むらかみ", "こんどう",
    "いしい", "さかもと", "えんどう", "あおき", "ふじた", "にしむら", "ふくだ", "おおた", "みうら", "ふじい",
    "のむら", "まるやま", "うえだ", "すぎやま", "ほんだ", "くどう", "あらい", "ひらの",
  ];
  const GO_POS = [[0, 0], [1, 0], [1, 1], [0, 1]]; // ごう 1〜4 の ブロック内 いち（とけいまわり）

  /* シード つき らんすう（mulberry32） */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, r) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  const isRoadXY = (x, y) => x % 3 === 0 || y % 3 === 0;
  const isCross = (x, y) => x % 3 === 0 && y % 3 === 0;

  function connected(t) {
    // みちの マスが ぜんぶ つながって いるか
    let start = -1, total = 0;
    for (let i = 0; i < t.W * t.H; i++) if (t.road[i]) { total++; if (start < 0) start = i; }
    const seen = new Uint8Array(t.W * t.H); const q = [start]; seen[start] = 1; let n = 0;
    while (q.length) {
      const c = q.pop(); n++;
      const x = c % t.W, y = (c / t.W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= t.W || ny >= t.H) continue;
        const k = ny * t.W + nx;
        if (t.road[k] && !seen[k]) { seen[k] = 1; q.push(k); }
      }
    }
    return n === total;
  }

  // いえの となりの みち（ドアに できる ところ）
  function doorCandidates(t, hx, hy) {
    const out = [];
    for (const [dx, dy, side] of [[0, -1, "n"], [1, 0, "e"], [0, 1, "s"], [-1, 0, "w"]]) {
      const x = hx + dx, y = hy + dy;
      if (x < 0 || y < 0 || x >= t.W || y >= t.H) continue;
      if (t.road[y * t.W + x]) out.push({ x, y, side });
    }
    return out;
  }

  const cache = {};
  function make(idx) {
    if (cache[idx]) return cache[idx];
    const def = TOWNS[idx];
    const r = rng(def.seed * 7919 + 1);
    const W = def.bx * 3 + 1, H = def.by * 3 + 1;
    const t = { idx, def, id: def.id, name: def.name, W, H, road: new Uint8Array(W * H), cuts: [], houses: [], blocks: [] };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isRoadXY(x, y)) t.road[y * W + x] = 1;

    // ゆうびんきょく: まんなかの こうさてんの ひだりうえの ブロックの みぎした
    const obx = Math.floor(def.bx / 2) - 1, oby = Math.floor(def.by / 2) - 1;
    const office = { x: obx * 3 + 2, y: oby * 3 + 2 };
    office.door = { x: office.x + 1, y: office.y, side: "e" };
    t.office = office;

    // とおれない みち（こうじ・もり）: こうさてんの あいだ 2マスを まとめて ふさぐ
    const segs = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!isRoadXY(x, y) || isCross(x, y)) continue;
      if (y % 3 === 0 && x % 3 === 1) segs.push([[x, y], [x + 1, y]]);
      if (x % 3 === 0 && y % 3 === 1) segs.push([[x, y], [x, y + 1]]);
    }
    const offDoorKey = office.door.y * W + office.door.x;
    for (const seg of shuffle(segs, r)) {
      if (t.cuts.length >= def.cuts) break;
      const ks = seg.map(([x, y]) => y * W + x);
      if (ks.includes(offDoorKey)) continue;
      // まちの そとがわの みちは のこす（ぐるっと まわれるように）
      if (seg.some(([x, y]) => x === 0 || y === 0 || x === W - 1 || y === H - 1)) continue;
      ks.forEach((k) => (t.road[k] = 0));
      let ok = connected(t);
      // どの いえにも ドアが のこるか
      if (ok) for (const [x, y] of seg) {
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const hx = x + dx, hy = y + dy;
          if (hx < 0 || hy < 0 || hx >= W || hy >= H || isRoadXY(hx, hy)) continue;
          if (!doorCandidates(t, hx, hy).length) ok = false;
        }
      }
      if (ok) t.cuts.push(seg); else ks.forEach((k) => (t.road[k] = 1));
    }

    // ちょうめ・ばん・ごう
    const hbx = def.bx / 2, hby = def.by / 2;
    const chomeOf = (bi, bj) => (bj < hby ? 0 : 2) + (bi < hbx ? 0 : 1) + 1;
    const banCount = [0, 0, 0, 0, 0];
    const names = [];
    while (names.length < def.bx * def.by * 4) names.push(...shuffle(SURNAMES, r));
    let ni = 0;
    for (let ch = 1; ch <= 4; ch++) {
      for (let bj = 0; bj < def.by; bj++) for (let bi = 0; bi < def.bx; bi++) {
        if (chomeOf(bi, bj) !== ch) continue;
        const ban = ++banCount[ch];
        const block = { chome: ch, ban, bi, bj, x0: bi * 3 + 1, y0: bj * 3 + 1 };
        t.blocks.push(block);
        GO_POS.forEach(([px, py], gi) => {
          const x = block.x0 + px, y = block.y0 + py;
          if (x === office.x && y === office.y) return; // ゆうびんきょく
          const cand = doorCandidates(t, x, y);
          const door = cand[Math.floor(r() * cand.length)];
          t.houses.push({ id: t.houses.length, chome: ch, ban, go: gi + 1, x, y, door, name: names[ni++] });
        });
      }
    }
    t.banCount = banCount.slice(1);
    t.byKey = {};
    t.houses.forEach((h) => (t.byKey[h.chome + "-" + h.ban + "-" + h.go] = h));
    cache[idx] = t;
    return t;
  }

  function find(t, chome, ban, go) { return t.byKey[chome + "-" + ban + "-" + go] || null; }
  function houseAt(t, x, y) { return t.houses.find((h) => h.x === x && h.y === y) || null; }
  function addrText(t, h, noTown) {
    return (noTown ? "" : t.name + " ") + h.chome + "ちょうめ " + h.ban + "ばん " + h.go + "ごう";
  }
  function addrShort(h) { return h.chome + "-" + h.ban + "-" + h.go; }
  // ゆうびんばんごう（オリジナル）: まえの 3けた ＝ まち、うしろの 4けた ＝ 01＋ちょうめ
  function postal(t, chome) { return t.def.code + "-010" + chome; }
  /* ちがう いえに いれようと した ときの ヒント */
  function missHint(target, h) {
    if (target.chome === h.chome && target.ban === h.ban) return "となりの いえ みたい！ ごうを よく みてね（" + target.go + "ごう）";
    if (target.chome === h.chome) return "おなじ " + h.chome + "ちょうめ だけど、ばんが ちがうよ（" + target.ban + "ばん）";
    return "ちょうめが ちがうよ。" + target.chome + "ちょうめ を さがそう";
  }
  function isRoad(t, x, y) { return x >= 0 && y >= 0 && x < t.W && y < t.H && !!t.road[y * t.W + x]; }

  /* その日の はいたつ ステージ（シード ＝ 日にち） */
  function townForDay(day) {
    if (day <= 4) return 0;
    if (day <= 9) return 1;
    if (day <= 15) return 2;
    return rng(day * 131)() < 0.34 ? 0 : (day % 2 ? 1 : 2);
  }
  function stage(day) {
    const r = rng(day * 1000003 + 7);
    const t = make(townForDay(day));
    const n = Math.min(8, 2 + Math.ceil(day / 2));
    let picks;
    for (let tries = 0; ; tries++) {
      picks = shuffle(t.houses, r).slice(0, n);
      const chs = new Set(picks.map((h) => h.chome));
      if (chs.size >= Math.min(n - 1, 3) || tries > 50) break; // いろんな ちょうめに ちらす
    }
    let express = 0;
    const letters = picks.map((h, i) => {
      let kind = r() < 0.5 ? "hagaki" : "futo";
      if (day >= 2 && r() < 0.22) kind = "kozutsumi";
      let ex = false;
      if (day >= 3 && kind !== "kozutsumi" && express < 2 && r() < 0.25) { ex = true; express++; }
      return { id: i, house: h.id, kind, express: ex };
    });
    // こづつみ は 2にちめ から、そくたつ は 3にちめ から かならず 1つ
    if (day >= 2 && !letters.some((l) => l.kind === "kozutsumi")) { letters[0].kind = "kozutsumi"; letters[0].express = false; }
    if (day >= 3 && !letters.some((l) => l.express)) letters.find((l) => l.kind !== "kozutsumi").express = true;
    return { day, town: t.idx, letters };
  }

  const api = { TOWNS, CHOME_COLORS, CHOME_INKS, SURNAMES, rng, shuffle, make, find, houseAt, addrText, addrShort, postal, missHint, isRoad, stage, townForDay };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.YHTown = api;
})(typeof window !== "undefined" ? window : globalThis);
