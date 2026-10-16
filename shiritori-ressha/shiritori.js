/* しりとり れっしゃ — しりとり判定と カードくばり（ブラウザ / node 共通） */
(function (root) {
  "use strict";

  var SMALL = { "ぁ": "あ", "ぃ": "い", "ぅ": "う", "ぇ": "え", "ぉ": "お",
                "ゃ": "や", "ゅ": "ゆ", "ょ": "よ", "っ": "つ", "ゎ": "わ" };

  var DAKU = "がぎぐげござじずぜぞだぢづでどばびぶべぼ";
  var DAKU_BASE = "かきくけこさしすせそたちつてとはひふへほ";
  var HANDAKU = "ぱぴぷぺぽ";
  var HANDAKU_BASE = "はひふへほ";

  // 清音（を・ん は はじまりに こないので ふくめない）
  var SEION = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわ".split("");

  /** カタカナ → ひらがな（ー は そのまま） */
  function toHira(s) {
    return String(s).replace(/[ァ-ヶ]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0x60);
    });
  }

  /** にごり・まるを とった 清音（が→か、ぱ→は、ゔ→う） */
  function seion(c) {
    if (c === "ゔ") return "う";
    var i = DAKU.indexOf(c);
    if (i >= 0) return DAKU_BASE[i];
    i = HANDAKU.indexOf(c);
    if (i >= 0) return HANDAKU_BASE[i];
    return c;
  }

  /** はじめの もじ */
  function head(word) {
    var c = Array.from(toHira(word))[0] || "";
    return SMALL[c] || c;
  }

  /** つぎの ことばが はじまる もじ（ー は ひとつ前、小さい字は 大きく） */
  function lastChar(word) {
    var cs = Array.from(toHira(word));
    while (cs.length > 1 && cs[cs.length - 1] === "ー") cs.pop();
    var c = cs[cs.length - 1] || "";
    return SMALL[c] || c;
  }

  /** 「ん」で おわる？ */
  function endsWithN(word) {
    return lastChar(word) === "ん";
  }

  /** need（前の ことばの さいごの もじ）に word が つながるか */
  function canFollow(need, word, nigori) {
    var h = head(word);
    if (h === need) return true;
    return !!nigori && seion(h) === seion(need);
  }

  /** prev → next が しりとりとして つながるか */
  function connects(prev, next, nigori) {
    return canFollow(lastChar(prev), next, nigori);
  }

  function rand(rng, n) { return Math.floor(rng() * n); }

  function takeRandom(arr, rng) {
    return arr.splice(rand(rng, arr.length), 1)[0];
  }

  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = rand(rng, i + 1);
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function isUsed(used, w) {
    return used && (typeof used.has === "function" ? used.has(w) : used.indexOf(w) >= 0);
  }

  /** need に つながる まだ つかっていない ことば */
  function candidates(need, used, nigori, words) {
    return words.filter(function (o) {
      return !isUsed(used, o.w) && canFollow(need, o.w, nigori);
    });
  }

  /** つながる「ん」で おわらない ことば */
  function safeCandidates(need, used, nigori, words) {
    return candidates(need, used, nigori, words).filter(function (o) { return !endsWithN(o.w); });
  }

  /** まほうの きっぷ の いきさき（のこっている ことばが 多い もじ を えらぶ） */
  function pickRescueChar(used, nigori, words, rng, avoid) {
    rng = rng || Math.random;
    var heads = [];
    words.forEach(function (o) {
      if (isUsed(used, o.w) || endsWithN(o.w)) return;
      var h = head(o.w);
      if (h !== avoid && heads.indexOf(h) < 0) heads.push(h);
    });
    var good = heads.filter(function (c) { return safeCandidates(c, used, nigori, words).length >= 2; });
    var pool = good.length ? good : heads;
    return pool.length ? pool[rand(rng, pool.length)] : null;
  }

  /** さいしょに 機関車に のせる ことば */
  function pickStart(words, rng) {
    rng = rng || Math.random;
    var pool = words.filter(function (o) {
      return !endsWithN(o.w) && safeCandidates(lastChar(o.w), [o.w], false, words).length >= 3;
    });
    return pool[rand(rng, pool.length)];
  }

  /**
   * 4まいの カードを くばる。
   *  kind: "ok"（つながる） / "trap"（つながるが「ん」で おわる） / "wrong"（つながらない） / "rescue"（まほうの きっぷ）
   *  正解は 1〜2まい。つながる ことばが のこっていなければ まほうの きっぷ を まぜる。
   */
  function deal(need, used, nigori, words, rng) {
    rng = rng || Math.random;
    var cand = candidates(need, used, nigori, words);
    var safe = cand.filter(function (o) { return !endsWithN(o.w); });
    var trap = cand.filter(function (o) { return endsWithN(o.w); });
    var cards = [];

    if (safe.length) {
      cards.push({ kind: "ok", word: takeRandom(safe, rng) });
      var r = rng();
      if (trap.length && r < 0.35) cards.push({ kind: "trap", word: takeRandom(trap, rng) });
      else if (safe.length && r < 0.7) cards.push({ kind: "ok", word: takeRandom(safe, rng) });
    } else {
      if (trap.length) cards.push({ kind: "trap", word: takeRandom(trap, rng) });
      var next = pickRescueChar(used, nigori, words, rng, need);
      if (next) cards.push({ kind: "rescue", next: next });
    }

    var wrong = words.filter(function (o) {
      return !isUsed(used, o.w) && !canFollow(need, o.w, nigori);
    });
    while (cards.length < 4 && wrong.length) {
      cards.push({ kind: "wrong", word: takeRandom(wrong, rng) });
    }
    return shuffle(cards, rng);
  }

  var api = {
    SEION: SEION, toHira: toHira, seion: seion, head: head, lastChar: lastChar,
    endsWithN: endsWithN, canFollow: canFollow, connects: connects,
    candidates: candidates, safeCandidates: safeCandidates,
    pickRescueChar: pickRescueChar, pickStart: pickStart, deal: deal, shuffle: shuffle
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Shiritori = api;
})(this);
