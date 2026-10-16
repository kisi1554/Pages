/* ============================================================
   ころころ そうち — じさくの ぶつり エンジン
   - かたちは「えん」と「かいてんする ながしかく」だけ（ふくすう くみあわせて 1つの からだ にも できる）
   - しょうとつ: えん-えん / えん-ながしかく / ながしかく-ながしかく（SAT＋クリッピング）
   - こてい タイムステップ 1/120びょう、そくど インパルス → いち ほせい
   - ねむり（とまった ものは けいさん しない）
   - Math.random は つかわない（おなじ はいちなら まいかい おなじ けっか）
   node でも ブラウザでも よめる（window.KoroPhysics）
   ============================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.KoroPhysics = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DT = 1 / 120;
  var VEL_ITERS = 10, POS_ITERS = 3;
  var SLOP = 0.4, BAUM = 0.35, MAX_CORR = 6;
  var BOUNCE_MIN = 70;           // これより おそい しょうとつ では はねかえらない
  var SLEEP_V = 12, SLEEP_W = 0.25, SLEEP_T = 0.5, WAKE_SPEED = 28;
  var MAX_V = 2300;
  var SPRING_V = 1000;          // ばねで はねる はやさ（さいてい）

  /* ---------- からだ ---------- */
  // o = { type: "static"|"dynamic"|"kinematic"|"pinned", x, y, a, m, e, mu,
  //       shapes: [{ t:"c", ox, oy, r } | { t:"b", ox, oy, oa, hw, hh }], ... }
  function Body(o) {
    this.id = 0;
    this.type = o.type || "dynamic";
    this.x = o.x || 0; this.y = o.y || 0; this.a = o.a || 0;
    this.vx = 0; this.vy = 0; this.w = 0;
    this.e = o.e != null ? o.e : 0.2;
    this.mu = o.mu != null ? o.mu : 0.5;
    this.linDamp = o.linDamp != null ? o.linDamp : 0.04;
    this.angDamp = o.angDamp != null ? o.angDamp : 0.3;
    this.shapes = o.shapes.map(function (s) {
      return { t: s.t, ox: s.ox || 0, oy: s.oy || 0, oa: s.oa || 0, r: s.r || 0, hw: s.hw || 0, hh: s.hh || 0,
               x: 0, y: 0, ux: 1, uy: 0 };
    });
    this.m = o.m || 1;
    this.spring = !!o.spring;   // ばね: はねかえす
    this.bell = !!o.bell;       // ベル: さわると クリア
    this.minA = o.minA != null ? o.minA : -Infinity;   // pinned の かくど せいげん
    this.maxA = o.maxA != null ? o.maxA : Infinity;
    this.data = o.data || null; // ゲームがわの じょうほう
    this.sleeping = false; this.sleepT = 0; this.out = false;
    this.touching = 0;          // このステップで なにかに ふれているか（ころころ おと よう）
    this.aabb = [0, 0, 0, 0];
    // しつりょう と かんせい モーメント（めんせきで わける）
    var areas = this.shapes.map(function (s) { return s.t === "c" ? Math.PI * s.r * s.r : 4 * s.hw * s.hh; });
    var total = areas.reduce(function (p, q) { return p + q; }, 0) || 1;
    var I = 0, m = this.m;
    this.shapes.forEach(function (s, i) {
      var ms = m * areas[i] / total, d2 = s.ox * s.ox + s.oy * s.oy;
      I += s.t === "c" ? ms * (s.r * s.r / 2 + d2) : ms * ((4 * s.hw * s.hw + 4 * s.hh * s.hh) / 12 + d2);
    });
    this.I = o.I || I;
    var movable = this.type === "dynamic";
    this.invM = movable ? 1 / this.m : 0;
    this.invI = (movable || this.type === "pinned") ? 1 / this.I : 0;
    this.radius = 0;
    var self = this;
    this.shapes.forEach(function (s) {
      var ext = Math.hypot(s.ox, s.oy) + (s.t === "c" ? s.r : Math.hypot(s.hw, s.hh));
      if (ext > self.radius) self.radius = ext;
    });
    this.update();
  }
  Body.prototype.update = function () {
    var c = Math.cos(this.a), s = Math.sin(this.a);
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var i = 0; i < this.shapes.length; i++) {
      var sh = this.shapes[i];
      sh.x = this.x + sh.ox * c - sh.oy * s;
      sh.y = this.y + sh.ox * s + sh.oy * c;
      var ex, ey;
      if (sh.t === "c") { ex = ey = sh.r; }
      else {
        var aa = this.a + sh.oa;
        sh.ux = Math.cos(aa); sh.uy = Math.sin(aa);
        ex = Math.abs(sh.ux) * sh.hw + Math.abs(sh.uy) * sh.hh;
        ey = Math.abs(sh.uy) * sh.hw + Math.abs(sh.ux) * sh.hh;
      }
      if (sh.x - ex < x0) x0 = sh.x - ex;
      if (sh.y - ey < y0) y0 = sh.y - ey;
      if (sh.x + ex > x1) x1 = sh.x + ex;
      if (sh.y + ey > y1) y1 = sh.y + ey;
    }
    this.aabb[0] = x0; this.aabb[1] = y0; this.aabb[2] = x1; this.aabb[3] = y1;
  };
  Body.prototype.speed = function () {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy) + Math.abs(this.w) * this.radius;
  };
  Body.prototype.wake = function () { this.sleeping = false; this.sleepT = 0; };
  // そのときの うごける ぐあい（ねむっている ものは うごかない もの として あつかう）
  function im(b) { return b.sleeping ? 0 : b.invM; }
  function ii(b) { return b.sleeping ? 0 : b.invI; }
  function active(b) { return !b.sleeping && !b.out && (b.type === "dynamic" || b.type === "pinned"); }

  /* ---------- しょうとつ けんしゅつ ---------- */
  // contact: { nx, ny（A→B）, px, py, d（めりこみ） }
  function circleCircle(a, b, out) {
    var dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) return;
    var d = Math.sqrt(d2), nx, ny;
    if (d < 1e-9) { nx = 0; ny = -1; } else { nx = dx / d; ny = dy / d; }
    var pen = rr - d;
    out.push({ nx: nx, ny: ny, px: a.x + nx * (a.r - pen / 2), py: a.y + ny * (a.r - pen / 2), d: pen });
  }
  function boxCircle(bx, c, out, flip) {
    var vx = -bx.uy, vy = bx.ux;
    var dx = c.x - bx.x, dy = c.y - bx.y;
    var lx = dx * bx.ux + dy * bx.uy, ly = dx * vx + dy * vy;
    var nlx, nly, pen, qx, qy;
    if (Math.abs(lx) <= bx.hw && Math.abs(ly) <= bx.hh) {
      var px = bx.hw - Math.abs(lx), py = bx.hh - Math.abs(ly);
      if (px < py) { nlx = lx < 0 ? -1 : 1; nly = 0; pen = c.r + px; qx = nlx * bx.hw; qy = ly; }
      else { nlx = 0; nly = ly < 0 ? -1 : 1; pen = c.r + py; qx = lx; qy = nly * bx.hh; }
    } else {
      qx = Math.max(-bx.hw, Math.min(bx.hw, lx));
      qy = Math.max(-bx.hh, Math.min(bx.hh, ly));
      var ex = lx - qx, ey = ly - qy, e2 = ex * ex + ey * ey;
      if (e2 >= c.r * c.r) return;
      var e = Math.sqrt(e2);
      nlx = ex / e; nly = ey / e; pen = c.r - e;
    }
    var nx = nlx * bx.ux + nly * vx, ny = nlx * bx.uy + nly * vy;
    var wx = bx.x + qx * bx.ux + qy * vx, wy = bx.y + qx * bx.uy + qy * vy;
    if (flip) { nx = -nx; ny = -ny; }
    out.push({ nx: nx, ny: ny, px: wx, py: wy, d: pen });
  }
  function proj(b, nx, ny) {
    return b.hw * Math.abs(b.ux * nx + b.uy * ny) + b.hh * Math.abs(-b.uy * nx + b.ux * ny);
  }
  function boxBox(A, B, out) {
    var dx = B.x - A.x, dy = B.y - A.y;
    var axes = [[A.ux, A.uy, 0, 0], [-A.uy, A.ux, 0, 1], [B.ux, B.uy, 1, 0], [-B.uy, B.ux, 1, 1]];
    var best = -Infinity, bi = -1;
    for (var i = 0; i < 4; i++) {
      var nx = axes[i][0], ny = axes[i][1];
      var sep = Math.abs(dx * nx + dy * ny) - proj(A, nx, ny) - proj(B, nx, ny);
      if (sep > 0) return;
      // A の めんを すこし ひいき（ぶれ ぼうし）
      if (sep > best + (i >= 2 ? 0.05 : 0)) { best = sep; bi = i; }
    }
    var ax = axes[bi], refIsA = ax[2] === 0;
    var R = refIsA ? A : B, I = refIsA ? B : A;
    var nx0 = ax[0], ny0 = ax[1];
    var sx = refIsA ? dx : -dx, sy = refIsA ? dy : -dy;   // R → I
    if (sx * nx0 + sy * ny0 < 0) { nx0 = -nx0; ny0 = -ny0; }
    var hN = ax[3] === 0 ? R.hw : R.hh, hT = ax[3] === 0 ? R.hh : R.hw;
    var fcx = R.x + nx0 * hN, fcy = R.y + ny0 * hN;
    var tx = -ny0, ty = nx0;
    // いりこむ がわの めん（もっとも はんたい むきの めん）
    var cands = [[I.ux, I.uy, I.hw, I.hh], [-I.ux, -I.uy, I.hw, I.hh], [-I.uy, I.ux, I.hh, I.hw], [I.uy, -I.ux, I.hh, I.hw]];
    var mind = Infinity, ci = 0;
    for (var k = 0; k < 4; k++) {
      var dd = cands[k][0] * nx0 + cands[k][1] * ny0;
      if (dd < mind - 1e-9) { mind = dd; ci = k; }
    }
    var cf = cands[ci];
    var icx = I.x + cf[0] * cf[2], icy = I.y + cf[1] * cf[2];
    var itx = -cf[1], ity = cf[0];
    var p1x = icx + itx * cf[3], p1y = icy + ity * cf[3];
    var p2x = icx - itx * cf[3], p2y = icy - ity * cf[3];
    // よこの めんで きりとる
    var c0 = tx * fcx + ty * fcy;
    var pts = clip(p1x, p1y, p2x, p2y, tx, ty, c0 + hT);
    if (!pts) return;
    pts = clip(pts[0], pts[1], pts[2], pts[3], -tx, -ty, -c0 + hT);
    if (!pts) return;
    var nOutX = refIsA ? nx0 : -nx0, nOutY = refIsA ? ny0 : -ny0;
    for (var j = 0; j < 2; j++) {
      var qx = pts[j * 2], qy = pts[j * 2 + 1];
      var sp = (qx - fcx) * nx0 + (qy - fcy) * ny0;
      if (sp <= 0) out.push({ nx: nOutX, ny: nOutY, px: qx - nx0 * sp / 2, py: qy - ny0 * sp / 2, d: -sp });
    }
  }
  // せんぶん p1-p2 を dot(n, p) <= c の がわに のこす
  function clip(x1, y1, x2, y2, nx, ny, c) {
    var d1 = nx * x1 + ny * y1 - c, d2 = nx * x2 + ny * y2 - c;
    if (d1 > 0 && d2 > 0) return null;
    if (d1 <= 0 && d2 <= 0) return [x1, y1, x2, y2];
    var t = d1 / (d1 - d2), mx = x1 + (x2 - x1) * t, my = y1 + (y2 - y1) * t;
    return d1 > 0 ? [mx, my, x2, y2] : [x1, y1, mx, my];
  }
  function collideShapes(sa, sb, out) {
    if (sa.t === "c" && sb.t === "c") circleCircle(sa, sb, out);
    else if (sa.t === "b" && sb.t === "c") boxCircle(sa, sb, out, false);
    else if (sa.t === "c" && sb.t === "b") boxCircle(sb, sa, out, true);
    else boxBox(sa, sb, out);
  }
  function overlap(a, b) {
    return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
  }
  // うごく ものどうし か、うごく もの と なにか だけ しらべる
  function needPair(A, B) {
    if (A.out || B.out) return false;
    var aMove = A.type === "dynamic" || A.type === "pinned", bMove = B.type === "dynamic" || B.type === "pinned";
    if (!aMove && !bMove) return false;
    if (A.type !== "dynamic" && B.type !== "dynamic") return false;   // pinned-static, pinned-pinned は なし
    if (A.sleeping && B.sleeping) return false;
    if (A.sleeping && B.type === "static") return false;
    if (B.sleeping && A.type === "static") return false;
    return true;
  }

  /* ---------- せかい ---------- */
  function World(opt) {
    opt = opt || {};
    this.bodies = [];
    this.gx = 0; this.gy = opt.gravity != null ? opt.gravity : 1400;
    this.bounds = opt.bounds || [-400, -1200, 1400, 1000];
    this.time = 0; this.steps = 0;
    this.scripts = [];          // まいステップ よばれる かんすう(world, dt)
    this.forces = [];           // ファン など: function(world, body, dt)
    this.events = [];           // { k: "hit"|"bell"|"spring", a, b, v }
    this.bellHit = false; this.bellTime = -1;
    this.nextId = 1;
  }
  World.prototype.add = function (b) {
    if (!(b instanceof Body)) b = new Body(b);
    b.id = this.nextId++;
    this.bodies.push(b);
    return b;
  };
  World.prototype.detect = function (wakeup) {
    var out = [], pairs = [], bs = this.bodies, n = bs.length, k;
    for (var i = 0; i < n; i++) {
      var A = bs[i];
      for (var j = i + 1; j < n; j++) {
        var B = bs[j];
        if (!needPair(A, B) || !overlap(A.aabb, B.aabb)) continue;
        var cs = [];
        for (var p = 0; p < A.shapes.length; p++)
          for (var q = 0; q < B.shapes.length; q++) collideShapes(A.shapes[p], B.shapes[q], cs);
        if (cs.length) pairs.push([A, B, cs]);
      }
    }
    if (wakeup) {
      // ふれている ものを おこす（おきた ものが さらに となりを おこす）
      var changed = true;
      while (changed) {
        changed = false;
        for (k = 0; k < pairs.length; k++) {
          var a = pairs[k][0], b = pairs[k][1];
          if (a.sleeping && restless(b)) { a.wake(); changed = true; }
          if (b.sleeping && restless(a)) { b.wake(); changed = true; }
        }
      }
    }
    for (k = 0; k < pairs.length; k++) {
      var pa = pairs[k];
      if (pa[0].sleeping && pa[1].sleeping) continue;
      for (var m = 0; m < pa[2].length; m++) { pa[2][m].A = pa[0]; pa[2][m].B = pa[1]; out.push(pa[2][m]); }
    }
    return out;
  };
  // となりを おこす ほど うごいているか
  function restless(b) {
    if (b.sleeping || b.out || b.type === "static") return false;
    if (b.type === "kinematic") return !!(b.vx || b.vy || b.w);
    return b.sleepT < 0.15 || b.speed() > WAKE_SPEED;
  }
  World.prototype.step = function () {
    var dt = DT, bs = this.bodies, i, b;
    this.time += dt; this.steps++;
    for (i = 0; i < this.scripts.length; i++) this.scripts[i](this, dt);
    // ちから（じゅうりょく・かぜ）
    for (i = 0; i < bs.length; i++) {
      b = bs[i];
      b.touching = 0;
      if (b.type !== "dynamic" || b.out) continue;
      for (var f = 0; f < this.forces.length; f++) this.forces[f](this, b, dt);
      if (b.sleeping) continue;
      b.vx += this.gx * dt; b.vy += this.gy * dt;
    }
    // そくどの けいさん
    var cs = this.detect(true);
    var c, A, B;
    for (i = 0; i < cs.length; i++) {
      c = cs[i]; A = c.A; B = c.B;
      if (A.spring || B.spring) springNormal(c);
      var imA = im(A), imB = im(B), iiA = ii(A), iiB = ii(B);
      c.rax = c.px - A.x; c.ray = c.py - A.y; c.rbx = c.px - B.x; c.rby = c.py - B.y;
      var rnA = c.rax * c.ny - c.ray * c.nx, rnB = c.rbx * c.ny - c.rby * c.nx;
      var kN = imA + imB + iiA * rnA * rnA + iiB * rnB * rnB;
      c.mN = kN > 0 ? 1 / kN : 0;
      var tx = -c.ny, ty = c.nx;
      var rtA = c.rax * ty - c.ray * tx, rtB = c.rbx * ty - c.rby * tx;
      var kT = imA + imB + iiA * rtA * rtA + iiB * rtB * rtB;
      c.mT = kT > 0 ? 1 / kT : 0;
      c.mu = Math.sqrt(A.mu * B.mu);
      var vn = relN(c);
      var e = Math.max(A.e, B.e);
      c.bias = vn < -BOUNCE_MIN ? -e * vn : 0;
      if ((A.spring || B.spring) && vn < -60) c.bias = Math.max(-vn * 0.9, SPRING_V);
      c.Pn = 0; c.Pt = 0;
      if (A.type === "dynamic") A.touching = Math.max(A.touching, 1);
      if (B.type === "dynamic") B.touching = Math.max(B.touching, 1);
      if (vn < -150) this.events.push({ k: (A.spring || B.spring) ? "spring" : "hit", a: A, b: B, v: -vn });
      if ((A.bell && B.type === "dynamic") || (B.bell && A.type === "dynamic")) {
        if (!this.bellHit) { this.bellHit = true; this.bellTime = this.time; this.events.push({ k: "bell", a: A, b: B, v: -vn }); }
      }
    }
    for (var it = 0; it < VEL_ITERS; it++) {
      for (i = 0; i < cs.length; i++) {
        c = cs[i]; if (c.mN === 0) continue;
        var dPn = c.mN * (c.bias - relN(c));
        var Pn = Math.max(c.Pn + dPn, 0);
        dPn = Pn - c.Pn; c.Pn = Pn;
        applyImp(c, dPn * c.nx, dPn * c.ny);
        var vt = relT(c);
        var dPt = c.mT * -vt, maxF = c.mu * c.Pn;
        var Pt = Math.max(-maxF, Math.min(maxF, c.Pt + dPt));
        dPt = Pt - c.Pt; c.Pt = Pt;
        applyImp(c, dPt * -c.ny, dPt * c.nx);
      }
    }
    // いどう
    for (i = 0; i < bs.length; i++) {
      b = bs[i];
      if (b.out || b.type === "static") continue;
      if (b.type === "kinematic") {
        if (b.vx || b.vy || b.w) { b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt; b.update(); }
        continue;
      }
      if (b.sleeping) continue;
      if (b.type === "pinned") { b.vx = b.vy = 0; }
      b.vx /= 1 + dt * b.linDamp; b.vy /= 1 + dt * b.linDamp; b.w /= 1 + dt * b.angDamp;
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (sp > MAX_V) { b.vx *= MAX_V / sp; b.vy *= MAX_V / sp; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
      if (b.a < b.minA) { b.a = b.minA; if (b.w < 0) b.w = -b.w * 0.15; }
      if (b.a > b.maxA) { b.a = b.maxA; if (b.w > 0) b.w = -b.w * 0.15; }
      b.update();
      var bd = this.bounds;
      if (b.y > bd[3] || b.x < bd[0] || b.x > bd[2] || b.y < bd[1]) { b.out = true; b.vx = b.vy = b.w = 0; }
    }
    // いちの ほせい（めりこみを なおす）
    for (it = 0; it < POS_ITERS; it++) {
      var pc = this.detect(false);
      for (i = 0; i < pc.length; i++) {
        c = pc[i]; A = c.A; B = c.B;
        var C = Math.min(MAX_CORR, BAUM * (c.d - SLOP));
        if (C <= 0) continue;
        var iA = im(A), iB = im(B), jA = ii(A), jB = ii(B);
        var rax = c.px - A.x, ray = c.py - A.y, rbx = c.px - B.x, rby = c.py - B.y;
        var ra = rax * c.ny - ray * c.nx, rb = rbx * c.ny - rby * c.nx;
        var K = iA + iB + jA * ra * ra + jB * rb * rb;
        if (K <= 0) continue;
        var P = C / K;
        if (iA || jA) {
          A.x -= iA * P * c.nx; A.y -= iA * P * c.ny; A.a -= jA * ra * P; clampA(A); A.update();
        }
        if (iB || jB) {
          B.x += iB * P * c.nx; B.y += iB * P * c.ny; B.a += jB * rb * P; clampA(B); B.update();
        }
      }
    }
    // ねむり
    for (i = 0; i < bs.length; i++) {
      b = bs[i];
      if (!active(b)) continue;
      var v2 = b.vx * b.vx + b.vy * b.vy;
      if (v2 < SLEEP_V * SLEEP_V && Math.abs(b.w) < SLEEP_W) {
        b.sleepT += dt;
        if (b.sleepT > SLEEP_T) { b.sleeping = true; b.vx = b.vy = b.w = 0; }
      } else b.sleepT = 0;
    }
  };
  // ばねの おもて（うえの めん）に あたったら、ばねの むいている ほうへ まっすぐ はねる
  function springNormal(c) {
    var S = c.A.spring ? c.A : c.B, sh = S.shapes[0];
    var upx = sh.uy, upy = -sh.ux, sgn = S === c.A ? 1 : -1;
    if ((c.nx * upx + c.ny * upy) * sgn > 0.1) { c.nx = upx * sgn; c.ny = upy * sgn; }
  }
  function clampA(b) {
    if (b.a < b.minA) b.a = b.minA;
    if (b.a > b.maxA) b.a = b.maxA;
  }
  function relV(c, nx, ny) {
    var A = c.A, B = c.B;
    var vax = A.vx - A.w * c.ray, vay = A.vy + A.w * c.rax;
    var vbx = B.vx - B.w * c.rby, vby = B.vy + B.w * c.rbx;
    return (vbx - vax) * nx + (vby - vay) * ny;
  }
  function relN(c) { return relV(c, c.nx, c.ny); }
  function relT(c) { return relV(c, -c.ny, c.nx); }
  function applyImp(c, px, py) {
    var A = c.A, B = c.B;
    var iA = im(A), iB = im(B), jA = ii(A), jB = ii(B);
    if (iA || jA) { A.vx -= iA * px; A.vy -= iA * py; A.w -= jA * (c.rax * py - c.ray * px); }
    if (iB || jB) { B.vx += iB * px; B.vy += iB * py; B.w += jB * (c.rbx * py - c.rby * px); }
  }
  // うごいている もの すべてが ねむったか
  World.prototype.allAsleep = function () {
    for (var i = 0; i < this.bodies.length; i++) {
      var b = this.bodies[i];
      if (b.out) continue;
      if ((b.type === "dynamic" || b.type === "pinned") && !b.sleeping) return false;
      if (b.type === "kinematic" && (b.vx || b.vy || b.w)) return false;
    }
    return true;
  };

  return { DT: DT, Body: Body, World: World, collideShapes: collideShapes };
});
