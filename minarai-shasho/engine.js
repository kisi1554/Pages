'use strict';

/*
 * がくしゅうエンジン（きょうざいに 依存しない ぶぶん）
 *
 * やっていること は 3つ だけ:
 *   1. かんかくを あけた ふくしゅう(SRS) …… まちがえた もんだいを 「モヤモヤ」に して、
 *      ちょうどよい 日に また 出す。ボックス方式(ライトナー)。
 *   2. しゅっだいの えらびかた …………… ポポの もちかえり > でてきたモヤモヤ > ふくしゅう > あたらしい
 *   3. しゅうじゅく度の けいさん ………… tag ごとの ボックス平均。ポポの うんこう成績に つかう。
 *
 * 「とく」と「まるつけする」の 2モードは、おなじ item から エンジンが つくる。
 * だから きょうざい(data.js)には 3たく問題を 1しゅるい 書くだけで よい。
 */

const Engine = (function () {

  const MIN = 60 * 1000;
  const DAY = 24 * 60 * MIN;

  /* ボックスが 上がるほど つぎに 出るまでが ながくなる */
  const INTERVAL = [10 * MIN, 1 * DAY, 2 * DAY, 4 * DAY, 7 * DAY, 14 * DAY, 30 * DAY];
  const MAX_BOX = INTERVAL.length - 1;

  /* ボックスが ここまで 上がったら モヤモヤは 「なかよし」に なる */
  const TAME_BOX = 3;

  let pack = null;
  let srs = null;   /* { itemId: {b, due, ok, ng, moya, tamed} } app.js の セーブデータを そのまま さわる */

  /* ---------------------------- どうぐ ---------------------------- */

  /* たねを 決めた らんすう。おなじ たねなら いつでも おなじ ならび */
  function rngFrom(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function shuffle(arr, rnd) {
    const r = rnd || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ------------------------- きろくの そうさ ------------------------- */

  function rec(id) {
    let r = srs[id];
    if (!r) {
      r = { b: -1, due: 0, ok: 0, ng: 0, moya: 0, tamed: 0 };
      srs[id] = r;
    }
    return r;
  }

  function seen(r) { return r.b >= 0; }

  function item(id) {
    return pack.items.find((it) => it.id === id) || null;
  }

  /*
   * こたえた けっかを きろくする。
   * かえりち: { born: モヤモヤが うまれた, tamed: なかよしに なった, box: いまのボックス }
   */
  function record(id, correct, now) {
    const r = rec(id);
    const out = { born: false, tamed: false, box: 0 };

    if (correct) {
      r.ok++;
      r.b = Math.min((r.b < 0 ? 0 : r.b) + 1, MAX_BOX);
      if (r.moya && !r.tamed && r.b >= TAME_BOX) {
        r.tamed = 1;
        out.tamed = true;
      }
    } else {
      r.ng++;
      r.b = 0;
      if (!r.moya) {
        r.moya = 1;
        out.born = true;
      }
    }
    r.due = now + INTERVAL[r.b];
    out.box = r.b;
    return out;
  }

  /* ------------------------ モヤモヤの じょうたい ------------------------ */

  /*
   * sleep … まだ 出てこない(ふくしゅうの 日が きていない)
   * awake … 今日 たおせる
   * friend… なかよしに なった(コレクション。もう へらない)
   */
  function moyaState(id, now) {
    const r = rec(id);
    if (!r.moya) return null;
    if (r.tamed) return 'friend';
    return r.due <= now ? 'awake' : 'sleep';
  }

  function moyaList(now) {
    const out = [];
    pack.items.forEach((it) => {
      const st = moyaState(it.id, now);
      if (st) out.push({ item: it, state: st, rec: rec(it.id) });
    });
    /* でてきた → ねむってる → なかよし の じゅん */
    const order = { awake: 0, sleep: 1, friend: 2 };
    out.sort((a, b) => (order[a.state] - order[b.state]) || (a.rec.due - b.rec.due));
    return out;
  }

  function awakeCount(now) {
    return pack.items.filter((it) => moyaState(it.id, now) === 'awake').length;
  }

  /* --------------------------- カードを つくる --------------------------- */

  /*
   * mode:
   *   solve … ふつうに とく(3たく)
   *   judge … ポポが 言った こたえに まるつけ する(おしえる がわの れんしゅう)
   */
  function makeCard(it, mode, rnd, from) {
    const r = rnd || Math.random;
    if (mode === 'judge') {
      const sayCorrect = r() < 0.5;
      let said;
      if (sayCorrect) {
        said = it.choices[it.a];
      } else {
        const wrong = it.choices.filter((_, i) => i !== it.a);
        said = wrong[Math.floor(r() * wrong.length)];
      }
      return {
        id: it.id, mode: 'judge', from: from || 'new',
        q: it.q, said: said, answer: it.choices[it.a],
        opts: [
          { t: 'あってる！', ok: sayCorrect },
          { t: 'ちがうよ', ok: !sayCorrect },
        ],
        hint: it.hint, fact: it.fact,
      };
    }
    const opts = shuffle(it.choices.map((t, i) => ({ t: t, ok: i === it.a })), r);
    return {
      id: it.id, mode: 'solve', from: from || 'new',
      q: it.q, answer: it.choices[it.a], opts: opts,
      hint: it.hint, fact: it.fact,
    };
  }

  /* -------------------------- セッションを くむ -------------------------- */

  /*
   * n もん ぶんの カードを えらぶ。
   * ゆうせん: ポポの もちかえり → でてきた モヤモヤ → きげんの きた ふくしゅう → あたらしい
   * まちがえた ものが たまっていても、あたらしい もんだいを かならず 1もんは まぜる
   * (「ふくしゅうだけ」に なると つまらなく なるため)。
   */
  function pickSession(n, now, popoIds) {
    const used = {};
    const picked = [];

    function add(it, from) {
      if (!it || used[it.id] || picked.length >= n) return;
      used[it.id] = 1;
      picked.push({ it: it, from: from });
    }

    (popoIds || []).forEach((id) => add(item(id), 'popo'));

    moyaList(now).filter((m) => m.state === 'awake')
      .forEach((m) => { if (picked.length < n - 1) add(m.item, 'moya'); });

    pack.items
      .filter((it) => seen(rec(it.id)) && rec(it.id).due <= now)
      .sort((a, b) => rec(a.id).due - rec(b.id).due)
      .forEach((it) => { if (picked.length < n - 1) add(it, 'review'); });

    shuffle(pack.items.filter((it) => !seen(rec(it.id))))
      .forEach((it) => add(it, 'new'));

    /* ぜんぶ おぼえて しまったら ボックスの ひくい ものから もう1かい */
    if (picked.length < n) {
      pack.items.slice()
        .sort((a, b) => rec(a.id).b - rec(b.id).b)
        .forEach((it) => add(it, 'review'));
    }

    /* まるつけ(judge)は 1かい おぼえた ものだけ。おおくても 2もんまで */
    let judges = 0;
    return picked.map((p) => {
      const r = rec(p.it.id);
      const canJudge = r.b >= 1 && p.from !== 'moya' && judges < 2 && Math.random() < 0.4;
      if (canJudge) judges++;
      return makeCard(p.it, canJudge ? 'judge' : 'solve', Math.random, p.from);
    });
  }

  /* きょうの いちばん でんしゃ: 日づけから きめるので、だれが やっても おなじ もんだい */
  function dailySet(dateKey, n) {
    const rnd = rngFrom(hash('daily:' + pack.id + ':' + dateKey));
    return shuffle(pack.items, rnd).slice(0, n)
      .map((it) => makeCard(it, 'solve', rnd, 'daily'));
  }

  /* --------------------------- しゅうじゅく度 --------------------------- */

  /* tag の グループの できぐあいを 0〜1 で かえす。まだ 見ていない もんだいは 0 あつかい */
  function mastery(tags) {
    const list = pack.items.filter((it) => it.tags.some((t) => tags.indexOf(t) >= 0));
    if (!list.length) return 0;
    let sum = 0;
    list.forEach((it) => {
      const r = rec(it.id);
      if (r.b > 0) sum += Math.min(r.b, 4) / 4;
    });
    return sum / list.length;
  }

  function tagScores() {
    const tags = {};
    pack.items.forEach((it) => it.tags.forEach((t) => { tags[t] = 1; }));
    return Object.keys(tags).map((t) => ({ tag: t, score: mastery([t]) }));
  }

  /*
   * ポポの 「じしん」。しゅうじゅく度を そのまま 出すと、
   * 3もん おぼえた くらいでは 数字が ほとんど うごかず つまらない ので、
   * はじめの うちほど のびが 見える ように カーブを かける。
   */
  function confidence(tags) {
    return Math.pow(mastery(tags), 0.6);
  }

  /*
   * ポポの うんこう けっか。
   *  - しゅうじゅく度が ひくくても かならず 4わり は すすむ(まったく だめ には しない)
   *  - すすめなかった ぶんは 「わからなかった もんだい」として もちかえる
   */
  function runResult(route, now) {
    const m = confidence(route.tags);
    const reach = Math.max(1, Math.round(route.length * (0.4 + 0.6 * m)));
    const perfect = reach >= route.length;

    const pool = pack.items.filter((it) => it.tags.some((t) => route.tags.indexOf(t) >= 0));
    const unseen = shuffle(pool.filter((it) => !seen(rec(it.id))));
    const weak = pool.filter((it) => seen(rec(it.id)) && rec(it.id).b <= 1);
    const bring = unseen.concat(shuffle(weak)).slice(0, perfect ? 1 : 2).map((it) => it.id);

    return { reach: reach, length: route.length, perfect: perfect, mastery: m, bring: bring };
  }

  /* ------------------------------ そのた ------------------------------ */

  function stats() {
    let learned = 0, moya = 0, friend = 0;
    pack.items.forEach((it) => {
      const r = rec(it.id);
      if (r.b >= 2) learned++;
      if (r.moya && !r.tamed) moya++;
      if (r.tamed) friend++;
    });
    return { total: pack.items.length, learned: learned, moya: moya, friend: friend };
  }

  /* つぎに モヤモヤが 出てくる 日を、日づけごとに かぞえる(しゅうらい カレンダー用) */
  function comingDays(now, days) {
    const out = [];
    for (let d = 0; d < days; d++) out.push(0);
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);
    const b = base.getTime();
    pack.items.forEach((it) => {
      const r = rec(it.id);
      if (!r.moya || r.tamed) return;
      const diff = Math.floor((r.due - b) / DAY);
      if (diff < 0) out[0]++;
      else if (diff < days) out[diff]++;
    });
    return out;
  }

  return {
    attach: function (p, s) { pack = p; srs = s; },
    rec: rec,
    item: item,
    record: record,
    moyaState: moyaState,
    moyaList: moyaList,
    awakeCount: awakeCount,
    makeCard: makeCard,
    pickSession: pickSession,
    dailySet: dailySet,
    mastery: mastery,
    confidence: confidence,
    tagScores: tagScores,
    runResult: runResult,
    stats: stats,
    comingDays: comingDays,
    TAME_BOX: TAME_BOX,
    MAX_BOX: MAX_BOX,
  };
})();
