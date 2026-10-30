/* ============================================================
   おとの ふしぎ ラボ — おと（WebAudio の ごうせいおん だけ。おんせい ファイルは つかわない）
   すべての おと → bus → 音量（上限 OtoPhys.MAX_GAIN）→ コンプレッサー（リミッター）→ スピーカー
   ============================================================ */
(function (root) {
  "use strict";
  var P = root.OtoPhys;
  var ctx = null, bus = null, vol = null, comp = null, on = true, volume = 0.5, noiseB = null, brownB = null;

  function ac() {
    if (!on) return null;
    if (!ctx) {
      var Ctor = root.AudioContext || root.webkitAudioContext;
      if (!Ctor) return null;
      try { ctx = new Ctor(); } catch (e) { return null; }
      vol = ctx.createGain(); vol.gain.value = P.volumeGain(volume);
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10; comp.knee.value = 4; comp.ratio.value = 20;
      comp.attack.value = 0.002; comp.release.value = 0.15;
      vol.connect(comp); comp.connect(ctx.destination);
      newBus();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function newBus() { bus = ctx.createGain(); bus.connect(vol); }
  // いま なっている おとを ぜんぶ とめる（じっけんを かえた とき）
  function stopAll() {
    if (!ctx || !bus) return;
    var old = bus, t = ctx.currentTime;
    old.gain.setTargetAtTime(0, t, 0.02);
    setTimeout(function () { try { old.disconnect(); } catch (e) { /* もう はずれている */ } }, 200);
    newBus();
  }

  function noise(c) {
    if (noiseB) return noiseB;
    var n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (noiseB = b);
  }
  // ブラウンノイズ（かみなりの ゴロゴロ）
  function brown(c) {
    if (brownB) return brownB;
    var n = c.sampleRate * 5, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    return (brownB = b);
  }
  function env(g, t, peak, a, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function out(dest) { return dest || bus; }

  function tone(type, f0, f1, dur, v, when, dest) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, v, 0.01, dur);
    o.connect(g); g.connect(out(dest)); o.start(t); o.stop(t + dur + 0.05);
  }

  // ---- わゴム: カープラス・ストロング（ほんとうに ふるえる げん を けいさんする）----
  // かえりちは { stop() }（ゆびで とめる）
  function pluck(freq, amp) {
    var c = ac(); if (!c) return null;
    var sr = c.sampleRate, len = Math.floor(sr * 2.2), b = c.createBuffer(1, len, sr), d = b.getChannelData(0);
    var N = Math.max(2, Math.round(sr / freq - 0.5)), bright = 0.35 + 0.6 * amp, i, prev = 0;
    for (i = 0; i < N; i++) { var r = Math.random() * 2 - 1; prev = prev + bright * (r - prev); d[i] = prev; }
    for (i = N; i < len; i++) d[i] = 0.996 * 0.5 * (d[i - N] + d[i - N - 1 < 0 ? 0 : i - N - 1]);
    var s = c.createBufferSource(), g = c.createGain(), t = c.currentTime;
    s.buffer = b; g.gain.setValueAtTime(0.25 + 0.75 * amp, t);
    s.connect(g); g.connect(bus); s.start(t);
    return { stop: function () { var n = c.currentTime; g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0, n, 0.015); try { s.stop(n + 0.2); } catch (e) { /* もう とまった */ } } };
  }

  // ---- たいこ ----
  function drum(amp) {
    var c = ac(); if (!c) return null;
    var t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(62, t + 0.5);
    env(g, t, 0.15 + 0.85 * amp, 0.005, 1.1);
    var s = c.createBufferSource(), f = c.createBiquadFilter(), ng = c.createGain();
    s.buffer = noise(c); f.type = "bandpass"; f.frequency.value = 260; f.Q.value = 0.8;
    env(ng, t, 0.1 + 0.4 * amp, 0.002, 0.18);
    var all = c.createGain(); all.connect(bus);
    o.connect(g); g.connect(all); s.connect(f); f.connect(ng); ng.connect(all);
    o.start(t); o.stop(t + 1.2); s.start(t, Math.random(), 0.3);
    return { stop: function () { var n = c.currentTime; all.gain.setTargetAtTime(0, n, 0.012); } };
  }

  // ---- コップ: たたく（ガラスの ふるえ。ちょうわしない 倍音）／ ふく（空気の 柱）----
  function glass(freq) {
    var c = ac(); if (!c) return;
    var t = c.currentTime;
    [[1, 0.5, 2.6], [2.32, 0.12, 1.3], [4.25, 0.05, 0.6]].forEach(function (p) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = freq * p[0]; env(g, t, p[1], 0.003, p[2]);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + p[2] + 0.05);
    });
    tone("triangle", 3200, 0, 0.03, 0.08);
  }
  function blow(freq) {
    var c = ac(); if (!c) return;
    var t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noise(c); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 28;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1.6, t + 0.15);
    g.gain.setValueAtTime(1.6, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random(), 1);
    var o = c.createOscillator(), og = c.createGain();
    o.type = "sine"; o.frequency.value = freq;
    og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.12, t + 0.2);
    og.gain.setValueAtTime(0.12, t + 0.6); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    o.connect(og); og.connect(bus); o.start(t); o.stop(t + 1);
  }

  // ---- こえ（フォルマント ごうせい）: 「もしもし」「やっほー」----
  var VOW = { a: [800, 1200], i: [300, 2300], u: [320, 1300], e: [500, 1900], o: [500, 850] };
  var WORDS = {
    moshimoshi: [{ c: "m", v: "o", d: 0.16 }, { c: "sh", v: "i", d: 0.14 }, { c: "m", v: "o", d: 0.16 }, { c: "sh", v: "i", d: 0.2 }],
    yahho: [{ from: "i", v: "a", d: 0.2 }, { gap: 0.1 }, { c: "h", v: "o", d: 0.5 }],
    oi: [{ v: "o", d: 0.25 }, { v: "i", d: 0.3 }]
  };
  // opt: { when, gain, pitch, filter: "tinny"|"echo"|null }。かえりちは ながさ（びょう）
  function voice(word, opt) {
    opt = opt || {};
    var c = ac(); if (!c) return 0;
    var seq = WORDS[word] || WORDS.oi, t0 = c.currentTime + (opt.when || 0), t = t0 + 0.02, p0 = opt.pitch || 260;
    var src = c.createOscillator(), vg = c.createGain(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter();
    var g1 = c.createGain(), g2 = c.createGain(), mix = c.createGain(), dest = bus;
    src.type = "sawtooth"; vg.gain.value = 0.0001;
    f1.type = f2.type = "bandpass"; f1.Q.value = 6; f2.Q.value = 9; g1.gain.value = 1; g2.gain.value = 0.55;
    src.connect(vg); vg.connect(f1); vg.connect(f2); f1.connect(g1); f2.connect(g2); g1.connect(mix); g2.connect(mix);
    if (opt.filter === "tinny") {          // いとでんわ: かみコップ の キンキンした こえ
      var hp = c.createBiquadFilter(), pk = c.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 700; pk.type = "peaking"; pk.frequency.value = 2000; pk.gain.value = 9;
      mix.connect(hp); hp.connect(pk); pk.connect(dest);
    } else if (opt.filter === "echo") {    // やまびこ: とおくから かえって くる ぼんやり した こえ
      var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500;
      mix.connect(lp); lp.connect(dest);
    } else mix.connect(dest);
    mix.gain.value = (opt.gain == null ? 1 : opt.gain) * 1.4;
    var shG = c.createGain(); shG.connect(dest); shG.gain.value = (opt.gain == null ? 1 : opt.gain);
    src.frequency.setValueAtTime(p0, t);
    seq.forEach(function (s, k) {
      if (s.gap) { vg.gain.setTargetAtTime(0.0001, t, 0.01); t += s.gap; return; }
      var fv = VOW[s.v], fs = VOW[s.from || s.v];
      if (s.c === "sh" || s.c === "h") {
        var n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain(), cd = s.c === "sh" ? 0.09 : 0.06;
        n.buffer = noise(c); nf.type = s.c === "sh" ? "highpass" : "bandpass"; nf.frequency.value = s.c === "sh" ? 2600 : fv[1];
        env(ng, t, s.c === "sh" ? 0.25 : 0.18, 0.02, cd);
        n.connect(nf); nf.connect(ng); ng.connect(shG); n.start(t, Math.random(), cd + 0.05);
        vg.gain.setTargetAtTime(0.0001, t, 0.01); t += cd;
      }
      if (s.c === "m") { f1.frequency.setValueAtTime(260, t); f2.frequency.setValueAtTime(1000, t); vg.gain.setTargetAtTime(0.05, t, 0.01); t += 0.05; }
      f1.frequency.setValueAtTime(fs[0], t); f2.frequency.setValueAtTime(fs[1], t);
      f1.frequency.linearRampToValueAtTime(fv[0], t + 0.06); f2.frequency.linearRampToValueAtTime(fv[1], t + 0.06);
      vg.gain.setTargetAtTime(0.3, t, 0.015);
      // こえの たかさの ゆれ（さいごは さがる）
      src.frequency.setValueAtTime(p0 * (k === seq.length - 1 ? 1.05 : 1.12 - 0.04 * k), t);
      src.frequency.linearRampToValueAtTime(p0 * (k === seq.length - 1 ? 0.82 : 1.05), t + s.d);
      t += s.d;
    });
    vg.gain.setTargetAtTime(0.0001, t, 0.04);
    src.start(t0); src.stop(t + 0.4);
    return t + 0.2 - t0;
  }

  // ---- かみなり: ゴロゴロ（ちかいほど バリッ と はじまる）----
  function rumble(near, when) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (when || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = brown(c); f.type = "lowpass"; f.frequency.value = 220 + 500 * near;
    var peak = 0.5 + 0.5 * near;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.08 + 0.4 * (1 - near));
    for (var k = 1; k < 8; k++) g.gain.linearRampToValueAtTime(peak * (0.35 + 0.65 * Math.random()) * (1 - k / 9), t + 0.4 + k * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random() * 0.5, 4.4);
    if (near > 0.5) {
      var cr = c.createBufferSource(), cf = c.createBiquadFilter(), cg = c.createGain();
      cr.buffer = noise(c); cf.type = "highpass"; cf.frequency.value = 900; env(cg, t, 0.35 * near, 0.003, 0.35);
      cr.connect(cf); cf.connect(cg); cg.connect(bus); cr.start(t, Math.random(), 0.4);
    }
  }

  // ---- ベル（うちゅう・水の 中）。muffle: 水ごしで こもった おと ----
  function bell(v, muffle) {
    var c = ac(); if (!c) return;
    var t = c.currentTime, dest = bus;
    if (muffle) { var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.connect(bus); dest = lp; }
    [[1, 0.4, 1.6], [2.0, 0.16, 1.0], [3.0, 0.08, 0.6], [4.2, 0.05, 0.4]].forEach(function (p) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = 784 * p[0]; env(g, t, p[1] * v, 0.002, p[2]);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + p[2] + 0.05);
    });
  }

  // ---- なりつづける おと（なみの え）----
  function hold(freq, amp) {
    var c = ac(); if (!c) return null;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = "sine"; o.frequency.value = freq; g.gain.value = 0; g.gain.setTargetAtTime(0.5 * amp, t, 0.03);
    o.connect(g); g.connect(bus); o.start(t);
    return {
      set: function (f, a) { var n = c.currentTime; o.frequency.setTargetAtTime(f, n, 0.02); g.gain.setTargetAtTime(0.5 * a, n, 0.03); },
      stop: function () { var n = c.currentTime; g.gain.setTargetAtTime(0, n, 0.03); try { o.stop(n + 0.3); } catch (e) { /* もう とまった */ } }
    };
  }

  function ok() { tone("sine", 880, 0, 0.16, 0.25); tone("sine", 1319, 0, 0.32, 0.25, 0.12); }
  function pop() { tone("triangle", 620, 980, 0.09, 0.2); }
  function stamp() { tone("sine", 523, 0, 0.2, 0.25); tone("sine", 659, 0, 0.2, 0.25, 0.1); tone("sine", 784, 0, 0.45, 0.25, 0.2); }

  root.OtoAudio = {
    pluck: pluck, drum: drum, glass: glass, blow: blow, voice: voice, rumble: rumble, bell: bell, hold: hold,
    ok: ok, pop: pop, stamp: stamp, stopAll: stopAll,
    ctx: function () { return ac(); },
    get on() { return on; },
    set on(v) {
      on = !!v;
      if (!ctx) return;
      if (!on) { stopAll(); if (ctx.state === "running") ctx.suspend(); } else ctx.resume();
    },
    get volume() { return volume; },
    set volume(v) { volume = P.clamp(+v, 0, 1); if (vol) vol.gain.setTargetAtTime(P.volumeGain(volume), ctx.currentTime, 0.03); },
    unlock: function () { ac(); }
  };
})(this);
