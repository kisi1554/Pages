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

  // キーワードも norm で そろえる(「しーっ」→「しっ」など)
  TOPICS.forEach((t) => (t.keys = t.keys.map(norm).filter(Boolean)));

  /* いちばん ながく あった キーワードの わだいを えらぶ(おなじ ながさなら うえの わだい) */
  // weak の わだい(「きょう」「つくぼう」「セミ」など ひろい ことば)は、ほかに あわない ときだけ
  function bestTopic(n, skip) {
    if (!n) return null;
    const find = (weak) => {
      let best = null;
      let len = 0;
      for (const t of TOPICS) {
        if ((skip && skip(t)) || !!t.weak !== weak) continue;
        for (const k of t.keys) {
          if (k.length > len && n.indexOf(k) >= 0) {
            best = t;
            len = k.length;
          }
        }
      }
      return best;
    };
    return find(false) || find(true);
  }
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

  function chipsFor(topic) {
    if (topic && topic.chips) return topic.chips;
    const pool = DEFAULT_CHIPS.slice().sort(() => Math.random() - 0.5);
    return pool.slice(0, 4);
  }

  let turns = 0;

  /* つづきの ある かいわ(なぞなぞ・じゃんけん・しつもんの こたえ) */
  const state = { riddle: null, janken: false, asked: null, shiritori: null, math: null };
  // これらの わだいは つづきの とちゅうでも ゆうせん する
  const STRONG = ['shiritori', 'math', 'date', 'time', 'noise', 'revenge', 'why', 'tease', 'sorry', 'promise', 'forgive', 'comeback', 'kidsorry', 'hide', 'seek', 'sing', 'bye', 'riddle', 'janken'];
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

  /* ---------------- しりとり ---------------- */
  const SMALL = { ぁ: 'あ', ぃ: 'い', ぅ: 'う', ぇ: 'え', ぉ: 'お', ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', っ: 'つ', ゎ: 'わ' };
  function lastKana(w) {
    const c = w.replace(/[ー〜]+$/, '').slice(-1);
    return SMALL[c] || c;
  }
  const SL = V.shiritoriLines || {};
  const WORDS = V.shiritori || [];

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
    const cands = WORDS.filter((w) => w[0] === need && st.used.indexOf(w) < 0 && lastKana(w) !== 'ん');
    if (!cands.length || (st.turns >= 6 && Math.random() < 0.2)) {
      state.shiritori = null;
      return R(pickFresh(SL.lose).replace(/%L/g, need), 'shocked', ['もう いっかい しりとり', 'やったー', 'かくれんぼ しよう']);
    }
    const w = pick(cands);
    st.used.push(w);
    st.need = lastKana(w);
    return R(pickFresh(SL.ok).replace(/%W/g, w).replace(/%L/g, st.need), 'smug', ['やめる']);
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
      else if (topic && topic.id !== 'shiritori') state.shiritori = null; // ちがう はなしに なった
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
    // ききかえしの こたえ: ほかの わだいに あわない か、みじかい ことば(「ピーマン」など)
    if (state.asked && n && !strong && (!topic || (n.length <= 4 && !topic.first))) return askAnswer(input, n);
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
    return R(text, 'smug');
  }

  return {
    // テストよう: どの わだいに あたるか
    matchId(input) {
      const t = bestTopic(norm(input));
      return t ? t.id : null;
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
