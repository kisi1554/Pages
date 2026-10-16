/* ============================================================
   ころころ そうち — じさくの 2D ぶつりエンジン
   - かたちは「えん」と「かいてんする ながしかく」だけ
   - しょうとつ: えん-えん / えん-ながしかく / ながしかく-ながしかく（SAT＋クリッピング）
   - シーケンシャル インパルス（ウォームスタート つき）＋ バウムガルテ いち ほせい
   - こてい タイムステップ 1/120 びょう。Math.random を つかわないので けっかは まいかい おなじ
   - ねむり: しばらく とまって いる ものは けいさんを とめる
   ブラウザでは window.KoroPhysics、node では module.exports。
   ============================================================ */
(function (root) {
  "use strict";

  var DT = 1 / 120;
  var GRAVITY = 1500;          // px / s^2（せかいは 1200×800）
  var ITER = 12;               // ソルバーの くりかえし
  var BETA = 0.2;              // いち ほせいの つよさ
  var SLOP = 0.6;              // ちょっとの めりこみは ゆるす
  var REST_MIN = 70;           // これより ゆっくりなら はねかえらない
  var SLEEP_V = 8, SLEEP_T = 0.5, WAKE_V = 14;
  var SPRING_MIN = 620;        // ばねは さいてい この はやさで はねかえす

  /* もーど */
  var STATIC = 0, DYNAMIC = 1, PINNED = 2, KINEMATIC = 3;

  var nextId = 1;

  function Body(o) {
    this.id = nextId++;
    this.shape = o.shape;           // "c" | "b"
    this.r = o.r || 0;
    this.hw = o.hw || 0;
    this.hh = o.hh || 0;
    this.x = o.x; this.y = o.y;
    this.a = o.a || 0;
    this.vx = 0; this.vy = 0; this.w = 0;
    this.fx = 0; this.fy = 0;        // そとからの かそくど（ファン）
    this.mode = o.mode == null ? STATIC : o.mode;
    this.e = o.e == null ? 0.2 : o.e;
    this.mu = o.mu == null ? 0.5 : o.mu;
    this.tag = o.tag || "";
    this.part = o.part == null ? -1 : o.part;
    this.light = false;
    this.min = o.min == null ? -Infinity : o.min;   // PINNED の かくど げんかい
    this.max = o.max == null ? Infinity : o.max;
    this.sleep = false;
    this.still = 0;
    this.alive = true;
    var area = this.shape === "c" ? Math.PI * this.r * this.r : 4 * this.hw * this.hh;
    var m = area * (o.density || 1);
    var I = this.shape === "c" ? 0.5 * m * this.r * this.r
                               : m * (4 * this.hw * this.hw + 4 * this.hh * this.hh) / 12;
    this.m = m;
    this.im = this.mode === DYNAMIC ? 1 / m : 0;
    this.iI = (this.mode === DYNAMIC || this.mode === PINNED) ? 1 / I : 0;
    this.rad = this.shape === "c" ? this.r : Math.sqrt(this.hw * this.hw + this.hh * this.hh);
    this.ld = o.ld == null ? 0.02 : o.ld;   // いどうの ブレーキ
    this.ad = o.ad == null ? 0.4 : o.ad;    // かいてんの ブレーキ
    this.c = Math.cos(this.a); this.s = Math.sin(this.a);
  }
  Body.prototype.sync = function () { this.c = Math.cos(this.a); this.s = Math.sin(this.a); };
  Body.prototype.moves = function () { return this.mode !== STATIC; };
  Body.prototype.speed = function () {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy) + Math.abs(this.w) * this.rad;
  };
  Body.prototype.wake = function () { if (this.sleep) { this.sleep = false; this.still = 0; } };

  function imOf(b) { return (b.mode === DYNAMIC && !b.sleep) ? b.im : 0; }
  function iIOf(b) { return ((b.mode === DYNAMIC || b.mode === PINNED) && !b.sleep) ? b.iI : 0; }

  /* ---------- AABB ---------- */
  function aabb(b) {
    if (b.shape === "c") return [b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r];
    var ex = Math.abs(b.c) * b.hw + Math.abs(b.s) * b.hh;
    var ey = Math.abs(b.s) * b.hw + Math.abs(b.c) * b.hh;
    return [b.x - ex, b.y - ey, b.x + ex, b.y + ey];
  }

  /* ---------- しょうとつ はんてい ----------
     out に { nx, ny, px, py, pen, key } を いれる。ほうせんは A → B むき。 */
  function circleCircle(A, B, out) {
    var dx = B.x - A.x, dy = B.y - A.y;
    var d2 = dx * dx + dy * dy, rr = A.r + B.r;
    if (d2 >= rr * rr) return;
    var d = Math.sqrt(d2), nx = 0, ny = 1;
    if (d > 1e-9) { nx = dx / d; ny = dy / d; }
    out.push({ nx: nx, ny: ny, px: A.x + nx * (A.r - (rr - d) / 2), py: A.y + ny * (A.r - (rr - d) / 2), pen: rr - d, key: 0 });
  }

  // box(A) と circle(B)
  function boxCircle(A, B, out, flip) {
    var dx = B.x - A.x, dy = B.y - A.y;
    var lx = dx * A.c + dy * A.s, ly = -dx * A.s + dy * A.c;
    var qx = Math.max(-A.hw, Math.min(A.hw, lx));
    var qy = Math.max(-A.hh, Math.min(A.hh, ly));
    var nlx, nly, pen;
    if (qx !== lx || qy !== ly) {
      var ex = lx - qx, ey = ly - qy, d2 = ex * ex + ey * ey;
      if (d2 >= B.r * B.r) return;
      var d = Math.sqrt(d2);
      nlx = ex / d; nly = ey / d; pen = B.r - d;
    } else {
      var px = A.hw - Math.abs(lx), py = A.hh - Math.abs(ly);
      if (px < py) { nlx = lx >= 0 ? 1 : -1; nly = 0; qx = nlx * A.hw; pen = px + B.r; }
      else { nlx = 0; nly = ly >= 0 ? 1 : -1; qy = nly * A.hh; pen = py + B.r; }
    }
    var nx = nlx * A.c - nly * A.s, ny = nlx * A.s + nly * A.c;
    var wx = A.x + qx * A.c - qy * A.s, wy = A.y + qx * A.s + qy * A.c;
    if (flip) { nx = -nx; ny = -ny; }
    out.push({ nx: nx, ny: ny, px: wx, py: wy, pen: pen, key: 0 });
  }

  function clip(pts, tx, ty, off) {
    var o = [], d0 = pts[0].x * tx + pts[0].y * ty - off, d1 = pts[1].x * tx + pts[1].y * ty - off;
    if (d0 <= 0) o.push(pts[0]);
    if (d1 <= 0) o.push(pts[1]);
    if (d0 * d1 < 0) {
      var k = d0 / (d0 - d1);
      o.push({ x: pts[0].x + k * (pts[1].x - pts[0].x), y: pts[0].y + k * (pts[1].y - pts[0].y), id: d0 > 0 ? pts[0].id + 2 : pts[1].id + 2 });
    }
    return o;
  }

  function boxBox(A, B, out) {
    var dx = B.x - A.x, dy = B.y - A.y;
    var a0x = A.c, a0y = A.s, a1x = -A.s, a1y = A.c;
    var b0x = B.c, b0y = B.s, b1x = -B.s, b1y = B.c;
    var c00 = Math.abs(a0x * b0x + a0y * b0y), c01 = Math.abs(a0x * b1x + a0y * b1y);
    var c10 = Math.abs(a1x * b0x + a1y * b0y), c11 = Math.abs(a1x * b1x + a1y * b1y);
    var dA0 = dx * a0x + dy * a0y, dA1 = dx * a1x + dy * a1y;
    var dB0 = dx * b0x + dy * b0y, dB1 = dx * b1x + dy * b1y;
    var sA0 = Math.abs(dA0) - A.hw - (B.hw * c00 + B.hh * c01);
    if (sA0 > 0) return;
    var sA1 = Math.abs(dA1) - A.hh - (B.hw * c10 + B.hh * c11);
    if (sA1 > 0) return;
    var sB0 = Math.abs(dB0) - B.hw - (A.hw * c00 + A.hh * c10);
    if (sB0 > 0) return;
    var sB1 = Math.abs(dB1) - B.hh - (A.hw * c01 + A.hh * c11);
    if (sB1 > 0) return;

    var axis = 0, sep = sA0;
    if (sA1 > 0.95 * sep + 0.05) { axis = 1; sep = sA1; }
    if (sB0 > 0.95 * sep + 0.05) { axis = 2; sep = sB0; }
    if (sB1 > 0.95 * sep + 0.05) { axis = 3; sep = sB1; }

    var nx, ny, ref, inc, rnx, rny, rext, tx, ty, rhalf;
    if (axis === 0) { nx = dA0 > 0 ? a0x : -a0x; ny = dA0 > 0 ? a0y : -a0y; ref = A; inc = B; rnx = nx; rny = ny; rext = A.hw; tx = a1x; ty = a1y; rhalf = A.hh; }
    else if (axis === 1) { nx = dA1 > 0 ? a1x : -a1x; ny = dA1 > 0 ? a1y : -a1y; ref = A; inc = B; rnx = nx; rny = ny; rext = A.hh; tx = a0x; ty = a0y; rhalf = A.hw; }
    else if (axis === 2) { nx = dB0 > 0 ? b0x : -b0x; ny = dB0 > 0 ? b0y : -b0y; ref = B; inc = A; rnx = -nx; rny = -ny; rext = B.hw; tx = b1x; ty = b1y; rhalf = B.hh; }
    else { nx = dB1 > 0 ? b1x : -b1x; ny = dB1 > 0 ? b1y : -b1y; ref = B; inc = A; rnx = -nx; rny = -ny; rext = B.hh; tx = b0x; ty = b0y; rhalf = B.hw; }

    // いちばん むかいあう めん（incident face）
    var i0x = inc.c, i0y = inc.s, i1x = -inc.s, i1y = inc.c;
    var d0 = rnx * i0x + rny * i0y, d1 = rnx * i1x + rny * i1y;
    var fnx, fny, fext, ftx, fty, fhalf, face;
    if (Math.abs(d0) > Math.abs(d1)) {
      fnx = d0 > 0 ? -i0x : i0x; fny = d0 > 0 ? -i0y : i0y; fext = inc.hw; ftx = i1x; fty = i1y; fhalf = inc.hh; face = d0 > 0 ? 1 : 0;
    } else {
      fnx = d1 > 0 ? -i1x : i1x; fny = d1 > 0 ? -i1y : i1y; fext = inc.hh; ftx = i0x; fty = i0y; fhalf = inc.hw; face = d1 > 0 ? 3 : 2;
    }
    var cx = inc.x + fnx * fext, cy = inc.y + fny * fext;
    var pts = [{ x: cx + ftx * fhalf, y: cy + fty * fhalf, id: 0 }, { x: cx - ftx * fhalf, y: cy - fty * fhalf, id: 1 }];
    var side = tx * ref.x + ty * ref.y;
    pts = clip(pts, tx, ty, side + rhalf);
    if (pts.length < 2) return;
    pts = clip(pts, -tx, -ty, -side + rhalf);
    if (pts.length < 2) return;
    var front = rnx * ref.x + rny * ref.y + rext;
    for (var i = 0; i < 2; i++) {
      var p = pts[i], s = rnx * p.x + rny * p.y - front;
      if (s <= 0) {
        out.push({ nx: nx, ny: ny, px: p.x - rnx * s * 0.5, py: p.y - rny * s * 0.5, pen: -s, key: 1 + axis * 64 + face * 16 + p.id });
      }
    }
  }

  function collide(A, B, out) {
    if (A.shape === "c") {
      if (B.shape === "c") circleCircle(A, B, out);
      else boxCircle(B, A, out, true);
    } else {
      if (B.shape === "c") boxCircle(A, B, out, false);
      else boxBox(A, B, out);
    }
  }

  /* ---------- せかい ---------- */
  function World(opts) {
    opts = opts || {};
    this.bodies = [];
    this.hooks = [];           // まいステップ よぶ（バケツ・ファン など）
    this.time = 0;
    this.steps = 0;
    this.prev = new Map();     // ウォームスタート よう
    this.events = [];          // { a, b, speed } あたらしい ぶつかり
    this.bell = null;          // ベルに なにかが あたった とき { time, body }
    this.bounds = opts.bounds || { x0: -300, y0: -800, x1: 1500, y1: 1100 };
    this.contactsN = 0;
  }
  World.prototype.add = function (b) { this.bodies.push(b); return b; };

  World.prototype.step = function () {
    var dt = DT, bodies = this.bodies, n = bodies.length, i, j, b;
    this.events.length = 0;

    for (i = 0; i < this.hooks.length; i++) this.hooks[i](this, dt);

    // そくど を すすめる
    for (i = 0; i < n; i++) {
      b = bodies[i];
      b.touched = false;
      if (!b.alive || b.sleep) continue;
      if (b.mode === DYNAMIC) {
        b.vx += b.fx * dt; b.vy += (GRAVITY + b.fy) * dt;
        var ld = 1 / (1 + dt * b.ld);
        b.vx *= ld; b.vy *= ld;
        b.w *= 1 / (1 + dt * b.ad);
      } else if (b.mode === PINNED) {
        b.w *= 1 / (1 + dt * b.ad);
      }
      b.fx = 0; b.fy = 0;
    }

    // ぶつかり さがし
    var boxes = new Array(n);
    for (i = 0; i < n; i++) if (bodies[i].alive) boxes[i] = aabb(bodies[i]);
    var contacts = [], tmp = [];
    for (i = 0; i < n; i++) {
      var A = bodies[i];
      if (!A.alive) continue;
      var ba = boxes[i];
      for (j = i + 1; j < n; j++) {
        var B = bodies[j];
        if (!B.alive) continue;
        var bb = boxes[j];
        if (ba[2] < bb[0] || bb[2] < ba[0] || ba[3] < bb[1] || bb[3] < ba[1]) continue;
        if (A.mode !== DYNAMIC && B.mode !== DYNAMIC) {
          // どちらも おされない ものは はねかえさない。ただし シーソーや バケツが ベルに あたったら ならす
          if (!this.bell && ((A.tag === "bell" && B.moves()) || (B.tag === "bell" && A.moves()))) {
            tmp.length = 0;
            collide(A, B, tmp);
            if (tmp.length) this.bell = { time: this.time, body: A.tag === "bell" ? B : A };
          }
          continue;
        }
        var aAct = A.moves() && !A.sleep, bAct = B.moves() && !B.sleep;
        if (!aAct && !bAct) continue;
        tmp.length = 0;
        collide(A, B, tmp);
        if (!tmp.length) continue;
        A.touched = B.touched = true;
        // ねむって いる ものを おこす
        if (A.sleep && bAct && (B.speed() > WAKE_V || B.mode === KINEMATIC)) A.wake();
        if (B.sleep && aAct && (A.speed() > WAKE_V || A.mode === KINEMATIC)) B.wake();
        if (!this.bell) {
          if (A.tag === "bell" && B.mode === DYNAMIC) this.bell = { time: this.time, body: B };
          else if (B.tag === "bell" && A.mode === DYNAMIC) this.bell = { time: this.time, body: A };
        }
        for (var k = 0; k < tmp.length; k++) {
          var c = tmp[k];
          c.a = A; c.b = B;
          c.id = A.id + ":" + B.id + ":" + c.key;
          contacts.push(c);
        }
      }
    }
    this.contactsN = contacts.length;

    // じゅんび
    var next = new Map(), invDt = 1 / dt;
    for (i = 0; i < contacts.length; i++) {
      var c = contacts[i], A = c.a, B = c.b;
      var imA = imOf(A), imB = imOf(B), iIA = iIOf(A), iIB = iIOf(B);
      c.rax = c.px - A.x; c.ray = c.py - A.y; c.rbx = c.px - B.x; c.rby = c.py - B.y;
      var rnA = c.rax * c.ny - c.ray * c.nx, rnB = c.rbx * c.ny - c.rby * c.nx;
      var kn = imA + imB + iIA * rnA * rnA + iIB * rnB * rnB;
      var tx = -c.ny, ty = c.nx;
      var rtA = c.rax * ty - c.ray * tx, rtB = c.rbx * ty - c.rby * tx;
      var kt = imA + imB + iIA * rtA * rtA + iIB * rtB * rtB;
      c.mn = kn > 0 ? 1 / kn : 0; c.mt = kt > 0 ? 1 / kt : 0;
      c.imA = imA; c.imB = imB; c.iIA = iIA; c.iIB = iIB;
      c.mu = Math.sqrt(A.mu * B.mu);
      var rvx = B.vx - B.w * c.rby - A.vx + A.w * c.ray;
      var rvy = B.vy + B.w * c.rbx - A.vy - A.w * c.rax;
      var vn = rvx * c.nx + rvy * c.ny;
      var bias = BETA * invDt * Math.max(0, c.pen - SLOP);
      var target = 0;
      var spring = A.tag === "spring" || B.tag === "spring";
      if (spring && vn < -REST_MIN) target = Math.max(-0.95 * vn, SPRING_MIN);
      else if (vn < -REST_MIN) target = -Math.max(A.e, B.e) * vn;
      c.target = Math.max(bias, target);
      c.spring = spring && vn < -REST_MIN;
      var old = this.prev.get(c.id);
      if (old) {
        c.Pn = old.Pn; c.Pt = old.Pt;
        var px = c.nx * c.Pn + tx * c.Pt, py = c.ny * c.Pn + ty * c.Pt;
        A.vx -= px * imA; A.vy -= py * imA; A.w -= iIA * (c.rax * py - c.ray * px);
        B.vx += px * imB; B.vy += py * imB; B.w += iIB * (c.rbx * py - c.rby * px);
      } else {
        c.Pn = 0; c.Pt = 0;
        if (-vn > 40) this.events.push({ a: A, b: B, speed: -vn, spring: c.spring });
      }
      next.set(c.id, c);
    }

    // インパルス
    for (var it = 0; it < ITER; it++) {
      for (i = 0; i < contacts.length; i++) {
        var c = contacts[i], A = c.a, B = c.b;
        var rvx = B.vx - B.w * c.rby - A.vx + A.w * c.ray;
        var rvy = B.vy + B.w * c.rbx - A.vy - A.w * c.rax;
        var vn = rvx * c.nx + rvy * c.ny;
        var dP = c.mn * (c.target - vn);
        var P0 = c.Pn; c.Pn = Math.max(P0 + dP, 0); dP = c.Pn - P0;
        var px = c.nx * dP, py = c.ny * dP;
        A.vx -= px * c.imA; A.vy -= py * c.imA; A.w -= c.iIA * (c.rax * py - c.ray * px);
        B.vx += px * c.imB; B.vy += py * c.imB; B.w += c.iIB * (c.rbx * py - c.rby * px);
        // まさつ
        var tx = -c.ny, ty = c.nx;
        rvx = B.vx - B.w * c.rby - A.vx + A.w * c.ray;
        rvy = B.vy + B.w * c.rbx - A.vy - A.w * c.rax;
        var vt = rvx * tx + rvy * ty;
        var dT = -c.mt * vt, maxT = c.mu * c.Pn;
        var T0 = c.Pt; c.Pt = Math.max(-maxT, Math.min(maxT, T0 + dT)); dT = c.Pt - T0;
        px = tx * dT; py = ty * dT;
        A.vx -= px * c.imA; A.vy -= py * c.imA; A.w -= c.iIA * (c.rax * py - c.ray * px);
        B.vx += px * c.imB; B.vy += py * c.imB; B.w += c.iIB * (c.rbx * py - c.rby * px);
      }
    }
    // つぎの ステップの ウォームスタート よう（はねかえりの ぶんは のこさない）
    var keep = new Map();
    next.forEach(function (c, id) { keep.set(id, { Pn: c.spring ? 0 : c.Pn, Pt: c.spring ? 0 : c.Pt }); });
    this.prev = keep;

    // いち を すすめる
    var bd = this.bounds;
    for (i = 0; i < n; i++) {
      b = bodies[i];
      if (!b.alive || b.sleep || b.mode === STATIC) continue;
      if (b.mode === DYNAMIC || b.mode === KINEMATIC) { b.x += b.vx * dt; b.y += b.vy * dt; }
      b.a += b.w * dt;
      if (b.mode === PINNED) {
        if (b.a > b.max) { b.a = b.max; if (b.w > 0) b.w = -b.w * 0.15; }
        if (b.a < b.min) { b.a = b.min; if (b.w < 0) b.w = -b.w * 0.15; }
      }
      b.sync();
      if (b.mode === DYNAMIC && (b.y > bd.y1 || b.x < bd.x0 || b.x > bd.x1)) { b.alive = false; continue; }
      // ねむり
      if (b.mode === DYNAMIC || b.mode === PINNED) {
        if (b.speed() < SLEEP_V) {
          b.still += dt;
          if (b.still > SLEEP_T) { b.sleep = true; b.vx = 0; b.vy = 0; b.w = 0; }
        } else b.still = 0;
      }
    }
    this.time += dt;
    this.steps++;
  };

  World.prototype.awakeCount = function () {
    var k = 0;
    for (var i = 0; i < this.bodies.length; i++) {
      var b = this.bodies[i];
      if (b.alive && !b.sleep && (b.mode === DYNAMIC || b.mode === PINNED)) k++;
    }
    return k;
  };

  // 2つの からだが めりこんで いるか（はいち チェック よう）
  function overlap(A, B, tol) {
    var tmp = [];
    A.sync(); B.sync();
    collide(A, B, tmp);
    for (var i = 0; i < tmp.length; i++) if (tmp[i].pen > (tol || 0)) return tmp[i].pen;
    return 0;
  }

  var api = {
    DT: DT, GRAVITY: GRAVITY,
    STATIC: STATIC, DYNAMIC: DYNAMIC, PINNED: PINNED, KINEMATIC: KINEMATIC,
    Body: Body, World: World, collide: collide, overlap: overlap, aabb: aabb
  };
  root.KoroPhysics = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
