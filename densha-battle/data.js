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
 * 勇者たち  —  でんしゃの ぎじんか
 *
 * 見た目は 人間だが、みんな「じぶんの 路線」を もつ でんしゃの 化身。
 * よろい・マント・ぶき・ぼうしは その路線の いろ、むねには 路線記号の バッジ、
 * 足もとの ふだと なまえの 上には 路線名が でる。
 * 路線の いろ・記号は ../densha-talk/data.js の 路線データと そろえてある。
 *
 *   line    … 路線名(なまえの 上に でる)
 *   company … 鉄道会社
 *   symbol  … 路線記号(むねの バッジ)
 *   cls     … しょくぎょう
 *   tag     … どんな 子か ひとことで
 *   quote   … 口ぐせ(バトル かいしと ひっさつわざの ときに しゃべる)
 *   weapon  … てに もっている ぶき(えもじ)
 *   hat     … あたまの かざり(えもじ)。'' なら なし
 *   color   … 路線カラー。よろい・マント・ぶきの ひかりに つかう
 *   ink     … その こい いろ(ふちどり)
 *   hair    … かみの いろ / skin … はだの いろ(ここは 人間らしい いろ)
 *   power   … こうげき力の ばいりつ(1.0 が ふつう)
 *   attack  … ふつうの こうげきの なまえ
 *   special … ひっさつわざ(けんと まほうの いせかい風 + 路線の とくちょう)
 * ============================================================== */

const HEROES = [
  {
    id: 'yamato',
    name: 'ヤマト',
    line: '山手線',
    company: 'JR東日本',
    symbol: 'JY',
    cls: 'ゆうしゃ',
    tag: 'まちを ぐるぐる まもる リーダー',
    quote: 'この まちは おれが ぐるっと まもる!',
    weapon: '⚔️', hat: '', aura: '💫', spark: '💚',
    color: '#9acd32', ink: '#4f7a06', hair: '#3b2a20', skin: '#ffd8b1',
    me: 'おれ', end: 'だ',
    power: 1.20,
    attack: 'リング・スラッシュ',
    special: 'エターナル・ループブレイズ',
  },
  {
    id: 'keiga',
    name: 'ケイガ',
    line: '京急本線',
    company: '京浜急行電鉄',
    symbol: 'KK',
    cls: 'しっぷうの けんし',
    tag: 'だれよりも はやい あかい いなずま',
    quote: 'おれより はやい やつは いないぜ!',
    weapon: '🗡️', hat: '', aura: '💨', spark: '⚡',
    color: '#e5171f', ink: '#9b0d13', hair: '#8a4b1f', skin: '#e8b48a',
    me: 'おれ', end: 'だぜ',
    power: 1.30,
    attack: 'クイック・エッジ',
    special: 'レッドウィング・ラッシュ',
  },
  {
    id: 'ginzard',
    name: 'ギンザード',
    line: '銀座線',
    company: '東京メトロ',
    symbol: 'G',
    cls: 'ドワーフの かじや',
    tag: 'いちばん ふるい ちていの しょくにん',
    quote: 'わしの ハンマーは ちてい いちばんじゃ!',
    weapon: '🔨', hat: '⛑️', aura: '🔥', spark: '🟠',
    color: '#ff9500', ink: '#a05e00', hair: '#c1c1c1', skin: '#e3a878',
    me: 'わし', end: 'じゃ',
    power: 1.30,
    attack: 'アイアン・ノック',
    special: 'アンダーグラウンド・ハンマー',
  },
  {
    id: 'keihoku',
    name: 'ケイホク',
    line: '京浜東北・根岸線',
    company: 'JR東日本',
    symbol: 'JK',
    cls: 'きゅうしゅ',
    tag: 'まっすぐ ねらう そげきの めいしゅ',
    quote: '…まっすぐ。はずさない。',
    weapon: '🏹', hat: '', aura: '🌬️', spark: '🎯',
    color: '#00b2e5', ink: '#00688c', hair: '#2b6cb0', skin: '#f6cfa8',
    me: 'ぼく', end: 'さ',
    power: 1.15,
    attack: 'ストレート・ショット',
    special: 'サウザンド・スカイアロー',
  },
  {
    id: 'romana',
    name: 'ロマーナ',
    line: '小田原線',
    company: '小田急電鉄',
    symbol: 'OH',
    cls: 'うたひめ',
    tag: 'はこねへ いざなう とっきゅうの うたい手',
    quote: 'さあ、ゆめの たびへ ごあんない〜♪',
    weapon: '🎵', hat: '👑', aura: '🎶', spark: '🎶',
    color: '#0068b7', ink: '#00436f', hair: '#ffd43b', skin: '#ffe3c8',
    me: 'わたし', end: 'ね',
    power: 1.10,
    attack: 'メロディ・ウェーブ',
    special: 'ロマンス・グランドソナタ',
  },
  {
    id: 'hanzou',
    name: 'ハンゾウ',
    line: '半蔵門線',
    company: '東京メトロ',
    symbol: 'Z',
    cls: 'くろまどうし',
    tag: 'しずかで ちょっと ちゅうに',
    quote: 'やみの トンネルよ… めざめよ。',
    weapon: '🌑', hat: '🕯️', aura: '🌑', spark: '🟣',
    color: '#8f76d6', ink: '#4b3a80', hair: '#212529', skin: '#f3d3bb',
    me: 'われ', end: 'なり',
    power: 1.30,
    attack: 'シャドウ・ボール',
    special: 'ダーク・トンネルフレア',
  },
  {
    id: 'jouga',
    name: 'ジョウガ',
    line: '常磐線',
    company: 'JR東日本',
    symbol: 'JJ',
    cls: 'りゅうきし',
    tag: 'エメラルドの りゅうを つれた きし',
    quote: 'わが りゅうの いかりを うけよ!',
    weapon: '🐉', hat: '', aura: '🔥', spark: '🐲',
    color: '#00ac9a', ink: '#00695c', hair: '#e9ecef', skin: '#f0c9a0',
    me: 'わたし', end: 'だ',
    power: 1.35,
    attack: 'ランス・ピアース',
    special: 'エメラルド・ドラゴンダイブ',
  },
  {
    id: 'musashi',
    name: 'ムサシ',
    line: '武蔵野線',
    company: 'JR東日本',
    symbol: 'JM',
    cls: 'にんじゃ',
    tag: 'そとがわを まわる むくちな かげ',
    quote: '……そとから まわりこむ。',
    weapon: '🌀', hat: '🥷', aura: '🍃', spark: '🌸',
    color: '#e4610f', ink: '#8a3a00', hair: '#101418', skin: '#e6b98f',
    me: 'せっしゃ', end: 'でござる',
    power: 1.20,
    attack: 'かげぬい しゅりけん',
    special: 'アウターループ・せんぼんざくら',
  },
  {
    id: 'denel',
    name: 'デンエル',
    line: '田園都市線',
    company: '東急電鉄',
    symbol: 'DT',
    cls: 'エルフの せいれいつかい',
    tag: 'みどりの まちを あいする',
    quote: 'みどりの かぜよ、ちからを かして。',
    weapon: '🍃', hat: '🧝', aura: '🌿', spark: '🌿',
    color: '#20a288', ink: '#136354', hair: '#c0eb75', skin: '#fbe3c8',
    me: 'わたし', end: 'よ',
    power: 1.10,
    attack: 'リーフ・エッジ',
    special: 'グリーン・エンシェントウィンド',
  },
  {
    id: 'seta',
    name: 'セタ',
    line: '世田谷線',
    company: '東急電鉄',
    symbol: 'SG',
    cls: 'ひかりの そうりょ',
    tag: 'のんびり やさしい ちんちんでんしゃ',
    quote: 'だいじょうぶ。ゆっくり いきましょう。',
    weapon: '✨', hat: '👒', aura: '🕊️', spark: '💛',
    color: '#fcd900', ink: '#9c8500', hair: '#8a6a3b', skin: '#ffe3c8',
    me: 'わたし', end: 'です',
    power: 1.00,
    attack: 'ライト・ヒール',
    special: 'ホーリー・ジャッジメント',
  },
  {
    id: 'mirai',
    name: 'ミライ',
    line: 'みなとみらい線',
    company: '横浜高速鉄道',
    symbol: 'MM',
    cls: 'ときの まどうし',
    tag: 'みなとの したを はしる みらいの まほう',
    quote: 'みらいは、わたしが きめる。',
    weapon: '⏳', hat: '🎩', aura: '🌊', spark: '🔷',
    color: '#004098', ink: '#002a63', hair: '#4dabf7', skin: '#ffe0c2',
    me: 'わたし', end: 'なの',
    power: 1.25,
    attack: 'タイム・ボルト',
    special: 'クロノ・ハーバーフラッシュ',
  },
  {
    id: 'maruka',
    name: 'マルカ',
    line: '丸ノ内線',
    company: '東京メトロ',
    symbol: 'M',
    cls: 'だいまどうし',
    tag: 'ちかてつなのに そとに でちゃう てんさい',
    quote: 'ふふ… ちょっと ほんき だすね?',
    weapon: '🔮', hat: '🎀', aura: '💫', spark: '🔮',
    color: '#f62e36', ink: '#9c1216', hair: '#f3b1d6', skin: '#ffe0c2',
    me: 'わたし', end: 'なの',
    power: 1.30,
    attack: 'マジック・ボルト',
    special: 'サインウェーブ・メテオ',
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
