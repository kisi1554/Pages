/* くろおび: 全単元 の まぜこぜ しけん（SD.testUnits("kuro")）・九九 の たつじん（1分）・ちょうせん もんだい */
(function (SD) {
  "use strict";

  SD.unit({
    id: "kukutatsu", belt: "kuro", order: 1, em: "⚡", title: "{九九|くく} の たつじん（1ぷん）", sub: "1ぷん で なんもん とける？",
    maxAns: 81, timed: 60, practiceN: 80, inKuroTest: true, minUnique: 40,
    starsAt: [15, 25, 35],
    gen: function (r) { return { a: r.int(1, 9), b: r.int(1, 9) }; },
    build: function (p) { return { q: "どんどん とこう！", expr: p.a + " × " + p.b + " = □", say: p.a + " かける " + p.b, ans: p.a * p.b, kind: { op: "*", a: p.a, b: p.b }, type: "九九 の スピード" }; },
    demo: {
      tool: "plates", cfg: { per: 7, plates: 0, e: "🔵", array: true },
      steps: [
        { say: "くろおび の しゅぎょう。九九 を 1ぷん で どれだけ とけるか ちょうせん じゃ" },
        { say: "7 の だん、7、14、21、28…", act: function (t) { return t.act("add", 4); } },
        { say: "こたえ を おぼえて いれば、かぞえ なくても すぐ でる。15もん で ★、25もん で ★★、35もん で ★★★" }
      ]
    },
    explore: {
      tool: "plates", cfg: { per: 9, plates: 0, e: "🔵", array: true },
      tasks: [{ say: "9 × 6 の アレイ を つくって、こたえ を たしかめよう（54）", check: function (t) { return t.value() === 6; } }]
    }
  });

  SD.unit({
    id: "chosen", belt: "kuro", order: 2, em: "🧩", title: "ちょうせん もんだい", sub: "きまり さがし・□ を つかった しき",
    maxAns: 100, inKuroTest: true,
    gen: function (r) {
      return { t: r.pick(["seq", "seq2", "pat", "boxadd", "boxsub", "boxmul", "boxsub2"]), a: r.int(2, 9), b: r.int(2, 9), c: r.int(3, 40), k: r.pick([2, 3, 4, 5, 10, -2, -3, -5]), s: r.int(0, 999) };
    },
    build: function (p) {
      var r = SD.rng(p.s), a = p.a, b = p.b, c = p.c;
      var tool = { name: "numline", cfg: { min: 0, max: 50, start: 0 } };
      if (p.t === "seq") {
        var start = p.k > 0 ? c : c + 5 * -p.k, seq = [0, 1, 2, 3, 4].map(function (i) { return start + i * p.k; }), hole = r.int(2, 4);
        return { q: "きまり を みつけて、□ に はいる かず は？", expr: seq.map(function (v, i) { return i === hole ? "□" : v; }).join(", "), ans: seq[hole], kind: { op: "seq" }, type: "きまり さがし" };
      }
      if (p.t === "seq2") {
        var s2 = [a], d = 1;
        for (var i = 1; i < 6; i++) { s2.push(s2[i - 1] + d); d++; }
        return { q: "ふえかた の きまり を みつけよう。□ は？", expr: s2.slice(0, 5).join(", ") + ", □", ans: s2[5], kind: { op: "seq" }, type: "きまり さがし（ふえかた が かわる）" };
      }
      if (p.t === "pat") {
        var E = r.shuffle(["🔴", "🔵", "🟡", "🟢"]), unit = [E[0], E[1], E[1]].concat(a % 2 ? [E[2]] : []), n = unit.length * 2 + 2 + (a % 3);
        var row = []; for (var j = 0; j < n; j++) row.push(unit[j % unit.length]);
        var ask = n + 3 + (b % 4);
        return { q: "おなじ じゅんばん で ならんで いるよ。" + ask + "ばんめ は どれ？", expr: row.join(""), ans: unit[(ask - 1) % unit.length], kind: { op: "pat" }, type: "きまり さがし（もよう）",
          choices: unit.filter(function (v, i, aa) { return aa.indexOf(v) === i; }).map(function (v) { return { v: v, h: v }; }) };
      }
      if (p.t === "boxadd") return { q: "□ に はいる かず は？", expr: "□ + " + a + " = " + (c + a), ans: c, kind: { op: "-", a: c + a, b: a }, type: "□ を つかった しき", tool: tool };
      if (p.t === "boxsub") return { q: "□ に はいる かず は？", expr: (c + a) + " − □ = " + c, ans: a, kind: { op: "-", a: c + a, b: c }, type: "□ を つかった しき", tool: tool };
      if (p.t === "boxsub2") return { q: "□ に はいる かず は？", expr: "□ − " + a + " = " + c, ans: c + a, kind: { op: "+", a: c, b: a }, type: "□ を つかった しき", tool: tool };
      return { q: "□ に はいる かず は？", expr: a + " × □ = " + a * b, ans: b, kind: { op: "kukurev" }, type: "□ を つかった しき（かけざん）" };
    },
    demo: {
      tool: "numline", cfg: { min: 0, max: 20, start: 0 },
      steps: [
        { say: "□ + 5 = 12。□ が わからない とき は、すうちょくせん で かんがえよう" },
        { say: "12 から ぎゃく に 5 もどると…", act: function (t) { return t.act("jump", 12).then(function () { return t.act("jump", -5); }); } },
        { say: "7。□ は 7 だね。たしかめ：7 + 5 = 12" },
        { say: "きまり さがし は、となり どうし の ちがい を みる のが こつ じゃ" }
      ]
    },
    explore: {
      tool: "numline", cfg: { min: 0, max: 30, start: 0 },
      tasks: [{ say: "□ − 6 = 14。かえる を つかって □ を みつけ、その ばしょ に とまろう", check: function (t) { return t.value() === 20; } }]
    }
  });
})(typeof window !== "undefined" ? window.SD : globalThis.SD);
