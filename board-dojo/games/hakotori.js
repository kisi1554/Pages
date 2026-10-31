/* はこ とり（てん と てん を せん で つなぐ。4へん め を ひいた ひと が はこ を とって、もう いちど）
   R×C こ の はこ。せん の ばんごう:
     よこ h(r,c) = r*C + c            （r: 0..R, c: 0..C-1）
     たて v(r,c) = (R+1)*C + r*(C+1) + c （r: 0..R-1, c: 0..C） */
(function (root) {
  "use strict";
  var BD = root.BD = root.BD || { games: {} };
  var GEO = {};
  function geo(R, C) {
    var k = R + "x" + C;
    if (GEO[k]) return GEO[k];
    var nE = (R + 1) * C + R * (C + 1), boxEdges = [], edgeBoxes = [];
    for (var i = 0; i < nE; i++) edgeBoxes.push([]);
    for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
      var e = [r * C + c, (r + 1) * C + c, (R + 1) * C + r * (C + 1) + c, (R + 1) * C + r * (C + 1) + c + 1];
      boxEdges.push(e);
      e.forEach(function (x) { edgeBoxes[x].push(r * C + c); });
    }
    return (GEO[k] = { nE: nE, boxEdges: boxEdges, edgeBoxes: edgeBoxes });
  }
  function init(opts) {
    var n = (opts && +opts.size) || 3, R = n, C = n, g = geo(R, C), e = [], box = [];
    for (var i = 0; i < g.nE; i++) e.push(0);
    for (var j = 0; j < R * C; j++) box.push(0);
    return { R: R, C: C, e: e, box: box, turn: 1, sc: [0, 0, 0], n: 0, last: null, got: [] };
  }
  function turn(s) { return s.turn; }
  function sides(s, bi) { var be = geo(s.R, s.C).boxEdges[bi], n = 0; for (var k = 0; k < 4; k++) if (s.e[be[k]]) n++; return n; }
  function result(s) {
    if (s.n < s.e.length) return null;
    return s.sc[1] === s.sc[2] ? 0 : (s.sc[1] > s.sc[2] ? 1 : 2);
  }
  function moves(s) {
    if (result(s) !== null) return [];
    var out = [];
    for (var i = 0; i < s.e.length; i++) if (!s.e[i]) out.push(i);
    return out;
  }
  function play(s, m) {
    if (result(s) !== null || !(m >= 0 && m < s.e.length) || s.e[m]) throw new Error("illegal move " + m);
    var g = geo(s.R, s.C), e = s.e.slice(), box = s.box, sc = s.sc, got = [];
    e[m] = s.turn;
    var bs = g.edgeBoxes[m];
    for (var k = 0; k < bs.length; k++) {
      var be = g.boxEdges[bs[k]];
      if (e[be[0]] && e[be[1]] && e[be[2]] && e[be[3]]) {
        if (!got.length) { box = box.slice(); sc = sc.slice(); }
        box[bs[k]] = s.turn; sc[s.turn]++; got.push(bs[k]);
      }
    }
    return { R: s.R, C: s.C, e: e, box: box, turn: got.length ? s.turn : 3 - s.turn, sc: sc, n: s.n + 1, last: m, got: got };
  }
  // せん を ひいた とき: とれる はこ の かず / あいて に 3へん め を わたす かず
  function effect(s, m) {
    var g = geo(s.R, s.C), take = 0, give = 0, bs = g.edgeBoxes[m];
    for (var k = 0; k < bs.length; k++) { var n = sides(s, bs[k]); if (n === 3) take++; else if (n === 2) give++; }
    return { take: take, give: give };
  }
  function evaluate(s, p) {
    var o = 3 - p, v = (s.sc[p] - s.sc[o]) * 100;
    // てばん の ひと は 3へん の はこ を とれる
    var three = 0;
    for (var i = 0; i < s.box.length; i++) if (!s.box[i] && sides(s, i) === 3) three++;
    v += (s.turn === p ? 1 : -1) * three * 70;
    return v;
  }
  function searchMoves(s) {
    var ms = moves(s);
    if (ms.length < 2) return ms;
    var take = [], safe = [], rest = [];
    for (var i = 0; i < ms.length; i++) {
      var ef = effect(s, ms[i]);
      if (ef.take) take.push(ms[i]); else if (!ef.give) safe.push(ms[i]); else rest.push({ m: ms[i], g: ef.give });
    }
    rest.sort(function (a, b) { return a.g - b.g; });
    return take.concat(safe, rest.map(function (x) { return x.m; }));
  }
  // そと から みた かんたん な 「あげちゃう はこ の かず」（あいて が つぎつぎ とる と して）
  function giveaway(s, m) {
    var t = play(s, m), me = s.turn;
    if (t.turn === me) return 0;
    var n = 0, guard = 0;
    while (result(t) === null && guard++ < 200) {
      var tk = moves(t).filter(function (x) { return effect(t, x).take; });
      if (!tk.length) break;
      var before = t.sc[3 - me];
      t = play(t, tk[0]);
      n += t.sc[3 - me] - before;
    }
    return n;
  }
  function score(s) { return [0, s.sc[1], s.sc[2]]; }
  function reason(s, m) {
    var ef = effect(s, m);
    if (ef.take) return "ここ を ひくと はこ が " + (ef.take > 1 ? ef.take + "こ " : "") + "とれる！ とったら もう いちど ひける よ。";
    if (!ef.give) return "ここ なら 3ぼんめ の せん に ならない から、あいて に はこ を あげない よ。";
    var g = giveaway(s, m);
    return "どこ に ひいても はこ を あげちゃう…。ここ なら あげる はこ が いちばん すくない（" + g + "こ）よ。";
  }
  var G = {
    id: "hakotori",
    init: init, turn: turn, moves: moves, play: play, result: result, evaluate: evaluate,
    searchMoves: searchMoves, score: score, reason: reason, effect: effect, geo: geo, giveaway: giveaway,
    tieTol: 1, reviewScale: 1, reviewMin: 120, reviewDepth: 4, hintDepth: 6, depthCap: { 2: 1, 3: 3 }
  };
  BD.games.hakotori = G;
  if (typeof module !== "undefined" && module.exports) module.exports = G;
})(typeof globalThis !== "undefined" ? globalThis : this);
