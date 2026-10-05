/* =========================================================
   ぷっぴの えきうた — がめんと ぷっぴの きもち
   ========================================================= */
const $ = id => document.getElementById(id);

/* ---------- ほぞん ---------- */
const SAVE_KEY = 'eki-uta-puppi-v1';
const S = {
  name: '', love: 0, met: false, last: 0, songs: 0,
  stamps: { blue: [], toyoko: [], dt: [] }, punch: {},
  pets: { d: '', n: 0 }, sound: true, speed: 1, mode: 'uta',
};
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    const d = JSON.parse(raw);
    Object.assign(S, d);
    S.stamps = Object.assign({ blue: [], toyoko: [], dt: [] }, d.stamps || {});
    S.punch = d.punch || {};
  }
} catch (e) { /* よめなくても あそべる */ }
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ほぞん できなくても つづける */ }
}

/* ---------- なかよしど ---------- */
const LV_AT = [0, 20, 60, 120, 200];
const LV_GIFT = ['', '', 'ぼうしの リボン 🎀', 'ちょうネクタイ', 'きらきら ✨', 'ちいさな おうかん 👑'];
const level = (love = S.love) => LV_AT.filter(x => love >= x).length;
let pendingLv = 0;
function addLove(n) {
  const before = level();
  S.love += n; save();
  const after = level();
  if (after > before) pendingLv = after;
  renderLove();
}
function renderLove() {
  const lv = level(), lo = LV_AT[lv - 1], hi = LV_AT[lv];
  $('loveLv').textContent = `なかよし Lv.${lv}` + (lv >= 5 ? ' MAX' : '');
  $('loveBar').style.width = (hi ? Math.round((S.love - lo) / (hi - lo) * 100) : 100) + '%';
  document.querySelectorAll('svg.puppi').forEach(lookPup);
}

/* ---------- ぷっぴの え ---------- */
const STAR = 'M0 -8 L2.4 -2.6 8 -2.4 3.6 1.2 5 7 0 3.8 -5 7 -3.6 1.2 -8 -2.4 -2.4 -2.6Z';
const HEART = 'M0 7 C-9 0 -8 -7 -3.5 -7 C-1.5 -7 0 -5.5 0 -4 C0 -5.5 1.5 -7 3.5 -7 C8 -7 9 0 0 7Z';
const LEAF = 'M-6 6 C-8 -2 -2 -8 7 -7 C8 2 2 8 -6 6Z M-6 6 L2 -2';
const PUNCH_SHAPE = { star: STAR, heart: HEART, leaf: LEAF };
function pupSVG() {
  const punches = LINE_IDS.map((id, i) => {
    const x = 64 + i * 36, d = PUNCH_SHAPE[LINES[id].punch];
    return `<g class="punch" data-line="${id}" transform="translate(${x} 167)">
      <circle class="ghost" r="7" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="2 2" opacity=".8"/>
      <path class="hole" d="${d}" fill="#fff8e6" stroke="#9a6b1c" stroke-width="1.2" stroke-linejoin="round"/></g>`;
  }).join('');
  return `<svg class="puppi" viewBox="-12 -8 224 240" data-v="smile" role="img" aria-label="ぷっぴ">
  <g class="sparkles">
    <path class="sparkle" transform="translate(6 40)" d="${STAR}" fill="#ffcf3f"/>
    <path class="sparkle" transform="translate(196 74)" d="${STAR}" fill="#ffcf3f"/>
    <path class="sparkle" transform="translate(188 186)" d="${STAR}" fill="#ffcf3f"/>
  </g>
  <g class="whole">
    <ellipse cx="100" cy="222" rx="58" ry="7" fill="rgba(0,0,0,.10)"/>
    <rect x="70" y="182" width="9" height="28" rx="4" fill="#e6a23a"/>
    <rect x="121" y="182" width="9" height="28" rx="4" fill="#e6a23a"/>
    <ellipse cx="72" cy="212" rx="16" ry="9" fill="#c9772a"/>
    <ellipse cx="128" cy="212" rx="16" ry="9" fill="#c9772a"/>
    <g class="armL"><path d="M34 120 Q14 128 10 148" stroke="#e6a23a" stroke-width="7" stroke-linecap="round" fill="none"/>
      <circle cx="10" cy="150" r="9" fill="#fff" stroke="#e6a23a" stroke-width="3"/></g>
    <g class="armR"><path d="M166 120 Q186 128 190 148" stroke="#e6a23a" stroke-width="7" stroke-linecap="round" fill="none"/>
      <circle cx="190" cy="150" r="9" fill="#fff" stroke="#e6a23a" stroke-width="3"/></g>
    <path d="M44 60 H156 Q170 60 170 74 V106 A12 12 0 0 0 170 130 V176 Q170 190 156 190 H44 Q30 190 30 176 V130 A12 12 0 0 0 30 106 V74 Q30 60 44 60Z"
      fill="#fff4cf" stroke="#e6a23a" stroke-width="5"/>
    <rect x="42" y="72" width="116" height="80" rx="8" fill="none" stroke="#f0c77a" stroke-width="2" stroke-dasharray="5 5"/>
    <rect x="33" y="158" width="134" height="18" style="fill:var(--line)" opacity=".9"/>
    ${punches}
    <g class="eye"><ellipse cx="78" cy="106" rx="8" ry="11" fill="#3a2c22"/><circle cx="81" cy="101" r="3" fill="#fff"/></g>
    <g class="eye"><ellipse cx="122" cy="106" rx="8" ry="11" fill="#3a2c22"/><circle cx="125" cy="101" r="3" fill="#fff"/></g>
    <ellipse cx="58" cy="126" rx="10" ry="6" fill="#ff9fb0" opacity=".75"/>
    <ellipse cx="142" cy="126" rx="10" ry="6" fill="#ff9fb0" opacity=".75"/>
    <g class="mouth" transform="translate(100 132)">
      <path class="m-smile" d="M-10 -3 Q0 8 10 -3" stroke="#3a2c22" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <g class="m-a"><ellipse rx="9" ry="10" fill="#8a2e3b"/><ellipse cy="5" rx="5.5" ry="3.5" fill="#ff8a9a"/></g>
      <rect class="m-i" x="-11" y="-3" width="22" height="7" rx="3.5" fill="#8a2e3b"/>
      <ellipse class="m-u" rx="5" ry="6" fill="#8a2e3b"/>
      <ellipse class="m-e" rx="9" ry="6" fill="#8a2e3b"/>
      <ellipse class="m-o" rx="7.5" ry="9" fill="#8a2e3b"/>
      <path class="m-n" d="M-6 0 H6" stroke="#3a2c22" stroke-width="3.5" stroke-linecap="round"/>
    </g>
    <g class="acc acc-tie" transform="translate(100 150)">
      <path d="M0 0 L-13 -7 L-13 7Z M0 0 L13 -7 L13 7Z" fill="#f06b93" stroke="#c94470" stroke-width="1.5" stroke-linejoin="round"/>
      <circle r="3.5" fill="#c94470"/></g>
    <g class="hat">
      <path d="M58 62 Q58 24 100 22 Q142 24 142 62Z" style="fill:var(--line)"/>
      <rect x="58" y="49" width="84" height="10" fill="rgba(0,0,0,.25)"/>
      <path d="M48 64 Q100 50 152 64 Q100 76 48 64Z" fill="#253246"/>
      <circle cx="100" cy="38" r="8" fill="#ffd23f" stroke="#d9a400" stroke-width="2"/>
      <path transform="translate(100 38) scale(.6)" d="${STAR}" fill="#fff6c2"/>
      <g class="acc acc-ribbon" transform="translate(134 40)">
        <path d="M0 0 L-12 -8 L-12 8Z M0 0 L12 -8 L12 8Z" fill="#ff7aa8" stroke="#d94f84" stroke-width="1.5" stroke-linejoin="round"/>
        <circle r="3.5" fill="#d94f84"/></g>
      <path class="acc acc-crown" d="M84 18 L86 4 L93 12 L100 0 L107 12 L114 4 L116 18Z" fill="#ffcf3f" stroke="#d9a400" stroke-width="2" stroke-linejoin="round"/>
    </g>
  </g>
</svg>`;
}
function lookPup(svg) {
  const lv = level();
  for (let k = 2; k <= 5; k++) svg.classList.toggle('lv' + k, lv >= k);
  svg.querySelectorAll('.punch').forEach(p => p.classList.toggle('got', !!S.punch[p.dataset.line]));
}
function mountPup(el) {
  el.innerHTML = pupSVG();
  const svg = el.querySelector('svg');
  lookPup(svg);
  svg.addEventListener('click', () => petPup(el, svg));
  return svg;
}
function mouthPlay(svg, notes) {
  const t0 = performance.now();
  notes.forEach(n => {
    setTimeout(() => { svg.dataset.v = n.v; }, n.time * 1000 + 40);
    setTimeout(() => { if (svg.dataset.v === n.v) svg.dataset.v = 'smile'; }, (n.time + n.dur) * 1000);
  });
  const last = notes[notes.length - 1];
  if (last) setTimeout(() => { svg.dataset.v = 'smile'; }, (last.time + last.dur) * 1000 + 80);
  return t0;
}

/* ---------- ぷっぴの ことば ---------- */
const nm = () => (S.name ? S.name + '、' : '');
const PET_LINES = [
  () => 'くすぐったいよ〜！',
  () => 'えへへ。なでなで うれしいな。',
  () => 'ぼく、きっぷだから かみ なんだ。やさしくね。',
  () => 'からだの パンチの あなは、ぼくの たからもの！',
  () => 'すきな えき？ うーん… ぜんぶ！',
  () => `${nm()}きょうは どこまで いく？`,
  () => 'ぼうしは しゃしょうさんに もらったんだ。',
];
const PET_LINES_LV = [
  () => `${nm()}といると、うたいたく なっちゃう。`,
  () => 'ずっと いっしょに のってたいな。',
  () => `${nm()}は ぼくの いちばんの ともだち！`,
];
const PET_SONGS = [['えへへ', [76, 79, 76]], ['うふふ', [74, 79, 76]], ['わーい', [72, 76, 79]], ['やっほー', [79, 76, 81]]];

function petPup(el, svg) {
  wakeUp();
  svg.classList.remove('wiggle'); void svg.getBoundingClientRect(); svg.classList.add('wiggle');
  const h = document.createElement('span');
  h.className = 'heart-pop'; h.textContent = '💗';
  h.style.left = (30 + Math.random() * 40) + '%'; h.style.top = '20%';
  el.appendChild(h); setTimeout(() => h.remove(), 1200);
  const [w, m] = PET_SONGS[Math.floor(Math.random() * PET_SONGS.length)];
  if (!Player.song) mouthPlay(svg, quickSing(w, m));
  const pool = level() >= 3 ? PET_LINES.concat(PET_LINES_LV) : PET_LINES;
  const line = pool[Math.floor(Math.random() * pool.length)]();
  const bubble = el.closest('.s-pup') ? $('singBubble') : el.closest('.hero') ? $('homeBubble') : null;
  if (bubble) bubble.textContent = line;
  const today = new Date().toDateString();
  if (S.pets.d !== today) S.pets = { d: today, n: 0 };
  if (S.pets.n < 5) { S.pets.n++; addLove(1); }
  if (pendingLv && !Player.song) showLevelUp();
}

/* ---------- ねむねむ（ホームで しばらく さわらないと） ---------- */
let idleTimer = null, sleeping = false;
function wakeUp() {
  clearTimeout(idleTimer);
  const svg = $('homePup').querySelector('svg');
  if (sleeping && svg) {
    sleeping = false;
    svg.classList.remove('sleep'); svg.dataset.v = 'smile';
    $('homePup').querySelector('.zzz')?.remove();
    $('homeBubble').textContent = 'はっ！ ね、ねてないよ！';
  }
  if (!$('homeView').hidden) idleTimer = setTimeout(goSleep, 45000);
}
function goSleep() {
  if ($('homeView').hidden || !$('ov').hidden) return;
  const svg = $('homePup').querySelector('svg');
  sleeping = true;
  svg.classList.add('sleep'); svg.dataset.v = 'sleep';
  const z = document.createElement('span'); z.className = 'zzz'; z.textContent = 'z z z';
  $('homePup').appendChild(z);
  $('homeBubble').textContent = 'すや すや…';
}
document.addEventListener('pointerdown', () => { if (!sleeping) wakeUp(); }, { passive: true });

/* ---------- おと ボタン ---------- */
function renderSound() {
  document.querySelectorAll('.soundBtn').forEach(b => {
    b.textContent = S.sound ? '🔊' : '🔇';
    b.setAttribute('aria-pressed', String(S.sound));
  });
}
document.querySelectorAll('.soundBtn').forEach(b => b.addEventListener('click', () => {
  S.sound = !S.sound; save(); Snd.setOn(S.sound); renderSound();
}));

/* ---------- ホーム ---------- */
function greet() {
  const h = new Date().getHours();
  const days = S.last ? Math.floor((Date.now() - S.last) / 864e5) : 0;
  if (days >= 3) return `${nm()}あいたかったよ〜！ ${days}にち ぶり だね。`;
  if (h < 10) return `${nm()}おはよう！ きょうも いっしょに うたおうね。`;
  if (h >= 18) return `${nm()}こんばんは。ねるまえに 1きょく どう？`;
  return `${nm()}やっほー！ どの せんを うたう？`;
}
function renderHome() {
  $('lineCards').innerHTML = LINE_IDS.map(id => {
    const L = LINES[id], n = S.stamps[id].length, all = L.stations.length;
    const got = S.punch[id];
    return `<button class="linecard" type="button" data-line="${id}" style="--c:${L.color}">
      <span class="band" aria-hidden="true">🎫</span>
      <span class="lname">${L.title}</span>
      <span class="lsub">${L.stations[0].yomi} 〜 ${L.stations[all - 1].yomi}（${all}えき）</span>
      <span class="lprog" aria-label="うたった えき ${n}/${all}"><i style="width:${n / all * 100}%"></i></span>
      <span class="lpunch">${got ? `パンチ「${L.punchName}」 もらったよ！` : `ぜんぶ うたうと パンチ「${L.punchName}」`}</span>
    </button>`;
  }).join('');
  renderLove();
}
$('lineCards').addEventListener('click', e => {
  const c = e.target.closest('.linecard'); if (c) openLine(c.dataset.line);
});

/* ---------- うたう がめん ---------- */
const cur = { line: null, dir: 0, list: [], k: 0, song: null, segIdx: 0, kara: -1, sung: new Set(), raf: 0 };

function setLineColors(L) {
  const r = document.documentElement.style;
  r.setProperty('--line', L ? L.color : '#1a73c8');
  r.setProperty('--soft', L ? L.soft : '#e3f0fc');
}
function openLine(id) {
  wakeUp(); clearTimeout(idleTimer);
  cur.line = id; cur.dir = 0;
  setLineColors(LINES[id]);
  $('homeView').hidden = true; $('singView').hidden = false;
  $('singTitle').innerHTML = LINES[id].title;
  window.scrollTo(0, 0);
  setupList();
  $('singBubble').textContent = `${LINES[id].name}の えきを ぜんぶ うたうよ！ ▶ を おしてね。えきを タッチすると そこから うたうよ。`;
}
function setupList() {
  const L = LINES[cur.line];
  stopSong();
  cur.list = cur.dir ? L.stations.slice().reverse() : L.stations.slice();
  cur.k = 0;
  $('dirBtn').innerHTML = `➡ ${L.dirs[cur.dir]}<br><span class="small">⇄ はんたいむき</span>`;
  $('strip').innerHTML = cur.list.map((s, k) =>
    `<button class="st${S.stamps[cur.line].includes(s.i) ? ' stamped' : ''}" type="button" data-k="${k}">
      <span class="dot">${s.num}</span><span class="nm">${s.yomi}</span></button>`).join('');
  showStation(0);
  renderKara(parseMora(cur.list[0].yomi), -1);
}
function showStation(k) {
  cur.k = k;
  const s = cur.list[k], prev = cur.list[k - 1], next = cur.list[k + 1];
  const pre = s.num.replace(/\d+/, ''), no = s.num.replace(/\D+/, '');
  $('numBadge').innerHTML = `<span><small>${pre}</small><b>${no}</b></span>`;
  $('sName').innerHTML = `<ruby>${s.kanji}<rt>${s.yomi}</rt></ruby>`;
  $('xfer').innerHTML = s.xfer.length
    ? 'のりかえ ' + s.xfer.map(id => `<span style="background:${LINES[id].color}">${LINES[id].name}</span>`).join('')
    : '';
  $('prevName').textContent = prev ? '← ' + prev.yomi : '';
  $('nextName').textContent = next ? next.yomi + ' →' : 'しゅうてん';
  document.querySelectorAll('#strip .st').forEach((b, i) => b.classList.toggle('cur', i === k));
  const b = $('strip').children[k];
  if (b) {
    const strip = $('strip');
    strip.scrollLeft = b.offsetLeft - strip.clientWidth / 2 + b.offsetWidth / 2;
  }
}
function renderKara(mora, active) {
  cur.kara = active;
  $('kara').innerHTML = mora.map((m, i) =>
    `<span class="mora${i < active ? ' done' : ''}${i === active ? ' now' : ''}">${m.text}</span>`).join('');
}
function updateKara(active) {
  if (active === cur.kara) return;
  cur.kara = active;
  [...$('kara').children].forEach((c, i) => {
    c.classList.toggle('now', i === active);
    if (active >= 0 && i < active) c.classList.add('done');
  });
}

function stationTalk(s, k) {
  const last = k === cur.list.length - 1, next = cur.list[k + 1];
  if (s.xfer.length) return `ここで ${s.xfer.map(id => LINES[id].name).join('と ')}にも のれるよ！`;
  if (last) return `しゅうてん！ 「${s.yomi}」〜！`;
  if (parseMora(s.yomi).length > 9) return 'ながい なまえ！ いっしょに いえるかな？';
  const cheers = [
    'いっしょに うたって〜♪',
    `${nm()}じょうず じょうず！`,
    'ガタン ゴトン、ガタン ゴトン♪',
    `つぎは「${next.yomi}」だよ。`,
  ];
  return k % 3 === 2 ? cheers[(k / 3 | 0) % cheers.length] : `つぎは「${next.yomi}」だよ。`;
}

function playFrom(k) {
  const L = LINES[cur.line];
  const list = cur.list.slice(k);
  const song = buildSong(list, { key: L.key, bpm: BPMS[S.speed], seed: LINE_IDS.indexOf(cur.line) * 2 + cur.dir });
  song.fromK = k;
  cur.song = song; cur.segIdx = 0; cur.sung = new Set();
  Player.start(song, S.mode);
  $('playBtn').textContent = '⏸'; $('playBtn').setAttribute('aria-label', 'とめる');
  $('singPup').querySelector('svg').classList.add('dance');
  enterSeg(song.segs[0]);
  cancelAnimationFrame(cur.raf);
  cur.raf = requestAnimationFrame(loop);
}
function stopSong() {
  Player.stop();
  cur.song = null;
  cancelAnimationFrame(cur.raf);
  $('playBtn').textContent = '▶'; $('playBtn').setAttribute('aria-label', 'うたう');
  const svg = $('singPup').querySelector('svg');
  if (svg) { svg.classList.remove('dance'); svg.dataset.v = 'smile'; }
  $('singPup').style.transform = '';
}
function enterSeg(seg) {
  if (seg.kind === 'station') {
    const k = cur.song.fromK + seg.k;
    showStation(k);
    $('singBubble').textContent = stationTalk(seg.st, k);
  } else if (seg.kind === 'lyric') {
    $('singBubble').textContent = seg.say;
  } else if (seg.kind === 'intro') {
    $('singBubble').textContent = `${LINES[cur.line].name}、まもなく はっしゃ しまーす！`;
  }
  if (seg.mora && seg.mora.length) renderKara(seg.mora, -1);
}
function finishSeg(seg) {
  if (seg.kind !== 'station') return;
  const st = seg.st, arr = S.stamps[cur.line];
  cur.sung.add(st.i);
  if (!arr.includes(st.i)) arr.push(st.i);
  addLove(1);
  const b = $('strip').children[cur.song.fromK + seg.k];
  if (b) b.classList.add('stamped');
}
function loop() {
  const song = cur.song; if (!song) return;
  const t = Player.now(), segs = song.segs;
  while (cur.segIdx < segs.length - 1 && t >= segs[cur.segIdx + 1].start) {
    finishSeg(segs[cur.segIdx]);
    cur.segIdx++;
    enterSeg(segs[cur.segIdx]);
  }
  const seg = segs[cur.segIdx];
  let mi = -1, v = 'smile';
  for (const n of seg.notes) {
    if (t >= n.time && t < n.time + n.dur) {
      let j = 0;
      n.moraTimes.forEach((mt, q) => { if (t >= mt) j = q; });
      mi = n.moras[j];
      if (t < n.time + (n.cut ? n.dur * .55 : n.dur) - .03) v = n.v;
    }
  }
  if (mi < 0 && seg.notes.length && t >= seg.notes[seg.notes.length - 1].time) mi = seg.mora.length;
  updateKara(mi);
  const svg = $('singPup').querySelector('svg');
  if (svg.dataset.v !== v) svg.dataset.v = v;
  if (!Player.paused) {
    const ph = ((t / song.beat) % 1 + 1) % 1;
    $('singPup').style.transform = `translateY(${(-Math.abs(Math.sin(Math.PI * ph)) * 7).toFixed(1)}px)`;
  }
  if (t > song.length) { finishSong(); return; }
  cur.raf = requestAnimationFrame(loop);
}
function finishSong() {
  const song = cur.song, L = LINES[cur.line];
  const n = cur.sung.size, whole = song.fromK === 0 && n === cur.list.length;
  stopSong();
  S.songs++;
  let newPunch = false;
  if (whole) { addLove(5); if (!S.punch[cur.line]) { S.punch[cur.line] = true; newPunch = true; } }
  save();
  document.querySelectorAll('svg.puppi').forEach(lookPup);
  const msg = whole
    ? `${L.name}、ぜんぶで ${n}えき うたえたね！`
    : `${n}えき うたえたね！`;
  openSheet(`
    <div class="pwrap" id="ovPup"></div>
    <h2>${newPunch ? '🎉 パンチ ゲット！' : 'おつかれさま！'}</h2>
    <p>${msg}</p>
    ${newPunch ? `<p>ぷっぴの からだに 「${L.punchName}」の パンチが あいたよ。<br>「ありがとう！ たからものに するね！」</p>`
      : whole ? '<p>「また いっしょに うたおうね！」</p>' : '<p>「つぎは さいしょから さいごまで うたってみよう！」</p>'}
    <div class="row">
      <button class="ok" type="button" data-act="again">🔁 もういちど</button>
      <button class="ok sub" type="button" data-act="home">🏠 ほかの せん</button>
    </div>`, act => {
    closeSheet();
    if (act === 'again') playFrom(0);
    if (act === 'home') goHome();
    if (pendingLv) showLevelUp();
  });
  const svg = mountPup($('ovPup'));
  svg.classList.add('dance');
  setTimeout(() => mouthPlay(svg, quickSing(newPunch ? 'やったー' : 'わーい', [72, 76, 79, 84])), 150);
}

$('playBtn').addEventListener('click', () => {
  if (!cur.song) { playFrom(cur.k); return; }
  if (Player.paused) {
    Player.resume(); $('playBtn').textContent = '⏸';
    $('singPup').querySelector('svg').classList.add('dance');
  } else {
    Player.pause(); $('playBtn').textContent = '▶';
    $('singPup').querySelector('svg').classList.remove('dance');
    $('singBubble').textContent = 'ちょっと ひとやすみ。▶ で つづきから うたうよ。';
  }
});
$('restartBtn').addEventListener('click', () => playFrom(0));
$('strip').addEventListener('click', e => {
  const b = e.target.closest('.st'); if (b) playFrom(+b.dataset.k);
});
$('dirBtn').addEventListener('click', () => {
  cur.dir = 1 - cur.dir; setupList();
  $('singBubble').textContent = `はんたいむき！ ${LINES[cur.line].dirs[cur.dir]} だよ。`;
});
function renderSpeed() {
  document.querySelectorAll('#speedSeg button').forEach(b =>
    b.setAttribute('aria-pressed', String(+b.dataset.speed === S.speed)));
}
$('speedSeg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  S.speed = +b.dataset.speed; save(); renderSpeed();
  if (cur.song) playFrom(cur.k);
});
function goHome() {
  stopSong();
  setLineColors(null);
  $('singView').hidden = true; $('homeView').hidden = false;
  renderHome();
  $('homeBubble').textContent = `${nm()}たのしかったね！ つぎは どれに する？`;
  wakeUp();
}
$('backBtn').addEventListener('click', goHome);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && cur.song && !Player.paused) $('playBtn').click();
});

/* ---------- オーバーレイ ---------- */
let sheetCb = null;
function openSheet(html, cb) {
  $('sheet').innerHTML = html; sheetCb = cb || null; $('ov').hidden = false;
}
function closeSheet() { $('ov').hidden = true; $('sheet').innerHTML = ''; }
$('sheet').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (b && sheetCb) sheetCb(b.dataset.act, b);
});

function showLevelUp() {
  const lv = pendingLv; pendingLv = 0;
  openSheet(`
    <div class="pwrap" id="ovPup"></div>
    <h2>💗 なかよし Lv.${lv}！</h2>
    <p>ぷっぴに 「${LV_GIFT[lv]}」が ついたよ！</p>
    <p>「${nm()}だいすき！ もっと いっしょに うたおうね！」</p>
    <div class="row"><button class="ok" type="button" data-act="close">やったね！</button></div>`, () => closeSheet());
  const svg = mountPup($('ovPup'));
  svg.classList.add('dance');
}

function showBook() {
  openSheet(`<h2>📒 スタンプちょう</h2>
    <p class="small">うたった えきに スタンプが おされるよ</p>
    ${LINE_IDS.map(id => {
      const L = LINES[id];
      return `<div class="book-line" style="background:${L.color}">${L.name}　${S.stamps[id].length} / ${L.stations.length}</div>
      <div class="book-grid" style="--c:${L.color}">${L.stations.map(s => {
        const on = S.stamps[id].includes(s.i);
        return `<div class="stamp${on ? ' on' : ''}"><span><span class="mk">${on ? '🎫' : '・'}</span><br>${s.yomi}</span></div>`;
      }).join('')}</div>`;
    }).join('')}
    <div class="row"><button class="ok" type="button" data-act="close">とじる</button></div>`, () => closeSheet());
}
$('bookBtn').addEventListener('click', showBook);

function showSettings() {
  openSheet(`<h2>⚙️ せってい</h2>
    <div class="opt">
      <label for="nameIn">ぷっぴに よんで ほしい なまえ</label>
      <input class="name-in" id="nameIn" maxlength="10" value="${S.name.replace(/"/g, '&quot;')}" placeholder="たとえば たろうくん" autocomplete="off">
    </div>
    <div class="opt">
      <div>うたいかた</div>
      <div class="seg" id="modeSeg">
        <button type="button" data-mode="uta" aria-pressed="${S.mode === 'uta'}">🎤 ぷっぴが うたう</button>
        <button type="button" data-mode="yomi" aria-pressed="${S.mode === 'yomi'}">🗣 よみあげ＋メロディ</button>
      </div>
      <div class="small">「よみあげ」は たんまつの よみあげ きのうで えきめいを よみます</div>
    </div>
    <div class="row">
      <button class="ok" type="button" data-act="save">これで いい</button>
      <button class="ok sub" type="button" data-act="reset">さいしょから</button>
    </div>`, act => {
    if (act === 'save') {
      S.name = $('nameIn').value.trim().slice(0, 10); save(); closeSheet();
      $('homeBubble').textContent = S.name ? `${S.name}！ いい なまえ！ よろしくね。` : 'わかった！';
    } else if (act === 'reset') {
      if (confirm('スタンプ・パンチ・なかよしどを ぜんぶ けして さいしょから に しますか？')) {
        Object.assign(S, { love: 0, songs: 0, stamps: { blue: [], toyoko: [], dt: [] }, punch: {}, met: false });
        save(); closeSheet(); renderHome(); intro();
      }
    }
  });
  $('modeSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    S.mode = b.dataset.mode; save();
    $('modeSeg').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  });
}
$('setBtn').addEventListener('click', showSettings);

/* ---------- はじめての であい ---------- */
const INTRO = [
  ['はじめまして！', 'ぼく、<b>ぷっぴ</b>。<br>きっぷの こども だよ。', 'はじめまして', [72, 74, 76, 79, 76, 74]],
  ['ぼくの ひみつ', 'まいごに ならないように、<br>えきの なまえを ぜんぶ<br><b>うた</b>で おぼえてるんだ。', 'ららら', [76, 79, 84]],
  ['パンチを あつめたい！', 'ひとつの せんを さいしょから さいごまで<br>いっしょに うたえたら、<br>しゃしょうさんみたいに<br>からだに <b>パンチ</b>を あけてね。', 'おねがい', [79, 76, 74, 72]],
];
function intro(page = 0) {
  if (page < INTRO.length) {
    const [h, p, w, m] = INTRO[page];
    openSheet(`<div class="pwrap" id="ovPup"></div><h2>${h}</h2><p>${p}</p>
      <div class="row"><button class="ok" type="button" data-act="next">つぎへ ▶</button></div>`, () => intro(page + 1));
    const svg = mountPup($('ovPup'));
    if (page > 0) setTimeout(() => mouthPlay(svg, quickSing(w, m)), 100);
    return;
  }
  openSheet(`<div class="pwrap" id="ovPup"></div><h2>きみの なまえは？</h2>
    <p>いっしょに うたって くれる？<br>なまえを おしえてくれたら よぶね。</p>
    <input class="name-in" id="nameIn" maxlength="10" placeholder="たとえば たろうくん" autocomplete="off">
    <div class="row">
      <button class="ok" type="button" data-act="ok">よろしくね！</button>
      <button class="ok sub" type="button" data-act="skip">あとで</button>
    </div>`, act => {
    if (act === 'ok') S.name = $('nameIn').value.trim().slice(0, 10);
    S.met = true; save(); closeSheet();
    $('homeBubble').textContent = `${nm()}よろしくね！ どの せんから うたう？`;
    const svg = $('homePup').querySelector('svg');
    mouthPlay(svg, quickSing('よろしくね', [72, 76, 79, 76, 84]));
    wakeUp();
  });
  const svg = mountPup($('ovPup'));
  mouthPlay(svg, quickSing('なまえは', [76, 79, 81, 79]));
}

/* ---------- はじまり ---------- */
Snd.on = S.sound;
mountPup($('homePup'));
mountPup($('singPup'));
renderSound(); renderSpeed(); renderHome();
$('homeBubble').textContent = greet();
S.last = Date.now(); save();
if (!S.met) intro(); else wakeUp();
