/* つくぼうの せみ がっしょう ｜ なつやすみ の ステージ と れんさ れんしゅう の もんだい
 *  goal.type: clear（セミを n ひき）/ chain（n れんさ いじょうを times かい）/ kind（id の セミを n ひき）
 *             garbage（ぬけがらを n こ）/ score / gassho（だいがっしょう n かい）
 *  rows: はじめから おいてある ならび（うえ→した。T M A K H=かなかな G=ぬけがら .=から）
 */
(function (root) {
  "use strict";

  const STAGES = [
    { day: "7がつ20にち", title: "なつやすみの はじまり", goal: { type: "clear", n: 12 }, from: 1,
      say: "なつやすみだ！ いっしょに うたおうね。つくつく ぼーし！" },
    { day: "7がつ25にち", title: "はじめての がっしょう", goal: { type: "chain", n: 2, times: 1 }, from: 2,
      say: "みーん！ ふたりで うたうと こえが おおきく なるね！" },
    { day: "7がつ30にち", title: "あぶらの おやつ", goal: { type: "kind", id: 3, n: 16 }, from: 3,
      say: "じりじり… おなか いっぱい うたったら ねむく なっちゃった" },
    { day: "8がつ4か", title: "ぬけがら そうじ", goal: { type: "garbage", n: 8 }, from: 1,
      rows: ["G.G..G", "GG.GGG"],
      say: "ぬけがらは ぼくたちが おとなに なった しるし なんだよ" },
    { day: "8がつ8か", title: "つくぼうの ソロ", goal: { type: "kind", id: 1, n: 20 }, from: 1,
      say: "つくつく ぼーし… じーっ！ きまった！" },
    { day: "8がつ12にち", title: "がっしょう れんしゅう", goal: { type: "chain", n: 2, times: 3 }, from: 4,
      say: "しゃんしゃん！ ちからいっぱい うたったよ！" },
    { day: "8がつ16にち", title: "おまつりの よる まえ", goal: { type: "score", n: 2500 }, from: 2,
      say: "とくてんも こえも おおきく なってきたね！" },
    { day: "8がつ20にち", title: "ゆうがたの おきゃくさん", goal: { type: "kind", id: 5, n: 8 }, from: 5,
      dayLen: 30,
      say: "かなかなかな… ゆうがたに なると わたしの ばん なの" },
    { day: "8がつ25にち", title: "さんにんで がっしょう", goal: { type: "chain", n: 3, times: 1 }, from: 1,
      rows: ["T.....", "M.....", "MTA...", "MAAT.."],
      say: "みんなの こえが かさなると、きが ゆれるくらい だね！" },
    { day: "8がつ31にち", title: "なつの おわりの だいがっしょう", goal: { type: "gassho", n: 1 }, from: 1,
      say: "なつやすみ ありがとう！ らいねんも いっしょに うたおうね。つくつく ぼーし！" },
  ];

  // れんさ れんしゅう: pair=[じく, こども]（じくが した）。answer: { x, rot }（rot 0=こどもが うえ）
  const PRACTICE = [
    { rows: ["T.....", "A.....", "A.....", "ATTT.."], pair: [3, 2], target: 2, answer: { x: 1, rot: 0 },
      tip: "あぶらを 4ひきに すると、うえの つくぼうが おちるよ" },
    { rows: ["...M..", "...AA.", "MMMAT."], pair: [3, 1], target: 2, answer: { x: 4, rot: 0 },
      tip: "あぶらの うえに あぶらを のせよう" },
    { rows: [".....K", ".....M", ".....M", "..KKKM"], pair: [2, 3], target: 2, answer: { x: 4, rot: 0 },
      tip: "みんみんを 4ひきに すると、くまっちが したへ" },
    { rows: [".A....", ".T....", "AT....", "AATT.."], pair: [1, 2], target: 2, answer: { x: 2, rot: 0 },
      tip: "つくぼうを つなげると、あぶらが おちて くるよ" },
    { rows: ["M.....", "T.....", "T.....", "TG....", "MMM..."], pair: [1, 3], target: 2, answer: { x: 1, rot: 0 },
      tip: "ぬけがらの うえに つくぼう。ぬけがらも いっしょに きえるよ" },
    { rows: ["..K...", "..A...", "..A...", "..AG..", "KKKGM."], pair: [3, 1], target: 2, answer: { x: 3, rot: 0 },
      tip: "ぬけがらの うえに あぶら。くまっちが おちて 4ひきに" },
    { rows: ["M.....", "A.....", "T.....", "TAM...", "TAAM.."], pair: [1, 2], target: 3, answer: { x: 1, rot: 0 },
      tip: "つくぼう → あぶら → みんみん の じゅんに きえるよ" },
    { rows: [".....T", ".....M", ".....A", "...TMA", "..TMMA"], pair: [3, 1], target: 3, answer: { x: 4, rot: 0 },
      tip: "あぶら → みんみん → つくぼう の じゅんばん" },
    { rows: ["M.....", "K.....", "T.MM..", "TTKKMM"], pair: [1, 4], target: 3, answer: { x: 1, rot: 0 },
      tip: "した が つくぼう、うえが くまっち で たてに おこう" },
    { rows: [".....A", ".....M", "..AA.H", "AAMMHH"], pair: [5, 2], target: 3, answer: { x: 4, rot: 0 },
      tip: "かなかなを したに して たてに おこう" },
  ];

  const api = { STAGES, PRACTICE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TG = root.TG || {};
  root.TG.Stages = api;
})(typeof window !== "undefined" ? window : globalThis);
