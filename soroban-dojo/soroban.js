/* ============================================================
   そろばん どうじょう — そろばんの しくみ（けいさん だけ。がめんは app.js）
   ・1・4 そろばん: 1けたは { five: 0|1, ones: 0..4 }（5だま 1こ、1だま 4こ）
   ・たま ⇔ かず の へんかん
   ・たしざん・ひきざん の「ただしい たまの うごかしかた（てじゅん）」を つくる
       ちょくせつ（そのまま）／ 5の あわせ・わかれ ／ 10の あわせ・わかれ ／ 5と10 の くみあわせ
   ・うごき（move）: { place, bead: "five"|"one", delta, finger, kind }
       place  … くらい（0=いちのくらい, 1=じゅうのくらい …）
       five の delta +1 = 5だまを はりへ おろす（+5）、-1 = あげる（-5）
       one  の delta +k = 1だまを k こ はりへ あげる、-k = k こ さげる
       finger … "thumb"（おやゆび: 1だまを あげる）／ "index"（ひとさしゆび: 1だまを さげる・5だま）
   ブラウザでは window.Soroban、node では module.exports で つかう
   ============================================================ */
(function (root) {
  "use strict";

  function digitOf(b) { return b.five * 5 + b.ones; }
  function beadOf(d) { return { five: d >= 5 ? 1 : 0, ones: d % 5 }; }
  function clone(rods) { return rods.map(function (b) { return { five: b.five, ones: b.ones }; }); }

  /* ---------- ひだり→みぎ の けた（がめん）⇔ かず ----------
     rods[0] が いちばん ひだり。unit は「いちのくらい」の けた（ていいてん の ある けた）。
     unit より みぎの けたは しょうすう（0.1, 0.01 …） */
  function toNumber(rods, unit) {
    var v = 0;
    for (var i = 0; i < rods.length; i++) {
      var d = digitOf(rods[i]);
      if (d) v += d * Math.pow(10, unit - i);
    }
    return Math.round(v * 1e6) / 1e6;
  }
  function fromNumber(n, len, unit) {
    if (n < 0 || n !== Math.floor(n)) throw new Error("0 いじょうの せいすう だけ: " + n);
    if (String(n).length > unit + 1) throw new Error("けたが たりない: " + n);
    var rods = [];
    for (var i = 0; i < len; i++) {
      var p = unit - i;
      rods.push(beadOf(p < 0 ? 0 : Math.floor(n / Math.pow(10, p)) % 10));
    }
    return rods;
  }

  /* ---------- くらい（place）で もつ じょうたい ---------- */
  function placesFromNumber(n, size) {
    var s = []; size = size || Math.max(String(n).length + 2, 4);
    for (var p = 0; p < size; p++) s.push(beadOf(Math.floor(n / Math.pow(10, p)) % 10));
    return s;
  }
  function placesToNumber(s) {
    var v = 0;
    for (var p = s.length - 1; p >= 0; p--) v = v * 10 + digitOf(s[p]);
    return v;
  }

  /* うごきを 1つ じっさいに やる。ありえない うごき なら エラー */
  function applyMove(s, m) {
    var b = s[m.place];
    if (!b) throw new Error("けたが ない: " + m.place);
    if (m.bead === "five") {
      if (m.delta === 1 && b.five === 0) b.five = 1;
      else if (m.delta === -1 && b.five === 1) b.five = 0;
      else throw new Error("5だまは うごかせない: " + JSON.stringify(m) + " " + JSON.stringify(b));
    } else {
      var o = b.ones + m.delta;
      if (m.delta === 0 || o < 0 || o > 4) throw new Error("1だまが たりない／あまる: " + JSON.stringify(m) + " " + JSON.stringify(b));
      b.ones = o;
    }
    return s;
  }

  function fingerFor(bead, delta) { return bead === "one" && delta > 0 ? "thumb" : "index"; }
  function mv(place, bead, delta, kind) {
    return { place: place, bead: bead, delta: delta, finger: fingerFor(bead, delta), kind: kind };
  }

  /* ---------- 1けたの けいさんの しゅるい ----------
     "direct"  … そのまま いれる／はらう
     "five"    … 5の あわせ（たしざん）／ 5の わかれ（ひきざん）
     "ten"     … 10の あわせ（くりあがり）／ 10の わかれ（くりさがり）
     "fiveten" … 10の あわせ・わかれ の なかで 5の わかれ・あわせ も つかう（れい: 6+7, 13-6） */
  function kindAdd(c, d) {
    var b = beadOf(c);
    if (c + d >= 10) return kindSub(c, 10 - d) === "five" ? "fiveten" : "ten";
    if (d >= 5) return "direct";               // c<=4 なので 5だまは あいている
    return b.ones + d <= 4 ? "direct" : "five"; // ここに くるのは c<=4 だけ
  }
  function kindSub(c, d) {
    var b = beadOf(c);
    if (c < d) return kindAdd(c, 10 - d) === "five" ? "fiveten" : "ten";
    if (d >= 5) return "direct";               // c>=5 で b.ones>=d-5
    return b.ones >= d ? "direct" : "five";
  }
  function classify(c, d, op) { return op === "-" ? kindSub(c, d) : kindAdd(c, d); }

  var NAME = {
    direct: "そのまま", five: "5の あわせ", ten: "10の あわせ", fiveten: "5と10の あわせ",
    "five-": "5の わかれ", "ten-": "10の わかれ", "fiveten-": "5と10の わかれ"
  };
  function kindName(kind, op) { return kind === "direct" ? NAME.direct : NAME[kind + (op === "-" ? "-" : "")]; }

  var PLACE_NAME = ["いち", "じゅう", "ひゃく", "せん", "まん", "じゅうまん", "ひゃくまん"];

  /* ---------- てじゅん づくり ----------
     phases: [{ text, kind, place, moves:[…] }] … がめんで せつめいを だしながら さいせいする かたまり */
  function addDigit(s, p, d, phases) {
    if (!d) return;
    if (p >= s.length) throw new Error("そろばんの けたが たりない");
    var c = digitOf(s[p]), b = s[p], k = kindAdd(c, d);
    var where = p === 0 ? "" : PLACE_NAME[p] + "の くらいに ";
    if (c + d >= 10) {
      // 10の あわせ（くりあがり）: (10-d) を はらって、となりの けたに 1 を たす
      subDigit(s, p, 10 - d, phases, k);
      var ph = phases[phases.length - 1];
      ph.text = where + d + " を たす → " + d + " と " + (10 - d) + " で 10。" + (10 - d) + " を はらって となりに 1｜" + ph.text;
      var from = phases.length;
      addDigit(s, p + 1, 1, phases);
      phases[from].text = "くりあがり｜" + phases[from].text;
      phases[from].carry = true;
      return;
    }
    var ms;
    if (d >= 5) {
      ms = [mv(p, "five", 1, k)];
      if (d > 5) ms.push(mv(p, "one", d - 5, k));
      push(s, phases, p, k, where + d + " を いれる", ms);
    } else if (b.ones + d <= 4) {
      push(s, phases, p, k, where + d + " を いれる", [mv(p, "one", d, k)]);
    } else {
      // 5の あわせ: 5 を いれて (5-d) を はらう
      push(s, phases, p, k, where + d + " を いれたいけど 1だまが たりない → 5 を いれて " + (5 - d) + " を はらう",
        [mv(p, "five", 1, k), mv(p, "one", -(5 - d), k)]);
    }
  }

  function subDigit(s, p, d, phases, kind) {
    if (!d) return;
    if (p >= s.length) throw new Error("ひけない");
    var c = digitOf(s[p]), b = s[p], k = kind || kindSub(c, d);
    var where = p === 0 ? "" : PLACE_NAME[p] + "の くらいから ";
    if (c < d) {
      // 10の わかれ（くりさがり）: となりの けたから 1 を とって、(10-d) を いれる
      var from = phases.length;
      subDigit(s, p + 1, 1, phases);
      phases[from].text = where + d + " を ひく → たりないので となりから 1 を とる｜" + phases[from].text;
      phases[from].carry = true;
      var add = [];
      addDigit(s, p, 10 - d, add);
      add.forEach(function (ph) {
        ph.kind = k; ph.moves.forEach(function (m) { m.kind = k; });
        ph.text = "10 から " + d + " を ひいた のこり｜" + ph.text;
        phases.push(ph);
      });
      return;
    }
    if (d >= 5) {
      var ms = [];
      if (d > 5) ms.push(mv(p, "one", -(d - 5), k));
      ms.push(mv(p, "five", -1, k));
      push(s, phases, p, k, where + d + " を はらう", ms);
    } else if (b.ones >= d) {
      push(s, phases, p, k, where + d + " を はらう", [mv(p, "one", -d, k)]);
    } else {
      // 5の わかれ: (5-d) を いれて 5 を はらう
      push(s, phases, p, k, where + d + " を はらいたいけど 1だまが たりない → " + (5 - d) + " を いれて 5 を はらう",
        [mv(p, "one", 5 - d, k), mv(p, "five", -1, k)]);
    }
  }

  function push(s, phases, p, k, text, moves) {
    moves.forEach(function (m) { applyMove(s, m); });
    phases.push({ text: text, kind: k, place: p, moves: moves });
  }

  /* s（くらいの じょうたい）に n を たす／ひく。たかい くらい から じゅんに（そろばんの きほん）。
     s は かきかわる。もどりちは phases */
  function planAdd(s, n) {
    var phases = [], str = String(n);
    for (var i = 0; i < str.length; i++) addDigit(s, str.length - 1 - i, +str[i], phases);
    return phases;
  }
  function planSub(s, n) {
    if (placesToNumber(s) < n) throw new Error("マイナスに なる");
    var phases = [], str = String(n);
    for (var i = 0; i < str.length; i++) subDigit(s, str.length - 1 - i, +str[i], phases);
    return phases;
  }
  /* start から terms（+/− の かず の ならび）を じゅんに けいさんする てじゅん */
  function planSeries(start, terms, size) {
    var s = placesFromNumber(start, size), all = [];
    terms.forEach(function (t, i) {
      var ph = t < 0 ? planSub(s, -t) : planAdd(s, t);
      ph.forEach(function (x) { x.term = i; });
      all = all.concat(ph);
    });
    return { phases: all, result: placesToNumber(s), state: s };
  }
  function flatMoves(phases) {
    var out = [];
    phases.forEach(function (ph) { out = out.concat(ph.moves); });
    return out;
  }

  /* ---------- もんだい づくり ---------- */
  function rnd(rand, a, b) { return a + Math.floor(rand() * (b - a + 1)); }
  /* 1けたの もんだい: そのけた c に d を たす／ひく。kind が あうものを えらぶ */
  function pairsOf(kind, op) {
    var out = [];
    for (var c = 0; c <= 9; c++) for (var d = 1; d <= 9; d++) {
      if (classify(c, d, op) === kind) out.push([c, d]);
    }
    return out;
  }
  function makeStepProblem(kind, op, rand) {
    rand = rand || Math.random;
    var list = pairsOf(kind, op), pr = list[Math.floor(rand() * list.length)];
    var c = pr[0], d = pr[1], tens = 0;
    // くりさがりは となりに 1 が いる。くりあがりは となりが 9 だと れんさ するので さける
    if (kind === "ten" || kind === "fiveten") tens = rnd(rand, 1, op === "-" ? 9 : 8);
    else if (rand() < 0.3) tens = rnd(rand, 1, 8);
    var a = tens * 10 + c;
    return { a: a, op: op, b: d, answer: op === "-" ? a - d : a + d };
  }
  /* 2けたの「そのまま」だけで できる もんだい */
  function makeDirect2(op, rand) {
    rand = rand || Math.random;
    for (;;) {
      var a = rnd(rand, 10, 99), b = rnd(rand, 10, 99);
      var ok = [0, 1].every(function (p) {
        var c = Math.floor(a / Math.pow(10, p)) % 10, d = Math.floor(b / Math.pow(10, p)) % 10;
        return d === 0 || classify(c, d, op) === "direct";
      });
      if (ok && (op === "+" ? a + b < 100 : a >= b)) return { a: a, op: op, b: b, answer: op === "-" ? a - b : a + b };
    }
  }
  /* みとりざん: digits けたの かずを count こ。minus が true なら ひきざん も まぜる（とちゅうで マイナスに しない） */
  function makeMitori(digits, count, minus, rand) {
    rand = rand || Math.random;
    var lo = Math.pow(10, digits - 1), hi = Math.pow(10, digits) - 1;
    var terms = [], sum = 0;
    for (var i = 0; i < count; i++) {
      var n = rnd(rand, lo, hi);
      if (minus && i > 0 && sum - lo >= 0 && rand() < 0.4) n = -Math.min(n, sum);
      sum += n; terms.push(n);
    }
    return { terms: terms, answer: sum };
  }

  /* しんさ ふう テスト の めやす（じぶんたちで きめた もの） */
  var GRADES = [
    { kyu: 10, digits: 1, count: 3, minus: false, n: 10, sec: 300, pass: 7 },
    { kyu: 9,  digits: 1, count: 4, minus: true,  n: 10, sec: 300, pass: 7 },
    { kyu: 8,  digits: 1, count: 5, minus: true,  n: 10, sec: 300, pass: 7 },
    { kyu: 7,  digits: 2, count: 3, minus: false, n: 10, sec: 360, pass: 7 },
    { kyu: 6,  digits: 2, count: 4, minus: true,  n: 10, sec: 360, pass: 7 },
    { kyu: 5,  digits: 2, count: 5, minus: true,  n: 10, sec: 420, pass: 8 },
    { kyu: 4,  digits: 3, count: 3, minus: false, n: 10, sec: 420, pass: 8 },
    { kyu: 3,  digits: 3, count: 4, minus: true,  n: 10, sec: 480, pass: 8 },
    { kyu: 2,  digits: 3, count: 5, minus: true,  n: 10, sec: 480, pass: 9 },
    { kyu: 1,  digits: 3, count: 6, minus: true,  n: 10, sec: 540, pass: 9 }
  ];
  function judge(grade, correct, usedSec) {
    return correct >= grade.pass && usedSec <= grade.sec;
  }

  var Soroban = {
    digitOf: digitOf, beadOf: beadOf, clone: clone, toNumber: toNumber, fromNumber: fromNumber,
    placesFromNumber: placesFromNumber, placesToNumber: placesToNumber, applyMove: applyMove,
    classify: classify, kindName: kindName, pairsOf: pairsOf, PLACE_NAME: PLACE_NAME,
    planAdd: planAdd, planSub: planSub, planSeries: planSeries, flatMoves: flatMoves,
    makeStepProblem: makeStepProblem, makeDirect2: makeDirect2, makeMitori: makeMitori,
    GRADES: GRADES, judge: judge
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Soroban;
  else root.Soroban = Soroban;
})(this);
