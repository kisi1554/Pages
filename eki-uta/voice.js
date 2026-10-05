/* =========================================================
   ぷっぴの こえ（WebAudio の ごうせいおん だけで うたう）
   - parseMora   : よみ → モーラ（おとの ひとつぶ）
   - buildSong   : えきの ならび → いつ どの おとを ならすかの ひょう
   - Player      : ひょうを すこし さきどりして スケジュールする
   ========================================================= */

/* ---------- ことば → モーラ ---------- */
const SMALL_V = { 'ゃ': 'a', 'ゅ': 'u', 'ょ': 'o', 'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o' };
const KANA_ROWS = {
  '': 'あいうえお', k: 'かきくけこ', s: 'さしすせそ', t: 'たちつてと', n: 'なにぬねの',
  h: 'はひふへほ', m: 'まみむめも', y: 'や_ゆ_よ', r: 'らりるれろ', w: 'わ___を',
  g: 'がぎぐげご', z: 'ざじずぜぞ', d: 'だぢづでど', b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ',
};
const PHON = {};
for (const [c, row] of Object.entries(KANA_ROWS)) {
  [...row].forEach((ch, i) => { if (ch !== '_') PHON[ch] = { c, v: 'aiueo'[i] }; });
}
Object.assign(PHON, {
  'し': { c: 'sh', v: 'i' }, 'ち': { c: 'ch', v: 'i' }, 'つ': { c: 'ts', v: 'u' }, 'ふ': { c: 'f', v: 'u' },
  'じ': { c: 'j', v: 'i' }, 'ぢ': { c: 'j', v: 'i' }, 'づ': { c: 'z', v: 'u' }, 'を': { c: '', v: 'o' },
  'ん': { c: 'N', v: 'n' },
});
const toHira = s => s.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));

function parseMora(text) {
  const out = [];
  for (const ch of text) {
    if (ch === ' ' || ch === '　') continue;
    const h = toHira(ch);
    const last = out[out.length - 1];
    if (SMALL_V[h] && last) {
      last.text += ch;
      if ('ゃゅょ'.includes(h) && !['sh', 'ch', 'j'].includes(last.c)) last.c = (last.c || '') + 'y';
      last.v = SMALL_V[h];
      continue;
    }
    if (h === 'っ' && last) { last.text += ch; last.cut = true; continue; }
    if (h === 'ー' && last) { out.push({ text: ch, ext: true, v: last.v }); continue; }
    // おう・ゆう などの「う」は のばす おとに する
    if (h === 'う' && last && !last.cut && !last.ext && (last.v === 'o' || last.v === 'u') && last.c !== 'N') {
      out.push({ text: ch, ext: true, v: last.v }); continue;
    }
    const p = PHON[h] || { c: '', v: 'a' };
    out.push({ text: ch, c: p.c, v: p.v });
  }
  return out;
}

/* ---------- がくふを つくる ---------- */
const PENT = [0, 2, 4, 7, 9, 12, 14, 16];
// コード（ルートと こうせいおん）。I V vi IV / I IV V I
const CH = {
  I: { root: 0, tones: [0, 4, 7] }, IV: { root: 5, tones: [5, 9, 0] },
  V: { root: 7, tones: [7, 11, 2] }, vi: { root: 9, tones: [9, 0, 4] },
};
const PROG = [CH.I, CH.V, CH.vi, CH.IV, CH.I, CH.IV, CH.V, CH.I];
const MOTIFS = [
  [2, 2, 3, 4, 3, 2, 1, 2, 3, 3, 4, 5, 4, 3, 2, 2],
  [4, 3, 2, 3, 4, 4, 5, 4, 3, 2, 1, 2, 3, 2, 1, 0],
  [0, 1, 2, 4, 4, 3, 2, 1, 2, 3, 4, 5, 6, 5, 4, 4],
  [5, 4, 3, 2, 3, 4, 3, 2, 1, 2, 3, 2, 1, 1, 0, 0],
  [2, 4, 5, 4, 2, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 2],
  [3, 3, 2, 1, 2, 3, 4, 4, 5, 4, 3, 4, 2, 1, 2, 2],
];
const BPMS = [84, 104, 126];

function snapToChord(midi, chord, key) {
  let best = midi, bestD = 99;
  for (let m = key - 3; m <= key + 17; m++) {
    const pc = ((m - key) % 12 + 12) % 12;
    if (!chord.tones.includes(pc)) continue;
    const d = Math.abs(m - midi);
    if (d < bestD) { bestD = d; best = m; }
  }
  return best;
}

/* モーラの かずから、それぞれの ながさ（8ぶおんぷ いくつぶん）を きめる */
function moraDurations(m, bars) {
  const total = bars * 8;
  const S = Math.min(total - (m < total ? 1 : 0), m * 2);
  const d = [];
  for (let i = 0; i < m; i++) d.push(Math.floor((i + 1) * S / m) - Math.floor(i * S / m));
  const rest = total - S;
  if (rest > 1) d[m - 1] += rest - 1;
  return d;
}

/*
  list   : うたう えき（じゅんばん どおり）
  opts   : { key, bpm, seed, intro, outro }
  かえりち: { segs, events, e8, length }
*/
function buildSong(list, opts) {
  const e8 = 60 / opts.bpm / 2, barLen = e8 * 8, key = opts.key;
  const segs = [], events = [];
  let bar = 0;

  function addBar(final) {
    const t = bar * barLen, ch = final ? CH.I : PROG[bar % PROG.length];
    if (final) {
      events.push({ time: t, type: 'pad', midis: ch.tones.map(x => key - 12 + x), dur: barLen * 1.4 });
      events.push({ time: t, type: 'bass', midi: key - 24, dur: barLen * 1.2 });
      [0, 4, 7, 12].forEach((x, i) => events.push({ time: t + i * e8 * .5, type: 'bell', midi: key + 12 + x }));
    } else {
      events.push({ time: t, type: 'bass', midi: key - 24 + ch.root, dur: e8 * 3.5 });
      events.push({ time: t + e8 * 4, type: 'bass', midi: key - 24 + ch.root + 7, dur: e8 * 3.5 });
      events.push({ time: t, type: 'pad', midis: ch.tones.map(x => key - 12 + x), dur: barLen });
      for (const k of [0, 4]) {                               // ガタン ゴトン
        events.push({ time: t + k * e8, type: 'tata', strong: true });
        events.push({ time: t + k * e8 + e8 * .5, type: 'tata' });
      }
      for (const k of [2, 6]) events.push({ time: t + k * e8, type: 'hat' });
    }
    bar++;
  }

  function addLyric(seg, text, motifNo) {
    const mora = parseMora(text);
    const bars = mora.length > 8 ? 2 : 1;
    const durs = moraDurations(mora.length, bars);
    const motif = MOTIFS[motifNo % MOTIFS.length];
    const offset = bars === 1 ? (motifNo % 2) * 8 : 0;
    let lastReal = mora.length - 1;
    while (lastReal > 0 && mora[lastReal].ext) lastReal--;
    seg.start = bar * barLen; seg.mora = mora; seg.text = text; seg.notes = [];
    let pos = 0;
    mora.forEach((m, mi) => {
      const notes = seg.notes;
      if (m.ext && notes.length) {
        const last = notes[notes.length - 1];
        last.dur += durs[mi] * e8; last.moras.push(mi);
        last.moraTimes.push(seg.start + pos * e8);
        pos += durs[mi];
        return;
      }
      const chord = PROG[(bar + Math.floor(pos / 8)) % PROG.length];
      let midi = key + PENT[motif[(offset + pos) % 16]];
      if (pos % 4 === 0 || mi === lastReal) midi = snapToChord(midi, chord, key);
      const n = {
        type: 'note', time: seg.start + pos * e8, dur: durs[mi] * e8, midi,
        c: m.c, v: m.v, cut: m.cut, moras: [mi], moraTimes: [seg.start + pos * e8], seg: segs.length,
      };
      notes.push(n);
      pos += durs[mi];
    });
    seg.notes.forEach(n => events.push(n));
    for (let b = 0; b < bars; b++) addBar();
    seg.end = bar * barLen;
    segs.push(seg);
  }

  // はじまり: ベル → 「しゅっぱつ しんこう」
  segs.push({ kind: 'intro', start: 0, end: barLen, mora: [], notes: [] });
  [0, 4, 7, 12, 7, 12].forEach((x, i) => events.push({ time: i * e8, type: 'bell', midi: key + 12 + x }));
  addBar();
  addLyric({ kind: 'lyric', say: 'しゅっぱつ しんこう！' }, 'しゅっぱつ しんこう', 2);

  list.forEach((st, k) => {
    const seg = { kind: 'station', st, k };
    addLyric(seg, st.yomi, opts.seed + k * 5 + (k % 3));
    events.push({ time: seg.start, type: 'speak', text: st.yomi, seg: segs.length - 1 });
  });

  addLyric({ kind: 'lyric', say: 'また うたおうね！' }, 'また うたおうね', 0);
  segs.push({ kind: 'end', start: bar * barLen, end: (bar + 1) * barLen, mora: [], notes: [] });
  addBar(true);

  events.sort((a, b) => a.time - b.time);
  return { segs, events, e8, beat: e8 * 2, length: bar * barLen + barLen * .5 };
}

/* ---------- おとの げんりょう ---------- */
const FORMANT = {
  a: [850, 1250, 2900], i: [320, 2500, 3300], u: [360, 1400, 2600],
  e: [520, 2000, 2800], o: [520, 900, 2700], n: [260, 1350, 2600],
};
const START_F = {                       // しいんの はじまりの かたち（ここから ぼいんへ うつる）
  m: [260, 1100, 2500], n: [260, 1700, 2600], N: [260, 1350, 2600],
  y: [300, 2400, 3100], w: [350, 800, 2400], r: [420, 1500, 2600],
};
const NOISE = {                         // [ちゅうしん しゅうはすう, Q, ながさ, おおきさ, ゆうせい?]
  k: [2200, 1.5, .03, .5], t: [4200, 1.2, .025, .45], p: [900, 1.2, .02, .4],
  s: [6000, 1, .08, .32], sh: [3300, 1.4, .08, .32], ch: [3600, 1.4, .055, .38], ts: [5600, 1.2, .055, .35],
  h: [1600, .8, .05, .22], f: [1400, .7, .05, .2],
  g: [2000, 1.5, .015, .22, 1], d: [3600, 1.5, .012, .2, 1], b: [700, 1.5, .012, .2, 1],
  z: [5500, 1, .05, .18, 1], j: [3000, 1.2, .05, .2, 1],
};
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

let _noiseBuf = null;
function noiseBuffer(ctx) {
  if (_noiseBuf && _noiseBuf.sampleRate === ctx.sampleRate) return _noiseBuf;
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (_noiseBuf = b);
}
function noiseHit(ctx, dest, t, freq, q, dur, amp, type = 'bandpass') {
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(amp, t + Math.min(.008, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(dest);
  src.start(t, Math.random() * .5); src.stop(t + dur + .02);
}

/* ぷっぴの のど（1つの のこぎりなみ ＋ 3つの フォルマント） */
function makeThroat(ctx, dest) {
  const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 440;
  const vib = ctx.createOscillator(); vib.frequency.value = 5.6;
  const vibG = ctx.createGain(); vibG.gain.value = 0;
  vib.connect(vibG); vibG.connect(osc.frequency);
  const env = ctx.createGain(); env.gain.value = 0;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
  const filters = [1, .6, .3].map((amp, k) => {
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = [7, 11, 14][k];
    f.frequency.value = FORMANT.a[k];
    const g = ctx.createGain(); g.gain.value = amp * 1.3;
    osc.connect(f); f.connect(g); g.connect(env);
    return f;
  });
  env.connect(lp); lp.connect(dest);
  osc.start(); vib.start();
  return {
    ctx, osc, vibG, env, filters, dest,
    stop(at) { try { osc.stop(at); vib.stop(at); } catch (e) { /* もう とまっている */ } },
  };
}

function singNote(th, n, t) {
  const ctx = th.ctx, f0 = mtof(n.midi), dur = n.dur;
  const c = n.c || '', base = c.length > 1 && c.endsWith('y') ? c[0] : c;
  const glideY = c.length > 1 && c.endsWith('y');
  const nz = NOISE[base];
  const unvoiced = nz && !nz[4];
  const onset = unvoiced ? Math.min(nz[2] * .9, dur * .4) : .008;
  const tv = t + onset;
  const target = FORMANT[n.v] || FORMANT.a;
  const start = START_F[glideY ? 'y' : base] || null;

  // しいんの ざらざら
  if (nz) noiseHit(ctx, th.dest, t, nz[0], nz[1], nz[2] + (unvoiced ? .02 : 0), nz[3]);

  // たかさ（すこし すべらせる）＋ ビブラート
  th.osc.frequency.setTargetAtTime(f0, t, .018);
  th.vibG.gain.cancelScheduledValues(t);
  th.vibG.gain.setValueAtTime(0, t);
  if (dur > .3) th.vibG.gain.linearRampToValueAtTime(f0 * .018, t + Math.min(dur, .6));

  // くちの かたち
  th.filters.forEach((f, k) => {
    f.frequency.cancelScheduledValues(t);
    f.frequency.setValueAtTime(start ? start[k] : target[k], t);
    if (start) f.frequency.linearRampToValueAtTime(target[k], tv + (base === 'r' ? .03 : .06));
    else f.frequency.setValueAtTime(target[k], t);
  });

  // おおきさ
  const A = n.v === 'n' ? .55 : (n.v === 'i' || n.v === 'u') ? .9 : 1;
  const g = th.env.gain;
  g.cancelScheduledValues(t);
  g.setTargetAtTime(0, t - .012, .006);                // ことばの くぎり
  if (base === 'm' || base === 'n') {
    g.setTargetAtTime(A * .45, t, .01);
    g.setTargetAtTime(A, t + .05, .015);
  } else {
    g.setTargetAtTime(A, tv, .012);
  }
  const end = t + (n.cut ? dur * .55 : dur) - .03;
  g.setTargetAtTime(0, Math.max(tv + .03, end), .025);
}

function toyNote(ctx, dest, n, t) {               // よみあげ モードの メロディ（おもちゃの ピアノ）
  const f = mtof(n.midi + 12), d = Math.min(n.dur, .7) + .25;
  [[1, 'sine', .32], [2, 'triangle', .07], [4, 'sine', .03]].forEach(([mul, type, amp]) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mul;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(amp, t + .006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + .02);
  });
}

function bell(ctx, dest, midi, t, amp = .18) {
  const f = mtof(midi);
  [[1, amp], [2.76, amp * .25], [5.4, amp * .1]].forEach(([mul, a]) => {
    const o = ctx.createOscillator(); o.frequency.value = f * mul;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(a, t + .005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 1.25);
  });
}

function playAcc(ctx, dest, ev, t) {
  if (ev.type === 'bass') {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(ev.midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.32, t + .01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ev.dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + ev.dur + .02);
  } else if (ev.type === 'pad') {
    ev.midis.forEach(m => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(m);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.045, t + .12);
      g.gain.setValueAtTime(.045, t + ev.dur - .15); g.gain.linearRampToValueAtTime(0.0001, t + ev.dur);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + ev.dur + .02);
    });
  } else if (ev.type === 'tata') {
    noiseHit(ctx, dest, t, ev.strong ? 220 : 320, 1, ev.strong ? .09 : .06, ev.strong ? .55 : .35, 'lowpass');
  } else if (ev.type === 'hat') {
    noiseHit(ctx, dest, t, 8000, .7, .03, .07, 'highpass');
  } else if (ev.type === 'bell') {
    bell(ctx, dest, ev.midi, t);
  }
}

/* ---------- プレイヤー ---------- */
const Snd = {
  ctx: null, master: null, on: true,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.on ? 1 : 0;
      const lim = this.ctx.createDynamicsCompressor();     // おおきすぎる おとを おさえる
      lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 12;
      lim.attack.value = .003; lim.release.value = .15;
      this.master.connect(lim); lim.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended' && !Player.paused) this.ctx.resume();
    return this.ctx;
  },
  setOn(v) {
    this.on = v;
    if (this.master) this.master.gain.setTargetAtTime(v ? 1 : 0, this.ctx.currentTime, .02);
    if (!v && window.speechSynthesis) speechSynthesis.cancel();
  },
};

const Player = {
  song: null, t0: 0, idx: 0, bus: null, throat: null, timer: null, paused: false, mode: 'uta',
  start(song, mode) {
    this.stop();
    const ctx = Snd.ensure();
    this.song = song; this.mode = mode; this.idx = 0; this.paused = false;
    if (!ctx) { this.t0 = performance.now() / 1000 + .1; return; }
    if (ctx.state === 'suspended') ctx.resume();
    this.bus = ctx.createGain(); this.bus.connect(Snd.master);
    this.acc = ctx.createGain(); this.acc.gain.value = .22; this.acc.connect(this.bus);
    this.vox = ctx.createGain(); this.vox.gain.value = .9; this.vox.connect(this.bus);
    if (mode === 'uta') this.throat = makeThroat(ctx, this.vox);
    this.t0 = ctx.currentTime + .15;
    this.timer = setInterval(() => this.tick(), 40);
    this.tick();
  },
  now() {
    if (!this.song) return 0;
    if (!Snd.ctx) return performance.now() / 1000 - this.t0;
    return Snd.ctx.currentTime - this.t0;
  },
  tick() {
    const ctx = Snd.ctx; if (!ctx || !this.song || this.paused) return;
    const ahead = ctx.currentTime + .3, ev = this.song.events;
    while (this.idx < ev.length && this.t0 + ev[this.idx].time < ahead) {
      const e = ev[this.idx++], t = Math.max(this.t0 + e.time, ctx.currentTime);
      if (e.type === 'note') {
        if (this.mode === 'uta') singNote(this.throat, e, t);
        else toyNote(ctx, this.vox, e, t);
      } else if (e.type === 'speak') {
        if (this.mode === 'yomi') this.speakAt(e.text, t);
      } else {
        playAcc(ctx, this.acc, e, t);
      }
    }
  },
  speakAt(text, t) {
    if (!window.speechSynthesis || !Snd.on) return;
    const wait = Math.max(0, (t - Snd.ctx.currentTime) * 1000);
    const song = this.song;
    setTimeout(() => {
      if (this.song !== song || this.paused || !Snd.on) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP'; u.rate = 1.05; u.pitch = 1.5;
      const v = speechSynthesis.getVoices().find(x => /^ja/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    }, wait);
  },
  pause() {
    if (!this.song || this.paused) return;
    this.paused = true;
    if (Snd.ctx) Snd.ctx.suspend();
    if (window.speechSynthesis) speechSynthesis.cancel();
  },
  resume() {
    if (!this.song || !this.paused) return;
    this.paused = false;
    if (Snd.ctx) Snd.ctx.resume();
  },
  stop() {
    clearInterval(this.timer); this.timer = null;
    if (this.bus) {
      const b = this.bus, th = this.throat, ctx = Snd.ctx;
      b.gain.setTargetAtTime(0, ctx.currentTime, .02);
      setTimeout(() => b.disconnect(), 200);
      if (th) th.stop(ctx.currentTime + .25);
    }
    this.bus = this.throat = null; this.song = null; this.paused = false;
    if (Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume();
    if (window.speechSynthesis) speechSynthesis.cancel();
  },
};

/* うた いがいの ひとこと（なでたときの「えへへ」など）。かえりちは くちの うごきの ひょう */
function quickSing(text, midis, e8 = .13) {
  const ctx = Snd.ensure();
  const mora = parseMora(text);
  const notes = [];
  let pos = 0;
  mora.forEach((m, i) => {
    if (m.ext && notes.length) { notes[notes.length - 1].dur += e8; pos += e8; return; }
    notes.push({ time: pos, dur: e8, midi: midis[i % midis.length], c: m.c, v: m.v, cut: m.cut });
    pos += e8;
  });
  if (notes.length) notes[notes.length - 1].dur += e8;
  if (!ctx || !Snd.on) return notes;
  const bus = ctx.createGain(); bus.gain.value = .8; bus.connect(Snd.master);
  const th = makeThroat(ctx, bus), t0 = ctx.currentTime + .05;
  notes.forEach(n => singNote(th, n, t0 + n.time));
  const endT = t0 + pos + e8 + .2;
  th.stop(endT);
  setTimeout(() => bus.disconnect(), (endT - ctx.currentTime) * 1000 + 300);
  return notes;
}
