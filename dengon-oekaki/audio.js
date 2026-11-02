/* でんごん おえかき の おと（Web Audio の 合成音だけ）と よみあげ。
 *   Sound.on / Sound.pen / Sound.voice … オン・オフ（app.js が せってい から いれる）
 */
(function (root) {
  "use strict";
  var ctx = null, master = null, noiseBuf = null;
  var S = { on: true, pen: true, voice: true };

  function ac() {
    if (!S.on) return null;
    try {
      if (!ctx) {
        var AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.7;
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function noise() {
    if (noiseBuf) return noiseBuf;
    var n = ctx.sampleRate * 1.5;
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function tone(freq, dur, type, vol, when, glideTo) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (when || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function burst(dur, vol, when, filt, freq, q) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (when || 0);
    var s = c.createBufferSource(); s.buffer = noise();
    var f = c.createBiquadFilter(); f.type = filt || "bandpass"; f.frequency.value = freq || 2000; f.Q.value = q || 1;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  /* まわす ときの ポーン */
  S.pon = function () { tone(880, 0.6, "sine", 0.35); tone(1320, 0.5, "sine", 0.12, 0.02); };
  S.tap = function () { tone(660, 0.08, "triangle", 0.18); };
  S.ok = function () { tone(784, 0.12, "triangle", 0.25); tone(1047, 0.25, "triangle", 0.25, 0.1); };
  /* タイマー の こちこち（のこり 5びょう で たかく） */
  S.tick = function (hurry) { tone(hurry ? 1760 : 1100, 0.05, "square", hurry ? 0.12 : 0.06); };
  S.timeUp = function () { tone(988, 0.2, "square", 0.15); tone(784, 0.35, "square", 0.15, 0.2); };
  S.page = function () { burst(0.18, 0.2, 0, "highpass", 1500, 0.7); tone(520, 0.15, "sine", 0.15, 0.05, 780); };
  /* ドラムロール（sec びょう）→ シンバル */
  S.drumroll = function (sec) {
    var c = ac(); if (!c) return;
    sec = sec || 1.6;
    for (var t = 0; t < sec; t += 0.045) burst(0.06, 0.08 + 0.3 * (t / sec), t, "bandpass", 220, 0.8);
  };
  S.cymbal = function (when) {
    burst(1.6, 0.5, when || 0, "highpass", 5000, 0.5);
    burst(0.25, 0.4, when || 0, "lowpass", 160, 1);
  };
  /* 「ええーっ！」（みんなの こえ。のこぎりなみ を「え」の フォルマントで とおす） */
  S.eeh = function (when) {
    var c = ac(); if (!c) return;
    var t0 = c.currentTime + (when || 0);
    [190, 240, 300, 360].forEach(function (f0, k) {
      var t = t0 + k * 0.03;
      var o = c.createOscillator(); o.type = "sawtooth";
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.5, t + 0.45);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.25, t + 1.0);
      var vib = c.createOscillator(), vg = c.createGain();
      vib.frequency.value = 6 + k; vg.gain.value = f0 * 0.03;
      vib.connect(vg); vg.connect(o.frequency);
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.08);
      g.gain.setValueAtTime(0.12, t + 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      [[500, 6, 1], [1850, 8, 0.6], [2600, 10, 0.25]].forEach(function (fm) {
        var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = fm[0]; bp.Q.value = fm[1];
        var bg = c.createGain(); bg.gain.value = fm[2] * 3;
        o.connect(bp); bp.connect(bg); bg.connect(g);
      });
      g.connect(master);
      o.start(t); vib.start(t); o.stop(t + 1.2); vib.stop(t + 1.2);
    });
  };
  S.heart = function () { tone(1047, 0.1, "sine", 0.2); tone(1319, 0.1, "sine", 0.2, 0.08); tone(1568, 0.25, "sine", 0.2, 0.16); };

  /* ペン の さらさら */
  var penSrc = null, penGain = null;
  S.penStart = function () {
    if (!S.pen) return;
    var c = ac(); if (!c || penSrc) return;
    penSrc = c.createBufferSource(); penSrc.buffer = noise(); penSrc.loop = true;
    var f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 3200; f.Q.value = 0.9;
    penGain = c.createGain(); penGain.gain.value = 0.0001;
    penSrc.connect(f); f.connect(penGain); penGain.connect(master);
    penSrc.start();
  };
  S.penMove = function (speed) {
    if (!penGain || !ctx) return;
    var v = Math.min(0.12, 0.01 + speed * 0.004);
    penGain.gain.setTargetAtTime(v, ctx.currentTime, 0.03);
  };
  S.penStop = function () {
    if (!penSrc) return;
    try { penGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03); penSrc.stop(ctx.currentTime + 0.15); } catch (e) {}
    penSrc = null; penGain = null;
  };

  /* よみあげ */
  S.say = function (text, rate) {
    if (!S.voice || !text) return;
    try {
      var ss = root.speechSynthesis;
      if (!ss || !root.SpeechSynthesisUtterance) return;
      ss.cancel();
      var u = new root.SpeechSynthesisUtterance(text);
      u.lang = "ja-JP"; u.rate = rate || 0.9; u.pitch = 1.1;
      ss.speak(u);
    } catch (e) {}
  };
  S.hush = function () { try { if (root.speechSynthesis) root.speechSynthesis.cancel(); } catch (e) {} };
  S.unlock = function () { ac(); };

  root.Sound = S;
})(this);
