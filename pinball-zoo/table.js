/* ============================================================
   ころころ ピンボール どうぶつえん — だい（テーブル）と ルール（DOM なし）
   だい の おおきさ は 400×700（y は した むき）。
   ============================================================ */
(function (root) {
  "use strict";
  var P = (typeof module !== "undefined" && module.exports) ? require("./physics.js") : root.PZPhysics;

  var W = 400, H = 700, BALL_R = 9;
  var ARC = { x: 206, y: 200, r: 186 };          // うえ の まるい かべ
  var LANE = { x0: 356, x1: 392, floor: 686, top: 212, cx: 374 };   // うちだし レーン
  var FL = { lx: 128, rx: 272, y: 622, len: 60, rest: 0.5, up: -0.45 };

  /* どうぶつ。need は「おきる」まで に あてる かず */
  var ANIMALS = [
    { id: "elephant", name: "ゾウ", emoji: "🐘", need: 3, how: "はな に ボール を いれる", call: "パオーン！" },
    { id: "giraffe", name: "キリン", emoji: "🦒", need: 2, how: "くび の レール を のぼる", call: "ふんふん♪" },
    { id: "penguin", name: "ペンギン", emoji: "🐧", need: 3, how: "こおり の ループ を くぐる", call: "ペンペン！" },
    { id: "monkey", name: "サル", emoji: "🐒", need: 4, how: "ぶらんこ に あてる", call: "ウキキッ！" },
    { id: "lion", name: "ライオン", emoji: "🦁", need: 3, how: "おり に あてる", call: "がおー！" },
    { id: "turtle", name: "カメ", emoji: "🐢", need: 1, how: "おちる ボール を うけとめて もらう", call: "のっそり〜" }
  ];
  var NIGHT_ANIMALS = [
    { id: "owl", name: "フクロウ", emoji: "🦉", need: 3, how: "えだ の フクロウ に あてる", call: "ホーホー" },
    { id: "bat", name: "コウモリ", emoji: "🦇", need: 3, how: "とびまわる コウモリ に あてる", call: "キキッ" }
  ];

  var SCORE = {
    bumper: 100, monkey: 200, lion: 300, elephant: 500, penguin: 800, giraffe: 1000,
    turtle: 500, owl: 400, bat: 400, wake: 5000, stage: 20000, parade: 50000
  };

  /* ---------- すうじ を ひらがな の よみ に ---------- */
  var DIG = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];
  function yomi4(n) {   // 0〜9999
    var s = "", th = Math.floor(n / 1000), hu = Math.floor(n / 100) % 10, te = Math.floor(n / 10) % 10, on = n % 10;
    if (th) s += ({ 1: "せん", 3: "さんぜん", 8: "はっせん" })[th] || DIG[th] + "せん";
    if (hu) s += ({ 1: "ひゃく", 3: "さんびゃく", 6: "ろっぴゃく", 8: "はっぴゃく" })[hu] || DIG[hu] + "ひゃく";
    if (te) s += (te === 1 ? "" : DIG[te]) + "じゅう";
    if (on) s += DIG[on];
    return s;
  }
  function yomi(n) {
    n = Math.max(0, Math.floor(n));
    if (n === 0) return "ぜろ";
    var units = ["", "まん", "おく", "ちょう"], parts = [], i = 0;
    while (n > 0 && i < units.length) {
      var q = n % 10000;
      if (q) {
        var w = yomi4(q);
        if (i > 0 && q === 1) w = "いち";                 // いちまん・いちおく
        if (i > 0 && q % 1000 === 0 && Math.floor(q / 1000) === 1) w = "いっせん";   // いっせんまん
        if (i === 3 && q % 10 === 1 && q % 100 !== 11) w = w.replace(/いち$/, "いっ");  // いっちょう
        if (i === 3 && q % 10 === 8) w = w.replace(/はち$/, "はっ");
        if (i === 3 && q % 100 === 10) w = w.replace(/じゅう$/, "じゅっ");
        parts.unshift(w + units[i]);
      }
      n = Math.floor(n / 10000); i++;
    }
    return parts.join(" ");
  }

  /* ---------- だい の なか か ---------- */
  function insideTable(x, y, r) {
    r = r || 0;
    if (y > H + 40) return true;              // した に おちた（ドレイン）は べつ あつかい
    if (y > FL.y + 12 && x > 20 && x < LANE.x0) return true;   // フリッパー より した は おちる だけ
    if (y < ARC.y) return Math.hypot(x - ARC.x, y - ARC.y) <= ARC.r - r + 1.5;
    if (x < 20 + r - 1.5 || x > LANE.x1 - r + 1.5) return false;
    // ひだり の ガイド の した（はいれない ところ）
    if (x < FL.lx && y > 545) {
      var yl = 545 + (x - 20) * (616 - 545) / (124 - 20);
      if (y > yl + 2 && y < H) return false;
    }
    // みぎ の ガイド の した（レーン との あいだ）
    if (x > FL.rx && x < LANE.x0 - 1 && y > 545) {
      var yr = 545 + (LANE.x0 - x) * (616 - 545) / (LANE.x0 - 276);
      if (y > yr + 2 && y < H) return false;
    }
    if (x > LANE.x0 - r + 1.5 && x < LANE.x0 + r - 1.5 && y > LANE.top + r) return false;   // レーン の かべ を またいで いる
    if (x > LANE.x0 && y > LANE.floor - r + 1.5) return false;
    return true;
  }

  /* ---------- だい を くみたてる ---------- */
  function build(world) {
    var arc = [], N = 28;
    for (var i = 0; i <= N; i++) {
      var a = Math.PI + Math.PI * i / N;
      arc.push([ARC.x + ARC.r * Math.cos(a), ARC.y + ARC.r * Math.sin(a)]);
    }
    arc[0] = [20, ARC.y]; arc[N] = [LANE.x1, ARC.y];
    world.addPoly(arc, { e: 0.4 });
    world.addPoly([[20, ARC.y], [20, 545], [124, 616]], { e: 0.4 });                    // ひだり の かべ と ガイド
    world.addPoly([[LANE.x0, LANE.top], [LANE.x0, 545], [276, 616]], { e: 0.4 });       // みぎ の かべ と ガイド
    world.addSeg(LANE.x0, 545, LANE.x0, H + 40, { e: 0.3 });                             // レーン の うちがわ（した まで）
    world.addSeg(20, 545, 20, H + 40, { e: 0.3 });                                        // ひだり の いちばん した
    world.addSeg(LANE.x1, ARC.y, LANE.x1, LANE.floor + 4, { e: 0.3 });                   // そとがわ
    world.addSeg(LANE.x0, LANE.floor, LANE.x1, LANE.floor, { e: 0.1 });                  // ばね の うえ
    world.addSeg(LANE.x1, 190, LANE.x0, 214, { e: 0.3, oneWay: [-0.5, -1] });            // レーン の ふた（うえ から は はいれない）
    var fl = {
      left: world.addFlipper({ px: FL.lx, py: FL.y, len: FL.len, rest: FL.rest, up: FL.up, side: "left" }),
      right: world.addFlipper({ px: FL.rx, py: FL.y, len: FL.len, rest: Math.PI - FL.rest, up: Math.PI - FL.up, side: "right" })
    };
    return fl;
  }

  /* ---------- ゲーム ---------- */
  function Game(opt) {
    opt = opt || {};
    this.mode = opt.mode === "normal" ? "normal" : "easy";
    this.rand = opt.rand || Math.random;
    this.listeners = [];
    this.reset();
  }

  Game.prototype.on = function (fn) { this.listeners.push(fn); };
  Game.prototype.emit = function (type, data) {
    var ev = data || {}; ev.type = type;
    for (var i = 0; i < this.listeners.length; i++) this.listeners[i](ev);
  };

  Game.prototype.reset = function () {
    var easy = this.mode === "easy";
    var w = this.world = new P.World({ g: easy ? 800 : 1000, bounds: [-30, -30, W + 30, H + 60] });
    this.fl = build(w);
    this.cfg = {
      saver: easy ? 30 : 6,
      turtleEvery: easy ? 14 : 28, turtleStay: easy ? 11 : 7
    };
    // バンパー（えさ）
    this.bumpers = [
      w.addCircle(145, 250, 17, { e: 0.8, kick: 330, id: "bumper" }),
      w.addCircle(255, 250, 17, { e: 0.8, kick: 330, id: "bumper" }),
      w.addCircle(200, 305, 17, { e: 0.8, kick: 330, id: "bumper" })
    ];
    this.bumpers[0].food = "🍎"; this.bumpers[1].food = "🍌"; this.bumpers[2].food = "🍉";
    var self = this;
    // 🐒 サル の ぶらんこ（ゆれる バンパー）
    this.swing = { px: 200, py: 26, len: 100 };
    this.monkey = w.addCircle(200, 126, 16, { e: 0.9, kick: 260, id: "monkey", path: function (t) {
      var a = 0.55 * Math.sin(1.7 * t);
      self.swing.a = a;
      return [self.swing.px + Math.sin(a) * self.swing.len, self.swing.py + Math.cos(a) * self.swing.len];
    } });
    // 🦁 ライオン の おり
    this.lion = w.addCircle(200, 405, 22, { e: 0.7, kick: 160, id: "lion" });
    // 🐘 ゾウ（からだ は かべ、はな は センサー）
    this.elephantBody = w.addCircle(332, 432, 22, { e: 0.5, id: "elephantBody" });
    w.addSeg(LANE.x0, 397, 318, 413, { e: 0.4 });          // ゾウ の せなか（かべ との すきま に はさまらない）
    this.trunk = w.addSensor(304, 478, 13, "elephant");
    // 🦒 キリン（からだ は かべ、くび の した が レール の いりぐち）
    this.giraffeBody = w.addCircle(44, 385, 22, { e: 0.5, id: "giraffeBody" });
    w.addSeg(20, 358, 60, 373, { e: 0.4 });                // キリン の せなか
    this.neck = w.addSensor(86, 322, 15, "giraffe");
    // 🐧 ペンギン の こおり ループ の いりぐち
    this.loopC = { x: 300, y: 165, r: 34 };
    this.loopIn = w.addSensor(318, 262, 15, "penguin");
    // 🐢 カメ（ときどき でる）
    this.turtle = w.addCircle(200, 678, 18, { e: 0.2, id: "turtle", active: false });
    // よる だけ
    this.owl = w.addCircle(118, 188, 15, { e: 0.8, kick: 220, id: "owl", active: false });
    this.bat = w.addCircle(200, 360, 14, { e: 0.9, kick: 240, id: "bat", active: false, path: function (t) {
      return [200 + 112 * Math.sin(1.05 * t), 358 + 12 * Math.sin(3.1 * t)];
    } });

    this.score = 0; this.ballsLeft = 3; this.round = 1;
    this.phase = "ready";     // ready（まだ うって いない）/ play / parade / over
    this.night = false;
    this.animals = ANIMALS.map(function (a) { return { id: a.id, need: a.need, hits: 0, awake: false }; });
    this.nightAnimals = NIGHT_ANIMALS.map(function (a) { return { id: a.id, need: a.need, hits: 0, awake: false }; });
    this.penguins = 0;
    this.lionCount = 0;      // おきた あと、つぎ の マルチボール まで の かず
    this.saverUntil = -1; this.saverArmed = true;
    this.turtleState = { on: false, until: 0, next: this.cfg.turtleEvery };
    this.pull = 0; this.pulling = false;
    this.time = 0;
    this.paradeT = 0;
    this.anim = { elephant: 0, giraffe: 0, lion: 0, owl: 0 };
    this.flash = new Map();
    this.newBall();
  };

  Game.prototype.newBall = function () {
    var b = this.world.addBall(LANE.cx, LANE.floor - BALL_R - 0.5, 0, 0, BALL_R);
    b.sens = {};
    return b;
  };

  Game.prototype.list = function () { return this.night ? this.nightAnimals : this.animals; };
  Game.prototype.findAnimal = function (id) {
    var all = this.animals.concat(this.nightAnimals);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  };

  /* うちだし まち の ボール（レーン の した で とまっている） */
  Game.prototype.readyBall = function () {
    var bs = this.world.balls;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (!b.rail && b.x > LANE.x0 && b.y > LANE.floor - 60 && Math.abs(b.vy) < 40) return b;
    }
    return null;
  };
  /* だい の うえで うごいて いる ボール の かず（レーン の ボール は かぞえない） */
  Game.prototype.liveCount = function () {
    var n = 0, bs = this.world.balls;
    for (var i = 0; i < bs.length; i++) if (!bs[i].out && !(bs[i].x > LANE.x0 && bs[i].y > LANE.floor - 60 && !bs[i].rail)) n++;
    return n;
  };

  Game.prototype.setFlipper = function (side, on) {
    var f = this.fl[side];
    if (!f || this.phase === "over" || this.phase === "parade") { if (f) f.pressed = false; return; }
    if (on && !f.pressed) this.emit("flip", { side: side });
    f.pressed = !!on;
  };
  Game.prototype.setPull = function (v) {
    if (this.phase === "over" || this.phase === "parade") return;
    this.pulling = true; this.pull = Math.max(0, Math.min(1, v));
  };
  Game.prototype.release = function () {
    if (!this.pulling) return false;
    var p = this.pull; this.pulling = false; this.pull = 0;
    var b = this.readyBall();
    if (!b) return false;
    b.vy = -(1150 + 600 * Math.max(0.1, p));
    b.vx = 0;
    if (this.phase === "ready") this.phase = "play";
    if (this.saverArmed) { this.saverUntil = this.time + this.cfg.saver; this.saverArmed = false; }
    this.emit("launch", { power: p });
    return true;
  };

  Game.prototype.add = function (pts, x, y) {
    var mul = this.night ? 2 : 1;
    pts *= mul;
    this.score += pts;
    this.emit("score", { pts: pts, x: x, y: y });
  };

  Game.prototype.hitAnimal = function (id, x, y) {
    var a = this.findAnimal(id);
    if (!a) return;
    this.emit("animal", { id: id, x: x, y: y });
    if (a.awake) return;
    a.hits++;
    if (a.hits >= a.need) {
      a.awake = true;
      this.add(SCORE.wake, x, y);
      this.emit("wake", { id: id, x: x, y: y });
      if (id === "lion") this.multiball();
      this.checkClear();
    }
  };

  Game.prototype.multiball = function () {
    var w = this.world, n = 0;
    for (var i = 0; i < 2; i++) {
      var b = w.addBall(200 + (i ? 26 : -26), 368, (i ? 1 : -1) * (180 + 120 * this.rand()), -520 - 200 * this.rand(), BALL_R);
      b.sens = {}; n++;
    }
    this.lionCount = 0;
    this.emit("multiball", { n: n + 1 });
  };

  Game.prototype.checkClear = function () {
    var list = this.list();
    for (var i = 0; i < list.length; i++) if (!list[i].awake) return;
    if (!this.night) {
      this.add(SCORE.stage * this.round, 200, 300);
      this.night = true;
      this.owl.active = true; this.bat.active = true;
      this.emit("night", {});
    } else {
      this.add(SCORE.parade * this.round, 200, 300);
      this.phase = "parade"; this.paradeT = 0;
      this.fl.left.pressed = this.fl.right.pressed = false;
      this.emit("parade", {});
    }
  };

  Game.prototype.endParade = function () {
    this.round++;
    this.night = false;
    this.owl.active = false; this.bat.active = false;
    var extra = this.round - 1;
    this.animals.forEach(function (a, i) { a.hits = 0; a.awake = false; a.need = ANIMALS[i].need + (ANIMALS[i].id === "turtle" ? 0 : extra); });
    this.nightAnimals.forEach(function (a, i) { a.hits = 0; a.awake = false; a.need = NIGHT_ANIMALS[i].need + extra; });
    this.penguins = 0;
    this.world.balls.length = 0;
    this.ballsLeft++;
    this.saverArmed = true;
    this.phase = "play";
    this.newBall();
    this.emit("round", { round: this.round });
  };

  /* ボール を レール に のせる。pts は とおる てん、v は さいご の はやさ */
  function setRail(b, pts, speed, vx, vy, kind, hold) {
    b.rail = { pts: pts, i: 0, speed: speed, vx: vx, vy: vy, kind: kind, hold: hold || 0 };
    b.x = pts[0][0]; b.y = pts[0][1];
  }

  Game.prototype.stepRail = function (b, dt) {
    var r = b.rail;
    if (r.hold > 0) { r.hold -= dt; return; }
    var left = r.speed * dt;
    while (left > 0 && r.i < r.pts.length - 1) {
      var q = r.pts[r.i + 1], dx = q[0] - b.x, dy = q[1] - b.y, d = Math.hypot(dx, dy);
      if (d <= left) { b.x = q[0]; b.y = q[1]; r.i++; left -= d; if (r.onPoint) r.onPoint(r.i); }
      else { b.x += dx / d * left; b.y += dy / d * left; left = 0; }
    }
    if (r.i >= r.pts.length - 1) {
      b.vx = r.vx; b.vy = r.vy; b.rail = null;
      this.emit("railEnd", { kind: r.kind });
    }
  };

  Game.prototype.onSensor = function (s, b) {
    var t = this.time;
    if (b.sens[s.id] && t - b.sens[s.id] < 0.6) { b.sens[s.id] = t; return; }
    b.sens[s.id] = t;
    if (s.id === "elephant") {
      this.anim.elephant = 1;
      setRail(b, [[s.x, s.y], [306, 462], [312, 446]], 260, -250 - 60 * this.rand(), -980, "elephant", 0.18);
      this.add(SCORE.elephant, s.x, s.y);
      this.hitAnimal("elephant", s.x, s.y);
    } else if (s.id === "giraffe") {
      if (b.vy > -120) return;
      this.anim.giraffe = 1;
      setRail(b, [[s.x, s.y], [80, 262], [74, 205], [76, 168], [96, 124], [120, 104]], 620, 360, -10, "giraffe");
      this.add(SCORE.giraffe, s.x, s.y);
      this.hitAnimal("giraffe", 76, 168);
    } else if (s.id === "penguin") {
      if (b.vy > -120) return;
      var c = this.loopC, pts = [[s.x, s.y]], n = 30;
      for (var i = 0; i <= n; i++) {                // みぎ から はじめて ぐるっと 1しゅう と すこし
        var a = -Math.PI * 2.6 * i / n;
        pts.push([c.x + c.r * Math.cos(a), c.y + c.r * Math.sin(a)]);
      }
      pts.push([262, 140]);
      setRail(b, pts, 720, -330, 40, "penguin");
      this.penguins++;
      this.add(SCORE.penguin, s.x, s.y);
      this.emit("penguin", { n: this.penguins });
      this.hitAnimal("penguin", c.x, c.y);
    }
  };

  Game.prototype.onHit = function (el, b, v) {
    var id = el.id;
    this.flash.set(el, 0.25);
    if (id === "bumper") { this.add(SCORE.bumper, el.x, el.y); this.emit("bump", { x: el.x, y: el.y, food: el.food }); }
    else if (id === "monkey") { this.add(SCORE.monkey, el.x, el.y); this.emit("bump", { x: el.x, y: el.y }); this.hitAnimal("monkey", el.x, el.y); }
    else if (id === "lion") {
      this.anim.lion = 1;
      this.add(SCORE.lion, el.x, el.y);
      var a = this.findAnimal("lion");
      if (a.awake) {
        this.emit("animal", { id: "lion", x: el.x, y: el.y });
        if (++this.lionCount >= 3 && this.liveCount() <= 1) this.multiball();
      } else this.hitAnimal("lion", el.x, el.y);
    } else if (id === "owl") { this.anim.owl = 1; this.add(SCORE.owl, el.x, el.y); this.hitAnimal("owl", el.x, el.y); }
    else if (id === "bat") { this.add(SCORE.bat, el.x, el.y); this.emit("bump", { x: el.x, y: el.y }); this.hitAnimal("bat", el.x, el.y); }
    else if (id === "turtle") {
      if (!this.turtle.active) return;
      this.turtle.active = false;
      this.turtleState.on = false; this.turtleState.catching = 0.9;
      this.turtleState.next = this.time + this.cfg.turtleEvery;
      setRail(b, [[200, 652], [200, 640]], 40, (this.rand() - 0.5) * 160, -1000, "turtle", 0.5);
      this.add(SCORE.turtle, 200, 650);
      this.hitAnimal("turtle", 200, 660);
    } else if (id === "elephantBody" || id === "giraffeBody") {
      if (v > 120) this.emit("thud", {});
    }
  };

  Game.prototype.step = function (dt) {
    dt = dt || 1 / 60;
    this.time += dt;
    var self = this, i;
    // 🐢
    var ts = this.turtleState;
    if (ts.catching > 0) ts.catching -= dt;
    if (this.phase === "play") {
      if (!ts.on && this.time >= ts.next) { ts.on = true; ts.until = this.time + this.cfg.turtleStay; this.turtle.active = true; this.emit("turtleUp", {}); }
      else if (ts.on && this.time >= ts.until) { ts.on = false; this.turtle.active = false; ts.next = this.time + this.cfg.turtleEvery; }
    }
    for (var k in this.anim) this.anim[k] = Math.max(0, this.anim[k] - dt * 2);
    this.flash.forEach(function (v, key) { if (v - dt <= 0) self.flash.delete(key); else self.flash.set(key, v - dt); });

    if (this.phase === "parade") {
      this.paradeT += dt;
      this.world.t += dt;
      if (this.paradeT > 7) this.endParade();
      return;
    }
    if (this.phase === "over") { this.world.t += dt; return; }

    var balls = this.world.balls;
    for (i = 0; i < balls.length; i++) if (balls[i].rail) this.stepRail(balls[i], dt);
    this.world.step(dt);
    var evs = this.world.takeEvents();
    for (i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.type === "sensor") this.onSensor(e.el, e.ball);
      else if (e.type === "hit" && e.el.type === "flipper") this.emit("flipHit", { v: e.v });
      else if (e.type === "hit") this.onHit(e.el, e.ball, e.v);
    }
    // とまって しまった ボール を ゆらす（フリッパー で もって いる とき と レーン は べつ）
    for (i = 0; i < balls.length; i++) {
      var sb = balls[i];
      if (sb.rail || sb.y > 560 || sb.x > LANE.x0 || Math.abs(sb.vx) + Math.abs(sb.vy) > 30) { sb.still = 0; continue; }
      sb.still = (sb.still || 0) + dt;
      if (sb.still > 2) { sb.still = 0; sb.vy = -420; sb.vx = (this.rand() - 0.5) * 400; this.emit("nudge", { x: sb.x, y: sb.y }); }
    }
    // おちた ボール・そと に でた ボール
    for (i = balls.length - 1; i >= 0; i--) {
      var b = balls[i];
      if (b.rail) continue;
      if (b.y > H + 20 || b.out) {
        balls.splice(i, 1);
        if (b.out && b.y < H) { this.newBall(); this.emit("lostInside", {}); continue; }   // まんいち の あんぜん
        this.drained();
      }
    }
  };

  Game.prototype.drained = function () {
    if (this.world.balls.length > 0) { this.emit("drain", { left: this.world.balls.length }); return; }
    if (this.time < this.saverUntil) {
      this.newBall();
      this.emit("save", {});
      return;
    }
    this.ballsLeft--;
    if (this.ballsLeft > 0) {
      this.saverArmed = true;
      this.newBall();
      this.emit("ballLost", { left: this.ballsLeft });
    } else {
      this.phase = "over";
      this.fl.left.pressed = this.fl.right.pressed = false;
      this.emit("gameover", { score: this.score });
    }
  };

  var api = {
    W: W, H: H, BALL_R: BALL_R, ARC: ARC, LANE: LANE, FL: FL,
    ANIMALS: ANIMALS, NIGHT_ANIMALS: NIGHT_ANIMALS, SCORE: SCORE,
    Game: Game, build: build, yomi: yomi, insideTable: insideTable
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PZTable = api;
})(typeof window !== "undefined" ? window : this);
