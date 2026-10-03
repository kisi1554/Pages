/* わらって いもほり
 * もんだいに こたえる → つるを ひっぱる → へんてこな いもが でてくる。
 */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rand(a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const PLOTS = 6;

  /* ================= ほぞん ================= */
  const KEY = 'waratte-imohori.v1';
  const save = { found: {}, total: 0, sound: true, mode: 'tashi10', fields: 0 };
  try { Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* つかえなくても あそべる */ }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* noop */ } }

  /* ================= おと（WebAudio） ================= */
  let ac = null;
  function ctx() {
    if (!save.sound) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { return null; }
    return ac;
  }
  function tone(f, dur, type = 'sine', vol = 0.2, when = 0, f2 = null) {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol = 0.2, ftype = 'lowpass', freq = 800, when = 0, freq2 = null) {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + when;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t);
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(c.destination);
    s.start(t); s.stop(t + dur + 0.05);
  }
  // ビヨーン系（ゆれる音）
  function wobble(f, f2, dur, rate, depth, type = 'sine', vol = 0.2, when = 0) {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    l.frequency.value = rate; lg.gain.value = depth;
    l.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); l.start(t); o.stop(t + dur + 0.05); l.stop(t + dur + 0.05);
  }
  const SND = {
    pop: () => tone(380, 0.14, 'sine', 0.3, 0, 1300),
    ok: () => { tone(880, 0.14, 'triangle', 0.25); tone(1320, 0.3, 'triangle', 0.25, 0.12); },
    ng: () => { tone(170, 0.16, 'square', 0.12); tone(125, 0.3, 'square', 0.12, 0.2); },
    tug: (p) => { tone(140 + p * 320, 0.09, 'sawtooth', 0.07, 0, 110 + p * 260); noise(0.07, 0.08, 'bandpass', 600); },
    suppon: () => { tone(200, 0.35, 'sine', 0.35, 0, 1600); noise(0.25, 0.15, 'highpass', 2000, 0.05); },
    boing: () => wobble(320, 110, 0.6, 14, 70, 'sine', 0.3),
    fart: () => {
      const d = 0.9 + Math.random() * 0.5;
      wobble(95, 58, d, 22 + rand(10), 28, 'sawtooth', 0.22);
      noise(d, 0.08, 'lowpass', 260);
      tone(70, 0.12, 'square', 0.1, d - 0.05, 50); // さいごの「ぷっ」
    },
    puri: () => { wobble(500, 300, 0.18, 30, 60, 'sine', 0.25); wobble(600, 340, 0.18, 30, 60, 'sine', 0.25, 0.22); },
    kyaa: () => { tone(700, 0.25, 'triangle', 0.18, 0, 1500); tone(1500, 0.35, 'triangle', 0.18, 0.25, 900); },
    snore: () => {
      for (let i = 0; i < 2; i++) {
        const w = i * 1.4;
        noise(0.8, 0.18, 'lowpass', 220, w);
        tone(65, 0.8, 'sawtooth', 0.06, w);
        tone(900, 0.45, 'sine', 0.08, w + 0.85, 1500);
      }
    },
    sneeze: () => {
      tone(420, 0.16, 'triangle', 0.15); tone(520, 0.16, 'triangle', 0.15, 0.3); tone(640, 0.2, 'triangle', 0.15, 0.6);
      noise(0.45, 0.45, 'highpass', 1200, 0.95); tone(300, 0.2, 'square', 0.12, 0.95, 120);
    },
    dance: () => { [523, 659, 784, 659, 880, 784, 659, 523].forEach((f, i) => tone(f, 0.16, 'square', 0.07, i * 0.17)); },
    fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.6 : 0.16, 'triangle', 0.22, i * 0.13)); },
    ghost: () => wobble(620, 260, 1.4, 6, 40, 'sine', 0.2),
    rocket: () => { noise(1.4, 0.25, 'bandpass', 300, 0, 3000); tone(90, 1.4, 'sawtooth', 0.08, 0, 900); },
    kira: () => { [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, 0.25, 'sine', 0.12, i * 0.08)); },
    tiny: () => tone(2600, 0.06, 'sine', 0.2),
    thud: () => { tone(90, 0.6, 'sine', 0.5, 0, 35); noise(0.4, 0.3, 'lowpass', 300); },
    chain: (i) => tone(300 + i * 70, 0.1, 'sine', 0.25, 0, 900 + i * 120),
    worm: () => wobble(260, 180, 0.4, 9, 30, 'triangle', 0.2),
    mole: () => { tone(900, 0.08, 'square', 0.1); tone(1200, 0.12, 'square', 0.1, 0.1); },
    oh: () => wobble(300, 150, 0.7, 5, 10, 'triangle', 0.18),
  };

  function setSoundIcon() { $('soundBtn').textContent = save.sound ? '🔊' : '🔇'; }
  $('soundBtn').addEventListener('click', () => { save.sound = !save.sound; persist(); setSoundIcon(); if (save.sound) SND.pop(); });
  setSoundIcon();

  /* ================= いもの え（SVG） ================= */
  const DARK = '#3a1a2a';
  const COLORS = {
    purple: { body: '#a3407c', line: '#6b2350', hi: '#d07aac' },
    gold: { body: '#f4c430', line: '#b07b0a', hi: '#fff3a0' },
    ghost: { body: '#e6dcff', line: '#8a74c4', hi: '#ffffff' },
  };
  function eyes(kind) {
    const L = 80, R = 120, Y = 68;
    const both = (fn) => fn(L) + fn(R);
    switch (kind) {
      case 'googly': return `<circle cx="${L}" cy="${Y}" r="15" fill="#fff" stroke="${DARK}" stroke-width="3"/><circle cx="${R}" cy="${Y - 2}" r="13" fill="#fff" stroke="${DARK}" stroke-width="3"/><circle cx="${L - 5}" cy="${Y + 5}" r="6" fill="${DARK}"/><circle cx="${R + 5}" cy="${Y - 8}" r="6" fill="${DARK}"/>`;
      case 'sleepy': return both((x) => `<path d="M${x - 9},${Y} q9,7 18,0" fill="none" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/>`);
      case 'happy': return both((x) => `<path d="M${x - 9},${Y + 3} q9,-12 18,0" fill="none" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/>`);
      case 'shut': return `<path d="M${L - 9},${Y - 6} l16,6 l-16,6" fill="none" stroke="${DARK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M${R + 9},${Y - 6} l-16,6 l16,6" fill="none" stroke="${DARK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
      case 'dot': return both((x) => `<circle cx="${x}" cy="${Y}" r="3.5" fill="${DARK}"/>`);
      case 'star': return both((x) => `<path transform="translate(${x},${Y})" d="M0,-12 L3.5,-4 12,-4 5,2 8,11 0,5.5 -8,11 -5,2 -12,-4 -3.5,-4Z" fill="#fff" stroke="${DARK}" stroke-width="2.5" stroke-linejoin="round"/>`);
      case 'big': return both((x) => `<ellipse cx="${x}" cy="${Y}" rx="9" ry="11" fill="${DARK}"/><circle cx="${x + 3}" cy="${Y - 4}" r="3.5" fill="#fff"/><circle cx="${x - 3}" cy="${Y + 4}" r="1.8" fill="#fff"/>`);
      default: return both((x) => `<circle cx="${x}" cy="${Y}" r="7" fill="${DARK}"/><circle cx="${x + 2.5}" cy="${Y - 2.5}" r="2.5" fill="#fff"/>`);
    }
  }
  function mouth(kind) {
    const s = `fill="none" stroke="${DARK}" stroke-width="4" stroke-linecap="round"`;
    switch (kind) {
      case 'laugh': return `<path d="M84,86 q16,28 32,0 z" fill="${DARK}" stroke="${DARK}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="100" cy="99" rx="8" ry="4.5" fill="#ef6b86"/>`;
      case 'tongue': return `<path d="M86,88 q14,12 28,0" ${s}/><path d="M93,93 q7,22 14,0 z" fill="#ef6b86" stroke="${DARK}" stroke-width="2.5"/>`;
      case 'o': return `<ellipse cx="100" cy="92" rx="6" ry="8" fill="${DARK}"/>`;
      case 'wavy': return `<path d="M84,92 q4,-5 8,0 q4,5 8,0 q4,-5 8,0 q4,5 8,0" ${s}/>`;
      case 'flat': return `<path d="M91,92 h18" ${s}/>`;
      default: return `<path d="M86,87 q14,14 28,0" ${s}/>`;
    }
  }
  const ACC = {
    cheeks: () => `<ellipse cx="66" cy="84" rx="9" ry="5.5" fill="#ff8fb3" opacity=".75"/><ellipse cx="134" cy="84" rx="9" ry="5.5" fill="#ff8fb3" opacity=".75"/>`,
    mustache: () => `<path d="M100,84 c-6,-9 -22,-11 -32,-2 c-4,4 -10,4 -12,0 c0,10 14,14 24,8 c8,-4 14,-6 20,-6 c6,0 12,2 20,6 c10,6 24,2 24,-8 c-2,4 -8,4 -12,0 c-10,-9 -26,-7 -32,2 z" fill="${DARK}"/>`,
    crown: () => `<path d="M74,34 l4,-26 l13,14 l9,-20 l9,20 l13,-14 l4,26 z" fill="#ffd23f" stroke="#b07b0a" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="24" r="4" fill="#e2384f"/>`,
    pants: () => `<path d="M46,104 Q100,94 154,104 L148,126 Q124,118 104,134 L96,134 Q76,118 52,126 Z" fill="#fff" stroke="${DARK}" stroke-width="3" stroke-linejoin="round"/>` +
      [[66, 110], [86, 107], [114, 107], [134, 110], [76, 121], [124, 121], [100, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#e2384f"/>`).join(''),
    afroBack: () => [[52, 46], [64, 24], [86, 10], [114, 10], [136, 24], [148, 46], [100, 22], [74, 34], [126, 34]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="22" fill="#2b1a22"/>`).join(''),
    sunglasses: () => `<rect x="62" y="58" width="34" height="22" rx="9" fill="${DARK}"/><rect x="104" y="58" width="34" height="22" rx="9" fill="${DARK}"/><path d="M96,66 h8" stroke="${DARK}" stroke-width="4"/><path d="M68,63 l8,0" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/><path d="M110,63 l8,0" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
    ribbon: () => `<g transform="translate(146,30) rotate(15)"><path d="M0,0 L-24,-14 L-24,14 Z" fill="#ff5c8a" stroke="#b8234f" stroke-width="2.5" stroke-linejoin="round"/><path d="M0,0 L24,-14 L24,14 Z" fill="#ff5c8a" stroke="#b8234f" stroke-width="2.5" stroke-linejoin="round"/><circle r="7" fill="#ff8fb3" stroke="#b8234f" stroke-width="2.5"/></g>`,
    sprout: () => `<path d="M100,26 q-2,-10 0,-16" stroke="#3c8a2e" stroke-width="4" fill="none"/><path d="M100,12 q-20,-12 -26,2 q14,8 26,-2z" fill="#5cc04a"/><path d="M100,12 q20,-12 26,2 q-14,8 -26,-2z" fill="#4caf3c"/>`,
    bubble: () => `<circle cx="113" cy="84" r="13" fill="#bfe9ff" fill-opacity=".7" stroke="#6bb8e0" stroke-width="2.5"/><path d="M107,78 q3,-3 7,-2" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    tenkan: () => `<path d="M88,40 l12,-18 l12,18 z" fill="#fff" stroke="#8a74c4" stroke-width="2.5" stroke-linejoin="round"/>`,
    sweat: () => `<path d="M156,46 q-8,12 0,16 q8,-4 0,-16z" fill="#7fd0ff" stroke="#3b9bd1" stroke-width="2"/>`,
    goggles: () => `<path d="M42,56 Q100,44 158,56" stroke="#e2384f" stroke-width="7" fill="none"/>`,
  };

  function imo(o = {}) {
    const col = COLORS[o.color || 'purple'];
    const acc = o.acc || [];
    let back = '', body = '';
    if (acc.includes('afro')) back += ACC.afroBack();
    if (o.body === 'butt') {
      body = `<path d="M100,40 C70,22 30,34 28,78 C26,118 70,132 100,112 C130,132 174,118 172,78 C170,34 130,22 100,40 Z" fill="${col.body}" stroke="${col.line}" stroke-width="4" stroke-linejoin="round"/>` +
        `<path d="M100,46 q-6,34 0,64" stroke="${col.line}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
        `<ellipse cx="62" cy="58" rx="16" ry="6" fill="${col.hi}" opacity=".7" transform="rotate(-20 62 58)"/><ellipse cx="138" cy="58" rx="16" ry="6" fill="${col.hi}" opacity=".7" transform="rotate(20 138 58)"/>` +
        `<ellipse cx="56" cy="96" rx="11" ry="6" fill="#ff8fb3" opacity=".6"/><ellipse cx="144" cy="96" rx="11" ry="6" fill="#ff8fb3" opacity=".6"/>`;
    } else if (o.body === 'ghost') {
      body = `<path d="M40,132 L40,76 C40,22 160,22 160,76 L160,132 q-10,-14 -20,0 q-10,14 -20,0 q-10,-14 -20,0 q-10,14 -20,0 q-10,-14 -20,0 q-10,14 -20,0 Z" fill="${col.body}" fill-opacity=".92" stroke="${col.line}" stroke-width="4" stroke-linejoin="round"/>` +
        `<ellipse cx="78" cy="44" rx="18" ry="6" fill="${col.hi}" opacity=".8" transform="rotate(-18 78 44)"/>`;
    } else {
      body = `<path d="M176,82 q14,-4 20,-16" stroke="${col.line}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M27,86 q-12,2 -19,12" stroke="${col.line}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
        `<path d="M28,78 C24,40 70,22 106,24 C150,26 180,50 176,82 C172,114 136,130 98,128 C58,126 32,112 28,78 Z" fill="${col.body}" stroke="${col.line}" stroke-width="4" stroke-linejoin="round"/>` +
        `<ellipse cx="78" cy="42" rx="24" ry="7" fill="${col.hi}" opacity=".75" transform="rotate(-12 78 42)"/>` +
        `<g stroke="${col.line}" stroke-width="3" stroke-linecap="round"><path d="M50,60 l5,3"/><path d="M152,62 l-5,3"/><path d="M62,112 l6,-2"/><path d="M140,110 l-6,-2"/></g>`;
    }
    let face = '';
    if (o.body !== 'butt') {
      face = eyes(o.eyes) + mouth(o.mouth);
      if (o.cheeks) face += ACC.cheeks();
    }
    let front = '';
    for (const a of acc) if (a !== 'afro' && ACC[a]) front += ACC[a]();
    if (o.color === 'gold') front += `<path d="M160,22 l3,9 9,3 -9,3 -3,9 -3,-9 -9,-3 9,-3z" fill="#fff"/><path d="M36,40 l2,6 6,2 -6,2 -2,6 -2,-6 -6,-2 6,-2z" fill="#fff"/>`;
    return `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${back}${body}${face}${front}</svg>`;
  }

  // もぐら
  function moleSVG() {
    return `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="100" cy="92" rx="66" ry="56" fill="#6d4c3d" stroke="#3d2a20" stroke-width="4"/>
      <ellipse cx="100" cy="104" rx="42" ry="34" fill="#c49a7a"/>
      <rect x="62" y="56" width="34" height="22" rx="9" fill="${DARK}"/><rect x="104" y="56" width="34" height="22" rx="9" fill="${DARK}"/>
      <path d="M96,64 h8" stroke="${DARK}" stroke-width="4"/><path d="M68,61 l8,0" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      <ellipse cx="100" cy="90" rx="12" ry="9" fill="#ff8fb3" stroke="#b8234f" stroke-width="2.5"/>
      <path d="M90,104 q10,8 20,0" fill="none" stroke="${DARK}" stroke-width="3.5" stroke-linecap="round"/>
      <g fill="#ffb6c9" stroke="#b8234f" stroke-width="2"><ellipse cx="44" cy="112" rx="16" ry="11"/><ellipse cx="156" cy="112" rx="16" ry="11"/></g>
      <g stroke="#3d2a20" stroke-width="2.5" stroke-linecap="round"><path d="M80,92 l-22,-4"/><path d="M80,98 l-22,4"/><path d="M120,92 l22,-4"/><path d="M120,98 l22,4"/></g>
    </svg>`;
  }
  // いもむし
  function wormSVG() {
    let seg = '';
    [[44, 108, 20], [74, 100, 22], [104, 104, 22], [134, 96, 24]].forEach(([x, y, r]) => {
      seg += `<circle cx="${x}" cy="${y}" r="${r}" fill="#8ed16a" stroke="#3c8a2e" stroke-width="4"/><path d="M${x - 6},${y + r - 2} v8 M${x + 6},${y + r - 2} v8" stroke="#3c8a2e" stroke-width="4" stroke-linecap="round"/>`;
    });
    return `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${seg}
      <circle cx="160" cy="70" r="30" fill="#a8e07f" stroke="#3c8a2e" stroke-width="4"/>
      <path d="M150,44 q-6,-16 -14,-18 M170,44 q6,-16 14,-18" stroke="#3c8a2e" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="136" cy="26" r="5" fill="#ffd23f"/><circle cx="184" cy="26" r="5" fill="#ffd23f"/>
      <circle cx="150" cy="66" r="5" fill="${DARK}"/><circle cx="170" cy="66" r="5" fill="${DARK}"/>
      <circle cx="152" cy="64" r="1.8" fill="#fff"/><circle cx="172" cy="64" r="1.8" fill="#fff"/>
      <path d="M150,80 q10,9 20,0" fill="none" stroke="${DARK}" stroke-width="3.5" stroke-linecap="round"/>
      <ellipse cx="142" cy="78" rx="6" ry="4" fill="#ff8fb3" opacity=".7"/><ellipse cx="178" cy="78" rx="6" ry="4" fill="#ff8fb3" opacity=".7"/>
    </svg>`;
  }

  // にょこすけ（「にょこにょこ えきめぐり」の いもむし）。いもを ひっぱる やく
  function nyoko(face = 'normal', vine = false) {
    const O = '#3f7f25', K = '#222';
    const hx = 70, hy = 54, hr = 25;
    let g = '';
    if (vine) g += `<path d="M84,66 C86,100 80,130 80,160" stroke="#3c8a2e" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    // からだ（しっぽ → くび）
    const segs = [[118, 146, 10], [102, 150, 11], [86, 150, 12], [70, 146, 13], [58, 134, 14], [54, 116, 15], [58, 98, 15], [64, 82, 15]];
    segs.forEach(([x, y, r], i) => {
      g += `<ellipse cx="${x}" cy="${y + r - 1}" rx="3.5" ry="4" fill="${O}"/>`;
      g += `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 2 ? '#8ad65a' : '#9fe36c'}" stroke="${O}" stroke-width="3"/>`;
      g += `<circle cx="${x - r * 0.3}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="#fff" fill-opacity=".45"/>`;
      if (i % 2 === 0 && i > 0) g += `<circle cx="${x}" cy="${y + 1}" r="2.8" fill="#ffd43b"/>`;
    });
    // しょっかく
    g += `<path d="M${hx - 5},${hy - 20} Q${hx - 9},${hy - 36} ${hx - 14},${hy - 46}" stroke="${O}" stroke-width="3" fill="none"/>`;
    g += `<path d="M${hx + 8},${hy - 20} Q${hx + 11},${hy - 36} ${hx + 14},${hy - 45}" stroke="${O}" stroke-width="3" fill="none"/>`;
    g += `<circle cx="${hx - 14}" cy="${hy - 46}" r="5.5" fill="#ff8fab" stroke="${O}" stroke-width="2"/><circle cx="${hx + 14}" cy="${hy - 45}" r="5.5" fill="#ff8fab" stroke="${O}" stroke-width="2"/>`;
    // あたま
    g += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="#a8ea72" stroke="${O}" stroke-width="3"/><circle cx="${hx - 7}" cy="${hy - 9}" r="7" fill="#fff" fill-opacity=".4"/>`;
    // め
    const E = [[hx + 3, hy - 6, 7.5], [hx + 16, hy - 7, 6.6]];
    const st = `stroke="${K}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    E.forEach(([x, y, r], i) => {
      if (face === 'normal' || face === 'flat') g += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${K}" stroke-width="2"/><circle cx="${x + 2}" cy="${y + 0.7}" r="${r * 0.5}" fill="${K}"/><circle cx="${x + 3}" cy="${y - 1.2}" r="1.5" fill="#fff"/>`;
      else if (face === 'wow') g += `<circle cx="${x}" cy="${y}" r="${r + 1.2}" fill="#fff" stroke="${K}" stroke-width="2"/><circle cx="${x + 0.6}" cy="${y}" r="${r * 0.25}" fill="${K}"/>`;
      else if (face === 'laugh' || face === 'happy') g += `<path d="M${x - r * 0.75},${y + 2} Q${x},${y - r * 0.9} ${x + r * 0.75},${y + 2}" ${st}/>`;
      else if (face === 'scrunch' || face === 'effort') { const d = i ? -1 : 1; g += `<path d="M${x - 4 * d},${y - 4} L${x + 4 * d},${y} L${x - 4 * d},${y + 4}" ${st}/>`; }
      else if (face === 'dizzy') g += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${K}" stroke-width="2"/><path d="M${x},${y} m-1,0 a1,1 0 1,1 2,0 a2.5,2.5 0 1,1 -5,0 a4,4 0 1,1 8,0" stroke="${K}" stroke-width="1.6" fill="none"/>`;
      else if (face === 'love') g += `<path transform="translate(${x},${y})" d="M0,5 C-9,-1 -6,-9 0,-4 C6,-9 9,-1 0,5Z" fill="#ff4d6d"/>`;
    });
    // ほっぺ
    g += `<circle cx="${hx - 3}" cy="${hy + 8}" r="5" fill="#ff7896" fill-opacity=".55"/>`;
    // くち
    const mx = hx + 12, my = hy + 9;
    if (face === 'laugh') g += `<path d="M${mx - 7},${my - 1} h14 a7,7 0 0,1 -14,0z" fill="#b3261e"/><circle cx="${mx}" cy="${my + 3}" r="2.8" fill="#ff8fa3"/>`;
    else if (face === 'wow') g += `<ellipse cx="${mx}" cy="${my + 1}" rx="4" ry="5.5" fill="#b3261e"/>`;
    else if (face === 'scrunch' || face === 'flat') g += `<path d="M${mx - 5},${my + 1} h10" ${st}/>`;
    else if (face === 'effort') g += `<rect x="${mx - 7}" y="${my - 3}" width="14" height="8" rx="3" fill="#fff" stroke="${K}" stroke-width="2"/><path d="M${mx - 7},${my + 1} h14" stroke="${K}" stroke-width="1.5"/>`;
    else if (face === 'dizzy') g += `<path d="M${mx - 6},${my} l3,-2.5 l3,2.5 l3,-2.5 l3,2.5" ${st}/>`;
    else g += `<path d="M${mx - 6},${my - 2} Q${mx},${my + 5} ${mx + 6},${my - 2}" ${st}/>`;
    if (face === 'effort') g += `<path d="M${hx - 26},${hy - 22} q-6,9 0,12 q6,-3 0,-12z" fill="#74c0fc"/>`;
    if (face === 'scrunch') g += `<circle cx="${hx + 26}" cy="${hy + 1}" r="2.6" fill="#ff8fab"/>`;
    return `<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${g}</svg>`;
  }

  // れんけつ（ずかん・サムネ用）
  function chainSVG() {
    const one = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})"><path d="M28,78 C24,40 70,22 106,24 C150,26 180,50 176,82 C172,114 136,130 98,128 C58,126 32,112 28,78 Z" fill="#a3407c" stroke="#6b2350" stroke-width="6"/><circle cx="82" cy="70" r="9" fill="${DARK}"/><circle cx="122" cy="70" r="9" fill="${DARK}"/><path d="M86,90 q14,14 28,0" fill="none" stroke="${DARK}" stroke-width="6" stroke-linecap="round"/></g>`;
    return `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10,40 C40,60 60,100 100,90 S170,60 196,110" stroke="#3c8a2e" stroke-width="4" fill="none"/>
      ${one(0, 30, 0.32)}${one(42, 62, 0.32)}${one(86, 58, 0.32)}${one(130, 72, 0.32)}${one(30, 96, 0.26)}${one(110, 100, 0.26)}
    </svg>`;
  }

  /* ================= ごほうび（へんてこ いも） ================= */
  const R = [
    { id: 'futsu', name: 'ふつうの いも', serif: '……ふつうです。', desc: 'なにも おきない。それが かえって おもしろい。', svg: { eyes: 'dot', mouth: 'flat' }, anim: 'a-land', snd: 'oh', w: 4, kid: ['flat', 'ふつうだ…'] },
    { id: 'bero', name: 'べろべろ いも', serif: 'べろべろ ばあ〜〜！', desc: 'めが ぎょろぎょろ。したを ぺろーん。', svg: { eyes: 'googly', mouth: 'tongue' }, anim: 'a-wiggle', snd: 'boing', fx: 'pop', kid: ['laugh', 'へんなかお！'] },
    { id: 'onara', name: 'おなら いも', serif: 'ぷぅ〜〜〜っ！', desc: 'ほりだした とたんに おならを した。くさい！', svg: { eyes: 'happy', mouth: 'o', cheeks: true }, anim: 'a-fart', fx: 'fart', kid: ['scrunch', 'くさっ！'] },
    { id: 'pantsu', name: 'パンツ いも', serif: 'いや〜ん！ みないで〜！', desc: 'つちの なかで パンツを はいていた。みずたま もよう。', svg: { eyes: 'shut', mouth: 'wavy', cheeks: true, acc: ['pants', 'sweat'] }, anim: 'a-shy', snd: 'kyaa', fx: 'hearts', kid: ['wow', 'ごめん！'] },
    { id: 'oshiri', name: 'おしり いも', serif: 'ぷりんっ ぷりんっ♪', desc: 'どこから みても おしり。かおは どこ？', svg: { body: 'butt' }, anim: 'a-twerk', snd: 'puri', fx: 'puri', kid: ['laugh', 'おしりだ〜！'] },
    { id: 'ousama', name: 'ひげの おうさま いも', serif: 'わしが いもの おうさま じゃ！', desc: 'りっぱな ひげと かんむり。ちょっと いばっている。', svg: { eyes: 'normal', mouth: 'smile', acc: ['mustache', 'crown'] }, anim: 'a-land', snd: 'fanfare', fx: 'confetti', kid: ['happy', 'ははーっ！'] },
    { id: 'afro', name: 'アフロ いも', serif: 'イェーイ！ ノってるかーい！', desc: 'つちの なかで パーマを かけた。', svg: { mouth: 'laugh', acc: ['afro', 'sunglasses'] }, anim: 'a-dance', snd: 'dance', fx: 'notes', kid: ['laugh', 'イェーイ！'] },
    { id: 'nebo', name: 'ねぼすけ いも', serif: 'むにゃむにゃ… あと 5ふん…', desc: 'ほりだしても おきない。はなちょうちんが でている。', svg: { eyes: 'sleepy', mouth: 'o', acc: ['bubble'] }, anim: 'a-sleep', snd: 'snore', fx: 'zzz', night: true, kid: ['effort', 'おきてー！'] },
    { id: 'kushami', name: 'くしゃみ いも', serif: 'は… は… はっくしょーん！！', desc: 'はなに つちが はいって くしゃみが とまらない。', svg: { eyes: 'shut', mouth: 'laugh' }, anim: 'a-sneeze', snd: 'sneeze', fx: 'sneeze', kid: ['dizzy', 'うわー！'] },
    { id: 'dance', name: 'おどる いも', serif: 'いも いも ダンス〜♪', desc: 'ほりだされて うれしくて おどりだした。', svg: { eyes: 'happy', mouth: 'laugh', cheeks: true, acc: ['sprout'] }, anim: 'a-dance', snd: 'dance', fx: 'notes', kid: ['laugh', 'いっしょに！'] },
    { id: 'jumbo', name: 'ジャンボ いも', serif: 'ドーーーン！！', desc: 'おおきすぎて しりもちを ついた。', svg: { eyes: 'normal', mouth: 'laugh', cheeks: true }, anim: 'a-jumbo', snd: 'thud', fx: 'fall', pulls: 12, pullMsg: 'お、おもい…！ がんばれ〜！', kid: ['dizzy', 'すってんころりん！'] },
    { id: 'chibi', name: 'ちっちゃいも', serif: '……ぴっ。', desc: 'すごく がんばって ひっぱったのに、これ だけ。', svg: { eyes: 'normal', mouth: 'o' }, anim: 'a-chibi', snd: 'tiny', fx: 'chibi', pulls: 12, pullMsg: 'これは おおものの よかん…！', kid: ['flat', 'ちっちゃ！'] },
    { id: 'renketsu', name: 'いもいも れんけつ', serif: 'まだまだ でるよ〜！', desc: 'ひっぱっても ひっぱっても いもが つながって でてくる。', special: 'chain', pulls: 9, count: 8, kid: ['laugh', 'まだでる〜！'] },
    { id: 'mogura', name: 'サングラス もぐら', serif: 'まぶしっ！ …いもじゃ ないよ。', desc: 'いもだと おもったら もぐらだった。', special: 'mole', anim: 'a-wiggle', snd: 'mole', count: 0, kid: ['wow', 'もぐら!?'] },
    { id: 'imomushi', name: 'いもむし', serif: 'いも…むし です。よろしく。', desc: '「いも」は「いも」でも、むしの ほう。にょこすけの いとこ らしい。', special: 'worm', anim: 'a-wiggle', snd: 'worm', count: 0, kid: ['love', 'いとこだ〜！'] },
    { id: 'imouto', name: 'いもうと', serif: 'みつけてくれて ありがと♪', desc: '「いも」は「いも」でも、いもうと だった。', svg: { eyes: 'big', mouth: 'smile', cheeks: true, acc: ['ribbon'] }, anim: 'a-wiggle', snd: 'kira', fx: 'hearts', kid: ['wow', 'いもうと!?'] },
    { id: 'obake', name: 'おばけ いも', serif: 'うらめし いも〜〜', desc: 'ふわふわ うかぶ。ぜんぜん こわくない。', svg: { body: 'ghost', color: 'ghost', eyes: 'shut', mouth: 'tongue', acc: ['tenkan'] }, anim: 'a-float', snd: 'ghost', night: true, kid: ['wow', 'でた〜！'] },
    { id: 'rocket', name: 'ロケット いも', serif: 'いってきまーす！', desc: 'ほりだした とたん、うちゅうへ とんでいった。', svg: { eyes: 'happy', mouth: 'laugh', acc: ['goggles'] }, anim: 'a-rocket', fx: 'rocket', kid: ['wow', 'いってらっしゃーい！'] },
    { id: 'kin', name: 'きんの いも', serif: 'キラーン☆', desc: 'めったに でない まぼろしの いも。すごい！', svg: { color: 'gold', eyes: 'star', mouth: 'laugh' }, anim: 'a-gold', snd: 'fanfare', fx: 'sparkle', gold: true, w: 1.2, rare: true, kid: ['love', 'すごーい！'] },
  ];
  const byId = Object.fromEntries(R.map((r) => [r.id, r]));
  function art(r) {
    if (r.special === 'mole') return moleSVG();
    if (r.special === 'worm') return wormSVG();
    if (r.special === 'chain') return chainSVG();
    return imo(r.svg);
  }
  function chooseReward(combo) {
    const pool = R.map((r) => {
      let w = r.w ?? 6;
      if (!save.found[r.id]) w *= 2; // まだ みつけていない いもが でやすい
      if (r.id === 'kin' && combo >= 3) w *= 4; // れんぞく せいかいで きんの いもが でやすい
      if (r.id === lastReward) w *= 0.15;
      return [r, w];
    });
    let t = pool.reduce((s, [, w]) => s + w, 0) * Math.random();
    for (const [r, w] of pool) { if ((t -= w) <= 0) return r; }
    return R[0];
  }
  let lastReward = null;

  /* ================= もんだい ================= */
  const MODES = [
    { id: 'tashi10', icon: '＋', name: 'たしざん', desc: '10までの たしざん（いもで かぞえられる）', c: '#f08a24', t: '#fff1e2' },
    { id: 'keisan20', icon: '±', name: 'たしざん・ひきざん', desc: '20までの けいさん', c: '#e2588f', t: '#fde8f0' },
    { id: 'kuku', icon: '×', name: 'かけざん', desc: 'くくの もんだい', c: '#7b4fd6', t: '#f0e9fd' },
    { id: 'kanji1', icon: '山', name: '1ねんせいの かんじ', desc: 'かんじの よみかた', c: '#3fa34d', t: '#e7f7e4' },
    { id: 'kanji2', icon: '海', name: '2ねんせいの かんじ', desc: 'よみかた と かきかた', c: '#1a7fc1', t: '#e4f2fc' },
    { id: 'nazo', icon: '？', name: 'なぞなぞ', desc: 'わらえる なぞなぞ', c: '#c9971c', t: '#fff7da' },
    { id: 'mix', icon: '🎲', name: 'ぜんぶ まぜる', desc: 'いろんな もんだいが でるよ', c: '#8a4b2a', t: '#f7ead9' },
  ];
  const modeById = Object.fromEntries(MODES.map((m) => [m.id, m]));

  // [かんじ, よみ, えもじ]
  const K1 = [
    ['山', 'やま', '⛰️'], ['川', 'かわ', '🏞️'], ['花', 'はな', '🌸'], ['犬', 'いぬ', '🐶'], ['月', 'つき', '🌙'],
    ['火', 'ひ', '🔥'], ['水', 'みず', '💧'], ['木', 'き', '🌳'], ['雨', 'あめ', '☔'], ['空', 'そら', '☁️'],
    ['森', 'もり', '🌲'], ['虫', 'むし', '🐛'], ['石', 'いし', '🪨'], ['手', 'て', '✋'], ['足', 'あし', '🦶'],
    ['目', 'め', '👀'], ['口', 'くち', '👄'], ['耳', 'みみ', '👂'], ['車', 'くるま', '🚗'], ['草', 'くさ', '🌱'],
    ['竹', 'たけ', '🎋'], ['貝', 'かい', '🐚'], ['赤', 'あか', '🟥'], ['青', 'あお', '🟦'], ['白', 'しろ', '⬜'],
    ['王', 'おう', '👑'], ['糸', 'いと', '🧵'], ['人', 'ひと', '🧍'], ['上', 'うえ', '⬆️'], ['下', 'した', '⬇️'],
    ['右', 'みぎ', '👉'], ['左', 'ひだり', '👈'], ['本', 'ほん', '📕'], ['金', 'かね', '💰'], ['田', 'た', '🌾'],
    ['町', 'まち', '🏘️'], ['村', 'むら', '🛖'], ['男', 'おとこ', '👦'], ['女', 'おんな', '👧'], ['子', 'こ', '👶'],
    ['玉', 'たま', '🔮'], ['字', 'じ', '✏️'], ['音', 'おと', '🔔'], ['夕', 'ゆう', '🌇'], ['先', 'さき', '👆'],
  ];
  const K2 = [
    ['魚', 'さかな', '🐟'], ['鳥', 'とり', '🐦'], ['馬', 'うま', '🐴'], ['牛', 'うし', '🐮'], ['星', 'ほし', '⭐'],
    ['雪', 'ゆき', '❄️'], ['海', 'うみ', '🌊'], ['池', 'いけ', '🪷'], ['顔', 'かお', '😀'], ['頭', 'あたま', '🧠'],
    ['首', 'くび', '🦒'], ['毛', 'け', '🧶'], ['肉', 'にく', '🍖'], ['米', 'こめ', '🍚'], ['麦', 'むぎ', '🌾'],
    ['光', 'ひかり', '✨'], ['風', 'かぜ', '🌬️'], ['春', 'はる', '🌷'], ['夏', 'なつ', '🌻'], ['秋', 'あき', '🍁'],
    ['冬', 'ふゆ', '⛄'], ['朝', 'あさ', '🌅'], ['昼', 'ひる', '🕛'], ['夜', 'よる', '🌃'], ['声', 'こえ', '📣'],
    ['歌', 'うた', '🎤'], ['絵', 'え', '🎨'], ['船', 'ふね', '🚢'], ['紙', 'かみ', '📄'], ['羽', 'はね', '🪶'],
    ['弓', 'ゆみ', '🏹'], ['刀', 'かたな', '🗡️'], ['茶', 'ちゃ', '🍵'], ['岩', 'いわ', '🪨'], ['門', 'もん', '⛩️'],
    ['兄', 'あに', '👦'], ['姉', 'あね', '👧'], ['弟', 'おとうと', '🧒'], ['妹', 'いもうと', '🎀'], ['電車', 'でんしゃ', '🚃'],
    ['時計', 'とけい', '⏰'], ['公園', 'こうえん', '🛝'], ['黄色', 'きいろ', '🟨'], ['親子', 'おやこ', '👨‍👧'], ['谷', 'たに', '🏔️'],
  ];
  // [もんだい, こたえ, ちがう こたえ×3]
  const NAZO = [
    ['いもは いもでも、たべられない いもは なーんだ？', 'いもうと', ['さつまいも', 'じゃがいも', 'さといも']],
    ['パンは パンでも、たべられない パンは なーんだ？', 'フライパン', ['メロンパン', 'あんパン', 'しょくパン']],
    ['とりは とりでも、とべない とりは なーんだ？', 'ちりとり', ['すずめ', 'からす', 'つばめ']],
    ['くるまは くるまでも、のれない くるまは なーんだ？', 'かざぐるま', ['きゅうきゅうしゃ', 'バス', 'タクシー']],
    ['うしは うしでも、あたまに かぶる うしは なーんだ？', 'ぼうし', ['ホルスタイン', 'こうし', 'うしがえる']],
    ['はしは はしでも、ごはんを たべる はしは なーんだ？', 'おはし', ['つりばし', 'いしばし', 'てっきょう']],
    ['のりは のりでも、ひとが のる のりは なーんだ？', 'のりもの', ['やきのり', 'あじつけのり', 'のりまき']],
    ['かめは かめでも、しゃしんを とる かめは なーんだ？', 'カメラ', ['うみがめ', 'ぞうがめ', 'すっぽん']],
    ['きは きでも、たべると あまい きは なーんだ？', 'ケーキ', ['さくらの き', 'まつの き', 'きのみ']],
    ['かえるは かえるでも、ころんと する かえるは なーんだ？', 'ひっくりかえる', ['あまがえる', 'ひきがえる', 'とのさまがえる']],
    ['いすは いすでも、つめたくて たべられる いすは なーんだ？', 'アイス', ['ソファ', 'ベンチ', 'こしかけ']],
    ['いもを たくさん たべると、おしりから でやすい ものは なーんだ？', 'おなら', ['しゃっくり', 'くしゃみ', 'あくび']],
    ['かさは かさでも、ひざに できる かさは なーんだ？', 'かさぶた', ['ひがさ', 'あまがさ', 'かさたて']],
    ['たたくと おこらずに よろこぶ ものは なーんだ？', 'たいこ', ['ハチ', 'かみなり', 'いぬ']],
    ['ぞうは ぞうでも、つめたい ぞうは なーんだ？', 'れいぞうこ', ['アフリカぞう', 'インドぞう', 'こぞう']],
  ];

  const recent = [];
  function notRecent(key) {
    if (recent.includes(key)) return false;
    recent.push(key); if (recent.length > 12) recent.shift();
    return true;
  }
  function numChoices(ans, spread, min = 0) {
    const set = new Set([ans]);
    let guard = 0;
    while (set.size < 4 && guard++ < 100) {
      const d = (rand(spread) + 1) * (Math.random() < 0.5 ? -1 : 1);
      const v = ans + d;
      if (v >= min) set.add(v);
    }
    let v = ans + 1; while (set.size < 4) set.add(v++);
    return shuffle([...set]).map(String);
  }
  const imos = (n) => '🍠'.repeat(n);

  function makeQuestion(mode) {
    if (mode === 'mix') mode = pick(['tashi10', 'keisan20', 'kuku', 'kanji1', 'kanji2', 'nazo']);
    const m = modeById[mode];
    for (let tries = 0; tries < 30; tries++) {
      let q;
      if (mode === 'tashi10') {
        const a = 1 + rand(9), b = 1 + rand(10 - a);
        q = { key: `t${a}+${b}`, q: `${a} ＋ ${b} ＝ ？`, ans: String(a + b), choices: numChoices(a + b, 3, 1),
          hint: `${imos(a)}<span class="plus">＋</span>${imos(b)}` };
      } else if (mode === 'keisan20') {
        if (Math.random() < 0.5) {
          const a = 2 + rand(17), b = 1 + rand(Math.max(1, 20 - a));
          q = { key: `k${a}+${b}`, q: `${a} ＋ ${b} ＝ ？`, ans: String(a + b), choices: numChoices(a + b, 3, 1) };
        } else {
          const a = 5 + rand(16), b = 1 + rand(a - 1);
          q = { key: `k${a}-${b}`, q: `${a} − ${b} ＝ ？`, ans: String(a - b), choices: numChoices(a - b, 3, 0) };
        }
      } else if (mode === 'kuku') {
        const a = 1 + rand(9), b = 1 + rand(9);
        const ans = a * b;
        const set = new Set([ans, a * (b + 1), a * Math.max(1, b - 1), (a + 1) * b, ans + 1, ans - 1].filter((v) => v > 0 && v !== ans));
        q = { key: `x${a}x${b}`, q: `${a} × ${b} ＝ ？`, ans: String(ans), choices: shuffle([ans, ...shuffle([...set]).slice(0, 3)]).map(String) };
      } else if (mode === 'kanji1' || mode === 'kanji2') {
        const list = mode === 'kanji1' ? K1 : K2;
        const [kj, yomi, emo] = pick(list);
        const others = shuffle(list.filter((x) => x[1] !== yomi));
        if (mode === 'kanji2' && Math.random() < 0.4) {
          // よみ → かんじ
          q = { key: `w${kj}`, q: `${emo} 「${yomi}」<small>を かんじで かくと？</small>`, cls: 'text center', ans: kj,
            choices: shuffle([kj, ...others.slice(0, 3).map((x) => x[0])]), kj: true };
        } else {
          q = { key: `r${kj}`, q: `${kj}<small>なんて よむ？</small>`, cls: 'kanji', ans: yomi,
            choices: shuffle([yomi, ...others.slice(0, 3).map((x) => x[1])]), hintLater: emo };
        }
      } else {
        const [qq, ans, wrong] = pick(NAZO);
        q = { key: `n${ans}`, q: qq, cls: 'text', ans, choices: shuffle([ans, ...wrong]), small: true };
      }
      q.mode = m;
      if (notRecent(q.key) || tries === 29) return q;
    }
  }

  /* ================= がめん ================= */
  const screens = ['title', 'field', 'result', 'zukan'];
  function show(id) {
    for (const s of screens) $(s).hidden = s !== id;
    window.scrollTo(0, 0);
    updateBar(id);
  }
  function updateBar(id) {
    const m = modeById[save.mode];
    $('barTitle').textContent = id === 'field' || id === 'result' ? m.name : 'わらって いもほり';
    $('barCount').textContent = id === 'field' ? `🍠 ${run.got}` : '';
  }

  /* ---------- タイトル ---------- */
  function renderTitle() {
    $('titleHero').innerHTML = imo({ eyes: 'happy', mouth: 'laugh', cheeks: true, acc: ['sprout'] });
    $('modes').innerHTML = MODES.map((m) =>
      `<button class="mode${m.id === save.mode ? ' sel' : ''}" type="button" data-mode="${m.id}" style="--c:${m.c};--t:${m.t}">
        <span class="mi">${m.icon}</span><span><span class="mn">${m.name}</span><span class="md">${m.desc}</span></span></button>`).join('');
    const n = Object.keys(save.found).length;
    $('zukanCount').textContent = `${n}/${R.length}`;
    $('lifetime').textContent = save.total ? `これまでに ほった いも： ${save.total}こ` : '';
    show('title');
  }
  $('modes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]'); if (!b) return;
    save.mode = b.dataset.mode; persist();
    SND.pop();
    startField(true);
  });
  $('homeBtn').addEventListener('click', () => { closeOverlays(); renderTitle(); });

  /* ---------- はたけ ---------- */
  const run = { field: 0, plots: [], got: 0, combo: 0, firstTry: 0, busy: false };

  function leafSVG(seed) {
    const tilt = (seed % 3 - 1) * 6;
    return `<svg viewBox="0 0 120 126" aria-hidden="true">
      <ellipse cx="60" cy="104" rx="44" ry="16" fill="#6d3d1f"/>
      <ellipse cx="60" cy="100" rx="36" ry="11" fill="#9a6038"/>
      <g class="leaves" transform="rotate(${tilt} 60 100)">
        <path d="M60,100 C58,80 62,60 60,44" stroke="#3c8a2e" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M60,52 C40,30 18,46 30,64 C38,74 54,64 60,52Z" fill="#5cc04a" stroke="#2f7a24" stroke-width="3"/>
        <path d="M60,48 C80,24 104,40 92,60 C84,72 66,62 60,48Z" fill="#4caf3c" stroke="#2f7a24" stroke-width="3"/>
        <path d="M60,46 C52,22 66,8 74,20 C80,32 66,40 60,46Z" fill="#6fd25a" stroke="#2f7a24" stroke-width="3"/>
      </g></svg>`;
  }
  function holeSVG(r) {
    return `<svg viewBox="0 0 120 126" aria-hidden="true">
      <ellipse cx="60" cy="104" rx="46" ry="17" fill="#4a2814"/>
      <ellipse cx="60" cy="102" rx="34" ry="10" fill="#2e180b"/>
      <g class="thumb" transform="translate(14,34) scale(.46)">${art(r).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g></svg>`;
  }

  function startField(fresh) {
    if (fresh) run.field = 0;
    run.field++;
    run.plots = Array.from({ length: PLOTS }, () => null);
    run.got = 0; run.firstTry = 0; run.busy = false;
    $('fieldNo').textContent = `はたけ ${run.field}`;
    renderPlots();
    show('field');
  }
  function renderPlots() {
    $('plots').innerHTML = run.plots.map((r, i) => r
      ? `<button class="plot dug" type="button" data-i="${i}" aria-label="${r.name}">${holeSVG(r)}</button>`
      : `<button class="plot" type="button" data-i="${i}" aria-label="つる ${i + 1}">${leafSVG(i + run.field)}</button>`).join('');
    const left = run.plots.filter((x) => !x).length;
    $('fieldLeft').textContent = `のこり ${left}ぽん`;
    updateBar('field');
  }
  $('plots').addEventListener('click', (e) => {
    const b = e.target.closest('.plot'); if (!b || run.busy) return;
    const i = +b.dataset.i;
    if (run.plots[i]) { const r = run.plots[i]; SND.pop(); flashMsg(b, r.serif); return; }
    run.busy = true;
    SND.pop();
    askQuestion(i);
  });
  function flashMsg(el, text) {
    const d = document.createElement('div');
    d.textContent = text;
    Object.assign(d.style, { position: 'absolute', left: '50%', top: '-6px', transform: 'translateX(-50%)', background: '#fff', borderRadius: '10px', padding: '2px 8px', fontWeight: 800, fontSize: '13px', whiteSpace: 'nowrap', zIndex: 2, boxShadow: '0 2px 0 rgba(0,0,0,.2)' });
    el.appendChild(d); setTimeout(() => d.remove(), 1400);
  }

  /* ---------- もんだい ---------- */
  let cur = null;
  function askQuestion(plotIndex) {
    const q = makeQuestion(save.mode);
    cur = { q, plotIndex, miss: 0 };
    $('quizTag').textContent = `${q.mode.icon} ${q.mode.name}`;
    $('quizTag').style.setProperty('--c', q.mode.c);
    const qe = $('quizQ');
    qe.className = 'quiz-q ' + (q.cls || '');
    qe.innerHTML = q.q;
    $('quizHint').innerHTML = q.hint || '';
    $('choices').innerHTML = q.choices.map((c, i) =>
      `<button class="choice${q.small || c.length > 5 ? ' small' : ''}${q.kj ? ' kj' : ''}" type="button" data-i="${i}">${c}</button>`).join('');
    $('quizMsg').innerHTML = '';
    $('quiz').hidden = false;
  }
  const WRONG = ['ちがうよ〜', 'おしい！', 'ブッブー！', 'うーん、ざんねん！'];
  $('choices').addEventListener('click', async (e) => {
    const b = e.target.closest('.choice'); if (!b || !cur || cur.done) return;
    const val = cur.q.choices[+b.dataset.i];
    if (val === cur.q.ans) {
      cur.done = true;
      b.classList.add('ok');
      SND.ok();
      const first = cur.miss === 0;
      if (first) { run.combo++; run.firstTry++; } else run.combo = 0;
      $('quizMsg').innerHTML = first
        ? (run.combo >= 3 ? `🔥 ${run.combo}かい れんぞく せいかい！ すごい！` : '⭕ せいかい！ ひっぱれ〜！')
        : '⭕ せいかい！ よく がんばった！';
      await wait(850);
      $('quiz').hidden = true;
      startPull(chooseReward(run.combo));
    } else {
      cur.miss++;
      b.classList.add('ng');
      SND.ng(); setTimeout(SND.worm, 250);
      let msg = `<span class="worm">🪱</span> ${pick(WRONG)} もういっかい！`;
      if (cur.q.hintLater && cur.miss === 1) msg += `<br>ヒント： ${cur.q.hintLater}`;
      $('quizMsg').innerHTML = msg;
    }
  });
  document.addEventListener('keydown', (e) => {
    if (!$('quiz').hidden && /^[1-4]$/.test(e.key)) { const b = $('choices').children[+e.key - 1]; if (b) b.click(); }
    if (!$('pull').hidden && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); tug(); }
    if (!$('reveal').hidden && e.key === 'Enter' && $('revealCard').classList.contains('show')) $('revealNext').click();
  });

  /* ---------- ひっぱる ---------- */
  let pull = null;
  const SHOUTS = ['うんとこしょ！', 'どっこいしょ！'];
  function startPull(reward) {
    pull = { reward, n: 0, need: reward.pulls || 6, done: false };
    $('pullMsg').textContent = reward.pullMsg || 'れんだで ひっぱれ〜！';
    $('gauge').style.width = '0%';
    $('pullShout').textContent = '';
    $('pullKid').innerHTML = nyoko('normal', true);
    $('pullBump').style.setProperty('--b', .6);
    $('pull').hidden = false;
  }
  function tug() {
    if (!pull || pull.done) return;
    pull.n++;
    const p = pull.n / pull.need;
    SND.tug(p);
    $('gauge').style.width = `${Math.min(100, p * 100)}%`;
    $('pullBump').style.setProperty('--b', 0.6 + p * (pull.reward.id === 'jumbo' || pull.reward.id === 'chibi' ? 1.2 : 0.7));
    const st = $('pullStage');
    st.classList.remove('tug'); void st.offsetWidth; st.classList.add('tug');
    setTimeout(() => st.classList.remove('tug'), 140);
    const sh = $('pullShout');
    sh.textContent = SHOUTS[pull.n % 2];
    sh.classList.remove('go'); void sh.offsetWidth; sh.classList.add('go');
    if (pull.n === 1 || (p > 0.6 && !pull.hard)) { pull.hard = p > 0.6; $('pullKid').innerHTML = nyoko(p > 0.6 ? 'scrunch' : 'effort', true); }
    if (pull.n >= pull.need) {
      pull.done = true;
      sh.textContent = 'すっぽーん！';
      SND.suppon();
      setTimeout(() => { $('pull').hidden = true; showReveal(pull.reward); }, 650);
    }
  }
  $('pullBtn').addEventListener('click', tug);
  $('pullStage').addEventListener('pointerdown', tug);

  /* ---------- ほれた！ ---------- */
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  function clearTimers() { while (timers.length) clearTimeout(timers.pop()); }

  function particle(html, x, y, opt = {}) {
    const d = document.createElement('div');
    d.className = 'p'; d.innerHTML = html;
    d.style.setProperty('--x', x + '%'); d.style.setProperty('--y', y + '%');
    if (opt.dx != null) d.style.setProperty('--dx', opt.dx + 'px');
    if (opt.dy != null) d.style.setProperty('--dy', opt.dy + 'px');
    if (opt.s) d.style.setProperty('--s', opt.s + 'px');
    if (opt.d) d.style.setProperty('--d', opt.d + 's');
    d.style.setProperty('--r', (rand(120) - 60) + 'deg');
    $('fx').appendChild(d);
    setTimeout(() => d.remove(), (opt.d || 1) * 1000 + 100);
  }
  function burst(list, n, opt = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, dist = 80 + rand(140);
      particle(pick(list), opt.x ?? 50, opt.y ?? 62, { dx: Math.cos(a) * dist, dy: Math.sin(a) * dist - 60, s: 24 + rand(22), d: 1 + Math.random() * 0.6 });
    }
  }
  function bigText(text, color, stroke, wobbleIt) {
    const d = document.createElement('div');
    d.className = 'bigtxt' + (wobbleIt ? ' wobble' : '');
    d.style.setProperty('--tc', color || '#fff');
    d.style.setProperty('--ts', stroke || '#a3407c');
    d.innerHTML = wobbleIt ? [...text].map((ch, i) => `<span style="animation-delay:${i * 0.07}s">${ch}</span>`).join('') : text;
    $('fx').appendChild(d);
    return d;
  }
  function kidSay(face, text) {
    $('revealKid').innerHTML = `${nyoko(face)}<span class="say">${text}</span>`;
  }

  function showReveal(r) {
    clearTimers();
    const ov = $('reveal');
    ov.className = 'overlay reveal' + (r.night ? ' night' : '') + (r.gold ? ' gold' : '');
    $('fx').innerHTML = '';
    $('revealKid').className = 'reveal-kid';
    $('revealKid').innerHTML = nyoko('wow');
    $('revealCard').classList.remove('show');
    const hero = $('revealHero');
    hero.style.width = r.special === 'chain' ? 'min(520px, 94vw)' : '';
    hero.innerHTML = `<div class="inner ${r.anim || 'a-land'}">${r.special === 'chain' ? '' : art(r)}</div>`;
    ov.hidden = false;

    const isNew = !save.found[r.id];
    save.found[r.id] = (save.found[r.id] || 0) + 1;
    const cnt = r.count ?? 1;
    save.total += cnt; run.got += cnt;
    run.plots[cur.plotIndex] = r;
    lastReward = r.id;
    persist();

    $('newBadge').hidden = !isNew;
    $('revealName').textContent = r.name;
    $('revealSerif').textContent = `「${r.serif}」`;
    $('revealDesc').textContent = r.desc;

    if (r.snd) later(() => SND[r.snd](), r.anim === 'a-jumbo' || r.anim === 'a-chibi' ? 550 : 350);
    let cardAt = 1600;

    switch (r.fx || r.special) {
      case 'pop': later(() => burst(['💫', '⭐', '❓'], 8), 400); break;
      case 'hearts': later(() => burst(['💕', '💗', '✨'], 10), 500); break;
      case 'confetti': later(() => burst(['🎉', '🎊', '✨', '👑'], 16), 500); later(() => bigText('ははーっ！', '#ffd23f', '#8a4b2a'), 700); break;
      case 'notes': for (let i = 0; i < 10; i++) later(() => note(), 500 + i * 260); break;
      case 'puri': later(() => bigText('ぷりんっ', '#ff8fb3', '#b8234f', true), 600); break;
      case 'sparkle': later(() => burst(['✨', '⭐', '🌟', '💰'], 22), 400); later(() => bigText('キラーン☆', '#fff59d', '#b07b0a'), 600); break;
      case 'fart':
        later(() => {
          SND.fart();
          bigText('ぷぅ〜〜〜っ！', '#c6f26b', '#4f7a14', true);
          for (let i = 0; i < 7; i++) later(() => puff(), i * 110);
        }, 900);
        later(() => { kidSay('scrunch', 'くさっ！'); $('revealKid').classList.add('kid-jump'); }, 1300);
        later(() => burst(['🪰', '💨'], 5, { x: 50, y: 50 }), 1500);
        cardAt = 2300; break;
      case 'zzz':
        for (let i = 0; i < 6; i++) later(() => zz(), 500 + i * 600);
        cardAt = 1800; break;
      case 'sneeze':
        later(() => {
          bigText('はっくしょーん！！', '#fff', '#5e351b');
          $('revealStage').classList.add('shake-screen');
          for (let i = 0; i < 18; i++) particle(pick(['🟤', '💨', '🍂', '💦']), 46, 58, { dx: 120 + rand(260), dy: -rand(160) + 40, s: 20 + rand(18), d: 0.9 });
        }, 1250);
        later(() => kidSay('dizzy', 'うわー！'), 1350);
        later(() => $('revealStage').classList.remove('shake-screen'), 2100);
        cardAt = 2200; break;
      case 'fall':
        later(() => { $('revealStage').classList.add('shake-screen'); bigText('ドーーーン！！', '#fff', '#8a4b2a'); }, 600);
        later(() => { $('revealKid').classList.add('kid-fall'); kidSay('dizzy', 'すってんころりん！'); SND.boing(); }, 900);
        later(() => $('revealStage').classList.remove('shake-screen'), 1500);
        cardAt = 2000; break;
      case 'chibi':
        later(() => bigText('……ちっちゃ！', '#fff', '#6e4f3a'), 1300);
        cardAt = 2100; break;
      case 'rocket':
        later(() => { SND.rocket(); const f = document.createElement('div'); f.className = 'p'; f.textContent = '🔥'; f.style.cssText = '--x:50%;--y:76%;--s:56px;--dy:-700px;--dx:0px;--d:1.8s'; $('fx').appendChild(f); }, 1100);
        later(() => bigText('いってきまーす！', '#fff', '#e2384f'), 1300);
        later(() => burst(['⭐'], 1, { x: 50, y: 6 }), 2600);
        cardAt = 2600; break;
      case 'mole':
        later(() => bigText('もぐら!?', '#fff', '#6d4c3d'), 600);
        break;
      case 'worm':
        later(() => bigText('いも…むし!?', '#fff', '#3c8a2e'), 600);
        break;
      case 'chain':
        chain(r.count);
        cardAt = 400 + r.count * 260 + 600; break;
      default: break;
    }
    if (r.kid && r.fx !== 'fart' && r.fx !== 'sneeze' && r.fx !== 'fall') later(() => kidSay(r.kid[0], r.kid[1]), 900);
    later(() => { $('revealCard').classList.add('show'); }, cardAt);
  }

  function note() {
    const d = document.createElement('div');
    d.className = 'note'; d.textContent = pick(['♪', '♫', '🎵', '🎶']);
    d.style.left = (20 + rand(60)) + '%'; d.style.top = (40 + rand(30)) + '%';
    d.style.setProperty('--dx', (rand(80) - 40) + 'px');
    $('fx').appendChild(d); setTimeout(() => d.remove(), 1800);
  }
  function puff() {
    const d = document.createElement('div');
    d.className = 'cloud-puff';
    d.style.left = (28 + rand(14)) + '%'; d.style.top = (52 + rand(14)) + '%';
    d.style.setProperty('--dx', -(30 + rand(90)) + 'px'); d.style.setProperty('--dy', -(10 + rand(70)) + 'px');
    $('fx').appendChild(d); setTimeout(() => d.remove(), 1700);
  }
  function zz() {
    const d = document.createElement('div');
    d.className = 'zz'; d.textContent = pick(['Z', 'z', 'Zz']);
    d.style.left = (56 + rand(10)) + '%'; d.style.top = (36 + rand(10)) + '%';
    $('fx').appendChild(d); setTimeout(() => d.remove(), 2400);
  }
  function chain(n) {
    const hero = $('revealHero').firstElementChild;
    hero.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-end;gap:2px';
    const faces = [['normal', 'smile'], ['happy', 'laugh'], ['googly', 'tongue'], ['dot', 'o'], ['shut', 'laugh'], ['big', 'smile'], ['sleepy', 'o'], ['happy', 'laugh']];
    const cnt = document.createElement('div');
    cnt.className = 'bigtxt'; cnt.style.setProperty('--ts', '#a3407c');
    $('fx').appendChild(cnt);
    for (let i = 0; i < n; i++) {
      later(() => {
        const s = document.createElement('div');
        s.style.cssText = 'width:22%;animation:land .5s cubic-bezier(.2,1.6,.4,1) both';
        const [e, m] = faces[i % faces.length];
        s.innerHTML = imo({ eyes: e, mouth: m, cheeks: i % 2 === 0 });
        hero.appendChild(s);
        SND.chain(i);
        cnt.textContent = i + 1 < n ? `${i + 1}こ…` : `${n}こ！！`;
        cnt.style.animation = 'none'; void cnt.offsetWidth; cnt.style.animation = '';
      }, 400 + i * 260);
    }
  }

  $('revealNext').addEventListener('click', () => {
    clearTimers();
    $('reveal').hidden = true;
    $('revealStage').classList.remove('shake-screen');
    run.busy = false;
    renderPlots();
    if (run.plots.every(Boolean)) setTimeout(showResult, 300);
  });

  /* ---------- けっか ---------- */
  function showResult() {
    save.fields = (save.fields || 0) + 1; persist();
    const got = run.plots;
    $('resultSum').innerHTML = `いも ${run.got}こ ゲット！ ・ 1かいめで せいかい ${run.firstTry}/${PLOTS}`;
    $('resultGrid').innerHTML = got.map((r, i) =>
      `<figure style="animation-delay:${i * 0.12}s">${art(r)}<figcaption>${r.name}</figcaption></figure>`).join('');
    const funny = got.find((r) => r.id === 'onara') || got.find((r) => r.id === 'oshiri') || got.find((r) => r.id === 'kin') || pick(got);
    $('resultBest').textContent = `きょうの MVP： ${funny.name}「${funny.serif}」`;
    SND.fanfare();
    show('result');
  }
  $('nextFieldBtn').addEventListener('click', () => { SND.pop(); startField(false); });
  $('backTitleBtn').addEventListener('click', () => { SND.pop(); renderTitle(); });

  /* ---------- ずかん ---------- */
  function renderZukan() {
    const n = Object.keys(save.found).length;
    $('zukanSub').textContent = `みつけた いも ${n} / ${R.length} しゅるい`;
    $('zukanDetail').innerHTML = n ? 'みつけた いもを タッチすると しょうかい するよ' : 'まだ 1つも みつけていないよ。はたけへ いこう！';
    $('zukanGrid').innerHTML = R.map((r) => {
      const c = save.found[r.id];
      return `<button class="zk${c ? '' : ' no'}${r.rare ? ' rare' : ''}" type="button" data-id="${r.id}">
        ${c ? `<span class="zc">×${c}</span>` : ''}${art(r)}<div class="zn">${c ? r.name : '？？？'}</div></button>`;
    }).join('');
    show('zukan');
  }
  $('zukanBtn').addEventListener('click', () => { SND.pop(); renderZukan(); });
  $('zukanBack').addEventListener('click', () => { SND.pop(); renderTitle(); });
  $('zukanGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.zk'); if (!b) return;
    const r = byId[b.dataset.id];
    if (!save.found[r.id]) { SND.ng(); $('zukanDetail').innerHTML = '<b>？？？</b>まだ みつけていない いもだよ。ほりだしてみよう！'; return; }
    $('zukanDetail').innerHTML = `<b>${r.name}</b>「${r.serif}」<br>${r.desc}`;
    const s = r.snd || (r.fx === 'fart' ? 'fart' : r.fx === 'rocket' ? 'rocket' : r.special === 'chain' ? 'dance' : 'pop');
    SND[s]();
  });

  function closeOverlays() {
    clearTimers();
    for (const id of ['quiz', 'pull', 'reveal']) $(id).hidden = true;
    run.busy = false; cur = null; pull = null;
  }

  renderTitle();
})();
