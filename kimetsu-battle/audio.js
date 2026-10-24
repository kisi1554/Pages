/* ============================================================
   きめつバトル — おと（WebAudio の ごうせいおん だけ。おとの ファイルは ない）
   こうかおん: カーソル・けってい・きる・みず・ほのお・パンチ・カットイン・かいふく・びわ など
   BGM: わふうロック（ひずんだ ギター・ベース・ツーバス・たいこ・しゃみせんふうの はやびき）
     battle  … ふつうの たたかい（172 BPM）
     battle2 … さいごの たたかい（188 BPM・もっと はげしい）
     win     … かちの きょく
   メロディは ぜんぶ オリジナル（D の わふう マイナー: レ ミ ファ ラ シ♭）
   ============================================================ */
(function (root) {
  "use strict";
  var KB = root.KB = root.KB || {};
  var ctx = null, master = null, comp = null, sfxG = null, bgmG = null, noiseBuf = null, distCurve = null;
  var sfxOn = true, bgmOn = true;
  var bgm = { name: null, timer: 0, next: 0, step: 0, song: null };
  var BGM_VOL = 0.34;

  function ac() {
    if (!ctx) {
      var C = root.AudioContext || root.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
      comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
      master = ctx.createGain(); master.gain.value = 0.85; master.connect(comp);
      sfxG = ctx.createGain(); sfxG.gain.value = sfxOn ? 0.9 : 0; sfxG.connect(master);
      bgmG = ctx.createGain(); bgmG.gain.value = bgmOn ? BGM_VOL : 0; bgmG.connect(master);
    }
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) { /* むし */ } }
    return ctx;
  }

  function noise() {
    if (noiseBuf) return noiseBuf;
    var n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 4242;
    for (var i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
    return (noiseBuf = b);
  }
  // ギターの ひずみ
  function dist() {
    if (distCurve) return distCurve;
    var n = 2048, c = new Float32Array(n), k = 60;
    for (var i = 0; i < n; i++) { var x = i * 2 / n - 1; c[i] = (3 + k) * x * 20 * (Math.PI / 180) / (Math.PI + k * Math.abs(x)); }
    return (distCurve = c);
  }
  function mid(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  // ひとつの おと（なみの かたち・たかさ・ながさ・おおきさ・ピッチの へんか）
  function tone(out, t, type, f, dur, vol, f2, att) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (att || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  // ザッ・シュッ（ノイズ＋フィルタ）
  function hiss(out, t, dur, vol, ftype, f1, f2, q) {
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(); fl.type = ftype; fl.Q.value = q || 1;
    fl.frequency.setValueAtTime(f1, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  /* ---------- がっき ---------- */
  var INST = {
    // パワーコード（ね・5ど・オクターブ を ひずませる）。mute = みじかく きざむ
    guitar: function (t, root, dur, vol, mute) {
      var ws = ctx.createWaveShaper(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), pre = ctx.createGain();
      ws.curve = dist(); ws.oversample = "2x"; lp.type = "lowpass"; lp.frequency.value = mute ? 1400 : 3200; pre.gain.value = 1.8;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
      g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      pre.connect(ws); ws.connect(lp); lp.connect(g); g.connect(bgmG);
      [0, 7, 12].forEach(function (iv, i) {
        var o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = mid(root + iv); o.detune.value = (i - 1) * 6;
        o.connect(pre); o.start(t); o.stop(t + dur + 0.05);
      });
    },
    bass: function (t, n, dur, vol) {
      var o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = mid(n); lp.type = "lowpass"; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(240, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(lp); lp.connect(g); g.connect(bgmG); o.start(t); o.stop(t + dur + 0.05);
      tone(bgmG, t, "sine", mid(n - 12), dur, vol * 0.8);
    },
    // しゃみせんふう（はじく おと）
    pluck: function (t, n, dur, vol) {
      tone(bgmG, t, "square", mid(n), Math.min(dur, 0.35), vol * 0.55, mid(n) * 0.995, 0.002);
      tone(bgmG, t, "triangle", mid(n + 12), 0.12, vol * 0.35, null, 0.002);
      hiss(bgmG, t, 0.03, vol * 0.4, "highpass", 3000);
    },
    // ラッパの ような リード（ながく のばす メロディ）
    lead: function (t, n, dur, vol) {
      var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
      o1.type = "sawtooth"; o2.type = "square"; o1.frequency.value = mid(n); o2.frequency.value = mid(n); o2.detune.value = 8;
      vib.frequency.value = 6; vg.gain.value = 4; vib.connect(vg); vg.connect(o1.frequency); vg.connect(o2.frequency);
      lp.type = "lowpass"; lp.frequency.setValueAtTime(1200, t); lp.frequency.linearRampToValueAtTime(3800, t + 0.08);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.setValueAtTime(vol, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(bgmG);
      [o1, o2, vib].forEach(function (o) { o.start(t); o.stop(t + dur + 0.05); });
    },
    kick: function (t, vol) { tone(bgmG, t, "sine", 160, 0.16, vol, 40, 0.002); hiss(bgmG, t, 0.02, vol * 0.4, "lowpass", 3000); },
    snare: function (t, vol) { hiss(bgmG, t, 0.16, vol, "highpass", 1800); tone(bgmG, t, "triangle", 230, 0.08, vol * 0.6, 160); },
    hat: function (t, vol, open) { hiss(bgmG, t, open ? 0.18 : 0.035, vol, "highpass", 8000); },
    crash: function (t, vol) { hiss(bgmG, t, 1.2, vol, "highpass", 5000, 7000); },
    tom: function (t, n, vol) { tone(bgmG, t, "sine", mid(n), 0.25, vol, mid(n) * 0.6, 0.002); },
    taiko: function (t, vol) { tone(bgmG, t, "sine", 90, 0.45, vol, 45, 0.003); hiss(bgmG, t, 0.08, vol * 0.5, "lowpass", 600); }
  };

  /* ---------- きょく ----------
     1しょうせつ = 16ステップ（16ぶ おんぷ）。
     g: ギター（x=きざみ X=のばす .=やすみ）/ b: ベース（ギターに あわせる）
     k: キック / s: スネア / h: ハイハット（x とじ o ひらき）/ t: たいこ / c: シンバル（さいしょ）
     p: しゃみせん [ステップ, おと, ながさ] / l: リード [ステップ, おと, ながさ] */
  var D = 38, F = 41, G = 43, A = 45, Bb = 46, C = 48, E = 40;
  function bar(root, gp, dr, extra) { return Object.assign({ r: root, g: gp, k: dr[0], s: dr[1], h: dr[2] }, extra || {}); }
  var RIFF1 = "x.xxx.x.xx.xX...", RIFF2 = "x.xxx.xxx.x.X.x.", CHUG = "xxxxxxxxxxxxxxxx", HOLD = "X.......X.......";
  var DR_A = ["x..x..x.x..x.x..", "....x.......x...", "x.x.x.x.x.x.x.x."];
  var DR_B = ["x.x.x.x.x.x.x.x.", "....x.......x...", "xxxxxxxxxxxxxxxx"];
  var DR_BLAST = ["xxxxxxxxxxxxxxxx", "....x.......x..x", "x.x.x.x.x.x.x.x."];
  var DR_HALF = ["x.......x.x.....", "........x.......", "o...o...o...o..."];
  var DR_FILL = ["x.x.x.x.x.......", "....x.......xxxx", "x.x.x.x........."];
  // しゃみせんの はやびき（D の わふう マイナー）
  var P1 = [[0, 74, 1], [2, 69, 1], [3, 70, 1], [4, 74, 1], [6, 77, 1], [7, 76, 1], [8, 74, 2], [10, 70, 1], [11, 69, 1], [12, 65, 2], [14, 64, 2]];
  var P2 = [[0, 69, 1], [1, 70, 1], [2, 74, 1], [3, 76, 1], [4, 77, 2], [6, 76, 1], [7, 74, 1], [8, 76, 1], [9, 77, 1], [10, 81, 2], [12, 82, 1], [13, 81, 1], [14, 77, 1], [15, 76, 1]];
  var P3 = [[0, 62, 1], [1, 64, 1], [2, 65, 1], [3, 69, 1], [4, 70, 1], [5, 74, 1], [6, 76, 1], [7, 77, 1], [8, 81, 4], [12, 77, 2], [14, 76, 2]];
  var SONGS = {
    battle: {
      bpm: 172, loopFrom: 2,
      bars: [
        // イントロ: たいこと ギターの のばし
        bar(D, HOLD, ["........", "........", "................"], { t: "x..x..x.x.x.x.xx", c: 1 }),
        bar(D, "X.......xxxxxxxx", ["x.......xxxxxxxx", "............x.xx", "................"], { t: "x...x...x.x.xxxx" }),
        // A: リフ＋しゃみせん
        bar(D, RIFF1, DR_A, { c: 1, p: P1 }), bar(Bb - 12, RIFF1, DR_A, { p: P2 }), bar(C - 12, RIFF1, DR_A, { p: P1 }), bar(A - 12, RIFF2, DR_FILL, { p: P3 }),
        bar(D, RIFF1, DR_A, { c: 1, p: P1 }), bar(Bb - 12, RIFF1, DR_A, { p: P2 }), bar(C - 12, RIFF2, DR_A, { p: P3 }), bar(A - 12, CHUG, DR_FILL),
        // B: サビ（リードが うたう・ツーバス）
        bar(D, CHUG, DR_B, { c: 1, l: [[0, 74, 4], [4, 77, 2], [6, 79, 2], [8, 81, 6], [14, 79, 2]] }),
        bar(F - 12, CHUG, DR_B, { l: [[0, 77, 2], [2, 76, 2], [4, 74, 4], [8, 72, 4], [12, 69, 4]] }),
        bar(G - 12, CHUG, DR_B, { c: 1, l: [[0, 70, 4], [4, 74, 2], [6, 77, 2], [8, 79, 4], [12, 77, 2], [14, 79, 2]] }),
        bar(A - 12, CHUG, DR_BLAST, { l: [[0, 81, 8], [8, 82, 2], [10, 81, 2], [12, 76, 4]] }),
        bar(D, CHUG, DR_B, { c: 1, l: [[0, 74, 4], [4, 77, 2], [6, 79, 2], [8, 81, 6], [14, 84, 2]] }),
        bar(Bb - 12, CHUG, DR_B, { l: [[0, 82, 4], [4, 81, 2], [6, 79, 2], [8, 77, 4], [12, 76, 4]] }),
        bar(C - 12, CHUG, DR_BLAST, { c: 1, l: [[0, 76, 2], [2, 77, 2], [4, 79, 2], [6, 81, 2], [8, 84, 8]], p: P3 }),
        bar(A - 12, "X.......X.X.X.XX", DR_FILL, { l: [[0, 81, 8], [8, 73, 8]], t: "........x.x.xxxx" }),
        // C: おとしどころ（たいこ＋しゃみせん）→ もりあがり
        bar(D, HOLD, DR_HALF, { c: 1, p: P1, t: "x.....x.x......." }), bar(E - 12 + 12, "X.......X.......", DR_HALF, { p: P2, t: "x.....x.x......." }),
        bar(F - 12, "x.x.x.x.x.x.x.x.", DR_HALF, { p: P1, t: "x...x...x...x..." }), bar(A - 12, CHUG, DR_FILL, { p: P3, t: "x.x.x.x.xxxxxxxx" })
      ]
    },
    battle2: {
      bpm: 188, loopFrom: 0,
      bars: [
        bar(D, CHUG, DR_BLAST, { c: 1, p: P2, t: "x...x...x...x..." }), bar(Bb - 12, CHUG, DR_BLAST, { p: P1 }),
        bar(C - 12, CHUG, DR_BLAST, { p: P2 }), bar(A - 12, RIFF2, DR_FILL, { p: P3, t: "........xxxxxxxx" }),
        bar(D, CHUG, DR_BLAST, { c: 1, l: [[0, 81, 4], [4, 82, 2], [6, 81, 2], [8, 77, 4], [12, 79, 2], [14, 81, 2]] }),
        bar(Bb - 12, CHUG, DR_BLAST, { l: [[0, 82, 6], [6, 81, 2], [8, 77, 4], [12, 74, 4]] }),
        bar(G - 12, CHUG, DR_BLAST, { c: 1, l: [[0, 79, 4], [4, 81, 2], [6, 82, 2], [8, 84, 6], [14, 82, 2]] }),
        bar(A - 12, "X.X.X.X.XXXXXXXX", DR_FILL, { l: [[0, 81, 8], [8, 85, 8]], t: "x.x.x.x.xxxxxxxx" })
      ]
    },
    win: {
      bpm: 132, loopFrom: -1,
      bars: [
        bar(D, "X.....X.X.......", ["x.....x.x.......", "....x.......x...", "x.x.x.x.x.x.x.x."], { c: 1, l: [[0, 74, 2], [2, 77, 2], [4, 81, 2], [6, 79, 1], [7, 81, 1], [8, 86, 8]] }),
        bar(Bb - 12, "X.......X.......", ["x.......x.......", "....x.......x...", "x.x.x.x.x.x.x.x."], { l: [[0, 82, 4], [4, 84, 4], [8, 86, 8]] }),
        bar(D, "X...............", ["x...............", "................", "o..............."], { c: 1, l: [[0, 86, 16]], t: "x..............." })
      ]
    }
  };

  function schedule() {
    var s = bgm.song;
    if (!s || !ctx) return;
    var sd = 60 / s.bpm / 4;
    while (bgm.next < ctx.currentTime + 0.2) {
      var bi = Math.floor(bgm.step / 16), st = bgm.step % 16, t = bgm.next;
      if (bi >= s.bars.length) {
        if (s.loopFrom < 0) { stopBgm(); return; }
        bgm.step = s.loopFrom * 16; continue;
      }
      var B = s.bars[bi];
      if (st === 0 && B.c) INST.crash(t, 0.12);
      var gc = B.g.charAt(st);
      if (gc === "x") { INST.guitar(t, B.r + 12, sd * 0.9, 0.09, true); INST.bass(t, B.r, sd * 0.9, 0.14); }
      else if (gc === "X") { var len = 1; while (st + len < 16 && B.g.charAt(st + len) === ".") len++; INST.guitar(t, B.r + 12, sd * len, 0.1, false); INST.bass(t, B.r, sd * len, 0.14); }
      if (B.k && B.k.charAt(st) === "x") INST.kick(t, 0.5);
      if (B.s && B.s.charAt(st) === "x") INST.snare(t, 0.3);
      var hc = B.h && B.h.charAt(st);
      if (hc === "x") INST.hat(t, 0.06); else if (hc === "o") INST.hat(t, 0.08, true);
      if (B.t && B.t.charAt(st) === "x") INST.taiko(t, 0.45);
      if (B.p) B.p.forEach(function (n) { if (n[0] === st) INST.pluck(t, n[1], n[2] * sd, 0.16); });
      if (B.l) B.l.forEach(function (n) { if (n[0] === st) INST.lead(t, n[1], n[2] * sd, 0.07); });
      bgm.step++; bgm.next += sd;
    }
  }
  function playBgm(name) {
    if (!ac()) return;
    if (bgm.name === name) return;
    stopBgm();
    bgm.name = name; bgm.song = SONGS[name]; bgm.step = 0; bgm.next = ctx.currentTime + 0.08;
    schedule();
    bgm.timer = setInterval(schedule, 50);
  }
  function stopBgm() { clearInterval(bgm.timer); bgm.timer = 0; bgm.name = null; bgm.song = null; }

  /* ---------- こうかおん ---------- */
  var o = function () { return sfxG; };
  var SFX = {
    cursor: function (t) { tone(o(), t, "square", 1320, 0.05, 0.08); },
    ok: function (t) { tone(o(), t, "square", 880, 0.06, 0.1); tone(o(), t + 0.06, "square", 1320, 0.08, 0.1); },
    back: function (t) { tone(o(), t, "square", 660, 0.07, 0.08, 440); },
    ready: function (t) { tone(o(), t, "triangle", 1046, 0.08, 0.12); tone(o(), t + 0.07, "triangle", 1568, 0.1, 0.1); },
    slash: function (t) { hiss(o(), t, 0.18, 0.5, "bandpass", 6000, 1800, 2); tone(o(), t, "sawtooth", 2200, 0.08, 0.05, 900); },
    hit: function (t) { hiss(o(), t, 0.12, 0.6, "bandpass", 3000, 800, 1.5); tone(o(), t, "square", 180, 0.08, 0.2, 80); },
    water: function (t) { hiss(o(), t, 0.6, 0.5, "bandpass", 700, 3600, 1.5); hiss(o(), t + 0.05, 0.5, 0.3, "lowpass", 2600, 300); },
    waterHit: function (t) { hiss(o(), t, 0.35, 0.7, "bandpass", 1800, 500, 1.2); tone(o(), t, "sine", 220, 0.2, 0.3, 70); hiss(o(), t + 0.05, 0.4, 0.3, "highpass", 4000); },
    fire: function (t) { hiss(o(), t, 0.7, 0.6, "lowpass", 4000, 250); tone(o(), t, "sawtooth", 160, 0.5, 0.14, 50); },
    fireHit: function (t) { hiss(o(), t, 0.5, 0.8, "lowpass", 5000, 200); tone(o(), t, "sine", 140, 0.3, 0.45, 40); },
    punch: function (t) { tone(o(), t, "sine", 180, 0.2, 0.6, 40); hiss(o(), t, 0.12, 0.5, "lowpass", 2400, 200); },
    whoosh: function (t) { hiss(o(), t, 0.25, 0.4, "bandpass", 600, 3000, 2); },
    big: function (t) { tone(o(), t, "sine", 120, 0.7, 0.8, 25); hiss(o(), t, 0.8, 0.7, "lowpass", 3000, 80); tone(o(), t, "square", 60, 0.4, 0.15, 30); },
    miss: function (t) { hiss(o(), t, 0.22, 0.3, "highpass", 3000, 7000); },
    heal: function (t) { [784, 988, 1175, 1568].forEach(function (f, i) { tone(o(), t + i * 0.07, "triangle", f, 0.25, 0.12); }); },
    buff: function (t) { [523, 659, 784, 1046, 1318, 1568].forEach(function (f, i) { tone(o(), t + i * 0.06, "sine", f, 0.5, 0.1); }); hiss(o(), t, 1.0, 0.1, "highpass", 6000); },
    nagi: function (t) { tone(o(), t, "sine", 392, 1.6, 0.18); tone(o(), t + 0.1, "sine", 588, 1.5, 0.12); tone(o(), t + 0.2, "sine", 784, 1.3, 0.06); hiss(o(), t, 1.2, 0.15, "lowpass", 800, 200); },
    guard: function (t) { tone(o(), t, "square", 300, 0.1, 0.1); tone(o(), t + 0.05, "square", 450, 0.1, 0.08); },
    charge: function (t) { tone(o(), t, "sawtooth", 70, 1.3, 0.18, 500); hiss(o(), t, 1.3, 0.25, "bandpass", 300, 3000, 3); },
    limit: function (t) { [440, 554, 659, 880].forEach(function (f, i) { tone(o(), t + i * 0.05, "square", f, 0.12, 0.08); }); },
    // カットイン: シャキーン！
    cutin: function (t) { hiss(o(), t, 0.3, 0.5, "bandpass", 800, 6000, 3); tone(o(), t + 0.12, "triangle", 1760, 0.4, 0.12); tone(o(), t + 0.12, "triangle", 2637, 0.3, 0.06); },
    // おおきな カットイン: たいこ どーん＋シャキーン
    cutinBig: function (t) { tone(o(), t, "sine", 80, 0.8, 0.9, 35); hiss(o(), t, 0.4, 0.5, "lowpass", 900); hiss(o(), t + 0.1, 0.4, 0.5, "bandpass", 800, 7000, 3);
      [880, 1318, 1760].forEach(function (f, i) { tone(o(), t + 0.2 + i * 0.04, "triangle", f, 0.6, 0.1); }); },
    shuushiki: function (t) { for (var i = 0; i < 14; i++) { tone(o(), t + i * 0.06, "sine", 1800 + (i % 5) * 300, 0.25, 0.05); hiss(o(), t + i * 0.07, 0.15, 0.25, "bandpass", 2000 + i * 200, 800, 2); } tone(o(), t + 0.9, "sine", 100, 0.8, 0.8, 25); },
    biwa: function (t) { [220, 220, 330].forEach(function (f, i) { tone(o(), t + i * 0.16, "sawtooth", f, 0.7, 0.18, f * 0.98); tone(o(), t + i * 0.16, "triangle", f * 2, 0.4, 0.08); }); },
    down: function (t) { tone(o(), t, "triangle", 440, 0.5, 0.15, 110); },
    sparkle: function (t) { for (var i = 0; i < 8; i++) tone(o(), t + i * 0.09, "sine", 1200 + i * 180, 0.3, 0.06); }
  };

  KB.audio = {
    unlock: function () { ac(); },
    sfx: function (n) { if (!sfxOn || !ac() || !SFX[n]) return; try { SFX[n](ctx.currentTime + 0.01); } catch (e) { /* むし */ } },
    bgm: playBgm, stopBgm: stopBgm,
    setSfx: function (v) { sfxOn = v; if (sfxG) sfxG.gain.value = v ? 0.9 : 0; },
    setBgm: function (v) { bgmOn = v; if (bgmG) bgmG.gain.value = v ? BGM_VOL : 0; },
    get sfxOn() { return sfxOn; }, get bgmOn() { return bgmOn; }
  };
})(window);
