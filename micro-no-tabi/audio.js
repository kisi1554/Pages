/* ミクロの たび：おと（WebAudio の ごうせいおん だけ）と よみあげ
   - ひゅーん: ズーム ちゅう。ちいさい せかい ほど たかい おと
   - ぽーん: だんに ついた とき
   - うちゅうの パッド: ちきゅうより そと で しずかに なる */
(function (root) {
  "use strict";
  let ctx = null, on = true, whoosh = null, wGain = null, pad = null, padGain = null, master = null;

  function ensure() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = on ? 1 : 0; master.connect(ctx.destination);
    whoosh = ctx.createOscillator(); whoosh.type = "triangle"; whoosh.frequency.value = 440;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800;
    wGain = ctx.createGain(); wGain.gain.value = 0;
    whoosh.connect(lp); lp.connect(wGain); wGain.connect(master); whoosh.start();
    padGain = ctx.createGain(); padGain.gain.value = 0; padGain.connect(master);
    pad = [110, 164.8, 220.5].map((f, i) => { const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f; o.detune.value = i * 4; o.connect(padGain); o.start(); return o; });
    return ctx;
  }

  function setOn(v) {
    on = !!v;
    if (master) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05);
    if (!on && root.speechSynthesis) try { root.speechSynthesis.cancel(); } catch (e) {}
  }

  // L: いまの すけーる（log10）、speed: 1びょう あたりの L の かわりかた
  function update(L, speed) {
    if (!ctx || !on) return;
    const t = ctx.currentTime;
    whoosh.frequency.setTargetAtTime(440 * Math.pow(2, -L / 9), t, 0.05);
    wGain.gain.setTargetAtTime(Math.min(0.09, Math.abs(speed) * 0.05), t, 0.06);
    padGain.gain.setTargetAtTime(L > 7 ? Math.min(0.035, (L - 7) * 0.012) : 0, t, 0.4);
  }

  function pon(L) {
    if (!ensure() || !on) return;
    const t = ctx.currentTime, f = 660 * Math.pow(2, -L / 18);
    for (const [k, d] of [[1, 0], [1.5, 0.09]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f * k;
      g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(0.18, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.6);
      o.connect(g); g.connect(master); o.start(t + d); o.stop(t + d + 0.65);
    }
  }
  function tone(seq) {
    if (!ensure() || !on) return;
    const t = ctx.currentTime;
    seq.forEach(([f, d, len], i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(0.07, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d + (len || 0.2));
      o.connect(g); g.connect(master); o.start(t + d); o.stop(t + d + (len || 0.2) + 0.05);
    });
  }
  const good = () => tone([[784, 0], [1047, 0.1, 0.35]]);
  const bad = () => tone([[220, 0, 0.25], [196, 0.15, 0.3]]);
  const fanfare = () => tone([[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36, 0.6]]);

  let jaVoice = null;
  function pick() { try { const vs = root.speechSynthesis.getVoices() || []; jaVoice = vs.find((v) => (v.lang || "").replace("_", "-").indexOf("ja") === 0) || null; } catch (e) {} }
  if (root.speechSynthesis) { pick(); try { root.speechSynthesis.addEventListener("voiceschanged", pick); } catch (e) {} }
  function say(text) {
    if (!on || !root.speechSynthesis || !root.SpeechSynthesisUtterance) return;
    try {
      root.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP"; u.rate = 0.95; u.pitch = 1.1;
      if (jaVoice) u.voice = jaVoice;
      root.speechSynthesis.speak(u);
    } catch (e) {}
  }

  root.MT_AUDIO = { ensure, setOn, isOn: () => on, update, pon, good, bad, fanfare, say };
})(window);
