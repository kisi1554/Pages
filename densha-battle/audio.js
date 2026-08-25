'use strict';

/*
 * 音まわり(にっぽん一周すごろくの 音エンジンを バトル用に つくりかえたもの)
 *  - BGM: Web Audio API で その場で つくる。音源ファイルは いらない。
 *         「メニュー」「バトル」「ボス」の 3しゅるいの ふんいきを もっていて、
 *         ばめんに あわせて 曲が きりかわる。
 *  - 効果音: こうげき / ひっさつわざ / ひばく / せいかい / まちがい / KO / ファンファーレ
 *  - 読み上げ: ブラウザの 音声合成(日本語)
 */

/* ------------------------------ 音階 ------------------------------ */

// 半音の数から周波数へ(A4 = 440Hz を基準)
function noteToHz(semitoneFromA4) {
  return 440 * Math.pow(2, semitoneFromA4 / 12);
}

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
 *   '.' = 休み  'x' = 鳴らす  数字 = スケールの何番目か
 *   mood: 'menu' = えらぶ画面 / 'battle' = ふつうの たたかい / 'boss' = ラスボス
 */

const BGM_TRACKS = [
  {
    name: 'はっしゃ ベル',
    mood: 'menu',
    bpm: 132,
    root: -17, // E2
    scale: 'majorPenta',
    kick: 'x.......x.......x.......x...x...',
    snare: '....x.......x.......x.......x...',
    hat: 'x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.',
    bassWave: 'triangle',
    bass: '0...0...4...4...5...5...4...2...',
    leadWave: 'sine',
    lead: '7...9...12..9...7...4...5...7...',
    leadOct: 12,
    drive: 0.7,
  },
  {
    name: 'バトル トレイン',
    mood: 'battle',
    bpm: 172,
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
    drive: 0.95,
  },
  {
    name: 'こうそく しんこう',
    mood: 'battle',
    bpm: 180,
    root: -15, // F#2
    scale: 'dorian',
    kick: 'x..xx...x..xx...x..xx...x.x.x.x.',
    snare: '....x.......x.......x.......x.x.',
    hat: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    bassWave: 'square',
    bass: '00.0.0.500.0.0.300.0.0.700.5.3.0',
    leadWave: 'sawtooth',
    lead: '7.7.9.7.5.4.5.7.7.7.9.12.9.7.5.4',
    leadOct: 12,
    drive: 1,
  },
  {
    name: 'ラッシュアワー',
    mood: 'battle',
    bpm: 164,
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
    drive: 1.05,
  },
  {
    name: 'ヤミカゲ しゅつげん',
    mood: 'boss',
    bpm: 188,
    root: -22, // A#1
    scale: 'harmonicMinor',
    kick: 'x.x.x.x.x.x.x.x.x.x.x.x.x.x.xxxx',
    snare: '....x.......x.......x.....x.x.x.',
    hat: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    bassWave: 'sawtooth',
    bass: '0.0.0.0.1.1.0.0.3.3.0.0.7.5.3.1.',
    leadWave: 'sawtooth',
    lead: '0.1.3.1.0...7.5.3.1.0.10.7.5.3.1',
    leadOct: 12,
    drive: 1.15,
  },
];

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
  let mood = 'battle';
  let step = 0;
  let nextNoteTime = 0;
  let timerId = null;
  const bags = {};

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
      bgmBus.gain.value = 0.3;
      bgmBus.connect(master);

      seBus = ctx.createGain();
      seBus.gain.value = 0.8;
      seBus.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ------- 音のパーツ ------- */

  function noiseBuffer(seconds) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
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
    gain.gain.setValueAtTime(0.2 * power, time);
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

  function pickTrack(wantMood) {
    const idx = [];
    BGM_TRACKS.forEach((t, i) => { if (t.mood === wantMood) idx.push(i); });
    if (idx.length === 0) return BGM_TRACKS[0];
    if (!bags[wantMood] || bags[wantMood].length === 0) {
      bags[wantMood] = idx.slice();
      for (let i = bags[wantMood].length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = bags[wantMood][i];
        bags[wantMood][i] = bags[wantMood][j];
        bags[wantMood][j] = t;
      }
    }
    return BGM_TRACKS[bags[wantMood].pop()];
  }

  function charAt(pattern, i) {
    return pattern.charAt(i % pattern.length);
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

  function loadTrack(t) {
    track = Object.assign({}, t, { leadSteps: parseLead(t.lead) });
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

    const leadDeg = t.leadSteps[stepIndex % t.leadSteps.length];
    if (leadDeg !== null && leadDeg !== undefined) {
      const hz = noteToHz(t.root + t.leadOct + scale[leadDeg % scale.length]);
      tone(time, bgmBus, hz, 0.14, t.leadWave, 0.13, 4200, 0);
      tone(time, bgmBus, hz, 0.14, t.leadWave, 0.09, 4200, 9);
    }
  }

  function scheduler() {
    const secPerStep = 60 / track.bpm / 4;
    while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
      scheduleStep(step, nextNoteTime);
      nextNoteTime += secPerStep;
      step += 1;
      /* 8小節(128ステップ)ごとに 同じふんいきの べつの曲へ */
      if (step % 128 === 0) loadTrack(pickTrack(mood));
    }
  }

  function startBgm(wantMood) {
    if (wantMood) mood = wantMood;
    if (!bgmOn) return;
    if (!ensureCtx()) return;
    if (playing) return;
    loadTrack(pickTrack(mood));
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

  /* ばめんが かわったら すぐに その ふんいきの曲へ きりかえる */
  function setMood(wantMood) {
    if (mood === wantMood && playing) return;
    mood = wantMood;
    if (!bgmOn) return;
    if (!ensureCtx()) return;
    if (!playing) {
      startBgm(mood);
      return;
    }
    loadTrack(pickTrack(mood));
    step = 0;
  }

  /* ------- 効果音のパーツ ------- */

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

  /* ヒュイーンと 上がる/下がる うなり */
  function sweep(time, from, to, dur, wave, level) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave || 'sawtooth';
    osc.frequency.setValueAtTime(from, time);
    osc.frequency.exponentialRampToValueAtTime(to, time + dur);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + dur * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(seBus);
    osc.start(time);
    osc.stop(time + dur + 0.03);
  }

  /* ドカーンという ばくはつ(低い ドン + ノイズ) */
  function boom(time, level, len) {
    const dur = len || 0.6;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + dur * 0.6);
    g.gain.setValueAtTime(level, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g);
    g.connect(seBus);
    osc.start(time);
    osc.stop(time + dur + 0.05);

    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4200, time);
    lp.frequency.exponentialRampToValueAtTime(320, time + dur);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(level * 0.9, time);
    ng.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(lp);
    lp.connect(ng);
    ng.connect(seBus);
    src.start(time);
    src.stop(time + dur);
  }

  /* ------- ゲームの 効果音 ------- */

  function seTap() {
    if (!seOn || !ensureCtx()) return;
    blip(880, ctx.currentTime, 0.05, 'triangle', 0.18);
  }

  function seCorrect() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    blip(1046, t, 0.1, 'sine', 0.3);
    blip(1568, t + 0.08, 0.18, 'sine', 0.3);
  }

  function seWrong() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    blip(196, t, 0.16, 'square', 0.22);
    blip(155, t + 0.14, 0.24, 'square', 0.22);
  }

  /* こうげき前の ため(シュゴゴゴ…) */
  function seCharge(dur) {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    const d = dur || 0.45;
    sweep(t, 180, 1500, d, 'sawtooth', 0.16);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(d);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.exponentialRampToValueAtTime(5200, t + d);
    bp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + d * 0.85);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(bp); bp.connect(g); g.connect(seBus);
    src.start(t); src.stop(t + d);
  }

  /* ふつうの こうげきヒット */
  function seHit() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    boom(t, 0.55, 0.45);
    sweep(t, 1400, 220, 0.22, 'square', 0.24);
  }

  /* クリティカル(はやく こたえた とき) */
  function seCritical() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    boom(t, 0.7, 0.6);
    sweep(t, 2600, 300, 0.3, 'sawtooth', 0.3);
    [1568, 2093, 2637].forEach((hz, i) => blip(hz, t + 0.18 + i * 0.05, 0.16, 'square', 0.22));
  }

  /* ひっさつわざ(ながい ためから ドッカーン) */
  function seSpecial() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    sweep(t, 120, 2400, 0.85, 'sawtooth', 0.26);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.85);
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(300, t);
    hp.frequency.exponentialRampToValueAtTime(7000, t + 0.85);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.86);
    src.connect(hp); hp.connect(g); g.connect(seBus);
    src.start(t); src.stop(t + 0.86);

    boom(t + 0.85, 0.9, 1.1);
    [1046, 1318, 1568, 2093, 2637].forEach((hz, i) => {
      blip(hz, t + 0.9 + i * 0.07, 0.28, 'square', 0.24);
      blip(hz / 2, t + 0.9 + i * 0.07, 0.28, 'triangle', 0.14);
    });
  }

  /* プレイヤーが ダメージを うけた */
  function seDamage() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    boom(t, 0.4, 0.35);
    sweep(t, 500, 90, 0.35, 'square', 0.2);
  }

  /* あいてを たおした */
  function seKO() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    boom(t, 0.8, 1.0);
    sweep(t + 0.1, 900, 70, 0.9, 'sawtooth', 0.26);
  }

  /* れんぞく せいかいで ゲージが たまった */
  function seCombo(n) {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    const base = 880 * Math.pow(2, Math.min(n, 5) / 12);
    blip(base, t, 0.08, 'square', 0.22);
    blip(base * 1.5, t + 0.06, 0.12, 'square', 0.2);
  }

  /* ゲージ MAX! */
  function seReady() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    [1046, 1318, 1568, 2093].forEach((hz, i) => blip(hz, t + i * 0.06, 0.2, 'square', 0.26));
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

  function seLose() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    [523, 466, 415, 349].forEach((hz, i) => {
      blip(hz, t + i * 0.22, 0.3, 'triangle', 0.24);
    });
  }

  /* のこり時間が すくない ときの チクタク */
  function seTick() {
    if (!seOn || !ensureCtx()) return;
    blip(1500, ctx.currentTime, 0.04, 'square', 0.12);
  }

  /* でんしゃの けいてき(バトル かいし) */
  function seHorn() {
    if (!seOn || !ensureCtx()) return;
    const t = ctx.currentTime;
    [392, 466].forEach((hz) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = hz;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.26, t + 0.06);
      g.gain.setValueAtTime(0.26, t + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      osc.connect(lp); lp.connect(g); g.connect(seBus);
      osc.start(t); osc.stop(t + 0.82);
    });
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
    const o = opts || {};
    if (!voiceOn || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (!jaVoice) pickVoice();
    if (jaVoice) u.voice = jaVoice;
    u.rate = o.rate || 1.0;
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
    setMood,
    isBgmPlaying: () => playing,
    currentTrackName: () => (track ? track.name : ''),
    setBgmEnabled(v) {
      bgmOn = v;
      if (v) startBgm(mood);
      else stopBgm();
    },
    isBgmEnabled: () => bgmOn,
    setSeEnabled(v) { seOn = v; },
    setVoiceEnabled(v) {
      voiceOn = v;
      if (!v) stopSpeak();
    },
    isVoiceEnabled: () => voiceOn,
    seTap,
    seCorrect,
    seWrong,
    seCharge,
    seHit,
    seCritical,
    seSpecial,
    seDamage,
    seKO,
    seCombo,
    seReady,
    seFanfare,
    seLose,
    seTick,
    seHorn,
    speak,
    stopSpeak,
  };
})();
