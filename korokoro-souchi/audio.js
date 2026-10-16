/* ============================================================
   ころころ そうち — こうかおん（WebAudio の ごうせいおん だけ）
   ころころ（はやさで おおきさが かわる）・カタン・ボヨン・チーン
   ============================================================ */
(function (root) {
  "use strict";
  var ctx = null, master = null, on = true;
  var roll = null, last = {};

  function ac() {
    if (!on) return null;
    if (!ctx) {
      var C = root.AudioContext || root.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function noiseBuffer(c, sec) {
    var n = Math.floor(c.sampleRate * sec), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    var s = 12345;   // きまった たねの ノイズ
    for (var i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
    return b;
  }

  function tone(type, f0, f1, dur, vol, when) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }

  function burst(freq, q, dur, vol) {
    var c = ac(); if (!c) return;
    var t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuffer(c, dur + 0.05);
    f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }

  function throttle(key, ms) {
    var now = Date.now();
    if (last[key] && now - last[key] < ms) return false;
    last[key] = now; return true;
  }

  var S = {
    get on() { return on; },
    set: function (v) { on = !!v; if (!on) S.roll(0); if (on) ac(); },
    unlock: function () { ac(); },
    // カタン（material: steel / rubber / wood）
    katan: function (material, v) {
      if (!on || !throttle("k" + material, 45)) return;
      v = Math.max(0.05, Math.min(1, v));
      if (material === "steel") { tone("triangle", 1250, 700, 0.12, 0.22 * v); burst(2600, 3, 0.06, 0.25 * v); }
      else if (material === "rubber") { tone("sine", 260, 120, 0.12, 0.3 * v); }
      else { tone("square", 820, 500, 0.05, 0.08 * v); burst(1500, 4, 0.05, 0.3 * v); }
    },
    boyon: function () {
      var c = ac(); if (!c || !throttle("boyon", 120)) return;
      var t = c.currentTime, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(520, t + 0.12); o.frequency.exponentialRampToValueAtTime(240, t + 0.4);
      lfo.frequency.value = 18; lg.gain.value = 30; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(g); g.connect(master); o.start(t); lfo.start(t); o.stop(t + 0.5); lfo.stop(t + 0.5);
    },
    chiin: function () {
      var c = ac(); if (!c) return;
      [[1318, 0.3, 2.4], [1318 * 2.76, 0.12, 1.4], [1318 * 5.4, 0.06, 0.8], [1318 * 0.5, 0.08, 1.8]].forEach(function (p) {
        var t = c.currentTime, o = c.createOscillator(), g = c.createGain();
        o.type = "sine"; o.frequency.value = p[0];
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p[1], t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + p[2] + 0.05);
      });
    },
    fanfare: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone("triangle", f, 0, 0.25, 0.18, 0.5 + i * 0.12); });
    },
    pop: function () { tone("sine", 500, 900, 0.09, 0.2); },
    click: function () { tone("triangle", 900, 0, 0.05, 0.12); },
    trash: function () { tone("sawtooth", 400, 90, 0.2, 0.1); },
    ng: function () { tone("square", 220, 160, 0.15, 0.08); },
    // ころころ（level 0〜1）
    roll: function (level) {
      if (!ctx) { if (!level) return; if (!ac()) return; }
      if (!roll) {
        if (!level || !on) return;
        var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = noiseBuffer(ctx, 2); s.loop = true;
        f.type = "lowpass"; f.frequency.value = 420; f2.type = "peaking"; f2.frequency.value = 160; f2.gain.value = 12;
        g.gain.value = 0;
        s.connect(f); f.connect(f2); f2.connect(g); g.connect(master); s.start();
        roll = { s: s, g: g, f: f };
      }
      var lv = on ? Math.max(0, Math.min(1, level)) : 0, t = ctx.currentTime;
      roll.g.gain.setTargetAtTime(lv * 0.5, t, 0.06);
      roll.f.frequency.setTargetAtTime(260 + lv * 600, t, 0.08);
    }
  };
  root.KoroSound = S;
})(typeof window !== "undefined" ? window : globalThis);
