'use strict';

/*
 * がめん・タップ・ゲーム の ループ・じゆう モード・ほぞん（localStorage `shirei-shitsu-v1`）。
 * テスト よう に window.ShireiDebug を だす。
 */
(() => {
  const KEY = 'shirei-shitsu-v1';
  const $ = (id) => document.getElementById(id);
  const LIST = STAGES.list;

  // ---------- ほぞん ----------
  function load() {
    const base = { stars: {}, sound: true, free: null };
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || '{}');
      return Object.assign(base, s && typeof s === 'object' ? s : {});
    } catch (e) {
      return base;
    }
  }
  const save = load();
  function store() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても あそべる */ }
  }
  Sound.set(save.sound);

  const FACTS = [
    'ほんもの の しれいしつ では、おおきな パネル で ぜんぶ の でんしゃ の いち を みて いるよ。',
    '<ruby>閉塞<rt>へいそく</rt></ruby>（へいそく）は、ひとつ の くかん に でんしゃ を 1ぽん だけ いれる きまり。ぶつからない ため の だいじ な しくみ だよ。',
    'ポイント は「<ruby>転轍機<rt>てんてつき</rt></ruby>（てんてつき）」とも いうよ。',
    'しゅっぱつ しんごう が あお に ならないと、でんしゃ は ホーム から でられないよ。',
    'ゆき の ひ は、ポイント に ヒーター を つけて こおらない ように して いる えき も あるよ。',
    'きゅうこう が ふつう を おいこす ことを「まちあわせ」と いうよ。',
    '<ruby>車庫<rt>しゃこ</rt></ruby>（しゃこ）では、でんしゃ を あらったり てんけん したり して いるよ。',
    'かもつ れっしゃ は コンテナ を たくさん つないで、にもつ を とおく まで はこぶよ。',
    '1ほん の せんろ（たんせん）では、えき で まって すれちがう んだ。これを「こうかん」と いうよ。',
  ];

  // ---------- じょうたい ----------
  let S = null;
  let stage = null;
  let mode = 'stage';      // 'stage' | 'free'
  let editing = false;     // じゆう モード で せんろ を ならべて いる
  let running = false;
  let paused = true;
  let fast = false;
  let hintOn = false;
  let view = null;
  let acc = 0;
  let lastTs = 0;
  let now = 0;
  let floats = [];
  let holding = null;
  let hintSw = null;
  let hintLamp = null;
  let hintT = 0;
  let resultShown = false;
  let staticKey = 0;
  let msgT = 0;
  let free = null;
  let freeSpawnT = 0;
  let tool = 'h';
  let drag = null;

  const cv = $('cv');
  const ctx = cv.getContext('2d');
  let dpr = 1;

  // ---------- メニュー ----------
  const unlocked = (i) => i === 0 || (save.stars[LIST[i - 1].id] || 0) > 0;
  function buildMenu() {
    const box = $('chapters');
    box.innerHTML = '';
    for (const ch of STAGES.CHAPTERS) {
      const div = document.createElement('div');
      div.className = 'chapter';
      div.innerHTML = `<h2>${ch.emoji} ${ch.id}. ${ch.name}</h2><p>${ch.desc}</p><div class="stages"></div>`;
      const grid = div.querySelector('.stages');
      LIST.filter((s) => s.ch === ch.id).forEach((s) => {
        const b = document.createElement('button');
        const n = save.stars[s.id] || 0;
        b.type = 'button';
        b.className = 'stage' + (n ? ' done' : '');
        b.dataset.stage = String(s.index);
        b.disabled = !unlocked(s.index);
        b.innerHTML = `<b>${s.id}</b>${s.title}<span class="st">${b.disabled ? '🔒' : '★'.repeat(n) + '☆'.repeat(3 - n)}</span>`;
        b.addEventListener('click', () => { Sound.unlock(); Sound.sfx('tap'); startStage(s); });
        grid.appendChild(b);
      });
      box.appendChild(div);
    }
    updateSoundBtns();
  }

  function updateSoundBtns() {
    $('btnSound').textContent = save.sound ? '🔊 おと オン' : '🔇 おと オフ';
    $('btnSound').setAttribute('aria-pressed', String(save.sound));
    $('btnSound2').textContent = save.sound ? '🔊' : '🔇';
  }
  function toggleSound() {
    save.sound = !save.sound;
    Sound.set(save.sound);
    Sound.unlock();
    store();
    updateSoundBtns();
  }

  function show(id) {
    for (const s of ['title', 'game']) $(s).hidden = s !== id;
  }
  function overlay(id) {
    for (const o of ['intro', 'pause', 'result']) $(o).hidden = o !== id;
  }

  // ---------- ステージ ----------
  function startStage(st) {
    mode = 'stage';
    editing = false;
    stage = st;
    S = Dispatch.create(st);
    running = true;
    paused = true;
    resultShown = false;
    floats = [];
    holding = null;
    acc = 0;
    hintOn = st.ch === 1 && st.no <= 2;
    $('btnHint').setAttribute('aria-pressed', String(hintOn));
    fast = false;
    $('btnFast').setAttribute('aria-pressed', 'false');
    $('editor').hidden = true;
    $('stageTitle').textContent = `${st.id} ${st.title}`;
    setMsg(st.tip);
    show('game');
    // はじめ の まど
    const ch = STAGES.CHAPTERS[st.ch - 1];
    $('introCh').textContent = `${ch.emoji} ${ch.id}. ${ch.name}　ステージ ${st.id}`;
    $('introTitle').textContent = st.title;
    $('introTip').textContent = st.tip;
    $('introTrains').innerHTML = `くる でんしゃ: <b>${st.trains.length}</b> ほん` + (st.snow ? '　❄️ ゆき' : '');
    overlay('intro');
    resize();
  }

  function goPlay() {
    overlay(null);
    paused = false;
    lastTs = 0;
  }

  function setMsg(t, warn) {
    const m = $('msg');
    m.textContent = t || '';
    m.classList.toggle('warn', !!warn);
    msgT = warn ? 4 : t ? 9 : 0;
  }

  function finish() {
    resultShown = true;
    running = false;
    const d = Dispatch.delay(S);
    const n = Dispatch.stars(d);
    const best = save.stars[stage.id] || 0;
    if (n > best) save.stars[stage.id] = n;
    store();
    Sound.sfx('clear');
    Sound.kankan(false);
    $('resTitle').textContent = n === 3 ? '🎉 かんぺき な しれい！' : n === 2 ? '😊 しれい かんりょう！' : '🙂 ぜんぶ はこべた！';
    $('resStars').textContent = '★'.repeat(n) + '☆'.repeat(3 - n);
    $('resText').innerHTML = `おくれ <b>${d}</b> びょう<br>あれれ？ ${S.arere} かい・きゅうブレーキ ${S.emerg} かい`
      + (n < 3 ? '<br><small>おくれ 3びょう いか で ★★★</small>' : '');
    $('resFact').innerHTML = '💡 ' + FACTS[Math.floor(Math.random() * FACTS.length)];
    const next = LIST[stage.index + 1];
    $('resNext').hidden = !next;
    overlay('result');
  }

  // ---------- じゆう モード ----------
  function sampleFree() {
    const t = Layout.build({ w: 20, h: 5, track: STAGES.FREE_SAMPLE.track });
    return {
      segs: t.segs.map((s) => [s.x0, s.y0, s.x1, s.y1]),
      plats: STAGES.FREE_SAMPLE.plats.map((p) => Object.assign({}, p)),
      sigs: [],
    };
  }

  function freeDef(f) {
    const def = { w: 20, h: 5, segs: f.segs, tunnels: [], spots: [], signals: [], plats: [], trains: [], seed: 3, free: true };
    const ends = [];
    const seen = new Set();
    for (const s of f.segs) {
      if (s[0] === 0 && !seen.has('W' + s[1])) { seen.add('W' + s[1]); ends.push([0, s[1]]); }
      if (s[2] === 20 && !seen.has('E' + s[3])) { seen.add('E' + s[3]); ends.push([20, s[3]]); }
    }
    ends.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    ['A', 'B', 'C', 'D'].slice(0, ends.length).forEach((id, i) => def.tunnels.push(Object.assign({}, STAGES.TUN[id], { x: ends[i][0], y: ends[i][1] })));
    f.plats.slice(0, 4).forEach((p, k) => {
      def.spots.push({ id: String(k + 1), y: p.y, x0: p.x0, x1: p.x1 });
      const below = p.y < 5;
      def.plats.push({ x0: p.x0 + 0.4, x1: p.x1 - 0.4, y0: below ? p.y + 0.27 : p.y - 0.73, y1: below ? p.y + 0.73 : p.y - 0.27 });
      def.signals.push({ x: p.x0, y: p.y }, { x: p.x1, y: p.y });
    });
    for (const sg of f.sigs) def.signals.push({ x: sg.x, y: sg.y, dir: sg.dir });
    return def;
  }

  function startFree() {
    mode = 'free';
    stage = null;
    free = save.free && Array.isArray(save.free.segs) ? save.free : sampleFree();
    editing = true;
    running = false;
    paused = false;
    resultShown = false;
    floats = [];
    hintOn = false;
    $('btnHint').setAttribute('aria-pressed', 'false');
    $('stageTitle').textContent = '🧩 じゆう モード';
    $('editor').hidden = false;
    $('editor').classList.remove('running');
    $('btnRun').classList.remove('running');
    $('btnRun').innerHTML = '▶<small>しれい スタート</small>';
    rebuildFree();
    setMsg('せんろ を おいて、ホーム（🚉）を つくろう。ばん の はし に せんろ を のばすと トンネル に なるよ。');
    show('game');
    overlay(null);
    resize();
  }

  function rebuildFree() {
    S = Dispatch.create(freeDef(free), { endless: true });
    staticKey += 1;
  }

  function tryEdit(fn) {
    const backup = JSON.stringify(free);
    fn();
    const L = Layout.build(freeDef(free));
    if (L.errors.length) {
      free = JSON.parse(backup);
      Sound.sfx('locked');
      setMsg('そこ には おけないよ（ポイント は かたがわ 2ほん まで・バッテン は できない）', true);
      return false;
    }
    save.free = free;
    store();
    rebuildFree();
    return true;
  }

  const segKey = (s) => s.join(',');
  function cellSeg(t, bx, by) {
    const x = Math.floor(bx);
    if (x < 0 || x >= 20) return null;
    if (t === 'h') { const y = Math.round(by); return y >= 0 && y <= 5 ? [x, y, x + 1, y] : null; }
    const y = Math.floor(by);
    if (y < 0 || y >= 5) return null;
    return t === 'd' ? [x, y, x + 1, y + 1] : [x, y + 1, x + 1, y];
  }
  function removeSeg(k) {
    free.segs = free.segs.filter((s) => segKey(s) !== k);
    free.plats = free.plats.filter((p) => free.segs.some((s) => s[1] === p.y && s[3] === p.y && s[0] >= p.x0 && s[2] <= p.x1)
      && runOk(p));
  }
  function runOk(p) {
    for (let x = p.x0; x < p.x1; x += 1) if (!free.segs.some((s) => s[0] === x && s[1] === p.y && s[2] === x + 1 && s[3] === p.y)) return false;
    return true;
  }

  function editDown(bx, by) {
    if (tool === 'h' || tool === 'd' || tool === 'u') {
      const sg = cellSeg(tool, bx, by);
      if (!sg) return;
      const k = segKey(sg);
      const has = free.segs.some((s) => segKey(s) === k);
      drag = { add: !has, done: new Set([k]) };
      if (tryEdit(() => { if (has) removeSeg(k); else free.segs.push(sg); })) Sound.sfx('place');
    } else if (tool === 'erase') {
      let best = null;
      let bd = 0.45;
      for (const s of free.segs) {
        const d = distSeg(bx, by, s);
        if (d < bd) { bd = d; best = s; }
      }
      if (best) { tryEdit(() => removeSeg(segKey(best))); Sound.sfx('place'); }
      drag = { erase: true };
    } else if (tool === 'plat') {
      const x = Math.floor(bx);
      const y = Math.round(by);
      const at = free.plats.findIndex((p) => p.y === y && x >= p.x0 && x < p.x1);
      if (at >= 0) { tryEdit(() => free.plats.splice(at, 1)); Sound.sfx('place'); return; }
      if (free.plats.length >= 4) { setMsg('ホーム は 4つ まで だよ', true); return; }
      const has = (xx) => free.segs.some((s) => s[0] === xx && s[1] === y && s[2] === xx + 1 && s[3] === y);
      if (!has(x)) { setMsg('まっすぐ の せんろ の うえ を タップ してね', true); return; }
      const L = Layout.build(freeDef(free));
      const isSw = (xx) => { const p = L.ptMap.get(Layout.keyOf(xx, y)); return p && (p.east.length + p.west.length > 2); };
      let x0 = x;
      let x1 = x + 1;
      while (has(x0 - 1) && !isSw(x0) && !free.plats.some((p) => p.y === y && p.x1 === x0)) x0 -= 1;
      while (has(x1) && !isSw(x1) && !free.plats.some((p) => p.y === y && p.x0 === x1)) x1 += 1;
      if (isSw(x0)) x0 += 1;
      if (isSw(x1)) x1 -= 1;
      if (x1 - x0 > 7) { const c = Math.max(x0, Math.min(x - 3, x1 - 7)); x0 = c; x1 = c + 7; }
      if (x1 - x0 < 4) { setMsg('ホーム には まっすぐ な せんろ が 4マス いるよ', true); return; }
      if (tryEdit(() => free.plats.push({ y, x0, x1 }))) { Sound.sfx('place'); setMsg(`${free.plats.length}ばんせん が できた！`); }
    } else if (tool === 'sig') {
      const x = Math.round(bx);
      const y = Math.round(by * 2) / 2;
      const L = Layout.build(freeDef(free));
      const p = L.ptMap.get(Layout.keyOf(x, y));
      if (!p) { setMsg('せんろ の つなぎめ を タップ してね', true); return; }
      if (p.sw) { setMsg('ポイント の うえ には おけないよ', true); return; }
      const cur = free.sigs.filter((s) => s.x === x && s.y === y).map((s) => s.dir).join('');
      const nextDirs = { '': ['E'], E: ['W'], W: ['E', 'W'], EW: [] }[cur] || [];
      if (tryEdit(() => {
        free.sigs = free.sigs.filter((s) => !(s.x === x && s.y === y));
        for (const d of nextDirs) free.sigs.push({ x, y, dir: d });
      })) Sound.sfx('sigG');
    }
  }
  function editMove(bx, by) {
    if (!drag) return;
    if (drag.erase) {
      for (const s of free.segs) if (distSeg(bx, by, s) < 0.3) { tryEdit(() => removeSeg(segKey(s))); break; }
      return;
    }
    const sg = cellSeg(tool, bx, by);
    if (!sg) return;
    const k = segKey(sg);
    if (drag.done.has(k)) return;
    drag.done.add(k);
    const has = free.segs.some((s) => segKey(s) === k);
    if (drag.add && !has) { if (tryEdit(() => free.segs.push(sg))) Sound.sfx('place'); }
    if (!drag.add && has) tryEdit(() => removeSeg(k));
  }
  function distSeg(px, py, s) {
    const dx = s[2] - s[0];
    const dy = s[3] - s[1];
    const t = Math.max(0, Math.min(1, ((px - s[0]) * dx + (py - s[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (s[0] + dx * t), py - (s[1] + dy * t));
  }

  function toggleRun() {
    if (editing) {
      rebuildFree();
      if (!S.L.tunnels.length) { setMsg('ばん の はし（ひだり か みぎ）まで せんろ を のばすと、でんしゃ が でて くる トンネル に なるよ', true); return; }
      editing = false;
      running = true;
      freeSpawnT = 0.5;
      $('editor').classList.add('running');
      $('btnRun').classList.add('running');
      $('btnRun').innerHTML = '⏹<small>とめる</small>';
      setMsg('しれい かいし！ ポイント と しんごう で でんしゃ を みちびこう');
    } else {
      editing = true;
      running = false;
      rebuildFree();
      Sound.kankan(false);
      $('editor').classList.remove('running');
      $('btnRun').classList.remove('running');
      $('btnRun').innerHTML = '▶<small>しれい スタート</small>';
      setMsg('せんろ を なおそう');
    }
    staticKey += 1;
  }

  function freeSpawn(dt) {
    freeSpawnT -= dt;
    if (freeSpawnT > 0) return;
    freeSpawnT = 6 + Math.random() * 3;
    if (S.trains.length + S.queue.length >= 4) return;
    const L = S.L;
    const tuns = L.tunnels.slice().sort(() => Math.random() - 0.5);
    for (const t of tuns) {
      if (S.owner.has(t.vseg.block)) continue;
      const start = { seg: t.vseg, dir: t.side === 'W' ? 1 : -1 };
      const spots = L.spots.filter((sp) => Layout.findRoute(L, start, (s) => s.spot === sp, (s) => !!(s.spot && s.spot !== sp)));
      const kinds = ['local', 'local', 'rapid', 'kaiso'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      if (spots.length) {
        const sp = spots[Math.floor(Math.random() * spots.length)];
        const outs = L.tunnels.filter((u) => [1, -1].some((dir) => sp.segs.some((seg) => Layout.findRoute(L, { seg, dir }, (s) => s === u.vseg))));
        const pref = outs.filter((u) => u !== t);
        const to = (pref.length ? pref : outs)[Math.floor(Math.random() * (pref.length || outs.length || 1))];
        if (!to) continue;
        Dispatch.addTrain(S, { t: S.t, from: t.id, goal: sp.id, to: to.id, kind: kind === 'kaiso' ? 'local' : kind, color: kind === 'kaiso' ? '#1c7ed6' : undefined });
        return;
      }
      const outs = L.tunnels.filter((u) => u !== t && Layout.findRoute(L, start, (s) => s === u.vseg));
      if (outs.length) {
        Dispatch.addTrain(S, { t: S.t, from: t.id, goal: null, to: outs[Math.floor(Math.random() * outs.length)].id, kind });
        return;
      }
    }
  }

  // ---------- できごと → おと・ふきだし ----------
  function float(x, y, text, color, bg) {
    floats.push({ x, y, text, color, bg, age: 0 });
    if (floats.length > 12) floats.shift();
  }
  function handleEvents() {
    for (const e of S.events) {
      switch (e.type) {
        case 'arrive':
          Sound.sfx('chime');
          float(e.x, e.y, e.kind === 'freight' ? 'にもつ おろし ちゅう' : 'とうちゃく！', '#2b8a3e');
          break;
        case 'pass': float(e.x, e.y, 'つうか！', '#c92a2a'); break;
        case 'depart': Sound.sfx('depart'); break;
        case 'arere':
          Sound.sfx('arere');
          float(e.x, e.y, 'あれれ？', '#c92a2a', '#fff5f5');
          setMsg(e.why === 'spot' ? 'ちがう ところ に はいっちゃった！ まる の しるし を よく みて ポイント を きりかえよう'
            : e.why === 'tunnel' ? 'ちがう トンネル へ いっちゃった… でる まえ に ポイント を みよう'
              : 'いきどまり！ ポイント が ちがって いたよ', true);
          break;
        case 'emg':
          Sound.sfx('buzzer');
          Sound.sfx('brake');
          float(e.x, e.y, 'きゅうブレーキ！', '#e8590c', '#fff4e6');
          setMsg('ぎりぎり で とめたので きゅうブレーキ！ はやめ に しんごう や ポイント を かえよう', true);
          break;
        case 'faceoff':
          Sound.sfx('buzzer');
          setMsg('うごけない！ でんしゃ どうし が にらめっこ。ポイント を かえて あいて いる ホーム へ いれよう', true);
          break;
        case 'locked': Sound.sfx('locked'); float(e.x, e.y, '🔒 でんしゃ が いるよ', '#495057'); break;
        case 'frozen': Sound.sfx('frozen'); float(e.x, e.y, '❄️ ながおし で あたためて', '#1971c2', '#e7f5ff'); break;
        case 'melt': Sound.sfx('melt'); float(e.x, e.y, 'とけた！ タップ で きりかえ', '#e8590c'); break;
        case 'freeze': Sound.sfx('freeze'); float(e.x, e.y, '❄️ こおった！', '#1971c2', '#e7f5ff'); break;
        case 'point': Sound.sfx('point'); break;
        case 'signal': Sound.sfx(e.red ? 'sigR' : 'sigG'); break;
        case 'sleep': Sound.sfx('sleep'); float(e.x, e.y, 'おやすみ 💤', '#7048e8'); break;
        case 'late': float(e.x, e.y, 'まにあわない！', '#c92a2a'); break;
        default: break;
      }
    }
    S.events = [];
  }

  // ---------- ヒント ----------
  function updateHint() {
    hintSw = null;
    hintLamp = null;
    if (!hintOn || !S || editing) return;
    for (const tr of S.trains) {
      if (tr.sc && tr.v < 0.05 && tr.sc.reason === 'point' && tr.sc.sw) { hintSw = tr.sc.sw; return; }
    }
    const p = Dispatch.plan(S);
    const ice = p.all.find((w) => w.sw.ice > 0 && w.eta < 9);
    if (ice) { hintSw = ice.sw; return; }
    const w = p.sws.find((x) => x.eta < 9 && !x.sw.locked);
    if (w) hintSw = w.sw;
    else if (p.lamps.length) hintLamp = p.lamps[0].lamp;
  }

  // ---------- ループ ----------
  const STEP = 1 / 60;
  function simStep(dt) {
    acc += dt * (fast ? 2 : 1);
    let n = 0;
    while (acc >= STEP && n < 12) {
      acc -= STEP;
      n += 1;
      if (holding && holding.sw.ice > 0) Dispatch.heat(S, holding.sw, STEP);
      if (mode === 'free') freeSpawn(STEP);
      Dispatch.step(S, STEP);
      if (S.done) break;
    }
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    now += dt;
    if ($('game').hidden || !S) return;
    if (running && !paused) simStep(dt);
    handleEvents();
    hintT -= dt;
    if (hintT <= 0) { hintT = 0.25; updateHint(); }
    for (const f of floats) f.age += dt;
    floats = floats.filter((f) => f.age < 2);
    if (msgT > 0) { msgT -= dt; if (msgT <= 0) setMsg(''); }
    fitView();
    const r = Render.draw(ctx, S, view, dpr, { hintSw, hintLamp, floats, editing, staticKey: String(staticKey) }, now);
    Sound.kankan(!!(r && r.kankan) && running && !paused);
    if (running && !paused) {
      let vmax = 0;
      for (const tr of S.trains) vmax = Math.max(vmax, tr.v);
      Sound.gatan(vmax, now);
    }
    // HUD
    $('leftCount').textContent = String(S.queue.length + S.trains.length);
    const d = Dispatch.delay(S);
    $('delayCount').textContent = String(d);
    $('delayChip').classList.toggle('bad', d > 3);
    if (mode === 'stage' && S.done && !resultShown) finish();
  }

  function fitView() {
    const top = $('hud').offsetHeight;
    const bottom = mode === 'free' ? $('editor').offsetHeight : 12;
    $('msg').style.bottom = mode === 'free' ? `${bottom + 8}px` : '';
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!view || view.cw !== w || view.ch !== h || view.top !== top || view.bottom !== bottom || view.L !== S.L) {
      view = Render.fit(S.L, w, h, top, bottom);
      view.top = top;
      view.bottom = bottom;
      view.L = S.L;
    }
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(window.innerWidth * dpr);
    cv.height = Math.round(window.innerHeight * dpr);
    view = null;
  }

  // ---------- タップ ----------
  function canvasPos(e) {
    const r = cv.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    Sound.unlock();
    if (!S || !view) return;
    const [x, y] = canvasPos(e);
    if (mode === 'free' && editing) {
      const [bx, by] = Render.toB(view, x, y);
      editDown(bx, by);
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* むし */ }
      return;
    }
    if (paused) return;
    const h = Render.hit(S, view, x, y);
    if (!h) return;
    if (h.type === 'sw') {
      if (h.sw.ice > 0) {
        holding = { id: e.pointerId, sw: h.sw };
        Sound.sfx('heat');
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* むし */ }
      } else {
        Dispatch.toggleSwitch(S, h.sw);
      }
    } else if (h.type === 'lamp') {
      Dispatch.toggleLamp(S, h.lamp);
    }
    hintT = 0;
  });
  cv.addEventListener('pointermove', (e) => {
    if (mode === 'free' && editing && drag && view) {
      const [x, y] = canvasPos(e);
      const [bx, by] = Render.toB(view, x, y);
      editMove(bx, by);
    }
  });
  const up = (e) => {
    if (holding && holding.id === e.pointerId) {
      if (holding.sw.ice > 0) Dispatch.toggleSwitch(S, holding.sw); // まだ こおって いる → 「ながおし して ね」
      holding = null;
    }
    drag = null;
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- ボタン ----------
  $('btnSound').addEventListener('click', toggleSound);
  $('btnSound2').addEventListener('click', toggleSound);
  $('btnFree').addEventListener('click', () => { Sound.unlock(); Sound.sfx('tap'); startFree(); });
  $('introGo').addEventListener('click', () => { Sound.unlock(); Sound.sfx('depart'); goPlay(); });
  $('btnMenu').addEventListener('click', () => backToMenu());
  $('btnPause').addEventListener('click', () => {
    if (mode === 'free') { backToMenu(); return; }
    if (!$('intro').hidden || resultShown) return;
    paused = true;
    overlay('pause');
  });
  $('pauseGo').addEventListener('click', () => { overlay(null); paused = false; });
  $('pauseRetry').addEventListener('click', () => startStage(stage));
  $('pauseMenu').addEventListener('click', () => backToMenu());
  $('resRetry').addEventListener('click', () => startStage(stage));
  $('resMenu').addEventListener('click', () => backToMenu());
  $('resNext').addEventListener('click', () => { const n = LIST[stage.index + 1]; if (n) startStage(n); });
  $('btnHint').addEventListener('click', () => {
    hintOn = !hintOn;
    $('btnHint').setAttribute('aria-pressed', String(hintOn));
    hintT = 0;
  });
  $('btnFast').addEventListener('click', () => {
    fast = !fast;
    $('btnFast').setAttribute('aria-pressed', String(fast));
  });
  for (const b of document.querySelectorAll('.etool[data-tool]')) {
    b.addEventListener('click', () => {
      tool = b.dataset.tool;
      for (const o of document.querySelectorAll('.etool[data-tool]')) o.setAttribute('aria-pressed', String(o === b));
      const tips = {
        h: '━ を おく ところ を タップ（なぞる と つづけて おける）。もう いちど タップ で けす。',
        d: '╲ ななめ の せんろ。まっすぐ の せんろ と つながる ところ が ポイント に なるよ。',
        u: '╱ ななめ の せんろ。',
        plat: 'まっすぐ な せんろ（4マス いじょう）を タップ すると ホーム に なる。',
        sig: 'せんろ の つなぎめ を タップ：▶ ひがし むき → ◀ にし むき → りょうほう → なし。',
        erase: 'けしたい せんろ を タップ／なぞる。',
      };
      setMsg(tips[tool]);
    });
  }
  $('btnRun').addEventListener('click', () => { Sound.unlock(); toggleRun(); });
  $('btnSample').addEventListener('click', () => {
    if (!editing) return;
    free = sampleFree();
    save.free = free;
    store();
    rebuildFree();
    Sound.sfx('place');
  });
  $('btnClear').addEventListener('click', () => {
    if (!editing) return;
    free = { segs: [], plats: [], sigs: [] };
    save.free = free;
    store();
    rebuildFree();
    Sound.sfx('place');
  });

  function backToMenu() {
    running = false;
    paused = true;
    S = null;
    Sound.kankan(false);
    overlay(null);
    buildMenu();
    show('title');
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'stage' && S && running && !paused && !resultShown) {
      paused = true;
      overlay('pause');
    }
  });

  // ---------- テスト よう ----------
  window.ShireiDebug = {
    state: () => S,
    view: () => view,
    mode: () => ({ mode, editing, running, paused, resultShown }),
    start(i) { startStage(LIST[i]); goPlay(); },
    free() { startFree(); },
    knob(i) { return Render.screenOf(view, Render.knobPos(S.L.sws[i])); },
    lamp(i) { return Render.screenOf(view, Render.lampPos(S.L.lamps[i])); },
    board(x, y) { return Render.screenOf(view, { x, y }); },
    run(sec, auto) {
      S.auto = !!auto;
      for (let t = 0; t < sec && !S.done; t += STEP) Dispatch.step(S, STEP);
      handleEvents();
      S.auto = false;
      return S.done;
    },
  };

  buildMenu();
  resize();
  requestAnimationFrame(frame);
})();
