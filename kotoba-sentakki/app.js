/* ことばの せんたくき の 画面 */
(function () {
  'use strict';
  var G = Ladder.build(WORDS);
  var chars = Ladder.chars;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'kotoba-sentakki-v1';

  // ---- 保存 ----
  var save = { solved: {}, stars: {}, zukan: {}, sound: true, voice: true, len: 2 };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { var s = JSON.parse(raw); if (s && typeof s === 'object') Object.keys(save).forEach(function (k) { if (k in s) save[k] = s[k]; }); }
  } catch (e) { /* むし */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* むし */ } }
  Sound.on = save.sound; Sound.voice = save.voice;

  // ---- 50おん（行ごとに いろ）----
  var ROWS = [
    ['あ', 'あいうえお', '#e03131'], ['か', 'かきくけこ', '#f76707'], ['さ', 'さしすせそ', '#f59f00'],
    ['た', 'たちつてと', '#66a80f'], ['な', 'なにぬねの', '#2f9e44'],
    ['は', 'はひふへほ', '#0ca678'], ['ま', 'まみむめも', '#1098ad'], ['や', 'や ゆ よ', '#1c7ed6'],
    ['ら', 'らりるれろ', '#4263eb'], ['わ', 'わ を ん', '#7048e8'],
    ['が', 'がぎぐげご', '#ae3ec9'], ['ざ', 'ざじずぜぞ', '#d6336c'], ['だ', 'だぢづでど', '#c2255c'],
    ['ば', 'ばびぶべぼ', '#a61e4d'], ['ぱ', 'ぱぴぷぺぽ', '#e8590c'], ['ちいさい', 'ゃゅょっ ', '#5c940d'],
  ];
  var PAGES = [{ name: 'あ〜の', rows: [0, 1, 2, 3, 4] }, { name: 'は〜ん', rows: [5, 6, 7, 8, 9] }, { name: 'が・ぱ・ゃ', rows: [10, 11, 12, 13, 14, 15] }];
  var PAGE_OF = {};
  PAGES.forEach(function (p, pi) { p.rows.forEach(function (r) { chars(ROWS[r][1]).forEach(function (c) { if (c !== ' ') PAGE_OF[c] = pi; }); }); });

  // ---- じょうたい ----
  var st = {
    screen: 'home', mode: null, puzzle: null, len: save.len || 2,
    word: '', path: [], sel: -1, pending: null, busy: false, hint: 0, hintStep: null,
    palPage: 0, created: 0, newWords: 0,
  };

  // ---- 画面きりかえ ----
  function show(name) {
    st.screen = name;
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.toggle('on', s.id === 's-' + name); });
    closePal(); closeClear();
    var t = { home: '🫧 ことばの せんたくき', list: '🧺 もんだい', free: '🌀 じゆう せんたく', zukan: '📗 ずかん' }[name];
    if (t) $('ttl').textContent = t;
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { Sound.unlock(); Sound.tap(); var g = b.dataset.go; render[g](); show(g); });
  });
  $('b-home').addEventListener('click', function () { Sound.tap(); Sound.rumbleStop(); st.busy = false; show('home'); });
  function syncToggles() {
    $('b-snd').textContent = Sound.on ? '🔊' : '🔇';
    $('b-snd').classList.toggle('off', !Sound.on);
    $('b-voice').textContent = Sound.voice ? '🗣️' : '🤐';
    $('b-voice').classList.toggle('off', !Sound.voice);
  }
  $('b-snd').addEventListener('click', function () { Sound.on = !Sound.on; save.sound = Sound.on; store(); syncToggles(); Sound.tap(); });
  $('b-voice').addEventListener('click', function () { Sound.voice = !Sound.voice; save.voice = Sound.voice; store(); syncToggles(); if (Sound.voice) Sound.say('よみあげ オン'); });
  syncToggles();

  function tabs(el, cur, onPick) {
    el.innerHTML = '';
    [2, 3, 4].forEach(function (n) {
      var b = document.createElement('button');
      b.className = 'tab' + (n === cur ? ' on' : '');
      b.setAttribute('role', 'tab');
      b.dataset.len = n;
      b.textContent = n + 'もじ';
      b.addEventListener('click', function () { Sound.tap(); st.len = n; save.len = n; store(); onPick(n); });
      el.appendChild(b);
    });
  }
  function wordCard(w, cls) {
    var d = document.createElement('div');
    d.className = 'wcard ' + (cls || '');
    var e = G.emoji[w];
    d.innerHTML = (e ? '<span class="e">' + e + '</span>' : '<span class="e none">🔤</span>') + '<span class="w">' + w + '</span>';
    return d;
  }
  function addZukan(w) {
    if (save.zukan[w]) return false;
    save.zukan[w] = 1; store();
    return true;
  }

  var render = {};
  // ---- もんだい いちらん ----
  render.list = function () {
    tabs($('list-tabs'), st.len, render.list);
    var ps = PUZZLES.filter(function (p) { return p.len === st.len; });
    var done = ps.filter(function (p) { return save.solved[p.id]; }).length;
    var stars = ps.filter(function (p) { return save.stars[p.id]; }).length;
    $('list-sum').textContent = 'とけた ' + done + ' / ' + ps.length + '　🌟 ' + stars;
    var g = $('list-grid'); g.innerHTML = '';
    ps.forEach(function (p, i) {
      var b = document.createElement('button');
      b.className = 'qbtn' + (save.solved[p.id] ? ' done' : '');
      b.dataset.id = p.id;
      var e1 = G.emoji[p.start] || '💬', e2 = G.emoji[p.goal] || '💬';
      b.innerHTML = '<span class="no">' + (i + 1) + '</span><span class="ee">' + e1 + '<i>→</i>' + e2 + '</span>' +
        '<span class="ww">' + p.start + '→' + p.goal + '</span>' +
        '<span class="mk">' + (save.stars[p.id] ? '🌟' : save.solved[p.id] ? '✔️' : '') + '</span>';
      b.addEventListener('click', function () { Sound.tap(); startPuzzle(p); });
      g.appendChild(b);
    });
  };

  // ---- じゆう せんたく ----
  render.free = function () {
    tabs($('free-tabs'), st.len, render.free);
    var pool = G.byLen[st.len].filter(function (w) { return G.nb[w].length && G.emoji[w]; });
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    var g = $('free-grid'); g.innerHTML = '';
    pool.slice(0, 8).forEach(function (w) {
      var b = document.createElement('button');
      b.className = 'wbtn';
      b.dataset.word = w;
      b.appendChild(wordCard(w));
      b.addEventListener('click', function () { Sound.tap(); startFree(w); });
      g.appendChild(b);
    });
  };
  $('b-shuffle').addEventListener('click', function () { Sound.tap(); render.free(); });

  // ---- ずかん ----
  render.zukan = function () {
    tabs($('zukan-tabs'), st.len, render.zukan);
    var ws = G.byLen[st.len].filter(function (w) { return G.nb[w].length; });
    var got = ws.filter(function (w) { return save.zukan[w]; }).length;
    $('zukan-sum').textContent = 'あつめた ことば ' + got + ' / ' + ws.length;
    var g = $('zukan-grid'); g.innerHTML = '';
    ws.forEach(function (w) {
      var d;
      if (save.zukan[w]) {
        d = wordCard(w, 'z');
        d.addEventListener('click', function () { Sound.say(w); });
      } else {
        d = document.createElement('div');
        d.className = 'wcard z locked';
        d.innerHTML = '<span class="e">❔</span><span class="w">' + '？'.repeat(st.len) + '</span>';
      }
      g.appendChild(d);
    });
  };

  // ---- あそぶ ----
  function startPuzzle(p) {
    st.mode = 'puzzle'; st.puzzle = p; st.len = p.len;
    begin(p.start);
    var no = PUZZLES.filter(function (x) { return x.len === p.len; }).indexOf(p) + 1;
    $('ttl').textContent = '🧺 ' + p.len + 'もじ の ' + no + 'もんめ';
    say(p.start + ' から ' + p.goal + ' に へんしん させよう');
  }
  function startFree(w) {
    st.mode = 'free'; st.puzzle = null; st.len = chars(w).length;
    st.created = 0; st.newWords = 0;
    begin(w);
    $('ttl').textContent = '🌀 じゆう せんたく';
    say(w + ' から はじめよう');
  }
  function begin(w) {
    st.word = w; st.path = [w]; st.sel = -1; st.pending = null; st.busy = false; st.hint = 0; st.hintStep = null;
    addZukan(w);
    show('play');
    $('ttl').textContent = '';
    $('b-end').hidden = st.mode !== 'free';
    drawPlay();
    setMsg(st.mode === 'free' ? 'かえたい もじを タップしてね' : 'かえたい もじを タップしてね');
  }
  function say(t) { Sound.say(t); }
  function setMsg(t, cls) { var m = $('msg'); m.textContent = t; m.className = 'msg' + (cls ? ' ' + cls : ''); }

  function drawRoute() {
    var r = $('route'); r.innerHTML = '';
    if (st.mode === 'puzzle') {
      var p = st.puzzle;
      var a = wordCard(p.start, 'start'); a.insertAdjacentHTML('afterbegin', '<span class="tag">スタート</span>');
      var b = wordCard(p.goal, 'goal'); b.insertAdjacentHTML('afterbegin', '<span class="tag">ゴール</span>');
      r.appendChild(a);
      r.insertAdjacentHTML('beforeend', '<span class="arrow">➡️</span>');
      r.appendChild(b);
      r.insertAdjacentHTML('beforeend', '<div class="count"><b id="steps">' + (st.path.length - 1) + '</b>て<small>さいたん ' + p.min + 'て</small></div>');
    } else {
      r.innerHTML = '<div class="count free">へんしん <b id="steps">' + (st.path.length - 1) + '</b>かい<small>あたらしい ことば ' + st.newWords + 'こ</small></div>';
    }
  }
  function drawTrail() {
    var t = $('trail'); t.innerHTML = '';
    st.path.forEach(function (w, i) {
      if (i) t.insertAdjacentHTML('beforeend', '<i>›</i>');
      var s = document.createElement('span');
      s.className = 'chip' + (i === st.path.length - 1 ? ' cur' : '');
      s.textContent = (G.emoji[w] ? G.emoji[w] + ' ' : '') + w;
      t.appendChild(s);
    });
    t.scrollLeft = t.scrollWidth;
  }
  function drawTiles() {
    var box = $('tiles'); box.innerHTML = '';
    var cs = chars(st.word);
    $('door').style.setProperty('--n', cs.length);
    var goalCs = st.mode === 'puzzle' ? chars(st.puzzle.goal) : null;
    cs.forEach(function (c, i) {
      var b = document.createElement('button');
      b.className = 'tile';
      b.dataset.i = i;
      var shown = (st.pending && st.pending.index === i) ? st.pending.ch : c;
      b.textContent = shown;
      if (st.sel === i) b.classList.add('sel');
      if (st.pending && st.pending.index === i) b.classList.add('new');
      if (goalCs && goalCs[i] === shown) b.classList.add('ok');
      if (st.hint >= 1 && st.hintStep && st.hintStep.index === i) b.classList.add('hint');
      b.setAttribute('aria-label', (i + 1) + 'もじめ ' + shown);
      box.appendChild(b);
    });
    var e = G.emoji[st.word];
    $('pic').textContent = e || '';
    $('pic').classList.toggle('none', !e);
    $('lcd').textContent = String(st.path.length - 1).padStart(2, '0');
  }
  function drawPlay() {
    drawRoute(); drawTrail(); drawTiles();
    $('b-spin').disabled = !st.pending || st.busy;
    $('b-undo').disabled = st.path.length < 2 || st.busy;
    $('b-hint').disabled = st.busy;
    $('machine').classList.toggle('ready', !!st.pending && !st.busy);
  }

  // ---- もじを えらぶ ----
  var drag = null;
  $('door').addEventListener('pointerdown', function (e) {
    if (st.busy || st.screen !== 'play') return;
    Sound.unlock();
    var r = $('door').getBoundingClientRect();
    drag = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, x: e.clientX, y: e.clientY, moved: false, a: 0, total: 0, bub: 0, id: e.pointerId, tile: e.target.closest('.tile') };
    drag.a = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx);
    try { $('door').setPointerCapture(e.pointerId); } catch (err) { /* むし */ }
  });
  $('door').addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 14) drag.moved = true;
    if (!drag.moved) return;
    if (!st.pending) return;
    var a = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx);
    var d = a - drag.a;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    drag.a = a; drag.total += d;
    $('drum').style.transform = 'rotate(' + (drag.total * 180 / Math.PI) + 'deg)';
    var deg = Math.abs(drag.total) * 180 / Math.PI;
    if (deg - drag.bub > 35) { drag.bub = deg; bubbles(2); Sound.bubble(); }
    if (deg >= 330) { var dd = drag; drag = null; spin(dd.total > 0 ? 1 : -1); }
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    if (!d.moved && d.tile) pickTile(Number(d.tile.dataset.i));
    else if (d.moved && !st.pending) setMsg('まず かえたい もじを タップしてね');
    else if (d.moved) { $('drum').style.transform = ''; setMsg('もっと ぐるっと まわしてね！'); }
  }
  $('door').addEventListener('pointerup', endDrag);
  $('door').addEventListener('pointercancel', function (e) { if (drag && e.pointerId === drag.id) { drag = null; $('drum').style.transform = ''; } });
  // キーボード
  $('tiles').addEventListener('keydown', function (e) {
    var t = e.target.closest('.tile');
    if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickTile(Number(t.dataset.i)); }
  });

  function pickTile(i) {
    if (st.busy) return;
    Sound.tap();
    if (st.pending && st.pending.index !== i) st.pending = null;
    st.sel = i;
    drawPlay();
    openPal();
  }

  // ---- 50おんの シート ----
  function openPal() {
    var cur = (st.pending && st.pending.index === st.sel) ? st.pending.ch : chars(st.word)[st.sel];
    if (st.hint >= 2 && st.hintStep && st.hintStep.index === st.sel) st.palPage = PAGE_OF[st.hintStep.ch];
    else if (PAGE_OF[cur] != null && !st.palOpened) st.palPage = PAGE_OF[cur];
    st.palOpened = true;
    drawPal();
    $('pal').classList.add('on');
    $('pal').setAttribute('aria-hidden', 'false');
  }
  function closePal() {
    $('pal').classList.remove('on');
    $('pal').setAttribute('aria-hidden', 'true');
    st.palOpened = false;
    if (st.screen === 'play' && !st.pending && st.sel >= 0) { st.sel = -1; drawTiles(); }
  }
  $('pal-close').addEventListener('click', function () { Sound.tap(); closePal(); });
  $('pal').addEventListener('click', function (e) { if (e.target === $('pal')) closePal(); });
  function drawPal() {
    var tb = $('pal-tabs'); tb.innerHTML = '';
    PAGES.forEach(function (p, pi) {
      var b = document.createElement('button');
      b.className = 'tab' + (pi === st.palPage ? ' on' : '');
      b.textContent = p.name;
      b.addEventListener('click', function () { Sound.tap(); st.palPage = pi; drawPal(); });
      tb.appendChild(b);
    });
    var k = $('kana'); k.innerHTML = '';
    var orig = chars(st.word)[st.sel];
    var hintCh = (st.hint >= 2 && st.hintStep && st.hintStep.index === st.sel) ? st.hintStep.ch : null;
    PAGES[st.palPage].rows.forEach(function (ri) {
      var row = ROWS[ri];
      var line = document.createElement('div');
      line.className = 'krow';
      line.style.setProperty('--c', row[2]);
      chars(row[1]).forEach(function (c) {
        if (c === ' ') { line.appendChild(document.createElement('span')); return; }
        var b = document.createElement('button');
        b.className = 'key';
        b.textContent = c;
        b.dataset.ch = c;
        if (c === orig) { b.disabled = true; b.classList.add('same'); }
        if (st.pending && st.pending.ch === c) b.classList.add('on');
        if (hintCh === c) b.classList.add('hint');
        b.addEventListener('click', function () { chooseKana(c); });
        line.appendChild(b);
      });
      k.appendChild(line);
    });
  }
  function chooseKana(c) {
    Sound.key();
    st.pending = { index: st.sel, ch: c };
    closePal();
    drawPlay();
    setMsg('ふたを しめて ぐるぐる！「まわす」か まどを なぞってね');
    var cs = chars(st.word); cs[st.sel] = c;
    say(cs.join(''));
  }

  // ---- まわす ----
  $('b-spin').addEventListener('click', function () { if (st.pending && !st.busy) spin(1); });
  function spin(dir) {
    if (!st.pending || st.busy) return;
    st.busy = true;
    closePal();
    drawPlay();
    var m = $('machine');
    m.classList.add('spinning');
    $('drum').style.transform = '';
    $('drum').style.setProperty('--dir', dir < 0 ? -1 : 1);
    setMsg('ごうん ごうん…');
    Sound.rumble(1.5);
    var n = 0;
    var tm = setInterval(function () { bubbles(3); if (n++ % 2 === 0) Sound.bubble(); }, 140);
    setTimeout(function () {
      clearInterval(tm);
      m.classList.remove('spinning');
      finishSpin();
    }, 1500);
  }
  function finishSpin() {
    var cs = chars(st.word);
    cs[st.pending.index] = st.pending.ch;
    var w = cs.join('');
    var idx = st.pending.index;
    st.pending = null; st.sel = -1;
    if (G.has(w) && st.path.indexOf(w) < 0) {
      st.word = w; st.path.push(w);
      st.hint = 0; st.hintStep = null;
      var fresh = addZukan(w);
      if (st.mode === 'free') { st.created++; if (fresh) st.newWords++; }
      Sound.sparkle();
      drawPlay();
      var pic = $('pic'); pic.classList.remove('pop'); void pic.offsetWidth; pic.classList.add('pop');
      var t = $('tiles').children[idx]; if (t) t.classList.add('flash');
      sparkles();
      var e = G.emoji[w];
      setMsg('へんしん！「' + w + '」' + (e ? ' ' + e : '') + (fresh ? '　📗 ずかんに とうろく！' : ''), 'good');
      say(w + '！');
      if (st.mode === 'puzzle' && w === st.puzzle.goal) {
        setTimeout(function () { st.busy = false; goal(); }, 1100);
        return;
      }
      setTimeout(function () { st.busy = false; drawPlay(); }, 600);
    } else {
      var back = st.path.indexOf(w) >= 0;
      Sound.pssh();
      popFoam();
      drawPlay();
      var t2 = $('tiles').children[idx]; if (t2) t2.classList.add('shake');
      setMsg(back ? 'ぷしゅー… その ことばは もう とおったよ' : 'ぷしゅー… 「' + w + '」は じしょに ないみたい。もとに もどったよ', 'bad');
      setTimeout(function () { st.busy = false; drawPlay(); }, 700);
    }
  }

  // ---- あわ ----
  function bubbles(n) {
    var f = $('foam');
    for (var i = 0; i < n; i++) {
      var b = document.createElement('i');
      var s = 10 + Math.random() * 26;
      b.style.width = b.style.height = s + 'px';
      b.style.left = (8 + Math.random() * 84) + '%';
      b.style.top = (40 + Math.random() * 55) + '%';
      b.style.animationDuration = (0.8 + Math.random() * 0.8) + 's';
      f.appendChild(b);
      setTimeout(function (x) { return function () { x.remove(); }; }(b), 1700);
    }
  }
  function popFoam() {
    var f = $('foam');
    for (var i = 0; i < 12; i++) {
      var b = document.createElement('i');
      b.className = 'burst';
      var s = 14 + Math.random() * 30;
      b.style.width = b.style.height = s + 'px';
      b.style.left = (10 + Math.random() * 80) + '%';
      b.style.top = (15 + Math.random() * 70) + '%';
      f.appendChild(b);
      setTimeout(function (x) { return function () { x.remove(); }; }(b), 700);
    }
  }
  function sparkles() {
    var f = $('foam');
    for (var i = 0; i < 8; i++) {
      var b = document.createElement('b');
      b.textContent = ['✨', '⭐', '💫'][i % 3];
      b.style.left = (10 + Math.random() * 80) + '%';
      b.style.top = (10 + Math.random() * 70) + '%';
      b.style.animationDelay = (i * 0.05) + 's';
      f.appendChild(b);
      setTimeout(function (x) { return function () { x.remove(); }; }(b), 1200);
    }
  }

  // ---- ひとつ もどる ----
  $('b-undo').addEventListener('click', function () {
    if (st.busy || st.path.length < 2) return;
    Sound.pssh();
    st.path.pop();
    st.word = st.path[st.path.length - 1];
    st.pending = null; st.sel = -1; st.hint = 0; st.hintStep = null;
    drawPlay();
    setMsg('「' + st.word + '」に もどったよ');
    say(st.word);
  });

  // ---- ヒント ----
  $('b-hint').addEventListener('click', function () {
    if (st.busy) return;
    Sound.tap();
    if (!st.hintStep) st.hintStep = findHint();
    if (!st.hintStep) { setMsg('ここからは へんしん できる ことばが ないみたい。↩️ で もどってね'); return; }
    st.hint = Math.min(2, st.hint + 1);
    st.pending = null;
    drawPlay();
    var n = st.hintStep.index + 1;
    if (st.hint === 1) {
      setMsg('💡 ' + n + 'もじめを かえて みよう（ひかってる もじ）');
      say(n + 'もじめを かえて みよう');
    } else {
      setMsg('💡 ' + n + 'もじめを「' + st.hintStep.ch + '」に してみよう');
      say(n + 'もじめを ' + st.hintStep.ch + ' に してみよう');
      st.sel = st.hintStep.index;
      drawTiles();
      openPal();
    }
  });
  function findHint() {
    if (st.mode === 'puzzle') return Ladder.nextStep(G, st.word, st.puzzle.goal);
    // じゆう: まだ ずかんに ない ことばを ゆうせん
    var cand = G.nb[st.word].filter(function (w) { return st.path.indexOf(w) < 0; });
    if (!cand.length) return null;
    cand.sort(function (a, b) { return (save.zukan[a] ? 1 : 0) - (save.zukan[b] ? 1 : 0) || (G.emoji[b] ? 1 : 0) - (G.emoji[a] ? 1 : 0); });
    var w = cand[0], i = Ladder.diffIndex(st.word, w);
    return { word: w, index: i, ch: chars(w)[i] };
  }

  // ---- ゴール・おわり ----
  function goal() {
    var p = st.puzzle;
    var steps = st.path.length - 1;
    var star = steps <= p.min;
    save.solved[p.id] = Math.min(save.solved[p.id] || 99, steps);
    if (star) save.stars[p.id] = 1;
    store();
    Sound.fanfare();
    showClear('ゴール！' + (star ? '🌟' : '🎉'),
      steps + 'て で とうちゃく！' + (star ? '　さいたん てすう だよ！ すごい！' : '　さいたんは ' + p.min + 'て。もっと みじかい みちも あるよ'),
      [['つぎの もんだい', nextPuzzle], ['もういちど', function () { startPuzzle(p); }], ['いちらん', function () { render.list(); show('list'); }]]);
    say('ゴール！ ' + steps + 'てで とうちゃく' + (star ? '。さいたん だよ、すごい' : ''));
  }
  function nextPuzzle() {
    var i = PUZZLES.indexOf(st.puzzle);
    var nx = PUZZLES.slice(i + 1).concat(PUZZLES.slice(0, i + 1)).find(function (p) { return !save.solved[p.id]; }) || PUZZLES[(i + 1) % PUZZLES.length];
    startPuzzle(nx);
  }
  $('b-end').addEventListener('click', function () {
    if (st.busy) return;
    Sound.fanfare();
    showClear('おつかれさま！',
      'へんしん ' + (st.path.length - 1) + 'かい・あたらしい ことば ' + st.newWords + 'こ',
      [['もういちど', function () { render.free(); show('free'); }], ['ずかんを みる', function () { render.zukan(); show('zukan'); }]]);
  });
  function showClear(title, sub, btns) {
    $('clear-ttl').textContent = title;
    $('clear-sub').textContent = sub;
    // ものほしざお に とおった ことばを ほす
    var line = $('line'); line.innerHTML = '';
    var COLORS = ['#ffc9c9', '#ffec99', '#b2f2bb', '#a5d8ff', '#d0bfff', '#ffd8a8', '#c3fae8', '#fcc2d7'];
    var per = window.innerWidth < 560 ? 4 : 6;
    for (var r = 0; r < st.path.length; r += per) {
      var pole = document.createElement('div');
      pole.className = 'pole';
      st.path.slice(r, r + per).forEach(function (w, k) {
        var c = document.createElement('div');
        c.className = 'cloth';
        c.style.setProperty('--bg', COLORS[(r + k) % COLORS.length]);
        c.style.animationDelay = ((r + k) * 0.12) + 's';
        c.innerHTML = '<span class="pin"></span><span class="e">' + (G.emoji[w] || '💬') + '</span><span class="w">' + w + '</span>';
        c.addEventListener('click', function () { Sound.say(w); });
        pole.appendChild(c);
      });
      line.appendChild(pole);
    }
    var bx = $('clear-btns'); bx.innerHTML = '';
    btns.forEach(function (b, i) {
      var x = document.createElement('button');
      x.className = 'pill' + (i === 0 ? ' main' : '');
      x.textContent = b[0];
      x.addEventListener('click', function () { Sound.tap(); closeClear(); b[1](); });
      bx.appendChild(x);
    });
    $('clear').classList.add('on');
    $('clear').setAttribute('aria-hidden', 'false');
  }
  function closeClear() { $('clear').classList.remove('on'); $('clear').setAttribute('aria-hidden', 'true'); }

  // ---- テスト よう ----
  window.KSDebug = {
    state: function () { return { screen: st.screen, mode: st.mode, word: st.word, path: st.path.slice(), pending: st.pending, busy: st.busy, id: st.puzzle && st.puzzle.id }; },
    solution: function () { return st.mode === 'puzzle' ? Ladder.path(G, st.word, st.puzzle.goal) : null; },
  };
})();
