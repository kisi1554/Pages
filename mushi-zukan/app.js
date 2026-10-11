'use strict';

/*
 * むしずかん
 *  #/          … ホーム（なかまを えらぶ）
 *  #/g/<id>    … なかまの ページ（しゅるい いちらん・からだ・いっしょう）
 *  #/b/<id>    … しゅるいの ページ（え・データ・なきごえ・みつけた！）
 *  #/quiz      … むしクイズ（10もん）
 */

(function () {
  const app = document.getElementById('app');
  const backBtn = document.getElementById('back');
  const soundBtn = document.getElementById('sound');

  /* ------------------------------ ほぞん ------------------------------ */

  const KEY = 'mushi-zukan-v1';
  let save = { found: {}, best: 0, sound: true };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') save = Object.assign(save, s);
  } catch (e) { /* よめなくても あそべる */ }

  function store() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても つづける */ }
  }

  /* ------------------------------ べんり ------------------------------ */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // {漢字|かんじ} → ふりがなつき
  function rb(s) {
    return esc(s).replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
  }
  function shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }
  const groupOf = (id) => GROUPS.find((g) => g.id === id);
  const bugOf = (id) => BUGS.find((b) => b.id === id);
  const bugsIn = (gid) => BUGS.filter((b) => b.group === gid);
  const foundIn = (gid) => bugsIn(gid).filter((b) => save.found[b.id]).length;
  const cm = (n) => String(n).replace(/\.0$/, '');

  /* ------------------------------- おと ------------------------------- */

  function paintSound() {
    soundBtn.textContent = save.sound ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-pressed', save.sound ? 'true' : 'false');
  }
  MushiAudio.setOn(save.sound);
  paintSound();
  soundBtn.addEventListener('click', () => {
    save.sound = !save.sound;
    MushiAudio.setOn(save.sound);
    MushiAudio.se('tap');
    paintSound();
    store();
    document.querySelectorAll('.song-btn').forEach((b) => { b.disabled = !save.sound; });
  });
  backBtn.addEventListener('click', () => {
    MushiAudio.se('tap');
    const h = location.hash;
    if (h.startsWith('#/b/')) {
      const b = bugOf(h.slice(4));
      location.hash = b ? '#/g/' + b.group : '#/';
    } else {
      location.hash = '#/';
    }
  });

  /* ------------------------------ ホーム ------------------------------ */

  function home() {
    const total = BUGS.length;
    const got = BUGS.filter((b) => save.found[b.id]).length;
    const pick = BUGS[Math.floor(Math.random() * BUGS.length)];
    app.innerHTML =
      `<section class="hero">
        <h1>むしずかん</h1>
        <p><ruby>虫<rt>むし</rt></ruby>の なかまを えらんで しらべよう！</p>
        <div class="meter" role="img" aria-label="みつけた むし ${got} / ${total}">
          <span class="meter-label">🖐 みつけた むし</span>
          <span class="meter-bar"><span style="width:${(got / total) * 100}%"></span></span>
          <b>${got} / ${total}</b>
        </div>
      </section>
      <section class="groups">
        ${GROUPS.map((g) => {
          const icon = bugsIn(g.id)[0];
          return `<a class="group-card" href="#/g/${g.id}" style="--accent:${g.color};--tint:${g.tint}">
            <span class="group-art">${BugArt.svg(icon)}</span>
            <span class="group-text">
              <span class="group-name">${esc(g.name)}の なかま</span>
              <span class="group-catch">${rb(g.catch)}</span>
              <span class="group-count">${bugsIn(g.id).length}しゅるい ・ みつけた ${foundIn(g.id)}</span>
            </span>
          </a>`;
        }).join('')}
        <a class="group-card quiz-card" href="#/quiz">
          <span class="group-art big-emoji" aria-hidden="true">❓</span>
          <span class="group-text">
            <span class="group-name">むしクイズ</span>
            <span class="group-catch">ずかんで しらべた ことを ためそう</span>
            <span class="group-count">${save.best ? 'さいこう ' + save.best + ' / 10 もん' : '10もん ちょうせん！'}</span>
          </span>
        </a>
      </section>
      <section class="tip" style="--accent:${groupOf(pick.group).color}">
        <h2>💡 きょうの まめちしき</h2>
        <p><a href="#/b/${pick.id}">${esc(pick.name)}</a> … ${rb(pick.trivia)}</p>
      </section>
      <section class="coming">
        <h2>これから ふえる なかま</h2>
        <ul>${COMING.map((c) => `<li><span aria-hidden="true">${c.emoji}</span>${esc(c.name)}</li>`).join('')}</ul>
      </section>`;
  }

  /* --------------------------- なかまの ページ --------------------------- */

  function group(g) {
    const list = bugsIn(g.id);
    app.innerHTML =
      `<section class="ghead" style="--accent:${g.color};--tint:${g.tint}">
        <h1>${esc(g.name)}の なかま</h1>
        <p>${rb(g.catch)}</p>
        <p class="ghead-count">みつけた ${foundIn(g.id)} / ${list.length}</p>
      </section>
      <h2 class="sec" style="--accent:${g.color}">しゅるい</h2>
      <section class="bug-grid">
        ${list.map((b) => `<a class="bug-card${save.found[b.id] ? ' is-found' : ''}" href="#/b/${b.id}" style="--accent:${g.color};--tint:${g.tint}">
          <span class="bug-art">${BugArt.svg(b)}</span>
          <span class="bug-name">${esc(b.name)}</span>
          <span class="bug-size">${cm(b.size[0])}〜${cm(b.size[1])}cm</span>
          ${save.found[b.id] ? '<span class="badge" aria-label="みつけた">🖐</span>' : ''}
        </a>`).join('')}
      </section>
      <h2 class="sec" style="--accent:${g.color}">からだの ひみつ</h2>
      <section class="facts">
        ${g.body.map((f) => `<div class="fact"><span class="fact-icon" aria-hidden="true">${f.icon}</span><p>${rb(f.text)}</p></div>`).join('')}
      </section>
      <h2 class="sec" style="--accent:${g.color}">いっしょう</h2>
      <ol class="life" style="--accent:${g.color};--tint:${g.tint}">
        ${g.life.map((s) => `<li><span class="life-icon" aria-hidden="true">${s.icon}</span><b>${esc(s.title)}</b><p>${rb(s.text)}</p></li>`).join('')}
      </ol>
      <p class="note">${rb(g.lifeNote)}</p>`;
  }

  /* --------------------------- しゅるいの ページ --------------------------- */

  function monthsStrip(months) {
    let h = '<div class="months">';
    for (let m = 1; m <= 12; m++) {
      h += `<span class="${months.includes(m) ? 'on' : ''}">${m}</span>`;
    }
    return h + '</div>';
  }

  function sizeRuler(size) {
    const max = 10;
    let ticks = '';
    for (let i = 0; i <= max; i++) ticks += `<span style="left:${(i / max) * 100}%"><i>${i}</i></span>`;
    return `<div class="ruler" role="img" aria-label="${cm(size[0])}から${cm(size[1])}センチ">
      <div class="ruler-range" style="left:${(size[0] / max) * 100}%;width:${((size[1] - size[0]) / max) * 100}%"></div>
      <div class="ruler-ticks">${ticks}</div>
    </div>`;
  }

  function bug(b) {
    const g = groupOf(b.group);
    const list = bugsIn(g.id);
    const i = list.indexOf(b);
    const prev = list[(i - 1 + list.length) % list.length];
    const next = list[(i + 1) % list.length];
    const found = !!save.found[b.id];
    app.innerHTML =
      `<article class="detail" style="--accent:${g.color};--tint:${g.tint}">
        <div class="detail-top">
          <div class="detail-art">${BugArt.svg(b)}</div>
          <div class="detail-head">
            <p class="detail-group">${esc(g.name)}の なかま</p>
            <h1>${esc(b.name)}</h1>
            <button class="stamp${found ? ' on' : ''}" id="stamp" aria-pressed="${found}">
              <span aria-hidden="true">🖐</span> ${found ? 'みつけた！' : 'みつけたら タップ'}
            </button>
          </div>
        </div>
        ${b.song ? `<div class="song">
          <button class="song-btn" id="song" ${save.sound ? '' : 'disabled'}><span aria-hidden="true">▶</span> なきごえを きく</button>
          <p class="song-text">「${esc(b.songText)}」</p>
        </div>` : ''}
        <dl class="data">
          <div><dt>📏 <ruby>大<rt>おお</rt></ruby>きさ</dt><dd><b>${cm(b.size[0])}〜${cm(b.size[1])}cm</b> <small>（はねの さきまで）</small>${sizeRuler(b.size)}</dd></div>
          <div><dt>📅 みられる <ruby>月<rt>つき</rt></ruby></dt><dd>${monthsStrip(b.months)}<small>おとなの すがたが みられる ころ</small></dd></div>
          <div><dt>🌳 すむ ところ</dt><dd>${rb(b.place)}</dd></div>
          <div><dt>🍽 たべもの</dt><dd>${rb(b.food)}</dd></div>
        </dl>
        <h2 class="sec">とくちょう</h2>
        <ul class="points">${b.points.map((p) => `<li>${rb(p)}</li>`).join('')}</ul>
        <div class="trivia"><h2>💡 まめちしき</h2><p>${rb(b.trivia)}</p></div>
        <nav class="pager">
          <a href="#/b/${prev.id}">◀ ${esc(prev.name)}</a>
          <a href="#/b/${next.id}">${esc(next.name)} ▶</a>
        </nav>
      </article>`;

    const stamp = document.getElementById('stamp');
    stamp.addEventListener('click', () => {
      if (save.found[b.id]) delete save.found[b.id];
      else save.found[b.id] = true;
      store();
      const on = !!save.found[b.id];
      stamp.classList.toggle('on', on);
      stamp.setAttribute('aria-pressed', on);
      stamp.innerHTML = `<span aria-hidden="true">🖐</span> ${on ? 'みつけた！' : 'みつけたら タップ'}`;
      MushiAudio.se(on ? 'stamp' : 'tap');
      if (on) {
        stamp.classList.remove('pop');
        void stamp.offsetWidth;
        stamp.classList.add('pop');
      }
    });

    const songBtn = document.getElementById('song');
    if (songBtn) songBtn.addEventListener('click', () => toggleSong(songBtn, b.song));
  }

  function toggleSong(btn, id) {
    if (btn.classList.contains('playing')) {
      MushiAudio.stopSong();
      btn.classList.remove('playing');
      return;
    }
    btn.classList.add('playing');
    MushiAudio.playSong(id, () => btn.classList.remove('playing'));
  }

  /* ------------------------------- クイズ ------------------------------- */

  let quiz = null;

  function makeQuiz() {
    const pool = [];
    BUGS.forEach((b) => {
      const same = bugsIn(b.group).filter((x) => x !== b);
      pool.push({ type: 'pic', bug: b, answer: b.name, wrong: shuffle(same).slice(0, 3).map((x) => x.name), why: b.points[0] });
    });
    if (save.sound) {
      BUGS.filter((b) => b.song).forEach((b) => {
        const same = BUGS.filter((x) => x.song && x !== b);
        pool.push({ type: 'song', bug: b, answer: b.name, wrong: shuffle(same).slice(0, 3).map((x) => x.name), why: '「' + b.songText + '」と なくよ。' });
      });
    }
    for (let k = 0; k < 4; k++) {
      const pair = shuffle(BUGS).slice(0, 2);
      if (Math.abs(pair[0].size[1] - pair[1].size[1]) < 1) continue;
      const [big, small] = pair[0].size[1] > pair[1].size[1] ? pair : [pair[1], pair[0]];
      pool.push({ type: 'size', pair: shuffle(pair), answer: big.name, wrong: [small.name], why: `${big.name}は ${cm(big.size[1])}cm、${small.name}は ${cm(small.size[1])}cmくらいまで。` });
    }
    FACTS.forEach((f) => pool.push({ type: 'fact', fact: f, answer: f.a, wrong: f.x, why: f.why }));
    // おなじ むしの もんだいが つづかないように えらぶ
    const picked = [];
    const used = new Set();
    for (const q of shuffle(pool)) {
      const key = q.bug ? q.bug.id : q.pair ? q.pair.map((b) => b.id).join() : q.fact.q;
      if (used.has(key)) continue;
      used.add(key);
      picked.push(q);
      if (picked.length === 10) break;
    }
    return { qs: picked, n: 0, score: 0 };
  }

  function startQuiz() {
    quiz = makeQuiz();
    showQ();
  }

  function showQ() {
    MushiAudio.stopSong();
    const q = quiz.qs[quiz.n];
    q.choices = shuffle([q.answer].concat(q.wrong));
    let ask = '';
    let visual = '';
    if (q.type === 'pic') {
      ask = 'この {虫|むし}の なまえは？';
      visual = `<div class="q-art">${BugArt.svg(q.bug)}</div>`;
    } else if (q.type === 'song') {
      ask = 'この なきごえの セミは どれ？';
      visual = `<button class="song-btn big" id="qsong"><span aria-hidden="true">▶</span> もういちど きく</button>`;
    } else if (q.type === 'size') {
      ask = 'どっちが {大|おお}きい？';
      // えは おなじ 大きさで ならべる（えで こたえが わからないように）
      visual = `<div class="q-pair">${q.pair.map((b) => `<div class="q-art small">${BugArt.svg(b)}</div>`).join('')}</div>
        <p class="q-hint">※ えの <ruby>大<rt>おお</rt></ruby>きさは じっさいとは ちがうよ</p>`;
    } else {
      ask = q.fact.q;
    }
    app.innerHTML =
      `<section class="quiz">
        <div class="q-progress"><span>${quiz.n + 1} / ${quiz.qs.length} もんめ</span><span>⭐ ${quiz.score}</span></div>
        <h1 class="q-ask">${rb(ask)}</h1>
        ${visual}
        <div class="choices${q.choices.length === 2 ? ' two' : ''}">
          ${q.choices.map((c, i) => `<button class="choice" data-i="${i}">${rb(c)}</button>`).join('')}
        </div>
        <div class="q-result" id="qres" hidden></div>
      </section>`;
    app.querySelectorAll('.choice').forEach((btn) => btn.addEventListener('click', () => answer(btn)));
    if (q.type === 'song') {
      const sb = document.getElementById('qsong');
      sb.addEventListener('click', () => toggleSong(sb, q.bug.song));
      setTimeout(() => toggleSong(sb, q.bug.song), 300);
    }
  }

  function answer(btn) {
    const q = quiz.qs[quiz.n];
    const pick = q.choices[+btn.dataset.i];
    const ok = pick === q.answer;
    if (ok) quiz.score++;
    MushiAudio.stopSong();
    MushiAudio.se(ok ? 'correct' : 'wrong');
    app.querySelectorAll('.choice').forEach((b) => {
      b.disabled = true;
      const c = q.choices[+b.dataset.i];
      if (c === q.answer) b.classList.add('right');
      else if (b === btn) b.classList.add('miss');
    });
    const res = document.getElementById('qres');
    const last = quiz.n === quiz.qs.length - 1;
    const link = q.bug ? ` <a href="#/b/${q.bug.id}">ずかんを みる</a>` : '';
    res.hidden = false;
    res.className = 'q-result ' + (ok ? 'ok' : 'ng');
    res.innerHTML =
      `<p class="q-mark">${ok ? '⭕ せいかい！' : '❌ ざんねん… こたえは「' + rb(q.answer) + '」'}</p>
      <p>${rb(q.why)}${link}</p>
      <button class="next" id="next">${last ? 'けっかを みる' : 'つぎの もんだい ▶'}</button>`;
    const nx = document.getElementById('next');
    nx.focus({ preventScroll: true });
    res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    nx.addEventListener('click', () => {
      MushiAudio.se('tap');
      if (last) result();
      else { quiz.n++; showQ(); window.scrollTo(0, 0); }
    });
  }

  function result() {
    const s = quiz.score;
    const n = quiz.qs.length;
    const newBest = s > (save.best || 0);
    if (newBest) { save.best = s; store(); }
    const stars = s === n ? 3 : s >= n * 0.7 ? 2 : s >= n * 0.4 ? 1 : 0;
    const msg = ['ずかんを よんで、また ちょうせん しよう！', 'いい ちょうし！', 'すごい！ むしはかせに ちかづいて いるよ！', 'ぜんもん せいかい！ むしはかせだ！'][stars];
    MushiAudio.se('fanfare');
    app.innerHTML =
      `<section class="quiz result">
        <h1>けっか</h1>
        <p class="score"><b>${s}</b> / ${n} もん せいかい</p>
        <p class="stars" aria-label="ほし ${stars}こ">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
        <p>${msg}</p>
        ${newBest ? '<p class="newbest">🎉 じこベスト こうしん！</p>' : ''}
        <div class="choices two">
          <button class="choice" id="again">もういちど</button>
          <a class="choice" href="#/">ずかんに もどる</a>
        </div>
      </section>`;
    document.getElementById('again').addEventListener('click', () => { MushiAudio.se('tap'); startQuiz(); });
  }

  /* ------------------------------ ルーター ------------------------------ */

  function route() {
    MushiAudio.stopSong();
    const h = location.hash || '#/';
    let m;
    backBtn.hidden = h === '#/' || h === '';
    if ((m = h.match(/^#\/g\/(\w+)/)) && groupOf(m[1])) group(groupOf(m[1]));
    else if ((m = h.match(/^#\/b\/(\w+)/)) && bugOf(m[1])) bug(bugOf(m[1]));
    else if (h === '#/quiz') startQuiz();
    else { backBtn.hidden = true; home(); }
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  route();
})();
