/* しりとり判定の テスト:  node shiritori-ressha/test.js */
"use strict";
var S = require("./shiritori.js");
var WORDS = require("./words.js");

var pass = 0, fail = 0;
function eq(actual, expected, label) {
  if (actual === expected) { pass++; }
  else { fail++; console.log("NG  " + label + "  →  " + JSON.stringify(actual) + "（期待: " + JSON.stringify(expected) + "）"); }
}
function ok(cond, label) { eq(!!cond, true, label); }

// --- さいごの もじ ---
eq(S.lastChar("ぼーる"), "る", "ぼーる → る");
eq(S.lastChar("まんごー"), "ご", "まんごー → ご（ー は ひとつ前）");
eq(S.lastChar("けーき"), "き", "けーき → き");
eq(S.lastChar("よーよー"), "よ", "よーよー → よ");
eq(S.lastChar("ボール"), "る", "カタカナ ボール → る");
eq(S.lastChar("きしゃ"), "や", "きしゃ → や（小さい字は大きく）");
eq(S.lastChar("でんしゃ"), "や", "でんしゃ → や");
eq(S.lastChar("ちょこれーと"), "と", "ちょこれーと → と");
eq(S.lastChar("ぎゅうにゅう"), "う", "ぎゅうにゅう → う");
eq(S.lastChar("ゆーふぉー"), "お", "ゆーふぉー → お");
eq(S.lastChar("ろけっと"), "と", "ろけっと → と");
eq(S.lastChar("いちご"), "ご", "にごりは そのまま（いちご → ご）");
eq(S.head("じゃがいも"), "じ", "じゃがいも は じ で はじまる");

// --- 「ん」で おわる ---
ok(S.endsWithN("みかん"), "みかん は ん");
ok(S.endsWithN("パン"), "パン は ん");
ok(S.endsWithN("らーめん"), "らーめん は ん");
ok(!S.endsWithN("でんしゃ"), "でんしゃ は ん ではない");
ok(!S.endsWithN("しんかんせんー") === false, "しんかんせんー も ん");
ok(!S.endsWithN("ごりら"), "ごりら は ん ではない");

// --- つながる？ ---
ok(S.connects("ごりら", "らっぱ", false), "ごりら → らっぱ");
ok(S.connects("ぼーる", "るびー", false), "ぼーる → るびー");
ok(S.connects("きしゃ", "やぎ", false), "きしゃ → やぎ");
ok(!S.connects("きしゃ", "しか", false), "きしゃ → しか は ×");
ok(!S.connects("いちご", "こあら", false), "いちご → こあら は にごり ゆるさない とき ×");
ok(S.connects("いちご", "こあら", true), "いちご → こあら は にごり ゆるす とき ○");
ok(S.connects("いちご", "ごりら", false), "いちご → ごりら");
ok(S.connects("かえる", "るーぺ", false), "かえる → るーぺ");
ok(S.connects("らっぱ", "ぱんだ", false), "らっぱ → ぱんだ");
ok(S.connects("らっぱ", "はさみ", true), "ぱ と は（にごり ゆるす）");
ok(S.connects("らっぱ", "ばなな", true), "ぱ と ば（にごり ゆるす）");
ok(!S.connects("らっぱ", "はさみ", false), "ぱ と は（ゆるさない）");
ok(S.connects("たこ", "ごりら", true), "こ → ご（にごり ゆるす）");
ok(!S.connects("たこ", "ごりら", false), "こ → ご（ゆるさない）");

// --- データ ---
eq(WORDS.length >= 150, true, "150語 以上（" + WORDS.length + "語）");
var seen = {};
WORDS.forEach(function (o) {
  ok(!seen[o.w], "かさなりなし: " + o.w); seen[o.w] = 1;
  ok(/^[ぁ-んー]+$/.test(o.w), "ひらがな: " + o.w);
  ok(o.e && o.g, "絵文字・ジャンル: " + o.w);
});
var nCount = WORDS.filter(function (o) { return S.endsWithN(o.w); }).length;
ok(nCount >= 18 && nCount <= 30, "「ん」で おわる語が 20語ほど（" + nCount + "語）");

var EXCEPT = { "ぬ": 2 }; // ぬ は 2語（なくなったら まほうの きっぷ）
S.SEION.forEach(function (c) {
  var n = WORDS.filter(function (o) { return S.head(o.w) === c; }).length;
  ok(n >= (EXCEPT[c] || 3), "「" + c + "」で はじまる語: " + n);
});
ok(!WORDS.some(function (o) { return S.lastChar(o.w) === "を"; }), "「を」で おわる語は ない");

// --- くばりかた（ランダムに たくさん あそんでみる） ---
function seeded(seed) {
  return function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
}
var maxLen = 0, rescues = 0, traps = 0, completes = 0;
for (var g = 0; g < 400; g++) {
  var rng = seeded(g + 1), nigori = g % 2 === 1;
  var start = S.pickStart(WORDS, rng);
  ok(start && !S.endsWithN(start.w), "はじめの ことばは ん で おわらない");
  var used = new Set([start.w]), need = S.lastChar(start.w), len = 0;
  for (var step = 0; step < 300; step++) {
    var cards = S.deal(need, used, nigori, WORDS, rng);
    ok(cards.length >= 2 && cards.length <= 4, "カードは 2〜4まい");
    var goods = cards.filter(function (c) { return c.kind === "ok" || c.kind === "rescue"; });
    if (!goods.length) {
      // つづけられないのは 「ん」で おわらない ことばを ぜんぶ つかいきった ときだけ（ゴール）
      var left = WORDS.filter(function (o) { return !used.has(o.w) && !S.endsWithN(o.w); }).length;
      eq(left, 0, "つづけられないのは ぜんぶ つかいきった ときだけ（" + need + "）");
      completes++;
      break;
    }
    var nOk = cards.filter(function (c) { return c.kind === "ok" || c.kind === "trap"; }).length;
    ok(nOk <= 2, "正解は 2まいまで");
    cards.forEach(function (c) {
      if (!c.word) return;
      ok(!used.has(c.word.w), "つかった ことばは でない: " + c.word.w);
      var follows = S.canFollow(need, c.word.w, nigori);
      if (c.kind === "wrong") ok(!follows, "はずれは つながらない: " + need + "→" + c.word.w);
      else ok(follows, "正解は つながる: " + need + "→" + c.word.w);
      if (c.kind === "trap") { traps++; ok(S.endsWithN(c.word.w), "わなは ん で おわる"); }
      if (c.kind === "ok") ok(!S.endsWithN(c.word.w), "ok は ん で おわらない");
    });
    var okCard = cards.filter(function (c) { return c.kind === "ok"; })[0];
    if (okCard) { used.add(okCard.word.w); need = S.lastChar(okCard.word.w); len++; }
    else {
      var rc = cards.filter(function (c) { return c.kind === "rescue"; })[0];
      if (!rc) break;
      rescues++; need = rc.next;
    }
  }
  maxLen = Math.max(maxLen, len);
}
ok(maxLen >= 50, "ながく つづけられる（さいだい " + maxLen + "りょう）");
ok(completes > 0, "ぜんぶ つかいきって ゴールできる（" + completes + "）");
ok(rescues > 0, "まほうの きっぷが でることが ある（" + rescues + "）");
ok(traps > 0, "わなカードが でることが ある（" + traps + "）");

console.log((fail ? "❌" : "✅") + " pass " + pass + " / fail " + fail + "   （" + WORDS.length + "語、ん で おわる語 " + nCount + "）");
process.exit(fail ? 1 : 0);
