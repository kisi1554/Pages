'use strict';

/*
 * おと の ぜんぶ（おんせいファイル は つかわない）
 *  - BGM       : のどかな はたけ の うた。Web Audio で その場で えんそう する
 *  - こうかおん : みず・め が でる・うんとこしょ・すっぽーん など
 *  - よみあげ  : ブラウザ の おんせいごうせい（speechSynthesis）
 * 「おと」（BGM＋こうかおん）と「よみあげ」は べつべつに オン/オフ できる。
 */
const Sound = (() => {
  let ctx = null;
  let master = null;
  let bgmGain = null;
  let sfxGain = null;
  let soundOn = true;
  let voiceOn = true;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = soundOn ? 0.9 : 0;
    master.connect(ctx.destination);
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 1;
    bgmGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.8;
    sfxGain.connect(master);
    return ctx;
  }

  /* スマホ は さいしょ の タップ で おと を ならせる ように する */
  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
    return c;
  }

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function tone(hz, at, dur, type, gain, dest, glideTo) {
    const c = ensure();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(hz, at);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(dest || sfxGain);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  let noiseBuf = null;
  function noise(at, dur, freq, gain, q, type, freqTo) {
    const c = ensure();
    if (!c) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.setValueAtTime(freq, at);
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, at + dur);
    f.Q.value = q || 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f);
    f.connect(g);
    g.connect(sfxGain);
    src.start(at);
    src.stop(at + dur + 0.05);
  }

  const SFX = {
    tap() {
      const t = ctx.currentTime;
      tone(880, t, 0.12, 'triangle', 0.18);
    },
    water() {
      const t = ctx.currentTime;
      noise(t, 0.5, 2400, 0.25, 0.8, 'bandpass', 900);
      [0, 0.12, 0.24].forEach((d, i) => tone(1200 - i * 150, t + d, 0.08, 'sine', 0.12, null, 600));
    },
    sprout() {
      const t = ctx.currentTime;
      tone(300, t, 0.25, 'sine', 0.3, null, 900);
      tone(midi(84), t + 0.2, 0.3, 'triangle', 0.15);
    },
    grow(step) {
      const t = ctx.currentTime;
      const base = 60 + (step || 0) * 2;
      [0, 4, 7, 12].forEach((n, i) => tone(midi(base + n), t + i * 0.07, 0.25, 'triangle', 0.16));
    },
    walk() {
      const t = ctx.currentTime;
      for (let i = 0; i < 4; i += 1) noise(t + i * 0.16, 0.08, 500 + (i % 2) * 200, 0.2, 2);
    },
    call() {
      const t = ctx.currentTime;
      tone(midi(79), t, 0.15, 'square', 0.06);
      tone(midi(84), t + 0.14, 0.25, 'square', 0.06);
    },
    creak(amount) {
      const t = ctx.currentTime;
      noise(t, 0.18, 300 + amount * 500, 0.08 + amount * 0.1, 6, 'bandpass');
    },
    heave(n) {
      const t = ctx.currentTime;
      tone(120, t, 0.35, 'sine', 0.55, null, 55);
      noise(t, 0.25, 180, 0.35, 1, 'lowpass');
      tone(midi(n % 2 ? 67 : 72), t + 0.05, 0.2, 'triangle', 0.12);
    },
    nope() {
      const t = ctx.currentTime;
      tone(420, t, 0.35, 'triangle', 0.18, null, 260);
      tone(300, t + 0.3, 0.45, 'triangle', 0.16, null, 170);
    },
    pop() {
      const t = ctx.currentTime;
      noise(t, 0.4, 600, 0.6, 0.7, 'lowpass', 3000);
      tone(200, t, 0.5, 'sine', 0.5, null, 1400);
      [72, 76, 79, 84, 88].forEach((n, i) => tone(midi(n), t + 0.35 + i * 0.09, 0.35, 'triangle', 0.18));
    },
    tumble() {
      const t = ctx.currentTime;
      [0, 0.15, 0.3].forEach((d) => tone(160, t + d, 0.18, 'sine', 0.35, null, 70));
      [0.1, 0.25].forEach((d) => tone(midi(96), t + d, 0.15, 'triangle', 0.08));
    },
    sparkle() {
      const t = ctx.currentTime;
      [88, 91, 96].forEach((n, i) => tone(midi(n), t + i * 0.06, 0.2, 'sine', 0.08));
    },
    bubble() {
      const t = ctx.currentTime;
      for (let i = 0; i < 6; i += 1) tone(300 + Math.random() * 300, t + i * 0.09, 0.08, 'sine', 0.15, null, 900);
    },
    fanfare() {
      const t = ctx.currentTime;
      [[72, 0], [76, 0.15], [79, 0.3], [84, 0.5]].forEach(([n, d]) => {
        tone(midi(n), t + d, 0.4, 'triangle', 0.2);
        tone(midi(n - 12), t + d, 0.4, 'sine', 0.12);
      });
    },
  };

  function sfx(name, arg) {
    if (!soundOn || !unlock()) return;
    const f = SFX[name];
    if (f) f(arg);
  }

  /* ============================ BGM（はたけ の うた） ============================ */

  // 0 は やすみ。ペンタトニック で のんびり
  const MEL = [
    72, 0, 74, 76, 79, 0, 76, 0, 74, 0, 72, 74, 76, 0, 0, 0,
    79, 0, 81, 79, 76, 0, 74, 0, 72, 0, 74, 0, 76, 0, 0, 0,
    72, 0, 74, 76, 79, 0, 81, 0, 84, 0, 81, 79, 76, 0, 0, 0,
    79, 0, 76, 74, 72, 0, 74, 0, 76, 0, 74, 0, 72, 0, 0, 0,
  ];
  const BASS = [48, 55, 53, 55, 48, 55, 53, 48];
  const bgm = { timer: null, step: 0, next: 0, ducked: false };

  function fade(to, sec) {
    if (!ctx || !bgmGain) return;
    const t = ctx.currentTime;
    bgmGain.gain.cancelScheduledValues(t);
    bgmGain.gain.setValueAtTime(bgmGain.gain.value, t);
    bgmGain.gain.linearRampToValueAtTime(to, t + (sec || 0.6));
  }

  function startBgm() {
    const c = unlock();
    if (!c || bgm.timer) return;
    bgm.step = 0;
    bgm.next = c.currentTime + 0.15;
    const unit = 60 / 100 / 2;
    bgm.timer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      if (bgm.next < ctx.currentTime) bgm.next = ctx.currentTime + 0.05;
      while (bgm.next < ctx.currentTime + 0.3) {
        const i = bgm.step % MEL.length;
        if (MEL[i]) tone(midi(MEL[i]), bgm.next, 0.35, 'triangle', 0.045, bgmGain);
        if (i % 4 === 0) tone(midi(BASS[(i / 8) % BASS.length | 0]), bgm.next, 0.5, 'sine', 0.06, bgmGain);
        bgm.step += 1;
        bgm.next += unit;
      }
    }, 60);
  }

  function duck(on) {
    bgm.ducked = on;
    fade(on ? 0.35 : 1, 0.4);
  }

  function setSound(v) {
    soundOn = !!v;
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(soundOn ? 0.9 : 0, t + 0.2);
  }

  /* ============================ よみあげ ============================ */

  let jaVoice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    const vs = window.speechSynthesis.getVoices() || [];
    jaVoice = vs.find((v) => v.lang === 'ja-JP' && /Kyoko|O-ren|Google|Nanami|Haruka/i.test(v.name))
      || vs.find((v) => (v.lang || '').replace('_', '-').indexOf('ja') === 0) || null;
  }
  if (window.speechSynthesis) {
    pickVoice();
    try {
      window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
    } catch (e) {
      window.speechSynthesis.onvoiceschanged = pickVoice;
    }
  }

  let cur = null;

  /*
   * text を よむ。onEnd は こえ が でない たんまつ でも かならず よばれる。
   * opt.rate / opt.pitch で こえ を かえられる（うんとこしょ は げんきに）。
   */
  function speak(text, onEnd, opt) {
    const o = opt || {};
    stopSpeak();
    const rec = { dead: false, timers: [] };
    const finish = () => {
      if (rec.dead) return;
      rec.dead = true;
      rec.timers.forEach(clearTimeout);
      if (cur === rec) {
        cur = null;
        duck(false);
      }
      if (onEnd) onEnd();
    };
    if (!voiceOn || !window.speechSynthesis || !text || typeof SpeechSynthesisUtterance === 'undefined') {
      setTimeout(finish, 0);
      return;
    }
    cur = rec;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (!jaVoice) pickVoice();
    if (jaVoice) u.voice = jaVoice;
    u.rate = o.rate || 0.9;
    u.pitch = o.pitch || 1.1;
    let started = false;
    u.onstart = () => { started = true; };
    u.onend = finish;
    u.onerror = finish;
    rec.timers.push(setTimeout(() => {
      if (!started) finish();
    }, 2500));
    rec.timers.push(setTimeout(finish, 4000 + text.length * 320));
    duck(true);
    try {
      window.speechSynthesis.speak(u);
    } catch (e) {
      finish();
    }
  }

  function stopSpeak() {
    if (cur) {
      cur.dead = true;
      cur.timers.forEach(clearTimeout);
      cur = null;
      duck(false);
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        /* なにも しない */
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopSpeak();
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  return {
    unlock,
    sfx,
    startBgm,
    setSound,
    isSoundOn: () => soundOn,
    speak,
    stopSpeak,
    setVoice(v) {
      voiceOn = !!v;
      if (!voiceOn) stopSpeak();
    },
    isVoiceOn: () => voiceOn,
  };
})();
