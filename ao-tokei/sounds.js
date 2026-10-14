// おとを えらぼう — WebAudio の ごうせいおんだけで つくる おとの セット
(() => {
  'use strict';
  const KEY = 'ao-tokei-sound-v1';
  let enabled = () => true;
  let ac = null;

  function ctx() {
    if (!enabled()) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { return null; }
    return ac;
  }

  // ---------- せってい ----------
  const VOLUMES = [
    { id: 'small', e: '🐭', name: 'ちいさい', k: 0.45 },
    { id: 'mid', e: '🐶', name: 'ふつう', k: 1 },
    { id: 'big', e: '🐘', name: 'おおきい', k: 1.6 }
  ];
  const conf = { vol: 'mid', pick: {} };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s) {
      if (VOLUMES.some((v) => v.id === s.vol)) conf.vol = s.vol;
      if (s.pick && typeof s.pick === 'object') conf.pick = s.pick;
    }
  } catch (e) { /* つかえない ときは そのまま */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(conf)); } catch (e) { /* ignore */ } }
  const volK = () => (VOLUMES.find((v) => v.id === conf.vol) || VOLUMES[1]).k;

  // ---------- おとの ぶひん ----------
  function tone(freq, start, dur, type = 'sine', vol = 0.25) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + start;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.min(0.9, vol * volK()), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function glide(f1, f2, start, dur, type = 'sine', vol = 0.25) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + start;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.min(0.9, vol * volK()), t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(start, dur, vol = 0.3, freq = 2000, ftype = 'bandpass') {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + start;
    const len = Math.max(1, Math.floor(a.sampleRate * dur));
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = ftype; f.frequency.value = freq;
    g.gain.setValueAtTime(Math.min(0.9, vol * volK()), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t); src.stop(t + dur + 0.02);
  }
  // おんぷ（ドレミ）
  const N = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, B5: 988, C6: 1047, D6: 1175, E6: 1319, G6: 1568 };
  function melody(notes, step, type = 'triangle', vol = 0.25, len = 1.6) {
    notes.forEach((n, i) => { if (n) tone(N[n] || n, i * step, step * len, type, vol); });
  }
  const bell = (f, s, d = 0.9, v = 0.18) => { tone(f, s, d, 'sine', v); tone(f * 2.76, s, d * 0.5, 'sine', v * 0.35); tone(f * 5.4, s, d * 0.25, 'sine', v * 0.15); };
  const wood = (f, s, v = 0.35) => { tone(f, s, 0.06, 'sine', v); noise(s, 0.03, v * 0.5, f * 2); };

  // ---------- しゅるい ----------
  // 1つの カテゴリに いくつかの おと。さいしょの ものが はじめの せってい
  const CATS = [
    {
      id: 'alarm', e: '⏰', name: 'タイマーの アラーム', opts: [
        { id: 'doremi', e: '🎵', name: 'ドミソド', play() { melody(['C5', 'E5', 'G5', 'C6', 'G5', 'C6'], 0.16, 'triangle', 0.3, 1.9); } },
        { id: 'jiriri', e: '⏰', name: 'ジリリリ', play() { for (let i = 0; i < 28; i++) tone(i % 2 ? 1700 : 1900, i * 0.042, 0.04, 'square', 0.07); } },
        { id: 'poppo', e: '🐦', name: 'ハトどけい', play() { [0, 0.7].forEach((s) => { tone(784, s, 0.22, 'sine', 0.35); tone(622, s + 0.24, 0.35, 'sine', 0.35); }); } },
        { id: 'kira', e: '⭐', name: 'きらきらぼし', play() { melody(['C6', 'C6', 'G6', 'G6', 1760, 1760, 'G6'], 0.19, 'sine', 0.22, 1.4); melody(['C5', null, 'E5', null, 'F5', null, 'E5'], 0.19, 'sine', 0.08, 2); } },
        { id: 'kaeru', e: '🐸', name: 'かえるの うた', play() { melody(['C5', 'D5', 'E5', 'F5', 'E5', 'D5', 'C5'], 0.19, 'square', 0.1, 1.5); } },
        { id: 'fanfare', e: '🎺', name: 'ファンファーレ', play() { melody(['G4', 'C5', 'E5', 'G5', null, 'E5', 'G5'], 0.14, 'sawtooth', 0.09, 1.6); melody(['C4', null, 'C4', null, 'C4', null, 'E4'], 0.14, 'square', 0.06, 1.8); } },
        { id: 'densha', e: '🚃', name: 'でんしゃの ベル', play() { for (let i = 0; i < 6; i++) bell(i % 2 ? 1175 : 1319, i * 0.22, 0.4, 0.2); } },
        { id: 'piyo', e: '🐤', name: 'ピヨピヨ', play() { [0, 0.18, 0.6, 0.78].forEach((s) => glide(2400, 3600, s, 0.12, 'sine', 0.2)); } },
        { id: 'uchu', e: '🚀', name: 'うちゅう', play() { [0, 0.35, 0.7].forEach((s) => glide(1800, 180, s, 0.32, 'sawtooth', 0.1)); } },
        { id: 'kane', e: '🔔', name: 'おてらの かね', play() { bell(196, 0, 1.4, 0.35); bell(392, 0, 1, 0.12); } }
      ]
    },
    {
      id: 'start', e: '▶️', name: 'スタート', opts: [
        { id: 'pikon', e: '✨', name: 'ピコン', play() { tone(660, 0, 0.12, 'triangle'); tone(990, 0.1, 0.18, 'triangle'); } },
        { id: 'fue', e: '📯', name: 'ふえ ピーッ', play() { tone(2093, 0, 0.45, 'sine', 0.22); tone(2110, 0, 0.45, 'sine', 0.12); } },
        { id: 'pan', e: '💥', name: 'よーい パン', play() { noise(0, 0.25, 0.6, 1500, 'lowpass'); } },
        { id: 'rocket', e: '🚀', name: 'ロケット', play() { glide(200, 1600, 0, 0.45, 'sawtooth', 0.1); } },
        { id: 'don', e: '🥁', name: 'たいこ ドン', play() { glide(160, 55, 0, 0.3, 'sine', 0.7); } },
        { id: 'none', e: '🤫', name: 'なし', play() {} }
      ]
    },
    {
      id: 'stop', e: '⏹️', name: 'ストップ', opts: [
        { id: 'pikon', e: '✨', name: 'ピコン', play() { tone(990, 0, 0.12, 'triangle'); tone(660, 0.1, 0.2, 'triangle'); } },
        { id: 'hyuu', e: '🎈', name: 'ヒュー', play() { glide(1400, 300, 0, 0.35, 'sine', 0.22); } },
        { id: 'ponpon', e: '🎹', name: 'ポン ポン', play() { tone(523, 0, 0.18, 'triangle', 0.3); tone(392, 0.16, 0.25, 'triangle', 0.3); } },
        { id: 'shan', e: '🥁', name: 'シンバル', play() { noise(0, 0.5, 0.35, 6000, 'highpass'); } },
        { id: 'none', e: '🤫', name: 'なし', play() {} }
      ]
    },
    {
      id: 'tap', e: '👆', name: 'ボタンの おと', opts: [
        { id: 'pon', e: '⚪', name: 'ポン', play() { tone(880, 0, 0.08, 'triangle', 0.15); } },
        { id: 'pi', e: '🤖', name: 'ピッ', play() { tone(1500, 0, 0.05, 'square', 0.06); } },
        { id: 'koron', e: '🔮', name: 'コロン', play() { tone(1319, 0, 0.12, 'sine', 0.18); tone(1760, 0.05, 0.12, 'sine', 0.12); } },
        { id: 'puni', e: '🫧', name: 'ぷにっ', play() { glide(300, 750, 0, 0.09, 'sine', 0.3); } },
        { id: 'poko', e: '🪵', name: 'ポコッ', play() { wood(700, 0, 0.3); } },
        { id: 'none', e: '🤫', name: 'なし', play() {} }
      ]
    },
    {
      id: 'count', e: '🔢', name: 'のこり 5びょうの カウント', opts: [
        { id: 'pi', e: '🤖', name: 'ピッ ピッ', play() { tone(1320, 0, 0.07, 'square', 0.08); } },
        { id: 'pon', e: '⚪', name: 'ポン ポン', play() { tone(880, 0, 0.15, 'sine', 0.3); } },
        { id: 'poku', e: '🪵', name: 'ポク ポク', play() { wood(500, 0, 0.4); } },
        { id: 'don', e: '🥁', name: 'ドン ドン', play() { glide(140, 60, 0, 0.2, 'sine', 0.6); } },
        { id: 'none', e: '🤫', name: 'なし', play() {} }
      ]
    },
    {
      id: 'minute', e: '🕐', name: '1ぷん たった おしらせ', opts: [
        { id: 'kirarin', e: '✨', name: 'キラリン', play() { tone(1046, 0, 0.15, 'sine', 0.2); tone(1318, 0.12, 0.25, 'sine', 0.2); } },
        { id: 'chime', e: '🏫', name: 'チャイム', play() { melody(['E5', 'C5', 'D5', 'G4'], 0.3, 'sine', 0.22, 2); } },
        { id: 'poppo', e: '🐦', name: 'ポッポー', play() { tone(784, 0, 0.2, 'sine', 0.35); tone(622, 0.22, 0.35, 'sine', 0.35); } },
        { id: 'bell', e: '🔔', name: 'チーン', play() { bell(1568, 0, 1.2, 0.2); } },
        { id: 'none', e: '🤫', name: 'なし', play() {} }
      ]
    },
    {
      id: 'tiktok', e: '🕰️', name: 'とけいの チクタク', note: 'うごいている あいだ 1びょうごとに なる', opts: [
        { id: 'none', e: '🤫', name: 'なし', play() {} },
        { id: 'chikutaku', e: '🕰️', name: 'チク タク', play(n = 0) { noise(0, 0.025, 0.35, n % 2 ? 2600 : 3400); } },
        { id: 'pokupoku', e: '🪵', name: 'ポク ポク', play(n = 0) { wood(n % 2 ? 560 : 700, 0, 0.25); } },
        { id: 'piko', e: '🎮', name: 'ピコ ピコ', play(n = 0) { tone(n % 2 ? 990 : 1320, 0, 0.04, 'square', 0.04); } },
        { id: 'shinzo', e: '💓', name: 'ドクン', play(n = 0) { if (n % 2 === 0) { glide(90, 50, 0, 0.12, 'sine', 0.5); glide(80, 45, 0.16, 0.12, 'sine', 0.35); } } }
      ]
    },
    {
      id: 'correct', e: '⭕', name: 'クイズ せいかい', opts: [
        { id: 'kirakira', e: '✨', name: 'キラキラ', play() { melody(['G5', 'C6', 'E6'], 0.1, 'triangle', 0.25, 1.4); } },
        { id: 'pinpon', e: '🔔', name: 'ピンポーン', play() { tone(659, 0, 0.35, 'sine', 0.3); tone(523, 0.3, 0.6, 'sine', 0.3); } },
        { id: 'fanfare', e: '🎺', name: 'パッパカパーン', play() { melody(['C5', 'C5', 'C5', 'G5'], 0.11, 'sawtooth', 0.08, 1.3); tone(N.G5, 0.33, 0.4, 'sawtooth', 0.08); } },
        { id: 'coin', e: '🪙', name: 'チャリーン', play() { tone(988, 0, 0.08, 'square', 0.08); tone(1319, 0.08, 0.35, 'square', 0.08); } }
      ]
    },
    {
      id: 'wrong', e: '❌', name: 'クイズ まちがい', opts: [
        { id: 'bubu', e: '🚫', name: 'ブブー', play() { tone(330, 0, 0.18, 'sawtooth', 0.12); tone(262, 0.15, 0.25, 'sawtooth', 0.12); } },
        { id: 'boyon', e: '🌀', name: 'ボヨーン', play() { glide(500, 140, 0, 0.45, 'triangle', 0.3); } },
        { id: 'puh', e: '💨', name: 'プッ', play() { glide(180, 120, 0, 0.12, 'square', 0.12); } },
        { id: 'none', e: '🤫', name: 'なし', play() {} }
      ]
    },
    {
      id: 'voice', e: '🗣️', name: 'よみあげの こえ', note: 'じかんを ことばで よむ こえ', opts: [
        { id: 'normal', e: '🙂', name: 'ふつう', v: { rate: 0.9, pitch: 1.15 } },
        { id: 'high', e: '🐭', name: 'たかい こえ', v: { rate: 0.95, pitch: 1.8 } },
        { id: 'low', e: '🐻', name: 'ひくい こえ', v: { rate: 0.85, pitch: 0.6 } },
        { id: 'slow', e: '🐢', name: 'ゆっくり', v: { rate: 0.6, pitch: 1.1 } },
        { id: 'fast', e: '🐇', name: 'はやくち', v: { rate: 1.4, pitch: 1.2 } },
        { id: 'none', e: '🤫', name: 'よまない', v: null }
      ]
    }
  ];
  CATS.forEach((c) => { if (!c.opts.some((o) => o.id === conf.pick[c.id])) conf.pick[c.id] = c.opts[0].id; });
  const opt = (cat) => { const c = CATS.find((x) => x.id === cat); return c && (c.opts.find((o) => o.id === conf.pick[cat]) || c.opts[0]); };

  function play(cat, n) {
    const o = opt(cat);
    if (!o || !o.play || !enabled()) return;
    try { o.play(n); } catch (e) { /* ignore */ }
  }

  function speak(text) {
    const o = opt('voice');
    if (!enabled() || !o || !o.v || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP'; u.rate = o.v.rate; u.pitch = o.v.pitch;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  // ---------- せってい がめん ----------
  function openPanel() {
    let wrap = document.getElementById('soundPanel');
    if (wrap) wrap.remove();
    wrap = document.createElement('div');
    wrap.id = 'soundPanel';
    wrap.className = 'snd-wrap';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'おとを えらぼう');
    const sec = (c) => `<section class="snd-sec" data-cat="${c.id}">
        <h3><span>${c.e}</span>${c.name}</h3>${c.note ? `<p>${c.note}</p>` : ''}
        <div class="snd-opts">${c.opts.map((o) => `<button class="snd-opt${conf.pick[c.id] === o.id ? ' on' : ''}" data-id="${o.id}" aria-pressed="${conf.pick[c.id] === o.id}"><span class="e">${o.e}</span>${o.name}</button>`).join('')}</div>
      </section>`;
    wrap.innerHTML = `<div class="snd-card">
        <div class="snd-head"><h2>🎵 おとを えらぼう</h2><button class="snd-close" aria-label="とじる">✕</button></div>
        <p class="snd-lead">おすと きこえるよ。すきな おとに しよう</p>
        ${enabled() ? '' : '<p class="snd-warn">🔇 いまは おとが オフ だよ。みぎうえの 🔇 を おすと きこえるよ</p>'}
        <section class="snd-sec" data-cat="vol"><h3><span>🔊</span>おとの おおきさ</h3>
          <div class="snd-opts">${VOLUMES.map((v) => `<button class="snd-opt${conf.vol === v.id ? ' on' : ''}" data-id="${v.id}" aria-pressed="${conf.vol === v.id}"><span class="e">${v.e}</span>${v.name}</button>`).join('')}</div>
        </section>
        ${CATS.map(sec).join('')}
        <div class="snd-foot">
          <button class="snd-reset">↺ はじめの おとに もどす</button>
          <button class="snd-done">👍 できた</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const close = () => { wrap.remove(); document.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) { close(); return; }
      const b = e.target.closest('button');
      if (!b) return;
      if (b.classList.contains('snd-close') || b.classList.contains('snd-done')) { play('tap'); close(); return; }
      if (b.classList.contains('snd-reset')) {
        conf.vol = 'mid';
        CATS.forEach((c) => { conf.pick[c.id] = c.opts[0].id; });
        save(); openPanel(); play('tap'); return;
      }
      const s = b.closest('.snd-sec');
      if (!s || !b.dataset.id) return;
      const cat = s.dataset.cat;
      if (cat === 'vol') conf.vol = b.dataset.id;
      else conf.pick[cat] = b.dataset.id;
      save();
      s.querySelectorAll('.snd-opt').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      // えらんだ おとを ためしに ならす
      if (cat === 'vol') play('alarm');
      else if (cat === 'voice') speak('3時半だよ');
      else if (cat === 'tiktok') { [0, 1, 2, 3].forEach((i) => setTimeout(() => play('tiktok', i), i * 500)); }
      else if (cat === 'count') { [0, 1, 2].forEach((i) => setTimeout(() => play('count'), i * 400)); }
      else play(cat);
    });
    wrap.querySelector('.snd-close').focus({ preventScroll: true });
    wrap.scrollTop = 0;
  }

  window.AoSound = {
    init(fn) { enabled = fn; },
    tone, play, speak, openPanel, cats: CATS,
    // チクタク: n は なんびょうめか（こうごに ちがう おと）
    tick(n) { play('tiktok', n); }
  };
})();
