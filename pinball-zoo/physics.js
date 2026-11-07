/* ============================================================
   ころころ ピンボール どうぶつえん — ぶつり（DOM なし）
   ボール（えん）と、せんぶん・えん・うごく フリッパー の しょうとつ。
   1フレーム を 8 サブステップ に わけて すりぬけ を ふせぐ。
   フリッパー の はやさ（かくそくど × うでの ながさ）を ボール に つたえる。
   ============================================================ */
(function (root) {
  "use strict";

  var MAX_SPEED = 1600;      // ボール の いちばん はやい はやさ（だい の たんい/びょう）
  var SUBSTEPS = 8;

  function closest(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    var t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    return [ax + dx * t, ay + dy * t, t];
  }

  /* ボール b と 「てん (cx,cy)＋はんけい rr」 の しょうとつ。
     (svx,svy) は ぶつかった ところ の うごく はやさ。e は はねかえり、kick は バンパー の おしかえし。
     かえりち: ぶつかって いなければ 0。ぶつかったら ちかづく はやさ（0 より おおきい） */
  function resolve(b, cx, cy, rr, svx, svy, e, kick) {
    var dx = b.x - cx, dy = b.y - cy, R = b.r + rr;
    var d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return 0;
    var d = Math.sqrt(d2);
    if (d < 1e-6) { dx = 0; dy = -1; d = 1; }
    var nx = dx / d, ny = dy / d;
    b.x = cx + nx * R; b.y = cy + ny * R;
    var rvx = b.vx - svx, rvy = b.vy - svy, vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      rvx -= (1 + e) * vn * nx; rvy -= (1 + e) * vn * ny;
      if (kick && -vn > 40) { rvx += nx * kick; rvy += ny * kick; }
      b.vx = rvx + svx; b.vy = rvy + svy;
      return -vn;
    }
    return 1e-4;
  }

  function Flipper(o) {
    this.type = "flipper";
    this.px = o.px; this.py = o.py; this.len = o.len; this.r = o.r || 7;
    this.rest = o.rest; this.up = o.up;
    this.angle = o.rest; this.w = 0; this.pressed = false;
    this.upSpeed = o.upSpeed || 20; this.downSpeed = o.downSpeed || 12;
    this.e = o.e == null ? 0.25 : o.e;
    this.side = o.side;
  }
  Flipper.prototype.tip = function () {
    return [this.px + Math.cos(this.angle) * this.len, this.py + Math.sin(this.angle) * this.len];
  };
  Flipper.prototype.update = function (dt) {
    var target = this.pressed ? this.up : this.rest;
    var sp = this.pressed ? this.upSpeed : this.downSpeed;
    var diff = target - this.angle, step = sp * dt, prev = this.angle;
    if (Math.abs(diff) <= step) this.angle = target;
    else this.angle += diff > 0 ? step : -step;
    this.w = (this.angle - prev) / dt;
  };

  function World(opt) {
    opt = opt || {};
    this.g = opt.g == null ? 1000 : opt.g;
    this.segs = [];
    this.circles = [];
    this.flippers = [];
    this.sensors = [];
    this.balls = [];
    this.t = 0;
    this.events = [];
    this.bounds = opt.bounds || null;   // [x0,y0,x1,y1] … そとに でたら ball.out = true
  }
  World.prototype.addSeg = function (ax, ay, bx, by, o) {
    o = o || {};
    var s = { type: "seg", ax: ax, ay: ay, bx: bx, by: by, e: o.e == null ? 0.45 : o.e, kick: o.kick || 0, id: o.id, oneWay: null };
    if (o.oneWay) {   // かた がわ だけ かべ: oneWay は かべ が ある がわ を さす ほうこう（だいたい で よい）
      var dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
      if (nx * o.oneWay[0] + ny * o.oneWay[1] < 0) { nx = -nx; ny = -ny; }
      s.oneWay = [nx, ny];
    }
    this.segs.push(s); return s;
  };
  World.prototype.addPoly = function (pts, o) {
    for (var i = 0; i + 1 < pts.length; i++) this.addSeg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], o);
  };
  World.prototype.addCircle = function (x, y, r, o) {
    o = o || {};
    var c = { type: "circle", x: x, y: y, r: r, vx: 0, vy: 0, e: o.e == null ? 0.6 : o.e, kick: o.kick || 0,
      id: o.id, active: o.active !== false, path: o.path || null };
    this.circles.push(c); return c;
  };
  World.prototype.addSensor = function (x, y, r, id) {
    var s = { type: "sensor", x: x, y: y, r: r, id: id, active: true };
    this.sensors.push(s); return s;
  };
  World.prototype.addFlipper = function (o) { var f = new Flipper(o); this.flippers.push(f); return f; };
  World.prototype.addBall = function (x, y, vx, vy, r) {
    var b = { x: x, y: y, vx: vx || 0, vy: vy || 0, r: r || 9, rail: null, out: false, id: Math.random() };
    this.balls.push(b); return b;
  };

  World.prototype.collideBall = function (b) {
    var i, s, c, f, hit, p;
    for (i = 0; i < this.segs.length; i++) {
      s = this.segs[i];
      p = closest(b.x, b.y, s.ax, s.ay, s.bx, s.by);
      if (s.oneWay && ((b.x - s.ax) * s.oneWay[0] + (b.y - s.ay) * s.oneWay[1]) < 0) continue;
      hit = resolve(b, p[0], p[1], 0, 0, 0, s.e, s.kick);
      if (hit > 60 && s.id) this.events.push({ type: "hit", el: s, ball: b, v: hit });
    }
    for (i = 0; i < this.circles.length; i++) {
      c = this.circles[i];
      if (!c.active) continue;
      hit = resolve(b, c.x, c.y, c.r, c.vx, c.vy, c.e, c.kick);
      if (hit > 20 && c.id) this.events.push({ type: "hit", el: c, ball: b, v: hit });
    }
    for (i = 0; i < this.flippers.length; i++) {
      f = this.flippers[i];
      var tp = f.tip();
      p = closest(b.x, b.y, f.px, f.py, tp[0], tp[1]);
      var svx = -f.w * (p[1] - f.py), svy = f.w * (p[0] - f.px);
      hit = resolve(b, p[0], p[1], f.r, svx, svy, f.e, 0);
      if (hit > 60) this.events.push({ type: "hit", el: f, ball: b, v: hit });
    }
  };

  World.prototype.substep = function (dt) {
    var i, j, b, c, k;
    this.t += dt;
    for (i = 0; i < this.flippers.length; i++) this.flippers[i].update(dt);
    for (i = 0; i < this.circles.length; i++) {
      c = this.circles[i];
      if (!c.path) continue;
      var q = c.path(this.t);
      c.vx = (q[0] - c.x) / dt; c.vy = (q[1] - c.y) / dt;
      c.x = q[0]; c.y = q[1];
    }
    for (i = 0; i < this.balls.length; i++) {
      b = this.balls[i];
      if (b.rail || b.out) continue;
      b.vy += this.g * dt;
      var sp = Math.hypot(b.vx, b.vy);
      if (sp > MAX_SPEED) { b.vx *= MAX_SPEED / sp; b.vy *= MAX_SPEED / sp; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      this.collideBall(b);
      this.collideBall(b);   // かど で ２つ に あたる とき の ため に もう いちど
    }
    // ボール どうし（おなじ おもさ）
    for (i = 0; i < this.balls.length; i++) for (j = i + 1; j < this.balls.length; j++) {
      var a = this.balls[i]; b = this.balls[j];
      if (a.rail || b.rail || a.out || b.out) continue;
      var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), R = a.r + b.r;
      if (d >= R || d < 1e-6) continue;
      var nx = dx / d, ny = dy / d, push = (R - d) / 2;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
      var vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn < 0) { a.vx += vn * nx * 0.95; a.vy += vn * ny * 0.95; b.vx -= vn * nx * 0.95; b.vy -= vn * ny * 0.95; }
    }
    for (i = 0; i < this.balls.length; i++) {
      b = this.balls[i];
      if (b.rail || b.out) continue;
      for (k = 0; k < this.sensors.length; k++) {
        var s = this.sensors[k];
        if (!s.active) continue;
        var ddx = b.x - s.x, ddy = b.y - s.y;
        if (ddx * ddx + ddy * ddy < (s.r + b.r) * (s.r + b.r)) this.events.push({ type: "sensor", el: s, ball: b });
      }
      var bd = this.bounds;
      if (bd && (b.x < bd[0] || b.x > bd[2] || b.y < bd[1] || b.y > bd[3])) b.out = true;
    }
  };

  /* dt びょう すすめる（ふつう 1/60）。サブステップ に わける */
  World.prototype.step = function (dt, n) {
    n = n || SUBSTEPS;
    for (var i = 0; i < n; i++) this.substep(dt / n);
  };

  World.prototype.takeEvents = function () { var e = this.events; this.events = []; return e; };

  var api = { World: World, Flipper: Flipper, closest: closest, resolve: resolve, MAX_SPEED: MAX_SPEED, SUBSTEPS: SUBSTEPS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PZPhysics = api;
})(typeof window !== "undefined" ? window : this);
