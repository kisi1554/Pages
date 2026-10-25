// ぴょこっと にっぽん リズム — おと（WebAudio の 合成音 と こえ）
//
// - 拍 は AudioContext の 時計（currentTime）で きざむ。少し さき まで 予約 する
//   「先読み スケジューラ」なので、setTimeout の ずれ が 拍 に のらない。
// - 音量 は BGM・こえ・効果音 の 3つ を べつべつ に。まとめて ミュート も できる。
// - こえ は speechSynthesis。開始 まで の おくれ を はかって、拍 より すこし まえ に 予約 する。

const Sound = (() => {
  let ctx = null;
  let master = null, bgmBus = null, seBus = null, noiseBuf = null;
  const vol = { bgm: 0.7, voice: 1, se: 0.8 };
  let muted = false;
  const perf0 = performance.now();

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; return null; }
    master = ctx.createGain();
    master.connect(ctx.destination);
    bgmBus = ctx.createGain();
    bgmBus.connect(master);
    seBus = ctx.createGain();
    seBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolume();
    return ctx;
  }

  function applyVolume() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.02);
    bgmBus.gain.setTargetAtTime(vol.bgm * 0.55, t, 0.02);
    seBus.gain.setTargetAtTime(vol.se * 0.8, t, 0.02);
  }

  // ゲーム の 時計。AudioContext が つかえない 端末 でも うごく ように performance.now に おちる。
  function now() {
    return ctx ? ctx.currentTime : (performance.now() - perf0) / 1000;
  }
  // 予約 した 音 が スピーカー から 出る まで の おくれ
  function latency() {
    if (!ctx) return 0;
    const l = (ctx.outputLatency || 0) || (ctx.baseLatency || 0);
    return Math.min(0.3, Math.max(0, l));
  }

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------------- 楽器 ---------------- */

  function env(g, t, a, peak, dur, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(peak * 0.6, t + a, dur * 0.5);
    g.gain.setTargetAtTime(0.0001, t + dur, rel);
  }

  function osc(type, f, t, stop, dest) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.connect(dest);
    o.start(t);
    o.stop(stop);
    return o;
  }

  function note(inst, midi, t, dur, bus, velo) {
    if (!ctx) return;
    const v = velo == null ? 1 : velo;
    const f = mtof(midi);
    const g = ctx.createGain();
    g.connect(bus);
    const end = t + dur + 0.6;
    switch (inst) {
      case 'flute': {
        env(g, t, 0.04, 0.22 * v, dur, 0.08);
        const o = osc('sine', f, t, end, g);
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        lfo.frequency.value = 5.2;
        lg.gain.value = f * 0.012;
        lfo.connect(lg);
        lg.connect(o.frequency);
        lfo.start(t);
        lfo.stop(end);
        const g2 = ctx.createGain();
        g2.gain.value = 0.25;
        g2.connect(g);
        osc('triangle', f * 2, t, end, g2);
        break;
      }
      case 'chip': {
        env(g, t, 0.005, 0.1 * v, dur * 0.8, 0.03);
        osc('square', f, t, end, g);
        break;
      }
      case 'brass': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(600, t);
        lp.frequency.linearRampToValueAtTime(2400, t + 0.06);
        lp.frequency.setTargetAtTime(1200, t + 0.06, 0.2);
        lp.connect(g);
        env(g, t, 0.03, 0.14 * v, dur, 0.06);
        osc('sawtooth', f, t, end, lp);
        osc('sawtooth', f * 1.004, t, end, lp);
        break;
      }
      case 'koto':
      case 'pluck': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(inst === 'koto' ? 4200 : 3000, t);
        lp.frequency.setTargetAtTime(700, t, 0.12);
        lp.connect(g);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.26 * v, t + 0.004);
        g.gain.setTargetAtTime(0.0001, t + 0.01, inst === 'koto' ? 0.28 : 0.2);
        osc(inst === 'koto' ? 'sawtooth' : 'square', f, t, end, lp);
        osc('triangle', f * 2, t, end, lp);
        break;
      }
      case 'marimba': {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.3 * v, t + 0.004);
        g.gain.setTargetAtTime(0.0001, t + 0.01, 0.16);
        osc('sine', f, t, end, g);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.18, t);
        g2.gain.setTargetAtTime(0.0001, t, 0.03);
        g2.connect(g);
        osc('sine', f * 4, t, end, g2);
        break;
      }
      case 'whistle': {
        env(g, t, 0.03, 0.16 * v, dur, 0.06);
        const o = osc('triangle', f * 2, t, end, g);
        o.frequency.setValueAtTime(f * 2 * 0.97, t);
        o.frequency.linearRampToValueAtTime(f * 2, t + 0.05);
        break;
      }
      case 'bell': {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.22 * v, t + 0.004);
        g.gain.setTargetAtTime(0.0001, t + 0.01, 0.35);
        osc('sine', f, t, end + 0.4, g);
        const g2 = ctx.createGain();
        g2.gain.value = 0.3;
        g2.connect(g);
        osc('sine', f * 2.76, t, end, g2);
        break;
      }
      case 'soft': // ベース
      default: {
        env(g, t, 0.01, 0.32 * v, dur * 0.85, 0.05);
        osc('triangle', f, t, end, g);
        break;
      }
    }
  }

  function noise(t, dur, type, freq, gain, bus) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl);
    fl.connect(g);
    g.connect(bus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  function kick(t) {
    const g = ctx.createGain();
    g.connect(bgmBus);
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    const o = osc('sine', 150, t, t + 0.25, g);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  }

  /* ---------------- 曲 と 拍 の スケジューラ ---------------- */

  function parseSong(def) {
    const toks = def.mel.trim().split(/\s+/);
    const notes = [];
    toks.forEach((tk, i) => {
      if (tk === '-') {
        if (notes.length && notes[notes.length - 1].end === i) notes[notes.length - 1].end = i + 1;
      } else if (tk !== '.') {
        notes.push({ step: i, idx: parseInt(tk, 10), end: i + 1 });
      }
    });
    const byStep = {};
    notes.forEach((n) => { byStep[n.step] = n; });
    return Object.assign({}, def, { byStep, steps: toks.length });
  }

  function degree(song, idx) {
    const sc = song.scale;
    const oct = Math.floor(idx / sc.length);
    return song.root + oct * 12 + sc[((idx % sc.length) + sc.length) % sc.length];
  }

  let song = null, pendingSong = null;
  let bpm = 100, pendingBpm = null;
  let step = 0, nextStepTime = 0, timer = null;
  let stepFn = null;

  const stepDur = () => 60 / bpm / 2;

  function playStep(i, t) {
    if (!ctx || !song) return;
    const sd = stepDur();
    const s = i % song.steps;
    const bar = Math.floor(s / 8);
    const inBar = s % 8;
    // スウィング: うら の 8分 を すこし うしろ へ
    const tt = t + (inBar % 2 === 1 ? song.swing * sd : 0);
    const n = song.byStep[s];
    if (n) note(song.lead, degree(song, n.idx), tt, (n.end - n.step) * sd * 0.92, bgmBus, 1);
    const root = song.root - 24 + song.roots[bar % song.roots.length];
    const bp = (song.groove ? song.groove.bass : song.bass)[inBar];
    if (bp && bp !== '.') {
      const add = bp === '4' ? 7 : bp === '8' ? 12 : 0;
      note(song.bassInst === 'chip' ? 'chip' : 'soft', root + add, tt, sd * 1.6, bgmBus, 0.9);
    }
    const dr = song.groove ? song.groove.drum : song.drum;
    if (dr.k[inBar] === 'x') kick(tt);
    if (dr.s[inBar] === 'x') noise(tt, 0.13, 'bandpass', 1900, 0.32, bgmBus);
    if (dr.h[inBar] === 'x') noise(tt, 0.035, 'highpass', 7500, 0.12, bgmBus);
  }

  function tick() {
    const tNow = now();
    // バックグラウンド から もどった とき など、大きく おくれたら いま に あわせる
    if (nextStepTime < tNow - 0.25) nextStepTime = tNow + 0.05;
    const horizon = tNow + 0.12;
    while (nextStepTime < horizon) {
      if (step % 8 === 0) {
        if (pendingSong) { song = pendingSong; pendingSong = null; }
        if (pendingBpm) { bpm = pendingBpm; pendingBpm = null; }
      }
      playStep(step, nextStepTime);
      if (stepFn) {
        try { stepFn(step, nextStepTime, stepDur()); } catch (e) { console.error(e); }
      }
      nextStepTime += stepDur();
      step++;
    }
    voiceTick(tNow);
  }

  function start(def, tempo, onStep) {
    ensure();
    song = def ? parseSong(def) : null;
    pendingSong = null;
    bpm = tempo;
    pendingBpm = null;
    step = 0;
    stepFn = onStep || null;
    nextStepTime = now() + 0.12;
    if (!timer) timer = setInterval(tick, 20);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    stepFn = null;
    song = null;
    voiceQueue.length = 0;
  }
  // 次の 小節 の あたま で 曲 や テンポ を かえる（とちゅう で きれない）
  function changeSong(def) { pendingSong = parseSong(def); }
  function changeTempo(t) { pendingBpm = t; }

  /* ---------------- 効果音（拍 の 時刻 に 予約 できる） ---------------- */

  function se(name, at) {
    if (!ensure()) return;
    const t = Math.max(at || 0, ctx.currentTime + 0.005);
    switch (name) {
      case 'pop': { // ぴょこっ
        const g = ctx.createGain();
        g.connect(seBus);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.35, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        const o = osc('sine', 420, t, t + 0.2, g);
        o.frequency.exponentialRampToValueAtTime(1200, t + 0.09);
        break;
      }
      case 'tap':
        note('marimba', 84, t, 0.08, seBus, 0.7);
        break;
      case 'perfect':
        [76, 81, 88].forEach((m, i) => note('bell', m, t + i * 0.06, 0.2, seBus, 0.9));
        break;
      case 'good':
        [76, 83].forEach((m, i) => note('bell', m, t + i * 0.07, 0.2, seBus, 0.8));
        break;
      case 'ok':
        note('bell', 79, t, 0.2, seBus, 0.7);
        break;
      case 'miss': { // やさしい「ぽよん」
        const g = ctx.createGain();
        g.connect(seBus);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.22, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        const o = osc('triangle', 330, t, t + 0.4, g);
        o.frequency.linearRampToValueAtTime(220, t + 0.3);
        break;
      }
      case 'count':
        note('chip', 84, t, 0.06, seBus, 0.6);
        break;
      case 'go':
        note('chip', 96, t, 0.12, seBus, 0.7);
        break;
      case 'fanfare':
        [72, 76, 79, 84, 79, 84].forEach((m, i) =>
          note('brass', m, t + i * 0.12, i === 5 ? 0.6 : 0.1, seBus, 0.9));
        break;
      case 'click':
        note('marimba', 79, t, 0.05, seBus, 0.5);
        break;
      default:
        break;
    }
  }

  /* ---------------- こえ（speechSynthesis） ---------------- */

  const synth = window.speechSynthesis || null;
  let jaVoice = null;
  let voicesChecked = false;
  function pickVoice() {
    if (!synth) return null;
    const vs = synth.getVoices() || [];
    if (vs.length) voicesChecked = true;
    jaVoice = vs.find((v) => v.lang === 'ja-JP') || vs.find((v) => /^ja/i.test(v.lang || '')) || null;
    return jaVoice;
  }
  if (synth) {
    pickVoice();
    try { synth.addEventListener('voiceschanged', pickVoice); } catch (e) { synth.onvoiceschanged = pickVoice; }
    setTimeout(() => { pickVoice(); voicesChecked = true; }, 1500);
  }
  // 日本語の 声 が つかえるか（まだ わからない あいだ は つかえる と みなす）
  function hasVoice() {
    if (!synth) return false;
    if (!voicesChecked) return true;
    return !!jaVoice;
  }

  let voiceLead = 0.18;            // 拍 の どれだけ まえ に speak() を よぶか（はかって なおす）
  const voiceQueue = [];

  function speakNow(text, opts) {
    const o = opts || {};
    if (!synth || muted || vol.voice <= 0.001 || !hasVoice()) return false;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      if (!jaVoice) pickVoice();
      if (jaVoice) u.voice = jaVoice;
      u.rate = o.rate || 1.1;
      u.pitch = o.pitch || 1.35;
      u.volume = Math.max(0, Math.min(1, vol.voice));
      const called = now();
      u.onstart = () => {
        const d = now() - called;
        if (d > 0 && d < 1.2) voiceLead = Math.max(0.04, Math.min(0.6, voiceLead * 0.7 + d * 0.3));
      };
      synth.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 拍 の 時刻 t に こえ が 出る よう に 予約 する
  function sayAt(text, t, opts) {
    voiceQueue.push({ text, t, opts });
  }
  function voiceTick(tNow) {
    for (let i = voiceQueue.length - 1; i >= 0; i--) {
      const q = voiceQueue[i];
      if (q.t - voiceLead <= tNow) {
        voiceQueue.splice(i, 1);
        if (tNow - q.t < 0.5) speakNow(q.text, q.opts);
      }
    }
  }
  // iOS は さいしょ の 発話 を タップ の なか で しないと 声 が でない
  function unlockVoice() {
    if (!synth) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      synth.speak(u);
    } catch (e) { /* なにもしない */ }
  }

  return {
    unlock() { ensure(); unlockVoice(); },
    now,
    latency,
    start,
    stop,
    changeSong,
    changeTempo,
    isRunning: () => !!timer,
    bpm: () => bpm,
    se,
    say: speakNow,
    sayAt,
    hasVoice,
    setVolume(kind, v) { vol[kind] = Math.max(0, Math.min(1, v)); applyVolume(); },
    getVolume: (kind) => vol[kind],
    setMuted(m) { muted = !!m; applyVolume(); if (muted && synth) synth.cancel(); },
    isMuted: () => muted,
    hasAudio: () => !!(window.AudioContext || window.webkitAudioContext),
  };
})();
