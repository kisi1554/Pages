'use strict';

/*
 * つくぼうの ことば じてん(しくみ)
 *  TsukuDict.add(カテゴリ, ラベル, [[よみ, かんじ/カタカナ, とくちょう], ...])
 *   - よみ     : ひらがな(のばす おとは ー で かく。マッチの ときは ー を けす)
 *   - かんじ   : かんじなら「かんじ→よみ」の よみかえに つかう。カタカナなら ひょうじに つかう。'' でも よい
 *   - とくちょう: 「〜もの なーんだ？」「〜んだよね」に つながる ように、
 *                 どうし・けいようしの おわりかた(〜る/〜い/〜ない/〜た)で かく
 *  ことばは かいわ・なーんだクイズ・しりとり・ききかえしの こたえ に つかわれる
 *  opts.sentence = true の カテゴリは、とくちょうの かわりに つくぼうの ひとこと(そのまま しゃべる)を かく
 *  (うごき・きもち など。なーんだクイズには つかわない)
 */

const TsukuDict = (function () {
  const cats = {};
  const words = [];
  return {
    cats,
    words,
    add(cat, label, list, opts) {
      const o = opts || {};
      cats[cat] = cats[cat] || { label, sentence: !!o.sentence, count: 0 };
      list.forEach(([kana, alt, trait]) => {
        const isKata = alt && /^[゠-ヿー・]+$/.test(alt);
        words.push({
          cat,
          kana,
          kanji: alt && !isKata ? alt : '',
          show: isKata ? alt : kana,
          trait,
          sentence: cats[cat].sentence,
        });
        cats[cat].count++;
      });
    },
  };
})();
