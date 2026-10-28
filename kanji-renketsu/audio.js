'use strict';

/* かんじ れんけつ - 音
 *  効果音 は ぜんぶ WebAudio の 合成音（音声 ファイル は つかわない）。
 *    gachan  … 連結器 が はまる「ガチャン！」
 *    pushu   … まちがい。エアー が ぬける「ぷしゅー」
 *    bell    … 発車 ベル ふう
 *    chime   … とうちゃく チャイム
 *    pon     … スタンプ の「ぽん」
 *    ok / ng / tap / fanfare
 *  よみあげ は speechSynthesis（オン/オフ）。
 */

const Sound = (() => {
  let ctx = null;
  let enabled = true;
  let voiceOn = true;

  function ac() {
    if (!enabled) return null;
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  function tone(freq, start, dur, type, vol, endFreq) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(start, dur, vol, f1, f2, q, type) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + start;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const flt = c.createBiquadFilter();
    flt.type = type || 'bandpass';
    flt.frequency.setValueAtTime(f1, t);
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + dur);
    flt.Q.value = q || 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + dur + 0.05);
  }

  const fx = {
    tap() { tone(880, 0, 0.06, 'triangle', 0.08); },
    gachan() {
      // ガッ（金属 の あたる 音）＋ チャン（ひびき）
      noise(0, 0.08, 0.5, 1800, 600, 2);
      tone(180, 0, 0.12, 'square', 0.18, 90);
      noise(0.09, 0.12, 0.35, 3200, 2000, 6);
      tone(1250, 0.09, 0.35, 'triangle', 0.12);
      tone(1870, 0.1, 0.3, 'sine', 0.07);
    },
    pushu() {
      noise(0, 0.6, 0.35, 5000, 700, 0.8, 'highpass');
      tone(320, 0, 0.4, 'sine', 0.06, 160);
    },
    ok() { tone(988, 0, 0.12, 'triangle', 0.18); tone(1319, 0.11, 0.25, 'triangle', 0.18); },
    ng() { tone(220, 0, 0.18, 'square', 0.08); tone(196, 0.16, 0.25, 'square', 0.08); },
    bell() {
      // ジリリリ… と なる 発車 ベル ふう（はやい トレモロ）
      for (let i = 0; i < 14; i++) {
        tone(1560, i * 0.07, 0.06, 'square', 0.06);
        tone(2080, i * 0.07 + 0.02, 0.05, 'square', 0.04);
      }
    },
    chime() {
      // ピン ポン パン ポーン
      [[784, 0], [988, 0.28], [1175, 0.56], [1568, 0.84]].forEach(([f, s], i) => tone(f, s, i === 3 ? 0.9 : 0.5, 'sine', 0.2));
    },
    pon() { tone(520, 0, 0.12, 'sine', 0.3, 260); noise(0, 0.06, 0.2, 900, 400, 1); },
    fanfare() {
      [[523, 0], [659, 0.14], [784, 0.28], [1047, 0.42], [784, 0.62], [1047, 0.76]].forEach(([f, s], i) =>
        tone(f, s, i === 5 ? 0.6 : 0.16, 'triangle', 0.18));
    },
    run() {
      // ガタン ゴトン
      for (let i = 0; i < 4; i++) { noise(i * 0.3, 0.07, 0.25, 500, 300, 2); noise(i * 0.3 + 0.12, 0.07, 0.2, 400, 250, 2); }
    },
  };

  let jaVoice = null;
  function pickVoice() {
    try {
      const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
      jaVoice = vs.find((v) => /^ja/i.test(v.lang)) || null;
    } catch (e) { jaVoice = null; }
  }
  try { if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } } catch (e) { /* なし */ }

  function speak(text) {
    if (!voiceOn || !text) return;
    try {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = 0.9;
      if (jaVoice) u.voice = jaVoice;
      speechSynthesis.speak(u);
    } catch (e) { /* よみあげ でき なくても とまらない */ }
  }

  return {
    play(name) { try { if (enabled && fx[name]) fx[name](); } catch (e) { /* むし */ } },
    speak,
    unlock() { ac(); },
    get enabled() { return enabled; },
    set enabled(v) { enabled = !!v; },
    get voice() { return voiceOn; },
    set voice(v) { voiceOn = !!v; if (!v) { try { speechSynthesis.cancel(); } catch (e) { /* むし */ } } },
  };
})();
