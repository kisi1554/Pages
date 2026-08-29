/* あしたの天気やさん — 画面の組み立てと操作 */

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
     漢字に <ruby> でよみがなをつける。長い言葉から先にならべること。 */
  const RUBY = [
    /* 町・地名 */
    ['北海道', 'ほっかいどう'], ['日本海', 'にほんかい'], ['太平洋', 'たいへいよう'],
    ['南半球', 'みなみはんきゅう'], ['北半球', 'きたはんきゅう'], ['名古屋', 'なごや'],
    ['札幌', 'さっぽろ'], ['仙台', 'せんだい'], ['新潟', 'にいがた'], ['東京', 'とうきょう'],
    ['横浜', 'よこはま'], ['大阪', 'おおさか'], ['広島', 'ひろしま'], ['高知', 'こうち'],
    ['福岡', 'ふくおか'], ['那覇', 'なは'], ['北京', 'ペキン'], ['東北', 'とうほく'],
    ['北陸', 'ほくりく'], ['関東', 'かんとう'], ['東海', 'とうかい'], ['近畿', 'きんき'],
    ['中国', 'ちゅうごく'], ['四国', 'しこく'], ['九州', 'きゅうしゅう'], ['沖縄', 'おきなわ'],
    ['日本', 'にほん'], ['世界', 'せかい'], ['地球', 'ちきゅう'], ['赤道', 'せきどう'],
    ['外国', 'がいこく'],
    /* 天気の言葉 */
    ['降水確率', 'こうすいかくりつ'], ['入道雲', 'にゅうどうぐも'], ['水蒸気', 'すいじょうき'],
    ['高気圧', 'こうきあつ'], ['低気圧', 'ていきあつ'], ['天気', 'てんき'], ['予報', 'よほう'],
    ['予想', 'よそう'], ['気温', 'きおん'], ['気圧', 'きあつ'], ['湿度', 'しつど'],
    ['確率', 'かくりつ'], ['最高', 'さいこう'], ['最低', 'さいてい'], ['日の出', 'ひので'],
    ['日の入り', 'ひのいり'], ['前線', 'ぜんせん'], ['台風', 'たいふう'], ['梅雨', 'つゆ'],
    ['季節', 'きせつ'], ['蒸発', 'じょうはつ'], ['夕立', 'ゆうだち'], ['電気', 'でんき'],
    ['温度', 'おんど'], ['空気', 'くうき'], ['地面', 'じめん'], ['太陽', 'たいよう'],
    /* 時間・場所 */
    ['1日', 'いちにち'], ['100回', 'ひゃっかい'], ['1回', 'いっかい'], ['一年中', 'いちねんじゅう'],
    ['時差', 'じさ'], ['時刻', 'じこく'], ['現地', 'げんち'], ['時間', 'じかん'],
    ['夕方', 'ゆうがた'], ['昼間', 'ひるま'], ['午後', 'ごご'], ['今日', 'きょう'],
    ['半分', 'はんぶん'], ['場所', 'ばしょ'], ['上着', 'うわぎ'],
    /* そのほか */
    ['実験', 'じっけん'], ['地図', 'ちず'], ['正解', 'せいかい'], ['問題', 'もんだい'],
    ['反対', 'はんたい'], ['自動', 'じどう'], ['割合', 'わりあい'], ['安心', 'あんしん'],
    ['意味', 'いみ'], ['読み方', 'よみかた'], ['本当', 'ほんとう'], ['本物', 'ほんもの'],
    ['結果', 'けっか'], ['画面', 'がめん'], ['数字', 'すうじ'], ['週間', 'しゅうかん'],
    ['一度', 'いちど'],
    /* 1字 */
    ['空', 'そら'], ['雲', 'くも'], ['雨', 'あめ'], ['雪', 'ゆき'], ['風', 'かぜ'],
    ['水', 'みず'], ['海', 'うみ'], ['山', 'やま'], ['川', 'かわ'], ['星', 'ほし'],
    ['晴', 'は'], ['月', 'がつ'], ['日', 'ひ'], ['今', 'いま'], ['朝', 'あさ'],
    ['昼', 'ひる'], ['夜', 'よる'], ['春', 'はる'], ['夏', 'なつ'], ['秋', 'あき'],
    ['冬', 'ふゆ'], ['上', 'うえ'], ['下', 'した'], ['中', 'なか'], ['東', 'ひがし'],
    ['西', 'にし'], ['南', 'みなみ'], ['北', 'きた'], ['白', 'しろ'], ['青', 'あお'],
    ['葉', 'は'], ['所', 'ところ'], ['物', 'もの'], ['数', 'かず'], ['量', 'りょう'],
    ['力', 'ちから'], ['差', 'さ'], ['目', 'め'], ['音', 'おと'], ['絵', 'え'],
    ['町', 'まち'], ['回', 'かい'], ['名前', 'なまえ'], ['大', 'おお'], ['小', 'ちい'],
    ['長', 'なが'], ['高', 'たか'], ['低', 'ひく'], ['多', 'おお'], ['少', 'すく'],
    ['強', 'つよ'], ['弱', 'よわ'], ['速', 'はや'], ['早', 'はや'], ['軽', 'かる'],
    ['重', 'おも'], ['暑', 'あつ'], ['熱', 'あつ'], ['寒', 'さむ'], ['冷', 'ひ'],
    ['近', 'ちか'], ['同', 'おな'], ['思', 'おも'], ['見', 'み'], ['読', 'よ'],
    ['聞', 'き'], ['持', 'も'], ['選', 'えら'], ['作', 'つく'], ['出', 'で'],
    ['生', 'う'], ['育', 'そだ'], ['起', 'お'], ['落', 'お'], ['飛', 'と'],
    ['流', 'なが'], ['動', 'うご'], ['変', 'か'], ['集', 'あつ'], ['進', 'すす'],
    ['答', 'こた'], ['合', 'あ'], ['何', 'なん'], ['飲', 'の'], ['子', 'こ'],
    ['全', 'ぜん'], ['問', 'もん'], ['第', 'だい'], ['丸', 'まる'], ['側', 'がわ'],
    ['光', 'ひかり'], ['前', 'まえ'], ['取', 'と'], ['学', 'まな'], ['当', 'あ'],
    ['待', 'ま'], ['新', 'あたら'], ['時', 'じ'], ['来', 'き'], ['直', 'なお'],
    ['色', 'いろ'], ['行', 'い'], ['返', 'かえ'], ['赤', 'あか'], ['遠', 'とお'],
    ['方', 'ほう'], ['外', 'そと']
  ];
  const RUBY_MAP = {};
  RUBY.forEach(r => { RUBY_MAP[r[0]] = r[1]; });
  const RUBY_RE = new RegExp('(' + RUBY.map(r => r[0]).join('|') + ')', 'g');

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* すでに ruby の中にある文字はさわらないので、何度よんでも安全。 */
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

  /* ---------------- 今えらんでいる町 ---------------- */
  let city = CITIES.find(c => c.id === Store.get('city')) || CITIES.find(c => c.id === 'yokohama');
  let cityGroup = city.group;
  const lastCityOf = { japan: 'yokohama', world: 'newyork' };
  lastCityOf[city.group] = city.id;

  let data = null;          // 今ひょうじしている天気データ
  let mapLoaded = {};       // 地図のグループごとに読みこみずみか

  /* ---------------- 時計 ----------------
     町の時差から「今の時刻」を出して、1秒ごとに書きかえる。 */
  const clocks = [];
  function addClock(node, offsetSec) {
    clocks.push({ node: node, offset: offsetSec });
    tickClocks();
  }
  function clearClocks(root) {
    for (let i = clocks.length - 1; i >= 0; i--) {
      if (!document.body.contains(clocks[i].node) || (root && root.contains(clocks[i].node))) {
        clocks.splice(i, 1);
      }
    }
  }
  function tickClocks() {
    clocks.forEach(c => {
      const t = Weather.localNow(c.offset);
      c.node.textContent =
        String(t.hh).padStart(2, '0') + ':' + String(t.mm).padStart(2, '0') + ':' + String(t.ss).padStart(2, '0');
    });
  }
  setInterval(tickClocks, 1000);

  /* 日本との時差を言葉にする */
  function tzWord(offsetSec) {
    const diff = Math.round((offsetSec - 32400) / 3600);
    if (diff === 0) return '日本と同じ時刻';
    return '日本より ' + Math.abs(diff) + '時間 ' + (diff > 0 ? '進んでいる' : 'おくれている');
  }

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

  /* ---------------- 日づけの言葉 ---------------- */
  const WD = ['日', '月', '火', '水', '木', '金', '土'];
  const WD_YOMI = ['にち', 'げつ', 'か', 'すい', 'もく', 'きん', 'ど'];
  function weekday(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  }
  function mmdd(dateStr) {
    const [, m, d] = dateStr.split('-').map(Number);
    return m + '/' + d;
  }
  function dayWord(dateStr, today) {
    if (dateStr === today) return '今日';
    if (dateStr === Weather.addDays(today, 1)) return 'あした';
    if (dateStr === Weather.addDays(today, 2)) return 'あさって';
    if (dateStr === Weather.addDays(today, -1)) return 'きのう';
    return mmdd(dateStr);
  }

  /* ================= 予報 ================= */
  function buildGroupTabs() {
    [...document.querySelectorAll('#view-yohou .group-tab')].forEach(b => {
      b.classList.toggle('is-on', b.dataset.group === cityGroup);
      b.onclick = () => {
        if (b.dataset.group === cityGroup) return;
        Sound.move();
        cityGroup = b.dataset.group;
        const next = CITIES.find(c => c.id === lastCityOf[cityGroup]) ||
                     CITIES.find(c => c.group === cityGroup);
        selectCity(next, false);
      };
    });
  }

  function buildChips() {
    const box = $('#cityChips');
    box.innerHTML = '';
    CITIES.filter(c => c.group === cityGroup).forEach(c => {
      const b = el('button', 'chip', c.name);
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', c.id === city.id ? 'true' : 'false');
      b.addEventListener('click', () => {
        if (c.id === city.id) return;
        Sound.tap();
        selectCity(c, false);
      });
      box.appendChild(b);
    });
    rubyize(box);
  }

  function selectCity(next, jumpToForecast) {
    city = next;
    cityGroup = next.group;
    lastCityOf[next.group] = next.id;
    Store.set('city', next.id);
    buildGroupTabs();
    buildChips();
    loadCity();
    if (jumpToForecast) showView('yohou');
  }

  function loadCity() {
    $('#sourceNote').textContent = city.name + 'の予報を読みこみ中…';
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
      note.textContent = '⚠️ ネットにつながらないので「おためし天気」を出しています（本物ではありません）';
      note.classList.add('demo');
    } else if (data.stale) {
      note.textContent = '📶 さっき取っておいた' + city.name + 'の予報です（今はつながりません）';
      note.classList.remove('demo');
    } else {
      note.textContent = '📡 ' + city.name + '（' + city.area + '）の本物の予報 ／ Open-Meteo';
      note.classList.remove('demo');
    }

    const t = todayRow();
    const cur = data.current;
    const info = wmoInfo(cur.code != null ? cur.code : t.code);

    $('#todayMark').textContent = info.mark;
    $('#todayLabel').textContent = info.label;
    $('#todayMax').textContent = t ? Math.round(t.tmax) : '--';
    $('#todayMin').textContent = t ? Math.round(t.tmin) : '--';
    $('#todayNow').textContent = '今 ' + (cur.temp != null ? Math.round(cur.temp * 10) / 10 + '℃' : '--');

    /* 現地の時計 */
    clearClocks($('#clockRow'));
    const row = $('#clockRow');
    row.innerHTML = '';
    const clock = el('span', 'clock-time', '--:--:--');
    row.appendChild(el('span', 'clock-emoji', '🕒'));
    row.appendChild(el('span', 'clock-label', city.group === 'world' ? '現地の時刻' : '今の時刻'));
    row.appendChild(clock);
    row.appendChild(el('span', 'clock-tz', tzWord(data.tzOffset)));
    addClock(clock, data.tzOffset);

    const facts = $('#todayFacts');
    facts.innerHTML = '';
    const addFact = (k, v) => facts.appendChild(el('div', 'fact',
      '<span class="k">' + k + '</span><span class="v">' + v + '</span>'));
    addFact('降水確率', (t && t.pop != null ? t.pop : '--') + '%');
    addFact('湿度', (cur.humidity != null ? Math.round(cur.humidity) : '--') + '%');
    addFact('風', (cur.wind != null ? Math.round(cur.wind) : '--') + 'km/h');
    addFact('気圧', (cur.pressure != null ? Math.round(cur.pressure) : '--') + 'hPa');
    if (t && t.sunrise) addFact('日の出', t.sunrise.slice(11, 16));
    if (t && t.sunset) addFact('日の入り', t.sunset.slice(11, 16));

    /* 理由 */
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

    /* 1週間（今日から先） */
    const wbox = $('#week');
    wbox.innerHTML = '';
    data.daily.filter(d => d.date >= data.today).forEach(d => {
      const wi = wmoInfo(d.code);
      const wd = weekday(d.date);
      const cls = wd === 0 ? ' sun' : wd === 6 ? ' sat' : '';
      const head = ['今日', 'あした', 'あさって'].indexOf(dayWord(d.date, data.today)) >= 0
        ? dayWord(d.date, data.today)
        : '<ruby>' + WD[wd] + '<rt>' + WD_YOMI[wd] + '</rt></ruby>よう日';
      const box = el('div', 'day' + (d.date === data.today ? ' is-today' : ''));
      box.innerHTML =
        '<div class="wd' + cls + '">' + head + '</div>' +
        '<div class="dt">' + mmdd(d.date) + '</div>' +
        '<div class="mk">' + wi.mark + '</div>' +
        '<div class="tt"><span class="h">' + Math.round(d.tmax) + '</span>/<span class="l">' + Math.round(d.tmin) + '</span></div>' +
        '<div class="pp">☔' + (d.pop != null ? d.pop : '--') + '%</div>';
      wbox.appendChild(box);
    });

    /* 時間ごと（今から24時間ぶんを2時間おきに） */
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
        '<div class="hh">' + Number(h.time.slice(11, 13)) + '時</div>' +
        '<div class="mk">' + wi.mark + '</div>' +
        '<div class="tp">' + Math.round(h.temp) + '°</div>' +
        '<div class="pp">' + (h.pop != null ? h.pop + '%' : '') + '</div>';
      hbox.appendChild(box);
    });

    rubyize($('#view-yohou'));
  }

  /* ================= 地図 ================= */
  function buildLegend() {
    const stops = [-10, 0, 10, 20, 30].map(t => WeatherMap.tempColor(t)).join(',');
    $('#legendBar').style.background = 'linear-gradient(90deg,' + stops + ')';
  }

  function loadMap(group) {
    const list = CITIES.filter(c => c.group === group);
    if (group === 'world') {
      const home = CITIES.find(c => c.id === 'yokohama');
      if (home) list.push(home);
    }
    $('#mapNote').textContent = '天気を読みこみ中…';
    Weather.loadMany(list, group).then(res => {
      WeatherMap.setSpots(res.spots);
      mapLoaded[group] = true;
      $('#mapNote').textContent = res.demo
        ? '⚠️ ネットにつながらないので「おためし天気」を出しています（本物ではありません）'
        : (res.stale ? '📶 さっき取っておいた天気です（今はつながりません）'
                     : '📡 今の天気 ／ Open-Meteo。数字は今の気温、色は寒い青〜暑い赤。');
      rubyize($('#mapNote'));
      if (WeatherMap.getGroup() === group) renderMapPick(city.id);
    });
  }

  function renderMapPick(cityId) {
    const c = CITIES.find(x => x.id === cityId);
    const box = $('#mapPick');
    clearClocks(box);
    if (!c) { box.innerHTML = ''; return; }
    const s = WeatherMap.getSpot(cityId) || {};
    const info = s.code != null ? wmoInfo(s.code) : null;

    box.innerHTML =
      '<div class="pick-head">' +
        '<span class="pick-mark">' + (info ? info.mark : '⏳') + '</span>' +
        '<span class="pick-name">' + c.name + '<span class="pick-area">' + c.area + '</span></span>' +
        '<span class="pick-temp" style="color:' + WeatherMap.tempColor(s.temp) + '">' +
          (s.temp != null ? Math.round(s.temp) + '℃' : '--') + '</span>' +
      '</div>' +
      '<div class="pick-body">' +
        '<span>' + (info ? info.label : '読みこみ中…') + '</span>' +
        '<span class="pick-clock">🕒 <b class="clock-time">--:--:--</b> ' +
        (s.tzOffset != null ? '<span class="clock-tz">' + tzWord(s.tzOffset) + '</span>' : '') + '</span>' +
      '</div>';

    const btn = el('button', 'btn primary', '📋 この町の予報を見る');
    btn.addEventListener('click', () => {
      Sound.tap();
      selectCity(c, true);
    });
    box.appendChild(btn);

    if (s.tzOffset != null) addClock(box.querySelector('.clock-time'), s.tzOffset);
    rubyize(box);
  }

  function setupMap() {
    buildLegend();
    WeatherMap.init($('#mapCanvas'), {
      onPick: id => {
        Sound.tap();
        WeatherMap.setSelected(id);
        renderMapPick(id);
      }
    });
    const group = Store.get('mapGroup') || 'japan';
    setMapGroup(group);

    [...document.querySelectorAll('#view-map .group-tab')].forEach(b => {
      b.addEventListener('click', () => {
        if (b.dataset.map === WeatherMap.getGroup()) return;
        Sound.move();
        setMapGroup(b.dataset.map);
      });
    });
  }

  function setMapGroup(group) {
    Store.set('mapGroup', group);
    [...document.querySelectorAll('#view-map .group-tab')].forEach(b => {
      b.classList.toggle('is-on', b.dataset.map === group);
    });
    $('#mapCanvas').classList.toggle('world', group === 'world');
    $('#mapLead').textContent = group === 'japan'
      ? '町のふだをタップすると、その町の天気と予報が見られます。北と南で気温がどれくらいちがうかな？'
      : '世界の町のふだをタップしてみよう。赤道に近い町と、遠い町の気温をくらべてみてね。';
    WeatherMap.setGroup(group);
    WeatherMap.setSelected(city.id);
    if (!mapLoaded[group]) loadMap(group);
    else renderMapPick(CITIES.some(c => c.id === city.id && (c.group === group || group === 'world' && c.id === 'yokohama')) ? city.id : null);
    rubyize($('#view-map'));
  }

  /* ================= 予想 ================= */
  function guessFor(dateStr, cityId) {
    return Store.get('guesses').find(g => g.date === dateStr && g.city === cityId);
  }

  /* 天気がわかった予想を答え合わせする */
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
      /* 古すぎて答え合わせできなかったものはかたづける */
      s.guesses = s.guesses.filter(g => g.result || g.date >= Weather.addDays(data.today, -1));
    });
    if (newHits > 0) {
      addStamp(newHits);
      toast('予想が ' + newHits + 'こ 当たったよ！ ⭐+' + newHits, 3600);
    } else if (judged > 0) {
      toast('答え合わせをしたよ。つぎは当たるかな？', 3000);
    }
  }

  function renderGuess() {
    if (!data) return;
    judgeGuesses();

    const tomorrow = Weather.addDays(data.today, 1);
    const mine = guessFor(tomorrow, city.id);
    const wd = weekday(tomorrow);

    $('#guessLead').innerHTML =
      '<b>' + city.name + '</b> の <b>' + mmdd(tomorrow) + '（' +
      '<ruby>' + WD[wd] + '<rt>' + WD_YOMI[wd] + '</rt></ruby>）</b>の天気は、どれになると思う？<br>' +
      '予想したら、あしたこの画面で答え合わせをするよ。';

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
        toast('「' + g.kind + '」で予想したよ！', 2200);
        renderGuess();
      });
      grid.appendChild(b);
    });

    const st = $('#guessState');
    if (mine) {
      st.innerHTML = '✅ 予想ずみ：<b>' + mine.kind + '</b>。' +
        'あしたもう一度ひらくと、本当の天気とくらべてスタンプがもらえます。' +
        '<br><span style="color:#52697f">（えらび直しもできます）</span>';
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
      const actual = g.result ? '→ 本当は <b>' + g.actual + '</b> ' + wmoInfo(g.actualCode).mark : '→ 答え合わせ待ち';
      row.innerHTML =
        '<span class="h-date">' + mmdd(g.date) + '</span>' +
        '<span class="h-body">' + (c ? c.name : '') + '／予想 <b>' + g.kind + '</b> ' + actual + '</span>' +
        '<span class="h-res">' + (g.result === 'ok' ? '⭕' : g.result === 'ng' ? '❌' : '⏳') + '</span>';
      hist.appendChild(row);
    });

    rubyize($('#view-yosou'));
  }

  /* ================= 実験 ================= */
  function setupLab() {
    Lab.init($('#labCanvas'), {
      onStep: (n) => {
        [...document.querySelectorAll('.lab-step')].forEach((s, i) => s.classList.toggle('is-on', i <= n));
        const tips = [
          '太陽が海をあたためると、はじまりです。',
          '① あたたまった水が「水蒸気」になって上にのぼる＝蒸発！',
          '② 上の空は冷たい。水蒸気が冷えて小さな水のつぶ＝雲になったよ。',
          '③ 雲の中のつぶがくっついて大きくなると、重くて落ちてくる＝雨！',
          '④ ふった雨は川を流れて海へもどる。水はぐるぐる回っているんだ。'
        ];
        $('#labTip').textContent = tips[n] || tips[0];
        if (n === 3 && Lab.get('cold') > 0.62) {
          $('#labTip').textContent = '③ 空が寒いと、水はこおったまま落ちてくる＝雪だよ！';
        }
        rubyize($('#labTip'));
      },
      onStat: (s) => {
        $('#labMeters').innerHTML =
          '<div class="meter">🌊 海の水 ' + Math.round(s.sea) + '</div>' +
          '<div class="meter">☁️ 空の水 ' + Math.round(s.sky) + '</div>' +
          '<div class="meter">💧 ふった雨 ' + Math.round(s.rained) + '</div>' +
          (s.snow > 0.5 ? '<div class="meter">⛄ つもった雪 ' + Math.round(s.snow) + '</div>' : '');
        rubyize($('#labMeters'));
      }
    });

    const steps = $('#labSteps');
    steps.innerHTML = '';
    ['☀️ あたためる', '💨 蒸発', '☁️ 雲になる', '🌧️ 雨になる', '🌊 海へもどる']
      .forEach((name, i) => steps.appendChild(el('div', 'lab-step' + (i === 0 ? ' is-on' : ''), name)));
    rubyize(steps);

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
      else { Lab.stop(); $('#btnLabPlay').textContent = '▶ 動かす'; }
      rubyize($('#btnLabPlay'));
    });

    $('#btnLabReset').addEventListener('click', () => {
      Sound.tap();
      Lab.reset();
      [...document.querySelectorAll('.lab-step')].forEach((s, i) => s.classList.toggle('is-on', i === 0));
      $('#labTip').textContent = '太陽を強くすると、海の水が水蒸気になってのぼります。';
      rubyize($('#labTip'));
    });

    $('#btnLabToday').addEventListener('click', () => {
      if (!data) return;
      Sound.tap();
      const c = data.current;
      /* 今の数字をつまみにうつしかえる */
      const sun = Math.max(0.15, 1 - (c.cloud || 50) / 100 * 0.8) * Math.min(1, Math.max(0.3, (c.temp + 5) / 40));
      const wind = Math.min(1, (c.wind || 10) / 40);
      const cold = Math.max(0, Math.min(1, (18 - c.temp) / 26));
      Lab.set('sun', sun); Lab.set('wind', wind); Lab.set('cold', cold);
      $('#sSun').value = Math.round(sun * 100); $('#vSun').textContent = Math.round(sun * 100);
      $('#sWind').value = Math.round(wind * 100); $('#vWind').textContent = Math.round(wind * 100);
      $('#sCold').value = Math.round(cold * 100); $('#vCold').textContent = Math.round(cold * 100);
      toast('今の' + city.name + 'の空に合わせたよ', 2600);
    });
  }

  /* ================= 学ぶ ================= */
  /* 季節カードのさし絵（外の画像は使わず SVG でかく） */
  function seasonArt(kind) {
    const wrap = s => '<svg viewBox="0 0 320 150" role="img" aria-hidden="true">' + s + '</svg>';
    if (kind === 'front') {
      return wrap(
        '<rect width="320" height="150" rx="12" fill="#eaf4fd"/>' +
        '<path d="M0 110 H320" stroke="#9ec9a0" stroke-width="8"/>' +
        '<g fill="#7fb0e0"><circle cx="55" cy="60" r="26"/><circle cx="85" cy="66" r="20"/></g>' +
        '<g fill="#f2b06a"><circle cx="255" cy="62" r="26"/><circle cx="225" cy="68" r="20"/></g>' +
        '<text x="34" y="115" font-size="13" fill="#2f6fb0">冷たい空気</text>' +
        '<text x="215" y="115" font-size="13" fill="#b3701f">あたたかい空気</text>' +
        '<path d="M150 100 L160 40 L172 100" fill="none" stroke="#5a5a5a" stroke-width="3" stroke-dasharray="6 5"/>' +
        '<g fill="#4b9ad6"><circle cx="150" cy="46" r="16"/><circle cx="170" cy="50" r="13"/><circle cx="160" cy="36" r="14"/></g>' +
        '<g stroke="#4b9ad6" stroke-width="3" stroke-linecap="round">' +
        '<line x1="146" y1="66" x2="142" y2="80"/><line x1="158" y1="68" x2="154" y2="84"/><line x1="170" y1="66" x2="166" y2="80"/></g>' +
        '<text x="112" y="24" font-size="13" fill="#1d2b3a">ここが前線 → 雨がつづく</text>'
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
        '<text x="12" y="140" font-size="12" fill="#1a6fb5">あたたかい海から水蒸気がのぼって育つ</text>'
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
        '<text x="6" y="34" font-size="12" fill="#2f6fb0">シベリアの冷たい風</text>' +
        '<text x="238" y="60" font-size="12" fill="#3a6b39">山をこえると</text>' +
        '<text x="238" y="76" font-size="12" fill="#3a6b39">晴れる</text>'
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
        '<text x="14" y="140" font-size="12" fill="#b3541f">熱い地面 → 空気が上にのぼる</text>'
      );
    }
    if (kind === 'globe') {
      return wrap(
        '<rect width="320" height="150" rx="12" fill="#e8f1fa"/>' +
        '<circle cx="160" cy="75" r="58" fill="#bfe0f5" stroke="#7fb0d8" stroke-width="2"/>' +
        '<path d="M118 44 q26 10 46 2 q22-8 40 6 l-4 18 q-30-8-48 4 q-22 12-40 2 Z" fill="#9ecf8c"/>' +
        '<path d="M126 92 q28 14 52 2 q20-10 34 4 l-8 16 q-26-6-44 6 q-20 12-38-4 Z" fill="#9ecf8c"/>' +
        '<line x1="102" y1="75" x2="218" y2="75" stroke="#d06a4a" stroke-width="2" stroke-dasharray="6 5"/>' +
        '<text x="222" y="79" font-size="11" fill="#b3541f">赤道</text>' +
        '<g fill="#ffd23f"><circle cx="34" cy="52" r="15"/></g>' +
        '<text x="14" y="86" font-size="11" fill="#b3701f">こちらは昼</text>' +
        '<g fill="#3b4d68"><circle cx="288" cy="52" r="13"/><circle cx="283" cy="48" r="11" fill="#e8f1fa"/></g>' +
        '<text x="256" y="86" font-size="11" fill="#3b4d68">こちらは夜</text>'
      );
    }
    /* wind */
    return wrap(
      '<rect width="320" height="150" rx="12" fill="#eaf4fd"/>' +
      '<g fill="#f3d7b0" stroke="#dcb47e" stroke-width="2"><rect x="24" y="40" width="86" height="76" rx="10"/></g>' +
      '<text x="34" y="86" font-size="15" fill="#b3701f">高気圧</text>' +
      '<g fill="#cfe3f5" stroke="#9dc3e4" stroke-width="2"><rect x="210" y="40" width="86" height="76" rx="10"/></g>' +
      '<text x="220" y="86" font-size="15" fill="#2f6fb0">低気圧</text>' +
      '<g stroke="#4b9ad6" stroke-width="4" stroke-linecap="round" fill="none">' +
      '<path d="M120 66 h72"/><path d="M186 58 l10 8 l-10 8"/>' +
      '<path d="M120 96 h72"/><path d="M186 88 l10 8 l-10 8"/></g>' +
      '<text x="126" y="126" font-size="12" fill="#1d2b3a">空気が流れる ＝ 風</text>' +
      '<g stroke="#b3701f" stroke-width="3" stroke-linecap="round"><path d="M52 34 v-12"/><path d="M52 22 l-5 7"/><path d="M52 22 l5 7"/></g>' +
      '<g stroke="#2f6fb0" stroke-width="3" stroke-linecap="round"><path d="M256 22 v12"/><path d="M256 34 l-5-7"/><path d="M256 34 l5-7"/></g>'
    );
  }

  function buildLearn() {
    const read = $('#sub-read');
    read.innerHTML = '';
    read.appendChild(el('p', 'lead',
      '天気予報の画面には、いろいろな数字がならんでいます。ひとつずつ見てみよう。' +
      '「予報」のタブで、本物の数字もたしかめられます。'));
    READ_CARDS.forEach(c => {
      const card = el('div', 'learn-card');
      card.innerHTML = '<h3>' + c.emoji + ' ' + c.title + '</h3><p>' + c.text + '</p>';
      read.appendChild(card);
    });

    const season = $('#sub-season');
    season.innerHTML = '';
    season.appendChild(el('p', 'lead', '日本には季節ごとに、とくちょうのある天気があります。絵を見ながら読んでみよう。'));
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
        '<p class="q-text">' + quiz.list.length + '問中 ' + quiz.hit + '問 正解！</p>' +
        '<p class="q-exp">' + (perfect ? '全問 正解！ 天気はかせだ！' : 'もう一度やると、べつの問題が出ます。') + '</p></div>';
      const again = el('button', 'btn primary', '↺ もう一度');
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
      '<div class="q-count">第 ' + (quiz.i + 1) + '問 ／ ' + quiz.list.length + '問</div>' +
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
        const exp = el('p', 'q-exp', (right ? '⭕ 正解！ ' : '❌ ざんねん… ') + q.exp);
        box.appendChild(exp);
        rubyize(exp);
        const next = el('button', 'btn primary', quiz.i + 1 >= quiz.list.length ? '結果を見る →' : 'つぎの問題 →');
        next.style.marginTop = '12px';
        next.addEventListener('click', () => {
          Sound.tap();
          quiz.i++; quiz.answered = false;
          renderQuiz();
        });
        box.appendChild(next);
        rubyize(next);
      });
      choices.appendChild(b);
    });
    box.appendChild(choices);
    rubyize(box);
  }

  /* ================= 画面の切りかえ ================= */
  const VIEWS = ['yohou', 'map', 'yosou', 'lab', 'manabu'];
  function showView(name) {
    VIEWS.forEach(v => $('#view-' + v).classList.toggle('hidden', v !== name));
    [...document.querySelectorAll('.dock-btn')].forEach(b => {
      b.classList.toggle('is-on', b.dataset.view === name);
    });
    window.scrollTo(0, 0);
    if (name === 'lab') Lab.redraw(); else Lab.stop();
    if (name === 'map') {
      WeatherMap.redraw();
      WeatherMap.setSelected(city.id);
      if (!mapLoaded[WeatherMap.getGroup()]) loadMap(WeatherMap.getGroup());
    }
    if (name === 'yosou') renderGuess();
  }

  /* ================= はじめる ================= */
  function init() {
    Sound.setEnabled(Store.get('sound') !== false);
    $('#btnSound').setAttribute('aria-pressed', Sound.enabled ? 'true' : 'false');
    $('#btnSound').textContent = Sound.enabled ? '🔊 音' : '🔇 音';
    $('#stampCount').textContent = Store.get('stamps');

    $('#btnSound').addEventListener('click', () => {
      const next = !Sound.enabled;
      Sound.setEnabled(next);
      Store.set('sound', next);
      $('#btnSound').setAttribute('aria-pressed', next ? 'true' : 'false');
      $('#btnSound').textContent = next ? '🔊 音' : '🔇 音';
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

    /* さいしょのタップで音が使えるようにする（スマホのきまり） */
    document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });

    /* タブにもどってきたら、日づけが変わっていれば取り直す */
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && data && data.today !== Weather.localNow(data.tzOffset).date) loadCity();
    });

    rubyize(document.querySelector('main'));
    rubyize(document.querySelector('.dock'));
    buildGroupTabs();
    buildChips();
    buildLearn();
    setupLab();
    setupMap();
    loadCity();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
