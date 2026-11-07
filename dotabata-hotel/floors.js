// どたばた ペット ホテル — フロアの データ
//  - Floors.PETS: ペットの しゅるい（にげかた・へやの いろ・マーク）
//  - Floors.PROPS: とびまわる もの（いす・つみき・ボール…）
//  - Floors.list: 1F〜5F。build() が かべ・へや・ドア・かぐ を はこ（AABB）に なおす
//  - Floors.reach(): ジャンプで いける ばしょを グリッド BFS で しらべる（テスト よう）
'use strict';
var Floors = (function () {
  var PETS = {
    usagi:    { emoji: '🐰', name: 'うさぎ',   color: '#ffffff', room: '#ff8fb6', speed: 4.6, r: 0.36, hop: true },
    inu:      { emoji: '🐶', name: 'いぬ',     color: '#e0a565', room: '#ffa94d', speed: 4.3, r: 0.4, friendly: true },
    penguin:  { emoji: '🐧', name: 'ペンギン', color: '#34405a', room: '#4dabf7', speed: 3.4, r: 0.38, slide: true },
    kame:     { emoji: '🐢', name: 'かめ',     color: '#5fb36b', room: '#20c997', speed: 1.5, r: 0.4, pop: 3.6 },
    neko:     { emoji: '🐱', name: 'ねこ',     color: '#ffb35c', room: '#b197fc', speed: 4.4, r: 0.36, climb: true, hide: true },
    niwatori: { emoji: '🐔', name: 'にわとり', color: '#fffbf0', room: '#fcc419', speed: 3.8, r: 0.36, flutter: true, hide: true },
    buta:     { emoji: '🐷', name: 'ぶた',     color: '#ffb3c6', room: '#e64980', speed: 3.0, r: 0.42, mud: true },
    risu:     { emoji: '🐿️', name: 'りす',     color: '#c7834d', room: '#a9744f', speed: 5.0, r: 0.32, climb: true, hop: true },
  };

  var PROPS = {
    chair:   { r: 0.36, m: 1.2,  e: 0.2,  mu: 0.5,  upright: true, colors: ['#e8735a', '#5c7cfa', '#51cf66', '#fcc419'] },
    block:   { r: 0.22, m: 0.4,  e: 0.3,  mu: 0.6,  lift: 1, colors: ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#da77f2'] },
    ball:    { r: 0.42, m: 0.3,  e: 0.85, mu: 0.01, roll: true, lift: 1, colors: ['#ff6b6b', '#4dabf7', '#ffd43b'] },
    cake:    { r: 0.26, m: 0.5,  e: 0.1,  mu: 0.7,  upright: true, lift: 1, colors: ['#ffc9de'] },
    pillow:  { r: 0.3,  m: 0.3,  e: 0.4,  mu: 0.6,  lift: 1, colors: ['#ffe066', '#a5d8ff', '#ffc9c9'] },
    plant:   { r: 0.32, m: 1.5,  e: 0.1,  mu: 0.7,  upright: true, colors: ['#c2703d'] },
    pan:     { r: 0.26, m: 0.6,  e: 0.35, mu: 0.4,  lift: 1, colors: ['#495057'] },
    ring:    { r: 0.42, m: 0.3,  e: 0.5,  mu: 0.3,  buoy: 3, lift: 1, upright: true, colors: ['#ff6b6b', '#ffd43b', '#4dabf7'] },
    balloon: { r: 0.35, m: 0.08, e: 0.6,  mu: 0.2,  gs: 0.03, damp: 0.9, upright: true, lift: 1, colors: ['#ff6b6b', '#ffd43b', '#74c0fc', '#b197fc', '#63e6be'] },
  };

  var CEIL = 7;

  // ---- フロアを くみたてる ------------------------------------------------
  function build(d) {
    var W = d.w / 2, D = d.d / 2, WH = d.wallH, T = 0.4;
    var fl = {
      id: d.id, label: d.label, name: d.name, emoji: d.emoji, w: d.w, d: d.d, wallH: WH,
      sky: d.sky, floorColor: d.floorColor, wallColor: d.wallColor,
      gravity: d.gravity || 1, zeroG: !!d.zeroG, events: d.events, par: d.par, mess: d.mess,
      start: [d.start[0], d.start[1] || 0, d.start[2]],
      boxes: [], ramps: [], cyls: [], water: [], decor: [], rooms: [], props: [], pets: [],
      perches: [], hides: [], showers: [], flour: [], elevator: null, signs: [],
      bounds: { min: [-W - 4.2, -2, -D - 4.2], max: [W + 4.2, CEIL, D + 4.2] },
    };
    function box(x0, z0, x1, z1, y0, y1, c, o) {
      o = o || {};
      var b = {
        min: [Math.min(x0, x1), y0, Math.min(z0, z1)], max: [Math.max(x0, x1), y1, Math.max(z0, z1)],
        c: c, vis: o.vis !== false, col: o.col !== false, side: null, occ: o.occ != null ? o.occ : (y1 - y0 > 1.5 && o.col !== false),
        mu: o.mu, e: o.e, tag: o.tag || '',
      };
      fl.boxes.push(b);
      return b;
    }
    // かべの めん（side）から みた ざひょう u（かべに そって）, v（そとがわへの きょり）→ x, z
    function sx(side, u, v) {
      if (side === 'n') return [u, -D - v];
      if (side === 's') return [u, D + v];
      if (side === 'w') return [-W - v, u];
      return [W + v, u];
    }
    function sbox(side, u0, v0, u1, v1, y0, y1, c, o) {
      var a = sx(side, u0, v0), b = sx(side, u1, v1);
      var bx = box(a[0], a[1], b[0], b[1], y0, y1, c, o);
      if (y1 - y0 > 0.5) bx.side = side; // カメラが そとがわに いる とき ひくく かく
      return bx;
    }
    // かべ: みえる ところ（WH まで）と みえない ところ（てんじょう まで）
    function wall(side, u0, v0, u1, v1, c) {
      sbox(side, u0, v0, u1, v1, 0, WH, c);
      sbox(side, u0, v0, u1, v1, WH, CEIL, null, { vis: false });
    }
    // ゆか
    if (d.floorBoxes) d.floorBoxes.forEach(function (f) { box(f[0], f[1], f[2], f[3], -2, 0, f[4] || d.floorColor); });
    else box(-W - 4.2, -D - 4.2, W + 4.2, D + 4.2, -2, 0, d.floorColor);
    // かべの そとがわの ゆかは くらく（へやの なか が わかりやすい）
    var dark = shade(d.floorColor, 0.62);
    box(-W - 4.2, -D - 4.2, W + 4.2, -D - T, 0, 0.004, dark, { col: false });
    box(-W - 4.2, D + T, W + 4.2, D + 4.2, 0, 0.004, dark, { col: false });
    box(-W - 4.2, -D - T, -W - T, D + T, 0, 0.004, dark, { col: false });
    box(W + T, -D - T, W + 4.2, D + T, 0, 0.004, dark, { col: false });
    // てんじょう（みえない）
    box(-W - 5, -D - 5, W + 5, D + 5, CEIL, CEIL + 1, null, { vis: false });

    // へや（ドア）
    var gaps = { n: [], s: [], w: [], e: [] };
    d.rooms.forEach(function (rm) {
      var type = rm[0], side = rm[1], u = rm[2], pet = PETS[type];
      gaps[side].push([u - 1.3, u + 1.3]);
      var col = pet.room;
      // おく の へや（アルコーブ）
      wall(side, u - 2.0, T, u - 1.6, T + 3.4, d.wallColor);
      wall(side, u + 1.6, T, u + 2.0, T + 3.4, d.wallColor);
      wall(side, u - 2.0, T + 3.0, u + 2.0, T + 3.4, col);
      sbox(side, u - 1.6, 0, u + 1.6, T + 3.0, 0, 0.03, col, { col: false });
      // ドアの はしら と うえ
      sbox(side, u - 1.3, -0.08, u - 1.05, T + 0.08, 0, Math.min(2.5, WH + 0.9), col);
      sbox(side, u + 1.05, -0.08, u + 1.3, T + 0.08, 0, Math.min(2.5, WH + 0.9), col);
      if (WH >= 2.6) {
        sbox(side, u - 1.3, -0.08, u + 1.3, T + 0.08, 2.3, 2.55, col);
        sbox(side, u - 1.05, 0, u + 1.05, T, 2.55, WH, d.wallColor);
      }
      var bed = sx(side, u, T + 2.0);
      fl.decor.push({ model: 'petBed', p: [bed[0], 0, bed[1]], rot: sideYaw(side), c: col });
      var z0 = sx(side, u - 1.5, -1.8), z1 = sx(side, u + 1.5, T + 3.0);
      var signP = sx(side, u, -0.12);
      var room = {
        pet: type, side: side, u: u, color: col,
        zone: { min: [Math.min(z0[0], z1[0]), -1.5, Math.min(z0[1], z1[1])], max: [Math.max(z0[0], z1[0]), 4.5, Math.max(z0[1], z1[1])] },
        door: [signP[0], 0, signP[1]],
        sign: [signP[0], Math.min(2.85, WH + 1.2), signP[1]],
        inside: [bed[0], 0, bed[1]],
      };
      fl.rooms.push(room);
    });
    // かべ（ドアの ところは あける）
    ['n', 's', 'w', 'e'].forEach(function (side) {
      var L = (side === 'n' || side === 's') ? W + T : D;
      var cuts = gaps[side].slice().sort(function (a, b) { return a[0] - b[0]; });
      var u = -L;
      cuts.concat([[L, L]]).forEach(function (g) {
        if (g[0] - u > 0.01) wall(side, u, 0, g[0], T, d.wallColor);
        u = g[1];
      });
    });
    var B = {
      box: box, sbox: sbox, W: W, D: D,
      decor: function (model, x, y, z, rot, c, s) { fl.decor.push({ model: model, p: [x, y, z], rot: rot || 0, c: c, s: s || 1 }); },
      ramp: function (o, c) { o.c = c; fl.ramps.push(o); },
      cyl: function (o, c) { o.c = c; fl.cyls.push(o); },
      water: function (x0, z0, x1, z1, y0, y1) { fl.water.push({ min: [x0, y0, z0], max: [x1, y1, z1] }); },
      table: function (x, z, w, dd, h, c) {
        box(x - w / 2, z - dd / 2, x + w / 2, z + dd / 2, h - 0.1, h, c, { occ: false });
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (k) {
          box(x + k[0] * (w / 2 - 0.12) - 0.06, z + k[1] * (dd / 2 - 0.12) - 0.06, x + k[0] * (w / 2 - 0.12) + 0.06, z + k[1] * (dd / 2 - 0.12) + 0.06, 0, h - 0.1, '#6b4a2f', { col: false });
        });
      },
      prop: function (type, x, y, z) { fl.props.push({ type: type, p: [x, y, z] }); },
      pet: function (type, x, y, z) { fl.pets.push({ type: type, p: [x, y, z] }); },
      perch: function (x, y, z) { fl.perches.push([x, y, z]); },
      hide: function (front, inside, yaw) { fl.hides.push({ front: front, inside: inside, yaw: yaw }); },
      shower: function (x, z) {
        fl.showers.push({ min: [x - 1.0, -1, z - 1.0], max: [x + 1.0, 3, z + 1.0], p: [x, 0, z] });
        box(x - 1.0, z - 1.0, x + 1.0, z + 1.0, 0, 0.03, '#a5d8ff', { col: false });
        box(x + 0.9, z - 0.1, x + 1.05, z + 0.1, 0, 2.6, '#adb5bd', { occ: false });
        fl.decor.push({ model: 'showerHead', p: [x, 2.5, z], rot: 0 });
      },
      flour: function (x0, z0, x1, z1) {
        fl.flour.push({ min: [x0, -1, z0], max: [x1, 3, z1] });
        box(x0, z0, x1, z1, 0, 0.025, '#fff9db', { col: false });
      },
      elevator: function (side, u) {
        var a = sx(side, u - 1.2, -0.06), b = sx(side, u + 1.2, 0);
        box(a[0], a[1], b[0], b[1], 0, 2.4, '#ced4da', { col: false });
        var c1 = sx(side, u - 0.03, -0.09), c2 = sx(side, u + 0.03, 0);
        box(c1[0], c1[1], c2[0], c2[1], 0, 2.4, '#868e96', { col: false });
        var z0 = sx(side, u - 1.2, -1.6), z1 = sx(side, u + 1.2, 0);
        fl.elevator = { min: [Math.min(z0[0], z1[0]), -1, Math.min(z0[1], z1[1])], max: [Math.max(z0[0], z1[0]), 3, Math.max(z0[1], z1[1])] };
        var sp = sx(side, u, -0.15);
        fl.signs.push({ text: '🛗', p: [sp[0], 2.7, sp[1]] });
      },
    };
    d.setup(B);
    return fl;
  }
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16);
    var f = function (v) { return ('0' + Math.round(v * k).toString(16)).slice(-2); };
    return '#' + f(n >> 16 & 255) + f(n >> 8 & 255) + f(n & 255);
  }
  function sideYaw(side) { return side === 'n' ? 0 : side === 's' ? Math.PI : side === 'w' ? Math.PI / 2 : -Math.PI / 2; }

  // ---- 1F〜5F ----------------------------------------------------------
  var list = [];
  list.push(build({
    id: '1f', label: '1F', name: 'ロビー', emoji: '🛋️', w: 24, d: 18, wallH: 3.0,
    sky: '#cfe8ff', floorColor: '#ead7b5', wallColor: '#f7efe2', start: [0, 0, 6.5],
    rooms: [['usagi', 'n', -6], ['inu', 'n', 6]],
    events: ['fuwafuwa', 'trampoline', 'jumbo', 'cake'], par: 120, mess: 20,
    setup: function (B) {
      B.box(-4, 2, 4, 6, 0, 0.02, '#e8590c', { col: false });
      B.box(-3, -3.2, 3, -2.2, 0, 1.1, '#c98d5a');
      B.box(-3.1, -3.3, 3.1, -2.1, 1.1, 1.18, '#8d5a2b');
      B.box(-9, 1, -6, 2, 0, 0.5, '#e8735a'); B.box(-9, 2, -6, 2.4, 0, 1.0, '#c9503a');
      B.box(-9, -5, -6, -4, 0, 0.5, '#5c7cfa'); B.box(-9, -5.4, -6, -5, 0, 1.0, '#3b5bdb');
      B.table(5.2, 1, 2.4, 1.4, 0.75, '#b07a4a');
      // 2かいの ろうか（かいだん つき）
      B.box(8.6, 0, 12, 9, 0, 1.8, '#d9b38c');
      B.box(5.6, 6.6, 6.6, 9, 0, 0.45, '#c39467'); B.box(6.6, 6.6, 7.6, 9, 0, 0.9, '#c39467'); B.box(7.6, 6.6, 8.6, 9, 0, 1.35, '#c39467');
      B.elevator('w', -2);
      [[-11, 8], [-11, -8.2], [3.6, -8.2], [-3.6, -8.2]].forEach(function (p) {
        B.box(p[0] - 0.3, p[1] - 0.3, p[0] + 0.3, p[1] + 0.3, 0, 0.6, '#c2703d', { occ: false });
        B.decor('plantBig', p[0], 0.6, p[1]);
      });
      B.decor('lamp', 0, 1.18, -2.7);
      B.prop('chair', -2, 0, 4); B.prop('chair', 2, 0, 4); B.prop('chair', 4.0, 0, -0.4); B.prop('chair', 6.4, 0, 2.5);
      [[-1, 0, 1], [1, 0, 0.6], [0, 0, -0.6], [-2.5, 0, 0], [2.6, 0, -1], [-4.5, 0, -1.5], [-0.5, 0, 7.5], [3, 0, 7.5]].forEach(function (p) { B.prop('block', p[0], p[1], p[2]); });
      B.prop('ball', -4, 0, 6); B.prop('ball', 3, 0, -5);
      B.prop('cake', 5.2, 1.0, 1); B.prop('cake', -1.5, 1.4, -2.7);
      B.prop('pillow', -8, 0.8, 1.5); B.prop('pillow', -7, 0.8, 1.5); B.prop('pillow', -7.5, 0.8, -4.5);
      B.prop('plant', 10.5, 1.8, 1); B.prop('plant', -10.5, 0, 4);
      B.pet('usagi', -5, 0, 3.4); B.pet('usagi', 10, 1.8, 5); B.pet('inu', 4, 0, -5); B.pet('inu', -3, 0, 6);
    },
  }));

  list.push(build({
    id: '2f', label: '2F', name: 'プール', emoji: '🏊', w: 24, d: 18, wallH: 3.0,
    sky: '#d0f4ff', floorColor: '#e3f2f8', wallColor: '#ffffff', start: [0, 0, 6.5],
    rooms: [['penguin', 'n', -6], ['kame', 'n', 6]],
    floorBoxes: [[-16.2, -13.2, 16.2, -3], [-16.2, 4, 16.2, 13.2], [-16.2, -3, -6, 4], [6, -3, 16.2, 4], [-6, -3, 6, 4, '#4dabf7']],
    events: ['trampoline', 'ice', 'foam', 'jikan', 'fart'], par: 150, mess: 20,
    setup: function (B) {
      // プールの そこ（ゆかの はこを したげて あなを つくる）
      B.box(-6, -3, 6, 4, -2, -1.2, '#4dabf7');
      B.water(-6, -3, 6, 4, -1.2, -0.25);
      // すべりだい
      B.box(7, -3, 9, -1, 0, 2.0, '#ff922b'); B.box(7, -1, 9, 0, 0, 1.5, '#ffa94d'); B.box(7, 0, 9, 1, 0, 1.0, '#ffa94d'); B.box(7, 1, 9, 2, 0, 0.5, '#ffa94d');
      B.ramp({ x0: 2.5, x1: 7, z0: -2.8, z1: -1.2, h0: -0.9, h1: 2.0, axis: 'x', mu: 0.05 }, '#ffd43b');
      [[-9.5, -5.5], [9.5, 6.5], [-9.5, 6.5]].forEach(function (p) {
        B.box(p[0] - 0.12, p[1] - 0.12, p[0] + 0.12, p[1] + 0.12, 0, 2.2, '#f8f9fa', { occ: false });
        B.decor('parasol', p[0], 2.2, p[1]);
      });
      B.prop('ball', -8, 0, 6); B.prop('ball', 8.5, 0, 4.6); B.prop('ball', -2, -0.6, 0.5); B.prop('ball', -10, 0, -2);
      B.prop('ring', -3.5, -0.6, 2); B.prop('ring', 2, -0.6, 2.5); B.prop('ring', -1, -0.6, -1.5);
      B.prop('chair', -8, 0, -6.6); B.prop('chair', -6.5, 0, -6.6); B.prop('chair', 10, 0, 5); B.prop('chair', 4, 0, 6.6);
      B.prop('block', 9.5, 0, -6); B.prop('block', 10.5, 0, -5); B.prop('block', -10.5, 0, 2); B.prop('block', 0, 0, 7.5);
      B.pet('penguin', -9, 0, 0.5); B.pet('penguin', 9, 0, 5.8); B.pet('kame', -3, 0, 6.6); B.pet('kame', 3, 0, -6);
    },
  }));

  list.push(build({
    id: '3f', label: '3F', name: 'キッチン', emoji: '🍳', w: 24, d: 18, wallH: 3.0,
    sky: '#fff4e0', floorColor: '#f1e3c8', wallColor: '#fffaf0', start: [0, 0, 6.8],
    rooms: [['neko', 'n', -6], ['niwatori', 'n', 6]],
    events: ['fuwafuwa', 'ice', 'tilt', 'tiny', 'cake', 'fart'], par: 160, mess: 25,
    setup: function (B) {
      B.box(-4, -1, 4, 1, 0, 0.95, '#dee2e6'); B.box(-4.1, -1.1, 4.1, 1.1, 0.95, 1.0, '#868e96', { col: false });
      B.box(-12, -6, -10.6, 3, 0, 0.95, '#ced4da');
      B.decor('stove', -11.3, 0.95, -4); B.decor('stove', -11.3, 0.95, 0);
      // れいぞうこ（なかに かくれる）
      B.box(-12, 5.2, -10.3, 8.8, 0, 2.3, '#f1f3f5');
      B.decor('fridgeDoor', -10.25, 0, 7.0);
      B.hide([-9.3, 0, 7.0], [-11.2, 0.6, 7.0], Math.PI / 2);
      // たかい たな（ねこの すき な ところ）と ふみだい
      B.box(9.6, -2.5, 12, 2.5, 0, 1.8, '#b07a4a'); B.box(8.6, -1, 9.6, 1, 0, 0.9, '#c39467');
      B.decor('jars', 11, 1.8, -1.8);
      B.perch(10.8, 1.8, 0.8); B.perch(0, 0.95, 0); B.perch(-11.3, 0.95, -2);
      B.flour(2, 4.4, 5.2, 7.6);
      B.box(5.4, 7.6, 6.2, 8.4, 0, 0.7, '#fff3bf', { occ: false });
      B.table(-5, 5, 2.4, 1.4, 0.75, '#e8a87c');
      B.prop('pan', -11.3, 1.3, -4); B.prop('pan', -11.3, 1.3, -1); B.prop('pan', -11.3, 1.3, 2); B.prop('pan', 1.5, 1.3, 0);
      B.prop('cake', -1, 1.3, 0); B.prop('cake', -5, 1.1, 5); B.prop('cake', 6, 0, -6);
      B.prop('block', -2.5, 1.3, 0.3); B.prop('block', 3, 0, -4); B.prop('block', -7, 0, -2); B.prop('block', 7, 0, 3);
      B.prop('chair', -6.4, 0, 3.6); B.prop('chair', -3.6, 0, 3.6); B.prop('chair', -6.4, 0, 6.5); B.prop('chair', -3.6, 0, 6.5);
      B.pet('neko', 1, 0, 5.8); B.pet('neko', 10.8, 1.8, 0); B.pet('niwatori', 5, 0, -6); B.pet('niwatori', -7, 0, -6);
    },
  }));

  list.push(build({
    id: '4f', label: '4F', name: 'おくじょう ゆうえんち', emoji: '🎠', w: 24, d: 18, wallH: 1.4,
    sky: '#9ad7ff', floorColor: '#9ed58a', wallColor: '#ffffff', start: [0, 0, 6.8],
    rooms: [['buta', 'n', -6], ['risu', 'n', 6]],
    events: ['trampoline', 'foam', 'tilt', 'jumbo', 'jikan', 'fart'], par: 170, mess: 25,
    setup: function (B) {
      B.cyl({ x: -5, z: 1.5, r: 2.6, y0: 0, y1: 0.35, spin: 0.7, tag: 'merry' }, '#f783ac');
      B.cyl({ x: -5, z: 1.5, r: 0.22, y0: 0, y1: 3.2, spin: 0 }, '#ffd43b');
      B.decor('merryRoof', -5, 3.2, 1.5);
      B.cyl({ x: 4.5, z: 3, r: 1.0, y0: 0, y1: 0.55, spin: 1.8, tag: 'cup' }, '#74c0fc');
      B.cyl({ x: 7.5, z: -1.5, r: 1.0, y0: 0, y1: 0.55, spin: -1.8, tag: 'cup' }, '#ffd43b');
      B.cyl({ x: 3.2, z: -3.6, r: 0.9, y0: 0, y1: 0.55, spin: 1.5, tag: 'cup' }, '#69db7c');
      B.shower(0, 5.6); B.shower(-10, -1);
      B.box(9, 5, 11.6, 8.6, 0, 0.8, '#b07a4a'); B.box(10.3, 5, 11.6, 8.6, 0, 1.6, '#8d5a2b');
      B.decor('tree', 11, 1.6, 8.0); B.perch(10.9, 1.6, 6.2);
      B.prop('balloon', -2, 1.0, -6); B.prop('balloon', 2, 1.0, -6); B.prop('balloon', -8, 1.0, 5.5); B.prop('balloon', 8.5, 1.0, -6); B.prop('balloon', 0, 1.0, 0);
      B.prop('ball', -9, 0, -6); B.prop('ball', 1.5, 0, 1.5); B.prop('ball', 9, 0, 1.5);
      B.prop('block', -2, 0, 3.5); B.prop('block', -1, 0, -2); B.prop('block', 6, 0, 6.6); B.prop('block', -9, 0, 7); B.prop('block', 10, 0, -6);
      B.prop('chair', -1.5, 0, 7.6); B.prop('chair', 2.5, 0, 7.6);
      B.pet('buta', -8.5, 0, -4.5); B.pet('buta', 8.5, 0, 3); B.pet('risu', -1, 0, -5); B.pet('risu', 10.9, 1.6, 6.2);
    },
  }));

  list.push(build({
    id: '5f', label: '5F', name: 'うちゅう スイート', emoji: '🪐', w: 24, d: 18, wallH: 3.0,
    sky: '#0b0d2e', floorColor: '#3b2f6b', wallColor: '#4c4f8f', start: [0, 0, 5.5],
    gravity: 0.06, zeroG: true,
    rooms: [['usagi', 'n', -7], ['penguin', 'n', 0], ['neko', 'n', 7], ['niwatori', 's', -7], ['risu', 's', 7]],
    events: ['foam', 'jumbo', 'tiny', 'jikan', 'cake'], par: 180, mess: 25,
    setup: function (B) {
      B.box(-3, -1.2, 3, 1.2, 2.2, 2.5, '#9775fa');
      B.box(-10, 2, -7, 4, 1.4, 1.7, '#748ffc');
      B.box(7, -5, 10, -3, 3.2, 3.5, '#748ffc');
      B.decor('planet', -6, 5.2, -3, 0, '#ff922b', 1.0);
      B.decor('planet', 6, 5.6, 3, 0, '#63e6be', 0.7);
      B.decor('planet', 0, 6.0, -6, 0, '#f06595', 0.5);
      [[-8, 1.2, 6], [-4, 2.4, -4], [-1, 1.0, 3], [2, 3.0, 0], [5, 1.5, -5], [8, 2.2, 5], [9, 1.0, 0], [-10, 3.0, -2]].forEach(function (p) { B.prop('block', p[0], p[1], p[2]); });
      B.prop('ball', -6, 2, 1); B.prop('ball', 6, 1.2, -1); B.prop('ball', 0, 4, 4); B.prop('ball', 3, 1, 6);
      B.prop('pillow', -2, 3.4, -2); B.prop('pillow', 4, 2.6, 3); B.prop('pillow', -9, 1.0, -6);
      B.prop('cake', 0, 2.8, 0); B.prop('cake', -8.5, 2.0, 3);
      B.pet('usagi', -5, 1.5, 2); B.pet('penguin', 4, 2, -3); B.pet('neko', 8, 1.2, 3); B.pet('niwatori', -8, 2.5, -4); B.pet('risu', 0, 3.4, 3);
    },
  }));

  var EVENT_IDS = ['fuwafuwa', 'trampoline', 'ice', 'foam', 'tilt', 'jumbo', 'tiny', 'fart', 'jikan', 'cake'];
  var endless = { id: 'mecha', label: '♾️', name: 'めちゃくちゃ モード', emoji: '♾️', time: 180 };

  function byId(id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // ---- いける ばしょ（グリッド BFS）-------------------------------------
  // jump: のぼれる たかさ、clear: たてる ために いる あたまの うえの すきま、rad: からだの はば
  function reach(fl, opt) {
    opt = opt || {};
    var jump = opt.jump || 1.2, clear = opt.clear || 1.3, rad = opt.rad || 0.3, cell = opt.cell || 0.25;
    var bmin = fl.bounds.min, bmax = fl.bounds.max;
    var nx = Math.ceil((bmax[0] - bmin[0]) / cell), nz = Math.ceil((bmax[2] - bmin[2]) / cell);
    var cols = fl.boxes.filter(function (b) { return b.col && b.min[1] < CEIL - 0.5; });
    var levels = new Array(nx * nz);
    function cx(i) { return bmin[0] + (i + 0.5) * cell; }
    function cz(k) { return bmin[2] + (k + 0.5) * cell; }
    for (var i = 0; i < nx; i++) for (var k = 0; k < nz; k++) {
      var x = cx(i), z = cz(k), surf = [], blk = [];
      cols.forEach(function (b) {
        var inside = x >= b.min[0] && x <= b.max[0] && z >= b.min[2] && z <= b.max[2];
        if (x >= b.min[0] - rad && x <= b.max[0] + rad && z >= b.min[2] - rad && z <= b.max[2] + rad) blk.push([b.min[1], b.max[1], inside]);
        if (inside) surf.push(b.max[1]);
      });
      fl.ramps.forEach(function (r) {
        if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) surf.push(Physics.rampHeight(r, x, z));
      });
      fl.cyls.forEach(function (c) {
        var dx = x - c.x, dz = z - c.z, dd = Math.sqrt(dx * dx + dz * dz);
        if (dd <= c.r + rad) blk.push([c.y0, c.y1, dd <= c.r]);
        if (dd <= c.r) surf.push(c.y1);
      });
      fl.water.forEach(function (q) {
        if (x >= q.min[0] && x <= q.max[0] && z >= q.min[2] && z <= q.max[2]) surf.push(q.max[1]);
      });
      var ok = [];
      surf.forEach(function (h) {
        // すぐ よこの はこは、のぼれない たかさ の ときだけ じゃま（のぼれる なら とびのる）
        for (var j = 0; j < blk.length; j++) {
          if (blk[j][0] < h + clear && blk[j][1] > h + 0.05 && (blk[j][2] || blk[j][1] > h + jump)) return;
        }
        if (!ok.some(function (o) { return Math.abs(o - h) < 0.05; })) ok.push(h);
      });
      levels[i * nz + k] = ok;
    }
    var seen = {};
    function key(i, k, l) { return i + ',' + k + ',' + l; }
    function cellOf(p) { return [Math.floor((p[0] - bmin[0]) / cell), Math.floor((p[2] - bmin[2]) / cell)]; }
    function levelAt(i, k, y) {
      var ls = levels[i * nz + k] || [], best = -1, bd = 1e9;
      for (var j = 0; j < ls.length; j++) { var dd = Math.abs(ls[j] - y); if (dd < bd && ls[j] <= y + 0.35) { bd = dd; best = j; } }
      return best;
    }
    var s = cellOf(fl.start), sl = levelAt(s[0], s[1], fl.start[1]);
    var queue = [];
    if (sl >= 0) { queue.push([s[0], s[1], sl]); seen[key(s[0], s[1], sl)] = true; }
    var count = 0;
    while (queue.length) {
      var q = queue.shift(); count++;
      var h1 = levels[q[0] * nz + q[1]][q[2]];
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dv) {
        var a = q[0] + dv[0], b = q[1] + dv[1];
        if (a < 0 || b < 0 || a >= nx || b >= nz) return;
        var ls = levels[a * nz + b];
        for (var j = 0; j < ls.length; j++) {
          if (ls[j] - h1 > jump) continue;
          var kk = key(a, b, j);
          if (!seen[kk]) { seen[kk] = true; queue.push([a, b, j]); }
        }
      });
    }
    return {
      startOk: sl >= 0, count: count,
      has: function (p) {
        if (fl.zeroG) return true;
        var c = cellOf(p);
        // となりの マスも みる（もの の まんなか が はこの はしに ちかい とき）
        for (var di = -1; di <= 1; di++) for (var dk = -1; dk <= 1; dk++) {
          var l = levelAt(c[0] + di, c[1] + dk, p[1]);
          if (l >= 0 && seen[key(c[0] + di, c[1] + dk, l)]) return true;
        }
        return false;
      },
    };
  }

  return { PETS: PETS, PROPS: PROPS, list: list, byId: byId, endless: endless, EVENT_IDS: EVENT_IDS, reach: reach, CEIL: CEIL };
})();
if (typeof module !== 'undefined') module.exports = Floors;
