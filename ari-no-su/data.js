/* ありの す たんけん ｜ ずかん・バッジ の データ
 * せいたいの せつめいは README.md の 出典で たしかめた もの。
 */
(function () {
  "use strict";
  const ARI = (window.ARI = window.ARI || {});

  // look: ずかんの え の いろ（head / thorax / gaster）
  ARI.SPECIES = [
    { id: "kurooo", name: "クロオオアリ", size: "7〜12mm", where: "こうえん・はらっぱの じめん", play: true,
      one: "にほんで いちばん おおきい なかま。ひらけた じめんに ふかい すを ほるよ。",
      more: "さなぎは まゆの なか。けっこんひこうは 5〜6がつの ゆうがたが おおい。",
      look: { body: "#17110d" } },
    { id: "kuroyama", name: "クロヤマアリ", size: "4.5〜6mm", where: "こうえん・にわ・みちばた", play: true,
      one: "こうえんで いちばん よく みる あり。からだが すこし ぎんいろに ひかる。",
      more: "サムライアリに さなぎを つれて いかれる ことが ある。",
      look: { body: "#2c2c31", shine: "rgba(230,235,255,.45)" } },
    { id: "tobiiro", name: "トビイロケアリ", size: "2.5〜3.5mm", where: "にわ・はたけ・きの ねもと",
      one: "アブラムシの あまい しるを もらう。かわりに アブラムシを まもって あげる。",
      look: { body: "#5a3a22" } },
    { id: "amime", name: "アミメアリ", size: "2.5mm くらい", where: "いしの した・おちばの した",
      one: "じょおうが いない！ はたらきありが たまごを うむ。すを よく ひっこすよ。",
      look: { body: "#4a2f1f" } },
    { id: "samurai", name: "サムライアリ", size: "4.5〜6mm", where: "クロヤマアリの すの なか",
      one: "じぶんでは こそだて しない。クロヤマアリの さなぎを はこんで きて、そだてて もらう。",
      look: { body: "#6b2f1d" } },
    { id: "toge", name: "トゲアリ", size: "7〜8mm", where: "かれた きの なか",
      one: "せなかに トゲ。じょおうは クロオオアリ などの すに はいりこんで すを はじめる。",
      look: { body: "#151010", thorax: "#8a2f1e", waist: "#8a2f1e" }, spines: true },
    { id: "muneaka", name: "ムネアカオオアリ", size: "7〜12mm", where: "やまの かれきの なか",
      one: "むねが あかい おおきな あり。じょおうは 10ねん いじょう いきる ことも。",
      look: { body: "#1a1310", thorax: "#9b3a22" } },
    { id: "oozu", name: "アズマオオズアリ", size: "2〜4mm", where: "にわ・いしの した",
      one: "あたまの とても おおきい「へいたいあり」が いる。かたい たねも かみくだく。",
      look: { body: "#7a4a24" }, bigHead: true },
    { id: "hime", name: "ヒメアリ", size: "1.5mm くらい", where: "いえの まわり・いえの なか",
      one: "とっても ちいさい。いえの なかの おかしに ぎょうれつを つくる ことも。",
      look: { body: "#b5803a", gaster: "#3a2a1e" } },
    { id: "shiriage", name: "ハリブトシリアゲアリ", size: "2.5〜4mm", where: "きの みき・えだの すきま",
      one: "おどろくと おしりを ぴょこんと あげる。きの うえで くらして いる。",
      look: { body: "#3a2418" } },
  ];

  ARI.BADGES = [
    { id: "line", emoji: "🐜", name: "はじめての ぎょうれつ", desc: "においの みちに 6ぴき いじょう ならんだ" },
    { id: "born", emoji: "🐣", name: "なかまが うまれた", desc: "まゆから はたらきありが でてきた" },
    { id: "rooms3", emoji: "🏠", name: "へやが 3つ", desc: "へやが 3つ できた" },
    { id: "roomsAll", emoji: "🏯", name: "へやが ぜんぶ", desc: "9つの へやが ぜんぶ できた" },
    { id: "ants30", emoji: "👨‍👩‍👧", name: "なかま 30ぴき", desc: "はたらきありが 30ぴきに なった" },
    { id: "ants100", emoji: "🎉", name: "なかま 100ぴき", desc: "はたらきありが 100ぴきに なった" },
    { id: "ants300", emoji: "👑", name: "なかま 300ぴき", desc: "おおきな すに なった" },
    { id: "foods3", emoji: "🍽️", name: "3しゅるいの えさ", desc: "さとう・パンくず・むし を ぜんぶ はこんだ" },
    { id: "rain", emoji: "☔", name: "あめを のりきった", desc: "ふさいだ いりぐちを また あけた" },
    { id: "avoid", emoji: "🕷️", name: "てきを よけた", desc: "クモや アリジゴクを よけて とおった" },
    { id: "winter", emoji: "⛄", name: "ふゆごし", desc: "ふゆを こして はるに なった" },
    { id: "flight", emoji: "🪽", name: "けっこんひこう", desc: "はねの ある オスと じょおうが とびたった" },
    { id: "loupe", emoji: "🔍", name: "むしめがね", desc: "むしめがねで からだの つくりを みた" },
  ];

  ARI.KIND_INFO = {
    worker: { title: "はたらきあり", text: "はたらきありは みんな メス。はねは ない。ほる・はこぶ・せわを する のは ぜんぶ メスの しごと。" },
    queen: { title: "じょおうあり", text: "すの なかで ただ 1ぴき たまごを うむ メス。けっこんひこうの あと じぶんで はねを おとした。なんねんも いきる（10ねん いじょう いきる ことも）。" },
    male: { title: "オス", text: "はねが ある。けっこんひこうの ころ だけ うまれて、すの しごとは しない。" },
    gyne: { title: "あたらしい じょおう", text: "はねの ある メス。けっこんひこうで とびたって、あたらしい すを はじめる。" },
  };
})();
