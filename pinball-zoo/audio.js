/* ============================================================
   ころころ ピンボール どうぶつえん — おと（WebAudio の ごうせいおん だけ）
   フリッパー の かちゃ・バンパー の ぽよん・どうぶつ の なきごえ・
   ファンファーレ・オリジナル の サーカス ふう BGM（よる は しずか な アレンジ）
   ============================================================ */
(function (root) {
  "use strict";
  var ctx = null, master = null, bgmGain = null, noiseBuf = null;
  var sfxOn = true, bgmOn = true, bgmNight = false, bgmTimer = null, bgmStep = 0, bgmNext = 0;

  function ac() {
    if (!ctx) {
      var C = root.AudioContext || root.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
      bgmGain = ctx.createGain(); bgmGain.gain.value = 0.22; bgmGain.connect(master);
    }
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) { /* むし */ } }
    return ctx;
  }
  function noise() {
    if (noiseBuf) return noiseBuf;
    var n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 7;
    for (var i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
    return (noiseBuf = b);
  }
  function tone(type, f0, f1, dur, v, at, dest, vib) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (at || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    if (vib) {
      var l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = vib[0]; lg.gain.value = vib[1]; l.connect(lg); lg.connect(o.frequency);
      l.start(t); l.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.setValueAtTime(v, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.05);
  }
  function hiss(freq, q, dur, v, at, type) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (at || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noise(); f.type = type || "bandpass"; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  var hz = function (semi) { return 523.25 * Math.pow(2, semi / 12); };   // 0 = ド（C5）

  var last = {};
  function rate(key, gap) {
    var now = Date.now();
    if (last[key] && now - last[key] < gap) return false;
    last[key] = now; return true;
  }

  var CALLS = {
    elephant: function () { tone("sawtooth", 330, 620, 0.25, 0.14, 0, null, [7, 25]); tone("sawtooth", 620, 380, 0.45, 0.13, 0.22, null, [6, 30]); hiss(1500, 2, 0.4, 0.05, 0.1); },
    giraffe: function () { tone("sine", 196, 220, 0.5, 0.2, 0, null, [5, 6]); tone("sine", 247, 233, 0.4, 0.12, 0.25); },
    penguin: function () { tone("square", 820, 1250, 0.09, 0.07); tone("square", 900, 1350, 0.1, 0.07, 0.13); },
    monkey: function () { for (var i = 0; i < 3; i++) tone("sine", 1100 + i * 120, 1800, 0.08, 0.14, i * 0.09); },
    lion: function () { tone("sawtooth", 120, 70, 0.8, 0.22, 0, null, [22, 14]); hiss(260, 1.2, 0.8, 0.22, 0, "lowpass"); },
    turtle: function () { tone("sine", 240, 160, 0.35, 0.2); tone("sine", 200, 150, 0.35, 0.15, 0.3); },
    owl: function () { tone("sine", 420, 380, 0.25, 0.2); tone("sine", 400, 350, 0.4, 0.18, 0.35); },
    bat: function () { tone("sine", 2400, 3200, 0.04, 0.08); tone("sine", 2600, 3400, 0.04, 0.08, 0.07); }
  };

  /* ---------- BGM: オリジナル の サーカス ふう マーチ（2/4、8ぶおんぷ × 8 × 8しょうせつ） ---------- */
  var MEL = [
    0, 4, 7, 4, 9, 7, 4, 0,
    2, 4, 5, 7, 4, null, 0, null,
    7, 11, 14, 11, 12, 11, 9, 7,
    5, 4, 2, 4, 7, null, null, null,
    9, 12, 9, 5, 7, 9, 10, 9,
    7, 4, 0, 4, 7, null, 12, null,
    11, 9, 7, 5, 4, 2, 5, 2,
    0, null, 7, null, 0, null, null, null
  ];
  var CHORD = [[0, 4, 7], [0, 4, 7], [-5, -1, 2], [-5, -1, 2], [-7, -3, 0], [0, 4, 7], [-5, -1, 2], [0, 4, 7]];
  function bgmTick() {
    var c = ctx; if (!c) return;
    var spb = bgmNight ? 60 / 92 / 2 : 60 / 138 / 2;
    while (bgmNext < c.currentTime + 0.25) {
      var i = bgmStep % MEL.length, bar = Math.floor(i / 8), ch = CHORD[bar], at = bgmNext - c.currentTime;
      var m = MEL[i];
      if (m != null) {
        if (bgmNight) tone("triangle", hz(m - 12), 0, spb * 1.6, 0.35, at, bgmGain);
        else { tone("square", hz(m), 0, spb * 0.8, 0.22, at, bgmGain); }
      }
      if (i % 2 === 0) tone(bgmNight ? "sine" : "triangle", hz(ch[(i / 2) % 2 === 0 ? 0 : 2] - 24), 0, spb * 0.9, 0.5, at, bgmGain);
      else if (!bgmNight) for (var k = 0; k < 3; k++) tone("square", hz(ch[k] - 12), 0, spb * 0.35, 0.06, at, bgmGain);
      if (!bgmNight && i % 4 === 0) {   // ドラム
        var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = bgmNext;
        s.buffer = noise(); f.type = "highpass"; f.frequency.value = 5000;
        g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        s.connect(f); f.connect(g); g.connect(bgmGain); s.start(t); s.stop(t + 0.08);
      }
      bgmNext += spb; bgmStep++;
    }
  }
  function startBgm() {
    if (!bgmOn || bgmTimer) return;
    var c = ac(); if (!c) return;
    bgmNext = c.currentTime + 0.1; bgmStep = 0;
    bgmTimer = setInterval(bgmTick, 80);
  }
  function stopBgm() { if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; } }

  var A = {
    get on() { return sfxOn; }, set on(v) { sfxOn = !!v; },
    get bgm() { return bgmOn; },
    set bgm(v) { bgmOn = !!v; if (!bgmOn) stopBgm(); },
    unlock: function () { ac(); },
    playing: function () { return !!bgmTimer; },
    startBgm: startBgm, stopBgm: stopBgm,
    setNight: function (n) { bgmNight = !!n; },
    flip: function () { if (!sfxOn || !rate("flip", 40)) return; hiss(3200, 3, 0.05, 0.25); tone("square", 180, 90, 0.05, 0.1); },
    bump: function () { if (!sfxOn || !rate("bump", 40)) return; tone("sine", 420, 880, 0.12, 0.3); tone("triangle", 880, 660, 0.1, 0.12, 0.04); },
    thud: function () { if (!sfxOn || !rate("thud", 80)) return; tone("sine", 140, 80, 0.12, 0.25); },
    call: function (id) { if (!sfxOn || !CALLS[id] || !rate("call" + id, 250)) return; ac(); CALLS[id](); },
    score: function () { if (!sfxOn || !rate("score", 60)) return; tone("triangle", 1568, 0, 0.06, 0.08); },
    spring: function (p) { if (!sfxOn || !rate("spring", 70)) return; tone("triangle", 200 + p * 400, 0, 0.05, 0.06); },
    launch: function (p) { if (!sfxOn) return; hiss(900 + p * 1500, 1, 0.3, 0.3); tone("sine", 200, 600 + p * 600, 0.25, 0.18); },
    rail: function () { if (!sfxOn) return; for (var i = 0; i < 6; i++) tone("triangle", hz(i * 2 + 7), 0, 0.08, 0.12, i * 0.06); },
    ice: function () { if (!sfxOn) return; for (var i = 0; i < 8; i++) tone("sine", hz(19 - i), 0, 0.09, 0.08, i * 0.05); hiss(6000, 1, 0.5, 0.06); },
    wake: function () { if (!sfxOn) return; [0, 4, 7, 12].forEach(function (s, i) { tone("square", hz(s), 0, 0.14, 0.12, i * 0.09); }); },
    fanfare: function () {
      if (!sfxOn) return;
      [[0, 0], [0, 0.12], [0, 0.24], [7, 0.36], [12, 0.6], [7, 0.84], [12, 0.96], [16, 1.08], [19, 1.32]].forEach(function (n) {
        tone("sawtooth", hz(n[0]), 0, 0.2, 0.09, n[1]); tone("square", hz(n[0] - 12), 0, 0.2, 0.06, n[1]);
      });
    },
    drain: function () { if (!sfxOn) return; tone("triangle", 440, 110, 0.6, 0.2); },
    save: function () { if (!sfxOn) return; tone("sine", hz(7), 0, 0.12, 0.2); tone("sine", hz(12), 0, 0.2, 0.2, 0.12); },
    over: function () { if (!sfxOn) return; [7, 4, 0, -5].forEach(function (s, i) { tone("triangle", hz(s), 0, 0.3, 0.2, i * 0.25); }); }
  };
  root.PZAudio = A;
})(window);
