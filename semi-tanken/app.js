'use strict';

/*
 * セミたんけん 本体
 *  がめん: title / life(いっしょう) / zukan(ずかん) / quiz(なきごえクイズ) / hunt(セミとり)
 *  5さいでも あそべるように:
 *    - 文字は ぜんぶ ひらがな・カタカナ、ボタンは 大きく
 *    - がめんが かわるたび、あんない役の「せみのすけ」が よみあげる
 *    - まちがえても おこられない(なんかいでも やりなおせる)
 */

/* ------------------------------ どうぐ ------------------------------ */

const $ = (id) => document.getElementById(id);
const app = $('app');

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ---------------------------- セーブデータ ---------------------------- */

const SAVE_KEY = 'semi-tanken-v1';

const save = {
  found: {},      // みつけた セミ { abura: true, ... }
  lifeDone: false,
  quizBest: 0,
};

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d && typeof d === 'object') {
      save.found = d.found || {};
      save.lifeDone = !!d.lifeDone;
      save.quizBest = d.quizBest || 0;
    }
  } catch (e) {
    /* こわれていたら はじめから */
  }
}

function store() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {
    /* ほぞんできなくても あそべる */
  }
}

function foundCount() {
  return SEMI.filter((s) => save.found[s.id]).length;
}

function markFound(id) {
  const isNew = !save.found[id];
  save.found[id] = true;
  store();
  return isNew;
}

/* ----------------------------- おとの せってい ----------------------------- */

const sound = { voice: true, song: true, se: true };

function applySound() {
  SemiAudio.setVoiceEnabled(sound.voice);
  SemiAudio.setSongEnabled(sound.song);
  SemiAudio.setSeEnabled(sound.se);
}

/* --------------------------- せみのすけ(あんない) --------------------------- */

const guideEl = $('guide');
const guideArt = $('guideArt');
const guideText = $('guideText');
let lastLine = '';

function say(text, face) {
  lastLine = text;
  guideEl.hidden = false;
  guideArt.innerHTML = Art.guide(face || 'smile');
  guideText.textContent = text;
  guideEl.classList.remove('talking');
  SemiAudio.speak(text, {
    onStart: () => guideEl.classList.add('talking'),
    onDone: () => guideEl.classList.remove('talking'),
  });
}

function hideGuide() {
  guideEl.hidden = true;
  SemiAudio.stopSpeak();
}

/* ------------------------------ がめん ------------------------------ */

let screen = 'title';

function setTop(title, showBack) {
  $('topTitle').textContent = title;
  $('backBtn').hidden = !showBack;
}

function go(name) {
  SemiAudio.stopSpeak();
  SemiAudio.stopSong();
  SemiAudio.stopAmbience();
  screen = name;
  window.scrollTo(0, 0);
  if (name === 'title') renderTitle();
  else if (name === 'life') startLife();
  else if (name === 'zukan') renderZukan();
  else if (name === 'quiz') startQuiz();
  else if (name === 'hunt') startHunt();
}

/* ============================== タイトル ============================== */

const MENU = [
  { id: 'life', emoji: '🌱', name: 'セミの いっしょう', desc: 'たまごから なつの きまで、8つの ばめんを たどろう', color: '#4f8a3a' },
  { id: 'quiz', emoji: '🔊', name: 'なきごえクイズ', desc: 'なきごえを きいて、どの セミか あてよう', color: '#e08a1e' },
  { id: 'hunt', emoji: '🌳', name: 'セミとり たんけん', desc: 'はっぱを タップして セミを さがそう', color: '#2f7d8c' },
  { id: 'zukan', emoji: '📔', name: 'セミずかん', desc: '7しゅるいの セミを みてみよう', color: '#8a5a2b' },
];

function renderTitle() {
  setTop('セミたんけん', false);
  const n = foundCount();
  app.innerHTML = `
<section class="title-screen">
  <div class="hero">
    <div class="hero-sun"></div>
    ${Art.cicada(SEMI_BY_ID.abura, { size: 150 })}
    <p class="hero-copy">セミの ことが わかる アプリ<br><span class="hero-sub">なつの きの セミは、なにを して いるのかな？</span></p>
  </div>

  <nav class="menu">
    ${MENU.map(
      (m) => `
    <button class="card menu-card" type="button" data-go="${m.id}" style="--accent:${m.color}">
      <span class="card-emoji" aria-hidden="true">${m.emoji}</span>
      <span class="card-text">
        <span class="card-name">${m.name}</span>
        <span class="card-desc">${m.desc}</span>
      </span>
    </button>`
    ).join('')}
  </nav>

  <p class="zukan-count">ずかん： <strong>${n}</strong> / ${SEMI.length} しゅるい みつけた${n === SEMI.length ? '　🎉 ぜんぶ！' : ''}</p>

  <details class="parent">
    <summary>おうちの方へ</summary>
    <ul>${PARENT_NOTES.map((t) => `<li>${t}</li>`).join('')}</ul>
  </details>
</section>`;

  app.querySelectorAll('[data-go]').forEach((b) =>
    b.addEventListener('click', () => {
      SemiAudio.unlock();
      SemiAudio.seTap();
      go(b.dataset.go);
    })
  );

  say('セミたんけんへ ようこそ！ぼくは せみのすけ。あそびたい ボタンを えらんでね。');
}

/* ============================ セミの いっしょう ============================ */

const life = { i: 0, taps: 0, done: false };

function startLife() {
  life.i = 0;
  renderLife();
}

function lifeStage(sc) {
  const abura = SEMI_BY_ID.abura;
  switch (sc.art) {
    case 'egg':
      return `<div class="stage-sky">${Art.eggBranch({ size: 300 })}</div>`;

    case 'hatch':
      return `<div class="stage-sky">
        ${Art.eggBranch({ size: 240 })}
        <div class="falling">${Art.larva({ size: 46 })}</div>
        <div class="ground-line"></div>
      </div>`;

    case 'dig':
      return `<div class="stage-dig" id="digZone" role="button" tabindex="0" aria-label="つちを ほる">
        <div class="sky-strip"></div>
        <div class="soil">
          <div class="tunnel" id="tunnel"></div>
          <div class="digger" id="digger">${Art.larva({ size: 76 })}</div>
          <div class="soil-crumbs" id="crumbs"></div>
        </div>
      </div>`;

    case 'under':
      return `<div class="stage-under" id="underZone">
        <div class="soil-top"></div>
        <svg class="roots" viewBox="0 0 300 200" aria-hidden="true">
          <path d="M150 0 v60 M150 60 q-60 30 -80 100 M150 60 q60 30 80 100 M150 60 v120" stroke="#7d5227" stroke-width="10" fill="none" stroke-linecap="round"/>
        </svg>
        <button class="root-tap" id="rootTap" type="button" aria-label="ねっこの しるを すう">
          <span class="larva-grow" id="larvaGrow">${Art.larva({ size: 70 })}</span>
        </button>
        <p class="year-count" id="yearCount">つちの なか <strong>1</strong> ねんめ</p>
      </div>`;

    case 'out':
      return `<div class="stage-dusk" id="outZone">
        <div class="trunk"></div>
        <button class="climber" id="climber" type="button" aria-label="きに のぼる">${Art.larva({ size: 64 })}</button>
        <div class="ground-line dusk"></div>
      </div>`;

    case 'molt':
      return `<div class="stage-night" id="moltZone">
        <div class="trunk"></div>
        <button class="molt-target" id="moltTarget" type="button" aria-label="うかを おうえんする">
          <span class="molt-shell" id="moltShell">${Art.shell({ size: 90 })}</span>
          <span class="molt-cicada" id="moltCicada">${Art.cicada(abura, { size: 90, wingSpread: 0.25, face: 'wow' })}</span>
        </button>
        <p class="tap-count" id="moltCount">タップ ： 0 / 4</p>
      </div>`;

    case 'wing':
      return `<div class="stage-night">
        <div class="trunk"></div>
        <div class="wing-grow" id="wingGrow">${Art.cicada(abura, { size: 140 })}</div>
        <div class="shell-left">${Art.shell({ size: 70, split: true })}</div>
      </div>`;

    case 'sing':
      return `<div class="stage-sky sunny">
        <div class="hero-sun small"></div>
        <div class="trunk tall"></div>
        <button class="singer" id="singer" type="button" aria-label="セミを タップして なかせる">
          ${Art.cicada(abura, { size: 130 })}
        </button>
        <p class="song-bubble" id="songBubble">タップしてね</p>
      </div>`;
  }
  return '';
}

function renderLife() {
  const sc = LIFE_SCENES[life.i];
  life.taps = 0;
  life.done = !sc.tap;
  setTop('セミの いっしょう', true);

  app.innerHTML = `
<section class="scene">
  <h2 class="scene-title">${sc.title}</h2>
  <div class="stage">${lifeStage(sc)}</div>
  ${sc.hint ? `<p class="hint" id="hint">${sc.hint}</p>` : ''}
  <div class="dots">${LIFE_SCENES.map((s, i) => `<span class="dot${i === life.i ? ' on' : ''}${i < life.i ? ' past' : ''}"></span>`).join('')}</div>
  <div class="scene-nav">
    <button class="btn btn-sub" type="button" id="prevBtn" ${life.i === 0 ? 'disabled' : ''}>◀ まえ</button>
    <button class="btn btn-main" type="button" id="nextBtn">${life.i === LIFE_SCENES.length - 1 ? 'おしまい 🎉' : 'つぎへ ▶'}</button>
  </div>
</section>`;

  bindLifeStage(sc);

  $('prevBtn').addEventListener('click', () => {
    SemiAudio.seTap();
    if (life.i > 0) {
      life.i--;
      renderLife();
    }
  });
  $('nextBtn').addEventListener('click', () => {
    SemiAudio.seTap();
    if (life.i === LIFE_SCENES.length - 1) {
      finishLife();
      return;
    }
    life.i++;
    renderLife();
  });

  say(sc.text);
}

function bindLifeStage(sc) {
  const need = 4;

  if (sc.tap === 'dig') {
    const zone = $('digZone');
    const digger = $('digger');
    const doDig = () => {
      if (life.taps >= need) return;
      life.taps++;
      SemiAudio.seDig();
      digger.style.transform = `translate(-50%, ${life.taps * 34}px) rotate(${life.taps % 2 ? -8 : 8}deg)`;
      $('tunnel').style.height = life.taps * 34 + 40 + 'px';
      const c = $('crumbs');
      const s = document.createElement('span');
      s.className = 'crumb';
      s.style.left = 30 + Math.random() * 40 + '%';
      c.appendChild(s);
      setTimeout(() => s.remove(), 700);
      if (life.taps >= need) {
        life.done = true;
        $('hint').textContent = 'つちの なかへ もぐったよ！';
        say('じょうずに ほれたね！ようちゅうは つちの なかへ もぐって いったよ。', 'wow');
      }
    };
    zone.addEventListener('click', doDig);
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        doDig();
      }
    });
  }

  if (sc.tap === 'suck') {
    const btn = $('rootTap');
    const grow = $('larvaGrow');
    const yc = $('yearCount');
    const years = [1, 2, 3, 4, 5, 6];
    btn.addEventListener('click', () => {
      if (life.taps >= 5) return;
      life.taps++;
      SemiAudio.seTap();
      grow.style.transform = `scale(${1 + life.taps * 0.16})`;
      yc.innerHTML = `つちの なか <strong>${years[life.taps]}</strong> ねんめ`;
      if (life.taps >= 5) {
        life.done = true;
        $('hint').textContent = '6ねんかけて、こんなに おおきく なったよ！';
        say('6ねんも つちの なかに いたんだ。こんなに おおきく なったよ。', 'wow');
      }
    });
  }

  if (sc.tap === 'climb') {
    const climber = $('climber');
    climber.addEventListener('click', () => {
      if (life.done) return;
      SemiAudio.seTap();
      climber.classList.add('climbed');
      life.done = true;
      $('hint').textContent = 'きに のぼったよ。ここで うかを するんだ。';
      say('きの みきに しっかり つかまったよ。ここで うかを するんだ。');
    });
  }

  if (sc.tap === 'molt') {
    const target = $('moltTarget');
    const cic = $('moltCicada');
    const shell = $('moltShell');
    const cnt = $('moltCount');
    target.addEventListener('click', () => {
      if (life.taps >= need) return;
      life.taps++;
      SemiAudio.seTap();
      cnt.textContent = `タップ ： ${life.taps} / ${need}`;
      target.classList.add('step-' + life.taps);
      cic.style.transform = `translate(-50%, ${-life.taps * 16}px)`;
      cic.style.opacity = String(0.25 + life.taps * 0.2);
      if (life.taps === 1) shell.innerHTML = Art.shell({ size: 90, split: true });
      if (life.taps >= need) {
        life.done = true;
        SemiAudio.seFanfare();
        $('hint').textContent = 'うか せいこう！ぬけがらが のこったね。';
        say('うか せいこう！ぬけがらが のこったね。これが こうえんで みつかる ぬけがらだよ。', 'wow');
      }
    });
  }

  if (sc.tap === 'sing') {
    const singer = $('singer');
    const bubble = $('songBubble');
    singer.addEventListener('click', () => {
      SemiAudio.unlock();
      singer.classList.add('singing');
      bubble.textContent = SEMI_BY_ID.abura.song;
      SemiAudio.playSong('abura', {
        onDone: () => {
          singer.classList.remove('singing');
          bubble.textContent = 'もういちど タップ してね';
        },
      });
      life.done = true;
    });
  }
}

function finishLife() {
  save.lifeDone = true;
  markFound('abura');
  store();
  SemiAudio.seFanfare();
  setTop('セミの いっしょう', true);
  app.innerHTML = `
<section class="result">
  <h2>セミの いっしょう、たんけん おしまい！</h2>
  <div class="result-art">${Art.cicada(SEMI_BY_ID.abura, { size: 160, face: 'wow' })}</div>
  <ul class="recap">
    <li>🥚 たまごは きの えだの なか</li>
    <li>🕳️ うまれたら すぐ つちの なかへ</li>
    <li>⏳ つちの なかで なんねんも そだつ</li>
    <li>🌙 なつの ゆうがた そとに でて うか</li>
    <li>🎵 なつの あいだ、おすが おおきな こえで なく</li>
  </ul>
  <div class="scene-nav">
    <button class="btn btn-sub" type="button" id="againBtn">もういちど みる</button>
    <button class="btn btn-main" type="button" id="toQuiz">なきごえクイズへ ▶</button>
  </div>
</section>`;
  $('againBtn').addEventListener('click', () => {
    SemiAudio.seTap();
    startLife();
  });
  $('toQuiz').addEventListener('click', () => {
    SemiAudio.seTap();
    go('quiz');
  });
  say('よく できました！セミは つちの なかで なんねんも すごしてから、なつの きで なくんだね。');
}

/* ============================== セミずかん ============================== */

function renderZukan() {
  setTop('セミずかん', true);
  app.innerHTML = `
<section class="zukan">
  <p class="zukan-count">みつけた： <strong>${foundCount()}</strong> / ${SEMI.length}</p>
  <div class="zukan-grid">
    ${SEMI.map(
      (s) => `
    <button class="zukan-card${save.found[s.id] ? ' got' : ''}" type="button" data-semi="${s.id}" style="--accent:${s.color}; --tint:${s.tint}">
      <span class="zukan-art">${Art.cicada(s, { size: 92 })}</span>
      <span class="zukan-name">${s.name}</span>
      <span class="zukan-song">${s.song}</span>
      ${save.found[s.id] ? '<span class="badge">みつけた</span>' : ''}
    </button>`
    ).join('')}
  </div>
</section>`;

  app.querySelectorAll('[data-semi]').forEach((b) =>
    b.addEventListener('click', () => {
      SemiAudio.seTap();
      renderSemiDetail(b.dataset.semi);
    })
  );

  say('セミずかんだよ。みたい セミを タップしてね。');
}

function renderSemiDetail(id) {
  const s = SEMI_BY_ID[id];
  setTop(s.name, true);
  app.innerHTML = `
<section class="detail" style="--accent:${s.color}; --tint:${s.tint}">
  <div class="detail-art">${Art.cicada(s, { size: 190 })}</div>
  <h2 class="detail-name">${s.name}</h2>
  <button class="btn btn-song" type="button" id="playSong">🔊 なきごえを きく</button>
  <p class="song-line" id="songLine">${s.song}</p>
  <dl class="facts">
    <div><dt>おおきさ</dt><dd>${s.size}</dd></div>
    <div><dt>なく とき</dt><dd>${s.when} の ${s.time}</dd></div>
    <div><dt>いる ばしょ</dt><dd>${s.where}</dd></div>
    <div><dt>つちの なか</dt><dd>だいたい ${s.years} ねん</dd></div>
    <div><dt>みわけかた</dt><dd>${s.hint}</dd></div>
  </dl>
  <p class="fact-box">💡 ${s.fact}</p>
  <div class="scene-nav">
    <button class="btn btn-sub" type="button" id="backZukan">◀ ずかんへ</button>
    <button class="btn btn-main" type="button" id="readFact">🗣️ よんでもらう</button>
  </div>
</section>`;

  $('playSong').addEventListener('click', () => {
    SemiAudio.unlock();
    const line = $('songLine');
    line.classList.add('ringing');
    SemiAudio.playSong(s.id, { onDone: () => line.classList.remove('ringing') });
  });
  $('backZukan').addEventListener('click', () => {
    SemiAudio.seTap();
    renderZukan();
  });
  $('readFact').addEventListener('click', () => say(detailLine(s), 'think'));

  say(detailLine(s));
}

function detailLine(s) {
  return `${s.yomi}。なきごえは ${s.songYomi}。${s.where} に いて、${s.time} に なくよ。つちの なかでは だいたい ${s.years}ねん すごすんだ。${s.fact}`;
}

/* =========================== なきごえクイズ =========================== */

const quiz = { pool: [], i: 0, total: 8, score: 0, answer: null, locked: false, firstTry: true };

function startQuiz() {
  setTop('なきごえクイズ', true);
  quiz.pool = shuffle(SEMI.map((s) => s.id)).concat(shuffle(SEMI.map((s) => s.id))).slice(0, quiz.total);
  quiz.i = 0;
  quiz.score = 0;
  askQuestion();
}

function askQuestion() {
  const id = quiz.pool[quiz.i];
  const s = SEMI_BY_ID[id];
  quiz.answer = id;
  quiz.locked = false;
  quiz.firstTry = true;

  const others = shuffle(SEMI.filter((x) => x.id !== id)).slice(0, 3);
  const options = shuffle(others.concat([s]));

  app.innerHTML = `
<section class="quiz">
  <p class="quiz-count">だい <strong>${quiz.i + 1}</strong> もん / ${quiz.total}　　⭐ ${quiz.score}</p>
  <h2 class="quiz-q">この なきごえは どの セミ？</h2>
  <button class="btn btn-song big" type="button" id="listen">🔊 なきごえを きく</button>
  <div class="options">
    ${options
      .map(
        (o) => `
    <button class="opt" type="button" data-opt="${o.id}" style="--accent:${o.color}; --tint:${o.tint}">
      <span class="opt-art">${Art.cicada(o, { size: 84 })}</span>
      <span class="opt-name">${o.name}</span>
    </button>`
      )
      .join('')}
  </div>
  <p class="quiz-msg" id="quizMsg"></p>
</section>`;

  const listen = $('listen');
  const playIt = () => {
    SemiAudio.unlock();
    listen.classList.add('ringing');
    SemiAudio.playSong(id, { onDone: () => listen.classList.remove('ringing') });
  };
  listen.addEventListener('click', playIt);

  app.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => answerQuiz(b)));

  say('よく きいてね。どの セミの こえかな？');
  setTimeout(playIt, 900);
}

function answerQuiz(btn) {
  if (quiz.locked) return;
  const chosen = btn.dataset.opt;
  const s = SEMI_BY_ID[quiz.answer];
  const msg = $('quizMsg');

  if (chosen !== quiz.answer) {
    quiz.firstTry = false;
    SemiAudio.seWrong();
    btn.classList.add('wrong');
    btn.disabled = true;
    msg.textContent = 'ちがうよ。もういちど きいて えらんでね。';
    say(`${SEMI_BY_ID[chosen].yomi} じゃ ないんだ。もういちど きいて みよう。`, 'think');
    return;
  }

  quiz.locked = true;
  btn.classList.add('right');
  SemiAudio.seCorrect();
  if (quiz.firstTry) quiz.score++;
  msg.innerHTML = `せいかい！　<strong>${s.name}</strong>　${s.song}`;
  const isNew = markFound(s.id);
  say(`せいかい！${s.yomi}。${s.hint}よ。${isNew ? 'ずかんに ふえたよ！' : ''}`, 'wow');

  const next = document.createElement('button');
  next.className = 'btn btn-main next-q';
  next.type = 'button';
  next.textContent = quiz.i === quiz.total - 1 ? 'けっかを みる 🎉' : 'つぎの もんだい ▶';
  next.addEventListener('click', () => {
    SemiAudio.seTap();
    quiz.i++;
    if (quiz.i >= quiz.total) showQuizResult();
    else askQuestion();
  });
  app.querySelector('.quiz').appendChild(next);
}

function showQuizResult() {
  const best = Math.max(save.quizBest, quiz.score);
  const isBest = quiz.score > save.quizBest;
  save.quizBest = best;
  store();
  SemiAudio.seFanfare();

  const stars = '⭐'.repeat(quiz.score) + '☆'.repeat(quiz.total - quiz.score);

  // てんすうに あわせて ことばを かえる(0てんでも おこられない ように)
  let headline, line;
  if (quiz.score === quiz.total) {
    headline = 'ぜんもん せいかい！';
    line = 'ぜんぶ せいかい！セミはかせだね。';
  } else if (quiz.score >= quiz.total / 2) {
    headline = `${quiz.score} / ${quiz.total} せいかい！`;
    line = `${quiz.score}もん せいかい！よく きけて いたね。`;
  } else {
    headline = `${quiz.score} / ${quiz.total} せいかい`;
    line = 'なきごえは むずかしいね。ずかんで きいてから、もういちど やって みよう。';
  }

  app.innerHTML = `
<section class="result">
  <h2>${headline}</h2>
  <p class="stars">${stars}</p>
  <div class="result-art">${Art.cicada(pick(SEMI), { size: 150, face: 'wow' })}</div>
  <p class="best">いちばん いい きろく： ${best} / ${quiz.total}${isBest ? '　🎊 あたらしい きろく！' : ''}</p>
  <div class="scene-nav">
    <button class="btn btn-sub" type="button" id="againBtn">もういちど</button>
    <button class="btn btn-main" type="button" id="toHunt">${quiz.score >= quiz.total / 2 ? 'セミとりへ ▶' : '📔 ずかんで きく'}</button>
  </div>
</section>`;
  $('againBtn').addEventListener('click', () => {
    SemiAudio.seTap();
    startQuiz();
  });
  const goNext = quiz.score >= quiz.total / 2 ? 'hunt' : 'zukan';
  $('toHunt').addEventListener('click', () => {
    SemiAudio.seTap();
    go(goNext);
  });
  say(line, quiz.score >= quiz.total / 2 ? 'wow' : 'think');
}

/* ============================ セミとり たんけん ============================ */

const hunt = { spots: [], found: 0, opened: 0 };

const SPOT_POS = [
  { x: 16, y: 24 }, { x: 38, y: 14 }, { x: 62, y: 20 }, { x: 84, y: 30 },
  { x: 26, y: 48 }, { x: 52, y: 44 }, { x: 76, y: 52 }, { x: 44, y: 66 },
];

function startHunt() {
  setTop('セミとり たんけん', true);

  // まだ みつけて いない セミを ゆうせんして かくす
  const notYet = SEMI.filter((s) => !save.found[s.id]).map((s) => s.id);
  const rest = shuffle(SEMI.map((s) => s.id));
  const order = shuffle(notYet).concat(rest.filter((id) => notYet.indexOf(id) === -1));
  const hidden = order.slice(0, 4);

  const contents = shuffle(hidden.map((id) => ({ type: 'semi', id })).concat([
    { type: 'shell' },
    { type: 'none' },
    { type: 'none' },
    { type: 'shell' },
  ]));

  hunt.spots = contents.map((c, i) => ({ ...c, pos: SPOT_POS[i], open: false }));
  hunt.found = 0;
  hunt.opened = 0;

  app.innerHTML = `
<section class="hunt">
  <p class="hunt-count" id="huntCount">はっぱを タップして セミを さがそう（みつけた： 0 ひき）</p>
  <div class="forest" id="forest">
    <svg class="forest-bg" viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true">
      ${Art.tree(58, 22, 176)}
      ${Art.tree(150, 26, 186)}
      ${Art.tree(242, 20, 170)}
      <rect x="0" y="168" width="300" height="32" fill="#84a85a"/>
      <path d="M0 172 q30 -8 60 0 q30 8 60 0 q30 -8 60 0 q30 8 60 0 q30 -8 60 0" fill="none" stroke="#6f9147" stroke-width="4"/>
    </svg>
    ${hunt.spots
      .map(
        (s, i) => `
    <button class="leaf" type="button" data-spot="${i}" style="left:${s.pos.x}%; top:${s.pos.y}%" aria-label="はっぱ ${i + 1}">
      <span class="leaf-face">🍃</span>
      <span class="leaf-inside"></span>
    </button>`
      )
      .join('')}
  </div>
  <div class="scene-nav">
    <button class="btn btn-sub" type="button" id="huntAgain">べつの ばしょへ 🔁</button>
    <button class="btn btn-main" type="button" id="huntZukan">📔 ずかんを みる</button>
  </div>
</section>`;

  app.querySelectorAll('[data-spot]').forEach((b) => b.addEventListener('click', () => openSpot(Number(b.dataset.spot), b)));
  $('huntAgain').addEventListener('click', () => {
    SemiAudio.seTap();
    startHunt();
  });
  $('huntZukan').addEventListener('click', () => {
    SemiAudio.seTap();
    go('zukan');
  });

  SemiAudio.startAmbience();
  say('もりに きたよ。はっぱの かげに セミが かくれて いるかも。タップして さがして みよう！');
}

function openSpot(i, btn) {
  const spot = hunt.spots[i];
  if (spot.open) return;
  spot.open = true;
  hunt.opened++;
  btn.classList.add('open');
  SemiAudio.unlock();

  if (spot.type === 'semi') {
    const s = SEMI_BY_ID[spot.id];
    btn.querySelector('.leaf-inside').innerHTML = Art.cicada(s, { size: 78 }) + `<b class="find-name">${s.name}</b>`;
    btn.classList.add('has-semi');
    btn.style.setProperty('--accent', s.color);
    hunt.found++;
    const isNew = markFound(s.id);
    SemiAudio.seCorrect();
    setTimeout(() => SemiAudio.playSong(s.id, { volume: 0.9 }), 250);
    $('huntCount').innerHTML = `みつけた： <strong>${hunt.found}</strong> ひき　（ずかん ${foundCount()} / ${SEMI.length}）`;
    say(`${s.yomi}が いた！${s.songYomi} って なくよ。${isNew ? 'ずかんに ふえたね！' : ''}`, 'wow');
  } else if (spot.type === 'shell') {
    btn.querySelector('.leaf-inside').innerHTML = Art.shell({ size: 62, split: true }) + '<b class="find-name">ぬけがら</b>';
    btn.classList.add('has-shell');
    SemiAudio.seTap();
    say('ぬけがらだ！ここで だれかが うかを したんだね。');
  } else {
    btn.querySelector('.leaf-inside').innerHTML = '<span class="empty">🍂</span>';
    SemiAudio.seTap();
    say('ここには いなかったね。べつの はっぱを さがして みよう。', 'think');
  }

  if (hunt.opened === hunt.spots.length) {
    setTimeout(() => {
      SemiAudio.seFanfare();
      say(`ぜんぶ めくったよ。セミは ${hunt.found}ひき みつかったね。ずかんは ${foundCount()}しゅるいに なったよ。`, 'wow');
    }, 1400);
  }
}

/* ============================== はじめる ============================== */

function init() {
  load();
  applySound();

  $('backBtn').addEventListener('click', () => {
    SemiAudio.seTap();
    go('title');
  });

  const panel = $('soundPanel');
  $('soundBtn').addEventListener('click', () => {
    SemiAudio.unlock();
    panel.hidden = !panel.hidden;
  });
  $('sheetClose').addEventListener('click', () => {
    panel.hidden = true;
  });
  panel.addEventListener('click', (e) => {
    if (e.target === panel) panel.hidden = true;
  });

  const bind = (id, key, after) => {
    const box = $(id);
    box.checked = sound[key];
    box.addEventListener('change', () => {
      sound[key] = box.checked;
      applySound();
      if (after) after();
    });
  };
  bind('tgVoice', 'voice');
  bind('tgSong', 'song');
  bind('tgSe', 'se', () => {
    if (sound.se && screen === 'hunt') SemiAudio.startAmbience();
  });

  $('guideReplay').addEventListener('click', () => {
    if (lastLine) say(lastLine);
  });

  // さいしょの タップで おとを つかえるように する(スマホの きまり)
  document.addEventListener('pointerdown', () => SemiAudio.unlock(), { once: true });

  go('title');
}

document.addEventListener('DOMContentLoaded', init);
