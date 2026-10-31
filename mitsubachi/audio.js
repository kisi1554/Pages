/* ミツバチの いちにち ｜ おと（WebAudio で その場で つくる。音声ファイルは つかわない） */
(function () {
  "use strict";
  const MB = (window.MB = window.MB || {});
  let ac = null, master = null, buzzO = null, buzzG = null, buzzLfo = null, bgmTimer = null, bgmStep = 0;
  const last = {};

  function ensure() {
    if (!Snd.on && !Snd.bgm) return null;
    try {
      if (!ac) {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
      }
      if (ac.state === "suspended") ac.resume();
    } catch (e) { return null; }
    return ac;
  }
  function gap(k, ms) { const now = performance.now(); if (last[k] && now - last[k] < ms) return false; last[k] = now; return true; }
  function tone(type, f0, f1, dur, vol, at, dest) {
    const c = ensure(); if (!c) return;
    const t = c.currentTime + (at || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest || master);
    o.start(t); o.stop(t + dur + 0.03);
  }
  const se = (fn) => function () { if (Snd.on) fn.apply(null, arguments); };

  /* ぶーん（とんで いる あいだ ずっと。はやさで おおきさが かわる） */
  function buzz(level) {
    if (!Snd.on) level = 0;
    if (!buzzO && !level) return;
    const c = buzzO ? ac : ensure(); if (!c) return;
    if (!buzzO) {
      buzzO = c.createOscillator(); buzzO.type = "sawtooth"; buzzO.frequency.value = 230;
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
      buzzG = c.createGain(); buzzG.gain.value = 0;
      buzzLfo = c.createOscillator(); buzzLfo.frequency.value = 7;
      const lg = c.createGain(); lg.gain.value = 12; buzzLfo.connect(lg).connect(buzzO.frequency);
      buzzO.connect(f).connect(buzzG).connect(master); buzzO.start(); buzzLfo.start();
    }
    const v = Math.max(0, Math.min(1, level)) * 0.05;
    buzzG.gain.setTargetAtTime(v, c.currentTime, 0.08);
    buzzO.frequency.setTargetAtTime(210 + level * 40, c.currentTime, 0.1);
  }

  /* BGM（のんびりした ペンタトニック。🎵 で オン/オフ） */
  const MEL = [72, 76, 79, 76, 81, 79, 76, 74, 72, 74, 76, 79, 76, 74, 72, -1, 69, 72, 74, 76, 74, 72, 69, 67, 69, 72, 74, 72, 69, 67, 69, -1];
  const BASS = [48, 55, 52, 55, 45, 52, 43, 50];
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function bgmTick() {
    if (!Snd.bgm || !ac) return;
    const i = bgmStep++ % MEL.length;
    if (MEL[i] > 0) tone("triangle", mf(MEL[i]), 0, 0.32, 0.035);
    if (i % 4 === 0) tone("sine", mf(BASS[(i / 4) % BASS.length]), 0, 0.7, 0.05);
  }
  function setBgm(on) {
    Snd.bgm = on;
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    if (on && ensure()) bgmTimer = setInterval(bgmTick, 300);
  }

  const Snd = {
    on: true, bgm: false,
    ensure, buzz, setBgm,
    tap: se(() => tone("sine", 700, 560, 0.06, 0.08)),
    sip: se(() => { if (gap("sip", 380)) { tone("sine", 900, 1500, 0.22, 0.07); tone("sine", 1200, 1800, 0.12, 0.04, 0.1); } }),   // ちゅー
    pollen: se(() => { if (gap("pol", 200)) [1320, 1760].forEach((f, i) => tone("triangle", f, 0, 0.08, 0.06, i * 0.05)); }),
    pon: se(() => { tone("sine", 300, 900, 0.09, 0.22); tone("triangle", 1200, 0, 0.12, 0.08, 0.06); }),                         // ぽん
    full: se(() => [659, 784, 988, 1319].forEach((f, i) => tone("triangle", f, 0, 0.18, 0.1, i * 0.08))),
    waggle: se(() => { if (gap("wag", 70)) tone("square", 180, 140, 0.05, 0.04); }),                                          // ダンスの リズム
    step: se(() => { if (gap("step", 120)) tone("sine", 520, 480, 0.06, 0.05); }),
    ok: se(() => [523, 659, 784, 1047].forEach((f, i) => tone("triangle", f, 0, 0.22, 0.12, i * 0.1))),
    ng: se(() => [392, 330].forEach((f, i) => tone("sine", f, 0, 0.25, 0.09, i * 0.16))),
    clean: se(() => { if (gap("cl", 90)) [1568, 2093, 2637].forEach((f, i) => tone("sine", f, 0, 0.08, 0.05, i * 0.04)); }),
    feed: se(() => tone("sine", 600, 900, 0.14, 0.09)),
    build: se(() => { tone("triangle", 440, 660, 0.1, 0.1); tone("sine", 880, 0, 0.12, 0.05, 0.06); }),
    fan: se(() => { if (gap("fan", 110)) tone("sawtooth", 160, 120, 0.08, 0.025); }),
    cap: se(() => tone("triangle", 784, 1046, 0.12, 0.09)),
    talk: se(() => [880, 990, 880].forEach((f, i) => tone("sine", f, 0, 0.07, 0.06, i * 0.07))),
  };
  MB.Sound = Snd;
})();
