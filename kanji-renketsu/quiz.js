'use strict';

/* かんじ れんけつ - 🏷️ へん の なまえ クイズ
 *  もんだい の しゅるい
 *    shape … へん を 見て 名前 を 3択
 *    name  … 名前 を 聞いて へん を えらぶ
 *    nakama… 「さんずい の なかま は どれ？」（漢字 を 3つ から）
 *    which … 「この 漢字 の へん は なに？」
 *    guess … 知らない 漢字 でも へん の いみ から「なに に かんけい ありそう？」
 *  まちがえた へん は 間隔 を あけて また 出す（Store.d.quiz.srs）。
 */

const Quiz = (() => {
  const ROUND = 10;
  const BASIC = ['亻', '彳', '氵', '木', '扌', '言', '糸', '金', '日', '土', '女', '口', '礻', '衤', '禾', '阝', '忄', '犭', '馬', '魚', '田', '目', '石', '弓', '火'];
  const HENS = HEN_INFO.map((r) => r[0]).filter((h) => KANJI_LR.some((e) => e.a === h));
  const GAP = [3, 5, 9, 15];
  const byHen = (h, f) => KANJI_LR.filter((e) => e.a === h && (!f || f(e)));
  const $ = (s) => document.querySelector(s);

  let qs = [], qi = 0, score = 0, cur = null, answered = false;

  function srs() { return Store.d.quiz.srs; }
  function dueList() {
    const n = Store.d.quiz.n;
    return Object.keys(srs()).filter((h) => srs()[h].due <= n && HEN[h]).sort((a, b) => srs()[a].due - srs()[b].due);
  }
  function others(h, n, pool) {
    const lab = henLabel(h);
    return U.shuffle((pool || HENS).filter((x) => x !== h && henLabel(x) !== lab)).slice(0, n);
  }

  function makeQ(h, used) {
    const easy = byHen(h, (e) => e.g <= 3);
    const hard = byHen(h, (e) => e.g >= 4 && e.g <= 7);
    const types = ['shape', 'name', 'which'];
    if (easy.length) types.push('nakama');
    if (hard.length && HEN[h].mean) types.push('guess', 'guess');
    let t = U.pick(types.filter((x) => !used.has(x) || types.length <= 2));
    const q = { t, h };
    if (t === 'shape' || t === 'which') {
      q.choices = U.shuffle([h].concat(others(h, 2)));
      if (t === 'which') q.e = U.pick(easy.length ? easy : byHen(h));
    } else if (t === 'name') {
      q.choices = U.shuffle([h].concat(others(h, 2)));
    } else if (t === 'nakama') {
      q.e = U.pick(easy);
      const wrong = U.shuffle(KANJI_LR.filter((e) => e.g <= 3 && e.a !== h && henLabel(e.a) !== henLabel(h))).slice(0, 2);
      q.choices = U.shuffle([q.e].concat(wrong));
    } else if (t === 'guess') {
      q.e = U.pick(hard);
      const means = new Set([HEN[h].mean]);
      const alt = U.shuffle(BASIC.filter((x) => x !== h && HEN[x].mean)).filter((x) => {
        if (means.has(HEN[x].mean)) return false;
        means.add(HEN[x].mean); return true;
      }).slice(0, 2);
      q.choices = U.shuffle([h].concat(alt));
    }
    return q;
  }

  function buildRound() {
    const list = [];
    const due = dueList().slice(0, 4);
    const used = new Set();
    due.forEach((h) => list.push(h));
    while (list.length < ROUND) {
      const pool = Math.random() < 0.75 ? BASIC : HENS;
      const h = U.pick(pool);
      if (list.slice(-3).includes(h)) continue;
      list.push(h);
    }
    return U.shuffle(list).map((h) => { const q = makeQ(h, used); used.add(q.t); if (used.size >= 4) used.clear(); return q; });
  }

  function henCarHtml(h, cls) {
    const c = Train.car({ role: 'L', ch: h, label: '' });
    c.removeAttribute('tabindex'); c.removeAttribute('role'); c.removeAttribute('aria-label');
    if (cls) c.classList.add(cls);
    return c.outerHTML;
  }

  function render() {
    cur = qs[qi];
    answered = false;
    $('#quiz-prog').textContent = `${qi + 1}/${qs.length}`;
    $('#quiz-feedback').innerHTML = '';
    $('#quiz-feedback').className = 'quiz-feedback';
    $('#quiz-next').hidden = true;
    $('#quiz-hint').hidden = false;
    const q = cur;
    const box = $('#quiz-q');
    const ch = $('#quiz-choices');
    box.dataset.type = q.t;
    box.dataset.answer = q.t === 'nakama' ? q.e.k : q.h;
    ch.className = 'quiz-choices';
    let say = '';
    if (q.t === 'shape') {
      box.innerHTML = `<p class="q-text">この へん の なまえ は？</p><div class="q-car">${henCarHtml(q.h)}</div>`;
      ch.innerHTML = q.choices.map((h) => `<button class="choice" type="button" data-v="${h}">${U.esc(henLabel(h))}</button>`).join('');
      say = 'この へん の なまえ は？';
    } else if (q.t === 'name') {
      box.innerHTML = `<p class="q-text">「<b>${U.esc(henLabel(q.h))}</b>」は どれ？</p><button class="pill" type="button" id="q-say">🔊 もういちど きく</button>`;
      ch.classList.add('cars');
      ch.innerHTML = q.choices.map((h) => `<button class="choice car-choice" type="button" data-v="${h}" aria-label="${h}">${henCarHtml(h)}</button>`).join('');
      say = `${HEN[q.h].name} は どれ？`;
      $('#q-say').onclick = () => { const w = Sound.voice; Sound.voice = true; Sound.speak(say); Sound.voice = w; };
    } else if (q.t === 'nakama') {
      box.innerHTML = `<p class="q-text">「<b>${U.esc(henLabel(q.h))}</b>」の なかま は どれ？</p><div class="q-car small">${henCarHtml(q.h)}</div>`;
      ch.classList.add('kanji');
      ch.innerHTML = q.choices.map((e) => `<button class="choice kanji-choice" type="button" data-v="${e.k}" lang="ja">${U.esc(e.k)}</button>`).join('');
      say = `${HEN[q.h].name} の なかま は どれ？`;
    } else if (q.t === 'which') {
      box.innerHTML = `<p class="q-text">この かんじ の へん は なに？</p>
        <div class="q-kanji" lang="ja"><ruby>${U.esc(q.e.k)}<rt>${U.esc(U.kataToHira(q.e.yomi.split('・')[0]).replace(/[()]/g, ''))}</rt></ruby></div>
        <p class="q-sub">れい：${U.ruby(q.e.ex.w, q.e.ex.y)}</p>`;
      ch.innerHTML = q.choices.map((h) => `<button class="choice" type="button" data-v="${h}">${U.esc(henLabel(h))}</button>`).join('');
      say = 'この かんじ の へん は なに？';
    } else if (q.t === 'guess') {
      box.innerHTML = `<p class="q-text">しらない かんじ でも だいじょうぶ！<br>この かんじ は なに に かんけい ありそう？</p>
        <div class="q-kanji unknown" lang="ja">${U.esc(q.e.k)}</div><p class="q-sub">ヒント：ひだり の へん を みてね</p>`;
      ch.innerHTML = q.choices.map((h) => `<button class="choice" type="button" data-v="${h}">${U.esc(HEN[h].mean)}</button>`).join('');
      say = 'この かんじ は なに に かんけい ありそう？';
    }
    ch.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => answer(b)));
    Sound.speak(say);
  }

  function updateSrs(h, ok) {
    const s = srs();
    const n = Store.d.quiz.n;
    if (!ok) { s[h] = { box: 0, due: n + GAP[0] }; return; }
    if (s[h]) {
      const box = s[h].box + 1;
      if (box >= GAP.length) delete s[h];
      else s[h] = { box, due: n + GAP[box] };
    }
  }

  function answer(btn) {
    if (answered) return;
    answered = true;
    const q = cur;
    const v = btn.dataset.v;
    const right = q.t === 'nakama' ? q.e.k : q.h;
    const ok = v === right;
    Store.d.quiz.n++;
    updateSrs(q.h, ok);
    Store.save();
    document.querySelectorAll('#quiz-choices .choice').forEach((b) => {
      b.disabled = true;
      if (b.dataset.v === right) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
    });
    const H = HEN[q.h];
    let why = `<b>${U.esc(henLabelFull(q.h))}</b>（<span lang="ja">${U.esc(q.h)}</span>）は「${U.esc(H.mean)}」の しるし。${U.esc(H.desc)}。`;
    if (q.e) {
      const e = q.e;
      why += `<br><span class="fb-k" lang="ja">${U.esc(e.k)}</span> ＝ ${U.esc(e.a)} ＋ ${U.esc(e.b)}　${U.ruby(e.ex.w, e.ex.y)}（${U.esc(e.imi)}）`;
    }
    if (q.t === 'guess' && ok) why = `${U.esc(henLabel(q.h))} だから「${U.esc(H.mean)}」 に かんけい ありそう、と かんがえたね！<br>` + why;
    const fb = $('#quiz-feedback');
    fb.className = 'quiz-feedback ' + (ok ? 'ok' : 'ng');
    fb.innerHTML = (ok ? '⭕ せいかい！ ' : '❌ ざんねん… ') + why;
    if (ok) { score++; Sound.play('ok'); } else Sound.play('ng');
    Sound.speak(ok ? 'せいかい！' : `こたえ は ${H.name}`);
    $('#quiz-hint').hidden = true;
    $('#quiz-next').hidden = false;
    $('#quiz-next').textContent = qi + 1 < qs.length ? 'つぎ ▶' : 'けっか ▶';
    $('#quiz-next').focus({ preventScroll: true });
    showSrs();
  }

  function showSrs() {
    const s = Object.keys(srs()).filter((h) => HEN[h]);
    $('#quiz-srs').textContent = s.length ? `🔁 また でる へん：${s.map((h) => henLabel(h)).join('・')}` : '';
  }

  function hint() {
    const q = cur;
    const H = HEN[q.h];
    let t;
    if (q.t === 'guess') t = `この へん は「${henLabel(q.h)}」だよ`;
    else t = `ヒント：この へん は「${H.mean}」に かんけい ある じ に つくよ`;
    const fb = $('#quiz-feedback');
    fb.className = 'quiz-feedback hint';
    fb.textContent = t;
    Sound.speak(t.replace('ヒント：', ''));
  }

  function next() {
    Sound.play('tap');
    qi++;
    if (qi < qs.length) { render(); return; }
    const best = Store.d.quiz.best || 0;
    if (score > best) Store.d.quiz.best = score;
    Store.save();
    App.showClear({
      emoji: score === qs.length ? '🏆' : score >= 7 ? '🎉' : '💪',
      title: `${qs.length}もん ちゅう ${score}もん せいかい！`,
      text: (Object.keys(srs()).length ? 'まちがえた へん は、あとで また でるよ。' : 'へん の なまえ、ばっちり！') + `<br>さいこう きろく：${Math.max(best, score)}もん`,
      buttons: [
        { label: 'もういちど', fn: start },
        { label: 'タイトル へ', fn: () => App.go('title') },
      ],
    });
  }

  function start() {
    qs = buildRound();
    qi = 0; score = 0;
    App.go('quiz');
    render();
    showSrs();
  }

  if (typeof document !== 'undefined') {
    $('#quiz-hint').addEventListener('click', () => { Sound.play('tap'); hint(); });
    $('#quiz-next').addEventListener('click', next);
  }

  return { start, buildRound, makeQ, BASIC, HENS };
})();
