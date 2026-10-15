/* カブトムシ そだて ｜ 成長・おせわ・画面 */

(() => {
  const FAST = new URLSearchParams(location.search).get('hayaokuri') === '1';
  const DAY_MS = FAST ? 60 * 1000 : 24 * 60 * 60 * 1000;
  // はやおくりは べつの ばしょに 保存（ほんものの そだてを こわさない）
  const KEY = FAST ? 'kabuto-sodate-hayaokuri-v1' : 'kabuto-sodate-v1';
  const ADULT = STAGES.length - 1;
  const PUPA = STAGES.findIndex((s) => s.id === 'pupa');
  const TOTAL_NEED = STAGES.reduce((a, s) => a + s.need, 0);
  const JELLY_X = 470;

  const $ = (id) => document.getElementById(id);

  // ---------------- ほぞん ----------------
  let data = { cur: null, zukan: [], sound: true };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = Object.assign(data, JSON.parse(raw));
  } catch (e) { /* よめなくても はじめから */ }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ほぞん できなくても つづける */ }
  }

  // ---------------- にちづけ ----------------
  // 1日 ＝ ローカルの 日づけ（はやおくり中は 1ぷん）
  function dayIndex(ms) {
    if (FAST) return Math.floor(ms / DAY_MS);
    const d = new Date(ms);
    return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }
  // 時計が もどっても こわれない: 最後に みた 時刻・日づけより まえは つかわない
  function clock() {
    const c = data.cur;
    const now = Math.max(Date.now(), c.lastSeenAt || 0);
    const today = Math.max(dayIndex(now), c.lastSeenDay == null ? -Infinity : c.lastSeenDay);
    c.lastSeenAt = now;
    c.lastSeenDay = today;
    return { now, today };
  }
  function fmtDate(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }

  function newRun() {
    const now = Math.max(Date.now(), data.cur ? data.cur.lastSeenAt || 0 : 0);
    return {
      startedAt: now, startDay: dayIndex(now), points: 0, stage: 0,
      careLog: {}, countedUpTo: -1e9,
      lastSeenAt: now, lastSeenDay: dayIndex(now),
      moist: 80, pellets: [], poopAcc: 0, food: 80, metersAt: now,
      lastCareDay: null, lonelyDay: null, adult: null, factIdx: 0,
    };
  }

  function stageForPoints(p) {
    let acc = 0;
    for (let i = 0; i < ADULT; i++) { acc += STAGES[i].need; if (p < acc) return i; }
    return ADULT;
  }
  function pointsToNext(c) {
    let acc = 0;
    for (let i = 0; i <= c.stage && i < ADULT; i++) acc += STAGES[i].need;
    return acc - c.points;
  }
  const stageId = (c) => STAGES[c.stage].id;
  const isLarva = (c) => ['l1', 'l2', 'l3'].includes(stageId(c));

  // ---------------- メーター（時間で かわる） ----------------
  function updateMeters(now) {
    const c = data.cur;
    const dt = Math.max(0, now - (c.metersAt || now));
    c.metersAt = now;
    if (!dt) return;
    c.moist = Math.max(0, c.moist - dt / (DAY_MS * CONFIG.dryDays) * 100);
    if (isLarva(c)) {
      c.poopAcc += dt / DAY_MS * CONFIG.poopPerDay[stageId(c)];
      while (c.poopAcc >= 1) {
        c.poopAcc -= 1;
        if (c.pellets.length < CONFIG.poopMax) c.pellets.push(newPellet());
        else c.poopAcc = 0;
      }
    }
    if (c.stage === ADULT) c.food = Math.max(0, c.food - dt / (DAY_MS * CONFIG.hungerDays) * 100);
  }
  function newPellet() {
    return {
      x: ART.CASE.x + 30 + Math.random() * (ART.CASE.w - 60),
      y: ART.SOIL_TOP + 22 + Math.random() * (ART.SOIL_BOTTOM - ART.SOIL_TOP - 34),
      a: Math.random() * Math.PI,
    };
  }

  // ---------------- 成長（日が かわったら、おせわした 日の ぶん そだつ） ----------------
  function processGrowth(today, now) {
    const c = data.cur;
    const from = c.stage;
    const days = Object.keys(c.careLog).map(Number).filter((d) => d < today && d > c.countedUpTo).sort((a, b) => a - b);
    for (const d of days) {
      if (c.stage < ADULT) c.points += 1;
      c.countedUpTo = d;
      c.stage = stageForPoints(c.points);
    }
    if (c.stage !== from) {
      c.factIdx = 0;
      if (c.stage >= PUPA) { c.pellets = []; c.poopAcc = 0; }
      if (c.stage === ADULT && !c.adult) {
        c.adult = makeAdult(c, now);
        c.food = 60;
      }
      return { from, to: c.stage };
    }
    return null;
  }
  function careScore(c) {
    return Object.values(c.careLog).reduce((a, d) => {
      const n = Object.values(d).reduce((x, y) => x + y, 0);
      return a + Math.min(n, CONFIG.careCapPerDay);
    }, 0);
  }
  function makeAdult(c, now) {
    const sex = Math.random() < 0.5 ? 'm' : 'f';
    const sz = CONFIG.size[sex];
    const ratio = Math.min(1, careScore(c) / (TOTAL_NEED * CONFIG.careCapPerDay));
    const size = Math.round(sz.base + sz.care * ratio + sz.rand * Math.random());
    return { sex, size, name: '', registered: false, adultAt: now };
  }

  // ---------------- おと（WebAudio 合成） ----------------
  let ac = null;
  function audio() {
    if (!data.sound) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { return null; }
    return ac;
  }
  function tone(f, dur, { type = 'sine', vol = 0.2, at = 0, to = null } = {}) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + at;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, { freq = 2000, type = 'bandpass', vol = 0.3, at = 0, q = 1 } = {}) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + at;
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(); src.buffer = buf;
    const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.value = freq; fl.Q.value = q;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl).connect(g).connect(a.destination);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }
  const SFX = {
    mist() { noise(0.28, { freq: 4200, vol: 0.35, q: 0.8 }); },
    mat() { noise(0.5, { freq: 500, type: 'lowpass', vol: 0.4 }); noise(0.5, { freq: 700, type: 'lowpass', vol: 0.3, at: 0.45 }); },
    pop() { tone(500, 0.09, { to: 900, vol: 0.18 }); },
    jelly() { [0, 0.18, 0.36].forEach((at) => tone(900, 0.1, { to: 1300, vol: 0.12, at })); },
    tap() { tone(660, 0.07, { type: 'triangle', vol: 0.12 }); },
    nope() { tone(420, 0.12, { type: 'triangle', vol: 0.12 }); tone(330, 0.16, { type: 'triangle', vol: 0.12, at: 0.12 }); },
    grow() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.16, at: i * 0.12 })); },
    fanfare() { [523, 523, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'square', vol: 0.06, at: i * 0.13 })); },
  };

  // ---------------- ふきだし ----------------
  let bubbleTimer = 0;
  function say(html, ms = 4000) {
    const b = $('bubble');
    b.innerHTML = html;
    b.hidden = false;
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { b.hidden = true; }, ms);
  }

  // ---------------- おせわ ----------------
  const anim = { mistAt: -1e9, matAt: -1e9, eatUntil: 0, larva: { x: 300, y: 370 }, adult: { x: 330, dir: 1, target: 330, walk: 0, nextPick: 0 }, hearts: [] };

  function blocked(type, c) {
    const id = stageId(c);
    if (type === 'mat') {
      if (id === 'egg') return 'たまごの ときは つちを そっと しておこう';
      if (id === 'pupa') return '🤫 いまは さわらないで そっと みまもろう';
      if (id === 'adult') return 'せいちゅうは マットこうかん しなくても だいじょうぶ';
    }
    if (type === 'jelly' && id !== 'adult') return 'ゼリーは せいちゅうに なってから。ようちゅうは つちを たべるよ';
    return '';
  }

  function doCare(type) {
    if (!data.cur) return;
    const c = data.cur;
    const { now, today } = clock();
    updateMeters(now);
    const why = blocked(type, c);
    if (why) { SFX.nope(); say(why); return; }
    const first = !c.careLog[today];
    c.careLog[today] = c.careLog[today] || {};
    c.careLog[today][type] = (c.careLog[today][type] || 0) + 1;
    c.lastCareDay = today;
    const t = performance.now();
    if (type === 'mist') {
      c.moist = Math.min(100, c.moist + CONFIG.mistAdd);
      anim.mistAt = t; SFX.mist();
      if (!first) say('シュッ！ しっとり きもちいい');
    } else if (type === 'mat') {
      c.pellets = []; c.poopAcc = 0; c.moist = Math.max(c.moist, 70);
      anim.matAt = t; SFX.mat();
      if (!first) say('あたらしい つちに なったよ。ふかふか！');
    } else if (type === 'clean') {
      SFX.pop();
    } else if (type === 'jelly') {
      c.food = 100; anim.eatUntil = t + 6000; SFX.jelly();
      if (!first) say('もぐもぐ… おいしい！');
    }
    if (first && c.stage < ADULT) {
      setTimeout(SFX.grow, 300);
      say('きょうの おせわ できたね！<br>ねている あいだに そだつよ 🌙', 4500);
    } else if (first) {
      say(type === 'jelly' ? 'もぐもぐ… おいしい！ ありがとう' : 'ありがとう！ げんき いっぱい', 3500);
    }
    save();
    renderPanel();
  }

  // ---------------- いきものの ばしょ ----------------
  function creatureBox(c, t) {
    const id = stageId(c);
    if (id === 'egg') return { x: 300, y: 400, r: 40 };
    if (id === 'pupa') return { x: 380, y: 372, r: 70 };
    if (id === 'adult') {
      const s = c.adult.size / 60;
      return { x: anim.adult.x + 15 * s * anim.adult.dir, y: ART.SOIL_TOP - 28 * s, r: 70 * s };
    }
    return { x: anim.larva.x, y: anim.larva.y, r: larvaScale(id) * 34 };
  }
  const larvaScale = (id) => ({ l1: 0.9, l2: 1.25, l3: 1.65 }[id] || 1);
  const isNight = () => { const h = new Date().getHours(); return h >= 18 || h < 6; };

  // ---------------- ケースを かく ----------------
  const canvas = $('scene');
  const ctx = canvas.getContext('2d');
  let view = { s: 1, ox: 0, oy: 0 };

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    const s = Math.min(w / ART.W, h / ART.H);
    view = { s, ox: (w - ART.W * s) / 2, oy: (h - ART.H * s) / 2, dpr };
  }

  let lastT = performance.now();
  function frame(t) {
    const dt = Math.min(100, t - lastT); lastT = t;
    fit();
    const { s, ox, oy, dpr } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = isNight() ? '#1d2347' : '#f6e6cc';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    drawScene(t, dt);
    requestAnimationFrame(frame);
  }

  function drawScene(t, dt) {
    const c = data.cur;
    const night = isNight();
    ART.drawBackground(ctx, night, t);
    ART.drawCaseBack(ctx, night);
    if (!c) { ART.drawSoil(ctx, 70); ART.drawLog(ctx); ART.drawCaseFront(ctx, night); return; }
    const id = stageId(c);
    ART.drawSoil(ctx, c.moist);
    ART.drawLog(ctx);
    if (id === 'adult') ART.drawJelly(ctx, JELLY_X, ART.SOIL_TOP + 4, c.food);

    // マットこうかん中は ふんを けす・つちが ふる
    const matK = (t - anim.matAt) / 1400;
    for (const p of c.pellets) ART.drawPoop(ctx, p);

    if (id === 'egg') {
      ART.drawEgg(ctx, 300, 400, 1.1 + 0.06 * c.points, t);
    } else if (isLarva(c)) {
      const sc = larvaScale(id);
      const ay = id === 'l3' ? 26 : 40;
      const L = anim.larva;
      L.x = 300 + 170 * Math.sin(t / 26000);
      L.y = 372 + ay * Math.sin(t / 17000);
      const dir = Math.cos(t / 26000) >= 0 ? 1 : -1;
      ART.drawLarva(ctx, L.x, L.y, sc, dir, t);
    } else if (id === 'pupa') {
      ART.drawChamber(ctx, 380, 372, 1.3);
      ART.drawPupa(ctx, 380, 376, 1.3, t);
    } else {
      drawAdult(c, t, dt, night);
    }

    if (matK >= 0 && matK < 1) {
      const r = ART.rng(11);
      ctx.fillStyle = '#6b4626';
      for (let i = 0; i < 90; i++) {
        const x = ART.CASE.x + 10 + r() * (ART.CASE.w - 20);
        const y = ART.CASE.y + (matK * 1.4 - r() * 0.5) * (ART.SOIL_TOP - ART.CASE.y + 60);
        if (y < ART.CASE.y || y > ART.SOIL_TOP + 20) continue;
        ctx.globalAlpha = 1 - matK;
        ctx.beginPath(); ctx.arc(x, y, 2 + r() * 3, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const mistK = (t - anim.mistAt) / 1300;
    if (mistK >= 0 && mistK < 1) drawMist(mistK);

    ART.drawCaseFront(ctx, night);
    // こころの なかの「さみしい」は ださない。よるは つきだけ
    if (night) {
      ctx.fillStyle = '#ffe9a6';
      ctx.beginPath(); ctx.arc(578, 16, 10, 0, 7); ctx.fill();
      ctx.fillStyle = '#1d2347';
      ctx.beginPath(); ctx.arc(583, 12, 9, 0, 7); ctx.fill();
    }
  }

  function drawMist(k) {
    const r = ART.rng(5);
    const nx = ART.CASE.x + ART.CASE.w - 30, ny = ART.CASE.y + 16;
    ctx.save();
    // きりふき ボトル
    ctx.globalAlpha = Math.min(1, (1 - k) * 3);
    ctx.fillStyle = '#5bb6e8';
    ART.rrect(ctx, nx + 2, ny - 4, 22, 40, 6); ctx.fill();
    ctx.fillStyle = '#2f8fd0'; ctx.fillRect(nx - 8, ny - 2, 14, 7);
    for (let i = 0; i < 46; i++) {
      const ang = Math.PI * (0.62 + r() * 0.35), sp = 120 + r() * 260;
      const d = k * sp;
      const x = nx - 8 + Math.cos(ang) * d, y = ny + Math.sin(ang) * d + k * k * 120;
      ctx.globalAlpha = (1 - k) * 0.85;
      ctx.fillStyle = '#9fd8ff';
      ctx.beginPath(); ctx.arc(x, y, 2 + r() * 2.5, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function drawAdult(c, t, dt, night) {
    const A = anim.adult, ad = c.adult, s = ad.size / 60;
    const eating = t < anim.eatUntil;
    let moving = false;
    if (eating) {
      A.target = JELLY_X - 28 - 64 * s;
    } else if (night) {
      if (t > A.nextPick) { A.target = 110 + Math.random() * 300; A.nextPick = t + 5000 + Math.random() * 6000; }
    } else {
      A.target = 250; // ひるは きの まえで おやすみ
    }
    const dx = A.target - A.x;
    if (Math.abs(dx) > 2) {
      const sp = (eating ? 60 : 22) * dt / 1000;
      A.x += Math.sign(dx) * Math.min(Math.abs(dx), sp);
      A.dir = dx > 0 ? 1 : -1; moving = true;
      A.walk += dt / (eating ? 70 : 140);
    } else if (eating) {
      A.dir = 1;
    }
    ART.drawBeetle(ctx, A.x, ART.SOIL_TOP + 6, s, A.dir, ad.sex, A.walk);
    ctx.font = '700 22px sans-serif';
    ctx.textAlign = 'center';
    if (eating && !moving) {
      if (Math.random() < dt / 300) anim.hearts.push({ x: JELLY_X - 20, y: ART.SOIL_TOP - 40, born: t });
      ctx.fillStyle = '#7a4a1e';
      ctx.fillText('もぐもぐ', JELLY_X - 40, ART.SOIL_TOP - 90 * s - 10 + Math.sin(t / 150) * 3);
    } else if (!night && !moving && !eating) {
      ctx.fillStyle = 'rgba(80,80,140,.8)';
      const k = (t / 1200) % 1;
      ctx.fillText('Z', A.x + 40 * s + k * 20, ART.SOIL_TOP - 70 * s - k * 30);
      ctx.font = '700 15px sans-serif';
      ctx.fillText('z', A.x + 30 * s + ((k + 0.5) % 1) * 20, ART.SOIL_TOP - 60 * s - ((k + 0.5) % 1) * 30);
    }
    anim.hearts = anim.hearts.filter((h) => t - h.born < 1600);
    for (const h of anim.hearts) {
      const k = (t - h.born) / 1600;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#e8456b';
      ctx.font = '700 20px sans-serif';
      ctx.fillText('♥', h.x + Math.sin(k * 8) * 8, h.y - k * 60);
    }
    ctx.globalAlpha = 1;
  }

  // ---------------- タップ ----------------
  canvas.addEventListener('pointerup', (e) => {
    if (!data.cur) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - view.ox) / view.s;
    const y = (e.clientY - rect.top - view.oy) / view.s;
    const c = data.cur;
    // ふんを タップで そうじ
    for (let i = c.pellets.length - 1; i >= 0; i--) {
      const p = c.pellets[i];
      if ((p.x - x) ** 2 + (p.y - y) ** 2 < 18 * 18) {
        c.pellets.splice(i, 1);
        doCare('clean');
        if (!c.pellets.length) say('ぴかぴか！ ふんが なくなったよ');
        return;
      }
    }
    const b = creatureBox(c, performance.now());
    if ((b.x - x) ** 2 + (b.y - y) ** 2 < b.r * b.r) { SFX.tap(); openZoom(); return; }
    if (stageId(c) === 'adult' && (x - JELLY_X) ** 2 + (y - ART.SOIL_TOP + 14) ** 2 < 34 * 34) { doCare('jelly'); }
  });

  // ---------------- モーダル ----------------
  let modalLoop = 0;
  function openModal(html, onOpen) {
    cancelAnimationFrame(modalLoop);
    $('modalCard').innerHTML = html;
    $('modal').hidden = false;
    if (onOpen) onOpen($('modalCard'));
  }
  function closeModal() {
    cancelAnimationFrame(modalLoop);
    $('modal').hidden = true;
    $('modalCard').innerHTML = '';
  }
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && !$('modal').dataset.lock) closeModal(); });

  // うごく いきものを モーダルの canvas に かく
  function liveCanvas(cv, id, opt = {}) {
    const g = cv.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const loop = (t) => {
      const w = cv.clientWidth || 320, h = cv.clientHeight || 240;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const s = Math.min(w / 320, h / 240);
      g.setTransform(dpr * s, 0, 0, dpr * s, dpr * (w - 320 * s) / 2, dpr * (h - 240 * s) / 2);
      const bg = g.createLinearGradient(0, 0, 0, 240);
      bg.addColorStop(0, id === 'adult' ? '#fff3d6' : '#7a5230'); bg.addColorStop(1, id === 'adult' ? '#e8cfa2' : '#4a2f18');
      g.fillStyle = bg; g.fillRect(-200, -200, 720, 640);
      if (id === 'adult') { g.fillStyle = '#8b5a2b'; g.fillRect(-200, 190, 720, 200); }
      if (id === 'pupa') ART.drawChamber(g, 160, 122, 1.7);
      const big = { egg: 2.2, l1: 3.2, l2: 2.4, l3: 1.9, pupa: 1.7, adult: 1.5 }[id];
      if (id === 'adult') ART.drawBeetle(g, 120, 190, big * (opt.size || 60) / 60, 1, opt.sex || 'm', opt.walk ? t / 140 : 0);
      else ART.drawCreature(g, id, 160, id === 'pupa' ? 126 : 124, big, { t });
      if (opt.once) return;
      modalLoop = requestAnimationFrame(loop);
    };
    modalLoop = requestAnimationFrame(loop);
  }

  function factHtml(f) { return `<div class="fact-box"><p><b>${f.t}</b><br>${f.b}</p></div>`; }

  function openZoom() {
    const c = data.cur, id = stageId(c);
    const facts = FACTS[id];
    const f = facts[(c.factIdx + 1) % facts.length];
    const nm = id === 'adult' && c.adult.registered ? `「${c.adult.name}」` : STAGES[c.stage].name;
    openModal(`<h2>🔍 ${nm}</h2><canvas></canvas>${factHtml(facts[0])}${factHtml(f)}
      <div class="btns"><button class="btn btn-main" data-x>とじる</button></div>`, (m) => {
      liveCanvas(m.querySelector('canvas'), id, c.adult ? { sex: c.adult.sex, size: c.adult.size, walk: true } : {});
      m.querySelector('[data-x]').onclick = closeModal;
    });
  }

  function openGrow(to) {
    const c = data.cur, st = STAGES[to];
    SFX.grow();
    if (to === ADULT) {
      const a = c.adult;
      setTimeout(SFX.fanfare, 600);
      openModal(`<h2>🎉 せいちゅうに なったよ！</h2><canvas></canvas>
        <p style="font-size:22px">${a.sex === 'm' ? '♂ オス' : '♀ メス'} だよ！ おおきさ <b>${a.size}mm</b></p>
        ${factHtml(FACTS.adult[0])}
        <div class="btns"><button class="btn btn-main" data-n>なまえを つける ✏️</button></div>`, (m) => {
        liveCanvas(m.querySelector('canvas'), 'adult', { sex: a.sex, size: a.size, walk: true });
        m.querySelector('[data-n]').onclick = openName;
      });
      return;
    }
    const msg = to === PUPA ? 'さなぎの へやを つくって、さなぎに なったよ。' : (to === 1 ? 'たまごから ようちゅうが うまれたよ！' : 'かわを ぬいで おおきく なったよ！');
    openModal(`<h2>✨ ${st.name}に なったよ！</h2><canvas></canvas><p>${msg}</p>${factHtml(FACTS[st.id][0])}
      <div class="btns"><button class="btn btn-main" data-x>やったね！</button></div>`, (m) => {
      liveCanvas(m.querySelector('canvas'), st.id);
      m.querySelector('[data-x]').onclick = closeModal;
    });
  }

  function esc(s) { return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

  function openName() {
    const a = data.cur.adult;
    const ideas = NAME_IDEAS[a.sex];
    openModal(`<h2>✏️ なまえを つけよう</h2>
      <input class="name-input" maxlength="10" value="${esc(a.name || ideas[Math.floor(Math.random() * ideas.length)])}" aria-label="なまえ">
      <p style="font-size:15px">ボタンからも えらべるよ</p>
      <div class="chips">${ideas.map((n) => `<button class="chip" type="button">${n}</button>`).join('')}</div>
      <div class="btns"><button class="btn btn-main" data-ok>📔 ずかんに とうろく</button></div>`, (m) => {
      const inp = m.querySelector('input');
      m.querySelectorAll('.chip').forEach((b) => { b.onclick = () => { inp.value = b.textContent; SFX.tap(); }; });
      m.querySelector('[data-ok]').onclick = () => {
        const name = inp.value.trim() || ideas[0];
        register(name);
      };
    });
  }

  function register(name) {
    const c = data.cur, a = c.adult;
    a.name = name;
    if (!a.registered) {
      a.registered = true;
      data.zukan.push({
        name, sex: a.sex, size: a.size, startedAt: c.startedAt, adultAt: a.adultAt,
        careDays: Object.keys(c.careLog).length, fast: FAST || undefined,
      });
    } else {
      const z = data.zukan[data.zukan.length - 1];
      if (z) z.name = name;
    }
    save();
    SFX.fanfare();
    closeModal();
    renderPanel();
    say(`「${esc(name)}」を ずかんに とうろく したよ！`, 4500);
  }

  function openZukan() {
    SFX.tap();
    const list = data.zukan.slice().reverse();
    const items = list.map((z, i) => `<div class="zukan-item"><canvas data-i="${i}"></canvas>
      <p class="nm">${esc(z.name)}</p>
      <p class="meta">${z.sex === 'm' ? '♂ オス' : '♀ メス'}・${z.size}mm<br>${fmtDate(z.startedAt)} 〜 ${fmtDate(z.adultAt)}<br>おせわ ${z.careDays}にち</p></div>`).join('');
    openModal(`<h2>📔 カブトムシ ずかん</h2>
      <p>そだてた カブトムシ: <b>${list.length}</b>ひき</p>
      ${list.length ? `<div class="zukan-list">${items}</div>` : '<p>まだ いないよ。<br>せいちゅうまで そだてて とうろく しよう！</p>'}
      <div class="btns"><button class="btn btn-main" data-x>とじる</button></div>`, (m) => {
      m.querySelectorAll('canvas').forEach((cv) => {
        const z = list[+cv.dataset.i];
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = cv.clientWidth || 130, h = cv.clientHeight || 87;
        cv.width = w * dpr; cv.height = h * dpr;
        const g = cv.getContext('2d');
        const s = w / 180;
        g.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
        ART.drawBeetle(g, 62, 104, 0.95 * z.size / 60, 1, z.sex, 0);
      });
      m.querySelector('[data-x]').onclick = closeModal;
    });
  }

  function openStart(again) {
    $('modal').dataset.lock = '1';
    openModal(`<h2>🥚 カブトムシの たまごを もらったよ！</h2><canvas></canvas>
      <ul class="howto">
        <li>1にち 1かい いじょう おせわを しよう</li>
        <li>ねている あいだに すこしずつ そだつよ</li>
        <li>おせわを つづけると やく 7にちで せいちゅうに！</li>
        <li>おせわを わすれても しなないよ。そだつのが おやすみ に なるだけ</li>
      </ul>
      <div class="btns"><button class="btn btn-main" data-go>そだて はじめる</button>
      ${again ? '<button class="btn btn-sub" data-x>やっぱり やめる</button>' : ''}</div>`, (m) => {
      liveCanvas(m.querySelector('canvas'), 'egg');
      m.querySelector('[data-go]').onclick = () => {
        delete $('modal').dataset.lock;
        data.cur = newRun();
        anim.adult.x = 330; lastDay = null;
        save(); closeModal(); SFX.grow(); renderAll();
        say('たまごを つちに そっと いれたよ。<br>きりふきで しっとり させてね 💧', 5000);
      };
      const x = m.querySelector('[data-x]');
      if (x) x.onclick = () => { delete $('modal').dataset.lock; closeModal(); };
    });
  }

  // ---------------- パネル ----------------
  function buildStepper() {
    const ol = $('stepper');
    ol.innerHTML = '';
    STAGES.forEach((st) => {
      const li = document.createElement('li');
      const cv = document.createElement('canvas');
      li.append(cv, document.createTextNode(st.short));
      ol.append(li);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = 52 * dpr; cv.height = 52 * dpr;
      const g = cv.getContext('2d');
      g.setTransform(dpr * 52 / 100, 0, 0, dpr * 52 / 100, 0, 0);
      const sc = { egg: 1.4, l1: 1.6, l2: 1.3, l3: 1.05, pupa: 1, adult: 0.55 }[st.id];
      if (st.id === 'adult') ART.drawBeetle(g, 34, 78, sc, 1, 'm', 0);
      else ART.drawCreature(g, st.id, 50, 54, sc);
    });
  }

  function renderPanel() {
    const c = data.cur;
    $('zukanCount').hidden = !data.zukan.length;
    $('zukanCount').textContent = data.zukan.length;
    $('soundBtn').textContent = data.sound ? '🔊' : '🔇';
    if (!c) return;
    const today = c.lastSeenDay, id = stageId(c);
    [...$('stepper').children].forEach((li, i) => {
      li.className = i < c.stage ? 'done' : i === c.stage ? 'now' : '';
    });
    const a = c.adult;
    $('stageName').textContent = id === 'adult' && a ? `せいちゅう（${a.sex === 'm' ? '♂ オス' : '♀ メス'}）` : STAGES[c.stage].name;
    $('dayText').textContent = `そだてはじめて ${today - c.startDay + 1}にちめ`;
    const caredToday = !!c.careLog[today];
    let next;
    if (c.stage === ADULT) {
      next = a && a.registered ? `「${esc(a.name)}」は げんき！ ゼリーを あげよう 🍯` : 'りっぱな せいちゅうに なったよ！ なまえを つけよう';
    } else {
      const left = pointsToNext(c), nm = STAGES[c.stage + 1].name;
      next = caredToday
        ? `✔ きょうの おせわ できたね！ ねている あいだに そだつよ<br>あと ${left}にち おせわ すると「${nm}」`
        : `きょうの おせわ まだだよ 👀<br>あと ${left}にち おせわ すると「${nm}」`;
    }
    $('nextText').innerHTML = next;

    for (const [btn, type] of [['btnMat', 'mat'], ['btnMist', 'mist'], ['btnJelly', 'jelly']]) {
      const b = $(btn);
      b.setAttribute('aria-disabled', blocked(type, c) ? 'true' : 'false');
      b.classList.toggle('today', !!(c.careLog[today] && c.careLog[today][type]));
    }
    const note = $('careNote');
    if (id === 'pupa') { note.hidden = false; note.innerHTML = '🤫 いまは さわらないで そっと みまもろう<br><small>さなぎの へやが こわれないように、マットこうかんは おやすみ</small>'; }
    else if (c.moist < 25) { note.hidden = false; note.textContent = '💧 つちが かわいて きたよ。きりふき してね'; }
    else if (c.pellets.length >= 8) { note.hidden = false; note.textContent = '🟤 ふんが たまって きたよ。マットこうかん しよう'; }
    else if (id === 'adult' && c.food < 25) { note.hidden = false; note.textContent = '🍯 おなかが すいて きたみたい。ゼリーを あげよう'; }
    else note.hidden = true;

    $('mMoist').querySelector('i').style.width = `${Math.round(c.moist)}%`;
    $('mPoop').hidden = !isLarva(c);
    $('mPoop').querySelector('i').style.width = `${Math.round(c.pellets.length / CONFIG.poopMax * 100)}%`;
    $('mFood').hidden = id !== 'adult';
    $('mFood').querySelector('i').style.width = `${Math.round(c.food)}%`;

    $('adultBox').hidden = !a;
    if (a) {
      $('adultInfo').innerHTML = a.registered
        ? `📔 「${esc(a.name)}」<br>${a.sex === 'm' ? '♂ オス' : '♀ メス'}・${a.size}mm`
        : `${a.sex === 'm' ? '♂ オス' : '♀ メス'}・おおきさ ${a.size}mm`;
      $('nameBtn').hidden = a.registered;
      $('newEggBtn').hidden = !a.registered;
    }
    renderFact();
  }

  function renderFact() {
    const c = data.cur;
    const list = FACTS[c ? stageId(c) : 'egg'];
    const f = list[(c ? c.factIdx : 0) % list.length];
    $('factTitle').textContent = f.t;
    $('factBody').innerHTML = f.b;
  }

  function renderBadge() {
    if (!FAST) return;
    const b = $('fastBadge');
    b.hidden = false;
    const left = Math.ceil((DAY_MS - (Date.now() % DAY_MS)) / 1000);
    b.textContent = `⏩ はやおくり中（1にち＝1ぷん）つぎの ひまで ${left}びょう`;
  }

  function renderAll() { renderPanel(); renderBadge(); }

  // ---------------- じかんの すすみ ----------------
  let lastDay = null, ticks = 0;
  function tick(initial) {
    renderBadge();
    const c = data.cur;
    if (!c) return;
    const { now, today } = clock();
    updateMeters(now);
    if (today !== lastDay) {
      lastDay = today;
      const g = processGrowth(today, now);
      const last = c.lastCareDay == null ? c.startDay : c.lastCareDay;
      if (today - last >= CONFIG.lonelyDays && c.lonelyDay !== today) {
        c.lonelyDay = today;
        say('さみしかったよ…<br>でも また あえて うれしいな！ 🪲', 6000);
      }
      if (g) { save(); if ($('modal').hidden || initial) openGrow(g.to); }
      else if (c.stage === ADULT && c.adult && !c.adult.registered && initial) openName();
    }
    if (++ticks % 10 === 0) save();
    renderPanel();
  }

  // ---------------- ボタン ----------------
  document.querySelectorAll('.care-btn').forEach((b) => b.addEventListener('click', () => doCare(b.dataset.care)));
  $('soundBtn').onclick = () => { data.sound = !data.sound; save(); renderPanel(); if (data.sound) SFX.tap(); };
  $('zukanBtn').onclick = openZukan;
  $('nameBtn').onclick = openName;
  $('newEggBtn').onclick = () => openStart(true);
  $('factNext').onclick = () => {
    if (!data.cur) return;
    data.cur.factIdx = (data.cur.factIdx + 1) % FACTS[stageId(data.cur)].length;
    SFX.tap(); save(); renderFact();
  };
  window.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); else save(); });
  window.addEventListener('pagehide', save);

  // ---------------- はじめ ----------------
  buildStepper();
  renderAll();
  if (!data.cur) openStart(false);
  else tick(true);
  setInterval(() => tick(false), 1000);
  requestAnimationFrame(frame);
})();
