/* ほしくず ダンジョン — おと（WebAudio の 合成音だけ。こうかおん・BGM それぞれ オン/オフ できる） */
(function (root) {
  "use strict";
  let ac = null, master = null, sfxOn = true, bgmOn = true, noiseBuf = null;
  let bgmTimer = null, bgmGain = null, bgmFloor = 0, nextT = 0, stepI = 0, song = null;

  function ctx() {
    try {
      if (!ac) {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain(); master.gain.value = 0.5;
        master.connect(ac.destination);
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    } catch (e) { return null; }
  }

  function tone(f0, f1, dur, opt) {
    if (!sfxOn) return;
    const a = ctx(); if (!a) return;
    opt = opt || {};
    const t = a.currentTime + (opt.delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = opt.type || "sine";
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const v = opt.vol || 0.22;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (opt.att || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, opt) {
    if (!sfxOn) return;
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
    const g = a.createGain();
    g.gain.setValueAtTime(opt.vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  let stepAlt = 0;
  const S = {
    // こつこつ
    step() { stepAlt ^= 1; noise(0.05, { f0: stepAlt ? 1800 : 1500, q: 6, vol: 0.18 }); tone(stepAlt ? 220 : 196, 150, 0.05, { type: "triangle", vol: 0.08 }); },
    // きらん
    star() { tone(1568, 1568, 0.18, { vol: 0.14 }); tone(2093, 2093, 0.25, { vol: 0.12, delay: 0.06 }); tone(3136, 3136, 0.3, { vol: 0.06, delay: 0.12 }); },
    item() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.16, { type: "triangle", vol: 0.13, delay: i * 0.06 })); },
    // ぽわん
    bikkuri() { tone(660, 220, 0.45, { type: "sine", vol: 0.25 }); tone(990, 330, 0.4, { type: "triangle", vol: 0.08, delay: 0.02 }); },
    faint() { [523, 440, 349, 262].forEach((f, i) => tone(f, f * 0.97, 0.3, { type: "triangle", vol: 0.13, delay: i * 0.18 })); },
    // とんとん
    stairs() { [0, 0.16, 0.32].forEach((d, i) => { noise(0.08, { f0: 400 - i * 80, q: 3, vol: 0.25, delay: d }); tone(180 - i * 30, 120 - i * 20, 0.12, { type: "sine", vol: 0.2, delay: d }); }); },
    friend() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, f, 0.18, { type: "triangle", vol: 0.12, delay: i * 0.08 })); },
    push() { noise(0.25, { f0: 300, f1: 150, q: 2, vol: 0.3 }); },
    slide() { noise(0.35, { f0: 3000, f1: 1200, q: 1.5, vol: 0.12 }); tone(1200, 900, 0.3, { vol: 0.04 }); },
    warp() { tone(200, 1600, 0.5, { type: "sine", vol: 0.14 }); tone(300, 2400, 0.5, { type: "triangle", vol: 0.05, delay: 0.05 }); },
    sw() { noise(0.03, { f0: 3000, q: 4, vol: 0.25 }); tone(880, 880, 0.12, { type: "square", vol: 0.05, delay: 0.05 }); tone(1320, 1320, 0.2, { vol: 0.1, delay: 0.15 }); },
    secret() { noise(0.6, { f0: 200, f1: 80, q: 1, vol: 0.35 }); [659, 831, 988, 1319].forEach((f, i) => tone(f, f, 0.25, { vol: 0.1, delay: 0.4 + i * 0.09 })); },
    trap() { tone(300, 120, 0.25, { type: "square", vol: 0.06 }); tone(150, 300, 0.25, { type: "triangle", vol: 0.12, delay: 0.1 }); },
    wall() { tone(110, 80, 0.08, { type: "sine", vol: 0.15 }); },
    nope() { tone(330, 300, 0.1, { type: "triangle", vol: 0.1 }); tone(262, 240, 0.12, { type: "triangle", vol: 0.1, delay: 0.1 }); },
    jump() { tone(400, 1200, 0.25, { type: "triangle", vol: 0.12 }); },
    spot() { tone(988, 988, 0.08, { type: "square", vol: 0.04 }); tone(1319, 1319, 0.12, { type: "square", vol: 0.04, delay: 0.09 }); },
    magic() { [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone(f, f, 0.2, { vol: 0.08, delay: i * 0.05 })); },
    clear() {
      [523, 659, 784, 1047, 988, 1047, 1319, 1568].forEach((f, i) => tone(f, f, 0.3, { type: "triangle", vol: 0.13, delay: i * 0.13 }));
      for (let i = 0; i < 8; i++) tone(2000 + i * 200, 2000 + i * 200, 0.2, { vol: 0.04, delay: 1.1 + i * 0.07 });
    },
  };

  /* ---------- かい ごと に かわる ふしぎ な BGM ---------- */
  const SCALES = [
    [0, 2, 4, 7, 9, 12, 14],     // ペンタトニック
    [0, 3, 5, 7, 10, 12, 15],    // マイナー ペンタ
    [0, 2, 3, 7, 8, 12, 14],     // ふしぎ
    [0, 2, 4, 6, 7, 11, 12],     // リディアン ふう
    [0, 1, 5, 7, 8, 12, 13],     // みやこぶし ふう
    [0, 2, 5, 7, 9, 12, 14],
    [0, 3, 5, 6, 7, 10, 12],
    [0, 2, 3, 5, 7, 9, 12],      // ドリアン ふう
    [0, 4, 5, 7, 11, 12, 16],
    [0, 2, 4, 7, 9, 12, 16],     // さいご は あかるく
  ];
  function makeSong(n) {
    let s = (n * 2654435761) >>> 0;
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const scale = SCALES[(n - 1) % SCALES.length];
    const root = 196 * Math.pow(2, [0, -2, 3, -5, 1, -3, 2, -4, 0, 5][(n - 1) % 10] / 12);
    const bpm = 84 + ((n * 11) % 30);
    const mel = [];
    let p = 2;
    for (let i = 0; i < 32; i++) {
      if (r() < 0.32) { mel.push(-1); continue; }
      p = Math.max(0, Math.min(scale.length - 1, p + Math.round((r() - 0.5) * 3)));
      mel.push(p);
    }
    const bass = [0, 0, 4, 3].map((x) => Math.min(x, scale.length - 1));
    return { scale, root, spb: 60 / bpm / 2, mel, bass, wave: n % 3 === 0 ? "sine" : "triangle" };
  }
  function note(f, t, dur, vol, type) {
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(bgmGain);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function tick() {
    if (!ac || !song) return;
    while (nextT < ac.currentTime + 0.25) {
      const i = stepI % 32, sc = song.scale, f = (deg) => song.root * Math.pow(2, sc[deg] / 12);
      if (song.mel[i] >= 0) note(f(song.mel[i]) * 2, nextT, song.spb * 1.8, 0.05, song.wave);
      if (i % 8 === 0) note(f(song.bass[(i / 8) | 0]) / 2, nextT, song.spb * 7, 0.06, "sine");
      if (i % 16 === 6) note(f(sc.length - 1) * 4, nextT, song.spb * 3, 0.012, "sine"); // きらきら
      nextT += song.spb; stepI++;
    }
  }
  function bgm(n) {
    bgmFloor = n || bgmFloor;
    stopBgm();
    if (!bgmOn || !bgmFloor) return;
    const a = ctx(); if (!a) return;
    bgmGain = a.createGain(); bgmGain.gain.value = 0.9; bgmGain.connect(master);
    song = makeSong(bgmFloor); stepI = 0; nextT = a.currentTime + 0.1;
    bgmTimer = setInterval(tick, 60);
    tick();
  }
  function stopBgm() {
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    if (bgmGain) { try { const g = bgmGain; g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05); setTimeout(() => g.disconnect(), 400); } catch (e) { /* なにもしない */ } bgmGain = null; }
    song = null;
  }

  root.HDAudio = Object.assign(S, {
    unlock() { ctx(); },
    setSfx(on) { sfxOn = !!on; },
    setBgm(on) { bgmOn = !!on; if (on) bgm(); else stopBgm(); },
    bgm, stopBgm,
    get sfxOn() { return sfxOn; }, get bgmOn() { return bgmOn; },
  });
})(typeof window !== "undefined" ? window : this);
