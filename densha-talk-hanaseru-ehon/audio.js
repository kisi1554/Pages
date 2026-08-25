'use strict';

/*
 * おと の ぜんぶ
 *  - BGM   : Web Audio API で その場で えんそうする(おんげんファイル ふよう)
 *  - こうかおん: はっしゃベル・ふみきり・ドア・はしる おと など
 *  - よみあげ  : ブラウザの おんせいごうせい(SpeechSynthesis)
 *  - ききとり  : おんせいにんしき(SpeechRecognition)
 *
 * サーバーには なにも おくらない。ぜんぶ たんまつの なかだけで うごく。
 */

const Sound = (function () {
  let ctx = null;
  let master = null;
  let bgmGain = null;
  let sfxGain = null;

  let bgmOn = true;
  let voiceOn = true;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0;
    bgmGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.9;
    sfxGain.connect(master);
    return ctx;
  }

  /* さいしょの タップで おとを ならせるように する(スマホの きまり) */
  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
    return c;
  }

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  /* ============================ こうかおん ============================ */

  function tone(hz, at, dur, type, gain, target) {
    const c = ensure();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(hz, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g);
    g.connect(target || sfxGain);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  /* ざーっという ノイズ(はしる おと・はくしゅ に つかう) */
  function noiseBuffer(sec) {
    const c = ensure();
    const len = Math.floor(c.sampleRate * sec);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function noiseHit(at, dur, freq, gain, q, target) {
    const c = ensure();
    if (!c) return;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(Math.max(dur, 0.05));
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q || 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(target || sfxGain);
    src.start(at);
    src.stop(at + dur + 0.05);
  }

  const SFX = {
    /* はっしゃベル */
    bell() {
      const c = unlock();
      if (!c) return;
      const t = c.currentTime;
      [880, 1174.7, 1318.5, 1567.9].forEach((hz, i) => tone(hz, t + i * 0.12, 0.5, 'sine', 0.16));
      tone(1046.5, t + 0.5, 0.7, 'sine', 0.12);
    },
    /* ドアの あく おと */
    door() {
      const c = unlock();
      if (!c) return;
      const t = c.currentTime;
      tone(1318.5, t, 0.14, 'sine', 0.12);
      tone(1046.5, t + 0.16, 0.14, 'sine', 0.12);
      noiseHit(t + 0.34, 0.5, 700, 0.08, 0.7);
    },
    /* ふみきりの カンカン */
    crossing() {
      const c = unlock();
      if (!c) return;
      const t = c.currentTime;
      for (let i = 0; i < 8; i += 1) {
        tone(i % 2 ? 1046.5 : 1244.5, t + i * 0.24, 0.2, 'square', 0.07);
      }
    },
    /* せいかい */
    ok() {
      const c = unlock();
      if (!c) return;
      const t = c.currentTime;
      tone(783.99, t, 0.16, 'sine', 0.18);
      tone(987.77, t + 0.12, 0.18, 'sine', 0.18);
      tone(1318.5, t + 0.26, 0.42, 'sine', 0.18);
    },
    /* もういちど */
    again() {
      const c = unlock();
      if (!c) return;
      const t = c.currentTime;
      tone(587.33, t, 0.16, 'triangle', 0.13);
      tone(493.88, t + 0.14, 0.28, 'triangle', 0.13);
    },
    /* ページを めくる */
    page() {
      const c = unlock();
      if (!c) return;
      noiseHit(c.currentTime, 0.22, 2100, 0.05, 0.8);
    },
    /* マイク オン */
    mic() {
      const c = unlock();
      if (!c) return;
      const t = c.currentTime;
      tone(659.25, t, 0.1, 'sine', 0.12);
      tone(880, t + 0.09, 0.14, 'sine', 0.12);
    },
    /* ぽこっ */
    pop() {
      const c = unlock();
      if (!c) return;
      tone(520, c.currentTime, 0.09, 'triangle', 0.09);
    },
    /* きらきら(バッジ・おわり) */
    sparkle() {
      const c = unlock();
      if (!c) return;
      const t = c.currentTime;
      [1046.5, 1318.5, 1567.9, 2093].forEach((hz, i) => tone(hz, t + i * 0.08, 0.5, 'sine', 0.1));
    },
    /* はくしゅ */
    clap() {
      const c = unlock();
      if (!c) return;
      const t = c.currentTime;
      for (let i = 0; i < 14; i += 1) {
        noiseHit(t + i * 0.07 + Math.random() * 0.03, 0.12, 1400 + Math.random() * 900, 0.05, 0.9);
      }
    },
  };

  /* ============================ はしる おと ============================ */
  /* ガタン ゴトン。BGM とは べつに ながして おける */

  const runNoise = { timer: null, on: false, gap: 0.6 };

  function clack(at, gain) {
    noiseHit(at, 0.1, 220, gain, 0.9);
    noiseHit(at + 0.13, 0.09, 180, gain * 0.8, 0.9);
  }

  function startRun(speed) {
    const c = unlock();
    if (!c || !bgmOn) return;
    const gap = speed === 'fast' ? 0.42 : 0.62;
    if (runNoise.on && runNoise.gap === gap) return;
    stopRun();
    runNoise.on = true;
    runNoise.gap = gap;
    let next = c.currentTime + 0.1;
    runNoise.timer = setInterval(() => {
      if (!ctx) return;
      const now = ctx.currentTime;
      while (next < now + 0.4) {
        clack(next, 0.06);
        next += gap;
      }
    }, 120);
  }

  function stopRun() {
    runNoise.on = false;
    if (runNoise.timer) clearInterval(runNoise.timer);
    runNoise.timer = null;
  }

  /* ============================ BGM ============================ */

  /*
   * きょくは その場で つくる。
   * chords: わおん(MIDI ばんごう)、scale: メロディに つかう おと。
   * メロディは ペンタトニック(ヨナぬき)から えらぶので、
   * てきとうに ならしても はずれた かんじに ならない。
   */
  const MOODS = {
    morning: {
      bpm: 100,
      wave: 'triangle',
      chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]],
      scale: [72, 74, 76, 79, 81, 84],
      bass: true,
    },
    run: {
      bpm: 138,
      wave: 'square',
      chords: [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]],
      scale: [72, 76, 79, 81, 84, 88],
      bass: true,
      punchy: true,
    },
    tunnel: {
      bpm: 84,
      wave: 'sine',
      chords: [[57, 60, 64], [53, 57, 60], [55, 58, 62], [56, 60, 63]],
      scale: [69, 72, 74, 76, 79],
      bass: true,
    },
    sea: {
      bpm: 104,
      wave: 'triangle',
      chords: [[65, 69, 72], [60, 64, 67], [67, 71, 74], [69, 72, 76]],
      scale: [72, 74, 77, 79, 81, 84],
      bass: true,
    },
    night: {
      bpm: 68,
      wave: 'sine',
      chords: [[60, 64, 67], [64, 67, 71], [65, 69, 72], [67, 71, 74]],
      scale: [72, 74, 76, 79, 81],
      bass: false,
    },
  };

  const BGM_VOL = 0.34;
  const bgm = { mood: null, timer: null, step: 0, next: 0, seed: 1 };

  function rnd() {
    bgm.seed = (bgm.seed * 16807) % 2147483647;
    return (bgm.seed - 1) / 2147483646;
  }

  function scheduleStep(m, step, at) {
    const chord = m.chords[Math.floor(step / 8) % m.chords.length];
    const beat = step % 8;

    /* わおん(2はくに 1かい、やわらかく) */
    if (beat === 0 || beat === 4) {
      chord.forEach((n, i) => {
        tone(midi(n + 12), at + i * 0.012, 1.1, m.wave, 0.045, bgmGain);
      });
    }
    /* ベース */
    if (m.bass && (beat === 0 || beat === 3 || beat === 6)) {
      tone(midi(chord[0] - 12), at, 0.5, 'sine', 0.08, bgmGain);
    }
    /* メロディ */
    if (beat % 2 === 0 || rnd() > 0.55) {
      const n = m.scale[Math.floor(rnd() * m.scale.length)];
      tone(midi(n), at, m.punchy ? 0.22 : 0.34, m.wave, 0.05, bgmGain);
    }
    /* かるい リズム */
    if (m.punchy && beat % 2 === 1) {
      noiseHit(at, 0.05, 5200, 0.014, 1.4, bgmGain);
    }
  }

  function fade(node, to, sec) {
    if (!node || !ctx) return;
    const now = ctx.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(node.gain.value, now);
    node.gain.linearRampToValueAtTime(to, now + (sec || 0.6));
  }

  function stopBgmTimer() {
    if (bgm.timer) clearInterval(bgm.timer);
    bgm.timer = null;
  }

  function playBgm(mood) {
    if (!MOODS[mood]) return;
    if (bgm.mood === mood && bgm.timer) return;
    const c = unlock();
    if (!c) return;
    stopBgmTimer();
    bgm.mood = mood;
    bgm.step = 0;
    bgm.seed = 12345;
    bgm.next = c.currentTime + 0.12;
    const m = MOODS[mood];
    const unit = 60 / m.bpm / 2; /* 8ぶおんぷ 1つぶん */
    if (bgmOn) fade(bgmGain, BGM_VOL, 1.2);
    bgm.timer = setInterval(() => {
      if (!ctx) return;
      const now = ctx.currentTime;
      while (bgm.next < now + 0.35) {
        scheduleStep(m, bgm.step, bgm.next);
        bgm.step += 1;
        bgm.next += unit;
      }
    }, 60);
  }

  function stopBgm() {
    fade(bgmGain, 0, 0.5);
    setTimeout(stopBgmTimer, 520);
    bgm.mood = null;
  }

  function setBgmEnabled(v) {
    bgmOn = !!v;
    if (!bgmOn) {
      fade(bgmGain, 0, 0.35);
      stopRun();
    } else if (bgm.mood) {
      fade(bgmGain, BGM_VOL, 0.6);
    }
  }

  /* ============================ よみあげ ============================ */

  let jaVoice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return null;
    jaVoice =
      voices.find((v) => v.lang === 'ja-JP' && /Kyoko|O-ren|Google|Otoya/i.test(v.name)) ||
      voices.find((v) => v.lang === 'ja-JP') ||
      voices.find((v) => (v.lang || '').indexOf('ja') === 0) ||
      null;
    return jaVoice;
  }
  if (window.speechSynthesis) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  /* えもじ や かっこは よまない。「かんじ(よみ)」は よみだけ のこす */
  const FURIGANA = /[「『]?([^\s「」『』()（）]{1,12})[」』]?[（(]([ぁ-んァ-ヴー・]{1,20})[)）]/g;
  function forSpeech(text) {
    return String(text)
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, ' ')
      .replace(FURIGANA, (whole, word, yomi) => yomi)
      .replace(/[「」『』()()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const say = { queue: [], busy: false, onDone: null };

  function finishSpeak() {
    say.busy = false;
    const d = say.onDone;
    say.onDone = null;
    if (bgmOn && bgm.mood) fade(bgmGain, BGM_VOL, 0.8);
    if (d) d();
  }

  function speakNext() {
    if (!window.speechSynthesis) {
      finishSpeak();
      return;
    }
    const item = say.queue.shift();
    if (!item) {
      finishSpeak();
      return;
    }
    const body = forSpeech(item.text);
    if (!body) {
      speakNext();
      return;
    }
    const u = new SpeechSynthesisUtterance(body);
    u.lang = 'ja-JP';
    if (!jaVoice) pickVoice();
    if (jaVoice) u.voice = jaVoice;
    u.pitch = item.pitch;
    u.rate = item.rate;
    u.volume = 1;
    u.onend = speakNext;
    u.onerror = speakNext;
    window.speechSynthesis.speak(u);
  }

  /*
   * texts: もじれつ、または { text, voice } の はいれつ
   *        ({ text, voice } なら、ぶんごとに こえを かえられる)
   * voice: { pitch, rate } いつもの キャラの こえ
   */
  function speak(texts, voice, onDone) {
    stopSpeak();
    if (!voiceOn || !window.speechSynthesis) {
      if (onDone) onDone();
      return;
    }
    const list = Array.isArray(texts) ? texts : [texts];
    const v = voice || {};
    list.forEach((item) => {
      const isObj = item && typeof item === 'object';
      const own = (isObj && item.voice) || v;
      say.queue.push({
        text: isObj ? item.text : item,
        pitch: own.pitch || 1.15,
        rate: own.rate || 0.95,
      });
    });
    say.onDone = onDone || null;
    say.busy = true;
    /* よみあげの あいだは BGM を すこし しずかに */
    if (bgmOn && bgm.mood) fade(bgmGain, 0.14, 0.3);
    speakNext();
  }

  function stopSpeak() {
    const had = say.busy;
    say.queue.length = 0;
    say.busy = false;
    say.onDone = null;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (had && bgmOn && bgm.mood) fade(bgmGain, BGM_VOL, 0.5);
  }

  /* ============================ ききとり ============================ */

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null;
  let listening = false;
  const handlers = { result: null, partial: null, end: null, error: null };

  function ensureRecog() {
    if (recog || !Recognition) return recog;
    recog = new Recognition();
    recog.lang = 'ja-JP';
    recog.continuous = false;
    recog.interimResults = true;
    recog.maxAlternatives = 1;
    recog.onresult = (ev) => {
      let finalText = '';
      let partial = '';
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else partial += r[0].transcript;
      }
      if (partial && handlers.partial) handlers.partial(partial);
      if (finalText && handlers.result) handlers.result(finalText.trim());
    };
    recog.onerror = (ev) => {
      listening = false;
      if (handlers.error) handlers.error(ev.error);
    };
    recog.onend = () => {
      listening = false;
      if (handlers.end) handlers.end();
    };
    return recog;
  }

  function startListen(opts) {
    const o = opts || {};
    handlers.result = o.onResult || null;
    handlers.partial = o.onPartial || null;
    handlers.end = o.onEnd || null;
    handlers.error = o.onError || null;
    const r = ensureRecog();
    if (!r) {
      if (handlers.error) handlers.error('unsupported');
      return false;
    }
    if (listening) return true;
    stopSpeak(); /* じぶんの こえを ひろわないように */
    try {
      r.start();
      listening = true;
      return true;
    } catch (e) {
      listening = false;
      if (handlers.error) handlers.error('start-failed');
      return false;
    }
  }

  function stopListen() {
    if (recog && listening) {
      try {
        recog.stop();
      } catch (e) {
        /* すでに とまっている */
      }
    }
    listening = false;
  }

  return {
    unlock,
    sfx: SFX,
    startRun,
    stopRun,
    playBgm,
    stopBgm,
    setBgmEnabled,
    isBgmEnabled: () => bgmOn,
    speak,
    stopSpeak,
    isSpeaking: () => say.busy,
    setVoiceEnabled(v) {
      voiceOn = !!v;
      if (!voiceOn) stopSpeak();
    },
    isVoiceEnabled: () => voiceOn,
    ttsSupported: () => !!window.speechSynthesis,
    micSupported: () => !!Recognition,
    startListen,
    stopListen,
    isListening: () => listening,
  };
})();
