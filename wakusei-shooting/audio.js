// =====================================================================
//  わくせい シューティング — おと（WebAudio の 合成音だけ。音声ファイルなし）
//
//  BGM は 8ぶおんぷ 1もじ の もじれつ。
//    mel / bass: 0〜9, a〜e = スケールの なんばんめ（0 が root）、'.' = やすみ、'-' = のばす
//    drum:       k = キック、s = スネア、h = ハイハット、'.' = なし
// =====================================================================
'use strict';
window.WKSnd = (() => {
  let ac = null, master, mus, sfx, echo, noise;
  let on = true, held = false;
  const last = {};

  function init() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain(); master.gain.value = on ? 0.9 : 0; master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.connect(master);
    mus = ac.createGain(); mus.gain.value = 0.42; mus.connect(comp);
    sfx = ac.createGain(); sfx.gain.value = 0.6; sfx.connect(comp);
    echo = ac.createDelay(1); echo.delayTime.value = 0.24;
    const fb = ac.createGain(); fb.gain.value = 0.3;
    const eg = ac.createGain(); eg.gain.value = 0.3;
    echo.connect(fb); fb.connect(echo); echo.connect(eg); eg.connect(mus);
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function resume() { if (init() && ac.state === 'suspended' && !held) ac.resume(); }
  function hold(v) { held = v; if (!ac) return; if (v) ac.suspend(); else ac.resume(); }
  function setOn(v) { on = v; if (ac) master.gain.setTargetAtTime(v ? 0.9 : 0, ac.currentTime, 0.02); }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function osc(type, f, t, dur, vol, dest, o = {}) {
    const g = ac.createGain();
    const s = ac.createOscillator(); s.type = type; s.frequency.setValueAtTime(f, t);
    if (o.to) s.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || dur));
    if (o.detune) s.detune.value = o.detune;
    let node = s;
    if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; fl.Q.value = o.q || 1; s.connect(fl); node = fl; }
    if (o.vib) {
      const l = ac.createOscillator(); l.frequency.value = o.vib;
      const lg = ac.createGain(); lg.gain.value = f * 0.012; l.connect(lg); lg.connect(s.frequency);
      l.start(t); l.stop(t + dur + 0.2);
    }
    node.connect(g); g.connect(dest);
    if (o.send) g.connect(o.send);
    const a = o.a || 0.005, rel = o.r || 0.05, sus = vol * (o.sus ?? 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setTargetAtTime(sus, t + a, o.d || 0.08);
    g.gain.setValueAtTime(sus, t + dur);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + rel);
    s.start(t); s.stop(t + dur + rel + 0.05);
    return s;
  }
  function nz(t, dur, vol, dest, type, freq, q = 1) {
    const src = ac.createBufferSource(); src.buffer = noise;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  // ---- こうかおん ----
  function play(name) {
    if (!ac || !on || held) return;
    const t = ac.currentTime;
    const gap = { shot: 0.085, hit: 0.05, pop: 0.04, laser: 0.16, graze: 0.1 }[name] || 0;
    if (gap && last[name] && t - last[name] < gap) return;
    last[name] = t;
    switch (name) {
      case 'shot': osc('square', 1500, t, 0.025, 0.022, sfx, { to: 1000, r: 0.02 }); break;
      case 'laser': osc('sawtooth', 900, t, 0.12, 0.02, sfx, { to: 1300, lp: 3000, r: 0.03 }); break;
      case 'hit': nz(t, 0.04, 0.07, sfx, 'highpass', 3000); break;
      case 'pop':
        osc('triangle', 300, t, 0.1, 0.18, sfx, { to: 80, r: 0.05 });
        nz(t, 0.18, 0.2, sfx, 'bandpass', 1100, 0.8); break;
      case 'crash':
        osc('sawtooth', 200, t, 0.35, 0.2, sfx, { to: 45, lp: 1100, r: 0.1 });
        nz(t, 0.6, 0.35, sfx, 'lowpass', 800); break;
      case 'power': [0, 4, 7, 12, 16, 19].forEach((k, i) => osc('square', mtof(72 + k), t + i * 0.045, 0.07, 0.08, sfx, { lp: 4500 })); break;
      case 'heart': [0, 7, 12].forEach((k, i) => osc('triangle', mtof(79 + k), t + i * 0.08, 0.12, 0.18, sfx)); break;
      case 'barrier': osc('sine', 300, t, 0.5, 0.2, sfx, { to: 1200, glide: 0.4, vib: 12 }); break;
      case 'bomb':
        osc('sawtooth', 70, t, 0.9, 0.3, sfx, { to: 35, glide: 0.9, lp: 600, r: 0.2 });
        nz(t, 1.2, 0.35, sfx, 'lowpass', 1200);
        osc('sine', 1200, t, 0.6, 0.12, sfx, { to: 200 }); break;
      case 'hurt': osc('square', 520, t, 0.35, 0.16, sfx, { to: 90, lp: 2500 }); nz(t, 0.3, 0.2, sfx, 'bandpass', 600); break;
      case 'shield': osc('triangle', 1200, t, 0.06, 0.08, sfx, { to: 1800 }); break;
      case 'warn':
        for (let i = 0; i < 6; i++) osc('sawtooth', i % 2 ? 660 : 880, t + i * 0.28, 0.26, 0.1, sfx, { lp: 2000, sus: 0.9 });
        break;
      case 'alert': osc('square', 990, t, 0.07, 0.06, sfx); osc('square', 990, t + 0.12, 0.07, 0.06, sfx); break;
      case 'boom':
        nz(t, 1.8, 0.5, sfx, 'lowpass', 400);
        osc('sine', 120, t, 1.3, 0.5, sfx, { to: 30, glide: 1.3 }); break;
      case 'start': [0, 7, 12, 19].forEach((k, i) => osc('square', mtof(64 + k), t + i * 0.09, 0.1, 0.1, sfx, { lp: 3500 })); break;
      case 'tap': osc('triangle', 880, t, 0.05, 0.12, sfx); break;
      case 'card': [0, 4, 7, 11, 14].forEach((k, i) => osc('triangle', mtof(76 + k), t + i * 0.1, 0.3, 0.14, sfx, { send: echo })); break;
    }
  }

  // ---- BGM ----
  const SC = {
    maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10],
    pen: [0, 2, 4, 7, 9], lyd: [0, 2, 4, 6, 7, 9, 11], whl: [0, 2, 4, 6, 8, 10],
    phr: [0, 1, 3, 5, 7, 8, 10], mix: [0, 2, 4, 5, 7, 9, 10], hm: [0, 2, 3, 5, 7, 8, 11],
  };
  // ステージ ごとに スケール・テンポ・おとの いろ を かえる
  const SONGS = {
    title:   { bpm: 112, root: 60, sc: 'maj', lead: 'triangle', bassW: 'triangle', vib: 5,
               mel:  '0.2.4.7-6.5.4.2.4-..3.2.1.2-....0.2.4.7-9.8.7.6.4.5.6.7---....',
               bass: '0...0...5...5...3...3...4...4...0...0...5...5...3...4...0...0...',
               drum: 'k...h...k.k.h...k...h...k.k.h...' },
    mercury: { bpm: 132, root: 62, sc: 'pen', lead: 'square', bassW: 'triangle', lp: 2600,
               mel:  '0.2.4.5.7.5.4.2.0.2.4.2.0---....4.5.7.9.7.5.4.2.0.2.4.5.4---....',
               bass: '0.0.0.0.3.3.3.3.2.2.2.2.4.4.4.4.',
               drum: 'k.h.s.h.k.h.s.hhk.h.s.h.k.kks.h.' },
    venus:   { bpm: 100, root: 57, sc: 'phr', lead: 'sawtooth', bassW: 'sawtooth', lp: 1500, vib: 6,
               mel:  '4---3-1-0---1---4---5-4-3---1-0-7---6-5-4---3-1-0---1-3-4-------',
               bass: '0.0..0.01.1..1.10.0..0.0.6.6.6.1.',
               drum: 'k...s..kk...s...k...s..kk.k.s.hh' },
    earth:   { bpm: 126, root: 65, sc: 'maj', lead: 'square', bassW: 'triangle', lp: 3200,
               mel:  '4.4.5.7-.7.6.5.4.2-..0.2.4.5.4.2.1-..4.4.5.7-.9.8.7.6.4-..5.6.7.6.5.4.2.1.0---',
               bass: '0...0.0.3...3.3.4...4.4.0...4.4.',
               drum: 'k.h.s.h.k.k.s.h.' },
    mars:    { bpm: 140, root: 57, sc: 'min', lead: 'sawtooth', bassW: 'square', lp: 2200,
               mel:  '0.0.2.3-.4.3.2.0-..6.5.4.3.2.4-..0.0.2.3-.4.5.6.7-.6.4.5.6.4---....',
               bass: '0.0.0.0.5.5.5.5.3.3.3.3.4.4.6.6.',
               drum: 'k.hks.h.k.hks.hh' },
    jupiter: { bpm: 112, root: 55, sc: 'dor', lead: 'square', bassW: 'sawtooth', lp: 1800, vib: 4,
               mel:  '0-2-3-4-5---4-3-2-3-4---2-1-0-----4-5-6-7-9---7-6-5-6-7---6-5-4-----',
               bass: '0.0.0.0.3.3.3.3.6.6.6.6.4.4.4.4.',
               drum: 'k..hk.s.k..hk.s.k..hk.s.k.khs.ss' },
    saturn:  { bpm: 118, root: 64, sc: 'lyd', lead: 'triangle', bassW: 'sine', vib: 5,
               mel:  '7.4.2.4.7.9.7.4.6.3.1.3.6.8.6.3.5.2.0.2.5.7.9.a.9---7---4---....',
               bass: '0...0...6...6...5...5...4...4...',
               drum: 'k...h.h.s...h.h.' },
    uranus:  { bpm: 120, root: 60, sc: 'whl', lead: 'square', bassW: 'triangle', lp: 2400,
               mel:  '0.1.2.3.4.3.2.1.0.2.4.2.0-..-5.4.3.2.1.2.3.4.5.6.7.6.5---....',
               bass: '0...3...0...3...2...5...2...5...',
               drum: 'k.h.h.s.k.h.h.s.k.h.k.s.h.hhs.h.' },
    neptune: { bpm: 124, root: 58, sc: 'min', lead: 'triangle', bassW: 'sawtooth', lp: 1600, vib: 6,
               mel:  '4.4.3.4.6.4.3.2.0.2.3.4.3---..4.4.3.4.7.6.4.3.2.3.4.2.0---..',
               bass: '0.0.0.0.5.5.5.5.2.2.2.2.4.4.4.4.',
               drum: 'k..sh.k.k..sh.hhk..sh.k.k.ksh.hs' },
    sun:     { bpm: 150, root: 62, sc: 'mix', lead: 'sawtooth', bassW: 'square', lp: 2800,
               mel:  '0.4.7.9-.7.6.4.2.4.5.6.4---..7.9.a.9.7.6.4.2.4.6.4.2.0---..',
               bass: '0.0.0.0.6.6.6.6.3.3.3.3.4.4.4.4.',
               drum: 'k.hks.hhk.hks.hhk.hks.hhk.kks.ss' },
    boss:    { bpm: 150, root: 57, sc: 'hm', lead: 'square', bassW: 'sawtooth', lp: 2600,
               mel:  '0.2.3.4.6.4.3.2.0.2.3.4.7---6-..0.2.3.4.6.7.9.7.6.4.3.2.0---....',
               bass: '0000000044444444555555554444444466666666',
               drum: 'k.hsk.hsk.hsk.ss' },
    lastboss:{ bpm: 160, root: 58, sc: 'hm', lead: 'sawtooth', bassW: 'square', lp: 3000, vib: 5,
               mel:  '7.6.4.6.7.9.7.4.3.4.6.4.3.2.0.-2.3.4.6.7.9.a.9.7.6.4.3.4---....',
               bass: '0.0.0.0.0.0.0.0.5.5.5.5.4.4.4.4.',
               drum: 'kkhsk.hskkhsk.ss' },
  };

  let song = null, songName = '', step = 0, nextT = 0, timer = 0;
  function note(sg, ch, oct) {
    const s = SC[sg.sc];
    const n = parseInt(ch, 16);
    return sg.root + oct * 12 + s[n % s.length] + 12 * Math.floor(n / s.length);
  }
  function len(str, i) { let k = 1; while (str[(i + k) % str.length] === '-' && k < 16) k++; return k; }
  function schedule() {
    if (!ac || !song) return;
    const st = 60 / song.bpm / 2;           // 8ぶおんぷ
    while (nextT < ac.currentTime + 0.15) {
      const t = nextT, sg = song;
      const m = sg.mel[step % sg.mel.length];
      if (m && m !== '.' && m !== '-') {
        osc(sg.lead, mtof(note(sg, m, 0)), t, st * len(sg.mel, step % sg.mel.length) * 0.92, 0.09, mus,
          { lp: sg.lp, vib: sg.vib, send: echo, sus: 0.5 });
      }
      const b = sg.bass[step % sg.bass.length];
      if (b && b !== '.' && b !== '-') osc(sg.bassW, mtof(note(sg, b, -2)), t, st * 0.9, 0.12, mus, { lp: 900, sus: 0.7 });
      for (let h = 0; h < 2; h++) {                      // ドラムは 16ぶ
        const dch = sg.drum[(step * 2 + h) % sg.drum.length], dt = t + h * st / 2;
        if (dch === 'k') { osc('sine', 150, dt, 0.12, 0.35, mus, { to: 45, glide: 0.12, r: 0.03 }); }
        else if (dch === 's') nz(dt, 0.13, 0.16, mus, 'bandpass', 1800, 0.7);
        else if (dch === 'h') nz(dt, 0.04, 0.06, mus, 'highpass', 7000);
      }
      nextT += st; step++;
    }
  }
  function music(name) {
    if (!init()) return;
    if (songName === name && song) return;
    song = SONGS[name] || null; songName = name; step = 0;
    nextT = ac.currentTime + 0.08;
    if (!timer) timer = setInterval(schedule, 30);
  }
  function stopMusic() { song = null; songName = ''; }

  return {
    init, resume, hold, setOn, play, music, stopMusic,
    isOn: () => on,
    get song() { return songName; },
    songNames: Object.keys(SONGS),
  };
})();
