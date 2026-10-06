'use strict';

/*
 * つくぼうの あたま(かいわの しくみ)
 *  - こどもの ことばを ひらがなに そろえて、キーワードで わだいを えらぶ
 *  - へんじは まいかい ランダム。%N は「あおくん」などの なまえに おきかわる
 *  - いじわるは「からかう」ていど。こどもが いやがったら すぐ あやまって なかなおりする
 *  - action を かえすと、app.js が かくれんぼ・なきごえ などを はじめる
 */

const Tsuku = (function () {
  /* カタカナ → ひらがな、きごう・くうはくを けす */
  const V = typeof TsukuVocab === 'object' ? TsukuVocab : {};
  const D = typeof TsukuDict === 'object' ? TsukuDict : { words: [], cats: {} };
  // じてんの かんじも よみかえ表に いれる(よく つかう 1もじの かんじは ほかの ことばを こわすので いれない)
  const BLOCK1 = '日月火水木金土年人時分上下中大小子手目口本出入生見行来気名前後今何先学校心力足音天色一十百千万億零間方家車電話歯血息声頭顔鼻芽根葉実種花草竹石雨雪風雲星空海山川池田林森島橋道町村市国王赤青白黒';
  V.kana = V.kana || [];
  D.words.forEach((w) => {
    if (w.kanji && (w.kanji.length > 1 || BLOCK1.indexOf(w.kanji) < 0)) V.kana.push([w.kanji, w.kana]);
  });
  // ながい ことばから さきに おきかえる(「大好き」を「好き」より さきに)
  const KANA = (V.kana || []).slice().sort((a, b) => b[0].length - a[0].length);

  // かんじが あるときだけ よみかえ表を みる(じてんの よみがなは かんじが ないので はやい)
  const HAS_KANJI = /[\u3400-\u9fff々]/;
  function kanaMap(t) {
    if (!HAS_KANJI.test(t)) return t;
    KANA.forEach(([k, v]) => {
      if (t.indexOf(k) >= 0) t = t.split(k).join(v);
    });
    return t;
  }

  function norm(s) {
    let t = kanaMap(String(s || ''));
    return t
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[\sー〜~、。！!？?・,.　「」『』（）()]/g, '')
      .toLowerCase();
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* おなじ へんじが つづかないように、さいきん つかった ものを よける */
  const recent = [];
  function pickFresh(arr) {
    const fresh = arr.filter((x) => recent.indexOf(x) < 0);
    const v = pick(fresh.length ? fresh : arr);
    recent.push(v);
    if (recent.length > 24) recent.shift();
    return v;
  }

  /* ---------------------------- セリフ ---------------------------- */

  // ちょっと いじわる(からかい)。ひどい ことは いわない
  const TEASE = [
    '%N、また ぼくを みつけられなかったでしょ。ツクツク〜',
    '%Nって、かくれんぼ ちょっと よわいよね。ぷぷっ',
    '%N、きのう ねぐせ ついてたよ。ぼく きのうえから みてたもん',
    '%Nの こえ、ぼくより ちいさいね。オーシンツクツク〜！',
    '%N、さっき あくび してたでしょ。ぼくには ぜんぶ みえてるよ',
    'ぼくの ほうが %Nより ずーっと かくれるの うまいもんね〜',
    '%N、また おやつ こぼしたの？ はっぱの うえから みえたよ',
  ];

  // あいづち(わからない とき)
  const AIZUCHI = [
    'ふーん、そうなんだ。…で、それって かくれんぼより おもしろいの？',
    'へえ〜。%Nにしては なかなか いいこと いうじゃん',
    'ツクツク…？ ちょっと よく わかんなかった。もういっかい いって',
    'ほうほう。ぼく せみだから むずかしい ことは しらないよ〜',
    'ふむふむ。じゃあさ、かくれんぼ しない？',
    'それ ほんと？ %N、また ぼくを だまそうと してない？',
  ];

  // しずかな とき に つくぼうから はなしかける
  const IDLE = [
    'おーい、%N。ねちゃったの？ ツクツクボーシ！',
    'ねえねえ %N、かくれんぼ しようよ〜',
    '%N、だまってると ぼく かくれちゃうよ？',
    'ぼくが いま どこに いるか わかる？ わかんないでしょ〜',
    'ねえ、ぼくの なきごえ きく？',
  ];

  const FACTS = [
    'ぼくたち ツクツクボウシはね、なつの おわりに なくんだ。みんなが かえる ころに やっと でてくるの。かっこいいでしょ',
    'ぼくの なきごえは「オーシンツクツク、ツクツクボーシ」。さいごは「ウイヨース」って しめるんだよ',
    'つちの なかには だいたい 2ねん いたんだ。%Nが あかちゃんの ころから ずっと したに いたかもね',
    'ぼくの からだは ほそくて みどりと くろの もよう。だから きの えだに いると みつからないんだ。これが かくれんぼの ひみつ',
    'なくのは オスだけ。おなかを ふるわせて おとを だしてるんだよ。%N、おなかで こえ だせる？ できないでしょ〜',
    'ぼくたちは きの しるを ストローみたいな くちで のむの。%Nの ジュースより おいしいかもね',
    'ぬけがらは ぼくの むかしの ふく。%N、みつけたら おしえてよ。…まあ どうせ みつけられないか',
  ];

  /* わだい: keys の どれかが ふくまれたら へんじ する(うえから じゅんに しらべる) */
  const TOPICS = [
    {
      id: 'why',
      keys: ['なんでいじわる', 'どうしていじわる', 'なんでからかう', 'どうしてからかう'],
      say: [
        'だって %Nの はんのうが おもしろいんだもん。…ほんとは なかよく したいだけ',
        'ともだちだから ちょっと からかいたく なるの。%Nも ぼくに いいかえして いいよ',
      ],
      mood: 'shy',
      chips: ['つくぼうの ばーか', 'いいよ', 'かくれんぼ しよう'],
    },
    {
      id: 'tease',
      keys: ['いじわるいって', 'からかって', 'もっといって', 'なにかいって'],
      say: TEASE,
      mood: 'smug',
    },
    {
      id: 'sorry', // こどもが いやがった とき → すぐ あやまる
      keys: ['いじわる', 'やめて', 'きらい', 'いや', 'ひどい', 'かなしい', 'ないちゃう', 'ないた', 'むかつく', 'おこった', 'おこる', 'いたい'],
      say: [
        'あっ…ごめんね %N。ちょっと からかい すぎた。ほんとは %Nの こと だいすきだよ',
        'ごめんごめん！ いじわる いいすぎた。%Nは ぼくの だいじな ともだちだもん',
        'う…ごめん。%Nが すきだから つい からかっちゃうんだ。なかなおり しよ？',
      ],
      mood: 'sorry',
      chips: ['いいよ', 'かくれんぼ しよう', 'もう いわないでね'],
    },
    {
      id: 'promise',
      keys: ['もういわないで', 'いわないで', 'やくそく'],
      say: [
        'うん、やくそく。もう いじわる いわない。…たぶん。ツクツク',
        'わかった。%Nが いやな ことは いわないよ。ゆびきり！',
      ],
      mood: 'shy',
      chips: ['かくれんぼ しよう', 'なきごえ きかせて'],
    },
    {
      id: 'forgive',
      keys: ['いいよ', 'ゆるす', 'なかなおり'],
      say: [
        'やったー！ ありがと %N。…でも かくれんぼでは てかげん しないからね',
        'えへへ。%Nって やさしいね。そういう とこ すき',
      ],
      mood: 'happy',
      chips: ['かくれんぼ しよう', 'なきごえ きかせて'],
    },
    {
      id: 'comeback', // こどもが いいかえした
      keys: ['ばか', 'よわむし', 'へたくそ', 'おまえ', 'ちび', 'うるさい'],
      say: [
        'むむっ、%N いうじゃん！ でも ぼく せみだから きのうえで きこえませーん',
        'がーん！ …まあ ぼくも いじわる いったし、おあいこ だね',
        'ツクツク…いまの ちょっと ささった。%N つよいなあ',
      ],
      mood: 'shocked',
      chips: ['ごめんね', 'かくれんぼ しよう', 'なかなおり'],
    },
    {
      id: 'kidsorry',
      keys: ['ごめん'],
      say: [
        'いいよ %N。ぼくも いじわる いうから おあいこ！',
        'へへ、きにしてないよ。ぼくたち ともだちだもんね',
      ],
      mood: 'happy',
      chips: ['かくれんぼ しよう', 'セミの ひみつ おしえて'],
    },
    {
      id: 'hide', // こどもが かくれる
      keys: ['ぼくがかくれる', 'おれがかくれる', 'わたしがかくれる', 'あおがかくれる', 'かくれるね', 'さがして', 'おにやって', 'つくぼうがおに'],
      say: [
        'いいよ。%Nが かくれる ばんね。ぜったい みつけちゃうから！',
        'へえ〜 %Nが かくれるの？ ぼく みつけるのも うまいんだよね〜',
      ],
      mood: 'smug',
      action: 'hide',
    },
    {
      id: 'seek', // つくぼうが かくれる
      keys: ['かくれんぼ', 'かくれて', 'あそぼ', 'あそぼう', 'あそんで', 'げむ', 'やっぱりあそぶ', 'しょうぶ'],
      say: [
        'ふふーん、かくれんぼ？ いいよ。どうせ %Nには みつけられないけどね〜',
        'よーし、かくれるよ！ %N、10 かぞえてね。…ずる しちゃ だめだよ',
        'ぼくは かくれんぼの めいじん。%N、こんどこそ みつけられるかな〜？',
      ],
      mood: 'smug',
      action: 'seek',
    },
    {
      id: 'sing',
      keys: ['なきごえ', 'ないて', 'うたって', 'うた', 'こえきかせ', 'つくつくぼし', 'つくつくぼうし', 'おしんつくつく'],
      say: [
        'しかたないなあ。とくべつだよ。いくよ〜',
        'ぼくの なきごえ、よーく きいてて！',
      ],
      mood: 'sing',
      action: 'sing',
    },
    {
      id: 'fact',
      keys: ['ひみつ', 'おしえて', 'せみ', 'つちのなか', 'ぬけがら', 'なにたべ', 'なにのむ', 'なんで'],
      say: FACTS,
      mood: 'smug',
      chips: ['もっと おしえて', 'なきごえ きかせて', 'かくれんぼ しよう'],
    },
    {
      id: 'name',
      keys: ['なまえ', 'だれ', 'きみは'],
      say: [
        'ぼくは つくぼう。ツクツクボウシの つくぼうだよ。かくれんぼの めいじん！',
        'え、しらないの？ つくぼうだよ。%Nの ともだちの つくぼう！',
      ],
      mood: 'smug',
      chips: ['なんさい？', 'どこに すんでるの？', 'かくれんぼ しよう'],
    },
    {
      id: 'age',
      keys: ['なんさい', 'としは', 'いくつ'],
      say: [
        'つちの なかで 2ねん、そとに でて まだ 1しゅうかん。…%Nより わかいかもね。ぷぷ',
        'つちの なかに 2ねんも いたんだよ。%Nより がまん づよいでしょ',
      ],
      mood: 'smug',
      chips: ['どこに すんでるの？', 'セミの ひみつ おしえて'],
    },
    {
      id: 'home',
      keys: ['どこにすん', 'おうち', 'いえ', 'どこにいる', 'どこにいるの'],
      say: [
        'こうえんの いちばん おおきい さくらの き。…あ、いっちゃった。ないしょだよ',
        'ひみつ〜。おしえたら かくれんぼで すぐ みつかっちゃうでしょ',
      ],
      mood: 'shy',
      chips: ['かくれんぼ しよう', 'なんさい？'],
    },
    {
      id: 'praise', // ほめられると てれる
      keys: ['すごい', 'じょうず', 'かっこいい', 'かわいい', 'だいすき', 'すきだよ', 'てんさい', 'えらい', 'やるじゃん'],
      say: [
        'え、えへへ…。%Nに ほめられると ちょっと てれる。ツクツク…',
        'と、とうぜんでしょ！ …でも ありがと %N',
        'ふふーん、もっと いって いいよ〜',
      ],
      mood: 'shy',
      chips: ['かくれんぼ しよう', 'なきごえ きかせて'],
    },
    {
      id: 'thanks',
      keys: ['ありがと', 'さんきゅ'],
      say: ['どういたしまして。%N、たまには ちゃんと おれい いえるじゃん', 'へへん。また なんでも きいてよ'],
      mood: 'happy',
    },
    {
      id: 'hello',
      keys: ['こんにちは', 'おはよ', 'こんばんは', 'やあ', 'はじめまして', 'もしもし'],
      say: [
        'あ、%N。きょうも ねぐせ ついてる？ ぷぷっ。…うそうそ、こんにちは！',
        'やっほー %N！ ツクツクボーシ！ きょうは なに して あそぶ？',
        'おっ、%N きたね。まってたよ。…べつに さびしかった わけじゃ ないからね',
      ],
      mood: 'happy',
    },
    {
      id: 'today',
      keys: ['きょう', 'ようちえん', 'ほいくえん', 'がっこう', 'こうえん', 'たのしかった'],
      say: [
        'へえ〜、%Nの きょうの はなし もっと ききたい。…ぼくは ずっと きのうえで ないてたよ',
        'いいなあ。ぼくも いきたかった。こんど いく とき、ポケットに かくれて ついて いこうかな',
      ],
      mood: 'happy',
    },
    {
      id: 'bye',
      keys: ['ばいばい', 'またね', 'さようなら', 'おやすみ', 'ねる'],
      say: [
        'またね %N！ ぼくは きのうえに かくれて みてるからね〜。ウイヨース！',
        'えー もう いっちゃうの？ …べつに いいけど。またね、%N',
      ],
      mood: 'shy',
      chips: ['やっぱり あそぶ', 'かくれんぼ しよう'],
    },
  ];

  /* ---------------------- vocab.js の ことばを たす ---------------------- */
  TEASE.push(...(V.tease || []));
  AIZUCHI.push(...(V.aizuchi || []));
  IDLE.push(...(V.idle || []));
  FACTS.push(...(V.facts || []));
  Object.keys(V.extra || {}).forEach((id) => {
    const t = TOPICS.find((x) => x.id === id);
    if (t && t.say !== TEASE && t.say !== FACTS) t.say = t.say.concat(V.extra[id]);
  });
  // あたらしい わだいは「セミの ひみつ」(ひろく ひっかかる)より まえ、もとの わだいより あと
  {
    const fi = TOPICS.findIndex((x) => x.id === 'fact');
    const fact = TOPICS.splice(fi, 1)[0];
    const all = V.topics || [];
    TOPICS.unshift(...all.filter((x) => x.first));
    TOPICS.push(...all.filter((x) => !x.first));
    TOPICS.push(
      { id: 'callName', keys: ['つくぼう'], say: ['なあに %N？ よんだ？', 'はーい、つくぼう だよ。なにか よう？', 'ツクツク！ ここだよ〜。…どこかは ひみつ'], mood: 'smug' },
      { id: 'riddle', keys: ['なぞなぞ', 'くいず', 'もんだい', 'もういっこ'], game: 'riddle' },
      { id: 'janken', keys: ['じゃんけん'], game: 'janken' },
      fact
    );
  }

  // 「すきな 〇〇は？」(たべもの・いろ・きせつ・きらいな ものは もとの わだいで こたえる)
  const FAVKEYS = [
    ['どうぶつ', 'animal'], ['とり', 'bird'], ['さかな', 'sea'], ['うみのいきもの', 'sea'], ['むし', 'bug'],
    ['くだもの', 'fruit'], ['やさい', 'veggie'], ['おやつ', 'sweets'], ['おかし', 'sweets'], ['のみもの', 'drink'],
    ['のりもの', 'vehicle'], ['ばしょ', 'place'], ['おもちゃ', 'toy'], ['あそび', 'toy'], ['すぽつ', 'sport'],
    ['はな', 'plant'], ['しょくぶつ', 'plant'], ['おはなし', 'story'], ['えほん', 'story'], ['ぎょうじ', 'event'],
    ['しごと', 'person'], ['ことば', null],
  ].filter(([, c]) => c === null || D.cats[c]);
  TOPICS.unshift({
    id: 'favq',
    first: true,
    special: 'favq',
    mood: 'shy',
    say: [],
    keys: FAVKEYS.map(([k]) => 'すきな' + k),
  });

  // じてんの カテゴリ クイズ(「どうぶつ クイズ」など)
  TOPICS.unshift({
    id: 'catquiz',
    first: true,
    special: 'catquiz',
    mood: 'smug',
    say: [],
    keys: Object.keys(D.cats)
      .filter((k) => !D.cats[k].sentence)
      .map((k) => D.cats[k].label.split('・')[0] + 'くいず')
      .concat(['なーんだくいず', 'あてっこ', 'あてっこくいず']),
  });

  // キーワードも norm で そろえる(「しーっ」→「しっ」など)
  TOPICS.forEach((t) => (t.keys = t.keys.map(norm).filter(Boolean)));

  /* いちばん ながく あった キーワードの わだいを えらぶ(おなじ ながさなら うえの わだい) */
  // weak の わだい(「きょう」「つくぼう」「セミ」など ひろい ことば)は、ほかに あわない ときだけ
  function bestTopic(n, skip) {
    lastLen = 0;
    lastKey = '';
    bestTopic.len = 0;
    bestTopic.key = '';
    if (!n) return null;
    const find = (weak) => {
      let best = null;
      let len = 0;
      let bk = '';
      for (const t of TOPICS) {
        if ((skip && skip(t)) || !!t.weak !== weak) continue;
        for (const k of t.keys) {
          if (k.length > len && n.indexOf(k) >= 0) {
            best = t;
            len = k.length;
            bk = k;
          }
        }
      }
      if (best) {
        lastLen = len;
        lastKey = bk;
      }
      return best;
    };
    const a = find(false);
    const r = a || find(true);
    bestTopic.len = lastLen;
    bestTopic.key = lastKey;
    return r;
  }
  let lastLen = 0;
  let lastKey = '';
  ['today', 'fact', 'callName', 'hello'].forEach((id) => {
    const t = TOPICS.find((x) => x.id === id);
    if (t) t.weak = true;
  });

  const DEFAULT_CHIPS = [
    'かくれんぼ しよう',
    'ぼくが かくれる',
    'なきごえ きかせて',
    'セミの ひみつ おしえて',
    'なんで いじわる いうの？',
    'なまえは？',
    'なんさい？',
    'すごいね',
    'つくぼうの ばーか',
    'こんにちは',
    'なぞなぞ だして',
    'じゃんけん しよう',
    'すきな たべものは？',
    'こわい ものは ある？',
    'ともだち いる？',
    'でんしゃ すき？',
    'とくいな ことは？',
    'おもしろい こと いって',
    'ぼくも ともだち？',
    'ゆめは なに？',
    'しりとり しよう',
    'いま なんじ？',
    'たしざん だして',
    'はやくちことば いって',
    'ものまね して',
    'かくれる こつ おしえて',
    'きょうは なんようび？',
    'すきな どうぶつは？',
    'おにごっこ しよう',
    'どこに すんでるの？',
    'あいたかった',
    'なんで なくの？',
  ];

  /*
   * えらべる ことば(チップ) 4つ
   *  - わだいが あれば その つづき(chips.js の follow ＋ わだいの chips)から 3つ
   *  - のこりは ふだんの グループ(あそび・しつもん・セミ・はなし・ものしり)から ばらばらに
   *  - ときどき じてんの ことばから「〇〇 しってる？」を まぜる
   */
  const C = typeof TsukuChips === 'object' ? TsukuChips : { groups: {}, follow: {} };
  const GROUPS = Object.keys(C.groups || {}).filter((g) => C.groups[g].length);
  const shuffle = (a) => a.slice().sort(() => Math.random() - 0.5);
  const CHIP_WORDS = D.words.filter((w) => !w.sentence && w.show.length <= 7);
  function dictChip(w) {
    const x = w || pick(CHIP_WORDS);
    if (!x) return null;
    const lab = ((D.cats[x.cat] || {}).label || '').split('・')[0];
    return pick(C.dict || ['%W しってる？']).replace(/%W/g, x.show).replace(/%L/g, lab);
  }
  function chipsFor(topic, extra) {
    const out = [];
    const addc = (c) => c && out.indexOf(c) < 0 && out.length < 4 && out.push(c);
    const follow = topic ? ((C.follow || {})[topic.id] || []).concat(topic.chips || []) : [];
    shuffle(follow).slice(0, 3).forEach(addc);
    (extra || []).forEach(addc);
    if (!GROUPS.length) shuffle(DEFAULT_CHIPS).forEach(addc);
    if (Math.random() < 0.35) addc(dictChip());
    let guard = 0;
    while (out.length < 4 && guard++ < 20) {
      const g = C.groups[pick(GROUPS)] || DEFAULT_CHIPS;
      addc(pick(g));
    }
    return out;
  }

  let turns = 0;

  /* つづきの ある かいわ(なぞなぞ・じゃんけん・しつもんの こたえ) */
  const state = { riddle: null, janken: false, asked: null, shiritori: null, math: null };
  // これらの わだいは つづきの とちゅうでも ゆうせん する
  const STRONG = ['catquiz', 'shiritori', 'math', 'date', 'time', 'noise', 'revenge', 'why', 'tease', 'sorry', 'promise', 'forgive', 'comeback', 'kidsorry', 'hide', 'seek', 'sing', 'bye', 'riddle', 'janken'];
  const GIVEUP = ['わからない', 'わかんない', 'こうさん', 'しらない', 'おしえて', 'ぎぶあっぷ', 'こたえは'];

  const R = (text, mood, chips, action) => ({ text, mood: mood || 'smug', chips: chips || chipsFor(null), action: action || null });

  function startRiddle(cat) {
    const list = V.riddles || [];
    let r = pick(list);
    if (state.lastRiddle && list.length > 1) while (r === state.lastRiddle) r = pick(list);
    if (cat || Math.random() < 0.5) {
      const q = dictQuiz(cat);
      if (q) r = q;
    }
    state.riddle = { r, miss: 0 };
    state.lastRiddle = r;
    return R((cat ? '' : 'なぞなぞ いくよ〜。') + r.q, 'smug', ['わからない', 'ヒント ちょうだい']);
  }

  function riddleAnswer(n) {
    const { r } = state.riddle;
    const hit = r.a.some((k) => (k.length <= 1 ? n === k : n.indexOf(k) >= 0));
    if (hit) {
      state.riddle = null;
      return R(pickFresh(V.riddleRight), 'shocked', ['もう いっこ だして', 'かくれんぼ しよう', 'すごいでしょ']);
    }
    if (/ひんと/.test(n)) {
      state.riddle.miss = 1;
      return R('しかたないなあ。ヒントは… ' + r.hint, 'shy', ['わからない']);
    }
    if (GIVEUP.some((k) => n.indexOf(k) >= 0) || state.riddle.miss >= 1) {
      state.riddle = null;
      return R(pickFresh(V.riddleGiveUp).replace('%A', r.ans), 'smug', ['もう いっこ だして', 'くやしい', 'かくれんぼ しよう']);
    }
    state.riddle.miss++;
    return R(pickFresh(V.riddleWrong).replace('%H', r.hint), 'smug', ['わからない']);
  }

  function jankenHand(n) {
    if (/ちょき|はさみ/.test(n)) return 1;
    if (/ぱ|かみ/.test(n)) return 2;
    if (/ぐ|いし/.test(n)) return 0;
    return -1;
  }
  const HANDS = ['グー', 'チョキ', 'パー'];
  const JCHIPS = ['✊ グー', '✌️ チョキ', '✋ パー'];

  function jankenPlay(kid) {
    const me = Math.floor(Math.random() * 3);
    const head = 'ぽん！ ぼくは ' + HANDS[me] + '。';
    if (me === kid) return R(head + pickFresh(V.jankenDraw), 'shocked', JCHIPS);
    state.janken = false;
    const iWin = (me + 1) % 3 === kid; // グーは チョキに かつ…
    // me が kid に かつ: (グー0,チョキ1) (チョキ1,パー2) (パー2,グー0)
    return iWin
      ? R(head + pickFresh(V.jankenWin), 'smug', ['もう いっかい じゃんけん', 'くやしい', 'かくれんぼ しよう'])
      : R(head + pickFresh(V.jankenLose), 'shocked', ['もう いっかい じゃんけん', 'やったー', 'かくれんぼ しよう']);
  }

  function askAnswer(raw, n) {
    const id = state.asked;
    state.asked = null;
    const q = String(raw).trim().replace(/[。、！!？?]+$/, '').slice(0, 14);
    if (/ひみつ|ないしょ/.test(n)) return R(pick(['えー、ないしょ なの？ %N の けち〜', 'ひみつかあ。…あとで こっそり おしえてね']), 'smug');
    if (/^(ない|ないよ|いない|なし)$/.test(n) || /くない|じゃない/.test(n)) {
      return R(pick(['ほんとに〜？ %N、つよがり いってない？ ぷぷっ', 'ふーん、ないんだ。%Nって ふしぎ〜']), 'smug');
    }
    const list = (V.asks || {})[id] ||
      (id === 'fav'
        ? ['「%Q」かあ。いいね！ ぼくも すきに なりそう', '「%Q」！ %Nの すきな もの、おぼえとくね', 'へえ〜「%Q」なんだ。こんど いっしょに みたいな', '「%Q」！ %N、いい しゅみ してるじゃん。…ぼくの つぎに']
        : ['「%Q」かあ。ふーん、おぼえとくね']);
    return R(pickFresh(list).replace(/%Q/g, q), 'happy');
  }

  /* ---------------- ことば じてん ---------------- */
  // ー を のこした まま そろえる(「チーズ」と「ちず」を わける ため)
  function normKeep(s) {
    const t = kanaMap(String(s || ''));
    return t
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[〜~]/g, 'ー')
      .replace(/[、。！!？?・,.「」『』（）()]/g, ' ')
      .replace(/[\s　]+/g, ' ')
      .trim()
      .toLowerCase();
  }
  const DIDX = {};
  D.words.forEach((w) => {
    const k = normKeep(w.kana);
    (DIDX[k] = DIDX[k] || []).push(w);
  });
  const DKEYS_ALL = Object.keys(DIDX).sort((a, b) => b.length - a.length);
  // ものの ことば(なまえ)を さきに さがし、うごき・きもちの ことばは あとで さがす
  const DKEYS_N = DKEYS_ALL.filter((k) => DIDX[k].some((w) => !w.sentence));
  const DKEYS_S = DKEYS_ALL.filter((k) => DIDX[k].every((w) => w.sentence));
  const AFTER = 'はがをにのもとでやよねだっすみかほ ';
  const BEFORE = 'のとはがをもでにや ';

  // いちばん ながく あう ことばを さがす。2もじ いかは まえうしろが くぎれ の ときだけ
  function dictFind(raw) {
    const s = normKeep(raw);
    if (!s) return null;
    return dictScan(s, DKEYS_N) || dictScan(s, DKEYS_S);
  }
  function dictScan(s, keys) {
    const flat = s.replace(/ /g, '');
    for (const k of keys) {
      if (k.length >= 3) {
        if (flat.indexOf(k) >= 0) return { key: k, list: DIDX[k], len: k.replace(/ー/g, '').length };
        continue;
      }
      if (k.length === 1) {
        // 1もじの ことば(「か」「め」など)は、その もじ だけ か「〇は」「〇って」の ときだけ
        const re = /^(は|が|を|に|の|も|って|と|で|や|よ|ね|かな)?$/;
        if (s.split(' ').some((tok) => tok[0] === k && re.test(tok.slice(1)))) return { key: k, list: DIDX[k], len: 1 };
        continue;
      }
      let i = s.indexOf(k);
      while (i >= 0) {
        const prev = i === 0 ? ' ' : s[i - 1];
        const next = i + k.length >= s.length ? ' ' : s[i + k.length];
        if (BEFORE.indexOf(prev) >= 0 && AFTER.indexOf(next) >= 0) return { key: k, list: DIDX[k], len: k.replace(/ー/g, '').length };
        i = s.indexOf(k, i + 1);
      }
    }
    return null;
  }

  const fillW = (t, w) =>
    t.replace(/%W/g, w.show).replace(/%T/g, w.trait).replace(/%L/g, (D.cats[w.cat] || {}).label || '');

  function dictLine(w) {
    if (w.sentence) return w.trait;
    const cm = (D.comments || {})[w.cat] || (D.comments || {}).default || [''];
    return fillW(pickFresh(D.templates || ['%Wは %T。']), w).replace(/%C/g, fillW(pickFresh(cm), w));
  }

  function dictReply(h) {
    const cats = [];
    h.list.forEach((w) => cats.indexOf(w.cat) < 0 && cats.push(w.cat));
    const label = (c) => (D.cats[c] || {}).label || '';
    let text;
    if (cats.length > 1 && D.ambiguous) {
      text = pick(D.ambiguous).replace(/%W/g, h.list[0].show).replace('%L1', label(cats[0])).replace('%L2', label(cats[1])).replace(/%L1/g, label(cats[0])).replace(/%L2/g, label(cats[1]));
    } else {
      text = dictLine(pick(h.list));
    }
    const w = h.list[0];
    const extra = [];
    if (D.cats[w.cat] && !D.cats[w.cat].sentence) {
      const lab = label(w.cat).split('・')[0];
      const same = CHIP_WORDS.filter((x) => x.cat === w.cat && x !== w);
      extra.push(lab + ' クイズ', dictChip(pick(same)), `すきな ${lab}は？`);
    }
    return R(text, w.sentence ? 'happy' : 'smug', chipsFor(null, shuffle(extra)));
  }

  // じてんから なーんだクイズを つくる(cat を しぼる ことも できる)
  const QUIZ_WORDS = D.words.filter((w) => !w.sentence && w.trait && w.trait.indexOf(w.kana) < 0 && norm(w.trait).indexOf(norm(w.kana)) < 0);
  function dictQuiz(cat) {
    const pool = cat ? QUIZ_WORDS.filter((w) => w.cat === cat) : QUIZ_WORDS;
    if (!pool.length) return null;
    const w = pick(pool);
    const lab = (D.cats[w.cat] || {}).label || '';
    const first = w.show[0];
    return {
      q: pick(D.quizIntro || ['%T。これ なーんだ？']).replace(/%T/g, w.trait).replace(/%L/g, lab),
      a: [norm(w.kana), norm(w.show)].filter(Boolean),
      ans: w.show,
      hint: `「${first}」から はじまる ことば だよ`,
    };
  }

  /*
   * じてんと わだいの どちらで こたえるか
   *  - わだいが ない → じてん
   *  - つくぼうの ひとこと がたの ことば(うごき・きもち)は、わだいが あれば わだい
   *  - ひろい わだい(weak)より ながい ことば → じてん
   *  - ふつうの わだい: じてんの ことばが わだいの キーワードを ふくむ(「ティラノサウルス」⊃「ティラノ」)ときだけ じてん
   */
  function useDictFor(dh, topic, tlen, tkey, rnd) {
    if (!topic) return true;
    if (dh.list.every((w) => w.sentence)) return false;
    if (topic.special || topic.first || topic.action || topic.game) return false;
    if (topic.weak) return dh.len > tlen;
    // 「ゾウ かわいい」「カレー だいすき」は ほめことばより ことばの はなしを する
    if (topic.id === 'praise') return true;
    if (dh.key.replace(/ー/g, '').indexOf(tkey) < 0) return false;
    return dh.len > tlen || (dh.len === tlen && (!rnd || Math.random() < 0.5));
  }

  const ANY = null;
  const ASKCATS = {
    food: ['food', 'fruit', 'veggie', 'sweets', 'drink'],
    snack: ['sweets', 'food', 'fruit', 'drink'],
    dislike: ['food', 'fruit', 'veggie', 'sweets', 'drink', 'animal', 'bug', 'bird', 'sea', 'thing', 'nature', 'person', 'event'],
    color: ['color'],
    animal: ['animal', 'bird', 'sea', 'bug'],
    vehicle: ['vehicle'],
    place: ['place', 'event', 'nature'],
    play: ['toy', 'sport', 'place', 'action'],
    sport: ['sport', 'toy', 'action'],
    hero: ['story', 'person'],
    dream: ['person', 'sport', 'vehicle', 'animal'],
    season: ['event', 'nature'],
    fav: ANY, // state.askCat で しぼる(下)
    scary: ANY,
    good: ANY,
    tell: ANY,
    want: ANY,
    friendName: ANY,
  };

  /* ---------------- しりとり ---------------- */
  const SMALL = { ぁ: 'あ', ぃ: 'い', ぅ: 'う', ぇ: 'え', ぉ: 'お', ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', っ: 'つ', ゎ: 'わ' };
  function lastKana(w) {
    const c = w.replace(/[ー〜]+$/, '').slice(-1);
    return SMALL[c] || c;
  }
  const SL = V.shiritoriLines || {};
  // しりとりの ことば: vocab の ことば + じてんの ことば(ひらがなに そろえて、みせる ときは もとの かきかた)
  const SHOW = {};
  (V.shiritori || []).forEach((w) => (SHOW[w] = w));
  D.words.forEach((w) => {
    const k = norm(w.kana);
    // しりとりは なまえの ことば だけ(うごき・きもちの ことばは つかわない)
    if (!w.sentence && k.length >= 2 && /^[ぁ-ゖ]+$/.test(k) && !SHOW[k]) SHOW[k] = w.show;
  });
  const WORDS = Object.keys(SHOW);

  function shiritoriStart() {
    state.shiritori = { need: 'り', used: ['しりとり'], turns: 0, miss: 0 };
    return R(pickFresh(SL.start || ['しりとり！「り」から']), 'smug', ['りんご', 'りす', 'やめる']);
  }

  function shiritoriAnswer(n) {
    const st = state.shiritori;
    if (/やめ|おしまい|おわり/.test(n)) {
      state.shiritori = null;
      return R(pick(SL.end || ['おしまい']), 'happy');
    }
    if (!/^[ぁ-ゖ]+$/.test(n)) {
      return R('ごめん、むずかしい じ だと わからないよ〜。「' + st.need + '」で はじまる ことばを ひらがなで おしえて', 'sorry', ['やめる']);
    }
    if (n[0] !== st.need) return R(pickFresh(SL.wrongStart).replace(/%L/g, st.need), 'smug', ['やめる']);
    if (st.used.indexOf(n) >= 0) return R(pickFresh(SL.used), 'smug', ['やめる']);
    if (lastKana(n) === 'ん') {
      state.shiritori = null;
      return R(pickFresh(SL.kidN), 'smug', ['もう いっかい しりとり', 'くやしい', 'かくれんぼ しよう']);
    }
    st.used.push(n);
    st.turns++;
    st.miss = 0;
    const need = lastKana(n);
    let cands = WORDS.filter((w) => w[0] === need && st.used.indexOf(w) < 0 && lastKana(w) !== 'ん');
    const short = cands.filter((w) => w.length <= 5);
    if (short.length) cands = short; // こどもに わかりやすい みじかい ことばを えらぶ
    const easy = cands.filter((w) => 'ぷぺぴぽぱづぢぬるりれ'.indexOf(lastKana(w)) < 0);
    if (easy.length) cands = easy; // つぎの もじが むずかしい ことばは なるべく さける
    if (!cands.length || (st.turns >= 6 && Math.random() < 0.2)) {
      state.shiritori = null;
      return R(pickFresh(SL.lose).replace(/%L/g, need), 'shocked', ['もう いっかい しりとり', 'やったー', 'かくれんぼ しよう']);
    }
    const w = pick(cands);
    st.used.push(w);
    st.need = lastKana(w);
    return R(pickFresh(SL.ok).replace(/%W/g, SHOW[w] || w).replace(/%L/g, st.need), 'smug', ['やめる']);
  }

  /* ---------------- けいさん ---------------- */
  const KNUM = { ぜろ: 0, れい: 0, いち: 1, に: 2, さん: 3, よん: 4, し: 4, ご: 5, ろく: 6, なな: 7, しち: 7, はち: 8, きゅう: 9, く: 9, じゅう: 10 };
  const NUM = '(\\d+|' + Object.keys(KNUM).sort((a, b) => b.length - a.length).join('|') + ')';
  const toNum = (x) => (/^\d+$/.test(x) ? parseInt(x, 10) : KNUM[x]);
  const MATH_RE = new RegExp(NUM + '(たす|ぷらす|\\+|ひく|まいなす|-|−)' + NUM);

  function mathQuestion(n) {
    const plus = /たしざん/.test(n || '') ? true : /ひきざん/.test(n || '') ? false : Math.random() < 0.6;
    let a = 1 + Math.floor(Math.random() * 9);
    let b = 1 + Math.floor(Math.random() * 9);
    if (!plus && b > a) [a, b] = [b, a];
    state.math = plus ? a + b : a - b;
    const q = plus ? `${a} たす ${b} は？` : `${a} ひく ${b} は？`;
    return R(pick(['もんだい！ ', 'いくよ〜。', '%Nに とけるかな〜？ ']) + q, 'smug', ['わからない']);
  }

  function mathAnswer(n) {
    const ans = state.math;
    const m = n.match(/\d+/) || (KNUM[n] !== undefined ? [String(KNUM[n])] : null);
    state.math = null;
    if (m && parseInt(m[0], 10) === ans) {
      return R(pick(['せいかい！ %N、けいさん はやいね…くやしい', 'あたり〜！ ちぇっ、かんたん すぎたか', 'せいかい！ ぼくより かしこいかも…いや、そんな ことない！']), 'shocked', ['もう いっもん', 'かくれんぼ しよう']);
    }
    return R(pick([`ざんねーん、こたえは ${ans} でした〜。ぷぷっ`, `ちがうよ〜。こたえは ${ans}。ゆびで かぞえて みて`]), 'smug', ['もう いっもん', 'くやしい']);
  }

  function special(topic, n) {
    const now = new Date();
    if (topic.special === 'time') {
      const h = now.getHours();
      const m = now.getMinutes();
      const tail = h < 6 || h >= 20 ? 'もう ねる じかん じゃない？' : h < 12 ? 'あさだね〜。ぼくは まだ ねむい' : h < 17 ? 'ぼくが いちばん なく じかんだよ' : 'ゆうがた〜。そろそろ おうちに かえる じかん かな';
      return R(`いまは ${h}じ ${m}ふん だよ。${tail}`, 'smug');
    }
    if (topic.special === 'date') {
      const wd = ['にちようび', 'げつようび', 'かようび', 'すいようび', 'もくようび', 'きんようび', 'どようび'][now.getDay()];
      const tail = now.getDay() === 0 || now.getDay() === 6 ? 'おやすみの ひ だね。いっぱい あそぼ' : '%N、ようちえんは？ …ぼくは まいにち おやすみ〜';
      return R(`きょうは ${now.getMonth() + 1}がつ ${now.getDate()}にち、${wd} だよ。${tail}`, 'smug');
    }
    if (topic.special === 'shiritori') return shiritoriStart();
    if (topic.special === 'favq') {
      const cat = FAVKEYS.find(([k]) => n.indexOf(k) >= 0);
      const c = cat ? cat[1] : null;
      const pool = D.words.filter((w) => !w.sentence && (!c || w.cat === c));
      if (!pool.length) return null;
      // つくぼうの いちばんは カテゴリごとに きまってる(なんど きいても おなじ)
      const key = c || 'all';
      let h = 0;
      for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 9973;
      const w = pool[h % pool.length];
      const lab = c ? (D.cats[c].label || '').split('・')[0] : 'ことば';
      state.asked = 'fav';
      state.askCat = c;
      return R(pick([
        `ぼくの すきな ${lab}は「${w.show}」！ ${w.show}は ${w.trait}。%Nは？`,
        `うーん…「${w.show}」かな。${w.trait}ところが すき。%Nの すきな ${lab}は？`,
        `ないしょ…と おもったけど おしえて あげる。「${w.show}」！ %Nは なにが すき？`,
      ]), 'shy', chipsFor(null, shuffle(CHIP_WORDS.filter((x) => !c || x.cat === c)).slice(0, 3).map((x) => x.show)));
    }
    if (topic.special === 'catquiz') {
      const lab = (k) => norm(D.cats[k].label.split('・')[0]);
      const c = Object.keys(D.cats)
        .filter((k) => !D.cats[k].sentence && n.indexOf(lab(k)) >= 0)
        .sort((x, y) => lab(y).length - lab(x).length)[0];
      return startRiddle(c || null) ;
    }
    if (topic.special === 'math') {
      const m = n.match(MATH_RE);
      if (m) {
        const a = toNum(m[1]);
        const b = toNum(m[3]);
        const minus = /ひく|まいなす|-|−/.test(m[2]);
        const v = minus ? a - b : a + b;
        if (v < 0) return R(`${a} ひく ${b} は…マイナス！ ぼく まだ そこまで ならってない〜`, 'shocked');
        return R(pick([`${v}！ …%N、それくらい ぼくでも わかるよ〜`, `えっとね…${v}！ あってる？ ぼく てんさい かも`, `${v} だよ。あしで かぞえたら 6ぽんじゃ たりなかった〜`]), 'smug', ['たしざん だして', 'すごいね']);
      }
      if (/たしざん|ひきざん|けいさん|もういっもん/.test(n)) return mathQuestion(n);
      return null; // 「たすけて」など けいさんじゃ なかった
    }
    return null;
  }

  // ときどき くちぐせを そえる
  const join = (a, b) => a + (/[？！?!〜…]$/.test(a) ? ' ' : '。') + b;
  function tic(text, mood) {
    if (Math.random() > 0.15) return text;
    if (mood === 'smug') return join(text, pick(['ぷぷっ', 'ツクツク〜', 'ふふーん']));
    if (mood === 'happy') return join(text, pick(['ツクツクボーシ！', 'ウイヨース！']));
    return text;
  }

  /* こどもの ことば → { text, mood, chips, action } */
  function reply(input) {
    const n = norm(input);
    turns++;
    let topic = bestTopic(n);
    const strong = topic && STRONG.indexOf(topic.id) >= 0;

    // しりとりの とちゅうは ことばを ほぼ ぜんぶ しりとりと して うける(やめる・いやだ・ばいばい で おしまい)
    if (state.shiritori) {
      const st = state.shiritori;
      const fits = n[0] === st.need || /やめ|おしまい|おわり/.test(n);
      if (/^(いや|いやだ)$/.test(n) || (topic && topic.id === 'bye')) state.shiritori = null;
      else if (fits) return shiritoriAnswer(n);
      else if (topic && topic.id !== 'shiritori' && (STRONG.indexOf(topic.id) >= 0 || n.length > 5)) state.shiritori = null; // ちがう はなしに なった
      else if (++st.miss >= 3) {
        state.shiritori = null;
        return R('しりとり、いったん おやすみ しよっか。また やろうね', 'happy');
      } else return shiritoriAnswer(n);
    }
    if (state.math !== null) {
      if (/\d/.test(n) || KNUM[n] !== undefined || /わからない|わかんない|こうさん/.test(n)) return mathAnswer(n);
      if (!strong) state.math = null;
    }

    // つづきの とちゅう
    if (state.riddle && !strong) return riddleAnswer(n);
    if (state.janken && !strong) {
      const h = jankenHand(n);
      if (h >= 0) return jankenPlay(h);
      state.janken = false;
    }
    const tlen = bestTopic.len;
    const tkey = bestTopic.key;
    const dh = dictFind(input);
    // ききかえしの こたえ: ほかの わだいに あわない か、みじかい ことば(「ピーマン」など)
    // じてんの ことばなら、しつもんに あう しゅるい(たべもの → たべもの・くだもの…)の ときだけ こたえと みなす
    const askCats = state.asked === 'fav' && state.askCat ? [state.askCat] : ASKCATS[state.asked];
    const fitsAsk = !dh || !askCats || dh.list.some((w) => askCats.indexOf(w.cat) >= 0);
    if (state.asked && n && !strong && fitsAsk && (!topic || (n.length <= 4 && !topic.first) || dh)) {
      const r = askAnswer(input, n);
      const w = dh && dh.list.find((x) => !x.sentence);
      if (w) r.text = join(r.text, `${w.show}は ${w.trait}`);
      return r;
    }
    state.riddle = null;
    state.janken = false;
    state.asked = null;
    state.shiritori = null;
    state.math = null;

    if (topic && topic.special) {
      const r = special(topic, n);
      if (r) return r;
      // とくべつ じゃ なかった → つぎに あう わだいを さがす
      topic = bestTopic(n, (t) => t.special);
    }

    // じてんの ことばの ほうが ながく あったら じてんで こたえる(おなじ ながさなら はんぶんずつ)
    // つくぼうの ひとこと がたの ことば(うごき・きもち)は、わだいが あれば わだいを ゆうせん
    if (dh && useDictFor(dh, topic, tlen, tkey, true)) return dictReply(dh);
    // 「ぞう しってる？」の ように きかれたら じてんで こたえる
    if (dh && topic && ['know', 'callName', 'listen', 'look'].indexOf(topic.id) >= 0 && !dh.list[0].sentence) return dictReply(dh);

    if (topic && topic.game === 'riddle') return startRiddle();
    if (topic && topic.game === 'janken') {
      state.janken = true;
      return R(pickFresh(V.jankenStart), 'smug', JCHIPS);
    }
    if (topic) {
      let text = pickFresh(topic.say);
      // ときどき ふつうの へんじに からかいを ひとこと そえる
      if (!topic.action && ['hello', 'today', 'thanks'].indexOf(topic.id) >= 0 && Math.random() < 0.3) {
        text = join(text, pickFresh(TEASE));
      }
      if (topic.ask) state.asked = topic.ask;
      if (!topic.action) text = tic(text, topic.mood);
      return { text, mood: topic.mood || 'normal', chips: chipsFor(topic), action: topic.action || null };
    }
    // わからない ときは あいづち、ときどき からかう
    const text = Math.random() < 0.35 ? pickFresh(TEASE) : pickFresh(AIZUCHI);
    const r = R(text, 'smug');
    r.fallback = true;
    return r;
  }

  return {
    // テストよう: どの わだいに あたるか
    matchId(input) {
      const t = bestTopic(norm(input));
      const tl = bestTopic.len;
      const dh = dictFind(input);
      if (dh && useDictFor(dh, t, tl, bestTopic.key, false)) return 'dict:' + dh.key;
      return t ? t.id : null;
    },
    dictFind,
    dict: D,
    // テストよう: つづきの かいわを わすれる
    reset() {
      Object.keys(state).forEach((k) => (state[k] = null));
    },
    topics: TOPICS,
    norm,
    pick,
    reply,
    idle: () => pickFresh(IDLE),
    tease: () => pickFresh(TEASE),
    chipsFor,
    get turns() {
      return turns;
    },
  };
})();
