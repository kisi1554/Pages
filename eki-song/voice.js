/* =========================================================
   レーナの こえ と きょく（WebAudio の ごうせいおん だけ）
   - parseMora : よみ → モーラ（おとの ひとつぶ）
   - buildSong : えきの ならび → いつ どの おとを ならすかの ひょう
   - Player    : ひょうを すこし さきどりして スケジュールする
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
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];
// メロディの かたち（SCALE の ばんごう）。1つ 8こ ぶん
const MOTIFS = [
  [4, 4, 5, 4, 2, 2, 4, 5], [7, 6, 5, 4, 5, 4, 2, 4], [2, 4, 5, 7, 7, 8, 7, 5],
  [5, 5, 4, 2, 4, 5, 4, 2], [7, 7, 8, 9, 8, 7, 5, 7], [4, 2, 0, 2, 4, 5, 7, 4],
  [9, 8, 7, 5, 7, 8, 7, 7], [5, 4, 5, 7, 5, 4, 2, 0],
];

const NUM_KANA = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
function numKana(n) {
  const t = Math.floor(n / 10), o = n % 10;
  return (t ? (t > 1 ? NUM_KANA[t] : '') + 'じゅう' : '') + NUM_KANA[o];
}

function snapTo(midi, tones, key) {
  let best = midi, bestD = 99;
  for (let m = key - 3; m <= key + 21; m++) {
    if (!tones.includes(((m - key) % 12 + 12) % 12)) continue;
    const d = Math.abs(m - midi);
    if (d < bestD) { bestD = d; best = m; }
  }
  return best;
}

/*
  list : うたう えき
  song : SONGS の ひとつ
  opts : { lineName, seed }
  かえりち: { segs, events, length, beat }
*/
function buildSong(list, song, opts) {
  const slot = 60 / song.bpm / song.grid, barSlots = 4 * song.grid, key = song.key;
  const U = 8;                                  // うたの ひとまとまり（8こ）
  const segs = [], events = [];
  let pos = 0;                                  // いまの ばしょ（slot）

  const chordAt = s => song.prog[Math.floor(s / barSlots) % song.prog.length];

  function addLyric(seg, text, motifNo) {
    const mora = parseMora(text);
    const units = Math.max(1, Math.ceil((mora.length + 1) / U));
    const total = units * U;
    const each = mora.length * 2 <= total - 1 ? 2 : 1;
    let lastReal = mora.length - 1;
    while (lastReal > 0 && mora[lastReal].ext) lastReal--;
    seg.start = pos * slot; seg.mora = mora; seg.text = text; seg.notes = [];
    let p = 0;
    mora.forEach((m, mi) => {
      let d = each;
      if (mi === mora.length - 1) d = Math.max(each, total - p - 1);
      const t = (pos + p) * slot;
      if (m.ext && seg.notes.length) {
        const last = seg.notes[seg.notes.length - 1];
        last.dur += d * slot; last.moras.push(mi); last.moraTimes.push(t);
        p += d; return;
      }
      const motif = MOTIFS[(motifNo + Math.floor(p / U)) % MOTIFS.length];
      let midi = key + SCALE[motif[p % U]];
      const abs = pos + p;
      if (abs % song.grid === 0 || mi === lastReal) midi = snapTo(midi, chordAt(abs), key);
      const n = { type: 'note', time: t, dur: d * slot, midi, c: m.c, v: m.v, cut: m.cut,
        moras: [mi], moraTimes: [t], seg: segs.length };
      seg.notes.push(n); events.push(n);
      p += d;
    });
    pos += total;
    seg.end = pos * slot;
    segs.push(seg);
  }

  function rest(n, kind) {
    segs.push({ kind, start: pos * slot, end: (pos + n) * slot, mora: [], notes: [] });
    pos += n;
  }

  // イントロ（2しょうせつ）→ よびかけ
  rest(barSlots * 2, 'intro');
  addLyric({ kind: 'lyric' }, opts.lineName + ' いくよー', 2);
  list.forEach((st, k) => addLyric({ kind: 'station', st, k }, st.yomi, opts.seed + k * 3));
  addLyric({ kind: 'lyric' }, 'ぜんぶで ' + numKana(opts.count || list.length) + 'えき', 4);
  addLyric({ kind: 'lyric' }, 'また のってね', 0);
  // しょうせつの きりの いいところまで のばして おわり
  const endPos = Math.ceil(pos / barSlots) * barSlots;
  rest(endPos - pos + barSlots, 'end');

  // ばんそう
  const bars = endPos / barSlots;
  const beat = slot * song.grid, bar = beat * 4;
  for (let b = 0; b <= bars; b++) {
    const t = b * bar, final = b === bars;
    const ch = final ? [0, 4, 7, 11] : chordAt(b * barSlots);
    const root = key - 24 + ch[0];
    if (final) {
      events.push({ time: t, type: 'kick' }, { time: t, type: 'crash' });
      events.push({ time: t, type: 'pad', midis: ch.map(x => key - 12 + x), dur: bar * 1.5 });
      events.push({ time: t, type: 'bass', midi: key - 24, dur: bar });
      continue;
    }
    if (b === 2) events.push({ time: t, type: 'crash' });
    events.push({ time: t, type: 'pad', midis: ch.map(x => key - 12 + x), dur: bar, soft: song.drums === 'soft' });
    for (let q = 0; q < 4; q++) {
      const bt = t + q * beat;
      if (song.drums === 'four') {
        events.push({ time: bt, type: 'kick' }, { time: bt + beat / 2, type: 'hat', open: true });
        if (q % 2) events.push({ time: bt, type: 'clap' });
        for (const h of [0, .25, .75]) events.push({ time: bt + beat * h, type: 'hat' });
        events.push({ time: bt, type: 'bass', midi: root, dur: beat * .45, saw: true });
        events.push({ time: bt + beat / 2, type: 'bass', midi: root + 12, dur: beat * .4, saw: true });
        if (q === 1 || q === 3) events.push({ time: bt + beat / 2, type: 'stab', midis: ch.map(x => key + x) });
      } else if (song.drums === 'march') {
        events.push({ time: bt, type: 'kick' }, { time: bt, type: 'hat' }, { time: bt + beat / 2, type: 'hat' });
        if (q % 2) events.push({ time: bt, type: 'snare' });
        events.push({ time: bt, type: 'bass', midi: root + (q % 2 ? 7 : 0), dur: beat * .8 });
      } else {
        if (q === 0 || q === 2) events.push({ time: bt, type: 'kick', soft: true });
        if (q % 2) events.push({ time: bt, type: 'snare', soft: true });
        events.push({ time: bt + beat / 2, type: 'hat', soft: true });
        if (q === 0) events.push({ time: bt, type: 'bass', midi: root, dur: beat * 3.5 });
        events.push({ time: bt, type: 'keys', midi: key + 12 + ch[(q * 2 + b) % ch.length] });
      }
    }
  }
  if (song.drums !== 'soft') for (let i = 0; i < 4; i++) events.push({ time: bar * 2 - beat + i * beat / 4, type: 'snare' });

  events.sort((a, b) => a.time - b.time);
  return { segs, events, beat, length: (endPos + barSlots * 1.5) * slot };
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
for (const tbl of [FORMANT, START_F]) for (const k in tbl) tbl[k] = tbl[k].map(f => Math.round(f * 1.12));
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

/* レーナの のど（1つの のこぎりなみ ＋ 3つの フォルマント） */
function makeThroat(ctx, dest) {
  const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 440;
  const vib = ctx.createOscillator(); vib.frequency.value = 6.2;
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


/* ---------- がっき ---------- */
function tone(ctx, dest, type, f, t, dur, amp, attack = .005) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(amp, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .02);
  return o;
}

function playAcc(ctx, dest, ev, t) {
  switch (ev.type) {
    case 'kick': {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + .12);
      const a = ev.soft ? .5 : .9;
      g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .25);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + .27);
      break;
    }
    case 'snare':
      noiseHit(ctx, dest, t, 1800, .8, ev.soft ? .1 : .14, ev.soft ? .18 : .4);
      tone(ctx, dest, 'triangle', 190, t, .08, ev.soft ? .1 : .2);
      break;
    case 'clap':
      [0, .012, .024].forEach(d => noiseHit(ctx, dest, t + d, 1400, 1.2, .09, .32));
      break;
    case 'hat':
      noiseHit(ctx, dest, t, 8500, .7, ev.open ? .12 : .03, ev.soft ? .04 : ev.open ? .09 : .07, 'highpass');
      break;
    case 'crash':
      noiseHit(ctx, dest, t, 6000, .4, 1.2, .16, 'highpass');
      break;
    case 'bass': {
      if (ev.saw) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(ev.midi);
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6;
        f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(220, t + ev.dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.28, t + .005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + ev.dur);
        o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + ev.dur + .02);
      } else {
        tone(ctx, dest, 'triangle', mtof(ev.midi), t, ev.dur, .4, .01);
      }
      break;
    }
    case 'stab':
      ev.midis.forEach(m => tone(ctx, dest, 'square', mtof(m), t, .14, .035));
      break;
    case 'keys':
      tone(ctx, dest, 'sine', mtof(ev.midi), t, 1.1, .1);
      tone(ctx, dest, 'sine', mtof(ev.midi) * 3, t, .4, .015);
      break;
    case 'pad':
      ev.midis.forEach(m => {
        const o = ctx.createOscillator(); o.type = ev.soft ? 'sine' : 'triangle'; o.frequency.value = mtof(m);
        const g = ctx.createGain(), a = ev.soft ? .05 : .035;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(a, t + .15);
        g.gain.setValueAtTime(a, t + ev.dur - .15); g.gain.linearRampToValueAtTime(0.0001, t + ev.dur);
        o.connect(g); g.connect(dest); o.start(t); o.stop(t + ev.dur + .02);
      });
      break;
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
      const lim = this.ctx.createDynamicsCompressor();
      lim.threshold.value = -8; lim.knee.value = 6; lim.ratio.value = 12;
      lim.attack.value = .003; lim.release.value = .15;
      this.master.connect(lim); lim.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended' && !Player.paused) this.ctx.resume();
    return this.ctx;
  },
  setOn(v) {
    this.on = v;
    if (this.master) this.master.gain.setTargetAtTime(v ? 1 : 0, this.ctx.currentTime, .02);
  },
};

const Player = {
  song: null, t0: 0, idx: 0, bus: null, throat: null, timer: null, paused: false,
  start(song, fromTime = 0) {
    this.stop();
    const ctx = Snd.ensure();
    this.song = song; this.paused = false;
    this.idx = song.events.findIndex(e => e.time >= fromTime - .001);
    if (this.idx < 0) this.idx = song.events.length;
    if (!ctx) { this.t0 = performance.now() / 1000 + .1 - fromTime; return; }
    this.bus = ctx.createGain(); this.bus.connect(Snd.master);
    this.acc = ctx.createGain(); this.acc.gain.value = .3; this.acc.connect(this.bus);
    this.vox = ctx.createGain(); this.vox.gain.value = .95; this.vox.connect(this.bus);
    this.throat = makeThroat(ctx, this.vox);
    this.t0 = ctx.currentTime + .15 - fromTime;
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
      if (e.type === 'note') singNote(this.throat, e, t);
      else playAcc(ctx, this.acc, e, t);
    }
  },
  pause() {
    if (!this.song || this.paused) return;
    this.paused = true;
    if (Snd.ctx) Snd.ctx.suspend();
  },
  resume() {
    if (!this.song || !this.paused) return;
    this.paused = false;
    if (Snd.ctx) Snd.ctx.resume();
  },
  stop() {
    clearInterval(this.timer); this.timer = null;
    if (this.bus && Snd.ctx) {
      const b = this.bus, th = this.throat, ctx = Snd.ctx;
      b.gain.setTargetAtTime(0, ctx.currentTime, .02);
      setTimeout(() => b.disconnect(), 200);
      if (th) th.stop(ctx.currentTime + .25);
    }
    this.bus = this.throat = null; this.song = null; this.paused = false;
    if (Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume();
  },
};

/* なでたときの ひとこと */
function quickSing(text, midis, e8 = .12) {
  const ctx = Snd.ensure();
  const mora = parseMora(text), notes = [];
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
