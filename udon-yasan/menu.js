'use strict';

/*
 * メニュー・ねだん・てじゅん・おきゃくさん・まめちしき（ここを なおせば メニューを かえられる）
 *  - 表示する 文の 漢字は ぜんぶ [漢字|かんじ] の ふりがな つきで かく（test.js が しらべる）
 *  - ねだんは ぜんぶ 10えん たんい
 *  - おみせは オリジナルの「てうち うどん こむぎや」。実在の お店の 名前・メニュー名は つかわない
 */
const Menu = (() => {
  const SHOP = 'てうち うどん こむぎや';

  /* てじゅん（RECIPE）の ことば */
  const STEP = {
    boil: 'ゆでる',
    drain: 'ゆきり',
    chill: 'ひやす',
    bowl: 'うつわに もる',
    hotSoup: 'あったかい つゆ',
    coldSoup: 'つめたい つゆ',
    hotWater: 'ゆでじる（おゆ）',
    dipSoup: 'つけつゆ',
    topping: 'トッピング',
  };

  /*
   * うどん 4しゅ。recipe は じゅんばん どおりの てじゅん。
   * day: その ひ から メニューに でる（えいぎょう モード）
   */
  const KINDS = {
    kake: {
      name: 'かけうどん', price: { nami: 300, dai: 400 }, day: 1, vessel: 'bowl',
      soup: 'あったかい つゆ', recipe: ['boil', 'drain', 'bowl', 'hotSoup', 'topping'],
      tip: 'あったかい つゆを たっぷり かける。いちばん きほんの うどん。',
    },
    kamaage: {
      name: 'かまあげうどん', price: { nami: 300, dai: 400 }, day: 1, vessel: 'oke',
      soup: 'ゆでじる＋つけつゆ', recipe: ['boil', 'bowl', 'hotWater', 'dipSoup', 'topping'],
      tip: 'ゆきり しないで、ゆでた おゆごと だす。つけつゆに つけて たべるよ。',
    },
    bukkake: {
      name: 'ぶっかけうどん', price: { nami: 350, dai: 450 }, day: 2, vessel: 'bowl',
      soup: 'つめたい つゆ（すこし）', recipe: ['boil', 'drain', 'bowl', 'coldSoup', 'topping'],
      tip: 'こい つゆを すこしだけ ぶっかける。',
    },
    zaru: {
      name: 'ざるうどん', price: { nami: 350, dai: 450 }, day: 3, vessel: 'zaru',
      soup: 'つけつゆ（べつの うつわ）', recipe: ['boil', 'drain', 'chill', 'bowl', 'dipSoup', 'topping'],
      tip: 'つめたい みずで 2かい ひやして、ざるに もる。つゆは べつの うつわ。',
    },
  };
  const KIND_ORDER = ['kake', 'kamaage', 'bukkake', 'zaru'];
  const SIZE = { nami: 'なみ', dai: 'だい' };
  const BALLS = { nami: 1, dai: 2 };

  /* てんぷら（たなから おきゃくさんが じぶんで とる）と おにぎり */
  const SIDES = {
    ebi: { name: 'えびてん', price: 150, day: 1, fry: true },
    chikuwa: { name: 'ちくわてん', price: 100, day: 1, fry: true },
    imo: { name: 'いもてん', price: 100, day: 2, fry: true },
    kashiwa: { name: 'かしわてん', price: 150, day: 3, fry: true },
    kakiage: { name: 'かきあげ', price: 200, day: 3, fry: true },
    onigiri: { name: 'おにぎり', price: 100, day: 2, fry: false },
  };
  const SIDE_ORDER = ['ebi', 'chikuwa', 'imo', 'kashiwa', 'kakiage', 'onigiri'];

  /* トッピング（むりょう。じぶんで のせる） */
  const TOPPINGS = {
    negi: { name: 'ねぎ' },
    tenkasu: { name: 'てんかす' },
    shoga: { name: 'しょうが' },
  };
  const TOPPING_ORDER = ['negi', 'tenkasu', 'shoga'];

  /* おつりに つかう おかね */
  const COINS = [500, 100, 50, 10];

  /*
   * おきゃくさん（オリジナル キャラ）
   *  likes: すきな うどん（ひらいて いない ものは つかわない）
   *  size: 'nami' | 'dai' | null（null は ランダム）
   *  sides: すきな てんぷら など。pair: 2人 いっしょ（おやこ）
   *  patience: まてる じかん の ばいりつ（1 が ふつう）
   */
  const CUSTOMERS = {
    koji: {
      name: 'こうじげんばの おじさん', day: 1, likes: ['kake', 'bukkake'], size: 'dai', sides: ['kakiage', 'ebi'], nSides: 1,
      toppings: ['negi', 'tenkasu'], patience: 1, hello: 'はらぺこ だあ！ おおもりで たのむよ！', thanks: 'うまかった！ ごちそうさん！',
    },
    obaachan: {
      name: 'おばあちゃん', day: 1, likes: ['kamaage'], size: 'nami', sides: ['imo', 'chikuwa'], nSides: 1,
      toppings: ['negi', 'shoga'], patience: 1.4, hello: 'こんにちは。ゆっくりで いいからね。', thanks: 'ありがとう。おいしかったよ。',
    },
    oyako: {
      name: 'おやこ', day: 1, pair: true, likes: ['kake', 'kamaage', 'bukkake'], size: 'nami', sides: ['onigiri', 'chikuwa'], nSides: 1,
      toppings: ['negi'], patience: 1.2, hello: 'なみを ふたつ ください！', thanks: 'ごちそうさまでした！',
    },
    salary: {
      name: 'さらりーまん', day: 1, likes: ['kake', 'bukkake', 'zaru'], size: 'nami', sides: ['ebi'], nSides: 1,
      toppings: ['negi'], patience: 0.7, hello: 'いそいでるんだ。はやめに たのむよ！', thanks: 'はやくて たすかった！',
    },
    tourist: {
      name: 'がいこくの かんこうきゃく', day: 2, likes: ['zaru', 'kake', 'bukkake', 'kamaage'], size: null, sides: ['ebi', 'kashiwa'], nSides: 1,
      toppings: ['negi', 'tenkasu'], patience: 1.2, hello: 'Hello!', thanks: 'Thank you!', en: true, picturesOnly: true,
    },
    oneesan: {
      name: 'おねえさん', day: 1, likes: ['bukkake', 'zaru', 'kake'], size: 'nami', sides: ['imo', 'kashiwa', 'chikuwa'], nSides: 2,
      toppings: ['negi', 'shoga'], patience: 1, hello: 'こんにちは！ ちゅうもん いいですか？', thanks: 'おいしかった！ また きます！',
    },
    gakusei: {
      name: 'ぶかつ がえりの おにいさん', day: 2, likes: ['kake', 'bukkake', 'zaru'], size: 'dai', sides: ['kashiwa', 'onigiri', 'ebi'], nSides: 2,
      toppings: ['tenkasu', 'negi'], patience: 1, hello: 'おなか ぺこぺこ！ だいで！', thanks: 'ごちそうさまでした！',
    },
  };
  const CUSTOMER_ORDER = ['koji', 'obaachan', 'oyako', 'salary', 'oneesan', 'tourist', 'gakusei'];

  /* ステーション（ばしょ） */
  const STATIONS = [
    { id: 'counter', icon: '🗣', name: 'ちゅうもん' },
    { id: 'yude', icon: '♨️', name: 'ゆでる' },
    { id: 'mori', icon: '🍲', name: 'もりつけ' },
    { id: 'tenpura', icon: '🍤', name: 'てんぷら' },
    { id: 'reji', icon: '💴', name: 'おかいけい' },
  ];

  /* むずかしさ */
  const DIFF = {
    easy: { name: 'やさしい', boilSec: 7, boilWin: [0.45, 0.85], fryWin: [0.5, 0.85], fourSec: 5, queue: 1, together: 1, change: false, patience: 0, glow: true, stock: 2, autoRestock: 12, nSidesMax: 1 },
    normal: { name: 'ふつう', boilSec: 6, boilWin: [0.55, 0.8], fryWin: [0.55, 0.8], fourSec: 5, queue: 3, together: 1, change: true, patience: 75, glow: false, stock: 2, autoRestock: 18, nSidesMax: 2 },
    tencho: { name: 'てんちょう', boilSec: 5, boilWin: [0.6, 0.78], fryWin: [0.58, 0.78], fourSec: 4, queue: 3, together: 2, change: true, patience: 60, glow: false, stock: 1, autoRestock: 0, nSidesMax: 2 },
  };

  /* やさしく いう ことば（まちがえても おこらない） */
  const SAY = {
    hello: 'いらっしゃいませ！',
    thanks: 'ありがとうございました！',
    open: 'かいてん です！ きょうも がんばろう！',
    hot: 'あついから きを つけてね。',
    boilOk: 'ちょうど いい ゆでかげん！',
    boilHard: 'ちょっと かためかな。',
    boilSoft: 'ちょっと やわらかめかな。',
    soupOk: 'ちょうどの せん！',
    soupFew: 'つゆが すこし すくないかな。',
    soupMany: 'つゆが ちょっと おおいかな。',
    fryGood: 'きつねいろ！ おいしそう！',
    fryWhite: 'まだ ちょっと しろいかな。',
    fryBurnt: 'あらら、こげちゃった。もう いちど あげよう。',
    sumOk: 'ごうけいが でたよ！',
    changeOk: 'おつり ぴったり！',
    restock: 'なかまの てんいんさんが あげて くれたよ。',
    redo: 'だいじょうぶ、もう いちど つくろう！',
    cat: 'ゴロゴロ…',
    tencho5: '[店長|てんちょう]「てぎわが よく なったね！ たよりに してるよ！」',
    tencho10: '[店長|てんちょう]「もう りっぱな うどん[職人|しょくにん]だ！ ありがとう！」',
  };

  /* まめちしき（ほんものの うどんやさんでは…） */
  const ZUKAN = [
    { id: 'menuchi', icon: '🥣', title: 'めんうち', text: 'こむぎこに しおみずを まぜて こねるよ。[足|あし]で ふむと「こし」が でて、もちもちに なるんだ。' },
    { id: 'counter', icon: '🗣', title: 'ちゅうもん', text: 'セルフの おみせでは、さいしょに カウンターで うどんの しゅるいと おおきさを いうよ。' },
    { id: 'yude', icon: '♨️', title: 'ゆでる', text: 'うちたての なまの めんは、[大|おお]きな かまで 10[分|ぷん]いじょう ゆでる ことも あるよ。' },
    { id: 'tebo', icon: '🧺', title: 'てぼ', text: 'めんを すくう あなあきの かごを「てぼ」と いうよ。ふって おゆを きるのが「ゆきり」。' },
    { id: 'zaru', icon: '🧊', title: 'ひやす', text: 'ゆでた めんを つめたい みずで しめると、こしが つよく なるよ。' },
    { id: 'mori', icon: '🍲', title: 'もりつけ', text: 'ねぎ・しょうが・てんかすは、じぶんで すきなだけ のせる おみせが おおいよ。' },
    { id: 'tenpura', icon: '🍤', title: 'てんぷら', text: 'あぶらは だいたい 170〜180ど。きつねいろに なったら ひきあげるよ。' },
    { id: 'reji', icon: '💴', title: 'おかいけい', text: 'トレーに とった ものを さいごに まとめて はらうのが セルフうどんの ながれ。' },
    { id: 'sanuki', icon: '🗾', title: 'さぬきうどん', text: '[香川県|かがわけん]は「うどん[県|けん]」と よばれるほど、うどんが [有名|ゆうめい]だよ。' },
  ];

  /* ふつうの えいぎょうで その ひの おきゃくさんの かず */
  function customersFor(day) {
    return Math.min(10, 4 + Math.ceil(day / 2));
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* [漢字|かんじ] → <ruby>漢字<rt>かんじ</rt></ruby> */
  const ruby = (s) => esc(s).replace(/\[([^|\]]+)\|([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');
  /* よみあげ用（ふりがなの よみ だけ のこす） */
  const plain = (s) => String(s).replace(/\[([^|\]]+)\|([^\]]+)\]/g, '$2');

  return {
    SHOP, STEP, KINDS, KIND_ORDER, SIZE, BALLS, SIDES, SIDE_ORDER, TOPPINGS, TOPPING_ORDER, COINS,
    CUSTOMERS, CUSTOMER_ORDER, STATIONS, DIFF, SAY, ZUKAN, customersFor, ruby, plain, esc,
  };
})();
if (typeof module !== 'undefined') module.exports = Menu;
