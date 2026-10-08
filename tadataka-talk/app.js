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
const save = { visited: [], voice: true, sound: true, mode: 'mono' };

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
const AFTER = '(?:けん|ふ|と|の|って|は|に|で|へ|を|から|まで|が|も|や|と|じゃ|だ|です|$|[^ぁ-ん])';
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

// ID は「けんコード×100+ばんごう」
const ID = (c, i) => c * 100 + i;
const idPref = (id) => Math.floor(id / 100);
const idIdx = (id) => id % 100;

// ばしょ(名所)
const SPOT_ALIASES = [];
const SPOT_EXTRA = {
  'でぃずにー': [12, 0], 'ゆーえすじぇー': [27, 2], 'usj': [27, 2], 'ゆにばーさる': [27, 2],
  'すかいつりー': [13, 0], 'なまはげ': [5, 2], 'ひこにゃん': [25, 1], 'くまもん': [43, 1],
  'ぱんだ': [30, 3], 'じんべえざめ': [47, 1], 'しか': [29, 1], 'ねぶた': [2, 3], 'りにあ': [23, 1],
  'うずしお': [36, 0], 'すなむし': [46, 2], 'もあい': [45, 3], 'ろけっと': [46, 3],
  'きょうりゅう': [18, 0], 'がっしょうづくり': [21, 0], 'げんばくどーむ': [34, 1],
};
// なまえから さがす ことばを つくる(かんじ・かな、「の」で きった ところも)
function nameKeys(markup, min) {
  const names = new Set();
  [kanjiOf(markup), toHira(kanaOf(markup))].forEach((full) => {
    const f = compact(full).replace(/[「」()（）]/g, '');
    names.add(f);
    f.split('の').forEach((seg) => { if (seg.length >= 3 && seg !== f) names.add(seg); });
  });
  return [...names].filter((w) => w.length >= (min || 2));
}
CODES.forEach((c) => {
  PREFS[c].spot.forEach((s, i) => nameKeys(s[0]).forEach((w) => addAlias(w, ID(c, i), SPOT_ALIASES)));
});
Object.keys(SPOT_EXTRA).forEach((w) => addAlias(w, ID(SPOT_EXTRA[w][0], SPOT_EXTRA[w][1]), SPOT_ALIASES));

// めいさん
const FOOD_ALIASES = [];
function foodTerms(name) {
  const k = compact(toHira(kanaOf(name)));
  const terms = new Set([k]);
  k.split(/[・()（）の]/).forEach((t) => { if (t.length >= 2) terms.add(t); });
  return [...terms];
}
CODES.forEach((c) => {
  // 「こうちの おさけ」の「こうち」のような けんの なまえは つかわない
  PREFS[c].food.forEach((f, i) => foodTerms(f[1]).filter((t) => !PREF_ALIASES.some((a) => a.w === t)).forEach((t) => addAlias(t, ID(c, i), FOOD_ALIASES)));
});

// まち・ひと・まつり・てつどう・しぜん の なまえ
const KIND_ALIASES = { city: [], hito: [], matsuri: [], rail: [], shizen: [], chimei: [] };
const CITY_NG = ['あき', 'かみ', 'あや', 'ふじ', 'つる', 'こが', 'さの', 'ひた', 'いな', 'みね', 'くれ', 'むつ', 'つ', 'おおの'];
CODES.forEach((c) => {
  (PREFS[c].city || []).forEach((s, i) => {
    const kana = toHira(kanaOf(s[0]));
    const base = kana.replace(/(し|まち|ちょう|むら|く)$/, '');
    [kanjiOf(s[0]), kanjiOf(s[0]).replace(/[市町村区]$/, ''), kana, base].forEach((w) => {
      if (w.length >= 2 && !CITY_NG.includes(w)) addAlias(w, ID(c, i), KIND_ALIASES.city);
    });
  });
  ['hito', 'matsuri', 'rail', 'shizen'].forEach((k) => {
    (PREFS[c][k] || []).forEach((s, i) => nameKeys(s[0], k === 'shizen' ? 3 : 4).forEach((w) => addAlias(w, ID(c, i), KIND_ALIASES[k])));
  });
  // ちめいは かんじ(2もじいじょう)と よみ(3もじいじょう)
  (PREFS[c].chimei || []).forEach((s, i) => {
    const kj = kanjiOf(s[0]);
    const kn = toHira(kanaOf(s[0]));
    if (kj.length >= 2) addAlias(kj, ID(c, i), KIND_ALIASES.chimei);
    if (kn.length >= 3) addAlias(kn, ID(c, i), KIND_ALIASES.chimei);
  });
});

/* ============================ ききたいこと ============================ */

const INTENTS = [
  ['quiz', ['くいず', 'もんだい', '問題']],
  ['map', ['ちず', '地図', 'まっぷ']],
  ['nb', ['となり', '隣', 'りんせつ']],
  ['cap', ['けんちょう', 'しょざいち', '県庁', '所在地', 'ふちょう', 'とちょう', 'どうちょう', '府庁', '都庁']],
  ['stats', ['ひとがおおい', 'ひとがすくない', 'ひとはなんにん', 'じんこう', '人口', 'ひとのかず', 'なんにん', '何人', 'めんせき', '面積', 'ひろさ', '広さ', 'おおきさ', 'ひろい', 'せまい']],
  ['rail', ['でんしゃ', '電車', 'えき', '駅', 'てつどう', '鉄道', 'しんかんせん', '新幹線', 'れっしゃ', '列車', 'とっきゅう', '特急', 'ろせん', '路線', 'sl']],
  ['matsuri', ['まつり', '祭', 'ぎょうじ', '行事', 'おどり']],
  ['chimei', ['なんどく', '難読', 'よめるかな', 'よめない', 'よみかた', 'ちめい', '地名']],
  ['hogen', ['ほうげん', '方言', 'ことば', '言葉', 'なまり']],
  ['sym', ['けんのはな', 'けんのき', 'けんのとり', '県の花', '県の木', '県の鳥', 'のはな', 'のとり', 'しんぼる', 'ふのはな', 'とのはな']],
  ['hito', ['じんぶつ', '人物', 'ゆうめいじん', '有名人', 'いじん', '偉人', 'ぶしょう', '武将', 'ゆかり', 'ひと', '人']],
  ['rekishi', ['れきし', '歴史', 'むかし', '昔', 'じだい', '時代']],
  ['city', ['まち', '町', 'とし', '都市', 'しちょうそん', '市町村']],
  ['food', ['めいさん', '名産', 'たべもの', '食べ', 'おいしい', '美味しい', 'ぐるめ', 'とくさん', '特産', 'めいぶつ', '名物', 'つくって', 'とれる', 'さんち', 'こうげい', '工芸', 'おみやげ']],
  ['spot', ['ゆうめい', '有名', 'ばしょ', '場所', 'かんこう', '観光', 'みどころ', '見所', 'いきたい', '行きたい', 'おでかけ', 'あそび', 'ところ', '所']],
  ['shizen', ['やま', '山', 'かわ', '川', 'みずうみ', '湖', 'しま', '島', 'みさき', '岬', 'たき', '滝']],
  ['geo', ['ちり', '地理', 'ちけい', '地形', 'うみ', '海', 'きこう', '気候', 'てんき', '天気', 'ゆき', '雪', 'はんとう', '半島', 'へいや', '平野', 'ぼんち', '盆地']],
  ['mame', ['まめちしき', '豆知識', 'ひみつ', '秘密', 'もっと', 'ほかに', '他に', 'へぇ', 'すごい', 'つづき']],
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
  next: ['なにを ききたい?', 'ほかにも きいてみるか?', 'もっと しりたいことは あるかの?', '「もっと」と いえば つづきを はなすぞ。'],
};
const fill = (s, o) => s.replace(/\{(\w)\}/g, (_, k) => o[k]);

/* ============================ こたえを つくる ============================ */

const state = { cur: null, quiz: null, last: null, lastCat: null, seen: {} };

const PREF_TOPICS = ['よめるかな?', 'ゆうめいな ばしょ', 'めいさん', 'ちり', 'やまと かわ', 'まち', 'まつり', 'でんしゃ', 'ゆかりの ひと', 'ほうげん', 'れきし', 'けんの はな', 'ひろさと じんこう', 'となりの けん', 'まめちしき'];
const HOME_TOPICS = ['なんどく ちめい', 'おすすめの けん', '日本一を おしえて', 'せかいいさん', 'ちずきごう', 'しんかんせん', '日本三景', 'たかい やま ランキング', 'りんごは どこ?', 'ちずの みかた', 'ただたかって だれ?', 'さかもとりょうま', 'かいりゅう'];
// さいごは かならず「クイズ」
const prefChips = (extra = []) => extra.concat(shuffle(PREF_TOPICS).slice(0, 5 - extra.length), ['クイズ']);
const homeChips = () => (save.mode === 'juken'
  ? ['クイズ'].concat(shuffle(JUKEN_HOME).slice(0, 5))
  : ['クイズ', 'ちずを ひらく'].concat(shuffle(HOME_TOPICS).slice(0, 3), ['中学受験モード']));

// まだ はなしていない ものから じゅんばんに n こ えらぶ(「もっと」で つづきが でる)
function rotate(key, arr, n) {
  const seen = state.seen[key] || (state.seen[key] = []);
  let left = arr.map((_, i) => i).filter((i) => !seen.includes(i));
  if (!left.length) { seen.length = 0; left = arr.map((_, i) => i); }
  const out = shuffle(left).slice(0, n);
  seen.push(...out);
  return out.map((i) => arr[i]);
}

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
  const extra = pick([
    p.city && p.city.length ? `おもな まちは ${p.city.slice(0, 3).map((x) => x[0]).join('・')}。` : '',
    p.matsuri && p.matsuri.length ? `「${p.matsuri[0][0]}」という おまつりも ある。` : '',
    p.sym ? `けんの はなは ${p.sym[0]}、けんの とりは ${p.sym[2]}。` : '',
  ].filter(Boolean)) || '';
  return [
    fill(pick(LINES.open), { n: prefName(c) }),
    `${regionOf(c).n}の なかまで、${capWord(c)}は ${capName(c)}。`,
    pick(p.geo),
    `ゆうめいな ばしょは ${s[0][0]}や ${s[1][0]}。`,
    `めいさんは ${shuffle(p.food).slice(0, 3).map((f) => f[0] + f[1]).join('、')}。`,
    extra,
    pick(LINES.next),
  ].filter(Boolean).join('\n');
}

function rankOf(c, col, desc) {
  const sorted = CODES.slice().sort((a, b) => (desc ? STATS[b][col] - STATS[a][col] : STATS[a][col] - STATS[b][col]));
  return sorted.indexOf(c) + 1;
}

const CAT_HEAD = {
  spot: ['ゆうめいな ばしょを しょうかい しよう!', '📍'],
  food: ['めいさんは これじゃ!', ''],
  geo: ['ちりを おしえよう。', '🧭'],
  shizen: ['やま・かわ・みずうみ じゃ。', '⛰️'],
  city: ['おもな まちを しょうかい しよう。', '🏙️'],
  matsuri: ['まつりと ぎょうじ じゃ。', '🏮'],
  rail: ['でんしゃと えきの はなし じゃ!', '🚃'],
  hito: ['ゆかりの ひとを しょうかい しよう。', '👤'],
  hogen: ['ほうげんを おしえよう。', '🗣️'],
  rekishi: ['れきしを ふりかえろう。', '📜'],
  chimei: ['よみかたが むずかしい ちめい じゃ。よめるかな?', '🔤'],
};
const CAT_N = { spot: 5, food: 5, geo: 4, shizen: 4, city: 5, matsuri: 4, rail: 4, hito: 4, hogen: 5, rekishi: 8, chimei: 3 };

function catLine(cat, x) {
  if (cat === 'food') return `${x[0]}${x[1]}… ${x[2]}`;
  if (cat === 'geo' || cat === 'rekishi') return CAT_HEAD[cat][1] + x;
  if (cat === 'hogen') return `🗣️「${x[0]}」… ${x[1]}`;
  if (cat === 'chimei') return `🔤${kanjiOf(x[0])} … 「${kanaOf(x[0])}」と よむ。${x[1]}`;
  return `${CAT_HEAD[cat][1]}${x[0]}… ${x[1]}`;
}

function aboutPref(c, intent) {
  const p = PREFS[c];
  state.cur = c;
  visit(c);
  const name = prefName(c);
  let say;
  let chips = prefChips();
  let face = 'happy';
  state.lastCat = null;
  if (CAT_HEAD[intent]) {
    const list = p[intent] || [];
    if (!list.length) {
      say = `${name}の その はなしは まだ しらべちゅう じゃ。ほかの ことを きいとくれ。`;
    } else {
      const items = intent === 'rekishi' ? list : rotate(`${c}:${intent}`, list, CAT_N[intent]);
      say = `${name}の ${CAT_HEAD[intent][0]}\n` + items.map((x) => catLine(intent, x)).join('\n');
      if (list.length > CAT_N[intent] && intent !== 'rekishi') {
        say += '\n(「もっと」で つづきを はなすぞ)';
        chips = prefChips(['もっと']);
      }
      state.lastCat = intent;
    }
    face = intent === 'geo' || intent === 'rekishi' ? 'think' : intent === 'hogen' ? 'wow' : 'happy';
    return { say, chips, face, cur: c };
  }
  switch (intent) {
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
    case 'stats': {
      const [area, pop] = STATS[c];
      say = `${name}の ひろさは やく ${area.toLocaleString()} へいほうキロメートル。ひろい じゅんで ${rankOf(c, 0, true)}ばんめ。\n` +
        `ひとは やく ${pop}まんにん。おおい じゅんで ${rankOf(c, 1, true)}ばんめ じゃ。`;
      face = 'think';
      break;
    }
    case 'sym':
      say = p.sym ? `${name}の シンボル じゃ。\n🌸けんの はな… ${p.sym[0]}\n🌳けんの き… ${p.sym[1]}\n🐦けんの とり… ${p.sym[2]}` : `${name}の シンボルは しらべちゅう じゃ。`;
      break;
    case 'mame': {
      const all = p.mame.concat(p.geo.slice(-1));
      say = `${name}の まめちしき じゃ。\n💡` + rotate(`${c}:mame`, all, 1)[0];
      face = 'wow';
      chips = prefChips(['もっと']);
      state.lastCat = 'mame';
      break;
    }
    default:
      say = overview(c);
  }
  return { say, chips, face, cur: c };
}

function aboutSpot(codes) {
  const items = [...new Set(codes)].map((id) => ({ c: idPref(id), s: PREFS[idPref(id)].spot[idIdx(id)] }));
  // おなじ なまえ(ふじさん・しまなみかいどう)は まとめる
  const byName = {};
  items.forEach((it) => { (byName[kanaOf(it.s[0])] = byName[kanaOf(it.s[0])] || []).push(it); });
  const lines = [pick(LINES.aizuchi)];
  Object.values(byName).slice(0, 4).forEach((list) => {
    const prefs = [...new Set(list.map((it) => it.c))].map(prefName).join('と ');
    lines.push(`📍${list[0].s[0]}は ${prefs}に ある。${list[0].s[1]}`);
  });
  const c = items[0].c;
  state.cur = c;
  items.forEach((it) => visit(it.c));
  return { say: lines.join('\n'), face: 'wow', chips: [PREFS[c].k + 'の こと', 'ゆうめいな ばしょ', 'めいさん', 'クイズ'], cur: c };
}

// まち・ひと・まつり・てつどう・しぜん
const KIND_WORD = { chimei: ['🔤', 'の ちめい'], city: ['🏙️', 'の まち'], hito: ['👤', 'に ゆかりの ある ひと'], matsuri: ['🏮', 'の まつり'], rail: ['🚃', 'の てつどう'], shizen: ['⛰️', 'に ある'] };
function aboutKind(kind, ids) {
  const items = [...new Set(ids)].map((id) => ({ c: idPref(id), x: PREFS[idPref(id)][kind][idIdx(id)] }));
  const byName = {};
  items.forEach((it) => { (byName[kanaOf(it.x[0])] = byName[kanaOf(it.x[0])] || []).push(it); });
  const lines = [pick(LINES.aizuchi)];
  Object.values(byName).slice(0, 3).forEach((list) => {
    const prefs = [...new Set(list.map((it) => it.c))];
    const [e, w] = KIND_WORD[kind];
    lines.push(kind === 'chimei' ? `${e}${kanjiOf(list[0].x[0])}は「${kanaOf(list[0].x[0])}」と よむ。${prefs.map(prefName).join('・')}${w}。` : `${e}${list[0].x[0]}は ${prefs.map(prefName).join('・')}${w}。`);
    list.slice(0, 2).forEach((it) => { if (it.x[1]) lines.push(`… ${it.x[1]}`); });
  });
  const c = items[0].c;
  state.cur = c;
  items.forEach((it) => visit(it.c));
  return { say: lines.join('\n'), face: kind === 'hito' ? 'happy' : 'wow', chips: prefChips([PREFS[c].k + 'の こと']), cur: c };
}

function aboutFood(hits) {
  const terms = {};
  hits.forEach((h) => { (terms[h.a.w] = terms[h.a.w] || new Set()).add(h.a.code); });
  // いちばん ながい ことばで さがす
  const word = Object.keys(terms).sort((a, b) => b.length - a.length)[0];
  const ids = [...terms[word]];
  const top = (id) => /日本一/.test(PREFS[idPref(id)].food[idIdx(id)][2]);
  ids.sort((a, b) => top(b) - top(a));
  const lines = [pick(LINES.aizuchi)];
  const seen = new Set();
  ids.forEach((id) => {
    const c = idPref(id);
    if (seen.has(c) || seen.size >= 6) return;
    seen.add(c);
    const f = PREFS[c].food[idIdx(id)];
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
    chips: r.p.slice(0, 3).map((c) => PREFS[c].k).concat(['ほかの 日本一', 'ランキング', 'クイズ']),
    cur: r.p[0],
  };
}

/* ---------- にっぽん ぜんたいの はなし ---------- */

function ranking(t) {
  let cat = null;
  if (has(t, ['やま', '山'])) cat = 'yama';
  else if (has(t, ['かわ', '川'])) cat = 'kawa';
  else if (has(t, ['みずうみ', '湖'])) cat = 'mizuumi';
  else if (has(t, ['しま', '島'])) cat = 'shima';
  if (cat) {
    const r = RANKING[cat];
    return { say: `🏆${r.t} ランキング じゃ!\n` + r.items.map((x, i) => `${i + 1}い ${x}`).join('\n'), face: 'wow', chips: ['たかい やま ランキング', 'ながい かわ ランキング', 'おおきい みずうみ ランキング', 'おおきい しま ランキング', 'ひろい けん ランキング', 'クイズ'] };
  }
  const people = has(t, ['ひと', '人', 'じんこう']);
  const small = has(t, ['せまい', 'ちいさい', 'すくない', '少ない', '狭い']);
  const col = people ? 1 : 0;
  const sorted = CODES.slice().sort((a, b) => (small ? STATS[a][col] - STATS[b][col] : STATS[b][col] - STATS[a][col])).slice(0, 10);
  const title = people ? (small ? 'ひとが すくない けん' : 'ひとが おおい けん') : (small ? 'せまい けん' : 'ひろい けん');
  return {
    say: `🏆${title} ランキング じゃ!\n` + sorted.map((c, i) => `${i + 1}い ${prefName(c)}(${people ? `やく ${STATS[c][1]}まんにん` : `${STATS[c][0].toLocaleString()}へいほうキロ`})`).join('\n'),
    face: 'wow',
    chips: ['ひとが おおい けん ランキング', 'せまい けん ランキング', 'ひとが すくない けん ランキング', 'たかい やま ランキング', 'クイズ'],
  };
}

function nippon(t) {
  if (has(t, ['せかいいさん', '世界遺産'])) {
    const items = rotate('isan', SEKAI_ISAN, 6);
    return {
      say: `日本の せかいいさんは ${SEKAI_ISAN.length}こ ある(2025ねん)。いくつか しょうかい しよう。\n` +
        items.map((x) => `🌏${x[0]}(${x[2].slice(0, 3).map(prefName).join('・')}${x[2].length > 3 ? 'など' : ''})… ${x[1]}`).join('\n'),
      face: 'wow', chips: ['もっと せかいいさん', 'クイズ', '日本三景', 'ちずきごう'],
    };
  }
  if (has(t, ['ちずきごう', '地図記号', 'きごう'])) {
    const named = CHIZU_KIGO.filter((k) => compact(k[0]).split(/[(・)]/).some((w) => w.length >= 2 && t.includes(w)));
    const items = named.length ? named.slice(0, 3) : rotate('kigo', CHIZU_KIGO, 5);
    return {
      say: (named.length ? '' : 'ちずきごうを おしえよう。\n') + items.map((k) => `🗺️${k[0]}… かたちは ${k[1]}。${k[2]}`).join('\n'),
      kigo: items,
      face: 'think', chips: ['もっと ちずきごう', 'ちずの みかた', 'クイズ', 'せかいいさん'],
    };
  }
  if (has(t, ['しんかんせん', '新幹線'])) {
    const named = SHINKANSEN.filter((s) => t.includes(toHira(kanaOf(s[0])).replace('しんかんせん', '')) || has(t, s[2].match(/「[^」]+」/g).map((x) => x.slice(1, -1))));
    const items = named.length ? named : SHINKANSEN;
    return {
      say: named.length ? items.map((s) => `🚄${s[0]}… ${s[1]}。${s[2]}`).join('\n')
        : `日本の しんかんせんは ${SHINKANSEN.length}ろせん!\n` + items.map((s) => `🚄${s[0]}(${s[1]})`).join('\n') + '\nきに なる しんかんせんの なまえを いってごらん。',
      face: 'wow', chips: ['とうかいどうしんかんせん', 'とうほくしんかんせん', 'こまち', 'クイズ'],
    };
  }
  if (has(t, ['さんだい', '三大', 'さんけい', '三景', 'さんめい', '三名', 'さんれい', '三霊', 'さんこ'])) {
    const named = SANDAI.filter((s) => {
      const k = toHira(kanaOf(s[0])).replace(/^にほん|^とうほく/, '');
      return t.includes(k) || t.includes(kanjiOf(s[0]).replace(/^日本|^東北/, ''));
    });
    const items = named.length ? named.slice(0, 2) : rotate('sandai', SANDAI, 4);
    return {
      say: items.map((s) => `🥇${s[0]}… ${s[1].join('、')}`).join('\n'),
      face: 'wow', chips: ['ほかの 三大', '日本三景', '日本三名園', 'クイズ'],
    };
  }
  if (has(t, ['なんどく', '難読', 'よめるかな', 'よめない', 'ちめい', '地名'])) {
    const all = [];
    CODES.forEach((c) => (PREFS[c].chimei || []).forEach((x) => all.push([c, x])));
    const items = rotate('chimei-all', all, 4);
    return {
      say: 'よみかたが むずかしい ちめいを しょうかい しよう。よめるかな?\n' + items.map(([c, x]) => `🔤${kanjiOf(x[0])} … 「${kanaOf(x[0])}」(${prefName(c)})`).join('\n'),
      face: 'wow', chips: ['もっと なんどく ちめい', 'クイズ', 'せかいいさん', 'ちずきごう'],
    };
  }
  const topic = CHIRI_TOPICS.find((x) => has(t, x.keys));
  if (topic) {
    const items = topic.items.length > 6 ? rotate(topic.t, topic.items, 6) : topic.items;
    return { say: `${topic.t}\n` + items.map((x) => `・${x}`).join('\n'), face: 'think', chips: homeChips() };
  }
  return null;
}

/* ============================ モード(ものしり / 中学受験) ============================ */

const MODES = {
  mono: { name: 'ものしりモード', icon: '🧭', short: 'ものしり' },
  juken: { name: '中学受験モード', icon: '🎓', short: 'じゅけん' },
};
const isJuken = () => save.mode === 'juken';

function modeIntro() {
  return isJuken()
    ? {
      say: '🎓[中学受験|ちゅうがくじゅけん]モード じゃ!\n[入試|にゅうし]に でる [用語|ようご]を [中心|ちゅうしん]に はなすぞ。\n「[促成栽培|そくせいさいばい]」「[中京工業地帯|ちゅうきょうこうぎょうちたい]」のような [用語|ようご]や、[県|けん]の なまえを いってごらん。クイズも [入試|にゅうし]むけに なる。',
      face: 'wow', chips: homeChips(),
    }
    : {
      say: '🧭ものしりモード じゃ!\nけんの ゆうめいな ばしょ・めいさん・まめちしきを たっぷり はなすぞ。',
      face: 'happy', chips: homeChips(),
    };
}

function setMode(m) {
  save.mode = MODES[m] ? m : 'mono';
  writeSave();
  state.quiz = null;
  state.lastCat = null;
  state.jukenCat = null;
  if (typeof updateModeBtn === 'function') updateModeBtn();
  return modeIntro();
}

/* ---------- 受験の ようご ---------- */

const TERM_ALIASES = [];
JUKEN_TERMS.forEach((x, i) => {
  const names = new Set();
  [kanjiOf(x.t), toHira(kanaOf(x.t))].forEach((full) => {
    const f = compact(full);
    names.add(f.replace(/\([^)]*\)/g, ''));
    (f.match(/\(([^)]+)\)/g) || []).forEach((m) => names.add(m.slice(1, -1)));
  });
  names.forEach((w) => { if (w.length >= 2) addAlias(w, i, TERM_ALIASES); });
});

const JUKEN_CAT_KEYS = {
  chikei: ['ちけい', '地形'],
  kiko: ['きこう', '気候'],
  nogyo: ['のうぎょう', '農業', 'さいばい', '栽培'],
  gyogyo: ['ぎょぎょう', '漁業', 'すいさん', '水産'],
  kogyo: ['こうぎょう', '工業'],
  kogai: ['こうがい', '公害', 'かんきょう', '環境'],
  jinko: ['じんこう', '人口', 'くらし'],
  kotsu: ['こうつう', '交通', 'えねるぎー', 'はつでん', '発電'],
  ryodo: ['りょうど', '領土', 'ちけいず', '地形図', 'しゅくしゃく'],
};
const JUKEN_HOME = ['促成栽培', '扇状地', 'リアス海岸', '中京工業地帯', '四大公害病', '気候区分', '生産量ランキング', 'やませ', '近郊農業', '排他的経済水域', '地図記号', '工業の用語', '農業の用語', '地形の用語', '水産業の用語'];

const firstSentence = (s) => s.split('。')[0] + '。';
// 「四大公害病の ひとつ。」のように みじかすぎる ときは 2ぶんめまで
const defLabel = (y) => {
  const s = y.d.split('。').filter(Boolean);
  return (kanaOf(s[0]).length < 16 && s[1] ? `${s[0]}。${s[1]}` : s[0]) + '。';
};
function termLine(x) {
  return `📘${x.t}… ${x.d}` + (x.ex ? `\n　[例|れい]: ${x.ex}` : '');
}

function explainTerm(i) {
  const x = JUKEN_TERMS[i];
  state.jukenCat = x.c;
  state.lastCat = null;
  x.p.forEach(visit);
  if (x.p.length) state.cur = x.p[0];
  const rel = x.p.length ? `\n[関係|かんけい]する [都道府県|とどうふけん]: ${x.p.map(prefName).join('・')}` : '';
  const same = shuffle(JUKEN_TERMS.filter((y) => y.c === x.c && y !== x)).slice(0, 3).map((y) => kanjiOf(y.t).replace(/\(.*\)/, ''));
  return { say: termLine(x) + rel, face: 'think', chips: same.concat(['もっと', 'クイズ']), cur: x.p[0] || null };
}

function jukenCategory(cat) {
  const list = JUKEN_TERMS.filter((x) => x.c === cat);
  const items = rotate('jk:' + cat, list, 3);
  state.jukenCat = cat;
  state.lastCat = null;
  return {
    say: `${JUKEN_CATS[cat]}で [入試|にゅうし]に でる [用語|ようご] じゃ。\n` + items.map(termLine).join('\n') + '\n(「もっと」で つづき)',
    face: 'think',
    chips: ['もっと'].concat(shuffle(Object.keys(JUKEN_CATS).filter((k) => k !== cat)).slice(0, 3).map((k) => kanjiOf(JUKEN_CATS[k]).split('・')[0] + 'の用語'), ['クイズ']),
  };
}

const rankLine = (r) => `🏅${r[0]}… ` + r[1].map((c, i) => `${i + 1}[位|い] ${prefName(c)}`).join('、');
function rankNamed(t) {
  return JUNKEN_RANK_KEYS.filter(([, keys]) => keys.some((k) => t.includes(k))).map(([r]) => r);
}
const JUNKEN_RANK_KEYS = JUKEN_RANK.map((r) => {
  const kana = compact(toHira(kanaOf(r[0]))).replace(/\(.*$/, '');
  const kanji = kanjiOf(r[0]).replace(/\(.*$/, '');
  return [r, [kana, kanji].filter((k) => k.length >= 2 || /[一-龥]/.test(k))];
});
function jukenRank(t) {
  const named = rankNamed(t);
  const items = named.length ? named : rotate('rank', JUKEN_RANK, 6);
  return {
    say: (named.length ? '' : '[生産量|せいさんりょう]などの [上位|じょうい]の [都道府県|とどうふけん] じゃ。[入試|にゅうし]に よく でるぞ。\n') +
      items.map(rankLine).join('\n') + '\n(2[位|い]より [下|した]は [年|とし]によって かわる ことも ある)',
    face: 'wow',
    chips: ['もっと 生産量', 'クイズ', '工業の用語', '農業の用語'],
  };
}

function jukenClimate() {
  return {
    say: '[日本|にほん]の 6つの [気候区分|きこうくぶん] じゃ。[雨温図|うおんず]と いっしょに おぼえよう。\n' +
      Object.values(CLIMATE6).map((x) => `🌦️${x.t}([例|れい]: ${x.city})… ${x.d}`).join('\n'),
    face: 'think', chips: ['雨温図', 'やませ', '季節風', 'クイズ'],
  };
}

function jukenPref(c) {
  state.cur = c;
  visit(c);
  state.lastCat = null;
  state.jukenCat = null;
  const cl = CLIMATE6[CLIMATE_OF[c]];
  const ranks = JUKEN_RANK.filter((r) => r[1].includes(c)).map((r) => `${r[0]} ${r[1].indexOf(c) + 1}[位|い]`);
  const zones = JUKEN_TERMS.filter((x) => x.c === 'kogyo' && /工業地[帯域]/.test(kanjiOf(x.t)) && x.p.includes(c));
  const terms = JUKEN_TERMS.filter((x) => x.p.includes(c) && !zones.includes(x));
  const lines = [
    `【${prefName(c)}】${regionOf(c).n}。${capWord(c)}は ${capName(c)}。`,
    `🌦️[気候|きこう]: ${cl.t}。${cl.d}`,
    ranks.length ? `🏅[生産|せいさん]など: ${ranks.join('、')}` : '',
    zones.length ? `🏭[工業|こうぎょう]: ${zones.map((z) => z.t).join('・')}` : '',
    terms.length ? `📝[関係|かんけい]する [用語|ようご]: ${terms.slice(0, 6).map((x) => x.t).join('・')}` : `🧭${pick(PREFS[c].geo)}`,
  ].filter(Boolean);
  return {
    say: lines.join('\n'),
    face: 'think',
    chips: terms.slice(0, 3).map((x) => kanjiOf(x.t).replace(/\(.*\)/, '')).concat([PREFS[c].k + 'の めいさん', 'クイズ']),
    cur: c,
  };
}

function jukenReply(t, spaced, prefHits) {
  if (!isJuken()) return null;
  const prefLen = prefHits.length ? Math.max(...prefHits.map((h) => h.len)) : 0;
  if (!prefHits.length && (has(t, ['せいさんりょう', '生産量', 'しゅうかくりょう', '収穫量', 'しいくすう', '飼育数']) ||
    (rankNamed(t).length && has(t, ['いちい', '1い', '一位', 'どこ', 'おおい', '多い', 'じょうい', '上位'])))) return jukenRank(t);
  const th = findAll(spaced, TERM_ALIASES).sort((a, b) => b.len - a.len);
  if (th.length && th[0].len >= prefLen) return explainTerm(th[0].a.code);
  if (has(t, ['きこうくぶん', '気候区分', '6つのきこう'])) return jukenClimate();
  if (!prefHits.length) {
    const cat = Object.keys(JUKEN_CAT_KEYS).find((k) => has(t, JUKEN_CAT_KEYS[k]));
    if (cat) return jukenCategory(cat);
  }
  if (prefHits.length) {
    let rest = t;
    prefHits.forEach((h) => { rest = rest.split(h.a.w).join(' '); });
    if (!intentOf(rest)) return jukenPref(prefHits[0].a.code);
  }
  return null;
}

/* ---------- 受験の クイズ ---------- */

function makeJukenQuiz(jt) {
  if (jt === 'term') {
    const pool = JUKEN_TERMS.filter((x) => !kanjiOf(x.d).includes(kanjiOf(x.t).replace(/\(.*\)/, '')));
    const x = pick(pool);
    const same = JUKEN_TERMS.filter((y) => y.c === x.c && y !== x);
    const wrong = shuffle(same.length >= 2 ? same : JUKEN_TERMS.filter((y) => y !== x)).slice(0, 2);
    return finishQuiz({ q: `📘「${firstSentence(x.d)}」\nこれを なんと いう?`, a: x, opts: wrong, label: (y) => y.t, explain: termLine(x), kind: 'other' });
  }
  if (jt === 'def') {
    const x = pick(JUKEN_TERMS);
    const same = JUKEN_TERMS.filter((y) => y.c === x.c && y !== x);
    const wrong = [];
    shuffle(same).concat(shuffle(JUKEN_TERMS)).forEach((y) => {
      if (wrong.length < 2 && y !== x && ![x].concat(wrong).some((z) => defLabel(z) === defLabel(y))) wrong.push(y);
    });
    return finishQuiz({ q: `📘「${x.t}」の [説明|せつめい]として [正|ただ]しいのは?`, a: x, opts: wrong, label: defLabel, explain: termLine(x), kind: 'other' });
  }
  if (jt === 'rank') {
    const r = pick(JUKEN_RANK);
    const a = r[1][0];
    return finishQuiz({ q: `🏅「${r[0]}」が [日本一|にっぽんいち]の [都道府県|とどうふけん]は?`, a, opts: others(a, 2, (c) => !r[1].includes(c)), label: prefName, explain: rankLine(r) });
  }
  if (jt === 'zone') {
    const x = pick(JUKEN_TERMS.filter((y) => /工業地[帯域]/.test(kanjiOf(y.t)) && y.p.length));
    const a = x.p[0];
    return finishQuiz({ q: `🏭${x.t}の [中心|ちゅうしん]と なる [都道府県|とどうふけん]は?`, a, opts: others(a, 2, (c) => !x.p.includes(c)), label: prefName, explain: termLine(x) });
  }
  if (jt === 'climate') {
    const keys = Object.keys(CLIMATE6);
    const k = pick(keys);
    const wrong = shuffle(keys.filter((y) => y !== k)).slice(0, 2);
    const byCity = Math.random() < 0.5;
    const q = byCity ? `🌦️${CLIMATE6[k].city}は どの [気候|きこう]?` : `🌦️「${CLIMATE6[k].d}」\nこれは どの [気候|きこう]?`;
    return finishQuiz({ q, a: k, opts: wrong, label: (y) => CLIMATE6[y].t, explain: `${CLIMATE6[k].t}([例|れい]: ${CLIMATE6[k].city})… ${CLIMATE6[k].d}`, kind: 'other' });
  }
  // 四大公害病: どこで おきた?
  const x = pick(JUKEN_TERMS.filter((y) => y.c === 'kogai' && /病|ぜんそく/.test(kanjiOf(y.t))));
  const a = x.p[0];
  return finishQuiz({ q: `⚠️${x.t}が おきた [都道府県|とどうふけん]は?`, a, opts: others(a, 2, (c) => !x.p.includes(c)), label: prefName, explain: termLine(x) });
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
  ['日本で いちばん ひろい しつげん [釧路湿原|くしろしつげん]が あるのは?', 1],
  ['いちばん ひろい し [高山市|たかやまし]が あるのは?', 21],
  ['JRで いちばん たかい えき [野辺山|のべやま]えきが あるのは?', 20],
  ['日本一 ふかい わん [駿河湾|するがわん]が あるのは?', 22],
];

function others(answer, n, ok) {
  return shuffle(CODES.filter((c) => c !== answer && (!ok || ok(c)))).slice(0, n);
}

// ほかの けんにも おなじ なまえが ある ものは こたえが ふたつに なるので ださない
function uniquePool(kind) {
  const count = {};
  CODES.forEach((c) => (PREFS[c][kind] || []).forEach((x) => {
    const k = compact(toHira(kanaOf(x[0])));
    (count[k] = count[k] || new Set()).add(c);
  }));
  const pool = [];
  CODES.forEach((c) => (PREFS[c][kind] || []).forEach((x) => {
    if (count[compact(toHira(kanaOf(x[0])))].size === 1) pool.push([c, x]);
  }));
  return pool;
}
const QUIZ_POOLS = {};
function poolOf(kind) { return QUIZ_POOLS[kind] || (QUIZ_POOLS[kind] = uniquePool(kind)); }

const KIND_Q = {
  spot: (x) => `📍${x[0]}が あるのは どこ?`,
  city: (x) => `🏙️「${x[0]}」は どこの けん?`,
  matsuri: (x) => `🏮「${x[0]}」が ある けんは?`,
  rail: (x) => `🚃「${x[0]}」が はしる(ある) けんは?`,
  hito: (x) => `👤「${x[0]}」に ゆかりの ある けんは?`,
  shizen: (x) => `⛰️「${x[0]}」が ある けんは?`,
  hogen: (x) => `🗣️「${x[0]}」(いみ: ${x[1]}) は どこの ほうげん?`,
};

const JUKEN_QUIZ = ['term', 'term', 'def', 'rank', 'rank', 'zone', 'climate', 'kogai'];
function makeQuiz() {
  if (isJuken()) {
    const jt = pick(JUKEN_QUIZ.concat(['kigo', 'cap', 'shape', 'isan']));
    if (JUKEN_QUIZ.includes(jt)) return makeJukenQuiz(jt);
    return makeQuiz2(jt);
  }
  return makeQuiz2(pick(['food', 'food', 'spot', 'spot', 'cap', 'nb', 'shape', 'shape', 'record', 'city', 'matsuri', 'rail', 'hito', 'shizen', 'hogen', 'sym', 'kigo', 'isan', 'shinkansen', 'sandai', 'chimei', 'chimei']));
}

function makeQuiz2(type) {
  let q;
  let a;
  let opts;
  let explain;
  let mini = null;
  if (type === 'food') {
    const clash = (c, mine) => PREFS[c].food.some((g) => foodTerms(g[1]).some((t) => mine.some((m) => t.includes(m) || m.includes(t))));
    const pool = QUIZ_POOLS.food || (QUIZ_POOLS.food = (() => {
      const out = [];
      CODES.forEach((c) => PREFS[c].food.forEach((f) => {
        const mine = foodTerms(f[1]);
        if (!CODES.some((o) => o !== c && clash(o, mine))) out.push([c, f]);
      }));
      return out;
    })());
    const [pc, f] = pick(pool);
    a = pc;
    q = `${f[0]}${f[1]}が めいさんなのは どこ?`;
    opts = others(a, 2, (c) => PREFS[c].r !== PREFS[a].r);
    explain = `${prefName(a)}の ${f[1]}… ${f[2]}`;
  } else if (KIND_Q[type]) {
    const [pc, x] = pick(poolOf(type));
    a = pc;
    q = KIND_Q[type](x);
    opts = others(a, 2, (c) => PREFS[c].r !== PREFS[a].r);
    explain = `${x[0]}は ${prefName(a)}。${x[1] && type !== 'hogen' ? x[1] : ''}`;
  } else if (type === 'sym') {
    const birds = {};
    CODES.forEach((c) => { if (PREFS[c].sym) (birds[PREFS[c].sym[2]] = birds[PREFS[c].sym[2]] || []).push(c); });
    const uniq = Object.keys(birds).filter((b) => birds[b].length === 1);
    const bird = pick(uniq);
    a = birds[bird][0];
    q = `🐦けんの とりが「${bird}」なのは どこ?`;
    opts = others(a, 2, (c) => PREFS[c].r !== PREFS[a].r);
    explain = `${prefName(a)}の けんの はなは ${PREFS[a].sym[0]}、とりは ${bird}。`;
  } else if (type === 'cap') {
    a = pick(CODES.filter((c) => PREFS[c].cap[1].replace(/(し|く)$/, '') !== PREFS[c].k.replace(/(けん|ふ|と)$/, '')));
    q = `${prefName(a)}の ${capWord(a)}は どこ?`;
    return finishQuiz({ q, a, opts: others(a, 2), label: capName, explain: `${prefName(a)}の ${capWord(a)}は ${capName(a)}。`, mini });
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
  } else if (type === 'isan') {
    const s = pick(SEKAI_ISAN.filter((x) => x[2].length <= 2));
    a = s[2][0];
    q = `🌏せかいいさん「${s[0]}」が ある けんは?`;
    opts = others(a, 2, (c) => !s[2].includes(c));
    explain = `${s[0]}は ${s[2].map(prefName).join('・')}。${s[1]}`;
  } else if (type === 'kigo') {
    const ans = pick(CHIZU_KIGO);
    const wrong = shuffle(CHIZU_KIGO.filter((k) => k !== ans)).slice(0, 2);
    const label = (k) => k[0];
    return finishQuiz({ q: '🗺️この ちずきごうは なにを あらわして いる?', a: ans, opts: wrong, label, explain: `${ans[0]}… かたちは ${ans[1]}。${ans[2]}`, kind: 'other', kigoBig: ans[3] });
  } else if (type === 'chimei') {
    const all = [];
    CODES.forEach((c) => (PREFS[c].chimei || []).forEach((x) => all.push([c, x])));
    const [pc, x] = pick(all);
    const ans = kanaOf(x[0]);
    const wrong = shuffle([...new Set(all.map((y) => kanaOf(y[1][0])))].filter((k) => k !== ans)).slice(0, 2);
    return finishQuiz({ q: `🔤「${kanjiOf(x[0])}」は なんて よむ?`, a: ans, opts: wrong, label: (k) => k, explain: `${kanjiOf(x[0])}は「${ans}」。${prefName(pc)}の ${x[1]}`, kind: 'other' });
  } else if (type === 'shinkansen') {
    const ans = pick(SHINKANSEN);
    const wrong = shuffle(SHINKANSEN.filter((k) => k !== ans)).slice(0, 2);
    return finishQuiz({ q: `🚄「${ans[1]}」を はしる しんかんせんは?`, a: ans, opts: wrong, label: (k) => k[0], explain: `${ans[0]}… ${ans[2]}`, kind: 'other' });
  } else if (type === 'sandai') {
    const s = pick(SANDAI);
    const hidden = pick(s[1]);
    const shown = s[1].filter((x) => x !== hidden);
    const wrong = shuffle(SANDAI.filter((x) => x !== s).map((x) => pick(x[1]))).slice(0, 2);
    return finishQuiz({ q: `🥇${s[0]}は ${shown.join('・')}と あと ひとつは?`, a: hidden, opts: wrong, label: (k) => k, explain: `${s[0]}… ${s[1].join('、')}`, kind: 'other' });
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
  state.quiz = { a: z.a, options, label: z.label, explain: z.explain, n, score: state.quiz ? state.quiz.score : 0, done: false, kind: z.kind || 'pref', kigoBig: z.kigoBig };
  return {
    say: `だい${n}もん!\n${z.q}`,
    face: 'think',
    options: options.map((c, i) => ({ c: i, html: ruby(z.label(c)) })),
    mini: z.mini,
    kigoBig: z.kigoBig,
  };
}

// i: えらんだ ボタンの ばんごう
function judge(i) {
  const z = state.quiz;
  z.done = true;
  const c = z.options[i];
  const ok = c === z.a;
  if (ok) z.score++;
  const isPref = z.kind === 'pref';
  if (isPref) { visit(z.a); state.cur = z.a; }
  const head = ok ? pick(LINES.ok) : fill(pick(LINES.ng), { a: z.label(z.a) });
  sfx(ok ? 'ok' : 'ng');
  return {
    say: `${head}\n${z.explain}\n(${z.n}もんちゅう ${z.score}もん せいかい)`,
    face: ok ? 'happy' : 'think',
    chips: isPref ? ['つぎの もんだい', PREFS[z.a].k + 'の こと', 'クイズ おしまい'] : ['つぎの もんだい', 'クイズ おしまい'],
    cur: isPref ? z.a : null,
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
      const hint = z.kind === 'pref' ? `こたえは ${regionOf(z.a).n}に あるぞ。` : `こたえは「${kanaOf(z.label(z.a)).slice(0, 1)}」から はじまるぞ。`;
      return { say: `ヒント じゃ。${hint}`, face: 'think', options: z.options.map((c, i) => ({ c: i, html: ruby(z.label(c)) })), kigoBig: z.kigoBig };
    }
    if (z.kind === 'pref') {
      const hits = findAll(spaced, PREF_ALIASES).map((h) => z.options.indexOf(h.a.code)).filter((i) => i >= 0);
      if (hits.length) return judge(hits[0]);
      const capHit = z.options.findIndex((c) => t.includes(toHira(PREFS[c].cap[1])) || t.includes(PREFS[c].cap[0]));
      if (capHit >= 0) return judge(capHit);
    } else {
      // 「がっこう(しょう・ちゅうがっこう)」のような なまえは、きれめごとに くらべる
      const hit = z.options.findIndex((c) => norm(kanaOf(z.label(c))).split(' ').concat(compact(norm(kanaOf(z.label(c)))))
        .some((k) => k.length >= 2 && (t.includes(k) || (t.length >= 3 && k.includes(t)))));
      if (hit >= 0) return judge(hit);
    }
  }
  if (has(t, ['おしまい', 'やめる', 'おわり'])) {
    const s = z ? `${z.n}もんちゅう ${z.score}もん せいかい じゃった。よう がんばった!` : 'うむ。';
    state.quiz = null;
    return { say: s + '\nまた いつでも きいとくれ。', face: 'happy', chips: homeChips() };
  }
  if (has(t, ['つぎのもんだい', 'くいず', 'もんだい', '問題'])) return makeQuiz();

  if (has(t, ['もういちど', 'もういっかい', 'もう一回'])) return state.last;
  if (has(t, ['じゅけんもーど', 'ちゅうがくじゅけん', '中学受験', '受験もーど', '受験モード'])) return setMode('juken');
  if (has(t, ['ものしりもーど', 'ふつうもーど', 'ものしりモード'])) return setMode('mono');
  if (has(t, ['ただたか']) || has(t, ['だれ', 'なまえ', '名前', 'じこしょうかい']) && !findAll(spaced, KIND_ALIASES.hito).length) {
    return {
      say: 'わしは ちりはかせの ただたか じゃ。\nにっぽんじゅうを あるいて ちずを つくって きた。47の けんと にっぽんの ことを 6000いじょう しっとるぞ。\nなまえは、むかし ほんとうに 日本を あるきまわって ちずを つくった [伊能忠敬|いのうただたか]さんから もらったんじゃ。',
      face: 'happy', chips: homeChips(),
    };
  }
  if (has(t, ['こんにちは', 'おはよう', 'こんばんは', 'やあ', 'はじめまして', 'はろー'])) {
    return { say: 'うむ、こんにちは! きょうは どこの はなしを しようかの?', face: 'happy', chips: homeChips() };
  }
  if (has(t, ['ありがとう', 'さんきゅー'])) {
    return { say: 'どういたしまして! しりたい きもちが いちばんの たからもの じゃ。', face: 'happy', chips: homeChips() };
  }
  if (has(t, ['ばいばい', 'さようなら', 'またね'])) {
    return { say: 'またの! つぎは どこの ちずを ひらこうかのう。', face: 'happy', chips: homeChips() };
  }

  const prefHits = findAll(spaced, PREF_ALIASES);
  if (has(t, ['ちずをひら', 'ちずをみせ', 'ちずみせ', 'まっぷ']) && !prefHits.length) {
    openMap();
    return { say: 'ちずを ひろげたぞ! しりたい けんを タップしてごらん。', face: 'happy', chips: homeChips() };
  }

  // 「もっと」… さっきの はなしの つづき
  if (has(t, ['もっと', 'つづき', 'ほかに', 'ほかの']) && !prefHits.length) {
    if (isJuken() && has(t, ['せいさんりょう', '生産量'])) return jukenRank('');
    if (isJuken() && state.jukenCat && !state.lastCat && [null, 'mame'].includes(intentOf(t))) return jukenCategory(state.jukenCat);
    if (has(t, ['せかいいさん', 'ちずきごう', 'さんだい', '三大', 'しんかんせん', 'なんどく', 'ちめい'])) return nippon(t.replace('ほかの', ''));
    if (has(t, ['にっぽんいち', '日本一'])) return record('');
    if (state.cur && state.lastCat && [null, 'mame'].includes(intentOf(t))) return aboutPref(state.cur, state.lastCat);
  }

  // 受験モードでは 入試の ようごを さきに
  const jr = jukenReply(t, spaced, prefHits);
  if (jr) return jr;

  // ランキング・日本一
  if (has(t, ['らんきんぐ', 'べすと', 'じゅんい', '順位', 'ばんめ', 'じゅんばん'])) return ranking(t);
  if (has(t, ['いちばん', '一番', '日本一', 'にっぽんいち', 'にほんいち']) && !prefHits.length) return record(t);

  // なまえで さがす: ばしょ・まち・ひと・まつり・てつどう・しぜん(けんの なまえより ながい ときは こちら)
  const named = [['spot', findAll(spaced, SPOT_ALIASES)]].concat(Object.keys(KIND_ALIASES).map((k) => [k, findAll(spaced, KIND_ALIASES[k])]))
    .filter(([, hits]) => hits.length)
    .sort((x, y) => Math.max(...y[1].map((h) => h.len)) - Math.max(...x[1].map((h) => h.len)));
  const prefLen = prefHits.length ? Math.max(...prefHits.map((h) => h.len)) : 0;
  if (named.length) {
    const [kind, hits] = named[0];
    const best = Math.max(...hits.map((h) => h.len));
    if (best > prefLen || (best === prefLen && kind !== 'city')) {
      const ids = hits.filter((h) => h.len === best).map((h) => h.a.code);
      return kind === 'spot' ? aboutSpot(ids) : aboutKind(kind, ids);
    }
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

  const n = nippon(t);
  if (n) return n;

  const region = REGIONS.find((r) => r.keys.some((k) => t.includes(k)));
  if (region) return aboutRegion(region);

  if (has(t, ['おすすめ', 'どこか', 'らんだむ', 'なんでも', 'てきとう'])) {
    const c = pick(CODES.filter((x) => !save.visited.includes(x)).concat(CODES).slice(0, 47));
    return aboutPref(c, null);
  }
  if (/(の)?こと$/.test(t) && state.cur) return aboutPref(state.cur, null);

  if (intent && state.cur) return aboutPref(state.cur, intent);
  if (intent) {
    return { say: pick(LINES.aizuchi) + '\nどこの けんの はなしが ききたい? けんの なまえを いってごらん。', face: 'think', chips: shuffle(CODES).slice(0, 4).map((c) => PREFS[c].k).concat(['ちずを ひらく']) };
  }

  return {
    say: 'ふむ…? わしは ちりの ことなら なんでも しっとるぞ。\n「ほっかいどう」「ふじさん」「りんごは どこ?」「せかいいさん」のように きいてごらん。',
    face: 'think',
    chips: homeChips(),
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
  (r.chips || homeChips()).forEach((label) => {
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
  let extra = '';
  if (r.kigoBig) extra += `<div class="kigo-big">${kigoSvg(r.kigoBig, 110)}</div>`;
  if (r.kigo) extra += '<div class="kigo-grid">' + r.kigo.map((k) => `<figure>${kigoSvg(k[3], 52)}<figcaption>${esc(k[0])}</figcaption></figure>`).join('') + '</div>';
  if (r.mini) html += miniMap(r.mini);
  $('bubble').innerHTML = html + extra;
  $('bubble').scrollTop = 0;
  addLog('t', ruby(r.say) + extra);
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
function updateModeBtn() {
  const m = MODES[save.mode] || MODES.mono;
  $('btnMode').innerHTML = `${m.icon}<small>${m.short}</small>`;
  document.body.classList.toggle('juken', isJuken());
  document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === save.mode)));
}
function openModeMenu() { updateModeBtn(); $('modeModal').hidden = false; }
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
    if (isJuken()) {
      const x = pick(JUKEN_TERMS);
      show({ say: `[入試|にゅうし]に でる [用語|ようご]を ひとつ。\n${termLine(x)}`, face: 'wow', chips: ['クイズ', 'もっと'].concat(shuffle(JUKEN_HOME).slice(0, 3)) });
      state.jukenCat = x.c;
      return;
    }
    const c = pick(CODES);
    state.cur = c;
    show({
      say: `そうそう、${prefName(c)}の はなしを しっとるか?\n💡${pick(PREFS[c].mame.concat(PREFS[c].rekishi || []))}`,
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
  $('btnMode').addEventListener('click', openModeMenu);
  document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    $('modeModal').hidden = true;
    sfx('pop');
    show(setMode(b.dataset.mode));
    resetIdle();
  }));
  $('modeModal').addEventListener('click', (e) => { if (e.target === $('modeModal')) $('modeModal').hidden = true; });
  updateModeBtn();
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
  const r = isJuken() ? modeIntro() : {
    say: first
      ? 'やあ! わしは ちりはかせの ただたか じゃ。\nにっぽんじゅうを あるいて ちずを つくって きた。\n47の [都道府県|とどうふけん]の ゆうめいな ばしょ・めいさん・ちりなら なんでも きいとくれ!'
      : `おかえり! これまでに ${save.visited.length}の [都道府県|とどうふけん]を いっしょに たんけん したのう。\nきょうは どこへ いこうか?`,
    face: 'happy',
    chips: homeChips(),
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
