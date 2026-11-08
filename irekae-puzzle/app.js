/* かもつ いれかえ パズル — がめん・アニメ・そうさ */
(function () {
  "use strict";
  var Y = window.Yard, SND = window.IPSound, STAGES = window.IREKAE_STAGES;
  var KEY = "irekae-puzzle-v1";
  var K = 100;            // 1りょう の ながさ（SVG の たんい）
  var LOCO = 1.5, ROW = 1.3, LX = 1.25;   // ROW は たてなが の がめん で ひろげる（buildGeo）
  var NS = "http://www.w3.org/2000/svg";

  var TYPES = {
    r: { n: "りんご", e: "🍎", c: "#e03131", d: "#a51d1d" },
    b: { n: "さかな", e: "🐟", c: "#1c7ed6", d: "#124f8a" },
    g: { n: "やさい", e: "🥬", c: "#2f9e44", d: "#1d6a2c" },
    y: { n: "せきゆ", e: "🛢️", c: "#f2b705", d: "#a67c00", tank: true },
    p: { n: "ぶどう", e: "🍇", c: "#8e44ad", d: "#5e2a75" },
    w: { n: "ざいもく", e: "🪵", c: "#b5651d", d: "#7a4110" },
    k: { n: "にもつ", e: "📦", c: "#868e96", d: "#495057" },
    e: { n: "からっぽ", e: "", c: "#dee2e6", d: "#868e96" },
    x: { n: "こわれた かしゃ", e: "🔧", c: "#495057", d: "#212529" }
  };

  // ---------- ほぞん ----------
  var save = { stars: {}, best: {}, daily: {}, sound: true };
  try { var raw = localStorage.getItem(KEY); if (raw) save = Object.assign(save, JSON.parse(raw)); } catch (e) { /* */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* */ } }
  SND.setOn(save.sound);

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var a in attrs) n.setAttribute(a, attrs[a]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function trackName(i) { return i === 0 ? "しゅっぱつ せん" : i + "ばん せん"; }

  function toStage(o) {
    return {
      id: o.id, tip: o.tip, par: o.par, H: o.H,
      tracks: o.tracks.map(function (c) { return { cap: c }; }),
      start: { loco: o.start.loco.split(""), tr: o.start.tr.map(function (s) { return s.split(""); }) },
      goal: { dep: o.goal.split(""), keep: o.keep ? [o.keep] : undefined }
    };
  }
  function starsFor(moves, par) {
    if (moves <= par) return 3;
    if (moves <= par + Math.max(2, Math.ceil(par / 2))) return 2;
    return 1;
  }

  // ---------- ホーム ----------
  function unlocked(id) {
    var hi = 0;
    for (var k in save.stars) if (save.stars[k] > 0 && +k > hi) hi = +k;
    return id <= hi + 2;
  }
  function totalStars() {
    var n = 0; for (var k in save.stars) n += save.stars[k] || 0; return n;
  }
  function renderHome() {
    $("starCount").textContent = totalStars();
    var box = $("stageList"); box.innerHTML = "";
    var groups = [[1, 10, "れんしゅう", "わきせん 1ぽん・3りょう"], [11, 25, "なかま が ふえた", "わきせん 2ほん"], [26, 40, "めいじん への みち", "わきせん 3ぼん・じょうけん つき"]];
    groups.forEach(function (g) {
      var sec = document.createElement("section"); sec.className = "group";
      sec.innerHTML = "<h2>" + g[0] + "〜" + g[1] + " <small>" + g[2] + "（" + g[3] + "）</small></h2>";
      var grid = document.createElement("div"); grid.className = "grid";
      for (var id = g[0]; id <= g[1]; id++) {
        var b = document.createElement("button");
        var st = save.stars[id] || 0, lock = !unlocked(id);
        b.className = "st-btn" + (lock ? " lock" : "") + (st ? " done" : "");
        b.dataset.id = id;
        b.innerHTML = "<b>" + (lock ? "🔒" : id) + "</b><span>" + (st ? "★".repeat(st) + "☆".repeat(3 - st) : lock ? "" : "☆☆☆") + "</span>";
        b.disabled = lock;
        b.setAttribute("aria-label", "ステージ " + id + (lock ? "（まだ）" : ""));
        b.addEventListener("click", (function (n) { return function () { SND.unlock(); startStage(toStage(STAGES[n - 1])); }; })(id));
        grid.appendChild(b);
      }
      sec.appendChild(grid); box.appendChild(sec);
    });
    var d = save.daily[today()];
    $("dailyInfo").textContent = d ? "きょう は " + d + "て で できた！" : "ひづけ で かわる もんだい";
  }

  // ---------- プレイ の じょうたい ----------
  var G = null;   // { stage, type[], S, undo[], moves, sel, phase, inX, cut, a, geo }
  var fast = false;

  function typesOf(S) {
    var f = function (id) { return G.type[id]; };
    return { loco: S.loco.map(f), tr: S.tr.map(function (a) { return a.map(f); }) };
  }

  function startStage(stage) {
    var type = [], S = { loco: [], tr: [] }, nid = 0;
    S.loco = stage.start.loco.map(function (t) { type[nid] = t; return nid++; });
    S.tr = stage.start.tr.map(function (a) { return a.map(function (t) { type[nid] = t; return nid++; }); });
    G = { stage: stage, type: type, S: S, start: Y.clone(S), undo: [], moves: 0, sel: 0, phase: "park", inX: -1, cut: 0, plan: null, hints: 0 };
    show("play");
    G.geo = buildGeo(stage);
    $("titleText").textContent = stage.id === "daily" ? "まいにち もんだい" : "ステージ " + stage.id;
    renderOrder();
    buildBoard();
    G.a = parkA(S.loco.length);
    draw();
    updateUI();
    say(stage.tip || "ポイント を えらんで ▶ で すすもう。ちゅうもん どおり に ならべてね");
  }

  // ---------- せんろ の かたち ----------
  function rowFor(stage) {
    var w = $("boardWrap"), n = stage.tracks.length - 1;
    var r = w && w.clientWidth ? w.clientHeight / w.clientWidth : 0;
    // よこ の ながさ から だいたい の たかさ を だして、あまる ほど せんろ の あいだ を ひろげる
    var Wu = 0.3 + LOCO + stage.H + 0.2 + n * 1.25 + 0.5 + Math.max.apply(null, stage.tracks.map(function (t) { return t.cap; })) + 1.5;
    var room = (r * Wu - 1.6) / Math.max(1, n);
    return Math.max(1.3, Math.min(2.1, room));
  }
  function buildGeo(stage) {
    ROW = rowFor(stage);
    var H = stage.H, P = 0.3 + LOCO + H + 0.2;
    var tr = stage.tracks.map(function (t, i) {
      var jx = P + i * LX, y = i * ROW;
      var S = i === 0 ? P + 1.0 : jx + 0.5;
      var E = S + t.cap;
      var pts = i === 0 ? [[0, 0], [E + 0.12, 0]] : [[0, 0], [P, 0], [jx, y], [E + 0.12, y]];
      var cum = [0];
      for (var k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
      // ながさ s で かんがえる ため、x の E を s に なおす
      var sE = cum[cum.length - 1] - 0.12;
      return { i: i, y: y, jx: jx, S: S, E: E, sE: sE, cap: t.cap, pts: pts, cum: cum };
    });
    var W = 0;
    tr.forEach(function (t) { W = Math.max(W, t.E + 1.2); });
    return { P: P, tr: tr, W: W, Hh: (tr.length - 1) * ROW };
  }
  function posAt(t, s) {
    var pts = t.pts, cum = t.cum, k = 1;
    while (k < cum.length - 1 && s > cum[k]) k++;
    var f = (s - cum[k - 1]) / (cum[k] - cum[k - 1]);
    return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f];
  }
  function pose(t, s0, s1) {
    var a = posAt(t, s0), b = posAt(t, s1);
    return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
  }
  function parkA(k) { return G.geo.P - 0.1 - k - LOCO; }
  function coupleA(x, k, m) { return G.geo.tr[x].sE - m - k - LOCO; }

  // ---------- ばん を つくる ----------
  var svg, carEls = {}, locoEl, cutEl, selEl, leverEl;
  function buildBoard() {
    var geo = G.geo;
    svg = $("board"); svg.innerHTML = "";
    svg.setAttribute("viewBox", [-0.15 * K, -0.8 * K, (geo.W + 0.15) * K, (geo.Hh + 1.6) * K].join(" "));
    var gT = el("g", {}, svg);
    selEl = el("polyline", { class: "sel", fill: "none" }, gT);
    geo.tr.forEach(function (t) {
      var d = t.pts.map(function (p) { return p[0] * K + "," + p[1] * K; }).join(" ");
      el("polyline", { points: d, class: "ties" }, gT);
    });
    geo.tr.forEach(function (t) {
      var d = t.pts.map(function (p) { return p[0] * K + "," + p[1] * K; }).join(" ");
      el("polyline", { points: d, class: "rail" }, gT);
      el("polyline", { points: d, class: "rail-in" }, gT);
    });
    geo.tr.forEach(function (t) {
      // ていいん の わく
      for (var c = 0; c < t.cap; c++) el("rect", { class: "slot", x: (t.E - c - 0.96) * K, y: (t.y - 0.36) * K, width: 0.92 * K, height: 0.72 * K, rx: 10 }, gT);
      // くるまどめ
      el("rect", { class: "buffer", x: (t.E + 0.12) * K, y: (t.y - 0.36) * K, width: 0.16 * K, height: 0.72 * K, rx: 4 }, gT);
      // ばんごう
      var lb = el("g", { class: "lbl" + (t.i === 0 ? " dep" : ""), transform: "translate(" + (t.E + 0.75) * K + "," + t.y * K + ")" }, gT);
      el("circle", { r: 0.36 * K }, lb);
      var tx = el("text", { y: 0.02 * K }, lb); tx.textContent = t.i === 0 ? "🚩" : t.i;
      var cap = el("text", { class: "cap", y: 0.52 * K }, lb); cap.textContent = t.cap + "りょう";
      // タップ で ポイント
      var hit = el("polyline", { class: "hit", points: (t.i === 0 ? geo.P : t.jx) * K + "," + t.y * K + " " + (t.E + 1.15) * K + "," + t.y * K, "data-track": t.i }, gT);
      hit.addEventListener("click", function () { if (!dragged) pickTrack(t.i); });
    });
    // ちゅうもん の かげ
    var dep = geo.tr[0], want = G.stage.goal.dep;
    for (var i = 0; i < want.length; i++) {
      var cx = dep.E - (want.length - 1 - i) - 0.5;
      var gh = el("text", { class: "ghost", x: cx * K, y: 0.1 * K }, gT);
      gh.textContent = want[i] === "*" ? "❔" : TYPES[want[i]].e || "▫️";
    }
    // ポイント の てこ
    leverEl = el("g", { class: "lever" }, gT);
    var tag = el("text", { class: "ptag", x: geo.P * K, y: -0.55 * K }, gT); tag.textContent = "ポイント";
    // ひきあげ せん
    var hs = el("text", { class: "ptag", x: (geo.P / 2) * K, y: 0.72 * K }, gT); hs.textContent = "ひきあげせん（" + G.stage.H + "りょう まで）";

    var gC = el("g", {}, svg);
    carEls = {};
    G.type.forEach(function (t, id) { carEls[id] = makeCar(gC, t, id); });
    locoEl = makeLoco(gC);
    cutEl = el("g", { class: "cut" }, svg);
    el("line", { x1: 0, y1: -0.55 * K, x2: 0, y2: 0.55 * K }, cutEl);
    var sc = el("text", { y: -0.6 * K }, cutEl); sc.textContent = "✂";
  }
  function makeCar(parent, t, id) {
    var T = TYPES[t] || TYPES.k;
    var g = el("g", { class: "car", "data-id": id }, parent);
    var inner = el("g", {}, g);
    el("circle", { class: "wheel", cx: -0.27 * K, cy: 0.25 * K, r: 0.1 * K }, inner);
    el("circle", { class: "wheel", cx: 0.27 * K, cy: 0.25 * K, r: 0.1 * K }, inner);
    if (T.tank) {
      el("rect", { x: -0.44 * K, y: -0.27 * K, width: 0.88 * K, height: 0.5 * K, rx: 0.25 * K, fill: T.c, stroke: T.d, "stroke-width": 5 }, inner);
    } else {
      el("rect", { x: -0.44 * K, y: -0.31 * K, width: 0.88 * K, height: 0.55 * K, rx: 9, fill: T.c, stroke: T.d, "stroke-width": 5 }, inner);
    }
    el("rect", { class: "glow", x: -0.5 * K, y: -0.37 * K, width: 1.0 * K, height: 0.67 * K, rx: 14 }, inner);
    var tx = el("text", { class: "emo", y: 0.01 * K }, inner); tx.textContent = T.e;
    g.addEventListener("click", function () { if (!dragged) pickCar(id); });
    return g;
  }
  function makeLoco(parent) {
    var g = el("g", { class: "loco" }, parent);
    el("circle", { class: "wheel", cx: -0.45 * K, cy: 0.27 * K, r: 0.12 * K }, g);
    el("circle", { class: "wheel", cx: 0, cy: 0.27 * K, r: 0.12 * K }, g);
    el("circle", { class: "wheel", cx: 0.45 * K, cy: 0.27 * K, r: 0.12 * K }, g);
    el("rect", { class: "lbody", x: -0.72 * K, y: -0.2 * K, width: 1.44 * K, height: 0.42 * K, rx: 8 }, g);
    el("rect", { class: "lcab", x: -0.72 * K, y: -0.42 * K, width: 0.55 * K, height: 0.4 * K, rx: 6 }, g);
    el("rect", { class: "lwin", x: -0.62 * K, y: -0.36 * K, width: 0.34 * K, height: 0.18 * K, rx: 3 }, g);
    el("rect", { class: "lstack", x: 0.32 * K, y: -0.4 * K, width: 0.16 * K, height: 0.22 * K, rx: 3 }, g);
    el("rect", { class: "lstripe", x: -0.12 * K, y: 0.02 * K, width: 0.84 * K, height: 0.08 * K }, g);
    g.addEventListener("click", function () { if (!dragged) pickCar(-1); });
    return g;
  }
  function place(node, p) {
    node.setAttribute("transform", "translate(" + (p.x * K).toFixed(1) + "," + (p.y * K).toFixed(1) + ") rotate(" + p.ang.toFixed(1) + ")");
  }

  // いま の すがた を かく。mv = { x, a, list }（list は きかんしゃ から そと へ）、stat = うごかない かしゃ の じょうたい
  function draw(mvList, stat) {
    var geo = G.geo, S = stat || G.S;
    var x = G.phase === "park" ? G.sel : G.inX;
    var t = geo.tr[x >= 0 ? x : 0];
    var list = mvList || S.loco;
    var moving = {};
    list.forEach(function (id) { moving[id] = 1; });
    S.tr.forEach(function (arr, i) {
      var tt = geo.tr[i];
      arr.forEach(function (id, p) {
        if (moving[id]) return;
        var c = tt.sE - (p + 0.5);
        place(carEls[id], pose(tt, c - 0.45, c + 0.45));
      });
    });
    place(locoEl, pose(t, G.a, G.a + LOCO));
    list.forEach(function (id, i) {
      var c = G.a + LOCO + i + 0.5;
      place(carEls[id], pose(t, c - 0.45, c + 0.45));
    });
    // えらばれた かしゃ（つれて かえる）
    Object.keys(carEls).forEach(function (id) { carEls[id].classList.toggle("take", G.phase === "in" && list.indexOf(+id) >= 0 && list.indexOf(+id) < G.cut); });
    if (G.phase === "in") {
      var c = G.a + LOCO + G.cut;
      var pc = pose(t, c - 0.01, c + 0.01);
      place(cutEl, pc);
      cutEl.style.display = "";
    } else cutEl.style.display = "none";
    // ポイント
    var st = geo.tr[G.sel];
    selEl.setAttribute("points", st.pts.map(function (p) { return p[0] * K + "," + p[1] * K; }).join(" "));
    leverEl.innerHTML = "";
    var dir = G.sel === 0 ? [1, 0] : [LX, ROW];
    var L2 = Math.hypot(dir[0], dir[1]);
    el("line", { x1: geo.P * K, y1: 0, x2: (geo.P + dir[0] / L2 * 0.7) * K, y2: dir[1] / L2 * 0.7 * K, class: "lev" }, leverEl);
    el("circle", { cx: geo.P * K, cy: 0, r: 0.13 * K, class: "levc" }, leverEl);
  }

  // ---------- アニメ ----------
  function tween(from, to, cb) {
    var dist = Math.abs(to - from), dur = fast ? 30 : Math.max(350, dist * 260);
    return new Promise(function (res) {
      var t0 = performance.now(), lastTick = from;
      function step(now) {
        var f = Math.min(1, (now - t0) / dur);
        var e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
        G.a = from + (to - from) * e;
        if (Math.abs(G.a - lastTick) >= 1 && !fast) { SND.tick(); lastTick = G.a; }
        cb();
        if (f < 1) requestAnimationFrame(step); else res();
      }
      requestAnimationFrame(step);
    });
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, fast ? 0 : ms); }); }

  // ---------- そうさ ----------
  var busy = false;
  function pickTrack(i) {
    if (busy || !G) return;
    if (G.phase !== "park") { say("いま は " + trackName(G.inX) + " に いる よ。◀ で もどって から ポイント を かえよう"); SND.bump(); return; }
    if (G.sel === i) return;
    G.sel = i;
    SND.point();
    draw(); updateUI();
    say(trackName(i) + " へ ポイント を きりかえた。▶ で すすもう");
  }
  function goIn() {
    if (busy || !G || G.phase !== "park") return;
    var x = G.sel, k = G.S.loco.length, m = G.S.tr[x].length;
    if (k + m === 0) { SND.bump(); say(trackName(x) + " は からっぽ。かしゃ を つないで いこう"); return; }
    busy = true; var hm = G.hintMove; G.hintMove = null;
    var to = coupleA(x, k, m);
    G.inX = x; G.phase = "anim";
    G.a = parkA(k);
    var list = G.S.loco;
    tween(G.a, to, function () { G.phase = "anim"; drawAt(list); }).then(function () {
      SND.clank();
      G.phase = "in";
      var r = Y.range(G.stage, G.S, x);
      // はじめ の えらびかた: つないで いった かしゃ は おいて くる／からっぽ で いった ら ひけるだけ
      G.cut = k > 0 ? r.lo : r.hi;
      if (hm && hm[0] === x) G.cut = hm[1];
      busy = false;
      draw(Y.combined(G.S, x));
      updateUI();
      say("れんけつ！ ✂ で きる ところ を えらんで（かしゃ を タップ でも）、◀ で もどろう");
    });
  }
  function drawAt(list) { var p = G.phase; G.phase = "anim"; draw(list); G.phase = p; }

  function setCut(j) {
    if (G.phase !== "in" || busy) return;
    var r = Y.range(G.stage, G.S, G.inX);
    if (j > r.hi) { SND.bump(); say(j > G.stage.H ? "ひきあげせん は " + G.stage.H + "りょう まで。それ いじょう は ひけない よ" : "これ いじょう は ない よ"); j = r.hi; }
    if (j < r.lo) { SND.bump(); say(trackName(G.inX) + " に は " + G.stage.tracks[G.inX].cap + "りょう までしか おけない よ"); j = r.lo; }
    if (j === G.cut) { updateUI(); return; }
    G.cut = j; SND.tap();
    draw(Y.combined(G.S, G.inX)); updateUI();
    msgCut();
  }
  function msgCut() {
    var L = Y.combined(G.S, G.inX).length, j = G.cut;
    say(j === 0 ? "ぜんぶ おいて、きかんしゃ だけ で もどる" : j === L ? "ぜんぶ つれて もどる（" + j + "りょう）" : j + "りょう つれて もどる。のこり " + (L - j) + "りょう は おいて いく");
  }
  function pickCar(id) {
    if (busy || !G) return;
    if (G.phase !== "in") return;
    var c = Y.combined(G.S, G.inX);
    var i = c.indexOf(id);
    if (id === -1) setCut(0);
    else if (i >= 0) setCut(i + 1 === G.cut ? i : i + 1);
  }
  function pullBack() {
    if (busy || !G || G.phase !== "in") return;
    busy = true;
    var x = G.inX, j = G.cut, c = Y.combined(G.S, x);
    var next = Y.apply(G.S, x, j);
    var changed = !Y.same(next, G.S);
    var stat = { loco: [], tr: G.S.tr.slice() };
    stat.tr[x] = c.slice(j).reverse();
    if (j < c.length) SND.hiss();
    G.phase = "anim";
    var list = c.slice(0, j);
    wait(j < c.length ? 250 : 0).then(function () {
      return tween(G.a, parkA(j), function () { draw(list, stat); });
    }).then(function () {
      if (changed) { G.undo.push(G.S); G.moves++; }
      G.S = next; G.phase = "park"; G.inX = -1;
      busy = false;
      draw(); updateUI();
      if (Y.goalOk(G.stage, typesOf(G.S))) clear();
      else if (!changed) say("なにも かわらなかった（てかず は ふえない よ）");
      else say("ポイント を えらんで ▶ で すすもう");
    });
  }
  function undo() {
    if (busy || !G) return;
    if (G.phase === "in") { G.cut = G.S.loco.length; pullBack(); return; }
    if (!G.undo.length) { SND.bump(); say("まだ うごかして いない よ"); return; }
    G.S = G.undo.pop(); G.moves--;
    G.a = parkA(G.S.loco.length);
    SND.point(); draw(); updateUI();
    say("1て もどした");
  }
  function reset() {
    if (busy || !G) return;
    if (G.phase === "in") return;
    G.S = Y.clone(G.start); G.undo = []; G.moves = 0; G.sel = 0;
    G.a = parkA(G.S.loco.length);
    SND.point(); draw(); updateUI();
    say("さいしょ から やりなおし");
  }
  function hint() {
    if (busy || !G) return;
    say("かんがえ ちゅう…");
    busy = true;
    setTimeout(function () {
      busy = false;
      var T = typesOf(G.S);
      var path = Y.solve(G.stage, T);
      G.hints++;
      if (!path || !path.length) { say("もう すこし で できる よ"); return; }
      var mv = path[0], rest = path.length;
      if (G.phase === "in") {
        if (mv[0] === G.inX) { setCut(mv[1]); say("💡 " + mv[1] + "りょう つれて もどろう（あと " + rest + "て）"); }
        else { G.cut = G.S.loco.length; draw(Y.combined(G.S, G.inX)); updateUI(); say("💡 いちど その まま ◀ で もどって、" + trackName(mv[0]) + " へ いこう"); }
        return;
      }
      G.hintMove = mv;
      if (G.sel !== mv[0]) { G.sel = mv[0]; SND.point(); draw(); updateUI(); }
      var L = G.S.loco.length + G.S.tr[mv[0]].length;
      say("💡 " + trackName(mv[0]) + " へ いって、" + (mv[1] === 0 ? "ぜんぶ おいて こよう" : mv[1] === L ? "ぜんぶ つれて もどろう" : mv[1] + "りょう つれて もどろう") + "（あと " + rest + "て）");
    }, 30);
  }

  function clear() {
    var st = G.stage, n = starsFor(G.moves, st.par);
    busy = true;
    say("できあがり！ しゅっぱつ しんこう、ぽっぽー！");
    SND.whistle();
    setTimeout(function () { SND.fanfare(); }, fast ? 0 : 900);
    if (st.id === "daily") {
      var d = today();
      if (!save.daily[d] || G.moves < save.daily[d]) save.daily[d] = G.moves;
    } else {
      save.stars[st.id] = Math.max(save.stars[st.id] || 0, n);
      if (!save.best[st.id] || G.moves < save.best[st.id]) save.best[st.id] = G.moves;
    }
    store();
    $("starCount").textContent = totalStars();
    setTimeout(function () {
      busy = false;
      $("resStars").textContent = "★".repeat(n) + "☆".repeat(3 - n);
      $("resTitle").textContent = n === 3 ? "めいじん！" : n === 2 ? "できた！" : "しゅっぱつ しんこう！";
      $("resText").textContent = G.moves + "て で できた（めやす " + st.par + "て）" + (n < 3 ? "。" + st.par + "て で できる かな？" : "");
      var hasNext = typeof st.id === "number" && st.id < STAGES.length;
      $("nextBtn").hidden = !hasNext;
      $("result").hidden = false;
      $(hasNext ? "nextBtn" : "againBtn").focus();
    }, fast ? 0 : 1300);
  }

  // ---------- がめん ----------
  function renderOrder() {
    var box = $("orderCars"); box.innerHTML = "";
    G.stage.goal.dep.forEach(function (t) {
      var s = document.createElement("span");
      if (t === "*") { s.className = "chip wild"; s.textContent = "❔"; s.title = "どれ でも"; }
      else { s.className = "chip"; s.style.background = TYPES[t].c; s.style.borderColor = TYPES[t].d; s.textContent = TYPES[t].e; s.title = TYPES[t].n; }
      box.appendChild(s);
    });
    var cond = [];
    if (G.stage.goal.dep.indexOf("*") >= 0) cond.push("❔ は どの かしゃ で も いい");
    (G.stage.goal.keep || []).forEach(function (k) { cond.push((TYPES[k.t].e) + " " + TYPES[k.t].n + " は " + trackName(k.tr) + " に のこす"); });
    $("cond").textContent = cond.join("　");
    $("cond").hidden = !cond.length;
    $("par").textContent = G.stage.par;
  }
  function updateUI() {
    var park = G.phase === "park", inn = G.phase === "in";
    $("moves").textContent = G.moves;
    document.querySelectorAll(".pt-btn").forEach(function (b) { b.remove(); });
    var row = $("points");
    G.stage.tracks.forEach(function (t, i) {
      var b = document.createElement("button");
      b.className = "pt-btn" + (G.sel === i ? " on" : "");
      b.dataset.track = i;
      b.innerHTML = i === 0 ? "🚩<small>しゅっぱつ</small>" : i + "<small>ばん</small>";
      b.setAttribute("aria-pressed", G.sel === i);
      b.disabled = !park;
      b.addEventListener("click", function () { pickTrack(i); });
      row.appendChild(b);
    });
    $("goBtn").disabled = !park;
    $("backBtn2").disabled = !inn;
    $("cutMinus").disabled = !inn;
    $("cutPlus").disabled = !inn;
    $("cutN").textContent = inn ? G.cut : "–";
    $("undoBtn").disabled = !(park || inn);
    $("resetBtn").disabled = !park;
    $("hintBtn").disabled = !(park || inn);
    $("play").classList.toggle("is-in", inn);
  }
  function say(t) { $("msg").textContent = t; }
  function show(v) {
    $("home").hidden = v !== "home";
    $("play").hidden = v !== "play";
    $("back").hidden = v === "home";
    if (v === "home") { $("titleText").textContent = "かもつ いれかえ パズル"; renderHome(); }
  }

  // ドラッグ（ボード の うえ で よこ に スワイプ）
  var dragged = false, down = null;
  function boardDown(e) { down = { x: e.clientX, y: e.clientY }; dragged = false; }
  function boardMove(e) {
    if (!down) return;
    if (Math.abs(e.clientX - down.x) > 12) dragged = true;
  }
  function boardUp(e) {
    if (!down) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    down = null;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      SND.unlock();
      if (dx > 0) goIn(); else pullBack();
      dragged = true;
      setTimeout(function () { dragged = false; }, 50);
    } else dragged = false;
  }

  function init() {
    $("back").addEventListener("click", function () { if (!busy) { G = null; show("home"); } });
    $("soundBtn").addEventListener("click", function () {
      save.sound = !save.sound; SND.setOn(save.sound); store(); setSound(); if (save.sound) SND.tap();
    });
    setSound();
    $("dailyBtn").addEventListener("click", function () {
      SND.unlock();
      var st = Y.makeDaily(today());
      st.tip = "きょう の もんだい。めやす は " + st.par + "て";
      startStage(st);
    });
    $("goBtn").addEventListener("click", goIn);
    $("backBtn2").addEventListener("click", pullBack);
    $("cutMinus").addEventListener("click", function () { setCut(G.cut - 1); });
    $("cutPlus").addEventListener("click", function () { setCut(G.cut + 1); });
    $("undoBtn").addEventListener("click", undo);
    $("resetBtn").addEventListener("click", reset);
    $("hintBtn").addEventListener("click", hint);
    $("nextBtn").addEventListener("click", function () { $("result").hidden = true; startStage(toStage(STAGES[G.stage.id])); });
    $("againBtn").addEventListener("click", function () { $("result").hidden = true; startStage(G.stage); });
    $("menuBtn").addEventListener("click", function () { $("result").hidden = true; G = null; show("home"); });
    window.addEventListener("resize", function () {
      if (!G || busy || G.phase === "anim" || $("play").hidden) return;
      var r = rowFor(G.stage);
      if (Math.abs(r - ROW) < 0.05) return;
      G.geo = buildGeo(G.stage); buildBoard();
      if (G.phase === "park") G.a = parkA(G.S.loco.length);
      else G.a = coupleA(G.inX, G.S.loco.length, G.S.tr[G.inX].length);
      draw(G.phase === "in" ? Y.combined(G.S, G.inX) : null);
    });
    var b = $("board");
    b.addEventListener("pointerdown", boardDown);
    b.addEventListener("pointermove", boardMove);
    b.addEventListener("pointerup", boardUp);
    b.addEventListener("pointercancel", function () { down = null; });
    document.addEventListener("keydown", function (e) {
      if (!G || $("play").hidden || !$("result").hidden) return;
      if (e.key === "ArrowRight") goIn();
      else if (e.key === "ArrowLeft") pullBack();
      else if (e.key === "ArrowUp" && G.phase === "in") setCut(G.cut + 1);
      else if (e.key === "ArrowDown" && G.phase === "in") setCut(G.cut - 1);
      else if (/^[0-3]$/.test(e.key) && +e.key < G.stage.tracks.length) pickTrack(+e.key);
    });
    show("home");
  }
  function setSound() {
    $("soundBtn").textContent = save.sound ? "🔊" : "🔇";
    $("soundBtn").setAttribute("aria-pressed", save.sound);
  }

  // check.js よう
  window.IPTest = {
    fast: function (v) { fast = !!v; },
    state: function () { return G && typesOf(G.S); },
    phase: function () { return G && G.phase; },
    busy: function () { return busy; },
    moves: function () { return G && G.moves; },
    sel: function () { return G && G.sel; },
    cut: function () { return G && G.cut; },
    solve: function () { return G && Y.solve(G.stage, typesOf(G.S)); },
    save: function () { return JSON.parse(JSON.stringify(save)); }
  };

  init();
})();
