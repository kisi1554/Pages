/* オレンジおび（小1）: 20 まで の 数・くりあがり・くりさがり・3つ の 数・くらべる・なんじ なんじはん
   学習指導要領 第1学年 A(1)(2)・C(1)(2) */
(function (SD) {
  "use strict";
  var P = SD.pics, M = SD.M;

  SD.unit({
    id: "kazu20", belt: "orange", order: 1, em: "🔟", title: "20 まで の {数|かず}", sub: "10 と いくつ",
    maxAns: 20,
    gen: function (r, lv) {
      return { t: lv === 0 ? r.pick(["count", "make"]) : r.pick(["count", "make", "split", "seq", "big"]), n: r.int(11, 20), s: r.int(0, 999) };
    },
    build: function (p) {
      var n = p.n, k = n - 10, r = SD.rng(p.s);
      var tool = { name: "blocks", cfg: { frames: 2, mode: "place" } };
      if (p.t === "count") return { q: "ブロック は いくつ？", pic: P.frame(n, { frames: 2 }), ans: n, kind: { op: "count", n: n }, type: "20 まで の かず を よむ", tool: tool };
      if (p.t === "make") return { q: "10 と " + k + " で いくつ？", expr: "10 と " + k + " で □", ans: n, kind: { op: "+", a: 10, b: k }, type: "10 と いくつ", tool: tool, toolAnswer: false };
      if (p.t === "split") return { q: n + " は 10 と いくつ？", expr: n + " は 10 と □", ans: k, kind: { op: "decomp", T: n, a: 10 }, type: "10 と いくつ", tool: tool };
      if (p.t === "seq") {
        var step = r.pick([1, 1, 2]), start = Math.max(0, n - step * r.int(2, 3));
        var seq = [0, 1, 2, 3].map(function (i) { return start + i * step; }).filter(function (v) { return v <= 20; });
        var hole = seq[seq.length - 1] === n ? seq.length - 1 : r.int(1, seq.length - 1);
        return { q: "□ に はいる かず は？", pic: P.numline(start - (start % 2), Math.min(20, start - (start % 2) + 10), 1, [seq[hole]], null), expr: seq.map(function (v, i) { return i === hole ? "□" : v; }).join("　"),
          ans: seq[hole], kind: { op: "count", n: seq[hole] }, type: "かず の ならび", tool: { name: "numline", cfg: { min: 0, max: 20, start: seq[0] } } };
      }
      var m; do { m = r.int(9, 20); } while (m === n);
      return { q: "おおきい ほう は どっち？", ans: Math.max(n, m), kind: { op: "cmp", a: n, b: m }, type: "かず の おおきさ", choices: [{ v: n, h: String(n) }, { v: m, h: String(m) }] };
    },
    demo: {
      tool: "blocks", cfg: { frames: 2, mode: "place" },
      steps: [
        { say: "10 より おおきい かず は、10 の わく を いっぱい に して、となり に おくよ" },
        { say: "10 の わく が いっぱい", act: function (t) { return t.act("fill", 0, 10); } },
        { say: "となり に 3こ。10 と 3 で じゅうさん、13", act: function (t) { return t.act("fill", 1, 3); } },
        { say: "13 の 1 は「10 が 1こ」、3 は「ばら が 3こ」の いみ だよ" }
      ]
    },
    explore: {
      tool: "blocks", cfg: { frames: 2, mode: "place" },
      tasks: [
        { say: "ブロック で 16 を つくろう", check: function (t) { return t.value() === 16; } },
        { say: "こんど は 20 に しよう", check: function (t) { return t.value() === 20; } }
      ]
    }
  });

  SD.unit({
    id: "kuriagari", belt: "orange", order: 2, em: "🍒", title: "くりあがり の たしざん", sub: "10 を つくって たす",
    maxAns: 18,
    gen: function (r) {
      var a, b; do { a = r.int(2, 9); b = r.int(2, 9); } while (a + b <= 10);
      return { a: a, b: b };
    },
    build: function (p) {
      var a = p.a, b = p.b, need = 10 - a, rest = b - need;
      return {
        q: "10 を つくって たそう", expr: a + " + " + b + " = □", ans: a + b, kind: { op: "+", a: a, b: b }, type: "くりあがり の たしざん",
        tool: { name: "blocks", cfg: { frames: 2, mode: "move", init: a, src: b } },
        explain: P.cherry(a, b, need, rest) + "<p>" + b + " を " + need + " と " + rest + " に わける。" + a + " と " + need + " で 10。10 と " + rest + " で <b>" + (a + b) + "</b></p>"
      };
    },
    demo: {
      tool: "blocks", cfg: { frames: 2, mode: "move", init: 8, src: 5 },
      steps: [
        { say: "8 + 5。わく に 8こ、した に 5こ" },
        { say: "8 は あと 2 で 10。5 を 2 と 3 に わけるよ", act: function (t) { return t.act("label", "あと 2"); } },
        { say: "2こ うごかすと、10 の わく が いっぱい！", act: function (t) { return t.act("move", 2); } },
        { say: "のこり の 3こ は となり の わく へ", act: function (t) { return t.act("move", 3); } },
        { say: "10 と 3 で 13。8 + 5 = 13。これ を くりあがり と いうよ", act: function (t) { return t.act("label", "13"); } }
      ]
    },
    explore: {
      tool: "blocks", cfg: { frames: 2, mode: "move", init: 9, src: 4 },
      tasks: [
        { say: "9 + 4。まず 1こ だけ うごかして 10 を つくろう", check: function (t) { return t.count(0) === 10 && t.value() === 10; } },
        { say: "のこり を ぜんぶ よせよう。いくつ に なった？", check: function (t) { return t.value() === 13; } }
      ]
    },
  });

  SD.unit({
    id: "kurisagari", belt: "orange", order: 3, em: "🎯", title: "くりさがり の ひきざん", sub: "10 から ひく・じゅんに ひく",
    maxAns: 9,
    gen: function (r) {
      var a, b; do { a = r.int(11, 18); b = r.int(2, 9); } while (a % 10 >= b || a - b >= 10);
      return { a: a, b: b };
    },
    build: function (p) {
      var a = p.a, b = p.b, x = a - 10, d = a - b;
      return {
        q: "ひきざん を しよう", expr: a + " − " + b + " = □", ans: d, kind: { op: "-", a: a, b: b }, type: "くりさがり の ひきざん",
        tool: { name: "blocks", cfg: { frames: 2, mode: "take", init: a } },
        explain: '<div class="two-ways"><div><b>10 から ひく</b>（げんかほう）' + P.cherry(a, b, 10, x, "−") + "<p>10 − " + b + " = " + (10 - b) + "、" + (10 - b) + " と " + x + " で <b>" + d + "</b></p></div>" +
          "<div><b>じゅんに ひく</b>（げんげんほう）" + P.cherry(a, b, x, b - x, "−") + "<p>" + a + " − " + x + " = 10、10 − " + (b - x) + " = <b>" + d + "</b></p></div></div>"
      };
    },
    demo: {
      tool: "blocks", cfg: { frames: 2, mode: "take", init: 13 },
      steps: [
        { say: "13 − 8。ばら の 3こ から 8 は とれないね" },
        { say: "やりかた ①：10 の まとまり から 8 を とる", act: function (t) { return t.act("take", 0, 8); } },
        { say: "10 − 8 = 2。のこった 2 と ばら の 3 で 5", act: function (t) { return t.act("label", "2 と 3 で 5"); } },
        { say: "やりかた ②：まず ばら の 3 を とって、10 に する", act: function (t) { return t.act("reset").then(function () { return t.act("take", 1, 3); }); } },
        { say: "あと 5 を 10 から とる。10 − 5 = 5", act: function (t) { return t.act("take", 0, 5); } },
        { say: "どちら でも こたえ は 5。やりやすい ほう で いいよ", act: function (t) { return t.act("label", "5"); } }
      ]
    },
    explore: {
      tool: "blocks", cfg: { frames: 2, mode: "take", init: 12 },
      tasks: [
        { say: "12 − 9。10 の わく から 9こ とって みよう", check: function (t) { return t.count(0) === 1 && t.count(1) === 2; } },
        { say: "のこり は いくつ？ わく に のこった ぶん を たしてね（もういちど わく を タップ しても いいよ）", check: function (t) { return t.value() === 3; } }
      ]
    }
  });

  SD.unit({
    id: "mittsu", belt: "orange", order: 4, em: "🚌", title: "3つ の {数|かず} の けいさん", sub: "のって・おりて",
    maxAns: 20,
    gen: function (r) {
      var t = r.pick(["++", "--", "+-", "-+"]), a, b, c, ok = false;
      while (!ok) {
        a = r.int(1, 15); b = r.int(1, 9); c = r.int(1, 9);
        var s1 = t[0] === "+" ? a + b : a - b, s2 = t[1] === "+" ? s1 + c : s1 - c;
        ok = s1 >= 0 && s1 <= 20 && s2 >= 0 && s2 <= 20;
        if (t === "++") ok = ok && a + b <= 10 && (s1 === 10 || s2 <= 10);
        if (t === "--") ok = ok && (a <= 10 || a % 10 === b);
        if (t === "+-") ok = ok && a <= 10;
        if (t === "-+") ok = ok && a <= 10;
      }
      return { t: t, a: a, b: b, c: c };
    },
    build: function (p) {
      var sb = p.t[0] === "+" ? p.b : -p.b, sc = p.t[1] === "+" ? p.c : -p.c, ans = p.a + sb + sc;
      var sym = function (v) { return v >= 0 ? " + " + v : " − " + (-v); };
      var story = "バス に " + p.a + "にん。" + (sb > 0 ? p.b + "にん のって、" : p.b + "にん おりて、") + (sc > 0 ? p.c + "にん のった。" : p.c + "にん おりた。") + "いま なんにん？";
      return {
        q: story, expr: p.a + sym(sb) + sym(sc) + " = □", ans: ans, kind: { op: "3", terms: [p.a, sb, sc] }, type: "3つ の かず の けいさん",
        tool: { name: "numline", cfg: { min: 0, max: 20, start: p.a } }
      };
    },
    demo: {
      tool: "numline", cfg: { min: 0, max: 20, start: 6 },
      steps: [
        { say: "6 + 3 − 4。かえる さん が 6 に いるよ" },
        { say: "+3 は みぎ へ 3かい ぴょん", act: function (t) { return t.act("jump", 3); } },
        { say: "9 に なった。つぎ は −4 で ひだり へ 4かい", act: function (t) { return t.act("jump", -4); } },
        { say: "5 に ついた！ ひだり から じゅんばん に けいさん するよ" }
      ]
    },
    explore: {
      tool: "numline", cfg: { min: 0, max: 20, start: 10 },
      tasks: [
        { say: "10 − 3 − 2。かえる を ジャンプ させて こたえ の ところ へ", check: function (t) { return t.value() === 5; } }
      ]
    }
  });

  // くらべる（ながさ・かさ・ひろさ）
  var rect = function (w, h) { var c = []; for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) c.push([x, y]); return c; };
  SD.unit({
    id: "kurabe", belt: "orange", order: 5, em: "📏", title: "{長|なが}さ・かさ・{広|ひろ}さ", sub: "そろえて・いくつぶん",
    maxAns: 30,
    gen: function (r, lv) {
      var t = r.pick(["lend", "lenu", "lendiff", "vol", "voldiff", "area", "areau"]);
      var a = r.int(3, 8), b; do { b = r.int(3, 8); } while (b === a);
      var w1 = r.int(2, 5), h1 = r.int(2, 4), w2, h2;
      do { w2 = r.int(2, 6); h2 = r.int(2, 4); } while (w2 * h2 === w1 * h1);
      return { t: t, a: a, b: b, w1: w1, h1: h1, w2: w2, h2: h2 };
    },
    build: function (p) {
      var a = Math.max(p.a, p.b), b = Math.min(p.a, p.b), C = function (k) { return { v: k, h: '<span class="rib ' + k + '"></span>' + P.RIB[k][1] }; };
      if (p.t === "lend") {
        // みじかい ほうを みぎに ずらして、はしの いちで まどわせる
        var redLong = p.a > p.b, ribs = [{ c: "red", len: p.a, off: redLong ? 0 : 1 + Math.min(1, 8 - p.a) }, { c: "blue", len: p.b, off: redLong ? 1 + Math.min(1, 8 - p.b) : 0 }];
        return { q: "ながい の は どっち？（はし が そろって いないよ）", pic: P.ribbons(ribs), ans: redLong ? "red" : "blue", kind: { op: "cmp", a: p.a, b: p.b }, type: "ながさ を そろえて くらべる",
          choices: [C("red"), C("blue")], tool: { name: "measure", cfg: { mode: "len", ribs: ribs } } };
      }
      if (p.t === "lenu") {
        var r2 = [{ c: "red", len: p.a, off: 0 }];
        return { q: "あか の リボン は クリップ なんこ ぶん？", pic: P.ribbons(r2, { clips: true }), ans: p.a, kind: { op: "count", n: p.a }, type: "いくつぶん で はかる",
          tool: { name: "measure", cfg: { mode: "len", ribs: r2 } } };
      }
      if (p.t === "lendiff") {
        var r3 = [{ c: "red", len: a, off: 0 }, { c: "blue", len: b, off: 0 }];
        return { q: "あか は あお より クリップ なんこ ぶん ながい？", pic: P.ribbons(r3, { clips: true, aligned: true }), ans: a - b, kind: { op: "-", a: a, b: b }, type: "いくつぶん の ちがい",
          tool: { name: "measure", cfg: { mode: "len", ribs: r3 } } };
      }
      if (p.t === "vol") return { q: "みず が おおく はいって いた の は どっち？ コップ に うつしたよ", pic: P.cups(p.a, p.b), ans: p.a > p.b ? "red" : "blue", kind: { op: "cmp", a: p.a, b: p.b }, type: "かさ を くらべる",
        choices: [C("red"), C("blue")], tool: { name: "measure", cfg: { mode: "vol", a: p.a, b: p.b } } };
      if (p.t === "voldiff") return { q: "どちら が なんばい ぶん おおい？ その かず を こたえよう", pic: P.cups(p.a, p.b), ans: a - b, kind: { op: "-", a: a, b: b }, type: "かさ の ちがい",
        tool: { name: "measure", cfg: { mode: "vol", a: p.a, b: p.b } } };
      var shapes = [{ c: "red", cells: rect(p.w1, p.h1) }, { c: "blue", cells: rect(p.w2, p.h2) }];
      if (p.t === "area") return { q: "ひろい の は どっち？ ます を かぞえて みよう", pic: P.grid(shapes), ans: p.w1 * p.h1 > p.w2 * p.h2 ? "red" : "blue", kind: { op: "cmp", a: p.w1 * p.h1, b: p.w2 * p.h2 }, type: "ひろさ を くらべる",
        choices: [C("red"), C("blue")], tool: { name: "measure", cfg: { mode: "area", shapes: shapes } } };
      return { q: "あか は ます なんこ ぶん の ひろさ？", pic: P.grid(shapes.slice(0, 1)), ans: p.w1 * p.h1, kind: { op: "count", n: p.w1 * p.h1 }, type: "ひろさ を ます で はかる",
        tool: { name: "measure", cfg: { mode: "area", shapes: shapes.slice(0, 1) } } };
    },
    demo: {
      tool: "measure", cfg: { mode: "len", ribs: [{ c: "red", len: 5, off: 2 }, { c: "blue", len: 6, off: 0 }] },
      steps: [
        { say: "あか と あお、どっち が ながい？ みぎ の はし だけ みる と あか が ながそう…" },
        { say: "はし を そろえて みよう", act: function (t) { return t.act("align"); } },
        { say: "そろえると、あお の ほう が ながい！ くらべる ときは はし を そろえる", act: function (t) { return t.act("wait"); } },
        { say: "クリップ を ならべて「いくつぶん」でも くらべ られる よ", act: function (t) { return t.act("clipsAll"); } },
        { say: "あか は 5こ ぶん、あお は 6こ ぶん。あお が 1こ ぶん ながいね" }
      ]
    },
    explore: {
      tool: "measure", cfg: { mode: "len", ribs: [{ c: "red", len: 7, off: 0 }, { c: "blue", len: 4, off: 2 }] },
      tasks: [
        { say: "「そろえる」を おして、はし を そろえよう", check: function (t) { return t.aligned(); } },
        { say: "あか の リボン を タップ して、クリップ を ぴったり ならべよう", check: function (t) { return t.clips(0) === 7; } }
      ]
    }
  });

  var tstr = function (h, m) { return h + ":" + m; };
  SD.unit({
    id: "tokei1", belt: "orange", order: 6, em: "🕰️", title: "なんじ・なんじはん", sub: "とけい を よむ",
    maxAns: 12, testTool: true,
    gen: function (r, lv) {
      return { t: lv === 0 ? "set" : r.wpick([[3, "read"], [1, "set"]]), h: r.int(1, 12), m: r.pick([0, 30]) };
    },
    build: function (p, lv) {
      var label = M.fmtTime(p.h, p.m), r = SD.rng(p.h * 100 + p.m);
      if (p.t === "set") return { q: "とけい の はり を うごかして <b>" + label + "</b> に しよう", ans: tstr(p.h, p.m), kind: { op: "clock", h: p.h, m: p.m }, type: p.m ? "なんじはん" : "なんじ",
        tool: { name: "clock", cfg: { snap: 30, h: (p.h + 4) % 12 + 1, m: 0 } }, toolAnswer: true };
      var nx = p.h % 12 + 1, pv = (p.h + 10) % 12 + 1;
      var opts = [[p.h, p.m], p.m ? [nx, 30] : [p.h, 30], p.m ? [p.h, 0] : [pv, 0], p.m ? [pv, 30] : [nx, 0]];
      return {
        q: "なんじ？", pic: SD.pics.clock(p.h, p.m), ans: tstr(p.h, p.m), kind: { op: "clock", h: p.h, m: p.m }, type: p.m ? "なんじはん" : "なんじ",
        choices: r.shuffle(opts).map(function (o) { return { v: tstr(o[0], o[1]), h: M.fmtTime(o[0], o[1]) }; }),
        tool: lv === 0 ? { name: "clock", cfg: { snap: 30, h: p.h, m: p.m } } : null
      };
    },
    diagnose: function (p, g) {
      var k = p.kind, s = String(g).split(":").map(Number);
      if (k.m === 30 && s[0] === k.h % 12 + 1 && s[1] === 30) return "hour-next";
      return null;
    },
    demo: {
      tool: "clock", cfg: { snap: 30, h: 12, m: 0 },
      steps: [
        { say: "みじかい はり が「なんじ」、ながい はり が「なんぷん」を おしえて くれるよ" },
        { say: "ながい はり が 12 の とき は「ちょうど」。みじかい はり が 3 なら 3じ", act: function (t) { return t.act("to", 3, 0); } },
        { say: "ながい はり を はんぶん まわして 6 に すると…", act: function (t) { return t.act("to", 3, 30); } },
        { say: "3じはん！ みじかい はり も 3 と 4 の まんなか に うごいたね" },
        { say: "ながい はり を まわすと、みじかい はり も いっしょ に すすむ よ", act: function (t) { return t.act("to", 5, 0); } }
      ]
    },
    explore: {
      tool: "clock", cfg: { snap: 30, h: 12, m: 0 },
      tasks: [
        { say: "ながい はり を ゆび で まわして、7じ に しよう", check: function (t) { return t.value() === "7:0"; } },
        { say: "こんど は 8じはん に しよう", check: function (t) { return t.value() === "8:30"; } }
      ]
    },
  });
})(typeof window !== "undefined" ? window.SD : globalThis.SD);
