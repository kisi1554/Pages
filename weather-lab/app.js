/* あしたの てんきやさん — 画面の くみたてと そうさ */

(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };


  /* ---------------- ふりがな ----------------
     漢字に <ruby> で よみがなを つける。ながい ことばから さきに ならべる。 */
  const RUBY = [
    ['降水確率', 'こうすいかくりつ'], ['上着', 'うわぎ'], ['時間', 'じかん'],
    ['天気', 'てんき'], ['気温', 'きおん'], ['気圧', 'きあつ'], ['湿度', 'しつど'],
    ['太陽', 'たいよう'], ['台風', 'たいふう'], ['梅雨', 'つゆ'], ['日本', 'にほん'],
    ['正解', 'せいかい'], ['予報', 'よほう'], ['上下', 'じょうげ'],
    ['水', 'みず'], ['雨', 'あめ'], ['雲', 'くも'], ['風', 'かぜ'], ['雪', 'ゆき'],
    ['山', 'やま'], ['海', 'うみ'], ['川', 'かわ'], ['空', 'そら'], ['土', 'つち'],
    ['日', 'ひ'], ['上', 'うえ'], ['中', 'なか'], ['大', 'おお'], ['小', 'ちい'],
    ['見', 'み'], ['答', 'こた'], ['合', 'あ'], ['回', 'かい'], ['町', 'まち'],
    ['目', 'め'], ['北', 'きた'], ['南', 'みなみ'], ['力', 'ちから'], ['出', 'で'],
    ['音', 'おと'], ['絵', 'え'], ['子', 'こ']
  ];
  const RUBY_MAP = {};
  RUBY.forEach(r => { RUBY_MAP[r[0]] = r[1]; });
  const RUBY_RE = new RegExp('(' + RUBY.map(r => r[0]).join('|') + ')', 'g');

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* すでに ruby の 中に ある もじは さわらないので、なんど よんでも あんぜん。 */
  function rubyize(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const targets = [];
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.nodeValue || !n.parentNode) continue;
      if (n.parentNode.closest('ruby')) continue;
      RUBY_RE.lastIndex = 0;
      if (RUBY_RE.test(n.nodeValue)) targets.push(n);
    }
    targets.forEach(n => {
      const span = document.createElement('span');
      span.innerHTML = esc(n.nodeValue).replace(RUBY_RE,
        m => '<ruby>' + m + '<rt>' + RUBY_MAP[m] + '</rt></ruby>');
      n.parentNode.replaceChild(span, n);
    });
  }

  let city = CITIES.find(c => c.id === Store.get('city')) || CITIES[3];
  let data = null;          // いま ひょうじしている 天気データ
  let currentView = 'yohou';

  /* ---------------- おしらせ ---------------- */
  let toastTimer = 0;
  function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2600);
  }

  /* ---------------- スタンプ ---------------- */
  function addStamp(n) {
    Store.update(s => { s.stamps += n; });
    $('#stampCount').textContent = Store.get('stamps');
    Sound.stamp();
  }

  /* ---------------- 日づけの ことば ---------------- */
  const WD = ['にち', 'げつ', 'か', 'すい', 'もく', 'きん', 'ど'];
  function weekday(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  }
  function mmdd(dateStr) {
    const [, m, d] = dateStr.split('-').map(Number);
    return m + '/' + d;
  }
  function dayWord(dateStr, today) {
    if (dateStr === today) return 'きょう';
    if (dateStr === Weather.addDays(today, 1)) return 'あした';
    if (dateStr === Weather.addDays(today, 2)) return 'あさって';
    if (dateStr === Weather.addDays(today, -1)) return 'きのう';
    if (dateStr === Weather.addDays(today, -2)) return 'おととい';
    return mmdd(dateStr);
  }

  /* ================= よほう ================= */
  function buildChips() {
    const box = $('#cityChips');
    box.innerHTML = '';
    CITIES.forEach(c => {
      const b = el('button', 'chip', c.name);
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', c.id === city.id ? 'true' : 'false');
      b.addEventListener('click', () => {
        if (c.id === city.id) return;
        Sound.tap();
        city = c;
        Store.set('city', c.id);
        buildChips();
        loadCity();
      });
      box.appendChild(b);
    });
  }

  function loadCity() {
    $('#sourceNote').textContent = city.name + 'の よほうを よみこみちゅう…';
    $('#sourceNote').classList.remove('demo');
    Weather.load(city).then(d => {
      data = d;
      renderForecast();
      renderGuess();
    });
  }

  function todayRow() {
    if (!data) return null;
    return data.daily.find(d => d.date === data.today) || data.daily[Math.min(2, data.daily.length - 1)];
  }

  function renderForecast() {
    const note = $('#sourceNote');
    if (data.demo) {
      note.textContent = '⚠️ ネットに つながらないので「おためし天気」を みせているよ（ほんものでは ないよ）';
      note.classList.add('demo');
    } else if (data.stale) {
      note.textContent = '📶 さっき とっておいた ' + city.name + 'の よほう（いまは つながらないよ）';
      note.classList.remove('demo');
    } else {
      note.textContent = '📡 ' + city.name + '（' + city.area + '）の ほんものの よほう ／ Open-Meteo';
      note.classList.remove('demo');
    }

    const t = todayRow();
    const cur = data.current;
    const info = wmoInfo(cur.code != null ? cur.code : t.code);

    $('#todayMark').textContent = info.mark;
    $('#todayLabel').textContent = info.label;
    $('#todayMax').textContent = t ? Math.round(t.tmax) : '--';
    $('#todayMin').textContent = t ? Math.round(t.tmin) : '--';
    $('#todayNow').textContent = 'いま ' + (cur.temp != null ? Math.round(cur.temp * 10) / 10 + '℃' : '--') +
      (data.now ? '（' + data.now.slice(11, 16) + ' げんざい）' : '');

    const facts = $('#todayFacts');
    facts.innerHTML = '';
    const addFact = (k, v) => facts.appendChild(el('div', 'fact',
      '<span class="k">' + k + '</span><span class="v">' + v + '</span>'));
    addFact('あめの かくりつ', (t && t.pop != null ? t.pop : '--') + '%');
    addFact('しめりけ', (cur.humidity != null ? Math.round(cur.humidity) : '--') + '%');
    addFact('かぜ', (cur.wind != null ? Math.round(cur.wind) : '--') + 'km/h');
    addFact('きあつ', (cur.pressure != null ? Math.round(cur.pressure) : '--') + 'hPa');
    if (t && t.sunrise) addFact('ひので', t.sunrise.slice(11, 16));
    if (t && t.sunset) addFact('ひのいり', t.sunset.slice(11, 16));

    /* りゆう */
    $('#story').textContent = Weather.story(data);
    const rbox = $('#reasons');
    rbox.innerHTML = '';
    Weather.reasons(data).forEach(r => {
      const card = el('div', 'reason');
      card.innerHTML =
        '<div class="reason-head"><span class="e">' + r.emoji + '</span>' +
        '<span class="k">' + r.label + '</span><span class="v">' + r.value + '</span></div>' +
        '<div class="bar"><i style="width:' + Math.round(r.level * 100) + '%"></i></div>' +
        '<p>' + r.text + '</p>';
      rbox.appendChild(card);
    });

    /* 1しゅうかん（きょうから さき） */
    const wbox = $('#week');
    wbox.innerHTML = '';
    data.daily.filter(d => d.date >= data.today).forEach(d => {
      const wi = wmoInfo(d.code);
      const wd = weekday(d.date);
      const cls = wd === 0 ? ' sun' : wd === 6 ? ' sat' : '';
      const box = el('div', 'day' + (d.date === data.today ? ' is-today' : ''));
      const head = ['きょう', 'あした', 'あさって'].indexOf(dayWord(d.date, data.today)) >= 0
        ? dayWord(d.date, data.today) : WD[wd] + 'よう';
      box.innerHTML =
        '<div class="wd' + cls + '">' + head + '</div>' +
        '<div class="dt">' + mmdd(d.date) + '</div>' +
        '<div class="mk">' + wi.mark + '</div>' +
        '<div class="tt"><span class="h">' + Math.round(d.tmax) + '</span>/<span class="l">' + Math.round(d.tmin) + '</span></div>' +
        '<div class="pp">☔' + (d.pop != null ? d.pop : '--') + '%</div>';
      wbox.appendChild(box);
    });

    /* 時間ごと（いまから 24時間ぶん を 2時間おきに） */
    const hbox = $('#hours');
    hbox.innerHTML = '';
    const nowKey = data.now ? data.now.slice(0, 13) : data.today + 'T00';
    let started = false, count = 0;
    data.hourly.forEach((h, i) => {
      if (!started && h.time.slice(0, 13) >= nowKey) started = true;
      if (!started || count >= 12 || i % 2 !== 0) return;
      count++;
      const wi = wmoInfo(h.code);
      const box = el('div', 'hour');
      box.innerHTML =
        '<div class="hh">' + Number(h.time.slice(11, 13)) + 'じ</div>' +
        '<div class="mk">' + wi.mark + '</div>' +
        '<div class="tp">' + Math.round(h.temp) + '°</div>' +
        '<div class="pp">' + (h.pop != null ? h.pop + '%' : '') + '</div>';
      hbox.appendChild(box);
    });

    rubyize($('#view-yohou'));
  }

  /* ================= よそう ================= */
  function guessFor(dateStr, cityId) {
    return Store.get('guesses').find(g => g.date === dateStr && g.city === cityId);
  }

  /* 天気が わかった よそうを こたえあわせする */
  function judgeGuesses() {
    if (!data) return;
    let newHits = 0, judged = 0;
    Store.update(s => {
      s.guesses.forEach(g => {
        if (g.result || g.city !== data.cityId) return;
        const row = data.daily.find(d => d.date === g.date);
        if (!row || g.date > data.today) return;
        const actual = wmoInfo(row.code).kind;
        const hit = KIND_FAMILY[actual] === KIND_FAMILY[g.kind];
        g.result = hit ? 'ok' : 'ng';
        g.actual = actual;
        g.actualCode = row.code;
        s.tries += 1;
        judged++;
        if (hit) { s.hits += 1; newHits++; }
      });
      /* ふるすぎて こたえあわせ できなかった ものは かたづける */
      s.guesses = s.guesses.filter(g => g.result || g.date >= Weather.addDays(data.today, -1));
    });
    if (newHits > 0) {
      addStamp(newHits);
      toast('よそうが ' + newHits + 'こ あたったよ！ ⭐+' + newHits, 3600);
    } else if (judged > 0) {
      toast('こたえあわせ したよ。つぎは あたるかな？', 3000);
    }
  }

  function renderGuess() {
    if (!data) return;
    judgeGuesses();

    const tomorrow = Weather.addDays(data.today, 1);
    const mine = guessFor(tomorrow, city.id);
    const wd = weekday(tomorrow);

    $('#guessLead').innerHTML =
      '<b>' + city.name + '</b> の <b>' + mmdd(tomorrow) + '（' + WD[wd] + '）</b>の 天気は どれに なると おもう？<br>' +
      'よそうしたら、あした この がめんで こたえあわせ するよ。';

    const grid = $('#guessGrid');
    grid.innerHTML = '';
    GUESS_KINDS.forEach(g => {
      const b = el('button', 'guess-btn');
      b.innerHTML = '<span class="g-mark">' + g.mark + '</span>' +
                    '<span class="g-name">' + g.kind + '</span>' +
                    '<span class="g-hint">' + g.hint + '</span>';
      b.setAttribute('aria-pressed', mine && mine.kind === g.kind ? 'true' : 'false');
      b.addEventListener('click', () => {
        Sound.tap();
        Store.update(s => {
          const found = s.guesses.find(x => x.date === tomorrow && x.city === city.id);
          if (found) { found.kind = g.kind; }
          else { s.guesses.unshift({ date: tomorrow, city: city.id, kind: g.kind, at: Date.now() }); }
          if (s.guesses.length > 40) s.guesses.length = 40;
        });
        toast('「' + g.kind + '」で よそうしたよ！', 2200);
        renderGuess();
      });
      grid.appendChild(b);
    });

    /* あしたの よほうを こっそり くらべる ヒント（答えは 見せない） */
    const st = $('#guessState');
    if (mine) {
      st.innerHTML = '✅ よそう ずみ：<b>' + mine.kind + '</b>。' +
        'あした もういちど ひらくと、ほんとうの 天気と くらべて スタンプが もらえるよ。' +
        '<br><span style="color:#52697f">（えらびなおしも できるよ）</span>';
    } else {
      st.textContent = '';
    }

    $('#scoreTries').textContent = Store.get('tries');
    $('#scoreHits').textContent = Store.get('hits');
    const tries = Store.get('tries');
    $('#scoreRate').textContent = tries ? Math.round(Store.get('hits') / tries * 100) + '%' : '-';

    const hist = $('#history');
    hist.innerHTML = '';
    Store.get('guesses').slice(0, 12).forEach(g => {
      const c = CITIES.find(x => x.id === g.city);
      const row = el('div', 'hist ' + (g.result === 'ok' ? 'ok' : g.result === 'ng' ? 'ng' : 'wait'));
      const actual = g.result ? '→ ほんとうは <b>' + g.actual + '</b> ' + wmoInfo(g.actualCode).mark : '→ こたえあわせ まち';
      row.innerHTML =
        '<span class="h-date">' + mmdd(g.date) + '</span>' +
        '<span class="h-body">' + (c ? c.name : '') + '／よそう <b>' + g.kind + '</b> ' + actual + '</span>' +
        '<span class="h-res">' + (g.result === 'ok' ? '⭕' : g.result === 'ng' ? '❌' : '⏳') + '</span>';
      hist.appendChild(row);
    });

    rubyize($('#view-yosou'));
  }

  /* ================= じっけん ================= */
  function setupLab() {
    Lab.init($('#labCanvas'), {
      onStep: (n) => {
        [...document.querySelectorAll('.lab-step')].forEach((s, i) => s.classList.toggle('is-on', i <= n));
        const tips = [
          '太陽が うみを あたためると、はじまりだよ。',
          '① あたたまった 水が「水じょうき」に なって 上に のぼる＝じょうはつ！',
          '② 上の そらは つめたい。水じょうきが ひえて 小さな 水の つぶ＝雲に なったよ。',
          '③ 雲の 中の つぶが くっついて 大きく なると、おもくて おちてくる＝雨！',
          '④ ふった 雨は かわを ながれて うみへ もどる。水は ぐるぐる まわっているんだ。'
        ];
        $('#labTip').textContent = tips[n] || tips[0];
        if (n === 3 && Lab.get('cold') > 0.62) {
          $('#labTip').textContent = '③ そらが さむいと、水は こおったまま おちてくる＝雪だよ！';
        }
        rubyize($('#labTip'));
      },
      onStat: (s, extra) => {
        $('#labMeters').innerHTML =
          '<div class="meter">🌊 うみの みず ' + Math.round(s.sea) + '</div>' +
          '<div class="meter">☁️ そらの みず ' + Math.round(s.sky) + '</div>' +
          '<div class="meter">💧 ふった あめ ' + Math.round(s.rained) + '</div>' +
          (s.snow > 0.5 ? '<div class="meter">⛄ つもった ゆき ' + Math.round(s.snow) + '</div>' : '');
      }
    });

    const steps = $('#labSteps');
    steps.innerHTML = '';
    ['☀️ あたためる', '💨 じょうはつ', '☁️ くもに なる', '🌧️ あめに なる', '🌊 うみへ もどる']
      .forEach((name, i) => {
        const s = el('div', 'lab-step' + (i === 0 ? ' is-on' : ''), name);
        steps.appendChild(s);
      });

    const bind = (id, key, out) => {
      const input = $(id);
      input.addEventListener('input', () => {
        Lab.set(key, input.value / 100);
        $(out).textContent = input.value;
      });
    };
    bind('#sSun', 'sun', '#vSun');
    bind('#sWind', 'wind', '#vWind');
    bind('#sCold', 'cold', '#vCold');

    let playing = false;
    $('#btnLabPlay').addEventListener('click', () => {
      Sound.unlock();
      playing = !playing;
      if (playing) { Lab.start(); $('#btnLabPlay').textContent = '⏸ とめる'; }
      else { Lab.stop(); $('#btnLabPlay').textContent = '▶ うごかす'; }
    });

    $('#btnLabReset').addEventListener('click', () => {
      Sound.tap();
      Lab.reset();
      [...document.querySelectorAll('.lab-step')].forEach((s, i) => s.classList.toggle('is-on', i === 0));
      $('#labTip').textContent = 'たいようを つよくすると、うみの 水が 水じょうきに なって のぼるよ。';
      rubyize($('#labTip'));
    });

    $('#btnLabToday').addEventListener('click', () => {
      if (!data) return;
      Sound.tap();
      const c = data.current;
      /* いまの すうじを つまみに うつしかえる */
      const sun = Math.max(0.15, 1 - (c.cloud || 50) / 100 * 0.8) * Math.min(1, Math.max(0.3, (c.temp + 5) / 40));
      const wind = Math.min(1, (c.wind || 10) / 40);
      const cold = Math.max(0, Math.min(1, (18 - c.temp) / 26));
      Lab.set('sun', sun); Lab.set('wind', wind); Lab.set('cold', cold);
      $('#sSun').value = Math.round(sun * 100); $('#vSun').textContent = Math.round(sun * 100);
      $('#sWind').value = Math.round(wind * 100); $('#vWind').textContent = Math.round(wind * 100);
      $('#sCold').value = Math.round(cold * 100); $('#vCold').textContent = Math.round(cold * 100);
      toast('いまの ' + city.name + 'の そらに あわせたよ', 2600);
    });
  }

  /* ================= まなぶ ================= */
  /* きせつカードの さしえ（外部画像を つかわず SVG で かく） */
  function seasonArt(kind) {
    const wrap = s => '<svg viewBox="0 0 320 150" role="img" aria-hidden="true">' + s + '</svg>';
    if (kind === 'front') {
      return wrap(
        '<rect width="320" height="150" rx="12" fill="#eaf4fd"/>' +
        '<path d="M0 110 H320" stroke="#9ec9a0" stroke-width="8"/>' +
        '<g fill="#7fb0e0"><circle cx="55" cy="60" r="26"/><circle cx="85" cy="66" r="20"/></g>' +
        '<g fill="#f2b06a"><circle cx="255" cy="62" r="26"/><circle cx="225" cy="68" r="20"/></g>' +
        '<text x="40" y="115" font-size="13" fill="#2f6fb0">つめたい くうき</text>' +
        '<text x="205" y="115" font-size="13" fill="#b3701f">あたたかい くうき</text>' +
        '<path d="M150 100 L160 40 L172 100" fill="none" stroke="#5a5a5a" stroke-width="3" stroke-dasharray="6 5"/>' +
        '<g fill="#4b9ad6"><circle cx="150" cy="46" r="16"/><circle cx="170" cy="50" r="13"/><circle cx="160" cy="36" r="14"/></g>' +
        '<g stroke="#4b9ad6" stroke-width="3" stroke-linecap="round">' +
        '<line x1="146" y1="66" x2="142" y2="80"/><line x1="158" y1="68" x2="154" y2="84"/><line x1="170" y1="66" x2="166" y2="80"/></g>' +
        '<text x="118" y="24" font-size="13" fill="#1d2b3a">ここが ぜんせん → 雨が つづく</text>'
      );
    }
    if (kind === 'typhoon') {
      return wrap(
        '<rect width="320" height="150" rx="12" fill="#e3f0fa"/>' +
        '<path d="M0 120 H320" stroke="#3f97cf" stroke-width="14"/>' +
        '<g transform="translate(160,66)">' +
        '<path d="M0-42 C34-42 46-14 30 4 C50 0 56 26 30 38 C10 48-16 40-24 20 C-44 24-52 0-36-12 C-24-32-20-42 0-42Z" fill="#9fc4dc" opacity=".85"/>' +
        '<path d="M0-30 C22-30 34-8 20 6 C34 6 36 22 18 28 C2 34-14 26-18 12 C-32 12-36-2-24-12 C-14-24-14-30 0-30Z" fill="#c9dcea"/>' +
        '<circle r="9" fill="#fff"/><text y="4" font-size="9" text-anchor="middle" fill="#2f6fb0">目</text>' +
        '</g>' +
        '<g stroke="#f0a020" stroke-width="3" stroke-linecap="round">' +
        '<line x1="40" y1="112" x2="70" y2="98"/><line x1="70" y1="118" x2="100" y2="104"/></g>' +
        '<text x="12" y="140" font-size="12" fill="#1a6fb5">あたたかい うみから 水じょうきが のぼって そだつ</text>'
      );
    }
    if (kind === 'snow') {
      return wrap(
        '<rect width="320" height="150" rx="12" fill="#eef4f9"/>' +
        '<path d="M150 120 L210 40 L270 120 Z" fill="#7d9c7a"/>' +
        '<path d="M186 88 L210 40 L234 88 Z" fill="#fff"/>' +
        '<path d="M0 120 H320" stroke="#3f97cf" stroke-width="12"/>' +
        '<g fill="#b9cddc"><circle cx="90" cy="60" r="22"/><circle cx="120" cy="64" r="18"/><circle cx="62" cy="66" r="16"/></g>' +
        '<g fill="#fff"><circle cx="80" cy="92" r="3"/><circle cx="100" cy="102" r="3"/><circle cx="118" cy="90" r="3"/><circle cx="132" cy="104" r="3"/><circle cx="150" cy="94" r="3"/></g>' +
        '<g stroke="#2f6fb0" stroke-width="3" stroke-linecap="round" fill="none">' +
        '<path d="M8 46 h34"/><path d="M36 40 l8 6 l-8 6"/></g>' +
        '<text x="6" y="34" font-size="12" fill="#2f6fb0">シベリアの つめたい かぜ</text>' +
        '<text x="244" y="60" font-size="12" fill="#3a6b39">山を こえると</text>' +
        '<text x="244" y="76" font-size="12" fill="#3a6b39">はれる</text>'
      );
    }
    if (kind === 'thunder') {
      return wrap(
        '<rect width="320" height="150" rx="12" fill="#dfe8f2"/>' +
        '<path d="M0 126 H320" stroke="#c58b4f" stroke-width="10"/>' +
        '<g fill="#8fa0b4"><ellipse cx="160" cy="86" rx="62" ry="26"/><circle cx="130" cy="60" r="26"/><circle cx="168" cy="46" r="30"/><circle cx="196" cy="64" r="24"/></g>' +
        '<path d="M160 96 L146 118 L158 118 L148 140 L176 112 L162 112 L172 96 Z" fill="#ffd23f" stroke="#e0a300" stroke-width="2"/>' +
        '<g stroke="#e06a3a" stroke-width="3" stroke-linecap="round">' +
        '<line x1="60" y1="120" x2="60" y2="96"/><line x1="60" y1="96" x2="55" y2="104"/><line x1="60" y1="96" x2="65" y2="104"/>' +
        '<line x1="90" y1="120" x2="90" y2="90"/><line x1="90" y1="90" x2="85" y2="98"/><line x1="90" y1="90" x2="95" y2="98"/></g>' +
        '<text x="14" y="140" font-size="12" fill="#b3541f">あつい じめん → くうきが 上に のぼる</text>'
      );
    }
    /* wind */
    return wrap(
      '<rect width="320" height="150" rx="12" fill="#eaf4fd"/>' +
      '<g fill="#f3d7b0" stroke="#dcb47e" stroke-width="2"><rect x="24" y="40" width="86" height="76" rx="10"/></g>' +
      '<text x="40" y="86" font-size="15" fill="#b3701f">こうきあつ</text>' +
      '<g fill="#cfe3f5" stroke="#9dc3e4" stroke-width="2"><rect x="210" y="40" width="86" height="76" rx="10"/></g>' +
      '<text x="226" y="86" font-size="15" fill="#2f6fb0">ていきあつ</text>' +
      '<g stroke="#4b9ad6" stroke-width="4" stroke-linecap="round" fill="none">' +
      '<path d="M120 66 h72"/><path d="M186 58 l10 8 l-10 8"/>' +
      '<path d="M120 96 h72"/><path d="M186 88 l10 8 l-10 8"/></g>' +
      '<text x="128" y="126" font-size="12" fill="#1d2b3a">くうきが ながれる ＝ かぜ</text>' +
      '<g stroke="#b3701f" stroke-width="3" stroke-linecap="round"><path d="M52 34 v-12"/><path d="M52 22 l-5 7"/><path d="M52 22 l5 7"/></g>' +
      '<g stroke="#2f6fb0" stroke-width="3" stroke-linecap="round"><path d="M256 22 v12"/><path d="M256 34 l-5-7"/><path d="M256 34 l5-7"/></g>'
    );
  }

  function buildLearn() {
    const read = $('#sub-read');
    read.innerHTML = '';
    read.appendChild(el('p', 'lead',
      'てんきよほうの 画面には、いろいろな すうじが ならんでいるね。ひとつずつ 見てみよう。' +
      '「よほう」の タブで じっさいの すうじも たしかめられるよ。'));
    READ_CARDS.forEach(c => {
      const card = el('div', 'learn-card');
      card.innerHTML = '<h3>' + c.emoji + ' ' + c.title + '</h3><p>' + c.text + '</p>';
      read.appendChild(card);
    });

    const season = $('#sub-season');
    season.innerHTML = '';
    season.appendChild(el('p', 'lead', '日本には きせつごとに とくちょうの ある 天気が あるよ。えを 見ながら よんでみよう。'));
    SEASON_CARDS.forEach(c => {
      const card = el('div', 'learn-card');
      card.innerHTML =
        '<h3>' + c.emoji + ' ' + c.title + '<span class="when">' + c.when + '</span></h3>' +
        seasonArt(c.art) +
        '<p class="lead-line">' + c.lead + '</p>' +
        '<p>' + c.body.join('<br><br>') + '</p>';
      season.appendChild(card);
    });

    rubyize($('#sub-read'));
    rubyize($('#sub-season'));
  }

  /* ---------------- クイズ ---------------- */
  const quiz = { list: [], i: 0, hit: 0, answered: false };

  function startQuiz() {
    quiz.list = QUIZ.slice().sort(() => Math.random() - 0.5).slice(0, 5);
    quiz.i = 0; quiz.hit = 0; quiz.answered = false;
    renderQuiz();
  }

  function renderQuiz() {
    const box = $('#quizBox');
    if (quiz.i >= quiz.list.length) {
      const perfect = quiz.hit === quiz.list.length;
      box.innerHTML =
        '<div class="q-done"><div class="big">' + (perfect ? '🏆' : quiz.hit >= 3 ? '🎉' : '💪') + '</div>' +
        '<p class="q-text">' + quiz.list.length + 'もん中 ' + quiz.hit + 'もん せいかい！</p>' +
        '<p class="q-exp">' + (perfect ? 'ぜんぶ せいかい！ てんきはかせだ！' : 'もういちど やると べつの もんだいが 出るよ。') + '</p></div>';
      const again = el('button', 'btn primary', '↺ もういちど');
      again.style.marginTop = '14px';
      again.addEventListener('click', () => { Sound.tap(); startQuiz(); });
      box.appendChild(again);
      rubyize(box);
      if (quiz.hit > 0) {
        addStamp(quiz.hit);
        Store.update(s => { if (quiz.hit > s.quizBest) s.quizBest = quiz.hit; });
      }
      return;
    }

    const q = quiz.list[quiz.i];
    box.innerHTML =
      '<div class="q-count">だい ' + (quiz.i + 1) + 'もん ／ ' + quiz.list.length + 'もん</div>' +
      '<p class="q-text">' + q.q + '</p>';
    const choices = el('div', 'q-choices');
    q.a.forEach((text, idx) => {
      const b = el('button', 'q-choice', text);
      b.addEventListener('click', () => {
        if (quiz.answered) return;
        quiz.answered = true;
        const right = idx === q.ans;
        if (right) { quiz.hit++; Sound.correct(); } else { Sound.wrong(); }
        [...choices.children].forEach((c, ci) => {
          if (ci === q.ans) c.classList.add('ok');
          else if (ci === idx) c.classList.add('ng');
          c.disabled = true;
        });
        const exp = el('p', 'q-exp', (right ? '⭕ せいかい！ ' : '❌ ざんねん… ') + q.exp);
        box.appendChild(exp);
        rubyize(exp);
        const next = el('button', 'btn primary', quiz.i + 1 >= quiz.list.length ? 'けっかを 見る →' : 'つぎの もんだい →');
        next.style.marginTop = '12px';
        next.addEventListener('click', () => {
          Sound.tap();
          quiz.i++; quiz.answered = false;
          renderQuiz();
        });
        box.appendChild(next);
      });
      choices.appendChild(b);
    });
    box.appendChild(choices);
    rubyize(box);
  }

  /* ================= がめんの きりかえ ================= */
  function showView(name) {
    currentView = name;
    ['yohou', 'yosou', 'lab', 'manabu'].forEach(v => {
      $('#view-' + v).classList.toggle('hidden', v !== name);
    });
    [...document.querySelectorAll('.dock-btn')].forEach(b => {
      b.classList.toggle('is-on', b.dataset.view === name);
    });
    window.scrollTo(0, 0);
    if (name === 'lab') Lab.redraw();
    else Lab.stop();
    if (name === 'yosou') renderGuess();
  }

  /* ================= はじめる ================= */
  function init() {
    Sound.setEnabled(Store.get('sound') !== false);
    $('#btnSound').setAttribute('aria-pressed', Sound.enabled ? 'true' : 'false');
    $('#btnSound').textContent = Sound.enabled ? '🔊 おと' : '🔇 おと';
    $('#stampCount').textContent = Store.get('stamps');

    $('#btnSound').addEventListener('click', () => {
      const next = !Sound.enabled;
      Sound.setEnabled(next);
      Store.set('sound', next);
      $('#btnSound').setAttribute('aria-pressed', next ? 'true' : 'false');
      $('#btnSound').textContent = next ? '🔊 おと' : '🔇 おと';
      if (next) Sound.tap();
    });

    [...document.querySelectorAll('.dock-btn')].forEach(b => {
      b.addEventListener('click', () => { Sound.move(); showView(b.dataset.view); });
    });

    [...document.querySelectorAll('.subtab')].forEach(b => {
      b.addEventListener('click', () => {
        Sound.move();
        [...document.querySelectorAll('.subtab')].forEach(x => x.classList.toggle('is-on', x === b));
        ['read', 'season', 'quiz'].forEach(s => $('#sub-' + s).classList.toggle('hidden', s !== b.dataset.sub));
        if (b.dataset.sub === 'quiz') startQuiz();
      });
    });

    /* さいしょの タップで 音を つかえるように する（スマホの きまり） */
    document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });

    /* タブを もどってきたら 天気を とりなおす */
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && data && data.today !== Weather.ymd(new Date())) loadCity();
    });

    rubyize(document.querySelector('main'));
    buildChips();
    buildLearn();
    setupLab();
    loadCity();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
