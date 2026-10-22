"use strict";

/* こうかおん と よみあげ。音は WebAudio で その場で つくる（音声ファイルは つかわない） */
const Snd = (() => {
  let ac = null;
  let on = true;

  function ctx() {
    if (!on) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { ac = null; }
    return ac;
  }

  /* たん音。o = { type, vol, slide(おわりの 周波数), at(おくらせる びょう), attack, am(ふるえ Hz) } */
  function tone(freq, dur, o) {
    o = o || {};
    const a = ctx();
    if (!a) return;
    const t0 = a.currentTime + (o.at || 0);
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
    const v = o.vol == null ? 0.2 : o.vol;
    const atk = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + atk);
    g.gain.setValueAtTime(v, t0 + Math.max(atk, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let out = g;
    if (o.am) {                              // すずむし の「りーん」の ふるえ
      const m = a.createGain();
      const lfo = a.createOscillator();
      const lg = a.createGain();
      m.gain.value = 0.5; lg.gain.value = 0.5;
      lfo.frequency.value = o.am;
      lfo.connect(lg).connect(m.gain);
      g.connect(m); out = m;
      lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    osc.connect(g);
    out.connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* ノイズ（かぜ・せみ・パシッ）。o = { freq, q, filter, vol, at, slide, attack, am } */
  function noise(dur, o) {
    o = o || {};
    const a = ctx();
    if (!a) return;
    const t0 = a.currentTime + (o.at || 0);
    const n = Math.max(1, Math.floor(a.sampleRate * dur));
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1200, t0);
    if (o.slide) f.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur * 0.6);
    if (o.back) f.frequency.exponentialRampToValueAtTime(o.back, t0 + dur);
    f.Q.value = o.q || 1;
    const g = a.createGain();
    const v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + (o.attack || 0.005));
    g.gain.setValueAtTime(v, t0 + Math.max(o.attack || 0.005, dur * (o.hold || 0.2)));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let out = g;
    if (o.am) {                              // せみ の「じーー」の ふるえ
      const m = a.createGain();
      const lfo = a.createOscillator();
      const lg = a.createGain();
      m.gain.value = 0.5; lg.gain.value = 0.5;
      lfo.type = 'square';
      lfo.frequency.value = o.am;
      lfo.connect(lg).connect(m.gain);
      g.connect(m); out = m;
      lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    src.connect(f).connect(g);
    out.connect(a.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /* きせつ の 音 */
  const season = {
    // うぐいす「ほー ほけきょ」
    h() {
      tone(1250, 0.75, { vol: 0.16, attack: 0.08, slide: 1350 });
      tone(1500, 0.12, { at: 0.85, vol: 0.16, slide: 2100 });
      tone(2300, 0.1, { at: 0.99, vol: 0.16, slide: 2600 });
      tone(2600, 0.22, { at: 1.12, vol: 0.15, slide: 1700 });
    },
    // せみ「みーん みーん」
    n() {
      noise(0.55, { freq: 4200, q: 4, vol: 0.28, am: 38, attack: 0.05, hold: 0.7 });
      noise(0.55, { freq: 4600, q: 4, vol: 0.28, am: 38, attack: 0.05, hold: 0.7, at: 0.62 });
      tone(900, 0.5, { vol: 0.05, am: 38, at: 0.05 });
    },
    // すずむし「りーん りーん」
    a() {
      tone(4200, 0.5, { vol: 0.1, am: 32, attack: 0.03 });
      tone(4200, 0.5, { vol: 0.1, am: 32, attack: 0.03, at: 0.65 });
    },
    // ふゆの かぜ「ぴゅうう」
    f() {
      noise(1.3, { freq: 400, slide: 1100, back: 350, q: 6, vol: 0.32, attack: 0.35, hold: 0.5 });
      noise(1.0, { freq: 700, slide: 1500, back: 600, q: 8, vol: 0.12, attack: 0.3, hold: 0.5, at: 0.2 });
    },
    // しんねん「ちゃんちゃん」（ことの ような 音）
    s() {
      tone(784, 0.3, { type: 'triangle', vol: 0.18 });
      tone(1046, 0.4, { type: 'triangle', vol: 0.18, at: 0.18 });
    },
  };

  return {
    tone, noise, season,
    get on() { return on; },
    set on(v) { on = !!v; },
    unlock() { ctx(); },
    ok() { tone(880, 0.12, { type: 'triangle' }); tone(1318, 0.2, { type: 'triangle', at: 0.09 }); },
    ng() { tone(330, 0.18, { type: 'square', vol: 0.08 }); tone(262, 0.25, { type: 'square', vol: 0.08, at: 0.14 }); },
    tap() { tone(660, 0.06, { type: 'triangle', vol: 0.12 }); },
    // カルタ の パシッ
    pashi() {
      noise(0.07, { filter: 'highpass', freq: 1800, vol: 0.5, q: 0.7 });
      tone(160, 0.09, { type: 'sine', vol: 0.3, slide: 70 });
    },
    fanfare() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.16, at: i * 0.12 }));
    },
  };
})();

/* よみあげ（speechSynthesis が つかえる とき だけ） */
const Voice = (() => {
  const has = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
  let on = true;
  let ja = null;
  let unlocked = false;
  function pick() {
    if (!has) return;
    const vs = (speechSynthesis.getVoices() || []).filter((v) => /^ja/i.test(v.lang));
    const pref = ['Kyoko', 'O-ren', 'Nanami', 'Haruka', 'Google'];
    ja = null;
    for (const p of pref) { ja = vs.find((v) => v.name.includes(p)); if (ja) break; }
    if (!ja) ja = vs[0] || null;
  }
  if (has) {
    pick();
    try { speechSynthesis.addEventListener('voiceschanged', pick); } catch (e) { speechSynthesis.onvoiceschanged = pick; }
  }
  function cancel() { try { if (has) speechSynthesis.cancel(); } catch (e) {} }
  /* iPhone は タップの なかで いちど しゃべらせないと こえが でない */
  function unlock() {
    if (!has || !on || unlocked) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0; u.lang = 'ja-JP';
      speechSynthesis.speak(u);
      unlocked = true;
    } catch (e) {}
  }
  /* しゃべる。おわったら done()（こえ が ない ときも ちょっと まって よぶ） */
  function say(text, done) {
    cancel();
    let fired = false;
    const fin = () => { if (!fired) { fired = true; if (done) done(); } };
    if (!has || !on) { setTimeout(fin, 600 + text.length * 90); return; }
    try {
      const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, '、'));
      u.lang = 'ja-JP';
      if (ja) u.voice = ja;
      u.rate = 0.9;
      u.onend = fin;
      u.onerror = fin;
      speechSynthesis.speak(u);
      setTimeout(fin, 1500 + text.length * 220);     // onend が こない ブラウザ むけ
    } catch (e) { setTimeout(fin, 600); }
  }
  return {
    has, say, cancel, unlock,
    get on() { return on; },
    set on(v) { on = !!v; if (!on) cancel(); },
  };
})();
