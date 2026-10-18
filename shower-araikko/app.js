'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const R = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const OUT = '#3d3a4b';
  const MK = 0.62; // よごれマスクの こまかさ（デザイン座標 → マスク画素）
  const GRAV = 1700;

  // ---------- ほぞん ----------
  const SAVE_KEY = 'shower-araikko-v1';
  let save = { cleared: {}, sound: true };
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s === 'object') save = Object.assign(save, s);
    if (!save.cleared || typeof save.cleared !== 'object') save.cleared = {};
  } catch (e) { /* つかえなくても あそべる */ }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* むし */ } }

  // ---------- えを かく どうぐ ----------
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function el(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
  function line(c, lw, col) { c.lineWidth = lw; c.strokeStyle = col || OUT; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
  function shape(c, col, lw) { c.fillStyle = col; c.fill(); if (lw !== 0) line(c, lw || 5); }
  function fill(c, col) { c.fillStyle = col; c.fill(); }
  function thick(c, col, w) { line(c, w + 9); line(c, w, col); }
  function mkCanvas(w, h) { const cv = document.createElement('canvas'); cv.width = Math.max(1, w | 0); cv.height = Math.max(1, h | 0); return cv; }
  function tri(c, a, b, d) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.closePath(); }
  function star(c, x, y, r, n) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + i * Math.PI / n, rad = i % 2 ? r * 0.45 : r;
      c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath();
  }

  // ---------- もの の え（デザイン座標） ----------
  function trainBody(c, part) {
    const x = 16, y = 36, w = 408, h = 150;
    if (part === 'mid') { rr(c, x, y, w, h, 16); return; }
    c.beginPath(); c.moveTo(x + 96, y); c.lineTo(x + w - 16, y); c.quadraticCurveTo(x + w, y, x + w, y + 16);
    c.lineTo(x + w, y + h - 12); c.quadraticCurveTo(x + w, y + h, x + w - 12, y + h);
    c.lineTo(x + 14, y + h); c.quadraticCurveTo(x, y + h, x, y + h - 16); c.lineTo(x, y + 96);
    c.bezierCurveTo(x, y + 40, x + 40, y, x + 96, y); c.closePath();
  }
  function drawTrain(c, part) {
    c.save();
    if (part === 'tail') { c.translate(440, 0); c.scale(-1, 1); }
    for (const bx of [110, 330]) {
      rr(c, bx - 56, 178, 112, 20, 8); shape(c, '#495057', 4);
      for (const wx of [-30, 30]) { el(c, bx + wx, 204, 17, 17); shape(c, '#343a40', 4); el(c, bx + wx, 204, 6, 6); fill(c, '#adb5bd'); }
    }
    if (part === 'mid') {
      c.beginPath(); c.moveTo(180, 38); c.lineTo(220, 12); c.lineTo(260, 38); c.moveTo(196, 12); c.lineTo(244, 12); line(c, 5);
    }
    trainBody(c, part); shape(c, '#f8f9fa', 5);
    c.save(); trainBody(c, part); c.clip();
    c.fillStyle = '#e03131'; c.fillRect(0, 142, 440, 14); c.fillStyle = '#1c7ed6'; c.fillRect(0, 156, 440, 8);
    c.restore();
    trainBody(c, part); line(c, 5);
    const win = (x, y, w, h) => {
      rr(c, x, y, w, h, 8); shape(c, '#a5d8ff', 4);
      c.beginPath(); c.moveTo(x + 10, y + h - 8); c.lineTo(x + w * 0.4, y + 8); line(c, 5, 'rgba(255,255,255,.85)');
    };
    const door = (x) => { rr(c, x, 54, 44, 128, 6); shape(c, '#e9ecef', 4); rr(c, x + 8, 64, 28, 40, 5); shape(c, '#a5d8ff', 3); };
    if (part === 'mid') {
      door(110); door(286); win(30, 62, 66, 50); win(170, 62, 100, 50); win(344, 62, 66, 50);
    } else {
      c.beginPath(); c.moveTo(30, 104); c.quadraticCurveTo(40, 66, 96, 60); c.lineTo(118, 60); c.lineTo(118, 104); c.closePath();
      shape(c, '#a5d8ff', 4);
      door(140); door(312); win(198, 62, 100, 50); win(364, 62, 46, 50);
      el(c, 32, 140, 9, 12); shape(c, part === 'tail' ? '#fa5252' : '#ffe066', 4);
    }
    c.restore();
  }
  function drawElephant(c) {
    for (const [x, y] of [[175, 222], [225, 230], [305, 230], [350, 222]]) { rr(c, x - 24, y, 48, 70, 18); shape(c, '#9aa3ad'); }
    c.beginPath(); c.moveTo(392, 160); c.quadraticCurveTo(414, 196, 402, 232); thick(c, '#9aa3ad', 6);
    el(c, 265, 182, 135, 90); shape(c, '#adb5bd');
    el(c, 118, 138, 82, 78); shape(c, '#b4bcc4');
    c.beginPath(); c.moveTo(80, 168); c.bezierCurveTo(40, 200, 40, 250, 62, 270); c.bezierCurveTo(75, 284, 94, 272, 88, 258);
    thick(c, '#b4bcc4', 30);
    el(c, 218, 134, 52, 66, 0.15); shape(c, '#a3acb5'); el(c, 220, 138, 33, 45, 0.15); fill(c, '#f3c6cf');
    c.beginPath(); for (const t of [210, 230, 248]) { c.moveTo(48, t); c.lineTo(66, t + 4); } line(c, 3, '#868e96');
  }
  function drawDog(c) {
    c.beginPath(); c.moveTo(250, 278); c.quadraticCurveTo(320, 262, 312, 196); thick(c, '#e8c48f', 18);
    el(c, 180, 245, 92, 82); shape(c, '#f5deb3');
    el(c, 180, 266, 52, 50); fill(c, '#fff8ec');
    el(c, 145, 318, 30, 18); shape(c, '#fff8ec'); el(c, 215, 318, 30, 18); shape(c, '#fff8ec');
    el(c, 180, 125, 82, 76); shape(c, '#f5deb3');
    el(c, 215, 106, 25, 23); fill(c, '#e3b47a');
    el(c, 106, 122, 26, 54, 0.35); shape(c, '#a0673a'); el(c, 254, 122, 26, 54, -0.35); shape(c, '#a0673a');
    el(c, 180, 158, 40, 30); shape(c, '#fff8ec', 3);
    el(c, 180, 144, 13, 10); fill(c, '#2b2b2b');
    rr(c, 128, 192, 104, 14, 7); shape(c, '#e03131', 4); el(c, 180, 212, 9, 9); shape(c, '#ffd43b', 3);
  }
  function drawCar(c) {
    c.beginPath(); c.moveTo(110, 112); c.lineTo(150, 46); c.quadraticCurveTo(156, 38, 168, 38); c.lineTo(290, 38);
    c.quadraticCurveTo(304, 38, 312, 48); c.lineTo(362, 112); c.closePath(); shape(c, '#ff6b6b');
    c.beginPath(); c.moveTo(136, 108); c.lineTo(166, 54); c.lineTo(226, 54); c.lineTo(226, 108); c.closePath(); shape(c, '#a5d8ff', 4);
    c.beginPath(); c.moveTo(240, 54); c.lineTo(292, 54); c.lineTo(334, 108); c.lineTo(240, 108); c.closePath(); shape(c, '#a5d8ff', 4);
    rr(c, 20, 104, 400, 86, 34); shape(c, '#ff6b6b');
    c.beginPath(); c.moveTo(232, 110); c.lineTo(232, 182); line(c, 3);
    rr(c, 250, 124, 26, 8, 4); fill(c, '#c92a2a');
    el(c, 402, 132, 10, 14); shape(c, '#ffe066', 4); el(c, 32, 132, 8, 12); shape(c, '#fa5252', 4);
    rr(c, 10, 166, 420, 20, 10); shape(c, '#868e96', 4);
    for (const x of [112, 328]) { el(c, x, 192, 40, 40); shape(c, '#343a40'); el(c, x, 192, 17, 17); fill(c, '#ced4da'); }
  }
  function drawPig(c) {
    for (const x of [130, 175, 282, 326]) { rr(c, x - 18, 208, 36, 64, 14); shape(c, '#ffb3c6'); rr(c, x - 18, 256, 36, 16, 6); shape(c, '#e8899f', 4); }
    c.beginPath(); c.moveTo(362, 150); c.bezierCurveTo(394, 128, 400, 166, 382, 170); c.bezierCurveTo(366, 172, 370, 148, 388, 150);
    thick(c, '#ffb3c6', 6);
    el(c, 235, 160, 135, 88); shape(c, '#ffc9d6');
    tri(c, [66, 96], [76, 40], [112, 80]); shape(c, '#ffb3c6'); tri(c, [118, 74], [150, 36], [156, 90]); shape(c, '#ffb3c6');
    el(c, 110, 140, 72, 68); shape(c, '#ffd0dc');
    el(c, 50, 152, 26, 22); shape(c, '#ffa8bf'); el(c, 42, 152, 4, 7); fill(c, '#c2255c'); el(c, 58, 152, 4, 7); fill(c, '#c2255c');
  }
  function drawShoe(c) {
    c.beginPath(); c.moveTo(34, 178); c.bezierCurveTo(24, 130, 60, 118, 120, 112); c.lineTo(200, 96);
    c.bezierCurveTo(230, 70, 250, 40, 290, 34); c.lineTo(360, 30); c.bezierCurveTo(392, 32, 396, 60, 392, 96);
    c.lineTo(392, 178); c.closePath(); shape(c, '#4dabf7');
    c.beginPath(); c.moveTo(36, 178); c.bezierCurveTo(28, 136, 60, 124, 112, 118); c.lineTo(122, 178); c.closePath(); shape(c, '#e7f5ff', 4);
    star(c, 310, 128, 28, 5); shape(c, '#ffd43b', 4);
    c.beginPath();
    for (let i = 0; i < 4; i++) {
      const x = 206 + i * 22, y = 100 - i * 16;
      c.moveTo(x, y - 6); c.lineTo(x + 26, y + 10); c.moveTo(x + 26, y - 6); c.lineTo(x, y + 10);
    }
    line(c, 5, '#fff');
    rr(c, 368, 24, 26, 44, 8); shape(c, '#1c7ed6', 4);
    rr(c, 18, 172, 386, 44, 20); shape(c, '#f8f9fa');
    c.beginPath(); for (let x = 40; x < 390; x += 24) { c.moveTo(x, 204); c.lineTo(x + 12, 204); } line(c, 4, '#adb5bd');
  }
  function drawPlate(c) {
    el(c, 180, 180, 168, 168); shape(c, '#ffffff');
    el(c, 180, 180, 118, 118); line(c, 4, '#dee2e6');
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU; el(c, 180 + Math.cos(a) * 144, 180 + Math.sin(a) * 144, 6, 6); fill(c, i % 2 ? '#74c0fc' : '#ffa8a8');
    }
  }
  function drawWindow(c) {
    rr(c, 8, 8, 304, 372, 16); shape(c, '#f1f3f5');
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x = 28 + i * 142, y = 28 + j * 172;
      rr(c, x, y, 122, 156, 8);
      const g = c.createLinearGradient(x, y, x + 122, y + 156); g.addColorStop(0, '#d0ebff'); g.addColorStop(1, '#a5d8ff');
      shape(c, g, 4);
      c.beginPath(); c.moveTo(x + 18, y + 60); c.lineTo(x + 60, y + 18); c.moveTo(x + 24, y + 92); c.lineTo(x + 92, y + 24);
      line(c, 6, 'rgba(255,255,255,.8)');
    }
    rr(c, 0, 366, 320, 28, 8); shape(c, '#ced4da');
    el(c, 160, 184, 9, 9); shape(c, '#ffd43b', 3);
  }
  const HAND_F = [[95, 62, 152], [137, 38, 172], [179, 46, 164], [221, 80, 136]];
  function handShapes(c, fn) {
    rr(c, 100, 296, 124, 110, 24); fn();
    for (const [x, top, len] of HAND_F) { rr(c, x - 21, top, 42, len + 60, 21); fn(); }
    c.save(); c.translate(234, 252); c.rotate(0.62); rr(c, -22, -112, 44, 132, 22); fn(); c.restore();
    rr(c, 68, 150, 184, 186, 64); fn();
  }
  function drawHand(c) {
    const skin = '#ffd8b5';
    handShapes(c, () => line(c, 10));
    handShapes(c, () => fill(c, skin));
    for (const [x, top] of HAND_F) { el(c, x, top + 15, 13, 10); shape(c, '#ffe9e3', 3); }
    c.beginPath(); c.moveTo(96, 222); c.quadraticCurveTo(150, 200, 214, 214); c.moveTo(110, 262); c.quadraticCurveTo(160, 252, 206, 272);
    line(c, 3, '#e8b48a');
    rr(c, 92, 376, 140, 40, 10); shape(c, '#74c0fc', 4);
  }
  function drawCat(c) {
    c.beginPath(); c.moveTo(240, 300); c.quadraticCurveTo(310, 280, 300, 220); c.quadraticCurveTo(296, 190, 280, 180); thick(c, '#ffa94d', 20);
    el(c, 170, 248, 90, 84); shape(c, '#ffa94d');
    el(c, 170, 268, 50, 54); fill(c, '#fff4e6');
    el(c, 140, 320, 26, 16); shape(c, '#fff4e6'); el(c, 200, 320, 26, 16); shape(c, '#fff4e6');
    tri(c, [100, 96], [108, 30], [152, 64]); shape(c, '#ffa94d'); tri(c, [240, 96], [232, 30], [188, 64]); shape(c, '#ffa94d');
    tri(c, [112, 80], [114, 46], [138, 64]); fill(c, '#ffc9c9'); tri(c, [228, 80], [226, 46], [202, 64]); fill(c, '#ffc9c9');
    el(c, 170, 125, 82, 72); shape(c, '#ffa94d');
    c.beginPath(); c.moveTo(160, 56); c.lineTo(160, 76); c.moveTo(180, 56); c.lineTo(180, 76); c.moveTo(140, 60); c.lineTo(146, 76);
    c.moveTo(200, 60); c.lineTo(194, 76); line(c, 5, '#e8590c');
    el(c, 170, 150, 32, 21); fill(c, '#fff4e6');
    tri(c, [162, 138], [178, 138], [170, 147]); fill(c, '#f783ac');
    c.beginPath(); c.moveTo(130, 148); c.lineTo(96, 142); c.moveTo(130, 156); c.lineTo(96, 160); c.moveTo(210, 148); c.lineTo(244, 142);
    c.moveTo(210, 156); c.lineTo(244, 160); line(c, 2.5);
  }
  function drawPenguin(c) {
    el(c, 115, 360, 30, 12); shape(c, '#ff922b', 4); el(c, 185, 360, 30, 12); shape(c, '#ff922b', 4);
    el(c, 52, 222, 22, 70, 0.35); shape(c, '#343a40'); el(c, 248, 222, 22, 70, -0.35); shape(c, '#343a40');
    el(c, 150, 210, 105, 150); shape(c, '#343a40');
    el(c, 150, 242, 74, 112); fill(c, '#f8f9fa');
    el(c, 150, 116, 60, 46); fill(c, '#f8f9fa');
    tri(c, [134, 128], [166, 128], [150, 150]); shape(c, '#ff922b', 4);
  }

  // ---------- ステージ ----------
  const OBJ_T = ['つめたい みずで ジャー！', 'ちょうどいい おゆで あらおう', 'あつい おゆ！ ゆげが もくもく'];
  const STAGES = [
    { id: 'densha', name: 'でんしゃ', emoji: '🚃', type: 'wash', W: 440, H: 230, bg: 'wash', draw: drawTrain,
      parts: ['head', 'mid', 'tail'], partNames: ['1りょうめ', '2りょうめ', '3りょうめ'],
      mud: ['#8a6240', '#a57a50'], stain: '#4e3423', tmsg: OBJ_T,
      intro: 'せんしゃきに でんしゃが きたよ！ なぞって みずを かけよう',
      done: 'ぴかぴかの でんしゃで しゅっぱつ しんこう！' },
    { id: 'zou', name: 'ぞう', emoji: '🐘', type: 'wash', W: 420, H: 320, bg: 'bath', draw: drawElephant,
      face: { eyes: [[92, 122], [140, 122]], er: 9, mouth: [116, 176] }, moods: ['love', 'ok', 'hot'],
      mud: ['#8a6240', '#a57a50'], stain: '#4e3423',
      tmsg: ['ひんやり つめたいの だいすき！ パオーン', 'きもちいい〜', 'あちち！ パオッ！'],
      done: 'ぞうさんは みずあびが だいすき！' },
    { id: 'inu', name: 'いぬ', emoji: '🐶', type: 'wash', W: 360, H: 340, bg: 'bath', draw: drawDog,
      face: { eyes: [[148, 110], [212, 110]], er: 9, mouth: [180, 170] }, moods: ['cold', 'love', 'hot'],
      mud: ['#7a5535', '#946a45'], stain: '#4a2f1c',
      tmsg: ['ぶるぶる… つめたいワン', 'ぬるめの おゆ さいこう ワン！', 'あちち ワン！'],
      done: 'ブルブルッ！ いぬは ぬるめの おゆが すきなんだ' },
    { id: 'kuruma', name: 'くるま', emoji: '🚗', type: 'wash', W: 440, H: 240, bg: 'wash', draw: drawCar,
      mud: ['#8a6240', '#a57a50'], stain: '#4e3423', tmsg: OBJ_T, done: 'ぴかぴか！ ドライブに しゅっぱつ！' },
    { id: 'buta', name: 'ブタ', emoji: '🐷', type: 'wash', W: 400, H: 300, bg: 'bath', draw: drawPig,
      face: { eyes: [[92, 120], [136, 116]], er: 8, mouth: [96, 186] }, moods: ['cold', 'love', 'hot'],
      mud: ['#7a5535', '#946a45'], stain: '#4a2f1c',
      tmsg: ['ぶひっ！ つめたい〜', 'ぶひ〜 ごくらく ごくらく', 'あちち ぶひ〜！'],
      done: 'ぴかぴか！ でも ブタさんは どろあそびも だいすき なんだって' },
    { id: 'kutsu', name: 'くつ', emoji: '👟', type: 'wash', W: 420, H: 240, bg: 'bath', draw: drawShoe,
      mud: ['#7a5535', '#946a45'], stain: '#3f2a1a', tmsg: OBJ_T, done: 'あしたも げんきに あるこう！' },
    { id: 'osara', name: 'おさら', emoji: '🍽️', type: 'wash', W: 360, H: 360, bg: 'kitchen', draw: drawPlate,
      mud: ['#c27c2c', '#d9973f'], stain: '#c92a2a', mudMul: [0.6, 1, 1.4], stainWater: [0, 0.03, 0.1],
      tmsg: ['つめたい みずだと あぶらが おちにくいね', 'おゆで あらうと よく おちるよ', 'あぶら よごれは おゆが とくい！'],
      intro: 'カレーと ケチャップで べたべた！ まずは みずで ながそう',
      done: 'ぴかぴかの おさらで ごはんが おいしいね' },
    { id: 'mado', name: 'まど', emoji: '🪟', type: 'wash', W: 320, H: 400, bg: 'garden', draw: drawWindow,
      mud: ['#8d7b68', '#a8977f'], stain: '#5c4a3a', tmsg: OBJ_T, done: 'ぴかぴか！ おそとが よく みえるね' },
    { id: 'te', name: 'じぶんの て', emoji: '✋', type: 'wash', W: 320, H: 420, bg: 'bath', draw: drawHand,
      mud: ['#a08060', '#b8997a'], noStain: true,
      zones: [
        { x: 160, y: 246, label: 'てのひら' }, { x: 158, y: 138, label: 'ゆびの あいだ' },
        { x: 137, y: 60, label: 'ゆびさき・つめ' }, { x: 268, y: 196, label: 'おやゆび' }, { x: 162, y: 340, label: 'てくび' }],
      tmsg: ['ひゃっ つめたい！', 'ちょうどいい おゆ', 'あちち！ やけどに きをつけて'], hotty: true,
      intro: 'おそとから かえったら てあらい！ まずは みずで ぬらそう',
      done: 'ばいきん バイバイ！ てあらいは 30びょう くらい ごしごし しようね' },
    { id: 'neko', name: 'ねこ', emoji: '🐱', type: 'wash', W: 340, H: 340, bg: 'bath', draw: drawCat,
      face: { eyes: [[140, 114], [200, 114]], er: 9, mouth: [170, 158] }, moods: ['cold', 'love', 'hot'],
      mud: ['#7a5535', '#946a45'], stain: '#4a2f1c',
      tmsg: ['にゃっ！ つめたいにゃ', 'にゃ〜ん ちょうどいい', 'ふーっ！ あちちにゃ'],
      done: 'ねこは みずが にがてな こも おおいよ。がまん できたね' },
    { id: 'pengin', name: 'ペンギン', emoji: '🐧', type: 'wash', W: 300, H: 380, bg: 'bath', draw: drawPenguin,
      face: { eyes: [[126, 106], [174, 106]], er: 8, mouth: [150, 162] }, moods: ['love', 'ok', 'hot'],
      mud: ['#b08a5a', '#c9a26e'], stain: '#7a5535',
      tmsg: ['こおりみたい！ だいすき', 'ちょっと ぬるいかな〜', 'あちち！ とけちゃう〜'],
      done: 'ペンギンは つめたい うみが だいすき！' },
    { id: 'mizuyari', name: 'みずやり', emoji: '🌷', type: 'flower', W: 440, H: 320, bg: 'garden', waste: 9,
      tmsg: ['つめたい みずで みずやり', 'ちょうどいい みずだね', 'おはなに あつい おゆは だめ〜！'],
      intro: 'おはなに みずを あげよう！ ちょうどいい ところ（みどり）まで',
      done: 'おはなが にっこり！ みずは ちょうどよく あげようね' },
    { id: 'shobo', name: 'しょうぼうし', emoji: '🚒', type: 'fire', W: 440, H: 340, bg: 'town', waste: 12,
      intro: 'かじだ！ ホースで ひを けそう！ ひを ねらって なぞってね',
      done: 'ひを ぜんぶ けしたよ！ しょうぼうしさん ありがとう' },
  ];

  // ---------- おと（WebAudio の ごうせいおん） ----------
  const AU = { ctx: null, master: null, ng: null, nf: null };
  function auInit() {
    if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      const ac = new C(); AU.ctx = ac;
      AU.master = ac.createGain(); AU.master.gain.value = save.sound ? 0.9 : 0; AU.master.connect(ac.destination);
      const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 220;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.55;
      const g = ac.createGain(); g.gain.value = 0;
      src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(AU.master); src.start();
      AU.nf = bp; AU.ng = g;
    } catch (e) { AU.ctx = null; }
  }
  function auWater(strength, hose, bright) {
    if (!AU.ctx || !AU.ng) return;
    const t = AU.ctx.currentTime;
    AU.ng.gain.setTargetAtTime(strength * (hose ? 0.5 : 0.3), t, 0.06);
    const f = hose ? 420 + strength * 650 : (700 + strength * 1500) * (bright ? 1.7 : 1);
    AU.nf.frequency.setTargetAtTime(f, t, 0.1);
  }
  function tone(f, dur, type, vol, when, f2) {
    if (!AU.ctx || !save.sound) return;
    const ac = AU.ctx, t = ac.currentTime + (when || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + 0.05);
  }
  const SFX = {
    puchi() { tone(R(900, 1700), 0.05, 'sine', 0.08, 0, R(1800, 2600)); },
    kiran() { [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, 0.35, 'sine', 0.12, i * 0.07)); },
    fanfare() {
      const n = [[523, 0], [659, 0.13], [784, 0.26], [1047, 0.42], [784, 0.62], [1047, 0.76]];
      n.forEach(([f, w], i) => { tone(f, i === 5 ? 0.6 : 0.16, 'triangle', 0.18, w + 0.25); tone(f / 2, 0.16, 'square', 0.04, w + 0.25); });
    },
    pop() { tone(700, 0.15, 'square', 0.08, 0, 160); tone(1400, 0.12, 'sine', 0.1, 0.05, 2400); },
    achichi() { tone(900, 0.12, 'sawtooth', 0.06, 0, 500); tone(900, 0.12, 'sawtooth', 0.06, 0.15, 500); },
    brr() { for (let i = 0; i < 4; i++) tone(260 + i * 8, 0.06, 'square', 0.04, i * 0.06); },
    happy() { tone(660, 0.1, 'sine', 0.12); tone(990, 0.16, 'sine', 0.12, 0.1); },
    step() { tone(784, 0.12, 'triangle', 0.14); tone(1175, 0.2, 'triangle', 0.14, 0.12); },
    jyu() { tone(R(2200, 3000), 0.08, 'sawtooth', 0.025, 0, 1200); },
    click() { tone(1200, 0.04, 'sine', 0.08); },
  };
  function setSound(on) {
    save.sound = on; persist();
    if (AU.master) AU.master.gain.setTargetAtTime(on ? 0.9 : 0, AU.ctx.currentTime, 0.02);
    for (const b of [$('#sndM'), $('#sndG')]) { b.textContent = on ? '🔊' : '🔇'; b.classList.toggle('off', !on); }
  }

  // ---------- がめん ----------
  const cv = $('#cv'), ctx = cv.getContext('2d');
  const wrap = $('#stageWrap'), bub = $('#bubble');
  let CW = 0, CH = 0, DPR = 1;
  let box = { x: 0, y: 0, s: 1, w: 1, h: 1 }, floorY = 0;
  let bgCv = null, objCv = null;
  let mw = 1, mh = 1, sil = null, silN = 1, silIdx = null, silCv = null;
  let mudCv = null, stainCv = null, foamCv = null;
  let brush = null, foamSp = null;

  const G = {
    stage: null, si: 0, part: 0, phase: 'menu', mode: 'water', temp: 1, time: 0, pt: 0,
    drops: [], fx: [], hits: [], rubs: [],
    ptr: { x: -999, y: -999, down: false, inside: false, touch: false, lx: 0, ly: 0, holdT: 0 },
    q: 1, dtAvg: 1 / 60, perfT: 0, emitAcc: 0, strength: 0, bright: false,
    mud0: 1, stain0: 0, mudN: 0, stainN: 0, foamN: 0, dirt: 1, foamR: 0, maxStep: 1, countT: 0,
    hitC: 0, missC: 0, missR: 0, waste: 0, wasteRunT: 0, sprayAt: -9, lastHitAt: -9,
    germs: [], pots: [], fires: [], goodT: 0,
    off: { x: 0, y: 0, rot: 0 }, phT: 0, hintAt: {},
  };
  window.__sa = { G, get box() { return box; }, STAGES };

  function sayOnce(key, msg, gap, ms) {
    const now = G.time;
    if (G.hintAt[key] !== undefined && now - G.hintAt[key] < (gap || 4)) return;
    G.hintAt[key] = now; say(msg, ms);
  }
  let sayTimer = 0;
  function say(msg, ms) {
    bub.textContent = msg; bub.classList.add('show');
    clearTimeout(sayTimer); sayTimer = setTimeout(() => bub.classList.remove('show'), ms || 2600);
  }

  function resize() {
    const r = wrap.getBoundingClientRect();
    CW = Math.max(1, r.width); CH = Math.max(1, r.height); DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(CW * DPR); cv.height = Math.round(CH * DPR);
    if (G.stage) layout();
  }
  function layout() {
    const st = G.stage;
    const top = 46, bottom = st.type === 'fire' ? 70 : 22;
    const aw = CW - 24, ah = CH - top - bottom;
    const s = Math.max(0.2, Math.min(aw / st.W, ah / st.H));
    box = { s, w: st.W * s, h: st.H * s, x: (CW - st.W * s) / 2, y: top + (ah - st.H * s) / 2 };
    floorY = st.type === 'wash' || st.type === 'flower' ? Math.min(CH - 6, box.y + box.h + 10) : CH - 4;
    bgCv = mkCanvas(CW * DPR, CH * DPR);
    drawBg(bgCv.getContext('2d'), st.bg);
    if (st.type === 'wash') {
      objCv = mkCanvas(box.w * DPR, box.h * DPR);
      const oc = objCv.getContext('2d'); oc.setTransform(s * DPR, 0, 0, s * DPR, 0, 0);
      st.draw(oc, st.parts ? st.parts[G.part] : undefined);
    }
  }

  function drawBg(c, kind) {
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const W = CW, H = CH;
    if (kind === 'town') {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffd8a8'); g.addColorStop(1, '#fff4e6');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = '#e9ecef';
      for (let i = 0; i < 6; i++) { const x = i * W / 5 - 30, h = 80 + (i * 53) % 90; c.fillRect(x, H * 0.72 - h, W / 6, h + H); }
      c.fillStyle = '#ced4da'; c.fillRect(0, H * 0.86, W, H);
      return;
    }
    if (kind === 'garden' || kind === 'wash') {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#a5d8ff'); g.addColorStop(1, '#e7f5ff');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      for (const [x, y, r] of [[0.15, 0.2, 40], [0.8, 0.14, 52], [0.55, 0.3, 30]]) {
        c.fillStyle = 'rgba(255,255,255,.85)'; el(c, x * W, y * H, r * 1.6, r * 0.7); c.fill(); el(c, x * W + r * 0.6, y * H - r * 0.3, r, r * 0.6); c.fill();
      }
      if (kind === 'garden') {
        c.fillStyle = '#b2f2bb'; c.fillRect(0, floorY - 4, W, H); c.fillStyle = '#8ce99a';
        for (let x = 0; x < W; x += 18) { tri(c, [x, floorY], [x + 6, floorY - 14], [x + 12, floorY]); c.fill(); }
      } else {
        c.fillStyle = '#adb5bd'; c.fillRect(0, floorY - 2, W, H);
        c.fillStyle = '#868e96'; c.fillRect(0, floorY - 2, W, 6);
        // せんしゃき の アーチ
        c.fillStyle = 'rgba(255,255,255,.55)'; rr(c, 6, 50, 26, floorY - 50, 10); c.fill(); rr(c, W - 32, 50, 26, floorY - 50, 10); c.fill();
        c.fillStyle = '#1c7ed6'; c.fillRect(6, 42, W - 12, 16);
      }
      return;
    }
    // おふろば / だいどころ の タイル
    const tile = kind === 'kitchen' ? ['#fff9db', '#fff3bf'] : ['#e3fafc', '#c5f6fa'];
    c.fillStyle = tile[0]; c.fillRect(0, 0, W, H);
    const ts = Math.max(36, Math.min(64, W / 10));
    c.strokeStyle = tile[1]; c.lineWidth = 3;
    for (let x = 0; x < W; x += ts) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += ts) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.fillStyle = kind === 'kitchen' ? '#dee2e6' : '#99e9f2'; c.fillRect(0, floorY - 2, W, H);
    c.fillStyle = 'rgba(0,0,0,.06)'; c.fillRect(0, floorY - 2, W, 5);
  }

  // ---------- よごれマスク ----------
  function makeSprites() {
    brush = mkCanvas(64, 64);
    let c = brush.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    foamSp = mkCanvas(64, 64); c = foamSp.getContext('2d');
    el(c, 32, 32, 27, 27); c.fillStyle = 'rgba(255,255,255,.96)'; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(150,205,240,.9)'; c.stroke();
    el(c, 23, 22, 7, 5, -0.6); c.fillStyle = '#e7f5ff'; c.fill();
  }
  function maskCtx(cv) { return cv.getContext('2d', { willReadFrequently: true }); }
  function silPoint() { const i = silIdx[(Math.random() * silIdx.length) | 0]; return [(i % mw + 0.5) / MK, ((i / mw) | 0) / MK + 0.5 / MK]; }
  function makeMasks() {
    const st = G.stage;
    mw = Math.round(st.W * MK); mh = Math.round(st.H * MK);
    silCv = mkCanvas(mw, mh);
    const sc = maskCtx(silCv); sc.setTransform(MK, 0, 0, MK, 0, 0); st.draw(sc, st.parts ? st.parts[G.part] : undefined);
    const d = sc.getImageData(0, 0, mw, mh).data;
    sil = new Uint8Array(mw * mh); const idx = [];
    for (let i = 0; i < mw * mh; i++) if (d[i * 4 + 3] > 40) { sil[i] = 1; idx.push(i); }
    silIdx = idx; silN = Math.max(1, idx.length);
    mudCv = mkCanvas(mw, mh); stainCv = mkCanvas(mw, mh); foamCv = mkCanvas(mw, mh);
    const m = maskCtx(mudCv); m.setTransform(MK, 0, 0, MK, 0, 0);
    const area = silN / (MK * MK), blobs = Math.round(area / 2100);
    for (let i = 0; i < blobs; i++) {
      const [x, y] = silPoint(), r = R(16, 40);
      m.fillStyle = Math.random() < 0.6 ? st.mud[0] : st.mud[1];
      for (let k = 0; k < 3; k++) { el(m, x + R(-r, r) * 0.5, y + R(-r, r) * 0.5, r * R(0.6, 1), r * R(0.5, 0.9), R(0, 3)); m.fill(); }
    }
    m.fillStyle = st.mud[0];
    for (let i = 0; i < blobs * 2; i++) { const [x, y] = silPoint(); el(m, x, y, R(2, 6), R(2, 6)); m.fill(); }
    m.fillStyle = 'rgba(40,25,10,.25)';
    for (let i = 0; i < blobs; i++) { const [x, y] = silPoint(); el(m, x, y, R(4, 12), R(3, 8), R(0, 3)); m.fill(); }
    m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'destination-in'; m.drawImage(silCv, 0, 0); m.globalCompositeOperation = 'source-over';
    if (!st.noStain) {
      const s = maskCtx(stainCv); s.setTransform(MK, 0, 0, MK, 0, 0); s.fillStyle = st.stain;
      const n = Math.max(5, Math.round(area / 9000));
      for (let i = 0; i < n; i++) {
        const [x, y] = silPoint(), r = R(10, 18);
        for (let k = 0; k < 5; k++) { el(s, x + R(-r, r) * 0.6, y + R(-r, r) * 0.6, r * R(0.4, 0.8), r * R(0.4, 0.7), R(0, 3)); s.fill(); }
      }
      s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = 'destination-in'; s.drawImage(silCv, 0, 0); s.globalCompositeOperation = 'source-over';
    }
    G.mud0 = Math.max(1, countMask(mudCv)); G.stain0 = st.noStain ? 0 : countMask(stainCv);
    G.mudN = G.mud0; G.stainN = G.stain0; G.foamN = 0;
  }
  function countMask(c) {
    const d = maskCtx(c).getImageData(0, 0, mw, mh).data; let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
    return n;
  }
  function onSil(dx, dy) {
    const mx = Math.floor(dx * MK), my = Math.floor(dy * MK);
    if (mx < 0 || my < 0 || mx >= mw || my >= mh) return false;
    return sil[my * mw + mx] === 1;
  }
  const toD = (x, y) => [(x - box.x) / box.s, (y - box.y) / box.s];
  const toS = (x, y) => [box.x + x * box.s, box.y + y * box.s];

  function stamp(c, sp, pts, rad, alpha, jitter) {
    if (!pts.length || alpha <= 0) return;
    c.globalAlpha = alpha;
    for (let i = 0; i < pts.length; i += 2) {
      const r = rad * (jitter ? R(0.7, 1.3) : 1), j = jitter ? R(-5, 5) : 0;
      c.drawImage(sp, (pts[i] + j) * MK - r, (pts[i + 1] + (jitter ? R(-5, 5) : 0)) * MK - r, r * 2, r * 2);
    }
    c.globalAlpha = 1;
  }
  function applyHits() {
    const st = G.stage, h = G.hits, rb = G.rubs;
    if (h.length) {
      const m = maskCtx(mudCv), f = maskCtx(foamCv);
      m.globalCompositeOperation = 'destination-out'; stamp(m, brush, h, 13 * MK, 0.5 * (st.mudMul ? st.mudMul[G.temp] : 1)); m.globalCompositeOperation = 'source-over';
      if (G.foamN > 0 || rb.length) { f.globalCompositeOperation = 'destination-out'; stamp(f, brush, h, 15 * MK, 0.75); f.globalCompositeOperation = 'source-over'; }
      const sw = st.stainWater ? st.stainWater[G.temp] : 0.012;
      if (G.stain0) { const s = maskCtx(stainCv); s.globalCompositeOperation = 'destination-out'; stamp(s, brush, h, 10 * MK, sw); s.globalCompositeOperation = 'source-over'; }
      h.length = 0;
    }
    if (rb.length) {
      const f = maskCtx(foamCv);
      stamp(f, foamSp, rb, 9 * MK, 0.9, true);
      f.globalCompositeOperation = 'destination-in'; f.drawImage(silCv, 0, 0); f.globalCompositeOperation = 'source-over';
      if (G.stain0) { const s = maskCtx(stainCv); s.globalCompositeOperation = 'destination-out'; stamp(s, brush, rb, 17 * MK, 0.2); s.globalCompositeOperation = 'source-over'; }
      const m = maskCtx(mudCv); m.globalCompositeOperation = 'destination-out'; stamp(m, brush, rb, 15 * MK, 0.08); m.globalCompositeOperation = 'source-over';
      G.foamN = Math.max(G.foamN, 1);
      rb.length = 0;
    }
  }

  // ---------- ステージ じゅんび ----------
  function startStage(i) {
    G.si = i; G.stage = STAGES[i]; G.part = 0; G.waste = 0; G.temp = 1; G.mode = 'water';
    $('#menu').hidden = true; $('#game').hidden = false; $('#result').hidden = true;
    $('#stTitle').textContent = `${G.stage.emoji} ${G.stage.name}`;
    const st = G.stage, wash = st.type === 'wash';
    $('#steps').hidden = !wash; $('#goal').hidden = wash;
    $('#tSoap').hidden = !wash; $('#dial').hidden = st.type === 'fire';
    $('#tWaterLabel').textContent = st.type === 'fire' ? 'ホース' : 'みず';
    $('#tWater').querySelector('.ic').textContent = st.type === 'fire' ? '🚒' : '💧';
    $('#hudIcon').textContent = st.type === 'flower' ? '🌷' : st.type === 'fire' ? '🔥' : '✨';
    $('#goal').textContent = st.type === 'flower' ? 'みっつの おはなを ちょうどいい みずに しよう' : 'ひを ぜんぶ けそう！';
    setMode('water', true); setTemp(1, true);
    resize();
    initPart();
    G.phase = 'play';
    say(st.intro || `どろんこの ${st.name}！ なぞって みずを かけよう`, 3200);
  }
  function initPart() {
    const st = G.stage;
    G.drops.length = 0; G.fx.length = 0; G.hits.length = 0; G.rubs.length = 0;
    G.maxStep = 1; G.countT = 0; G.goodT = 0; G.off = { x: 0, y: 0, rot: 0 };
    G.germs = []; G.pots = []; G.fires = [];
    layout();
    if (st.type === 'wash') {
      makeMasks();
      if (st.zones) G.germs = st.zones.map((z, i) => ({ x: z.x, y: z.y, zone: i, hp: 1, r: 22, st: 'live', t: R(0, 6), hurt: 0, col: ['#69db7c', '#b197fc', '#ffa94d', '#63e6be', '#f783ac'][i] }));
    } else if (st.type === 'flower') {
      G.pots = [85, 220, 355].map((x, i) => ({ x, water: R(4, 16), grow: 0.1, droop: 0.6, state: 'dry', puddle: 0, col: ['#ff6b6b', '#ffd43b', '#f783ac'][i], bloom: 0 }));
    } else if (st.type === 'fire') {
      G.fires = [[160, 112, 1], [286, 102, 0.9], [122, 222, 0.95], [318, 222, 0.95], [220, 292, 1.05]].map(([x, y, b]) => ({ x, y, base: b, hp: 1, st: 'burn', hurt: 0, ph: R(0, 6), vx: 0, t: 0 }));
    }
    const pi = $('#partInfo');
    if (st.parts) { pi.hidden = false; pi.textContent = `🚃 ${st.partNames[G.part]} / ${st.parts.length}`; } else pi.hidden = true;
    updateHud(); updateSteps();
  }
  function setMode(m, quiet) {
    G.mode = m;
    $('#tWater').classList.toggle('on', m === 'water'); $('#tSoap').classList.toggle('on', m === 'soap');
    $('#tWater').classList.remove('glow'); $('#tSoap').classList.remove('glow');
    if (!quiet) { SFX.click(); say(m === 'soap' ? '🧴 あわあわ！ なぞって ごしごし' : '💧 シャワー！ なぞると みずが でるよ', 1800); }
  }
  function setTemp(t, quiet) {
    G.temp = t;
    document.querySelectorAll('#dial button').forEach((b) => b.classList.toggle('on', +b.dataset.t === t));
    $('#knob i').style.transform = `rotate(${(t - 1) * 60}deg)`;
    if (quiet || !G.stage) return;
    const st = G.stage;
    if (st.tmsg) say(st.tmsg[t], 2400);
    const mood = st.moods ? st.moods[t] : (st.hotty && t === 2 ? 'hot' : st.hotty && t === 0 ? 'cold' : 'ok');
    if (mood === 'hot') SFX.achichi(); else if (mood === 'cold') SFX.brr(); else if (mood === 'love') SFX.happy(); else SFX.click();
    G.sprayAt = G.time; // かおを すぐ みせる
  }

  // ---------- ステップ・メーター ----------
  function stepsDone() {
    const st = G.stage;
    const s1 = G.mudN / G.mud0 <= 0.12;
    const germsLeft = G.germs.some((g) => g.st === 'live');
    const s2 = (G.stain0 === 0 || G.stainN / G.stain0 <= 0.06) && !germsLeft;
    const clear = G.dirt <= 0.05 && G.foamR <= 0.03 && !germsLeft;
    return { s1, s2, clear, st };
  }
  function updateSteps() {
    document.querySelectorAll('#steps li').forEach((li) => {
      const s = +li.dataset.s; li.classList.toggle('ok', s < G.maxStep); li.classList.toggle('now', s === G.maxStep);
    });
  }
  function countTick() {
    const st = G.stage;
    if (st.type !== 'wash') return;
    G.mudN = countMask(mudCv); G.stainN = G.stain0 ? countMask(stainCv) : 0; G.foamN = countMask(foamCv);
    G.dirt = (G.mudN + G.stainN) / (G.mud0 + G.stain0); G.foamR = G.foamN / silN;
    const d = stepsDone();
    let ns = !d.s1 ? 1 : !d.s2 ? 2 : 3;
    if (ns > G.maxStep) {
      G.maxStep = ns; SFX.step();
      if (ns === 2) {
        $('#tSoap').classList.add('glow');
        if (st.zones) say(`みずで ぬれたね！ 🧴 あわで ごしごし。① ${st.zones[0].label} から`, 3400);
        else say('どろが おちた！ つぎは 🧴 あわあわ ボタンを おしてね', 3200);
      } else if (ns === 3) {
        $('#tWater').classList.add('glow');
        say(st.zones ? 'ばいきん ぜんぶ やっつけた！ 💧 すすいで あわを ながそう' : 'ぴかぴかに なってきた！ 💧 すすいで あわを ながそう', 3200);
      }
      updateSteps();
    }
    updateHud();
    if (d.clear) startClear();
  }
  function wasteBudget() { return (G.stage.waste || 8) * (G.stage.parts ? G.stage.parts.length : 1); }
  function starsOf() { const b = wasteBudget(); return G.waste < b ? 3 : G.waste < b * 2.2 ? 2 : 1; }
  function updateHud() {
    const st = G.stage; let p = 0;
    if (st.type === 'wash') p = clamp(1 - G.dirt, 0, 1) * (G.foamR > 0.03 ? 0.97 : 1);
    else if (st.type === 'flower') p = G.pots.filter((q) => q.state === 'good').length / 3;
    else p = G.fires.filter((f) => f.st !== 'burn').length / G.fires.length;
    if (G.phase === 'clearing' || G.phase === 'result') p = 1;
    $('#cleanBar').style.width = `${Math.round(p * 100)}%`;
    $('#cleanPct').textContent = st.type === 'wash' ? `${Math.floor(p * 100)}%` : st.type === 'flower' ? `${Math.round(p * 3)}/3` : `${Math.round(p * G.fires.length)}/${G.fires.length}`;
    $('#tankLv').style.width = `${Math.round(clamp(1 - G.waste / (wasteBudget() * 3.2), 0.04, 1) * 100)}%`;
    const s = starsOf(); $('#ecoStars').textContent = '★'.repeat(s) + '☆'.repeat(3 - s);
  }

  // ---------- しずく ----------
  function headPos() {
    const p = G.ptr, off = G.mode === 'soap' ? (p.touch ? 40 : 0) : (p.touch ? 58 : 34);
    return [p.x, p.y - off];
  }
  function nozzle() {
    const ox = CW * 0.5, oy = CH - 34;
    let a = Math.atan2(G.ptr.y - oy, G.ptr.x - ox);
    if (G.ptr.x < -100) a = -Math.PI / 2;
    a = clamp(a, -Math.PI + 0.15, -0.15);
    return { ox, oy, a, tx: ox + Math.cos(a) * 44, ty: oy + Math.sin(a) * 44 };
  }
  function emit(dt) {
    const st = G.stage, p = G.ptr;
    const hose = st.type === 'fire';
    G.strength = Math.min(1, G.strength + dt * 1.6);
    const rate = (hose ? 380 : 440) * G.q * (0.55 + 0.45 * G.strength);
    const cap = 900 * G.q;
    G.emitAcc += rate * dt;
    let n = G.emitAcc | 0; G.emitAcc -= n;
    if (G.drops.length + n > cap) n = Math.max(0, cap - G.drops.length);
    if (hose) {
      const nz = nozzle();
      for (let i = 0; i < n; i++) {
        const tx = p.x + R(-14, 14), ty = p.y + R(-14, 14);
        const dist = Math.hypot(tx - nz.tx, ty - nz.ty), T = clamp(dist / 1100, 0.1, 0.6);
        G.drops.push({ k: 0, x: nz.tx, y: nz.ty, vx: (tx - nz.tx) / T, vy: (ty - nz.ty) / T - 0.5 * GRAV * T, t: 0, hitT: T * R(0.92, 1.06), done: false });
      }
    } else {
      const [hx, hy] = headPos();
      for (let i = 0; i < n; i++) {
        const a = R(-0.5, 0.5);
        G.drops.push({ k: 0, x: hx + R(-16, 16), y: hy + 14 + R(-3, 3), vx: Math.sin(a) * R(140, 260), vy: R(380, 560), t: 0, hitT: st.type === 'flower' ? 9 : R(0.03, 0.15), done: false, py: hy });
      }
      if (G.temp === 2 && Math.random() < dt * 8) G.fx.push({ k: 'steam', x: hx + R(-10, 10), y: hy, vx: R(-10, 10), vy: R(-50, -30), t: 0, life: R(0.8, 1.4), r: R(6, 12) });
    }
  }
  function removeDrop(i) { const a = G.drops; a[i] = a[a.length - 1]; a.pop(); }
  function splash(x, y, n) {
    for (let i = 0; i < n; i++) G.fx.push({ k: 'sp', x, y, vx: R(-120, 120), vy: R(-220, -60), t: 0, life: R(0.2, 0.4), r: R(1.5, 3) });
  }
  function updateDrops(dt) {
    const st = G.stage, a = G.drops;
    for (let i = a.length - 1; i >= 0; i--) {
      const d = a[i];
      d.t += dt;
      if (d.k === 1) { d.vy += GRAV * 0.08 * dt; d.y += d.vy * dt; d.life -= dt; if (d.life <= 0) removeDrop(i); continue; }
      const py = d.y;
      d.vy += GRAV * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.k === 0) {
        if (st.type === 'flower') { if (flowerCatch(d, py)) { removeDrop(i); continue; } }
        else if (!d.done && d.t >= d.hitT) {
          d.done = true;
          if (dropHit(d)) {
            G.hitC++;
            if (Math.random() < 0.35) { d.k = 1; d.vx = 0; d.vy = R(30, 70); d.life = R(0.2, 0.5); } else removeDrop(i);
            continue;
          }
          G.missC++;
        }
      }
      if (d.y > floorY) {
        if (d.k === 0 && st.type === 'flower') G.missC++;
        if (Math.random() < 0.18) splash(d.x, floorY, 1);
        removeDrop(i); continue;
      }
      if (d.x < -40 || d.x > CW + 40 || d.y < -200) removeDrop(i);
    }
  }
  function dropHit(d) {
    const st = G.stage, [dx, dy] = toD(d.x, d.y);
    if (st.type === 'fire') {
      for (const f of G.fires) {
        if (f.st !== 'burn') continue;
        const s = (0.45 + 0.55 * f.hp) * f.base;
        if (Math.hypot(dx - f.x, dy - (f.y - 40 * s)) < 46 * s + 8) {
          f.hp -= 0.0075; f.hurt = 0.35;
          if (Math.random() < 0.08) G.fx.push({ k: 'steam', x: d.x, y: d.y, vx: R(-20, 20), vy: R(-80, -40), t: 0, life: R(0.6, 1), r: R(8, 16) });
          if (f.hp <= 0) { f.st = 'run'; f.vx = (f.x < 220 ? -1 : 1) * 260; f.t = 0; SFX.pop(); sayOnce('run', 'ひえ〜！ にげろ〜', 1.5, 1600); }
          return true;
        }
      }
      return false;
    }
    if (!onSil(dx, dy)) return false;
    G.hits.push(dx, dy); G.lastHitAt = G.time;
    if (G.germs.length) for (const g of G.germs) if (g.st === 'live' && Math.hypot(dx - g.x, dy - g.y) < g.r * 1.4) sayOnce('germW', 'みずだけじゃ ばいきんは にげないよ。🧴 あわで ごしごし！', 5);
    return true;
  }
  function flowerCatch(d, py) {
    const [dx, dy] = toD(d.x, d.y), pdy = (py - box.y) / box.s;
    if (!(pdy < 236 && dy >= 236)) return false;
    for (const p of G.pots) {
      if (Math.abs(dx - p.x) < 46) {
        G.hitC++;
        if (G.temp === 2) { sayOnce('hotF', G.stage.tmsg[2], 3); return true; }
        p.water = Math.min(125, p.water + 0.42);
        if (Math.random() < 0.15) splash(d.x, d.y, 1);
        return true;
      }
    }
    return false;
  }

  // ---------- あわ・ばいきん ----------
  function rubAt(sx, sy) {
    const [dx, dy] = toD(sx, sy);
    if (!onSil(dx, dy)) return false;
    G.rubs.push(dx, dy);
    for (const g of G.germs) {
      if (g.st !== 'live' || Math.hypot(dx - g.x, dy - g.y) > g.r * 1.7) continue;
      const cur = G.germs.find((q) => q.st === 'live');
      if (cur !== g) { sayOnce('order', `じゅんばんに あらおう！ つぎは ${cur.zone + 1} ${G.stage.zones[cur.zone].label}`, 3); continue; }
      g.hp -= 0.06; g.hurt = 0.3;
      if (g.hp <= 0) {
        g.st = 'pop'; g.t = 0; SFX.pop();
        for (let i = 0; i < 10; i++) G.fx.push({ k: 'spark', x: toS(g.x, g.y)[0], y: toS(g.x, g.y)[1], vx: R(-160, 160), vy: R(-160, 160), t: 0, life: R(0.4, 0.8), r: R(5, 10) });
        const nx = G.germs.find((q) => q.st === 'live');
        if (nx) say(`やっつけた！ つぎは ${nx.zone + 1} ${G.stage.zones[nx.zone].label}`, 2400);
      }
    }
    if (Math.random() < 0.18) G.fx.push({ k: 'bub', x: sx + R(-14, 14), y: sy + R(-10, 10), vx: R(-15, 15), vy: R(-60, -30), t: 0, life: R(1, 2.2), r: R(4, 11) });
    if (G.time - (G.lastPuchi || 0) > 0.07) { G.lastPuchi = G.time; SFX.puchi(); }
    return true;
  }
  function rubTo(x, y) {
    const p = G.ptr, step = Math.max(3, 5 * box.s);
    const dist = Math.hypot(x - p.lx, y - p.ly);
    const n = Math.min(40, Math.floor(dist / step));
    for (let i = 1; i <= n; i++) rubAt(p.lx + (x - p.lx) * i / n, p.ly + (y - p.ly) * i / n);
    if (n > 0) { p.lx = x; p.ly = y; }
  }

  // ---------- まいフレーム ----------
  function update(dt) {
    const st = G.stage, p = G.ptr;
    G.pt += dt;
    // パーティクル数の じどう ちょうせい
    G.dtAvg += (dt - G.dtAvg) * 0.05; G.perfT += dt;
    if (G.perfT > 1) { G.perfT = 0; if (G.dtAvg > 1 / 46) G.q = Math.max(0.25, G.q * 0.85); else if (G.dtAvg < 1 / 56) G.q = Math.min(1, G.q * 1.05); }

    const playing = G.phase === 'play';
    const spraying = playing && p.down && (G.mode === 'water' || st.type !== 'wash');
    if (spraying) { emit(dt); G.sprayAt = G.time; } else { G.strength = Math.max(0, G.strength - dt * 4); G.emitAcc = 0; }
    if (playing && p.down && G.mode === 'soap' && st.type === 'wash') {
      const [hx, hy] = headPos();
      if (Math.random() < 0.35) rubAt(hx + R(-6, 6), hy + R(-6, 6));
    }
    updateDrops(dt);
    if (st.type === 'wash' || st.type === 'fire') { if (st.type === 'wash') applyHits(); }

    // みずの むだづかい
    const tot = G.hitC + G.missC;
    if (tot > 20) { G.missR += ((G.missC / tot) - G.missR) * 0.5; G.hitC = 0; G.missC = 0; }
    if (spraying) {
      G.waste += dt * Math.max(0, G.missR - 0.25) * 1.3;
      if (G.missR > 0.75) { G.wasteRunT += dt; if (G.wasteRunT > 2.2) { sayOnce('waste', 'みずが もったいない！ 💧 よごれに あてよう', 6); } } else G.wasteRunT = 0;
    } else G.wasteRunT = 0;
    G.bright = G.time - G.lastHitAt < 0.25;
    auWater(G.strength * (save.sound ? 1 : 0), st.type === 'fire', G.bright);

    // どうぶつの はんのう
    if (playing && spraying && st.moods && G.bright) {
      const mood = st.moods[G.temp];
      if (mood === 'hot') { if (G.time - (G.lastAchi || 0) > 1.6) { G.lastAchi = G.time; SFX.achichi(); sayOnce('hotA', st.tmsg[2], 3); } }
      else if (mood === 'cold') sayOnce('coldA', st.tmsg[0], 5);
    }
    if (playing && spraying && st.hotty && G.bright && G.temp === 2 && G.time - (G.lastAchi || 0) > 1.6) { G.lastAchi = G.time; SFX.achichi(); sayOnce('hotA', st.tmsg[2], 3); }
    if (playing && spraying && st.type === 'wash' && G.maxStep === 2 && G.bright && G.stain0) sayOnce('stainHint', 'しつこい よごれは 🧴 あわで ごしごし！', 6);

    if (st.type === 'flower') updateFlowers(dt);
    if (st.type === 'fire') updateFires(dt);
    for (const g of G.germs) { g.t += dt; g.hurt = Math.max(0, g.hurt - dt); if (g.st === 'pop' && g.t > 0.6) g.st = 'gone'; }

    // fx
    for (let i = G.fx.length - 1; i >= 0; i--) {
      const f = G.fx[i]; f.t += dt;
      if (f.k === 'sp' || f.k === 'fling') { f.vy += GRAV * dt; }
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.k === 'bub') f.x += Math.sin(f.t * 5 + f.r) * 0.5;
      if (f.t > f.life) { G.fx[i] = G.fx[G.fx.length - 1]; G.fx.pop(); }
    }
    if (G.fx.length > 600) G.fx.splice(0, G.fx.length - 600);

    if (playing && st.type === 'wash') { G.countT += dt; if (G.countT >= 0.5) { G.countT = 0; countTick(); } }
    if (playing && (st.type !== 'wash')) { G.countT += dt; if (G.countT >= 0.5) { G.countT = 0; updateHud(); } }

    if (G.phase === 'clearing') updateClear(dt);
    else if (G.phase === 'leaving' || G.phase === 'arriving') updateTrainMove(dt);
  }

  function updateFlowers(dt) {
    let allGood = true;
    for (const p of G.pots) {
      p.water = Math.max(0, p.water - dt * 2.4);
      const prev = p.state;
      p.state = p.water < 25 ? 'dry' : p.water < 55 ? 'grow' : p.water <= 100 ? 'good' : 'over';
      if (p.state === 'over') p.puddle = Math.min(1, p.puddle + dt * 0.6); else p.puddle = Math.max(0, p.puddle - dt * 0.08);
      if (prev !== p.state && G.phase === 'play') {
        if (p.state === 'good' && prev !== 'over') { SFX.happy(); say('さいた！ ちょうどいいね 🌸', 1800); }
        if (p.state === 'over') { SFX.brr(); sayOnce('over', 'かけすぎ〜！ みずたまりに なっちゃう', 3); }
      }
      const tg = clamp(p.water / 70, 0.1, 1);
      p.grow += (tg - p.grow) * Math.min(1, dt * 3);
      const td = p.state === 'dry' ? 0.6 : p.state === 'over' ? 0.7 : 0.05;
      p.droop += (td - p.droop) * Math.min(1, dt * 3);
      p.bloom += ((p.state === 'good' ? 1 : 0) - p.bloom) * Math.min(1, dt * 4);
      if (p.state !== 'good') allGood = false;
    }
    if (G.phase === 'play') { G.goodT = allGood ? G.goodT + dt : 0; if (G.goodT > 0.8) startClear(); }
  }
  function updateFires(dt) {
    for (const f of G.fires) {
      f.hurt = Math.max(0, f.hurt - dt);
      if (f.st === 'burn') { if (f.hurt <= 0) f.hp = Math.min(1, f.hp + dt * 0.04); if (f.hurt > 0 && Math.random() < dt * 6) SFX.jyu(); }
      else if (f.st === 'run') { f.t += dt; f.x += f.vx * dt; if (f.x < -80 || f.x > 520) f.st = 'gone'; }
    }
    if (G.phase === 'play' && G.fires.every((f) => f.st !== 'burn')) startClear();
  }

  // ---------- クリア ----------
  function startClear() {
    if (G.phase !== 'play') return;
    G.phase = 'clearing'; G.phT = 0; G.ptr.down = false; G.maxStep = 4; updateSteps();
    SFX.kiran(); SFX.fanfare(); updateHud();
    const st = G.stage;
    say(st.type === 'wash' ? 'ぴかぴか！ ✨' : st.type === 'flower' ? 'ぜんぶ さいた！ 🌸' : 'ひが きえた！ 🎉', 2200);
    for (let i = 0; i < 26; i++) {
      const [x, y] = st.type === 'wash' ? toS(...silPoint()) : [box.x + R(0, box.w), box.y + R(0, box.h)];
      G.fx.push({ k: 'spark', x, y, vx: 0, vy: 0, t: -R(0, 1.2), life: R(0.8, 1.3), r: R(8, 18) });
    }
  }
  function updateClear(dt) {
    const st = G.stage; G.phT += dt;
    const t = G.phT;
    if (st.type === 'wash' && t < 0.5) {
      for (const cv2 of [mudCv, stainCv, foamCv]) { const c = maskCtx(cv2); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 0.25; c.fillRect(0, 0, mw, mh); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    }
    if (st.moods && t > 0.4 && t < 1.7) {
      const k = 1 - (t - 0.4) / 1.3;
      G.off.rot = Math.sin(t * 46) * 0.07 * k;
      for (let i = 0; i < 5; i++) {
        const [dx, dy] = silPoint(), [sx, sy] = toS(dx, dy), cx = box.x + box.w / 2, cy = box.y + box.h / 2;
        const a = Math.atan2(sy - cy, sx - cx);
        G.fx.push({ k: 'fling', x: sx, y: sy, vx: Math.cos(a) * R(200, 420), vy: Math.sin(a) * R(200, 420) - 120, t: 0, life: R(0.4, 0.8), r: R(2, 4) });
      }
      if (G.phT - (G.lastBuru || 0) > 0.35) { G.lastBuru = G.phT; tone(180, 0.2, 'triangle', 0.08, 0, 120); }
    } else G.off.rot = 0;
    if (t > 2.6) {
      if (st.parts && G.part < st.parts.length - 1) { G.phase = 'leaving'; G.phT = 0; }
      else showResult();
    }
  }
  function updateTrainMove(dt) {
    G.phT += dt; const t = Math.min(1, G.phT / 0.9);
    if (G.phase === 'leaving') {
      G.off.x = -(t * t) * (CW + box.w) * 0.9;
      if (t >= 1) { G.part++; initPart(); G.phase = 'arriving'; G.phT = 0; G.off.x = CW; tone(330, 0.5, 'triangle', 0.08); tone(262, 0.6, 'triangle', 0.08, 0.3); }
    } else {
      G.off.x = (1 - t) * (1 - t) * (CW + box.w) * 0.6;
      if (t >= 1) { G.off.x = 0; G.phase = 'play'; say(`つぎは ${G.stage.partNames[G.part]}！ どろんこだ`, 2200); }
    }
  }
  function showResult() {
    G.phase = 'result';
    const st = G.stage, stars = starsOf();
    save.cleared[st.id] = Math.max(save.cleared[st.id] || 0, stars); persist();
    $('#rEmoji').textContent = st.emoji;
    $('#rStars').innerHTML = '★'.repeat(stars) + `<span class="off">${'★'.repeat(3 - stars)}</span>`;
    $('#rEco').textContent = stars === 3 ? '🌏 みずを だいじに つかえたね！ エコ マスター！'
      : stars === 2 ? '💧 いいね！ よごれに だけ あてると もっと エコだよ'
        : '🚰 みずの だしっぱなしは もったいない。ゆびを はなすと とまるよ';
    $('#rDone').textContent = st.done;
    document.querySelector('.rtitle').textContent = st.type === 'fire' ? 'ひが きえた！' : st.type === 'flower' ? 'ぜんぶ さいた！' : 'ぴかぴか！';
    const last = G.si >= STAGES.length - 1;
    $('#rNext').hidden = last;
    if (!last) $('#rNext').textContent = `つぎへ ${STAGES[G.si + 1].emoji} ▶`;
    $('#result').hidden = false;
  }

  // ---------- えがく ----------
  function render() {
    const c = ctx, st = G.stage;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(bgCv, 0, 0);
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (st.bg === 'wash') drawBrushes(c);
    if (st.type === 'wash') drawWashObj(c);
    else if (st.type === 'flower') drawFlowers(c);
    else drawFireScene(c);
    drawDrops(c);
    drawFx(c);
    drawCursor(c);
  }
  function drawBrushes(c) {
    const spin = (G.phase === 'leaving' || G.phase === 'arriving' || (G.ptr.down && G.mode === 'water')) ? G.time * 14 : G.time * 2;
    for (const x of [24, CW - 24]) {
      const h = floorY - 70;
      c.fillStyle = '#4dabf7'; rr(c, x - 14, 62, 28, h, 12); c.fill();
      c.strokeStyle = '#a5d8ff'; c.lineWidth = 4;
      for (let y = 0; y < h; y += 16) {
        const yy = 62 + ((y + spin * 6) % h);
        c.beginPath(); c.moveTo(x - 14, yy); c.lineTo(x + 14, yy + 6); c.stroke();
      }
    }
  }
  function objTransform(c) {
    c.translate(box.x + box.w / 2 + G.off.x, box.y + box.h + G.off.y);
    c.rotate(G.off.rot);
    c.translate(-box.w / 2, -box.h);
  }
  function drawWashObj(c) {
    const st = G.stage;
    c.save();
    c.fillStyle = 'rgba(0,0,0,.10)'; el(c, box.x + box.w / 2 + G.off.x, floorY - 4, box.w * 0.42, 8); c.fill();
    objTransform(c);
    c.drawImage(objCv, 0, 0, box.w, box.h);
    c.imageSmoothingEnabled = true;
    c.drawImage(mudCv, 0, 0, box.w, box.h);
    if (G.stain0) c.drawImage(stainCv, 0, 0, box.w, box.h);
    c.save(); c.scale(box.s, box.s);
    if (st.face) drawFace(c, st.face, currentMood(), G.time);
    c.restore();
    c.drawImage(foamCv, 0, 0, box.w, box.h);
    if (G.germs.length) { c.save(); c.scale(box.s, box.s); drawGerms(c); c.restore(); }
    if (G.phase === 'clearing') {
      // きらっと ひかる おび
      const t = G.phT / 1.2;
      if (t < 1) {
        const x = -box.w * 0.3 + t * box.w * 1.6;
        const g = c.createLinearGradient(x - 60, 0, x + 60, box.h);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        const tmp = sheenCanvas(); const tc = tmp.getContext('2d');
        tc.setTransform(1, 0, 0, 1, 0, 0); tc.clearRect(0, 0, tmp.width, tmp.height);
        tc.drawImage(objCv, 0, 0, tmp.width, tmp.height);
        tc.globalCompositeOperation = 'source-in'; tc.setTransform(tmp.width / box.w, 0, 0, tmp.height / box.h, 0, 0);
        tc.fillStyle = g; tc.fillRect(0, 0, box.w, box.h); tc.globalCompositeOperation = 'source-over';
        c.drawImage(tmp, 0, 0, box.w, box.h);
      }
    }
    c.restore();
  }
  let sheenCv = null;
  function sheenCanvas() {
    const w = Math.round(box.w / 2), h = Math.round(box.h / 2);
    if (!sheenCv || sheenCv.width !== w || sheenCv.height !== h) sheenCv = mkCanvas(w, h);
    return sheenCv;
  }
  function currentMood() {
    const st = G.stage;
    if (G.phase !== 'play') return G.phase === 'clearing' && G.phT > 0.4 && G.phT < 1.7 ? 'buru' : 'love';
    if (G.time - G.sprayAt < 0.8) return st.moods[G.temp];
    return 'idle';
  }
  function drawFace(c, f, mood, t) {
    const r = f.er, [mx, my] = f.mouth;
    c.save();
    if (mood === 'cold') c.translate(Math.sin(t * 70) * 1.6, 0);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const ch = mood === 'hot' ? 'rgba(255,80,80,.55)' : mood === 'cold' ? 'rgba(80,150,255,.4)' : 'rgba(255,120,150,.45)';
    for (const [x, y] of f.eyes) { el(c, x + (x < mx ? -r * 1.2 : r * 1.2), y + r * 2.2, r * 1.3, r * 0.8); fill(c, ch); }
    for (let i = 0; i < 2; i++) {
      const [x, y] = f.eyes[i];
      c.beginPath();
      if (mood === 'love' || mood === 'buru') {
        c.arc(x, y + r * 0.5, r, Math.PI * 1.15, Math.PI * 1.85); line(c, r * 0.5);
      } else if (mood === 'cold' || mood === 'hot') {
        const s = i === 0 ? 1 : -1;
        c.moveTo(x - s * r, y - r * 0.8); c.lineTo(x + s * r * 0.6, y); c.lineTo(x - s * r, y + r * 0.8); line(c, r * 0.45);
      } else {
        el(c, x, y, r * 0.8, r); fill(c, OUT); el(c, x + r * 0.25, y - r * 0.35, r * 0.3, r * 0.3); fill(c, '#fff');
      }
    }
    c.beginPath();
    if (mood === 'love' || mood === 'buru') {
      c.moveTo(mx - r * 1.2, my - r * 0.4); c.quadraticCurveTo(mx, my + r * 1.8, mx + r * 1.2, my - r * 0.4); c.closePath();
      shape(c, '#e8590c', r * 0.35); el(c, mx, my + r * 0.55, r * 0.55, r * 0.35); fill(c, '#ff8787');
    } else if (mood === 'hot') {
      el(c, mx, my, r * 0.7, r * 0.9); shape(c, '#c92a2a', r * 0.35);
    } else if (mood === 'cold') {
      c.moveTo(mx - r * 1.2, my); for (let k = 1; k <= 4; k++) c.lineTo(mx - r * 1.2 + k * r * 0.6, my + (k % 2 ? -r * 0.35 : r * 0.35)); line(c, r * 0.35);
    } else {
      c.moveTo(mx - r * 0.9, my - r * 0.2); c.quadraticCurveTo(mx, my + r * 0.9, mx + r * 0.9, my - r * 0.2); line(c, r * 0.4);
    }
    c.restore();
    const [ex, ey] = f.eyes[1];
    if (mood === 'hot') {
      // あせ と ゆげ
      c.beginPath(); c.moveTo(ex + r * 3, ey - r * 2); c.quadraticCurveTo(ex + r * 4.2, ey, ex + r * 3, ey + r * 0.8); c.quadraticCurveTo(ex + r * 1.8, ey, ex + r * 3, ey - r * 2);
      shape(c, '#74c0fc', 2.5);
    } else if (mood === 'cold') {
      const [lx, ly] = f.eyes[0];
      c.beginPath(); for (let k = 0; k < 3; k++) { c.moveTo(lx - r * 3.2 - k * 6, ly - r); c.quadraticCurveTo(lx - r * 4 - k * 6, ly + r, lx - r * 3.2 - k * 6, ly + r * 3); } line(c, 3, '#4dabf7');
    } else if (mood === 'love') {
      const k = (Math.sin(t * 4) + 1) * 0.5;
      c.save(); c.globalAlpha = 0.6 + 0.4 * k; c.translate(ex + r * 3.4, ey - r * 3 - k * 4); c.scale(r / 9, r / 9);
      c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-14, -4, -6, -14, 0, -6); c.bezierCurveTo(6, -14, 14, -4, 0, 6); fill(c, '#ff6b9d'); c.restore();
    }
  }
  function drawGerms(c) {
    const cur = G.germs.find((g) => g.st === 'live');
    if (cur && G.phase === 'play' && G.maxStep >= 2) {
      const z = G.stage.zones[cur.zone], pr = 1 + Math.sin(G.time * 6) * 0.08;
      c.save(); c.setLineDash([8, 7]); el(c, z.x, z.y, 40 * pr, 40 * pr); line(c, 4, '#fab005'); c.restore();
      el(c, z.x - 34, z.y - 34, 14, 14); shape(c, '#fab005', 3);
      c.fillStyle = '#fff'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(cur.zone + 1), z.x - 34, z.y - 33);
    }
    for (const g of G.germs) {
      if (g.st === 'gone') continue;
      let s = 0.55 + 0.45 * Math.max(0, g.hp), al = 1, rot = Math.sin(g.t * 3) * 0.2;
      if (g.st === 'pop') { const k = g.t / 0.6; s = 0.6 + k; al = 1 - k; rot = k * 6; }
      c.save(); c.globalAlpha = al; c.translate(g.x + Math.sin(g.t * 2.3) * 3, g.y + Math.cos(g.t * 2.9) * 3); c.rotate(rot); c.scale(s, s);
      const r = g.r;
      c.beginPath();
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, rad = i % 2 ? r : r * 1.3; c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
      c.closePath(); shape(c, g.col, 3);
      const hurt = g.hurt > 0 || g.st === 'pop';
      c.beginPath();
      if (hurt) { c.moveTo(-10, -8); c.lineTo(-4, -4); c.lineTo(-10, 0); c.moveTo(10, -8); c.lineTo(4, -4); c.lineTo(10, 0); line(c, 3); }
      else {
        el(c, -7, -4, 4, 5); fill(c, OUT); el(c, 7, -4, 4, 5); fill(c, OUT);
        c.beginPath(); c.moveTo(-12, -13); c.lineTo(-3, -9); c.moveTo(12, -13); c.lineTo(3, -9); line(c, 3);
      }
      c.beginPath(); if (hurt) { el(c, 0, 8, 5, 6); fill(c, OUT); } else { c.moveTo(-7, 6); c.lineTo(-3, 9); c.lineTo(0, 6); c.lineTo(3, 9); c.lineTo(7, 6); line(c, 2.5); }
      c.restore();
    }
  }

  function drawFlowers(c) {
    c.save(); c.translate(box.x, box.y); c.scale(box.s, box.s);
    for (const p of G.pots) {
      if (p.puddle > 0.01) { el(c, p.x, 312, 40 + 60 * p.puddle, 6 + 8 * p.puddle); fill(c, 'rgba(116,192,252,.75)'); }
      // くき
      const h = 40 + 80 * p.grow, a = p.droop * (p.x < 220 ? -1 : 1) * (p.state === 'over' ? -1 : 1);
      const tx = p.x + Math.sin(a) * h * 0.7, ty = 232 - Math.cos(a) * h;
      c.beginPath(); c.moveTo(p.x, 236); c.quadraticCurveTo(p.x, 232 - h * 0.6, tx, ty); line(c, 9); line(c, 6, '#51cf66');
      for (const [k, sgn] of [[0.35, -1], [0.55, 1]]) {
        const lx = p.x + (tx - p.x) * k * 0.5, ly = 236 - (236 - ty) * k;
        el(c, lx + sgn * 16, ly, 18 * (0.5 + p.grow * 0.5), 8, sgn * -0.5); shape(c, '#69db7c', 3);
      }
      // はな
      c.save(); c.translate(tx, ty); c.rotate(a * 0.8);
      const fs = 0.6 + 0.5 * p.grow;
      c.scale(fs, fs);
      if (p.bloom > 0.05) {
        const b = p.bloom;
        for (let i = 0; i < 6; i++) { const aa = i / 6 * TAU + G.time * 0.2; el(c, Math.cos(aa) * 20 * b, Math.sin(aa) * 20 * b, 16 * b, 11 * b, aa); shape(c, p.col, 3); }
      }
      if (p.bloom < 0.95) {
        c.save(); c.globalAlpha = 1 - p.bloom;
        c.beginPath(); c.moveTo(-16, -6); c.quadraticCurveTo(-18, -34, -8, -36); c.lineTo(0, -24); c.lineTo(8, -36); c.quadraticCurveTo(18, -34, 16, -6); c.quadraticCurveTo(0, 8, -16, -6);
        shape(c, p.col, 3); c.restore();
      }
      el(c, 0, 0, 13, 13); shape(c, '#ffe066', 3);
      // かお
      c.beginPath();
      if (p.state === 'good') { c.arc(-5, 0, 3, Math.PI * 1.1, Math.PI * 1.9); c.moveTo(8, 0); c.arc(5, 0, 3, Math.PI * 1.1, Math.PI * 1.9); line(c, 2); c.beginPath(); c.arc(0, 3, 4, 0.1 * Math.PI, 0.9 * Math.PI); line(c, 2); }
      else if (p.state === 'over') { c.moveTo(-8, -4); c.lineTo(-3, -1); c.lineTo(-8, 2); c.moveTo(8, -4); c.lineTo(3, -1); c.lineTo(8, 2); line(c, 2); el(c, 0, 6, 3, 3); fill(c, OUT); }
      else if (p.state === 'dry') { c.moveTo(-8, -1); c.lineTo(-3, -1); c.moveTo(3, -1); c.lineTo(8, -1); line(c, 2); c.beginPath(); c.arc(0, 8, 4, 1.15 * Math.PI, 1.85 * Math.PI); line(c, 2); }
      else { el(c, -5, -1, 2, 2.5); fill(c, OUT); el(c, 5, -1, 2, 2.5); fill(c, OUT); c.beginPath(); c.arc(0, 3, 3, 0.1 * Math.PI, 0.9 * Math.PI); line(c, 2); }
      c.restore();
      // うえきばち
      c.beginPath(); c.moveTo(p.x - 46, 236); c.lineTo(p.x + 46, 236); c.lineTo(p.x + 34, 306); c.lineTo(p.x - 34, 306); c.closePath(); shape(c, '#e8590c', 4);
      rr(c, p.x - 52, 226, 104, 18, 6); shape(c, '#fd7e14', 4);
      el(c, p.x, 229, 42, 4); fill(c, p.water > 30 ? '#5c3d2e' : '#a07850');
      // メーター
      const gx = p.x + 56, gy0 = 244, gh = 62, lv = (v) => gy0 + gh - gh * v / 125;
      rr(c, gx, gy0, 12, gh, 6); shape(c, '#fff', 3);
      c.fillStyle = 'rgba(64,192,87,.45)'; c.fillRect(gx + 1.5, lv(100), 9, lv(55) - lv(100));
      c.fillStyle = p.state === 'over' ? '#fa5252' : '#339af0'; c.fillRect(gx + 3, lv(p.water), 6, gy0 + gh - lv(p.water) - 2);
    }
    c.restore();
  }

  function drawFireScene(c) {
    c.save(); c.translate(box.x, box.y); c.scale(box.s, box.s);
    // いえ
    rr(c, 60, 150, 320, 182, 6); shape(c, '#ffe8cc');
    tri(c, [36, 160], [220, 40], [404, 160]); shape(c, '#c0603d');
    for (const [x, y] of [[96, 190], [282, 190]]) { rr(c, x, y, 62, 56, 6); shape(c, '#495057', 4); }
    rr(c, 190, 250, 60, 82, 6); shape(c, '#8d5524', 4);
    for (const f of G.fires) if (f.st !== 'gone') drawFireChar(c, f);
    c.restore();
    // ホース
    const nz = nozzle();
    c.beginPath(); c.moveTo(-10, CH + 20); c.quadraticCurveTo(CW * 0.25, CH - 6, nz.ox, nz.oy); thick(c, '#e03131', 14);
    c.save(); c.translate(nz.ox, nz.oy); c.rotate(nz.a);
    rr(c, -6, -11, 50, 22, 8); shape(c, '#adb5bd', 4); rr(c, 34, -8, 14, 16, 4); shape(c, '#ffd43b', 4);
    c.restore();
    el(c, nz.ox, nz.oy, 14, 14); shape(c, '#e03131', 4);
  }
  function drawFireChar(c, f) {
    const s = (0.45 + 0.55 * Math.max(0, f.hp)) * f.base * (f.st === 'run' ? 0.45 : 1);
    const fl = 1 + Math.sin(G.time * 12 + f.ph) * 0.06;
    c.save();
    const bounce = f.st === 'run' ? -Math.abs(Math.sin(f.t * 14)) * 14 : 0;
    c.translate(f.x, f.y + bounce); c.scale(s, s * fl);
    if (f.st === 'run') {
      c.beginPath(); const lg = Math.sin(f.t * 22) * 10;
      c.moveTo(-10, -4); c.lineTo(-14 + lg, 18); c.moveTo(10, -4); c.lineTo(14 - lg, 18); line(c, 6);
      c.beginPath(); const dir = f.vx < 0 ? 1 : -1;
      for (let k = 0; k < 3; k++) { c.moveTo(dir * 50, -60 + k * 22); c.lineTo(dir * 80, -60 + k * 22); } line(c, 4, 'rgba(0,0,0,.35)');
    }
    c.beginPath(); c.moveTo(0, -96); c.bezierCurveTo(22, -62, 50, -42, 42, -10); c.bezierCurveTo(36, 12, -36, 12, -42, -10); c.bezierCurveTo(-50, -42, -16, -56, 0, -96);
    const g = c.createRadialGradient(0, -22, 4, 0, -30, 76);
    g.addColorStop(0, '#fff3bf'); g.addColorStop(0.35, '#ffd43b'); g.addColorStop(0.7, '#ff922b'); g.addColorStop(1, '#f03e3e');
    shape(c, g, 4);
    const hurt = f.hurt > 0 || f.st === 'run';
    c.beginPath();
    if (hurt) { c.moveTo(-18, -38); c.lineTo(-9, -32); c.lineTo(-18, -26); c.moveTo(18, -38); c.lineTo(9, -32); c.lineTo(18, -26); line(c, 4); el(c, 0, -14, 6, 8); fill(c, OUT);
      c.beginPath(); c.moveTo(28, -56); c.quadraticCurveTo(36, -44, 28, -40); c.quadraticCurveTo(20, -44, 28, -56); shape(c, '#74c0fc', 2); }
    else { el(c, -12, -32, 5, 7); fill(c, OUT); el(c, 12, -32, 5, 7); fill(c, OUT); c.beginPath(); c.arc(0, -20, 10, 0.15 * Math.PI, 0.85 * Math.PI); line(c, 4); }
    c.restore();
  }

  function drawDrops(c) {
    const a = G.drops; if (!a.length) return;
    const col = G.temp === 0 ? 'rgba(51,154,240,.85)' : G.temp === 2 ? 'rgba(255,146,170,.8)' : 'rgba(77,171,247,.75)';
    c.beginPath();
    for (let i = 0; i < a.length; i++) {
      const d = a[i];
      if (d.k === 1) continue;
      c.moveTo(d.x, d.y); c.lineTo(d.x - d.vx * 0.014, d.y - d.vy * 0.014);
    }
    c.lineCap = 'round'; c.lineWidth = G.stage.type === 'fire' ? 4 : 2.6; c.strokeStyle = col; c.stroke();
    c.beginPath();
    for (let i = 0; i < a.length; i++) { const d = a[i]; if (d.k !== 1) continue; c.moveTo(d.x + 2.2, d.y); c.arc(d.x, d.y, 2.2, 0, TAU); }
    c.fillStyle = 'rgba(208,235,255,.9)'; c.fill();
  }
  function drawFx(c) {
    const a = G.fx;
    c.beginPath();
    for (const f of a) if (f.k === 'sp' || f.k === 'fling') { c.moveTo(f.x + f.r, f.y); c.arc(f.x, f.y, f.r, 0, TAU); }
    c.fillStyle = 'rgba(116,192,252,.85)'; c.fill();
    for (const f of a) {
      if (f.t < 0) continue;
      const k = f.t / f.life;
      if (f.k === 'steam') { c.globalAlpha = 0.45 * (1 - k); el(c, f.x, f.y, f.r * (1 + k), f.r * (1 + k)); fill(c, '#fff'); }
      else if (f.k === 'bub') { c.globalAlpha = 1 - k * k; el(c, f.x, f.y, f.r, f.r); c.fillStyle = 'rgba(255,255,255,.5)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(120,190,240,.9)'; c.stroke(); }
      else if (f.k === 'spark') {
        c.globalAlpha = 1 - k; const s = f.r * Math.sin(Math.min(1, k * 1.5) * Math.PI);
        star(c, f.x, f.y, Math.max(0.5, s), 4); fill(c, k < 0.5 ? '#fff' : '#ffe066');
      }
    }
    c.globalAlpha = 1;
  }
  function drawCursor(c) {
    const p = G.ptr, st = G.stage;
    if (!p.inside || G.phase !== 'play') return;
    if (st.type === 'fire') {
      el(c, p.x, p.y, 18, 18); line(c, 3, 'rgba(224,49,49,.8)');
      c.beginPath(); c.moveTo(p.x - 26, p.y); c.lineTo(p.x - 10, p.y); c.moveTo(p.x + 10, p.y); c.lineTo(p.x + 26, p.y);
      c.moveTo(p.x, p.y - 26); c.lineTo(p.x, p.y - 10); c.moveTo(p.x, p.y + 10); c.lineTo(p.x, p.y + 26); line(c, 3, 'rgba(224,49,49,.8)');
      return;
    }
    const [hx, hy] = headPos();
    if (G.mode === 'soap' && st.type === 'wash') {
      c.save(); c.translate(hx, hy); c.rotate(-0.2 + (p.down ? Math.sin(G.time * 30) * 0.12 : 0));
      rr(c, -26, -16, 52, 32, 10); shape(c, '#ffe066', 4);
      for (const [x, y] of [[-12, -4], [4, 6], [14, -6], [-2, -8]]) { el(c, x, y, 3, 2.5); fill(c, '#fab005'); }
      el(c, -14, -18, 9, 9); shape(c, '#fff', 2); el(c, 6, -20, 6, 6); shape(c, '#fff', 2);
      c.restore();
      return;
    }
    c.save();
    c.beginPath(); c.moveTo(hx + 18, hy - 12); c.quadraticCurveTo(hx + 60, hy - 60, hx + 70, hy - 150); line(c, 16); line(c, 10, '#ced4da');
    c.translate(hx, hy); c.rotate(-0.25);
    rr(c, 4, -26, 22, 30, 8); shape(c, '#adb5bd', 4);
    el(c, 0, 4, 26, 12); shape(c, '#dee2e6', 4);
    el(c, 0, 10, 22, 6); fill(c, '#868e96');
    c.fillStyle = '#e7f5ff'; for (let i = -2; i <= 2; i++) { el(c, i * 7, 10, 1.6, 1.6); c.fill(); }
    c.restore();
  }

  // ---------- ゆび・マウス ----------
  function ptrPos(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  cv.addEventListener('pointerdown', (e) => {
    auInit(); e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (er) { /* むし */ }
    const [x, y] = ptrPos(e), p = G.ptr;
    p.touch = e.pointerType !== 'mouse'; p.x = x; p.y = y; p.down = true; p.inside = true; p.id = e.pointerId;
    const [hx, hy] = headPos(); p.lx = hx; p.ly = hy;
  });
  cv.addEventListener('pointermove', (e) => {
    const p = G.ptr;
    if (p.down && e.pointerId !== p.id) return;
    const [x, y] = ptrPos(e);
    p.touch = e.pointerType !== 'mouse'; p.x = x; p.y = y; p.inside = true;
    if (p.down && G.mode === 'soap' && G.stage && G.stage.type === 'wash' && G.phase === 'play') { const [hx, hy] = headPos(); rubTo(hx, hy); }
  });
  const up = (e) => {
    const p = G.ptr; if (e.pointerId !== p.id) return;
    p.down = false; if (p.touch) p.inside = false;
    if (G.stage && G.stage.type === 'wash' && G.phase === 'play') {
      countTick();
      if (G.phase === 'play' && G.maxStep >= 3 && G.foamR > 0.03) sayOnce('foamLeft', 'まだ あわあわ だよ 🫧 すすいでね', 3);
    }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !G.ptr.down) G.ptr.inside = false; });

  // ---------- ボタン ----------
  $('#tWater').addEventListener('click', () => { auInit(); setMode('water'); });
  $('#tSoap').addEventListener('click', () => { auInit(); setMode('soap'); });
  document.querySelectorAll('#dial button').forEach((b) => b.addEventListener('click', () => { auInit(); setTemp(+b.dataset.t); }));
  for (const b of [$('#sndM'), $('#sndG')]) b.addEventListener('click', () => { auInit(); setSound(!save.sound); });
  $('#back').addEventListener('click', () => { SFX.click(); showMenu(); });
  $('#rMenu').addEventListener('click', () => showMenu());
  $('#rAgain').addEventListener('click', () => startStage(G.si));
  $('#rNext').addEventListener('click', () => { if (G.si < STAGES.length - 1) startStage(G.si + 1); else showMenu(); });

  function showMenu() {
    G.stage = null; G.phase = 'menu'; G.ptr.down = false; auWater(0);
    $('#game').hidden = true; $('#menu').hidden = false;
    const grid = $('#stageGrid'); grid.innerHTML = '';
    let n = 0;
    STAGES.forEach((st, i) => {
      const s = save.cleared[st.id] || 0; if (s) n++;
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'scard' + (s ? ' done' : '') + (st.type !== 'wash' ? ' special' : '');
      b.innerHTML = `${s ? '<span class="tag">✨ ぴかぴか</span>' : st.type !== 'wash' ? '<span class="tag">おまけ</span>' : ''}`
        + `<span class="em">${st.emoji}</span><span class="nm">${st.name}</span>`
        + (s ? `<span class="st">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</span>` : `<span class="st none">${st.type === 'wash' ? 'どろんこ…' : 'まだ'}</span>`);
      b.addEventListener('click', () => { auInit(); SFX.click(); startStage(i); });
      grid.appendChild(b);
    });
    $('#zcount').textContent = n; $('#ztotal').textContent = STAGES.length;
  }

  let lastT = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0.001, (ts - lastT) / 1000 || 0.016)); lastT = ts;
    if (!G.stage || $('#game').hidden) return;
    G.time += dt;
    update(dt);
    render();
  }
  window.addEventListener('resize', () => { if (G.stage) { const keep = G.phase; resize(); G.phase = keep; } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { G.ptr.down = false; auWater(0); } });

  makeSprites();
  setSound(save.sound);
  showMenu();
  requestAnimationFrame(frame);
})();
