/* ゆうびん はいたつ — おと（WebAudio の 合成音だけ。オン/オフ できる） */
(function (root) {
  "use strict";
  let ac = null, master = null, on = true, noiseBuf = null;

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

  function tone(f0, f1, dur, opt) {
    const a = ctx(); if (!a) return;
    opt = opt || {};
    const t = a.currentTime + (opt.delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = opt.type || "sine";
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const v = opt.vol || 0.25;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, opt) {
    const a = ctx(); if (!a) return;
    opt = opt || {};
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime + (opt.delay || 0);
    const s = a.createBufferSource(); s.buffer = noiseBuf;
    const f = a.createBiquadFilter(); f.type = opt.ftype || "bandpass";
    f.frequency.setValueAtTime(opt.f0 || 1000, t);
    if (opt.f1) f.frequency.exponentialRampToValueAtTime(opt.f1, t + dur);
    f.Q.value = opt.q || 1;
    const g = a.createGain();
    g.gain.setValueAtTime(opt.vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  /* バイクの ぶるるん: のこぎり波を こきざみに ゆらす */
  function bike() {
    const a = ctx(); if (!a) return;
    const t = a.currentTime;
    const o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(115, t + 0.5);
    lfo.frequency.value = 26; lg.gain.value = 0.12;
    lfo.connect(lg); lg.connect(g.gain);
    const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 600;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(t); lfo.start(t); o.stop(t + 0.75); lfo.stop(t + 0.75);
  }

  const S = {
    setOn(v) { on = !!v; if (!on && ac) { try { ac.suspend(); } catch (e) { /* なにも しない */ } } },
    isOn() { return on; },
    bike,
    step() { noise(0.05, { f0: 300, vol: 0.05, ftype: "lowpass" }); },
    pick() { tone(660, 990, 0.08, { type: "triangle", vol: 0.18 }); },
    pocket() { tone(520, 400, 0.1, { type: "triangle", vol: 0.2 }); noise(0.08, { f0: 1800, vol: 0.06 }); },
    // ポストに ことん
    post() { tone(240, 120, 0.14, { type: "triangle", vol: 0.35 }); tone(180, 90, 0.12, { type: "sine", vol: 0.25, delay: 0.09 }); },
    // チャイム ぴんぽーん
    chime() { tone(988, 988, 0.5, { vol: 0.25 }); tone(784, 784, 0.9, { vol: 0.25, delay: 0.35 }); },
    hai() { tone(500, 700, 0.12, { type: "triangle", vol: 0.15 }); tone(700, 600, 0.15, { type: "triangle", vol: 0.15, delay: 0.12 }); },
    ng() { tone(220, 160, 0.25, { type: "square", vol: 0.1 }); },
    ok() { tone(784, 784, 0.1, { vol: 0.2 }); tone(1046, 1046, 0.18, { vol: 0.2, delay: 0.09 }); },
    // そくたつの いそぎ メロディ
    hurry() {
      [880, 988, 880, 988, 1175, 1175].forEach((f, i) => tone(f, f, 0.09, { type: "square", vol: 0.08, delay: i * 0.1 }));
    },
    bonus() { [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, f, 0.12, { type: "triangle", vol: 0.15, delay: i * 0.06 })); },
    fanfare() {
      const n = [[523, 0], [659, 0.14], [784, 0.28], [1046, 0.42], [784, 0.62], [1046, 0.76]];
      n.forEach(([f, d]) => tone(f, f, d >= 0.76 ? 0.6 : 0.16, { type: "triangle", vol: 0.22, delay: d }));
      tone(262, 262, 1.2, { type: "sine", vol: 0.12, delay: 0.42 });
    },
  };
  root.YHAudio = S;
})(window);
