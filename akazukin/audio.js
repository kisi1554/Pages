'use strict';

/*
 * おと の ぜんぶ（おんせいファイル は つかわない）
 *  - BGM       : もり の おさんぽ（オリジナル、6/8 の かるい スキップ）。Web Audio で その場で えんそう する
 *  - こうかおん : ことり・あしおと・がさがさ・ぽんっ・トントン・へんな こえ・びよーん・ばさっ・こらーっ・ぴゅーん・ことん など
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
    // もちあげる ふわっ
    lift() {
      const t = ctx.currentTime;
      tone(midi(76), t, 0.12, 'sine', 0.1, null, midi(83));
    },
    // かご・おさら に いれる ぽとん
    put(n) {
      const t = ctx.currentTime;
      const b = 72 + ((n || 0) % 4) * 2;
      tone(midi(b), t, 0.14, 'triangle', 0.16);
      tone(midi(b + 7), t + 0.08, 0.2, 'triangle', 0.13);
    },
    // ちがう もの・のびる みみ: びよーん
    boing() {
      const t = ctx.currentTime;
      const c = ensure();
      const o = c.createOscillator();
      const g = c.createGain();
      const lfo = c.createOscillator();
      const lg = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(200, t);
      o.frequency.exponentialRampToValueAtTime(520, t + 0.5);
      lfo.frequency.value = 14;
      lg.gain.value = 30;
      lfo.connect(lg);
      lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g);
      g.connect(sfxGain);
      o.start(t);
      lfo.start(t);
      o.stop(t + 0.65);
      lfo.stop(t + 0.65);
    },
    // みち の うえ の あしおと（すすむ ほど すこし たかく）
    step(n) {
      const t = ctx.currentTime;
      noise(t, 0.06, 700 + ((n || 0) % 2) * 220, 0.18, 2);
      tone(midi(67 + ((n || 0) % 5) * 2), t, 0.08, 'sine', 0.05);
    },
    // くさ を ふむ がさがさ（みち の そと）
    grass() {
      const t = ctx.currentTime;
      for (let i = 0; i < 3; i += 1) noise(t + i * 0.07, 0.09, 2400 + i * 400, 0.12, 0.8, 'highpass');
    },
    // おはな を つむ ぽんっ（えらぶ とき も）
    pick(n) {
      const t = ctx.currentTime;
      const b = 79 + ((n || 0) % 5) * 2;
      tone(midi(b), t, 0.12, 'sine', 0.2, null, midi(b + 12));
    },
    magic() {
      const t = ctx.currentTime;
      [84, 88, 91, 96, 100].forEach((m, i) => tone(midi(m), t + i * 0.07, 0.3, 'sine', 0.07));
    },
    hurry() {
      const t = ctx.currentTime;
      [72, 76, 79].forEach((m, i) => tone(midi(m), t + i * 0.08, 0.12, 'square', 0.04));
    },
    // ノック トントン
    knock() {
      const t = ctx.currentTime;
      [0, 0.16].forEach((d) => {
        noise(t + d, 0.07, 600, 0.45, 3);
        tone(160, t + d, 0.09, 'sine', 0.22, null, 110);
      });
    },
    // へんな こえ（ひくい ブザー）
    weird() {
      const t = ctx.currentTime;
      tone(110, t, 0.5, 'sawtooth', 0.06, null, 92);
      tone(116, t, 0.5, 'square', 0.03, null, 96);
      tone(98, t + 0.5, 0.6, 'sawtooth', 0.06, null, 80);
    },
    // クローゼット の とびら ギィ
    creak() {
      const t = ctx.currentTime;
      tone(320 + Math.random() * 80, t, 0.22, 'sawtooth', 0.025, null, 260);
    },
    shut() {
      const t = ctx.currentTime;
      noise(t, 0.08, 900, 0.4, 2);
      tone(140, t, 0.12, 'sine', 0.2, null, 90);
    },
    door() {
      const t = ctx.currentTime;
      tone(260, t, 0.5, 'sawtooth', 0.025, null, 180);
      noise(t + 0.45, 0.08, 500, 0.3, 2);
    },
    // へんそう ぼわん
    poof() {
      const t = ctx.currentTime;
      noise(t, 0.5, 800, 0.3, 0.6, 'lowpass', 200);
      [79, 84, 88].forEach((m, i) => tone(midi(m), t + 0.1 + i * 0.06, 0.25, 'sine', 0.07));
    },
    // ふとん ばさっ
    whoosh() {
      const t = ctx.currentTime;
      noise(t, 0.35, 1800, 0.35, 0.7, 'bandpass', 500);
    },
    // たすけて！の よびごえ（たまる ほど たかく）
    call(level) {
      const t = ctx.currentTime;
      const b = 72 + Math.round((level || 0) * 12);
      tone(midi(b), t, 0.1, 'triangle', 0.13, null, midi(b + 3));
    },
    // おおごえ「こらーっ」（のこぎり波＋ビブラート。ことば は よみあげ で）
    shout() {
      const t = ctx.currentTime;
      const c = ensure();
      const o = c.createOscillator();
      const g = c.createGain();
      const lfo = c.createOscillator();
      const lg = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(240, t);
      o.frequency.linearRampToValueAtTime(330, t + 0.25);
      o.frequency.linearRampToValueAtTime(220, t + 1.1);
      lfo.frequency.value = 7;
      lg.gain.value = 18;
      lfo.connect(lg);
      lg.connect(o.frequency);
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1600;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
      g.gain.setValueAtTime(0.12, t + 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      o.connect(f);
      f.connect(g);
      g.connect(sfxGain);
      o.start(t);
      lfo.start(t);
      o.stop(t + 1.25);
      lfo.stop(t + 1.25);
    },
    // おおかみ が にげる ぴゅーん
    flee() {
      const t = ctx.currentTime;
      tone(1400, t, 0.6, 'sine', 0.12, null, 300);
      for (let i = 0; i < 4; i += 1) noise(t + i * 0.09, 0.05, 600, 0.12, 2);
    },
    // とおく で「もう しませーん」
    far() {
      const t = ctx.currentTime;
      tone(330, t, 0.35, 'triangle', 0.04, null, 300);
      tone(294, t + 0.35, 0.6, 'triangle', 0.04, null, 250);
    },
    // ケーキ を おさら に ことん
    plate(n) {
      const t = ctx.currentTime;
      tone(midi(84 + (n || 0) * 2), t, 0.25, 'sine', 0.14);
      tone(midi(96 + (n || 0) * 2), t, 0.15, 'sine', 0.05);
    },
    // ことり の さえずり（もり）
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
      [[72, 0], [76, 0.15], [79, 0.3], [84, 0.5]].forEach(([m, d]) => {
        tone(midi(m), t + d, 0.4, 'triangle', 0.2);
        tone(midi(m - 12), t + d, 0.4, 'sine', 0.12);
      });
    },
  };

  function sfx(name, arg) {
    if (!soundOn || !unlock()) return;
    const f = SFX[name];
    if (f) f(arg);
  }

  /* ============================ ことり（もり の ページ） ============================ */

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

  /* ============================ BGM（もり の おさんぽ。オリジナル） ============================ */

  // 0 は やすみ。6/8 びょうし、1しょうせつ = 6こ（8ぶ おんぷ）。たん・た たん・た の スキップ
  const MEL = [
    72, 0, 74, 76, 0, 72, 77, 0, 76, 74, 0, 0,
    72, 0, 74, 76, 0, 79, 77, 0, 74, 72, 0, 0,
    79, 0, 81, 79, 0, 77, 76, 0, 77, 79, 0, 0,
    77, 0, 76, 74, 0, 76, 72, 0, 0, 0, 0, 0,
  ];
  const BASS = [48, 53, 48, 43, 48, 53, 43, 48];
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
    const unit = 60 / 100 / 3; // 8ぶ おんぷ（ふてん4ぶ = 100）
    bgm.timer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      if (bgm.next < ctx.currentTime) bgm.next = ctx.currentTime + 0.05;
      while (bgm.next < ctx.currentTime + 0.3) {
        const i = bgm.step % MEL.length;
        if (MEL[i]) tone(midi(MEL[i]), bgm.next, MEL[(i + 1) % MEL.length] ? 0.22 : 0.4, 'triangle', 0.045, bgmGain);
        const bar = Math.floor(i / 6) % BASS.length;
        const b = i % 6;
        if (b === 0 || b === 3) tone(midi(BASS[bar] + (b === 3 ? 7 : 0)), bgm.next, 0.3, 'sine', 0.07, bgmGain);
        else if (b === 2 || b === 5) {
          tone(midi(BASS[bar] + 16), bgm.next, 0.14, 'sine', 0.02, bgmGain);
          tone(midi(BASS[bar] + 19), bgm.next, 0.14, 'sine', 0.016, bgmGain);
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
