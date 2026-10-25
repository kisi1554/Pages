/* ============================================================
   きめつバトル — データ（キャラ・わざ・てき・どうぐ・シーン）
   あたらしい キャラや たたかいを ふやすときは、ここに かきたすだけ。
   - キャラ  … KB.CHARS に 1つ たす（みためは draw.js の LOOKS に 1つ たす）
   - わざ    … KB.SKILLS に たして、キャラの skills に id を ならべる
   - てき    … KB.ENEMIES に たす（moves・ai・phases・defeat）
   - シーン  … KB.SCENES に たす（party・enemy・bg・intro・outro）
   ============================================================ */
(function (root) {
  "use strict";
  var KB = root.KB = root.KB || {};

  /* ---------- みかた ----------
     hp / mp … さいだいち
     atk     … こうげきりょく（ダメージ = atk × わざの power × ゆらぎ）
     wait    … ATB ゲージが たまるまでの びょうすう（ちいさいほど はやい）
     limit   … ゲージが たまると「たたかう」が「ひっさつ」に かわる（FF7 の リミットわざ） */
  KB.CHARS = {
    tanjiro: {
      name: "たんじろう", full: "かまど たんじろう", look: "tanjiro", color: "#2fb27a",
      hp: 1100, mp: 80, atk: 62, wait: 3.2,
      attack: { name: "きりつける", power: 3, fx: "slash" },
      skills: ["minamo", "ryuryu", "enbu", "hekira", "sukitooru"],
      limit: "renjitsu"
    },
    giyu: {
      name: "ぎゆう", full: "とみおか ぎゆう", look: "giyu", color: "#4c8ef0",
      hp: 1300, mp: 90, atk: 70, wait: 3.5,
      attack: { name: "きりつける", power: 3, fx: "slash" },
      skills: ["mizuguruma", "nejireuzu", "takitsubo", "kabau"],
      limit: "nagi"
    },
    // しのぶは ちからが よわい（atk が ひくい）。かわりに わざで どくを いれる
    shinobu: {
      name: "しのぶ", full: "こちょう しのぶ", look: "shinobu", color: "#c9a0ff", scale: 1.0,
      hp: 1000, mp: 90, atk: 40, wait: 2.6,
      attack: { name: "つく", power: 2.4, fx: "slash" },
      skills: ["tawamure", "managoi", "fukugan"],
      limit: "hyakusoku"
    },
    kanao: {
      name: "カナヲ", full: "つゆり カナヲ", look: "kanao", color: "#ffa8d8", scale: 1.05,
      hp: 1100, mp: 80, atk: 62, wait: 2.9,
      attack: { name: "きりつける", power: 3, fx: "slash" },
      skills: ["mikageume", "benihana", "uzumomo"],
      limit: "higan"
    },
    inosuke: {
      name: "いのすけ", full: "はしびら いのすけ", look: "inosuke", color: "#b8c8e0",
      hp: 1300, mp: 70, atk: 66, wait: 3.0,
      attack: { name: "きりさく", power: 3.1, fx: "slash" },
      skills: ["ugachi", "kirisaki", "rangui", "kankaku"],
      limit: "bakuretsu"
    }
  };

  /* ---------- わざ ----------
     type: attack（てきに こうげき）/ buff（じぶんに かける）/ cover（なかまを かばう）/ nagi（ぜんいんを まもる）
     hidden: true … さいしょは つかえない（シーンの phases の unlock で つかえるように なる）
     sure: true   … かわされない
     anim … ふりつけと エフェクト（game.js の strike）: slash / minamo / wheel / vortex / dragon / waterfall / enbu / firering / renjitsu
            / butterfly / sting / hexagon / zigzag / petalburst / petalarc / petalswirl / beastpierce / claw / rush
     fx   … あたったときの つぶ: slash / water / fire / poison / flower / beast
     poison … あてると てきに どくが たまる（てきの ばんごとに ダメージ）
     type: buffAll … みんなに かける（status・turns） */
  KB.SKILLS = {
    minamo:     { name: "みずのこきゅう・いちのかた みなもぎり", short: "みなもぎり", mp: 6,  type: "attack", anim: "minamo", power: 4.3, hits: 1, fx: "water", desc: "すいめんを きるような まっすぐな いちげき" },
    ryuryu:     { name: "みずのこきゅう・さんのかた りゅうりゅうまい", short: "りゅうりゅうまい", mp: 10, type: "attack", anim: "dragon", power: 1.8, hits: 3, fx: "water", desc: "ながれる みずのように 3かい きる" },
    enbu:       { name: "ヒノカミかぐら・えんぶ", short: "えんぶ", mp: 16, type: "attack", anim: "enbu", power: 6.2, hits: 1, fx: "fire", desc: "ほのおの ような おおきな いちげき" },
    hekira:     { name: "ヒノカミかぐら・へきらのてん", short: "へきらのてん", mp: 22, type: "attack", anim: "firering", power: 3.0, hits: 3, fx: "fire", desc: "ぐるりと まわって 3かい きる。つよい" },
    sukitooru:  { name: "すきとおる せかい", short: "すきとおる せかい", mp: 20, type: "buff", status: "sukitooru", turns: 3, fx: "clear", hidden: true,
                  desc: "とうきを けして あいての うごきを みきる。3ターン、こうげきが かならず あたって つよくなり、てきの こうげきも よけやすい" },
    mizuguruma: { name: "みずのこきゅう・にのかた みずぐるま", short: "みずぐるま", mp: 6,  type: "attack", anim: "wheel", power: 4.6, hits: 1, fx: "water", desc: "くるりと まわって きる" },
    nejireuzu:  { name: "みずのこきゅう・ろくのかた ねじれうず", short: "ねじれうず", mp: 12, type: "attack", anim: "vortex", power: 2.1, hits: 3, fx: "water", desc: "うずまきの ように 3かい きる" },
    takitsubo:  { name: "みずのこきゅう・はちのかた たきつぼ", short: "たきつぼ", mp: 18, type: "attack", anim: "waterfall", power: 6.8, hits: 1, fx: "water", desc: "たきの ように うえから たたきつける" },
    // むしのこきゅう（しのぶ）: ダメージは すくないが どくが たまる
    tawamure:   { name: "むしのこきゅう・ちょうのまい たわむれ", short: "たわむれ", mp: 6, type: "attack", anim: "butterfly", power: 0.9, hits: 3, fx: "poison", poison: 1, desc: "ちょうの ように まって 3かい つく。どくが 1 たまる" },
    managoi:    { name: "むしのこきゅう・はちばのまい まなこい", short: "まなこい", mp: 10, type: "attack", anim: "sting", power: 1.8, hits: 1, fx: "poison", poison: 2, desc: "はちの ように するどく つく。どくが 2 たまる" },
    fukugan:    { name: "むしのこきゅう・せいれいのまい ふくがんろっかく", short: "ふくがんろっかく", mp: 16, type: "attack", anim: "hexagon", power: 0.7, hits: 6, fx: "poison", poison: 3, desc: "とんぼの めの ように 6かい つく。どくが 3 たまる" },
    // はなのこきゅう（カナヲ）
    mikageume:  { name: "はなのこきゅう・にのかた みかげうめ", short: "みかげうめ", mp: 6, type: "attack", anim: "petalburst", power: 4.4, hits: 1, fx: "flower", desc: "うめの はなが さくように きる" },
    benihana:   { name: "はなのこきゅう・よんのかた べにはなごろも", short: "べにはなごろも", mp: 10, type: "attack", anim: "petalarc", power: 5.3, hits: 1, fx: "flower", desc: "べにいろの はなびらの ような おおきな いちげき" },
    uzumomo:    { name: "はなのこきゅう・ろくのかた うずもも", short: "うずもも", mp: 14, type: "attack", anim: "petalswirl", power: 2.1, hits: 3, fx: "flower", desc: "もものはなが うずまく ように 3かい きる" },
    // けもののこきゅう（いのすけ）
    ugachi:     { name: "けもののこきゅう・いちのきば うがちぬき", short: "うがちぬき", mp: 6, type: "attack", anim: "beastpierce", power: 4.6, hits: 1, fx: "beast", desc: "2ほんの かたなで まっすぐ つきさす" },
    kirisaki:   { name: "けもののこきゅう・にのきば きりさき", short: "きりさき", mp: 8, type: "attack", anim: "claw", power: 2.4, hits: 2, fx: "beast", desc: "ギザギザの かたなで 2かい きりさく" },
    rangui:     { name: "けもののこきゅう・ろくのきば らんぐいがみ", short: "らんぐいがみ", mp: 14, type: "attack", anim: "claw", power: 1.7, hits: 4, fx: "beast", desc: "けものが かみつく ように 4かい きる" },
    kankaku:    { name: "けもののこきゅう・しちのかた くうかんしきかく", short: "くうかんしきかく", mp: 12, type: "buff", status: "sukitooru", turns: 3, fx: "clear",
                  desc: "はだで あいての うごきを かんじとる。3ターン、こうげきが かならず あたって つよくなり、てきの こうげきも よけやすい" },
    kabau:      { name: "かばう", short: "かばう", mp: 8, type: "cover", desc: "つぎの じぶんの ばんまで、たんじろうへの こうげきを かわりに うける（ダメージ はんぶん）" },

    /* ひっさつ（リミット） */
    renjitsu:   { name: "ヒノカミかぐら・れつじつこうきょう", short: "れつじつこうきょう", type: "attack", anim: "renjitsu", power: 2.6, hits: 5, fx: "fire", sure: true, limit: true, desc: "ほのおの れんぞくぎり。かならず あたる" },
    hyakusoku:  { name: "むしのこきゅう・ごこうのまい ひゃくそくじゃばら", short: "ひゃくそくじゃばら", type: "attack", anim: "zigzag", power: 0.75, hits: 8, fx: "poison", poison: 5, sure: true, limit: true, desc: "むかでの ように ジグザグに はしって 8かい つく。どくが 5 たまる" },
    higan:      { name: "はなのこきゅう・ついのかた ひがんしゅがん", short: "ひがんしゅがん", type: "buffAll", status: "sukitooru", turns: 3, anim: "eye", limit: true,
                  desc: "め で あいての うごきを ぜんぶ みきる。3ターン、みんなの こうげきが かならず あたって つよくなる" },
    bakuretsu:  { name: "けもののこきゅう・はちのきば ばくれつもうしん", short: "ばくれつもうしん", type: "attack", anim: "rush", power: 9.5, hits: 1, fx: "beast", sure: true, limit: true, desc: "いのししの ように ばくはつてきに とっしんする" },
    nagi:       { name: "みずのこきゅう・じゅういちのかた なぎ", short: "なぎ", type: "nagi", turns: 3, sure: true, limit: true,
                  desc: "しずかな みずめんの ように、てきの こうげきを 3かい ぜんぶ けして、はんげきする" }
  };

  /* ---------- どうぐ（パーティで きょうつう） ---------- */
  KB.ITEMS = {
    kusuri:  { name: "きずぐすり",   emoji: "💊", heal: 500, desc: "HP を 500 かいふく" },
    hyoro:   { name: "ひょうろうがん", emoji: "🍡", mp: 40, desc: "こきゅう（MP）を 40 かいふく" },
    kitsuke: { name: "きつけぐすり", emoji: "🌿", revive: 0.5, desc: "たおれた なかまを HP はんぶんで おこす" }
  };

  /* ---------- どうま（2つの シーンで つかうので きほんを わけて つくる） ----------
     poisonDmg … どく 1つぶんの ダメージ / adapt … どくの ばんごとに たいせいが あがる りょう（さいだい adaptMax）
     moves の frost … みかたを ひえ じょうたいに する（わざを つかうと HP が へる。ぼうぎょで なおる） */
  var DOUMA_MOVES = {
    hasuha:   { name: "けっきじゅつ・はすはごおり", type: "single", power: 3.2, hits: 1, fx: "icelotus" },
    chiri:    { name: "けっきじゅつ・ちりれんげ", type: "single", power: 1.15, hits: 4, fx: "icepetal" },
    konagori: { name: "けっきじゅつ・こなごおり", type: "all", power: 1.0, hits: 1, fx: "icemist", frost: 3 },
    karesono: { name: "けっきじゅつ・かれそのしづり", type: "single", power: 5.2, hits: 1, fx: "icefan" },
    tsurara:  { name: "けっきじゅつ・ふゆざれつらら", type: "all", power: 2.4, hits: 1, fx: "icicle" },
    miko:     { name: "けっきじゅつ・けっしょうのみこ", type: "all", power: 2.2, hits: 1, fx: "iceclone", cutin: true },
    tame:     { name: "ちからを ためている…！", type: "charge" },
    suiren:   { name: "けっきじゅつ・むひょう すいれんぼさつ", type: "all", power: 8.2, hits: 1, fx: "bodhisattva", cutin: true }
  };
  function doumaAi(b, me) {
    if (me.charging) { me.charging = false; return "suiren"; }
    me.turn = (me.turn || 0) + 1;
    if (me.phase >= 2 && me.turn % 4 === 0) { me.charging = true; return "tame"; }
    var list = me.phase >= 1 ? ["hasuha", "chiri", "konagori", "karesono", "tsurara", "miko"] : ["hasuha", "chiri", "konagori", "karesono", "chiri"];
    return list[Math.floor(Math.random() * list.length)];
  }
  var DOUMA = {
    name: "どうま", title: "じょうげんの に", look: "douma", moves: DOUMA_MOVES, ai: doumaAi, atk: 52,
    poisonDmg: 34, adapt: 0.04, adaptMax: 0.55,
    taunts: ["やあやあ、げんきだねえ", "そんなに おこらないでよ〜", "きれいな わざだねえ", "にこにこ しようよ〜", "おれは みんなを すくって あげたいだけ"]
  };

  /* ---------- てき ----------
     moves の type: single（ひとりに）/ all（ぜんいんに）/ charge（ちからを ためる。つぎに ひっさつ）
     phases: HP の わりあいが at いかに なったとき 1かいだけ おこる イベント
       say … セリフ / dodge … みかたの こうげきを かわす かくりつ / regen … てきの ばんごとに かいふく
       dot … てきの ばんごとに てきが うける ダメージ /
       unlock … みかたの わざを つかえるように する / mark … あざが でる キャラ / bgm … きょくを かえる / hint … したに でる ヒント
     moves の cutin: true … かおの アップの カットインが でる */
  KB.ENEMIES = {
    akaza: {
      name: "アカザ", title: "じょうげんの さん", look: "akaza",
      hp: { easy: 5000, normal: 7200 }, atk: 55, wait: { easy: 4.0, normal: 3.1 },
      moves: {
        kuushiki:  { name: "はかいさつ・くうしき", type: "single", power: 3.0, hits: 1, fx: "airpunch" },
        ranshiki:  { name: "はかいさつ・らんしき", type: "single", power: 1.2, hits: 4, fx: "punch" },
        kamuro:    { name: "はかいさつ・きゃくしき かむろさきわり", type: "single", power: 5.4, hits: 1, fx: "kick" },
        messhiki:  { name: "はかいさつ・めっしき", type: "single", cutin: true, power: 7.2, hits: 1, fx: "bigpunch" },
        tame:      { name: "ちからを ためている…！", type: "charge" },
        shuushiki: { name: "はかいさつ・しゅうしき あおぎんらんざんこう", type: "all", cutin: true, power: 8.5, hits: 1, fx: "shuushiki" }
      },
      taunts: ["すばらしい とうきだ！", "おにに なれ、ぎゆう！", "よわい やつは きらいだ", "もっとだ！ もっと たたかおう！", "その わざ、おもしろい！"],
      // つぎの わざを えらぶ（b = バトルの じょうたい、me = じぶん）
      ai: function (b, me) {
        if (me.charging) { me.charging = false; return "shuushiki"; }
        me.turn = (me.turn || 0) + 1;
        if (me.phase >= 2 && me.turn % 4 === 0) { me.charging = true; return "tame"; }
        var list = me.phase >= 1 ? ["kuushiki", "ranshiki", "kamuro", "messhiki", "ranshiki"] : ["kuushiki", "ranshiki", "kamuro", "kuushiki"];
        return list[Math.floor(Math.random() * list.length)];
      },
      phases: [
        { at: 0.6, say: [
            { who: "akaza", text: "いいぞ…！ もっと みせてくれ！" },
            { who: null, text: "アカザの あしもとに ゆきの けっしょうの ような もようが ひろがった。" },
            { who: "akaza", text: "はかいさつ・らしん！ おまえたちの とうきは ぜんぶ みえている！" },
            { who: null, text: "アカザは こうげきを かわしやすく なり、きずも なおるように なった！" },
            { who: "tanjiro", text: "（とうきを… よまれている。それなら、とうきを けせば いいんだ…）" },
            { who: "tanjiro", text: "（しずかに… しずかに… すきとおる せかいが みえてきた！）" },
            { who: null, text: "たんじろうは「すきとおる せかい」を つかえるように なった！" },
            { who: "giyu", text: "（…まだだ。ここで たおれる わけには いかない）" },
            { who: null, text: "ぎゆうの ほおに、みずの うずの ような あざが うかびあがった！" }
          ],
          dodge: 0.4, regen: 120, rashin: true, unlock: { tanjiro: ["sukitooru"] }, mark: ["giyu"],
          hint: "ヒント：たんじろうの わざ「すきとおる せかい」なら こうげきが かわされない！" },
        { at: 0.25, say: [
            { who: "akaza", text: "まだだ！ まだ おわらない！" },
            { who: null, text: "アカザの とうきが ますます つよく なった！" }
          ], bgm: "battle2",
          hint: "ヒント：アカザが ちからを ためたら「ぼうぎょ」か、ぎゆうの ひっさつ「なぎ」で ふせごう！" }
      ],
      // たおしたあとの おはなし（こわい ひょうげんは しない）
      defeat: [
        { who: null, text: "たんじろうと ぎゆうの いちげきが きまった！" },
        { who: "akaza", text: "まだだ… おれは もっと つよく…" },
        { who: null, text: "そのとき、アカザの こころに なつかしい こえが きこえた。" },
        { who: "koyuki", text: "はくじさん… もう いいの。もう たたかわなくて いいんですよ。" },
        { who: "akaza", text: "…こゆき。…ししょう。おれは… はくじ だった。" },
        { who: null, text: "アカザは にんげんだった ころの ことを おもいだし、たたかうのを やめた。" },
        { who: null, text: "そして、ひかりの つぶに なって しずかに きえていった…。", fx: "fade" },
        { who: "tanjiro", text: "…ありがとうございました、ぎゆうさん。" },
        { who: "giyu", text: "…おまえが つよく なったからだ。いくぞ、たんじろう。" }
      ]
    }
  };

  KB.ENEMIES.douma1 = Object.assign({}, DOUMA, {
    hp: { easy: 3800, normal: 5400 }, wait: { easy: 4.2, normal: 3.4 },
    phases: [
      { at: 0.6, say: [
          { who: "douma", text: "あれ？ この どく… もう ぶんかい できちゃった〜" },
          { who: "shinobu", text: "（どくに なれてくる…。それなら もっと たくさん いれるまで）" },
          { who: null, text: "どうまは あたらしい けっきじゅつを つかいはじめた！" }
        ], hint: "ヒント：どうまは どくに なれてくるけど、どくは たまり つづける。わざで どんどん いれよう！" },
      { at: 0.3, say: [
          { who: "douma", text: "そろそろ ほんきで いくよ〜！" },
          { who: null, text: "あたりの くうきが いっそう つめたく なった…！" }
        ], bgm: "battle2", hint: "ヒント：どうまが ちからを ためたら「ぼうぎょ」！ ひえて いたら ぼうぎょで こきゅうを ととのえよう" }
    ],
    defeat: [
      { who: null, text: "しのぶの どくが、どうまの からだじゅうに まわった！" },
      { who: "douma", text: "あれれ…？ からだが うまく うごかないや" },
      { who: "shinobu", text: "わたしの どくは、まだまだ これからですよ。" },
      { who: "shinobu", text: "…カナヲ。あとは たのみましたよ。" },
      { who: null, text: "しのぶは ちからを つかいはたし、カナヲに おもいを たくした。" },
      { who: null, text: "つぎの たたかい「どうません その2」へ つづく！" }
    ]
  });
  KB.ENEMIES.douma2 = Object.assign({}, DOUMA, {
    hp: { easy: 6000, normal: 8200 }, wait: { easy: 4.0, normal: 3.1 },
    phases: [
      { at: 0.6, say: [
          { who: "douma", text: "ふたりとも げんきだねえ。おれも たくさん あそんじゃおう！" },
          { who: null, text: "どうまは こおりの にんぎょう「けっしょうのみこ」を つくりはじめた！" }
        ], hint: "ヒント：カナヲの ひっさつ「ひがんしゅがん」で みんなの こうげきが かならず あたる！" },
      { at: 0.35, say: [
          { who: "douma", text: "あれ…？ なんだか からだが へんだなあ" },
          { who: "kanao", text: "しのぶねえさんの どくが… きいてる！" },
          { who: null, text: "しのぶの どくが いっきに まわった！ どうまの からだが とけはじめた！" },
          { who: "inosuke", text: "いまだ！ いっきに いくぞ、カナヲ！" }
        ], regen: 0, dot: 180, bgm: "battle2",
        hint: "ヒント：どうまは ばんごとに とけて HP が へる！ ちからを ためたら ぼうぎょ！" }
    ],
    defeat: [
      { who: null, text: "カナヲと いのすけの いちげきが きまった！" },
      { who: "douma", text: "これが しのぶちゃんの どく… すごいなあ" },
      { who: null, text: "どうまは さいごまで にこにこ したまま、しずかに くずれて きえていった。", fx: "fade" },
      { who: "kanao", text: "しのぶねえさん、カナエねえさん… かったよ。" },
      { who: "inosuke", text: "おれたちの かちだ！ …しのぶ、みてたか！" }
    ]
  });

  /* ---------- セリフの なまえと いろ ---------- */
  KB.SPEAKERS = {
    tanjiro: { name: "たんじろう", color: "#7ef0b8" },
    giyu:    { name: "ぎゆう", color: "#9cc4ff" },
    akaza:   { name: "アカザ", color: "#ff9cc8" },
    koyuki:  { name: "こゆき", color: "#ffe08a" },
    shinobu: { name: "しのぶ", color: "#d8b8ff" },
    kanao:   { name: "カナヲ", color: "#ffb8e0" },
    inosuke: { name: "いのすけ", color: "#c8d8f0" },
    douma:   { name: "どうま", color: "#f2e2b0" }
  };

  /* ---------- シーン ----------
     bg … draw.js の BGS の なまえ / items … もっていく どうぐの かず / next … かったあとの つぎの シーン
     enemyStart … てきの さいしょの じょうたい（poison など） / hint … はじめに でる ヒント
     coming: true … じゅんびちゅう（えらべない） */
  KB.SCENES = [
    {
      id: "mugen-akaza", emoji: "🏯", title: "むげんじょう：アカザせん",
      desc: "たんじろう と ぎゆう で、じょうげんの さん・アカザ に いどむ！",
      bg: "mugen", bgm: "battle", party: ["tanjiro", "giyu"], enemy: "akaza",
      items: { kusuri: 4, hyoro: 3, kitsuke: 2 },
      intro: [
        { who: null, text: "べべん…！ びわの おとと ともに、へやが ぐるりと うごいた。", sfx: "biwa" },
        { who: null, text: "ここは おにの しろ・むげんじょう。" },
        { who: "akaza", text: "また あったな、たんじろう。…そっちの おまえも つよいな。" },
        { who: "akaza", text: "おまえ、おにに ならないか？ おにに なれば ずっと たたかえるぞ。" },
        { who: "giyu", text: "ことわる。" },
        { who: "tanjiro", text: "れんごくさんの かたきだ！ ぎゆうさん、いっしょに たたかいましょう！" },
        { who: null, text: "じょうげんの さん・アカザ が あらわれた！" }
      ]
    },
    {
      id: "mugen-douma1", emoji: "🦋", title: "むげんじょう：どうません その1",
      desc: "しのぶ ひとりで じょうげんの に・どうま に いどむ。わざで どくを いれて たたかおう！",
      bg: "lotus", bgm: "ice", party: ["shinobu"], enemy: "douma1", next: "mugen-douma2",
      items: { kusuri: 5, hyoro: 3 },
      hint: "ヒント：しのぶの わざは どくを いれる。どくは どうまの ばんごとに ダメージ！",
      intro: [
        { who: null, text: "べべん…！ たどりついた へやは、こおりの はすが さく いけ だった。", sfx: "biwa" },
        { who: "douma", text: "やあやあ、はじめまして！ おれは どうま。きみ、かわいいねえ" },
        { who: "shinobu", text: "…カナエねえさんの かたき。あなたを ゆるしません。" },
        { who: "douma", text: "えー、こわい かお しないでよ〜。にこにこ しようよ" },
        { who: "shinobu", text: "（わたしの かたなでは くびは きれない。でも、どくなら…！）" },
        { who: null, text: "じょうげんの に・どうま が あらわれた！" }
      ]
    },
    {
      id: "mugen-douma2", emoji: "🐗", title: "むげんじょう：どうません その2",
      desc: "しのぶの おもいを うけついで、カナヲ と いのすけ が どうま に とどめを さす！",
      bg: "lotus", bgm: "ice", party: ["kanao", "inosuke"], enemy: "douma2",
      items: { kusuri: 4, hyoro: 3, kitsuke: 2 }, enemyStart: { poison: 3 },
      hint: "ヒント：どうまには しのぶの どくが のこっている。HP が へると…？",
      intro: [
        { who: null, text: "しのぶの おもいを うけて、カナヲが かけつけた！" },
        { who: "kanao", text: "しのぶねえさんの どくは、ちゃんと きいてる…！" },
        { who: "douma", text: "あれ？ また かわいい こが きたね〜" },
        { who: null, text: "ドカーン！ てんじょうを つきやぶって、だれかが とびこんできた！", sfx: "big" },
        { who: "inosuke", text: "ガハハ！ いのすけさま さんじょう！ おれも まぜろ！" },
        { who: "douma", text: "にぎやかに なってきたねえ" },
        { who: null, text: "じょうげんの に・どうま との さいごの たたかいだ！" }
      ]
    },
    { id: "coming-1", emoji: "🔒", title: "つぎの たたかい", desc: "じゅんびちゅう… たのしみに まっててね", coming: true }
  ];
})(typeof window !== "undefined" ? window : globalThis);
