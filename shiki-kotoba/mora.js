"use strict";

/* はいくの 音（拍・モーラ）を かぞえる。
 *
 *   ちいさい ゃゅょ・ぁぃぅぇぉ・ゎ … まえの 字と あわせて 1つ（きゃ = 1）
 *   ちいさい っ（つまる音）          … 1つ（きって = き・っ・て = 3）
 *   のばす ー                        … 1つ（らーめん = ら・ー・め・ん = 4）
 *   ん                               … 1つ
 *   カタカナ は ひらがな と おなじ。くうはく・てん・まる などは かぞえない。
 */
const Mora = (() => {
  const SMALL = 'ゃゅょぁぃぅぇぉゎ';      // まえの 字に くっつく ちいさい 字

  function toHira(s) {
    return String(s).replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  }
  function isKana(c) { return (c >= 'ぁ' && c <= 'ゖ') || c === 'ー'; }

  /* 音 ごと に わけた 配列。「ちょっと」→ ['ちょ', 'っ', 'と'] */
  function split(s) {
    const out = [];
    for (const c of toHira(s)) {
      if (!isKana(c)) continue;
      if (SMALL.includes(c) && out.length) out[out.length - 1] += c;
      else out.push(c);
    }
    return out;
  }
  function count(s) { return split(s).length; }

  return { split, count, toHira };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Mora;
