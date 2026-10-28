'use strict';

/*
 * おはなし の データ。ページ と 文 と しかけ。
 *
 * page = {
 *   id, scene: え の はじめ の かたち（app.js の makeScene が つかう）,
 *   text: [さいしょ に でる 文],
 *   steps: [{ kind, hint, then: [しかけ が おわったら でる 文], ... }],
 * }
 * しかけ の しゅるい（kind）
 *   water … つち を トントン（3かい）で め が でる
 *   grow  … かぶ を タップ／うえに なぞる（4かい）で おおきく なる
 *   call  … まって いる なかま を タップ すると あるいて きて れつ に ならぶ
 *   pull  … ゆび で みぎ へ ひっぱる。goal: 'fail'（ぬけない）／'out'（ぬける）
 *   soup  … おなべ を タップ
 * 「」の なか は せりふ。[漢字|かんじ] で ふりがな つき の かんじ に なる。
 * 文 と ヒント は どれも { ja, en }（にほんご と えいご）。🇬🇧 ボタン で いつでも きりかえ られる。
 */
const Story = (() => {
  const ORDER = ['jiji', 'baba', 'mago', 'inu', 'neko', 'nezumi'];
  const NAME = { jiji: 'おじいさん', baba: 'おばあさん', mago: 'まご', inu: '[犬|いぬ]', neko: '[猫|ねこ]', nezumi: 'ねずみ' };
  const NAME_EN = { jiji: 'the old man', baba: 'the old woman', mago: 'the granddaughter', inu: 'the dog', neko: 'the cat', nezumi: 'the mouse' };
  // れつ の いち（あしもと の x）。よばれる まえ は WAIT で まつ
  const SLOT = { jiji: 295, baba: 375, mago: 445, inu: 515, neko: 590, nezumi: 635 };
  const WAIT = { baba: 730, mago: 735, inu: 735, neko: 740, nezumi: 745 };
  const CALL = {
    ja: { baba: 'はいはい', mago: 'はーい！', inu: 'わん わん！', neko: 'にゃーお', nezumi: 'ちゅう！' },
    en: { baba: 'Coming!', mago: 'Coming!', inu: 'Woof woof!', neko: 'Meow!', nezumi: 'Squeak!' },
  };
  // え の なか の ふきだし
  const SAY = {
    ja: { big: 'おおきい！', nope: 'ぬけない…', heave: ['うんとこしょ！', 'どっこいしょ！'], end: 'おしまい' },
    en: { big: 'So big!', nope: 'Stuck…', heave: ['Heave!', 'Ho!'], end: 'The end' },
  };
  // ひっぱった ときの ふきだし の たかさ（あたま の うえ）
  const HEAD = { jiji: 195, baba: 182, mago: 140, inu: 90, neko: 78, nezumi: 40 };

  const t = (ja, en) => ({ ja, en });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // 「ねずみが ねこを ひっぱって、… おじいさんが かぶを ひっぱって」
  function chain(n) {
    const parts = [];
    for (let i = n - 1; i >= 1; i -= 1) {
      parts.push(t(`${NAME[ORDER[i]]}が ${NAME[ORDER[i - 1]]}を [引|ひ]っぱって、`,
        `${cap(NAME_EN[ORDER[i]])} pulled ${NAME_EN[ORDER[i - 1]]},`));
    }
    parts.push(t('おじいさんが かぶを [引|ひ]っぱって…', 'and the old man pulled the turnip…'));
    return parts;
  }

  const FAIL = [
    ['ところが', 'But'], ['それでも', 'Still,'], ['まだまだ', 'Even so,'], ['やっぱり', 'But still,'], ['まだ まだ', 'And still'],
  ];

  const PAGES = [
    {
      id: 'tane',
      scene: { kabu: { scale: 0 }, mound: true, jouro: true, chars: { jiji: 'stand' } },
      text: [
        t('むかし むかし、 おじいさんが かぶの [種|たね]を まきました。', 'Once upon a time, an old man planted a turnip seed.'),
        t('「[甘|あま]い [甘|あま]い かぶに なあれ。 [大|おお]きな [大|おお]きな かぶに なあれ。」',
          '“Grow, little turnip, grow sweet and sweet! Grow, little turnip, grow big and big!”'),
      ],
      steps: [{
        kind: 'water', need: 3,
        hint: t('💧 [土|つち]を 3[回|かい] トントン して [水|みず]を あげよう', '💧 Tap the soil 3 times to water it'),
        then: [t('ぴょこん！ [小|ちい]さな [芽|め]が [出|で]ました。', 'Pop! A tiny sprout came up.')],
      }],
    },
    {
      id: 'sodatsu',
      scene: { kabu: { scale: 0.16 }, chars: { jiji: 'stand' } },
      text: [t('かぶは お[日|ひ]さまを あびて、 ぐんぐん ぐんぐん [育|そだ]ちました。',
        'The turnip soaked up the sunshine, and it grew, and grew, and grew.')],
      steps: [{
        kind: 'grow', need: 4,
        hint: t('🌱 かぶを [何回|なんかい]も タップ！ [上|うえ]に なぞっても いいよ', '🌱 Tap the turnip again and again! You can swipe up, too'),
        then: [t('[甘|あま]くて [元気|げんき]な、 とてつもなく [大|おお]きな かぶに なりました。',
          'It became a sweet, strong, enormous turnip!')],
      }],
    },
  ];

  // おじいさん → … → ねずみ。1にんずつ ふえる
  ORDER.forEach((id, i) => {
    const n = i + 1;
    const last = n === ORDER.length;
    const pull = {
      kind: 'pull',
      goal: last ? 'out' : 'fail',
      need: last ? 4 : 2,
      hint: last
        ? t('👉 [右|みぎ]へ [引|ひ]っぱろう！ [指|ゆび]を 2[本|ほん]、3[本|ぼん]…みんなで [引|ひ]っぱると [強|つよ]いよ',
          '👉 Pull to the right! Use 2 or 3 fingers… pulling together makes you stronger')
        : t('👉 [指|ゆび]で [右|みぎ]へ ぐいっと [引|ひ]っぱろう', '👉 Pull to the right with your finger'),
      then: last
        ? [t('「うんとこしょ、 どっこいしょ！」', '“Heave-ho! Heave-ho!”'), t('すっぽーん！', 'POP!'),
          t('とうとう かぶは [抜|ぬ]けました！', 'At last, up came the turnip!')]
        : [t('「うんとこしょ、 どっこいしょ。」', '“Heave-ho! Heave-ho!”'),
          t(`${FAIL[i][0]} かぶは [抜|ぬ]けません。`, `${FAIL[i][1]} the turnip would not come up.`)],
    };
    const chars = {};
    ORDER.slice(0, n).forEach((w) => { chars[w] = 'reach'; });
    if (i === 0) {
      PAGES.push({
        id: 'jiji',
        scene: { kabu: { scale: 1 }, chars: { jiji: 'reach' } },
        text: [
          t('おじいさんは かぶを [抜|ぬ]こうと しました。', 'The old man tried to pull up the turnip.'),
          t('かぶの [葉|は]っぱを ぎゅっと つかんで…', 'He held the leaves tight, and…'),
        ],
        steps: [pull],
      });
      return;
    }
    const caller = ORDER[i - 1];
    PAGES.push({
      id,
      scene: { kabu: { scale: 1 }, chars, waiting: id },
      text: [t(`${NAME[caller]}は ${NAME[id]}を [呼|よ]んで きました。`, `${cap(NAME_EN[caller])} called ${NAME_EN[id]} to help.`)],
      steps: [
        {
          kind: 'call', who: id,
          hint: t(`👆 ${NAME[id]}を タップして [呼|よ]んで こよう`, `👆 Tap ${NAME_EN[id]} to call for help`),
          then: [t(`「${CALL.ja[id]}」`, `“${CALL.en[id]}”`)].concat(chain(n)),
        },
        pull,
      ],
    });
  });

  PAGES.push({
    id: 'soup',
    scene: { kabu: null, pot: true, party: true },
    text: [t('みんなで かぶを [家|うち]へ [運|はこ]んで、 [大|おお]きな お[鍋|なべ]で スープを [作|つく]りました。',
      'Everyone carried the turnip home and made soup in a big pot.')],
    steps: [{
      kind: 'soup', need: 1,
      hint: t('🍲 お[鍋|なべ]を タップしてね', '🍲 Tap the pot'),
      then: [t('「いただきます！」', '“Let’s eat!”'), t('[甘|あま]くて あったかい かぶの スープ。 みんな にっこり。', 'Warm, sweet turnip soup. Everyone smiled.')],
    }],
  });

  // せりふ を よみあげ よう の もじ に（かぎかっこ を とる）
  // [漢字|かんじ] は よみ（かな）に して よむ（よみまちがい を ふせぐ）
  const plain = (s) => s.replace(/\[([^|\]]+)\|([^\]]+)\]/g, '$2').replace(/[「」“”]/g, '').replace(/…/g, '、');
  const plainEn = (s) => s.replace(/[“”]/g, '').replace(/…/g, ', ');
  // [漢字|かんじ] → <ruby>漢字<rt>かんじ</rt></ruby>
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ruby = (s) => esc(s).replace(/\[([^|\]]+)\|([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');

  return { ORDER, NAME, NAME_EN, SLOT, WAIT, CALL, SAY, HEAD, PAGES, plain, plainEn, ruby };
})();
