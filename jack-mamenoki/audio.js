'use strict';

/*
 * おと の ぜんぶ（おんせいファイル は つかわない）
 *  - BGM       : まめのき マーチ（オリジナル）。Web Audio で その場で えんそう する
 *  - こうかおん : もー・ぽこっ・にょきにょき・よいしょ・いびき・コーン・きん の たまご など（えいご モード でも おなじ）
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
    // うし の もー
    moo() {
      const t = ctx.currentTime;
      tone(150, t, 0.9, 'sawtooth', 0.06, null, 120);
      tone(300, t, 0.9, 'sine', 0.05, null, 240);
    },
    // まほう の きらきら
    magic() {
      const t = ctx.currentTime;
      [84, 88, 91, 96, 100].forEach((n, i) => tone(midi(n), t + i * 0.07, 0.3, 'sine', 0.07));
    },
    // まめ を うえる ぽこっ
    plant(n) {
      const t = ctx.currentTime;
      tone(midi(67 + (n || 0) * 4), t, 0.14, 'sine', 0.2, null, midi(60 + (n || 0) * 4));
      noise(t, 0.08, 500, 0.15, 1.5);
    },
    // じょうろ の しゃー
    water() {
      const t = ctx.currentTime;
      noise(t, 0.7, 3200, 0.16, 0.7, 'highpass');
    },
    // まめのき が にょきにょき（たかさ で おと が あがる）
    grow(level) {
      const t = ctx.currentTime;
      const b = 60 + Math.round((level || 0) * 24);
      tone(midi(b), t, 0.16, 'triangle', 0.1, null, midi(b + 5));
    },
    // のぼる（おりる）よいしょ
    step(n) {
      const t = ctx.currentTime;
      const notes = [72, 74, 76, 77, 79, 81, 83, 84];
      tone(midi(notes[(n || 0) % notes.length]), t, 0.12, 'triangle', 0.14);
      noise(t, 0.05, 900, 0.1, 2);
    },
    stepDown(n) {
      const t = ctx.currentTime;
      const notes = [84, 83, 81, 79, 77, 76, 74, 72];
      tone(midi(notes[(n || 0) % notes.length]), t, 0.12, 'triangle', 0.14);
      noise(t, 0.05, 900, 0.1, 2);
    },
    slip() {
      const t = ctx.currentTime;
      tone(500, t, 0.25, 'sine', 0.12, null, 300);
    },
    // きょじん の いびき
    snore() {
      const t = ctx.currentTime;
      noise(t, 0.9, 180, 0.22, 2, 'lowpass', 120);
      tone(70, t, 0.9, 'sawtooth', 0.03, null, 55);
    },
    // むにゃむにゃ（おきそう）
    stir() {
      const t = ctx.currentTime;
      tone(180, t, 0.25, 'sawtooth', 0.05, null, 140);
      tone(160, t + 0.28, 0.35, 'sawtooth', 0.05, null, 120);
    },
    // カチャッ
    unlock() {
      const t = ctx.currentTime;
      noise(t, 0.05, 3000, 0.3, 4);
      tone(midi(84), t + 0.05, 0.12, 'triangle', 0.14);
      tone(midi(91), t + 0.14, 0.2, 'triangle', 0.14);
    },
    cluck() {
      const t = ctx.currentTime;
      [0, 0.12, 0.24].forEach((d, i) => tone(600 + i * 80, t + d, 0.08, 'square', 0.05, null, 900));
    },
    // フィー ファイ フォー ファム（ひくい ドン ドン）
    fee() {
      const t = ctx.currentTime;
      [0, 0.25, 0.5, 0.75].forEach((d, i) => {
        tone(midi(40 + i * 2), t + d, 0.22, 'sawtooth', 0.06);
        noise(t + d, 0.15, 120, 0.25, 1, 'lowpass');
      });
    },
    // おの で コーン
    chop(n) {
      const t = ctx.currentTime;
      noise(t, 0.08, 1800, 0.35, 3);
      tone(midi(64 - (n || 0)), t, 0.2, 'triangle', 0.18);
    },
    // まめのき が たおれる
    fall() {
      const t = ctx.currentTime;
      tone(300, t, 1, 'triangle', 0.12, null, 90);
      noise(t + 1, 0.6, 200, 0.4, 0.8, 'lowpass');
    },
    // きん の たまご
    egg(n) {
      const t = ctx.currentTime;
      const b = 79 + (n || 0) * 2;
      [b, b + 4, b + 7, b + 12].forEach((m, i) => tone(midi(m), t + i * 0.06, 0.3, 'sine', 0.1));
    },
    gate() {
      const t = ctx.currentTime;
      tone(220, t, 0.4, 'square', 0.03, null, 260);
    },
    walk() {
      const t = ctx.currentTime;
      for (let i = 0; i < 4; i += 1) noise(t + i * 0.18, 0.07, 500 + (i % 2) * 200, 0.18, 2);
    },
    // さえずり（あさ）
    bird() {
      const t = ctx.currentTime;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i += 1) {
        const f = 2600 + Math.random() * 900;
        tone(f, t + i * 0.13, 0.09, 'sine', 0.05, null, f * 1.35);
      }
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

  /* ============================ ことり（あさ の ページ） ============================ */

  let birdTimer = null;
  function birds(on) {
    clearTimeout(birdTimer);
    birdTimer = null;
    if (!on) return;
    const next = () => {
      birdTimer = setTimeout(() => {
        sfx('bird');
        next();
      }, 2200 + Math.random() * 3200);
    };
    next();
  }

  /* ============================ BGM（まめのき マーチ。オリジナル） ============================ */

  // 0 は やすみ。4/4 びょうし、1しょうせつ = 8こ（8ぶ おんぷ）
  const MEL = [
    67, 0, 72, 72, 74, 0, 76, 0, 77, 76, 74, 0, 72, 0, 0, 0,
    67, 0, 74, 74, 76, 0, 77, 0, 79, 77, 76, 0, 74, 0, 0, 0,
    76, 0, 79, 79, 81, 0, 79, 0, 77, 0, 76, 0, 74, 0, 72, 0,
    74, 0, 76, 0, 74, 0, 71, 0, 72, 0, 0, 0, 0, 0, 0, 0,
  ];
  const BASS = [48, 48, 43, 43, 48, 53, 43, 48];
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
    const unit = 60 / 112 / 2;
    bgm.timer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      if (bgm.next < ctx.currentTime) bgm.next = ctx.currentTime + 0.05;
      while (bgm.next < ctx.currentTime + 0.3) {
        const i = bgm.step % MEL.length;
        if (MEL[i]) tone(midi(MEL[i]), bgm.next, 0.4, 'triangle', 0.045, bgmGain);
        const bar = Math.floor(i / 8) % BASS.length;
        const b = i % 8;
        if (b === 0 || b === 4) tone(midi(BASS[bar]), bgm.next, 0.35, 'sine', 0.07, bgmGain);
        else if (b === 2 || b === 6) {
          tone(midi(BASS[bar] + 16), bgm.next, 0.2, 'sine', 0.022, bgmGain);
          tone(midi(BASS[bar] + 19), bgm.next, 0.2, 'sine', 0.018, bgmGain);
        }
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
  let enVoice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    const vs = window.speechSynthesis.getVoices() || [];
    const lang = (v) => (v.lang || '').replace('_', '-');
    jaVoice = vs.find((v) => v.lang === 'ja-JP' && /Kyoko|O-ren|Google|Nanami|Haruka/i.test(v.name))
      || vs.find((v) => lang(v).indexOf('ja') === 0) || null;
    enVoice = vs.find((v) => lang(v) === 'en-US' && /Samantha|Google US|Aria|Jenny|Zira/i.test(v.name))
      || vs.find((v) => lang(v) === 'en-US') || vs.find((v) => lang(v).indexOf('en') === 0) || null;
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
   * opt.rate / opt.pitch で こえ を かえられる。
   * opt.lang が 'en' なら えいご の こえ で よむ。
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
    const en = o.lang === 'en';
    u.lang = en ? 'en-US' : 'ja-JP';
    if (!(en ? enVoice : jaVoice)) pickVoice();
    const voice = en ? enVoice : jaVoice;
    if (voice) u.voice = voice;
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
    birds,
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
