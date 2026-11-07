'use strict';
/*
 * こうじょう けんがく — こうじょう ごと の こうてい データ（DOM なし）
 *
 * こうてい は いっぱんてき な つくりかた（きょうかしょ・ぎょうかい だんたい の こども むけ しりょう に そう）。
 * じつざい の 会社名・商品名・ロゴ は つかわない。すうじ は「やく」で まるめる。
 * もじ は ひらがな ちゅうしん。かんじ を つかう ときは {漢字|よみ} と かく（がめん では ふりがな に なる）。
 *
 * step:
 *   id    … ライン の なか で ゆいいつ
 *   name  … こうてい の なまえ（じゅんばん パズル の カード にも でる）
 *   emoji … カード・かんばん の え
 *   op    … そうさ の しゅるい（OPS を みる）
 *   n     … なんかい やるか（そうさ に よる）
 *   text  … せつめい 1〜2ぎょう
 *   mat   … ざいりょう の いろ
 *   adult … ほんもの は おとな が うごかす（あつい・はもの）
 *   temp  … おんど の めやす（timing の めもり）
 */

const OPS = {
  stir:   { how: 'ぐるぐる なぞって まわそう', unit: 'しゅう' },
  swipe:  { how: 'したへ シュッ！と なぞろう', unit: 'かい' },
  timing: { how: 'はりが みどり に きたら「ストップ」', unit: 'かい' },
  drag:   { how: 'ゆびで つかんで はこぼう', unit: 'こ' },
  shake:  { how: 'よこに ゆびを うごかして ゆすろう', unit: 'かい' },
  tap:    { how: 'ボタンを ポンポン おそう', unit: 'かい' },
  hold:   { how: 'ボタンを おしつづけよう', unit: '' },
  watch:  { how: 'おとな に おねがい して みて いよう', unit: '' },
  sort:   { how: 'ただしい はこ を タップ', unit: 'こ' },
  pick:   { how: 'すきな ものを えらぼう', unit: '' },
  find:   { how: 'ひび の ある ものを タップ', unit: 'こ' },
};

const LINES = [
  {
    id: 'enpitsu', factory: 'enpitsu', emoji: '✏️', name: 'えんぴつ', product: 'えんぴつ',
    color: '#f59f00', tint: '#fff4e6',
    bgm: { bpm: 116, wave: 'triangle', root: 60, notes: [0, 4, 7, 4, 5, 9, 7, null, 0, 4, 7, 12, 11, 7, 9, null] },
    steps: [
      { id: 'mazeru', name: 'こくえん と ねんど を まぜる', emoji: '🥣', op: 'stir', n: 3, mat: '#495057',
        text: 'くろい こな「こくえん」と ねんど を みず と いっしょに よく まぜる。ねんど が おおいと かたい しん に なる よ。' },
      { id: 'oshidasu', name: 'ほそく おしだす', emoji: '➖', op: 'swipe', n: 3, mat: '#343a40',
        text: 'まぜた ものを ちいさな あな から ぎゅーっと おしだして、ほそい ひも に する。' },
      { id: 'yaku', name: 'やいて しん に する', emoji: '🔥', op: 'watch', mat: '#212529', adult: true,
        text: 'かわかして から、とても あつい かま（やく 1000ど）で やくと、かたい しん に なる。' },
      { id: 'mizo', name: 'いた に みぞ を ほる', emoji: '🪵', op: 'swipe', n: 3, mat: '#e8b77a', adult: true,
        text: 'うすい き の いた に、しん が はいる ほそい みぞ を ならべて ほる。' },
      { id: 'hasamu', name: 'しん を はさむ', emoji: '🥪', op: 'drag', n: 1, mat: '#e8b77a',
        text: 'みぞ に しん を ならべて、もう 1まい の いた で ぴったり はさんで のり で くっつける。' },
      { id: 'kiru', name: 'いっぽん ずつ きる', emoji: '🔪', op: 'swipe', n: 3, mat: '#d9a066', adult: true,
        text: 'はさんだ いた を、きかい で 1ぽん ずつ の かたち に きりわける。' },
      { id: 'nuru', name: 'いろ を ぬる', emoji: '🎨', op: 'pick', mat: '#d9a066',
        kind: 'color',
        opts: [
          { id: 'aka', label: 'あか', color: '#e03131' },
          { id: 'ao', label: 'あお', color: '#1c7ed6' },
          { id: 'midori', label: 'みどり', color: '#2f9e44' },
          { id: 'kiiro', label: 'きいろ', color: '#f2c200' },
          { id: 'murasaki', label: 'むらさき', color: '#7048e8' },
          { id: 'pinku', label: 'ピンク', color: '#f06595' },
        ],
        text: 'いろ を なんかい も かさねて ぬって、つやつや に する。きみ は なにいろ に する？' },
      { id: 'kezuru', name: 'けずって みる', emoji: '✏️', op: 'stir', n: 2, mat: '#f1d3a6',
        text: 'さいご に けずって、ちゃんと かける か ためす。これで かんせい！' },
    ],
  },
  {
    id: 'kami', factory: 'kami', emoji: '📄', name: 'かみ（き から）', product: 'かみ の ロール',
    color: '#2f9e44', tint: '#ebfbee',
    bgm: { bpm: 104, wave: 'sine', root: 62, notes: [0, 2, 4, 7, 9, 7, 4, 2, 0, null, 4, 7, 9, 12, 9, null] },
    steps: [
      { id: 'chip', name: 'き を チップ に する', emoji: '🌲', op: 'swipe', n: 3, mat: '#b08968', adult: true,
        text: 'き を きかい で こまかく くだいて、ちいさな「チップ」に する。' },
      { id: 'niru', name: 'にて パルプ に する', emoji: '♨️', op: 'hold', mat: '#c9a227', adult: true,
        text: 'チップ を くすり と いっしょに ぐつぐつ にる と、ほそい せんい「パルプ」が とれる。' },
      { id: 'mizu', name: 'みず と まぜる', emoji: '💧', op: 'stir', n: 3, mat: '#e9ecef',
        text: 'パルプ を たくさん の みず と まぜる。ほとんど が みず の、うすい おかゆ みたい に なる。' },
      { id: 'suku', name: 'あみ で すく', emoji: '🕸️', op: 'shake', n: 8, mat: '#f8f9fa',
        text: 'あみ の うえ に ながして ゆすると、みず が おちて せんい が からみあい、かみ の もと に なる。' },
      { id: 'shiboru', name: 'しぼって みず を だす', emoji: '🗜️', op: 'swipe', n: 3, mat: '#f1f3f5',
        text: 'ローラー で ぎゅっと はさんで、みず を しぼりだす。' },
      { id: 'kawakasu', name: 'あつい ローラー で かわかす', emoji: '🌡️', op: 'hold', mat: '#ffffff', adult: true,
        text: 'あつい ローラー を いくつも とおして、すっかり かわかす。' },
      { id: 'maku', name: 'おおきな ロール に まく', emoji: '🧻', op: 'stir', n: 3, mat: '#ffffff',
        text: 'できた かみ を おおきな ロール に まきとる。これを きって ノート や はこ に する よ。' },
    ],
  },
  {
    id: 'kami-recycle', factory: 'kami', emoji: '♻️', name: 'かみ（ふるい かみ から）', product: 'リサイクル の かみ',
    color: '#2b8a3e', tint: '#ebfbee',
    bgm: { bpm: 104, wave: 'sine', root: 62, notes: [0, 4, 2, 7, 4, 9, 7, null, 12, 9, 7, 4, 2, 4, 0, null] },
    steps: [
      { id: 'atsumeru', name: 'ふるい かみ を あつめる', emoji: '📰', op: 'drag', n: 3, mat: '#ced4da',
        text: 'しんぶん・ざっし・だんボール を しゅるい ごと に あつめて、こうじょう に はこぶ。' },
      { id: 'tokasu', name: 'みず で ほぐす', emoji: '🌀', op: 'stir', n: 3, mat: '#dee2e6',
        text: 'おおきな タンク で みず と いっしょに まぜて、かみ を ばらばら の せんい に もどす。' },
      { id: 'gomi', name: 'ゴミ を とる', emoji: '📎', op: 'sort', n: 6, mat: '#dee2e6',
        bins: [
          { id: 'sen', label: 'せんい', emoji: '🤍' },
          { id: 'gomi', label: 'ゴミ', emoji: '🗑️' },
        ],
        items: [
          { id: 'sen', emoji: '🤍', label: 'せんい', bin: 'sen' },
          { id: 'hochikisu', emoji: '📎', label: 'はり', bin: 'gomi' },
          { id: 'tape', emoji: '🩹', label: 'テープ', bin: 'gomi' },
          { id: 'sen2', emoji: '🤍', label: 'せんい', bin: 'sen' },
          { id: 'hotchkiss2', emoji: '📌', label: 'ピン', bin: 'gomi' },
          { id: 'sen3', emoji: '🤍', label: 'せんい', bin: 'sen' },
        ],
        text: 'ホッチキス の はり や テープ など、かみ では ない もの を とりのぞく。' },
      { id: 'ink', name: 'あわ で インク を とる', emoji: '🫧', op: 'tap', n: 5, mat: '#adb5bd',
        text: 'こまかい あわ を ふきこむ と、インク が あわ に くっついて うかぶ。それを すくって とる。' },
      { id: 'suku', name: 'あみ で すく', emoji: '🕸️', op: 'shake', n: 8, mat: '#f8f9fa',
        text: 'あみ の うえ で ゆすって、みず を おとし ながら かみ の かたち に する。' },
      { id: 'kawakasu', name: 'しぼって かわかす', emoji: '🌡️', op: 'hold', mat: '#f8f9fa', adult: true,
        text: 'ローラー で しぼって から、あつい ローラー で かわかす。' },
      { id: 'maku', name: 'ロール に まく', emoji: '🧻', op: 'stir', n: 3, mat: '#f1f3f5',
        text: 'まきとって かんせい。ふるい かみ が、あたらしい かみ に うまれかわった！' },
    ],
  },
  {
    id: 'choco', factory: 'choco', emoji: '🍫', name: 'チョコレート', product: 'チョコレート',
    color: '#8c5a3c', tint: '#fff4e6',
    bgm: { bpm: 96, wave: 'triangle', root: 57, notes: [0, 3, 7, 10, 7, 3, 5, null, 0, 3, 7, 12, 10, 7, 5, null] },
    steps: [
      { id: 'iru', name: 'カカオ まめ を いる', emoji: '🫘', op: 'hold', mat: '#7f5539', adult: true,
        text: 'カカオ の まめ を おおきな ドラム で いる（やく 130ど）。こうばしい におい が する よ。' },
      { id: 'kudaku', name: 'から を とって くだく', emoji: '🥜', op: 'swipe', n: 3, mat: '#6f4518', adult: true,
        text: 'まめ を くだいて、かるい から を かぜ で とばし、なかみ だけ に する。' },
      { id: 'suritsubusu', name: 'すりつぶす', emoji: '⚙️', op: 'stir', n: 3, mat: '#5e3a1a',
        text: 'なかみ を すりつぶす と、どろっと した「カカオ マス」に なる。' },
      { id: 'neru', name: 'さとう と ミルク を まぜて ねる', emoji: '🥛', op: 'shake', n: 8, mat: '#7b4a2a',
        text: 'さとう や ミルク を まぜて、なんじかん も ねりつづける と、なめらか に なる。' },
      { id: 'temper', name: 'おんど を あげさげ する', emoji: '🌡️', op: 'timing', n: 2, mat: '#6b3e22',
        temp: 'やく 30ど', zone: [0.44, 0.62],
        text: 'いちど ひやして、また すこし あたためる（テンパリング）。ちょうど の おんど だと つやつや に かたまる。' },
      { id: 'nagasu', name: 'かた に ながす', emoji: '🫗', op: 'drag', n: 1, mat: '#6b3e22',
        text: 'とろとろ の チョコ を かた に ながして、トントン して くうき を ぬく。' },
      { id: 'hiyasu', name: 'ひやして かためる', emoji: '❄️', op: 'hold', mat: '#5e3a1a',
        text: 'つめたい トンネル を とおして かためたら、かた から だして かんせい！' },
    ],
  },
  {
    id: 'pet', factory: 'pet', emoji: '♻️', name: 'ペットボトル リサイクル', product: 'リサイクル',
    color: '#1c7ed6', tint: '#e7f5ff',
    bgm: { bpm: 120, wave: 'square', root: 64, notes: [0, null, 7, 4, 0, null, 9, 7, 5, null, 4, 2, 0, 2, 4, null] },
    steps: [
      { id: 'atsumeru', name: 'あつめる', emoji: '🚚', op: 'drag', n: 3, mat: '#a5d8ff',
        text: 'まち の かいしゅう ばこ から、つかいおわった ペットボトル を あつめて はこぶ。' },
      { id: 'shiwake', name: 'キャップ・ラベル を わける', emoji: '🔀', op: 'sort', n: 6, mat: '#a5d8ff',
        bins: [
          { id: 'cap', label: 'キャップ', emoji: '🔴' },
          { id: 'label', label: 'ラベル', emoji: '🏷️' },
          { id: 'bottle', label: 'ボトル', emoji: '🧴' },
        ],
        items: [
          { id: 'cap', emoji: '🔴', label: 'キャップ', bin: 'cap' },
          { id: 'label', emoji: '🏷️', label: 'ラベル', bin: 'label' },
          { id: 'bottle', emoji: '🧴', label: 'ボトル', bin: 'bottle' },
          { id: 'cap2', emoji: '🔵', label: 'キャップ', bin: 'cap' },
          { id: 'bottle2', emoji: '🧴', label: 'ボトル', bin: 'bottle' },
          { id: 'label2', emoji: '🏷️', label: 'ラベル', bin: 'label' },
        ],
        text: 'キャップ と ラベル は ちがう ざいりょう。ボトル と べつべつ に わける と リサイクル しやすい。' },
      { id: 'arau', name: 'あらう', emoji: '🫧', op: 'shake', n: 8, mat: '#d0ebff',
        text: 'みず で ごしごし あらって、よごれ や のこった のみもの を おとす。' },
      { id: 'kudaku', name: 'こまかく くだく', emoji: '🧩', op: 'swipe', n: 3, mat: '#d0ebff', adult: true,
        text: 'きかい で こまかく くだいて、「フレーク」と いう ちいさな かけら に する。' },
      { id: 'tokasu', name: 'とかして つぶ に する', emoji: '🔥', op: 'watch', mat: '#e7f5ff', adult: true,
        text: 'フレーク を あつく して（やく 260ど）とかし、ちいさな つぶ「ペレット」に する。' },
      { id: 'tsukuru', name: 'あたらしい もの に する', emoji: '✨', op: 'pick', mat: '#e7f5ff',
        kind: 'thing',
        opts: [
          { id: 'bottle', label: 'あたらしい ボトル', emoji: '🧴', color: '#74c0fc' },
          { id: 'fuku', label: 'ふく の いと', emoji: '👕', color: '#4dabf7' },
        ],
        text: 'ペレット から、また ボトル が できたり、のばして いと に して ふく に したり する よ。' },
    ],
  },
  {
    id: 'glass', factory: 'glass', emoji: '🫙', name: 'ガラス', product: 'ガラス の びん',
    color: '#0c8599', tint: '#e3fafc',
    bgm: { bpm: 100, wave: 'sine', root: 67, notes: [0, 7, 12, 7, 4, 7, 11, null, 0, 7, 12, 14, 12, 7, 4, null] },
    steps: [
      { id: 'mazeru', name: 'すな など を まぜる', emoji: '⏳', op: 'stir', n: 3, mat: '#e9d8a6',
        text: 'けいしゃ（すな）・ソーダばい・いしばい と、くだいた ふるい ガラス を まぜる。' },
      { id: 'tokasu', name: 'あつい ろ で とかす', emoji: '🔥', op: 'watch', mat: '#ff922b', adult: true,
        text: 'とても あつい ろ（やく 1500ど）で どろどろ に とかす。あぶない ので おとな が うごかす。' },
      { id: 'kiru', name: 'ちょうど の りょう に きる', emoji: '✂️', op: 'timing', n: 1, mat: '#ffa94d', adult: true,
        temp: 'ちょうど', zone: [0.42, 0.6],
        text: 'ながれおちる ガラス を、びん 1こ ぶん の りょう で きる。' },
      { id: 'kata', name: 'かた に いれる', emoji: '📥', op: 'drag', n: 1, mat: '#ffa94d',
        text: 'きった ガラス の かたまり を、びん の かた に おとす。' },
      { id: 'fuku', name: 'くうき を ふきこむ', emoji: '💨', op: 'tap', n: 5, mat: '#ffc078',
        text: 'くうき を ふきこんで、かた の かたち に ふくらませる。' },
      { id: 'hiyasu', name: 'ゆっくり ひやす', emoji: '🌬️', op: 'hold', mat: '#c5f6fa',
        text: 'きゅう に ひやす と われる ので、トンネル の なか で じかん を かけて ゆっくり ひやす。' },
      { id: 'shiraberu', name: 'ひび が ないか しらべる', emoji: '🔍', op: 'find', n: 2, mat: '#c5f6fa',
        text: 'ひび や きず が ないか、ひとつ ずつ しらべる。だめ な もの は また とかして つかう。' },
    ],
  },
];

const FACTORIES = [
  { id: 'enpitsu', emoji: '✏️', name: 'えんぴつ', desc: 'こくえん から えんぴつ が できる まで', lines: ['enpitsu'], color: '#f59f00' },
  { id: 'kami', emoji: '📄', name: 'かみ', desc: 'き や ふるい かみ から かみ が できる', lines: ['kami', 'kami-recycle'], color: '#2f9e44' },
  { id: 'choco', emoji: '🍫', name: 'チョコレート', desc: 'カカオ まめ が チョコ に なる まで', lines: ['choco'], color: '#8c5a3c' },
  { id: 'pet', emoji: '♻️', name: 'ペットボトル リサイクル', desc: 'つかった ボトル が うまれかわる', lines: ['pet'], color: '#1c7ed6' },
  { id: 'glass', emoji: '🫙', name: 'ガラス', desc: 'すな から ガラス の びん が できる', lines: ['glass'], color: '#0c8599' },
];

const KojoLines = { OPS, LINES, FACTORIES, line: (id) => LINES.find((l) => l.id === id) };
if (typeof module !== 'undefined' && module.exports) module.exports = KojoLines;
else window.KojoLines = KojoLines;
