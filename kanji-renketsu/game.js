'use strict';

/* かんじ れんけつ - あそび の しくみ
 *   🔗 おだい モード（学年 ごと の ステージ）・はっけん モード
 *   🚉 えきめい を つくろう
 *   🚌 2かいだて 車両
 *
 *  ロジック だけ の 関数（Game.odaiCars / hakkenSet / slotCars …）は DOM を つかわない。
 *  tools/kanji-renketsu/check.js が node で よんで、全駅 で 駅名 が 完成 できる か しらべる。
 */

const Game = (() => {
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const uniq = (a) => Array.from(new Set(a));
  function shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  }

  /* ---------------- ステージ ---------------- */
  const STATION_CHARS = (() => {
    const s = new Set();
    LINES.forEach((l) => l.stations.forEach(([n]) => Array.from(n).forEach((c) => s.add(c))));
    return s;
  })();
  const STAGES = [
    { id: 'g1', name: '1ねんせい', emoji: '🌱', pool: KANJI_LR.filter((e) => e.g === 1), cars: 4 },
    { id: 'g2', name: '2ねんせい', emoji: '🌿', pool: KANJI_LR.filter((e) => e.g === 2), cars: 5 },
    { id: 'g3', name: '3ねんせい', emoji: '🌳', pool: KANJI_LR.filter((e) => e.g === 3), cars: 6 },
    { id: 'eki', name: 'えきめい の じ', emoji: '🚉', pool: KANJI_LR.filter((e) => STATION_CHARS.has(e.k)), cars: 6 },
  ];
  const ROUND = 5;

  const EASY = KANJI_LR.filter((e) => e.g <= 3);
  const ALL_L = uniq(KANJI_LR.map((e) => e.a));
  const ALL_R = uniq(KANJI_LR.map((e) => e.b));
  const EASY_L = uniq(EASY.map((e) => e.a));
  const EASY_R = uniq(EASY.map((e) => e.b));

  // Ls × Rs の なか で できる 漢字（データ ぜんぶ から かぞえる）
  function pairsIn(Ls, Rs, table) {
    const out = [];
    Ls.forEach((l) => Rs.forEach((r) => { const e = (table || PAIR_LR)[l + '+' + r]; if (e) out.push(e); }));
    return out;
  }

  // おだい: 正しい 2両 ＋ まぎらわしい 車両。ほか の くみあわせ で は 漢字 が できない ように えらぶ
  function odaiCars(target, nCars, table, poolA, poolB) {
    table = table || PAIR_LR;
    poolA = poolA || EASY_L; poolB = poolB || EASY_R;
    const extra = Math.max(0, nCars - 2);
    const nA = Math.ceil(extra / 2), nB = extra - nA;
    for (let tries = 0; tries < 400; tries++) {
      const As = uniq([target.a].concat(shuffle(poolA.filter((x) => x !== target.a)).slice(0, nA)));
      const Bs = uniq([target.b].concat(shuffle(poolB.filter((x) => x !== target.b)).slice(0, nB)));
      if (As.length !== nA + 1 || Bs.length !== nB + 1) continue;
      const ps = pairsIn(As, Bs, table);
      if (ps.length === 1 && ps[0].k === target.k) return { A: As, B: Bs };
    }
    return { A: [target.a], B: [target.b] };
  }

  // はっけん: へん 3両・つくり 4両。できる 漢字 は 3〜6こ
  function hakkenSet() {
    const pool = EASY;
    const henCount = {};
    pool.forEach((e) => { henCount[e.a] = (henCount[e.a] || 0) + 1; });
    const hens = Object.keys(henCount).filter((h) => henCount[h] >= 2 && HEN[h]);
    for (let tries = 0; tries < 2000; tries++) {
      const Ls = shuffle(hens).slice(0, 3);
      const cand = uniq(pool.filter((e) => Ls.includes(e.a)).map((e) => e.b));
      if (cand.length < 4) continue;
      const Rs = shuffle(cand).slice(0, 4);
      const ps = pairsIn(Ls, Rs);
      const usedL = uniq(ps.map((e) => e.a)).length;
      if (ps.length >= 3 && ps.length <= 6 && usedL >= 2) return { L: Ls, R: Rs, answers: ps };
    }
    const fb = ['木', '氵', '亻'], fr = ['交', '毎', '寸', '木'];
    return { L: fb, R: fr, answers: pairsIn(fb, fr) };
  }

  // 駅名 の 1字 の 車両。わけられる 字 は へん＋つくり（＋ まぎらわしい 2両）、ほか は「そのまま 1両」
  function slotCars(c) {
    const e = LR_BY[c];
    if (e) {
      const sel = odaiCars(e, 4, PAIR_LR, ALL_L, ALL_R);
      return { kind: 'lr', e, A: sel.A, B: sel.B };
    }
    return { kind: 'single', ch: c };
  }
  function stationSlots(name) {
    return Array.from(name).map((c) => (U_isKanji(c) ? { c, filled: false } : { c, fixed: true }));
  }
  function U_isKanji(c) { return /[一-鿿㐀-䶿]/.test(c); }

  /* ================================================================ */
  /*                           画面 まわり                             */
  /* ================================================================ */
  let yard = null;
  let play = null;  // いま の あそび

  function $(s) { return document.querySelector(s); }
  function msg(html, cls) {
    const m = $('#msg');
    m.className = 'msg' + (cls ? ' ' + cls : '');
    m.innerHTML = html ? `<span>${html}</span>` : '';
  }
  function ensureYard() {
    if (yard) return yard;
    yard = Train.yard($('#yard'), {
      onPair: (a, b) => (play && play.pair ? play.pair(a, b) : Promise.resolve()),
      onSingle: (c) => (play && play.single ? play.single(c) : Promise.resolve()),
      onSelect: (el) => {
        if (!play || !play.selectHint) return;
        if (el) msg(play.selectHint(el), 'hint');
        else if (play.idleMsg) msg(play.idleMsg());
      },
    });
    return yard;
  }
  function openPlay(title, back, mode) {
    ensureYard();
    App.go('play');
    $('#screen-play').dataset.mode = mode;
    $('#play-title').textContent = title;
    $('#play-back').onclick = () => { Sound.play('tap'); play = null; App.go(back); };
    $('#shelf').innerHTML = '';
    $('#play-tools').innerHTML = '';
    $('#prompt').innerHTML = '';
    msg('');
  }
  function lrSides(a, b) {
    return a.dataset.role === 'L' || a.dataset.role === 'T' ? [a, b] : [b, a];
  }
  const HOWTO = 'しゃりょう を ドラッグ して くっつけるか、<b>タップ → タップ</b> で れんけつ！';

  /* ---------------- パズル の メニュー ---------------- */
  function renderPuzzleMenu() {
    const g = $('#stage-grid');
    g.innerHTML = STAGES.map((s) => {
      const clear = Store.d.stages[s.id];
      return `<button class="stage-btn${clear ? ' clear' : ''}" type="button" data-stage="${s.id}">
        <span class="st-emoji">${s.emoji}</span><span class="st-name">${s.name}</span>
        <span class="st-sub">${s.pool.length}じ から ${Math.min(ROUND, s.pool.length)}もん</span>
        <span class="st-star">${clear ? '⭐ クリア' : '☆'}</span></button>`;
    }).join('');
    g.querySelectorAll('[data-stage]').forEach((b) => b.addEventListener('click', () => { Sound.play('tap'); startOdai(b.dataset.stage); }));
    $('#hakken-count').textContent = Store.d.hakken ? `（${Store.d.hakken}かい クリア）` : '';
  }

  /* ---------------- おだい モード ---------------- */
  function startOdai(stageId, vertical) {
    const st = vertical ? NIKAI_STAGE : STAGES.find((s) => s.id === stageId);
    const qs = vertical ? nikaiQuestions() : shuffle(st.pool).slice(0, Math.min(ROUND, st.pool.length));
    let i = 0;
    let misses = 0;
    openPlay(vertical ? '🚌 2かいだて しゃりょう' : `🎯 おだい（${st.name}）`, vertical ? 'title' : 'puzzle', vertical ? 'nikai' : 'odai');

    function show() {
      const e = qs[i];
      $('#play-prog').textContent = `${i + 1}/${qs.length}`;
      const furi = `<span class="odai-yomi">${U.ruby(e.ex.w, e.ex.y)}</span>`;
      $('#prompt').innerHTML = `<div class="odai">
          <div class="odai-target" data-target="${e.k}" lang="ja">${e.k}</div>
          <div class="odai-text"><b>「${e.k}」を つくろう！</b><br>${furi} の 「${e.k}」</div></div>`;
      const sel = vertical
        ? odaiCars(e, st.cars, PAIR_TB, NIKAI_T, NIKAI_B)
        : odaiCars(e, st.cars);
      const roleA = vertical ? 'T' : 'L', roleB = vertical ? 'B' : 'R';
      const parts = shuffle(sel.A.map((ch) => ({ role: roleA, ch })).concat(sel.B.map((ch) => ({ role: roleB, ch }))));
      // うえ の 車両 を さき に ならべる（2かいだて）／ へん と つくり は まぜる
      if (vertical) parts.sort((p, q) => (p.role === q.role ? 0 : p.role === 'T' ? -1 : 1));
      yard.set(parts);
      msg(HOWTO);
    }
    play = {
      idleMsg: () => HOWTO,
      selectHint: (el) => `「${el.dataset.ch}」を えらんだよ。つぎ は ${{ L: 'つくり（みぎ）', R: 'へん（ひだり）', T: 'した', B: 'うえ' }[el.dataset.role]} の しゃりょう を タップ！`,
      async pair(a, b) {
        const [L, R] = lrSides(a, b);
        const e = qs[i];
        const table = vertical ? PAIR_TB : PAIR_LR;
        const got = table[L.dataset.ch + '+' + R.dataset.ch];
        if (got && got.k === e.k) {
          msg('');
          await Train.couple(a, b, e.k, vertical);
          Sound.play('ok');
          const first = App.made(e.k);
          await App.showKanji(e, { first });
          i++;
          if (i < qs.length) { show(); return; }
          // クリア
          if (vertical) Store.d.nikai = (Store.d.nikai || 0) + 1;
          else Store.d.stages[st.id] = 'clear';
          Store.save();
          App.showClear({
            emoji: misses === 0 ? '🏆' : '🎉',
            title: vertical ? '2かいだて クリア！' : `${st.name} ステージ クリア！`,
            text: `${qs.length}この かんじ を つくったよ${misses === 0 ? '。ノーミス！' : ''}`,
            buttons: [
              { label: 'もういちど', fn: () => startOdai(stageId, vertical) },
              { label: vertical ? 'タイトル へ' : 'メニュー へ', fn: () => { play = null; App.go(vertical ? 'title' : 'puzzle'); } },
            ],
          });
          return;
        }
        misses++;
        msg(got ? `それは「${got.k}」。おだい は「${e.k}」だよ` : 'ぷしゅー… その くみあわせ では かんじ に ならないよ', 'ng');
        await Train.reject(a, b);
      },
    };
    show();
  }

  /* ---------------- はっけん モード ---------------- */
  function startHakken() {
    const set = hakkenSet();
    const found = new Set();
    openPlay('🔍 はっけん モード', 'puzzle', 'hakken');
    $('#play-prog').textContent = '';
    const left = () => set.answers.length - found.size;
    function head() {
      $('#prompt').innerHTML = `<div class="hakken-head">
        <div class="hk-left" data-left="${left()}">のこり <b>${left()}</b> こ</div>
        <div class="hk-text">この しゃりょう で つくれる かんじ を ぜんぶ さがそう！</div></div>`;
    }
    head();
    yard.set(set.L.map((ch) => ({ role: 'L', ch })).concat(set.R.map((ch) => ({ role: 'R', ch }))));
    msg(HOWTO);
    const tools = $('#play-tools');
    tools.innerHTML = '<button class="pill" id="hk-hint" type="button">💡 ヒント</button>';
    $('#hk-hint').onclick = () => {
      const rest = set.answers.filter((e) => !found.has(e.k));
      if (!rest.length) return;
      const e = rnd(rest);
      const el = document.querySelector(`#yard .car[data-role="L"][data-ch="${e.a}"]`);
      if (el) { el.classList.add('glow'); setTimeout(() => el.classList.remove('glow'), 1800); }
      msg(`ヒント：「${e.a}」${HEN[e.a] ? '（' + henLabel(e.a) + '）' : ''} を つかう かんじ が まだ あるよ`, 'hint');
    };
    play = {
      idleMsg: () => HOWTO,
      selectHint: (el) => `「${el.dataset.ch}」を えらんだよ。${el.dataset.role === 'L' ? 'つくり' : 'へん'} を タップ！`,
      async pair(a, b) {
        const [L, R] = lrSides(a, b);
        const e = PAIR_LR[L.dataset.ch + '+' + R.dataset.ch];
        if (!e) { msg('ぷしゅー… その くみあわせ では かんじ に ならないよ', 'ng'); await Train.reject(a, b); return; }
        if (found.has(e.k)) { Sound.play('ng'); msg(`「${e.k}」は もう みつけたよ！ ほか を さがそう`, 'hint'); return; }
        await Train.couple(a, b, e.k, false);
        found.add(e.k);
        const first = App.made(e.k);
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'found-chip';
        chip.lang = 'ja';
        chip.textContent = e.k;
        chip.onclick = () => App.showKanji(e, { nextLabel: 'とじる' });
        $('#shelf').appendChild(chip);
        head();
        await App.showKanji(e, { first });
        if (left() === 0) {
          Store.d.hakken = (Store.d.hakken || 0) + 1;
          Store.save();
          App.showClear({
            emoji: '🔍', title: 'ぜんぶ はっけん！',
            text: `${set.answers.map((x) => x.k).join('・')} の ${set.answers.length}こ を みつけたよ`,
            buttons: [
              { label: 'つぎ の もんだい', fn: startHakken },
              { label: 'メニュー へ', fn: () => { play = null; App.go('puzzle'); } },
            ],
          });
        } else msg(`やったね！ のこり ${left()} こ`);
      },
    };
  }

  /* ---------------- 2かいだて ---------------- */
  const NIKAI_POOL = KANJI_TB.filter((e) => e.g <= 4);
  const NIKAI_T = uniq(KANJI_TB.map((e) => e.a));
  const NIKAI_B = uniq(KANJI_TB.map((e) => e.b));
  const NIKAI_STAGE = { id: 'nikai', name: '2かいだて', cars: 5 };
  function nikaiQuestions() {
    const easy = shuffle(NIKAI_POOL.filter((e) => e.g <= 2));
    const more = shuffle(NIKAI_POOL.filter((e) => e.g > 2));
    return easy.slice(0, 3).concat(more.slice(0, 3));
  }
  function startNikai() { startOdai('nikai', true); }

  /* ---------------- 駅名 を つくろう ---------------- */
  function lineState(id) {
    const L = Store.d.lines;
    if (!L[id]) L[id] = { next: 0, stamps: [], clear: false };
    return L[id];
  }
  function renderLines() {
    const g = $('#line-grid');
    g.innerHTML = LINES.map((l) => {
      const s = Store.d.lines[l.id] || { next: 0, stamps: [] };
      const nx = l.stations[Math.min(s.next || 0, l.stations.length - 1)];
      const sub = s.clear ? '🏁 クリア！ もういちど あそべるよ' : (s.next ? `つづき：${nx[1]} から` : `${l.stations[0][1]} → ${l.stations[l.stations.length - 1][1]}`);
      return `<button class="line-btn" type="button" data-line="${l.id}" style="--line:${l.color};--lineink:${l.ink}">
        <span class="ln-sym">${U.esc(l.symbol)}</span>
        <span class="ln-body"><span class="ln-name">${U.ruby(l.name, l.yomi.replace(/ /g, ''))}</span>
        <span class="ln-sub">${U.esc(sub)}</span></span>
        <span class="ln-num">🎫 ${(s.stamps || []).length}/${l.stations.length}</span></button>`;
    }).join('');
    g.querySelectorAll('[data-line]').forEach((b) => b.addEventListener('click', () => { Sound.play('tap'); startLine(b.dataset.line); }));
  }

  function startLine(id) {
    const line = LINES.find((l) => l.id === id);
    const ls = lineState(id);
    if (ls.clear && ls.next >= line.stations.length) ls.next = 0;
    if (ls.next >= line.stations.length) ls.next = 0;
    Store.save();
    openPlay(`🚉 ${line.name}`, 'lines', 'station');
    $('#screen-play').style.setProperty('--line-color', line.color);
    station(line, ls);
  }

  function boardHtml(line, idx, slots) {
    const [name, yomi] = line.stations[idx];
    const prev = idx > 0 ? line.stations[idx - 1] : null;
    const next = idx < line.stations.length - 1 ? line.stations[idx + 1] : null;
    const len = slots.length;
    const cls = len >= 7 ? ' xlong' : len >= 5 ? ' long' : '';
    const cells = slots.map((s, i) => s.fixed
      ? `<span class="slot fixed">${U.esc(s.c)}</span>`
      : `<span class="slot${s.filled ? ' filled' : ''}" data-i="${i}" lang="ja">${s.filled ? U.esc(s.c) : ''}</span>`).join('');
    return `<div class="board-track" aria-hidden="true"><div class="board-train" id="board-train">🚃</div></div>
      <div class="ekimei" style="--line-color:${line.color}">
        <div class="ekimei-sym" style="background:${line.color}">${U.esc(line.symbol)}${String(idx + 1).padStart(2, '0')}</div>
        <div class="ekimei-yomi">${U.esc(yomi)}</div>
        <div class="ekimei-name${cls}" data-name="${U.esc(name)}">${cells}</div>
        <div class="ekimei-neighbors"><span class="neighbor prev">${prev ? '◀ ' + U.esc(prev[0]) : ''}</span>
          <span class="neighbor next">${next ? U.esc(next[1]) + ' ▶' : 'しゅうてん'}</span></div>
        <div class="ekimei-bar"></div>
      </div>`;
  }

  function station(line, ls) {
    const idx = ls.next;
    const [name, yomi] = line.stations[idx];
    const slots = stationSlots(name);
    $('#play-prog').textContent = `${idx + 1}/${line.stations.length}えき`;
    $('#prompt').innerHTML = boardHtml(line, idx, slots);
    let cur = null;

    function nextSlot() {
      const i = slots.findIndex((s) => !s.fixed && !s.filled);
      document.querySelectorAll('#prompt .slot').forEach((el) => el.classList.toggle('current', Number(el.dataset.i) === i));
      if (i < 0) { arrive(); return; }
      const c = slots[i].c;
      cur = { i, c, info: slotCars(c) };
      const n = slots.filter((s) => !s.fixed).length;
      const k = slots.slice(0, i + 1).filter((s) => !s.fixed).length;
      if (cur.info.kind === 'lr') {
        const parts = shuffle(cur.info.A.map((ch) => ({ role: 'L', ch })).concat(cur.info.B.map((ch) => ({ role: 'R', ch }))));
        yard.set(parts);
        msg(`「${yomi}」の ${n > 1 ? k + 'もじめ' : 'かんじ'} を へん と つくり で つくろう！`);
      } else {
        yard.set([{ role: 'S', ch: c, label: 'そのまま 1りょう' }]);
        msg(`この じ は へん と つくり に わけられない「そのまま 1りょう」。タップ して れんけつ！`);
      }
    }
    function fill(i) {
      slots[i].filled = true;
      const el = document.querySelector(`#prompt .slot[data-i="${i}"]`);
      if (el) {
        el.textContent = slots[i].c;
        el.classList.add('filled', 'pop');
      }
    }
    async function arrive() {
      yard.set([]);
      msg(`えきめい が できた！「${name}」`, 'ok');
      Sound.play('bell');
      await Train.wait(900);
      const tr = document.getElementById('board-train');
      if (tr) tr.classList.add('arrive');
      Sound.play('run');
      await Train.wait(1300);
      Sound.play('chime');
      Sound.speak(`${yomi}。${yomi}。`);
      await Train.wait(700);
      // スタンプ
      if (!ls.stamps.includes(name)) ls.stamps.push(name);
      ls.next = idx + 1;
      const end = ls.next >= line.stations.length;
      if (end) ls.clear = true;
      Store.save();
      const ov = $('#stamp-ov');
      $('#stamp-yomi').textContent = yomi;
      $('#stamp-slot').innerHTML = App.stampHtml(line, name, 'stamp-card');
      $('#stamp-next').textContent = end ? 'しゅうてん！ ▶' : 'つぎ の えき へ ▶';
      ov.classList.add('is-active');
      requestAnimationFrame(() => { const s = document.querySelector('#stamp-slot .stamp'); if (s) s.classList.add('press'); });
      setTimeout(() => Sound.play('pon'), 380);
      await new Promise((r) => { $('#stamp-next').onclick = () => { ov.classList.remove('is-active'); r(); }; });
      if (!play) return;
      if (end) {
        App.showClear({
          emoji: '🏁', title: `${line.name} クリア！`,
          text: `しゅうてん まで ${line.stations.length}えき の スタンプ が たまったよ！`,
          buttons: [
            { label: 'スタンプちょう を みる', fn: () => { play = null; App.go('stamps'); } },
            { label: 'ろせん を えらぶ', fn: () => { play = null; App.go('lines'); } },
          ],
        });
        return;
      }
      station(line, ls);
    }

    play = {
      idleMsg: () => (cur && cur.info.kind === 'lr' ? HOWTO : 'そのまま 1りょう を タップ！'),
      selectHint: (el) => `「${el.dataset.ch}」を えらんだよ。${el.dataset.role === 'L' ? 'つくり' : 'へん'} を タップ！`,
      async pair(a, b) {
        const [L, R] = lrSides(a, b);
        const e = PAIR_LR[L.dataset.ch + '+' + R.dataset.ch];
        if (!cur || !e || e.k !== cur.c) {
          msg('ぷしゅー… その くみあわせ では この えき の かんじ に ならないよ', 'ng');
          await Train.reject(a, b);
          return;
        }
        await Train.couple(a, b, e.k, false);
        App.made(e.k);
        fill(cur.i);
        Sound.speak(e.ex.y);
        msg(`<b lang="ja">${e.k}</b> ＝ ${e.a}${HEN[e.a] ? '（' + henLabel(e.a) + '）' : ''} ＋ ${e.b}　${U.ruby(e.ex.w, e.ex.y)}`, 'ok');
        await Train.wait(900);
        nextSlot();
      },
      async single(c) {
        if (!cur || c.dataset.ch !== cur.c) { msg('ぷしゅー…', 'ng'); await Train.reject(c, null); return; }
        Sound.play('gachan');
        c.classList.add('go-board');
        await Train.wait(450);
        fill(cur.i);
        if (KANJI_BY[cur.c]) App.made(cur.c);
        await Train.wait(400);
        nextSlot();
      },
    };
    nextSlot();
  }

  if (typeof document !== 'undefined') {
    App.onShow.puzzle = renderPuzzleMenu;
    App.onShow.lines = renderLines;
    const hb = document.getElementById('btn-hakken');
    if (hb) hb.addEventListener('click', () => { Sound.play('tap'); startHakken(); });
  }

  return { STAGES, odaiCars, hakkenSet, slotCars, stationSlots, pairsIn, startOdai, startHakken, startNikai, startLine,
    NIKAI_POOL, nikaiQuestions };
})();
