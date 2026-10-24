/* ============================================================
   きめつバトル — おと（WebAudio の ごうせいおん だけ。おとの ファイルは ない）
   こうかおん: カーソル・けってい・きる・みず・ほのお・パンチ・かいふく・びわ
   BGM: battle（たたかい・Dマイナーの ループ）/ win（かちの きょく）。どちらも オリジナルの メロディ
   ============================================================ */
(function (root) {
  "use strict";
  var KB = root.KB = root.KB || {};
  var ctx = null, master = null, sfxG = null, bgmG = null, noiseBuf = null;
  var sfxOn = true, bgmOn = true;
  var bgm = { name: null, timer: 0, next: 0, step: 0 };

  function ac() {
    if (!ctx) {
      var C = root.AudioContext || root.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      sfxG = ctx.createGain(); sfxG.gain.value = sfxOn ? 0.9 : 0; sfxG.connect(master);
      bgmG = ctx.createGain(); bgmG.gain.value = bgmOn ? 0.28 : 0; bgmG.connect(master);
    }
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) { /* むし */ } }
    return ctx;
  }

  function noise() {
    if (noiseBuf) return noiseBuf;
    var n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 4242;
    for (var i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
    return (noiseBuf = b);
  }

  // ひとつの おと（なみの かたち・たかさ・ながさ・おおきさ・ピッチの へんか）
  function tone(out, t, type, f, dur, vol, f2) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  // ザッ・シュッ（ノイズ＋フィルタ）
  function hiss(t, dur, vol, ftype, f1, f2, q) {
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(); fl.type = ftype; fl.Q.value = q || 1;
    fl.frequency.setValueAtTime(f1, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(sfxG); s.start(t); s.stop(t + dur + 0.05);
  }

  var SFX = {
    cursor: function (t) { tone(sfxG, t, "square", 1320, 0.05, 0.08); },
    ok: function (t) { tone(sfxG, t, "square", 880, 0.06, 0.1); tone(sfxG, t + 0.06, "square", 1320, 0.08, 0.1); },
    back: function (t) { tone(sfxG, t, "square", 660, 0.07, 0.08, 440); },
    ready: function (t) { tone(sfxG, t, "triangle", 1046, 0.08, 0.12); tone(sfxG, t + 0.07, "triangle", 1568, 0.1, 0.1); },
    slash: function (t) { hiss(t, 0.18, 0.5, "bandpass", 5000, 1800, 2); tone(sfxG, t, "sawtooth", 1800, 0.08, 0.05, 900); },
    water: function (t) { hiss(t, 0.45, 0.45, "bandpass", 900, 3200, 1.5); hiss(t + 0.05, 0.35, 0.25, "lowpass", 2400, 400); },
    fire: function (t) { hiss(t, 0.5, 0.55, "lowpass", 3000, 300); tone(sfxG, t, "sawtooth", 140, 0.4, 0.12, 60); },
    punch: function (t) { tone(sfxG, t, "sine", 160, 0.18, 0.5, 45); hiss(t, 0.1, 0.4, "lowpass", 1800, 200); },
    big: function (t) { tone(sfxG, t, "sine", 120, 0.5, 0.6, 30); hiss(t, 0.5, 0.5, "lowpass", 2500, 100); },
    miss: function (t) { hiss(t, 0.2, 0.25, "highpass", 3000, 6000); },
    heal: function (t) { [784, 988, 1175, 1568].forEach(function (f, i) { tone(sfxG, t + i * 0.07, "triangle", f, 0.25, 0.12); }); },
    buff: function (t) { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(sfxG, t + i * 0.06, "sine", f, 0.4, 0.1); }); },
    nagi: function (t) { tone(sfxG, t, "sine", 392, 1.2, 0.15); tone(sfxG, t + 0.1, "sine", 588, 1.1, 0.1); hiss(t, 1.0, 0.15, "lowpass", 800, 200); },
    guard: function (t) { tone(sfxG, t, "square", 300, 0.1, 0.1); tone(sfxG, t + 0.05, "square", 450, 0.1, 0.08); },
    charge: function (t) { tone(sfxG, t, "sawtooth", 80, 1.2, 0.15, 400); hiss(t, 1.2, 0.2, "bandpass", 300, 2000, 3); },
    limit: function (t) { [440, 554, 659, 880].forEach(function (f, i) { tone(sfxG, t + i * 0.05, "square", f, 0.12, 0.08); }); },
    biwa: function (t) { [220, 220, 330].forEach(function (f, i) { tone(sfxG, t + i * 0.16, "sawtooth", f, 0.7, 0.18, f * 0.98); tone(sfxG, t + i * 0.16, "triangle", f * 2, 0.4, 0.08); }); },
    down: function (t) { tone(sfxG, t, "triangle", 440, 0.5, 0.15, 110); },
    sparkle: function (t) { for (var i = 0; i < 8; i++) tone(sfxG, t + i * 0.09, "sine", 1200 + i * 180, 0.3, 0.06); }
  };

  /* ---------- BGM ----------
     16ぶ おんぷ 1つ = step。ノートは MIDI ばんごう（0 は やすみ） */
  function mid(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  var SONGS = {
    battle: {
      bpm: 150, loop: true,
      // ベース（Dマイナー: D D F G / Bb A …）
      bass: [38,0,38,50, 38,0,38,50, 41,0,41,53, 43,0,43,55, 46,0,46,58, 45,0,45,57, 38,0,38,50, 45,0,44,45],
      lead: [62,0,65,0, 69,0,67,65, 64,0,62,0, 64,65,67,0, 70,0,69,0, 67,0,65,64, 62,0,0,0, 57,0,61,0,
             62,0,65,0, 69,0,72,0, 70,69,67,0, 65,0,67,0, 70,0,74,0, 72,70,69,0, 74,0,0,73, 74,0,0,0],
      drum: [1,0,3,0, 2,0,3,0, 1,0,3,1, 2,0,3,3]
    },
    win: {
      bpm: 132, loop: false,
      bass: [48,0,0,0, 53,0,0,0, 55,0,0,0, 48,0,0,0],
      lead: [72,0,76,79, 0,0,77,0, 76,74,72,0, 74,0,79,0, 84,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      drum: [1,0,0,0, 2,0,0,0, 1,0,1,0, 2,0,0,0]
    }
  };

  function schedule() {
    var s = SONGS[bgm.name];
    if (!s || !ctx) return;
    var stepDur = 60 / s.bpm / 4, len = s.lead.length;
    while (bgm.next < ctx.currentTime + 0.25) {
      var i = bgm.step, t = bgm.next;
      if (!s.loop && i >= len) { stopBgm(); return; }
      var L = s.lead[i % len], B = s.bass[i % s.bass.length], D = s.drum[i % s.drum.length];
      if (L) { tone(bgmG, t, "square", mid(L), stepDur * 1.8, 0.12); tone(bgmG, t, "triangle", mid(L + 12), stepDur * 1.2, 0.04); }
      if (B) tone(bgmG, t, "sawtooth", mid(B), stepDur * 0.9, 0.13);
      if (D === 1) { tone(bgmG, t, "sine", 110, 0.12, 0.5, 40); }
      else if (D === 2) { var sn = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        sn.buffer = noise(); f.type = "highpass"; f.frequency.value = 1500; g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        sn.connect(f); f.connect(g); g.connect(bgmG); sn.start(t); sn.stop(t + 0.15); }
      else if (D === 3) { var hh = ctx.createBufferSource(), g2 = ctx.createGain(), f2 = ctx.createBiquadFilter();
        hh.buffer = noise(); f2.type = "highpass"; f2.frequency.value = 7000; g2.gain.setValueAtTime(0.08, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
        hh.connect(f2); f2.connect(g2); g2.connect(bgmG); hh.start(t); hh.stop(t + 0.06); }
      bgm.step++; bgm.next += stepDur;
    }
  }
  function playBgm(name) {
    if (!ac()) return;
    stopBgm();
    bgm.name = name; bgm.step = 0; bgm.next = ctx.currentTime + 0.1;
    schedule();
    bgm.timer = setInterval(schedule, 80);
  }
  function stopBgm() { clearInterval(bgm.timer); bgm.timer = 0; bgm.name = null; }

  KB.audio = {
    unlock: function () { ac(); },
    sfx: function (n) { if (!sfxOn || !ac() || !SFX[n]) return; try { SFX[n](ctx.currentTime + 0.01); } catch (e) { /* むし */ } },
    bgm: playBgm, stopBgm: stopBgm,
    setSfx: function (v) { sfxOn = v; if (sfxG) sfxG.gain.value = v ? 0.9 : 0; },
    setBgm: function (v) { bgmOn = v; if (bgmG) bgmG.gain.value = v ? 0.28 : 0; },
    get sfxOn() { return sfxOn; }, get bgmOn() { return bgmOn; }
  };
})(window);
