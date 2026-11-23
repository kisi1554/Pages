/* 横浜グルメ図鑑 - 一覧・しぼりこみ・記録 */
(() => {
  'use strict';

  const GENRES = [
    { id: 'izakaya', name: '居酒屋',       emoji: '🏮' },
    { id: 'chinese', name: '中華',         emoji: '🥟' },
    { id: 'ramen',   name: 'ラーメン・麺', emoji: '🍜' },
    { id: 'sushi',   name: '寿司・海鮮',   emoji: '🍣' },
    { id: 'washoku', name: '和食',         emoji: '🍱' },
    { id: 'meat',    name: '焼肉・肉',     emoji: '🥩' },
    { id: 'western', name: '洋食・イタリアン・フレンチ', emoji: '🍝' },
    { id: 'burger',  name: 'ハンバーガー', emoji: '🍔' },
    { id: 'asian',   name: 'カレー・アジア', emoji: '🍛' },
    { id: 'cafe',    name: 'カフェ・甘味', emoji: '☕' },
    { id: 'other',   name: 'その他',       emoji: '🍴' },
  ];
  const genreOf = Object.fromEntries(GENRES.map(g => [g.id, g]));
  const areaOf = Object.fromEntries(AREAS.map(a => [a.id, a]));

  const KEY = 'yokohama-gourmet-zukan:v1';
  let rec = {};          // { [id]: { want, went, memo } }
  try { rec = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { rec = {}; }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(rec)); return true; } catch (e) { return false; }
  }
  const r = id => rec[id] || {};

  const state = { area: 'all', genre: 'all', mark: 'all', q: '', sort: 'score' };
  const $ = id => document.getElementById(id);

  const starsHTML = v => `<span class="stars" aria-label="★${v}"><span style="width:${(v / 5) * 100}%">★★★★★</span></span>`;
  const fmt = n => n.toLocaleString('ja-JP');
  const mapsURL = s => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name)}&query_place_id=${encodeURIComponent(s.id)}`;
  const reviewsURL = s => `https://search.google.com/local/reviews?placeid=${encodeURIComponent(s.id)}`;

  /* ---------- 営業時間 ---------- */
  // hours は [月, 火, …, 日]。"11:30-14:30,17:00-25:00"（25:00 は翌1:00）、"" は定休日、null は不明
  const WD = ['月', '火', '水', '木', '金', '土', '日'];
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const ranges = (s, d) => {
    const h = s.hours && s.hours[d];
    return h ? h.split(',').map(x => x.split('-').map(toMin)) : [];
  };
  const clock = m => { const h = Math.floor(m / 60); return `${h >= 24 ? '翌' + (h - 24) : h}:${String(m % 60).padStart(2, '0')}`; };
  const dayText = (s, d) => {
    const h = s.hours && s.hours[d];
    if (h == null) return '不明';
    if (h === '') return '定休日';
    if (h === '0:00-24:00') return '24時間営業';
    return ranges(s, d).map(([a, b]) => `${clock(a)}〜${clock(b)}`).join(' / ');
  };
  const today = () => (new Date().getDay() + 6) % 7;   // 月=0 … 日=6
  // いまの営業状況: { cls, text }。前の日の深夜営業（翌2:00まで など）も見る
  function status(s) {
    if (!s.hours) return null;
    const now = new Date(), d = today(), t = now.getHours() * 60 + now.getMinutes();
    const spans = [...ranges(s, d), ...ranges(s, (d + 6) % 7).map(([a, b]) => [a - 1440, b - 1440])];
    const open = spans.find(([a, b]) => a <= t && t < b);
    if (open) return open[1] - t <= 60
      ? { cls: 'soon', text: `まもなく閉店（${clock(((open[1] % 1440) + 1440) % 1440)}まで）` }
      : { cls: 'open', text: `営業中（${clock(open[1] < 0 ? open[1] + 1440 : open[1])}まで）` };
    const next = ranges(s, d).map(([a]) => a).filter(a => a > t).sort((a, b) => a - b)[0];
    if (next != null) return { cls: 'closed', text: `準備中（${clock(next)}から）` };
    if (s.hours[d] === '') return { cls: 'closed', text: 'きょうは定休日' };
    return { cls: 'closed', text: 'きょうの営業は終了' };
  }

  /* ---------- しぼりこみ ---------- */
  function matches(s, skip) {
    if (skip !== 'area' && state.area !== 'all' && s.area !== state.area) return false;
    if (skip !== 'genre' && state.genre !== 'all' && s.genre !== state.genre) return false;
    if (skip !== 'mark') {
      const m = r(s.id);
      if (state.mark === 'want' && !m.want) return false;
      if (state.mark === 'went' && !m.went) return false;
      if (state.mark === 'yet' && m.went) return false;
      if (state.mark === 'open' && !['open', 'soon'].includes((status(s) || {}).cls)) return false;
    }
    if (state.q) {
      const hay = (s.name + ' ' + s.cats.join(' ') + ' ' + s.addr + ' ' + (r(s.id).memo || '') + ' ' +
        genreOf[s.genre].name + ' ' + areaOf[s.area].name).toLowerCase();
      if (!state.q.split(/\s+/).every(w => hay.includes(w))) return false;
    }
    return true;
  }

  const SORTS = {
    score:  (a, b) => b.score - a.score,
    rating: (a, b) => b.rating - a.rating || b.count - a.count,
    count:  (a, b) => b.count - a.count,
    name:   (a, b) => a.name.localeCompare(b.name, 'ja'),
  };

  function chips(el, items, key) {
    el.innerHTML = '';
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('aria-pressed', String(state[key] === it.id));
      b.innerHTML = `${it.label}${it.n != null ? `<small>${it.n}</small>` : ''}`;
      b.addEventListener('click', () => {
        state[key] = state[key] === it.id && it.id !== 'all' ? 'all' : it.id;
        render();
      });
      el.appendChild(b);
    }
  }

  function renderChips() {
    const count = (skip, pred) => SPOTS.filter(s => matches(s, skip) && pred(s)).length;
    chips($('areaChips'), [{ id: 'all', label: '📍 ぜんぶのエリア', n: count('area', () => true) },
      ...AREAS.map(a => ({ id: a.id, label: a.name, n: count('area', s => s.area === a.id) }))
        .filter(c => c.n > 0 || state.area === c.id)], 'area');
    chips($('genreChips'), [{ id: 'all', label: '🍽️ ぜんぶのジャンル', n: count('genre', () => true) },
      ...GENRES.map(g => ({ id: g.id, label: `${g.emoji} ${g.name}`, n: count('genre', s => s.genre === g.id) }))
        .filter(c => c.n > 0 || state.genre === c.id)], 'genre');
    chips($('markChips'), [
      { id: 'all',  label: 'すべて' },
      { id: 'want', label: '❤️ 行きたい', n: count('mark', s => r(s.id).want) },
      { id: 'went', label: '✅ 行った',   n: count('mark', s => r(s.id).went) },
      { id: 'yet',  label: 'まだ行ってない', n: count('mark', s => !r(s.id).went) },
      { id: 'open', label: '🕒 いま営業中', n: count('mark', s => ['open', 'soon'].includes((status(s) || {}).cls)) },
    ], 'mark');
  }

  function render() {
    renderChips();
    const list = SPOTS.filter(s => matches(s)).sort(SORTS[state.sort]);
    const grid = $('grid');
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    list.forEach((s, i) => {
      const g = genreOf[s.genre], m = r(s.id), st = status(s);
      const li = document.createElement('li');
      const rank = i + 1;
      li.innerHTML = `
        <button type="button" class="card${m.went ? ' is-went' : ''}">
          <span class="card__no" aria-hidden="true">${g.emoji}<span class="card__rank${rank <= 3 ? ' r' + rank : ''}">${rank}</span></span>
          <span class="card__body">
            <span class="card__name"></span>
            <span class="card__score"><span class="card__rating">★${s.rating.toFixed(1)}</span>${starsHTML(s.rating)}
              <span class="card__count">口コミ ${fmt(s.count)}件</span>${s.count >= 2000 ? '<span class="badge">🔥 大人気</span>' : ''}</span>
            <span class="card__meta">${areaOf[s.area].name} ・ ${s.cats[0] || g.name}</span>
            ${s.hours ? `<span class="card__hours"><span class="state state--${st.cls}">${st.text}</span> きょう（${WD[today()]}） ${dayText(s, today())}</span>` : ''}
          </span>
          <span class="card__marks">${m.want ? '❤️' : ''}${m.went ? '✅' : ''}</span>
        </button>`;
      li.querySelector('.card__name').textContent = s.name;
      li.querySelector('button').addEventListener('click', () => open(s, rank));
      frag.appendChild(li);
    });
    grid.appendChild(frag);
    $('empty').hidden = list.length > 0;
    const sortName = $('sort').selectedOptions[0].textContent;
    $('resultInfo').textContent = `${list.length}軒（${sortName}）`;

    const went = SPOTS.filter(s => r(s.id).went).length;
    $('progBar').style.width = `${(went / SPOTS.length) * 100}%`;
    $('progText').textContent = `制覇 ${went} / ${SPOTS.length}`;
  }

  /* ---------- 詳細 ---------- */
  let current = null, lastFocus = null;
  function open(s, rank) {
    current = s;
    lastFocus = document.activeElement;
    const g = genreOf[s.genre];
    $('dEmoji').textContent = g.emoji;
    $('dNo').textContent = `図鑑 No.${String(s.no).padStart(3, '0')}` + (rank ? ` ・ いまの並びで ${rank}位` : '');
    $('dName').textContent = s.name;
    $('dMeta').textContent = `${areaOf[s.area].name} ・ ${g.name}`;
    $('dRating').textContent = s.rating.toFixed(1);
    $('dStars').outerHTML = starsHTML(s.rating).replace('class="stars"', 'class="stars" id="dStars"');
    $('dCount').textContent = `Googleの口コミ ${fmt(s.count)}件 ・ 全${SPOTS.length}軒中 おすすめ度 ${s.no}位`;
    $('dCats').innerHTML = '';
    for (const c of s.cats) { const sp = document.createElement('span'); sp.textContent = c; $('dCats').appendChild(sp); }
    $('dAddr').textContent = `📮 ${s.addr}`;
    const st = status(s), d0 = today();
    $('dHours').innerHTML = s.hours
      ? `<p class="dhours__now"><span class="state state--${st.cls}">${st.text}</span></p><table>${WD.map((w, d) =>
          `<tr${d === d0 ? ' class="is-today"' : ''}><th>${w}</th><td>${dayText(s, d)}</td></tr>`).join('')}</table>`
      : '<p>営業時間はわかりません。Googleマップで確かめてください。</p>';
    $('dMap').href = mapsURL(s);
    $('dReviews').href = reviewsURL(s);
    $('dMemo').value = r(s.id).memo || '';
    $('dSave').textContent = '';
    syncMarks();
    $('sheet').hidden = false;
    document.body.style.overflow = 'hidden';
    document.querySelector('.sheet__close').focus();
  }
  function close() {
    $('sheet').hidden = true;
    document.body.style.overflow = '';
    current = null;
    render();
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  function syncMarks() {
    const m = r(current.id);
    document.querySelectorAll('.mark').forEach(b => b.setAttribute('aria-pressed', String(!!m[b.dataset.mark])));
  }
  function update(patch) {
    const m = { ...r(current.id), ...patch };
    if (!m.want && !m.went && !m.memo) delete rec[current.id]; else rec[current.id] = m;
    const ok = save();
    $('dSave').textContent = ok ? '保存しました' : '保存できませんでした（ブラウザの設定を確認してください）';
    $('dSave').classList.toggle('is-error', !ok);
  }

  document.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('sheet').hidden) close(); });
  document.querySelectorAll('.mark').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.mark;
    update({ [k]: !r(current.id)[k] });
    syncMarks();
  }));
  let memoTimer;
  $('dMemo').addEventListener('input', () => {
    clearTimeout(memoTimer);
    memoTimer = setTimeout(() => update({ memo: $('dMemo').value.trim() }), 400);
  });

  /* ---------- 上の操作 ---------- */
  $('q').addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); render(); });
  $('sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
  $('btnPick').addEventListener('click', () => {
    let pool = SPOTS.filter(s => matches(s) && !r(s.id).went);
    if (!pool.length) pool = SPOTS.filter(s => matches(s));
    if (!pool.length) pool = SPOTS;
    open(pool[Math.floor(Math.random() * pool.length)]);
  });

  // 時間がたつと「営業中」がずれるので、1分ごとに書きなおす（詳細を開いているあいだは止める）
  setInterval(() => { if ($('sheet').hidden) render(); }, 60000);

  $('fetched').textContent = FETCHED.replace(/-/g, '/');
  $('criteria').textContent = `★${CRITERIA.rating}以上・口コミ${CRITERIA.count}件以上` +
    Object.entries(CRITERIA.areaCount).map(([a, n]) => `（${areaOf[a].name}は小さい店が多いので${n}件以上）`).join('');
  $('lead').textContent = `Googleの口コミで評価が高い横浜のお店 ${SPOTS.length}軒。★と口コミ件数からおすすめ順に並べました。`;
  render();
})();
