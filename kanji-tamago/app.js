"use strict";

/* かんじタマゴ - うごき
 *
 *  ・タマゴをわる → ふ化の演出 → カードをもらう
 *  ・ずかん … あつめたカードを見る
 *  ・クイズ … 正かいすると「ごちそうタマゴ」がもらえる
 *  ・きろくは localStorage（読み書きは try/catch）
 */

const SAVE_KEY = 'kanji-tamago:v1';
const byId = (id) => document.getElementById(id);

let state = { got: {}, feast: 1, sound: true, seen: 0 };

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && typeof o === 'object') {
        state.got = (o.got && typeof o.got === 'object') ? o.got : {};
        state.feast = Number.isFinite(o.feast) ? o.feast : 1;
        state.sound = o.sound !== false;
        state.seen = Number.isFinite(o.seen) ? o.seen : 0;
      }
    }
  } catch (e) { /* 読めなくても はじめから あそべる */ }
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* 保存できなくても続行 */ }
}

/* いまガチャ・ずかん・クイズに 出す子。1体ずつ 手描きした子（hand:true）だけ。
 * 部品くみあわせの子は data.js の中では できているが、まだ 手描きへの
 * 描きなおしが 済んでいないので、ここでは 出さない。 */
const MONSTERS = ALL_MONSTERS.filter((m) => m.hand);

const monById = (id) => MONSTERS.find((m) => m.id === id);
const gotCount = () => MONSTERS.filter((m) => state.got[m.id]).length;

/* ============================ 音（WebAudio の合成音だけ） ============================ */

const Sound = {
  ctx: null,
  ready() {
    if (!state.sound) return null;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch (e) { return null; }
  },
  tone(freq, dur, type, vol, slideTo, delay) {
    const ctx = this.ready(); if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.22, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  },
  noise(dur, vol, delay) {
    const ctx = this.ready(); if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol || 0.2;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t0);
  },
  knock(i) { this.tone(150 + i * 30, 0.12, 'triangle', 0.3); this.noise(0.08, 0.12); },
  crack() { this.noise(0.18, 0.28); this.tone(320, 0.14, 'square', 0.12); },
  burst() {
    this.tone(220, 0.5, 'sawtooth', 0.16, 1400);
    this.noise(0.5, 0.25);
  },
  fanfare(rare) {
    const base = rare ? [523, 659, 784, 1046, 1318] : [392, 523, 659, 784];
    base.forEach((f, i) => this.tone(f, 0.34, 'triangle', 0.22, null, i * 0.11));
    if (rare) this.tone(1568, 0.6, 'sine', 0.16, null, 0.6);
  },
  ok() { this.tone(880, 0.14, 'triangle', 0.24); this.tone(1320, 0.22, 'triangle', 0.2, null, 0.12); },
  ng() { this.tone(200, 0.3, 'sawtooth', 0.16, 120); },
  pop() { this.tone(660, 0.1, 'triangle', 0.18, 990); }
};

/* ============================ タマゴの絵 ============================ */

function eggSVG(feast) {
  const shell = feast
    ? '<radialGradient id="eg" cx="36%" cy="26%" r="78%"><stop offset="0" stop-color="#fff3c4"/>' +
      '<stop offset=".55" stop-color="#ffd75e"/><stop offset="1" stop-color="#e09a10"/></radialGradient>'
    : '<radialGradient id="eg" cx="36%" cy="26%" r="78%"><stop offset="0" stop-color="#ffffff"/>' +
      '<stop offset=".55" stop-color="#fdf0d8"/><stop offset="1" stop-color="#e3c69a"/></radialGradient>';
  const ink = feast ? '#8a5c07' : '#8a6a42';
  const dots = feast
    ? '<g fill="#fff5cf" opacity=".9"><path d="M74 78 l6 12 13 2 -9 9 2 13 -12 -6 -12 6 2 -13 -9 -9 13 -2 Z"/>' +
      '<path d="M124 118 l4 9 10 1 -7 7 2 10 -9 -5 -9 5 2 -10 -7 -7 10 -1 Z"/></g>'
    : '<g fill="#f0b95e" opacity=".85"><ellipse cx="72" cy="92" rx="13" ry="10"/>' +
      '<ellipse cx="118" cy="76" rx="9" ry="7"/><ellipse cx="126" cy="120" rx="14" ry="11"/>' +
      '<ellipse cx="78" cy="140" rx="10" ry="8"/></g>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" aria-hidden="true">' +
    '<defs>' + shell + '</defs>' +
    '<ellipse cx="100" cy="206" rx="52" ry="10" fill="#000" opacity=".18"/>' +
    '<path d="M100 16 C 140 16 168 76 168 128 C 168 172 138 202 100 202 C 62 202 32 172 32 128' +
    ' C 32 76 60 16 100 16 Z" fill="url(#eg)" stroke="' + ink + '" stroke-width="5"/>' +
    dots +
    '<path d="M62 62 C 54 82 50 100 50 116" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".55"/>' +
    /* ヒビ（3だんかいで見せる） */
    '<g class="crack c1" fill="none" stroke="' + ink + '" stroke-width="4" stroke-linecap="round">' +
    '<path d="M100 60 l-12 20 14 10 -10 18"/></g>' +
    '<g class="crack c2" fill="none" stroke="' + ink + '" stroke-width="4" stroke-linecap="round">' +
    '<path d="M92 108 l-22 8 -14 -8"/><path d="M102 118 l18 -6 16 10"/></g>' +
    '<g class="crack c3" fill="none" stroke="' + ink + '" stroke-width="4.5" stroke-linecap="round">' +
    '<path d="M56 128 l16 12 -8 16 18 10"/><path d="M144 124 l-16 14 10 14 -16 12"/></g>' +
    '</svg>';
}

function raysSVG(rare) {
  let g = '';
  for (let i = 0; i < 18; i++) {
    const c = rare ? 'hsl(' + (i * 20) + ',95%,68%)' : (i % 2 ? '#ffe9a0' : '#ffc85e');
    g += '<path d="M0 0 L 700 -74 L 700 74 Z" fill="' + c + '" opacity="' + (i % 2 ? .5 : .8) +
         '" transform="rotate(' + (i * 20) + ')"/>';
  }
  return '<svg viewBox="-700 -700 1400 1400" aria-hidden="true" style="width:100%;height:100%">' + g + '</svg>';
}

/* ============================ どの子が生まれるか ============================ */

function pick(feast) {
  const news = MONSTERS.filter((m) => !state.got[m.id]);
  // まだ持っていない子を 出やすくする（ごちそうタマゴは もっと出やすい）
  if (news.length && Math.random() < (feast ? 0.85 : 0.6)) {
    const w = news.map((m) => (feast ? m.rare * m.rare : 1 / m.rare));
    return weighted(news, w);
  }
  const w = MONSTERS.map((m) => (feast ? m.rare * m.rare : 6 / m.rare));
  return weighted(MONSTERS, w);
}

function weighted(list, weights) {
  let total = 0;
  for (const x of weights) total += x;
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

/* ============================ ふ化の えんしゅつ ============================ */

let hatchTimers = [];
function clearTimers() { hatchTimers.forEach(clearTimeout); hatchTimers = []; }
function later(fn, ms) { hatchTimers.push(setTimeout(fn, ms)); }

function startHatch(feast) {
  if (feast) {
    if (state.feast <= 0) return;
    state.feast--;
  }
  const m = pick(feast);
  const rare = feast || m.rare >= 3;
  const el = byId('hatch');
  el.className = 'hatch on';
  byId('hatchEgg').innerHTML = eggSVG(feast);
  byId('hatchRays').innerHTML = raysSVG(rare);
  byId('hatchMon').innerHTML = '';
  byId('hatchName').textContent = '';
  byId('hatchRare').textContent = '';
  byId('hatchLead').textContent = feast ? 'ごちそうタマゴが うごいた！' : 'タマゴが うごいた！';
  byId('confetti').innerHTML = '';

  Sound.ready();
  el.classList.add('shake');
  [0, 400, 800].forEach((t, i) => later(() => Sound.knock(i), t + 60));
  later(() => { el.classList.add('crack1'); Sound.crack(); }, 420);
  later(() => { el.classList.add('crack2'); Sound.crack(); }, 820);
  later(() => { el.classList.add('crack3'); Sound.crack(); }, 1060);

  later(() => {
    el.classList.remove('shake');
    el.classList.add('burst');
    makeConfetti(rare);
    Sound.burst();
  }, 1180);

  later(() => {
    byId('hatchMon').innerHTML = monsterSVG(m.id);
    byId('hatchName').textContent = m.name;
    byId('hatchRare').textContent = rare ? '★★★ レア だ！ ★★★' : '★'.repeat(m.rare);
    byId('hatchLead').textContent = state.got[m.id] ? 'また あえたね！' : 'あたらしい なかま！';
    el.classList.add('show');
    Sound.fanfare(rare);
    state.got[m.id] = (state.got[m.id] || 0) + 1;
    state.seen++;
    save();
    byId('hatchTap').onclick = () => {
      el.className = 'hatch';
      clearTimers();
      showCard(m);
      renderHome(); renderZukan();
    };
  }, 1620);
}

function makeConfetti(rare) {
  const box = byId('confetti');
  const colors = rare
    ? ['#ff6b8b', '#ffd75e', '#6fe3a0', '#6bc5ff', '#c78bff', '#fff']
    : ['#ffb347', '#ffd75e', '#8fd6ff', '#ffe9a0', '#fff'];
  let html = '';
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 120 + Math.random() * 260;
    html += '<i class="conf" style="--dx:' + Math.round(Math.cos(a) * d) + 'px;--dy:' +
            Math.round(Math.sin(a) * d) + 'px;--rot:' + Math.round(Math.random() * 720 - 360) +
            'deg;background:' + colors[i % colors.length] + ';animation-delay:' +
            (Math.random() * 0.2).toFixed(2) + 's"></i>';
  }
  box.innerHTML = html;
}

/* ============================ カード ============================ */

function kanjiSVG(kanji, color) {
  return '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="' + KANJI_PATH[kanji] +
         '" fill="' + (color || '#2f2519') + '"/></svg>';
}

function cardHTML(m) {
  const n = state.got[m.id] || 0;
  const words = m.words.map((w) =>
    '<li><ruby>' + w.w + '<rt>' + w.y + '</rt></ruby></li>').join('');
  const eki = m.stations.map((s) =>
    '<li><span class="en">' + s[0] + '</span><span class="ey">' + s[1] + '</span>' +
    '<span class="el">' + s[2] + '</span></li>').join('');
  return '<div class="card" style="--kc:' + m.color + ';--kt:' + m.tint + '">' +
    '<div class="card-top">' + monsterSVG(m.id) +
      '<div><div class="card-name">' + m.name + '</div>' +
      '<div class="card-tags">' +
        '<span class="tag">' + m.grade + '年生の かんじ</span>' +
        '<span class="tag">' + m.kaku + 'かく</span>' +
        '<span class="tag">' + '★'.repeat(m.rare) + '</span>' +
        (n > 1 ? '<span class="tag">なかよし ×' + n + '</span>' : '') +
      '</div></div>' +
    '</div>' +
    '<div class="card-body">' +
      '<div class="kanji-row">' +
        '<div class="kanji-box">' + kanjiSVG(m.kanji, m.color) + '</div>' +
        '<div class="yomi">おんよみ <b>' + m.on + '</b><br>くんよみ <b>' + m.kun + '</b><br>' +
        '<span style="font-size:13px;color:var(--ink-soft)">小学' + m.grade + '年生で ならう字</span></div>' +
      '</div>' +
      '<p class="about">' + m.about + '</p>' +
      '<h3>◆ こんな ふうに つかうよ</h3>' +
      '<ul class="words">' + words + '</ul>' +
      '<h3>◆ この かんじが つかわれている えき</h3>' +
      '<ul class="eki">' + eki + '</ul>' +
      '<h3>◆ おはなし してみよう</h3>' +
      '<div class="talk">' +
        '<p class="talk-bubble" id="talkBubble">…</p>' +
        '<div class="talk-chips">' +
          '<button type="button" class="chip" data-topic="self">🙋 じこしょうかい</button>' +
          '<button type="button" class="chip" data-topic="words">📖 ことば</button>' +
          '<button type="button" class="chip" data-topic="eki">🚉 えき</button>' +
          '<button type="button" class="chip" data-topic="again">🔁 もういっかい</button>' +
        '</div>' +
        (Speech.micSupported()
          ? '<button type="button" class="mic-btn" id="talkMic">🎤 はなしかけてみる</button>' +
            '<p class="talk-status" id="talkStatus"></p>'
          : '<p class="talk-note">ボタンを おすと、お話が きけるよ</p>') +
      '</div>' +
    '</div></div>';
}

/* ============================ おはなし（読みあげ・ききとり） ============================ */

const TALK_FILLER = ['うんうん、そうだね！', 'おもしろいね！', 'ふふっ、たのしいね。', 'もっと おしえて？'];
let fillerAt = 0;

/* キャラごとに 少しちがう こえに する（名まえの ハッシュから きめる） */
function voiceFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return { pitch: 0.9 + (h % 60) / 100, rate: 0.9 + ((h >> 4) % 18) / 100 };
}

function topicReply(m, topic) {
  if (topic === 'words') {
    const list = m.words.slice(0, 2).map((w) => w.w + '（' + w.y + '）って つかうよ。');
    return list.length ? list.join(' ') : 'ことばは まだ おもいつかないや。';
  }
  if (topic === 'eki') {
    const list = m.stations.slice(0, 2).map((s) =>
      s[0] + '（' + s[1] + '）の駅にも、この字が つかわれているよ。路線は ' + s[2] + '。');
    return list.length ? list.join(' ') : 'この字が つかわれている駅は、まだ 見つかって いないんだ。';
  }
  if (topic === 'filler') {
    const t = TALK_FILLER[fillerAt % TALK_FILLER.length];
    fillerAt++;
    return t;
  }
  /* self（デフォルト） */
  return 'やあ、' + m.name + ' だよ！ ' + m.about;
}

/* 話しかけた ことばから、話題を あてる（見つからなければ filler） */
function matchTopic(text) {
  if (/名前|だれ|きみ|あなた|じこ/.test(text)) return 'self';
  if (/ことば|つかいかた|いみ|つかう/.test(text)) return 'words';
  if (/えき|どこ|ばしょ|路線|でんしゃ|駅/.test(text)) return 'eki';
  if (/もう(いち|1)?ど|もういっかい|もう一回/.test(text)) return 'again';
  return 'filler';
}

function setupTalk(m) {
  const bubble = byId('talkBubble');
  const mic = byId('talkMic');
  const status = byId('talkStatus');
  const voice = voiceFor(m.id);
  let lastTopic = 'self';

  function say(topic) {
    const useTopic = topic === 'again' ? lastTopic : topic;
    const text = topicReply(m, useTopic);
    bubble.textContent = text;
    if (useTopic !== 'filler') lastTopic = useTopic;
    if (state.sound) Speech.speak(text, voice);
  }

  byId('cardBox').querySelectorAll('.chip').forEach((b) => {
    b.onclick = () => say(b.dataset.topic);
  });

  if (mic) {
    mic.onclick = () => {
      if (Speech.isListening()) { Speech.stopListen(); return; }
      status.textContent = 'きいているよ…';
      mic.classList.add('on');
      Speech.startListen({
        onResult: (text) => {
          status.textContent = '「' + text + '」って きこえたよ';
          say(matchTopic(text));
        },
        onEnd: () => { mic.classList.remove('on'); },
        onError: () => { mic.classList.remove('on'); status.textContent = 'マイクが つかえないみたい'; },
      });
    };
  }

  say('self');
}

function showCard(m) {
  byId('cardBox').innerHTML = cardHTML(m);
  byId('cardView').classList.add('on');
  Sound.pop();
  setupTalk(m);
}

byId('cardClose').onclick = () => {
  byId('cardView').classList.remove('on');
  Speech.stopSpeak();
  Speech.stopListen();
};

/* ============================ 画面 ============================ */

function renderHome() {
  byId('eggArt').innerHTML = eggSVG(false);
  byId('feastN').textContent = state.feast;
  const b = byId('btnFeast');
  b.disabled = state.feast <= 0;
  byId('gotN').textContent = gotCount();
  byId('seenN').textContent = state.seen;
  byId('homeMsg').textContent = gotCount() >= MONSTERS.length
    ? MONSTERS.length + 'ひき ぜんぶ そろった！ すごい！'
    : 'なかから なにか きこえる…';
}

/* まだ 1体も 手描きが 済んでいない なかまは、タブごと 出さない */
const zgroups = GROUPS.filter((g) => MONSTERS.some((m) => m.group === g.id));
let zgroup = zgroups[0].id;

function renderZukan() {
  byId('ztabs').innerHTML = zgroups.map((g) => {
    const list = MONSTERS.filter((m) => m.group === g.id);
    const got = list.filter((m) => state.got[m.id]).length;
    return '<button class="ztab' + (g.id === zgroup ? ' on' : '') + '" type="button" data-g="' + g.id + '">' +
      g.name + '<span>' + got + '/' + list.length + '</span></button>';
  }).join('');
  byId('ztabs').querySelectorAll('.ztab').forEach((b) => {
    b.onclick = () => { zgroup = b.dataset.g; renderZukan(); byId('ztabs').scrollLeft = b.offsetLeft - 20; };
  });

  byId('zukan').innerHTML = MONSTERS.filter((m) => m.group === zgroup).map((m) => {
    const n = state.got[m.id] || 0;
    if (!n) {
      return '<div class="slot locked">' + monsterSVG(m.id) +
             '<span class="nm"></span><span class="sub">まだ ひみつ</span></div>';
    }
    return '<button class="slot" type="button" data-id="' + m.id + '" style="border-color:' + m.color + '">' +
      monsterSVG(m.id) + '<span class="nm">' + m.name + '</span>' +
      '<span class="sub">' + m.kanji + '（' + m.grade + '年生）</span>' +
      (n > 1 ? '<span class="badge-n">×' + n + '</span>' : '') + '</button>';
  }).join('');
  byId('zukanCount').textContent = gotCount() + ' / ' + MONSTERS.length;
  byId('zukan').querySelectorAll('.slot[data-id]').forEach((b) => {
    b.onclick = () => showCard(monById(b.dataset.id));
  });
}

/* ============================ クイズ ============================ */

let quizNow = null;
let lastQuiz = '';

/* ことばの よみクイズを その場で つくる。まちがいの 選たくしは
   ほかの子の ことばの よみから、長さの にたものを えらぶ。 */
function makeWordQuiz(m) {
  const w = m.words[Math.floor(Math.random() * m.words.length)];
  const pool = [];
  MONSTERS.forEach((o) => {
    if (o.id === m.id) return;
    o.words.forEach((x) => {
      if (x.y !== w.y && Math.abs(x.y.length - w.y.length) <= 1) pool.push(x.y);
    });
  });
  const wrong = [];
  let guard = 0;
  while (wrong.length < 2 && guard++ < 60) {
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (c && wrong.indexOf(c) < 0) wrong.push(c);
  }
  while (wrong.length < 2) wrong.push(w.y + 'っ');
  const choices = wrong.concat([w.y]);
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = choices[i]; choices[i] = choices[j]; choices[j] = t;
  }
  return ['「' + w.w + '」は なんと よむ？', choices, choices.indexOf(w.y)];
}

function newQuiz() {
  const owned = MONSTERS.filter((m) => state.got[m.id]);
  const use = owned.length ? owned : MONSTERS;
  let pickQ = null;
  let guard = 0;
  do {
    const m = use[Math.floor(Math.random() * use.length)];
    // 駅の よみクイズが ある子は ときどき そちらを 出す
    const q = (m.quiz && m.quiz.length && Math.random() < 0.5)
      ? m.quiz[Math.floor(Math.random() * m.quiz.length)]
      : makeWordQuiz(m);
    pickQ = { m: m, q: q };
  } while (pickQ.q[0] === lastQuiz && guard++ < 8);
  lastQuiz = pickQ.q[0];
  quizNow = pickQ;

  byId('quizQ').textContent = pickQ.q[0];
  byId('quizRes').textContent = '';
  byId('quizNext').style.display = 'none';
  byId('choices').innerHTML = pickQ.q[1].map((c, i) =>
    '<button class="choice" type="button" data-i="' + i + '">' + c + '</button>').join('');
  byId('choices').querySelectorAll('.choice').forEach((b) => {
    b.onclick = () => answer(Number(b.dataset.i), b);
  });
}

function answer(i, btn) {
  const correct = quizNow.q[2];
  const buttons = byId('choices').querySelectorAll('.choice');
  buttons.forEach((b) => { b.disabled = true; });
  if (i === correct) {
    btn.classList.add('ok');
    state.feast++;
    save();
    byId('quizRes').textContent = 'せいかい！ ごちそうタマゴを 1こ もらった！';
    Sound.ok();
  } else {
    btn.classList.add('ng');
    buttons[correct].classList.add('ok');
    byId('quizRes').textContent = 'ざんねん…  こたえは「' + quizNow.q[1][correct] + '」';
    Sound.ng();
  }
  renderHome();
  byId('quizNext').style.display = 'block';
}

/* ============================ 画面きりかえ ============================ */

function go(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.dataset.screen === name));
  document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === name));
  if (name === 'zukan') renderZukan();
  if (name === 'quiz' && !quizNow) newQuiz();
  window.scrollTo(0, 0);
}

document.querySelectorAll('nav button').forEach((b) => { b.onclick = () => go(b.dataset.go); });
byId('btnEgg').onclick = () => startHatch(false);
byId('btnFeast').onclick = () => startHatch(true);
byId('quizNext').onclick = newQuiz;

byId('btnSound').onclick = function () {
  state.sound = !state.sound;
  this.textContent = state.sound ? '🔊' : '🔇';
  this.setAttribute('aria-label', state.sound ? '音を けす' : '音を だす');
  Speech.setVoiceEnabled(state.sound);
  save();
  if (state.sound) Sound.pop();
};

/* ============================ はじまり ============================ */

load();
Speech.setVoiceEnabled(state.sound);
byId('btnSound').textContent = state.sound ? '🔊' : '🔇';
renderHome();
renderZukan();
go('egg');
