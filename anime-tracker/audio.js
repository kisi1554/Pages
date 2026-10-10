/* アニメ視聴管理 — 音（WebAudio の合成音のみ。音声ファイルは使わない） */
"use strict";

const Sound = (function () {
  const KEY = "anime-tracker-sound";
  let ctx = null;
  let on = true;
  try { on = localStorage.getItem(KEY) !== "off"; } catch (e) { /* 読めなければ オン */ }

  function ready() {
    if (!on) return null;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    } catch (e) {
      return null;
    }
  }

  function tone(freq, dur, type, vol, delay) {
    const c = ready();
    if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol == null ? 0.14 : vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    get enabled() { return on; },
    setEnabled(v) {
      on = !!v;
      try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) { /* 保存できなくても続ける */ }
      if (on) this.tap();
    },
    tap()    { tone(660, 0.08, "triangle", 0.12); },
    star(n)  { tone(523 * Math.pow(2, (n - 1) * 2 / 12), 0.12, "sine", 0.14); },
    unstar() { tone(330, 0.10, "triangle", 0.10); },
    status(key) {
      if (key === "completed") { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, "triangle", 0.13, i * 0.08)); }
      else if (key === "dropped") { tone(330, 0.14, "sine", 0.11); tone(247, 0.2, "sine", 0.1, 0.1); }
      else if (key === "watching") { tone(587, 0.1, "sine", 0.13); tone(880, 0.14, "sine", 0.13, 0.08); }
      else { tone(698, 0.1, "triangle", 0.12); }
    },
    ok() { tone(784, 0.12, "sine", 0.13); tone(1046, 0.18, "sine", 0.13, 0.1); },
    ng() { tone(300, 0.14, "sawtooth", 0.08); tone(220, 0.2, "sawtooth", 0.07, 0.1); },
  };
})();
