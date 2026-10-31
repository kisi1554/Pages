/* あしあと たんてい — じけん 30こ
 * level: 1 かんたん（あしあと で わかる）/ 2 ふつう / 3 むずかしい（1つ では きまらない。くみあわせ で しぼる）
 * scene: hatake / yuki / mori / niwa / kawa / yama / koen
 * suspects: ようぎしゃ（はんにん を ふくむ）。clues: その じけん で みつかる てがかり（3〜5こ）
 * すべて の じけん で「てがかり から はんにん が 1とう に きまる」ことは tests/check-cases.js で しらべる。
 */
(function (root) {
  "use strict";
  const CASES = [
    // ───── かんたん ─────
    { id: 1, level: 1, scene: "yuki", title: "ゆき の にわ に ふしぎ な あしあと",
      story: "あさ おきたら、ゆき の にわ に へんな あしあと！ ちいさい の と ながい の が ならんで いるよ。",
      culprit: "usagi", suspects: ["usagi", "neko", "kitsune"], clues: ["t_usagi", "g_hop_y", "g_hop", "d_usagi", "f_eda_naname"] },
    { id: 2, level: 1, scene: "koen", title: "すなば の まるい あしあと",
      story: "こうえん の すなば に、まるい あしあと が てんてん。だれ が あそびに きたのかな？",
      culprit: "neko", suspects: ["neko", "inu", "tanuki"], clues: ["t_neko", "g_line", "s_hei", "d_neko", "v_neko"] },
    { id: 3, level: 1, scene: "koen", title: "さんぽみち の あしあと",
      story: "こうえん の どろんこ みち に、けもの の あしあと が つづいて いる。",
      culprit: "inu", suspects: ["inu", "kitsune", "tanuki"], clues: ["t_inuka", "t_kitsune", "g_human", "v_inu"] },
    { id: 4, level: 1, scene: "yama", title: "やまみち の ハート の あしあと",
      story: "やま の みち に、ハート を さかさま に した ような あしあと が ある！",
      culprit: "shika", suspects: ["shika", "inoshishi", "inu"], clues: ["t_hizume", "t_shika", "d_shika", "v_shika", "f_eda_giza"] },
    { id: 5, level: 1, scene: "kawa", title: "いけ の ほとり の あしあと",
      story: "いけ の ほとり の どろ に、ゆび が 3ぼん の あしあと が いっぱい。",
      culprit: "kamo", suspects: ["kamo", "karasu", "neko"], clues: ["t_kamo", "g_zigzag", "v_kamo", "h_kamo"] },
    { id: 6, level: 1, scene: "yuki", title: "ゆき の もり の ちいさな あしあと",
      story: "ゆき の もり に、ちいさな あしあと が 4つ ずつ ならんで いる。",
      culprit: "risu", suspects: ["risu", "nezumi", "usagi"], clues: ["t_risu", "g_hop_side", "g_hop"] },
    { id: 7, level: 1, scene: "koen", title: "ベンチ の まわり の ほそい あしあと",
      story: "こうえん の ベンチ の まわり で、おべんとう の のこり が ちらかって いた。ほそい あしあと が ある。",
      culprit: "karasu", suspects: ["karasu", "kamo", "neko"], clues: ["t_karasu", "g_zigzag", "v_karasu", "s_karasu_su", "h_kuro"] },
    { id: 8, level: 1, scene: "hatake", title: "たんぼ の あぜ が ほりかえされた",
      story: "たんぼ の あぜ が、よる の うちに ぼこぼこ に ほりかえされて いた！",
      culprit: "inoshishi", suspects: ["inoshishi", "shika", "tanuki"], clues: ["t_inoshi", "t_hizume", "s_hori", "v_inoshi", "d_inoshi"] },
    { id: 9, level: 1, scene: "niwa", title: "へい の うえ の あかちゃん の て",
      story: "おうち の にわ の へい や じめん に、ちいさな て の ような あしあと。",
      culprit: "hakubishin", suspects: ["hakubishin", "neko", "tanuki"], clues: ["t_haku", "s_hei", "g_zigzag", "s_yaneura"] },
    { id: 10, level: 1, scene: "yuki", title: "ゆき の のはら の 1れつ の あしあと",
      story: "まっしろ な のはら に、あしあと が すーっと 1れつ に つづいて いる。",
      culprit: "kitsune", suspects: ["kitsune", "inu", "tanuki"], clues: ["t_inuka", "t_kitsune", "g_line", "v_kitsune", "d_kitsune"] },

    // ───── ふつう ─────
    { id: 11, level: 2, scene: "hatake", title: "はたけ の いちご が なくなった！",
      story: "あした つもう と おもって いた まっか な いちご が、あさ には なくなって いた！",
      culprit: "tanuki", suspects: ["tanuki", "kitsune", "hakubishin", "neko"], clues: ["t_inuka", "d_tame", "g_zigzag"] },
    { id: 12, level: 2, scene: "mori", title: "くるみ が かじられて いる",
      story: "もり の みち に、かたい くるみ の から が たくさん おちて いた。だれ が たべたの？",
      culprit: "risu", suspects: ["risu", "nezumi", "karasu"], clues: ["f_kurumi2", "f_matsu", "s_risu_su", "s_kinoue"] },
    { id: 13, level: 2, scene: "mori", title: "あな の あいた くるみ",
      story: "おちば の した から、ふしぎ な くるみ が でて きた。から に あな が あいて いる！",
      culprit: "nezumi", suspects: ["nezumi", "risu", "karasu"], clues: ["f_kurumi_ana", "t_nezumi", "s_ana_small", "d_nezumi", "v_nezumi"] },
    { id: 14, level: 2, scene: "niwa", title: "かき の み が たべられた",
      story: "にわ の かき の き。あまく なった かき が、よる の あいだ に かじられて いた。",
      culprit: "hakubishin", suspects: ["hakubishin", "karasu", "tanuki", "neko"], clues: ["d_tame", "s_hei", "h_kemono"] },
    { id: 15, level: 2, scene: "yama", title: "くさむら の ひみつ の ベッド",
      story: "やま の くさむら に、だれか が ねむって いた ような くぼみ が ある。",
      culprit: "usagi", suspects: ["usagi", "shika", "nezumi"], clues: ["s_fuse", "g_hop", "h_kemono"] },
    { id: 16, level: 2, scene: "kawa", title: "かわら の くるみ わり",
      story: "かわら の みち で、くるみ が こなごな に なって いた。そば には ふん も…。",
      culprit: "karasu", suspects: ["karasu", "kamo", "risu", "tanuki"], clues: ["d_tori", "s_kinoue", "h_hane", "f_kurumi_kona"] },
    { id: 17, level: 2, scene: "yuki", title: "ゆき の なか の まっすぐ な みち",
      story: "ゆき の つもった にわ に、まっすぐ な あしあと。へい の うえ にも つづいて いる。",
      culprit: "neko", suspects: ["neko", "kitsune", "hakubishin", "inu"], clues: ["g_line", "s_hei", "h_kemono"] },
    { id: 18, level: 2, scene: "yama", title: "どろんこ の みずたまり",
      story: "やま の なか の どろ の みずたまり。だれか が ころがって どろんこ に なった あと が ある。",
      culprit: "shika", suspects: ["shika", "inoshishi", "usagi"], clues: ["s_nuta", "s_fuse", "t_hizume", "h_kemono"] },
    { id: 19, level: 2, scene: "hatake", title: "はたけ の そば の あな",
      story: "はたけ の よこ の どて に、おおきな あな が あいて いた。なか に だれか すんで いる？",
      culprit: "kitsune", suspects: ["kitsune", "tanuki", "inu", "neko"], clues: ["s_ana_big", "g_line", "t_inuka"] },
    { id: 20, level: 2, scene: "mori", title: "まつぼっくり が エビフライ に!?",
      story: "もり に エビフライ が おちてる！？ よく みると、かじられた まつぼっくり だった。",
      culprit: "risu", suspects: ["risu", "nezumi", "hakubishin", "karasu"], clues: ["f_matsu", "s_densen", "s_kinoue"] },

    // ───── むずかしい ─────
    { id: 21, level: 3, scene: "hatake", title: "いちご どろぼう ふたたび",
      story: "また いちご が なくなった！ こんど の はんにん は、この まえ とは ちがう みたい…？",
      culprit: "hakubishin", suspects: ["hakubishin", "tanuki", "neko", "karasu"], clues: ["d_tame", "s_hei", "g_zigzag", "h_kemono"] },
    { id: 22, level: 3, scene: "yuki", title: "ゆき の よる の ほうもんしゃ",
      story: "ゆき の よる、にわ に だれか が きた。あさ、のこされた しるし を しらべよう。",
      culprit: "kitsune", suspects: ["kitsune", "inu", "neko", "tanuki"], clues: ["t_inuka", "g_line", "s_ana_big", "h_kemono"] },
    { id: 23, level: 3, scene: "mori", title: "もり の す あな の ぬし",
      story: "もり の どて に す あな を みつけた。まわり の しるし から、すんで いる どうぶつ を あてよう。",
      culprit: "kitsune", suspects: ["kitsune", "tanuki", "neko", "inu"], clues: ["t_kitsune", "s_ana_big", "g_line", "h_kemono"] },
    { id: 24, level: 3, scene: "yama", title: "やま の はたけ の あらし",
      story: "やま の ちかく の はたけ が あらされた。どろ だらけ の あと も ある。",
      culprit: "shika", suspects: ["shika", "inoshishi", "usagi", "tanuki"], clues: ["t_hizume", "s_fuse", "s_nuta", "h_kemono"] },
    { id: 25, level: 3, scene: "kawa", title: "かわら の おとしもの",
      story: "かわら に はね と ふん が おちて いた。ちかく の き には なにか ある みたい。",
      culprit: "karasu", suspects: ["karasu", "kamo", "risu", "hakubishin"], clues: ["s_kinoue", "h_hane", "g_zigzag", "d_tori"] },
    { id: 26, level: 3, scene: "niwa", title: "よる の にわ の かげ",
      story: "よる、にわ を なにか が とおった。でんせん が ゆれて いた って ほんとう？",
      culprit: "hakubishin", suspects: ["hakubishin", "risu", "neko", "tanuki"], clues: ["s_densen", "s_hei", "d_tame", "g_zigzag"] },
    { id: 27, level: 3, scene: "koen", title: "こうえん の よる の なぞ",
      story: "よる の こうえん。あさ に なったら、しげみ の まわり に いろいろ な しるし が あった。",
      culprit: "tanuki", suspects: ["tanuki", "kitsune", "inu", "hakubishin"], clues: ["t_inuka", "d_tame", "s_ana_big", "g_zigzag"] },
    { id: 28, level: 3, scene: "kawa", title: "かわら の さんぽ",
      story: "かわら の すなはま に、4ほん ゆび の あしあと。だれ の もの だろう？",
      culprit: "inu", suspects: ["inu", "kitsune", "tanuki", "neko"], clues: ["t_inuka", "t_kitsune", "g_zigzag", "h_kemono"] },
    { id: 29, level: 3, scene: "yuki", title: "ゆき の もり の たからもの",
      story: "ゆき の もり で、だれか の ごちそう の あと を みつけた。でんせん や き の うえ も みて みよう。",
      culprit: "risu", suspects: ["risu", "nezumi", "karasu", "hakubishin"], clues: ["f_matsu", "s_kinoue", "s_densen", "g_hop_side"] },
    { id: 30, level: 3, scene: "hatake", title: "いちご ばたけ の だいじけん",
      story: "さいご の じけん！ いちご ばたけ が また あらされた。てがかり 5つ で はんにん を みつけよう。",
      culprit: "tanuki", suspects: ["tanuki", "hakubishin", "kitsune", "inu"], clues: ["d_tame", "s_ana_big", "t_inuka", "g_zigzag", "h_kemono"] }
  ];

  const LEVELS = {
    1: { label: "かんたん", hint: "あしあと を よく みれば わかる", color: "#66bb6a" },
    2: { label: "ふつう", hint: "てがかり を あわせて かんがえよう", color: "#ffa726" },
    3: { label: "むずかしい", hint: "1つ では きまらない。くみあわせ で しぼろう", color: "#ef5350" }
  };

  const api = { CASES, LEVELS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AT_CASES = api;
})(typeof window !== "undefined" ? window : globalThis);
