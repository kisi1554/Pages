/* かんがえる ボードゲーム — こうかおん（WebAudio の ごうせい おん だけ） */
(function (root) {
  "use strict";
  var BD = root.BD = root.BD || { games: {} };
  var A = BD.audio = { on: true };
  var ac = null, noise = null;
  function ctx() {
    if (!A.on) return null;
    if (!ac) { var C = root.AudioContext || root.webkitAudioContext; if (!C) return null; try { ac = new C(); } catch (e) { return null; } }
    if (ac.state === "suspended") { try { ac.resume(); } catch (e) { /* むし */ } }
    return ac;
  }
  function tone(f, t, len, type, vol, f2) {
    var c = ctx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + len + 0.02);
  }
  function hiss(t, len, freq, vol, q) {
    var c = ctx(); if (!c) return;
    if (!noise) { noise = c.createBuffer(1, c.sampleRate, c.sampleRate); var d = noise.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var s = c.createBufferSource(); s.buffer = noise;
    var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = q || 1;
    var g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(bp); bp.connect(g); g.connect(c.destination); s.start(t); s.stop(t + len + 0.01);
  }
  function T() { var c = ctx(); return c ? c.currentTime + 0.01 : 0; }
  // パチッ（いし・コマ を おく）
  A.pachi = function () { var t = T(); if (!t) return; hiss(t, 0.05, 2600, 0.6, 2.5); tone(1700, t, 0.05, "triangle", 0.25, 900); tone(320, t, 0.08, "sine", 0.25, 180); };
  // くるっ（ひっくりかえす）n まい
  A.kuru = function (n) {
    var t = T(); if (!t) return;
    n = Math.min(n || 1, 8);
    for (var i = 0; i < n; i++) { tone(700 + i * 90, t + 0.12 + i * 0.05, 0.09, "sine", 0.12, 1300 + i * 90); hiss(t + 0.12 + i * 0.05, 0.04, 4000, 0.12, 3); }
  };
  // コトン（4つならべ で おちる）
  A.drop = function (rows) { var t = T(); if (!t) return; var d = 0.05 + (rows || 1) * 0.03; tone(260, t + d, 0.14, "triangle", 0.35, 140); hiss(t + d, 0.06, 1200, 0.4, 1.5); };
  // シュッ（せん を ひく）
  A.line = function () { var t = T(); if (!t) return; hiss(t, 0.12, 3000, 0.25, 0.7); tone(500, t, 0.08, "sine", 0.06, 900); };
  // はこ を とった
  A.take = function (n) { var t = T(); if (!t) return; for (var i = 0; i < Math.min(n || 1, 4); i++) { tone(880, t + i * 0.1, 0.12, "square", 0.08); tone(1320, t + i * 0.1 + 0.05, 0.14, "square", 0.07); } };
  A.tap = function () { var t = T(); if (!t) return; tone(900, t, 0.05, "sine", 0.08); };
  A.hint = function () { var t = T(); if (!t) return; [1047, 1319, 1568].forEach(function (f, i) { tone(f, t + i * 0.07, 0.25, "sine", 0.1); }); };
  A.pass = function () { var t = T(); if (!t) return; tone(520, t, 0.15, "sine", 0.12, 400); tone(400, t + 0.15, 0.2, "sine", 0.1, 330); };
  A.undo = function () { var t = T(); if (!t) return; tone(700, t, 0.12, "sine", 0.1, 450); };
  // ファンファーレ
  A.win = function () {
    var t = T(); if (!t) return;
    var mel = [[523, 0, 0.14], [659, 0.15, 0.14], [784, 0.3, 0.14], [1047, 0.45, 0.5], [784, 0.75, 0.14], [1047, 0.9, 0.7]];
    mel.forEach(function (n) { tone(n[0], t + n[1], n[2] + 0.05, "square", 0.08); tone(n[0] / 2, t + n[1], n[2] + 0.05, "triangle", 0.12); });
    [0.45, 0.9].forEach(function (d) { hiss(t + d, 0.3, 6000, 0.08, 0.5); });
  };
  A.lose = function () { var t = T(); if (!t) return; [494, 440, 392, 330].forEach(function (f, i) { tone(f, t + i * 0.22, 0.3, "triangle", 0.14); }); };
  A.draw = function () { var t = T(); if (!t) return; [523, 659, 523, 659].forEach(function (f, i) { tone(f, t + i * 0.16, 0.18, "sine", 0.12); }); };
  A.think = function () { var t = T(); if (!t) return; tone(330, t, 0.25, "sine", 0.04, 300); };
})(typeof globalThis !== "undefined" ? globalThis : this);
