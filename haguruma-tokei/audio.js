/* はぐるま とけいだい — こうかおん（WebAudio の 合成音だけ） */
(function (root) {
  'use strict';
  var ctx = null, master = null, on = true;
  function ac() {
    if (!on) return null;
    try {
      if (!ctx) {
        var C = root.AudioContext || root.webkitAudioContext;
        if (!C) return null;
        ctx = new C();
        master = ctx.createGain();
        master.gain.value = 0.55;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(freq, type, peak, dur, when, glideTo) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (when || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    env(g, t, 0.004, peak, dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  var noiseBuf = null;
  function noise(peak, dur, freq, q, when) {
    var c = ac(); if (!c) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
    }
    var t = c.currentTime + (when || 0);
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf;
    f.type = 'bandpass'; f.frequency.value = freq || 3000; f.Q.value = q || 2;
    env(g, t, 0.002, peak, dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  var S = {
    get on() { return on; },
    set on(v) { on = !!v; if (!on && ctx) { try { ctx.suspend(); } catch (e) { /* なにも しない */ } } },
    unlock: function () { ac(); },
    // かちっ（ピンに さす）
    click: function () { noise(0.5, 0.03, 4200, 3); tone(1800, 'square', 0.08, 0.04); tone(900, 'triangle', 0.15, 0.06, 0.02); },
    // はずす
    pop: function () { tone(500, 'sine', 0.2, 0.12, 0, 900); },
    // こちこち（hi で たかさを かえる）
    tick: function (hi) { noise(0.25, 0.025, hi ? 5200 : 3400, 6); tone(hi ? 2100 : 1500, 'sine', 0.06, 0.03); },
    // ラチェット（ぎゃくに まわした とき）
    ratchet: function () { noise(0.18, 0.02, 2500, 8); },
    // ぎしぎし（ロック）
    grind: function () {
      var c = ac(); if (!c) return;
      [0, 0.18].forEach(function (w) {
        var t = c.currentTime + w;
        var o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(140, t);
        o.frequency.linearRampToValueAtTime(190, t + 0.14);
        f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.5;
        env(g, t, 0.01, 0.22, 0.14);
        o.connect(f); f.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.2);
        noise(0.12, 0.12, 1800, 1, w);
      });
    },
    // ぶつかる
    bump: function () { tone(220, 'square', 0.12, 0.08); tone(160, 'square', 0.1, 0.1, 0.06); },
    wrong: function () { tone(330, 'triangle', 0.2, 0.15); tone(262, 'triangle', 0.2, 0.25, 0.14); },
    ok: function () { [784, 988, 1175].forEach(function (f, i) { tone(f, 'triangle', 0.18, 0.18, i * 0.07); }); },
    clear: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 'triangle', 0.22, 0.25, i * 0.11); });
      tone(1568, 'sine', 0.1, 0.5, 0.44);
    },
    // かねの ごーん（倍音を かさねる）
    bell: function (when) {
      var c = ac(); if (!c) return;
      var base = 110;
      var parts = [[0.5, 0.5, 4.5], [1, 0.35, 3.5], [1.19, 0.18, 2.6], [1.5, 0.12, 2.2], [2, 0.16, 2.0], [2.51, 0.08, 1.4], [2.66, 0.06, 1.2], [3.01, 0.05, 1.0], [4.1, 0.03, 0.7]];
      parts.forEach(function (p) {
        var t = c.currentTime + (when || 0);
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(base * p[0], t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(p[1], t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + p[2] + 0.1);
      });
      noise(0.3, 0.05, 1200, 1, when);
    },
  };
  root.Sound = S;
})(this);
