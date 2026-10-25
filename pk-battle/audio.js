// PK たいけつ — おと（WebAudio の ごうせいおん だけ）と じっきょうの こえ（speechSynthesis）
(function (root) {
  "use strict";
  let on = true, voice = true, mute = false;
  let AC = null, noiseBuf = null;
  function ac() {
    if (!on || mute) return null;
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (AC.state === "suspended") AC.resume();
    return AC;
  }
  function env(a, t, vol, attack, decay) {
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(a.destination);
    return g;
  }
  function tone(freq, when, vol, attack, decay, type, freqEnd, lp) {
    const a = ac(); if (!a) return null;
    const t = a.currentTime + (when || 0);
    const o = a.createOscillator();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + attack + decay);
    let node = o;
    if (lp) { const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(env(a, t, vol, attack, decay));
    o.start(t); o.stop(t + attack + decay + 0.05);
    return o;
  }
  function noise(when, vol, attack, decay, ftype, freq, q, freqEnd) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + (when || 0);
    const src = a.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = a.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + attack + decay);
    src.connect(f); f.connect(env(a, t, vol, attack, decay));
    src.start(t, Math.random()); src.stop(t + attack + decay + 0.05);
  }
  const N = { C4: 262, E4: 330, G4: 392, A4: 440, C5: 523, D5: 587, E5: 659, G5: 784, C6: 1047 };
  const sfx = {
    tap() { tone(880, 0, 0.08, 0.004, 0.08); },
    pick() { tone(660, 0, 0.1, 0.004, 0.08, "triangle"); tone(990, 0.06, 0.08, 0.004, 0.1, "triangle"); },
    // ドン（ボールを ける）
    kick(power) {
      const v = 0.4 + Math.min(1, power || 0.7) * 0.5;
      tone(150, 0, v, 0.003, 0.16, "sine", 45);
      noise(0, v * 0.5, 0.002, 0.05, "lowpass", 900, 0.8);
    },
    step() { noise(0, 0.08, 0.004, 0.05, "lowpass", 400, 1); },
    // ばさっ（ネット）
    net() { noise(0, 0.5, 0.01, 0.35, "bandpass", 2400, 0.7, 700); noise(0.05, 0.25, 0.02, 0.4, "highpass", 3500, 0.5); },
    // カーン（ポスト・バー）
    post() {
      [[1250, 0.3], [1873, 0.18], [2716, 0.12], [3990, 0.07]].forEach(([f, v]) => tone(f, 0, v, 0.002, 0.9, "sine"));
      noise(0, 0.3, 0.001, 0.04, "highpass", 3000, 0.7);
    },
    // パシッ（キャッチ）/ バシッ（はじく）
    catch() { noise(0, 0.6, 0.001, 0.08, "highpass", 1800, 0.8); tone(180, 0, 0.35, 0.002, 0.1, "sine", 90); },
    parry() { noise(0, 0.5, 0.001, 0.1, "bandpass", 1200, 0.9); tone(260, 0, 0.3, 0.002, 0.12, "triangle", 140); },
    whoosh() { noise(0, 0.12, 0.05, 0.25, "bandpass", 600, 1.5, 1600); },
    // ホイッスル（ビブラート つき）
    whistle(long) {
      const a = ac(); if (!a) return;
      const t = a.currentTime, L = long ? 0.9 : 0.35;
      const o = a.createOscillator(); o.type = "sine"; o.frequency.value = 2900;
      const lfo = a.createOscillator(); lfo.frequency.value = 28;
      const lg = a.createGain(); lg.gain.value = 140; lfo.connect(lg); lg.connect(o.frequency);
      const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.13, t + 0.02);
      g.gain.setValueAtTime(0.13, t + L - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + L);
      o.connect(g); g.connect(a.destination);
      o.start(t); lfo.start(t); o.stop(t + L + 0.05); lfo.stop(t + L + 0.05);
      noise(0, 0.05, 0.02, L, "bandpass", 2900, 4);
    },
    // かんせい（ノイズを かさねて ふくらませる）
    cheer(len) {
      const L = len || 2.2;
      noise(0.02, 0.22, 0.35, L, "bandpass", 1100, 0.6);
      noise(0.08, 0.14, 0.3, L * 0.9, "bandpass", 2300, 0.8);
      noise(0, 0.12, 0.25, L * 0.8, "bandpass", 500, 0.7);
      for (let i = 0; i < 6; i++) noise(0.1 + i * 0.25, 0.05, 0.05, 0.25, "bandpass", 1500 + Math.random() * 1500, 6); // ピーピー
    },
    // ああー（ざんねん）
    ooh() { noise(0, 0.14, 0.25, 1.0, "bandpass", 700, 1.2, 330); },
    // おおっ（セーブ）
    wow() { noise(0, 0.15, 0.08, 0.7, "bandpass", 500, 1.1, 1300); },
    fanfare() {
      [[N.C5, 0, 0.14], [N.E5, 0.14, 0.14], [N.G5, 0.28, 0.14], [N.C6, 0.42, 0.7], [N.G5, 0.9, 0.14], [N.C6, 1.04, 0.9]].forEach(([f, w, d]) => {
        tone(f, w, 0.12, 0.01, d, "sawtooth", null, 2600);
        tone(f * 0.5, w, 0.09, 0.01, d, "triangle");
      });
    },
    end() { [N.G4, N.E4, N.G4, N.C5].forEach((f, i) => tone(f, 0.17 * i, 0.14, 0.01, 0.22, "triangle")); },
    lose() { [N.E4, N.C4 * 1.0, 262 * 0.9].forEach((f, i) => tone(f, 0.25 * i, 0.12, 0.01, 0.3, "triangle")); },
  };

  // じっきょうの こえ
  const plain = (s) => String(s).replace(/<rt>.*?<\/rt>/g, "").replace(/<[^>]+>/g, "").replace(/[⚽🎉🧤🙌🤫🔄✨🏆…ー]{2,}/gu, "ー").replace(/[⚽🎉🧤🙌🤫🔄✨🏆]/gu, "");
  function speak(text) {
    if (!voice || mute || !("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(plain(text));
      u.lang = "ja-JP"; u.rate = 1.12; u.pitch = 1.15;
      speechSynthesis.speak(u);
    } catch (e) { /* こえが でなくても よい */ }
  }
  root.PKAudio = {
    sfx, speak,
    set(o) { if ("sound" in o) on = !!o.sound; if ("voice" in o) voice = !!o.voice; if ("mute" in o) mute = !!o.mute; if (!voice && "speechSynthesis" in window) try { speechSynthesis.cancel(); } catch (e) { /* むし */ } },
    hasVoice: () => "speechSynthesis" in window,
  };
})(this);
