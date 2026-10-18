/* ============================================================
   ころころ そうち — ステージ データ
   fixed: さいしょから ある ぶひん（f:1 = うごかせない）
   inv:   つかえる ぶひんと かず
   sol:   こたえの れい（テストで これを おくと クリアできる ことを たしかめる）
   ブラウザでは window.KoroStages、node では module.exports。
   ============================================================ */
(function (root) {
  "use strict";

  function F(t, x, y, a, more) {
    var p = { t: t, x: x, y: y, a: a || 0, f: 1 };
    if (more) for (var k in more) p[k] = more[k];
    return p;
  }
  function S(t, x, y, a, more) { var p = F(t, x, y, a, more); delete p.f; return p; }
  // いた b の うえの x で、ボール（はんけい 24）が のる たかさ
  var LEN = { board_s: 90, board_m: 140, board_l: 200 };
  function onB(b, x, h) {
    var a = b.a * Math.PI / 180;
    return Math.round((b.y + (x - b.x) * Math.tan(a) - 8 / Math.cos(a) - (h == null ? 24 : h) / Math.cos(a) - 1) * 10) / 10;
  }
  function ballOn(t, b, x) { return F(t, x, onB(b, x)); }
  var FLOOR_BALL = 745, FLOOR_DOM = 729.5;

  var STAGES = [];
  function add(st) { STAGES.push(st); }

  /* ---------- 1〜5: たりない ぶひんを 1つ ---------- */
  (function () {
    var b = F("board_l", 300, 300, 20);
    add({ name: "ボールを おこう", hint: "さかの うえに てつだまを おいてね",
      fixed: [b, F("bell", 1000, 730)],
      inv: { steel: 1 }, sol: [S("steel", 150, onB(b, 150) - 20)] });
  })();
  (function () {
    var b = F("board_m", 220, 280, 10);
    add({ name: "さかを つなごう", hint: "いたを ななめに おいて かべを こえよう",
      fixed: [b, ballOn("steel", b, 110), F("wall", 780, 680), F("bell", 1050, 730)],
      inv: { board_m: 1 }, sol: [S("board_m", 520, 420, 15)] });
  })();
  (function () {
    var b = F("board_l", 260, 380, 15), shelf = F("board_l", 800, 600, 0), d = [];
    [620, 675, 730, 840, 895, 950].forEach(function (x) { d.push(F("domino", x, onB(shelf, x, 40))); });
    add({ name: "ドミノの すきま", hint: "あいている ところに ドミノを たてよう",
      fixed: [b, ballOn("rubber", b, 100), shelf].concat(d, [F("bell", 1040, 545)]),
      inv: { domino: 1 }, sol: [S("domino", 785, onB(shelf, 785, 40))] });
  })();
  (function () {
    var b = F("board_m", 230, 300, 12);
    add({ name: "ばねで ジャンプ", hint: "ボールが おちる ところに ばねを おこう",
      fixed: [b, ballOn("steel", b, 120), F("wall", 760, 680), F("bell", 1040, 730)],
      inv: { spring: 1 }, sol: [S("spring", 590, 755)] });
  })();
  (function () {
    var b = F("board_l", 300, 300, 0);
    add({ name: "かぜで はこぼう", hint: "ファンで かるい ゴムだまを ふきとばそう",
      fixed: [b, ballOn("rubber", b, 260), F("board_l", 750, 520, 15), F("bell", 1080, 730)],
      inv: { fan: 1 }, sol: [S("fan", 150, onB(b, 150, 34))] });
  })();

  /* ---------- 6〜10: 2〜3こ おこう ---------- */
  (function () {
    var a = F("board_m", 170, 200, 8), b = F("board_m", 730, 280, 8);
    add({ name: "はしを かけよう", hint: "すきまに いたを わたして みちを つなごう",
      fixed: [a, ballOn("steel", a, 60), b, F("bell", 1110, 370)],
      inv: { board_m: 1, board_s: 1 },
      sol: [S("board_m", 450, 240, 8), S("board_s", 961, 312.5, 8)] });
  })();
  (function () {
    var b = F("board_l", 940, 330, -15), shelf = F("board_l", 400, 560, 0), fx = [];
    [580, 470, 360, 250].forEach(function (x) { fx.push(F("domino", x, onB(shelf, x, 40))); });
    add({ name: "ドミノ ならべ", hint: "ドミノを おなじ あいだで ならべよう",
      fixed: [b, ballOn("rubber", b, 1100), shelf].concat(fx, [F("bell", 160, 505)]),
      inv: { domino: 3 },
      sol: [525, 415, 305].map(function (x) { return S("domino", x, onB(shelf, x, 40)); }) });
  })();

  (function () {
    var a = F("board_m", 200, 250, 15);
    add({ name: "ばね と さか", hint: "ばねで とんだ ボールを いたで うけとめよう",
      fixed: [a, ballOn("steel", a, 90), F("wall", 720, 680), F("bell", 1110, 470)],
      inv: { spring: 1, board_m: 1 },
      sol: [S("spring", 590, 755), S("board_m", 900, 400, 15)] });
  })();
  (function () {
    add({ name: "かぜで ジャンプ", hint: "ファンで おして、さかで とびあがろう",
      fixed: [F("rubber", 220, 745), F("wall", 960, 765), F("bell", 1100, 730)],
      inv: { fan: 1, board_m: 1 },
      sol: [S("fan", 150, 735.5), S("board_m", 720, 720, -25)] });
  })();

  (function () {
    var a = F("board_l", 260, 200, 25);
    add({ name: "はねかえそう", hint: "かべで ボールを はねかえして、いたで ベルまで はこぼう",
      fixed: [a, ballOn("steel", a, 110), F("bell", 170, 610)],
      inv: { wall: 1, board_l: 1 },
      sol: [S("wall", 620, 370), S("board_l", 400, 570, -15)] });
  })();

  /* ---------- 11〜15: ドミノ・シーソー・バケツ を くみあわせる ---------- */
  (function () {
    // 2こめの ゴムだまは たなの はし ぎりぎりに おく（ドミノが すこし おすだけで おちる）
    var a = F("board_m", 150, 200, 15), shelf = F("board_l", 520, 300, 0), d = [];
    [390, 445, 555, 610].forEach(function (x) { d.push(F("domino", x, onB(shelf, x, 40))); });
    add({ name: "シーソーで カーン", hint: "おちてくる ボールで シーソーを ガタン！",
      fixed: [a, ballOn("rubber", a, 60), shelf].concat(d, [ballOn("rubber", shelf, 705), F("bell", 1025, 635)]),
      inv: { domino: 1, seesaw: 1 },
      sol: [S("domino", 500, onB(shelf, 500, 40)), S("seesaw", 880, 716, 15)] });
  })();

  (function () {
    // うけざら（たての いた）で ゴムだまを かならず バケツへ おとす。こどもは みちの すきまを つなぐ
    var a = F("board_m", 150, 150, 20);
    var ramp = F("board_s", 840, 290, 10), shelf = F("board_m", 1060, 306, 0), d = [];
    [950, 1000, 1100].forEach(function (x) { d.push(F("domino", x, onB(shelf, x, 40))); });
    add({ name: "バケツで ひっぱれ", hint: "みちを つないで ゴムだまを バケツへ。ひもが とびらを あけるよ",
      fixed: [a, ballOn("rubber", a, 60), F("board_s", 551, 215, 0), F("board_m", 700, 320, 90),
              F("bucket", 680, 560, 0, { gx: 130, gy: -380, gh: 120, d: 100 }),
              ramp, ballOn("steel", ramp, 777), shelf].concat(d, [F("bell", 1170, 250)]),
      inv: { board_s: 1, domino: 1 },
      sol: [S("board_s", 372, 215, 0), S("domino", 1050, onB(shelf, 1050, 40))] });
  })();

  (function () {
    var a = F("board_l", 220, 200, 15), shelf = F("board_l", 960, 380, 0), d = [];
    [840, 895, 1005, 1060].forEach(function (x) { d.push(F("domino", x, onB(shelf, x, 40))); });
    add({ name: "シーソーの はし", hint: "シーソーを はしに して、ドミノまで ころがそう",
      fixed: [a, ballOn("rubber", a, 60), shelf].concat(d, [F("bell", 1150, 330)]),
      inv: { seesaw: 1, domino: 1 },
      sol: [S("seesaw", 590, 300, 15), S("domino", 950, onB(shelf, 950, 40))] });
  })();

  (function () {
    var a = F("board_m", 150, 150, 20), ramp = F("board_s", 800, 290, 10);
    add({ name: "バケツ と シーソー", hint: "みちを つないで ゴムだまを バケツへ。おちてくる てつだまを シーソーで うけよう",
      fixed: [a, ballOn("rubber", a, 60), F("board_s", 551, 215, 0), F("board_s", 735, 420, 90),
              F("bucket", 640, 560, 0, { gx: 130, gy: -380, gh: 120, d: 100 }),
              ramp, ballOn("steel", ramp, 737), F("bell", 750, 630)],
      inv: { board_s: 1, seesaw: 1 },
      sol: [S("board_s", 315, 210, 0), S("seesaw", 900, 716, -15)] });
  })();

  (function () {
    var a = F("board_m", 150, 110, 15), shelf = F("board_m", 420, 200, 0), ramp = F("board_s", 840, 290, 10), d = [];
    [330, 385, 495].forEach(function (x) { d.push(F("domino", x, onB(shelf, x, 40))); });
    add({ name: "からくり だいさくせん", hint: "ドミノ → バケツ → とびら → シーソー → ベル！ じゅんばんに つなげよう",
      fixed: [a, ballOn("rubber", a, 50), shelf].concat(d, [ballOn("rubber", shelf, 550), F("board_s", 775, 420, 90),
              F("bucket", 680, 560, 0, { gx: 130, gy: -380, gh: 120, d: 100 }),
              ramp, ballOn("steel", ramp, 777), F("bell", 790, 630)]),
      inv: { domino: 1, board_s: 1, seesaw: 1 },
      sol: [S("domino", 440, onB(shelf, 440, 40)), S("board_s", 605, 330, 30), S("seesaw", 940, 716, -15)] });
  })();

  /* ---------- 16〜30: もっと ステージ（「ころころ そうち 2」から うつした もの） ----------
     16〜20 は 1こ、21〜25 は 2〜3こ、26〜30 は シーソー・ドミノ・バケツ。
     バケツの need は なかに はいった おもさの ごうけい（ゴムだま 1こ ≒ 905、てつだま 1こ ≒ 5430）。 */
  add({ name: "さかみちを つくろう", hint: "ながい いたで すきまに はしを かけよう",
    fixed: [
      {t: "block", x: 132, y: 566, w: 264, h: 408, f: 1},
      {t: "board_m", x: 144, y: 335.6, a: 15, f: 1},
      {t: "steel", x: 48, y: 278, f: 1},
      {t: "block", x: 936, y: 662, w: 528, h: 216, f: 1},
      {t: "bell", x: 1116, y: 527.6, f: 1}],
    inv: {board_l: 1},
    sol: [{t: "board_l", x: 456, y: 458, a: 15}] });
  add({ name: "ばねで かべごえ", hint: "ボールが おちる ところに ばねを おこう。ななめに すると とぶ むきが かわるよ",
    fixed: [
      {t: "block", x: 108, y: 518, w: 216, h: 504, f: 1},
      {t: "board_s", x: 120, y: 244.4, a: 15, f: 1},
      {t: "steel", x: 72, y: 199, f: 1},
      {t: "block", x: 564, y: 650, w: 48, h: 240, f: 1},
      {t: "block", x: 948, y: 650, w: 504, h: 240, f: 1},
      {t: "bell", x: 1104, y: 503.6, f: 1}],
    inv: {spring: 1},
    sol: [{t: "spring", x: 384, y: 680, a: 15}] });
  add({ name: "かべで とめよう", hint: "とんでいく ボールを かべで とめて ベルの うえに おとそう",
    fixed: [
      {t: "block", x: 240, y: 602, w: 480, h: 336, f: 1},
      {t: "board_l", x: 180, y: 354.3, a: 30, f: 1},
      {t: "steel", x: 60, y: 237.9, f: 1},
      {t: "block", x: 624, y: 735.2, w: 36, h: 69.6, f: 1},
      {t: "bell", x: 624, y: 674, f: 1}],
    inv: {wall: 1},
    sol: [{t: "wall", x: 672, y: 530}] });
  add({ name: "ドミノを つなごう", hint: "ドミノの あいだが あいているよ。1まい たして つなげよう",
    fixed: [
      {t: "board_l", x: 180, y: 651.9, a: 30, f: 1},
      {t: "steel", x: 60, y: 525.9, f: 1},
      {t: "domino", x: 360, y: 702.5, f: 1},
      {t: "domino", x: 408, y: 729.5, f: 1},
      {t: "domino", x: 528, y: 729.5, f: 1},
      {t: "domino", x: 576, y: 729.5, f: 1},
      {t: "domino", x: 624, y: 729.5, f: 1},
      {t: "bell", x: 705.6, y: 740, f: 1}],
    inv: {domino: 1},
    sol: [{t: "domino", x: 468, y: 729.5}] });
  add({ name: "ファンで ふこう", hint: "ゴムだまは かるいから かぜで うごくよ",
    fixed: [
      {t: "block", x: 600, y: 638, w: 960, h: 264, f: 1},
      {t: "rubber", x: 360, y: 478.4, f: 1},
      {t: "block", x: 672, y: 496.4, w: 48, h: 19.2, f: 1},
      {t: "bell", x: 996, y: 479.6, f: 1}],
    inv: {fan: 1},
    sol: [{t: "fan", x: 280, y: 430}] });
  add({ name: "いた 2まいで わたろう", hint: "はしらの うえを こえて、みぎの だいまで はこぼう",
    fixed: [
      {t: "block", x: 120, y: 542, w: 240, h: 456, f: 1},
      {t: "board_s", x: 132, y: 287.6, a: 15, f: 1},
      {t: "steel", x: 84, y: 243, f: 1},
      {t: "block", x: 600, y: 578, w: 48, h: 384, f: 1},
      {t: "block", x: 1032, y: 650, w: 336, h: 240, f: 1},
      {t: "bell", x: 1128, y: 503.6, f: 1}],
    inv: {board_l: 1, board_m: 1},
    sol: [{t: "board_l", x: 432, y: 362}, {t: "board_m", x: 768, y: 470, a: 15}] });
  add({ name: "ばねで とんで かべで とめる", hint: "ばねで はしらを とびこえたら、かべで とめて ベルに おとそう",
    fixed: [
      {t: "block", x: 108, y: 518, w: 216, h: 504, f: 1},
      {t: "board_s", x: 120, y: 244.4, a: 15, f: 1},
      {t: "steel", x: 72, y: 199, f: 1},
      {t: "block", x: 576, y: 638, w: 48, h: 264, f: 1},
      {t: "block", x: 912, y: 735.2, w: 36, h: 69.6, f: 1},
      {t: "bell", x: 912, y: 674, f: 1}],
    inv: {spring: 1, wall: 1},
    sol: [{t: "spring", x: 384, y: 680, a: 15}, {t: "wall", x: 1000, y: 520}] });
  add({ name: "ドミノの はし", hint: "ドミノを 3まい たして、ベルまで つなげよう",
    fixed: [
      {t: "board_l", x: 180, y: 651.9, a: 30, f: 1},
      {t: "rubber", x: 60, y: 525.9, f: 1},
      {t: "domino", x: 388, y: 729.5, f: 1},
      {t: "domino", x: 436, y: 729.5, f: 1},
      {t: "domino", x: 692, y: 729.5, f: 1},
      {t: "domino", x: 740, y: 729.5, f: 1},
      {t: "bell", x: 820, y: 740, f: 1}],
    inv: {domino: 3},
    sol: [{t: "domino", x: 500, y: 729.5}, {t: "domino", x: 564, y: 729.5}, {t: "domino", x: 628, y: 729.5}] });
  add({ name: "かぜで とばして かべで とめる", hint: "ファンで とばしたら、かべで とめて ベルに おとそう",
    fixed: [
      {t: "block", x: 300, y: 602, w: 360, h: 336, f: 1},
      {t: "rubber", x: 276, y: 406.4, f: 1},
      {t: "block", x: 672, y: 735.2, w: 36, h: 69.6, f: 1},
      {t: "bell", x: 672, y: 674, f: 1}],
    inv: {fan: 1, wall: 1},
    sol: [{t: "fan", x: 168, y: 407.6}, {t: "wall", x: 732, y: 506}] });
  add({ name: "いたで はこんで ばねで とぶ", hint: "おちてくる ボールを いたで みぎへ はこんで、ばねで はしらを とびこえよう",
    fixed: [
      {t: "steel", x: 48, y: 140, f: 1},
      {t: "block", x: 192, y: 602, w: 216, h: 336, f: 1},
      {t: "block", x: 768, y: 650, w: 48, h: 240, f: 1},
      {t: "block", x: 1056, y: 735.2, w: 36, h: 69.6, f: 1},
      {t: "bell", x: 1056, y: 674, f: 1}],
    inv: {board_l: 1, spring: 1},
    sol: [{t: "board_l", x: 204, y: 278, a: 15}, {t: "spring", x: 640, y: 720}] });
  add({ name: "シーソーで とばそう", hint: "シーソーの ひくい ほうに ゴムだまを のせてみよう",
    fixed: [
      {t: "block", x: 180, y: 554, w: 360, h: 432, f: 1},
      {t: "board_m", x: 216, y: 314, a: 10, f: 1},
      {t: "steel", x: 120, y: 266, f: 1},
      {t: "seesaw", x: 640, y: 716, a: 15, f: 1},
      {t: "block", x: 810.4, y: 735, w: 16, h: 70, f: 1},
      {t: "bell", x: 750, y: 470, f: 1}],
    inv: {rubber: 1},
    sol: [{t: "rubber", x: 740, y: 680}] });
  add({ name: "バケツで とびらを あけよう", hint: "てつだまを バケツに いれると、おもさで さがって とびらが あくよ",
    fixed: [
      {t: "block", x: 90, y: 530, w: 180, h: 480, f: 1},
      {t: "board_s", x: 102, y: 268.4, a: 15, f: 1},
      {t: "steel", x: 54, y: 223, f: 1},
      {t: "bucket", x: 504, y: 578, gx: 392, gy: -12, gh: 144, d: 96, f: 1},
      {t: "board_m", x: 744, y: 578, a: 15, f: 1},
      {t: "rubber", x: 828, y: 560, f: 1},
      {t: "block", x: 578.4, y: 602, w: 36, h: 336, f: 1},
      {t: "domino", x: 960, y: 729.5, f: 1},
      {t: "domino", x: 1056, y: 729.5, f: 1},
      {t: "bell", x: 1137.6, y: 740, f: 1}],
    inv: {board_m: 1, domino: 1},
    sol: [{t: "board_m", x: 312, y: 410, a: 15}, {t: "domino", x: 1008, y: 729.5}] });
  add({ name: "ドミノで シーソー", hint: "ドミノで てつだまを おして シーソーに おとそう",
    fixed: [
      {t: "block", x: 240, y: 452, w: 480, h: 36, f: 1},
      {t: "board_m", x: 137, y: 405.3, a: 20, f: 1},
      {t: "rubber", x: 83, y: 339.3, f: 1},
      {t: "domino", x: 240, y: 392, f: 1},
      {t: "domino", x: 408, y: 395, f: 1},
      {t: "block", x: 458.4, y: 422, w: 43.2, h: 24, f: 1},
      {t: "steel", x: 460.8, y: 384.8, f: 1},
      {t: "seesaw", x: 640, y: 716, a: 15, f: 1},
      {t: "rubber", x: 750, y: 680, f: 1},
      {t: "block", x: 810, y: 735, w: 16, h: 70, f: 1},
      {t: "bell", x: 630, y: 420, f: 1}],
    inv: {domino: 2},
    sol: [{t: "domino", x: 296.4, y: 395}, {t: "domino", x: 352.8, y: 395}] });
  add({ name: "おもさが たりない", hint: "ゴムだまは かるくて バケツが さがらない。おもい ものを たそう",
    fixed: [
      {t: "board_l", x: 198, y: 375.6, a: 15, f: 1},
      {t: "rubber", x: 54, y: 297.6, f: 1},
      {t: "bucket", x: 432, y: 506, gx: 542, gy: 102, gh: 144, d: 96, f: 1, need: 3000},
      {t: "board_m", x: 828, y: 614, a: 15, f: 1},
      {t: "steel", x: 924, y: 603.2, f: 1},
      {t: "domino", x: 1014, y: 729.5, f: 1},
      {t: "domino", x: 1062, y: 729.5, f: 1},
      {t: "domino", x: 1110, y: 729.5, f: 1},
      {t: "bell", x: 1158, y: 740, f: 1}],
    inv: {steel: 1},
    sol: [{t: "steel", x: 120, y: 308}] });
  add({ name: "だいそうち", hint: "ドミノ → バケツ → とびら → シーソー。ぜんぶ つなげて ベルを ならそう",
    fixed: [
      {t: "block", x: 240, y: 272, w: 480, h: 36, f: 1},
      {t: "board_m", x: 137, y: 225.3, a: 20, f: 1},
      {t: "rubber", x: 83, y: 159.3, f: 1},
      {t: "domino", x: 240, y: 212, f: 1},
      {t: "domino", x: 360, y: 215, f: 1},
      {t: "domino", x: 408, y: 215, f: 1},
      {t: "block", x: 458.4, y: 242, w: 43.2, h: 24, f: 1},
      {t: "steel", x: 460.8, y: 204.8, f: 1},
      {t: "bucket", x: 612, y: 590, gx: 278, gy: -132, gh: 144, d: 96, f: 1},
      {t: "block", x: 684, y: 554, w: 36, h: 432, f: 1},
      {t: "board_s", x: 792, y: 482, a: 15, f: 1},
      {t: "steel", x: 844.8, y: 452, f: 1},
      {t: "seesaw", x: 1020, y: 690, a: 15, f: 1},
      {t: "bell", x: 996, y: 476, f: 1}],
    inv: {domino: 1, board_m: 1, rubber: 1},
    sol: [{t: "domino", x: 300, y: 215}, {t: "board_m", x: 456, y: 362, a: 15}, {t: "rubber", x: 1140, y: 668}] });

  /* ---------- 31〜50: やさしい コース（ぶひんを 1こ おけば クリア。19・20 だけ 2こ）----------
     すこし ずれた ところに おいても クリア できる ように つくって ある（テストで たしかめる）。 */
  function blk(x0, y0, x1, y1) { return { t: "block", x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, a: 0, f: 1 }; }
  // 1 ボールを おいてね
  (function () { var b = F("board_l", 400, 330, 20);
    add({ name: "ボールを おいてね", hint: "さかの うえに てつだまを おいて ▶ を おそう",
      fixed: [b, F("bell", 1000, 730)], inv: { steel: 1 }, sol: [S("steel", 260, onB(b, 260) - 20)] }); })();
  // 2 ジグザグ
  (function () { var b1 = F("board_l", 260, 170, 15), b2 = F("board_l", 560, 340, -15), b3 = F("board_l", 300, 560, 15);
    add({ name: "ジグザグ ころころ", hint: "いちばん うえの いたに てつだまを のせよう",
      fixed: [b1, b2, b3, F("bell", 950, 730)], inv: { steel: 1 }, sol: [S("steel", 120, onB(b1, 120) - 20)] }); })();
  // 3 ひだりへ
  (function () { var b = F("board_l", 800, 350, -20);
    add({ name: "ひだりへ ころころ", hint: "こんどは ひだりに ころがるよ",
      fixed: [b, F("bell", 200, 730)], inv: { steel: 1 }, sol: [S("steel", 930, onB(b, 930) - 20)] }); })();
  // 4 はしを かけよう
  (function () { var s = F("board_m", 150, 260, 6);
    add({ name: "ながい はし", hint: "ながい いたを すきまに わたそう",
      fixed: [s, ballOn("steel", s, 40), blk(600, 380, 1200, 770), F("bell", 760, 349)], inv: { board_l: 1 }, sol: [S("board_l", 450, 330, 10)] }); })();
  // 5 すべりだい
  (function () { var s = F("board_l", 220, 380, 10);
    add({ name: "すべりだい", hint: "いたを ななめに して すべりだいに しよう",
      fixed: [s, ballOn("steel", s, 50), blk(560, 520, 1200, 770), F("bell", 720, 489)], inv: { board_m: 1 }, sol: [S("board_m", 490, 470, 30)] }); })();
  // 6 ばねで ぴょん
  (function () { var s = F("board_m", 200, 420, 10);
    add({ name: "ばねで ぴょん", hint: "ボールが おちる ところに ばねを おこう",
      fixed: [s, ballOn("steel", s, 100), F("wall", 680, 680), F("bell", 950, 730)], inv: { spring: 1 }, sol: [S("spring", 495, 755)] }); })();
  // 7 ばねで たかく
  (function () { var s = F("board_m", 180, 250, 15);
    add({ name: "ばねで たかく", hint: "ばねで はねて たかい ベルに とどけ！",
      fixed: [s, ballOn("steel", s, 70), blk(800, 420, 1200, 770), F("bell", 900, 389)], inv: { spring: 1 }, sol: [S("spring", 560, 755)] }); })();
  // 8 かべで とめよう
  (function () { var a = F("board_l", 260, 200, 25);
    add({ name: "かべで ストップ", hint: "とびすぎる ボールを かべで とめて あなに おとそう",
      fixed: [a, ballOn("steel", a, 110), blk(560, 650, 600, 770), blk(690, 650, 730, 770), F("bell", 645, 735)], inv: { wall: 1 }, sol: [S("wall", 700, 470)] }); })();
  // 9 ファンで ふー
  (function () { var b = F("board_l", 300, 300, 0);
    add({ name: "ファンで ふー", hint: "ファンの かぜで ゴムだまを おそう",
      fixed: [b, ballOn("rubber", b, 300), F("board_l", 900, 540, -15), F("bell", 560, 730)], inv: { fan: 1 }, sol: [S("fan", 160, onB(b, 160, 34))] }); })();
  // 10 かぜの みち
  (function () {
    add({ name: "かぜの みち", hint: "ゴムだまの うしろに ファンを おこう",
      fixed: [F("rubber", 400, 745), F("bell", 1100, 730)], inv: { fan: 1 }, sol: [S("fan", 300, 735.5)] }); })();
  // 11 ドミノ ばたばた
  (function () { var b = F("board_l", 260, 380, 15), shelf = F("board_l", 800, 600, 0), d = [];
    [620, 675, 730, 785, 840, 895, 950].forEach(function (x) { d.push(F("domino", x, onB(shelf, x, 40))); });
    add({ name: "ドミノ ばたばた", hint: "さかに ゴムだまを おいて ドミノを たおそう",
      fixed: [b, shelf].concat(d, [F("bell", 1040, 545)]), inv: { rubber: 1 }, sol: [S("rubber", 120, onB(b, 120) - 20)] }); })();
  // 12 ドミノの かいだん
  (function () { var b = F("board_l", 940, 330, -15), shelf = F("board_l", 400, 560, 0), d = [];
    [580, 525, 470, 415, 360, 305, 250].forEach(function (x) { d.push(F("domino", x, onB(shelf, x, 40))); });
    add({ name: "ドミノ ならび", hint: "ゴムだまで ドミノを ばたばた たおそう",
      fixed: [b, shelf].concat(d, [F("bell", 160, 505)]), inv: { rubber: 1 }, sol: [S("rubber", 1080, onB(b, 1080) - 20)] }); })();
  // 13 シーソーに おとそう
  (function () {
    add({ name: "シーソーに おとそう", hint: "シーソーの たかい ほうの うえに てつだまを おこう",
      fixed: [F("seesaw", 600, 716, 15), F("bell", 745, 635)], inv: { steel: 1 }, sol: [S("steel", 490, 400)] }); })();
  // 14 シーソーを おこう
  (function () { var a = F("board_m", 160, 300, 15), shelf = F("board_m", 420, 360, 0);
    add({ name: "シーソーを おこう", hint: "ボールが おちる ところに シーソーを おこう",
      fixed: [a, ballOn("steel", a, 60), shelf, F("bell", 975, 635)], inv: { seesaw: 1 }, sol: [S("seesaw", 830, 716, 15)] }); })();
  // 15 バケツに ポイ
  (function () { var ramp = F("board_l", 760, 300, 10);
    add({ name: "バケツに ポイ", hint: "バケツの うえに ボールを おこう。とびらが あくよ",
      fixed: [F("bucket", 300, 560, 0, { gx: 400, gy: -369, gh: 120, d: 100 }), ramp, ballOn("steel", ramp, 666), F("bell", 1150, 730)],
      inv: { steel: 1 }, sol: [S("steel", 300, 420)] }); })();
  // 16 ばねで ぽーん
  (function () { var s = F("board_m", 180, 300, 12);
    add({ name: "ゴムだまで ぴょーん", hint: "ばねで かべを とびこえよう",
      fixed: [s, ballOn("rubber", s, 80), F("wall", 720, 680), F("bell", 1000, 730)], inv: { spring: 1 }, sol: [S("spring", 520, 755)] }); })();
  // 17 いたで うけとめ
  (function () { var s = F("board_m", 160, 250, 8);
    add({ name: "いたで うけとめ", hint: "おちる ボールを ながい いたで うけとめよう",
      fixed: [s, ballOn("steel", s, 60), F("wall", 760, 680), F("bell", 1050, 730)], inv: { board_l: 1 }, sol: [S("board_l", 520, 420, 15)] }); })();
  // 18 かべで はねかえす
  (function () { var a = F("board_l", 300, 250, 20);
    add({ name: "かべで くるっと", hint: "かべに あたった ボールが ベルへ おちるよ",
      fixed: [a, ballOn("steel", a, 140), F("board_l", 560, 600, -12), F("bell", 330, 640)], inv: { wall: 1 }, sol: [S("wall", 720, 470)] }); })();
  // 19 ボール と いた
  (function () { var s = F("board_m", 150, 260, 6);
    add({ name: "ボール と いた", hint: "ボールと いたを おいて ベルまで いこう",
      fixed: [s, blk(600, 380, 1200, 770), F("bell", 760, 349)], inv: { steel: 1, board_l: 1 }, sol: [S("steel", 60, onB(s, 60) - 20), S("board_l", 450, 330, 10)] }); })();
  // 20 ボール と シーソー
  (function () {
    add({ name: "ボール と シーソー", hint: "シーソーを おいて、うえから ボールを おとそう",
      fixed: [F("bell", 745, 635)], inv: { steel: 1, seesaw: 1 }, sol: [S("seesaw", 600, 716, 15), S("steel", 490, 400)] }); })();

  /* ---------- 51〜70: コース 3（ステップアップ）----------
     だんだん むずかしく: 51〜55 は 1こ（むきが だいじな ものも）、56〜60 は 2こ、
     61〜65 は コース1 の 11〜15 を ひだり みぎ はんてん した もの、66〜70 は ながい れんさ（3〜4こ）。 */
  function doms(shelf, xs) { return xs.map(function (x) { return F("domino", x, onB(shelf, x, 40)); }); }
  // 51 ななめの いた（まわさないと だめ）
  (function () { var s = F("board_m", 160, 250, 8);
    add({ name: "ななめの いた", hint: "いたを タップして まわそう。ボールを ひだりへ はこぶよ",
      fixed: [s, ballOn("steel", s, 60), F("bell", 90, 730)], inv: { board_l: 1 }, sol: [S("board_l", 330, 500, -20)] }); })();
  // 52 ばねで たなへ
  (function () { var s = F("board_m", 200, 300, 12);
    add({ name: "ばねで たなへ", hint: "ばねで はねて たかい たなの ベルへ",
      fixed: [s, ballOn("steel", s, 90), blk(820, 520, 1200, 770), F("bell", 905, 489)], inv: { spring: 1 }, sol: [S("spring", 565, 755)] }); })();
  // 53 ドミノの すきま 2（みぎから）
  (function () { var b = F("board_l", 940, 380, -15), shelf = F("board_l", 400, 600, 0);
    add({ name: "ドミノの あな", hint: "ドミノの ならびの あいている ところを さがそう",
      fixed: [b, ballOn("rubber", b, 1100), shelf].concat(doms(shelf, [580, 525, 470, 360, 305, 250]), [F("bell", 160, 545)]),
      inv: { domino: 1 }, sol: [S("domino", 415, onB(shelf, 415, 40))] }); })();
  // 54 シーソーを おこう（みぎから）
  (function () { var a = F("board_m", 1040, 300, -15), shelf = F("board_m", 780, 360, 0);
    add({ name: "シーソー はんたい", hint: "ボールが おちる ところに シーソーを。むきに きを つけて",
      fixed: [a, ballOn("steel", a, 1140), shelf, F("bell", 225, 635)], inv: { seesaw: 1 }, sol: [S("seesaw", 370, 716, -15)] }); })();
  // 55 バケツの みち
  (function () { var a = F("board_m", 150, 150, 20), ramp = F("board_s", 840, 290, 10);
    add({ name: "バケツの みち", hint: "ゴムだまが バケツに はいれば とびらが あくよ",
      fixed: [a, ballOn("rubber", a, 60), F("board_s", 551, 215, 0), F("board_m", 700, 320, 90),
        F("bucket", 680, 560, 0, { gx: 130, gy: -380, gh: 120, d: 100 }), ramp, ballOn("steel", ramp, 777), F("bell", 1100, 730)],
      inv: { board_s: 1 }, sol: [S("board_s", 372, 215, 0)] }); })();
  // 56 2つの はし
  (function () { var a = F("board_m", 150, 200, 6), b = F("board_s", 600, 300, 6), c = blk(950, 420, 1200, 770);
    add({ name: "2つの はし", hint: "すきまが 2つ。どちらにも いたを わたそう",
      fixed: [a, ballOn("steel", a, 40), b, c, F("bell", 1050, 389)], inv: { board_m: 1, board_s: 1 },
      sol: [S("board_m", 410, 260, 10), S("board_s", 810, 360, 25)] }); })();
  // 57 ばね と かべ
  (function () { var s = F("board_m", 200, 300, 12);
    add({ name: "ばね と かべ", hint: "ばねで とんだ ボールを かべで とめて おとそう",
      fixed: [s, ballOn("steel", s, 90), blk(640, 650, 680, 770), blk(770, 650, 810, 770), F("bell", 725, 735)],
      inv: { spring: 1, wall: 1 }, sol: [S("spring", 565, 755), S("wall", 790, 420)] }); })();
  // 58 ファン と いた（ながい さかで かべごえ）
  (function () {
    add({ name: "ファン と さか", hint: "ファンで おして、ながい さかで かべを とびこえよう",
      fixed: [F("rubber", 300, 745), F("wall", 1000, 740), F("bell", 1130, 730)], inv: { fan: 1, board_l: 1 },
      sol: [S("fan", 230, 735.5), S("board_l", 700, 712, -20)] }); })();
  // 59 ドミノ 2こ
  (function () { var b = F("board_l", 260, 380, 15), shelf = F("board_l", 800, 600, 0);
    add({ name: "ドミノ ふたつ", hint: "あいている ところが 2つ あるよ",
      fixed: [b, ballOn("rubber", b, 100), shelf].concat(doms(shelf, [620, 730, 785, 895, 950]), [F("bell", 1040, 545)]),
      inv: { domino: 2 }, sol: [S("domino", 675, onB(shelf, 675, 40)), S("domino", 840, onB(shelf, 840, 40))] }); })();
  // 60 いた と シーソー
  (function () { var a = F("board_m", 160, 200, 12);
    add({ name: "いた と シーソー", hint: "ボールを いたで シーソーまで はこぼう",
      fixed: [a, ballOn("steel", a, 60), F("wall", 380, 680), F("bell", 1145, 635)], inv: { board_l: 1, seesaw: 1 },
      sol: [S("board_l", 520, 420, 15), S("seesaw", 995, 716, 15)] }); })();

  // --- 61〜65: コース1 の 11〜15 を ひだり みぎ はんてん して すこし かえた もの ---
  var C1 = STAGES;   // コース1（1〜15）を はんてん して つかう
  function mir(p) {
    var q = JSON.parse(JSON.stringify(p)); q.x = 1200 - q.x; q.a = -(q.a || 0);
    if (q.t === "bucket") q.gx = -q.gx;
    if (q.a === 0) q.a = 0;
    return q;
  }
  function mirStage(i, name, hint) { var st = C1[i]; return { name: name, hint: hint, fixed: st.fixed.map(mir), inv: JSON.parse(JSON.stringify(st.inv)), sol: st.sol.map(mir) }; }
  add(mirStage(10, "はんたい シーソー", "ドミノで ボールを おとして、シーソーで ベルを ならそう"));
  add(mirStage(11, "はんたい バケツ", "みちを つないで バケツへ。とびらが あいたら ドミノ！"));
  add(mirStage(12, "はんたい シーソーばし", "シーソーを はしに して ドミノへ"));
  add(mirStage(13, "はんたい バケツシーソー", "バケツ → とびら → シーソー の じゅんばん"));
  (function () { var st = mirStage(14, "はんたい だいさくせん", "ドミノ → バケツ → とびら → シーソー → ベル"); st.sol[1].x = 605; add(st); })();

  // --- 66〜70: ながい れんさ（ぶひんの むきも だいじ）---
  // 66 ばねの むき: ドミノで おとした ゴムだまを、ななめの ばねで ひだりへ もどす
  (function () { var a = F("board_m", 150, 200, 15), shelf = F("board_l", 520, 300, 0);
    add({ name: "ばねの むき", hint: "ばねを まわすと はねる むきが かわるよ。ベルは ひだりの した",
      fixed: [a, ballOn("rubber", a, 60), shelf].concat(doms(shelf, [390, 445, 555, 610]), [ballOn("rubber", shelf, 705), F("bell", 420, 660)]),
      inv: { domino: 1, spring: 1 }, sol: [S("domino", 500, onB(shelf, 500, 40)), S("spring", 830, 755, -15)] }); })();

  // 67 3だん れんさ: ドミノ → (いた) → バケツ → とびら → てつだま → (シーソー) → ベル
  (function () { var a = F("board_m", 150, 200, 15), shelf = F("board_l", 520, 300, 0), ramp = F("board_m", 660, 462, -10);
    add({ name: "3だん れんさ", hint: "ゴムだまを バケツへ。とびらが あいたら てつだまが ひだりへ ころがるよ",
      fixed: [a, ballOn("rubber", a, 60), shelf].concat(doms(shelf, [390, 445, 555, 610]), [ballOn("rubber", shelf, 705),
        F("board_m", 190, 420, -15),
        F("bucket", 940, 600, 0, { gx: -200, gy: -228, gh: 120, d: 100 }), ramp, ballOn("steel", ramp, 776), F("board_m", 1015, 420, 90), blk(555, 640, 580, 770), F("bell", 225, 635)]),
      inv: { domino: 1, board_s: 1, seesaw: 1 },
      sol: [S("domino", 500, onB(shelf, 500, 40)), S("board_s", 845, 370, 30), S("seesaw", 360, 716, -15)] }); })();

  // 68 2だん ドミノ: うえの たなから したの たなへ ドミノが つづく。すきまが 3つ
  (function () { var a = F("board_m", 150, 200, 15), s1 = F("board_l", 540, 300, 0), s2 = F("board_l", 945, 330, 0);
    add({ name: "2だん ドミノ", hint: "ドミノが たりない ところが 3つ。うえの たなから したの たなへ つなげよう",
      fixed: [a, ballOn("rubber", a, 60), s1, s2].concat(doms(s1, [410, 520, 630, 685]), doms(s2, [760, 870, 925, 980, 1035, 1090]), [F("bell", 1168, 275)]),
      inv: { domino: 3 },
      sol: [S("domino", 465, onB(s1, 465, 40)), S("domino", 575, onB(s1, 575, 40)), S("domino", 815, onB(s2, 815, 40))] }); })();

  // 69・70 ファンで はじめる 3だん れんさ
  function fanChain(name, hint, gap) {
    var top = F("board_m", 150, 262, 0), shelf = F("board_l", 520, 300, 0), ramp = F("board_m", 660, 462, -10);
    var dx = gap ? [390, 445, 555, 610] : [390, 445, 500, 555, 610];
    var sol = [S("fan", 70, onB(top, 70, 34)), S("board_s", 845, 370, 30), S("seesaw", 360, 716, -15)];
    if (gap) sol.splice(1, 0, S("domino", 500, onB(shelf, 500, 40)));
    var inv = { fan: 1, board_s: 1, seesaw: 1 }; if (gap) inv.domino = 1;
    return { name: name, hint: hint,
      fixed: [top, ballOn("rubber", top, 180), shelf].concat(doms(shelf, dx), [ballOn("rubber", shelf, 705),
        F("board_m", 190, 420, -15),
        F("bucket", 940, 600, 0, { gx: -200, gy: -228, gh: 120, d: 100 }), ramp, ballOn("steel", ramp, 776), F("board_m", 1015, 420, 90), blk(555, 640, 580, 770), F("bell", 225, 635)]),
      inv: inv, sol: sol };
  }
  add(fanChain("ファンで スタート", "さいしょの ゴムだまは ファンで おそう。そのあとは 3だん れんさ", false));
  add(fanChain("さいごの からくり", "ファン → ドミノ → バケツ → とびら → シーソー → ベル！ 4つの ぶひんで ぜんぶ つなげよう", true));

  // ホームで ならべる じゅん（やさしい コースを いちばん うえに）
  var COURSES = [
    { id: "easy", name: "やさしい コース", from: 30, to: 50 },
    { id: "c1", name: "コース 1", from: 0, to: 15 },
    { id: "c2", name: "コース 2（もっと ステージ）", from: 15, to: 30 },
    { id: "c3", name: "コース 3（ステップアップ）", from: 50, to: 70 }
  ];

  var api = { STAGES: STAGES, COURSES: COURSES };
  root.KoroStages = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
