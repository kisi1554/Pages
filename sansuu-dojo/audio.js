/* ============================================================
   さんすう どうじょう — おと（WebAudio の ごうせい おん だけ）と よみあげ
   ============================================================ */
(function (SD) {
  "use strict";
  var A = SD.audio = { sound: true, speech: true };
  var ac = null, noise = null;
  var ctx = function () {
    if (!ac) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { ac = new C(); } catch (e) { return null; } }
    if (ac.state === "suspended") ac.resume();
    return ac;
  };
  var tone = function (f, t, len, type, vol, f2) {
    var c = ctx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + len + 0.02);
  };
  var hiss = function (t, len, freq, vol, q) {
    var c = ctx(); if (!c) return;
    if (!noise) { noise = c.createBuffer(1, c.sampleRate, c.sampleRate); var d = noise.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var s = c.createBufferSource(); s.buffer = noise;
    var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = q || 1;
    var g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(bp); bp.connect(g); g.connect(c.destination); s.start(t); s.stop(t + len);
  };
  // たいこ の ドン
  var don = function (t, f, vol) { tone(f || 150, t, 0.5, "sine", vol || 0.7, (f || 150) * 0.45); hiss(t, 0.08, 900, 0.25, 0.8); };
  A.sfx = function (name) {
    if (!A.sound) return;
    var c = ctx(); if (!c) return;
    var t = c.currentTime;
    switch (name) {
      case "poko": tone(620, t, 0.09, "sine", 0.3, 900); break;
      case "poko2": tone(500, t, 0.09, "sine", 0.25, 330); break;
      case "tap": tone(880, t, 0.05, "triangle", 0.12); break;
      case "bu": tone(160, t, 0.18, "square", 0.06); break;
      case "jump": tone(400, t, 0.14, "triangle", 0.2, 900); break;
      case "tick": hiss(t, 0.03, 3000, 0.2, 4); break;
      case "swish": hiss(t, 0.25, 1500, 0.2, 0.7); break;
      case "pour": hiss(t, 0.3, 700, 0.15, 2); tone(700, t, 0.2, "sine", 0.06, 1100); break;
      case "kira": [1319, 1568, 2093].forEach(function (f, i) { tone(f, t + i * 0.07, 0.25, "triangle", 0.12); }); break;
      case "don": don(t); don(t + 0.16, 170, 0.5); break; // ドドン！
      case "ng": tone(330, t, 0.16, "triangle", 0.15); tone(262, t + 0.13, 0.25, "triangle", 0.15); break;
      case "stamp": don(t, 110, 0.6); hiss(t, 0.05, 2000, 0.2, 1); break;
      case "fanfare":
        don(t, 140, 0.6); don(t + 0.25, 140, 0.6);
        [[523, 0.45], [659, 0.6], [784, 0.75], [1047, 0.95], [784, 1.2], [1047, 1.35]].forEach(function (n) { tone(n[0], t + n[1], 0.38, "triangle", 0.2); tone(n[0] / 2, t + n[1], 0.38, "sine", 0.12); });
        don(t + 1.35, 120, 0.8);
        break;
    }
  };
  // よみあげ（おわる か、じかん ぎれ で すすむ）
  var voice = null;
  var pickVoice = function () {
    if (!("speechSynthesis" in window)) return;
    var vs = speechSynthesis.getVoices().filter(function (v) { return /^ja/i.test(v.lang); });
    voice = vs[0] || null;
  };
  if ("speechSynthesis" in window) { pickVoice(); try { speechSynthesis.addEventListener("voiceschanged", pickVoice); } catch (e) { /* ふるい ブラウザ */ } }
  A.stop = function () { try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) { /* なにもしない */ } };
  A.speak = function (text, min) {
    var plain = SD.say(text), est = Math.max(min || 1600, plain.length * 150) * SD.timeScale;
    return new Promise(function (res) {
      var done = false, fin = function () { if (!done) { done = true; res(); } };
      if (A.speech && "speechSynthesis" in window && SD.timeScale > 0) {
        try {
          A.stop();
          var u = new SpeechSynthesisUtterance(plain);
          u.lang = "ja-JP"; u.rate = 0.95; u.pitch = 1.1; if (voice) u.voice = voice;
          u.onend = function () { setTimeout(fin, 250); };
          u.onerror = fin;
          speechSynthesis.speak(u);
          setTimeout(fin, est + 4000); // とまっても すすむ
          return;
        } catch (e) { /* よみあげ なし で つづける */ }
      }
      setTimeout(fin, est);
    });
  };
})(window.SD);
