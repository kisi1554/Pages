'use strict';

/*
 * しろっとクイズ — 音
 *
 * 音声ファイルは使わず、Web Audio で その場で 作る。
 *   SQAudio.unlock()      … 最初のタップで よびだす(ブラウザの制限をはずす)
 *   SQAudio.sfx(name)     … 効果音
 *   SQAudio.bgm(on)       … BGM の 出し入れ
 *   SQAudio.setOn(bool)   … 音ぜんたいの オン/オフ(localStorage におぼえる)
 */

const SQAudio = (() => {
  const KEY = 'shirotto-quiz:sound';
  let ctx = null;
  let master = null;
  let bgmGain = null;
  let bgmTimer = null;
  let bgmStep = 0;
  let bgmWanted = false;
  let on = true;

  try {
    on = localStorage.getItem(KEY) !== 'off';
  } catch (e) { /* プライベートモードなど。音は オンのままでよい */ }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0;
    bgmGain.connect(master);
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
  }

  // 単音。type は波の形、t0 からの長さ dur 秒。
  function tone(freq, t0, dur, type, vol, dest) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest || master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // ざらっとした音(着地・ゲームオーバー用)
  function noise(t0, dur, vol, freq) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq || 900;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
  }

  const SFX = {
    correct(t) {
      [784, 988, 1319].forEach((f, i) => tone(f, t + i * 0.075, 0.32, 'triangle', 0.22));
    },
    wrong(t) {
      tone(233, t, 0.22, 'sawtooth', 0.16);
      tone(175, t + 0.13, 0.34, 'sawtooth', 0.16);
    },
    land(t) {
      noise(t, 0.16, 0.28, 420);
      tone(110, t, 0.14, 'sine', 0.14);
    },
    slide(t) {
      noise(t, 0.08, 0.1, 1600);
    },
    hint(t) {
      tone(1047, t, 0.14, 'sine', 0.14);
      tone(1568, t + 0.07, 0.16, 'sine', 0.1);
    },
    start(t) {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.28, 'triangle', 0.2));
    },
    gameover(t) {
      [523, 440, 349, 262].forEach((f, i) => tone(f, t + i * 0.17, 0.5, 'triangle', 0.2));
      noise(t + 0.66, 0.5, 0.2, 300);
    },
  };

  function sfx(name) {
    if (!on || !SFX[name]) return;
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    SFX[name](c.currentTime + 0.01);
  }

  /* ---- BGM: 4小節ぶんの かんたんな くりかえし ---- */

  const BASS = [131, 131, 165, 165, 175, 175, 147, 147];
  const MELO = [523, 659, 784, 659, 698, 880, 784, 659,
                523, 659, 784, 988, 880, 784, 659, 587];

  function bgmTick() {
    if (!ctx || !on || !bgmWanted) return;
    const t = ctx.currentTime + 0.03;
    const i = bgmStep;
    if (i % 2 === 0) tone(BASS[(i / 2) % BASS.length], t, 0.42, 'sine', 0.22, bgmGain);
    tone(MELO[i % MELO.length], t, 0.3, 'triangle', 0.12, bgmGain);
    bgmStep = (bgmStep + 1) % 32;
  }

  function bgm(want) {
    bgmWanted = want;
    const c = ensure();
    if (!c) return;
    if (want && on) {
      if (c.state === 'suspended') c.resume();
      bgmGain.gain.setTargetAtTime(0.5, c.currentTime, 0.3);
      if (!bgmTimer) {
        bgmStep = 0;
        bgmTick();
        bgmTimer = setInterval(bgmTick, 260);
      }
    } else {
      if (bgmGain) bgmGain.gain.setTargetAtTime(0, c.currentTime, 0.15);
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
  }

  function setOn(value) {
    on = !!value;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* 保存できなくても遊べる */ }
    if (!on) bgm(false);
    else if (bgmWanted) bgm(true);
    return on;
  }

  return {
    unlock,
    sfx,
    bgm,
    setOn,
    isOn: () => on,
  };
})();
