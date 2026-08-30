'use strict';

/*
 * こえ の やりとり（かんじタマゴ ばん）
 *
 *  - よみあげ: ブラウザの おんせいごうせい(SpeechSynthesis)
 *  - ききとり: おんせいにんしき(SpeechRecognition / webkitSpeechRecognition)
 *
 * どちらも ブラウザに もとから ある きのうだけを つかう。
 * サーバーには なにも おくらない（マイクの おんせいも、外へは 出ていかない）。
 * 対応していない ブラウザでは、静かに つかえないだけ（エラーには しない）。
 *
 * densha-talk/speech.js の しくみを、かんじタマゴ用に かんたんにした もの。
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

  /* ふりがな「（よみ）」を つけたまま よませると 2回よみに なるので、よみだけ のこす */
  const FURIGANA = /[「『]?([^\s「」『』()（）]{1,12})[」』]?[（(]([ぁ-んァ-ヴー・]{1,20})[)）]/g;

  function forSpeech(text) {
    return String(text)
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, ' ')
      .replace(FURIGANA, (whole, word, yomi) => yomi)
      .replace(/[「」『』()()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const speakState = { queue: [], busy: false, onDone: null };

  function speakNext() {
    if (!window.speechSynthesis) {
      speakState.busy = false;
      const done = speakState.onDone; speakState.onDone = null;
      if (done) done();
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
   * texts : よみあげる 文、または 文の はいれつ
   * voice : { pitch, rate } その子の こえ（キャラごとに 少しずつ かえる）
   * onDone: ぜんぶ よみおわったら よばれる
   */
  function speak(texts, voice, onDone) {
    stopSpeak();
    if (!voiceOn || !window.speechSynthesis) {
      if (onDone) onDone();
      return;
    }
    const list = Array.isArray(texts) ? texts : [texts];
    const v = voice || {};
    list.forEach((text) => {
      speakState.queue.push({ text: text, pitch: v.pitch || 1.15, rate: v.rate || 0.98 });
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
  const handlers = { result: null, end: null, error: null };

  function ensureRecog() {
    if (recog || !Recognition) return recog;
    recog = new Recognition();
    recog.lang = 'ja-JP';
    recog.continuous = false;
    recog.interimResults = false;
    recog.maxAlternatives = 1;

    recog.onresult = (ev) => {
      let finalText = '';
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript;
      }
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
      try { recog.stop(); } catch (e) { /* すでに とまっている */ }
    }
    listening = false;
  }

  return {
    speak,
    stopSpeak,
    isSpeaking: () => speakState.busy,
    startListen,
    stopListen,
    isListening: () => listening,
    micSupported: () => !!Recognition,
    ttsSupported: () => !!window.speechSynthesis,
    setVoiceEnabled(v) {
      voiceOn = !!v;
      if (!voiceOn) stopSpeak();
    },
    isVoiceEnabled: () => voiceOn,
  };
})();
