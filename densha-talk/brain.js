'use strict';

/*
 * でんしゃの あたま(会話エンジン)
 *
 * 子どもの ことば(音声にんしき or キーボード or ボタン)を うけとって、
 * キャラクターの へんじ を つくる。ぜんぶ この中で かんけつしていて、
 * インターネットには つながらない。
 *
 *   Brain.respond('しぶやって どんなえき?')
 *     → { say: ['...'], chips: [...], face: 'happy', focusStation, focusLine }
 *
 * ながれ:
 *   1. あそびの とちゅう(クイズ・しりとり)なら、まず そっちの へんじ
 *   2. ことばの中から 駅名・路線名 を さがす
 *   3. きまり(ルール)に じゅんばんに あてはめて へんじ を えらぶ
 *   4. どれにも あてはまらなければ、あいづち を うって 話題を ふりかえす
 */

const Brain = (function () {
  /* ------------------------------------------------------------------
   * じょうたい
   * ------------------------------------------------------------------ */

  const state = {
    char: CHARACTERS[0],
    childName: '',
    mode: 'chat', // 'chat' | 'quiz' | 'shiritori'
    quiz: null,
    shiritori: null,
    lastStation: null,
    lastLine: null,
    turns: 0,
    recent: {}, // おなじ せりふを つづけて 言わないため
  };

  /* ------------------------------------------------------------------
   * ちいさな どうぐ
   * ------------------------------------------------------------------ */

  function pick(list, bucket) {
    if (!list || list.length === 0) return '';
    if (list.length === 1) return list[0];
    const key = bucket || 'default';
    let value;
    let guard = 0;
    do {
      value = list[Math.floor(Math.random() * list.length)];
      guard += 1;
    } while (value === state.recent[key] && guard < 8);
    state.recent[key] = value;
    return value;
  }

  function has(text, words) {
    return words.some((w) => text.indexOf(w) >= 0);
  }

  /* 「〇〇くん、」のような よびかけ。いつもだと しつこいので ときどき */
  function callName(force) {
    if (!state.childName) return '';
    if (!force && Math.random() > 0.35) return '';
    return state.childName + 'くん、';
  }

  function myLine() {
    return LINE_BY_ID[state.char.lineId];
  }

  function reply(say, extra) {
    const out = Object.assign(
      {
        say: Array.isArray(say) ? say.filter(Boolean) : [say],
        chips: null,
        face: 'happy',
        focusStation: state.lastStation,
        focusLine: state.lastLine ? state.lastLine.id : state.char.lineId,
      },
      extra || {}
    );
    if (!out.chips) out.chips = suggestChips();
    return out;
  }

  /* 「AとBとC」のように ならべる。ながいときは 4つまで */
  function joinNames(names, max) {
    const limit = max || 4;
    const head = names.slice(0, limit).join('と ');
    return names.length > limit ? head + ' など' : head;
  }

  /* ------------------------------------------------------------------
   * 駅・路線の せつめい を つくる
   * ------------------------------------------------------------------ */

  function stationSentence(name) {
    const lines = linesOf(name);
    const yomi = stationYomi(name);
    const motif = stationMotif(name);
    const parts = [];

    parts.push(motif + ' 「' + name + '」は 「' + yomi + '」って よむ えきだよ');

    if (STATION_TALK[name]) {
      parts.push(STATION_TALK[name]);
    }

    if (lines.length >= 2) {
      const names = lines.map((l) => l.name);
      parts.push('ここは のりかえの えき! ' + joinNames(names) + ' が とまるんだ');
    } else if (lines.length === 1) {
      parts.push(lines[0].name + 'の えきだよ');
    }

    const mine = lines.find((l) => l.id === state.char.lineId);
    if (mine) {
      const n = neighborsOn(name, mine);
      const around = [n.prev, n.next].filter(Boolean);
      if (around.length > 0) {
        parts.push(
          state.char.me + 'の ' + mine.name + 'だと、となりは ' + around.join('と ') + ' だよ'
        );
      }
    }

    return parts;
  }

  function lineSentence(line) {
    const st = line.stations;
    const color = LINE_COLOR_NAME[line.id];
    const out = [];
    out.push(
      '🚃 ' +
        line.name +
        'は ' +
        line.company +
        'の ' +
        color +
        'の でんしゃ。' +
        st[0].name +
        'から ' +
        st[st.length - 1].name +
        'まで、ぜんぶで ' +
        st.length +
        'えき あるよ'
    );
    if (line.note) out.push(line.note + '、って いわれてるんだ');
    return out;
  }

  function routeSentence(route) {
    const out = [];
    const legs = route.legs
      .map((leg) => leg.line.name + 'で ' + leg.hops + 'えき')
      .join('、そのあと ');
    if (route.transfers === 0) {
      out.push(
        '🚉 ' +
          route.from +
          'から ' +
          route.to +
          'までは、' +
          route.legs[0].line.name +
          'に のって ' +
          route.hops +
          'えき! のりかえ なしで いけるよ'
      );
    } else {
      const changeAt = route.legs.slice(1).map((leg) => leg.stations[0]);
      out.push(
        '🚉 ' +
          route.from +
          'から ' +
          route.to +
          'までは、' +
          legs +
          '。ぜんぶで ' +
          route.hops +
          'えき だね'
      );
      out.push('のりかえは ' + changeAt.join('と ') + ' で ' + route.transfers + 'かい だよ');
    }
    return out;
  }

  /* ------------------------------------------------------------------
   * クイズ
   * ------------------------------------------------------------------ */

  const COLOR_WORDS = {
    あか: ['あか', 'レッド', 'れっど'],
    ピンク: ['ぴんく', 'ピンク', 'もも'],
    オレンジ: ['おれんじ', 'オレンジ', 'だいだい'],
    きいろ: ['きいろ', 'イエロー', 'いえろー', 'きんいろ', 'ごーるど'],
    ぎんいろ: ['ぎん', 'しろ', 'はいいろ', 'しるばー', 'ぐれー'],
    きみどり: ['きみどり', 'みどり', 'ぐりーん', 'グリーン'],
    みどり: ['みどり', 'きみどり', 'ぐりーん', 'グリーン'],
    みずいろ: ['みずいろ', 'あお', 'そらいろ', 'ぶるー'],
    あお: ['あお', 'みずいろ', 'ぶるー', 'ブルー'],
    むらさき: ['むらさき', 'ぱーぷる'],
    ちゃいろ: ['ちゃいろ', 'ブラウン'],
    しろ: ['しろ', 'ホワイト'],
    くろ: ['くろ', 'ブラック'],
    はいいろ: ['はいいろ', 'ぎん', 'グレー', 'ぐれー', 'しるばー'],
  };

  function randomOf(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function makeQuiz() {
    const kinds = ['neighbor', 'color', 'whichline', 'terminal', 'count'];
    const kind = randomOf(kinds);
    const line = Math.random() < 0.6 ? myLine() : randomOf(LINES);

    if (kind === 'neighbor') {
      const idx = 1 + Math.floor(Math.random() * (line.stations.length - 2));
      const st = line.stations[idx];
      const n = neighborsOn(st.name, line);
      return {
        kind,
        question:
          '🚃 クイズだよ! ' + line.name + 'で、' + st.name + 'の となりの えきは どこでしょう?',
        answers: [n.prev, n.next].filter(Boolean),
        hint: 'ヒント! 「' + stationYomi(n.next || n.prev).charAt(0) + '」から はじまる えきだよ',
        say: (a) => 'せいかい! ' + st.name + 'の となりは ' + a + ' だよ',
        focusLine: line.id,
        focusStation: st.name,
      };
    }

    if (kind === 'color') {
      const color = LINE_COLOR_NAME[line.id];
      return {
        kind,
        question: '🎨 クイズ! ' + line.name + 'は なにいろの でんしゃでしょう?',
        answers: [color],
        accept: COLOR_WORDS[color] || [color],
        hint: 'ヒント! 「' + color.charAt(0) + '」から はじまる いろ だよ',
        say: () => 'せいかい! ' + line.name + 'は ' + color + ' なんだ',
        focusLine: line.id,
      };
    }

    if (kind === 'whichline') {
      let st = null;
      for (let i = 0; i < 30; i += 1) {
        const cand = randomOf(line.stations);
        if (linesOf(cand.name).length === 1) {
          st = cand;
          break;
        }
      }
      if (!st) st = randomOf(line.stations);
      const answerLines = linesOf(st.name);
      return {
        kind,
        question: '🤔 クイズ! ' + st.name + 'は なにせんの えきでしょう?',
        answers: answerLines.map((l) => l.name),
        acceptLines: answerLines.map((l) => l.id),
        hint: 'ヒント! いろは ' + LINE_COLOR_NAME[answerLines[0].id] + ' の でんしゃだよ',
        say: (a) => 'せいかい! ' + st.name + 'は ' + a + ' の えきだよ',
        focusLine: line.id,
        focusStation: st.name,
      };
    }

    if (kind === 'terminal') {
      const first = line.stations[0].name;
      const last = line.stations[line.stations.length - 1].name;
      return {
        kind,
        question: '🏁 クイズ! ' + line.name + 'の はしっこの えきは どこでしょう?',
        answers: [first, last],
        hint: 'ヒント! ひとつは 「' + stationYomi(last).charAt(0) + '」から はじまるよ',
        say: (a) => 'せいかい! ' + line.name + 'は ' + first + 'から ' + last + 'までだよ',
        focusLine: line.id,
      };
    }

    /* count: 駅の かず。すうじで こたえる */
    const num = line.stations.length;
    return {
      kind: 'count',
      question: '🔢 クイズ! ' + line.name + 'には、えきが いくつ あるでしょう?',
      answers: [String(num)],
      number: num,
      hint: 'ヒント! ' + (num - 3) + 'こ から ' + (num + 3) + 'こ の あいだ だよ',
      say: () => 'せいかい! ' + line.name + 'は ' + num + 'えき あるんだ',
      focusLine: line.id,
    };
  }

  function numbersIn(text) {
    const out = [];
    const m = String(text).match(/\d+/g);
    if (m) m.forEach((v) => out.push(parseInt(v, 10)));
    return out;
  }

  function judgeQuiz(raw, norm) {
    const q = state.quiz;

    /* とちゅうで べつの あそびに いきたく なったとき */
    if (has(norm, ['しりとり'])) {
      state.quiz = null;
      return startShiritori();
    }

    if (has(norm, ['わからない', 'わかんない', 'ヒント', 'ひんと', 'おしえて'])) {
      if (!q.hinted) {
        q.hinted = true;
        return reply([q.hint, 'もういちど かんがえて みよう!'], { face: 'think' });
      }
      state.mode = 'chat';
      const ans = q.answers[0];
      state.quiz = null;
      return reply(['こたえは ' + ans + ' でした! つぎは わかるかな?'], {
        face: 'wow',
        chips: [chip('もういっかい クイズ', 'クイズ だして'), chip('おはなし する', 'おしゃべり しよう')],
      });
    }
    if (has(norm, ['やめ', 'ちがうことし', 'もういい'])) {
      state.mode = 'chat';
      state.quiz = null;
      return reply(['オッケー! クイズは おしまい。なにを はなそうか?'], { face: 'happy' });
    }

    let correct = false;
    if (q.kind === 'count') {
      const nums = numbersIn(raw);
      correct = nums.indexOf(q.number) >= 0;
      if (!correct && nums.length > 0 && Math.abs(nums[0] - q.number) <= 2) {
        state.mode = 'chat';
        state.quiz = null;
        return reply(['おしい〜! ほんとうは ' + q.number + 'えき なんだ。すごく ちかいよ!'], {
          face: 'wow',
        });
      }
    } else if (q.accept) {
      correct = q.accept.some((w) => norm.indexOf(normalize(w)) >= 0);
    } else if (q.acceptLines) {
      const line = findLine(raw);
      correct = !!line && q.acceptLines.indexOf(line.id) >= 0;
    } else {
      const found = findStations(raw);
      correct = q.answers.some((a) => found.indexOf(a) >= 0 || raw.indexOf(a) >= 0);
    }

    if (correct) {
      const answered = q.answers.find(
        (a) => raw.indexOf(a) >= 0 || findStations(raw).indexOf(a) >= 0
      );
      state.mode = 'chat';
      const done = q.say(answered || q.answers[0]);
      state.quiz = null;
      return reply([pick(['ピンポーン! 🎉', 'あたり! 🎉', 'すごい! 🎉'], 'ok'), done], {
        face: 'wow',
        chips: [
          chip('もう1もん! 🚃', 'クイズ だして'),
          chip('しりとり しよ', 'えきめい しりとり'),
          chip('おはなし する', 'おしゃべり しよう'),
        ],
      });
    }

    if (!q.hinted) {
      q.hinted = true;
      return reply([pick(['ざんねーん!', 'おしい!', 'ちがうよ〜'], 'ng'), q.hint], {
        face: 'think',
      });
    }
    state.mode = 'chat';
    const ans = q.answers[0];
    state.quiz = null;
    return reply(['こたえは ' + ans + ' でした! よく がんばったね'], {
      face: 'happy',
      chips: [chip('もういっかい クイズ', 'クイズ だして'), chip('おはなし する', 'おしゃべり しよう')],
    });
  }

  function startQuiz() {
    const q = makeQuiz();
    state.quiz = q;
    state.mode = 'quiz';
    if (q.focusLine) state.lastLine = LINE_BY_ID[q.focusLine];
    if (q.focusStation) state.lastStation = q.focusStation;
    return reply([q.question], {
      face: 'think',
      chips: [chip('わからない 💡', 'ヒント'), chip('クイズ やめる', 'やめる')],
    });
  }

  /* ------------------------------------------------------------------
   * えきめい しりとり
   * ------------------------------------------------------------------ */

  const SMALL_KANA = {
    ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', っ: 'つ', ぁ: 'あ', ぃ: 'い',
    ぅ: 'う', ぇ: 'え', ぉ: 'お', ゎ: 'わ',
  };

  function lastKana(yomi) {
    let y = normalize(yomi).replace(/[ー・]/g, '');
    if (!y) return '';
    let c = y.charAt(y.length - 1);
    if (SMALL_KANA[c]) c = SMALL_KANA[c];
    return c;
  }

  function firstKana(yomi) {
    let c = normalize(yomi).charAt(0);
    if (SMALL_KANA[c]) c = SMALL_KANA[c];
    return c;
  }

  function startShiritori() {
    state.mode = 'shiritori';
    const start = randomOf(myLine().stations);
    state.shiritori = { used: [start.name], need: lastKana(start.yomi) };
    return reply(
      [
        'えきめい しりとり しよう! 「ん」が ついたら おしまい だよ',
        'じゃあ ' + state.char.me + 'から。「' + start.name + '」(' + start.yomi + ')!',
        '「' + state.shiritori.need + '」から はじまる えき、いえるかな?',
      ],
      {
        face: 'wow',
        focusStation: start.name,
        chips: [chip('ヒント ちょうだい', 'ヒント'), chip('しりとり やめる', 'やめる')],
      }
    );
  }

  function shiritoriCandidates(kana, used) {
    return ALL_STATIONS.filter(
      (st) => firstKana(st.yomi) === kana && used.indexOf(st.name) < 0 && lastKana(st.yomi) !== 'ん'
    );
  }

  function judgeShiritori(raw, norm) {
    const sh = state.shiritori;

    if (has(norm, ['くいず', 'もんだい'])) {
      state.shiritori = null;
      return startQuiz();
    }
    if (has(norm, ['やめ', 'もういい', 'おしまい'])) {
      state.mode = 'chat';
      state.shiritori = null;
      return reply(['しりとり たのしかった! またやろうね'], { face: 'happy' });
    }
    if (has(norm, ['ヒント', 'ひんと', 'わからない', 'わかんない', 'おしえて'])) {
      const cand = shiritoriCandidates(sh.need, sh.used);
      if (cand.length === 0) {
        state.mode = 'chat';
        state.shiritori = null;
        return reply(['あれれ、「' + sh.need + '」の えきが おもいつかない! ひきわけ だね'], {
          face: 'think',
        });
      }
      const c = randomOf(cand);
      return reply(['ヒント! 「' + c.yomi.charAt(0) + '」で はじまって、' + c.yomi.length + 'もじ の えきだよ'], {
        face: 'think',
      });
    }

    const found = findStations(raw);
    const st = found.length > 0 ? found[0] : null;

    if (!st) {
      return reply(['うーん、それは えきの なまえかな? 「' + sh.need + '」から はじまる えきを おしえて!'], {
        face: 'think',
      });
    }
    if (sh.used.indexOf(st) >= 0) {
      return reply([st + 'は もう でたよ! べつの えきを かんがえてみて'], { face: 'think' });
    }
    const yomi = stationYomi(st);
    if (firstKana(yomi) !== sh.need) {
      return reply([
        st + 'は 「' + firstKana(yomi) + '」から はじまるね。ほしいのは 「' + sh.need + '」だよ!',
      ], { face: 'think' });
    }

    sh.used.push(st);
    if (lastKana(yomi) === 'ん') {
      state.mode = 'chat';
      state.shiritori = null;
      return reply(
        [st + '(' + yomi + ')! ……あっ、「ん」で おわっちゃった!', 'また しりとり やろうね'],
        { face: 'wow', focusStation: st, chips: [chip('もういっかい しりとり', 'しりとり')] }
      );
    }

    const need = lastKana(yomi);
    const cand = shiritoriCandidates(need, sh.used);
    if (cand.length === 0) {
      state.mode = 'chat';
      state.shiritori = null;
      return reply(
        [st + '! じょうずだね', '「' + need + '」の えき…… おもいつかない! きみの かちだ! 🏆'],
        { face: 'wow', focusStation: st }
      );
    }
    const mine = randomOf(cand);
    sh.used.push(mine.name);
    sh.need = lastKana(mine.yomi);
    state.lastStation = mine.name;
    return reply(
      [
        'いいね! ' + st + '(' + yomi + ')',
        state.char.me + 'は 「' + mine.name + '」(' + mine.yomi + ')!',
        'つぎは 「' + sh.need + '」だよ',
      ],
      { face: 'happy', focusStation: mine.name }
    );
  }

  /* ------------------------------------------------------------------
   * でんしゃの ふしぎ(なんで? に こたえる)
   * ------------------------------------------------------------------ */

  const WONDERS = [
    {
      keys: ['うごく', 'はしる', 'すすむ'],
      say: [
        'でんしゃはね、うえの でんせんから でんきを もらって モーターを まわして はしってるんだ',
        'やねの うえの ぱんたぐらふ、みたことある? あれが でんきを うけとる うでなんだよ',
      ],
    },
    {
      keys: ['ぱんたぐらふ', 'でんせん', 'でんき'],
      say: ['やねの うえの ひしがたの うでが ぱんたぐらふ。でんせんに ぴたっと くっついて でんきを もらうんだ'],
    },
    {
      keys: ['せんろ', 'レール', 'れーる'],
      say: [
        'レールは 2ほんで 1くみ。でんしゃの くるまには でっぱりが あって、そこから おちないように なってるんだよ',
      ],
    },
    {
      keys: ['ふみきり'],
      say: ['ふみきりは でんしゃが くる まえに カンカン なって、みんなを まもってくれてるんだ。ぜったい わたっちゃ だめだよ'],
    },
    {
      keys: ['しんごう'],
      say: ['せんろの しんごうは、まえの でんしゃと ぶつからないように いろで おしえてくれるんだ。あかは とまれ だよ'],
    },
    {
      keys: ['うんてんし', 'しゃしょう'],
      say: ['うんてんしさんは、まえを よーく みて てを さして あんぜんを たしかめてるよ。「かくにん よし!」って ね'],
    },
    {
      keys: ['ちかてつ', 'じめんのした', 'トンネル', 'とんねる'],
      say: [
        'ちかてつは じめんの したに ながい トンネルを ほって つくるんだ',
        'いちばん ふるい ちかてつは ぎんざせん。100ねんくらい まえから はしってるんだよ',
      ],
    },
    {
      keys: ['しんかんせん', 'はやい'],
      say: ['しんかんせんは 1じかんに 300キロも はしるんだ。とうきょうから おおさかまで 2じかんちょっと だよ'],
    },
    {
      keys: ['きっぷ', 'ICカード', 'すいか', 'ぱすも'],
      say: ['きっぷや カードを ピッと すると、どこから のったか きかいが おぼえてくれるんだ'],
    },
    {
      keys: ['とまる', 'ブレーキ', 'ぶれーき'],
      say: ['でんしゃは とまるのに とっても ながい きょりが いるの。だから ホームの きいろい せんの うちがわで まつんだよ'],
    },
    {
      keys: ['ねる', 'よる', 'しゅうでん'],
      say: ['よるに なると でんしゃは しゃりょうきちに かえって ねるんだ。あさまで ぴかぴかに そうじ してもらうんだよ'],
    },
  ];

  /* ------------------------------------------------------------------
   * ふだんの はなしの タネ
   * ------------------------------------------------------------------ */

  const TOPICS = [
    {
      keys: ['しんかんせん', 'のぞみ', 'はやぶさ', 'はやて', 'こだま', 'ひかり'],
      say: [
        'しんかんせんは かっこいいよね! はなが とがってるのは、トンネルで ドンって ならないためなんだ',
        'とうきょうえきの ホームで まってると、いろんな しんかんせんが みられるよ',
      ],
    },
    {
      keys: ['ロマンスカー', 'とっきゅう'],
      say: ['とっきゅうは いちばん まえの せきから せんろが みえるんだよ。すわれたら ラッキー!'],
    },
    {
      keys: ['うんてんし', 'しゃしょう', 'なりたい', 'えきいん'],
      say: [
        'うんてんしさん、かっこいいよね!',
        'まいにち たくさんの ひとを あんぜんに はこぶ、すごい おしごとなんだ',
        'きみなら どの ろせんの うんてんしさんに なりたい?',
      ],
    },
    {
      keys: ['のった', 'のってきた', 'のってた', 'のりました'],
      say: ['いいなあ! どんな でんしゃだった? いろは なにいろ?'],
    },
    {
      keys: ['ようちえん', 'ほいくえん', 'がっこう', 'こうえん'],
      say: ['そうなんだ! たのしかった?', 'その かえりに でんしゃ みえた?'],
    },
    {
      keys: ['おなかすいた', 'たべたい', 'おやつ', 'ごはん'],
      say: [
        'おなか すいたね。えきの ホームで たべる そばも おいしいんだよ',
        'えきの なかに おいしい おみせが ある えき、しってる?',
      ],
    },
    {
      keys: ['ぱぱ', 'まま', 'おとうさん', 'おかあさん', 'おじいちゃん', 'おばあちゃん', 'いもうと', 'おにいちゃん'],
      say: ['そうなんだ! かぞくで でんしゃに のったら たのしいよね', 'こんど いっしょに どこか いきたいね'],
    },
    {
      keys: ['けんか', 'いじわる', 'たたかれた', 'なかまはずれ'],
      say: [
        'そっか…… けんかしちゃったんだね。かなしかったね',
        'でんしゃもね、おなじ せんろを つかうときは じゅんばんを まもって なかよく はしってるんだ',
        'あしたは 「ごめんね」って いえるかな?',
      ],
    },
    {
      keys: ['ねむれない', 'ねる', 'おふとん'],
      say: ['でんしゃも よるは しゃりょうきちで ねてるよ。おやすみの じゅんび しようね'],
    },
  ];

  /* ------------------------------------------------------------------
   * チップ(タップで はなせる ボタン)
   * ------------------------------------------------------------------ */

  function chip(label, send) {
    return { label, send: send || label };
  }

  function suggestChips() {
    const out = [];
    if (state.lastStation) {
      out.push(chip(state.lastStation + 'の となりは?', state.lastStation + 'の となりの えきは?'));
    }
    const line = state.lastLine || myLine();
    out.push(chip(line.name + 'って どんな せん?', line.name + 'って どんな でんしゃ?'));
    out.push(chip('クイズ だして 🚃', 'クイズ だして'));
    out.push(chip('しりとり しよ 🔤', 'えきめい しりとり'));
    out.push(chip('のりかえ おしえて 🔀', 'のりかえが おおい えきは どこ?'));
    out.push(chip('でんしゃの ふしぎ ❓', 'でんしゃは なんで うごくの?'));
    return out.slice(0, 6);
  }

  /* ------------------------------------------------------------------
   * ふりかえし(キャッチボールの ための しつもん)
   * ------------------------------------------------------------------ */

  function backQuestion() {
    const line = myLine();
    return pick(
      [
        'きみは どの えきが すき?',
        'きょうは でんしゃに のった?',
        state.char.me + 'は ' + line.name + 'が だいすき! きみの すきな ろせんは?',
        'いちばん かっこいいと おもう でんしゃ、なに?',
        'どこか いってみたい えき、ある?',
        'ちかてつと しんかんせん、どっちが すき?',
      ],
      'back'
    );
  }

  /* ------------------------------------------------------------------
   * ほんたい
   * ------------------------------------------------------------------ */

  function respond(raw) {
    const text = String(raw || '').trim();
    const norm = normalize(text);
    state.turns += 1;

    if (!text) {
      return reply(['もしもし? きこえてるよ。なんでも はなしてね'], { face: 'think' });
    }

    /* --- あそびの とちゅう --- */
    if (state.mode === 'quiz' && state.quiz) return judgeQuiz(text, norm);
    if (state.mode === 'shiritori' && state.shiritori) return judgeShiritori(text, norm);

    /* --- ことばの中の 駅と路線 --- */
    const stations = findStations(text);
    const line = findLine(text);
    if (line) state.lastLine = line;
    if (stations.length > 0) state.lastStation = stations[0];

    /* --- あそびの スタート --- */
    if (has(norm, ['しりとり'])) return startShiritori();
    if (has(norm, ['くいず', 'もんだい', 'クイズ'])) return startQuiz();

    /* --- あいさつ・おわかれ --- */
    if (has(norm, ['ばいばい', 'さようなら', 'またね', 'おやすみ', 'じゃあね'])) {
      return reply(
        [
          callName(true) + 'きょうは はなせて たのしかった!',
          'また えきで あおうね。いってらっしゃい! 👋',
        ],
        { face: 'happy' }
      );
    }
    if (has(norm, ['こんにちは', 'おはよう', 'こんばんは', 'はろー', 'やっほ', 'もしもし'])) {
      return reply(
        [
          pick(['やっほー! 🚃', 'こんにちは! 🚃', 'おーい! こっちだよ 🚃'], 'hi') +
            ' ' +
            callName(),
          backQuestion(),
        ],
        { face: 'happy' }
      );
    }

    /* --- ありがとう・ほめことば --- */
    if (has(norm, ['ありがとう', 'ありがと', 'すごい', 'かっこいい', 'かわいい', 'だいすき', 'すきだよ'])) {
      return reply(
        [
          pick(
            [
              'えへへ、ありがとう! うれしいなあ 😊',
              'そんなこと いわれたら、はやく はしっちゃう! 💨',
              'ありがとう! ' + state.char.me + 'も きみが だいすき!',
            ],
            'thanks'
          ),
          backQuestion(),
        ],
        { face: 'wow' }
      );
    }

    /* --- なまえ --- */
    if (has(norm, ['なまえ', 'だれ', 'きみは', 'なにもの'])) {
      if (has(norm, ['ぼくの', 'わたしの', 'おれの'])) {
        return reply(['そうなんだ! よろしくね!'], { face: 'happy' });
      }
      const line2 = myLine();
      return reply(
        [
          state.char.hello,
          line2.name + 'を まいにち はしってるよ。' + state.char.quirk + 'なんだ',
          state.childName ? '' : 'きみの なまえは なに?',
        ],
        { face: 'happy' }
      );
    }

    /* --- きもち --- */
    if (has(norm, ['たのしい', 'うれしい', 'やった', 'できた'])) {
      return reply(
        [callName() + 'いいね! ' + state.char.me + 'まで うれしく なっちゃった 🎉', backQuestion()],
        { face: 'wow' }
      );
    }
    if (has(norm, ['かなしい', 'さみしい', 'ないた', 'いやだ', 'つまんない', 'おこられた'])) {
      return reply(
        [
          'そっか…… そういう ひも あるよね。',
          state.char.me + 'は ずっと ここに いるから、いっぱい はなしてね',
          'げんきが でるように、' + myLine().stations[0].name + 'まで いっしょに はしろうか?',
        ],
        { face: 'think' }
      );
    }
    if (has(norm, ['つかれた', 'ねむい', 'ねむたい'])) {
      return reply(
        ['つかれたね。でんしゃも よるは しゃりょうきちで ぐっすり ねるんだよ', 'ゆっくり やすんでね 😴'],
        { face: 'think' }
      );
    }
    if (has(norm, ['こわい', 'びっくり'])) {
      return reply(['だいじょうぶ、' + state.char.me + 'が となりに いるよ。ゆっくり いこう'], {
        face: 'think',
      });
    }

    /* --- あそびかた --- */
    if (has(norm, ['なにができる', 'あそびかた', 'つかいかた', 'なにしてあそぶ', 'たすけて'])) {
      return reply(
        [
          state.char.me + 'と できること だよ!',
          '① えきの なまえを いうと、その えきの おはなしを するよ',
          '② 「しぶやから よこはままで」って きくと、いきかたを おしえるよ',
          '③ 「クイズ だして」「しりとり しよ」で あそべるよ',
          '④ 「でんしゃは なんで うごくの?」も きいてみて!',
        ],
        { face: 'happy' }
      );
    }

    /* --- いきかた(A から B まで)。駅は ことばに出てきた じゅんばんで ならんでいる --- */
    if (stations.length >= 2) {
      const from = stations[0];
      const to = stations[1];
      const route = findRoute(from, to);
      if (route) {
        state.lastStation = to;
        state.lastLine = route.legs[0].line;
        return reply(routeSentence(route), { face: 'wow', focusStation: to });
      }
      return reply(
        [from + 'から ' + to + 'は、' + state.char.me + 'の しってる ろせんだと つながってないみたい……'],
        { face: 'think' }
      );
    }

    if (stations.length === 1 && has(norm, ['いきたい', 'いくには', 'いきかた', 'どうやって'])) {
      const from = myLine().stations[0].name;
      const route = findRoute(from, stations[0]);
      if (route) return reply(routeSentence(route), { face: 'wow' });
    }

    /* --- のりかえ --- */
    if (has(norm, ['のりかえ', 'のりかえる'])) {
      if (stations.length === 1) {
        const ls = linesOf(stations[0]);
        if (ls.length >= 2) {
          return reply(
            [
              stations[0] + 'は のりかえの えき!',
              joinNames(ls.map((l) => l.name), 6) + ' が とまるよ。ぜんぶで ' + ls.length + 'ろせん!',
            ],
            { face: 'wow' }
          );
        }
        return reply([stations[0] + 'は ' + ls[0].name + 'だけの えき。のりかえは ないんだ'], {
          face: 'think',
        });
      }
      const top = TRANSFER_STATIONS.slice(0, 5);
      return reply(
        [
          'のりかえが おおい えきは……',
          top
            .map((n) => n + '(' + STATION_INDEX[n].length + 'ろせん)')
            .join('、'),
          'いちばんは ' + top[0] + '! めいろみたいだよ',
        ],
        { face: 'wow', focusStation: top[0] }
      );
    }

    /* --- となりの えき --- */
    if (has(norm, ['となり', 'つぎのえき', 'まえのえき', 'つぎは'])) {
      const target = stations[0] || state.lastStation;
      if (!target) {
        return reply(['どの えきの となりかな? えきの なまえを おしえて!'], { face: 'think' });
      }
      const useLine = line || linesOf(target)[0];
      const n = neighborsOn(target, useLine);
      const out = [];
      if (n.prev && n.next) {
        out.push(useLine.name + 'で ' + target + 'の となりは、' + n.prev + ' と ' + n.next + ' だよ');
      } else if (n.next) {
        out.push(target + 'は はしっこの えき! となりは ' + n.next + ' だけ だよ');
      } else if (n.prev) {
        out.push(target + 'は はしっこの えき! となりは ' + n.prev + ' だけ だよ');
      }
      const others = linesOf(target).filter((l) => l.id !== useLine.id);
      if (others.length > 0) {
        const o = others[0];
        const on = neighborsOn(target, o);
        out.push(
          o.name + 'なら、となりは ' + [on.prev, on.next].filter(Boolean).join('と ') + ' に なるよ'
        );
      }
      state.lastStation = target;
      state.lastLine = useLine;
      return reply(out, { face: 'happy' });
    }

    /* --- はしっこ・しゅうてん --- */
    if (has(norm, ['しゅうてん', 'さいご', 'はしっこ', 'どこまで', 'はじまり', 'さいしょ', 'しはつ'])) {
      const l = line || state.lastLine || myLine();
      const st = l.stations;
      return reply(
        [
          l.name + 'は ' + st[0].name + 'から ' + st[st.length - 1].name + 'まで はしってるよ',
          'ぜんぶで ' + st.length + 'えき あるんだ',
        ],
        { face: 'happy', focusLine: l.id }
      );
    }

    /* --- なんえき? --- */
    if (has(norm, ['なんえき', 'いくつ', 'かず', 'いくつある'])) {
      const l = line || state.lastLine || myLine();
      return reply(
        [l.name + 'の えきは ぜんぶで ' + l.stations.length + 'えき!'],
        { face: 'wow', focusLine: l.id }
      );
    }

    /* --- なにいろ? --- */
    if (has(norm, ['なにいろ', 'いろは', 'カラー'])) {
      const l = line || state.lastLine || myLine();
      return reply(
        [l.name + 'の いろは ' + LINE_COLOR_NAME[l.id] + ' だよ! ろせんずでも ' + LINE_COLOR_NAME[l.id] + 'で かいてあるんだ'],
        { face: 'happy', focusLine: l.id }
      );
    }

    /* --- ろせんず --- */
    if (has(norm, ['ろせんず', 'ちず', 'マップ', 'まっぷ'])) {
      const l = line || state.lastLine || myLine();
      return reply(
        ['はい、' + l.name + 'の ろせんず だよ! したの えきを タップすると おはなし するよ'],
        { face: 'happy', focusLine: l.id, openMap: true }
      );
    }

    /* --- でんしゃの ふしぎ --- */
    if (has(norm, ['なんで', 'どうして', 'なぜ', 'ふしぎ'])) {
      const hit = WONDERS.find((w) => w.keys.some((k) => norm.indexOf(normalize(k)) >= 0));
      if (hit) return reply(hit.say.concat(['ほかにも しりたいこと ある?']), { face: 'wow' });
      const any = randomOf(WONDERS);
      return reply(
        ['うーん、むずかしい しつもんだね!', 'かわりに でんしゃの ひみつを ひとつ。'].concat(any.say),
        { face: 'think' }
      );
    }

    /* --- でんしゃが すき! --- */
    if (has(norm, ['でんしゃ']) && has(norm, ['すき', 'だいすき', 'かっこいい'])) {
      return reply(
        [
          'わあ、うれしい! ' + state.char.me + 'も でんしゃが だいすき!',
          'きみは どの でんしゃが いちばん すき?',
        ],
        { face: 'wow' }
      );
    }

    /* --- すきな でんしゃ --- */
    if (has(norm, ['すきなでんしゃ', 'なにがすき', 'すきなろせん', 'おすすめ'])) {
      const l = myLine();
      return reply(
        [
          state.char.me + 'が すきなのは もちろん ' + l.name + '! ' + l.note,
          'ほかにも ' + randomOf(LINES).name + 'も かっこいいと おもうよ',
          backQuestion(),
        ],
        { face: 'wow' }
      );
    }

    /* --- 路線の はなし --- */
    if (line && (has(norm, ['どんな', 'おしえて', 'って']) || stations.length === 0)) {
      return reply(lineSentence(line), { face: 'happy', focusLine: line.id });
    }

    /* --- 駅の はなし --- */
    if (stations.length === 1) {
      return reply(stationSentence(stations[0]), { face: 'happy', focusStation: stations[0] });
    }

    /* --- ふだんの はなし --- */
    const topic = TOPICS.find((t) => t.keys.some((k) => norm.indexOf(normalize(k)) >= 0));
    if (topic) return reply(topic.say, { face: 'happy' });

    /* --- はい / いいえ --- */
    if (has(norm, ['うん', 'そう', 'はい', 'いいよ', 'やりたい'])) {
      return reply([pick(['うんうん!', 'そうなんだ!', 'いいね!'], 'yes'), backQuestion()], {
        face: 'happy',
      });
    }
    if (has(norm, ['ううん', 'いや', 'ちがう', 'いいえ'])) {
      return reply(['そっか! じゃあ べつの はなし しよう。' + backQuestion()], { face: 'think' });
    }

    /* --- どれにも あてはまらない --- */
    return reply(
      [
        pick(
          [
            'ふむふむ、そうなんだ!',
            'へえ〜! おしえてくれて ありがとう',
            'なるほどね〜',
            'そうなんだ! おもしろいね',
          ],
          'aizuchi'
        ),
        pick(
          [
            backQuestion(),
            'えきの なまえを いってくれたら、その えきの おはなしを するよ!',
            '「クイズ だして」って いうと クイズ するよ',
          ],
          'nudge'
        ),
      ],
      { face: 'think' }
    );
  }

  /* ------------------------------------------------------------------
   * そとから つかう
   * ------------------------------------------------------------------ */

  return {
    state,
    setCharacter(id) {
      const c = CHAR_BY_ID[id];
      if (!c) return;
      state.char = c;
      state.mode = 'chat';
      state.quiz = null;
      state.shiritori = null;
      state.lastLine = LINE_BY_ID[c.lineId];
      state.lastStation = null;
    },
    setChildName(name) {
      state.childName = String(name || '').slice(0, 8);
    },
    greeting() {
      const line = myLine();
      const st = line.stations;
      return {
        say: [
          state.char.hello,
          (state.childName ? state.childName + 'くん、' : '') +
            'きょうは なにを はなそうか?',
          line.name + 'は ' + st[0].name + 'から ' + st[st.length - 1].name + 'まで、' + st.length + 'えき あるよ',
        ],
        chips: suggestChips(),
        face: 'happy',
        focusLine: line.id,
        focusStation: null,
      };
    },
    respond,
    suggestChips,
    currentLine: myLine,
  };
})();
