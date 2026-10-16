/* ============================================================
   ケーキ わけっこ — ステージ
   n: どうぶつの かず / foods: たべもの（t: round まるいケーキ・rect カステラ・choco いたチョコ）
   gx, gy: いたチョコの マスの かず / berries: いちごの かず（ぜんぶで）
   ============================================================ */
var ANIMALS = [
  { e: "🐻", name: "くま" },
  { e: "🐰", name: "うさぎ" },
  { e: "🐱", name: "ねこ" },
  { e: "🐶", name: "いぬ" },
  { e: "🐼", name: "パンダ" },
  { e: "🦊", name: "きつね" }
];

var FOOD_NAMES = { round: "ケーキ", rect: "カステラ", choco: "いたチョコ" };

var STAGES = [
  { n: 2, foods: [{ t: "round" }], title: "はんぶんこ",
    hint: "ケーキの うえを まっすぐ なぞって きってみよう" },
  { n: 2, foods: [{ t: "rect" }], title: "カステラ はんぶん",
    hint: "まんなかで きると おなじに なるよ" },
  { n: 2, foods: [{ t: "choco", gx: 4, gy: 2 }], title: "いたチョコ はんぶん",
    hint: "チョコは みぞに そって パキッと われるよ" },
  { n: 4, foods: [{ t: "round" }], title: "4ひきで わけよう",
    hint: "たてに 1かい、よこに 1かい きると…？" },
  { n: 2, foods: [{ t: "round" }], berries: 4, title: "いちごも はんぶん",
    hint: "いちごも おなじ かずに なるように きろう" },
  { n: 3, foods: [{ t: "round" }], title: "3ひきで わけよう",
    hint: "まんなかから そとへ なぞると、まんなかから きれるよ" },
  { n: 3, foods: [{ t: "choco", gx: 4, gy: 3 }], title: "チョコを 3ひきで",
    hint: "マスを かぞえて みよう。ぜんぶで いくつ？" },
  { n: 4, foods: [{ t: "rect" }], title: "カステラを 4ひきで",
    hint: "ほそながく きっても、しかくく きっても いいよ" },
  { n: 4, foods: [{ t: "round" }, { t: "round" }], title: "ケーキ 2こを 4ひきで",
    hint: "1こを はんぶんずつ に すると…？" },
  { n: 2, foods: [{ t: "round" }, { t: "round" }, { t: "round" }], title: "ケーキ 3こを 2ひきで",
    hint: "1こずつ あげて、のこりは どうする？" },
  { n: 6, foods: [{ t: "round" }], title: "6ぴきで わけよう",
    hint: "まんなかを とおる せんを 3かい きると…？" },
  { n: 3, foods: [{ t: "rect" }], berries: 6, title: "いちご カステラ",
    hint: "いちごが 2こずつ に なるように きろう" },
  { n: 4, foods: [{ t: "choco", gx: 6, gy: 2 }], title: "チョコを 4ひきで",
    hint: "12マスを 4ひきで わけると…？" },
  { n: 3, foods: [{ t: "round" }, { t: "round" }], title: "ケーキ 2こを 3びきで",
    hint: "1こを 3つに きると、ひとり いくつ？" },
  { n: 6, foods: [{ t: "choco", gx: 6, gy: 3 }], title: "チョコを 6ぴきで",
    hint: "18マスを 6ぴきで わけよう" },
  { n: 4, foods: [{ t: "rect" }, { t: "rect" }, { t: "rect" }], title: "カステラ 3こを 4ひきで",
    hint: "1こを 4つに きって、ひとり 3きれ ずつ" },
  { n: 5, foods: [{ t: "choco", gx: 5, gy: 4 }], title: "チョコを 5ひきで",
    hint: "20マスを 5ひきで わけると…？" },
  { n: 6, foods: [{ t: "round" }, { t: "round" }], berries: 6, title: "ケーキ 2こを 6ぴきで",
    hint: "1こを 3つずつ。いちごも 1こずつ だよ" }
];
