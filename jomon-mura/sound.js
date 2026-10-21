/* じょうもん むらの くらし — おと（WebAudio の ごうせいおんだけ。おんせい ファイルは つかわない） */

var SND = (function () {
  var ctx = null, noiseBuf = null;
  var se = true, bgm = false, bgmTimer = null, bgmStep = 0, nextT = 0;

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, t0, slideTo) {
    var c = ac(); if (!c) return;
    var t = t0 || c.currentTime;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, filterType, freq, vol, t0, attack, q) {
    var c = ac(); if (!c) return;
    var t = t0 || c.currentTime;
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = filterType; f.frequency.value = freq; f.Q.value = q || 1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(c.destination);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  var fx = {
    tap: function () { tone(660, 0.08, 'triangle', 0.15); },
    ok: function () { tone(523, 0.12, 'triangle', 0.18); var c = ac(); if (c) tone(784, 0.2, 'triangle', 0.18, c.currentTime + 0.1); },
    ng: function () { tone(220, 0.25, 'sawtooth', 0.08, 0, 140); },
    dig: function () { noise(0.12, 'lowpass', 600, 0.35); },
    // ひの ぱちぱち
    fire: function () {
      var c = ac(); if (!c) return;
      for (var i = 0; i < 7; i++) noise(0.03, 'highpass', 2500 + Math.random() * 2000, 0.25, c.currentTime + Math.random() * 0.6);
      noise(0.7, 'lowpass', 400, 0.08, 0, 0.1);
    },
    // どきを やく（ごうごう もえる）
    kiln: function () {
      var c = ac(); if (!c) return;
      noise(1.2, 'lowpass', 300, 0.25, 0, 0.2);
      for (var i = 0; i < 5; i++) noise(0.03, 'highpass', 3000, 0.18, c.currentTime + Math.random() * 1.0);
    },
    // なみ（ざざーん）
    wave: function () { noise(1.6, 'bandpass', 700, 0.3, 0, 0.6, 0.6); },
    // ゆみや（びゅん）
    bow: function () { tone(180, 0.15, 'triangle', 0.25, 0, 90); noise(0.25, 'bandpass', 1800, 0.15, 0, 0.01, 2); },
    splash: function () { noise(0.35, 'bandpass', 1200, 0.3); },
    win: function () {
      var c = ac(); if (!c) return;
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.25, 'triangle', 0.18, c.currentTime + i * 0.12); });
    }
  };

  // ===== BGM: たいこ と ふえ ふう =====
  // ふえの メロディ（あかるい 5おん音階。0 は やすみ）
  var MEL = [587, 659, 784, 880, 784, 659, 587, 0, 523, 587, 659, 587, 523, 440, 523, 0,
             587, 659, 784, 880, 1047, 880, 784, 0, 659, 784, 659, 587, 523, 587, 587, 0];
  var DRUM = [1, 0, 0, 1, 1, 0, 1, 0];
  function taiko(t, strong) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(strong ? 110 : 140, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.25);
    g.gain.setValueAtTime(strong ? 0.35 : 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.4);
    noise(0.05, 'lowpass', 900, strong ? 0.12 : 0.06, t);
  }
  function fue(f, t, dur) {
    var c = ac(); if (!c || !f) return;
    var o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.value = f;
    lfo.frequency.value = 5.5; lg.gain.value = f * 0.012;
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.05);
    g.gain.setValueAtTime(0.06, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    noise(dur, 'bandpass', f * 2, 0.01, t, 0.05, 4);  // いきの おと
  }
  var STEP = 0.32;
  function schedule() {
    var c = ac(); if (!c) return;
    if (nextT < c.currentTime) nextT = c.currentTime + 0.05;
    while (nextT < c.currentTime + 0.6) {
      var i = bgmStep % 32;
      if (DRUM[i % 8]) taiko(nextT, i % 8 === 0);
      if (i % 2 === 0) fue(MEL[(bgmStep / 2) % 32 | 0], nextT, STEP * 1.9);
      bgmStep++; nextT += STEP;
    }
  }
  function startBgm() {
    if (bgmTimer || !ac()) return;
    bgmStep = 0; nextT = 0;
    schedule(); bgmTimer = setInterval(schedule, 200);
  }
  function stopBgm() { clearInterval(bgmTimer); bgmTimer = null; }

  // キャラの なきごえ: みじかい「ぽぽぽ」。bark は いぬ
  function chirp(base, kind, n) {
    var c = ac(); if (!c || !se) return;
    for (var i = 0; i < n; i++) {
      var t = c.currentTime + i * 0.09, f = base * (1 + (Math.random() - 0.5) * 0.3);
      if (kind === 'bark') { tone(f * 0.5, 0.08, 'square', 0.06, t, f * 0.3); noise(0.05, 'bandpass', f, 0.08, t); }
      else tone(f, 0.07, 'sine', 0.12, t, f * 1.15);
    }
  }

  return {
    chirp: function (b, k, n) { try { chirp(b, k, n); } catch (e) {} },
    play: function (name) { if (se && fx[name]) { try { fx[name](); } catch (e) {} } },
    setSe: function (on) { se = on; },
    setBgm: function (on) { bgm = on; if (on) startBgm(); else stopBgm(); },
    unlock: function () { ac(); if (bgm) startBgm(); }
  };
})();
