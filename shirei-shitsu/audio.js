'use strict';

/*
 * おと（WebAudio の ごうせいおん だけ）。オン/オフ は Sound.set(on)。
 *   point（かちゃん）・sigG/sigR（ぴっ）・chime（とうちゃく）・buzzer・arere・brake・melt・freeze・clear・locked
 *   Sound.gatan(speed)… がたんごとん（はやさ で テンポ）、Sound.kankan(on)… ふみきり
 */
const Sound = (() => {
  let ac = null;
  let master = null;
  let on = true;
  let kkTimer = 0;
  let lastGatan = 0;

  function unlock() {
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ac = new AC();
        master = ac.createGain();
        master.gain.value = 0.8;
        master.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
    } catch (e) {
      ac = null;
    }
  }

  function tone(freq, dur, type, vol, when, slide) {
    if (!ac || !on) return;
    const t = ac.currentTime + (when || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function noise(dur, vol, freq, when, q) {
    if (!ac || !on) return;
    const t = ac.currentTime + (when || 0);
    const n = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq || 1500;
    f.Q.value = q || 1.2;
    const g = ac.createGain();
    g.gain.value = vol || 0.2;
    src.connect(f).connect(g).connect(master);
    src.start(t);
  }

  const SFX = {
    point() { noise(0.05, 0.35, 2600, 0, 3); tone(320, 0.06, 'square', 0.05, 0.04); noise(0.06, 0.3, 1800, 0.07, 3); },
    sigG() { tone(1320, 0.09, 'sine', 0.12); },
    sigR() { tone(660, 0.12, 'sine', 0.12); },
    chime() {
      // オリジナル の とうちゃく チャイム
      [659, 784, 988, 880, 1175].forEach((f, i) => tone(f, 0.35, 'triangle', 0.1, i * 0.16));
    },
    depart() { tone(880, 0.12, 'sine', 0.08); tone(1100, 0.2, 'sine', 0.08, 0.12); },
    buzzer() { tone(180, 0.5, 'square', 0.08); tone(184, 0.5, 'sawtooth', 0.04); },
    arere() { tone(520, 0.18, 'triangle', 0.12, 0, 380); tone(390, 0.28, 'triangle', 0.12, 0.2, 260); },
    brake() { noise(0.6, 0.25, 4200, 0, 6); },
    locked() { tone(150, 0.12, 'square', 0.06); },
    frozen() { tone(1800, 0.05, 'sine', 0.06); tone(2200, 0.05, 'sine', 0.05, 0.06); },
    heat() { noise(0.08, 0.05, 900, 0, 1); },
    melt() { [700, 900, 1200].forEach((f, i) => tone(f, 0.12, 'sine', 0.08, i * 0.07)); },
    freeze() { [2400, 2000, 2600].forEach((f, i) => tone(f, 0.15, 'sine', 0.04, i * 0.09)); },
    sleep() { [523, 392, 330].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, i * 0.2)); },
    clear() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, i * 0.13)); },
    tap() { tone(900, 0.04, 'sine', 0.05); },
    place() { noise(0.04, 0.25, 1200, 0, 2); tone(500, 0.05, 'triangle', 0.06); },
  };

  function sfx(name) {
    if (!on || !ac) return;
    try { if (SFX[name]) SFX[name](); } catch (e) { /* むし */ }
  }

  // がたん ごとん。speed（いちばん はやい でんしゃ）で テンポ が かわる
  function gatan(speed, now) {
    if (!on || !ac || speed < 0.3) return;
    const gap = 1.8 / speed;
    if (now - lastGatan < gap) return;
    lastGatan = now;
    noise(0.04, 0.12, 300, 0, 2);
    noise(0.04, 0.1, 260, 0.11, 2);
  }

  function kankan(active) {
    if (active && !kkTimer && on) {
      const ring = () => { tone(1250, 0.18, 'square', 0.035); tone(1050, 0.18, 'square', 0.025, 0.02); };
      ring();
      kkTimer = setInterval(ring, 420);
    } else if ((!active || !on) && kkTimer) {
      clearInterval(kkTimer);
      kkTimer = 0;
    }
  }

  function set(v) {
    on = !!v;
    if (!on) kankan(false);
  }

  return { unlock, sfx, gatan, kankan, set, get on() { return on; } };
})();
