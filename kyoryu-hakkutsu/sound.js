/* きょうりゅう はっくつ — おと（WebAudio の ごうせいおんだけ。おんせい ファイルは つかわない） */
var SND = (function () {
  'use strict';
  var ctx = null, noiseBuf = null, on = true, last = {};

  function ac() {
    if (!on) return null;
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function env(g, t, vol, a, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(freq, dur, type, vol, dt, slideTo) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (dt || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    env(g, t, vol || .2, .008, dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + .05);
  }
  function noise(dur, type, freq, vol, dt, attack, q) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (dt || 0);
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    env(g, t, vol, attack || .005, dur);
    s.connect(f); f.connect(g); g.connect(c.destination);
    s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }
  // おなじ おとを れんぱつ しすぎない
  function gate(k, ms) { var n = Date.now(); if (last[k] && n - last[k] < ms) return false; last[k] = n; return true; }

  var fx = {
    tap: function () { tone(660, .07, 'triangle', .12); },
    ok: function () { tone(523, .12, 'triangle', .16); tone(784, .2, 'triangle', .16, .1); },
    ng: function () { tone(240, .25, 'sawtooth', .07, 0, 150); },
    // ハケ「さっ さっ」
    brush: function () { if (!gate('b', 110)) return; noise(.09, 'highpass', 2600 + Math.random() * 1200, .12, 0, .02); },
    // ハンマー「こつん」
    hammer: function () { tone(1100, .035, 'square', .06); noise(.06, 'bandpass', 1800, .35, 0, .002, 3); tone(170, .09, 'sine', .25); },
    // いわが くだける
    rock: function () { noise(.3, 'lowpass', 900, .35); for (var i = 0; i < 5; i++) noise(.03, 'bandpass', 2000 + i * 300, .2, .03 + i * .04, .002, 4); },
    // かせきに ひび
    crack: function () { for (var i = 0; i < 4; i++) noise(.025, 'highpass', 3500, .3, i * .035, .001); tone(300, .25, 'sawtooth', .06, .1, 180); },
    // ルーペ
    loupe: function () { if (!gate('l', 400)) return; tone(1400, .08, 'sine', .05); tone(1900, .1, 'sine', .04, .06); },
    // ほねを もちあげる
    pick: function () { tone(500, .05, 'triangle', .1, 0, 700); },
    // ほねが はまる「かちっ」
    snap: function () { tone(1900, .03, 'square', .08); tone(2700, .05, 'square', .06, .03); noise(.03, 'highpass', 4000, .15); },
    fanfare: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i === 3 ? .5 : .16, 'triangle', .14, i * .13); }); },
    step: function (big) { if (!gate('s', 120)) return; tone(60 + (1 - big) * 120, .14, 'sine', .25 * (.4 + big * .6), 0, 40); noise(.08, 'lowpass', 300, .12 * big); },
    found: function () { [392, 523, 659].forEach(function (f, i) { tone(f, .18, 'triangle', .14, i * .1); }); },
    // なきごえ（ほんとうの こえは わかって いない。おおきい ほど ひくく）
    roar: function (big) {
      var c = ac(); if (!c) return;
      var t = c.currentTime;
      if (big < .3) { // ちいさい なかまは「ぴゅるる」
        [0, .22].forEach(function (d) { tone(700 + big * 400, .18, 'triangle', .1, d, 1100); tone(1000, .12, 'sine', .06, d + .14, 650); });
        return;
      }
      var f0 = 120 - big * 70, dur = 1.1 + big * .6;
      var o = c.createOscillator(), o2 = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain();
      var f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o2.type = 'square';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.linearRampToValueAtTime(f0 * 1.3, t + dur * .3);
      o.frequency.linearRampToValueAtTime(f0 * .75, t + dur);
      o2.frequency.setValueAtTime(f0 * .5, t);
      o2.frequency.linearRampToValueAtTime(f0 * .4, t + dur);
      lfo.frequency.value = 9; lg.gain.value = f0 * .06;
      lfo.connect(lg); lg.connect(o.frequency);
      f.type = 'lowpass'; f.frequency.setValueAtTime(350 + (1 - big) * 500, t); f.frequency.linearRampToValueAtTime(900, t + dur * .3); f.frequency.linearRampToValueAtTime(250, t + dur); f.Q.value = 4;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.28, t + .18); g.gain.setValueAtTime(.26, t + dur * .6); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(c.destination);
      [o, o2, lfo].forEach(function (x) { x.start(t); x.stop(t + dur + .05); });
      noise(dur * .9, 'bandpass', 260, .12, .05, .2, 1.5);
    }
  };

  return {
    play: function (name, arg) { try { if (on && fx[name]) fx[name](arg); } catch (e) {} },
    setOn: function (v) { on = !!v; if (on) ac(); },
    isOn: function () { return on; },
    unlock: function () { ac(); }
  };
})();
