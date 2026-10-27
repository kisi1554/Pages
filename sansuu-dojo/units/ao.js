/* あおおび（小2）: 1000 まで の 数・2けた の ひっ算・なんじ なんぷん・長さ・かさ・表 と グラフ
   学習指導要領 第2学年 A(1)(2)・C(1)(2)・D(1)（数 は 4位数・1万 まで 扱う） */
(function (SD) {
  "use strict";
  var P = SD.pics, M = SD.M;

  SD.unit({
    id: "kazu1000", belt: "ao", order: 1, em: "🪙", title: "1000 まで の {数|かず}", sub: "百・十・一 の くらい",
    maxAns: 10000,
    gen: function (r, lv) {
      var t = lv === 0 ? r.pick(["coins", "make"]) : r.pick(["coins", "make", "digit", "seq", "tens", "big", "man"]);
      var n = r.int(101, 999);
      if (r.chance(0.25)) n = Math.floor(n / 10) * 10 + (r.chance(0.5) ? 0 : n % 10); // 0 の ある かず
      if (r.chance(0.15)) n = r.int(1, 9) * 100 + r.int(0, 9);
      return { t: t, n: t === "man" ? r.int(1, 9) * 1000 + r.int(0, 999) : n, s: r.int(0, 999) };
    },
    build: function (p) {
      var n = p.n, h = Math.floor(n / 100), t = Math.floor(n / 10) % 10, o = n % 10, r = SD.rng(p.s);
      var tool = { name: "placeval", cfg: { cols: [1000, 100, 10, 1], style: "coins" } };
      if (p.t === "coins") return { q: "おかね は なん{円|えん}？", pic: P.coins({ 100: h, 10: t, 1: o }), ans: n, suffix: "{円|えん}", kind: { op: "count", n: n }, type: "くらい を よむ", tool: tool, picWithTool: true };
      if (p.t === "make") return { q: "100 が " + h + "こ、10 が " + t + "こ、1 が " + o + "こ で いくつ？", ans: n, kind: { op: "count", n: n }, type: "百・十・一 の くらい", tool: tool };
      if (p.t === "digit") { var which = r.pick(["百", "十", "一"]), d = which === "百" ? h : which === "十" ? t : o;
        return { q: n + " の " + (which === "一" ? "{一|いち}" : which === "十" ? "{十|じゅう}" : "{百|ひゃく}") + "の くらい の すうじ は？", expr: String(n), ans: d, kind: { op: "count", n: d }, type: "くらい の すうじ", tool: tool }; }
      if (p.t === "seq") {
        var step = r.pick([1, 10, 100, 5]), start = Math.max(0, n - step * 2 - (n % step)), seq = [0, 1, 2, 3, 4].map(function (i) { return start + i * step; }).filter(function (v) { return v <= 1000; }), hole = r.int(1, seq.length - 1);
        return { q: "□ に はいる かず は？（" + step + " ずつ）", expr: seq.map(function (v, i) { return i === hole ? "□" : v; }).join("　"), ans: seq[hole], kind: { op: "count", n: seq[hole] }, type: "かず の ならび" };
      }
      if (p.t === "tens") { var k = r.int(11, 60);
        return { q: "10 を " + k + "こ あつめた かず は？", ans: k * 10, kind: { op: "count", n: k * 10 }, type: "10 の いくつぶん", tool: tool }; }
      if (p.t === "big") { var m; do { m = n + r.pick([-100, -10, -1, 1, 10, 100, 90, -90]); } while (m < 100 || m > 999);
        return { q: "おおきい ほう は どっち？", ans: Math.max(n, m), kind: { op: "cmp", a: n, b: m }, type: "かず の おおきさ", choices: [{ v: n, h: String(n) }, { v: m, h: String(m) }] }; }
      // 4けた・1万
      if (n % 1000 === 0 || r.chance(0.3)) return { q: "9999 の つぎ の かず は？", ans: 10000, kind: { op: "count", n: 10000 }, type: "1万（10000）" };
      return { q: "1000 が " + Math.floor(n / 1000) + "こ と " + (n % 1000) + " で いくつ？", ans: n, kind: { op: "count", n: n }, type: "4けた の かず" };
    },
    diagnose: function (p, g) {
      var s = String(p.ans), gs = String(g);
      if (p.ans >= 100 && gs.length > s.length && gs.replace(/0/g, "") === s.replace(/0/g, "")) return "place";
      return null;
    },
    demo: {
      tool: "placeval", cfg: { cols: [1000, 100, 10, 1], style: "coins" },
      steps: [
        { say: "1円玉 が 10まい に なったら、10円玉 1まい に りょうがえ するよ" },
        { say: "1円玉 を 10まい", act: function (t) { return t.act("add", 1, 10); } },
        { say: "ふくろ に つめて、10円玉 に！", act: function (t) { return t.act("pack"); } },
        { say: "10円玉 が 10まい で 100円玉。100円玉 が 10まい で 1000", act: function (t) { return t.act("add", 10, 9).then(function () { return t.act("pack"); }); } },
        { say: "くらい は みぎ から、一、十、百、千。どの くらい も 10 で となり へ いく よ" }
      ]
    },
    explore: {
      tool: "placeval", cfg: { cols: [1000, 100, 10, 1], style: "coins" },
      tasks: [
        { say: "おかね で 305 を つくろう（十のくらい は 0 だよ）", check: function (t) { return t.value() === 305; } },
        { say: "100円玉 を 10まい に して りょうがえ、1000 を つくろう", check: function (t) { return t.value() === 1000 && t.count(1000) === 1; } }
      ]
    }
  });

  // ひっ算（2けた）
  SD.unit({
    id: "hissan2", belt: "ao", order: 2, em: "🧮", title: "ひっ{算|さん}（2けた）", sub: "くらい を そろえて",
    maxAns: 99,
    gen: function (r) {
      var op = r.pick(["+", "-"]), carry = r.chance(0.6), a, b, ok = false;
      while (!ok) {
        a = r.int(10, 98); b = r.int(r.chance(0.2) ? 2 : 10, 89);
        if (op === "+") ok = a + b <= 99 && (M.carries(a, b) > 0) === carry;
        else ok = a > b && (M.borrows(a, b) > 0) === carry;
      }
      return { op: op, a: a, b: b };
    },
    build: function (p, lv) {
      var ans = p.op === "+" ? p.a + p.b : p.a - p.b, carry = p.op === "+" ? M.carries(p.a, p.b) > 0 : M.borrows(p.a, p.b) > 0;
      var base = { kind: { op: p.op, a: p.a, b: p.b }, ans: ans, type: p.op === "+" ? (carry ? "くりあがり の ある ひっ算" : "くりあがり の ない ひっ算") : (carry ? "くりさがり の ある ひっ算" : "くりさがり の ない ひっ算") };
      if (lv === 0) return Object.assign(base, { q: "ひっ算 で しよう。一の くらい から", tool: { name: "hissan", cfg: { a: p.a, b: p.b, op: p.op, assist: true } }, toolAnswer: true });
      return Object.assign(base, { q: "ひっ算 で しよう", expr: p.a + (p.op === "+" ? " + " : " − ") + p.b + " = □", pic: P.hissan(p.a, p.b, p.op), tool: { name: "hissan", cfg: { a: p.a, b: p.b, op: p.op, assist: true } } });
    },
    demo: {
      tool: "hissan", cfg: { a: 38, b: 25, op: "+", assist: true },
      steps: [
        { say: "38 + 25 を ひっ算 で。くらい を たて に そろえて かくよ" },
        { say: "一のくらい から。8 + 5 = 13。3 を かいて、1 は 十のくらい へ くりあがり", act: function (t) { return t.act("digit", 3); } },
        { say: "十のくらい は 3 + 2 と くりあがった 1 で 6", act: function (t) { return t.act("digit", 6); } },
        { say: "こたえ は 63。ちいさい 1 を わすれない のが こつ だよ" }
      ]
    },
    explore: {
      tool: "hissan", cfg: { a: 52, b: 17, op: "-", assist: true },
      tasks: [{ say: "52 − 17。2 から 7 は ひけない ので、十のくらい から 10 を かりて くるよ。こたえ を いれよう", check: function (t) { return t.value() === 35; } }]
    }
  });

  SD.unit({
    id: "tokei2", belt: "ao", order: 3, em: "⏰", title: "なんじ なんぷん", sub: "ながい はり の めもり",
    maxAns: 12, testTool: true,
    gen: function (r, lv) {
      var m = r.chance(0.6) ? r.int(0, 11) * 5 : r.int(0, 59);
      return { t: lv === 0 ? "set" : r.wpick([[3, "read"], [1, "set"]]), h: r.int(1, 12), m: m };
    },
    build: function (p, lv) {
      var label = M.fmtTime(p.h, p.m, true), ans = p.h + ":" + p.m;
      if (p.t === "set") return { q: "はり を うごかして <b>" + label + "</b> に しよう", ans: ans, kind: { op: "clock", h: p.h, m: p.m }, type: "なんじ なんぷん を あわせる",
        tool: { name: "clock", cfg: { snap: 1, h: p.h % 12 + 1, m: 0, minutes: true } }, toolAnswer: true };
      var r = SD.rng(p.h * 61 + p.m), nx = p.h % 12 + 1, pv = (p.h + 10) % 12 + 1;
      var cand = [[p.h, p.m], [p.m >= 30 ? nx : pv, p.m], [p.h, (p.m + 5) % 60], [p.h, p.m % 5 === 0 && p.m ? Math.min(59, p.m / 5) : (p.m + 50) % 60]];
      // ながい はり の さす すうじ を そのまま ふん に した まちがい（4 を さす → 4ふん）
      var seen = {}, opts = [];
      cand.forEach(function (c) { var k = c[0] + ":" + c[1]; if (!seen[k]) { seen[k] = 1; opts.push(c); } });
      return { q: "なんじ なんぷん？", pic: P.clock(p.h, p.m, { minutes: lv === 0 }), ans: ans, kind: { op: "clock", h: p.h, m: p.m }, type: "なんじ なんぷん を よむ",
        choices: r.shuffle(opts).map(function (o) { return { v: o[0] + ":" + o[1], h: M.fmtTime(o[0], o[1], true) }; }) };
    },
    diagnose: function (p, g) {
      var s = String(g).split(":").map(Number), k = p.kind;
      if (k.m >= 30 && s[0] === k.h % 12 + 1 && s[1] === k.m) return "hour-next";
      if (s[0] === k.h && s[1] * 5 === k.m) return "min-number";
      return null;
    },
    demo: {
      tool: "clock", cfg: { snap: 1, h: 3, m: 0, minutes: true, digital: true },
      steps: [
        { say: "ながい はり の ちいさい めもり 1つ が 1ぷん。すうじ と すうじ の あいだ は 5ふん" },
        { say: "ながい はり が 1 を さすと 5ふん、2 で 10ぷん", act: function (t) { return t.act("to", 3, 10); } },
        { say: "そこ から めもり 3つ すすむと 13ぷん", act: function (t) { return t.act("to", 3, 13); } },
        { say: "ながい はり が ひとまわり すると 60ぷん ＝ 1じかん。みじかい はり が 1 すすむ", act: function (t) { return t.act("to", 4, 13); } }
      ]
    },
    explore: {
      tool: "clock", cfg: { snap: 1, h: 12, m: 0, minutes: true, digital: true },
      tasks: [
        { say: "4{時|じ}25{分|ふん} に しよう", check: function (t) { return t.value() === "4:25"; } },
        { say: "9{時|じ}48{分|ふん} に しよう", check: function (t) { return t.value() === "9:48"; } }
      ]
    }
  });

  var cmmm = function (mm) { var c = Math.floor(mm / 10), m = mm % 10; return (c ? c + "cm" : "") + (m ? m + "mm" : "") || "0mm"; };
  SD.unit({
    id: "nagasa", belt: "ao", order: 4, em: "📐", title: "{長|なが}さ（cm・mm・m）", sub: "ものさし で はかる",
    maxAns: 1000, testTool: true,
    gen: function (r, lv) {
      var t = lv === 0 ? r.pick(["draw", "readmm"]) : r.pick(["readcm", "readmm", "conv", "conv2", "m", "add", "draw"]);
      return { t: t, mm: t === "readcm" ? r.int(2, 11) * 10 : r.int(12, 115), a: r.int(1, 9), b: r.int(1, 9), c: r.int(1, 3), d: r.int(1, 99) };
    },
    build: function (p) {
      var tool = { name: "ruler", cfg: { len: p.mm } };
      if (p.t === "draw") return { q: "ものさし で <b>" + cmmm(p.mm) + "</b> の ながさ に しるし を つけよう", ans: p.mm, kind: { op: "len", mm: p.mm }, type: "ながさ を はかって ひく", tool: { name: "ruler", cfg: {} }, toolAnswer: true };
      if (p.t === "readcm") return { q: "えんぴつ の ながさ は なんcm？", pic: P.ruler(p.mm), ans: p.mm / 10, suffix: "cm", kind: { op: "len", mm: p.mm }, type: "cm で よむ", tool: tool };
      if (p.t === "readmm") return { q: "えんぴつ の ながさ は なんmm？", pic: P.ruler(p.mm), ans: p.mm, suffix: "mm", kind: { op: "len", mm: p.mm }, type: "mm で よむ", tool: tool };
      if (p.t === "conv") return { q: "たんい を かえよう", expr: p.a + "cm" + p.b + "mm = □mm", ans: p.a * 10 + p.b, suffix: "mm", kind: { op: "len", mm: p.a * 10 + p.b }, type: "cm と mm" };
      if (p.t === "conv2") return { q: "たんい を かえよう", expr: (p.a * 10 + p.b) + "mm = " + p.a + "cm □mm", ans: p.b, suffix: "mm", kind: { op: "len", mm: p.b }, type: "cm と mm" };
      if (p.t === "m") return { q: "たんい を かえよう", expr: p.c + "m" + p.d + "cm = □cm", ans: p.c * 100 + p.d, suffix: "cm", kind: { op: "len", mm: (p.c * 100 + p.d) * 10 }, type: "m と cm" };
      var x = p.a * 10 + p.b, y = p.b * 10 + p.a;
      return { q: "ながさ の たしざん（mm で こたえよう）", expr: cmmm(x) + " + " + cmmm(y) + " = □mm", ans: x + y, suffix: "mm", kind: { op: "+", a: x, b: y }, type: "ながさ の けいさん" };
    },
    diagnose: function (p, g) {
      g = Number(g);
      if (p.ans && (g === p.ans * 10 || g * 10 === p.ans || g === p.ans * 100 || g * 100 === p.ans)) return "unit-mix";
      return null;
    },
    demo: {
      tool: "ruler", cfg: { len: 73 },
      steps: [
        { say: "ものさし の 0 に はし を あわせて はかるよ。おおきい めもり 1つ が 1cm" },
        { say: "1cm を 10 に わけた ちいさい めもり 1つ が 1mm", act: function (t) { return t.act("to", 10); } },
        { say: "えんぴつ の さき まで しるし を うごかすと…", act: function (t) { return t.act("to", 73); } },
        { say: "7cm と 3mm。7cm3mm ＝ 73mm。100cm で 1m だよ" }
      ]
    },
    explore: {
      tool: "ruler", cfg: {},
      tasks: [
        { say: "ものさし を タップ（◀ ▶ でも）して、5cm に しるし を つけよう", check: function (t) { return t.value() === 50; } },
        { say: "こんど は 8cm6mm", check: function (t) { return t.value() === 86; } }
      ]
    }
  });

  var ldl = function (dl) { var L = Math.floor(dl / 10), d = dl % 10; return (L ? L + "L" : "") + (d ? d + "dL" : "") || "0dL"; };
  SD.unit({
    id: "kasa", belt: "ao", order: 5, em: "🥛", title: "かさ（L・dL・mL）", sub: "1L ます で はかる",
    maxAns: 3000, testTool: true,
    gen: function (r, lv) {
      var t = lv === 0 ? r.pick(["pour", "read"]) : r.pick(["read", "conv", "unit", "add", "sub", "pour"]);
      return { t: t, L: r.int(1, 2), d: r.int(1, 9), u: r.int(0, 3), x: r.int(11, 29), y: r.int(2, 9) };
    },
    build: function (p) {
      var dl = p.L * 10 + p.d;
      if (p.t === "pour") return { q: "1dL カップ で みず を いれて <b>" + ldl(dl) + "</b> に しよう", ans: dl, kind: { op: "vol", dl: dl }, type: "かさ を はかる", tool: { name: "masu", cfg: { L: 3 } }, toolAnswer: true };
      if (p.t === "read") return { q: "みず の かさ は なんdL？", pic: P.masu(p.L, p.d), ans: dl, suffix: "dL", kind: { op: "vol", dl: dl }, type: "L と dL で よむ", tool: { name: "masu", cfg: { L: 3, init: dl } } };
      if (p.t === "conv") return { q: "たんい を かえよう", expr: ldl(dl) + " = □dL", ans: dl, suffix: "dL", kind: { op: "vol", dl: dl }, type: "L と dL" };
      if (p.t === "unit") {
        var U = [["1L = □dL", 10, "dL"], ["1L = □mL", 1000, "mL"], ["1dL = □mL", 100, "mL"], ["2L = □dL", 20, "dL"]][p.u];
        return { q: "たんい の かんけい", expr: U[0], ans: U[1], suffix: U[2], kind: { op: "vol" }, type: "L・dL・mL の かんけい" };
      }
      if (p.t === "add") return { q: "かさ の たしざん（dL で）", expr: ldl(p.x) + " + " + ldl(p.y) + " = □dL", ans: p.x + p.y, suffix: "dL", kind: { op: "+", a: p.x, b: p.y }, type: "かさ の けいさん" };
      return { q: "かさ の ひきざん（dL で）", expr: ldl(p.x) + " − " + ldl(p.y) + " = □dL", ans: p.x - p.y, suffix: "dL", kind: { op: "-", a: p.x, b: p.y }, type: "かさ の けいさん" };
    },
    diagnose: function (p, g) {
      g = Number(g);
      if (p.ans && (g === p.ans * 10 || g * 10 === p.ans || g === p.ans * 100 || g * 100 === p.ans || p.ans === 1000 && g === 100)) return "unit-mix";
      return null;
    },
    demo: {
      tool: "masu", cfg: { L: 3 },
      steps: [
        { say: "1L ます に 1dL カップ で みず を いれて みよう" },
        { say: "1dL、2dL、3dL…", act: function (t) { return t.act("pour", 10); } },
        { say: "10dL で 1L ます が いっぱい。1L ＝ 10dL", act: function (t) { return t.act("wait"); } },
        { say: "あと 4dL いれると 1L4dL ＝ 14dL", act: function (t) { return t.act("pour", 4); } },
        { say: "もっと ちいさい たんい が mL。1L ＝ 1000mL、1dL ＝ 100mL" }
      ]
    },
    explore: {
      tool: "masu", cfg: { L: 3 },
      tasks: [{ say: "「1dL いれる」を おして、2L3dL に しよう", check: function (t) { return t.value() === 23; } }]
    }
  });

  var KINDS = ["🍎", "🍊", "🍇", "🍌", "🍓"];
  SD.unit({
    id: "hyou", belt: "ao", order: 6, em: "📊", title: "{表|ひょう} と グラフ", sub: "なかま ごと に ○ を つむ",
    maxAns: 12,
    gen: function (r, lv) {
      var k = r.int(3, 4), ns = [];
      for (var i = 0; i < k; i++) { var n; do { n = r.int(1, 8); } while (ns.indexOf(n) >= 0); ns.push(n); }
      return { t: lv === 0 ? "sort" : r.pick(["most", "count", "diff", "least"]), ns: ns, m: r.chance(0.5) ? "graph" : "table", s: r.int(0, 99) };
    },
    build: function (p) {
      var items = p.ns.map(function (n, i) { return { e: KINDS[i], n: n }; }), r = SD.rng(p.s);
      var max = items.slice().sort(function (a, b) { return b.n - a.n; })[0], min = items.slice().sort(function (a, b) { return a.n - b.n; })[0];
      var tool = { name: "graph", cfg: { items: items } };
      var pic = P.graph(items, p.m);
      var ch = items.map(function (it) { return { v: it.e, h: it.e }; });
      if (p.t === "sort") return { q: "くだもの を タップ して グラフ に ならべよう。いちばん おおい の は？", ans: max.e, kind: { op: "graph" }, type: "グラフ に あらわす", choices: ch, tool: tool };
      if (p.t === "most") return { q: "いちばん おおい の は どれ？", pic: pic, ans: max.e, kind: { op: "graph" }, type: "グラフ を よむ", choices: ch };
      if (p.t === "least") return { q: "いちばん すくない の は どれ？", pic: pic, ans: min.e, kind: { op: "graph" }, type: "グラフ を よむ", choices: ch };
      var it = r.pick(items);
      if (p.t === "count") return { q: it.e + " は いくつ？", pic: pic, ans: it.n, kind: { op: "count", n: it.n }, type: p.m === "table" ? "ひょう を よむ" : "グラフ を よむ" };
      return { q: max.e + " は " + min.e + " より いくつ おおい？", pic: pic, ans: max.n - min.n, kind: { op: "-", a: max.n, b: min.n }, type: "グラフ で くらべる" };
    },
    demo: {
      tool: "graph", cfg: { items: [{ e: "🍎", n: 4 }, { e: "🍊", n: 2 }, { e: "🍇", n: 5 }] },
      steps: [
        { say: "くだもの が ばらばら。なに が いくつ あるか わかりにくいね" },
        { say: "しゅるい ごと に ならべて、○ を したから つんで いくよ", act: function (t) { return t.act("sortAll"); } },
        { say: "○ の たかさ で くらべると、ぶどう が いちばん おおい！ これ が グラフ" },
        { say: "かず を すうじ で ならべた もの が ひょう だよ" }
      ]
    },
    explore: {
      tool: "graph", cfg: { items: [{ e: "🚃", n: 3 }, { e: "🚌", n: 5 }, { e: "🚗", n: 2 }] },
      tasks: [{ say: "のりもの を ぜんぶ タップ して グラフ に しよう", check: function (t) { return t.done(); } }]
    }
  });
})(typeof window !== "undefined" ? window.SD : globalThis.SD);
