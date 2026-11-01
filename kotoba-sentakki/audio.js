/* ことばの せんたくき の おと（WebAudio の 合成音 だけ）と よみあげ */
var Sound = (function () {
  'use strict';
  var ctx = null, master = null, noiseBuf = null;
  var on = true, voice = true;
  var rumbleNode = null;

  function ac() {
    if (!on) return null;
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  function tone(freq, t0, dur, type, vol, freq2) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (freq2) o.frequency.exponentialRampToValueAtTime(freq2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(t0, dur, filterType, f, vol, f2) {
    var c = ac(); if (!c) return null;
    var s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    var bq = c.createBiquadFilter(); bq.type = filterType; bq.frequency.setValueAtTime(f, t0);
    if (f2) bq.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    var g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(bq); bq.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + 0.05);
    return s;
  }

  return {
    get on() { return on; }, set on(v) { on = !!v; if (!on) this.rumbleStop(); },
    get voice() { return voice; }, set voice(v) { voice = !!v; if (!voice) try { speechSynthesis.cancel(); } catch (e) { /* むし */ } },
    unlock: function () { ac(); },
    tap: function () { var c = ac(); if (c) tone(880, c.currentTime, 0.06, 'triangle', 0.15); },
    key: function () { var c = ac(); if (c) tone(660, c.currentTime, 0.08, 'square', 0.08, 990); },
    // あわの ぽこっ
    bubble: function () {
      var c = ac(); if (!c) return;
      var f = 350 + Math.random() * 500;
      tone(f, c.currentTime, 0.09, 'sine', 0.18, f * 2.6);
    },
    // せんたくきの ごうんごうん（ローパス ノイズ ＋ LFO）
    rumble: function (sec) {
      var c = ac(); if (!c) return;
      this.rumbleStop();
      var t = c.currentTime;
      var s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 4;
      var g = c.createGain(); g.gain.value = 0;
      var amp = c.createGain(); amp.gain.value = 0.5;
      var lfo = c.createOscillator(); lfo.frequency.value = 3.2;
      var lfoG = c.createGain(); lfoG.gain.value = 0.35;
      lfo.connect(lfoG); lfoG.connect(amp.gain);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.9, t + 0.2);
      g.gain.setValueAtTime(0.9, t + sec - 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
      s.connect(lp); lp.connect(amp); amp.connect(g); g.connect(master);
      s.start(t); lfo.start(t); s.stop(t + sec + 0.05); lfo.stop(t + sec + 0.05);
      // モーターの うなり
      var m = c.createOscillator(), mg = c.createGain();
      m.type = 'sawtooth'; m.frequency.setValueAtTime(60, t); m.frequency.linearRampToValueAtTime(95, t + sec * 0.6);
      var mlp = c.createBiquadFilter(); mlp.type = 'lowpass'; mlp.frequency.value = 180;
      mg.gain.setValueAtTime(0.0001, t); mg.gain.exponentialRampToValueAtTime(0.12, t + 0.2);
      mg.gain.exponentialRampToValueAtTime(0.0001, t + sec);
      m.connect(mlp); mlp.connect(mg); mg.connect(master); m.start(t); m.stop(t + sec + 0.05);
      rumbleNode = [s, lfo, m];
    },
    rumbleStop: function () {
      if (!rumbleNode) return;
      rumbleNode.forEach(function (n) { try { n.stop(); } catch (e) { /* むし */ } });
      rumbleNode = null;
    },
    // へんしんの きらりん
    sparkle: function () {
      var c = ac(); if (!c) return;
      var t = c.currentTime;
      [1047, 1319, 1568, 2093, 2637].forEach(function (f, i) { tone(f, t + i * 0.07, 0.35, 'triangle', 0.18); });
    },
    // もとに もどる ぷしゅー
    pssh: function () {
      var c = ac(); if (!c) return;
      var t = c.currentTime;
      noise(t, 0.7, 'highpass', 2500, 0.35, 600);
      tone(500, t, 0.35, 'sine', 0.12, 160);
    },
    fanfare: function () {
      var c = ac(); if (!c) return;
      var t = c.currentTime;
      [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.4], [784, 0.56], [1047, 0.7]].forEach(function (n) {
        tone(n[0], t + n[1], 0.3, 'square', 0.1);
        tone(n[0] / 2, t + n[1], 0.3, 'triangle', 0.12);
      });
    },
    say: function (text) {
      if (!voice) return;
      try {
        if (!window.speechSynthesis) return;
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'ja-JP'; u.rate = 0.9; u.pitch = 1.15;
        speechSynthesis.speak(u);
      } catch (e) { /* むし */ }
    },
  };
})();
