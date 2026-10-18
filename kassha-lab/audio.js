/* ============================================================
   かっしゃ ラボ — こうかおん（WebAudio の ごうせいおん だけ）
   ひもが きしむ・カラカラ・とうちゃく チーン・ピンポン・ブブー
   ============================================================ */
(function (root) {
  "use strict";
  var ctx = null, master = null, on = true, noise = null;

  function ac() {
    if (!on) return null;
    if (!ctx) {
      var Ctor = root.AudioContext || root.webkitAudioContext;
      if (!Ctor) return null;
      try { ctx = new Ctor(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function noiseBuf(c) {
    if (noise) return noise;
    var n = Math.floor(c.sampleRate * 0.5), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0), s = 777;
    for (var i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
    return (noise = b);
  }

  function tone(type, f0, f1, dur, vol, when) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }

  // カラカラ: みじかい ノイズの つぶ
  function click(pitch) {
    var c = ac(); if (!c) return;
    var t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf(c); f.type = "bandpass"; f.frequency.value = pitch || 2400; f.Q.value = 6;
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.4, 0.05);
  }

  // ひもが きしむ: ギィ（のこぎりなみ ＋ ふるえ）。ちからが つよいほど ひくい
  function creak(force) {
    var c = ac(); if (!c) return;
    var t = c.currentTime, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain();
    var f = c.createBiquadFilter(), g = c.createGain();
    var base = 260 - Math.min(160, (force || 0) * 2);
    o.type = "sawtooth"; o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * 1.25, t + 0.16);
    lfo.frequency.value = 38; lg.gain.value = 30; lfo.connect(lg); lg.connect(o.frequency);
    f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 3;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(t); lfo.start(t); o.stop(t + 0.24); lfo.stop(t + 0.24);
  }

  function chime() {
    tone("sine", 1568, 0, 1.4, 0.32); tone("sine", 2352, 0, 1.0, 0.12); tone("sine", 3136, 0, 0.6, 0.06);
  }
  function ok() { tone("sine", 880, 0, 0.18, 0.28); tone("sine", 1175, 0, 0.35, 0.28, 0.14); }
  function ng() { tone("square", 196, 150, 0.32, 0.14); }
  function pop() { tone("triangle", 620, 920, 0.08, 0.2); }
  function strain() { tone("sawtooth", 110, 90, 0.5, 0.08); tone("sine", 70, 60, 0.5, 0.18); }

  var api = {
    click: click, creak: creak, chime: chime, ok: ok, ng: ng, pop: pop, strain: strain,
    get on() { return on; },
    set on(v) { on = !!v; if (!on && ctx && ctx.state === "running") ctx.suspend(); if (on && ctx) ctx.resume(); },
    unlock: function () { ac(); }
  };
  root.KasshaAudio = api;
})(this);
