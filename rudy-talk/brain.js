'use strict';

/*
 * ルディの あたま(会話エンジン)
 *
 *   Brain.reply(text, { choice })  … 子どもの ことばに こたえる
 *   Brain.hello() / idle() / poke() … はじめの あいさつ / だまっている とき / タップ された とき
 *
 * 返事は { lines: [{ text, face }], choices, chips, sfx, event } の かたち。
 * text の なかの [[ことば]] や [[ことば|かつようけい]] は、WORDS の ことばを さす。
 * 画面では ふりがな つきで ひかり、タップすると いみが みられる。
 *
 * 通信は しない。ぜんぶ この ファイルの なかで 組み立てる。
 */

const Brain = (function () {
  const W = {};
  WORDS.forEach((x) => { W[x.w] = x; });

  /* ============================ こまかい どうぐ ============================ */

  function toHira(s) {
    return String(s).replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  }
  function norm(s) {
    return toHira(String(s).toLowerCase())
      .replace(/[\s、。,.!！?？・「」『』（）()〜~…♪]/g, '');
  }
  const hasKanji = (s) => /[一-鿿々]/.test(s);
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rand(a.length)];
  function shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i -= 1) {
      const j = rand(i + 1);
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }

  /* おなじ セリフが つづかない ように */
  const lastPick = {};
  function pickFresh(key, arr) {
    if (arr.length < 2) return arr[0];
    let i = rand(arr.length);
    if (i === lastPick[key]) i = (i + 1 + rand(arr.length - 1)) % arr.length;
    lastPick[key] = i;
    return arr[i];
  }

  /*
   * ふりがなの つけかた。
   *   「名残惜しい / なごりおしい」なら おわりの「しい」が おなじなので、
   *   「名残惜」に「なごりお」を ふる。「名残惜しく」と かつようしても つかえる。
   */
  function stemOf(word) {
    const { w, y } = word;
    let k = 0;
    while (k < w.length && k < y.length && w[w.length - 1 - k] === y[y.length - 1 - k]) k += 1;
    return { base: w.slice(0, w.length - k), rt: y.slice(0, y.length - k) };
  }

  function rubyOf(word, disp) {
    const d = disp || word.w;
    if (!hasKanji(d)) return { base: d, rt: '', rest: '' };
    const st = stemOf(word);
    if (st.base && d.indexOf(st.base) === 0) {
      return { base: st.base, rt: st.rt, rest: d.slice(st.base.length) };
    }
    return { base: d, rt: d === word.w ? word.y : '', rest: '' };
  }

  /* [[w]] / [[w|かつようけい]] を ばらす */
  const TOKEN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

  function parse(text) {
    const out = [];
    let last = 0;
    String(text).replace(TOKEN, (whole, key, disp, at) => {
      if (at > last) out.push({ t: 'text', s: text.slice(last, at) });
      const word = W[key];
      if (word) out.push({ t: 'word', w: key, ruby: rubyOf(word, disp) });
      else out.push({ t: 'text', s: disp || key });
      last = at + whole.length;
      return whole;
    });
    if (last < text.length) out.push({ t: 'text', s: text.slice(last) });
    return out;
  }

  /* よみあげ用。ことばは よみがなで よむ */
  function toSpeech(text) {
    return parse(text).map((p) => {
      if (p.t === 'text') return p.s;
      const r = p.ruby;
      return (r.rt || r.base) + r.rest;
    }).join('');
  }

  function wordsIn(text) {
    const list = [];
    String(text).replace(TOKEN, (whole, key) => {
      if (W[key] && list.indexOf(key) < 0) list.push(key);
      return whole;
    });
    return list;
  }

  /* 子どもが その ことばを つかったか みつける ための かたち */
  function formsOf(word) {
    if (word._forms) return word._forms;
    const set = new Set();
    (word.f || []).forEach((f) => set.add(f));
    set.add(word.w);
    set.add(word.y);
    /* 「誇らしい」→「誇らし」「ほこらし」のように、おわりを きって かつようも ひろう */
    if (hasKanji(word.w) && /[るうくすつむぶぐぬい]$/.test(word.w)) {
      set.add(word.w.slice(0, -1));
      set.add(word.y.slice(0, -1));
    }
    word._forms = Array.from(set)
      .map((s) => norm(s))
      .filter((s) => s.length >= (hasKanji(s) ? 1 : 3))
      .sort((a, b) => b.length - a.length);
    return word._forms;
  }

  /* 文の なかに でてくる ことばを ぜんぶ さがす。みつかった かたち(form)も かえす */
  function scanWords(n) {
    const hits = [];
    WORDS.forEach((word) => {
      const form = formsOf(word).find((f) => n.indexOf(f) >= 0);
      if (form) hits.push({ word, form });
    });
    /* ながい ことばを さきに(「猫の手も借りたい」が「猫」に まけない ように) */
    return hits.sort((a, b) => b.form.length - a.form.length || b.word.w.length - a.word.w.length);
  }
  function findWords(n) {
    return scanWords(n).map((h) => h.word);
  }

  /*
   * 子どもが「つかえた」と みなして いいか。
   * ことばが 1400 いじょう あるので、ふつうの 文にも たまたま まじる。
   *   - ルディが まだ おしえて いない ことばは、むずかしめ(lv2〜)で、
   *     かんじ いりか 4もじ いじょうの かたちで みつかった ときだけ
   *   - ひらがな 3もじの かたちは、おしえた ことば だけ
   */
  function usableHits(n, raw) {
    /* すきまで くぎった かたまり(「ちょう さむい」の「ちょうさ」を ひろわない ため) */
    const chunks = String(raw || n).split(/[\s、。,.!！?？]+/).map(norm).filter(Boolean);
    return scanWords(n).filter(({ word, form }) => {
      const kanjiWord = hasKanji(word.w);
      const kanjiForm = hasKanji(form);
      if (kanjiWord && !kanjiForm && form.length <= 5 && !chunks.some((c) => c.indexOf(form) >= 0)) return false;
      const met = isMet(word.w);
      const strong = kanjiForm || form.length >= 4;
      if (met) return strong || form.length >= 3;
      if (word.lv < 2) return false;
      return kanjiWord ? kanjiForm : form.length >= 4;
    }).map((h) => h.word);
  }

  /* れいぶんの なかの その ことばを ひからせる */
  function markExample(word) {
    const raw = [word.w].concat(word.f || []);
    if (hasKanji(word.w) && /[るうくすつむぶぐぬい]$/.test(word.w)) raw.push(word.w.slice(0, -1));
    raw.sort((a, b) => b.length - a.length);
    for (let i = 0; i < raw.length; i += 1) {
      if (word.e.indexOf(raw[i]) >= 0) return word.e.replace(raw[i], `[[${word.w}|${raw[i]}]]`);
    }
    return word.e;
  }

  /* ============================ きおく ============================ */

  /* なまえを いれなかった ときの なまえ */
  const DEFAULT_NAME = 'あお';

  /*
   * 「あお」の ききまちがい・かきまちがいを なおす。
   * おんせいにんしきは「あお」を「ああ」「青」と きくことが あるので、
   * そのまま ほぞん されると「ああ」と よばれて しまう。
   */
  function fixName(name) {
    const s = String(name || '').trim();
    if (/^(ああ|青|アオ|あおー|あおう)$/.test(s)) return DEFAULT_NAME;
    return s;
  }

  let mem = { name: DEFAULT_NAME, level: 2, words: {}, mitome: 0, quizOk: 0 };
  const st = {
    mode: 'chat', // chat | quiz | iikae
    quiz: null,
    iikae: null,
    mission: null, // { w, turns }
    pending: null, // { type: 'know', w } / { type: 'answer' }
    lastWord: null,
    turn: 0,
    lastIikae: -9,
    lastTeach: -9,
    lastLines: [],
    streak: 0,
    idle: 0,
  };

  function init(m) {
    mem = Object.assign({ name: DEFAULT_NAME, level: 2, words: {}, mitome: 0, quizOk: 0 }, m || {});
    if (!mem.words || typeof mem.words !== 'object') mem.words = {};
    mem.name = fixName(mem.name);
  }

  const rec = (w) => {
    if (!mem.words[w]) mem.words[w] = { m: 0, k: 0, u: 0 };
    return mem.words[w];
  };
  const isMet = (w) => !!(mem.words[w] && mem.words[w].m);
  const isKnown = (w) => !!(mem.words[w] && mem.words[w].k);
  function meet(w) { rec(w).m = 1; }
  function know(w) { const r = rec(w); r.m = 1; r.k = 1; }
  function inLevel(word) { return word.lv <= mem.level; }

  function score() {
    let s = 0;
    Object.keys(mem.words).forEach((w) => {
      const r = mem.words[w];
      if (!W[w]) return;
      s += (r.m ? 1 : 0) + (r.k ? 2 : 0) + Math.min(r.u || 0, 3) * 3;
    });
    return s;
  }

  const RANKS = [
    { at: 0, name: 'こねこ', icon: '🐱' },
    { at: 10, name: 'のらねこ', icon: '🐈' },
    { at: 30, name: 'いえねこ', icon: '🏠' },
    { at: 60, name: 'ものしりねこ', icon: '📚' },
    { at: 110, name: 'ボスねこ', icon: '👑' },
    { at: 180, name: 'はかせねこ', icon: '🎓' },
    { at: 300, name: 'ルディきゅう', icon: '🌟' },
    { at: 600, name: 'でんせつの ねこ', icon: '🏆' },
    { at: 1200, name: 'ことばの かみさま', icon: '👼' },
  ];
  function rank() {
    const s = score();
    let r = RANKS[0];
    let next = null;
    RANKS.forEach((x, i) => {
      if (s >= x.at) { r = x; next = RANKS[i + 1] || null; }
    });
    return { score: s, name: r.name, icon: r.icon, next };
  }

  /* ============================ へんじの くみたて ============================ */

  function fill(s) {
    return String(s).replace(/\{name\}/g, mem.name || DEFAULT_NAME);
  }

  function newReply() {
    return { lines: [], choices: null, chips: null, sfx: null, event: null };
  }

  /* '@smug ふん\n@normal …' の かたちを 1ぎょうずつ */
  function say(r, block, face) {
    String(block).split('\n').forEach((ln) => {
      const m = ln.match(/^@(\w+)\s+([\s\S]*)$/);
      r.lines.push({ text: fill(m ? m[2] : ln), face: m ? m[1] : (face || 'normal') });
    });
  }

  /* やさしさの レベルに あう セリフを えらぶ */
  function maxLv(text) {
    return wordsIn(text).reduce((a, w) => Math.max(a, W[w].lv), 0);
  }
  function pickVariant(key, list) {
    const ok = list.filter((v) => maxLv(v) <= mem.level);
    return pickFresh(key, ok.length ? ok : list);
  }

  /* みとめど(ルディが きみを みとめている どあい) */
  const MITOME_LINES = {
    20: '@shy …ふん。{name}、すこしは 見どころが あるかもニャ',
    40: '@smug {name}の ことば、まえより ふえてきたニャ。…べつに ほめてないけど',
    60: '@shy ルディの となり、すわっても いいよ。…とくべつ だからね',
    80: '@shy {name}と はなすのは、まあ、[[愉快]] だニャ。…いまの、ほかの ねこには ないしょ',
    100: '@happy …みとめる。{name}は ルディの いちばんの あいぼう だニャ。ずっと だよ',
  };
  function addMitome(r, n) {
    const before = mem.mitome;
    mem.mitome = Math.min(100, mem.mitome + n);
    [20, 40, 60, 80, 100].forEach((t) => {
      if (before < t && mem.mitome >= t) {
        say(r, MITOME_LINES[t]);
        r.sfx = 'level';
        r.event = 'mitome';
      }
    });
  }

  /* ============================ ことばを おしえる ============================ */

  function explain(r, word, opener) {
    meet(word.w);
    st.lastWord = word.w;
    const head = opener || pickFresh('explainHead', [
      '@smug 『[[{w}]]』は、{m} って いみ だニャ',
      '@normal 『[[{w}]]』って いうのは、{m} って こと',
      '@smug しかたないニャ。『[[{w}]]』は {m} って いみ だよ',
    ]);
    say(r, head.replace(/\{w\}/g, word.w).replace(/\{m\}/g, word.m));
    say(r, `@normal たとえば「${markExample(word)}」`);
  }

  const TEACH_LINES = [
    '@smug …あ、『[[{w}]]』って わかる? わからない よね。{m} って いみ だよ。おぼえときな',
    '@smug いまの『[[{w}]]』は、{m} って こと。ルディは ものしり だからニャ',
    '@smug 『[[{w}]]』も しらないの? ニャハハ。{m} って いみ だニャ',
    '@normal ちなみに『[[{w}]]』は、{m} って いみ。とくべつに おしえて あげる',
  ];
  const MISSION_LINES = [
    '@smug ねえ、『[[{w}]]』を じぶんで つかって みせてよ。かいわの なかで つかえたら、みとめて あげるニャ',
    '@smug {name}に『[[{w}]]』が つかえるかニャ? つかえたら ほめて あげても いいよ',
    '@normal しゅくだい だニャ。つぎの おしゃべりで『[[{w}]]』を つかうこと!',
  ];

  /* 返事に でてきた ことばを、はじめてなら その場で おしえる */
  function teachAfter(r) {
    if (r.choices) return;
    const words = [];
    r.lines.forEach((l) => wordsIn(l.text).forEach((w) => { if (words.indexOf(w) < 0) words.push(w); }));
    if (!words.length) return;
    st.lastWord = words[words.length - 1];
    const fresh = words.find((w) => !isMet(w));
    if (fresh && st.turn - st.lastTeach >= 1) {
      const word = W[fresh];
      say(r, pickFresh('teach', TEACH_LINES).replace(/\{w\}/g, word.w).replace(/\{m\}/g, word.m));
      meet(fresh);
      st.lastTeach = st.turn;
      return;
    }
    words.forEach(meet);
    /* もう しってる ことばなら、たまに「つかって みせて」と しゅくだいを だす */
    if (!st.mission && Math.random() < 0.3) {
      const w = words.find((x) => !(mem.words[x] && mem.words[x].u));
      if (w) setMission(r, w);
    }
  }

  function setMission(r, w) {
    st.mission = { w, turns: 0 };
    say(r, pickFresh('mission', MISSION_LINES).replace(/\{w\}/g, w));
  }

  /* ============================ つかえた! ============================ */

  function praiseUse(r, word) {
    const rc = rec(word.w);
    const wasMet = rc.m;
    const first = !rc.u;
    rc.m = 1; rc.k = 1; rc.u = (rc.u || 0) + 1;
    st.lastWord = word.w;
    r.sfx = 'yay';
    if (st.mission && st.mission.w === word.w) {
      st.mission = null;
      say(r, pickFresh('missionDone', [
        '@surprise !! いま『[[{w}]]』って いった? \n@shy …ふん、やるじゃん。やくそく だから みとめて あげるニャ',
        '@surprise え、ほんとに『[[{w}]]』 つかった!\n@shy …{name}の くせに 生意気 だニャ。でも、[[見事]] だったよ',
      ]).replace(/\{w\}/g, word.w));
      addMitome(r, 10);
      return;
    }
    if (!wasMet) {
      say(r, `@surprise え、『[[${word.w}]]』を しってるの!? ルディが おしえる まえに?\n@smug …{name}、なかなか やるニャ。${word.m} って いみ、あってるよね?`);
      addMitome(r, 8);
      return;
    }
    if (first) {
      say(r, pickFresh('useFirst', [
        `@surprise お、『[[${word.w}]]』って ことば、つかえるように なったんだ\n@shy …ちょっとだけ [[感心]] したニャ。ちょっと だけね`,
        `@smug ふーん、『[[${word.w}]]』なんて いえるんだ。ルディの おかげ だニャ\n@shy …でも、ちゃんと つかえてたよ`,
        `@surprise いま『[[${word.w}]]』って いったよね!\n@smug ルディが おしえた ことば だニャ。わすれて なかったんだ`,
      ]));
      addMitome(r, 6);
      return;
    }
    say(r, pickFresh('useAgain', [
      `@smug 『[[${word.w}]]』、もう {name}の ことばに なってるニャ`,
      `@normal また『[[${word.w}]]』。すっかり つかいこなしてるニャ`,
      `@shy 『[[${word.w}]]』…ふん、つかいかた、あってるよ`,
    ]));
    addMitome(r, 2);
  }

  /* ============================ いいかえ チャレンジ ============================ */

  const IIKAE_INTRO = {
    default: [
      '@smug 『{k}』? また それ? {name}の ことばは それしか ないの? ニャハハ',
      '@smug でた、『{k}』。ルディなら もっと かっこよく いうニャ',
      '@smug 『{k}』ばっかり じゃ つまらないニャ。ルディが いいかたを おしえて あげる',
    ],
    'かなしい': ['@sad …そっか、{k}のか。ルディが そばに いて あげるニャ\n@normal でも『{k}』にも いろいろ あるんだよ'],
    'こわい': ['@surprise こわいの? だいじょうぶ、ルディが いるニャ。…ルディも ちょっと こわいけど\n@normal 『{k}』にも いろんな いいかたが あるんだよ'],
    'つかれた': ['@sleepy {k}の? ルディも ひるねの しすぎで つかれたニャ\n@smug 『{k}』じゃ ふつう すぎるから、こう いってごらん'],
    'むかつく': ['@angry おこってるの? ルディも しっぽを ふまれると ぷんぷん だニャ\n@smug でも おこるときも ことばは えらぶニャ'],
    'かわいい': ['@shy か、かわいい? …ふん、そんなの しってるニャ\n@smug でも『かわいい』だけじゃ つまらない。もっと いいかた あるよ'],
    'ねむい': ['@sleepy ふぁ〜。ねむいの? ルディも いつも ねむいニャ\n@smug 『{k}』を おしゃれに いうと、こう だよ'],
    'しんぱい': ['@normal しんぱい なの? だいじょうぶ、ルディが ついてるニャ\n@smug でも『しんぱい』にも いろんな いいかたが あるんだよ'],
    'くやしい': ['@normal くやしいのは、がんばった しょうこ だニャ\n@smug その きもち、もっと かっこよく いってみな'],
    'がんばる': ['@smug がんばる? ふーん、えらいじゃん\n@normal 『がんばる』を すごそうに いうと、こう だニャ'],
    'あんしん': ['@happy よかったニャ。ルディも ほっと したよ\n@smug ほっと した ときの ことば、おしえて あげる'],
  };

  function startIikae(r, group) {
    const fit = group.alt.filter((w) => W[w] && inLevel(W[w]));
    const rest = group.alt.filter((w) => W[w] && !inLevel(W[w]));
    const alts = shuffle(fit).concat(shuffle(rest)).slice(0, 3);
    if (!alts.length) return false;
    st.mode = 'iikae';
    st.iikae = { key: group.key, alts };
    st.lastIikae = st.turn;
    const intro = pickFresh('iikae' + group.key, IIKAE_INTRO[group.key] || IIKAE_INTRO.default);
    /* 「かなしかった」→「かなしかった のか」と いいたいので、{k}は ことばの かたちのまま */
    say(r, intro.replace(/\{k\}/g, group.key));
    say(r, '@normal この なかから ひとつ えらんで、いって ごらん');
    r.choices = alts.map((w) => ({ label: `{${w}}`, w }));
    r.chips = ['どれも わからない', 'やめとく'];
    alts.forEach(meet);
    return true;
  }

  function handleIikae(n, choice) {
    const r = newReply();
    const { alts } = st.iikae;
    let idx = typeof choice === 'number' ? choice : numberIn(n, alts.length);
    if (idx < 0) idx = alts.findIndex((w) => formsOf(W[w]).some((f) => n.indexOf(f) >= 0));
    if (idx >= 0) {
      const word = W[alts[idx]];
      st.mode = 'chat';
      st.iikae = null;
      know(word.w);
      say(r, pickFresh('iikaePicked', [
        '@smug そう、『[[{w}]]』。なかなか いい センス だニャ',
        '@happy 『[[{w}]]』を えらぶ とは。わかってるニャ',
        '@smug ふーん、『[[{w}]]』ね。わるくない',
      ]).replace(/\{w\}/g, word.w));
      explain(r, word, '@normal {m} って いみ だよ'.replace('{m}', word.m));
      setMission(r, word.w);
      addMitome(r, 2);
      r.chips = ['ほかのも おしえて', 'クイズ だして', 'わかった!'];
      return r;
    }
    if (/わから|わかん|しらな|知らな|おしえて|教えて|ぜんぶ|全部/.test(n)) {
      st.mode = 'chat';
      st.iikae = null;
      say(r, '@smug しかたないニャ、ぜんぶ おしえて あげる');
      alts.forEach((w) => {
        say(r, `@normal 『[[${w}]]』は、${W[w].m}`);
        know(w);
      });
      setMission(r, pick(alts));
      return r;
    }
    if (/やめ|^いい(よ|や|です)?$|いらな|^べつに/.test(n)) {
      st.mode = 'chat';
      st.iikae = null;
      say(r, '@smug ふーん。ま、いいけど。ルディの ことば、ぜったい やくに たつのに');
      return r;
    }
    /* ぜんぜん ちがう はなし なら、いいかえは やめて ふつうに こたえる */
    st.mode = 'chat';
    st.iikae = null;
    return null;
  }

  /* ============================ ことばクイズ ============================ */

  function numberIn(n, count) {
    const table = [
      /^(1|１|①|いち|いっこめ|ひとつ|一|いちばん)/,
      /^(2|２|②|に$|にー|にばん|ふたつ|二)/,
      /^(3|３|③|さん$|さんばん|みっつ|三)/,
    ];
    for (let i = 0; i < count && i < table.length; i += 1) if (table[i].test(n)) return i;
    return -1;
  }

  function startQuiz(r) {
    const pool = WORDS.filter(inLevel);
    /* であったけど まだ おぼえてない ことばを おおめに */
    const weak = pool.filter((x) => isMet(x.w) && !isKnown(x.w));
    const word = weak.length && Math.random() < 0.6 ? pick(weak) : pick(levelPool(pool));
    const others = shuffle(pool.filter((x) => x.w !== word.w && x.m !== word.m)).slice(0, 2);
    const opts = shuffle([word].concat(others));
    const type = Math.random() < 0.5 ? 'meaning' : 'word';
    st.mode = 'quiz';
    st.quiz = { w: word.w, opts: opts.map((x) => x.w), type, answer: opts.indexOf(word) };
    meet(word.w);
    if (type === 'meaning') {
      say(r, pickFresh('quizHeadM', [
        '@smug ニャハハ、ルディの クイズ だよ。『[[{w}]]』って どういう いみ?',
        '@smug もんだい! 『[[{w}]]』の いみは どれ? {name}に わかるかニャ〜?',
      ]).replace(/\{w\}/g, word.w));
      r.choices = opts.map((x) => ({ label: x.m, w: x.w }));
    } else {
      say(r, pickFresh('quizHeadW', [
        '@smug もんだい! 「{m}」…これを なんて いう?',
        '@smug ルディの クイズ。「{m}」って ことば、どれ だニャ?',
      ]).replace(/\{m\}/g, word.m));
      r.choices = opts.map((x) => ({ label: `{${x.w}}`, w: x.w }));
    }
    r.chips = ['わからない', 'クイズ やめる'];
    r.sfx = 'quiz';
    return r;
  }

  function handleQuiz(n, choice) {
    const r = newReply();
    const q = st.quiz;
    const word = W[q.w];
    let idx = typeof choice === 'number' ? choice : numberIn(n, q.opts.length);
    if (idx < 0 && q.type === 'word') {
      idx = q.opts.findIndex((w) => formsOf(W[w]).some((f) => n.indexOf(f) >= 0));
    }
    if (idx < 0 && /やめ|おわり|もういい|おしゃべり/.test(n)) {
      st.mode = 'chat';
      st.quiz = null;
      say(r, '@smug もう おしまい? ルディに まけるのが こわいんだニャ。ニャハハ');
      r.chips = ['クイズ だして', 'ことば おしえて'];
      return r;
    }
    if (idx < 0 && /わから|わかん|しらな|知らな|ぱす|パス|こたえ|答え/.test(n)) idx = -2;
    if (idx === -1) {
      say(r, '@think ん? 1、2、3の どれか だよ。ボタンを おしても いいニャ');
      r.choices = q.opts.map((w) => ({ label: q.type === 'meaning' ? W[w].m : `{${w}}`, w }));
      r.chips = ['わからない', 'クイズ やめる'];
      return r;
    }
    st.mode = 'chat';
    st.quiz = null;
    if (idx === q.answer) {
      st.streak += 1;
      mem.quizOk = (mem.quizOk || 0) + 1;
      know(word.w);
      r.sfx = 'ok';
      if (st.streak >= 3 && st.streak % 3 === 0) {
        say(r, `@surprise …${st.streak}もん れんぞく せいかい!? \n@shy ふ、ふん。たまたま だニャ。…でも、[[見事]] だったよ`);
        addMitome(r, 5);
      } else {
        say(r, pickFresh('quizOk', [
          '@surprise …せいかい。ちぇっ、まちがえると おもったのに',
          '@smug せいかい だニャ。ま、これくらいは できて とうぜん',
          '@shy …あたり。{name}、[[案外]] やるニャ',
        ]));
        addMitome(r, 3);
      }
      say(r, `@normal 「${markExample(word)}」って つかうんだよ`);
    } else {
      st.streak = 0;
      r.sfx = idx === -2 ? null : 'ng';
      if (idx === -2) say(r, '@smug わからない? ニャハハ、しょうじき だニャ。[[素直]]なのは いいこと');
      else say(r, pickFresh('quizNg', ['@smug ブッブー! ざんねん でした〜。ニャハハ', '@smug ちがうニャ〜。ルディの かち!', '@think おしい…くも ないニャ']));
      explain(r, word, `@normal こたえは『[[${word.w}]]』。${word.m} って いみ だよ`);
    }
    r.chips = ['もう 1もん', 'ことば おしえて', 'おしゃべり しよう'];
    return r;
  }

  /* ============================ わだい ============================ */

  const YOU = /るでぃ|るでい|きみ|あなた|おまえ|ねこちゃん|ねこさん/;

  function greetingByTime() {
    const h = new Date().getHours();
    if (h < 10) return ['@sleepy ふぁ〜…おはよう。ルディは まだ [[うとうと]] してるニャ', '@smug おはよう {name}。ルディは もう けづくろい まで おわってるニャ'];
    if (h < 17) return ['@smug こんにちは。{name}、きょうも ルディに あいに きたの? しかたないニャ', '@normal やあ、{name}。ルディは いま ひなたぼっこを [[満喫]] してたとこ'];
    return ['@normal こんばんは。よるは ねこの じかん だニャ', '@smug こんばんは。{name}、まだ おきてるの? ルディは これから が げんき なんだ'];
  }

  /*
   * test: 見つける ための かた(ひらがな に した 文 n と、もとの 文 raw を わたす)
   * say : 返事の こうほ。ひとつ えらばれる
   * ask : true なら 返事のあとに こたえを まつ
   */
  const TOPICS = [
    { id: 'help', test: (n) => /なにができる|何ができる|あそびかた|遊び方|つかいかた|使い方|へるぷ|なにすればいい|何すればいい/.test(n),
      say: [
        '@normal ルディと できること、おしえて あげるニャ\n@normal ふつうに おしゃべり。「〇〇って なに?」で ことばの いみ。「クイズ」で ことばクイズ。「ことば おしえて」で あたらしい ことば\n@smug それから「すごい」ばっかり いってると、ルディが もっと いい いいかたを おしえて あげるニャ',
      ] },
    { id: 'thanks', test: (n) => /ありがと|さんきゅ|せんきゅ/.test(n),
      say: [
        '@shy べ、べつに {name}の ために やったんじゃ ないニャ\n@normal …どういたしまして',
        '@smug おれいなら まぐろで いいニャ',
        '@shy ふん。…[[照れくさい]] から、そういうの いいって',
      ] },
    { id: 'sorry', test: (n) => /ごめん|すみません|すいません/.test(n),
      say: [
        '@smug [[素直]]に あやまれるのは えらいニャ。…ゆるして あげる',
        '@normal いいよ。ルディは [[気まぐれ]] だから、もう わすれたニャ',
      ] },
    { id: 'night', test: (n) => /おやすみ|もうねる|もう寝る/.test(n),
      say: [
        '@sleepy おやすみ、{name}。ルディも ふかふかの おふとんで [[ぐっすり]] ねるニャ',
        '@sleepy おやすみ。ゆめの なかでも、きょうの ことばを わすれちゃ だめ だよ',
      ] },
    { id: 'bye', test: (n) => /ばいばい|さようなら|さよなら|またね|じゃあね|もういく|もう行く|かえる$|帰る$/.test(n),
      say: [
        '@sad もう いくの? …べつに [[名残惜しい|名残惜しく]] なんか ないニャ\n@normal また きなよ。まってない けどね',
        '@wink じゃあね、{name}。きょう おぼえた ことば、わすれちゃ だめ だよ',
        '@smug ばいばい。…つぎ くる とき までに、ことばを ふやして おくんだニャ',
      ] },
    { id: 'greet', test: (n) => /おはよ|こんにち|こんばん|やっほ|はじめまして|はろー|hello|^hi$|^やあ/.test(n),
      say: () => greetingByTime() },
    { id: 'pet', test: (n) => /なでなで|なでる|なでて|なでたい|撫で|よしよし|もふもふ/.test(n),
      say: [
        '@shy ゴロゴロ…って、ちがう! いまのは ちがうニャ!\n@normal …もうちょっと だけなら、いいけど',
        '@shy さ、さわらないでニャ! …あ、そこ。そこは、まあ…いい',
      ] },
    { id: 'praiseme', test: (n) => /ほめて|褒めて/.test(n),
      say: [
        '@think ほめて ほしいの? …しかたないニャ\n@shy {name}は、まあまあ [[健気]] だニャ',
        '@smug ルディに ほめて もらおう なんて [[図々しい]] ニャ。…でも、きょうは よく しゃべったね',
      ] },
    { id: 'myname', test: (n) => /(なまえ|名前)(は|なに|なん|おしえ|教え)|だれ$|誰$|あなたはだれ|きみはだれ|じこしょうかい|自己紹介/.test(n),
      say: [
        '@smug ルディだニャ。きいろくて、かしこくて、ちょっと [[生意気]]な ねこ。…生意気は よけい だった',
        '@smug ルディ。この ぴかぴかの きいろい けが [[自慢]] だニャ',
      ] },
    { id: 'age', test: (n) => /なんさい|何歳|^いくつ$|いくつなの|としは/.test(n),
      say: [
        '@smug ルディの とし? ないしょ。でも {name}より ずっと ものしり だニャ',
        '@think ねこは にんげんの 4ばいの はやさで としを とるんだって。…だから ないしょ',
      ] },
    { id: 'rudylike', test: (n) => (/(すきな|好きな)(もの|たべもの|食べ物|こと|あそび|遊び|いろ|色|ことば|言葉)?(は|って|なに|何)/.test(n) || /なにがすき|何が好き/.test(n)) && !/ぼく|わたし|おれ|僕|私|俺/.test(n),
      say: [
        '@happy ルディの すきな もの? まぐろ、はこ、ひなたぼっこ。それから…ないしょ\n@shy …{name}と はなす じかんも、まあ、きらいじゃ ないニャ',
        '@smug すきな こと? はこに はいること。じぶんに [[ぴったり]]の はこを みつけると [[ときめく]]んだニャ',
        '@normal すきな ことばは『[[気まぐれ]]』。ねこに ぴったり でしょ',
      ] },
    { id: 'doing', test: (n) => /なにしてる|何してる|なにしてた|何してた|なにしてるの/.test(n),
      say: [
        '@sleepy さっきまで ひだまりで [[うとうと]] してたニャ\n@normal {name}を まってた…わけじゃ ないからね',
        '@smug いま? {name}の ことばを しらべてる ところ。まだまだ だね',
      ] },
    { id: 'food', test: (n) => /ごはん|ご飯|たべ|食べ|おやつ|おなか|お腹|すいた|へった|ぺこ|まぐろ|さかな|魚|ぴざ|かれー|らーめん|すし|寿司/.test(n), ask: true,
      say: [
        '@happy たべものの はなし? ルディ、おなか [[ぺこぺこ]] だニャ!\n@normal {name}の すきな たべものは なに?',
        '@smug ルディの すきな ものは まぐろ。あれは [[絶品]] だニャ\n@normal {name}は なにが すき?',
        '@smug ひなたぼっこの あとの ミルクは [[格別]] なんだ。{name}の とっておきの おやつは?',
        '@normal おやつ? …ルディの ぶんも ある? なかったら [[ふてくされる]] からね',
      ] },
    { id: 'school', test: (n) => /がっこう|学校|ようちえん|幼稚園|ほいくえん|保育園|せんせい|先生|しゅくだい|宿題|べんきょう|勉強|じゅぎょう|授業/.test(n), ask: true,
      say: [
        '@normal がっこうの はなし? ルディは いったこと ないけど、せんせいより ものしり だと おもうニャ\n@smug きょう、[[退屈]]な じかんは あった?',
        '@think しゅくだい? ルディには しゅくだい なんか ないニャ。うらやましい?\n@normal でも ちゃんと やると [[誇らしい]] きもちに なるよ。…たぶん',
        '@smug せんせいに ほめられた こと ある? ルディは まいにち じぶんで じぶんを ほめてるニャ',
        '@normal {name}の [[得意]]な かもくは なに? ルディは「ひるね」が 得意 だニャ',
      ] },
    { id: 'play', test: (n) => /あそ[びぶばん]|遊|げーむ|おにごっこ|こうえん|公園|かくれんぼ|ぶらんこ|すべりだい/.test(n), ask: true,
      say: [
        '@happy あそびの はなし? ルディは けいとだまで あそぶと [[夢中]]に なっちゃうニャ\n@normal {name}が いま 夢中に なってる あそびは なに?',
        '@smug おにごっこ なら ルディは まけないニャ。だって [[素早い]] から',
        '@smug かくれんぼ? ルディは はこの なかに かくれるのが [[得意]] だニャ。しっぽは でちゃうけど',
      ] },
    { id: 'weather', test: (n) => /てんき|天気|あめ(が|だ|ふ)|雨|はれ|晴れ|ゆき|雪|さむい|寒い|あつい|暑い|かぜがつよ|風/.test(n),
      say: [
        '@normal てんきの はなし? はれの ひは ひなたぼっこ。あめの ひは [[退屈]] だニャ',
        '@sleepy さむい ひは こたつ。こたつから でるのが [[億劫]] なんだニャ',
        '@normal あめの ひの ルディは ちょっと [[不機嫌]]。けが しめって いやなんだ',
        '@smug あつい ひは、ゆかで ぺたーっと のびるのが いちばん。ひんやりして [[格別]] だニャ',
      ] },
    { id: 'animal', test: (n) => /ねこ|猫|いぬ|犬|わんちゃん|どうぶつ|動物|ねずみ|うさぎ|ぱんだ|らいおん|とり|鳥/.test(n),
      say: [
        '@smug ねこの はなし? ねこは せかいで いちばん [[優雅]]な いきもの だニャ',
        '@angry いぬ? いぬは ちょっと…[[苦手]]。べつに こわい わけじゃ ないけど',
        '@happy ねずみ? …[[腕が鳴る]]ニャ',
        '@smug どうぶつ なら、やっぱり ねこが いちばん。とくに きいろい ねこ。とくに ルディ',
      ] },
    { id: 'family', test: (n) => /まま|ぱぱ|おかあさん|お母さん|おとうさん|お父さん|おにいちゃん|お兄ちゃん|おねえちゃん|お姉ちゃん|いもうと|妹|おとうと|弟|ばあば|じいじ|おばあちゃん|おじいちゃん|かぞく|家族/.test(n), ask: true,
      say: [
        '@normal おうちの ひとの はなし? ルディにも かいぬしが いるニャ。ルディが ボス だけどね\n@smug おうちの ひとの [[得意]]な ことって なに?',
        '@shy おうちの ひとに ありがとうって いってる? …ルディは いわないけど。[[照れくさい]] から',
      ] },
    { id: 'friend', test: (n) => /ともだち|友達|友だち|けんか|喧嘩|なかよし|仲良し/.test(n),
      say: [
        '@normal ともだちの はなし? ルディの ともだちは…{name}、かな。[[一応]] ね',
        '@think けんか したの? ルディも となりの ねこと よく けんか するニャ\n@normal でも つぎの ひには わすれてる。ねこは [[気まぐれ]] だから',
      ] },
    { id: 'birthday', test: (n) => /たんじょうび|誕生日|おたんじょう/.test(n),
      say: ['@happy たんじょうび!? おめでとう…って いって ほしいの? しかたないニャ。おめでとう\n@smug プレゼントに かつおぶしを くれたら、ルディは [[感激]] するニャ'] },
    { id: 'hurt', test: (n) => /いたい|痛い|けが|怪我|ころんだ|転んだ|ねつ|熱が/.test(n),
      say: ['@surprise え、いたいの? だいじょうぶ? …べつに しんぱい してないけど\n@normal いたい ときは がまん しないで、おうちの ひとに いうんだよ。それも [[勇気]] だニャ'] },
    { id: 'sing', test: (n) => /うたって|歌って|うたう|歌う|うたえ/.test(n),
      say: ['@happy ニャーニャニャー ニャニャー♪ どう? [[見事]] でしょ', '@smug ルディの うたを きける なんて、{name}は ついてるニャ。ニャ〜〜ン♪'] },
    { id: 'joke', test: (n) => /だじゃれ|ぎゃぐ|おもしろいこと|面白いこと|わらわせて|笑わせて/.test(n),
      say: [
        '@smug ねこが ねころんだ。…わらって いいんだよ? [[滑稽]] でしょ',
        '@smug ふとんが ふっとんだ。…ルディの ふとんは [[ふかふか]] だから とばないけどニャ',
      ] },
    { id: 'tease', test: (n) => /いじわる|意地悪|なまいき|生意気/.test(n),
      say: [
        '@smug [[意地悪]]? ルディは しょうじき な だけ だニャ\n@shy …でも、ほんとは ちょっとだけ やさしい ねこ なんだよ',
        '@smug [[生意気]] だって? ルディは ほんとうの ことを いってる だけニャ',
      ] },
    { id: 'insult', test: (n) => /ばか|あほ|まぬけ|うざ|うるさい|ぶす|でぶ|くさい|だまれ|きもい|^(きらい|嫌い|だいきらい|大嫌い)$/.test(n),
      say: [
        '@angry ニャにぃ!? ルディに むかって その いいかた…[[癪に障る]]ニャ!\n@smug でも ルディは おとな だから ゆるして あげる',
        '@angry しつれいな! ルディは [[途方もない]] ほど かしこい ねこ だニャ',
        '@angry ぷいっ。…そういう ことば ばかり つかってると、ことばが へっちゃうニャ',
      ] },
  ];

  /* きかれた ことへの こたえに なりやすい わだい */
  const SUBJECT = ['food', 'school', 'play', 'weather', 'animal', 'family', 'friend'];

  /* ルディを ほめた/すきと いった */
  function isLoveRudy(n) {
    if (/^(だいすき|大好き|すき|好き)$/.test(n)) return true;
    return YOU.test(n) && /すき|好き|えらい|かしこい|てんさい|天才|やさしい|優しい|かっこいい|いいこ|さいこう|最高/.test(n);
  }
  const LOVE = [
    '@shy な、なに いきなり。…[[照れくさい]]ニャ',
    '@smug しってる。ルディは [[見事]]な ねこ だからニャ\n@shy …でも、ありがと',
    '@shy す、すき? …ふ、ふん。ルディも {name}の こと、[[一応]] きらいじゃ ないニャ',
  ];

  /* 「〇〇が すき」「〇〇が きらい」 */
  function aboutLike(raw, n) {
    const m = raw.match(/(.{1,12}?)\s*(が|は|も)\s*(だい)?(すき|好き|きらい|嫌い|にがて|苦手)/);
    if (!m) return null;
    const x = m[1].replace(/^(ぼく|わたし|おれ|僕|私|俺)(は|も)?/, '').trim();
    if (!x || /^(なに|何|どれ|だれ|誰|なんで)$/.test(x)) return null;
    const like = /すき|好き/.test(m[4]);
    const r = newReply();
    if (YOU.test(norm(x))) {
      if (like) say(r, pickVariant('love', LOVE));
      else say(r, '@sad え…ルディの こと きらい なの? …[[落ち込む|落ち込んだ]]ニャ\n@smug …うそ。ルディは そんなに よわく ないニャ');
      return r;
    }
    if (like) {
      say(r, pickFresh('likeX', [
        `@normal ふーん、${x}が すきなんだ。[[夢中]]に なれる ものが あるのは いいこと だニャ`,
        `@smug ${x}? ルディの まぐろへの あいには かなわないけどね`,
        `@happy ${x}が すきなの、ちょっと わかるニャ。どこが すき?`,
      ]));
    } else {
      say(r, pickFresh('dislikeX', [
        `@normal ${x}が [[苦手]] なのか。ルディは おふろが 苦手 だニャ`,
        `@smug ${x}が きらい? …わかる。ルディも きゅうりを みると [[仰天]] するからニャ`,
      ]));
    }
    st.pending = { type: 'answer' };
    return r;
  }

  /* ============================ つなぎの しつもん ============================ */

  const ASK = [
    '@normal ねえ {name}、さいきん [[夢中]]に なってる ことって ある?',
    '@normal {name}の [[得意]]な ことは なに?',
    '@normal {name}の [[苦手]]な たべものは?',
    '@smug {name}が いちばん [[自慢]] できる ことって?',
    '@normal きょう、[[退屈]]な じかん あった?',
    '@normal さいきん [[わくわく]] した ことは?',
    '@think いままでで いちばん [[仰天]] した ことは?',
    '@normal [[懐かしい]]なあって おもう もの、ある?',
    '@smug {name}が [[うっかり]] しちゃった こと、おしえてよ。ニャハハ',
    '@normal [[勇気]]を だして やった こと、ある?',
    '@normal {name}が [[がっかり]] した こと って ある?',
    '@smug [[こっそり]] やってる ひみつ、ルディに だけ おしえてよ',
    '@normal [[首を長くして]] まってる ことって ある?',
  ].map((s) => s.replace('[[首を長くして]]', '[[首を長くする|首を長くして]]'));

  const REACT = [
    '@normal ふーん、「{echo}」ね。まあ、わるく ないんじゃない?',
    '@smug へえ。{name}、[[案外]] おもしろい こと いうニャ',
    '@think なるほどニャ。…いま ちょっと [[感心]] した。ちょっと だけ',
    '@normal 「{echo}」か。ルディは しらなかったニャ。…いまのは ないしょ',
    '@smug ニャるほど。{name}の はなしは [[退屈]] しないニャ',
    '@normal そっか、「{echo}」なんだ。おぼえとくニャ',
  ];
  const AIZUCHI = ['@normal ふーん。', '@smug へえ、それで?', '@think ニャるほど。', '@normal …ふむ。', '@smug ほう。'];

  function echo(raw) {
    const s = String(raw).trim().replace(/[。!！?？]+$/, '');
    return s.length > 14 ? s.slice(0, 12) + '…' : s;
  }

  function fallback(raw, n) {
    const r = newReply();
    if (st.pending && st.pending.type === 'answer' && n.length > 0) {
      say(r, pickFresh('react', REACT).replace(/\{echo\}/g, echo(raw)));
      st.pending = null;
      if (Math.random() < 0.5) {
        say(r, pickVariant('ask', ASK));
        st.pending = { type: 'answer' };
      }
      return r;
    }
    say(r, pickFresh('aizuchi', AIZUCHI));
    say(r, pickVariant('ask', ASK));
    st.pending = { type: 'answer' };
    return r;
  }

  /* ============================ ことばを しらべる ============================ */

  const STRONG_ASK = /(って|とは)(なに|何|なあに|どういう|どんな|いみ|意味|$)|てなに|のいみ|の意味|どういういみ|どういう意味/;
  const ASK_MEANING = /(って|とは)(なに|何|なあに|どういう|どんな|いみ|意味|$)|てなに|のいみ|の意味|いみは|意味は|どういう|^(なに|なにそれ|それなに|なあに)$|しらない|知らない|わからない|分からない|わかんない/;

  function lookup(raw, n, r) {
    if (!ASK_MEANING.test(n)) return false;
    const strongAsk = STRONG_ASK.test(n);
    /* 「〇〇って なに?」の 〇〇 と ぴったり あう ことばを いちばんに */
    const tm = n.match(/^(.+?)(って|とは|のいみ|の意味|ってなに|てなに)/);
    const target = tm ? tm[1] : '';
    let hits = scanWords(n);
    if (!strongAsk) hits = hits.filter((h) => isMet(h.word.w));
    let best = null;
    /* 「ほっとけーき」を「ほっと」と まちがえない ように、ほぼ おなじ ながさの ものだけ */
    if (target) best = hits.find((h) => formsOf(h.word).indexOf(target) >= 0)
      || hits.find((h) => target.indexOf(h.form) >= 0 && h.form.length >= target.length - 2);
    if (!best && hits.length && !target) best = hits[0];
    if (best) {
      explain(r, best.word);
      if (!isKnown(best.word.w)) r.chips = ['クイズ だして', 'わかった!', 'ほかの ことば おしえて'];
      return true;
    }
    /* 「それ どういう いみ?」「いまの なに?」 */
    if (st.lastWord && (/それ|いまの|今の|さっきの|そのことば|どういういみ|いみわから|意味わから|^(わからない|わかんない|しらない|なに|なにそれ)$/.test(n))) {
      explain(r, W[st.lastWord]);
      return true;
    }
    const m = strongAsk && raw.match(/^(.{1,12}?)(って|とは|の\s*いみ|の\s*意味)/);
    if (m) {
      say(r, `@think 「${m[1].trim()}」? …そんな ことば、ルディの じしょには ないニャ`);
      say(r, '@smug ルディが しらない ことばは、おうちの ひとに きいてごらん。ルディも あとで おしえて もらうニャ');
      return true;
    }
    return false;
  }

  /* えらんだ むずかしさの ことばを おおめに(やさしい ことばばかりに ならない ように) */
  /* しょうがっこう 1ねんせいで ならう かんじ(80じ) */
  const KANJI_G1 = '一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六';
  function isG1(word) {
    const ks = Array.from(word.w).filter((c) => /[\u4e00-\u9fff]/.test(c));
    return ks.length > 0 && ks.every((c) => KANJI_G1.indexOf(c) >= 0);
  }
  const KANJI_G2 = '引羽雲園遠何科夏家歌画回会海絵外角楽活間丸岩顔汽記帰弓牛魚京強教近兄形計元言原戸古午後語工公広交光考行高黄合谷国黒今才細作算止市矢姉思紙寺自時室社弱首秋週春書少場色食心新親図数西声星晴切雪船線前組走多太体台地池知茶昼長鳥朝直通弟店点電刀冬当東答頭同道読内南肉馬売買麦半番父風分聞米歩母方北毎妹万明鳴毛門夜野友用曜来里理話';
  /* 1・2ねんせいの かんじだけで かけて、2ねんせいの かんじが 1つ いじょう ある ことば */
  function isG2(word) {
    const ks = Array.from(word.w).filter((c) => /[\u4e00-\u9fff]/.test(c));
    return ks.some((c) => KANJI_G2.indexOf(c) >= 0) &&
      ks.every((c) => KANJI_G1.indexOf(c) >= 0 || KANJI_G2.indexOf(c) >= 0);
  }

  function levelPool(list) {
    /* 「やさしい」では 1・2ねんせいの かんじの ことばを おおめに */
    if (mem.level === 1) {
      const r = Math.random();
      const g1 = list.filter(isG1);
      if (g1.length && r < 0.4) return g1;
      const g2 = list.filter(isG2);
      if (g2.length && r < 0.7) return g2;
    }
    const exact = list.filter((x) => x.lv === mem.level);
    return exact.length && Math.random() < 0.7 ? exact : list;
  }

  function teachNew(r) {
    const pool = levelPool(WORDS.filter((x) => inLevel(x) && !isMet(x.w)));
    const word = pool.length ? pick(pool) : pick(WORDS.filter(inLevel));
    say(r, pickFresh('teachNew', [
      '@smug ルディの ことばを わけて ほしいの? しかたないニャ',
      '@smug ふふん。きょうの ことばは これ だニャ',
      '@normal とくべつに ひとつ おしえて あげる',
    ]));
    explain(r, word);
    setMission(r, word.w);
    r.chips = ['ほかの ことば おしえて', 'クイズ だして', 'わかった!'];
  }

  /* ============================ メイン ============================ */

  function setName(raw) {
    const m = raw.match(/(?:なまえは|名前は)\s*([^\s、。!！?？]{1,8}?)\s*(?:です|だよ|だ$|って|$)/)
      || raw.match(/(?:ぼくは|わたしは|おれは|僕は|私は|俺は)\s*([^\s、。!！?？]{1,8}?)\s*(?:です|っていいます|といいます)/)
      || raw.match(/^([^\s、。!！?？]{1,8}?)\s*(?:って\s*よんで|って\s*呼んで|といいます|っていいます)/);
    if (!m) return null;
    const name = fixName(m[1].replace(/(くん|ちゃん|さん)$/, ''));
    if (!name || /(すき|好き|きらい|いい|げんき|元気|ねむ|つかれ|うれし|かなし|たのし|さい$|歳$|ねん|年)/.test(name)) return null;
    return name;
  }

  function reply(rawIn, opts) {
    const raw = String(rawIn || '').trim();
    const n = norm(raw);
    const o = opts || {};
    st.turn += 1;
    st.idle = 0;
    if (st.mission) st.mission.turns += 1;

    let r = null;

    /* もういちど */
    if (/もういっかい|もう一回|もういちど|もう一度|なんていった|なんて言った|きこえない|聞こえない/.test(n) && st.lastLines.length && st.mode === 'chat') {
      r = newReply();
      const keep = st.lastLines.slice();
      say(r, '@smug しかたないニャ、もう いちど いうよ');
      keep.forEach((l) => r.lines.push(l));
      finish(r, false);
      st.lastLines = keep;
      return r;
    }

    if (st.mode === 'quiz') return finish(handleQuiz(n, o.choice), false);
    if (st.mode === 'iikae') {
      r = handleIikae(n, o.choice);
      if (r) return finish(r, false);
    }

    r = newReply();

    /* なまえ */
    const name = setName(raw);
    if (name) {
      mem.name = name;
      say(r, `@smug ${name}、ね。おぼえて あげるニャ。ルディは ものおぼえが いいから`);
      r.event = 'name';
      return finish(r, true);
    }

    /* 「〇〇って なに?」 */
    if (lookup(raw, n, r)) return finish(r, false);

    /* クイズ・ことば */
    if (/くいず|もんだい|問題|もう1もん|もういちもん|もう一問/.test(n)) return finish(startQuiz(r), false);
    if (/ことば(を)?(おしえ|教え)|ことばおしえ|きょうのことば|今日のことば|あたらしいことば|新しいことば|むずかしいことば|難しいことば|ほかのことば|ほかのも/.test(n)) {
      teachNew(r);
      return finish(r, false);
    }
    if (/ことばちょう|ことば帳|ずかん/.test(n)) {
      say(r, '@smug {name}の ことばちょう、みせて あげる。…すくないニャ〜');
      r.event = 'book';
      return finish(r, false);
    }
    if (/^(わかった|わかったよ|はーい|おっけー|ok|りょうかい|了解)$/.test(n)) {
      say(r, pickFresh('okay', ['@smug ほんとに わかった? じゃあ つかって みせてよ', '@normal よろしい。わすれたら また おしえて あげるニャ', '@smug ふふん、ルディの おかげ だニャ']));
      return finish(r, false);
    }

    /* ルディが すき / ルディに わるくち */
    if (isLoveRudy(n)) {
      say(r, pickVariant('love', LOVE));
      addMitome(r, 1);
      return finish(r, true);
    }
    if (YOU.test(n) && /きらい|嫌い/.test(n) && !/きらいなもの|嫌いなもの|きらいなたべもの/.test(n)) {
      say(r, '@sad え…ルディの こと きらい なの? …[[落ち込む|落ち込んだ]]ニャ\n@smug …うそ。ルディは そんなに よわく ないニャ');
      return finish(r, true);
    }
    const tease = TOPICS.find((t) => t.id === 'tease');
    const hitsForUse = usableHits(n, raw);
    const teaseHit = tease.test(n) && hitsForUse.some((w) => w.w === '意地悪' || w.w === '生意気');
    if (teaseHit) {
      say(r, pickVariant('tease', tease.say));
      praiseUse(r, hitsForUse.find((w) => w.w === '意地悪' || w.w === '生意気'));
      return finish(r, false);
    }

    /* ことばを つかえた! */
    const praiseable = hitsForUse.filter((w) => {
      if (st.mission && st.mission.w === w.w) return true;
      const rc = mem.words[w.w];
      /* やさしい ことばは、2かいめ からは だまって かぞえる だけ(ほめすぎない) */
      if (w.lv === 1 && rc && rc.u) { rc.u += 1; return false; }
      return true;
    });
    if (praiseable.length && n.length >= 2) {
      const word = (st.mission && praiseable.find((w) => w.w === st.mission.w)) || praiseable[0];
      praiseUse(r, word);
      if (Math.random() < 0.5) {
        say(r, pickVariant('ask', ASK));
        st.pending = { type: 'answer' };
      }
      return finish(r, false);
    }

    /* いいかえ チャレンジ */
    if (st.turn - st.lastIikae >= 2) {
      const g = IIKAE.find((x) => x.re.test(n) || x.re.test(raw));
      if (g && startIikae(r, g)) return finish(r, false);
    }

    /* 〇〇が すき / きらい */
    if (!/すきなもの|好きなもの|すきなたべもの|好きな食べ物/.test(n)) {
      const lk = aboutLike(raw, n);
      if (lk) return finish(lk, true);
    }

    /* わだい */
    const topic = TOPICS.find((t) => t.test(n, raw));
    /* ルディの しつもんへの みじかい こたえ(「まぐろ」など)は、わだいを かえずに うけとめる */
    const answering = st.pending && st.pending.type === 'answer' && n.length > 0 && n.length <= 8;
    if (answering && (!topic || SUBJECT.indexOf(topic.id) >= 0)) {
      return finish(fallback(raw, n), true);
    }
    if (topic) {
      const list = typeof topic.say === 'function' ? topic.say() : topic.say;
      say(r, pickVariant(topic.id, list));
      st.pending = topic.ask ? { type: 'answer' } : null;
      if (topic.id === 'bye' || topic.id === 'night') r.event = 'bye';
      return finish(r, true);
    }

    /* しゅくだいの さいそく */
    if (st.mission && st.mission.turns >= 6 && !st.mission.nagged) {
      st.mission.nagged = true;
      say(r, `@smug ところで、『[[${st.mission.w}]]』 まだ つかって くれないの? わすれっぽいニャ〜`);
      return finish(r, false);
    }

    if (!raw) {
      say(r, '@think …? なにか いった?');
      return finish(r, false);
    }
    return finish(fallback(raw, n), true);
  }

  const CHIPS = [
    'クイズ だして', 'ことば おしえて', 'ルディの すきな ものは?', 'きょう たのしかった',
    'おなか すいた', 'なでなで', 'すごいね!', 'つかれた〜', 'いっしょに あそぼ',
    'ありがとう', 'こわい ゆめ みた', 'ほめて', 'うたって', 'ねむい', 'なにが できるの?',
    'びっくり した', 'ルディ だいすき',
  ];

  function finish(r, teach) {
    if (teach && st.mode === 'chat') teachAfter(r);
    if (!r.chips) r.chips = shuffle(CHIPS).slice(0, 4);
    st.lastLines = r.lines.slice();
    return r;
  }

  /* ============================ ルディから はなす ============================ */

  function hello() {
    const r = newReply();
    const metCount = Object.keys(mem.words).filter((w) => W[w] && mem.words[w].m).length;
    if (!metCount) {
      say(r, '@smug ふーん、きみが {name}? ルディだニャ。きいろくて かっこいい ねこ');
      say(r, '@normal ルディは ことばを たくさん しってるんだ。{name}は どうかニャ? ニャハハ');
      say(r, '@normal なんでも はなしかけてよ。ひかってる ことばを タップすると、いみが みられるニャ');
      r.chips = ['よろしくね', 'なにが できるの?', 'ことば おしえて', 'クイズ だして'];
    } else {
      say(r, pickFresh('hello2', [
        '@smug また きたの? {name}。…べつに まってなかったけど',
        '@smug おそいニャ、{name}。ルディ、[[首を長くする|首を長くして]] …まってないけど',
        '@normal あ、{name}。ちょうど [[退屈]] してたとこ。はなし あいて に して あげる',
      ]));
      /* おぼえたけど まだ つかってない ことばで しゅくだい */
      const cand = Object.keys(mem.words).filter((w) => W[w] && mem.words[w].m && !mem.words[w].u);
      if (cand.length) setMission(r, pick(cand));
      r.chips = shuffle(CHIPS).slice(0, 4);
    }
    st.lastLines = r.lines.slice();
    return r;
  }

  const IDLE = [
    '@smug おーい、{name}。[[上の空]]?',
    '@sleepy ふぁ〜。[[退屈]] だニャ。なにか はなしてよ',
    '@shy …べつに さびしく なんか ないけど。[[心細い]] わけじゃ ないニャ',
    '@smug だまってると、ルディが ことばクイズ だしちゃうよ?',
    '@sleepy {name}が しゃべらないから、ルディ [[うとうと]] しちゃう…',
  ];
  function idle() {
    if (st.mode !== 'chat' || st.idle >= 2) return null;
    st.idle += 1;
    const r = newReply();
    say(r, pickVariant('idle', IDLE));
    teachAfter(r);
    r.chips = ['クイズ だして', 'ことば おしえて', 'ごめん、いるよ'];
    st.lastLines = r.lines.slice();
    return r;
  }

  const POKE = [
    ['@angry さわらないでニャ!', '@surprise ニャッ!? いきなり なに!', '@angry しっぽは ダメ! ぷんぷん だニャ'],
    ['@shy …ちょっと だけなら、なでても いいけど', '@smug ふふん、ルディの けなみに [[見とれる|見とれた]]?', '@wink なに? ルディに あいたかったの?'],
    ['@happy ゴロゴロ…いまの、きかなかった ことに して', '@shy {name}の て、あったかいニャ…', '@happy ニャ〜ん。…いまのは ちがう!'],
  ];
  function poke() {
    const r = newReply();
    const tier = mem.mitome >= 60 ? 2 : mem.mitome >= 20 ? 1 : 0;
    say(r, pickFresh('poke' + tier, POKE[tier].concat(tier ? POKE[tier - 1].slice(0, 1) : [])));
    r.lines.forEach((l) => wordsIn(l.text).forEach(meet));
    return r;
  }

  return {
    init,
    reply,
    hello,
    idle,
    poke,
    parse,
    toSpeech,
    markExample,
    rubyOf,
    rank,
    RANKS,
    mem: () => mem,
    DEFAULT_NAME,
    fixName,
    isG1,
    isG2,
    mode: () => st.mode,
    words: WORDS,
    word: (w) => W[w],
    status(w) {
      const r = mem.words[w];
      if (!r || !r.m) return 0;
      if (r.u) return 3;
      if (r.k) return 2;
      return 1;
    },
    _norm: norm,
    _findWords: findWords,
  };
})();

if (typeof module !== 'undefined') module.exports = { Brain };
