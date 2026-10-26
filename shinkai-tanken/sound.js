// しんかい たんけん: おと（WebAudio の 合成音 だけ）
(function (root) {
  "use strict";
  var ctx = null, master = null, on = true;
  var amb = null; // かんきょうおん

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = on ? 1 : 0; master.connect(ctx.destination);
    startAmbient();
  }
  function setOn(v) {
    on = !!v;
    if (master) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05);
  }

  function noiseBuffer(sec, brown) {
    var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) {
      var w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }
  function tone(type, f0, f1, dur, vol, delay) {
    if (!ctx || !on) return;
    var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noiseHit(dur, vol, freq, q, delay) {
    if (!ctx || !on) return;
    var t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuffer(dur + 0.05, false); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }

  // かんきょうおん: ふかく なる ほど ひくく しずか に
  function startAmbient() {
    var src = ctx.createBufferSource(); src.buffer = noiseBuffer(4, true); src.loop = true;
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 800;
    var g = ctx.createGain(); g.gain.value = 0.0;
    src.connect(lp); lp.connect(g); g.connect(master); src.start();
    var o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 110;
    var og = ctx.createGain(); og.gain.value = 0;
    o.connect(og); og.connect(master); o.start();
    amb = { lp: lp, g: g, o: o, og: og };
  }
  function ambient(depth, active) {
    if (!amb) return;
    var t = ctx.currentTime, k = Math.min(1, depth / 3000);
    var vol = active ? (depth < 3 ? 0.16 : 0.12 - 0.08 * k) : 0;
    amb.g.gain.setTargetAtTime(vol, t, 0.5);
    amb.lp.frequency.setTargetAtTime(depth < 3 ? 1400 : 700 - 560 * Math.sqrt(k), t, 0.5);
    amb.o.frequency.setTargetAtTime(90 - 50 * Math.sqrt(Math.min(1, depth / 11000)), t, 0.5);
    amb.og.gain.setTargetAtTime(active && depth > 50 ? 0.025 : 0, t, 0.8);
  }

  var S = {
    init: init, setOn: setOn, ambient: ambient,
    isOn: function () { return on; },
    // ソナー の ピコーン（と こだま）
    ping: function () {
      tone("sine", 1500, 1480, 0.5, 0.25);
      tone("sine", 1500, 1480, 0.4, 0.07, 0.45);
      tone("sine", 1500, 1480, 0.3, 0.025, 0.9);
    },
    // あわ ぽこぽこ
    bubble: function () {
      var f = 300 + Math.random() * 500;
      tone("sine", f, f * 2.4, 0.08 + Math.random() * 0.06, 0.08);
    },
    // しゃしん の カシャ
    shutter: function () {
      noiseHit(0.05, 0.5, 3000, 1.5);
      noiseHit(0.07, 0.4, 1800, 1.2, 0.07);
      tone("square", 2200, 2000, 0.03, 0.04);
    },
    // あたらしい いきもの
    found: function () {
      [660, 880, 1320].forEach(function (f, i) { tone("triangle", f, f, 0.25, 0.16, i * 0.1); });
    },
    // ミッション たっせい
    fanfare: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone("triangle", f, f, 0.3, 0.17, i * 0.12); });
      tone("triangle", 1047, 1047, 0.6, 0.12, 0.5);
    },
    // おしらせ（やさしい ポン）
    chime: function () { tone("sine", 880, 880, 0.3, 0.12); tone("sine", 660, 660, 0.4, 0.1, 0.18); },
    tap: function () { tone("sine", 600, 900, 0.06, 0.08); },
    splash: function () { noiseHit(0.5, 0.35, 600, 0.7); }
  };
  root.SHINKAI_S = S;
})(this);
