// どたばた ペット ホテル — おと（WebAudio の ごうせいおん だけ。おんせい ファイルは つかわない）
//  - BGM: オリジナルの どたばた マーチ。イベントで テンポ・ちょうしが かわる
//  - こうかおん: あわ・ぱちん・なきごえ・どんがらがっしゃん・ファンファーレ・ピンポンパンポーン …
'use strict';
var Sound = (function () {
  var ctx = null, master = null, bgmGain = null, seGain = null, noiseBuf = null;
  var on = { bgm: true, se: true };
  var mode = 'normal';
  var timer = null, nextT = 0, stepI = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    bgmGain = ctx.createGain(); bgmGain.gain.value = on.bgm ? 0.32 : 0; bgmGain.connect(master);
    seGain = ctx.createGain(); seGain.gain.value = on.se ? 0.9 : 0; seGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function set(kind, v) {
    on[kind] = v;
    if (!ctx) return;
    var gn = kind === 'bgm' ? bgmGain : seGain;
    gn.gain.setTargetAtTime(v ? (kind === 'bgm' ? 0.32 : 0.9) : 0, ctx.currentTime, 0.05);
  }

  function tone(f, t, len, type, vol, dest, f2, attack) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(dest || seGain);
    o.start(t); o.stop(t + len + 0.05);
    return o;
  }
  function noise(t, len, vol, filt, freq, q, dest, f2) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = filt || 'lowpass'; f.frequency.setValueAtTime(freq || 1000, t); f.Q.value = q || 1;
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + len);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(dest || seGain);
    s.start(t, Math.random() * 0.5); s.stop(t + len + 0.05);
  }

  var VOICE = {
    usagi: function (t) { tone(1400, t, 0.12, 'sine', 0.25, null, 1900); tone(1800, t + 0.1, 0.1, 'sine', 0.2, null, 2300); },
    inu: function (t) { tone(520, t, 0.16, 'square', 0.12, null, 300); tone(560, t + 0.2, 0.14, 'square', 0.1, null, 320); },
    penguin: function (t) { tone(700, t, 0.14, 'sawtooth', 0.09, null, 500); tone(900, t + 0.15, 0.12, 'sawtooth', 0.08, null, 600); },
    kame: function (t) { tone(240, t, 0.12, 'sine', 0.3, null, 330); tone(300, t + 0.14, 0.12, 'sine', 0.25, null, 380); },
    neko: function (t) { var o = tone(700, t, 0.45, 'sawtooth', 0.08, null, 520, 0.05); o.frequency.linearRampToValueAtTime(950, t + 0.15); },
    niwatori: function (t) { tone(900, t, 0.06, 'square', 0.1, null, 1200); tone(1000, t + 0.09, 0.06, 'square', 0.1, null, 1300); tone(1100, t + 0.2, 0.25, 'square', 0.1, null, 700); },
    buta: function (t) { tone(180, t, 0.3, 'sawtooth', 0.14, null, 140); noise(t, 0.25, 0.08, 'lowpass', 500); },
    risu: function (t) { for (var i = 0; i < 3; i++) tone(2000 + i * 200, t + i * 0.06, 0.05, 'sine', 0.15, null, 2600); },
  };

  function play(name, o) {
    if (!ctx || !on.se) return;
    o = o || {};
    var t = ctx.currentTime + 0.01;
    switch (name) {
      case 'bubble': tone(300, t, 0.22, 'sine', 0.3, null, 900); tone(600, t + 0.04, 0.18, 'triangle', 0.1, null, 1500); break;
      case 'capture': tone(500, t, 0.35, 'sine', 0.3, null, 1300); tone(800, t + 0.08, 0.3, 'sine', 0.2, null, 1800); break;
      case 'tether': tone(880, t, 0.1, 'triangle', 0.2); tone(1320, t + 0.08, 0.14, 'triangle', 0.2); break;
      case 'pop': noise(t, 0.12, 0.5, 'highpass', 1500); tone(1200, t, 0.08, 'square', 0.1, null, 300); break;
      case 'popSmall': noise(t, 0.06, 0.15, 'highpass', 2500); break;
      case 'slip': tone(1500, t, 0.25, 'sine', 0.2, null, 400); break;
      case 'jump': tone(330, t, 0.16, 'square', 0.08, null, 660); break;
      case 'jump2': tone(500, t, 0.16, 'square', 0.08, null, 1000); break;
      case 'hop': tone(600, t, 0.08, 'sine', 0.12, null, 900); break;
      case 'flap': noise(t, 0.08, 0.2, 'bandpass', 1200, 2); noise(t + 0.1, 0.08, 0.2, 'bandpass', 1200, 2); break;
      case 'dash': noise(t, 0.3, 0.35, 'bandpass', 600, 1, null, 2500); break;
      case 'whoosh': noise(t, 0.3, 0.4, 'bandpass', 2500, 1, null, 300); break;
      case 'dosun': tone(90, t, 0.5, 'sine', 0.6, null, 40); noise(t, 0.4, 0.5, 'lowpass', 400); break;
      case 'crash': {
        var w = Math.max(0.1, Math.min(2, o.w || 1)), v = Math.min(1, (o.s || 4) / 10);
        noise(t, 0.12 + w * 0.12, 0.25 + v * 0.35, 'lowpass', 2600 / (0.5 + w), 1);
        tone(320 / (0.4 + w), t, 0.12, 'triangle', 0.15 * v, null, 120 / (0.4 + w));
        if (Math.random() < 0.4) tone(1400 + Math.random() * 1200, t + 0.05, 0.1, 'triangle', 0.06);
        break;
      }
      case 'fart': tone(90 + Math.random() * 40, t, 0.25, 'sawtooth', 0.12, null, 60); noise(t, 0.2, 0.1, 'lowpass', 300); break;
      case 'fartBig': {
        var o2 = tone(110, t, 1.4, 'sawtooth', 0.3, null, 55, 0.05);
        var lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 18; lg.gain.value = 30; lfo.connect(lg); lg.connect(o2.frequency); lfo.start(t); lfo.stop(t + 1.5);
        noise(t, 1.3, 0.35, 'lowpass', 500, 1, null, 150);
        break;
      }
      case 'fanfare': [523, 659, 784, 1047].forEach(function (f, i) { tone(f, t + i * 0.1, 0.25 + (i === 3 ? 0.35 : 0), 'square', 0.1); tone(f / 2, t + i * 0.1, 0.25, 'triangle', 0.12); }); break;
      case 'chime': [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, t + i * 0.28, 0.9, 'sine', 0.25, null, null, 0.01); tone(f * 2, t + i * 0.28, 0.4, 'sine', 0.05); }); break;
      case 'tick': tone(1800, t, 0.03, 'square', 0.06); break;
      case 'eventGo': tone(660, t, 0.12, 'square', 0.1); tone(990, t + 0.12, 0.25, 'square', 0.1); break;
      case 'eventEnd': tone(990, t, 0.12, 'triangle', 0.15); tone(660, t + 0.12, 0.25, 'triangle', 0.15); break;
      case 'wrong': tone(300, t, 0.15, 'square', 0.08); tone(250, t + 0.16, 0.2, 'square', 0.08); break;
      case 'door': tone(400, t, 0.1, 'triangle', 0.2, null, 600); noise(t, 0.1, 0.1, 'bandpass', 800); break;
      case 'poof': noise(t, 0.3, 0.3, 'lowpass', 1200, 1, null, 300); break;
      case 'shower': noise(t, 0.6, 0.15, 'highpass', 3000); tone(1200, t + 0.1, 0.2, 'sine', 0.15, null, 1800); break;
      case 'vacuum': { var ov = tone(140, t, 3.0, 'sawtooth', 0.05, null, 160, 0.3); ov.detune.value = 10; noise(t, 3.0, 0.06, 'bandpass', 900, 2); break; }
      case 'clear': [523, 659, 784, 659, 784, 1047].forEach(function (f, i) { tone(f, t + i * 0.13, 0.3, 'square', 0.09); }); break;
      case 'star': tone(1319, t, 0.25, 'triangle', 0.2); tone(1760, t + 0.08, 0.3, 'triangle', 0.15); break;
      case 'click': tone(900, t, 0.05, 'triangle', 0.12); break;
      case 'voice': if (VOICE[o.pet]) VOICE[o.pet](t); break;
      default: break;
    }
  }

  // ---- BGM（オリジナル の どたばた マーチ）------------------------------------
  // 1こ = 8ぶんおんぷ。0 は やすみ
  var MEL = [72, 0, 72, 74, 76, 0, 72, 0, 77, 76, 74, 72, 74, 0, 67, 0, 72, 0, 72, 74, 76, 0, 79, 0, 77, 76, 74, 76, 72, 0, 0, 0,
    76, 0, 76, 77, 79, 0, 76, 0, 81, 79, 77, 76, 74, 0, 71, 0, 72, 74, 76, 72, 74, 76, 77, 74, 76, 74, 72, 71, 72, 0, 0, 0];
  var BASS = [48, 55, 48, 55, 53, 60, 55, 50, 48, 55, 48, 55, 53, 55, 48, 48];
  function mtof(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function tempo() { return mode === 'slow' ? 0.55 : mode === 'fast' ? 1.5 : mode === 'fuwa' ? 0.7 : 1; }
  function schedule() {
    if (!ctx) return;
    var spb = 60 / (132 * tempo()) / 2;
    while (nextT < ctx.currentTime + 0.25) {
      var i = stepI % MEL.length, t = nextT;
      var n = MEL[i];
      var shift = mode === 'fuwa' ? -5 : mode === 'ice' ? 12 : 0;
      if (n) {
        tone(mtof(n + shift), t, spb * 0.9, mode === 'fuwa' ? 'sine' : 'square', mode === 'fuwa' ? 0.12 : 0.06, bgmGain);
        if (mode === 'ice') tone(mtof(n + 24), t, spb * 1.6, 'sine', 0.04, bgmGain);
      }
      if (i % 4 === 0) tone(mtof(BASS[(i / 4) % BASS.length] - 12), t, spb * 1.8, 'triangle', 0.22, bgmGain);
      if (mode !== 'fuwa') {
        if (i % 4 === 0) tone(120, t, 0.1, 'sine', 0.3, bgmGain, 50);
        if (i % 4 === 2) noise(t, 0.08, 0.12, 'highpass', 2000, 1, bgmGain);
        if (mode === 'fast' && i % 2 === 1) noise(t, 0.03, 0.06, 'highpass', 6000, 1, bgmGain);
      } else if (i % 8 === 0) tone(mtof(n ? n + 7 : 79), t, spb * 4, 'sine', 0.05, bgmGain);
      if (mode === 'chaos' && i % 2 === 1) tone(mtof(60 + (i * 7) % 24), t, spb * 0.5, 'square', 0.03, bgmGain);
      nextT += spb; stepI++;
    }
  }
  function startBgm() {
    if (!ctx || timer) return;
    nextT = ctx.currentTime + 0.1; stepI = 0;
    timer = setInterval(schedule, 60);
  }
  function stopBgm() { if (timer) { clearInterval(timer); timer = null; } }
  function setMode(m) { mode = m || 'normal'; }

  return { init: init, set: set, play: play, startBgm: startBgm, stopBgm: stopBgm, setMode: setMode, on: on };
})();
