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
      fixed: [F("rubber", 220, 745), F("wall", 960, 730), F("bell", 1100, 730)],
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
    var a = F("board_m", 150, 200, 15), shelf = F("board_l", 560, 300, 0), d = [];
    [390, 445, 555, 610].forEach(function (x) { d.push(F("domino", x, onB(shelf, x, 40))); });
    add({ name: "シーソーで カーン", hint: "おちてくる ボールで シーソーを ガタン！",
      fixed: [a, ballOn("rubber", a, 60), shelf].concat(d, [ballOn("rubber", shelf, 690), F("bell", 1075, 635)]),
      inv: { domino: 1, seesaw: 1 },
      sol: [S("domino", 500, onB(shelf, 500, 40)), S("seesaw", 930, 716, 15)] });
  })();

  (function () {
    var a = F("board_m", 150, 150, 20), flat = F("board_m", 420, 215, 0);
    var ramp = F("board_s", 800, 290, 10), shelf = F("board_m", 1035, 306, 0), d = [];
    [940, 995, 1105].forEach(function (x) { d.push(F("domino", x, onB(shelf, x, 40))); });
    add({ name: "バケツで ひっぱれ", hint: "ゴムだまを はねかえして バケツに いれよう。ひもが とびらを あけるよ",
      fixed: [a, ballOn("rubber", a, 60), flat, F("bucket", 640, 560, 0, { gx: 130, gy: -380, gh: 120, d: 100 }),
              ramp, ballOn("steel", ramp, 737), shelf].concat(d, [F("bell", 1165, 250)]),
      inv: { board_s: 1, domino: 1 },
      sol: [S("board_s", 725, 420, 90), S("domino", 1050, onB(shelf, 1050, 40))] });
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
      sol: [S("board_s", 372, 215, 0), S("seesaw", 900, 716, -15)] });
  })();

  (function () {
    var a = F("board_m", 150, 110, 15), shelf = F("board_m", 420, 200, 0), ramp = F("board_s", 840, 290, 10), d = [];
    [330, 385, 495].forEach(function (x) { d.push(F("domino", x, onB(shelf, x, 40))); });
    add({ name: "からくり だいさくせん", hint: "ドミノ → バケツ → とびら → シーソー → ベル！ じゅんばんに つなげよう",
      fixed: [a, ballOn("rubber", a, 50), shelf].concat(d, [ballOn("rubber", shelf, 550), F("board_s", 775, 420, 90),
              F("bucket", 680, 560, 0, { gx: 130, gy: -380, gh: 120, d: 100 }),
              ramp, ballOn("steel", ramp, 777), F("bell", 790, 630)]),
      inv: { domino: 1, board_s: 1, seesaw: 1 },
      sol: [S("domino", 440, onB(shelf, 440, 40)), S("board_s", 630, 300, 30), S("seesaw", 940, 716, -15)] });
  })();

  var api = { STAGES: STAGES };
  root.KoroStages = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
