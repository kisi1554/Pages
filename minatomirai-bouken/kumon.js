'use strict';
/* くもん みなとみらい きょうしつ（みなとみらいミッドスクエア 3かい）
   さんすうの プリント と しゅうりょうテスト。
   さんすう 3A → 2A → A（ひきざん）。テストに ごうかく（90てん いじょう）すると つぎが できる。
   こくご（ひらがな）・えいご は いつでも できる（えらんで タップ する プリント）。
   もんだいは この アプリの オリジナル（きょうざいの はんいを まねた れんしゅう）。 */
(function () {
  const KEY = 'minatomirai-bouken-kumon-v1';
  const PASS = 90, NEED = 3; // テストを うけるには 100てんの プリントが 3まい いる
  let K = { level: '3A', passed: [], done: {}, tests: [], water: 0 };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') K = Object.assign(K, s); } catch (e) { /* つかえない */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(K)); } catch (e) { /* つかえない */ } }

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const BOX = null;
  // --- もんだいの つくりかた ---
  const next = (lo, hi) => () => { const n = rnd(lo, hi - 1); return { t: [n, 'の つぎは', BOX], a: n + 1 }; };
  const seq = (lo, hi) => () => {
    const s = rnd(lo, hi - 4), p = rnd(1, 4), t = [];
    for (let i = 0; i < 5; i++) t.push(i === p ? BOX : s + i);
    return { t, a: s + p, row: true };
  };
  const add = (lo, hi, bs) => () => { const a = rnd(lo, hi), b = pick(bs); return { t: [a, '+', b, '=', BOX], a: a + b }; };
  const mix = (...gs) => () => pick(gs)();
  const sub = (hi, bs) => () => { const b = pick(bs), a = rnd(b, Math.max(b, hi)); return { t: [a, '−', b, '=', BOX], a: a - b }; };
  // えらぶ もんだい（こくご・えいご）: c = えらぶ ことば、a = こたえ
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const choose = (prompt, ans, pool, n) => { const o = shuffle(pool.filter((w) => w !== ans)).slice(0, (n || 3) - 1); return { t: prompt, a: ans, c: shuffle([ans].concat(o)) }; };
  const WORDS = [['🍎', 'りんご'], ['🐟', 'さかな'], ['🦀', 'かに'], ['🐱', 'ねこ'], ['🐶', 'いぬ'], ['🚌', 'ばす'], ['🍓', 'いちご'], ['🌸', 'さくら'], ['🐘', 'ぞう'], ['🦁', 'らいおん'],
    ['🍙', 'おにぎり'], ['⭐', 'ほし'], ['🌙', 'つき'], ['🍌', 'ばなな'], ['🐢', 'かめ'], ['🦒', 'きりん'], ['🍉', 'すいか'], ['🚢', 'ふね'], ['🌈', 'にじ'], ['🐰', 'うさぎ'], ['☂️', 'かさ'], ['🥚', 'たまご'], ['🐻', 'くま'], ['🍑', 'もも']];
  const GOJU = ['あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの', 'はひふへほ', 'まみむめも', 'らりるれろ'];
  const HIRA = GOJU.join('').split('');
  const wordPic = () => { const [e, w] = pick(WORDS); return choose([e, 'は なに？'], w, WORDS.map((x) => x[1])); };
  const firstMoji = () => { const [e, w] = pick(WORDS); return choose([e, w.replace(/^./, '？'), 'の ？は'], w[0], HIRA); };
  const gojuRow = () => { const r = pick(GOJU), k = rnd(0, 4); return choose([r.split('').map((m, i) => (i === k ? '？' : m)).join(' ')], r[k], HIRA); };
  const EN = {
    color: [['🔴', 'red', 'レッド'], ['🔵', 'blue', 'ブルー'], ['🟡', 'yellow', 'イエロー'], ['🟢', 'green', 'グリーン'], ['⚫', 'black', 'ブラック'], ['⚪', 'white', 'ホワイト'], ['🟣', 'purple', 'パープル'], ['🟠', 'orange', 'オレンジ']],
    animal: [['🐱', 'cat', 'キャット'], ['🐶', 'dog', 'ドッグ'], ['🦁', 'lion', 'ライオン'], ['🐘', 'elephant', 'エレファント'], ['🐟', 'fish', 'フィッシュ'], ['🐰', 'rabbit', 'ラビット'], ['🐻', 'bear', 'ベア'], ['🐦', 'bird', 'バード']],
    num: [['1', 'one', 'ワン'], ['2', 'two', 'トゥー'], ['3', 'three', 'スリー'], ['4', 'four', 'フォー'], ['5', 'five', 'ファイブ'], ['6', 'six', 'シックス'], ['7', 'seven', 'セブン'], ['8', 'eight', 'エイト'], ['9', 'nine', 'ナイン'], ['10', 'ten', 'テン']],
    food: [['🍎', 'apple', 'アップル'], ['🍌', 'banana', 'バナナ'], ['🍞', 'bread', 'ブレッド'], ['🥛', 'milk', 'ミルク'], ['🥚', 'egg', 'エッグ'], ['🍓', 'strawberry', 'ストロベリー'], ['🍊', 'orange', 'オレンジ'], ['🍪', 'cookie', 'クッキー']],
  };
  const en = (k) => () => { const L = EN[k], [e, w, y] = pick(L), lab = (x) => `${x[1]}<small>${x[2]}</small>`; const q = choose([k === 'num' ? `<span class="kdots">${'●'.repeat(+e)}</span>${e}` : e, 'は えいごで？'], lab([e, w, y]), L.map(lab)); return q; };

  const LEVELS = {
    '3A': {
      desc: 'かずを よむ・かく（〜120）と、+1・+2・+3 の たしざん',
      prints: [
        { id: '3A-1', title: 'つぎの かず（1〜50）', gen: next(1, 50) },
        { id: '3A-2', title: 'つぎの かず（50〜120）', gen: next(50, 120) },
        { id: '3A-3', title: 'かずの ならび（あなうめ）', gen: seq(1, 120) },
        { id: '3A-4', title: 'たしざん ＋1', gen: add(1, 10, [1]) },
        { id: '3A-5', title: 'たしざん ＋2', gen: add(1, 10, [2]) },
        { id: '3A-6', title: 'たしざん ＋1・＋2・＋3', gen: add(1, 10, [1, 2, 3]) },
      ],
      test: [[6, next(1, 120)], [4, seq(1, 120)], [10, add(1, 10, [1, 2, 3])]],
      next: '2A',
    },
    '2A': {
      desc: 'たしざん ＋1 から ＋10 まで',
      prints: [
        { id: '2A-1', title: 'たしざん ＋1〜＋3', gen: add(1, 15, [1, 2, 3]) },
        { id: '2A-2', title: 'たしざん ＋4・＋5', gen: add(1, 10, [4, 5]) },
        { id: '2A-3', title: 'たしざん ＋6・＋7', gen: add(1, 10, [6, 7]) },
        { id: '2A-4', title: 'たしざん ＋8・＋9・＋10', gen: add(1, 10, [8, 9, 10]) },
        { id: '2A-5', title: 'たしざん ＋1〜＋10 まぜて', gen: add(1, 10, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) },
      ],
      test: [[20, add(1, 10, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])]],
      next: 'A',
    },
    'A': {
      desc: 'ひきざん −1 から −10 まで と、たしざん・ひきざん まぜて',
      prints: [
        { id: 'A-1', title: 'ひきざん −1・−2・−3', gen: sub(10, [1, 2, 3]) },
        { id: 'A-2', title: 'ひきざん −4・−5・−6', gen: sub(12, [4, 5, 6]) },
        { id: 'A-3', title: 'ひきざん −7〜−10', gen: sub(15, [7, 8, 9, 10]) },
        { id: 'A-4', title: 'たしざん と ひきざん', gen: mix(add(1, 10, [1, 2, 3, 4, 5]), sub(10, [1, 2, 3, 4, 5])) },
      ],
      test: [[10, sub(12, [1, 2, 3, 4, 5, 6])], [10, mix(add(1, 10, [1, 2, 3, 4, 5, 6, 7, 8, 9]), sub(15, [6, 7, 8, 9, 10]))]],
      next: null,
    },
    'こくご': {
      desc: 'ひらがなの ことば・あいうえお（えらんで タップ）',
      prints: [
        { id: 'こ-1', title: 'えを みて ことば', gen: wordPic },
        { id: 'こ-2', title: 'あいうえおの ならび', gen: gojuRow },
        { id: 'こ-3', title: 'ことばの はじめの もじ', gen: firstMoji },
      ],
    },
    'えいご': {
      desc: 'いろ・どうぶつ・かず・たべもの を えいごで（えらんで タップ）',
      prints: [
        { id: 'え-1', title: 'いろ（colors）', gen: en('color') },
        { id: 'え-2', title: 'どうぶつ（animals）', gen: en('animal') },
        { id: 'え-3', title: 'かず 1〜10（numbers）', gen: en('num') },
        { id: 'え-4', title: 'たべもの（food）', gen: en('food') },
      ],
    },
  };
  const ORDER = ['3A', '2A', 'A'];
  const EXTRA = ['こくご', 'えいご'];
  function unlocked(lv) { if (EXTRA.includes(lv)) return true; const i = ORDER.indexOf(lv); return i === 0 || K.passed.includes(ORDER[i - 1]); }
  function hundreds(lv) { return LEVELS[lv].prints.reduce((s, p) => s + (K.done[p.id] || 0), 0); }

  function makeSet(gens, n) {
    const out = [], seen = new Set();
    let guard = 0;
    while (out.length < n && guard++ < 500) {
      const g = Array.isArray(gens) ? gens[out.length] : gens;
      const q = g(); const key = q.t.join(',') + (q.a || '');
      if (seen.has(key) && guard < 400) continue;
      seen.add(key); out.push(Object.assign(q, { v: '', mark: '' }));
    }
    return out;
  }

  // ================= がめん =================
  let root, opts = {}, view = 'room', cur = null, timer = 0, tick = null, lvView = null;
  const TEACH = ['きょうも がんばろうね！', 'ゆっくり ていねいに かこうね', 'はやく せいかくに できるかな？', 'えんぴつの もちかた、ばっちり！'];

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function fmt(sec) { const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return m ? `${m}ふん${s}びょう` : `${s}びょう`; }
  function sfx(n) { if (opts.sfx) opts.sfx(n); }

  function renderRoom(msg) {
    view = 'room'; stopTick();
    const lv = lvView || K.level;
    root.innerHTML = '';
    const board = el('div', 'kboard');
    board.appendChild(el('div', 'ktitle', '🏫 くもん みなとみらい きょうしつ'));
    board.appendChild(el('div', 'kaddr', 'みなとみらいミッドスクエア 3かい'));
    root.appendChild(board);
    const teacher = el('div', 'kteach');
    teacher.innerHTML = `<span class="kface">👩‍🏫</span><span class="ksay">${msg || ('あおちゃん、いらっしゃい！ ' + pick(TEACH))}</span>`;
    root.appendChild(teacher);
    const mama = el('div', 'kmama', `<span class="kmface">🚪🪑👩</span><span>ママは いりぐちの イスで まってるよ。<br><small>おみずを のんだ かず： 🥤×${K.water || 0}</small></span>`);
    mama.appendChild(el('button', 'kwater', '🥤 おみず ちょうだい'));
    mama.lastChild.addEventListener('click', () => mamaWater(true));
    root.appendChild(mama);

    const tabs = el('div', 'ktabs');
    ORDER.concat(EXTRA).forEach((L) => {
      const ok = unlocked(L);
      const b = el('button', 'ktab' + (L === lv ? ' on' : '') + (ok ? '' : ' lock') + (EXTRA.includes(L) ? ' ex' : ''), (ok ? '' : '🔒 ') + (EXTRA.includes(L) ? (L === 'こくご' ? '✏️ ' : '🔤 ') + L : L + ' きょうざい') + (K.passed.includes(L) ? ' 🏅' : ''));
      b.addEventListener('click', () => {
        if (!ok) { renderRoom(`${L} は、${ORDER[ORDER.indexOf(L) - 1]} の テストに ごうかく すると できるように なるよ。`); return; }
        lvView = L; renderRoom();
      });
      tabs.appendChild(b);
    });
    root.appendChild(tabs);

    const L = LEVELS[lv];
    root.appendChild(el('div', 'kdesc', `📘 ${lv}： ${L.desc}`));
    const list = el('div', 'klist');
    L.prints.forEach((p) => {
      const n = K.done[p.id] || 0;
      const b = el('button', 'kprint', `<b>${p.id}</b><span>${p.title}</span><i>${n ? '💮×' + n : 'まだ'}</i>`);
      b.addEventListener('click', () => startSheet(lv, p));
      list.appendChild(b);
    });
    root.appendChild(list);

    const h = hundreds(lv), canTest = h >= NEED;
    if (L.test) {
    const tb = el('button', 'ktest' + (canTest ? '' : ' lock'),
      canTest ? `📝 ${lv} しゅうりょう テストを うける<small>20もん・${PASS}てん いじょうで ごうかく</small>`
        : `🔒 ${lv} しゅうりょう テスト<small>100てんの プリントを あと ${NEED - h}まい</small>`);
    tb.addEventListener('click', () => { if (canTest) startTest(lv); else renderRoom(`テストの まえに、プリントで 100てんを あと ${NEED - h}かい とろうね。`); });
    root.appendChild(tb);
    }
    if (K.passed.includes(lv)) root.appendChild(el('div', 'kdesc', `🏅 ${lv} ごうかく ずみ！` + (lv === ORDER[ORDER.length - 1] ? ' さんすうは ここまで クリア！ つぎの B きょうざいは じゅんびちゅう…' : '')));
    const out = el('button', 'kout', '🚪 そとに でる');
    out.addEventListener('click', () => { close(); });
    root.appendChild(out);
  }

  function startSheet(lv, p) {
    cur = { lv, p, test: false, items: makeSet(p.gen, 10), sel: 0, tries: 0, first: null };
    timer = 0; renderSheet();
  }
  function startTest(lv) {
    const L = LEVELS[lv]; const gens = [];
    L.test.forEach(([n, g]) => { for (let i = 0; i < n; i++) gens.push(g); });
    cur = { lv, p: { id: lv + ' テスト', title: 'しゅうりょう テスト' }, test: true, items: makeSet(gens, gens.length), sel: 0, tries: 0 };
    timer = 0; renderSheet();
  }
  function stopTick() { if (tick) { clearInterval(tick); tick = null; } }

  function renderSheet() {
    view = 'sheet'; root.innerHTML = '';
    const paper = el('div', 'kpaper' + (cur.test ? ' test' : ''));
    const head = el('div', 'khead');
    head.innerHTML = `<b>${cur.p.id}</b> ${cur.p.title}<span class="kname">なまえ： あおちゃん</span><span class="ktime" id="kTime">⏱ ${fmt(timer)}</span>`;
    paper.appendChild(head);
    const grid = el('div', 'kgrid' + (cur.items.length > 10 ? ' many' : ''));
    cur.items.forEach((q, i) => {
      const row = el('div', 'kq' + (i === cur.sel ? ' sel' : '') + (q.mark ? ' ' + q.mark : '') + (q.row ? ' rowq' : ''));
      row.appendChild(el('span', 'kno', `(${i + 1})`));
      if (q.c) {
        q.t.forEach((tok, k) => row.appendChild(el('span', k === 0 ? 'ktok kpic' : 'ktok', String(tok))));
        const cs = el('span', 'kchoices');
        q.c.forEach((c) => {
          const b = el('button', 'kch' + (q.v === c ? ' on' : '') + (q.mark === 'ok' && q.v === c ? ' ok' : '') + (q.mark === 'ng' && q.v === c ? ' ng' : ''), c);
          b.addEventListener('click', (e) => { e.stopPropagation(); if (q.mark === 'ok' || (cur.test && cur.tries)) return; q.v = c; if (q.mark === 'ng') q.mark = 'fix'; cur.sel = i; sfx('tap'); renderSheet(); });
          cs.appendChild(b);
        });
        row.appendChild(cs);
        if (q.mark === 'ok') row.appendChild(el('span', 'kmark', '○'));
        row.addEventListener('click', () => { cur.sel = i; });
        grid.appendChild(row); return;
      }
      q.t.forEach((tok) => {
        if (tok === BOX) {
          const bx = el('span', 'kbox', q.v || '&nbsp;');
          if (q.mark === 'ok') bx.appendChild(el('span', 'kmark', '○'));
          if (q.mark === 'ng') bx.appendChild(el('span', 'kmark ng', '✓'));
          row.appendChild(bx);
        } else row.appendChild(el('span', 'ktok', String(tok)));
      });
      row.addEventListener('click', () => { if (q.mark === 'ok' || (cur.test && cur.tries)) return; cur.sel = i; renderSheet(); });
      grid.appendChild(row);
    });
    paper.appendChild(grid);
    root.appendChild(paper);

    const choiceSheet = cur.items.every((q) => q.c);
    const pad = el('div', 'kpad' + (choiceSheet ? ' hide' : ''));
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', 'つぎ▶'].forEach((k) => {
      const b = el('button', 'kkey' + (k.length > 1 ? ' wide' : ''), k === '←' ? '⌫ けす' : k);
      b.addEventListener('click', () => key(k));
      pad.appendChild(b);
    });
    root.appendChild(pad);
    const allFilled = cur.items.every((q) => q.v !== '');
    const sub = el('button', 'ksubmit' + (allFilled ? '' : ' dim'), cur.test ? '📝 テストを だす' : '✋ せんせいに みせる');
    sub.addEventListener('click', submit);
    root.appendChild(sub);
    const back = el('button', 'kout', '← やめて もどる');
    back.addEventListener('click', () => renderRoom('また やろうね。'));
    root.appendChild(back);
    if (!tick) tick = setInterval(() => { timer += 1; mamaT += 1; const t = document.getElementById('kTime'); if (t) t.textContent = '⏱ ' + fmt(timer); if (mamaT >= 75 && view === 'sheet') mamaWater(false); }, 1000);
    const s = grid.children[cur.sel]; if (s && s.scrollIntoView) s.scrollIntoView({ block: 'nearest' });
  }
  function editable(i) { const q = cur.items[i]; return q && q.mark !== 'ok'; }
  function key(k) {
    if (view !== 'sheet') return;
    const q = cur.items[cur.sel]; if (!q || !editable(cur.sel)) return;
    if (k === '←') q.v = q.v.slice(0, -1);
    else if (k === 'つぎ▶') { moveNext(); return; }
    else if (q.v.length < 3) { q.v = (q.v === '0' ? '' : q.v) + k; if (q.mark === 'ng') q.mark = 'fix'; }
    sfx('tap'); renderSheet();
  }
  function moveNext() {
    const n = cur.items.length;
    for (let d = 1; d <= n; d++) { const i = (cur.sel + d) % n; if (editable(i) && (cur.items[i].v === '' || cur.items[i].mark === 'ng')) { cur.sel = i; renderSheet(); return; } }
    for (let d = 1; d <= n; d++) { const i = (cur.sel + d) % n; if (editable(i)) { cur.sel = i; renderSheet(); return; } }
  }
  function submit() {
    if (!cur.items.every((q) => q.v !== '')) {
      const i = cur.items.findIndex((q) => q.v === ''); cur.sel = i; renderSheet();
      say('まだ かいていない ところが あるよ'); return;
    }
    cur.tries++;
    let ok = 0;
    cur.items.forEach((q) => { if (q.c ? q.v === q.a : Number(q.v) === q.a) { q.mark = 'ok'; ok++; } else q.mark = 'ng'; });
    const score = Math.round(ok / cur.items.length * 100);
    if (cur.test) { stopTick(); finishTest(score); return; }
    if (cur.first === null) cur.first = score;
    if (ok === cur.items.length) { stopTick(); finishPrint(); return; }
    sfx('ng');
    cur.items.forEach((q) => { if (q.mark === 'ng') q.v = ''; });
    cur.sel = cur.items.findIndex((q) => q.mark === 'ng');
    renderSheet();
    say(`${score}てん。✓ の ところを なおそう！`);
  }
  function say(t) {
    let b = document.getElementById('kToast');
    if (!b) { b = el('div', 'ktoast'); b.id = 'kToast'; document.body.appendChild(b); }
    b.textContent = t; b.classList.add('show'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('show'), 1800);
  }
  function result(html, btns) {
    view = 'result'; root.innerHTML = '';
    const c = el('div', 'kresult', html); root.appendChild(c);
    btns.forEach(([label, fn, cls]) => { const b = el('button', cls || 'ksubmit', label); b.addEventListener('click', fn); root.appendChild(b); });
  }
  function finishPrint() {
    K.done[cur.p.id] = (K.done[cur.p.id] || 0) + 1; store(); sfx('good');
    if (mamaT > 30 || Math.random() < 0.4) setTimeout(() => mamaWater(false), 1600);
    const first = cur.first === 100 ? 'いっかいで ぜんぶ せいかい！ すごい！' : `さいしょは ${cur.first}てん → なおして 100てん！`;
    const gift = opts.onReward ? opts.onReward({ type: 'print', level: cur.lv }) : '';
    const lv = cur.lv, p = cur.p;
    const h = hundreds(lv);
    result(`<div class="kbig">💮 100てん！</div><p>${first}</p><p>⏱ かかった じかん： ${fmt(timer)}</p>${gift ? `<p>🎁 ${gift}</p>` : ''}` +
      (h >= NEED && !K.passed.includes(lv) ? `<p><b>📝 ${lv} の テストが うけられるよ！</b></p>` : ''),
      [['🔁 もう いちまい', () => startSheet(lv, p)], ['📚 プリントを えらぶ', () => renderRoom('よく がんばったね！'), 'ksubmit sub']]);
  }
  function finishTest(score) {
    const lv = cur.lv, pass = score >= PASS;
    K.tests.push({ lv, score, sec: timer, pass, at: Date.now() }); if (K.tests.length > 30) K.tests.shift();
    let msg;
    if (pass) {
      const first = !K.passed.includes(lv);
      if (first) K.passed.push(lv);
      const nx = LEVELS[lv].next;
      if (first && LEVELS[nx]) { K.level = nx; lvView = nx; }
      store(); sfx('pass');
      const gift = first && opts.onReward ? opts.onReward({ type: 'test', level: lv }) : '';
      msg = `<div class="kbig">🏅 ごうかく！</div><p>${lv} しゅうりょう テスト <b>${score}てん</b>（${fmt(timer)}）</p>` +
        (first && LEVELS[nx] ? `<p class="kup">🎉 きょうから <b>${nx} きょうざい</b>！<br>${LEVELS[nx].desc}</p>` : '') +
        (first && !LEVELS[nx] ? '<p>A まで ぜんぶ クリア！ つぎの B きょうざいは じゅんびちゅう だよ。</p>' : '') +
        (gift ? `<p>🎁 ${gift}</p>` : '');
      showMarked(msg, [[first && LEVELS[nx] ? `▶ ${nx} を はじめる` : '📚 もどる', () => renderRoom(first && LEVELS[nx] ? `${nx} の プリントだよ。がんばろうね！` : 'すごいね！')]]);
    } else {
      store(); sfx('ng');
      msg = `<div class="kbig">😢 ${score}てん</div><p>ごうかくは ${PASS}てん いじょう。<br>プリントで れんしゅうして、また ちょうせん しよう！</p>`;
      showMarked(msg, [['🔁 もういちど テスト', () => startTest(lv)], ['📚 れんしゅうする', () => renderRoom('まちがえた ところを れんしゅう しようね。'), 'ksubmit sub']]);
    }
  }
  function showMarked(msg, btns) {
    // テストの まるつけ を みせてから けっか
    renderSheet(); stopTick(); view = 'result';
    const pad = root.querySelector('.kpad'); if (pad) pad.remove();
    root.querySelectorAll('.ksubmit, .kout').forEach((b) => b.remove());
    const r = el('div', 'kresult', msg); root.insertBefore(r, root.firstChild);
    btns.forEach(([label, fn, cls]) => { const b = el('button', cls || 'ksubmit', label); b.addEventListener('click', fn); root.insertBefore(b, r.nextSibling); });
    root.scrollTop = 0;
  }

  function onKey(e) {
    if (!root || !root.closest('.ov').classList.contains('show')) return;
    if (view === 'sheet') {
      if (/^[0-9]$/.test(e.key)) { key(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { key('←'); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'Tab') { if (e.key === 'Enter' && cur.items.every((q) => q.v !== '')) submit(); else moveNext(); e.preventDefault(); }
    }
    e.stopPropagation();
  }
  function close() { stopTick(); view = 'room'; if (opts.onClose) opts.onClose(); }

  // ---- ママ が おみずを もってきて くれる ----
  let mamaT = 0;
  function mamaWater(asked) {
    if (document.getElementById('kMama')) return;
    mamaT = 0;
    const m = el('div', 'kmamaPop'); m.id = 'kMama';
    m.innerHTML = `<div class="kmbox"><div class="kmbig">👩🥤</div><p>${asked ? 'ママ「はい、おみず どうぞ」' : 'ママ「あおちゃん、がんばってるね！ おみず のむ？」'}</p></div>`;
    const box = m.firstChild;
    const yes = el('button', 'ksubmit', '🥤 ごくごく のむ'), no = el('button', 'kout', 'いまは だいじょうぶ');
    yes.addEventListener('click', () => {
      K.water = (K.water || 0) + 1; store(); sfx('drink');
      box.innerHTML = '<div class="kmbig">😋💧</div><p>ごくごく… ぷはー！ おいしい！<br>ママ「つづき がんばってね」</p>';
      setTimeout(() => { m.remove(); if (view === 'room') renderRoom('おみずを のんで すっきり！'); }, 1500);
    });
    no.addEventListener('click', () => m.remove());
    box.appendChild(yes); box.appendChild(no);
    document.body.appendChild(m);
  }
  window.Kumon = {
    open(o) {
      opts = o || {}; root = document.getElementById('kRoom'); lvView = K.level;
      if (!root._key) { root._key = true; addEventListener('keydown', onKey, true); }
      renderRoom();
    },
    get level() { return K.level; },
    get passed() { return K.passed.slice(); },
  };
})();
