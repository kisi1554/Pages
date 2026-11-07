/* うちゅう ステーション の いちにち — おと（WebAudio の 合成音だけ。オン/オフ できる） */
(function (root) {
  "use strict";
  let ac = null, master = null, on = true, noiseBuf = null, fan = null;

  function ctx() {
    if (!on) return null;
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain(); master.gain.value = 0.45;
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
      const v = opt.vol || 0.25;
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
      const g = a.createGain(); const v = opt.vol || 0.3;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + (opt.attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t); s.stop(t + dur + 0.05);
    } catch (e) { /* */ }
  }

  /* ステーション の しずか な ファン（ずっと ながれる ひくい おと） */
  function fanStart() {
    const a = ctx(); if (!a || fan) return;
    try {
      const s = a.createBufferSource(); s.buffer = buf(a); s.loop = true;
      const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 260;
      const g = a.createGain(); g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.05, a.currentTime + 1.5);
      const hum = a.createOscillator(); hum.frequency.value = 58; hum.type = "sine";
      const hg = a.createGain(); hg.gain.value = 0.012;
      s.connect(f); f.connect(g); g.connect(master);
      hum.connect(hg); hg.connect(master);
      s.start(); hum.start();
      fan = { s, hum };
    } catch (e) { fan = null; }
  }
  function fanStop() {
    if (!fan) return;
    try { fan.s.stop(); fan.hum.stop(); } catch (e) { /* */ }
    fan = null;
  }

  const S = {
    get on() { return on; },
    set(v) { on = !!v; if (!on) fanStop(); else fanStart(); },
    unlock() { if (on) { ctx(); fanStart(); } },
    kick() { noise(0.35, { f0: 500, f1: 1400, q: 0.8, vol: 0.18, attack: 0.05 }); },
    grab() { tone(1800, 1200, 0.05, { type: "square", vol: 0.12 }); tone(900, 700, 0.06, { type: "triangle", vol: 0.15, delay: 0.02 }); },
    bonk() { tone(220, 140, 0.15, { type: "triangle", vol: 0.15 }); },
    poyon() { tone(300, 620, 0.12, { vol: 0.25 }); tone(620, 380, 0.18, { vol: 0.2, delay: 0.1 }); },
    kiran() { [1318, 1760, 2093, 2637].forEach((f, i) => tone(f, f, 0.35, { vol: 0.12, delay: i * 0.07, type: "triangle" })); },
    pikon() { tone(988, 988, 0.09, { type: "square", vol: 0.12 }); tone(1319, 1319, 0.18, { type: "square", vol: 0.12, delay: 0.09 }); },
    tap() { tone(660, 520, 0.06, { type: "triangle", vol: 0.12 }); },
    water() { noise(0.25, { f0: 1800, f1: 600, q: 3, vol: 0.15 }); },
    zip() { noise(0.12, { f0: 3000, q: 2, vol: 0.12 }); },
    step() { tone(140, 90, 0.08, { type: "triangle", vol: 0.2 }); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.3, { type: "triangle", vol: 0.18, delay: i * 0.14 })); },
  };
  root.Snd = S;
})(window);
