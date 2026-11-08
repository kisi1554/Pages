/* ピクニック まもりたい — おと（WebAudio の 合成音 だけ。こうかおん・BGM それぞれ オン/オフ） */
(function (root) {
  "use strict";
  let ac = null, master = null, sfxOn = true, bgmOn = true, noiseBuf = null;
  let bgmTimer = null, bgmGain = null, nextT = 0, stepI = 0, playing = false;
  const last = {};

  function ctx() {
    try {
      if (!ac) {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain(); master.gain.value = 0.5;
        master.connect(ac.destination);
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  // おなじ おと を みじかい あいだ に かさねすぎない
  function gate(name, gap) {
    const now = Date.now();
    if (last[name] && now - last[name] < gap) return false;
    last[name] = now; return true;
  }

  function tone(f0, f1, dur, opt) {
    const a = ctx(); if (!a) return;
    opt = opt || {};
    const t = a.currentTime + (opt.delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = opt.type || "sine";
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    if (opt.vib) {
      const l = a.createOscillator(), lg = a.createGain();
      l.frequency.value = opt.vib; lg.gain.value = f0 * 0.03;
      l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05);
    }
    const v = opt.vol || 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (opt.att || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(opt.out || master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, opt) {
    const a = ctx(); if (!a) return;
    opt = opt || {};
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime + (opt.delay || 0);
    const s = a.createBufferSource(); s.buffer = noiseBuf;
    const f = a.createBiquadFilter(); f.type = opt.ftype || "bandpass";
    f.frequency.setValueAtTime(opt.f0 || 1000, t);
    if (opt.f1) f.frequency.exponentialRampToValueAtTime(opt.f1, t + dur);
    f.Q.value = opt.q || 1;
    const g = a.createGain();
    g.gain.setValueAtTime(opt.vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  const SFX = {
    tap() { tone(880, 990, 0.06, { type: "triangle", vol: 0.12 }); },
    place() { tone(520, 780, 0.09, { type: "triangle", vol: 0.2 }); tone(1040, 1040, 0.08, { type: "sine", vol: 0.1, delay: 0.06 }); },
    remove() { tone(700, 420, 0.12, { type: "triangle", vol: 0.15 }); },
    nope() { tone(300, 260, 0.14, { type: "square", vol: 0.07 }); },
    // うちわ の ぱたぱた
    fan() { if (!gate("fan", 180)) return; noise(0.07, { f0: 700, q: 0.8, vol: 0.18, ftype: "lowpass" }); noise(0.07, { f0: 600, q: 0.8, vol: 0.14, ftype: "lowpass", delay: 0.1 }); },
    umbrella() { if (!gate("umb", 200)) return; tone(420, 300, 0.12, { type: "sine", vol: 0.22 }); noise(0.08, { f0: 1500, q: 1.5, vol: 0.06 }); },
    crumb() { if (!gate("crumb", 250)) return; tone(1500, 1800, 0.05, { type: "sine", vol: 0.08 }); tone(1900, 2200, 0.05, { type: "sine", vol: 0.06, delay: 0.05 }); },
    // ふえ の ぴー
    whistle() { if (!gate("whis", 300)) return; tone(1760, 1900, 0.32, { type: "sine", vol: 0.14, vib: 14, att: 0.02 }); },
    water() { if (!gate("water", 300)) return; noise(0.35, { f0: 3000, f1: 1500, q: 0.6, vol: 0.12, ftype: "highpass" }); },
    // びっくり の「ぴゃっ」
    bikkuri() { if (!gate("bik", 60)) return; tone(700, 1500, 0.09, { type: "square", vol: 0.07 }); tone(1500, 1300, 0.07, { type: "triangle", vol: 0.1, delay: 0.08 }); },
    // コイン の ちゃりん
    coin() { if (!gate("coin", 70)) return; tone(1568, 1568, 0.09, { type: "triangle", vol: 0.12 }); tone(2093, 2093, 0.18, { type: "triangle", vol: 0.12, delay: 0.07 }); },
    steal() { tone(660, 330, 0.3, { type: "triangle", vol: 0.18 }); tone(500, 250, 0.3, { type: "sine", vol: 0.1, delay: 0.12 }); },
    wave() { [523, 659, 784].forEach((f, i) => tone(f, f, 0.14, { type: "square", vol: 0.07, delay: i * 0.1 })); },
    caw() { if (!gate("caw", 500)) return; noise(0.16, { f0: 900, q: 4, vol: 0.12 }); noise(0.16, { f0: 800, q: 4, vol: 0.1, delay: 0.22 }); },
    newcard() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.16, { type: "sine", vol: 0.12, delay: i * 0.08 })); },
    waveEnd() { [659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, { type: "triangle", vol: 0.15, delay: i * 0.12 })); },
    party() {
      const m = [523, 659, 784, 1047, 784, 1047, 1319];
      m.forEach((f, i) => tone(f, f, 0.2, { type: "triangle", vol: 0.16, delay: i * 0.11 }));
      noise(0.5, { f0: 4000, q: 0.5, vol: 0.05, ftype: "highpass", delay: 0.8 });
    },
  };
  function play(name) { if (!sfxOn || !SFX[name]) return; try { SFX[name](); } catch (e) { /* おと が でなくても あそべる */ } }

  /* ---------- ピクニック BGM（オリジナル。ハ長調 の かるい ワルツ ふう 3びょうし） ---------- */
  const N = (s) => { // "C5" → Hz
    const m = /^([A-G])(#?)(\d)$/.exec(s); if (!m) return 0;
    const i = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] ? 1 : 0) + (+m[3] - 4) * 12;
    return 440 * Math.pow(2, i / 12);
  };
  // 1こ = 8ぶおんぷ。"-" は のばす、"." は やすみ
  const MEL = ("E5 . G5 E5 C5 . D5 . E5 D5 C5 . G4 . A4 C5 E5 . D5 - - - . . " +
               "E5 . G5 E5 C5 . F5 . E5 D5 C5 . A4 . C5 D5 E5 . C5 - - - . . " +
               "A4 . C5 A4 F4 . G4 . A4 B4 C5 . E5 . D5 C5 D5 . G4 - - - . . " +
               "E5 . G5 A5 G5 . E5 . D5 E5 C5 . A4 . D5 . E5 D5 C5 - - - . .").split(" ");
  const BASS = ["C3", "G3", "G3", "C3", "G3", "G3", "A2", "E3", "E3", "G2", "D3", "D3",
                "C3", "G3", "G3", "F2", "C3", "C3", "F2", "C3", "C3", "G2", "D3", "D3",
                "F2", "C3", "C3", "F2", "C3", "C3", "A2", "E3", "E3", "G2", "D3", "D3",
                "C3", "G3", "G3", "A2", "E3", "E3", "F2", "G2", "G2", "C3", "G3", "C3"];
  const STEP = 0.2;
  function schedule() {
    const a = ctx(); if (!a || !playing) return;
    while (nextT < a.currentTime + 0.4) {
      const i = stepI % MEL.length;
      const n = MEL[i];
      if (n !== "." && n !== "-") {
        let len = 1; while (MEL[(i + len) % MEL.length] === "-") len++;
        tone(N(n), N(n), STEP * len * 0.95, { type: "triangle", vol: 0.09, out: bgmGain, delay: nextT - a.currentTime, att: 0.01 });
      }
      if (i % 2 === 0) {
        const b = BASS[(i / 2) % BASS.length];
        tone(N(b), N(b), STEP * 1.6, { type: "sine", vol: (i / 2) % 3 === 0 ? 0.14 : 0.07, out: bgmGain, delay: nextT - a.currentTime });
      }
      nextT += STEP; stepI++;
    }
  }
  function bgmStart() {
    if (!bgmOn || playing) return;
    const a = ctx(); if (!a) return;
    if (!bgmGain) { bgmGain = a.createGain(); bgmGain.gain.value = 0.6; bgmGain.connect(master); }
    playing = true; nextT = a.currentTime + 0.1; stepI = 0;
    bgmTimer = setInterval(schedule, 100);
    schedule();
  }
  function bgmStop() { playing = false; if (bgmTimer) clearInterval(bgmTimer); bgmTimer = null; }

  root.PMAudio = {
    play, unlock: ctx,
    get sfx() { return sfxOn; }, set sfx(v) { sfxOn = !!v; },
    get bgm() { return bgmOn; }, set bgm(v) { bgmOn = !!v; if (!bgmOn) bgmStop(); },
    bgmStart, bgmStop,
  };
})(typeof self !== "undefined" ? self : this);
