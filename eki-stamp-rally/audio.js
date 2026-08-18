'use strict';

/*
 * 音まわり
 *  - BGM: Web Audio API で その場で作る(音源ファイル不要)。激しめのトラックを何種類も用意して
 *         かならず ちがう曲がかかるように シャッフルして流す。
 *  - 効果音: ピンポン / ブブー / スタンプの「ドン」 / ファンファーレ
 *  - 読み上げ: ブラウザの音声合成(日本語)
 */

/* ------------------------------ 音階 ------------------------------ */

// 半音の数から周波数へ(A4 = 440Hz を基準)
function noteToHz(semitoneFromA4) {
  return 440 * Math.pow(2, semitoneFromA4 / 12);
}

// スケール(ルートからの半音)
const SCALES = {
  minorPenta: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11, 12, 14, 15, 17, 19, 20, 23, 24],
  dorian: [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19, 21, 22, 24],
  phrygian: [0, 1, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19, 20, 22, 24],
  majorPenta: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24],
};

/* --------------------------- BGM トラック --------------------------- */
/*
 * 1トラック = 16分音符 32ステップ の くりかえし。
 * kick/snare/hat/bass/lead をそれぞれ文字列パターンで持たせる。
 *   '.' = 休み  'x' = 鳴らす  数字 = スケールの何番目か
 */

const BGM_TRACKS = [
  {
    name: 'ラッシュアワー',
    bpm: 168,
    root: -17, // E2
    scale: 'minorPenta',
    kick: 'x...x...x...x...x...x...x.x.x...',
    snare: '....x.......x.......x.......x...',
    hat: 'x.xxx.xxx.xxx.xxx.xxx.xxx.xxx.xx',
    bassWave: 'sawtooth',
    bass: '0.0.0.3.0.0.5.3.0.0.0.3.5.5.3.0.',
    leadWave: 'square',
    lead: '..7.5.7.10..7.5...7.10.12.10.7..',
    leadOct: 12,
    drive: 0.9,
  },
  {
    name: 'とっきゅうダッシュ',
    bpm: 176,
    root: -15, // F#2
    scale: 'phrygian',
    kick: 'x..xx...x..xx...x..xx...x.x.x.x.',
    snare: '....x.......x.......x.......x.x.',
    hat: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    bassWave: 'square',
    bass: '00.0.0.100.0.0.300.0.0.500.3.1.0',
    leadWave: 'sawtooth',
    lead: '7.7.8.7.5.3.5.7.7.7.8.10.8.7.5.3',
    leadOct: 12,
    drive: 1,
  },
  {
    name: 'てつどうロック',
    bpm: 150,
    root: -20, // C2
    scale: 'minorPenta',
    kick: 'x...x..xx...x..xx...x..xx.x.x...',
    snare: '....x.......x.......x.......x...',
    hat: 'x.x.x.x.x.x.x.x.x.x.x.x.x.xxx.xx',
    bassWave: 'sawtooth',
    bass: '0...0...3...3...5...5...3...1...',
    leadWave: 'sawtooth',
    lead: '0.3.5...0.3.7...0.3.5.7.5.3.0...',
    leadOct: 24,
    drive: 1.1,
  },
  {
    name: 'ちかてつテクノ',
    bpm: 160,
    root: -22, // A#1/Bb1
    scale: 'dorian',
    kick: 'x...x...x...x...x...x...x...x...',
    snare: '....x.......x.......x.......x...',
    hat: '..x...x...x...x...x...x...x...x.',
    bassWave: 'square',
    bass: '0.0.3.0.5.0.3.0.0.0.7.0.5.3.2.0.',
    leadWave: 'triangle',
    lead: '12.10.7.10.12.14.12.10.7.5.7.10.',
    leadOct: 12,
    drive: 0.8,
  },
  {
    name: 'まつりばやし',
    bpm: 155,
    root: -19, // D2
    scale: 'minorPenta',
    kick: 'x.x.x.x.x.x.x.x.x.x.x.x.xxxxx.x.',
    snare: '..x...x...x...x...x...x...x.x.x.',
    hat: 'x...x...x...x...x...x...x...x...',
    bassWave: 'triangle',
    bass: '0...0...5...5...7...7...5...3...',
    leadWave: 'square',
    lead: '5.7.10.7.5.3.0...5.7.10.12.10.7.',
    leadOct: 24,
    drive: 1,
  },
  {
    name: 'しんかんせん',
    bpm: 172,
    root: -16, // F2
    scale: 'majorPenta',
    kick: 'x..x..x.x..x..x.x..x..x.x.x.x.x.',
    snare: '....x.......x.......x.......x...',
    hat: 'xx.xxx.xxx.xxx.xxx.xxx.xxx.xxx.x',
    bassWave: 'sawtooth',
    bass: '0.0.0.0.4.4.4.4.5.5.5.5.4.2.0.0.',
    leadWave: 'square',
    lead: '..9.7.9.12..9.7...9.12.14.12.9..',
    leadOct: 12,
    drive: 0.95,
  },
  {
    name: 'よこはまナイト',
    bpm: 146,
    root: -21, // B1
    scale: 'harmonicMinor',
    kick: 'x.....x.x.....x.x.....x.x...x...',
    snare: '....x.......x.......x.......x...',
    hat: 'x.xx.xx.x.xx.xx.x.xx.xx.x.xx.xxx',
    bassWave: 'sawtooth',
    bass: '0.0.0.0.5.5.5.5.3.3.3.3.6.6.5.5.',
    leadWave: 'sawtooth',
    lead: '7.6.7.10.7.6.5...7.6.7.11.10.7..',
    leadOct: 12,
    drive: 1.05,
  },
  {
    name: 'かいそくとくきゅう',
    bpm: 164,
    root: -18, // D#2
    scale: 'dorian',
    kick: 'x...x.x.x...x.x.x...x.x.x.x.x.x.',
    snare: '....x.......x.......x.......x...',
    hat: 'x.xxx.xxx.xxx.xxx.xxx.xxx.xxxxxx',
    bassWave: 'square',
    bass: '0.3.0.3.5.3.0.3.0.3.0.7.5.3.2.0.',
    leadWave: 'triangle',
    lead: '10.12.14.12.10.7.10.12.14.16.14.',
    leadOct: 12,
    drive: 0.9,
  },
];

/* --- ここから 追加のトラック(ぜんぶで24曲) --- */
BGM_TRACKS.push(
  {
    name: 'あさのラッシュ',
    bpm: 170,
    root: -19,
    scale: 'minorPenta',
    kick: 'x.x.x...x.x.x...x.x.x...x.xxx...',
    snare: '....x.......x.......x.......x...',
    hat: 'xx.xxx.xxx.xxx.xxx.xxx.xxx.xxx.x',
    bassWave: 'sawtooth',
    bass: '0.0.5.0.3.0.5.0.0.0.7.0.5.3.0.0.',
    leadWave: 'square',
    lead: '10.7.5.7.10.12.10.7.5.3.5.7.10..',
    leadOct: 12,
    drive: 1,
  },
  {
    name: 'ちかてつダンス',
    bpm: 158,
    root: -21,
    scale: 'dorian',
    kick: 'x...x...x...x...x...x...x..xx...',
    snare: '....x.......x.......x.......x.x.',
    hat: '..x...x...x...x...x...x...x.x.x.',
    bassWave: 'square',
    bass: '0.3.5.3.0.3.7.3.0.3.5.3.7.5.3.0.',
    leadWave: 'sawtooth',
    lead: '..5.7.9.7.5...9.12.9.7.5.3......',
    leadOct: 12,
    drive: 0.85,
  },
  {
    name: 'てっきょうロック',
    bpm: 148,
    root: -20,
    scale: 'minorPenta',
    kick: 'x..x.x..x..x.x..x..x.x..xx.x.x..',
    snare: '....x.......x.......x.......x...',
    hat: 'x.x.x.x.x.x.x.x.x.x.x.x.xxxxxxxx',
    bassWave: 'sawtooth',
    bass: '00..00..33..33..55..55..33..11..',
    leadWave: 'sawtooth',
    lead: '0...3...5...7...5...3...0.......',
    leadOct: 24,
    drive: 1.15,
  },
  {
    name: 'こうそくつうか',
    bpm: 178,
    root: -17,
    scale: 'phrygian',
    kick: 'x...x...x...x...x...x...x...x...',
    snare: '....x.......x.......x.......x...',
    hat: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    bassWave: 'sawtooth',
    bass: '0.1.0.3.0.1.0.5.0.1.0.3.5.3.1.0.',
    leadWave: 'square',
    lead: '12.11.12.14.12.11.9.7.9.11.12...',
    leadOct: 12,
    drive: 1.05,
  },
  {
    name: 'ゆきのとっきゅう',
    bpm: 152,
    root: -22,
    scale: 'harmonicMinor',
    kick: 'x.....x...x.....x.....x...x.x...',
    snare: '....x.......x.......x.......x...',
    hat: 'x.xx.x.xx.xx.x.xx.xx.x.xx.xx.xxx',
    bassWave: 'triangle',
    bass: '0...0...3...3...5...5...6...5...',
    leadWave: 'triangle',
    lead: '7.8.11.8.7.5.3...7.8.11.12.11.7.',
    leadOct: 12,
    drive: 0.95,
  },
  {
    name: 'よこはまベイ',
    bpm: 144,
    root: -20,
    scale: 'majorPenta',
    kick: 'x...x...x...x...x...x...x.x.x...',
    snare: '....x.......x.......x.......x...',
    hat: 'x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.',
    bassWave: 'triangle',
    bass: '0...4...7...4...0...4...9...7...',
    leadWave: 'square',
    lead: '..7.9.12.9.7.4...7.9.12.14.12.9.',
    leadOct: 12,
    drive: 0.9,
  },
  {
    name: 'やまのてループ',
    bpm: 162,
    root: -18,
    scale: 'majorPenta',
    kick: 'x...x...x...x...x...x...x...x.x.',
    snare: '....x.......x.......x.......x...',
    hat: 'x.xx.xx.x.xx.xx.x.xx.xx.x.xx.xx.',
    bassWave: 'square',
    bass: '0.0.2.0.4.0.2.0.0.0.4.0.7.4.2.0.',
    leadWave: 'square',
    lead: '4.7.9.7.4.2.0...4.7.9.11.9.7.4..',
    leadOct: 12,
    drive: 0.95,
  },
  {
    name: 'ふみきりビート',
    bpm: 166,
    root: -19,
    scale: 'minorPenta',
    kick: 'xx..xx..xx..xx..xx..xx..xx.xx.x.',
    snare: '....x.......x.......x.......x...',
    hat: 'x..x..x.x..x..x.x..x..x.x..x..x.',
    bassWave: 'square',
    bass: '0...0...0...3...0...0...5...3...',
    leadWave: 'sawtooth',
    lead: '0.0.3.3.5.5.3.3.0.0.5.5.7.5.3.0.',
    leadOct: 24,
    drive: 1.1,
  },
  {
    name: 'サンダーバード',
    bpm: 174,
    root: -16,
    scale: 'dorian',
    kick: 'x..x..x.x..x..x.x..x..x.xx.x.x.x',
    snare: '....x.......x.......x.......x.x.',
    hat: 'x.xxx.xxx.xxx.xxx.xxx.xxxxxxxxxx',
    bassWave: 'sawtooth',
    bass: '0.2.3.5.3.2.0.5.0.2.3.7.5.3.2.0.',
    leadWave: 'square',
    lead: '9.10.12.10.9.7.5.7.9.10.12.14...',
    leadOct: 12,
    drive: 1.1,
  },
  {
    name: 'ホームのかぜ',
    bpm: 142,
    root: -21,
    scale: 'dorian',
    kick: 'x.......x.......x.......x...x...',
    snare: '....x.......x.......x.......x...',
    hat: 'x.x.x.x.x.x.x.x.x.x.x.x.x.xxx.x.',
    bassWave: 'triangle',
    bass: '0...3...5...3...0...3...7...5...',
    leadWave: 'triangle',
    lead: '..9.7.5.7.9...12.9.7.5.3.5.7....',
    leadOct: 12,
    drive: 0.8,
  },
  {
    name: 'ナイトエクスプレス',
    bpm: 156,
    root: -22,
    scale: 'phrygian',
    kick: 'x...x..xx...x..xx...x..xx.x.x...',
    snare: '....x.......x.......x.......x...',
    hat: '..xx..xx..xx..xx..xx..xx..xxxxxx',
    bassWave: 'sawtooth',
    bass: '0.0.1.0.3.0.1.0.0.0.5.0.3.1.0.0.',
    leadWave: 'sawtooth',
    lead: '8.7.5.7.8.10.8.7.5.3.1.3.5.7.8..',
    leadOct: 12,
    drive: 1,
  },
  {
    name: 'てつどうマーチ',
    bpm: 140,
    root: -20,
    scale: 'majorPenta',
    kick: 'x...x...x...x...x...x...x...x...',
    snare: '..x...x...x...x...x...x...x...x.',
    hat: 'x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.',
    bassWave: 'square',
    bass: '0...7...0...7...4...9...4...7...',
    leadWave: 'square',
    lead: '0.4.7.9.7.4.0...4.7.9.12.9.7.4..',
    leadOct: 24,
    drive: 1,
  },
  {
    name: 'うみぞいライン',
    bpm: 150,
    root: -19,
    scale: 'majorPenta',
    kick: 'x..x..x.x..x..x.x..x..x.x..x.x..',
    snare: '....x.......x.......x.......x...',
    hat: 'xx.x.xx.xx.x.xx.xx.x.xx.xx.x.xx.',
    bassWave: 'triangle',
    bass: '0.0.4.4.7.7.4.4.0.0.9.9.7.4.2.0.',
    leadWave: 'triangle',
    lead: '7.9.12.14.12.9.7.4.7.9.12.16.14.',
    leadOct: 12,
    drive: 0.9,
  },
  {
    name: 'やまごえロック',
    bpm: 154,
    root: -23,
    scale: 'minorPenta',
    kick: 'x.x..x..x.x..x..x.x..x..xxx.x.x.',
    snare: '....x.......x.......x.......x...',
    hat: 'x.x.x.x.x.x.x.x.xxxxxxxxxxxxxxxx',
    bassWave: 'sawtooth',
    bass: '0.0.0.5.3.3.3.7.0.0.0.5.7.5.3.0.',
    leadWave: 'sawtooth',
    lead: '5.3.0...5.7.10..12.10.7.5.3.0...',
    leadOct: 24,
    drive: 1.2,
  },
  {
    name: 'カーブでキーッ',
    bpm: 168,
    root: -18,
    scale: 'harmonicMinor',
    kick: 'x...x...x.x.x...x...x...x.x.x.x.',
    snare: '....x.......x.x.....x.......x...',
    hat: 'x.xx.xxx.xx.xxx.x.xx.xxx.xx.xxxx',
    bassWave: 'square',
    bass: '0.0.3.0.5.0.3.0.0.0.6.0.5.3.2.0.',
    leadWave: 'square',
    lead: '11.8.7.8.11.12.11.8.7.5.3.5.7.8.',
    leadOct: 12,
    drive: 1.05,
  },
  {
    name: 'ゴールインダッシュ',
    bpm: 180,
    root: -17,
    scale: 'minorPenta',
    kick: 'x...x...x...x...x.x.x.x.x.x.x.x.',
    snare: '....x.......x.......x...x...x.x.',
    hat: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    bassWave: 'sawtooth',
    bass: '0.0.0.0.3.3.3.3.5.5.5.5.7.5.3.0.',
    leadWave: 'square',
    lead: '0.3.5.7.10.12.10.7.5.3.5.7.10.12',
    leadOct: 12,
    drive: 1.2,
  }
);

/* ---------------------------- エンジン ---------------------------- */

const SoundEngine = (function createAudio() {
  let ctx = null;
  let master = null;
  let bgmBus = null;
  let seBus = null;

  let bgmOn = true;
  let seOn = true;
  let voiceOn = true;

  let playing = false;
  let track = null;
  let step = 0;
  let nextNoteTime = 0;
  let timerId = null;
  let shuffleBag = [];

  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD = 0.12;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);

      bgmBus = ctx.createGain();
      bgmBus.gain.value = 0.34;
      bgmBus.connect(master);

      seBus = ctx.createGain();
      seBus.gain.value = 0.75;
      seBus.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ------- 音のパーツ ------- */

  function noiseBuffer(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function kick(time, out, power) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(44, time + 0.11);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(1.0 * power, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
    osc.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + 0.28);
  }

  function snare(time, out, power) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.2);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7 * power, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.17);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(out);
    src.start(time);
    src.stop(time + 0.2);

    // 胴の鳴り
    const osc = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, time);
    osc.frequency.exponentialRampToValueAtTime(130, time + 0.09);
    g2.gain.setValueAtTime(0.35 * power, time);
    g2.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);
    osc.connect(g2);
    g2.connect(out);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  function hat(time, out, power) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.06);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22 * power, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    src.connect(hp);
    hp.connect(gain);
    gain.connect(out);
    src.start(time);
    src.stop(time + 0.06);
  }

  function tone(time, out, hz, dur, wave, level, cutoff, detune) {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = hz;
    if (detune) osc.detune.value = detune;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(300, cutoff * 0.4), time + dur);
    filter.Q.value = 6;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + dur + 0.03);
  }

  /* ------- シーケンサー ------- */

  function pickTrack() {
    if (shuffleBag.length === 0) {
      shuffleBag = BGM_TRACKS.map((_, i) => i);
      for (let i = shuffleBag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = shuffleBag[i];
        shuffleBag[i] = shuffleBag[j];
        shuffleBag[j] = t;
      }
    }
    return BGM_TRACKS[shuffleBag.pop()];
  }

  function charAt(pattern, i) {
    return pattern.charAt(i % pattern.length);
  }

  function scheduleStep(stepIndex, time) {
    const t = track;
    const power = t.drive;
    if (charAt(t.kick, stepIndex) === 'x') kick(time, bgmBus, power);
    if (charAt(t.snare, stepIndex) === 'x') snare(time, bgmBus, power);
    if (charAt(t.hat, stepIndex) === 'x') hat(time, bgmBus, power);

    const scale = SCALES[t.scale];
    const bassCh = charAt(t.bass, stepIndex);
    if (bassCh !== '.') {
      const deg = parseInt(bassCh, 10);
      if (!isNaN(deg)) {
        const hz = noteToHz(t.root + scale[deg % scale.length]);
        tone(time, bgmBus, hz, 0.16, t.bassWave, 0.34, 900, 0);
      }
    }

    // lead は 2文字ぶんの数字も拾えるように、パターンを数値配列にしてから使う
    const leadDeg = t.leadSteps[stepIndex % t.leadSteps.length];
    if (leadDeg !== null) {
      const hz = noteToHz(t.root + t.leadOct + scale[leadDeg % scale.length]);
      tone(time, bgmBus, hz, 0.14, t.leadWave, 0.13, 4200, 0);
      tone(time, bgmBus, hz, 0.14, t.leadWave, 0.09, 4200, 9);
    }
  }

  // '..7.5.10..' のような文字列を、1ステップ1音の配列にほぐす
  function parseLead(pattern) {
    const out = [];
    let i = 0;
    while (i < pattern.length) {
      const c = pattern.charAt(i);
      if (c === '.') {
        out.push(null);
        i += 1;
      } else {
        let num = c;
        while (i + 1 < pattern.length && /[0-9]/.test(pattern.charAt(i + 1)) && num.length < 2) {
          num += pattern.charAt(i + 1);
          i += 1;
        }
        out.push(parseInt(num, 10));
        i += 1;
      }
    }
    return out;
  }

  function scheduler() {
    const secPerStep = 60 / track.bpm / 4;
    while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
      scheduleStep(step, nextNoteTime);
      nextNoteTime += secPerStep;
      step += 1;
      // 8小節(128ステップ)ごとに曲を切りかえる → いつも同じ曲にならない
      if (step % 128 === 0) {
        const next = pickTrack();
        track = Object.assign({}, next, { leadSteps: parseLead(next.lead) });
        if (typeof trackChangeHandler === 'function') trackChangeHandler(track.name);
      }
    }
  }

  let trackChangeHandler = null;

  function startBgm() {
    if (!bgmOn) return;
    if (!ensureCtx()) return;
    if (playing) return;
    const next = pickTrack();
    track = Object.assign({}, next, { leadSteps: parseLead(next.lead) });
    if (typeof trackChangeHandler === 'function') trackChangeHandler(track.name);
    step = 0;
    nextNoteTime = ctx.currentTime + 0.08;
    playing = true;
    timerId = setInterval(scheduler, LOOKAHEAD_MS);
  }

  function stopBgm() {
    playing = false;
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function nextTrack() {
    if (!playing) {
      startBgm();
      return;
    }
    const next = pickTrack();
    track = Object.assign({}, next, { leadSteps: parseLead(next.lead) });
    step = 0;
    if (typeof trackChangeHandler === 'function') trackChangeHandler(track.name);
  }

  /* ------- 効果音 ------- */

  function blip(hz, time, dur, wave, level) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave || 'square';
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level || 0.3, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(seBus);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  function seCorrect() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    blip(1046, t, 0.12, 'sine', 0.35);
    blip(1568, t + 0.1, 0.22, 'sine', 0.35);
  }

  function seWrong() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    blip(196, t, 0.16, 'square', 0.24);
    blip(155, t + 0.14, 0.24, 'square', 0.24);
  }

  function seStamp() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    // 「ドン」= 低い衝撃 + 紙のノイズ
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(g);
    g.connect(seBus);
    osc.start(t);
    osc.stop(t + 0.32);

    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.12);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1200;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.4, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    src.connect(bp);
    bp.connect(ng);
    ng.connect(seBus);
    src.start(t);
    src.stop(t + 0.12);
  }

  function seTap() {
    if (!seOn || !ensureCtx()) return;
    blip(880, ctx.currentTime, 0.05, 'triangle', 0.18);
  }

  function seFanfare() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1046, 784, 1046, 1318];
    notes.forEach((hz, i) => {
      blip(hz, t + i * 0.13, 0.2, 'square', 0.3);
      blip(hz / 2, t + i * 0.13, 0.2, 'triangle', 0.16);
    });
  }


  /* ------- 発車メロディ(このアプリのオリジナル)と 走行音 ------- */

  // メジャースケール(ルートからの半音)。やさしい ひびきになる
  const JINGLE_SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21];

  /*
   * 1曲 = [音の高さ(スケールの何番目), 長さ] のならび。
   * 長さ 1 = 0.16秒。どれも 1.2〜1.6秒くらいで おわる。
   */
  const JINGLES = [
    { root: 3,  notes: [[4, 1], [7, 1], [9, 2], [7, 1], [4, 1], [2, 3]] },
    { root: 5,  notes: [[7, 1], [9, 1], [11, 1], [9, 1], [7, 2], [4, 3]] },
    { root: 0,  notes: [[0, 1], [4, 1], [7, 2], [9, 1], [7, 1], [4, 2], [0, 2]] },
    { root: 7,  notes: [[9, 1], [7, 1], [4, 1], [7, 1], [9, 2], [11, 3]] },
    { root: -2, notes: [[7, 1], [4, 1], [0, 2], [4, 1], [7, 1], [9, 3]] },
    { root: 2,  notes: [[4, 1], [4, 1], [7, 1], [9, 1], [11, 2], [9, 1], [7, 2]] },
    { root: -4, notes: [[0, 2], [2, 1], [4, 1], [7, 2], [4, 1], [2, 1], [0, 2]] },
    { root: 5,  notes: [[11, 1], [9, 1], [7, 2], [9, 1], [11, 1], [12, 3]] },
    { root: 0,  notes: [[7, 1], [9, 1], [12, 2], [11, 1], [9, 1], [7, 3]] },
    { root: 8,  notes: [[4, 1], [7, 2], [4, 1], [2, 1], [4, 2], [7, 2]] },
    { root: -5, notes: [[2, 1], [4, 1], [7, 1], [9, 1], [7, 1], [4, 1], [2, 3]] },
    { root: 3,  notes: [[9, 1], [11, 1], [12, 1], [11, 1], [9, 2], [7, 3]] },
    { root: -2, notes: [[4, 2], [7, 1], [9, 1], [11, 2], [12, 3]] },
    { root: 7,  notes: [[0, 1], [7, 1], [4, 1], [9, 1], [7, 2], [4, 2]] },
    { root: 1,  notes: [[7, 1], [11, 1], [9, 1], [7, 1], [4, 2], [7, 3]] },
    { root: -7, notes: [[4, 1], [2, 1], [4, 1], [7, 1], [9, 2], [7, 1], [4, 2]] },
  ];

  // ベルっぽい音(マリンバ + すず)
  function bell(time, hz, dur, level) {
    [[1, 1], [2, 0.34], [3.01, 0.16], [4.7, 0.07]].forEach(([mul, amp]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = hz * mul;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(level * amp, time + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(g);
      g.connect(seBus);
      osc.start(time);
      osc.stop(time + dur + 0.05);
    });
  }

  // ガタン ゴトン(レールのつなぎ目)
  function clatter(time, level) {
    [0, 0.075].forEach((offset, i) => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.09);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = i === 0 ? 900 : 640;
      const g = ctx.createGain();
      g.gain.setValueAtTime(level * (i === 0 ? 1 : 0.75), time + offset);
      g.gain.exponentialRampToValueAtTime(0.0001, time + offset + 0.085);
      src.connect(lp);
      lp.connect(g);
      g.connect(seBus);
      src.start(time + offset);
      src.stop(time + offset + 0.09);
    });
  }

  // はしる音(ホワイトノイズの かぜ + ガタンゴトン)
  function playRunning(seconds, startAt) {
    const t0 = (startAt || ctx.currentTime);

    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(seconds + 0.2);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(500, t0);
    bp.frequency.linearRampToValueAtTime(1500, t0 + seconds * 0.5);
    bp.frequency.linearRampToValueAtTime(400, t0 + seconds);
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + seconds * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t0 + seconds);
    src.connect(bp);
    bp.connect(g);
    g.connect(seBus);
    src.start(t0);
    src.stop(t0 + seconds + 0.1);

    for (let t = 0.05; t < seconds - 0.1; t += 0.26) {
      clatter(t0 + t, 0.3);
    }
  }

  // 発車! 路線ごとに きまった メロディが 鳴る
  function playDeparture(lineId, runSeconds) {
    if (!seOn || !ensureCtx()) return;
    const jingle = JINGLES[hashString(lineId || '') % JINGLES.length];
    let t = ctx.currentTime + 0.02;
    jingle.notes.forEach(([deg, len]) => {
      const hz = 440 * Math.pow(2, (jingle.root + JINGLE_SCALE[deg % JINGLE_SCALE.length]) / 12);
      bell(t, hz, 0.16 * len + 0.35, 0.3);
      t += 0.16 * len;
    });
    playRunning(runSeconds || 1.1, ctx.currentTime + 0.42);
  }

  /* ------- 読み上げ ------- */

  let jaVoice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    jaVoice =
      voices.find((v) => v.lang === 'ja-JP') ||
      voices.find((v) => (v.lang || '').indexOf('ja') === 0) ||
      null;
    return jaVoice;
  }
  if (window.speechSynthesis) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  function speak(text, opts) {
    if (!voiceOn) return;
    if (!window.speechSynthesis) return;
    const o = opts || {};
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (!jaVoice) pickVoice();
    if (jaVoice) u.voice = jaVoice;
    u.rate = o.rate || 0.85;
    u.pitch = o.pitch || 1.15;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  }

  function stopSpeak() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  return {
    unlock: ensureCtx,
    startBgm,
    stopBgm,
    nextTrack,
    isBgmPlaying: () => playing,
    setBgmEnabled(v) {
      bgmOn = v;
      if (v) startBgm();
      else stopBgm();
    },
    setSeEnabled(v) {
      seOn = v;
    },
    setVoiceEnabled(v) {
      voiceOn = v;
      if (!v) stopSpeak();
    },
    onTrackChange(fn) {
      trackChangeHandler = fn;
    },
    currentTrackName: () => (track ? track.name : ''),
    seCorrect,
    seWrong,
    seStamp,
    seTap,
    seFanfare,
    playDeparture,
    jingleCount: () => JINGLES.length,
    jingleIndexFor: (lineId) => hashString(lineId || '') % JINGLES.length,
    speak,
    stopSpeak,
  };
})();
