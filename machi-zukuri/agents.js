/* ============================================================
   まちづくり — うごく もの（ひと・くるま・でんしゃ・できごと・まちの こえ）
   ・じかん は ゲーム の「ふん」。1びょう で MIN_PER_SEC ふん すすむ（1にち ＝ やく 2ふん半）。
   ・ひと と くるま は「しゅっぱつ → もくてき」の 1かい の おでかけ ごとに うまれて、ついたら きえる。
     けいろ は MACHI_CITY.route（しせつ から の きょり の ちず を さかのぼる）。
   ・でんしゃ は せんろ の マス を つたって はしり、えき で とまる。いきどまり で おりかえす。
   ============================================================ */
(function (root) {
  "use strict";

  var C = root.MACHI_CITY, D = root.MACHI_DATA, O = D.OBJ_ID;
  var MIN_PER_SEC = 10;
  var MAX_PEOPLE = 200, MAX_CARS = 50;
  var SPEED = { walk: 1.1, car: 2.6, train: 3.2, siren: 3.4, bike: 2.2 };
  var CAR_COLORS = ["#e03131", "#1c7ed6", "#f59f00", "#f8f9fa", "#495057", "#37b24d", "#ae3ec9", "#fd7e14"];
  var SHIRT = ["#ff6b6b", "#4dabf7", "#ffd43b", "#69db7c", "#da77f2", "#ffa94d", "#f783ac", "#63e6be"];

  function rnd(n) { return Math.random() * n | 0; }
  function pick(a) { return a[rnd(a.length)]; }
  function fun(n) { var d = n % 10; return n + (d === 1 || d === 3 || d === 4 || d === 6 || d === 8 || d === 0 ? " ぷん" : " ふん"); }
  function minutes(cells) { return Math.max(1, Math.round(cells * 0.5)); }

  function Sim(city, hooks) {
    this.hooks = hooks || {};
    this.time = 7 * 60;
    this.reset(city);
  }
  var P = Sim.prototype;

  P.reset = function (city) {
    this.c = city; this.ver = -1;
    this.people = []; this.cars = []; this.vehicles = []; this.trains = [];
    this.fires = {}; this.sick = {}; this.bubbles = []; this.pops = [];
    this.closed = new Uint8Array(city.w * city.h); this.closedList = [];
    this.nextEvent = 18 + Math.random() * 10; this.nextVoice = 3; this.spawnAcc = 0; this.carAcc = 0;
  };

  P.hour = function () { return (this.time / 60) % 24; };
  // あかるさ 0（よる）〜 1（ひる）
  P.light = function () {
    var h = this.hour();
    if (h >= 7 && h < 17) return 1;
    if (h >= 5 && h < 7) return (h - 5) / 2;
    if (h >= 17 && h < 19.5) return 1 - (h - 17) / 2.5;
    return 0;
  };
  P.period = function () {
    var h = this.hour();
    if (h >= 5 && h < 10) return { name: "あさ", icon: "🌅" };
    if (h >= 10 && h < 16) return { name: "ひる", icon: "☀️" };
    if (h >= 16 && h < 19) return { name: "ゆうがた", icon: "🌇" };
    return { name: "よる", icon: "🌙" };
  };

  // ---------- けいろ → せん（レーンの ずれ つき） ----------
  // cells: [たてもの, みち…, たてもの]。off: ひだりがわ へ の ずれ（マス）
  function polyline(c, cells, off) {
    var w = c.w, pts = [], n = cells.length;
    function cx(i) { return i % w + 0.5; }
    function cy(i) { return (i / w | 0) + 0.5; }
    function dir(a, b) { var dx = cx(b) - cx(a), dy = cy(b) - cy(a); var l = Math.abs(dx) + Math.abs(dy) || 1; return [dx / l, dy / l]; }
    for (var k = 0; k < n; k++) {
      var x = cx(cells[k]), y = cy(cells[k]);
      if (k > 0 && k < n - 1) {
        var a = dir(cells[k - 1], cells[k]), b = dir(cells[k], cells[k + 1]);
        // ひだり ＝ (dy, -dx)
        var lx = a[1], ly = -a[0], mx = b[1], my = -b[0];
        if (lx === mx && ly === my) { x += lx * off; y += ly * off; }
        else { x += (lx + mx) * off; y += (ly + my) * off; }
      }
      pts.push(x, y);
    }
    var len = [0];
    for (k = 1; k < n; k++) len.push(len[k - 1] + Math.hypot(pts[k * 2] - pts[k * 2 - 2], pts[k * 2 + 1] - pts[k * 2 - 1]));
    return { cells: cells, pts: pts, len: len, total: len[n - 1] };
  }
  function makeRoute(c, from, to, off) {
    var r = C.route(c, from, to);
    if (!r) return null;
    return polyline(c, [from].concat(r, [to]), off);
  }

  // すすむ（ふみきり が しまって いたら とまる）。ついたら true
  P.advance = function (a, dist) {
    var R = a.r;
    var ns = Math.min(R.total, a.s + dist);
    // つぎ の マス が しまった ふみきり なら、その てまえ で まつ
    var k = a.k;
    while (k < R.cells.length - 1 && R.len[k + 1] <= ns) k++;
    var nk = Math.min(R.cells.length - 1, k + 1);
    var nextCell = R.cells[nk];
    if (this.closed[nextCell] && !this.closed[R.cells[k]]) {
      var stop = R.len[k] + (R.len[nk] - R.len[k]) * 0.3;
      if (ns > stop) ns = Math.max(a.s, stop);
    }
    a.s = ns;
    while (a.k < R.cells.length - 2 && R.len[a.k + 1] <= a.s) a.k++;
    var k0 = a.k, seg = (R.len[k0 + 1] - R.len[k0]) || 1, t = (a.s - R.len[k0]) / seg;
    var x0 = R.pts[k0 * 2], y0 = R.pts[k0 * 2 + 1], x1 = R.pts[k0 * 2 + 2], y1 = R.pts[k0 * 2 + 3];
    a.x = x0 + (x1 - x0) * t; a.y = y0 + (y1 - y0) * t;
    if (x1 !== x0 || y1 !== y0) a.ang = Math.atan2(y1 - y0, x1 - x0);
    return a.s >= R.total - 1e-6;
  };

  // ---------- おでかけ ----------
  P.homes = function () { return C.list(this.c, "house").concat(C.list(this.c, "mansion"), C.list(this.c, "mansion"), C.list(this.c, "mansion")); };
  function anyOf(c, ids) { var o = []; ids.forEach(function (id) { o = o.concat(C.list(c, id)); }); return o; }

  P.pickTrip = function (car) {
    var c = this.c, h = this.hour(), homes = this.homes();
    if (!homes.length) return null;
    var home = pick(homes), dests, back = false, kid = false, r = Math.random();
    if (h >= 6.5 && h < 9.5) {
      if (!car && r < 0.4) { dests = C.list(c, "school"); kid = true; }
      else if (r < 0.7) dests = car ? anyOf(c, ["factory", "super", "hospital"]) : anyOf(c, ["station"]);
      else if (r < 0.85) dests = anyOf(c, ["factory", "post"]);
      else dests = anyOf(c, ["bakery", "super"]);
    } else if (h >= 9.5 && h < 15.5) {
      if (r < 0.3) { dests = anyOf(c, ["park", "library"]); kid = r < 0.15; }
      else if (r < 0.6) dests = anyOf(c, ["super", "bakery"]);
      else if (r < 0.8) dests = anyOf(c, ["hospital", "post", "koban", "police"]);
      else dests = anyOf(c, ["station", "factory", "field"]);
    } else if (h >= 15.5 && h < 20) {
      back = true;
      if (!car && r < 0.35) { dests = anyOf(c, ["school", "park"]); kid = true; }
      else dests = anyOf(c, ["station", "factory", "super", "bakery", "library"]);
    } else {
      if (Math.random() < 0.6) { back = true; dests = anyOf(c, ["station", "super"]); }
      else dests = anyOf(c, ["super", "station", "hospital"]);
    }
    if (!dests.length) dests = anyOf(c, ["super", "bakery", "park", "station", "school", "house"]);
    if (!dests.length) return null;
    var other = pick(dests);
    if (other === home) return null;
    return back ? { from: other, to: home, kid: kid } : { from: home, to: other, kid: kid };
  };

  // その じかん に まちに でて いる ひと の めやす（0〜1）
  P.busy = function () {
    var h = this.hour();
    if (h >= 7 && h < 9) return 1;
    if (h >= 16 && h < 19) return 0.9;
    if (h >= 9 && h < 16) return 0.6;
    if (h >= 5.5 && h < 7) return 0.35;
    if (h >= 19 && h < 22) return 0.35;
    return 0.08;
  };

  P.spawn = function (dt) {
    var c = this.c, pop = C.population(c), b = this.busy();
    var wantP = Math.min(MAX_PEOPLE, Math.round(pop * 0.55 * b));
    var wantC = Math.min(MAX_CARS, Math.round(pop * 0.14 * b));
    this.spawnAcc += dt * 16; this.carAcc += dt * 5;
    var tries = 0;
    while (this.spawnAcc >= 1 && this.people.length < wantP && tries++ < 6) {
      this.spawnAcc--;
      var t = this.pickTrip(false); if (!t) continue;
      var side = Math.random() < 0.5 ? 0.38 : -0.38;
      var R = makeRoute(c, t.from, t.to, side); if (!R) continue;
      this.people.push({ r: R, s: Math.random() * 0.2, k: 0, x: 0, y: 0, ang: 0, v: SPEED.walk * (0.8 + Math.random() * 0.4) * (t.kid ? 1.1 : 1),
        kid: t.kid, col: pick(SHIRT), hat: t.kid && Math.random() < 0.5 });
    }
    if (this.spawnAcc > 4) this.spawnAcc = 4;
    tries = 0;
    while (this.carAcc >= 1 && this.cars.length < wantC && tries++ < 4) {
      this.carAcc--;
      var tc = this.pickTrip(true); if (!tc) continue;
      var RC = makeRoute(c, tc.from, tc.to, 0.17); if (!RC || RC.total < 3) continue;
      this.cars.push({ r: RC, s: 0, k: 0, x: 0, y: 0, ang: 0, v: SPEED.car * (0.85 + Math.random() * 0.3), col: pick(CAR_COLORS), truck: Math.random() < 0.12 });
    }
    if (this.carAcc > 2) this.carAcc = 2;
  };

  // ---------- でんしゃ ----------
  P.railNext = function (cell, prev) {
    var c = this.c, opts = [];
    for (var d = 0; d < 4; d++) { var j = C.nb(c, cell, d); if (j >= 0 && c.rail[j] && j !== prev) opts.push(j); }
    if (!opts.length) return -1;
    if (opts.length === 1) return opts[0];
    // まっすぐ を すこし ゆうせん
    var sx = cell - prev;
    for (var k = 0; k < opts.length; k++) if (opts[k] - cell === sx && Math.random() < 0.6) return opts[k];
    return pick(opts);
  };
  P.syncTrains = function () {
    var c = this.c, n = c.w * c.h;
    // きえた せんろ に いる でんしゃ は けす
    this.trains = this.trains.filter(function (t) { return t.path.every(function (i) { return c.rail[i]; }); });
    var comp = new Int32Array(n).fill(-1), comps = [];
    for (var i = 0; i < n; i++) {
      if (!c.rail[i] || comp[i] >= 0) continue;
      var id = comps.length, q = [i], cells = [], st = [];
      comp[i] = id;
      while (q.length) {
        var a = q.pop(); cells.push(a); if (c.obj[a] === O.station) st.push(a);
        for (var d = 0; d < 4; d++) { var b = C.nb(c, a, d); if (b >= 0 && c.rail[b] && comp[b] < 0) { comp[b] = id; q.push(b); } }
      }
      comps.push({ cells: cells, st: st });
    }
    var have = {};
    this.trains.forEach(function (t) { var k = comp[t.path[0]]; have[k] = (have[k] || 0) + 1; });
    var self = this;
    comps.forEach(function (cp, id) {
      if (cp.cells.length < 3) return;
      var want = Math.min(4, 1 + Math.floor(cp.cells.length / 45));
      for (var k = have[id] || 0; k < want; k++) self.addTrain(cp.st.length ? pick(cp.st) : pick(cp.cells), k);
    });
  };
  P.addTrain = function (start, k) {
    var cars = 3 + rnd(2), path = [start], prev = -1, cur = start;
    for (var g = 0; g < cars + 1; g++) {
      var nx = this.railNext(cur, prev);
      if (nx < 0 || path.indexOf(nx) >= 0) break;
      path.push(nx); prev = cur; cur = nx;
    }
    if (path.length < 3) return;
    var colors = [["#2f9e44", "#ffffff"], ["#1971c2", "#e7f5ff"], ["#f08c00", "#fff4e6"], ["#c2255c", "#fff0f6"]];
    this.trains.push({ path: path, n: path.length - 2, f: 0, wait: k ? 1.5 * k : 0, col: colors[this.trains.length % 4], stopAt: -1, x: 0, y: 0 });
  };
  P.moveTrain = function (t, dist) {
    var c = this.c;
    if (t.wait > 0) { t.wait -= dist / SPEED.train; return; }
    t.f += dist;
    while (t.f >= 1) {
      var L = t.path.length, head = t.path[L - 1];
      if (c.obj[head] === O.station && t.stopAt !== head && c.obj[t.path[L - 2]] !== O.station) {
        t.stopAt = head; t.f = 1; t.wait = 2.2;
        if (this.hooks.event) this.hooks.event("station", head);
        return;
      }
      var nx = this.railNext(head, t.path[L - 2]);
      if (nx < 0) { // いきどまり → おりかえし
        t.path.reverse(); t.f = 0; t.stopAt = -1; t.wait = 0.8;
        return;
      }
      t.f -= 1;
      t.path.push(nx); if (t.path.length > t.n + 2) t.path.shift();
      if (c.obj[nx] !== O.station) t.stopAt = -1;
    }
  };
  // でんしゃ の しゃりょう の いち（render.js で つかう）
  P.trainCars = function (t) {
    var w = this.c.w, out = [], L = t.path.length, ph = L - 2 + Math.min(1, t.f);
    function at(p) {
      p = Math.max(0, Math.min(L - 1, p));
      var a = Math.floor(p), b = Math.min(L - 1, a + 1), u = p - a;
      var ax = t.path[a] % w + 0.5, ay = (t.path[a] / w | 0) + 0.5, bx = t.path[b] % w + 0.5, by = (t.path[b] / w | 0) + 0.5;
      return [ax + (bx - ax) * u, ay + (by - ay) * u];
    }
    for (var k = 0; k < t.n; k++) {
      var f = at(ph - k - 0.08), r = at(ph - k - 0.92);
      out.push({ x: (f[0] + r[0]) / 2, y: (f[1] + r[1]) / 2, ang: Math.atan2(f[1] - r[1], f[0] - r[0]), head: k === 0, tail: k === t.n - 1 });
    }
    return out;
  };

  // ---------- できごと ----------
  P.say = function (text, kind) { if (this.hooks.banner) this.hooks.banner(text, kind); };
  P.pop = function (cell, text) { this.pops.push({ cell: cell, text: text, life: 2.2 }); };

  P.dispatch = function (kind, from, to, onArrive, label) {
    var off = kind === "bike" ? 0.3 : 0.17;
    var R = makeRoute(this.c, from, to, off);
    if (!R) return null;
    var v = { kind: kind, r: R, s: 0, k: 0, x: 0, y: 0, ang: 0, v: kind === "bike" ? SPEED.bike : SPEED.siren, done: onArrive, label: label, wait: 0, home: from };
    this.vehicles.push(v);
    if (kind === "fire" || kind === "amb") { if (this.hooks.event) this.hooks.event("siren", to); }
    return v;
  };

  P.event = function () {
    var r = Math.random(), c = this.c;
    if (r < 0.34) this.fire();
    else if (r < 0.68) this.illness();
    else if (r < 0.9) this.mail();
    else this.patrol();
    void c;
  };
  P.reachableBuildings = function (ids) {
    var c = this.c, out = [];
    anyOf(c, ids).forEach(function (i) { if (C.doors(c, i).length) out.push(i); });
    return out;
  };

  P.fire = function () {
    var self = this, c = this.c;
    if (Object.keys(this.fires).length) return;
    var cand = this.reachableBuildings(["house", "mansion", "factory", "super", "bakery", "school", "library"]);
    if (!cand.length) cand = anyOf(c, ["house", "mansion", "factory"]);
    if (!cand.length) return;
    var at = pick(cand), f = { cell: at, t: 0, truck: null, mins: 0 };
    this.fires[at] = f;
    var st = C.nearest(c, ["fire"], at);
    if (!st) {
      f.out = 30;
      this.say(C.list(c, "fire").length ? "🔥 かじ だ！ でも しょうぼうしょ まで みち が つながって いないよ…" : "🔥 かじ だ！ でも しょうぼうしょ が ない…", "bad");
      return;
    }
    f.mins = minutes(st.d);
    this.say("🔥 かじ だ！ しょうぼうしゃ が しゅつどう！ とどくまで やく " + fun(f.mins), "warn");
    f.truck = this.dispatch("fire", st.i, at, function (v) {
      v.wait = 2.5; f.spray = 2.5;
      v.after = function () {
        delete self.fires[at];
        var msg = "💧 かじ が きえた！ " + fun(f.mins) + " で ついたよ。";
        if (f.mins > 5) msg += " もうすこし ちかく に しょうぼうしょ が あれば…";
        else msg += " ありがとう、しょうぼうしさん！";
        self.say(msg, f.mins > 5 ? "warn" : "good");
        self.goHome(v);
      };
    }, "🚒");
  };

  P.illness = function () {
    var self = this, c = this.c;
    if (Object.keys(this.sick).length) return;
    var cand = this.reachableBuildings(["house", "mansion", "school"]);
    if (!cand.length) return;
    var at = pick(cand), s = { cell: at };
    this.sick[at] = s;
    var base = C.nearest(c, ["fire"], at) || C.nearest(c, ["hospital"], at);
    if (!base) {
      this.say("🤒 びょうき の ひと が いるよ。でも きゅうきゅうしゃ が こられない…（しょうぼうしょ か びょういん を みち で つなごう）", "bad");
      s.out = 25; return;
    }
    var mins = minutes(base.d);
    this.say("🤒 びょうき の ひと！ きゅうきゅうしゃ が しゅつどう！ とどくまで やく " + fun(mins), "warn");
    this.dispatch("amb", base.i, at, function (v) {
      v.wait = 1.8;
      v.after = function () {
        delete self.sick[at];
        var hosp = C.nearest(c, ["hospital"], at);
        if (!hosp) { self.say("🚑 びょういん が ない…。とおく の まち の びょういん へ はこぶよ", "bad"); self.goHome(v); return; }
        var m2 = minutes(hosp.d);
        self.dispatch("amb", at, hosp.i, function (v2) {
          var msg = "🏥 びょういん に ついた！ もう だいじょうぶ。（" + fun(mins + m2) + "）";
          if (mins + m2 > 8) msg += " びょういん が もうすこし ちかく に あれば…";
          self.say(msg, mins + m2 > 8 ? "warn" : "good");
          v2.wait = 1.5; v2.after = function () { if (v.home !== hosp.i) self.goHome(v2, v.home); };
        }, "🚑");
      };
    }, "🚑");
  };

  P.mail = function () {
    var self = this, c = this.c, posts = this.reachableBuildings(["post"]);
    if (!posts.length) return;
    var po = pick(posts), hs = this.reachableBuildings(["house", "mansion"]).filter(function (h) { return C.roadDist(c, po, h) >= 0; });
    if (!hs.length) return;
    var stops = [], cur = po;
    for (var k = 0; k < 4 && hs.length; k++) {
      hs.sort(function (a, b) { return C.manhattan(c, cur, a) - C.manhattan(c, cur, b); });
      var nx = hs.splice(Math.min(hs.length - 1, rnd(3)), 1)[0];
      stops.push(nx); cur = nx;
    }
    this.say("✉️ ゆうびんやさん が てがみ を とどけに いくよ（" + stops.length + " けん）", "info");
    var go = function (from, idx) {
      if (idx >= stops.length) { self.dispatch("bike", from, po, null, "📮"); return; }
      self.dispatch("bike", from, stops[idx], function (v) {
        self.pop(stops[idx], "✉️"); if (self.hooks.event) self.hooks.event("mail", stops[idx]);
        v.wait = 0.6; v.after = function () { go(stops[idx], idx + 1); };
      }, "📮");
    };
    go(po, 0);
  };

  P.patrol = function () {
    var c = this.c, st = this.reachableBuildings(["police", "koban"]);
    if (!st.length) return;
    var from = pick(st), to = pick(this.reachableBuildings(["house", "mansion", "park", "school", "super"]) || []);
    if (to == null) return;
    var self = this;
    this.dispatch("police", from, to, function (v) { v.after = function () { self.goHome(v); }; }, "🚓");
  };
  P.goHome = function (v, home) {
    var R = makeRoute(this.c, v.r.cells[v.r.cells.length - 1], home == null ? v.home : home, 0.17);
    if (!R) return;
    v.r = R; v.s = 0; v.k = 0; v.done = null; v.after = null; v.back = true;
  };

  // ---------- まちの こえ ----------
  P.voice = function () {
    var c = this.c, hp = C.happiness(c);
    if (!hp.houses.length) return;
    var i = pick(hp.houses), m = hp.moods[i];
    if (this.bubbles.some(function (b) { return b.cell === i; })) return;
    var text;
    if (m.wish.length && Math.random() < 0.75) text = m.wish[Math.random() < 0.6 ? 0 : rnd(m.wish.length)];
    else if (m.good.length) text = pick(m.good);
    else text = "どんな まち に なるかな";
    var face = m.score >= 0.7 ? "😊" : m.score >= 0.4 ? "🙂" : "😟";
    this.bubbles.push({ cell: i, text: text, face: face, life: 4.5 });
    if (this.bubbles.length > 3) this.bubbles.shift();
    if (this.hooks.event) this.hooks.event("voice", i);
  };

  // ---------- 1コマ ----------
  P.step = function (dt) {
    var c = this.c;
    if (this.ver !== c.ver) {
      this.ver = c.ver;
      if (this.closed.length !== c.w * c.h) { this.reset(c); this.ver = c.ver; }
      this.syncTrains();
      // いけなく なった おでかけ は けす（みち が きえた とき）
      var ok = function (a) { return a.r.cells.every(function (i, k) { return k === 0 || k === a.r.cells.length - 1 || c.road[i]; }); };
      this.people = this.people.filter(ok); this.cars = this.cars.filter(ok); this.vehicles = this.vehicles.filter(ok);
    }
    if (dt <= 0) return;
    this.time += dt * MIN_PER_SEC;

    // ふみきり
    var prevClosed = this.closedList, k, i;
    for (k = 0; k < prevClosed.length; k++) this.closed[prevClosed[k]] = 0;
    var cl = [];
    for (k = 0; k < this.trains.length; k++) {
      var t = this.trains[k], L = t.path.length;
      for (var j = 0; j < L; j++) { i = t.path[j]; if (c.road[i] && !this.closed[i]) { this.closed[i] = 1; cl.push(i); } }
      // まえ の 2マス も しめる
      var h = t.path[L - 1], pv = t.path[L - 2];
      for (var q = 0; q < 2; q++) {
        var nx = -1;
        for (var d = 0; d < 4; d++) { var b = C.nb(c, h, d); if (b >= 0 && c.rail[b] && b !== pv) { nx = b; break; } }
        if (nx < 0) break;
        if (c.road[nx] && !this.closed[nx]) { this.closed[nx] = 1; cl.push(nx); }
        pv = h; h = nx;
      }
    }
    if (this.hooks.event) for (k = 0; k < cl.length; k++) if (prevClosed.indexOf(cl[k]) < 0) { this.hooks.event("crossing", cl[k]); break; }
    this.closedList = cl;

    for (k = 0; k < this.trains.length; k++) this.moveTrain(this.trains[k], dt * SPEED.train);

    this.spawn(dt);
    var self = this;
    this.people = this.people.filter(function (a) { return !self.advance(a, a.v * dt); });
    this.cars = this.cars.filter(function (a) { return !self.advance(a, a.v * dt); });
    // とちゅう で しゅつどう した くるま は this.vehicles に はいるので、あとで くっつける
    var cur = this.vehicles; this.vehicles = [];
    var keep = cur.filter(function (v) {
      if (v.wait > 0) { v.wait -= dt; if (v.wait <= 0 && v.after) { var f = v.after; v.after = null; f(); return v.r && v.s < v.r.total; } return true; }
      if (!self.advance(v, v.v * dt)) return true;
      if (v.done) { var g = v.done; v.done = null; g(v); return v.wait > 0 || v.s < v.r.total; }
      return false;
    });
    this.vehicles = keep.concat(this.vehicles);

    // かじ・びょうき が しぜん に おわる（しょうぼうしょ が ない とき）
    for (var fk in this.fires) {
      var f = this.fires[fk]; f.t += dt;
      if (f.spray) f.spray -= dt;
      if (f.out != null) { f.out -= dt; if (f.out <= 0) { delete this.fires[fk]; this.say("🌧️ あめ が ふって かじ が きえた。しょうぼうしょ を みち で つなごう！", "info"); } }
      else if (f.truck && this.vehicles.indexOf(f.truck) < 0 && f.t > 4) delete this.fires[fk];
    }
    for (var sk in this.sick) {
      var s = this.sick[sk];
      if (s.out != null) { s.out -= dt; if (s.out <= 0) delete this.sick[sk]; }
    }

    this.bubbles = this.bubbles.filter(function (b) { b.life -= dt; return b.life > 0; });
    this.pops = this.pops.filter(function (p) { p.life -= dt; return p.life > 0; });
    this.nextVoice -= dt;
    if (this.nextVoice <= 0) { this.nextVoice = 4 + Math.random() * 4; this.voice(); }
    this.nextEvent -= dt;
    if (this.nextEvent <= 0) { this.nextEvent = 22 + Math.random() * 18; this.event(); }
  };

  // のこり じかん（かじ の ばしょ に だす）
  P.eta = function (v) { return minutes(Math.max(0, v.r.total - v.s)); };

  Sim.MIN_PER_SEC = MIN_PER_SEC;
  Sim.fun = fun;
  root.MACHI_SIM = Sim;
})(this);
