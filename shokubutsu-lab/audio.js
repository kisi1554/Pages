/* たねから はなまで ラボ — 音（WebAudio の 合成音のみ。音声ファイルは つかわない） */

const Sound = (function () {
  let ctx = null;
  let on = true;

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

  function tone(freq, dur, type, vol, delay, toFreq) {
    const c = ready();
    if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (toFreq) osc.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol == null ? 0.16 : vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /* みずの ちょろちょろ … ノイズを バンドパスで しぼる */
  function splash() {
    const c = ready();
    if (!c) return;
    const len = Math.floor(c.sampleRate * 0.6);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 300));
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    const t0 = c.currentTime;
    bp.frequency.setValueAtTime(900, t0);
    bp.frequency.linearRampToValueAtTime(2200, t0 + 0.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.22, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    src.connect(bp).connect(g).connect(c.destination);
    src.start(t0);
    src.stop(t0 + 0.62);
  }

  return {
    get enabled() { return on; },
    setEnabled(v) { on = !!v; },
    unlock() { ready(); },
    tap()     { tone(660, 0.08, 'triangle', 0.12); },
    water()   { splash(); },
    nyoki()   { tone(260, 0.28, 'sine', 0.18, 0, 720); tone(520, 0.12, 'triangle', 0.08, 0.22); },
    kiran()   { [1568, 2093, 2637].forEach((fr, i) => tone(fr, 0.32, 'sine', 0.1, i * 0.07)); },
    correct() { tone(784, 0.14, 'sine', 0.15, 0); tone(1046, 0.2, 'sine', 0.15, 0.11); },
    wrong()   { tone(300, 0.16, 'sawtooth', 0.08); tone(220, 0.22, 'sawtooth', 0.07, 0.12); },
    stamp()   { [523, 659, 784, 1046].forEach((fr, i) => tone(fr, 0.2, 'triangle', 0.13, i * 0.09)); }
  };
})();
