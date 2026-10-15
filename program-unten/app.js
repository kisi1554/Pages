// ===== プログラミング うんてんし：がめんと うごき =====
(function () {
  'use strict';
  const E = window.PU_ENGINE, STAGES = window.PU_STAGES;
  const $ = id => document.getElementById(id);

  const CARD = {
    F: { sym: '⬆', name: 'まっすぐ' },
    L: { sym: '↰', name: 'ひだり' },
    R: { sym: '↱', name: 'みぎ' },
    S: { sym: '🛑', name: 'とまる' },
    B: { sym: '🚏', name: 'のせる' },
    P: { sym: '🔁', name: 'くりかえし' },
  };
  const REASON = {
    out: 'マップの そとに でちゃう！',
    tree: 'きに ぶつかっちゃう！',
    pond: 'いけに おちちゃう！',
    house: 'いえに ぶつかっちゃう！',
    nostation: 'ここは えきじゃないよ',
    notall: 'まだ のっていない おきゃくさんが いるよ',
    nobody: 'ここには おきゃくさんが いないよ',
    already: 'この おきゃくさんは もう のせたよ',
    passed: 'えきを とおりすぎちゃった',
    nostop: 'えきで 🛑とまる を わすれたよ',
    short: 'えきまで とどかなかったよ',
    empty: 'したの カードを タップして ならべてね',
  };

  // ===== ほぞん =====
  const KEY = 'program-unten-v1';
  let save = { stars: {}, sound: true, fast: false, seen: {} };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') save = Object.assign(save, s);
  } catch (e) { /* よめなくても あそべる */ }
  function store() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても つづける */ }
  }
  const starCount = m => (m & 1) + (m >> 1 & 1) + (m >> 2 & 1);
  const unlocked = id => id === 1 || ((save.stars[id - 1] || 0) & 1);

  // ===== おと（WebAudio の ごうせいおん） =====
  let ac = null;
  function actx() {
    if (!save.sound) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { return null; }
    return ac;
  }
  function tone(f, t0, dur, type = 'sine', vol = .2, f2) {
    const a = actx(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02);
  }
  function noise(t0, dur, vol = .25, freq = 900) {
    const a = actx(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + t0;
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start(t);
  }
  const SND = {
    tap() { tone(880, 0, .06, 'triangle', .12); },
    del() { tone(500, 0, .08, 'triangle', .12, 300); },
    go() { noise(0, .06, .3, 500); noise(.13, .06, .3, 700); },               // ガタン ゴトン
    turn() { tone(1300, 0, .18, 'sine', .07, 1700); noise(0, .05, .2, 600); }, // キュイッ
    gachan() { noise(0, .12, .45, 300); tone(140, 0, .2, 'square', .12, 70); noise(.1, .08, .3, 1800); },
    board() { tone(988, 0, .2, 'sine', .18); tone(784, .18, .3, 'sine', .18); },  // ピンポン
    kankan() { for (let i = 0; i < 4; i++) tone(i % 2 ? 760 : 900, i * .16, .14, 'square', .06); },
    buzz() { tone(150, 0, .22, 'sawtooth', .16); tone(140, .26, .32, 'sawtooth', .16); },
    fanfare() {
      [[523, 0, .14], [659, .14, .14], [784, .28, .14], [1047, .42, .5]].forEach(([f, t, d]) => { tone(f, t, d, 'triangle', .2); tone(f / 2, t, d, 'square', .05); });
      [784, 988, 1175].forEach(f => tone(f, .62, .6, 'triangle', .1));
    },
  };
  function updSoundBtns() {
    document.querySelectorAll('.snd').forEach(b => { b.textContent = save.sound ? '🔊' : '🔇'; });
  }
  document.querySelectorAll('.snd').forEach(b => b.addEventListener('click', () => {
    save.sound = !save.sound; store(); updSoundBtns(); SND.tap();
  }));
  updSoundBtns();

  // ===== ステージを えらぶ がめん =====
  const GROUPS = [
    { from: 1, to: 5, name: 'まっすぐ と まがる', chips: '⬆ ↰ ↱' },
    { from: 6, to: 10, name: 'おきゃくさん と ふみきり', chips: '🚏' },
    { from: 11, to: 15, name: 'くりかえし', chips: '🔁' },
    { from: 16, to: 20, name: 'ひとひねり', chips: '🧩' },
  ];
  function renderSelect() {
    const g = $('groups'); g.textContent = '';
    for (const gr of GROUPS) {
      const box = document.createElement('div'); box.className = 'group';
      box.innerHTML = `<h2><span class="chips">${gr.chips}</span>${gr.from}〜${gr.to}　${gr.name}</h2>`;
      const list = document.createElement('div'); list.className = 'stages';
      for (let id = gr.from; id <= gr.to; id++) {
        const b = document.createElement('button');
        const m = save.stars[id] || 0, n = starCount(m), open = unlocked(id);
        b.type = 'button'; b.className = 'btn stbtn' + (open ? '' : ' locked') + (m & 1 ? ' done' : '');
        b.innerHTML = `${open ? id : '🔒'}<span class="st">${'★'.repeat(n)}<i>${'★'.repeat(3 - n)}</i></span>`;
        b.setAttribute('aria-label', `ステージ ${id}` + (open ? ` ほし ${n}` : ' まだ あそべない'));
        b.addEventListener('click', () => {
          if (!open) { SND.buzz(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
          SND.tap(); openStage(id);
        });
        list.appendChild(b);
      }
      box.appendChild(list); g.appendChild(box);
    }
  }
  function showSelect() {
    cancelRun();
    $('play').hidden = true; $('clear').hidden = true; $('select').hidden = false;
    renderSelect();
  }

  // ===== あそぶ がめん =====
  let stage = null, M = null, prog = [], openLoop = -1, hintUsed = false, showHint = false;
  let hintPath = null, crossDir = {};
  // でんしゃ と せんろ の ようす
  let train = null, segs = [], got = new Set(), fail = null, flyers = [], runToken = 0, running = false;
  let party = null;

  function openStage(id) {
    stage = STAGES[id - 1]; M = E.parseMap(stage);
    prog = []; openLoop = -1; hintUsed = false; showHint = false;
    $('hintBtn').style.background = '';
    // ヒントの みち と ふみきりの むき（こたえの すすみかたから きめる）
    const sol = E.run(stage, E.parseProg(stage.sol));
    hintPath = [{ x: M.start.x, y: M.start.y, d: M.start.d }];
    crossDir = {};
    for (const s of sol.steps) if (s.kind === 'move') {
      hintPath.push({ x: s.x, y: s.y, d: s.d });
      if (s.cross) crossDir[s.x + ',' + s.y] = s.d;
    }
    $('select').hidden = true; $('clear').hidden = true; $('play').hidden = false;
    $('stName').innerHTML = `<span class="stw">ステージ </span>${id}　${stage.title}`;
    const nc = M.customers.length;
    $('stGoal').textContent = nc ? `おきゃくさん ${nc}にんを のせて えきで とまろう` : 'えきまで いって 🛑 とまろう';
    renderPalette(); resetTrain(); renderProg(); layout();
    const tip = stage.tip;
    if (tip) { $('tip').textContent = '💬 ' + tip; $('tip').hidden = false; }
    else $('tip').hidden = true;
  }
  $('tip').addEventListener('click', () => { $('tip').hidden = true; });
  $('toSelect').addEventListener('click', () => { SND.tap(); showSelect(); });

  function renderPalette() {
    const p = $('palette'); p.textContent = '';
    for (const op of 'FLRSBP') {
      if (!stage.cards.includes(op)) continue;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn card'; b.dataset.op = op;
      b.innerHTML = `${CARD[op].sym}<small>${CARD[op].name}</small>`;
      b.setAttribute('aria-label', CARD[op].name + ' を ついか');
      b.addEventListener('click', () => addCard(op, b));
      p.appendChild(b);
    }
  }
  function addCard(op, btn) {
    const n = E.countCards(prog);
    if (n >= stage.limit || (op === 'P' && openLoop >= 0)) {
      SND.buzz();
      const el = op === 'P' && openLoop >= 0 ? btn : $('count');
      el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
      return;
    }
    SND.tap(); $('tip').hidden = true;
    if (op === 'P') { prog.push({ loop: 2, body: [] }); openLoop = prog.length - 1; }
    else if (openLoop >= 0) prog[openLoop].body.push(op);
    else prog.push(op);
    lastAdded = op === 'P' ? [prog.length - 1] : openLoop >= 0 ? [openLoop, prog[openLoop].body.length - 1] : [prog.length - 1];
    if (fail) resetTrain();
    renderProg();
  }
  let lastAdded = null;

  function cardEl(op, label) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn card'; b.dataset.op = op;
    b.innerHTML = `${CARD[op].sym}<small>${CARD[op].name}</small>`;
    b.setAttribute('aria-label', label);
    return b;
  }
  function renderProg() {
    const box = $('prog'); box.textContent = '';
    const n = E.countCards(prog);
    $('count').textContent = `${n} / ${stage.limit} まい`;
    $('count').classList.toggle('full', n >= stage.limit);
    if (!prog.length) {
      const e = document.createElement('div'); e.className = 'empty';
      e.textContent = 'したの カードを タップすると ここに ならぶよ';
      box.appendChild(e); return;
    }
    prog.forEach((it, i) => {
      if (typeof it === 'string') {
        const b = cardEl(it, `${i + 1}ばんめ ${CARD[it].name}（タップで けす）`);
        b.dataset.ref = String(i);
        b.addEventListener('click', () => { removeAt(i); });
        box.appendChild(b); return;
      }
      const lp = document.createElement('div');
      lp.className = 'loop' + (openLoop === i ? ' open' : '');
      const head = cardEl('P', 'くりかえし を けす');
      head.dataset.ref = String(i);
      head.addEventListener('click', () => { removeAt(i); });
      lp.appendChild(head);
      const t = document.createElement('button');
      t.type = 'button'; t.className = 'btn times'; t.dataset.ref = i + 't';
      t.innerHTML = `×${it.loop}<small>かい</small>`;
      t.setAttribute('aria-label', `${it.loop}かい くりかえす（タップで かえる）`);
      t.addEventListener('click', () => {
        it.loop = it.loop >= 4 ? 2 : it.loop + 1; SND.tap();
        if (fail) resetTrain();
        renderProg();
      });
      lp.appendChild(t);
      it.body.forEach((op, j) => {
        const b = cardEl(op, `くりかえしの なかの ${CARD[op].name}（タップで けす）`);
        b.dataset.ref = i + ',' + j;
        b.addEventListener('click', () => {
          it.body.splice(j, 1); SND.del();
          if (fail) resetTrain();
          renderProg();
        });
        lp.appendChild(b);
      });
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'btn close';
      if (openLoop === i) {
        if (!it.body.length) {
          const h = document.createElement('span'); h.className = 'hole'; h.textContent = 'ここに はいるよ';
          lp.appendChild(h);
        }
        c.textContent = '✓ とじる';
        c.addEventListener('click', () => { openLoop = -1; SND.tap(); renderProg(); });
      } else {
        c.textContent = '＋ いれる';
        c.addEventListener('click', () => { openLoop = i; SND.tap(); renderProg(); });
      }
      lp.appendChild(c);
      box.appendChild(lp);
    });
    if (lastAdded) {
      const el = box.querySelector(`[data-ref="${lastAdded.join(',')}"]`);
      if (el) { el.classList.add('pop'); el.scrollIntoView({ block: 'nearest' }); }
      lastAdded = null;
    }
  }
  function removeAt(i) {
    prog.splice(i, 1); SND.del();
    if (openLoop === i) openLoop = -1; else if (openLoop > i) openLoop--;
    if (fail) resetTrain();
    renderProg();
  }

  // ===== ヒント =====
  $('hintBtn').addEventListener('click', () => {
    SND.tap();
    showHint = !showHint;
    if (showHint) hintUsed = true;
    $('hintBtn').style.background = showHint ? 'rgba(255,255,255,.3)' : '';
    draw();
  });
  // ===== はやさ =====
  function updSpeed() {
    $('speedBtn').innerHTML = save.fast ? '🐇<small>はやい</small>' : '🐢<small>ゆっくり</small>';
  }
  $('speedBtn').addEventListener('click', () => { save.fast = !save.fast; store(); updSpeed(); SND.tap(); });
  updSpeed();

  // ===== せんろの かたち =====
  // 1マス すすむ ごとに、マスの まんなか → となりの まんなか を ベジェで つなぐ（まがるときは なめらかに カーブ）
  const K = .5;
  function segPoints(ax, ay, da, bx, by, db) {
    const P0 = [ax + .5, ay + .5], P3 = [bx + .5, by + .5];
    const P1 = [P0[0] + E.DX[da] * K, P0[1] + E.DY[da] * K];
    const P2 = [P3[0] - E.DX[db] * K, P3[1] - E.DY[db] * K];
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, u = 1 - t;
      pts.push([
        u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0],
        u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1],
      ]);
    }
    return pts;
  }
  function stubPoints(x, y, d) { // スタートの うしろ はんぶん
    const pts = [];
    for (let i = 0; i <= 4; i++) { const f = -.5 + i / 8; pts.push([x + .5 + E.DX[d] * f, y + .5 + E.DY[d] * f]); }
    return pts;
  }
  function pointAt(pts, t) {
    const f = Math.max(0, Math.min(1, t)) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), r = f - i;
    const a = pts[i], b = pts[i + 1];
    return { x: a[0] + (b[0] - a[0]) * r, y: a[1] + (b[1] - a[1]) * r, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }

  function resetTrain() {
    cancelRun();
    const s = M.start;
    train = { x: s.x + .5, y: s.y + .5, ang: Math.atan2(E.DY[s.d], E.DX[s.d]), cx: s.x, cy: s.y, d: s.d };
    segs = [{ pts: stubPoints(s.x, s.y, s.d), t: 1 }];
    got = new Set(); fail = null; flyers = []; party = null;
    $('bubble').hidden = true;
    clearMarks();
    draw();
  }
  $('resetBtn').addEventListener('click', () => { SND.tap(); resetTrain(); });

  // ===== うごかす =====
  function cancelRun() {
    runToken++; running = false;
    document.body.classList.remove('busy');
    if ($('runBtn')) $('runBtn').disabled = false;
  }
  function clearMarks() {
    document.querySelectorAll('#prog .now, #prog .bad').forEach(e => e.classList.remove('now', 'bad'));
  }
  function mark(ref, cls) {
    clearMarks();
    if (!ref) return null;
    const el = $('prog').querySelector(`[data-ref="${ref.join(',')}"]`);
    if (el) { el.classList.add(cls); el.scrollIntoView({ block: 'nearest' }); }
    if (ref.length === 2) {
      const t = $('prog').querySelector(`[data-ref="${ref[0]}t"]`);
      if (t && cls === 'now') t.classList.add('now');
    }
    return el;
  }
  function anim(ms, fn, tok) {
    return new Promise(res => {
      const t0 = performance.now();
      const tick = now => {
        if (tok !== runToken) return res(false);
        const t = Math.min(1, (now - t0) / ms);
        fn(t); draw();
        if (t < 1) requestAnimationFrame(tick); else res(true);
      };
      requestAnimationFrame(tick);
    });
  }
  const wait = (ms, tok) => anim(ms, () => {}, tok);

  $('runBtn').addEventListener('click', async () => {
    if (running) return;
    resetTrain();
    actx();
    $('tip').hidden = true;
    const tok = ++runToken;
    running = true; document.body.classList.add('busy'); $('runBtn').disabled = true;
    const res = E.run(stage, prog);
    const cnt = E.countCards(prog);
    const dur = save.fast ? 330 : 620;
    await wait(150, tok);
    for (const s of res.steps) {
      if (tok !== runToken) return;
      mark(s.ref, 'now');
      if (s.kind === 'move') {
        const pts = segPoints(s.from.x, s.from.y, s.from.d, s.x, s.y, s.d);
        const seg = { pts, t: 0 }; segs.push(seg);
        if (s.turn) SND.turn(); else SND.go();
        if (s.cross) SND.kankan();
        const ok = await anim(dur, t => {
          seg.t = t; const p = pointAt(pts, t);
          train.x = p.x; train.y = p.y; train.ang = p.ang;
        }, tok);
        if (!ok) return;
        train.cx = s.x; train.cy = s.y; train.d = s.d;
      } else if (s.kind === 'board') {
        SND.board();
        const k = s.x + ',' + s.y;
        got.add(k);
        const f = { x: s.x + .5, y: s.y + .5, t: 0 }; flyers.push(f);
        if (!await anim(dur, t => { f.t = t; }, tok)) return;
        flyers = flyers.filter(z => z !== f);
      } else if (s.kind === 'clear') {
        SND.gachan();
        if (!await wait(450, tok)) return;
        return finishClear(cnt, tok);
      } else if (s.kind === 'fail') {
        return showFail(s, res.reason, tok, s.ref, dur);
      }
      if (!await wait(save.fast ? 60 : 140, tok)) return;
    }
    if (tok !== runToken) return;
    showFail(res.at, res.reason, tok, null, dur);
  });

  async function showFail(at, reason, tok, ref, dur) {
    mark(ref, 'bad');
    const blocked = at.bx !== undefined;
    if (blocked) { // ぶつかる まえで ガクン
      SND.turn();
      const x0 = train.x, y0 = train.y, a0 = train.ang;
      const ta = Math.atan2(E.DY[at.d], E.DX[at.d]);
      const ok = await anim(dur * .6, t => {
        const k = Math.sin(t * Math.PI) * .28;
        train.x = x0 + E.DX[at.d] * k; train.y = y0 + E.DY[at.d] * k;
        train.ang = a0 + (((ta - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, t * 2);
      }, tok);
      if (!ok) return;
    }
    SND.buzz();
    fail = { x: at.x, y: at.y, bx: at.bx, by: at.by, t0: performance.now() };
    const b = $('bubble');
    b.innerHTML = `<b>ここで こまったよ</b>${REASON[reason] || ''}`;
    b.hidden = false;
    placeBubble();
    running = false; document.body.classList.remove('busy'); $('runBtn').disabled = false;
    loopFail(tok);
  }
  function loopFail(tok) { // ちかちか させる
    const f = () => { if (tok !== runToken || !fail) return; draw(); requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
  function placeBubble() {
    if (!fail || $('bubble').hidden) return;
    const b = $('bubble'), cs = mapSize / M.w;
    const cx = (fail.x + .5) * cs, cy = (fail.y + .5) * cs;
    const bw = b.offsetWidth, bh = b.offsetHeight;
    let left = cx - bw / 2, top = cy - cs * .7 - bh;
    if (top < 4) top = cy + cs * .7;
    left = Math.max(4, Math.min(mapSize - bw - 4, left));
    top = Math.max(4, Math.min(mapSize - bh - 4, top));
    b.style.left = left + 'px'; b.style.top = top + 'px';
  }

  async function finishClear(cnt, tok) {
    SND.fanfare();
    party = { t0: performance.now(), bits: [] };
    for (let i = 0; i < 40; i++) party.bits.push({ x: Math.random(), y: -Math.random() * .4, vx: (Math.random() - .5) * .3, vy: .25 + Math.random() * .35, c: ['#ff4d6d', '#ffd21f', '#2f7fe0', '#1fa463', '#8b5cf6'][i % 5], r: Math.random() * 6 });
    const mask = 1 | (hintUsed ? 0 : 2) | (cnt <= stage.min ? 4 : 0);
    const before = save.stars[stage.id] || 0;
    save.stars[stage.id] = before | mask; store();
    if (!await anim(900, () => {}, tok)) return;
    running = false; document.body.classList.remove('busy'); $('runBtn').disabled = false;
    clearMarks();
    const n = starCount(mask);
    $('clStars').innerHTML = '★'.repeat(n) + `<i>${'★'.repeat(3 - n)}</i>`;
    const li = (ok, txt) => `<li class="${ok ? '' : 'no'}">${ok ? '⭐' : '・'} ${txt}</li>`;
    $('clList').innerHTML = li(true, 'えきに ついた') + li(!hintUsed, 'ヒント なしで クリア') +
      li(cnt <= stage.min, `いちばん すくない ${stage.min}まいで クリア`);
    $('clMsg').textContent = cnt <= stage.min ? `${cnt}まいで できたね！ すごい！` :
      `${cnt}まい つかったよ。あと ${cnt - stage.min}まい へらせるかも？`;
    $('clNext').hidden = stage.id >= STAGES.length;
    $('clear').hidden = false;
  }
  $('clAgain').addEventListener('click', () => { SND.tap(); $('clear').hidden = true; resetTrain(); });
  $('clNext').addEventListener('click', () => { SND.tap(); openStage(stage.id + 1); });
  $('clSelect').addEventListener('click', () => { SND.tap(); showSelect(); });

  // ===== えを かく =====
  const cv = $('map'), ctx = cv.getContext('2d');
  let mapSize = 300, DPR = 1;
  function layout() {
    if ($('play').hidden) return;
    const m = $('main'), W = m.clientWidth - 16, H = m.clientHeight - 16;
    const land = matchMedia('(orientation: landscape) and (min-width: 640px)').matches;
    const ms = Math.floor(land ? Math.min(H, W - Math.max(300, W * .32)) : Math.min(W, H - 300));
    mapSize = Math.max(200, ms);
    document.documentElement.style.setProperty('--ms', mapSize + 'px');
    if (land) $('main').querySelector('.side').style.maxWidth = '';
    DPR = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(mapSize * DPR); cv.height = Math.round(mapSize * DPR);
    draw(); placeBubble();
  }
  window.addEventListener('resize', layout);

  const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  function draw() {
    if (!M) return;
    const cs = mapSize / M.w;
    const c = ctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, mapSize, mapSize);
    // くさ
    for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) {
      c.fillStyle = (x + y) % 2 ? '#9fd677' : '#a9dc82';
      c.fillRect(x * cs, y * cs, cs + .5, cs + .5);
    }
    c.save(); c.scale(cs, cs);
    // いけ・ふみきりの みち・えき（じめん）
    for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) {
      const ch = M.rows[y][x];
      if (ch === 'W') drawPond(c, x, y);
      else if (ch === 'X') drawRoad(c, x, y);
      else if (ch === 'G') drawStation(c, x, y);
    }
    // ヒントの みち
    if (showHint && hintPath) {
      c.save(); c.setLineDash([.12, .14]); c.lineCap = 'round';
      c.lineWidth = .14; c.strokeStyle = 'rgba(255,240,120,.95)';
      c.beginPath();
      for (let i = 1; i < hintPath.length; i++) {
        const a = hintPath[i - 1], b = hintPath[i];
        const pts = segPoints(a.x, a.y, a.d, b.x, b.y, b.d);
        if (i === 1) c.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts) c.lineTo(p[0], p[1]);
      }
      c.stroke(); c.restore();
    }
    // スタートの しるし
    drawStart(c, M.start.x, M.start.y);
    // せんろ
    drawTrack(c);
    // ふみきりの しゃだんき
    for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) if (M.rows[y][x] === 'X') drawGate(c, x, y);
    // き・いえ・おきゃくさん
    c.restore();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `bold ${Math.round(cs * .2)}px sans-serif`;
    c.fillStyle = '#fff'; c.fillText('えき', (M.goal.x + .5) * cs, (M.goal.y + .26) * cs);
    c.fillStyle = '#1e6fd9';
    c.fillText('スタート', (M.start.x + .5) * cs, (M.start.y + (M.start.d === 2 ? .14 : .88)) * cs);
    c.font = `${Math.round(cs * .74)}px ${EMOJI}`;
    for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) {
      const ch = M.rows[y][x];
      if (ch === 'T') c.fillText('🌳', (x + .5) * cs, (y + .54) * cs);
      else if (ch === 'H') c.fillText('🏠', (x + .5) * cs, (y + .52) * cs);
    }
    for (const p of M.customers) {
      if (got.has(p.x + ',' + p.y)) continue;
      c.font = `${Math.round(cs * .3)}px ${EMOJI}`;
      c.fillText('🚏', (p.x + .2) * cs, (p.y + .2) * cs);
      c.font = `${Math.round(cs * .56)}px ${EMOJI}`;
      c.fillText('🧑', (p.x + .74) * cs, (p.y + .7) * cs);
    }
    // でんしゃ
    drawTrain(c, cs);
    // のりこむ おきゃくさん
    for (const f of flyers) {
      const k = 1 - f.t;
      c.globalAlpha = Math.max(0, k);
      c.font = `${Math.round(cs * .56 * (.5 + k * .5))}px ${EMOJI}`;
      const fx = f.x + .24 * k, fy = f.y + .2 * k - Math.sin(f.t * Math.PI) * .5;
      c.fillText('🧑', fx * cs, fy * cs);
      c.globalAlpha = 1;
    }
    // こまった ところ
    if (fail) {
      const ph = (performance.now() - fail.t0) / 400;
      const r = cs * (.42 + .06 * Math.sin(ph * Math.PI));
      c.lineWidth = Math.max(3, cs * .07); c.strokeStyle = '#e0453a';
      c.beginPath(); c.arc((fail.x + .5) * cs, (fail.y + .5) * cs, r, 0, 7); c.stroke();
      if (fail.bx !== undefined) {
        const inside = fail.bx >= 0 && fail.by >= 0 && fail.bx < M.w && fail.by < M.h;
        const bx = (Math.max(-.25, Math.min(M.w - .75, fail.bx)) + .5) * cs;
        const by = (Math.max(-.25, Math.min(M.h - .75, fail.by)) + .5) * cs;
        const s = cs * (inside ? .3 : .2);
        c.globalAlpha = .55 + .45 * Math.abs(Math.sin(ph * Math.PI));
        c.lineWidth = Math.max(4, cs * .1); c.lineCap = 'round';
        c.beginPath(); c.moveTo(bx - s, by - s); c.lineTo(bx + s, by + s); c.moveTo(bx + s, by - s); c.lineTo(bx - s, by + s); c.stroke();
        c.globalAlpha = 1; c.lineCap = 'butt';
      }
    }
    // おいわい
    if (party) {
      const t = (performance.now() - party.t0) / 1000;
      for (const b of party.bits) {
        const x = (b.x + b.vx * t) * mapSize, y = (b.y + b.vy * t + .3 * t * t) * mapSize;
        if (y > mapSize) continue;
        c.save(); c.translate(x, y); c.rotate(b.r + t * 6);
        c.fillStyle = b.c; c.fillRect(-5, -3, 10, 6); c.restore();
      }
    }
  }

  function drawPond(c, x, y) {
    const n = (dx, dy) => M.rows[y + dy] && M.rows[y + dy][x + dx] === 'W';
    c.fillStyle = '#4fb0e8';
    const r = .28, x0 = x + (n(-1, 0) ? 0 : .06), x1 = x + 1 - (n(1, 0) ? 0 : .06);
    const y0 = y + (n(0, -1) ? 0 : .06), y1 = y + 1 - (n(0, 1) ? 0 : .06);
    c.beginPath();
    c.moveTo(x0 + r, y0);
    c.lineTo(x1 - (n(1, 0) || n(0, -1) ? 0 : r), y0);
    if (!(n(1, 0) || n(0, -1))) c.quadraticCurveTo(x1, y0, x1, y0 + r);
    c.lineTo(x1, y1 - (n(1, 0) || n(0, 1) ? 0 : r));
    if (!(n(1, 0) || n(0, 1))) c.quadraticCurveTo(x1, y1, x1 - r, y1);
    c.lineTo(x0 + (n(-1, 0) || n(0, 1) ? 0 : r), y1);
    if (!(n(-1, 0) || n(0, 1))) c.quadraticCurveTo(x0, y1, x0, y1 - r);
    c.lineTo(x0, y0 + (n(-1, 0) || n(0, -1) ? 0 : r));
    if (!(n(-1, 0) || n(0, -1))) c.quadraticCurveTo(x0, y0, x0 + r, y0);
    else c.lineTo(x0 + r, y0);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = .04; c.beginPath();
    for (const [ax, ay] of [[.32, .42], [.68, .72]]) {
      c.moveTo(x + ax - .1, y + ay); c.quadraticCurveTo(x + ax - .05, y + ay - .06, x + ax, y + ay);
      c.quadraticCurveTo(x + ax + .05, y + ay + .06, x + ax + .1, y + ay);
    }
    c.stroke();
  }
  function roadVertical(x, y) { // みちが たてか（せんろが よこに とおる）
    const d = crossDir[x + ',' + y];
    return d === undefined ? true : d % 2 === 1;
  }
  function drawRoad(c, x, y) {
    c.save(); c.translate(x + .5, y + .5); if (!roadVertical(x, y)) c.rotate(Math.PI / 2);
    c.fillStyle = '#7b7d84'; c.fillRect(-.32, -.5, .64, 1);
    c.fillStyle = '#fff'; c.fillRect(-.32, -.5, .025, 1); c.fillRect(.295, -.5, .025, 1);
    for (let i = -.45; i < .5; i += .3) c.fillRect(-.012, i, .024, .14);
    c.restore();
  }
  function drawGate(c, x, y) {
    const near = train && Math.hypot(train.x - (x + .5), train.y - (y + .5)) < 1.3;
    const blink = near && Math.floor(performance.now() / 250) % 2;
    c.save(); c.translate(x + .5, y + .5); if (!roadVertical(x, y)) c.rotate(Math.PI / 2);
    for (const s of [-1, 1]) {
      // はしら と ランプ
      const px = s * .4, py = s * .42;
      c.fillStyle = '#222'; c.beginPath(); c.arc(px, py, .07, 0, 7); c.fill();
      c.fillStyle = near && (blink ^ (s > 0)) ? '#ff2b2b' : '#5a1a1a';
      c.beginPath(); c.arc(px, py, .045, 0, 7); c.fill();
      // しゃだんかん
      c.lineWidth = .05;
      const len = .62;
      const ex = near ? px - s * len : px, ey = near ? py : py - s * len;
      for (let k = 0; k < 4; k++) {
        c.strokeStyle = k % 2 ? '#fff' : '#f5c400';
        c.beginPath();
        c.moveTo(px + (ex - px) * k / 4, py + (ey - py) * k / 4);
        c.lineTo(px + (ex - px) * (k + 1) / 4, py + (ey - py) * (k + 1) / 4);
        c.stroke();
      }
    }
    c.restore();
  }
  function drawStation(c, x, y) {
    // ホーム
    c.fillStyle = '#e3dccd'; c.fillRect(x + .04, y + .04, .92, .92);
    c.fillStyle = '#f2c200'; c.fillRect(x + .04, y + .04, .92, .05); c.fillRect(x + .04, y + .91, .92, .05);
    c.strokeStyle = '#b9b1a0'; c.lineWidth = .03; c.strokeRect(x + .04, y + .04, .92, .92);
    // かんばん
    c.fillStyle = '#1e6fd9'; c.beginPath();
    c.roundRect ? c.roundRect(x + .2, y + .12, .6, .26, .06) : c.rect(x + .2, y + .12, .6, .26);
    c.fill();
  }
  function drawStart(c, x, y) {
    c.fillStyle = 'rgba(255,255,255,.45)';
    c.fillRect(x + .06, y + .06, .88, .88);
  }
  function trackPath(c, seg) {
    const n = Math.max(1, Math.round(seg.t * (seg.pts.length - 1)));
    c.moveTo(seg.pts[0][0], seg.pts[0][1]);
    for (let i = 1; i <= n; i++) c.lineTo(seg.pts[i][0], seg.pts[i][1]);
    if (seg.t < 1) { const p = pointAt(seg.pts, seg.t); c.lineTo(p.x, p.y); }
  }
  function offsetPath(c, seg, off) {
    const pts = seg.pts, n = Math.max(1, Math.round(seg.t * (pts.length - 1)));
    for (let i = 0; i <= n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const X = pts[i][0] - dy / l * off, Y = pts[i][1] + dx / l * off;
      if (i === 0) c.moveTo(X, Y); else c.lineTo(X, Y);
    }
  }
  function drawTrack(c) {
    c.lineJoin = 'round'; c.lineCap = 'butt';
    // プラレールふうの あおい せんろ（senro-tsukuro と おなじ いろ）
    c.lineWidth = .5; c.strokeStyle = 'rgba(0,0,0,.15)';
    c.save(); c.translate(.03, .05); c.beginPath(); for (const s of segs) trackPath(c, s); c.stroke(); c.restore();
    c.lineWidth = .46; c.strokeStyle = '#2f7fe0';
    c.beginPath(); for (const s of segs) trackPath(c, s); c.stroke();
    c.lineWidth = .045; c.strokeStyle = '#1b5cb2';
    c.beginPath(); for (const s of segs) { offsetPath(c, s, -.12); offsetPath(c, s, .12); } c.stroke();
    c.lineWidth = .02; c.strokeStyle = 'rgba(255,255,255,.35)';
    c.beginPath(); for (const s of segs) trackPath(c, s); c.stroke();
  }
  function drawTrain(c, cs) {
    if (!train) return;
    const L = .82 * cs, w = .46 * cs, hl = L / 2, hw = w / 2, nl = .3 * cs, r = w * .3;
    c.save(); c.translate(train.x * cs, train.y * cs); c.rotate(train.ang);
    c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-hl + cs * .04, -hw + cs * .06, L, w);
    c.beginPath();
    c.moveTo(-hl + r, -hw);
    c.lineTo(hl - nl, -hw);
    c.bezierCurveTo(hl - nl * .3, -hw, hl, -hw * .35, hl, 0);
    c.bezierCurveTo(hl, hw * .35, hl - nl * .3, hw, hl - nl, hw);
    c.lineTo(-hl + r, hw); c.quadraticCurveTo(-hl, hw, -hl, hw - r);
    c.lineTo(-hl, -hw + r); c.quadraticCurveTo(-hl, -hw, -hl + r, -hw);
    c.closePath();
    c.fillStyle = '#f6f8fb'; c.fill();
    c.save(); c.clip();
    c.fillStyle = '#1e6fd9'; c.fillRect(-hl, -hw, L, w * .2); c.fillRect(-hl, hw - w * .2, L, w * .2);
    c.restore();
    c.lineWidth = Math.max(1, cs * .025); c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke();
    c.fillStyle = '#1d2a3a'; c.beginPath(); c.ellipse(hl - nl * .58, 0, nl * .22, hw * .55, 0, 0, 7); c.fill();
    // のっている おきゃくさん（あたま）
    const n = got.size;
    for (let i = 0; i < n; i++) {
      const px = hl - nl - cs * .1 - i * cs * .14;
      c.fillStyle = '#ffcc80'; c.beginPath(); c.arc(px, 0, cs * .055, 0, 7); c.fill();
      c.fillStyle = '#5b3a1a'; c.beginPath(); c.arc(px, 0, cs * .055, Math.PI, 0); c.fill();
    }
    c.restore();
  }

  // はじめ
  showSelect();
})();
