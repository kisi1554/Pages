'use strict';

/*
 * ゲーム本体
 *  路線を えらぶ → 端の駅から順に「漢字を見て よみを4つから えらぶ」
 *  正解すると スタンプが ドンと押されて つぎの駅へすすむ。
 */

const SAVE_KEY = 'eki-stamp-rally-v1';

const state = {
  save: null,
  line: null,
  stationIndex: 0,
  station: null,
  choices: [],
  answered: false,
  mistakes: 0,
  hintUsed: 0,
  sinceQuiz: 0,   // さんすうえき まで あと何駅か
  math: null,     // いま出している さんすうの問題
  transferTo: null, // のりかえ先(かくにん中)
  mapLine: null,    // いま見ている 路線図
  mapStart: null,   // 路線図から あそびはじめる駅(かくにん中)
};

// 何駅すすむごとに さんすうえきを 入れるか
const MATH_INTERVAL = 5;

/* ============================ セーブ ============================ */

function defaultSave() {
  return {
    collected: {},   // 駅名 -> true(あつめたスタンプ)
    progress: {},    // 路線id -> つぎに挑戦する駅の番号
    cleared: {},     // 路線id -> true(完走した路線)
    settings: { bgm: true, se: true, voice: true, math: true },
    stats: { correct: 0, wrong: 0, mathCorrect: 0, mathWrong: 0 },
  };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    const base = defaultSave();
    return {
      collected: parsed.collected || base.collected,
      progress: parsed.progress || base.progress,
      cleared: parsed.cleared || base.cleared,
      settings: Object.assign(base.settings, parsed.settings || {}),
      stats: Object.assign(base.stats, parsed.stats || {}),
    };
  } catch (e) {
    return defaultSave();
  }
}

function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state.save));
  } catch (e) {
    /* 保存できなくても あそべる */
  }
}

/* ============================ 小道具 ============================ */

function $(id) {
  return document.getElementById(id);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

// 色が あかるいかどうか(あかるい色の上に 白い字は 読めないので)
function isLightColor(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.toggle('is-active', el.id === id);
  });
}

function collectedCount() {
  return Object.keys(state.save.collected).length;
}

function lineCollected(line) {
  let n = 0;
  const seen = {};
  line.stations.forEach((st) => {
    if (seen[st.name]) return;
    seen[st.name] = true;
    if (state.save.collected[st.name]) n += 1;
  });
  return n;
}

function lineUniqueCount(line) {
  const seen = {};
  line.stations.forEach((st) => { seen[st.name] = true; });
  return Object.keys(seen).length;
}

/* スタンプの見た目を作る */
function buildStamp(station, line, footer) {
  const el = document.createElement('div');
  el.className = 'stamp';
  el.style.setProperty('--c', line.ink);

  const motif = document.createElement('div');
  motif.className = 's-motif';
  motif.textContent = station.motif;

  const name = document.createElement('div');
  name.className = 's-name';
  if (station.name.length >= 8) name.classList.add('xlong');
  else if (station.name.length >= 5) name.classList.add('long');
  name.textContent = station.name;

  const lineName = document.createElement('div');
  lineName.className = 's-line';
  lineName.textContent = footer || line.name;

  el.appendChild(motif);
  el.appendChild(name);
  el.appendChild(lineName);
  return el;
}

/* ======================= 4択のつくりかた ======================= */

// ふたつの よみが どれくらい似ているか(おなじ文字がいくつあるか)
function similarity(a, b) {
  let score = 0;
  const used = {};
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      if (used[j]) continue;
      if (a.charAt(i) === b.charAt(j)) {
        used[j] = true;
        score += 1;
        break;
      }
    }
  }
  if (a.charAt(0) === b.charAt(0)) score += 2;
  if (a.length === b.length) score += 1;
  return score;
}

function makeChoices(station, line) {
  const answer = station.yomi;
  const len = answer.length;

  // 同じ路線の 他の駅(子どもが 見たことのある駅名になりやすい)
  const pool = {};
  line.stations.forEach((st) => {
    if (st.yomi !== answer) pool[st.yomi] = true;
  });

  // 文字数の ちかい駅を、近いほうから ひろげて あつめる
  //(答えだけ 長さがちがう… と 見ためで わかってしまわないように)
  const nearLength = [];
  for (let d = 0; d <= 24; d += 1) {
    const lens = d === 0 ? [len] : [len - d, len + d];
    lens.forEach((l) => {
      (YOMI_BY_LENGTH[l] || []).forEach((y) => {
        if (y === answer) return;
        pool[y] = true;
        nearLength.push(y);
      });
    });
    if (nearLength.length >= 12) break;
  }

  const candidates = Object.keys(pool);

  // よく似た よみを 1つ(にた よみを 見わける れんしゅう)
  const scored = candidates
    .map((y) => ({ y, s: similarity(answer, y) }))
    .sort((a, b) => b.s - a.s);
  const picked = [shuffle(scored.slice(0, Math.min(8, scored.length)))[0].y];

  // のこり2つは 長さのちかい駅から
  const rest = shuffle(nearLength.filter((y) => picked.indexOf(y) === -1));
  for (let i = 0; i < rest.length && picked.length < 3; i += 1) {
    if (picked.indexOf(rest[i]) === -1) picked.push(rest[i]);
  }
  // それでも たりなければ どこからでも
  const any = shuffle(candidates);
  for (let i = 0; i < any.length && picked.length < 3; i += 1) {
    if (picked.indexOf(any[i]) === -1) picked.push(any[i]);
  }

  return shuffle(picked.concat([answer]));
}

/* ======================= 路線えらび画面 ======================= */

function renderLineList() {
  const wrap = $('line-list');
  wrap.innerHTML = '';

  COMPANIES.forEach((company) => {
    const head = document.createElement('div');
    head.className = 'company-head';
    head.textContent = company.name;
    wrap.appendChild(head);

    company.lines.forEach((line) => {
      const total = lineUniqueCount(line);
      const got = lineCollected(line);
      const done = got >= total;

      const card = document.createElement('button');
      card.className = 'line-card';
      card.style.setProperty('--c', line.color);

      const symbol = document.createElement('div');
      symbol.className = 'line-symbol';
      symbol.textContent = line.symbol;

      const info = document.createElement('div');
      info.className = 'line-info';

      const name = document.createElement('div');
      name.className = 'line-name';
      name.textContent = line.name;

      const note = document.createElement('div');
      note.className = 'line-note';
      note.textContent = line.note;

      const meter = document.createElement('div');
      meter.className = 'line-meter';
      const bar = document.createElement('i');
      bar.style.width = `${Math.round((got / total) * 100)}%`;
      meter.appendChild(bar);

      info.appendChild(name);
      info.appendChild(note);
      info.appendChild(meter);

      const count = document.createElement('div');
      count.className = 'line-count';
      if (done) {
        count.innerHTML = `<div class="line-done">🏆</div><small>ぜんぶ</small>`;
      } else {
        count.innerHTML = `${got}<small>/ ${total}えき</small>`;
      }

      card.appendChild(symbol);
      card.appendChild(info);
      card.appendChild(count);
      card.addEventListener('click', () => {
        SoundEngine.seTap();
        startLine(line);
      });
      wrap.appendChild(card);
    });
  });
}

/* ======================= ラリー画面 ======================= */

function startLine(line) {
  state.line = line;
  const saved = state.save.progress[line.id] || 0;
  state.stationIndex = saved >= line.stations.length ? 0 : saved;
  state.sinceQuiz = 0;

  document.documentElement.style.setProperty('--line-color', line.color);
  document.documentElement.style.setProperty('--line-ink', line.ink);
  $('rally-line-name').textContent = line.name;
  $('rally-bar').style.background = line.color;
  $('rally-bar').classList.toggle('on-light', isLightColor(line.color));
  $('ekimei-bar').style.background = line.color;

  showScreen('screen-rally');
  showStation();
  SoundEngine.speak(`${line.name}、しゅっぱつ!`, { rate: 0.9 });
}

function renderRail() {
  const rail = $('rally-rail');
  rail.innerHTML = '';
  state.line.stations.forEach((st, i) => {
    if (i > 0) {
      const link = document.createElement('div');
      link.className = 'rail-link' + (i <= state.stationIndex ? ' done' : '');
      rail.appendChild(link);
    }
    const dot = document.createElement('div');
    let cls = 'rail-dot';
    if (i < state.stationIndex || state.save.collected[st.name]) cls += ' done';
    if (i === state.stationIndex) cls += ' here';
    dot.className = cls;
    dot.title = st.name;
    rail.appendChild(dot);
  });

  // いまの駅が まん中に来るように スクロール
  window.requestAnimationFrame(() => {
    const here = rail.querySelector('.rail-dot.here');
    if (here) {
      rail.scrollLeft = here.offsetLeft - rail.clientWidth / 2 + here.clientWidth / 2;
    }
  });
}

function showStation() {
  const line = state.line;
  const station = line.stations[state.stationIndex];
  state.station = station;
  state.answered = false;
  state.mistakes = 0;
  state.hintUsed = 0;

  $('rally-count').textContent = `${state.stationIndex + 1} / ${line.stations.length}`;

  const nameEl = $('ekimei-name');
  nameEl.textContent = station.name;
  nameEl.className = 'ekimei-name';
  if (station.name.length >= 9) nameEl.classList.add('xlong');
  else if (station.name.length >= 6) nameEl.classList.add('long');

  const yomiEl = $('ekimei-yomi');
  yomiEl.textContent = station.yomi;
  yomiEl.classList.remove('show');

  const prev = line.stations[state.stationIndex - 1];
  const next = line.stations[state.stationIndex + 1];
  $('ekimei-prev').textContent = prev ? prev.name : '━━';
  $('ekimei-next').textContent = next ? next.name : '━━';

  renderTransfers(station, line);

  $('question-text').textContent = 'この えき なんて よむ?';

  // つぎの さんすうえきまで あと何駅か
  const eta = MATH_INTERVAL - state.sinceQuiz;
  const lastStation = state.stationIndex + eta >= line.stations.length;
  $('math-eta').textContent =
    state.save.settings.math && !lastStation ? `つぎの さんすうえきまで あと ${eta}えき 🧮` : '';

  state.choices = makeChoices(station, line);
  renderChoices();
  renderRail();
}

/* ======================= のりかえ案内 ======================= */

function renderTransfers(station, line) {
  const wrap = $('ekimei-transfer');
  wrap.innerHTML = '';

  const here = transfersFor(station.name, line.id);
  const others = otherTransfersFor(station.name, line.id);

  const head = document.createElement('div');
  head.className = 'transfer-head';
  head.textContent = 'のりかえ';
  wrap.appendChild(head);

  if (here.length === 0 && others.length === 0) {
    const none = document.createElement('div');
    none.className = 'transfer-none';
    none.textContent = 'この えきは のりかえ なし';
    wrap.appendChild(none);
    return;
  }

  // このアプリで あそべる路線(タップして のりかえられる)
  if (here.length > 0) {
    const chips = document.createElement('div');
    chips.className = 'transfer-chips';
    here.forEach((t) => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.style.setProperty('--c', t.line.color);
      chip.textContent = t.line.name;
      chip.addEventListener('click', () => askTransfer(t.line, t.index, station));
      chips.appendChild(chip);
    });
    wrap.appendChild(chips);
  }

  // アプリに入っていない路線(見るだけ)
  if (others.length > 0) {
    const chips = document.createElement('div');
    chips.className = 'transfer-chips';
    others.forEach((name) => {
      const chip = document.createElement('span');
      chip.className = 'chip other';
      chip.textContent = name;
      chips.appendChild(chip);
    });
    wrap.appendChild(chips);
  }
}

function askTransfer(targetLine, index, station) {
  SoundEngine.seTap();
  state.transferTo = { line: targetLine, index };

  const ask = $('transfer-ask');
  ask.style.setProperty('--c', targetLine.ink);
  ask.innerHTML = '';

  const lineName = document.createElement('span');
  lineName.className = 'ta-line';
  lineName.textContent = targetLine.name;

  const text = document.createTextNode('に のりかえる?');

  const where = document.createElement('span');
  where.className = 'ta-station';
  where.textContent = `${station.name}えき ・ ${targetLine.company}`;

  ask.appendChild(lineName);
  ask.appendChild(text);
  ask.appendChild(where);

  $('transfer-overlay').classList.add('is-active');
  SoundEngine.speak(`${targetLine.name}に のりかえますか?`, { rate: 0.9 });
}

function doTransfer() {
  const t = state.transferTo;
  if (!t) return;
  state.transferTo = null;
  $('transfer-overlay').classList.remove('is-active');

  // のりかえ先の路線は、その駅から はじめる
  state.save.progress[t.line.id] = t.index;
  persist();
  SoundEngine.seStamp();
  startLine(t.line);
}

function cancelTransfer() {
  state.transferTo = null;
  SoundEngine.seTap();
  SoundEngine.stopSpeak();
  $('transfer-overlay').classList.remove('is-active');
}

function renderChoices() {
  const wrap = $('choices');
  wrap.innerHTML = '';
  state.choices.forEach((yomi) => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    if (yomi.length >= 11) btn.classList.add('xlong');
    else if (yomi.length >= 7) btn.classList.add('long');
    btn.dataset.yomi = yomi;
    btn.appendChild(document.createTextNode(yomi));

    const say = document.createElement('button');
    say.className = 'say';
    say.textContent = '🔊';
    say.setAttribute('aria-label', `${yomi} を きく`);
    say.addEventListener('click', (ev) => {
      ev.stopPropagation();
      SoundEngine.speak(yomi);
    });
    btn.appendChild(say);

    btn.addEventListener('click', () => answer(btn, yomi));
    wrap.appendChild(btn);
  });
}

function answer(btn, yomi) {
  if (state.answered) return;
  const station = state.station;

  if (yomi !== station.yomi) {
    state.mistakes += 1;
    state.save.stats.wrong += 1;
    persist();
    SoundEngine.seWrong();
    btn.classList.add('wrong');
    window.setTimeout(() => {
      btn.classList.remove('wrong');
      btn.classList.add('dim');
    }, 400);
    // 1回まちがえたら 最初の1文字を ヒントとして 出す
    if (state.mistakes === 1) {
      $('question-text').textContent = `ヒント: 「${station.yomi.charAt(0)}」から はじまるよ`;
    }
    return;
  }

  state.answered = true;
  state.save.stats.correct += 1;
  btn.classList.add('correct');
  $('ekimei-yomi').classList.add('show');
  SoundEngine.seCorrect();

  const isNew = !state.save.collected[station.name];
  state.save.collected[station.name] = true;
  persist();

  window.setTimeout(() => pressStamp(station, isNew), 420);
}

function pressStamp(station, isNew) {
  const overlay = $('stamp-overlay');
  const holder = $('stamp-card');
  holder.innerHTML = '';
  holder.classList.remove('press');

  const stamp = buildStamp(station, state.line);
  holder.appendChild(stamp);

  $('stamp-yomi').textContent = isNew ? station.yomi : `${station.yomi}(ゲット ずみ)`;
  overlay.classList.add('is-active');

  // リフローさせてから アニメーション
  void holder.offsetWidth;
  holder.classList.add('press');

  window.setTimeout(() => {
    SoundEngine.seStamp();
    SoundEngine.speak(`${station.yomi}!`);
  }, 300);
}

function goNextStation() {
  $('stamp-overlay').classList.remove('is-active');

  const line = state.line;
  const next = state.stationIndex + 1;
  state.save.progress[line.id] = next;
  persist();

  if (next >= line.stations.length) {
    finishLine();
    return;
  }
  state.stationIndex = next;

  // 何駅かごとに「さんすうえき」に とまる
  state.sinceQuiz += 1;
  if (state.save.settings.math && state.sinceQuiz >= MATH_INTERVAL) {
    state.sinceQuiz = 0;
    showMathQuiz();
    return;
  }
  showStation();
}

function skipStation() {
  if (state.answered) return;
  SoundEngine.seTap();
  const line = state.line;
  const next = state.stationIndex + 1;
  if (next >= line.stations.length) {
    state.stationIndex = 0;
  } else {
    state.stationIndex = next;
  }
  state.save.progress[line.id] = state.stationIndex;
  persist();
  showStation();
}

function useHint() {
  if (state.answered) return;
  SoundEngine.seTap();
  const wrongs = Array.prototype.filter.call(
    document.querySelectorAll('.choice'),
    (el) => el.dataset.yomi !== state.station.yomi && !el.classList.contains('dim')
  );
  if (state.hintUsed === 0 && wrongs.length > 1) {
    wrongs[Math.floor(Math.random() * wrongs.length)].classList.add('dim');
    state.hintUsed = 1;
    $('question-text').textContent = 'ひとつ けしたよ!';
  } else {
    $('question-text').textContent = `ヒント: 「${state.station.yomi.charAt(0)}」から はじまるよ`;
    state.hintUsed = 2;
  }
}

/* ========================== 路線図 ========================== */

function renderMapList() {
  const wrap = $('map-list');
  wrap.innerHTML = '';

  const intro = document.createElement('p');
  intro.className = 'map-card-note';
  intro.textContent = '駅にはってある 路線図が 見られるよ。えらんでね。';
  wrap.appendChild(intro);

  MAP_LINE_IDS.forEach((id) => {
    const line = LINE_BY_ID[id];
    if (!line) return;

    const total = lineUniqueCount(line);
    const got = lineCollected(line);

    const card = document.createElement('button');
    card.className = 'line-card';
    card.style.setProperty('--c', line.color);

    const symbol = document.createElement('div');
    symbol.className = 'line-symbol';
    symbol.textContent = line.symbol;

    const info = document.createElement('div');
    info.className = 'line-info';

    const name = document.createElement('div');
    name.className = 'line-name';
    name.textContent = line.name;

    const note = document.createElement('div');
    note.className = 'line-note';
    note.textContent = `${line.company} ・ ${line.stations.length}えき`;

    const meter = document.createElement('div');
    meter.className = 'line-meter';
    const bar = document.createElement('i');
    bar.style.width = `${Math.round((got / total) * 100)}%`;
    meter.appendChild(bar);

    info.appendChild(name);
    info.appendChild(note);
    info.appendChild(meter);

    const count = document.createElement('div');
    count.className = 'line-count';
    count.innerHTML = '🗺️<small>ひらく</small>';

    card.appendChild(symbol);
    card.appendChild(info);
    card.appendChild(count);
    card.addEventListener('click', () => {
      SoundEngine.seTap();
      showMap(line);
    });
    wrap.appendChild(card);
  });

  const more = document.createElement('p');
  more.className = 'map-card-note';
  more.style.marginTop = '18px';
  more.textContent = 'ほかの路線の 路線図も これから ふやしていきます。';
  wrap.appendChild(more);
}

function showMap(line) {
  state.mapLine = line;

  document.documentElement.style.setProperty('--line-color', line.color);
  $('map-line-name').textContent = line.name;
  $('map-bar').style.background = line.color;
  $('map-bar').classList.toggle('on-light', isLightColor(line.color));
  $('map-count').textContent = `${lineCollected(line)} / ${lineUniqueCount(line)}`;

  const track = $('map-track');
  track.innerHTML = '';
  track.style.setProperty('--c', line.color);

  const hereIndex = state.save.progress[line.id] || 0;

  line.stations.forEach((st, i) => {
    const col = document.createElement('button');
    col.className = 'map-station';
    if (st.name.length >= 8) col.classList.add('small');
    if (i === hereIndex) col.classList.add('here');

    // 駅名は 1文字ずつ たてに つみあげる
    //(CSSの たて書きは 漢字が出ない環境があるので つかわない)
    const name = document.createElement('div');
    name.className = 'map-name';
    Array.prototype.forEach.call(st.name, (ch) => {
      const s = document.createElement('span');
      s.textContent = ch;
      // のばす音は よこむきの文字なので まわす
      if (ch === 'ー' || ch === '－' || ch === '—') s.className = 'rot';
      name.appendChild(s);
    });

    const cell = document.createElement('div');
    cell.className = 'map-dot-cell';

    const transfers = transfersFor(st.name, line.id);
    const dot = document.createElement('div');
    dot.className = 'map-dot';
    if (state.save.collected[st.name]) dot.classList.add('got');
    if (transfers.length > 0) dot.classList.add('junction');
    cell.appendChild(dot);

    // のりかえ路線を いろの まるで しめす
    const trWrap = document.createElement('div');
    trWrap.className = 'map-transfers';
    transfers.slice(0, 4).forEach((t) => {
      const mark = document.createElement('i');
      mark.className = 'map-tr';
      mark.style.background = t.line.color;
      mark.title = t.line.name;
      trWrap.appendChild(mark);
    });
    if (transfers.length > 4) {
      const more = document.createElement('span');
      more.className = 'map-tr-more';
      more.textContent = `+${transfers.length - 4}`;
      trWrap.appendChild(more);
    }

    col.appendChild(name);
    col.appendChild(cell);
    col.appendChild(trWrap);
    col.addEventListener('click', () => askMapStart(line, i));
    track.appendChild(col);
  });

  $('mapstart-overlay').classList.remove('is-active');
  showScreen('screen-map');

  // いま すすんでいる駅が 見えるように よこスクロール
  window.requestAnimationFrame(() => {
    const scroller = $('map-scroll');
    const here = track.querySelector('.map-station.here');
    if (here) {
      scroller.scrollLeft = here.offsetLeft - scroller.clientWidth / 2 + here.clientWidth / 2;
    }
  });
}

function askMapStart(line, index) {
  const station = line.stations[index];
  SoundEngine.seTap();
  SoundEngine.speak(station.yomi);
  state.mapStart = { line, index };

  const ask = $('mapstart-ask');
  ask.style.setProperty('--c', line.ink);
  ask.innerHTML = '';

  const nameEl = document.createElement('span');
  nameEl.className = 'ta-line';
  nameEl.textContent = station.name;

  const yomiEl = document.createElement('span');
  yomiEl.className = 'ta-station';
  yomiEl.textContent = `${station.yomi} ・ ${line.name}`;

  ask.appendChild(nameEl);
  ask.appendChild(document.createTextNode('から あそぶ?'));
  ask.appendChild(yomiEl);

  $('mapstart-overlay').classList.add('is-active');
}

function doMapStart() {
  const s = state.mapStart;
  if (!s) return;
  state.mapStart = null;
  $('mapstart-overlay').classList.remove('is-active');
  state.save.progress[s.line.id] = s.index;
  persist();
  startLine(s.line);
}

function cancelMapStart() {
  state.mapStart = null;
  SoundEngine.seTap();
  SoundEngine.stopSpeak();
  $('mapstart-overlay').classList.remove('is-active');
}

/* ======================= さんすうえき ======================= */

const NUM_WORDS = [
  '', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう', 'じゅう',
  'じゅういち', 'じゅうに', 'じゅうさん', 'じゅうよん', 'じゅうご',
  'じゅうろく', 'じゅうなな', 'じゅうはち', 'じゅうきゅう', 'にじゅう',
];

function numWord(n) {
  return NUM_WORDS[n] || String(n);
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// 正解が ふえるほど すこしずつ 大きい数に
function mathMax() {
  const n = state.save.stats.mathCorrect;
  if (n < 12) return 10;
  if (n < 30) return 15;
  return 20;
}

const MATH_TEMPLATES = [
  (a, b, ctx) => ({
    icon: '🚃',
    unit: 'えき',
    text: `${ctx.fromName}から ${a}えき すすんで、そこから もう ${b}えき すすんだよ。\nぜんぶで なんえき すすんだ?`,
  }),
  (a, b) => ({
    icon: '⭐',
    unit: 'こ',
    text: `スタンプを ${a}こ あつめて、あとから ${b}こ あつめたよ。\nぜんぶで なんこ?`,
  }),
  (a, b) => ({
    icon: '🚋',
    unit: 'りょう',
    text: `${a}りょうの でんしゃに ${b}りょう つなぎます。\nなんりょうの でんしゃに なる?`,
  }),
  (a, b) => ({
    icon: '🎫',
    unit: 'まい',
    text: `きっぷを ${a}まい かって、あとから もう ${b}まい かいました。\nきっぷは ぜんぶで なんまい?`,
  }),
  (a, b, ctx) => ({
    icon: '🧍',
    unit: 'にん',
    text: `${ctx.stationName}えきで ${a}にん のって、つぎの えきで ${b}にん のりました。\nぜんぶで なんにん?`,
  }),
];

function makeMathQuestion() {
  const max = mathMax();
  const a = randInt(1, Math.min(9, max - 1));
  const b = randInt(1, Math.min(9, max - a));
  const answer = a + b;

  const line = state.line;
  const from = line.stations[Math.max(0, state.stationIndex - MATH_INTERVAL)];
  const ctx = {
    fromName: from ? from.name : line.stations[0].name,
    stationName: line.stations[Math.max(0, state.stationIndex - 1)].name,
  };

  const tpl = MATH_TEMPLATES[Math.floor(Math.random() * MATH_TEMPLATES.length)](a, b, ctx);

  // まちがいの選択肢は 答えの まわりの数から
  const picked = {};
  picked[answer] = true;
  const near = shuffle([
    answer + 1, answer - 1, answer + 2, answer - 2, answer + 3, answer - 3, answer + 10,
  ]);
  const choices = [answer];
  for (let i = 0; i < near.length && choices.length < 4; i += 1) {
    const v = near[i];
    if (v >= 1 && v <= 30 && !picked[v]) {
      picked[v] = true;
      choices.push(v);
    }
  }

  return { a, b, answer, icon: tpl.icon, unit: tpl.unit, text: tpl.text, choices: shuffle(choices) };
}

function showMathQuiz() {
  const q = makeMathQuestion();
  state.math = q;
  state.answered = false;

  $('math-score').textContent = `${state.save.stats.mathCorrect}もん`;
  $('math-question').textContent = q.text;

  const rowA = $('math-row-a');
  const rowB = $('math-row-b');
  rowA.innerHTML = '';
  rowB.innerHTML = '';
  for (let i = 0; i < q.a; i += 1) {
    const el = document.createElement('span');
    el.className = 'math-item';
    el.textContent = q.icon;
    rowA.appendChild(el);
  }
  for (let i = 0; i < q.b; i += 1) {
    const el = document.createElement('span');
    el.className = 'math-item';
    el.textContent = q.icon;
    rowB.appendChild(el);
  }

  const wrap = $('math-choices');
  wrap.innerHTML = '';
  q.choices.forEach((value) => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.dataset.value = String(value);
    btn.textContent = String(value);
    btn.addEventListener('click', () => answerMath(btn, value));
    wrap.appendChild(btn);
  });

  $('math-overlay').classList.remove('is-active');
  showScreen('screen-math');
  SoundEngine.speak(q.text.replace('\n', ' '), { rate: 0.88 });
}

function countAloud() {
  if (state.counting) return;
  state.counting = true;
  const items = document.querySelectorAll('#screen-math .math-item');
  items.forEach((el) => el.classList.remove('counted'));

  let i = 0;
  const tick = () => {
    if (i >= items.length) {
      state.counting = false;
      return;
    }
    items[i].classList.add('counted');
    SoundEngine.speak(numWord(i + 1), { rate: 1 });
    SoundEngine.seTap();
    i += 1;
    window.setTimeout(tick, 620);
  };
  tick();
}

function answerMath(btn, value) {
  if (state.answered) return;
  const q = state.math;

  if (value !== q.answer) {
    state.save.stats.mathWrong += 1;
    persist();
    SoundEngine.seWrong();
    btn.classList.add('wrong');
    window.setTimeout(() => {
      btn.classList.remove('wrong');
      btn.classList.add('dim');
    }, 400);
    $('math-question').textContent = `${q.text}\nかぞえて みよう!`;
    return;
  }

  state.answered = true;
  state.save.stats.mathCorrect += 1;
  persist();
  btn.classList.add('correct');
  SoundEngine.seCorrect();

  $('math-result').textContent = `${q.a} + ${q.b} = ${q.answer}`;
  $('math-score').textContent = `${state.save.stats.mathCorrect}もん`;
  $('math-overlay').classList.add('is-active');
  SoundEngine.speak(
    `せいかい! ${numWord(q.a)} たす ${numWord(q.b)} は ${numWord(q.answer)}。`,
    { rate: 0.85 }
  );
}

function resumeAfterMath() {
  $('math-overlay').classList.remove('is-active');
  showScreen('screen-rally');
  showStation();
}

/* ======================= 完走画面 ======================= */

function finishLine() {
  const line = state.line;
  state.save.cleared[line.id] = true;
  state.save.progress[line.id] = line.stations.length;
  persist();

  $('clear-title').textContent = `${line.name} かんそう!`;
  $('clear-sub').textContent =
    `${line.stations[0].name} から ${line.stations[line.stations.length - 1].name} まで ` +
    `${line.stations.length}えき ぜんぶ よめたね!`;

  const holder = $('clear-stamp');
  holder.innerHTML = '';
  const memorial = buildStamp(
    { name: line.name, motif: '🏆', yomi: '' },
    line,
    'かんそう きねん'
  );
  holder.appendChild(memorial);

  showScreen('screen-clear');
  SoundEngine.seFanfare();
  SoundEngine.speak(`${line.name}、ぜんぶ よめました。すごい!`, { rate: 0.9 });
}

/* ======================= スタンプ帳 ======================= */

function renderBook() {
  const body = $('book-body');
  body.innerHTML = '';
  $('book-count').textContent = `${collectedCount()} / ${TOTAL_STATION_COUNT}`;

  LINES.forEach((line) => {
    const page = document.createElement('div');
    page.className = 'book-page';
    page.style.setProperty('--c', line.ink);

    const head = document.createElement('div');
    head.className = 'book-page-head';

    const name = document.createElement('div');
    name.className = 'book-page-name';
    name.textContent = `${line.company} ${line.name}`;

    const count = document.createElement('div');
    count.className = 'book-page-count';
    const total = lineUniqueCount(line);
    const got = lineCollected(line);
    count.textContent = got >= total ? `🏆 ${got} / ${total}` : `${got} / ${total}`;

    head.appendChild(name);
    head.appendChild(count);
    page.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'book-grid';

    const seen = {};
    line.stations.forEach((st) => {
      if (seen[st.name]) return;
      seen[st.name] = true;

      const slot = document.createElement('div');
      slot.className = 'book-slot';

      if (state.save.collected[st.name]) {
        const stamp = buildStamp(st, line);
        // 手押しっぽく、すこしずつ かたむける
        const rot = ((hashString(st.name + line.id) % 13) - 6);
        slot.style.setProperty('--rot', `${rot}deg`);
        slot.appendChild(stamp);
        slot.addEventListener('click', () => {
          SoundEngine.speak(st.yomi);
        });
      } else {
        slot.classList.add('empty');
        const box = document.createElement('div');
        box.className = 'slot-box';
        box.textContent = 'あき';
        slot.appendChild(box);
      }
      grid.appendChild(slot);
    });

    page.appendChild(grid);
    body.appendChild(page);
  });
}

/* ======================= 音のスイッチ ======================= */

function refreshSoundDock() {
  const s = state.save.settings;
  $('btn-bgm').classList.toggle('off', !s.bgm);
  $('btn-voice').classList.toggle('off', !s.voice);
  $('btn-se').classList.toggle('off', !s.se);
  $('btn-math').classList.toggle('off', !s.math);
}

function flashTrackName(name) {
  const el = $('track-name');
  el.textContent = `♪ ${name}`;
  el.classList.add('show');
  window.clearTimeout(flashTrackName.timer);
  flashTrackName.timer = window.setTimeout(() => el.classList.remove('show'), 2600);
}

/* ============================ 起動 ============================ */

function refreshTitle() {
  $('title-collected').textContent = collectedCount();
  $('title-total').textContent = TOTAL_STATION_COUNT;
  $('title-math').textContent = `さんすう ${state.save.stats.mathCorrect}もん せいかい 🧮`;
}

function init() {
  state.save = loadSave();

  SoundEngine.setBgmEnabled(state.save.settings.bgm);
  SoundEngine.setSeEnabled(state.save.settings.se);
  SoundEngine.setVoiceEnabled(state.save.settings.voice);
  SoundEngine.onTrackChange(flashTrackName);
  refreshSoundDock();
  refreshTitle();

  // さいしょのタップで 音を鳴らせるようにする(ブラウザのきまり)
  const unlock = () => {
    SoundEngine.unlock();
    if (state.save.settings.bgm) SoundEngine.startBgm();
    document.removeEventListener('pointerdown', unlock);
  };
  document.addEventListener('pointerdown', unlock);

  $('btn-start').addEventListener('click', () => {
    SoundEngine.seTap();
    renderLineList();
    showScreen('screen-lines');
  });

  $('btn-open-maps').addEventListener('click', () => {
    SoundEngine.seTap();
    renderMapList();
    showScreen('screen-maps');
  });

  $('btn-map-play').addEventListener('click', () => {
    SoundEngine.seTap();
    startLine(state.mapLine);
  });

  $('btn-mapstart-go').addEventListener('click', doMapStart);
  $('btn-mapstart-cancel').addEventListener('click', cancelMapStart);

  $('btn-open-book').addEventListener('click', () => {
    SoundEngine.seTap();
    renderBook();
    showScreen('screen-book');
  });

  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', () => {
      SoundEngine.seTap();
      SoundEngine.stopSpeak();
      const target = btn.dataset.back;
      if (target === 'screen-title') refreshTitle();
      if (target === 'screen-lines') renderLineList();
      if (target === 'screen-maps') renderMapList();
      showScreen(target);
    });
  });

  $('btn-next-station').addEventListener('click', goNextStation);
  $('btn-hint').addEventListener('click', useHint);
  $('btn-skip').addEventListener('click', skipStation);

  $('btn-transfer-go').addEventListener('click', doTransfer);
  $('btn-transfer-cancel').addEventListener('click', cancelTransfer);

  $('btn-count').addEventListener('click', countAloud);
  $('btn-math-next').addEventListener('click', resumeAfterMath);
  $('btn-math-back').addEventListener('click', () => {
    SoundEngine.seTap();
    resumeAfterMath();
  });

  $('btn-clear-next').addEventListener('click', () => {
    SoundEngine.seTap();
    renderLineList();
    showScreen('screen-lines');
  });

  $('btn-clear-book').addEventListener('click', () => {
    SoundEngine.seTap();
    renderBook();
    showScreen('screen-book');
  });

  $('btn-clear-again').addEventListener('click', () => {
    SoundEngine.seTap();
    state.save.progress[state.line.id] = 0;
    persist();
    startLine(state.line);
  });

  $('btn-bgm').addEventListener('click', () => {
    state.save.settings.bgm = !state.save.settings.bgm;
    SoundEngine.setBgmEnabled(state.save.settings.bgm);
    persist();
    refreshSoundDock();
  });

  $('btn-bgm-next').addEventListener('click', () => {
    SoundEngine.unlock();
    if (!state.save.settings.bgm) {
      state.save.settings.bgm = true;
      SoundEngine.setBgmEnabled(true);
      persist();
      refreshSoundDock();
      return;
    }
    SoundEngine.nextTrack();
  });

  $('btn-voice').addEventListener('click', () => {
    state.save.settings.voice = !state.save.settings.voice;
    SoundEngine.setVoiceEnabled(state.save.settings.voice);
    persist();
    refreshSoundDock();
    if (state.save.settings.voice) SoundEngine.speak('こえ、でるよ');
  });

  $('btn-math').addEventListener('click', () => {
    state.save.settings.math = !state.save.settings.math;
    persist();
    refreshSoundDock();
    SoundEngine.seTap();
    SoundEngine.speak(
      state.save.settings.math ? 'さんすうえきに とまるよ' : 'さんすうえきは おやすみ'
    );
  });

  $('btn-se').addEventListener('click', () => {
    state.save.settings.se = !state.save.settings.se;
    SoundEngine.setSeEnabled(state.save.settings.se);
    persist();
    refreshSoundDock();
    SoundEngine.seTap();
  });
}

document.addEventListener('DOMContentLoaded', init);
