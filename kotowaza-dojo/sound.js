"use strict";

/* こうかおん。音は WebAudio で その場で つくる（音声ファイルは つかわない） */
const Snd = (() => {
  let ac = null;
  let on = true;

  function ctx() {
    if (!on) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
    } catch (e) { ac = null; }
    return ac;
  }

  /* たん音。o = { type, vol, slide(おわりの 周波数), at(おくらせる びょう), attack } */
  function tone(freq, dur, o) {
    o = o || {};
    const a = ctx();
    if (!a) return;
    const t0 = a.currentTime + (o.at || 0);
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
    const v = o.vol == null ? 0.2 : o.vol;
    const atk = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* ノイズ。o = { freq, q, filter, vol, at, slide } */
  function noise(dur, o) {
    o = o || {};
    const a = ctx();
    if (!a) return;
    const t0 = a.currentTime + (o.at || 0);
    const n = Math.max(1, Math.floor(a.sampleRate * dur));
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = o.filter || "bandpass";
    f.frequency.setValueAtTime(o.freq || 1200, t0);
    if (o.slide) f.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
    f.Q.value = o.q || 1;
    const g = a.createGain();
    const v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // 和太鼓 ふう「どん」: ひくい サイン が さがる ＋ かわの ノイズ
  function don(at, vol) {
    tone(150, 0.45, { at, vol: vol || 0.5, slide: 60 });
    tone(90, 0.5, { at, vol: (vol || 0.5) * 0.6, slide: 45 });
    noise(0.08, { at, freq: 900, q: 0.8, vol: 0.18 });
  }

  const FX = {
    tap: () => { tone(620, 0.08, { vol: 0.16, slide: 380 }); tone(300, 0.06, { vol: 0.1, type: "triangle" }); }, // ぽこっ
    correct: () => { don(0, 0.55); don(0.18, 0.4); noise(0.05, { at: 0.36, freq: 2600, q: 3, vol: 0.12 }); },     // どん・どん・かっ
    wrong: () => { tone(220, 0.18, { type: "triangle", vol: 0.16 }); tone(170, 0.28, { at: 0.16, type: "triangle", vol: 0.16 }); },
    stamp: () => { noise(0.06, { freq: 500, filter: "lowpass", vol: 0.35 }); tone(110, 0.12, { vol: 0.35, slide: 70 }); }, // ぺたっ
    clear: () => { don(0, 0.5); don(0.22, 0.5); don(0.44, 0.6); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { at: 0.7 + i * 0.1, vol: 0.12, type: "triangle" })); },
    slip: () => tone(900, 0.5, { slide: 200, type: "sine", vol: 0.18 }),
    thud: () => { tone(120, 0.3, { vol: 0.45, slide: 50 }); noise(0.15, { freq: 300, filter: "lowpass", vol: 0.3 }); },
    bonk: () => { tone(700, 0.12, { type: "square", vol: 0.1, slide: 300 }); tone(200, 0.2, { vol: 0.3, slide: 90 }); },
    splash: () => noise(0.6, { freq: 1800, slide: 500, q: 0.6, vol: 0.3 }),
    ding: () => { tone(1568, 0.6, { vol: 0.12 }); tone(2093, 0.5, { at: 0.08, vol: 0.08 }); },
    sparkle: () => [1760, 2217, 2637, 3136].forEach((f, i) => tone(f, 0.18, { at: i * 0.06, vol: 0.07 })),
    boing: () => tone(260, 0.35, { slide: 620, type: "triangle", vol: 0.16 }),
    whoosh: () => noise(0.4, { freq: 400, slide: 2400, q: 1.2, vol: 0.18 }),
    soft: () => noise(0.12, { freq: 500, filter: "lowpass", vol: 0.25 }),
    chant: () => [0, 0.5, 1, 1.5].forEach((t) => tone(196, 0.45, { at: t, vol: 0.08, type: "triangle", attack: 0.08 })),
    drip: () => tone(1200, 0.12, { slide: 2400, vol: 0.14 }),
    fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.4 : 0.14, { at: i * 0.11, vol: 0.12, type: "triangle" })),
    pop: () => tone(500, 0.08, { slide: 900, vol: 0.12 }),
    meow: () => tone(700, 0.35, { slide: 480, type: "triangle", vol: 0.12, attack: 0.05 }),
    cry: () => [0, 0.4].forEach((t) => tone(520, 0.35, { at: t, slide: 400, type: "triangle", vol: 0.08, attack: 0.05 })),
    buzz: () => tone(180, 0.9, { type: "sawtooth", vol: 0.05, attack: 0.1 }),
    sting: () => { tone(1500, 0.08, { type: "square", vol: 0.08 }); tone(400, 0.2, { at: 0.06, slide: 200, vol: 0.15 }); },
    munch: () => [0, 0.12].forEach((t) => noise(0.07, { at: t, freq: 1500, q: 2, vol: 0.18 })),
    taiko: () => { don(0, 0.6); don(0.25, 0.6); },
    ribbit: () => [0, 0.15].forEach((t) => tone(320, 0.1, { at: t, type: "square", vol: 0.06, slide: 260 })),
    rain: () => noise(2.2, { freq: 3000, q: 0.5, vol: 0.08, attack: 0.3 }),
    stomp: () => [0, 0.4, 0.8].forEach((t) => tone(90, 0.18, { at: t, vol: 0.35, slide: 50 })),
    sizzle: () => noise(0.9, { freq: 5000, filter: "highpass", vol: 0.14 }),
    crack: () => { noise(0.1, { freq: 1200, q: 3, vol: 0.3 }); noise(0.15, { at: 0.08, freq: 600, q: 2, vol: 0.25 }); },
    knock: () => { tone(1100, 0.15, { type: "square", vol: 0.1 }); tone(1650, 0.2, { vol: 0.08 }); },
    snore: () => noise(0.8, { freq: 200, q: 2, vol: 0.12, attack: 0.3 }),
    sad: () => [392, 370, 349, 330].forEach((f, i) => tone(f, 0.3, { at: i * 0.28, type: "triangle", vol: 0.1 })),
  };

  function play(name) {
    if (!on) return;
    (FX[name] || FX.pop)();
  }

  return {
    play,
    get on() { return on; },
    set(v) { on = !!v; },
  };
})();
