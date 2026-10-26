/* きょうりゅう はっくつ — くみたて（ほねの パズル → にくづけ → いろ → うごいて なく）
 *
 * ART で ほねを 1ピースずつ べつの Canvas に かいて きりぬき、
 * もとの いち（かげ）の ちかくで はなすと「かちっ」と はまる。
 */
var BUILD = (function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var cvs, c, dpr = 1, CW = 0, CH = 0, sp, M, opt = {};
  var board, tray, fitS = 1, fitX = 0, fitY = 0, land = false;
  var pieces = [], drag = null, phase = 'off', t0 = 0, raf = 0, hint = null;
  var walkX = 0, walkDir = 1, ph = 0, roarT = -9, lastStep = 0, active = false;

  function init() {
    cvs = $('buildCanvas'); c = cvs.getContext('2d');
    cvs.addEventListener('pointerdown', down);
    cvs.addEventListener('pointermove', move);
    cvs.addEventListener('pointerup', up);
    cvs.addEventListener('pointercancel', up);
    $('btnHint').addEventListener('click', showHint);
    window.addEventListener('resize', function () { if (active && phase === 'puzzle') layout(false); else if (active) layout(false); });
  }

  function start(species, o) {
    sp = species; opt = o || {}; M = ART.build(sp);
    phase = 'puzzle'; pieces = []; drag = null; hint = null; active = true;
    $('buildName').innerHTML = UI.R(sp.name);
    $('buildDone').hidden = true;
    $('btnHint').hidden = false;
    msg('ほねを ドラッグして、うすい かげの ところに はめよう！');
    layout(true);
    loop();
  }
  function stop() { active = false; phase = 'off'; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function msg(t) { $('buildMsg').innerHTML = UI.R(t); }

  /* ===== ばしょ わり ===== */
  function layout(fresh) {
    var stage = $('buildStage');
    var w = stage.clientWidth || 360;
    land = window.innerWidth > window.innerHeight && w > 640;
    var h = land ? Math.min(w * .62, Math.max(340, window.innerHeight - 290)) : Math.min(w * 1.4, Math.max(460, window.innerHeight - 250));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    CW = w; CH = Math.round(h);
    stage.style.height = CH + 'px';
    cvs.width = Math.round(CW * dpr); cvs.height = Math.round(CH * dpr);
    if (land) { board = { x: 0, y: 0, w: CW * .68, h: CH }; tray = { x: CW * .68, y: 0, w: CW * .32, h: CH }; }
    else { board = { x: 0, y: 0, w: CW, h: CH * .5 }; tray = { x: 0, y: CH * .5, w: CW, h: CH * .5 }; }
    var pad = .07;
    fitS = Math.min(board.w * (1 - pad * 2) / M.bb.w, board.h * (1 - pad * 2 - .06) / M.bb.h);
    fitX = board.x + board.w / 2;
    fitY = board.y + board.h / 2 + (M.bb.y0 + M.bb.y1) / 2 * fitS + board.h * .03;
    var old = {}; pieces.forEach(function (p) { old[p.id] = p.placed; });
    pieces = M.pieces.map(function (id) { return cut(id); }).filter(Boolean);
    pieces.forEach(function (p) { if (!fresh && old[p.id]) p.placed = true; });
    trayLayout(fresh);
    count();
  }
  // 1ピースを かいて、すきまを きりおとす
  function cut(id) {
    var off = document.createElement('canvas');
    off.width = Math.round(CW * dpr); off.height = Math.round(CH * dpr);
    var o = off.getContext('2d'); o.scale(dpr, dpr);
    ART.draw(o, sp, fitX, fitY, fitS, { mode: 'skel', only: id, lwPx: 1.5 });
    var d = o.getImageData(0, 0, off.width, off.height).data, W = off.width, H = off.height;
    var x0 = W, x1 = -1, y0 = H, y1 = -1;
    for (var y = 0; y < H; y += 2) for (var x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 10) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < 0) return null;
    x0 = Math.max(0, x0 - 3); y0 = Math.max(0, y0 - 3); x1 = Math.min(W - 1, x1 + 3); y1 = Math.min(H - 1, y1 + 3);
    var img = document.createElement('canvas'); img.width = x1 - x0 + 1; img.height = y1 - y0 + 1;
    img.getContext('2d').drawImage(off, x0, y0, img.width, img.height, 0, 0, img.width, img.height);
    return { id: id, img: img, w: img.width / dpr, h: img.height / dpr, tx: x0 / dpr, ty: y0 / dpr, x: 0, y: 0, sc: 1, placed: false };
  }
  function trayLayout(shuffle) {
    var free = pieces.filter(function (p) { return !p.placed; });
    if (shuffle !== false) for (var i = free.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = free[i]; free[i] = free[j]; free[j] = t; }
    var n = Math.max(1, free.length), cols = land ? (n > 10 ? 3 : 2) : (n > 12 ? 5 : 4), rows = Math.ceil(n / cols);
    var cw = tray.w / cols, ch = (tray.h - 22) / rows;
    free.forEach(function (p, k) {
      var cx = tray.x + cw * (k % cols + .5), cy = tray.y + 22 + ch * (Math.floor(k / cols) + .5);
      p.sc = Math.min(1, cw * .86 / p.w, ch * .86 / p.h);
      p.hx = cx; p.hy = cy; // もどる ばしょ（まんなか）
      p.x = cx - p.w * p.sc / 2; p.y = cy - p.h * p.sc / 2;
    });
  }
  function count() {
    var n = pieces.filter(function (p) { return p.placed; }).length;
    $('buildCount').textContent = '🦴 ' + n + ' / ' + pieces.length;
    return n;
  }

  /* ===== さわる ===== */
  function pos(e) { var r = cvs.getBoundingClientRect(); return [(e.clientX - r.left) * CW / r.width, (e.clientY - r.top) * CH / r.height]; }
  function down(e) {
    if (phase === 'move') { roar(); return; }
    if (phase !== 'puzzle') return;
    e.preventDefault(); SND.unlock();
    var p = pos(e);
    for (var i = pieces.length - 1; i >= 0; i--) {
      var q = pieces[i];
      if (q.placed) continue;
      var w = q.w * q.sc, h = q.h * q.sc, padd = 8;
      if (p[0] > q.x - padd && p[0] < q.x + w + padd && p[1] > q.y - padd && p[1] < q.y + h + padd) {
        var u = (p[0] - q.x) / w, v = (p[1] - q.y) / h;
        q.sc = 1;
        drag = { q: q, u: u, v: v };
        q.x = p[0] - u * q.w; q.y = p[1] - v * q.h;
        pieces.splice(i, 1); pieces.push(q); // いちばん うえに
        try { cvs.setPointerCapture(e.pointerId); } catch (x) {}
        SND.play('pick');
        return;
      }
    }
  }
  function move(e) {
    if (!drag) return;
    e.preventDefault();
    var p = pos(e), q = drag.q;
    q.x = p[0] - drag.u * q.w; q.y = p[1] - drag.v * q.h;
  }
  function up() {
    if (!drag) return;
    var q = drag.q; drag = null;
    var dx = (q.x + q.w / 2) - (q.tx + q.w / 2), dy = (q.y + q.h / 2) - (q.ty + q.h / 2);
    var tol = Math.max(30, Math.min(board.w, board.h) * .11);
    if (Math.hypot(dx, dy) < tol) {
      q.placed = true; q.x = q.tx; q.y = q.ty; q.flash = performance.now();
      SND.play('snap');
      if (hint && hint.q === q) hint = null;
      var n = count();
      if (n >= pieces.length) complete();
      else msg(['かちっ！ ぴったり！', 'いいね！ あと ' + (pieces.length - n) + 'こ', 'その ちょうし！'][n % 3]);
    } else {
      SND.play('tap');
      q.sc = Math.min(1, q.sc0 || 1);
      trayLayout(false);
      msg('おしい！ かたちの にて いる かげを さがそう');
    }
  }
  function showHint() {
    if (phase !== 'puzzle') return;
    var free = pieces.filter(function (p) { return !p.placed; });
    if (!free.length) return;
    hint = { q: free[Math.floor(Math.random() * free.length)], t: performance.now() };
    SND.play('tap');
    msg('ひかって いる ほねを、ひかって いる かげへ！');
  }

  /* ===== かんせい → にくづけ → いろ → うごく ===== */
  function complete() {
    phase = 'flesh'; t0 = performance.now();
    $('btnHint').hidden = true;
    SND.play('fanfare');
    msg('ほねが ぜんぶ そろった！ にくを つけて みよう…');
    walkX = 0; walkDir = 1; ph = 0;
    if (opt.onBuilt) opt.onBuilt();
  }
  function roar() { roarT = performance.now(); SND.play('roar', sp.voice || .5); }
  function finishPanel() {
    var d = $('buildDone');
    d.innerHTML = '<p class="voiceNote">🔊 「こんな こえ かも？」… ほんとうの なきごえは わかって いないよ。</p>' +
      '<div class="row">' +
      '<button class="smallBtn" id="bdRoar">🦖 もういちど なく</button>' +
      '<button class="smallBtn" id="bdDig">⛏️ もっと ほる</button>' +
      '<button class="smallBtn" id="bdZukan">📖 ずかんを みる</button></div>';
    d.hidden = false;
    $('bdRoar').onclick = roar;
    $('bdDig').onclick = function () { if (opt.onNext) opt.onNext('layers'); };
    $('bdZukan').onclick = function () { if (opt.onNext) opt.onNext('zukan', sp.id); };
  }

  /* ===== えがく ===== */
  function loop() { if (!raf && active) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    if (!active) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, CW, CH);
    // じめん
    var g = c.createLinearGradient(0, 0, 0, board.h);
    g.addColorStop(0, '#fbf3df'); g.addColorStop(1, '#efe0bc');
    c.fillStyle = g; c.fillRect(board.x, board.y, board.w, board.h);
    c.fillStyle = '#d8c59a'; c.fillRect(board.x, fitY, board.w, 3);
    if (phase === 'puzzle') drawPuzzle(now);
    else drawLive(now);
    loop();
  }
  function drawPuzzle(now) {
    ART.draw(c, sp, fitX, fitY, fitS, { mode: 'flesh', sil: '#e9dcbc' });
    // かげ（まだ はまって いない ほね）
    pieces.forEach(function (q) {
      if (q.placed) return;
      var hl = (drag && drag.q === q) || (hint && hint.q === q);
      c.globalAlpha = hl ? .45 + .25 * Math.sin(now / 150) : .2;
      c.drawImage(q.img, q.tx, q.ty, q.w, q.h);
      if (hl) { c.globalAlpha = .35; c.strokeStyle = '#f59f00'; c.lineWidth = 3; c.setLineDash([6, 5]); c.strokeRect(q.tx - 4, q.ty - 4, q.w + 8, q.h + 8); c.setLineDash([]); }
    });
    c.globalAlpha = 1;
    // トレイ
    c.fillStyle = '#e6d3a6'; c.fillRect(tray.x, tray.y, tray.w, tray.h);
    c.fillStyle = '#7a5a3a'; c.font = 'bold 14px sans-serif'; c.textBaseline = 'top';
    c.fillText('🦴 ほり だした ほね', tray.x + 10, tray.y + 5);
    pieces.forEach(function (q) {
      if (q.placed) {
        c.drawImage(q.img, q.tx, q.ty, q.w, q.h);
        if (q.flash && now - q.flash < 500) { c.globalAlpha = 1 - (now - q.flash) / 500; c.fillStyle = '#fff59a'; c.beginPath(); c.arc(q.tx + q.w / 2, q.ty + q.h / 2, 10 + (now - q.flash) / 12, 0, 7); c.fill(); c.globalAlpha = 1; }
      }
    });
    pieces.forEach(function (q) {
      if (q.placed) return;
      var w = q.w * q.sc, h = q.h * q.sc, bob = hint && hint.q === q ? Math.sin(now / 120) * 4 : 0;
      if (drag && drag.q === q) { c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 10; c.shadowOffsetY = 6; }
      c.drawImage(q.img, q.x, q.y + bob, w, h);
      c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    });
    if (hint && now - hint.t > 3500) hint = null;
  }
  function drawLive(now) {
    var t = (now - t0) / 1000;
    var a1 = Math.min(1, t / 1.3), a2 = Math.max(0, Math.min(1, (t - 1.5) / 1.3));
    var walking = t > 3;
    if (walking) {
      if (phase !== 'move') { phase = 'move'; roar(); finishPanel(); msg('うごいた！ ' + sp.name + ' が いきかえったみたい！ タップすると なくよ'); }
      var span = Math.max(0, (board.w - M.bb.w * fitS) / 2 - 8);
      var sp_ = M.t.free ? .6 : .9;
      walkX += walkDir * sp_; if (walkX > span) { walkX = span; walkDir = -1; } if (walkX < -span) { walkX = -span; walkDir = 1; }
      var prev = ph; ph += .09;
      if (!M.t.free && Math.floor(prev / Math.PI) !== Math.floor(ph / Math.PI)) SND.play('step', Math.min(1, sp.len / 15));
    }
    var rt = (now - roarT) / 1000, mouth = rt >= 0 && rt < 1.2 ? Math.sin(Math.PI * rt / 1.2) : 0;
    var o = { ph: ph, w: walking ? 1 : 0, t: t, mouth: mouth, flip: walkDir < 0 && walking };
    var x = fitX + walkX;
    if (a2 < 1) {
      ART.draw(c, sp, fitX, fitY, fitS, { mode: 'skel', lwPx: 1.5 });
      o.alpha = a1 * .9; o.sil = '#d9897a';
      ART.draw(c, sp, fitX, fitY, fitS, o);
      if (t > 1.5) { o.alpha = a2; o.sil = undefined; ART.draw(c, sp, fitX, fitY, fitS, o); }
      if (t > 1.5 && t < 1.6) msg('いろを ぬって… <small>（いろは そうぞう だよ）</small>');
    } else {
      ART.draw(c, sp, x, fitY, fitS, o);
    }
    if (mouth > 0) { // こえの マーク
      c.fillStyle = 'rgba(80,60,40,' + mouth + ')'; c.font = 'bold 22px sans-serif'; c.textBaseline = 'middle';
      c.fillText('〜♪', Math.min(board.w - 50, x + M.bb.w * fitS * .35), fitY - M.bb.h * fitS - 6 > 20 ? fitY - M.bb.h * fitS - 6 : 24);
    }
  }

  // テスト用（ピースの いちを みる だけ）
  function debug() { return { CW: CW, CH: CH, pieces: pieces.map(function (p) { return { id: p.id, placed: p.placed, x: p.x, y: p.y, w: p.w * p.sc, h: p.h * p.sc, tx: p.tx, ty: p.ty, fw: p.w, fh: p.h }; }) }; }

  return { init: init, start: start, stop: stop, debug: debug };
})();
