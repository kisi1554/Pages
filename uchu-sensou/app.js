'use strict';

/* うちゅう せんそう の がめん・そうさ・ほぞん */
(() => {
  const KEY = 'uchu-sensou-v1';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ruby = (s) => esc(s).replace(/\[([^|\]]+)\|([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');

  /* ---------------- ほぞん ---------------- */
  const save = { players: 1, mode: 'easy', bgm: true, sfx: true, unlocked: 1, best: {}, score: 0 };
  try {
    Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}'));
  } catch (e) {
    /* よめなくても あそべる */
  }
  if (!save.best || typeof save.best !== 'object') save.best = {};
  function store() {
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch (e) {
      /* ほぞん できなくても あそべる */
    }
  }
  Sound.set({ bgm: save.bgm, sfx: save.sfx });

  /* ---------------- タイトル ---------------- */
  $('story').textContent = DATA.STORY;
  function renderTitle() {
    document.querySelectorAll('[data-players]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.players) === save.players)));
    document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === save.mode)));
    $('modeHint').textContent = save.mode === 'easy'
      ? 'やさしい: ぼくらの ほしの バリアは なくならない。ゆっくり あそべるよ。'
      : 'ふつう: バリアが 0 に なったら まけ。てきの たまも はやいよ。';
    $('sectors').innerHTML = DATA.SECTORS.map((s, i) => {
      const best = save.best[s.id] || 0;
      const locked = i >= save.unlocked;
      return `<button class="sector" type="button" data-sec="${i}" ${locked ? 'disabled' : ''}>
        <span class="em">${locked ? '🔒' : s.emoji}</span>
        <span><b>${i + 1}. ${esc(s.name)}</b><small>${'★'.repeat(best)}${'☆'.repeat(3 - best)}</small></span></button>`;
    }).join('');
    ['btnBgm', 'pBgm'].forEach((id) => $(id).setAttribute('aria-pressed', String(save.bgm)));
    ['btnSfx', 'pSfx'].forEach((id) => $(id).setAttribute('aria-pressed', String(save.sfx)));
  }
  document.querySelectorAll('[data-players]').forEach((b) => b.addEventListener('click', () => {
    Sound.unlock();
    save.players = Number(b.dataset.players);
    store();
    renderTitle();
    Sound.sfx('tap');
  }));
  document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    Sound.unlock();
    save.mode = b.dataset.mode;
    store();
    renderTitle();
    Sound.sfx('tap');
  }));
  $('sectors').addEventListener('click', (e) => {
    const b = e.target.closest('.sector');
    if (b && !b.disabled) start(Number(b.dataset.sec));
  });
  function toggle(key) {
    save[key] = !save[key];
    Sound.set({ bgm: save.bgm, sfx: save.sfx });
    if (key === 'bgm') Sound.bgm(save.bgm && st && !paused && st.phase !== 'clear' && st.phase !== 'lose', bossOn);
    store();
    renderTitle();
  }
  ['btnBgm', 'pBgm'].forEach((id) => $(id).addEventListener('click', () => { Sound.unlock(); toggle('bgm'); }));
  ['btnSfx', 'pSfx'].forEach((id) => $(id).addEventListener('click', () => { Sound.unlock(); toggle('sfx'); }));

  /* ---------------- ゲーム ---------------- */
  let st = null;
  let paused = false;
  let raf = 0;
  let last = 0;
  let acc = 0;
  let bossOn = false;
  let bannerTimer = 0;
  const cv = $('cv');
  Render.init(cv);
  window.addEventListener('resize', () => Render.resize());

  function start(sec) {
    Sound.unlock();
    st = Sim.create(sec, { players: save.players, mode: save.mode, seed: (Date.now() & 0xffff) + 1 });
    paused = false;
    bossOn = false;
    sticks.forEach((s) => { s.active = false; s.x = 0; s.y = 0; s.id = null; });
    $('title').hidden = true;
    $('game').hidden = false;
    ['shop', 'result', 'pause'].forEach((id) => { $(id).hidden = true; });
    const two = st.players.length === 2;
    $('bomb1').hidden = !two;
    $('bomb0').classList.toggle('p1left', two);
    $('bomb1').classList.toggle('p2right', two);
    Render.resize();
    banner(`${st.sec.emoji} ${esc(st.sec.name)}<small>ギギガー ぐんだんが くるぞ！ ぼくらの ほしを まもれ！</small>`, 2400);
    Sound.bgm(save.bgm, false);
    last = performance.now();
    acc = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function toTitle() {
    cancelAnimationFrame(raf);
    st = null;
    Sound.bgm(false);
    $('game').hidden = true;
    ['shop', 'result', 'pause'].forEach((id) => { $(id).hidden = true; });
    $('title').hidden = false;
    renderTitle();
  }

  function banner(html, ms) {
    $('banner').innerHTML = html;
    $('banner').hidden = false;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { $('banner').hidden = true; }, ms || 1600);
  }

  /* ---------------- そうさ ---------------- */
  const sticks = [
    { id: null, active: false, ox: 0, oy: 0, x: 0, y: 0, color: 'rgba(77,171,247,.7)' },
    { id: null, active: false, ox: 0, oy: 0, x: 0, y: 0, color: 'rgba(105,219,124,.7)' },
  ];
  const R = 56;
  function stickFor(e) {
    if (!st) return null;
    if (st.players.length === 1) return sticks[0];
    const r = cv.getBoundingClientRect();
    return e.clientX - r.left < r.width / 2 ? sticks[0] : sticks[1];
  }
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    Sound.unlock();
    const s = stickFor(e);
    if (!s || s.active) return;
    const r = cv.getBoundingClientRect();
    s.id = e.pointerId;
    s.active = true;
    s.ox = e.clientX - r.left;
    s.oy = e.clientY - r.top;
    s.x = 0;
    s.y = 0;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* なにも しない */ }
  });
  cv.addEventListener('pointermove', (e) => {
    const s = sticks.find((q) => q.active && q.id === e.pointerId);
    if (!s) return;
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    let dx = cx - s.ox;
    let dy = cy - s.oy;
    const d = Math.hypot(dx, dy);
    // ゆびが はなれすぎたら スティック も ついて いく
    if (d > R * 1.6) {
      s.ox = cx - (dx / d) * R * 1.6;
      s.oy = cy - (dy / d) * R * 1.6;
      dx = cx - s.ox;
      dy = cy - s.oy;
    }
    const l = Math.hypot(dx, dy);
    const k = l > R ? R / l : 1;
    s.x = (dx * k) / R;
    s.y = (dy * k) / R;
  });
  function release(e) {
    const s = sticks.find((q) => q.active && q.id === e.pointerId);
    if (!s) return;
    s.active = false;
    s.id = null;
    s.x = 0;
    s.y = 0;
  }
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);
  cv.addEventListener('lostpointercapture', release);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  const bombReq = [false, false];
  ['bomb0', 'bomb1'].forEach((id, i) => {
    $(id).addEventListener('pointerdown', (e) => {
      e.preventDefault();
      Sound.unlock();
      bombReq[i] = true;
    });
    $(id).addEventListener('contextmenu', (e) => e.preventDefault());
  });

  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (!st) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'enter'].includes(k)) e.preventDefault();
    if (k === 'p' || k === 'escape') {
      setPause(!paused);
      return;
    }
    if (k === ' ' && !keys.has(' ')) bombReq[0] = true;
    if (k === 'enter' && !keys.has('enter')) bombReq[st.players.length === 2 ? 1 : 0] = true;
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  function keyVec(up, down, left, right) {
    let x = 0;
    let y = 0;
    if (keys.has(left)) x -= 1;
    if (keys.has(right)) x += 1;
    if (keys.has(up)) y -= 1;
    if (keys.has(down)) y += 1;
    return [x, y];
  }
  function inputs() {
    const two = st.players.length === 2;
    const out = [];
    for (let i = 0; i < st.players.length; i += 1) {
      let [x, y] = [sticks[i].x, sticks[i].y];
      const kv = i === 0 ? keyVec('w', 's', 'a', 'd') : keyVec('arrowup', 'arrowdown', 'arrowleft', 'arrowright');
      if (!two && i === 0) {
        const kv2 = keyVec('arrowup', 'arrowdown', 'arrowleft', 'arrowright');
        kv[0] += kv2[0];
        kv[1] += kv2[1];
      }
      if (kv[0] || kv[1]) {
        x = kv[0];
        y = kv[1];
      }
      out.push({ x, y, bomb: bombReq[i] });
    }
    return out;
  }

  /* ---------------- ループ ---------------- */
  const DT = 1 / 60;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!st) return;
    const frame = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused) {
      acc += frame;
      let n = 0;
      while (acc >= DT && n < 4) {
        Sim.step(st, DT, inputs());
        bombReq[0] = false;
        bombReq[1] = false;
        acc -= DT;
        n += 1;
      }
      if (n === 4) acc = 0;
      handle(st.events);
      st.events = [];
    }
    Render.frame(st, sticks, paused ? 0 : frame);
    hud();
  }

  function handle(list) {
    if (!list.length) return;
    Render.events(list);
    Sound.events(list);
    for (const e of list) {
      if (e.type === 'wave') {
        if (e.boss) {
          banner(`⚠️ ボス しゅつげん！<small>ウェーブ ${e.n}/${st.total}</small>`, 2200);
          bossOn = true;
          Sound.bgm(save.bgm, true);
        } else {
          banner(`ウェーブ ${e.n}/${st.total}`, 1400);
        }
      } else if (e.type === 'waveClear') {
        banner(`✨ ウェーブ ${e.n} クリア！<small>${esc(DATA.TIPS[(e.n - 1) % DATA.TIPS.length])}</small>`, 2600);
      } else if (e.type === 'shop') {
        openShop();
      } else if (e.type === 'clear') {
        finish(true);
      } else if (e.type === 'lose') {
        finish(false);
      } else if (e.type === 'down') {
        banner(`${e.who + 1}P が やられた！<small>すこし まつと ほしの そばで ふっかつ</small>`, 1600);
      } else if (e.type === 'warp') {
        if (e.who !== undefined) banner('🕳️ すいこまれて ワープ！', 1200);
      }
    }
  }

  function hud() {
    if (!st) return;
    const b = st.base;
    $('baseFill').style.width = `${(100 * b.hp) / b.max}%`;
    document.querySelector('.basebar').classList.toggle('low', b.hp / b.max < 0.3);
    $('waveLabel').textContent = `ウェーブ ${Math.max(1, st.waveIdx + 1)}/${st.total}`;
    $('starCount').textContent = st.stars;
    $('scoreLabel').textContent = `${st.score}てん`;
    $('hearts').innerHTML = st.players.map((p, i) =>
      `<span class="p ${i ? 'two' : ''}">${i + 1}P ${p.alive ? '❤️'.repeat(p.hp) + '🤍'.repeat(p.max - p.hp) : '💤'}${p.allies ? ' ' + '🛸'.repeat(p.allies) : ''}</span>`).join('');
    st.players.forEach((p, i) => {
      const btn = $(`bomb${i}`);
      btn.disabled = !p.alive || p.bombs <= 0;
      btn.querySelector('small').textContent = `×${p.bombs}`;
    });
  }

  /* ---------------- ショップ ---------------- */
  function openShop() {
    $('shopFact').innerHTML = `🔭 ${ruby(st.sec.fact)}`;
    renderShop();
    $('shop').hidden = false;
  }
  function renderShop() {
    $('shopStars').textContent = st.stars;
    $('shopItems').innerHTML = DATA.SHOP.map((it) => {
      const c = Sim.price(st, it.id);
      const lv = Sim.level(st, it.id);
      const label = c === null ? 'もう いっぱい' : `⭐ ${c}`;
      return `<button class="item" type="button" data-id="${it.id}" ${c === null || st.stars < c ? 'disabled' : ''}>
        <span class="em">${it.emoji}</span><b>${esc(it.name)}${lv && it.id !== 'repair' && it.id !== 'bomb' ? ` Lv${lv}` : ''}</b>
        <span>${esc(it.desc)}</span><em>${label}</em></button>`;
    }).join('');
  }
  $('shopItems').addEventListener('click', (e) => {
    const b = e.target.closest('.item');
    if (!b || !st) return;
    if (Sim.buy(st, b.dataset.id)) {
      handle(st.events);
      st.events = [];
      renderShop();
      hud();
    }
  });
  $('shopGo').addEventListener('click', () => {
    if (!st) return;
    Sim.leaveShop(st);
    $('shop').hidden = true;
    Sound.sfx('tap');
  });

  /* ---------------- けっか ---------------- */
  function finish(won) {
    Sound.bgm(false);
    bossOn = false;
    const sec = st.sec;
    const idx = st.sector;
    $('resNext').hidden = true;
    if (won) {
      const r = Sim.rating(st);
      save.best[sec.id] = Math.max(save.best[sec.id] || 0, r);
      if (idx + 1 >= save.unlocked && idx + 1 < DATA.SECTORS.length) save.unlocked = idx + 2;
      save.score = Math.max(save.score || 0, st.score);
      store();
      const last = idx === DATA.SECTORS.length - 1;
      $('resTitle').textContent = last ? '🎉 うちゅうに へいわが もどった！' : `🎉 ${sec.name} を まもった！`;
      $('resStars').textContent = '★'.repeat(r) + '☆'.repeat(3 - r);
      $('resText').textContent = last
        ? `ギギガー だいおうも スターに もどったよ。ありがとう、うちゅう パトロールたい！ ${st.score}てん`
        : `たおした ロボット ${st.kills}たい・${st.score}てん。バリア のこり ${Math.round(st.base.hp)}`;
      $('resNext').hidden = last;
    } else {
      $('resTitle').textContent = '💥 バリアが なくなっちゃった…';
      $('resStars').textContent = '';
      $('resText').textContent = `ウェーブ ${st.waveIdx + 1} まで がんばった！ ショップで なかまや たいほうを ふやすと らくに なるよ。（やさしい モード なら まけないよ）`;
    }
    $('resFact').innerHTML = `🔭 ${ruby(sec.fact)}`;
    setTimeout(() => { if (st) $('result').hidden = false; }, won ? 900 : 600);
  }
  $('resRetry').addEventListener('click', () => st && start(st.sector));
  $('resNext').addEventListener('click', () => st && start(Math.min(DATA.SECTORS.length - 1, st.sector + 1)));
  $('resTitleBtn').addEventListener('click', toTitle);

  /* ---------------- ひとやすみ ---------------- */
  function setPause(on) {
    if (!st || st.phase === 'clear' || st.phase === 'lose' || !$('shop').hidden) return;
    paused = on;
    $('pause').hidden = !on;
    Sound.bgm(save.bgm && !on, bossOn);
    if (!on) last = performance.now();
  }
  $('btnPause').addEventListener('click', () => setPause(true));
  $('pResume').addEventListener('click', () => setPause(false));
  $('pTitle').addEventListener('click', toTitle);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && st && !paused) setPause(true);
  });

  renderTitle();

  // テスト よう
  window.UchuDebug = {
    state: () => st,
    start,
    clearWave: () => {
      if (!st) return;
      st.queue = [];
      st.enemies = [];
      st.ebullets = [];
    },
    finishSector: () => {
      if (!st) return;
      st.waveIdx = st.total - 1;
      st.phase = 'wave';
      st.queue = [];
      st.enemies = [];
    },
    stickOf: (i) => ({ x: sticks[i].x, y: sticks[i].y, active: sticks[i].active }),
    paused: () => paused,
  };
})();
