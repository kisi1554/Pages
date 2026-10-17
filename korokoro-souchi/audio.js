/* ============================================================
   ころころ そうち — こうかおん（WebAudio の ごうせいおん だけ）
   ころころ（はやさで おおきさが かわる）・カタン・ボヨン・チーン
   ゴールの おとは えらべる（ニャーン・ケロケロ・ぷぅ〜 など）
   ============================================================ */
(function (root) {
  "use strict";
  var ctx = null, master = null, on = true;
  var roll = null, last = {};

  function ac() {
    if (!on) return null;
    if (!ctx) {
      var C = root.AudioContext || root.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function noiseBuffer(c, sec) {
    var n = Math.floor(c.sampleRate * sec), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    var s = 12345;   // きまった たねの ノイズ
    for (var i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
    return b;
  }

  function tone(type, f0, f1, dur, vol, when) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }

  function burst(freq, q, dur, vol) {
    var c = ac(); if (!c) return;
    var t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuffer(c, dur + 0.05);
    f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }

  /* ---------- ゴールの おと（えらべる）---------- */
  // ひとつの おと: type, ふりはば, はじまり→おわりの たかさ, フィルター, ビブラート
  function voice(o) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (o.at || 0), d = o.dur;
    var osc = c.createOscillator(), g = c.createGain(), out = g;
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f[0], t);
    for (var i = 1; i < o.f.length; i++) osc.frequency.exponentialRampToValueAtTime(o.f[i], t + d * i / (o.f.length - 1));
    if (o.vib) {
      var l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = o.vib[0]; lg.gain.setValueAtTime(o.vib[1], t);
      if (o.vib[2] != null) lg.gain.linearRampToValueAtTime(o.vib[2], t + d);
      l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + d + 0.05);
    }
    var src = osc;
    if (o.am) {   // ぶるぶる（ケロケロ など）
      var amg = c.createGain(), al = c.createOscillator(), ald = c.createGain();
      amg.gain.value = 0.5; al.type = "square"; al.frequency.value = o.am; ald.gain.value = 0.5;
      al.connect(ald); ald.connect(amg.gain); osc.connect(amg); src = amg; al.start(t); al.stop(t + d + 0.05);
    }
    if (o.bp) { var f = c.createBiquadFilter(); f.type = o.bp[2] || "bandpass"; f.frequency.value = o.bp[0]; f.Q.value = o.bp[1]; src.connect(f); src = f; }
    var a = o.atk || 0.01;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol, t + a);
    if (o.hold) g.gain.setValueAtTime(o.vol, t + d * o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(g); out.connect(master); osc.start(t); osc.stop(t + d + 0.05);
  }
  function noiseHit(at, freq, dur, vol) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + at, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuffer(c, dur + 0.05); f.type = "lowpass"; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }

  var GOALS = [
    { id: "chiin", name: "チーン", e: "🔔" },
    { id: "nyan", name: "ニャーン", e: "🐱" },
    { id: "wan", name: "ワンワン", e: "🐶" },
    { id: "kero", name: "ケロケロ", e: "🐸" },
    { id: "piyo", name: "ピヨピヨ", e: "🐤" },
    { id: "puu", name: "ぷぅ〜", e: "💨" },
    { id: "boyoyon", name: "ボヨヨ〜ン", e: "🌀" },
    { id: "robo", name: "ピポパポ", e: "🤖" },
    { id: "don", name: "ドドーン", e: "🥁" },
    { id: "pappa", name: "パッパカパーン", e: "🎺" },
    { id: "random", name: "おまかせ", e: "🎲" }
  ];
  var goalIdx = 0;
  var GOAL_PLAY = {
    nyan: function () {
      voice({ type: "sawtooth", f: [520, 860, 700, 560], dur: 0.75, vol: 0.32, atk: 0.05, hold: 0.5, vib: [6, 25], bp: [1300, 2.5] });
      voice({ type: "sawtooth", f: [1040, 1720, 1400, 1120], dur: 0.75, vol: 0.08, atk: 0.05, hold: 0.5, bp: [2600, 3] });
    },
    wan: function () {
      [0, 0.28].forEach(function (at) {
        voice({ at: at, type: "square", f: [620, 330], dur: 0.17, vol: 0.3, atk: 0.01, bp: [850, 1.5] });
        noiseHit(at, 1200, 0.06, 0.12);
      });
    },
    kero: function () {
      [0, 0.26, 0.6, 0.86].forEach(function (at, i) {
        voice({ at: at, type: "sawtooth", f: [i % 2 ? 210 : 170, i % 2 ? 160 : 140], dur: 0.2, vol: 0.4, am: 34, bp: [700, 2] });
      });
    },
    piyo: function () {
      [0, 0.16, 0.32, 0.6, 0.76].forEach(function (at) { voice({ at: at, type: "sine", f: [2300, 3400, 2600], dur: 0.11, vol: 0.2, atk: 0.005 }); });
    },
    puu: function () {
      voice({ type: "sawtooth", f: [120, 95, 75], dur: 0.9, vol: 0.38, atk: 0.03, hold: 0.6, vib: [26, 22, 6], bp: [420, 1, "lowpass"] });
      voice({ at: 0.92, type: "sawtooth", f: [140, 90], dur: 0.12, vol: 0.25, vib: [30, 15], bp: [500, 1, "lowpass"] });
    },
    boyoyon: function () {
      voice({ type: "sine", f: [320, 260, 200], dur: 1.3, vol: 0.4, atk: 0.02, hold: 0.3, vib: [7, 140, 0] });
    },
    robo: function () {
      [880, 1320, 990, 1760, 1320, 2093].forEach(function (f, i) { voice({ at: i * 0.1, type: "square", f: [f, f], dur: 0.085, vol: 0.12, atk: 0.003, hold: 0.8 }); });
    },
    don: function () {
      [0, 0.18, 0.5].forEach(function (at, i) {
        voice({ at: at, type: "sine", f: [i === 2 ? 170 : 150, 45], dur: i === 2 ? 0.7 : 0.3, vol: i === 2 ? 0.7 : 0.5, atk: 0.003 });
        noiseHit(at, 500, 0.08, i === 2 ? 0.35 : 0.2);
      });
    },
    pappa: function () {
      [[523, 0, 0.13], [523, 0.15, 0.09], [659, 0.26, 0.09], [784, 0.38, 0.6]].forEach(function (n) {
        voice({ at: n[1], type: "sawtooth", f: [n[0], n[0]], dur: n[2], vol: 0.18, atk: 0.01, hold: 0.7, vib: n[2] > 0.3 ? [6, 8] : null, bp: [2200, 0.7, "lowpass"] });
      });
    }
  };

  function throttle(key, ms) {
    var now = Date.now();
    if (last[key] && now - last[key] < ms) return false;
    last[key] = now; return true;
  }

  var S = {
    get on() { return on; },
    set: function (v) { on = !!v; if (!on) S.roll(0); if (on) ac(); },
    unlock: function () { ac(); },
    // カタン（material: steel / rubber / wood）
    katan: function (material, v) {
      if (!on || !throttle("k" + material, 45)) return;
      v = Math.max(0.05, Math.min(1, v));
      if (material === "steel") { tone("triangle", 1250, 700, 0.12, 0.22 * v); burst(2600, 3, 0.06, 0.25 * v); }
      else if (material === "rubber") { tone("sine", 260, 120, 0.12, 0.3 * v); }
      else { tone("square", 820, 500, 0.05, 0.08 * v); burst(1500, 4, 0.05, 0.3 * v); }
    },
    boyon: function () {
      var c = ac(); if (!c || !throttle("boyon", 120)) return;
      var t = c.currentTime, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(520, t + 0.12); o.frequency.exponentialRampToValueAtTime(240, t + 0.4);
      lfo.frequency.value = 18; lg.gain.value = 30; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(g); g.connect(master); o.start(t); lfo.start(t); o.stop(t + 0.5); lfo.stop(t + 0.5);
    },
    GOALS: GOALS,
    setGoal: function (id) { for (var i = 0; i < GOALS.length; i++) if (GOALS[i].id === id) goalIdx = i; },
    goalId: function () { return GOALS[goalIdx].id; },
    // ゴールの おと を ならす。かえりちは ならした おとの { id, name, e }
    goal: function (id) {
      var g = GOALS[goalIdx];
      if (id) for (var i = 0; i < GOALS.length; i++) if (GOALS[i].id === id) g = GOALS[i];
      if (g.id === "random") g = GOALS[1 + Math.floor(Math.random() * (GOALS.length - 2))];
      if (on && ac()) { if (g.id === "chiin") S.chiin(); else GOAL_PLAY[g.id](); }
      return g;
    },
    chiin: function () {
      var c = ac(); if (!c) return;
      [[1318, 0.3, 2.4], [1318 * 2.76, 0.12, 1.4], [1318 * 5.4, 0.06, 0.8], [1318 * 0.5, 0.08, 1.8]].forEach(function (p) {
        var t = c.currentTime, o = c.createOscillator(), g = c.createGain();
        o.type = "sine"; o.frequency.value = p[0];
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p[1], t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + p[2] + 0.05);
      });
    },
    fanfare: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone("triangle", f, 0, 0.25, 0.18, 0.5 + i * 0.12); });
    },
    pop: function () { tone("sine", 500, 900, 0.09, 0.2); },
    click: function () { tone("triangle", 900, 0, 0.05, 0.12); },
    trash: function () { tone("sawtooth", 400, 90, 0.2, 0.1); },
    ng: function () { tone("square", 220, 160, 0.15, 0.08); },
    // ころころ（level 0〜1）
    roll: function (level) {
      if (!ctx) { if (!level) return; if (!ac()) return; }
      if (!roll) {
        if (!level || !on) return;
        var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = noiseBuffer(ctx, 2); s.loop = true;
        f.type = "lowpass"; f.frequency.value = 420; f2.type = "peaking"; f2.frequency.value = 160; f2.gain.value = 12;
        g.gain.value = 0;
        s.connect(f); f.connect(f2); f2.connect(g); g.connect(master); s.start();
        roll = { s: s, g: g, f: f };
      }
      var lv = on ? Math.max(0, Math.min(1, level)) : 0, t = ctx.currentTime;
      roll.g.gain.setTargetAtTime(lv * 0.5, t, 0.06);
      roll.f.frequency.setTargetAtTime(260 + lv * 600, t, 0.08);
    }
  };
  root.KoroSound = S;
})(typeof window !== "undefined" ? window : globalThis);
