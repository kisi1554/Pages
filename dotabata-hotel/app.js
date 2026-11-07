// どたばた ペット ホテル — がめんの きりかえ・カメラ・えがく・ほぞん
'use strict';
(function () {
  var KEY = 'dotabata-hotel-v1';
  var COLORS = ['#ff8787', '#4dabf7', '#69db7c', '#ffd43b', '#b197fc', '#ffa94d'];
  var $ = function (id) { return document.getElementById(id); };

  // ---- ほぞん ------------------------------------------------------------
  function defaults() {
    return { stars: {}, best: {}, mess: {}, endlessBest: 0, guests: [], char: 'staff', color: COLORS[0], settings: { bgm: true, se: true, weak: true, left: false, easy: false } };
  }
  function load() {
    var d = defaults();
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && typeof s === 'object') {
        Object.keys(d).forEach(function (k) { if (s[k] != null) d[k] = s[k]; });
        d.settings = Object.assign(defaults().settings, s.settings || {});
      }
    } catch (e) { /* よめなくても あそべる */ }
    return d;
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても あそべる */ } }
  var save = load();

  // ---- WebGL -------------------------------------------------------------
  var canvas = $('cv'), R = null;
  try { R = GL.create(canvas); } catch (e) { R = null; if (window.console) console.warn(e); }

  var screens = ['sTitle', 'sSelect', 'sHow', 'sSet', 'sResult', 'sNoGL'];
  var screen = 'sTitle';
  function show(id) {
    screens.forEach(function (s) { $(s).hidden = s !== id; });
    screen = id;
    $('hud').hidden = !game;
    $('pad').hidden = !game || !!id;
    if (id === 'sSelect') buildSelect();
  }
  if (!R) { show('sNoGL'); }

  // ---- そうさ ------------------------------------------------------------
  var input = Input.create({
    stickZone: $('stickZone'), stickBase: $('stickBase'), stickKnob: $('stickKnob'),
    btnJump: $('bJump'), btnBubble: $('bBubble'), btnDash: $('bDash'), camArea: canvas,
    onPress: function () { Sound.init(); },
  });

  function applySettings() {
    var s = save.settings;
    document.body.classList.toggle('lefty', !!s.left);
    Sound.set('bgm', !!s.bgm); Sound.set('se', !!s.se);
    document.querySelectorAll('.tgl').forEach(function (b) { b.classList.toggle('on', !!s[b.dataset.k]); });
    if (game) { game.opts.weak = !!s.weak; game.opts.easy = !!s.easy; }
  }
  document.querySelectorAll('.tgl').forEach(function (b) {
    b.addEventListener('click', function () {
      Sound.init();
      save.settings[b.dataset.k] = !save.settings[b.dataset.k];
      persist(); applySettings(); Sound.play('click');
      if (b.dataset.k === 'bgm' && save.settings.bgm && game && !paused) Sound.startBgm();
    });
  });
  applySettings();

  document.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { Sound.init(); Sound.play('click'); show(b.dataset.go); });
  });
  $('goSelect').addEventListener('click', function () { Sound.init(); Sound.play('click'); show('sSelect'); });
  $('goHow').addEventListener('click', function () { Sound.init(); Sound.play('click'); show('sHow'); });
  $('goSet').addEventListener('click', function () { Sound.init(); Sound.play('click'); openSettings(false); });
  function openSettings(pause) {
    $('setTitle').textContent = pause ? 'ひとやすみ' : 'せってい';
    $('pauseBtns').hidden = !pause; $('pauseBtns2').hidden = !pause;
    show('sSet');
  }
  $('setBack').addEventListener('click', function () { Sound.play('click'); if (game) resume(); else show('sTitle'); });
  $('resume').addEventListener('click', function () { Sound.play('click'); resume(); });
  $('retry').addEventListener('click', function () { Sound.play('click'); startFloor(curFloor); });
  $('toSelect').addEventListener('click', function () { Sound.play('click'); quit(); show('sSelect'); });
  $('btnPause').addEventListener('click', function () { Sound.init(); pause(); });
  $('resNext').addEventListener('click', function () {
    Sound.play('click');
    var i = Floors.list.findIndex(function (f) { return f.id === curFloor; });
    if (curFloor !== 'mecha' && i >= 0 && i + 1 < Floors.list.length) startFloor(Floors.list[i + 1].id);
    else startFloor('mecha');
  });
  $('resRetry').addEventListener('click', function () { Sound.play('click'); startFloor(curFloor); });
  $('resSelect').addEventListener('click', function () { Sound.play('click'); quit(); show('sSelect'); });

  // ---- えらぶ がめん --------------------------------------------------------
  function unlocked(id) {
    if (id === '1f') return true;
    if (id === 'mecha') return !!save.stars['1f'];
    var i = Floors.list.findIndex(function (f) { return f.id === id; });
    return i > 0 && !!save.stars[Floors.list[i - 1].id];
  }
  function buildSelect() {
    var cr = $('charRow'); cr.innerHTML = '';
    Object.keys(Game.CHARS).forEach(function (k) {
      var c = Game.CHARS[k], ok = k === 'staff' || save.guests.indexOf(k) >= 0;
      var b = document.createElement('button');
      b.className = 'charBtn' + (save.char === k ? ' sel' : '') + (ok ? '' : ' lock');
      b.innerHTML = '<span class="em">' + (ok ? c.emoji : '🔒') + '</span>' + (ok ? c.name : '？？？') + '<span class="sk">' + (ok ? c.skill : 'フロアを クリアすると なかまに なる') + '</span>';
      b.addEventListener('click', function () {
        Sound.init(); Sound.play(ok ? 'click' : 'wrong');
        if (!ok) return;
        save.char = k; persist(); buildSelect();
      });
      cr.appendChild(b);
    });
    var col = $('colorRow'); col.innerHTML = '';
    col.hidden = save.char !== 'staff';
    COLORS.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'sw' + (save.color === c ? ' sel' : '');
      b.style.background = c; b.setAttribute('aria-label', 'いろ');
      b.addEventListener('click', function () { Sound.play('click'); save.color = c; persist(); buildSelect(); });
      col.appendChild(b);
    });
    var fg = $('floorGrid'); fg.innerHTML = '';
    Floors.list.concat([Floors.endless]).forEach(function (f) {
      var ok = unlocked(f.id), b = document.createElement('button');
      b.className = 'floorBtn' + (ok ? '' : ' lock');
      b.dataset.floor = f.id;
      var st = f.id === 'mecha' ? (save.endlessBest ? 'きろく ' + save.endlessBest + 'ひき' : 'つぎつぎ つづく！') : starText(save.stars[f.id] || 0);
      b.innerHTML = '<span class="lv">' + f.label + '</span><span class="em">' + (ok ? f.emoji : '🔒') + '</span><span class="nm">' + f.name + '</span><span class="st">' + st + '</span>';
      b.addEventListener('click', function () {
        Sound.init();
        if (!ok) { Sound.play('wrong'); return; }
        Sound.play('click');
        startFloor(f.id);
      });
      fg.appendChild(b);
    });
  }
  function starText(n) { return '⭐'.repeat(n) + '☆'.repeat(3 - n); }

  // ---- ゲームの はじまり と おわり --------------------------------------------
  var game = null, curFloor = '1f', paused = false, endShown = false;
  var labels = $('labels'), signs = [], says = [], qmarks = [];
  var cam = { yaw: 0, pitch: 0.62, dist: 7.5, cur: 7.5, tp: [0, 1, 0], eye: [0, 5, 8], returning: false, wasHeld: false };

  function startFloor(id) {
    if (!R) return;
    Sound.init();
    idleGame = null;
    curFloor = id;
    var fl = id === 'mecha' ? Floors.list[Math.floor(Math.random() * Floors.list.length)] : Floors.byId(id);
    game = Game.create(fl, {
      char: save.char, color: save.char === 'staff' ? save.color : '#ffffff', easy: save.settings.easy, weak: save.settings.weak,
      endless: id === 'mecha', quality: quality,
    });
    paused = false; endShown = false;
    buildStatic(fl);
    buildLabels(fl);
    var pb = game.player.body;
    cam.yaw = game.player.yaw + Math.PI; cam.pitch = 0.62; cam.tp = [pb.p[0], pb.p[1] + 1, pb.p[2]]; cam.cur = cam.dist;
    $('view').style.background = fl.sky;
    input.reset();
    show(null);
    $('roulette').hidden = true; $('banner').hidden = true; $('evChip').hidden = true;
    Sound.setMode('normal');
    if (save.settings.bgm) Sound.startBgm();
    banner((fl.emoji || '') + ' ' + fl.label + ' ' + fl.name, 1800);
    hudCache = {};
  }
  function quit() {
    game = null; paused = false; idleGame = null;
    Sound.stopBgm();
    labels.innerHTML = ''; signs = []; says = []; qmarks = [];
    $('roulette').hidden = true; $('banner').hidden = true;
  }
  function pause() {
    if (!game || paused || game.state !== 'play') return;
    paused = true; input.reset(); Sound.stopBgm();
    openSettings(true);
  }
  function resume() {
    paused = false; show(null); last = performance.now();
    if (save.settings.bgm) Sound.startBgm();
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });

  // ---- うごかない ものを まとめて おく ---------------------------------------
  var tmpA = new Float32Array(16), tmpB = new Float32Array(16), tmpC = new Float32Array(16), tmpD = new Float32Array(16), tmpE = new Float32Array(16);
  var Q0 = [0, 0, 0, 1];
  function col(hex, mul) {
    var c = Mesh.hex(hex) || [1, 1, 1, 1];
    if (mul) c = [c[0] * mul, c[1] * mul, c[2] * mul, 1];
    return c;
  }
  var walls = [];
  // かべ: カメラが かべの そとがわに いる ときは ひくく して なかを みせる
  function drawWalls() {
    var fl = game.fl, W = fl.w / 2, D = fl.d / 2, e = cam.eye;
    var cut = { n: e[2] < -D + 0.2, s: e[2] > D - 0.2, w: e[0] < -W + 0.2, e: e[0] > W - 0.2 };
    for (var i = 0; i < walls.length; i++) {
      var b = walls[i].b, y1 = b.max[1];
      if (cut[b.side]) {
        if (b.min[1] > 0.5) continue;
        y1 = Math.min(y1, 0.35);
      }
      M4.trsq(tmpA, (b.min[0] + b.max[0]) / 2, (b.min[1] + y1) / 2, (b.min[2] + b.max[2]) / 2, Q0, b.max[0] - b.min[0], y1 - b.min[1], b.max[2] - b.min[2]);
      R.add('box', tmpA, walls[i].c);
    }
  }
  function buildStatic(fl) {
    R.clearStatic();
    var add = R.addStatic;
    walls = [];
    fl.boxes.forEach(function (b) {
      if (!b.vis || !b.c) return;
      if (b.side) { walls.push({ b: b, c: col(b.c) }); return; }
      var sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
      M4.trsq(tmpA, (b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2, Q0, sx, sy, sz);
      add('box', tmpA, col(b.c));
    });
    // ゆかの タイル もよう
    if (fl.id !== '4f') {
      for (var x = -fl.w / 2; x < fl.w / 2; x += 2) for (var z = -fl.d / 2; z < fl.d / 2; z += 2) {
        if (((x + z) / 2 & 1) === 0) continue;
        var inPool = fl.water.some(function (q) { return x + 1 > q.min[0] && x + 1 < q.max[0] && z + 1 > q.min[2] && z + 1 < q.max[2]; });
        if (inPool) continue;
        M4.trsq(tmpA, x + 1, 0.004, z + 1, Q0, 2, 0.008, 2);
        add('box', tmpA, col(fl.floorColor, 0.93));
      }
    }
    fl.ramps.forEach(function (r) {
      var len = r.axis === 'x' ? r.x1 - r.x0 : r.z1 - r.z0, rise = r.h1 - r.h0;
      var ang = Math.atan2(rise, len), L = Math.hypot(len, rise);
      var q = r.axis === 'x' ? [0, 0, Math.sin(ang / 2), Math.cos(ang / 2)] : [-Math.sin(ang / 2), 0, 0, Math.cos(ang / 2)];
      var cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, cy = (r.h0 + r.h1) / 2 - 0.08;
      M4.trsq(tmpA, cx, cy, cz, q, r.axis === 'x' ? L : r.x1 - r.x0, 0.16, r.axis === 'x' ? r.z1 - r.z0 : L);
      add('box', tmpA, col(r.c || '#ffd43b'));
    });
    fl.water.forEach(function (q) {
      M4.trsq(tmpA, (q.min[0] + q.max[0]) / 2, (q.min[1] + q.max[1]) / 2, (q.min[2] + q.max[2]) / 2, Q0, q.max[0] - q.min[0], q.max[1] - q.min[1], q.max[2] - q.min[2]);
      add('box', tmpA, [0.3, 0.65, 0.95], 'water', 0.55);
    });
    fl.cyls.forEach(function (c) {
      if (c.spin) return;
      M4.trsq(tmpA, c.x, (c.y0 + c.y1) / 2, c.z, Q0, c.r, c.y1 - c.y0, c.r);
      add('cyl', tmpA, col(c.c || '#adb5bd'));
    });
    fl.decor.forEach(function (d) {
      var m = Mesh.MODELS[d.model];
      if (!m) return;
      M4.trsy(tmpB, d.p[0], d.p[1], d.p[2], d.rot || 0, d.s || 1, d.s || 1, d.s || 1);
      var tint = d.c ? col(d.c) : [1, 1, 1, 1];
      m.compiled.forEach(function (pt) {
        M4.mul(tmpA, tmpB, pt.m);
        add(pt.mesh, tmpA, pt.tint ? tint : pt.color);
      });
    });
  }

  // ---- モデルを かく ------------------------------------------------------
  function drawModel(name, O, tint, anim, white) {
    var m = Mesh.MODELS[name];
    if (!m) return;
    var parts = m.compiled;
    for (var i = 0; i < parts.length; i++) {
      var pt = parts[i];
      var L = pt.m;
      if (pt.anim && anim) {
        var a = 0, pv = pt.pivot;
        switch (pt.anim) {
          case 'legL': a = Math.sin(anim.walk) * anim.amp; break;
          case 'legR': a = -Math.sin(anim.walk) * anim.amp; break;
          case 'armL': a = -Math.sin(anim.walk) * anim.amp * 0.8 + (anim.arms || 0); break;
          case 'armR': a = Math.sin(anim.walk) * anim.amp * 0.8 + (anim.arms || 0); break;
          case 'ear': a = Math.sin(anim.t * 4) * 0.12; break;
          case 'tail': a = Math.sin(anim.t * 9) * 0.45; break;
        }
        if (a) {
          M4.trans(tmpC, pv[0], pv[1], pv[2]);
          if (pt.anim === 'tail') M4.rotY(tmpD, a); else if (pt.anim === 'ear') M4.rotZ(tmpD, a); else M4.rotX(tmpD, a);
          M4.mul(tmpE, tmpC, tmpD);
          M4.trans(tmpC, -pv[0], -pv[1], -pv[2]);
          M4.mul(tmpD, tmpE, tmpC);
          M4.mul(tmpE, tmpD, L);
          L = tmpE;
        }
      }
      M4.mul(tmpA, O, L);
      var c = pt.tint ? tint : pt.color;
      if (white) c = [c[0] + (1 - c[0]) * white, c[1] + (1 - c[1]) * white, c[2] + (1 - c[2]) * white, 1];
      R.add(pt.mesh, tmpA, c);
    }
  }
  var O = new Float32Array(16);
  function shadow(x, z, y, r) {
    var gy = Physics.groundAt(game.w, x, z, y);
    var h = y - gy;
    if (h > 8 || gy < -40) return;
    var k = Math.max(0, 1 - h / 6);
    M4.trsq(tmpA, x, gy + 0.012, z, Q0, r * (1.1 - 0.3 * (1 - k)), 1, r * (1.1 - 0.3 * (1 - k)));
    R.add('disc', tmpA, [0, 0, 0, 1], 'shadow', 0.32 * k);
  }

  function drawDynamic() {
    var g = game, time = g.t + g.cleanT;
    var q = quality;
    // まわる ゆか
    g.cyls.forEach(function (c, i) {
      if (!c.spin) return;
      var fc = g.fl.cyls[i];
      var qq = [0, Math.sin(-c.angle / 2), 0, Math.cos(-c.angle / 2)];
      M4.trsq(tmpA, c.x, (c.y0 + c.y1) / 2, c.z, qq, c.r, c.y1 - c.y0, c.r);
      R.add('cyl', tmpA, col(fc.c));
      if (c.tag === 'merry') {
        for (var k = 0; k < 4; k++) {
          var a = -c.angle + k * Math.PI / 2, rr = c.r * 0.72;
          M4.trsy(O, c.x + Math.sin(a) * rr, c.y1 + Math.sin(time * 2 + k) * 0.15 - 0.6, c.z + Math.cos(a) * rr, a + Math.PI / 2, 1, 1, 1);
          drawModel('horse', O, col(['#ffffff', '#ffd8a8', '#d0bfff', '#c3fae8'][k]), null);
        }
      } else {
        M4.trsq(tmpA, c.x, c.y1 + 0.25, c.z, qq, c.r * 1.02, 0.5, c.r * 1.02);
        R.add('torus', tmpA, col('#ffffff'));
        M4.trsq(tmpA, c.x + Math.sin(-c.angle) * c.r * 0.9, c.y1 + 0.3, c.z + Math.cos(-c.angle) * c.r * 0.9, qq, 0.08, 0.6, 0.08);
        R.add('cyl', tmpA, col('#ff6b6b'));
      }
    });
    // プレイヤー
    var pl = g.player, b = pl.body, sc = b.r / 0.35;
    var model = Game.CHARS[pl.char].model;
    var lean = pl.dashT > 0 ? 0.5 : 0;
    var qy = [0, Math.sin(pl.yaw / 2), 0, Math.cos(pl.yaw / 2)];
    var qq2 = lean ? M4.qmul(qy, [Math.sin(lean / 2), 0, 0, Math.cos(lean / 2)]) : qy;
    var hs = Math.hypot(b.v[0], b.v[2]);
    var bob = b.ground ? Math.abs(Math.sin(pl.walk)) * 0.05 * Math.min(1, hs / 3) * sc : 0;
    M4.trsq(O, b.p[0], b.p[1] + bob, b.p[2], qq2, sc, sc, sc);
    drawModel(model, O, col(pl.color), { walk: pl.walk, amp: b.ground ? Math.min(0.9, hs / 5) : 0.5, t: time, arms: b.ground ? 0 : -1.2 }, pl.flour * 0.85);
    shadow(b.p[0], b.p[2], b.p[1], b.r * 1.3);
    // ペット
    g.pets.forEach(function (pet) {
      var pb = pet.body, def = pet.def, s = def.r * (pet.state === 'bubble' || pet.state === 'tether' ? Math.min(g.params.petScale, 1.5) : g.params.petScale);
      if (pet.state === 'hidden') return;
      var px = pb.p[0], py = pb.p[1], pz = pb.p[2], yaw = pet.yaw;
      if (pet.state === 'home') {
        s = def.r; py = pet.room.inside[1] + def.r + 0.2 + Math.abs(Math.sin(pet.walk * 2)) * 0.12;
        var ins = pet.room.inside, dr = pet.room.door;
        yaw = Math.atan2(dr[0] - ins[0], dr[2] - ins[2]);
      }
      var squash = 1, wob = 0;
      if (pet.state === 'free' && !pb.ground && !g.fl.zeroG) squash = 1.08;
      if (pet.state === 'bubble' || pet.state === 'tether') { wob = Math.sin(pet.walk * 3) * 0.3; }
      var qp = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
      if (wob) qp = M4.qmul(qp, [0, 0, Math.sin(wob / 2), Math.cos(wob / 2)]);
      if (def.slide && pet.slideT > 0 && pet.state === 'free') qp = M4.qmul(qp, [Math.sin(0.7), 0, 0, Math.cos(0.7)]);
      M4.trsq(O, px, py, pz, qp, s / squash, s * squash, s / squash);
      var walking = pet.state === 'free' ? Math.min(0.8, Math.hypot(pb.v[0], pb.v[2]) / 3) : (pet.state === 'eat' ? 0.3 : 0.5);
      drawModel(pet.type, O, col(def.color), { walk: pet.walk, amp: walking, t: time + pet.t });
      if (pet.mud > 0.01) {
        var ms = s * (0.6 + 0.4 * pet.mud);
        M4.trsq(tmpB, px, py, pz, qp, ms, ms, ms);
        drawModel('mud', tmpB, [1, 1, 1, 1], null);
      }
      if (pet.state === 'bubble' || pet.state === 'tether') {
        var br = pb.r * (1 + Math.sin(pet.walk * 4) * 0.03);
        M4.trsq(tmpA, px, py, pz, Q0, br, br * (1 - Math.sin(pet.walk * 4) * 0.03), br);
        R.add('ball', tmpA, [1, 1, 1], 'bubble', 1);
      }
      if (pet.state !== 'home' && q >= 1) shadow(px, pz, py, Math.max(s, pb.r) * 1.1);
    });
    // ひも
    var hand = [b.p[0] + Math.sin(pl.yaw) * 0.2 * sc, b.p[1] + 0.1 * sc, b.p[2] + Math.cos(pl.yaw) * 0.2 * sc];
    g.tether.forEach(function (pet) {
      var e = [pet.body.p[0], pet.body.p[1] - pet.body.r, pet.body.p[2]];
      var d = [e[0] - hand[0], e[1] - hand[1], e[2] - hand[2]], l = Math.hypot(d[0], d[1], d[2]) || 1;
      // y じくを d に むける
      var ux = d[0] / l, uy = d[1] / l, uz = d[2] / l;
      var ax = -uz, az = ux, al = Math.hypot(ax, az);
      var ang = Math.acos(Math.max(-1, Math.min(1, uy)));
      var qr = al > 1e-6 ? [ax / al * Math.sin(ang / 2), 0, az / al * Math.sin(ang / 2), Math.cos(ang / 2)] : Q0;
      M4.trsq(tmpA, (hand[0] + e[0]) / 2, (hand[1] + e[1]) / 2, (hand[2] + e[2]) / 2, qr, 0.02, l, 0.02);
      R.add('box', tmpA, [1, 1, 1]);
    });
    // もの
    var all = g.props.concat(g.cakes);
    for (var i = 0; i < all.length; i++) {
      var pr = all[i], ob = pr.body;
      M4.trsq(O, ob.p[0], ob.p[1], ob.p[2], pr.q, ob.r, ob.r, ob.r);
      drawModel(pr.type, O, col(pr.color), null);
      if (q >= 2 || (q >= 1 && i % 2 === 0)) shadow(ob.p[0], ob.p[2], ob.p[1], ob.r);
    }
    // あわの たま
    g.shots.forEach(function (s) {
      M4.trsq(tmpA, s.p[0], s.p[1], s.p[2], Q0, s.r, s.r, s.r);
      R.add('ball', tmpA, [1, 1, 1], 'bubble', 1);
    });
    // つぶ
    g.particles.forEach(function (p) {
      var k = p.life / p.max, s = p.s * (p.mode === 'bubble' ? 1 : (0.4 + 0.6 * k));
      M4.trsq(tmpA, p.p[0], p.p[1], p.p[2], Q0, s, s, s);
      if (p.mode === 'bubble') R.add('ball', tmpA, p.c, 'bubble', Math.min(1, k * 2));
      else R.add('sphere', tmpA, p.c, p.mode === 'lit' ? 'lit' : 'unlit');
    });
    // にょこすけ（おなら かぜ）
    if (g.nyoko) {
      var n = g.nyoko, ny = Math.atan2(n.dir[0], n.dir[1]) + Math.PI;
      var sq = 1 + (g.windT > 1.8 ? 0.25 : 0);
      M4.trsy(O, n.p[0], n.p[1], n.p[2], ny, 1.4 * sq, 1.4 / sq, 1.4 * sq);
      drawModel('nyoko', O, [1, 1, 1, 1], { walk: n.t * 6, amp: 0.25, t: n.t });
      shadow(n.p[0], n.p[2], n.p[1] + 0.5, 1.2);
    }
    // ロボット そうじき
    if (g.robot) {
      M4.trsy(O, g.robot.p[0], 0, g.robot.p[2], g.robot.yaw, 1.6, 1.6, 1.6);
      drawModel('robot', O, [1, 1, 1, 1], null);
    }
  }

  // ---- ラベル（ドアの マーク・ふきだし）--------------------------------------
  function buildLabels(fl) {
    labels.innerHTML = ''; signs = []; says = []; qmarks = [];
    fl.rooms.forEach(function (r) {
      var el = document.createElement('div');
      el.className = 'lbl sign';
      el.style.background = r.color;
      el.textContent = Floors.PETS[r.pet].emoji;
      labels.appendChild(el);
      signs.push({ el: el, p: r.sign });
    });
    fl.signs.forEach(function (s) {
      var el = document.createElement('div');
      el.className = 'lbl sign'; el.style.background = '#868e96'; el.textContent = s.text;
      labels.appendChild(el);
      signs.push({ el: el, p: s.p });
    });
    fl.hides.forEach(function (h) {
      var el = document.createElement('div');
      el.className = 'lbl q'; el.textContent = '❓';
      labels.appendChild(el);
      qmarks.push({ el: el, h: h });
    });
  }
  function say(text, o) {
    var el = document.createElement('div');
    el.className = 'lbl say' + (o.big ? ' big' : '') + (o.cls ? ' ' + o.cls : '');
    el.textContent = text;
    labels.appendChild(el);
    says.push({ el: el, body: o.body, pos: o.pos ? o.pos.slice() : null, t: 0, life: o.life || 1.7 });
    if (says.length > 14) { var old = says.shift(); old.el.remove(); }
  }
  var VP = new Float32Array(16), WORLD = new Float32Array(16), VIEW = new Float32Array(16), PROJ = new Float32Array(16);
  var vw = 1, vh = 1;
  function project(p, out) {
    var wp = M4.apply(WORLD, p);
    var c = M4.apply(VP, wp);
    if (c[3] <= 0.1) return false;
    out[0] = (c[0] * 0.5 + 0.5) * vw; out[1] = (0.5 - c[1] * 0.5) * vh;
    return c[0] > -1.3 && c[0] < 1.3 && c[1] > -1.3 && c[1] < 1.3;
  }
  var P2 = [0, 0];
  function place(el, p, dy) {
    if (project(p, P2)) {
      el.style.display = '';
      el.style.transform = 'translate(' + P2[0].toFixed(1) + 'px,' + (P2[1] - (dy || 0)).toFixed(1) + 'px) translate(-50%,-100%)';
    } else el.style.display = 'none';
  }
  function updateLabels(dt) {
    signs.forEach(function (s) { place(s.el, s.p); });
    qmarks.forEach(function (m) {
      if (m.h.occupied) place(m.el, [m.h.front[0], 2.6, m.h.front[2]]); else m.el.style.display = 'none';
    });
    for (var i = says.length - 1; i >= 0; i--) {
      var s = says[i];
      s.t += dt;
      if (s.t > s.life) { s.el.remove(); says.splice(i, 1); continue; }
      var p = s.body ? [s.body.p[0], s.body.p[1] + s.body.r + (s.body.hh || 0) + 0.25, s.body.p[2]] : s.pos;
      place(s.el, p, s.t * 22);
      s.el.style.opacity = s.t > s.life - 0.4 ? String(Math.max(0, (s.life - s.t) / 0.4)) : '1';
    }
  }

  // ---- HUD ・ イベントの えんしゅつ -----------------------------------------
  var hudCache = {};
  function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
  function fmt(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
  function updateHud() {
    var g = game;
    var key;
    if (g.endless) {
      key = 'e' + g.returned + '/' + g.pets.filter(function (p) { return p.state !== 'home'; }).length;
      if (hudCache.pets !== key) { hudCache.pets = key; $('petsLeft').innerHTML = '🏠 ' + g.returned + 'ひき'; }
      setText('timeTx', fmt(g.limit - g.t));
    } else {
      key = g.pets.map(function (p) { return p.state; }).join();
      if (hudCache.pets !== key) {
        hudCache.pets = key;
        $('petsLeft').innerHTML = g.pets.map(function (p) {
          var c = p.state === 'home' ? 'home' : (p.state === 'bubble' || p.state === 'tether') ? 'bub' : '';
          return '<span class="p ' + c + '">' + p.def.emoji + '</span>';
        }).join('');
      }
      setText('timeTx', fmt(g.clearTime != null ? g.clearTime : g.t));
    }
    setText('messTx', String(g.mess));
    var ev = g.ev;
    $('evChip').hidden = ev.phase !== 'active';
    if (ev.phase === 'active') {
      var e = Game.EVENTS[ev.id];
      setText('evIcon', evIcon(ev.id, ev.variant));
      setText('evName', evName(ev.id, ev.variant));
      $('evBar').style.width = (100 * (1 - ev.t / Game.EV_LEN)).toFixed(1) + '%';
    }
  }
  function evIcon(id, v) { return id === 'jikan' ? (v < 1 ? '🐢' : '🐇') : Game.EVENTS[id].icon; }
  function evName(id, v) { return id === 'jikan' ? (v < 1 ? 'スロー' : 'はやおくり') : Game.EVENTS[id].name; }
  var rouletteT = null, bannerT = null;
  function roulette(id) {
    var list = game.endless ? Floors.EVENT_IDS : game.fl.events;
    var el = $('roulette');
    el.hidden = false;
    $('rName').textContent = 'なにが おきるかな？'; $('rTip').textContent = '';
    var i = 0, t0 = performance.now();
    if (rouletteT) clearTimeout(rouletteT);
    var spin = function () {
      if (!game) return;
      var el2 = performance.now() - t0;
      if (el2 < 2200) {
        i++;
        $('rIcon').textContent = Game.EVENTS[list[i % list.length]].icon;
        Sound.play('tick');
        rouletteT = setTimeout(spin, 60 + el2 / 14);
      } else {
        $('rIcon').textContent = Game.EVENTS[id].icon;
        $('rName').textContent = Game.EVENTS[id].name;
        $('rTip').textContent = Game.EVENTS[id].tip;
        Sound.play('star');
      }
    };
    spin();
  }
  function banner(text, ms) {
    var b = $('banner');
    b.hidden = false; b.textContent = text;
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    if (bannerT) clearTimeout(bannerT);
    bannerT = setTimeout(function () { b.hidden = true; }, ms || 1600);
  }
  function bgmMode(id, v) {
    var m = { fuwafuwa: 'fuwa', ice: 'ice', foam: 'fuwa', tilt: 'chaos', trampoline: 'chaos', fart: 'chaos', jumbo: 'chaos', tiny: 'chaos', cake: 'normal' }[id] || 'normal';
    if (id === 'jikan') m = v < 1 ? 'slow' : 'fast';
    Sound.setMode(m);
  }
  function handleFx() {
    var g = game, list = g.fx;
    g.fx = [];
    list.forEach(function (e) {
      switch (e.type) {
        case 'sfx': Sound.play(e.name, e); break;
        case 'say': say(e.text, e); break;
        case 'mess': if (quality >= 1 || Math.random() < 0.5) say('💥', { pos: e.pos, cls: 'mess', life: 0.8 }); break;
        case 'roulette': Sound.play('chime'); roulette(e.id); break;
        case 'eventStart':
          $('roulette').hidden = true;
          banner(evIcon(e.id, e.variant) + ' ' + evName(e.id, e.variant) + '！', 1800);
          Sound.play('eventGo'); bgmMode(e.id, e.variant);
          break;
        case 'eventEnd': Sound.play('eventEnd'); Sound.setMode('normal'); say('もとに もどった', { body: g.player.body }); break;
        case 'home': break;
        case 'wave': banner('🐾 あたらしい ペットが にげだした！', 1600); break;
        case 'cleanup': banner('🎉 ぜんぶ かえった！', 1500); Sound.setMode('normal'); setTimeout(function () { if (game === g) say('🤖 おかたづけ〜', { pos: [0, 1.5, 0], big: true, life: 2.5 }); }, 600); break;
        case 'clear': onClear(e.result); break;
      }
    });
  }
  function onClear(res) {
    if (endShown) return;
    endShown = true;
    Sound.play('clear');
    var id = curFloor;
    if (res.endless) {
      if (res.count > (save.endlessBest || 0)) save.endlessBest = res.count;
    } else {
      save.stars[id] = Math.max(save.stars[id] || 0, res.stars);
      if (!save.best[id] || res.time < save.best[id]) save.best[id] = Math.round(res.time * 10) / 10;
      save.mess[id] = Math.max(save.mess[id] || 0, res.mess);
      if (res.unlock && save.guests.indexOf(res.unlock) < 0) { save.guests.push(res.unlock); res.newGuest = res.unlock; }
    }
    persist();
    setTimeout(function () {
      if (!game) return;
      Sound.stopBgm();
      $('resTitle').textContent = res.endless ? 'おしまい！' : 'フロア クリア！';
      var fl = game.fl;
      if (res.endless) {
        $('resStars').textContent = '🏠 ' + res.count + 'ひき';
        $('resRows').innerHTML = '💥 めちゃくちゃ ポイント: ' + res.mess + '<br>🏆 きろく: ' + save.endlessBest + 'ひき';
      } else {
        $('resStars').innerHTML = [0, 1, 2].map(function (i) { return '<span class="' + (i < res.stars ? '' : 'off') + '">⭐</span>'; }).join('');
        $('resRows').innerHTML =
          '<div class="ok">✅ ぜんぶ かえした</div>' +
          '<div class="' + (res.timeOk ? 'ok' : '') + '">' + (res.timeOk ? '✅' : '⬜') + ' じかん ' + fmt(res.time) + '（めあて ' + fmt(fl.par) + '）</div>' +
          '<div class="' + (res.messOk ? 'ok' : '') + '">' + (res.messOk ? '✅' : '⬜') + ' めちゃくちゃ ' + res.mess + '（めあて ' + fl.mess + '）</div>';
      }
      var u = $('resUnlock');
      if (res.newGuest) {
        var c = Game.CHARS[res.newGuest];
        u.hidden = false; u.textContent = c.emoji + ' ' + c.name + ' が なかまに なった！（' + c.skill + '）';
      } else u.hidden = true;
      var i = Floors.list.findIndex(function (f) { return f.id === id; });
      $('resNext').textContent = res.endless ? '🔁 もういちど' : (i + 1 < Floors.list.length ? '🛗 つぎの フロアへ' : '♾️ めちゃくちゃ モード');
      show('sResult');
      $('hud').hidden = false;
    }, 900);
  }

  // ---- カメラ ------------------------------------------------------------
  function angLerp(a, b, t) {
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }
  function updateCamera(dt, inp) {
    var g = game, pl = g.player, b = pl.body, sc = g.params.playerScale;
    if (inp.camDX || inp.camDY) {
      cam.yaw -= inp.camDX * 0.009;
      cam.pitch = Math.max(0.15, Math.min(1.15, cam.pitch + inp.camDY * 0.005));
      cam.returning = false;
    }
    var manual = inp.camHeld || performance.now() - inp.lastCam < 700;
    if (cam.wasHeld && !manual) cam.returning = true;
    cam.wasHeld = manual;
    if (!manual) {
      var behind = pl.yaw + Math.PI;
      var hs = Math.hypot(b.v[0], b.v[2]);
      var rate = cam.returning ? 3 : (hs > 1 ? 0.9 : 0);
      cam.yaw = angLerp(cam.yaw, behind, Math.min(1, rate * dt));
      cam.pitch += (0.62 - cam.pitch) * Math.min(1, (cam.returning ? 2 : 0.3) * dt);
      var d = behind - cam.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < 0.05) cam.returning = false;
    }
    var portrait = vh > vw;
    var want = (3.2 + 6.0 * sc) * (portrait ? 1.05 : 1);
    var ahead = (portrait ? 1.6 : 0.8) * sc;
    var tgt = [b.p[0] - Math.sin(cam.yaw) * ahead, b.p[1] + 0.35 + 0.5 * sc, b.p[2] - Math.cos(cam.yaw) * ahead];
    var k = Math.min(1, 10 * dt);
    for (var i = 0; i < 3; i++) cam.tp[i] += (tgt[i] - cam.tp[i]) * k;
    var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    var off = [Math.sin(cam.yaw) * cp, sp, Math.cos(cam.yaw) * cp];
    var far = [cam.tp[0] + off[0] * want, cam.tp[1] + off[1] * want, cam.tp[2] + off[2] * want];
    var hit = Physics.raycast(g.w, cam.tp, far, true);
    var allow = hit < 1 ? Math.max(1.2, want * hit - 0.3) : want;
    if (allow < cam.cur) cam.cur = allow; else cam.cur += (allow - cam.cur) * Math.min(1, 2.5 * dt);
    cam.eye = [cam.tp[0] + off[0] * cam.cur, cam.tp[1] + off[1] * cam.cur, cam.tp[2] + off[2] * cam.cur];
    if (!save.settings.weak && g.shake > 0) {
      var s = g.shake * 0.25;
      cam.eye[0] += (Math.random() - 0.5) * s; cam.eye[1] += (Math.random() - 0.5) * s; cam.eye[2] += (Math.random() - 0.5) * s;
    }
  }

  // ---- がめんの おおきさ と せいのう -----------------------------------------
  var quality = 2, fpsLog = [], lastFps = 60, fpsT = 0, frames = 0, lowCount = 0;
  function pixelRatio() {
    var d = window.devicePixelRatio || 1;
    return quality >= 2 ? Math.min(d, 2) : quality === 1 ? Math.min(d, 1.25) : Math.min(d, 1) * 0.75;
  }
  function resize() {
    var v = $('view');
    vw = v.clientWidth || 1; vh = v.clientHeight || 1;
    var pr = pixelRatio();
    var w = Math.max(1, Math.round(vw * pr)), h = Math.max(1, Math.round(vh * pr));
    if (canvas.width !== w || canvas.height !== h) R.resize(w, h);
  }
  function trackFps(dt) {
    frames++; fpsT += dt;
    if (fpsT >= 2) {
      lastFps = frames / fpsT; frames = 0; fpsT = 0;
      fpsLog.push(lastFps); if (fpsLog.length > 30) fpsLog.shift();
      if (game && !paused && lastFps < 40 && quality > 0) {
        lowCount++;
        if (lowCount >= 2) { quality--; lowCount = 0; game.quality = quality; resize(); }
      } else lowCount = 0;
    }
  }

  // ---- まいフレーム ---------------------------------------------------------
  var last = performance.now(), time0 = performance.now();
  var LIGHT = (function () { var l = [0.45, 0.85, 0.35], n = Math.hypot(l[0], l[1], l[2]); return [l[0] / n, l[1] / n, l[2] / n]; })();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    trackFps(dt);
    if (!R) return;
    resize();
    if (!game) { drawIdle(now); return; }
    var inp = input.read();
    if (!paused && !screen) {
      // スティック → せかいの むき（カメラから みて まえ）
      var fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = -fz, rz = fx;
      var move = [fx * inp.my + rx * inp.mx, fz * inp.my + rz * inp.mx];
      var gi = { move: move, jump: inp.jump, jumpPressed: inp.jumpPressed, bubblePressed: inp.bubblePressed, dashPressed: inp.dashPressed };
      var carry = Game.update(game, dt, gi);
      if (carry) input.keep(inp);
      handleFx();
      if (!game) return;
      updateCamera(dt, inp);
    } else if (game.state !== 'play' && !paused) {
      Game.update(game, dt, { move: [0, 0] });
      handleFx();
      if (!game) return;
      updateCamera(dt, { camDX: 0, camDY: 0, camHeld: false, lastCam: 0 });
    }
    render(now);
    updateLabels(dt);
    updateHud();
    $('fade').style.opacity = String(game.player.fade * 0.8);
  }
  function render(now) {
    var g = game, fl = g.fl;
    var aspect = canvas.width / canvas.height;
    var fov = aspect < 1 ? 0.95 + (1 - aspect) * 0.35 : 0.95;
    M4.perspective(PROJ, fov, aspect, 0.1, 120);
    M4.lookAt(VIEW, cam.eye, cam.tp, [0, 1, 0]);
    M4.mul(VP, PROJ, VIEW);
    // かたむき（ぐるぐる へや）: プレイヤーを まんなかに して まわす
    var tx = g.viewTilt[0], tz = g.viewTilt[1], pb = g.player.body;
    if (tx || tz) {
      M4.trans(tmpA, pb.p[0], pb.p[1], pb.p[2]);
      M4.rotX(tmpB, tx); M4.mul(tmpC, tmpA, tmpB);
      M4.rotZ(tmpB, tz); M4.mul(tmpD, tmpC, tmpB);
      M4.trans(tmpA, -pb.p[0], -pb.p[1], -pb.p[2]);
      M4.mul(WORLD, tmpD, tmpA);
    } else WORLD.set(M4.ident());
    drawWalls();
    drawDynamic();
    var sky = col(fl.sky);
    R.draw(VP, WORLD, cam.eye, { sky: sky, light: LIGHT, fogNear: 18, fogFar: 60, time: (now - time0) / 1000 });
  }
  // タイトルの うしろ: ロビーを ゆっくり まわして みせる
  var idleGame = null;
  function drawIdle(now) {
    if (screen === 'sNoGL') return;
    if (!idleGame) {
      idleGame = Game.create(Floors.list[0], { seed: 7, quality: 1 });
      buildStatic(Floors.list[0]);
    }
    var a = now / 9000;
    cam.eye = [Math.sin(a) * 12, 7, Math.cos(a) * 9];
    cam.tp = [0, 0.5, 0];
    var g0 = game;
    game = idleGame;
    Game.update(idleGame, 1 / 60, { move: [0, 0] });
    idleGame.fx = [];
    render(now);
    game = g0;
  }

  requestAnimationFrame(frame);
  window.addEventListener('resize', function () { if (R) resize(); });

  // ---- デバッグ フック（check.js から つかう）------------------------------------
  window.DotabataDebug = {
    state: function () {
      if (!game) return { screen: screen, playing: false, fps: lastFps, quality: quality };
      return {
        screen: screen, playing: true, floor: game.fl.id, state: game.state, returned: game.returned, total: game.total,
        pets: game.pets.map(function (p) { return p.state; }), mess: game.mess, t: game.t,
        event: game.ev.phase + ':' + (game.ev.id || ''), params: game.params, player: game.player.body.p.slice(),
        tether: game.tether.length, shots: game.shotCount || 0, fps: lastFps, quality: quality, drawCalls: R.drawCalls, instances: R.instances,
        viewTilt: game.viewTilt.slice(), cam: cam.eye.slice(),
      };
    },
    start: function (id) { startFloor(id || '1f'); },
    bubbleAll: function () { Game.debug.bubbleAll(game); },
    carryHome: function () { Game.debug.carryHome(game); },
    forceEvent: function (id, v) { Game.forceEvent(game, id, v); },
    fps: function () { return lastFps; },
    unlockAll: function () { Floors.list.forEach(function (f) { save.stars[f.id] = save.stars[f.id] || 1; }); save.guests = Object.keys(Game.UNLOCK).map(function (k) { return Game.UNLOCK[k]; }); persist(); if (screen === 'sSelect') buildSelect(); },
    setQuality: function (q) { quality = q; if (game) game.quality = q; resize(); },
  };
})();
