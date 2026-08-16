'use strict';

/*
 * こえ の やりとり
 *  - よみあげ: ブラウザの おんせいごうせい(SpeechSynthesis)
 *  - ききとり: おんせいにんしき(SpeechRecognition / webkitSpeechRecognition)
 *  - こうかおん: Web Audio API で その場で つくる(おんげんファイル ふよう)
 *
 * どれも ブラウザの きのう だけを つかう。サーバーには なにも おくらない。
 */

const Speech = (function () {
  /* ============================ よみあげ ============================ */

  let jaVoice = null;
  let voiceOn = true;

  function pickVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    jaVoice =
      voices.find((v) => v.lang === 'ja-JP' && /Kyoko|O-ren|Google/i.test(v.name)) ||
      voices.find((v) => v.lang === 'ja-JP') ||
      voices.find((v) => (v.lang || '').indexOf('ja') === 0) ||
      null;
    return jaVoice;
  }

  if (window.speechSynthesis) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  /* よみあげの じゃまに なる きごう・絵文字を とる */
  function forSpeech(text) {
    return String(text)
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, ' ')
      .replace(/[「」『』()()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const speakState = { queue: [], busy: false, onDone: null };

  function speakNext() {
    if (!window.speechSynthesis) {
      speakState.busy = false;
      if (speakState.onDone) speakState.onDone();
      return;
    }
    const item = speakState.queue.shift();
    if (!item) {
      speakState.busy = false;
      const done = speakState.onDone;
      speakState.onDone = null;
      if (done) done();
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
    u.rate = item.rate;
    u.pitch = item.pitch;
    u.volume = 1;
    u.onend = speakNext;
    u.onerror = speakNext;
    window.speechSynthesis.speak(u);
  }

  /*
   * texts: よみあげる ぶんの はいれつ
   * voice: { pitch, rate } キャラごとの こえ
   * onDone: ぜんぶ よみおわったら よばれる(マイクを もどす ため)
   */
  function speak(texts, voice, onDone) {
    stopSpeak();
    if (!voiceOn || !window.speechSynthesis) {
      if (onDone) onDone();
      return;
    }
    const list = Array.isArray(texts) ? texts : [texts];
    const v = voice || {};
    list.forEach((t) => {
      speakState.queue.push({
        text: t,
        pitch: v.pitch || 1.2,
        rate: v.rate || 0.95,
      });
    });
    speakState.onDone = onDone || null;
    speakState.busy = true;
    speakNext();
  }

  function stopSpeak() {
    speakState.queue.length = 0;
    speakState.busy = false;
    speakState.onDone = null;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  /* ============================ ききとり ============================ */

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null;
  let listening = false;
  const handlers = { result: null, partial: null, end: null, error: null };

  function supported() {
    return !!Recognition;
  }

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
    stopSpeak(); // じぶんの こえを ひろわないように
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

  /* ============================ こうかおん ============================ */

  let ctx = null;

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  }

  function blip(hz, at, dur, type, gain) {
    const c = ensureCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(hz, at);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain || 0.18, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  const SFX = {
    /* 発車ベル風 */
    depart() {
      const c = ensureCtx();
      if (!c || !voiceOn) return;
      const t = c.currentTime;
      [880, 1174, 1318].forEach((hz, i) => blip(hz, t + i * 0.09, 0.22, 'sine', 0.12));
    },
    /* ピンポン(せいかい) */
    ok() {
      const c = ensureCtx();
      if (!c || !voiceOn) return;
      const t = c.currentTime;
      blip(988, t, 0.16, 'sine', 0.16);
      blip(1319, t + 0.14, 0.3, 'sine', 0.16);
    },
    /* マイク オン */
    listen() {
      const c = ensureCtx();
      if (!c || !voiceOn) return;
      const t = c.currentTime;
      blip(660, t, 0.1, 'sine', 0.12);
      blip(880, t + 0.08, 0.14, 'sine', 0.12);
    },
    /* ふきだしが でる ぽこっ */
    pop() {
      const c = ensureCtx();
      if (!c || !voiceOn) return;
      blip(520, c.currentTime, 0.09, 'triangle', 0.08);
    },
  };

  return {
    speak,
    stopSpeak,
    isSpeaking: () => speakState.busy,
    startListen,
    stopListen,
    isListening: () => listening,
    micSupported: supported,
    ttsSupported: () => !!window.speechSynthesis,
    unlock: ensureCtx,
    sfx: SFX,
    setVoiceEnabled(v) {
      voiceOn = !!v;
      if (!voiceOn) stopSpeak();
    },
    isVoiceEnabled: () => voiceOn,
  };
})();
