'use strict';

/*
 * かくれんぼ(10の ばしょ × 10の あそびかた × 3つの むずかしさ)
 *  HideGame.init(ctx) … app.js から こえ・おと・ほぞん を うけとる
 *  HideGame.menu()     … ばしょ・あそびかた を えらぶ がめん
 *  HideGame.start(mode, stage, diff)
 *
 *  ほぞん(save.hg): xp・バッジ・ばしょ／あそびかたごとの きろく・タイムアタックの さいこう など
 */

const HideGame = (function () {
  const H = HideData;
  let X = null; // app.js からの どうぐ
  let G = null; // いまの ゲーム
  let token = 0; // ゲームを やりなおした とき、ふるい タイマーを とめる ため
  const timers = [];

  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => a.slice().sort(() => Math.random() - 0.5);
  const $ = (id) => document.getElementById(id);
  const later = (ms, fn) => {
    const my = token;
    timers.push(setTimeout(() => my === token && fn(), ms));
  };
  function clearTimers() {
    token++;
    while (timers.length) clearTimeout(timers.pop());
  }

  /* ---------------------------- ほぞん ---------------------------- */
  function hg() {
    const s = X.save;
    if (!s.hg) {
      s.hg = { xp: 0, badges: {}, stages: {}, modes: {}, finds: s.seekWins || 0, hideWins: s.hideWins || 0, timeBest: 0, days: [], last: { mode: 'seek', stage: 'park', diff: 'normal' } };
    }
    s.hg.badges = s.hg.badges || {};
    s.hg.stages = s.hg.stages || {};
    s.hg.modes = s.hg.modes || {};
    s.hg.days = s.hg.days || [];
    s.hg.last = s.hg.last || { mode: 'seek', stage: 'park', diff: 'normal' };
    return s.hg;
  }
  function levelOf(xp) {
    let i = 0;
    H.levels.forEach((l, k) => {
      if (xp >= l.xp) i = k;
    });
    return i;
  }

  /* ---------------------------- はなす ---------------------------- */
  function msg(text, done) {
    const t = X.fill(text);
    $('gameMsg').textContent = t;
    X.speak(t, done);
  }
  // 「！」「？」で おわる ときは「。」を つけない
  const joinT = (a, b) => a + (/[！？!?〜…]$/.test(a) ? ' ' : '。') + b;
  const line = (key, rep) => {
    let t = pick(H.lines[key]);
    Object.keys(rep || {}).forEach((k) => (t = t.split(k).join(rep[k])));
    return t;
  };

  /* ---------------------------- え ---------------------------- */
  const ART = {
    leaves: `<svg viewBox="0 0 100 70"><g fill="#3e9b4f" stroke="#2c7a3b" stroke-width="2"><circle cx="30" cy="40" r="24"/><circle cx="55" cy="28" r="26"/><circle cx="75" cy="44" r="20"/><circle cx="50" cy="50" r="18"/></g><g fill="#5cb85c"><circle cx="48" cy="20" r="8"/><circle cx="26" cy="34" r="6"/></g></svg>`,
    hole: `<svg viewBox="0 0 60 70"><ellipse cx="30" cy="36" rx="22" ry="28" fill="#4a2f1c" stroke="#6b4a2f" stroke-width="5"/></svg>`,
    bush: `<svg viewBox="0 0 100 70"><g fill="#4caf50" stroke="#2e7d32" stroke-width="2"><circle cx="24" cy="46" r="22"/><circle cx="50" cy="34" r="26"/><circle cx="78" cy="46" r="21"/></g><rect x="4" y="52" width="92" height="18" rx="9" fill="#43a047"/></svg>`,
    flower: `<svg viewBox="0 0 60 130"><path d="M30 50 V130" stroke="#3e8e41" stroke-width="6"/><path d="M30 90 q-20 -6 -24 -20 q18 0 24 14Z M30 104 q20 -6 24 -20 q-18 0 -24 14Z" fill="#4caf50"/><g fill="#ffcc1a" stroke="#e0a800" stroke-width="1.5">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<ellipse cx="30" cy="16" rx="7" ry="14" transform="rotate(${a} 30 30)"/>`).join('')}</g><circle cx="30" cy="30" r="12" fill="#7b4a1e"/></svg>`,
    grass: `<svg viewBox="0 0 100 60"><g fill="#66bb6a" stroke="#388e3c" stroke-width="1.5"><path d="M5 60 L20 8 L28 60Z"/><path d="M20 60 L42 0 L48 60Z"/><path d="M40 60 L60 10 L66 60Z"/><path d="M58 60 L82 4 L84 60Z"/><path d="M76 60 L96 18 L98 60Z"/></g></svg>`,
    rock: `<svg viewBox="0 0 100 60"><path d="M6 58 Q4 28 30 16 Q56 2 80 18 Q98 32 94 58Z" fill="#9e9e9e" stroke="#757575" stroke-width="3"/><path d="M30 26 Q44 18 56 22" stroke="#bdbdbd" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
    kinoko: `<svg viewBox="0 0 60 60"><rect x="22" y="30" width="16" height="28" rx="6" fill="#fff3e0" stroke="#d7b98e" stroke-width="2"/><path d="M4 34 Q6 4 30 4 Q54 4 56 34Z" fill="#e53935" stroke="#b71c1c" stroke-width="2"/><g fill="#fff"><circle cx="20" cy="18" r="4"/><circle cx="38" cy="14" r="5"/><circle cx="46" cy="26" r="3"/></g></svg>`,
  };

  // セミ(なかまは いろを かえる)
  const semiSVG = (color, cls) => `<svg viewBox="0 0 60 60" class="${cls || 'mini'}" aria-hidden="true">
    <path d="M24 26 C8 22 2 40 8 52 C14 58 22 50 26 40Z M36 26 C52 22 58 40 52 52 C46 58 38 50 34 40Z" fill="rgba(220,240,255,.75)" stroke="#5b7b8c" stroke-width="1.2"/>
    <ellipse cx="30" cy="38" rx="8" ry="15" fill="#2f5d3a"/>
    <ellipse cx="30" cy="20" rx="15" ry="10" fill="${color || '#4a8f52'}"/>
    <circle cx="17" cy="17" r="6" fill="#fff"/><circle cx="43" cy="17" r="6" fill="#fff"/>
    <circle cx="18" cy="17" r="3" fill="#222"/><circle cx="42" cy="17" r="3" fill="#222"/>
    <path d="M25 24 Q31 29 36 22" stroke="#222" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
  const shellSVG = () => `<svg viewBox="0 0 60 60" class="mini" aria-hidden="true">
    <ellipse cx="30" cy="34" rx="12" ry="18" fill="#b07a3c" stroke="#7a4f22" stroke-width="2"/>
    <path d="M30 18 V50 M20 30 Q30 34 40 30 M20 40 Q30 44 40 40" stroke="#7a4f22" stroke-width="1.6" fill="none"/>
    <path d="M18 22 l-8 -6 M42 22 l8 -6 M19 44 l-9 6 M41 44 l9 6" stroke="#7a4f22" stroke-width="2"/>
    <ellipse cx="30" cy="18" rx="10" ry="7" fill="#c48a48" stroke="#7a4f22" stroke-width="2"/></svg>`;

  // ばしょの はいけい(stage.deco で かきわける)
  function bgSVG(st) {
    const [s1, s2] = st.sky;
    const [g1, g2] = st.ground;
    const deco = {
      'sun tree': `<circle cx="350" cy="40" r="22" fill="#ffd54f"/>
        <g fill="#3a8a48"><ellipse cx="150" cy="62" rx="110" ry="52"/><ellipse cx="110" cy="96" rx="60" ry="32"/><ellipse cx="220" cy="80" rx="56" ry="34"/></g>
        <path d="M136 230 Q140 170 146 110 L170 110 Q176 170 184 230Z" fill="#8d6e63" stroke="#6d4c41" stroke-width="3"/>
        <path d="M150 116 Q120 100 96 104 M168 114 Q200 96 222 104" stroke="#795548" stroke-width="10" fill="none" stroke-linecap="round"/>`,
      trees: `<g fill="#2e6b3a" opacity=".7"><path d="M30 200 L70 60 L110 200Z"/><path d="M140 200 L190 40 L240 200Z"/><path d="M280 200 L330 70 L380 200Z"/></g>
        <g fill="#5d4037"><rect x="64" y="190" width="12" height="30"/><rect x="184" y="190" width="12" height="30"/><rect x="324" y="190" width="12" height="30"/></g>`,
      sea: `<circle cx="340" cy="44" r="24" fill="#ffeb3b"/><rect y="150" width="400" height="60" fill="#29b6f6"/><path d="M0 150 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#fff" stroke-width="3" fill="none"/>`,
      room: `<rect y="0" width="400" height="200" fill="#fff3e0"/><rect x="0" y="196" width="400" height="6" fill="#8d6e63"/><g stroke="#ffe0b2" stroke-width="2">${[40, 80, 120, 160].map((y) => `<line x1="0" y1="${y}" x2="400" y2="${y}"/>`).join('')}</g>`,
      school: `<rect x="220" y="40" width="170" height="120" fill="#ffccbc" stroke="#bf8f7a" stroke-width="3"/><path d="M210 44 L305 0 L400 44Z" fill="#e57373"/>`,
      station: `<rect y="120" width="400" height="20" fill="#616161"/><rect y="140" width="400" height="10" fill="#ffeb3b"/><g stroke="#424242" stroke-width="4">${[20, 120, 220, 320].map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="120"/>`).join('')}</g><rect y="0" width="400" height="16" fill="#546e7a"/>`,
      zoo: `<circle cx="352" cy="40" r="20" fill="#ffd54f"/><g stroke="#8d6e63" stroke-width="4">${[0, 40, 80, 120, 160, 200, 240, 280, 320, 360, 400].map((x) => `<line x1="${x}" y1="190" x2="${x}" y2="230"/>`).join('')}<line x1="0" y1="200" x2="400" y2="200"/></g>`,
      festival: `<g fill="#fff59d">${[30, 90, 150, 210, 270, 330, 380].map((x, i) => `<circle cx="${x}" cy="${30 + (i % 2) * 14}" r="2"/>`).join('')}</g><path d="M0 70 Q200 110 400 70" stroke="#ffcc80" stroke-width="2" fill="none"/><g fill="#ff7043">${[40, 100, 160, 220, 280, 340].map((x) => `<ellipse cx="${x}" cy="${88 - Math.abs(200 - x) / 12}" rx="8" ry="11"/>`).join('')}</g>`,
      farm: `<circle cx="340" cy="40" r="24" fill="#ffb300"/><g stroke="#6d4c41" stroke-width="3" opacity=".5">${[220, 240, 260, 280].map((y) => `<line x1="0" y1="${y}" x2="400" y2="${y}"/>`).join('')}</g>`,
      snow: `<g fill="#fff" opacity=".85">${Array.from({ length: 24 }, (_, i) => `<circle cx="${(i * 67) % 400}" cy="${(i * 37) % 180}" r="${2 + (i % 3)}"/>`).join('')}</g><path d="M0 200 L120 90 L220 200Z M160 200 L290 70 L400 200Z" fill="#cfd8dc"/><path d="M95 112 L120 90 L145 112Z M265 92 L290 70 L315 92Z" fill="#fff"/>`,
    }[st.deco] || '';
    return `<svg class="scene-bg" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="sky-${st.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#sky-${st.id})"/>
      <path d="M0 210 Q100 190 200 205 T400 200 V300 H0Z" fill="${g1}"/>
      <path d="M0 240 Q120 225 230 238 T400 236 V300 H0Z" fill="${g2}"/>
      ${deco}</svg>`;
  }

  /* ---------------------------- シーン ---------------------------- */
  function buildScene(onTap) {
    const scene = $('scene');
    scene.className = 'scene stage-' + G.stage.id + (G.mode.id === 'night' || G.stage.night ? ' night' : '') + (G.mode.id === 'night' ? ' dark' : '');
    scene.innerHTML = bgSVG(G.stage);
    scene.onpointerdown = null;
    scene.style.removeProperty('--lx');
    G.spots.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'spot' + (s.k ? ' spot-' + s.k : ' spot-emoji');
      b.style.left = s.x + '%';
      b.style.top = s.y + '%';
      b.style.width = s.s + '%';
      b.style.setProperty('--s', s.s);
      b.setAttribute('aria-label', s.n);
      b.dataset.i = i;
      b.innerHTML = (s.k ? ART[s.k] : `<span class="emo" aria-hidden="true">${s.e}</span>`) + '<span class="mark"></span>';
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onTap && onTap(i, b);
      });
      scene.appendChild(b);
    });
    if (G.mode.id === 'night') {
      const d = document.createElement('div');
      d.className = 'dark-overlay';
      scene.appendChild(d);
    }
  }
  const spotEl = (i) => $('scene').querySelector(`.spot[data-i="${i}"]`);
  function shake(el) {
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }
  const center = (s) => ({ x: s.x + s.s / 2, y: s.y + s.s / 3 });
  const dist = (a, b) => {
    const p = center(a);
    const q = center(b);
    return Math.hypot(p.x - q.x, p.y - q.y);
  };
  function setBar(buttons) {
    const bar = $('gameBar');
    bar.innerHTML = '';
    buttons.forEach(([label, fn, cls]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (cls || 'btn-sub');
      b.textContent = label;
      b.addEventListener('click', fn);
      bar.appendChild(b);
    });
  }
  function status(text) {
    $('gameStatus').textContent = text || '';
  }
  function markSpot(i, html) {
    const el = spotEl(i);
    if (el) el.querySelector('.mark').innerHTML = html;
    return el;
  }

  /* ---------------------------- がめんの きりかえ ---------------------------- */
  function view(which) {
    $('hideMenu').hidden = which !== 'menu';
    $('hidePlay').hidden = which !== 'play';
    $('hideBook').hidden = which !== 'book';
  }

  /* ---------------------------- メニュー ---------------------------- */
  let sel = null;
  function menu(note) {
    clearTimers();
    X.stopSpeak();
    G = null;
    const h = hg();
    sel = Object.assign({}, h.last);
    X.show('gameScreen');
    view('menu');
    renderMenu();
    const t = note || pick(Math.random() < 0.4 ? H.lines.loveHide : H.lines.menu);
    $('menuMsg').textContent = X.fill(t);
    X.speak(X.fill(t));
  }

  function renderMenu() {
    const h = hg();
    const lv = levelOf(h.xp);
    const next = H.levels[lv + 1];
    const cur = H.levels[lv];
    const pct = next ? Math.round(((h.xp - cur.xp) / (next.xp - cur.xp)) * 100) : 100;
    $('menuLevel').innerHTML = `<b>Lv.${lv + 1} ${cur.name}</b><span class="xpbar"><span style="width:${pct}%"></span></span><small>${next ? `つぎまで ${next.xp - h.xp}` : 'さいこう レベル！'}・🏅 ${Object.keys(h.badges).length}/${H.badges.length}</small>`;
    const grid = (id, list, key, extra) => {
      const box = $(id);
      box.innerHTML = '';
      list.forEach((it) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pickbtn' + (sel[key] === it.id ? ' on' : '');
        b.innerHTML = `<span class="pe">${it.emoji}</span><span class="pn">${it.name}</span>${extra ? extra(it) : ''}`;
        b.addEventListener('click', () => {
          sel[key] = it.id;
          X.Snd.pop();
          renderMenu();
          if (key === 'mode') {
            const m = H.modes.find((x) => x.id === it.id);
            $('menuMsg').textContent = m.desc;
          }
        });
        box.appendChild(b);
      });
    };
    grid('pickStage', H.stages, 'stage', (st) => (h.stages[st.id] ? '<span class="pc">⭐</span>' : ''));
    grid('pickMode', H.modes, 'mode', (m) => (h.modes[m.id] ? '<span class="pc">✔</span>' : ''));
    grid('pickDiff', H.difficulties, 'diff');
  }

  function menuButtons() {
    $('menuStart').addEventListener('click', () => start(sel.mode, sel.stage, sel.diff));
    $('menuRandom').addEventListener('click', () => start(pick(H.modes).id, pick(H.stages).id, sel.diff));
    $('menuBook').addEventListener('click', book);
    $('menuBack').addEventListener('click', () => X.onExit({ quit: true, fromMenu: true }));
    $('bookBack').addEventListener('click', () => {
      view('menu');
      renderMenu();
    });
  }

  /* ---------------------------- ずかん ---------------------------- */
  function book() {
    X.stopSpeak();
    view('book');
    const h = hg();
    const box = $('bookGrid');
    box.innerHTML = '';
    H.badges.forEach((b) => {
      const got = h.badges[b.id];
      const d = document.createElement('div');
      d.className = 'badge' + (got ? ' got' : '');
      d.innerHTML = `<span class="be">${got ? b.e : '❔'}</span><span class="bn">${got ? b.n : '？？？'}</span><span class="bd">${b.d}</span>`;
      box.appendChild(d);
    });
    const n = Object.keys(h.badges).length;
    const st = Object.keys(h.stages).length;
    $('bookSum').textContent = `バッジ ${n}/${H.badges.length}・ばしょ ${st}/10・みつけた かず ${h.finds}・かくれて かった かず ${h.hideWins}・タイムアタック さいこう ${h.timeBest}かい`;
    X.speak(X.fill(n ? `%Nの バッジは ${n}こ！ すごいね` : 'まだ バッジが ないよ。かくれんぼで あつめよう'));
  }

  /* ---------------------------- きろく・バッジ ---------------------------- */
  const queue = []; // バッジ・レベルアップの おしらせ
  function award(id) {
    const h = hg();
    if (h.badges[id]) return;
    const b = H.badges.find((x) => x.id === id);
    if (!b) return;
    h.badges[id] = Date.now();
    queue.push(line('badge', { '%B': b.e + ' ' + b.n }));
    toast(`${b.e} ${b.n}`);
  }
  function addXp(n) {
    const h = hg();
    const before = levelOf(h.xp);
    h.xp += n;
    const after = levelOf(h.xp);
    if (after > before) {
      queue.push(line('levelUp', { '%L': H.levels[after].name }));
      toast('⬆️ ' + H.levels[after].name);
      if (after >= 5) award('level5');
      if (after >= H.levels.length - 1) award('level10');
    }
  }
  function toast(text) {
    const t = document.createElement('div');
    t.className = 'hg-toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  // みつけた とき・かった ときの きろく
  function recordWin(kind, extra) {
    const h = hg();
    const o = extra || {};
    h.stages[G.stage.id] = (h.stages[G.stage.id] || 0) + 1;
    h.modes[G.mode.id] = (h.modes[G.mode.id] || 0) + 1;
    if (kind === 'find') {
      h.finds++;
      award('first');
      if (o.tries === 1) award('ippatsu');
      if (h.finds >= 10) award('win10');
      if (h.finds >= 30) award('win30');
      if (h.finds >= 60) award('win60');
      if (h.finds >= 100) award('win100');
      if (G.diff.id === 'hard') {
        award('hard');
        if (!G.hintUsed) award('nohint');
      }
    }
    if (kind === 'hide') {
      h.hideWins++;
      award('hider');
      if (h.hideWins >= 3) award('hider3');
    }
    award('st_' + G.stage.id);
    if (H.stages.every((s) => h.stages[s.id])) award('allStages');
    if (H.modes.every((m) => h.modes[m.id])) award('allModes');
    const modeBadge = { friends: 'friends', nukegara: 'nukegara', sound: 'sound', moving: 'moving', night: 'night', mimic: 'mimic' }[G.mode.id];
    if (modeBadge) award(modeBadge);
    const day = new Date().toDateString();
    if (h.days.indexOf(day) < 0) h.days.push(day);
    if (h.days.length > 10) h.days.shift();
    if (h.days.length >= 3) award('daily');
    addXp(o.xp || 1);
    X.persist();
  }
  // おしらせを じゅんばんに よむ
  function sayAll(first, done) {
    const list = [first].concat(queue.splice(0));
    const next = () => {
      const t = list.shift();
      if (!t) return done && done();
      msg(t, () => later(250, next));
    };
    next();
  }

  /* ---------------------------- はじめる ---------------------------- */
  function start(modeId, stageId, diffId) {
    clearTimers();
    X.stopSpeak();
    const h = hg();
    const mode = H.modes.find((m) => m.id === modeId) || H.modes[0];
    const stage = H.stages.find((s) => s.id === stageId) || pick(H.stages);
    const diff = H.difficulties.find((d) => d.id === diffId) || H.difficulties[1];
    h.last = { mode: mode.id, stage: stage.id, diff: diff.id };
    X.persist();
    // むずかしさで かくれ ばしょの かずを へらす(ばしょは ばらけるように えらぶ)
    let spots = stage.spots.slice();
    if (spots.length > diff.spots) spots = shuffle(spots).slice(0, diff.spots);
    G = { mode, stage, diff, spots, done: false, busy: false, tries: 0, hintUsed: 0, checked: {}, match: null };
    X.show('gameScreen');
    view('play');
    $('gameTitle').textContent = `${stage.emoji} ${stage.name} ・ ${mode.emoji} ${mode.name}`;
    status('');
    const run = {
      seek: startSeek,
      hide: startHide,
      friends: startFriends,
      time: startTime,
      nukegara: startNukegara,
      sound: startSound,
      moving: startMoving,
      night: startNight,
      mimic: startMimic,
      match: startMatch,
    }[mode.id];
    run();
  }
  const quitBtn = ['やめる', () => exit(false)];
  const againBtns = () => [
    ['もう いっかい', () => start(G.mode.id, G.stage.id, G.diff.id), 'btn-main'],
    ['ばしょを かえる', () => start(G.mode.id, nextStage(), G.diff.id)],
    ['メニュー', () => menu()],
    ['おしゃべりに もどる', () => exit(true)],
  ];
  const nextStage = () => {
    const i = H.stages.indexOf(G.stage);
    return H.stages[(i + 1) % H.stages.length].id;
  };
  function exit(done) {
    clearTimers();
    const info = { done: G ? G.done || done : false, mode: G && G.mode.id };
    G = null;
    X.onExit(info);
  }

  // つくぼうが かくれる(10 かぞえる えんしゅつ つき)
  function countThen(fn) {
    G.busy = true;
    $('scene').classList.add('counting');
    setBar([quitBtn]);
    msg(joinT(pick(G.stage.enter), line('counting')), () => {
      if (!G) return;
      $('scene').classList.remove('counting');
      G.busy = false;
      X.Snd.song(true);
      fn();
    });
  }
  const hotCold = (i, target) => (dist(G.spots[i], target) < 30 ? 'near' : 'far');

  // ヒント(5しゅるいを じゅんばんに)
  function hint(targetIdx) {
    if (!G || G.done) return;
    if (G.hintUsed >= G.diff.hint) {
      msg('もう ヒントは おしまい！ じぶんで さがしてね〜');
      return;
    }
    G.hintUsed++;
    const t = G.spots[targetIdx];
    const kind = (G.hintUsed - 1) % 4;
    const el = spotEl(targetIdx);
    if (kind === 0) {
      X.Snd.song(true);
      shake(el);
      el && el.classList.add('hint');
      later(1800, () => el && el.classList.remove('hint'));
      msg(H.lines.hintSay[0]);
    } else if (kind === 1) {
      const c = center(t);
      const pos = (c.y < 40 ? 'うえの ほう' : c.y > 65 ? 'したの ほう' : 'まんなかの たかさ') + '、' + (c.x < 35 ? 'ひだりがわ' : c.x > 65 ? 'みぎがわ' : 'まんなか');
      msg(H.lines.hintSay[1].replace('%P', pos));
    } else if (kind === 2) {
      const near = G.spots.filter((s) => s !== t).sort((a, b) => dist(a, t) - dist(b, t))[0];
      msg(H.lines.hintSay[2].replace('%A', near ? near.n : 'なにか'));
    } else {
      const cands = shuffle(G.spots.map((_, i) => i).filter((i) => i !== targetIdx && !G.checked[i])).slice(0, 2).concat([targetIdx]);
      cands.forEach((i) => {
        const e = spotEl(i);
        e && e.classList.add('hint');
        later(2500, () => e && e.classList.remove('hint'));
      });
      msg(H.lines.hintSay[3]);
    }
  }

  /* ---------- 1. つくぼうを さがす ---------- */
  function startSeek(onFound, afterReady) {
    G.target = Math.floor(Math.random() * G.spots.length);
    G.tries = 0;
    G.checked = {};
    G.onFound = onFound || null;
    buildScene(seekTap);
    countThen(() => {
      setBar([['💡 ヒント', () => hint(G.target)], quitBtn]);
      if (afterReady) afterReady();
      else msg(line('ready', { '%S': pick(G.spots).n }));
    });
  }
  function seekTap(i, el) {
    if (!G || G.done || G.busy) return;
    if (G.checked[i]) return msg(line('checkedAgain'));
    G.tries++;
    X.Snd.rustle();
    shake(el);
    if (i === G.target) return seekFound(i, el);
    G.checked[i] = 1;
    el.classList.add('checked');
    X.Snd.miss();
    if (G.mode.id === 'sound') {
      el.querySelector('.mark').textContent = '✖';
      soundCue(i);
      return;
    }
    if (G.goal && G.tries >= G.goal && G.onLimit) {
      const f = G.onLimit;
      G.onLimit = null;
      G.goal = 0;
      return f();
    }
    const hc = hotCold(i, G.spots[G.target]);
    el.querySelector('.mark').textContent = hc === 'near' ? '🔥' : '❄️';
    if (G.mode.id === 'moving' && G.tries % 2 === 0 && (G.moves || 0) < 4 && Math.random() < 0.7) return moveAway();
    msg(line(hc === 'near' ? 'missNear' : 'missFar'));
    if (G.tries === 5 && !G.hintUsed) later(2600, () => G && !G.done && msg(line('hintAsk')));
  }
  function seekFound(i, el) {
    G.done = true;
    el.classList.add('found');
    markSpot(i, semiSVG());
    X.Snd.found();
    if (G.onFound) return G.onFound(true);
    const h = hg();
    const best = G.mode.id === 'seek' && (!X.save.best || G.tries < X.save.best);
    if (best) X.save.best = G.tries;
    recordWin('find', { tries: G.tries, xp: G.tries <= 2 ? 3 : 2 });
    const key = G.tries <= 2 ? 'foundFast' : G.tries <= 6 ? 'foundNormal' : 'foundSlow';
    let t = line(key, { '%T': String(G.tries), '%S': G.spots[i].n });
    if (best && h.finds > 1) t = joinT(t, line('record'));
    sayAll(t);
    setBar(againBtns());
  }

  /* ---------- 2. ぼくが かくれる ---------- */
  function startHide(onEnd) {
    G.target = -1;
    G.onEnd = onEnd || null;
    buildScene(hideTap);
    setBar([quitBtn]);
    msg(line('hideStart'));
  }
  function hideTap(i, el) {
    if (!G || G.busy || G.target >= 0) return;
    G.target = i;
    G.busy = true;
    X.Snd.pop();
    el.classList.add('kid');
    el.querySelector('.mark').textContent = '🧒';
    setBar([]);
    const p = { easy: 0.35, normal: 0.5, hard: 0.65 }[G.diff.id];
    const others = shuffle(G.spots.map((_, k) => k).filter((k) => k !== i));
    const willFind = Math.random() < p;
    const n = 2 + Math.floor(Math.random() * 3);
    const plan = willFind ? others.slice(0, Math.floor(Math.random() * n)).concat([i]) : others.slice(0, n);
    msg(line('hideCount'), () => searchStep(plan, 0));
  }
  function searchStep(plan, k) {
    if (!G) return;
    if (k >= plan.length) {
      G.done = true;
      spotEl(G.target).classList.add('found');
      X.Snd.win();
      if (G.onEnd) return G.onEnd(false);
      recordWin('hide', { xp: 3 });
      sayAll(line('tsukuLost', { '%S': G.spots[G.target].n }));
      setBar(againBtns());
      return;
    }
    const i = plan[k];
    const el = spotEl(i);
    moveFinder(el);
    X.Snd.rustle();
    shake(el);
    later(900, () => {
      if (i === G.target) {
        G.done = true;
        X.save.tsukuWins = (X.save.tsukuWins || 0) + 1;
        X.persist();
        el.classList.add('found');
        X.Snd.found();
        if (G.onEnd) return G.onEnd(true);
        msg(line('tsukuFound', { '%S': G.spots[i].n }));
        setBar([['リベンジ！', () => start('hide', G.stage.id, G.diff.id), 'btn-main']].concat(againBtns().slice(1)));
        return;
      }
      el.classList.add('checked');
      msg(line('searching', { '%S': G.spots[i].n }), () => later(300, () => searchStep(plan, k + 1)));
    });
  }
  function moveFinder(target) {
    let f = $('scene').querySelector('.finder');
    if (!f) {
      f = document.createElement('div');
      f.className = 'finder';
      f.innerHTML = semiSVG();
      $('scene').appendChild(f);
    }
    f.style.left = parseFloat(target.style.left) + parseFloat(target.style.width) / 2 + '%';
    f.style.top = target.style.top;
  }

  /* ---------- 3. なかま さがし ---------- */
  function startFriends() {
    const n = { easy: 3, normal: 4, hard: 5 }[G.diff.id];
    const idx = shuffle(G.spots.map((_, i) => i)).slice(0, n);
    G.friends = idx.map((spot, k) => ({ spot, f: H.friends[k], found: false }));
    G.checked = {};
    buildScene(friendTap);
    countThen(() => {
      msg(line('friendsStart', { '%C': String(n) }));
      status(`みつけた 0 / ${n}`);
      setBar([['💡 ヒント', () => {
        const left = G.friends.find((x) => !x.found);
        left && hint(left.spot);
      }], quitBtn]);
    });
  }
  function friendTap(i, el) {
    if (!G || G.done || G.busy) return;
    if (G.checked[i]) return msg(line('checkedAgain'));
    G.checked[i] = 1;
    G.tries++;
    X.Snd.rustle();
    shake(el);
    const fr = G.friends.find((x) => x.spot === i);
    if (fr) {
      fr.found = true;
      el.classList.add('found');
      markSpot(i, semiSVG(fr.f.color));
      X.Snd.semi(fr.f.song);
      const got = G.friends.filter((x) => x.found).length;
      status(`みつけた ${got} / ${G.friends.length}`);
      if (got === G.friends.length) {
        G.done = true;
        X.Snd.win();
        recordWin('find', { tries: G.tries, xp: 2 + got });
        award('friends');
        if (got >= 5) award('friends5');
        sayAll(`${fr.f.name}「${fr.f.say}」…` + line('friendsAll'));
        setBar(againBtns());
      } else {
        msg(`${fr.f.name}「${fr.f.say}」 あと ${G.friends.length - got}ひき！`);
      }
      return;
    }
    el.classList.add('checked');
    X.Snd.miss();
    const left = G.friends.filter((x) => !x.found);
    const near = left.some((x) => dist(G.spots[i], G.spots[x.spot]) < 30);
    el.querySelector('.mark').textContent = near ? '🔥' : '❄️';
    msg(line(near ? 'missNear' : 'missFar'));
  }

  /* ---------- 4. タイムアタック ---------- */
  function startTime() {
    G.count = 0;
    G.left = { easy: 90, normal: 60, hard: 45 }[G.diff.id];
    buildScene(timeTap);
    G.target = Math.floor(Math.random() * G.spots.length);
    G.checked = {};
    setBar([quitBtn]);
    msg(line('timeStart'), () => {
      if (!G) return;
      tick();
    });
    status(`のこり ${G.left}びょう ・ 0かい`);
  }
  function tick() {
    if (!G || G.done) return;
    status(`のこり ${G.left}びょう ・ ${G.count}かい`);
    if (G.left <= 0) return timeEnd();
    if (G.left <= 5) X.Snd.tick();
    G.left--;
    later(1000, tick);
  }
  function timeTap(i, el) {
    if (!G || G.done || G.left === undefined) return;
    X.Snd.rustle();
    shake(el);
    if (i === G.target) {
      G.count++;
      X.Snd.found();
      markSpot(i, semiSVG());
      el.classList.add('found');
      status(`のこり ${G.left}びょう ・ ${G.count}かい`);
      X.speak(X.fill(line('timeFound', { '%C': String(G.count) })));
      later(500, () => {
        if (!G || G.done) return;
        el.classList.remove('found');
        markSpot(i, '');
        G.spots.forEach((_, k) => {
          const e = spotEl(k);
          e.classList.remove('checked');
          e.querySelector('.mark').textContent = '';
        });
        let t = G.target;
        while (t === G.target) t = Math.floor(Math.random() * G.spots.length);
        G.target = t;
        X.Snd.song(true);
      });
      return;
    }
    X.Snd.miss();
    el.classList.add('checked');
    el.querySelector('.mark').textContent = hotCold(i, G.spots[G.target]) === 'near' ? '🔥' : '❄️';
  }
  function timeEnd() {
    G.done = true;
    X.Snd.win();
    const h = hg();
    const best = G.count > h.timeBest;
    if (best) h.timeBest = G.count;
    if (G.count > 0) recordWin('find', { xp: Math.min(6, 1 + G.count) });
    if (G.count >= 5) award('time5');
    if (G.count >= 10) award('time10');
    X.persist();
    status(`けっか ${G.count}かい ・ さいこう ${h.timeBest}かい`);
    const te = line('timeEnd', { '%C': String(G.count) });
    sayAll(best && G.count ? joinT(te, line('record')) : te);
    setBar(againBtns());
  }

  /* ---------- 5. ぬけがら あつめ ---------- */
  function startNukegara() {
    const n = { easy: 3, normal: 4, hard: 6 }[G.diff.id];
    const idx = shuffle(G.spots.map((_, i) => i));
    G.shells = idx.slice(0, n);
    G.target = idx[n];
    G.got = 0;
    G.tsukuFound = false;
    G.checked = {};
    buildScene(shellTap);
    countThen(() => {
      msg(line('nukegaraStart', { '%C': String(n) }));
      status(`ぬけがら 0 / ${n} ・ つくぼう ？`);
      setBar([['💡 ヒント', () => {
        const left = G.shells.find((s) => !G.checked[s]);
        hint(left !== undefined ? left : G.target);
      }], quitBtn]);
    });
  }
  function shellTap(i, el) {
    if (!G || G.done || G.busy) return;
    if (G.checked[i]) return msg(line('checkedAgain'));
    G.checked[i] = 1;
    G.tries++;
    X.Snd.rustle();
    shake(el);
    const n = G.shells.length;
    if (G.shells.indexOf(i) >= 0) {
      G.got++;
      markSpot(i, shellSVG());
      el.classList.add('found');
      X.Snd.sparkle();
      msg(line('nukegaraGot', { '%C': String(n - G.got) }));
    } else if (i === G.target) {
      G.tsukuFound = true;
      markSpot(i, semiSVG());
      el.classList.add('found');
      X.Snd.found();
      msg('あっ、ぼくも みつかっちゃった！ ぬけがらも ぜんぶ さがしてね');
    } else {
      el.classList.add('checked');
      X.Snd.miss();
      el.querySelector('.mark').textContent = '✖';
      msg(line('missFar'));
    }
    status(`ぬけがら ${G.got} / ${n} ・ つくぼう ${G.tsukuFound ? '✔' : '？'}`);
    if (G.got === n && G.tsukuFound) {
      G.done = true;
      X.Snd.win();
      recordWin('find', { tries: G.tries, xp: 3 + n });
      sayAll(line('nukegaraAll'));
      setBar(againBtns());
    }
  }

  /* ---------- 6. おとで さがす ---------- */
  function startSound() {
    G.lastTap = null;
    startSeek(null, () => {
      msg(line('soundStart'), () => soundCue(null));
      setBar([['👂 きく', () => soundCue(G.lastTap)], ['💡 ヒント', () => hint(G.target)], quitBtn]);
    });
  }
  // なきごえの おおきさ = ちかさ、ひだり・みぎ = むき
  function soundCue(from) {
    if (!G || G.done) return;
    if (from !== undefined && from !== null) G.lastTap = from;
    const t = G.spots[G.target];
    const c = center(t);
    const base = G.lastTap !== null && G.lastTap !== undefined ? G.spots[G.lastTap] : { x: 45, y: 45, s: 10 };
    const d = dist(base, t);
    const vol = Math.max(0.15, 1 - d / 90);
    X.Snd.chirp((c.x - 50) / 50, vol);
    msg(pick(d < 30 ? H.lines.soundNear : H.lines.soundFar));
  }

  /* ---------- 7. にげる つくぼう ---------- */
  function startMoving() {
    G.moves = 0;
    startSeek();
  }
  function moveAway() {
    const old = G.target;
    const cands = G.spots.map((_, k) => k).filter((k) => k !== old && !G.checked[k]).sort((a, b) => dist(G.spots[a], G.spots[old]) - dist(G.spots[b], G.spots[old]));
    if (!cands.length) return;
    G.target = cands[Math.floor(Math.random() * Math.min(3, cands.length))];
    G.moves++;
    const e = spotEl(old);
    // あしあとを のこす
    const fp = document.createElement('span');
    fp.className = 'footprint';
    fp.textContent = '🐾';
    e.appendChild(fp);
    X.Snd.step();
    msg(line('moveRun'));
  }

  /* ---------- 8. よるの かくれんぼ ---------- */
  function startNight() {
    G.lightTimer = null;
    startSeek(null, () => msg(line('nightStart')));
    // タップした ところの まわりを ライトで てらす
    $('scene').onpointerdown = lightAt;
  }
  function lightAt(ev) {
    if (!G || G.mode.id !== 'night') return;
    const sc = $('scene');
    const r = sc.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * 100;
    const y = ((ev.clientY - r.top) / r.height) * 100;
    sc.style.setProperty('--lx', x + '%');
    sc.style.setProperty('--ly', y + '%');
    sc.classList.add('lit');
    clearTimeout(G.lightTimer);
    G.lightTimer = setTimeout(() => sc.classList.remove('lit'), 1600);
    // 2かい はずすたびに ほたるが ヒント
    if (G.tries && G.tries % 2 === 0 && !G.done) {
      const e = spotEl(G.target);
      if (e && !e.querySelector('.firefly')) {
        const f = document.createElement('span');
        f.className = 'firefly';
        f.textContent = '✨';
        e.appendChild(f);
        msg(pick(H.lines.nightGlint));
        later(2200, () => f.remove());
      }
    }
  }

  /* ---------- 9. じっくり さがし ---------- */
  function startMimic() {
    buildScene(null);
    const sc = $('scene');
    sc.classList.add('mimic');
    G.tries = 0;
    const sz = { easy: 8, normal: 6, hard: 4.5 }[G.diff.id];
    G.mx = 6 + Math.random() * 84;
    G.my = 10 + Math.random() * 78;
    const m = document.createElement('div');
    m.className = 'mimic-semi';
    m.style.left = G.mx + '%';
    m.style.top = G.my + '%';
    m.style.width = sz + '%';
    m.innerHTML = semiSVG(pick(['#4a8f52', '#6a8f4a', '#3f7a52', '#7a8f4a']));
    sc.appendChild(m);
    G.mr = Math.max(5, sz);
    countThen(() => {
      msg(line('mimicStart'));
      setBar([['💡 ヒント', mimicHint], quitBtn]);
    });
    sc.onpointerdown = mimicTap;
  }
  function mimicTap(ev) {
    if (!G || G.mode.id !== 'mimic' || G.done || G.busy) return;
    const sc = $('scene');
    const r = sc.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * 100;
    const y = ((ev.clientY - r.top) / r.height) * 100;
    G.tries++;
    const cx = G.mx + G.mr / 2;
    const cy = G.my + (G.mr * r.width) / r.height / 2;
    const d = Math.hypot(x - cx, ((y - cy) * r.height) / r.width);
    const rip = document.createElement('span');
    rip.className = 'ripple';
    rip.style.left = x + '%';
    rip.style.top = y + '%';
    sc.appendChild(rip);
    setTimeout(() => rip.remove(), 700);
    if (d <= G.mr * 0.9) {
      G.done = true;
      sc.querySelector('.mimic-semi').classList.add('reveal');
      X.Snd.found();
      recordWin('find', { tries: G.tries, xp: G.tries <= 3 ? 4 : 2 });
      sayAll(line(G.tries <= 2 ? 'foundFast' : 'foundNormal', { '%T': String(G.tries), '%S': 'けしきの なか' }));
      setBar(againBtns());
      return;
    }
    X.Snd.miss();
    msg(d < 18 ? line('missNear') : pick(H.lines.mimicMiss));
  }
  function mimicHint() {
    if (!G || G.done) return;
    if (G.hintUsed >= G.diff.hint) return msg('もう ヒントは おしまい！');
    G.hintUsed++;
    const sc = $('scene');
    const c = document.createElement('span');
    c.className = 'hint-ring';
    const rr = Math.max(10, 26 - G.hintUsed * 6);
    c.style.left = G.mx + G.mr / 2 + (Math.random() - 0.5) * rr * 0.6 + '%';
    c.style.top = G.my + (Math.random() - 0.5) * rr * 0.6 + '%';
    c.style.width = rr * 2 + '%';
    sc.appendChild(c);
    later(2500, () => c.remove());
    msg('この わの なかの どこか だよ〜');
  }

  /* ---------- 10. かくれんぼ たいかい ---------- */
  function startMatch() {
    G.match = { round: 1, kid: 0, tsuku: 0 };
    setBar([quitBtn]);
    msg(line('matchStart'), () => matchRound());
  }
  function matchRound() {
    if (!G) return;
    const m = G.match;
    status(`だい${m.round}かいせん ・ ${X.fill('%N')} ${m.kid} − ${m.tsuku} つくぼう`);
    const seekTurn = m.round % 2 === 1;
    const goal = { easy: 6, normal: 4, hard: 3 }[G.diff.id];
    G.done = false;
    G.busy = false;
    G.checked = {};
    const end = (kidWon) => {
      G.goal = 0;
      G.onLimit = null;
      if (kidWon) m.kid++;
      else m.tsuku++;
      status(`だい${m.round}かいせん ・ ${X.fill('%N')} ${m.kid} − ${m.tsuku} つくぼう`);
      const res = kidWon ? `${X.fill('%N')}の かち！` : 'つくぼうの かち！';
      if (m.kid >= 2 || m.tsuku >= 2) {
        G.done = true;
        X.Snd.win();
        if (m.kid >= 2) {
          recordWin('find', { xp: 6 });
          award('champ');
        }
        sayAll(res + ' ' + line(m.kid >= 2 ? 'matchWin' : 'matchLose'));
        setBar(againBtns());
        return;
      }
      m.round++;
      setBar([quitBtn]);
      msg(res + ' ' + line('matchRound', { '%C': String(m.round) }), () => later(400, matchRound));
    };
    if (seekTurn) {
      G.goal = goal;
      G.onLimit = () => {
        // かいすうを つかいきったら つくぼうの かち
        G.done = true;
        spotEl(G.target).classList.add('found');
        markSpot(G.target, semiSVG());
        end(false);
      };
      msg(line('matchRound', { '%C': String(m.round) }) + `… ${goal}かい いないに みつけたら かち！`, () =>
        startSeek(() => end(true))
      );
    } else {
      msg('つぎは ' + X.fill('%N') + 'が かくれる ばん！', () => startHide((tsukuWon) => end(!tsukuWon)));
    }
  }

  /* ---------------------------- そと から ---------------------------- */
  function init(ctx) {
    X = ctx;
    hg();
    menuButtons();
  }

  return {
    init,
    menu,
    start,
    stop() {
      clearTimers();
      G = null;
    },
    get playing() {
      return !!G;
    },
    data: H,
  };
})();
