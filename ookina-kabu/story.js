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
 * 「」の なか は せりふ。
 */
const Story = (() => {
  const ORDER = ['jiji', 'baba', 'mago', 'inu', 'neko', 'nezumi'];
  const NAME = { jiji: 'おじいさん', baba: 'おばあさん', mago: 'まご', inu: 'いぬ', neko: 'ねこ', nezumi: 'ねずみ' };
  // れつ の いち（あしもと の x）。よばれる まえ は WAIT で まつ
  const SLOT = { jiji: 295, baba: 375, mago: 445, inu: 515, neko: 590, nezumi: 635 };
  const WAIT = { baba: 730, mago: 735, inu: 735, neko: 740, nezumi: 745 };
  const CALL = { baba: 'はいはい', mago: 'はーい！', inu: 'わん わん！', neko: 'にゃーお', nezumi: 'ちゅう！' };
  // ひっぱった ときの ふきだし の たかさ（あたま の うえ）
  const HEAD = { jiji: 195, baba: 182, mago: 140, inu: 90, neko: 78, nezumi: 40 };

  // 「ねずみが ねこを ひっぱって、… おじいさんが かぶを ひっぱって」
  function chain(n) {
    const parts = [];
    for (let i = n - 1; i >= 1; i -= 1) parts.push(`${NAME[ORDER[i]]}が ${NAME[ORDER[i - 1]]}を ひっぱって、`);
    parts.push('おじいさんが かぶを ひっぱって…');
    return parts;
  }

  const FAIL = ['ところが', 'それでも', 'まだまだ', 'やっぱり', 'まだ まだ'];

  const PAGES = [
    {
      id: 'tane',
      scene: { kabu: { scale: 0 }, mound: true, jouro: true, chars: { jiji: 'stand' } },
      text: [
        'むかし むかし、 おじいさんが かぶの たねを まきました。',
        '「あまい あまい かぶに なあれ。 おおきな おおきな かぶに なあれ。」',
      ],
      steps: [{ kind: 'water', need: 3, hint: '💧 つちを 3かい トントン して みずを あげよう', then: ['ぴょこん！ ちいさな めが でました。'] }],
    },
    {
      id: 'sodatsu',
      scene: { kabu: { scale: 0.16 }, chars: { jiji: 'stand' } },
      text: ['かぶは おひさまを あびて、 ぐんぐん ぐんぐん そだちました。'],
      steps: [{
        kind: 'grow', need: 4, hint: '🌱 かぶを なんかいも タップ！ うえに なぞっても いいよ',
        then: ['あまくて げんきな、 とてつもなく おおきな かぶに なりました。'],
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
        ? '👉 みぎへ ひっぱろう！ ゆびを 2ほん、3ぼん…みんなで ひっぱると つよいよ'
        : '👉 ゆびで みぎへ ぐいっと ひっぱろう',
      then: last
        ? ['「うんとこしょ、 どっこいしょ！」', 'すっぽーん！', 'とうとう かぶは ぬけました！']
        : ['「うんとこしょ、 どっこいしょ。」', `${FAIL[i]} かぶは ぬけません。`],
    };
    const chars = {};
    ORDER.slice(0, n).forEach((w) => { chars[w] = 'reach'; });
    if (i === 0) {
      PAGES.push({
        id: 'jiji',
        scene: { kabu: { scale: 1 }, chars: { jiji: 'reach' } },
        text: ['おじいさんは かぶを ぬこうと しました。', 'かぶの はっぱを ぎゅっと つかんで…'],
        steps: [pull],
      });
      return;
    }
    const caller = ORDER[i - 1];
    PAGES.push({
      id,
      scene: { kabu: { scale: 1 }, chars, waiting: id },
      text: [`${NAME[caller]}は ${NAME[id]}を よんで きました。`],
      steps: [
        {
          kind: 'call', who: id, hint: `👆 ${NAME[id]}を タップして よんで こよう`,
          then: [`「${CALL[id]}」`].concat(chain(n)),
        },
        pull,
      ],
    });
  });

  PAGES.push({
    id: 'soup',
    scene: { kabu: null, pot: true, party: true },
    text: ['みんなで かぶを うちへ はこんで、 おおきな おなべで スープを つくりました。'],
    steps: [{
      kind: 'soup', need: 1, hint: '🍲 おなべを タップしてね',
      then: ['「いただきます！」', 'あまくて あったかい かぶの スープ。 みんな にっこり。'],
    }],
  });

  // せりふ を よみあげ よう の もじ に（「」を とる）
  const plain = (s) => s.replace(/[「」]/g, '').replace(/…/g, '、');

  return { ORDER, NAME, SLOT, WAIT, CALL, HEAD, PAGES, plain };
})();
