/* あしあと たんてい — おと（WebAudio の 合成音だけ）と よみあげ（speechSynthesis） */
(function (root) {
  "use strict";
  let ac = null, master = null, soundOn = true, voiceOn = true;

  function ctx() {
    if (!soundOn) return null;
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain(); master.gain.value = 0.5;
        const comp = ac.createDynamicsCompressor();
        master.connect(comp); comp.connect(ac.destination);
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    } catch (e) { return null; }
  }

  /* 1つ の おと。freq は [はじめ, おわり] でも よい。formant を わたすと こえ っぽく なる */
  function tone(freq, dur, opt) {
    const a = ctx(); if (!a) return;
    opt = opt || {};
    const t = a.currentTime + (opt.delay || 0);
    const o = a.createOscillator(), gn = a.createGain();
    o.type = opt.type || "sine";
    const fr = Array.isArray(freq) ? freq : [freq];
    o.frequency.setValueAtTime(fr[0], t);
    for (let i = 1; i < fr.length; i++) o.frequency.exponentialRampToValueAtTime(fr[i], t + (dur * i) / (fr.length - 1));
    const v = opt.vol || 0.3;
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(v, t + (opt.attack || 0.01));
    gn.gain.setValueAtTime(v, t + Math.max(opt.attack || 0.01, dur * (opt.hold || 0.3)));
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let last = o;
    if (opt.formant) {
      const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = opt.formant; bp.Q.value = opt.q || 2;
      o.connect(bp); last = bp;
    }
    if (opt.vibrato) {
      const l = a.createOscillator(), lg = a.createGain();
      l.frequency.value = opt.vibrato[0]; lg.gain.value = opt.vibrato[1];
      l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05);
    }
    last.connect(gn); gn.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(dur, freq, opt) {
    const a = ctx(); if (!a) return;
    opt = opt || {};
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = a.createBiquadFilter(), gn = a.createGain(), t = a.currentTime + (opt.delay || 0);
    fl.type = opt.filter || "bandpass"; fl.frequency.value = freq; fl.Q.value = opt.q || 1.5;
    const v = opt.vol || 0.3;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(v, t + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(gn); gn.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }

  const SFX = {
    tap() { tone(660, 0.07, { type: "triangle", vol: 0.15 }); },
    kira() { [1568, 2093, 2637].forEach((f, i) => tone(f, 0.18, { type: "sine", vol: 0.12, delay: i * 0.05 })); },
    found() { tone(988, 0.1, { type: "square", vol: 0.12 }); tone(1319, 0.22, { type: "square", vol: 0.12, delay: 0.09 }); },
    mark() { tone(523, 0.06, { type: "triangle", vol: 0.12 }); },
    wrong() { tone([330, 220], 0.35, { type: "sawtooth", vol: 0.12, formant: 900 }); },
    page() { noise(0.15, 3000, { vol: 0.1, filter: "highpass" }); },
    solve() {
      // ジャジャーン
      [[392, 0], [392, 0.14]].forEach(([f, d]) => [1, 1.25, 1.5].forEach((m) => tone(f * m, 0.12, { type: "sawtooth", vol: 0.07, delay: d, formant: 1800 })));
      [523, 659, 784, 1047].forEach((f) => tone(f, 1.1, { type: "sawtooth", vol: 0.07, delay: 0.32, formant: 2200, hold: 0.6, vibrato: [5, 4] }));
      noise(0.6, 6000, { vol: 0.06, delay: 0.32, filter: "highpass" });
    }
  };

  /* どうぶつ の なきごえ ふう（にせもの だけど、とくちょう が わかる ように） */
  const CALLS = {
    karasu() { [0, 0.42].forEach((d) => { tone([620, 520, 430], 0.32, { type: "sawtooth", vol: 0.32, delay: d, formant: 1300, q: 3 }); noise(0.3, 1200, { vol: 0.12, delay: d, q: 2 }); }); },
    kamo() { [0, 0.22, 0.44].forEach((d) => tone([260, 210], 0.17, { type: "square", vol: 0.22, delay: d, formant: 700, q: 4, vibrato: [60, 30] })); },
    shika() { tone([1600, 2300, 2100, 1300], 1.1, { type: "sine", vol: 0.25, hold: 0.7, vibrato: [7, 30] }); },
    inoshishi() { [0, 0.3].forEach((d) => { noise(0.18, 300, { vol: 0.35, delay: d, q: 3 }); tone([110, 80], 0.18, { type: "sawtooth", vol: 0.15, delay: d, formant: 400 }); }); },
    neko() { tone([500, 820, 700, 420], 0.8, { type: "sawtooth", vol: 0.18, formant: 1500, q: 2.5, hold: 0.6 }); },
    inu() { [0, 0.28].forEach((d) => { tone([520, 300], 0.14, { type: "sawtooth", vol: 0.25, delay: d, formant: 1000, q: 2 }); noise(0.1, 900, { vol: 0.12, delay: d }); }); },
    kitsune() { tone([900, 1400, 700], 0.5, { type: "sawtooth", vol: 0.2, formant: 2000, q: 2, vibrato: [30, 60] }); noise(0.45, 2200, { vol: 0.1, q: 2 }); },
    nezumi() { [0, 0.12, 0.3].forEach((d) => tone([3200, 4200], 0.07, { type: "sine", vol: 0.12, delay: d })); },
    risu() { [0, 0.1, 0.2].forEach((d) => tone([2600, 3400], 0.06, { type: "triangle", vol: 0.12, delay: d })); },
    tanuki() { tone([700, 500], 0.6, { type: "sine", vol: 0.2, vibrato: [6, 20] }); },
    hakubishin() { [0, 0.14].forEach((d) => tone([1800, 1300], 0.1, { type: "sawtooth", vol: 0.12, delay: d, formant: 1800 })); },
    usagi() { noise(0.15, 500, { vol: 0.1 }); tone([200, 150], 0.12, { type: "triangle", vol: 0.1, delay: 0.1 }); }
  };

  /* よみあげ */
  let jaVoice = null;
  function pickVoice() {
    try {
      const vs = speechSynthesis.getVoices();
      jaVoice = vs.find((v) => /ja/i.test(v.lang) && /Kyoko|O-ren|Nanami|Google/.test(v.name)) || vs.find((v) => /ja/i.test(v.lang)) || null;
    } catch (e) { jaVoice = null; }
  }
  try { if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } } catch (e) {}
  function say(text) {
    if (!voiceOn || !text) return;
    try {
      if (!("speechSynthesis" in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/\s+/g, " ").replace(/[〜]/g, "から"));
      u.lang = "ja-JP"; u.rate = 0.95; u.pitch = 1.1;
      if (jaVoice) u.voice = jaVoice;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function hush() { try { speechSynthesis.cancel(); } catch (e) {} }

  root.AT_SND = {
    sfx(name) { try { SFX[name] && SFX[name](); } catch (e) {} },
    call(id) { try { CALLS[id] && CALLS[id](); } catch (e) {} },
    say, hush,
    get sound() { return soundOn; }, set sound(v) { soundOn = !!v; if (!v && ac) try { ac.suspend(); } catch (e) {} },
    get voice() { return voiceOn; }, set voice(v) { voiceOn = !!v; if (!v) hush(); },
    unlock() { ctx(); }
  };
})(window);
