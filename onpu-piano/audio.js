/* ============================================================
   おんぷ ピアノ — おと（WebAudio の ごうせいおん だけ）
   ミュートでも AudioContext の とけい は うごかす（リズムの はんてい に つかう）。
   ============================================================ */
(function (root) {
  "use strict";
  var M = root.OnpuMusic;
  var ctx = null, master = null, on = true;
  var voices = {};                   // なまえ → なっている こえ

  function ensure() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = on ? 0.75 : 0;
      master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  /** タップを みみで きいた じかんに そろえる（スピーカーの おくれ を ひく） */
  function heardNow() {
    if (!ctx) return 0;
    return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
  }

  function setOn(v) {
    on = !!v;
    if (master) master.gain.setTargetAtTime(on ? 0.75 : 0, ctx.currentTime, 0.02);
  }

  /** ピアノふう: 3つの オシレーター（ばいおん つき）＋ だんだん くらく なる フィルター ＋ げんすい */
  function voice(midi, when, vel) {
    var c = ensure();
    if (!c || !on) return null;
    var t = Math.max(when || 0, c.currentTime);
    var fr = M.freqOf(midi);
    var amp = 0.32 * (vel || 1);
    var env = c.createGain();
    var lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 0.6;
    lp.frequency.setValueAtTime(Math.min(fr * 9, 14000), t);
    lp.frequency.setTargetAtTime(Math.min(fr * 2.6, 9000), t + 0.02, 0.45);
    lp.connect(env); env.connect(master);

    // ひくい おとほど ながく ひびく
    var decay = 0.9 * Math.pow(261.6 / fr, 0.35);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(amp, t + 0.005);
    env.gain.setTargetAtTime(amp * 0.45, t + 0.006, 0.09);
    env.gain.setTargetAtTime(0.0001, t + 0.16, decay);

    var parts = [["triangle", 1, 0, 0.7], ["sine", 1, -5, 0.45], ["sine", 2, 4, 0.22], ["sine", 3, 0, 0.07], ["sine", 4.01, 0, 0.03]];
    var oscs = parts.map(function (p) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = p[0];
      o.frequency.value = fr * p[1];
      o.detune.value = p[2];
      g.gain.value = p[3];
      o.connect(g); g.connect(lp);
      o.start(t);
      o.stop(t + 5);
      return o;
    });
    // ハンマーの「コッ」（ごく みじかい）
    var h = c.createOscillator(), hg = c.createGain();
    h.type = "square"; h.frequency.value = fr * 6;
    hg.gain.setValueAtTime(amp * 0.05, t); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    h.connect(hg); hg.connect(lp); h.start(t); h.stop(t + 0.04);

    return {
      stop: function (at) {
        var s = Math.max(at || 0, c.currentTime);
        env.gain.cancelScheduledValues(s);
        env.gain.setTargetAtTime(0.0001, s, 0.07);
        oscs.forEach(function (o) { try { o.stop(s + 0.6); } catch (e) { /* もう とまって いる */ } });
      }
    };
  }

  /** けんばん を おした */
  function noteOn(name) {
    noteOff(name);
    var v = voice(M.midiOf(name), 0, 1);
    if (v) voices[name] = v;
  }

  /** けんばん を はなした */
  function noteOff(name) {
    var v = voices[name];
    if (v) { v.stop(0); delete voices[name]; }
  }

  /** when（AudioContext の じかん）から sec びょう ならす（おてほん・さいせい よう） */
  function play(name, sec, when) {
    var v = voice(M.midiOf(name), when, 0.95);
    if (v) v.stop((when || now()) + sec);
  }

  /** メトロノームの「カッ」。accent は つよい ほう */
  function click(when, accent) {
    var c = ensure();
    if (!c || !on) return;
    var t = Math.max(when || 0, c.currentTime);
    var o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.value = accent ? 1760 : 1250;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(accent ? 0.5 : 0.32, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.08);
  }

  /** タップの「ポン」（もくぎょ ふう） */
  function tock(when) {
    var c = ensure();
    if (!c || !on) return;
    var t = Math.max(when || 0, c.currentTime);
    var o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.08);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.45, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.14);
  }

  /** せいかい / ファンファーレ */
  function jingle(kind) {
    var c = ensure();
    if (!c || !on) return;
    var seq = kind === "clear" ? ["C5", "E5", "G5", "C6"] : ["G5", "C6"];
    var t = c.currentTime + 0.02;
    seq.forEach(function (n, i) { play(n, 0.25, t + i * 0.11); });
  }

  root.OnpuAudio = { ensure: ensure, now: now, heardNow: heardNow, setOn: setOn, isOn: function () { return on; },
    noteOn: noteOn, noteOff: noteOff, play: play, click: click, tock: tock, jingle: jingle };
})(this);
