'use strict';

/*
 * みならい しゃしょう ポポ ── ほんたい
 *
 * 「つづけたく なる」ために、つぎの 3つを かさねている:
 *   1. でし(ポポ)      … じぶんが おしえた ぶんだけ ポポが かしこく なり、
 *                        るすの あいだに うんこうに 出て、おみやげと しつもんを もって かえる。
 *                        → もどってくる りゆうが むこうから やってくる。
 *   2. モヤモヤずかん   … まちがいは しっぱいでは なく コレクション。
 *                        ふくしゅうの きげんを 「しゅうらい カレンダー」として 見せる。
 *   3. きょうの いちばん でんしゃ … 日づけで きまる 5もん。だれが やっても おなじ もんだい。
 *
 * わざと 入れていない もの:
 *   - れんぞく日数(ストリーク) … 1日 とぎれた だけで やめて しまう ので おかない。
 *     かわりに 「おしえた かず」「なかよしの かず」など へらない 数だけ 出す。
 *   - ばつ(ペナルティ) … あそばなくても ポポは 元気。まっている ぶん おみやげが たまる。
 */

/* ------------------------------ どうぐ ------------------------------ */

const $ = (id) => document.getElementById(id);
const app = $('app');

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function dateKey(t) {
  const d = new Date(t);
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/* あと どれくらい かを 子どもに わかる ことばで */
function remainText(ms) {
  if (ms <= 0) return 'もうすぐ つくよ';
  if (ms < MIN) return 'あと すこし';
  const h = Math.floor(ms / HOUR);
  const m = Math.round((ms % HOUR) / MIN);
  if (h > 0) return 'あと ' + h + 'じかん ' + (m > 0 ? m + 'ふん' : '');
  return 'あと ' + Math.max(1, m) + 'ふん';
}

function midnight(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/* 「あと 何日」は こよみの 日で かぞえる(24じかん たったか では ない) */
function daysText(due, now) {
  if (due <= now) return 'きょう';
  const d = Math.round((midnight(due) - midnight(now)) / DAY);
  if (d <= 0) return 'もうすぐ';
  if (d === 1) return 'あした';
  return d + 'にち ご';
}

/* ---------------------------- セーブデータ ---------------------------- */

const SAVE_KEY = 'minarai-shasho-v1';

const save = {
  v: 1,
  srs: {},                     /* もんだいごとの ふくしゅう きろく(engine.js が さわる) */
  popo: { exp: 0, taught: 0 }, /* exp = せいかいの かず */
  run: null,                   /* うんこうちゅう { routeId, startAt, endAt } */
  report: null,                /* まだ 見ていない かえりの ほうこく */
  bring: [],                   /* ポポが もちかえった もんだい id */
  stamps: {},                  /* { routeId: { n, gold } } */
  daily: { date: '', best: 0, done: false, score: 0 },
  bestDaily: 0,
  settings: { voice: true, se: true },
};

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return;
    if (d.srs) save.srs = d.srs;
    if (d.popo) save.popo = Object.assign(save.popo, d.popo);
    save.run = d.run || null;
    save.report = d.report || null;
    save.bring = Array.isArray(d.bring) ? d.bring : [];
    save.stamps = d.stamps || {};
    if (d.daily) save.daily = Object.assign(save.daily, d.daily);
    save.bestDaily = d.bestDaily || 0;
    if (d.settings) save.settings = Object.assign(save.settings, d.settings);
  } catch (e) {
    /* こわれていたら はじめから。あそべなく なるより よい */
  }
}

function store() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ほぞんできなくても あそべる */ }
}

/* ------------------------------ ポポ ------------------------------ */

const EXP_PER_LV = 5;
const lv = () => 1 + Math.floor(save.popo.exp / EXP_PER_LV);
const lvProg = () => save.popo.exp % EXP_PER_LV;

function routeById(id) { return PACK.routes.find((r) => r.id === id) || null; }

function stampRec(routeId) {
  const r = save.stamps[routeId] || (save.stamps[routeId] = { n: 0, golds: {} });
  if (!r.golds) r.golds = {};
  return r;
}

/* --------------------------- がめんの きりかえ --------------------------- */

let screen = 'home';
let session = null;   /* もんだいを といている あいだの じょうたい */

function go(name, arg) {
  screen = name;
  Snd.shutUp();
  window.scrollTo(0, 0);
  render(arg);
}

function render(arg) {
  $('backBtn').hidden = (screen === 'home');
  if (screen === 'home') homeScreen();
  else if (screen === 'quiz') quizScreen();
  else if (screen === 'summary') summaryScreen(arg);
  else if (screen === 'moya') moyaScreen();
  else if (screen === 'runsel') runSelScreen();
  else if (screen === 'report') reportScreen();
  else if (screen === 'stamps') stampScreen();
}

/* -------------------------------- ホーム -------------------------------- */

function homeBubble(now) {
  if (save.report) return { mood: 'wow', text: 'ただいま！ おみやげが あるよ。' };
  if (save.run) {
    const r = routeById(save.run.routeId);
    if (now >= save.run.endAt) return { mood: 'wow', text: 'そろそろ とうちゃく するよ！' };
    return { mood: 'run', text: 'いま ' + (r ? r.name : 'うんこう') + 'ちゅう。いってきます！' };
  }
  const awake = Engine.awakeCount(now);
  if (awake > 0) return { mood: 'think', text: 'モヤモヤが ' + awake + 'たい でてきた。たおしに いこう！' };
  if (save.daily.date !== dateKey(now)) return { mood: 'normal', text: 'きょうの いちばん でんしゃが きたよ。' };
  if (save.popo.taught === 0) return { mood: 'normal', text: 'ぼく みならいの ポポ。いろいろ おしえて！' };
  return { mood: 'happy', text: 'なにか おしえて！ ぼく おぼえるよ。' };
}

function homeScreen(silent) {
  const now = Date.now();
  const b = homeBubble(now);
  const st = Engine.stats();
  const awake = Engine.awakeCount(now);
  const today = dateKey(now);
  const dailyDone = save.daily.date === today && save.daily.done;

  let runHtml = '';
  if (save.report) {
    const r = routeById(save.report.routeId);
    runHtml =
      '<div class="card" style="border-color:#f3e0b0;background:#fffdf5">' +
        '<h2>🎁 ポポが かえってきた</h2>' +
        '<p>' + esc(r ? r.name : 'うんこう') + ' から もどったよ。</p>' +
        '<button class="btn btn-go" id="toReport">ほうこくを きく</button>' +
      '</div>';
  } else if (save.run) {
    const r = routeById(save.run.routeId);
    const total = Math.max(1, save.run.endAt - save.run.startAt);
    const pct = Math.min(100, Math.round(((now - save.run.startAt) / total) * 100));
    const done = now >= save.run.endAt;
    runHtml =
      '<div class="card">' +
        '<h2>' + (r ? r.emoji : '🚋') + ' ' + esc(r ? r.name : 'うんこうちゅう') + '</h2>' +
        '<div class="run-live">' +
          Art.train(r ? r.color : null) +
          '<div class="txt">' +
            '<div style="font-size:15px">' + (done ? 'とうちゃく！' : remainText(save.run.endAt - now)) + '</div>' +
            '<div class="prog"><i style="width:' + pct + '%"></i></div>' +
          '</div>' +
        '</div>' +
        (done ? '<button class="btn btn-go" id="finishRun" style="margin-top:14px">おかえり！</button>' : '') +
      '</div>';
  }

  app.innerHTML =
    '<div class="card">' +
      '<div class="popo-area">' + Art.popo(b.mood, 118) + '<div class="bubble" id="homeBubble">' + esc(b.text) + '</div></div>' +
      '<div class="status-strip">' +
        '<div class="stat"><b>Lv.' + lv() + '</b><span>ポポ</span></div>' +
        '<div class="stat"><b>' + save.popo.taught + '</b><span>おしえた かず</span></div>' +
        '<div class="stat"><b>' + st.friend + '</b><span>なかよし</span></div>' +
      '</div>' +
      '<div class="lvbar"><i style="width:' + Math.round((lvProg() / EXP_PER_LV) * 100) + '%"></i></div>' +
    '</div>' +

    runHtml +

    '<div class="menu-list">' +
      tile('teach', '🎓', '#e7f2fb', 'ポポに おしえる', 'もんだいを といて ポポを かしこく する', '') +
      tile('daily', '🚉', '#fdf0dd', 'きょうの いちばん でんしゃ',
           dailyDone ? 'きょうの きろく ' + save.daily.score + '／5もん' : 'きょうだけの 5もん。みんな おなじ もんだい',
           dailyDone ? '<span class="badge done">✓</span>' : '<span class="badge">NEW</span>') +
      tile('moya', '👻', '#fdeaf2', 'モヤモヤずかん',
           'まちがいから うまれた なかまたち（' + (st.moya + st.friend) + 'たい）',
           awake > 0 ? '<span class="badge">' + awake + '</span>' : '') +
      tile('run', '🚋', '#eaf4ea', 'ポポを おくりだす',
           save.run ? 'いま うんこうちゅう' : 'るすの あいだに はしって おみやげを もってくる', '') +
      tile('stamps', '📔', '#f1ecfb', 'おみやげスタンプ', stampTotal() + 'こ あつめた', '') +
    '</div>';

  const jump = { teach: startTeach, daily: startDaily, moya: () => go('moya'), run: () => go('runsel'), stamps: () => go('stamps') };
  Object.keys(jump).forEach((k) => {
    const el = $('t-' + k);
    if (el) el.addEventListener('click', () => { Snd.unlock(); Snd.tap(); jump[k](); });
  });
  if ($('toReport')) $('toReport').addEventListener('click', () => { Snd.unlock(); go('report'); });
  if ($('finishRun')) $('finishRun').addEventListener('click', () => { Snd.unlock(); finishRun(); });

  if (!silent) Snd.speak(b.text);
  scheduleTick();
}

function tile(key, emoji, tint, name, desc, badge) {
  return '<button class="tile" id="t-' + key + '" type="button">' +
    '<span class="ic" style="--tint:' + tint + '">' + emoji + '</span>' +
    '<span class="tx"><span class="nm">' + esc(name) + '</span><span class="ds">' + esc(desc) + '</span></span>' +
    badge + '</button>';
}

function stampTotal() {
  return Object.keys(save.stamps).reduce((s, k) => s + (save.stamps[k].n || 0), 0);
}

/* うんこうちゅうは 1ふんごとに ひょうじを こうしんする */
let tickTimer = null;
function scheduleTick() {
  if (tickTimer) clearTimeout(tickTimer);
  if (screen !== 'home' || !save.run || save.report) return;
  tickTimer = setTimeout(() => { if (screen === 'home') homeScreen(true); }, 20 * 1000);
}

/* ------------------------------ もんだい ------------------------------ */

const SESSION_N = 6;
const DAILY_N = 5;

function startTeach() {
  const now = Date.now();
  const cards = Engine.pickSession(SESSION_N, now, save.bring);
  save.bring = [];
  store();
  session = { kind: 'teach', cards: cards, i: 0, marks: [], ok: 0, born: [], tamed: [], answered: null };
  go('quiz');
}

function startDaily() {
  const now = Date.now();
  const key = dateKey(now);
  const cards = Engine.dailySet(key, DAILY_N);
  session = { kind: 'daily', cards: cards, i: 0, marks: [], ok: 0, born: [], tamed: [], answered: null, key: key };
  go('quiz');
}

/* ずかんから 1たいだけ たおしに いく */
function startHunt(itemId) {
  const it = Engine.item(itemId);
  if (!it) return;
  session = {
    kind: 'hunt', cards: [Engine.makeCard(it, 'solve', Math.random, 'moya')],
    i: 0, marks: [], ok: 0, born: [], tamed: [], answered: null,
  };
  go('quiz');
}

const FROM_LABEL = {
  popo: ['ポポの しつもん', 'popo'],
  moya: ['モヤモヤ たいじ', 'moya'],
  review: ['ふくしゅう', 'review'],
  new: ['あたらしい もんだい', 'new'],
  daily: ['きょうの もんだい', 'popo'],
};

function quizScreen() {
  const c = session.cards[session.i];
  const lab = FROM_LABEL[c.from] || FROM_LABEL.new;

  let dots = '<div class="dots">';
  for (let i = 0; i < session.cards.length; i++) {
    const m = session.marks[i];
    dots += '<i class="' + (i === session.i ? 'now' : (m === true ? 'ok' : (m === false ? 'ng' : ''))) + '"></i>';
  }
  dots += '</div>';

  let head, speakText;
  if (c.mode === 'judge') {
    head =
      '<p style="margin-bottom:6px">ポポが こたえたよ。あってる かな？</p>' +
      '<div class="qtext">' + esc(c.q) + '</div>' +
      '<div class="judge-said">' + Art.popo('think', 92) +
        '<div class="bubble">「' + esc(c.said) + '」だと おもう！</div></div>';
    speakText = c.q + '。ポポは、' + c.said + '、だと おもう。あってるかな？';
  } else {
    head = '<div class="qtext">' + esc(c.q) + '</div>';
    speakText = c.q;
  }

  app.innerHTML =
    dots +
    '<div class="card">' +
      '<span class="from-tag ' + lab[1] + '">' + lab[0] + '</span>' +
      head +
      '<div class="opts">' +
        c.opts.map((o, i) => '<button class="btn btn-sub" data-i="' + i + '" type="button">' + esc(o.t) + '</button>').join('') +
      '</div>' +
      '<button class="btn btn-sub" id="readAgain" style="margin-top:16px;min-height:46px;font-size:15px">🔁 もういちど よんで</button>' +
    '</div>';

  app.querySelectorAll('.opts .btn').forEach((el) => {
    el.addEventListener('click', () => answer(c.opts[+el.dataset.i].ok));
  });
  $('readAgain').addEventListener('click', () => Snd.speak(speakText));
  Snd.speak(speakText);
}

function answer(correct) {
  Snd.unlock();
  const c = session.cards[session.i];
  const now = Date.now();
  const r = Engine.record(c.id, correct, now);

  session.marks[session.i] = correct;
  if (correct) {
    session.ok++;
    save.popo.exp++;
    if (r.tamed) session.tamed.push(c.id);
  } else if (r.born) {
    session.born.push(c.id);
  }
  save.popo.taught++;
  store();

  if (correct) { r.tamed ? Snd.tamed() : Snd.ok(); } else { Snd.ng(); }
  showResult(c, correct, r);
}

function showResult(c, correct, r) {
  const it = Engine.item(c.id);
  const tag = it ? it.tags[0] : '';

  let extra = '';
  let voice;
  if (correct) {
    voice = 'せいかい！ ' + (c.fact || '');
    if (r.tamed) {
      extra =
        '<div class="moya-pop friend">' + Art.moya(c.id, tag, 'friend', 74) +
        '<p>モヤモヤが <b>なかよし</b>に なった！<br>もう こわくないね。</p></div>';
      voice = 'せいかい！ モヤモヤが なかよしに なったよ！ ' + (c.fact || '');
    }
  } else {
    voice = 'ざんねん。こたえは、' + c.answer + '。' + c.hint;
    if (r.born) {
      extra =
        '<div class="moya-pop">' + Art.moya(c.id, tag, 'awake', 74) +
        '<p>モヤモヤが うまれた！<br>ずかんに すんで、また でてくるよ。</p></div>';
    }
  }

  const judgeNote = (c.mode === 'judge')
    ? '<p class="hint">ポポの こたえ「' + esc(c.said) + '」は ' + (c.said === c.answer ? 'あって いたね。' : 'まちがい だったね。') + '</p>'
    : '';

  app.innerHTML =
    '<div class="card result">' +
      '<div class="mark ' + (correct ? 'ok' : 'ng') + '">' + (correct ? '◯' : '✕') + '</div>' +
      '<div class="ans">こたえ： ' + esc(c.answer) + '</div>' +
      judgeNote +
      (!correct && c.hint ? '<p class="hint">💡 ' + esc(c.hint) + '</p>' : '') +
      (correct && c.fact ? '<p class="fact">' + esc(c.fact) + '</p>' : '') +
      extra +
      '<button class="btn btn-main" id="nextBtn" style="margin-top:18px">' +
        (session.i + 1 >= session.cards.length ? 'おわり' : 'つぎへ') + '</button>' +
    '</div>';

  $('nextBtn').addEventListener('click', () => {
    Snd.tap();
    session.i++;
    if (session.i >= session.cards.length) endSession();
    else { window.scrollTo(0, 0); quizScreen(); }
  });
  Snd.speak(voice);
}

function endSession() {
  if (session.kind === 'daily') {
    const key = session.key;
    if (save.daily.date !== key) save.daily = { date: key, best: 0, done: false, score: 0 };
    save.daily.done = true;
    save.daily.score = session.ok;
    if (session.ok > save.daily.best) save.daily.best = session.ok;
    if (session.ok > save.bestDaily) save.bestDaily = session.ok;
  }
  store();
  go('summary', { ok: session.ok, n: session.cards.length, born: session.born.slice(), tamed: session.tamed.slice(), kind: session.kind });
}

function summaryScreen(s) {
  if (!s) { go('home'); return; }
  const mood = s.ok === s.n ? 'wow' : (s.ok >= Math.ceil(s.n / 2) ? 'happy' : 'normal');
  const line = s.ok === s.n ? 'ぜんぶ せいかい！ ポポは かしこく なったよ！'
    : (s.ok >= Math.ceil(s.n / 2) ? 'よく できたね！ ポポも おぼえたよ。'
      : 'モヤモヤが ふえたね。また あとで たおしに いこう。');

  let html =
    '<div class="card summary">' +
      Art.popo(mood, 130) +
      '<div class="big">' + s.ok + ' ／ ' + s.n + '</div>' +
      '<p style="font-size:16px;color:var(--ink)">' + esc(line) + '</p>';

  if (s.kind === 'daily') {
    html += '<p>きょうの きろく ' + s.ok + 'もん ／ これまでの さいこう ' + save.bestDaily + 'もん</p>';
  }
  if (s.tamed.length) {
    html += '<div class="moya-pop friend">' +
      s.tamed.map((id) => Art.moya(id, (Engine.item(id) || { tags: [] }).tags[0], 'friend', 60)).join('') +
      '<p>なかよしが ' + s.tamed.length + 'たい ふえた！</p></div>';
  }
  if (s.born.length) {
    html += '<div class="moya-pop">' +
      s.born.map((id) => Art.moya(id, (Engine.item(id) || { tags: [] }).tags[0], 'awake', 60)).join('') +
      '<p>モヤモヤが ' + s.born.length + 'たい うまれた。ずかんで まってるよ。</p></div>';
  }
  html += '</div>';

  const canRun = !save.run && !save.report;
  html += '<div class="menu-list">' +
    (canRun ? '<button class="btn btn-go" id="sumRun">ポポを おくりだす</button>' : '') +
    '<button class="btn btn-sub" id="sumHome" style="margin-top:12px">ホームへ もどる</button>' +
    '</div>';

  app.innerHTML = html;
  if ($('sumRun')) $('sumRun').addEventListener('click', () => { Snd.tap(); go('runsel'); });
  $('sumHome').addEventListener('click', () => { Snd.tap(); go('home'); });
  if (s.ok === s.n) Snd.fanfare();
  Snd.speak(line);
}

/* ---------------------------- モヤモヤずかん ---------------------------- */

function moyaScreen() {
  const now = Date.now();
  const list = Engine.moyaList(now);
  const coming = Engine.comingDays(now, 7);
  const maxN = Math.max(1, Math.max.apply(null, coming));

  const week = ['にち', 'げつ', 'か', 'すい', 'もく', 'きん', 'ど'];
  let cal = '<div class="cal">';
  for (let d = 0; d < 7; d++) {
    const dt = new Date(now + d * DAY);
    cal += '<div class="col' + (d === 0 ? ' today' : '') + (coming[d] ? '' : ' zero') + '">' +
      '<div class="n">' + (coming[d] || '') + '</div>' +
      '<div class="bar"><i style="height:' + Math.round((coming[d] / maxN) * 100) + '%"></i></div>' +
      '<div class="d">' + (d === 0 ? 'きょう' : week[dt.getDay()]) + '</div>' +
      '</div>';
  }
  cal += '</div>';

  let grid = '';
  if (!list.length) {
    grid = '<p class="empty">まだ モヤモヤは いないよ。<br>もんだいを まちがえると ここに あらわれる。</p>';
  } else {
    grid = '<div class="moya-grid">' + list.map((m) => {
      const tag = m.item.tags[0];
      const label = m.item.q.length > 14 ? m.item.q.slice(0, 13) + '…' : m.item.q;
      if (m.state === 'awake') {
        return '<button class="moya-cell awake" data-id="' + m.item.id + '" type="button">' +
          Art.moya(m.item.id, tag, 'awake', 78) +
          '<span class="lbl">' + esc(label) + '</span><span class="when">でてきた！</span></button>';
      }
      if (m.state === 'sleep') {
        return '<div class="moya-cell sleep">' + Art.moya(m.item.id, tag, 'sleep', 78) +
          '<span class="lbl">' + esc(label) + '</span><span class="when">' + daysText(m.rec.due, now) + '</span></div>';
      }
      return '<div class="moya-cell friend">' + Art.moya(m.item.id, tag, 'friend', 78) +
        '<span class="lbl">' + esc(label) + '</span><span class="when" style="color:var(--gold)">なかよし</span></div>';
    }).join('') + '</div>';
  }

  const st = Engine.stats();
  app.innerHTML =
    '<div class="card">' +
      '<h2>👻 しゅうらい カレンダー</h2>' +
      '<p>ねむっている モヤモヤが でてくる 日。ふくしゅうに ちょうど よい 日に あわせて でてくるよ。</p>' +
      cal +
    '</div>' +
    '<div class="card">' +
      '<h2>ずかん（' + (st.moya + st.friend) + 'たい）</h2>' +
      '<p>でてきた モヤモヤを おすと たたかえる。' + Engine.TAME_BOX + 'かい つづけて せいかい すると なかよしに なるよ。</p>' +
      grid +
    '</div>';

  app.querySelectorAll('.moya-cell.awake').forEach((el) => {
    el.addEventListener('click', () => { Snd.unlock(); Snd.tap(); startHunt(el.dataset.id); });
  });
}

/* ------------------------------ うんこう ------------------------------ */

function runSelScreen() {
  if (save.report) { go('report'); return; }
  if (save.run) { go('home'); return; }

  const cards = PACK.routes.map((r) => {
    const m = Engine.confidence(r.tags);
    const locked = lv() < r.minLevel;
    const time = r.minutes >= 60 ? (r.minutes / 60) + 'じかん' : r.minutes + 'ふん';
    return '<button class="route" type="button" data-id="' + r.id + '"' + (locked ? ' disabled' : '') + '>' +
      '<div class="rt-top"><span class="rt-emoji">' + r.emoji + '</span>' +
        '<span class="rt-name">' + esc(r.name) + '</span>' +
        '<span class="rt-time">' + (locked ? '🔒 Lv.' + r.minLevel + 'から' : time) + '</span></div>' +
      '<div class="rt-desc">' + esc(r.desc) + '</div>' +
      '<div class="gauge"><span>ポポの じしん</span>' +
        '<span class="track"><i style="width:' + Math.max(4, Math.round(m * 100)) + '%;background:' + r.color + '"></i></span>' +
        '<span>' + confWord(m) + '</span></div>' +
      '</button>';
  }).join('');

  app.innerHTML =
    '<div class="card">' +
      '<div class="popo-area">' + Art.popo('normal', 100) +
        '<div class="bubble">どの コースに いこうかな？ おしえて もらった ぶんだけ、とおくまで いけるよ。</div></div>' +
    '</div>' +
    cards +
    '<p class="empty">アプリを とじても だいじょうぶ。じかんが たったら かってに もどってくるよ。</p>';

  app.querySelectorAll('.route').forEach((el) => {
    el.addEventListener('click', () => departRun(el.dataset.id));
  });
  Snd.speak('どの コースに いこうかな？');
}

/* パーセントは 5さいには つたわらない ので ことばで 出す */
function confWord(m) {
  if (m < 0.25) return 'これから';
  if (m < 0.5) return 'すこし';
  if (m < 0.75) return 'いいかんじ';
  return 'ばっちり';
}

function departRun(routeId) {
  const r = routeById(routeId);
  if (!r) return;
  const now = Date.now();
  save.run = { routeId: routeId, startAt: now, endAt: now + r.minutes * MIN };
  save.report = null;
  store();
  Snd.unlock(); Snd.depart();
  Snd.speak('いってきます！');
  go('home');
}

/* かえってきた ときの けいさん。しゅうじゅく度は 「いま」の 数字で みる */
function finishRun() {
  if (!save.run) { go('home'); return; }
  const r = routeById(save.run.routeId);
  const now = Date.now();
  if (!r || now < save.run.endAt) return;

  const res = Engine.runResult(r, now);
  const rec = stampRec(r.id);
  let stampName = null;
  if (rec.n < r.stamps.length) {
    stampName = r.stamps[rec.n];
    if (res.perfect) rec.golds[rec.n] = 1;
    rec.n++;
  }

  save.report = {
    routeId: r.id, reach: res.reach, length: res.length, perfect: res.perfect,
    stamp: stampName, gold: res.perfect, bring: res.bring, at: now,
  };
  save.bring = res.bring.slice();
  save.run = null;
  store();
  Snd.unlock(); Snd.fanfare();
  go('report');
}

function reportScreen() {
  const rep = save.report;
  if (!rep) { go('home'); return; }
  const r = routeById(rep.routeId);

  let rail = '<div class="rail">';
  for (let i = 0; i < rep.length; i++) rail += '<span class="st' + (i < rep.reach ? ' on' : '') + '"></span>';
  rail += '</div>';

  const line = rep.perfect
    ? 'さいごまで いけたよ！ かんぺき うんこう！'
    : rep.reach + '' + PACK.words.step + 'まで いけたよ。とちゅうで わからなく なっちゃった。';

  let html =
    '<div class="card">' +
      '<h2>' + (r ? r.emoji : '🚋') + ' ' + esc(r ? r.name : 'うんこう') + ' の ほうこく</h2>' +
      '<div class="popo-area">' + Art.popo(rep.perfect ? 'wow' : 'happy', 108) +
        '<div class="bubble">' + esc(line) + '</div></div>' +
      rail +
      '<p style="text-align:center">' + rep.reach + ' ／ ' + rep.length + ' ' + PACK.words.step + '</p>' +
    '</div>';

  if (rep.stamp) {
    html +=
      '<div class="card" style="text-align:center">' +
        '<h2 style="justify-content:center">🎁 おみやげ スタンプ</h2>' +
        Art.stamp(rep.stamp, rep.gold ? '#e0a91b' : (r ? r.color : null), true) +
        '<p style="margin-top:6px">' + esc(rep.stamp) + (rep.gold ? '（きんいろ！）' : '') + '</p>' +
      '</div>';
  }

  if (rep.bring && rep.bring.length) {
    html +=
      '<div class="card">' +
        '<h2>❓ ポポの しつもん</h2>' +
        '<p>「ここが わからなかった」と いって、もんだいを もって かえってきたよ。</p>' +
        '<ul style="margin:0 0 14px;padding-left:20px;font-size:15px;line-height:1.9">' +
          rep.bring.map((id) => { const it = Engine.item(id); return it ? '<li>' + esc(it.q) + '</li>' : ''; }).join('') +
        '</ul>' +
        '<button class="btn btn-go" id="repTeach">いま おしえる</button>' +
      '</div>';
  }

  html += '<button class="btn btn-sub" id="repHome">ホームへ もどる</button>';
  app.innerHTML = html;

  if ($('repTeach')) $('repTeach').addEventListener('click', () => { save.report = null; store(); startTeach(); });
  $('repHome').addEventListener('click', () => { save.report = null; store(); go('home'); });
  Snd.speak(line);
}

/* ------------------------------ おみやげ ------------------------------ */

function stampScreen() {
  const html = PACK.routes.map((r) => {
    const rec = save.stamps[r.id] || { n: 0, golds: {} };
    const cells = r.stamps.map((nm, i) => {
      const got = i < rec.n;
      const gold = got && rec.golds && rec.golds[i];
      return '<div class="stamp-cell' + (gold ? ' gold' : '') + '">' +
        Art.stamp(nm, gold ? '#e0a91b' : r.color, got) +
        '<span class="nm">' + (got ? esc(nm) : '？') + '</span></div>';
    }).join('');
    return '<div class="card stamp-group">' +
      '<h3>' + r.emoji + ' ' + esc(r.name) + '（' + rec.n + '／' + r.stamps.length + '）</h3>' +
      '<div class="stamp-grid">' + cells + '</div></div>';
  }).join('');

  app.innerHTML = html + '<p class="empty">うんこうから かえるたびに 1こ もらえる。<br>さいごまで いけた ときは きんいろに なるよ。</p>';
}

/* ------------------------------ しょきか ------------------------------ */

function initSound() {
  Snd.setVoice(save.settings.voice);
  Snd.setSe(save.settings.se);
  $('tgVoice').checked = save.settings.voice;
  $('tgSe').checked = save.settings.se;

  $('soundBtn').addEventListener('click', () => { $('soundPanel').hidden = false; });
  $('sheetClose').addEventListener('click', () => { $('soundPanel').hidden = true; });
  $('tgVoice').addEventListener('change', (e) => {
    save.settings.voice = e.target.checked; Snd.setVoice(e.target.checked); store();
  });
  $('tgSe').addEventListener('change', (e) => {
    save.settings.se = e.target.checked; Snd.setSe(e.target.checked); store();
  });
  $('resetBtn').addEventListener('click', () => {
    if (!window.confirm('ポポの きおくと モヤモヤずかんを ぜんぶ けします。よろしいですか？')) return;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ }
    location.reload();
  });
}

function init() {
  load();
  Engine.attach(PACK, save.srs);

  /* 日づけが かわったら 「きょうの いちばん でんしゃ」を リセット */
  const today = dateKey(Date.now());
  if (save.daily.date !== today) save.daily = { date: '', best: save.daily.best || 0, done: false, score: 0 };

  $('backBtn').addEventListener('click', () => { Snd.tap(); go('home'); });
  initSound();
  go('home');

  /* タブに もどってきた ときは うんこうの ようすを 見なおす */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && screen === 'home') homeScreen(true);
  });
}

init();
