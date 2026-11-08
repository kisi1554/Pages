'use strict';

/*
 * おと（WebAudio の ごうせいおん だけ）。BGM と こうかおん は べつべつ に オン/オフ。
 *   Sound.unlock() / Sound.sfx(name) / Sound.bgm(on, boss) / Sound.events(list) / Sound.set({ bgm, sfx })
 */
const Sound = (() => {
  let ac = null;
  let master = null;
  let opt = { bgm: true, sfx: true };
  let bgmTimer = 0;
  let bgmOn = false;
  let bossMode = false;
  let step = 0;
  let lastShot = 0;

  function unlock() {
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ac = new AC();
        master = ac.createDynamicsCompressor();
        master.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
    } catch (e) {
      ac = null;
    }
  }

  function tone(freq, dur, type, vol, slide, when) {
    if (!ac) return;
    const t = ac.currentTime + (when || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, cut, when) {
    if (!ac) return;
    const t = ac.currentTime + (when || 0);
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ac.createBufferSource();
    s.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cut || 1200, t);
    f.frequency.exponentialRampToValueAtTime(80, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t);
  }

  const SFX = {
    shot: () => {
      const now = ac ? ac.currentTime : 0;
      if (now - lastShot < 0.07) return;
      lastShot = now;
      tone(1300, 0.06, 'square', 0.025, 700);
    },
    eshot: () => tone(330, 0.12, 'sawtooth', 0.03, 200),
    hit: () => tone(500, 0.05, 'square', 0.03, 300),
    clink: () => { tone(1800, 0.05, 'triangle', 0.05); tone(2400, 0.05, 'triangle', 0.04, null, 0.03); },
    boom: () => noise(0.35, 0.25, 1500),
    bigboom: () => { noise(1.2, 0.45, 2000); tone(120, 0.8, 'sine', 0.2, 40); },
    pickup: () => tone(1000, 0.08, 'sine', 0.06, 1600),
    bomb: () => { noise(0.9, 0.4, 3000); tone(200, 0.9, 'sine', 0.2, 1200); },
    hurt: () => tone(220, 0.25, 'sawtooth', 0.08, 90),
    down: () => { tone(400, 0.6, 'sawtooth', 0.08, 60); noise(0.5, 0.2, 800); },
    basehit: () => tone(90, 0.2, 'sine', 0.18, 50),
    warp: () => tone(200, 0.5, 'sine', 0.1, 1600),
    wave: () => [523, 659, 784].forEach((f, i) => tone(f, 0.14, 'triangle', 0.08, null, i * 0.1)),
    boss: () => [196, 185, 175, 165].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.07, null, i * 0.25)),
    clear: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, null, i * 0.13)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'triangle', 0.08, null, i * 0.3)),
    buy: () => [880, 1320].forEach((f, i) => tone(f, 0.1, 'square', 0.05, null, i * 0.08)),
    tap: () => tone(700, 0.05, 'triangle', 0.05),
  };

  function sfx(name) {
    if (!opt.sfx || !ac || !SFX[name]) return;
    try {
      SFX[name]();
    } catch (e) {
      /* おとが でなくても あそべる */
    }
  }

  function events(list) {
    for (const e of list) {
      if (e.type === 'boom') sfx(e.boss ? 'bigboom' : 'boom');
      else if (e.type === 'bossIn') sfx('boss');
      else if (e.type === 'waveClear' || e.type === 'shop') sfx('wave');
      else if (SFX[e.type]) sfx(e.type);
    }
  }

  // オリジナル の BGM（16ステップ の ループ。ボス の とき は テンポ アップ・くらい ちょうし）
  const BASS = [110, 0, 110, 0, 131, 0, 98, 0, 110, 0, 110, 0, 147, 0, 131, 0];
  const LEAD = [440, 523, 659, 523, 587, 0, 659, 0, 440, 523, 659, 784, 659, 587, 523, 0];
  const BOSS_BASS = [98, 98, 0, 98, 104, 0, 98, 0, 87, 87, 0, 87, 92, 0, 98, 0];
  const BOSS_LEAD = [392, 0, 466, 392, 415, 0, 392, 0, 349, 0, 415, 349, 370, 0, 392, 0];
  function tick() {
    if (!bgmOn || !opt.bgm || !ac) return;
    const bass = bossMode ? BOSS_BASS : BASS;
    const lead = bossMode ? BOSS_LEAD : LEAD;
    const i = step % 16;
    if (bass[i]) tone(bass[i], 0.18, 'triangle', 0.07);
    if (lead[i] && step % 32 >= 16) tone(lead[i], 0.12, 'square', 0.025);
    if (i % 4 === 0) noise(0.05, 0.05, 6000);
    step += 1;
  }
  function bgm(on, boss) {
    bgmOn = !!on;
    bossMode = !!boss;
    clearInterval(bgmTimer);
    if (bgmOn) bgmTimer = setInterval(tick, bossMode ? 120 : 150);
  }

  function set(o) {
    opt = Object.assign(opt, o);
    if (!opt.bgm) step = 0;
  }

  return { unlock, sfx, events, bgm, set };
})();
