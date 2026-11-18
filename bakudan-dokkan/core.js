/* バクダンどっかーん — ルールの しんぞうぶ（がめんに かんけい ない ぶぶん）
 *  マス: '.' なにもない  '#' てつ（こわれない・ばくふうを とめる）
 *        'r' いわ  'R' かたいいわ（2かい）  'h' ひびの はいった かたいいわ（あと1かい）
 *        '1' '2' '3' じゅうじ ばくだん（かず＝とどく ながさ）
 *        'o' まる ばくだん（まわり 8マス）  '-' よこ ばくだん（はしまで）  '|' たて ばくだん（はしまで）
 *  ばくふうは いわに あたると そこで とまる。ばくだんに あたると つぎの なみで ばくはつ（れんさ）。
 */
(function (root) {
  "use strict";

  var LEVELS = [
    { name: "はじめての どっかーん", tip: "ばくだんを おして、はなすと どっかーん！", map: [
      ".......",
      "...r...",
      "..r1r..",
      "...r...",
      "......."] },
    { name: "れんさ どっかーん", tip: "ばくふうが ばくだんに あたると、つぎつぎ ばくはつ！", map: [
      ".......",
      ".r.r.r.",
      ".2.2.2.",
      ".r.r.r.",
      "......."] },
    { name: "てつの かべ", tip: "てつの かべは こわれないし、ばくふうも とおさないよ", map: [
      "...#...",
      ".r.#.r.",
      "r1r#r1r",
      ".r.#.r.",
      "...#..."] },
    { name: "まるい ばくだん", tip: "むらさきの ばくだんは まわり ぐるっと 8マス！", map: [
      ".......",
      ".rrr...",
      ".ror...",
      ".rr1r..",
      "...r...",
      "......."] },
    { name: "よこ と たて", tip: "↔ は よこに ずーっと、↕ は たてに ずーっと とどくよ", map: [
      "r.-|..r",
      ".......",
      "r..-..r",
      ".......",
      "r..-..r"] },
    { name: "かたい いわ", tip: "くろい いわは 2かい あてないと こわれないよ", map: [
      ".r...r.",
      ".2.R.2.",
      ".r...r."] },
    { name: "まんなかの 3", tip: "どれから つけても…？", map: [
      "#######",
      "#r.2.r#",
      "#.#.#.#",
      "#2.3.2#",
      "#.#.#.#",
      "#r.2.r#",
      "#######"] },
    { name: "はさみうち", tip: "かたい いわを りょうがわから ねらおう", map: [
      "..ror..",
      "...|...",
      "-..R..-",
      "...|...",
      "..ror.."] },
    { name: "まちがえやすい", tip: "いちばん たくさん こわれそうな ばくだんが せいかい とは かぎらない…", map: [
      "...r...",
      "....r#.",
      ".rr21r1",
      "r#1rr..",
      "ro.r...",
      "r.r...."] },
    { name: "たてたて ばくだん", tip: "↕ の ばくだんは たてに ずーっと！", map: [
      "#..r..#",
      ".|.|..#",
      "..r.r.#",
      "..ro.r.",
      "#..roro",
      "#..rr.2",
      "#..r..#"] },
    { name: "かくれた ばくだん", tip: "いわの なかに ばくだんが かくれているよ", map: [
      "..##3..",
      ".#rrr#.",
      "..ror..",
      ".r|2.r.",
      "r.r1r..",
      "3#.R.#.",
      "r..##.."] },
    { name: "とおせんぼ", tip: "じゃまな いわを さきに こわすと…？", map: [
      "...r...",
      "-.r3r.r",
      ".......",
      ".......",
      "r.r1r.-"] },
    { name: "じゅんばん だいじ", tip: "どの じゅんばんで つける？", map: [
      "..rr3#.",
      "..r2.2r",
      "..#.rR.",
      "r.rr-3r",
      "....#r."] },
    { name: "ぐるぐる めいろ", tip: "かべに かこまれた みちを ばくふうが はしるよ", map: [
      "#######",
      "#-.r.|#",
      "#.#.#.#",
      "#r.o.r#",
      "#.#.#.#",
      "#|.r.-#",
      "#######"] },
    { name: "さいごの だいばくはつ", tip: "ぜんぶの いわを こわせるかな？", map: [
      "......#",
      "..rr3r.",
      "#...#..",
      ".Rrrrr.",
      "..o|or.",
      "r3#Rrr#",
      "r2r.2r.",
      "#1r.r.."] }
  ];

  var BOMBS = "123o-|";
  function isBomb(c) { return BOMBS.indexOf(c) >= 0; }
  function isRock(c) { return c === "r" || c === "R" || c === "h"; }

  function parse(map) {
    var h = map.length, w = 0, g = [];
    for (var y = 0; y < h; y++) w = Math.max(w, map[y].length);
    for (y = 0; y < h; y++) for (var x = 0; x < w; x++) g.push(map[y][x] || ".");
    return { w: w, h: h, g: g };
  }

  // ばくふうが とどく マス（ばくだん じしんも ふくむ）
  function blastCells(b, x, y) {
    var c = b.g[y * b.w + x], out = [{ x: x, y: y }];
    function ray(dx, dy, len) {
      for (var i = 1; i <= len; i++) {
        var nx = x + dx * i, ny = y + dy * i;
        if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h) return;
        var k = b.g[ny * b.w + nx];
        if (k === "#") return;
        out.push({ x: nx, y: ny });
        if (isRock(k)) return;
      }
    }
    if (c === "o") {
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        var nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h) continue;
        if (b.g[ny * b.w + nx] !== "#") out.push({ x: nx, y: ny });
      }
    } else if (c === "-") { ray(1, 0, 99); ray(-1, 0, 99); }
    else if (c === "|") { ray(0, 1, 99); ray(0, -1, 99); }
    else { var p = +c; ray(1, 0, p); ray(-1, 0, p); ray(0, 1, p); ray(0, -1, p); }
    return out;
  }

  // なみ 1つぶん。cur のばくだんが いっせいに ばくはつ。b.g を かきかえる。
  // busy: すでに ばくはつ／よやく ずみの マス番号（ほかの れんさと かぶらないように）
  function stepWave(b, cur, busy) {
    var rays = [], hits = [];
    for (var i = 0; i < cur.length; i++) {
      var cells = blastCells(b, cur[i].x, cur[i].y);
      rays.push({ x: cur[i].x, y: cur[i].y, type: b.g[cur[i].y * b.w + cur[i].x], cells: cells });
      hits = hits.concat(cells);
    }
    for (i = 0; i < cur.length; i++) b.g[cur[i].y * b.w + cur[i].x] = ".";
    var next = [], broken = [], cracked = [];
    for (i = 0; i < hits.length; i++) {
      var k = hits[i].y * b.w + hits[i].x, c = b.g[k];
      if (c === "r" || c === "h") { b.g[k] = "."; broken.push({ x: hits[i].x, y: hits[i].y, was: c }); }
      else if (c === "R") { b.g[k] = "h"; cracked.push({ x: hits[i].x, y: hits[i].y }); }
      else if (isBomb(c) && !busy[k]) { busy[k] = 1; next.push({ x: hits[i].x, y: hits[i].y }); }
    }
    return { rays: rays, next: next, broken: broken, cracked: cracked };
  }

  function explodeAll(b, x, y) {
    var busy = {}; busy[y * b.w + x] = 1;
    var cur = [{ x: x, y: y }], n = 0;
    while (cur.length) { cur = stepWave(b, cur, busy).next; n++; }
    return n;
  }

  function rocksLeft(b) { var n = 0; for (var i = 0; i < b.g.length; i++) if (isRock(b.g[i])) n++; return n; }

  // さいしょう なんかいで ぜんぶ こわせるか（はばゆうせん）。 {moves, first:[{x,y}...]} か null
  function solve(b, maxDepth) {
    maxDepth = maxDepth || 6;
    if (!rocksLeft(b)) return { moves: 0, first: [] };
    var start = b.g.join(""), seen = {}; seen[start] = 1;
    var layer = [{ s: start, first: null }];
    for (var d = 1; d <= maxDepth; d++) {
      var nl = [], firsts = [], firstSeen = {};
      for (var i = 0; i < layer.length; i++) {
        var s = layer[i].s;
        for (var k = 0; k < s.length; k++) {
          if (!isBomb(s[k])) continue;
          var nb = { w: b.w, h: b.h, g: s.split("") };
          explodeAll(nb, k % b.w, (k / b.w) | 0);
          var f = layer[i].first === null ? k : layer[i].first;
          if (!rocksLeft(nb)) { if (!firstSeen[f]) { firstSeen[f] = 1; firsts.push({ x: f % b.w, y: (f / b.w) | 0 }); } continue; }
          var ns = nb.g.join("");
          if (seen[ns]) continue;
          seen[ns] = 1; nl.push({ s: ns, first: f });
        }
      }
      if (firsts.length) return { moves: d, first: firsts };
      layer = nl;
      if (!layer.length) return null;
    }
    return null;
  }

  var api = { LEVELS: LEVELS, parse: parse, blastCells: blastCells, stepWave: stepWave,
    explodeAll: explodeAll, rocksLeft: rocksLeft, solve: solve, isBomb: isBomb, isRock: isRock };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BakudanCore = api;
})(this);
