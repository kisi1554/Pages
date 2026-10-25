/* ============================================================
   ドカーン ブロックくずし — ボールの うごき（えがかない じゅんすいな けいさん）
   - 1フレームを サブステップに わけて うごかす（1ステップ ≦ はんけいの はんぶん）
     → はやい ボールでも ブロック（あつさ 16）を すりぬけない
   - まる と しかく の いちばん ちかい てん で はねる むき（法線）を きめる
     → かど に あたると ななめに、たいらな めんは まっすぐ はねかえる
   - いちど に かさなった ブロックは いちばん ふかく めりこんだ ものから じゅんに しょり
     （L じの くぼみ に はいると 2かい はねて もどってくる）
   - はねた あとは すいへい から さいてい MIN_ANGLE を たもつ（よこに ずっと おうふく しない）
   ============================================================ */
(function (root) {
  "use strict";
  var MIN_ANGLE = 16 * Math.PI / 180;
  var SIN_MIN = Math.sin(MIN_ANGLE), COS_MIN = Math.cos(MIN_ANGLE);
  var PADDLE_MAX = 62 * Math.PI / 180;   // パドルの はし に あたった ときの かたむき（たてから）

  var hit = { nx: 0, ny: 0, pen: 0, px: 0, py: 0 };

  // まる (cx,cy,r) と しかく (x,y,w,h)。かさなって いれば hit に いれて true
  function circleRect(cx, cy, r, x, y, w, h) {
    var px = cx < x ? x : cx > x + w ? x + w : cx;
    var py = cy < y ? y : cy > y + h ? y + h : cy;
    var dx = cx - px, dy = cy - py, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return false;
    hit.px = px; hit.py = py;
    if (d2 > 1e-9) {
      var d = Math.sqrt(d2);
      hit.nx = dx / d; hit.ny = dy / d; hit.pen = r - d;
    } else {
      // まんなかが しかくの なかに はいった（うごく ものに おされた とき）: いちばん ちかい めんへ
      var l = cx - x, rr = x + w - cx, t = cy - y, b = y + h - cy, m = Math.min(l, rr, t, b);
      hit.nx = m === l ? -1 : m === rr ? 1 : 0;
      hit.ny = hit.nx ? 0 : m === t ? -1 : 1;
      hit.pen = r + m;
    }
    return true;
  }

  // すいへいに ちかすぎる むきを なおす（dx,dy は たんい ベクトル）
  function fixAngle(b) {
    if (Math.abs(b.dy) < SIN_MIN) {
      b.dy = (b.dy > 0 ? 1 : -1) * SIN_MIN;
      b.dx = (b.dx < 0 ? -1 : 1) * COS_MIN;
    }
    var l = Math.hypot(b.dx, b.dy) || 1;
    b.dx /= l; b.dy /= l;
  }

  // パドルの どこに あたったか で むきを きめる（はしほど ななめ）
  function paddleDir(b, pad) {
    var off = (b.x - (pad.x + pad.w / 2)) / (pad.w / 2 + b.r);
    off = off < -1 ? -1 : off > 1 ? 1 : off;
    var a = off * PADDLE_MAX;
    b.dx = Math.sin(a); b.dy = -Math.cos(a);
    return off;
  }

  var cand = [];
  function collideBlocks(b, world) {
    for (var iter = 0; iter < 4; iter++) {
      cand.length = 0;
      world.query(b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r, cand);
      var best = null, bp = 0, bnx = 0, bny = 0, bpx = 0, bpy = 0;
      for (var i = 0; i < cand.length; i++) {
        var k = cand[i];
        if (k.dead || !circleRect(b.x, b.y, b.r, k.x, k.y, k.w, k.h)) continue;
        var into = b.dx * hit.nx + b.dy * hit.ny < 0;
        if (!into && !k.moving) continue;
        if (into && world.mode(b, k) === "pass") { world.hit(b, k, hit.nx, hit.ny, hit.px, hit.py, "pass"); continue; }
        if (hit.pen > bp) { best = k; bp = hit.pen; bnx = hit.nx; bny = hit.ny; bpx = hit.px; bpy = hit.py; }
      }
      if (!best) return;
      var dot = b.dx * bnx + b.dy * bny;
      b.x += bnx * (bp + 0.01); b.y += bny * (bp + 0.01);
      if (dot < 0) {
        b.dx -= 2 * dot * bnx; b.dy -= 2 * dot * bny;
        world.hit(b, best, bnx, bny, bpx, bpy, "bounce");
        b.bounced = true;
      }
    }
  }

  // ボール 1こを dt びょう すすめる
  // world: { W, H, top, mul, paddle:{x,y,w,h}, bar:{y}|null, query, mode, hit, onWall, onPaddle, onBar, onLost }
  function step(b, world, dt) {
    var v = b.spd * world.mul;
    var n = Math.max(1, Math.ceil(v * dt / (b.r * 0.5)));
    var sdt = dt / n, pad = world.paddle;
    for (var s = 0; s < n; s++) {
      b.x += b.dx * v * sdt; b.y += b.dy * v * sdt;
      b.bounced = false;
      var wall = false;
      if (b.x < b.r) { b.x = b.r; if (b.dx < 0) { b.dx = -b.dx; wall = true; } }
      else if (b.x > world.W - b.r) { b.x = world.W - b.r; if (b.dx > 0) { b.dx = -b.dx; wall = true; } }
      if (b.y < world.top + b.r) { b.y = world.top + b.r; if (b.dy < 0) { b.dy = -b.dy; wall = true; } }
      if (wall) { b.bounced = true; if (world.onWall) world.onWall(b); }
      collideBlocks(b, world);
      if (pad && b.dy > 0 && circleRect(b.x, b.y, b.r, pad.x, pad.y, pad.w, pad.h) && b.y < pad.y + pad.h * 0.5) {
        b.y = pad.y - b.r - 0.01;
        paddleDir(b, pad);
        if (world.onPaddle) world.onPaddle(b);
        if (b.stuck) return;
        continue;          // パドルの むきは そのまま（さいてい かくど より ずっと たて）
      }
      if (world.bar && b.dy > 0 && b.y + b.r > world.bar.y) {
        b.y = world.bar.y - b.r; b.dy = -b.dy; b.bounced = true;
        if (world.onBar) world.onBar(b);
      }
      if (b.bounced) fixAngle(b);
      if (b.y > world.H + b.r * 2) { b.dead = true; if (world.onLost) world.onLost(b); return; }
      if (b.dead) return;
    }
  }

  var api = { MIN_ANGLE: MIN_ANGLE, PADDLE_MAX: PADDLE_MAX, circleRect: circleRect, hit: hit, fixAngle: fixAngle, paddleDir: paddleDir, step: step };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BKPhysics = api;
})(typeof window !== "undefined" ? window : globalThis);
