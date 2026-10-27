/* きいろおび（年長〜小1）: いくつ と いくつ・10 まで の たしざん ひきざん・0
   学習指導要領 第1学年 A(1)(2): 1位数と1位数との加法（和が10以下）と その逆の減法 */
(function (SD) {
  "use strict";
  var P = SD.pics;

  SD.unit({
    id: "ikutsu", belt: "kiiro", order: 1, em: "🖐️", title: "いくつ と いくつ", sub: "5 と 10 の まとまり",
    maxAns: 10,
    gen: function (r, lv) {
      var T = r.wpick([[3, 5], [3, 10], [1, 6], [1, 7], [1, 8], [1, 9]]);
      return { T: T, a: r.int(1, T - 1), t: r.pick(["ha", "to"]) };
    },
    build: function (p, lv) {
      var expr = p.t === "ha" ? p.T + " は " + p.a + " と □" : p.a + " と □ で " + p.T;
      return {
        q: "□ に はいる かず は？", expr: expr, pic: lv < 2 ? P.decomp(p.T, p.a) : null, ans: p.T - p.a,
        kind: { op: "decomp", T: p.T, a: p.a }, type: p.T === 5 ? "5 の いくつと いくつ" : p.T === 10 ? "10 の いくつと いくつ" : "いくつ と いくつ",
        say: p.t === "ha" ? p.T + " は " + p.a + " と なに？" : p.a + " と なに で " + p.T + "？",
        tool: { name: "blocks", cfg: { mode: "split", n: p.T, at: 0 } }
      };
    },
    demo: {
      tool: "blocks", cfg: { mode: "split", n: 10, at: 10 },
      steps: [
        { say: "ブロック が 10こ。しきり を うごかして、2つ に わけて みよう" },
        { say: "7 と 3。あわせて 10", act: function (t) { return t.act("split", 7); } },
        { say: "4 と 6。これも 10", act: function (t) { return t.act("split", 4); } },
        { say: "1 と 9、5 と 5。10 に なる ペア を「10 の ともだち」と いうよ", act: function (t) { return t.act("split", 5); } },
        { say: "あとで くりあがり の たしざん で だいかつやく する よ" }
      ]
    },
    explore: {
      tool: "blocks", cfg: { mode: "split", n: 10, at: 10 },
      tasks: [
        { say: "ブロック を タップ して、10 を 6 と 4 に わけよう", check: function (t) { return t.value() === 6; } },
        { say: "こんど は 8 と 2 に わけよう", check: function (t) { return t.value() === 8; } }
      ]
    }
  });

  var STORY_ADD = [
    function (a, b, e) { return e + " が " + a + "こ と " + b + "こ。あわせて なんこ？"; },
    function (a, b, e) { return e + " が " + a + "こ。" + b + "こ ふえると なんこ？"; }
  ];
  SD.unit({
    id: "tasu10", belt: "kiiro", order: 2, em: "➕", title: "たしざん（10 まで）", sub: "あわせて・ふえると",
    maxAns: 10,
    gen: function (r, lv) {
      var a = r.int(1, 9), b = r.int(1, 10 - a);
      return { a: a, b: b, st: lv === 1 ? r.int(-1, 1) : -1, e: r.int(0, 11) };
    },
    build: function (p, lv) {
      var e = P.ITEMS[p.e];
      return {
        q: p.st >= 0 ? STORY_ADD[p.st](p.a, p.b, e) : "たしざん を しよう", expr: p.a + " + " + p.b + " = □",
        pic: lv === 0 || p.st >= 0 ? P.two(e, p.a, e, p.b, { op: "+" }) : null,
        ans: p.a + p.b, kind: { op: "+", a: p.a, b: p.b }, type: "10 まで の たしざん",
        tool: { name: "blocks", cfg: { frames: 1, mode: "move", init: p.a, src: p.b } }
      };
    },
    demo: {
      tool: "blocks", cfg: { frames: 1, mode: "move", init: 3, src: 4 },
      steps: [
        { say: "3 + 4 を ブロック で やって みよう。わく に 3こ、した に 4こ あるよ" },
        { say: "した の ブロック を わく に よせて いくよ", act: function (t) { return t.act("moveAll"); } },
        { say: "ぜんぶ で いくつ？ うえ の れつ が 5、した に 2。5 と 2 で 7！", act: function (t) { return t.act("label", "7"); } },
        { say: "3 + 4 = 7。あわせる ときは たしざん だよ" }
      ]
    },
    explore: {
      tool: "blocks", cfg: { frames: 1, mode: "move", init: 2, src: 6 },
      tasks: [
        { say: "したの ブロック を タップ して、ぜんぶ わく に よせよう", check: function (t) { return t.value() === 8; } }
      ]
    },
  });

  SD.unit({
    id: "hiku10", belt: "kiiro", order: 3, em: "➖", title: "ひきざん（10 まで）", sub: "のこりは・ちがいは",
    maxAns: 10,
    gen: function (r, lv) {
      var a = r.int(2, 10), b = r.int(1, a - 1);
      return { a: a, b: b, st: lv === 0 ? -1 : r.wpick([[2, -1], [1, 0], [1, 1]]), e: r.int(0, 11), e2: r.int(0, 11) };
    },
    build: function (p, lv) {
      var e = P.ITEMS[p.e], e2 = P.ITEMS[(p.e2 === p.e ? p.e + 1 : p.e2) % 12], q = "ひきざん を しよう", pic = null, type = "のこり は いくつ";
      if (p.st === 0) { q = e + " が " + p.a + "こ。" + p.b + "こ たべると、のこり は なんこ？"; pic = P.group(e, p.a, {}); }
      if (p.st === 1) { q = e + " は " + e2 + " より なんこ おおい？"; pic = P.rows(e, p.a, e2, p.b, true); type = "ちがい は いくつ"; }
      return {
        q: q, expr: p.a + " − " + p.b + " = □", pic: pic, ans: p.a - p.b, kind: { op: "-", a: p.a, b: p.b }, type: type,
        tool: { name: "blocks", cfg: { frames: 1, mode: "take", init: p.a } }
      };
    },
    demo: {
      tool: "blocks", cfg: { frames: 1, mode: "take", init: 8 },
      steps: [
        { say: "8 − 3 を やって みよう。ブロック が 8こ" },
        { say: "3こ とる よ。いち、に、さん", act: function (t) { return t.act("take", 0, 3); } },
        { say: "のこり は 5こ。8 − 3 = 5", act: function (t) { return t.act("label", "5"); } },
        { say: "とったり、たべたり して へる とき は ひきざん だよ" }
      ]
    },
    explore: {
      tool: "blocks", cfg: { frames: 1, mode: "take", init: 9 },
      tasks: [
        { say: "9 − 4 を しよう。ブロック を 4こ タップ して とろう", check: function (t) { return t.value() === 5; } }
      ]
    }
  });

  SD.unit({
    id: "zero", belt: "kiiro", order: 4, em: "⭕", title: "0（れい）", sub: "なにも ない も かず",
    maxAns: 10,
    gen: function (r) {
      var t = r.pick(["empty", "p0", "0p", "aa", "a0"]);
      return { t: t, a: r.int(1, 9), e: r.int(0, 11) };
    },
    build: function (p, lv) {
      var e = P.ITEMS[p.e], a = p.a;
      var tool = { name: "blocks", cfg: { frames: 1, mode: "take", init: a } };
      if (p.t === "empty") return { q: "おさら の " + e + " は なんこ？", pic: P.group(e, 0, {}), ans: 0, kind: { op: "count", n: 0 }, type: "0 の いみ", choices: [{ v: 0, h: "0" }, { v: 1, h: "1" }, { v: 10, h: "10" }] };
      if (p.t === "p0") return { q: "たまいれ。1かいめ " + a + "こ、2かいめ は 0こ。あわせて？", expr: a + " + 0 = □", ans: a, kind: { op: "+", a: a, b: 0 }, type: "0 の たしざん", tool: tool };
      if (p.t === "0p") return { q: "たしざん を しよう", expr: "0 + " + a + " = □", ans: a, kind: { op: "+", a: 0, b: a }, type: "0 の たしざん", tool: tool };
      if (p.t === "aa") return { q: e + " が " + a + "こ。ぜんぶ たべると のこり は？", expr: a + " − " + a + " = □", pic: lv < 2 ? P.group(e, a, {}) : null, ans: 0, kind: { op: "-", a: a, b: a }, type: "0 に なる ひきざん", tool: tool };
      return { q: e + " が " + a + "こ。ひとつ も たべないと？", expr: a + " − 0 = □", ans: a, kind: { op: "-", a: a, b: 0 }, type: "0 を ひく", tool: tool };
    },
    demo: {
      tool: "blocks", cfg: { frames: 1, mode: "take", init: 3 },
      steps: [
        { say: "ブロック が 3こ。ぜんぶ とって みよう" },
        { say: "いち、に、さん。なにも なくなった", act: function (t) { return t.act("take", 0, 3); } },
        { say: "なにも ない ことを「0（れい）」と いうよ。3 − 3 = 0", act: function (t) { return t.act("label", "0"); } },
        { say: "0 を たしても、0 を ひいても、かず は かわらない よ" }
      ]
    },
    explore: {
      tool: "blocks", cfg: { frames: 1, mode: "take", init: 4 },
      tasks: [
        { say: "ブロック を ぜんぶ とって、0 に しよう", check: function (t) { return t.value() === 0; } }
      ]
    }
  });
})(typeof window !== "undefined" ? window.SD : globalThis.SD);
