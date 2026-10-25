/* ============================================================
   まちづくり — どうぐ と しせつ の データ
   ・ふりがなは {漢字|よみ} と かく（app.js の rb() で <ruby> に なる）。
   ・kigou は ちず モードで つかう ちずきごう（kigou.js の id）。
   ============================================================ */
(function (root) {
  "use strict";

  // obj: まちの マスに おく もの（city.js の obj に はいる ばんごう）
  var OBJ = [
    null,
    { id: "house", name: "いえ", emoji: "🏠", pop: 4, h: 14,
      what: "{人|ひと}が すんで、ねたり ごはんを たべたり する ところ。",
      who: "かぞく みんなで くらして いるよ。" },
    { id: "mansion", name: "マンション", emoji: "🏢", pop: 12, h: 34,
      what: "たくさんの かぞくが いっしょに すむ、たかい たてもの。",
      who: "{管理人|かんりにん}さんが たてものを きれいに して くれるよ。" },
    { id: "park", name: "こうえん", emoji: "🌳", h: 0, kigou: "broad",
      what: "あそんだり、やすんだり する ところ。きが いっぱいで いきが すいやすい。",
      who: "こうえんを そうじ したり、きを せわ したり する {人|ひと}。" },
    { id: "school", name: "がっこう", emoji: "🏫", h: 22, kigou: "school",
      what: "こどもが べんきょう したり、ともだちと あそんだり する ところ。",
      who: "{先生|せんせい}。こどもたちに いろんな ことを おしえて くれるよ。" },
    { id: "hospital", name: "びょういん", emoji: "🏥", h: 26, kigou: "hospital",
      what: "びょうきや けがを なおして もらう ところ。",
      who: "お{医者|いしゃ}さん と {看護師|かんごし}さん。" },
    { id: "fire", name: "しょうぼうしょ", emoji: "🚒", h: 20, kigou: "fire",
      what: "かじを けしたり、きゅうきゅうしゃで びょうにんを びょういんへ はこんだり する ところ。",
      who: "しょうぼうしさん と きゅうきゅうたいいんさん。よるも ねないで まって いるよ。" },
    { id: "police", name: "けいさつしょ", emoji: "🚓", h: 22, kigou: "police",
      what: "まちの あんぜんを まもる ところ。じこや どろぼうの ときに たすけて くれる。",
      who: "けいさつかん。パトカーで まちを みまわって いるよ。" },
    { id: "koban", name: "こうばん", emoji: "👮", h: 12, kigou: "koban",
      what: "まちの あちこちに ある ちいさな けいさつ。みちあんないや おとしものも。",
      who: "おまわりさん。こまったら こえを かけてね。" },
    { id: "post", name: "ゆうびんきょく", emoji: "📮", h: 16, kigou: "post",
      what: "てがみや にもつを うけとって、まちじゅうに とどける ところ。",
      who: "ゆうびんやさん。バイクで いえを まわって いるよ。" },
    { id: "library", name: "としょかん", emoji: "📚", h: 18, kigou: "library",
      what: "ほんを よんだり、かりたり できる ところ。",
      who: "{司書|ししょ}さん。よみたい ほんを いっしょに さがして くれるよ。" },
    { id: "super", name: "スーパー", emoji: "🛒", h: 16,
      what: "やさいや おにく、いろいろな ものを かう ところ。",
      who: "てんいんさん。しなものを ならべたり、レジを したり するよ。" },
    { id: "bakery", name: "パンや", emoji: "🥐", h: 13,
      what: "あさ はやくから パンを やいて うる ところ。",
      who: "パン{職人|しょくにん}さん。こむぎこを こねて パンを やくよ。" },
    { id: "factory", name: "こうじょう", emoji: "🏭", h: 22, kigou: "factory",
      what: "きかいを つかって、ものを つくる ところ。",
      who: "こうじょうで はたらく {人|ひと}。まちの {人|ひと}も ここで はたらくよ。" },
    { id: "field", name: "はたけ", emoji: "🥬", h: 0, kigou: "field",
      what: "やさいを そだてる ところ。",
      who: "のうかさん。たねを まいて、みずを やって そだてるよ。" },
    { id: "tree", name: "き", emoji: "🌲", h: 0, kigou: "broad",
      what: "きは いきを きれいに して、なつは かげを つくって くれる。",
      who: "とりや むしの おうちにも なるよ。" },
    { id: "station", name: "えき", emoji: "🚉", h: 10, kigou: "station",
      what: "でんしゃに のったり おりたり する ところ。",
      who: "えきいんさん と うんてんしさん。" }
  ];
  var OBJ_ID = {};
  OBJ.forEach(function (o, i) { if (o) { o.n = i; OBJ_ID[o.id] = i; } });

  // パレット（した の どうぐ）
  var TOOLS = [
    { id: "look", name: "みる", emoji: "👆" },
    { id: "road", name: "みち", emoji: "🛣️" },
    { id: "rail", name: "せんろ", emoji: "🛤️" },
    { id: "station", name: "えき", emoji: "🚉", obj: "station" },
    { id: "house", name: "いえ", emoji: "🏠", obj: "house" },
    { id: "mansion", name: "マンション", emoji: "🏢", obj: "mansion" },
    { id: "park", name: "こうえん", emoji: "🌳", obj: "park" },
    { id: "school", name: "がっこう", emoji: "🏫", obj: "school" },
    { id: "hospital", name: "びょういん", emoji: "🏥", obj: "hospital" },
    { id: "fire", name: "しょうぼうしょ", emoji: "🚒", obj: "fire" },
    { id: "police", name: "けいさつしょ", emoji: "🚓", obj: "police" },
    { id: "koban", name: "こうばん", emoji: "👮", obj: "koban" },
    { id: "post", name: "ゆうびんきょく", emoji: "📮", obj: "post" },
    { id: "library", name: "としょかん", emoji: "📚", obj: "library" },
    { id: "super", name: "スーパー", emoji: "🛒", obj: "super" },
    { id: "bakery", name: "パンや", emoji: "🥐", obj: "bakery" },
    { id: "factory", name: "こうじょう", emoji: "🏭", obj: "factory" },
    { id: "field", name: "はたけ", emoji: "🥬", obj: "field" },
    { id: "river", name: "かわ・はし", emoji: "🌊" },
    { id: "tree", name: "き", emoji: "🌲", obj: "tree" },
    { id: "erase", name: "けす", emoji: "🧽" }
  ];

  // みち・せんろ・かわ の せつめい（みる で タップ したとき）
  var GROUND_INFO = {
    road: { name: "みち", emoji: "🛣️", what: "{人|ひと}が あるいたり、くるまが はしったり する ところ。つながって いないと いけない ところが あるよ。", who: "みちを なおす {人|ひと}。" },
    rail: { name: "せんろ", emoji: "🛤️", what: "でんしゃが はしる みち。えきが ないと でんしゃは とまれないよ。", who: "せんろを みまわる {人|ひと}。" },
    crossing: { name: "ふみきり", emoji: "🚧", what: "みち と せんろが まじわる ところ。でんしゃが くると しまって カンカン なるよ。", who: "でんしゃが くる ときは かならず とまってね。" },
    bridge: { name: "はし", emoji: "🌉", what: "かわの うえを わたる みち。かわに みちを ひくと はしに なるよ。", who: "はしを しらべて なおす {人|ひと}。" },
    rbridge: { name: "てっきょう", emoji: "🌉", what: "かわの うえを でんしゃが わたる はし。", who: "" },
    river: { name: "かわ", emoji: "🌊", what: "みずが ながれる ところ。みちや せんろを ひくと はしに なるよ。", who: "さかなや とりが すんで いるよ。" },
    grass: { name: "くさはら", emoji: "🌱", what: "まだ なにも ない ところ。したの どうぐで なにか おいてみよう。", who: "" }
  };

  // じゅうみんの ねがい（にこにこ の もと）
  //   types: どれか が r マス いない（ななめ は たて＋よこ）に あれば ○
  var NEEDS = [
    { key: "school", types: ["school"], r: 8, w: 2, none: "がっこう が ほしいな", far: "がっこう が とおくて たいへん", good: "がっこう が ちかくて うれしい！" },
    { key: "hospital", types: ["hospital"], r: 9, w: 2, none: "びょういん が なくて こまる", far: "びょういん が とおくて こまる", good: "びょういん が ちかいと あんしん" },
    { key: "shop", types: ["super", "bakery"], r: 6, w: 2, none: "おみせ が ほしいな", far: "かいもの に いくのが とおい…", good: "パンや さん の いい におい！" },
    { key: "park", types: ["park"], r: 5, w: 1.5, none: "こうえん が ほしい", far: "こうえん が ちかく に ほしい", good: "こうえん で あそぼう！" },
    { key: "station", types: ["station"], r: 10, w: 1.5, none: "でんしゃ に のりたいな", far: "えき が とおいなあ", good: "えき が ちかくて べんり！" },
    { key: "fire", types: ["fire"], r: 10, w: 1, none: "しょうぼうしょ が あると あんしん", far: "しょうぼうしょ が とおくて しんぱい", good: "しょうぼうしょ が ちかくて あんしん" },
    { key: "police", types: ["police", "koban"], r: 8, w: 1, none: "こうばん が あると あんしん", far: "こうばん が ちかく に ほしいな", good: "おまわりさん が いて あんしん" },
    { key: "post", types: ["post"], r: 10, w: 0.7, none: "てがみ を だしたいな", far: "ゆうびんきょく が とおい", good: "てがみ が とどいた！" },
    { key: "library", types: ["library"], r: 10, w: 0.7, none: "ほん を よみたいな", far: "としょかん が とおい", good: "としょかん で ほん を かりたよ" }
  ];

  var API = { OBJ: OBJ, OBJ_ID: OBJ_ID, TOOLS: TOOLS, GROUND_INFO: GROUND_INFO, NEEDS: NEEDS };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.MACHI_DATA = API;
})(this);
