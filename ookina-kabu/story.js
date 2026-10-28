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
 */
const Story = (() => {
  const ORDER = ['jiji', 'baba', 'mago', 'inu', 'neko', 'nezumi'];
  const NAME = { jiji: 'おじいさん', baba: 'おばあさん', mago: 'まご', inu: '[犬|いぬ]', neko: '[猫|ねこ]', nezumi: 'ねずみ' };
  // れつ の いち（あしもと の x）。よばれる まえ は WAIT で まつ
  const SLOT = { jiji: 295, baba: 375, mago: 445, inu: 515, neko: 590, nezumi: 635 };
  const WAIT = { baba: 730, mago: 735, inu: 735, neko: 740, nezumi: 745 };
  const CALL = { baba: 'はいはい', mago: 'はーい！', inu: 'わん わん！', neko: 'にゃーお', nezumi: 'ちゅう！' };
  // ひっぱった ときの ふきだし の たかさ（あたま の うえ）
  const HEAD = { jiji: 195, baba: 182, mago: 140, inu: 90, neko: 78, nezumi: 40 };

  // 「ねずみが ねこを ひっぱって、… おじいさんが かぶを ひっぱって」
  function chain(n) {
    const parts = [];
    for (let i = n - 1; i >= 1; i -= 1) parts.push(`${NAME[ORDER[i]]}が ${NAME[ORDER[i - 1]]}を [引|ひ]っぱって、`);
    parts.push('おじいさんが かぶを [引|ひ]っぱって…');
    return parts;
  }

  const FAIL = ['ところが', 'それでも', 'まだまだ', 'やっぱり', 'まだ まだ'];

  const PAGES = [
    {
      id: 'tane',
      scene: { kabu: { scale: 0 }, mound: true, jouro: true, chars: { jiji: 'stand' } },
      text: [
        'むかし むかし、 おじいさんが かぶの [種|たね]を まきました。',
        '「[甘|あま]い [甘|あま]い かぶに なあれ。 [大|おお]きな [大|おお]きな かぶに なあれ。」',
      ],
      steps: [{ kind: 'water', need: 3, hint: '💧 [土|つち]を 3[回|かい] トントン して [水|みず]を あげよう', then: ['ぴょこん！ [小|ちい]さな [芽|め]が [出|で]ました。'] }],
    },
    {
      id: 'sodatsu',
      scene: { kabu: { scale: 0.16 }, chars: { jiji: 'stand' } },
      text: ['かぶは お[日|ひ]さまを あびて、 ぐんぐん ぐんぐん [育|そだ]ちました。'],
      steps: [{
        kind: 'grow', need: 4, hint: '🌱 かぶを [何回|なんかい]も タップ！ [上|うえ]に なぞっても いいよ',
        then: ['[甘|あま]くて [元気|げんき]な、 とてつもなく [大|おお]きな かぶに なりました。'],
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
        ? '👉 [右|みぎ]へ [引|ひ]っぱろう！ [指|ゆび]を 2[本|ほん]、3[本|ぼん]…みんなで [引|ひ]っぱると [強|つよ]いよ'
        : '👉 [指|ゆび]で [右|みぎ]へ ぐいっと [引|ひ]っぱろう',
      then: last
        ? ['「うんとこしょ、 どっこいしょ！」', 'すっぽーん！', 'とうとう かぶは [抜|ぬ]けました！']
        : ['「うんとこしょ、 どっこいしょ。」', `${FAIL[i]} かぶは [抜|ぬ]けません。`],
    };
    const chars = {};
    ORDER.slice(0, n).forEach((w) => { chars[w] = 'reach'; });
    if (i === 0) {
      PAGES.push({
        id: 'jiji',
        scene: { kabu: { scale: 1 }, chars: { jiji: 'reach' } },
        text: ['おじいさんは かぶを [抜|ぬ]こうと しました。', 'かぶの [葉|は]っぱを ぎゅっと つかんで…'],
        steps: [pull],
      });
      return;
    }
    const caller = ORDER[i - 1];
    PAGES.push({
      id,
      scene: { kabu: { scale: 1 }, chars, waiting: id },
      text: [`${NAME[caller]}は ${NAME[id]}を [呼|よ]んで きました。`],
      steps: [
        {
          kind: 'call', who: id, hint: `👆 ${NAME[id]}を タップして [呼|よ]んで こよう`,
          then: [`「${CALL[id]}」`].concat(chain(n)),
        },
        pull,
      ],
    });
  });

  PAGES.push({
    id: 'soup',
    scene: { kabu: null, pot: true, party: true },
    text: ['みんなで かぶを [家|うち]へ [運|はこ]んで、 [大|おお]きな お[鍋|なべ]で スープを [作|つく]りました。'],
    steps: [{
      kind: 'soup', need: 1, hint: '🍲 お[鍋|なべ]を タップしてね',
      then: ['「いただきます！」', '[甘|あま]くて あったかい かぶの スープ。 みんな にっこり。'],
    }],
  });

  // せりふ を よみあげ よう の もじ に（「」を とる）
  // [漢字|かんじ] は よみ（かな）に して よむ（よみまちがい を ふせぐ）
  const plain = (s) => s.replace(/\[([^|\]]+)\|([^\]]+)\]/g, '$2').replace(/[「」]/g, '').replace(/…/g, '、');
  // [漢字|かんじ] → <ruby>漢字<rt>かんじ</rt></ruby>
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ruby = (s) => esc(s).replace(/\[([^|\]]+)\|([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');

  return { ORDER, NAME, SLOT, WAIT, CALL, HEAD, PAGES, plain, ruby };
})();
