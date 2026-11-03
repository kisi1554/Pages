/* むしくい しんぶん — おと（WebAudio の 合成音だけ）と よみあげ（ブラウザの おんせいごうせい） */
(function (root) {
  "use strict";
  let ac = null, master = null, noiseBuf = null;
  const S = { on: true, yomi: true };

  function ctx() {
    if (!S.on) return null;
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  function tone(f0, f1, dur, o) {
    const a = ctx(); if (!a) return;
    o = o || {};
    const t = a.currentTime + (o.delay || 0);
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(dur, o) {
    const a = ctx(); if (!a) return;
    o = o || {};
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime + (o.delay || 0);
    const src = a.createBufferSource(); src.buffer = noiseBuf;
    const f = a.createBiquadFilter(); f.type = o.ftype || "bandpass";
    f.frequency.setValueAtTime(o.f0 || 1500, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    f.Q.value = o.q || 1.5;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + dur + 0.05);
  }

  const SFX = {
    // むしの かじかじ（みじかい ざらっと した おとを 4かい）
    kaji() { for (let i = 0; i < 4; i++) noise(0.06, { delay: i * 0.09, f0: 2600 + (i % 2) * 900, q: 3, vol: 0.22 }); },
    // せいかいの ぽん
    pon() { tone(520, 1040, 0.12, { type: "sine", vol: 0.35 }); tone(1040, 1040, 0.15, { delay: 0.08, type: "triangle", vol: 0.15 }); },
    // むしが にげる ぴゅー
    pyu() { tone(600, 2200, 0.45, { delay: 0.15, type: "sine", vol: 0.18 }); },
    // まちがい の むしゃむしゃ
    musha() { for (let i = 0; i < 6; i++) noise(0.07, { delay: i * 0.11, f0: 700 + (i % 3) * 250, q: 2, vol: 0.3 }); tone(180, 140, 0.25, { type: "square", vol: 0.05 }); },
    // かみを ぱりっと ひろげる
    pari() { noise(0.25, { ftype: "highpass", f0: 1800, f1: 6000, vol: 0.35 }); noise(0.12, { delay: 0.22, f0: 3000, q: 0.8, vol: 0.25 });
      [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.22, { delay: 0.35 + i * 0.1, type: "triangle", vol: 0.16 })); },
    tap() { tone(880, 880, 0.05, { type: "triangle", vol: 0.1 }); },
    hen() { tone(400, 200, 0.3, { type: "sawtooth", vol: 0.06 }); tone(300, 600, 0.3, { delay: 0.25, type: "sine", vol: 0.15 }); },
  };

  // よみあげ（SpeechSynthesis。つかえない ブラウザでは なにも しない）
  let jaVoice = null;
  function pickVoice() {
    try {
      const vs = window.speechSynthesis.getVoices() || [];
      jaVoice = vs.find((v) => v.lang === "ja-JP") || vs.find((v) => (v.lang || "").indexOf("ja") === 0) || null;
    } catch (e) { jaVoice = null; }
  }
  if (typeof window !== "undefined" && window.speechSynthesis) { pickVoice(); window.speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text) {
    if (!S.yomi || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP"; u.rate = 0.9; u.pitch = 1.1;
      if (jaVoice) u.voice = jaVoice;
      window.speechSynthesis.speak(u);
    } catch (e) { /* よめなくても いい */ }
  }
  function hush() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* */ } }

  root.SND = { S, SFX, say, hush, unlock: ctx };
})(this);
