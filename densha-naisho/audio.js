'use strict';
/*
 * おと と こえ
 *  - こうかおん: WebAudio で その場で つくる（おんせいファイルなし）
 *  - でんしゃの こえ: たんまつの よみあげ（SpeechSynthesis）
 *  - ききとり: たんまつの おんせいにんしき（つかえる ときだけ）
 */
const Sound = (function () {
  let ctx = null;
  let sfxOn = true;
  let voiceOn = true;

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }
  function tone(f, t0, dur, type, vol, f2) {
    const a = ac(); if (!a || !sfxOn) return;
    const o = a.createOscillator(); const g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, a.currentTime + t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, a.currentTime + t0 + dur);
    g.gain.setValueAtTime(0.0001, a.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, a.currentTime + t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + 0.05);
  }
  function noise(t0, dur, freq, vol, type) {
    const a = ac(); if (!a || !sfxOn) return;
    const n = Math.floor(a.sampleRate * dur); const buf = a.createBuffer(1, n, a.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < n; i += 1) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq;
    const g = a.createGain(); g.gain.setValueAtTime(vol || 0.2, a.currentTime + t0); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
    src.connect(f); f.connect(g); g.connect(a.destination); src.start(a.currentTime + t0);
  }

  const fx = {
    tap: function () { tone(880, 0, 0.07, 'triangle', 0.08); },
    ok: function () { [659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.11, 0.3, 'triangle', 0.14); }); },
    oops: function () { noise(0, 0.35, 2600, 0.07, 'highpass'); tone(300, 0, 0.18, 'sine', 0.06, 220); },
    star: function () { [1047, 1319, 1568, 2093].forEach(function (f, i) { tone(f, i * 0.07, 0.35, 'sine', 0.1); }); },
    couple: function () { noise(0, 0.12, 900, 0.4); tone(110, 0, 0.18, 'square', 0.12, 70); noise(0.16, 0.08, 600, 0.2); },
    door: function () { tone(988, 0, 0.3, 'sine', 0.12); tone(784, 0.3, 0.4, 'sine', 0.12); noise(0.7, 0.4, 3000, 0.05, 'highpass'); },
    gatan: function () { [0, 0.16, 0.62, 0.78].forEach(function (t) { noise(t, 0.08, 500, 0.35); tone(80, t, 0.08, 'sine', 0.2); }); },
    crossing: function () { for (let i = 0; i < 6; i += 1) { tone(i % 2 ? 620 : 740, i * 0.28, 0.24, 'square', 0.05); } },
    rain: function () { noise(0, 2.2, 5000, 0.06, 'highpass'); },
    steam: function () { noise(0, 0.9, 4000, 0.12, 'highpass'); },
    spark: function () { noise(0, 0.1, 6000, 0.15, 'highpass'); tone(1800, 0, 0.08, 'sawtooth', 0.04, 600); },
    wiper: function () { tone(240, 0, 0.18, 'sine', 0.05, 320); tone(320, 0.3, 0.18, 'sine', 0.05, 240); },
    horn: function (kind) {
      if (kind === 'sl') {
        [523, 659, 784].forEach(function (f) { tone(f * 0.94, 0, 0.12, 'sine', 0.07, f); tone(f, 0.1, 0.95, 'sine', 0.08); });
        noise(0, 1.0, 3500, 0.06, 'highpass');
      } else if (kind === 'shinkansen') {
        tone(349, 0, 0.7, 'sawtooth', 0.06); tone(440, 0, 0.7, 'sawtooth', 0.05); tone(523, 0, 0.7, 'triangle', 0.05);
      } else {
        tone(392, 0, 0.5, 'square', 0.05); tone(494, 0, 0.5, 'square', 0.04);
      }
    },
  };
  function play(name, arg) { if (fx[name]) { try { fx[name](arg); } catch (e) { /* おとが なくても あそべる */ } } }

  /* ---------- よみあげ ---------- */
  let jaVoice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    const v = window.speechSynthesis.getVoices() || [];
    jaVoice = v.find(function (x) { return x.lang === 'ja-JP' && /Kyoko|O-ren|Google|Nanami/i.test(x.name); })
      || v.find(function (x) { return x.lang === 'ja-JP'; })
      || v.find(function (x) { return (x.lang || '').indexOf('ja') === 0; }) || null;
  }
  if (window.speechSynthesis) { pickVoice(); window.speechSynthesis.onvoiceschanged = pickVoice; }

  function forSpeech(t) {
    return String(t)
      .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}\u{200D}]/gu, ' ')
      .replace(/[「」『』（）()]/g, ' ').replace(/[?？]/g, '？').replace(/\s+/g, ' ').trim();
  }
  let token = 0;
  function canSpeak() { return voiceOn && !!window.speechSynthesis; }
  /* よみおわったら onDone。よみあげが つかえない ときは すぐ onDone(false) */
  function speak(text, voice, onDone) {
    token += 1; const my = token;
    let finished = false;
    function done(spoken) { if (finished || my !== token) return; finished = true; clearTimeout(timer); if (onDone) onDone(spoken); }
    let timer = 0;
    if (!canSpeak()) { done(false); return; }
    const body = forSpeech(text);
    if (!body) { done(false); return; }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(body);
      u.lang = 'ja-JP'; if (!jaVoice) pickVoice(); if (jaVoice) u.voice = jaVoice;
      u.pitch = (voice && voice.pitch) || 1.1; u.rate = (voice && voice.rate) || 0.95;
      u.onend = function () { done(true); }; u.onerror = function () { done(false); };
      window.speechSynthesis.speak(u);
      /* onend が こない たんまつの ための ほけん */
      timer = setTimeout(function () { done(true); }, 2500 + body.length * 260);
    } catch (e) { done(false); }
  }
  function stopSpeak() { token += 1; if (window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch (e) { /* */ } } }

  /* ---------- ききとり ---------- */
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  function listen(onText, onEnd) {
    if (!Rec) { onEnd(); return false; }
    stopSpeak();
    try {
      if (rec) { try { rec.abort(); } catch (e) { /* */ } }
      rec = new Rec(); rec.lang = 'ja-JP'; rec.interimResults = false; rec.maxAlternatives = 3;
      let got = false;
      rec.onresult = function (ev) {
        const alts = [];
        for (let i = 0; i < ev.results[0].length; i += 1) alts.push(ev.results[0][i].transcript);
        got = true; onText(alts);
      };
      rec.onerror = function () { if (!got) onEnd(); };
      rec.onend = function () { if (!got) onEnd(); };
      rec.start();
      return true;
    } catch (e) { onEnd(); return false; }
  }
  function stopListen() { if (rec) { try { rec.abort(); } catch (e) { /* */ } } }

  return {
    play: play, speak: speak, stopSpeak: stopSpeak, canSpeak: canSpeak, unlock: ac,
    listen: listen, stopListen: stopListen, canListen: function () { return !!Rec; },
    setSfx: function (v) { sfxOn = v; }, setVoice: function (v) { voiceOn = v; if (!v) stopSpeak(); },
  };
})();
