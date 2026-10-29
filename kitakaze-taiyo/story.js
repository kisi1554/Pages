'use strict';

/*
 * おはなし の データ。ページ と 文 と しかけ。
 * イソップ の おはなし「きたかぜと たいよう」を もと に した、この アプリ の ため の オリジナル の 文。
 *
 * page = {
 *   id, scene: え の はじめ の かたち（app.js の makeScene が つかう）,
 *   text: [さいしょ に でる 文],
 *   steps: [{ kind, hint, then: [しかけ が おわったら でる 文], ... }],
 * }
 * しかけ の しゅるい（kind）
 *   boast  … きたかぜ と たいよう を タップ すると じまん の ふきだし（2人 とも）
 *   guess  … どっちが かつ と おもう？ どちらか を タップ（then は えらんだ ほう ごと）
 *   greet  … たびびと を タップ で あいさつ
 *   button … コート を さわる と ボタン を ぎゅっ と しめる（need こ）
 *   blow   … え の うえ を なぞって かぜ を ふく（wind.js）。need は ふいた りょう
 *   cloud  … たいよう の まえ の くも を タップ／スワイプ で どかす
 *   warm   … たいよう を ぐるぐる こすって あたためる（wind.js）。goal は おんど（0〜1）
 *   coat   … たびびと を タップ で コート が ふわっ と 木 の えだ に
 *   rest   … 木かげ の たびびと を タップ で のび と あくび
 *   shake  … きたかぜ と たいよう を ドラッグ で ちかづける と あくしゅ
 * 「」の なか は せりふ。[漢字|かんじ] で ふりがな つき の かんじ に なる。
 * 文・ヒント・ふきだし は どれも { ja, en }（にほんご と えいご）。🇬🇧 ボタン で いつでも きりかえ られる。
 */
const Story = (() => {
  const t = (ja, en) => ({ ja, en });

  // え の なか の ふきだし
  const SAY = {
    ja: {
      boastKaze: 'ぼくが つよい！', boastSun: 'わたしも つよいよ',
      pickKaze: 'きたかぜ！', pickSun: 'たいよう！',
      hello: 'こんにちは！', gyu: 'ぎゅっ',
      whoosh: 'びゅーっ！', brr: 'ぶるぶる', cold: 'さむい！', hold: 'ぎゅーっ',
      giveUp: 'まいった…', poof: 'ぽんっ',
      ahh: 'ほっ', warm: 'ぽかぽか', phew: 'ふうっ', hot: 'あつい！', pop: 'ぷち ぷち',
      fuwa: 'ふわっ', yawn: 'ふあーあ',
      friends: 'なかなおり！', end: 'おしまい',
    },
    en: {
      boastKaze: 'I’m strong!', boastSun: 'So am I!',
      pickKaze: 'Wind!', pickSun: 'Sun!',
      hello: 'Hello!', gyu: 'Snap!',
      whoosh: 'Whoosh!', brr: 'Brr!', cold: 'So cold!', hold: 'Hold tight!',
      giveUp: 'I give up!', poof: 'Poof!',
      ahh: 'Ahh…', warm: 'So warm!', phew: 'Phew!', hot: 'Hot!', pop: 'Pop, pop!',
      fuwa: 'Float…', yawn: 'Yawn!',
      friends: 'Friends!', end: 'The End',
    },
  };

  // メーター の なまえ・バッジ
  const LABEL = {
    ja: { wind: 'かぜ', grip: 'おさえる ちから', temp: 'おんど', twoWind: 'かぜ 2ばい！', twoWarm: 'ぽかぽか 2ばい！', free: 'ためす' },
    en: { wind: 'Wind', grip: 'Grip', temp: 'Heat', twoWind: 'Double wind!', twoWarm: 'Double warm!', free: 'Play' },
  };

  // おしまい の がめん（1ページ め の よそう を ふりかえる。どちら でも ほめる）
  const END = {
    ja: {
      big: 'おしまい',
      sub: 'つよく するより、 やさしく すると つたわるね。',
      taiyo: '🎯 あたり！ たいようが かつって わかって いたんだね。 すごい！',
      kaze: '☀️ たいようだったね！ どきどき しながら よそう できて すごいね。',
      none: '☀️ かったのは たいようでした！',
      guessLabel: 'きみの よそう',
    },
    en: {
      big: 'The End',
      sub: 'Being gentle works better than being rough.',
      taiyo: '🎯 You guessed right! You knew the Sun would win. Great job!',
      kaze: '☀️ It was the Sun! That was a great guess — so exciting to find out!',
      none: '☀️ The Sun was the winner!',
      guessLabel: 'Your guess',
    },
  };

  const PAGES = [
    {
      id: 'iiai',
      scene: { kaze: 'proud', sun: 'smile' },
      text: [
        t('ある [日|ひ]、 そらの うえで きたかぜと たいようが いいあいを して いました。',
          'One day, high in the sky, the North Wind and the Sun were arguing.'),
        t('「ぼくの ほうが つよいぞ！」 「いいえ、 わたしも まけませんよ。」',
          '“I am stronger!” “Oh no, I am just as strong!”'),
      ],
      steps: [
        {
          kind: 'boast',
          hint: t('👆 きたかぜと たいようを タップしてね', '👆 Tap the North Wind and the Sun'),
          then: [t('「じゃあ、 あの みちを くる たびびとの コートを ぬがせた ほうが かちだ！」',
            '“Then whoever gets the coat off that traveler on the road wins!”')],
        },
        {
          kind: 'guess',
          hint: t('🤔 どっちが かつと おもう？ タップで えらんでね', '🤔 Who do you think will win? Tap one!'),
          then: {
            kaze: [t('きたかぜだと おもったんだね。 さあ、 どうなるかな？', 'You picked the North Wind. Let’s see what happens!')],
            taiyo: [t('たいようだと おもったんだね。 さあ、 どうなるかな？', 'You picked the Sun. Let’s see what happens!')],
          },
        },
      ],
    },
    {
      id: 'tabibito',
      scene: { kaze: 'smile', sun: 'smile', small: true, trav: { x: -70, walk: true, coat: 'closed', buttons: 0, face: 'smile' } },
      text: [t('そこへ、 ながい コートを きた たびびとが あるいて きました。',
        'Just then, a traveler in a long coat came walking down the road.')],
      steps: [
        {
          kind: 'greet',
          hint: t('👋 たびびとを タップして あいさつ', '👋 Tap the traveler to say hello'),
          then: [t('「こんにちは。 きょうは ちょっと さむいね。」', '“Hello! It’s a little chilly today.”')],
        },
        {
          kind: 'button', need: 3,
          hint: t('👆 コートの ボタンを さわって とめよう', '👆 Touch the coat to do up the buttons'),
          then: [t('ボタンを ぎゅっ、 ぎゅっ、 ぎゅっ。 これで あったか。', 'Snap, snap, snap! All buttoned up and cozy.')],
        },
      ],
    },
    {
      id: 'kaze1',
      scene: { kaze: 'proud', sun: 'watch', small: true, trav: { coat: 'closed', face: 'smile' }, laundry: true, kakashi: true },
      text: [
        t('まずは きたかぜの ばんです。', 'First, it was the North Wind’s turn.'),
        t('「よーし、 ふきとばして やる！ びゅーっ！」', '“I’ll blow that coat right off! Whoosh!”'),
      ],
      steps: [{
        kind: 'blow', need: 4,
        hint: t('🌬️ えの うえを ゆびで びゅんびゅん なぞって かぜを ふかせよう', '🌬️ Swipe fast across the picture to make the wind blow'),
        then: [
          t('びゅーっ！ はっぱも ぼうしも せんたくものも とんで いきました。', 'Whoosh! The North Wind blew and blew. Leaves, hats, and laundry went flying.'),
          t('たびびとは ぶるぶる ふるえて、 コートを ぎゅっと おさえました。', 'Brr! The man shivered and held his coat tight.'),
        ],
      }],
    },
    {
      id: 'kaze2',
      scene: { kaze: 'puff', sun: 'watch', small: true, trav: { coat: 'closed', face: 'cold', arms: 'hug' }, kakashi: 'nohat' },
      text: [t('きたかぜは もっと もっと つよく ふきました。', 'The North Wind blew harder and harder.')],
      steps: [{
        kind: 'blow', need: 6, grip: true,
        hint: t('🌬️ もっと つよく！ ゆびを 2ほん つかうと かぜ 2ばい', '🌬️ Harder! Use two fingers for double wind'),
        then: [
          t('もっと つよく ふいたら、 もっと ぎゅっと おさえました。', 'The harder he blew, the tighter the man held his coat.'),
          t('「はぁ はぁ… もう だめだ。 まいった。」', '“Huff, puff… I can’t do it. I give up!”'),
        ],
      }],
    },
    {
      id: 'taiyo',
      scene: { kaze: 'tired', sun: 'smile', clouds: true, trav: { coat: 'closed', face: 'cold', arms: 'hug' }, kakashi: 'nohat' },
      text: [t('こんどは たいようの ばんです。', 'Now it was the Sun’s turn.')],
      steps: [
        {
          kind: 'cloud', need: 3,
          hint: t('☁️ くもを タップか スワイプで どかそう', '☁️ Tap or swipe the clouds away'),
          then: [t('くもが どいて、 たいようが にっこり かおを だしました。', 'The clouds drifted away, and the Sun peeked out with a smile.')],
        },
        {
          kind: 'warm', goal: 0.3,
          hint: t('☀️ たいようを ぐるぐる こすって あたためよう', '☀️ Rub the Sun round and round to warm it up'),
          then: [t('ぽかぽか、 じんわり。 たびびとの おでこに あせが でて きました。', 'Warm and cozy. Little drops of sweat came out on the man’s forehead.')],
        },
      ],
    },
    {
      id: 'pokapoka',
      scene: { kaze: 'tired', sun: 'shine', temp: 0.3, trav: { coat: 'closed', face: 'hot', sweat: true }, kakashi: 'nohat' },
      text: [t('たいようは もっと ぽかぽか てらしました。', 'The Sun shone warmer and warmer.')],
      steps: [{
        kind: 'warm', goal: 1,
        hint: t('☀️ もっと ぐるぐる！ おんどを いっぱいに しよう', '☀️ Keep rubbing! Fill the heat meter all the way'),
        then: [
          t('たびびとは あせを ふいて、 ぼうしを とって、', 'The man wiped his sweat and took off his hat.'),
          t('コートの ボタンも ぷち、 ぷち、 ぷち。', 'Then he undid his buttons: pop, pop, pop.'),
          t('「ふうっ、 あつい あつい！」', '“Phew! So warm!”'),
        ],
      }],
    },
    {
      id: 'nuida',
      scene: { kaze: 'tired', sun: 'shine', temp: 1, trav: { coat: 'open', face: 'hot', hat: false, sweat: true }, kakashi: 'nohat' },
      text: [t('とうとう たびびとは コートを ぬぎました！', 'At last, the man took off his coat!')],
      steps: [
        {
          kind: 'coat',
          hint: t('👆 たびびとを タップしてね', '👆 Tap the traveler'),
          then: [t('コートは ふわっと とんで、 [木|き]の えだに ひっかかりました。', 'The coat floated up and landed on a branch of the tree.')],
        },
        {
          kind: 'rest',
          hint: t('👆 [木|き]かげの たびびとを タップ', '👆 Tap the man resting in the shade'),
          then: [
            t('たびびとは [木|き]かげで ひとやすみ。', 'He sat down in the cool shade for a rest.'),
            t('「んーっ、 ふあーあ。 いい きもち。」', '“Stretch… yawn… This feels so nice.”'),
          ],
        },
      ],
    },
    {
      id: 'nakanaori',
      scene: { kaze: 'smile', sun: 'smile', temp: 0.6, trav: { rest: true, coat: 'off', face: 'relief', hat: false }, coatOnTree: true, kakashi: 'nohat' },
      text: [
        t('きたかぜは すなおに いいました。', 'The North Wind said kindly,'),
        t('「まいった。 たいようさんの かちだね。」', '“You win, Sun.”'),
      ],
      steps: [{
        kind: 'shake',
        hint: t('👆 きたかぜと たいようを ゆびで ちかづけよう', '👆 Drag the North Wind and the Sun together'),
        then: [
          t('「なかなおりの あくしゅ！」', '“Let’s shake hands and be friends!”'),
          t('「つよく するより、 やさしく すると つたわるね。」', '“Being gentle works better than being rough.”'),
        ],
      }],
    },
  ];

  // 「もういちど ためす」で あそべる ページ（kaze1〜pokapoka）
  const FREE = ['kaze1', 'kaze2', 'taiyo', 'pokapoka'];

  // せりふ を よみあげ よう の もじ に（かぎかっこ を とる）
  // [漢字|かんじ] は よみ（かな）に して よむ（よみまちがい を ふせぐ）
  const plain = (s) => s.replace(/\[([^|\]]+)\|([^\]]+)\]/g, '$2').replace(/[「」“”]/g, '').replace(/…/g, '、');
  const plainEn = (s) => s.replace(/[“”]/g, '').replace(/…/g, ', ').replace(/—/g, ', ');
  // [漢字|かんじ] → <ruby>漢字<rt>かんじ</rt></ruby>
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ruby = (s) => esc(s).replace(/\[([^|\]]+)\|([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');

  return { SAY, LABEL, END, PAGES, FREE, plain, plainEn, ruby };
})();
