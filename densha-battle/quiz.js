'use strict';

/*
 * もんだいを つくる ところ
 *
 * ジャンルは 3つ。それぞれに 3だんかいの レベルが ある。
 *   sansu … さんすう(たしざん・ひきざん・かけざん)
 *   kanji … えきめいの よみ(../densha-talk の 529駅から)
 *   chizu … にほんちず(47都道府県)
 *
 * make(genre, level, wave) が かえす もの:
 *   qHtml    … もんだいの ひょうじ(HTML)
 *   speech   … よみあげる ことば
 *   answer   … せいかい(もじれつ)
 *   choices  … 4つの せんたくし(もじれつの はいれつ)
 *   hintHtml … ヒント(なければ '')
 *   wide     … true なら ボタンを 2れつに する(こたえが ながい とき)
 */

const GENRES = [
  {
    id: 'sansu',
    name: 'さんすう',
    sub: 'たしざん・ひきざん・かけざん',
    emoji: '🔢',
    color: '#1a6fb5',
    levels: [
      { id: 'kantan', name: 'かんたん', sub: 'たしざん', detail: '1けた + 1けた', crit: 2.8 },
      { id: 'futsuu', name: 'ふつう', sub: 'たしざん・ひきざん', detail: '20までの けいさん', crit: 2.4 },
      { id: 'tsuyoi', name: 'つよい', sub: 'かけざん(九九)', detail: '九九と 2けたの けいさん', crit: 2.6 },
    ],
  },
  {
    id: 'kanji',
    name: 'かんじ',
    sub: 'えきめいの よみ',
    emoji: '🈳',
    color: '#d6336c',
    levels: [
      { id: 'kantan', name: 'かんたん', sub: 'ゆうめいな えき', detail: 'のりかえの おおい 131えき', crit: 3.4 },
      { id: 'futsuu', name: 'ふつう', sub: 'いろいろな えき', detail: '333えきから', crit: 3.2 },
      { id: 'tsuyoi', name: 'つよい', sub: 'よみにくい えき', detail: '難読えき 196えき', crit: 3.4 },
    ],
  },
  {
    id: 'chizu',
    name: 'にほんちず',
    sub: 'とどうふけん',
    emoji: '🗾',
    color: '#2f9e44',
    levels: [
      { id: 'kantan', name: 'かんたん', sub: 'けんの なまえ', detail: 'よみかたと ちほう', crit: 3.4 },
      { id: 'futsuu', name: 'ふつう', sub: 'けんちょうしょざいち', detail: 'よみ・ちほう・けんちょう', crit: 3.4 },
      { id: 'tsuyoi', name: 'つよい', sub: 'となりの けん・めいぶつ', detail: 'ちずの ちしき ぜんぶ', crit: 3.6 },
    ],
  },
];

const GENRE_BY_ID = {};
GENRES.forEach((g) => { GENRE_BY_ID[g.id] = g; });

const Quiz = (function createQuiz() {
  function rnd(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  /* せいかい + まちがい から 4たくを つくる(かぶりは とりのぞく) */
  function choose4(answer, pool) {
    const out = [answer];
    const bag = shuffle(pool.slice());
    for (let i = 0; i < bag.length && out.length < 4; i += 1) {
      if (out.indexOf(bag[i]) < 0) out.push(bag[i]);
    }
    return shuffle(out);
  }

  /* ============================ さんすう ============================ */

  function makeKantan(wave) {
    const cap = wave <= 2 ? 10 : wave <= 5 ? 13 : 18;
    let a;
    let b;
    do {
      a = rnd(1, 9);
      b = rnd(1, 9);
    } while (a + b > cap);
    return { a, b, op: '+', answer: a + b };
  }

  function makeFutsuu(wave) {
    const useSub = Math.random() < (wave <= 2 ? 0.35 : 0.5);
    if (useSub) {
      const answer = rnd(1, wave <= 4 ? 9 : 12);
      const b = rnd(1, wave <= 4 ? 9 : 11);
      return { a: answer + b, b, op: '-', answer };
    }
    const cap = wave <= 4 ? 15 : 20;
    let a;
    let b;
    do {
      a = rnd(2, 14);
      b = rnd(2, 9);
    } while (a + b > cap);
    return { a, b, op: '+', answer: a + b };
  }

  function makeTsuyoi(wave) {
    const r = Math.random();
    const mulChance = wave <= 2 ? 0.5 : 0.7;
    if (r < mulChance) {
      const top = wave <= 2 ? 5 : wave <= 5 ? 7 : 9;
      return { a: rnd(2, top), b: rnd(2, 9), op: '×', answer: 0 };
    }
    if (r < mulChance + (1 - mulChance) / 2) {
      const a = rnd(11, wave <= 4 ? 49 : 89);
      const b = rnd(2, 9);
      return { a, b, op: '+', answer: a + b };
    }
    const answer = rnd(5, wave <= 4 ? 40 : 80);
    const b = rnd(2, 9);
    return { a: answer + b, b, op: '-', answer };
  }

  /* 「ありそうな まちがい」を つくる */
  function numDecoys(q) {
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
    let guard = 0;
    while (out.length < 6 && guard < 40) {
      push(q.answer + rnd(-4, 5));
      guard += 1;
    }
    return out;
  }

  const OP_WORD = { '+': 'たす', '-': 'ひく', '×': 'かける' };

  function makeSansu(level, wave) {
    let q;
    if (level === 'tsuyoi') q = makeTsuyoi(wave);
    else if (level === 'futsuu') q = makeFutsuu(wave);
    else q = makeKantan(wave);
    if (q.op === '×') q.answer = q.a * q.b;

    const choices = choose4(String(q.answer), numDecoys(q).map(String));
    const countable = level === 'kantan' && q.op === '+' && q.a <= 10 && q.b <= 10;

    return {
      genre: 'sansu',
      qHtml:
        '<span>' + q.a + '</span><span class="q-op">' + q.op + '</span><span>' + q.b + '</span>' +
        '<span class="q-eq">=</span><span class="q-ask">?</span>',
      speech: q.a + ' ' + OP_WORD[q.op] + ' ' + q.b + ' は?',
      answer: String(q.answer),
      choices,
      hintHtml: countable
        ? '<span class="hint-group">' + '🚃'.repeat(q.a) + '</span>' +
          '<span class="hint-plus">+</span>' +
          '<span class="hint-group">' + '🚋'.repeat(q.b) + '</span>'
        : '',
      wide: false,
    };
  }

  /* ============================ えきめいの かんじ ============================ */

  /* レベルごとに つかう 駅の プール */
  function ekiPool(level) {
    if (level === 'kantan') return EKI_BY_TIER[1];
    if (level === 'futsuu') return EKI_BY_TIER[1].concat(EKI_BY_TIER[2]);
    /* つよい: 難読が メイン。たりない ぶんは ふつうの駅も まぜる */
    return EKI_BY_TIER[3].concat(EKI_BY_TIER[2]);
  }

  function makeKanji(level) {
    const pool = ekiPool(level);
    const target = pick(pool);
    /* にた ながさの よみを まちがいに つかうと むずかしくなる */
    const near = pool.filter((e) => e !== target && Math.abs(e.y.length - target.y.length) <= 1);
    const others = (near.length >= 6 ? near : pool).filter((e) => e !== target);

    if (Math.random() < 0.75) {
      /* 漢字 → よみ */
      const choices = choose4(target.y, others.map((e) => e.y));
      return {
        genre: 'kanji',
        qHtml: '<span class="q-word">' + target.k + '</span><span class="q-ask2">なんて よむ?</span>',
        speech: 'この えきの なまえ、なんて よむ?',
        answer: target.y,
        choices,
        hintHtml: '<span class="hint-note">🚉 えきめいの よみかた</span>',
        wide: true,
      };
    }
    /* よみ → 漢字 */
    const choices = choose4(target.k, others.map((e) => e.k));
    return {
      genre: 'kanji',
      qHtml: '<span class="q-word">' + target.y + '</span><span class="q-ask2">かんじは どれ?</span>',
      speech: target.y + '。かんじは どれ?',
      answer: target.k,
      choices,
      hintHtml: '<span class="hint-note">🚉 えきめいの かんじ</span>',
      wide: true,
    };
  }

  /* ============================ にほんちず ============================ */

  const REGION_KEYS = Object.keys(REGION_NAMES);

  function prefQuestion(type) {
    const p = pick(PREFS_Q);
    const others = PREFS_Q.filter((x) => x !== p);

    if (type === 'kana') {
      return {
        qHtml: '<span class="q-word">' + p.name + '</span><span class="q-ask2">なんて よむ?</span>',
        speech: 'この けんの なまえ、なんて よむ?',
        answer: p.kana,
        choices: choose4(p.kana, others.map((x) => x.kana)),
        hint: '🗾 とどうふけんの よみかた',
      };
    }
    if (type === 'region') {
      const rn = REGION_NAMES[p.region].name;
      const pool = REGION_KEYS.filter((k) => k !== p.region).map((k) => REGION_NAMES[k].name);
      return {
        qHtml: '<span class="q-word">' + p.name + '</span><span class="q-ask2">は なに ちほう?</span>',
        speech: p.kana + 'は なに ちほう?',
        answer: rn,
        choices: choose4(rn, pool),
        hint: '🗾 8つの ちほう',
      };
    }
    if (type === 'capital') {
      return {
        qHtml: '<span class="q-word">' + p.name + '</span><span class="q-ask2">の けんちょうしょざいちは?</span>',
        speech: p.kana + 'の けんちょうしょざいちは?',
        answer: p.capital,
        choices: choose4(p.capital, others.map((x) => x.capital)),
        hint: '🏛️ けんちょうの ある まち',
      };
    }
    if (type === 'capitalRev') {
      return {
        qHtml: '<span class="q-word">' + p.capital + '</span><span class="q-ask2">は どこの けんちょう?</span>',
        speech: p.capitalKana + 'は どこの けんの けんちょうしょざいち?',
        answer: p.name,
        choices: choose4(p.name, others.map((x) => x.name)),
        hint: '🏛️ けんちょうの ある まち',
      };
    }
    if (type === 'adj') {
      /* となりの けん。となりでない けんを まちがいに つかう */
      const withAdj = PREFS_Q.filter((x) => x.adj && x.adj.length > 0);
      const q = pick(withAdj);
      const ans = PREF_BY_ID[pick(q.adj)];
      const notAdj = PREFS_Q.filter((x) => x !== q && x !== ans && q.adj.indexOf(x.id) < 0);
      return {
        qHtml: '<span class="q-word">' + q.name + '</span><span class="q-ask2">の となりは どれ?</span>',
        speech: q.kana + 'の となりの けんは どれ?',
        answer: ans.name,
        choices: choose4(ans.name, notAdj.map((x) => x.name)),
        hint: '🗾 となりあう とどうふけん',
      };
    }
    /* meibutsu: その県の 名物クイズ(3たく + よその答えを 1つ たす) */
    const extraPool = others.map((x) => x.a[x.c]).filter((v) => p.a.indexOf(v) < 0);
    const ans = p.a[p.c];
    const decoys = p.a.filter((_, i) => i !== p.c).concat([pick(extraPool)]);
    return {
      qHtml: '<span class="q-sentence">' + p.q + '</span>',
      speech: p.q,
      answer: ans,
      choices: choose4(ans, decoys),
      hint: '🍚 ' + p.name + 'の めいぶつ',
    };
  }

  function makeChizu(level) {
    let types;
    if (level === 'kantan') types = ['kana', 'kana', 'region'];
    else if (level === 'futsuu') types = ['kana', 'region', 'capital', 'capital', 'meibutsu'];
    else types = ['capital', 'capitalRev', 'adj', 'adj', 'meibutsu', 'meibutsu'];

    const q = prefQuestion(pick(types));
    return {
      genre: 'chizu',
      qHtml: q.qHtml,
      speech: q.speech,
      answer: q.answer,
      choices: q.choices,
      hintHtml: '<span class="hint-note">' + q.hint + '</span>',
      wide: true,
    };
  }

  /* ============================ 入口 ============================ */

  function make(genre, level, wave) {
    const w = wave || 0;
    if (genre === 'kanji') return makeKanji(level);
    if (genre === 'chizu') return makeChizu(level);
    return makeSansu(level, w);
  }

  return { make, pick, rnd, shuffle };
})();
