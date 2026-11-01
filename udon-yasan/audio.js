'use strict';

/*
 * おと（おんせい ファイルは つかわない。Web Audio で その ばで つくる）
 *  - BGM: オリジナルの のんびり わふう ループ（ペンタトニック。こと ふうの はじく おと）
 *  - こうかおん: ぐつぐつ・じゅわー・ちゃっちゃっ・とぽとぽ・とんとん・ぽすぽす・ちーん・ちゃりん など
 *  - こえ: ブラウザの よみあげ（speechSynthesis）
 *  🎵 BGM・🔊 こうかおん・🗣 こえ を べつべつに オン/オフ できる。
 */
const Sound = (() => {
  let ctx = null;
  let master = null;
  let bgmGain = null;
  let sfxGain = null;
  let noiseBuf = null;
  const on = { bgm: true, sfx: true, voice: true };
  const loops = {};
  let bgmTimer = null;
  let bgmNext = 0;
  let bgmStep = 0;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    bgmGain = ctx.createGain();
    bgmGain.gain.value = on.bgm ? 0.22 : 0;
    bgmGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = on.sfx ? 0.8 : 0;
    sfxGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
    return c;
  }
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function tone(hz, at, dur, type, gain, dest, glideTo) {
    const c = ensure();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(hz, at);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(dest || sfxGain);
    o.start(at);
    o.stop(at + dur + 0.05);
  }
  function noise(at, dur, freq, q, gain, type) {
    const c = ensure();
    if (!c) return;
    const s = c.createBufferSource();
    s.buffer = noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q || 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f); f.connect(g); g.connect(sfxGain);
    s.start(at, Math.random());
    s.stop(at + dur + 0.05);
  }
  /* こと ふうの はじく おと */
  function pluck(hz, at, dur, gain, dest) {
    tone(hz, at, dur, 'triangle', gain, dest);
    tone(hz * 2, at, dur * 0.5, 'sine', gain * 0.35, dest);
  }

  const SFX = {
    tap: (t) => tone(880, t, 0.08, 'sine', 0.15),
    pop: (t) => tone(500, t, 0.12, 'sine', 0.25, null, 900),
    plop: (t) => { tone(300, t, 0.15, 'sine', 0.3, null, 140); noise(t, 0.2, 900, 2, 0.15); },
    drain: (t) => { noise(t, 0.09, 2500, 3, 0.3); noise(t + 0.13, 0.09, 2200, 3, 0.3); },
    splash: (t) => noise(t, 0.35, 1200, 0.8, 0.35),
    pour: (t) => { for (let i = 0; i < 4; i += 1) tone(420 + i * 30, t + i * 0.09, 0.08, 'sine', 0.18, null, 260); },
    sprinkle: (t) => { for (let i = 0; i < 5; i += 1) noise(t + i * 0.04, 0.03, 5000, 4, 0.12); },
    cut: (t) => { tone(160, t, 0.07, 'square', 0.15); noise(t, 0.05, 3000, 2, 0.2); },
    step: (t) => { tone(110, t, 0.12, 'sine', 0.35, null, 70); noise(t, 0.08, 400, 1, 0.12); },
    knead: (t) => noise(t, 0.12, 300, 1, 0.15),
    roll: (t) => noise(t, 0.25, 600, 0.7, 0.12),
    chin: (t) => { tone(1568, t, 0.9, 'sine', 0.3); tone(2093, t + 0.02, 0.9, 'sine', 0.2); },
    coin: (t) => { tone(2400, t, 0.12, 'triangle', 0.18); tone(3200, t + 0.05, 0.2, 'triangle', 0.14); },
    good: (t) => [72, 76, 79, 84].forEach((n, i) => pluck(midi(n), t + i * 0.08, 0.35, 0.22)),
    soft: (t) => [67, 64].forEach((n, i) => pluck(midi(n), t + i * 0.14, 0.4, 0.18)),
    ding: (t) => { pluck(midi(81), t, 0.5, 0.25); pluck(midi(86), t + 0.12, 0.6, 0.22); },
    stamp: (t) => { tone(90, t, 0.2, 'sine', 0.5, null, 50); noise(t, 0.1, 800, 1, 0.3); },
    purr: (t) => { for (let i = 0; i < 6; i += 1) tone(45, t + i * 0.13, 0.11, 'sawtooth', 0.12); },
    whoosh: (t) => noise(t, 0.3, 700, 0.6, 0.15, 'lowpass'),
    fryIn: (t) => noise(t, 0.6, 3500, 0.5, 0.35, 'highpass'),
  };
  function sfx(name) {
    const c = unlock();
    if (!c || !on.sfx || !SFX[name]) return;
    SFX[name](c.currentTime + 0.01);
  }

  /* つづく おと: boil（ぐつぐつ）・fry（じゅわー）。level 0..1 */
  function loop(name, level) {
    const c = ensure();
    if (!c) return;
    let L = loops[name];
    if (level <= 0) {
      if (L) {
        L.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.08);
        const s = L.s;
        setTimeout(() => { try { s.stop(); } catch (e) { /* もう とまって いる */ } }, 400);
        delete loops[name];
      }
      return;
    }
    if (!L) {
      const s = c.createBufferSource();
      s.buffer = noiseBuf;
      s.loop = true;
      const f = c.createBiquadFilter();
      const g = c.createGain();
      g.gain.value = 0.0001;
      if (name === 'boil') { f.type = 'lowpass'; f.frequency.value = 380; f.Q.value = 6; } else { f.type = 'highpass'; f.frequency.value = 2600; f.Q.value = 0.4; }
      s.connect(f); f.connect(g); g.connect(sfxGain);
      s.start();
      L = { s, f, g };
      loops[name] = L;
      if (name === 'boil') {
        L.bub = setInterval(() => { if (loops.boil && on.sfx) tone(180 + Math.random() * 200, c.currentTime, 0.06, 'sine', 0.08, null, 400); }, 260);
        const old = L.s.onended;
        L.s.onended = () => { clearInterval(L.bub); if (old) old(); };
      }
    }
    const v = name === 'boil' ? 0.5 * level : 0.12 + 0.35 * level;
    L.g.gain.setTargetAtTime(v, c.currentTime, 0.1);
  }
  function stopLoops() { Object.keys(loops).forEach((k) => loop(k, 0)); }

  /* BGM（ド・レ・ミ・ソ・ラ の ペンタトニック。16はく × 2 の ループ） */
  const MEL = [
    74, -1, 76, 79, 81, -1, 79, 76, 74, -1, 72, 74, 76, -1, -1, -1,
    79, -1, 81, 84, 81, -1, 79, 76, 74, -1, 76, 72, 74, -1, -1, -1,
  ];
  const BASS = [50, 50, 55, 55, 57, 57, 55, 55];
  function bgmTick() {
    if (!ctx) return;
    const beat = 0.32;
    while (bgmNext < ctx.currentTime + 0.4) {
      const i = bgmStep % MEL.length;
      if (MEL[i] > 0) pluck(midi(MEL[i]), bgmNext, 0.7, 0.2, bgmGain);
      if (i % 4 === 0) tone(midi(BASS[(i / 4) % BASS.length]), bgmNext, 1.1, 'sine', 0.25, bgmGain);
      if (i % 8 === 4) noise(bgmNext, 0.05, 1800, 3, 0.04);
      bgmNext += beat;
      bgmStep += 1;
    }
  }
  function bgmStart() {
    const c = unlock();
    if (!c || bgmTimer) return;
    bgmNext = c.currentTime + 0.1;
    bgmTimer = setInterval(bgmTick, 150);
  }
  function bgmStop() {
    if (bgmTimer) clearInterval(bgmTimer);
    bgmTimer = null;
  }

  /* こえ（よみあげ） */
  function say(text, lang, keep) {
    if (!on.voice || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || 'ja-JP';
      u.rate = lang && lang !== 'ja-JP' ? 0.9 : 1.05;
      u.pitch = 1.1;
      if (!keep) window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* よみあげ できない ブラウザ */ }
  }

  function set(kind, v) {
    on[kind] = !!v;
    if (kind === 'voice' && !v && window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch (e) { /* なし */ } }
    if (!ctx) return;
    if (kind === 'bgm') bgmGain.gain.setTargetAtTime(v ? 0.22 : 0, ctx.currentTime, 0.1);
    if (kind === 'sfx') sfxGain.gain.setTargetAtTime(v ? 0.8 : 0, ctx.currentTime, 0.05);
  }

  return { unlock, sfx, loop, stopLoops, bgmStart, bgmStop, say, set, on };
})();
