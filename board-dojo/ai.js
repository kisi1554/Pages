/* ============================================================
   かんがえる ボードゲーム — CPU の あたま（どの ゲーム でも つかえる）
   αβ たんさく（ミニマックス）＋ はんぷく しんか ＋ じかんぎれ
   はこ とり の ように おなじ ひと が つづけて うつ ゲーム にも たいおう
   ゲーム G は つぎの かんすう を もつ:
     init(opts) turn(s) moves(s) play(s,m) result(s) evaluate(s,p)
     searchMoves?(s) randomPool?(s) perfectMoves?(s) reviewScale
   ============================================================ */
(function (root) {
  "use strict";
  var BD = root.BD = root.BD || { games: {} };
  var WIN = 1000000;
  var ABORT = { abort: true };
  var now = (typeof performance !== "undefined" && performance.now) ? function () { return performance.now(); } : function () { return Date.now(); };

  // たねつき らんすう（テスト で おなじ けっか に できる）
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(arr, r) { return arr[Math.floor(r() * arr.length) % arr.length]; }

  /* たんさく: root の ひと から みた てん を かえす
     opt: { maxDepth, timeMs, eps(おなじくらい の て を ランダム に) }
     かえりち: { best, list:[{m,v}], depth, complete, nodes } */
  function search(G, s, opt) {
    opt = opt || {};
    var me = G.turn(s);
    var deadline = opt.timeMs ? now() + opt.timeMs : Infinity;
    var maxDepth = opt.maxDepth || 64;
    var nodes = 0, hitLeaf = false;
    var gen = G.searchMoves || G.moves;

    function val(st, depth, ply, a, b) {
      if ((++nodes & 511) === 0 && now() > deadline) throw ABORT;
      var r = G.result(st);
      if (r !== null) return r === 0 ? 0 : (r === me ? WIN - ply : -WIN + ply);
      if (depth <= 0) { hitLeaf = true; return G.evaluate(st, me); }
      var ms = gen(st, ply);
      var maxing = G.turn(st) === me;
      var best = maxing ? -Infinity : Infinity;
      for (var i = 0; i < ms.length; i++) {
        var v = val(G.play(st, ms[i]), depth - 1, ply + 1, a, b);
        if (maxing) { if (v > best) best = v; if (best > a) a = best; }
        else { if (v < best) best = v; if (best < b) b = best; }
        if (a >= b) break;
      }
      return best;
    }

    var rootMoves = gen(s, 0).slice();
    if (!rootMoves.length) rootMoves = G.moves(s).slice();
    var done = null, depth = 0, complete = false;
    for (var d = 1; d <= maxDepth; d++) {
      hitLeaf = false;
      var list = [];
      try {
        var a = -Infinity;
        for (var i = 0; i < rootMoves.length; i++) {
          var m = rootMoves[i];
          // ルート は すこし ひろい まど で（ほぼ おなじ て も ただしく くらべる）
          var v = val(G.play(s, m), d - 1, 1, a === -Infinity ? -Infinity : a - (opt.eps || 0) - 1, Infinity);
          list.push({ m: m, v: v });
          if (v > a) a = v;
        }
      } catch (e) {
        if (e !== ABORT) throw e;
        break;
      }
      list.sort(function (x, y) { return y.v - x.v; });
      done = list; depth = d;
      rootMoves = list.map(function (x) { return x.m; }); // つぎ は よい じゅん に
      if (!hitLeaf) { complete = true; break; }           // さいご まで よみきった
      if (list[0].v >= WIN - 100) break;                  // かち が みえた
      if (now() > deadline) break;
    }
    if (!done) { // 1て も よめない ほど じかん が ない とき
      done = rootMoves.map(function (m) { return { m: m, v: G.evaluate(G.play(s, m), me) }; });
      done.sort(function (x, y) { return y.v - x.v; });
    }
    return { best: done[0].m, value: done[0].v, list: done, depth: depth, complete: complete, nodes: nodes };
  }

  // つよさ ごと の せってい
  var LEVELS = {
    1: { name: "はじめて" },
    2: { name: "やさしい", maxDepth: 2, timeMs: 150 },
    3: { name: "ふつう", maxDepth: 4, timeMs: 300 },
    4: { name: "つよい", maxDepth: 64, timeMs: 800 }
  };

  function chooseMove(G, s, level, r, opt) {
    r = r || Math.random;
    opt = opt || {};
    var legal = G.moves(s);
    if (legal.length <= 1) return legal[0];
    var L = LEVELS[level] || LEVELS[3];
    var depthCap = G.depthCap && G.depthCap[level];
    if (level === 1) {
      // ほぼ ランダム。たまに 1て だけ よむ（かてる て も わざと みのがす ことが ある）
      var pool = G.randomPool ? G.randomPool(s) : legal;
      if (r() < 0.3) {
        var res1 = search(G, s, { maxDepth: 1, timeMs: 60 });
        return res1.best;
      }
      return pick(pool, r);
    }
    if (level === 4 && G.perfectMoves) return pick(G.perfectMoves(s), r);
    var tol = level === 4 ? (G.tieTol || 0) : (G.tieTol || 0) * 3;
    var res = search(G, s, {
      maxDepth: Math.min(opt.maxDepth || L.maxDepth, depthCap || 99),
      timeMs: opt.timeMs != null ? opt.timeMs : L.timeMs,
      eps: level === 2 ? Infinity : tol
    });
    var list = res.list;
    if (level === 2 && list.length > 1 && r() < 0.35) {
      // やさしい: ときどき 2〜3ばんめ の て（まけ が きまる て は えらばない）
      var ok = list.slice(1, 3).filter(function (x) { return x.v > -WIN / 2; });
      if (ok.length) return pick(ok, r).m;
    }
    // おなじ くらい の て から ランダム（まいかい おなじ に ならない ように）
    var top = list.filter(function (x) { return x.v >= list[0].v - tol; });
    return pick(top, r).m;
  }

  // ヒント 用: いちばん よい て（と おなじ くらい よい て）
  function bestMoves(G, s, timeMs) {
    if (G.perfectMoves) return { moves: G.perfectMoves(s), list: null };
    var tol = Math.max(G.tieTol || 0, 1);
    var res = search(G, s, { maxDepth: G.hintDepth || 4, timeMs: timeMs || 400, eps: tol });
    return {
      moves: res.list.filter(function (x) { return x.v >= res.value - tol; }).map(function (x) { return x.m; }).slice(0, 3),
      list: res.list, value: res.value
    };
  }

  // ふりかえり: きょくめん ごと の ひょうか（せんて=1 から みた て）
  function clampV(v, scale) {
    if (v >= WIN / 2) return 1000;
    if (v <= -WIN / 2) return -1000;
    return Math.max(-900, Math.min(900, v / scale));
  }
  function valueOf(G, s, timeMs) {
    var r = G.result(s);
    if (r !== null) return { v: r === 0 ? 0 : (r === 1 ? 1000 : -1000), best: null };
    var p = G.turn(s);
    var res;
    if (G.perfectValue) {
      var pv = G.perfectValue(s); // てばん から みた -1/0/1
      res = { value: pv * WIN, best: G.perfectMoves(s)[0] };
    } else {
      res = search(G, s, { maxDepth: G.reviewDepth || 3, timeMs: timeMs });
    }
    var v = clampV(res.value, G.reviewScale || 1);
    return { v: p === 1 ? v : -v, best: res.best };
  }
  // moves の じゅん に うった とき の まちがい を さがす
  // whoCounts(p) が true の ひと の て だけ みる。 1〜2 か しょ。
  function findMistakes(G, states, moves, vals, whoCounts) {
    var cands = [];
    for (var i = 0; i < moves.length; i++) {
      var p = G.turn(states[i]);
      if (!whoCounts(p)) continue;
      var before = p === 1 ? vals[i].v : -vals[i].v;
      var after = p === 1 ? vals[i + 1].v : -vals[i + 1].v;
      var drop = before - after;
      var better = vals[i].best;
      if (better == null || better === moves[i]) continue;
      if (G.moves(states[i]).length <= 1) continue;
      cands.push({ i: i, p: p, drop: drop, better: better, played: moves[i], before: before, after: after });
    }
    cands.sort(function (a, b) { return b.drop - a.drop; });
    var min = G.reviewMin || 60;
    var out = cands.filter(function (c) { return c.drop >= min; }).slice(0, 2);
    out.sort(function (a, b) { return a.i - b.i; });
    return out;
  }

  var AI = { WIN: WIN, rng: rng, search: search, chooseMove: chooseMove, bestMoves: bestMoves, valueOf: valueOf, findMistakes: findMistakes, LEVELS: LEVELS };
  BD.ai = AI;
  if (typeof module !== "undefined" && module.exports) module.exports = AI;
})(typeof globalThis !== "undefined" ? globalThis : this);
