// ぴょこっと にっぽん リズム — ゲーム本体（画面・4つの あそびかた・きろく）
//
// 拍 は Sound（audio.js）の 先読み スケジューラ が AudioContext の 時刻 で 知らせて くる。
// 見た目 の へんか は その 時刻 に なったら（rAF で）おこし、タップ の 判定 も 同じ 時計 で くらべる。

(() => {
  'use strict';

  /* ================= きろく ================= */

  const KEY = 'pyokotto-nippon-v1';
  const save = {
    prefs: {}, cleared: {}, speed: {}, medley: { best: 0, done: 0 },
    settings: { tempo: 'normal', auto: true, kanji: false, gyaku: true, vol: { bgm: 0.7, voice: 1, se: 0.8 }, mute: false },
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      Object.assign(save, d);
      save.settings = Object.assign({}, {
        tempo: 'normal', auto: true, kanji: false, gyaku: true, mute: false,
      }, d.settings || {});
      save.settings.vol = Object.assign({ bgm: 0.7, voice: 1, se: 0.8 }, (d.settings && d.settings.vol) || {});
    }
  } catch (e) { /* よめなくても あそべる */ }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できない 端末 */ }
  }
  const rec = (code) => save.prefs[code] || (save.prefs[code] = { s: 0, ok: 0, ng: 0 });
  const stars = (code) => (save.prefs[code] ? save.prefs[code].s : 0);
  const S = save.settings;

  /* ================= こまごま ================= */

  const $ = (id) => document.getElementById(id);
  const shuffle = (a) => {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  const regionOf = (id) => REGIONS.find((r) => r.id === id);
  const P = (c) => Geo.P[c];
  const speakText = (c) => PREF_SPEAK[c] || P(c).short;
  const starStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const urlBpm = (() => { const m = /[?&]bpm=(\d+)/.exec(location.search); return m ? +m[1] : 0; })();

  function nameHTML(c) {
    const p = P(c);
    if (S.kanji) {
      return `<ruby>${p.kanjiShort}<rt>${p.short}</rt></ruby>` +
        (p.kanjiSuffix ? `<ruby class="sfx">${p.kanjiSuffix}<rt>${p.suffix}</rt></ruby>` : '');
    }
    return `<span>${p.short}</span>${p.suffix ? `<span class="sfx">${p.suffix}</span>` : ''}`;
  }
  const regionNameHTML = (r) => (S.kanji ? `<ruby>${r.kanji}<rt>${r.kanjiRt}</rt></ruby>` : r.name);

  /* ================= 画面 の きりかえ ================= */

  let screen = 'title';
  function go(name) {
    if (name !== 'play' && screen === 'play') stopPlay();
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('is-active', s.id === 'sc-' + name));
    screen = name;
    if (name === 'title') renderTitle();
    if (name === 'select') renderSelect();
    if (name === 'zukan') renderZukan();
    if (name === 'parent') renderParent();
    if (name === 'settings') renderSettings();
    if (name === 'select') startMenuMusic();
    else if (name !== 'play') Sound.stop();
  }
  function startMenuMusic() {
    if (!unlocked) return;
    Sound.start(MENU_SONG, 96, null);
  }

  let unlocked = false;
  document.addEventListener('pointerdown', () => {
    if (!unlocked) { unlocked = true; Sound.unlock(); }
  }, true);

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b) { Sound.se('click'); go(b.getAttribute('data-go')); return; }
    if (e.target.closest('.js-mute')) {
      S.mute = !S.mute;
      applySound();
      persist();
    }
  });

  function applySound() {
    Sound.setMuted(S.mute);
    ['bgm', 'voice', 'se'].forEach((k) => Sound.setVolume(k, S.vol[k]));
    document.querySelectorAll('.js-mute').forEach((b) => {
      const small = b.classList.contains('iconbtn');
      b.textContent = S.mute ? (small ? '🔇' : '🔇 おと オフ') : (small ? '🔊' : '🔊 おと オン');
    });
    document.body.classList.toggle('novoice', !Sound.hasVoice() || S.mute || S.vol.voice < 0.02);
  }

  /* ================= タイトル ================= */

  function totalStars() {
    let n = 0;
    for (let c = 1; c <= 47; c++) n += stars(c);
    return n;
  }
  function renderTitle() {
    const picks = shuffle([2, 13, 27, 37, 46, 22, 1, 34, 41, 20]).slice(0, 5);
    $('heroPyokos').innerHTML = picks.map((c, i) =>
      `<span class="hero-pyoko" style="animation-delay:${i * 0.15}s">${Pyoko.svg(c, i % 2 ? 'happy' : 'smile')}</span>`).join('');
    const cl = REGIONS.filter((r) => save.cleared[r.id]).length;
    $('heroStat').textContent = `★ ${totalStars()} / 141　・　クリア ${cl} / 7 ちほう`;
  }

  /* ================= ちほう を えらぶ ================= */

  function renderSelect() {
    $('tempoRow').innerHTML = '<span>はやさ</span>' + Object.keys(TEMPOS).map((k) =>
      `<button class="chip ${S.tempo === k ? 'is-on' : ''}" data-tempo="${k}">${k === 'slow' ? '🐢' : k === 'fast' ? '🐇' : '🚶'} ${TEMPO_LABEL[k]}</button>`).join('');
    $('regionGrid').innerHTML = REGIONS.map((r) => {
      const got = r.codes.reduce((n, c) => n + stars(c), 0);
      return `<button class="region-card ${save.cleared[r.id] ? 'is-cleared' : ''}" data-region="${r.id}" style="--rc:${r.color}">
        <span class="rc-emoji">${r.emoji}</span>
        <span class="rc-name">${regionNameHTML(r)}</span>
        <span class="rc-pyokos">${r.codes.slice(0, 4).map((c) => Pyoko.svg(c, Pyoko.moodFor(stars(c)))).join('')}</span>
        <span class="rc-meta">${r.codes.length}けん　★${got}/${r.codes.length * 3}${save.cleared[r.id] ? '　✅' : ''}</span>
      </button>`;
    }).join('');
    const cl = REGIONS.filter((r) => save.cleared[r.id]).length;
    const open = cl >= 7;
    $('medleyCard').innerHTML = open
      ? `<div class="mc-title">🎶 ぜんこく メドレー</div>
         <p>47けんを きたから みなみへ 1きょくで！</p>
         <div class="menu-row"><button class="btn btn-sub" data-medley="listen">🎧 きく メドレー</button>
         <button class="btn btn-main btn-mid" data-medley="tap">👆 タップ メドレー</button></div>
         ${save.medley.best ? `<p class="mc-best">さいこう ${save.medley.best} / 47</p>` : ''}`
      : `<div class="mc-title">🔒 ぜんこく メドレー</div><p>7つの ちほうを ぜんぶ クリアすると あそべるよ（いま ${cl} / 7）</p>`;
  }
  $('sc-select').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tempo]');
    if (t) { S.tempo = t.getAttribute('data-tempo'); persist(); Sound.se('click'); renderSelect(); return; }
    const r = e.target.closest('[data-region]');
    if (r) { startRegion(r.getAttribute('data-region')); return; }
    const m = e.target.closest('[data-medley]');
    if (m) startMedley(m.getAttribute('data-medley'));
  });

  /* ================= あそぶ ================= */

  const PHASE_INFO = {
    kiku: { label: 'きく', icon: '👂', title: 'きいて おぼえよう', help: 'ひかった けんの なまえを きこう' },
    mane: { label: 'まねっこ', icon: '👆', title: 'まねっこ', help: 'ひかっている けんを タップ！' },
    test: { label: 'リズム テスト', icon: '🥁', title: 'リズム テスト', help: 'よばれた けんを つぎの はくまでに タップ！' },
    gyaku: { label: 'ぎゃく', icon: '🔤', title: 'ぎゃく もんだい', help: 'ひかった けんの なまえを えらぼう' },
    mlisten: { label: 'メドレー', icon: '🎧', title: 'きく メドレー', help: 'きたから みなみへ ぜんぶ きこう' },
    mtap: { label: 'メドレー', icon: '🎶', title: 'タップ メドレー', help: 'よばれた けんを タップ！' },
  };

  let G = null;          // いま の ゲーム
  let mapReady = false;
  const events = [];     // { t, fn } … 時刻 t（音 の 時計）に なったら fn
  const at = (t, fn) => events.push({ t, fn });

  function ensureMap() {
    if (mapReady) return;
    MapView.build($('mapHost'), $('miniHost'));
    MapView.onTap(onMapTap);
    mapReady = true;
  }

  function baseTempo(regionId) {
    if (urlBpm) return urlBpm;
    let t = TEMPOS[S.tempo] || TEMPOS.normal;
    if (S.auto && regionId) t += save.speed[regionId] || 0;
    return t;
  }

  function newGame(o) {
    return Object.assign({
      phases: [], pi: -1, phase: null, state: 'idle', queue: [], cur: 0,
      introAt: null, phaseBeat0: 0, nextCall: 0, deadline: null, callT: 0, bd: 0.6,
      lastBeat: -1, beatTime: {}, firstTry: true, misses: 0, done: 0, total: 0,
      stat: { perfect: 0, good: 0, ok: 0, miss: 0, first: 0, items: 0 }, gained: {},
      danceAt: null, finished: false,
    }, o);
  }

  function startRegion(id) {
    const r = regionOf(id);
    ensureMap();
    go('play');
    G = newGame({ mode: 'region', region: r, codes: r.codes.slice() });
    G.phases = ['kiku', 'mane', 'test'].concat(S.gyaku ? ['gyaku'] : []);
    $('hudRegion').innerHTML = `${r.emoji} ${regionNameHTML(r)}`;
    MapView.setActive(r.codes);
    MapView.setView(r.view, 0);
    MapView.setMiniRegion(r.id, r.color);
    beginMusic(r.song, baseTempo(r.id));
  }

  function medleySong(r) {
    return Object.assign({}, r.song, { groove: MEDLEY_GROOVE });
  }
  function startMedley(kind) {
    ensureMap();
    go('play');
    const all = [];
    REGIONS.forEach((r) => r.codes.forEach((c) => all.push(c)));
    G = newGame({ mode: 'medley', kind, region: REGIONS[0], codes: all, camRegion: REGIONS[0].id, score: 0 });
    G.phases = [kind === 'listen' ? 'mlisten' : 'mtap'];
    $('hudRegion').innerHTML = '🎶 ぜんこく メドレー';
    MapView.setActive(all);
    MapView.setView(REGIONS[0].view, 0);
    MapView.setMiniRegion(REGIONS[0].id, REGIONS[0].color);
    beginMusic(medleySong(REGIONS[0]), baseTempo(null));
  }

  function beginMusic(song, bpm) {
    Sound.unlock();
    applySound();
    events.length = 0;
    $('choices').innerHTML = '';
    $('judge').innerHTML = '';
    $('dance').innerHTML = '';
    $('dance').classList.remove('is-on');
    setBanner('', '');
    G.introAt = 'next';
    Sound.start(song, bpm, onStep);
  }

  function stopPlay() {
    Sound.stop();
    events.length = 0;
    G = null;
    if (mapReady) MapView.clearPops();
  }
  $('btnQuit').addEventListener('click', () => { Sound.se('click'); go(G && G.mode === 'medley' ? 'select' : 'select'); });

  /* ---------- 拍 ---------- */

  function onStep(step, t, sd) {
    if (!G || step % 2) return;
    const b = step / 2;
    G.bd = sd * 2;
    G.beatTime[b] = t;
    delete G.beatTime[b - 64];
    at(t, () => {
      if (!G) return;
      G.lastBeat = b;
      document.querySelectorAll('#beats i').forEach((e, i) => e.classList.toggle('is-on', i === b % 4));
      document.body.style.setProperty('--beat', G.bd + 's');
      const dance = $('dance');
      if (dance.classList.contains('is-on')) dance.classList.toggle('is-flip', b % 2 === 1);
      if (G.cur && G.phase === 'kiku' && (b - G.phaseBeat0) % 2 === 1) MapView.bounce(G.cur);
      else if (G.cur && G.state === 'await') MapView.bounce(G.cur);
    });
    onBeat(b, t);
  }

  function onBeat(b, t) {
    // 地方 クリア の ダンス
    if (G.danceAt != null) {
      if (b >= G.danceAt + 8 && !G.finished) { G.finished = true; at(t, finishRegion); }
      return;
    }
    // 次 の あそびかた の まえおき（小節 の あたま から 4拍）
    if (G.introAt === 'next') {
      if (b % 4 !== 0) return;
      G.pi++;
      if (G.pi >= G.phases.length) { startDance(b, t); return; }
      G.phase = G.phases[G.pi];
      G.introAt = b;
      G.state = 'intro';
      const ph = G.phase;
      at(t, () => showIntro(ph));
      return;
    }
    if (G.state === 'intro') {
      const k = b - G.introAt;
      if (k === 2 || k === 3) Sound.se('count', t);
      if (k >= 4) {
        at(t, hideIntro);
        G.phaseBeat0 = b;
        setupPhase(b);
      } else return;
    }
    const ph = G.phase;
    if (ph === 'kiku' || ph === 'mlisten') return kikuBeat(b, t);
    if (G.state === 'idle' && b >= G.nextCall) {
      if (!G.queue.length) { endPhase(); return; }
      call(b, t);
    } else if (G.state === 'await' && G.deadline != null && b >= G.deadline) {
      timeout(b, t);
    }
  }

  function setupPhase(b) {
    const ph = G.phase;
    G.done = 0;
    G.state = 'idle';
    G.nextCall = b;
    G.misses = 0;
    G.cur = 0;
    MapView.clearPops();
    MapView.clearMarks('is-glow');
    MapView.clearMarks('is-hint');
    MapView.clearMarks('is-ok');
    MapView.clearMarks('is-miss');
    const colorAll = ph === 'kiku' || ph === 'mlisten';
    G.codes.forEach((c) => MapView.cls(c, 'is-color', colorAll));
    if (ph === 'kiku') G.queue = G.codes.concat(G.codes);
    else if (ph === 'mlisten' || ph === 'mtap') G.queue = G.codes.slice();
    else if (ph === 'mane') G.queue = shuffle(G.codes);
    else if (ph === 'test') G.queue = testQueue(G.codes);
    else if (ph === 'gyaku') G.queue = shuffle(G.codes);
    G.total = G.queue.length;
    $('btnSkip').classList.toggle('is-hidden', ph !== 'gyaku');
    $('hudPhase').textContent = `${PHASE_INFO[ph].icon} ${PHASE_INFO[ph].label}`;
    renderProgress();
  }

  // まちがえ が 多い 県 は テスト で 多め に 出す
  function testQueue(codes) {
    const base = shuffle(codes);
    const weak = codes.filter((c) => { const r = rec(c); return r.ng > r.ok || (r.ng > 0 && r.s < 2); })
      .sort((a, b) => (rec(b).ng - rec(b).ok) - (rec(a).ng - rec(a).ok)).slice(0, 3);
    const q = base.slice();
    weak.forEach((c) => {
      const lo = Math.ceil(q.length / 2);
      let pos = lo + Math.floor(Math.random() * (q.length - lo + 1));
      if (q[pos - 1] === c) pos = Math.min(q.length, pos + 1);
      q.splice(pos, 0, c);
    });
    return q;
  }

  function endPhase() {
    const ph = G.phase;
    G.state = 'idle';
    G.introAt = 'next';
    if (ph === 'test') evaluateSpeed();
    const last = G.cur;
    G.cur = 0;
    at(Sound.now(), () => {
      $('choices').innerHTML = '';
      $('btnSkip').classList.add('is-hidden');
      if (last) MapView.retract(last);
    });
    if (G.mode === 'medley') { finishMedley(); }
  }

  /* ---------- きく（と きく メドレー）: 2拍 で 1けん ---------- */

  function kikuBeat(b, t) {
    const rel = b - G.phaseBeat0;
    if (rel % 2 !== 0) return;
    const i = rel / 2;
    if (i >= G.queue.length) { endPhase(); return; }
    const c = G.queue[i];
    G.cur = c;
    followCamera(c, t);
    Sound.sayAt(speakText(c) + '！', t);
    Sound.se('pop', t);
    at(t, () => {
      MapView.clearMarks('is-glow');
      MapView.cls(c, 'is-glow', true);
      MapView.pop(c, 'happy');
      setBanner(nameHTML(c), `${P(c).short} ぴょこ`, true);
      G.done = i + 1;
      renderProgress();
    });
  }

  // メドレー は 県 の 地方 が かわったら カメラ と 曲 を つぎ の 地方 へ
  function followCamera(c, t) {
    if (G.mode !== 'medley') return;
    const rid = P(c).region;
    if (rid === G.camRegion) return;
    G.camRegion = rid;
    const r = regionOf(rid);
    Sound.changeSong(medleySong(r));
    at(t - G.bd * 1.5, () => {
      MapView.setView(r.view, Math.min(1200, G.bd * 1500));
      MapView.setMiniRegion(r.id, r.color);
      $('hudRegion').innerHTML = `🎶 ${r.emoji} ${regionNameHTML(r)}`;
    });
  }

  /* ---------- まねっこ・テスト・ぎゃく・タップ メドレー ---------- */

  function call(b, t) {
    const ph = G.phase;
    const c = G.queue[0];
    const again = c === G.cur;
    if (!again) { G.firstTry = true; G.misses = 0; }
    G.cur = c;
    G.callT = t;
    G.callBeat = b;
    G.state = 'calling';
    G.deadline = ph === 'gyaku' ? null : b + 4;
    followCamera(c, t);
    const hint = ph === 'mane' || (ph === 'test' && G.misses >= 2);
    if (ph !== 'gyaku') Sound.sayAt(speakText(c) + '！', t);
    else Sound.sayAt('これは どこ かな？', t);
    if (ph === 'mane' || ph === 'gyaku') Sound.se('pop', t);
    at(t, () => {
      if (!G || G.cur !== c) return;
      MapView.clearMarks('is-glow');
      MapView.clearMarks('is-hint');
      MapView.clearMarks('is-miss');
      if (ph === 'mane' || ph === 'gyaku') {
        MapView.cls(c, 'is-glow', true);
        MapView.pop(c, 'wow');
      } else if (hint) {
        MapView.cls(c, 'is-hint', true);
      }
      if (ph === 'gyaku') {
        setBanner('<span class="q">？</span>', 'ひかった けんは どれ？');
        renderChoices(c);
      } else {
        setBanner(nameHTML(c), ph === 'mane' ? 'ひかっている ところを タップ！' : 'どこかな？ タップ！', ph !== 'mane');
      }
      G.state = 'await';
    });
  }

  function nextCallAfter(gap) {
    // つぎ の よびだし は 2拍 ごと の くぎり に のせる
    let n = G.lastBeat + gap;
    if ((n - G.phaseBeat0) % 2) n++;
    G.nextCall = n;
  }

  function onMapTap(code, tapT) {
    if (!G || G.state !== 'await') return;
    const ph = G.phase;
    if (ph === 'gyaku' || ph === 'kiku' || ph === 'mlisten') return;
    if (code == null) return;
    Sound.se('tap');
    const c = G.cur;
    if (code === c) success(tapT);
    else wrong(code);
  }

  function grade(tapT) {
    const target = G.callT + 2 * G.bd;
    const dt = Math.abs(tapT - target) / G.bd;
    if (dt <= 0.25) return 'perfect';
    if (dt <= 0.55) return 'good';
    return 'ok';
  }

  function success(tapT) {
    const ph = G.phase;
    const c = G.cur;
    G.state = 'idle';
    G.queue.shift();
    G.done++;
    const r = rec(c);
    let g = null;
    if (ph === 'mane') {
      if (r.s < 1) { r.s = 1; G.gained[c] = true; }
      Sound.se('good');
    } else {
      g = grade(tapT);
      G.stat[g]++;
      G.stat.items++;
      if (G.firstTry) {
        G.stat.first++;
        r.ok++;
        const ns = Math.min(3, Math.max(1, r.s) + 1);
        if (ns > r.s) G.gained[c] = true;
        r.s = ns;
      }
      if (G.mode === 'medley' && G.firstTry) G.score++;
      Sound.se(g);
    }
    persist();
    MapView.clearMarks('is-glow');
    MapView.clearMarks('is-hint');
    MapView.cls(c, 'is-color', true);
    MapView.pop(c, 'happy');
    MapView.bounce(c, true);
    if (ph === 'test' || ph === 'mtap') Sound.say(speakText(c) + '！', { rate: 1.2 });
    showJudge(g ? { perfect: 'ぴったり！', good: 'いいね！', ok: 'おしい！' }[g] : 'できた！', g || 'good');
    setBanner(nameHTML(c), `${P(c).short} ぴょこ「やったー！」`);
    renderProgress();
    nextCallAfter(2);
  }

  function wrong(code) {
    const ph = G.phase;
    const c = G.cur;
    Sound.se('miss');
    MapView.cls(code, 'is-miss', true);
    setTimeout(() => MapView.cls(code, 'is-miss', false), 500);
    if (ph === 'mane') {
      // まねっこ は れんしゅう。ヒント を つよく して そのまま まつ
      MapView.cls(c, 'is-hint', true);
      MapView.setMood(c, 'wow');
      setBanner(nameHTML(c), 'ひかっている ところだよ');
      return;
    }
    missItem(c);
  }

  function timeout(b, t) {
    const ph = G.phase;
    const c = G.cur;
    if (ph === 'mane') {
      MapView.cls(c, 'is-hint', true);
      call(b, t); // もう いちど よぶ
      return;
    }
    at(t, () => Sound.se('miss'));
    missItem(c);
  }

  // テスト で まちがえた / まにあわなかった: その 県 を やさしく 光らせて、もう1回 同じ 県
  function missItem(c) {
    const ph = G.phase;
    G.state = 'idle';
    if (G.firstTry) {
      rec(c).ng++;
      if (rec(c).s > 1) rec(c).s--;
      persist();
      G.stat.miss++;
    }
    G.firstTry = false;
    G.misses++;
    MapView.cls(c, 'is-hint', true);
    MapView.retract(c);
    showJudge('ここだよ', 'miss');
    setBanner(nameHTML(c), `${P(c).short} は ここ！`);
    if (ph === 'mtap') {
      // メドレー は 曲 を とめない。光らせて つぎ へ
      G.queue.shift();
      G.done++;
      MapView.cls(c, 'is-color', true);
      renderProgress();
      nextCallAfter(2);
      return;
    }
    nextCallAfter(3);
  }

  /* ---------- ぎゃく: 3つ の ボタン ---------- */

  function renderChoices(c) {
    const others = shuffle(G.codes.filter((x) => x !== c)).slice(0, 2);
    const opts = shuffle([c].concat(others));
    $('choices').innerHTML = opts.map((x) =>
      `<button class="choice" data-code="${x}">${P(x).short}<small>${P(x).suffix}</small></button>`).join('');
  }
  $('choices').addEventListener('click', (e) => {
    const b = e.target.closest('.choice');
    if (!b || !G || G.phase !== 'gyaku' || G.state !== 'await' || b.disabled) return;
    const code = +b.getAttribute('data-code');
    const c = G.cur;
    if (code === c) {
      G.state = 'idle';
      G.queue.shift();
      G.done++;
      const r = rec(c);
      if (G.firstTry) {
        r.ok++;
        if (r.s >= 1 && r.s < 3) { r.s++; G.gained[c] = true; }
        if (r.s < 1) r.s = 1;
      }
      persist();
      b.classList.add('is-ok');
      Sound.se('good');
      Sound.say(speakText(c) + '！');
      MapView.cls(c, 'is-color', true);
      MapView.pop(c, 'happy');
      MapView.bounce(c, true);
      showJudge('せいかい！', 'good');
      setBanner(nameHTML(c), `${P(c).short} ぴょこ「あたり！」`);
      renderProgress();
      nextCallAfter(2);
      setTimeout(() => { if (G && G.phase === 'gyaku' && G.state !== 'await') $('choices').innerHTML = ''; }, 700);
    } else {
      G.firstTry = false;
      rec(c).ng++;
      persist();
      b.disabled = true;
      b.classList.add('is-ng');
      Sound.se('miss');
    }
  });
  $('btnSkip').addEventListener('click', () => {
    if (!G || G.phase !== 'gyaku') return;
    Sound.se('click');
    G.queue = [];
    G.state = 'idle';
    G.nextCall = 0;
  });

  /* ---------- 表示 ---------- */

  function setBanner(main, sub, beatPulse) {
    $('bnName').innerHTML = main;
    $('bnSub').textContent = sub || '';
    const bn = $('banner');
    bn.classList.remove('is-pulse');
    if (beatPulse) { void bn.offsetWidth; bn.classList.add('is-pulse'); }
  }
  function showJudge(text, kind) {
    const j = $('judge');
    j.innerHTML = `<span class="jg jg-${kind}">${text}</span>`;
  }
  function showIntro(ph) {
    const info = PHASE_INFO[ph];
    const it = $('intro');
    it.innerHTML = `<div class="intro-card"><div class="intro-icon">${info.icon}</div><div class="intro-title">${info.title}</div><div class="intro-help">${info.help}</div><div class="intro-count">♪ ♪ ♪ ♪</div></div>`;
    it.classList.add('is-on');
    $('hudPhase').textContent = `${info.icon} ${info.label}`;
    setBanner('', '');
    $('progress').innerHTML = '';
  }
  function hideIntro() { $('intro').classList.remove('is-on'); }
  function renderProgress() {
    if (!G) return;
    const n = G.total, d = Math.min(G.done, n);
    if (n > 16) {
      $('progress').innerHTML = `<div class="pbar"><i style="width:${(d / n) * 100}%"></i></div><span>${d} / ${n}</span>`;
    } else {
      $('progress').innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < d ? 'is-done' : ''}"></i>`).join('');
    }
  }

  /* ---------- 上達 したら すこし はやく ---------- */

  function evaluateSpeed() {
    if (G.mode !== 'region' || !S.auto) return;
    const acc = G.stat.items ? G.stat.first / G.stat.items : 0;
    const timing = G.stat.items ? (G.stat.perfect + G.stat.good) / G.stat.items : 0;
    const id = G.region.id;
    if (acc >= 0.85 && timing >= 0.6 && (save.speed[id] || 0) < SPEEDUP_MAX) {
      save.speed[id] = (save.speed[id] || 0) + SPEEDUP_STEP;
      G.spedUp = true;
      Sound.changeTempo(Sound.bpm() + SPEEDUP_STEP);
      persist();
    }
  }

  /* ---------- クリア ---------- */

  function startDance(b, t) {
    G.danceAt = b;
    G.state = 'dance';
    Sound.se('fanfare', t);
    Sound.sayAt('やったね！ クリア！', t);
    at(t, () => {
      MapView.clearPops();
      setBanner('🎉 クリア！', 'ぴょこたちが おどっているよ');
      $('hudPhase').textContent = '🎉 ダンス';
      $('choices').innerHTML = '';
      const d = $('dance');
      d.innerHTML = `<div class="dance-row">${G.codes.map((c, i) =>
        `<span class="dancer" style="--i:${i}">${Pyoko.svg(c, i % 2 ? 'genki' : 'happy')}</span>`).join('')}</div>`;
      d.classList.add('is-on');
    });
  }

  function finishRegion() {
    if (!G) return;
    const r = G.region;
    save.cleared[r.id] = true;
    persist();
    const spedUp = G.spedUp;
    const gained = G.gained;
    const st = G.stat;
    Sound.stop();
    G = null;
    go('clear');
    $('clearTitle').innerHTML = `${r.emoji} ${regionNameHTML(r)} クリア！`;
    const allClear = REGIONS.every((x) => save.cleared[x.id]);
    $('clearMsg').innerHTML =
      `ぴったり ${st.perfect}　いいね ${st.good}　おしい ${st.ok}` +
      (spedUp ? '<br>🐇 じょうずに なったので つぎは すこし はやく なるよ' : '') +
      (allClear ? '<br>🎶 ぜんこく メドレーが あそべるよ！' : '');
    $('clearPyokos').innerHTML = r.codes.map((c) =>
      `<div class="cp ${stars(c) >= 3 ? 'is-gold' : ''}">${Pyoko.svg(c, Pyoko.moodFor(stars(c)))}
       <b>${nameHTML(c)}</b><span class="st">${starStr(stars(c))}${gained[c] ? ' <em>UP</em>' : ''}</span></div>`).join('');
    const idx = REGIONS.indexOf(r);
    const next = REGIONS[(idx + 1) % REGIONS.length];
    $('clearBtns').innerHTML =
      `<button class="btn btn-main" data-again="${r.id}">🔁 もういちど</button>` +
      (allClear ? '<button class="btn btn-main btn-gold" data-go="select">🎶 メドレーへ</button>' : '') +
      `<button class="btn btn-sub" data-again="${next.id}">▶ つぎ: ${regionNameHTML(next)}</button>` +
      '<button class="btn btn-sub" data-go="select">🗾 ちほうを えらぶ</button>';
  }
  $('clearBtns').addEventListener('click', (e) => {
    const b = e.target.closest('[data-again]');
    if (b) startRegion(b.getAttribute('data-again'));
  });

  function finishMedley() {
    const kind = G.kind;
    const score = G.score;
    G.state = 'dance';
    G.danceAt = Infinity;
    const t = Sound.now() + 0.1;
    Sound.se('fanfare', t);
    setTimeout(() => {
      if (!G) return;
      Sound.stop();
      G = null;
      if (kind === 'tap') save.medley.best = Math.max(save.medley.best || 0, score);
      save.medley.done = (save.medley.done || 0) + 1;
      persist();
      go('clear');
      $('clearTitle').textContent = '🎶 ぜんこく メドレー おしまい！';
      $('clearMsg').innerHTML = kind === 'tap' ? `47けんの うち ${score}けん いっぱつで タップ できたよ！` : '47けん ぜんぶ きけたね！';
      const picks = [1, 13, 26, 34, 37, 40, 47];
      $('clearPyokos').innerHTML = picks.map((c) =>
        `<div class="cp">${Pyoko.svg(c, 'genki')}<b>${nameHTML(c)}</b></div>`).join('');
      $('clearBtns').innerHTML = '<button class="btn btn-sub" data-go="select">🗾 ちほうを えらぶ</button>';
    }, 1600);
  }

  /* ---------- rAF: 時刻 に なった できごと を おこす ---------- */

  function loop() {
    if (events.length) {
      const now = Sound.now() - Sound.latency();
      events.sort((a, b) => a.t - b.t);
      while (events.length && events[0].t <= now) {
        const e = events.shift();
        try { e.fn(); } catch (err) { console.error(err); }
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ================= ずかん ================= */

  function renderZukan() {
    let gold = 0;
    $('zukanList').innerHTML = REGIONS.map((r) => `
      <h3 class="zk-head" style="--rc:${r.color}">${r.emoji} ${regionNameHTML(r)}</h3>
      <div class="zk-grid">${r.codes.map((c) => {
        const s = stars(c);
        if (s >= 3) gold++;
        return `<button class="zk ${s >= 3 ? 'is-gold' : ''} ${s === 0 ? 'is-new' : ''}" data-code="${c}">
          ${Pyoko.svg(c, Pyoko.moodFor(s))}
          <b>${nameHTML(c)}</b><small>${P(c).short} ぴょこ</small><span class="st">${starStr(s)}</span></button>`;
      }).join('')}</div>`).join('');
    $('zukanCount').textContent = `きんいろ ${gold} / 47`;
  }
  $('zukanList').addEventListener('click', (e) => {
    const b = e.target.closest('.zk');
    if (!b) return;
    const c = +b.getAttribute('data-code');
    b.classList.remove('is-jump');
    void b.offsetWidth;
    b.classList.add('is-jump');
    b.querySelector('.pyoko-svg').outerHTML = Pyoko.svg(c, 'happy');
    Sound.se('pop');
    Sound.say(`${speakText(c)}！ ${P(c).short} ぴょこ だよ`);
    if (!Sound.hasVoice() || S.mute) showToast(`${P(c).short} ぴょこ だよ！`);
  });

  function showToast(text) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = text;
    t.classList.remove('is-on');
    void t.offsetWidth;
    t.classList.add('is-on');
  }

  /* ================= おうちの かたへ ================= */

  function renderParent() {
    const rows = REGIONS.map((r) => {
      const got = r.codes.reduce((n, c) => n + stars(c), 0);
      const max = r.codes.length * 3;
      const yet = r.codes.filter((c) => stars(c) < 2);
      return `<div class="pr-row">
        <div class="pr-name">${r.emoji} ${r.kanji}（${r.name}）${save.cleared[r.id] ? ' ✅' : ''}</div>
        <div class="pbar"><i style="width:${(got / max) * 100}%;background:${r.color}"></i></div>
        <div class="pr-num">★${got} / ${max}</div>
        <div class="pr-yet">${yet.length ? 'まだ: ' + yet.map((c) => `${P(c).name}<small>（★${stars(c)}・まちがい${rec(c).ng}）</small>`).join('、') : 'ぜんぶ ★2 いじょう！'}</div>
      </div>`;
    }).join('');
    let three = 0, zero = 0;
    for (let c = 1; c <= 47; c++) { if (stars(c) >= 3) three++; if (stars(c) === 0) zero++; }
    $('parentBody').innerHTML = `
      <p class="pr-lead">都道府県を はじめて おぼえる お子さま向けに、<b>名前と位置</b>だけに しぼった リズム あそびです。
      県の 形・県庁所在地・名産などは つぎの アプリ（しろっとクイズ／日本地理たんけん）で。</p>
      <div class="pr-sum">★3: <b>${three}</b>県　まだ★0: <b>${zero}</b>県　ぜんぶで ★${totalStars()} / 141</div>
      ${rows}
      <h3>おぼえ度（★）の きまり</h3>
      <ul class="pr-rule">
        <li>★1 … まねっこ で 光った 県を タップできた</li>
        <li>★2・★3 … リズムテスト・ぎゃく問題で 1回目に 正解（まちがえると 1つ もどる）</li>
        <li>まちがいが 多い 県は、つぎの リズムテストで 多めに 出ます</li>
        <li>テストで よく できると、その地方の テンポが 少しずつ 上がります（せっていで オフ にできます）</li>
      </ul>
      <p class="pr-lead">全47都道府県 無料・課金や 広告は ありません。記録は この 端末の ブラウザ（localStorage）だけに 保存されます。
      こえ は 端末の 読み上げ機能（日本語の 声）を つかいます。声が ない 端末では 県名を 大きく 文字で 出します。</p>
      <button class="btn btn-sub btn-small" id="btnReset">🗑 きろくを けす</button>`;
    $('btnReset').addEventListener('click', () => {
      if (!confirm('ぴょこっと にっぽん リズム の きろく（★・クリア）を ぜんぶ けしますか？')) return;
      save.prefs = {};
      save.cleared = {};
      save.speed = {};
      save.medley = { best: 0, done: 0 };
      persist();
      renderParent();
    });
  }

  /* ================= せってい ================= */

  function renderSettings() {
    const tog = (k, label) => `<label class="set-row"><span>${label}</span><input type="checkbox" data-set="${k}" ${S[k] ? 'checked' : ''}></label>`;
    const sl = (k, label) => `<label class="set-row"><span>${label}</span><input type="range" min="0" max="100" value="${Math.round(S.vol[k] * 100)}" data-vol="${k}"></label>`;
    $('settingsBody').innerHTML = `
      <h3>🎵 おと</h3>
      ${tog('mute', '🔇 まとめて ミュート')}
      ${sl('bgm', '🎶 おんがく')}
      ${sl('voice', '🗣️ こえ')}
      ${sl('se', '✨ こうかおん')}
      <p class="set-note">${Sound.hasVoice() ? '' : '※ この たんまつ では にほんごの こえが つかえないので、なまえを おおきな もじで だします。'}</p>
      <h3>🥁 はやさ</h3>
      <div class="tempo-row">${Object.keys(TEMPOS).map((k) =>
        `<button class="chip ${S.tempo === k ? 'is-on' : ''}" data-tempo="${k}">${TEMPO_LABEL[k]}</button>`).join('')}</div>
      ${tog('auto', '🐇 じょうずに なったら すこし はやく')}
      <h3>📖 もじ</h3>
      ${tog('kanji', '漢字（かんじ）＋ふりがな で だす')}
      ${tog('gyaku', '🔤 ぎゃく もんだい（もじを よむ）も あそぶ')}
      <button class="btn btn-sub btn-small" id="btnTestVoice">🗣️ こえを ためす</button>`;
  }
  $('settingsBody').addEventListener('input', (e) => {
    const v = e.target.getAttribute('data-vol');
    if (v) { S.vol[v] = e.target.value / 100; applySound(); persist(); }
  });
  $('settingsBody').addEventListener('change', (e) => {
    const k = e.target.getAttribute('data-set');
    if (k) { S[k] = e.target.checked; applySound(); persist(); }
  });
  $('settingsBody').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tempo]');
    if (t) { S.tempo = t.getAttribute('data-tempo'); persist(); renderSettings(); Sound.se('click'); }
    if (e.target.id === 'btnTestVoice') { Sound.unlock(); Sound.se('ok'); Sound.say('あおもり！ おおいた！ おかやま！'); }
  });

  /* ================= はじまり ================= */

  Geo.init();
  applySound();
  setTimeout(applySound, 1700); // こえ の 一覧 は あとから とどく
  renderTitle();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') go('select');
  });

  // 自動テスト・デバッグ 用（あそび には つかわない）
  window.__pyoko = {
    state: () => (G ? { mode: G.mode, phase: G.phase, state: G.state, cur: G.cur, done: G.done, total: G.total,
      toTarget: G.callT + 2 * G.bd - (Sound.now() - Sound.latency()), stat: G.stat } : { screen }),
    center: (c) => MapView.centerOnScreen(c),
    hitAt: (x, y) => MapView.hitAt(x, y),
    startRegion,
    startMedley,
    regions: () => REGIONS.map((r) => ({ id: r.id, codes: r.codes })),
    save: () => JSON.parse(JSON.stringify(save)),
    screen: () => screen,
  };
})();
