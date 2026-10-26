'use strict';

/*
 * おと の ぜんぶ（おんげんファイル は つかわない）
 *  - BGM      : オルゴール ふう。Web Audio で その場で えんそう する
 *  - こうかおん: しかけ を さわった ときの ちいさな おと
 *  - よみあげ : ブラウザ の おんせいごうせい（speechSynthesis）
 * おんがく と よみあげ は べつべつに オン/オフ できる。
 */
const Sound = (() => {
  let ctx = null;
  let master = null;
  let bgmGain = null;
  let sfxGain = null;
  let musicOn = true;
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
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0;
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
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), at + Math.min(0.08, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f);
    f.connect(g);
    g.connect(sfxGain);
    src.start(at, Math.random());
    src.stop(at + dur + 0.05);
  }

  /* オルゴール の 1おと（たかい ばいおん を すこし まぜる） */
  function box(n, at, gain, dest) {
    const hz = midi(n);
    tone(hz, at, 1.5, 'sine', gain, dest);
    tone(hz * 2, at, 0.6, 'sine', gain * 0.3, dest);
    tone(hz * 4.01, at, 0.2, 'sine', gain * 0.12, dest);
  }

  const now = () => (ensure() ? ctx.currentTime : 0);

  const SFX = {
    pop() { const t = now(); tone(520, t, 0.1, 'triangle', 0.12, null, 780); },
    boing() { const t = now(); tone(220, t, 0.32, 'sine', 0.16, null, 520); },
    bloom() { const t = now(); [784, 988, 1175, 1568].forEach((h, i) => tone(h, t + i * 0.05, 0.3, 'sine', 0.07)); },
    chirp() { const t = now(); tone(2400, t, 0.08, 'sine', 0.06, null, 3200); tone(2600, t + 0.11, 0.08, 'sine', 0.06, null, 3400); },
    fly() { const t = now(); for (let i = 0; i < 4; i += 1) noise(t + i * 0.07, 0.06, 1800, 0.05, 2); },
    flip() { const t = now(); noise(t, 0.3, 3000, 0.12, 0.8, 'bandpass', 900); },
    rustle() { const t = now(); for (let i = 0; i < 5; i += 1) noise(t + i * 0.05, 0.08, 2500 + Math.random() * 1500, 0.06, 1.5); },
    squeak() { const t = now(); tone(1300 + Math.random() * 300, t, 0.09, 'sine', 0.04, null, 1900); },
    wind() { const t = now(); noise(t, 0.7, 500, 0.16, 0.7, 'bandpass', 1600); },
    ratchet() { const t = now(); noise(t, 0.03, 3200, 0.08, 3); },
    gatan() { const t = now(); noise(t, 0.08, 240, 0.2, 0.9); noise(t + 0.14, 0.08, 190, 0.18, 0.9); },
    whistle() { const t = now(); tone(880, t, 0.5, 'sine', 0.1); tone(1108, t, 0.5, 'sine', 0.08); },
    wave() { const t = now(); noise(t, 0.9, 400, 0.14, 0.5, 'lowpass', 1200); },
    horn() { const t = now(); tone(110, t, 0.9, 'sawtooth', 0.06); tone(165, t, 0.9, 'sawtooth', 0.04); },
    quack() { const t = now(); tone(500, t, 0.12, 'square', 0.04, null, 380); tone(500, t + 0.16, 0.12, 'square', 0.04, null, 380); },
    gull() { const t = now(); [0, 0.18, 0.36].forEach((d) => tone(1500, t + d, 0.15, 'triangle', 0.07, null, 900)); },
    meow() { const t = now(); tone(500, t, 0.18, 'triangle', 0.1, null, 820); tone(820, t + 0.18, 0.3, 'triangle', 0.09, null, 440); },
    splash() { const t = now(); noise(t, 0.35, 1800, 0.14, 0.6, 'highpass'); tone(300, t, 0.12, 'sine', 0.06, null, 900); },
    tick() { const t = now(); tone(1600, t, 0.04, 'square', 0.05); tone(1200, t + 0.25, 0.04, 'square', 0.05); },
    star() { const t = now(); [1319, 1760, 2093].forEach((h, i) => tone(h, t + i * 0.06, 0.5, 'sine', 0.07)); },
    sparkle() { const t = now(); [1047, 1319, 1568, 2093, 2637].forEach((h, i) => tone(h, t + i * 0.07, 0.45, 'sine', 0.06)); },
    ok() { const t = now(); box(72, t, 0.12, sfxGain); box(76, t + 0.12, 0.12, sfxGain); box(79, t + 0.24, 0.12, sfxGain); box(84, t + 0.38, 0.14, sfxGain); },
    stamp() { const t = now(); tone(160, t, 0.16, 'sine', 0.2, null, 60); tone(880, t + 0.08, 0.2, 'triangle', 0.08, null, 1320); },
    page() { const t = now(); noise(t, 0.28, 2400, 0.08, 0.7, 'bandpass', 1200); },
    nope() { const t = now(); tone(392, t, 0.14, 'triangle', 0.08); tone(330, t + 0.14, 0.22, 'triangle', 0.08); },
    choose() { const t = now(); box(79, t, 0.12, sfxGain); box(84, t + 0.1, 0.12, sfxGain); },
    word() { const t = now(); tone(880, t, 0.06, 'sine', 0.03); },
  };

  function sfx(name) {
    if (!unlock()) return;
    const f = SFX[name];
    if (f) f();
  }

  /* ============================ BGM（オルゴール） ============================ */

  const SONGS = {
    day: {
      bpm: 96,
      gain: 0.05,
      chords: [[48, 55, 60], [53, 57, 60], [55, 59, 62], [48, 55, 60], [57, 60, 64], [53, 57, 60], [55, 59, 62], [48, 55, 60]],
      mel: [
        76, 0, 79, 0, 84, 0, 79, 76, 77, 0, 81, 0, 84, 81, 77, 0, 79, 77, 76, 74, 71, 0, 74, 0, 72, 0, 76, 79, 76, 0, 0, 0,
        81, 0, 79, 76, 72, 0, 76, 0, 77, 76, 74, 0, 77, 0, 81, 0, 79, 0, 83, 0, 86, 83, 79, 0, 84, 0, 79, 0, 72, 0, 0, 0,
      ],
    },
    yu: {
      bpm: 80,
      gain: 0.045,
      chords: [[53, 57, 60], [48, 55, 60], [57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 55, 60], [50, 53, 57], [55, 59, 62]],
      mel: [
        77, 0, 76, 0, 72, 0, 69, 0, 72, 0, 76, 0, 79, 0, 0, 0, 81, 0, 79, 76, 72, 0, 76, 0, 74, 0, 0, 0, 71, 0, 0, 0,
        77, 0, 81, 0, 84, 0, 81, 0, 79, 0, 76, 0, 72, 0, 0, 0, 74, 0, 77, 0, 81, 0, 77, 0, 79, 0, 0, 0, 0, 0, 0, 0,
      ],
    },
    yoru: {
      bpm: 64,
      gain: 0.045,
      chords: [[48, 55, 60], [45, 52, 57], [53, 57, 60], [55, 59, 62], [48, 55, 60], [45, 52, 57], [53, 57, 60], [48, 55, 60]],
      mel: [
        72, 0, 0, 76, 79, 0, 0, 0, 76, 0, 0, 72, 69, 0, 0, 0, 77, 0, 76, 0, 74, 0, 72, 0, 74, 0, 0, 0, 71, 0, 0, 0,
        72, 0, 0, 76, 79, 0, 84, 0, 81, 0, 79, 0, 76, 0, 0, 0, 77, 0, 76, 0, 74, 0, 71, 0, 72, 0, 0, 0, 0, 0, 0, 0,
      ],
    },
  };

  const bgm = { song: null, timer: null, step: 0, next: 0, ducked: false };
  const bgmVol = () => (bgm.ducked ? 0.35 : 1);

  function fade(to, sec) {
    if (!ctx || !bgmGain) return;
    const t = ctx.currentTime;
    bgmGain.gain.cancelScheduledValues(t);
    bgmGain.gain.setValueAtTime(bgmGain.gain.value, t);
    bgmGain.gain.linearRampToValueAtTime(to, t + (sec || 0.6));
  }

  function playBgm(name) {
    const s = SONGS[name];
    if (!s) return;
    if (bgm.song === name && bgm.timer) return;
    const c = unlock();
    if (!c) return;
    if (bgm.timer) clearInterval(bgm.timer);
    bgm.song = name;
    bgm.step = 0;
    bgm.next = c.currentTime + 0.15;
    const unit = 60 / s.bpm / 2;
    if (musicOn) fade(bgmVol(), 1.2);
    bgm.timer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      if (bgm.next < ctx.currentTime) bgm.next = ctx.currentTime + 0.05;
      while (bgm.next < ctx.currentTime + 0.3) {
        const i = bgm.step % s.mel.length;
        const n = s.mel[i];
        if (n) box(n, bgm.next, s.gain, bgmGain);
        if (i % 2 === 0) {
          const ch = s.chords[Math.floor(i / 8) % s.chords.length];
          box(ch[(i / 2) % 3] , bgm.next, s.gain * 0.5, bgmGain);
        }
        bgm.step += 1;
        bgm.next += unit;
      }
    }, 60);
  }

  function setMusic(v) {
    musicOn = !!v;
    if (musicOn) {
      unlock();
      fade(bgmVol(), 0.6);
    } else {
      fade(0, 0.3);
    }
  }

  function duck(on) {
    bgm.ducked = on;
    if (musicOn) fade(bgmVol(), 0.4);
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

  const RATE = 0.9;
  let cur = null;

  /*
   * text を よむ。h.onStart(rate) / h.onBoundary(charIndex) / h.onEnd()
   * こえ が でない たんまつ でも onEnd は かならず よばれる（とまらない ように）。
   */
  function speak(text, h) {
    const hh = h || {};
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
      if (hh.onEnd) hh.onEnd();
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
    u.rate = RATE;
    u.pitch = 1.1;
    let started = false;
    u.onstart = () => {
      started = true;
      if (!rec.dead && hh.onStart) hh.onStart(RATE);
    };
    u.onboundary = (e) => {
      if (!rec.dead && hh.onBoundary && typeof e.charIndex === 'number') hh.onBoundary(e.charIndex);
    };
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
    if (!ctx) return;
    if (document.hidden) {
      ctx.suspend();
      stopSpeak();
    } else {
      ctx.resume();
    }
  });

  return {
    unlock,
    sfx,
    playBgm,
    setMusic,
    isMusicOn: () => musicOn,
    speak,
    stopSpeak,
    setVoice(v) {
      voiceOn = !!v;
      if (!voiceOn) stopSpeak();
    },
    isVoiceOn: () => voiceOn,
    ttsSupported: () => !!window.speechSynthesis,
  };
})();
