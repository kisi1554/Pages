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
  // ながい ことばから さきに おきかえる(「大好き」を「好き」より さきに)
  const KANA = (V.kana || []).slice().sort((a, b) => b[0].length - a[0].length);

  function norm(s) {
    let t = String(s || '');
    KANA.forEach(([k, v]) => {
      if (t.indexOf(k) >= 0) t = t.split(k).join(v);
    });
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
      keys: ['かくれんぼ', 'かくれて', 'あそぼ', 'あそぼう', 'あそんで', 'げむ', 'あそぶ', 'しょうぶ'],
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
      keys: ['なきごえ', 'ないて', 'うたって', 'うた', 'こえきかせ', 'つくつくぼし', 'おしんつくつく'],
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
      keys: ['こんにちは', 'おはよ', 'こんばんは', 'やあ', 'はじめまして', 'もしもし', 'つくぼう'],
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
    TOPICS.push(...(V.topics || []));
    TOPICS.push(
      { id: 'riddle', keys: ['なぞなぞ', 'くいず', 'もんだい', 'もういっこ'], game: 'riddle' },
      { id: 'janken', keys: ['じゃんけん'], game: 'janken' },
      fact
    );
  }

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
  ];

  function chipsFor(topic) {
    if (topic && topic.chips) return topic.chips;
    const pool = DEFAULT_CHIPS.slice().sort(() => Math.random() - 0.5);
    return pool.slice(0, 4);
  }

  let turns = 0;

  /* つづきの ある かいわ(なぞなぞ・じゃんけん・しつもんの こたえ) */
  const state = { riddle: null, janken: false, asked: null };
  // これらの わだいは つづきの とちゅうでも ゆうせん する
  const STRONG = ['why', 'tease', 'sorry', 'promise', 'forgive', 'comeback', 'kidsorry', 'hide', 'seek', 'sing', 'bye', 'riddle', 'janken'];
  const GIVEUP = ['わからない', 'わかんない', 'こうさん', 'しらない', 'おしえて', 'ぎぶあっぷ', 'こたえは'];

  const R = (text, mood, chips, action) => ({ text, mood: mood || 'smug', chips: chips || chipsFor(null), action: action || null });

  function startRiddle() {
    const list = V.riddles || [];
    let r = pick(list);
    if (state.lastRiddle && list.length > 1) while (r === state.lastRiddle) r = pick(list);
    state.riddle = { r, miss: 0 };
    state.lastRiddle = r;
    return R('なぞなぞ いくよ〜。' + r.q, 'smug', ['わからない', 'ヒント ちょうだい']);
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
    const list = (V.asks || {})[id] || ['「%Q」かあ。ふーん、おぼえとくね'];
    return R(pickFresh(list).replace(/%Q/g, q), 'happy');
  }

  /* こどもの ことば → { text, mood, chips, action } */
  function reply(input) {
    const n = norm(input);
    turns++;
    let topic = null;
    if (n) {
      for (const t of TOPICS) {
        if (t.keys.some((k) => n.indexOf(k) >= 0)) {
          topic = t;
          break;
        }
      }
    }
    const strong = topic && STRONG.indexOf(topic.id) >= 0;

    // つづきの とちゅう
    if (state.riddle && !strong) return riddleAnswer(n);
    if (state.janken && !strong) {
      const h = jankenHand(n);
      if (h >= 0) return jankenPlay(h);
      state.janken = false;
    }
    if (state.asked && n && !strong) return askAnswer(input, n);
    state.riddle = null;
    state.janken = false;
    state.asked = null;

    if (topic && topic.game === 'riddle') return startRiddle();
    if (topic && topic.game === 'janken') {
      state.janken = true;
      return R(pickFresh(V.jankenStart), 'smug', JCHIPS);
    }
    if (topic) {
      let text = pickFresh(topic.say);
      // ときどき ふつうの へんじに からかいを ひとこと そえる
      if (!topic.action && ['hello', 'today', 'thanks'].indexOf(topic.id) >= 0 && Math.random() < 0.3) {
        text += '。' + pickFresh(TEASE);
      }
      if (topic.ask) state.asked = topic.ask;
      return { text, mood: topic.mood || 'normal', chips: chipsFor(topic), action: topic.action || null };
    }
    // わからない ときは あいづち、ときどき からかう
    const text = Math.random() < 0.35 ? pickFresh(TEASE) : pickFresh(AIZUCHI);
    return R(text, 'smug');
  }

  return {
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
