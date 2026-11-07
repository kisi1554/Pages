'use strict';
/*
 * こうじょう けんがく — 音（WebAudio で その ば で つくる。音声ファイル なし）
 *   Sound.unlock()        … さいしょ の タップ で よぶ
 *   Sound.sfx(name)       … goto（ベルトコンベア）/ guru / shakin / chin / pon / boo / puff / fire / kira / pi
 *   Sound.bgm(cfg) / stopBgm() … こうじょう ごと の ループ（cfg = line.bgm）
 *   Sound.setOn(b) / setBgm(b) … オン/オフ
 */
const Sound = (() => {
  let ctx = null, master = null, noiseBuf = null;
  let on = true, bgmOn = true, bgmCfg = null, bgmTimer = null, bgmStep = 0, bgmNext = 0, bgmGain = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    bgmGain = ctx.createGain(); bgmGain.gain.value = 0.16; bgmGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
    if (bgmCfg && bgmOn && !bgmTimer) startLoop();
  }
  function tone(freq, t0, dur, type, vol, freqEnd, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, vol, ftype, freq, freqEnd) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = ftype || 'lowpass';
    f.frequency.setValueAtTime(freq || 800, t0);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }

  function sfx(name) {
    if (!on || !ensure()) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'goto': // ごとごと
        for (let i = 0; i < 6; i++) { noise(t + i * 0.15, 0.09, 0.35, 'lowpass', 260); tone(70, t + i * 0.15, 0.08, 'square', 0.06); }
        break;
      case 'guru': tone(520, t, 0.07, 'triangle', 0.12, 700); break;
      case 'shakin':
        noise(t, 0.18, 0.3, 'highpass', 3000, 8000);
        tone(1800, t + 0.02, 0.22, 'sine', 0.12, 3200);
        break;
      case 'chin': // かんせい の ちーん
        tone(1568, t, 1.4, 'sine', 0.3); tone(3136, t, 0.9, 'sine', 0.08); tone(2093, t + 0.02, 1.1, 'sine', 0.1);
        break;
      case 'pon': tone(660, t, 0.12, 'sine', 0.25, 990); break;
      case 'step': [660, 880, 1320].forEach((f, i) => tone(f, t + i * 0.08, 0.2, 'triangle', 0.2)); break;
      case 'boo': tone(220, t, 0.25, 'triangle', 0.18, 170); break;
      case 'puff': noise(t, 0.25, 0.3, 'bandpass', 900, 400); break;
      case 'fire': noise(t, 0.5, 0.22, 'lowpass', 500, 1400); break;
      case 'kira': [1320, 1760, 2349, 2637].forEach((f, i) => tone(f, t + i * 0.06, 0.3, 'sine', 0.12)); break;
      case 'pi': tone(1200, t, 0.06, 'square', 0.06); break;
      case 'pata': noise(t, 0.07, 0.25, 'bandpass', 1800); break;
    }
  }

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function startLoop() {
    if (!ctx || !bgmCfg) return;
    bgmNext = ctx.currentTime + 0.1; bgmStep = 0;
    bgmTimer = setInterval(() => {
      if (!ctx || !bgmCfg) return;
      const spb = 60 / bgmCfg.bpm / 2; // 8ぶ おんぷ
      while (bgmNext < ctx.currentTime + 0.25) {
        const n = bgmCfg.notes[bgmStep % bgmCfg.notes.length];
        if (n != null) tone(mtof(bgmCfg.root + n), bgmNext, spb * 0.9, bgmCfg.wave, 0.5, null, bgmGain);
        if (bgmStep % 4 === 0) tone(mtof(bgmCfg.root - 12 + (bgmStep % 16 < 8 ? 0 : 5)), bgmNext, spb * 1.8, 'sine', 0.5, null, bgmGain);
        bgmNext += spb; bgmStep++;
      }
    }, 80);
  }
  function bgm(cfg) {
    stopBgm();
    bgmCfg = cfg;
    if (bgmOn && ensure() && ctx.state !== 'suspended') startLoop();
  }
  function stopBgm() { if (bgmTimer) clearInterval(bgmTimer); bgmTimer = null; }
  function setOn(b) { on = !!b; }
  function setBgm(b) {
    bgmOn = !!b;
    if (!bgmOn) stopBgm(); else if (bgmCfg && ctx && !bgmTimer) startLoop();
  }
  function clearBgm() { stopBgm(); bgmCfg = null; }
  return { unlock, sfx, bgm, stopBgm, clearBgm, setOn, setBgm, get on() { return on; }, get bgmOn() { return bgmOn; } };
})();
window.Sound = Sound;
