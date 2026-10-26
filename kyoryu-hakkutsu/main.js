/* きょうりゅう はっくつ — がめんの きりかえ・ずかん・おおきさくらべ・ねんぴょう */
var UI = (function () {
  'use strict';
  // 「漢字{かんじ}」→ ふりがな
  function R(s) { return String(s).replace(/([一-鿿々]+)\{([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>'); }
  // ふりがなを とった よみ（canvas の もじ よう）
  function plain(s) { return String(s).replace(/([一-鿿々]+)\{([^}]+)\}/g, '$2'); }
  var tt = 0;
  function toast(t) {
    var el = document.getElementById('toast');
    el.innerHTML = R(t); el.hidden = false;
    clearTimeout(tt); tt = setTimeout(function () { el.hidden = true; }, 2600);
  }
  return { R: R, plain: plain, toast: toast };
})();

(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var R = UI.R;
  var KEY = 'kyoryu-hakkutsu-v1';

  /* ===== ほぞん ===== */
  var st = { found: {}, snd: true, last: null };
  try {
    var s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') { st.found = s.found || {}; st.snd = s.snd !== false; st.last = s.last || null; }
  } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function rec(id) { return st.found[id]; }

  /* ===== がめん ===== */
  var PARENT = { layers: 'home', dig: 'layers', build: 'layers', zukan: 'home', compare: 'home', timeline: 'home', parents: 'home' };
  var TITLES = { home: '🦖 きょうりゅう はっくつ', layers: '⛏️ どこを ほる？', dig: '⛏️ はっくつ', build: '🦴 くみたて', zukan: '📖 ずかん', compare: '📏 おおきさ くらべ', timeline: '⏳ ねんぴょう', parents: 'ほごしゃの かたへ' };
  var cur = 'home', buildBack = 'layers', homeRaf = 0;
  function show(id) {
    Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (el) { el.hidden = el.id !== id; });
    if (cur === 'build' && id !== 'build') BUILD.stop();
    cur = id;
    $('title').textContent = TITLES[id];
    $('btnBack').hidden = id === 'home';
    window.scrollTo(0, 0);
    if (id === 'home') renderHome();
    if (id === 'layers') renderLayers();
    if (id === 'zukan') renderZukan();
    if (id === 'compare') renderCompare();
    if (id === 'timeline') renderTimeline();
  }
  $('btnBack').addEventListener('click', function () { SND.play('tap'); show(cur === 'build' ? buildBack : PARENT[cur] || 'home'); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (b) {
    b.addEventListener('click', function () { SND.unlock(); SND.play('tap'); show(b.getAttribute('data-go')); });
  });
  function updSnd() { $('btnSnd').classList.toggle('off', !st.snd); $('btnSnd').firstChild.textContent = st.snd ? '🔊' : '🔇'; SND.setOn(st.snd); }
  $('btnSnd').addEventListener('click', function () { st.snd = !st.snd; save(); updSnd(); SND.play('tap'); });
  updSnd();

  /* ===== シート ===== */
  var sheetRaf = 0;
  function openSheet(html) { $('sheetBody').innerHTML = html; $('sheet').hidden = false; }
  function closeSheet() { $('sheet').hidden = true; if (sheetRaf) cancelAnimationFrame(sheetRaf); sheetRaf = 0; }
  $('sheetClose').addEventListener('click', function () { SND.play('tap'); closeSheet(); });

  // canvas を こまかく（たかい がそど）
  function prep(cv) {
    var d = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 300, h = cv.clientHeight || 150;
    cv.width = Math.round(w * d); cv.height = Math.round(h * d);
    var c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
    return { c: c, w: w, h: h };
  }
  // ずかんでの みえかた: くみたてた → いろ、ほった → ほね、まだ → かげ
  function drawState(c, sp, x, y, w, h, o) {
    var r = rec(sp.id); o = o || {};
    if (r && r.built) return ART.fit(c, sp, x, y, w, h, o);
    if (r) { o.mode = 'skel'; o.lwPx = 1.2; return ART.fit(c, sp, x, y, w, h, o); }
    o.sil = '#b3a78e'; return ART.fit(c, sp, x, y, w, h, o);
  }
  function maTxt(ma) {
    var man = Math.round(ma * 100);
    if (man < 100) return 'やく ' + man + 'まん ねんまえ';
    var oku = Math.floor(man / 10000), rest = man % 10000;
    return 'やく ' + (oku ? oku + 'おく' : '') + (rest ? rest + 'まん' : '') + ' ねんまえ';
  }
  function starTxt(n) { return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); }
  function foundCount(list) { return list.filter(function (d) { return rec(d.id); }).length; }

  /* ===== ホーム ===== */
  var heroes = ['trex', 'brachio', 'trike'];
  function renderHome() {
    $('homeCount').innerHTML = 'きょうりゅう ' + foundCount(DINOS) + ' / ' + DINOS.length;
    var cv = $('homeArt'), t0 = performance.now();
    var P = prep(cv);
    if (homeRaf) cancelAnimationFrame(homeRaf);
    (function frame(now) {
      if (cur !== 'home') { homeRaf = 0; return; }
      var t = (now - t0) / 1000, c = P.c, w = P.w, h = P.h, gy = h * .6 + 4;
      c.clearRect(0, 0, w, h);
      // がけ
      var cx0 = w * .74;
      ['#7cc04a', '#e3cf9f', '#d39a68', '#a65f43'].forEach(function (col, i) {
        c.fillStyle = col; var y0 = i ? h * .18 + (i - 1) * h * .27 + 10 : h * .12, hh = i ? h * .27 : 12;
        c.beginPath(); c.moveTo(cx0 + 14 - i * 6, y0); c.lineTo(w, y0); c.lineTo(w, y0 + hh); c.lineTo(cx0 + 8 - i * 6 - 6, y0 + hh); c.closePath(); c.fill();
      });
      var size = h * .5;
      ART.fit(c, BY_ID.brachio, w * .30, gy - size * 1.15, size * 1.1, size * 1.15, { ph: t * 3, w: .6, t: t, pad: .02 });
      ART.fit(c, BY_ID.trex, w * .02, gy - size * .62, size * 1.05, size * .62, { ph: t * 5, w: .9, t: t, pad: .02 });
      ART.fit(c, BY_ID.trike, w * .48, gy - size * .5, size * .85, size * .5, { ph: t * 4 + 1, w: .7, t: t, pad: .02, flip: true });
      homeRaf = requestAnimationFrame(frame);
    })(t0);
  }

  /* ===== がけ ===== */
  function renderLayers() {
    var html = '<div class="soilTop">🌱 いまの つち</div>';
    PERIOD_ORDER.forEach(function (k) {
      var p = PERIODS[k], list = ALL.filter(function (d) { return d.period === k; });
      html += '<button class="stratum" data-per="' + k + '" style="background:repeating-linear-gradient(0deg,' + p.color + ' 0 18px,' + ART.shade(p.color, -.07) + ' 18px 24px);' + (k === 'T' ? 'color:#fff' : '') + '">' +
        '<span><h3>' + R(p.name) + '</h3><p>' + p.range + '</p><p>' + p.soil + '</p></span>' +
        '<span class="cnt">🦴 ' + foundCount(list) + ' / ' + list.length + '<small>みつけた</small></span></button>';
    });
    $('cliff').innerHTML = html;
    Array.prototype.forEach.call(document.querySelectorAll('.stratum'), function (b) {
      b.addEventListener('click', function () { SND.unlock(); SND.play('tap'); startDig(b.getAttribute('data-per')); });
    });
  }

  /* ===== はっくつ ===== */
  function pickFossil(per) {
    var dinos = DINOS.filter(function (d) { return d.period === per; }), others = OTHERS.filter(function (d) { return d.period === per; });
    var nd = dinos.filter(function (d) { return !rec(d.id); }), no = others.filter(function (d) { return !rec(d.id); });
    var r = Math.random();
    if (no.length && (r < .25 || !nd.length)) return no[Math.floor(Math.random() * no.length)];
    if (nd.length) return nd[Math.floor(Math.random() * nd.length)];
    var all = dinos.concat(others);
    return all[Math.floor(Math.random() * all.length)];
  }
  function startDig(per) {
    var sp = pickFossil(per);
    show('dig');
    DIG.start(sp, per, { onDone: function (res) { foundFossil(sp, res); } });
  }
  function foundFossil(sp, res) {
    var r = st.found[sp.id], first = !r;
    if (!r) r = st.found[sp.id] = { stars: 0, built: false, n: 0 };
    r.n++; r.stars = Math.max(r.stars, res.stars); st.last = sp.id; save();
    var p = PERIODS[sp.period];
    var html = '<div class="result"><div class="big">' + starTxt(res.stars) + '</div>' +
      '<canvas id="resArt"></canvas>' +
      '<h2>' + R(sp.name) + (sp.jp ? '（' + R(sp.jp) + '）' : '') + ' の かせきだ！</h2>' +
      (sp.other ? '<p class="note">' + R(sp.kind) + ' は <b>きょうりゅうの なかま じゃない</b> けど、おなじ じだいに いた いきもの だよ。</p>' : '') +
      '<p>' + R(p.name) + '（' + maTxt(sp.ma) + '）の ちそうから でてきたよ。<br><b>したの ちそう ほど むかし</b> なんだ。</p>' +
      (res.cracks ? '<p>ひびが ' + res.cracks + 'かしょ。つぎは ハンマーを ゆっくり つかおう！</p>' : '<p>ひび なし！ じょうずに ほれたね。</p>') +
      (first ? '<p>📖 ずかんに のったよ！</p>' : '') +
      '<div class="row" style="justify-content:center"><button class="smallBtn" id="resBuild">🦴 ほねを くみたてる</button></div></div>';
    openSheet(html);
    var P = prep($('resArt'));
    ART.fit(P.c, sp, 0, 0, P.w, P.h, { mode: 'skel', lwPx: 1.2 });
    $('resBuild').onclick = function () { SND.play('tap'); closeSheet(); startBuild(sp, 'layers'); };
  }
  function startBuild(sp, back) {
    buildBack = back || 'layers';
    show('build');
    BUILD.start(sp, {
      onBuilt: function () { var r = st.found[sp.id] || (st.found[sp.id] = { stars: 1, built: false, n: 1 }); r.built = true; save(); },
      onNext: function (to, id) { show(to); if (id) openDetail(BY_ID[id]); }
    });
  }

  /* ===== ずかん ===== */
  var shelf = 'dino', filt = 'all';
  function renderZukan() {
    $('zukanTabs').innerHTML =
      '<button data-shelf="dino" class="' + (shelf === 'dino' ? 'on' : '') + '">🦖 きょうりゅう ' + foundCount(DINOS) + '/' + DINOS.length + '</button>' +
      '<button data-shelf="other" class="' + (shelf === 'other' ? 'on' : '') + '">🐟 なかま じゃない いきもの ' + foundCount(OTHERS) + '/' + OTHERS.length + '</button>';
    Array.prototype.forEach.call($('zukanTabs').children, function (b) { b.onclick = function () { shelf = b.getAttribute('data-shelf'); SND.play('tap'); renderZukan(); }; });
    var chips = [['all', 'ぜんぶ'], ['K', R(PERIODS.K.name)], ['J', R(PERIODS.J.name)], ['T', R(PERIODS.T.name)], ['jp', '🗾 にほん']];
    $('zukanChips').innerHTML = chips.map(function (c) { return '<button data-f="' + c[0] + '" class="' + (filt === c[0] ? 'on' : '') + '">' + c[1] + '</button>'; }).join('');
    Array.prototype.forEach.call($('zukanChips').children, function (b) { b.onclick = function () { filt = b.getAttribute('data-f'); SND.play('tap'); renderZukan(); }; });
    $('zukanNote').innerHTML = shelf === 'dino'
      ? '🐦 <b>とりは きょうりゅうの しそん（なかま）</b>なんだ。はねの ある きょうりゅうも いたよ。<br>ほった ほねを くみたてると いろが つくよ（いろは そうぞう）。'
      : 'ここは <b>きょうりゅうの なかま じゃない</b> けど、おなじ じだいに いた いきものの たな。そらを とぶ ' + R('翼竜{よくりゅう}') + '、うみの ' + R('首長竜{くびながりゅう}') + ' や モササウルス など。';
    var list = (shelf === 'dino' ? DINOS : OTHERS).filter(function (d) {
      return filt === 'all' || (filt === 'jp' ? d.japan : d.period === filt);
    });
    $('zukanCards').innerHTML = list.map(function (d) {
      var r = rec(d.id);
      return '<button class="card' + (r ? '' : ' no') + '" data-id="' + d.id + '"><canvas></canvas>' +
        '<span class="nm">' + (r ? R(d.name) : '？？？') + '</span>' +
        '<span class="sub">' + R(PERIODS[d.period].name) + (r ? ' ' + starTxt(r.stars) : '') + '</span>' +
        (d.japan ? '<span class="jp">にほん</span>' : '') + '</button>';
    }).join('') || '<p>この なかまは いないよ</p>';
    Array.prototype.forEach.call($('zukanCards').children, function (b) {
      var d = BY_ID[b.getAttribute('data-id')]; if (!d) return;
      var P = prep(b.querySelector('canvas'));
      drawState(P.c, d, 0, 0, P.w, P.h);
      b.onclick = function () { SND.play('tap'); openDetail(d); };
    });
  }
  function openDetail(d) {
    var r = rec(d.id), p = PERIODS[d.period];
    var html = '<div class="detail"><h2>' + (r ? R(d.name) + (d.jp ? ' <small>（' + R(d.jp) + '）</small>' : '') : '？？？') + '</h2><canvas class="art" id="detArt"></canvas>';
    if (!r) {
      html += '<p class="say">まだ みつけて いないよ。<b>' + R(p.name) + 'の ちそう</b> を ほって みよう！</p>';
    } else {
      var diet = DIET[d.diet];
      html += '<table class="facts">' +
        (d.other ? '<tr><th>なかま</th><td>' + R(d.kind) + '<br><b>きょうりゅうの なかま じゃない</b> けど、おなじ じだいの いきもの</td></tr>' : '') +
        '<tr><th>じだい</th><td>' + R(p.name) + '（' + maTxt(d.ma) + '）</td></tr>' +
        '<tr><th>おおきさ</th><td>' + (d.other ? '' : 'ぜんちょう ') + R(d.lenTxt) + '<br>たいじゅう ' + R(d.wt) + '</td></tr>' +
        '<tr><th>たべもの</th><td>' + diet.icon + ' ' + diet.name + (d.food ? '（' + d.food + '）' : '') + '</td></tr>' +
        '<tr><th>みつかった くに</th><td>' + R(d.country) + '</td></tr>' +
        '<tr><th>ひとこと</th><td>' + R(d.note) + '</td></tr>' +
        '<tr><th>はっくつ</th><td>' + starTxt(r.stars) + '（' + r.n + 'かい）' + (r.built ? '' : ' ・ まだ くみたてて いないよ') + '</td></tr></table>' +
        '<div class="row">' + (r.built ? '<button class="smallBtn" id="detRoar">🔊 なきごえ</button>' : '') +
        '<button class="smallBtn" id="detBuild">🦴 ' + (r.built ? 'もういちど くみたてる' : 'くみたてる') + '</button>' +
        '<button class="smallBtn" id="detSize">📏 おおきさ くらべ</button></div>' +
        (r.built ? '<p class="voiceNote">なきごえは「こんな こえ かも？」。ほんとうの こえは わかって いないよ。</p>' : '');
    }
    html += '</div>';
    openSheet(html);
    var P = prep($('detArt')), t0 = performance.now(), roarT = -9;
    if ($('detRoar')) $('detRoar').onclick = function () { roarT = performance.now(); SND.play('roar', d.voice || .5); };
    if ($('detBuild')) $('detBuild').onclick = function () { closeSheet(); startBuild(d, 'zukan'); };
    if ($('detSize')) $('detSize').onclick = function () { closeSheet(); cmpSel = d.id; show('compare'); };
    (function frame(now) {
      if ($('sheet').hidden || !document.body.contains(P.c.canvas)) { sheetRaf = 0; return; }
      var t = (now - t0) / 1000, rt = (now - roarT) / 1000;
      P.c.clearRect(0, 0, P.w, P.h);
      var live = r && r.built;
      drawState(P.c, d, 0, P.h * .02, P.w, P.h * .92, live ? { ph: t * 4, w: .8, t: t, mouth: rt >= 0 && rt < 1.2 ? Math.sin(Math.PI * rt / 1.2) : 0 } : {});
      if (live) sheetRaf = requestAnimationFrame(frame); else sheetRaf = 0;
    })(t0);
  }

  /* ===== おおきさ くらべ ===== */
  var cmpSel = null;
  function renderCompare() {
    if (!cmpSel) cmpSel = st.last || 'trex';
    $('comparePick').innerHTML = ALL.map(function (d) {
      return '<button data-id="' + d.id + '" class="' + (d.id === cmpSel ? 'on' : '') + '">' + R(d.name) + '</button>';
    }).join('');
    Array.prototype.forEach.call($('comparePick').children, function (b) {
      b.onclick = function () { cmpSel = b.getAttribute('data-id'); SND.play('tap'); renderCompare(); };
    });
    var on = $('comparePick').querySelector('.on');
    if (on) $('comparePick').scrollLeft = on.offsetLeft - 40;
    drawCompare();
  }
  function drawCompare() {
    var sp = BY_ID[cmpSel], M = ART.build(sp), mpu = ART.mPerUnit(sp);
    var cv = $('compareCanvas'), W = cv.parentNode.clientWidth - 12, pad = 14;
    var dW = M.bb.w * mpu, dH = M.bb.h * mpu;
    var row3 = 11 + 1.2 + 6.5 + 1.2 + .5 + .6 + .4;
    var lab = 40, top = 26, maxH = Math.max(380, window.innerHeight - 250);
    var ppm = Math.min((W - pad * 2) / Math.max(dW, 20, row3), (maxH - top - lab * 3 - 30) / (Math.max(dH, 2) + 4 + 3.4));
    var h1 = Math.max(dH, 2) * ppm + lab + top, h2 = 4 * ppm + lab, h3 = 3.4 * ppm + lab;
    var H = Math.round(h1 + h2 + h3 + 14);
    cv.style.height = H + 'px';
    var P = prep(cv), c = P.c;
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    c.textBaseline = 'top'; c.font = '13px sans-serif';
    function ground(y) { c.fillStyle = '#d9c9a0'; c.fillRect(pad - 4, y, W - pad * 2 + 8, 3); }
    function label(x, y, t1, t2) { c.fillStyle = '#3b2a1a'; c.font = 'bold 14px sans-serif'; c.fillText(t1, x, y + 6); c.font = '12px sans-serif'; c.fillStyle = '#6a5a4a'; c.fillText(t2, x, y + 23); }
    var y = h1;
    // 1だんめ: きょうりゅう
    var s = ppm * mpu;
    var drawn = rec(sp.id) && rec(sp.id).built ? {} : { sil: '#8f8370' };
    ART.draw(c, sp, pad + M.bb.w * s / 2, y - lab + M.bb.y0 * s, s, drawn);
    ground(y - lab);
    label(pad, y - lab, UI.plain(sp.name), (sp.other ? '' : 'ぜんちょう ') + UI.plain(sp.lenTxt));
    // ものさし（5m ごと）
    c.fillStyle = '#8a7a6a'; c.fillRect(pad, 18, W - pad * 2, 1.5); c.font = '11px sans-serif';
    for (var m = 0; m * ppm <= W - pad * 2 + 1; m += 5) { c.fillRect(pad + m * ppm, m % 10 ? 13 : 9, 1.5, m % 10 ? 6 : 10); if (m % 10 === 0) c.fillText(m + 'm', pad + m * ppm + 3, 2); }
    // 2だんめ: でんしゃ
    y += h2; ground(y - lab);
    drawTrain(c, pad, y - lab, ppm);
    label(pad, y - lab, 'でんしゃ 1りょう', 'やく 20m');
    // 3だんめ: バス・ゾウ・ひと
    y += h3; ground(y - lab);
    var x = pad;
    drawBus(c, x, y - lab, ppm); label(x, y - lab, 'バス', 'やく 11m'); x += 12.2 * ppm;
    drawElephant(c, x, y - lab, ppm); label(x, y - lab, 'ゾウ', 'やく 6〜7m'); x += 7.7 * ppm;
    drawPerson(c, x, y - lab, ppm, 1.7, '#3f6fb0'); drawPerson(c, x + .9 * ppm, y - lab, ppm, 1.2, '#e8590c');
    label(Math.min(x, W - pad - 66), y - lab, 'ひと', '1.7m・1.2m');
    var L = sp.len;
    var times = L / 20;
    $('compareMsg').innerHTML = R(sp.name + ' は ' + sp.lenTxt + '。<br>' +
      (times >= 1 ? '電車{でんしゃ} 1りょうの やく <b>' + (Math.round(times * 10) / 10) + 'ばい</b>！' : '電車{でんしゃ} 1りょうより みじかい（やく <b>' + Math.max(1, Math.round(times * 10)) + 'わり</b>）。') +
      ' おとなが よこに ねて ならぶと やく <b>' + Math.max(1, Math.round(L / 1.7)) + 'にん</b> ぶん。') +
      '<br><small>※ おおきさは だいたい。けんきゅうで かわるよ。</small>';
  }
  function drawTrain(c, x, gy, k) {
    var L = 20 * k, H = 3.7 * k, y = gy - H - .5 * k;
    c.fillStyle = '#e8eef2'; c.strokeStyle = '#4a5560'; c.lineWidth = 1.5;
    rr(c, x, y, L, H, Math.max(2, .5 * k)); c.fill(); c.stroke();
    c.fillStyle = '#2f9e44'; c.fillRect(x, y + H * .62, L, H * .12);
    c.fillStyle = '#9fc8e8';
    for (var i = 0; i < 8; i++) c.fillRect(x + (1.2 + i * 2.35) * k, y + H * .18, 1.5 * k, H * .32);
    c.fillStyle = '#333'; [2.5, 4, 16, 17.5].forEach(function (w) { c.beginPath(); c.arc(x + w * k, gy - .45 * k, .45 * k, 0, 7); c.fill(); });
  }
  function drawBus(c, x, gy, k) {
    var L = 11 * k, H = 2.9 * k, y = gy - H - .35 * k;
    c.fillStyle = '#ffd43b'; c.strokeStyle = '#7a5a10'; c.lineWidth = 1.5;
    rr(c, x, y, L, H, Math.max(2, .4 * k)); c.fill(); c.stroke();
    c.fillStyle = '#9fc8e8'; for (var i = 0; i < 5; i++) c.fillRect(x + (.6 + i * 2) * k, y + H * .15, 1.6 * k, H * .35);
    c.fillStyle = '#333'; [2, 8.8].forEach(function (w) { c.beginPath(); c.arc(x + w * k, gy - .5 * k, .5 * k, 0, 7); c.fill(); });
  }
  function drawElephant(c, x, gy, k) {
    c.fillStyle = '#9aa0a6'; c.strokeStyle = '#4a4f55'; c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(x + 3 * k, gy - 2.1 * k, 2.6 * k, 1.3 * k, 0, 0, 7); c.fill(); c.stroke();
    [1.3, 2.2, 3.8, 4.6].forEach(function (w) { c.fillRect(x + w * k, gy - 1.6 * k, .6 * k, 1.6 * k); });
    c.beginPath(); c.arc(x + 5.6 * k, gy - 2.7 * k, .9 * k, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x + 6.3 * k, gy - 2.6 * k); c.quadraticCurveTo(x + 6.9 * k, gy - 1.5 * k, x + 6.5 * k, gy - .5 * k); c.lineWidth = Math.max(2, .35 * k); c.strokeStyle = '#9aa0a6'; c.stroke();
    c.fillStyle = '#7d848a'; c.beginPath(); c.ellipse(x + 5.1 * k, gy - 2.6 * k, .5 * k, .8 * k, 0, 0, 7); c.fill();
  }
  function drawPerson(c, x, gy, k, h, col) {
    var hd = h * .13 * k;
    c.fillStyle = '#f1c9a5'; c.beginPath(); c.arc(x + .25 * k, gy - h * k + hd, hd, 0, 7); c.fill();
    c.fillStyle = col; c.fillRect(x + .25 * k - hd * .9, gy - h * k + hd * 2, hd * 1.8, h * k * .42);
    c.fillStyle = '#444'; c.fillRect(x + .25 * k - hd * .7, gy - h * k * .45, hd * .6, h * k * .45); c.fillRect(x + .25 * k + hd * .1, gy - h * k * .45, hd * .6, h * k * .45);
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  /* ===== ねんぴょう ===== */
  function renderTimeline() {
    var PX = 12, pad = 30, X = function (ma) { return pad + (252 - ma) * PX; }, W = X(0) + 200;
    var tl = $('tl'); tl.style.width = W + 'px';
    var html = '';
    PERIOD_ORDER.slice().reverse().forEach(function (k) {
      var p = PERIODS[k];
      html += '<div class="tlBand" style="left:' + X(p.from) + 'px;width:' + (p.from - p.to) * PX + 'px;background:' + p.color + '55"><h3>' + R(p.name) + '</h3><p>' + p.range + '</p></div>';
    });
    html += '<div class="tlBand" style="left:' + X(66) + 'px;width:' + (66 * PX + 200) + 'px;background:#d8f0ff88"><h3>ほにゅうるいの じだい</h3><p>やく 6600まん ねんまえ 〜 いま</p></div>';
    html += '<div class="tlLine" style="left:' + X(66) + 'px"></div>';
    // いきもの（かさならない ように だんを わける）
    var lanes = [], items = ALL.slice().sort(function (a, b) { return b.ma - a.ma; });
    items.forEach(function (d) {
      var x = X(d.ma) - 43, L = 0;
      while (lanes[L] !== undefined && lanes[L] > x - 4) L++;
      lanes[L] = x + 86;
      html += '<button class="tlItem" data-id="' + d.id + '" style="left:' + x + 'px;top:' + (62 + L * 76) + 'px"><canvas></canvas>' + (rec(d.id) ? R(d.name) : '？？？') + '</button>';
    });
    EVENTS.forEach(function (e, i) {
      var x = Math.min(X(e.ma) - 10, W - 160);
      html += '<div class="tlEv' + (e.big ? ' big' : '') + '" style="left:' + x + 'px;bottom:' + (8 + (i % 2) * 70) + 'px"><b>' + e.icon + '</b>' + e.text + '</div>';
    });
    html += '<div class="tlLine" style="left:' + X(0) + 'px;background:#1971c2"></div>';
    tl.innerHTML = html;
    var maxL = lanes.length;
    tl.style.height = Math.max(430, 62 + maxL * 76 + 160) + 'px';
    Array.prototype.forEach.call(tl.querySelectorAll('.tlItem'), function (b) {
      var d = BY_ID[b.getAttribute('data-id')], P = prep(b.querySelector('canvas'));
      drawState(P.c, d, 0, 0, P.w, P.h);
      b.onclick = function () { SND.play('tap'); openDetail(d); };
    });
    $('tlMsg').innerHTML = '☄️ やく 6600まん ねんまえ、おおきな いんせきが ぶつかって、とり いがいの きょうりゅうは いなく なったよ。<br>' +
      '🧒 <b>ひとが うまれたのは ずっと あと</b>。きょうりゅうが いなくなって から 6000まん ねんいじょう たってから なんだ。<br>' +
      '📅 もし さんじょうきの はじめから いままでを 1ねん（1がつ1にち → 12がつ31にち）に すると、いまの ひとが うまれたのは <b>12がつ31にちの おひるすぎ</b>！';
  }

  /* ===== ほごしゃ ===== */
  $('btnReset').addEventListener('click', function () {
    if (!confirm('ずかんと きろくを ぜんぶ けします。よろしいですか？')) return;
    st.found = {}; st.last = null; save(); UI.toast('きろくを けしました'); show('home');
  });

  window.addEventListener('resize', function () {
    if (cur === 'compare') drawCompare();
    if (cur === 'home') renderHome();
  });

  DIG.init();
  BUILD.init();
  show('home');
})();
