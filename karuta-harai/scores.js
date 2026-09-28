/* かるた はらい — きろくの ほぞん（ゲームと ランキングで きょうつう） */
(function () {
  var KEY = 'karuta-harai.scores.v1';
  var MAX = 100;

  function load() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(a) ? a.filter(function (e) { return e && typeof e.score === 'number'; }) : [];
    } catch (e) { return []; }
  }

  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }

  // たかい じゅん。おなじ てんなら さきに だした ひとが うえ
  function sort(list) {
    return list.sort(function (a, b) { return (b.score - a.score) || (a.at - b.at); });
  }

  // ついかして うえから 100けんだけ のこす。rank は 1〜100、はみだしたら 0
  function add(entry) {
    var list = sort(load().concat([entry])).slice(0, MAX);
    var ok = save(list);
    var rank = 0;
    for (var i = 0; i < list.length; i++) if (list[i].id === entry.id) { rank = i + 1; break; }
    return { rank: rank, saved: ok, list: list };
  }

  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  function bestThrow() {
    return load().reduce(function (m, e) { return Math.max(m, e.best || 0); }, 0);
  }

  window.KarutaScores = { load: function () { return sort(load()); }, add: add, clear: clear, bestThrow: bestThrow, MAX: MAX };
})();
