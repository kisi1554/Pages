/* しずくの だいぼうけん — おと（WebAudio の 合成音だけ）と よみあげ（speechSynthesis） */
const Snd = (function () {
  let ac = null, master = null, on = true;
  const loops = {};   // name -> { stop() }

  function ctx() {
    if (!on) return null;
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

  function tone(freq, dur, opt) {
    const a = ctx(); if (!a) return;
    opt = opt || {};
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (opt.delay || 0);
    o.type = opt.type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
    const v = opt.vol || 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  let noiseBuf = null;
  function noise() {
    const a = ctx(); if (!a) return null;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    return s;
  }

  function burst(dur, filt, freq, vol, delay) {
    const a = ctx(); if (!a) return;
    const s = noise(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + (delay || 0);
    f.type = filt; f.frequency.value = freq; f.Q.value = 1.5;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  /* つづく おと（雨・川・ぐつぐつ）。level 0..1 */
  function loop(name, level, make) {
    if (!on || level <= 0) { stop(name); return; }
    const a = ctx(); if (!a) return;
    if (!loops[name]) loops[name] = make(a);
    const L = loops[name];
    L.g.gain.setTargetAtTime(L.base * level, a.currentTime, 0.15);
  }
  function stop(name) {
    const L = loops[name]; if (!L) return;
    try { L.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.1); setTimeout(function () { try { L.src.stop(); } catch (e) {} if (L.timer) clearInterval(L.timer); }, 400); } catch (e) {}
    delete loops[name];
  }
  function noiseLoop(a, filt, freq, base, lfo) {
    const s = noise(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = filt; f.frequency.value = freq; g.gain.value = 0.0001;
    s.connect(f); f.connect(g); g.connect(master); s.start();
    const L = { src: s, g: g, base: base };
    if (lfo) {
      const o = a.createOscillator(), og = a.createGain();
      o.frequency.value = lfo[0]; og.gain.value = lfo[1];
      o.connect(og); og.connect(f.frequency); o.start();
    }
    return L;
  }

  return {
    get on() { return on; },
    set on(v) { on = !!v; if (!on) Object.keys(loops).forEach(stop); },
    unlock: function () { ctx(); },
    pochan: function () { tone(900, 0.18, { to: 260, type: "sine", vol: 0.4 }); tone(520, 0.12, { delay: 0.08, to: 900, vol: 0.2 }); },
    pop: function () { tone(660, 0.08, { to: 990, vol: 0.25 }); },
    tap: function () { tone(520, 0.06, { type: "triangle", vol: 0.2 }); },
    whoosh: function () { burst(0.6, "bandpass", 900, 0.25); },
    paki: function () { burst(0.05, "highpass", 3000, 0.6); burst(0.04, "highpass", 4200, 0.5, 0.06); tone(2400, 0.05, { type: "square", vol: 0.08 }); },
    ok: function () { tone(660, 0.12, { vol: 0.25 }); tone(880, 0.18, { delay: 0.1, vol: 0.25 }); },
    ng: function () { tone(300, 0.25, { type: "triangle", to: 220, vol: 0.2 }); },
    fanfare: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.25, { delay: i * 0.12, type: "triangle", vol: 0.25 }); }); },
    kira: function () { [1320, 1760, 2093].forEach(function (f, i) { tone(f, 0.15, { delay: i * 0.07, vol: 0.12 }); }); },
    rain: function (lv) { loop("rain", lv, function (a) { return noiseLoop(a, "highpass", 1800, 0.35); }); },
    river: function (lv) { loop("river", lv, function (a) { return noiseLoop(a, "bandpass", 1200, 0.3, [0.7, 500]); }); },
    gutsu: function (lv) {
      loop("gutsu", lv, function (a) {
        const L = noiseLoop(a, "lowpass", 300, 0.15);
        L.timer = setInterval(function () { if (on && Math.random() < 0.8) tone(140 + Math.random() * 120, 0.09, { to: 320, vol: 0.18 * (L.lv || 1) }); }, 140);
        return L;
      });
    },
    stopAll: function () { Object.keys(loops).forEach(stop); }
  };
})();

/* よみあげ。{漢字|よみ} は よみ の ほうを よむ。 */
const Say = (function () {
  let on = true;
  function plain(s) {
    return String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "$2").replace(/<[^>]+>/g, "").replace(/[🌊☀️💧☁️❄️🌧️🏔️🏞️🏙️⬆️▶️👉✨]/gu, "");
  }
  return {
    get on() { return on; },
    set on(v) { on = !!v; if (!on) this.cancel(); },
    plain: plain,
    speak: function (text) {
      if (!on || !("speechSynthesis" in window)) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(plain(text));
        u.lang = "ja-JP"; u.rate = 0.95; u.pitch = 1.15;
        speechSynthesis.speak(u);
      } catch (e) {}
    },
    cancel: function () { try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) {} }
  };
})();
