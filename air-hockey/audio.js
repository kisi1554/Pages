// エアホッケー — おと（WebAudio の ごうせいおん だけ）
(function (root) {
  "use strict";
  let on = true;
  let AC = null, noiseBuf = null, master = null;
  function ac() {
    if (!on) return null;
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      master = AC.createGain(); master.gain.value = 0.8;
      const comp = AC.createDynamicsCompressor();
      master.connect(comp); comp.connect(AC.destination);
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (AC.state === "suspended") AC.resume();
    return AC;
  }
  function env(a, t, vol, attack, decay) {
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(master);
    return g;
  }
  function tone(freq, when, vol, attack, decay, type, freqEnd, lp) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + (when || 0);
    const o = a.createOscillator();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + attack + decay);
    let node = o;
    if (lp) { const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(env(a, t, vol, attack, decay));
    o.start(t); o.stop(t + attack + decay + 0.05);
  }
  function noise(when, vol, attack, decay, ftype, freq, q, freqEnd) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + (when || 0);
    const src = a.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = a.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + attack + decay);
    src.connect(f); f.connect(env(a, t, vol, attack, decay));
    src.start(t, Math.random()); src.stop(t + attack + decay + 0.05);
  }
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  const sfx = {
    tap() { tone(880, 0, 0.08, 0.004, 0.08, "triangle"); },
    pick() { tone(660, 0, 0.1, 0.004, 0.07, "triangle"); tone(990, 0.05, 0.08, 0.004, 0.09, "triangle"); },
    // カン！（マレットで うつ）… はやい ほど たかい
    hit(speed, power) {
      const s = clamp01((speed || 0) / 5), v = 0.12 + clamp01((power || 0) / 4) * 0.35;
      const f = 520 + s * 900;
      tone(f, 0, v, 0.002, 0.07 + s * 0.05, "triangle", f * 0.8);
      tone(f * 2.4, 0, v * 0.35, 0.001, 0.04, "square", null, 5000);
      noise(0, v * 0.6, 0.001, 0.025, "highpass", 2500, 0.7);
    },
    // コン（かべ）
    wall(power) {
      const v = 0.06 + clamp01((power || 0) / 4) * 0.25;
      tone(300, 0, v, 0.002, 0.1, "sine", 230);
      tone(620, 0, v * 0.4, 0.002, 0.05, "triangle");
      noise(0, v * 0.4, 0.001, 0.03, "bandpass", 900, 1.2);
    },
    // キン（ゴールの かど）
    post(power) {
      const v = 0.08 + clamp01((power || 0) / 4) * 0.25;
      tone(1500, 0, v, 0.001, 0.25, "sine", 1400);
      tone(2350, 0, v * 0.4, 0.001, 0.18, "sine");
    },
    // ブー（ブザー）と かんせい
    goal() {
      tone(150, 0, 0.32, 0.01, 0.75, "sawtooth", 140, 1100);
      tone(225, 0, 0.18, 0.01, 0.75, "square", 212, 900);
      // かんせい: ひろがる ノイズ ＋ ピューッ
      noise(0.1, 0.32, 0.25, 1.4, "bandpass", 1400, 0.6, 1000);
      noise(0.15, 0.18, 0.3, 1.3, "bandpass", 2600, 0.8, 1800);
      for (let i = 0; i < 4; i++) {
        const f = 1100 + Math.random() * 900;
        tone(f, 0.3 + i * 0.15 + Math.random() * 0.1, 0.05, 0.03, 0.25, "sine", f * 1.5);
      }
    },
    serve() { tone(784, 0, 0.1, 0.004, 0.1, "triangle"); },
    start() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.12, 0.13, 0.005, 0.16, "triangle")); tone(1047, 0.36, 0.15, 0.005, 0.35, "triangle"); },
    item() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.12, 0.004, 0.12, "square", null, 3500)); },
    itemSpawn() { tone(1320, 0, 0.06, 0.01, 0.2, "sine", 1760); },
    fxEnd() { tone(660, 0, 0.07, 0.005, 0.12, "triangle", 440); },
    win() {
      const m = [523, 659, 784, 1047, 784, 1047];
      m.forEach((f, i) => tone(f, i * 0.13, 0.15, 0.005, i === m.length - 1 ? 0.6 : 0.14, "triangle"));
      noise(0.1, 0.25, 0.3, 1.8, "bandpass", 1500, 0.6, 1100);
    },
    lose() { [392, 349, 311, 262].forEach((f, i) => tone(f, i * 0.2, 0.12, 0.01, 0.25, "triangle")); },
  };

  root.AHAudio = {
    sfx,
    set(v) { on = !!v; if (!on && AC && AC.state === "running") AC.suspend(); if (on && AC) AC.resume(); },
    get on() { return on; },
    unlock() { ac(); },
  };
})(this);
