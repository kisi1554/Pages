'use strict';
// おと（WebAudio の ごうせいおん だけ。おんせい ファイルは つかわない）
const Sound = (() => {
  let ctx = null, master = null, sfx = null, music = null, nb = null, on = true;
  let rumbleG = null, rumbleF = null, windG = null, bgmTimer = null, nextNote = 0, step = 0;
  try { on = localStorage.getItem('coaster-battle-sound') !== 'off'; } catch (e) { /* むし */ }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = on ? 0.9 : 0; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
    music = ctx.createGain(); music.gain.value = 0.22; music.connect(master);
    nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // ゴーッ（レールの おと）と ビューッ（かぜ）
    const mk = (type, f) => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(sfx); s.start(); return [g, fl]; };
    [rumbleG, rumbleF] = mk('lowpass', 120);
    [windG] = mk('bandpass', 1400);
  }
  const T = () => ctx.currentTime;
  function tone(f, dur, type, vol, f2, delay, dest) {
    if (!ctx) return;
    const t = T() + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfx); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, type, f, f2, delay, dest) {
    if (!ctx) return;
    const t = T() + (delay || 0), s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = nb; fl.type = type || 'lowpass'; fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || sfx); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  const api = {
    init,
    get on() { return on; },
    setOn(b) {
      on = b;
      try { localStorage.setItem('coaster-battle-sound', b ? 'on' : 'off'); } catch (e) { /* むし */ }
      if (master) master.gain.setTargetAtTime(b ? 0.9 : 0, T(), 0.03);
    },
    hit(p) { noise(0.1 + p * 0.12, 0.5 + p * 0.4, 'lowpass', 2600, 300); tone(200 + p * 40, 0.16 + p * 0.1, 'sine', 0.7, 45); if (p > 0.6) tone(90, 0.3, 'triangle', 0.5, 30); },
    guard() { tone(1200, 0.07, 'square', 0.12, 900); tone(1800, 0.09, 'triangle', 0.12, 1500, 0.02); noise(0.05, 0.2, 'highpass', 3000); },
    whoosh() { noise(0.16, 0.25, 'bandpass', 700, 2600); },
    jump() { tone(280, 0.13, 'square', 0.08, 640); },
    land() { noise(0.09, 0.3, 'lowpass', 500, 120); },
    thud() { noise(0.25, 0.6, 'lowpass', 900, 80); tone(120, 0.25, 'sine', 0.6, 35); },
    superStart() { tone(220, 0.5, 'sawtooth', 0.15, 1400); tone(330, 0.5, 'square', 0.08, 2100, 0.05); for (let i = 0; i < 6; i++) tone(1500 + i * 220, 0.08, 'triangle', 0.1, null, 0.08 * i); },
    boom() { noise(0.7, 0.9, 'lowpass', 1500, 60); tone(110, 0.6, 'sine', 0.8, 28); },
    beam() { tone(900, 0.5, 'sawtooth', 0.12, 200); tone(1300, 0.4, 'square', 0.06, 300); },
    ringout() { tone(900, 0.8, 'triangle', 0.18, 140); },
    balloon() { for (let i = 0; i < 4; i++) tone(600 + i * 150, 0.1, 'sine', 0.15, null, i * 0.07); },
    ko() { api.boom(); [784, 659, 523, 392].forEach((f, i) => tone(f, 0.25, 'square', 0.12, null, 0.25 + i * 0.16)); },
    bell() { [988, 1319].forEach((f, i) => tone(f, 0.5, 'triangle', 0.2, null, i * 0.12)); },
    fight() { [523, 659, 784, 1047].forEach((f) => tone(f, 0.5, 'square', 0.07)); noise(0.3, 0.3, 'highpass', 2000); },
    win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.22, 'square', 0.1, null, i * 0.13)); },
    lose() { [523, 466, 415, 392].forEach((f, i) => tone(f, 0.35, 'triangle', 0.15, null, i * 0.22)); },
    click() { tone(880, 0.06, 'square', 0.08); },
    clack() { noise(0.03, 0.25, 'highpass', 1800); tone(1600, 0.03, 'square', 0.05); },
    ride(v, tunnel) {
      if (!ctx) return;
      const k = Math.min(1, v / 30), t = T();
      rumbleG.gain.setTargetAtTime(0.06 + k * 0.32 * (tunnel ? 1.6 : 1), t, 0.1);
      rumbleF.frequency.setTargetAtTime(70 + v * 6, t, 0.1);
      windG.gain.setTargetAtTime(Math.max(0, (v - 8) / 25) * 0.16, t, 0.15);
    },
    quiet() { if (!ctx) return; rumbleG.gain.setTargetAtTime(0, T(), 0.2); windG.gain.setTargetAtTime(0, T(), 0.2); },
    bgm(play) {
      if (!ctx) return;
      if (!play) { clearInterval(bgmTimer); bgmTimer = null; return; }
      if (bgmTimer) return;
      nextNote = T() + 0.1; step = 0;
      bgmTimer = setInterval(schedule, 50);
    },
  };
  // ノリノリの ループ（150 BPM）
  const BASS = [45, 45, 57, 45, 43, 43, 55, 43, 41, 41, 53, 41, 43, 43, 55, 47];
  const LEAD = [69, 0, 72, 74, 76, 0, 74, 72, 69, 0, 67, 69, 72, 0, 71, 0, 69, 0, 72, 74, 76, 79, 76, 74, 72, 0, 74, 72, 71, 0, 67, 0];
  const mf = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function schedule() {
    const spb = 60 / 150 / 2;
    while (nextNote < T() + 0.2) {
      const d = nextNote - T();
      const b = BASS[Math.floor(step / 2) % 16];
      if (step % 2 === 0) tone(mf(b), spb * 1.6, 'square', 0.18, null, d, music);
      const l = LEAD[step % 32];
      if (l && step >= 32) tone(mf(l), spb * 0.9, 'triangle', 0.22, null, d, music);
      if (step % 4 === 0) tone(150, 0.12, 'sine', 0.5, 40, d, music);
      if (step % 4 === 2) noise(0.08, 0.25, 'highpass', 4000, null, d, music);
      if (step % 8 === 4) noise(0.12, 0.35, 'bandpass', 1500, null, d, music);
      nextNote += spb; step = (step + 1) % 128;
    }
  }
  return api;
})();
