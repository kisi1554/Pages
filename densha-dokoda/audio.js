/* でんしゃ どこだ？ の おと（WebAudio の ごうせいおん だけ・オリジナル）と よみあげ */
(function (root) {
  "use strict";
  var ctx = null, on = true, voiceOn = true, noiseBuf = null, amb = null, jaVoice = null;

  function ac() {
    if (!on) return null;
    try {
      if (!ctx) { var Ctor = window.AudioContext || window.webkitAudioContext; if (!Ctor) return null; ctx = new Ctor(); }
      if (ctx.state === "suspended") ctx.resume();
    } catch (e) { return null; }
    return ctx;
  }
  function noise(c) {
    if (noiseBuf) return noiseBuf;
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    var d = noiseBuf.getChannelData(0), last = 0;
    for (var i = 0; i < d.length; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = last * 3.2; } // ブラウン ノイズ
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
  function tone(c, t, type, f, peak, dec, f2, a) {
    var o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dec);
    o.connect(env(c, t, a || 0.005, peak, dec));
    o.start(t); o.stop(t + (a || 0.005) + dec + 0.05);
  }

  var S = {
    setOn: function (v) { on = !!v; if (!on) S.ambient(null); },
    isOn: function () { return on; },
    setVoice: function (v) { voiceOn = !!v; if (!voiceOn) try { window.speechSynthesis.cancel(); } catch (e) { /* */ } },
    isVoice: function () { return voiceOn; },
    unlock: function () { ac(); },
    // みつけた: ぴろりん
    found: function () { var c = ac(); if (!c) return; var t = c.currentTime; [1047, 1319, 1568, 2093].forEach(function (f, i) { tone(c, t + i * 0.07, "triangle", f, 0.16, 0.25); }); },
    // はずれ: ぽこ
    miss: function () { var c = ac(); if (!c) return; tone(c, c.currentTime, "sine", 320, 0.12, 0.12, 180); },
    // おまけ: ぷぷっ（わらい）
    funny: function () { var c = ac(); if (!c) return; var t = c.currentTime; [0, 0.12, 0.24].forEach(function (d, i) { tone(c, t + d, "square", 520 - i * 60, 0.06, 0.1, 380 - i * 40); }); },
    // きてき（SL）: ぽーっ（2つ の おと を かさねる）
    whistle: function () {
      var c = ac(); if (!c) return; var t = c.currentTime + 0.25;
      [[466, 0.1], [587, 0.08], [698, 0.05]].forEach(function (p) {
        var o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = p[0];
        var f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = p[0] * 2; f.Q.value = 2;
        var g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p[1], t + 0.08); g.gain.setValueAtTime(p[1], t + 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
        o.connect(f); f.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 1.2);
      });
    },
    // ベル（ケーブルカー・ろめん でんしゃ）: ちん ちーん
    bell: function () { var c = ac(); if (!c) return; var t = c.currentTime + 0.25; [0, 0.32].forEach(function (d) { tone(c, t + d, "sine", 1760, 0.14, 0.6); tone(c, t + d, "sine", 2637, 0.05, 0.4); }); },
    // ふね の きてき: ぼーー
    horn: function () { var c = ac(); if (!c) return; var t = c.currentTime + 0.25; tone(c, t, "sawtooth", 110, 0.08, 1.2, 0, 0.1); tone(c, t, "sine", 220, 0.08, 1.2, 0, 0.1); },
    // ふみきり: かん かん かん
    crossing: function (n) { var c = ac(); if (!c) return; var t = c.currentTime; for (var i = 0; i < (n || 8); i++) { tone(c, t + i * 0.42, "square", 760, 0.05, 0.3); tone(c, t + i * 0.42, "sine", 1520, 0.04, 0.25); } },
    // ぜんぶ みつけた: ファンファーレ
    fanfare: function () { var c = ac(); if (!c) return; var t = c.currentTime; [[784, 0], [784, 0.15], [784, 0.3], [1047, 0.45], [988, 0.75], [1047, 0.9], [1319, 1.05]].forEach(function (p) { tone(c, t + p[1], "triangle", p[0], 0.15, 0.3); tone(c, t + p[1], "square", p[0] / 2, 0.03, 0.25); }); },
    // まち の ざわざわ（ずっと ながれる）。o = { f: こもり, g: おおきさ, wave: なみ }
    ambient: function (o) {
      if (amb) { try { amb.g.gain.setTargetAtTime(0.0001, amb.c.currentTime, 0.2); var a0 = amb; setTimeout(function () { try { a0.s.stop(); if (a0.lfo) a0.lfo.stop(); } catch (e) { /* */ } }, 600); } catch (e) { /* */ } amb = null; }
      if (!o) return;
      var c = ac(); if (!c) return;
      var s = c.createBufferSource(); s.buffer = noise(c); s.loop = true;
      var f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.f;
      var g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(o.g, c.currentTime, 0.6);
      s.connect(f); f.connect(g); g.connect(c.destination); s.start();
      var lfo = null;
      if (o.wave) { lfo = c.createOscillator(); lfo.frequency.value = 0.15; var lg = c.createGain(); lg.gain.value = o.g * 0.8; lfo.connect(lg); lg.connect(g.gain); lfo.start(); }
      amb = { c: c, s: s, g: g, lfo: lfo };
    },
    // よみあげ（ja-JP）
    say: function (text) {
      if (!voiceOn || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      try {
        var ss = window.speechSynthesis;
        if (!jaVoice) { var vs = ss.getVoices() || []; jaVoice = vs.filter(function (v) { return /^ja/i.test(v.lang); })[0] || null; }
        ss.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = "ja-JP"; u.rate = 0.95; u.pitch = 1.15;
        if (jaVoice) u.voice = jaVoice;
        ss.speak(u);
      } catch (e) { /* */ }
    }
  };
  root.DDAudio = S;
})(this);
