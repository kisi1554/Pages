"use strict";
/* ============================================================
   せかい いっしゅう りょこう：おと・BGM・よみあげ

   おとは すべて WebAudio の ごうせい音（おとの ファイルは つかわない）。
   BGM は その ちいきの 音階「ふう」の オリジナル。国の id で メロディが きまる。
   ============================================================ */

const Settings = { sound: true, voice: true };

const Sound = (() => {
  let ctx = null, master = null;
  const ac = () => {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      } catch (e) { return null; }
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  function tone(freq, t0, dur, type = "sine", vol = 0.18, slide, dest) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest || master); o.start(t); o.stop(t + dur + 0.05);
  }
  /** ざーっという おと（ジェットの ふんしゃ） */
  function noise(t0, dur, f0, f1, vol) {
    const c = ac(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    src.buffer = buf; bp.type = "bandpass"; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(master); src.start(t);
  }
  const play = (fn) => { if (Settings.sound) fn(); };
  return {
    ac, tone,
    tap: () => play(() => tone(880, 0, 0.07, "triangle", 0.08)),
    ok: () => play(() => { tone(1046, 0, 0.16, "triangle"); tone(1318, 0.13, 0.32, "triangle"); }),
    ng: () => play(() => { tone(196, 0, 0.18, "square", 0.07); tone(165, 0.17, 0.28, "square", 0.07); }),
    find: () => play(() => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.18, "triangle", 0.1))),
    /** りりく：ひくい ところから たかく あがる ジェットの おと */
    takeoff: () => play(() => { noise(0, 2.6, 300, 2400, 0.35); tone(110, 0, 2.4, "sawtooth", 0.05, 330); }),
    /** ちゃくりく：おとが さがって、タイヤの「キュッ」 */
    land: () => play(() => { noise(0, 1.6, 1600, 250, 0.3); tone(1400, 1.2, 0.12, "square", 0.05, 900); tone(1300, 1.38, 0.1, "square", 0.04, 850); }),
    /** スタンプ ぽん */
    stamp: () => play(() => { tone(150, 0, 0.18, "sine", 0.35, 55); tone(1568, 0.09, 0.22, "triangle", 0.1); }),
    /** くうこうの チャイム（ピン ポン パン ポーン） */
    chime: () => play(() => [659, 523, 587, 392].forEach((f, i) => { tone(f, i * 0.42, 1.1, "sine", 0.16); tone(f * 2, i * 0.42, 0.6, "sine", 0.03); })),
    fanfare: () => play(() => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.12, i === 5 ? 0.6 : 0.16, "triangle", 0.14))),
  };
})();

/* ------------------------------ BGM ------------------------------ */
/* 音階（半音の かず）。「〜ふう」の オリジナル。ほんものの 曲は つかわない */
const SCALES = {
  penta:  { n: [0, 2, 4, 7, 9],          w: "triangle", bpm: 96 },   // ひがしアジア・モンゴル ふう
  penta2: { n: [0, 2, 4, 7, 9],          w: "sine",     bpm: 108 },  // とうなんアジア ふう（ガムランのような かね）
  pelog:  { n: [0, 1, 3, 7, 8],          w: "sine",     bpm: 100 },  // ジャワの ペロッグ ふう
  raga:   { n: [0, 1, 4, 5, 7, 8, 11],   w: "sawtooth", bpm: 84, drone: true },  // みなみアジア ふう
  hijaz:  { n: [0, 1, 4, 5, 7, 8, 10],   w: "sawtooth", bpm: 92, drone: true },  // ちゅうとう・ちちゅうかい ふう
  major:  { n: [0, 2, 4, 5, 7, 9, 11],   w: "triangle", bpm: 112 },  // ヨーロッパ ふう
  minor:  { n: [0, 2, 3, 5, 7, 8, 10],   w: "triangle", bpm: 100 },
  dorian: { n: [0, 2, 3, 5, 7, 9, 10],   w: "sine",     bpm: 88 },   // きたヨーロッパ ふう
  tizita: { n: [0, 2, 4, 7, 9],          w: "square",   bpm: 90 },   // エチオピアの 5おん ふう
  afro:   { n: [0, 2, 4, 7, 9],          w: "triangle", bpm: 120, perc: true },
  folk:   { n: [0, 2, 4, 7, 9],          w: "triangle", bpm: 116 },
  latin:  { n: [0, 2, 4, 5, 7, 9, 11],   w: "triangle", bpm: 124, perc: true, clave: true },
  tango:  { n: [0, 2, 3, 5, 7, 8, 11],   w: "sawtooth", bpm: 108 },
  andes:  { n: [0, 3, 5, 7, 10],         w: "sine",     bpm: 100 },
  lydian: { n: [0, 2, 4, 6, 7, 9, 11],   w: "triangle", bpm: 104 },
  aloha:  { n: [0, 2, 4, 7, 9],          w: "triangle", bpm: 84, drone: true },  // ハワイの ゆったりした ギター ふう
};

const BGM = (() => {
  let timer = null, step = 0, notes = [], cfg = null, nextT = 0;
  const rng = (seed) => () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const freq = (semi, base = 293.66) => base * Math.pow(2, semi / 12);
  function compose(id, sc) {
    const r = rng(id * 7919 + 13), len = sc.n.length;
    let deg = 0;
    const mel = [];
    for (let i = 0; i < 32; i++) {
      if (i % 8 === 0) deg = Math.floor(r() * 3);
      else deg += Math.round((r() - 0.5) * 3);
      deg = Math.max(-2, Math.min(len + 3, deg));
      const rest = r() < (i % 2 ? 0.35 : 0.1);
      const oct = Math.floor(deg / len), k = ((deg % len) + len) % len;
      mel.push(rest ? null : sc.n[k] + 12 * oct);
    }
    mel[31] = null; mel[30] = 0;
    return mel;
  }
  function tick() {
    const c = Sound.ac(); if (!c || !cfg) return;
    const spb = 60 / cfg.bpm / 2;
    while (nextT < c.currentTime + 0.3) {
      const i = step % 32, dt = nextT - c.currentTime;
      const m = notes[i];
      if (m != null) Sound.tone(freq(m), Math.max(0, dt), spb * 1.8, cfg.w, cfg.w === "sawtooth" ? 0.025 : 0.05);
      if (i % 8 === 0) Sound.tone(freq(cfg.n[0] - 12 - (i % 16 ? 5 : 0), 146.83), Math.max(0, dt), spb * 7, "sine", 0.05);
      if (cfg.drone && i % 16 === 0) Sound.tone(freq(-12), Math.max(0, dt), spb * 16, "sine", 0.03);
      if (cfg.perc && i % 2 === 0) Sound.tone(i % 4 ? 220 : 110, Math.max(0, dt), 0.08, "sine", 0.06, 60);
      if (cfg.clave && [0, 3, 6, 10, 12].includes(i % 16)) Sound.tone(2200, Math.max(0, dt), 0.04, "square", 0.02);
      nextT += spb; step++;
    }
  }
  return {
    play(id, key) {
      this.stop();
      if (!Settings.sound) return;
      const c = Sound.ac(); if (!c) return;
      cfg = SCALES[key] || SCALES.major; notes = compose(id, cfg); step = 0; nextT = c.currentTime + 0.1;
      timer = setInterval(tick, 100); tick();
    },
    stop() { if (timer) clearInterval(timer); timer = null; cfg = null; },
    get on() { return !!timer; },
  };
})();

/* ------------------------------ よみあげ ------------------------------ */
const Voice = (() => {
  let voices = [];
  const load = () => { try { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { voices = []; } };
  if (typeof window !== "undefined" && window.speechSynthesis) { load(); speechSynthesis.onvoiceschanged = load; }
  /** その 言語の こえ（ja-JP → ja → なし） */
  function find(lang) {
    if (!lang) return null;
    const L = lang.toLowerCase().replace("_", "-"), base = L.split("-")[0];
    return voices.find((v) => (v.lang || "").toLowerCase().replace("_", "-") === L) ||
      voices.find((v) => (v.lang || "").toLowerCase().split(/[-_]/)[0] === base) || null;
  }
  function speak(text, lang, rate = 0.95) {
    if (!Settings.voice || !window.speechSynthesis || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang; u.rate = rate; u.pitch = 1.05;
      const v = find(lang); if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { /* よみあげ できない ブラウザ */ }
  }
  return {
    say(text) { speak(text, "ja-JP"); },
    /** げんちの ことば：その こえが あれば げんちの もじで、なければ カタカナを にほんごで */
    native(ph, lang) {
      if (find(lang)) speak(ph.t.replace(/[¡!]/g, ""), lang, 0.85);
      else speak(ph.k, "ja-JP", 0.9);
    },
    hasVoice: (lang) => !!find(lang),
    stop() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { } },
  };
})();
