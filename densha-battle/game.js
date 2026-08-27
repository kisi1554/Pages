'use strict';

/*
 * でんしゃバトル 本体(リアルタイム ウェーブ制)
 *
 *  タイトル → ジャンルえらび → レベルえらび → 勇者えらび → バトル(10ウェーブ) → けっか
 *
 *  もんだいは 3ジャンル(さんすう / えきめいの かんじ / にほんちず)。
 *  たたかうのは 人間の 勇者たち、あいては 野菜モンスター。
 *
 *  バトルの ながれ:
 *    - 野菜モンスターが 右から おしよせる。ターンは まわってこない。
 *    - さんすうに せいかいすると、その ばで すぐ たまが とんで 前の モンスターに ヒット。
 *      つぎの もんだいは すぐ でるので、はやく こたえるほど どんどん こうげきできる。
 *    - モンスターは それぞれ「ためゲージ」を もっていて、たまると かってに こうげきしてくる。
 *    - まちがえると すこし ダメージ + 0.6びょう うごけない。
 *    - れんぞく せいかいで ひっさつゲージが たまり、MAXで 全体こうげき。
 *      8れんぞくで「ハイパーモード」(ダメージ 1.3ばい・BGMも はやくなる)。
 *    - ウェーブ 3/5/7/9 は でかい「やさい四天王」、10は「大魔王 ベジタゴン」。
 *      ボスは HPが はんぶんを きると だい2けいたいに なり、曲も かわる。
 *    - BGMは ウェーブごとに じゅんばんに きりかわる。
 */

(function main() {
  /* ------------------------------ DOM ------------------------------ */

  const el = {};
  ['screen-title', 'screen-genre', 'screen-level', 'screen-select', 'screen-battle', 'screen-result',
    'btn-start', 'genre-list', 'level-list', 'level-sub', 'char-list', 'select-sub',
    'wave-chip', 'score-num', 'btn-bgm', 'btn-voice', 'btn-home',
    'arena', 'field', 'player-slot', 'mon-row',
    'boss-plate', 'bp-title', 'bp-name', 'bp-fill', 'bp-phase',
    'player-name', 'player-tag', 'player-line', 'player-hp', 'player-hp-fill', 'player-hp-num',
    'gauge-fill', 'combo-chip', 'timer-fill',
    'question', 'hint', 'choices', 'verdict',
    'result-title', 'result-train', 'result-msg', 'result-stats', 'btn-again',
    'fx-canvas', 'fx-layer'].forEach((id) => {
    el[id] = document.getElementById(id);
  });

  /*
   * がめんの ゆれは アリーナ(せんじょう)だけに かける。
   * したの こたえボタンが ゆれると おしにくいので、パネルは うごかさない。
   */
  Fx.init(el['fx-canvas'], el['arena'], el['fx-layer']);

  /* ------------------------------ ていすう ------------------------------ */

  const PLAYER_MAX_HP = 140;
  const HEAL_PER_WAVE = 25;
  const GAUGE_MAX = 5;
  const HYPER_COMBO = 8;      // これだけ れんぞくすると ハイパーモード
  const HYPER_BOOST = 1.3;
  const SHOT_MS = 160;        // たまが とどくまでの じかん
  const MISS_LOCK_MS = 750;   // まちがえた ときに うごけない じかん(こたえを よむ じかん)
  const WAVE_GAP_MS = 1300;   // ウェーブの あいだ
  const CUTIN_MS = 1900;      // ボス とうじょう カットインの ながさ

  /* ざこ波の BGM。ウェーブが すすむたびに つぎの 曲へ */
  const BATTLE_TRACKS = BGM_TRACKS.filter((t) => t.mood === 'battle').map((t) => t.name);

  /* ---------------------------- じょうたい ---------------------------- */

  const S = {
    genre: 'sansu',
    genreDef: GENRES[0],
    level: 'kantan',
    levelDef: GENRES[0].levels[0],
    player: null,
    playerTrain: null,

    wave: 0,
    monsters: [],
    boss: null,

    playerHp: PLAYER_MAX_HP,
    combo: 0,
    bestCombo: 0,
    gauge: 0,
    hyper: false,
    score: 0,
    kills: 0,

    question: null,
    askedAt: 0,
    inputLockUntil: 0,

    running: false,
    rafId: 0,
    lastT: 0,
    quirkAt: 0,

    stats: { correct: 0, wrong: 0 },
    result: null,
    token: 0,
    timeouts: [],
    choiceBtns: [],
  };

  /* トークンが かわったら(ホームに もどった など)、よやくしてた しょりを すてる */
  function later(ms, fn) {
    const my = S.token;
    const id = setTimeout(() => {
      if (my !== S.token) return;
      fn();
    }, ms);
    S.timeouts.push(id);
    return id;
  }

  function cancelAll() {
    S.token += 1;
    S.timeouts.forEach(clearTimeout);
    S.timeouts = [];
    stopLoop();
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ------------------------------ がめん ------------------------------ */

  function showScreen(id) {
    ['screen-title', 'screen-genre', 'screen-level', 'screen-select', 'screen-battle', 'screen-result']
      .forEach((s) => el[s].classList.toggle('is-active', s === id));
  }

  /* --------------------------- でんしゃの みため --------------------------- */

  function heroHTML(h) {
    return '<div class="hero" data-face="normal"' +
      ' style="--c:' + h.color + ';--ink-c:' + h.ink + ';--hair:' + h.hair + ';--skin:' + h.skin + '">' +
      '<div class="hero-aura">' + (h.aura || '✨') + '</div>' +
      (h.hat ? '<div class="hero-hat">' + h.hat + '</div>' : '') +
      '<div class="hero-head">' +
      '<span class="eye eye-l"></span><span class="eye eye-r"></span>' +
      '<span class="mouth"></span>' +
      '</div>' +
      '<div class="hero-torso">' +
      '<span class="hero-stripe"></span>' +
      '<span class="hero-badge">' + h.symbol + '</span>' +
      '</div>' +
      '<div class="hero-weapon">' + h.weapon + '</div>' +
      '<div class="hero-legs"><i></i><i></i></div>' +
      '<div class="hero-line">' + h.line + '</div>' +
      '</div>';
  }

  function setFace(hero, face) {
    if (hero) hero.dataset.face = face;
  }

  /* アニメの クラスを つけて、おわったら はずす */
  function play(node, cls, ms) {
    if (!node) return;
    node.classList.remove(cls);
    void node.offsetWidth; /* リフローさせて アニメを さいせい しなおす */
    node.classList.add(cls);
    later(ms, () => node.classList.remove(cls));
  }

  function centerOf(node) {
    return Fx.centerOf(node);
  }

  /* ------------------------------ レベル ------------------------------ */

  function buildGenreList() {
    el['genre-list'].innerHTML = '';
    GENRES.forEach((gn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'genre-card';
      b.style.setProperty('--gc', gn.color);
      b.innerHTML =
        '<span class="g-emoji">' + gn.emoji + '</span>' +
        '<span><span class="g-name">' + gn.name + '</span>' +
        '<span class="g-sub">' + gn.sub + '</span></span>';
      b.addEventListener('click', () => {
        SoundEngine.seTap();
        S.genre = gn.id;
        S.genreDef = gn;
        el['level-sub'].textContent = gn.emoji + ' ' + gn.name + '(' + gn.sub + ')';
        buildLevelList();
        showScreen('screen-level');
      });
      el['genre-list'].appendChild(b);
    });
  }

  function buildLevelList() {
    el['level-list'].innerHTML = '';
    S.genreDef.levels.forEach((lv) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'level-card';
      b.style.setProperty('--lc', S.genreDef.color);
      b.innerHTML =
        '<span class="lv-emoji">' + S.genreDef.emoji + '</span>' +
        '<span><span class="lv-name">' + lv.name + '</span> ' +
        '<span class="lv-sub">' + lv.sub + '</span><br>' +
        '<span class="lv-detail">' + lv.detail + '</span></span>';
      b.addEventListener('click', () => {
        SoundEngine.seTap();
        S.level = lv.id;
        S.levelDef = lv;
        el['select-sub'].textContent =
          S.genreDef.name + ' / ' + lv.name + '(' + lv.sub + ')';
        showScreen('screen-select');
      });
      el['level-list'].appendChild(b);
    });
  }

  function buildCharList() {
    el['char-list'].innerHTML = '';
    HEROES.forEach((f) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'char-card';
      b.style.setProperty('--ink-c', f.ink);
      b.style.setProperty('--line-c', f.color);
      b.innerHTML =
        heroHTML(f) +
        '<span class="cc-line">' + f.line + '</span>' +
        '<span class="cc-name">' + f.name + '</span>' +
        '<span class="cc-cls">' + f.cls + '</span>' +
        '<span class="cc-tag">' + f.tag + '</span>';
      b.addEventListener('click', () => {
        SoundEngine.seTap();
        startGame(f);
      });
      el['char-list'].appendChild(b);
    });
  }

  /* ============================ ゲーム かいし ============================ */

  function startGame(fighter) {
    cancelAll();
    Fx.clear();
    S.player = fighter;
    S.wave = 0;
    S.playerHp = PLAYER_MAX_HP;
    S.combo = 0;
    S.bestCombo = 0;
    S.gauge = 0;
    S.hyper = false;
    S.score = 0;
    S.kills = 0;
    S.stats = { correct: 0, wrong: 0 };

    el['player-name'].textContent = fighter.name;
    el['player-tag'].textContent = fighter.cls;
    el['player-line'].textContent = fighter.symbol + ' ' + fighter.line;
    el['player-hp'].style.setProperty('--line-c', fighter.color);
    el['arena'].classList.remove('is-hyper', 'is-boss', 'is-final', 'is-rage');
    el['boss-plate'].hidden = true;
    S.boss = null;
    Fx.setClip(el['arena']);

    showScreen('screen-battle');
    /* つぶは アリーナの 中だけに えがく(こたえボタンを かくさない) */
    Fx.setClip(el['arena']);
    S.playerTrain = renderPlayer();
    buildChoiceButtons();
    updateHp();
    updateGauge();
    updateScore();

    SoundEngine.seHorn();
    Fx.banner(fighter.line + ' ' + fighter.name + ' 出発!', fighter.color);
    SoundEngine.speak(fighter.name + '! ' + fighter.quote, { rate: 1.05, pitch: 1.2 });
    el['verdict'].textContent = fighter.quote;
    startWave();
  }

  function renderPlayer() {
    el['player-slot'].innerHTML = heroHTML(S.player);
    const t = el['player-slot'].querySelector('.hero');
    t.classList.add('is-run', 'is-enter');
    later(600, () => t.classList.remove('is-enter'));
    return t;
  }

  /* こたえの ボタンは さいしょに 4つ つくって、あとは 文字だけ さしかえる
     (リアルタイムなので、つくり直すと ちらつく) */
  function buildChoiceButtons() {
    el['choices'].innerHTML = '';
    S.choiceBtns = [];
    for (let i = 0; i < 4; i += 1) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.addEventListener('click', () => answer(b.dataset.v, b));
      el['choices'].appendChild(b);
      S.choiceBtns.push(b);
    }
  }

  /* ------------------------------ ウェーブ ------------------------------ */

  function startWave() {
    const spec = WAVES[S.wave];
    const bossDef = spec.boss ? BOSSES[spec.boss] : null;
    S.monsters = buildWave(S.wave);
    S.boss = bossDef ? S.monsters.filter((m) => m.isBoss)[0] : null;

    el['wave-chip'].textContent = bossDef
      ? '★ ' + (bossDef.isFinal ? '大魔王' : '四天王') + ' ' + (S.wave + 1) + '/' + WAVE_COUNT
      : 'ウェーブ ' + (S.wave + 1) + ' / ' + WAVE_COUNT;
    el['wave-chip'].classList.toggle('is-boss', !!bossDef);
    el['arena'].classList.toggle('is-boss', !!bossDef);
    el['arena'].classList.toggle('is-final', !!(bossDef && bossDef.isFinal));
    el['arena'].classList.remove('is-rage');

    renderMonsters();
    setupBossPlate(bossDef);

    /* BGM: ボスは せんよう曲、ざこ波は ウェーブごとに つぎの 曲へ */
    if (bossDef) SoundEngine.playTrack(bossDef.bgm);
    else if (S.hyper) SoundEngine.playTrack('ハイパー ドライブ');
    else SoundEngine.playTrack(BATTLE_TRACKS[S.wave % BATTLE_TRACKS.length]);

    if (bossDef) {
      bossEntrance(bossDef);
      S.inputLockUntil = performance.now() + CUTIN_MS + 250;
      S.quirkAt = performance.now() + CUTIN_MS + 2500;
      later(CUTIN_MS + 250, () => { newQuestion(); startLoop(); });
      return;
    }

    Fx.banner('ウェーブ ' + (S.wave + 1), '#ffd43b');
    Fx.speedLines(-1, 'rgba(255,255,255,.6)', 18);
    el['verdict'].textContent = 'やさいモンスターが おしよせてきた!';
    el['verdict'].className = 'verdict';
    S.inputLockUntil = performance.now() + 500;
    S.quirkAt = performance.now() + 1800;
    newQuestion();
    startLoop();
  }

  /* ----------------------------- ボス とうじょう ----------------------------- */

  function bossEntrance(bossDef) {
    /* カットインの あいだだけ つぶの クリップを はずして がめん ぜんたいを つかう */
    Fx.setClip(null);
    Fx.cutin({
      emoji: bossDef.emoji,
      title: bossDef.title,
      name: bossDef.name,
      color: bossDef.color,
      aura: bossDef.aura,
      ms: CUTIN_MS,
    });
    Fx.flash('#000000', 300);
    Fx.crack(bossDef.color, 8);
    Fx.shake(26, 900);
    Fx.zoom(0.06, 600);
    SoundEngine.seHorn();
    later(220, () => {
      SoundEngine.seSpecial();
      Fx.crack('#ffffff', 5);
      Fx.shake(22, 700);
    });
    later(CUTIN_MS, () => {
      Fx.setClip(el['arena']);
      Fx.focusLines(window.innerWidth * 0.68, window.innerHeight * 0.3, 'rgba(255,255,255,.7)', 46);
      Fx.shake(16, 400);
    });
    SoundEngine.speak(bossDef.title + ' ' + bossDef.name + '! ' + bossDef.intro,
      { rate: 0.95, pitch: bossDef.isFinal ? 0.45 : 0.6 });
    el['verdict'].textContent = bossDef.intro;
    el['verdict'].className = 'verdict is-ng';
  }

  /* ボスの なまえプレート(アリーナの 上) */
  function setupBossPlate(bossDef) {
    const plate = el['boss-plate'];
    if (!bossDef) {
      plate.hidden = true;
      return;
    }
    plate.hidden = false;
    plate.style.setProperty('--bp-color', bossDef.color);
    el['bp-title'].textContent = bossDef.title;
    el['bp-name'].textContent = bossDef.name;
    el['bp-fill'].style.width = '100%';
    el['bp-fill'].classList.remove('is-rage');
    el['bp-phase'].textContent = '';
  }

  function renderMonsters() {
    el['mon-row'].innerHTML = '';
    S.monsters.forEach((m, i) => {
      const d = m.def;
      const div = document.createElement('div');
      div.className = 'mon' + (m.scale >= 2.4 ? ' is-giant' : '');
      div.dataset.move = d.move || 'hop';
      div.style.setProperty('--sc', m.scale);
      div.style.setProperty('--c', d.color);
      div.style.animationDelay = (i * 70) + 'ms';
      div.innerHTML =
        '<div class="mon-hp"><i></i></div>' +
        '<div class="mon-body">' +
        (d.crown ? '<span class="mon-crown">' + d.crown + '</span>' : '') +
        '<span class="mon-emoji">' + d.emoji + '</span>' +
        '<span class="mon-eye l"></span><span class="mon-eye r"></span>' +
        '<span class="mon-mouth"></span>' +
        '</div>' +
        '<div class="mon-charge"><i></i></div>';
      el['mon-row'].appendChild(div);

      m.el = div;
      m.hpFill = div.querySelector('.mon-hp i');
      m.chargeFill = div.querySelector('.mon-charge i');
      m.alive = true;
      m.pendingHp = m.hp;
      /* いっせいに こうげきしないように ためゲージを ずらす */
      m.charge = -0.35 * i - (m.isBoss ? 0 : 0.1);
      m.raged = false;
    });
    markTarget();
    fitMonRow();
  }

  /*
   * 四天王は でかいので、でんしゃと ならべると はみ出すことが ある。
   * はみ出す ぶんだけ ならび ぜんたいを ちぢめて、ぜんいん 画面に おさめる。
   */
  function fitMonRow() {
    const row = el['mon-row'];
    row.style.transform = '';
    let need = 0;
    Array.prototype.forEach.call(row.children, (ch, i) => {
      need += ch.offsetWidth + (i ? 4 : 0);
    });
    const avail = el['field'].clientWidth - el['player-slot'].offsetWidth - 20;
    if (need <= avail || need === 0) return;
    row.style.transform = 'scale(' + Math.max(0.55, avail / need).toFixed(3) + ')';
  }

  function markTarget() {
    const t = frontTarget();
    S.monsters.forEach((m) => {
      if (m.el) m.el.classList.toggle('is-target', m === t);
    });
  }

  /* いちばん 前の(まだ たまが たりていない)モンスター */
  function frontTarget() {
    for (let i = 0; i < S.monsters.length; i += 1) {
      const m = S.monsters[i];
      if (m.alive && m.pendingHp > 0) return m;
    }
    return frontAlive();
  }

  function frontAlive() {
    for (let i = 0; i < S.monsters.length; i += 1) {
      if (S.monsters[i].alive) return S.monsters[i];
    }
    return null;
  }

  /* ------------------------------ メインループ ------------------------------ */

  function startLoop() {
    if (S.running) return;
    S.running = true;
    S.lastT = performance.now();
    S.rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    S.running = false;
    if (S.rafId) cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }

  function loop(now) {
    if (!S.running) return;
    const dt = Math.min((now - S.lastT) / 1000, 0.1);
    S.lastT = now;

    for (let i = 0; i < S.monsters.length; i += 1) {
      const m = S.monsters[i];
      if (!m.alive) continue;
      m.charge += dt / m.cd;
      if (m.charge >= 1) {
        m.charge = 0;
        monsterAttack(m);
      }
      const r = Math.max(0, Math.min(1, m.charge));
      m.chargeFill.style.width = (r * 100) + '%';
      m.el.classList.toggle('is-ready', r > 0.82);
    }

    /* ときどき モンスターが とつぜん へんな うごきを する */
    if (now > S.quirkAt) {
      S.quirkAt = now + 2400 + Math.random() * 2800;
      doQuirk();
    }

    /* はやさボーナスの のこり(クリティカルの まど) */
    const left = 1 - (now - S.askedAt) / (S.levelDef.crit * 1000);
    setTimerRatio(left);

    S.rafId = requestAnimationFrame(loop);
  }

  /*
   * きまぐれアクション。
   * ざこモンスターが 1ぴき、とつぜん 大ジャンプしたり ワープしたり する。
   * うごきは 6しゅるいの 中から ランダム。
   */
  function doQuirk() {
    const zako = S.monsters.filter((m) => m.alive && !m.isBoss && m.el);
    if (zako.length === 0) return;
    const m = zako[Math.floor(Math.random() * zako.length)];
    const n = 1 + Math.floor(Math.random() * 6);
    play(m.el, 'is-sp' + n, 1200);
    const c = centerOf(m.el);
    Fx.emojiBurst(c.x, c.y - 20, Quiz.pick(['❔', '💭', '✨']), 2);
  }

  /* ------------------------------ ひょうじ ------------------------------ */

  function setTimerRatio(r) {
    const v = Math.max(0, Math.min(1, r));
    el['timer-fill'].style.width = (v * 100) + '%';
    el['timer-fill'].classList.toggle('is-hurry', v <= 0);
  }

  function updateHp() {
    const pr = Math.max(0, S.playerHp) / PLAYER_MAX_HP;
    el['player-hp-fill'].style.width = (pr * 100).toFixed(1) + '%';
    el['player-hp-fill'].classList.toggle('is-low', pr <= 0.3);
    el['player-hp-num'].textContent = Math.max(0, Math.round(S.playerHp));
  }

  function updateGauge() {
    const r = Math.min(1, S.gauge / GAUGE_MAX);
    el['gauge-fill'].style.width = (r * 100) + '%';
    el['gauge-fill'].parentNode.classList.toggle('is-full', S.gauge >= GAUGE_MAX);
    el['combo-chip'].textContent = S.combo + 'れんぞく';
    if (S.playerTrain) S.playerTrain.classList.toggle('is-ready', S.gauge >= GAUGE_MAX);
  }

  function updateScore() {
    el['score-num'].textContent = S.score;
  }

  function updateMonHp(m) {
    const r = Math.max(0, m.hp) / m.maxHp;
    m.hpFill.style.width = (r * 100) + '%';
    if (m.isBoss) el['bp-fill'].style.width = (r * 100) + '%';
  }

  /* ------------------------------ もんだい ------------------------------ */

  function newQuestion() {
    const q = Quiz.make(S.genre, S.level, S.wave);
    S.question = q;
    S.askedAt = performance.now();

    el['question'].innerHTML = q.qHtml;
    el['hint'].innerHTML = q.hintHtml || '';
    el['choices'].classList.toggle('is-wide', !!q.wide);

    S.choiceBtns.forEach((b, i) => {
      b.textContent = q.choices[i];
      b.dataset.v = q.choices[i];
      b.className = 'choice';
      b.disabled = false;
    });

    /* まえの もんだいの「こたえは○○」を のこすと、あたらしい もんだいと
       まざって まぎらわしいので ここで けす */
    el['verdict'].textContent = '';
    el['verdict'].className = 'verdict';

    /* さんすうの かんたん・ふつう、ことばの もんだいは よみあげる
       (さんすうの つよいだけ テンポを ゆうせん して よまない) */
    if (!(S.genre === 'sansu' && S.level === 'tsuyoi')) {
      SoundEngine.speak(q.speech, { rate: 1.15, pitch: 1.25 });
    }
  }

  /* ------------------------------ こたえる ------------------------------ */

  function answer(value, btn) {
    const now = performance.now();
    if (!S.running || now < S.inputLockUntil) return;

    if (value === S.question.answer) {
      const crit = (now - S.askedAt) / 1000 <= S.levelDef.crit;
      S.stats.correct += 1;
      S.combo += 1;
      if (S.combo > S.bestCombo) S.bestCombo = S.combo;
      S.score += crit ? 150 : 100;
      updateScore();

      btn.classList.add('is-right');
      el['verdict'].textContent = crit ? 'ナイス! クリティカル!' : 'せいかい!';
      el['verdict'].className = 'verdict is-ok';

      if (S.gauge >= GAUGE_MAX) {
        /* ゲージが たまった じょうたいで せいかい → ひっさつわざ */
        S.gauge = 0;
        superAttack();
      } else {
        S.gauge += 1;
        if (S.gauge >= GAUGE_MAX) SoundEngine.seReady();
        else SoundEngine.seCombo(S.combo);
        fireShot(crit);
      }
      updateGauge();
      checkHyper();

      /* すぐ つぎの もんだい。とまらずに こうげきを つなげられる */
      S.inputLockUntil = now + 90;
      newQuestion();
    } else {
      S.stats.wrong += 1;
      S.combo = 0;
      updateGauge();
      leaveHyper();

      btn.classList.add('is-wrong');
      S.choiceBtns.forEach((b) => {
        b.disabled = true;
        if (b.dataset.v === S.question.answer) b.classList.add('is-right');
      });
      el['verdict'].textContent = 'ざんねん… こたえは ' + S.question.answer;
      el['verdict'].className = 'verdict is-ng';

      SoundEngine.seWrong();
      Fx.flash('rgba(255,120,120,.5)', 200);
      damagePlayer(5, true);

      S.inputLockUntil = now + MISS_LOCK_MS;
      later(MISS_LOCK_MS, () => {
        if (S.running) newQuestion();
      });
    }
  }

  /* ---------------------------- ハイパーモード ---------------------------- */

  function checkHyper() {
    if (S.hyper || S.combo < HYPER_COMBO) return;
    S.hyper = true;
    el['arena'].classList.add('is-hyper');
    Fx.banner('ハイパーモード!!', '#ff922b');
    Fx.flash('#ffd43b', 320);
    Fx.shake(18, 500);
    Fx.zoom(0.05, 400);
    Fx.confetti(60);
    SoundEngine.seHyper();
    if (!WAVES[S.wave].boss) SoundEngine.playTrack('ハイパー ドライブ');
  }

  function leaveHyper() {
    if (!S.hyper) return;
    S.hyper = false;
    el['arena'].classList.remove('is-hyper');
    if (!WAVES[S.wave].boss) SoundEngine.playTrack(BATTLE_TRACKS[S.wave % BATTLE_TRACKS.length]);
  }

  /* ============================ こうげき ============================ */

  function damageOf(crit) {
    const base = 12 * S.player.power + Math.min(S.combo, 12) * 0.8;
    let d = base * (crit ? 1.6 : 1);
    if (S.hyper) d *= HYPER_BOOST;
    return Math.max(1, Math.round(d));
  }

  /*
   * たまを うつ。
   * ダメージは たまが とどいた ときに あてる(ここでは pendingHp を へらして
   * つぎの たまが つぎの モンスターを ねらえるように しておく)。
   */
  function fireShot(crit) {
    const target = frontTarget();
    if (!target) return;
    const dmg = damageOf(crit);
    target.pendingHp -= dmg;
    markTarget();

    play(S.playerTrain, 'is-fire', 240);
    setFace(S.playerTrain, 'angry');
    later(260, () => setFace(S.playerTrain, 'normal'));
    SoundEngine.seShot();

    const from = centerOf(S.playerTrain);
    const to = centerOf(target.el);

    /* たま(ひかりの たま)を とばす */
    const shot = document.createElement('div');
    shot.className = 'shot';
    shot.textContent = crit ? '💥' : (S.player.spark || '⚡');
    shot.style.color = S.player.color;
    shot.style.left = from.x + 'px';
    shot.style.top = from.y + 'px';
    shot.style.transform = 'translate(-50%,-50%)';
    if (crit) shot.style.fontSize = '38px';
    el['fx-layer'].appendChild(shot);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const anim = shot.animate(
      [
        { transform: 'translate(-50%,-50%) scale(.6) rotate(0deg)' },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(1.3) rotate(300deg)' },
      ],
      { duration: SHOT_MS, easing: 'cubic-bezier(.3,0,.6,1)' }
    );
    anim.onfinish = () => shot.remove();

    /* しっぽの ひかり */
    Fx.beam(from.x, from.y, to.x, to.y, crit ? '#ffe066' : S.player.color, crit ? 20 : 11);
    Fx.speedLines(1, 'rgba(255,255,255,.35)', crit ? 14 : 7);

    later(SHOT_MS, () => landHit(target, dmg, crit, to));
  }

  /* たまが とどいた */
  function landHit(target, dmg, crit, pos) {
    let m = target;
    if (!m.alive) {
      /* ねらってた やつが さきに たおれていたら、つぎの モンスターに あたる */
      m = frontAlive();
      if (!m) {
        Fx.burst(pos.x, pos.y, { count: 20, colors: ['#ffffff', '#ffe066'] });
        return;
      }
      m.pendingHp -= dmg;
    }

    const to = centerOf(m.el);
    const color = m.def.color;

    m.hp -= dmg;
    updateMonHp(m);

    SoundEngine[crit ? 'seCritical' : 'seHit']();
    play(m.el, 'is-hit', 300);
    Fx.disc(to.x, to.y, 'rgba(255,255,255,.9)', crit ? 150 : 96);
    Fx.ring(to.x, to.y, color, crit ? 240 : 150, crit ? 12 : 7);
    Fx.burst(to.x, to.y, {
      count: crit ? 60 : 30,
      power: crit ? 1.25 : .9,
      colors: [color, '#ffffff', '#ffe066'],
    });
    Fx.damage(to.x, to.y - 26, dmg, crit ? 'crit' : '');
    Fx.shake(crit ? 13 : 5, crit ? 260 : 150);

    if (crit) {
      Fx.slash(to.x, to.y, '#ffffff', 380);
      Fx.flash('#fff3bf', 150);
      Fx.zoom(0.022, 220);
      Fx.focusLines(to.x, to.y, 'rgba(255,255,255,.6)', 22);
      Fx.shout(Quiz.pick(HIT_WORDS), 'crit');
    }

    if (m.hp <= 0) killMonster(m);
    else checkRage(m);
    markTarget();
  }

  /*
   * ボスの HPが はんぶんを きると「だい2けいたい」。
   * こうげきが はやく・つよく なり、BGMも せんようの 曲に かわる。
   */
  function checkRage(m) {
    if (!m.isBoss || m.raged || !m.alive) return;
    if (m.hp > m.maxHp * 0.5) return;
    const def = m.def;
    m.raged = true;
    m.atk = Math.round(m.atk * (def.rage || 1.35));
    m.cd = Math.max(2.2, m.cd / (def.rage || 1.35));

    el['arena'].classList.add('is-rage');
    m.el.classList.add('is-rage');
    el['bp-fill'].classList.add('is-rage');
    el['bp-phase'].textContent = '⚡ だい2けいたい ⚡';

    if (def.bgm2) SoundEngine.playTrack(def.bgm2);
    SoundEngine.seHyper();
    Fx.banner('だい2けいたい!!', '#ff4d4d');
    Fx.flash('#ff4d4d', 420);
    Fx.shake(30, 800);
    Fx.zoom(0.06, 520);
    Fx.crack('#ff4d4d', 6);
    const c = centerOf(m.el);
    Fx.focusLines(c.x, c.y, 'rgba(255,120,120,.85)', 50);
    Fx.ring(c.x, c.y, '#ff4d4d', 420, 18);
    Fx.emojiBurst(c.x, c.y, def.aura || '🔥', 16);
    SoundEngine.speak(def.name + 'は ほんきを だした!', { rate: 1.0, pitch: 0.5 });
    el['verdict'].textContent = def.name + 'は ほんきを だした!';
    el['verdict'].className = 'verdict is-ng';
  }

  function killMonster(m) {
    m.alive = false;
    m.hp = 0;
    m.pendingHp = 0;
    S.kills += 1;
    S.score += m.isBoss ? 1200 : 200;
    updateScore();

    const to = centerOf(m.el);
    SoundEngine.seSquash();
    Fx.flash('#ffffff', m.isBoss ? 420 : 170);
    Fx.shake(m.isBoss ? 30 : 14, m.isBoss ? 800 : 320);
    Fx.zoom(m.isBoss ? 0.06 : 0.03, m.isBoss ? 500 : 260);
    Fx.disc(to.x, to.y, 'rgba(255,255,255,.95)', m.isBoss ? 380 : 190);
    Fx.ring(to.x, to.y, m.def.color, m.isBoss ? 480 : 280, m.isBoss ? 18 : 11);
    Fx.ring(to.x, to.y, '#ffffff', m.isBoss ? 340 : 200, 6);
    Fx.burst(to.x, to.y, {
      count: m.isBoss ? 130 : 64,
      power: m.isBoss ? 1.6 : 1.1,
      colors: [m.def.color, '#ffffff', '#ffe066', '#69db7c'],
    });
    /* やさいが こなごなに とびちる */
    Fx.emojiBurst(to.x, to.y, m.def.emoji, m.isBoss ? 20 : 9);
    if (m.isBoss || m.maxHp >= 60) Fx.shout(Quiz.pick(KILL_WORDS), m.isBoss ? 'crit' : '');

    if (m.isBoss) {
      /* ボスは がめん ぜんたいを つかって 大ばくはつ */
      Fx.setClip(null);
      Fx.focusLines(to.x, to.y, 'rgba(255,255,255,.9)', 60);
      Fx.crack('#ffffff', 8);
      Fx.confetti(120);
      Fx.banner((m.def.isFinal ? '大魔王' : '四天王') + ' げきは!!', '#ffd43b');
      const shots = m.def.isFinal ? [0, 110, 220, 330, 460, 600] : [0, 140, 280, 420];
      shots.forEach((d, i) => later(d, () => {
        Fx.burst(to.x + rnd(-120, 120), to.y + rnd(-90, 90), {
          count: 80, power: 1.6, colors: ['#ffffff', '#ffe066', m.def.color],
        });
        Fx.ring(to.x + rnd(-60, 60), to.y + rnd(-40, 40), i % 2 ? '#ffffff' : m.def.color, 300 + i * 60, 14);
        Fx.flash('#ffffff', 160);
        Fx.shake(24, 300);
        SoundEngine.seHit();
      }));
      later(shots[shots.length - 1] + 240, () => {
        Fx.setClip(el['arena']);
        el['arena'].classList.remove('is-rage');
      });
      el['boss-plate'].hidden = true;
      if (m.def.defeat) SoundEngine.speak(m.def.defeat, { rate: 0.95, pitch: 0.5 });
      el['verdict'].textContent = m.def.defeat || '';
    }

    m.el.classList.add('is-dead');
    later(460, () => {
      if (m.el && m.el.parentNode) m.el.remove();
      fitMonRow();
    });

    checkWaveClear();
  }

  /* ---------------------------- ひっさつわざ ---------------------------- */

  function superAttack() {
    const p = S.player;
    const from = centerOf(S.playerTrain);
    const dmg = Math.round(damageOf(true) * 2.2);

    Fx.banner('ひっさつ! ' + p.special, p.color);
    SoundEngine.seSpecial();
    SoundEngine.speak(p.quote + ' ひっさつ! ' + p.special, { rate: 1.25, pitch: 1.3 });

    play(S.playerTrain, 'is-charge', 460);
    Fx.focusLines(from.x, from.y, 'rgba(255,255,255,.85)', 54);
    Fx.speedLines(1, '#ffffff', 40);
    Fx.flash('#ffffff', 220);
    Fx.shake(26, 700);
    Fx.zoom(0.05, 420);

    /* がめんを つらぬく ぶっとい ビーム */
    Fx.beam(from.x, from.y, window.innerWidth + 200, from.y - 20, p.color, 60);
    Fx.beam(from.x, from.y, window.innerWidth + 200, from.y - 20, '#ffffff', 24);

    const targets = S.monsters.filter((m) => m.alive);
    targets.forEach((m, i) => {
      m.pendingHp -= dmg;
      later(90 + i * 90, () => {
        if (!m.alive) return;
        const to = centerOf(m.el);
        m.hp -= dmg;
        updateMonHp(m);
        play(m.el, 'is-hit', 300);
        Fx.disc(to.x, to.y, 'rgba(255,255,255,.95)', 240);
        Fx.ring(to.x, to.y, p.color, 330, 14);
        Fx.burst(to.x, to.y, { count: 80, power: 1.4, colors: [p.color, '#ffffff', '#ffe066'] });
        Fx.bolt(from.x, from.y, to.x, to.y, '#ffe066', 8);
        Fx.damage(to.x, to.y - 30, dmg, 'crit');
        Fx.shake(14, 260);
        SoundEngine.seHit();
        if (m.hp <= 0) killMonster(m);
        else checkRage(m);
        markTarget();
      });
    });

    later(120, () => Fx.shout(p.special + '!!', 'crit'));
  }

  /* ---------------------------- モンスターの こうげき ---------------------------- */

  function monsterAttack(m) {
    if (!S.running || !m.alive) return;
    play(m.el, 'is-attack', 520);
    const from = centerOf(m.el);

    later(190, () => {
      if (!S.running) return;
      const to = centerOf(S.playerTrain);
      SoundEngine.seDamage();
      play(S.playerTrain, 'is-hit', 420);
      setFace(S.playerTrain, 'hurt');
      later(420, () => setFace(S.playerTrain, 'normal'));

      Fx.flash('rgba(255,135,135,.55)', 200);
      Fx.shake(m.isBoss ? 20 : 10, m.isBoss ? 420 : 260);
      Fx.disc(to.x, to.y, 'rgba(255,170,170,.85)', m.isBoss ? 200 : 120);
      Fx.ring(to.x, to.y, m.def.color, m.isBoss ? 300 : 190, 8);
      Fx.burst(to.x, to.y, { count: m.isBoss ? 60 : 34, colors: [m.def.color, '#ffffff', '#ff6b6b'] });
      Fx.emojiBurst(from.x, from.y, m.def.emoji, 4);
      Fx.damage(to.x, to.y - 30, m.atk, '');
      /* 野菜は じぶんの 英語名を さけぶ(みみと めで えいごを おぼえる) */
      if (m.def.en) {
        Fx.shout(m.def.en + '!', 'en');
        SoundEngine.speakEn(m.def.en, { rate: 0.85 });
      }
      if (m.isBoss) later(650, () => Fx.shout(m.def.cry, 'bad'));

      damagePlayer(m.atk, false);
    });
  }

  function damagePlayer(n, silent) {
    S.playerHp -= n;
    updateHp();
    if (!silent) {
      /* HPが すくないと がめんの ふちが あかく なる */
      if (S.playerHp > 0 && S.playerHp / PLAYER_MAX_HP <= 0.25) Fx.flash('rgba(224,49,49,.35)', 400);
    }
    if (S.playerHp <= 0) {
      S.playerHp = 0;
      updateHp();
      gameOver();
    }
  }

  /* ------------------------------ しんぱん ------------------------------ */

  function checkWaveClear() {
    if (S.monsters.some((m) => m.alive)) return;

    stopLoop();
    /* ボスを たおした あとは ばくはつを 見せる ぶん ながめに とる */
    const gap = S.boss ? WAVE_GAP_MS + 900 : WAVE_GAP_MS;
    S.inputLockUntil = performance.now() + gap + 200;

    const isLast = S.wave >= WAVE_COUNT - 1;
    if (isLast) {
      later(1800, () => finish(true));
      return;
    }

    /* かいふく */
    const before = S.playerHp;
    S.playerHp = Math.min(PLAYER_MAX_HP, S.playerHp + HEAL_PER_WAVE);
    updateHp();
    const healed = Math.round(S.playerHp - before);
    if (healed > 0) {
      const c = centerOf(S.playerTrain);
      Fx.damage(c.x, c.y - 40, '+' + healed, 'heal');
      Fx.emojiBurst(c.x, c.y, '💚', 8);
    }

    SoundEngine.seWave();
    Fx.banner('ウェーブ ' + (S.wave + 1) + ' クリア!', '#51cf66');
    Fx.confetti(70);
    el['verdict'].textContent = 'ウェーブ ' + (S.wave + 1) + ' クリア! つぎが くるよ!';
    el['verdict'].className = 'verdict is-ok';

    later(gap, () => {
      S.wave += 1;
      startWave();
    });
  }

  function gameOver() {
    stopLoop();
    S.inputLockUntil = performance.now() + 99999;
    S.playerTrain.classList.add('is-ko');
    SoundEngine.seKO();
    Fx.flash('#000000', 500);
    Fx.shake(24, 700);
    later(1100, () => finish(false));
  }

  /* ------------------------------ けっか ------------------------------ */

  function finish(win) {
    cancelAll();
    S.result = win ? 'win' : 'lose';
    Fx.setClip(null);
    showScreen('screen-result');
    SoundEngine.setMood('menu');
    el['arena'].classList.remove('is-hyper');

    const total = S.stats.correct + S.stats.wrong;
    const rate = total ? Math.round((S.stats.correct / total) * 100) : 0;

    if (win) {
      el['result-title'].textContent = '🏆 大魔王 げきは!';
      el['result-train'].innerHTML =
        '<span class="result-line">' + S.player.symbol + ' ' + S.player.line + '</span>' +
        heroHTML(S.player);
      el['result-msg'].innerHTML =
        S.player.line + 'の ' + S.player.cls + ' ' + S.player.name + 'は<br>' +
        'やさい四天王を たおし、<br>' +
        '大魔王 ベジタゴンまで やっつけた!<br>' +
        'クイズの ちからで せかいに へいわが もどったよ。';
      el['btn-again'].textContent = '▶ もういちど あそぶ';
      SoundEngine.seFanfare();
      Fx.confetti(220);
      later(700, () => Fx.confetti(150));
      SoundEngine.speak('おめでとう! ぜんぶの ウェーブを クリアしたよ!', { rate: 1.1, pitch: 1.3 });
    } else {
      el['result-title'].textContent = 'やられちゃった…';
      el['result-msg'].innerHTML =
        S.player.name + 'は ウェーブ ' + (S.wave + 1) + ' で ちからつきた…<br>' +
        'もういちど ちょうせん しよう!';
      el['result-train'].innerHTML = '<div class="result-veg">' +
        S.monsters.filter((m) => m.alive).slice(0, 4).map((m) => m.def.emoji).join('') + '</div>';
      el['btn-again'].textContent = '▶ もういちど たたかう';
      SoundEngine.seLose();
      SoundEngine.speak('ざんねん。もういちど ちょうせん しよう', { rate: 1.0, pitch: 1.1 });
    }

    el['result-stats'].innerHTML =
      '<div class="stat"><b>' + S.genreDef.emoji + '</b><span>' + S.genreDef.name + ' / ' + S.levelDef.name + '</span></div>' +
      '<div class="stat"><b>' + S.score + '</b><span>スコア</span></div>' +
      '<div class="stat"><b>' + S.kills + '</b><span>たおした かず</span></div>' +
      '<div class="stat"><b>' + S.stats.correct + '</b><span>せいかい</span></div>' +
      '<div class="stat"><b>' + rate + '%</b><span>せいかいりつ</span></div>' +
      '<div class="stat"><b>' + S.bestCombo + '</b><span>さいこう れんぞく</span></div>' +
      '<div class="stat"><b>' + (win ? WAVE_COUNT : S.wave + 1) + ' / ' + WAVE_COUNT + '</b><span>ウェーブ</span></div>';
  }

  /* ------------------------------ そうさ ------------------------------ */

  el['btn-start'].addEventListener('click', () => {
    SoundEngine.unlock();
    SoundEngine.seTap();
    SoundEngine.setMood('menu');
    showScreen('screen-genre');
  });

  el['btn-again'].addEventListener('click', () => {
    SoundEngine.seTap();
    if (S.player) startGame(S.player);
    else showScreen('screen-level');
  });

  document.querySelectorAll('[data-back]').forEach((b) => {
    b.addEventListener('click', () => {
      SoundEngine.seTap();
      cancelAll();
      Fx.clear();
      Fx.setClip(null);
      SoundEngine.setMood('menu');
      showScreen(b.dataset.back);
    });
  });

  el['btn-home'].addEventListener('click', () => {
    SoundEngine.seTap();
    SoundEngine.stopSpeak();
    cancelAll();
    Fx.clear();
    Fx.setClip(null);
    SoundEngine.setMood('menu');
    showScreen('screen-title');
  });

  el['btn-bgm'].addEventListener('click', () => {
    const on = !SoundEngine.isBgmEnabled();
    SoundEngine.setBgmEnabled(on);
    el['btn-bgm'].classList.toggle('is-off', !on);
  });

  el['btn-voice'].addEventListener('click', () => {
    const on = !SoundEngine.isVoiceEnabled();
    SoundEngine.setVoiceEnabled(on);
    el['btn-voice'].classList.toggle('is-off', !on);
  });

  /* キーボードでも あそべる(1〜4 で こたえを えらぶ) */
  document.addEventListener('keydown', (ev) => {
    if (!el['screen-battle'].classList.contains('is-active')) return;
    const n = parseInt(ev.key, 10);
    if (n >= 1 && n <= 4) {
      const b = S.choiceBtns[n - 1];
      if (b && !b.disabled) b.click();
    }
  });

  window.addEventListener('resize', () => {
    if (el['screen-battle'].classList.contains('is-active')) fitMonRow();
  });

  /* さいしょの タップで 音を つかえるように する(スマホ たいさく) */
  document.addEventListener('pointerdown', function unlockOnce() {
    SoundEngine.unlock();
    document.removeEventListener('pointerdown', unlockOnce);
  }, { once: true });

  buildGenreList();
  buildLevelList();
  buildCharList();
})();
