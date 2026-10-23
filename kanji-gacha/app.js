"use strict";

/* かんじ ガチャ おもちゃばこ - うごき（クイズ・ガチャ・おもちゃばこ・ほぞん） */
const KG = (() => {
  const D = GACHA_DATA;
  const $ = id => document.getElementById(id);
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ================= かんじデータ ================= */
  const GRADE = {};
  Object.entries(D.grades).forEach(([g, s]) => [...s].forEach(c => { GRADE[c] = +g; }));
  const READ = {};
  D.yomi.forEach(l => { const [c, r] = l.split(':'); READ[c] = r.split(','); });
  const EXTRA = {};
  D.extra.forEach(l => { const [c, g, r] = l.split(':'); EXTRA[c] = { g: /^\d$/.test(g) ? +g : g, r: r.split(',') }; });

  const hira = s => s.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  const full = r => hira(r.replace(/[()]/g, ''));
  const stem = r => hira(r.split('(')[0]);
  const okuri = r => (r.match(/\((.+)\)/) || [])[1] || '';
  const isKanji = ch => /[一-龥々]/.test(ch);
  const readSet = c => { const s = new Set(); (READ[c] || []).forEach(r => { s.add(full(r)); s.add(stem(r)); }); return s; };
  /* ルビ: '竹[たけ]' → <ruby> */
  const rb = s => String(s).replace(/([一-龥々])\[([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');

  function gradeLabel(g) {
    if (typeof g === 'number') return `${g}年[ねん]生[せい]で ならう`;
    if (g === '中') return '中[ちゅう]学[がっ]校[こう]で ならう';
    return 'ならわない むずかしい 字[じ]';
  }
  function kinfo(c) {
    if (GRADE[c]) return { g: GRADE[c], r: READ[c], quiz: true };
    const e = EXTRA[c];
    return e ? { g: e.g, r: e.r, quiz: false } : { g: '外', r: [], quiz: false };
  }
  /* よみを みせる: くんよみは ひらがな（おくりがなつき）、おんよみは カタカナ */
  const showReads = rs => rs.slice(0, 3).map(r => r.replace(/[()]/g, '')).join('・');

  /* おもちゃ */
  const TOYS = D.toys.map(t => {
    const segs = [];
    t.name.replace(/([一-龥々])\[([^\]]+)\]|([^\[\]])/g, (m, k, r, ch) => { segs.push(k ? { t: k, r } : { t: ch }); return m; });
    const kanji = segs.filter(s => s.r).map(s => s.t);
    const lv = Math.max(1, ...kanji.filter(c => GRADE[c]).map(c => GRADE[c]));
    return Object.assign({}, t, { segs, kanji, lv, yomi: segs.map(s => s.r || s.t).join('') });
  });
  const TOY = Object.fromEntries(TOYS.map(t => [t.id, t]));
  const TOYK = {};   // クイズに だせる 字 → その字を つかう おもちゃ
  TOYS.forEach(t => t.segs.forEach((s, i) => { if (s.r && GRADE[s.t]) (TOYK[s.t] = TOYK[s.t] || []).push([t.id, i]); }));
  const nameHTML = (t, hideIdx) => t.segs.map((s, i) => i === hideIdx ? '<span class="box">□</span>' : s.r ? `<ruby>${s.t}<rt>${s.r}</rt></ruby>` : s.t).join('');

  const SIM = {};
  D.similar.forEach(g => [...g].forEach(c => { SIM[c] = (SIM[c] || []).concat([...g].filter(x => x !== c)); }));

  /* ================= ほぞん ================= */
  const KEY = 'kanji-gacha-v1';
  let S;
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    const first = !s;
    s = Object.assign({ coins: 3, owned: {}, miss: {}, grade: 1, sound: true, sets: 0, right: 0, pulls: 0 }, s || {});
    if (![1, 2, 3].includes(s.grade)) s.grade = 1;
    Object.keys(s.owned).forEach(id => { if (!TOY[id]) delete s.owned[id]; });
    Object.keys(s.miss).forEach(c => { if (!GRADE[c]) delete s.miss[c]; });
    S = s;
    return first;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ほぞん できなくても あそべる */ } }

  /* ================= がめん ================= */
  const VIEWS = ['home', 'quiz', 'gacha', 'shelf'];
  let view = 'home';
  function show(v) {
    view = v;
    VIEWS.forEach(n => { $('v-' + n).hidden = n !== v; });
    document.body.classList.toggle('fit', v === 'gacha');    // ガチャは 1がめんに おさめる
    window.scrollTo(0, 0);
    if (v === 'home') renderHome();
    if (v === 'shelf') renderShelf();
    if (v === 'gacha') renderGacha();
  }
  function setCoins(bump) {
    $('coinN').textContent = S.coins;
    if (bump) { const p = $('coinPill'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
  }
  let toastT = 0;
  function toast(html, ms) {
    const t = $('toast'); t.innerHTML = rb(html); t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2200);
  }
  function openModal(id) { $(id).hidden = false; }
  function closeModal(id) { $(id).hidden = true; }

  function ownedCount() { return Object.keys(S.owned).length; }
  function renderHome() {
    $('shelfSub').textContent = `${ownedCount()} / ${TOYS.length} しゅるい`;
    $('homeGrade').innerHTML = rb(`クイズ: ${S.grade}年[ねん]生[せい]までの かんじ　（⚙️ で かえられるよ）`);
  }

  /* ================= クイズ ================= */
  let Q = null;
  function pool() { return Object.keys(GRADE).filter(c => GRADE[c] <= S.grade); }

  function distractKanji(c, avoid) {
    // にた字（学年いない → 1〜3年）→ 学年いないの ほかの字
    const ok = k => k !== c && !out.includes(k) && READ[k] && ![...readSet(k)].some(r => avoid.has(r));
    const out = [];
    const sim = shuffle(SIM[c] || []);
    sim.filter(k => GRADE[k] <= S.grade).forEach(k => { if (out.length < 2 && ok(k)) out.push(k); });
    sim.forEach(k => { if (out.length < 2 && ok(k)) out.push(k); });
    const p = shuffle(pool());
    for (const k of p) { if (out.length >= 2) break; if (ok(k)) out.push(k); }
    return out;
  }

  function makeQ(c, notType) {
    const types = ['yomi', 'kaki'];
    if (TOYK[c]) types.push('kotoba', 'kotoba');
    let type = pick(types.filter(t => t !== notType));
    if (!type) type = 'yomi';
    const r0 = READ[c][0];
    const ans = full(r0), ok = okuri(r0);
    const q = { c, type };
    if (type === 'yomi') {
      const avoid = readSet(c);
      const cand = shuffle(SIM[c] || []).concat(shuffle(pool()));
      const ds = [];
      for (const k of cand) {
        if (ds.length >= 2) break;
        if (k === c || !READ[k]) continue;
        const rk = READ[k][0], d = full(rk);
        if (d === ans || avoid.has(d) || ds.includes(d)) continue;
        if (ok ? okuri(rk) !== ok : okuri(rk)) continue;
        ds.push(d);
      }
      // おくりがなが めずらしい ときは 「ほかの 字の よみ＋おなじ おくりがな」で つくる
      for (const k of shuffle(pool())) {
        if (ds.length >= 2) break;
        const rk = READ[k].find(r => /^[ぁ-ゖ]/.test(r));
        if (!rk || k === c) continue;
        const d = stem(rk) + ok;
        if (d === ans || avoid.has(d) || ds.includes(d) || d.length < 2) continue;
        ds.push(d);
      }
      q.ask = 'この かんじの よみかたは？';
      q.big = `<span class="kbig">${c}</span>${ok ? `<span class="okuri">${ok}</span>` : ''}`;
      q.choices = shuffle([{ h: ans, ok: true }].concat(ds.map(d => ({ h: d, ok: false }))));
      q.cls = 'kana';
    } else {
      let ctx = null, tid = null, idx = -1;
      if (type === 'kotoba') { [tid, idx] = pick(TOYK[c]); ctx = TOY[tid].segs[idx].r; }
      const avoid = new Set([ans, stem(r0)]);
      if (ctx) avoid.add(ctx);
      const ds = distractKanji(c, avoid);
      q.choices = shuffle([{ h: c, ok: true }].concat(ds.map(k => ({ h: k, ok: false }))));
      q.cls = 'kanji';
      if (type === 'kaki') {
        q.ask = '<span class="box sm"></span>に はいる かんじは どれ？';
        q.big = `<ruby><span class="box">□</span><rt>${stem(r0)}</rt></ruby>${ok ? `<span class="okuri">${ok}</span>` : ''}`;
      } else {
        const t = TOY[tid];
        q.toy = t;
        q.ask = 'おもちゃの なまえ。<span class="box sm"></span>に はいる かんじは？';
        q.big = `<span class="toyname">${nameHTML(t, idx)}</span>`;
        q.hint = `（${t.yomi}）`;
      }
    }
    return q;
  }

  function makeSet() {
    const p = pool();
    const qs = [], used = new Set();
    Object.entries(S.miss).filter(([c]) => GRADE[c] <= S.grade).sort((a, b) => b[1] - a[1]).slice(0, 2)
      .forEach(([c]) => { qs.push(Object.assign(makeQ(c), { again: true })); used.add(c); });
    const toyK = Object.keys(TOYK).filter(c => GRADE[c] <= S.grade);
    let guard = 0;
    while (qs.length < 5 && guard++ < 500) {
      const c = Math.random() < 0.45 ? pick(toyK) : pick(p);
      if (used.has(c)) continue;
      used.add(c); qs.push(makeQ(c));
    }
    return shuffle(qs);
  }

  function startQuiz() {
    Q = { qs: makeSet(), i: 0, right: 0, done: false, streak: 0, earned: 0 };
    show('quiz');
    $('qEnd').hidden = true;
    renderQ();
  }
  function renderQ() {
    const q = Q.qs[Q.i];
    $('qDots').innerHTML = Q.qs.map((x, i) => `<span class="dot ${i < Q.i ? (x.res ? 'ok' : 'ng') : i === Q.i ? 'now' : ''}"></span>`).join('');
    $('qType').textContent = { yomi: 'よみ', kaki: 'かき', kotoba: 'ことば' }[q.type] + (q.again ? '・もういちど' : '');
    $('qType').className = 'qtype ' + q.type;
    $('qAsk').innerHTML = q.ask;
    $('qBig').innerHTML = q.big;
    $('qHint').textContent = q.hint || '';
    $('qPicWrap').hidden = !q.toy;
    if (q.toy) { const cv = $('qPic'), c = cv.getContext('2d'); c.clearRect(0, 0, 160, 160); drawToy(c, q.toy, 160); }
    $('qChoices').innerHTML = q.choices.map((ch, i) => `<button class="choice ${q.cls}" data-i="${i}">${ch.h}</button>`).join('');
    $('qChoices').hidden = false;
    $('qFeed').hidden = true;
  }
  function explain(c) {
    const k = kinfo(c);
    return rb(`<b class="kx">${c}</b> ＝ ${showReads(k.r)}　<span class="gtag g${k.g}">${gradeLabel(k.g)}</span>`);
  }
  function answer(i) {
    const q = Q.qs[Q.i];
    if (q.res != null) return;
    const ok = q.choices[i].ok;
    q.res = ok;
    [...$('qChoices').children].forEach((b, j) => {
      b.disabled = true;
      if (q.choices[j].ok) b.classList.add('right');
      else if (j === i) b.classList.add('wrong');
    });
    if (ok) {
      // 3もん れんぞくで せいかいすると コインが 2まいに なる
      Q.right++; S.right++; Q.streak++;
      const got = Q.streak >= 3 ? 2 : 1;
      S.coins += got; Q.earned += got;
      if (S.miss[q.c]) { S.miss[q.c]--; if (S.miss[q.c] <= 0) delete S.miss[q.c]; }
      Snd.ok(); Snd.coin(0.15); if (got > 1) Snd.coin(0.32); setCoins(true);
      $('qRes').innerHTML = got > 1 ? `⭕ ${Q.streak}もん れんぞく！ <span class="plus">コイン +2</span>` : '⭕ せいかい！ <span class="plus">コイン +1</span>';
    } else {
      Q.streak = 0;
      S.miss[q.c] = Math.min(3, (S.miss[q.c] || 0) + 1);
      Snd.ng();
      $('qRes').innerHTML = '❌ ざんねん。あとで もういちど でるよ';
      // おなじ セットの さいごに もういちど だす
      if (Q.i < Q.qs.length - 1 && !Q.qs[Q.qs.length - 1].again) Q.qs[Q.qs.length - 1] = Object.assign(makeQ(q.c, q.type), { again: true });
    }
    save();
    let exp = explain(q.c);
    if (q.toy) exp += `<br><span class="small">${nameHTML(q.toy)} の 「${q.c}」</span>`;
    $('qExp').innerHTML = exp;
    $('qFeed').hidden = false;
    $('qFeed').className = 'qfeed ' + (ok ? 'ok' : 'ng');
  }
  function nextQ() {
    Q.i++;
    if (Q.i < Q.qs.length) { renderQ(); return; }
    // さいごまで やったら +1、ぜんもん せいかいなら さらに +2
    const bonus = 1 + (Q.right === Q.qs.length ? 2 : 0);
    S.coins += bonus; Q.earned += bonus;
    S.sets++; save(); setCoins(true);
    $('qChoices').hidden = true; $('qFeed').hidden = true;
    $('qDots').innerHTML = Q.qs.map(x => `<span class="dot ${x.res ? 'ok' : 'ng'}"></span>`).join('');
    $('qAsk').textContent = ''; $('qBig').innerHTML = ''; $('qHint').textContent = ''; $('qPicWrap').hidden = true;
    $('qEnd').hidden = false;
    $('qEndTitle').textContent = Q.right === 5 ? 'ぜんもん せいかい！ すごい！' : `${Q.right}もん せいかい！`;
    $('qEndCoins').innerHTML = Array.from({ length: Q.earned }, (_, i) => `<span class="coin big" style="animation-delay:${i * 0.12}s">か</span>`).join('') + `<span class="plus">+${Q.earned}</span>` +
      `<span class="bonus">さいごまで できた ボーナス +1${bonus > 1 ? '<br>ぜんもん せいかい ボーナス +2' : ''}</span>`;
    Snd.coin(0.2);
    $('qToGacha').disabled = S.coins < 3;
    $('qToGacha').textContent = S.coins >= 3 ? `ガチャへ 🎰（${Math.floor(S.coins / 3)}かい）` : `あと ${3 - S.coins}まいで ガチャ`;
    if (Q.right >= 4) Snd.fanfare();
  }

  /* ================= ガチャ ================= */
  let G = { busy: false, rot: 0, lastA: null, moved: 0, toy: null };
  const CAP_COLORS = ['#ff6b6b', '#4dabf7', '#69db7c', '#ffd43b', '#f783ac', '#9775fa', '#ffa94d'];
  function renderGacha() {
    const g = $('caps');
    if (!g.childElementCount) {
      let h = '';
      for (let i = 0; i < 26; i++) {
        const x = 62 + (i % 7) * 29 + (Math.floor(i / 7) % 2) * 14, y = 205 - Math.floor(i / 7) * 30 + (i % 3) * 3;
        const col = CAP_COLORS[i % CAP_COLORS.length];
        h += `<g class="cap" style="--d:${(i % 5) * 0.05}s" transform="translate(${x} ${y}) rotate(${(i * 47) % 360})"><circle r="15" fill="#fff" stroke="#4a3728" stroke-width="3"/><path d="M-15 0 A15 15 0 0 1 15 0 Z" fill="${col}" stroke="#4a3728" stroke-width="3"/></g>`;
      }
      g.innerHTML = h;
      const ring = $('hRing');
      for (let i = 0; i < LAMPS; i++) {
        const a = (i + 1) * 2 * Math.PI / LAMPS - Math.PI / 2;
        ring.insertAdjacentHTML('beforeend', `<circle cx="${(Math.cos(a) * 47).toFixed(1)}" cy="${(Math.sin(a) * 47).toFixed(1)}" r="4"/>`);
      }
    }
    if (!G.busy) setRot(G.rot);
    gMsg();
  }
  function gMsg() {
    $('gMsg').innerHTML = S.coins >= 3 ? (G.rot ? 'つづきから まわしてね' : 'ハンドルを 3かい ぐるぐる<br>まわしてね（コイン 3まい）') : `コインが たりないよ（あと ${3 - S.coins}まい）。クイズで あつめよう！`;
    $('handHint').hidden = S.coins < 3 || G.busy;
  }
  function weightOf(t) {
    const r = { 1: 10, 2: 3.5, 3: 1 }[t.rare];
    return r * (t.lv <= S.grade ? 3 : 1) * (S.owned[t.id] ? 1 : 1.6);
  }
  function drawToyPick() {
    const ws = TOYS.map(weightOf), sum = ws.reduce((a, b) => a + b, 0);
    let x = Math.random() * sum;
    for (let i = 0; i < TOYS.length; i++) { x -= ws[i]; if (x <= 0) return TOYS[i]; }
    return TOYS[0];
  }
  function handleAngle(e) {
    const r = $('machine').getBoundingClientRect();
    const cx = r.left + r.width * 122 / 300, cy = r.top + r.height * 316 / 420;
    return Math.atan2(e.clientY - cy, e.clientX - cx);
  }
  /* ハンドルは 30ど ごとに カチッと とまる（ラチェット）。3しゅう（1080ど）で ガチャン */
  const NOTCH = 30, TURNS = 3, FULL = 360 * TURNS, LAMPS = 12;
  let capBase = null;
  function setHandle(deg) { $('handleRot').setAttribute('transform', `rotate(${deg})`); }
  function setRot(rot) {
    const n = Math.floor(rot / NOTCH), f = rot / NOTCH - n;
    // ノッチの あいだは おもくて ゆっくり、こえる しゅんかんに カチッと すすむ
    setHandle(rot >= FULL ? FULL : n * NOTCH + NOTCH * 0.75 * f * f);
    const ring = $('hRing');
    if (ring) [...ring.children].forEach((d, i) => d.classList.toggle('on', i < Math.floor(rot * LAMPS / FULL)));
    stirCaps(rot);
  }
  function stirCaps(rot) {
    const caps = $('caps').children;
    if (!capBase) capBase = [...caps].map(c => c.getAttribute('transform'));
    const a = rot * Math.PI / 180;
    for (let i = 0; i < caps.length; i++) {
      const k = 1 + (i % 4) * 0.5, ph = i * 1.7, amp = rot ? 4 + (i % 3) * 3 : 0;
      const dx = Math.sin(a * k + ph) * amp, dy = (Math.cos(a * k + ph) - 1) * amp * 0.8;
      caps[i].setAttribute('transform', `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) ${capBase[i]} rotate(${(rot * (i % 2 ? 0.5 : -0.4)).toFixed(0)})`);
    }
  }
  function kick(n) {               // カチッ ごとに きかいが すこし ゆれる
    const m = $('machine');
    m.style.transform = `rotate(${n % 2 ? 0.7 : -0.7}deg)`;
    setTimeout(() => { m.style.transform = ''; }, 70);
    try { if (navigator.vibrate) navigator.vibrate(n >= FULL / NOTCH - 3 ? 18 : 8); } catch (err) { /* なくても よい */ }
  }
  /* rot を すすめる。ノッチを こえたら 音と ゆれ。1しゅう したら ガチャン */
  function advance(rot, speed) {
    const before = Math.floor(G.rot / NOTCH);
    G.rot = Math.min(rot, FULL);
    const now = Math.floor(G.rot / NOTCH);
    for (let n = before + 1; n <= now; n++) {
      Snd.ratchet(n, FULL / NOTCH, speed);
      kick(n);
    }
    setRot(G.rot);
    if (G.rot >= FULL) { G.lastA = null; turn(); }
  }
  function hDown(e) {
    Snd.unlock();
    if (G.busy) return;
    if (S.coins < 3) { Snd.ng(); setCoins(true); gMsg(); return; }
    e.preventDefault();
    G.lastA = handleAngle(e); G.moved = 0; G.lastT = performance.now(); G.back = 0;
    $('handle').classList.add('grab');
    try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* なくても よい */ }
  }
  function hMove(e) {
    if (G.lastA == null || G.busy) return;
    const a = handleAngle(e);
    let d = a - G.lastA; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
    G.lastA = a;
    const t = performance.now(), dt = Math.max(8, t - G.lastT); G.lastT = t;
    G.moved += Math.abs(d);                              // うごかした りょう（タップかどうかの はんてい）
    if (d > 0) {
      G.back = 0;
      const deg = Math.min(d * 180 / Math.PI, 40);       // いっきに まわしすぎない
      advance(G.rot + deg, Math.min(1, deg / dt / 0.6));
      if (!G.busy) $('gMsg').textContent = G.rot < FULL - 360 ? `ガリガリ… あと ${TURNS - Math.floor(G.rot / 360)}かい まわして！` : 'もうすこし！ あと 1かい！';
    } else if (d < 0) {
      // ぎゃくには まわらない（ガッと とまる）
      G.back += -d;
      if (G.back > 0.35) {
        G.back = 0; Snd.stuck();
        const h = $('handleRot'); h.classList.remove('nope'); void h.getBBox(); h.classList.add('nope');
        $('gMsg').textContent = 'とけいと おなじ むきに まわしてね ↻';
      }
    }
  }
  function hUp() {
    if (G.lastA == null) return;
    G.lastA = null;
    $('handle').classList.remove('grab');
    if (!G.busy && G.rot < FULL && G.moved < 0.3) autoTurn();     // タップだけでも まわる
    // とちゅうで はなしても ハンドルは そこで とまる（つぎは つづきから）
  }
  function autoTurn() {
    G.busy = true;
    let last = performance.now();
    const step = t => {
      const dt = Math.min(50, Math.max(0, t - last)); last = t;
      advance(G.rot + dt * 0.75, 0.7);                    // 3しゅう やく 1.4びょう
      if (G.rot < FULL) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function turn() {
    if (S.coins < 3) { G.rot = 0; setRot(0); G.busy = false; return; }
    G.busy = true;
    S.coins -= 3; S.pulls++; setCoins(true);
    G.toy = drawToyPick();
    save();
    setHandle(FULL);
    $('handHint').hidden = true;
    $('gMsg').textContent = 'ガチャン！';
    Snd.clunk();
    $('machine').classList.add('shake');
    setTimeout(() => {
      $('machine').classList.remove('shake');
      G.rot = 0; setRot(0);
      const cap = $('capsule');
      const col = G.toy.rare === 3 ? 'gold' : G.toy.rare === 2 ? 'silver' : '';
      cap.className = 'capsule ' + col;
      cap.style.setProperty('--cap', pick(CAP_COLORS));
      cap.hidden = false;
      void cap.offsetWidth;
      cap.classList.add('drop');
      Snd.roll();
      $('gMsg').textContent = G.toy.rare === 3 ? 'きんいろの カプセル！？ タップで あけよう！' : G.toy.rare === 2 ? 'ぎんいろの カプセル！ タップで あけよう！' : 'カプセルを タップして あけよう！';
    }, 650);
  }
  function openCapsule() {
    const cap = $('capsule');
    if (!cap.classList.contains('drop') || cap.classList.contains('open')) return;
    cap.classList.add('open');
    Snd.paka();
    setTimeout(() => {
      cap.hidden = true; cap.className = 'capsule';
      const t = G.toy;
      const dup = !!S.owned[t.id];
      S.owned[t.id] = (S.owned[t.id] || 0) + 1;
      if (dup) { S.coins += 1; setTimeout(() => { Snd.coin(); setCoins(true); }, 600); }
      save();
      G.busy = false;
      showToy(t, dup ? 'dup' : 'new');
      gMsg();
    }, 450);
  }

  /* ================= おもちゃの しょうかい ================= */
  let shown = null, rvRaf = 0;
  function showToy(t, mode) {
    shown = t;
    const band = $('rvRare');
    band.className = 'rare-band r' + t.rare;
    band.textContent = t.rare === 3 ? '★★★ きんいろ スーパーレア' : t.rare === 2 ? '★★ ぎんいろ レア' : '★ ふつう';
    $('rvName').innerHTML = nameHTML(t);
    $('rvNote').innerHTML = mode === 'new' ? '🎉 あたらしい おもちゃ！ たなに ならべたよ'
      : mode === 'dup' ? `もう もっているよ（${S.owned[t.id]}こめ）。コイン 1まい かえすね 🪙`
        : `${S.owned[t.id] || 0}こ もっているよ`;
    $('rvKanji').innerHTML = t.segs.filter(s => s.r).map(s => {
      const k = kinfo(s.t);
      const main = k.r[0] ? k.r[0].replace(/[()]/g, '') : s.r;
      const ctx = full(k.r[0] || s.r) !== s.r ? `（「${t.yomi}」では「${s.r}」）` : '';
      return `<li class="${k.quiz ? '' : 'noquiz'}"><span class="kc">${s.t}</span><span class="kd">${rb(`${s.t}＝${main}${ctx}<br><span class="gtag g${k.g}">${gradeLabel(k.g)}</span>${k.quiz ? '' : '<br>クイズには でないよ'}`)}</span></li>`;
    }).join('') || '<li class="nokanji">この なまえには かんじが ないよ</li>';
    $('rvMore').hidden = mode === 'shelf';
    $('rvMore').disabled = S.coins < 3;
    openModal('reveal');
    $('reveal').classList.toggle('fromshelf', mode === 'shelf');
    const cv = $('rvCanvas'), c = cv.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = 220 * dpr; cv.height = 220 * dpr;
    const t0 = performance.now();
    cancelAnimationFrame(rvRaf);
    const anim = now => {
      if ($('reveal').hidden) return;
      const tt = (now - t0) / 1000;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, 220, 220);
      c.save(); c.translate(110, 110 + Math.sin(tt * 2) * 4); c.translate(-110, -110);
      drawToy(c, t, 200, { a: tt * 2, t: tt }, 110, 110);
      c.restore();
      rvRaf = requestAnimationFrame(anim);
    };
    rvRaf = requestAnimationFrame(anim);
    if (mode === 'new' || mode === 'dup') { if (t.rare >= 2) Snd.fanfare(); else Snd.sparkle(); }
  }

  /* ================= おもちゃばこ ================= */
  function renderShelf() {
    $('shelfCount').textContent = `${ownedCount()} / ${TOYS.length}`;
    const box = $('shelf');
    box.innerHTML = TOYS.map(t => {
      const n = S.owned[t.id] || 0;
      return `<button class="slot r${t.rare} ${n ? 'have' : 'none'}" data-id="${t.id}" ${n ? '' : 'aria-label="まだ もっていない"'}>
        <canvas width="88" height="88"></canvas>
        <span class="slot-name">${n ? nameHTML(t) : '？？？'}</span>
        ${n > 1 ? `<span class="slot-n">×${n}</span>` : ''}
      </button>`;
    }).join('');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    box.querySelectorAll('.slot').forEach(el => {
      const t = TOY[el.dataset.id], cv = el.querySelector('canvas'), c = cv.getContext('2d');
      cv.width = 88 * dpr; cv.height = 88 * dpr; c.scale(dpr, dpr);
      drawToy(c, t, 84, {}, 44, 44);
      if (!S.owned[t.id]) { c.globalCompositeOperation = 'source-in'; c.fillStyle = '#c9b49b'; c.fillRect(0, 0, 88, 88); }
    });
  }

  /* ================= あそぶ ================= */
  function playToy(t) {
    closeModal('reveal');
    $('plName').innerHTML = nameHTML(t);
    openModal('play');
    requestAnimationFrame(() => Play.open(t, $('plCanvas'), m => { $('plMsg').innerHTML = rb(m); }));
  }

  /* ================= せってい ================= */
  function renderSettings() {
    $('gradeBtns').innerHTML = [1, 2, 3].map(g => {
      const n = Object.keys(GRADE).filter(c => GRADE[c] <= g).length;
      return `<button class="gbtn ${S.grade === g ? 'on' : ''}" data-g="${g}">${rb(`${g}年[ねん]生[せい] まで`)}<small>${n}じ</small></button>`;
    }).join('');
    $('gradeNote').innerHTML = rb(`クイズに でる かんじと、ガチャで でやすい おもちゃが かわるよ。<br>4年[ねん]生[せい]より うえの 字[じ]は ふりがなつきで みせるだけ。`);
    $('setSnd').textContent = S.sound ? '🔊 おと オン' : '🔇 おと オフ';
    const ms = Object.keys(S.miss);
    $('missList').textContent = ms.length ? ms.join(' ') : 'いまは ないよ';
  }
  function applySound() { Snd.on = S.sound; $('sndBtn').textContent = S.sound ? '🔊' : '🔇'; }

  /* ================= はじまり ================= */
  function init() {
    const first = load();
    applySound(); setCoins();
    show('home');
    if (first) { save(); setTimeout(() => { toast('はじめての プレゼント！ コイン 3まい 🪙', 2800); Snd.coin(); }, 400); }

    $('homeBtn').onclick = () => { Play.close(); show('home'); };
    $('goQuiz').onclick = startQuiz;
    $('goGacha').onclick = () => show('gacha');
    $('goShelf').onclick = () => show('shelf');
    $('qChoices').onclick = e => { const b = e.target.closest('.choice'); if (b) { Snd.unlock(); answer(+b.dataset.i); } };
    $('qNext').onclick = nextQ;
    $('qAgain').onclick = startQuiz;
    $('qToGacha').onclick = () => show('gacha');
    $('gToQuiz').onclick = startQuiz;
    $('gToShelf').onclick = () => show('shelf');

    const h = $('handle');
    h.addEventListener('pointerdown', hDown);
    h.addEventListener('pointermove', hMove);
    h.addEventListener('pointerup', hUp);
    h.addEventListener('pointercancel', hUp);
    $('capsule').onclick = openCapsule;

    $('rvPlay').onclick = () => shown && playToy(shown);
    $('rvClose').onclick = () => { closeModal('reveal'); if (view === 'shelf') renderShelf(); };
    $('rvMore').onclick = () => { closeModal('reveal'); show('gacha'); if (S.coins >= 3) autoTurn(); };
    $('shelf').onclick = e => {
      const b = e.target.closest('.slot'); if (!b) return;
      const t = TOY[b.dataset.id];
      if (S.owned[t.id]) { Snd.tap(); showToy(t, 'shelf'); } else { Snd.ng(); toast('まだ もっていない おもちゃ。ガチャで でるかな？'); }
    };
    $('plReset').onclick = () => Play.reset();
    $('plClose').onclick = () => { Play.close(); closeModal('play'); if (view === 'shelf') renderShelf(); };

    $('sndBtn').onclick = () => { S.sound = !S.sound; applySound(); save(); if (S.sound) Snd.tap(); };
    $('setBtn').onclick = () => { renderSettings(); openModal('settings'); };
    $('setClose').onclick = () => { closeModal('settings'); if (view === 'home') renderHome(); };
    $('setSnd').onclick = () => { S.sound = !S.sound; applySound(); save(); renderSettings(); };
    $('gradeBtns').onclick = e => {
      const b = e.target.closest('.gbtn'); if (!b) return;
      S.grade = +b.dataset.g; save(); Snd.tap(); renderSettings();
    };
    $('setReset').onclick = () => {
      if (!confirm('コイン・おもちゃ・まちがえた かんじを ぜんぶ けして、さいしょから やりなおす？')) return;
      try { localStorage.removeItem(KEY); } catch (e) { /* なにもしない */ }
      load(); save(); applySound(); setCoins(); closeModal('settings'); show('home');
    };
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (!$('play').hidden) $('plClose').click();
      else if (!$('reveal').hidden) $('rvClose').click();
      else if (!$('settings').hidden) $('setClose').click();
    });
  }

  /* テスト用: クイズを たくさん つくって おかしな もんだいが ないか しらべる */
  function selfTest(n) {
    const errs = [];
    const keep = S.grade;
    [1, 2, 3].forEach(g => {
      S.grade = g;
      for (let k = 0; k < (n || 300); k++) {
        makeSet().forEach(q => {
          if (GRADE[q.c] > g) errs.push(`${g}年: ${q.c} は ${GRADE[q.c]}年`);
          if (q.choices.length !== 3) errs.push(`${q.c} ${q.type}: せんたくしが ${q.choices.length}`);
          if (q.choices.filter(c => c.ok).length !== 1) errs.push(`${q.c}: こたえが 1つでない`);
          if (new Set(q.choices.map(c => c.h)).size !== q.choices.length) errs.push(`${q.c} ${q.type}: おなじ せんたくし`);
          if (q.type !== 'yomi') q.choices.filter(c => !c.ok).forEach(c => { if (!GRADE[c.h]) errs.push(`${q.c}: ${c.h} は 1〜3年 いがい`); });
          if (q.type === 'yomi') { const rs = readSet(q.c); q.choices.filter(c => !c.ok).forEach(c => { if (rs.has(c.h)) errs.push(`${q.c}: ${c.h} も ただしい よみ`); }); }
        });
      }
    });
    S.grade = keep;
    return [...new Set(errs)];
  }

  document.addEventListener('DOMContentLoaded', init);
  return { selfTest, TOYS, GRADE, kinfo, get state() { return S; }, showToy: (id, m) => showToy(TOY[id], m || 'shelf'), playToy: id => playToy(TOY[id]), show, rightIndex: () => Q && Q.qs[Q.i] ? Q.qs[Q.i].choices.findIndex(c => c.ok) : -1 };
})();
