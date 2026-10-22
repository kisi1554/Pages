// はいくの 音（拍・モーラ）を かぞえる。
//   ・ちいさい「ゃゅょぁぃぅぇぉゎ」は まえの 字と あわせて 1つ（「ちょ」で 1）
//   ・ちいさい「っ」、のばす「ー」、「ん」は それぞれ 1つ
//   ・くうはく や 「、。・！？」 は かぞえない
(function (root) {
  var SMALL = "ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ";
  var SKIP = /[\s、。，．・･！？!?「」『』（）()〜～…]/;

  // "ちょっと" → ["ちょ", "っ", "と"]
  function split(text) {
    var out = [];
    for (var i = 0; i < (text || "").length; i++) {
      var c = text[i];
      if (SKIP.test(c)) continue;
      if (SMALL.indexOf(c) >= 0 && out.length) out[out.length - 1] += c;
      else out.push(c);
    }
    return out;
  }
  function count(text) { return split(text).length; }

  var api = { split: split, count: count };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SK_MORA = api;
})(this);
