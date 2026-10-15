'use strict';

/*
 * おと（音声ファイルは つかわない。ぜんぶ Web Audio API で その場で つくる）
 *
 *  むし 1ぴき = 1つの「こえ（voice）」:
 *    なきごえ → bus → lowpass（とおいほど こもる）→ gain（とおいほど ちいさい）
 *             → StereoPanner（みぎ・ひだり）→ field → master
 *
 *  セミの なきごえ（minmin / tsukutsuku / higurashi）は mushi-zukan/audio.js と おなじ つくりかた。
 *  コオロギの なかまは ここで あたらしく つくった。
 */

const OtoAudio = (function () {
  let ctx = null;
  let master = null;
  let field = null;   // くさむらの むしたち（おてほん中は しぼる）
  let seBus = null;
  let on = true;

  function ensure() {
    if (!on) return false;
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
    } catch (e) {
      ctx = null;
      return false;
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp);
    field = ctx.createGain();
    field.gain.value = 1;
    field.connect(master);
    seBus = ctx.createGain();
    seBus.gain.value = 0.55;
    seBus.connect(master);
    return true;
  }

  let noiseBuf = null;
  function noise() {
    if (noiseBuf) return noiseBuf;
    const len = Math.floor(ctx.sampleRate * 2);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  /* ざらざらした「ジー」系（セミ・キリギリス） */
  function buzz(t, dur, o, bus) {
    const src = ctx.createBufferSource();
    src.buffer = noise();
    src.loop = true;
    const q = o.q === undefined ? 6 : o.q;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(o.hz, t);
    if (o.hzTo) bp.frequency.exponentialRampToValueAtTime(o.hzTo, t + dur);

    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'bandpass';
    bp2.Q.value = q * 0.8;
    bp2.frequency.setValueAtTime(o.hz, t);
    if (o.hzTo) bp2.frequency.exponentialRampToValueAtTime(o.hzTo, t + dur);

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
    g.connect(bus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /* きんぞくっぽい「カナ」系（ヒグラシ） */
  function tone(t, dur, o, bus) {
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
    g.connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  /*
   * すんだ「リー」系（コオロギの なかま）。
   * サイン波に こまかい ふるえ（AM）を かける。はねを こする おと。
   * o = { hz, hzTo, am, depth, gain, attack, release }
   */
  function chirp(t, dur, o, bus) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(o.hz, t);
    if (o.hzTo) osc.frequency.exponentialRampToValueAtTime(o.hzTo, t + dur);

    const osc2 = ctx.createOscillator(); // うすく 倍音
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(o.hz * 2, t);
    if (o.hzTo) osc2.frequency.exponentialRampToValueAtTime(o.hzTo * 2, t + dur);
    const g2 = ctx.createGain();
    g2.gain.value = 0.12;
    osc2.connect(g2);

    const am = ctx.createGain();
    const depth = o.depth === undefined ? 0 : o.depth;
    am.gain.value = 1 - depth / 2;
    let lfo = null;
    if (o.am) {
      lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = o.am;
      const lg = ctx.createGain();
      lg.gain.value = depth / 2;
      lfo.connect(lg);
      lg.connect(am.gain);
    }

    const g = ctx.createGain();
    const peak = o.gain === undefined ? 0.25 : o.gain;
    const atk = o.attack === undefined ? 0.01 : o.attack;
    const rel = o.release === undefined ? 0.03 : o.release;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + Math.min(atk, dur * 0.5));
    g.gain.setValueAtTime(peak, t + Math.max(dur - rel, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(am);
    g2.connect(am);
    am.connect(g);
    g.connect(bus);
    const end = t + dur + 0.03;
    osc.start(t); osc.stop(end);
    osc2.start(t); osc2.stop(end);
    if (lfo) { lfo.start(t); lfo.stop(end); }
  }

  /* ---------------------------- なきごえ ---------------------------- */
  /* (t, bus, vol) を うけとって、なきごえ ぜんたいの ながさ（びょう）を かえす */

  const SONGS = {
    // リーン … リーン …
    suzumushi(t, bus, vol) {
      let at = t;
      for (let i = 0; i < 2; i++) {
        chirp(at, 0.7, { hz: 4500, hzTo: 4350, am: 48, depth: 0.7, gain: 0.32 * vol, attack: 0.06, release: 0.3 }, bus);
        at += 1.0;
      }
      return at - 0.3 - t;
    },

    // コロコロコロ … リーー
    korogi(t, bus, vol) {
      let at = t;
      for (let g = 0; g < 3; g++) {
        for (let p = 0; p < 4; p++) {
          chirp(at, 0.035, { hz: 4000, gain: 0.3 * vol, attack: 0.006, release: 0.02 }, bus);
          at += 0.052;
        }
        at += 0.16;
      }
      chirp(at, 0.6, { hz: 4100, hzTo: 3900, am: 32, depth: 0.55, gain: 0.3 * vol, attack: 0.04, release: 0.25 }, bus);
      return at + 0.6 - t;
    },

    // チン チロ リン
    matsumushi(t, bus, vol) {
      let at = t;
      chirp(at, 0.12, { hz: 4700, hzTo: 4500, gain: 0.34 * vol, attack: 0.004, release: 0.09 }, bus);
      at += 0.24;
      chirp(at, 0.07, { hz: 4300, gain: 0.3 * vol, attack: 0.004, release: 0.05 }, bus);
      at += 0.1;
      chirp(at, 0.07, { hz: 4650, gain: 0.3 * vol, attack: 0.004, release: 0.05 }, bus);
      at += 0.14;
      chirp(at, 0.4, { hz: 4500, hzTo: 4300, am: 40, depth: 0.4, gain: 0.32 * vol, attack: 0.006, release: 0.3 }, bus);
      return at + 0.4 - t;
    },

    // ギーーッ チョン
    kirigirisu(t, bus, vol) {
      let at = t;
      buzz(at, 0.55, { hz: 7200, q: 1.6, trem: 64, depth: 0.95, tremWave: 'square', gain: 0.34 * vol, attack: 0.03, release: 0.08 }, bus);
      buzz(at, 0.55, { hz: 3600, q: 1.4, trem: 64, depth: 0.95, tremWave: 'square', gain: 0.14 * vol, attack: 0.03, release: 0.08 }, bus);
      at += 0.68;
      buzz(at, 0.1, { hz: 6200, q: 2, trem: 0, gain: 0.4 * vol, attack: 0.005, release: 0.06 }, bus);
      buzz(at, 0.1, { hz: 3100, q: 2, trem: 0, gain: 0.18 * vol, attack: 0.005, release: 0.06 }, bus);
      return at + 0.1 - t;
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

    // ジー… → ツクツクボーシ ×4 → ウイヨース ×3
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

    // カナカナカナ…
    higurashi(t, bus, vol) {
      let at = t;
      let gap = 0.115;
      for (let i = 0; i < 24; i++) {
        const hz = i % 2 === 0 ? 1180 : 980;
        tone(at, 0.09, { hz, band: hz * 3.2, q: 5, gain: 0.36 * vol, wave: 'sawtooth' }, bus);
        buzz(at, 0.08, { hz: hz * 3.4, q: 5, trem: 0, gain: 0.16 * vol, attack: 0.01, release: 0.03 }, bus);
        at += gap;
        if (i > 16) gap += 0.012;
      }
      return at - t;
    },
  };

  /* ---------------------------- こえ（むし 1ぴきぶん） ---------------------------- */

  function createVoice(dest) {
    if (!ensure()) return null;
    const bus = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.7;
    lp.frequency.value = 3000;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    bus.connect(lp);
    lp.connect(g);
    let pan = null;
    if (ctx.createStereoPanner) {
      pan = ctx.createStereoPanner();
      g.connect(pan);
      pan.connect(dest || field);
    } else {
      g.connect(dest || field);
    }
    return { bus, lp, g, pan, timer: null, alive: true, id: null };
  }

  /* id の なきごえを、すこし あいだを あけながら ずっと くりかえす */
  function startLoop(v, id, firstDelay) {
    if (!v || !SONGS[id]) return;
    v.id = id;
    const cicada = id === 'minmin' || id === 'tsukutsuku' || id === 'higurashi';
    const loop = () => {
      v.timer = null;
      if (!v.alive || !ctx) return;
      const dur = SONGS[id](ctx.currentTime + 0.05, v.bus, 1);
      const gap = cicada ? 0.9 + Math.random() * 1.1 : 0.5 + Math.random() * 0.8;
      v.timer = setTimeout(loop, (dur + gap) * 1000);
    };
    v.timer = setTimeout(loop, firstDelay === undefined ? 200 : firstDelay);
  }

  /* vol: 0〜1, cutoff: Hz, pan: -1(ひだり)〜1(みぎ) */
  function setSpatial(v, vol, cutoff, pan) {
    if (!v || !ctx) return;
    const t = ctx.currentTime;
    v.g.gain.setTargetAtTime(Math.max(0.0001, vol), t, 0.04);
    v.lp.frequency.setTargetAtTime(cutoff, t, 0.04);
    if (v.pan) v.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, 0.04);
  }

  function stopVoice(v) {
    if (!v) return;
    v.alive = false;
    if (v.timer) clearTimeout(v.timer);
    v.timer = null;
    if (!ctx) return;
    const t = ctx.currentTime;
    v.g.gain.cancelScheduledValues(t);
    v.g.gain.setValueAtTime(v.g.gain.value, t);
    v.g.gain.linearRampToValueAtTime(0.0001, t + 0.12);
    setTimeout(() => {
      try { (v.pan || v.g).disconnect(); } catch (e) { /* もう きれている */ }
    }, 300);
  }

  /* ---------------------------- おてほん（ずかん・レベル2） ---------------------------- */

  let sample = null;
  let sampleTimer = null;

  function playSample(id, onDone) {
    stopSample();
    if (!SONGS[id] || !ensure()) return 0;
    const v = createVoice(master);
    v.lp.frequency.value = 18000;
    v.g.gain.value = 0.9;
    sample = v;
    const t = ctx.currentTime;
    field.gain.setTargetAtTime(0.08, t, 0.05);
    const dur = SONGS[id](t + 0.08, v.bus, 1);
    sampleTimer = setTimeout(() => {
      sampleTimer = null;
      stopSample();
      if (onDone) onDone();
    }, (dur + 0.3) * 1000);
    return dur;
  }

  function stopSample() {
    if (sampleTimer) clearTimeout(sampleTimer);
    sampleTimer = null;
    if (sample) stopVoice(sample);
    sample = null;
    if (ctx) field.gain.setTargetAtTime(1, ctx.currentTime, 0.08);
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

  const SE = {
    tap(t) { blip(660, t, 0.06, 'triangle', 0.2); },
    miss(t) { blip(330, t, 0.12, 'triangle', 0.25); blip(247, t + 0.11, 0.2, 'triangle', 0.22); },
    found(t) { [523, 659, 784, 1046, 784, 1046, 1318].forEach((hz, i) => blip(hz, t + i * 0.11, i === 6 ? 0.5 : 0.13, 'triangle', 0.3)); },
    fail(t) { blip(392, t, 0.2, 'sine', 0.25); blip(330, t + 0.2, 0.2, 'sine', 0.25); blip(262, t + 0.4, 0.4, 'sine', 0.25); },
  };

  function se(name) {
    if (!SE[name] || !ensure()) return;
    SE[name](ctx.currentTime);
  }

  function setOn(v) {
    on = !!v;
    if (!on) stopSample();
    if (ctx) {
      if (on && ctx.state === 'suspended') ctx.resume();
      master.gain.setTargetAtTime(on ? 0.9 : 0.0001, ctx.currentTime, 0.03);
    }
  }

  /* ユーザーの タップの なかで よぶ（ブラウザが おとを ゆるして くれる） */
  function unlock() { return ensure(); }

  return {
    unlock, setOn, isOn: () => on, se,
    createVoice, startLoop, setSpatial, stopVoice,
    playSample, stopSample,
    has: (id) => !!SONGS[id],
  };
})();
