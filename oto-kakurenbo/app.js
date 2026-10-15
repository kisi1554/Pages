'use strict';

(function () {
  const $ = (id) => document.getElementById(id);

  /* ---------------------------- ほぞん ---------------------------- */

  const KEY = 'oto-kakurenbo-v1';

  function fresh() { return { sound: true, zukan: {}, best: {}, plays: 0 }; }

  function load() {
    const d = fresh();
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && typeof s === 'object') {
        if (typeof s.sound === 'boolean') d.sound = s.sound;
        if (s.zukan && typeof s.zukan === 'object') d.zukan = s.zukan;
        if (s.best && typeof s.best === 'object') d.best = s.best;
        if (typeof s.plays === 'number') d.plays = s.plays;
      }
    } catch (e) { /* よめなくても あそべる */ }
    return d;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* ほぞん できなくても あそべる */ }
  }

  const P = load();
  OtoAudio.setOn(P.sound);

  const foundCount = () => BUGS.filter((b) => P.zukan[b.id] && P.zukan[b.id].n > 0).length;
  const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

  /* ---------------------------- がめんの きりかえ ---------------------------- */

  const screens = ['title', 'game', 'zukan'];
  function show(name) {
    screens.forEach((s) => { $(s).hidden = s !== name; });
    document.body.dataset.screen = name;
  }

  function soundLabel() { return P.sound ? '🔊' : '🔇'; }

  function refreshSoundButtons() {
    const t = $('btnSoundTitle');
    t.textContent = P.sound ? '🔊 おと オン' : '🔇 おと オフ（みる モード）';
    t.setAttribute('aria-pressed', String(P.sound));
    const g = $('btnSoundGame');
    g.textContent = soundLabel();
    g.setAttribute('aria-pressed', String(P.sound));
    $('btnSample').hidden = !P.sound;
    const z = $('btnSoundZukan');
    z.textContent = soundLabel();
    z.setAttribute('aria-pressed', String(P.sound));
    const zp = $('btnZkPlay');
    zp.disabled = !P.sound;
    zp.textContent = P.sound ? '🔊 なきごえ' : '🔇 おとが オフ';
  }

  function toggleSound() {
    P.sound = !P.sound;
    save();
    OtoAudio.setOn(P.sound);
    if (P.sound) OtoAudio.unlock();
    refreshSoundButtons();
    if (G.active) {
      if (G.over) {
        // おわったあとは なにも しない
      } else if (P.sound) {
        startVoices();
        updateAudio();
      } else {
        stopVoices();
      }
      $('modeBadge').hidden = P.sound;
      setMsg(introMsg());
    }
  }

  /* ---------------------------- スタート ---------------------------- */

  function renderTitle() {
    const box = $('levels');
    box.innerHTML = '';
    LEVELS.forEach((lv) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'level-card lv-' + lv.time;
      const best = P.best[lv.n] || 0;
      b.innerHTML =
        '<span class="lv-emoji" aria-hidden="true">' + lv.emoji + '</span>' +
        '<span class="lv-text"><span class="lv-name">レベル' + lv.n + '　' + lv.name + '</span>' +
        '<span class="lv-sub">' + lv.sub + '</span></span>' +
        '<span class="lv-stars" aria-label="さいこう ★' + best + '">' + starText(best) + '</span>';
      b.addEventListener('click', () => startGame(lv.n));
      box.appendChild(b);
    });
    $('zukanCount').textContent = foundCount() + ' / ' + BUGS.length;
    refreshSoundButtons();
  }

  /* ---------------------------- ゲーム ---------------------------- */

  const cv = $('cv');
  const c = cv.getContext('2d');
  const fieldEl = $('field');

  const G = {
    active: false, over: false, level: null,
    bugs: [], target: null,
    ear: { x: 0, y: 0, has: false },
    used: 0, t0: 0,
    misses: [], ripples: [], lastRipple: 0,
    reveal: null, // { bug, t, ok }
    blades: [], stars: [],
    w: 0, h: 0, dpr: 1,
    down: null,
    running: false,
    round: 0,
  };

  const now = () => performance.now() / 1000;
  const minSide = () => Math.min(G.w, G.h);
  const diag = () => Math.hypot(G.w, G.h);
  const hitR = () => Math.max(46, minSide() * 0.11);
  const bx = (b) => b.nx * G.w;
  const by = (b) => b.ny * G.h;

  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }

  function resize() {
    const r = fieldEl.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w === G.w && h === G.h && dpr === G.dpr) return;
    G.w = w; G.h = h; G.dpr = dpr;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    makeBlades();
    if (!G.ear.has) { G.ear.x = w / 2; G.ear.y = h / 2; }
    updateAudio();
  }

  function makeBlades() {
    const lv = G.level || LEVELS[0];
    const n = Math.round(Math.max(170, Math.min(620, (G.w * G.h) / 1500)));
    const scale = Math.max(0.85, Math.min(1.6, minSide() / 480));
    const blades = [];
    for (let i = 0; i < n; i++) {
      const ny = 0.04 + Math.random() * 1.0;
      const depth = Math.min(1, ny);
      const shade = Math.random();
      let col;
      if (lv.time === 'night') {
        col = 'hsl(' + (150 + shade * 25) + ',' + (25 + shade * 15) + '%,' + (12 + depth * 12 + shade * 6) + '%)';
      } else if (lv.time === 'dusk') {
        col = 'hsl(' + (75 + shade * 30) + ',' + (40 + shade * 15) + '%,' + (24 + depth * 16 + shade * 8) + '%)';
      } else {
        col = 'hsl(' + (95 + shade * 35) + ',' + (45 + shade * 20) + '%,' + (26 + depth * 18 + shade * 8) + '%)';
      }
      blades.push({
        nx: Math.random() * 1.06 - 0.03, ny,
        h: (24 + Math.random() * 34) * (0.6 + 0.7 * depth) * scale,
        lw: (2 + Math.random() * 3) * scale,
        col, phase: Math.random() * Math.PI * 2,
        lean: (Math.random() - 0.5) * 0.35,
      });
    }
    blades.sort((a, b) => a.ny - b.ny);
    G.blades = blades;
    G.stars = [];
    for (let i = 0; i < 40; i++) {
      G.stars.push({ x: Math.random(), y: Math.random() * 0.35, r: 0.6 + Math.random() * 1.4, p: Math.random() * 6 });
    }
  }

  function placeBugs(ids) {
    const W = G.w, H = G.h, D = diag();
    const placed = [];
    ids.forEach((id) => {
      let best = null;
      for (let k = 0; k < 60; k++) {
        const nx = 0.1 + Math.random() * 0.8;
        const ny = 0.16 + Math.random() * 0.74;
        const px = nx * W, py = ny * H;
        // まんなか（さいしょの みみ）から すこし はなす
        if (Math.hypot(px - W / 2, py - H / 2) < D * 0.18) continue;
        if (placed.some((p) => Math.hypot(px - p.nx * W, py - p.ny * H) < D * 0.32)) continue;
        best = { nx, ny };
        break;
      }
      if (!best) best = { nx: 0.15 + Math.random() * 0.7, ny: 0.2 + Math.random() * 0.65 };
      placed.push({ id, nx: best.nx, ny: best.ny, voice: null, target: false });
    });
    return placed;
  }

  function startGame(n) {
    OtoAudio.setOn(P.sound);
    if (P.sound) OtoAudio.unlock(); // ← タップの なかで AudioContext を はじめる
    stopVoices();
    OtoAudio.stopSample();

    const lv = LEVELS.find((l) => l.n === n) || LEVELS[0];
    G.level = lv;
    G.round++;
    G.active = true;
    G.over = false;
    G.used = 0;
    G.misses = [];
    G.ripples = [];
    G.reveal = null;
    G.down = null;
    G.ear.has = false;

    show('game');
    $('result').hidden = true;
    document.body.dataset.time = lv.time;
    G.w = 0; // makeBlades を やりなおす
    resize();

    const ids = shuffle(lv.pool).slice(0, lv.count);
    G.bugs = placeBugs(ids);
    G.target = G.bugs[Math.floor(Math.random() * G.bugs.length)];
    G.target.target = true;

    $('hudLevel').textContent = lv.emoji + ' レベル' + lv.n + ' ' + lv.name;
    $('targetBar').hidden = lv.count < 2;
    $('targetName').textContent = BUG_BY_ID[G.target.id].name;
    $('modeBadge').hidden = P.sound;
    renderTries();
    refreshSoundButtons();
    setMsg(introMsg());

    G.t0 = now();
    P.plays++;
    save();
    startVoices();
    updateAudio();
    if (!G.running) {
      G.running = true;
      requestAnimationFrame(frame);
    }
  }

  function introMsg() {
    const lv = G.level;
    if (!P.sound) {
      return '👀 みる モード：ゆびで なぞってね。むしに ちかいほど くさが ゆれて、わもんが <ruby>大<rt>おお</rt></ruby>きく なるよ。';
    }
    if (lv.count > 1) {
      return '2ひき ないているよ。<b>' + BUG_BY_ID[G.target.id].name + '</b>は どっち？　ゆびで なぞって きいてみよう。';
    }
    return 'ゆびで なぞって なきごえを きいてみよう。「ここだ！」と おもったら ゆびを とめて ポン！';
  }

  function renderTries() {
    const left = 3 - G.used;
    let s = '';
    for (let i = 0; i < 3; i++) s += '<span class="try' + (i < left ? '' : ' used') + '">👆</span>';
    $('hudTries').innerHTML = s;
    $('hudTries').setAttribute('aria-label', 'のこり ' + left + 'かい');
  }

  function setMsg(html, kind) {
    const m = $('msg');
    m.innerHTML = html;
    m.className = 'msg' + (kind ? ' ' + kind : '');
  }

  function quit() {
    G.active = false;
    stopVoices();
    OtoAudio.stopSample();
    $('result').hidden = true;
    renderTitle();
    show('title');
  }

  /* ---------------------------- おと（みみの いち） ---------------------------- */

  function startVoices() {
    if (!P.sound) return;
    G.bugs.forEach((b, i) => {
      if (b.voice) return;
      b.voice = OtoAudio.createVoice();
      OtoAudio.startLoop(b.voice, b.id, 250 + i * 700 + Math.random() * 400);
    });
  }

  function stopVoices() {
    G.bugs.forEach((b) => {
      if (b.voice) OtoAudio.stopVoice(b.voice);
      b.voice = null;
    });
  }

  function spatial(b) {
    const dx = bx(b) - G.ear.x;
    const dy = by(b) - G.ear.y;
    const dn = Math.min(1, Math.hypot(dx, dy) / (diag() * 0.7));
    const near = 1 - dn;
    return {
      vol: 0.04 + 0.96 * Math.pow(near, 2.2),
      cutoff: 1400 * Math.pow(13, near * near), // とおい: 1400Hz（こもる）〜 ちかい: 18000Hz
      pan: Math.max(-1, Math.min(1, dx / (G.w * 0.35))) * 0.95,
    };
  }

  function updateAudio() {
    if (!G.active || !P.sound || G.over) return;
    G.bugs.forEach((b) => {
      if (!b.voice) return;
      const s = spatial(b);
      OtoAudio.setSpatial(b.voice, s.vol, s.cutoff, s.pan);
    });
  }

  function setEar(x, y) {
    G.ear.x = x;
    G.ear.y = y;
    G.ear.has = true;
    updateAudio();
  }

  /* ---------------------------- ゆび ---------------------------- */

  function pos(e) {
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  cv.addEventListener('pointerdown', (e) => {
    if (!G.active || G.over) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* なくても よい */ }
    const p = pos(e);
    G.down = { id: e.pointerId, x: p.x, y: p.y, max: 0 };
    setEar(p.x, p.y);
  });

  cv.addEventListener('pointermove', (e) => {
    if (!G.active || G.over) return;
    if (e.pointerType !== 'mouse' && !G.down) return;
    const p = pos(e);
    if (G.down && G.down.id === e.pointerId) {
      G.down.max = Math.max(G.down.max, Math.hypot(p.x - G.down.x, p.y - G.down.y));
    }
    setEar(p.x, p.y);
  });

  cv.addEventListener('pointerup', (e) => {
    const d = G.down;
    if (!d || d.id !== e.pointerId) return;
    G.down = null;
    if (!G.active || G.over) return;
    if (d.max < 14) guess(d.x, d.y); // うごかさずに はなした = タップ
  });

  cv.addEventListener('pointercancel', () => { G.down = null; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ---------------------------- タップ → あたり？ ---------------------------- */

  function direction(dx, dy) {
    const ax = Math.abs(dx), ay = Math.abs(dy);
    const h = dx > 0 ? 'みぎ' : 'ひだり';
    const v = dy > 0 ? 'した' : 'うえ';
    if (Math.min(ax, ay) > Math.max(ax, ay) * 0.55) return h + 'の ' + v;
    return ax > ay ? h : v;
  }

  function guess(x, y) {
    const t = G.target;
    const R = hitR();
    const dx = bx(t) - x, dy = by(t) - y;
    const d = Math.hypot(dx, dy);
    G.used++;
    renderTries();

    if (d <= R) {
      found();
      return;
    }

    OtoAudio.se('miss');
    G.misses.push({ x, y, t: now() });

    const left = 3 - G.used;
    let text;
    const other = G.bugs.find((b) => !b.target && Math.hypot(bx(b) - x, by(b) - y) <= R);
    if (other) {
      text = 'そこに いたのは <b>' + BUG_BY_ID[other.id].name + '</b>！　さがしているのは <b>' +
        BUG_BY_ID[t.id].name + '</b> だよ。';
    } else if (d < R * 2.3) {
      text = 'すごく ちかい！　もうすこし <b>' + direction(dx, dy) + '</b> かも。';
    } else if (d < R * 4.5) {
      text = 'ちかいよ。<b>' + direction(dx, dy) + '</b>の ほう かも。';
    } else {
      text = 'まだ とおいよ。<b>' + direction(dx, dy) + '</b>の ほうを きいてみよう。';
    }

    if (left <= 0) {
      fail();
      return;
    }
    setMsg(text + '（のこり ' + left + 'かい）', 'hint');
  }

  function elapsed() { return Math.max(0, now() - G.t0); }

  function calcStars(sec, used) {
    const pt = (used === 1 ? 2 : used === 2 ? 1 : 0) + (sec <= 20 ? 2 : sec <= 45 ? 1 : 0);
    return pt >= 3 ? 3 : pt >= 1 ? 2 : 1;
  }

  function found() {
    G.over = true;
    const sec = elapsed();
    const stars = calcStars(sec, G.used);
    const t = G.target;
    G.reveal = { bug: t, t: now(), ok: true };
    OtoAudio.se('found');
    // みつけた むしだけ すぐ ちかくで きこえる
    G.bugs.forEach((b) => {
      if (!b.voice) return;
      if (b === t) OtoAudio.setSpatial(b.voice, 1, 18000, 0);
      else { OtoAudio.stopVoice(b.voice); b.voice = null; }
    });

    const prev = P.zukan[t.id];
    const isNew = !prev || !prev.n;
    P.zukan[t.id] = { n: (prev && prev.n ? prev.n : 0) + 1 };
    P.best[G.level.n] = Math.max(P.best[G.level.n] || 0, stars);
    save();

    setMsg('みつけた！ <b>' + BUG_BY_ID[t.id].name + '</b>', 'good');
    const round = G.round;
    setTimeout(() => {
      if (!G.active || G.round !== round) return;
      showResult(true, { sec, stars, isNew });
    }, 1800);
  }

  function fail() {
    G.over = true;
    const t = G.target;
    G.reveal = { bug: t, t: now(), ok: false };
    OtoAudio.se('fail');
    G.bugs.forEach((b) => {
      if (!b.voice) return;
      if (b === t) OtoAudio.setSpatial(b.voice, 0.9, 18000, 0);
      else { OtoAudio.stopVoice(b.voice); b.voice = null; }
    });
    setMsg('ざんねん！ <b>' + BUG_BY_ID[t.id].name + '</b>は ここに いたよ。', 'hint');
    const round = G.round;
    setTimeout(() => {
      if (!G.active || G.round !== round) return;
      showResult(false, {});
    }, 2200);
  }

  function showResult(ok, r) {
    stopVoices();
    const t = BUG_BY_ID[G.target.id];
    const rc = $('resultCv');
    const x = rc.getContext('2d');
    x.clearRect(0, 0, rc.width, rc.height);
    x.fillStyle = ok ? '#e6f6ea' : '#eef0f2';
    x.beginPath();
    x.ellipse(rc.width / 2, rc.height / 2, rc.width * 0.46, rc.height * 0.44, 0, 0, Math.PI * 2);
    x.fill();
    drawBug(x, t.id, rc.width / 2, rc.height / 2, 120);

    if (ok) {
      $('resultTitle').textContent = t.name + 'を みつけた！';
      $('resultStars').textContent = starText(r.stars);
      $('resultStars').setAttribute('aria-label', '★' + r.stars);
      $('resultStars').hidden = false;
      $('resultInfo').innerHTML = 'かかった じかん ' + Math.round(r.sec) + 'びょう ・ ' + G.used + 'かいめで みつけたよ<br>「' + t.song + '」';
      $('resultNew').hidden = !r.isNew;
    } else {
      $('resultTitle').textContent = 'ざんねん！ ' + t.name + 'だったよ';
      $('resultStars').hidden = true;
      $('resultInfo').innerHTML = '「' + t.song + '」と なく むし。<br>もういちど さがして みよう！';
      $('resultNew').hidden = true;
    }
    $('result').hidden = false;
    $('btnAgain').focus();
  }

  /* ---------------------------- えを かく ---------------------------- */

  function frame() {
    if (!G.active || $('game').hidden) {
      G.running = false;
      return;
    }
    draw(now());
    requestAnimationFrame(frame);
  }

  function drawBackground(t) {
    const lv = G.level;
    const g = c.createLinearGradient(0, 0, 0, G.h);
    if (lv.time === 'night') {
      g.addColorStop(0, '#0d1834'); g.addColorStop(0.35, '#13283a'); g.addColorStop(1, '#0f2a1c');
    } else if (lv.time === 'dusk') {
      g.addColorStop(0, '#f7c38a'); g.addColorStop(0.3, '#c9b46a'); g.addColorStop(1, '#5c7d33');
    } else {
      g.addColorStop(0, '#d4efb4'); g.addColorStop(0.3, '#9fd17a'); g.addColorStop(1, '#4f9a3c');
    }
    c.fillStyle = g;
    c.fillRect(0, 0, G.w, G.h);

    if (lv.time === 'night') {
      G.stars.forEach((s) => {
        c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.5 + s.p);
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(s.x * G.w, s.y * G.h, s.r, 0, Math.PI * 2); c.fill();
      });
      c.globalAlpha = 1;
      const mr = Math.max(16, minSide() * 0.05);
      c.fillStyle = '#fff6cf';
      c.beginPath(); c.arc(G.w - mr * 2.2, mr * 2, mr, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#0d1834';
      c.beginPath(); c.arc(G.w - mr * 1.75, mr * 1.75, mr * 0.85, 0, Math.PI * 2); c.fill();
    } else if (lv.time === 'dusk') {
      const sr = Math.max(18, minSide() * 0.06);
      c.fillStyle = 'rgba(255,170,90,.85)';
      c.beginPath(); c.arc(G.w * 0.18, sr * 1.6, sr, 0, Math.PI * 2); c.fill();
    }
  }

  function drawBlades(t) {
    const lv = G.level;
    const R1 = Math.max(60, minSide() * 0.09);
    const R2 = Math.max(110, minSide() * 0.22);
    const D = diag();
    const watch = !P.sound && G.ear.has && !G.over;
    const tg = G.target;
    const tx = tg ? bx(tg) : -9999, ty = tg ? by(tg) : -9999;
    const rv = G.reveal;
    const rvK = rv ? Math.min(1, (t - rv.t) / 0.5) : 0;
    c.lineCap = 'round';

    for (let i = 0; i < G.blades.length; i++) {
      const b = G.blades[i];
      const px = b.nx * G.w, py = b.ny * G.h;
      let ang = b.lean + Math.sin(t * 1.4 + b.phase + b.nx * 4) * 0.05;
      let shake = 0;

      // むしの まわりの くさが そっと ゆれる（レベル1・2）
      if (lv.sway && !G.over) {
        for (let k = 0; k < G.bugs.length; k++) {
          const q = G.bugs[k];
          const d = Math.hypot(bx(q) - px, by(q) - py);
          if (d < R1) shake += 0.2 * (1 - d / R1);
        }
      }
      // みる モード: ゆびの ちかくの くさが、むしに ちかいほど よく ゆれる
      if (watch) {
        const dE = Math.hypot(px - G.ear.x, py - G.ear.y);
        if (dE < R2) {
          const cl = Math.max(0, 1 - Math.hypot(px - tx, py - ty) / (D * 0.55));
          shake += 0.5 * (1 - dE / R2) * cl * cl;
        }
      }
      if (shake) ang += shake * Math.sin(t * 12 + b.phase * 2);

      // みつけたら くさが よける
      if (rv) {
        const dx = px - bx(rv.bug), dy = py - by(rv.bug);
        const d = Math.hypot(dx, dy);
        const RR = R1 * 1.5;
        if (d < RR && dy > -RR * 0.3) ang += (dx >= 0 ? 1 : -1) * 0.9 * (1 - d / RR) * rvK;
      }

      const sx = Math.sin(ang), cy = Math.cos(ang);
      const tipx = px + sx * b.h, tipy = py - cy * b.h;
      const cx = px + Math.sin(ang * 0.4) * b.h * 0.5, cyy = py - b.h * 0.55;
      c.strokeStyle = b.col;
      c.lineWidth = b.lw;
      c.beginPath();
      c.moveTo(px, py);
      c.quadraticCurveTo(cx, cyy, tipx, tipy);
      c.stroke();
    }
  }

  function drawNight() {
    if (G.level.time !== 'night') return;
    let g;
    if (G.ear.has && !G.reveal) {
      const r = Math.max(120, minSide() * 0.22);
      g = c.createRadialGradient(G.ear.x, G.ear.y, r * 0.3, G.ear.x, G.ear.y, r);
      g.addColorStop(0, 'rgba(4,8,22,0.05)');
      g.addColorStop(1, 'rgba(4,8,22,0.62)');
    } else {
      g = 'rgba(4,8,22,0.55)';
    }
    c.fillStyle = g;
    c.fillRect(0, 0, G.w, G.h);
  }

  function drawMisses(t) {
    const R = hitR();
    G.misses = G.misses.filter((m) => t - m.t < 2.6);
    G.misses.forEach((m) => {
      const a = 1 - (t - m.t) / 2.6;
      c.globalAlpha = a;
      c.strokeStyle = G.level.time === 'night' ? '#ffe9a8' : '#ffffff';
      c.lineWidth = 3;
      c.setLineDash([8, 7]);
      c.beginPath(); c.arc(m.x, m.y, R * 0.7, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
      c.fillStyle = c.strokeStyle;
      c.font = 'bold ' + Math.round(R * 0.7) + 'px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('？', m.x, m.y);
      c.globalAlpha = 1;
    });
  }

  function easeOutBack(k) {
    const s = 1.7;
    k -= 1;
    return k * k * ((s + 1) * k + s) + 1;
  }

  function drawReveal(t) {
    const rv = G.reveal;
    if (!rv) return;
    const k = Math.min(1, (t - rv.t) / 0.6);
    const x = bx(rv.bug), y = by(rv.bug);
    const R = hitR();
    const sz = R * 1.5 * easeOutBack(k);

    c.fillStyle = rv.ok ? 'rgba(255,250,200,.75)' : 'rgba(255,255,255,.55)';
    c.beginPath(); c.arc(x, y, R * 1.05 * Math.min(1, k * 1.3), 0, Math.PI * 2); c.fill();
    if (!rv.ok) {
      c.strokeStyle = '#ff7a59';
      c.lineWidth = 4;
      c.setLineDash([10, 8]);
      c.beginPath(); c.arc(x, y, R * 1.1, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
    }
    if (sz > 1) drawBug(c, rv.bug.id, x, y + Math.sin(t * 6) * 2, sz);

    if (rv.ok) {
      for (let i = 0; i < 8; i++) {
        const a = t * 1.5 + (i * Math.PI) / 4;
        const rr = R * (1.2 + 0.25 * Math.sin(t * 4 + i));
        c.fillStyle = i % 2 ? '#ffd23f' : '#ffffff';
        c.font = Math.round(R * 0.4) + 'px sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.globalAlpha = k;
        c.fillText('✦', x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.globalAlpha = 1;
    }
  }

  function drawRipples(t) {
    if (!P.sound && G.ear.has && !G.over && G.target) {
      const d = Math.hypot(bx(G.target) - G.ear.x, by(G.target) - G.ear.y);
      const cl = Math.max(0, 1 - d / (diag() * 0.6));
      const interval = 1.1 - 0.85 * cl;
      if (t - G.lastRipple > interval) {
        G.lastRipple = t;
        G.ripples.push({ x: G.ear.x, y: G.ear.y, t, max: 26 + 110 * cl * cl, a: 0.3 + 0.65 * cl });
      }
    }
    G.ripples = G.ripples.filter((r) => t - r.t < 1.1);
    const col = G.level.time === 'night' ? '255,240,180' : '255,255,255';
    G.ripples.forEach((r) => {
      const k = (t - r.t) / 1.1;
      c.strokeStyle = 'rgba(' + col + ',' + (r.a * (1 - k)).toFixed(3) + ')';
      c.lineWidth = 4;
      c.beginPath(); c.arc(r.x, r.y, 8 + r.max * k, 0, Math.PI * 2); c.stroke();
    });
  }

  function drawEar() {
    if (!G.ear.has || G.over) return;
    const r = 30;
    c.strokeStyle = G.level.time === 'night' ? 'rgba(255,240,180,.8)' : 'rgba(255,255,255,.85)';
    c.lineWidth = 3;
    c.beginPath(); c.arc(G.ear.x, G.ear.y, r, 0, Math.PI * 2); c.stroke();
    c.font = '26px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('👂', G.ear.x - r * 0.9, G.ear.y - r * 1.25);
  }

  function draw(t) {
    c.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    drawBackground(t);
    drawBlades(t);
    drawNight();
    drawMisses(t);
    drawReveal(t);
    drawRipples(t);
    drawEar();
  }

  /* ---------------------------- ずかん ---------------------------- */

  function renderZukan() {
    const grid = $('zkGrid');
    grid.innerHTML = '';
    BUGS.forEach((b) => {
      const got = P.zukan[b.id] && P.zukan[b.id].n > 0;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'zk-item' + (got ? '' : ' locked');
      const cvs = document.createElement('canvas');
      cvs.width = 200; cvs.height = 140;
      drawBug(cvs.getContext('2d'), b.id, 100, 72, 92, { silhouette: !got });
      card.appendChild(cvs);
      const nm = document.createElement('span');
      nm.className = 'zk-item-name';
      nm.textContent = got ? b.name : '？？？';
      card.appendChild(nm);
      const sub = document.createElement('span');
      sub.className = 'zk-item-sub';
      sub.textContent = got ? '🔊 ' + b.song + '（' + P.zukan[b.id].n + 'かい）' : 'レベル' + b.level + ' で あえるかも';
      card.appendChild(sub);
      card.addEventListener('click', () => openDetail(b, got));
      grid.appendChild(card);
    });
    $('zkCount').textContent = foundCount() + ' / ' + BUGS.length;
  }

  let detailBug = null;

  function openDetail(b, got) {
    detailBug = got ? b : null;
    const x = $('zkCv').getContext('2d');
    x.clearRect(0, 0, 300, 200);
    x.fillStyle = got ? '#e6f6ea' : '#eef0f2';
    x.beginPath(); x.ellipse(150, 100, 140, 92, 0, 0, Math.PI * 2); x.fill();
    drawBug(x, b.id, 150, 100, 140, { silhouette: !got });
    if (got) {
      $('zkName').textContent = b.name;
      $('zkSong').textContent = '🔊「' + b.song + '」';
      $('zkWhen').textContent = '🕒 ' + b.when + ' に なく';
      $('zkDesc').innerHTML = b.desc;
      $('btnZkPlay').hidden = false;
      refreshSoundButtons();
      playDetail();
    } else {
      $('zkName').textContent = '？？？';
      $('zkSong').textContent = 'まだ みつけて いないよ';
      $('zkWhen').textContent = '';
      $('zkDesc').textContent = 'レベル' + b.level + 'の くさむらで なきごえを さがして みよう。';
      $('btnZkPlay').hidden = true;
    }
    $('zkDetail').hidden = false;
    $('btnZkClose').focus();
  }

  function playDetail() {
    if (!detailBug || !P.sound) return;
    OtoAudio.unlock();
    OtoAudio.playSample(detailBug.id);
  }

  function closeDetail() {
    OtoAudio.stopSample();
    $('zkDetail').hidden = true;
    detailBug = null;
  }

  function openZukan() {
    G.active = false;
    stopVoices();
    OtoAudio.stopSample();
    $('result').hidden = true;
    renderZukan();
    show('zukan');
  }

  /* ---------------------------- ボタン ---------------------------- */

  $('btnSoundTitle').addEventListener('click', toggleSound);
  $('btnSoundGame').addEventListener('click', toggleSound);
  $('btnSoundZukan').addEventListener('click', toggleSound);
  $('btnZukan').addEventListener('click', openZukan);
  $('btnBack').addEventListener('click', quit);
  $('btnAgain').addEventListener('click', () => startGame(G.level.n));
  $('btnToTitle').addEventListener('click', quit);
  $('btnToZukan').addEventListener('click', openZukan);
  $('btnZkBack').addEventListener('click', () => { closeDetail(); renderTitle(); show('title'); });
  $('btnZkPlay').addEventListener('click', playDetail);
  $('btnZkClose').addEventListener('click', closeDetail);
  $('zkDetail').addEventListener('click', (e) => { if (e.target === $('zkDetail')) closeDetail(); });
  $('btnSample').addEventListener('click', () => {
    if (!P.sound || !G.target || G.over) return;
    OtoAudio.unlock();
    OtoAudio.playSample(G.target.id);
  });

  window.addEventListener('resize', () => { if (G.active) resize(); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (G.active) resize(); }).observe(fieldEl);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopVoices();
      OtoAudio.stopSample();
    } else if (G.active && !G.over) {
      startVoices();
      updateAudio();
    }
  });

  renderTitle();
  show('title');

  // テストよう（Playwright から よぶ）
  window.__oto = { G, P, startGame, guess, bx, by, hitR };
})();
