/* ============================================================
   ころころ そうち — ステージ
   fixed: さいしょから ある（うごかせない）ぶひん
   tools: つかえる ぶひんと かず
   sol:   こたえの れい（テストで ヘッドレスに うごかして クリアを たしかめる）
   ============================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.KoroStages = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var F = true;
  var STAGES = [
    { name: "さかみちを つくろう", hint: "ながい いたで すきまに はしを かけよう",
      fixed: [
        { t: "block", x: 110, y: 410, w: 220, h: 340, fixed: F },
        { t: "plateM", x: 120, y: 218, a: 15, fixed: F },
        { t: "iron", x: 40, y: 190, fixed: F },
        { t: "block", x: 780, y: 490, w: 440, h: 180, fixed: F },
        { t: "bell", x: 930, y: 378, fixed: F }
      ],
      tools: { plateL: 1 },
      sol: [{ t: "plateL", x: 380, y: 320, a: 15 }] },
    { name: "ばねで ジャンプ", hint: "ボールが おちる ところに ばねを おこう。ななめに すると とぶ むきが かわるよ",
      fixed: [
        { t: "block", x: 90, y: 370, w: 180, h: 420, fixed: F },
        { t: "plateS", x: 100, y: 142, a: 15, fixed: F },
        { t: "iron", x: 60, y: 110, fixed: F },
        { t: "block", x: 470, y: 480, w: 40, h: 200, fixed: F },
        { t: "block", x: 790, y: 480, w: 420, h: 200, fixed: F },
        { t: "bell", x: 920, y: 358, fixed: F }
      ],
      tools: { spring: 1 },
      sol: [{ t: "spring", x: 320, y: 505, a: 15 }] },
    { name: "かべで とめよう", hint: "とんでいく ボールを かべで とめて ベルの うえに おとそう",
      fixed: [
        { t: "block", x: 200, y: 440, w: 400, h: 280, fixed: F },
        { t: "plateL", x: 130, y: 222, a: 30, fixed: F },
        { t: "iron", x: 30, y: 130, fixed: F },
        { t: "block", x: 520, y: 551, w: 30, h: 58, fixed: F },
        { t: "bell", x: 520, y: 500, fixed: F }
      ],
      tools: { wall: 1 },
      sol: [{ t: "wall", x: 560, y: 380, a: 0 }] },
    { name: "ドミノを つなごう", hint: "ドミノの あいだが あいているよ。1まい たして つなげよう",
      fixed: [
        { t: "plateL", x: 130, y: 470, a: 30, fixed: F },
        { t: "iron", x: 30, y: 370, fixed: F },
        { t: "domino", x: 300, y: 550, fixed: F },
        { t: "domino", x: 340, y: 550, fixed: F },
        { t: "domino", x: 440, y: 550, fixed: F },
        { t: "domino", x: 480, y: 550, fixed: F },
        { t: "domino", x: 520, y: 550, fixed: F },
        { t: "bell", x: 588, y: 558, fixed: F }
      ],
      tools: { domino: 1 },
      sol: [{ t: "domino", x: 390, y: 550, a: 0 }] },
    { name: "ファンで ふこう", hint: "ゴムの ボールは かるいから かぜで うごくよ",
      fixed: [
        { t: "block", x: 500, y: 470, w: 800, h: 220, fixed: F },
        { t: "rubber", x: 300, y: 342, fixed: F },
        { t: "block", x: 560, y: 352, w: 40, h: 16, fixed: F },
        { t: "bell", x: 830, y: 338, fixed: F }
      ],
      tools: { fan: 1 },
      sol: [{ t: "fan", x: 200, y: 338, a: 0 }] },
    { name: "いた 2まいで わたろう", hint: "はしらの うえを こえて、みぎの だいまで はこぼう",
      fixed: [
        { t: "block", x: 100, y: 390, w: 200, h: 380, fixed: F },
        { t: "plateS", x: 110, y: 178, a: 15, fixed: F },
        { t: "iron", x: 70, y: 150, fixed: F },
        { t: "block", x: 500, y: 420, w: 40, h: 320, fixed: F },
        { t: "block", x: 860, y: 480, w: 280, h: 200, fixed: F },
        { t: "bell", x: 940, y: 358, fixed: F }
      ],
      tools: { plateM: 1, plateL: 1 },
      sol: [{ t: "plateL", x: 360, y: 240, a: 0 }, { t: "plateM", x: 640, y: 330, a: 15 }] },
    { name: "ばねで とんで かべで とめる", hint: "ばねで はしらを とびこえたら、かべで とめて ベルに おとそう",
      fixed: [
        { t: "block", x: 90, y: 370, w: 180, h: 420, fixed: F },
        { t: "plateS", x: 100, y: 142, a: 15, fixed: F },
        { t: "iron", x: 60, y: 110, fixed: F },
        { t: "block", x: 480, y: 470, w: 40, h: 220, fixed: F },
        { t: "block", x: 760, y: 551, w: 30, h: 58, fixed: F },
        { t: "bell", x: 760, y: 500, fixed: F }
      ],
      tools: { spring: 1, wall: 1 },
      sol: [{ t: "spring", x: 320, y: 505, a: 15 }, { t: "wall", x: 820, y: 260, a: 0 }] },
    { name: "ドミノの はし", hint: "ドミノを 3まい たして、ベルまで つなげよう",
      fixed: [
        { t: "plateL", x: 130, y: 470, a: 30, fixed: F },
        { t: "rubber", x: 30, y: 370, fixed: F },
        { t: "domino", x: 290, y: 550, fixed: F },
        { t: "domino", x: 330, y: 550, fixed: F },
        { t: "domino", x: 530, y: 550, fixed: F },
        { t: "domino", x: 570, y: 550, fixed: F },
        { t: "bell", x: 638, y: 558, fixed: F }
      ],
      tools: { domino: 3 },
      sol: [{ t: "domino", x: 380, y: 550 }, { t: "domino", x: 430, y: 550 }, { t: "domino", x: 480, y: 550 }] },
    { name: "かぜで とばして かべで とめる", hint: "ファンで とばしたら、かべで とめて ベルに おとそう",
      fixed: [
        { t: "block", x: 250, y: 440, w: 300, h: 280, fixed: F },
        { t: "rubber", x: 230, y: 282, fixed: F },
        { t: "block", x: 560, y: 551, w: 30, h: 58, fixed: F },
        { t: "bell", x: 560, y: 500, fixed: F }
      ],
      tools: { fan: 1, wall: 1 },
      sol: [{ t: "fan", x: 140, y: 278, a: 0 }, { t: "wall", x: 610, y: 360, a: 0 }] },
    { name: "いたで はこんで ばねで とぶ", hint: "おちてくる ボールを いたで みぎへ はこんで、ばねで はしらを とびこえよう",
      fixed: [
        { t: "iron", x: 40, y: 60, fixed: F },
        { t: "block", x: 160, y: 440, w: 180, h: 280, fixed: F },
        { t: "block", x: 640, y: 480, w: 40, h: 200, fixed: F },
        { t: "block", x: 880, y: 551, w: 30, h: 58, fixed: F },
        { t: "bell", x: 880, y: 500, fixed: F }
      ],
      tools: { plateL: 1, spring: 1 },
      sol: [{ t: "plateL", x: 170, y: 170, a: 15 }, { t: "spring", x: 490, y: 460, a: 15 }] },
    { name: "シーソーで とばそう", hint: "シーソーの ひくい ほうに ゴムの ボールを のせてみよう",
      fixed: [
        { t: "block", x: 150, y: 400, w: 300, h: 360, fixed: F },
        { t: "plateM", x: 180, y: 200, a: 10, fixed: F },
        { t: "iron", x: 100, y: 170, fixed: F },
        { t: "seesaw", x: 540, y: 520, a: 15, fixed: F },
        { t: "bell", x: 560, y: 230, fixed: F }
      ],
      tools: { rubber: 1 },
      sol: [{ t: "rubber", x: 640, y: 500 }] },
    { name: "バケツで とびらを あけよう", hint: "てつの ボールを バケツに いれると、おもさで さがって とびらが あくよ",
      fixed: [
        { t: "block", x: 75, y: 380, w: 150, h: 400, fixed: F },
        { t: "plateS", x: 85, y: 162, a: 15, fixed: F },
        { t: "iron", x: 45, y: 130, fixed: F },
        { t: "bucket", x: 420, y: 420, span: 315, gy: -10, fixed: F },
        { t: "plateM", x: 620, y: 420, a: 15, fixed: F },
        { t: "rubber", x: 690, y: 410, fixed: F },
        { t: "block", x: 482, y: 440, w: 30, h: 280, fixed: F },
        { t: "domino", x: 800, y: 550, fixed: F },
        { t: "domino", x: 880, y: 550, fixed: F },
        { t: "bell", x: 948, y: 558, fixed: F }
      ],
      tools: { plateM: 1, domino: 1 },
      sol: [{ t: "plateM", x: 260, y: 280, a: 15 }, { t: "domino", x: 840, y: 550 }] },
    { name: "ドミノで シーソー", hint: "ドミノで てつの ボールを おして シーソーに おとそう",
      fixed: [
        { t: "block", x: 200, y: 315, w: 400, h: 30, fixed: F },
        { t: "plateM", x: 70, y: 260, a: 20, fixed: F },
        { t: "rubber", x: 25, y: 210, fixed: F },
        { t: "domino", x: 200, y: 270, fixed: F },
        { t: "domino", x: 340, y: 270, fixed: F },
        { t: "block", x: 382, y: 290, w: 36, h: 20, fixed: F },
        { t: "iron", x: 384, y: 264, fixed: F },
        { t: "seesaw", x: 520, y: 520, a: 15, fixed: F },
        { t: "rubber", x: 620, y: 500, fixed: F },
        { t: "bell", x: 540, y: 262, fixed: F }
      ],
      tools: { domino: 2 },
      sol: [{ t: "domino", x: 247, y: 270 }, { t: "domino", x: 294, y: 270 }] },
    { name: "おもさが たりない", hint: "ゴムの ボールは かるくて バケツが さがらない。おもい ものを たそう",
      fixed: [
        { t: "plateL", x: 160, y: 250, a: 15, fixed: F },
        { t: "rubber", x: 40, y: 190, fixed: F },
        { t: "bucket", x: 360, y: 360, span: 440, gy: 85, fixed: F },
        { t: "plateM", x: 690, y: 450, a: 15, fixed: F },
        { t: "iron", x: 770, y: 446, fixed: F },
        { t: "domino", x: 845, y: 550, fixed: F },
        { t: "domino", x: 885, y: 550, fixed: F },
        { t: "domino", x: 925, y: 550, fixed: F },
        { t: "bell", x: 965, y: 558, fixed: F }
      ],
      tools: { iron: 1, rubber: 2 },
      sol: [{ t: "iron", x: 100, y: 200 }] },
    { name: "だいそうち", hint: "ドミノ → バケツ → とびら → シーソー。ぜんぶ つなげて ベルを ならそう",
      fixed: [
        { t: "block", x: 200, y: 165, w: 400, h: 30, fixed: F },
        { t: "plateM", x: 70, y: 110, a: 20, fixed: F },
        { t: "rubber", x: 25, y: 60, fixed: F },
        { t: "domino", x: 200, y: 120, fixed: F },
        { t: "domino", x: 300, y: 120, fixed: F },
        { t: "domino", x: 340, y: 120, fixed: F },
        { t: "block", x: 382, y: 140, w: 36, h: 20, fixed: F },
        { t: "iron", x: 384, y: 114, fixed: F },
        { t: "bucket", x: 510, y: 430, span: 220, gy: -110, ph: 270, fixed: F },
        { t: "block", x: 570, y: 400, w: 30, h: 360, fixed: F },
        { t: "plateS", x: 660, y: 340, a: 15, fixed: F },
        { t: "iron", x: 704, y: 320, fixed: F },
        { t: "seesaw", x: 850, y: 520, a: 15, fixed: F },
        { t: "bell", x: 830, y: 335, fixed: F }
      ],
      tools: { domino: 1, plateM: 1, rubber: 1 },
      sol: [{ t: "domino", x: 250, y: 120 }, { t: "plateM", x: 380, y: 240, a: 15 }, { t: "rubber", x: 950, y: 500 }] },
  ];
  return { STAGES: STAGES };
});
