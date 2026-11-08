/* かもつ いれかえ パズル の おと（WebAudio の ごうせいおん だけ） */
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
    o.connect(env(c, t, 0.005, peak, dec));
    o.start(t); o.stop(t + dec + 0.05);
  }
  function burst(c, t, type, f, q, peak, dec) {
    var s = c.createBufferSource(); s.buffer = noise(c);
    var fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    s.connect(fl); fl.connect(env(c, t, 0.004, peak, dec));
    s.start(t, Math.random() * 0.5); s.stop(t + dec + 0.05);
    return fl;
  }

  var S = {
    setOn: function (v) { on = !!v; },
    isOn: function () { return on; },
    unlock: function () { ac(); },
    // れんけつ: がちゃん
    clank: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      burst(c, t, "bandpass", 1800, 3, 0.5, 0.09);
      tone(c, t, "square", 190, 0.12, 0.08, 120);
      burst(c, t + 0.07, "bandpass", 2600, 5, 0.35, 0.12);
      tone(c, t + 0.07, "triangle", 1240, 0.08, 0.15);
    },
    // かいほう: ぷしゅー
    hiss: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      var fl = burst(c, t, "highpass", 4200, 0.7, 0.28, 0.7);
      fl.frequency.exponentialRampToValueAtTime(1600, t + 0.7);
    },
    // ポイント: かちゃん
    point: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      tone(c, t, "triangle", 900, 0.18, 0.04);
      burst(c, t, "bandpass", 3000, 6, 0.25, 0.04);
      tone(c, t + 0.06, "triangle", 1350, 0.16, 0.06);
      burst(c, t + 0.06, "bandpass", 4200, 6, 0.2, 0.05);
    },
    // はしる ときの ことん
    tick: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      tone(c, t, "sine", 95, 0.12, 0.06, 70);
      burst(c, t, "lowpass", 500, 1, 0.08, 0.05);
    },
    // ぽっぽー（オリジナル の きてき：みじかく 1かい、ながく 1かい）
    whistle: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      [[0, 0.16], [0.24, 0.62]].forEach(function (p) {
        [587, 740, 880].forEach(function (f, i) {
          var o = c.createOscillator(); o.type = i === 0 ? "sawtooth" : "triangle";
          o.frequency.setValueAtTime(f * 0.97, t + p[0]);
          o.frequency.linearRampToValueAtTime(f, t + p[0] + 0.06);
          o.frequency.linearRampToValueAtTime(f * 0.985, t + p[0] + p[1]);
          var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
          var g = c.createGain();
          g.gain.setValueAtTime(0.0001, t + p[0]);
          g.gain.exponentialRampToValueAtTime(i === 0 ? 0.05 : 0.08, t + p[0] + 0.04);
          g.gain.setValueAtTime(i === 0 ? 0.05 : 0.08, t + p[0] + p[1] - 0.05);
          g.gain.exponentialRampToValueAtTime(0.0001, t + p[0] + p[1]);
          o.connect(lp); lp.connect(g); g.connect(c.destination);
          o.start(t + p[0]); o.stop(t + p[0] + p[1] + 0.05);
        });
        burst(c, t + p[0], "bandpass", 1500, 1.5, 0.05, p[1]);
      });
    },
    // クリア の ファンファーレ
    fanfare: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38]].forEach(function (n) { tone(c, t + n[1], "triangle", n[0], 0.22, 0.3); });
      [523, 659, 784, 1047].forEach(function (f) { tone(c, t + 0.55, "triangle", f, 0.12, 0.9); tone(c, t + 0.55, "square", f / 2, 0.03, 0.7); });
    },
    // できない とき
    bump: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      tone(c, t, "square", 220, 0.08, 0.12, 180);
      tone(c, t + 0.13, "square", 180, 0.08, 0.16, 150);
    },
    tap: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      tone(c, t, "sine", 880, 0.1, 0.06);
    }
  };
  root.IPSound = S;
})(this);
