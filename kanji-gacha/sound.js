"use strict";

/* こうかおん。WebAudio で その場で つくる（音声ファイルは つかわない） */
const Snd = (() => {
  let ac = null;
  let on = true;

  function ctx() {
    if (!on) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
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
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
    if (o.vib) {
      const lfo = a.createOscillator();
      const lg = a.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.value = freq * o.vib;
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    const v = (o.vol == null ? 0.25 : o.vol);
    const atk = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + atk);
    if (o.hold) g.gain.setValueAtTime(v, t0 + Math.max(atk, dur - 0.06));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* ノイズ（かぜ・みず・ガラガラ）。o = { freq, q, filter, vol, at, slide } */
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
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1200, t0);
    if (o.slide) f.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
    f.Q.value = o.q || 1;
    const g = a.createGain();
    const v = o.vol == null ? 0.25 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  const NOTE = { 'ド': 523.25, 'レ': 587.33, 'ミ': 659.25, 'ファ': 698.46, 'ソ': 783.99, 'ラ': 880, 'シ': 987.77, 'ド2': 1046.5 };

  return {
    tone, noise, NOTE,
    get on() { return on; },
    set on(v) { on = !!v; },
    unlock() { ctx(); },
    coin(at) {                       // チャリン
      tone(1568, 0.09, { type: 'square', vol: 0.12, at: at || 0 });
      tone(2093, 0.35, { type: 'square', vol: 0.12, at: (at || 0) + 0.07 });
    },
    rattle() {                       // ガラガラ
      for (let i = 0; i < 14; i++) {
        noise(0.05, { freq: 900 + Math.random() * 1600, q: 6, vol: 0.3, at: i * 0.075 });
        if (i % 3 === 0) tone(300 + Math.random() * 300, 0.04, { type: 'triangle', vol: 0.12, at: i * 0.075 });
      }
    },
    click() { noise(0.03, { freq: 2500, q: 4, vol: 0.25 }); tone(800, 0.03, { type: 'square', vol: 0.06 }); },
    ratchet(n, total, speed) {       // ハンドルの カチッ ＋ なかで カプセルが ゴロゴロ
      const heavy = n > total - 3;
      noise(0.025, { freq: heavy ? 1800 : 2600 + n * 40, q: 5, vol: heavy ? 0.32 : 0.24 });
      tone(heavy ? 420 : 700 + (n % 2) * 60, 0.035, { type: 'square', vol: 0.06 });
      const k = 1 + Math.round((speed || 0.5) * 3);
      for (let i = 0; i < k; i++) {
        tone(380 + Math.random() * 520, 0.045, { type: 'triangle', vol: 0.05 + (speed || 0.5) * 0.06, at: 0.02 + Math.random() * 0.09 });
      }
    },
    stuck() { noise(0.05, { freq: 500, q: 2, vol: 0.3 }); tone(160, 0.06, { type: 'square', vol: 0.06 }); },
    clunk() {                        // ガチャン
      noise(0.08, { freq: 700, q: 1.5, vol: 0.45 });
      tone(150, 0.22, { type: 'triangle', vol: 0.35, slide: 70 });
      tone(1900, 0.12, { type: 'square', vol: 0.05, at: 0.02, slide: 1500 });
      for (let i = 0; i < 6; i++) noise(0.05, { freq: 900 + Math.random() * 1400, q: 6, vol: 0.22, at: 0.1 + i * 0.06 });
      tone(110, 0.15, { type: 'sine', vol: 0.35, at: 0.42, slide: 60 });   // ゴトン
    },
    roll() {                         // ころころ
      for (let i = 0; i < 6; i++) tone(500 - i * 40, 0.06, { type: 'triangle', vol: 0.12, at: i * 0.12 });
    },
    paka() {                         // パカッ
      noise(0.06, { freq: 3000, q: 2, vol: 0.4 });
      tone(1200, 0.08, { type: 'square', vol: 0.1, slide: 600 });
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.15, at: 0.1 + i * 0.08 }));
    },
    ok() { tone(880, 0.12, { type: 'triangle', vol: 0.2 }); tone(1319, 0.25, { type: 'triangle', vol: 0.2, at: 0.1 }); },
    ng() { tone(220, 0.25, { type: 'sawtooth', vol: 0.08, slide: 160 }); },
    tap() { tone(660, 0.05, { type: 'triangle', vol: 0.12 }); },
    fanfare() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'square', vol: 0.08, at: i * 0.11 }));
      tone(1047, 0.6, { type: 'triangle', vol: 0.18, at: 0.45 });
      tone(1319, 0.6, { type: 'triangle', vol: 0.12, at: 0.45 });
    },
    sparkle() {
      for (let i = 0; i < 6; i++) tone(1500 + Math.random() * 1500, 0.15, { type: 'sine', vol: 0.08, at: i * 0.06 });
    }
  };
})();
