/* ちゃおび（小2）: 3けた の ひっ算・分数 の はじめ・時こく と 時間・テープ図 の 文章題
   学習指導要領 第2学年 A(1)(2)・C(2) */
(function (SD) {
  "use strict";
  var P = SD.pics, M = SD.M, F = SD.frac;

  SD.unit({
    id: "hissan3", belt: "cha", order: 1, em: "🏯", title: "3けた の ひっ{算|さん}", sub: "百のくらい へ くりあがる・から かりる",
    maxAns: 999,
    gen: function (r) {
      var t = r.pick(["22", "31", "32", "3m1"]), a, b;
      if (t === "22") { do { a = r.int(20, 99); b = r.int(20, 99); } while (a + b < 100); }
      if (t === "31") { do { a = r.int(100, 899); b = r.int(3, 99); } while (a + b > 999 || M.carries(a, b) === 0); }
      if (t === "32") { do { a = r.int(100, 198); b = r.int(10, 99); } while (a - b >= 100); }
      if (t === "3m1") { do { a = r.int(100, 999); b = r.int(3, 99); } while (a - b < 100 || M.borrows(a, b) === 0); }
      return { op: t === "22" || t === "31" ? "+" : "-", a: a, b: b };
    },
    build: function (p, lv) {
      var ans = p.op === "+" ? p.a + p.b : p.a - p.b;
      var base = { kind: { op: p.op, a: p.a, b: p.b }, ans: ans, type: p.op === "+" ? "3けた の たしざん ひっ算" : "3けた の ひきざん ひっ算" };
      var tool = { name: "hissan", cfg: { a: p.a, b: p.b, op: p.op, assist: true } };
      if (lv === 0) return Object.assign(base, { q: "ひっ算 で しよう。くりあがり・くりさがり に ちゅうい", tool: tool, toolAnswer: true });
      return Object.assign(base, { q: "ひっ算 で しよう", expr: p.a + (p.op === "+" ? " + " : " − ") + p.b + " = □", pic: P.hissan(p.a, p.b, p.op), tool: tool });
    },
    demo: {
      tool: "hissan", cfg: { a: 134, b: 58, op: "-", assist: true },
      steps: [
        { say: "134 − 58。一のくらい：4 から 8 は ひけない。十のくらい から 1 かりて 14 − 8 = 6", act: function (t) { return t.act("digit", 6); } },
        { say: "十のくらい は 3 が 2 に へった。2 から 5 も ひけない ので、百のくらい から かりて 12 − 5 = 7", act: function (t) { return t.act("digit", 7); } },
        { say: "百のくらい は 0 に なった ので かかない。こたえ は 76" },
        { say: "たしざん で たしかめ：76 + 58 = 134。あってる！" }
      ]
    },
    explore: {
      tool: "hissan", cfg: { a: 76, b: 58, op: "+", assist: true },
      tasks: [{ say: "76 + 58 を ひっ算 で。くりあがり が 2かい ある よ", check: function (t) { return t.value() === 134; } }]
    }
  });

  var nameF = function (n, d) { return d + "ぶんの" + n; };
  SD.unit({
    id: "bunsu", belt: "cha", order: 2, em: "🍕", title: "{分数|ぶんすう} の はじめ", sub: "はんぶん・その また はんぶん",
    maxAns: 12, minUnique: 12, maxFreq: 0.25,
    gen: function (r, lv) {
      var d = r.pick([2, 2, 4, 3]);
      return { t: lv === 0 ? "fold" : r.pick(["which", "of", "parts", "diff", "which"]), d: d, sh: r.pick(["square", "tape", "circle"]), n: d * r.int(1, d === 2 ? 6 : 3), s: r.int(0, 999) };
    },
    build: function (p) {
      var d = p.d, r = SD.rng(p.s), sh = d === 3 && p.sh === "square" ? "tape" : p.sh;
      if (p.t === "fold") return { q: "かみ を おって、" + F(1, d) + " に いろ を ぬろう", say: "かみ を おって " + nameF(1, d) + " に いろ を ぬろう", ans: "1/" + d, kind: { op: "frac", d: d }, type: nameF(1, d).replace("ぶんの", "ぶん の ") + " を つくる",
        tool: { name: "fold", cfg: { shape: d === 3 ? "tape" : "square", d: d } }, toolAnswer: true };
      if (p.t === "which") {
        var other = d === 2 ? 4 : 2, opts = [{ v: "ok", h: P.fracShape(sh, d, 1) }, { v: "other", h: P.fracShape(sh, other, 1) }];
        if (sh !== "circle") opts.push({ v: "uneven", h: P.fracShape(sh, d === 4 ? 2 : d, 1, { uneven: true }) });
        return { q: F(1, d) + " に いろ を ぬった の は どれ？", say: nameF(1, d) + " に いろ を ぬった の は どれ？", ans: "ok", kind: { op: "frac", d: d }, type: "分数 の 大きさ", choices: r.shuffle(opts), tool: { name: "fold", cfg: { shape: sh === "circle" ? "square" : sh, d: d } } };
      }
      if (p.t === "of") { var e = P.ITEMS[p.s % 12];
        return { q: p.n + "こ の " + F(1, d) + " は なんこ？", say: p.n + "こ の " + nameF(1, d) + " は なんこ？", pic: P.group(e, p.n, { w: 330, size: 30 }), ans: p.n / d, kind: { op: "fracof", n: p.n, d: d }, type: "いくつ の 分数", tool: { name: "fold", cfg: { shape: "tape", d: d } } }; }
      if (p.t === "parts") return { q: F(1, d) + " は、もと の 大きさ を おなじ 大きさ に □つ に わけた 1つ ぶん", say: nameF(1, d) + " は もと の 大きさ を おなじ 大きさ に いくつ に わけた 1つ ぶん？", ans: d, kind: { op: "count", n: d }, type: "分数 の いみ" };
      var same = r.chance(0.35), l1 = 120, l2 = same ? 120 : r.pick([60, 80]);
      return { q: "あ と い、どちら も テープ の " + F(1, 2) + " に いろ を ぬったよ。ぬった ながさ は おなじ？", say: "あ と い、どちら も テープ の 2ぶんの1 に いろ を ぬったよ。ぬった ながさ は おなじ？",
        pic: '<div style="text-align:left">あ ' + P.fracShape("tape", 2, 1, { len: l1 }) + "<br>い " + P.fracShape("tape", 2, 1, { len: l2 }) + "</div>",
        ans: same ? "same" : "diff", kind: { op: "frac" }, type: "もと の 大きさ と 分数",
        choices: [{ v: "same", h: "おなじ" }, { v: "diff", h: "ちがう" }],
        explain: "<p>もと の テープ の ながさ が ちがう と、おなじ " + F(1, 2) + " でも ながさ は ちがう よ</p>" };
    },
    demo: {
      tool: "fold", cfg: { shape: "square", d: 4 },
      steps: [
        { say: "ましかく の かみ を ぴったり はんぶん に おるよ", act: function (t) { return t.act("fold"); } },
        { say: "おなじ 大きさ に 2つ に わけた 1つ ぶん を 2ぶんの1 と いって、こう かくよ", act: function (t) { return t.act("paint", 1); } },
        { say: "もう いちど はんぶん に おると、4つ に わかれる", act: function (t) { return t.act("fold"); } },
        { say: "その 1つ ぶん が 4ぶんの1。2ぶんの1 の はんぶん だね", act: function (t) { return t.act("paint", 1); } }
      ]
    },
    explore: {
      tool: "fold", cfg: { shape: "tape", d: 3 },
      tasks: [{ say: "テープ を「3つ に おる」で おって、1つ に いろ を ぬろう（3ぶんの1）", check: function (t) { return t.value() === "1/3"; } }]
    }
  });

  var tm = function (h, m) { return M.fmtTime(h, m, true); };
  SD.unit({
    id: "jikan", belt: "cha", order: 3, em: "🕒", title: "{時|じ}こく と {時間|じかん}", sub: "なんぷん あと・なんぷん かん",
    maxAns: 60,
    gen: function (r) {
      return { t: r.pick(["after", "before", "dur", "unit", "ampm"]), h: r.int(1, 11), m: r.int(0, 9) * 5, d: r.pick([10, 15, 20, 25, 30, 40, 45, 50]), u: r.int(0, 2), a: r.int(0, 3) };
    },
    build: function (p) {
      var r = SD.rng(p.h * 97 + p.m + p.d), t0 = M.toMin(p.h, p.m);
      var tool = { name: "clock", cfg: { snap: 5, h: p.h, m: p.m, minutes: true } };
      var opt = function (t) { var x = M.fromMin(t); return { v: x.h + ":" + x.m, h: tm(x.h, x.m) }; };
      if (p.t === "after" || p.t === "before") {
        var sign = p.t === "after" ? 1 : -1, t1 = t0 + sign * p.d, x = M.fromMin(t1);
        var opts = [opt(t1), opt(t0 - sign * p.d), opt(t1 + 60 * sign), opt(t1 + (p.d === 30 ? 5 : 30))];
        var seen = {}; opts = opts.filter(function (o) { if (seen[o.v]) return false; seen[o.v] = 1; return true; });
        return { q: tm(p.h, p.m) + " の " + p.d + "{分|ふん} " + (sign > 0 ? "あと" : "まえ") + " の {時|じ}こく は？", pic: P.clock(p.h, p.m), ans: x.h + ":" + x.m, kind: { op: "clock", h: x.h, m: x.m }, type: "なんぷん あと・まえ", choices: r.shuffle(opts), tool: tool };
      }
      if (p.t === "dur") {
        var e = t0 + p.d, y = M.fromMin(e);
        return { q: tm(p.h, p.m) + " から " + tm(y.h, y.m) + " まで は なん{分|ぷん}{間|かん}？", ans: p.d, suffix: "{分|ふん}", kind: { op: "-", a: e, b: t0 }, type: "じかん（なんぷんかん）", tool: tool };
      }
      if (p.t === "unit") {
        var U = [["1{時間|じかん} = □{分|ふん}", 60], ["1{日|にち} = □{時間|じかん}", 24], ["{午前|ごぜん} は □{時間|じかん}", 12]][p.u];
        return { q: "じかん の たんい", expr: U[0], ans: U[1], kind: { op: "unit" }, type: "日・時・分 の かんけい" };
      }
      var A = [["あさごはん の 7じ", "am"], ["おやつ の 3じ", "pm"], ["ねる まえ の 8じ", "pm"], ["がっこう に つく 8じ", "am"]][p.a];
      return { q: A[0] + " は {午前|ごぜん}？ {午後|ごご}？", ans: A[1], kind: { op: "ampm" }, type: "午前・午後", choices: [{ v: "am", h: "{午前|ごぜん}" }, { v: "pm", h: "{午後|ごご}" }] };
    },
    demo: {
      tool: "clock", cfg: { snap: 5, h: 3, m: 10, minutes: true, digital: true },
      steps: [
        { say: "3じ10ぷん から 20ぷん たつと？ ながい はり を 20ぷん ぶん すすめるよ", act: function (t) { return t.act("to", 3, 30); } },
        { say: "3じ30ぷん。とけい の はり が しめす とき を「じこく」と いうよ" },
        { say: "3じ10ぷん から 3じ30ぷん まで の ながさ は 20ぷんかん。これ を「じかん」と いうよ" },
        { say: "ながい はり が ひとまわり で 1じかん ＝ 60ぷん。1にち は 24じかん", act: function (t) { return t.act("to", 4, 30); } }
      ]
    },
    explore: {
      tool: "clock", cfg: { snap: 5, h: 8, m: 40, minutes: true, digital: true },
      tasks: [{ say: "8じ40ぷん から 30ぷん あと に はり を うごかそう", check: function (t) { return t.value() === "9:10"; } }]
    }
  });

  // テープ図
  var TAPES = [
    { id: "gappei", f: function (a, b, e) { return e + " が " + a + "こ と " + b + "こ。あわせて なんこ？"; }, op: "+", parts: function (a, b) { return [[a, a], [b, b], "？こ"]; } },
    { id: "nokori", f: function (a, b, e) { return e + " が " + (a + b) + "こ。" + b + "こ たべると のこり は？"; }, op: "-", parts: function (a, b) { return [["？", a, 1], [b, b], (a + b) + "こ"]; } },
    { id: "gyaku1", f: function (a, b, e) { return e + " が なんこ か ありました。" + b + "こ もらったので " + (a + b) + "こ に なりました。はじめ は なんこ？"; }, op: "-", parts: function (a, b) { return [["？", a, 1], [b, b], (a + b) + "こ"]; } },
    { id: "gyaku2", f: function (a, b, e) { return e + " が なんこ か ありました。" + b + "こ あげたら " + a + "こ のこりました。はじめ は なんこ？"; }, op: "+", parts: function (a, b) { return [[a, a], [b, b], "？こ"]; } },
    { id: "gyaku3", f: function (a, b, e) { return e + " が " + (a + b) + "こ ありました。なんこ か あげたら " + a + "こ に なりました。あげた の は なんこ？"; }, op: "-", parts: function (a, b) { return [[a, a], ["？", b, 1], (a + b) + "こ"]; } }
  ];
  SD.unit({
    id: "tape", belt: "cha", order: 4, em: "🎞️", title: "テープ{図|ず} で かんがえる", sub: "たしざん？ ひきざん？",
    maxAns: 99,
    gen: function (r, lv) {
      var ti = r.int(0, TAPES.length - 1), a = r.int(8, 60), b = r.int(5, 39);
      if (a + b > 99) b = 99 - a;
      return { ti: ti, a: a, b: b, t: lv === 0 ? "ans" : r.pick(["op", "ans"]), e: r.int(0, 11) };
    },
    build: function (p) {
      var T = TAPES[p.ti], e = P.ITEMS[p.e], a = p.a, b = p.b, total = a + b, pr = T.parts(a, b);
      var ans = T.id === "gappei" || T.id === "gyaku2" ? total : T.id === "gyaku3" ? b : a;
      var expr = T.op === "+" ? a + " + " + b : total + " − " + (T.id === "gyaku3" ? a : b);
      var pic = P.tape([{ w: pr[0][1], label: pr[0][0], q: pr[0][2] }, { w: pr[1][1], label: pr[1][0], q: pr[1][2] }], "ぜんたい " + pr[2]);
      var tool = { name: "tape", cfg: { parts: [{ w: pr[0][1], label: String(pr[0][0]), q: !!pr[0][2] }, { w: pr[1][1], label: String(pr[1][0]), q: !!pr[1][2] }], whole: "ぜんたい " + pr[2] } };
      if (p.t === "op") {
        var wrong = T.op === "+" ? Math.max(a, b) + " − " + Math.min(a, b) : total + " + " + b;
        if (T.id === "gyaku3") wrong = total + " + " + a;
        return { q: T.f(a, b, e) + "　しき は どっち？", pic: pic, ans: expr, kind: { op: "expr" }, type: "テープ図 で しき を きめる",
          choices: SD.rng(p.a + p.b).shuffle([{ v: expr, h: expr }, { v: wrong, h: wrong }]) };
      }
      return { q: T.f(a, b, e), pic: pic, ans: ans, kind: { op: T.op, a: T.op === "+" ? a : total, b: T.op === "+" ? b : (T.id === "gyaku3" ? a : b) }, type: T.id.indexOf("gyaku") === 0 ? "ぎゃく に かんがえる 文章題" : "テープ図 の 文章題", tool: tool,
        explain: pic + "<p>しき：" + expr + " = " + ans + "</p>" };
    },
    diagnose: function (p, g) {
      var k = p.kind;
      if (k.op === "+" && Number(g) === Math.abs(k.a - k.b)) return "tape-op";
      if (k.op === "-" && Number(g) === k.a + k.b) return "tape-op";
      return null;
    },
    demo: {
      tool: "tape", cfg: { parts: [{ w: 9, label: "？", q: true }, { w: 6, label: "6", q: false }], whole: "ぜんたい 15こ" },
      steps: [
        { say: "あめ が なんこ か あって、6こ もらったら 15こ。はじめ は なんこ？" },
        { say: "テープ に かくと、ぜんたい が 15、ぶぶん が 6 と ？", act: function (t) { return t.act("show", "whole"); } },
        { say: "わからない の は ぶぶん。ぜんたい から わかる ぶぶん を ひくよ", act: function (t) { return t.act("show", "q"); } },
        { say: "15 − 6 = 9。「もらった」でも ひきざん に なる ことが あるね。ずに かくと まちがえない" }
      ]
    },
    explore: {
      tool: "tape", cfg: { parts: [{ w: 24, label: "24", q: false }, { w: 18, label: "18", q: false }], whole: "ぜんたい ？こ" },
      tasks: [{ say: "24こ と 18こ を あわせる おはなし。わからない ところ（ぜんたい）を タップ しよう", check: function (t) { return t.value() === "whole"; } }]
    }
  });
})(typeof window !== "undefined" ? window.SD : globalThis.SD);
