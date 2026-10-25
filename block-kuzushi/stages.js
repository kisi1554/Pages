/* ============================================================
   ドカーン ブロックくずし — ステージ データ（40こ）
   1ぎょう 11もじ。もじの いみ:
     .  なにもない        1〜7 ふつう（いろ）
     H  かたい（2かい）   X  かたい（3かい）
     B  ばくだん（まわり 8マスを まきこむ）
     I  こおり（ボールが すべる）
     M  うごく ブロック（つながった M が いっしょに よこへ うごく）
     #  こわれない かべ
     m マルチボール  w ワイド  l レーザー  f ファイア  s スロー  c キャッチ  u +1ライフ
     ?  なにかの アイテム いり
   10・20・30・40 は ボス（boss: に かいじゅうの せってい）
   ============================================================ */
(function (root) {
  "use strict";
  var COLS = 11;

  var STAGES = [
    { name: "はじめの いっぽ", map: [
      "...........",
      ".111111111.",
      ".222222222.",
      ".333333333.",
      ".44444m444."] },
    { name: "ピラミッド", map: [
      ".....1.....",
      "....121....",
      "...12321...",
      "..1234321..",
      ".123454321.",
      "12345w54321"] },
    { name: "かたい ブロック", map: [
      "...........",
      "HHH.HHH.HHH",
      ".666.6.666.",
      ".666.c.666.",
      ".666.6.666.",
      "...........",
      "44444444444"] },
    { name: "ばくだん どかーん", map: [
      "...........",
      ".333333333.",
      ".33B333B33.",
      ".333333333.",
      ".555B5B555.",
      ".555555555.",
      ".55555?555."] },
    { name: "つるつる こおり", map: [
      "...........",
      "IIIIIIIIIII",
      ".1.1.1.1.1.",
      "IIIIIIIIIII",
      ".2.2s2.2.2.",
      "IIIIIIIIIII"] },
    { name: "アイテム まつり", map: [
      "...........",
      ".?1?1?1?1?.",
      ".1m1w1f1c1.",
      ".?1?1?1?1?.",
      ".444444444."] },
    { name: "うごく ブロック", map: [
      "...........",
      "MMM........",
      "...........",
      "........MMM",
      ".666666666.",
      ".6H6H6H6H6.",
      ".666666666."] },
    { name: "かべの すきま", map: [
      "...........",
      ".111111111.",
      ".222m22222.",
      ".333333333.",
      "####...####",
      "...........",
      "..5555555.."] },
    { name: "ばくだん れんさ", map: [
      "...........",
      "B.B.B.B.B.B",
      ".B.B.B.B.B.",
      "5B5B5B5B5B5",
      "55555555555",
      "HHHHHmHHHHH"] },
    { name: "かいじゅう ブロックン", boss: { kind: 0, name: "ブロックン", hp: 8, speed: 55, fire: 3.2, spread: 1 }, map: [
      "...........",
      "..H.....H..",
      ".1111?1111.",
      "..........."] },

    { name: "しましま", map: [
      "11111111111",
      "...........",
      "22222222222",
      "...........",
      "3333B333333",
      "...........",
      "HHHHHHHHHHH"] },
    { name: "まと", map: [
      "...XXXXX...",
      "..X55555X..",
      ".X55BBB55X.",
      ".X55BuB55X.",
      ".X55BBB55X.",
      "..X55555X..",
      "...XXXXX..."] },
    { name: "こおりの しろ", map: [
      "I#IIIIIII#I",
      "I#I11111I#I",
      "I#I1lll1I#I",
      "I#I11111I#I",
      "I.IIIIIII.I"] },
    { name: "うごく かべ", map: [
      "...........",
      "MMMM.......",
      ".......MMMM",
      "MMMM.......",
      "##.......##",
      ".333333333.",
      ".3H3H3H3H3."] },
    { name: "にじの アーチ", map: [
      "...11111...",
      "..1222221..",
      ".123333321.",
      ".123444321.",
      ".123.f.321.",
      ".12.....21.",
      ".1.......1."] },
    { name: "ばくだん めいろ", map: [
      "#.#.#.#.#.#",
      "B2B2B2B2B2B",
      "#.#.#.#.#.#",
      "2B2B2B2B2B2",
      "#.#.#.#.#.#",
      "HHHHHHHHHHH"] },
    { name: "まもりの かべ", map: [
      ".XXXXXXXXX.",
      ".X4444444X.",
      ".X4BmmB44X.",
      ".X4444444X.",
      ".XXXX.XXXX.",
      "#####.#####"] },
    { name: "ダイヤ", map: [
      ".....H.....",
      "....H6H....",
      "...H6B6H...",
      "..H6BuB6H..",
      "...H6B6H...",
      "....H6H....",
      ".....H....."] },
    { name: "びゅんびゅん", map: [
      "MMMMM......",
      "......MMMMM",
      "B.B.B.B.B.B",
      ".4.4.4.4.4.",
      "4.4.4.4.4.4",
      "XXXXXXXXXXX"] },
    { name: "かいじゅう ガチゴチ", boss: { kind: 1, name: "ガチゴチ", hp: 12, speed: 75, fire: 2.7, spread: 1 }, map: [
      "...........",
      ".#.......#.",
      ".HH.H?H.HH.",
      "..........."] },

    { name: "ちょうちょ", map: [
      "22.......22",
      "232.....232",
      "2342...2432",
      "23B42.24B32",
      "2342...2432",
      "232..?..232",
      "22.......22"] },
    { name: "こおりの めいろ", map: [
      "IIIII#IIIII",
      "I...I#I...I",
      "I.1.I#I.1.I",
      "I...I.I...I",
      "IIIII.IIIII",
      "..#.....#.."] },
    { name: "ばくだん ベルト", map: [
      "BBBBBBBBBBB",
      "MMM....MMM.",
      "33333333333",
      ".H.H.H.H.H.",
      "XXXX.l.XXXX"] },
    { name: "おしろ", map: [
      "#.#.....#.#",
      "#5#.....#5#",
      "#5#55555#5#",
      "#555555555#",
      "#55HHHHH55#",
      "#55H?u?H55#",
      ".....H....."] },
    { name: "ほし", map: [
      ".....X.....",
      "....X3X....",
      "XXXX333XXXX",
      ".X3333333X.",
      "..X33B33X..",
      ".X33X.X33X.",
      "XX.......XX"] },
    { name: "うごく まつり", map: [
      "MM.........",
      "...MM......",
      "......MM...",
      "........MM.",
      "..MMMMMMM..",
      ".?.?.?.?.?.",
      "66666666666"] },
    { name: "ばくはつ ドミノ", map: [
      "BBBBBBBBBBB",
      "B.........B",
      "B.HHHHHHH.B",
      "B.H5555mH.B",
      "B.HHHHHHH.B",
      "B.........B",
      "BBBBB.BBBBB"] },
    { name: "とおせんぼ", map: [
      "...........",
      ".666.6.666.",
      "##.#####.##",
      ".X.X.X.X.X.",
      "##.#####.##",
      "44444c44444"] },
    { name: "かたい とりで", map: [
      "XXXXXXXXXXX",
      "XBXBXBXBXBX",
      "X?X?X?X?X?X",
      "MMMM.......",
      ".......MMMM",
      "IIIIIIIIIII"] },
    { name: "かいじゅう メラメラ", boss: { kind: 2, name: "メラメラ", hp: 16, speed: 95, fire: 2.2, spread: 2 }, map: [
      "...........",
      "#..I...I..#",
      ".BB..?..BB.",
      "..........."] },

    { name: "ぎっしり", map: [
      "12345671234",
      "23456712345",
      "34567123456",
      "4567B234567",
      "56712345671",
      "67123456712",
      "71234567123"] },
    { name: "まど", map: [
      "#.#######.#",
      "#.#11111#.#",
      "#.#1BBB1#.#",
      "#.#11111#.#",
      "#...HHH...#",
      "#....m....#"] },
    { name: "はしご", map: [
      "1#2#3#4#5#6",
      "1#2#3#4#5#6",
      "1#2#3#4#5#6",
      "1#2#3#4#5#6",
      "B.B.B?B.B.B"] },
    { name: "こおりの ピラミッド", map: [
      ".....I.....",
      "....III....",
      "...IIfII...",
      "..IIIIIII..",
      ".IIIIIIIII.",
      "XXXXX.XXXXX"] },
    { name: "ばくだん パーティー", map: [
      "B.B.B.B.B.B",
      ".B.B.B.B.B.",
      "B.B.BmB.B.B",
      ".B.B.B.B.B.",
      "B.B.B.B.B.B",
      "HHHHHHHHHHH",
      "XXXXXXXXXXX"] },
    { name: "かいだん", map: [
      "55.........",
      "55##.......",
      "5555##.....",
      "555555##...",
      "55555555##.",
      "5555555555."] },
    { name: "うごく ばくだん", map: [
      "MMMMM......",
      "......MMMMM",
      ".BBBBBBBBB.",
      ".XHXHXHXHX.",
      ".?.?.?.?.?."] },
    { name: "みっつの へや", map: [
      "XXX#XXX#XXX",
      "X1X#X2X#X3X",
      "XXX#XXX#XXX",
      "...#...#...",
      ".B...u...B."] },
    { name: "さいごの しれん", map: [
      "IXIXIXIXIXI",
      "XBXBXBXBXBX",
      "IXIXIuIXIXI",
      "MMMM.......",
      ".......MMMM",
      "##..###..##"] },
    { name: "ドカーンキング", boss: { kind: 3, name: "ドカーンキング", hp: 24, speed: 105, fire: 1.8, spread: 3 }, map: [
      "...........",
      "B.#..?..#.B",
      ".XX.....XX.",
      "..........."] }
  ];

  var BREAKABLE = /[1-7HXBIMmwlfscu?]/;
  var VALID = /^[.1-7HXBIM#mwlfscu?]+$/;

  // うごく ブロックの まとまり（M の れんぞく）と、うごける はば（マス）
  function moverRuns(row) {
    var runs = [], c = 0;
    while (c < row.length) {
      if (row[c] !== "M") { c++; continue; }
      var a = c;
      while (c < row.length && row[c] === "M") c++;
      var b = c - 1;
      var k = a - 1; while (k >= 0 && row[k] === ".") k--;
      var left = a - 1 - k; if (k >= 0 && row[k] === "M") left = Math.floor(left / 2);
      k = b + 1; while (k < row.length && row[k] === ".") k++;
      var right = k - b - 1; if (k < row.length && row[k] === "M") right = Math.floor(right / 2);
      runs.push({ a: a, b: b, left: left, right: right });
    }
    return runs;
  }

  // こわれない かべ（#）に とじこめられて ボールが とどかない ブロック を さがす
  // ばんめんの うえ（てんじょうとの すきま）と した（パドルがわ）は ひらいて いる
  function unreachable(stage) {
    var rows = stage.map.length, R = rows + 2;
    var open = function (r, c) { return r === 0 || r === R - 1 || stage.map[r - 1][c] !== "#"; };
    var seen = [], q = [];
    for (var r = 0; r < R; r++) { seen.push(new Array(COLS).fill(false)); }
    for (var c0 = 0; c0 < COLS; c0++) { seen[R - 1][c0] = true; q.push([R - 1, c0]); }
    while (q.length) {
      var p = q.pop();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nr = p[0] + d[0], nc = p[1] + d[1];
        if (nr < 0 || nr >= R || nc < 0 || nc >= COLS || seen[nr][nc] || !open(nr, nc)) return;
        seen[nr][nc] = true; q.push([nr, nc]);
      });
    }
    var bad = [];
    stage.map.forEach(function (row, r) {
      for (var c = 0; c < COLS; c++) if (BREAKABLE.test(row[c]) && !seen[r + 1][c]) bad.push([r, c]);
    });
    return bad;
  }

  var api = { COLS: COLS, STAGES: STAGES, BREAKABLE: BREAKABLE, VALID: VALID, moverRuns: moverRuns, unreachable: unreachable };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BKStages = api;
})(typeof window !== "undefined" ? window : globalThis);
