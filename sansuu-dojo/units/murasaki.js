/* むらさきおび（小2）: かけ算 の いみ・九九・三角形 と 四角形・はこ の 形
   学習指導要領 第2学年 A(3)・B(1) */
(function (SD) {
  "use strict";
  var P = SD.pics;

  SD.unit({
    id: "kake", belt: "murasaki", order: 1, em: "🍡", title: "かけ{算|ざん} の いみ", sub: "○ の いくつぶん",
    maxAns: 45,
    gen: function (r, lv) {
      return { t: lv === 0 ? "plates" : r.pick(["plates", "expr", "bai", "array"]), a: r.int(2, 5), b: r.int(2, 9), e: r.int(0, 11) };
    },
    build: function (p) {
      var e = P.ITEMS[p.e], a = p.a, b = p.b, tool = { name: "plates", cfg: { per: a, plates: 0, e: e } };
      if (p.t === "plates") return { q: a + "こ ずつ " + b + "さら ぶん で、ぜんぶ で なんこ？", pic: P.plates(a, b, e), expr: a + " × " + b + " = □", ans: a * b, kind: { op: "*", a: a, b: b }, type: "かけざん の いみ", tool: tool };
      if (p.t === "expr") return { q: "「" + a + "こ ずつ " + b + "さら ぶん」の しき は どれ？", pic: P.plates(a, b, e), ans: a + "×" + b, kind: { op: "expr" }, type: "かけざん の しき",
        choices: SD.rng(a * 10 + b).shuffle([{ v: a + "×" + b, h: a + " × " + b }, { v: b + "×" + a, h: b + " × " + a }, { v: a + "+" + b, h: a + " + " + b }]).filter(function (c, i, arr) { return arr.map(function (x) { return x.v; }).indexOf(c.v) === i; }) };
      if (p.t === "bai") return { q: a + "cm の テープ の " + b + "ばい の ながさ は なんcm？", expr: a + " × " + b + " = □", ans: a * b, suffix: "cm", kind: { op: "*", a: a, b: b }, type: "なんばい", tool: tool };
      return { q: "● は いくつ？ " + a + " の まとまり が いくつ ぶん か かんがえよう", pic: P.array(b, a), expr: a + " × " + b + " = □", ans: a * b, kind: { op: "*", a: a, b: b }, type: "アレイ図", tool: tool };
    },
    diagnose: function (p, g) { if (p.kind.op === "expr" && String(g).indexOf("+") >= 0) return "op-add-mul"; return null; },
    demo: {
      tool: "plates", cfg: { per: 3, plates: 0, e: "🍡" },
      steps: [
        { say: "おさら 1まい に だんご が 3こ ずつ。おさら を ならべて いくよ" },
        { say: "1さら、2さら、3さら、4さら", act: function (t) { return t.act("add", 4); } },
        { say: "3こ ずつ 4さら ぶん を、3 × 4 と かくよ。「3 かける 4」", act: function (t) { return t.act("label", "3 × 4"); } },
        { say: "ならべかえる と、3こ の れつ が 4つ。ぜんぶ で 12こ", act: function (t) { return t.act("array"); } },
        { say: "1つ ぶん の かず × いくつ ぶん ＝ ぜんぶ の かず。これ が かけざん だよ" }
      ]
    },
    explore: {
      tool: "plates", cfg: { per: 4, plates: 0, e: "🍓" },
      tasks: [
        { say: "4こ ずつ の おさら を 3さら に しよう（＋ さら）", check: function (t) { return t.value() === 3; } },
        { say: "「ならべる」で アレイ に して みよう", check: function (t) { return t.isArray(); } }
      ]
    }
  });

  function kukuUnit(id, order, title, dans, em) {
    SD.unit({
      id: id, belt: "murasaki", order: order, em: em, title: title, sub: dans.join("・") + " の だん",
      maxAns: 81,
      gen: function (r, lv) {
        var a = r.pick(dans), b = r.int(1, 9);
        return { t: lv === 0 ? "arr" : r.wpick([[4, "expr"], [1, "rev"], [1, "ue"]]), a: a, b: b };
      },
      build: function (p) {
        var a = p.a, b = p.b, tool = { name: "plates", cfg: { per: a, plates: Math.max(0, b - 1), e: "🔵", array: true } };
        if (p.t === "rev") return { q: "□ に はいる かず は？", expr: a + " × □ = " + a * b, ans: b, kind: { op: "kukurev", a: a, b: b }, type: a + " の だん", tool: tool };
        if (p.t === "ue") return { q: a + " の だん：" + a + " × " + Math.max(2, b) + " は " + a + " × " + (Math.max(2, b) - 1) + " より いくつ おおい？", ans: a, kind: { op: "kukuup", a: a, b: b }, type: "かける かず が 1 ふえると", tool: tool,
          say: a + " かける " + Math.max(2, b) + " は " + a + " かける " + (Math.max(2, b) - 1) + " より いくつ おおい？" };
        return { q: a + " の だん", expr: a + " × " + b + " = □", ans: a * b, kind: { op: "*", a: a, b: b }, type: a + " の だん", tool: tool,
          explain: "<p>" + a + " の だん は " + a + " ずつ ふえる：" + [1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, b).map(function (k) { return a * k; }).join("、") + "</p>" };
      },
      demo: {
        tool: "plates", cfg: { per: dans[0], plates: 0, e: "🔵", array: true },
        steps: [
          { say: dans[0] + " の だん を つくろう。" + dans[0] + "こ の れつ を 1つ ずつ ふやすよ" },
          { say: dans[0] + " × 1 = " + dans[0], act: function (t) { return t.act("add", 1); } },
          { say: dans[0] + " × 2 = " + dans[0] * 2 + "。" + dans[0] + " ふえた", act: function (t) { return t.act("add", 1); } },
          { say: dans[0] + " × 3 = " + dans[0] * 3, act: function (t) { return t.act("add", 1); } },
          { say: "かける かず が 1 ふえると、こたえ は " + dans[0] + " ふえる。くりかえし となえて おぼえよう" }
        ]
      },
      explore: {
        tool: "plates", cfg: { per: dans[dans.length - 1], plates: 0, e: "🔵", array: true },
        tasks: [{ say: dans[dans.length - 1] + " × 4 の アレイ を つくろう", check: function (t) { return t.value() === 4; } }]
      }
    });
  }
  kukuUnit("kuku1", 2, "{九九|くく}（2・5・3・4 の だん）", [2, 5, 3, 4], "✌️");
  kukuUnit("kuku2", 3, "{九九|くく}（6・7・8・9・1 の だん）", [6, 7, 8, 9, 1], "🎌");

  // 三角形・四角形
  var SH = {
    tri: [[[0, 3], [4, 3], [1, 0]], [[1, 3], [5, 2], [2, 0]], [[0, 1], [4, 0], [3, 3]]],
    righttri: [[[0, 0], [0, 3], [4, 3]], [[1, 0], [5, 0], [1, 3]], [[0, 3], [4, 3], [4, 0]]],
    rect: [[[0, 0], [5, 0], [5, 2], [0, 2]], [[1, 0], [3, 0], [3, 3], [1, 3]], [[0, 1], [4, 1], [4, 3], [0, 3]]],
    square: [[[0, 0], [3, 0], [3, 3], [0, 3]], [[1, 1], [3, 1], [3, 3], [1, 3]], [[2, 0], [4, 0], [4, 2], [2, 2]]],
    quad: [[[0, 3], [5, 3], [4, 0], [1, 0]], [[0, 0], [4, 1], [5, 3], [1, 3]], [[1, 0], [5, 0], [4, 3], [0, 3]]],
    open: [[[0, 3], [4, 3], [1, 0], [0, 2]]]
  };
  var NAME = { tri: "{三角形|さんかくけい}", righttri: "{直角三角形|ちょっかくさんかくけい}", rect: "{長方形|ちょうほうけい}", square: "{正方形|せいほうけい}", quad: "{四角形|しかくけい}" };
  SD.SHAPES = SH;
  SD.unit({
    id: "sankaku", belt: "murasaki", order: 4, em: "🔺", title: "{三角形|さんかくけい} と {四角形|しかくけい}", sub: "{辺|へん}・{頂点|ちょうてん}・{直角|ちょっかく}",
    maxAns: 4, testTool: true, minUnique: 10,
    gen: function (r, lv) {
      return { t: lv === 0 ? r.pick(["draw", "draw", "which"]) : r.pick(["which", "which", "count", "right", "name"]), k: r.pick(["tri", "righttri", "rect", "square"]), s: r.int(0, 99), c: r.pick(["hen", "cho"]) };
    },
    build: function (p) {
      var r = SD.rng(p.s), k = p.k;
      if (p.t === "draw") {
        var acc = { tri: ["tri", "righttri"], righttri: ["righttri"], rect: ["rect"], square: ["square"] }[k];
        return { q: "てん を じゅんに タップ して " + NAME[k] + " を かこう（さいご は はじめ の てん）", ans: acc[0], accept: acc, kind: { op: "shape", k: k }, type: NAME[k].replace(/\{([^|]+)\|[^}]+\}/g, "$1") + " を かく",
          tool: { name: "dotgrid", cfg: {} }, toolAnswer: true };
      }
      if (p.t === "which") {
        var others = r.shuffle(Object.keys(NAME).filter(function (x) { return x !== k && !(k === "tri" && x === "righttri"); })).slice(0, 2);
        var opts = [k].concat(others).map(function (x) { return { v: x, h: P.poly(r.pick(SH[x]), { g: 18, cols: 6, rows: 4 }) }; });
        if (r.chance(0.3)) opts[2] = { v: "open", h: P.poly(SH.open[0], { g: 18, cols: 6, rows: 4 }).replace("<polygon", "<polyline").replace('fill="#ffe8cc"', 'fill="none"') };
        return { q: NAME[k] + " は どれ？", ans: k, kind: { op: "shape", k: k }, type: "かたち の なまえ", choices: r.shuffle(opts) };
      }
      if (p.t === "count") {
        var tri = k === "tri" || k === "righttri";
        return { q: NAME[k] + " の " + (p.c === "hen" ? "{辺|へん} は なんぼん？" : "{頂点|ちょうてん} は いくつ？"), pic: P.poly(SH[k][0], { g: 22 }), ans: tri ? 3 : 4, kind: { op: "count", n: tri ? 3 : 4 }, type: "辺 と 頂点" };
      }
      if (p.t === "right") {
        var n = { tri: 0, righttri: 1, rect: 4, square: 4 }[k];
        if (k === "tri") n = 0;
        return { q: "この かたち に {直角|ちょっかく} は いくつ？（かみ の かど を あてて みよう）", pic: P.poly(SH[k][1], { g: 22 }), ans: n, kind: { op: "count", n: n }, type: "直角" };
      }
      var kk = r.pick(["rect", "square", "righttri"]);
      var desc = { rect: "かど が ぜんぶ 直角 の 四角形", square: "かど が ぜんぶ 直角 で、辺 の ながさ が ぜんぶ おなじ 四角形", righttri: "直角 の かど が ある 三角形" }[kk];
      return { q: "「" + desc + "」の なまえ は？", ans: kk, kind: { op: "shape", k: kk }, type: "かたち の なまえ",
        choices: r.shuffle(["rect", "square", "righttri"]).map(function (x) { return { v: x, h: NAME[x] }; }) };
    },
    demo: {
      tool: "dotgrid", cfg: {},
      steps: [
        { say: "てん を まっすぐ な せん で むすんで かたち を つくろう" },
        { say: "3つ の てん を むすんで とじると 三角形。まっすぐ な せん を 辺、かど を 頂点 と いうよ", act: function (t) { return t.act("draw", [[1, 0], [1, 3], [4, 3]]); } },
        { say: "かど が かみ を ふたつおり、もう ふたつおり した かど と ぴったり なら 直角。直角 が ある 三角形 は 直角三角形", act: function (t) { return t.act("right"); } },
        { say: "4つ の かど が ぜんぶ 直角 の 四角形 が 長方形、そのうえ 辺 が ぜんぶ おなじ ながさ なら 正方形", act: function (t) { return t.act("draw", [[0, 1], [5, 1], [5, 3], [0, 3]]); } }
      ]
    },
    explore: {
      tool: "dotgrid", cfg: {},
      tasks: [
        { say: "てん を むすんで 三角形 を かこう", check: function (t) { return /tri/.test(t.value()); } },
        { say: "「けす」で けして、こんど は 長方形 を かこう", check: function (t) { return t.value() === "rect"; } }
      ]
    }
  });

  SD.unit({
    id: "hako", belt: "murasaki", order: 5, em: "📦", title: "はこ の かたち", sub: "{面|めん}・{辺|へん}・{頂点|ちょうてん}",
    maxAns: 12, minUnique: 8, maxFreq: 0.5,
    gen: function (r, lv) {
      return { t: lv === 0 ? "faces" : r.pick(["faces", "edges", "verts", "pairs", "net", "cube"]), s: r.int(0, 999) };
    },
    build: function (p) {
      var r = SD.rng(p.s), tool = { name: "box", cfg: { w: 4, h: 2, d: 3 } };
      if (p.t === "faces") return { q: "はこ の {面|めん} は いくつ？", pic: P.box(5, 3, 3), ans: 6, kind: { op: "count", n: 6 }, type: "面 の かず", tool: tool };
      if (p.t === "edges") return { q: "はこ の {辺|へん} は なんぼん？", pic: P.box(5, 3, 3), ans: 12, kind: { op: "count", n: 12 }, type: "辺 の かず", tool: tool };
      if (p.t === "verts") return { q: "はこ の {頂点|ちょうてん}（●）は いくつ？ みえない ところ にも あるよ", pic: P.box(5, 3, 3, { dots: true }), ans: 8, kind: { op: "count", n: 8 }, type: "頂点 の かず", tool: tool };
      if (p.t === "pairs") return { q: "この はこ で、おなじ かたち の {面|めん} は いくつ ずつ ある？", pic: P.box(5, 3, 3), ans: 2, kind: { op: "count", n: 2 }, type: "おなじ かたち の 面", tool: tool };
      if (p.t === "cube") return { q: "さいころ の かたち の {面|めん} は どんな かたち？", pic: P.box(3, 3, 3), ans: "square", kind: { op: "shape" }, type: "さいころ の かたち",
        choices: [{ v: "square", h: "{正方形|せいほうけい}" }, { v: "rect", h: "{長方形|ちょうほうけい}" }, { v: "tri", h: "{三角形|さんかくけい}" }] };
      var ok = r.chance(0.5), cells = r.pick(ok ? P.NETS.ok : P.NETS.ng);
      return { q: "この かたち を くみたてる と さいころ の はこ に なる？", pic: P.net(cells), ans: ok ? "yes" : "no", kind: { op: "net" }, type: "ひらいた かたち",
        choices: [{ v: "yes", h: "⭕ なる" }, { v: "no", h: "❌ ならない" }], tool: { name: "box", cfg: { w: 3, h: 3, d: 3, open: true } } };
    },
    demo: {
      tool: "box", cfg: { w: 4, h: 2, d: 3 },
      steps: [
        { say: "はこ を ゆび で まわして みよう。たいら な ところ が {面|めん}" },
        { say: "面 を かぞえる と 1、2、3、4、5、6。面 は 6つ", act: function (t) { return t.act("countFaces"); } },
        { say: "面 と 面 の さかい の せん が {辺|へん}（12ほん）、かど が {頂点|ちょうてん}（8つ）", act: function (t) { return t.act("spin"); } },
        { say: "はこ を ひらく と、こんな かたち に なるよ", act: function (t) { return t.act("open"); } }
      ]
    },
    explore: {
      tool: "box", cfg: { w: 4, h: 2, d: 3 },
      tasks: [
        { say: "はこ を まわしながら 面 を ぜんぶ タップ して かぞえよう", check: function (t) { return t.value() === 6; } },
        { say: "「ひらく」で はこ を ひらいて みよう", check: function (t) { return t.opened(); } }
      ]
    }
  });
})(typeof window !== "undefined" ? window.SD : globalThis.SD);
