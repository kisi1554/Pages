'use strict';

/*
 * おはなしの データ
 *
 * キャラクターの みため・こえ・くちぐせは densha-talk/knowledge.js の
 * CHARACTERS に あわせて ある。
 *
 * 1ページ = 1つの ばめん。ばめんごとに
 *   え(bg + cast) / BGM / こうかおん / ちのぶん(narr) / セリフ(line) /
 *   こどもへの しつもん(ask)
 * を もつ。
 */

const CAST = {
  yamanoten: { id: 'yamanoten', name: 'やまのてん', hat: '🔁', aura: '💫', color: '#9acd32', ink: '#4f7a06', voice: { pitch: 1.35, rate: 1.0 } },
  toyoko: { id: 'toyoko', name: 'とうよこくん', hat: '🎧', aura: '✨', color: '#e6003e', ink: '#8f0026', voice: { pitch: 0.9, rate: 0.95 } },
  ginjiro: { id: 'ginjiro', name: 'ぎんじろう', hat: '🎩', aura: '🕰️', color: '#ff9500', ink: '#a35c00', voice: { pitch: 0.75, rate: 0.85 } },
  maruko: { id: 'maruko', name: 'まるこ', hat: '🎀', aura: '💬', color: '#f62e36', ink: '#a3151b', voice: { pitch: 1.5, rate: 1.05 } },
  roman: { id: 'roman', name: 'ろまんちゃん', hat: '👑', aura: '✨', color: '#0068b7', ink: '#00457a', voice: { pitch: 1.25, rate: 0.92 } },
  burukun: { id: 'burukun', name: 'ぶるくん', hat: '⛑️', aura: '🔦', color: '#0067c0', ink: '#00427a', voice: { pitch: 1.18, rate: 1.02 } },
  mirai: { id: 'mirai', name: 'みらいちゃん', hat: '🎡', aura: '🌊', color: '#004098', ink: '#002a63', voice: { pitch: 1.4, rate: 0.98 } },
  rinkai: { id: 'rinkai', name: 'りんかくん', hat: '🐟', aura: '🫧', color: '#005bac', ink: '#003a70', voice: { pitch: 1.05, rate: 1.05 } },
  keikyu: { id: 'keikyu', name: 'けいきゅん', hat: '🔥', aura: '💨', color: '#e5171f', ink: '#9b0d13', voice: { pitch: 0.95, rate: 1.15 } },
  tokaido: { id: 'tokaido', name: 'とうかいくん', hat: '🏖️', aura: '🌅', color: '#f68b1e', ink: '#a15a08', voice: { pitch: 0.95, rate: 0.9 } },
  miya: { id: 'miya', name: 'みやちゃん', hat: '🥟', aura: '🌾', color: '#82ae43', ink: '#4f6b1e', voice: { pitch: 1.3, rate: 1.0 } },
  uenotokyo: { id: 'uenotokyo', name: 'うえとうくん', hat: '🌉', aura: '🔗', color: '#6a5acd', ink: '#3d2f7a', voice: { pitch: 1.1, rate: 0.95 } },
  musashino: { id: 'musashino', name: 'むさしくん', hat: '🧭', aura: '🍃', color: '#e4610f', ink: '#8a3a00', voice: { pitch: 1.05, rate: 1.0 } },
  rizo: { id: 'rizo', name: 'リゾちゃん', hat: '🎈', aura: '🌈', color: '#d81b60', ink: '#7a0f3a', voice: { pitch: 1.3, rate: 1.02 } },
  denchan: { id: 'denchan', name: 'でんちゃん', hat: '🌿', aura: '💤', color: '#20a288', ink: '#0d6b58', voice: { pitch: 1.1, rate: 0.88 } },
};

/* いきさきは 3つ。2ページめの こたえで きまる */
const DESTS = {
  sea: { key: 'sea', word: 'うみ', long: 'うみの えき', emoji: '🌊' },
  mountain: { key: 'mountain', word: 'やま', long: 'やまの えき', emoji: '⛰️' },
  dream: { key: 'dream', word: 'ゆめのくに', long: 'ゆめのくにの えき', emoji: '🎠' },
};

/*
 * ask の かたち
 *   kind    : 'name' なまえを きく / 'free' なんでも OK /
 *             'pick' えらぶ / 'word' あいことばを いう
 *   options : [{ key, label, words, reply, emo, sfx, badge, set }]
 *             words の どれかが きこえたら その option。
 *             any:true は 「なにを いっても これ」(free 用)
 *   miss    : きこえた ことばが どれにも あてはまらない ときの へんじ
 *   give    : 2かい はずれたら、みとめて すすむ ときの へんじ
 */

const SCENES = [
  /* ---------------------------------------------------------- 1 */
  {
    id: 'asa',
    bg: 'stationMorning',
    bgm: 'morning',
    sfx: 'pop',
    cast: [{ id: 'yamanoten', x: 0.68, s: 1.3, emo: 'smile' }],
    narr: 'あさ。ひかりが きらきら する えきの まえ。\nきょうは はじめての ひとりたびの ひです。',
    line: { who: 'yamanoten', text: 'おはよう! ぼく やまのてん。とうきょうを ぐるぐる まわってる でんしゃだよ' },
    ask: {
      who: 'yamanoten',
      text: 'きみの なまえを おしえて?',
      hint: 'マイクを おして なまえを いってね。もじで うっても いいよ',
      kind: 'name',
      options: [
        {
          key: 'name',
          any: true,
          reply: '{name}! すてきな なまえだね。きょうは よろしく!',
          emo: 'wink',
          sfx: 'sparkle',
        },
      ],
      give: 'まだ ひみつ かな? じゃあ「たびびとさん」って よぶね!',
    },
  },

  /* ---------------------------------------------------------- 2 */
  {
    id: 'kippu',
    bg: 'ticketHall',
    bgm: 'morning',
    cast: [{ id: 'ginjiro', x: 0.53, s: 1.25, emo: 'smile' }],
    narr: 'えきの なかには きっぷうりばと かいさつが あります。\nしろい ひげの おじいさん でんしゃが まっていました。',
    line: { who: 'ginjiro', text: 'わしは ぎんじろう。にほんで いちばん ふるい ちかてつじゃ' },
    ask: {
      who: 'ginjiro',
      text: '{name}、きょうは どこへ いこうかのう? うみ? やま? ゆめのくに?',
      hint: 'いきたい ところを いってみよう',
      kind: 'pick',
      options: [
        {
          key: 'sea',
          label: '🌊 うみ',
          words: ['うみ', 'かい', 'ビーチ', 'びーち', 'さかな', 'なみ'],
          reply: 'うみか! よし、うみゆきの きっぷを 1まい。しおの においが するぞい',
          emo: 'proud',
          sfx: 'ok',
          set: { dest: 'sea' },
        },
        {
          key: 'mountain',
          label: '⛰️ やま',
          words: ['やま', 'もり', 'はこね', 'ふじ', 'たかい'],
          reply: 'やまか! よし、やまゆきの きっぷを 1まい。すずしい かぜが まってるぞい',
          emo: 'proud',
          sfx: 'ok',
          set: { dest: 'mountain' },
        },
        {
          key: 'dream',
          label: '🎠 ゆめのくに',
          words: ['ゆめ', 'ゆめのくに', 'パーク', 'ぱーく', 'おしろ', 'ゆうえんち'],
          reply: 'ゆめのくにか! よし、ゆめゆきの きっぷを 1まい。にじが かかっとるぞい',
          emo: 'proud',
          sfx: 'ok',
          set: { dest: 'dream' },
        },
      ],
      miss: 'ふむ? うみ、やま、ゆめのくに。どれが いいかのう?',
      give: 'まよっちゃうのう。では わしの おすすめ、うみに しようか!',
      giveSet: { dest: 'sea' },
    },
  },

  /* ---------------------------------------------------------- 3 */
  {
    id: 'hassha',
    bg: 'platformDay',
    bgm: 'morning',
    sfx: 'door',
    cast: [{ id: 'keikyu', x: 0.56, s: 1.3, emo: 'proud' }],
    narr: 'ホームに まっかな でんしゃが すべりこんで きました。\nプシュー。ドアが ひらきます。',
    line: { who: 'keikyu', text: 'おれ けいきゅん! あかくて とっても はやいぜ! さあ のった のった!' },
    ask: {
      who: 'keikyu',
      text: 'でんしゃが うごきだす とき、なんて いうか しってる? 「しゅっぱつ しんこう!」って いってみて!',
      hint: 'おおきな こえで 「しゅっぱつ しんこう!」',
      kind: 'word',
      options: [
        {
          key: 'ok',
          label: '📣 しゅっぱつ しんこう!',
          words: ['しゅっぱつ', 'しんこう', 'はっしゃ', 'ごー', 'ゴー', 'いってらっしゃい'],
          reply: 'しゅっぱつ しんこう!! いい こえだ! いくぜ、つかまってろよ!',
          emo: 'proud',
          sfx: 'bell',
          badge: 'しゅっぱつの あいず',
        },
      ],
      miss: 'おしい! 「しゅっぱつ しんこう」だ。もういっかい いってみな!',
      give: 'うん、いまのも かっこよかったぜ! それじゃ、しゅっぱーつ!',
      giveSfx: 'bell',
    },
  },

  /* ---------------------------------------------------------- 4 */
  {
    id: 'shanai',
    bg: 'inside',
    bgm: 'run',
    run: 'slow',
    cast: [{ id: 'maruko', x: 0.5, s: 1.25, emo: 'smile', y: 0.9 }],
    narr: 'ガタン ゴトン、ガタン ゴトン。\nでんしゃが はしりだしました。まどの けしきが ながれます。',
    line: { who: 'maruko', text: 'まるこだよ! ちかてつなのに とちゅうで そとに でちゃうの!' },
    ask: {
      who: 'maruko',
      text: 'ねえねえ、この でんしゃ なんりょう つながってると おもう?',
      hint: 'すきな かずを いってね。どれでも せいかい だよ',
      kind: 'pick',
      options: [
        {
          key: 'n3',
          label: '3りょう',
          words: ['3', '３', 'さん', 'みっつ'],
          reply: '3りょう! みじかくて かわいい でんしゃだね。まちと まちを むすぶ せんに おおいの',
          emo: 'smile',
          sfx: 'ok',
        },
        {
          key: 'n6',
          label: '6りょう',
          words: ['6', '６', 'ろく', 'むっつ'],
          reply: '6りょう! ちかてつに よく ある ながさなの。わたしと おなじだね!',
          emo: 'star',
          sfx: 'ok',
        },
        {
          key: 'n10',
          label: '10りょう',
          words: ['10', '１０', 'じゅう', 'とお'],
          reply: '10りょう! すっごく ながい! おおきな まちを はしる でんしゃは そのくらい あるの',
          emo: 'surprise',
          sfx: 'ok',
        },
      ],
      miss: 'えー! そうなの? もういちど、かずで おしえて?',
      give: 'ふふ、でんしゃに よって ちがうんだよ。3りょうも 10りょうも みんな なかま!',
    },
  },

  /* ---------------------------------------------------------- 5 */
  {
    id: 'fumikiri',
    bg: 'crossing',
    bgm: 'run',
    sfx: 'crossing',
    cast: [{ id: 'musashino', x: 0.72, s: 1.25, emo: 'surprise' }],
    narr: 'カン カン カン カン。\nふみきりの あかい ライトが ぴかぴか ひかります。',
    line: { who: 'musashino', text: 'ぼく むさしくん。まちの そとがわを ぐるっと まわってるよ。あっ、ふみきりだ!' },
    ask: {
      who: 'musashino',
      text: 'カンカンが なったら どうする? 「とまる」? それとも 「わたる」?',
      hint: 'あんぜんの おやくそくだよ',
      kind: 'pick',
      options: [
        {
          key: 'stop',
          label: '✋ とまる',
          words: ['とまる', 'とまれ', 'とまり', 'まつ', 'まって', 'ストップ', 'すとっぷ'],
          reply: 'せいかい! カンカンが なったら ぜったいに とまって、でんしゃが いくのを まつんだ。えらい!',
          emo: 'proud',
          sfx: 'ok',
          badge: 'あんぜん めいじん',
        },
        {
          key: 'go',
          label: '🏃 わたる',
          words: ['わたる', 'いく', 'はしる', 'すすむ'],
          reply: 'あぶない! カンカンが なったら とまるんだ。でんしゃは きゅうには とまれないからね。おぼえた?',
          emo: 'surprise',
          sfx: 'again',
          badge: 'あんぜん めいじん',
        },
      ],
      miss: 'んー? 「とまる」か 「わたる」、どっちかな?',
      give: 'こたえは 「とまる」! カンカンが なったら とまって まつ。だいじな おやくそくだよ',
      giveBadge: 'あんぜん めいじん',
    },
  },

  /* ---------------------------------------------------------- 6 */
  {
    id: 'norikae',
    bg: 'transfer',
    bgm: 'morning',
    sfx: 'door',
    cast: [{ id: 'uenotokyo', x: 0.3, s: 1.25, emo: 'smile' }],
    narr: 'おおきな えきに とうちゃく。\nここで べつの でんしゃに のりかえます。ホームは ふたつ あります。',
    line: { who: 'uenotokyo', text: 'ぼく うえとうくん。のりかえ なしで とおくの まちを つなぐのが とくいなんだ' },
    ask: {
      who: 'uenotokyo',
      text: '{destWord}へ いくのは、1ばんせん? 2ばんせん? ひょうじばんを みて えらんでね',
      hint: 'ひょうじばんには 「➡ 1ばんせん」って でてるよ',
      kind: 'pick',
      options: [
        {
          key: 'p1',
          label: '1️⃣ 1ばんせん',
          words: ['1', '１', 'いち', 'ひとつ', 'いちばん'],
          reply: 'せいかい! ひょうじばんを ちゃんと みたね。1ばんせんの でんしゃに のろう!',
          emo: 'proud',
          sfx: 'ok',
          badge: 'のりかえ めいじん',
        },
        {
          key: 'p2',
          label: '2️⃣ 2ばんせん',
          words: ['2', '２', 'に', 'ふたつ', 'にばん'],
          reply: 'おしい! 2ばんせんは はんたい むきなんだ。ひょうじばんを みると 1ばんせん だよ。いっしょに いこう!',
          emo: 'think',
          sfx: 'again',
        },
        {
          key: 'ask',
          label: '🤔 わからない',
          words: ['わからない', 'わかんない', 'しらない', 'おしえて'],
          reply: 'だいじょうぶ! こまったら ひょうじばんを みるか、えきいんさんに きくんだ。こたえは 1ばんせん だよ',
          emo: 'smile',
          sfx: 'pop',
        },
      ],
      miss: 'ひょうじばんを みてみて。1ばんせん? 2ばんせん?',
      give: 'こたえは 1ばんせん! こっちの ホームに いこう',
    },
  },

  /* ---------------------------------------------------------- 7 */
  {
    id: 'tunnel',
    bg: 'tunnel',
    bgm: 'tunnel',
    run: 'slow',
    cast: [
      { id: 'rinkai', x: 0.28, s: 1.1, emo: 'smile' },
      { id: 'burukun', x: 0.73, s: 1.1, emo: 'smile' },
    ],
    narr: 'トンネルに はいりました。\nそとが まっくらに なって、まどが かがみに なります。',
    line: { who: 'rinkai', text: 'ぼく りんかくん。うみの したを くぐるのが とくいだよ。まっくらでも へっちゃら!' },
    ask: {
      who: 'burukun',
      text: 'ぼくは ぶるくん。まっくらだけど……こわい? へいき?',
      hint: 'おもった ことを そのまま いってね',
      kind: 'pick',
      options: [
        {
          key: 'fine',
          label: '😄 へいき!',
          words: ['へいき', 'だいじょうぶ', 'こわくない', 'たのしい', 'すき', 'わくわく'],
          reply: 'つよいなあ! じゃあ ぼくの ヘッドライトで もっと あかるく してあげる。ピカッ!',
          emo: 'proud',
          sfx: 'sparkle',
        },
        {
          key: 'scared',
          label: '😢 ちょっと こわい',
          words: ['こわい', 'ちょっと', 'どきどき', 'くらい', 'いや'],
          reply: 'うん、くらいと どきどき するよね。ぼくが ライトを つけるよ。ほら、もう あかるい。となりに いるからね',
          emo: 'smile',
          sfx: 'sparkle',
        },
      ],
      miss: 'んー、きこえなかった。こわい? へいき?',
      give: 'どっちでも いいんだ。ぼくが ライトを つけて いっしょに いくからね',
      after: 'とおくに ちいさな ひかりが みえてきました。トンネルの でぐちです。',
    },
  },

  /* ---------------------------------------------------------- 8 */
  {
    id: 'shashou',
    bg: 'inside',
    bgm: 'run',
    run: 'slow',
    cast: [{ id: 'miya', x: 0.5, s: 1.25, emo: 'smile', y: 0.9 }],
    narr: 'つぎは しゃしょうさん ごっこ。\nマイクを もって、つぎの えきを あんない します。',
    line: { who: 'miya', text: 'わたし みやちゃん。ぎょうざの まちまで はしるの。{name}、しゃしょうさんを やってみない?' },
    ask: {
      who: 'miya',
      text: '「つぎは、ゆめがおか です」って いってみて!',
      hint: 'ゆっくりで だいじょうぶ。「つぎは ゆめがおか です」',
      kind: 'word',
      options: [
        {
          key: 'ok',
          label: '🎫 つぎは、ゆめがおか です',
          words: ['つぎ', 'ゆめがおか', 'ゆめが', 'ゆめ'],
          reply: 'わあ、ほんものの しゃしょうさん みたい! おきゃくさんも にこにこ してるよ。めんきょ しょう を あげる!',
          emo: 'star',
          sfx: 'door',
          badge: 'しゃしょう めんきょ',
        },
      ],
      miss: 'もういちど! 「つぎは、ゆめがおか です」',
      give: 'じょうずだったよ! つぎは いっしょに いおうね。「つぎは、ゆめがおか です」',
      giveBadge: 'しゃしょう めんきょ',
    },
  },

  /* ---------------------------------------------------------- 9 */
  {
    id: 'shasou',
    bg: 'seaWindow',
    bgm: 'sea',
    run: 'slow',
    cast: [{ id: 'tokaido', x: 0.7, s: 1.3, emo: 'smile' }],
    narr: 'まどの そとが ぱっと あかるく なりました。\nおひさまが きらきら、けしきが ながれていきます。',
    line: { who: 'tokaido', text: 'ぼく とうかいくん。にほんで さいしょの てつどうの なかまだよ。けしきを みるのが だいすきなんだ' },
    ask: {
      who: 'tokaido',
      text: 'まどから なにが みえる? おしえて!',
      hint: 'みえた ものを いってね(うみ、やね、くも、なんでも)',
      kind: 'free',
      options: [
        {
          key: 'free',
          any: true,
          reply: '{answer}か! ほんとうだ、よく みつけたね。まどの そとは たからものだらけだよ',
          emo: 'star',
          sfx: 'sparkle',
        },
      ],
      give: 'ふふ、みえた ものは こころの なかに しまって おこうね',
    },
  },

  /* ---------------------------------------------------------- 10 */
  {
    id: 'touchaku',
    bgm: 'sea',
    sfx: 'door',
    byDest: {
      sea: {
        bg: 'seaWindow',
        cast: [
          { id: 'mirai', x: 0.3, s: 1.15, emo: 'star' },
          { id: 'tokaido', x: 0.72, s: 1.15, emo: 'smile' },
        ],
        narr: 'プシュー。ドアが ひらきました。\nしおの かおりと、ざざーんという なみの おと。うみの えきに とうちゃくです!',
        line: { who: 'mirai', text: 'わたし みらいちゃん! みなとの したを はしってるの。ようこそ、うみの まちへ!' },
      },
      mountain: {
        bg: 'mountain',
        cast: [
          { id: 'roman', x: 0.3, s: 1.15, emo: 'star' },
          { id: 'denchan', x: 0.73, s: 1.15, emo: 'smile' },
        ],
        narr: 'プシュー。ドアが ひらきました。\nすずしい かぜと、とりの こえ。やまの えきに とうちゃくです!',
        line: { who: 'roman', text: 'わたし ろまんちゃん。やまの おくまで はしる とっきゅうよ。ようこそ、やまの まちへ!' },
      },
      dream: {
        bg: 'dreamland',
        cast: [
          { id: 'rizo', x: 0.3, s: 1.15, emo: 'star' },
          { id: 'maruko', x: 0.73, s: 1.15, emo: 'smile' },
        ],
        narr: 'プシュー。ドアが ひらきました。\nおんがくと、そらに うかぶ ふうせん。ゆめのくにに とうちゃくです!',
        line: { who: 'rizo', text: 'わたし リゾちゃん! ゆめのくにを まぁるく ぐるり。ようこそ!' },
      },
    },
    ask: {
      text: 'ついたよ! みんなで なんて いう? 「ばんざーい!」',
      hint: 'ばんざーい! りょうての ポーズも いっしょに!',
      kind: 'word',
      options: [
        {
          key: 'ok',
          label: '🙌 ばんざーい!',
          words: ['ばんざい', 'ばんざーい', 'やった', 'わーい', 'わあ', 'ついた', 'うれしい'],
          reply: 'ばんざーい! {name}、はじめての ひとりたび、だいせいこう!',
          emo: 'star',
          sfx: 'clap',
          badge: 'とうちゃく',
        },
      ],
      miss: 'もういちど! りょうてを あげて 「ばんざーい!」',
      give: 'ばんざーい! よく ここまで きたね!',
      giveBadge: 'とうちゃく',
      giveSfx: 'clap',
    },
  },

  /* ---------------------------------------------------------- 11 */
  {
    id: 'arigatou',
    bgm: 'sea',
    byDest: {
      sea: { bg: 'seaWindow' },
      mountain: { bg: 'mountain' },
      dream: { bg: 'dreamland' },
    },
    cast: [
      { id: 'yamanoten', x: 0.16, s: 0.85, emo: 'smile' },
      { id: 'keikyu', x: 0.39, s: 0.85, emo: 'proud' },
      { id: 'ginjiro', x: 0.61, s: 0.85, emo: 'smile' },
      { id: 'musashino', x: 0.84, s: 0.85, emo: 'wink' },
    ],
    narr: 'きょう であった みんなが、ホームに あつまって きました。\nおわかれの じかんです。',
    line: { who: 'yamanoten', text: 'たのしかったね! ぼくたち、ずっと ここで はしってるからね' },
    ask: {
      who: 'yamanoten',
      text: 'のせて くれた みんなに、なんて いう?',
      hint: '「ありがとう」って いってみよう',
      kind: 'word',
      options: [
        {
          key: 'ok',
          label: '💛 ありがとう',
          words: ['ありがとう', 'ありがと', 'あんがと', 'サンキュー', 'さんきゅ'],
          reply: 'こちらこそ ありがとう! そう いって もらえると、ぼくたち もっと はやく はしれるんだ',
          emo: 'star',
          sfx: 'sparkle',
          badge: 'ありがとうの きもち',
        },
      ],
      miss: 'んー、きこえなかった。「ありがとう」って いってみて!',
      give: 'ふふ、きもちは ちゃんと つたわったよ。こちらこそ ありがとう!',
      giveBadge: 'ありがとうの きもち',
    },
  },

  /* ---------------------------------------------------------- 12 */
  {
    id: 'yoru',
    bg: 'depot',
    bgm: 'night',
    cast: [
      { id: 'denchan', x: 0.3, s: 1.15, emo: 'sleepy' },
      { id: 'yamanoten', x: 0.72, s: 1.15, emo: 'sleepy' },
    ],
    narr: 'よるの しゃこ。ほしが きらきら。\nきょう いちにち はしった でんしゃたちが、ならんで ねむります。',
    line: { who: 'denchan', text: 'ぼく でんちゃん。きょうは たのしかったなあ……ふぁあ' },
    ask: {
      who: 'denchan',
      text: 'でんしゃたちに、ねる まえの あいさつを しよう',
      hint: '「おやすみ」って いってみよう',
      kind: 'word',
      options: [
        {
          key: 'ok',
          label: '🌙 おやすみ',
          words: ['おやすみ', 'おやすみなさい', 'ばいばい', 'またね', 'グッナイ'],
          reply: 'おやすみ、{name}……。あしたも どこかの まちで、また あおうね……すやすや',
          emo: 'sleepy',
          sfx: 'sparkle',
          badge: 'おやすみの あいさつ',
        },
      ],
      miss: 'ふぁあ……なんて いったの? 「おやすみ」かな?',
      give: 'おやすみ、{name}……また あそぼうね……すやすや',
      giveBadge: 'おやすみの あいさつ',
    },
  },
];
