/* しろおび（年長）: 10 まで の かず・くらべる・なんばんめ・すうじ の かきかた
   幼稚園教育要領「数量や図形への関心・感覚」の あそび として。こたえは えらぶ */
(function (SD) {
  "use strict";
  var P = SD.pics;

  SD.unit({
    id: "kazu10", belt: "shiro", order: 1, em: "🍎", title: "10 まで の かず", sub: "かぞえる・すうじ と あわせる",
    input: "choice", maxAns: 10,
    gen: function (r, lv) {
      var t = lv === 0 ? "put" : r.wpick([[3, "count"], [2, "which"], [2, "seq"]]);
      return { t: t, n: r.int(t === "seq" ? 3 : 1, 10), e: r.int(0, P.ITEMS.length - 1), s: r.int(1, 999) };
    },
    build: function (p) {
      var e = P.ITEMS[p.e], r = SD.rng(p.s);
      if (p.t === "put") return {
        q: "<b>" + p.n + "</b> こ ぶん、ブロック を おこう", expr: String(p.n), kind: { op: "count", n: p.n }, ans: p.n, type: "かず と すうじ",
        tool: { name: "blocks", cfg: { frames: 1, mode: "place" } }, toolAnswer: true
      };
      if (p.t === "count") return {
        q: e + " は なんこ？", pic: P.group(e, p.n, { scatter: p.n > 5 && p.s % 2 === 0, seed: p.s }), ans: p.n,
        kind: { op: "count", n: p.n }, type: "かぞえる", choices: SD.numChoices(p.n, r, 1, 10, 3),
        tool: { name: "blocks", cfg: { frames: 1, mode: "place" } }
      };
      if (p.t === "which") {
        var opts = r.shuffle([p.n, p.n > 1 ? p.n - 1 : p.n + 2, p.n < 10 ? p.n + 1 : p.n - 2]);
        return {
          q: "<b>" + p.n + "</b> こ は どれ？", expr: String(p.n), ans: p.n, kind: { op: "count", n: p.n }, type: "かず と すうじ",
          choices: opts.map(function (v) { return { v: v, h: P.group(e, v, { w: 200, size: 30, h: v > 5 ? 80 : 44 }) }; }), wide: true
        };
      }
      var start = p.n - 2, hole = r.int(0, 2), seq = [start, start + 1, start + 2].map(function (v, i) { return i === hole ? "□" : v; });
      var a = start + hole;
      return { q: "□ に はいる かず は？", expr: seq.join("　") + "　→", ans: a, kind: { op: "count", n: a }, type: "かず の じゅんばん", choices: SD.numChoices(a, r, 1, 10, 3) };
    },
    demo: {
      tool: "blocks", cfg: { frames: 1, mode: "place" },
      steps: [
        { say: "かず を かぞえる ときは、ひとつずつ ゆびで さして、ブロック を おいて いくよ" },
        { say: "いち", act: function (t) { return t.act("place", 0); } },
        { say: "に", act: function (t) { return t.act("place", 0); } },
        { say: "さん", act: function (t) { return t.act("place", 0); } },
        { say: "し", act: function (t) { return t.act("place", 0); } },
        { say: "ご。うえの れつ が いっぱい に なると 5 だよ", act: function (t) { return t.act("place", 0); } },
        { say: "したの れつ も うめると、ぜんぶで 10。10 の わく が いっぱい！", act: function (t) { return t.act("fill", 0, 10); } },
        { say: "ブロック を さわると へらせる よ。じぶん でも やって みよう" }
      ]
    },
    explore: {
      tool: "blocks", cfg: { frames: 1, mode: "place" },
      tasks: [
        { say: "わく を タップ して、ブロック を 3こ おこう", check: function (t) { return t.value() === 3; } },
        { say: "こんど は 7こ に しよう（ブロック を タップ すると へるよ）", check: function (t) { return t.value() === 7; } },
        { say: "10の わく を いっぱい に しよう", check: function (t) { return t.value() === 10; } }
      ]
    },
  });

  SD.unit({
    id: "kuraberu", belt: "shiro", order: 2, em: "⚖️", title: "どっち が おおい？", sub: "ならべて くらべる",
    input: "choice", maxAns: 10,
    gen: function (r, lv) {
      var a = r.int(2, 9), b;
      do { b = r.int(2, 9); } while (b === a || Math.abs(a - b) > 4);
      return { t: lv === 0 ? "rows" : r.wpick([[2, "rows"], [1, "num"], [1, "less"]]), a: a, b: b, e1: r.int(0, 5), e2: r.int(6, 11), s: r.int(1, 999) };
    },
    build: function (p) {
      var e1 = P.ITEMS[p.e1], e2 = P.ITEMS[p.e2];
      if (p.t === "num") {
        var big = Math.max(p.a, p.b);
        return { q: "おおきい かず は どっち？", ans: big, kind: { op: "cmp", a: p.a, b: p.b }, type: "かず の おおきさ",
          choices: [{ v: p.a, h: String(p.a) }, { v: p.b, h: String(p.b) }] };
      }
      var less = p.t === "less";
      return {
        q: less ? "すくない の は どっち？" : "おおい の は どっち？",
        pic: P.rows(e1, p.a, e2, p.b, false, p.s),
        ans: less ? (p.a < p.b ? "a" : "b") : (p.a > p.b ? "a" : "b"),
        kind: { op: "cmp", a: p.a, b: p.b }, type: "1たい1 で くらべる",
        choices: [{ v: "a", h: e1 + " うえ" }, { v: "b", h: e2 + " した" }],
        tool: { name: "blocks", cfg: { mode: "compare", a: p.a, b: p.b, e1: e1, e2: e2 } }
      };
    },
    demo: {
      tool: "blocks", cfg: { mode: "compare", a: 6, b: 4, e1: "🍎", e2: "🍊" },
      steps: [
        { say: "りんご と みかん、どっち が おおい かな？ ばらばら だと わかりにくいね" },
        { say: "うえ と した を ひとつずつ ならべて みよう", act: function (t) { return t.act("align"); } },
        { say: "ペア に ならない ぶん が ある ほう が おおい。りんご が 2こ おおいね", act: function (t) { return t.act("mark"); } },
        { say: "かぞえ なくても、ならべれば くらべ られる よ" }
      ]
    },
    explore: {
      tool: "blocks", cfg: { mode: "compare", a: 5, b: 7, e1: "🐟", e2: "🐞" },
      tasks: [
        { say: "「ならべる」を おして、ペア を つくろう", check: function (t) { return t.aligned(); } },
        { say: "おおい ほう の あまった もの を タップ しよう", check: function (t) { return t.value() === "b"; } }
      ]
    }
  });

  SD.unit({
    id: "nanbanme", belt: "shiro", order: 3, em: "🚩", title: "なんばんめ", sub: "まえ から・うしろ から",
    input: "choice", maxAns: 8, testTool: true,
    gen: function (r, lv) {
      var len = r.int(5, 7), k = r.int(1, len - 1);
      return { t: lv === 0 ? r.pick(["one", "many"]) : r.wpick([[2, "one"], [1, "back"], [1, "pos"]]), len: len, k: k, s: r.int(0, 999) };
    },
    build: function (p) {
      var list = SD.rng(p.s).shuffle(P.ANIMALS).slice(0, p.len);
      var cfg = { list: list };
      if (p.t === "one") return {
        q: "まえ から <b>" + p.k + "ばんめ</b> を タップ しよう", ans: String(p.k - 1), kind: { op: "ord", k: p.k, len: p.len }, type: "なんばんめ",
        tool: { name: "lineup", cfg: Object.assign({ mode: "one" }, cfg) }, toolAnswer: true
      };
      if (p.t === "many") return {
        q: "まえ から <b>" + p.k + "ひき</b> を タップ しよう", ans: Array.from({ length: p.k }, function (_, i) { return i; }).join(","), kind: { op: "ord", k: p.k, len: p.len, many: 1 }, type: "なんびき と なんばんめ",
        tool: { name: "lineup", cfg: Object.assign({ mode: "many" }, cfg) }, toolAnswer: true
      };
      if (p.t === "back") {
        var i = p.len - p.k;
        var opts = SD.rng(p.s + 1).shuffle([i, p.k - 1, (i + 1) % p.len].filter(function (v, j, a) { return a.indexOf(v) === j; }));
        return { q: "うしろ から <b>" + p.k + "ばんめ</b> は だれ？", pic: P.line(list), ans: list[i], kind: { op: "ord", k: p.k, len: p.len, back: 1 }, type: "うしろ から なんばんめ",
          choices: opts.map(function (j) { return { v: list[j], h: list[j] }; }) };
      }
      return { q: list[p.k - 1] + " は まえ から なんばんめ？", pic: P.line(list), ans: p.k, kind: { op: "ord", k: p.k, len: p.len }, type: "なんばんめ",
        choices: SD.numChoices(p.k, SD.rng(p.s), 1, p.len, 3).map(function (c) { return { v: c.v, h: c.v + "ばんめ" }; }) };
    },
    diagnose: function (p, g) {
      var k = p.kind;
      if (k.many && String(g) === String(k.k - 1)) return "ord-card";
      if (!k.many && String(g) === String(k.len - k.k) && !k.back) return "ord-end";
      return null;
    },
    demo: {
      tool: "lineup", cfg: { mode: "one", list: ["🐶", "🐱", "🐰", "🐻", "🐼", "🦊"] },
      steps: [
        { say: "どうぶつ が はた の ほう を むいて ならんで いるよ。はた の ある ほう が まえ" },
        { say: "まえ から 3ばんめ は、いち、に、さん。うさぎ さん！", act: function (t) { return t.act("count", 3, "one"); } },
        { say: "まえ から 3びき は、いち、に、さん、の 3びき ぜんぶ", act: function (t) { return t.act("count", 3, "many"); } },
        { say: "「3ばんめ」は 1ぴき、「3びき」は 3びき。ちがい に きを つけよう" }
      ]
    },
    explore: {
      tool: "lineup", cfg: { mode: "one", list: ["🐸", "🐵", "🐷", "🐨", "🐶", "🐱", "🐰"] },
      tasks: [
        { say: "まえ から 2ばんめ を タップ しよう", check: function (t) { return t.value() === "1"; } },
        { say: "うしろ から 1ばんめ を タップ しよう", check: function (t) { return t.value() === "6"; } }
      ]
    }
  });

  SD.unit({
    id: "kaku", belt: "shiro", order: 4, em: "✏️", title: "すうじ の かきかた", sub: "0〜9 を ゆび で なぞる",
    input: "choice", maxAns: 9,
    gen: function (r, lv) {
      var t = lv === 0 ? "trace" : r.pick(["mirror", "count"]);
      return { t: t, d: t === "mirror" ? r.pick([2, 3, 4, 5, 6, 7, 9]) : r.int(t === "trace" ? 0 : 1, 9), s: r.int(0, 999) };
    },
    build: function (p) {
      var r = SD.rng(p.s);
      if (p.t === "trace") return { q: "<b>" + p.d + "</b> を ゆび で なぞろう（● から スタート）", ans: p.d, kind: { op: "digit", d: p.d }, type: "すうじ を かく",
        tool: { name: "trace", cfg: { d: p.d } }, toolAnswer: true };
      if (p.t === "mirror") {
        // かがみ もじ（さゆう はんてん）と さかさま（6 と 9 の とりちがえ）
        var opts = r.shuffle([{ v: "ok", h: '<span class="digit">' + p.d + "</span>" }, { v: "flip", h: '<span class="digit flip">' + p.d + "</span>" }, { v: "up", h: '<span class="digit upside">' + p.d + "</span>" }]);
        return { q: "ただしい <b>" + p.d + "</b> は どれ？", ans: "ok", kind: { op: "digit", d: p.d }, type: "すうじ の かたち", choices: opts };
      }
      var e = SD.pics.ITEMS[p.s % 12];
      return { q: "いくつ？ すうじ を えらぼう", pic: P.group(e, p.d, {}), ans: p.d, kind: { op: "count", n: p.d }, type: "かず と すうじ", choices: SD.numChoices(p.d, r, 1, 9, 3) };
    },
    demo: {
      tool: "trace", cfg: { d: 2 },
      steps: [
        { say: "すうじ には かきはじめ が あるよ。みどり の ● から スタート" },
        { say: "2 は、うえ で くるっと まわって、ななめ に おりて、よこ に ぴゅー", act: function (t) { return t.act("draw"); } },
        { say: "やじるし の じゅんばん に なぞると、きれい に かけるよ" }
      ]
    },
    explore: {
      tool: "trace", cfg: { d: 5 },
      tasks: [
        { say: "5 を なぞって みよう。2かい に わけて かくよ", check: function (t) { return t.value() === 5; } }
      ]
    }
  });
})(typeof window !== "undefined" ? window.SD : globalThis.SD);
