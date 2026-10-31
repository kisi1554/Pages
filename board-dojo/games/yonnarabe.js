/* おとして 4つならべ（7れつ × 6だん）— ルール・ひょうか・ヒント
   b[r*W + c]、r=0 が いちばん した */
(function (root) {
  "use strict";
  var BD = root.BD = root.BD || { games: {} };
  var WIN_CACHE = {};
  function windows(W, H) {
    var k = W + "x" + H;
    if (WIN_CACHE[k]) return WIN_CACHE[k];
    var out = [], D = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (var r = 0; r < H; r++) for (var c = 0; c < W; c++) for (var d = 0; d < 4; d++) {
      var dr = D[d][0], dc = D[d][1], er = r + 3 * dr, ec = c + 3 * dc;
      if (er < 0 || er >= H || ec < 0 || ec >= W) continue;
      out.push([r * W + c, (r + dr) * W + c + dc, (r + 2 * dr) * W + c + 2 * dc, er * W + ec]);
    }
    return (WIN_CACHE[k] = out);
  }
  function init(opts) {
    var W = (opts && +opts.w) || 7, H = (opts && +opts.h) || 6, b = [], h = [];
    for (var i = 0; i < W * H; i++) b.push(0);
    for (var c = 0; c < W; c++) h.push(0);
    return { W: W, H: H, b: b, h: h, turn: 1, n: 0, last: null, win: 0, line: null };
  }
  function turn(s) { return s.turn; }
  function lineAt(b, W, H, idx, p) {
    var r0 = (idx / W) | 0, c0 = idx % W, D = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (var d = 0; d < 4; d++) {
      var dr = D[d][0], dc = D[d][1], cells = [idx];
      for (var sgn = -1; sgn <= 1; sgn += 2) {
        var r = r0 + dr * sgn, c = c0 + dc * sgn;
        while (r >= 0 && r < H && c >= 0 && c < W && b[r * W + c] === p) { cells.push(r * W + c); r += dr * sgn; c += dc * sgn; }
      }
      if (cells.length >= 4) return cells;
    }
    return null;
  }
  function result(s) {
    if (s.win) return s.win;
    return s.n >= s.W * s.H ? 0 : null;
  }
  var ORDER_CACHE = {};
  function order(W) {
    if (ORDER_CACHE[W]) return ORDER_CACHE[W];
    var o = [], mid = (W - 1) / 2;
    for (var c = 0; c < W; c++) o.push(c);
    o.sort(function (a, b) { return Math.abs(a - mid) - Math.abs(b - mid) || a - b; });
    return (ORDER_CACHE[W] = o);
  }
  function moves(s) {
    if (result(s) !== null) return [];
    var out = [];
    for (var c = 0; c < s.W; c++) if (s.h[c] < s.H) out.push(c);
    return out;
  }
  function play(s, c) {
    if (result(s) !== null || !(c >= 0 && c < s.W) || s.h[c] >= s.H) throw new Error("illegal move " + c);
    var b = s.b.slice(), h = s.h.slice(), idx = h[c] * s.W + c;
    b[idx] = s.turn; h[c]++;
    var line = lineAt(b, s.W, s.H, idx, s.turn);
    return { W: s.W, H: s.H, b: b, h: h, turn: 3 - s.turn, n: s.n + 1, last: c, lastIdx: idx, win: line ? s.turn : 0, line: line };
  }
  function winsNow(s, p) { // p が おとせば すぐ 4つ に なる れつ
    var out = [];
    for (var c = 0; c < s.W; c++) {
      if (s.h[c] >= s.H) continue;
      var idx = s.h[c] * s.W + c;
      s.b[idx] = p;
      var ok = lineAt(s.b, s.W, s.H, idx, p);
      s.b[idx] = 0;
      if (ok) out.push(c);
    }
    return out;
  }
  function evaluate(s, p) {
    var ws = windows(s.W, s.H), b = s.b, o = 3 - p, v = 0;
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i], a = 0, e = 0;
      for (var k = 0; k < 4; k++) { var x = b[w[k]]; if (x === p) a++; else if (x === o) e++; }
      if (e === 0) v += a === 3 ? 9 : a === 2 ? 3 : a;
      else if (a === 0) v -= e === 3 ? 10 : e === 2 ? 3 : e;
    }
    var mid = (s.W - 1) >> 1;
    for (var r = 0; r < s.H; r++) { var y = b[r * s.W + mid]; if (y === p) v += 4; else if (y === o) v -= 4; }
    return v;
  }
  function searchMoves(s) {
    if (result(s) !== null) return [];
    var o = order(s.W), out = [];
    for (var i = 0; i < o.length; i++) if (s.h[o[i]] < s.H) out.push(o[i]);
    return out;
  }
  function score() { return null; }
  function reason(s, c) {
    var p = s.turn, o = 3 - p;
    if (winsNow(s, p).indexOf(c) >= 0) return "ここ に おとすと 4つ ならぶ！ かち だよ。";
    if (winsNow(s, o).indexOf(c) >= 0) return "ここ に おとさない と、あいて が 4つ ならべちゃう よ！";
    var n = play(s, c);
    if (winsNow(n, p).length >= 2) return "ここ に おとすと「かてる れつ」が 2つ できる。あいて は 1つ しか ふさげない よ！";
    var bad = moves(s).filter(function (x) { return winsNow(play(s, x), o).length > 0; });
    if (bad.length && bad.indexOf(c) < 0) return "ほか の れつ だと、その うえ に あいて が おとして かっちゃう ところ が ある。ここ なら だいじょうぶ。";
    if (c === (s.W - 1) >> 1) return "まんなか の れつ は、よこ・ななめ どちら にも ならべやすい よ。";
    return "ここ に おとすと、つぎ に ならべやすく なる よ。";
  }
  var G = {
    id: "yonnarabe",
    init: init, turn: turn, moves: moves, play: play, result: result, evaluate: evaluate,
    searchMoves: searchMoves, score: score, reason: reason, winsNow: winsNow,
    tieTol: 1, reviewScale: 1, reviewMin: 25, reviewDepth: 6, hintDepth: 7, depthCap: { 2: 2, 3: 5 }
  };
  BD.games.yonnarabe = G;
  if (typeof module !== "undefined" && module.exports) module.exports = G;
})(typeof globalThis !== "undefined" ? globalThis : this);
