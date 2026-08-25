'use strict';

/*
 * 算数の もんだいを つくる ところ
 *
 * レベルは 3つ:
 *   kantan … 1けた + 1けた の たしざん(こたえは 10〜18まで)
 *   futsuu … 20までの たしざん と ひきざん
 *   tsuyoi … かけざん(九九) と 2けたの たしざん・ひきざん
 *
 * ステージが すすむほど すこしずつ むずかしく なる(stage は 0 から)。
 * こたえの えらびかたは いつも 4たく。
 */

const LEVELS = [
  {
    id: 'kantan',
    name: 'かんたん',
    sub: 'たしざん',
    detail: '1けた + 1けた',
    emoji: '🍎',
    color: '#2f9e44',
    time: 14,
  },
  {
    id: 'futsuu',
    name: 'ふつう',
    sub: 'たしざん・ひきざん',
    detail: '20までの けいさん',
    emoji: '➕',
    color: '#1a6fb5',
    time: 12,
  },
  {
    id: 'tsuyoi',
    name: 'つよい',
    sub: 'かけざん(九九)',
    detail: '九九と 2けたの けいさん',
    emoji: '✖️',
    color: '#d6336c',
    time: 12,
  },
];

const LEVEL_BY_ID = {};
LEVELS.forEach((l) => { LEVEL_BY_ID[l.id] = l; });

const Quiz = (function createQuiz() {
  function rnd(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* ------------------------- レベルごとの もんだい ------------------------- */

  function makeKantan(stage) {
    /* さきの ステージほど こたえが 大きく なる */
    const cap = stage <= 1 ? 10 : stage <= 3 ? 13 : 18;
    let a;
    let b;
    do {
      a = rnd(1, 9);
      b = rnd(1, 9);
    } while (a + b > cap);
    return { a, b, op: '+', answer: a + b };
  }

  function makeFutsuu(stage) {
    const useSub = Math.random() < (stage <= 1 ? 0.35 : 0.5);
    if (useSub) {
      const answer = rnd(1, stage <= 2 ? 9 : 12);
      const b = rnd(1, stage <= 2 ? 9 : 11);
      return { a: answer + b, b, op: '-', answer };
    }
    const cap = stage <= 2 ? 15 : 20;
    let a;
    let b;
    do {
      a = rnd(2, 14);
      b = rnd(2, 9);
    } while (a + b > cap);
    return { a, b, op: '+', answer: a + b };
  }

  function makeTsuyoi(stage) {
    const r = Math.random();
    /* さきの ステージほど かけざんが ふえる */
    const mulChance = stage <= 1 ? 0.5 : 0.7;
    if (r < mulChance) {
      const top = stage <= 1 ? 5 : stage <= 3 ? 7 : 9;
      const a = rnd(2, top);
      const b = rnd(2, 9);
      return { a, b, op: '×', answer: a * b };
    }
    if (r < mulChance + (1 - mulChance) / 2) {
      const a = rnd(11, stage <= 2 ? 49 : 89);
      const b = rnd(2, 9);
      return { a, b, op: '+', answer: a + b };
    }
    const answer = rnd(5, stage <= 2 ? 40 : 80);
    const b = rnd(2, 9);
    return { a: answer + b, b, op: '-', answer };
  }

  /* ---------------------------- まちがいの えらびかた ---------------------------- */

  /*
   * 「ありそうな まちがい」を えらぶ。
   *  たしざん・ひきざん … ±1, ±2, くりあがりを わすれた かず
   *  かけざん           … 1れつ ずれた かず(a×(b±1))
   */
  function decoys(q) {
    const out = [];
    const push = (v) => {
      if (v >= 0 && v !== q.answer && out.indexOf(v) < 0) out.push(v);
    };
    if (q.op === '×') {
      push(q.a * (q.b + 1));
      push(q.a * (q.b - 1));
      push((q.a + 1) * q.b);
      push(q.a * q.b + q.a - 1);
      push(q.a + q.b);
    } else {
      push(q.answer + 1);
      push(q.answer - 1);
      push(q.answer + 2);
      push(q.answer - 2);
      push(q.answer + 10);
      push(q.answer - 10);
      push(q.op === '+' ? Math.abs(q.a - q.b) : q.a + q.b);
    }
    /* たりなければ てきとうに ちかい かずを たす */
    let guard = 0;
    while (out.length < 6 && guard < 40) {
      push(q.answer + rnd(-4, 5));
      guard += 1;
    }
    return out;
  }

  function buildChoices(q) {
    const pool = decoys(q);
    const chosen = [q.answer];
    while (chosen.length < 4 && pool.length > 0) {
      const i = Math.floor(Math.random() * pool.length);
      chosen.push(pool.splice(i, 1)[0]);
    }
    /* シャッフル */
    for (let i = chosen.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = chosen[i];
      chosen[i] = chosen[j];
      chosen[j] = t;
    }
    return chosen;
  }

  /* ---------------------------- よみあげ用の ことば ---------------------------- */

  const OP_WORD = { '+': 'たす', '-': 'ひく', '×': 'かける' };

  /*
   * level: 'kantan' | 'futsuu' | 'tsuyoi'
   * stage: 0 から はじまる ステージばんごう
   */
  function make(level, stage) {
    const s = stage || 0;
    let q;
    if (level === 'tsuyoi') q = makeTsuyoi(s);
    else if (level === 'futsuu') q = makeFutsuu(s);
    else q = makeKantan(s);

    q.text = q.a + ' ' + q.op + ' ' + q.b;
    q.speech = q.a + ' ' + OP_WORD[q.op] + ' ' + q.b + ' は?';
    q.choices = buildChoices(q);
    /* かんたんな たしざんは ●で かぞえられるように ヒントを つける */
    q.countable = q.op === '+' && q.a <= 10 && q.b <= 10;
    return q;
  }

  return { make, pick, rnd };
})();
