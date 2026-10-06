/* =========================================================
   レーナの えきめいソング — がめん と レーナの うごき
   ========================================================= */
const $ = id => document.getElementById(id);

/* ---------- ほぞん ---------- */
const SAVE_KEY = 'eki-song-lena-v1';
const S = { sound: true, song: 'pop', dir: {}, done: {}, plays: 0, anki: false, hide: false };
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) Object.assign(S, JSON.parse(raw));
} catch (e) { /* よめなくても あそべる */ }
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ほぞん できなくても つづける */ }
}
if (!SONGS[S.song]) S.song = 'pop';

/* ---------- レーナの え ---------- */
function lenaSVG() {
  return `<svg class="lena" viewBox="0 0 200 230" data-v="smile" role="img" aria-label="レーナ">
  <g class="whole">
    <ellipse cx="100" cy="224" rx="52" ry="6" fill="rgba(0,0,0,.18)"/>
    <!-- ツインテール（せんの いろ） -->
    <g class="tailL"><path d="M46 70 C10 80 8 140 26 176 C30 150 34 120 54 96Z" class="hair-c"/></g>
    <g class="tailR"><path d="M154 70 C190 80 192 140 174 176 C170 150 166 120 146 96Z" class="hair-c"/></g>
    <!-- からだ -->
    <path d="M68 150 Q100 140 132 150 L144 212 Q100 222 56 212Z" fill="#fff" stroke="#2b2350" stroke-width="3"/>
    <path d="M60 196 Q100 206 140 196 L144 212 Q100 222 56 212Z" class="hair-c"/>
    <path d="M88 150 L100 166 L112 150" fill="none" stroke="#2b2350" stroke-width="3" stroke-linejoin="round"/>
    <path d="M92 160 L100 172 L108 160 L100 166Z" class="hair-c"/>
    <!-- マイク -->
    <g class="armR"><path d="M134 160 Q150 168 146 186" stroke="#ffe0cc" stroke-width="9" stroke-linecap="round" fill="none"/>
      <rect x="140" y="150" width="10" height="34" rx="4" fill="#2b2350" transform="rotate(-18 145 167)"/>
      <circle cx="139" cy="148" r="10" fill="#c9c6d8" stroke="#2b2350" stroke-width="2.5"/></g>
    <g class="armL"><path d="M66 160 Q48 172 52 190" stroke="#ffe0cc" stroke-width="9" stroke-linecap="round" fill="none"/></g>
    <!-- あたま -->
    <circle cx="100" cy="92" r="56" fill="#ffe8da" stroke="#2b2350" stroke-width="3"/>
    <path d="M44 92 C40 40 80 26 100 30 C130 28 162 44 156 92 C150 70 136 58 122 56 C118 66 104 70 94 62 C84 70 66 68 60 60 C52 70 48 80 44 92Z" class="hair-c" stroke="#2b2350" stroke-width="3"/>
    <!-- ヘッドホン -->
    <path d="M42 96 C38 28 162 28 158 96" fill="none" stroke="#2b2350" stroke-width="7"/>
    <rect x="30" y="80" width="20" height="34" rx="8" fill="#2b2350"/>
    <rect x="150" y="80" width="20" height="34" rx="8" fill="#2b2350"/>
    <circle cx="40" cy="97" r="5" class="glow"/><circle cx="160" cy="97" r="5" class="glow"/>
    <!-- かお -->
    <g class="eye"><ellipse cx="80" cy="98" rx="9" ry="12" fill="#2b2350"/><circle cx="83" cy="93" r="3.5" fill="#fff"/><circle cx="78" cy="103" r="1.6" fill="#fff"/></g>
    <g class="eye"><ellipse cx="120" cy="98" rx="9" ry="12" fill="#2b2350"/><circle cx="123" cy="93" r="3.5" fill="#fff"/><circle cx="118" cy="103" r="1.6" fill="#fff"/></g>
    <ellipse cx="64" cy="116" rx="9" ry="5" fill="#ff9fb8" opacity=".7"/>
    <ellipse cx="136" cy="116" rx="9" ry="5" fill="#ff9fb8" opacity=".7"/>
    <g class="mouth" fill="#c2304f" stroke="#2b2350" stroke-width="2" stroke-linejoin="round">
      <path class="m-smile" d="M90 120 Q100 130 110 120" fill="none" stroke-linecap="round"/>
      <ellipse class="m-a" cx="100" cy="124" rx="8" ry="9"/>
      <ellipse class="m-i" cx="100" cy="123" rx="9" ry="3.5"/>
      <ellipse class="m-u" cx="100" cy="123" rx="4" ry="4.5"/>
      <ellipse class="m-e" cx="100" cy="123" rx="8" ry="6"/>
      <ellipse class="m-o" cx="100" cy="124" rx="6" ry="8"/>
      <path class="m-n" d="M94 123 H106" fill="none" stroke-linecap="round"/>
    </g>
    <!-- おんぷ -->
    <text class="note1" x="168" y="40" font-size="26">♪</text>
    <text class="note2" x="10" y="52" font-size="22">♫</text>
  </g>
</svg>`;
}
function setMouth(v) { document.querySelectorAll('svg.lena').forEach(s => s.setAttribute('data-v', v)); }

/* ---------- おと ---------- */
function renderSound() {
  document.querySelectorAll('.soundBtn').forEach(b => {
    b.textContent = S.sound ? '🔊' : '🔇';
    b.setAttribute('aria-pressed', String(S.sound));
  });
}
Snd.on = S.sound;
document.querySelectorAll('.soundBtn').forEach(b => b.addEventListener('click', () => {
  S.sound = !S.sound; save(); Snd.setOn(S.sound); renderSound();
}));

/* ---------- ホーム ---------- */
const HELLO = [
  'やっほー！ レーナだよ', 'えきの なまえ、ぜんぶ うたえるよ！', 'きょうは どの せんに する？',
  'はやくち、まかせて！', 'いっしょに うたおう♪',
];
function renderHome() {
  $('songChips').innerHTML = SONG_IDS.map(id => {
    const s = SONGS[id];
    return `<button class="chip${S.song === id ? ' on' : ''}" type="button" data-song="${id}" aria-pressed="${S.song === id}">
      <span class="e">${s.emoji}</span><span><b>${s.name}</b><small>${s.desc}</small></span></button>`;
  }).join('');
  const card = id => {
    const L = LINES[id], n = S.done[id] || 0;
    return `<button class="lcard" type="button" data-line="${id}" style="--c:${L.color};--d:${L.dark}">
      <span class="mk">${L.mark}</span>
      <span class="lt"><b>${L.title}</b><small>${L.stations.length}${L.unit || 'えき'}${n ? `・🏅 ${n}かい うたった` : ''}</small></span>
      <span class="go">▶</span></button>`;
  };
  $('lineCards').innerHTML = LINE_IDS.map(card).join('');
  $('oboeCards').innerHTML = OBOE_IDS.map(card).join('');
}
$('songChips').addEventListener('click', e => {
  const b = e.target.closest('[data-song]'); if (!b) return;
  S.song = b.dataset.song; save(); renderHome();
  hop($('homeLena'));
  quickSing(SONGS[S.song].id === 'lofi' ? 'ふわぁ' : 'いぇーい', [74, 79, 83, 86]);
});
for (const box of ['lineCards', 'oboeCards']) $(box).addEventListener('click', e => {
  const b = e.target.closest('[data-line]'); if (b) openLine(b.dataset.line);
});
let helloI = 0;
$('homeLena').addEventListener('click', () => {
  helloI = (helloI + 1) % HELLO.length;
  $('homeBubble').textContent = HELLO[helloI];
  hop($('homeLena'));
  const notes = quickSing('らららー', [74, 78, 81, 86]);
  lipSync(notes);
});
function hop(el) {
  const s = el.querySelector('svg'); if (!s) return;
  s.classList.remove('hop'); void s.getBoundingClientRect(); s.classList.add('hop');
}
function lipSync(notes) {
  const t0 = performance.now();
  notes.forEach(n => setTimeout(() => setMouth(n.v), n.time * 1000));
  const end = notes.length ? notes[notes.length - 1].time + notes[notes.length - 1].dur : 0;
  setTimeout(() => { if (!Player.song) setMouth('smile'); }, end * 1000 + 80 + (performance.now() - t0));
}

/* ---------- うたう がめん ---------- */
const V = { line: null, list: [], song: null, segIdx: -1, raf: 0, fromK: 0 };

function openLine(id) {
  const L = LINES[id];
  V.line = L;
  document.documentElement.style.setProperty('--line', L.color);
  document.documentElement.style.setProperty('--line-dark', L.dark);
  $('homeView').hidden = true; $('singView').hidden = false;
  $('singTitle').innerHTML = `${L.title}<small>${SONGS[S.song].emoji} ${SONGS[S.song].name}</small>`;
  window.scrollTo(0, 0);
  prepare(0);
}

function orderedList() {
  const L = V.line, rev = !!S.dir[L.id];
  let list = L.stations.slice();
  if (rev) list.reverse();
  if (L.loop) list = list.concat([list[0]]);      // やまのてせんは 1しゅう して もどる
  return list;
}

function prepare(fromK) {
  Player.stop();
  V.list = orderedList();
  V.song = buildSong(V.list, SONGS[S.song], { lineName: V.line.name.split('＋')[0], count: V.line.stations.length, unit: V.line.unit, bye: V.line.oboe ? 'また うたおうね' : '', seed: ALL_IDS.indexOf(V.line.id) * 2 });
  V.fromK = fromK; V.segIdx = -1;
  $('dirBtn').textContent = '⇄ ' + V.line.dirs[S.dir[V.line.id] ? 1 : 0];
  renderRoute();
  renderAlist();
  renderAnki();
  markAnki(fromK - 1);
  const st = V.list[fromK];
  showStation(st, fromK, true);
  $('yomi').innerHTML = esc(st.yomi);
  $('next').innerHTML = '▶ を おすと うたうよ！';
  $('playBtn').textContent = '▶';
  $('progBar').style.width = '0%';
  setMouth('smile');
  setDance(false);
}

/* ---------- えきめい あんきモード（たてながの ショートどうが ふう） ---------- */
function renderAnki() {
  $('stage').classList.toggle('shorts', S.anki);
  $('alist').classList.toggle('hide', S.hide);
  $('ankiBtn').setAttribute('aria-pressed', String(S.anki));
  $('ankiBtn').textContent = S.anki ? '📺 ふつうの がめん' : '📱 あんきモード';
  $('hideBtn').hidden = !S.anki;
  $('hideBtn').setAttribute('aria-pressed', String(S.hide));
  $('hideBtn').textContent = S.hide ? '👀 つぎも みせる' : '🙈 つぎを かくす';
  if (V.line) $('shead').innerHTML = `<span>【${V.line.oboe ? 'いっき おぼえ' : 'えきめい あんき'}】</span><b>${V.line.title}</b>`;
}
function renderAlist() {
  $('alist').innerHTML = V.list.map((st, k) =>
    `<li data-k="${k}"><span class="an">${esc(st.num || '')}</span><span class="nm">${esc(st.kanji)}<small>${esc(st.yomi)}</small></span></li>`).join('');
}
function markAnki(k) {
  const items = $('alist').children;
  for (let i = 0; i < items.length; i++) {
    items[i].classList.toggle('past', i < k);
    items[i].classList.toggle('now', i === k);
    items[i].classList.toggle('future', i > k);
  }
  const cur = items[k];
  if (cur) $('alist').scrollTo({ top: cur.offsetTop - $('alist').clientHeight / 2 + cur.offsetHeight / 2, behavior: 'smooth' });
}
$('alist').addEventListener('click', e => {
  const li = e.target.closest('[data-k]'); if (li) startFrom(+li.dataset.k);
});
$('ankiBtn').addEventListener('click', () => { S.anki = !S.anki; save(); renderAnki(); markAnki(Math.max(0, currentK())); });
$('hideBtn').addEventListener('click', () => { S.hide = !S.hide; save(); renderAnki(); });
function currentK() {
  const seg = V.song && V.song.segs[V.segIdx];
  return seg && seg.kind === 'station' ? seg.k : V.fromK - 1;
}

function renderRoute() {
  $('route').innerHTML = V.list.map((st, k) =>
    `<button type="button" class="dot" data-k="${k}"><i></i><span>${esc(st.kanji)}</span></button>`).join('');
}
$('route').addEventListener('click', e => {
  const b = e.target.closest('[data-k]'); if (!b) return;
  startFrom(+b.dataset.k);
});

function startFrom(k) {
  if (!V.song) return;
  const seg = V.song.segs.find(s => s.kind === 'station' && s.k === k);
  V.fromK = k;
  const from = k === 0 ? 0 : seg.start - V.song.beat;   // 1ぱく まえから
  Player.start(V.song, from);
  if (k === 0) S.plays++;
  V.startedAtZero = k === 0;
  save();
  $('playBtn').textContent = '⏸';
  setDance(true);
  loop();
}

$('playBtn').addEventListener('click', () => {
  if (!Player.song) { startFrom(V.fromK); return; }
  if (Player.paused) { Player.resume(); $('playBtn').textContent = '⏸'; setDance(true); loop(); }
  else { Player.pause(); $('playBtn').textContent = '▶'; setDance(false); setMouth('smile'); }
});
$('restartBtn').addEventListener('click', () => { prepare(0); startFrom(0); });
$('dirBtn').addEventListener('click', () => {
  S.dir[V.line.id] = !S.dir[V.line.id]; save(); prepare(0);
});
$('backBtn').addEventListener('click', goHome);
function goHome() {
  Player.stop(); cancelAnimationFrame(V.raf); V.song = null;
  $('singView').hidden = true; $('homeView').hidden = false;
  renderHome(); setDance(false); setMouth('smile');
}

function setDance(on) {
  document.querySelectorAll('svg.lena').forEach(s => s.classList.toggle('dance', on));
  $('stage').classList.toggle('playing', on);
  if (V.song) $('stage').style.setProperty('--beat', V.song.beat + 's');
}

function loop() {
  cancelAnimationFrame(V.raf);
  const tick = () => {
    if (!Player.song || Player.paused) return;
    const t = Player.now(), song = V.song;
    if (t > song.length) { finish(); return; }
    $('progBar').style.width = Math.min(100, t / song.length * 100) + '%';

    let si = song.segs.findIndex(s => t >= s.start && t < s.end);
    if (si < 0) si = song.segs.length - 1;
    const seg = song.segs[si];
    if (si !== V.segIdx) { V.segIdx = si; onSeg(seg); }

    // いま うたっている モーラ
    let mouth = 'smile', lit = -1;
    for (const n of seg.notes) {
      if (t >= n.time && t < n.time + n.dur) {
        mouth = n.v;
        n.moraTimes.forEach((mt, j) => { if (t >= mt) lit = n.moras[j]; });
      }
      if (t >= n.time) lit = Math.max(lit, n.moras[0]);
    }
    setMouth(mouth);
    const spans = $('yomi').children;
    for (let j = 0; j < spans.length; j++) spans[j].classList.toggle('lit', j <= lit);

    V.raf = requestAnimationFrame(tick);
  };
  V.raf = requestAnimationFrame(tick);
}

function onSeg(seg) {
  if (seg.kind === 'station') {
    showStation(seg.st, seg.k);
    $('yomi').innerHTML = seg.mora.map(m => `<span>${esc(m.text)}</span>`).join('');
    const nx = V.list.slice(seg.k + 1, seg.k + 4).map(s => esc(s.kanji));
    $('next').innerHTML = nx.length ? 'つぎは ' + nx.join(' → ') : (V.line.oboe ? 'さいご！' : 'しゅうてん！');
    document.querySelectorAll('#route .dot').forEach((d, i) => {
      d.classList.toggle('past', i < seg.k);
      d.classList.toggle('now', i === seg.k);
    });
    markAnki(seg.k);
    const cur = document.querySelector('#route .dot.now');
    // scrollIntoView は iPhone で がめん ぜんたいを よこに ずらすので、ろせんずの なかだけ うごかす
    if (cur) {
      const r = $('route');
      r.scrollTo({ left: cur.offsetLeft - r.clientWidth / 2 + cur.offsetWidth / 2, behavior: 'smooth' });
    }
    $('sign').classList.remove('pop'); void $('sign').offsetWidth; $('sign').classList.add('pop');
  } else if (seg.kind === 'lyric') {
    $('lyric').classList.add('call');
    $('count').textContent = '';
    $('num').hidden = true;
    $('kanji').textContent = '♪';
    $('yomi').innerHTML = seg.mora.map(m => `<span>${esc(m.text)}</span>`).join('');
    $('next').innerHTML = '';
  } else if (seg.kind === 'intro') {
    $('lyric').classList.add('call');
    $('kanji').textContent = '🎤';
    $('yomi').textContent = 'もうすぐ はじまるよ…';
    $('num').hidden = true; $('count').textContent = '';
  }
}

function showStation(st, k, still) {
  $('lyric').classList.remove('call');
  const m = st.num.match(/^([A-Z]*)(\d+)$/);
  $('num').hidden = !m;                         // えきナンバーが ない えきも ある
  if (m) {
    $('num').querySelector('small').textContent = m[1];
    $('num').querySelector('b').textContent = m[2];
  }
  $('kanji').textContent = st.kanji;
  $('kanji').classList.toggle('long', st.kanji.length >= 7);
  $('kanji').classList.toggle('one', st.kanji.length === 1);
  $('count').textContent = still ? '' : `${k + 1} / ${V.list.length}`;
}

function finish() {
  cancelAnimationFrame(V.raf);
  const full = V.startedAtZero;
  Player.stop();
  setDance(false); setMouth('smile');
  $('playBtn').textContent = '▶';
  if (full) { S.done[V.line.id] = (S.done[V.line.id] || 0) + 1; save(); }
  const L = V.line;
  $('sheet').innerHTML = `
    <div class="medal" style="--c:${L.color}">${full ? '🏅' : '🎵'}</div>
    <h3>${full ? 'ぜんぶ うたえたね！' : 'さいごまで うたったよ！'}</h3>
    <p>${L.title}　${L.stations.length}${L.unit || 'えき'}${full ? `<br>🏅 ${S.done[L.id]}かいめ` : '<br>さいしょから うたうと メダルが もらえるよ'}</p>
    <div class="sheet-btns">
      <button class="pill" type="button" id="againBtn">🔁 もういちど</button>
      <button class="pill" type="button" id="homeBtn">🏠 ほかの せん</button>
    </div>`;
  $('ov').hidden = false;
  $('againBtn').onclick = () => { $('ov').hidden = true; prepare(0); startFrom(0); };
  $('homeBtn').onclick = () => { $('ov').hidden = true; goHome(); };
  if (full) setTimeout(() => lipSync(quickSing('やったー', [79, 83, 86, 91])), 200);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && Player.song && !Player.paused) {
    Player.pause(); $('playBtn').textContent = '▶'; setDance(false);
  }
});

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ---------- はじめる ---------- */
$('homeLena').innerHTML = lenaSVG();
$('singLena').innerHTML = lenaSVG();
document.documentElement.style.setProperty('--line', LINES.yamanote.color);
renderSound();
renderHome();
