'use strict';

/*
 * おと（おんげんファイルは つかわず、その場で つくる）
 *   こうかおん … Web Audio API
 *   よみあげ   … ブラウザの おんせいごうせい(日本語)。まだ 字が よめない 子のため
 */

const Snd = (function () {
  let ctx = null, se = null;
  let seOn = true, voiceOn = true;

  function ready() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    se = ctx.createGain();
    se.gain.value = 0.5;
    se.connect(ctx.destination);
    return true;
  }

  function tone(t, hz, dur, type, gain) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(hz, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.35, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(se);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function seq(notes) {
    if (!seOn || !ready()) return;
    const t0 = ctx.currentTime + 0.01;
    notes.forEach((n) => tone(t0 + n[2], n[0], n[1], n[3], n[4]));
  }

  /* ------------------------------ よみあげ ------------------------------ */

  let jaVoice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return null;
    const vs = speechSynthesis.getVoices();
    jaVoice = vs.find((v) => v.lang === 'ja-JP') || vs.find((v) => /^ja/.test(v.lang)) || null;
    return jaVoice;
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  function speak(text) {
    if (!voiceOn || !window.speechSynthesis || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/\s+/g, ' '));
      u.lang = 'ja-JP';
      u.rate = 0.95;
      u.pitch = 1.15;
      if (jaVoice || pickVoice()) u.voice = jaVoice;
      speechSynthesis.speak(u);
    } catch (e) { /* しゃべれなくても あそべる */ }
  }

  function shutUp() {
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* noop */ }
  }

  return {
    unlock: ready,
    tap:     () => seq([[520, 0.07, 0, 'triangle', 0.25]]),
    ok:      () => seq([[784, 0.12, 0, 'triangle'], [1046, 0.18, 0.09, 'triangle']]),
    ng:      () => seq([[300, 0.16, 0, 'sawtooth', 0.18], [220, 0.22, 0.12, 'sawtooth', 0.16]]),
    tamed:   () => seq([[659, 0.1, 0, 'triangle'], [880, 0.1, 0.09, 'triangle'], [1174, 0.26, 0.18, 'triangle']]),
    fanfare: () => seq([[523, 0.12, 0, 'square', 0.22], [659, 0.12, 0.11, 'square', 0.22],
                        [784, 0.12, 0.22, 'square', 0.22], [1046, 0.34, 0.33, 'square', 0.24]]),
    depart:  () => seq([[440, 0.16, 0, 'sine', 0.28], [587, 0.3, 0.14, 'sine', 0.26]]),
    speak: speak,
    shutUp: shutUp,
    setSe:    (v) => { seOn = !!v; },
    setVoice: (v) => { voiceOn = !!v; if (!v) shutUp(); },
  };
})();
