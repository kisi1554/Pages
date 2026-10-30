/* ============================================================
   しゅつどう！ 119 — おと（WebAudio の ごうせいおん だけ）
   ・サイレン は ほんもの の ろくおん では なく、にせた ごうせいおん。
     こども が びっくり しない よう に おおきさ は ひかえめ（SIREN_VOL）。
   ・よみあげ は speechSynthesis。
   ============================================================ */
(function (root) {
  "use strict";

  var ctx = null, master = null;
  var opt = { sound: true, siren: true, voice: true };
  var SIREN_VOL = 0.045;

  function ac() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) { /* なにも しない */ } }
    return ctx;
  }

  function tone(f, t0, dur, type, vol, f2) {
    var c = ac(); if (!c || !opt.sound) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (t0 || 0);
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }

  var noiseBuf = null;
  function noise() {
    var c = ac(); if (!c) return null;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 1, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    return s;
  }

  var A = {
    opt: opt,
    unlock: function () { ac(); },
    pop: function () { tone(660, 0, 0.09, "sine", 0.14, 990); },
    ok: function () { tone(784, 0, 0.12, "triangle", 0.16); tone(1175, 0.1, 0.18, "triangle", 0.14); },
    soft: function () { tone(440, 0, 0.16, "sine", 0.1, 392); },
    star: function (i) { tone(880 + i * 220, 0, 0.22, "triangle", 0.15); },
    fanfare: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.12, 0.3, "triangle", 0.14); }); },
    key: function (n) { var f = [941, 697, 697, 697, 770, 770, 770, 852, 852, 852][n] || 800; tone(f, 0, 0.12, "sine", 0.08); tone(1336, 0, 0.12, "sine", 0.06); },
    // でんわ の ベル（リリリン）
    bell: function () {
      var c = ac(); if (!c || !opt.sound) return;
      for (var k = 0; k < 2; k++) for (var i = 0; i < 10; i++) tone(i % 2 ? 1300 : 1600, k * 0.55 + i * 0.04, 0.05, "square", 0.035);
    },
    // よびだし おん（プルル）
    ringback: function () { tone(400, 0, 0.9, "sine", 0.06); tone(416, 0, 0.9, "sine", 0.05); },
    // しゅつどう しれい の チャイム
    chime: function () { [659, 523, 784, 1047].forEach(function (f, i) { tone(f, i * 0.32, 0.6, "sine", 0.13); }); },
    // カンカン（しょうぼう の かね）
    kan: function () { tone(1700, 0, 0.25, "triangle", 0.06); tone(2550, 0, 0.18, "sine", 0.03); }
  };

  // ---- ホース の しゃー ----
  var hose = null;
  A.hose = function (on) {
    var c = ac(); if (!c) return;
    if (on && opt.sound && !hose) {
      var s = noise(), f = c.createBiquadFilter(), g = c.createGain();
      f.type = "bandpass"; f.frequency.value = 2600; f.Q.value = 0.7;
      g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.07, c.currentTime + 0.12);
      s.connect(f); f.connect(g); g.connect(master); s.start();
      hose = { s: s, g: g };
    } else if (!on && hose) {
      var h = hose; hose = null;
      h.g.gain.cancelScheduledValues(c.currentTime);
      h.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.05);
      setTimeout(function () { try { h.s.stop(); } catch (e) { /* もう とまって いる */ } }, 300);
    }
  };

  // ---- サイレン ----
  // fire: ゆっくり あがって さがる「ウーー」 / pipo: 960Hz と 770Hz を こうごに「ピーポー」
  // police: はやめ に あがりさがり「ウー ウー」 / police2: すこし たかい
  var siren = null;
  A.siren = function (type, on, vol) {
    var c = ac(); if (!c) return;
    if (siren && (!on || siren.type !== type)) {
      var s0 = siren; siren = null;
      s0.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.08);
      clearInterval(s0.iv);
      setTimeout(function () { s0.oscs.forEach(function (o) { try { o.stop(); } catch (e) { /* なし */ } }); }, 500);
    }
    if (!on || !opt.sound || !opt.siren || siren) return;
    var g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 2200;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.setTargetAtTime(SIREN_VOL * (vol == null ? 1 : vol), c.currentTime, 0.25);
    lp.connect(g); g.connect(master);
    var o = c.createOscillator(), o2 = c.createOscillator(), g2 = c.createGain();
    o.type = type === "pipo" ? "square" : "sawtooth"; o2.type = "sine";
    g2.gain.value = 0.6;
    o.connect(lp); o2.connect(g2); g2.connect(lp);
    var st = { type: type, g: g, oscs: [o, o2], iv: 0 };
    var t = c.currentTime;
    function sweep(lo, hi, up, down) {
      var now = c.currentTime;
      [o, o2].forEach(function (os, k) {
        var m = k ? 2 : 1;
        os.frequency.cancelScheduledValues(now);
        os.frequency.setValueAtTime(lo * m, now);
        os.frequency.linearRampToValueAtTime(hi * m, now + up);
        os.frequency.linearRampToValueAtTime(lo * m, now + up + down);
      });
    }
    if (type === "pipo") {
      var hi = true;
      o.frequency.setValueAtTime(960, t); o2.frequency.setValueAtTime(1920, t);
      st.iv = setInterval(function () {
        hi = !hi; var f = hi ? 960 : 770, n = c.currentTime;
        o.frequency.setValueAtTime(f, n); o2.frequency.setValueAtTime(f * 2, n);
      }, 650);
    } else if (type === "fire") {
      sweep(420, 980, 2.0, 1.4);
      st.iv = setInterval(function () { sweep(420, 980, 2.0, 1.4); A.kan(); }, 3500);
      A.kan();
    } else {
      var lo2 = type === "police2" ? 620 : 520, hi2 = type === "police2" ? 1250 : 1050;
      sweep(lo2, hi2, 0.9, 0.6);
      st.iv = setInterval(function () { sweep(lo2, hi2, 0.9, 0.6); }, 1500);
    }
    o.start(); o2.start();
    siren = st;
  };
  A.sirenVol = function (v) { var c = ac(); if (c && siren) siren.g.gain.setTargetAtTime(SIREN_VOL * v, c.currentTime, 0.2); };
  A.stopAll = function () { A.siren(null, false); A.hose(false); A.hush(); };

  // ---- よみあげ ----
  var jaVoice = null;
  function pickVoice() {
    if (!root.speechSynthesis) return;
    var vs = root.speechSynthesis.getVoices() || [];
    for (var i = 0; i < vs.length; i++) if (/^ja/i.test(vs[i].lang)) { jaVoice = vs[i]; break; }
  }
  if (root.speechSynthesis) { pickVoice(); try { root.speechSynthesis.onvoiceschanged = pickVoice; } catch (e) { /* なし */ } }
  A.say = function (text, pitch) {
    if (!opt.voice || !opt.sound || !root.speechSynthesis || !text) return;
    try {
      var u = new SpeechSynthesisUtterance(String(text).replace(/[（(][^）)]*[）)]/g, ""));
      u.lang = "ja-JP"; u.rate = 0.95; u.pitch = pitch || 1.05;
      if (jaVoice) u.voice = jaVoice;
      root.speechSynthesis.cancel();
      root.speechSynthesis.speak(u);
    } catch (e) { /* よみあげ できなくても あそべる */ }
  };
  A.hush = function () { try { if (root.speechSynthesis) root.speechSynthesis.cancel(); } catch (e) { /* なし */ } };

  root.S119_AUDIO = A;
})(window);
