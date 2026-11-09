/* ダイヤ を つくろう の せんろ と ステージ（オリジナル の せんろ。じっさい の てつどう がいしゃ の ダイヤ では ない）
 *  fix: さいしょ から ある でんしゃ（かえられない）。もじ は "L0-3@8:00/2+3"（しゅるい・でる えき-つく えき@でる じこく/えき+よぶん に まつ ぷん）
 *  req: おだい。{ type:"L"|"E"|"*", from, to, n, win:[でる じこく の はば], by:つく じこく まで }
 *  fleet: つかって よい でんしゃ の かず（おりかえし は 3ぷん いじょう あける）
 *  bonus: ★3 の とくべつ おだい（xfer: のりかえ／fleet: でんしゃ の かず）
 *  par: めやす の まち じかん（ans の まち じかん）。ans: てがき の かいとう（test.js で たしかめる）
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DT_DATA = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var LINES = {
    // ふくせん の みじかい せん
    LA: {
      stations: [
        { n: "A", name: "あおば", km: 0, p: 3, ex: true },
        { n: "B", name: "さくら", km: 4, p: 1 },
        { n: "C", name: "みなと", km: 8, p: 2, ex: true },
        { n: "D", name: "やまて", km: 13, p: 3, ex: true }
      ],
      secs: [{ d: 2, t: 4, te: 3 }, { d: 2, t: 4, te: 3 }, { d: 2, t: 5, te: 4 }]
    },
    // たんせん（どの えき でも すれちがい できる）
    LB: {
      stations: [
        { n: "A", name: "ひがしの", km: 0, p: 3 },
        { n: "B", name: "いずみ", km: 4, p: 2 },
        { n: "C", name: "おか", km: 7, p: 2 },
        { n: "D", name: "はやし", km: 11, p: 2 },
        { n: "E", name: "かわぐち", km: 14, p: 3 }
      ],
      secs: [{ d: 1, t: 4 }, { d: 1, t: 3 }, { d: 1, t: 4 }, { d: 1, t: 3 }]
    },
    // たんせん（C えき は ホーム 1つ ＝ すれちがい できない）
    LB1: {
      stations: [
        { n: "A", name: "ひがしの", km: 0, p: 3 },
        { n: "B", name: "いずみ", km: 4, p: 2 },
        { n: "C", name: "おか", km: 7, p: 1 },
        { n: "D", name: "はやし", km: 11, p: 2 },
        { n: "E", name: "かわぐち", km: 14, p: 3 }
      ],
      secs: [{ d: 1, t: 4 }, { d: 1, t: 3 }, { d: 1, t: 4 }, { d: 1, t: 3 }]
    },
    // ふくせん・きゅうこう（C と E で おいこし できる）
    LC: {
      stations: [
        { n: "A", name: "うみべ", km: 0, p: 3, ex: true },
        { n: "B", name: "みどり", km: 3, p: 1 },
        { n: "C", name: "ほしの", km: 6, p: 2, ex: true },
        { n: "D", name: "つばさ", km: 9, p: 1 },
        { n: "E", name: "ゆめの", km: 12, p: 2 },
        { n: "F", name: "たかね", km: 16, p: 3, ex: true }
      ],
      secs: [{ d: 2, t: 3, te: 2 }, { d: 2, t: 3, te: 2 }, { d: 2, t: 3, te: 2 }, { d: 2, t: 3, te: 2 }, { d: 2, t: 4, te: 3 }]
    },
    // A〜C は ふくせん、C から さき は たんせん。C に しゃこ
    LD: {
      stations: [
        { n: "A", name: "みなみ", km: 0, p: 4, ex: true },
        { n: "B", name: "ひばり", km: 3, p: 1 },
        { n: "C", name: "もりの", km: 6, p: 2, ex: true, depot: true },
        { n: "D", name: "あさひ", km: 9, p: 2 },
        { n: "E", name: "しずか", km: 12, p: 1 },
        { n: "F", name: "こはる", km: 15, p: 2, ex: true },
        { n: "G", name: "やまのうえ", km: 19, p: 4, ex: true }
      ],
      secs: [{ d: 2, t: 3, te: 2 }, { d: 2, t: 3, te: 2 }, { d: 1, t: 3, te: 2 }, { d: 1, t: 3, te: 2 }, { d: 1, t: 3, te: 2 }, { d: 1, t: 4, te: 3 }]
    }
  };

  var CHAPTERS = [
    { n: 1, name: "ダイヤ を よもう", icon: "👀", desc: "できて いる ダイヤ を よんで こたえよう" },
    { n: 2, name: "ふくせん", icon: "🛤️", desc: "のぼり・くだり べつ の せんろ。じかん どおり に ひこう" },
    { n: 3, name: "たんせん", icon: "🔀", desc: "せんろ が 1ぽん。えき で まって すれちがい" },
    { n: 4, name: "きゅうこう", icon: "⚡", desc: "はやい きゅうこう が ふつう を おいこす" },
    { n: 5, name: "いそがしい あさ", icon: "🌅", desc: "たくさん の でんしゃ・しゃこ・おりかえし" }
  ];

  var STAGES = [
    /* ---- 1. ダイヤ を よもう ---- */
    { id: 1, ch: 1, title: "はじめて の ダイヤ", line: "LA", view: ["8:00", "8:35"],
      fix: ["L0-3@8:00", "L0-3@8:10", "L3-0@8:04"],
      quiz: [{ q: "arr", tr: 0, st: 2 }, { q: "count", st: 0, dir: 1, win: ["8:00", "8:20"] }, { q: "dep", tr: 2, st: 1 }] },
    { id: 2, ch: 1, title: "はやい のは どれ？", line: "LA", view: ["8:00", "8:40"],
      fix: ["L0-3@8:00", "E0-3@8:06", "L0-3@8:16/2+4"],
      quiz: [{ q: "fast", among: [0, 1] }, { q: "arr", tr: 1, st: 3 }, { q: "long", tr: 2 }] },
    { id: 3, ch: 1, title: "たんせん の すれちがい", line: "LB", view: ["8:00", "8:35"],
      fix: ["L0-4@8:00", "L4-0@8:02/3+8"],
      quiz: [{ q: "meet", a: 0, b: 1 }, { q: "long", tr: 1 }, { q: "dep", tr: 0, st: 2 }] },
    { id: 4, ch: 1, title: "おいこし を みつけよう", line: "LC", view: ["8:00", "8:30"],
      fix: ["L0-5@8:00/2+2", "E0-5@8:04"],
      quiz: [{ q: "pass", a: 0, b: 1 }, { q: "fast", among: [0, 1] }, { q: "arr", tr: 1, st: 5 }] },
    { id: 5, ch: 1, title: "いろいろ な でんしゃ", line: "LD", view: ["8:00", "8:45"],
      fix: ["L0-6@8:00", "L6-0@8:00", "E0-6@8:12", "L2-0@8:08"],
      quiz: [{ q: "meet", a: 0, b: 1 }, { q: "count", st: 2, dir: -1, win: ["8:00", "8:20"] }, { q: "fast", among: [0, 2] }, { q: "arr", tr: 2, st: 6 }] },

    /* ---- 2. ふくせん ---- */
    { id: 6, ch: 2, title: "1ぽん ひいて みよう", line: "LA", view: ["8:00", "8:30"], guide: true, types: "L",
      req: [{ type: "L", from: 0, to: 3, n: 1, win: ["8:00", "8:05"] }] },
    { id: 7, ch: 2, title: "いって かえって", line: "LA", view: ["8:00", "8:35"], types: "L",
      req: [{ type: "L", from: 0, to: 3, n: 1, win: ["8:00", "8:05"] }, { type: "L", from: 3, to: 0, n: 1, win: ["8:08", "8:12"] }] },
    { id: 8, ch: 2, title: "10ぷん おき", line: "LA", view: ["8:00", "8:45"], types: "L",
      fix: ["L3-0@8:02", "L3-0@8:17"],
      req: [{ type: "L", from: 0, to: 3, n: 1, win: ["8:00", "8:02"] }, { type: "L", from: 0, to: 3, n: 1, win: ["8:10", "8:12"] },
        { type: "L", from: 0, to: 3, n: 1, win: ["8:20", "8:22"] }] },
    { id: 9, ch: 2, title: "つづけて 2ほん", line: "LA", view: ["8:00", "8:30"], types: "L",
      req: [{ type: "L", from: 0, to: 3, n: 2, win: ["8:00", "8:02"] }, { type: "L", from: 3, to: 0, n: 1, win: ["8:05", "8:08"] }] },
    { id: 10, ch: 2, title: "きゅうこう に きを つけて", line: "LA", view: ["8:00", "8:40"], types: "L",
      fix: ["E0-3@8:08", "L3-0@8:03"],
      req: [{ type: "L", from: 0, to: 3, n: 1, win: ["8:00", "8:06"] }, { type: "L", from: 0, to: 3, n: 1, win: ["8:12", "8:16"] },
        { type: "L", from: 3, to: 0, n: 1, win: ["8:10", "8:16"] }] },

    /* ---- 3. たんせん ---- */
    { id: 11, ch: 3, title: "えき で まって", line: "LB", view: ["8:00", "8:35"], guide: true, types: "L",
      fix: ["L4-0@8:03"],
      req: [{ type: "L", from: 0, to: 4, n: 1, win: ["8:00", "8:01"] }] },
    { id: 12, ch: 3, title: "2かい すれちがう", line: "LB", view: ["8:00", "8:45"], types: "L",
      fix: ["L4-0@8:00", "L4-0@8:19"],
      req: [{ type: "L", from: 0, to: 4, n: 1, win: ["8:05", "8:07"] }] },
    { id: 13, ch: 3, title: "いったり きたり", line: "LB", view: ["8:00", "8:50"], types: "L",
      fix: ["L4-0@8:03", "L4-0@8:26"],
      req: [{ type: "L", from: 0, to: 4, n: 1, win: ["8:00", "8:01"] }, { type: "L", from: 0, to: 4, n: 1, win: ["8:12", "8:14"] }] },
    { id: 14, ch: 3, title: "すれちがえない えき", line: "LB1", view: ["8:00", "8:40"], types: "L",
      fix: ["L4-0@8:01"],
      req: [{ type: "L", from: 0, to: 4, n: 1, win: ["8:00", "8:02"] }] },
    { id: 15, ch: 3, title: "じぶん で ぜんぶ", line: "LB", view: ["8:00", "8:50"], types: "L",
      req: [{ type: "L", from: 0, to: 4, n: 1, win: ["8:00", "8:03"] }, { type: "L", from: 4, to: 0, n: 1, win: ["8:00", "8:03"] },
        { type: "L", from: 0, to: 4, n: 1, win: ["8:18", "8:22"] }, { type: "L", from: 4, to: 0, n: 1, win: ["8:18", "8:22"] }] },

    /* ---- 4. きゅうこう ---- */
    { id: 16, ch: 4, title: "おいこされる ふつう", line: "LC", view: ["8:00", "8:30"], guide: true, types: "L",
      fix: ["E0-5@8:04"],
      req: [{ type: "L", from: 0, to: 5, n: 1, win: ["8:00", "8:01"] }] },
    { id: 17, ch: 4, title: "きゅうこう を ひこう", line: "LC", view: ["8:00", "8:35"], types: "LE",
      req: [{ type: "L", from: 0, to: 5, n: 1, win: ["8:00", "8:02"] }, { type: "E", from: 0, to: 5, n: 1, win: ["8:03", "8:06"], by: "8:20" }] },
    { id: 18, ch: 4, title: "2ほん の きゅうこう", line: "LC", view: ["8:00", "8:45"], types: "L",
      fix: ["E0-5@8:05", "E0-5@8:17"],
      req: [{ type: "L", from: 0, to: 5, n: 1, win: ["8:00", "8:02"] }, { type: "L", from: 0, to: 5, n: 1, win: ["8:09", "8:12"] }] },
    { id: 19, ch: 4, title: "のりかえ べんり", line: "LC", view: ["8:00", "8:40"], types: "LE",
      fix: ["L5-0@8:02", "L5-0@8:14"],
      req: [{ type: "L", from: 0, to: 5, n: 1, win: ["8:00", "8:02"] }, { type: "E", from: 0, to: 5, n: 1, win: ["8:03", "8:08"] }],
      bonus: { k: "xfer", at: 2, dir: 1, max: 2 } },
    { id: 20, ch: 4, title: "のぼり にも きゅうこう", line: "LC", view: ["8:00", "8:45"], types: "LE",
      req: [{ type: "L", from: 0, to: 5, n: 1, win: ["8:00", "8:02"] }, { type: "E", from: 0, to: 5, n: 1, win: ["8:04", "8:08"] },
        { type: "L", from: 5, to: 0, n: 1, win: ["8:00", "8:03"] }, { type: "E", from: 5, to: 0, n: 1, win: ["8:05", "8:09"] }],
      bonus: { k: "xfer", at: 2, dir: -1, max: 2 } },

    /* ---- 5. いそがしい あさ ---- */
    { id: 21, ch: 5, title: "しゃこ から しゅっぱつ", line: "LD", view: ["8:00", "8:45"], types: "L",
      fix: ["L6-0@8:00", "L0-6@8:00", "L6-0@8:16", "L0-6@8:16"],
      req: [{ type: "L", from: 2, to: 0, n: 1, win: ["8:05", "8:10"] }, { type: "L", from: 2, to: 6, n: 1, win: ["8:06", "8:11"] },
        { type: "L", from: 0, to: 2, n: 1, win: ["8:24", "8:28"] }] },
    { id: 22, ch: 5, title: "おりかえし", line: "LD", view: ["8:00", "9:15"], types: "L", fleet: 2,
      fix: ["L0-6@8:00", "L6-0@8:15"],
      req: [{ type: "L", from: 6, to: 0, n: 1, win: ["8:22", "8:32"] }, { type: "L", from: 0, to: 6, n: 1, win: ["8:36", "8:46"] }] },
    { id: 23, ch: 5, title: "あさ の ラッシュ", line: "LD", view: ["8:00", "9:05"], types: "LE",
      fix: ["L0-6@8:00", "L6-0@8:00", "L6-0@8:15", "L0-6@8:16", "L2-0@8:06", "L0-2@8:30"],
      req: [{ type: "E", from: 0, to: 6, n: 1, win: ["8:30", "8:38"] }, { type: "L", from: 2, to: 0, n: 1, win: ["8:12", "8:18"] },
        { type: "L", from: 0, to: 2, n: 1, win: ["8:12", "8:18"] }, { type: "E", from: 6, to: 0, n: 1, win: ["8:26", "8:34"] }] },
    { id: 24, ch: 5, title: "でんしゃ が たりない！", line: "LD", view: ["8:00", "9:05"], types: "L", fleet: 3,
      fix: ["L0-6@8:00", "L6-0@8:00", "L2-0@8:04"],
      req: [{ type: "L", from: 0, to: 6, n: 1, win: ["8:14", "8:20"] }, { type: "L", from: 6, to: 0, n: 1, win: ["8:24", "8:32"] },
        { type: "L", from: 0, to: 2, n: 1, win: ["8:20", "8:30"] }, { type: "L", from: 2, to: 6, n: 1, win: ["8:30", "8:40"] }] },
    { id: 25, ch: 5, title: "まち の 1にち", line: "LD", view: ["8:00", "9:10"], types: "LE", fleet: 7,
      fix: ["L0-6@8:00", "L6-0@8:00", "L2-0@8:05", "E6-0@8:16"],
      req: [{ type: "E", from: 0, to: 6, n: 1, win: ["8:24", "8:30"] }, { type: "L", from: 2, to: 0, n: 1, win: ["8:20", "8:26"] },
        { type: "L", from: 0, to: 6, n: 1, win: ["8:13", "8:19"] }, { type: "L", from: 6, to: 0, n: 1, win: ["8:26", "8:32"] },
        { type: "L", from: 0, to: 2, n: 1, win: ["8:28", "8:34"] }, { type: "E", from: 6, to: 0, n: 1, win: ["8:36", "8:42"] }],
      bonus: { k: "fleet", max: 6 } }
  ];

  /* てがき の かいとう と めやす の まち じかん（tools/daiya-tsukuro/solve.js --write で かきなおせる） */
  /* ANS:start */
  var ANS = {
    6: { par: 0, ans: ["L0-3@8:00"] },
    7: { par: 0, ans: ["L0-3@8:00", "L3-0@8:08"] },
    8: { par: 0, ans: ["L0-3@8:00", "L0-3@8:10", "L0-3@8:20"] },
    9: { par: 0, ans: ["L0-3@8:00", "L0-3@8:02", "L3-0@8:05"] },
    10: { par: 0, ans: ["L0-3@8:00", "L3-0@8:10", "L0-3@8:12"] },
    11: { par: 1, ans: ["L0-4@8:01/2+1"] },
    12: { par: 1, ans: ["L0-4@8:07/3+1"] },
    13: { par: 4, ans: ["L0-4@8:01/2+1", "L0-4@8:12/3+3"] },
    14: { par: 6, ans: ["L0-4@8:02/1+6"] },
    15: { par: 0, ans: ["L0-4@8:00", "L4-0@8:00", "L0-4@8:18", "L4-0@8:18"] },
    16: { par: 2, ans: ["L0-5@8:00/2+2"] },
    17: { par: 2, ans: ["L0-5@8:00/2+2", "E0-5@8:04"] },
    18: { par: 3, ans: ["L0-5@8:01/2+2", "L0-5@8:10/4+1"] },
    19: { par: 2, ans: ["L0-5@8:00/2+2", "E0-5@8:04"] },
    20: { par: 3, ans: ["L0-5@8:00/4+1", "L5-0@8:00/2+2", "E5-0@8:06", "E0-5@8:07"] },
    21: { par: 0, ans: ["L2-0@8:05", "L2-6@8:10", "L0-2@8:24"] },
    22: { par: 0, ans: ["L6-0@8:27", "L0-6@8:42"] },
    23: { par: 0, ans: ["L2-0@8:12", "L0-2@8:12", "E6-0@8:31", "E0-6@8:36"] },
    24: { par: 0, ans: ["L0-6@8:14", "L0-2@8:27", "L6-0@8:28", "L2-6@8:37"] },
    25: { par: 1, ans: ["L0-6@8:13", "L2-0@8:20", "E0-6@8:24", "L0-2@8:28", "L6-0@8:29/5+1", "E6-0@8:40"] }
  };
  /* ANS:end */
  STAGES.forEach(function (s) { if (ANS[s.id]) { s.par = ANS[s.id].par; s.ans = ANS[s.id].ans; } });

  return { LINES: LINES, CHAPTERS: CHAPTERS, STAGES: STAGES };
});
