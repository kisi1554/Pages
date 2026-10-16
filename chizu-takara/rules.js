/* ============================================================
   ちずきごう たからさがし — ほうい と ヒントの きまり
   ・ちずの うえが きた。x は ひがしへ +、y は みなみへ +。
   ・ヒントの しゅるい（stages.js の hints）
       from   : {sym} から {dir}へ n マス           … いまの ばしょに かんけい なし
       goto   : {sym} の マスへ いこう
       move   : そこから {dir}へ n マス
       toward : そこから {sym} が みえる ほうへ n マス（n が "until" なら てまえ まで）
   ・app.js（こたえあわせ）・tests・tools/chizu-takara（ステージづくり）が おなじ ものを つかう。
   ============================================================ */
(function (root) {
  "use strict";

  var DIRS = {
    n:  { dx: 0,  dy: -1, name: "きた",     mark: "N" },
    ne: { dx: 1,  dy: -1, name: "ほくとう", mark: "NE" },
    e:  { dx: 1,  dy: 0,  name: "ひがし",   mark: "E" },
    se: { dx: 1,  dy: 1,  name: "なんとう", mark: "SE" },
    s:  { dx: 0,  dy: 1,  name: "みなみ",   mark: "S" },
    sw: { dx: -1, dy: 1,  name: "なんせい", mark: "SW" },
    w:  { dx: -1, dy: 0,  name: "にし",     mark: "W" },
    nw: { dx: -1, dy: -1, name: "ほくせい", mark: "NW" }
  };
  var DIRS4 = ["n", "e", "s", "w"];
  var DIRS8 = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

  function dirKeys(stage) { return stage.dirs === 8 ? DIRS8 : DIRS4; }
  function size(stage) { return stage.map.length; }
  function cell(stage, x, y) { return stage.map[y] && stage.map[y][x]; }
  function inside(stage, p) { return p[0] >= 0 && p[1] >= 0 && p[0] < size(stage) && p[1] < size(stage); }
  function same(a, b) { return a[0] === b[0] && a[1] === b[1]; }

  function find(stage, code) {
    var out = [];
    for (var y = 0; y < stage.map.length; y++)
      for (var x = 0; x < stage.map[y].length; x++)
        if (stage.map[y][x] === code) out.push([x, y]);
    return out;
  }
  // from → to が まっすぐ（たて・よこ・ななめ）なら その ほうい
  function dirTo(from, to) {
    var dx = to[0] - from[0], dy = to[1] - from[1];
    if (!dx && !dy) return null;
    if (dx && dy && Math.abs(dx) !== Math.abs(dy)) return null;
    var sx = Math.sign(dx), sy = Math.sign(dy);
    for (var k in DIRS) if (DIRS[k].dx === sx && DIRS[k].dy === sy) return k;
    return null;
  }
  function add(p, dir, n) { return [p[0] + DIRS[dir].dx * n, p[1] + DIRS[dir].dy * n]; }

  // ヒントを 1つ すすめる → { pos } か { error }
  function step(stage, pos, h) {
    var allow = dirKeys(stage), at, out;
    function one(code) {
      var f = find(stage, code);
      if (f.length !== 1) { at = null; return "きごう " + code + " が " + f.length + "こ"; }
      at = f[0]; return "";
    }
    var err = "";
    if (h.type === "goto") {
      if ((err = one(h.sym))) return { error: err };
      out = at;
    } else if (h.type === "from" || h.type === "move") {
      if (allow.indexOf(h.dir) < 0) return { error: "つかえない ほうい " + h.dir };
      if (!(h.n >= 1)) return { error: "マスの かず " + h.n };
      if (h.type === "from") { if ((err = one(h.sym))) return { error: err }; out = add(at, h.dir, h.n); }
      else out = add(pos, h.dir, h.n);
    } else if (h.type === "toward") {
      if ((err = one(h.sym))) return { error: err };
      var d = dirTo(pos, at);
      if (!d) return { error: "まっすぐ みえない" };
      if (allow.indexOf(d) < 0) return { error: "つかえない ほうい " + d };
      if (h.dir && h.dir !== d) return { error: "ほういが ちがう " + h.dir + "≠" + d };
      var dist = Math.max(Math.abs(at[0] - pos[0]), Math.abs(at[1] - pos[1]));
      var n = h.n === "until" ? dist - 1 : h.n;
      if (!(n >= 1) || n >= dist) return { error: "きごうに とどいて しまう / すすまない" };
      out = add(pos, d, n);
    } else return { error: "しらない ヒント " + h.type };
    if (!inside(stage, out)) return { error: "ちずの そと " + out };
    return { pos: out, at: at };
  }

  // ステージを さいごまで たどる
  function solve(stage) {
    var pos = stage.start.slice(), path = [], errors = [];
    stage.hints.forEach(function (h, i) {
      var r = step(stage, pos, h);
      if (r.error) { errors.push((i + 1) + "ばんめ: " + r.error); return; }
      pos = r.pos; path.push({ pos: pos, at: r.at });
    });
    return { path: path, errors: errors, end: pos };
  }

  // ヒントの ぶん（[ "もじ", {sym:"P"}, ... ]）。opt.showDir … toward に（ほうい）を つける
  function hintParts(stage, h, i, pos, opt) {
    opt = opt || {};
    var first = i === 0, last = i === stage.hints.length - 1, out = [];
    if (first) out.push("まず ");
    if (h.type === "goto") out.push({ sym: h.sym }, " の マスへ いこう");
    else if (h.type === "from") out.push({ sym: h.sym }, " から ", { dir: h.dir }, " へ " + h.n + "マス");
    else if (h.type === "move") out.push("そこから ", { dir: h.dir }, " へ " + h.n + "マス");
    else if (h.type === "toward") {
      out.push("そこから ", { sym: h.sym }, " が {見|み}える ほう");
      if (opt.showDir && h.dir) out.push("（", { dir: h.dir }, "）");
      if (h.n === "until") out.push("へ すすみ、", { sym: h.sym }, " の てまえで とまろう");
      else out.push("へ " + h.n + "マス");
    }
    if (last) out.push("。そこに たからが うまって いる！");
    return out;
  }

  var API = {
    DIRS: DIRS, DIRS4: DIRS4, DIRS8: DIRS8, dirKeys: dirKeys,
    find: find, dirTo: dirTo, add: add, step: step, solve: solve, inside: inside, same: same, cell: cell,
    hintParts: hintParts
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.CHIZU_RULES = API;
})(this);
