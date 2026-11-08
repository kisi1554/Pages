/* えき の ホームがかり — おと（WebAudio の 合成音 だけ）と アナウンス の よみあげ
 * こうかおん と よみあげ は それぞれ オン/オフ できる。
 * はっしゃ の メロディ は この ゲーム の ための オリジナル の みじかい フレーズ（じっさい の えき の メロディ では ない）。
 */
(function (root) {
  "use strict";
  let ac = null, master = null, noiseBuf = null, sfxOn = true, voiceOn = true;
  const last = {};

  function ctx() {
    try {
      if (!ac) {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain(); master.gain.value = 0.45;
        master.connect(ac.destination);
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  function gate(name, gap) {
    const now = Date.now();
    if (last[name] && now - last[name] < gap) return false;
    last[name] = now; return true;
  }
  function tone(f0, f1, dur, opt) {
    const a = ctx(); if (!a) return;
    opt = opt || {};
    const t = a.currentTime + (opt.delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = opt.type || "sine";
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const v = opt.vol || 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (opt.att || 0.01));
    if (opt.hold) g.gain.setValueAtTime(v, t + dur - 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, opt) {
    const a = ctx(); if (!a) return;
    opt = opt || {};
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime + (opt.delay || 0);
    const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = a.createBiquadFilter(); f.type = opt.ftype || "lowpass";
    f.frequency.setValueAtTime(opt.f0 || 1000, t);
    if (opt.f1) f.frequency.exponentialRampToValueAtTime(opt.f1, t + dur);
    const g = a.createGain(), v = opt.vol || 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (opt.att || 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  // ド=523 … の オリジナル フレーズ（2びょう ちょっと）
  const MELODY = [[784, 0.18], [988, 0.18], [1175, 0.18], [988, 0.18], [1319, 0.36], [1175, 0.18], [988, 0.18], [880, 0.18], [988, 0.5]];

  const S = {
    tap() { if (sfxOn && gate("tap", 40)) tone(660, 880, 0.08, { type: "triangle", vol: 0.12 }); },
    ok() { if (sfxOn && gate("ok", 60)) { tone(784, 0, 0.12, { type: "triangle", vol: 0.16 }); tone(1047, 0, 0.18, { type: "triangle", vol: 0.16, delay: 0.09 }); } },
    point(n) { if (sfxOn) tone([0, 660, 784, 988][n] || 660, 0, 0.16, { type: "square", vol: 0.07 }); },
    bad() { if (sfxOn && gate("bad", 200)) { tone(330, 260, 0.22, { type: "sawtooth", vol: 0.08 }); } },
    matte() { if (sfxOn && gate("matte", 300)) { tone(440, 0, 0.14, { type: "square", vol: 0.1 }); tone(330, 0, 0.24, { type: "square", vol: 0.1, delay: 0.16 }); } },
    chime() { if (sfxOn) { tone(880, 0, 0.6, { vol: 0.18 }); tone(698, 0, 0.9, { vol: 0.18, delay: 0.35 }); } },
    // あいず の ぴーっ（ながおし が おわった とき）
    beep() { if (sfxOn) tone(2000, 0, 0.7, { type: "square", vol: 0.06, hold: true }); },
    hold(k) { if (sfxOn && gate("hold", 90)) tone(500 + k * 900, 0, 0.06, { type: "sine", vol: 0.05 }); },
    melody() {
      if (!sfxOn) return;
      let t = 0;
      MELODY.forEach(([f, d]) => { tone(f, 0, d * 0.95, { type: "triangle", vol: 0.14, delay: t }); tone(f / 2, 0, d * 0.9, { type: "sine", vol: 0.06, delay: t }); t += d; });
    },
    // ドア の ぷしゅー
    door() { if (sfxOn) { noise(0.5, { f0: 3000, f1: 600, vol: 0.18, ftype: "bandpass" }); tone(180, 120, 0.25, { type: "sine", vol: 0.1, delay: 0.35 }); } },
    arrive() { if (sfxOn) { noise(2.4, { f0: 400, f1: 120, vol: 0.12 }); tone(1200, 900, 0.6, { type: "sine", vol: 0.05, delay: 1.6 }); } },
    leave() { if (sfxOn) { tone(392, 0, 0.5, { type: "sawtooth", vol: 0.06 }); tone(330, 0, 0.6, { type: "sawtooth", vol: 0.06, delay: 0.45 }); noise(2.6, { f0: 150, f1: 500, vol: 0.12, att: 0.6 }); } },
    sparkle() { if (sfxOn) [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0, 0.2, { type: "triangle", vol: 0.1, delay: i * 0.07 })); },
    fanfare() { if (sfxOn) [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0, i === 5 ? 0.5 : 0.16, { type: "triangle", vol: 0.15, delay: i * 0.14 })); },
  };

  // アナウンス の よみあげ（ブラウザ の 音声合成。オフ にも できる）
  function say(text) {
    if (!voiceOn) return;
    try {
      const sy = root.speechSynthesis;
      if (!sy || !root.SpeechSynthesisUtterance) return;
      sy.cancel();
      const u = new root.SpeechSynthesisUtterance(text);
      u.lang = "ja-JP"; u.rate = 1.0; u.pitch = 1.05;
      sy.speak(u);
    } catch (e) { /* よみあげ できなくても ゲーム は つづく */ }
  }
  function hush() { try { if (root.speechSynthesis) root.speechSynthesis.cancel(); } catch (e) { /* */ } }

  root.HGSound = Object.assign(S, {
    unlock() { ctx(); },
    setSfx(v) { sfxOn = !!v; }, setVoice(v) { voiceOn = !!v; if (!v) hush(); },
    get sfx() { return sfxOn; }, get voice() { return voiceOn; },
    say, hush,
  });
})(typeof window !== "undefined" ? window : globalThis);
