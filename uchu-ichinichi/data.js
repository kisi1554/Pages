/* うちゅう ステーション の いちにち — へや・ミッション・まめちしき カード
 * じじつ は JAXA・NASA の しりょう で たしかめた もの（README の「しらべた こと」）。
 * ステーション の かたち と キャラ は オリジナル。 */
(function (root) {
  "use strict";

  const ROOM_W = 400, ROOM_H = 300;

  const ROOMS = [
    { id: "neru", name: "ねむる へや", emoji: "😴", wall: "#dbe4ff" },
    { id: "kitchen", name: "キッチン", emoji: "🍙", wall: "#fff3bf" },
    { id: "lab", name: "じっけん しつ", emoji: "🧪", wall: "#d3f9d8" },
    { id: "gym", name: "うんどう の へや", emoji: "🏃", wall: "#ffe3e3" },
    { id: "mado", name: "まど の へや", emoji: "🪟", wall: "#e5dbff" },
  ];

  /* time: 1にち の どこ か。room: どの へや で やる か（null は どこ でも） */
  const MISSIONS = [
    { id: "asa", time: "あさ", emoji: "⏰", name: "おきる・はみがき", room: 0,
      hint: "ねむる へや で ねぶくろ を あけよう" },
    { id: "gohan", time: "あさごはん", emoji: "🥄", name: "ふくろ の ごはん", room: 1,
      hint: "キッチン で おゆ を いれよう" },
    { id: "jikken", time: "しごと", emoji: "🧪", name: "じっけん", room: 2,
      hint: "じっけん しつ で みず の たま を つくろう" },
    { id: "idou", time: "いどう", emoji: "🧗", name: "へや を ぜんぶ まわる", room: null,
      hint: "かべ を けって（スワイプ）5つ の へや を まわって、さいご に てすり に つかまろう" },
    { id: "undou", time: "うんどう", emoji: "🏃", name: "ランニング", room: 3,
      hint: "うんどう の へや で はしろう" },
    { id: "mado", time: "まど", emoji: "🌏", name: "ちきゅう を みる", room: 4,
      hint: "まど の へや で ひので と にほん を みつけよう" },
    { id: "yoru", time: "よる", emoji: "🌙", name: "ねぶくろ で ねる", room: 0,
      hint: "ぜんぶ おわったら ねむる へや で ねよう" },
  ];

  const CARDS = [
    { id: "hinode", emoji: "🌅", title: "ひので は 1にち 16かい",
      text: "ステーション は やく 90ぷん で ちきゅう を 1しゅう。だから ひる と よる が やく 45ふん ごと に かわって、1にち に ひので を やく 16かい みる。" },
    { id: "hayasa", emoji: "🚀", title: "1びょう で やく 8キロ",
      text: "ステーション は 1びょう で やく 8キロメートル すすむ（1ぷん なら やく 460キロメートル！）。だから ちきゅう を すぐ 1しゅう できる。" },
    { id: "takasa", emoji: "📏", title: "たかさ は やく 400キロ",
      text: "ステーション が とんで いる の は、じめん から やく 400キロメートル の ところ。くるま で とうきょう から おおさか くらい の きょり の そら の うえ。" },
    { id: "kansei", emoji: "➡️", title: "けったら すすみ つづける",
      text: "うちゅう では、いちど うごきだす と まっすぐ すすみ つづける（かんせい）。とまる には てすり や かべ に つかまる。" },
    { id: "hamigaki", emoji: "🪥", title: "のみこめる はみがきこ",
      text: "ながしだい で みず を ながせない ので、のみこんでも だいじょうぶ な はみがきこ を つかう ひと も いる。はきだす とき は タオル や ティッシュ に。" },
    { id: "gohan", emoji: "🍛", title: "ごはん は ふくろ に はいってる",
      text: "うちゅう の ごはん は ふくろ や かん に はいって いる。かわかした もの は おゆ や みず を いれて もどして たべる。こぼれる と ういて とんで いく！" },
    { id: "mizutama", emoji: "💧", title: "みず は まるい たま に なる",
      text: "おもさ を かんじない うちゅう では、みず は じぶん の ちから（ひょうめん ちょうりょく）で まるい たま に なって うかぶ。" },
    { id: "honoo", emoji: "🔥", title: "ほのお も まるく なる",
      text: "ちきゅう では あたたまった くうき が うえ に のぼる ので ほのお は ほそながい。うちゅう では くうき が のぼらない ので、ほのお は まるく あおっぽく なる。" },
    { id: "undou", emoji: "💪", title: "うんどう は まいにち やく 2じかん",
      text: "からだ を ささえなくて いい ので、きんにく と ほね が よわく なる。だから まいにち やく 2じかん うんどう する。ランニングマシン では ゴム で からだ を おさえる。" },
    { id: "nebukuro", emoji: "🛌", title: "ねぶくろ は かべ に ゆわえる",
      text: "ねて いる あいだ に ふわふわ ただよわない ように、ねぶくろ を かべ に ゆわえて ねる。うで は ふわっと うく。うえ も した も ない ので、たった まま でも ねられる。" },
    { id: "toire", emoji: "🚽", title: "トイレ は すいこむ",
      text: "うちゅう の トイレ は、くうき の ながれ で おしっこ や うんち を すいこむ しくみ。そう しないと ふわふわ ういて しまう。" },
    { id: "mizu", emoji: "♻️", title: "あせ も おしっこ も のみみず に",
      text: "ステーション では、くうき の なか の あせ（すいじょうき）や おしっこ を きれい に して、また のみみず に もどす しくみ が ある。みず は とても たいせつ。" },
  ];

  /* ミッション を おえる と もらえる カード */
  const MISSION_CARDS = {
    asa: ["hamigaki"], gohan: ["gohan"], jikken: ["mizutama", "honoo"], idou: ["kansei"],
    undou: ["undou"], mado: ["hinode", "hayasa", "takasa"], yoru: ["nebukuro"],
  };

  const D = { ROOM_W, ROOM_H, ROOMS, MISSIONS, CARDS, MISSION_CARDS };
  if (typeof module !== "undefined" && module.exports) module.exports = D;
  else root.UData = D;
})(typeof window !== "undefined" ? window : this);
