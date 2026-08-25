'use strict';

/*
 * でんしゃバトル 本体
 *
 *  タイトル → レベルえらび → あいぼうえらび → バトル(6ステージ) → けっか
 *
 *  バトルの ながれ:
 *    1. さんすうの もんだいが でる(4たく)
 *    2. せいかい → じぶんの でんしゃが とっしんして こうげき
 *       まちがい/じかんぎれ → あいての こうげきを うける
 *    3. せいかいが つづくと「ひっさつゲージ」が たまり、MAXで ひっさつわざ
 *    4. あいての HPが 0で つぎの ステージへ。6にんめは ラスボス
 */

(function main() {
  /* ------------------------------ DOM ------------------------------ */

  const el = {};
  ['screen-title', 'screen-level', 'screen-select', 'screen-battle', 'screen-result',
    'btn-start', 'level-list', 'char-list', 'select-sub',
    'stage-chip', 'btn-bgm', 'btn-voice', 'btn-home',
    'arena', 'enemy-slot', 'player-slot',
    'enemy-name', 'enemy-tag', 'enemy-hp-fill', 'enemy-hp-num',
    'player-name', 'player-tag', 'player-hp-fill', 'player-hp-num',
    'gauge-fill', 'combo-chip', 'timer-fill',
    'question', 'hint', 'choices', 'verdict',
    'result-title', 'result-train', 'result-msg', 'result-stats', 'btn-again',
    'fx-canvas', 'fx-layer'].forEach((id) => {
    el[id] = document.getElementById(id);
  });

  Fx.init(el['fx-canvas'], document.getElementById('shaker'), el['fx-layer']);

  /* ---------------------------- ゲームの じょうたい ---------------------------- */

  const PLAYER_MAX_HP = 100;
  const HEAL_ON_WIN = 30;
  const GAUGE_MAX = 3;

  const S = {
    level: 'kantan',
    levelDef: LEVELS[0],
    player: null,
    stages: [],
    stageIndex: 0,
    enemy: null,
    enemyHp: 0,
    enemyMaxHp: 0,
    playerHp: PLAYER_MAX_HP,
    combo: 0,
    bestCombo: 0,
    gauge: 0,
    question: null,
    locked: true,
    askedAt: 0,
    timeLimit: 12,
    timerId: 0,
    tickedAt: 0,
    stats: { correct: 0, wrong: 0 },
    lost: false,
    token: 0,
    timeouts: [],
    playerTrain: null,
    enemyTrain: null,
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
    stopTimer();
  }

  /* ------------------------------ がめん ------------------------------ */

  function showScreen(id) {
    ['screen-title', 'screen-level', 'screen-select', 'screen-battle', 'screen-result']
      .forEach((s) => el[s].classList.toggle('is-active', s === id));
  }

  /* --------------------------- でんしゃの みため --------------------------- */

  function trainHTML(f, dir) {
    return '<div class="train' + (f.isBoss ? ' is-villain' : '') + '" data-dir="' + dir + '"' +
      ' data-face="' + (f.isBoss ? 'angry' : 'normal') + '"' +
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

  function renderTrain(slot, f, dir) {
    slot.innerHTML = trainHTML(f, dir);
    return slot.querySelector('.train');
  }

  function setFace(train, face) {
    if (train) train.dataset.face = face;
  }

  /* アニメの クラスを 1回だけ つける */
  function play(train, cls, ms) {
    if (!train) return;
    train.classList.remove(cls);
    /* リフローさせて アニメを さいせいし なおす */
    void train.offsetWidth;
    train.classList.add(cls);
    later(ms, () => train.classList.remove(cls));
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

  /* ------------------------------ キャラ ------------------------------ */

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
    S.stages = buildStages(fighter.id);
    S.stageIndex = 0;
    S.playerHp = PLAYER_MAX_HP;
    S.combo = 0;
    S.bestCombo = 0;
    S.gauge = 0;
    S.stats = { correct: 0, wrong: 0 };
    S.lost = false;
    S.timeLimit = S.levelDef.time;

    el['player-name'].textContent = fighter.name;
    el['player-tag'].textContent = fighter.line;
    showScreen('screen-battle');
    startStage();
  }

  function startStage() {
    cancelAll();
    Fx.clear();
    const enemy = S.stages[S.stageIndex];
    S.enemy = enemy;
    S.enemyMaxHp = enemy.hp;
    S.enemyHp = enemy.hp;
    S.locked = true;

    const isBoss = !!enemy.isBoss;
    el['arena'].classList.toggle('is-boss', isBoss);
    el['stage-chip'].classList.toggle('is-boss', isBoss);
    el['stage-chip'].textContent = isBoss
      ? '★ ラスボス ★'
      : 'ステージ ' + (S.stageIndex + 1) + ' / ' + STAGE_COUNT;

    el['enemy-name'].textContent = enemy.name;
    el['enemy-tag'].textContent = enemy.tag;

    S.playerTrain = renderTrain(el['player-slot'], S.player, 'right');
    S.enemyTrain = renderTrain(el['enemy-slot'], enemy, 'left');
    S.playerTrain.classList.add('is-run');
    S.enemyTrain.classList.add('is-enter');
    later(700, () => S.enemyTrain.classList.remove('is-enter'));

    updateHp();
    updateGauge();
    el['question'].textContent = 'よういは いい?';
    el['hint'].innerHTML = '';
    el['choices'].innerHTML = '';
    el['verdict'].textContent = '';
    setTimerRatio(1);

    SoundEngine.setMood(isBoss ? 'boss' : 'battle');
    SoundEngine.seHorn();
    Fx.speedLines(-1, 'rgba(255,255,255,.6)', 22);

    if (isBoss) {
      Fx.banner('ラスボス しゅつげん!', '#e03131');
      Fx.flash('#3b1a5c', 400);
      Fx.shake(14, 600);
      SoundEngine.speak(BOSS.intro, { rate: 0.9, pitch: 0.6 });
      el['verdict'].textContent = enemy.intro;
    } else {
      Fx.banner('ステージ ' + (S.stageIndex + 1) + '  ' + enemy.name, '#ffd43b');
      SoundEngine.speak(enemy.name + 'が あらわれた!', { rate: 1.05, pitch: 1.2 });
      el['verdict'].textContent = enemy.name + 'が あらわれた!';
    }

    later(isBoss ? 2200 : 1500, nextQuestion);
  }

  /* ------------------------------ HP ひょうじ ------------------------------ */

  function updateHp() {
    const er = Math.max(0, S.enemyHp) / S.enemyMaxHp;
    const pr = Math.max(0, S.playerHp) / PLAYER_MAX_HP;
    el['enemy-hp-fill'].style.width = (er * 100).toFixed(1) + '%';
    el['player-hp-fill'].style.width = (pr * 100).toFixed(1) + '%';
    el['enemy-hp-fill'].classList.toggle('is-low', er <= 0.3);
    el['player-hp-fill'].classList.toggle('is-low', pr <= 0.3);
    el['enemy-hp-num'].textContent = Math.max(0, Math.round(S.enemyHp)) + ' / ' + S.enemyMaxHp;
    el['player-hp-num'].textContent = Math.max(0, Math.round(S.playerHp)) + ' / ' + PLAYER_MAX_HP;
  }

  function updateGauge() {
    const r = Math.min(1, S.gauge / GAUGE_MAX);
    el['gauge-fill'].style.width = (r * 100) + '%';
    el['gauge-fill'].parentNode.classList.toggle('is-full', S.gauge >= GAUGE_MAX);
    el['combo-chip'].textContent = S.combo + 'れんぞく';
    if (S.playerTrain) S.playerTrain.classList.toggle('is-ready', S.gauge >= GAUGE_MAX);
  }

  /* ------------------------------ もんだい ------------------------------ */

  function nextQuestion() {
    if (S.playerHp <= 0 || S.enemyHp <= 0) return;
    const q = Quiz.make(S.level, S.stageIndex);
    S.question = q;
    S.locked = false;

    el['question'].innerHTML =
      '<span>' + q.a + '</span><span class="q-op">' + q.op + '</span><span>' + q.b + '</span>' +
      '<span class="q-eq">=</span><span class="q-ask">?</span>';

    /* かんたんな たしざんは ●で かぞえられる ヒントを だす */
    if (S.level === 'kantan' && q.countable) {
      el['hint'].innerHTML =
        '<span class="hint-group">' + '🚃'.repeat(q.a) + '</span>' +
        '<span class="hint-plus">+</span>' +
        '<span class="hint-group">' + '🚋'.repeat(q.b) + '</span>';
    } else {
      el['hint'].innerHTML = '';
    }

    el['choices'].innerHTML = '';
    q.choices.forEach((v) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.textContent = v;
      b.addEventListener('click', () => answer(v, b));
      el['choices'].appendChild(b);
    });

    el['verdict'].textContent = '';
    el['verdict'].className = 'verdict';

    SoundEngine.speak(q.speech, { rate: 1.0, pitch: 1.25 });
    startTimer();
  }

  /* ------------------------------ タイマー ------------------------------ */

  function setTimerRatio(r) {
    el['timer-fill'].style.width = (Math.max(0, Math.min(1, r)) * 100) + '%';
    el['timer-fill'].classList.toggle('is-hurry', r < 0.34);
  }

  function startTimer() {
    S.askedAt = performance.now();
    S.tickedAt = 0;
    stopTimer();
    const my = S.token;
    function frame(now) {
      if (my !== S.token || S.locked) return;
      const left = 1 - (now - S.askedAt) / (S.timeLimit * 1000);
      setTimerRatio(left);
      if (left < 0.34 && now - S.tickedAt > 500) {
        S.tickedAt = now;
        SoundEngine.seTick();
      }
      if (left <= 0) {
        timeUp();
        return;
      }
      S.timerId = requestAnimationFrame(frame);
    }
    S.timerId = requestAnimationFrame(frame);
  }

  function stopTimer() {
    if (S.timerId) cancelAnimationFrame(S.timerId);
    S.timerId = 0;
  }

  function timeUp() {
    if (S.locked) return;
    S.locked = true;
    stopTimer();
    setTimerRatio(0);
    revealAnswer(null);
    el['verdict'].textContent = 'じかんぎれ! こたえは ' + S.question.answer;
    el['verdict'].className = 'verdict is-ng';
    S.combo = 0;
    S.stats.wrong += 1;
    updateGauge();
    SoundEngine.seWrong();
    later(700, enemyAttack);
  }

  /* ------------------------------ こたえる ------------------------------ */

  function revealAnswer(chosenBtn) {
    const buttons = Array.prototype.slice.call(el['choices'].children);
    buttons.forEach((b) => {
      b.disabled = true;
      const v = parseInt(b.textContent, 10);
      if (v === S.question.answer) b.classList.add('is-right');
      else if (b === chosenBtn) b.classList.add('is-wrong');
      else b.classList.add('is-dim');
    });
  }

  function answer(value, btn) {
    if (S.locked) return;
    S.locked = true;
    stopTimer();
    const spent = (performance.now() - S.askedAt) / 1000;
    const fast = spent <= S.timeLimit * 0.45;
    revealAnswer(btn);

    if (value === S.question.answer) {
      S.stats.correct += 1;
      S.combo += 1;
      if (S.combo > S.bestCombo) S.bestCombo = S.combo;
      const wasFull = S.gauge >= GAUGE_MAX;
      if (!wasFull) {
        S.gauge = Math.min(GAUGE_MAX, S.gauge + 1);
        if (S.gauge >= GAUGE_MAX) SoundEngine.seReady();
        else SoundEngine.seCombo(S.combo);
      }
      updateGauge();
      el['verdict'].textContent = fast ? 'せいかい! はやい!' : 'せいかい!';
      el['verdict'].className = 'verdict is-ok';
      SoundEngine.seCorrect();
      const special = S.gauge >= GAUGE_MAX;
      later(320, () => playerAttack(fast, special));
    } else {
      S.stats.wrong += 1;
      S.combo = 0;
      updateGauge();
      el['verdict'].textContent = 'ざんねん… こたえは ' + S.question.answer;
      el['verdict'].className = 'verdict is-ng';
      SoundEngine.seWrong();
      SoundEngine.speak(S.question.a + (S.question.op === '+' ? ' たす ' : S.question.op === '-' ? ' ひく ' : ' かける ') +
        S.question.b + ' は ' + S.question.answer, { rate: 0.95, pitch: 1.2 });
      later(1100, enemyAttack);
    }
  }

  /* ============================ こうげき えんしゅつ ============================ */

  function slotCenter(slot) {
    const t = slot.querySelector('.train');
    return Fx.centerOf(t || slot);
  }

  /*
   * じぶんの こうげき
   *   fast    … はやく こたえた(クリティカル)
   *   special … ひっさつゲージ MAX
   */
  function playerAttack(fast, special) {
    const p = S.player;
    const dmgBase = 14 * p.power + S.combo * 1.5;
    let dmg = Math.round(dmgBase);
    let kind = 'normal';
    if (special) {
      dmg = Math.round(dmgBase * 2.6);
      kind = 'special';
    } else if (fast) {
      dmg = Math.round(dmgBase * 1.6);
      kind = 'crit';
    }

    setFace(S.playerTrain, 'angry');
    setFace(S.enemyTrain, 'hurt');

    if (kind === 'special') {
      specialSequence(dmg);
    } else {
      normalSequence(dmg, kind === 'crit');
    }
  }

  function normalSequence(dmg, crit) {
    const from = slotCenter(el['player-slot']);
    /* 1) ためる */
    SoundEngine.seCharge(0.34);
    play(S.playerTrain, 'is-charge', 500);
    Fx.speedLines(1, 'rgba(255,255,255,.55)', crit ? 26 : 16);
    Fx.emojiBurst(from.x, from.y, S.player.spark, crit ? 10 : 6);

    /* 2) とっしん */
    later(360, () => {
      play(S.playerTrain, 'is-attack', 700);
      if (crit) Fx.focusLines(window.innerWidth / 2, window.innerHeight * 0.42, 'rgba(255,255,255,.75)', 40);
    });

    /* 3) ヒット! */
    later(360 + 260, () => {
      const to = slotCenter(el['enemy-slot']);
      hitEffect(to, dmg, crit, S.player.color);
      damageEnemy(dmg);
    });

    later(1250, afterAttack);
  }

  function hitEffect(to, dmg, crit, color) {
    SoundEngine[crit ? 'seCritical' : 'seHit']();
    Fx.flash(crit ? '#fff3bf' : '#ffffff', crit ? 300 : 200);
    Fx.shake(crit ? 24 : 14, crit ? 520 : 380);
    Fx.disc(to.x, to.y, 'rgba(255,255,255,.95)', crit ? 260 : 180);
    Fx.ring(to.x, to.y, color, crit ? 420 : 300, crit ? 16 : 10);
    Fx.ring(to.x, to.y, '#ffffff', crit ? 300 : 210, 6);
    Fx.burst(to.x, to.y, {
      count: crit ? 90 : 52,
      power: crit ? 1.35 : 1,
      colors: [color, '#ffffff', '#ffe066', '#ff922b'],
    });
    Fx.emojiBurst(to.x, to.y, '💥', crit ? 8 : 5);
    if (crit) {
      const from = slotCenter(el['player-slot']);
      Fx.bolt(from.x, from.y, to.x, to.y, '#ffe066', 9);
      Fx.bolt(from.x, from.y + 20, to.x, to.y + 10, '#ffffff', 5);
    }
    Fx.damage(to.x, to.y - 40, dmg, crit ? 'crit' : '');
    Fx.shout(crit ? 'クリティカル!' : Quiz.pick(HIT_WORDS), crit ? 'crit' : '');
    play(S.enemyTrain, 'is-hit', 500);
  }

  /* ---------------------------- ひっさつわざ ---------------------------- */

  function specialSequence(dmg) {
    const p = S.player;
    const from = slotCenter(el['player-slot']);

    S.gauge = 0;
    updateGauge();

    /* 1) バナーと ため */
    Fx.banner('ひっさつ! ' + p.special, p.color);
    SoundEngine.seSpecial();
    SoundEngine.speak('ひっさつ! ' + p.special, { rate: 1.1, pitch: 1.3 });
    Fx.focusLines(from.x, from.y, 'rgba(255,255,255,.85)', 52);
    Fx.speedLines(1, 'rgba(255,255,255,.7)', 34);
    play(S.playerTrain, 'is-charge', 900);

    for (let i = 0; i < 5; i += 1) {
      later(120 * i, () => {
        const c = slotCenter(el['player-slot']);
        Fx.ring(c.x, c.y, p.color, 140 + i * 40, 8);
        Fx.emojiBurst(c.x, c.y, p.spark, 6);
      });
    }

    /* 2) とっしん */
    later(860, () => {
      play(S.playerTrain, 'is-attack', 760);
      Fx.speedLines(1, '#ffffff', 40);
      Fx.flash('#ffffff', 160);
    });

    /* 3) だいばくはつ */
    later(1120, () => {
      const to = slotCenter(el['enemy-slot']);
      Fx.flash('#ffffff', 420);
      Fx.shake(34, 900);
      Fx.disc(to.x, to.y, 'rgba(255,255,255,.98)', 420);
      Fx.focusLines(to.x, to.y, 'rgba(255,255,255,.8)', 60);
      [0, 130, 260, 390].forEach((d, i) => {
        later(d, () => {
          Fx.ring(to.x, to.y, i % 2 ? '#ffffff' : p.color, 380 + i * 90, 16 - i * 2);
          Fx.burst(to.x + (Math.random() - 0.5) * 120, to.y + (Math.random() - 0.5) * 90, {
            count: 70,
            power: 1.5,
            colors: [p.color, '#ffffff', '#ffe066', '#ff6b6b'],
          });
          Fx.bolt(from.x, from.y, to.x, to.y, i % 2 ? '#ffffff' : '#ffe066', 10 - i);
          SoundEngine.seHit();
        });
      });
      Fx.emojiBurst(to.x, to.y, '💥', 14);
      Fx.emojiBurst(to.x, to.y, p.spark, 14);
      Fx.damage(to.x, to.y - 50, dmg, 'crit');
      Fx.shout(p.special + '!!', 'crit');
      play(S.enemyTrain, 'is-hit', 700);
      damageEnemy(dmg);
    });

    later(2100, afterAttack);
  }

  /* ---------------------------- てきの こうげき ---------------------------- */

  function enemyAttack() {
    if (S.enemyHp <= 0 || S.playerHp <= 0) return;
    const e = S.enemy;
    const dmg = Math.max(4, Math.round((7 + Math.random() * 4) * e.power));

    setFace(S.enemyTrain, 'angry');
    setFace(S.playerTrain, 'hurt');
    el['verdict'].textContent = e.name + 'の ' + e.attack + '!';
    SoundEngine.seCharge(0.28);
    play(S.enemyTrain, 'is-charge', 460);
    Fx.speedLines(-1, 'rgba(255,255,255,.45)', 14);

    later(320, () => {
      play(S.enemyTrain, 'is-attack', 700);
    });

    later(560, () => {
      const to = slotCenter(el['player-slot']);
      SoundEngine.seDamage();
      Fx.flash('#ff8787', 240);
      Fx.shake(16, 420);
      Fx.disc(to.x, to.y, 'rgba(255,180,180,.9)', 170);
      Fx.ring(to.x, to.y, e.color, 280, 9);
      Fx.burst(to.x, to.y, { count: 46, colors: [e.color, '#ffffff', '#ff6b6b'] });
      Fx.damage(to.x, to.y - 40, dmg, '');
      Fx.shout(Quiz.pick(ENEMY_TAUNTS), 'bad');
      play(S.playerTrain, 'is-hit', 500);
      S.playerHp -= dmg;
      updateHp();
      if (S.playerHp <= 0) {
        S.playerHp = 0;
        updateHp();
        later(500, playerDown);
      }
    });

    later(1400, afterAttack);
  }

  /* ------------------------------ しんぱん ------------------------------ */

  function damageEnemy(dmg) {
    S.enemyHp -= dmg;
    if (S.enemyHp < 0) S.enemyHp = 0;
    updateHp();
  }

  function afterAttack() {
    setFace(S.playerTrain, 'normal');
    setFace(S.enemyTrain, 'normal');
    if (S.enemyHp <= 0) {
      enemyDown();
      return;
    }
    if (S.playerHp <= 0) return;
    nextQuestion();
  }

  function isLastCheck() {
    return S.stageIndex >= STAGE_COUNT - 1;
  }

  function enemyDown() {
    S.locked = true;
    stopTimer();
    const to = slotCenter(el['enemy-slot']);
    SoundEngine.seKO();
    Fx.shake(22, 700);
    Fx.flash('#ffffff', 300);
    Fx.burst(to.x, to.y, { count: 80, power: 1.3, colors: ['#ffffff', '#ffe066', S.enemy.color] });
    Fx.ring(to.x, to.y, '#ffffff', 420, 14);
    /* たおれた ままに したいので play() は つかわない(クラスは つけっぱなし) */
    S.enemyTrain.classList.add('is-ko');
    el['verdict'].textContent = S.enemy.name + 'を たおした!';
    el['verdict'].className = 'verdict is-ok';
    el['question'].textContent = isLastCheck() ? '🏆' : 'かった!';
    el['choices'].innerHTML = '';
    el['hint'].innerHTML = '';

    const isLast = isLastCheck();
    if (isLast) {
      SoundEngine.speak(BOSS.defeat, { rate: 0.9, pitch: 0.6 });
      later(1600, () => finish(true));
      return;
    }

    later(900, () => {
      /* かいふく */
      const before = S.playerHp;
      S.playerHp = Math.min(PLAYER_MAX_HP, S.playerHp + HEAL_ON_WIN);
      updateHp();
      const healed = Math.round(S.playerHp - before);
      if (healed > 0) {
        const c = slotCenter(el['player-slot']);
        Fx.damage(c.x, c.y - 40, '+' + healed, 'heal');
        Fx.emojiBurst(c.x, c.y, '💚', 8);
      }
      Fx.shout('やったー!', '');
      SoundEngine.seFanfare();
      SoundEngine.speak('やったー! つぎの あいてが やってくるよ', { rate: 1.05, pitch: 1.3 });
    });

    later(2600, () => {
      S.stageIndex += 1;
      startStage();
    });
  }

  function playerDown() {
    S.locked = true;
    stopTimer();
    S.playerTrain.classList.add('is-ko');
    SoundEngine.seKO();
    later(1200, () => finish(false));
  }

  /* ------------------------------ けっか ------------------------------ */

  function finish(win) {
    cancelAll();
    S.lost = !win;
    showScreen('screen-result');
    SoundEngine.setMood('menu');

    const total = S.stats.correct + S.stats.wrong;
    const rate = total ? Math.round((S.stats.correct / total) * 100) : 0;

    if (win) {
      el['result-title'].textContent = '🏆 チャンピオン!';
      el['result-train'].innerHTML = trainHTML(S.player, 'right');
      el['result-msg'].innerHTML =
        S.player.name + 'は ヤミカゲごうを たおした!<br>' +
        'けいさんの ちからで まちに でんきが もどったよ。';
      el['btn-again'].textContent = '▶ もういちど あそぶ';
      SoundEngine.seFanfare();
      Fx.confetti(200);
      later(700, () => Fx.confetti(140));
      SoundEngine.speak('おめでとう! チャンピオンだ!', { rate: 1.05, pitch: 1.3 });
    } else {
      el['result-title'].textContent = 'まけちゃった…';
      el['result-train'].innerHTML = trainHTML(S.enemy, 'left');
      el['result-msg'].innerHTML =
        'ステージ ' + (S.stageIndex + 1) + ' の ' + S.enemy.name + 'に まけちゃった。<br>' +
        'もういちど ちょうせん しよう!';
      el['btn-again'].textContent = '▶ もういちど たたかう';
      SoundEngine.seLose();
      SoundEngine.speak('ざんねん。もういちど ちょうせん しよう', { rate: 1.0, pitch: 1.1 });
    }

    el['result-stats'].innerHTML =
      '<div class="stat"><b>' + S.stats.correct + '</b><span>せいかい</span></div>' +
      '<div class="stat"><b>' + rate + '%</b><span>せいかいりつ</span></div>' +
      '<div class="stat"><b>' + S.bestCombo + '</b><span>さいこう れんぞく</span></div>' +
      '<div class="stat"><b>' + Math.min(S.stageIndex + (win ? 1 : 0), STAGE_COUNT) + '</b><span>すすんだ ステージ</span></div>';
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
    if (S.lost) {
      /* まけた ステージから もういちど(たいりょくは まんたん) */
      cancelAll();
      S.playerHp = PLAYER_MAX_HP;
      S.combo = 0;
      S.gauge = 0;
      showScreen('screen-battle');
      startStage();
    } else {
      showScreen('screen-level');
    }
  });

  document.querySelectorAll('[data-back]').forEach((b) => {
    b.addEventListener('click', () => {
      SoundEngine.seTap();
      cancelAll();
      Fx.clear();
      SoundEngine.setMood('menu');
      showScreen(b.dataset.back);
    });
  });

  el['btn-home'].addEventListener('click', () => {
    SoundEngine.seTap();
    SoundEngine.stopSpeak();
    cancelAll();
    Fx.clear();
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
      const b = el['choices'].children[n - 1];
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
