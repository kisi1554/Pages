/* ============================================================
   さむらい vs にんじゃ — おと（WebAudio の ごうせいおん だけ。おとの ファイルは ない）
   こうかおん: キン！（かたな）・シュッ（しゅりけん）・ドロン（かわりみ／けむり）・ぽこっ（あたり）
              ・たいこ（どん！）・かち の じんぎ
   BGM: わふうの ペンタトニック（よなぬき: ド レ ミ ソ ラ）の ループ。こと っぽい おと＋たいこ
   ============================================================ */
(function (root) {
  "use strict";
  var ctx = null, master = null, sfxG = null, bgmG = null, noiseBuf = null;
  var on = true, bgmOn = true;
  var bgm = { playing: false, timer: 0, next: 0, step: 0, song: 0 };

  function ac() {
    if (!ctx) {
      var C = root.AudioContext || root.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = on ? 0.8 : 0; master.connect(ctx.destination);
      sfxG = ctx.createGain(); sfxG.gain.value = 0.9; sfxG.connect(master);
      bgmG = ctx.createGain(); bgmG.gain.value = 0.32; bgmG.connect(master);
    }
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) { /* むし */ } }
    return ctx;
  }

  function noise() {
    if (noiseBuf) return noiseBuf;
    var n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 777;
    for (var i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
    return (noiseBuf = b);
  }

  function tone(type, f0, f1, dur, v, at, dest) {
    var c = ac(); if (!c || !on) return;
    var t = (at || c.currentTime), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfxG); o.start(t); o.stop(t + dur + 0.05);
  }

  function hiss(dur, v, ftype, f0, f1, q, at, dest) {
    var c = ac(); if (!c || !on) return;
    var t = (at || c.currentTime), s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noise(); s.loop = true;
    fl.type = ftype; fl.Q.value = q || 1; fl.frequency.setValueAtTime(f0, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || sfxG);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  function taiko(at, v, dest) {
    var c = ac(); if (!c) return;
    var t = at || c.currentTime;
    tone("sine", 140, 55, 0.45, v || 0.9, t, dest);
    hiss(0.08, (v || 0.9) * 0.35, "lowpass", 900, 300, 1, t, dest);
  }
  function kakko(at, v, dest) { // たいこの ふち（カッ）
    tone("square", 900, 700, 0.05, v || 0.12, at, dest);
    hiss(0.04, (v || 0.12) * 1.5, "bandpass", 2500, 2000, 4, at, dest);
  }

  var SFX = {
    kin: function () { var c = ac(); if (!c) return; var t = c.currentTime; tone("sine", 2350, 2200, 0.35, 0.22, t); tone("sine", 3520, 3300, 0.25, 0.12, t); tone("triangle", 1180, 1100, 0.18, 0.12, t); hiss(0.05, 0.25, "highpass", 5000, 0, 1, t); },
    parry: function () { var c = ac(); if (!c) return; var t = c.currentTime; tone("sine", 2800, 3000, 0.5, 0.25, t); tone("sine", 4200, 4400, 0.4, 0.14, t); tone("sine", 1400, 1500, 0.3, 0.12, t + 0.03); },
    shu: function () { hiss(0.2, 0.35, "bandpass", 1800, 5200, 3); },
    slash: function () { hiss(0.14, 0.32, "bandpass", 1200, 4000, 2); },
    zuba: function () { var c = ac(); if (!c) return; var t = c.currentTime; hiss(0.35, 0.5, "bandpass", 600, 6000, 1.5, t); tone("sawtooth", 220, 880, 0.2, 0.08, t); },
    hit: function (big) { var c = ac(); if (!c) return; var t = c.currentTime; tone("sine", big ? 300 : 420, big ? 120 : 200, big ? 0.2 : 0.12, big ? 0.5 : 0.35, t); hiss(0.07, 0.25, "lowpass", 1500, 400, 1, t); },
    doron: function () { var c = ac(); if (!c) return; var t = c.currentTime; tone("sine", 520, 110, 0.4, 0.4, t); hiss(0.6, 0.35, "lowpass", 2000, 200, 1, t); tone("triangle", 880, 1760, 0.12, 0.1, t + 0.05); },
    jump: function () { tone("sine", 420, 760, 0.12, 0.16); },
    land: function () { hiss(0.06, 0.12, "lowpass", 600, 200, 1); },
    charge: function () { var c = ac(); if (!c) return; var t = c.currentTime; tone("sine", 220, 660, 0.9, 0.18, t); tone("sine", 330, 990, 0.9, 0.1, t); },
    seal: function () { var c = ac(); if (!c) return; var t = c.currentTime; [784, 988, 1175].forEach(function (f, i) { tone("triangle", f, 0, 0.25, 0.15, t + i * 0.06); }); },
    brk: function () { var c = ac(); if (!c) return; var t = c.currentTime; tone("square", 300, 90, 0.35, 0.2, t); hiss(0.3, 0.3, "bandpass", 800, 300, 1, t); },
    tap: function () { tone("triangle", 880, 0, 0.07, 0.12); },
    don: function () { taiko(); },
    // たいこ の じんぎ（はじめ！）
    hajime: function () { var c = ac(); if (!c) return; var t = c.currentTime; taiko(t, 0.8); taiko(t + 0.22, 0.8); kakko(t + 0.44, 0.15); taiko(t + 0.56, 1); },
    // かち（よなぬき の のぼり＋たいこ）
    win: function () {
      var c = ac(); if (!c) return; var t = c.currentTime;
      [523, 587, 659, 784, 880, 1047].forEach(function (f, i) { koto(f, t + i * 0.1, 0.22); });
      taiko(t + 0.6, 0.9); taiko(t + 0.8, 0.9); koto(1047, t + 0.8, 0.3); koto(1319, t + 0.8, 0.2);
    },
    lose: function () { var c = ac(); if (!c) return; var t = c.currentTime; [659, 587, 523, 440].forEach(function (f, i) { koto(f, t + i * 0.18, 0.2); }); },
    card: function () { var c = ac(); if (!c) return; var t = c.currentTime; [1047, 1319, 1568, 2093].forEach(function (f, i) { tone("sine", f, 0, 0.4, 0.15, t + i * 0.07); }); }
  };

  // こと（ばちで はじいた おと）
  function koto(f, at, v, dest) {
    var c = ac(); if (!c || !on) return;
    var t = at || c.currentTime;
    tone("triangle", f, 0, 0.9, v || 0.2, t, dest);
    tone("sine", f * 2, 0, 0.35, (v || 0.2) * 0.4, t, dest);
    tone("square", f, 0, 0.05, (v || 0.2) * 0.15, t, dest);
  }

  // ---------- BGM ----------
  // よなぬき（C D E G A）の 16ぶ。0 = やすみ
  var Y = { C4: 262, D4: 294, E4: 330, G4: 392, A4: 440, C5: 523, D5: 587, E5: 659, G5: 784, A5: 880, G3: 196, A3: 220 };
  var SONGS = [
    { bpm: 132, mel: ["E5", 0, "D5", "E5", "G5", 0, "E5", "D5", "C5", 0, "D5", 0, "E5", 0, 0, 0,
      "A4", 0, "C5", "D5", "E5", 0, "D5", "C5", "A4", 0, "G4", 0, "A4", 0, 0, 0,
      "E5", 0, "G5", "A5", "G5", 0, "E5", "D5", "E5", 0, "G5", 0, "E5", "D5", "C5", 0,
      "D5", 0, "E5", "D5", "C5", 0, "A4", "G4", "A4", 0, 0, 0, "C5", 0, 0, 0],
      bass: ["A3", "A3", "C4", "C4", "A3", "A3", "G3", "G3"], drum: "D..k..D.D..k.kk." },
    { bpm: 104, mel: ["A4", 0, 0, "C5", "D5", 0, "E5", 0, "D5", 0, "C5", 0, "A4", 0, 0, 0,
      "G4", 0, "A4", 0, "C5", 0, "D5", "C5", "A4", 0, 0, 0, 0, 0, 0, 0,
      "E5", 0, 0, "G5", "E5", 0, "D5", 0, "C5", 0, "D5", 0, "E5", 0, 0, 0,
      "D5", 0, "C5", 0, "A4", 0, "G4", 0, "A4", 0, 0, 0, 0, 0, 0, 0],
      bass: ["A3", "A3", "G3", "G3", "C4", "C4", "A3", "A3"], drum: "D.......D...k..." }
  ];

  function bgmTick() {
    if (!bgm.playing || !ctx) return;
    var S = SONGS[bgm.song], sixteenth = 60 / S.bpm / 4;
    while (bgm.next < ctx.currentTime + 0.2) {
      var i = bgm.step % S.mel.length, t = bgm.next;
      if (bgmOn && on) {
        var n = S.mel[i];
        if (n) koto(Y[n], t, 0.2, bgmG);
        if (i % 8 === 0) tone("triangle", Y[S.bass[(i / 8) % S.bass.length | 0]] / 2, 0, sixteenth * 7, 0.3, t, bgmG);
        var dch = S.drum[i % 16];
        if (dch === "D") taiko(t, 0.5, bgmG);
        else if (dch === "k") kakko(t, 0.08, bgmG);
      }
      bgm.step++; bgm.next += sixteenth;
    }
  }

  function startBgm(song) {
    var c = ac(); if (!c) return;
    bgm.song = (song || 0) % SONGS.length;
    if (bgm.playing) return;
    bgm.playing = true; bgm.step = 0; bgm.next = c.currentTime + 0.1;
    clearInterval(bgm.timer); bgm.timer = setInterval(bgmTick, 60);
  }
  function stopBgm() { bgm.playing = false; clearInterval(bgm.timer); }

  root.SNAudio = {
    play: function (k, a) { if (!on) return; try { if (SFX[k]) SFX[k](a); } catch (e) { /* むし */ } },
    unlock: function () { ac(); },
    setOn: function (v) { on = !!v; if (master) master.gain.value = on ? 0.8 : 0; },
    setBgm: function (v) { bgmOn = !!v; },
    isOn: function () { return on; },
    isBgm: function () { return bgmOn; },
    startBgm: startBgm,
    stopBgm: stopBgm
  };
})(this);
