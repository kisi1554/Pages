/* きょうりゅう はっくつ — はっくつ（ハケ・ハンマー・ルーペ）
 *
 * 4まいの Canvas を かさねる: かせき（いちばん した）→ すな → いわ → ルーペ・こなごな
 * すなは ハケで なぞった ところを destination-out で けずる（マスク）。
 * ほねの ある マスを しらべて「どれだけ みえたか」を はかる。
 */
var DIG = (function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var W = 720, H = 460, CELL = 8;
  var cv = {}, cx = {}, sp, per, opt, tool = 'brush';
  var bones = [], boneGrid = null, gw = 0, gh = 0;
  var rocks = [], cracks = 0, lastHit = 0, done = false, dirty = false, pct = 0;
  var drag = null, loupeAt = null, parts = [], raf = 0, timer = 0, said = {};

  function init() {
    ['digFossil', 'digSand', 'digRock', 'digTop'].forEach(function (id) { cv[id] = $(id); cx[id] = cv[id].getContext('2d'); });
    var top = cv.digTop;
    top.addEventListener('pointerdown', down);
    top.addEventListener('pointermove', move);
    top.addEventListener('pointerup', up);
    top.addEventListener('pointercancel', up);
    top.addEventListener('pointerleave', up);
    Array.prototype.forEach.call(document.querySelectorAll('#toolBar .toolBtn'), function (b) {
      b.addEventListener('click', function () { setTool(b.getAttribute('data-tool')); SND.play('tap'); });
    });
  }
  function setTool(t) {
    tool = t;
    Array.prototype.forEach.call(document.querySelectorAll('#toolBar .toolBtn'), function (b) { b.classList.toggle('on', b.getAttribute('data-tool') === t); });
    if (t === 'hammer') say('いわを タップ！ トン…トン…と ゆっくり たたこう。はやく たたきすぎると かせきに ひびが はいるよ', 'hm');
    if (t === 'loupe') say('すなの うえを おさえると、したに ある ほねが うっすら みえるよ', 'lp');
  }
  function say(t, key) { if (key && said[key]) return; if (key) said[key] = 1; $('digMsg').innerHTML = UI.R(t); }

  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ===== はじめる ===== */
  function start(species, period, o) {
    sp = species; per = PERIODS[period]; opt = o || {};
    done = false; cracks = 0; pct = 0; rocks = []; parts = []; said = {}; lastHit = 0;
    var stage = $('digStage');
    var tall = stage.clientWidth < 600 && window.innerHeight > window.innerWidth;
    W = tall ? 480 : 720; H = tall ? 580 : 460;
    stage.style.aspectRatio = W + ' / ' + H;
    for (var k in cv) { cv[k].width = W; cv[k].height = H; }
    cv.digSand.style.transition = cv.digRock.style.transition = 'none';
    cv.digSand.style.opacity = cv.digRock.style.opacity = 1;
    drawFossil(tall);
    drawSand();
    placeRocks();
    drawRocks();
    cx.digTop.clearRect(0, 0, W, H);
    setTool('brush');
    $('digPeriod').innerHTML = UI.R(per.name + 'の ちそう');
    updStars(); $('digBar').style.width = '0%';
    say('ここは ' + per.name + 'の ' + per.soil + '（' + per.range + '）。🖌️ハケで なぞって すなを はらおう！');
  }

  // かせき（ほね）を いわの なかに かく
  function drawFossil(tall) {
    var c = cx.digFossil;
    c.fillStyle = per.dark; c.fillRect(0, 0, W, H);
    for (var i = 0; i < 900; i++) {
      c.fillStyle = 'rgba(' + (Math.random() < .5 ? '0,0,0' : '255,255,255') + ',' + rand(.04, .12) + ')';
      c.beginPath(); c.arc(rand(0, W), rand(0, H), rand(1, 4), 0, 7); c.fill();
    }
    var ang = (tall ? -Math.PI / 2 : 0) + rand(-.18, .18) * (Math.random() < .5 ? 1 : -1);
    var flip = Math.random() < .5;
    var bw = tall ? H * .86 : W * .86, bh = tall ? W * .78 : H * .78;
    var o = { mode: 'skel', bone: '#eedcb0', boneEdge: '#5a3f26', hole: '#4a3422', lwPx: 1.4, flip: flip };
    var paint = function (ctx) {
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(ang);
      ART.fit(ctx, sp, -bw / 2, -bh / 2, bw, bh, o);
      ctx.restore();
    };
    paint(c);
    // ほねの ある マス
    var m = document.createElement('canvas'); m.width = W; m.height = H;
    var mc = m.getContext('2d'); paint(mc);
    var d = mc.getImageData(0, 0, W, H).data;
    gw = Math.ceil(W / CELL); gh = Math.ceil(H / CELL);
    boneGrid = new Uint8Array(gw * gh); bones = [];
    for (var gy = 0; gy < gh; gy++) for (var gx = 0; gx < gw; gx++) {
      var hit = 0;
      for (var yy = 1; yy < CELL && !hit; yy += 3) for (var xx = 1; xx < CELL; xx += 3) {
        var px = gx * CELL + xx, py = gy * CELL + yy;
        if (px < W && py < H && d[(py * W + px) * 4 + 3] > 120) { hit = 1; break; }
      }
      if (hit) { boneGrid[gy * gw + gx] = 1; bones.push([gx * CELL + CELL / 2, gy * CELL + CELL / 2]); }
    }
  }
  function drawSand() {
    var c = cx.digSand;
    c.globalCompositeOperation = 'source-over';
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, per.color); g.addColorStop(1, ART.shade(per.color, -.12));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (var i = 0; i < 9; i++) { // しましま
      c.fillStyle = 'rgba(0,0,0,' + rand(.03, .08) + ')';
      var y = rand(0, H); c.fillRect(0, y, W, rand(6, 22));
    }
    for (i = 0; i < 2200; i++) {
      c.fillStyle = 'rgba(' + (Math.random() < .5 ? '90,60,30' : '255,250,230') + ',' + rand(.08, .25) + ')';
      c.fillRect(rand(0, W), rand(0, H), rand(1, 3), rand(1, 3));
    }
  }
  function placeRocks() {
    var n = W * H > 300000 ? 7 : 6, tries = 0;
    while (rocks.length < n && tries++ < 200) {
      var onBone = Math.random() < .65 && bones.length, p = onBone ? bones[Math.floor(Math.random() * bones.length)] : [rand(40, W - 40), rand(40, H - 40)];
      var r = rand(30, 44), ok = true;
      rocks.forEach(function (q) { if (Math.hypot(q.x - p[0], q.y - p[1]) < q.r + r - 10) ok = false; });
      if (!ok) continue;
      var pts = [], k = 9;
      for (var i = 0; i < k; i++) { var a = i / k * Math.PI * 2, rr = r * rand(.82, 1.08); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      rocks.push({ x: p[0], y: p[1], r: r, hp: 3, pts: pts, tone: rand(.42, .58), bone: overBone(p[0], p[1], r) });
    }
  }
  function overBone(x, y, r) {
    for (var i = 0; i < bones.length; i++) if (Math.hypot(bones[i][0] - x, bones[i][1] - y) < r * .9) return bones[i];
    return null;
  }
  function drawRocks() {
    var c = cx.digRock; c.clearRect(0, 0, W, H);
    rocks.forEach(function (r) {
      c.save(); c.translate(r.x, r.y);
      c.beginPath(); r.pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath();
      var v = Math.round(r.tone * 255), g = c.createRadialGradient(-r.r * .3, -r.r * .3, 2, 0, 0, r.r);
      g.addColorStop(0, 'rgb(' + (v + 50) + ',' + (v + 46) + ',' + (v + 40) + ')'); g.addColorStop(1, 'rgb(' + (v - 30) + ',' + (v - 32) + ',' + (v - 36) + ')');
      c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = '#3d362e'; c.stroke();
      c.strokeStyle = '#2a241e'; c.lineWidth = 2.5; c.lineCap = 'round';
      if (r.hp < 3) { c.beginPath(); c.moveTo(-r.r * .1, -r.r * .7); c.lineTo(r.r * .1, -r.r * .1); c.lineTo(-r.r * .2, r.r * .3); c.lineTo(0, r.r * .75); c.stroke(); }
      if (r.hp < 2) { c.beginPath(); c.moveTo(-r.r * .75, 0); c.lineTo(-r.r * .2, r.r * .05); c.lineTo(r.r * .3, -r.r * .25); c.lineTo(r.r * .8, -r.r * .1); c.stroke(); }
      c.restore();
    });
  }

  /* ===== さわる ===== */
  function pos(e) {
    var rc = cv.digTop.getBoundingClientRect();
    return [(e.clientX - rc.left) * W / rc.width, (e.clientY - rc.top) * H / rc.height];
  }
  function rockAt(p) {
    for (var i = rocks.length - 1; i >= 0; i--) if (Math.hypot(rocks[i].x - p[0], rocks[i].y - p[1]) < rocks[i].r) return rocks[i];
    return null;
  }
  function down(e) {
    if (done) return;
    e.preventDefault();
    SND.unlock();
    try { cv.digTop.setPointerCapture(e.pointerId); } catch (x) {}
    var p = pos(e);
    drag = p;
    if (tool === 'brush') { if (rockAt(p)) say('いわは ハケでは とれないよ。🔨ハンマーで わろう', 'rk'); brush(p, p); }
    else if (tool === 'hammer') hammer(p);
    else { loupeAt = p; SND.play('loupe'); loop(); }
  }
  function move(e) {
    if (!drag || done) return;
    e.preventDefault();
    var p = pos(e);
    if (tool === 'brush') brush(drag, p);
    else if (tool === 'loupe') { loupeAt = p; loop(); }
    drag = p;
  }
  function up() { drag = null; if (loupeAt) { loupeAt = null; loop(); } }

  function brush(a, b) {
    var c = cx.digSand, d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / 6));
    c.globalCompositeOperation = 'destination-out';
    for (var i = 0; i <= n; i++) {
      var x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n;
      if (rockAt([x, y])) continue;
      var g = c.createRadialGradient(x, y, 2, x, y, 26);
      g.addColorStop(0, 'rgba(0,0,0,.30)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 26, 0, 7); c.fill();
      if (Math.random() < .12) parts.push({ x: x, y: y, vx: rand(-1.5, 1.5), vy: rand(-2, -.5), life: 1, col: per.color, r: rand(1.5, 3) });
    }
    c.globalCompositeOperation = 'source-over';
    SND.play('brush');
    dirty = true; schedule(); loop();
  }
  function hammer(p) {
    var now = Date.now(), fast = now - lastHit < 330;
    var r = rockAt(p);
    if (r) {
      lastHit = now;
      if (fast && r.bone) { crack(r.bone[0], r.bone[1]); say('つよすぎ！ かせきに ひびが はいっちゃった。ゆっくり トン…トン…', null); }
      r.hp--; SND.play('hammer');
      for (var i = 0; i < 8; i++) parts.push({ x: p[0], y: p[1], vx: rand(-3, 3), vy: rand(-4, -1), life: 1, col: '#7a736a', r: rand(2, 4) });
      if (r.hp <= 0) {
        rocks.splice(rocks.indexOf(r), 1); SND.play('rock');
        for (i = 0; i < 14; i++) parts.push({ x: r.x + rand(-r.r, r.r) * .6, y: r.y + rand(-r.r, r.r) * .6, vx: rand(-3, 3), vy: rand(-4, 0), life: 1, col: '#8a8378', r: rand(3, 6) });
        say(rocks.length ? 'いわが われた！ のこり ' + rocks.length + 'こ' : 'いわは ぜんぶ われたよ！ あとは ハケで きれいに しよう');
      }
      drawRocks(); dirty = true; schedule(); loop();
      return;
    }
    // いわが ない ところ
    var gx = Math.floor(p[0] / CELL), gy = Math.floor(p[1] / CELL);
    var a = cx.digSand.getImageData(Math.min(W - 1, Math.max(0, Math.round(p[0]))), Math.min(H - 1, Math.max(0, Math.round(p[1]))), 1, 1).data[3];
    if (boneNear(gx, gy) && a < 110) { crack(p[0], p[1]); say('ほねを たたいちゃった！ でてきた ほねは 🖌️ハケで やさしく ね', null); }
    else { SND.play('hammer'); say('すなは 🖌️ハケで はらおう。ハンマーは いわ だけ', 'sd'); }
  }
  function boneNear(gx, gy) {
    for (var y = gy - 1; y <= gy + 1; y++) for (var x = gx - 1; x <= gx + 1; x++) if (x >= 0 && y >= 0 && x < gw && y < gh && boneGrid[y * gw + x]) return true;
    return false;
  }
  function crack(x, y) {
    cracks++; SND.play('crack');
    var c = cx.digFossil; c.save(); c.strokeStyle = '#2b1d12'; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y);
    var px = x, py = y;
    for (var i = 0; i < 5; i++) { px += rand(-9, 9); py += rand(-9, 9); c.lineTo(px, py); }
    c.moveTo(x, y); c.lineTo(x + rand(-12, 12), y + rand(-12, 12));
    c.stroke(); c.restore();
    updStars();
  }
  function stars() { return Math.max(1, 3 - cracks); }
  function updStars() { var s = stars(); $('digStars').textContent = '★★★'.slice(0, s) + '☆☆☆'.slice(0, 3 - s); }

  /* ===== どれだけ みえたか ===== */
  function schedule() { if (!timer) timer = setTimeout(measure, 220); }
  function measure() {
    timer = 0;
    if (!dirty || done || !bones.length) return;
    dirty = false;
    var d = cx.digSand.getImageData(0, 0, W, H).data, seen = 0;
    for (var i = 0; i < bones.length; i++) {
      var b = bones[i];
      if (d[(Math.round(b[1]) * W + Math.round(b[0])) * 4 + 3] < 90 && !rockAt(b)) seen++;
    }
    pct = seen / bones.length;
    $('digBar').style.width = Math.min(100, pct / .85 * 100) + '%';
    if (pct > .08) say('ほねが みえてきた！ この ちょうし', 'b1');
    if (pct > .5) say('はんぶん いじょう でてきたよ！ いわの したも わすれずに', 'b2');
    if (pct >= .85) finish();
  }
  function finish() {
    done = true;
    SND.play('found');
    cv.digSand.style.transition = cv.digRock.style.transition = 'opacity 1s';
    cv.digSand.style.opacity = cv.digRock.style.opacity = 0;
    $('digBar').style.width = '100%';
    say('ほりだせた！ どんな いきものの ほね かな？');
    setTimeout(function () { if (opt.onDone) opt.onDone({ stars: stars(), cracks: cracks }); }, 1300);
  }

  /* ===== ルーペ・こなごな ===== */
  function loop() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame() {
    raf = 0;
    var c = cx.digTop; c.clearRect(0, 0, W, H);
    parts = parts.filter(function (q) { return q.life > 0; });
    parts.forEach(function (q) {
      q.x += q.vx; q.y += q.vy; q.vy += .25; q.life -= .04;
      c.globalAlpha = Math.max(0, q.life); c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 7); c.fill();
    });
    c.globalAlpha = 1;
    if (loupeAt) {
      var R = 74, x = loupeAt[0], y = loupeAt[1] - 80, z = 1.6;
      if (y < R + 4) y = loupeAt[1] + 80;
      c.save(); c.beginPath(); c.arc(x, y, R, 0, 7); c.clip();
      c.translate(x, y); c.scale(z, z); c.translate(-loupeAt[0], -loupeAt[1]);
      c.drawImage(cv.digFossil, 0, 0);
      c.globalAlpha = .35; c.drawImage(cv.digSand, 0, 0); c.drawImage(cv.digRock, 0, 0);
      c.restore();
      c.lineWidth = 8; c.strokeStyle = '#6b4a2a'; c.beginPath(); c.arc(x, y, R, 0, 7); c.stroke();
      c.lineWidth = 3; c.strokeStyle = '#fff'; c.beginPath(); c.arc(x, y, R - 6, -2.4, -1.6); c.stroke();
      c.lineWidth = 12; c.strokeStyle = '#6b4a2a'; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x + R * .72, y + R * .72); c.lineTo(x + R * 1.05, y + R * 1.05); c.stroke();
    }
    if (parts.length) loop();
  }

  // テスト用（いわの いちと W・H を みる だけ）
  function debug() { return { W: W, H: H, rocks: rocks.map(function (r) { return [r.x, r.y]; }), pct: pct }; }

  return { init: init, start: start, debug: debug };
})();
