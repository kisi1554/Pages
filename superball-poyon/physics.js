/* ============================================================
   ぽよよん スーパーボール — ぶつりエンジン（じさく）
   - うごく からだ は「えん」だけ。かいてん（かくそくど）あり
   - うごかない もの: へいめん（かべ・ゆか）、せんぶん（ふとさ つき）、
     ながしかく（かいてん なし）、えん
   - 1フレームを サブステップに わけて すりぬけを ふせぐ
   - えん-えん は くうかん ハッシュで ちかい ものだけ はんてい
   - しょうとつ: はねかえり（ほうせん）＋ まさつ と せっせん ほうこうの はねかえり
     （スーパーボールが かいてんで もどってくる うごき）
   - Math.random を つかわないので けっていてき
   ============================================================ */
(function (root, factory) {
  var P = factory();
  if (typeof module === "object" && module.exports) module.exports = P;
  else root.SBPhysics = P;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var REST_V = 45;     // これより おそい しょうとつは はねかえらない（とまれる ように）
  var HIT_V = 30;      // onHit を よぶ さいていの はやさ
  var WAKE_V = 25;     // ねている からだを おこす はやさ
  var SLEEP_V = 9;     // ねむる はやさ
  var SLEEP_T = 0.6;   // この びょうすう とまって いたら ねむる

  // おそい しょうとつ ほど はねかえりを よわく（ちいさく ぴょこぴょこ しつづけない）
  function soft(v) {
    var t = (v - REST_V) / (REST_V * 2);
    return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  }

  function World(opt) {
    opt = opt || {};
    this.gx = opt.gx || 0;
    this.gy = opt.gy != null ? opt.gy : 1400;
    this.substeps = opt.substeps || 6;
    this.maxSpeed = opt.maxSpeed || 3200;
    this.air = opt.air != null ? opt.air : 0.03;    // くうきの ていこう（1びょうあたり）
    this.spinDamp = opt.spinDamp != null ? opt.spinDamp : 0.4;
    this.sleepOn = opt.sleep !== false;
    this.cell = opt.cell || 64;
    this.bodies = [];
    this.planes = [];   // { nx, ny, d, e, mu, et, tag }   n・p >= d が うちがわ
    this.segs = [];     // { ax, ay, bx, by, rad, e, mu, et, tag, vx, vy }
    this.boxes = [];    // { x, y, hw, hh, e, mu, et, tag }
    this.discs = [];    // { x, y, r, e, mu, et, tag }
    this.onHit = null;  // function (b, other, speed, nx, ny)   other は からだ か かべ
    this.force = null;  // function (b, h)  サブステップ ごとの ちから
    this.time = 0;
    this._grid = new Map();
    this._used = [];
    this._mark = new Int32Array(256);
    this._stamp = 0;
    this._id = 1;
  }

  World.prototype.add = function (o) {
    var b = {
      id: this._id++, x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, a: o.a || 0, w: o.w || 0,
      r: 1, rho: o.rho || 1, e: o.e != null ? o.e : 0.9, mu: o.mu != null ? o.mu : 0.7,
      et: o.et != null ? o.et : 0.6, air: o.air != null ? o.air : 1,
      fixed: !!o.fixed, sleeping: false, still: 0, touch: false, noBall: false, noSleep: !!o.noSleep,
      gs: o.gs != null ? o.gs : 1, last: null, lastT: -1, data: o.data || null
    };
    setRadius(b, o.r || 20);
    this.bodies.push(b);
    if (this._mark.length < this.bodies.length + 1) this._mark = new Int32Array(this.bodies.length * 2);
    return b;
  };

  World.prototype.remove = function (b) {
    var i = this.bodies.indexOf(b);
    if (i >= 0) this.bodies.splice(i, 1);
  };

  World.prototype.clear = function () { this.bodies.length = 0; };

  function setRadius(b, r) {
    b.r = r;
    b.m = b.rho * r * r;
    b.invM = 1 / b.m;
    b.I = 0.4 * b.m * r * r;      // みの つまった たま
    b.invI = 1 / b.I;
  }
  World.prototype.setRadius = function (b, r) { setRadius(b, r); };

  World.prototype.wake = function (b) { b.sleeping = false; b.still = 0; };
  World.prototype.wakeAll = function () { for (var i = 0; i < this.bodies.length; i++) this.wake(this.bodies[i]); };

  // はこの かべ（ひだり・みぎ・うえ・ゆか）を つくる
  World.prototype.setBounds = function (x0, y0, x1, y1, opt) {
    opt = opt || {};
    var mk = function (nx, ny, d, tag) {
      return { nx: nx, ny: ny, d: d, e: opt.e != null ? opt.e : 1, mu: opt.mu != null ? opt.mu : 1, et: 1, tag: tag };
    };
    this.planes = [mk(1, 0, x0, "left"), mk(-1, 0, -x1, "right"), mk(0, -1, -y1, "floor")];
    if (!opt.open) this.planes.push(mk(0, 1, y0, "top"));
    this.bounds = { x0: x0, y0: y0, x1: x1, y1: y1 };
  };

  World.prototype.step = function (dt) {
    var n = this.substeps, h = dt / n, i, b;
    for (i = 0; i < this.bodies.length; i++) this.bodies[i].touch = false;
    for (var s = 0; s < n; s++) this._sub(h);
    this.time += dt;
    if (!this.sleepOn) return;
    for (i = 0; i < this.bodies.length; i++) {
      b = this.bodies[i];
      if (b.sleeping || b.fixed || b.noSleep) continue;
      if (b.touch && b.vx * b.vx + b.vy * b.vy < SLEEP_V * SLEEP_V && Math.abs(b.w) * b.r < SLEEP_V) {
        b.still += dt;
        if (b.still > SLEEP_T) { b.sleeping = true; b.vx = b.vy = b.w = 0; }
      } else b.still = 0;
    }
  };

  World.prototype._sub = function (h) {
    var bs = this.bodies, i, b, gx = this.gx, gy = this.gy, cap = this.maxSpeed;
    var air = Math.exp(-this.air * h), spin = Math.exp(-this.spinDamp * h);
    for (i = 0; i < bs.length; i++) {
      b = bs[i];
      if (b.fixed || b.sleeping) continue;   // fixed は アプリが うごかす（ゆびで つかんでいる ボール）
      b.vx += gx * b.gs * h; b.vy += gy * b.gs * h;
      if (this.force) this.force(b, h);
      if (b.air !== 1) { var k = Math.exp(-this.air * b.air * h); b.vx *= k; b.vy *= k; }
      else { b.vx *= air; b.vy *= air; }
      b.w *= spin;
      var v2 = b.vx * b.vx + b.vy * b.vy;
      if (v2 > cap * cap) { var f = cap / Math.sqrt(v2); b.vx *= f; b.vy *= f; }
      var wc = cap / b.r;
      if (b.w > wc) b.w = wc; else if (b.w < -wc) b.w = -wc;
      b.x += b.vx * h; b.y += b.vy * h; b.a += b.w * h;
    }
    var segs = this.segs;
    for (i = 0; i < segs.length; i++) {
      var sg = segs[i];
      if (sg.vx || sg.vy) { sg.ax += sg.vx * h; sg.bx += sg.vx * h; sg.ay += sg.vy * h; sg.by += sg.vy * h; }
    }
    this._statics();
    this._pairs();
  };

  /* ---------- うごかない もの と の しょうとつ ---------- */
  World.prototype._statics = function () {
    var bs = this.bodies, P = this.planes, S = this.segs, B = this.boxes, D = this.discs;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i], j, d, nx, ny, pen;
      if (b.fixed) continue;
      for (j = 0; j < P.length; j++) {
        var p = P[j];
        d = p.nx * b.x + p.ny * b.y - p.d;
        if (d < b.r) this._hitStatic(b, p, p.nx, p.ny, b.r - d, 0, 0);
      }
      for (j = 0; j < S.length; j++) {
        var s = S[j], ex = s.bx - s.ax, ey = s.by - s.ay, L2 = ex * ex + ey * ey;
        var t = L2 > 0 ? ((b.x - s.ax) * ex + (b.y - s.ay) * ey) / L2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        var qx = s.ax + ex * t, qy = s.ay + ey * t, rr = b.r + (s.rad || 0);
        nx = b.x - qx; ny = b.y - qy; d = nx * nx + ny * ny;
        if (d >= rr * rr) continue;
        d = Math.sqrt(d);
        if (d > 1e-6) { nx /= d; ny /= d; } else { var L = Math.sqrt(L2) || 1; nx = -ey / L; ny = ex / L; }
        this._hitStatic(b, s, nx, ny, rr - d, s.vx || 0, s.vy || 0);
      }
      for (j = 0; j < B.length; j++) {
        var bx = B[j], cx = b.x < bx.x - bx.hw ? bx.x - bx.hw : b.x > bx.x + bx.hw ? bx.x + bx.hw : b.x;
        var cy = b.y < bx.y - bx.hh ? bx.y - bx.hh : b.y > bx.y + bx.hh ? bx.y + bx.hh : b.y;
        nx = b.x - cx; ny = b.y - cy; d = nx * nx + ny * ny;
        if (d >= b.r * b.r) continue;
        if (d > 1e-9) { d = Math.sqrt(d); nx /= d; ny /= d; pen = b.r - d; }
        else {
          // まんなかが はこの なか: いちばん ちかい めんから おしだす
          var dl = b.x - (bx.x - bx.hw), dr = bx.x + bx.hw - b.x, dt = b.y - (bx.y - bx.hh), db = bx.y + bx.hh - b.y;
          var m = Math.min(dl, dr, dt, db);
          if (m === dt) { nx = 0; ny = -1; } else if (m === db) { nx = 0; ny = 1; } else if (m === dl) { nx = -1; ny = 0; } else { nx = 1; ny = 0; }
          pen = b.r + m;
        }
        this._hitStatic(b, bx, nx, ny, pen, 0, 0);
      }
      for (j = 0; j < D.length; j++) {
        var c = D[j];
        nx = b.x - c.x; ny = b.y - c.y; d = nx * nx + ny * ny;
        var R = b.r + c.r;
        if (d >= R * R) continue;
        d = Math.sqrt(d) || 1e-6; nx /= d; ny /= d;
        this._hitStatic(b, c, nx, ny, R - d, 0, 0);
      }
    }
  };

  // n は かべ → からだ の むき。sx, sy は かべの はやさ（うごく ポイ など）
  World.prototype._hitStatic = function (b, o, nx, ny, pen, sx, sy) {
    if (o.sensor) { if (o.onTouch) o.onTouch(b); return; }
    b.touch = true;
    b.x += nx * pen; b.y += ny * pen;
    var r = b.r, rcx = -nx * r, rcy = -ny * r;
    var pvx = b.vx - b.w * rcy - sx, pvy = b.vy + b.w * rcx - sy;
    var vn = pvx * nx + pvy * ny;
    if (vn >= 0) return;
    if (b.sleeping) { if (-vn < WAKE_V) return; this.wake(b); }
    var tx = -ny, ty = nx, vt = pvx * tx + pvy * ty;
    var f = soft(-vn);
    var e = b.e * (o.e != null ? o.e : 1) * f;
    if (e > 1) e = 1;
    var et = b.et * (o.et != null ? o.et : 1) * f;
    var mu = b.mu * (o.mu != null ? o.mu : 1);
    var jn = -(1 + e) * vn * b.m;
    var kt = b.invM + r * r * b.invI;
    var jt = -(1 + et) * vt / kt, lim = mu * jn;
    if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
    var Jx = nx * jn + tx * jt, Jy = ny * jn + ty * jt;
    b.vx += Jx * b.invM; b.vy += Jy * b.invM;
    b.w += (rcx * Jy - rcy * Jx) * b.invI;
    b.last = o; b.lastT = this.time;
    if (this.onHit && -vn > HIT_V) this.onHit(b, o, -vn, nx, ny);
  };

  /* ---------- えん と えん（くうかん ハッシュ）---------- */
  World.prototype._pairs = function () {
    var bs = this.bodies, g = this._grid, used = this._used, cs = this.cell, i, k, arr;
    for (i = 0; i < used.length; i++) g.get(used[i]).length = 0;
    used.length = 0;
    for (i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.noBall) continue;
      var x0 = Math.floor((b.x - b.r) / cs), x1 = Math.floor((b.x + b.r) / cs);
      var y0 = Math.floor((b.y - b.r) / cs), y1 = Math.floor((b.y + b.r) / cs);
      b._c0 = x0; b._c1 = x1; b._r0 = y0; b._r1 = y1;
      for (var cx = x0; cx <= x1; cx++) for (var cy = y0; cy <= y1; cy++) {
        k = (cx + 4096) * 8192 + (cy + 4096);
        arr = g.get(k);
        if (!arr) { arr = []; g.set(k, arr); }
        if (arr.length === 0) used.push(k);
        arr.push(i);
      }
    }
    var mark = this._mark;
    if (mark.length < bs.length) mark = this._mark = new Int32Array(bs.length * 2);
    for (i = 0; i < bs.length; i++) {
      var a = bs[i];
      if (a.noBall) continue;
      var st = ++this._stamp;
      if (st > 2000000000) { this._stamp = st = 1; mark.fill(0); }
      for (var x = a._c0; x <= a._c1; x++) for (var y = a._r0; y <= a._r1; y++) {
        arr = g.get((x + 4096) * 8192 + (y + 4096));
        for (var q = 0; q < arr.length; q++) {
          var j = arr[q];
          if (j <= i || mark[j] === st) continue;
          mark[j] = st;
          this._pair(a, bs[j]);
        }
      }
    }
  };

  World.prototype._pair = function (b, c) {
    var nx = b.x - c.x, ny = b.y - c.y, R = b.r + c.r, d2 = nx * nx + ny * ny;
    if (d2 >= R * R) return;
    if (b.sleeping && c.sleeping) return;
    var d = Math.sqrt(d2);
    if (d > 1e-6) { nx /= d; ny /= d; } else { nx = 0; ny = -1; d = 0; }
    var rb = b.r, rc = c.r;
    var pbx = b.vx + b.w * ny * rb, pby = b.vy - b.w * nx * rb;     // b の せってん（-n*rb）の はやさ
    var pcx = c.vx - c.w * ny * rc, pcy = c.vy + c.w * nx * rc;     // c の せってん（+n*rc）の はやさ
    var rvx = pbx - pcx, rvy = pby - pcy, vn = rvx * nx + rvy * ny;
    // ねている ほうは、つよく あたられたら おきる。そうでなければ うごかない かべ あつかい
    if (b.sleeping && vn < -WAKE_V) this.wake(b);
    if (c.sleeping && vn < -WAKE_V) this.wake(c);
    var ib = b.fixed || b.sleeping ? 0 : b.invM, ic = c.fixed || c.sleeping ? 0 : c.invM;
    var sum = ib + ic;
    if (sum === 0) return;
    b.touch = c.touch = true;
    var pen = R - d;
    b.x += nx * pen * ib / sum; b.y += ny * pen * ib / sum;
    c.x -= nx * pen * ic / sum; c.y -= ny * pen * ic / sum;
    if (vn >= 0) return;
    var f = soft(-vn);
    var e = Math.sqrt(b.e * c.e) * f;
    var et = Math.min(b.et, c.et) * 0.5 * f;
    var mu = Math.sqrt(b.mu * c.mu);
    var jn = -(1 + e) * vn / sum;
    var tx = -ny, ty = nx, vt = rvx * tx + rvy * ty;
    var iIb = b.fixed || b.sleeping ? 0 : b.invI, iIc = c.fixed || c.sleeping ? 0 : c.invI;
    var kt = ib + rb * rb * iIb + ic + rc * rc * iIc;
    var jt = kt > 0 ? -(1 + et) * vt / kt : 0, lim = mu * jn;
    if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
    var Jx = nx * jn + tx * jt, Jy = ny * jn + ty * jt;
    b.vx += Jx * ib; b.vy += Jy * ib;
    c.vx -= Jx * ic; c.vy -= Jy * ic;
    // トルク: b の せってん -n*rb、c の せってん +n*rc
    b.w += (-nx * rb * Jy + ny * rb * Jx) * iIb;
    c.w -= (nx * rc * Jy - ny * rc * Jx) * iIc;
    b.last = c; c.last = b; b.lastT = c.lastT = this.time;
    if (this.onHit && -vn > HIT_V) this.onHit(b, c, -vn, nx, ny);
  };

  // その ばしょに いる からだ（いちばん うえの もの）
  World.prototype.pick = function (x, y, extra) {
    extra = extra || 0;
    for (var i = this.bodies.length - 1; i >= 0; i--) {
      var b = this.bodies[i], dx = x - b.x, dy = y - b.y, R = b.r + extra;
      if (dx * dx + dy * dy <= R * R) return b;
    }
    return null;
  };

  // うんどう エネルギー（テスト よう）
  World.prototype.energy = function () {
    var E = 0;
    for (var i = 0; i < this.bodies.length; i++) {
      var b = this.bodies[i];
      E += 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy) + 0.5 * b.I * b.w * b.w;
    }
    return E;
  };

  return { World: World, setRadius: setRadius, REST_V: REST_V };
});
