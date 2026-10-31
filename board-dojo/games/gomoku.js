/* ごもくならべ（15×15 / 9×9）— ルール・ひょうか・ヒント
   5つ いじょう ならべたら かち（かんたん ルール）。せってい で 三三（さんさん）きんし（どちら にも）。 */
(function (root) {
  "use strict";
  var BD = root.BD = root.BD || { games: {} };
  var D4 = [[0, 1], [1, 0], [1, 1], [1, -1]];
  var W = [0, 1, 6, 40, 400, 0];
  var WCACHE = {};
  function windows(N) {
    if (WCACHE[N]) return WCACHE[N];
    var out = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) for (var d = 0; d < 4; d++) {
      var dr = D4[d][0], dc = D4[d][1], er = r + 4 * dr, ec = c + 4 * dc;
      if (er < 0 || er >= N || ec < 0 || ec >= N) continue;
      var w = [];
      for (var k = 0; k < 5; k++) w.push((r + k * dr) * N + c + k * dc);
      out.push(w);
    }
    return (WCACHE[N] = out);
  }

  function init(opts) {
    var N = (opts && +opts.size) || 15, b = [];
    for (var i = 0; i < N * N; i++) b.push(0);
    return { N: N, b: b, turn: 1, n: 0, last: null, win: 0, line: null, ban33: !!(opts && opts.ban33) };
  }
  function turn(s) { return s.turn; }
  function lineThrough(b, N, idx, p) {
    var r0 = (idx / N) | 0, c0 = idx % N;
    for (var d = 0; d < 4; d++) {
      var dr = D4[d][0], dc = D4[d][1], cells = [idx];
      for (var sg = -1; sg <= 1; sg += 2) {
        var r = r0 + dr * sg, c = c0 + dc * sg;
        while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === p) { cells.push(r * N + c); r += dr * sg; c += dc * sg; }
      }
      if (cells.length >= 5) return cells;
    }
    return null;
  }
  function result(s) {
    if (s.win) return s.win;
    if (s.n >= s.N * s.N) return 0;
    // 三三 きんし で、のこり が ぜんぶ おけない ばしょ なら ひきわけ
    if (s.ban33 && s.n > s.N * s.N * 0.7) {
      for (var i = 0; i < s.b.length; i++) if (s.b[i] === 0 && !isForbidden(s, i, s.turn)) return null;
      return 0;
    }
    return null;
  }

  // 三三: おいた ところ で「つぎ に いっぱつ で ひらいた 4（_XXXX_）に なる 3」が 2ほうこう いじょう
  function isThreeDir(b, N, idx, p, dr, dc) {
    var r0 = (idx / N) | 0, c0 = idx % N, L = {};
    for (var k = -5; k <= 5; k++) {
      var r = r0 + k * dr, c = c0 + k * dc;
      L[k] = (r >= 0 && r < N && c >= 0 && c < N) ? (k === 0 ? p : b[r * N + c]) : 3;
    }
    for (var j = -4; j <= 4; j++) {
      if (j === 0 || L[j] !== 0) continue;
      L[j] = p;
      for (var a = -3; a <= 0; a++) {
        if (j < a || j > a + 3) continue;
        var ok = L[a - 1] === 0 && L[a + 4] === 0;
        for (var q = a; q <= a + 3 && ok; q++) if (L[q] !== p) ok = false;
        // 6つ いじょう に なる ものは かぞえない
        if (ok && L[a - 2] !== p && L[a + 5] !== p) { L[j] = 0; return true; }
      }
      L[j] = 0;
    }
    return false;
  }
  function isForbidden(s, idx, p) {
    if (!s.ban33 || s.b[idx] !== 0) return false;
    var b = s.b, N = s.N;
    // はやい ふるい: 2ほうこう に じぶん の いし が 2こ いじょう ちかく に ないなら だいじょうぶ
    var r0 = (idx / N) | 0, c0 = idx % N, dirs = 0;
    for (var d = 0; d < 4; d++) {
      var dr = D4[d][0], dc = D4[d][1], n = 0;
      for (var k = -3; k <= 3; k++) {
        if (!k) continue;
        var r = r0 + k * dr, c = c0 + k * dc;
        if (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === p) n++;
      }
      if (n >= 2) dirs++;
    }
    if (dirs < 2) return false;
    b[idx] = p;
    var five = lineThrough(b, N, idx, p);
    b[idx] = 0;
    if (five) return false; // 5つ に なる なら おいて よい
    var t = 0;
    for (var e = 0; e < 4; e++) if (isThreeDir(b, N, idx, p, D4[e][0], D4[e][1])) t++;
    return t >= 2;
  }

  function moves(s) {
    if (result(s) !== null) return [];
    var out = [];
    for (var i = 0; i < s.b.length; i++) if (s.b[i] === 0 && !isForbidden(s, i, s.turn)) out.push(i);
    return out;
  }
  function play(s, m) {
    if (result(s) !== null || s.b[m] !== 0 || m < 0 || m >= s.b.length || isForbidden(s, m, s.turn)) throw new Error("illegal move " + m);
    var b = s.b.slice();
    b[m] = s.turn;
    var line = lineThrough(b, s.N, m, s.turn);
    return { N: s.N, b: b, turn: 3 - s.turn, n: s.n + 1, last: m, win: line ? s.turn : 0, line: line, ban33: s.ban33 };
  }

  // ばん ぜんたい を しらべる: れんぞく の ちから と「つぎ に 5つ に なる ばしょ」
  function scan(s) {
    var ws = windows(s.N), b = s.b, v = [0, 0, 0], wins = [null, [], []];
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i], c1 = 0, c2 = 0, e = -1;
      for (var k = 0; k < 5; k++) { var x = b[w[k]]; if (x === 1) c1++; else if (x === 2) c2++; else e = w[k]; }
      if (c2 === 0 && c1) { v[1] += W[c1]; if (c1 === 4 && wins[1].indexOf(e) < 0) wins[1].push(e); }
      else if (c1 === 0 && c2) { v[2] += W[c2]; if (c2 === 4 && wins[2].indexOf(e) < 0) wins[2].push(e); }
    }
    return { v: v, wins: wins };
  }
  function evaluate(s, p) {
    var a = scan(s), tm = s.turn, o = 3 - tm, val;
    if (a.wins[tm].length) val = 50000;
    else if (a.wins[o].length >= 2) val = -40000;
    else val = a.v[tm] * 1.3 - a.v[o];
    return p === tm ? val : -val;
  }
  // 1つ の ます に おいた とき の ねうち（せめ と まもり）
  function cellInfo(s, idx, p) {
    var N = s.N, b = s.b, o = 3 - p, r0 = (idx / N) | 0, c0 = idx % N, att = 0, def = 0, five = false, block = false, fours = 0, oppFours = 0;
    for (var d = 0; d < 4; d++) {
      var dr = D4[d][0], dc = D4[d][1];
      for (var st = -4; st <= 0; st++) {
        var sr = r0 + st * dr, sc = c0 + st * dc, er = sr + 4 * dr, ec = sc + 4 * dc;
        if (sr < 0 || sr >= N || sc < 0 || sc >= N || er < 0 || er >= N || ec < 0 || ec >= N) continue;
        var a = 0, e = 0;
        for (var k = 0; k < 5; k++) { var x = b[(sr + k * dr) * N + sc + k * dc]; if (x === p) a++; else if (x === o) e++; }
        if (e === 0) { att += W[a + 1] || 100000; if (a === 4) five = true; if (a === 3) fours++; }
        if (a === 0) { def += W[e + 1] || 100000; if (e === 4) block = true; if (e === 3) oppFours++; }
      }
    }
    return { att: att, def: def, five: five, block: block, fours: fours, oppFours: oppFours };
  }
  function near(s, dist) {
    var N = s.N, b = s.b, mark = [], out = [];
    for (var i = 0; i < b.length; i++) {
      if (!b[i]) continue;
      var r0 = (i / N) | 0, c0 = i % N;
      for (var dr = -dist; dr <= dist; dr++) for (var dc = -dist; dc <= dist; dc++) {
        var r = r0 + dr, c = c0 + dc;
        if (r < 0 || r >= N || c < 0 || c >= N) continue;
        var j = r * N + c;
        if (!b[j] && !mark[j]) { mark[j] = 1; out.push(j); }
      }
    }
    return out;
  }
  function searchMoves(s, ply, limit) {
    if (result(s) !== null) return [];
    var N = s.N, p = s.turn;
    if (s.n === 0) return [((N / 2) | 0) * N + ((N / 2) | 0)];
    var cand = near(s, 2), info = [], fives = [], blocks = [];
    for (var i = 0; i < cand.length; i++) {
      var ci = cellInfo(s, cand[i], p);
      if (ci.five) fives.push(cand[i]);
      else if (ci.block) blocks.push(cand[i]);
      info.push({ m: cand[i], sc: ci.att + ci.def * 0.9 });
    }
    if (fives.length) return [fives[0]];
    var ok = function (m) { return !isForbidden(s, m, p); };
    if (blocks.length) {
      var bl = blocks.filter(ok);
      if (bl.length) return bl;
    }
    info.sort(function (a, b) { return b.sc - a.sc; });
    var lim = limit || (ply === 0 ? 14 : ply === 1 ? 10 : 7), out = [];
    for (var j = 0; j < info.length && out.length < lim; j++) if (ok(info[j].m)) out.push(info[j].m);
    if (!out.length) { var all = moves(s); if (all.length) out.push(all[0]); }
    return out;
  }
  function randomPool(s) {
    if (s.n === 0) return searchMoves(s, 0);
    var p = s.turn;
    var pool = near(s, 2).filter(function (m) { return !isForbidden(s, m, p); });
    return pool.length ? pool : moves(s);
  }
  function score() { return null; }
  function reason(s, m) {
    var p = s.turn, o = 3 - p, ci = cellInfo(s, m, p);
    if (ci.five) return "ここ に おくと 5つ ならぶ！ かち だよ。";
    if (ci.block) return "ここ を ふさがない と、あいて が 5つ ならべちゃう よ！";
    var n = play(s, m), a = scan(n);
    if (a.wins[p].length >= 2) return "ここ に おくと 4つ。りょうはし の どちら でも 5つ に できる から、あいて は ふさぎきれない よ！";
    if (a.wins[p].length === 1) return "ここ で 4つ ならぶ。あいて は ふさぐ しか ない よ。";
    // あいて の 3 を とめる て か？
    var before = scan(s);
    var oppThreat = near(s, 1).some(function (x) {
      if (x === m) return false;
      var t = play(Object.assign({}, s, { turn: o, ban33: false }), x);
      return scan(t).wins[o].length >= 2;
    });
    if (oppThreat) {
      var still = near(n, 1).some(function (x) {
        var t = play(Object.assign({}, n, { ban33: false }), x);
        return scan(t).wins[o].length >= 2;
      });
      if (!still) return "ここ を ふさがない と、あいて が 4つ ならべて とめられなく なる よ！";
    }
    void before;
    if (ci.fours >= 1 || ci.att >= 80) return "ここ に おくと 3つ ならぶ よ。つぎ は 4つ を ねらおう。";
    if (ci.def > ci.att) return "あいて の いし の つながり を じゃま できる ばしょ だよ。";
    return "じぶん の いし の そば に おいて、ならべる じゅんび を しよう。";
  }
  var G = {
    id: "gomoku",
    init: init, turn: turn, moves: moves, play: play, result: result, evaluate: evaluate,
    searchMoves: searchMoves, randomPool: randomPool, score: score, reason: reason, isForbidden: isForbidden, scan: scan,
    tieTol: 6, reviewScale: 4, reviewMin: 80, reviewDepth: 2, hintDepth: 3, depthCap: { 2: 1, 3: 3 }
  };
  BD.games.gomoku = G;
  if (typeof module !== "undefined" && module.exports) module.exports = G;
})(typeof globalThis !== "undefined" ? globalThis : this);
