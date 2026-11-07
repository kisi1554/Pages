/* かみひこうき グライダー — おと（WebAudio の 合成音だけ。🔊 と 🎵 で オン/オフ） */
(function (root) {
  "use strict";
  let ac = null, master = null, on = true, bgmOn = true, noiseBuf = null, wind = null, bgmTimer = null, bgmStep = 0;

  function ctx() {
    if (!on) return null;
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain(); master.gain.value = 0.5;
        master.connect(ac.destination);
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  function buf(a) {
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function tone(f0, f1, dur, opt) {
    const a = ctx(); if (!a) return;
    opt = opt || {};
    try {
      const t = a.currentTime + (opt.delay || 0);
      const o = a.createOscillator(), g = a.createGain();
      o.type = opt.type || "sine";
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const v = opt.vol || 0.2;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + (opt.attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* おと が でなくても あそべる */ }
  }
  function noise(dur, opt) {
    const a = ctx(); if (!a) return;
    opt = opt || {};
    try {
      const t = a.currentTime + (opt.delay || 0);
      const s = a.createBufferSource(); s.buffer = buf(a);
      const f = a.createBiquadFilter(); f.type = opt.ftype || "bandpass";
      f.frequency.setValueAtTime(opt.f0 || 1000, t);
      if (opt.f1) f.frequency.exponentialRampToValueAtTime(opt.f1, t + dur);
      f.Q.value = opt.q || 1;
      const g = a.createGain(); const v = opt.vol || 0.2;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + (opt.attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t); s.stop(t + dur + 0.05);
    } catch (e) { /* */ }
  }

  /* かぜ の ひゅー（はやさ で たかさ と おおきさ が かわる） */
  function windStart() {
    const a = ctx(); if (!a || wind) return;
    try {
      const s = a.createBufferSource(); s.buffer = buf(a); s.loop = true;
      const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 600; f.Q.value = 2.5;
      const g = a.createGain(); g.gain.value = 0.0001;
      s.connect(f); f.connect(g); g.connect(master); s.start();
      wind = { s, f, g };
    } catch (e) { wind = null; }
  }
  function windSet(speed) {
    if (!wind || !ac) return;
    try {
      const t = ac.currentTime;
      const v = Math.max(0, Math.min(1, speed / 16));
      wind.f.frequency.setTargetAtTime(350 + v * 1500, t, 0.15);
      wind.g.gain.setTargetAtTime(0.012 + v * 0.09, t, 0.2);
    } catch (e) { /* */ }
  }
  function windStop() {
    if (!wind) return;
    try {
      wind.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.1);
      const w = wind; setTimeout(() => { try { w.s.stop(); } catch (e) { /* */ } }, 400);
    } catch (e) { /* */ }
    wind = null;
  }

  /* のんびり BGM（ペンタトニック の オルゴール） */
  const MEL = [0, 2, 4, 7, 4, 2, 9, 7, 4, 2, 0, 2, 4, -1, 2, -1];
  const BASS = [0, 0, 5, 5, 7, 7, 0, 0];
  const SC = [0, 2, 4, 7, 9];
  function note(semi) { return 523.25 * Math.pow(2, semi / 12); }
  function bgmTick() {
    if (!on || !bgmOn) return;
    const i = bgmStep++ % MEL.length;
    const m = MEL[i];
    if (m >= 0) tone(note(m), 0, 0.5, { type: "triangle", vol: 0.045, attack: 0.02 });
    if (i % 2 === 0) tone(note(BASS[(i / 2) % BASS.length] - 24), 0, 0.9, { type: "sine", vol: 0.05, attack: 0.03 });
    void SC;
  }
  function bgmStart() {
    if (bgmTimer || !on || !bgmOn) return;
    if (!ctx()) return;
    bgmTimer = setInterval(bgmTick, 380);
  }
  function bgmStop() { if (bgmTimer) clearInterval(bgmTimer); bgmTimer = null; }

  const S = {
    get on() { return on; },
    get bgm() { return bgmOn; },
    set(v) { on = !!v; if (!on) { windStop(); bgmStop(); } else bgmStart(); },
    setBgm(v) { bgmOn = !!v; if (bgmOn) bgmStart(); else bgmStop(); },
    unlock() { if (on) { ctx(); bgmStart(); } },
    windStart, windSet, windStop,
    fold() { noise(0.18, { f0: 2500, f1: 900, q: 1.2, vol: 0.16 }); tone(500, 380, 0.08, { type: "triangle", vol: 0.06, delay: 0.12 }); },
    crease() { noise(0.06, { f0: 4000, q: 2, vol: 0.1 }); },
    pick() { tone(880, 1100, 0.08, { type: "triangle", vol: 0.12 }); },
    done() { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.28, { type: "triangle", vol: 0.14, delay: i * 0.1 })); },
    throw() { noise(0.4, { f0: 600, f1: 2400, q: 1, vol: 0.18, attack: 0.03 }); },
    chun() { [0, 0.16].forEach((d) => { tone(3200, 4200, 0.05, { vol: 0.08, delay: d }); tone(4000, 3000, 0.06, { vol: 0.07, delay: d + 0.06 }); }); },
    pon() { tone(700, 1400, 0.06, { vol: 0.2 }); noise(0.08, { f0: 3000, q: 0.8, vol: 0.12 }); tone(1600, 1600, 0.25, { type: "triangle", vol: 0.08, delay: 0.06 }); },
    lift() { tone(400, 900, 0.5, { type: "sine", vol: 0.07, attack: 0.1 }); },
    stall() { tone(900, 300, 0.45, { type: "triangle", vol: 0.1 }); },
    bonk() { tone(260, 160, 0.15, { type: "triangle", vol: 0.14 }); },
    pafu() { noise(0.3, { f0: 700, f1: 200, q: 0.7, vol: 0.22, attack: 0.02 }); },
    splash() { noise(0.45, { f0: 1500, f1: 400, q: 1, vol: 0.18 }); },
    fanfare() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.3, { type: "triangle", vol: 0.14, delay: i * 0.12 })); },
  };
  root.Snd = S;
})(window);
