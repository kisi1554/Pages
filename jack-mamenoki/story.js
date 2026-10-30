'use strict';

/*
 * おはなし の データ。ページ と 文 と しかけ。
 * イギリス の むかしばなし「ジャックと まめのき」を もと に した、この アプリ の ため の オリジナル の 文。
 * こわく しない: きょじん は おちない・たおされない。にわとり は じぶん から「いっしょに いきたい」と ついて くる。
 *
 * page = {
 *   id, scene: え の はじめ の かたち（app.js の makeScene が つかう）,
 *   text: [さいしょ に でる 文],
 *   steps: [{ kind, hint, then: [しかけ が おわったら でる 文], ... }],
 * }
 * しかけ の しゅるい（kind）
 *   trade  … おじいさん を タップ すると、うし の ミルキー と まほう の まめ を とりかえる
 *   plant  … はたけ の あな を タップ して まめ を うえる（need こ）
 *   water  … じょうろ を タップ して みず を やる（need かい）。よる に なる
 *   grow   … まめのき を うえ へ なぞって のばす（mame.js）。need は のびた たかさ（0〜1）
 *   climb  … がめん の ひだり と みぎ を こうご に タップ して のぼる（mame.js）。need は のぼった かず
 *   sneak  … ジャック を みぎ へ そーっと ドラッグ（mame.js）。はやすぎる と きょじん が むにゃむにゃ
 *   cage   … とりかご の かぎ を タップ で あける
 *   down   … ひだり と みぎ を こうご に タップ して おりる（climb と おなじ しくみ）
 *   chop   … まめのき の ねもと を タップ して きる（need かい）
 *   egg    … にわとり を タップ すると きん の たまご（need こ）
 *   cow    … もん を タップ すると ミルキー が かえって くる
 * 「」の なか は せりふ。[漢字|かんじ] で ふりがな つき の かんじ に なる。
 * 文・ヒント・ふきだし は どれも { ja, en }（にほんご と えいご）。🇬🇧 ボタン で いつでも きりかえ られる。
 */
const Story = (() => {
  const t = (ja, en) => ({ ja, en });

  // え の なか の ふきだし
  const SAY = {
    ja: {
      moo: 'もー', trade: 'とりかえっこ！', magic: 'まほうの まめじゃ',
      pon: 'ぽこっ', jyaa: 'しゃー', sparkle: 'きらきら…',
      nyoki: 'にょきにょき！', wow: 'わあ！',
      yoisho: 'よいしょ', slip: 'おっとっと', clouds: 'くもの うえ！',
      zzz: 'ぐうぐう', munya: 'むにゃむにゃ…', shh: 'そーっと…',
      open: 'カチャッ', kokko: 'コケッ！', together: 'いっしょに いく！',
      fee: 'フィー ファイ フォー ファム！', hurry: 'いそげ！',
      kon: 'コーン', fall: 'ゆらーっ', punpun: 'ぷんぷん',
      golden: 'きんの たまご！', home: 'おかえり！', end: 'おしまい',
    },
    en: {
      moo: 'Moo!', trade: 'It’s a deal!', magic: 'Magic beans!',
      pon: 'Pop!', jyaa: 'Splash!', sparkle: 'Twinkle…',
      nyoki: 'Grow, grow!', wow: 'Wow!',
      yoisho: 'Up!', slip: 'Whoops!', clouds: 'Above the clouds!',
      zzz: 'Zzz…', munya: 'Mumble…', shh: 'Shh…',
      open: 'Click!', kokko: 'Cluck!', together: 'Take me too!',
      fee: 'Fee-fi-fo-fum!', hurry: 'Hurry!',
      kon: 'Chop!', fall: 'Wobble…', punpun: 'Hmph!',
      golden: 'A golden egg!', home: 'Welcome home!', end: 'The End',
    },
  };

  // メーター の なまえ・バッジ
  const LABEL = {
    ja: { height: 'たかさ', climb: 'のぼる', down: 'おりる', quiet: 'しずかに', two: 'ゆび 2ほん！', free: 'もういちど' },
    en: { height: 'Height', climb: 'Climb', down: 'Down', quiet: 'Quiet', two: 'Two fingers!', free: 'Again' },
  };

  // おしまい の がめん
  const END = {
    ja: {
      big: 'おしまい',
      sub: 'ゆうきを だして ためして みると、 すてきな ことが まって いるね。',
      eggs: '🥚 きんの たまご',
      climbs: '🌱 のぼった かず',
    },
    en: {
      big: 'The End',
      sub: 'When you are brave and give it a try, wonderful things can happen.',
      eggs: '🥚 Golden eggs',
      climbs: '🌱 Times you climbed',
    },
  };

  const PAGES = [
    {
      id: 'ushi',
      scene: { place: 'road', time: 'day', jack: { x: 170, face: 'sad' }, cow: { x: 80 }, oldman: { x: 560 } },
      text: [
        t('むかし むかし、 ジャックと いう [男|おとこ]の[子|こ]が おかあさんと くらして いました。',
          'Once upon a time, a boy named Jack lived with his mother.'),
        t('うちには もう、 うしの ミルキーしか いません。 「いちばで ミルキーを うって おいで。」',
          'All they had left was their cow, Milky. “Take Milky to the market and sell her,” said his mother.'),
        t('とちゅうで、 ふしぎな おじいさんに あいました。',
          'On the way, Jack met a strange old man.'),
      ],
      steps: [{
        kind: 'trade',
        hint: t('👆 おじいさんを タップしてね', '👆 Tap the old man'),
        then: [
          t('「その うしと、 この まほうの まめを とりかえっこ しないかね？」', '“Would you trade that cow for these magic beans?”'),
          t('ジャックは きらきら ひかる まめ 3つぶと、 ミルキーを とりかえました。', 'Jack traded Milky for three sparkling beans.'),
        ],
      }],
    },
    {
      id: 'mame',
      scene: { place: 'home', time: 'dusk', jack: { x: 300, face: 'smile', beans: true }, mother: { x: 140, face: 'sigh' }, holes: 3, can: true },
      text: [
        t('「まあ、 まめ 3つぶ だけ？」 おかあさんは ためいきを つきました。', '“Just three beans?” sighed his mother.'),
        t('「でも まほうの まめ なんだって。 うえて みようよ！」', '“But they’re magic beans! Let’s plant them!”'),
      ],
      steps: [
        {
          kind: 'plant', need: 3,
          hint: t('👆 はたけの あなを タップして まめを うえよう', '👆 Tap the holes to plant the beans'),
          then: [t('ぽこっ、 ぽこっ、 ぽこっ。 まめを 3つぶ うえました。', 'Pop, pop, pop! Jack planted all three beans.')],
        },
        {
          kind: 'water', need: 3,
          hint: t('🚿 じょうろを タップして みずを やろう', '🚿 Tap the watering can to water the beans'),
          then: [
            t('しゃー。 やがて [夜|よる]に なり、 はたけが きらきら ひかりました。', 'Splash! Night came, and the garden began to twinkle.'),
          ],
        },
      ],
    },
    {
      id: 'nobiru',
      scene: { place: 'home', time: 'morning', jack: { x: 250, face: 'wow' }, mother: { x: 110, face: 'wow' }, stalk: 0.06 },
      text: [
        t('つぎの [朝|あさ]。 「あれっ、 なにか でてる！」', 'The next morning… “Look! Something is growing!”'),
      ],
      steps: [{
        kind: 'grow', need: 1,
        hint: t('☝️ まめのきを したから うえへ なぞって のばそう', '☝️ Swipe up on the beanstalk to make it grow'),
        then: [
          t('にょき にょき にょきーっ！', 'It grew and grew and grew!'),
          t('まめのきは くもを つきぬけて、 そらの うえまで のびました。', 'The beanstalk grew right up through the clouds!'),
        ],
      }],
    },
    {
      id: 'noboru',
      scene: { place: 'climb', dir: 'up', jack: { face: 'smile' } },
      text: [
        t('「よーし、 のぼって みよう！」', '“I’m going to climb it!”'),
        t('ジャックは まめのきを のぼりはじめました。', 'Jack began to climb the beanstalk.'),
      ],
      steps: [{
        kind: 'climb', need: 14,
        hint: t('👆👆 がめんの ひだりと みぎを こうごに タップして のぼろう', '👆👆 Tap left, right, left, right to climb'),
        then: [
          t('よいしょ、 よいしょ。 とりを こえて、 くもを ぬけて…', 'Up, up, up! Past the birds and through the clouds…'),
          t('とうとう くもの うえに つきました！', 'At last, Jack reached the top of the clouds!'),
        ],
      }],
    },
    {
      id: 'shiro',
      scene: { place: 'castle', jack: { x: 120, face: 'shh' }, giant: 'sleep', cage: { open: false } },
      text: [
        t('くもの うえには おおきな おしろ。 なかでは きょじんが ぐうぐう ねむって いました。', 'On top of the clouds stood a huge castle. Inside, a giant was fast asleep.'),
        t('おくの とりかごで、 にわとりが さみしそうに ないて います。', 'In a cage at the back, a hen was clucking sadly.'),
      ],
      steps: [{
        kind: 'sneak',
        hint: t('🤫 ジャックを ゆっくり みぎへ ドラッグしよう。 はやいと きょじんが おきちゃう！', '🤫 Drag Jack slowly to the right. Too fast and the giant will wake!'),
        then: [t('そーっと、 そーっと。 とりかごの まえまで これました。', 'Shh… slowly, slowly. Jack tiptoed all the way to the cage.')],
      }],
    },
    {
      id: 'niwatori',
      scene: { place: 'castle', jack: { x: 560, face: 'smile' }, giant: 'sleep', cage: { open: false }, near: true },
      text: [
        t('「こんにちは。 どうして ないて いるの？」', '“Hello. Why are you so sad?”'),
        t('「ずっと この かごの なかなの。 おそとに でたいわ。」', '“I’ve been stuck in this cage forever. I want to go outside.”'),
      ],
      steps: [{
        kind: 'cage',
        hint: t('👆 とりかごの かぎを タップして あけよう', '👆 Tap the lock to open the cage'),
        then: [
          t('カチャッ！ とびらが あきました。', 'Click! The little door swung open.'),
          t('「ありがとう！ わたしも いっしょに つれて いって！」', '“Thank you! Please take me with you!”'),
        ],
      }],
    },
    {
      id: 'nigeru',
      scene: { place: 'climb', dir: 'down', jack: { face: 'wow', hen: true } },
      text: [
        t('そのとき、 きょじんが めを さましました。 「フィー ファイ フォー ファム！」', 'Just then, the giant woke up. “Fee-fi-fo-fum!”'),
        t('ジャックは にわとりを だいて、 いそいで まめのきを おりました。', 'Jack held the hen tight and hurried down the beanstalk.'),
      ],
      steps: [{
        kind: 'down', need: 12,
        hint: t('👆👆 ひだりと みぎを こうごに タップして おりよう', '👆👆 Tap left, right, left, right to climb down'),
        then: [t('するする するっ。 やっと じめんに つきました！', 'Down, down, down! Jack was back on the ground at last!')],
      }],
    },
    {
      id: 'kiru',
      scene: { place: 'home', time: 'day', jack: { x: 300, face: 'wow', axe: true }, mother: { x: 120, face: 'wow' }, stalk: 1, hen: { x: 190 }, giantTop: true },
      text: [
        t('「おかあさん、 おのを かして！」', '“Mother, hand me the axe!”'),
        t('ジャックは まめのきを きる ことに しました。', 'Jack decided to chop down the beanstalk.'),
      ],
      steps: [{
        kind: 'chop', need: 5,
        hint: t('🪓 まめのきの ねもとを タップして きろう', '🪓 Tap the bottom of the beanstalk to chop it'),
        then: [
          t('コーン、 コーン！ まめのきは ゆらーっと ゆれて、 ばったり たおれました。', 'Chop, chop! The beanstalk wobbled and fell down with a thud.'),
          t('くもの うえの きょじんは 「ぷんぷん！」と おこって いる だけ。 もう おりて こられません。', 'Up on the clouds, the giant just huffed, “Hmph!” He could not come down anymore.'),
        ],
      }],
    },
    {
      id: 'shiawase',
      scene: { place: 'home', time: 'day', jack: { x: 330, face: 'smile' }, mother: { x: 150, face: 'smile' }, hen: { x: 470 }, gate: true },
      text: [
        t('にわとりは まいにち、 ぴかぴかの きんの たまごを うんで くれました。', 'Every day, the hen laid a shiny golden egg.'),
      ],
      steps: [
        {
          kind: 'egg', need: 3,
          hint: t('👆 にわとりを タップしてね', '👆 Tap the hen'),
          then: [t('「きんの たまごで、 ミルキーを かいもどそう！」', '“Let’s use a golden egg to buy Milky back!”')],
        },
        {
          kind: 'cow',
          hint: t('👆 もんを タップして ミルキーを むかえよう', '👆 Tap the gate to welcome Milky home'),
          then: [
            t('「もー！」 ミルキーが かえって きました。', '“Moo!” Milky came home.'),
            t('ジャックと おかあさんと にわとりと ミルキーは、 いつまでも なかよく くらしました。', 'And Jack, his mother, the hen, and Milky lived happily ever after.'),
          ],
        },
      ],
    },
  ];

  // 「もういちど のぼる」で あそべる ページ（nobiru〜nigeru）
  const FREE = ['nobiru', 'noboru', 'shiro', 'niwatori', 'nigeru'];

  // せりふ を よみあげ よう の もじ に（かぎかっこ を とる）
  // [漢字|かんじ] は よみ（かな）に して よむ（よみまちがい を ふせぐ）
  const plain = (s) => s.replace(/\[([^|\]]+)\|([^\]]+)\]/g, '$2').replace(/[「」“”]/g, '').replace(/…/g, '、');
  const plainEn = (s) => s.replace(/[“”]/g, '').replace(/…/g, ', ').replace(/—/g, ', ');
  // [漢字|かんじ] → <ruby>漢字<rt>かんじ</rt></ruby>
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ruby = (s) => esc(s).replace(/\[([^|\]]+)\|([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');

  return { SAY, LABEL, END, PAGES, FREE, plain, plainEn, ruby };
})();
