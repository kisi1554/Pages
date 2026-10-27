/* みどりおび（小1）: 100 まで の 数・何十 の 計算・かたち あそび・絵 と 式 の 文章題
   学習指導要領 第1学年 A(1)(2)・B(1)・D(1) */
(function (SD) {
  "use strict";
  var P = SD.pics;

  SD.unit({
    id: "kazu100", belt: "midori", order: 1, em: "💯", title: "100 まで の {数|かず}", sub: "10 の まとまり と ばら",
    maxAns: 120,
    gen: function (r, lv) {
      var t = lv === 0 ? r.pick(["sticks", "make"]) : r.pick(["sticks", "make", "split", "seq", "big", "over"]);
      return { t: t, n: t === "over" ? r.int(101, 120) : r.int(21, 99), s: r.int(0, 999) };
    },
    build: function (p) {
      var n = p.n, T = Math.floor(n / 10), O = n % 10, r = SD.rng(p.s);
      var tool = { name: "placeval", cfg: { cols: [100, 10, 1], style: "sticks" } };
      if (p.t === "sticks") return { q: "いくつ？（10 の たば と ばら）", pic: P.sticks(T, O), ans: n, kind: { op: "+", a: T * 10, b: O }, type: "10 の まとまり で かぞえる", tool: tool, picWithTool: true };
      if (p.t === "make") return { q: "10 が " + T + "こ と 1 が " + O + "こ で いくつ？", expr: "10 が " + T + "こ ＋ 1 が " + O + "こ ＝ □", say: "10 が " + T + "こ と 1 が " + O + "こ で いくつ？", ans: n, kind: { op: "+", a: T * 10, b: O }, type: "10 の まとまり と ばら", tool: tool };
      if (p.t === "split") { var askT = r.chance(0.5);
        return { q: n + " は 10 が いくつ と 1 が いくつ？", expr: askT ? n + " は 10 が □こ と 1 が " + O + "こ" : n + " は 10 が " + T + "こ と 1 が □こ", ans: askT ? T : O, kind: { op: "place", n: n }, type: "十の位・一の位", tool: tool }; }
      if (p.t === "seq") {
        var step = r.pick([1, 1, 2, 5, 10]), start = Math.max(0, n - step * 3 - (n % step)), seq = [0, 1, 2, 3, 4].map(function (i) { return start + i * step; }).filter(function (v) { return v <= 120; }), hole = r.int(1, seq.length - 1);
        return { q: "□ に はいる かず は？（" + step + " ずつ）", expr: seq.map(function (v, i) { return i === hole ? "□" : v; }).join("　"), ans: seq[hole], kind: { op: "count", n: seq[hole] }, type: "かず の ならび",
          tool: { name: "numline", cfg: { min: start - start % 10, max: Math.min(120, start - start % 10 + 20), start: seq[0] } } };
      }
      if (p.t === "big") { var m; do { m = r.int(Math.max(10, n - 20), Math.min(99, n + 20)); } while (m === n || Math.floor(m / 10) === Math.floor(n / 10) && r.chance(0.5));
        return { q: "おおきい ほう は どっち？", ans: Math.max(n, m), kind: { op: "cmp", a: n, b: m }, type: "かず の おおきさ", choices: [{ v: n, h: String(n) }, { v: m, h: String(m) }] }; }
      return { q: "100 と " + (n - 100) + " で いくつ？", expr: "100 と " + (n - 100) + " で □", ans: n, kind: { op: "+", a: 100, b: n - 100 }, type: "100 より おおきい かず", tool: tool };
    },
    diagnose: function (p, g) {
      if (p.kind.op === "place" && Number(g) === (p.ans === Math.floor(p.kind.n / 10) ? p.kind.n % 10 : Math.floor(p.kind.n / 10))) return "reverse";
      return null;
    },
    demo: {
      tool: "placeval", cfg: { cols: [100, 10, 1], style: "sticks" },
      steps: [
        { say: "かず が おおきく なったら、10 ずつ まとめて たば に するよ" },
        { say: "ばら が 1、2、3… 10 に なったら", act: function (t) { return t.act("add", 1, 10); } },
        { say: "たば に まとめて、となり の 十のくらい へ！", act: function (t) { return t.act("pack"); } },
        { say: "たば を あと 2つ、ばら を 4つ。たば 3つ で 30、ばら 4 で 34", act: function (t) { return t.act("add", 10, 2).then(function () { return t.act("add", 1, 4); }); } },
        { say: "たば が 10 に なると 100。100 より おおきい かず も あるよ" }
      ]
    },
    explore: {
      tool: "placeval", cfg: { cols: [100, 10, 1], style: "sticks" },
      tasks: [
        { say: "＋ を おして、たば と ばら で 47 を つくろう", check: function (t) { return t.value() === 47; } },
        { say: "ばら を 10 に して「たばねる」を おそう。いくつ に なる？ 50 を つくろう", check: function (t) { return t.value() === 50; } }
      ]
    }
  });

  SD.unit({
    id: "nanju", belt: "midori", order: 2, em: "🔟", title: "{何十|なんじゅう} の けいさん", sub: "10 の まとまり で たす・ひく",
    maxAns: 100,
    gen: function (r) {
      var t = r.pick(["++", "--", "+1", "-1"]), a, b;
      if (t === "++") { a = r.int(1, 9) * 10; b = r.int(1, 10 - a / 10) * 10; }
      if (t === "--") { a = r.int(2, 10) * 10; b = r.int(1, a / 10 - 1) * 10; }
      if (t === "+1") { a = r.int(1, 9) * 10; b = r.int(1, 9); }
      if (t === "-1") { a = r.int(1, 9) * 10 + r.int(1, 9); b = a % 10; }
      return { t: t, a: a, b: b };
    },
    build: function (p) {
      var op = p.t[0], ans = op === "+" ? p.a + p.b : p.a - p.b;
      return { q: p.t.length === 2 && p.t[1] !== "1" ? "10 が なんこ に なるかな？" : "けいさん しよう", expr: p.a + (op === "+" ? " + " : " − ") + p.b + " = □", ans: ans, kind: { op: op, a: p.a, b: p.b },
        type: p.t === "++" || p.t === "--" ? "何十 の たしざん・ひきざん" : "何十 と いくつ",
        tool: { name: "placeval", cfg: { cols: [100, 10, 1], style: "sticks", init: { 10: Math.floor(p.a / 10), 1: p.a % 10 } } },
        explain: p.t === "++" || p.t === "--" ? "<p>10 が " + p.a / 10 + "こ " + (op === "+" ? "と" : "から") + " 10 が " + p.b / 10 + "こ " + (op === "+" ? "で" : "とると") + " 10 が " + ans / 10 + "こ → <b>" + ans + "</b></p>" : "" };
    },
    demo: {
      tool: "placeval", cfg: { cols: [100, 10, 1], style: "sticks", init: { 10: 3 } },
      steps: [
        { say: "30 + 20。30 は 10 の たば が 3つ" },
        { say: "たば を 2つ たすと", act: function (t) { return t.act("add", 10, 2); } },
        { say: "たば が 5つ で 50。3 + 2 = 5 と おなじ ように できるね" },
        { say: "40 + 3 は、たば 4つ と ばら 3つ で 43", act: function (t) { return t.act("set", 43); } }
      ]
    },
    explore: {
      tool: "placeval", cfg: { cols: [100, 10, 1], style: "sticks", init: { 10: 7 } },
      tasks: [{ say: "70 − 30。たば を 3つ へらそう（− を おす）", check: function (t) { return t.value() === 40; } }]
    }
  });

  var SOLIDS = {
    tsutsu: { name: "つつ", items: ["🥫", "🧻", "🥁"] },
    hako: { name: "はこ", items: ["📦", "🎁", "🧃"] },
    sai: { name: "さいころ", items: ["🎲", "🧊"] },
    ball: { name: "ボール", items: ["⚽", "🏀", "🍊"] }
  };
  SD.SOLIDS = SOLIDS;
  var Q3 = [
    ["roll", "ころがる の は どれ？", function (k) { return k === "tsutsu" || k === "ball"; }],
    ["noroll", "ころがらない の は どれ？", function (k) { return k === "hako" || k === "sai"; }],
    ["stack", "つみかさね にくい の は どれ？", function (k) { return k === "ball"; }],
    ["circle", "かみ に うつしとる と ○ に なる の は どれ？", function (k) { return k === "tsutsu"; }],
    ["square", "うつしとる と ましかく（□）だけ に なる の は どれ？", function (k) { return k === "sai"; }]
  ];
  SD.unit({
    id: "katachi", belt: "midori", order: 3, em: "🧱", title: "かたち あそび", sub: "つむ・ころがす・うつしとる",
    maxAns: 0, minUnique: 12,
    gen: function (r) {
      var t = r.pick(["q", "q", "same"]);
      return { t: t, qi: r.int(0, Q3.length - 1), s: r.int(0, 999) };
    },
    build: function (p) {
      var r = SD.rng(p.s), keys = Object.keys(SOLIDS);
      var item = function (k) { return r.pick(SOLIDS[k].items); };
      if (p.t === "same") {
        var k0 = r.pick(keys), others = r.shuffle(keys.filter(function (k) { return k !== k0; })).slice(0, 2), a = SOLIDS[k0].items;
        var pair = r.shuffle(a).slice(0, 2);
        return { q: pair[0] + " と おなじ なかま の かたち は どれ？", ans: k0, kind: { op: "shape", k: k0 }, type: "かたち の なかま わけ",
          choices: r.shuffle([{ v: k0, h: pair[1] }].concat(others.map(function (k) { return { v: k, h: item(k) }; }))), tool: { name: "solids", cfg: {} } };
      }
      var q = Q3[p.qi], good = keys.filter(q[2]), ansK = r.pick(good), bad = r.shuffle(keys.filter(function (k) { return !q[2](k); }));
      var opts = [ansK].concat(bad.slice(0, Math.min(2, bad.length)));
      return { q: q[1], ans: ansK, kind: { op: "shape", k: ansK }, type: "かたち の とくちょう", choices: r.shuffle(opts).map(function (k) { return { v: k, h: item(k) }; }), tool: { name: "solids", cfg: {} } };
    },
    demo: {
      tool: "solids", cfg: {},
      steps: [
        { say: "みのまわり の かたち を 4つ の なかま に わけるよ。つつ、はこ、さいころ、ボール" },
        { say: "ころがして みよう。ボール と つつ は ころがる！", act: function (t) { return t.act("roll", "ball").then(function () { return t.act("roll", "tsutsu"); }); } },
        { say: "はこ は ころがらない。でも たいら な ところ で つみかさね られる", act: function (t) { return t.act("roll", "hako"); } },
        { say: "つつ の そこ を かみ に うつしとる と ○ が かけるよ", act: function (t) { return t.act("stamp", "tsutsu"); } },
        { say: "はこ を うつしとる と ながしかく、さいころ は ましかく", act: function (t) { return t.act("stamp", "hako"); } }
      ]
    },
    explore: {
      tool: "solids", cfg: {},
      tasks: [
        { say: "かたち を タップ して えらび、「ころがす」で ためそう。ボール を ころがして みよう", check: function (t) { return t.did("roll", "ball"); } },
        { say: "うつしとる と ○ に なる かたち を さがして「うつす」を おそう", check: function (t) { return t.did("stamp", "tsutsu"); } }
      ]
    }
  });

  var STORIES = [
    ["+", function (a, b, e) { return "こうえん で " + e + " が " + a + "ひき あそんで います。" + b + "ひき きました。ぜんぶ で なんびき？"; }, "ふえると いくつ"],
    ["+", function (a, b, e) { return "あか い " + e + " が " + a + "こ、しろ い " + e + " が " + b + "こ。あわせて なんこ？"; }, "あわせて いくつ"],
    ["-", function (a, b, e) { return e + " が " + a + "こ あります。" + b + "こ あげると、のこり は なんこ？"; }, "のこり は いくつ"],
    ["-", function (a, b, e) { return "こども が " + a + "にん、" + e + " が " + b + "こ。" + e + " が たりない の は なんにん ぶん？"; }, "ちがい は いくつ"]
  ];
  SD.unit({
    id: "shiki", belt: "midori", order: 4, em: "🖼️", title: "え と しき", sub: "おはなし を しき に",
    maxAns: 20,
    gen: function (r) {
      var si = r.int(0, STORIES.length - 1), op = STORIES[si][0], a, b;
      if (op === "+") { a = r.int(2, 12); b = r.int(2, Math.min(9, 20 - a)); } else { a = r.int(5, 18); b = r.int(2, Math.min(9, a - 1)); }
      return { si: si, a: a, b: b, t: r.pick(["op", "ans"]), e: r.int(0, 11) };
    },
    build: function (p, lv) {
      var S = STORIES[p.si], e = P.ITEMS[p.e], op = S[0], ans = op === "+" ? p.a + p.b : p.a - p.b;
      var q = S[1](p.a, p.b, e), sym = op === "+" ? " + " : " − ";
      var pic = lv < 2 ? P.two(e, Math.min(p.a, 10), e, Math.min(p.b, 10), { op: op === "+" ? "+" : "−" }) : null;
      if (p.t === "op") return { q: q + "　しき は どれ？", ans: p.a + sym + p.b, kind: { op: "expr" }, type: "しき を つくる",
        choices: [{ v: p.a + " + " + p.b, h: p.a + " + " + p.b }, { v: p.a + " − " + p.b, h: p.a + " − " + p.b }],
        pic: pic };
      return { q: q, expr: p.a + sym + p.b + " = □", ans: ans, kind: { op: op, a: p.a, b: p.b }, type: S[2], pic: pic, tool: { name: "blocks", cfg: op === "+" ? { frames: 2, mode: "move", init: p.a, src: p.b } : { frames: 2, mode: "take", init: p.a } } };
    },
    demo: {
      tool: "blocks", cfg: { frames: 2, mode: "move", init: 6, src: 3 },
      steps: [
        { say: "こうえん に いぬ が 6ぴき。3びき きました。ぜんぶ で なんびき？" },
        { say: "「きました」は ふえる おはなし。だから たしざん", act: function (t) { return t.act("moveAll"); } },
        { say: "しき は 6 + 3 = 9。こたえ は 9ひき", act: function (t) { return t.act("label", "6 + 3 = 9"); } },
        { say: "「のこり は」「ちがい は」なら ひきざん だよ" }
      ]
    },
    explore: {
      tool: "blocks", cfg: { frames: 2, mode: "take", init: 12 },
      tasks: [{ say: "あめ が 12こ。5こ あげると のこり は？ ブロック を 5こ とって たしかめよう", check: function (t) { return t.value() === 7; } }]
    }
  });
})(typeof window !== "undefined" ? window.SD : globalThis.SD);
