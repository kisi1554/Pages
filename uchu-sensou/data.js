'use strict';

/*
 * うちゅう せんそう の データ（わくせい・てき・ウェーブ・ショップ・まめちしき）。
 * - ことばは ひらがな ちゅうしん。漢字は [漢字|かんじ] の ふりがな つき（tools/uchu-sensou/test.js が しらべる）。
 * - わくせい の mass は じゅうりょく の つよさ（Sim.G × mass ÷ きょり²）。0 なら じゅうりょく なし（たま を ふせぐ いわ）。
 * - ウェーブ は [てき, かず, あいだ(びょう), はじまり(びょう)] の ならび。
 */
const DATA = (() => {
  const g = (type, n, gap, start) => [type, n, gap || 1, start || 0];

  const ENEMIES = {
    drone: { name: 'ちびドローン', hp: 1, r: 14, speed: 120, kind: 'rush', dmg: 6, score: 10, drop: 1, color: '#ff6b6b' },
    rock: { name: 'いんせき ロボ', hp: 6, r: 26, speed: 70, kind: 'rush', dmg: 14, score: 20, drop: 2, color: '#a68a64' },
    orbit: { name: 'くるくる', hp: 3, r: 16, speed: 150, kind: 'orbit', orbitR: 300, score: 20, drop: 2, color: '#ffa94d',
      fire: { every: 2.6, speed: 220, n: 1, spread: 0, at: 'base' } },
    shield: { name: 'たてロボ', hp: 4, r: 18, speed: 105, kind: 'shield', dmg: 10, score: 30, drop: 3, color: '#74c0fc' },
    spread: { name: 'ばらまき', hp: 5, r: 20, speed: 110, kind: 'spread', keep: 380, score: 40, drop: 4, color: '#b197fc',
      fire: { every: 3, speed: 200, n: 5, spread: 0.35, at: 'player' } },
    boss: { name: 'ギギガー こうかん', hp: 60, r: 56, speed: 60, kind: 'boss', orbitR: 440, score: 500, drop: 30, color: '#e03131',
      fire: { every: 3.2, speed: 190, n: 12, ring: true }, spawn: { every: 8, type: 'drone', n: 3 } },
    king: { name: 'ギギガー だいおう', hp: 130, r: 72, speed: 55, kind: 'boss', orbitR: 470, score: 1500, drop: 60, color: '#9c36b5',
      fire: { every: 2.8, speed: 200, n: 16, ring: true }, spawn: { every: 7, type: 'shield', n: 2 } },
  };

  const HOME = { name: 'ぼくらの ほし', x: 0, y: 0, r: 90, mass: 5, color: '#4dabf7', color2: '#2b8a3e', home: true };

  const SECTORS = [
    {
      id: 'tsuki', name: 'つき の まえ', emoji: '🌙', R: 1250,
      planets: [HOME, { name: 'つき', x: 560, y: -280, r: 42, mass: 3, color: '#dee2e6', color2: '#adb5bd' }],
      fact: '[月|つき]は ちきゅうの まわりを やく 27にちで 1しゅう するよ。まいとし やく 4センチ ずつ ちきゅうから はなれて いるんだ。',
      waves: [
        [g('drone', 6, 1.0)],
        [g('drone', 8, 0.7)],
        [g('drone', 6, 0.8), g('orbit', 2, 3, 2)],
        [g('drone', 10, 0.6), g('rock', 2, 4, 3)],
        [g('orbit', 3, 2), g('drone', 8, 0.7, 2)],
        [g('drone', 12, 0.5), g('orbit', 2, 3, 3)],
        [g('drone', 10, 0.6), g('orbit', 3, 2.5, 1), g('rock', 3, 3, 4)],
        [g('boss', 1, 1), g('drone', 6, 1.2, 4)],
      ],
    },
    {
      id: 'kasei', name: 'かせい の ちかく', emoji: '🔴', R: 1300,
      planets: [HOME,
        { name: 'かせい', x: -580, y: 320, r: 64, mass: 6, color: '#e8590c', color2: '#a63e0a' },
        { name: 'フォボス', x: -380, y: 470, r: 18, mass: 1, color: '#adb5bd', color2: '#868e96' }],
      fact: '[火星|かせい]が あかいのは、すなに さびた てつが まざって いるから。エベレストの 2ばい いじょう たかい やま「オリンポスさん」が あるよ。',
      waves: [
        [g('drone', 8, 0.7)],
        [g('shield', 3, 2), g('drone', 6, 0.8, 1)],
        [g('orbit', 3, 2), g('drone', 8, 0.6, 1)],
        [g('shield', 5, 1.6), g('rock', 2, 3, 2)],
        [g('drone', 12, 0.5), g('orbit', 3, 2, 2)],
        [g('shield', 6, 1.4), g('orbit', 3, 2, 3)],
        [g('drone', 14, 0.45), g('shield', 4, 1.8, 2), g('rock', 3, 3, 3)],
        [g('boss', 1, 1), g('shield', 4, 2.5, 5)],
      ],
    },
    {
      id: 'mokusei', name: 'もくせい の うず', emoji: '🟠', R: 1400,
      planets: [HOME,
        { name: 'もくせい', x: 650, y: 180, r: 140, mass: 30, color: '#e9b77a', color2: '#b5793f', bands: true }],
      fact: '[木星|もくせい]は いちばん おおきな わくせい。もようの「だいせきはん」は ちきゅうより おおきな あらしだよ。',
      waves: [
        [g('drone', 10, 0.6)],
        [g('spread', 2, 3), g('drone', 8, 0.7, 1)],
        [g('orbit', 4, 1.6), g('shield', 3, 2, 2)],
        [g('spread', 3, 2.5), g('drone', 10, 0.5, 1)],
        [g('rock', 4, 2), g('orbit', 4, 1.5, 1)],
        [g('spread', 4, 2), g('shield', 4, 1.6, 2)],
        [g('drone', 16, 0.4), g('spread', 3, 2.5, 2), g('orbit', 3, 2, 4)],
        [g('boss', 1, 1), g('spread', 2, 6, 6), g('drone', 6, 1, 3)],
      ],
    },
    {
      id: 'dosei', name: 'どせい の わ', emoji: '🪐', R: 1400,
      planets: [HOME,
        { name: 'どせい', x: -640, y: -380, r: 110, mass: 20, color: '#f1d18a', color2: '#c59b4a', ring: true }],
      // わ の いわ（じゅうりょく なし。たま を ふせぐ）
      rocks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter((i) => i % 3 !== 2).map((i) => {
        const a = (i / 12) * Math.PI * 2 + 0.2;
        return { x: Math.cos(a) * 340, y: Math.sin(a) * 340, r: 22 + (i % 2) * 8, mass: 0, color: '#868e96', color2: '#495057', rock: true };
      }),
      fact: '[土星|どせい]の わは こおりや いわの つぶ。どせいは みずに うくほど かるい わくせいだよ。',
      waves: [
        [g('drone', 10, 0.6), g('orbit', 2, 2, 2)],
        [g('shield', 4, 1.6), g('spread', 2, 3, 2)],
        [g('rock', 5, 1.6), g('drone', 10, 0.5, 1)],
        [g('orbit', 5, 1.4), g('spread', 3, 2.5, 2)],
        [g('shield', 6, 1.2), g('drone', 12, 0.45, 1)],
        [g('spread', 4, 2), g('orbit', 4, 1.6, 1), g('rock', 3, 3, 3)],
        [g('drone', 18, 0.35), g('shield', 5, 1.6, 2), g('spread', 3, 2.5, 4)],
        [g('boss', 1, 1), g('boss', 1, 1, 14), g('orbit', 4, 2, 4)],
      ],
    },
    {
      id: 'blackhole', name: 'ブラックホール', emoji: '🕳️', R: 1450,
      planets: [HOME,
        { name: 'ブラックホール', x: 880, y: -330, r: 46, mass: 50, color: '#000000', color2: '#5f3dc4', bh: true }],
      fact: 'ブラックホールは じゅうりょくが とても つよくて、ひかりさえ にげられない。ちかづきすぎに ちゅうい！',
      waves: [
        [g('drone', 12, 0.5), g('orbit', 2, 2, 2)],
        [g('shield', 5, 1.4), g('spread', 2, 3, 2)],
        [g('orbit', 5, 1.4), g('rock', 4, 2, 1)],
        [g('spread', 4, 2), g('drone', 14, 0.4, 1)],
        [g('shield', 7, 1.2), g('orbit', 4, 1.5, 2)],
        [g('spread', 4, 2), g('rock', 3, 2, 2), g('drone', 10, 0.6, 3)],
        [g('drone', 16, 0.4), g('shield', 5, 1.6, 2), g('spread', 3, 2.4, 4)],
        [g('king', 1, 1), g('drone', 8, 1.5, 6)],
      ],
    },
  ];

  // ショップ（ウェーブ 3・6 の あと）。lv ごとの ねだん。
  const SHOP = [
    { id: 'rapid', emoji: '⚡', name: 'れんしゃ アップ', desc: 'たまが はやく でる', cost: [15, 30, 50] },
    { id: 'spread', emoji: '🔱', name: 'ひろがり ショット', desc: 'たまが 3つ → 5つ', cost: [20, 45] },
    { id: 'ally', emoji: '🛸', name: 'なかま メカ', desc: 'まわりを とんで いっしょに うつ（3きまで）', cost: [20, 30, 40] },
    { id: 'bomb', emoji: '💫', name: 'スターボム +1', desc: 'てきの たまを けして まわりに おおダメージ', cost: [12, 12, 12, 12, 12] },
    { id: 'repair', emoji: '🛠️', name: 'バリア しゅうり', desc: 'ぼくらの ほしの バリアを 30 かいふく', cost: [10, 10, 10, 10, 10, 10, 10, 10] },
    { id: 'turret', emoji: '🗼', name: 'ほし の たいほう', desc: 'ぼくらの ほしが じどうで うつ（2きまで）', cost: [35, 50] },
  ];

  const STORY = 'ガラクタ ロボットの「ギギガー ぐんだん」が、ぼくらの ほしに せめて きた！ うちゅう パトロールたいの きみが まもろう。たおした ロボットは スターかけらに もどるよ。';

  const TIPS = [
    'わくせいの ちかくを とおる たまは、じゅうりょくで まがるよ。',
    'たまは じどうで ちかくの てきに とんで いくよ。うごいて ねらおう。',
    'たてロボは まえを たてで まもって いる。うしろや よこから うとう！',
    'こまったら 💫 スターボム。てきの たまが ぜんぶ きえるよ。',
    'スターかけらは ショップで つかえる。なかま メカは たよりに なるよ。',
  ];

  return { ENEMIES, SECTORS, SHOP, STORY, TIPS };
})();

if (typeof module !== 'undefined') module.exports = DATA;
