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
    mode: 'chat', // 'chat' | 'quiz' | 'shiritori' | 'guess'
    quiz: null,
    shiritori: null,
    lastStation: null,
    lastLine: null,
    lastSay: [],
    guess: null,
    wordQuiz: null,
    wordLevel: 3, // 1=やさしい 2=ふつう 3=ぜんぶ
    learned: [],  // おぼえた ことば(app.js が ほぞんする)
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

  function randomOf(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  /* そのキャラの 口ぐせ(talk.js の CHAR_LINES)を とりだす */
  function charLines(kind) {
    const set = CHAR_LINES[state.char.id] || {};
    return set[kind] || [];
  }

  /* いまの じかんを 子ども向けに */
  function nowWords() {
    const d = new Date();
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h < 12 ? 'ごぜん' : 'ごご';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return ampm + ' ' + h12 + 'じ' + (m > 0 ? ' ' + m + 'ふん' : '');
  }

  /*
   * セリフの中の しるし を、いまの キャラや じょうきょうに おきかえる。
   *   %ME %LINE %CHAR %ST %ST2 %NAME %AGE %TIME (＋ extra で わたした ぶん)
   */
  function fill(text, extra) {
    let out = String(text || '');
    if (out.indexOf('%') < 0) return out;

    const line = myLine();
    const st1 = randomOf(line.stations).name;
    let st2 = randomOf(line.stations).name;
    if (st2 === st1) st2 = line.stations[(line.stations.length - 1) - line.stations.findIndex((s) => s.name === st1)].name;

    const opened = LINE_OPENED[line.id];
    const age = opened ? new Date().getFullYear() - opened + 'さいくらい' : 'ないしょ';

    const table = Object.assign(
      {
        '%ME': state.char.me,
        '%LINE': line.name,
        '%CHAR': state.char.name,
        '%ST2': st2,
        '%ST': st1,
        '%NAME': state.childName ? state.childName + 'くん' : 'きみ',
        '%AGE': age,
        '%TIME': nowWords(),
      },
      extra || {}
    );

    /* ながい しるしから さきに おきかえる(%LINEN が %LINE に とられないように) */
    Object.keys(table)
      .sort((a, b) => b.length - a.length)
      .forEach((key) => {
        if (out.indexOf(key) < 0) return;
        out = out.split(key).join(table[key]);
      });
    /* 「%NAME、」を つかった文で なまえが ないときの、よぶんな くうはくを ととのえる */
    return out.replace(/\s+/g, ' ').trim();
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
    out.say = out.say.map((t) => fill(t));
    if (!out.chips) out.chips = suggestChips();
    state.lastSay = out.say;
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

  /* STATION_TALK に せつめいの ある駅(なぞなぞクイズに つかう) */
  const TALKED_STATIONS = Object.keys(STATION_TALK).filter((n) => STATION_INDEX[n]);

  function makeQuiz() {
    const kinds = [
      'neighbor',
      'color',
      'whichline',
      'terminal',
      'count',
      'order',
      'company',
      'motif',
    ];
    const kind = randomOf(kinds);
    const line = Math.random() < 0.6 ? myLine() : randomOf(LINES);

    if (kind === 'order') {
      const a = randomOf(line.stations);
      let b = randomOf(line.stations);
      let guard = 0;
      while (b.name === a.name && guard < 20) {
        b = randomOf(line.stations);
        guard += 1;
      }
      const first = a.index < b.index ? a : b;
      return {
        kind,
        question:
          '🚦 クイズ! ' +
          line.name +
          'を ' +
          line.stations[0].name +
          'から じゅんばんに いくと、' +
          a.name +
          'と ' +
          b.name +
          '、さきに つくのは どっち?',
        answers: [first.name],
        hint: 'ヒント! 「' + stationYomi(first.name).charAt(0) + '」から はじまる ほうだよ',
        say: () => first.name + 'の ほうが さきに つくんだ',
        focusLine: line.id,
        focusStation: first.name,
      };
    }

    if (kind === 'company') {
      return {
        kind,
        question: '🏢 クイズ! ' + line.name + 'は どこの かいしゃの でんしゃでしょう?',
        answers: [line.company],
        accept: (COMPANY_WORDS[line.company] || []).concat([line.company]),
        hint: 'ヒント! 「' + line.company.charAt(0) + '」から はじまる かいしゃ だよ',
        say: () => line.name + 'は ' + line.company + 'の でんしゃ',
        focusLine: line.id,
      };
    }

    if (kind === 'motif' && TALKED_STATIONS.length > 0) {
      const name = randomOf(TALKED_STATIONS);
      return {
        kind,
        question: '🕵️ なぞなぞ! 「' + STATION_TALK[name] + '」 これは どこの えきでしょう?',
        answers: [name],
        hint:
          'ヒント! ' +
          linesOf(name)[0].name +
          'の えきで、「' +
          stationYomi(name).charAt(0) +
          '」から はじまるよ',
        say: (a) => (a || name) + ' だよ',
        focusLine: linesOf(name)[0].id,
        focusStation: name,
      };
    }

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
        say: (a) => st.name + 'の となりは ' + a + ' だよ',
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
        say: () => line.name + 'は ' + color + ' なんだ',
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
        say: (a) => st.name + 'は ' + a + ' の えきだよ',
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
        say: (a) => line.name + 'は ' + first + 'から ' + last + 'までだよ',
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
      say: () => line.name + 'は ' + num + 'えき あるんだ',
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
      return reply([pick(PRAISE_ON_CORRECT, 'ok'), done], {
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
      return reply([pick(CHEER_ON_WRONG, 'ng'), q.hint], {
        face: 'think',
      });
    }
    state.mode = 'chat';
    const ans = q.answers[0];
    state.quiz = null;
    return reply(['こたえは ' + ans + ' でした! ' + pick(CHEER_AFTER, 'after')], {
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
   * ことば(ごいりょく)
   *   - いみを きかれたら こたえる
   *   - 子どもが むずかしい ことばを つかったら ほめて、いみを たしかめる
   *   - 「ことばクイズ」で 3たくの もんだいを だす
   *   - はなした ことばは おぼえて、ことばちょうに たまっていく
   * ------------------------------------------------------------------ */

  /* おぼえた ことば(かきかたの ならび)。app.js が ほぞんする */
  function learnWord(entry) {
    if (!entry) return;
    if (state.learned.indexOf(entry.w) < 0) state.learned.push(entry.w);
  }

  function wordSentence(entry) {
    learnWord(entry);
    return [
      '📕 「' + entry.w + '」(' + entry.y + ')は、' + entry.m + ' って いみだよ',
      pick(['つかいかた: ', 'たとえば: ', 'こんなふうに つかうよ: '], 'usage') + entry.e,
    ];
  }

  /* ときどき 会話の おまけに つける「きょうの ことば」 */
  function wordSeed() {
    const entry = randomOf(wordsAtLevel(state.wordLevel));
    learnWord(entry);
    return (
      '📕 ことばの おまけ! 「' + entry.w + '」は 「' + entry.m + '」って いみ。' + entry.e
    );
  }

  /* --- ことばクイズ --- */

  function shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  const NUMBER_WORDS = [
    ['1', 'いち', 'ひとつ', '①', 'いちばん'],
    ['2', 'に', 'ふたつ', '②', 'にばん'],
    ['3', 'さん', 'みっつ', '③', 'さんばん'],
  ];

  function startWordQuiz() {
    const pool = wordsAtLevel(state.wordLevel);
    const entry = randomOf(pool);
    const others = shuffle(pool.filter((e) => e.w !== entry.w)).slice(0, 2);
    /* 「いみを あてる」と「ことばを あてる」の 2しゅるい */
    const kind = Math.random() < 0.6 ? 'mean' : 'word';
    const choices = shuffle(
      kind === 'mean'
        ? [entry.m].concat(others.map((e) => e.m))
        : [entry.w].concat(others.map((e) => e.w))
    );
    const answerAt = choices.indexOf(kind === 'mean' ? entry.m : entry.w);
    state.wordQuiz = { entry, kind, choices, answerAt };
    state.mode = 'wordquiz';

    const question =
      kind === 'mean'
        ? '📕 ことばクイズ! 「' + entry.w + '」(' + entry.y + ')は どういう いみでしょう?'
        : '📕 ことばクイズ! 「' + entry.m + '」 これを なんて いうでしょう?';

    return reply(
      [question].concat(choices.map((c, i) => '①②③'.charAt(i) + ' ' + c)),
      {
        face: 'think',
        /* いみの もんだいは 文が ながいので、ボタンは みじかく する */
        chips: choices
          .map((c, i) =>
            chip('①②③'.charAt(i) + ' ' + (c.length > 10 ? c.slice(0, 9) + '…' : c), String(i + 1))
          )
          .concat([chip('わからない 💡', 'わからない')]),
      }
    );
  }

  function judgeWordQuiz(raw, norm) {
    const q = state.wordQuiz;

    if (has(norm, ['やめ', 'もういい', 'おしまい'])) {
      state.mode = 'chat';
      state.wordQuiz = null;
      return reply(['オッケー! ことばクイズは おしまい'], { face: 'happy' });
    }

    let chosen = -1;
    NUMBER_WORDS.forEach((words, i) => {
      if (chosen < 0 && words.some((w) => norm === normalize(w) || raw.indexOf(w) === 0)) chosen = i;
    });
    if (chosen < 0) {
      q.choices.forEach((c, i) => {
        if (chosen < 0 && normalize(c).indexOf(norm) === 0 && norm.length >= 3) chosen = i;
      });
    }

    if (has(norm, ['わからない', 'わかんない', 'ひんと', 'おしえて'])) {
      state.mode = 'chat';
      state.wordQuiz = null;
      return reply(
        ['こたえは ' + '①②③'.charAt(q.answerAt) + ' だよ'].concat(wordSentence(q.entry)),
        { face: 'happy', chips: wordChips() }
      );
    }

    if (chosen === q.answerAt) {
      state.mode = 'chat';
      state.wordQuiz = null;
      return reply(
        [pick(PRAISE_ON_CORRECT, 'ok')].concat(wordSentence(q.entry)).concat([
          'この ことば、つかって みてね!',
        ]),
        { face: 'wow', chips: wordChips() }
      );
    }

    if (chosen >= 0) {
      state.mode = 'chat';
      state.wordQuiz = null;
      return reply(
        [pick(CHEER_ON_WRONG, 'ng')].concat(wordSentence(q.entry)).concat([pick(CHEER_AFTER, 'after')]),
        { face: 'think', chips: wordChips() }
      );
    }

    return reply(['①②③の どれかで こたえてね! 「1」って いっても いいよ'], { face: 'think' });
  }

  function wordChips() {
    return [
      chip('もう1もん ことばクイズ 📕', 'ことばクイズ'),
      chip('きょうの ことば 📕', 'きょうの ことば'),
      chip('えきの はなし 🚉', 'えきの はなし して'),
    ];
  }

  /* ------------------------------------------------------------------
   * あそび: えきあて(3つの ヒントで 駅を あてる)
   * ------------------------------------------------------------------ */

  function guessHint(g, step) {
    const name = g.name;
    const yomi = stationYomi(name);
    return fill(GUESS_HINT_STYLES[step], {
      '%LINEN': g.line.name,
      '%MOTIF': stationMotif(name),
      '%HEAD': yomi.charAt(0),
      '%LEN': String(yomi.length),
    });
  }

  function startGuess() {
    const line = Math.random() < 0.7 ? myLine() : randomOf(LINES);
    const st = randomOf(line.stations);
    state.guess = { name: st.name, line, step: 0 };
    state.mode = 'guess';
    return reply(
      ['えきあて クイズ! %MEが だす ヒントで、どの えきか あててね 🕵️', guessHint(state.guess, 0)],
      {
        face: 'think',
        focusLine: line.id,
        focusStation: null,
        chips: [chip('つぎの ヒント 💡', 'ヒント'), chip('こうさん', 'こうさん')],
      }
    );
  }

  function endGuess(sayList, extra) {
    const name = state.guess ? state.guess.name : '';
    state.mode = 'chat';
    state.guess = null;
    state.lastStation = name;
    return reply(
      sayList,
      Object.assign(
        {
          focusStation: name,
          chips: [
            chip('もういっかい えきあて 🕵️', 'えきあて'),
            chip('クイズ だして 🚃', 'クイズ だして'),
            chip('おはなし する', 'おしゃべり しよう'),
          ],
        },
        extra || {}
      )
    );
  }

  function judgeGuess(raw, norm) {
    const g = state.guess;

    if (has(norm, ['こうさん', 'わからない', 'わかんない', 'やめ', 'おしえて', 'もういい'])) {
      return endGuess(['こたえは 「' + g.name + '」 でした!'].concat(stationSentence(g.name).slice(1, 2)), {
        face: 'happy',
      });
    }
    if (has(norm, ['ひんと', 'ヒント', 'つぎ'])) {
      g.step += 1;
      if (g.step >= GUESS_HINT_STYLES.length) {
        return endGuess(['ヒントは もう ないんだ〜。こたえは 「' + g.name + '」 でした!'], {
          face: 'wow',
        });
      }
      return reply([guessHint(g, g.step)], { face: 'think' });
    }

    const found = findStations(raw);
    if (found.indexOf(g.name) >= 0) {
      return endGuess(
        [pick(PRAISE_ON_CORRECT, 'ok'), 'こたえは 「' + g.name + '」! よく わかったね'],
        { face: 'wow' }
      );
    }
    if (found.length > 0) {
      g.step += 1;
      if (g.step >= GUESS_HINT_STYLES.length) {
        return endGuess([found[0] + 'じゃ ないんだ〜。こたえは 「' + g.name + '」 でした!'], {
          face: 'happy',
        });
      }
      return reply([pick(CHEER_ON_WRONG, 'ng') + ' ' + found[0] + 'じゃ ないんだ', guessHint(g, g.step)], {
        face: 'think',
      });
    }
    return reply(['うーん、それは えきの なまえかな? ヒントが ほしければ 「ヒント」って いってね'], {
      face: 'think',
    });
  }

  /* ------------------------------------------------------------------
   * チップ(タップで はなせる ボタン)
   * ------------------------------------------------------------------ */

  function chip(label, send) {
    return { label, send: send || label };
  }

  /* いつでも つかえる ボタンの もと。まいかい 少しずつ ちがう ものが 出る */
  const CHIP_POOL = [
    ['クイズ だして 🚃', 'クイズ だして'],
    ['しりとり しよ 🔤', 'えきめい しりとり'],
    ['えきあて クイズ 🕵️', 'えきあて'],
    ['のりかえ おしえて 🔀', 'のりかえが おおい えきは どこ?'],
    ['でんしゃの ふしぎ ❓', 'でんしゃは なんで うごくの?'],
    ['ふみきりって なに? 🚧', 'なんで ふみきりが あるの?'],
    ['ちかてつの ひみつ 🕳️', 'なんで ちかてつは じめんの したに あるの?'],
    ['しんかんせんの はなし 🚄', 'しんかんせんの はなし して'],
    ['うんてんしさんの はなし 👨‍✈️', 'うんてんしさんって どんな おしごと?'],
    ['なんさい? 🎂', 'なんさい?'],
    ['いま なんじ? 🕒', 'いま なんじ?'],
    ['うたって 🎵', 'うたって'],
    ['ものまね して 📢', 'ものまね して'],
    ['じまん きかせて ✨', 'じまん きかせて'],
    ['きょうの できごと 💬', 'きょう ようちえんに いったよ'],
    ['ことばクイズ 📕', 'ことばクイズ'],
    ['きょうの ことば 📕', 'きょうの ことば'],
  ];

  function suggestChips() {
    const out = [];
    if (state.lastStation) {
      out.push(chip(state.lastStation + 'の となりは?', state.lastStation + 'の となりの えきは?'));
      out.push(chip(state.lastStation + 'まで いきたい', state.lastStation + 'まで いきたい'));
    }
    const line = state.lastLine || myLine();
    out.push(chip(line.name + 'って どんな せん?', line.name + 'って どんな でんしゃ?'));

    /* のこりは プールから ランダムに。まえと おなじ ならびに ならないように */
    const shuffled = CHIP_POOL.slice();
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
    shuffled.slice(0, 6).forEach((c) => out.push(chip(c[0], c[1])));
    return out.slice(0, 7);
  }

  /* ------------------------------------------------------------------
   * ふりかえし(キャッチボールの ための しつもん)
   * ------------------------------------------------------------------ */

  function backQuestion() {
    return pick(BACK_QUESTIONS, 'back');
  }

  function nudge() {
    return pick(NUDGES, 'nudge');
  }

  /* あいづち。キャラの 口ぐせと 共通のを まぜる */
  function aizuchi() {
    return pick(charLines('aizuchi').concat(COMMON_AIZUCHI), 'aizuchi');
  }

  /* ------------------------------------------------------------------
   * ほんたい
   * ------------------------------------------------------------------ */

  function respond(raw) {
    const text = String(raw || '').trim();
    const norm = normalize(text);
    state.turns += 1;

    if (!text) {
      return reply(
        [pick(['もしもし? きこえてるよ。なんでも はなしてね', 'あれ? もういちど いってみて!'], 'empty')],
        { face: 'think' }
      );
    }

    /* --- あそびの とちゅう --- */
    if (state.mode === 'quiz' && state.quiz) return judgeQuiz(text, norm);
    if (state.mode === 'shiritori' && state.shiritori) return judgeShiritori(text, norm);
    if (state.mode === 'guess' && state.guess) return judgeGuess(text, norm);
    if (state.mode === 'wordquiz' && state.wordQuiz) return judgeWordQuiz(text, norm);

    /* --- もういちど いって --- */
    if (has(norm, ['もういちど', 'もういっかい いって', 'なんていった', 'きこえなかった', 'もっかい いって'])) {
      if (state.lastSay && state.lastSay.length > 0) {
        return reply(state.lastSay.slice(), { face: 'happy' });
      }
    }

    /* --- ことばの中の 駅と路線 --- */
    const stations = findStations(text);
    const line = findLine(text);
    if (line) state.lastLine = line;
    if (stations.length > 0) state.lastStation = stations[0];

    /* --- あそびの スタート --- */
    if (has(norm, ['しりとり'])) return startShiritori();
    if (has(norm, ['えきあて', 'あてっこ', 'あててみて', 'どこでしょう'])) return startGuess();
    if (has(norm, ['ことばくいず', 'ことばあそび', 'ことばの くいず', 'ごい'])) return startWordQuiz();
    if (has(norm, ['きょうのことば', 'ことばおしえて', 'あたらしいことば', 'むずかしいことば'])) {
      const seed = randomOf(wordsAtLevel(state.wordLevel));
      return reply(wordSentence(seed).concat(['この ことば、つかって みてね!']), {
        face: 'wow',
        chips: wordChips(),
      });
    }
    if (has(norm, ['なぞなぞ'])) return Math.random() < 0.5 ? startGuess() : startWordQuiz();
    if (has(norm, ['くいず', 'もんだい', 'クイズ'])) return startQuiz();

    /* --- あいさつ・おわかれ --- */
    if (has(norm, ['ばいばい', 'さようなら', 'またね', 'おやすみ', 'じゃあね'])) {
      return reply(
        [callName(true) + 'きょうは はなせて たのしかった!', pick(charLines('bye'), 'bye')],
        { face: 'happy' }
      );
    }
    if (has(norm, ['こんにちは', 'おはよう', 'こんばんは', 'はろー', 'やっほ', 'もしもし'])) {
      return reply([callName() + pick(charLines('hello'), 'hi'), backQuestion()], {
        face: 'happy',
      });
    }

    /* --- ありがとう・ほめことば --- */
    if (has(norm, ['ありがとう', 'ありがと', 'かっこいい', 'かわいい', 'だいすき', 'すきだよ', 'えらい'])) {
      return reply([pick(charLines('praise'), 'thanks'), backQuestion()], { face: 'wow' });
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
          pick(charLines('brag'), 'brag'),
          state.childName ? '' : 'きみの なまえは なに?',
        ],
        { face: 'happy' }
      );
    }

    /* --- きもち --- */
    if (has(norm, ['たのしい', 'うれしい', 'やった'])) {
      return reply(
        [
          callName() +
            pick(
              [
                'いいね! %MEまで うれしく なっちゃった 🎉',
                'わあ、よかったね! %MEも うれしい!',
                'たのしいのが いちばん! 🎉',
              ],
              'glad'
            ),
          backQuestion(),
        ],
        { face: 'wow' }
      );
    }
    if (has(norm, ['かなしい', 'さみしい', 'ないた', 'いやだ', 'つまんない', 'おこられた'])) {
      return reply(
        [
          pick(['そっか…… そういう ひも あるよね', 'かなしかったね。よく はなしてくれたね'], 'sad'),
          pick(charLines('cheer'), 'cheer'),
          '%MEは ずっと ここに いるから、いっぱい はなしてね',
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
      return reply(
        [
          pick(
            [
              'だいじょうぶ、%MEが となりに いるよ。ゆっくり いこう',
              'こわかったね。%MEが まもってあげる!',
            ],
            'fear'
          ),
        ],
        { face: 'think' }
      );
    }

    /* --- じまん きかせて --- */
    if (has(norm, ['じまん', 'ひみつおしえて', 'とくいなこと'])) {
      return reply([pick(charLines('brag'), 'brag'), backQuestion()], { face: 'wow' });
    }

    /* --- あそびかた --- */
    if (has(norm, ['なにができる', 'あそびかた', 'つかいかた', 'なにしてあそぶ', 'たすけて'])) {
      return reply(
        [
          state.char.me + 'と できること だよ!',
          '① えきの なまえを いうと、その えきの おはなしを するよ',
          '② 「しぶやから よこはままで」って きくと、いきかたを おしえるよ',
          '③ 「クイズ だして」「しりとり」「えきあて」で あそべるよ',
          '④ 「でんしゃは なんで うごくの?」も きいてみて!',
          '⑤ ききのがしたら 「もういちど いって」で くりかえすよ',
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
      /* きかれた路線 → じぶんの路線 → その駅の さいしょの路線 の じゅんで えらぶ */
      const onLines = linesOf(target);
      const useLine =
        line || onLines.find((l) => l.id === state.char.lineId) || onLines[0];
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

    /* --- ことばの いみを きかれた --- */
    if (has(norm, ['どういういみ', 'いみは', 'いみおしえて', 'ってなに', 'ってなぁに', 'なにそれ', 'ってどういうこと', 'しらない'])) {
      const asked = findWordEntry(text);
      if (asked) {
        return reply(wordSentence(asked).concat([pick(['つかえたら かっこいいよ!', 'おぼえられそう?'], 'wtail')]), {
          face: 'happy',
          chips: wordChips(),
        });
      }
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
      return reply([aizuchi(), backQuestion()], { face: 'happy' });
    }
    if (has(norm, ['ううん', 'いや', 'ちがう', 'いいえ'])) {
      return reply(
        [
          pick(['そっか! じゃあ べつの はなし しよう', 'なるほど。じゃあ これは どう?'], 'no'),
          backQuestion(),
        ],
        { face: 'think' }
      );
    }

    /* --- むずかしい ことばを つかえた! --- */
    const usedWord = findWordEntry(text);
    if (usedWord && usedWord.lv >= 2) {
      learnWord(usedWord);
      return reply(
        [
          pick(
            [
              'おお! 「' + usedWord.w + '」なんて むずかしい ことば、よく しってるね!',
              '「' + usedWord.w + '」が つかえるなんて すごい!',
              'いま 「' + usedWord.w + '」って いったね。かっこいい ことばだ!',
            ],
            'usedword'
          ),
          '「' + usedWord.w + '」は 「' + usedWord.m + '」って いみ だったね',
          backQuestion(),
        ],
        { face: 'wow', chips: wordChips() }
      );
    }

    /* --- どれにも あてはまらない --- */
    /* ときどき「きょうの ことば」を おまけで つける */
    const tail = Math.random() < 0.65 ? backQuestion() : nudge();
    const extra = Math.random() < 0.25 ? wordSeed() : '';
    return reply([aizuchi(), extra, tail], { face: 'think' });
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
    setWordLevel(level) {
      const n = parseInt(level, 10);
      state.wordLevel = n >= 1 && n <= 3 ? n : 3;
    },
    setLearned(list) {
      state.learned = Array.isArray(list) ? list.slice() : [];
    },
    learnedWords() {
      return state.learned.map((w) => WORD_BY_KEY[w]).filter(Boolean);
    },
    explainWord(key) {
      const entry = WORD_BY_KEY[key];
      if (!entry) return null;
      return reply(wordSentence(entry), { face: 'happy', chips: wordChips() });
    },
    setChildName(name) {
      state.childName = String(name || '').slice(0, 8);
    },
    greeting() {
      const line = myLine();
      const st = line.stations;
      /* 3つめは まいかい ちがう「つかみ」に する */
      const opener = pick(
        [
          line.name + 'は ' + st[0].name + 'から ' + st[st.length - 1].name + 'まで、' + st.length + 'えき あるよ',
          pick(charLines('brag'), 'brag'),
          '%LINEの いろは ' + LINE_COLOR_NAME[line.id] + '。おぼえておいてね',
          'きょうも ' + st[0].name + 'から はしってきたよ!',
          backQuestion(),
        ],
        'opener'
      );
      return reply(
        [
          state.char.hello,
          (state.childName ? state.childName + 'くん、' : '') + 'きょうは なにを はなそうか?',
          opener,
        ],
        { face: 'happy', focusLine: line.id, focusStation: null }
      );
    },
    respond,
    suggestChips,
    currentLine: myLine,
  };
})();
