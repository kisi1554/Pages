'use strict';

/*
 * おと まわり(音源ファイルは つかわない。ぜんぶ Web Audio API で その場で つくる)
 *  - なきごえ : セミ 7しゅるいを 「バンドパス + ふるえ(トレモロ)」で にせて つくる
 *  - こうかおん: ピンポン / ブブー / タップ / ファンファーレ / つちを ほる
 *  - もりのおと: とおくの セミの がっしょう(セミとりモードの はいけい)
 *  - よみあげ  : ブラウザの おんせいごうせい(日本語)
 */

const SemiAudio = (function () {
  let ctx = null;
  let master = null;
  let seBus = null;
  let songBus = null;
  let ambBus = null;

  let seOn = true;
  let songOn = true;
  let voiceOn = true;

  function ensureCtx() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    seBus = ctx.createGain();
    seBus.gain.value = 0.7;
    seBus.connect(master);

    songBus = ctx.createGain();
    songBus.gain.value = 0.85;
    songBus.connect(master);

    ambBus = ctx.createGain();
    ambBus.gain.value = 0.0;
    ambBus.connect(master);
    return true;
  }

  /* ---------------------------- 音の ぶひん ---------------------------- */

  let noiseBuf = null;
  function noise() {
    if (noiseBuf) return noiseBuf;
    const len = Math.floor(ctx.sampleRate * 2);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  /*
   * ざらざらした「ジー」系の おと。
   * o = { hz, hzTo, q, trem, depth, tremWave, gain, attack, release }
   */
  function buzz(t, dur, o, bus) {
    const out = bus || songBus;
    const src = ctx.createBufferSource();
    src.buffer = noise();
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = o.q === undefined ? 6 : o.q;
    bp.frequency.setValueAtTime(o.hz, t);
    if (o.hzTo) bp.frequency.exponentialRampToValueAtTime(o.hzTo, t + dur);

    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'bandpass';
    bp2.Q.value = (o.q === undefined ? 6 : o.q) * 0.8;
    bp2.frequency.setValueAtTime(o.hz, t);
    if (o.hzTo) bp2.frequency.exponentialRampToValueAtTime(o.hzTo, t + dur);

    // ふるえ(トレモロ)= セミの おなかの ふるえ
    const trem = ctx.createGain();
    const depth = o.depth === undefined ? 0.7 : o.depth;
    trem.gain.value = 1 - depth / 2;
    if (o.trem) {
      const lfo = ctx.createOscillator();
      lfo.type = o.tremWave || 'sine';
      lfo.frequency.value = o.trem;
      const lg = ctx.createGain();
      lg.gain.value = depth / 2;
      lfo.connect(lg);
      lg.connect(trem.gain);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }

    const g = ctx.createGain();
    const peak = o.gain === undefined ? 0.3 : o.gain;
    const atk = o.attack === undefined ? 0.03 : o.attack;
    const rel = o.release === undefined ? 0.06 : o.release;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + Math.min(atk, dur * 0.5));
    g.gain.setValueAtTime(peak, t + Math.max(dur - rel, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(bp);
    bp.connect(bp2);
    bp2.connect(trem);
    trem.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + dur + 0.05);
    return src;
  }

  /* きんぞくっぽい「カナ」系の おと */
  function tone(t, dur, o, bus) {
    const out = bus || songBus;
    const osc = ctx.createOscillator();
    osc.type = o.wave || 'sawtooth';
    osc.frequency.setValueAtTime(o.hz, t);
    if (o.hzTo) osc.frequency.exponentialRampToValueAtTime(o.hzTo, t + dur);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(o.band || o.hz * 3, t);
    bp.Q.value = o.q === undefined ? 4 : o.q;

    const g = ctx.createGain();
    const peak = o.gain === undefined ? 0.18 : o.gain;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (o.attack || 0.012));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(bp);
    bp.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  /* ---------------------------- なきごえ ---------------------------- */
  /* それぞれ 「はじまりの じかん t」を うけとって、ぜんたいの ながさを かえす */

  const SONGS = {
    // ジリジリジリ… こまかい ふるえが ずっと つづく
    abura(t, bus, vol) {
      const dur = 3.4;
      buzz(t, dur, { hz: 3900, q: 1.1, trem: 40, depth: 0.85, tremWave: 'sawtooth', gain: 0.24 * vol, attack: 0.5, release: 0.7 }, bus);
      buzz(t, dur, { hz: 1950, q: 0.9, trem: 40, depth: 0.85, tremWave: 'sawtooth', gain: 0.13 * vol, attack: 0.6, release: 0.7 }, bus);
      return dur;
    },

    // ミーン ミンミンミン ミー
    minmin(t, bus, vol) {
      let at = t;
      buzz(at, 0.95, { hz: 2500, hzTo: 2950, q: 3.2, trem: 24, depth: 0.55, gain: 0.38 * vol, attack: 0.25, release: 0.1 }, bus);
      at += 0.95;
      for (let i = 0; i < 5; i++) {
        buzz(at, 0.3, { hz: 3050, hzTo: 2450, q: 3.4, trem: 30, depth: 0.75, gain: 0.4 * vol, attack: 0.04, release: 0.07 }, bus);
        at += 0.36;
      }
      buzz(at, 0.85, { hz: 2500, hzTo: 1450, q: 3, trem: 22, depth: 0.6, gain: 0.36 * vol, attack: 0.06, release: 0.5 }, bus);
      return at + 0.85 - t;
    },

    // シャシャシャシャ… つよい くりかえし
    kuma(t, bus, vol) {
      let at = t;
      for (let i = 0; i < 14; i++) {
        buzz(at, 0.17, { hz: 4300, q: 1.4, trem: 78, depth: 1, tremWave: 'square', gain: 0.3 * vol, attack: 0.03, release: 0.05 }, bus);
        buzz(at, 0.17, { hz: 2100, q: 1.2, trem: 78, depth: 1, tremWave: 'square', gain: 0.12 * vol, attack: 0.03, release: 0.05 }, bus);
        at += 0.225;
      }
      return at - t;
    },

    // ジー…(まえおき) → ツクツクボーシ ×4 → ウイヨース ×3
    tsukutsuku(t, bus, vol) {
      let at = t;
      buzz(at, 0.9, { hz: 3300, q: 2, trem: 46, depth: 0.7, gain: 0.26 * vol, attack: 0.3, release: 0.2 }, bus);
      at += 0.95;
      for (let i = 0; i < 4; i++) {
        buzz(at, 0.09, { hz: 4100, q: 2.2, trem: 0, gain: 0.36 * vol, attack: 0.02, release: 0.03 }, bus);
        buzz(at + 0.13, 0.09, { hz: 4100, q: 2.2, trem: 0, gain: 0.36 * vol, attack: 0.02, release: 0.03 }, bus);
        buzz(at + 0.28, 0.3, { hz: 2900, hzTo: 3700, q: 2.6, trem: 34, depth: 0.6, gain: 0.36 * vol, attack: 0.04, release: 0.08 }, bus);
        at += 0.62;
      }
      for (let i = 0; i < 3; i++) {
        buzz(at, 0.34, { hz: 3600, hzTo: 2200, q: 2.4, trem: 30, depth: 0.6, gain: 0.34 * vol, attack: 0.05, release: 0.12 }, bus);
        at += 0.4;
      }
      return at - t;
    },

    // カナカナカナ… すずしい かねの ような おと
    higurashi(t, bus, vol) {
      let at = t;
      let gap = 0.115;
      for (let i = 0; i < 24; i++) {
        const hz = i % 2 === 0 ? 1180 : 980;
        tone(at, 0.09, { hz, band: hz * 3.2, q: 5, gain: 0.36 * vol, wave: 'sawtooth' }, bus);
        buzz(at, 0.08, { hz: hz * 3.4, q: 5, trem: 0, gain: 0.16 * vol, attack: 0.01, release: 0.03 }, bus);
        at += gap;
        if (i > 16) gap += 0.012; // おわりは すこし ゆっくり
      }
      return at - t;
    },

    // チーーー ジーーー ほそくて たかい
    niinii(t, bus, vol) {
      const dur = 3.4;
      buzz(t, dur, { hz: 6300, q: 7, trem: 13, depth: 0.35, gain: 0.24 * vol, attack: 0.6, release: 0.8 }, bus);
      buzz(t, dur, { hz: 3150, q: 5, trem: 13, depth: 0.35, gain: 0.16 * vol, attack: 0.7, release: 0.8 }, bus);
      return dur;
    },

    // ギーーーー ひくくて つよい
    ezo(t, bus, vol) {
      const dur = 3.4;
      buzz(t, dur, { hz: 2050, q: 1, trem: 62, depth: 0.9, tremWave: 'square', gain: 0.24 * vol, attack: 0.35, release: 0.5 }, bus);
      buzz(t, dur, { hz: 1020, q: 0.9, trem: 62, depth: 0.9, tremWave: 'square', gain: 0.14 * vol, attack: 0.4, release: 0.5 }, bus);
      return dur;
    },
  };

  let songTimer = null;

  /* なきごえを ならす。opts.loop で くりかえし */
  function playSong(id, opts) {
    const o = opts || {};
    if (!songOn || !ensureCtx()) {
      if (typeof o.onDone === 'function') o.onDone();
      return 0;
    }
    stopSong();
    const fn = SONGS[id];
    if (!fn) return 0;
    const dur = fn(ctx.currentTime + 0.05, songBus, o.volume === undefined ? 1 : o.volume);
    if (typeof o.onDone === 'function') {
      songTimer = setTimeout(() => {
        songTimer = null;
        o.onDone();
      }, (dur + 0.2) * 1000);
    }
    return dur;
  }

  function stopSong() {
    if (songTimer) {
      clearTimeout(songTimer);
      songTimer = null;
    }
    if (!ctx) return;
    // なりおわるのを まつ より、バスを 一瞬 しぼって きる
    const t = ctx.currentTime;
    songBus.gain.cancelScheduledValues(t);
    songBus.gain.setValueAtTime(songBus.gain.value, t);
    songBus.gain.linearRampToValueAtTime(0.0001, t + 0.06);
    songBus.gain.setValueAtTime(0.85, t + 0.09);
  }

  /* --------------------------- もりの おと --------------------------- */
  /* とおくの セミの がっしょう。セミとりの はいけいで ちいさく ながす */

  let ambTimer = null;
  let ambOn = false;

  function ambStep() {
    if (!ambOn || !ctx) return;
    const ids = ['abura', 'minmin', 'niinii', 'higurashi'];
    const id = ids[Math.floor(Math.random() * ids.length)];
    const dur = SONGS[id](ctx.currentTime + 0.05, ambBus, 0.55);
    ambTimer = setTimeout(ambStep, (dur * 0.7 + Math.random() * 0.8) * 1000);
  }

  function startAmbience() {
    if (!seOn || !ensureCtx()) return;
    if (ambOn) return;
    ambOn = true;
    ambBus.gain.setTargetAtTime(0.16, ctx.currentTime, 0.8);
    ambStep();
  }

  function stopAmbience() {
    ambOn = false;
    if (ambTimer) clearTimeout(ambTimer);
    ambTimer = null;
    if (ctx) ambBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
  }

  /* ---------------------------- こうかおん ---------------------------- */

  function blip(hz, t, dur, wave, level) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave || 'square';
    osc.frequency.value = hz;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level || 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(seBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function seCorrect() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    blip(1046, t, 0.12, 'sine', 0.35);
    blip(1568, t + 0.1, 0.24, 'sine', 0.35);
  }

  function seWrong() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    blip(220, t, 0.16, 'square', 0.2);
    blip(165, t + 0.14, 0.26, 'square', 0.2);
  }

  function seTap() {
    if (!seOn || !ensureCtx()) return;
    blip(880, ctx.currentTime, 0.05, 'triangle', 0.16);
  }

  function seDig() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    src.connect(lp);
    lp.connect(g);
    g.connect(seBus);
    src.start(t);
    src.stop(t + 0.24);
  }

  function seFanfare() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1046, 784, 1046, 1318].forEach((hz, i) => {
      blip(hz, t + i * 0.13, 0.2, 'square', 0.28);
      blip(hz / 2, t + i * 0.13, 0.2, 'triangle', 0.14);
    });
  }

  /* ----------------------------- よみあげ ----------------------------- */

  let jaVoice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    jaVoice =
      voices.find((v) => v.lang === 'ja-JP') ||
      voices.find((v) => (v.lang || '').indexOf('ja') === 0) ||
      null;
    return jaVoice;
  }
  if (window.speechSynthesis) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  function speak(text, opts) {
    const o = opts || {};
    const done = typeof o.onDone === 'function' ? o.onDone : null;
    if (!voiceOn || !window.speechSynthesis) {
      if (done) done();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (!jaVoice) pickVoice();
    if (jaVoice) u.voice = jaVoice;
    u.rate = o.rate || 0.88;
    u.pitch = o.pitch || 1.2;
    u.volume = 1;
    if (typeof o.onStart === 'function') u.onstart = o.onStart;
    if (done) {
      u.onend = done;
      u.onerror = done;
    }
    window.speechSynthesis.speak(u);
  }

  function stopSpeak() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  return {
    unlock: ensureCtx,
    playSong,
    stopSong,
    songLength: (id) => ({ abura: 3.4, minmin: 3.6, kuma: 3.2, tsukutsuku: 4.6, higurashi: 3.0, niinii: 3.4, ezo: 3.4 }[id] || 3.4),
    startAmbience,
    stopAmbience,
    setSeEnabled(v) {
      seOn = v;
      if (!v) stopAmbience();
    },
    setSongEnabled(v) {
      songOn = v;
      if (!v) stopSong();
    },
    setVoiceEnabled(v) {
      voiceOn = v;
      if (!v) stopSpeak();
    },
    seCorrect,
    seWrong,
    seTap,
    seDig,
    seFanfare,
    speak,
    stopSpeak,
  };
})();
