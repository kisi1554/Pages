'use strict';

/*
 * おべんとう づくり — 音 と よみあげ
 *
 * 音声ファイルは つかわず、Web Audio で その場で つくる。
 *   Sound.unlock()      … さいしょの タップで よぶ（ブラウザの せいげんを はずす）
 *   Sound.sfx(name)     … こうかおん（poko / pick / remove / pachin / chime / mogu / yay / hmm / kira / shake）
 *   Sound.speak(text)   … よみあげ（speechSynthesis）
 *   Sound.setOn / setVoice … オン/オフ（localStorage に おぼえる）
 */

const Sound = (() => {
  const KEY = 'obento-zukuri:sound';
  let ctx = null, master = null;
  let on = true, voice = true;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (v.on === false) on = false;
    if (v.voice === false) voice = false;
  } catch (e) { /* よめなくても オンの まま */ }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ on, voice })); } catch (e) { /* ほぞん できなくても あそべる */ }
  }
  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    return ctx;
  }
  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
  }

  function tone(freq, t0, dur, type, vol, freqEnd) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noise(t0, dur, vol, hp) {
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; f.type = 'highpass'; f.frequency.value = hp || 1200;
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }
  function bell(freq, t0, dur, vol) {
    tone(freq, t0, dur, 'sine', vol);
    tone(freq * 2.01, t0, dur * .5, 'sine', vol * .25);
    tone(freq * 3.02, t0, dur * .25, 'sine', vol * .1);
  }

  function sfx(name) {
    if (!on) return;
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const t = c.currentTime + 0.01;
    switch (name) {
      case 'poko': tone(620, t, 0.14, 'sine', 0.5, 260); tone(900, t + 0.05, 0.08, 'triangle', 0.15, 500); break;
      case 'pick': tone(880, t, 0.07, 'triangle', 0.2); break;
      case 'remove': tone(320, t, 0.12, 'sine', 0.35, 640); break;
      case 'kira': [1320, 1760, 2093].forEach((f, i) => tone(f, t + i * 0.06, 0.2, 'sine', 0.16)); break;
      case 'pachin': noise(t, 0.05, 0.55, 2500); tone(1500, t, 0.04, 'square', 0.12, 700); tone(180, t + 0.01, 0.08, 'sine', 0.35); break;
      case 'shake': [0, 0.12, 0.24].forEach((d) => noise(t + d, 0.08, 0.18, 600)); break;
      case 'chime': [659, 523, 587, 392].forEach((f, i) => bell(f, t + i * 0.42, 1.2, 0.32)); break;
      case 'mogu': tone(220, t, 0.08, 'sine', 0.3, 160); tone(250, t + 0.12, 0.08, 'sine', 0.25, 180); break;
      case 'yay': [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.1, 0.25, 'triangle', 0.22)); break;
      case 'hmm': tone(440, t, 0.12, 'sine', 0.2, 392); tone(392, t + 0.14, 0.14, 'sine', 0.18); break;
    }
  }

  let jaVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    jaVoice = vs.find((v) => /^ja/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  function speak(text) {
    if (!voice || !('speechSynthesis' in window) || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, ' '));
      u.lang = 'ja-JP'; u.rate = 0.95; u.pitch = 1.1;
      if (jaVoice) u.voice = jaVoice;
      speechSynthesis.speak(u);
    } catch (e) { /* よみあげ できない ブラウザ */ }
  }
  function stopSpeak() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* なにもしない */ } }

  return {
    unlock, sfx, speak, stopSpeak,
    get on() { return on; }, get voice() { return voice; },
    setOn(v) { on = !!v; save(); },
    setVoice(v) { voice = !!v; save(); if (!voice) stopSpeak(); },
  };
})();
