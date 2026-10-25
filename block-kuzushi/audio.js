/* ============================================================
   ドカーン ブロックくずし — おと（WebAudio の ごうせいおん だけ）
   カン・コン（コンボで おとが あがる ペンタトニック）・ドカーン・アイテム・
   ボスの うなり・レーザー・ファンファーレ と BGM（ふつう／ボス）
   こうかおん は どうじに 14こ まで。おなじ おとの れんぞくは まびく
   ============================================================ */
(function (root) {
  "use strict";
  var ctx = null, master = null, sfxBus = null, bgmBus = null;
  var sfxOn = true, bgmOn = true;
  var voices = [], MAX_VOICES = 14, last = {}, noiseBuf = null;

  function ac() {
    if (!ctx) {
      var C = root.AudioContext || root.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0.8;
      var comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.connect(master);
      bgmBus = ctx.createGain(); bgmBus.gain.value = 0.32; bgmBus.connect(master);
      var len = ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      noiseBuf = buf;
    }
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) { /* むし */ } }
    return ctx;
  }

  // どうじに なっている こうかおんの かずを かぞえる。gap びょう いないの おなじ おとは ならさない
  function slot(name, dur, gap) {
    if (!sfxOn || !ac()) return false;
    var now = ctx.currentTime;
    if (gap && last[name] && now - last[name] < gap) return false;
    voices = voices.filter(function (t) { return t > now; });
    if (voices.length >= MAX_VOICES) return false;
    voices.push(now + dur); last[name] = now;
    return true;
  }

  function tone(f, dur, type, vol, opt) {
    opt = opt || {};
    var t = ctx.currentTime + (opt.at || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (opt.att || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(opt.bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, f0, f1, opt) {
    opt = opt || {};
    var t = ctx.currentTime + (opt.at || 0);
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    fl.type = opt.type || "lowpass"; fl.frequency.setValueAtTime(f0, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(opt.bus || sfxBus);
    s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }

  var PENTA = [0, 2, 4, 7, 9];
  function pent(i, base) { var o = Math.floor(i / 5); return (base || 523.25) * Math.pow(2, (PENTA[i % 5] + 12 * o) / 12); }

  var api = {
    unlock: function () { ac(); },
    setSfx: function (on) { sfxOn = !!on; },
    setBgm: function (on) { bgmOn = !!on; if (!on) api.stopBgm(); else if (want) api.bgm(want); },
    // カン: コンボ ごとに ドレミソラ と あがる（14だんで あたまうち）
    hit: function (combo) {
      if (!slot("hit", 0.15, 0.025)) return;
      var f = pent(Math.min(combo, 14));
      tone(f, 0.16, "triangle", 0.32);
      tone(f * 2, 0.07, "sine", 0.1);
    },
    // コン: かたい ブロック
    hard: function () {
      if (!slot("hard", 0.12, 0.03)) return;
      tone(330, 0.1, "square", 0.12, { to: 260 });
      noise(0.05, 0.15, 3000, 0, { type: "highpass" });
    },
    // ガン: こわれない かべ・ボスの かたい ところ
    clank: function () {
      if (!slot("clank", 0.12, 0.05)) return;
      tone(1250, 0.1, "square", 0.06); tone(1870, 0.08, "square", 0.04);
    },
    ice: function () {
      if (!slot("ice", 0.2, 0.04)) return;
      tone(2100, 0.18, "sine", 0.12, { to: 3200 }); tone(2800, 0.12, "sine", 0.06, { at: 0.04 });
    },
    wall: function () { if (slot("wall", 0.05, 0.06)) tone(980, 0.04, "sine", 0.06); },
    paddle: function () { if (slot("paddle", 0.1, 0.04)) tone(440, 0.09, "square", 0.08, { to: 560 }); },
    launch: function () { if (slot("launch", 0.15)) tone(660, 0.14, "triangle", 0.2, { to: 1320 }); },
    // ドカーン: おおきさ 1〜3
    boom: function (size) {
      size = size || 1;
      if (!slot("boom", 0.6, 0.07)) return;
      noise(0.35 + 0.15 * size, 0.5, 2200, 90);
      tone(140, 0.4 + 0.1 * size, "sine", 0.45, { to: 38 });
    },
    item: function () {
      if (!slot("item", 0.4)) return;
      [0, 4, 7, 12].forEach(function (s, i) { tone(784 * Math.pow(2, s / 12), 0.12, "square", 0.08, { at: i * 0.06 }); });
    },
    oneup: function () {
      if (!slot("oneup", 0.6)) return;
      [0, 4, 7, 12, 16, 19].forEach(function (s, i) { tone(659 * Math.pow(2, s / 12), 0.12, "triangle", 0.18, { at: i * 0.07 }); });
    },
    laser: function () { if (slot("laser", 0.09, 0.05)) tone(1500, 0.08, "square", 0.05, { to: 420 }); },
    bar: function () { if (slot("bar", 0.3)) tone(300, 0.25, "triangle", 0.25, { to: 900 }); },
    shrink: function () { if (slot("shrink", 0.25)) tone(520, 0.22, "sawtooth", 0.08, { to: 180 }); },
    combo: function (m) {
      if (!slot("combo", 0.3)) return;
      tone(pent(5 + Math.min(m, 9), 523.25), 0.22, "square", 0.08);
      tone(pent(7 + Math.min(m, 9), 523.25), 0.22, "square", 0.06, { at: 0.06 });
    },
    // ボスの うなり: ひくい のこぎりは を ゆらす
    growl: function () {
      if (!slot("growl", 0.7, 0.5)) return;
      var t = ctx.currentTime;
      var o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(85, t); o.frequency.linearRampToValueAtTime(60, t + 0.65);
      fl.type = "lowpass"; fl.frequency.value = 520;
      lfo.frequency.value = 11; lg.gain.value = 0.12; lfo.connect(lg); lg.connect(g.gain);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
      o.connect(fl); fl.connect(g); g.connect(sfxBus);
      o.start(t); lfo.start(t); o.stop(t + 0.7); lfo.stop(t + 0.7);
    },
    bossHit: function () {
      if (!slot("bossHit", 0.3, 0.06)) return;
      tone(220, 0.25, "square", 0.15, { to: 70 }); noise(0.15, 0.3, 1500, 200);
    },
    lose: function () {
      if (!slot("lose", 0.8)) return;
      tone(660, 0.7, "triangle", 0.22, { to: 140 });
    },
    clear: function () {
      if (!slot("clear", 1.2)) return;
      [[0, 0], [4, 0.12], [7, 0.24], [12, 0.36], [7, 0.52], [12, 0.64]].forEach(function (p) {
        tone(523.25 * Math.pow(2, p[0] / 12), p[1] > 0.6 ? 0.5 : 0.16, "square", 0.1, { at: p[1] });
        tone(261.6 * Math.pow(2, p[0] / 12), 0.16, "triangle", 0.12, { at: p[1] });
      });
    },
    over: function () {
      if (!slot("over", 1.4)) return;
      [7, 4, 0, -5].forEach(function (s, i) { tone(392 * Math.pow(2, s / 12), 0.3, "triangle", 0.2, { at: i * 0.25 }); });
    }
  };

  // ---------- BGM（さきよみ スケジューラ） ----------
  var SONGS = {
    main: { step: 0.2, root: 261.63,
      chords: [0, -3, 5, 7],
      lead: [12, null, 16, 19, 21, 19, 16, null, 14, null, 16, 14, 12, null, 7, null,
             9, null, 12, 14, 16, 14, 12, null, 11, null, 12, 14, 12, null, null, null] },
    boss: { step: 0.16, root: 220,
      chords: [0, 5, 3, -2],
      lead: [12, null, 12, 15, null, 12, 19, null, 17, null, 15, 14, null, 12, 10, null,
             12, null, 12, 15, null, 17, 19, null, 22, null, 19, 17, null, 15, 14, null] }
  };
  var want = null, timer = null, nextT = 0, stepI = 0;
  function sched() {
    if (!ctx || !want) return;
    var s = SONGS[want];
    while (nextT < ctx.currentTime + 0.25) {
      var at = nextT - ctx.currentTime, i = stepI % 32;
      var ch = s.chords[Math.floor(i / 8)];
      var bass = s.root / 2 * Math.pow(2, (ch + (i % 2 ? 12 : 0)) / 12);
      tone(bass, s.step * 0.9, "triangle", 0.35, { at: at, bus: bgmBus });
      if (s.lead[i] !== null) tone(s.root * Math.pow(2, s.lead[i] / 12), s.step * 1.6, "square", 0.08, { at: at, bus: bgmBus, att: 0.01 });
      if (i % 4 === 0) tone(110, 0.12, "sine", 0.4, { at: at, to: 45, bus: bgmBus });
      if (i % 2 === 1) noise(0.04, 0.06, 7000, 0, { at: at, type: "highpass", bus: bgmBus });
      nextT += s.step; stepI++;
    }
  }
  api.bgm = function (name) {
    want = name;
    if (!bgmOn || !ac()) return;
    if (timer) clearInterval(timer);
    nextT = ctx.currentTime + 0.05; stepI = 0;
    timer = setInterval(sched, 60);
    sched();
  };
  api.stopBgm = function () { if (timer) clearInterval(timer); timer = null; };
  api.pauseBgm = function () { api.stopBgm(); };
  api.resumeBgm = function () { if (want && bgmOn && !timer) api.bgm(want); };
  api.forget = function () { want = null; api.stopBgm(); };

  root.BKSound = api;
})(window);
