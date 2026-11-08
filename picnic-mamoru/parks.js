/* ピクニック まもりたい — こうえん（ステージ）と ウェーブ の データ
 * ウェーブ の 1ぎょう: [いきもの, かず, でる じこく(びょう), あいだ(びょう), みち の ばんごう]
 *   いきもの: "ant" アリ / "pigeon" ハト / "crow" カラス（そら から。みち は つかわない） / "squirrel" リス
 *   みち の ばんごう は みち の かず で わった あまり を つかう。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PMParks = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SEASONS = {
    spring: { name: "はる", grass: "#a9e34b", grass2: "#94d82d", path: "#e9d8a6", path2: "#d9c48b", deco: ["sakura", "tulip", "tree", "bush"], sky: "#e7f5ff" },
    summer: { name: "なつ", grass: "#69db7c", grass2: "#51cf66", path: "#ead7b0", path2: "#d7c08f", deco: ["water", "water", "reed", "tree", "sunflower"], sky: "#d0ebff" },
    autumn: { name: "あき", grass: "#d8c86a", grass2: "#c9b456", path: "#e6cfa3", path2: "#cfb07c", deco: ["momiji", "ginkgo", "kinoko", "rock"], sky: "#fff4e6" },
    winter: { name: "ふゆ", grass: "#e9ecef", grass2: "#dee2e6", path: "#ced4da", path2: "#b8c0c8", deco: ["snowman", "pine", "pine", "rock"], sky: "#f1f3f5" },
  };

  // どうぐ が つかえる ように なる ステージ
  const STAGES = [
    { name: "さくら ひろば", season: "spring", paths: 1, len: [14, 24], coins: 40, deco: 7,
      tools: ["fan", "crumb"],
      tip: "アリ が ぎょうれつ で くるよ。みち の そば に 🪭 うちわ を おこう！",
      waves: [
        [["ant", 5, 0, 1.0, 0]],
        [["ant", 6, 0, 0.8, 0], ["ant", 5, 9, 0.8, 0]],
        [["ant", 8, 0, 0.7, 0], ["ant", 8, 9, 0.7, 0]],
      ] },
    { name: "ふんすい ひろば", season: "spring", paths: 1, len: [14, 24], coins: 45, deco: 7,
      tools: ["fan", "crumb", "umbrella"],
      tip: "ハト は ちょこちょこ あるく。☂️ かさ も きくよ。",
      waves: [
        [["ant", 6, 0, 0.8, 0], ["pigeon", 1, 6, 0, 0]],
        [["pigeon", 3, 0, 2.5, 0], ["ant", 6, 6, 0.7, 0]],
        [["ant", 8, 0, 0.6, 0], ["pigeon", 3, 4, 2.0, 0], ["ant", 6, 12, 0.6, 0]],
      ] },
    { name: "はなばたけ", season: "spring", paths: 2, len: [12, 18], coins: 50, deco: 8,
      tools: ["fan", "crumb", "umbrella", "water"],
      tip: "アリ は においの みち を たどって くる。💧 みずまき で みち を けそう！",
      waves: [
        [["ant", 8, 0, 0.6, 0], ["ant", 8, 2, 0.6, 1]],
        [["ant", 10, 0, 0.5, 0], ["pigeon", 2, 3, 2.5, 1], ["ant", 8, 8, 0.5, 1]],
        [["ant", 12, 0, 0.45, 0], ["ant", 12, 3, 0.45, 1], ["pigeon", 3, 6, 2.0, 0]],
      ] },
    { name: "おおきな いけ", season: "spring", paths: 2, len: [12, 18], coins: 55, deco: 8,
      tools: ["fan", "crumb", "umbrella", "water", "whistle"],
      tip: "カラス は そら から まっすぐ とんで くる！ シート の ちかく に ☂️ かさ を。",
      waves: [
        [["ant", 8, 0, 0.6, 0], ["crow", 1, 5, 0, 0]],
        [["pigeon", 3, 0, 2.0, 1], ["crow", 2, 4, 4.0, 0], ["ant", 8, 6, 0.5, 0]],
        [["ant", 10, 0, 0.5, 0], ["ant", 10, 2, 0.5, 1], ["crow", 3, 6, 3.0, 0], ["pigeon", 2, 8, 2.0, 1]],
      ] },
    { name: "かわら の はやし", season: "summer", paths: 2, len: [12, 18], coins: 55, deco: 9,
      tools: ["fan", "crumb", "umbrella", "water", "whistle"],
      tip: "リス は すばやい！ 🍞 パンくず で ゆうどう しよう。",
      waves: [
        [["squirrel", 2, 0, 3.0, 0], ["ant", 8, 4, 0.6, 1]],
        [["squirrel", 3, 0, 2.5, 1], ["pigeon", 3, 3, 2.0, 0], ["ant", 8, 6, 0.5, 0]],
        [["squirrel", 4, 0, 2.0, 0], ["crow", 2, 5, 4.0, 0], ["ant", 10, 3, 0.5, 1]],
      ] },
    { name: "なつ の すなはま", season: "summer", paths: 2, len: [12, 18], coins: 60, deco: 9,
      tools: ["fan", "crumb", "umbrella", "water", "whistle"],
      tip: "アリ の だいぎょうれつ！ みずまき と うちわ を くみあわせよう。",
      waves: [
        [["ant", 12, 0, 0.45, 0], ["ant", 12, 1, 0.45, 1]],
        [["pigeon", 4, 0, 1.6, 0], ["ant", 12, 3, 0.4, 1], ["crow", 2, 8, 3.0, 0]],
        [["ant", 14, 0, 0.4, 0], ["ant", 14, 2, 0.4, 1], ["squirrel", 3, 6, 2.0, 0], ["crow", 2, 10, 3.0, 0]],
      ] },
    { name: "せせらぎ キャンプ", season: "summer", paths: 2, len: [12, 18], coins: 60, deco: 9,
      tools: ["fan", "crumb", "umbrella", "water", "whistle"],
      tip: "カラス が なんわ も！ かさ を ふやそう。",
      waves: [
        [["crow", 3, 0, 3.0, 0], ["ant", 8, 2, 0.5, 0]],
        [["pigeon", 4, 0, 1.6, 1], ["crow", 3, 3, 2.5, 0], ["squirrel", 2, 6, 3.0, 0]],
        [["crow", 4, 0, 2.0, 0], ["ant", 12, 2, 0.4, 0], ["ant", 12, 4, 0.4, 1], ["pigeon", 3, 8, 1.6, 1]],
      ] },
    { name: "はなび の よる", season: "summer", paths: 3, len: [11, 15], coins: 65, deco: 9,
      tools: ["fan", "crumb", "umbrella", "water", "whistle"],
      tip: "みち が 3ぼん！ ふえ は まわり ぜんぶ に きく よ。",
      waves: [
        [["ant", 8, 0, 0.5, 0], ["ant", 8, 2, 0.5, 1], ["ant", 8, 4, 0.5, 2]],
        [["squirrel", 3, 0, 2.0, 0], ["pigeon", 3, 2, 2.0, 1], ["crow", 2, 5, 3.0, 0], ["ant", 10, 4, 0.45, 2]],
        [["ant", 12, 0, 0.4, 1], ["squirrel", 3, 2, 2.0, 2], ["crow", 3, 4, 2.5, 0], ["pigeon", 4, 6, 1.6, 0]],
      ] },
    { name: "どんぐり の もり", season: "autumn", paths: 2, len: [12, 18], coins: 65, deco: 10,
      tools: ["fan", "crumb", "umbrella", "water", "whistle"],
      tip: "あき は リス が どんぐり あつめ に おおいそがし！",
      waves: [
        [["squirrel", 4, 0, 1.8, 0], ["squirrel", 3, 3, 1.8, 1]],
        [["squirrel", 4, 0, 1.6, 1], ["ant", 10, 2, 0.45, 0], ["crow", 2, 6, 3.0, 0]],
        [["squirrel", 5, 0, 1.5, 0], ["squirrel", 5, 2, 1.5, 1], ["pigeon", 3, 5, 1.8, 0]],
      ] },
    { name: "もみじ の さか", season: "autumn", paths: 2, len: [12, 18], coins: 65, deco: 10,
      tools: ["fan", "crumb", "umbrella", "water", "whistle"],
      tip: "いろんな いきもの が いっしょ に くる。どこ に なに を おく？",
      waves: [
        [["pigeon", 4, 0, 1.6, 0], ["squirrel", 3, 2, 2.0, 1]],
        [["ant", 12, 0, 0.4, 0], ["crow", 3, 3, 2.5, 0], ["squirrel", 3, 5, 2.0, 1]],
        [["ant", 12, 0, 0.4, 1], ["pigeon", 4, 2, 1.5, 0], ["crow", 3, 5, 2.5, 0], ["squirrel", 4, 6, 1.6, 0]],
      ] },
    { name: "きのこ の こみち", season: "autumn", paths: 3, len: [11, 15], coins: 70, deco: 10,
      tools: ["fan", "crumb", "umbrella", "water", "whistle"],
      tip: "3ぼん の みち から いっせい に！",
      waves: [
        [["squirrel", 2, 0, 2.0, 0], ["squirrel", 2, 1, 2.0, 1], ["squirrel", 2, 2, 2.0, 2]],
        [["ant", 10, 0, 0.45, 0], ["ant", 10, 2, 0.45, 2], ["pigeon", 3, 4, 2.0, 1], ["crow", 2, 6, 3.0, 0]],
        [["squirrel", 3, 0, 1.8, 1], ["ant", 12, 2, 0.4, 0], ["crow", 3, 4, 2.5, 0], ["pigeon", 3, 6, 1.8, 2]],
      ] },
    { name: "やま の てんぼうだい", season: "autumn", paths: 3, len: [11, 15], coins: 75, deco: 10,
      tools: ["fan", "crumb", "umbrella", "water", "whistle"],
      tip: "あき の さいご。ぜんぶ の どうぐ を つかいこなそう！",
      waves: [
        [["ant", 12, 0, 0.4, 0], ["squirrel", 3, 2, 2.0, 1], ["pigeon", 3, 3, 2.0, 2]],
        [["crow", 4, 0, 2.0, 0], ["squirrel", 4, 3, 1.6, 2], ["ant", 12, 4, 0.4, 1]],
        [["ant", 14, 0, 0.35, 0], ["ant", 14, 1, 0.35, 2], ["squirrel", 4, 4, 1.6, 1], ["crow", 3, 6, 2.5, 0], ["pigeon", 3, 8, 1.8, 1]],
      ] },
    { name: "ゆき の こうえん", season: "winter", paths: 2, len: [12, 18], coins: 70, deco: 9,
      tools: ["fan", "crumb", "umbrella", "water", "whistle"],
      tip: "ふゆ は アリ が すあな で おやすみ。でも おなかぺこぺこ の とり が くる！",
      waves: [
        [["pigeon", 4, 0, 1.6, 0], ["crow", 2, 3, 3.0, 0]],
        [["squirrel", 3, 0, 2.0, 1], ["pigeon", 4, 2, 1.5, 0], ["crow", 3, 5, 2.5, 0]],
        [["crow", 4, 0, 2.0, 0], ["pigeon", 5, 2, 1.4, 1], ["squirrel", 4, 4, 1.6, 0]],
      ] },
    { name: "こおり の いけ", season: "winter", paths: 3, len: [11, 15], coins: 85, deco: 9,
      tools: ["fan", "crumb", "umbrella", "water", "whistle"],
      tip: "ゆき の なか で も リス は げんき！",
      waves: [
        [["squirrel", 3, 0, 2.2, 0], ["squirrel", 2, 3, 2.2, 2], ["crow", 2, 6, 3.0, 0]],
        [["pigeon", 4, 0, 1.5, 1], ["crow", 4, 2, 2.2, 0], ["squirrel", 3, 5, 1.8, 2]],
        [["crow", 4, 0, 2.0, 0], ["pigeon", 4, 2, 1.5, 0], ["pigeon", 4, 3, 1.5, 2], ["squirrel", 4, 5, 1.6, 1]],
      ] },
    { name: "ゆきだるま まつり", season: "winter", paths: 3, len: [11, 15], coins: 80, deco: 9,
      tools: ["fan", "crumb", "umbrella", "water", "whistle"],
      tip: "さいご の ピクニック！ みんな を やさしく おいかえそう。",
      waves: [
        [["pigeon", 5, 0, 1.4, 0], ["squirrel", 3, 2, 1.8, 1], ["crow", 3, 4, 2.5, 0]],
        [["squirrel", 4, 0, 1.5, 2], ["crow", 4, 2, 2.0, 0], ["pigeon", 4, 4, 1.5, 1]],
        [["crow", 6, 0, 1.6, 0], ["squirrel", 4, 2, 1.5, 0], ["pigeon", 5, 3, 1.3, 2], ["squirrel", 3, 6, 1.6, 1]],
      ] },
  ];

  return { SEASONS, STAGES };
});
