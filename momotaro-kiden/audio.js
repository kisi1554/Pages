// ももたろう 鬼伝 ― こうかおん（Web Audio で その場で つくる）
(function () {
  "use strict";
  const KEY = "momotaro-kiden:sound";
  let ctx = null, master = null, noiseBuf = null;
  let on = true;
  try { on = localStorage.getItem(KEY) !== "off"; } catch (e) { /* つかえなくても よい */ }

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(f, dur, type = "sine", vol = 0.4, f2 = 0, delay = 0) {
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g, t, 0.01, vol, dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol = 0.4, ftype = "lowpass", f = 1000, f2 = 0, delay = 0, q = 1) {
    const t = ctx.currentTime + delay, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    fl.type = ftype; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g, t, 0.005, vol, dur);
    s.connect(fl).connect(g).connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  const SFX = {
    page() { noise(0.08, 0.15, "highpass", 3000); },
    reveal() { tone(220, 0.25, "triangle", 0.15, 110); },
    slash() { noise(0.3, 0.5, "bandpass", 6000, 800, 0, 2); tone(1400, 0.18, "sawtooth", 0.08, 300); },
    bite() { noise(0.06, 0.6, "lowpass", 2000); noise(0.06, 0.6, "lowpass", 2000, 0, 0.09); tone(160, 0.12, "square", 0.15, 80); },
    swish() { for (let i = 0; i < 4; i++) noise(0.09, 0.35, "bandpass", 3000, 1200, i * 0.07, 3); },
    wind() { noise(0.7, 0.45, "bandpass", 400, 2400, 0, 1.2); },
    hit() { tone(120, 0.35, "sine", 0.7, 40); noise(0.18, 0.5, "lowpass", 1500, 200); },
    clang() { tone(1800, 0.4, "square", 0.08); tone(2420, 0.35, "square", 0.06); noise(0.12, 0.3, "highpass", 4000); },
    roar() { tone(90, 0.8, "sawtooth", 0.25, 60); tone(93, 0.8, "sawtooth", 0.2, 55); noise(0.8, 0.25, "lowpass", 500, 200); },
    heart() { tone(70, 0.18, "sine", 0.8, 40); tone(70, 0.18, "sine", 0.6, 40, 0.22); },
    boom() { tone(80, 1.2, "sine", 0.9, 25); noise(1.0, 0.6, "lowpass", 2000, 80); },
    taiko() { tone(110, 0.4, "sine", 0.7, 60); noise(0.05, 0.3, "lowpass", 800); },
    power(n) { tone(260 + n * 55, 0.12, "square", 0.12, 300 + n * 60); },
    fin() { noise(0.5, 0.6, "bandpass", 8000, 500, 0, 2); tone(60, 1.6, "sine", 0.9, 30, 0.2); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.9, "triangle", 0.15, 0, 0.3 + i * 0.05)); },
    fanfare() { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, "triangle", 0.2, 0, i * 0.13)); },
    sad() { [440, 392, 330, 294].forEach((f, i) => tone(f, 0.6, "sine", 0.15, 0, i * 0.35)); },
    join() { [523, 784, 1047].forEach((f, i) => tone(f, 0.25, "triangle", 0.2, 0, i * 0.09)); },
  };

  window.Snd = {
    get on() { return on; },
    toggle() {
      on = !on;
      try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) { /* むし */ }
      if (on) init();
      return on;
    },
    unlock() { if (on) init(); },
    play(name, arg) {
      if (!on || !SFX[name]) return;
      if (!init()) return;
      try { SFX[name](arg); } catch (e) { /* おとが でなくても すすむ */ }
    },
  };
})();
