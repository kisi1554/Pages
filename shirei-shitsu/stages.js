'use strict';

/*
 * ステージ データ。せんろ は「x,y x,y ...」の おれせん（x は 1ずつ、ななめ は x 2 で y 1 が きほん）。
 *   tunnels: でんしゃ が でて くる／きえる ところ（ばん の はし）
 *   spots: ホーム（①〜④）・しゃこ（S）・かもつ（K）
 *   signals: dir が ある もの は タップ できる しんごう（E: ひがし むき の でんしゃ よう、W: にし むき）。
 *            dir が ない もの は くかん の さかい だけ（じどう しんごう）。red: さいしょ あか、autoRed: でんしゃ が とおったら あか に もどる
 *   trains: { t: でて くる じこく, from: トンネル, goal: いく ホーム, to: でて いく トンネル（null なら しゃこ で おやすみ）, kind, next, pass }
 */
const STAGES = (() => {
  const TUN = {
    A: { id: 'A', emoji: '⛰️', name: 'やま' },
    B: { id: 'B', emoji: '🌊', name: 'うみ' },
    C: { id: 'C', emoji: '🌲', name: 'もり' },
    D: { id: 'D', emoji: '🏙️', name: 'まち' },
  };
  const tun = (id, x, y) => Object.assign({ x, y }, TUN[id]);
  const T = (t, from, goal, to, kind, extra) => Object.assign({ t, from, goal, to, kind: kind || 'local' }, extra || {});

  // ---------- せんろ ばん ----------
  const LAYOUT = {
    // ちいさな ターミナル（いきどまり の ホーム 2つ）
    t2: () => ({
      w: 20, h: 5,
      track: ['0,2 18,2', '6,2 8,3 18,3'],
      tunnels: [tun('A', 0, 2)],
      spots: [{ id: '1', y: 2, x0: 10, x1: 18 }, { id: '2', y: 3, x0: 10, x1: 18 }],
      signals: [{ x: 10, y: 2 }, { x: 10, y: 3 }],
      plats: [{ x0: 10.4, x1: 17.6, y0: 2.27, y1: 2.73 }],
      station: { name: 'はじまり えき', x: 14, y: 4.3 },
    }),
    // とおりぬけ の えき と いきどまり の ②
    s2: () => ({
      w: 20, h: 5,
      track: ['0,2 20,2', '5,2 7,3 15,3'],
      tunnels: [tun('A', 0, 2), tun('B', 20, 2)],
      spots: [{ id: '1', y: 2, x0: 8, x1: 14 }, { id: '2', y: 3, x0: 8, x1: 15 }],
      signals: [{ x: 8, y: 2 }, { x: 14, y: 2 }, { x: 8, y: 3 }],
      plats: [{ x0: 8.4, x1: 13.6, y0: 2.27, y1: 2.73 }],
      station: { name: 'のはら えき', x: 11, y: 4.3 },
    }),
    // たんせん の すれちがい えき
    p: (o) => ({
      w: 20, h: 5,
      track: ['0,2 20,2', '6,2 8,3 13,3 15,2'],
      tunnels: [tun('A', 0, 2), tun('B', 20, 2)],
      spots: [{ id: '1', y: 2, x0: 8, x1: 13 }, { id: '2', y: 3, x0: 8, x1: 13 }],
      signals: [
        { x: 3, y: 2, dir: 'E' }, { x: 17, y: 2, dir: 'W' },
        { x: 13, y: 2, dir: 'E', red: true, autoRed: true }, { x: 13, y: 3, dir: 'E', red: true, autoRed: true },
        { x: 8, y: 2, dir: 'W', red: true, autoRed: true }, { x: 8, y: 3, dir: 'W', red: true, autoRed: true },
      ],
      plats: [{ x0: 8.4, x1: 12.6, y0: 2.27, y1: 2.73 }],
      crossings: o && o.crossing ? [{ x: 1.5 }, { x: 18.5 }] : [],
      station: { name: 'やまあい えき', x: 10.5, y: 4.2 },
    }),
    // ふくせん の 4ばんせん えき
    q: () => ({
      w: 20, h: 5,
      track: ['0,2 20,2', '0,3 20,3', '3,2 5,1 15,1 17,2', '3,3 5,4 15,4 17,3'],
      tunnels: [tun('A', 0, 2), tun('B', 20, 2), tun('C', 0, 3), tun('D', 20, 3)],
      spots: [
        { id: '1', y: 1, x0: 6, x1: 14 }, { id: '2', y: 2, x0: 6, x1: 14 },
        { id: '3', y: 3, x0: 6, x1: 14 }, { id: '4', y: 4, x0: 6, x1: 14 },
      ],
      signals: [
        { x: 1, y: 2, dir: 'E' }, { x: 19, y: 3, dir: 'W' },
        { x: 14, y: 1, dir: 'E', red: true, autoRed: true }, { x: 14, y: 2, dir: 'E', red: true, autoRed: true },
        { x: 6, y: 3, dir: 'W', red: true, autoRed: true }, { x: 6, y: 4, dir: 'W', red: true, autoRed: true },
        { x: 6, y: 1 }, { x: 6, y: 2 }, { x: 14, y: 3 }, { x: 14, y: 4 }, { x: 18, y: 2 }, { x: 2, y: 3 },
      ],
      plats: [
        { x0: 6.4, x1: 13.6, y0: 0.27, y1: 0.73 },
        { x0: 6.4, x1: 13.6, y0: 2.27, y1: 2.73 },
        { x0: 6.4, x1: 13.6, y0: 4.27, y1: 4.73 },
      ],
      station: { name: 'ひろば えき', x: 10, y: -0.2 },
    }),
    // おおきな ターミナル（いきどまり 4ばんせん）
    r: () => ({
      w: 20, h: 5,
      track: ['2,2 20,2', '2,3 20,3', '14,2 12,1 2,1', '12,3 10,4 2,4', '12,2 14,3', '15,3 17,2'],
      tunnels: [tun('B', 20, 2), tun('D', 20, 3)],
      spots: [
        { id: '1', y: 1, x0: 3, x1: 10 }, { id: '2', y: 2, x0: 3, x1: 10 },
        { id: '3', y: 3, x0: 3, x1: 10 }, { id: '4', y: 4, x0: 3, x1: 10 },
      ],
      signals: [
        { x: 10, y: 1, dir: 'E', red: true, autoRed: true }, { x: 10, y: 2, dir: 'E', red: true, autoRed: true },
        { x: 10, y: 3, dir: 'E', red: true, autoRed: true }, { x: 10, y: 4, dir: 'E', red: true, autoRed: true },
        { x: 18, y: 2, dir: 'W' }, { x: 18, y: 3 },
      ],
      plats: [
        { x0: 3.3, x1: 9.6, y0: 1.27, y1: 1.73 },
        { x0: 3.3, x1: 9.6, y0: 3.27, y1: 3.73 },
      ],
      station: { name: 'みなと ターミナル', x: 1, y: 2.5, big: true },
    }),
    // しゃこ と かもつ の ある えき
    dp: (o) => ({
      w: 20, h: 5,
      track: ['0,2 20,2', '6,2 8,3 13,3 15,2', '5,2 4,1 1,1', '17,2 13,4 9,4'],
      tunnels: [tun('A', 0, 2), tun('B', 20, 2)],
      spots: [
        { id: '1', y: 2, x0: 8, x1: 13 }, { id: '2', y: 3, x0: 8, x1: 13 },
        { id: 'S', y: 1, x0: 1, x1: 4, kind: 'depot' }, { id: 'K', y: 4, x0: 9, x1: 13, kind: 'freight' },
      ],
      signals: [
        { x: 2, y: 2, dir: 'E' }, { x: 18, y: 2, dir: 'W' },
        { x: 13, y: 2, dir: 'E', red: true, autoRed: true }, { x: 13, y: 3, dir: 'E', red: true, autoRed: true },
        { x: 8, y: 2, dir: 'W', red: true, autoRed: true }, { x: 8, y: 3, dir: 'W', red: true, autoRed: true },
        { x: 4, y: 1 }, { x: 13, y: 4 },
      ],
      plats: [{ x0: 8.4, x1: 12.6, y0: 2.27, y1: 2.73 }],
      crossings: o && o.crossing ? [{ x: 19.3 }] : [],
      station: { name: 'くらまえ えき', x: 10.5, y: 0.7 },
    }),
  };

  const CHAPTERS = [
    { id: 1, emoji: '🚉', name: 'ちいさな えき', desc: 'ポイント を タップ して、でんしゃ を ①② の ホーム へ。' },
    { id: 2, emoji: '🚦', name: 'しんごう が でた', desc: '1ほん の せんろ で すれちがい。しゅっぱつ しんごう を あお に して だして あげよう。' },
    { id: 3, emoji: '🏙️', name: 'いそがしい ターミナル', desc: 'ホーム 4つ。ふつう・かいそく・きゅうこう（つうか）を さばこう。' },
    { id: 4, emoji: '🏠', name: 'しゃこ と かもつ', desc: 'しごと の おわった でんしゃ は しゃこ へ、かもつ れっしゃ は わき の せんろ へ。' },
    { id: 5, emoji: '❄️', name: 'ゆき の ひ', desc: 'ポイント が こおる！ ながおし で あたためて から きりかえよう。' },
  ];

  const SNOW = { every: 9 };
  const L = (name, o, extra) => Object.assign(LAYOUT[name](o), extra || {});

  const list = [
    // ---- 1. ちいさな えき
    Object.assign(L('t2'), {
      ch: 1, no: 1, title: 'はじめて の しれい',
      tip: 'でんしゃ の うえ の まる が いく ホーム。きいろ の ポイント を タップ すると レール が きりかわるよ。',
      trains: [T(2, 'A', '2', 'A'), T(24, 'A', '1', 'A'), T(46, 'A', '2', 'A')],
    }),
    Object.assign(L('s2'), {
      ch: 1, no: 2, title: 'とおりぬけ の えき',
      tip: '②ばんせん は いきどまり。②に いった でんしゃ は おりかえして もどるよ。でる とき の ポイント も わすれずに。',
      trains: [T(2, 'A', '1', 'B'), T(18, 'B', '1', 'A'), T(36, 'A', '2', 'A'), T(54, 'B', '1', 'A')],
    }),
    Object.assign(L('t2'), {
      ch: 1, no: 3, title: 'つぎつぎ くる',
      tip: 'まえ の でんしゃ が ホーム に いる あいだ に、つぎ の でんしゃ が くるよ。あいて いる ホーム へ！',
      trains: [T(2, 'A', '1', 'A'), T(13, 'A', '2', 'A'), T(34, 'A', '1', 'A'), T(46, 'A', '2', 'A'), T(68, 'A', '1', 'A')],
    }),
    Object.assign(L('s2'), {
      ch: 1, no: 4, title: 'りょうがわ から',
      tip: 'うみ の トンネル から も でんしゃ が くる。トンネル の まえ の「まもなく」を みて さき を よもう。',
      trains: [
        T(2, 'A', '1', 'B'), T(12, 'A', '2', 'A'), T(26, 'B', '1', 'A'),
        T(40, 'A', '2', 'A'), T(52, 'B', '1', 'A'), T(68, 'A', '1', 'B'),
      ],
    }),

    // ---- 2. しんごう が でた
    Object.assign(L('p'), {
      ch: 2, no: 1, title: 'しゅっぱつ しんごう',
      tip: 'ホーム の はし の しんごう は あか。のりおり が おわったら タップ して あお に すると でんしゃ が でるよ。',
      trains: [T(2, 'A', '1', 'B'), T(22, 'B', '2', 'A'), T(42, 'A', '1', 'B')],
    }),
    Object.assign(L('p'), {
      ch: 2, no: 2, title: 'えき で すれちがい',
      tip: 'せんろ は 1ほん。りょうほう から きた でんしゃ を ①と② に わけて、えき で すれちがわせよう。',
      trains: [T(2, 'A', '1', 'B'), T(3, 'B', '2', 'A'), T(26, 'A', '1', 'B'), T(27, 'B', '2', 'A')],
    }),
    Object.assign(L('p'), {
      ch: 2, no: 3, title: 'どっち が さき？',
      tip: 'ひとつ の くかん に はいれる のは 1ほん だけ。さき に とおす でんしゃ を きめよう。',
      trains: [
        T(2, 'A', '1', 'B'), T(4, 'B', '2', 'A'), T(22, 'A', '2', 'B', 'rapid'),
        T(24, 'B', '1', 'A'), T(44, 'A', '1', 'B'), T(46, 'B', '2', 'A', 'rapid'),
      ],
    }),
    Object.assign(L('p', { crossing: true }), {
      ch: 2, no: 4, title: 'ふみきり の ある まち',
      tip: 'でんしゃ が ふえて きた。カンカン なる ふみきり の さき、トンネル から も つぎつぎ くるよ。',
      trains: [
        T(2, 'A', '1', 'B'), T(3, 'B', '2', 'A'), T(20, 'A', '2', 'B', 'rapid'), T(22, 'B', '1', 'A'),
        T(38, 'A', '1', 'B'), T(40, 'B', '2', 'A', 'rapid'), T(56, 'A', '2', 'B'), T(57, 'B', '1', 'A'),
      ],
    }),

    // ---- 3. いそがしい ターミナル
    Object.assign(L('q'), {
      ch: 3, no: 1, title: '4ばんせん の えき',
      tip: 'うえ の せんろ は みぎ へ、した の せんろ は ひだり へ いく。①②③④ を みわけよう。',
      trains: [T(2, 'A', '1', 'B'), T(4, 'D', '4', 'C'), T(18, 'A', '2', 'B', 'rapid'), T(20, 'D', '3', 'C', 'rapid'), T(34, 'A', '1', 'B'), T(36, 'D', '4', 'C')],
    }),
    Object.assign(L('q'), {
      ch: 3, no: 2, title: 'きゅうこう が おいこす',
      tip: 'きゅうこう は この えき に とまらない（つうか）。ふつう を ① で またせて、きゅうこう を ② で さき に とおそう。しんごう を あお に！',
      trains: [
        T(2, 'A', '1', 'B', 'local', { dwell: 8 }), T(6, 'A', '2', 'B', 'express', { pass: true }),
        T(4, 'D', '4', 'C', 'local', { dwell: 8 }), T(8, 'D', '3', 'C', 'express', { pass: true }),
        T(30, 'A', '2', 'B', 'rapid'), T(32, 'D', '3', 'C', 'rapid'),
      ],
    }),
    Object.assign(L('r'), {
      ch: 3, no: 3, title: 'みなと ターミナル',
      tip: 'でんしゃ は 🌊うみ から きて、おりかえして 🏙️まち へ でて いく（①だけ は 🌊うみ へ）。はいる みち と でる みち を じゅんばん に つくろう。',
      trains: [
        T(2, 'B', '2', 'D'), T(17, 'B', '4', 'D'), T(32, 'B', '3', 'D', 'rapid'),
        T(47, 'B', '1', 'B'), T(62, 'B', '2', 'D'), T(77, 'B', '4', 'D', 'rapid'),
      ],
    }),
    Object.assign(L('q'), {
      ch: 3, no: 4, title: 'ラッシュ アワー',
      tip: 'ふつう・かいそく・きゅうこう が いりみだれる！ でんしゃ の いろ と まる の すうじ を よく みて。',
      trains: [
        T(2, 'A', '1', 'B', 'local', { dwell: 7 }), T(5, 'A', '2', 'B', 'express', { pass: true }),
        T(3, 'D', '4', 'C', 'local', { dwell: 7 }), T(7, 'D', '3', 'C', 'express', { pass: true }),
        T(22, 'A', '2', 'B', 'rapid'), T(24, 'D', '3', 'C', 'rapid'),
        T(36, 'A', '1', 'B', 'local', { dwell: 7 }), T(39, 'A', '2', 'B', 'express', { pass: true }),
        T(38, 'D', '4', 'C', 'local', { dwell: 7 }), T(41, 'D', '3', 'C', 'express', { pass: true }),
      ],
    }),

    // ---- 4. しゃこ と かもつ
    Object.assign(L('dp'), {
      ch: 4, no: 1, title: 'おやすみ しゃこ',
      tip: 'むらさき の「かいそう」は ホーム で おきゃくさん を おろしたら 🏠しゃこ へ。ひだりうえ の せんろ だよ。',
      trains: [T(2, 'B', '1', null, 'kaiso', { next: 'S' }), T(16, 'A', '1', 'B'), T(30, 'B', '2', null, 'kaiso', { next: 'S' }), T(46, 'A', '2', 'B')],
    }),
    Object.assign(L('dp'), {
      ch: 4, no: 2, title: 'かもつ れっしゃ',
      tip: 'ちゃいろ の かもつ れっしゃ は 📦かもつ の せんろ（みぎした）へ。にもつ を おろしたら また うみ へ かえるよ。',
      trains: [T(2, 'B', 'K', 'B', 'freight'), T(10, 'A', '1', 'B'), T(26, 'B', '2', 'A'), T(40, 'B', 'K', 'B', 'freight'), T(48, 'A', '1', 'B')],
    }),
    Object.assign(L('dp', { crossing: true }), {
      ch: 4, no: 3, title: 'えき の いちにち',
      tip: 'おきゃくさん の でんしゃ・かいそう・かもつ が ぜんぶ くる。どこ へ いく か まる の しるし を みよう。',
      trains: [
        T(2, 'A', '1', 'B'), T(6, 'B', 'K', 'B', 'freight'), T(24, 'B', '2', null, 'kaiso', { next: 'S' }),
        T(38, 'A', '1', 'B'), T(42, 'B', '2', 'A'), T(60, 'B', '1', null, 'kaiso', { next: 'S' }),
      ],
    }),
    Object.assign(L('dp', { crossing: true }), {
      ch: 4, no: 4, title: 'よる の しゃこ いれ',
      tip: 'さいご は みんな しゃこ へ かえる じかん。かもつ も わすれずに。',
      trains: [
        T(2, 'B', '2', null, 'kaiso', { next: 'S' }), T(4, 'A', '1', 'B'), T(18, 'B', 'K', 'B', 'freight'),
        T(30, 'B', '1', null, 'kaiso', { next: 'S' }), T(34, 'A', '2', 'B'), T(50, 'B', '2', 'A'),
        T(64, 'B', '1', null, 'kaiso', { next: 'S' }),
      ],
    }),

    // ---- 5. ゆき の ひ
    Object.assign(L('p'), {
      ch: 5, no: 1, title: 'こおった ポイント', snow: SNOW,
      tip: '❄️ が ついた ポイント は こおって うごかない。ゆび で ながおし して あたためて、とけたら タップ で きりかえよう。',
      trains: [T(2, 'A', '1', 'B'), T(3, 'B', '2', 'A'), T(26, 'A', '2', 'B'), T(27, 'B', '1', 'A'), T(50, 'A', '1', 'B')],
    }),
    Object.assign(L('q'), {
      ch: 5, no: 2, title: 'ゆき の ふくせん', snow: SNOW,
      tip: 'ゆき で でんしゃ も すこし ゆっくり。こおる まえ に さき に ポイント を きりかえて おこう。',
      trains: [
        T(2, 'A', '1', 'B', 'local', { dwell: 8 }), T(6, 'A', '2', 'B', 'express', { pass: true }),
        T(4, 'D', '4', 'C'), T(20, 'D', '3', 'C', 'rapid'), T(30, 'A', '2', 'B', 'rapid'), T(34, 'D', '4', 'C'),
      ],
    }),
    Object.assign(L('r'), {
      ch: 5, no: 3, title: 'ゆき の ターミナル', snow: SNOW,
      tip: 'ポイント が いっぱい。こおった ポイント は ながおし！',
      trains: [T(2, 'B', '2', 'D'), T(25, 'B', '3', 'D'), T(48, 'B', '1', 'B', 'rapid'), T(70, 'B', '4', 'D'), T(92, 'B', '3', 'D')],
    }),
    Object.assign(L('dp', { crossing: true }), {
      ch: 5, no: 4, title: 'ふぶき の よる', snow: SNOW,
      tip: 'さいご の しれい！ かいそう は しゃこ へ、かもつ は わき の せんろ へ。こおった ポイント に きを つけて。',
      trains: [
        T(2, 'A', '1', 'B'), T(6, 'B', 'K', 'B', 'freight'), T(26, 'B', '2', null, 'kaiso', { next: 'S' }),
        T(40, 'A', '2', 'B'), T(44, 'B', '1', 'A'), T(62, 'B', '2', null, 'kaiso', { next: 'S' }),
      ],
    }),
  ];
  list.forEach((s, i) => { s.id = s.ch + '-' + s.no; s.index = i; s.seed = 11 + i * 7; });

  // ---------- じゆう モード の さいしょ の かたち ----------
  const FREE_SAMPLE = {
    segs: [],
    track: ['0,2 20,2', '6,2 8,3 13,3 15,2'],
    plats: [{ y: 2, x0: 8, x1: 13 }, { y: 3, x0: 8, x1: 13 }],
    sigs: [],
  };

  return { list, CHAPTERS, TUN, LAYOUT, FREE_SAMPLE };
})();

if (typeof module !== 'undefined') module.exports = STAGES;
