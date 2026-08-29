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

/* ============ 漢字キャラの絵（SVG） ============ */
function charSVG(ch, opts) {
  opts = opts || {};
  const k = KANJI[ch]; if (!k) return '';
  const lv = opts.lv === undefined ? kLevel(ch) : opts.lv;
  const col = gradeColor(k.g);
  const face = '#2b3440';
  const cls = 'kchar' + (opts.cls ? ' ' + opts.cls : '');
  const mouth = lv >= 2
    ? '<path d="M50 54 Q60 66 70 54" fill="none" stroke="' + face + '" stroke-width="3.4" stroke-linecap="round"/>'
    : '<path d="M53 57 Q60 63 67 57" fill="none" stroke="' + face + '" stroke-width="3.2" stroke-linecap="round"/>';
  const cheeks = lv >= 3
    ? '<ellipse cx="27" cy="52" rx="7.5" ry="4.6" fill="#ff9d9d" opacity=".75"/><ellipse cx="93" cy="52" rx="7.5" ry="4.6" fill="#ff9d9d" opacity=".75"/>'
    : '';
  const hat = lv >= 4 && lv < 5
    ? '<path d="M34 16 h52 l-4 -9 h-44 z" fill="' + col + '"/><rect x="30" y="14" width="60" height="6" rx="3" fill="' + col + '"/>'
    : '';
  const crown = lv >= 5
    ? '<path d="M36 16 l6 -14 l9 10 l9 -14 l9 14 l9 -10 l6 14 z" fill="#f7c948" stroke="#d79b06" stroke-width="2" stroke-linejoin="round"/>'
    : '';
  const spark = lv >= 5 ? '<text x="12" y="30" font-size="16">✨</text><text x="98" y="112" font-size="14">✨</text>' : '';
  return '<svg class="' + cls + '" viewBox="0 0 120 134" role="img" aria-label="' + esc(ch) + ' のキャラクター">' +
    '<ellipse cx="44" cy="122" rx="12" ry="7" fill="' + col + '"/><ellipse cx="76" cy="122" rx="12" ry="7" fill="' + col + '"/>' +
    '<ellipse cx="11" cy="80" rx="8" ry="11" fill="' + col + '"/><ellipse cx="109" cy="80" rx="8" ry="11" fill="' + col + '"/>' +
    '<rect x="14" y="16" width="92" height="102" rx="24" fill="' + col + '" opacity=".2"/>' +
    '<rect x="14" y="16" width="92" height="102" rx="24" fill="none" stroke="' + col + '" stroke-width="4"/>' +
    hat + crown +
    '<circle cx="43" cy="41" r="11" fill="#fff" stroke="' + face + '" stroke-width="2.6"/>' +
    '<circle cx="77" cy="41" r="11" fill="#fff" stroke="' + face + '" stroke-width="2.6"/>' +
    '<circle cx="44.5" cy="43" r="5" fill="' + face + '"/><circle cx="78.5" cy="43" r="5" fill="' + face + '"/>' +
    cheeks + mouth +
    '<text x="60" y="108" text-anchor="middle" font-size="46" font-weight="700" fill="' + face + '">' + esc(ch) + '</text>' +
    spark + '</svg>';
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
    '<div class="charbox">' + charSVG(ch, { cls: 'pop' }) +
    '<div class="kinfo">' +
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
        extra = '<div class="charbox">' + charSVG(ch, { cls: 'pop' }) +
          '<div class="kinfo"><div class="stars">' + starStr(after) + '</div>' +
          '<div class="kmeta">おぼえた よみ ' + rec.got.length + ' こ</div></div></div>';
      } else {
        j.textContent = '❌ ざんねん…';
        SE.ng(); $('qcard').classList.add('shake'); setTimeout(() => $('qcard').classList.remove('shake'), 320);
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
  const chars = P.newKanji.map(ch => '<div>' + charSVG(ch) + '</div>').join('');
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
      charSVG(ch) + '<div class="st">' + (lv ? starStr(lv).slice(0, lv) : 'みはっけん') + '</div></button>';
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
    '<h3 style="margin:0">' + esc(ch) + '</h3>' +
    '<span class="gradetag" style="--gc:' + gradeColor(k.g) + '">' + gradeLabel(k.g) + ' ' + (TYPE_EMOJI[k.t] || '✨') + '</span>' +
    '<div class="kmeta">おん：' + esc(k.on) + '<br>くん：' + esc(k.kun) + '</div>' +
    '<div class="stars">' + starStr(lv) + '</div></div></div>' +
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
