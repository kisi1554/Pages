/* でんき の ゆくえ — おと（WebAudio の 合成音 だけ）
 *  ずっと なる おと: まち の ざわざわ（つかう でんき）・かぜ の ひゅー・ダム の ざー
 *  こうかおん: おく ぽん・けす・カード・ちかちか・ぷつん（まっくら）・ぱっ（あかり）・ファンファーレ
 */
(function (root) {
  "use strict";
  let ac = null, master = null, noiseBuf = null, amb = null;
  const S = { on: true };

  function ctx() {
    if (!S.on) return null;
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  function buf(a) {
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.6 + last * 3; }
    }
    return noiseBuf;
  }
  function tone(f0, f1, dur, o) {
    const a = ctx(); if (!a) return;
    o = o || {};
    const t = a.currentTime + (o.delay || 0);
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.22, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(dur, o) {
    const a = ctx(); if (!a) return;
    o = o || {};
    const t = a.currentTime + (o.delay || 0);
    const src = a.createBufferSource(); src.buffer = buf(a);
    const f = a.createBiquadFilter(); f.type = o.ftype || "bandpass";
    f.frequency.setValueAtTime(o.f0 || 1500, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    f.Q.value = o.q || 1.2;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + dur + 0.05);
  }
  function loop(a, type, freq, q) {
    const src = a.createBufferSource(); src.buffer = buf(a); src.loop = true;
    const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = a.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(master); src.start();
    return { src, f, g };
  }

  const Sound = {
    get on() { return S.on; },
    set(on) {
      S.on = !!on;
      if (!S.on) Sound.ambient(null);
      if (master) master.gain.value = S.on ? 0.5 : 0;
    },
    unlock() { ctx(); },
    // levels = { city: 0〜1, wind: 0〜1, dam: 0〜1 } / null で とめる
    ambient(levels) {
      const a = ac;
      if (!levels) {
        if (amb && a) for (const k in amb) amb[k].g.gain.setTargetAtTime(0, a.currentTime, 0.1);
        return;
      }
      const b = ctx(); if (!b) return;
      if (!amb) amb = { city: loop(b, "lowpass", 380, 0.7), wind: loop(b, "bandpass", 700, 0.9), dam: loop(b, "lowpass", 1600, 0.5) };
      const t = b.currentTime;
      amb.city.g.gain.setTargetAtTime(0.04 + 0.16 * (levels.city || 0), t, 0.3);
      amb.wind.g.gain.setTargetAtTime(0.18 * (levels.wind || 0), t, 0.3);
      amb.wind.f.frequency.setTargetAtTime(500 + 600 * (levels.wind || 0), t, 0.5);
      amb.dam.g.gain.setTargetAtTime(0.12 * (levels.dam || 0), t, 0.3);
    },
    place() { tone(520, 880, 0.12, { type: "triangle" }); },
    remove() { tone(600, 300, 0.12, { type: "triangle", vol: 0.15 }); },
    tap() { tone(700, 700, 0.05, { type: "square", vol: 0.06 }); },
    nope() { tone(220, 180, 0.15, { type: "square", vol: 0.08 }); },
    card() { [784, 988, 1175].forEach((f, i) => tone(f, f, 0.2, { delay: i * 0.08, type: "triangle", vol: 0.15 })); },
    warn() { tone(880, 880, 0.07, { type: "square", vol: 0.07 }); },
    blackout() { noise(0.08, { f0: 3000, vol: 0.5, q: 0.5 }); tone(300, 40, 0.6, { type: "sawtooth", vol: 0.18, delay: 0.03 }); },
    restore() { noise(0.05, { f0: 5000, vol: 0.25 }); tone(660, 1320, 0.18, { type: "triangle", vol: 0.15 }); },
    start() { [523, 659, 784].forEach((f, i) => tone(f, f, 0.15, { delay: i * 0.1, type: "triangle", vol: 0.16 })); },
    fanfare(n) {
      const notes = [523, 659, 784, 1047, 784, 1047];
      notes.forEach((f, i) => tone(f, f, i === notes.length - 1 ? 0.6 : 0.16, { delay: i * 0.13, type: "triangle", vol: 0.18 }));
      for (let k = 0; k < (n || 0); k++) tone(1568, 2093, 0.2, { delay: 0.9 + k * 0.25, vol: 0.12 });
    },
  };
  root.Sound = Sound;
})(typeof self !== "undefined" ? self : this);
