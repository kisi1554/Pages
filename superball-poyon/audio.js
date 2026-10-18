/* ============================================================
   ぽよよん スーパーボール — おと（WebAudio の ごうせいおん だけ）
   ぽよん（おおきい ボールは ひくく、ちいさいと たかく）・ドレミ・
   ガチャの カラカラ・パカッ・ちゃぽん・びりっ・ファンファーレ
   どうじに なる おとは 10こ まで。おなじ ボールの れんぞくは まびく
   ============================================================ */
(function (root) {
  "use strict";
  var ctx = null, master = null, on = true, vol = 0.7;
  var voices = [], MAX_VOICES = 10, lastBall = new Map();
  var noiseBuf = null, puku = null;

  function ac() {
    if (!on) return null;
    if (!ctx) {
      var C = root.AudioContext || root.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) { /* むし */ } }
    return ctx;
  }

  // どうじに なっている おとの かずを かぞえる
  function slot(dur) {
    var now = ctx.currentTime;
    voices = voices.filter(function (t) { return t > now; });
    if (voices.length >= MAX_VOICES) return false;
    voices.push(now + dur);
    return true;
  }

  function noise() {
    if (noiseBuf) return noiseBuf;
    var n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 12345;
    for (var i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
    return (noiseBuf = b);
  }

  function tone(type, f0, f1, dur, v, at) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (at || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }

  function hiss(freq, q, dur, v, at, type) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (at || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noise(); f.type = type || "bandpass"; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  var A = {
    get on() { return on; },
    get vol() { return vol; },
    setOn: function (v) { on = !!v; if (!on) A.stopPuku(); if (on) ac(); },
    setVol: function (v) { vol = Math.max(0, Math.min(1, v)); if (master) master.gain.value = vol; },
    unlock: function () { ac(); },

    // ぽよん: みじかい サイン＋ピッチ さがり。r: はんけい(px)、sp: しょうとつの はやさ
    poyon: function (r, sp, id) {
      var c = ac(); if (!c) return;
      var now = c.currentTime;
      if (id != null) {
        var lt = lastBall.get(id) || 0;
        if (now - lt < 0.07) return;
        lastBall.set(id, now);
        if (lastBall.size > 400) lastBall.clear();
      }
      var v = Math.min(1, sp / 1600);
      if (v < 0.04) return;
      if (!slot(0.16)) return;
      var f = Math.max(110, Math.min(2200, 640 * Math.pow(22 / Math.max(5, r), 0.7)));
      tone("sine", f, f * 0.55, 0.15, 0.32 * v + 0.02);
      tone("triangle", f * 2, f * 1.1, 0.06, 0.06 * v);
    },
    // ドレミ（マリンバ ふう）
    note: function (freq, sp) {
      var c = ac(); if (!c) return;
      if (!slot(0.6)) return;
      var v = 0.12 + Math.min(1, sp / 1500) * 0.3;
      tone("sine", freq, 0, 0.6, v);
      tone("sine", freq * 4, 0, 0.12, v * 0.25);
      tone("triangle", freq * 2, 0, 0.2, v * 0.15);
    },
    pon: function () { tone("sine", 320, 900, 0.09, 0.28); },
    pop: function (i) { tone("sine", 700 + (i || 0) % 6 * 90, 1500, 0.07, 0.22); },
    boom: function () {
      hiss(160, 0.7, 0.6, 0.7, 0, "lowpass");
      tone("sine", 160, 45, 0.5, 0.6);
    },
    whoosh: function (up) { hiss(up ? 900 : 500, 1.2, 0.5, 0.25); },
    kira: function () { [1568, 2093, 2637, 3136].forEach(function (f, i) { tone("sine", f, 0, 0.3, 0.12, i * 0.07); }); },
    star: function () { tone("sine", 1318, 0, 0.18, 0.18); tone("sine", 1976, 0, 0.3, 0.16, 0.08); },
    // ぷくーっ（ながおしで ふくらむ あいだ なる）
    startPuku: function () {
      var c = ac(); if (!c || puku) return;
      var o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = 220; g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.09, c.currentTime + 0.1);
      o.connect(g); g.connect(master); o.start();
      puku = { o: o, g: g };
    },
    pukuSize: function (k) { if (puku && ctx) puku.o.frequency.setTargetAtTime(220 + k * 520, ctx.currentTime, 0.05); },
    stopPuku: function () {
      if (!puku || !ctx) { puku = null; return; }
      var p = puku, t = ctx.currentTime; puku = null;
      p.g.gain.cancelScheduledValues(t); p.g.gain.setValueAtTime(p.g.gain.value, t);
      p.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); p.o.stop(t + 0.1);
    },
    // ガチャ
    karakara: function () { hiss(2600 + Math.random() * 800, 6, 0.05, 0.35); tone("square", 1800 + Math.random() * 400, 0, 0.02, 0.03); },
    gorogoro: function () { for (var i = 0; i < 6; i++) hiss(900 + i * 60, 3, 0.06, 0.2, i * 0.09); },
    paka: function () { hiss(3500, 3, 0.04, 0.5); tone("square", 1200, 600, 0.05, 0.08); tone("sine", 600, 1400, 0.12, 0.2, 0.04); },
    // すくい
    chapon: function (big) {
      var f = big ? 380 : 620;
      tone("sine", f, f * 2.6, 0.12, 0.3);
      hiss(1200, 1, 0.15, 0.12, 0.02);
    },
    bowl: function () { tone("sine", 700, 1800, 0.08, 0.25); tone("sine", 1400, 0, 0.25, 0.08, 0.05); },
    biri: function () { for (var i = 0; i < 5; i++) hiss(2500 + i * 300, 2, 0.05, 0.4, i * 0.035, "highpass"); },
    fanfare: function () {
      [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38], [784, 0.56], [1047, 0.68]].forEach(function (n) {
        tone("triangle", n[0], 0, n[1] > 0.6 ? 0.6 : 0.16, 0.22, n[1]);
        tone("square", n[0], 0, 0.1, 0.03, n[1]);
      });
    },
    sad: function () { tone("triangle", 440, 330, 0.3, 0.2); tone("triangle", 330, 247, 0.4, 0.18, 0.28); },
    tap: function () { tone("sine", 900, 1200, 0.05, 0.12); },
    bell: function () { [1047, 1319, 1568].forEach(function (f, i) { tone("sine", f, 0, 0.9, 0.2, i * 0.03); tone("sine", f * 2.76, 0, 0.3, 0.05, i * 0.03); }); },
    crack: function () { hiss(700, 1.5, 0.15, 0.5); tone("square", 220, 90, 0.12, 0.08); }
  };
  root.SBAudio = A;
})(typeof self !== "undefined" ? self : this);
