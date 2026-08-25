'use strict';

/*
 * えほんを うごかす ところ
 *
 *  1ページの ながれ
 *    ものがたり(ちのぶん + セリフを よみあげ)
 *      → しつもん(キャラが きく → こどもが こえ/ボタン/もじで こたえる)
 *      → へんじ(こたえに あわせて キャラが かえす)
 *      → つぎの ページへ
 */

(function () {
  const $ = (id) => document.getElementById(id);

  const el = {
    screens: {
      title: $('screen-title'),
      book: $('screen-book'),
      end: $('screen-end'),
    },
    titleArt: $('titleArt'),
    btnStart: $('btn-start'),
    btnContinue: $('btn-continue'),
    tgBgm: $('tg-bgm'),
    tgVoice: $('tg-voice'),
    tgAuto: $('tg-auto'),

    art: $('art'),
    bubble: $('bubble'),
    bubbleWho: $('bubbleWho'),
    bubbleSay: $('bubbleSay'),
    narr: $('narr'),
    pageNo: $('pageNo'),
    pageMax: $('pageMax'),

    ask: $('ask'),
    hint: $('hint'),
    heard: $('heard'),
    heardText: $('heardText'),
    btnMic: $('btn-mic'),
    btnReplay: $('btn-replay'),
    choices: $('choices'),
    typed: $('typed'),
    input: $('input'),

    btnNext: $('btn-next'),
    btnPrev: $('btn-prev'),
    btnBgm: $('btn-bgm'),
    btnVoice: $('btn-voice'),
    btnHome: $('btn-home'),

    endName: $('endName'),
    endDest: $('endDest'),
    endDate: $('endDate'),
    endBadges: $('endBadges'),
    btnAgain: $('btn-again'),
    btnTitle: $('btn-title'),
  };

  const NARRATOR = { pitch: 1.05, rate: 0.97 };
  const SAVE_KEY = 'densha-ehon-hanaseru-v1';

  const state = {
    page: 0,
    name: '',
    dest: 'sea',
    badges: [],
    phase: 'story', /* story / ask / reply */
    miss: 0,
    scene: null,
    answered: false,
    micGranted: false,
    settings: { bgm: true, voice: true, auto: true },
  };

  let timer = null;
  let guard = null;

  function clearTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (guard) clearTimeout(guard);
    guard = null;
  }

  /*
   * よみあげて、おわったら つぎへ すすむ。
   * ブラウザに よっては よみあげの おわりが かえって こない ことが あるので、
   * ながさから みつもった じかんが すぎたら、じぶんで すすめる。
   */
  function speakThen(texts, voice, cb) {
    const list = Array.isArray(texts) ? texts : [texts];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (guard) clearTimeout(guard);
      guard = null;
      if (cb) cb();
    };
    const chars = list.reduce((n, t) => n + String(t && t.text !== undefined ? t.text : t).length, 0);
    if (guard) clearTimeout(guard);
    guard = setTimeout(() => {
      Sound.stopSpeak();
      finish();
    }, Math.min(30000, 2500 + chars * 260));
    Sound.speak(list, voice, finish);
  }

  /* ============================ ほぞん ============================ */

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function save() {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          page: state.page,
          name: state.name,
          dest: state.dest,
          badges: state.badges,
          settings: state.settings,
        })
      );
    } catch (e) {
      /* ほぞんできなくても あそべる */
    }
  }

  /* ============================ ことばの けいさん ============================ */

  const KANJI_NUM = { 一: '1', 二: '2', 三: '3', 四: '4', 五: '5', 六: '6', 七: '7', 八: '8', 九: '9', 十: '10' };

  /* きこえた ことばを くらべやすい かたちに そろえる */
  function norm(s) {
    return String(s || '')
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/[一二三四五六七八九十]/g, (c) => KANJI_NUM[c])
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[\s、。,.!！?？「」『』・ーｰ〜~\-_]/g, '')
      .toLowerCase();
  }

  function matchOption(options, text) {
    const t = norm(text);
    if (!t) return null;
    let anyOpt = null;
    for (let i = 0; i < options.length; i += 1) {
      const o = options[i];
      if (o.any) {
        anyOpt = o;
        continue;
      }
      const words = o.words || [];
      for (let j = 0; j < words.length; j += 1) {
        if (t.indexOf(norm(words[j])) >= 0) return o;
      }
    }
    return anyOpt;
  }

  function cleanName(raw) {
    let t = String(raw || '').trim();
    t = t.replace(/^(わたしのなまえは|ぼくのなまえは|おれのなまえは|なまえは|名前は|わたしは|ぼくは|おれは|わたし|ぼく|おれ)/, '');
    t = t.replace(/(といいます|と言います|ともうします|です|だよ|だお|なの|だもん|よ)$/, '');
    t = t.replace(/[、。,.!！?？\s]/g, '');
    if (t.length > 8) t = t.slice(0, 8);
    return t;
  }

  function cleanAnswer(raw) {
    let t = String(raw || '').replace(/[、。,.!！?？]/g, '').trim();
    const before = t;
    t = t.replace(/(がみえます|がみえる|がみえた|みえます|みえる|みえた|があります|がある|があった|みつけた|です|だよ|かな)$/, '').trim();
    /* 「カモメが みえる」→「カモメ」。じょし は うしろを けずった ときだけ とる */
    if (t !== before) t = t.replace(/[がをはも]$/, '').trim();
    if (t.length > 12) t = t.slice(0, 12);
    return t;
  }

  /* {name} などを ほんとうの ことばに いれかえる */
  function fill(text, extra) {
    const d = DESTS[state.dest] || DESTS.sea;
    return String(text || '')
      .replace(/\{name\}/g, state.name || 'たびびとさん')
      .replace(/\{destWord\}/g, d.word)
      .replace(/\{destLong\}/g, d.long)
      .replace(/\{answer\}/g, (extra && extra.answer) || 'それ');
  }

  /* ============================ ばめんを つくる ============================ */

  function resolveScene(i) {
    const base = SCENES[i];
    if (!base) return null;
    const s = Object.assign({}, base);
    if (base.byDest) {
      const v = base.byDest[state.dest] || base.byDest.sea;
      Object.assign(s, v);
    }
    return s;
  }

  function castFor(scene, emoOverride) {
    return (scene.cast || []).map((c) => {
      const ch = CAST[c.id];
      const emo = emoOverride && emoOverride.id === c.id ? emoOverride.emo : c.emo;
      return { ch, x: c.x, s: c.s, y: c.y, emo, label: c.label };
    });
  }

  function drawScene(scene, emoOverride) {
    el.art.innerHTML = Art.scene(scene.bg, castFor(scene, emoOverride));
  }

  function showBubble(who, text) {
    const ch = CAST[who];
    el.bubbleWho.textContent = ch ? ch.name : '';
    el.bubbleWho.style.background = ch ? ch.ink : '#6b6156';
    el.bubbleSay.textContent = text;
    el.bubble.classList.remove('is-hidden');
    /* もういちど アニメーションさせる */
    el.bubble.style.animation = 'none';
    void el.bubble.offsetWidth;
    el.bubble.style.animation = '';
  }

  function voiceOf(who) {
    const ch = CAST[who];
    return (ch && ch.voice) || NARRATOR;
  }

  /* ============================ ページを ひらく ============================ */

  function openPage(i, opts) {
    clearTimer();
    Sound.stopSpeak();
    Sound.stopListen();
    state.page = Math.max(0, Math.min(SCENES.length - 1, i));
    const scene = resolveScene(state.page);
    state.scene = scene;
    state.phase = 'story';
    state.miss = 0;
    state.answered = false;

    el.pageNo.textContent = String(state.page + 1);
    drawScene(scene);
    el.narr.textContent = fill(scene.narr);

    el.ask.classList.add('is-hidden');
    el.btnNext.classList.add('is-hidden');
    el.heard.classList.add('is-hidden');
    el.choices.innerHTML = '';
    el.input.value = '';

    if (scene.bgm) Sound.playBgm(scene.bgm);
    if (scene.run) Sound.startRun(scene.run);
    else Sound.stopRun();
    if (scene.sfx && Sound.sfx[scene.sfx]) Sound.sfx[scene.sfx]();

    const lineWho = scene.line ? scene.line.who : null;
    if (scene.line) showBubble(lineWho, fill(scene.line.text));
    else el.bubble.classList.add('is-hidden');

    save();

    const texts = [{ text: fill(scene.narr), voice: NARRATOR }];
    if (scene.line) texts.push({ text: fill(scene.line.text), voice: voiceOf(lineWho) });

    if (opts && opts.silent) {
      enterAsk();
      return;
    }
    speakThen(texts, NARRATOR, () => {
      timer = setTimeout(enterAsk, 250);
    });
  }

  /* ============================ しつもん ============================ */

  function askWho() {
    const s = state.scene;
    return (s.ask && s.ask.who) || (s.line && s.line.who) || (s.cast && s.cast[0] && s.cast[0].id);
  }

  function enterAsk() {
    const scene = state.scene;
    if (!scene || !scene.ask) {
      showNext();
      return;
    }
    state.phase = 'ask';
    const ask = scene.ask;
    const who = askWho();

    el.ask.classList.remove('is-hidden');
    el.hint.textContent = ask.hint || '';
    showBubble(who, fill(ask.text));

    /* えらぶ ボタン */
    el.choices.innerHTML = '';
    (ask.options || []).forEach((o) => {
      if (!o.label) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.textContent = o.label;
      b.addEventListener('click', () => {
        Sound.sfx.pop();
        answerWith(o, o.label.replace(/^[^\wぁ-んァ-ヶ一-龠]+/, ''));
      });
      el.choices.appendChild(b);
    });
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'choice';
    skip.textContent = '⏭ とばす';
    skip.addEventListener('click', giveUp);
    el.choices.appendChild(skip);

    /* もじで こたえる らんは、なまえ と じゆうな こたえの ときに よく つかう */
    el.typed.classList.remove('is-hidden');
    el.input.placeholder = ask.kind === 'name' ? 'なまえを うつ' : 'もじで こたえる';

    if (!Sound.micSupported()) {
      el.btnMic.disabled = true;
      el.hint.textContent = 'この ブラウザでは マイクが つかえないみたい。ボタンか もじで こたえてね';
    }

    speakThen(fill(ask.text), voiceOf(who), () => {
      if (state.phase !== 'ask') return;
      if (state.micGranted) timer = setTimeout(() => listen(), 300);
    });
  }

  function listen() {
    if (state.phase !== 'ask' || !Sound.micSupported()) return;
    Sound.sfx.mic();
    el.btnMic.classList.add('is-listening');
    el.heard.classList.remove('is-hidden');
    el.heardText.textContent = '……';
    Sound.startListen({
      onPartial(t) {
        el.heardText.textContent = t;
      },
      onResult(t) {
        state.micGranted = true;
        el.heardText.textContent = t;
        handleAnswer(t);
      },
      onEnd() {
        el.btnMic.classList.remove('is-listening');
      },
      onError(kind) {
        el.btnMic.classList.remove('is-listening');
        if (kind === 'no-speech') {
          el.heardText.textContent = 'きこえなかったよ';
          return;
        }
        el.heard.classList.add('is-hidden');
        if (kind === 'not-allowed' || kind === 'service-not-allowed') {
          el.hint.textContent = 'マイクが つかえないみたい。ボタンか もじで こたえてね';
          el.btnMic.disabled = true;
        }
      },
    });
  }

  function handleAnswer(raw) {
    if (state.phase !== 'ask') return;
    const ask = state.scene.ask;
    const kind = ask.kind;

    if (kind === 'name') {
      const nm = cleanName(raw);
      if (!nm) {
        missed();
        return;
      }
      state.name = nm;
      answerWith(ask.options[0], raw);
      return;
    }
    const opt = matchOption(ask.options || [], raw);
    if (!opt) {
      missed();
      return;
    }
    answerWith(opt, raw);
  }

  function missed() {
    const ask = state.scene.ask;
    state.miss += 1;
    Sound.sfx.again();
    if (state.miss >= 2) {
      giveUp();
      return;
    }
    const who = askWho();
    const msg = fill(ask.miss || 'もういちど いってみて!');
    showBubble(who, msg);
    speakThen(msg, voiceOf(who), () => {
      if (state.phase === 'ask' && state.micGranted) timer = setTimeout(() => listen(), 300);
    });
  }

  function giveUp() {
    if (state.phase !== 'ask') return;
    const ask = state.scene.ask;
    Sound.stopListen();
    if (ask.giveSet) Object.assign(state, ask.giveSet);
    if (ask.giveBadge) addBadge(ask.giveBadge);
    if (ask.giveSfx && Sound.sfx[ask.giveSfx]) Sound.sfx[ask.giveSfx]();
    finishAsk(fill(ask.give || 'いいよ、つぎに いこう!'), 'smile');
  }

  function addBadge(name) {
    if (name && state.badges.indexOf(name) < 0) state.badges.push(name);
  }

  function answerWith(opt, raw) {
    if (state.phase !== 'ask') return;
    Sound.stopListen();
    if (opt.set) Object.assign(state, opt.set);
    if (opt.badge) addBadge(opt.badge);
    if (opt.sfx && Sound.sfx[opt.sfx]) Sound.sfx[opt.sfx]();
    const answer = cleanAnswer(raw);
    finishAsk(fill(opt.reply, { answer }), opt.emo);
  }

  function finishAsk(text, emo) {
    state.phase = 'reply';
    state.answered = true;
    const who = askWho();
    if (emo) drawScene(state.scene, { id: who, emo });
    showBubble(who, text);
    el.ask.classList.add('is-hidden');
    save();

    const after = state.scene.ask && state.scene.ask.after;
    if (after) el.narr.textContent = fill(state.scene.narr) + '\n' + fill(after);

    const texts = [{ text, voice: voiceOf(who) }];
    if (after) texts.push({ text: fill(after), voice: NARRATOR });

    showNext();
    speakThen(texts, voiceOf(who), () => {
      if (state.settings.auto && state.phase === 'reply') {
        timer = setTimeout(nextPage, 1600);
      }
    });
  }

  function showNext() {
    el.btnNext.classList.remove('is-hidden');
  }

  function nextPage() {
    clearTimer();
    if (state.page >= SCENES.length - 1) {
      showEnd();
      return;
    }
    Sound.sfx.page();
    openPage(state.page + 1);
  }

  /* ============================ おわりの がめん ============================ */

  function showEnd() {
    clearTimer();
    Sound.stopSpeak();
    Sound.stopListen();
    Sound.stopRun();
    Sound.playBgm('night');
    show('end');
    const d = DESTS[state.dest] || DESTS.sea;
    el.endName.textContent = state.name || 'たびびとさん';
    el.endDest.textContent = d.emoji + ' ' + d.word;
    const now = new Date();
    el.endDate.textContent = `${now.getFullYear()}ねん ${now.getMonth() + 1}がつ ${now.getDate()}にち`;
    el.endBadges.innerHTML = '';
    state.badges.forEach((b) => {
      const s = document.createElement('span');
      s.className = 'badge';
      s.textContent = '🏅 ' + b;
      el.endBadges.appendChild(s);
    });
    Sound.sfx.clap();
    state.page = 0;
    save();
    const msg = `${state.name || 'たびびとさん'}、きょうは ありがとう! また いっしょに たびに いこうね!`;
    setTimeout(() => Sound.speak(msg, NARRATOR), 900);
  }

  /* ============================ がめんの きりかえ ============================ */

  function show(which) {
    Object.keys(el.screens).forEach((k) => {
      el.screens[k].classList.toggle('is-on', k === which);
    });
    window.scrollTo(0, 0);
  }

  function goTitle() {
    clearTimer();
    Sound.stopSpeak();
    Sound.stopListen();
    Sound.stopRun();
    Sound.stopBgm();
    show('title');
    refreshContinue();
  }

  function refreshContinue() {
    const saved = load();
    const hasProgress = saved && saved.page > 0;
    el.btnContinue.classList.toggle('is-hidden', !hasProgress);
    if (hasProgress) {
      el.btnContinue.textContent = `↩ つづきから(${saved.page + 1}ページ)`;
    }
  }

  /* ============================ せってい ============================ */

  function applySettings() {
    Sound.setBgmEnabled(state.settings.bgm);
    Sound.setVoiceEnabled(state.settings.voice);
    setToggle(el.tgBgm, state.settings.bgm);
    setToggle(el.tgVoice, state.settings.voice);
    setToggle(el.tgAuto, state.settings.auto);
    el.btnBgm.classList.toggle('is-off', !state.settings.bgm);
    el.btnVoice.classList.toggle('is-off', !state.settings.voice);
    save();
  }

  function setToggle(btn, on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    const span = btn.querySelector('span');
    if (span) span.textContent = on ? 'オン' : 'オフ';
  }

  /* ============================ そうさ ============================ */

  el.btnStart.addEventListener('click', () => {
    Sound.unlock();
    state.name = '';
    state.dest = 'sea';
    state.badges = [];
    show('book');
    openPage(0);
  });

  el.btnContinue.addEventListener('click', () => {
    Sound.unlock();
    const saved = load();
    if (saved) {
      state.name = saved.name || '';
      state.dest = saved.dest || 'sea';
      state.badges = saved.badges || [];
      show('book');
      openPage(saved.page || 0);
    }
  });

  el.btnMic.addEventListener('click', () => {
    Sound.unlock();
    if (Sound.isListening()) {
      Sound.stopListen();
      return;
    }
    listen();
  });

  el.btnReplay.addEventListener('click', () => {
    const scene = state.scene;
    if (!scene) return;
    const who = askWho();
    if (state.phase === 'ask') Sound.speak(fill(scene.ask.text), voiceOf(who));
    else Sound.speak(el.bubbleSay.textContent, voiceOf(who));
  });

  el.typed.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const v = el.input.value.trim();
    if (!v) return;
    el.input.value = '';
    el.heard.classList.remove('is-hidden');
    el.heardText.textContent = v;
    Sound.stopListen();
    handleAnswer(v);
  });

  el.btnNext.addEventListener('click', () => {
    if (state.phase === 'ask') {
      giveUp();
      return;
    }
    nextPage();
  });

  el.btnPrev.addEventListener('click', () => {
    if (state.page === 0) {
      goTitle();
      return;
    }
    Sound.sfx.page();
    openPage(state.page - 1);
  });

  el.btnHome.addEventListener('click', goTitle);

  el.btnBgm.addEventListener('click', () => {
    state.settings.bgm = !state.settings.bgm;
    applySettings();
  });
  el.btnVoice.addEventListener('click', () => {
    state.settings.voice = !state.settings.voice;
    applySettings();
  });

  el.tgBgm.addEventListener('click', () => {
    Sound.unlock();
    state.settings.bgm = !state.settings.bgm;
    applySettings();
  });
  el.tgVoice.addEventListener('click', () => {
    state.settings.voice = !state.settings.voice;
    applySettings();
  });
  el.tgAuto.addEventListener('click', () => {
    state.settings.auto = !state.settings.auto;
    applySettings();
  });

  el.btnAgain.addEventListener('click', () => {
    Sound.unlock();
    state.name = '';
    state.dest = 'sea';
    state.badges = [];
    show('book');
    openPage(0);
  });
  el.btnTitle.addEventListener('click', goTitle);

  /* キーボードでも めくれる */
  document.addEventListener('keydown', (ev) => {
    if (!el.screens.book.classList.contains('is-on')) return;
    if (ev.target && ev.target.tagName === 'INPUT') return;
    if (ev.key === 'ArrowRight') el.btnNext.click();
    if (ev.key === 'ArrowLeft') el.btnPrev.click();
  });

  /* ============================ はじめの じゅんび ============================ */

  function init() {
    el.pageMax.textContent = String(SCENES.length);

    const saved = load();
    if (saved && saved.settings) Object.assign(state.settings, saved.settings);
    applySettings();
    refreshContinue();

    /* タイトルの え */
    el.titleArt.innerHTML = Art.scene('stationMorning', [
      { ch: CAST.yamanoten, x: 0.2, s: 0.82, emo: 'smile' },
      { ch: CAST.keikyu, x: 0.5, s: 0.82, emo: 'proud' },
      { ch: CAST.roman, x: 0.8, s: 0.82, emo: 'star' },
    ]);

    if (!Sound.ttsSupported()) {
      el.tgVoice.setAttribute('aria-pressed', 'false');
    }
  }

  init();
})();
