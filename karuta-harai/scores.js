/* かるた はらい — きろく・だんい・ずかん の ほぞん（ゲーム・ランキング・ずかんで きょうつう） */
(function () {
  var KEY = 'karuta-harai.scores.v1';
  var DAN_KEY = 'karuta-harai.dan.v1';
  var ZUKAN_KEY = 'karuta-harai.zukan.v1';
  var MAX = 100;                     // モードごとに うえから 100けん

  function read(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; }
  }

  /* ---------------- きろく ---------------- */
  // mode: 'tobashi'（とばし・m）/ 'sagashi'（ふださがし・てん）。むかしの きろくは とばし
  function modeOf(e) { return e.mode || 'tobashi'; }

  function loadAll() {
    var a = read(KEY, []);
    return Array.isArray(a) ? a.filter(function (e) { return e && typeof e.score === 'number'; }) : [];
  }
  // たかい じゅん。おなじ てんなら さきに だした ひとが うえ
  function sort(list) { return list.sort(function (a, b) { return (b.score - a.score) || (a.at - b.at); }); }

  function load(mode) {
    mode = mode || 'tobashi';
    return sort(loadAll().filter(function (e) { return modeOf(e) === mode; }));
  }

  // ついかして、その モードの うえから 100けんだけ のこす。rank は 1〜100、はみだしたら 0
  function add(entry) {
    var mode = modeOf(entry);
    var all = loadAll().concat([entry]);
    var mine = sort(all.filter(function (e) { return modeOf(e) === mode; })).slice(0, MAX);
    var others = all.filter(function (e) { return modeOf(e) !== mode; });
    var ok = write(KEY, others.concat(mine));
    var rank = 0;
    for (var i = 0; i < mine.length; i++) if (mine[i].id === entry.id) { rank = i + 1; break; }
    return { rank: rank, saved: ok, list: mine };
  }

  function clear(mode) {
    if (!mode) { try { localStorage.removeItem(KEY); } catch (e) {} return; }
    write(KEY, loadAll().filter(function (e) { return modeOf(e) !== mode; }));
  }

  function bestThrow() {
    return load('tobashi').reduce(function (m, e) { return Math.max(m, e.best || 0); }, 0);
  }

  /* ---------------- だんい ---------------- */
  var DAN = [
    { k: '無段', y: 'むだん' }, { k: '初段', y: 'しょだん' }, { k: '二段', y: 'にだん' },
    { k: '三段', y: 'さんだん' }, { k: '四段', y: 'よんだん' }, { k: '五段', y: 'ごだん' },
    { k: '六段', y: 'ろくだん' }, { k: '七段', y: 'ななだん' }, { k: '八段', y: 'はちだん' },
    { k: '名人・クイーン', y: 'めいじん・クイーン' }
  ];
  // この てん いじょうで その だん（1だん〜めいじん）
  var DAN_LINE = {
    tobashi: [5, 9, 13, 17, 21, 25, 29, 33, 38],                 // 3まいの ごうけい m
    sagashi: [200, 350, 500, 650, 750, 850, 950, 1050, 1200]     // 5かいの ごうけい てん
  };
  function danOf(mode, score) {
    var line = DAN_LINE[mode] || DAN_LINE.tobashi, lv = 0;
    for (var i = 0; i < line.length; i++) if (score >= line[i]) lv = i + 1;
    return lv;
  }
  function nextLine(mode, lv) { var l = DAN_LINE[mode] || DAN_LINE.tobashi; return lv < l.length ? l[lv] : null; }
  function danName(lv) { return DAN[Math.max(0, Math.min(DAN.length - 1, lv))]; }
  // <ruby> つきの HTML（なまえ いがいは この もじしか はいらない）
  function danHtml(lv) {
    var d = danName(lv);
    if (lv === 9) return '<ruby>名人<rt>めいじん</rt></ruby>・クイーン';
    return '<ruby>' + d.k + '<rt>' + d.y + '</rt></ruby>';
  }
  // なまえごとの いちばん たかい だん
  function getDan(name) {
    var m = read(DAN_KEY, {}), r = (m && m[name]) || {};
    return Math.max(r.tobashi || 0, r.sagashi || 0);
  }
  function recordDan(name, mode, lv) {
    var m = read(DAN_KEY, {}); if (!m || typeof m !== 'object') m = {};
    var before = Math.max((m[name] || {}).tobashi || 0, (m[name] || {}).sagashi || 0);
    m[name] = m[name] || {};
    m[name][mode] = Math.max(m[name][mode] || 0, lv);
    write(DAN_KEY, m);
    return { before: before, after: Math.max(before, lv) };
  }

  /* ---------------- ずかん ---------------- */
  // { ばんごう: { n: とった かず, best: いちばん とおく(m), at: はじめて とった とき } }
  function zukan() { var z = read(ZUKAN_KEY, {}); return z && typeof z === 'object' ? z : {}; }
  function collect(no, dist) {
    var z = zukan(), cur = z[no], isNew = !cur;
    cur = cur || { n: 0, best: 0, at: Date.now() };
    cur.n++;
    if (dist > cur.best) cur.best = Math.round(dist * 100) / 100;
    z[no] = cur;
    write(ZUKAN_KEY, z);
    return isNew;
  }
  function zukanCount() { return Object.keys(zukan()).length; }

  window.KarutaScores = {
    load: load, add: add, clear: clear, bestThrow: bestThrow, MAX: MAX,
    danOf: danOf, danName: danName, danHtml: danHtml, nextLine: nextLine, getDan: getDan, recordDan: recordDan,
    zukan: zukan, collect: collect, zukanCount: zukanCount
  };
})();
