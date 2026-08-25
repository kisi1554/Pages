'use strict';

/*
 * でんしゃバトル 本体(リアルタイム ウェーブ制)
 *
 *  タイトル → レベルえらび → あいぼうえらび → バトル(8ウェーブ) → けっか
 *
 *  バトルの ながれ:
 *    - 野菜モンスターが 右から おしよせる。ターンは まわってこない。
 *    - さんすうに せいかいすると、その ばで すぐ たまが とんで 前の モンスターに ヒット。
 *      つぎの もんだいは すぐ でるので、はやく こたえるほど どんどん こうげきできる。
 *    - モンスターは それぞれ「ためゲージ」を もっていて、たまると かってに こうげきしてくる。
 *    - まちがえると すこし ダメージ + 0.6びょう うごけない。
 *    - れんぞく せいかいで ひっさつゲージが たまり、MAXで 全体こうげき。
 *      8れんぞくで「ハイパーモード」(ダメージ 1.4ばい・BGMも はやくなる)。
 */

(function main() {
  /* ------------------------------ DOM ------------------------------ */

  const el = {};
  ['screen-title', 'screen-level', 'screen-select', 'screen-battle', 'screen-result',
    'btn-start', 'level-list', 'char-list', 'select-sub',
    'wave-chip', 'score-num', 'btn-bgm', 'btn-voice', 'btn-home',
    'arena', 'field', 'player-slot', 'mon-row',
    'player-name', 'player-tag', 'player-hp-fill', 'player-hp-num',
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
  const MISS_LOCK_MS = 600;   // まちがえた ときに うごけない じかん
  const WAVE_GAP_MS = 1300;   // ウェーブの あいだ

  /* ---------------------------- じょうたい ---------------------------- */

  const S = {
    level: 'kantan',
    levelDef: LEVELS[0],
    player: null,
    playerTrain: null,

    wave: 0,
    monsters: [],

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
    ['screen-title', 'screen-level', 'screen-select', 'screen-battle', 'screen-result']
      .forEach((s) => el[s].classList.toggle('is-active', s === id));
  }

  /* --------------------------- でんしゃの みため --------------------------- */

  function trainHTML(f, dir) {
    return '<div class="train" data-dir="' + dir + '" data-face="normal"' +
      ' style="--c:' + f.color + ';--ink-c:' + f.ink + '">' +
      '<div class="train-aura">' + (f.aura || '✨') + '</div>' +
      '<div class="train-hat">' + (f.hat || '') + '</div>' +
      '<div class="train-car">' +
      '<div class="train-dest">' + f.line + '</div>' +
      '<div class="train-face">' +
      '<span class="eye eye-l"></span><span class="eye eye-r"></span>' +
      '<span class="mouth"></span>' +
      '</div>' +
      '</div>' +
      '<div class="train-wheels"><i></i><i></i><i></i></div>' +
      '</div>';
  }

  function setFace(train, face) {
    if (train) train.dataset.face = face;
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

  function buildLevelList() {
    el['level-list'].innerHTML = '';
    LEVELS.forEach((lv) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'level-card';
      b.style.setProperty('--lc', lv.color);
      b.innerHTML =
        '<span class="lv-emoji">' + lv.emoji + '</span>' +
        '<span><span class="lv-name">' + lv.name + '</span> ' +
        '<span class="lv-sub">' + lv.sub + '</span><br>' +
        '<span class="lv-detail">' + lv.detail + '</span></span>';
      b.addEventListener('click', () => {
        SoundEngine.seTap();
        S.level = lv.id;
        S.levelDef = lv;
        el['select-sub'].textContent = 'レベル: ' + lv.name + '(' + lv.sub + ')';
        showScreen('screen-select');
      });
      el['level-list'].appendChild(b);
    });
  }

  function buildCharList() {
    el['char-list'].innerHTML = '';
    FIGHTERS.forEach((f) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'char-card';
      b.style.setProperty('--ink-c', f.ink);
      b.innerHTML =
        trainHTML(f, 'right') +
        '<span class="cc-name">' + f.name + '</span>' +
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
    el['player-tag'].textContent = fighter.line;
    el['arena'].classList.remove('is-hyper', 'is-boss');

    showScreen('screen-battle');
    /* つぶは アリーナの 中だけに えがく(こたえボタンを かくさない) */
    Fx.setClip(el['arena']);
    S.playerTrain = renderPlayer();
    buildChoiceButtons();
    updateHp();
    updateGauge();
    updateScore();

    SoundEngine.seHorn();
    startWave();
  }

  function renderPlayer() {
    el['player-slot'].innerHTML = trainHTML(S.player, 'right');
    const t = el['player-slot'].querySelector('.train');
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
      b.addEventListener('click', () => answer(parseInt(b.textContent, 10), b));
      el['choices'].appendChild(b);
      S.choiceBtns.push(b);
    }
  }

  /* ------------------------------ ウェーブ ------------------------------ */

  function startWave() {
    const spec = WAVES[S.wave];
    const isBoss = !!spec.boss;
    S.monsters = buildWave(S.wave);

    el['wave-chip'].textContent = isBoss
      ? '★ ボス ' + (S.wave + 1) + ' / ' + WAVE_COUNT + ' ★'
      : 'ウェーブ ' + (S.wave + 1) + ' / ' + WAVE_COUNT;
    el['wave-chip'].classList.toggle('is-boss', isBoss);
    el['arena'].classList.toggle('is-boss', isBoss);

    renderMonsters();
    SoundEngine.setMood(isBoss ? 'boss' : (S.hyper ? 'hyper' : 'battle'));

    if (isBoss) {
      const boss = BOSSES[spec.boss];
      Fx.banner(boss.name, '#e03131');
      Fx.flash('#3b1a5c', 380);
      Fx.shake(16, 600);
      Fx.focusLines(window.innerWidth * 0.72, window.innerHeight * 0.32, 'rgba(255,120,120,.8)', 46);
      SoundEngine.speak(boss.intro, { rate: 0.95, pitch: 0.55 });
      el['verdict'].textContent = boss.name + 'が あらわれた! ' + boss.intro;
    } else {
      Fx.banner('ウェーブ ' + (S.wave + 1), '#ffd43b');
      el['verdict'].textContent = 'やさいモンスターが おしよせてきた!';
    }

    S.inputLockUntil = performance.now() + (isBoss ? 900 : 500);
    newQuestion();
    startLoop();
  }

  function renderMonsters() {
    el['mon-row'].innerHTML = '';
    S.monsters.forEach((m, i) => {
      const d = m.def;
      const div = document.createElement('div');
      div.className = 'mon';
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
    });
    markTarget();
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

    /* はやさボーナスの のこり(クリティカルの まど) */
    const left = 1 - (now - S.askedAt) / (S.levelDef.crit * 1000);
    setTimerRatio(left);

    S.rafId = requestAnimationFrame(loop);
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
    m.hpFill.style.width = (Math.max(0, m.hp) / m.maxHp * 100) + '%';
  }

  /* ------------------------------ もんだい ------------------------------ */

  function newQuestion() {
    const q = Quiz.make(S.level, S.wave);
    S.question = q;
    S.askedAt = performance.now();

    el['question'].innerHTML =
      '<span>' + q.a + '</span><span class="q-op">' + q.op + '</span><span>' + q.b + '</span>' +
      '<span class="q-eq">=</span><span class="q-ask">?</span>';

    if (S.level === 'kantan' && q.countable) {
      el['hint'].innerHTML =
        '<span class="hint-group">' + '🚃'.repeat(q.a) + '</span>' +
        '<span class="hint-plus">+</span>' +
        '<span class="hint-group">' + '🚋'.repeat(q.b) + '</span>';
    } else {
      el['hint'].innerHTML = '';
    }

    S.choiceBtns.forEach((b, i) => {
      b.textContent = q.choices[i];
      b.className = 'choice';
      b.disabled = false;
    });

    /* かんたん・ふつう は もんだいを よみあげる(つよいは テンポを ゆうせん) */
    if (S.level !== 'tsuyoi') SoundEngine.speak(q.speech, { rate: 1.15, pitch: 1.25 });
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
        if (parseInt(b.textContent, 10) === S.question.answer) b.classList.add('is-right');
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
    if (!WAVES[S.wave].boss) SoundEngine.setMood('hyper');
  }

  function leaveHyper() {
    if (!S.hyper) return;
    S.hyper = false;
    el['arena'].classList.remove('is-hyper');
    if (!WAVES[S.wave].boss) SoundEngine.setMood('battle');
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
    markTarget();
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
      Fx.focusLines(to.x, to.y, 'rgba(255,255,255,.85)', 56);
      Fx.confetti(90);
      [0, 140, 280].forEach((d) => later(d, () => {
        Fx.burst(to.x + rnd(-90, 90), to.y + rnd(-70, 70), {
          count: 60, power: 1.4, colors: ['#ffffff', '#ffe066', m.def.color],
        });
        SoundEngine.seHit();
      }));
      if (m.def.defeat) SoundEngine.speak(m.def.defeat, { rate: 0.95, pitch: 0.55 });
    }

    m.el.classList.add('is-dead');
    later(460, () => { if (m.el && m.el.parentNode) m.el.remove(); });

    checkWaveClear();
  }

  /* ---------------------------- ひっさつわざ ---------------------------- */

  function superAttack() {
    const p = S.player;
    const from = centerOf(S.playerTrain);
    const dmg = Math.round(damageOf(true) * 2.2);

    Fx.banner('ひっさつ! ' + p.special, p.color);
    SoundEngine.seSpecial();
    SoundEngine.speak('ひっさつ! ' + p.special, { rate: 1.2, pitch: 1.3 });

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
      if (m.isBoss || Math.random() < 0.3) Fx.shout(m.def.cry, 'bad');

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
    S.inputLockUntil = performance.now() + WAVE_GAP_MS + 200;

    const isLast = S.wave >= WAVE_COUNT - 1;
    if (isLast) {
      later(900, () => finish(true));
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

    later(WAVE_GAP_MS, () => {
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
      el['result-title'].textContent = '🏆 やさい ぜんめつ!';
      el['result-train'].innerHTML = trainHTML(S.player, 'right');
      el['result-msg'].innerHTML =
        S.player.name + 'は やさいの おうさま ベジタゴンを たおした!<br>' +
        'けいさんの ちからで まちに へいわが もどったよ。';
      el['btn-again'].textContent = '▶ もういちど あそぶ';
      SoundEngine.seFanfare();
      Fx.confetti(220);
      later(700, () => Fx.confetti(150));
      SoundEngine.speak('おめでとう! ぜんぶの ウェーブを クリアしたよ!', { rate: 1.1, pitch: 1.3 });
    } else {
      el['result-title'].textContent = 'やられちゃった…';
      el['result-msg'].innerHTML =
        'ウェーブ ' + (S.wave + 1) + ' で ちからつきた…<br>' +
        'もういちど ちょうせん しよう!';
      el['result-train'].innerHTML = '<div class="result-veg">' +
        S.monsters.filter((m) => m.alive).slice(0, 4).map((m) => m.def.emoji).join('') + '</div>';
      el['btn-again'].textContent = '▶ もういちど たたかう';
      SoundEngine.seLose();
      SoundEngine.speak('ざんねん。もういちど ちょうせん しよう', { rate: 1.0, pitch: 1.1 });
    }

    el['result-stats'].innerHTML =
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
    showScreen('screen-level');
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

  /* さいしょの タップで 音を つかえるように する(スマホ たいさく) */
  document.addEventListener('pointerdown', function unlockOnce() {
    SoundEngine.unlock();
    document.removeEventListener('pointerdown', unlockOnce);
  }, { once: true });

  buildLevelList();
  buildCharList();
})();
