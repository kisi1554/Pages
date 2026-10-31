/* リバーシ（8×8 / 6×6）— ルール・ひょうか・ヒント */
(function (root) {
  "use strict";
  var BD = root.BD = root.BD || { games: {} };
  var PASS = -1;
  var DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var WCACHE = {};

  function weights(N) {
    if (WCACHE[N]) return WCACHE[N];
    var w = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var er = r === 0 || r === N - 1, ec = c === 0 || c === N - 1;
      var nr = r === 1 || r === N - 2, nc = c === 1 || c === N - 2;
      var v = 1;
      if (er && ec) v = 100;                       // かど
      else if (nr && nc && (r < 2 || r > N - 3) && (c < 2 || c > N - 3)) v = -40; // かど の ななめ となり（X）
      else if ((er && nc && (c < 2 || c > N - 3)) || (ec && nr && (r < 2 || r > N - 3))) v = -15; // かど の となり（C）
      else if (er || ec) v = 8;
      else if (nr || nc) v = -3;
      w.push(v);
    }
    return (WCACHE[N] = w);
  }

  function init(opts) {
    var N = (opts && +opts.size) || 8;
    var b = [];
    for (var i = 0; i < N * N; i++) b.push(0);
    var h = N / 2;
    b[(h - 1) * N + h - 1] = 2; b[h * N + h] = 2;
    b[(h - 1) * N + h] = 1; b[h * N + h - 1] = 1;
    return { N: N, b: b, turn: 1, passes: 0, last: null, flipped: [] };
  }
  function turn(s) { return s.turn; }

  function flips(s, idx, p) {
    var N = s.N, b = s.b;
    if (b[idx] !== 0) return [];
    var r0 = (idx / N) | 0, c0 = idx % N, o = 3 - p, out = [];
    for (var d = 0; d < 8; d++) {
      var dr = DIRS[d][0], dc = DIRS[d][1], r = r0 + dr, c = c0 + dc, line = [];
      while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === o) { line.push(r * N + c); r += dr; c += dc; }
      if (line.length && r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === p) for (var k = 0; k < line.length; k++) out.push(line[k]);
    }
    return out;
  }
  function canFlip(s, idx, p) {
    var N = s.N, b = s.b;
    if (b[idx] !== 0) return false;
    var r0 = (idx / N) | 0, c0 = idx % N, o = 3 - p;
    for (var d = 0; d < 8; d++) {
      var dr = DIRS[d][0], dc = DIRS[d][1], r = r0 + dr, c = c0 + dc, n = 0;
      while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === o) { n++; r += dr; c += dc; }
      if (n && r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === p) return true;
    }
    return false;
  }
  function legal(s, p) {
    var out = [];
    for (var i = 0; i < s.b.length; i++) if (s.b[i] === 0 && canFlip(s, i, p)) out.push(i);
    return out;
  }
  function count(s) {
    var c = [0, 0, 0];
    for (var i = 0; i < s.b.length; i++) c[s.b[i]]++;
    return c;
  }
  function result(s) {
    var c = count(s);
    var over = c[0] === 0 || s.passes >= 2 || c[1] === 0 || c[2] === 0 ||
      (legal(s, s.turn).length === 0 && legal(s, 3 - s.turn).length === 0);
    if (!over) return null;
    return c[1] === c[2] ? 0 : (c[1] > c[2] ? 1 : 2);
  }
  function moves(s) {
    if (result(s) !== null) return [];
    var l = legal(s, s.turn);
    return l.length ? l : [PASS];
  }
  function play(s, m) {
    if (m === PASS) {
      if (legal(s, s.turn).length) throw new Error("pass not allowed");
      return { N: s.N, b: s.b, turn: 3 - s.turn, passes: s.passes + 1, last: PASS, flipped: [] };
    }
    var f = flips(s, m, s.turn);
    if (!f.length) throw new Error("illegal move " + m);
    var b = s.b.slice();
    b[m] = s.turn;
    for (var i = 0; i < f.length; i++) b[f[i]] = s.turn;
    return { N: s.N, b: b, turn: 3 - s.turn, passes: 0, last: m, flipped: f };
  }

  function evaluate(s, p) {
    var N = s.N, b = s.b, w = weights(N), o = 3 - p, pos = 0, cp = 0, co = 0, empty = 0;
    var corners = [0, N - 1, N * (N - 1), N * N - 1];
    for (var i = 0; i < b.length; i++) {
      var x = b[i];
      if (x === 0) { empty++; continue; }
      var wi = w[i];
      if (wi < 0) { // かど が うまって いれば となり は こわくない
        var r = (i / N) | 0, c = i % N;
        var cr = r < N / 2 ? 0 : N - 1, cc = c < N / 2 ? 0 : N - 1;
        if (b[cr * N + cc] !== 0) wi = 4;
      }
      if (x === p) { pos += wi; cp++; } else { pos -= wi; co++; }
    }
    if (empty <= (N >= 8 ? 10 : 6)) return (cp - co) * 12 + pos;
    var mob = legal(s, p).length - legal(s, o).length;
    void corners;
    return pos + mob * 6;
  }
  function searchMoves(s) {
    var ms = moves(s);
    if (ms.length > 1) {
      var w = weights(s.N);
      ms.sort(function (a, b) { return w[b] - w[a]; });
    }
    return ms;
  }
  function score(s) { var c = count(s); return [0, c[1], c[2]]; }

  // ヒント の りゆう
  function reason(s, m) {
    if (m === PASS) return "おける ところ が ない ので「パス」だよ。";
    var N = s.N, f = flips(s, m, s.turn).length;
    var r = (m / N) | 0, c = m % N;
    var corner = (r === 0 || r === N - 1) && (c === 0 || c === N - 1);
    var edge = r === 0 || r === N - 1 || c === 0 || c === N - 1;
    var t = "ここ に おくと " + f + "まい かえせる よ。";
    if (corner) t = "かど だよ！ かど の コマ は もう ひっくりかえされない。" + t;
    else if (edge) t += " はし は とられにくい よ。";
    else if (weights(N)[m] <= -15) t += "（かど の ちかく は あいて に かど を とられやすい ので ちゅうい）";
    var opp = legal(play(s, m), 3 - s.turn);
    var givesCorner = opp.some(function (x) { var rr = (x / N) | 0, cc = x % N; return (rr === 0 || rr === N - 1) && (cc === 0 || cc === N - 1); });
    if (!corner && !givesCorner) t += " あいて に かど を あげない て だよ。";
    return t;
  }

  var G = {
    id: "reversi", PASS: PASS,
    init: init, turn: turn, moves: moves, play: play, result: result, evaluate: evaluate,
    searchMoves: searchMoves, score: score, reason: reason, flips: flips, legal: legal,
    tieTol: 2, reviewScale: 1, reviewMin: 45, reviewDepth: 3, hintDepth: 4
  };
  BD.games.reversi = G;
  if (typeof module !== "undefined" && module.exports) module.exports = G;
})(typeof globalThis !== "undefined" ? globalThis : this);
