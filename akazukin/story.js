'use strict';

/*
 * おはなし の データ。ページ と 文 と しかけ。
 * グリム童話「あかずきん」を もと に した、この アプリ の ため の オリジナル の 文。
 * こわく しない: だれも たべられない。おばあさん は クローゼット に かくれて ぶじ。
 * おおかみ は きこり の おおごえ に びっくり して にげて いく（さいご は とおく で「もう しません」）。
 *
 * page = {
 *   id, scene: え の はじめ の かたち（app.js の makeScene が つかう）,
 *   text: [さいしょ に でる 文],
 *   steps: [{ kind, hint, then: [しかけ が おわったら でる 文], ... }],
 * }
 * しかけ の しゅるい（kind）
 *   basket … パン・ジュース・ケーキ・おはな を かご へ ドラッグ（need こ）。ボール は「いらないよ」と もどる
 *   path   … あかずきん を ゆび で みち に そって なぞる（mori.js）。みち から はずれる と すすまない
 *   choose … 「おばあさん の いえ」「ないしょ！」の どちら か を タップ。thenBy で こたえ ごと の 文
 *   flowers… はな を タップ で つむ。つむ たび に おひさま が かたむく。「さき を いそぐ」で つぎ へ
 *   hide   … おばあさん を クローゼット へ ドラッグ
 *   shut   … クローゼット の とびら を よこ に スワイプ して しめる
 *   knock  … ドア を タップ（need かい）
 *   zoom   … ひかって いる ところ（part）を タップ か ゆび 2ほん で ひろげる と おおきく なる
 *   flip   … ふとん を した へ スワイプ して めくる
 *   shout  … きこり を タップ れんだ（ゆび なんぼん でも）。こえ メーター が いっぱい で「こらーっ！」
 *   closet … クローゼット を タップ して あける
 *   cake   … ケーキ を 3にん の おさら へ ドラッグ（need こ）
 * 「」の なか は せりふ。[漢字|かんじ] で ふりがな つき の かんじ に なる。
 * 文・ヒント・ふきだし は どれも { ja, en }（にほんご と えいご）。who: 'wolf' は おおかみ の せりふ（ひくい こえ で よむ）。
 */
const Story = (() => {
  const t = (ja, en, who) => (who ? { ja, en, who } : { ja, en });
  const W = 'wolf';

  // え の なか の ふきだし
  const SAY = {
    ja: {
      itekimasu: 'いってきます！', noNeed: 'それは いらないよ', inBasket: 'いれたよ！',
      keepPath: 'みちを まもらなきゃ', tekuteku: 'てくてく', arrived: 'もうすぐ！',
      where: 'どこへ いくの？', house: 'おばあさんの いえ', secret: 'ないしょ！', guess: 'ふーん…',
      pretty: 'きれい！', enough: 'もう いかなきゃ！', hurry: 'いそごう！',
      knockknock: 'トントン', hide: 'こっちへ！', thanks: 'ありがとう', wait: 'ここで まってるね',
      shut: 'パタン', poof: 'へんそう！', hehe: 'ひっひっ',
      tonton: 'トントン', comein: 'おはいり…', strange: 'へんだな？',
      bigEars: 'おおきな みみ！', bigEyes: 'おおきな め！', bigHands: 'おおきな て！', bigMouth: 'おおきな くち！',
      oops: 'おっと！', tail: 'しっぽ！', wolf: 'おおかみだ！',
      help: 'たすけて！', kora: 'こらーっ！', sorry: 'もう しませーん！',
      open: 'ガチャ', safe: 'もう だいじょうぶ', itadakimasu: 'いただきます！', yum: 'おいしい！', end: 'おしまい',
    },
    en: {
      itekimasu: 'Bye, Mom!', noNeed: 'Not that one!', inBasket: 'In it goes!',
      keepPath: 'Stay on the path!', tekuteku: 'Step, step', arrived: 'Almost there!',
      where: 'Where are you going?', house: 'To Grandma’s', secret: 'It’s a secret!', guess: 'Hmm…',
      pretty: 'So pretty!', enough: 'I must go!', hurry: 'Hurry!',
      knockknock: 'Knock, knock', hide: 'In here!', thanks: 'Thank you', wait: 'I’ll wait here',
      shut: 'Click!', poof: 'Disguise!', hehe: 'Hee hee',
      tonton: 'Knock, knock', comein: 'Come in…', strange: 'That’s odd…',
      bigEars: 'Big ears!', bigEyes: 'Big eyes!', bigHands: 'Big hands!', bigMouth: 'Big mouth!',
      oops: 'Oops!', tail: 'A tail!', wolf: 'It’s the wolf!',
      help: 'Help!', kora: 'HEY, YOU!', sorry: 'I won’t do it again!',
      open: 'Creak', safe: 'All safe now', itadakimasu: 'Let’s eat!', yum: 'Yummy!', end: 'The End',
    },
  };

  // メーター の なまえ・バッジ・ボタン
  const LABEL = {
    ja: { path: 'すすんだ', time: 'じかん', shout: 'こえ', two: 'ゆび 2ほん！', free: 'もういちど', hurry: '🧺 さきを いそぐ', flowers: 'おはな' },
    en: { path: 'Walk', time: 'Time', shout: 'Voice', two: 'Two fingers!', free: 'Again', hurry: '🧺 Hurry on', flowers: 'Flowers' },
  };

  // おしまい の がめん
  const END = {
    ja: {
      big: 'おしまい',
      sub: 'へんだな？と おもったら、 よーく みてね。',
      promiseTitle: 'あかずきんと やくそく（タップで ✅）',
      promise: ['みちから はずれない', 'しらない ひとに いきさきを おしえない'],
      house: '3ページで「おばあさんの いえ」と こたえたね。 しょうじきで えらい！ でも しらない ひとには「ないしょ」で いいんだよ。',
      secret: '3ページで「ないしょ！」と こたえたね。 しらない ひとに おしえない、 ばっちり！',
      none: '',
      flowers: (n) => (n ? `おはな ${n}ほん つんだね。 でも より[道|みち]は ほどほどに。` : 'より[道|みち]を しないで いそいだね。 えらい！'),
    },
    en: {
      big: 'The End',
      sub: 'If something seems strange, take a good, careful look.',
      promiseTitle: 'Promises with Little Red Riding Hood (tap to ✅)',
      promise: ['Stay on the path', 'Don’t tell strangers where you’re going'],
      house: 'On page 3, you said “To Grandma’s.” Being honest is good! But with strangers, it’s fine to say “It’s a secret.”',
      secret: 'On page 3, you said “It’s a secret!” Not telling strangers. Well done!',
      none: '',
      flowers: (n) => (n ? `You picked ${n} flower${n === 1 ? '' : 's'}. But don’t wander off too long!` : 'You didn’t wander off at all. Great job!'),
    },
  };

  const PAGES = [
    {
      id: 'kago',
      scene: { place: 'kitchen', aka: { x: 740, face: 'smile' }, mother: { x: 90, face: 'talk' }, items: true },
      text: [
        t('むかし むかし、 あかい ずきんが よく にあう [女|おんな]の[子|こ]が いました。 みんなは 「あかずきん」と よびました。',
          'Once upon a time, there was a little girl who always wore a red hood. Everyone called her Little Red Riding Hood.'),
        t('「おばあさんが かぜを ひいたの。 おみまいに いって くれる？」',
          '“Grandma has a cold. Will you go and visit her?”'),
        t('「[森|もり]の みちから はずれないでね。 より[道|みち]も しないでね。」',
          '“Stay on the path through the woods, and don’t wander off.”'),
      ],
      steps: [{
        kind: 'basket', need: 3,
        hint: t('🧺 おみまいの ものを かごへ ドラッグして いれよう', '🧺 Drag the presents into the basket'),
        then: [
          t('かごが いっぱいに なりました。', 'The basket was full.'),
          t('「いって きます！」', '“Bye, Mom! I’m off!”'),
        ],
      }],
    },
    {
      id: 'michi',
      scene: { place: 'path', aka: { face: 'smile', basket: true } },
      text: [
        t('あかずきんは [森|もり]の みちを あるいて いきました。', 'Little Red Riding Hood walked along the path through the woods.'),
        t('ことりが ちゅんちゅん うたって います。', 'The little birds were singing, tweet, tweet.'),
      ],
      steps: [{
        kind: 'path',
        hint: t('☝️ あかずきんを ゆびで みちに そって なぞろう', '☝️ Trace the path with your finger to walk her along'),
        then: [t('てく てく てく。 みちを ちゃんと まもって あるきました。', 'Step, step, step. She stayed on the path all the way.')],
      }],
    },
    {
      id: 'ookami',
      scene: { place: 'meet', aka: { x: 250, face: 'wow', basket: true }, wolf: { x: 540, flip: true, face: 'grin' } },
      text: [
        t('すると、 [木|き]の かげから おおかみが でて きました。', 'Then, a wolf stepped out from behind a tree.'),
        t('「やあ、 おじょうちゃん。 どこへ いくの？」', '“Hello, little girl. Where are you going?”', W),
      ],
      steps: [{
        kind: 'choose',
        hint: t('💬 なんて こたえる？ ふきだしを タップしてね', '💬 What will she say? Tap a speech bubble'),
        thenBy: {
          house: [
            t('「おばあさんの いえに いくの。」', '“I’m going to Grandma’s house.”'),
            t('「ふーん、 [森|もり]の おくの いえだね。」', '“I see. The house deep in the woods.”', W),
          ],
          secret: [
            t('「ないしょ！」', '“It’s a secret!”'),
            t('「ふーん…。 きっと [森|もり]の おくの おばあさんの いえだな。」', '“Hmm… I bet it’s Grandma’s house deep in the woods.”', W),
          ],
        },
        then: [t('おおかみは かってに あてて、 にやりと しました。', 'The wolf guessed on his own and grinned.')],
      }],
    },
    {
      id: 'hana',
      scene: { place: 'meadow', aka: { x: 110, face: 'wow', basket: true }, wolf: { x: 640, face: 'grin', flip: true } },
      text: [
        t('「あっちに きれいな おはなが いっぱい あるよ。」', '“Look over there. So many pretty flowers!”', W),
        t('おおかみは そう いうと、 どこかへ いって しまいました。', 'Then the wolf went away somewhere.'),
      ],
      steps: [{
        kind: 'flowers',
        hint: t('🌼 おはなを タップで つめるよ。 「🧺 さきを いそぐ」で つぎへ', '🌼 Tap flowers to pick them. Tap “🧺 Hurry on” to go on'),
        then: [t('「いけない、 おばあさんが まってる！」 あかずきんは いそいで あるきだしました。', '“Oh no, Grandma is waiting!” She hurried on her way.')],
      }],
    },
    {
      id: 'kakusu',
      scene: { place: 'room', bed: 'empty', closet: 0, granny: { x: 330, face: 'wow' } },
      text: [
        t('そのころ、 おおかみは さきまわりして おばあさんの いえへ。 トントン。', 'Meanwhile, the wolf ran ahead to Grandma’s house. Knock, knock.'),
        t('おばあさんは まどから のぞいて びっくり。 「おおかみだわ！」', 'Grandma peeked out the window. “Oh my, it’s a wolf!”'),
      ],
      steps: [
        {
          kind: 'hide',
          hint: t('👵 おばあさんを クローゼットへ ドラッグして かくして あげよう', '👵 Drag Grandma into the closet to hide her'),
          then: [t('「ありがとう、 ここで まってるね。」', '“Thank you. I’ll wait in here.”')],
        },
        {
          kind: 'shut',
          hint: t('👉 クローゼットの とびらを みぎへ スワイプして しめよう', '👉 Swipe the closet door to the right to close it'),
          then: [
            t('おおかみは いえに はいると、 おばあさんの ねまきと ナイトキャップを きて、 ベッドに もぐりこみました。', 'The wolf came in, put on Grandma’s nightgown and nightcap, and climbed into her bed.'),
            t('「ひっひっ。 これで おばあさんに みえるぞ。」', '“Hee hee. Now I look just like Grandma.”', W),
          ],
        },
      ],
    },
    {
      id: 'nokku',
      scene: { place: 'cottage', aka: { x: 300, face: 'smile', basket: true } },
      text: [t('やがて、 あかずきんが おばあさんの いえに つきました。', 'Soon, Little Red Riding Hood arrived at Grandma’s house.')],
      steps: [{
        kind: 'knock', need: 3,
        hint: t('👆 ドアを 3かい タップして ノックしよう', '👆 Tap the door 3 times to knock'),
        then: [
          t('「おはいり…。」', '“Come in…”', W),
          t('あれ？ おばあさんの こえ、 なんだか へんだな。', 'Huh? Grandma’s voice sounded strange.'),
        ],
      }],
    },
    {
      id: 'tashikameru',
      scene: { place: 'room', bed: 'wolf', closet: 1, aka: { x: 580, face: 'think', basket: true, flip: true } },
      text: [
        t('ベッドには おばあさんが ねて います。 でも、 なんだか いつもと ちがいます。', 'Grandma was lying in bed. But something looked different.'),
      ],
      steps: [
        {
          kind: 'zoom', part: 'ears',
          hint: t('👆 ひかって いる みみを タップ（ゆび 2ほんで ひろげても いいよ）', '👆 Tap the glowing ears (or spread two fingers)'),
          then: [
            t('「おばあさん、 どうして そんなに おおきな みみ なの？」', '“Grandma, what big ears you have!”'),
            t('「おまえの こえが よく きこえる ように さ。」', '“All the better to hear you with!”', W),
          ],
        },
        {
          kind: 'zoom', part: 'eyes',
          hint: t('👆 こんどは ひかって いる めを さわって みよう', '👆 Now touch the glowing eyes'),
          then: [
            t('「どうして そんなに おおきな め なの？」', '“Grandma, what big eyes you have!”'),
            t('「おまえが よく みえる ように さ。」', '“All the better to see you with!”', W),
          ],
        },
        {
          kind: 'zoom', part: 'hands',
          hint: t('👆 つぎは ひかって いる てを さわって みよう', '👆 Next, touch the glowing hands'),
          then: [
            t('「どうして そんなに おおきな て なの？」', '“Grandma, what big hands you have!”'),
            t('「おまえを ぎゅっと できる ように さ。」', '“All the better to hug you with!”', W),
          ],
        },
        {
          kind: 'zoom', part: 'mouth',
          hint: t('👆 さいごは ひかって いる くちを さわって みよう', '👆 Last, touch the glowing mouth'),
          then: [
            t('「どうして そんなに おおきな くち なの？」', '“Grandma, what a big mouth you have!”'),
            t('「それは おまえを…… おっと！」', '“All the better to… (oops!)”', W),
          ],
        },
      ],
    },
    {
      id: 'miyaburu',
      scene: { place: 'room', bed: 'wolf', closet: 1, aka: { x: 580, face: 'think', basket: true, flip: true } },
      text: [
        t('おばあさんは あわてて くちを とじました。 ふとんの なかで、 なにかが もぞもぞ うごいて います。', 'Grandma quickly shut her mouth. Something was wiggling under the blanket.'),
        t('へんだな？ よーく みて みよう。', 'That’s odd… Let’s take a good look.'),
      ],
      steps: [{
        kind: 'flip',
        hint: t('👇 ふとんを したへ スワイプして めくろう', '👇 Swipe the blanket down to pull it back'),
        then: [
          t('ふさふさの しっぽ！ 「おおかみだ！」', 'A fluffy tail! “It’s the wolf!”'),
          t('あかずきんは さっと まどの ほうへ にげました。', 'Little Red Riding Hood dashed over to the window.'),
        ],
      }],
    },
    {
      id: 'kikori',
      scene: { place: 'room', bed: 'mess', closet: 1, aka: { x: 470, face: 'worry', pose: 'point' }, wolf: { x: 250, face: 'grin', cap: true }, kikoriWin: { face: 'smile' } },
      text: [
        t('まどの そとを、 きこりの おじさんが とおりかかりました。', 'Just then, a woodcutter was walking past the window.'),
        t('「おじさーん！ たすけて！」', '“Mister! Help, please!”'),
      ],
      steps: [{
        kind: 'shout',
        hint: t('📣 きこりの おじさんを なんども タップ！ ゆび なんぼんでも いいよ', '📣 Tap the woodcutter again and again! Use as many fingers as you like'),
        then: [
          t('「こらーっ！」 きこりの おじさんの おおごえ。', '“HEY, YOU!” shouted the woodcutter.'),
          t('おおかみは びっくり して、 [森|もり]の おくへ すっとんで いきました。', 'The wolf jumped in fright and ran off deep into the woods.'),
          t('とおくから 「もう しませーん！」', 'From far away came, “I won’t do it again!”', W),
        ],
      }],
    },
    {
      id: 'ochakai',
      scene: { place: 'room', closet: 1, table: true, aka: { x: 170, face: 'smile' }, kikori: { x: 70, face: 'smile', s: 0.95 }, granny: { inCloset: true, face: 'smile' } },
      text: [
        t('しずかに なりました。 クローゼットの なかから 「もう だいじょうぶ？」と こえが します。', 'All was quiet. A voice came from the closet: “Is it safe now?”'),
      ],
      steps: [
        {
          kind: 'closet',
          hint: t('👆 クローゼットを タップして あけよう', '👆 Tap the closet to open it'),
          then: [t('おばあさんが にこにこ でて きました。 「あかずきん、 ありがとう！」', 'Out came Grandma with a big smile. “Thank you, my dear!”')],
        },
        {
          kind: 'cake', need: 3,
          hint: t('🍰 ケーキを 3にんの おさらへ ドラッグして くばろう', '🍰 Drag the cake onto the three plates'),
          then: [
            t('「いただきます！」', '“Let’s eat!”'),
            t('みんなで たのしい おちゃかいを しました。', 'And they all had a happy tea party together.'),
          ],
        },
      ],
    },
  ];

  // 「もういちど もりへ」で あそべる ページ（2・4・7・8・9）
  const FREE = ['michi', 'hana', 'tashikameru', 'miyaburu', 'kikori'];

  // せりふ を よみあげ よう の もじ に（かぎかっこ を とる）
  // [漢字|かんじ] は よみ（かな）に して よむ（よみまちがい を ふせぐ）
  const plain = (s) => s.replace(/\[([^|\]]+)\|([^\]]+)\]/g, '$2').replace(/[「」“”]/g, '').replace(/…+/g, '、');
  const plainEn = (s) => s.replace(/[“”]/g, '').replace(/…/g, ', ').replace(/—/g, ', ').replace(/\(oops!\)/, 'oops!');
  // [漢字|かんじ] → <ruby>漢字<rt>かんじ</rt></ruby>
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ruby = (s) => esc(s).replace(/\[([^|\]]+)\|([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');

  return { SAY, LABEL, END, PAGES, FREE, plain, plainEn, ruby };
})();
