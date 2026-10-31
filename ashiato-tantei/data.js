/* あしあと たんてい — どうぶつ と てがかり の データ
 *
 * てがかり（CLUES）の matches は「この てがかり を のこす かもしれない どうぶつ」。
 * 12しゅるい ぜんぶ に ついて、あてはまる ものを もれなく いれる こと
 * （いれわすれると、ほんとうは あう どうぶつ を まちがって「あわない」に して しまう）。
 * じけん が 1とう に きまるか は tests/check-cases.js で じどう で たしかめる。
 */
(function (root) {
  "use strict";

  const MAMMALS = ["tanuki", "kitsune", "usagi", "risu", "nezumi", "shika", "inoshishi", "hakubishin", "neko", "inu"];

  /* ずかん。name は カタカナ、full は ただしい なまえ */
  const ANIMALS = {
    tanuki: {
      name: "タヌキ", full: "ホンドタヌキ", color: "#8d6e63", voice: "クゥーン",
      track: "ゆび 4ほん。つめ の あと が のこる。ゆび が ひらいて、ちいさめ（3〜4cm）",
      gait: "ひだり・みぎ に ずれた ジグザグ",
      dung: "おなじ ばしょ に なんかい も する「ためふん」。くだもの の たね が まざる ことも",
      food: "なんでも たべる（くだもの・むし・ミミズ・やさい）",
      home: "どて の あな、ふるい す あな、えんのした",
      season: "1ねんじゅう（ふゆ も とうみん しない）。よる に うごく",
      hello: "えへへ、いちご あまくて つい…。ごめんね ポン！",
      note: "たぬきねいり の ことば が ある くらい、びっくり すると うごかなく なる ことが あるよ"
    },
    kitsune: {
      name: "キツネ", full: "ホンドギツネ", color: "#e67e22", voice: "ギャーッ ケーン",
      track: "ゆび 4ほん。つめ の あと が のこる。ほそながい だえん で、まえ の ゆび 2ほん が よる（4〜5cm）",
      gait: "まっすぐ 1れつ（うしろあし を まえあし の あと に かさねて あるく）",
      dung: "ほそながく ねじれて、さき が とがる。めだつ いし や きりかぶ の うえ に のこす",
      food: "ネズミ・ウサギ・とり・むし、あき は くだもの も",
      home: "どて や やま の しゃめん の す あな",
      season: "1ねんじゅう。ふゆ の ゆき の うえ で あしあと が みつけやすい",
      hello: "ふふん、まっすぐ あるくのは とくい なのさ。",
      note: "「コンコン」とは あまり なかないよ。ほんとう は「ギャーッ」「ケーン」と たかい こえ"
    },
    usagi: {
      name: "ノウサギ", full: "ニホンノウサギ", color: "#a1887f", voice: "（ほとんど なかない）",
      track: "まえあし は ちいさい まる、うしろあし は ながい だえん。あし の うら が けで おおわれて ゆび は ぼやける",
      gait: "ぴょん と とぶ。ちいさい まえあし 2つ が たて に、おおきい うしろあし 2つ が その まえ に よこならび（Y の かたち）",
      dung: "まるくて すこし ひらたい つぶ（1cm くらい）。くさ の せんい が いっぱい",
      food: "くさ・き の め・えだ。えだ は はもの で きった ように ななめ に スパッと きれる",
      home: "す あな は ほらない。くさむら の あさい くぼみ で やすむ",
      season: "1ねんじゅう。ゆき の おおい ところ では ふゆ に まっしろ な け に かわる",
      hello: "ぴょん！ ぼく の あし、うしろ が まえ に くるんだ。",
      note: "かいうさぎ と ちがって、あな は ほらないよ"
    },
    risu: {
      name: "リス", full: "ニホンリス", color: "#bf6b3a", voice: "キュッ キュッ",
      track: "まえあし ゆび 4ほん、うしろあし ゆび 5ほん。うしろあし は 5cm くらい",
      gait: "とんで すすむ。まえあし も うしろあし も よこならび",
      dung: "ちいさな まるい つぶ（みつかる ことは すくない）",
      food: "オニグルミ を 2つ に ぱっかり わる。まつぼっくり を かじって エビフライ の かたち に する",
      home: "き の うえ に えだ と き の かわ で まるい す を つくる",
      season: "1ねんじゅう（とうみん しない）。あき に くるみ を うめて たくわえる。ひる に うごく",
      hello: "くるみ、ぱっかん！ じょうず でしょ？",
      note: "うめた くるみ を わすれる と、そこから くるみ の き が はえる ことも"
    },
    nezumi: {
      name: "ネズミ", full: "アカネズミ", color: "#c0703a", voice: "チュッ チュッ",
      track: "まえあし ゆび 4ほん、うしろあし ゆび 5ほん。とても ちいさい（2cm くらい）",
      gait: "とんで すすむ。まえあし も うしろあし も よこならび",
      dung: "こめつぶ くらい の ちいさな ほそながい つぶ",
      food: "くるみ に まるい あな を あけて たべる。まつぼっくり も エビフライ の かたち に",
      home: "じめん の した の トンネル。いりぐち は ゆび が はいる くらい の あな",
      season: "1ねんじゅう。よる に うごく",
      hello: "チュッ。こっそり くるみ の あな あけ、たのしかった〜。",
      note: "まち の いえ に すむ ドブネズミ や クマネズミ とは ちがう、もり や のはら の ネズミ"
    },
    shika: {
      name: "シカ", full: "ニホンジカ", color: "#a0522d", voice: "ピィーッ",
      track: "ひづめ が 2つ。さき が ほそい ハート がた（5〜6cm）。うしろ の ちいさな ひづめ（ふくてい）の あと は ふつう のこらない",
      gait: "ひだり・みぎ に ずれて あるく",
      dung: "くろくて つや の ある たわら がた の つぶ が、かたまって おちている",
      food: "くさ・き の は・き の かわ。うえ の まえば が ないので、えだ は ギザギザ に ひきちぎる",
      home: "す は つくらない。くさむら で ねる。どろ の みずたまり で どろあび（ぬたば）",
      season: "1ねんじゅう。あき は オス が「ピィーッ」と なく",
      hello: "ピィーッ！ はっぱ、ごちそうさま でした。",
      note: "オス は まいとし はる に つの が おちて、あたらしく はえかわる"
    },
    inoshishi: {
      name: "イノシシ", full: "ニホンイノシシ", color: "#5d4037", voice: "ブフッ ブフッ",
      track: "まるっこい ひづめ 2つ ＋ うしろ に ちいさな ひづめ（ふくてい）2つ の あと（5〜7cm）",
      gait: "ひだり・みぎ に ずれて あるく",
      dung: "おおきな だんご が かたまった ふん",
      food: "はな で じめん を ほりかえして、ね・いも・ミミズ を たべる",
      home: "くさ を あつめた ねどこ。どろあび（ぬたば）が だいすき",
      season: "1ねんじゅう。なつ〜あき に たんぼ や はたけ に でて くる ことが ある",
      hello: "ブフッ！ どろんこ、きもちいい〜！",
      note: "はな の ちから が とても つよく、おもい いし も ころがす"
    },
    hakubishin: {
      name: "ハクビシン", full: "ハクビシン", color: "#78787a", voice: "キキッ",
      track: "まえ も うしろ も ゆび 5ほん。まるくて、にんげん の あかちゃん の て みたい。つめ の あと は はっきり しない",
      gait: "ひだり・みぎ に ずれて あるく",
      dung: "おなじ ばしょ に なんかい も する「ためふん」（やねうら・へい の うえ など）",
      food: "あまい くだもの が だいすき（かき・ぶどう・いちご・みかん）",
      home: "いえ の やねうら、き の ほら",
      season: "1ねんじゅう。よる に うごく。なつ〜あき は くだもの を ねらう",
      hello: "でんせん の つなわたり、みてた？ くだもの は べつばら なの。",
      note: "かお の まんなか の しろい せん が なまえ の もと（はく＝しろ、び＝はな）"
    },
    neko: {
      name: "ネコ", full: "イエネコ", color: "#f0a04b", voice: "ニャーオ",
      track: "ゆび 4ほん。まるい かたち。つめ を ひっこめて あるくので、つめ の あと は ふつう のこらない（3cm くらい）",
      gait: "ほぼ まっすぐ 1れつ",
      dung: "すな や つち を かけて うめる",
      food: "キャットフード・ネズミ・とり",
      home: "ひと の いえ のまわり。へい の うえ を あるく",
      season: "1ねんじゅう",
      hello: "ニャーオ。すなば は ぼく の おトイレ じゃ ないよ…たぶん。",
      note: "つめ を しまえる から、しずか に あるける"
    },
    inu: {
      name: "イヌ", full: "イエイヌ", color: "#d4a373", voice: "ワン ワン",
      track: "ゆび 4ほん。つめ の あと が のこる。おおきさ は いぬ の しゅるい で いろいろ",
      gait: "ひだり・みぎ に ずれた ジグザグ。さんぽ なら ひと の くつ の あと と いっしょ",
      dung: "かいぬし が もちかえる ので、のこって いない ことが おおい",
      food: "ドッグフード",
      home: "ひと の いえ",
      season: "1ねんじゅう",
      hello: "ワン！ さんぽ、たのしかった！",
      note: "つめ を しまえない ので、あしあと に つめ が のこる"
    },
    karasu: {
      name: "カラス", full: "ハシブトガラス・ハシボソガラス", color: "#222", voice: "カァ カァ",
      track: "まえ に 3ぼん、うしろ に 1ぽん の ほそながい ゆび（8〜9cm）",
      gait: "ハシボソ は てくてく、ハシブト は ぴょんぴょん",
      dung: "しろ と くろ が まざった べちゃっ と した ふん",
      food: "なんでも たべる。かたい くるみ を たかい ところ から おとして わる ことも（ハシボソガラス）",
      home: "き の うえ に えだ を くんだ おわん がた の す（ハンガー を つかう ことも）",
      season: "1ねんじゅう。はる に す を つくる",
      hello: "カァ！ くるみ わり は あたま を つかうのさ。",
      note: "とても あたま が よく、ひと の かお も おぼえる"
    },
    kamo: {
      name: "カモ", full: "カルガモ", color: "#8a6e4b", voice: "グェッ グェッ",
      track: "まえ に 3ぼん の ゆび、ゆび の あいだ に みずかき（6〜7cm）",
      gait: "うちまた で よちよち",
      dung: "しろ と くろ が まざった べちゃっ と した ふん",
      food: "みずくさ・くさ の たね",
      home: "みずべ の くさむら に す",
      season: "カルガモ は 1ねんじゅう。ほか の カモ は ふゆ に わたって くる",
      hello: "グェッ。みずかき で すいすい およぐ よ。",
      note: "はる〜なつ、ひな が おやどり の うしろ を ならんで あるく"
    }
  };

  /* てがかり
   * kind: track（あしあと）/ gait（あしあと の ならび）/ food（たべあと）/ dung（ふん）
   *       hair（け・はね）/ sign（すみか・しるし）/ voice（なきごえ）
   * where: ground（じめん）/ high（き の うえ・やね など たかい ところ）
   * short: ノート の みだし、text: くわしい せつめい
   */
  const CLUES = {
    // ── あしあと（1つ） ──
    t_inuka:  { kind: "track", where: "ground", short: "ゆび4ほん・つめ あり", text: "ゆび が 4ほん。ゆび の さき に つめ の あと が ある。", matches: ["tanuki", "kitsune", "inu"] },
    t_kitsune:{ kind: "track", where: "ground", short: "ほそながい だえん", text: "あしあと が ほそながい だえん。まえ の ゆび 2ほん が よって いる。", matches: ["kitsune", "inu"] },
    t_neko:   { kind: "track", where: "ground", short: "ゆび4ほん・つめ なし", text: "ゆび が 4ほん で まるい かたち。つめ の あと が ない。", matches: ["neko"] },
    t_haku:   { kind: "track", where: "ground", short: "ゆび5ほん・あかちゃん の て", text: "ゆび が 5ほん。まるくて、にんげん の あかちゃん の て みたい。", matches: ["hakubishin"] },
    t_usagi:  { kind: "track", where: "ground", short: "ながい うしろあし", text: "ちいさい まる と、ながい だえん の あしあと。ゆび は けで ぼやけて いる。", matches: ["usagi"] },
    t_risu:   { kind: "track", where: "ground", short: "まえ4・うしろ5 ゆび（5cm）", text: "まえあし は ゆび 4ほん、うしろあし は ゆび 5ほん。うしろあし は 5cm くらい。", matches: ["risu"] },
    t_nezumi: { kind: "track", where: "ground", short: "まえ4・うしろ5 ゆび（2cm）", text: "まえあし は ゆび 4ほん、うしろあし は ゆび 5ほん。とても ちいさい（2cm くらい）。", matches: ["nezumi"] },
    t_hizume: { kind: "track", where: "ground", short: "ひづめ 2つ", text: "ゆび では なく、かたい ひづめ が 2つ ならんだ あと。", matches: ["shika", "inoshishi"] },
    t_shika:  { kind: "track", where: "ground", short: "ほそい ハート の ひづめ", text: "さき の ほそい ハート がた の ひづめ 2つ。うしろ に ちいさな ひづめ の あと は ない。", matches: ["shika"] },
    t_inoshi: { kind: "track", where: "ground", short: "ひづめ ＋ ふくてい", text: "まるっこい ひづめ 2つ と、その うしろ に ちいさな ひづめ（ふくてい）2つ の あと。", matches: ["inoshishi"] },
    t_karasu: { kind: "track", where: "ground", short: "まえ3・うしろ1 の ゆび", text: "まえ に 3ぼん、うしろ に 1ぽん の ほそながい ゆび。とり の あしあと。", matches: ["karasu"] },
    t_kamo:   { kind: "track", where: "ground", short: "みずかき の あしあと", text: "まえ に 3ぼん の ゆび。ゆび の あいだ に みずかき の あと。", matches: ["kamo"] },
    // ── あしあと の ならび ──
    g_line:   { kind: "gait", where: "ground", short: "まっすぐ 1れつ", text: "あしあと が まっすぐ 1れつ に ならんで いる。", matches: ["kitsune", "neko"] },
    g_zigzag: { kind: "gait", where: "ground", short: "ジグザグ", text: "あしあと が ひだり・みぎ に ずれて、ジグザグ に ならんで いる。", matches: ["tanuki", "inu", "hakubishin", "inoshishi", "shika", "kamo", "karasu"] },
    g_hop_y:  { kind: "gait", where: "ground", short: "Y の かたち に ぴょん", text: "4つ で ひとくみ。ちいさい 2つ が たて、おおきい 2つ が その まえ に よこならび（Y の かたち）。", matches: ["usagi"] },
    g_hop_side:{ kind: "gait", where: "ground", short: "よこならび で ぴょん", text: "4つ で ひとくみ。まえあし も うしろあし も よこ に ならんで いる。", matches: ["risu", "nezumi"] },
    g_hop:    { kind: "gait", where: "ground", short: "ぴょんぴょん とんだ", text: "4つ で ひとくみ の あしあと が、とびとび に つづく。とんで すすんだ あと。", matches: ["usagi", "risu", "nezumi"] },
    g_human:  { kind: "gait", where: "ground", short: "ひと の くつ と いっしょ", text: "あしあと の よこ に、ひと の くつ の あと が ずっと ならんで いる。", matches: ["inu"] },
    // ── たべあと ──
    f_kurumi2:   { kind: "food", where: "ground", short: "くるみ が 2つ に", text: "かたい くるみ が、あわせめ で 2つ に ぱっかり わられて いる。", matches: ["risu"] },
    f_kurumi_ana:{ kind: "food", where: "ground", short: "くるみ に まるい あな", text: "くるみ に まるい あな が あいて、なか が なくなって いる。", matches: ["nezumi"] },
    f_kurumi_kona:{ kind: "food", where: "ground", short: "くるみ が こなごな", text: "みち の うえ で くるみ が こなごな。たかい ところ から おとして わった みたい。", matches: ["karasu"] },
    f_matsu:     { kind: "food", where: "ground", short: "まつぼっくり の エビフライ", text: "まつぼっくり が かじられて、エビフライ みたい な かたち に なって いる。", matches: ["risu", "nezumi"] },
    f_eda_naname:{ kind: "food", where: "ground", short: "えだ が ななめ に スパッ", text: "ひくい えだ の さき が、はもの で きった ように ななめ に スパッと きれて いる。", matches: ["usagi"] },
    f_eda_giza:  { kind: "food", where: "ground", short: "えだ が ギザギザ", text: "えだ や くさ の さき が、ひきちぎった ように ギザギザ。", matches: ["shika"] },
    // ── ふん ──
    d_tame:   { kind: "dung", where: "ground", short: "ためふん", text: "おなじ ばしょ に ふん が たくさん つみかさなって いる（ためふん）。", matches: ["tanuki", "hakubishin"] },
    d_kitsune:{ kind: "dung", where: "ground", short: "ねじれて とがった ふん", text: "ほそながく ねじれ、さき が とがった ふん。めだつ いし の うえ に ぽつん と ある。", matches: ["kitsune"] },
    d_usagi:  { kind: "dung", where: "ground", short: "まるく ひらたい つぶ", text: "まるくて すこし ひらたい つぶ（1cm くらい）。くさ の せんい が いっぱい。", matches: ["usagi"] },
    d_shika:  { kind: "dung", where: "ground", short: "つや の ある たわら がた", text: "くろくて つや の ある、たわら がた の つぶ が かたまって いる。", matches: ["shika"] },
    d_nezumi: { kind: "dung", where: "ground", short: "こめつぶ くらい", text: "こめつぶ くらい の、ちいさな ほそながい ふん。", matches: ["nezumi"] },
    d_inoshi: { kind: "dung", where: "ground", short: "おおきな だんご", text: "おおきな だんご が いくつも かたまった、おおきな ふん。", matches: ["inoshishi"] },
    d_tori:   { kind: "dung", where: "ground", short: "しろ と くろ の べちゃっ", text: "しろ と くろ が まざった、べちゃっ と した ふん。とり の ふん。", matches: ["karasu", "kamo"] },
    d_neko:   { kind: "dung", where: "ground", short: "すな を かけて うめた", text: "すな を かけて、ふん が うめて ある。", matches: ["neko"] },
    // ── け・はね ──
    h_kemono: { kind: "hair", where: "ground", short: "けもの の け", text: "ちゃいろ っぽい けもの の け が おちて いる。とり の はね では ない。", matches: MAMMALS.slice() },
    h_hane:   { kind: "hair", where: "ground", short: "とり の はね", text: "とり の はね が おちて いる。", matches: ["karasu", "kamo"] },
    h_kuro:   { kind: "hair", where: "ground", short: "くろくて つや の ある はね", text: "まっくろ で、ひかる と あおむらさき に みえる はね。", matches: ["karasu"] },
    h_kamo:   { kind: "hair", where: "ground", short: "ちゃいろ もよう の はね", text: "ちゃいろ に もよう が あって、あおい ところ も ある はね。", matches: ["kamo"] },
    // ── すみか・しるし ──
    s_kinoue: { kind: "sign", where: "high", short: "き の うえ に す", text: "たかい き の うえ に、えだ で つくった す が ある。", matches: ["risu", "karasu"] },
    s_risu_su:{ kind: "sign", where: "high", short: "まるい ボール の す", text: "き の うえ に、えだ と き の かわ で つくった まるい ボール の ような す。", matches: ["risu"] },
    s_karasu_su:{ kind: "sign", where: "high", short: "おわん がた の す", text: "き の うえ に、えだ を くんだ おわん がた の す。ハンガー も まざって いる。", matches: ["karasu"] },
    s_yaneura:{ kind: "sign", where: "high", short: "やねうら に すみか", text: "やねうら から ゴトゴト おと。やねうら に すみついて いる。", matches: ["hakubishin"] },
    s_densen: { kind: "sign", where: "high", short: "でんせん を つなわたり", text: "よる、でんせん の うえ を じょうず に わたって いく かげ。", matches: ["hakubishin", "risu"] },
    s_hei:    { kind: "gait", where: "high", short: "へい の うえ を あるいた", text: "ほそい へい の うえ に、あしあと が てんてん と つづいて いる。", matches: ["neko", "hakubishin"] },
    s_ana_big:{ kind: "sign", where: "ground", short: "どて に おおきな あな", text: "どて に、おとな の あたま くらい の す あな が ある。", matches: ["tanuki", "kitsune"] },
    s_ana_small:{ kind: "sign", where: "ground", short: "ちいさな あな", text: "じめん に、ゆび が はいる くらい の ちいさな あな が いくつも。", matches: ["nezumi"] },
    s_nuta:   { kind: "sign", where: "ground", short: "どろあび の あと", text: "どろ の みずたまり で ころがった あと（ぬたば）。", matches: ["inoshishi", "shika"] },
    s_hori:   { kind: "sign", where: "ground", short: "じめん を ひろく ほりかえした", text: "じめん が はな で ひろく ふかく ほりかえされて いる。", matches: ["inoshishi"] },
    s_fuse:   { kind: "sign", where: "ground", short: "くさ の くぼみ", text: "くさむら に、からだ を まるめて やすんだ あさい くぼみ。", matches: ["usagi", "shika"] },
    // ── なきごえ ──
    v_karasu: { kind: "voice", where: "high", short: "「カァ カァ」", text: "き の うえ から「カァ カァ」と こえ が した。", matches: ["karasu"], call: "karasu" },
    v_kamo:   { kind: "voice", where: "ground", short: "「グェッ グェッ」", text: "みずべ から「グェッ グェッ」と こえ が した。", matches: ["kamo"], call: "kamo" },
    v_shika:  { kind: "voice", where: "high", short: "「ピィーッ」", text: "やま の ほう から、ふえ の ような「ピィーッ」と いう たかい こえ。", matches: ["shika"], call: "shika" },
    v_inoshi: { kind: "voice", where: "ground", short: "「ブフッ ブフッ」", text: "やぶ の なか から「ブフッ ブフッ」と はな を ならす おと。", matches: ["inoshishi"], call: "inoshishi" },
    v_neko:   { kind: "voice", where: "high", short: "「ニャーオ」", text: "へい の むこう から「ニャーオ」。", matches: ["neko"], call: "neko" },
    v_inu:    { kind: "voice", where: "ground", short: "「ワン ワン」", text: "とおく で「ワン ワン」と げんき な こえ。", matches: ["inu"], call: "inu" },
    v_kitsune:{ kind: "voice", where: "high", short: "「ギャーッ ケーン」", text: "よる、「ギャーッ」「ケーン」と たかい こえ が ひびいた。", matches: ["kitsune"], call: "kitsune" },
    v_nezumi: { kind: "voice", where: "ground", short: "「チュッ チュッ」", text: "おちば の した から「チュッ チュッ」と ちいさな こえ。", matches: ["nezumi"], call: "nezumi" }
  };

  const KIND = {
    track: { label: "あしあと", icon: "🐾" },
    gait:  { label: "あしあと の ならび", icon: "👣" },
    food:  { label: "たべあと", icon: "🌰" },
    dung:  { label: "ふん", icon: "💩" },
    hair:  { label: "け・はね", icon: "🪶" },
    sign:  { label: "すみか・しるし", icon: "🏠" },
    voice: { label: "なきごえ", icon: "🔊" }
  };

  const api = { ANIMALS, CLUES, KIND, MAMMALS, ANIMAL_IDS: Object.keys(ANIMALS) };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AT_DATA = api;
})(typeof window !== "undefined" ? window : globalThis);
