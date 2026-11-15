'use strict';
/* よみあげ（ブラウザの おんせいごうせい SpeechSynthesis）。おんせい ファイル は つかわない。
   ひと ごとに こえの たかさ（pitch）と はやさ（rate）を かえる。えいご の ぶぶん は えいご の こえ で よむ。 */
(function () {
  const S = window.speechSynthesis;
  let ja = null, en = null, vol = 0.8, on = true;
  function pick() {
    if (!S) return;
    const vs = S.getVoices() || [];
    ja = vs.find((v) => v.lang === 'ja-JP' && /Kyoko|O-ren|Google/i.test(v.name)) || vs.find((v) => v.lang === 'ja-JP') || vs.find((v) => /^ja/.test(v.lang || '')) || null;
    en = vs.find((v) => v.lang === 'en-US' && /Samantha|Google/i.test(v.name)) || vs.find((v) => /^en/.test(v.lang || '')) || null;
  }
  if (S) { pick(); S.onvoiceschanged = pick; }
  // こえ の ちがい（たかさ・はやさ）
  const PROF = {
    ao: [1.6, 1.0], mama: [1.25, 1.0], papa: [0.85, 1.0], granny: [1.05, 0.8], grandpa: [0.7, 0.8], police: [0.9, 1.0], sailor: [0.75, 0.95],
    station: [0.95, 1.0], shop: [1.1, 1.05], gardener: [0.9, 0.95], student: [1.05, 1.05], tourist: [1.1, 0.95], post: [1.0, 1.05], cook: [0.85, 1.0],
    dog: [1.15, 1.0], mama2: [1.3, 0.95], fire: [0.8, 1.0], nurse: [1.3, 0.95], doctor: [0.9, 0.9], carpenter: [0.75, 1.0], baker: [1.15, 1.0],
    florist: [1.35, 0.95], painter: [0.95, 0.9], fisher: [0.8, 0.9], jogger: [1.3, 1.1], busdriver: [0.9, 1.0], performer: [1.2, 1.15],
    teacher: [1.35, 0.95], keeper: [0.95, 0.95], guide: [1.3, 1.0], sister: [1.45, 1.05], staff: [1.1, 1.05],
  };
  // よみあげ よう に ととのえる（えもじ・かぎかっこ・HTML を とる）
  function clean(t) {
    return String(t).replace(/<[^>]+>/g, ' ').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}]/gu, ' ')
      .replace(/[「」『』（）()❓]/g, ' ').replace(/[〜~]/g, 'ー').replace(/\s+/g, ' ').trim();
  }
  // えいご（ローマじ）と にほんご に わける
  function parts(t) { const out = []; t.split(/([A-Za-z][A-Za-z ,.'!?-]*[A-Za-z!?.]|[A-Za-z])/).forEach((s, i) => { const v = s.trim(); if (v) out.push({ en: i % 2 === 1, t: v }); }); return out; }
  function say(text, who, opt) {
    if (!S || !on) return;
    const body = clean(text); if (!body) return;
    if (!ja) pick();
    const [pitch, rate] = PROF[who] || [1, 1];
    parts(body).forEach((p) => {
      const u = new SpeechSynthesisUtterance(p.t);
      if (p.en) { u.lang = 'en-US'; if (en) u.voice = en; } else { u.lang = 'ja-JP'; if (ja) u.voice = ja; }
      u.pitch = Math.max(0.1, Math.min(2, pitch)); u.rate = Math.max(0.5, Math.min(1.6, rate * (opt && opt.slow ? 0.85 : 1)));
      u.volume = vol; S.speak(u);
    });
  }
  function stop() { if (S) try { S.cancel(); } catch (e) { /* なし */ } }
  window.Voice = {
    say, stop,
    get ok() { return !!S; },
    set on(v) { on = !!v; if (!on) stop(); }, get on() { return on; },
    set volume(v) { vol = Math.max(0, Math.min(1, v)); },
  };
})();
