'use strict';
/* がめんの きりかえ と、おはなしの しんこう */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  const KEY = 'densha-naisho-v1';
  const st = { name: 'あおちゃん', sfx: true, voice: true, stars: 0, seen: {}, visits: {}, mem: {} };
  function load() {
    try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && typeof d === 'object') Object.assign(st, d); } catch (e) { /* はじめて */ }
    ['seen', 'visits', 'mem'].forEach(function (k) { if (!st[k] || typeof st[k] !== 'object') st[k] = {}; });
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ほぞん できなくても あそべる */ } }

  let T0 = null;          // いまの でんしゃ
  let run = null;         // いまの おはなし { steps, i, talk, genre }
  let cur = null;         // いまの ステップ
  let lastTalk = '';
  let lastGenre = '';
  let lineToken = 0;
  let typeTimer = 0;
  let autoTimer = 0;
  let hintTimer = 0;
  let trainEl = null;

  /* ---------- ことばづかい ---------- */
  function fmt(s) {
    const t = T0 || TRAINS[0];
    const sl = t.id === 'd51';
    return String(s).replace(/\{n\}/g, st.name).replace(/\{me\}/g, t.me).replace(/\{dane\}/g, t.dane).replace(/\{da\}/g, t.da)
      .replace(/\{nda\}/g, t.nda).replace(/\{yo\}/g, sl ? 'ぞ' : 'よ').replace(/\{ne\}/g, sl ? 'のう' : 'ね');
  }
  const PRAISE = ['せいかい{da}!', 'ぴんぽーん! あたり{da}!', 'そのとおり{da}!', 'すごい! {n}は ものしり{dane}!', 'おみごと{da}!'];
  const SOFT = ['おしい! もういちど かんがえて みよう。', 'うーん、ちょっと ちがう みたい。', 'もう いっかい、ゆっくり かんがえて みて。'];
  const MENU = ['つぎは なんの おはなしを する?', '{n}、どの おはなしが いい?', 'さあ、つぎは なにを はなそう?'];

  /* ---------- がめん ---------- */
  function show(id) {
    ['scTitle', 'scDepot', 'scTalk'].forEach(function (s) { $(s).hidden = s !== id; });
  }
  function setStars() { document.querySelectorAll('.starN').forEach(function (e) { e.textContent = st.stars; }); }

  function buildDepot() {
    $('cards').innerHTML = TRAINS.map(function (t) {
      const v = st.visits[t.id] || 0;
      return '<button class="tcard" type="button" data-id="' + t.id + '" style="--c:' + t.color + '">' + Art.card(t.id) +
        '<span class="nm">' + t.name + '</span><span class="sb">' + t.sub + '</span><span class="ht">' + (v ? '💗 ' + v + 'かい' : 'はじめまして') + '</span></button>';
    }).join('');
  }

  /* ---------- けしき ---------- */
  function starPos(i) {
    let s = (i + 3) * 9301 + 49297; s %= 233280; const x = s / 233280; s = (s * 9301 + 49297) % 233280; const y = s / 233280;
    return [20 + x * 360, 16 + y * 150];
  }
  function drawMyStars(newOne) {
    const g = $('mystars'); if (!g) return;
    let h = '';
    const n = Math.min(st.stars, 120);
    for (let i = 0; i < n; i += 1) {
      const p = starPos(i);
      h += '<path class="mine' + (newOne && i === n - 1 ? ' new' : '') + '" style="animation-delay:' + (i % 7) * 0.3 + 's" transform="translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')" d="M0 -5 L1.4 -1.6 L5 -1.4 L2.2 0.9 L3.1 4.5 L0 2.5 L-3.1 4.5 L-2.2 0.9 L-5 -1.4 L-1.4 -1.6Z"/>';
    }
    g.innerHTML = h;
  }
  function weather(kind) {
    const g = $('weather'); if (!g) return;
    let h = '';
    if (kind === 'rain') for (let i = 0; i < 46; i += 1) h += '<path class="drop" d="M' + (Math.random() * 420).toFixed(0) + ' ' + (Math.random() * -60).toFixed(0) + ' l-4 16" style="animation-delay:' + (-Math.random()).toFixed(2) + 's"/>';
    if (kind === 'snow') for (let i = 0; i < 40; i += 1) h += '<circle class="flake" cx="' + (Math.random() * 400).toFixed(0) + '" cy="0" r="' + (1 + Math.random() * 1.8).toFixed(1) + '" style="animation-delay:' + (-Math.random() * 4).toFixed(2) + 's"/>';
    g.innerHTML = h;
    clearTimeout(weather.t);
    if (kind) weather.t = setTimeout(function () { weather(''); }, 7000);
  }
  function cls(el, name, ms) {
    if (!el) return;
    el.classList.remove(name); void el.getBoundingClientRect(); el.classList.add(name);
    if (ms) setTimeout(function () { el.classList.remove(name); }, ms);
  }
  function led(text) { const e = trainEl && trainEl.querySelector('.led'); if (e) e.textContent = text || T0.led || ''; }

  function fx(name) {
    if (!name) return;
    if (Array.isArray(name)) { name.forEach(fx); return; }
    if (name === 'horn') { Sound.play('horn', T0.horn); cls(trainEl, 'high', 900); if (T0.id === 'd51') cls(trainEl, 'steaming', 2000); }
    else if (name === 'beam') { cls(trainEl, 'high', 1400); Sound.play('tap'); }
    else if (name === 'wiper') { cls(trainEl, 'wipe', 2200); Sound.play('wiper'); }
    else if (name === 'rain' || name === 'snow') { weather(name); if (name === 'rain') Sound.play('rain'); }
    else if (name === 'shoot') { cls($('shoot'), 'go', 1300); Sound.play('star'); }
    else if (name === 'rainbow') { weather(''); $('rainbow').style.opacity = '.75'; setTimeout(function () { $('rainbow').style.opacity = '0'; }, 6000); }
    else if (name === 'steam') { cls(trainEl, 'steaming', 2000); Sound.play('steam'); }
    else if (name === 'spark') { cls(trainEl, 'sparking', 1000); Sound.play('spark'); }
    else if (name === 'dark') { trainEl.classList.add('dark'); Sound.play('oops'); }
    else if (name === 'third') { $('third').style.opacity = '1'; }
    else if (name.indexOf('sig-') === 0) { $('signal').setAttribute('class', name.slice(4)); Sound.play('tap'); }
    else if (name.indexOf('moon-') === 0) { setMoon(name.slice(5)); }
    else Sound.play(name);
  }
  function setMoon(phase) {
    const sh = $('moonshade'); if (!sh) return;
    const dx = { full: 0, half: -13, crescent: -7, new: 0 }[phase];
    sh.setAttribute('opacity', phase === 'full' ? '0' : '1'); sh.setAttribute('cx', dx);
  }

  /* ---------- ライトで うつす え ---------- */
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function project(sp) {
    const p = $('proj');
    if (!sp) { p.hidden = true; p.innerHTML = ''; return; }
    let h = '';
    if (sp.e) h = esc(sp.e);
    else if (sp.cars) {
      const col = sp.col || T0.color; let k = 0; const total = sp.cars.reduce(function (a, b) { return a + b; }, 0);
      h = '<div class="row">' + sp.cars.map(function (n, gi) {
        let g = '';
        for (let i = 0; i < n; i += 1) { k += 1; g += Art.car(col, k === 1 || k === total, sp.off && k > total - sp.off); }
        return (gi ? '<span class="plus">＋</span>' : '') + g;
      }).join('') + '</div>';
    } else if (sp.shape) h = '<div class="row">' + Art.shape(sp.shape, 84) + '</div>';
    else if (sp.shapes) h = '<div class="row">' + sp.shapes.map(function (s) { return Art.shape(s, 70); }).join('<span class="plus">＋</span>') + '</div>';
    else if (sp.moon) h = '<div class="row">' + Art.moon(sp.moon) + '</div>';
    else if (sp.clock) h = '<div class="row">' + Art.clock(sp.clock) + '</div>';
    else if (sp.word) {
      const ch = Array.from(sp.word); const hi = sp.hi < 0 ? ch.length + sp.hi : sp.hi;
      h = '<div class="word">' + ch.map(function (c, i) { return i === hi ? '<b>' + esc(c) + '</b>' : esc(c); }).join('') + '</div>';
    } else if (sp.bars) h = '<div class="bars">' + sp.bars.map(function (n) { return '<i style="width:' + n * 24 + 'px"></i>'; }).join('') + '</div>';
    else if (sp.txt) h = '<div class="txt">' + esc(sp.txt) + '</div>';
    p.innerHTML = h; p.hidden = false;
    p.style.animation = 'none'; void p.offsetWidth; p.style.animation = '';
  }

  /* ---------- しゃべる ---------- */
  function clearTimers() { clearInterval(typeTimer); clearTimeout(autoTimer); clearTimeout(hintTimer); }
  /* onTyped: もじが ぜんぶ でた / onDone(spoken): こえも おわった */
  function say(text, onTyped, onDone) {
    clearTimers(); lineToken += 1; const my = lineToken;
    const full = fmt(text); const chars = Array.from(full); const el = $('line');
    let i = 0; let typed = false; let spokenDone = false; let wasSpoken = false;
    el.textContent = '';
    trainEl.classList.add('talking');
    function fin() {
      if (my !== lineToken || !typed || !spokenDone) return;
      trainEl.classList.remove('talking');
      if (onDone) onDone(wasSpoken);
    }
    typeTimer = setInterval(function () {
      if (my !== lineToken) { clearInterval(typeTimer); return; }
      i += 1; el.textContent = chars.slice(0, i).join('');
      if (i >= chars.length) { clearInterval(typeTimer); typed = true; if (onTyped) onTyped(); fin(); }
    }, 42);
    Sound.speak(full, T0.voice, function (spoken) { if (my !== lineToken) return; spokenDone = true; wasSpoken = spoken; fin(); });
  }
  function clearUI() {
    $('choices').innerHTML = ''; $('choices').className = 'choices';
    $('btnNext').hidden = true; $('btnMic').hidden = true; $('btnMic').classList.remove('on');
    Sound.stopListen();
    document.querySelectorAll('.hot').forEach(function (e) { e.classList.remove('hot'); });
  }
  /* いって、つぎへ すすむ（こえが あれば じどう、なければ ボタン） */
  function sayThen(text, then) {
    clearUI();
    let gone = false;
    function go() { if (gone) return; gone = true; clearTimers(); $('btnNext').hidden = true; then(); }
    $('btnNext').onclick = function () { Sound.play('tap'); Sound.stopSpeak(); go(); };
    say(text, function () { $('btnNext').hidden = false; }, function (spoken) { if (spoken) autoTimer = setTimeout(go, 650); });
  }

  /* ---------- おはなしを すすめる ---------- */
  function ctx() { return { n: st.name, t: T0, mem: st.mem }; }
  function startTalk(genre, talk) {
    const steps = talk.f(ctx());
    run = { steps: steps, i: -1, talk: talk, genre: genre };
    lastTalk = talk.id; lastGenre = genre.id;
    const tag = $('genreTag'); tag.hidden = false; tag.textContent = genre.emoji + ' ' + genre.name; tag.style.color = genre.color;
    nextStep();
  }
  function nextStep() {
    if (!run) return;
    run.i += 1;
    if (run.i >= run.steps.length) { endTalk(); return; }
    cur = run.steps[run.i]; cur.tries = 0;
    if ('show' in cur) project(cur.show);
    if (cur.fx && cur.k === 'say') fx(cur.fx);
    if (cur.led) led(cur.led);
    if (cur.k === 'say') sayThen(cur.text, nextStep);
    else if (cur.k === 'ask') ask(cur);
    else if (cur.k === 'tap') tapStep(cur);
  }
  function endTalk() {
    const id = run.genre.id + '/' + run.talk.id;
    st.seen[id] = (st.seen[id] || 0) + 1; st.stars += 1; save();
    run = null; cur = null; clearUI(); led('');
    trainEl.classList.remove('dark');
    Sound.play('star'); cls($('flystar'), 'fly', 1200);
    setTimeout(function () { setStars(); drawMyStars(true); }, 900);
    const bonus = st.stars % 5 === 0;
    if (bonus) setTimeout(function () { fx('shoot'); }, 1200);
    const msg = bonus ? 'ほしが ' + st.stars + 'こに なった{yo}! ' + T0.cheer + ' ながれぼしの プレゼント{da}。'
      : pick(['おはなし できて うれしい{yo}。よぞらに ほしを 1つ ふやす{ne}。', 'たのしかった{ne}。ほしが 1つ ふえた{yo}。', 'ないしょばなし、もう 1つ できた{ne}。ほしを どうぞ。']);
    sayThen(msg, menu);
  }

  function menu() {
    project(null); $('genreTag').hidden = true; clearUI();
    const box = $('choices'); box.className = 'choices genres';
    Naisho.genres.forEach(function (g) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'gch'; b.style.setProperty('--g', g.color);
      b.innerHTML = '<span>' + g.emoji + '</span>' + g.name;
      b.onclick = function () { Sound.play('tap'); chooseTalk(g); };
      box.appendChild(b);
    });
    const any = document.createElement('button'); any.type = 'button'; any.className = 'gch any'; any.style.setProperty('--g', '#ffffff');
    any.innerHTML = '<span>✨</span>おまかせ';
    any.onclick = function () { Sound.play('tap'); chooseTalk(null); };
    box.appendChild(any);
    say(pick(MENU), null, null);
  }
  function eligible(g) {
    const c = ctx();
    return g.talks.filter(function (t) { return (!t.only || t.only.indexOf(T0.id) >= 0) && (!t.need || t.need(c)); });
  }
  function chooseTalk(g) {
    if (!g) {
      const gs = Naisho.genres.filter(function (x) { return x.id !== lastGenre && eligible(x).length; });
      g = pick(gs.length ? gs : Naisho.genres);
    }
    let list = eligible(g);
    if (list.length > 1) list = list.filter(function (t) { return t.id !== lastTalk; });
    /* まだ はなして いない ものを さきに。その でんしゃ だけの ひみつは すこし ゆうせん */
    let best = null; let bestScore = Infinity;
    list.forEach(function (t) {
      const sc = (st.seen[g.id + '/' + t.id] || 0) - (t.only ? 0.5 : 0) + Math.random() * 0.9;
      if (sc < bestScore) { bestScore = sc; best = t; }
    });
    if (!best) { menu(); return; }
    clearUI(); cls(trainEl, 'nod', 500);
    startTalk(g, best);
  }

  /* ---------- しつもん ---------- */
  function ask(step) {
    clearUI();
    let items = step.choices.map(function (t, i) { return { t: t, i: i }; });
    if (step.mix) items = shuffle(items);
    const box = $('choices');
    const longest = Math.max.apply(null, items.map(function (x) { return Array.from(x.t).length; }));
    if (items.length === 1 || longest > 12) box.classList.add('one');
    let locked = false; let revealed = false;
    const btns = [];
    function choose(it, b) {
      if (locked) return; Sound.stopListen(); $('btnMic').classList.remove('on');
      if (step.ok === undefined) {          // こたえは ぜんぶ せいかい
        locked = true; b.classList.add('done'); Sound.play('ok'); cls(trainEl, 'happy', 700);
        if (step.fx) fx(step.fx);
        if (step.save) { st.mem[step.save] = it.t; save(); }
        const re = typeof step.re === 'function' ? step.re(it.t, it.i) : (step.re && step.re[it.i]) || 'そう なんだ{ne}。おしえて くれて ありがとう。';
        setTimeout(function () { sayThen(re, nextStep); }, 250);
        return;
      }
      if (it.i === step.ok) {
        locked = true; b.classList.remove('yes'); b.classList.add('done'); Sound.play('ok'); cls(trainEl, 'happy', 700); led('せいかい');
        if (step.fx) fx(step.fx);
        const head = revealed ? 'そう、「' + it.t.replace(/^[^ぁ-んァ-ヶ0-9A-Za-z]+/, '') + '」{da}。' : pick(PRAISE) + ' ';
        setTimeout(function () { sayThen(head + (step.yes || ''), function () { led(''); nextStep(); }); }, 250);
        return;
      }
      step.tries += 1; b.classList.add('no'); Sound.play('oops'); cls(trainEl, 'oops', 600);
      if (step.tries >= 2 || items.length <= 2) {
        revealed = true;
        btns.forEach(function (x) { if (x.it.i === step.ok) x.b.classList.add('yes'); else x.b.classList.add('no'); });
        say((step.hint ? step.hint + ' ' : '') + 'ひかって いる ほうを おして みて。', null, null);
      } else {
        say(pick(SOFT) + ' ' + (step.hint || ''), null, null);
      }
    }
    items.forEach(function (it) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ch'; b.textContent = it.t;
      if (items.length === 3 && btns.length === 2 && !box.classList.contains('one')) b.classList.add('long');
      b.onclick = function () { Sound.play('tap'); choose(it, b); };
      btns.push({ it: it, b: b });
    });
    say(step.text, function () {
      btns.forEach(function (x) { box.appendChild(x.b); });
      if (Sound.canListen()) { $('btnMic').hidden = false; $('btnMic').onclick = function () { hear(btns, choose); }; }
    }, null);
  }

  /* こえで こたえる */
  const KANA = ['ぜろ', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう', 'じゅう'];
  const KANJI = '〇一二三四五六七八九十';
  function norm(s) {
    return String(s).replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); })
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[^ぁ-んー0-9一-龠〇]/g, '');
  }
  function numOf(s) {
    const m = s.match(/\d+/); if (m) return parseInt(m[0], 10);
    for (let n = 10; n >= 0; n -= 1) if (s.indexOf(KANA[n]) >= 0 || s.indexOf(KANJI[n]) >= 0) return n;
    if (s.indexOf('し') === 0) return 4; if (s.indexOf('しち') >= 0) return 7; if (s.indexOf('く') === 0) return 9;
    return null;
  }
  function hear(btns, choose) {
    const mic = $('btnMic');
    if (mic.classList.contains('on')) { Sound.stopListen(); mic.classList.remove('on'); return; }
    mic.classList.add('on');
    Sound.listen(function (alts) {
      mic.classList.remove('on');
      let hit = null;
      alts.some(function (a) {
        const s = norm(a); if (!s) return false;
        const n = numOf(s);
        btns.some(function (x) {
          if (x.b.classList.contains('no')) return false;
          const label = norm(x.it.t); const m = label.match(/^\d+/);
          if (m) { if (n !== null && n === parseInt(m[0], 10)) hit = x; }
          else if (label && (s.indexOf(label) >= 0 || (s.length >= 2 && label.indexOf(s) >= 0))) hit = x;
          return !!hit;
        });
        return !!hit;
      });
      if (hit) choose(hit.it, hit.b);
      else say('ごめんね、よく きこえなかった{yo}。もういちど いうか、ボタンを おしてね。', null, null);
    }, function () { mic.classList.remove('on'); });
  }

  /* ---------- ぶひんを タップ ---------- */
  function partEls(spec) {
    let sel = '[data-part="' + spec.part + '"]'; if (spec.side) sel += '[data-side="' + spec.side + '"]';
    return trainEl.querySelectorAll(sel);
  }
  function hot(spec) { partEls(spec).forEach(function (e) { e.classList.add('hot'); }); }
  function tapStep(step) {
    clearUI();
    step.waiting = false;
    say(step.text, function () {
      step.waiting = true;
      const box = $('choices'); box.classList.add('one');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ch'; b.textContent = '💡 ヒント';
      b.onclick = function () { Sound.play('tap'); hot(step.part); say((step.hint ? step.hint + ' ' : '') + 'ひかって いる ところを タップ してね。', null, null); };
      box.appendChild(b);
      hintTimer = setTimeout(function () { hot(step.part); }, 9000);
    }, null);
  }
  function onPart(el) {
    const part = el.getAttribute('data-part'); const side = el.getAttribute('data-side');
    if (cur && cur.k === 'tap' && cur.waiting) {
      const want = cur.part;
      if (part === want.part && (!want.side || want.side === side)) {
        cur.waiting = false; clearTimeout(hintTimer); clearUI();
        trainEl.classList.remove('dark');
        Sound.play('ok'); cls(trainEl, 'happy', 700); if (cur.fx) fx(cur.fx);
        const step = cur;
        setTimeout(function () { sayThen((step.yes || pick(PRAISE)), nextStep); }, 250);
      } else {
        cur.tries += 1; Sound.play('oops'); cls(trainEl, 'oops', 600);
        const nm = part === 'light' && want.part === 'light' ? 'はんたいがわの ライト' : PART_NAME[part];
        if (cur.tries >= 2) hot(want);
        say('そこは ' + nm + '{da}。' + (cur.tries >= 2 ? 'ひかって いる ところを みて。' : (cur.hint || 'ほかの ところも さがして みて。')), null, null);
      }
      return;
    }
    /* じゆうに さわる */
    if (trainEl.classList.contains('dark')) return;
    if (part === 'light') fx('beam');
    else if (part === 'window') fx('wiper');
    else if (part === 'panta') fx('spark');
    else if (part === 'cyl') fx('steam');
    else fx('horn');
  }

  /* よこに ひろい がめんでは けしきを きらずに ぜんぶ みせる（でんしゃが はみださない ように） */
  function fitScene() {
    const sv = $('scene'); const box = $('stage'); if (!sv || !box.clientHeight) return;
    const wide = box.clientWidth / box.clientHeight > 1.0;
    sv.setAttribute('preserveAspectRatio', wide ? 'xMidYMax meet' : 'xMidYMax slice');
    box.classList.toggle('wide', wide);
  }

  /* ---------- でんしゃに あいに いく ---------- */
  function enter(id) {
    T0 = TRAINS.find(function (t) { return t.id === id; });
    document.documentElement.style.setProperty('--tc', T0.color);
    show('scTalk');
    $('sceneBox').innerHTML = Art.scene();
    trainEl = $('train'); trainEl.innerHTML = Art.train(id);
    fitScene();
    $('third').style.opacity = id === 'blue' ? '.9' : '0';
    $('signal').setAttribute('class', 'ao');
    setMoon('full');
    $('whoName').textContent = T0.name; $('whoSub').textContent = T0.sub; $('genreTag').hidden = true;
    drawMyStars(false); setStars(); project(null); clearUI(); $('line').textContent = '';
    run = null; cur = null; lastTalk = ''; lastGenre = '';
    cls(trainEl, 'enter', 1500); Sound.play('gatan');
    const first = !st.visits[id];
    st.visits[id] = (st.visits[id] || 0) + 1; save();
    setTimeout(function () {
      if ($('scTalk').hidden) return;
      fx('horn');
      sayThen(first ? T0.hello : pick(T0.again), function () {
        if (first) sayThen('{me}の ライトや まどを タップ すると、うごく{yo}。おはなし すると よぞらに ほしが ふえる{nda}。', menu);
        else menu();
      });
    }, 1500);
  }
  function leave() {
    clearTimers(); lineToken += 1; Sound.stopSpeak(); Sound.stopListen(); weather(''); run = null; cur = null;
    buildDepot(); setStars(); show('scDepot');
  }

  /* ---------- はじまり ---------- */
  function setToggles() {
    $('btnSfx').setAttribute('aria-pressed', String(st.sfx)); $('btnSfx').textContent = st.sfx ? '🔊' : '🔇';
    $('btnVoice').setAttribute('aria-pressed', String(st.voice));
    Sound.setSfx(st.sfx); Sound.setVoice(st.voice);
  }
  function init() {
    load();
    $('defs').innerHTML = Art.DEFS;
    $('titleTrain').innerHTML = Art.card('blue');
    setToggles(); setStars(); buildDepot();

    $('btnStart').onclick = function () { Sound.unlock(); Sound.play('door'); show('scDepot'); };
    $('btnHome').onclick = function () { Sound.play('tap'); show('scTitle'); };
    $('btnBack').onclick = function () { Sound.play('tap'); leave(); };
    $('cards').addEventListener('click', function (e) {
      const b = e.target.closest('.tcard'); if (!b) return;
      Sound.unlock(); enter(b.getAttribute('data-id'));
    });
    $('sceneBox').addEventListener('click', function (e) {
      const el = e.target.closest('[data-part]'); if (el && trainEl && trainEl.contains(el)) onPart(el);
    });
    $('btnSfx').onclick = function () { st.sfx = !st.sfx; save(); setToggles(); Sound.play('tap'); };
    $('btnVoice').onclick = function () {
      st.voice = !st.voice; save(); setToggles();
      if (!st.voice) $('btnNext').hidden = false;
    };
    $('btnParent').onclick = function () { $('inName').value = st.name; $('parent').hidden = false; };
    $('btnClose').onclick = function () {
      const v = $('inName').value.trim(); st.name = v || 'あおちゃん'; save(); $('parent').hidden = true;
    };
    $('btnReset').onclick = function () {
      if (!window.confirm('ほしや おぼえた ことを ぜんぶ けします。よろしい ですか?')) return;
      st.stars = 0; st.seen = {}; st.visits = {}; st.mem = {}; save(); setStars(); buildDepot(); $('parent').hidden = true;
    };
    /* まばたき（ライトが ちょっと きえる） */
    setInterval(function () {
      if (!trainEl || $('scTalk').hidden || trainEl.classList.contains('dark')) return;
      cls(trainEl, 'blink', 150);
    }, 4300);
    window.addEventListener('resize', fitScene);
    document.addEventListener('visibilitychange', function () { if (document.hidden) Sound.stopSpeak(); });
  }
  init();
})();
