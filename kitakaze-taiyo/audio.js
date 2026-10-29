'use strict';

/*
 * おと の ぜんぶ（おんせいファイル は つかわない）
 *  - BGM       : ぽかぽか ワルツ（オリジナル）。Web Audio で その場で えんそう する
 *  - かぜ の おと: ノイズ に フィルター。かぜ の つよさ で おおきさ と たかさ が かわる
 *  - こうかおん : ぴゅー・きらきら・ぽたっ・ことり の さえずり など（えいご モード でも おなじ）
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
    // じまん（きたかぜ は ひくく、たいよう は たかく）
    boast(who) {
      const t = ctx.currentTime;
      const b = who === 'sun' ? 76 : 64;
      [0, 4, 7].forEach((n, i) => tone(midi(b + n), t + i * 0.08, 0.22, 'square', 0.05));
    },
    pick() {
      const t = ctx.currentTime;
      [72, 79, 84].forEach((n, i) => tone(midi(n), t + i * 0.07, 0.25, 'triangle', 0.16));
    },
    hello() {
      const t = ctx.currentTime;
      tone(midi(79), t, 0.15, 'triangle', 0.14);
      tone(midi(84), t + 0.14, 0.25, 'triangle', 0.14);
    },
    walk() {
      const t = ctx.currentTime;
      for (let i = 0; i < 4; i += 1) noise(t + i * 0.18, 0.07, 500 + (i % 2) * 200, 0.18, 2);
    },
    // ボタン を ぎゅっ
    snap(n) {
      const t = ctx.currentTime;
      noise(t, 0.05, 2600, 0.3, 3);
      tone(midi(72 + (n || 0) * 4), t + 0.02, 0.14, 'triangle', 0.16);
    },
    // とぶ もの の ぴゅー
    fly() {
      const t = ctx.currentTime;
      tone(500, t, 0.5, 'sine', 0.12, null, 1500);
      noise(t, 0.45, 1500, 0.12, 2, 'bandpass', 3500);
    },
    brr() {
      const t = ctx.currentTime;
      for (let i = 0; i < 6; i += 1) tone(220 + (i % 2) * 30, t + i * 0.05, 0.05, 'square', 0.04);
    },
    tired() {
      const t = ctx.currentTime;
      tone(420, t, 0.4, 'triangle', 0.16, null, 260);
      tone(300, t + 0.36, 0.55, 'triangle', 0.14, null, 160);
    },
    // くも が ぽんっ と どく
    poof() {
      const t = ctx.currentTime;
      noise(t, 0.35, 800, 0.35, 0.8, 'lowpass', 200);
      tone(midi(76), t + 0.05, 0.18, 'sine', 0.12, null, midi(88));
    },
    // たいよう の きらきら
    sparkle(level) {
      const t = ctx.currentTime;
      const b = 84 + Math.round((level || 0) * 7);
      [b, b + 3, b + 7].forEach((n, i) => tone(midi(n), t + i * 0.05, 0.22, 'sine', 0.06));
    },
    // あせ の ぽたっ
    drip() {
      const t = ctx.currentTime;
      tone(1300, t, 0.12, 'sine', 0.2, null, 500);
    },
    hatOff() {
      const t = ctx.currentTime;
      tone(midi(79), t, 0.12, 'triangle', 0.14);
      tone(midi(74), t + 0.1, 0.18, 'triangle', 0.12);
    },
    buttons() {
      const t = ctx.currentTime;
      [0, 0.12, 0.24].forEach((d, i) => {
        noise(t + d, 0.04, 3000, 0.25, 3);
        tone(midi(84 - i * 3), t + d, 0.1, 'triangle', 0.12);
      });
    },
    // コート が ふわっ
    float() {
      const t = ctx.currentTime;
      noise(t, 0.8, 600, 0.12, 1, 'bandpass', 1800);
      [72, 76, 79, 83].forEach((n, i) => tone(midi(n), t + 0.1 + i * 0.12, 0.3, 'sine', 0.08));
    },
    yawn() {
      const t = ctx.currentTime;
      tone(330, t, 0.9, 'sine', 0.14, null, 180);
      tone(midi(76), t + 0.9, 0.3, 'triangle', 0.1);
    },
    // さえずり（たいよう の ページ）
    bird() {
      const t = ctx.currentTime;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i += 1) {
        const f = 2600 + Math.random() * 900;
        tone(f, t + i * 0.13, 0.09, 'sine', 0.05, null, f * 1.35);
      }
    },
    shake() {
      const t = ctx.currentTime;
      [72, 76, 79].forEach((n, i) => tone(midi(n), t + i * 0.1, 0.3, 'triangle', 0.15));
      tone(midi(84), t + 0.32, 0.5, 'triangle', 0.18);
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

  /* ============================ かぜ の おと（ずっと なる） ============================ */

  // ノイズ に フィルター。つよさ で おおきさ と たかさ が かわる
  const wnd = { src: null, f: null, g: null };
  function wind(level) {
    const lv = Math.max(0, Math.min(1, level || 0));
    if (!ctx || ctx.state !== 'running') return;
    if (!wnd.src) {
      if (lv < 0.01) return;
      noise(ctx.currentTime, 0.01, 1000, 0.0002); // noiseBuf を つくる
      wnd.src = ctx.createBufferSource();
      wnd.src.buffer = noiseBuf;
      wnd.src.loop = true;
      wnd.f = ctx.createBiquadFilter();
      wnd.f.type = 'bandpass';
      wnd.f.Q.value = 0.9;
      wnd.g = ctx.createGain();
      wnd.g.gain.value = 0;
      wnd.src.connect(wnd.f);
      wnd.f.connect(wnd.g);
      wnd.g.connect(sfxGain);
      wnd.src.start();
    }
    const t = ctx.currentTime;
    wnd.g.gain.setTargetAtTime(lv * 0.55, t, 0.08);
    wnd.f.frequency.setTargetAtTime(280 + lv * 1400, t, 0.1);
  }

  /* ============================ ことり（たいよう の ページ） ============================ */

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

  /* ============================ BGM（ぽかぽか ワルツ。オリジナル） ============================ */

  // 0 は やすみ。3/4 びょうし、1しょうせつ = 6こ
  const MEL = [
    67, 0, 72, 0, 76, 0, 74, 0, 72, 0, 69, 0, 67, 0, 0, 0, 72, 74, 76, 0, 0, 0, 0, 0,
    77, 0, 76, 0, 74, 0, 72, 0, 74, 0, 76, 0, 74, 0, 0, 0, 67, 0, 74, 0, 0, 0, 0, 0,
    67, 0, 72, 0, 76, 0, 79, 0, 77, 0, 76, 0, 74, 0, 76, 0, 77, 0, 76, 0, 0, 0, 0, 0,
    81, 0, 79, 0, 77, 0, 76, 0, 74, 0, 72, 0, 74, 0, 0, 0, 71, 0, 72, 0, 0, 0, 0, 0,
  ];
  const BASS = [48, 53, 48, 48, 53, 48, 43, 43, 48, 52, 43, 48, 53, 48, 43, 48];
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
    const unit = 60 / 120 / 2;
    bgm.timer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      if (bgm.next < ctx.currentTime) bgm.next = ctx.currentTime + 0.05;
      while (bgm.next < ctx.currentTime + 0.3) {
        const i = bgm.step % MEL.length;
        if (MEL[i]) tone(midi(MEL[i]), bgm.next, 0.4, 'triangle', 0.045, bgmGain);
        const bar = Math.floor(i / 6) % BASS.length;
        const b = i % 6;
        if (b === 0) tone(midi(BASS[bar]), bgm.next, 0.6, 'sine', 0.07, bgmGain);
        else if (b === 2 || b === 4) {
          tone(midi(BASS[bar] + 16), bgm.next, 0.25, 'sine', 0.022, bgmGain);
          tone(midi(BASS[bar] + 19), bgm.next, 0.25, 'sine', 0.018, bgmGain);
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
    wind,
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
