/* でんごん おえかき の しくみ（DOM なし。node でも うごく）。
 *   じゅんばん: ばん i の ひとは players[i % N]、i が ぐうすう なら「え」、きすう なら「ことば」。
 *   わたす データ: visible(g, i) は「すぐ まえ」の 1つ だけ（まえの まえ は わたさない）。
 */
(function (root) {
  "use strict";
  var ODAI = root.ODAI || (typeof require === "function" ? require("./odai.js") : null);

  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, r) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function kindOf(i) { return i % 2 === 0 ? "draw" : "word"; }
  function order(n, laps) {
    var out = [];
    for (var i = 0; i < n * (laps || 1); i++) out.push({ player: i % n, kind: kindOf(i) });
    return out;
  }

  function norm(s) { return String(s || "").replace(/[\s　]+/g, " ").trim(); }
  /* かいた ことばに ちかい おだいを さがす（ぴったり → ふくむ）。なければ null */
  function findEntry(text) {
    var t = norm(text).replace(/さん$|ちゃん$|くん$/, "");
    if (!t) return null;
    var all = ODAI.easy.concat(ODAI.normal);
    for (var i = 0; i < all.length; i++) if (all[i].w === t || all[i].w.replace(/ /g, "") === t.replace(/ /g, "")) return all[i];
    var best = null;
    for (var k = 0; k < all.length; k++) {
      var w = all[k].w;
      if (w.length >= 2 && t.indexOf(w) >= 0 && (!best || w.length > best.w.length)) best = all[k];
    }
    return best;
  }

  function pickOdai(level, r, avoid) {
    var list = ODAI[level] || ODAI.easy;
    var pool = list.filter(function (o) { return !avoid || avoid.indexOf(o.w) < 0; });
    if (!pool.length) pool = list;
    return pool[Math.floor(r() * pool.length)];
  }

  function create(opt) {
    var seed = opt.seed != null ? opt.seed : Math.floor(Math.random() * 1e9);
    var r = rng(seed);
    var level = opt.level === "normal" ? "normal" : "easy";
    var players = opt.players.map(function (p, i) {
      return { name: norm(p.name) || (i + 1) + "ばんめ", icon: p.icon || "🙂", little: !!p.little };
    });
    var laps = opt.laps === 2 ? 2 : 1;
    return {
      seed: seed, level: level, laps: laps, players: players,
      odai: pickOdai(level, r, opt.avoid), rerolls: 0,
      total: players.length * laps, steps: [], fav: -1, at: opt.at || 0
    };
  }
  function reroll(g, r) {
    g.odai = pickOdai(g.level, r || Math.random, [g.odai.w]);
    g.rerolls += 1;
    return g.odai;
  }

  function current(g) { return g.steps.length; }
  function done(g) { return g.steps.length >= g.total; }
  function who(g, i) { return g.players[i % g.players.length]; }

  function submit(g, data) {
    var i = g.steps.length;
    if (i >= g.total) throw new Error("もう おわり");
    var k = kindOf(i);
    var s = { kind: k, player: i % g.players.length };
    if (k === "draw") s.img = data.img || "";
    else { s.text = norm(data.text) || "？"; if (data.how) s.how = data.how; }
    g.steps.push(s);
    return s;
  }

  /* ばん i の ひとに みせる もの（すぐ まえ だけ） */
  function visible(g, i) {
    if (i === 0) return { kind: "odai", text: g.odai.w, e: g.odai.e };
    var p = g.steps[i - 1];
    if (!p) return null;
    if (p.kind === "draw") return { kind: "draw", img: p.img };
    var ent = findEntry(p.text);
    return { kind: "word", text: p.text, e: ent ? ent.e : null };
  }

  /* ことば の ばん i で、まえの え が あらわして いる はずの ことば（えらぶ の 「ちかい」 カード に つかう） */
  function drawnText(g, i) {
    var j = i - 1;
    if (j < 0) return null;
    if (j === 0) return g.odai.w;
    var w = g.steps[j - 1];
    return w ? w.text : null;
  }

  /* えらぶ: 4まい。1まいが ちかい ことば、のこりは おなじ むずかしさ の ダミー */
  function choices(g, i, r) {
    r = r || Math.random;
    var t = drawnText(g, i) || g.odai.w;
    var ent = findEntry(t);
    var near = { w: norm(t), e: ent ? ent.e : "🖍️", near: true };
    var list = ODAI[g.level] || ODAI.easy;
    var used = [near.w], usedE = [near.e];
    var out = [near];
    var pool = shuffle(list, r);
    for (var k = 0; k < pool.length && out.length < 4; k++) {
      var o = pool[k];
      if (used.indexOf(o.w) >= 0 || usedE.indexOf(o.e) >= 0) continue;
      if (ent && ent.who && o.who === ent.who && o.act === ent.act) continue;
      used.push(o.w); usedE.push(o.e);
      out.push({ w: o.w, e: o.e, near: false });
    }
    return shuffle(out, r);
  }

  /* はっぴょう の じゅんばん: おだい → え → ことば → … */
  function slides(g) {
    var out = [{ kind: "odai", text: g.odai.w, e: g.odai.e }];
    g.steps.forEach(function (s, i) {
      var p = g.players[s.player];
      out.push({ kind: s.kind, img: s.img, text: s.text, name: p.name, icon: p.icon, step: i });
    });
    return out;
  }

  /* アルバム: あたらしい じゅん。さいだい max かい */
  function albumAdd(list, rec, max) {
    var out = [rec].concat((list || []).filter(function (x) { return x && x.id !== rec.id; }));
    return out.slice(0, max || 10);
  }

  var Game = {
    rng: rng, shuffle: shuffle, kindOf: kindOf, order: order, norm: norm, findEntry: findEntry,
    pickOdai: pickOdai, create: create, reroll: reroll, current: current, done: done, who: who,
    submit: submit, visible: visible, drawnText: drawnText, choices: choices, slides: slides, albumAdd: albumAdd
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Game;
  else root.Game = Game;
})(this);
