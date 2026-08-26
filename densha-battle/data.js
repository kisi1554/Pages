'use strict';

/*
 * でんしゃバトル: データ
 *
 *  HEROES  … プレイヤーが えらぶ 人間の 勇者たち(けんと まほうの いせかい風)
 *  VEGGIES … てきの 野菜モンスター。じぶんの 英語名を さけびながら おそってくる
 *  BOSSES  … やさい四天王 と 大魔王
 *  WAVES   … 何波めに どの モンスターが おしよせるか
 */

/* ==============================================================
 * 勇者たち
 *
 *   cls     … しょくぎょう
 *   tag     … どんな 子か ひとことで
 *   quote   … 口ぐせ(バトル かいしと ひっさつわざの ときに しゃべる)
 *   weapon  … てに もっている ぶき(えもじ)
 *   hat     … あたまの かざり(えもじ)。'' なら なし
 *   color   … ふくの いろ / ink … ふちどりの いろ
 *   hair    … かみの いろ / skin … はだの いろ
 *   power   … こうげき力の ばいりつ(1.0 が ふつう)
 *   attack  … ふつうの こうげきの なまえ
 *   special … ひっさつわざ
 * ============================================================== */

const HEROES = [
  {
    id: 'souma',
    name: 'ソウマ',
    cls: 'ゆうしゃ',
    tag: 'まっすぐで あつい リーダー',
    quote: 'みんなは おれが まもる!',
    weapon: '⚔️', hat: '', aura: '✨', spark: '⚡',
    color: '#e03131', ink: '#8f1d1d', hair: '#3b2a20', skin: '#ffd8b1',
    me: 'おれ', end: 'だ',
    power: 1.20,
    attack: 'ソード・スラッシュ',
    special: 'エクスカリバー・ブレイズ',
  },
  {
    id: 'ririka',
    name: 'リリカ',
    cls: 'だいまどうし',
    tag: 'おっとり してるが てんさい',
    quote: 'ふふ… ちょっと ほんき だすね?',
    weapon: '🔮', hat: '🎩', aura: '💫', spark: '🔮',
    color: '#7048e8', ink: '#3b1f80', hair: '#f3b1d6', skin: '#ffe0c2',
    me: 'わたし', end: 'ね',
    power: 1.30,
    attack: 'マジック・ボルト',
    special: 'メテオ・インパクト',
  },
  {
    id: 'gairu',
    name: 'ガイル',
    cls: 'せんし',
    tag: 'ごうかいで おおぐらい',
    quote: 'はらへった! やさい たべてやる!',
    weapon: '🪓', hat: '', aura: '💢', spark: '💥',
    color: '#e8590c', ink: '#8f3005', hair: '#8a4b1f', skin: '#e8b48a',
    me: 'おれさま', end: 'だぜ',
    power: 1.25,
    attack: 'アックス・スイング',
    special: 'グランド・クラッシャー',
  },
  {
    id: 'minato',
    name: 'ミナト',
    cls: 'きゅうしゅ',
    tag: 'クールな そげきの めいしゅ',
    quote: '…はずさない。',
    weapon: '🏹', hat: '', aura: '🌬️', spark: '🎯',
    color: '#0ca678', ink: '#0a5c47', hair: '#2b6cb0', skin: '#f6cfa8',
    me: 'ぼく', end: 'さ',
    power: 1.15,
    attack: 'クイック・ショット',
    special: 'サウザンド・アロー',
  },
  {
    id: 'seira',
    name: 'セイラ',
    cls: 'そうりょ',
    tag: 'やさしくて みんなの ささえ',
    quote: 'だいじょうぶ。わたしが ついてます!',
    weapon: '✨', hat: '👒', aura: '🕊️', spark: '💖',
    color: '#f1f3f5', ink: '#9775fa', hair: '#ffd43b', skin: '#ffe3c8',
    me: 'わたし', end: 'です',
    power: 1.00,
    attack: 'ライト・ヒール',
    special: 'ホーリー・ジャッジメント',
  },
  {
    id: 'kagerou',
    name: 'カゲロウ',
    cls: 'にんじゃ',
    tag: 'むくちで しんそくの かげ',
    quote: '……いくぞ。',
    weapon: '🌀', hat: '🥷', aura: '🍃', spark: '🌸',
    color: '#343a40', ink: '#0b0e11', hair: '#101418', skin: '#e6b98f',
    me: 'せっしゃ', end: 'でござる',
    power: 1.20,
    attack: 'かげぬい しゅりけん',
    special: 'しのび・せんぼんざくら',
  },
  {
    id: 'barudo',
    name: 'バルド',
    cls: 'ドワーフの かじや',
    tag: 'がんこ いってつの しょくにん',
    quote: 'わしの ハンマーは かたいぞ!',
    weapon: '🔨', hat: '⛑️', aura: '🔥', spark: '🔥',
    color: '#a9640a', ink: '#603a05', hair: '#c1c1c1', skin: '#e3a878',
    me: 'わし', end: 'じゃ',
    power: 1.30,
    attack: 'アイアン・ノック',
    special: 'ハンマー・オブ・ドーン',
  },
  {
    id: 'fina',
    name: 'フィーナ',
    cls: 'エルフの せいれいつかい',
    tag: 'もりと かぜを あいする',
    quote: 'かぜよ、わたしに ちからを。',
    weapon: '🍃', hat: '🧝', aura: '🌿', spark: '🌿',
    color: '#37b24d', ink: '#1c6e2b', hair: '#c0eb75', skin: '#fbe3c8',
    me: 'わたし', end: 'よ',
    power: 1.10,
    attack: 'リーフ・エッジ',
    special: 'エンシェント・ウィンド',
  },
  {
    id: 'runa',
    name: 'ルナ',
    cls: 'りゅうきし',
    tag: 'ほこりたかい たつの あいぼう',
    quote: 'わが りゅうの いかりを うけよ!',
    weapon: '🐉', hat: '👑', aura: '🔥', spark: '🐲',
    color: '#1971c2', ink: '#0d3f6e', hair: '#e9ecef', skin: '#f0c9a0',
    me: 'わたし', end: 'だ',
    power: 1.35,
    attack: 'ランス・ピアース',
    special: 'ドラゴン・ダイブ',
  },
  {
    id: 'ziiku',
    name: 'ジーク',
    cls: 'せいきし',
    tag: 'きまじめな まもりの かなめ',
    quote: 'この たては やぶらせん!',
    weapon: '🛡️', hat: '', aura: '⭐', spark: '⭐',
    color: '#adb5bd', ink: '#495057', hair: '#f1c40f', skin: '#ffdcb8',
    me: 'わたし', end: 'であります',
    power: 1.05,
    attack: 'シールド・ラッシュ',
    special: 'セイクリッド・シールドバッシュ',
  },
  {
    id: 'noa',
    name: 'ノア',
    cls: 'くろまどうし',
    tag: 'しずかで ちょっと ちゅうに',
    quote: 'やみよ… めざめよ。',
    weapon: '🌑', hat: '🕯️', aura: '🌑', spark: '🟣',
    color: '#5f3dc4', ink: '#2b1666', hair: '#212529', skin: '#f3d3bb',
    me: 'われ', end: 'なり',
    power: 1.30,
    attack: 'シャドウ・ボール',
    special: 'ダーク・フレア',
  },
  {
    id: 'sora',
    name: 'ソラ',
    cls: 'ぎんゆうしじん',
    tag: 'あかるい ムードメーカー',
    quote: 'さあ、たのしく いこうよ〜!',
    weapon: '🎵', hat: '🎺', aura: '🎶', spark: '🎶',
    color: '#f59f00', ink: '#a06400', hair: '#ff922b', skin: '#ffe0bd',
    me: 'ぼく', end: 'だよ',
    power: 1.10,
    attack: 'サウンド・ウェーブ',
    special: 'レクイエム・ソナタ',
  },
];

/* ============================================================
 * 野菜モンスター
 *
 *   size … s(ざこ) / m(ふつう) / l(おおきい) / boss
 *   en   … 英語の なまえ。こうげきの ときに この なまえを さけぶ
 *   move … うごきかた(style.css が data-move を みて アニメを かえる)
 *   てきの つよさは SIZE_SPEC で サイズごとに きまる。
 * ============================================================ */

const SIZE_SPEC = {
  s: { hp: 30, atk: 4, cd: 5.6, scale: 1.00, label: 'ざこ' },
  m: { hp: 62, atk: 6, cd: 6.2, scale: 1.28, label: 'ふつう' },
  l: { hp: 100, atk: 9, cd: 7.0, scale: 1.58, label: 'おおもの' },
};

const VEGGIES = [
  { id: 'ninjin',    name: 'ニンジーン',   en: 'Carrot',          emoji: '🥕', color: '#ff8c42', ink: '#a34d0f', size: 's', move: 'drill',    cry: 'ニンジン キーック!' },
  { id: 'tomaton',   name: 'トマトン',     en: 'Tomato',          emoji: '🍅', color: '#ff5a5a', ink: '#a32020', size: 's', move: 'hop',      cry: 'トマト ばくだん!' },
  { id: 'piman',     name: 'ピーマング',   en: 'Green pepper',    emoji: '🫑', color: '#4caf50', ink: '#256029', size: 's', move: 'flip',     cry: 'にがいぞー!' },
  { id: 'kyuri',     name: 'キューリー',   en: 'Cucumber',        emoji: '🥒', color: '#69b34c', ink: '#33682a', size: 's', move: 'slide',    cry: 'ポリポリ こうげき!' },
  { id: 'ninniku',   name: 'ニンニクー',   en: 'Garlic',          emoji: '🧄', color: '#e8e0d0', ink: '#8a7f6a', size: 's', move: 'blink',    cry: 'におい こうせん!' },
  { id: 'burokko',   name: 'ブロッコリン', en: 'Broccoli',        emoji: '🥦', color: '#5cb85c', ink: '#2f6b2f', size: 'm', move: 'shake',    cry: 'もりもり タックル!' },
  { id: 'corn',      name: 'コーンガー',   en: 'Corn',            emoji: '🌽', color: '#ffd93b', ink: '#a37a00', size: 'm', move: 'roll',     cry: 'つぶつぶ マシンガン!' },
  { id: 'nasu',      name: 'ナスビーム',   en: 'Eggplant',        emoji: '🍆', color: '#9b6bd6', ink: '#4f2f7a', size: 'm', move: 'float',    cry: 'むらさき ビーム!' },
  { id: 'tamanegi',  name: 'タマネギング', en: 'Onion',           emoji: '🧅', color: '#e0b088', ink: '#8a5f30', size: 'm', move: 'squash',   cry: 'なみだが とまらない!' },
  { id: 'togarashi', name: 'トウガラシー', en: 'Chili pepper',    emoji: '🌶️', color: '#f4511e', ink: '#8f2a0a', size: 'm', move: 'dash',     cry: 'からーい ほのお!' },
  { id: 'jagaimo',   name: 'ジャガイモス', en: 'Potato',          emoji: '🥔', color: '#c9a06a', ink: '#7a5a2f', size: 'l', move: 'heavy',    cry: 'ゴロゴロ プレス!' },
  { id: 'hakusai',   name: 'ハクサイダー', en: 'Chinese cabbage', emoji: '🥬', color: '#8bc34a', ink: '#4a7a1e', size: 'l', move: 'spin',     cry: 'はっぱ カッター!' },
  { id: 'satsuma',   name: 'サツマイモン', en: 'Sweet potato',    emoji: '🍠', color: '#d17ba5', ink: '#7a3a5a', size: 'l', move: 'zigzag',   cry: 'ほくほく ボンバー!' },
  { id: 'avocado',   name: 'アボガドン',   en: 'Avocado',         emoji: '🥑', color: '#7cb342', ink: '#41631f', size: 'l', move: 'pendulum', cry: 'たねを くらえ!' },
];

const VEG_BY_SIZE = { s: [], m: [], l: [] };
VEGGIES.forEach((v) => { VEG_BY_SIZE[v.size].push(v); });

/* ==============================================================
 * ボス野菜  —  やさい四天王 と 大魔王
 *
 *   title  … 「ほのおの四天王」など、なまえの 上に でる かたがき
 *   scale  … でかさ。四天王は ふつうの モンスターの 3ばい ちかい
 *   bgm    … その ボス戦で ながれる 曲(audio.js の BGM_TRACKS の name)
 *   bgm2   … HPが はんぶんを きった「だい2けいたい」の 曲
 *   rage   … だい2けいたいに なった ときの つよさの ばいりつ
 * ============================================================== */

const BOSSES = {
  /* --------------------------- やさい四天王 --------------------------- */
  kabocha: {
    id: 'kabocha',
    name: 'カボチャだいまおう',
    title: 'ほのおの四天王',
    emoji: '🎃',
    en: 'Pumpkin',
    move: 'heavy',
    aura: '🔥',
    color: '#ff922b',
    ink: '#a34d0f',
    size: 'boss',
    hp: 190, atk: 11, cd: 4.2, scale: 3.0,
    bgm: '四天王 とうじょう',
    bgm2: '四天王 かくせい',
    rage: 1.35,
    cry: 'ハロウィン・インフェルノ!',
    intro: 'グワッハッハ! やさいを きらいな こどもは わしの なかまじゃ!',
    defeat: 'バ… バカな… カボチャの ほのおが きえるとは…!',
  },
  hakusai: {
    id: 'hakusai',
    name: 'ハクサイ・ブリザード',
    title: 'こおりの四天王',
    emoji: '🥬',
    en: 'Chinese cabbage',
    move: 'spin',
    aura: '❄️',
    color: '#74c0fc',
    ink: '#1864ab',
    size: 'boss',
    hp: 250, atk: 13, cd: 4.0, scale: 3.15,
    bgm: '四天王 ひょうが',
    bgm2: '四天王 きょうらん',
    rage: 1.35,
    cry: 'アブソリュート・はっぱカッター!',
    intro: 'こおりつけ。おまえの けいさんも まとめて こおらせてやる。',
    defeat: 'とけて…しまう…! こんな あつい けいさんに…!',
  },
  corn: {
    id: 'corn',
    name: 'コーン・サンダーガ',
    title: 'かみなりの四天王',
    emoji: '🌽',
    en: 'Corn',
    move: 'dash',
    aura: '⚡',
    color: '#ffd43b',
    ink: '#a37a00',
    size: 'boss',
    hp: 310, atk: 15, cd: 3.8, scale: 3.3,
    bgm: '四天王 らいめい',
    bgm2: '四天王 かくせい',
    rage: 1.4,
    cry: 'つぶつぶ ライトニング!',
    intro: 'つぶの かずを かぞえられるか? できまいな! ゴロゴロゴロ!',
    defeat: 'つぶが… ぜんぶ かぞえられた…だと…!?',
  },
  nasu: {
    id: 'nasu',
    name: 'ナス・ドクロン',
    title: 'やみの四天王',
    emoji: '🍆',
    en: 'Eggplant',
    move: 'float',
    aura: '💜',
    color: '#9b6bd6',
    ink: '#4f2f7a',
    size: 'boss',
    hp: 370, atk: 17, cd: 3.6, scale: 3.45,
    bgm: '四天王 さいご',
    bgm2: '四天王 きょうらん',
    rage: 1.4,
    cry: 'ダーク・ヘタ・ブレイク!',
    intro: 'われは 四天王 さいきょう。ここから さきへは いかせん!',
    defeat: 'ベジタゴンさま… あとは… おまかせ…を…',
  },

  /* ----------------------------- 大魔王 ----------------------------- */
  vegetagon: {
    id: 'vegetagon',
    name: 'ベジタゴン',
    title: 'やさいの大魔王',
    emoji: '🥦',
    en: 'Broccoli King',
    move: 'pendulum',
    aura: '👑',
    crown: '👑',
    color: '#2f9e44',
    ink: '#14532d',
    size: 'boss',
    hp: 470, atk: 19, cd: 3.2, scale: 3.9,
    bgm: '大魔王 ベジタゴン',
    bgm2: '大魔王 しんのすがた',
    rage: 1.5,
    isFinal: true,
    cry: 'ベジタ・インパクト!',
    intro: 'われこそ やさいの 大魔王 ベジタゴン! 四天王を たおしたか… ならば われが あいてだ!',
    defeat: 'バカな… こどもの けいさんに… まけるとは…! うわああああ!',
  },
};

/* 四天王の ならび(けっか画面で つかう) */
const SHITENNOU_IDS = ['kabocha', 'hakusai', 'corn', 'nasu'];

/* ============================================================
 * ウェーブ(波)
 *   mons … おしよせる モンスターの サイズ(ならびは 前から)
 *   boss … いれば その波は ボス戦
 * ============================================================ */

const WAVES = [
  { mons: ['s', 's', 's'] },
  { mons: ['s', 's', 'm', 'm'] },
  { boss: 'kabocha', mons: ['s', 's'] },
  { mons: ['m', 'm', 'm', 'm'] },
  { boss: 'hakusai', mons: ['s', 'm'] },
  { mons: ['m', 'l', 'l'] },
  { boss: 'corn', mons: ['m', 'm'] },
  { mons: ['l', 'l', 'l', 'l'] },
  { boss: 'nasu', mons: ['m', 'l'] },
  { boss: 'vegetagon', mons: ['m', 'm'] },
];

const WAVE_COUNT = WAVES.length;

/*
 * ウェーブの モンスターを つくる。
 * おなじ 波の 中で 同じ野菜が ならばないように シャッフルして えらぶ。
 */
function buildWave(waveIndex) {
  const spec = WAVES[waveIndex];
  const out = [];

  if (spec.boss) {
    const b = BOSSES[spec.boss];
    out.push({
      def: b,
      maxHp: b.hp,
      hp: b.hp,
      atk: b.atk,
      cd: b.cd,
      scale: b.scale,
      isBoss: true,
    });
  }

  const used = {};
  spec.mons.forEach((size) => {
    const pool = VEG_BY_SIZE[size];
    let v = pool[Math.floor(Math.random() * pool.length)];
    let guard = 0;
    while (used[v.id] && guard < 8) {
      v = pool[Math.floor(Math.random() * pool.length)];
      guard += 1;
    }
    used[v.id] = true;
    const s = SIZE_SPEC[size];
    /* さきの 波ほど かたく なる */
    const boost = 1 + waveIndex * 0.07;
    out.push({
      def: v,
      maxHp: Math.round(s.hp * boost),
      hp: Math.round(s.hp * boost),
      atk: Math.round(s.atk * (1 + waveIndex * 0.06)),
      cd: Math.max(3.2, s.cd - waveIndex * 0.18),
      scale: s.scale,
      isBoss: false,
    });
  });

  return out;
}

/* プレイヤーが せいかいした ときの かけごえ */
const HIT_WORDS = ['どっかーん!', 'ばっしゃーん!', 'ずどーん!', 'がっしゃーん!', 'ばきーん!', 'めった ぎり!'];

/* モンスターを たおした ときの かけごえ */
const KILL_WORDS = ['やさい げきは!', 'ぺしゃんこ!', 'こなごな!', 'サラダに なった!', 'ノックアウト!'];
