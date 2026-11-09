/* ダイヤ を つくろう の おと（WebAudio の ごうせいおん だけ） */
(function (root) {
  "use strict";
  var ctx = null, on = true, noiseBuf = null;

  function ac() {
    if (!on) return null;
    try {
      if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
      if (ctx.state === "suspended") ctx.resume();
    } catch (e) { return null; }
    return ctx;
  }
  function noise(c) {
    if (noiseBuf) return noiseBuf;
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function env(c, t, a, peak, dec) {
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
    g.connect(c.destination);
    return g;
  }
  function tone(c, t, type, f, peak, dec, f2) {
    var o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dec);
    o.connect(env(c, t, 0.006, peak, dec));
    o.start(t); o.stop(t + dec + 0.05);
  }
  function burst(c, t, type, f, q, peak, dec, f2) {
    var s = c.createBufferSource(); s.buffer = noise(c);
    var fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dec);
    s.connect(fl); fl.connect(env(c, t, 0.01, peak, dec));
    s.start(t, Math.random() * 0.5); s.stop(t + dec + 0.05);
  }

  root.DTAudio = {
    setOn: function (v) { on = !!v; },
    isOn: function () { return on; },
    unlock: function () { ac(); },
    // せん を ひく: しゃーっ
    swish: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      burst(c, t, "bandpass", 2200, 1.2, 0.16, 0.22, 5200);
    },
    // えき で とまる: ぽん
    pon: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      tone(c, t, "sine", 880, 0.22, 0.16, 620);
    },
    // ぶつかる: ブブー
    buzz: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      tone(c, t, "square", 150, 0.13, 0.2);
      tone(c, t + 0.24, "square", 140, 0.13, 0.36);
    },
    // はしる: がたん ごとん
    gatan: function (hi) {
      var c = ac(); if (!c) return; var t = c.currentTime;
      burst(c, t, "lowpass", hi ? 900 : 700, 1, 0.22, 0.06);
      tone(c, t, "triangle", hi ? 120 : 95, 0.12, 0.07);
      burst(c, t + 0.11, "lowpass", hi ? 800 : 620, 1, 0.18, 0.06);
      tone(c, t + 0.11, "triangle", hi ? 110 : 88, 0.1, 0.07);
    },
    // せいかい: ぴんぽん
    ok: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      tone(c, t, "sine", 988, 0.2, 0.25); tone(c, t + 0.16, "sine", 784, 0.2, 0.4);
    },
    // ちがう: ぶっ
    ng: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      tone(c, t, "sawtooth", 196, 0.1, 0.22, 160);
    },
    tap: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      tone(c, t, "triangle", 1320, 0.08, 0.05);
    },
    // クリア: えき の チャイム ふう（オリジナル）
    chime: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      [659, 784, 1047, 988, 1175, 1319].forEach(function (f, i) {
        tone(c, t + i * 0.17, "sine", f, 0.18, 0.5);
        tone(c, t + i * 0.17, "triangle", f * 2, 0.04, 0.3);
      });
    }
  };
})(typeof self !== "undefined" ? self : this);
