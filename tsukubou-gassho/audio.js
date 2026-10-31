/* つくぼうの せみ がっしょう ｜ おと（WebAudio の 合成音のみ。音声ファイルは つかわない）
 *  なきごえ 5しゅ・れんさの がっしょう（かさねて ならす）・BGM（あさ／ひる／ゆうがた で 調が かわる）・効果音
 *  さいしょの タップ（unlock）まで 音は ださない。BGM と 効果音は べつべつに オン/オフ。
 */
(function (root) {
  "use strict";

  let ctx = null, master = null, comp = null, seBus = null, bgmBus = null, noiseBuf = null;
  let seOn = true, bgmOn = true, unlocked = false;

  function init() {
    if (ctx) return true;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 6;
    comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.8;
    comp.connect(master); master.connect(ctx.destination);
    seBus = ctx.createGain(); seBus.gain.value = 0.9; seBus.connect(comp);
    bgmBus = ctx.createGain(); bgmBus.gain.value = 0.32; bgmBus.connect(comp);
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function unlock() {
    unlocked = true;
    if (!init()) return;
    if (ctx.state === "suspended") ctx.resume();
    if (bgmWanted) bgmStart(bgmPhase);
  }
  const ready = () => unlocked && ctx && ctx.state !== "closed";
  const now = () => ctx.currentTime;

  /* ---------- ぶひん ---------- */
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  function tone(t, f, dur, o) {
    o = o || {};
    const os = ctx.createOscillator(), g = ctx.createGain();
    os.type = o.type || "sine";
    os.frequency.setValueAtTime(f, t);
    if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    if (o.detune) os.detune.value = o.detune;
    env(g, t, o.a || 0.01, o.gain || 0.2, Math.max(0, dur - (o.a || 0.01) - (o.r || 0.05)), o.r || 0.05);
    os.connect(g); g.connect(o.bus || seBus);
    os.start(t); os.stop(t + dur + 0.05);
    return os;
  }
  function noise(t, dur, o) {
    o = o || {};
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = o.ft || "bandpass";
    bp.frequency.setValueAtTime(o.f || 3000, t);
    if (o.fto) bp.frequency.exponentialRampToValueAtTime(o.fto, t + dur);
    bp.Q.value = o.q || 2;
    const g = ctx.createGain();
    env(g, t, o.a || 0.01, o.gain || 0.2, Math.max(0, dur - (o.a || 0.01) - (o.r || 0.05)), o.r || 0.05);
    src.connect(bp); bp.connect(g); g.connect(o.bus || seBus);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
    return g;
  }
  // ふるえ（トレモロ）を かける: target の gain を lfo で ゆらす
  function tremolo(t, dur, gainNode, rate, depth, type) {
    const l = ctx.createOscillator(), lg = ctx.createGain();
    l.type = type || "sine"; l.frequency.value = rate; lg.gain.value = depth;
    l.connect(lg); lg.connect(gainNode.gain);
    l.start(t); l.stop(t + dur + 0.05);
  }

  /* ---------- なきごえ ---------- */
  // o.short: れんさ用（みじかい）。o.gain: おおきさ。o.pitch: たかさ（ばい）
  const VOICE = {
    // つくぼう: ちょっと たかい サイン波を「つく・つく」の リズムで → 「ぼーし」→ 「じーっ」
    1(t, o) {
      const p = o.pitch, g = o.gain;
      const reps = o.short ? 2 : 4;
      let s = t;
      for (let i = 0; i < reps; i++) {
        tone(s, 2300 * p, 0.09, { to: 2700 * p, gain: 0.16 * g, r: 0.03 });
        tone(s + 0.12, 2500 * p, 0.09, { to: 2900 * p, gain: 0.16 * g, r: 0.03 });
        s += 0.3;
      }
      const os = tone(s, 2600 * p, 0.36, { to: 3000 * p, gain: 0.18 * g, a: 0.03, r: 0.1 });
      tone(s + 0.4, 2900 * p, 0.2, { to: 2500 * p, gain: 0.14 * g, r: 0.08 });
      if (o.finale || !o.short) noise(s + 0.66, 0.5, { f: 3600 * p, q: 6, gain: 0.22 * g, a: 0.03, r: 0.3 });
      return os;
    },
    // みんみん: しゅうはすうを ゆらす「みーん」→「みん みん」
    2(t, o) {
      const p = o.pitch, g = o.gain;
      const mk = (s, dur, f) => {
        const os = ctx.createOscillator(), gg = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
        os.type = "triangle"; os.frequency.setValueAtTime(f * 0.9, s);
        os.frequency.linearRampToValueAtTime(f, s + dur * 0.4);
        l.frequency.value = 7; lg.gain.value = f * 0.05; l.connect(lg); lg.connect(os.frequency);
        env(gg, s, dur * 0.35, 0.2 * g, dur * 0.3, dur * 0.35);
        os.connect(gg); gg.connect(seBus);
        os.start(s); os.stop(s + dur + 0.05); l.start(s); l.stop(s + dur + 0.05);
      };
      mk(t, o.short ? 0.5 : 0.8, 1750 * p);
      mk(t + (o.short ? 0.55 : 0.9), 0.18, 1900 * p);
      mk(t + (o.short ? 0.78 : 1.15), 0.18, 1900 * p);
      if (!o.short) mk(t + 1.4, 0.5, 1700 * p);
    },
    // あぶら: ノイズ＋バンドパスの じりじり
    3(t, o) {
      const dur = o.short ? 0.9 : 1.8;
      const g = noise(t, dur, { f: 4200 * o.pitch, q: 3, gain: 0.3 * o.gain, a: 0.15, r: 0.3 });
      tremolo(t, dur, g, 38, 0.14 * o.gain, "square");
    },
    // くまっち: はやい パルスの しゃんしゃん
    4(t, o) {
      const n = o.short ? 8 : 16;
      for (let i = 0; i < n; i++) {
        const s = t + i * 0.105;
        noise(s, 0.07, { f: 5200 * o.pitch, q: 5, gain: 0.34 * o.gain, a: 0.004, r: 0.05 });
        tone(s, 2900 * o.pitch, 0.05, { type: "square", gain: 0.04 * o.gain, r: 0.03 });
      }
    },
    // かなかな: こまかい トレモロで さがっていく「かなかなかな」
    5(t, o) {
      const dur = o.short ? 1.0 : 2.0;
      const os = ctx.createOscillator(), g = ctx.createGain();
      os.type = "sine";
      os.frequency.setValueAtTime(3900 * o.pitch, t);
      os.frequency.exponentialRampToValueAtTime(3100 * o.pitch, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.13 * o.gain, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      os.connect(g); g.connect(seBus);
      os.start(t); os.stop(t + dur + 0.05);
      tremolo(t, dur, g, 13, 0.11 * o.gain);
    },
  };
  function voice(id, o) {
    if (!ready() || !seOn || !VOICE[id]) return;
    o = Object.assign({ pitch: 1, gain: 1, short: false, delay: 0 }, o || {});
    VOICE[id](now() + o.delay, o);
  }
  // がっしょう: ids を いっしょに（すこし ずらして）ならす
  function chorus(ids, o) {
    if (!ready() || !seOn) return;
    o = o || {};
    const n = ids.length;
    const g = 1 / Math.sqrt(Math.max(1, n));
    ids.forEach((id, i) => {
      voice(id, { short: true, gain: g, delay: i * 0.06, pitch: 1 + (i % 2 ? 0.03 : 0) * Math.floor(i / 2 + 1),
        finale: o.finale && id === 1 && i === n - 1 });
    });
  }

  /* ---------- 効果音 ---------- */
  const SE = {
    move() { tone(now(), 880, 0.04, { type: "square", gain: 0.05, r: 0.02 }); },
    rotate() { const t = now(); tone(t, 660, 0.06, { to: 990, type: "triangle", gain: 0.12 }); },
    land() { const t = now(); tone(t, 180, 0.12, { to: 90, gain: 0.25 }); noise(t, 0.06, { f: 800, q: 1, gain: 0.08 }); },
    garbage() { const t = now(); for (let i = 0; i < 3; i++) noise(t + i * 0.07, 0.06, { f: 600 + i * 200, q: 3, gain: 0.18 }); },
    pop() { tone(now(), 1200, 0.08, { to: 1800, type: "triangle", gain: 0.12 }); },
    gassho() { const t = now(); [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.1, f, 0.4, { type: "triangle", gain: 0.16, r: 0.2 })); },
    rain() { const t = now(); noise(t, 1.4, { f: 1800, fto: 600, ft: "lowpass", q: 0.5, gain: 0.35, a: 0.2, r: 0.6 }); },
    clear() { const t = now(); [784, 988, 1175, 1568].forEach((f, i) => tone(t + i * 0.13, f, 0.3, { type: "triangle", gain: 0.18 })); },
    over() { const t = now(); [523, 440, 349, 262].forEach((f, i) => tone(t + i * 0.2, f, 0.3, { type: "triangle", gain: 0.15 })); },
    ok() { const t = now(); tone(t, 988, 0.12, { type: "triangle", gain: 0.15 }); tone(t + 0.12, 1319, 0.25, { type: "triangle", gain: 0.15 }); },
    ng() { const t = now(); tone(t, 300, 0.25, { type: "square", gain: 0.06, to: 220 }); },
    tap() { tone(now(), 1000, 0.05, { type: "sine", gain: 0.1 }); },
  };
  function se(name) { if (ready() && seOn && SE[name]) SE[name](); }

  /* ---------- BGM（なつっぽい みじかい ループ） ---------- */
  // あさ: ハちょうちょう（あかるい）/ ひる: ニちょうちょう / ゆうがた: イたんちょう（しずか）
  const KEYS = [
    { root: 72, scale: [0, 2, 4, 7, 9, 12, 14], bpm: 108 },
    { root: 74, scale: [0, 2, 4, 7, 9, 12, 14], bpm: 116 },
    { root: 69, scale: [0, 3, 5, 7, 10, 12, 15], bpm: 92 },
  ];
  const MEL = [0, -1, 2, 3, 4, -1, 3, 2, 1, -1, 2, -1, 0, -1, -1, -1,
               3, -1, 4, 5, 4, -1, 3, 2, 3, -1, 1, -1, 0, -1, -1, -1];
  const BASS = [0, -1, -1, -1, 4, -1, -1, -1, 3, -1, -1, -1, 4, -1, -1, -1];
  let bgmWanted = false, bgmPhase = 0, timer = null, step = 0, nextT = 0;
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function sched() {
    if (!ready()) return;
    const k = KEYS[bgmPhase] || KEYS[0];
    const dt = 60 / k.bpm / 2;
    while (nextT < now() + 0.25) {
      const i = step % MEL.length;
      if (MEL[i] >= 0) tone(nextT, midi(k.root + k.scale[MEL[i]]), dt * 1.7, { type: "triangle", gain: 0.2, a: 0.01, r: dt, bus: bgmBus });
      const b = BASS[step % BASS.length];
      if (b >= 0) tone(nextT, midi(k.root - 24 + k.scale[b]), dt * 3, { type: "sine", gain: 0.3, a: 0.01, r: dt * 2, bus: bgmBus });
      if (step % 2 === 1) noise(nextT, 0.03, { f: 7000, q: 1, gain: 0.04, bus: bgmBus });
      step++; nextT += dt;
    }
  }
  function bgmStart(phase) {
    bgmWanted = true;
    if (phase != null) bgmPhase = phase;
    if (!ready() || !bgmOn) return;
    if (timer) return;
    nextT = now() + 0.1; step = 0;
    timer = setInterval(sched, 60);
    sched();
  }
  function bgmStop() {
    bgmWanted = false;
    if (timer) { clearInterval(timer); timer = null; }
  }
  function bgmSetPhase(p) { bgmPhase = p; }

  function setSe(v) { seOn = !!v; }
  function setBgm(v) {
    bgmOn = !!v;
    if (!bgmOn && timer) { clearInterval(timer); timer = null; }
    if (bgmOn && bgmWanted) bgmStart();
  }
  function pause(p) { if (!ctx) return; if (p) ctx.suspend && ctx.suspend(); else if (unlocked) ctx.resume && ctx.resume(); }

  const api = { unlock, voice, chorus, se, bgmStart, bgmStop, bgmSetPhase, setSe, setBgm, pause,
    get seOn() { return seOn; }, get bgmOn() { return bgmOn; }, get unlocked() { return unlocked; } };
  root.TG = root.TG || {};
  root.TG.Audio = api;
})(typeof window !== "undefined" ? window : globalThis);
