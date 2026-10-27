/* ============================================================
   さんすう どうじょう — 出題・記録の しくみ（DOM なし。node でも うごく）
   - 単元の とうろく（units/*.js が SD.unit(...) で いれる）
   - もんだいの 生成・答えあわせ・まちがえ方の 見立て
   - ライトナー方式の 間隔反復、きょうの けいこ、しょうきゅう しけん
   - きろく（3人まで）。localStorage は try/catch
   ============================================================ */
(function (root) {
  "use strict";
  var SD = root.SD = root.SD || {};

  /* ---------- らんすう ---------- */
  SD.rng = function (seed) {
    var s = (seed == null ? Math.floor(Math.random() * 4294967296) : seed) >>> 0;
    var next = function () { // mulberry32
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var R = {
      next: next,
      int: function (a, b) { return a + Math.floor(next() * (b - a + 1)); },
      pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      chance: function (p) { return next() < p; },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(next() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
      },
      // おもみつきで えらぶ: [[おもみ, あたい], ...]
      wpick: function (list) {
        var sum = 0; list.forEach(function (x) { sum += x[0]; });
        var v = next() * sum;
        for (var i = 0; i < list.length; i++) { v -= list[i][0]; if (v < 0) return list[i][1]; }
        return list[list.length - 1][1];
      }
    };
    return R;
  };

  /* ---------- もじ: {漢字|かんじ} → ふりがな ／ よみあげ ---------- */
  SD.h = function (s) {
    return String(s == null ? "" : s).replace(/\{([^|{}]+)\|([^{}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>");
  };
  SD.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  SD.say = function (s) {
    return String(s == null ? "" : s)
      .replace(/\{([^|{}]+)\|([^{}]+)\}/g, "$2")
      .replace(/<rt>.*?<\/rt>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/(\d)\s*×\s*(\d)/g, "$1 かける $2")
      .replace(/\s*＋\s*|\s*\+\s*/g, " たす ")
      .replace(/\s*[−-]\s*(?=\d|□)/g, " ひく ")
      .replace(/\s*×\s*/g, " かける ")
      .replace(/\s*=\s*□/g, " は？")
      .replace(/\s*=\s*/g, " は ")
      .replace(/□/g, "なに")
      .replace(/\s+/g, " ")
      .trim();
  };

  /* ---------- おび ---------- */
  SD.BELTS = [
    { id: "shiro", name: "しろおび", color: "#ffffff", line: "#c9c9c9", grade: "ねんちょう", g: 0 },
    { id: "kiiro", name: "きいろおび", color: "#ffd43b", line: "#e0a800", grade: "ねんちょう〜1ねん", g: 0.5 },
    { id: "orange", name: "オレンジおび", color: "#fd7e14", line: "#d9480f", grade: "1ねん", g: 1 },
    { id: "midori", name: "みどりおび", color: "#2f9e44", line: "#1f6f30", grade: "1ねん", g: 1.6 },
    { id: "ao", name: "あおおび", color: "#1c7ed6", line: "#1559a0", grade: "2ねん", g: 2 },
    { id: "murasaki", name: "むらさきおび", color: "#7048e8", line: "#5032b4", grade: "2ねん", g: 2.4 },
    { id: "cha", name: "ちゃおび", color: "#8d5524", line: "#5e3814", grade: "2ねん", g: 2.8 },
    { id: "kuro", name: "くろおび", color: "#212529", line: "#000000", grade: "2ねん まとめ", g: 3 }
  ];
  SD.beltIdx = function (id) { for (var i = 0; i < SD.BELTS.length; i++) if (SD.BELTS[i].id === id) return i; return -1; };
  SD.belt = function (id) { return SD.BELTS[SD.beltIdx(id)]; };

  /* 学年の めやす（ほごしゃ がめん）: その じきに とれて いると よい おび */
  SD.GRADES = [
    { id: "k", name: "ねんちょう", belt: 0 },
    { id: "1a", name: "1ねんせい（1がっき）", belt: 1 },
    { id: "1b", name: "1ねんせい（2がっき）", belt: 2 },
    { id: "1c", name: "1ねんせい（3がっき）", belt: 3 },
    { id: "2a", name: "2ねんせい（1がっき）", belt: 4 },
    { id: "2b", name: "2ねんせい（2がっき）", belt: 5 },
    { id: "2c", name: "2ねんせい（3がっき）", belt: 6 },
    { id: "3", name: "3ねんせい いじょう", belt: 7 }
  ];

  /* ---------- 単元の とうろく ---------- */
  SD.units = [];
  var byId = {};
  SD.unit = function (def) {
    if (byId[def.id]) throw new Error("unit dup " + def.id);
    def.key = def.key || function (p) { return JSON.stringify(p); };
    def.input = def.input || "pad";
    byId[def.id] = def;
    SD.units.push(def);
    SD.units.sort(function (a, b) { return SD.beltIdx(a.belt) - SD.beltIdx(b.belt) || a.order - b.order; });
    return def;
  };
  SD.U = function (id) { return byId[id]; };
  SD.unitsOf = function (belt) { return SD.units.filter(function (u) { return u.belt === belt; }); };

  /* ---------- さんすうの おてつだい ---------- */
  var M = SD.M = {};
  M.digits = function (n) { return String(n).split("").reverse().map(Number); }; // 一の位 から
  // くりあがりの かず（ひっ算で なんかい 1 が あがるか）
  M.carries = function (a, b) {
    var x = M.digits(a), y = M.digits(b), c = 0, n = 0;
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var s = (x[i] || 0) + (y[i] || 0) + c;
      c = s >= 10 ? 1 : 0; n += c;
    }
    return n;
  };
  // くりさがりの かず（a − b、a ≥ b）
  M.borrows = function (a, b) {
    var x = M.digits(a), y = M.digits(b), br = 0, n = 0;
    for (var i = 0; i < x.length; i++) {
      var d = x[i] - (y[i] || 0) - br;
      br = d < 0 ? 1 : 0; n += br;
    }
    return n;
  };
  // くりあがり を わすれた ときの こたえ（けた ごとに 1の くらいだけ のこす）
  M.addNoCarry = function (a, b) {
    var x = M.digits(a), y = M.digits(b), out = [];
    for (var i = 0; i < Math.max(x.length, y.length); i++) out.push(((x[i] || 0) + (y[i] || 0)) % 10);
    return Number(out.reverse().join(""));
  };
  // くりさがり の かわりに 大きい ほう から 小さい ほうを ひいて しまう
  M.subSwapDigits = function (a, b) {
    var x = M.digits(a), y = M.digits(b), out = [];
    for (var i = 0; i < x.length; i++) out.push(Math.abs(x[i] - (y[i] || 0)));
    return Number(out.reverse().join(""));
  };
  // くりさげた のに 上の 位から 1 を ひきわすれた
  M.subNoDecrement = function (a, b) {
    var x = M.digits(a), y = M.digits(b), out = [];
    for (var i = 0; i < x.length; i++) {
      var d = x[i] - (y[i] || 0);
      out.push(d < 0 ? d + 10 : d);
    }
    return Number(out.reverse().join(""));
  };
  M.kuku = function (a, b) { return a * b; };
  // とけい: みじかい はり・ながい はり の かくど（12じ が 0°、とけい まわり）
  M.handAngles = function (h, m) { return { hour: ((h % 12) * 30 + m * 0.5) % 360, minute: (m * 6) % 360 }; };
  // かくど → じこく（みじかい はり は「どの すうじ を すぎたか」、ながい はり は ふん）
  M.timeFromAngles = function (hourDeg, minDeg) {
    var m = Math.round(((minDeg % 360) + 360) % 360 / 6) % 60;
    // みじかい はりは ながい はりの ぶん すすんで いるので、それを ひいて から じを きめる
    var h = Math.round((((hourDeg - m * 0.5) % 360) + 360) % 360 / 30) % 12;
    return { h: h === 0 ? 12 : h, m: m };
  };
  M.toMin = function (h, m) { return (h % 12) * 60 + m; };
  M.fromMin = function (t) { t = ((t % 720) + 720) % 720; var h = Math.floor(t / 60); return { h: h === 0 ? 12 : h, m: t % 60 }; };
  M.fmtTime = function (h, m, kanji) {
    var ji = kanji ? "{時|じ}" : "じ", fun = function (mm) { return kanji ? "{分|ふん}" : (([1, 3, 4, 6, 8, 0].indexOf(mm % 10) >= 0) ? "ぷん" : "ふん"); };
    if (m === 0) return h + ji;
    if (m === 30 && !kanji) return h + "じはん";
    return h + ji + " " + m + fun(m);
  };

  // すうじの せんたくし（こたえの ちかくの かず）
  SD.numChoices = function (ans, r, lo, hi, k) {
    k = k || 4; lo = lo == null ? 0 : lo; hi = hi == null ? Math.max(10, ans + 3) : hi;
    var set = [ans], tries = 0;
    while (set.length < k && tries++ < 200) {
      var d = r.pick([-1, 1, -2, 2, -3, 3, 10, -10]);
      var v = ans + d;
      if (v >= lo && v <= hi && set.indexOf(v) < 0) set.push(v);
    }
    for (var v2 = lo; set.length < k && v2 <= hi; v2++) if (set.indexOf(v2) < 0) set.push(v2);
    return r.shuffle(set).map(function (v) { return { v: v, h: String(v) }; });
  };

  /* ---------- 答えあわせ と まちがえ方の 見立て ---------- */
  SD.check = function (p, given) {
    if (given == null || given === "") return false;
    if (typeof p.ans === "number") return Number(given) === p.ans;
    return String(given) === String(p.ans);
  };

  SD.HINTS = {
    "op-swap-add": "{引|ひ}き{算|ざん}に なって いる かも。「あわせて」「ふえると」は たしざん だよ",
    "op-swap-sub": "たしざん に なって いる かも。「のこりは」「ちがいは」は ひきざん だよ",
    "op-add-mul": "たしざん に なって いる かも。かけざん は「○の いくつぶん」だよ",
    "off1": "おしい！ 1 ちがい。ゆびで ひとつずつ さしながら かぞえて みよう",
    "place": "{位|くらい}取り に ちゅうい！ 10 と 2 で「102」では なくて「12」と かくよ",
    "reverse": "すうじの じゅんばんが ぎゃく かも。十の くらい が ひだり だよ",
    "carry-forgot": "くりあがり の 1 を わすれた かも。10 が できたら となりの くらいへ 1 あげよう",
    "make10-forgot": "10 の まとまりを わすれた かも。10 を つくって、のこりと あわせよう",
    "borrow-swap": "ひけない ときに、ぎゃくに ひいて いない？ 10 の まとまり から ひこう",
    "borrow-keep": "くりさげた ら、となりの くらいを 1 へらすのを わすれずに",
    "genka-half": "10 から ひいた あと、のこって いた ばら を たすのを わすれた かも",
    "decomp-total": "ぜんぶの かずを こたえて いるよ。「いくつ と いくつ」の かたほう を さがそう",
    "count-miss": "かぞえ まちがい かも。1つずつ しるしを つけて かぞえよう",
    "ord-end": "「まえ から」か「うしろ から」か を もういちど みよう",
    "ord-card": "「3ばんめ」は 1ぴき だけ、「3びき」は 3びき ぜんぶ だよ",
    "hands-swap": "ながい はり と みじかい はり が ぎゃく かも。みじかい はり が「じ」だよ",
    "hour-next": "みじかい はり は まだ つぎの すうじ に ついて いないよ。すぎた ほうの すうじ を よもう",
    "kuku-next": "となりの 九九 に なって いる かも。○の だん を となえ なおそう",
    "unit-mix": "たんい に ちゅうい！ 1cm ＝ 10mm、1m ＝ 100cm だよ",
    "all-plus": "ぜんぶ たして いない？ − の ところ は ひくよ",
    "tape-op": "テープの ずで、もとめる ところ が ぜんたい か ぶぶん か を みよう"
  };

  SD.diagnose = function (p, given) {
    var u = byId[p.u];
    if (u && u.diagnose) { var c = u.diagnose(p, given); if (c) return c; }
    var k = p.kind || {}, g = Number(given), ans = p.ans;
    if (typeof ans !== "number" || isNaN(g)) return null;
    var tens = Math.floor(ans / 10), ones = ans % 10;
    if (ans >= 10 && ans < 100 && g === Number(String(tens * 10) + String(ones))) return "place";
    if (k.op === "+") {
      if (g === Math.abs(k.a - k.b)) return "op-swap-add";
      if (M.carries(k.a, k.b) > 0 && g === M.addNoCarry(k.a, k.b)) return ans < 20 ? "make10-forgot" : "carry-forgot";
    }
    if (k.op === "-") {
      if (g === k.a + k.b) return "op-swap-sub";
      if (M.borrows(k.a, k.b) > 0) {
        if (g === M.subSwapDigits(k.a, k.b)) return "borrow-swap";
        if (g === M.subNoDecrement(k.a, k.b)) return "borrow-keep";
        if (k.a < 20 && g === 10 - k.b) return "genka-half";
      }
    }
    if (k.op === "*") {
      if (g === k.a + k.b) return "op-add-mul";
      if (g === k.a * (k.b + 1) || g === k.a * (k.b - 1) || g === (k.a + 1) * k.b || g === (k.a - 1) * k.b) return "kuku-next";
    }
    if (k.op === "3" && k.terms) {
      var all = k.terms.reduce(function (s, t) { return s + Math.abs(t); }, 0);
      if (g === all && all !== ans) return "all-plus";
    }
    if (k.op === "decomp" && g === k.T) return "decomp-total";
    if (ans >= 10 && String(g).length === 2 && String(g) === String(ans).split("").reverse().join("") && g !== ans) return "reverse";
    if (Math.abs(g - ans) === 1) return k.op === "count" ? "count-miss" : "off1";
    return null;
  };

  /* ---------- もんだいを つくる ---------- */
  // lv: 0 = どうぐ つき、1 = どうぐ なし、2 = しけん
  SD.build = function (u, params, lv) {
    var p = u.build(params, lv || 0);
    p.u = u.id; p.params = params; p.lv = lv || 0; p.key = u.id + ":" + u.key(params);
    p.type = p.type || u.title;
    return p;
  };
  SD.genOne = function (u, r, lv, avoid) {
    var p;
    for (var i = 0; i < 12; i++) {
      p = SD.build(u, u.gen(r, lv || 0), lv);
      if (!avoid || !avoid[p.key]) break;
    }
    if (avoid) avoid[p.key] = 1;
    return p;
  };
  SD.PRACTICE_N = 6;
  SD.makePractice = function (u, r) {
    var avoid = {}, out = [];
    var n = u.practiceN || SD.PRACTICE_N, half = Math.ceil(n / 2);
    for (var i = 0; i < n; i++) out.push(SD.genOne(u, r, i < half ? 0 : 1, avoid));
    return out;
  };
  SD.TEST_N = 10; SD.TEST_PASS = 8;
  SD.testUnits = function (beltId) {
    if (beltId === "kuro") return !SD.unitsOf("kuro").length ? [] : SD.units.filter(function (u) { return u.belt !== "kuro" && u.testable !== false; });
    return SD.unitsOf(beltId).filter(function (u) { return u.testable !== false; });
  };
  SD.makeTest = function (beltId, r) {
    var us = r.shuffle(SD.testUnits(beltId)), avoid = {}, out = [];
    if (!us.length) return out;
    var extra = beltId === "kuro" ? SD.unitsOf("kuro").filter(function (u) { return u.inKuroTest; }) : [];
    for (var i = 0; i < SD.TEST_N; i++) {
      var u = (extra.length && i >= SD.TEST_N - 2) ? extra[i % extra.length] : us[i % us.length];
      out.push(SD.genOne(u, r, 2, avoid));
    }
    return r.shuffle(out);
  };

  /* ---------- 日づけ ---------- */
  SD.today = function (d) {
    d = d || new Date();
    var z = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  };
  SD.dayNum = function (s) { var a = s.split("-").map(Number); return Math.round(Date.UTC(a[0], a[1] - 1, a[2]) / 86400000); };
  SD.dayStr = function (n) { var d = new Date(n * 86400000); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0"); };

  /* ---------- ライトナー方式（にがて ばこ） ----------
     まちがえた もんだい は 1ばんの はこへ（あした また でる）。
     せいかい する たびに つぎの はこへ。はこが すすむほど 間が あく。5ばん で せいかい → そつぎょう */
  SD.GAP = [0, 1, 2, 4, 7, 14];
  SD.leitnerUpdate = function (rec, p, ok, today) {
    var L = rec.L || (rec.L = {}), t = SD.dayNum(today), it = L[p.key];
    if (!ok) {
      L[p.key] = { u: p.u, p: p.params, box: 1, due: t + 1, miss: ((it && it.miss) || 0) + 1 };
      return L[p.key];
    }
    if (!it) return null;
    if (it.box >= 5) { delete L[p.key]; return null; }
    it.box += 1; it.due = t + SD.GAP[it.box];
    return it;
  };
  SD.leitnerDue = function (rec, today) {
    var L = rec.L || {}, t = SD.dayNum(today), out = [];
    Object.keys(L).forEach(function (k) { var it = L[k]; if (it.due <= t && byId[it.u]) out.push(Object.assign({ key: k }, it)); });
    out.sort(function (a, b) { return a.box - b.box || a.due - b.due; });
    return out;
  };

  /* ---------- きろく ---------- */
  SD.newRec = function () {
    return { units: {}, belts: [], L: {}, log: [], stamps: {}, free: false, grade: "k", tests: {} };
  };
  SD.uRec = function (rec, uid) { return rec.units[uid] || (rec.units[uid] = { demo: 0, exp: 0, stars: 0, n: 0 }); };
  SD.LOG_MAX = 3000;
  SD.logResult = function (rec, p, ok, ms, mis, mode) {
    rec.log.push({ t: Date.now(), u: p.u, ty: p.type, ok: ok ? 1 : 0, ms: Math.round(ms || 0), mis: mis || undefined, md: mode || "p" });
    if (rec.log.length > SD.LOG_MAX) rec.log.splice(0, rec.log.length - SD.LOG_MAX);
  };
  SD.starsFor = function (miss, n) { return miss === 0 ? 3 : miss <= Math.max(1, Math.floor(n / 3)) ? 2 : 1; };

  SD.stats = function (rec) {
    var units = {}, types = {}, mis = {};
    rec.log.forEach(function (e) {
      var u = units[e.u] || (units[e.u] = { n: 0, ok: 0, ms: 0 });
      u.n++; u.ok += e.ok; u.ms += e.ms;
      var t = types[e.ty] || (types[e.ty] = { n: 0, ok: 0, u: e.u });
      t.n++; t.ok += e.ok;
      if (e.mis) mis[e.mis] = (mis[e.mis] || 0) + 1;
    });
    Object.keys(units).forEach(function (k) { units[k].avg = units[k].n ? units[k].ms / units[k].n : 0; });
    return { units: units, types: types, mis: mis };
  };

  /* ---------- ひらく じゅんばん ---------- */
  SD.passed = function (rec, beltId) { return rec.belts.indexOf(beltId) >= 0; };
  SD.curBelt = function (rec) {
    var best = -1;
    rec.belts.forEach(function (b) { best = Math.max(best, SD.beltIdx(b)); });
    return best;
  };
  SD.unitOpen = function (rec, u) {
    if (rec.free) return true;
    var list = SD.unitsOf(u.belt), i = list.indexOf(u), bi = SD.beltIdx(u.belt);
    if (i > 0) return (SD.uRec(rec, list[i - 1].id).stars || 0) > 0 || SD.passed(rec, u.belt);
    if (bi === 0) return true;
    return SD.passed(rec, SD.BELTS[bi - 1].id) || SD.curBelt(rec) >= bi - 1;
  };
  SD.testOpen = function (rec, beltId) {
    if (rec.free) return SD.testUnits(beltId).length > 0;
    var bi = SD.beltIdx(beltId);
    if (bi > 0 && SD.curBelt(rec) < bi - 1) return false;
    var list = SD.unitsOf(beltId);
    if (!list.length && beltId !== "kuro") return false;
    return list.every(function (u) { return (SD.uRec(rec, u.id).stars || 0) > 0; });
  };
  // 学年に あわせて とちゅう から: その おび より まえ を「とった」ことに する
  SD.startFrom = function (rec, beltIdx) {
    rec.belts = SD.BELTS.slice(0, beltIdx).map(function (b) { return b.id; });
  };
  // いま すすめる 単元（ひらいて いて ★が まだ つかない さいしょ）
  SD.currentUnit = function (rec) {
    var open = SD.units.filter(function (u) { return SD.unitOpen(rec, u) && u.belt !== "kuro"; });
    for (var i = 0; i < open.length; i++) if (!(SD.uRec(rec, open[i].id).stars > 0)) return open[i];
    return open[open.length - 1] || SD.units[0];
  };

  /* ---------- きょうの けいこ（5ふん ≒ 8もん） ---------- */
  SD.KEIKO_N = 8;
  SD.makeKeiko = function (rec, r, today) {
    var out = [], avoid = {};
    SD.leitnerDue(rec, today).slice(0, 3).forEach(function (it) {
      var u = byId[it.u]; if (!u) return;
      var p = SD.build(u, it.p, 1); p.from = "にがて"; avoid[p.key] = 1; out.push(p);
    });
    var done = SD.units.filter(function (u) { return u.belt !== "kuro" && SD.uRec(rec, u.id).stars > 0; });
    var cur = SD.currentUnit(rec);
    var nNew = 3;
    for (var j = 0; j < 2 && done.length; j++) { var p2 = SD.genOne(r.pick(done), r, 1, avoid); p2.from = "ふくしゅう"; out.push(p2); }
    for (var k = 0; k < nNew; k++) { var p3 = SD.genOne(cur, r, k === 0 ? 0 : 1, avoid); p3.from = "あたらしい"; out.push(p3); }
    while (out.length < SD.KEIKO_N) {
      var pool = done.length ? done : [cur];
      var p4 = SD.genOne(r.pick(pool), r, 1, avoid); p4.from = "ふくしゅう"; out.push(p4);
    }
    return { list: out.slice(0, SD.KEIKO_N), unit: cur };
  };

  /* ---------- ほぞん（3人まで） ---------- */
  SD.KEY = "sansuu-dojo-v1";
  SD.MAX_KIDS = 3;
  SD.newState = function () {
    return { v: 1, cur: "p1", kids: [{ id: "p1", name: "でし" }], set: { sound: true, speech: true, fast: false }, rec: { p1: SD.newRec() } };
  };
  SD.load = function () {
    var st = SD.newState();
    try {
      var raw = root.localStorage && root.localStorage.getItem(SD.KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.kids && s.kids.length) {
          st = s;
          st.set = Object.assign({ sound: true, speech: true, fast: false }, s.set || {});
          st.kids.forEach(function (k) { st.rec[k.id] = Object.assign(SD.newRec(), st.rec[k.id] || {}); });
          if (!st.rec[st.cur]) st.cur = st.kids[0].id;
        }
      }
    } catch (e) { /* よめなくても あそべる */ }
    return st;
  };
  SD.save = function (st) {
    try { root.localStorage && root.localStorage.setItem(SD.KEY, JSON.stringify(st)); } catch (e) { /* ほぞん できなくても つづける */ }
  };
  SD.addKid = function (st, name) {
    if (st.kids.length >= SD.MAX_KIDS) return null;
    var id = "p" + (Date.now() % 1e8).toString(36);
    st.kids.push({ id: id, name: name || "でし" + (st.kids.length + 1) });
    st.rec[id] = SD.newRec();
    return id;
  };
  SD.removeKid = function (st, id) {
    if (st.kids.length <= 1) return false;
    st.kids = st.kids.filter(function (k) { return k.id !== id; });
    delete st.rec[id];
    if (st.cur === id) st.cur = st.kids[0].id;
    return true;
  };

  if (typeof module === "object" && module.exports) module.exports = SD;
})(typeof window !== "undefined" ? window : globalThis);
