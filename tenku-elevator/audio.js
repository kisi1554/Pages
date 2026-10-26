"use strict";
/* てんくうエレベーター - おと（WebAudio の ごうせいおん だけ）と こえ（speechSynthesis） */
const SND = (() => {
  let ac = null, master = null, windGain = null, windFilter = null, bgmGain = null;
  let on = true, bgmOn = true, bgmZone = null, bgmTimer = 0, bgmStep = 0;

  function ctx() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ac = new AC();
      master = ac.createGain(); master.gain.value = .8; master.connect(ac.destination);
      // かぜ（ノイズ）
      const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      windFilter = ac.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 500; windFilter.Q.value = .7;
      windGain = ac.createGain(); windGain.gain.value = 0;
      src.connect(windFilter); windFilter.connect(windGain); windGain.connect(master); src.start();
      bgmGain = ac.createGain(); bgmGain.gain.value = .13; bgmGain.connect(master);
    } catch (e) { ac = null; }
    return ac;
  }
  function unlock() { const a = ctx(); if (a && a.state === 'suspended') a.resume().catch(() => {}); }

  function tone(freq, t0, dur, { type = 'sine', vol = .2, to = null, out = null, attack = .01 } = {}) {
    const a = ctx(); if (!a || !on) return;
    const t = a.currentTime + t0;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    o.connect(g); g.connect(out || master); o.start(t); o.stop(t + dur + .05);
  }
  function noise(t0, dur, { vol = .2, freq = 1200, q = 1, type = 'bandpass' } = {}) {
    const a = ctx(); if (!a || !on) return;
    const t = a.currentTime + t0, len = Math.ceil(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }

  const S = {
    unlock,
    set(v) { on = v; if (!on) { S.wind(0); S.bgm(null); } },
    setBgm(v) { bgmOn = v; if (!v) S.bgm(null); },
    get on() { return on; },
    beep() { tone(1320, 0, .09, { type: 'square', vol: .06 }); },
    bad() { tone(330, 0, .12, { type: 'square', vol: .06 }); tone(262, .12, .18, { type: 'square', vol: .06 }); },
    chime(up = true) {   // とうちゃく の チャイム（のぼり ピンポーン／くだり ポンピーン）
      const a = [784, 659], b = up ? a : [...a].reverse();
      tone(b[0], 0, 1.1, { type: 'sine', vol: .22 }); tone(b[0] * 2, 0, .6, { vol: .04 });
      tone(b[1], .45, 1.4, { type: 'sine', vol: .22 }); tone(b[1] * 2, .45, .7, { vol: .04 });
    },
    door(open = true) {
      noise(0, .9, { vol: .05, freq: open ? 300 : 260, q: .8, type: 'lowpass' });
      tone(open ? 110 : 120, 0, .8, { type: 'triangle', vol: .04, to: open ? 90 : 140 });
      if (!open) noise(.85, .08, { vol: .12, freq: 180, q: 1.5 });
    },
    drip() { const f = 900 + Math.random() * 700; tone(f, 0, .18, { vol: .08, to: f * 2.2 }); },
    bird() { const f = 2400 + Math.random() * 900; for (let i = 0; i < 3; i++) tone(f, i * .11, .08, { vol: .03, to: f * 1.4 }); },
    gull() { tone(1300, 0, .35, { type: 'triangle', vol: .04, to: 900 }); },
    card() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * .08, .3, { type: 'triangle', vol: .09 })); },
    ok() { tone(880, 0, .12, { type: 'triangle', vol: .1 }); tone(1320, .1, .25, { type: 'triangle', vol: .1 }); },
    ng() { tone(220, 0, .3, { type: 'sawtooth', vol: .04, to: 180 }); },
    pop() { tone(600, 0, .08, { vol: .08, to: 1200 }); },
    thunder() { noise(0, 1.5, { vol: .25, freq: 120, q: .5, type: 'lowpass' }); },
    /* かぜきり音: lv 0〜1 */
    wind(lv) {
      const a = ac; if (!a || !windGain) return;
      const v = on ? Math.min(.22, lv * .22) : 0;
      windGain.gain.setTargetAtTime(v, a.currentTime, .15);
      windFilter.frequency.setTargetAtTime(350 + lv * 1400, a.currentTime, .2);
    },
    /* ゾーンごとの BGM（ごうせいの ゆっくりした アルペジオ） */
    bgm(zone) {
      if (!on || !bgmOn) zone = null;
      if (zone === bgmZone) return;
      bgmZone = zone; clearInterval(bgmTimer); bgmTimer = 0;
      if (!zone || !ctx()) return;
      const B = BGM[zone] || BGM.machi;
      bgmStep = 0;
      bgmTimer = setInterval(() => {
        if (!on || !bgmOn || document.hidden) return;
        const i = bgmStep++;
        const note = B.notes[i % B.notes.length];
        if (note) tone(B.root * Math.pow(2, note / 12), 0, B.len, { type: B.type, vol: .5, out: bgmGain, attack: .03 });
        if (i % 8 === 0) tone(B.root / 2 * Math.pow(2, B.bass[(i / 8 | 0) % B.bass.length] / 12), 0, B.len * 4, { type: 'sine', vol: .35, out: bgmGain, attack: .1 });
      }, B.ms);
    },
  };
  // notes は ルートからの はんおん（0 は やすみ にしない ため null で やすみ）
  const BGM = {
    chiso:  { root: 196, ms: 520, len: 1.2, type: 'triangle', notes: [0, null, 7, null, 3, null, 10, 7], bass: [0, -2, -4, -2] },
    mizu:   { root: 294, ms: 380, len: .9, type: 'sine', notes: [0, 7, 12, 7, 3, 10, 15, null], bass: [0, 5, 3, -2] },
    chika:  { root: 262, ms: 300, len: .5, type: 'triangle', notes: [0, 4, 7, 4, 9, 7, 4, null], bass: [0, 5, 7, 5] },
    machi:  { root: 262, ms: 330, len: .6, type: 'triangle', notes: [0, 4, 7, 12, 9, 7, 4, 7], bass: [0, 5, 7, 0] },
    biru:   { root: 294, ms: 340, len: .7, type: 'triangle', notes: [0, 7, 9, 4, 7, 12, 9, null], bass: [0, -3, 5, 7] },
    tower:  { root: 330, ms: 360, len: .8, type: 'sine', notes: [0, 4, 7, 11, 12, 11, 7, 4], bass: [0, 5, -3, 7] },
    kumo:   { root: 349, ms: 420, len: 1.1, type: 'sine', notes: [0, null, 7, 9, null, 4, 7, null], bass: [0, -5, -3, 2] },
    kumoue: { root: 392, ms: 450, len: 1.4, type: 'sine', notes: [0, 7, 12, 14, 12, 7, 4, null], bass: [0, 5, 9, 7] },
    okujo:  { root: 392, ms: 400, len: 1.4, type: 'sine', notes: [0, 4, 7, 12, 16, 12, 7, 4], bass: [0, 5, 7, 0] },
  };
  return S;
})();

/* こえ: キャラごとに pitch・rate を かえる。オフ・つかえない ときは false */
const VOICE = (() => {
  let on = true, ja = null;
  const ok = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
  function pickVoice() {
    if (!ok()) return null;
    const vs = speechSynthesis.getVoices();
    ja = vs.find(v => /^ja/i.test(v.lang)) || null;
    return ja;
  }
  if (ok()) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  return {
    set(v) { on = v; if (!v && ok()) speechSynthesis.cancel(); },
    get on() { return on; },
    say(text, pitch = 1, rate = 1) {
      if (!on || !ok()) return false;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ja-JP'; if (ja) u.voice = ja;
        u.pitch = Math.max(0, Math.min(2, pitch)); u.rate = Math.max(.5, Math.min(1.6, rate * .95));
        speechSynthesis.speak(u);
        return true;
      } catch (e) { return false; }
    },
    stop() { if (ok()) speechSynthesis.cancel(); },
  };
})();
