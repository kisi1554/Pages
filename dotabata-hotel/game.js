// どたばた ペット ホテル — ルール（DOM も WebGL も つかわない。node で テストできる）
//  - プレイヤー: あるく・はしる・ジャンプ・ダッシュ・シャボンだま
//  - ペット: にげる・はねる・すべる・のぼる・かくれる・ケーキを たべる
//  - あわ: あたると ぷかぷか → さわると ひもで ついてくる（3つ まで）→ おなじ マークの へやで「ただいま！」
//  - はちゃめちゃ イベント: 25びょう ごとに ルーレット → 12びょう つづく → もとに もどる
'use strict';
var Game = (function () {
  var STEP = 1 / 60, G = 20;
  var EV_EVERY = 25, EV_LEN = 12, EV_WARN = 3;
  var EVENTS = {
    fuwafuwa:   { icon: '🎈', name: 'ふわふわ じゅうりょく', tip: 'ジャンプが すごく たかい！' },
    trampoline: { icon: '🛝', name: 'ぜんぶ トランポリン', tip: 'ゆかが ぽよんぽよん！' },
    ice:        { icon: '🧊', name: 'つるつる アイス', tip: 'とまれない！' },
    foam:       { icon: '🫧', name: 'あわあわ フロア', tip: 'かるい ものが うくよ' },
    tilt:       { icon: '🔄', name: 'ぐるぐる へや', tip: 'ころころ ころがる！' },
    jumbo:      { icon: '🐘', name: 'ジャンボ ペット', tip: 'ペットが おおきく なった！' },
    tiny:       { icon: '🐜', name: 'ちびっこ スタッフ', tip: 'テーブルの したを くぐれるよ' },
    fart:       { icon: '💨', name: 'おなら かぜ', tip: 'にょこすけが きた！' },
    jikan:      { icon: '🐢', name: 'スロー／はやおくり', tip: '' },
    cake:       { icon: '🍰', name: 'ケーキ の あめ', tip: 'ペットが よってくるよ' },
  };
  var CHARS = {
    staff:     { model: 'staff', emoji: '🧑‍🍳', name: 'みならい スタッフ', skill: 'いろが えらべる' },
    pyonta:    { model: 'pyonta', emoji: '🐰', name: 'ぴょんた', skill: '2だん ジャンプ' },
    tsukubou:  { model: 'tsukubou', emoji: '🦗', name: 'つくぼう', skill: 'あわが 2れんしゃ' },
    nyokosuke: { model: 'nyokosuke', emoji: '🐛', name: 'にょこすけ', skill: 'ジャンプ ながおしで おならで とぶ' },
    naoki:     { model: 'naoki', emoji: '🦁', name: 'ナオキ', skill: 'くうちゅうで ダッシュ → ドスン！' },
  };
  var UNLOCK = { '1f': 'pyonta', '2f': 'tsukubou', '3f': 'nyokosuke', '4f': 'naoki' };
  var MAX_BODIES = 80, MAX_TETHER = 3;

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function angLerp(a, b, t) {
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }
  function inBox(z, p) { return p[0] >= z.min[0] && p[0] <= z.max[0] && p[1] >= z.min[1] && p[1] <= z.max[1] && p[2] >= z.min[2] && p[2] <= z.max[2]; }
  function dist3(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
  function distXZ(a, b) { return Math.hypot(a[0] - b[0], a[2] - b[2]); }
  function qnorm(q) { var l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; q[0] /= l; q[1] /= l; q[2] /= l; q[3] /= l; return q; }
  function qint(q, w, dt) {
    var x = q[0], y = q[1], z = q[2], s = q[3], h = 0.5 * dt;
    q[0] += h * (w[0] * s + w[1] * z - w[2] * y);
    q[1] += h * (w[1] * s + w[2] * x - w[0] * z);
    q[2] += h * (w[2] * s + w[0] * y - w[1] * x);
    q[3] += h * (-w[0] * x - w[1] * y - w[2] * z);
    return qnorm(q);
  }
  function qYaw(q) {
    var fx = 2 * (q[0] * q[2] + q[3] * q[1]), fz = 1 - 2 * (q[0] * q[0] + q[1] * q[1]);
    return Math.atan2(fx, fz);
  }

  // ---- つくる -----------------------------------------------------------
  function create(fl, opts) {
    opts = opts || {};
    var w = Physics.createWorld();
    fl.boxes.forEach(function (b) { if (b.col) Physics.addBox(w, b.min, b.max, { mu: b.mu, e: b.e, tag: b.tag, occ: b.occ && b.vis && !b.side }); });
    fl.ramps.forEach(function (r) { Physics.addRamp(w, r); });
    var cyls = fl.cyls.map(function (c) { return Physics.addCyl(w, c); });
    fl.water.forEach(function (q) { Physics.addWater(w, q.min, q.max); });
    var g = {
      fl: fl, w: w, opts: opts, cyls: cyls, rnd: rng(opts.seed != null ? opts.seed : (Date.now() & 0xffffff)),
      t: 0, acc: 0, state: 'play', mess: 0, returned: 0, total: 0, endless: !!opts.endless, limit: opts.endless ? Floors.endless.time : 0, wave: 1,
      pets: [], props: [], cakes: [], shots: [], particles: [], fx: [], tether: [],
      ev: { phase: 'none', id: null, t: 0, clock: 0, next: EV_EVERY, variant: 1, axis: 'x', sign: 1, last: null, count: 0 },
      base: { grav: fl.gravity, mu: 1, tramp: 0, timeScale: 1, petScale: 1, playerScale: 1, tiltX: 0, tiltZ: 0, foam: 0, windX: 0, windZ: 0 },
      params: null, windT: 0, windDir: [1, 0], nyoko: null, robot: null, cleanT: 0, result: null, shake: 0, viewTilt: [0, 0],
      sfxT: {}, elevT: 0, cakeT: 0, quality: opts.quality != null ? opts.quality : 2,
    };
    g.params = params(g);
    g.player = makePlayer(g);
    fl.props.forEach(function (p) { addProp(g, p.type, p.p); });
    fl.pets.forEach(function (p) { addPet(g, p.type, p.p); });
    g.total = g.pets.length;
    fl.hides.forEach(function (h) { h.occupied = null; });
    w.onImpact = function (b, other, speed, n) { onImpact(g, b, other, speed, n); };
    applyParams(g);
    return g;
  }

  function makePlayer(g) {
    var st = g.fl.start;
    var b = Physics.addBody(g.w, { p: [st[0], st[1] + 0.71, st[2]], r: 0.35, hh: 0.35, m: 3, e: 0, mu: 0, buoy: 1.4, windK: 0.5, kind: 'player', group: 1 });
    var p = {
      body: b, yaw: Math.PI, scale: 1, jumpHold: 0, coyote: 0, airJumps: 0, dashT: 0, dashCd: 0, dashDir: [0, -1],
      shootCd: 0, extraShot: 0, pound: false, fuel: 1, flour: 0, walk: 0, fartT: 0,
      char: g.opts.char && CHARS[g.opts.char] ? g.opts.char : 'staff', color: g.opts.color || '#ff8787', spawn: b.p.slice(), fade: 0,
    };
    b.ref = p;
    return p;
  }

  function addProp(g, type, pos, extra) {
    var d = Floors.PROPS[type];
    var b = Physics.addBody(g.w, {
      p: [pos[0], pos[1] + d.r + 0.01, pos[2]], r: d.r, m: d.m, e: d.e, mu: d.mu, gs: d.gs != null ? d.gs : 1, damp: d.damp || 0.05,
      buoy: d.buoy || 1.2, windK: clamp(1.2 / d.m, 0.4, 3), liftK: d.lift ? 1 : 0, kind: 'prop',
    });
    var colors = d.colors;
    var pr = {
      type: type, def: d, body: b, spawn: b.p.slice(), q: [0, 0, 0, 1], w: [0, 0, 0], prevSp: 0, cd: 0,
      color: colors[(g.props.length + g.cakes.length) % colors.length], life: 0, rain: !!(extra && extra.rain),
    };
    var yaw = g.rnd() * Math.PI * 2;
    if (type === 'chair' || type === 'plant') pr.q = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
    b.ref = pr;
    if (pr.rain) g.cakes.push(pr); else g.props.push(pr);
    return pr;
  }

  function addPet(g, type, pos) {
    var def = Floors.PETS[type];
    var b = Physics.addBody(g.w, { p: [pos[0], pos[1] + def.r + 0.02, pos[2]], r: def.r, m: 1, e: 0.25, mu: 0.6, kind: 'pet', liftK: 0.5, windK: 1 });
    var pet = {
      type: type, def: def, body: b, state: 'free', yaw: g.rnd() * Math.PI * 2, walk: 0, t: g.rnd() * 10,
      hopCd: g.rnd(), thinkT: 0, wander: [0, 0], sayT: 0, slideT: 0, slideCd: 1 + g.rnd() * 2, perchCd: 0, hideCd: 2, hide: null,
      hiddenT: 0, bubbleT: 0, eatT: 0, cake: null, mud: def.mud ? 1 : 0, wrongT: 0, stuckT: 0, room: null, spawn: b.p.slice(), happy: 0,
    };
    b.ref = pet;
    g.pets.push(pet);
    setPetMode(g, pet, 'free');
    return pet;
  }

  function setPetMode(g, pet, mode) {
    var b = pet.body;
    pet.state = mode;
    b.active = true; b.solid = true; b.group = 0;
    if (mode === 'free' || mode === 'eat') {
      b.gs = 1; b.damp = g.fl.zeroG ? 0.8 : 0.05; b.e = 0.25; b.mu = 0.6; b.liftK = 0.5; b.m = 1;
    } else if (mode === 'bubble' || mode === 'tether') {
      b.gs = 0; b.damp = 1.0; b.e = 0.65; b.mu = 0.05; b.liftK = 0; b.m = 0.6;
      if (mode === 'tether') b.group = 1;
    } else {
      b.active = false; b.solid = false; b.v = [0, 0, 0];
    }
  }

  // ---- はちゃめちゃ イベント -------------------------------------------------
  function params(g) {
    var b = g.base, ev = g.ev;
    var p = {};
    for (var k in b) p[k] = b[k];
    if (ev.phase === 'active') {
      var k2 = Math.min(1, ev.t / 1.0, (EV_LEN - ev.t) / 1.0);
      k2 = clamp(k2, 0, 1);
      switch (ev.id) {
        case 'fuwafuwa': p.grav = b.grav * lerp(1, 0.25, k2); break;
        case 'trampoline': p.tramp = k2 > 0.3 ? 6.5 : 0; break;
        case 'ice': p.mu = lerp(1, 0.03, k2); break;
        case 'foam': p.foam = k2; break;
        case 'tilt': {
          var ang = (15 * Math.PI / 180) * Math.sin(Math.PI * clamp(ev.t / EV_LEN, 0, 1)) * ev.sign * (g.opts.weak ? 0.5 : 1);
          if (ev.axis === 'x') p.tiltX = ang; else p.tiltZ = ang;
          break;
        }
        case 'jumbo': p.petScale = lerp(1, 3, k2); break;
        case 'tiny': p.playerScale = lerp(1, 1 / 3, k2); break;
        case 'jikan': p.timeScale = lerp(1, ev.variant, k2); break;
        default: break;
      }
    }
    if (g.windT > 0) {
      var s = 24 * Math.min(1, g.windT / 1.2);
      p.windX = g.windDir[0] * s; p.windZ = g.windDir[1] * s;
    }
    return p;
  }
  function applyParams(g) {
    var p = g.params = params(g), w = g.w;
    var gm = G * p.grav;
    w.gravity = [-gm * Math.sin(p.tiltZ), -gm * Math.cos(p.tiltZ) * Math.cos(p.tiltX), gm * Math.sin(p.tiltX) * Math.cos(p.tiltZ)];
    w.frictionMul = p.mu;
    w.trampoline = p.tramp;
    w.wind = [p.windX, 0, p.windZ];
    w.lift = p.foam;
    var tilt = g.opts.weak ? [0, 0] : [p.tiltX * 0.7, p.tiltZ * 0.7];
    g.viewTilt = tilt;
    for (var i = 0; i < w.bodies.length; i++) {
      var b = w.bodies[i];
      if (b.kind !== 'player') b.ts = p.timeScale;
    }
    g.pets.forEach(function (pet) {
      var inB = pet.state === 'bubble' || pet.state === 'tether';
      var want = pet.def.r * (inB ? Math.min(p.petScale, 1.5) * 1.55 : p.petScale);
      if (pet.body.r !== want) {
        if (pet.state === 'free' && want > pet.body.r && pet.body.ground) pet.body.p[1] += want - pet.body.r;
        pet.body.r = want;
      }
    });
    var pb = g.player.body, want = 0.35 * p.playerScale;
    if (pb.r !== want) {
      var grow = (want - pb.r) * 2;
      pb.r = want; pb.hh = want;
      if (grow > 0) pb.p[1] += grow;
      g.player.scale = p.playerScale;
    }
  }
  function pickEvent(g) {
    var list = g.endless ? Floors.EVENT_IDS.filter(function (id) { return !(g.fl.zeroG && (id === 'fuwafuwa' || id === 'tilt' || id === 'trampoline')); }) : g.fl.events;
    var c = list.filter(function (id) { return id !== g.ev.last; });
    if (!c.length) c = list;
    return c[Math.floor(g.rnd() * c.length) % c.length];
  }
  function startEvent(g, id, variant) {
    var ev = g.ev;
    ev.phase = 'active'; ev.id = id; ev.t = 0; ev.last = id; ev.count++;
    ev.variant = variant || (id === 'jikan' ? (g.rnd() < 0.5 ? 0.5 : 1.6) : 1);
    ev.axis = g.rnd() < 0.5 ? 'x' : 'z'; ev.sign = g.rnd() < 0.5 ? -1 : 1;
    if (id === 'fart') {
      var W = g.fl.w / 2 - 1.6, D = g.fl.d / 2 - 1.6;
      var side = Math.floor(g.rnd() * 4);
      var pos = side === 0 ? [-W, 0, (g.rnd() - 0.5) * D] : side === 1 ? [W, 0, (g.rnd() - 0.5) * D] : side === 2 ? [(g.rnd() - 0.5) * W, 0, -D] : [(g.rnd() - 0.5) * W, 0, D];
      if (g.fl.zeroG) pos[1] = 1.5;
      var dx = -pos[0], dz = -pos[2], l = Math.hypot(dx, dz) || 1;
      g.nyoko = { p: pos, dir: [dx / l, dz / l], t: 0, farts: 0, puff: 0 };
    }
    g.cakeT = 0;
    g.fx.push({ type: 'eventStart', id: id, variant: ev.variant });
  }
  function endEvent(g) {
    var ev = g.ev;
    g.fx.push({ type: 'eventEnd', id: ev.id });
    ev.phase = 'none'; ev.id = null; ev.t = 0;
    g.nyoko = null; g.windT = 0;
  }
  function forceEvent(g, id, variant) {
    if (g.ev.phase === 'active') endEvent(g);
    startEvent(g, id, variant);
    g.ev.next = g.ev.clock + EV_EVERY;
  }
  function updateEvents(g, dt) {
    var ev = g.ev;
    ev.clock += dt;
    if (ev.phase === 'none' && ev.clock >= ev.next - EV_WARN) {
      ev.phase = 'roulette'; ev.pending = pickEvent(g); ev.t = 0;
      g.fx.push({ type: 'roulette', id: ev.pending });
    }
    if (ev.phase === 'roulette') {
      ev.t += dt;
      if (ev.clock >= ev.next) startEvent(g, ev.pending);
    } else if (ev.phase === 'active') {
      ev.t += dt;
      tickEvent(g, dt);
      if (ev.t >= EV_LEN) { endEvent(g); ev.next += EV_EVERY; if (ev.next < ev.clock + EV_WARN) ev.next = ev.clock + EV_EVERY; }
    }
  }
  function tickEvent(g, dt) {
    var ev = g.ev, fl = g.fl;
    if (ev.id === 'cake' && ev.t < EV_LEN - 1) {
      g.cakeT -= dt;
      if (g.cakeT <= 0) {
        g.cakeT = 0.4;
        if (g.w.bodies.length < MAX_BODIES) {
          var x = (g.rnd() - 0.5) * (fl.w - 3), z = (g.rnd() - 0.5) * (fl.d - 3);
          var c = addProp(g, 'cake', [x, 5.2, z], { rain: true });
          c.body.v = [0, -2, 0];
          c.color = ['#ffc9de', '#fff3bf', '#d0bfff', '#c3fae8'][Math.floor(g.rnd() * 4)];
        }
      }
    }
    if (ev.id === 'fart' && g.nyoko) {
      var n = g.nyoko;
      n.t += dt;
      var times = [2.0, 6.0, 9.6];
      if (n.farts < times.length && n.t >= times[n.farts]) {
        n.farts++;
        g.windT = 2.4; g.windDir = n.dir.slice();
        g.shake = Math.max(g.shake, 0.5);
        g.fx.push({ type: 'sfx', name: 'fartBig' });
        g.fx.push({ type: 'say', text: 'ぷぅ〜〜〜っ！', pos: [n.p[0], 2.0, n.p[2]], big: true });
        for (var i = 0; i < 14 * qk(g); i++) {
          spark(g, [n.p[0] - n.dir[0] * 0.8, 0.5 + g.rnd() * 0.6, n.p[2] - n.dir[1] * 0.8],
            [n.dir[0] * (4 + g.rnd() * 6) + (g.rnd() - 0.5) * 2, g.rnd() * 2, n.dir[1] * (4 + g.rnd() * 6) + (g.rnd() - 0.5) * 2],
            [0.75 + g.rnd() * 0.15, 0.85, 0.5], 0.35 + g.rnd() * 0.3, 1.6, 0, 'lit');
        }
      }
    }
    if (ev.id === 'foam') {
      var k = g.params.foam;
      if (g.rnd() < 0.7 * qk(g)) {
        spark(g, [(g.rnd() - 0.5) * fl.w, 0.1, (g.rnd() - 0.5) * fl.d], [0, 0.8 + g.rnd(), 0], [0.9, 0.95, 1], 0.15 + g.rnd() * 0.25, 3, 0, 'bubble');
      }
      g.pets.forEach(function (pet) {
        if (pet.state === 'free' && pet.mud < 0.01 && g.rnd() < 0.1 * k * dt) {
          bubblePet(g, pet);
          g.fx.push({ type: 'say', text: 'ふわっ', body: pet.body });
        }
      });
    }
  }
  function qk(g) { return g.quality >= 2 ? 1 : g.quality === 1 ? 0.5 : 0.25; }

  // ---- つぶ（えんしゅつ）-----------------------------------------------------
  function spark(g, p, v, c, s, life, grav, mode) {
    var cap = 260 * qk(g);
    if (g.particles.length >= cap) g.particles.shift();
    g.particles.push({ p: p.slice(), v: v.slice(), c: c, s: s, life: life, max: life, g: grav || 0, mode: mode || 'unlit' });
  }
  function confetti(g, p, n) {
    var cols = [[1, 0.42, 0.42], [1, 0.83, 0.23], [0.3, 0.67, 0.97], [0.41, 0.86, 0.49], [0.85, 0.47, 0.95]];
    for (var i = 0; i < n * qk(g); i++) {
      spark(g, p, [(g.rnd() - 0.5) * 6, 3 + g.rnd() * 4, (g.rnd() - 0.5) * 6], cols[i % cols.length], 0.07 + g.rnd() * 0.05, 1.4, -9, 'unlit');
    }
  }
  function popBurst(g, p, r) {
    for (var i = 0; i < 10 * qk(g); i++) {
      var a = g.rnd() * Math.PI * 2, b = (g.rnd() - 0.5) * Math.PI;
      spark(g, p, [Math.cos(a) * Math.cos(b) * 3, Math.sin(b) * 3, Math.sin(a) * Math.cos(b) * 3], [0.85, 0.95, 1], 0.05 + r * 0.12, 0.45, 0, 'unlit');
    }
  }

  // ---- ぶつかった とき -----------------------------------------------------
  function onImpact(g, b, other, speed, n) {
    var ref = b.ref;
    if (!ref) return;
    if (b.kind === 'player') {
      var pl = ref;
      if (other && pl.dashT > 0 && other.kind !== 'player') {
        var pr = other.ref;
        if (pr && pr.state && pr.state === 'tether') return;
        knock(g, other, pl.dashDir, 8);
        if (other.kind === 'pet' && pr.state === 'free') petSay(g, pr, 'きゃー♪', true);
      }
      return;
    }
    if (b.kind === 'pet' && (ref.state === 'bubble' || ref.state === 'tether') && !other) {
      var lim = g.opts.easy ? 99 : (ref.def.pop || 7.5);
      if (speed > lim) popBubble(g, ref, n);
      return;
    }
    if (b.kind === 'prop' && speed > 3 && !other) {
      sfx(g, 'crash', { w: b.m, s: speed }, 0.08);
    }
  }
  function knock(g, b, dir, power) {
    var k = power / Math.sqrt(Math.max(0.3, b.m));
    b.v[0] = dir[0] * k + (g.rnd() - 0.5) * 2;
    b.v[2] = dir[1] * k + (g.rnd() - 0.5) * 2;
    b.v[1] = 4 + g.rnd() * 2;
    if (b.ref && b.ref.w) { b.ref.w[0] += (g.rnd() - 0.5) * 16; b.ref.w[2] += (g.rnd() - 0.5) * 16; }
    sfx(g, 'crash', { w: b.m, s: 8 }, 0.05);
  }
  function sfx(g, name, data, gap) {
    var now = g.t + g.cleanT;
    if (gap && g.sfxT[name] != null && now - g.sfxT[name] < gap) return;
    g.sfxT[name] = now;
    var e = { type: 'sfx', name: name };
    if (data) for (var k in data) e[k] = data[k];
    g.fx.push(e);
  }
  function petSay(g, pet, text, voice) {
    if (pet.sayT > 0) return;
    pet.sayT = 1.6;
    g.fx.push({ type: 'say', text: text, body: pet.body });
    if (voice) sfx(g, 'voice', { pet: pet.type }, 0.25);
  }

  // ---- あわ -------------------------------------------------------------
  function shoot(g, spread) {
    var pl = g.player, b = pl.body, sc = g.params.playerScale;
    var yaw = pl.yaw + (spread || 0);
    var fwd = [Math.sin(yaw), 0, Math.cos(yaw)];
    var o = [b.p[0] + fwd[0] * (b.r + 0.3), b.p[1] + 0.15 * sc, b.p[2] + fwd[2] * (b.r + 0.3)];
    var best = null, bestS = 1e9, cosLim = Math.cos((g.opts.easy ? 55 : 38) * Math.PI / 180);
    g.pets.forEach(function (pet) {
      if (pet.state !== 'free' && pet.state !== 'eat') return;
      var d = [pet.body.p[0] - o[0], pet.body.p[1] - o[1], pet.body.p[2] - o[2]];
      var dl = Math.hypot(d[0], d[1], d[2]), hl = Math.hypot(d[0], d[2]) || 1e-6;
      if (dl > 11) return;
      var c = (d[0] * fwd[0] + d[2] * fwd[2]) / hl;
      if (c < cosLim && dl > 1.2) return;
      var s = dl * (2 - c);
      if (s < bestS) { bestS = s; best = pet; }
    });
    var dir = fwd.slice();
    if (best) {
      var d2 = [best.body.p[0] - o[0], best.body.p[1] - o[1], best.body.p[2] - o[2]], l2 = Math.hypot(d2[0], d2[1], d2[2]) || 1;
      dir = [fwd[0] * 0.35 + d2[0] / l2 * 0.65, d2[1] / l2 * 0.8, fwd[2] * 0.35 + d2[2] / l2 * 0.65];
      var l3 = Math.hypot(dir[0], dir[1], dir[2]); dir = [dir[0] / l3, dir[1] / l3, dir[2] / l3];
    }
    var sp = 10;
    g.shots.push({ p: o, v: [dir[0] * sp + b.v[0] * 0.3, dir[1] * sp, dir[2] * sp + b.v[2] * 0.3], life: 1.3, r: 0.26 * Math.max(0.6, sc), target: best });
    g.shotCount = (g.shotCount || 0) + 1;
    sfx(g, 'bubble');
  }
  function updateShots(g, dt) {
    for (var i = g.shots.length - 1; i >= 0; i--) {
      var s = g.shots[i], dead = false;
      s.life -= dt;
      if (s.target && (s.target.state === 'free' || s.target.state === 'eat')) {
        var tp = s.target.body.p, d = [tp[0] - s.p[0], tp[1] - s.p[1], tp[2] - s.p[2]], l = Math.hypot(d[0], d[1], d[2]) || 1;
        var sp = Math.hypot(s.v[0], s.v[1], s.v[2]);
        var k = Math.min(1, 3.5 * dt);
        s.v[0] += (d[0] / l * sp - s.v[0]) * k; s.v[1] += (d[1] / l * sp - s.v[1]) * k; s.v[2] += (d[2] / l * sp - s.v[2]) * k;
      }
      s.v[1] += 0.8 * dt;
      for (var k2 = 0; k2 < 3 && !dead; k2++) {
        s.p[0] += s.v[0] * dt / 3; s.p[1] += s.v[1] * dt / 3; s.p[2] += s.v[2] * dt / 3;
        if (Physics.overlapStatic(g.w, s.p, s.r * 0.7)) { dead = true; break; }
        for (var j = 0; j < g.pets.length; j++) {
          var pet = g.pets[j];
          if (pet.state !== 'free' && pet.state !== 'eat') continue;
          if (dist3(pet.body.p, s.p) < pet.body.r + s.r) { hitPet(g, pet, s); dead = true; break; }
        }
        if (dead) break;
        var all = g.props.concat(g.cakes);
        for (j = 0; j < all.length; j++) {
          var pb = all[j].body;
          if (dist3(pb.p, s.p) < pb.r + s.r) {
            pb.v[0] += s.v[0] * 0.35 / pb.m; pb.v[1] += 2; pb.v[2] += s.v[2] * 0.35 / pb.m;
            dead = true; break;
          }
        }
      }
      if (s.life <= 0) dead = true;
      if (dead) { popBurst(g, s.p, s.r); sfx(g, 'popSmall', null, 0.05); g.shots.splice(i, 1); }
    }
  }
  function hitPet(g, pet, shot) {
    if (pet.mud > 0.01) {
      pet.mud = Math.max(0, pet.mud - 0.34);
      if (pet.mud < 0.01) { pet.mud = 0; petSay(g, pet, 'ぴかぴか！'); pet.sayT = 0; }
      else { pet.sayT = 0; petSay(g, pet, 'つるっ！ どろんこ'); }
      sfx(g, 'slip');
      pet.body.v[0] += shot.v[0] * 0.3; pet.body.v[1] += 3; pet.body.v[2] += shot.v[2] * 0.3;
      return;
    }
    bubblePet(g, pet);
    pet.sayT = 0;
    petSay(g, pet, 'きゃー♪', true);
  }
  function bubblePet(g, pet) {
    if (pet.cake) { pet.cake.eatenBy = null; pet.cake = null; }
    setPetMode(g, pet, 'bubble');
    pet.bubbleT = 0;
    pet.body.v[1] = Math.max(pet.body.v[1], 1.5);
    pet.body.r = pet.def.r * Math.min(g.params.petScale, 1.5) * 1.55;
    sfx(g, 'capture');
  }
  function popBubble(g, pet, n) {
    var i = g.tether.indexOf(pet);
    if (i >= 0) g.tether.splice(i, 1);
    setPetMode(g, pet, 'free');
    pet.body.r = pet.def.r * g.params.petScale;
    pet.body.v = [n ? n[0] * 3 : 0, 4.5, n ? n[2] * 3 : 0];
    pet.thinkT = 0; pet.excite = 3;
    popBurst(g, pet.body.p, 0.6);
    sfx(g, 'pop');
    pet.sayT = 0;
    petSay(g, pet, 'ぱちん！ きゃー♪', true);
    g.shake = Math.max(g.shake, 0.15);
  }
  function goHome(g, pet, room) {
    var i = g.tether.indexOf(pet);
    if (i >= 0) g.tether.splice(i, 1);
    setPetMode(g, pet, 'home');
    pet.room = room;
    var same = g.pets.filter(function (p) { return p.state === 'home' && p.room === room; }).length - 1;
    pet.body.p = [room.inside[0] + (same - 0.5) * 0.7, room.inside[1] + pet.def.r + 0.3, room.inside[2]];
    pet.body.r = pet.def.r;
    g.returned++;
    confetti(g, [room.door[0], 1.5, room.door[2]], 30);
    g.fx.push({ type: 'home', pet: pet.type, room: room });
    g.fx.push({ type: 'say', text: 'ただいま！', pos: room.sign, big: true });
    sfx(g, 'fanfare');
    var left = g.pets.filter(function (p) { return p.state !== 'home'; }).length;
    if (left === 0) {
      if (g.endless) nextWave(g);
      else startCleanup(g);
    }
  }
  function nextWave(g) {
    g.wave++;
    var types = g.fl.rooms.map(function (r) { return r.pet; });
    var spots = g.fl.pets.map(function (p) { return p.p; });
    var n = Math.min(4, 2 + Math.floor(g.wave / 2));
    for (var i = 0; i < n; i++) {
      var sp = spots[Math.floor(g.rnd() * spots.length)];
      var pet = addPet(g, types[Math.floor(g.rnd() * types.length)], [sp[0] + (g.rnd() - 0.5) * 2, sp[1], sp[2] + (g.rnd() - 0.5) * 2]);
      pet.body.v[1] = 3;
    }
    g.total += n;
    g.fx.push({ type: 'wave', wave: g.wave });
  }

  // ---- プレイヤー -----------------------------------------------------------
  function updatePlayer(g, dt, inp) {
    var pl = g.player, b = pl.body, fl = g.fl, prm = g.params;
    var sc = prm.playerScale, tiny = sc < 0.8;
    var mx = inp.move ? inp.move[0] : 0, mz = inp.move ? inp.move[1] : 0;
    var mag = Math.min(1, Math.hypot(mx, mz));
    if (mag > 1e-3) { var ml = Math.hypot(mx, mz); mx = mx / ml * mag; mz = mz / ml * mag; }
    var ground = b.ground, zeroG = fl.zeroG;
    if (pl.dashT > 0) {
      pl.dashT -= dt;
    } else if (zeroG && !ground) {
      var k0 = Math.min(1, 2.5 * dt);
      b.v[0] += (mx * 4.5 - b.v[0]) * k0; b.v[2] += (mz * 4.5 - b.v[2]) * k0;
      b.v[1] *= (1 - 0.3 * dt);
    } else {
      var maxSp = (b.inWater ? 3.4 : 6.2) * (tiny ? 0.6 : 1);
      var ice = prm.mu < 0.5;
      var acc = (ground || b.inWater) ? (ice ? 1.4 : 16) : 5;
      var k1 = Math.min(1, acc * dt);
      b.v[0] += (mx * maxSp - b.v[0]) * k1;
      b.v[2] += (mz * maxSp - b.v[2]) * k1;
    }
    if (mag > 0.15 && pl.dashT <= 0) pl.yaw = angLerp(pl.yaw, Math.atan2(mx, mz), Math.min(1, 14 * dt));
    if (ground) {
      pl.coyote = 0.12; pl.airJumps = pl.char === 'pyonta' ? 1 : 0; pl.fuel = 1;
      if (pl.pound) {
        pl.pound = false;
        dosun(g);
      }
    } else pl.coyote -= dt;
    // ジャンプ
    if (inp.jumpPressed) {
      if (zeroG) {
        if (ground || b.wall) {
          var n = ground ? b.gn : b.wn;
          b.v[0] += n[0] * 5 + mx * 2; b.v[1] = Math.max(b.v[1], 0) + n[1] * 5 + 3; b.v[2] += n[2] * 5 + mz * 2;
        } else b.v[1] = Math.max(b.v[1] + 2.2, 2.2);
        sfx(g, 'jump');
      } else if (ground || pl.coyote > 0 || b.inWater) {
        b.v[1] = 7.4 * (tiny ? 0.75 : 1);
        pl.coyote = 0; pl.jumpHold = 0.28;
        sfx(g, 'jump');
      } else if (pl.airJumps > 0) {
        pl.airJumps--; b.v[1] = 7.0; pl.jumpHold = 0.2;
        sfx(g, 'jump2');
        for (var i = 0; i < 6 * qk(g); i++) spark(g, [b.p[0], b.p[1] - 0.6, b.p[2]], [(g.rnd() - 0.5) * 3, -1, (g.rnd() - 0.5) * 3], [1, 0.9, 0.95], 0.1, 0.5, 0);
      }
    }
    if (inp.jump && pl.jumpHold > 0 && b.v[1] > 0) { b.gs = 0.5; pl.jumpHold -= dt; } else { b.gs = 1; if (!inp.jump) pl.jumpHold = 0; }
    // にょこすけ: ながおしで おなら ジェット
    if (pl.char === 'nyokosuke' && inp.jump && !ground && pl.jumpHold <= 0 && pl.fuel > 0 && !zeroG) {
      b.v[1] = Math.min(4.5, b.v[1] + 34 * dt);
      pl.fuel -= dt / 1.8;
      pl.fartT -= dt;
      if (pl.fartT <= 0) {
        pl.fartT = 0.12;
        spark(g, [b.p[0] - Math.sin(pl.yaw) * 0.3, b.p[1] - 0.6, b.p[2] - Math.cos(pl.yaw) * 0.3], [(g.rnd() - 0.5), -3, (g.rnd() - 0.5)], [0.78, 0.86, 0.5], 0.2, 0.8, 0, 'lit');
        sfx(g, 'fart', null, 0.35);
      }
    }
    // ダッシュ
    pl.dashCd -= dt;
    if (inp.dashPressed && pl.dashCd <= 0) {
      if (pl.char === 'naoki' && !ground && !zeroG && !b.inWater) {
        pl.pound = true; b.v = [0, -16, 0]; pl.dashCd = 0.5;
        sfx(g, 'whoosh');
      } else {
        var dx = mag > 0.15 ? mx / mag : Math.sin(pl.yaw), dz = mag > 0.15 ? mz / mag : Math.cos(pl.yaw);
        pl.dashDir = [dx, dz]; pl.dashT = 0.35; pl.dashCd = 0.75;
        pl.yaw = Math.atan2(dx, dz);
        b.v[0] = dx * 11 * (tiny ? 0.7 : 1); b.v[2] = dz * 11 * (tiny ? 0.7 : 1);
        if (zeroG) b.v[1] *= 0.3;
        sfx(g, 'dash');
      }
    }
    if (pl.dashT > 0 && ground && g.rnd() < 0.6 * qk(g)) spark(g, [b.p[0], b.p[1] - b.hh - b.r + 0.05, b.p[2]], [(g.rnd() - 0.5) * 2, 1.5, (g.rnd() - 0.5) * 2], [0.95, 0.92, 0.85], 0.1, 0.4, -4, 'lit');
    // あわ
    pl.shootCd -= dt;
    if (inp.bubblePressed && pl.shootCd <= 0) {
      shoot(g, 0);
      pl.shootCd = 0.3;
      if (pl.char === 'tsukubou') pl.extraShot = 0.13;
    }
    if (pl.extraShot > 0) {
      pl.extraShot -= dt;
      if (pl.extraShot <= 0) shoot(g, 0.12);
    }
    var hs = Math.hypot(b.v[0], b.v[2]);
    pl.walk += hs * dt * 2.4 / Math.max(0.4, sc);
    // こな（キッチン）
    var inFlour = fl.flour.some(function (z) { return inBox(z, b.p); });
    if (inFlour) {
      if (pl.flour < 0.5) { g.fx.push({ type: 'say', text: 'まっしろ！', body: b }); sfx(g, 'poof'); }
      pl.flour = 1;
      if (g.rnd() < 0.4 * qk(g)) spark(g, [b.p[0], b.p[1], b.p[2]], [(g.rnd() - 0.5) * 2, 1 + g.rnd(), (g.rnd() - 0.5) * 2], [1, 1, 0.97], 0.12, 0.8, -1, 'unlit');
    } else pl.flour = Math.max(0, pl.flour - dt / 8);
    // エレベーター
    g.elevT -= dt;
    if (fl.elevator && inBox(fl.elevator, b.p) && g.elevT <= 0 && g.state === 'play') {
      g.elevT = 5;
      g.fx.push({ type: 'say', text: 'ペットを ぜんぶ かえしたら のれるよ', body: b });
    }
    // おちたら ふわっと もどる
    if (b.p[1] < -6 || Math.abs(b.p[0]) > fl.w / 2 + 6 || Math.abs(b.p[2]) > fl.d / 2 + 6) {
      b.p = pl.spawn.slice(); b.v = [0, 0, 0]; pl.fade = 1;
      g.fx.push({ type: 'say', text: 'ふわっ', body: b });
    }
    pl.fade = Math.max(0, pl.fade - dt * 1.5);
  }
  function dosun(g) {
    var b = g.player.body;
    g.shake = Math.max(g.shake, 0.6);
    sfx(g, 'dosun');
    g.fx.push({ type: 'say', text: 'ドスン！', body: b, big: true });
    g.w.bodies.forEach(function (o) {
      if (o === b || !o.active) return;
      var d = distXZ(o.p, b.p);
      if (d > 5.5) return;
      var k = 1 - d / 5.5;
      o.v[1] += 5 + 7 * k;
      var dx = o.p[0] - b.p[0], dz = o.p[2] - b.p[2], l = Math.hypot(dx, dz) || 1;
      o.v[0] += dx / l * 3 * k; o.v[2] += dz / l * 3 * k;
      if (o.ref && o.ref.w) { o.ref.w[0] += (g.rnd() - 0.5) * 12; o.ref.w[2] += (g.rnd() - 0.5) * 12; }
      if (o.kind === 'pet' && o.ref.state === 'free') petSay(g, o.ref, 'きゃー♪', true);
    });
    for (var i = 0; i < 16 * qk(g); i++) {
      var a = i / 16 * Math.PI * 2;
      spark(g, [b.p[0], b.p[1] - 0.6, b.p[2]], [Math.cos(a) * 6, 0.5, Math.sin(a) * 6], [0.95, 0.9, 0.8], 0.18, 0.5, 0, 'lit');
    }
  }

  // ---- ペット -------------------------------------------------------------
  function freeDir(g, b, dx, dz, look) {
    var tries = [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4, Math.PI];
    var a0 = Math.atan2(dx, dz);
    for (var i = 0; i < tries.length; i++) {
      var a = a0 + tries[i];
      var px = b.p[0] + Math.sin(a) * look, pz = b.p[2] + Math.cos(a) * look;
      if (!Physics.overlapStatic(g.w, [px, b.p[1] + 0.05, pz], b.r * 0.9)) return [Math.sin(a), Math.cos(a)];
    }
    return [dx, dz];
  }
  function ballistic(b, to, apex) {
    var gy = 20 * Math.max(0.2, b.gs);
    var up = Math.max(0.6, to[1] - b.p[1] + apex);
    var vy = Math.sqrt(2 * gy * up);
    var tUp = vy / gy, tDown = Math.sqrt(Math.max(0.02, 2 * (up - (to[1] - b.p[1])) / gy));
    var T = tUp + tDown;
    b.v = [(to[0] - b.p[0]) / T, vy, (to[2] - b.p[2]) / T];
  }
  function updatePet(g, pet, dt) {
    var b = pet.body, def = pet.def, pl = g.player.body, fl = g.fl;
    var dtw = dt * g.params.timeScale;
    pet.sayT -= dt; pet.wrongT -= dt;
    pet.happy = Math.max(0, pet.happy - dt);
    if (pet.state === 'home') { pet.walk += dt * 2; return; }
    if (pet.state === 'hidden') {
      pet.hiddenT += dt;
      if (distXZ(pl.p, pet.hide.front) < 2.0 || pet.hiddenT > 14) {
        setPetMode(g, pet, 'free');
        b.p = [pet.hide.front[0], pet.def.r + 0.1, pet.hide.front[2]];
        var ax = b.p[0] - pl.p[0], az = b.p[2] - pl.p[2], al = Math.hypot(ax, az) || 1;
        b.v = [ax / al * 4, 5, az / al * 4];
        pet.hide.occupied = null; pet.hide = null; pet.hideCd = 7;
        pet.sayT = 0; petSay(g, pet, 'ばあ！ みつかった♪', true);
        sfx(g, 'door');
      }
      return;
    }
    if (pet.state === 'bubble' || pet.state === 'tether') { updateBubble(g, pet, dt); return; }
    pet.t += dtw; pet.hopCd -= dtw; pet.thinkT -= dtw; pet.slideCd -= dtw; pet.slideT -= dtw; pet.perchCd -= dtw; pet.hideCd -= dtw;
    pet.excite = Math.max(0, (pet.excite || 0) - dtw);
    if (b.p[1] < -6) { b.p = pet.spawn.slice(); b.v = [0, 0, 0]; }
    if (pet.state === 'eat') {
      pet.eatT -= dtw;
      b.v[0] *= 0.8; b.v[2] *= 0.8;
      pet.walk += dtw * 6;
      if (pet.eatT <= 0 || !pet.cake) {
        if (pet.cake) removeCake(g, pet.cake);
        pet.cake = null;
        setPetMode(g, pet, 'free');
        petSay(g, pet, 'おいしい♪');
      }
      return;
    }
    var dx = b.p[0] - pl.p[0], dz = b.p[2] - pl.p[2], dist = Math.hypot(dx, dz) || 1e-6;
    var dir = [0, 0], spd = 0, fleeing = false;
    if (fl.zeroG) { updatePetZeroG(g, pet, dtw, dist); return; }
    var onPerch = b.ground && b.p[1] > 0.7;
    // ケーキに よってくる
    var cake = null;
    if (g.cakes.length && dist > 1.6) {
      var bd = 7;
      g.cakes.forEach(function (c) {
        if (c.eatenBy || !c.body.ground) return;
        var d = distXZ(c.body.p, b.p);
        if (d < bd) { bd = d; cake = c; }
      });
    }
    if (cake) {
      var cx = cake.body.p[0] - b.p[0], cz = cake.body.p[2] - b.p[2], cl = Math.hypot(cx, cz) || 1;
      dir = [cx / cl, cz / cl]; spd = 0.75;
      if (cl < 0.4 + b.r + cake.body.r) {
        pet.cake = cake; cake.eatenBy = pet; pet.eatT = 3;
        setPetMode(g, pet, 'eat');
        petSay(g, pet, 'もぐもぐ');
        return;
      }
    } else if (def.friendly && dist > 6 && !pet.excite) {
      dir = [-dx / dist, -dz / dist]; spd = 0.55;
    } else if (dist < (pet.excite ? 7.5 : 5.5)) {
      fleeing = true;
      var wob = Math.sin(pet.t * 1.7) * 0.6;
      var fx = dx / dist, fz = dz / dist;
      dir = [fx + fz * wob, fz - fx * wob]; spd = 1;
      if (def.friendly && dist < 2.5 && g.rnd() < 0.02) petSay(g, pet, 'わんわん♪', true);
      else if (dist < 3 && g.rnd() < 0.01) petSay(g, pet, 'きゃー♪', true);
    } else {
      if (pet.thinkT <= 0) {
        var a = g.rnd() * Math.PI * 2;
        pet.wander = [Math.sin(a), Math.cos(a)]; pet.thinkT = 1.5 + g.rnd() * 2.5;
        pet.idle = g.rnd() < 0.3;
      }
      dir = pet.wander; spd = pet.idle ? 0 : 0.35;
    }
    // たかい ところへ のぼる（ねこ・りす）
    if (def.climb && fl.perches.length) {
      if (onPerch) {
        if (dist < 2.6 && pet.perchCd <= 0) {
          var a2 = Math.atan2(dx, dz) + (g.rnd() - 0.5);
          ballistic(b, [b.p[0] + Math.sin(a2) * 4, 0, b.p[2] + Math.cos(a2) * 4], 0.8);
          b.p[1] += 0.05;
          pet.perchCd = 3;
          sfx(g, 'hop');
          return;
        }
        if (dist > 2.6) { spd = 0; }
      } else if (fleeing && pet.perchCd <= 0 && b.ground) {
        var best = null, bd2 = 9;
        fl.perches.forEach(function (pp) {
          var d = distXZ(pp, b.p);
          if (d < bd2 && distXZ(pp, pl.p) > 3 && pp[1] > b.p[1] + 0.4) { bd2 = d; best = pp; }
        });
        if (best) {
          if (bd2 < 3.2) {
            ballistic(b, [best[0], best[1] + b.r, best[2]], 0.9);
            pet.perchCd = 2.5;
            sfx(g, 'hop');
            petSay(g, pet, def.hide ? 'にゃーん♪' : 'ちょろちょろ♪');
            return;
          }
          var px = best[0] - b.p[0], pz = best[2] - b.p[2], pl2 = Math.hypot(px, pz) || 1;
          dir = [px / pl2, pz / pl2];
        }
      }
    }
    // かくれる（れいぞうこ）
    if (def.hide && fleeing && pet.hideCd <= 0 && fl.hides.length) {
      fl.hides.forEach(function (h) {
        if (h.occupied || pet.state !== 'free') return;
        var d = distXZ(h.front, b.p);
        if (d < 6 && distXZ(h.front, pl.p) > 2.5) {
          var hx = h.front[0] - b.p[0], hz = h.front[2] - b.p[2], hl = Math.hypot(hx, hz) || 1;
          dir = [hx / hl, hz / hl];
          if (d < 0.9) {
            setPetMode(g, pet, 'hidden');
            h.occupied = pet; pet.hide = h; pet.hiddenT = 0;
            b.p = h.inside.slice();
            g.fx.push({ type: 'say', text: 'かくれちゃった！', pos: [h.front[0], 2.4, h.front[2]] });
            sfx(g, 'door');
          }
        }
      });
      if (pet.state === 'hidden') return;
    }
    // かべを よける
    if (spd > 0 && (b.ground || b.inWater)) dir = freeDir(g, b, dir[0], dir[1], 0.9 + b.r);
    var dl = Math.hypot(dir[0], dir[1]) || 1;
    dir = [dir[0] / dl, dir[1] / dl];
    var sp = def.speed * spd * (g.opts.easy ? 0.72 : 1);
    // うごく
    var hs = Math.hypot(b.v[0], b.v[2]);
    if (spd > 0.5 && hs < 0.4 && b.ground) pet.stuckT += dtw; else pet.stuckT = 0;
    if (b.ground || b.inWater) {
      if (def.hop && spd > 0.1) {
        if (pet.hopCd <= 0) {
          b.v[0] = dir[0] * sp * 1.25; b.v[2] = dir[1] * sp * 1.25; b.v[1] = 4.8 + g.rnd();
          pet.hopCd = 0.42 + g.rnd() * 0.2;
        } else { b.v[0] *= 0.85; b.v[2] *= 0.85; }
      } else if (def.slide && pet.slideT > 0) {
        b.mu = 0.02;
      } else {
        b.mu = 0.6;
        var k = Math.min(1, 8 * dtw);
        b.v[0] += (dir[0] * sp - b.v[0]) * k; b.v[2] += (dir[1] * sp - b.v[2]) * k;
      }
      if (def.slide && fleeing && pet.slideCd <= 0) {
        pet.slideT = 1.1; pet.slideCd = 2.5 + g.rnd() * 1.5;
        b.v[0] = dir[0] * 8; b.v[2] = dir[1] * 8; b.mu = 0.02;
        petSay(g, pet, 'すいーっ♪');
      }
      if (def.flutter && fleeing && pet.hopCd <= 0) { b.v[1] = 6.5; pet.hopCd = 1.2 + g.rnd(); sfx(g, 'flap', null, 0.3); }
      if (pet.stuckT > 0.7 && pet.hopCd <= 0) { b.v[1] = 6; pet.hopCd = 0.8; pet.stuckT = 0; }
    } else {
      var ka = Math.min(1, 1.5 * dtw);
      b.v[0] += (dir[0] * sp - b.v[0]) * ka * 0.5; b.v[2] += (dir[1] * sp - b.v[2]) * ka * 0.5;
    }
    b.gs = (def.flutter && b.v[1] < 0 && !b.ground) ? 0.3 : 1;
    if (hs > 0.3) pet.yaw = angLerp(pet.yaw, Math.atan2(b.v[0], b.v[2]), Math.min(1, 10 * dtw));
    else if (dist < 6) pet.yaw = angLerp(pet.yaw, Math.atan2(-dx, -dz), Math.min(1, 3 * dtw));
    pet.walk += hs * dtw * 3;
  }
  function updatePetZeroG(g, pet, dtw, dist) {
    var b = pet.body, pl = g.player.body;
    var d = [b.p[0] - pl.p[0], b.p[1] - pl.p[1], b.p[2] - pl.p[2]], dl = Math.hypot(d[0], d[1], d[2]) || 1;
    var dir;
    if (dl < 5.5) dir = [d[0] / dl + Math.sin(pet.t) * 0.4, d[1] / dl * 0.6 + 0.2, d[2] / dl + Math.cos(pet.t) * 0.4];
    else {
      if (pet.thinkT <= 0) {
        pet.wander3 = [g.rnd() - 0.5, (g.rnd() - 0.5) * 0.6, g.rnd() - 0.5]; pet.thinkT = 2 + g.rnd() * 2;
      }
      dir = pet.wander3 || [0, 0, 0];
    }
    if (b.p[1] < 0.9) dir[1] += 0.5;
    if (b.p[1] > 4.5) dir[1] -= 0.5;
    var l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    var sp = pet.def.speed * 0.55 * (dl < 5.5 ? 1 : 0.4) * (g.opts.easy ? 0.72 : 1);
    var k = Math.min(1, 1.2 * dtw);
    b.v[0] += (dir[0] / l * sp - b.v[0]) * k; b.v[1] += (dir[1] / l * sp - b.v[1]) * k; b.v[2] += (dir[2] / l * sp - b.v[2]) * k;
    var hs = Math.hypot(b.v[0], b.v[2]);
    if (hs > 0.2) pet.yaw = angLerp(pet.yaw, Math.atan2(b.v[0], b.v[2]), Math.min(1, 5 * dtw));
    pet.walk += (hs + 0.5) * dtw * 2;
    if (dl < 2.5 && g.rnd() < 0.01) petSay(g, pet, 'ふわふわ〜♪', true);
  }
  function updateBubble(g, pet, dt) {
    var b = pet.body, pl = g.player, pb = pl.body;
    var sc = g.params.playerScale;
    var floorY = g.fl.zeroG ? -10 : Physics.groundAt(g.w, b.p[0], b.p[2], b.p[1]);
    var target = Math.max(floorY, -0.25) + 1.2 + b.r * 0.4;
    pet.walk += dt;
    if (pet.state === 'bubble') {
      pet.bubbleT += dt;
      if (!g.fl.zeroG) b.v[1] += ((target - b.p[1]) * 3 - b.v[1] * 1.2) * dt;
      b.v[0] += Math.sin(pet.bubbleT * 0.9 + pet.t) * 0.4 * dt; b.v[2] += Math.cos(pet.bubbleT * 0.7 + pet.t) * 0.4 * dt;
      if (pet.bubbleT > 20) { popBubble(g, pet, null); return; }
      var reach = pb.r + b.r + 0.45;
      var dy = Math.max(0, Math.abs(b.p[1] - pb.p[1]) - pb.hh);
      if (Math.hypot(b.p[0] - pb.p[0], dy, b.p[2] - pb.p[2]) < reach && g.tether.length < MAX_TETHER && g.state === 'play') {
        setPetMode(g, pet, 'tether');
        g.tether.push(pet);
        sfx(g, 'tether');
        petSay(g, pet, 'わーい♪');
      }
    } else {
      var idx = g.tether.indexOf(pet);
      var anchor = [pb.p[0], pb.p[1] + 0.85 * sc, pb.p[2]];
      var L = 1.3 + idx * 0.6;
      var d = [anchor[0] - b.p[0], anchor[1] - b.p[1], anchor[2] - b.p[2]], dl = Math.hypot(d[0], d[1], d[2]) || 1;
      if (dl > L) {
        var k = (dl - L) * 16 * dt;
        b.v[0] += d[0] / dl * k; b.v[1] += d[1] / dl * k; b.v[2] += d[2] / dl * k;
      }
      b.v[0] += (pb.v[0] - b.v[0]) * 1.2 * dt; b.v[2] += (pb.v[2] - b.v[2]) * 1.2 * dt;
      if (!g.fl.zeroG) b.v[1] += ((target - b.p[1]) * 1.5 - b.v[1] * 0.5) * dt;
      if (dl > 9) { b.p = [anchor[0] - Math.sin(pl.yaw) * L, anchor[1], anchor[2] - Math.cos(pl.yaw) * L]; b.v = pb.v.slice(); }
    }
    // へやに ついたか
    for (var i = 0; i < g.fl.rooms.length; i++) {
      var room = g.fl.rooms[i];
      if (!inBox(room.zone, b.p)) continue;
      if (room.pet === pet.type) { goHome(g, pet, room); return; }
      if (pet.wrongT <= 0) {
        pet.wrongT = 3;
        g.fx.push({ type: 'say', text: 'ここは ' + Floors.PETS[room.pet].emoji + ' の へや だよ', pos: room.sign });
        sfx(g, 'wrong');
      }
    }
  }
  function removeCake(g, c) {
    var i = g.cakes.indexOf(c);
    if (i >= 0) g.cakes.splice(i, 1);
    i = g.props.indexOf(c);
    if (i >= 0) g.props.splice(i, 1);
    Physics.removeBody(g.w, c.body);
    g.pets.forEach(function (p) { if (p.cake === c) p.cake = null; });
  }

  // ---- もの -------------------------------------------------------------
  function updateProps(g, dt) {
    var all = g.props.concat(g.cakes);
    for (var i = 0; i < all.length; i++) {
      var pr = all[i], b = pr.body;
      var sp = Math.hypot(b.v[0], b.v[1], b.v[2]);
      pr.cd -= dt;
      if (!pr.rain && pr.prevSp < 1.6 && sp > 3.2 && pr.cd <= 0 && g.state === 'play') {
        g.mess++; pr.cd = 1.2;
        g.fx.push({ type: 'mess', pos: b.p.slice() });
      }
      pr.prevSp = sp;
      if (b.hit > 3) { pr.w[0] += (g.rnd() - 0.5) * b.hit * 1.5; pr.w[1] += (g.rnd() - 0.5) * b.hit; pr.w[2] += (g.rnd() - 0.5) * b.hit * 1.5; }
      if (pr.def.roll && b.ground) {
        pr.w = [b.v[2] / b.r, 0, -b.v[0] / b.r];
      } else if (b.ground) {
        pr.w[0] *= 0.8; pr.w[1] *= 0.8; pr.w[2] *= 0.8;
      } else {
        pr.w[0] *= 0.995; pr.w[1] *= 0.995; pr.w[2] *= 0.995;
      }
      var wl = Math.hypot(pr.w[0], pr.w[1], pr.w[2]);
      if (wl > 25) { pr.w[0] *= 25 / wl; pr.w[1] *= 25 / wl; pr.w[2] *= 25 / wl; }
      qint(pr.q, pr.w, dt * b.ts);
      if (pr.def.upright && (b.ground || b.inWater || pr.type === 'balloon') && sp < 2.5) {
        var yaw = qYaw(pr.q), qy = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
        var dot = pr.q[0] * qy[0] + pr.q[1] * qy[1] + pr.q[2] * qy[2] + pr.q[3] * qy[3];
        var s = dot < 0 ? -1 : 1, k = Math.min(1, 5 * dt);
        for (var j = 0; j < 4; j++) pr.q[j] += (qy[j] * s - pr.q[j]) * k;
        qnorm(pr.q);
      }
      if (pr.type === 'balloon' && b.p[1] < 1.4) b.v[1] += 1.2 * dt;
      if (b.p[1] < -6) { b.p = pr.spawn.slice(); b.v = [0, 0, 0]; }
      if (pr.rain) {
        pr.life += dt;
        if (pr.life > 25 && !pr.eatenBy) removeCake(g, pr);
      }
    }
  }

  function updateParticles(g, dt) {
    for (var i = g.particles.length - 1; i >= 0; i--) {
      var p = g.particles[i];
      p.life -= dt;
      if (p.life <= 0) { g.particles.splice(i, 1); continue; }
      p.v[1] += p.g * dt;
      p.p[0] += p.v[0] * dt; p.p[1] += p.v[1] * dt; p.p[2] += p.v[2] * dt;
      if (p.mode === 'lit') { p.v[0] *= 0.97; p.v[2] *= 0.97; }
    }
  }

  // ---- かたづけ（ロボット そうじき）と けっか ---------------------------------
  function startCleanup(g) {
    g.state = 'cleanup'; g.cleanT = 0; g.clearTime = g.t;
    if (g.ev.phase === 'active') endEvent(g);
    g.ev.phase = 'none';
    g.robot = { p: [0, 0, 0], yaw: 0 };
    g.fx.push({ type: 'cleanup' });
    sfx(g, 'vacuum');
  }
  function finish(g) {
    g.state = 'clear';
    if (g.endless) {
      g.result = { endless: true, count: g.returned, mess: g.mess, time: g.t };
    } else {
      var t = g.clearTime != null ? g.clearTime : g.t;
      var stars = 1 + (t <= g.fl.par ? 1 : 0) + (g.mess >= g.fl.mess ? 1 : 0);
      g.result = { stars: stars, time: t, mess: g.mess, timeOk: t <= g.fl.par, messOk: g.mess >= g.fl.mess, unlock: UNLOCK[g.fl.id] || null };
    }
    g.fx.push({ type: 'clear', result: g.result });
  }
  function updateCleanup(g, dt) {
    g.cleanT += dt;
    var a = g.cleanT * 2.2, R = Math.min(5, 1 + g.cleanT * 2);
    g.robot.p = [Math.sin(a) * R, 0, Math.cos(a) * R * 0.7];
    g.robot.yaw = a + Math.PI / 2;
    var k = Math.min(1, 2.5 * dt);
    g.props.forEach(function (pr) {
      var b = pr.body;
      for (var i = 0; i < 3; i++) b.p[i] += (pr.spawn[i] - b.p[i]) * k;
      b.v = [0, 0, 0];
      pr.w = [0, 0, 0];
      var qy = [0, pr.q[1], 0, pr.q[3]];
      for (var j = 0; j < 4; j++) pr.q[j] += (qy[j] - pr.q[j]) * k;
      qnorm(pr.q);
    });
    g.cakes.slice().forEach(function (c) { removeCake(g, c); });
    if (g.cleanT > 3.2) finish(g);
  }

  // ---- 1ステップ --------------------------------------------------------
  function step(g, inp) {
    var dt = STEP;
    g.shake = Math.max(0, g.shake - dt * 1.5);
    if (g.state === 'clear') { updateParticles(g, dt); g.pets.forEach(function (p) { if (p.state === 'home') p.walk += dt * 2; }); return; }
    if (g.state === 'cleanup') {
      updateCleanup(g, dt);
      updateParticles(g, dt);
      g.pets.forEach(function (p) { p.walk += dt * 2; });
      return;
    }
    g.t += dt;
    updateEvents(g, dt);
    g.windT = Math.max(0, g.windT - dt);
    applyParams(g);
    updatePlayer(g, dt, inp);
    for (var i = 0; i < g.pets.length; i++) if (g.state === 'play') updatePet(g, g.pets[i], dt);
    if (g.state !== 'play') return;
    Physics.step(g.w, dt);
    updateShots(g, dt);
    updateProps(g, dt);
    updateParticles(g, dt);
    // ペットの へやの チェックは あわの うごきの あと
    g.pets.forEach(function (pet) {
      if (pet.state === 'bubble' || pet.state === 'tether') {
        for (var r = 0; r < g.fl.rooms.length; r++) {
          var room = g.fl.rooms[r];
          if (room.pet === pet.type && inBox(room.zone, pet.body.p)) { goHome(g, pet, room); break; }
        }
      }
    });
    // シャワーで どろんこ が おちる
    g.fl.showers.forEach(function (s) {
      if (g.rnd() < 0.5 * qk(g)) spark(g, [s.p[0] + (g.rnd() - 0.5) * 1.2, 2.4, s.p[2] + (g.rnd() - 0.5) * 1.2], [0, -4, 0], [0.6, 0.85, 1], 0.05, 0.55, -6, 'unlit');
      g.pets.forEach(function (pet) {
        if (pet.mud > 0 && pet.state === 'free' && inBox(s, pet.body.p)) {
          pet.mud = 0; pet.sayT = 0; petSay(g, pet, 'ぴかぴか！', true);
          sfx(g, 'shower');
        }
      });
    });
    if (g.endless && g.t >= g.limit && g.state === 'play') {
      if (g.ev.phase === 'active') endEvent(g);
      finish(g);
    }
  }
  function update(g, frameDt, inp) {
    g.acc += Math.min(frameDt, 0.1);
    var n = 0, first = true;
    var blank = { move: inp.move, jump: inp.jump, jumpPressed: false, bubblePressed: false, dashPressed: false };
    while (g.acc >= STEP && n < 6) {
      step(g, first ? inp : blank);
      first = false;
      g.acc -= STEP; n++;
    }
    if (first) { // 1かいも すすまなかったら おした ことを つぎに もちこす
      return inp;
    }
    return null;
  }

  // ---- デバッグ / テスト -------------------------------------------------
  var debug = {
    bubbleAll: function (g) {
      g.pets.forEach(function (p) {
        if (p.state === 'hidden') { p.hide.occupied = null; p.hide = null; setPetMode(g, p, 'free'); p.body.p = p.spawn.slice(); }
        if (p.state === 'free' || p.state === 'eat') { p.mud = 0; bubblePet(g, p); }
      });
    },
    carryHome: function (g) {
      g.pets.forEach(function (p) {
        if (p.state === 'bubble' || p.state === 'tether') {
          var room = g.fl.rooms.filter(function (r) { return r.pet === p.type; })[0];
          if (room) { p.body.p = [(room.zone.min[0] + room.zone.max[0]) / 2, 1.3, (room.zone.min[2] + room.zone.max[2]) / 2]; p.body.v = [0, 0, 0]; }
        }
      });
    },
  };

  return {
    STEP: STEP, EVENTS: EVENTS, CHARS: CHARS, UNLOCK: UNLOCK, EV_EVERY: EV_EVERY, EV_LEN: EV_LEN, EV_WARN: EV_WARN, MAX_BODIES: MAX_BODIES,
    create: create, update: update, step: step, params: params, forceEvent: forceEvent, bubblePet: bubblePet, popBubble: popBubble, debug: debug, qYaw: qYaw,
  };
})();
if (typeof module !== 'undefined') module.exports = Game;
