/* たねから はなまで ラボ — 画面の うごき
   データと きまり … data.js（LAB） / え … art.js（ART） / おと … audio.js（Sound） */

(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------------- ふりがな ----------------
     「{漢字|かんじ}」→ <ruby>。ほかの もじは エスケープ する。 */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function ruby(s) {
    return esc(s).replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
  }

  /* ---------------- ほぞん（localStorage は try/catch） ---------------- */
  const KEY = 'shokubutsu-lab:v1';
  const Store = {
    data: { sound: true, view: 'hatsuga', found: {}, grow: {}, cards: [], stamps: {} },
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) Object.assign(this.data, JSON.parse(raw));
      } catch (e) { /* よめなくても あそべる */ }
      if (!Array.isArray(this.data.cards)) this.data.cards = [];
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ほぞん できなくても つづける */ }
    }
  };
  Store.load();

  /* ---------------- スタンプ・おしらせ ---------------- */
  let toastTimer = 0;
  function toast(html) {
    const t = $('#toast');
    t.innerHTML = html;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
  }
  function stamp(id, label) {
    if (Store.data.stamps[id]) return;
    Store.data.stamps[id] = Date.now();
    Store.save();
    renderStamps();
    Sound.stamp();
    toast('⭐ スタンプ ゲット！ ' + ruby(label));
  }
  function renderStamps() { $('#stampCount').textContent = Object.keys(Store.data.stamps).length; }

  /* ---------------- おと ---------------- */
  function renderSound() {
    const b = $('#btnSound');
    b.setAttribute('aria-pressed', Store.data.sound ? 'true' : 'false');
    b.textContent = Store.data.sound ? '🔊 おと' : '🔇 おと';
    Sound.setEnabled(Store.data.sound);
  }
  $('#btnSound').addEventListener('click', () => {
    Store.data.sound = !Store.data.sound;
    Store.save();
    renderSound();
    Sound.tap();
  });
  document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });

  /* ---------------- タブ ---------------- */
  const VIEWS = ['hatsuga', 'seicho', 'sodate', 'hana'];
  function showView(v) {
    if (!VIEWS.includes(v)) v = 'hatsuga';
    VIEWS.forEach((k) => { $('#view-' + k).hidden = k !== v; });
    $$('.dock-btn').forEach((b) => b.classList.toggle('is-on', b.dataset.view === v));
    if (v !== 'sodate') stopPlay();
    Store.data.view = v;
    Store.save();
    window.scrollTo(0, 0);
  }
  $$('.dock-btn').forEach((b) => b.addEventListener('click', () => { Sound.tap(); showView(b.dataset.view); }));

  const POT_NAMES = ['A', 'B', 'C', 'D', 'E'];
  const listNames = (keys) => keys.map((k) => LAB.FACTOR[k].name).join('・');

  /* ================= 1. めが でる じょうけん ================= */
  const H = {
    pots: POT_NAMES.map(() => ({ water: true, air: true, temp: true, light: true, fert: true })),
    day: 0, done: false, sel: [], timer: 0
  };

  function renderPots() {
    const box = $('#pots');
    box.innerHTML = H.pots.map((c, i) => {
      const fc = LAB.fixCond(c);
      const ok = LAB.germinates(c);
      const res = H.done ? (ok ? '<span class="pot-res ok">🌱 めが でた</span>' : '<span class="pot-res ng">✖ でない</span>') : '';
      const tgs = LAB.FACTORS.map((fa) => {
        const on = !!fc[fa.key];
        const locked = (fa.key === 'water' && !fc.air) || (fa.key === 'light' && !fc.temp);
        const why = fa.key === 'water' && locked ? 'しずめて いるので みずは ある' : fa.key === 'light' && locked ? 'れいぞうこの なかは くらい' : (on ? fa.on : fa.off);
        return '<button class="tg' + (on ? '' : ' off') + (locked ? ' locked' : '') + '" data-pot="' + i + '" data-k="' + fa.key + '"' + (locked ? ' disabled' : '') +
          ' aria-pressed="' + on + '" title="' + esc(why) + '"><span class="ti">' + fa.icon + '</span><span class="tl">' + fa.name +
          '<br><span class="tv">' + esc(why) + '</span></span><span>' + (locked ? '🔒' : on ? '⭕' : '✖') + '</span></button>';
      }).join('');
      return '<div class="pot' + (H.sel.includes(i) ? ' sel' : '') + '" data-pot="' + i + '">' +
        '<div class="pot-head"><span class="pot-name">' + POT_NAMES[i] + '</span>' + res + '</div>' +
        ART.cupSVG(c, H.day, H.done) +
        '<div class="toggles">' + tgs + '</div>' +
        '<button class="pot-pick" data-pick="' + i + '"' + (H.done ? '' : ' disabled') + '>' + (H.sel.includes(i) ? '✔ えらんだ' : '👆 くらべる') + '</button>' +
        '</div>';
    }).join('');
    $('#potDay').textContent = H.day + 'にちめ';
  }

  $('#pots').addEventListener('click', (e) => {
    const tg = e.target.closest('.tg');
    if (tg && !tg.disabled) {
      const i = +tg.dataset.pot, k = tg.dataset.k;
      const c = H.pots[i];
      c[k] = !LAB.fixCond(c)[k];
      H.pots[i] = LAB.fixCond(c);
      resetHatsuga(true);
      Sound.tap();
      return;
    }
    const pk = e.target.closest('[data-pick]');
    if (pk && H.done) pick(H, +pk.dataset.pick, renderPots, judgeHatsuga);
  });

  function pick(st, i, render, judge) {
    Sound.tap();
    if (st.sel.length >= 2) st.sel = [];
    const at = st.sel.indexOf(i);
    if (at >= 0) st.sel.splice(at, 1); else st.sel.push(i);
    render();
    if (st.sel.length === 2) judge();
  }

  function resetHatsuga(keepPots) {
    clearInterval(H.timer);
    H.day = 0; H.done = false; H.sel = [];
    if (!keepPots) H.pots = POT_NAMES.map(() => ({ water: true, air: true, temp: true, light: true, fert: true }));
    $('#btnRun').disabled = false;
    setMsg('#cmpMsg', 'はやおくり の あとで、くらべたい コップを <b>2つ</b> タップしてね。', '');
    renderPots();
  }
  $('#btnReset').addEventListener('click', () => { Sound.tap(); resetHatsuga(false); });

  $('#btnRun').addEventListener('click', () => {
    if (H.done) resetHatsuga(true);
    Sound.tap();
    $('#btnRun').disabled = true;
    H.timer = setInterval(() => {
      H.day++;
      if (H.day === 3 && H.pots.some((c) => LAB.germinates(c))) Sound.nyoki();
      if (H.day >= 7) {
        clearInterval(H.timer);
        H.done = true;
        $('#btnRun').disabled = false;
        const n = H.pots.filter((c) => LAB.germinates(c)).length;
        setMsg('#cmpMsg', '7にち たったよ。めが でた コップは ' + n + 'こ。<b>1つ だけ</b> じょうけんが ちがう コップを 2つ えらんで くらべよう。', '');
      }
      renderPots();
    }, 380);
  });

  function setMsg(sel, html, cls) {
    const m = $(sel);
    m.innerHTML = html;
    m.className = 'cmp-msg' + (cls ? ' ' + cls : '');
  }

  function judgeHatsuga() {
    const [i, j] = H.sel;
    const a = H.pots[i], b = H.pots[j];
    const r = LAB.compare(a, b, LAB.germinates);
    const A = POT_NAMES[i], B = POT_NAMES[j];
    const res = (c) => LAB.germinates(c) ? 'めが でた' : 'めが でない';
    if (r.kind === 'same') {
      setMsg('#cmpMsg', A + ' と ' + B + ' は じょうけんが ぜんぶ おなじ だよ。どちらかの じょうけんを 1つ だけ かえて みよう。', 'bad');
      Sound.wrong();
    } else if (r.kind === 'many') {
      let tip = '';
      if (r.diff.includes('temp') && r.diff.includes('light')) tip = '<br>💡 れいぞうこの なかは くらいよ。へやの コップにも 📦 はこを かぶせて「おんど だけ」 ちがう ように しよう。';
      setMsg('#cmpMsg', '🙅 くらべられないよ。' + A + ' と ' + B + ' は ちがう ところが <b>' + r.diff.length + 'つ</b>（' + listNames(r.diff) + '）ある。' +
        'どれの せいか わからないので、<b>1つ だけ</b> ちがう ように しよう。' + tip, 'bad');
      Sound.wrong();
    } else if (r.kind === 'unknown') {
      setMsg('#cmpMsg', 'ちがうのは ' + LAB.FACTOR[r.factor].name + ' だけ。でも どちらも めが でないので、' + LAB.FACTOR[r.factor].name +
        ' が ひつようか わからないよ。ほかの じょうけんを ⭕ に そろえて ためそう。', 'bad');
      Sound.wrong();
    } else {
      const fa = LAB.FACTOR[r.factor];
      const withIt = LAB.fixCond(a)[r.factor] ? a : b, without = withIt === a ? b : a;
      const nW = withIt === a ? A : B, nO = withIt === a ? B : A;
      if (r.kind === 'needed') {
        setMsg('#cmpMsg', '💡 わかった！ ちがうのは ' + fa.icon + fa.name + ' だけ。' + nW + '（' + fa.name + ' あり）は ' + res(withIt) + '、' +
          nO + '（' + fa.name + ' なし）は ' + res(without) + '。<b>' + fa.name + ' は ' + ruby('{発芽|はつが}') + 'に ひつよう！</b>', 'good');
      } else {
        setMsg('#cmpMsg', '💡 わかった！ ちがうのは ' + fa.icon + fa.name + ' だけ。' + fa.name + ' が なくても めが でた。<b>' + fa.name + ' は ' +
          ruby('{発芽|はつが}') + 'には いらない！</b>', 'good');
      }
      Store.data.found[r.factor] = r.kind === 'needed' ? 'need' : 'no';
      Store.save();
      Sound.correct();
      renderFound();
      stamp('h-' + r.factor, fa.name + ' を しらべた');
      if (LAB.FACTORS.every((x) => Store.data.found[x.key])) {
        $('#ansHatsuga').open = true;
        stamp('h-all', '{発芽|はつが}の じょうけん ぜんぶ');
      }
    }
  }

  function renderFound() {
    $('#foundList').innerHTML = LAB.FACTORS.map((fa) => {
      const v = Store.data.found[fa.key];
      return '<li class="' + (v === 'need' ? 'need' : v === 'no' ? 'no' : '') + '">' + fa.icon + ' ' + fa.name + '： ' +
        (v === 'need' ? '⭕ ひつよう' : v === 'no' ? '✖ いらない' : '❓ まだ') + '</li>';
    }).join('');
  }

  /* でんぷん */
  const starchDyed = { before: false, after: false };
  function renderStarch() {
    $('#starch').innerHTML = LAB.STARCH.map((s) =>
      '<div class="st-item"><b>' + ruby(s.name) + '</b>' + ART.starchSVG(s.key, starchDyed[s.key]) +
      (starchDyed[s.key] ? '<p>' + ruby(s.text) + '</p>' : '<button class="big-btn" data-starch="' + s.key + '">💧 ヨウ' + ruby('{素液|そえき}') + 'を たらす</button>') +
      '</div>').join('');
  }
  $('#starch').addEventListener('click', (e) => {
    const b = e.target.closest('[data-starch]');
    if (!b) return;
    starchDyed[b.dataset.starch] = true;
    Sound.water();
    renderStarch();
    if (starchDyed.before && starchDyed.after) stamp('starch', 'でんぷんの へんか');
  });

  /* ================= 2. よく そだつ じょうけん ================= */
  const POT_COLORS = ['#2f9e44', '#1c7ed6', '#e67700'];
  const GKEYS = ['light', 'fert'];
  const Gr = {
    pots: [{ light: true, fert: true }, { light: true, fert: false }, { light: false, fert: true }],
    day: 0, done: false, sel: [], timer: 0, metric: 'cm'
  };
  const condName = (c) => (c.light ? '☀️ひかり⭕' : '📦ひかり✖') + ' ' + (c.fert ? '🧪ひりょう⭕' : '🧪ひりょう✖');

  function renderGrow() {
    $('#growPots').innerHTML = Gr.pots.map((c, i) => {
      const tgs = GKEYS.map((k) => {
        const fa = LAB.FACTOR[k], on = !!c[k];
        return '<button class="tg' + (on ? '' : ' off') + '" data-gpot="' + i + '" data-k="' + k + '" aria-pressed="' + on + '"><span class="ti">' + (k === 'light' && !on ? '📦' : fa.icon) +
          '</span><span class="tl">' + fa.name + '</span><span>' + (on ? '⭕' : '✖') + '</span></button>';
      }).join('');
      return '<div class="pot' + (Gr.sel.includes(i) ? ' sel' : '') + '" style="border-top-color:' + POT_COLORS[i] + '">' +
        '<div class="pot-head"><span class="pot-name" style="color:' + POT_COLORS[i] + '">' + POT_NAMES[i] + '</span></div>' +
        ART.seedlingSVG(c, Gr.day) + '<div class="toggles">' + tgs + '</div>' +
        '<button class="pot-pick" data-gpick="' + i + '"' + (Gr.done ? '' : ' disabled') + '>' + (Gr.sel.includes(i) ? '✔ えらんだ' : '👆 くらべる') + '</button></div>';
    }).join('');
    $('#growDay').textContent = Gr.day + 'にちめ';
    renderChart();
    renderGrowTable();
  }

  function renderChart() {
    const W = 640, Hh = 250, L = 40, B = 210, T = 16, R = 8;
    const series = Gr.pots.map((c) => LAB.growthSeries(c));
    const m = Gr.metric;
    const maxV = m === 'cm' ? 30 : m === 'add' ? 2 : 12;
    const step = m === 'cm' ? 5 : m === 'add' ? 0.5 : 2;
    const unit = m === 'leaves' ? 'まい' : 'cm';
    const gw = (W - L - R) / LAB.GROWTH_DAYS;
    const bw = (gw - 4) / Gr.pots.length;
    let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="1にちごとの せいちょう グラフ">';
    for (let v = 0; v <= maxV + 1e-9; v += step) {
      const y = B - (v / maxV) * (B - T);
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#e9ecef"/>' +
        '<text x="' + (L - 4) + '" y="' + (y + 4).toFixed(1) + '" font-size="12" text-anchor="end" fill="#5b7262">' + (Math.round(v * 10) / 10) + '</text>';
    }
    s += '<text x="4" y="12" font-size="12" fill="#5b7262">(' + unit + ')</text>';
    for (let d = 1; d <= LAB.GROWTH_DAYS; d++) {
      const gx = L + (d - 1) * gw + 2;
      if (d <= Gr.day) {
        series.forEach((ser, i) => {
          const v = ser[d - 1][m];
          const h = Math.max(1, (Math.min(v, maxV) / maxV) * (B - T));
          s += '<rect x="' + (gx + i * bw).toFixed(1) + '" y="' + (B - h).toFixed(1) + '" width="' + (bw - 1).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + POT_COLORS[i] + '"/>';
        });
      }
      s += '<text x="' + (gx + gw / 2 - 2).toFixed(1) + '" y="' + (B + 16) + '" font-size="12" text-anchor="middle" fill="#5b7262">' + d + '</text>';
    }
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + B + '" y2="' + B + '" stroke="#adb5bd"/>';
    s += '<text x="' + (W - R) + '" y="' + (B + 34) + '" font-size="12" text-anchor="end" fill="#5b7262">にちめ</text>';
    Gr.pots.forEach((c, i) => {
      s += '<rect x="' + (L + i * 200) + '" y="' + (Hh - 14) + '" width="12" height="12" rx="2" fill="' + POT_COLORS[i] + '"/><text x="' + (L + i * 200 + 16) + '" y="' + (Hh - 4) + '" font-size="12" fill="#1f3324">' + POT_NAMES[i] + ' ' + condName(c) + '</text>';
    });
    $('#growChart').innerHTML = s + '</svg>';
  }

  function renderGrowTable() {
    $('#growTable').innerHTML = Gr.pots.map((c, i) => {
      const g = LAB.GROWTH[LAB.growthKey(c)];
      const ser = LAB.growthSeries(c);
      const now = Gr.day ? ser[Gr.day - 1] : { cm: LAB.GROWTH_START.cm, leaves: LAB.GROWTH_START.leaves };
      return '<div class="gt"><b style="color:' + POT_COLORS[i] + '">' + POT_NAMES[i] + '</b> ' + condName(c) + '<br>📏 ' + now.cm + 'cm　🍃 ' + now.leaves + 'まい　' +
        '<span class="sw" style="background:' + g.color + '"></span>' + (Gr.done ? '<br>' + ruby(g.look) : '') + '</div>';
    }).join('');
  }

  $('#growPots').addEventListener('click', (e) => {
    const tg = e.target.closest('[data-gpot]');
    if (tg) {
      const c = Gr.pots[+tg.dataset.gpot];
      c[tg.dataset.k] = !c[tg.dataset.k];
      resetGrow(true);
      Sound.tap();
      return;
    }
    const pk = e.target.closest('[data-gpick]');
    if (pk && Gr.done) pick(Gr, +pk.dataset.gpick, renderGrow, judgeGrow);
  });
  $('#chartSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    Gr.metric = b.dataset.k;
    $$('#chartSeg button').forEach((x) => x.classList.toggle('is-on', x === b));
    Sound.tap();
    renderChart();
  });

  function resetGrow(keep) {
    clearInterval(Gr.timer);
    Gr.day = 0; Gr.done = false; Gr.sel = [];
    if (!keep) Gr.pots = [{ light: true, fert: true }, { light: true, fert: false }, { light: false, fert: true }];
    $('#btnGrow').disabled = false;
    setMsg('#growMsg', 'はやおくり の あとで、なえを <b>2つ</b> タップしてね。', '');
    renderGrow();
  }
  $('#btnGrowReset').addEventListener('click', () => { Sound.tap(); resetGrow(false); });
  $('#btnGrow').addEventListener('click', () => {
    if (Gr.done) resetGrow(true);
    Sound.tap();
    $('#btnGrow').disabled = true;
    Gr.timer = setInterval(() => {
      Gr.day++;
      if (Gr.day % 4 === 0) Sound.nyoki();
      if (Gr.day >= LAB.GROWTH_DAYS) {
        clearInterval(Gr.timer);
        Gr.done = true;
        $('#btnGrow').disabled = false;
        setMsg('#growMsg', '14にち たったよ。グラフと なえを みて、<b>1つ だけ</b> じょうけんが ちがう なえを 2つ えらんで くらべよう。', '');
      }
      renderGrow();
    }, 240);
  });

  function judgeGrow() {
    const [i, j] = Gr.sel;
    const a = Gr.pots[i], b = Gr.pots[j];
    const r = LAB.compare(a, b, LAB.growsWell, GKEYS);
    const A = POT_NAMES[i], B = POT_NAMES[j];
    const last = (c) => LAB.growthSeries(c)[LAB.GROWTH_DAYS - 1];
    const desc = (n, c) => n + '（' + last(c).cm + 'cm・はが ' + last(c).leaves + 'まい・' + LAB.GROWTH[LAB.growthKey(c)].look + '）';
    if (r.kind === 'same') {
      setMsg('#growMsg', A + ' と ' + B + ' は じょうけんが おなじ だよ。どちらかを 1つ だけ かえて みよう。', 'bad');
      Sound.wrong();
    } else if (r.kind === 'many') {
      setMsg('#growMsg', '🙅 くらべられないよ。ひかり と ひりょう の 2つが ちがう。どちらの せいか わからないので、1つ だけ ちがう ように しよう。', 'bad');
      Sound.wrong();
    } else if (r.kind === 'unknown') {
      setMsg('#growMsg', 'どちらも よく そだって いないね。もう 1つの じょうけんを ⭕ に して くらべて みよう。<br>' + desc(A, a) + '<br>' + desc(B, b), 'bad');
      Sound.wrong();
    } else {
      const fa = LAB.FACTOR[r.factor];
      setMsg('#growMsg', '💡 わかった！ ' + fa.name + ' が あると よく そだつ。<b>' + fa.name + ' は せいちょうに ひつよう！</b><br>' + desc(A, a) + '<br>' + desc(B, b), 'good');
      Store.data.grow[r.factor] = 'need';
      Store.save();
      Sound.correct();
      renderGrowFound();
      stamp('g-' + r.factor, fa.name + ' と せいちょう');
    }
  }
  function renderGrowFound() {
    $('#growFound').innerHTML = GKEYS.map((k) => {
      const fa = LAB.FACTOR[k];
      return '<li class="' + (Store.data.grow[k] ? 'need' : '') + '">' + fa.icon + ' ' + fa.name + '： ' + (Store.data.grow[k] ? '⭕ よく そだつのに ひつよう' : '❓ まだ') + '</li>';
    }).join('');
  }

  /* ================= 3. そだてて かんさつ ================= */
  const WET_MAX = 4;   // 1かいの みずやりで 4にち もつ
  const S = { pid: 'asagao', day: 0, wet: WET_MAX, timer: 0, waters: 0, stageKey: 'tane' };

  function renderChips() {
    $('#plantChips').innerHTML = LAB.PLANTS.map((p) => '<button class="chip' + (p.id === S.pid ? ' is-on' : '') + '" data-pid="' + p.id + '">' + p.emoji + ' ' + p.name + '</button>').join('');
  }
  $('#plantChips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pid]');
    if (!b) return;
    Sound.tap();
    S.pid = b.dataset.pid;
    resetSodate();
  });

  function resetSodate() {
    stopPlay();
    S.day = 0; S.wet = WET_MAX; S.waters = 0; S.stageKey = 'tane';
    renderChips();
    renderInfo();
    renderScene();
    say('▶ を おすと はやおくり。つちが かわいたら 💧 みずやり してね。');
  }

  function say(html, ng) {
    const m = $('#say');
    m.innerHTML = html;
    m.classList.toggle('ng', !!ng);
  }

  function renderScene() {
    const p = LAB.PLANT[S.pid];
    const dry = S.wet <= 0;
    $('#scene').innerHTML = ART.plantScene(S.pid, S.day, { wet: S.wet / WET_MAX, wilt: dry && S.day > p.days.futaba ? 1 : 0 });
    $('#sDay').textContent = S.day + 'にちめ';
    $('#sStage').textContent = LAB.stageAt(p, S.day).name;
    $('#moist').innerHTML = '💧'.repeat(Math.max(0, S.wet)) + '<span style="opacity:.25">' + '💧'.repeat(WET_MAX - Math.max(0, S.wet)) + '</span>';
    $('#btnWater').classList.toggle('want', S.wet <= 1);
    const now = LAB.stageAt(p, S.day);
    const list = LAB.stageList(p);
    $('#timeline').innerHTML = list.map((s) => '<li class="' + (s.key === now.key ? 'now' : S.day >= s.day ? 'done' : '') + '">' + s.name + ' <small>' + s.day + 'にち</small></li>').join('');
    $('#btnPlay').textContent = S.timer ? '⏸ とめる' : (S.day >= p.days.tane ? '✔ おしまい' : '▶ はやおくり');
    $('#btnPlay').disabled = !S.timer && S.day >= p.days.tane;
  }

  function stageText(p, key) {
    switch (key) {
      case 'me': return 'にょきっ！ めが でたよ。さきに ねが でて、そのあと め が つちの うえへ。';
      case 'futaba': return 'ふたばが ひらいた。' + p.futaba.text;
      case 'honba': return 'ほんばが でた。' + p.honba.text + '（ふたばと かたちが ちがうね）';
      case 'tsuru': return 'つるが のびて きた。' + p.tsuru.text;
      case 'tsubomi': return 'つぼみが できた。';
      case 'hana': return 'はなが さいた！ ' + p.flower.text;
      case 'mi': return 'はなの あとに み が できた。';
      case 'tane2': return 'たねが できた！ ' + p.fruit.text + ' たねから また そだてられるね。';
      default: return '';
    }
  }

  function tick() {
    const p = LAB.PLANT[S.pid];
    if (S.wet <= 0) {
      stopPlay();
      Sound.wrong();
      say('つちが からから！ しおれて きた…。💧 みずやり してね。', true);
      renderScene();
      return;
    }
    S.day++;
    S.wet--;
    const st = LAB.stageAt(p, S.day);
    if (st.key !== S.stageKey) {
      S.stageKey = st.key;
      if (st.key === 'hana') Sound.kiran(); else Sound.nyoki();
      say(ruby(stageText(p, st.key)));
      stopPlay();
      if (st.key === 'tane2') stamp('grow-' + p.id, p.name + ' を そだてた');
    }
    if (S.day >= p.days.tane) stopPlay();
    renderScene();
  }
  function stopPlay() {
    if (S.timer) { clearInterval(S.timer); S.timer = 0; }
    if ($('#btnPlay')) renderPlayBtn();
  }
  function renderPlayBtn() {
    const p = LAB.PLANT[S.pid];
    $('#btnPlay').textContent = S.timer ? '⏸ とめる' : (S.day >= p.days.tane ? '✔ おしまい' : '▶ はやおくり');
    $('#btnPlay').disabled = !S.timer && S.day >= p.days.tane;
  }
  $('#btnPlay').addEventListener('click', () => {
    Sound.tap();
    if (S.timer) { stopPlay(); return; }
    if (S.wet <= 0) { say('さきに 💧 みずやり してね。', true); Sound.wrong(); return; }
    S.timer = setInterval(tick, 420);
    renderPlayBtn();
  });
  $('#btnWater').addEventListener('click', () => {
    Sound.water();
    S.waters++;
    const was = S.wet;
    S.wet = WET_MAX;
    if (was <= 0) say('ごくごく… げんきに なった！ ▶ で つづきを みよう。');
    renderScene();
  });
  $('#btnSReset').addEventListener('click', () => { Sound.tap(); resetSodate(); });

  function renderInfo() {
    const p = LAB.PLANT[S.pid];
    const dots = p.flower.colors.map((c) => '<span class="sw" style="background:' + c + '"></span>').join(' ');
    let tsuru = '';
    if (p.tsuru) {
      tsuru = '<dt>🌀 つる</dt><dd>' + (p.tsuru.kind === 'twine'
        ? '<div class="tsuru-box">' + ART.topView(p.tsuru.dir) + '<span>' + ruby(p.tsuru.text) + '</span></div>'
        : ruby(p.tsuru.text)) + '</dd>';
    }
    $('#plantInfo').innerHTML = '<h3>' + p.emoji + ' ' + p.name + ' <small class="muted">（' + ruby(p.grade) + '）</small></h3><dl>' +
      '<dt>たね</dt><dd>' + ART.seedCard(p) + ' ' + ruby(p.seed.text) + '</dd>' +
      '<dt>ふたば</dt><dd>' + ruby(p.futaba.text) + '</dd>' +
      '<dt>ほんば</dt><dd>' + ruby(p.honba.text) + '</dd>' + tsuru +
      '<dt>はな</dt><dd>' + dots + ' ' + ruby(p.flower.text) + '</dd>' +
      '<dt>み・たね</dt><dd>' + ruby(p.fruit.text) + '</dd></dl>' +
      '<p class="muted">にっすうは めやす。そだてる ばしょや てんきで かわるよ。</p>';
  }

  /* かんさつ カード */
  let cmLeaves = 0;
  function openCard() {
    stopPlay();
    const p = LAB.PLANT[S.pid];
    $('#cmTitle').textContent = '📝 ' + p.name + ' の かんさつ カード';
    $('#cmScene').innerHTML = ART.plantScene(S.pid, S.day, { wet: S.wet / WET_MAX });
    $('#cmMeta').textContent = S.day + 'にちめ（' + LAB.stageAt(p, S.day).name + '）';
    $('#cmHeight').value = '';
    $('#cmNote').value = '';
    cmLeaves = 0;
    $('#cmLeaves').textContent = '0';
    $('#cmMsg').textContent = '';
    $('#cmSave').disabled = false;
    $('#cardModal').hidden = false;
  }
  $('#btnCard').addEventListener('click', () => { Sound.tap(); openCard(); });
  $('#cmClose').addEventListener('click', () => { Sound.tap(); $('#cardModal').hidden = true; });
  $('#cardModal').addEventListener('click', (e) => { if (e.target.id === 'cardModal') $('#cardModal').hidden = true; });
  $('#lfMinus').addEventListener('click', () => { cmLeaves = Math.max(0, cmLeaves - 1); $('#cmLeaves').textContent = cmLeaves; Sound.tap(); });
  $('#lfPlus').addEventListener('click', () => { cmLeaves = Math.min(40, cmLeaves + 1); $('#cmLeaves').textContent = cmLeaves; Sound.tap(); });
  $('#cmSave').addEventListener('click', () => {
    const p = LAB.PLANT[S.pid];
    const raw = $('#cmHeight').value.trim();
    const h = raw === '' ? NaN : Number(raw);
    if (!isFinite(h) || h < 0) {
      $('#cmMsg').textContent = 'たかさを すうじで いれてね（めが でて いなければ 0）。';
      $('#cmMsg').className = 'say ng';
      Sound.wrong();
      return;
    }
    const realH = LAB.heightAt(p, S.day), realL = LAB.leavesAt(p, S.day);
    const tol = Math.max(1, ART.frameFor(Math.max(realH, 1)).minor);
    const okH = Math.abs(h - realH) <= tol, okL = cmLeaves === realL;
    const card = { pid: p.id, day: S.day, stage: LAB.stageAt(p, S.day).name, h, leaves: cmLeaves, realH, realL, note: $('#cmNote').value.trim().slice(0, 40), t: Date.now() };
    Store.data.cards.unshift(card);
    Store.data.cards = Store.data.cards.slice(0, 60);
    Store.save();
    $('#cmMsg').innerHTML = (okH ? '📏 ばっちり！' : '📏 ものさしでは だいたい ' + realH + 'cm だよ。') + '　' + (okL ? '🍃 はの かずも せいかい！' : '🍃 ほんばは ' + realL + 'まい だよ。');
    $('#cmMsg').className = 'say' + (okH && okL ? '' : ' ng');
    $('#cmSave').disabled = true;
    if (okH && okL) Sound.correct(); else Sound.tap();
    stamp('card', 'はじめての かんさつ カード');
    renderCards();
  });

  function renderCards() {
    const cards = Store.data.cards;
    if (!cards.length) { $('#cards').innerHTML = '<p class="muted">まだ ないよ。📝 を おして かこう。</p>'; return; }
    $('#cards').innerHTML = cards.slice(0, 24).map((c) => {
      const p = LAB.PLANT[c.pid];
      if (!p) return '';
      const okH = Math.abs(c.h - c.realH) <= Math.max(1, ART.frameFor(Math.max(c.realH, 1)).minor);
      return '<div class="kcard"><b>' + p.emoji + ' ' + p.name + '</b><br>' + c.day + 'にちめ・' + esc(c.stage) +
        '<br>📏 ' + c.h + 'cm <span class="' + (okH ? 'ok' : 'ng') + '">' + (okH ? '⭕' : '（' + c.realH + '）') + '</span>' +
        '<br>🍃 ' + c.leaves + 'まい <span class="' + (c.leaves === c.realL ? 'ok' : 'ng') + '">' + (c.leaves === c.realL ? '⭕' : '（' + c.realL + '）') + '</span>' +
        (c.note ? '<br>✏️ ' + esc(c.note) : '') + '</div>';
    }).join('');
  }

  /* ================= 4. はなの つくり ================= */
  const F = { kind: 'asagao', mode: 'look', quiz: null, quizOk: 0 };
  const FLOWER_KINDS = ['asagao', 'hechimaO', 'hechimaM'];
  function renderFlowerChips() {
    $('#flowerChips').innerHTML = FLOWER_KINDS.map((k) => '<button class="chip' + (k === F.kind ? ' is-on' : '') + '" data-fk="' + k + '">' +
      (k === 'asagao' ? '🌺 ' : '🥒 ') + LAB.FLOWERS[k].name + '</button>').join('');
  }
  function renderFlower() {
    $('#flower').innerHTML = ART.flowerParts(F.kind);
    if (F.mode === 'quiz') nextQuiz();
    else partMsg(ruby(LAB.FLOWERS[F.kind].text) + ' どこでも タップ してね。');
  }
  function partMsg(html, ng) {
    $('#partMsg').innerHTML = html;
    $('#partMsg').classList.toggle('ng', !!ng);
  }
  function nextQuiz() {
    const parts = LAB.FLOWERS[F.kind].parts;
    let k;
    do { k = parts[Math.floor(Math.random() * parts.length)]; } while (parts.length > 1 && k === F.quiz);
    F.quiz = k;
    partMsg('❓ <b>' + ruby(LAB.PARTS[k].name) + '</b> は どれ？ タップしてね。');
  }
  $('#flowerChips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-fk]');
    if (!b) return;
    Sound.tap();
    F.kind = b.dataset.fk;
    renderFlowerChips();
    renderFlower();
    const game = F.kind === 'asagao' ? 'asagao' : 'hechima';
    if (game !== P.game) { P.game = game; resetPollen(); }
  });
  $('#partSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    Sound.tap();
    F.mode = b.dataset.k;
    $$('#partSeg button').forEach((x) => x.classList.toggle('is-on', x === b));
    renderFlower();
  });
  $('#flower').addEventListener('click', (e) => {
    const g = e.target.closest('[data-part]');
    if (!g) return;
    const k = g.dataset.part;
    $$('#flower .part').forEach((x) => x.classList.toggle('hit', x === g));
    const part = LAB.PARTS[k];
    if (F.mode === 'look') {
      Sound.tap();
      partMsg('これは <b>' + ruby(part.name) + '</b>。' + ruby(part.text));
    } else if (k === F.quiz) {
      Sound.correct();
      F.quizOk++;
      partMsg('⭕ せいかい！ ' + ruby(part.name) + '。' + ruby(part.text));
      if (F.quizOk >= 3) stamp('quiz', 'はなの つくり クイズ');
      setTimeout(() => { if (F.mode === 'quiz') nextQuiz(); }, 1500);
    } else {
      Sound.wrong();
      partMsg('✖ そこは ' + ruby(part.name) + ' だよ。<b>' + ruby(LAB.PARTS[F.quiz].name) + '</b> を さがしてね。', true);
    }
  });

  /* {受粉|じゅふん} じっけん
     アサガオ … ほかの アサガオ（花粉）→ A・B（つぼみの うちに おしべを とって ふくろ）
     ヘチマ … おばな（花粉）→ めばな A・B（ふくろ） */
  const P = { game: 'asagao', tool: null, loaded: false, a: {}, b: {}, done: false };

  function resetPollen() {
    P.tool = null; P.loaded = false; P.done = false;
    P.a = { pollinated: false, stamensRemoved: true, bagged: true };
    P.b = { pollinated: false, stamensRemoved: true, bagged: true };
    renderPollen();
    $('#pMsg').textContent = '';
  }

  function pTarget() { return P.game === 'asagao' ? 'asagao' : 'hechimaM'; }

  function renderPollen() {
    const asa = P.game === 'asagao';
    $('#pSteps').innerHTML = asa
      ? '① A・B は <b>つぼみの うちに おしべを とって</b> ふくろを かぶせたよ。② はなが さいたら 🖌️ ふでで <b>ほかの はなの おしべ</b> に タッチ → <b>A の めしべ</b> に タッチ。B には つけない。③ ▶ で けっかを みよう。'
      : '① めばな A・B に ふくろを かぶせたよ（むしが こない）。② 🖌️ ふで か 🐝 で <b>おばなの おしべ</b> に タッチ → <b>めばな A の めしべ</b> に タッチ。③ ▶ で けっかを みよう。';
    const tools = asa ? [['brush', '🖌️ ふで']] : [['brush', '🖌️ ふで'], ['bee', '🐝 はち']];
    $('#pTools').innerHTML = tools.map(([k, n]) => '<button class="tool' + (P.tool === k ? ' is-on' : '') + '" data-tool="' + k + '">' + n + '</button>').join('') +
      (P.loaded ? '<span class="muted">✨ ' + ruby('{花粉|かふん}') + 'が ついてる</span>' : '');
    const src = asa ? 'asagao' : 'hechimaO';
    const col = (id, title, html, extra) => '<div class="pflower" data-pf="' + id + '"><b>' + title + '</b>' + html + '<span class="flag">' + (extra || '') + '</span></div>';
    const tgt = pTarget();
    const one = (id, st) => {
      if (P.done) {
        const ok = LAB.makesFruit({ flower: tgt, pollinated: st.pollinated, stamensRemoved: st.stamensRemoved, bagged: st.bagged });
        return ART.fruitResult(tgt, ok);
      }
      return ART.flowerParts(tgt, { bag: st.bagged, hide: { oshibe: asa && st.stamensRemoved }, pollen: st.pollinated ? 8 : 0 });
    };
    const flag = (st) => (st.pollinated ? '🟡 ' + ruby('{花粉|かふん}') + ' ついた' : '⚪ ' + ruby('{花粉|かふん}') + ' なし') +
      (asa ? '<br><button class="mini' + (st.stamensRemoved ? '' : ' is-on') + '" data-stamen="' + (st === P.a ? 'a' : 'b') + '"' + (P.done ? ' disabled' : '') + '>' +
        (st.stamensRemoved ? '✂️ おしべ とった' : '🌼 おしべ のこす') + '</button>' : '');
    $('#pGame').innerHTML =
      col('src', asa ? 'ほかの アサガオ' : 'おばな', ART.flowerParts(src), ruby('{花粉|かふん}') + 'を とる はな') +
      col('a', asa ? 'A' : 'めばな A', one('a', P.a), flag(P.a)) +
      col('b', asa ? 'B' : 'めばな B', one('b', P.b), flag(P.b)) +
      '<span class="brush' + (P.loaded ? ' loaded' : '') + '" id="brush"' + (P.tool ? '' : ' hidden') + '>' + (P.tool === 'bee' ? '🐝' : '🖌️') + '</span>';
    $('#pGame').style.touchAction = P.tool ? 'none' : 'pan-y';
    $('#btnPollen').disabled = P.done;
    placeBrush(null);
  }

  let brushXY = null;
  function placeBrush(pt) {
    const b = $('#brush');
    if (!b) return;
    if (pt) brushXY = pt;
    if (!brushXY) {
      const r = $('#pGame').getBoundingClientRect();
      brushXY = { x: r.width * .15, y: r.height * .2 };
    }
    b.style.left = brushXY.x + 'px';
    b.style.top = brushXY.y + 'px';
  }

  $('#pTools').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]');
    if (!b || P.done) return;
    Sound.tap();
    P.tool = P.tool === b.dataset.tool ? null : b.dataset.tool;
    renderPollen();
  });
  $('#pGame').addEventListener('click', (e) => {
    const b = e.target.closest('[data-stamen]');
    if (!b || P.done) return;
    const st = P[b.dataset.stamen];
    st.stamensRemoved = !st.stamensRemoved;
    Sound.tap();
    renderPollen();
    if (!st.stamensRemoved) $('#pMsg').innerHTML = ruby('おしべを のこすと どう なるかな？ ためして みよう。');
  });

  let dragging = false;
  function brushAt(e) {
    if (!P.tool || P.done) return;
    const r = $('#pGame').getBoundingClientRect();
    placeBrush({ x: e.clientX - r.left, y: e.clientY - r.top });
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    const part = el.closest('[data-part]'), pf = el.closest('[data-pf]');
    if (!part || !pf) return;
    const who = pf.dataset.pf;
    if (part.dataset.part === 'oshibe' && who === 'src' && !P.loaded) {
      P.loaded = true;
      Sound.tap();
      $('#pMsg').innerHTML = ruby('✨ {花粉|かふん}が ついた！ こんどは めしべの さきに タッチ。');
      renderPollen();
    } else if (part.dataset.part === 'meshibe' && (who === 'a' || who === 'b')) {
      if (!P.loaded) {
        $('#pMsg').innerHTML = ruby('さきに ' + (P.game === 'asagao' ? 'ほかの はなの' : 'おばなの') + ' おしべに タッチして {花粉|かふん}を つけよう。');
        return;
      }
      if (P[who].pollinated) return;
      P[who].pollinated = true;
      P.loaded = false;
      Sound.kiran();
      $('#pMsg').innerHTML = ruby('🟡 ' + (who === 'a' ? 'A' : 'B') + ' の めしべに {花粉|かふん}が ついた（{受粉|じゅふん}）！');
      renderPollen();
    }
  }
  $('#pGame').addEventListener('pointerdown', (e) => {
    if (!P.tool || e.target.closest('button')) return;
    dragging = true;
    e.preventDefault();
    brushAt(e);
  });
  $('#pGame').addEventListener('pointermove', (e) => { if (dragging) brushAt(e); });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointercancel', () => { dragging = false; });

  $('#btnPollen').addEventListener('click', () => {
    if (P.done) return;
    P.done = true;
    P.tool = null;
    const tgt = pTarget();
    const ra = LAB.makesFruit(Object.assign({ flower: tgt }, P.a));
    const rb = LAB.makesFruit(Object.assign({ flower: tgt }, P.b));
    renderPollen();
    const nm = (k) => (P.game === 'asagao' ? '' : 'めばな ') + k;
    let msg = '';
    const line = (k, st, ok) => {
      if (ok && st.pollinated) return nm(k) + ' は {花粉|かふん}が ついて み が できた。';
      if (ok) return nm(k) + ' は おしべを とらなかったので、じぶんの {花粉|かふん}で {受粉|じゅふん}して み が できた。';
      return nm(k) + ' は {花粉|かふん}が つかず、み が できずに かれた。';
    };
    msg = line('A', P.a, ra) + ' ' + line('B', P.b, rb);
    if (ra !== rb) msg += ' → <b>{受粉|じゅふん}すると めしべの もとが み に なり、なかに たねが できる。</b>';
    else if (!ra) msg += ' → どちらにも {花粉|かふん}を つけて いないね。A に つけて くらべよう。';
    else msg += ' → どちらも み が できたので、くらべられないね。';
    if (P.game === 'asagao' && (!P.a.stamensRemoved || !P.b.stamensRemoved)) msg += '<br>💡 アサガオは つぼみの なかで {受粉|じゅふん}する。だから つぼみの うちに おしべを とるんだね。';
    $('#pMsg').innerHTML = ruby(msg).replace(/&lt;(\/?)(b|br)&gt;/g, '<$1$2>');
    if (ra !== rb) { Sound.kiran(); stamp('pollen-' + P.game, '{受粉|じゅふん}と み'); } else Sound.tap();
  });
  $('#btnPReset').addEventListener('click', () => { Sound.tap(); resetPollen(); });

  /* ---------------- はじめ ---------------- */
  renderSound();
  renderStamps();
  renderPots();
  renderFound();
  renderStarch();
  renderGrow();
  renderGrowFound();
  resetSodate();
  renderCards();
  renderFlowerChips();
  renderFlower();
  resetPollen();
  showView(Store.data.view);
})();
