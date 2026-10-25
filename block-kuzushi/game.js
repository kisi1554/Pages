/* ============================================================
   ドカーン ブロックくずし — ゲーム ほんたい（じょうたい・あたり・えがく・そうさ）
   ばんめんは 360×640 の ろんり ざひょう。がめんに あわせて かくだい して えがく
   ============================================================ */
(function () {
  "use strict";
  var S = window.BKStages, P = window.BKPhysics, FX = window.BKParticles, SND = window.BKSound;

  var W = 360, H = 640, COLS = 11, CW = 32, CH = 16, GX = 4;
  var PADDLE_Y = 548, PADDLE_H = 12, BALL_R = 6, MAX_BALLS = 30, TRAIL = 7;
  var TOP_NORMAL = 64, TOP_BOSS = 150, BAR_Y = 612;
  var FONT = '"Hiragino Maru Gothic ProN","BIZ UDPGothic","M PLUS Rounded 1c","Meiryo",system-ui,sans-serif';
  var COLORS = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa", "#f783ac"];
  var ITEM = {
    m: { name: "マルチボール", icon: "×3", col: "#4dabf7" },
    w: { name: "ワイド", icon: "↔", col: "#51cf66" },
    l: { name: "レーザー", icon: "⚡", col: "#fcc419" },
    f: { name: "ファイア", icon: "🔥", col: "#ff6b3d" },
    s: { name: "スロー", icon: "🐢", col: "#94d82d" },
    c: { name: "キャッチ", icon: "🧲", col: "#da77f2" },
    u: { name: "+1 ライフ", icon: "❤", col: "#ff8787" }
  };
  var POWER_TIME = { w: 15, l: 12, f: 9, s: 10, c: 15 };
  var POWER_ORDER = ["w", "l", "f", "s", "c"];

  // ボスの からだ（12×7 マス）。b からだ d こい いろ h つの/ほのお k おうかん e め t は m くち（じゃくてん）
  var BOSS_ART = [
    ["..h......h..",
     ".bbbbbbbbbb.",
     "bbeebbbbeebb",
     "bbeebbbbeebb",
     "bbbbbbbbbbbb",
     "bbtmmmmmmtbb",
     ".bbmmmmmmbb."],
    ["hh........hh",
     "dddddddddddd",
     "dbeebddbeebd",
     "dbeebddbeebd",
     "dddbbbbbbddd",
     "ddtmmmmmmtdd",
     "dddmmmmmmddd"],
    [".h..hhhh..h.",
     "bbbbbbbbbbbb",
     "bbeebbbbeebb",
     "bdeebbbbeedb",
     "bbbbbbbbbbbb",
     "btmmmmmmmmtb",
     ".bbmmmmmmbb."],
    ["..k.k..k.k..",
     "..kkkkkkkk..",
     "bbbbbbbbbbbb",
     "beeebbbbeeeb",
     "bdeebbbbeedb",
     "bbtmmmmmmtbb",
     "dbbmmmmmmbbd"]
  ];
  var BOSS_COL = [
    { b: "#51cf66", d: "#2b8a3e", h: "#fcc419", hit: "#d3f9d8" },
    { b: "#868e96", d: "#495057", h: "#74c0fc", hit: "#e9ecef" },
    { b: "#ff6b3d", d: "#c92a2a", h: "#ffd43b", hit: "#ffe3d6" },
    { b: "#9775fa", d: "#5f3dc4", h: "#ffd43b", hit: "#ece6ff" }
  ];
  var BG = [["#1b1145", "#3b1d6e"], ["#0f2a44", "#1c5a73"], ["#3a1030", "#6e2141"], ["#10301f", "#245c3a"]];

  // ---------- ほぞん ----------
  var KEY = "block-kuzushi-v1";
  var save = { unlocked: 1, done: {}, best: {}, hi: 0, set: { sfx: true, bgm: true, shake: true, easy: false } };
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && typeof s === "object") {
        if (s.unlocked >= 1) save.unlocked = Math.min(40, s.unlocked | 0);
        if (s.done) save.done = s.done;
        if (s.best) save.best = s.best;
        if (s.hi) save.hi = s.hi | 0;
        if (s.set) for (var k in save.set) if (typeof s.set[k] === "boolean") save.set[k] = s.set[k];
      }
    } catch (e) { /* よめなくても あそべる */ }
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* むし */ } }
  load();
  SND.setSfx(save.set.sfx); SND.setBgm(save.set.bgm);

  // ---------- がめん ----------
  var $ = function (id) { return document.getElementById(id); };
  var cv = $("cv"), ctx = cv.getContext("2d"), playEl = $("play");
  var scale = 1, dpr = 1, sprites = {};
  function resize() {
    var r = playEl.getBoundingClientRect(), pad = 8;
    scale = Math.max(0.3, Math.min((r.width - pad * 2) / W, (r.height - pad * 2) / H));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = Math.floor(W * scale) + "px";
    cv.style.height = Math.floor(H * scale) + "px";
    cv.width = Math.floor(W * scale * dpr);
    cv.height = Math.floor(H * scale * dpr);
    sprites = {};
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", function () { setTimeout(resize, 200); });

  function sprite(key, w, h, fn) {
    var s = sprites[key];
    if (s) return s;
    var k = scale * dpr, c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w * k)); c.height = Math.max(1, Math.ceil(h * k));
    var x = c.getContext("2d"); x.scale(k, k); fn(x, w, h);
    sprites[key] = c;
    return c;
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function shade(hex, a) {
    var n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
    return "rgb(" + c.map(function (v) { return Math.round(a < 0 ? v * (1 + a) : v + (255 - v) * a); }).join(",") + ")";
  }
  var C = {
    white: FX.color("#ffffff"), yellow: FX.color("#ffe066"), orange: FX.color("#ff922b"), red: FX.color("#ff4d4d"),
    silver: FX.color("#dee2e6"), grey: FX.color("#adb5bd"), cyan: FX.color("#99e9f2"), ice: FX.color("#d0ebff"),
    fire: FX.color("#ff8c42"), green: FX.color("#8ce99a"), gold: FX.color("#ffd43b"), pink: FX.color("#ff8fab")
  };
  var COLOR_FX = COLORS.map(function (c) { return FX.color(c); });

  // ---------- ゲームの じょうたい ----------
  var g = {
    state: "menu", no: 1, st: null, top: TOP_NORMAL, rows: 0, blocks: [], grid: [], movers: [], groups: [],
    remain: 0, balls: [], items: [], lasers: [], bullets: [], booms: [], texts: [], boss: null,
    paddle: { x: W / 2, w: 74 }, targetX: W / 2, power: { w: 0, l: 0, f: 0, s: 0, c: 0 },
    lives: 3, score: 0, stageScore: 0, combo: 0, comboT: 0, mult: 1, shrink: 1, bar: false, shake: 0,
    t: 0, laserCd: 0, ended: false, clearT: 0, banner: null, invincible: false
  };
  var easy = function () { return save.set.easy; };
  function baseW() { return easy() ? 94 : 74; }
  function baseSpd() { return easy() ? 230 : 280 + Math.min(60, g.no * 1.5); }
  function maxSpd() { return easy() ? 420 : 540; }

  var tmp = [];
  function queryBlocks(x0, y0, x1, y1, out) {
    var c0 = Math.max(0, Math.floor((x0 - GX) / CW)), c1 = Math.min(COLS - 1, Math.floor((x1 - GX) / CW));
    var r0 = Math.max(0, Math.floor((y0 - g.top) / CH)), r1 = Math.min(g.rows - 1, Math.floor((y1 - g.top) / CH));
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) { var b = g.grid[r * COLS + c]; if (b) out.push(b); }
    for (var i = 0; i < g.movers.length; i++) {
      var m = g.movers[i];
      if (!m.dead && m.x < x1 && m.x + m.w > x0 && m.y < y1 && m.y + m.h > y0) out.push(m);
    }
    var B = g.boss;
    if (B && !B.dead && B.x < x1 && B.x + B.w > x0 && B.y < y1 && B.y + B.h > y0) out.push(B);
  }

  var world = {
    W: W, H: H, top: 0, mul: 1, paddle: { x: 0, y: PADDLE_Y, w: 74, h: PADDLE_H }, bar: null,
    query: queryBlocks,
    mode: function (b, k) { return b.fire && !k.isBoss && k.type !== "wall" ? "pass" : "bounce"; },
    hit: onBallHit,
    onWall: function () { SND.wall(); },
    onPaddle: onPaddle,
    onBar: onBar
  };

  function randItem() { return Math.random() < 0.08 ? "u" : "mwlfsc"[Math.floor(Math.random() * 6)]; }

  function makeBlock(ch, r, c) {
    var b = { x: GX + c * CW, y: g.top + r * CH, w: CW, h: CH, r: r, c: c, type: "normal", hp: 1, max: 1,
      col: (r + c) % 7, item: null, dead: false, moving: false, flash: 0 };
    if (ch >= "1" && ch <= "7") b.col = ch.charCodeAt(0) - 49;
    else if (ch === "H") { b.type = "hard"; b.hp = b.max = 2; }
    else if (ch === "X") { b.type = "hard"; b.hp = b.max = 3; }
    else if (ch === "B") b.type = "bomb";
    else if (ch === "I") b.type = "ice";
    else if (ch === "M") { b.type = "mover"; b.moving = true; b.col = (r * 3 + 4) % 7; }
    else if (ch === "#") { b.type = "wall"; b.hp = Infinity; }
    else { b.type = "item"; b.item = ch === "?" ? randItem() : ch; }
    return b;
  }

  function makeBoss(def) {
    var big = def.kind === 3, w = big ? 150 : 120, h = big ? 84 : 70;
    var hp = easy() ? Math.ceil(def.hp * 0.7) : def.hp;
    var art = BOSS_ART[def.kind], eyes = [[0, 0, 0], [0, 0, 0]];
    art.forEach(function (row, r) {
      for (var c = 0; c < 12; c++) if (row[c] === "e") { var e = eyes[c < 6 ? 0 : 1]; e[0] += c + 0.5; e[1] += r + 0.5; e[2]++; }
    });
    return { isBoss: true, def: def, kind: def.kind, name: def.name, x: W / 2 - w / 2, y: 40, w: w, h: h, hp: hp, max: hp,
      vx: def.speed * (easy() ? 0.75 : 1), fireT: def.fire * 1.5, flash: 0, mouth: 0, dead: false, dieT: 0, moving: true, t: 0,
      eyes: eyes.map(function (e) { return [e[0] / e[2] / 12, e[1] / e[2] / 7]; }) };
  }

  function loadStage(n) {
    var st = S.STAGES[n - 1];
    g.no = n; g.st = st; g.top = st.boss ? TOP_BOSS : TOP_NORMAL; g.rows = st.map.length;
    g.blocks = []; g.grid = new Array(g.rows * COLS).fill(null); g.movers = []; g.groups = [];
    g.balls = []; g.items = []; g.lasers = []; g.bullets = []; g.booms = []; g.texts = [];
    st.map.forEach(function (row, r) {
      S.moverRuns(row).forEach(function (run) {
        var v = (r % 2 ? 1 : -1) * (36 + n * 0.7);
        var grp = { off: 0, min: -run.left * CW, max: run.right * CW, v: v, blocks: [] };
        if (grp.min === 0) grp.v = Math.abs(v);
        if (grp.max === 0) grp.v = -Math.abs(v);
        g.groups.push(grp);
        for (var c = run.a; c <= run.b; c++) {
          var b = makeBlock("M", r, c); b.bx = b.x; b.group = grp;
          grp.blocks.push(b); g.movers.push(b); g.blocks.push(b);
        }
      });
      for (var c = 0; c < COLS; c++) {
        var ch = row[c];
        if (ch === "." || ch === "M") continue;
        var b = makeBlock(ch, r, c);
        g.blocks.push(b); g.grid[r * COLS + c] = b;
      }
    });
    g.remain = g.blocks.filter(function (b) { return b.type !== "wall"; }).length;
    g.boss = st.boss ? makeBoss(st.boss) : null;
    g.power = { w: 0, l: 0, f: 0, s: 0, c: 0 };
    g.combo = 0; g.comboT = 0; g.mult = 1; g.shrink = 1; g.bar = easy(); g.shake = 0;
    g.paddle.x = g.targetX = W / 2; g.paddle.w = baseW();
    g.ended = false; g.clearT = 0; g.t = 0; g.laserCd = 0;
    g.stageScore = g.score;
    FX.clear();
    newBall();
    g.banner = { text: (st.boss ? "ボス！ " : "ステージ ") + n, sub: st.name, t: 2.4 };
    SND.bgm(st.boss ? "boss" : "main");
    if (st.boss) SND.growl();
  }

  // ---------- ボール ----------
  function newBall() {
    var b = { x: g.paddle.x, y: PADDLE_Y - BALL_R, dx: 0, dy: -1, spd: baseSpd(), r: BALL_R, stuck: true, stuckOff: 0,
      dead: false, idle: 0, fire: false, tx: new Float32Array(TRAIL), ty: new Float32Array(TRAIL), th: 0, tn: 0 };
    g.balls.push(b);
    return b;
  }
  function cloneBall(s, da) {
    var a = Math.atan2(s.dy, s.dx) + da;
    var b = { x: s.x, y: s.y, dx: Math.cos(a), dy: Math.sin(a), spd: s.spd, r: BALL_R, stuck: false, stuckOff: 0,
      dead: false, idle: 0, fire: s.fire, tx: new Float32Array(TRAIL), ty: new Float32Array(TRAIL), th: 0, tn: 0 };
    P.fixAngle(b);
    g.balls.push(b);
  }
  function launch(b) {
    var off = b.stuckOff / (g.paddle.w / 2);
    if (Math.abs(off) < 0.12) off = (Math.random() < 0.5 ? -1 : 1) * (0.15 + Math.random() * 0.1);
    var a = Math.max(-1, Math.min(1, off)) * P.PADDLE_MAX * 0.85;
    b.dx = Math.sin(a); b.dy = -Math.cos(a); b.stuck = false; b.idle = 0;
    SND.launch();
  }
  function pushTrail(b) {
    b.tx[b.th] = b.x; b.ty[b.th] = b.y; b.th = (b.th + 1) % TRAIL; if (b.tn < TRAIL) b.tn++;
  }

  function onPaddle(b) {
    b.idle = 0;
    b.spd = Math.min(maxSpd(), b.spd + 4);
    SND.paddle();
    FX.sparks(b.x, PADDLE_Y, 5, C.cyan, 110);
    if (g.power.c > 0) { b.stuck = true; b.stuckOff = b.x - g.paddle.x; b.y = PADDLE_Y - b.r; }
  }
  function onBar(b) {
    if (g.invincible) return;
    g.bar = false; world.bar = null;
    SND.bar();
    FX.ring(b.x, BAR_Y, 40, C.green, 0.5); FX.sparks(b.x, BAR_Y, 20, C.green, 200);
    popText(b.x, BAR_Y - 20, "セーフ！", "#8ce99a", true);
  }

  function onBallHit(ball, blk, nx, ny, px, py, mode) {
    if (blk.isBoss) { hitBoss(nx, ny, px, py, ball.fire ? 2 : 1); return; }
    if (mode === "pass") { destroyBlock(blk); FX.sparks(px, py, 6, C.fire, 160); ball.idle = 0; return; }
    if (blk.type === "wall") { SND.clank(); FX.sparks(px, py, 4, C.grey, 90); return; }
    ball.idle = 0;
    if (blk.type === "ice") {
      // こおり: はねかえる いきおいが よわく、めんに そって すべる
      var vn = ball.dx * nx + ball.dy * ny;
      ball.dx = ball.dx - vn * nx + 0.35 * vn * nx;
      ball.dy = ball.dy - vn * ny + 0.35 * vn * ny;
      var l = Math.hypot(ball.dx, ball.dy) || 1; ball.dx /= l; ball.dy /= l;
      SND.ice(); FX.sparks(px, py, 8, C.ice, 140);
    }
    damageBlock(blk, 1, px, py);
    ball.spd = Math.min(maxSpd(), ball.spd + 0.8);
  }

  // ---------- ブロック ----------
  function damageBlock(b, amt, px, py) {
    if (b.dead || b.type === "wall") return;
    b.hp -= amt;
    if (b.hp > 0) {
      b.flash = 0.12; SND.hard();
      FX.sparks(px || b.x + b.w / 2, py || b.y + b.h / 2, 7, C.silver, 150);
      addScore(5);
      return;
    }
    destroyBlock(b);
  }
  function blockFx(b) {
    return b.type === "hard" ? C.silver : b.type === "bomb" ? C.orange : b.type === "ice" ? C.ice : COLOR_FX[b.col];
  }
  var POINTS = { normal: 10, mover: 15, item: 10, ice: 12, bomb: 15, hard: 10 };
  function destroyBlock(b) {
    if (b.dead || b.type === "wall") return;
    b.dead = true;
    if (!b.moving) g.grid[b.r * COLS + b.c] = null;
    g.remain--;
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    g.combo++; g.comboT = 3.5;
    var m = Math.min(9, 1 + Math.floor(g.combo / 5));
    if (m > g.mult) {
      g.mult = m; SND.combo(m);
      g.texts.push({ x: W / 2, y: H * 0.46, text: "×" + m + "！", col: "#ffd43b", t: 1.1, max: 1.1, big: 2 });
    }
    addScore(POINTS[b.type] * (b.type === "hard" ? b.max : 1) * g.mult, cx, cy);
    SND.hit(g.combo);
    FX.shards(cx, cy, 12, blockFx(b), 170, b.w, b.h);
    FX.sparks(cx, cy, 4, C.white, 120);
    if (b.type === "bomb") g.booms.push({ x: cx, y: cy, t: 0.09 });
    if (b.type === "item") dropItem(b.item, cx, cy);
    else if (b.type !== "bomb" && Math.random() < 0.04 && g.items.length < 3) dropItem(randItem(), cx, cy);
  }
  function explode(x, y) {
    FX.ring(x, y, 54, C.orange, 0.45); FX.ring(x, y, 30, C.yellow, 0.3);
    FX.shards(x, y, 20, C.orange, 260); FX.sparks(x, y, 16, C.yellow, 260);
    for (var i = 0; i < 6; i++) FX.flame(x, y, C.fire);
    SND.boom(1 + Math.min(2, g.booms.length));
    addShake(5);
    tmp.length = 0;
    queryBlocks(x - CW * 1.5, y - CH * 1.5, x + CW * 1.5, y + CH * 1.5, tmp);
    for (var j = 0; j < tmp.length; j++) {
      var k = tmp[j];
      if (k.isBoss) continue;
      if (Math.abs(k.x + k.w / 2 - x) < CW * 1.25 && Math.abs(k.y + k.h / 2 - y) < CH * 1.25) destroyBlock(k);
    }
  }

  // ---------- ボス ----------
  function hitBoss(nx, ny, px, py, amount) {
    var B = g.boss;
    if (!B || B.dead) return;
    var rel = (px - B.x) / B.w;
    if (ny > 0.5 && rel >= 0.22 && rel <= 0.78) damageBoss(amount, px, B.y + B.h);
    else { SND.clank(); FX.sparks(px, py, 6, C.white, 130); }
  }
  function damageBoss(amount, x, y) {
    var B = g.boss;
    B.hp -= amount;
    SND.bossHit();
    FX.shards(x, y, 14, FX.color(BOSS_COL[B.kind].b), 210); FX.ring(x, y, 32, C.pink, 0.35);
    if (B.flash <= 0) B.flash = 0.34;   // 1びょうに 3かい まで
    addShake(3);
    addScore(50 * g.mult, x, y + 8);
    if (Math.random() < 0.28 && g.items.length < 3) dropItem(randItem(), x, y + 6);
    if (B.hp <= 0) {
      B.hp = 0; B.dead = true; B.dieT = 0;
      g.bullets = [];
      addScore(2000, B.x + B.w / 2, B.y + B.h / 2);
      SND.boom(3); addShake(8);
      FX.ring(B.x + B.w / 2, B.y + B.h / 2, 120, C.gold, 0.8);
      FX.shards(B.x + B.w / 2, B.y + B.h / 2, 90, FX.color(BOSS_COL[B.kind].b), 330, B.w, B.h);
      g.texts.push({ x: W / 2, y: H * 0.42, text: "やっつけた！", col: "#ffd43b", t: 2, max: 2, big: 1.4 });
    }
  }
  function updateBoss(dt) {
    var B = g.boss;
    if (!B) return;
    if (B.dead) {
      B.dieT += dt;
      if (B.dieT < 1.4 && Math.random() < dt * 12) {
        var ex = B.x + Math.random() * B.w, ey = B.y + Math.random() * B.h;
        FX.ring(ex, ey, 34, C.orange, 0.4); FX.shards(ex, ey, 12, C.orange, 220); SND.boom(2); addShake(3);
      }
      return;
    }
    B.t += dt;
    B.x += B.vx * dt;
    if (B.x < 4) { B.x = 4; B.vx = Math.abs(B.vx); }
    if (B.x + B.w > W - 4) { B.x = W - 4 - B.w; B.vx = -Math.abs(B.vx); }
    B.y = 40 + Math.sin(B.t * 1.3) * 6;
    B.flash = Math.max(0, B.flash - dt);
    B.mouth = Math.max(0, B.mouth - dt);
    var waiting = g.balls.every(function (b) { return b.stuck; });
    B.fireT -= dt;
    if (B.fireT <= 0 && !waiting) {
      var n = B.def.spread, sp = easy() ? 120 : 160;
      for (var i = 0; i < n; i++) g.bullets.push({ x: B.x + B.w / 2, y: B.y + B.h, vx: (i - (n - 1) / 2) * 70, vy: sp });
      B.mouth = 0.45;
      B.fireT = B.def.fire * (easy() ? 1.4 : 1) * (0.8 + Math.random() * 0.4);
      SND.growl();
    }
  }

  // ---------- アイテム・レーザー・たま ----------
  function dropItem(k, x, y) { g.items.push({ k: k, x: x, y: y, t: 0 }); }
  function collect(k, x) {
    var it = ITEM[k];
    popText(x, PADDLE_Y - 24, it.name + "！", it.col, true);
    FX.sparks(x, PADDLE_Y, 16, FX.color(it.col), 200);
    if (k === "u") { g.lives = Math.min(9, g.lives + 1); SND.oneup(); return; }
    SND.item();
    if (k === "m") {
      g.balls.forEach(function (b) { if (b.stuck) launch(b); });
      var src = g.balls.filter(function (b) { return !b.dead; });
      for (var i = 0; i < src.length && g.balls.length < MAX_BALLS; i++) {
        cloneBall(src[i], -0.42);
        if (g.balls.length < MAX_BALLS) cloneBall(src[i], 0.42);
      }
      return;
    }
    g.power[k] = POWER_TIME[k];
  }
  function fireLaser() {
    var hw = g.paddle.w / 2 - 6;
    g.lasers.push({ x: g.paddle.x - hw, y: PADDLE_Y - 4 }, { x: g.paddle.x + hw, y: PADDLE_Y - 4 });
    g.laserCd = 0.16;
    SND.laser();
  }
  function updateShots(dt) {
    var pw = g.paddle.w, pl = g.paddle.x - pw / 2, i;
    for (i = g.items.length - 1; i >= 0; i--) {
      var it = g.items[i];
      it.y += 125 * dt; it.t += dt;
      if (it.y + 8 > PADDLE_Y && it.y - 8 < PADDLE_Y + PADDLE_H && it.x + 15 > pl && it.x - 15 < pl + pw) { g.items.splice(i, 1); collect(it.k, it.x); }
      else if (it.y > H + 20) g.items.splice(i, 1);
    }
    for (i = g.lasers.length - 1; i >= 0; i--) {
      var L = g.lasers[i], ny = L.y - 760 * dt;
      tmp.length = 0;
      queryBlocks(L.x - 1.5, ny - 8, L.x + 1.5, L.y, tmp);
      var best = null;
      for (var j = 0; j < tmp.length; j++) if (!tmp[j].dead && (!best || tmp[j].y + tmp[j].h > best.y + best.h)) best = tmp[j];
      if (best) {
        g.lasers.splice(i, 1);
        if (best.isBoss) hitBoss(0, 1, L.x, best.y + best.h, 0.34);
        else if (best.type === "wall") { SND.clank(); FX.sparks(L.x, best.y + best.h, 4, C.grey, 80); }
        else damageBlock(best, 1, L.x, best.y + best.h);
        FX.sparks(L.x, best.y + best.h, 4, C.yellow, 120);
        continue;
      }
      L.y = ny;
      if (L.y < -16) g.lasers.splice(i, 1);
    }
    for (i = g.bullets.length - 1; i >= 0; i--) {
      var u = g.bullets[i];
      u.x += u.vx * dt; u.y += u.vy * dt;
      if (u.x < 5 || u.x > W - 5) u.vx = -u.vx;
      if (u.y + 5 > PADDLE_Y && u.y - 5 < PADDLE_Y + PADDLE_H && u.x + 5 > pl && u.x - 5 < pl + pw) {
        g.bullets.splice(i, 1);
        g.shrink = Math.max(0.6, g.shrink - 0.1);
        SND.shrink(); addShake(2);
        FX.sparks(u.x, PADDLE_Y, 12, C.red, 160);
        popText(u.x, PADDLE_Y - 20, "ちぢんだ！", "#ff8787");
      } else if (u.y > H + 10) g.bullets.splice(i, 1);
    }
  }

  // ---------- てんすう・もじ・ゆれ ----------
  function addScore(p, x, y) {
    g.score += p;
    if (x !== undefined && g.texts.length < 40) g.texts.push({ x: x, y: y, text: "+" + p, col: "#fff", t: 0.7, max: 0.7, big: 0 });
  }
  function popText(x, y, text, col, mid) {
    g.texts.push({ x: Math.max(60, Math.min(W - 60, x)), y: y, text: text, col: col, t: 1.1, max: 1.1, big: mid ? 0.6 : 0.4 });
  }
  function addShake(a) { g.shake = Math.min(7, Math.max(g.shake, a)); }
  function updateTexts(dt) {
    for (var i = g.texts.length - 1; i >= 0; i--) {
      var t = g.texts[i];
      t.t -= dt;
      if (!t.big || t.big < 1) t.y -= 34 * dt;
      if (t.t <= 0) g.texts.splice(i, 1);
    }
    if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
  }

  // ---------- 1フレーム ----------
  var keys = {};
  function update(dt) {
    g.t += dt;
    if (keys.ArrowLeft) g.targetX -= 420 * dt;
    if (keys.ArrowRight) g.targetX += 420 * dt;
    for (var k in g.power) {
      if (g.power[k] > 0) {
        g.power[k] -= dt;
        if (g.power[k] <= 0) { g.power[k] = 0; if (k === "c") g.balls.forEach(function (b) { if (b.stuck && g.balls.length > 0 && b.y < PADDLE_Y) launch(b); }); }
      }
    }
    g.laserCd -= dt;
    world.mul = g.power.s > 0 ? 0.6 : 1;
    g.shrink = Math.min(1, g.shrink + 0.02 * dt);
    var tw = baseW() * (g.power.w > 0 ? 1.6 : 1) * g.shrink;
    g.paddle.w += (tw - g.paddle.w) * Math.min(1, dt * 8);
    var hw = g.paddle.w / 2;
    g.targetX = Math.max(hw, Math.min(W - hw, g.targetX));
    g.paddle.x = g.targetX;
    world.paddle.x = g.paddle.x - hw; world.paddle.w = g.paddle.w;
    world.bar = g.bar || g.invincible ? { y: BAR_Y } : null;

    for (var i = 0; i < g.groups.length; i++) {
      var gr = g.groups[i];
      gr.off += gr.v * dt;
      if (gr.off > gr.max) { gr.off = gr.max; gr.v = -Math.abs(gr.v); }
      if (gr.off < gr.min) { gr.off = gr.min; gr.v = Math.abs(gr.v); }
      for (var j = 0; j < gr.blocks.length; j++) gr.blocks[j].x = gr.blocks[j].bx + gr.off;
    }
    updateBoss(dt);

    var fire = g.power.f > 0;
    for (i = 0; i < g.balls.length; i++) {
      var b = g.balls[i];
      b.fire = fire;
      if (b.stuck) {
        b.stuckOff = Math.max(-hw, Math.min(hw, b.stuckOff));
        b.x = Math.max(b.r, Math.min(W - b.r, g.paddle.x + b.stuckOff)); b.y = PADDLE_Y - b.r;
        pushTrail(b);
        continue;
      }
      P.step(b, world, dt);
      b.idle += dt;
      if (b.idle > 9) {   // おなじ ところを ずっと まわって いたら すこし むきを かえる
        var a = Math.atan2(b.dy, b.dx) + (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.2);
        b.dx = Math.cos(a); b.dy = Math.sin(a); P.fixAngle(b); b.idle = 0;
      }
      pushTrail(b);
      if (fire && Math.random() < 0.7) FX.flame(b.x, b.y, C.fire);
    }
    for (i = g.balls.length - 1; i >= 0; i--) if (g.balls[i].dead) g.balls.splice(i, 1);
    if (!g.balls.length && !g.ended) { loseBall(); if (g.state !== "play") return; }

    for (i = g.booms.length - 1; i >= 0; i--) {
      g.booms[i].t -= dt;
      if (g.booms[i].t <= 0) { var e = g.booms.splice(i, 1)[0]; explode(e.x, e.y); }
    }
    updateShots(dt);
    for (i = 0; i < g.blocks.length; i++) if (g.blocks[i].flash > 0) g.blocks[i].flash -= dt;
    if (g.comboT > 0) { g.comboT -= dt; if (g.comboT <= 0) { g.combo = 0; g.mult = 1; } }
    FX.update(dt);
    updateTexts(dt);
    g.shake = Math.max(0, g.shake - dt * 18);

    if (!g.ended && !g.invincible && (g.boss ? g.boss.dead && g.boss.dieT > 1.4 : g.remain <= 0)) stageClear();
    if (g.ended) { g.clearT -= dt; if (g.clearT <= 0 && g.state === "play") showClear(); }
    hud();
  }

  function loseBall() {
    if (g.invincible) { newBall(); return; }
    g.lives--;
    g.combo = 0; g.mult = 1; g.comboT = 0;
    g.power = { w: 0, l: 0, f: 0, s: 0, c: 0 };
    g.shrink = 1; g.items = []; g.lasers = []; g.bullets = [];
    SND.lose(); addShake(4);
    if (g.lives <= 0) { gameOver(); return; }
    g.bar = easy();
    newBall();
    popText(W / 2, PADDLE_Y - 70, "あと " + g.lives + " かい", "#ffa8a8", true);
  }

  function stageClear() {
    g.ended = true; g.clearT = 1.3;
    g.balls.forEach(function (b) { FX.ring(b.x, b.y, 26, C.cyan, 0.4); FX.sparks(b.x, b.y, 8, C.cyan, 160); });
    g.balls = []; g.items = []; g.lasers = []; g.bullets = [];
    var bonus = g.lives * 100;
    g.score += bonus;
    for (var i = 0; i < 6; i++) {
      var x = 40 + Math.random() * (W - 80), y = 120 + Math.random() * 280;
      FX.ring(x, y, 50, COLOR_FX[i % 7], 0.9); FX.sparks(x, y, 30, COLOR_FX[(i + 3) % 7], 240);
    }
    g.texts.push({ x: W / 2, y: H * 0.5, text: "クリア！", col: "#ffe066", t: 1.3, max: 1.3, big: 1.6 });
    SND.clear();
    var n = g.no;
    save.done[n] = true;
    save.best[n] = Math.max(save.best[n] || 0, g.score - g.stageScore);
    save.unlocked = Math.max(save.unlocked, Math.min(40, n + 1));
    save.hi = Math.max(save.hi, g.score);
    store();
  }

  // ---------- えがく ----------
  function paintBlock(x, b, w, h) {
    if (b.type === "wall") {
      x.fillStyle = "#4a4560"; rr(x, 0.5, 0.5, w - 1, h - 1, 2); x.fill();
      x.strokeStyle = "#2b2740"; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(1, h / 2); x.lineTo(w - 1, h / 2);
      x.moveTo(w / 2, 1); x.lineTo(w / 2, h / 2); x.moveTo(w / 4, h / 2); x.lineTo(w / 4, h - 1); x.moveTo(w * 3 / 4, h / 2); x.lineTo(w * 3 / 4, h - 1);
      x.stroke();
      x.fillStyle = "rgba(255,255,255,0.18)"; x.fillRect(2, 1.5, w - 4, 1.5);
      return;
    }
    var base = b.type === "hard" ? (b.hp >= 3 ? "#748ba8" : b.hp === 2 ? "#91a7c0" : "#b4c4d6")
      : b.type === "bomb" ? "#e03131" : b.type === "ice" ? "#a5d8ff" : COLORS[b.col];
    var gr = x.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, shade(base, 0.4)); gr.addColorStop(0.5, base); gr.addColorStop(1, shade(base, -0.3));
    x.fillStyle = gr;
    if (b.type === "ice") x.globalAlpha = 0.88;
    rr(x, 1, 1, w - 2, h - 2, 4); x.fill();
    x.globalAlpha = 1;
    x.strokeStyle = shade(base, -0.45); x.lineWidth = 1; x.stroke();
    x.fillStyle = "rgba(255,255,255,0.45)"; rr(x, 4, 2.5, w - 8, 2.5, 1.2); x.fill();
    if (b.type === "hard") {
      x.fillStyle = "#e9ecef";
      [[4.5, 5], [w - 4.5, 5], [4.5, h - 4.5], [w - 4.5, h - 4.5]].forEach(function (p) { x.beginPath(); x.arc(p[0], p[1], 1.4, 0, 6.283); x.fill(); });
      if (b.hp < b.max) {
        x.strokeStyle = "#343a40"; x.lineWidth = 1.1; x.beginPath();
        x.moveTo(w * 0.45, 2); x.lineTo(w * 0.55, h * 0.45); x.lineTo(w * 0.4, h * 0.7); x.lineTo(w * 0.5, h - 2);
        if (b.max - b.hp >= 2) { x.moveTo(w * 0.55, h * 0.45); x.lineTo(w * 0.8, h * 0.6); x.moveTo(w * 0.2, h * 0.3); x.lineTo(w * 0.4, h * 0.7); }
        x.stroke();
      }
    } else if (b.type === "bomb") {
      x.fillStyle = "#212529"; x.beginPath(); x.arc(w / 2, h / 2 + 1, 5.2, 0, 6.283); x.fill();
      x.fillStyle = "rgba(255,255,255,0.5)"; x.beginPath(); x.arc(w / 2 - 1.8, h / 2 - 1, 1.4, 0, 6.283); x.fill();
      x.strokeStyle = "#f1f3f5"; x.lineWidth = 1.2; x.beginPath(); x.moveTo(w / 2 + 3, h / 2 - 3); x.quadraticCurveTo(w / 2 + 6, h / 2 - 7, w / 2 + 8, h / 2 - 5); x.stroke();
    } else if (b.type === "ice") {
      x.strokeStyle = "rgba(255,255,255,0.85)"; x.lineWidth = 1.3; x.beginPath();
      x.moveTo(6, h - 4); x.lineTo(12, 4); x.moveTo(11, h - 4); x.lineTo(15, 7); x.moveTo(w - 8, h - 3); x.lineTo(w - 5, h - 8);
      x.stroke();
    } else if (b.type === "mover") {
      x.fillStyle = "rgba(255,255,255,0.85)";
      x.beginPath(); x.moveTo(4, h / 2 + 1); x.lineTo(9, h / 2 - 3); x.lineTo(9, h / 2 + 5); x.fill();
      x.beginPath(); x.moveTo(w - 4, h / 2 + 1); x.lineTo(w - 9, h / 2 - 3); x.lineTo(w - 9, h / 2 + 5); x.fill();
    } else if (b.type === "item") {
      x.fillStyle = "#fff3bf"; x.strokeStyle = "#e67700"; x.lineWidth = 1;
      x.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.4 : 5.6;
        x.lineTo(w / 2 + Math.cos(a) * r, h / 2 + 1 + Math.sin(a) * r);
      }
      x.closePath(); x.fill(); x.stroke();
    }
  }
  function bgSprite() {
    var pal = BG[Math.floor((g.no - 1) / 10) % 4];
    return sprite("bg" + pal[0], W, H, function (x) {
      var gr = x.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, pal[1]); gr.addColorStop(1, pal[0]);
      x.fillStyle = gr; x.fillRect(0, 0, W, H);
      x.fillStyle = "rgba(255,255,255,0.05)";
      for (var yy = 8; yy < H; yy += 24) for (var xx = 8 + (yy / 24 % 2) * 12; xx < W; xx += 24) x.fillRect(xx, yy, 2, 2);
      x.fillStyle = "rgba(255,255,255,0.05)"; x.fillRect(0, PADDLE_Y + 22, W, H - PADDLE_Y - 22);
      x.fillStyle = "rgba(255,255,255,0.22)"; x.font = "bold 13px " + FONT; x.textAlign = "center";
      x.fillText("◀ ここを ゆびで よこに なぞる ▶", W / 2, PADDLE_Y + 50);
    });
  }

  function drawBoss() {
    var B = g.boss;
    if (!B || (B.dead && B.dieT > 1.4)) return;
    var art = BOSS_ART[B.kind], pal = BOSS_COL[B.kind], cw = B.w / 12, ch = B.h / 7;
    var ox = B.x + (B.flash > 0 ? Math.sin(g.t * 50) * 2 : 0), oy = B.y;
    ctx.globalAlpha = B.dead ? Math.max(0, 1 - B.dieT / 1.4) : 1;
    var pulse = 0.5 + 0.5 * Math.sin(g.t * 2 * Math.PI * 1.1);
    for (var r = 0; r < 7; r++) for (var c = 0; c < 12; c++) {
      var k = art[r][c];
      if (k === ".") continue;
      var x = ox + c * cw, y = oy + r * ch, hh = ch;
      var col = k === "b" ? pal.b : k === "d" ? pal.d : k === "h" || k === "k" ? pal.h : k === "e" ? "#fff" : k === "t" ? "#f8f9fa" : null;
      if (k === "m") col = B.mouth > 0 ? "#ff8fa3" : pulse > 0.5 ? "#e64980" : "#c2255c";
      if (B.flash > 0 && (k === "b" || k === "d")) col = pal.hit;
      if (k === "h" && B.kind === 2) { var f = 0.6 + 0.4 * Math.sin(g.t * 9 + c); y += ch * (1 - f); hh = ch * f; }
      ctx.fillStyle = col; ctx.fillRect(x + 0.5, y + 0.5, cw - 1, hh - 1);
      if (k === "b" || k === "d") { ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(x + 1.5, y + 1.5, cw - 3, 2); }
    }
    // め: いちばん ちかい ボールを みる
    var tb = null, td = 1e9;
    for (var i = 0; i < g.balls.length; i++) { var d = Math.abs(g.balls[i].x - (B.x + B.w / 2)) + Math.abs(g.balls[i].y - B.y); if (d < td) { td = d; tb = g.balls[i]; } }
    ctx.fillStyle = "#212529";
    B.eyes.forEach(function (e) {
      var ex = ox + e[0] * B.w, ey = oy + e[1] * B.h, dx = 0, dy = 3;
      if (tb) { var a = Math.atan2(tb.y - ey, tb.x - ex); dx = Math.cos(a) * 3.5; dy = Math.sin(a) * 3.5; }
      ctx.beginPath(); ctx.arc(ex + dx, ey + dy, ch * 0.5, 0, 6.283); ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (B.dead) return;
    // じゃくてんの めじるし
    if (g.t < 5) {
      ctx.fillStyle = "rgba(255,240,150," + (0.6 + 0.3 * pulse) + ")";
      ctx.font = "bold 12px " + FONT; ctx.textAlign = "center";
      ctx.fillText("▲ くちが じゃくてん！", B.x + B.w / 2, B.y + B.h + 18);
    }
    // たいりょく
    ctx.fillStyle = "rgba(0,0,0,0.45)"; rr(ctx, 40, 10, W - 80, 16, 8); ctx.fill();
    var p = B.hp / B.max;
    ctx.fillStyle = p > 0.5 ? "#ff6b6b" : p > 0.25 ? "#ffa94d" : "#ffd43b";
    if (p > 0) { rr(ctx, 42, 12, (W - 84) * p, 12, 6); ctx.fill(); }
    ctx.fillStyle = "#fff"; ctx.font = "bold 11px " + FONT; ctx.textAlign = "center";
    ctx.fillText("👾 " + B.name, W / 2, 22);
  }

  function drawPaddle() {
    var w = g.paddle.w, x = g.paddle.x - w / 2, y = PADDLE_Y;
    if (g.power.l > 0) {
      ctx.fillStyle = "#fcc419";
      ctx.fillRect(x + 3, y - 6, 6, 8); ctx.fillRect(x + w - 9, y - 6, 6, 8);
    }
    var gr = ctx.createLinearGradient(0, y, 0, y + PADDLE_H);
    var c1 = g.power.c > 0 ? "#e599f7" : g.power.f > 0 ? "#ffc078" : "#99e9f2";
    var c2 = g.power.c > 0 ? "#9c36b5" : g.power.f > 0 ? "#e8590c" : "#1c7ed6";
    gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    ctx.fillStyle = gr; rr(ctx, x, y, w, PADDLE_H, 6); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)"; rr(ctx, x + 6, y + 2, w - 12, 3, 1.5); ctx.fill();
    ctx.fillStyle = "#ffd43b"; ctx.fillRect(x + 2, y + 3, 3, PADDLE_H - 6); ctx.fillRect(x + w - 5, y + 3, 3, PADDLE_H - 6);
    if (world.bar) {
      ctx.globalAlpha = 0.65 + 0.25 * Math.sin(g.t * 3);
      ctx.fillStyle = "#69db7c"; rr(ctx, 6, BAR_Y, W - 12, 5, 2.5); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawBalls() {
    var i, j, b;
    for (i = 0; i < g.balls.length; i++) {
      b = g.balls[i];
      ctx.fillStyle = b.fire ? "#ff922b" : "#a5d8ff";
      for (j = 0; j < b.tn; j++) {
        var idx = (b.th - b.tn + j + TRAIL) % TRAIL, t = (j + 1) / (b.tn + 1);
        ctx.globalAlpha = t * 0.35;
        ctx.beginPath(); ctx.arc(b.tx[idx], b.ty[idx], b.r * (0.35 + 0.6 * t), 0, 6.283); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < g.balls.length; i++) {
      b = g.balls[i];
      ctx.fillStyle = b.fire ? "#ffd8a8" : "#ffffff";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill();
      ctx.fillStyle = b.fire ? "#ff6b00" : "#74c0fc";
      ctx.beginPath(); ctx.arc(b.x + 1.5, b.y + 1.5, b.r * 0.55, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.x - 2, b.y - 2, 1.6, 0, 6.283); ctx.fill();
      if (b.stuck) {
        var off = b.stuckOff / (g.paddle.w / 2);
        if (g.power.c <= 0 && Math.abs(off) < 0.12) continue;
        var a = Math.max(-1, Math.min(1, off)) * P.PADDLE_MAX * (g.power.c > 0 ? 0.85 : 0.85), dx = Math.sin(a), dy = -Math.cos(a);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        for (j = 1; j <= 8; j++) { ctx.beginPath(); ctx.arc(b.x + dx * j * 16, b.y + dy * j * 16, 2, 0, 6.283); ctx.fill(); }
      }
    }
  }

  function drawUI() {
    var i;
    for (i = 0; i < g.items.length; i++) {
      var it = g.items[i], d = ITEM[it.k], wob = Math.sin(it.t * 6) * 1.5;
      ctx.fillStyle = d.col; rr(ctx, it.x - 15, it.y - 8 + wob, 30, 16, 8); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "bold 11px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(d.icon, it.x, it.y + wob + 0.5);
    }
    ctx.textBaseline = "alphabetic";
    for (i = 0; i < g.lasers.length; i++) {
      var L = g.lasers[i];
      ctx.fillStyle = "#fcc419"; ctx.fillRect(L.x - 2, L.y - 12, 4, 14);
      ctx.fillStyle = "#fff9db"; ctx.fillRect(L.x - 0.8, L.y - 11, 1.6, 12);
    }
    for (i = 0; i < g.bullets.length; i++) {
      var u = g.bullets[i];
      ctx.fillStyle = "#ff6b6b"; ctx.beginPath(); ctx.arc(u.x, u.y, 6, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#ffe066"; ctx.beginPath(); ctx.arc(u.x, u.y, 3, 0, 6.283); ctx.fill();
    }
    // パワーアップの のこり じかん
    var px = 10;
    POWER_ORDER.forEach(function (k) {
      if (g.power[k] <= 0) return;
      var d = ITEM[k], p = g.power[k] / POWER_TIME[k];
      ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.arc(px + 13, H - 18, 13, 0, 6.283); ctx.fill();
      ctx.strokeStyle = d.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + 13, H - 18, 12, -Math.PI / 2, -Math.PI / 2 + 6.283 * p); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "bold 11px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(d.icon, px + 13, H - 17.5);
      px += 32;
    });
    ctx.textBaseline = "alphabetic";
    if (g.combo >= 3) {
      ctx.fillStyle = "rgba(255,224,102,0.9)"; ctx.font = "bold 14px " + FONT; ctx.textAlign = "right";
      ctx.fillText(g.combo + " コンボ  ×" + g.mult, W - 10, H - 12);
    }
    if (!g.ended && g.balls.some(function (b) { return b.stuck; })) {
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(g.t * 4);
      ctx.fillStyle = "#fff"; ctx.font = "bold 18px " + FONT; ctx.textAlign = "center";
      ctx.fillText(g.power.c > 0 ? "ねらって タップ！" : "タップで はっしゃ！", W / 2, PADDLE_Y - 64);
      ctx.globalAlpha = 1;
    }
    for (i = 0; i < g.texts.length; i++) {
      var t = g.texts[i], age = 1 - t.t / t.max;
      ctx.globalAlpha = Math.min(1, t.t / (t.max * 0.35));
      var size = t.big ? 22 * t.big * (age < 0.15 ? 0.6 + age / 0.15 * 0.4 : 1) : 11;
      ctx.font = "bold " + Math.round(size) + "px " + FONT; ctx.textAlign = "center";
      if (t.big) { ctx.lineWidth = Math.max(3, size / 7); ctx.strokeStyle = "rgba(40,10,60,0.85)"; ctx.strokeText(t.text, t.x, t.y); }
      ctx.fillStyle = t.col; ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    if (g.banner) {
      var bt = g.banner.t, a = Math.min(1, bt / 0.5, (2.4 - bt) / 0.3);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = "rgba(20,8,45,0.7)"; rr(ctx, 40, H * 0.55 - 34, W - 80, 66, 16); ctx.fill();
      ctx.fillStyle = "#ffe066"; ctx.font = "bold 26px " + FONT; ctx.textAlign = "center";
      ctx.fillText(g.banner.text, W / 2, H * 0.55 - 4);
      ctx.fillStyle = "#fff"; ctx.font = "bold 16px " + FONT;
      ctx.fillText(g.banner.sub, W / 2, H * 0.55 + 20);
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    if (!g.st || g.state === "menu") return;
    var k = scale * dpr, sx = 0, sy = 0;
    if (g.shake > 0 && save.set.shake) { sx = (Math.random() - 0.5) * 2 * g.shake; sy = (Math.random() - 0.5) * 2 * g.shake; }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.fillStyle = BG[Math.floor((g.no - 1) / 10) % 4][0]; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(k, 0, 0, k, sx * k, sy * k);
    ctx.drawImage(bgSprite(), 0, 0, W, H);
    for (var i = 0; i < g.blocks.length; i++) {
      var b = g.blocks[i];
      if (b.dead) continue;
      var key = b.type + b.col + "_" + b.hp;
      ctx.drawImage(sprite(key, CW, CH, function (x, w, h) { paintBlock(x, b, w, h); }), b.x, b.y, b.w, b.h);
      if (b.flash > 0) { ctx.fillStyle = "rgba(255,255,255," + Math.min(0.6, b.flash * 5) + ")"; ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2); }
      if (b.type === "bomb" && Math.sin(g.t * 8 + b.c) > 0) { ctx.fillStyle = "#ffd43b"; ctx.fillRect(b.x + b.w / 2 + 7, b.y + b.h / 2 - 7, 2.5, 2.5); }
    }
    drawBoss();
    drawPaddle();
    drawBalls();
    FX.draw(ctx);
    drawUI();
  }

  // ---------- HUD・がめん きりかえ ----------
  var hudCache = "";
  function hud() {
    var s = g.no + "|" + g.score + "|" + g.lives;
    if (s === hudCache) return;
    hudCache = s;
    $("hudStage").textContent = g.no;
    $("hudScore").textContent = g.score;
    $("hudLives").textContent = g.lives > 4 ? "❤️×" + g.lives : "❤️".repeat(Math.max(0, g.lives)) || "0";
  }

  var SCREENS = ["scTitle", "scSelect", "scSettings", "ovPause", "ovClear", "ovOver"];
  function show(id) {
    SCREENS.forEach(function (s) { $(s).hidden = s !== id; });
  }
  function toMenu(id) {
    g.state = "menu";
    document.body.classList.remove("playing");
    $("hud").hidden = true;
    SND.forget();
    if (id === "scTitle") renderTitle();
    if (id === "scSelect") renderSelect();
    if (id === "scSettings") renderSettings();
    show(id);
  }
  function startStage(n, fresh) {
    if (fresh) { g.score = 0; g.lives = 3; }
    show(null);
    $("hud").hidden = false;
    document.body.classList.add("playing");
    resize();
    loadStage(n);
    g.state = "play"; hudCache = ""; hud();
    lastT = performance.now();
  }
  function pause() {
    if (g.state !== "play") return;
    g.state = "pause"; SND.pauseBgm(); renderSettings(); show("ovPause");
  }
  function resume() {
    show(null); g.state = "play"; lastT = performance.now(); SND.resumeBgm();
  }
  function showClear() {
    g.state = "clear";
    SND.forget();
    var last = g.no >= 40;
    $("clearTitle").textContent = last ? "ぜんぶ クリア！ おめでとう！" : (g.boss ? "ボスを たおした！" : "ステージ " + g.no + " クリア！");
    $("clearScore").textContent = g.score;
    $("clearNote").textContent = "のこり ライフ ボーナス +" + g.lives * 100 + (save.hi === g.score ? " ・ ハイスコア こうしん！" : "");
    $("btnNext").textContent = last ? "🏠 タイトルへ" : "つぎへ ▶";
    show("ovClear");
  }
  function gameOver() {
    g.state = "over";
    SND.forget(); SND.over();
    var newHi = g.score > save.hi;
    save.hi = Math.max(save.hi, g.score); store();
    $("overScore").textContent = g.score;
    $("overNote").textContent = (newHi ? "ハイスコア こうしん！ " : "") + "ステージ " + g.no + "「" + g.st.name + "」";
    show("ovOver");
  }

  function renderTitle() {
    $("titleHi").textContent = save.hi;
    var cleared = Object.keys(save.done).length;
    $("titleProg").textContent = cleared ? "クリア " + cleared + " / 40" : "ステージ 1 から";
    $("btnPlay").textContent = save.unlocked > 1 ? "▶ つづきから（ステージ " + save.unlocked + "）" : "▶ あそぶ";
  }
  function renderSelect() {
    var box = $("stageGrid");
    box.innerHTML = "";
    S.STAGES.forEach(function (st, i) {
      var n = i + 1, b = document.createElement("button");
      b.type = "button";
      b.className = "stage-btn" + (st.boss ? " boss" : "") + (save.done[n] ? " done" : "");
      b.disabled = n > save.unlocked;
      b.innerHTML = (st.boss ? "👾" : "") + n + "<small>" + (b.disabled ? "🔒" : save.done[n] ? "★" : "") + "</small>";
      b.setAttribute("aria-label", "ステージ " + n + " " + st.name);
      b.addEventListener("click", function () { SND.unlock(); startStage(n, true); });
      box.appendChild(b);
    });
  }
  function renderSettings() {
    var map = { tgSfx: "sfx", tgSfx2: "sfx", tgBgm: "bgm", tgShake: "shake", tgEasy: "easy" };
    Object.keys(map).forEach(function (id) { $(id).setAttribute("aria-pressed", save.set[map[id]] ? "true" : "false"); });
  }
  function toggle(name) {
    save.set[name] = !save.set[name]; store();
    SND.setSfx(save.set.sfx); SND.setBgm(save.set.bgm);
    renderSettings();
  }

  $("btnPlay").addEventListener("click", function () { SND.unlock(); startStage(save.unlocked, true); });
  $("btnSelect").addEventListener("click", function () { toMenu("scSelect"); });
  $("btnSettings").addEventListener("click", function () { toMenu("scSettings"); });
  document.querySelectorAll("[data-go]").forEach(function (b) { b.addEventListener("click", function () { toMenu("sc" + b.dataset.go[0].toUpperCase() + b.dataset.go.slice(1)); }); });
  $("tgSfx").addEventListener("click", function () { toggle("sfx"); });
  $("tgSfx2").addEventListener("click", function () { toggle("sfx"); });
  $("tgBgm").addEventListener("click", function () { SND.unlock(); toggle("bgm"); SND.stopBgm(); });
  $("tgShake").addEventListener("click", function () { toggle("shake"); });
  $("tgEasy").addEventListener("click", function () { toggle("easy"); });
  $("btnPause").addEventListener("click", pause);
  $("btnResume").addEventListener("click", resume);
  $("btnRetry").addEventListener("click", function () { g.score = g.stageScore; startStage(g.no, false); });
  $("btnQuit").addEventListener("click", function () { toMenu("scTitle"); });
  $("btnNext").addEventListener("click", function () { if (g.no >= 40) toMenu("scTitle"); else startStage(g.no + 1, false); });
  $("btnClearSelect").addEventListener("click", function () { toMenu("scSelect"); });
  $("btnAgain").addEventListener("click", function () { startStage(g.no, true); });
  $("btnOverTitle").addEventListener("click", function () { toMenu("scTitle"); });

  // ---------- そうさ ----------
  var downs = {};
  function aimTo(clientX) {
    var r = cv.getBoundingClientRect();
    g.targetX = (clientX - r.left) / r.width * W;
  }
  function tap() {
    if (g.state !== "play" || g.ended) return;
    var any = false;
    g.balls.forEach(function (b) { if (b.stuck) { launch(b); any = true; } });
    if (!any && g.power.l > 0 && g.laserCd <= 0) fireLaser();
  }
  playEl.addEventListener("pointerdown", function (e) {
    if (g.state !== "play") return;
    SND.unlock();
    if (e.cancelable) e.preventDefault();
    try { playEl.setPointerCapture(e.pointerId); } catch (err) { /* むし */ }
    downs[e.pointerId] = { x: e.clientX, y: e.clientY, t: performance.now() };
    aimTo(e.clientX);
  });
  playEl.addEventListener("pointermove", function (e) {
    if (g.state !== "play") return;
    var d = downs[e.pointerId];
    if (d || e.pointerType === "mouse") aimTo(e.clientX);
    if (d) d.moved = Math.max(d.moved || 0, Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y));
  });
  function up(e) {
    var d = downs[e.pointerId];
    delete downs[e.pointerId];
    if (e.type === "pointerup" && d && performance.now() - d.t < 350 && (d.moved || 0) < 16) tap();
  }
  playEl.addEventListener("pointerup", up);
  playEl.addEventListener("pointercancel", up);
  playEl.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  document.addEventListener("touchmove", function (e) { if (g.state === "play" && e.cancelable) e.preventDefault(); }, { passive: false });
  window.addEventListener("keydown", function (e) {
    if (g.state === "play") {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { keys[e.key] = true; e.preventDefault(); }
      else if (e.key === " " || e.key === "ArrowUp") { SND.unlock(); tap(); e.preventDefault(); }
      else if (e.key === "Escape" || e.key === "p") pause();
    } else if (g.state === "pause" && (e.key === "Escape" || e.key === "p")) resume();
  });
  window.addEventListener("keyup", function (e) { keys[e.key] = false; });
  document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); });

  // ---------- ループ ----------
  var lastT = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.033, Math.max(0, (t - lastT) / 1000));
    lastT = t;
    if (g.state === "play") update(dt);
    else if (g.state === "clear" || g.state === "over") { FX.update(dt); updateTexts(dt); }
    draw();
  }

  resize();
  toMenu("scTitle");
  requestAnimationFrame(frame);

  // テスト・しらべもの よう
  window.__bk = {
    g: g, save: save, S: S,
    start: function (n) { startStage(n, true); },
    launchAll: function () { g.balls.forEach(function (b) { if (b.stuck) launch(b); }); },
    give: function (k) { collect(k, g.paddle.x); },
    bench: function (frames) {
      g.invincible = true;
      g.balls.forEach(function (b) { if (b.stuck) launch(b); });
      while (g.balls.length < MAX_BALLS) cloneBall(g.balls[0], (Math.random() - 0.5) * 2);
      var t0 = performance.now(), worst = 0, pmax = 0;
      for (var i = 0; i < frames; i++) {
        while (FX.count() < 990) FX.shards(Math.random() * W, 200 + Math.random() * 300, 50, COLOR_FX[i % 7], 200);
        while (g.balls.length < MAX_BALLS) cloneBall(g.balls[0] || newBall(), 0.3);
        var a = performance.now();
        update(1 / 60); draw();
        worst = Math.max(worst, performance.now() - a);
        pmax = Math.max(pmax, FX.count());
      }
      var avg = (performance.now() - t0) / frames;
      g.invincible = false;
      return { avg: avg, worst: worst, balls: g.balls.length, particles: pmax };
    }
  };
})();
