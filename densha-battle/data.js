'use strict';

/*
 * でんしゃバトル: データ
 *
 *  FIGHTERS … プレイヤーが えらぶ でんしゃキャラ
 *             なまえ・いろ・口ぐせは「でんしゃトーク」(../densha-talk/knowledge.js)と そろえてある
 *  VEGGIES  … てきの 野菜モンスター
 *  WAVES    … 何波めに どの モンスターが おしよせるか
 *
 *   power    … こうげき力の ばいりつ(1.0 が ふつう)
 *   spark    … こうげき えんしゅつで とびちる きらきら の えもじ
 */

const FIGHTERS = [
  {
    id: 'yamanoten',
    name: 'やまのてん',
    tag: 'とうきょうを ぐるぐる',
    hat: '🔁', aura: '💫', face: '😃', spark: '💫',
    color: '#9acd32', ink: '#4f7a06',
    me: 'ぼく', end: 'だよ',
    power: 1.0,
    attack: 'ぐるぐる アタック',
    special: 'エンドレス・サークル',
    line: '山手線',
  },
  {
    id: 'keikyu',
    name: 'けいきゅん',
    tag: 'あかくて とっても はやい',
    hat: '🔥', aura: '💨', face: '😆', spark: '🔥',
    color: '#e5171f', ink: '#9b0d13',
    me: 'おれ', end: 'だぜ',
    power: 1.25,
    attack: 'かっとび ダッシュ',
    special: 'まっかっか とっきゅう',
    line: '京急本線',
  },
  {
    id: 'toyoko',
    name: 'とうよこくん',
    tag: 'しぶやから よこはま',
    hat: '🎧', aura: '✨', face: '😎', spark: '✨',
    color: '#e6003e', ink: '#8f0026',
    me: 'ぼく', end: 'さ',
    power: 1.1,
    attack: 'とっきゅう キック',
    special: 'みなとまち エクスプレス',
    line: '東急東横線',
  },
  {
    id: 'ginjiro',
    name: 'ぎんじろう',
    tag: 'にほん さいしょの ちかてつ',
    hat: '🎩', aura: '🕰️', face: '🧐', spark: '⚡',
    color: '#ff9500', ink: '#a35c00',
    me: 'わし', end: 'じゃ',
    power: 1.15,
    attack: 'レトロ ビーム',
    special: 'ちかてつ ゴールドラッシュ',
    line: '銀座線',
  },
  {
    id: 'maruko',
    name: 'まるこ',
    tag: 'ちかてつなのに そとに でる',
    hat: '🎀', aura: '💬', face: '😄', spark: '💖',
    color: '#f62e36', ink: '#a3151b',
    me: 'わたし', end: 'なの',
    power: 1.05,
    attack: 'まるまる パンチ',
    special: 'サインウェーブ・ストーム',
    line: '丸ノ内線',
  },
  {
    id: 'roman',
    name: 'ろまんちゃん',
    tag: 'はこねへ いく とっきゅう',
    hat: '👑', aura: '✨', face: '😊', spark: '🌟',
    color: '#0068b7', ink: '#00457a',
    me: 'わたし', end: 'ね',
    power: 1.2,
    attack: 'ロマンス アロー',
    special: 'はこね スーパーひかり',
    line: '小田急ロマンスカー',
  },
  {
    id: 'burukun',
    name: 'ぶるくん',
    tag: 'よこはまの ちかてつ',
    hat: '⛑️', aura: '🔦', face: '😁', spark: '🔷',
    color: '#0067c0', ink: '#00427a',
    me: 'ぼく', end: 'だよ',
    power: 1.0,
    attack: 'トンネル タックル',
    special: 'ブルーライン・ラッシュ',
    line: '横浜市営ブルーライン',
  },
  {
    id: 'rinkai',
    name: 'りんかくん',
    tag: 'うみべの ながい トンネル',
    hat: '🐟', aura: '🫧', face: '😄', spark: '🫧',
    color: '#005bac', ink: '#003a70',
    me: 'ぼく', end: 'だよ',
    power: 1.05,
    attack: 'うみかぜ スラッシュ',
    special: 'オーシャン トルネード',
    line: 'りんかい線',
  },
  {
    id: 'mimi',
    name: 'みらいちゃん',
    tag: 'よこはまの みなとの した',
    hat: '🎡', aura: '🌊', face: '😊', spark: '🌊',
    color: '#004098', ink: '#002a63',
    me: 'わたし', end: 'なの',
    power: 1.1,
    attack: 'みなと ウェーブ',
    special: 'かんらんしゃ フラッシュ',
    line: 'みなとみらい線',
  },
  {
    id: 'tokaido',
    name: 'とうかいくん',
    tag: 'にほん さいしょの てつどう',
    hat: '🏖️', aura: '🌅', face: '😌', spark: '🌅',
    color: '#F68B1E', ink: '#a15a08',
    me: 'ぼく', end: 'だよ',
    power: 1.15,
    attack: 'ロング ラン',
    special: 'サンライズ ブレイク',
    line: '東海道線',
  },
  {
    id: 'sotetsu',
    name: 'そうちゃん',
    tag: 'よこはま ⇔ えびな',
    hat: '⚓', aura: '💙', face: '🙂', spark: '💠',
    color: '#0071bc', ink: '#00477a',
    me: 'ぼく', end: 'んだ',
    power: 1.05,
    attack: 'ネイビー チャージ',
    special: 'そうてつ ブルーインパクト',
    line: '相鉄本線',
  },
  {
    id: 'denchan',
    name: 'でんちゃん',
    tag: 'みどりの まちを のんびり',
    hat: '🌿', aura: '💤', face: '🙂', spark: '🍃',
    color: '#20a288', ink: '#0d6b58',
    me: 'ぼく', end: 'だなあ',
    power: 0.95,
    attack: 'のんびり プレス',
    special: 'グリーンライン・ヒーリング',
    line: '田園都市線',
  },
  {
    id: 'musashino',
    name: 'むさしくん',
    tag: 'まちの そとがわを ぐるっと',
    hat: '🧭', aura: '🍃', face: '🙂', spark: '🧡',
    color: '#e4610f', ink: '#8a3a00',
    me: 'ぼく', end: 'よ',
    power: 1.1,
    attack: 'アウター サークル',
    special: 'むさしの グレートループ',
    line: '武蔵野線',
  },
  {
    id: 'joban',
    name: 'じょうばんくん',
    tag: 'うえの ⇔ つちうら',
    hat: '🪷', aura: '🌫️', face: '🙂', spark: '💚',
    color: '#00ac9a', ink: '#00695c',
    me: 'ぼく', end: 'だよ',
    power: 1.05,
    attack: 'エメラルド ブロー',
    special: 'じょうばん ミストブレイク',
    line: '常磐線',
  },
  {
    id: 'rizo',
    name: 'リゾちゃん',
    tag: 'ゆめのくにを まぁるく ぐるり',
    hat: '🎈', aura: '🌈', face: '😊', spark: '🎉',
    color: '#d81b60', ink: '#7a0f3a',
    me: 'わたし', end: 'なの',
    power: 1.1,
    attack: 'ドリーム シュート',
    special: 'ゆめのくに カーニバル',
    line: 'ディズニーリゾートライン',
  },
  {
    id: 'miya',
    name: 'みやちゃん',
    tag: 'とちぎまで はしる ながい でんしゃ',
    hat: '🥟', aura: '🌾', face: '😆', spark: '🌾',
    color: '#82AE43', ink: '#4f6b1e',
    me: 'わたし', end: 'よ',
    power: 1.0,
    attack: 'ぎょうざ パンチ',
    special: 'みや グリーンストーム',
    line: '宇都宮線',
  },
];



/* ============================================================
 * 野菜モンスター
 *
 *   size … s(ざこ) / m(ふつう) / l(おおきい) / boss
 *   てきの つよさは SIZE_SPEC で サイズごとに きまる。
 * ============================================================ */

const SIZE_SPEC = {
  s: { hp: 30, atk: 4, cd: 5.6, scale: 1.00, label: 'ざこ' },
  m: { hp: 62, atk: 6, cd: 6.2, scale: 1.28, label: 'ふつう' },
  l: { hp: 100, atk: 9, cd: 7.0, scale: 1.58, label: 'おおもの' },
};

const VEGGIES = [
  { id: 'ninjin',  name: 'ニンジーン',    emoji: '🥕', color: '#ff8c42', ink: '#a34d0f', size: 's', cry: 'ニンジン キーック!' },
  { id: 'tomaton', name: 'トマトン',      emoji: '🍅', color: '#ff5a5a', ink: '#a32020', size: 's', cry: 'トマト ばくだん!' },
  { id: 'piman',   name: 'ピーマング',    emoji: '🫑', color: '#4caf50', ink: '#256029', size: 's', cry: 'にがいぞー!' },
  { id: 'kyuri',   name: 'キューリー',    emoji: '🥒', color: '#69b34c', ink: '#33682a', size: 's', cry: 'ポリポリ こうげき!' },
  { id: 'ninniku', name: 'ニンニクー',    emoji: '🧄', color: '#e8e0d0', ink: '#8a7f6a', size: 's', cry: 'におい こうせん!' },
  { id: 'burokko', name: 'ブロッコリン',  emoji: '🥦', color: '#5cb85c', ink: '#2f6b2f', size: 'm', cry: 'もりもり タックル!' },
  { id: 'corn',    name: 'コーンガー',    emoji: '🌽', color: '#ffd93b', ink: '#a37a00', size: 'm', cry: 'つぶつぶ マシンガン!' },
  { id: 'nasu',    name: 'ナスビーム',    emoji: '🍆', color: '#9b6bd6', ink: '#4f2f7a', size: 'm', cry: 'むらさき ビーム!' },
  { id: 'tamanegi',name: 'タマネギング',  emoji: '🧅', color: '#e0b088', ink: '#8a5f30', size: 'm', cry: 'なみだが とまらない!' },
  { id: 'togarashi', name: 'トウガラシー', emoji: '🌶️', color: '#f4511e', ink: '#8f2a0a', size: 'm', cry: 'からーい ほのお!' },
  { id: 'jagaimo', name: 'ジャガイモス',  emoji: '🥔', color: '#c9a06a', ink: '#7a5a2f', size: 'l', cry: 'ゴロゴロ プレス!' },
  { id: 'hakusai', name: 'ハクサイダー',  emoji: '🥬', color: '#8bc34a', ink: '#4a7a1e', size: 'l', cry: 'はっぱ カッター!' },
  { id: 'satsuma', name: 'サツマイモン',  emoji: '🍠', color: '#d17ba5', ink: '#7a3a5a', size: 'l', cry: 'ほくほく ボンバー!' },
  { id: 'avocado', name: 'アボガドン',    emoji: '🥑', color: '#7cb342', ink: '#41631f', size: 'l', cry: 'たねを くらえ!' },
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
