// どたばた ペット ホテル — ぶつり（DOM も WebGL も つかわない。node で テストできる）
//  - うごく もの（body）は「たての カプセル」: 中心 p、半径 r、たての はんぶんの ながさ hh（0 なら きゅう）
//  - うごかない もの: じくに そった はこ（AABB）・かたむいた ゆか（ramp）・たての えんちゅう（cyl、まわる ことも ある）
//  - みず（water）に はいると うく
//  - 固定 ステップ 1/60 びょう。はやい ものは こまかく わけて うごかすので ゆかを すりぬけない
'use strict';
var Physics = (function () {
  var STEP = 1 / 60;

  function createWorld() {
    return {
      boxes: [], ramps: [], cyls: [], water: [], bodies: [],
      gravity: [0, -20, 0],
      frictionMul: 1,     // つるつる アイス で ちいさく する
      trampoline: 0,      // 0 より おおきいと、ゆかに ついた ものが この はやさ いじょうで はねかえる
      wind: [0, 0, 0],    // かぜ（かそくど）
      lift: 0,            // あわあわ: かるい ものを うかせる つよさ（0〜1）
      liftY: 2.2,
      onImpact: null,     // function (body, other|null, speed, normal, surface)
      time: 0,
    };
  }

  function addBox(w, min, max, o) {
    o = o || {};
    var b = { min: min.slice(), max: max.slice(), mu: o.mu != null ? o.mu : 0.6, e: o.e != null ? o.e : 0.15, tag: o.tag || '', occ: !!o.occ };
    w.boxes.push(b);
    return b;
  }
  // ramp: x0..x1 / z0..z1 の うえに、axis の むきに h0 → h1 と たかく なる ゆか
  function addRamp(w, o) {
    var r = { x0: o.x0, x1: o.x1, z0: o.z0, z1: o.z1, h0: o.h0, h1: o.h1, axis: o.axis || 'x', mu: o.mu != null ? o.mu : 0.3, e: o.e || 0, tag: o.tag || '' };
    w.ramps.push(r);
    return r;
  }
  function addCyl(w, o) {
    var c = { x: o.x, z: o.z, r: o.r, y0: o.y0 || 0, y1: o.y1, spin: o.spin || 0, angle: 0, mu: o.mu != null ? o.mu : 0.7, e: o.e || 0.1, tag: o.tag || '' };
    w.cyls.push(c);
    return c;
  }
  function addWater(w, min, max) {
    var z = { min: min.slice(), max: max.slice() };
    w.water.push(z);
    return z;
  }
  function addBody(w, o) {
    var b = {
      p: o.p.slice(), v: o.v ? o.v.slice() : [0, 0, 0],
      r: o.r || 0.3, hh: o.hh || 0, m: o.m || 1,
      e: o.e != null ? o.e : 0.3, mu: o.mu != null ? o.mu : 0.5,
      gs: o.gs != null ? o.gs : 1,         // じゅうりょくの かかりかた
      ts: 1,                               // じかんの はやさ（スロー／はやおくり）
      damp: o.damp || 0,                   // くうきの ていこう
      buoy: o.buoy != null ? o.buoy : 1.6, // みずに うく つよさ
      windK: o.windK != null ? o.windK : 1,
      liftK: o.liftK || 0,                 // あわあわ で うく つよさ
      f: [0, 0, 0],
      ground: false, gn: [0, 1, 0], wall: false, wn: [0, 0, 0], hit: 0, inWater: false, carry: 0, groundTag: '',
      group: o.group || 0, active: true, solid: o.solid !== false,
      kind: o.kind || '', ref: o.ref || null,
    };
    w.bodies.push(b);
    return b;
  }
  function removeBody(w, b) {
    var i = w.bodies.indexOf(b);
    if (i >= 0) w.bodies.splice(i, 1);
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- せっしょくした ときの はやさの しょり ------------------------------
  function respond(w, b, n, mu, e, other, tag) {
    var v = b.v;
    var vn = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
    if (n[1] > 0.6) { b.ground = true; b.gn = n; b.groundTag = tag || ''; }
    else if (Math.abs(n[1]) < 0.5) { b.wall = true; b.wn = n; }
    if (vn >= 0) return;
    var impact = -vn;
    var bounce = impact > 1.2 ? Math.max(b.e, e) : 0;
    var newVn = impact * bounce;
    if (w.trampoline > 0 && n[1] > 0.6 && b.gs > 0.05) newVn = Math.max(impact * 0.9, w.trampoline);
    var add = impact + newVn;
    v[0] += n[0] * add; v[1] += n[1] * add; v[2] += n[2] * add;
    // クーロン まさつ（おす ちから に ひれいして よこの はやさを へらす）
    var m = Math.sqrt(Math.max(0, mu * b.mu)) * w.frictionMul;
    if (m > 0) {
      var vn2 = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
      var tx = v[0] - n[0] * vn2, ty = v[1] - n[1] * vn2, tz = v[2] - n[2] * vn2;
      var tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
      if (tl > 1e-9) {
        var dec = Math.min(tl, m * impact);
        var k = dec / tl;
        v[0] -= tx * k; v[1] -= ty * k; v[2] -= tz * k;
      }
    }
    if (impact > b.hit) b.hit = impact;
    if (w.onImpact) w.onImpact(b, other, impact, n, tag || '');
  }

  // ---- うごかない ものとの しょうとつ --------------------------------------
  function collideBox(w, b, box, prev) {
    var p = b.p, r = b.r, hh = b.hh;
    var mn = box.min, mx = box.max;
    if (p[0] + r < mn[0] || p[0] - r > mx[0] || p[2] + r < mn[2] || p[2] - r > mx[2]) return;
    if (p[1] + hh + r < mn[1] || p[1] - hh - r > mx[1]) return;
    // カプセルの じくの うち、はこに いちばん ちかい たかさ
    var py = clamp(clamp(p[1], mn[1], mx[1]), p[1] - hh, p[1] + hh);
    var qx = clamp(p[0], mn[0], mx[0]), qy = clamp(py, mn[1], mx[1]), qz = clamp(p[2], mn[2], mx[2]);
    var dx = p[0] - qx, dy = py - qy, dz = p[2] - qz;
    var d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= r * r) return;
    var n, pen;
    if (d2 > 1e-10) {
      var d = Math.sqrt(d2);
      n = [dx / d, dy / d, dz / d];
      pen = r - d;
    } else {
      // じくが はこの なかに はいった: まえの いちから はいってきた めんを えらぶ
      var cand = [
        [p[0] - mn[0] + r, [-1, 0, 0], prev[0] + r <= mn[0] + 1e-6],
        [mx[0] - p[0] + r, [1, 0, 0], prev[0] - r >= mx[0] - 1e-6],
        [(p[1] + hh) - mn[1] + r, [0, -1, 0], prev[1] + hh + r <= mn[1] + 1e-6],
        [mx[1] - (p[1] - hh) + r, [0, 1, 0], prev[1] - hh - r >= mx[1] - 1e-6],
        [p[2] - mn[2] + r, [0, 0, -1], prev[2] + r <= mn[2] + 1e-6],
        [mx[2] - p[2] + r, [0, 0, 1], prev[2] - r >= mx[2] - 1e-6],
      ];
      var best = null;
      for (var i = 0; i < 6; i++) if (cand[i][2] && (!best || cand[i][0] < best[0])) best = cand[i];
      if (!best) for (i = 0; i < 6; i++) if (!best || cand[i][0] < best[0]) best = cand[i];
      n = best[1]; pen = best[0];
    }
    p[0] += n[0] * pen; p[1] += n[1] * pen; p[2] += n[2] * pen;
    respond(w, b, n, box.mu, box.e, null, box.tag);
  }

  function rampHeight(rp, x, z) {
    var t = rp.axis === 'x' ? (x - rp.x0) / (rp.x1 - rp.x0) : (z - rp.z0) / (rp.z1 - rp.z0);
    t = clamp(t, 0, 1);
    return rp.h0 + (rp.h1 - rp.h0) * t;
  }
  function collideRamp(w, b, rp) {
    var p = b.p;
    if (p[0] < rp.x0 || p[0] > rp.x1 || p[2] < rp.z0 || p[2] > rp.z1) return;
    var len = rp.axis === 'x' ? rp.x1 - rp.x0 : rp.z1 - rp.z0;
    var s = (rp.h1 - rp.h0) / len;
    var k = 1 / Math.sqrt(1 + s * s);
    var n = rp.axis === 'x' ? [-s * k, k, 0] : [0, k, -s * k];
    var h = rampHeight(rp, p[0], p[2]);
    var foot = p[1] - b.hh;
    var dist = (foot - h) * k;
    if (dist >= b.r || foot < h - 1.2) return;
    var pen = b.r - dist;
    p[0] += n[0] * pen; p[1] += n[1] * pen; p[2] += n[2] * pen;
    respond(w, b, n, rp.mu, rp.e, null, rp.tag);
  }
  function collideCyl(w, b, c, prev, dt) {
    var p = b.p, r = b.r, hh = b.hh;
    var dx = p[0] - c.x, dz = p[2] - c.z;
    var rd = Math.sqrt(dx * dx + dz * dz);
    if (rd > c.r + r) return;
    if (p[1] + hh + r < c.y0 || p[1] - hh - r > c.y1) return;
    var py = clamp(clamp(p[1], c.y0, c.y1), p[1] - hh, p[1] + hh);
    var qx, qz;
    if (rd <= c.r) { qx = p[0]; qz = p[2]; } else { qx = c.x + dx / rd * c.r; qz = c.z + dz / rd * c.r; }
    var qy = clamp(py, c.y0, c.y1);
    var ex = p[0] - qx, ey = py - qy, ez = p[2] - qz;
    var d2 = ex * ex + ey * ey + ez * ez;
    if (d2 >= r * r) return;
    var n, pen;
    if (d2 > 1e-10) {
      var d = Math.sqrt(d2);
      n = [ex / d, ey / d, ez / d]; pen = r - d;
    } else if (prev[1] - hh - r >= c.y1 - 1e-3 || (p[1] - hh) > (c.y0 + c.y1) / 2) {
      n = [0, 1, 0]; pen = c.y1 - (p[1] - hh) + r;
    } else {
      var l = rd > 1e-6 ? rd : 1;
      n = rd > 1e-6 ? [dx / l, 0, dz / l] : [1, 0, 0];
      pen = c.r - rd + r;
    }
    p[0] += n[0] * pen; p[1] += n[1] * pen; p[2] += n[2] * pen;
    respond(w, b, n, c.mu, c.e, null, c.tag);
    // まわる ゆかに のっていたら いっしょに まわる
    if (n[1] > 0.6 && c.spin) {
      var a = c.spin * dt;
      var cs = Math.cos(a), sn = Math.sin(a);
      var rx = p[0] - c.x, rz = p[2] - c.z;
      p[0] = c.x + rx * cs - rz * sn;
      p[2] = c.z + rx * sn + rz * cs;
      b.carry = c.spin;
    }
  }

  function collideStatics(w, b, prev, dt) {
    var i;
    for (i = 0; i < w.boxes.length; i++) collideBox(w, b, w.boxes[i], prev);
    for (i = 0; i < w.ramps.length; i++) collideRamp(w, b, w.ramps[i]);
    for (i = 0; i < w.cyls.length; i++) collideCyl(w, b, w.cyls[i], prev, dt);
  }

  function waterAt(w, x, z) {
    for (var i = 0; i < w.water.length; i++) {
      var q = w.water[i];
      if (x >= q.min[0] && x <= q.max[0] && z >= q.min[2] && z <= q.max[2]) return q;
    }
    return null;
  }

  // ---- 1ステップ ---------------------------------------------------------
  function integrate(w, b, dt) {
    var t = dt * b.ts;
    var g = w.gravity, v = b.v;
    var ax = g[0] * b.gs + b.f[0] / b.m + w.wind[0] * b.windK;
    var ay = g[1] * b.gs + b.f[1] / b.m + w.wind[1] * b.windK;
    var az = g[2] * b.gs + b.f[2] / b.m + w.wind[2] * b.windK;
    b.inWater = false;
    var q = waterAt(w, b.p[0], b.p[2]);
    if (q) {
      var bottom = b.p[1] - b.hh - b.r, height = 2 * (b.r + b.hh);
      var sub = clamp((q.max[1] - bottom) / height, 0, 1);
      if (sub > 0 && bottom < q.max[1]) {
        b.inWater = true;
        var G = Math.sqrt(g[0] * g[0] + g[1] * g[1] + g[2] * g[2]);
        ay += G * Math.max(b.gs, 0.2) * b.buoy * sub;
        var wd = Math.max(0, 1 - 2.5 * sub * t);
        v[0] *= wd; v[1] *= wd; v[2] *= wd;
      }
    }
    if (w.lift > 0 && b.liftK > 0 && b.p[1] < w.liftY) {
      ay += 30 * w.lift * b.liftK * (1 - b.p[1] / w.liftY) + (-g[1]) * b.gs * w.lift * b.liftK;
    }
    v[0] += ax * t; v[1] += ay * t; v[2] += az * t;
    if (b.damp) {
      var dk = Math.max(0, 1 - b.damp * t);
      v[0] *= dk; v[1] *= dk; v[2] *= dk;
    }
    b.f[0] = b.f[1] = b.f[2] = 0;
    b.ground = false; b.wall = false; b.hit = 0; b.carry = 0;
    var sp = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    var n = Math.min(60, Math.max(1, Math.ceil(sp * t / (Math.min(b.r, 0.3) * 0.4))));
    var st = t / n;
    var prev = [0, 0, 0];
    for (var k = 0; k < n; k++) {
      prev[0] = b.p[0]; prev[1] = b.p[1]; prev[2] = b.p[2];
      b.p[0] += v[0] * st; b.p[1] += v[1] * st; b.p[2] += v[2] * st;
      collideStatics(w, b, prev, st);
    }
  }

  function collidePair(w, a, b) {
    if (a.group && a.group === b.group) return;
    var dx = a.p[0] - b.p[0], dz = a.p[2] - b.p[2];
    var rr = a.r + b.r;
    if (dx * dx + dz * dz >= rr * rr) return;
    // たての せんぶん どうしの いちばん ちかい たかさ
    var a0 = a.p[1] - a.hh, a1 = a.p[1] + a.hh, b0 = b.p[1] - b.hh, b1 = b.p[1] + b.hh;
    var dy;
    if (a0 > b1) dy = a0 - b1; else if (b0 > a1) dy = a1 - b0; else dy = 0;
    var d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= rr * rr) return;
    var d = Math.sqrt(d2), n;
    if (d > 1e-6) n = [dx / d, dy / d, dz / d]; else { n = [1, 0, 0]; d = 0; }
    var wa = 1 / a.m, wb = 1 / b.m, ws = wa + wb;
    var pen = rr - d;
    a.p[0] += n[0] * pen * wa / ws; a.p[1] += n[1] * pen * wa / ws; a.p[2] += n[2] * pen * wa / ws;
    b.p[0] -= n[0] * pen * wb / ws; b.p[1] -= n[1] * pen * wb / ws; b.p[2] -= n[2] * pen * wb / ws;
    var vn = (a.v[0] - b.v[0]) * n[0] + (a.v[1] - b.v[1]) * n[1] + (a.v[2] - b.v[2]) * n[2];
    if (n[1] > 0.6) { a.ground = true; a.gn = n; }
    if (n[1] < -0.6) { b.ground = true; b.gn = [-n[0], -n[1], -n[2]]; }
    if (vn >= 0) return;
    var e = Math.max(a.e, b.e) * (-vn > 1 ? 1 : 0);
    var j = -(1 + e) * vn / ws;
    a.v[0] += n[0] * j * wa; a.v[1] += n[1] * j * wa; a.v[2] += n[2] * j * wa;
    b.v[0] -= n[0] * j * wb; b.v[1] -= n[1] * j * wb; b.v[2] -= n[2] * j * wb;
    if (w.onImpact) { w.onImpact(a, b, -vn, n, ''); w.onImpact(b, a, -vn, [-n[0], -n[1], -n[2]], ''); }
  }

  function step(w, dt) {
    dt = dt || STEP;
    var bs = w.bodies, i, j;
    for (i = 0; i < w.cyls.length; i++) w.cyls[i].angle += w.cyls[i].spin * dt;
    for (i = 0; i < bs.length; i++) if (bs[i].active) integrate(w, bs[i], dt);
    for (i = 0; i < bs.length; i++) {
      var a = bs[i];
      if (!a.active || !a.solid) continue;
      for (j = i + 1; j < bs.length; j++) {
        var b = bs[j];
        if (b.active && b.solid) collidePair(w, a, b);
      }
    }
    // ぶつかって おされた あとも かべの なかに のこらない ように もういちど
    var prev = [0, 0, 0];
    for (i = 0; i < bs.length; i++) {
      if (!bs[i].active) continue;
      prev[0] = bs[i].p[0]; prev[1] = bs[i].p[1]; prev[2] = bs[i].p[2];
      collideStatics(w, bs[i], prev, 0);
    }
    w.time += dt;
  }

  // ---- しらべる どうぐ ---------------------------------------------------
  // a → b の せんぶんが はこに あたる いちばん ちかい わりあい（0〜1）。あたらなければ 1
  function raycast(w, a, b, onlyOcc) {
    var best = 1;
    var d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    for (var i = 0; i < w.boxes.length; i++) {
      var bx = w.boxes[i];
      if (onlyOcc && !bx.occ) continue;
      var t0 = 0, t1 = best, ok = true;
      for (var k = 0; k < 3 && ok; k++) {
        if (Math.abs(d[k]) < 1e-9) {
          if (a[k] < bx.min[k] || a[k] > bx.max[k]) ok = false;
        } else {
          var ta = (bx.min[k] - a[k]) / d[k], tb = (bx.max[k] - a[k]) / d[k];
          if (ta > tb) { var s = ta; ta = tb; tb = s; }
          if (ta > t0) t0 = ta;
          if (tb < t1) t1 = tb;
          if (t0 > t1) ok = false;
        }
      }
      if (ok && t0 < best) best = t0;
    }
    return best;
  }
  // (x, z) で y より したに ある いちばん たかい ゆかの たかさ（かげを おく ため）
  function groundAt(w, x, z, y) {
    var h = -50, i;
    for (i = 0; i < w.boxes.length; i++) {
      var b = w.boxes[i];
      if (x >= b.min[0] && x <= b.max[0] && z >= b.min[2] && z <= b.max[2] && b.max[1] <= y + 0.05 && b.max[1] > h) h = b.max[1];
    }
    for (i = 0; i < w.ramps.length; i++) {
      var r = w.ramps[i];
      if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
        var rh = rampHeight(r, x, z);
        if (rh <= y + 0.05 && rh > h) h = rh;
      }
    }
    for (i = 0; i < w.cyls.length; i++) {
      var c = w.cyls[i];
      var dx = x - c.x, dz = z - c.z;
      if (dx * dx + dz * dz <= c.r * c.r && c.y1 <= y + 0.05 && c.y1 > h) h = c.y1;
    }
    for (i = 0; i < w.water.length; i++) {
      var q = w.water[i];
      if (x >= q.min[0] && x <= q.max[0] && z >= q.min[2] && z <= q.max[2] && q.max[1] <= y + 0.05 && q.max[1] > h) h = q.max[1];
    }
    return h;
  }
  // きゅう が うごかない ものに かさなって いるか
  function overlapStatic(w, p, r) {
    for (var i = 0; i < w.boxes.length; i++) {
      var b = w.boxes[i];
      var qx = clamp(p[0], b.min[0], b.max[0]), qy = clamp(p[1], b.min[1], b.max[1]), qz = clamp(p[2], b.min[2], b.max[2]);
      var dx = p[0] - qx, dy = p[1] - qy, dz = p[2] - qz;
      if (dx * dx + dy * dy + dz * dz < r * r) return b;
    }
    for (i = 0; i < w.cyls.length; i++) {
      var c = w.cyls[i];
      var ex = p[0] - c.x, ez = p[2] - c.z;
      if (p[1] + r > c.y0 && p[1] - r < c.y1 && Math.sqrt(ex * ex + ez * ez) < c.r + r) return c;
    }
    for (i = 0; i < w.ramps.length; i++) {
      var rp = w.ramps[i];
      if (p[0] >= rp.x0 && p[0] <= rp.x1 && p[2] >= rp.z0 && p[2] <= rp.z1) {
        var h = rampHeight(rp, p[0], p[2]);
        if (p[1] - r < h && p[1] > h - 1.2) return rp;
      }
    }
    return null;
  }

  return {
    STEP: STEP, createWorld: createWorld, addBox: addBox, addRamp: addRamp, addCyl: addCyl, addWater: addWater,
    addBody: addBody, removeBody: removeBody, step: step, raycast: raycast, groundAt: groundAt,
    overlapStatic: overlapStatic, rampHeight: rampHeight, waterAt: waterAt,
  };
})();
if (typeof module !== 'undefined') module.exports = Physics;
