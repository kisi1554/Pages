/* めぶんりょう チャレンジ — こうかおん（WebAudio の 合成音だけ） */
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
        master.gain.value = 0.5;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function tone(freq, type, peak, dur, when, glideTo) {
    var c = ac(); if (!c) return;
    try {
      var t = c.currentTime + (when || 0);
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* なにもしない */ }
  }
  var noiseBuf = null;
  function noise(peak, dur, freq, when) {
    var c = ac(); if (!c) return;
    try {
      if (!noiseBuf) {
        noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.4), c.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
      }
      var t = c.currentTime + (when || 0);
      var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = noiseBuf;
      f.type = 'bandpass'; f.frequency.value = freq || 900; f.Q.value = 0.8;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t); s.stop(t + dur + 0.05);
    } catch (e) { /* なにもしない */ }
  }
  var SFX = {
    tap: function () { tone(660, 'triangle', 0.18, 0.07); },
    key: function () { tone(520, 'square', 0.06, 0.05); },
    start: function () { tone(440, 'sine', 0.25, 0.12); tone(660, 'sine', 0.25, 0.15, 0.12); },
    stop: function () { tone(880, 'triangle', 0.3, 0.12); },
    /* こたえあわせ の ドラムロール（だんだん はやく → シンバル） */
    drumroll: function (sec) {
      sec = sec || 1;
      var t = 0, gap = 0.07;
      while (t < sec) { noise(0.35, 0.06, 240, t); t += gap; gap = Math.max(0.035, gap * 0.95); }
      noise(0.5, 0.5, 5000, sec); tone(110, 'sine', 0.5, 0.3, sec);
    },
    /* ぴったり の きらーん */
    kiran: function () {
      [1568, 2093, 2637, 3136].forEach(function (f, i) { tone(f, 'sine', 0.22, 0.5, i * 0.06); });
      tone(4186, 'sine', 0.12, 0.8, 0.26);
    },
    good: function () { tone(784, 'triangle', 0.25, 0.15); tone(1047, 'triangle', 0.25, 0.25, 0.12); },
    soso: function () { tone(523, 'triangle', 0.22, 0.2); tone(659, 'triangle', 0.22, 0.25, 0.15); },
    boo: function () { tone(330, 'triangle', 0.22, 0.25); tone(262, 'triangle', 0.22, 0.35, 0.2); },
    /* とけい の こちこち（こたえあわせ の アニメ だけ。じかん もんだい の さいちゅう は ならさない） */
    tick: function (hi) { noise(0.25, 0.03, hi ? 3200 : 2200); },
    count: function (i) { tone(440 * Math.pow(2, (i % 8) / 12), 'triangle', 0.15, 0.08); },
    balance: function () { tone(200, 'sine', 0.3, 0.4, 0, 140); },
    /* 👑 の ファンファーレ */
    fanfare: function () {
      var n = [[523, 0], [523, 0.15], [523, 0.3], [659, 0.45], [784, 0.75], [659, 1.0], [784, 1.15], [1047, 1.35]];
      n.forEach(function (x) { tone(x[0], 'square', 0.12, 0.28, x[1]); tone(x[0] / 2, 'triangle', 0.15, 0.3, x[1]); });
    }
  };
  root.Sound = {
    play: function (name, arg) { if (on && SFX[name]) SFX[name](arg); },
    setOn: function (v) { on = !!v; if (!on && ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) { /* */ } } },
    isOn: function () { return on; },
    unlock: function () { ac(); }
  };
})(this);
