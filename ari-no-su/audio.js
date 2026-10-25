/* ありの す たんけん ｜ こうかおん（WebAudio で その場で つくる。音声ファイルは つかわない） */
(function () {
  "use strict";
  const ARI = (window.ARI = window.ARI || {});
  let ac = null, noise = null;
  const last = {};

  function ensure() {
    if (!Snd.on) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      if (!noise) {
        noise = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
    } catch (e) { return null; }
    return ac;
  }
  function gap(k, ms) {
    const now = performance.now();
    if (last[k] && now - last[k] < ms) return false;
    last[k] = now; return true;
  }
  function tone(type, f0, f1, dur, vol, at) {
    const c = ensure(); if (!c) return;
    const t = c.currentTime + (at || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(freq, q, dur, vol, at, lp) {
    const c = ensure(); if (!c) return;
    const t = c.currentTime + (at || 0);
    const src = c.createBufferSource(); src.buffer = noise;
    const f = c.createBiquadFilter(); f.type = lp ? "lowpass" : "bandpass"; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t, Math.random()); src.stop(t + dur + 0.02);
  }

  const Snd = {
    on: true,
    ensure,
    dig() { if (gap("dig", 260)) { hiss(2200, 1.2, 0.05, 0.10); hiss(1700, 1.2, 0.05, 0.08, 0.08); } },          // さくさく
    find() { if (gap("find", 200)) { tone("sine", 880, 1500, 0.09, 0.18); tone("sine", 1500, 1700, 0.07, 0.12, 0.08); } }, // ぴこっ
    place() { tone("triangle", 420, 220, 0.12, 0.16); },
    tap() { tone("sine", 700, 560, 0.06, 0.08); },
    born() { if (gap("born", 400)) { tone("sine", 660, 0, 0.12, 0.10); tone("sine", 990, 0, 0.16, 0.10, 0.1); } },
    room() { [523, 659, 784].forEach((f, i) => tone("triangle", f, 0, 0.18, 0.12, i * 0.09)); },
    badge() { [523, 659, 784, 1047].forEach((f, i) => tone("triangle", f, 0, 0.2, 0.13, i * 0.1)); },
    rain() { hiss(900, 0.5, 1.6, 0.08, 0, true); },
    winter() { [784, 659, 523].forEach((f, i) => tone("sine", f, 0, 0.3, 0.08, i * 0.18)); },
    flight() { [392, 523, 659, 784, 1047].forEach((f, i) => tone("sine", f, f * 1.02, 0.2, 0.1, i * 0.07)); },
  };
  ARI.Sound = Snd;
})();
