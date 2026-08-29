/* かんじすたんしょん - ゲーム本体 */
'use strict';

/* ============ セーブデータ ============ */
const SAVE_KEY = 'kanji-station-v1';
const DEFAULT_SAVE = { sound: true, level: 2, lines: {}, kanji: {} };
let S = loadSave();

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return Object.assign({}, DEFAULT_SAVE);
    const o = JSON.parse(raw);
    return {
      sound: o.sound !== false,
      level: [1, 2, 3].includes(o.level) ? o.level : 2,
      lines: o.lines && typeof o.lines === 'object' ? o.lines : {},
      kanji: o.kanji && typeof o.kanji === 'object' ? o.kanji : {}
    };
  } catch (e) {
    return Object.assign({}, DEFAULT_SAVE);
  }
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 保存できなくても遊べる */ }
}

/* ============ 索引づくり ============ */
const KANJI_EKI = {};   // 漢字 → その漢字を使う駅名のリスト
const ALL_KANA = [];    // 駅名のよみ（重複なし）
(function buildIndex() {
  const seenKana = new Set();
  LINES.forEach(line => line.stations.forEach(([name, kana]) => {
    if (!seenKana.has(kana)) { seenKana.add(kana); ALL_KANA.push(kana); }
    [...new Set(name)].forEach(ch => {
      if (!KANJI[ch]) return;
      (KANJI_EKI[ch] = KANJI_EKI[ch] || []);
      if (!KANJI_EKI[ch].some(s => s.name === name)) KANJI_EKI[ch].push({ name, kana });
    });
  }));
})();
const ALL_YOMI = [...new Set(Object.values(KANJI).flatMap(k => k.r.map(r => r.y)))];
const KANJI_LIST = Object.keys(KANJI);

/* ============ ちいさな道具 ============ */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rnd = n => Math.floor(Math.random() * n);
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const gradeLabel = g => (g ? 'しょう' + g + 'で ならう' : 'ちゅうがくで ならう');
const gradeColor = g => 'var(--g' + (g || 0) + ')';
const TYPE_EMOJI = { mizu: '💧', ki: '🌿', ikimono: '🐾', kazu: '🔢', basho: '🗾', tatemono: '🏯', hito: '🧑', futsu: '✨' };

function kInfo(ch) { return S.kanji[ch] || null; }
function kLevel(ch) { const k = kInfo(ch); return k ? Math.min(5, k.got.length) : 0; }
function totalStars() { return Object.keys(S.kanji).reduce((n, ch) => n + kLevel(ch), 0); }

/* ============ おと（WebAudio の合成音だけ） ============ */
let AC = null;
function tone(freq, start, dur, type, vol) {
  if (!S.sound) return;
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime + start;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.05);
  } catch (e) { /* 音が出せない環境でも続行 */ }
}
const SE = {
  ok() { tone(784, 0, .14, 'triangle'); tone(1046, .1, .22, 'triangle'); },
  ng() { tone(196, 0, .22, 'sawtooth', .12); },
  levelup() { [659, 784, 988, 1319].forEach((f, i) => tone(f, i * .09, .25, 'triangle')); },
  arrive() { tone(880, 0, .3, 'sine', .14); tone(659, .18, .45, 'sine', .14); },
  tap() { tone(523, 0, .07, 'square', .07); },
  fanfare() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * .13, .3, 'triangle')); }
};

/* ---- キャラの え（SVG） ----
 * はいけい（SCENES）→ かお → 漢字 の じゅんに かさねる。
 * はいけいは かならず うすく して、漢字が よみにくく ならない ようにする。
 */
const SCENES = {
  town:   '<g fill="#7b94b8"><rect x="16" y="88" width="18" height="30" rx="2"/><rect x="38" y="76" width="16" height="42" rx="2"/><rect x="58" y="94" width="15" height="24" rx="2"/><rect x="77" y="82" width="20" height="36" rx="2"/></g>' +
          '<g fill="#fff"><rect x="20" y="93" width="4" height="5"/><rect x="27" y="93" width="4" height="5"/><rect x="42" y="82" width="4" height="5"/><rect x="49" y="82" width="4" height="5"/><rect x="82" y="88" width="4" height="5"/><rect x="89" y="88" width="4" height="5"/></g>',
  rice:   '<rect x="14" y="100" width="92" height="18" fill="#c0a353"/><g stroke="#7fae3f" stroke-width="3" stroke-linecap="round"><path d="M24 102 v-16"/><path d="M40 102 v-20"/><path d="M56 102 v-15"/><path d="M72 102 v-19"/><path d="M90 102 v-16"/></g>' +
          '<g fill="#e8c34a"><circle cx="24" cy="84" r="4"/><circle cx="40" cy="80" r="4"/><circle cx="56" cy="85" r="4"/><circle cx="72" cy="81" r="4"/><circle cx="90" cy="84" r="4"/></g>',
  water:  '<path d="M14 92 q11 -9 22 0 t22 0 t22 0 t22 0 v26 h-92z" fill="#8fd0f2"/><path d="M14 104 q11 -8 22 0 t22 0 t22 0 t22 0 v14 h-92z" fill="#4fb0e5"/>',
  big:    '<g fill="none" stroke="#f3a05c" stroke-width="5"><circle cx="60" cy="68" r="42"/><circle cx="60" cy="68" r="29"/></g>',
  five:   '<g fill="#f28fb1"><circle cx="30" cy="86" r="7"/><circle cx="45" cy="98" r="7"/><circle cx="60" cy="86" r="7"/><circle cx="75" cy="98" r="7"/><circle cx="90" cy="86" r="7"/></g>',
  shine:  '<g fill="#ffce4d"><path d="M28 74 l4 -11 l4 11 l11 4 l-11 4 l-4 11 l-4 -11 l-11 -4z"/><path d="M88 96 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3z"/><path d="M84 40 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2z"/></g>',
  tree:   '<rect x="55" y="86" width="11" height="32" fill="#a9793f"/><circle cx="60" cy="80" r="26" fill="#7cbb52"/><circle cx="40" cy="90" r="15" fill="#8fca62"/><circle cx="82" cy="90" r="14" fill="#8fca62"/>',
  cloud:  '<g fill="#dfe9f4"><ellipse cx="44" cy="92" rx="24" ry="14"/><ellipse cx="70" cy="98" rx="20" ry="12"/><ellipse cx="90" cy="76" rx="14" ry="9"/></g>',
  sun:    '<circle cx="60" cy="86" r="26" fill="#ffd24d"/><g stroke="#ffb733" stroke-width="4" stroke-linecap="round"><path d="M60 48 v-8"/><path d="M28 86 h-9"/><path d="M92 86 h9"/><path d="M34 60 l-6 -6"/><path d="M86 60 l6 -6"/><path d="M34 112 l-6 6"/><path d="M86 112 l6 6"/></g>',
  up:     '<g fill="none" stroke="#68b46a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M34 94 l26 -22 l26 22"/><path d="M34 116 l26 -22 l26 22"/></g>',
  four:   '<g fill="#8ec7e8"><rect x="26" y="76" width="20" height="20" rx="4"/><rect x="72" y="76" width="20" height="20" rx="4"/><rect x="26" y="100" width="20" height="18" rx="4"/><rect x="72" y="100" width="20" height="18" rx="4"/></g>',
  target: '<g fill="none" stroke="#e58a8a" stroke-width="6"><circle cx="60" cy="84" r="34"/><circle cx="60" cy="84" r="20"/></g><circle cx="60" cy="84" r="7" fill="#e05a5a"/>',
  coin:   '<circle cx="60" cy="84" r="32" fill="#ffd863"/><circle cx="60" cy="84" r="24" fill="none" stroke="#e0a92c" stroke-width="4"/>',
  three:  '<g fill="#f0b25e"><rect x="24" y="74" width="72" height="10" rx="5"/><rect x="32" y="92" width="56" height="10" rx="5"/><rect x="40" y="110" width="40" height="10" rx="5"/></g>',
  small:  '<g fill="#9fd0e8"><circle cx="34" cy="80" r="5"/><circle cx="86" cy="76" r="4"/><circle cx="46" cy="106" r="3.5"/><circle cx="76" cy="110" r="5"/><circle cx="60" cy="92" r="3"/></g>',
  stand:  '<rect x="14" y="108" width="92" height="10" fill="#c9b79a"/><ellipse cx="60" cy="106" rx="26" ry="6" fill="#a9937a" opacity=".7"/>',
  eight:  '<g fill="none" stroke="#7fb3e0" stroke-width="9" stroke-linecap="round"><path d="M56 70 l-22 46"/><path d="M64 70 l22 46"/></g>',
  crownbg:'<g stroke="#ffd24d" stroke-width="5" stroke-linecap="round"><path d="M60 60 v-14"/><path d="M28 84 l-12 -6"/><path d="M92 84 l12 -6"/><path d="M36 62 l-9 -9"/><path d="M84 62 l9 -9"/></g><circle cx="60" cy="90" r="24" fill="#ffe9a8"/>',
  star:   '<g fill="#ffd863"><path d="M40 68 l5 -13 l5 13 l13 5 l-13 5 l-5 13 l-5 -13 l-13 -5z"/><path d="M84 98 l4 -9 l4 9 l9 4 l-9 4 l-4 9 l-4 -9 l-9 -4z"/><circle cx="30" cy="104" r="4"/></g>',
  grass:  '<rect x="14" y="104" width="92" height="14" fill="#8fca62"/><g stroke="#5fa03c" stroke-width="4" stroke-linecap="round" fill="none"><path d="M26 106 q-4 -14 4 -20"/><path d="M44 106 q4 -16 -3 -22"/><path d="M62 106 q-5 -12 3 -18"/><path d="M80 106 q4 -15 -3 -21"/><path d="M96 106 q-4 -12 3 -17"/></g>',
  thread: '<circle cx="60" cy="88" r="28" fill="#f2a7c3"/><g fill="none" stroke="#d76e9b" stroke-width="3"><path d="M36 76 q24 12 46 -4"/><path d="M34 92 q26 14 50 -6"/><path d="M40 106 q22 8 40 -4"/></g>',
  book:   '<g fill="#f6e7c9" stroke="#c9a86a" stroke-width="3"><path d="M20 100 q20 -10 38 0 v22 q-18 -9 -38 0z"/><path d="M100 100 q-20 -10 -38 0 v22 q18 -9 38 0z"/></g>',
  down:   '<g fill="none" stroke="#7f9fd4" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M34 74 l26 22 l26 -22"/><path d="M34 96 l26 22 l26 -22"/></g>',
  mountain:'<path d="M14 118 l30 -46 l20 28 l14 -20 l28 38z" fill="#9aa88f"/><path d="M44 72 l10 15 h-20z" fill="#fff"/>',
  many:   '<g fill="#a8b6e0"><circle cx="26" cy="74" r="4"/><circle cx="42" cy="82" r="4"/><circle cx="58" cy="72" r="4"/><circle cx="74" cy="84" r="4"/><circle cx="92" cy="74" r="4"/><circle cx="32" cy="96" r="4"/><circle cx="50" cy="104" r="4"/><circle cx="68" cy="98" r="4"/><circle cx="86" cy="106" r="4"/><circle cx="60" cy="88" r="4"/></g>',
  speech: '<g fill="#ffe9a8" stroke="#e8bf5a" stroke-width="3"><path d="M22 72 h34 a6 6 0 0 1 6 6 v16 a6 6 0 0 1 -6 6 h-20 l-10 9 v-9 h-4 a6 6 0 0 1 -6 -6 v-16 a6 6 0 0 1 6 -6z"/></g><g fill="#e8bf5a"><circle cx="78" cy="104" r="6"/><circle cx="92" cy="94" r="4"/></g>',
  red:    '<g fill="#f4867f"><path d="M60 116 l-22 -22 a13 13 0 0 1 22 -14 a13 13 0 0 1 22 14z"/></g>',
  cross:  '<g fill="#8fbfe8"><rect x="52" y="62" width="16" height="56" rx="4"/><rect x="32" y="82" width="56" height="16" rx="4"/></g>',
  sky:    '<g fill="#b5d5f2"><ellipse cx="40" cy="96" rx="22" ry="12"/><ellipse cx="76" cy="104" rx="18" ry="10"/></g><g fill="#ffd863"><path d="M84 62 l4 -10 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4z"/></g>',
  nametag:'<g><rect x="26" y="76" width="68" height="40" rx="6" fill="#fff" stroke="#8fb0d0" stroke-width="3"/><rect x="26" y="76" width="68" height="11" rx="5" fill="#8fb0d0"/></g>',
  sprout: '<rect x="14" y="106" width="92" height="12" fill="#c9a878"/><path d="M60 106 v-24" stroke="#5fa03c" stroke-width="4" stroke-linecap="round"/><ellipse cx="45" cy="80" rx="15" ry="9" fill="#7cbb52" transform="rotate(-20 45 80)"/><ellipse cx="76" cy="82" rx="15" ry="9" fill="#8fca62" transform="rotate(20 76 82)"/>',
  hundred:'<g fill="none" stroke="#f08a8a" stroke-width="5"><circle cx="60" cy="86" r="32"/><circle cx="60" cy="86" r="21"/></g>',
  ball:   '<circle cx="60" cy="86" r="30" fill="#8fd0c8"/><ellipse cx="50" cy="74" rx="9" ry="6" fill="#fff" opacity=".8" transform="rotate(-25 50 74)"/>',
  flower: '<g><g fill="#f28fb8"><circle cx="32" cy="84" r="10"/><circle cx="18" cy="96" r="10"/><circle cx="46" cy="96" r="10"/><circle cx="32" cy="108" r="10"/></g><circle cx="32" cy="96" r="7" fill="#ffd863"/>' +
          '<g fill="#bd9fe3"><circle cx="88" cy="92" r="9"/><circle cx="76" cy="102" r="9"/><circle cx="100" cy="102" r="9"/><circle cx="88" cy="112" r="9"/></g><circle cx="88" cy="102" r="6" fill="#ffd863"/></g>',
  house:  '<rect x="14" y="106" width="92" height="12" fill="#a9c98a"/><path d="M34 106 v-24 h34 v24z" fill="#f2e2c4"/><path d="M28 84 l23 -18 l23 18z" fill="#d8776a"/><rect x="46" y="92" width="12" height="14" fill="#a9793f"/>',
  stone:  '<g fill="#9e988b"><ellipse cx="38" cy="104" rx="20" ry="14"/><ellipse cx="78" cy="110" rx="16" ry="11"/><ellipse cx="86" cy="86" rx="11" ry="8"/></g>'
};

/* かおに かさねる もの。curl / ribbon / cap は あたまの うえ（★4以上では ぼうしに ゆずる） */
const OVERLAYS = {
  glasses: f => '<g fill="none" stroke="' + f + '" stroke-width="3"><circle cx="43" cy="41" r="15"/><circle cx="77" cy="41" r="15"/><path d="M58 41 h4"/><path d="M28 38 l-10 -4"/><path d="M92 38 l10 -4"/></g>',
  curl:    () => '<path d="M62 16 q2 -14 12 -12 q8 2 4 9" fill="none" stroke="#c98b3f" stroke-width="4" stroke-linecap="round"/>',
  ribbon:  () => '<g fill="#f4867f"><path d="M74 14 l14 -9 v18z"/><path d="M96 14 l-14 -9 v18z"/><circle cx="85" cy="14" r="5"/></g>',
  cap:     () => '<g><path d="M60 2 l30 12 l-30 12 l-30 -12z" fill="#3d4a5c"/><rect x="56" y="14" width="8" height="4" fill="#3d4a5c"/><path d="M86 16 v12" stroke="#f0c040" stroke-width="2.5"/><circle cx="86" cy="29" r="3" fill="#f0c040"/></g>'
};
const HEAD_OVER = ['curl', 'ribbon', 'cap'];

const EYES = {
  round: f => '<circle cx="43" cy="41" r="11" fill="#fff" stroke="' + f + '" stroke-width="2.6"/><circle cx="77" cy="41" r="11" fill="#fff" stroke="' + f + '" stroke-width="2.6"/>' +
              '<circle cx="44.5" cy="43" r="5" fill="' + f + '"/><circle cx="78.5" cy="43" r="5" fill="' + f + '"/>',
  dot:   f => '<circle cx="43" cy="42" r="6.5" fill="' + f + '"/><circle cx="77" cy="42" r="6.5" fill="' + f + '"/>',
  wink:  f => '<circle cx="43" cy="41" r="11" fill="#fff" stroke="' + f + '" stroke-width="2.6"/><circle cx="44.5" cy="43" r="5" fill="' + f + '"/>' +
              '<path d="M68 45 q9 -11 18 0" fill="none" stroke="' + f + '" stroke-width="3.4" stroke-linecap="round"/>',
  sparkle: f => EYES.round(f) + '<circle cx="41" cy="39" r="2.6" fill="#fff"/><circle cx="75" cy="39" r="2.6" fill="#fff"/>' +
              '<path d="M26 30 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2z" fill="#ffd863"/>',
  sleepy: f => '<path d="M32 41 a11 11 0 0 0 22 0z" fill="#fff" stroke="' + f + '" stroke-width="2.6"/><path d="M66 41 a11 11 0 0 0 22 0z" fill="#fff" stroke="' + f + '" stroke-width="2.6"/>' +
              '<circle cx="43" cy="45" r="4" fill="' + f + '"/><circle cx="77" cy="45" r="4" fill="' + f + '"/>',
  closed: f => '<g fill="none" stroke="' + f + '" stroke-width="3.4" stroke-linecap="round"><path d="M34 44 q9 -10 18 0"/><path d="M68 44 q9 -10 18 0"/></g>'
};

const MOUTHS = {
  smile: f => '<path d="M50 54 Q60 66 70 54" fill="none" stroke="' + f + '" stroke-width="3.4" stroke-linecap="round"/>',
  small: f => '<path d="M53 57 Q60 63 67 57" fill="none" stroke="' + f + '" stroke-width="3.2" stroke-linecap="round"/>',
  open:  f => '<ellipse cx="60" cy="60" rx="8.5" ry="7" fill="' + f + '"/><ellipse cx="60" cy="63.5" rx="4.5" ry="3" fill="#ff9d9d"/>',
  tooth: f => MOUTHS.smile(f) + '<rect x="56" y="53" width="9" height="6" rx="1.6" fill="#fff" stroke="' + f + '" stroke-width="1.4"/>',
  wave:  f => '<path d="M48 58 q5 -7 10 0 t10 0" fill="none" stroke="' + f + '" stroke-width="3.2" stroke-linecap="round"/>'
};

let CHAR_UID = 0;
function charSVG(ch, opts) {
  opts = opts || {};
  const k = KANJI[ch]; if (!k) return '';
  const c = (typeof CHARA !== 'undefined' && CHARA[ch]) || null;
  const lv = opts.lv === undefined ? kLevel(ch) : opts.lv;
  const col = gradeColor(k.g);
  const face = '#2b3440';
  const uid = 'kc' + (++CHAR_UID);
  const cls = 'kchar' + (opts.cls ? ' ' + opts.cls : '');

  const scene = c && SCENES[c.sc]
    ? '<g clip-path="url(#' + uid + ')" opacity=".62">' + SCENES[c.sc] + '</g>' : '';
  const eyes = (EYES[c && c.eyes] || EYES.round)(face);
  const mouth = (MOUTHS[c && c.mouth] || (lv >= 2 ? MOUTHS.smile : MOUTHS.small))(face);
  const cheeks = lv >= 3
    ? '<ellipse cx="27" cy="52" rx="7.5" ry="4.6" fill="#ff9d9d" opacity=".75"/><ellipse cx="93" cy="52" rx="7.5" ry="4.6" fill="#ff9d9d" opacity=".75"/>'
    : '';
  const hat = lv === 4
    ? '<path d="M38 16 a22 14 0 0 1 44 0z" fill="' + col + '"/>' +
      '<path d="M82 16 h16 a4 4 0 0 1 0 6 h-60 v-6z" fill="' + col + '" opacity=".8"/>' +
      '<circle cx="60" cy="2.5" r="4" fill="' + col + '"/>'
    : '';
  const crown = lv >= 5
    ? '<path d="M36 16 l6 -14 l9 10 l9 -14 l9 14 l9 -10 l6 14 z" fill="#f7c948" stroke="#d79b06" stroke-width="2" stroke-linejoin="round"/>'
    : '';
  const spark = lv >= 5 ? '<text x="12" y="30" font-size="16">✨</text><text x="98" y="112" font-size="14">✨</text>' : '';
  // あたまに のる かざりは、ぼうし・おうかんと ばしょが かさなるので ★4以上では 出さない
  const over = c && c.ov && OVERLAYS[c.ov] && !(HEAD_OVER.includes(c.ov) && lv >= 4)
    ? OVERLAYS[c.ov](face) : '';

  return '<svg class="' + cls + '" viewBox="0 0 120 134" role="img" aria-label="' +
    esc(ch) + (c ? '（' + esc(c.name) + '）' : '') + ' のキャラクター">' +
    '<defs><clipPath id="' + uid + '"><rect x="14" y="16" width="92" height="102" rx="24"/></clipPath></defs>' +
    '<ellipse cx="44" cy="122" rx="12" ry="7" fill="' + col + '"/><ellipse cx="76" cy="122" rx="12" ry="7" fill="' + col + '"/>' +
    '<ellipse cx="11" cy="80" rx="8" ry="11" fill="' + col + '"/><ellipse cx="109" cy="80" rx="8" ry="11" fill="' + col + '"/>' +
    '<rect x="14" y="16" width="92" height="102" rx="24" fill="' + col + '" opacity=".18"/>' +
    scene +
    '<rect x="14" y="16" width="92" height="102" rx="24" fill="none" stroke="' + col + '" stroke-width="4"/>' +
    hat + crown + eyes + cheeks + mouth +
    '<text x="60" y="108" text-anchor="middle" font-size="46" font-weight="700" fill="' + face + '">' + esc(ch) + '</text>' +
    over + spark + '</svg>';
}
function charName(ch) {
  const c = (typeof CHARA !== 'undefined' && CHARA[ch]) || null;
  return c ? c.name : '';
}
function charSay(ch, kind) {
  const c = (typeof CHARA !== 'undefined' && CHARA[ch]) || null;
  return c && c[kind] ? c[kind] : '';
}
function bubbleHTML(ch, kind) {
  const t = charSay(ch, kind); if (!t) return '';
  return '<div class="bubble">' + (charName(ch) ? '<b>' + esc(charName(ch)) + '</b>' : '') + esc(t) + '</div>';
}
function starStr(lv) { return '★★★★★'.slice(0, lv) + '☆☆☆☆☆'.slice(0, 5 - lv); }

/* ============ 画面きりかえ ============ */
function show(id) {
  ['home', 'play', 'result', 'zukan'].forEach(s => $(s).classList.toggle('hidden', s !== id));
  window.scrollTo(0, 0);
}

/* ============ ホーム ============ */
function renderHome() {
  [...$('segLevel').children].forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.lv) === S.level));
  const got = Object.keys(S.kanji).length;
  $('progressAll').innerHTML = 'なかまに なった かんじ <b>' + got + '</b> / ' + KANJI_LIST.length +
    '　あつめた ★ <b>' + totalStars() + '</b>';
  $('lineList').innerHTML = LINES.map(l => {
    const done = Math.min(S.lines[l.id] || 0, l.stations.length);
    const pct = Math.round(done / l.stations.length * 100);
    return '<button class="linecard" data-line="' + l.id + '" style="--lc:' + l.color + '">' +
      '<div class="nm">' + esc(l.name) + '</div>' +
      '<div class="mt">' + esc(l.kana) + '　' + l.stations.length + 'えき</div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="mt">' + (done >= l.stations.length ? '🎉 かんそう！' : done + ' / ' + l.stations.length + ' えき') + '</div>' +
      '</button>';
  }).join('');
  [...$('lineList').querySelectorAll('.linecard')].forEach(b => {
    b.onclick = () => { SE.tap(); startLine(b.dataset.line, false); };
  });
  $('btnSound').classList.toggle('on', S.sound);
  $('btnSound').textContent = (S.sound ? '🔊' : '🔇') + ' おと';
}

/* ============ 問題づくり ============ */
// 駅名のよみ 4たく
function stationChoices(kana) {
  const near = ALL_KANA.filter(k => k !== kana && Math.abs(k.length - kana.length) <= 1);
  const pool = shuffle(near.length >= 3 ? near : ALL_KANA.filter(k => k !== kana));
  return shuffle([kana, ...pool.slice(0, 3)]);
}
// べつの よみ 4たく（まず同じ漢字の別の読み、たりなければ長さの近いものから）
function readingChoices(ch, ans) {
  const same = shuffle(KANJI[ch].r.map(r => r.y).filter(y => y !== ans));
  const near = shuffle(ALL_YOMI.filter(y => y !== ans && !same.includes(y) && Math.abs(y.length - ans.length) <= 1));
  const far = shuffle(ALL_YOMI.filter(y => y !== ans && !same.includes(y)));
  const picked = [];
  for (const y of [...same.slice(0, 2), ...near, ...far]) {
    if (picked.length >= 3) break;
    if (!picked.includes(y)) picked.push(y);
  }
  return shuffle([ans, ...picked]);
}
// この駅で出す漢字と読みを決める
function pickQuestion(name, kana) {
  const cands = [];
  [...new Set(name)].forEach(ch => {
    const k = KANJI[ch]; if (!k) return;
    let pool = k.r.filter(r => r.lv <= S.level);
    if (!pool.length) { const min = Math.min(...k.r.map(r => r.lv)); pool = k.r.filter(r => r.lv === min); }
    const got = (kInfo(ch) || { got: [] }).got;
    pool.forEach(r => {
      let sc = Math.random();
      if (!got.includes(r.w)) sc += 3;              // まだ おぼえていない よみ
      if (r.lv === S.level) sc += 2;                 // えらんだ むずかしさに ぴったり
      if (r.lv >= 2) sc += 1;                        // 「べつの よみ」らしさ
      if (kana.includes(r.y.slice(0, 2))) sc -= 3;   // 駅名と同じ読みっぽいものは さける
      if (!kInfo(ch)) sc += 1.5;                     // まだ なかまでない かんじ
      cands.push({ ch: ch, r: r, sc: sc });
    });
  });
  if (!cands.length) return null;
  cands.sort((a, b) => b.sc - a.sc);
  return cands[0];
}

/* ============ プレイ ============ */
let P = null;

function startLine(lineId, restart) {
  const line = LINES.find(l => l.id === lineId);
  let idx = S.lines[lineId] || 0;
  if (restart || idx >= line.stations.length) idx = 0;
  P = { line: line, idx: idx, newKanji: [], stars: 0, correct: 0, asked: 0 };
  $('playLineName').textContent = line.name;
  document.documentElement.style.setProperty('--lc', line.color);
  show('play');
  nextStation();
}

function renderTrack() {
  const n = P.line.stations.length;
  $('track').style.setProperty('--lc', P.line.color);
  $('track').innerHTML = P.line.stations.map((s, i) =>
    '<span class="' + (i < P.idx ? 'done' : i === P.idx ? 'now' : '') + '">' + (i === P.idx ? '🚃' : '') + '</span>'
  ).join('');
  const now = $('track').querySelector('.now');
  if (now) now.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function nextStation() {
  if (P.idx >= P.line.stations.length) return finishLine();
  renderTrack();
  askStationName();
}

function rubyName(name, kana) {
  return '<ruby>' + esc(name) + '<rt>' + esc(kana) + '</rt></ruby>';
}

/* 第1問：えきの なまえは？ */
function askStationName() {
  const [name, kana] = P.line.stations[P.idx];
  const opts = stationChoices(kana);
  $('qcard').innerHTML =
    '<div class="qlabel">つぎの えき（' + (P.idx + 1) + ' / ' + P.line.stations.length + '）　なんて よむ？</div>' +
    '<div class="station pop">' + esc(name) + '</div>' +
    '<div class="choices" id="ch1">' + opts.map(o => '<button data-y="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div>' +
    '<div class="judge" id="judge1"></div><div id="after1"></div>';
  P.asked++;
  [...$('ch1').children].forEach(b => {
    b.onclick = () => {
      const hit = b.dataset.y === kana;
      [...$('ch1').children].forEach(x => {
        x.disabled = true;
        if (x.dataset.y === kana) x.classList.add('ok');
      });
      if (!hit) { b.classList.remove('ok'); b.classList.add('ng'); }
      const j = $('judge1');
      j.className = 'judge ' + (hit ? 'ok' : 'ng');
      j.textContent = hit ? '⭕ せいかい！' : '❌ おしい！';
      if (hit) { P.correct++; SE.ok(); } else { SE.ng(); $('qcard').classList.add('shake'); setTimeout(() => $('qcard').classList.remove('shake'), 320); }
      $('after1').innerHTML =
        '<div class="answerbox">この えきは <b>' + rubyName(name, kana) + '</b></div>' +
        '<button class="nextbtn" id="next1">つぎへ ▶</button>';
      $('next1').onclick = () => { SE.tap(); askReading(name, kana); };
    };
  });
}

/* 第2問：おなじ かんじの べつの よみは？ */
function askReading(name, kana) {
  const q = pickQuestion(name, kana);
  if (!q) { arrive(); return; }
  const ch = q.ch, r = q.r, k = KANJI[ch];
  const opts = readingChoices(ch, r.y);
  const wordHtml = [...r.w].map(c => c === ch ? '<em>' + esc(c) + '</em>' : esc(c)).join('');
  const eki = KANJI_EKI[ch] || [];
  $('qcard').innerHTML =
    '<div class="qlabel">「' + rubyName(name, kana) + '」の <b>' + esc(ch) + '</b> は ほかの よみかたも あるよ！</div>' +
    '<div class="charbox">' +
    '<div class="charcol">' + charSVG(ch, { cls: 'pop' }) +
    (charName(ch) ? '<div class="cname">' + esc(charName(ch)) + '</div>' : '') + '</div>' +
    '<div class="kinfo">' +
    bubbleHTML(ch, 'voice') +
    '<span class="gradetag" style="--gc:' + gradeColor(k.g) + '">' + gradeLabel(k.g) + ' ' + (TYPE_EMOJI[k.t] || '✨') + '</span>' +
    '<div class="kmeta">おん：' + esc(k.on) + '　くん：' + esc(k.kun) + '</div>' +
    '<div class="stars">' + starStr(kLevel(ch)) + '</div>' +
    '<div class="ekilist">この かんじの えき：<b>' + esc(eki.slice(0, 5).map(s => s.name).join('・')) + '</b>' + (eki.length > 5 ? ' ほか' : '') + '</div>' +
    '</div></div>' +
    '<div class="word">' + wordHtml + '</div>' +
    (r.h ? '<div class="hintline">ヒント：' + esc(r.h) + '</div>' : '') +
    '<div class="choices" id="ch2">' + opts.map(o => '<button data-y="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div>' +
    '<div class="judge" id="judge2"></div><div id="after2"></div>';
  P.asked++;
  [...$('ch2').children].forEach(b => {
    b.onclick = () => {
      const hit = b.dataset.y === r.y;
      [...$('ch2').children].forEach(x => { x.disabled = true; if (x.dataset.y === r.y) x.classList.add('ok'); });
      if (!hit) { b.classList.remove('ok'); b.classList.add('ng'); }
      const j = $('judge2');
      j.className = 'judge ' + (hit ? 'ok' : 'ng');
      let extra = '';
      if (hit) {
        P.correct++;
        const before = kLevel(ch);
        const rec = S.kanji[ch] = S.kanji[ch] || { got: [] };
        const isNew = !rec.got.includes(r.w);
        if (isNew) rec.got.push(r.w);
        const after = kLevel(ch);
        save();
        if (!before) { P.newKanji.push(ch); j.textContent = '⭕ せいかい！ ' + ch + ' が なかまに なった！'; SE.levelup(); }
        else if (after > before) { j.textContent = '⭕ せいかい！ ' + ch + ' が レベルアップ！'; SE.levelup(); }
        else { j.textContent = '⭕ せいかい！'; SE.ok(); }
        if (after > before) P.stars += (after - before);
        extra = '<div class="charbox">' +
          '<div class="charcol">' + charSVG(ch, { cls: 'pop' }) +
          (charName(ch) ? '<div class="cname">' + esc(charName(ch)) + '</div>' : '') + '</div>' +
          '<div class="kinfo">' + bubbleHTML(ch, 'win') +
          '<div class="stars">' + starStr(after) + '</div>' +
          '<div class="kmeta">おぼえた よみ ' + rec.got.length + ' こ</div></div></div>';
      } else {
        j.textContent = '❌ ざんねん…';
        SE.ng(); $('qcard').classList.add('shake'); setTimeout(() => $('qcard').classList.remove('shake'), 320);
        if (charSay(ch, 'lose')) {
          extra = '<div class="charbox">' +
            '<div class="charcol">' + charSVG(ch) +
            (charName(ch) ? '<div class="cname">' + esc(charName(ch)) + '</div>' : '') + '</div>' +
            '<div class="kinfo">' + bubbleHTML(ch, 'lose') + '</div></div>';
        }
      }
      $('after2').innerHTML =
        '<div class="answerbox"><b>' + rubyName(r.w, r.y) + '</b>　' + esc(ch) + 'は「' + esc(r.y) + '」の ように よむよ</div>' +
        extra + '<button class="nextbtn" id="next2">' + (P.idx + 1 >= P.line.stations.length ? 'ゴール！ ▶' : 'つぎの えきへ 🚃') + '</button>';
      $('next2').onclick = () => { SE.arrive(); arrive(); };
    };
  });
}

function arrive() {
  P.idx++;
  S.lines[P.line.id] = P.idx;
  save();
  nextStation();
}

function finishLine() {
  SE.fanfare();
  const chars = P.newKanji.map(ch => '<div class="charcol">' + charSVG(ch) +
    (charName(ch) ? '<div class="cname">' + esc(charName(ch)) + '</div>' : '') + '</div>').join('');
  $('resultCard').innerHTML =
    '<div class="big">🎉 ' + esc(P.line.name) + ' かんそう！</div>' +
    '<div>' + P.line.stations.length + 'えき ぜんぶ まわったよ</div>' +
    '<div class="big">' + P.correct + ' / ' + P.asked + ' もんせいかい</div>' +
    '<div>あたらしい ★ を <b>' + P.stars + '</b> こ あつめた</div>' +
    (P.newKanji.length ? '<div style="margin-top:10px">あたらしい なかま ' + P.newKanji.length + 'にん</div><div class="newlist">' + chars + '</div>' : '') +
    '<button class="nextbtn" id="againBtn">もういちど この ろせん 🚃</button>' +
    '<button class="nextbtn" id="homeBtn" style="background:#5b6b7f;box-shadow:0 4px 0 #3c4857">ほかの ろせんを えらぶ</button>';
  $('againBtn').onclick = () => { SE.tap(); startLine(P.line.id, true); };
  $('homeBtn').onclick = () => { SE.tap(); renderHome(); show('home'); };
  show('result');
}

/* ============ ずかん ============ */
let zFilterGrade = 'all';
function renderZukan() {
  const grades = ['all', 1, 2, 3, 4, 5, 6, 0];
  const label = g => g === 'all' ? 'ぜんぶ' : (g ? 'しょう' + g : 'ちゅうがく');
  $('zFilter').innerHTML = grades.map(g =>
    '<button data-g="' + g + '" aria-pressed="' + (String(g) === String(zFilterGrade)) + '">' + label(g) + '</button>').join('');
  [...$('zFilter').children].forEach(b => b.onclick = () => {
    zFilterGrade = b.dataset.g === 'all' ? 'all' : Number(b.dataset.g);
    SE.tap(); renderZukan();
  });
  const list = KANJI_LIST
    .filter(ch => zFilterGrade === 'all' || KANJI[ch].g === zFilterGrade)
    .sort((a, b) => (KANJI[a].g || 9) - (KANJI[b].g || 9) || KANJI_LIST.indexOf(a) - KANJI_LIST.indexOf(b));
  const got = list.filter(ch => kInfo(ch)).length;
  $('zukanCount').innerHTML = 'この ページ： <b>' + got + '</b> / ' + list.length +
    '　ぜんたい： <b>' + Object.keys(S.kanji).length + '</b> / ' + KANJI_LIST.length + '　★ ' + totalStars();
  $('zGrid').innerHTML = list.map(ch => {
    const lv = kLevel(ch);
    return '<button class="zcell' + (lv ? '' : ' locked') + '" data-ch="' + esc(ch) + '">' +
      charSVG(ch) + '<div class="st">' + (lv ? starStr(lv).slice(0, lv) : 'みはっけん') + '</div>' +
      (charName(ch) ? '<div class="cn">' + esc(charName(ch)) + '</div>' : '') + '</button>';
  }).join('');
  [...$('zGrid').children].forEach(b => b.onclick = () => { SE.tap(); openDetail(b.dataset.ch); });
}

function openDetail(ch) {
  const k = KANJI[ch], rec = kInfo(ch), lv = kLevel(ch);
  const eki = (KANJI_EKI[ch] || []).map(s => rubyName(s.name, s.kana)).join('　');
  const rows = k.r.map(r => {
    const has = rec && rec.got.includes(r.w);
    return '<div class="readrow"><span>' + esc(r.w) + '</span><span class="' + (has ? 'got' : 'yet') + '">' +
      (has ? esc(r.y) : '？？？') + '</span></div>';
  }).join('');
  const host = $('modalHost');
  host.innerHTML = '<div class="modal"><div class="inner">' +
    '<div class="charbox">' + charSVG(ch) + '<div class="kinfo">' +
    '<h3 style="margin:0">' + esc(ch) + (charName(ch) ? ' <small>' + esc(charName(ch)) + '</small>' : '') + '</h3>' +
    '<span class="gradetag" style="--gc:' + gradeColor(k.g) + '">' + gradeLabel(k.g) + ' ' + (TYPE_EMOJI[k.t] || '✨') + '</span>' +
    '<div class="kmeta">おん：' + esc(k.on) + '<br>くん：' + esc(k.kun) + '</div>' +
    '<div class="stars">' + starStr(lv) + '</div></div></div>' +
    (charSay(ch, 'zukan') ? '<div class="bubble wide">' + esc(charSay(ch, 'zukan')) + '</div>' : '') +
    '<div class="sectitle" style="margin-bottom:2px">よみかた</div>' + rows +
    '<div class="sectitle" style="margin-bottom:2px">この かんじを つかう えき</div>' +
    '<div class="ekilist">' + (eki || '—') + '</div>' +
    '<button class="closebtn" id="mClose">とじる</button></div></div>';
  $('mClose').onclick = () => { SE.tap(); host.innerHTML = ''; };
  host.querySelector('.modal').onclick = e => { if (e.target === host.querySelector('.modal')) host.innerHTML = ''; };
}

/* ============ ボタン ============ */
[...$('segLevel').children].forEach(b => b.onclick = () => {
  S.level = Number(b.dataset.lv); save(); SE.tap(); renderHome();
});
$('btnSound').onclick = () => { S.sound = !S.sound; save(); SE.tap(); renderHome(); };
$('btnZukan').onclick = () => { SE.tap(); renderZukan(); show('zukan'); };
$('btnZBack').onclick = () => { SE.tap(); renderHome(); show('home'); };
$('btnBack').onclick = () => { SE.tap(); renderHome(); show('home'); };
$('btnRestart').onclick = () => { SE.tap(); startLine(P.line.id, true); };
$('btnReset').onclick = () => {
  if (!confirm('あつめた かんじと ろせんの きろくを ぜんぶ けします。いいですか？')) return;
  S = Object.assign({}, DEFAULT_SAVE, { sound: S.sound, level: S.level });
  save(); renderZukan(); renderHome();
};

renderHome();
show('home');
