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
    }
  };

  /* ---------- わざ ----------
     type: attack（てきに こうげき）/ buff（じぶんに かける）/ cover（なかまを かばう）/ nagi（ぜんいんを まもる）
     hidden: true … さいしょは つかえない（シーンの phases の unlock で つかえるように なる）
     sure: true   … かわされない
     anim … ふりつけと エフェクト（game.js の strike）: slash / minamo / wheel / vortex / dragon / waterfall / enbu / firering / renjitsu */
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
    kabau:      { name: "かばう", short: "かばう", mp: 8, type: "cover", desc: "つぎの じぶんの ばんまで、たんじろうへの こうげきを かわりに うける（ダメージ はんぶん）" },

    /* ひっさつ（リミット） */
    renjitsu:   { name: "ヒノカミかぐら・れつじつこうきょう", short: "れつじつこうきょう", type: "attack", anim: "renjitsu", power: 2.6, hits: 5, fx: "fire", sure: true, limit: true, desc: "ほのおの れんぞくぎり。かならず あたる" },
    nagi:       { name: "みずのこきゅう・じゅういちのかた なぎ", short: "なぎ", type: "nagi", turns: 3, sure: true, limit: true,
                  desc: "しずかな みずめんの ように、てきの こうげきを 3かい ぜんぶ けして、はんげきする" }
  };

  /* ---------- どうぐ（パーティで きょうつう） ---------- */
  KB.ITEMS = {
    kusuri:  { name: "きずぐすり",   emoji: "💊", heal: 500, desc: "HP を 500 かいふく" },
    hyoro:   { name: "ひょうろうがん", emoji: "🍡", mp: 40, desc: "こきゅう（MP）を 40 かいふく" },
    kitsuke: { name: "きつけぐすり", emoji: "🌿", revive: 0.5, desc: "たおれた なかまを HP はんぶんで おこす" }
  };

  /* ---------- てき ----------
     moves の type: single（ひとりに）/ all（ぜんいんに）/ charge（ちからを ためる。つぎに ひっさつ）
     phases: HP の わりあいが at いかに なったとき 1かいだけ おこる イベント
       say … セリフ / dodge … みかたの こうげきを かわす かくりつ / regen … てきの ばんごとに かいふく
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

  /* ---------- セリフの なまえと いろ ---------- */
  KB.SPEAKERS = {
    tanjiro: { name: "たんじろう", color: "#7ef0b8" },
    giyu:    { name: "ぎゆう", color: "#9cc4ff" },
    akaza:   { name: "アカザ", color: "#ff9cc8" },
    koyuki:  { name: "こゆき", color: "#ffe08a" }
  };

  /* ---------- シーン ----------
     bg … draw.js の BGS の なまえ / items … もっていく どうぐの かず
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
    { id: "coming-1", emoji: "🔒", title: "つぎの たたかい", desc: "じゅんびちゅう… たのしみに まっててね", coming: true }
  ];
})(typeof window !== "undefined" ? window : globalThis);
