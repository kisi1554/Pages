/* がったい どうぶつ ラボ — おと（WebAudio の 合成音だけ。オン/オフ できる） */
(function (root) {
  "use strict";
  let ac = null, master = null, on = true, noiseBuf = null;

  function ctx() {
    if (!on) return null;
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain(); master.gain.value = 0.45;
        master.connect(ac.destination);
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    } catch (e) { return null; }
  }

  function tone(f0, f1, dur, opt) {
    const a = ctx(); if (!a) return;
    opt = opt || {};
    const t = a.currentTime + (opt.delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = opt.type || "sine";
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const v = opt.vol || 0.25;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
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
    const s = a.createBufferSource(); s.buffer = noiseBuf;
    const f = a.createBiquadFilter(); f.type = opt.ftype || "bandpass";
    f.frequency.setValueAtTime(opt.f0 || 1000, t);
    if (opt.f1) f.frequency.exponentialRampToValueAtTime(opt.f1, t + dur);
    f.Q.value = opt.q || 1;
    const g = a.createGain(); const v = opt.vol || 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (opt.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  const S = {
    get on() { return on; },
    set on(v) { on = !!v; },
    unlock() { ctx(); },
    /* スロットの からから */
    tick() { tone(1400, 900, 0.04, { type: "square", vol: 0.08 }); },
    stop() { tone(700, 500, 0.08, { type: "triangle", vol: 0.2 }); },
    /* がったいの ぼわん */
    gattai() {
      tone(160, 520, 0.35, { type: "sine", vol: 0.35 });
      tone(240, 780, 0.35, { type: "triangle", vol: 0.12, delay: 0.03 });
      noise(0.4, { f0: 300, f1: 2000, q: 0.8, vol: 0.12 });
    },
    pop() { tone(500, 900, 0.08, { type: "sine", vol: 0.2 }); },
    /* あしおと（うごきかた ごと） */
    step(kind) {
      switch (kind) {
        case "run": tone(180, 90, 0.06, { type: "triangle", vol: 0.22 }); break;
        case "hop": case "jump": tone(220, 660, 0.14, { type: "sine", vol: 0.2 }); break;
        case "walk": tone(120, 70, 0.1, { type: "triangle", vol: 0.25 }); break;
        case "slow": tone(90, 60, 0.18, { type: "sine", vol: 0.25 }); break;
        case "slither": noise(0.2, { f0: 3000, q: 2, vol: 0.12 }); break;
        case "dig": noise(0.12, { f0: 400, q: 1.5, vol: 0.3 }); break;
        case "climb": tone(300, 260, 0.05, { type: "square", vol: 0.08 }); tone(260, 220, 0.05, { type: "square", vol: 0.08, delay: 0.07 }); break;
        default: tone(150, 90, 0.08, { type: "triangle", vol: 0.2 });
      }
    },
    /* みず しぶき */
    splash() { noise(0.25, { f0: 2500, f1: 600, q: 0.7, vol: 0.25 }); },
    /* はばたき */
    flap() { noise(0.12, { f0: 500, f1: 250, q: 0.8, vol: 0.3, attack: 0.03 }); },
    /* ゴールの ファンファーレ */
    fanfare() {
      [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.4]].forEach(([f, d]) => tone(f, f, d === 0.4 ? 0.6 : 0.14, { type: "triangle", vol: 0.25, delay: d }));
      [[392, 0.4], [523, 0.4]].forEach(([f, d]) => tone(f, f, 0.6, { type: "sine", vol: 0.15, delay: d }));
    },
    clear() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.18, { type: "sine", vol: 0.2, delay: 0.9 + i * 0.09 })); },
    oshii() { tone(392, 330, 0.25, { type: "triangle", vol: 0.2, delay: 0.9 }); tone(330, 262, 0.35, { type: "triangle", vol: 0.2, delay: 1.15 }); }
  };

  root.GDSound = S;
})(window);
