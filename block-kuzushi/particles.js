/* ============================================================
   ドカーン ブロックくずし — かけら・ひばな・しょうげきは
   じょうげん つきの プール（Float32Array）。いっぱいの ときは あたらしい ものを すてる。
   けしたら さいごの ものと いれかえる（ならびかえ なし）ので 1000こ でも かるい
   ============================================================ */
(function (root) {
  "use strict";
  var MAX = 1000, MAX_RING = 48;
  var px = new Float32Array(MAX), py = new Float32Array(MAX), vx = new Float32Array(MAX), vy = new Float32Array(MAX);
  var life = new Float32Array(MAX), maxl = new Float32Array(MAX), size = new Float32Array(MAX), rot = new Float32Array(MAX), vr = new Float32Array(MAX);
  var col = new Uint8Array(MAX), kind = new Uint8Array(MAX);
  var n = 0;
  var rx = new Float32Array(MAX_RING), ry = new Float32Array(MAX_RING), rr = new Float32Array(MAX_RING), rl = new Float32Array(MAX_RING), rml = new Float32Array(MAX_RING);
  var rc = new Uint8Array(MAX_RING), rn = 0;
  var palette = [], palIndex = {};

  function color(css) {
    if (palIndex[css] === undefined) { palIndex[css] = palette.length; palette.push(css); }
    return palIndex[css];
  }

  function add(x, y, ux, uy, l, s, c, k) {
    if (n >= MAX) return;
    px[n] = x; py[n] = y; vx[n] = ux; vy[n] = uy; life[n] = l; maxl[n] = l; size[n] = s;
    rot[n] = Math.random() * 6.28; vr[n] = (Math.random() - 0.5) * 18; col[n] = c; kind[n] = k; n++;
  }

  // かけら: くるくる まわりながら おちる しかく
  function shards(x, y, count, c, spd, w, h) {
    w = w || 0; h = h || 0;
    for (var i = 0; i < count; i++) {
      var a = Math.random() * 6.283, s = spd * (0.35 + Math.random() * 0.75);
      add(x + (Math.random() - 0.5) * w, y + (Math.random() - 0.5) * h, Math.cos(a) * s, Math.sin(a) * s - spd * 0.35,
        0.6 + Math.random() * 0.6, 2.5 + Math.random() * 4, c, 0);
    }
  }
  // ひばな: ちいさく ひかって すぐ きえる（じゅうりょく よわめ）
  function sparks(x, y, count, c, spd) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * 6.283, s = spd * (0.3 + Math.random() * 0.8);
      add(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.25 + Math.random() * 0.35, 1.5 + Math.random() * 2, c, 1);
    }
  }
  // ほのお: うえへ のぼって ちいさく なる
  function flame(x, y, c) {
    add(x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 30, -40 - Math.random() * 40, 0.3 + Math.random() * 0.2, 3 + Math.random() * 3, c, 2);
  }
  function ring(x, y, r, c, l) {
    if (rn >= MAX_RING) return;
    rx[rn] = x; ry[rn] = y; rr[rn] = r; rl[rn] = l || 0.45; rml[rn] = l || 0.45; rc[rn] = c; rn++;
  }

  function update(dt) {
    for (var i = 0; i < n; i++) {
      life[i] -= dt;
      if (life[i] <= 0) {
        n--;
        if (i !== n) {
          px[i] = px[n]; py[i] = py[n]; vx[i] = vx[n]; vy[i] = vy[n]; life[i] = life[n]; maxl[i] = maxl[n];
          size[i] = size[n]; rot[i] = rot[n]; vr[i] = vr[n]; col[i] = col[n]; kind[i] = kind[n];
        }
        i--; continue;
      }
      var k = kind[i];
      if (k === 0) vy[i] += 620 * dt;
      else if (k === 1) { vy[i] += 120 * dt; vx[i] *= 0.97; vy[i] *= 0.97; }
      else { vx[i] *= 0.95; }
      px[i] += vx[i] * dt; py[i] += vy[i] * dt; rot[i] += vr[i] * dt;
    }
    for (var j = 0; j < rn; j++) {
      rl[j] -= dt;
      if (rl[j] <= 0) { rn--; rx[j] = rx[rn]; ry[j] = ry[rn]; rr[j] = rr[rn]; rl[j] = rl[rn]; rml[j] = rml[rn]; rc[j] = rc[rn]; j--; }
    }
  }

  function draw(ctx) {
    var lastC = -1, lastA = -1;
    for (var i = 0; i < n; i++) {
      var t = life[i] / maxl[i];
      var a = t > 0.5 ? 1 : Math.round(t * 2 * 8) / 8;          // ぬりかえを へらす
      if (a !== lastA) { ctx.globalAlpha = a; lastA = a; }
      if (col[i] !== lastC) { ctx.fillStyle = palette[col[i]]; lastC = col[i]; }
      var s = size[i], k = kind[i];
      if (k === 0) {
        var sw = s * Math.abs(Math.cos(rot[i])) + 0.8;
        ctx.fillRect(px[i] - sw / 2, py[i] - s / 2, sw, s);
      } else if (k === 1) {
        ctx.fillRect(px[i] - s / 2, py[i] - s / 2, s, s);
      } else {
        var fs = s * (0.4 + t * 0.6);
        ctx.fillRect(px[i] - fs / 2, py[i] - fs / 2, fs, fs);
      }
    }
    for (var j = 0; j < rn; j++) {
      var u = 1 - rl[j] / rml[j];
      var e = 1 - (1 - u) * (1 - u);
      ctx.globalAlpha = (1 - u) * 0.9;
      ctx.strokeStyle = palette[rc[j]];
      ctx.lineWidth = 2 + 7 * (1 - u);
      ctx.beginPath(); ctx.arc(rx[j], ry[j], 4 + rr[j] * e, 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function clear() { n = 0; rn = 0; }
  function count() { return n; }

  root.BKParticles = { MAX: MAX, color: color, shards: shards, sparks: sparks, flame: flame, ring: ring, update: update, draw: draw, clear: clear, count: count };
})(window);
