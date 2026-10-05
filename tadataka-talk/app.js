'use strict';

/*
 * ちりはかせ ただたか — おしゃべりの しくみ
 *
 *  1. こどもの ことばを ひらがなに そろえる(カタカナ → ひらがな、くうはくを とる)
 *  2. 「どこの はなしか」をさがす: ばしょ(名所) → 都道府県 → めいさん → 地方
 *  3. 「なにを ききたいか」をさがす: めいさん / ばしょ / ちり / となり / けんちょう / まめちしき …
 *  4. ただたかの セリフを くみたてて、ふきだしと よみあげで こたえる
 *
 *  クイズは 3択。ボタンを おしても、こえや もじで こたえても よい。
 */

/* ============================ ほぞん ============================ */

const STORE_KEY = 'tadataka-talk-v1';
const save = { visited: [], voice: true, sound: true };

function loadSave() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) Object.assign(save, JSON.parse(raw));
  } catch (e) { /* よめなくても あそべる */ }
  if (!Array.isArray(save.visited)) save.visited = [];
}
function writeSave() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても あそべる */ }
}

/* ============================ もじの せいり ============================ */

const MARK = /\[([^|\]]+)\|([^\]]+)\]/g;

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
// [漢字|かな] → <ruby>
function ruby(s) {
  return esc(s).replace(MARK, '<ruby>$1<rt>$2</rt></ruby>').replace(/\n/g, '<br>');
}
// よみあげ用: かなだけ / えもじを けす
function forSpeech(s) {
  return String(s)
    .replace(MARK, '$2')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, ' ')
    .replace(/[「」『』()（）]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function kanjiOf(s) { return String(s).replace(MARK, '$1'); }
function kanaOf(s) { return String(s).replace(MARK, '$2'); }

function toHira(s) {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
// こどもの ことば → くらべやすい かたち
function norm(s) {
  return toHira(String(s).normalize('NFKC').toLowerCase())
    .replace(/[\s、。,.!?！？「」『』()（）・〜~]+/g, ' ')
    .trim();
}
function compact(s) { return s.replace(/\s+/g, ''); }

const pick = (a) => a[Math.floor(Math.random() * a.length)];
function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/* ============================ なまえの さくいん ============================ */

const CODES = Object.keys(PREFS).map(Number);
const prefName = (c) => `[${PREFS[c].n}|${PREFS[c].k}]`;
const capName = (c) => `[${PREFS[c].cap[0]}|${PREFS[c].cap[1]}]`;
const regionOf = (c) => REGIONS.find((r) => r.id === PREFS[c].r);
// けんちょう / とちょう / ふちょう / どうちょう
const capWord = (c) => ({ 都: 'とちょう', 府: 'ふちょう', 道: 'どうちょう' }[PREFS[c].n.slice(-1)] || 'けんちょう') + 'しょざいち';

// みじかい ことば(2もじ いか)は、ほかの ことばの いちぶに まちがえないよう まえと うしろを しらべる
const AFTER = '(?:けん|ふ|と|し|の|って|は|に|で|へ|を|から|まで|が|も|や|と|じゃ|だ|です|$|[^ぁ-ん])';
function strictRe(word) {
  return new RegExp('(?:^|[^ぁ-ん])(' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')' + AFTER);
}

const PREF_ALIASES = [];
function addAlias(word, code, list) {
  const w = toHira(word);
  if (!w) return;
  list.push({ w, code, strict: w.length <= 2 && /^[ぁ-ん]+$/.test(w), re: w.length <= 2 ? strictRe(w) : null });
}
CODES.forEach((c) => {
  const p = PREFS[c];
  addAlias(p.n, c, PREF_ALIASES);
  addAlias(p.k, c, PREF_ALIASES);
  if (c !== 1) {
    addAlias(p.n.replace(/[県府都]$/, ''), c, PREF_ALIASES);
    addAlias(p.k.replace(/(けん|ふ|と)$/, ''), c, PREF_ALIASES);
  }
  // けんちょうしょざいちが けんの なまえと ちがう ときだけ(さがし=さがす などの まちがい ぼうし)
  const capBase = p.cap[1].replace(/(し|く)$/, '');
  if (capBase !== p.k.replace(/(けん|ふ|と)$/, '') && capBase.length >= 2) {
    addAlias(p.cap[0], c, PREF_ALIASES);
    addAlias(p.cap[0].replace(/[市区]$/, ''), c, PREF_ALIASES);
    addAlias(capBase, c, PREF_ALIASES);
  }
});

// みつけた ことばを ながい じゅんに とる(とうきょうと の なかの きょうと を ひろわない)
function findAll(text, list) {
  const hits = [];
  list.forEach((a) => {
    if (a.re) {
      const m = a.re.exec(text);
      if (m) hits.push({ a, at: m.index + m[0].indexOf(m[1]), len: a.w.length });
    } else {
      const i = text.indexOf(a.w);
      if (i >= 0) hits.push({ a, at: i, len: a.w.length });
    }
  });
  hits.sort((x, y) => y.len - x.len);
  const taken = [];
  const out = [];
  hits.forEach((h) => {
    // おなじ ことばが ふたつの けんに ある(ふじさん・りんご)ときは りょうほう のこす
    const same = taken.some((t) => t.at === h.at && t.len === h.len && t.w === h.a.w);
    if (!same && taken.some((t) => h.at < t.at + t.len && t.at < h.at + h.len)) return;
    taken.push({ at: h.at, len: h.len, w: h.a.w });
    out.push(h);
  });
  return out.sort((x, y) => x.at - y.at);
}

// ばしょ(名所)
const SPOT_ALIASES = [];
const SPOT_EXTRA = {
  'でぃずにー': [12, 0], 'ゆーえすじぇー': [27, 2], 'usj': [27, 2], 'ゆにばーさる': [27, 2],
  'すかいつりー': [13, 0], 'なまはげ': [5, 2], 'ひこにゃん': [25, 1], 'くまもん': [43, 1],
  'ぱんだ': [30, 3], 'じんべえざめ': [47, 1], 'しか': [29, 1], 'ねぶた': [2, 3], 'りにあ': [23, 1],
  'うずしお': [36, 0], 'すなむし': [46, 2], 'もあい': [45, 3], 'ろけっと': [46, 3],
  'きょうりゅう': [18, 0], 'がっしょうづくり': [21, 0], 'げんばくどーむ': [34, 1],
};
CODES.forEach((c) => {
  PREFS[c].spot.forEach((s, i) => {
    const names = new Set();
    [kanjiOf(s[0]), toHira(kanaOf(s[0]))].forEach((full) => {
      const f = compact(full);
      names.add(f);
      f.split('の').forEach((seg) => { if (seg.length >= 3 && seg !== f) names.add(seg); });
    });
    names.forEach((w) => { if (w.length >= 2) addAlias(w, c * 10 + i, SPOT_ALIASES); });
  });
});
Object.keys(SPOT_EXTRA).forEach((w) => addAlias(w, SPOT_EXTRA[w][0] * 10 + SPOT_EXTRA[w][1], SPOT_ALIASES));

// めいさん
const FOOD_ALIASES = [];
function foodTerms(name) {
  const k = compact(toHira(kanaOf(name)));
  const terms = new Set([k]);
  k.split(/[・()（）の]/).forEach((t) => { if (t.length >= 2) terms.add(t); });
  return [...terms];
}
CODES.forEach((c) => {
  PREFS[c].food.forEach((f, i) => {
    foodTerms(f[1]).forEach((t) => addAlias(t, c * 10 + i, FOOD_ALIASES));
  });
});

/* ============================ ききたいこと ============================ */

const INTENTS = [
  ['quiz', ['くいず', 'もんだい', '問題']],
  ['map', ['ちず', '地図', 'まっぷ']],
  ['nb', ['となり', '隣', 'りんせつ']],
  ['cap', ['けんちょう', 'しょざいち', '県庁', '所在地', 'ふちょう', 'とちょう', '府庁', '都庁']],
  ['food', ['めいさん', '名産', 'たべもの', '食べ', 'おいしい', '美味しい', 'ぐるめ', 'とくさん', '特産', 'めいぶつ', '名物', 'つくって', 'とれる', 'さんち']],
  ['spot', ['ゆうめい', '有名', 'ばしょ', '場所', 'かんこう', '観光', 'みどころ', '見所', 'いきたい', '行きたい', 'おでかけ', 'あそび', 'ところ', '所']],
  ['geo', ['ちり', '地理', 'ちけい', '地形', 'やま', '山', 'かわ', '川', 'うみ', '海', 'きこう', '気候', 'てんき', '天気', 'ゆき', '雪', 'みずうみ', '湖', 'はんとう', '半島']],
  ['mame', ['まめちしき', '豆知識', 'ひみつ', '秘密', 'もっと', 'ほかに', '他に', 'へぇ', 'すごい']],
];
function intentOf(t) {
  for (const [id, keys] of INTENTS) if (keys.some((k) => t.includes(k))) return id;
  return null;
}
const has = (t, words) => words.some((w) => t.includes(w));

/* ============================ セリフ ============================ */

const LINES = {
  open: ['{n}じゃな!', 'おお、{n}か!', '{n}の ことなら まかせとけ!', 'どれどれ、{n}の ちずを ひらくぞ…', 'ほほう、{n}! よい ところ じゃ。'],
  aizuchi: ['ふむふむ。', 'ほほう!', 'なるほどのう。', 'よい しつもん じゃ!', 'うむうむ。'],
  ok: ['せいかい! よう しっとるのう!', 'あたり! たいしたもんじゃ!', 'おみごと! ちりはかせの でしに しよう!', 'せいかい じゃ! はなまる!'],
  ng: ['おしい! こたえは {a} じゃ。', 'ざんねん、{a} じゃった。つぎは いけるぞ!', 'ふふ、むずかしかったのう。{a} じゃ。'],
  next: ['なにを ききたい?', 'ほかにも きいてみるか?', 'もっと しりたいことは あるかの?'],
};
const fill = (s, o) => s.replace(/\{(\w)\}/g, (_, k) => o[k]);

/* ============================ こたえを つくる ============================ */

const state = { cur: null, quiz: null, last: null };

const PREF_CHIPS = ['ゆうめいな ばしょ', 'めいさん', 'ちり', 'となりの けん', 'まめちしき', 'クイズ'];
const HOME_CHIPS = ['おすすめの けん', 'クイズ', '日本一を おしえて', 'ちずを ひらく', 'りんごは どこ?', 'ただたかって だれ?'];

function visit(c) {
  if (!save.visited.includes(c)) {
    save.visited.push(c);
    writeSave();
    updateStamp();
  }
}

function overview(c) {
  const p = PREFS[c];
  const s = shuffle(p.spot).slice(0, 2);
  return [
    fill(pick(LINES.open), { n: prefName(c) }),
    `${regionOf(c).n}の なかまで、${capWord(c)}は ${capName(c)}。`,
    pick(p.geo),
    `ゆうめいな ばしょは ${s[0][0]}や ${s[1][0]}。`,
    `めいさんは ${p.food.slice(0, 3).map((f) => f[0] + f[1]).join('、')}。`,
    pick(LINES.next),
  ].join('\n');
}

function aboutPref(c, intent) {
  const p = PREFS[c];
  state.cur = c;
  visit(c);
  const name = prefName(c);
  let say;
  let chips = PREF_CHIPS;
  let face = 'happy';
  switch (intent) {
    case 'spot':
      say = `${name}の ゆうめいな ばしょを しょうかい しよう!\n` + p.spot.map((s) => `📍${s[0]}… ${s[1]}`).join('\n');
      break;
    case 'food':
      say = `${name}の めいさんは これじゃ!\n` + p.food.map((f) => `${f[0]}${f[1]}… ${f[2]}`).join('\n');
      break;
    case 'geo':
      say = `${name}の ちりを おしえよう。\n` + p.geo.map((g) => `🧭${g}`).join('\n');
      face = 'think';
      break;
    case 'cap':
      say = `${name}の ${capWord(c)}は ${capName(c)} じゃ。`;
      if (kanaOf(p.cap[1]).replace(/(し|く)$/, '') !== p.k.replace(/(けん|ふ|と)$/, '')) {
        say += '\nけんの なまえと ちがうから、おぼえておくと じまん できるぞ!';
      }
      break;
    case 'nb':
      if (p.nb.length) {
        say = `${name}の となりは ${p.nb.length}つ。\n` + p.nb.map(prefName).join('、') + ' じゃ。';
        chips = p.nb.map((n) => PREFS[n].k).concat(['クイズ']);
      } else if (c === 1) {
        say = `${name}は うみに かこまれて おるから、りくで となりあう けんは ない。\nうみを はさんで となりは あおもりけん。[青函|せいかん]トンネルで つながって おる。`;
      } else {
        say = `${name}は しまの けん。りくで となりあう けんは ないんじゃ。\nいちばん ちかいのは かごしまけんの しまじま じゃ。`;
      }
      face = 'think';
      break;
    case 'mame':
      say = `${name}の まめちしき じゃ。\n💡` + pick(p.mame.concat(p.geo.slice(-1)));
      face = 'wow';
      break;
    default:
      say = overview(c);
  }
  return { say, chips, face, cur: c };
}

function aboutSpot(codes) {
  const items = [...new Set(codes)].map((id) => ({ c: Math.floor(id / 10), s: PREFS[Math.floor(id / 10)].spot[id % 10] }));
  // おなじ なまえ(ふじさん・しまなみかいどう)は まとめる
  const byName = {};
  items.forEach((it) => { (byName[kanaOf(it.s[0])] = byName[kanaOf(it.s[0])] || []).push(it); });
  const lines = [pick(LINES.aizuchi)];
  Object.values(byName).forEach((list) => {
    const prefs = list.map((it) => prefName(it.c)).join('と ');
    lines.push(`📍${list[0].s[0]}は ${prefs}に ある。${list[0].s[1]}`);
  });
  const c = items[0].c;
  state.cur = c;
  items.forEach((it) => visit(it.c));
  return { say: lines.join('\n'), face: 'wow', chips: [PREFS[c].k + 'の こと', 'ゆうめいな ばしょ', 'めいさん', 'クイズ'], cur: c };
}

function aboutFood(hits) {
  const terms = {};
  hits.forEach((h) => { (terms[h.a.w] = terms[h.a.w] || new Set()).add(h.a.code); });
  // いちばん ながい ことばで さがす
  const word = Object.keys(terms).sort((a, b) => b.length - a.length)[0];
  const ids = [...terms[word]];
  // 日本一 を さきに
  ids.sort((a, b) => /日本一/.test(PREFS[Math.floor(b / 10)].food[b % 10][2]) - /日本一/.test(PREFS[Math.floor(a / 10)].food[a % 10][2]));
  const lines = [pick(LINES.aizuchi)];
  const seen = new Set();
  ids.forEach((id) => {
    const c = Math.floor(id / 10);
    if (seen.has(c)) return;
    seen.add(c);
    const f = PREFS[c].food[id % 10];
    lines.push(`${f[0]}${prefName(c)}の ${f[1]}… ${f[2]}`);
  });
  const codes = [...seen];
  codes.forEach(visit);
  state.cur = codes[0];
  return {
    say: lines.join('\n'),
    face: 'happy',
    chips: codes.slice(0, 4).map((c) => PREFS[c].k + 'の めいさん').concat(['クイズ']),
    cur: codes[0],
  };
}

function aboutRegion(r) {
  const codes = CODES.filter((c) => PREFS[c].r === r.id);
  return {
    say: `${r.n}には ${codes.length}つの [都道府県|とどうふけん]が ある。\n` + codes.map(prefName).join('、') + '\nどこの はなしを しようかの?',
    face: 'think',
    chips: shuffle(codes).slice(0, 5).map((c) => PREFS[c].k),
    region: r.id,
  };
}

function record(t) {
  const hit = RECORDS.find((r) => r.keys.every((group) => group.some((k) => t.includes(k))));
  const r = hit || pick(RECORDS);
  return {
    say: (hit ? '' : 'では とっておきの 日本一を ひとつ。\n') + '🏆' + r.a,
    face: 'wow',
    chips: r.p.map((c) => PREFS[c].k).concat(['ほかの 日本一', 'クイズ']),
    cur: r.p[0],
  };
}

/* ============================ クイズ ============================ */

const RECORD_Q = [
  ['日本で いちばん おおきい みずうみ [琵琶湖|びわこ]が あるのは?', 25],
  ['日本で いちばん ひろい [都道府県|とどうふけん]は?', 1],
  ['日本で いちばん せまい [都道府県|とどうふけん]は?', 37],
  ['となりあう けんが 8つも ある けんは?', 20],
  ['ひとが いちばん おおい [都道府県|とどうふけん]は?', 13],
  ['ひとが いちばん すくない けんは?', 31],
  ['しまの かずが 日本一の けんは?', 42],
  ['日本で いちばん ふかい みずうみ [田沢湖|たざわこ]が あるのは?', 5],
  ['おんせんの りょうも かずも 日本一の「おんせんけん」は?', 44],
  ['日本の いちばん にしの しま [与那国島|よなぐにじま]が あるのは?', 47],
  ['日本で いちばん たかい ダム [黒部|くろべ]ダムが あるのは?', 16],
  ['もりの わりあいが 日本一の けんは?', 39],
];

function others(answer, n, ok) {
  return shuffle(CODES.filter((c) => c !== answer && (!ok || ok(c)))).slice(0, n);
}

function makeQuiz() {
  const type = pick(['food', 'food', 'spot', 'spot', 'cap', 'nb', 'shape', 'shape', 'record']);
  let q;
  let a;
  let opts;
  let explain;
  let mini = null;
  if (type === 'food') {
    // ほかの けんにも ある めいさん(りんご・かき など)は こたえが ふたつに なるので ださない
    const clash = (c, mine) => PREFS[c].food.some((g) => foodTerms(g[1]).some((t) => mine.some((m) => t.includes(m) || m.includes(t))));
    const pool = [];
    CODES.forEach((c) => PREFS[c].food.forEach((f) => {
      const mine = foodTerms(f[1]);
      if (!CODES.some((o) => o !== c && clash(o, mine))) pool.push([c, f]);
    }));
    const [pc, f] = pick(pool);
    a = pc;
    q = `${f[0]}${f[1]}が めいさんなのは どこ?`;
    opts = others(a, 2, (c) => PREFS[c].r !== PREFS[a].r);
    explain = `${prefName(a)}の ${f[1]}… ${f[2]}`;
  } else if (type === 'spot') {
    a = pick(CODES);
    const s = pick(PREFS[a].spot);
    const k = kanaOf(s[0]);
    q = `📍${s[0]}が あるのは どこ?`;
    opts = others(a, 2, (c) => PREFS[c].r !== PREFS[a].r && !PREFS[c].spot.some((x) => kanaOf(x[0]) === k));
    explain = `${s[0]}… ${s[1]}`;
  } else if (type === 'cap') {
    a = pick(CODES.filter((c) => PREFS[c].cap[1].replace(/(し|く)$/, '') !== PREFS[c].k.replace(/(けん|ふ|と)$/, '')));
    q = `${prefName(a)}の ${capWord(a)}は どこ?`;
    const o = others(a, 2);
    return finishQuiz({ q, a, opts: o, label: capName, explain: `${prefName(a)}の ${capWord(a)}は ${capName(a)}。`, mini });
  } else if (type === 'nb') {
    const base = pick(CODES.filter((c) => PREFS[c].nb.length));
    a = pick(PREFS[base].nb);
    q = `${prefName(base)}の となりの けんは どれ?`;
    opts = others(a, 2, (c) => c !== base && !PREFS[base].nb.includes(c));
    explain = `${prefName(base)}の となりは ${PREFS[base].nb.map(prefName).join('、')}。`;
  } else if (type === 'shape') {
    a = pick(CODES);
    q = 'ちずの あかい ところは どこ?';
    opts = others(a, 2, (c) => PREFS[c].r === PREFS[a].r).concat(others(a, 2)).filter((c, i, arr) => arr.indexOf(c) === i).slice(0, 2);
    mini = a;
    explain = `${prefName(a)}は ${regionOf(a).n}。${PREFS[a].geo[0]}`;
  } else {
    const r = pick(RECORD_Q);
    q = '🏆' + r[0];
    a = r[1];
    opts = others(a, 2);
    explain = pick(PREFS[a].geo);
  }
  return finishQuiz({ q, a, opts, label: prefName, explain, mini });
}

function finishQuiz(z) {
  const options = shuffle([z.a].concat(z.opts));
  const n = state.quiz ? state.quiz.n + 1 : 1;
  state.quiz = { a: z.a, options, label: z.label, explain: z.explain, n, score: state.quiz ? state.quiz.score : 0, done: false };
  return {
    say: `だい${n}もん!\n${z.q}`,
    face: 'think',
    options: options.map((c) => ({ c, html: ruby(z.label(c)) })),
    mini: z.mini,
  };
}

function judge(c) {
  const z = state.quiz;
  z.done = true;
  const ok = c === z.a;
  if (ok) z.score++;
  visit(z.a);
  state.cur = z.a;
  const head = ok ? pick(LINES.ok) : fill(pick(LINES.ng), { a: z.label(z.a) });
  sfx(ok ? 'ok' : 'ng');
  return {
    say: `${head}\n${z.explain}\n(${z.n}もんちゅう ${z.score}もん せいかい)`,
    face: ok ? 'happy' : 'think',
    chips: ['つぎの もんだい', PREFS[z.a].k + 'の こと', 'クイズ おしまい'],
    judged: { pick: c, answer: z.a },
    cur: z.a,
  };
}

/* ============================ あたま ============================ */

function reply(raw) {
  const spaced = norm(raw);
  const t = compact(spaced);
  if (!t) return null;

  // クイズの こたえ
  const z = state.quiz;
  if (z && !z.done) {
    if (has(t, ['わからない', 'わかんない', 'ぱす', 'ひんと'])) {
      const r = regionOf(z.a);
      return { say: `ヒント じゃ。こたえは ${r.n}に あるぞ。`, face: 'think', options: z.options.map((c) => ({ c, html: ruby(z.label(c)) })) };
    }
    const hits = findAll(spaced, PREF_ALIASES).map((h) => h.a.code).filter((c) => z.options.includes(c));
    if (hits.length) return judge(hits[0]);
    const capHit = z.options.find((c) => t.includes(toHira(PREFS[c].cap[1])) || t.includes(PREFS[c].cap[0]));
    if (capHit) return judge(capHit);
  }
  if (has(t, ['おしまい', 'やめる', 'おわり'])) {
    const s = z ? `${z.n}もんちゅう ${z.score}もん せいかい じゃった。よう がんばった!` : 'うむ。';
    state.quiz = null;
    return { say: s + '\nまた いつでも きいとくれ。', face: 'happy', chips: HOME_CHIPS };
  }
  if (has(t, ['つぎのもんだい', 'くいず', 'もんだい', '問題'])) return makeQuiz();

  if (has(t, ['もういちど', 'もういっかい', 'もう一回'])) return state.last;
  if (has(t, ['だれ', 'なまえ', '名前', 'じこしょうかい'])) {
    return {
      say: 'わしは ちりはかせの ただたか じゃ。\nにっぽんじゅうを あるいて ちずを つくって きた。\nなまえは、むかし ほんとうに 日本を あるきまわって ちずを つくった [伊能忠敬|いのうただたか]さんから もらったんじゃ。',
      face: 'happy', chips: HOME_CHIPS,
    };
  }
  if (has(t, ['こんにちは', 'おはよう', 'こんばんは', 'やあ', 'はじめまして', 'はろー'])) {
    return { say: 'うむ、こんにちは! きょうは どこの はなしを しようかの?', face: 'happy', chips: HOME_CHIPS };
  }
  if (has(t, ['ありがとう', 'さんきゅー'])) {
    return { say: 'どういたしまして! しりたい きもちが いちばんの たからもの じゃ。', face: 'happy', chips: HOME_CHIPS };
  }
  if (has(t, ['ばいばい', 'さようなら', 'またね'])) {
    return { say: 'またの! つぎは どこの ちずを ひらこうかのう。', face: 'happy', chips: HOME_CHIPS };
  }
  if (has(t, ['ちず', '地図', 'まっぷ']) && !findAll(spaced, PREF_ALIASES).length) {
    openMap();
    return { say: 'ちずを ひろげたぞ! しりたい けんを タップしてごらん。', face: 'happy', chips: HOME_CHIPS };
  }

  // 日本一
  if (has(t, ['いちばん', '一番', '日本一', 'にっぽんいち', 'にほんいち']) && !findAll(spaced, PREF_ALIASES).length) return record(t);

  // ばしょ(名所)
  const spotHits = findAll(spaced, SPOT_ALIASES);
  const prefHits = findAll(spaced, PREF_ALIASES);
  // 「〇〇けんの △△」のように けんの なまえの ほうが ながい ときは けんを ゆうせん
  if (spotHits.length && !(prefHits.length && prefHits[0].len > spotHits[0].len)) {
    return aboutSpot(spotHits.map((h) => h.a.code));
  }

  // けんの なまえを とりのぞいてから ききたいことを さがす(やまがた の やま を ひろわない)
  let rest = t;
  prefHits.forEach((h) => { rest = rest.split(h.a.w).join(' '); });
  const intent = intentOf(rest);

  if (prefHits.length) {
    const foodHits = findAll(spaced, FOOD_ALIASES);
    return aboutPref(prefHits[0].a.code, foodHits.length && !intent ? 'food' : intent);
  }

  const foodHits = findAll(spaced, FOOD_ALIASES);
  if (foodHits.length) return aboutFood(foodHits);

  const region = REGIONS.find((r) => r.keys.some((k) => t.includes(k)));
  if (region) return aboutRegion(region);

  if (has(t, ['おすすめ', 'どこか', 'らんだむ', 'なんでも', 'てきとう'])) {
    const c = pick(CODES.filter((x) => !save.visited.includes(x)).concat(CODES).slice(0, 47));
    return aboutPref(c, null);
  }
  if (has(t, ['ほかのにっぽんいち', 'ほかの日本一'])) return record('');
  if (/(の)?こと$/.test(t) && state.cur) return aboutPref(state.cur, null);

  if (intent && state.cur) return aboutPref(state.cur, intent);
  if (intent) {
    return { say: pick(LINES.aizuchi) + '\nどこの けんの はなしが ききたい? けんの なまえを いってごらん。', face: 'think', chips: shuffle(CODES).slice(0, 4).map((c) => PREFS[c].k).concat(['ちずを ひらく']) };
  }

  return {
    say: 'ふむ…? わしは ちりの ことなら なんでも しっとるぞ。\n「ほっかいどう」「ふじさん」「りんごは どこ?」のように きいてごらん。',
    face: 'think',
    chips: HOME_CHIPS,
  };
}

/* ============================ こえ・おと ============================ */

let jaVoice = null;
function pickVoice() {
  if (!window.speechSynthesis) return;
  const v = window.speechSynthesis.getVoices();
  jaVoice = v.find((x) => x.lang === 'ja-JP' && /Otoya|Hattori|Ichiro|Keita/i.test(x.name)) ||
    v.find((x) => x.lang === 'ja-JP') || v.find((x) => (x.lang || '').startsWith('ja')) || null;
}
if (window.speechSynthesis) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

function speak(markup) {
  const chara = document.getElementById('chara');
  if (!save.voice || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(forSpeech(markup));
  u.lang = 'ja-JP';
  if (jaVoice) u.voice = jaVoice;
  u.rate = 1.0;
  u.pitch = 0.75;
  u.onstart = () => chara.classList.add('talking');
  u.onend = u.onerror = () => chara.classList.remove('talking');
  window.speechSynthesis.speak(u);
}

let actx = null;
function sfx(kind) {
  if (!save.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const notes = {
      pop: [[660, 0, 0.08]],
      ok: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.25]],
      ng: [[220, 0, 0.18], [185, 0.16, 0.28]],
      map: [[392, 0, 0.1], [523, 0.08, 0.1], [659, 0.16, 0.16]],
    }[kind] || [];
    const now = actx.currentTime;
    notes.forEach(([f, at, len]) => {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = kind === 'ng' ? 'square' : 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + at);
      g.gain.exponentialRampToValueAtTime(kind === 'ng' ? 0.08 : 0.18, now + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + at + len);
      o.connect(g).connect(actx.destination);
      o.start(now + at);
      o.stop(now + at + len + 0.05);
    });
  } catch (e) { /* おとが でなくても あそべる */ }
}

/* ============================ がめん ============================ */

const $ = (id) => document.getElementById(id);

function setFace(face) {
  const ch = $('chara');
  ch.classList.remove('is-happy', 'is-think', 'is-wow', 'bounce');
  if (face) ch.classList.add('is-' + face);
  requestAnimationFrame(() => ch.classList.add('bounce'));
}

function addLog(who, html) {
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.innerHTML = `<span class="who">${who === 't' ? 'ただたか' : 'きみ'}</span>${html}`;
  $('log').appendChild(d);
  $('log').scrollTop = $('log').scrollHeight;
}

function miniMap(target) {
  const paths = PREFECTURES.map((p) => `<path d="${p.path}" fill="${p.code === target ? '#e0443a' : '#c9d6cc'}"/>`).join('');
  const t = PREFECTURES.find((p) => p.code === target);
  const ring = `<circle cx="${t.lx}" cy="${t.ly}" r="70" fill="none" stroke="#e0443a" stroke-width="10" stroke-dasharray="18 10"/>`;
  return `<svg class="mini" viewBox="${MAP_VIEWBOX}" aria-hidden="true">${paths}${ring}</svg>`;
}

function renderChips(r) {
  const box = $('chips');
  box.innerHTML = '';
  if (r.options) {
    r.options.forEach((o) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip opt';
      b.innerHTML = o.html;
      b.dataset.code = o.c;
      b.addEventListener('click', () => {
        if (!state.quiz || state.quiz.done) return;
        addLog('k', o.html);
        show(judge(o.c));
      });
      box.appendChild(b);
    });
    return;
  }
  (r.chips || HOME_CHIPS).forEach((label) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = label;
    b.addEventListener('click', () => send(label));
    box.appendChild(b);
  });
}

function show(r) {
  if (!r) return;
  state.last = r;
  let html = ruby(r.say);
  if (r.mini) html += miniMap(r.mini);
  $('bubble').innerHTML = html;
  $('bubble').scrollTop = 0;
  addLog('t', ruby(r.say));
  setFace(r.face);
  renderChips(r);
  speak(r.say);
  if (r.cur) markCurrent(r.cur);
}

function send(text) {
  const s = String(text).trim();
  if (!s) return;
  sfx('pop');
  addLog('k', esc(s));
  show(reply(s));
  resetIdle();
}

/* ---------- ちず ---------- */

function buildMap() {
  const svg = $('mapSvg');
  svg.setAttribute('viewBox', MAP_VIEWBOX);
  svg.innerHTML = `<rect x="${OKI_FRAME.x}" y="${OKI_FRAME.y}" width="${OKI_FRAME.w}" height="${OKI_FRAME.h}" fill="none" stroke="#9bb" stroke-dasharray="6 6" rx="10"/>` +
    PREFECTURES.map((p) => `<path data-code="${p.code}" d="${p.path}"><title>${p.name}</title></path>`).join('');
  svg.addEventListener('click', (e) => {
    const el = e.target.closest('path[data-code]');
    if (!el) return;
    const c = Number(el.dataset.code);
    closeMap();
    sfx('pop');
    addLog('k', ruby(prefName(c)));
    show(aboutPref(c, null));
    resetIdle();
  });
}
function paintMap() {
  $('mapSvg').querySelectorAll('path[data-code]').forEach((el) => {
    const c = Number(el.dataset.code);
    el.setAttribute('fill', regionOf(c).color);
    el.setAttribute('fill-opacity', save.visited.includes(c) ? '1' : '.32');
    el.classList.toggle('cur', c === state.cur);
  });
}
function markCurrent() { paintMap(); }
function openMap() { paintMap(); $('mapModal').hidden = false; sfx('map'); }
function closeMap() { $('mapModal').hidden = true; }
function updateStamp() { $('stampCount').textContent = `${save.visited.length}/47`; }

/* ---------- こえで はなす ---------- */

function setupMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = $('btnMic');
  if (!SR) { btn.hidden = true; return; }
  let rec = null;
  btn.addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    rec = new SR();
    rec.lang = 'ja-JP';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    btn.classList.add('on');
    rec.onresult = (e) => send(e.results[0][0].transcript);
    rec.onerror = () => {};
    rec.onend = () => { btn.classList.remove('on'); rec = null; };
    try { rec.start(); } catch (e) { btn.classList.remove('on'); rec = null; }
  });
}

/* ---------- だまっていると はなしかけてくる ---------- */

let idleTimer = null;
function resetIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (state.quiz && !state.quiz.done) return;
    if (!$('mapModal').hidden) return;
    const c = pick(CODES);
    state.cur = c;
    show({
      say: `そうそう、${prefName(c)}の はなしを しっとるか?\n💡${pick(PREFS[c].mame)}`,
      face: 'wow',
      chips: [PREFS[c].k + 'の こと', 'クイズ', 'おすすめの けん'],
      cur: c,
    });
  }, 45000);
}

/* ---------- はじまり ---------- */

function toggle(btn, key) {
  save[key] = !save[key];
  btn.setAttribute('aria-pressed', String(save[key]));
  writeSave();
  if (key === 'voice' && !save[key] && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    $('chara').classList.remove('talking');
  }
}

function init() {
  loadSave();
  $('btnVoice').setAttribute('aria-pressed', String(save.voice));
  $('btnSound').setAttribute('aria-pressed', String(save.sound));
  $('btnVoice').addEventListener('click', () => toggle($('btnVoice'), 'voice'));
  $('btnSound').addEventListener('click', () => toggle($('btnSound'), 'sound'));
  $('btnMap').addEventListener('click', openMap);
  $('btnMapClose').addEventListener('click', closeMap);
  $('mapModal').addEventListener('click', (e) => { if (e.target === $('mapModal')) closeMap(); });
  $('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('text').value;
    $('text').value = '';
    send(v);
  });
  buildMap();
  updateStamp();
  setupMic();

  const first = save.visited.length === 0;
  const r = {
    say: first
      ? 'やあ! わしは ちりはかせの ただたか じゃ。\nにっぽんじゅうを あるいて ちずを つくって きた。\n47の [都道府県|とどうふけん]の ゆうめいな ばしょ・めいさん・ちりなら なんでも きいとくれ!'
      : `おかえり! これまでに ${save.visited.length}の [都道府県|とどうふけん]を いっしょに たんけん したのう。\nきょうは どこへ いこうか?`,
    face: 'happy',
    chips: HOME_CHIPS,
  };
  // さいしょの よみあげは ブラウザが とめるので、ふきだしだけ
  state.last = r;
  $('bubble').innerHTML = ruby(r.say);
  addLog('t', ruby(r.say));
  setFace('happy');
  renderChips(r);
  resetIdle();
}

if (typeof document !== 'undefined' && document.getElementById('chara')) init();
