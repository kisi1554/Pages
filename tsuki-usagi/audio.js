'use strict';
// おと（WebAudio の ごうせいおん だけ。おんせい ファイルは つかわない）
const Sound = (() => {
  let ctx = null, master = null, sfx = null, music = null, nb = null, on = true;
  let timer = null, nextT = 0, step = 0, fast = false;
  try { on = localStorage.getItem('tsuki-usagi-sound') !== 'off'; } catch (e) { /* むし */ }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = on ? 0.9 : 0; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
    music = ctx.createGain(); music.gain.value = 0.2; music.connect(master);
    nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const T = () => ctx.currentTime;
  function tone(f, dur, type, vol, f2, delay, dest) {
    if (!ctx) return;
    const t = T() + Math.max(0, delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfx); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, type, f, f2, delay, dest) {
    if (!ctx) return;
    const t = T() + Math.max(0, delay || 0), s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = nb; fl.type = type || 'lowpass'; fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || sfx); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }

  // BGM: ようおんかい（レ ミ ソ ラ シ）の ことふう メロディ
  const SC = [293.66, 329.63, 392.0, 440.0, 493.88, 587.33, 659.25, 783.99];
  const MEL = [4, -1, 3, 4, 5, -1, 4, 3, 2, -1, 1, 2, 3, -1, -1, -1,
    4, -1, 5, 6, 5, 4, 3, -1, 2, 3, 1, -1, 0, -1, -1, -1];
  const BASS = [73.42, 73.42, 98.0, 98.0, 110.0, 110.0, 73.42, 73.42];
  function playStep(i, t) {
    const d = t - T(), n = MEL[i];
    if (n >= 0) { tone(SC[n], 0.55, 'triangle', 0.3, null, d, music); tone(SC[n] * 2, 0.22, 'sine', 0.07, null, d, music); }
    if (i % 4 === 0) tone(BASS[i / 4], 0.6, 'sine', 0.35, null, d, music);
    if (i % 8 === 0) noise(0.25, 0.5, 'lowpass', 180, 60, d, music);
    if (fast && i % 4 === 2) noise(0.12, 0.25, 'lowpass', 260, 90, d, music);
  }
  function sched() {
    if (!ctx) return;
    while (nextT < T() + 0.3) { playStep(step, nextT); nextT += fast ? 0.15 : 0.2; step = (step + 1) % MEL.length; }
  }

  return {
    init,
    isOn: () => on,
    toggle() {
      on = !on;
      try { localStorage.setItem('tsuki-usagi-sound', on ? 'on' : 'off'); } catch (e) { /* むし */ }
      if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, T(), 0.03);
      return on;
    },
    bgm(play) {
      if (!ctx) return;
      if (play && !timer) { nextT = T() + 0.1; step = 0; timer = setInterval(sched, 90); }
      if (!play && timer) { clearInterval(timer); timer = null; }
    },
    setFast(f) { fast = f; },
    click() { tone(880, 0.08, 'sine', 0.25); },
    jump() { tone(330, 0.22, 'sine', 0.35, 760); },
    jump2() { tone(520, 0.2, 'sine', 0.3, 1100); },
    land() { noise(0.08, 0.25, 'lowpass', 300); },
    throw() { noise(0.15, 0.25, 'bandpass', 900, 2500); tone(600, 0.1, 'triangle', 0.15, 900); },
    hitK() { tone(520, 0.12, 'square', 0.18, 260); tone(990, 0.1, 'sine', 0.2, null, 0.04); },
    puff() { noise(0.12, 0.15, 'lowpass', 600, 200); },
    hurt() { tone(500, 0.35, 'sawtooth', 0.2, 140); noise(0.2, 0.3, 'lowpass', 900, 200); },
    orb() { tone(1200, 0.25, 'sine', 0.15, 1800); tone(1500, 0.25, 'sine', 0.1, 2200, 0.05); },
    warn() { tone(700, 0.08, 'square', 0.1); tone(700, 0.08, 'square', 0.1, null, 0.14); },
    bamboo() { noise(0.25, 0.5, 'bandpass', 500, 1500); tone(180, 0.2, 'triangle', 0.3, 420); },
    ring() { tone(220, 0.8, 'sine', 0.3, 110); tone(440, 0.6, 'triangle', 0.12, 330); },
    heal() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.25, 'sine', 0.22, null, i * 0.07)); },
    phase() { [392, 330, 294, 220].forEach((f, i) => tone(f, 0.3, 'triangle', 0.3, null, i * 0.12)); },
    win() { [587, 659, 784, 880, 988, 1175].forEach((f, i) => tone(f, 0.4, 'triangle', 0.3, null, i * 0.12)); },
    lose() { [440, 392, 330, 294].forEach((f, i) => tone(f, 0.45, 'triangle', 0.3, null, i * 0.2)); },
  };
})();
