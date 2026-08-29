/* あしたの天気やさん — 音（WebAudio の合成音のみ。音声ファイルは使わない） */

const Sound = (function () {
  let ctx = null;
  let on = true;
  let rainNode = null;   // ざーざー音（じっけんタブ用）
  let rainGain = null;

  function ready() {
    if (!on) return null;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) {
      on = false;
      return null;
    }
  }

  /* かんたんな 音つぶ */
  function tone(freq, dur, type, vol, delay) {
    const c = ready();
    if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol == null ? 0.18 : vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /* ホワイトノイズの バッファ（雨・風で つかいまわす） */
  function noiseBuffer(c) {
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  return {
    get enabled() { return on; },
    setEnabled(v) {
      on = !!v;
      if (!on) this.stopRain();
    },
    unlock() { ready(); },

    tap()     { tone(660, 0.09, 'triangle', 0.14); },
    move()    { tone(880, 0.07, 'sine', 0.10); },
    correct() { tone(784, 0.14, 'sine', 0.16, 0); tone(1046, 0.20, 'sine', 0.16, 0.11); },
    wrong()   { tone(300, 0.16, 'sawtooth', 0.10); tone(220, 0.22, 'sawtooth', 0.09, 0.12); },
    stamp()   { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.15, i * 0.09)); },

    /* じょうはつ：ふわっと 上がる音 */
    rise() { 
      const c = ready(); if (!c) return;
      const t0 = c.currentTime;
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, t0);
      osc.frequency.exponentialRampToValueAtTime(1200, t0 + 0.45);
      g.gain.setValueAtTime(0.001, t0);
      g.gain.linearRampToValueAtTime(0.09, t0 + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      osc.connect(g).connect(c.destination);
      osc.start(t0); osc.stop(t0 + 0.55);
    },

    /* かみなり：ノイズを ドーンと ならす */
    thunder() {
      const c = ready(); if (!c) return;
      const t0 = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(c);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(900, t0);
      lp.frequency.exponentialRampToValueAtTime(120, t0 + 1.1);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.28, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.3);
      src.connect(lp).connect(g).connect(c.destination);
      src.start(t0); src.stop(t0 + 1.4);
    },

    /* あめ：ざーっという ながれる音（つよさ 0〜1） */
    rain(level) {
      const c = ready(); if (!c) return;
      if (!rainNode) {
        rainNode = c.createBufferSource();
        rainNode.buffer = noiseBuffer(c);
        rainNode.loop = true;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1400;
        bp.Q.value = 0.6;
        rainGain = c.createGain();
        rainGain.gain.value = 0;
        rainNode.connect(bp).connect(rainGain).connect(c.destination);
        rainNode.start();
      }
      const target = Math.max(0, Math.min(1, level)) * 0.12;
      rainGain.gain.setTargetAtTime(target, c.currentTime, 0.3);
    },

    stopRain() {
      if (rainGain && ctx) rainGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    }
  };
})();
