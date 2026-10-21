/* じょうもん むらの くらし — ゲーム本体 */
(function () {
  'use strict';

  var KEY = 'jomon-mura-v1';
  var $ = function (id) { return document.getElementById(id); };
  // 「漢字{かんじ}」→ ふりがな
  function R(s) { return String(s).replace(/([一-鿿々]+)\{([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>'); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var CARD = {}; CARDS.forEach(function (c) { CARD[c.id] = c; });
  var JOB = {}; JOBS.forEach(function (j) { JOB[j.id] = j; });
  var COUNTED = CARDS.filter(function (c) { return c.cat !== 'tsugi'; });

  // ===== ほぞん =====
  function fresh() {
    return { year: 1, season: 0, used: 0, food: 0, raw: 0, soft: 0, doki: 0, houses: 1,
      bag: {}, kaizuka: {}, zukan: {}, isekiIdx: 0, digging: false, se: true, bgm: false, seenIntro: false, clears: 0 };
  }
  var st = fresh();
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && typeof s === 'object') { var f = fresh(); for (var k in f) if (s[k] !== undefined) f[k] = s[k]; st = f; }
    } catch (e) {}
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  function addTrash(obj, type, n) { obj[type] = (obj[type] || 0) + (n || 1); }
  function countObj(o) { var n = 0; for (var k in o) n += o[k]; return n; }
  function have(id) { return !!st.zukan[id]; }
  function register(id) { if (!CARD[id] || have(id)) return false; st.zukan[id] = true; return true; }
  function zukanCount() { return COUNTED.filter(function (c) { return have(c.id); }).length; }

  // ===== がめん =====
  function render() {
    var se = SEASONS[st.season];
    $('yearLabel').textContent = st.year + 'ねんめ';
    $('seasonLabel').textContent = se.emoji + ' ' + se.name;
    var t = '<span>しごと</span>';
    for (var i = 0; i < 3; i++) t += '<i class="' + (i < st.used ? 'used' : '') + '"></i>';
    $('turns').innerHTML = t;
    $('turns').setAttribute('aria-label', 'のこりの しごと ' + (3 - st.used) + 'かい');
    $('stockNum').textContent = st.food;
    $('needNum').textContent = NEED;
    $('stockBar').style.width = Math.min(100, st.food / NEED * 100) + '%';
    var chips = [];
    if (st.raw) chips.push('🌰 しぶい どんぐり ' + st.raw);
    if (st.soft) chips.push('💧 あくぬき どんぐり ' + st.soft);
    chips.push('🏺 どき ' + st.doki);
    chips.push('🛖 いえ ' + st.houses);
    var b = countObj(st.bag);
    if (b) chips.push('🗑️ ごみ ' + b);
    chips.push('📖 ' + zukanCount() + '/' + COUNTED.length);
    $('chips').innerHTML = chips.map(function (c) { return '<span>' + c + '</span>'; }).join('');
    $('panelTitle').textContent = se.name + 'の しごと（のこり ' + (3 - st.used) + 'かい）';
    renderJobs();
    $('btnNext').textContent = st.season === 3 ? 'ふゆを こす ▶' : 'つぎの きせつへ ▶';
    $('btnSe').classList.toggle('off', !st.se);
    $('btnBgm').classList.toggle('off', !st.bgm);
    drawScene();
  }

  var selPlace = null;
  function jobBlocked(j) {
    if (!j.free && st.used >= 3) return 'この きせつは もう おしまい';
    if (j.id === 'akunuki' && !st.raw) return 'さきに きのみ ひろいで どんぐりを';
    if (j.id === 'konani' && !st.soft) return 'さきに あくぬきを しよう';
    if (j.id === 'kaizuka' && !countObj(st.bag)) return 'いまは ごみが ないよ';
    if (j.id === 'ie' && st.houses >= 6) return 'むらは もう いっぱい';
    return '';
  }
  function jobBtn(j, isSeason) {
    var why = jobBlocked(j);
    return '<button class="job' + (isSeason ? ' season' : '') + (selPlace && j.place === selPlace ? ' glow' : '') +
      '" data-job="' + j.id + '"' + (why ? ' disabled' : '') + '>' +
      '<span class="e">' + j.emoji + '</span><b>' + j.name + '</b><small>' + (why || j.desc) + '</small></button>';
  }
  function renderJobs() {
    var sid = SEASONS[st.season].id, h = '<div class="sectionLabel">' + SEASONS[st.season].emoji + ' ' + SEASONS[st.season].name + 'だけの しごと</div>';
    JOBS.forEach(function (j) { if (j.season === sid) h += jobBtn(j, true); });
    h += '<div class="sectionLabel">🔁 いつでも できる しごと</div>';
    JOBS.forEach(function (j) { if (!j.season) h += jobBtn(j, false); });
    $('jobs').innerHTML = h;
  }

  // ===== むらの え =====
  function drawScene() {
    var se = SEASONS[st.season], fuyu = se.id === 'fuyu', aki = se.id === 'aki', haru = se.id === 'haru';
    var leaf = aki ? ['#e07b39', '#d9a441', '#c0552b'] : fuyu ? ['#6b7f73', '#7d8f84', '#5f7066'] : haru ? ['#7fbf5a', '#9bd27a', '#6aa84f'] : ['#3f8f3a', '#4fa046', '#2f7a2f'];
    var s = '<rect width="400" height="260" fill="' + se.sky + '"/>';
    s += fuyu ? '' : '<circle cx="350" cy="36" r="18" fill="#ffd54f"/>';
    s += '<path d="M0 120 L60 60 L120 110 L190 50 L260 112 L330 66 L400 118 L400 130 L0 130Z" fill="' + (fuyu ? '#c9d6e2' : '#8fae9a') + '"/>';
    if (fuyu) s += '<path d="M176 64 L190 50 L204 64 L196 62 L190 66 L184 62Z M318 78 L330 66 L342 78Z" fill="#fff"/>';
    s += '<rect y="122" width="400" height="138" fill="' + se.ground + '"/>';
    // かわ と うみ
    s += '<path d="M260 122 Q250 160 290 190 Q320 210 300 260 L400 260 L400 200 Q360 196 330 186 Q290 170 280 122Z" fill="#6cb8e0"/>';
    s += '<path d="M270 230 Q300 222 330 230 M340 214 Q366 206 392 214" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>';
    s += '<g transform="translate(330 222)"><path d="M-26 0 Q0 12 26 0 L22 6 Q0 16 -22 6Z" fill="#8a5a2b" stroke="#4a2e12" stroke-width="1.5"/></g>';
    // もり
    var trees = [[22, 140], [52, 128], [84, 146], [30, 176], [66, 172], [100, 120], [112, 170]];
    s += '<g class="spot" data-place="mori">';
    trees.forEach(function (p, i) {
      s += '<rect x="' + (p[0] - 3) + '" y="' + p[1] + '" width="6" height="22" fill="#6b4a22"/>';
      s += '<circle cx="' + p[0] + '" cy="' + (p[1] - 6) + '" r="17" fill="' + leaf[i % 3] + '"/>';
      if (haru) s += '<circle cx="' + (p[0] + 6) + '" cy="' + (p[1] - 12) + '" r="3" fill="#f8bbd0"/><circle cx="' + (p[0] - 7) + '" cy="' + (p[1] - 2) + '" r="3" fill="#f8bbd0"/>';
      if (aki) s += '<circle cx="' + (p[0] + 5) + '" cy="' + (p[1] + 2) + '" r="3" fill="#7a4a1e"/>';
      if (fuyu) s += '<path d="M' + (p[0] - 14) + ' ' + (p[1] - 14) + ' Q' + p[0] + ' ' + (p[1] - 30) + ' ' + (p[0] + 14) + ' ' + (p[1] - 14) + 'Z" fill="#fff"/>';
    });
    s += label(66, 214, 'もり') + '</g>';
    // いえ
    s += '<g class="spot" data-place="ie">';
    var hx = [150, 196, 242, 172, 218, 128];
    var hy = [118, 112, 120, 150, 152, 150];
    for (var i = 0; i < Math.min(st.houses, 6); i++) {
      s += '<g transform="translate(' + (hx[i] - 27) + ' ' + (hy[i] - 40) + ') scale(.54)">' + ART.hut(fuyu) + '</g>';
    }
    s += label(196, 66, 'たてあなじゅうきょ') + '</g>';
    // ひろば
    s += '<g class="spot" data-place="hiroba"><ellipse cx="190" cy="214" rx="56" ry="22" fill="' + (fuyu ? '#dfe6ec' : '#d8b98a') + '"/>';
    s += '<path d="M180 222 L200 222 M184 218 L196 226" stroke="#6b4a22" stroke-width="3"/>';
    s += '<path d="M190 220 Q182 208 190 196 Q198 208 190 220Z" fill="#ff7043"/><path d="M190 220 Q186 212 190 205 Q194 212 190 220Z" fill="#ffd54f"/>';
    for (var d = 0; d < Math.min(st.doki, 4); d++) s += '<path d="M' + (214 + d * 12) + ' 206 l8 0 l-1 3 q3 7 -1 12 l-4 0 q-4 -5 -1 -12z" fill="#c07a45" stroke="#6b3b1d"/>';
    s += label(190, 246, 'ひろば') + '</g>';
    // かいづか
    var kz = countObj(st.kaizuka);
    var hgt = 10 + Math.min(kz, 30);
    s += '<g class="spot" data-place="kaizuka"><path d="M318 ' + 172 + ' Q350 ' + (172 - hgt) + ' 382 172Z" fill="#cbb89a"/>';
    for (var k = 0; k < Math.min(kz, 18); k++) s += '<circle cx="' + (328 + (k * 7) % 46) + '" cy="' + (168 - (k % 4) * 3 - Math.floor(k / 7) * 3) + '" r="2.2" fill="#fff"/>';
    s += label(350, 150 - Math.min(kz, 30) / 2, 'かいづか') + '</g>';
    // うみ・かわ ラベル
    s += '<g class="spot" data-place="umi"><rect x="250" y="190" width="150" height="70" fill="transparent"/>' + label(366, 246, 'うみ・かわ') + '</g>';
    if (fuyu) for (var f = 0; f < 18; f++) s += '<circle cx="' + rnd(400) + '" cy="' + rnd(240) + '" r="2" fill="#fff" opacity=".9"/>';
    $('scene').innerHTML = s;
  }
  function label(x, y, t) {
    var w = t.length * 12 + 14;
    return '<rect class="label" x="' + (x - w / 2) + '" y="' + (y - 11) + '" width="' + w + '" height="20" rx="10"/>' +
      '<text class="labelText" x="' + x + '" y="' + (y + 4) + '" text-anchor="middle">' + t + '</text>';
  }

  // ===== ダイアログ =====
  function dialog(html, btns) {
    $('dialogBody').innerHTML = html;
    var box = $('dialogBtns'); box.innerHTML = '';
    (btns || [{ label: 'OK' }]).forEach(function (b) {
      var el = document.createElement('button');
      el.className = 'big ' + (b.cls || '');
      el.innerHTML = b.label;
      el.onclick = function () { $('dialog').hidden = true; if (b.fn) b.fn(); };
      box.appendChild(el);
    });
    $('dialog').hidden = false;
  }
  function say(t) { $('msg').innerHTML = t; }

  // ===== ミニゲームの わく =====
  var alive = false, timers = [];
  function later(fn, ms) { var id = setTimeout(function () { if (alive) fn(); }, ms); timers.push(id); return id; }
  function every(fn, ms) { var id = setInterval(function () { if (alive) fn(); }, ms); timers.push(id); return id; }
  function frame(fn) {
    var last = performance.now();
    (function loop(now) { if (!alive) return; var dt = Math.min(0.05, (now - last) / 1000); last = now; if (fn(dt) !== false) requestAnimationFrame(loop); })(last);
  }
  function openPlay(title, how) {
    stopPlay();
    alive = true;
    $('playTitle').innerHTML = title;
    $('playHow').innerHTML = R(how);
    var stg = $('stage');
    stg.innerHTML = ''; stg.className = 'stage'; stg.style.minHeight = ''; stg.onclick = null;
    $('playFoot').innerHTML = '';
    $('play').hidden = false;
    return $('stage');
  }
  function stopPlay() { alive = false; timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }
  function closePlay() { stopPlay(); $('play').hidden = true; }
  function footBtn(label, fn, cls) {
    var b = document.createElement('button');
    b.className = 'big ' + (cls || '');
    b.innerHTML = label;
    b.onclick = fn;
    $('playFoot').appendChild(b);
    return b;
  }
  function clearFoot() { $('playFoot').innerHTML = ''; }
  function steps(names, now) {
    return '<div class="steps">' + names.map(function (n, i) {
      return '<span class="' + (i < now ? 'done' : i === now ? 'now' : '') + '">' + (i + 1) + ' ' + n + '</span>';
    }).join('') + '</div>';
  }

  // しごとの けっかを むらに いれる
  // r: { food, raw, soft, doki, houses, trash:{}, use:[], lines:[], gets:[] }
  function finish(job, r) {
    closePlay();
    var lines = r.lines || [], gets = r.gets || [];
    if (r.harvest && r.food > 0 && st.houses > 1) {
      var help = st.houses - 1;
      r.food += help;
      lines.push('🛖 なかまの かぞくが てつだって くれた（＋' + help + '）');
    }
    st.food += r.food || 0;
    st.raw += r.raw || 0;
    st.soft += r.soft || 0;
    st.doki += r.doki || 0;
    st.houses += r.houses || 0;
    var tcount = 0;
    for (var k in (r.trash || {})) { addTrash(st.bag, k, r.trash[k]); tcount += r.trash[k]; }
    var newCards = (r.use || []).filter(register);
    if (!job.free) st.used++;
    save(); render();
    var h = '<h3>' + job.emoji + ' ' + job.name + '</h3>';
    if (gets.length) h += '<div class="gets">' + gets.map(function (g) { return '<span>' + g + '</span>'; }).join('') + '</div>';
    if (r.food) h += '<p>🍖 たくわえ <b>＋' + r.food + '</b></p>';
    h += lines.map(function (l) { return '<p>' + R(l) + '</p>'; }).join('');
    if (tcount) h += '<p>🗑️ ごみが ' + tcount + 'こ でた。<b>かいづか</b>に すてよう。</p>';
    newCards.forEach(function (id) { h += '<p>📖 ずかんに とうろく！ <b>' + R(CARD[id].name) + '</b></p>'; });
    if (newCards.length) SND.play('win'); else SND.play('ok');
    dialog(h);
    var left = 3 - st.used;
    say(left > 0 ? 'のこり ' + left + 'かい しごとが できるよ。' : 'この きせつの しごとは おしまい。「' + $('btnNext').textContent.replace(' ▶', '') + '」を おそう。');
  }

  // ===== 1) さがす あそび（さんさい・かい） =====
  function findGame(o) {
    var stage = openPlay(o.title, o.how);
    var cells = o.items.slice();
    while (cells.length < 12) cells.push(null);
    shuffle(cells);
    var taps = o.taps, found = [];
    stage.innerHTML = '<div class="counter"><span id="fgTaps"></span><span id="fgFound"></span></div><div class="grid" id="fgGrid"></div>';
    var grid = $('fgGrid');
    function upd() { $('fgTaps').textContent = 'のこり ' + taps + 'かい'; $('fgFound').textContent = 'みつけた ' + found.length + ' / ' + o.items.length; }
    cells.forEach(function (it) {
      var b = document.createElement('button');
      b.className = 'cell ' + o.cls;
      b.innerHTML = o.cover;
      b.onclick = function () {
        if (b.classList.contains('open') || b.classList.contains('hit') || taps <= 0) return;
        taps--;
        if (it) {
          found.push(it); b.className = 'cell hit pop'; b.innerHTML = ART.card(it).replace('<svg', '<svg style="width:86%;height:86%"');
          SND.play('ok');
        } else {
          b.className = 'cell open'; b.textContent = o.empty; SND.play('dig');
        }
        upd();
        if (taps <= 0 || found.length === o.items.length) later(function () { o.done(found); }, 700);
      };
      grid.appendChild(b);
    });
    upd();
  }

  var GAMES = {
    sansai: function (job) {
      var items = []; for (var i = 0; i < 5; i++) items.push(pick(['zenmai', 'warabi']));
      findGame({ title: '🌿 さんさい とり', how: 'もりの くさむらを タップして、ぜんまいや わらびを さがそう。タップできるのは 8かい。',
        cls: 'grass', cover: '🌱', empty: '🍃', items: items, taps: 8,
        done: function (f) {
          var use = []; f.forEach(function (id) { if (use.indexOf(id) < 0) use.push(id); });
          finish(job, { food: f.length, harvest: true, use: use,
            gets: f.map(function (id) { return id === 'zenmai' ? '🌿 ぜんまい' : '🌿 わらび'; }),
            lines: f.length ? ['さんさいは ゆでて たべよう。'] : ['みつからなかった…。また さがそう。'] });
        } });
    },
    kai: function (job) {
      var items = []; for (var i = 0; i < 6; i++) items.push(pick(['hamaguri', 'asari', 'asari', 'hamaguri', 'kaki']));
      SND.play('wave');
      findGame({ title: '🐚 かいを ほる', how: 'しおが ひいた すなはまを ほって、かいを さがそう。タップできるのは 8かい。',
        cls: 'sand', cover: '〰️', empty: '・', items: items, taps: 8,
        done: function (f) {
          var trash = {}; f.forEach(function (id) { addTrash(trash, id); });
          var bonus = (st.doki > 0 && f.length) ? 2 : 0;
          var lines = [];
          if (bonus) lines.push('🏺 どきで にたので、おいしく たくさん たべられる（＋2）');
          else if (f.length) lines.push('どきが あれば、にて もっと たべられるよ。');
          finish(job, { food: f.length + bonus, harvest: true, trash: trash,
            gets: f.map(function (id) { return '🐚 ' + CARD[id].name; }), lines: lines });
        } });
    },
    ryo: function (job) {
      var stage = openPlay('🛶 りょう', 'まるきぶねで うみへ。どうぐを えらぼう。');
      SND.play('wave');
      stage.innerHTML = '<div class="craft">' + ART.card('marukibune').replace('<svg', '<svg style="width:200px"') + '</div>';
      footBtn('🪝 つりばり<br><small>あたりやすい・さかな ＋2</small>', function () { fishing('tsuribari'); });
      footBtn('🔱 もり<br><small>むずかしい・おおきい ＋3</small>', function () { fishing('mori'); }, 'sub');
      function fishing(tool) {
        var tries = 5, x = 0, v = tool === 'mori' ? 62 : 48, dir = 1, zw = tool === 'mori' ? 14 : 24;
        var zx = 20 + rnd(60 - zw), food = 0, gets = [], trash = {}, lines = [];
        $('playHow').innerHTML = 'さかな 🐟 が みどりの ところに きた とき「えいっ！」を おそう。のこり <b id="tr">5</b>かい。';
        stage.innerHTML = '<div class="water"><span class="boat">🛶</span><span class="catch" id="ct"></span></div>' +
          '<div class="meter"><div class="zone" style="left:' + zx + '%;width:' + zw + '%"></div><span class="mark" id="fishMark">🐟</span></div>';
        clearFoot();
        var btn = footBtn('えいっ！', function () {
          if (tries <= 0) return;
          tries--; $('tr').textContent = tries;
          var hit = x >= zx && x <= zx + zw;
          if (hit) {
            var id = tool === 'mori' ? (Math.random() < 0.35 ? 'iruka' : 'suzuki') : pick(['kurodai', 'suzuki']);
            var val = tool === 'mori' ? (id === 'iruka' ? 4 : 3) : 2;
            food += val; gets.push((id === 'iruka' ? '🐬 ' : '🐟 ') + CARD[id].name); addTrash(trash, id);
            $('ct').textContent = id === 'iruka' ? '🐬' : '🐟'; $('ct').className = 'catch pop';
            SND.play('splash'); SND.play('ok');
          } else {
            $('ct').textContent = '💦'; $('ct').className = 'catch pop';
            SND.play('splash');
            if (Math.random() < 0.3) { addTrash(trash, tool); lines.push((tool === 'mori' ? 'もり' : 'つりばり') + 'が おれちゃった。'); }
          }
          zx = 10 + rnd(80 - zw);
          stage.querySelector('.zone').style.left = zx + '%';
          if (tries <= 0) {
            btn.disabled = true;
            later(function () {
              if (!food) lines.push('きょうは ざんねん。また いこう。');
              finish(job, { food: food, harvest: true, trash: trash, gets: gets, lines: lines, use: ['marukibune'] });
            }, 800);
          }
        });
        frame(function (dt) {
          x += dir * v * dt;
          if (x > 100) { x = 100; dir = -1; } if (x < 0) { x = 0; dir = 1; }
          var m = $('fishMark'); if (!m) return false;
          m.style.left = x + '%'; m.style.transform = 'translateX(-50%) scaleX(' + (dir > 0 ? -1 : 1) + ')';
        });
      }
    },
    hiroi: function (job) {
      var stage = openPlay('🌰 きのみ ひろい', 'おちてくる きのみを タップして ひろおう！ 15びょう。どんぐりは しぶいので、あとで あくぬきを するよ。');
      stage.style.minHeight = '320px';
      stage.innerHTML = '<div class="fall" id="fall"></div><div class="counter" style="position:relative"><span id="hTime">のこり 15びょう</span><span id="hGot">0こ</span></div>';
      var fall = $('fall'), nuts = [], got = { donguri: 0, kuri: 0, kurumi: 0 }, tleft = 15, acc = 0;
      clearFoot();
      var start = footBtn('はじめる', function () {
        start.remove(); SND.play('tap');
        every(function () {
          tleft--; $('hTime').textContent = 'のこり ' + tleft + 'びょう';
          if (tleft <= 0) end();
        }, 1000);
        frame(function (dt) {
          acc += dt;
          if (acc > 0.5 && tleft > 0) { acc = 0; spawn(); }
          var H = fall.clientHeight;
          for (var i = nuts.length - 1; i >= 0; i--) {
            var n = nuts[i]; n.y += n.v * dt; n.el.style.top = n.y + 'px';
            if (n.y > H * 0.75 + 10) { n.el.remove(); nuts.splice(i, 1); }
          }
          return tleft > 0;
        });
      });
      function spawn() {
        var r = Math.random(), id = r < 0.55 ? 'donguri' : r < 0.8 ? 'kuri' : 'kurumi';
        var el = document.createElement('button');
        el.className = 'nut'; el.setAttribute('aria-label', CARD[id].name);
        el.innerHTML = ART.card(id);
        var n = { el: el, y: -30, v: 70 + Math.random() * 60, id: id };
        el.style.left = (10 + Math.random() * 80) + '%'; el.style.top = '-30px';
        el.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          if (!n.el.parentNode) return;
          got[id]++; SND.play('tap');
          n.el.remove(); nuts.splice(nuts.indexOf(n), 1);
          $('hGot').textContent = (got.donguri + got.kuri + got.kurumi) + 'こ';
        });
        fall.appendChild(el); nuts.push(n);
      }
      function end() {
        var gets = [];
        if (got.donguri) gets.push('🌰 どんぐり ' + got.donguri);
        if (got.kuri) gets.push('🌰 くり ' + got.kuri);
        if (got.kurumi) gets.push('🥜 くるみ ' + got.kurumi);
        var trash = {};
        if (got.kuri) addTrash(trash, 'kuri', Math.ceil(got.kuri / 3));
        if (got.kurumi) addTrash(trash, 'kurumi', Math.ceil(got.kurumi / 3));
        var lines = [];
        if (got.donguri) lines.push('どんぐり ' + got.donguri + 'こは しぶくて まだ たべられない。「あくぬき」を しよう。');
        if (got.kuri || got.kurumi) lines.push('くりと くるみは すぐ たべられる。');
        later(function () { finish(job, { food: got.kuri + got.kurumi, raw: got.donguri, harvest: got.kuri + got.kurumi > 0, trash: trash, gets: gets, lines: lines, use: ['kago'] }); }, 400);
      }
    },
    akunuki: function (job) {
      var stage = openPlay('💧 どんぐりの あくぬき', 'しぶい どんぐり ' + st.raw + 'こを、かごに いれて かわの みずに さらそう。');
      var names = ['かわに しずめる', 'みずに さらす', st.doki ? 'どきで にる' : 'できあがり'];
      var day = 0;
      function draw(stepNo, extra) {
        stage.innerHTML = steps(names, stepNo) + '<div class="craft" style="flex-direction:column">' +
          '<div style="font-size:64px">' + (extra || '🧺') + '</div>' +
          '<p style="margin:6px 0;font-size:16px">' + (stepNo === 1 ? 'すぎた ひ: ' + day + ' / 3' : '') + '</p></div>';
      }
      draw(0);
      footBtn('🧺 かごを かわへ', function () {
        SND.play('wave'); clearFoot(); draw(1, '🧺🌊');
        var b = footBtn('🌙 ひが すぎる（みずが あくを ながす）', function () {
          day++; SND.play('wave'); draw(1, '🧺🌊'.repeat(1) + '✨'.repeat(day));
          if (day >= 3) {
            b.remove();
            if (st.doki) {
              draw(2, '🏺🔥');
              footBtn('🔥 どきで にる', function () { SND.play('fire'); clearFoot(); draw(3, '🏺✨'); later(done, 700); });
            } else { draw(3, '🌰✨'); later(done, 600); }
          }
        });
      });
      function done() {
        var n = st.raw, bonus = st.doki ? Math.ceil(n / 2) : 0;
        var lines = ['しぶい「あく」が ぬけて、たべられる ように なった！'];
        if (bonus) lines.push('🏺 どきで にて やわらかく。たくさん たべられる（＋' + bonus + '）');
        else lines.push('どきが あれば にて もっと たべやすく なるよ。');
        lines.push('「こなに する」と もっと ふえるよ。');
        var trash = {}; addTrash(trash, 'donguri');
        finish(job, { food: n + bonus, raw: -n, soft: n, trash: trash, gets: ['🌰 たべられる どんぐり ' + n], lines: lines, use: ['kago'] });
      }
    },
    konani: function (job) {
      var n = Math.min(st.soft, 8), p = 0, need = 12;
      var stage = openPlay('🪨 いしざらで こなに する', 'あくぬき した どんぐり ' + n + 'こを、すりいしで ごりごり すりつぶそう。ボタンを ' + need + 'かい おそう。');
      stage.innerHTML = '<div class="craft">' + ART.card('ishizara').replace('<svg', '<svg id="isz" style="width:200px"') + '</div><div class="prog"><div id="kp"></div></div>';
      footBtn('ごりごり', function () {
        p++; SND.play('dig');
        $('kp').style.width = (p / need * 100) + '%';
        var s = $('isz'); s.classList.remove('shake'); void s.getBoundingClientRect(); s.classList.add('shake');
        if (p >= need) {
          clearFoot();
          later(function () {
            finish(job, { food: n, soft: -n, gets: ['🍪 どんぐりの こな'], use: ['ishizara'],
              lines: ['こなに して こねて やくと、クッキーの ように なる。たくわえが ＋' + n + '！'] });
          }, 500);
        }
      });
    },
    kari: function (job) {
      var stage = openPlay('🏹 ふゆの かり', 'どうぐを えらぼう。');
      stage.innerHTML = '<div class="craft" style="gap:10px">' + ART.card('yumiya').replace('<svg', '<svg style="width:130px"') + ART.card('otoshiana').replace('<svg', '<svg style="width:130px"') + '</div>';
      footBtn('🏹 ゆみや<br><small>うごく えものを ねらう</small>', bow);
      footBtn('🕳️ おとしあな<br><small>ほって まつ</small>', pit, 'sub');
      function bow() {
        var arrows = 3, x = -10, dir = 1, v = 38, id = pick(['shika', 'inoshishi']), food = 0, gets = [], trash = {}, lines = [];
        $('playHow').innerHTML = R('えもの が あかい わの なかに きた とき「いる！」を おそう。やは <b id="ar">3</b>ぼん。');
        stage.style.minHeight = '280px';
        stage.innerHTML = '<div class="hunt"><span class="bush" style="left:6%">🌲</span><span class="bush" style="left:78%">🌲</span>' +
          '<span class="animal" id="an">' + (id === 'shika' ? '🦌' : '🐗') + '</span><div class="sight"></div></div>';
        clearFoot();
        var btn = footBtn('🏹 いる！', function () {
          if (arrows <= 0) return;
          arrows--; $('ar').textContent = arrows; SND.play('bow');
          if (Math.abs(x - 50) < 9) {
            food += 4; gets.push((id === 'shika' ? '🦌 ' : '🐗 ') + CARD[id].name); addTrash(trash, id);
            SND.play('ok'); lines.push('にくは たべて、かわや ほねも つかう。');
            arrows = 0;
          } else {
            var a = $('an'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake');
            if (Math.random() < 0.4) { addTrash(trash, 'sekizoku'); lines.push('やじりが いしに あたって おれた。'); }
          }
          if (arrows <= 0) {
            btn.disabled = true;
            later(function () {
              if (!food) lines.push('にげられた…。また ねらおう。');
              finish(job, { food: food, harvest: true, trash: trash, gets: gets, lines: lines, use: ['yumiya'] });
            }, 700);
          }
        });
        frame(function (dt) {
          x += dir * v * dt;
          if (x > 105) { dir = -1; v = 34 + rnd(24); } if (x < -5) { dir = 1; v = 34 + rnd(24); }
          var a = $('an'); if (!a) return false;
          a.style.left = x + '%'; a.style.transform = 'translate(-50%,-50%) scaleX(' + (dir > 0 ? -1 : 1) + ')';
        });
      }
      function pit() {
        var p = 0;
        $('playHow').innerHTML = 'けものの とおりみちに あなを ほろう。8かい ほったら、つぎの あさまで まつ。';
        stage.innerHTML = '<div class="craft">' + ART.card('otoshiana').replace('<svg', '<svg style="width:180px"') + '</div><div class="prog"><div id="pp"></div></div>';
        clearFoot();
        var b = footBtn('⛏️ ほる', function () {
          p++; SND.play('dig'); $('pp').style.width = (p / 8 * 100) + '%';
          if (p >= 8) {
            b.remove();
            footBtn('🌙 あさまで まつ', function () {
              clearFoot();
              var ok = Math.random() < 0.6;
              stage.innerHTML = '<div class="craft" style="font-size:80px">' + (ok ? '🐗' : '🍂') + '</div>';
              if (ok) SND.play('ok'); else SND.play('ng');
              later(function () {
                var trash = {}; if (ok) addTrash(trash, 'inoshishi');
                finish(job, { food: ok ? 4 : 0, harvest: ok, trash: trash, gets: ok ? ['🐗 イノシシ'] : [], use: ['otoshiana'],
                  lines: [ok ? 'おとしあなに イノシシが かかった！' : 'きょうは なにも かからなかった。'] });
              }, 900);
            });
          }
        });
      }
    },
    doki: function (job) {
      var stage = openPlay('🏺 どき づくり', '');
      var names = ['わを つみあげる', 'なわで もよう', 'のやき'];
      var coils = 0, pats = 0, fired = 0, broken = false;
      function pot() {
        var s = '<svg viewBox="0 0 200 200">';
        if (fired) s += '<path d="M40 190 Q60 150 70 176 Q86 140 100 174 Q114 140 130 176 Q140 150 160 190Z" fill="#ff7043" opacity="' + Math.min(1, fired) + '"/>';
        var col = fired >= 1 ? '#c07a45' : '#9c8a74';
        for (var i = 0; i < coils; i++) {
          var y = 170 - i * 20, w = 46 + Math.sin(i / 6 * Math.PI) * 16;
          s += '<rect x="' + (100 - w) + '" y="' + (y - 18) + '" width="' + (w * 2) + '" height="20" rx="9" fill="' + col + '" stroke="#5a3a1d" stroke-width="2"/>';
          if (i < pats) for (var x = 100 - w + 6; x < 100 + w - 8; x += 7) s += '<path d="M' + x + ' ' + (y - 14) + ' l5 10" stroke="#5a3a1d" stroke-width="2" stroke-linecap="round"/>';
        }
        if (broken) s += '<path d="M70 60 L96 110 L84 130 L110 170" stroke="#2b1a0d" stroke-width="4" fill="none"/>';
        return s + '</svg>';
      }
      function draw(n, extra) { stage.innerHTML = steps(names, n) + '<div class="craft">' + pot() + '</div>' + (extra || ''); }
      $('playHow').innerHTML = 'ねんどの ひもを わに して、6だん つみあげよう。';
      draw(0);
      var b1 = footBtn('🟤 わを のせる', function () {
        coils++; SND.play('tap'); draw(0);
        if (coils >= 6) {
          b1.remove();
          $('playHow').innerHTML = 'よった なわを ころがして もよう（じょうもん）を つけよう。';
          draw(1);
          var b2 = footBtn('〰️ なわを ころがす', function () {
            pats++; SND.play('tap'); draw(1);
            if (pats >= 6) { b2.remove(); noyaki(); }
          });
        }
      });
      function noyaki() {
        var heat = 20, green = 0, red = 0, lastSnd = 0;
        $('playHow').innerHTML = 'まきを くべて、ひの つよさを <b style="color:#2e7d32">みどり</b>に たもとう。<b style="color:#c0392b">あか</b>（つよすぎ）が つづくと われちゃう！';
        draw(2, '<div class="heat"><i id="hi"></i></div><div class="prog"><div id="gp"></div></div>');
        footBtn('🪵 まきを くべる', function () { heat = Math.min(100, heat + 13); SND.play('fire'); });
        frame(function (dt) {
          heat = Math.max(0, heat - 16 * dt);
          if (heat >= 35 && heat < 70) green += dt;
          if (heat >= 70) red += dt;
          fired = Math.min(1, green / 4);
          lastSnd += dt; if (lastSnd > 1.3 && heat > 30) { lastSnd = 0; SND.play('kiln'); }
          var hi = $('hi'); if (!hi) return false;
          hi.style.left = heat + '%';
          $('gp').style.width = Math.min(100, green / 4 * 100) + '%';
          if (green >= 4 || red >= 1.6) {
            broken = red >= 1.6 && green < 4;
            clearFoot(); draw(3);
            if (broken) SND.play('ng');
            later(function () {
              if (broken) finish(job, { trash: { doki: 1 }, use: ['nawa'], lines: ['ひが つよすぎて われちゃった。かけらは かいづかへ。つぎは がんばろう！'] });
              else finish(job, { doki: 1, use: ['nawa'], gets: ['🏺 じょうもんどき'],
                lines: ['どきが やけた！ これで かいや どんぐりを にて たべられる。'] });
            }, 900);
            return false;
          }
        });
      }
    },
    ie: function (job) {
      var stage = openPlay('🛖 いえ づくり', '');
      var names = ['あなを ほる', 'はしらを たてる', 'かやぶき'];
      var dig = 0, pil = 0, kaya = 0;
      function hut() {
        var s = '<svg viewBox="0 0 200 160"><rect y="100" width="200" height="60" fill="#8d6e4a"/><rect y="94" width="200" height="8" fill="#7cb342"/>';
        s += '<path d="M40 100 L160 100 L156 ' + (100 + dig * 4) + ' L44 ' + (100 + dig * 4) + 'Z" fill="#5a3f26"/>';
        var px = [60, 140, 80, 120];
        for (var i = 0; i < pil; i++) s += '<rect x="' + (px[i] - 4) + '" y="' + (i < 2 ? 54 : 40) + '" width="8" height="' + (i < 2 ? 76 : 90) + '" fill="#7a4a1e"/>';
        if (pil >= 4) s += '<path d="M60 56 L140 56 M80 42 L120 42" stroke="#7a4a1e" stroke-width="5"/>';
        for (var k = 0; k < kaya; k++) {
          var t = 104 - k * 13, w = 76 - k * 11;
          s += '<path d="M' + (100 - w) + ' ' + t + ' L100 ' + (t - 40 - k * 2) + ' L' + (100 + w) + ' ' + t + 'Z" fill="' + (k % 2 ? '#c9a061' : '#b88d4f') + '" stroke="#6b4a22" stroke-width="1.5"/>';
        }
        return s + '</svg>';
      }
      function draw(n) { stage.innerHTML = steps(names, n) + '<div class="craft">' + hut() + '</div>'; }
      $('playHow').innerHTML = 'じめんを ほりさげて、いえの ゆかを つくろう（8かい）。';
      draw(0);
      var b = footBtn('⛏️ ほる', function () {
        dig++; SND.play('dig'); draw(0);
        if (dig >= 8) {
          b.remove();
          $('playHow').innerHTML = 'くりの きの はしらを 4ほん たてよう。';
          draw(1);
          var b2 = footBtn('🪵 はしらを たてる', function () {
            pil++; SND.play('tap'); draw(1);
            if (pil >= 4) {
              b2.remove();
              $('playHow').innerHTML = 'かやを したから じゅんに かさねて、やねを ふこう（5かい）。';
              draw(2);
              var b3 = footBtn('🌾 かやを ふく', function () {
                kaya++; SND.play('tap'); draw(2);
                if (kaya >= 5) {
                  b3.remove(); draw(3); SND.play('fire');
                  later(function () {
                    finish(job, { houses: 1, use: ['tateana'], gets: ['🛖 たてあなじゅうきょ'],
                      lines: ['いえが できた！ なかまの かぞくが すむ ように なった。', 'これからは とる しごとの とき、なかまが てつだって くれるよ（いえ 1けん ふえる ごとに ＋1）。'] });
                  }, 800);
                }
              });
            }
          });
        }
      });
    },
    kaizuka: function (job) {
      var stage = openPlay('🗑️ かいづかに すてる', 'かいづかは むらの ごみすてば。かいがら・ほね・われた どき などを すてたよ。タップして すてよう。');
      function draw() {
        var keys = Object.keys(st.bag).filter(function (k) { return st.bag[k] > 0; });
        var h = '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">';
        keys.forEach(function (k) {
          h += '<button class="cell open" data-t="' + k + '" style="aspect-ratio:auto;flex-direction:column;font-size:30px;padding:8px">' +
            TRASH[k].emoji + '<span style="font-size:13px">' + TRASH[k].name + ' ×' + st.bag[k] + '</span></button>';
        });
        h += '</div><p class="layers">かいづかの ごみ: ' + countObj(st.kaizuka) + 'こ</p>';
        stage.innerHTML = h;
        if (!keys.length) { clearFoot(); later(function () { closePlay(); save(); render(); dialog('<h3>🗑️ すっきり！</h3><p>かいづかに すてた ものは、なんぜんねんも のこるんだ。<br>1ねんが おわったら ほって みよう。</p>'); }, 400); }
      }
      stage.onclick = function (e) {
        var b = e.target.closest('[data-t]'); if (!b) return;
        var k = b.getAttribute('data-t');
        st.bag[k]--; if (!st.bag[k]) delete st.bag[k];
        addTrash(st.kaizuka, k); SND.play('dig'); save(); draw();
      };
      footBtn('ぜんぶ すてる', function () {
        for (var k in st.bag) addTrash(st.kaizuka, k, st.bag[k]);
        st.bag = {}; SND.play('dig'); save(); draw();
      });
      draw();
    }
  };

  // ===== きせつを すすめる =====
  function nextSeason() {
    if (st.digging) { excavate(); return; }
    if (st.season < 3) {
      var go = function () { st.season++; st.used = 0; save(); render(); seasonIntro(); };
      if (st.used < 3) dialog('<p>まだ しごとが ' + (3 - st.used) + 'かい できるよ。<br>つぎの きせつへ いく？</p>', [{ label: 'いく', fn: go }, { label: 'もどる', cls: 'sub' }]);
      else go();
      return;
    }
    // ふゆを こす
    var lines = [];
    if (st.raw) { lines.push('🌰 しぶい どんぐり ' + st.raw + 'こは、あくぬき しなかったので たべられなかった。'); st.raw = 0; }
    var ok = st.food >= NEED;
    var h = '<h3>' + (ok ? '🎉 ふゆを こせた！' : '😢 おなかが すいたね') + '</h3>';
    h += '<p>たくわえ ' + st.food + ' ／ ひつよう ' + NEED + '</p>';
    if (ok) { st.food = Math.min(5, st.food - NEED); st.clears++; h += '<p>みんなで ぶじに はるを むかえられる。のこりの たくわえ ' + st.food + 'は らいねんへ（ほぞん できるのは 5まで）。</p>'; SND.play('win'); }
    else { st.food = 0; h += '<p>らいねんは もっと あつめよう。<br>（どきで にる・いえを ふやす と たくさん とれるよ）</p>'; SND.play('ng'); }
    h += lines.map(function (l) { return '<p>' + l + '</p>'; }).join('');
    var b = countObj(st.bag);
    if (b) { for (var k in st.bag) addTrash(st.kaizuka, k, st.bag[k]); st.bag = {}; h += '<p>🗑️ のこりの ごみ ' + b + 'こも かいづかへ。</p>'; }
    h += '<p>さあ、こんどは <b>いまの じだい</b>から、きみの むらの かいづかを ほって みよう！</p>';
    st.digging = true;
    save(); render();
    dialog(h, [{ label: '⛏️ はっくつ モードへ', fn: excavate }]);
  }

  function seasonIntro() {
    var se = SEASONS[st.season];
    var t = { haru: 'はるだ！ もりで さんさい、うみで かいを とろう。', natsu: 'なつだ！ まるきぶねで りょうに でよう。',
      aki: 'あきだ！ きのみを ひろって、あくぬきを して、ふゆに そなえよう。', fuyu: 'ふゆだ！ ゆみやや おとしあなで かりを しよう。たくわえは たりるかな？' };
    say(se.emoji + ' ' + t[se.id]);
  }

  // ===== はっくつ モード =====
  function excavate() {
    var stage = openPlay('⛏️ はっくつ モード', 'ここは いまの じだい。むかしの むらの かいづかを ほって みよう。つちを 2かい タップすると なにか でて くるかも。');
    $('playClose').hidden = true;
    var items = [];
    Object.keys(st.kaizuka).forEach(function (k) {
      var n = Math.min(2, st.kaizuka[k]);
      for (var i = 0; i < n; i++) items.push({ t: k, emoji: TRASH[k].emoji, name: TRASH[k].name, card: TRASH[k].card });
    });
    shuffle(items); items = items.slice(0, 14);
    var pool = TREASURES.filter(function (id) { return !have(id); });
    if (pool.length < 3) pool = pool.concat(shuffle(TREASURES.slice()));
    shuffle(pool).slice(0, 3).forEach(function (id) { items.push({ treasure: true, emoji: '✨', name: R(CARD[id].name), card: id }); });
    var cells = items.slice(); while (cells.length < 20) cells.push(null); shuffle(cells);
    var found = [], need = items.length, newCards = [];
    stage.className = 'stage dig';
    stage.innerHTML = '<p class="layers">' + (st.year > 1 ? 'いちばん うえは ' + st.year + 'ねんめの そう。したへ いくほど むかしの そう。' : 'かいがらが つもった そう') + '</p>' +
      '<div class="grid" id="dg"></div><div class="found" id="df"></div>';
    var g = $('dg');
    cells.forEach(function (it) {
      var b = document.createElement('button'), hp = 2;
      b.className = 'cell soil'; b.textContent = '';
      b.onclick = function () {
        if (hp <= 0) return;
        hp--; SND.play('dig');
        if (hp === 1) { b.className = 'cell soil half'; b.textContent = '⛏️'; return; }
        if (!it) { b.className = 'cell open'; b.textContent = '・'; return; }
        b.className = 'cell hit pop';
        b.innerHTML = ART.card(it.card).replace('<svg', '<svg style="width:86%;height:86%"');
        found.push(it);
        if (register(it.card)) newCards.push(it.card);
        SND.play(it.treasure ? 'win' : 'ok');
        $('df').innerHTML = found.map(function (f) { return '<span>' + f.emoji + ' ' + f.name + '</span>'; }).join('');
        if (found.length === need) later(done, 800);
      };
      g.appendChild(b);
    });
    footBtn('はっくつを おわる', done, 'sub');
    var finished = false;
    function done() {
      if (finished) return; finished = true;
      $('playClose').hidden = false;
      closePlay(); stage.className = 'stage';
      var learn = [];
      found.forEach(function (f) { if (f.t && learn.indexOf(TRASH[f.t].learn) < 0) learn.push(TRASH[f.t].learn); });
      var h = '<h3>⛏️ はっくつ けっか</h3>';
      if (found.length) h += '<div class="gets">' + found.map(function (f) { return '<span>' + f.emoji + ' ' + f.name + '</span>'; }).join('') + '</div>';
      if (learn.length) h += '<div class="learn"><b>かいづかから わかる こと</b><ul>' + learn.map(function (l) { return '<li>むらの ひとは ' + l + '</li>'; }).join('') + '</ul></div>';
      else h += '<p>ごみを かいづかに すてて いなかったね。かいづかに すてた ものが、あとで むかしの くらしを おしえて くれるよ。</p>';
      h += '<p>じぶんが すてた ものが でて きたね。<b>かいづかから むかしの くらしが わかる</b>んだ。</p>';
      if (st.isekiIdx < ISEKI_ORDER.length) {
        var iid = ISEKI_ORDER[st.isekiIdx++];
        if (register(iid)) newCards.push(iid);
        h += '<p>🗺️ ほんものの いせきも ずかんに のったよ: <b>' + R(CARD[iid].name) + '</b>（' + CARD[iid].place + '）</p>';
      }
      if (newCards.length) h += '<p>📖 ずかんに あたらしく ' + newCards.length + 'まい とうろく！（' + zukanCount() + '/' + COUNTED.length + '）</p>';
      st.year++; st.season = 0; st.used = 0; st.kaizuka = {}; st.digging = false;
      save(); render(); seasonIntro();
      dialog(h, [{ label: (st.year) + 'ねんめを はじめる', cls: 'green' }, { label: '📖 ずかんを みる', cls: 'sub', fn: openZukan }]);
    }
  }

  // ===== ずかん =====
  var zTab = 'all';
  function openZukan() {
    $('zukanCount').textContent = zukanCount() + ' / ' + COUNTED.length + 'まい';
    var tabs = [['all', 'ぜんぶ'], ['dougu', 'どうぐ'], ['tabemono', 'たべもの'], ['iseki', 'いせき'], ['tsugi', 'つぎの じだい']];
    $('zukanTabs').innerHTML = tabs.map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (zTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('');
    var list = CARDS.filter(function (c) { return zTab === 'all' ? c.cat !== 'tsugi' : c.cat === zTab; });
    var h = zTab === 'tsugi' ? '<p class="tsugiNote">⚠️ これは じょうもんじだいの <b>つぎ</b>の やよいじだいに くる もの。じょうもんの むらには まだ ないよ。くらべて おぼえよう。</p>' : '';
    h += list.map(function (c) {
      var open = c.cat === 'tsugi' || have(c.id);
      return '<button class="zcard' + (open ? '' : ' locked') + (c.cat === 'tsugi' ? ' tsugi' : '') + '" data-card="' + c.id + '">' +
        ART.card(c.id) + '<b>' + (open ? R(c.name) : '？？？') + '</b>' +
        '<span class="badge">' + CAT_LABEL[c.cat] + '</span>' +
        (open ? '' : '<span class="how">' + (c.cat === 'iseki' ? 'はっくつを おえると わかる' : c.get === 'use' ? 'しごとで つかうと わかる' : 'はっくつで みつけよう') + '</span>') + '</button>';
    }).join('');
    $('zukanCards').innerHTML = h;
    $('zukan').hidden = false;
  }
  function showCard(id) {
    var c = CARD[id];
    var open = c.cat === 'tsugi' || have(id);
    if (!open) { SND.play('ng'); return; }
    SND.play('tap');
    var h = '<div class="cardArt">' + ART.card(id) + '</div><h3>' + R(c.name) + '</h3>' +
      (c.place ? '<p>📍 ' + c.place + '</p>' : '') + '<p style="text-align:left">' + R(c.text) + '</p>' +
      '<p><span class="badge">' + CAT_LABEL[c.cat] + '</span></p>';
    dialog(h, [{ label: 'とじる' }]);
  }

  // ===== せつめい =====
  function help() {
    dialog('<h3>❓ あそびかた</h3>' +
      '<p style="text-align:left">じょうもんじだいは、いまから ずっと むかし。<b>およそ 1まんねん いじょう</b> つづいた じだいだよ。' +
      'きみは じょうもんの むらで 1ねん くらす。</p>' +
      '<p style="text-align:left">🌸はる → ☀️なつ → 🍁あき → ❄️ふゆ。1つの きせつに しごとは <b>3かい</b>まで。' +
      'ふゆが おわるまでに たくわえを <b>' + NEED + '</b> あつめよう。</p>' +
      '<p style="text-align:left">🏺 どきが あると にて たくさん たべられる。🛖 いえを ふやすと なかまが てつだって くれる。' +
      '🗑️ ごみは かいづかへ。1ねんが おわったら ほって みよう！</p>' +
      '<p class="parent">おうちの かたへ: 小6 社会「縄文のむらから古墳のくにへ」の よしゅう・ふくしゅう用です。' +
      'いね・きんぞくの どうぐ・たかゆかそうこ は やよいじだいの ものなので むらには でません（ずかんの「つぎの じだい」で くらべられます）。' +
      'ねんだいの くわしい せつめいと 出典は README.md に あります。</p>',
      [{ label: 'あそぶ' }, { label: '🔄 さいしょから', cls: 'sub', fn: resetAsk }]);
  }
  function resetAsk() {
    dialog('<p>むらを さいしょから やりなおす？<br>（ずかんは のこるよ）</p>', [
      { label: 'やりなおす', fn: function () { var z = st.zukan, i = st.isekiIdx, se = st.se, bg = st.bgm; st = fresh(); st.zukan = z; st.isekiIdx = i; st.se = se; st.bgm = bg; st.seenIntro = true; save(); render(); seasonIntro(); } },
      { label: 'やめる', cls: 'sub' }]);
  }

  // ===== イベント =====
  function startJob(id) {
    var j = JOB[id]; if (!j || jobBlocked(j)) return;
    SND.unlock(); SND.play('tap');
    GAMES[id](j);
  }
  $('jobs').addEventListener('click', function (e) { var b = e.target.closest('[data-job]'); if (b && !b.disabled) startJob(b.getAttribute('data-job')); });
  $('scene').addEventListener('click', function (e) {
    var g = e.target.closest('.spot'); if (!g) return;
    SND.unlock(); SND.play('tap');
    selPlace = g.getAttribute('data-place');
    if (selPlace === 'hiroba' || selPlace === 'kaizuka') SND.play('fire');
    if (selPlace === 'umi') SND.play('wave');
    renderJobs();
    var list = JOBS.filter(function (j) { return j.place === selPlace && (!j.season || j.season === SEASONS[st.season].id); });
    say('📍 <b>' + PLACES[selPlace] + '</b>: ' + (list.length ? list.map(function (j) { return j.emoji + ' ' + j.name; }).join('、') + ' が できるよ。' : 'いまの きせつは ここで できる しごとが ないよ。'));
    var first = document.querySelector('.job.glow');
    if (first && window.innerWidth < 900) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('btnNext').onclick = function () { SND.unlock(); nextSeason(); };
  $('playClose').onclick = function () { closePlay(); say('しごとを やめたよ（かいすうは へらないよ）。'); };
  $('btnZukan').onclick = function () { SND.unlock(); openZukan(); };
  $('zukanClose').onclick = function () { $('zukan').hidden = true; };
  $('zukanTabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) { zTab = b.getAttribute('data-tab'); openZukan(); } });
  $('zukanCards').addEventListener('click', function (e) { var b = e.target.closest('[data-card]'); if (b) showCard(b.getAttribute('data-card')); });
  $('btnSe').onclick = function () { st.se = !st.se; SND.setSe(st.se); SND.unlock(); SND.play('tap'); save(); render(); };
  $('btnBgm').onclick = function () { st.bgm = !st.bgm; SND.unlock(); SND.setBgm(st.bgm); save(); render(); };
  $('btnHelp').onclick = help;
  // オーディオは さいしょの タップで はじめる（ブラウザの きまり）
  document.addEventListener('pointerdown', function first() { SND.unlock(); document.removeEventListener('pointerdown', first); });

  // ===== はじめ =====
  load();
  SND.setSe(st.se);
  if (st.bgm) SND.setBgm(true);
  render();
  seasonIntro();
  if (st.digging) {
    dialog('<h3>⛏️ はっくつの つづき</h3><p>ふゆを こしたね。かいづかを ほって みよう！</p>', [{ label: '⛏️ はっくつ モードへ', fn: excavate }]);
  } else if (!st.seenIntro) {
    st.seenIntro = true; save();
    dialog('<h3>🏺 じょうもん むらへ ようこそ</h3>' +
      '<p>ずっと むかし、<b>およそ 1まんねん いじょう</b> つづいた じょうもんじだい。</p>' +
      '<p>ひとびとは たてあなじゅうきょに すみ、かりや りょう、きのみ あつめを して くらして いた。どきを つくって にたきも したよ。</p>' +
      '<p>きみも むらで 1ねん くらして、ふゆを こせるだけの たべものを あつめよう！</p>',
      [{ label: 'はじめる', cls: 'green' }, { label: '❓ あそびかた', cls: 'sub', fn: help }]);
  }
})();
