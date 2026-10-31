/* まるばつ（3×3）— ルール・かんぜん よみ・ヒント */
(function (root) {
  "use strict";
  var BD = root.BD = root.BD || { games: {} };
  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

  function init() { return { b: [0, 0, 0, 0, 0, 0, 0, 0, 0], turn: 1, last: null, line: null }; }
  function turn(s) { return s.turn; }
  function winLine(b) {
    for (var i = 0; i < 8; i++) { var L = LINES[i]; if (b[L[0]] && b[L[0]] === b[L[1]] && b[L[1]] === b[L[2]]) return L; }
    return null;
  }
  function result(s) {
    var L = winLine(s.b);
    if (L) return s.b[L[0]];
    for (var i = 0; i < 9; i++) if (!s.b[i]) return null;
    return 0;
  }
  function moves(s) {
    if (result(s) !== null) return [];
    var out = [];
    for (var i = 0; i < 9; i++) if (!s.b[i]) out.push(i);
    return out;
  }
  function play(s, m) {
    if (s.b[m] !== 0 || result(s) !== null) throw new Error("illegal move " + m);
    var b = s.b.slice(); b[m] = s.turn;
    return { b: b, turn: 3 - s.turn, last: m, line: winLine(b) };
  }
  function evaluate(s, p) {
    var v = 0;
    for (var i = 0; i < 8; i++) {
      var L = LINES[i], a = 0, o = 0;
      for (var k = 0; k < 3; k++) { if (s.b[L[k]] === p) a++; else if (s.b[L[k]]) o++; }
      if (!o) v += a * a; if (!a) v -= o * o;
    }
    return v;
  }
  // かんぜん よみ（メモ つき）: てばん から みて 1=かち 0=ひきわけ -1=まけ
  var memo = {};
  function perfectValue(s) {
    var key = s.b.join("") + s.turn;
    if (key in memo) return memo[key];
    var r = result(s), v;
    if (r !== null) v = r === 0 ? 0 : (r === s.turn ? 1 : -1);
    else {
      v = -2;
      var ms = moves(s);
      for (var i = 0; i < ms.length; i++) { var x = -perfectValue(play(s, ms[i])); if (x > v) v = x; }
    }
    return (memo[key] = v || 0);
  }
  // さいぜん の て ぜんぶ（はやく かてる / おそく まける て を ゆうせん）
  function depthTo(s) {
    var r = result(s);
    if (r !== null) return 0;
    var v = perfectValue(s), best = v > 0 ? 99 : -1;
    moves(s).forEach(function (m) {
      var n = play(s, m);
      if (-perfectValue(n) !== v) return;
      var d = depthTo(n) + 1;
      if (v > 0 ? d < best : d > best) best = d;
    });
    return best;
  }
  function perfectMoves(s) {
    var ms = moves(s);
    if (!ms.length) return [];
    var v = perfectValue(s);
    var good = ms.filter(function (m) { return -perfectValue(play(s, m)) === v; });
    if (v !== 0) {
      var ds = good.map(function (m) { return depthTo(play(s, m)); });
      var target = v > 0 ? Math.min.apply(null, ds) : Math.max.apply(null, ds);
      good = good.filter(function (m, i) { return ds[i] === target; });
    }
    return good;
  }
  function score() { return null; }
  function threats(b, p) { // p が つぎ に おけば ならぶ ところ
    var out = [];
    LINES.forEach(function (L) {
      var a = 0, e = -1;
      L.forEach(function (i) { if (b[i] === p) a++; else if (!b[i]) e = i; });
      if (a === 2 && e >= 0 && out.indexOf(e) < 0) out.push(e);
    });
    return out;
  }
  function reason(s, m) {
    var p = s.turn, o = 3 - p;
    if (threats(s.b, p).indexOf(m) >= 0) return "ここ に おくと 3つ ならぶ！ かち だよ。";
    if (threats(s.b, o).indexOf(m) >= 0) return "ここ を ふさがない と あいて が 3つ ならべちゃう よ！";
    var n = play(s, m);
    if (threats(n.b, p).length >= 2) return "ここ に おくと「かてる ばしょ」が 2つ できる。あいて は 1つ しか ふさげない よ！";
    if (m === 4) return "まんなか は 4ほん の せん に つかえる、いちばん つよい ばしょ だよ。";
    if (m === 0 || m === 2 || m === 6 || m === 8) return "かど は 3ほん の せん に つかえる よ。";
    return "ここ なら あいて に「かてる ばしょ 2つ」を つくらせない よ。";
  }
  var G = {
    id: "marubatsu",
    init: init, turn: turn, moves: moves, play: play, result: result, evaluate: evaluate,
    perfectValue: perfectValue, perfectMoves: perfectMoves, score: score, reason: reason, threats: threats,
    tieTol: 0, reviewScale: 1, reviewMin: 400, depthCap: { 2: 1, 3: 2 }
  };
  BD.games.marubatsu = G;
  if (typeof module !== "undefined" && module.exports) module.exports = G;
})(typeof globalThis !== "undefined" ? globalThis : this);
