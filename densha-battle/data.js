'use strict';

/*
 * でんしゃバトル: キャラクターと ステージの データ
 *
 * キャラの なまえ・いろ・口ぐせ は「でんしゃトーク」(../densha-talk/knowledge.js)と
 * そろえてある。ここでは それに バトル用の パラメータ(こうげき力・ひっさつわざ)を たしている。
 *
 *   power    … こうげき力の ばいりつ(1.0 が ふつう)
 *   hp       … てきとして でてきた ときの たいりょく
 *   special  … ひっさつわざの なまえ
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
    power: 1.0, hp: 70,
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
    power: 1.25, hp: 78,
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
    power: 1.1, hp: 74,
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
    power: 1.15, hp: 80,
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
    power: 1.05, hp: 72,
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
    power: 1.2, hp: 76,
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
    power: 1.0, hp: 72,
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
    power: 1.05, hp: 74,
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
    power: 1.1, hp: 74,
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
    power: 1.15, hp: 82,
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
    power: 1.05, hp: 76,
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
    power: 0.95, hp: 84,
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
    power: 1.1, hp: 78,
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
    power: 1.05, hp: 76,
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
    power: 1.1, hp: 72,
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
    power: 1.0, hp: 78,
    attack: 'ぎょうざ パンチ',
    special: 'みや グリーンストーム',
    line: '宇都宮線',
  },
];

/*
 * ラスボス。でんしゃトークには いない、この ゲームだけの オリジナル電車。
 * 「けいさんを きらいに する」ために はしってきた まっくろな とっきゅう。
 */
const BOSS = {
  id: 'yamikage',
  name: 'ヤミカゲごう',
  fullName: 'あんこく とっきゅう ヤミカゲごう',
  tag: 'けいさんを けす まっくろな とっきゅう',
  hat: '👹', aura: '🌑', face: '😈', spark: '🟣',
  color: '#2b1b48', ink: '#120a22',
  me: 'われ', end: 'なのだ',
  power: 1.6, hp: 170,
  attack: 'シャドウ クラッシュ',
  special: 'ダーク・トンネル',
  line: '???線',
  isBoss: true,
  intro: 'フフフ… けいさんなど できまい。まっくらな トンネルに とじこめてやるのだ!',
  defeat: 'バカな… こどもの けいさんに… まけるとは… うわああああ!',
};

/* てきが こうげきする ときの セリフ */
const ENEMY_TAUNTS = [
  'こんどは こっちの ばんだ!',
  'そーれ、いくぞー!',
  'まだまだ まけないよ!',
  'とっしーん!',
  'ふふん、すきありー!',
];

/* プレイヤーが せいかいした ときの かけごえ */
const HIT_WORDS = ['どっかーん!', 'ばっしゃーん!', 'ずどーん!', 'がっしゃーん!', 'ばきーん!'];

/* ステージ数(さいごの 1つが ボス) */
const STAGE_COUNT = 6;

/*
 * ステージを つくる。プレイヤーが えらんだ キャラは でてこない。
 * さきに いくほど てきの たいりょくと こうげき力が あがる。
 */
function buildStages(playerId) {
  const pool = FIGHTERS.filter((f) => f.id !== playerId);
  /* シャッフル */
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = pool[i];
    pool[i] = pool[j];
    pool[j] = t;
  }
  const stages = [];
  for (let i = 0; i < STAGE_COUNT - 1; i += 1) {
    const base = pool[i % pool.length];
    stages.push(Object.assign({}, base, {
      hp: Math.round(base.hp * (1.0 + i * 0.2)),
      power: base.power * (0.8 + i * 0.1),
    }));
  }
  stages.push(Object.assign({}, BOSS));
  return stages;
}
