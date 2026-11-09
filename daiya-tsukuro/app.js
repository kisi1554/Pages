/* ダイヤ を つくろう: がめん と そうさ */
(function () {
  "use strict";
  var D = window.Diagram, DATA = window.DT_DATA, R = window.DTRender, A = window.DTAudio;
  var KEY = "daiya-tsukuro-v1";
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- ほぞん ---------- */
  var save = { stars: {}, work: {}, sound: true, seen: false };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { var o = JSON.parse(raw); if (o && typeof o === "object") Object.keys(save).forEach(function (k) { if (o[k] != null) save[k] = o[k]; }); }
  } catch (e) { /* よめない ときは はじめ から */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* */ } }
  A.setOn(save.sound);

  var STAGES = DATA.STAGES;
  var byId = function (id) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return STAGES[i]; return null; };
  var firstOfCh = function (ch) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i].ch === ch) return STAGES[i].id; return 0; };
  function unlocked(st) {
    if (st.id === 1 || st.id === firstOfCh(2)) return true;
    return (save.stars[st.id] || 0) > 0 || (save.stars[st.id - 1] || 0) > 0;
  }
  function totalStars() { return Object.keys(save.stars).reduce(function (s, k) { return s + (save.stars[k] || 0); }, 0); }

  /* ---------- ホーム ---------- */
  function renderHome() {
    var box = $("stageList"); box.innerHTML = "";
    DATA.CHAPTERS.forEach(function (ch) {
      var g = document.createElement("section"); g.className = "group";
      g.innerHTML = "<h2><span aria-hidden='true'>" + ch.icon + "</span>" + ch.n + ". " + ch.name + "</h2><p>" + ch.desc + "</p>";
      var grid = document.createElement("div"); grid.className = "grid";
      STAGES.filter(function (s) { return s.ch === ch.n; }).forEach(function (st) {
        var b = document.createElement("button"), open = unlocked(st), n = save.stars[st.id] || 0;
        b.className = "st-btn" + (open ? "" : " lock");
        b.dataset.id = st.id;
        b.disabled = !open;
        b.innerHTML = "<b>" + (open ? st.id : "🔒") + "</b><small>" + st.title + "</small><span>" + "★★★".slice(0, n) + "<i style='color:#dee2e6;font-style:normal'>" + "★★★".slice(0, 3 - n) + "</i></span>";
        b.addEventListener("click", function () { A.unlock(); A.tap(); openStage(st.id); });
        grid.appendChild(b);
      });
      g.appendChild(grid); box.appendChild(g);
    });
    $("starCount").textContent = totalStars();
  }
  function showHome() {
    stopRun();
    G.P = null;
    $("play").hidden = true; $("home").hidden = false; $("back").hidden = true;
    document.body.classList.remove("playing");
    $("titleText").textContent = "ダイヤ を つくろう";
    renderHome();
  }

  /* ---------- プレイ ---------- */
  var G = { P: null, user: [], sel: -1, type: "L", undo: [], draft: null, ghost: [], J: null, run: null, quiz: null, marks: [], fast: 1, press: null };
  var V = null;
  var dia = $("dia"), trk = $("trk");

  function specs() { return G.user.map(function (t) { return D.fmtSpec(D.toSpec(G.P.line, t)); }); }
  function isQuiz() { return G.P && G.P.quiz.length > 0; }

  function openStage(id) {
    var st = byId(id); if (!st) return;
    stopRun();
    G.P = D.prepStage(DATA.LINES, st);
    G.user = [];
    try { (save.work[id] || []).forEach(function (s) { G.user.push(D.trainOf(G.P.line, s)); }); } catch (e) { G.user = []; }
    G.sel = -1; G.undo = []; G.draft = null; G.marks = []; G.press = null;
    G.ghost = st.guide && !G.user.length ? G.P.ans.slice() : [];
    var types = st.types || "L";
    G.type = types[0];
    document.querySelectorAll(".type").forEach(function (b) {
      b.hidden = types.indexOf(b.dataset.type) < 0;
      b.classList.toggle("on", b.dataset.type === G.type);
      b.setAttribute("aria-pressed", b.dataset.type === G.type ? "true" : "false");
    });
    $("home").hidden = true; $("play").hidden = false; $("back").hidden = false;
    document.body.classList.add("playing");
    $("titleText").textContent = st.id + ". " + st.title;
    var q = isQuiz();
    $("quiz").hidden = !q; $("reqList").hidden = q;
    ["types", "undoBtn", "delBtn", "hintBtn"].forEach(function (k) { $(k).hidden = q; });
    if (q) { G.quiz = { i: 0, miss: 0, done: false }; showQuestion(); }
    else G.quiz = null;
    after(true);
    if (!q && !save.seen) { save.seen = true; store(); openHelp(); }
  }

  /* おだい の ひょうじ */
  function stName(i) { return G.P.line.stations[i].n + "えき"; }
  function chip(type) { return "<span class='chip " + type + "'>" + D.TYPES[type].name + "</span>"; }
  function renderReqs() {
    var P = G.P, J = G.J, html = "";
    P.req.forEach(function (r, i) {
      var got = J ? Math.min(J.match.got[i], r.n) : 0, done = got >= r.n;
      var when = r.win ? (r.win[0] === r.win[1] ? D.hm(r.win[0]) : D.hm(r.win[0]) + "〜" + D.hm(r.win[1])) + "<span class='opt'> に でる</span>" : "";
      if (r.by != null) when += "・" + D.hm(r.by) + " までに つく";
      html += "<div class='req" + (done ? " done" : "") + "'>" + chip(r.type === "*" ? "L" : r.type) +
        "<b>" + P.line.stations[r.from].n + "→" + P.line.stations[r.to].n + "</b><span class='when'>" + when + "</span>" +
        "<span class='cnt'>" + (done ? "✔ " : "") + got + "/" + r.n + "</span></div>";
    });
    if (P.fleet != null) {
      var fl = J ? J.fleet : 0, ok = !J || J.fleetOK;
      html += "<div class='req sub" + (ok ? " done" : "") + "'><span class='chip F'>🚃</span>でんしゃ は " + P.fleet + "へんせい まで<span class='opt'>（おりかえし は " + P.line.turn + "ふん あける）</span><span class='cnt'>" + (ok ? "" : "✖ ") + "いま " + fl + "</span></div>";
    }
    if (P.bonus) {
      var b = P.bonus, txt = b.k === "xfer" ? stName(b.at) + " で ふつう → きゅうこう に のりかえ（まち " + b.max + "ふん いない・" + (b.dir > 0 ? "くだり" : "のぼり") + "）" : "でんしゃ を " + b.max + "へんせい で まわす";
      var bOK = J && J.bonus && J.clear;
      html += "<div class='req sub" + (bOK ? " done" : "") + "'><span class='chip B'>★3</span>" + txt + "<span class='cnt'>" + (bOK ? "✔" : "") + "</span></div>";
    }
    html += "<div class='req sub'>まち じかん <b>" + (J ? J.wait : 0) + "ふん</b>（めやす " + P.par + "ふん）</div>";
    $("reqList").innerHTML = html;
  }

  function setMsg(t, cls) { var m = $("msg"); m.innerHTML = t; m.className = "msg" + (cls ? " " + cls : ""); }
  function updateMsg() {
    if (isQuiz()) return;
    var J = G.J, P = G.P;
    if (J.conflicts.length) {
      var c = J.conflicts[0];
      var why = c.kind === "meet" ? "たんせん で むかいあわせ！ えき で まって すれちがおう" :
        c.kind === "pass" ? "おなじ せんろ で ぶつかる！ おいこし は ホーム が 2つ ある えき で" :
        "ホーム が たりない！ " + stName(c.st) + " に でんしゃ が はいりきらない";
      setMsg("💥 ぶつかる！ " + why, "bad");
    } else if (J.match.extra.length) {
      setMsg("おだい に ない でんしゃ が あるよ（せん を タップ して 🗑）", "bad");
    } else if (!J.need) {
      var left = 0; P.req.forEach(function (r, i) { left += Math.max(0, r.n - J.match.got[i]); });
      if (G.ghost.length && P.stage.guide && !G.user.length) setMsg("てんてん の せん を ゆび で なぞって みよう！");
      else setMsg("あと <b>" + left + "ぽん</b>。いろ の ついた「でる じかん」から せん を ひこう");
    } else if (!J.fleetOK) {
      setMsg("でんしゃ が たりない！ いま " + J.fleet + "へんせい（" + P.fleet + " まで）。おりかえし を つかおう", "bad");
    } else if (J.clear) {
      setMsg("✨ できた！ <b>▶ はしらせて</b> たしかめよう", "good");
    }
  }
  function after(noSave) {
    if (!noSave && G.P) { save.work[G.P.stage.id] = specs(); store(); }
    if (!isQuiz()) { G.J = D.judgeStage(G.P, G.user); renderReqs(); updateMsg(); }
    else G.J = null;
    $("delBtn").disabled = G.sel < 0;
    $("undoBtn").disabled = !G.undo.length;
    draw();
  }
  function pushUndo() { G.undo.push(specs()); if (G.undo.length > 60) G.undo.shift(); }

  /* ---------- えがく ---------- */
  function draw() {
    if (!G.P) return;
    var P = G.P, run = G.run;
    var reqs = P.req.map(function (r, i) { return Object.assign({ done: G.J && G.J.match.got[i] >= r.n }, r); });
    V = R.drawDia(dia, {
      line: P.line, t0: P.t0, t1: P.t1, fixed: P.fixed, user: G.user, sel: G.sel, draft: G.draft, ghost: G.ghost,
      conflicts: G.J ? G.J.conflicts : [], req: reqs, now: run ? run.t : null, labels: isQuiz(), quiz: isQuiz(), marks: G.marks
    });
    R.drawTrack(trk, {
      line: P.line, now: run ? run.t : null, trains: P.fixed.concat(G.user), assign: run ? run.assign : null,
      hit: run && run.hit, labels: isQuiz(), nFixed: P.fixed.length
    });
  }
  var drawQ = false;
  function redraw() { if (drawQ) return; drawQ = true; requestAnimationFrame(function () { drawQ = false; draw(); }); }
  window.addEventListener("resize", redraw);
  if (window.ResizeObserver) new ResizeObserver(redraw).observe($("diaWrap"));

  /* ---------- ゆび で なぞる ---------- */
  function pt(e) { var r = dia.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  var bubble = $("bubble");
  function showBubble(p, text) {
    bubble.hidden = false; bubble.textContent = text;
    var w = dia.clientWidth;
    bubble.style.left = Math.max(60, Math.min(w - 60, p.x)) + "px";
    bubble.style.top = Math.max(44, p.y - 14) + "px";
  }
  function clampT(t) { return Math.max(G.P.t0, Math.min(G.P.t1, t)); }

  dia.addEventListener("pointerdown", function (e) {
    if (!G.P || !V || G.run) return;
    e.preventDefault();
    A.unlock();
    try { dia.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    var p = pt(e);
    var s = isQuiz() ? -1 : V.stationAt(p.y, 22);
    if (p.x < V.box.x - 8) s = -1;
    G.press = { id: e.pointerId, x: p.x, y: p.y, s: s, t0: Math.round(clampT(V.t(p.x))), pts: [], moved: false, deps: 0, stops: 1 };
    if (s >= 0) showBubble(p, G.P.line.stations[s].n + "えき " + D.hm(G.press.t0) + " に でる");
  });
  dia.addEventListener("pointermove", function (e) {
    var pr = G.press; if (!pr || pr.id !== e.pointerId) return;
    e.preventDefault();
    var p = pt(e);
    if (!pr.moved && Math.hypot(p.x - pr.x, p.y - pr.y) > 8) pr.moved = true;
    if (!pr.moved || pr.s < 0) return;
    var t = clampT(V.t(p.x)), km = V.km(p.y);
    pr.pts = pr.pts.filter(function (q) { return q.t <= t; });
    pr.pts.push({ t: t, km: km });
    var tr = D.trace(G.P.line, G.type, pr.s, pr.t0, pr.pts, 14 / V.pxPerKm);
    pr.raw = tr;
    G.draft = { type: G.type, stops: tr.stops, tip: tr.tip };
    var deps = tr.stops.filter(function (x) { return x[2] != null; }).length;
    if (deps > pr.deps) A.swish();
    if (tr.stops.length > pr.stops) A.pon();
    pr.deps = deps; pr.stops = tr.stops.length;
    var st = G.P.line.stations, last = tr.stops[tr.stops.length - 1];
    if (!tr.dir) showBubble(p, st[pr.s].n + "えき " + D.hm(pr.t0) + " に でる");
    else if (tr.state === "wait") showBubble(p, st[last[0]].n + "えき " + (tr.stops.length === 1 ? D.hm(Math.round(tr.tip.t)) + " に でる" : "で まつ 〜" + D.hm(Math.round(tr.tip.t))));
    else if (tr.state === "run") showBubble(p, "→ " + st[tr.tip.next].n + "えき " + D.hm(tr.tip.arr) + " に つく");
    else showBubble(p, st[last[0]].n + "えき " + D.hm(last[1]) + " に つく");
    redraw();
  });
  function endPress(e, cancel) {
    var pr = G.press; if (!pr || pr.id !== e.pointerId) return;
    G.press = null; bubble.hidden = true;
    var p = pt(e);
    if (cancel) { G.draft = null; redraw(); return; }
    if (!pr.moved) { tapSelect(p); return; }
    G.draft = null;
    if (pr.s < 0 || !pr.raw) { redraw(); return; }
    var tr = D.finish(G.P.line, G.type, pr.raw);
    if (!tr) { setMsg("えき から つぎ の えき まで ななめ に なぞって ね"); redraw(); return; }
    tr = D.build(G.P.line, D.toSpec(G.P.line, tr));
    addTrain(tr);
  }
  dia.addEventListener("pointerup", function (e) { endPress(e, false); });
  dia.addEventListener("pointercancel", function (e) { endPress(e, true); });

  function addTrain(tr) {
    pushUndo();
    G.user.push(tr); G.sel = G.user.length - 1;
    if (G.P.stage.guide && G.ghost.length) G.ghost = G.ghost.filter(function (g) { return !D.same(g, tr); });
    else G.ghost = G.ghost.filter(function (g) { return !D.same(g, tr); });
    var before = G.J ? G.J.conflicts.length : 0;
    after();
    var me = G.P.fixed.length + G.user.length - 1;
    if (G.J.conflicts.some(function (c) { return c.a === me || c.b === me; }) && G.J.conflicts.length >= before) A.buzz();
    else if (G.J.clear) A.ok();
    else A.pon();
  }
  function distSeg(p, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy, t = L ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
  }
  function polyOf(tr) {
    var line = G.P.line, out = [];
    tr.stops.forEach(function (s, k) {
      var y = V.y(line.stations[s[0]].km);
      if (k > 0) out.push({ x: V.x(s[1]), y: y });
      out.push({ x: V.x(s[2]), y: y });
    });
    return out;
  }
  function tapSelect(p) {
    var best = -1, bd = 18;
    G.user.forEach(function (tr, i) {
      var pl = polyOf(tr);
      for (var k = 0; k + 1 < pl.length; k++) { var d = distSeg(p, pl[k], pl[k + 1]); if (d < bd) { bd = d; best = i; } }
    });
    G.sel = best;
    if (best >= 0) {
      A.tap();
      var tr = G.user[best], st = G.P.line.stations, s = tr.stops;
      setMsg(D.TYPES[tr.type].name + " " + st[s[0][0]].n + " " + D.hm(s[0][2]) + " → " + st[s[s.length - 1][0]].n + " " + D.hm(s[s.length - 1][1]) +
        "（まち " + D.waitOf(G.P.line, tr) + "ふん）。🗑 で けせる");
      $("delBtn").disabled = false;
      draw();
    } else after(true);
  }

  /* ---------- ボタン ---------- */
  document.querySelectorAll(".type").forEach(function (b) {
    b.addEventListener("click", function () {
      A.unlock(); A.tap();
      G.type = b.dataset.type;
      document.querySelectorAll(".type").forEach(function (x) { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    });
  });
  $("delBtn").addEventListener("click", function () {
    if (G.sel < 0 || G.run) return;
    pushUndo(); G.user.splice(G.sel, 1); G.sel = -1; A.tap(); after();
  });
  $("undoBtn").addEventListener("click", function () {
    if (!G.undo.length || G.run) return;
    var prev = G.undo.pop();
    G.user = prev.map(function (s) { return D.trainOf(G.P.line, s); });
    G.sel = -1; A.tap(); after();
  });
  $("hintBtn").addEventListener("click", function () {
    if (!G.P || G.run) return;
    A.tap();
    var P = G.P, J = G.J;
    var miss = P.ans.filter(function (a) { return !G.user.some(function (u) { return D.same(u, a); }); });
    var pick = null;
    for (var i = 0; i < P.req.length && !pick; i++) {
      if (J.match.got[i] >= P.req[i].n) continue;
      pick = miss.filter(function (a) { return D.reqOK(a, P.req[i]); })[0] || null;
    }
    if (pick) { G.ghost = [pick]; setMsg("💡 てんてん の せん の ように ひいて みよう"); }
    else if (J.conflicts.length || !J.clear) { G.ghost = miss.slice(); setMsg("💡 こたえ の れい を てんてん で だしたよ。あか の でんしゃ を けして ひきなおそう"); }
    else { G.ghost = []; setMsg("もう できて いるよ！ ▶ で はしらせて みよう", "good"); }
    draw();
  });
  $("runBtn").addEventListener("click", function () { A.unlock(); if (G.run) stopRun(); else startRun(); });
  $("back").addEventListener("click", function () { A.tap(); showHome(); });
  $("soundBtn").addEventListener("click", function () {
    save.sound = !save.sound; A.setOn(save.sound); store(); syncSound(); if (save.sound) { A.unlock(); A.tap(); }
  });
  function syncSound() { $("soundBtn").textContent = save.sound ? "🔊" : "🔇"; $("soundBtn").setAttribute("aria-pressed", save.sound ? "true" : "false"); }
  function openHelp() { $("help").hidden = false; }
  $("helpBtn").addEventListener("click", function () { A.unlock(); A.tap(); openHelp(); });
  $("howBtn").addEventListener("click", function () { A.unlock(); A.tap(); openHelp(); });
  $("helpClose").addEventListener("click", function () { A.tap(); $("help").hidden = true; });
  $("help").addEventListener("click", function (e) { if (e.target === $("help")) $("help").hidden = true; });

  /* ---------- はしらせる ---------- */
  function startRun() {
    if (!G.P) return;
    var P = G.P, all = P.fixed.concat(G.user);
    if (!all.length) { setMsg("まず でんしゃ の せん を ひこう"); return; }
    var cs = D.conflicts(P.line, all);
    var span = P.t1 - P.t0;
    G.sel = -1;
    G.run = { t: P.t0, last: performance.now(), hit: null, cf: cs[0] || null, assign: D.assignTracks(P.line, all),
      speed: span / Math.max(5, Math.min(10, span * 0.15)), tick: 0, alt: false, endAt: null };
    $("runBtn").classList.add("stop"); $("runBtn").innerHTML = "⏹ <span>とめる</span>";
    if (!isQuiz()) setMsg("がたん ごとん…");
    requestAnimationFrame(step);
  }
  function step(now) {
    var r = G.run; if (!r) return;
    var dt = Math.min(0.1, (now - r.last) / 1000); r.last = now;
    if (r.endAt != null) {
      if (now >= r.endAt) { finishRun(); return; }
      draw(); requestAnimationFrame(step); return;
    }
    r.t += dt * r.speed * G.fast;
    r.tick += dt;
    var P = G.P;
    if (r.tick > 0.42) {
      r.tick = 0;
      var all = P.fixed.concat(G.user);
      if (all.some(function (tr) { var p = D.posAt(P.line, tr, r.t); return p && p.stop == null; })) { A.gatan(r.alt); r.alt = !r.alt; }
    }
    if (r.cf && r.t >= r.cf.t) {
      r.t = r.cf.t; r.hit = r.cf; A.buzz();
      setMsg("💥 ぶつかった！ ダイヤ を なおそう", "bad");
      r.endAt = now + 1600 / G.fast;
    } else if (r.t >= P.t1) {
      r.t = P.t1; r.endAt = now + 300 / G.fast;
    }
    draw();
    requestAnimationFrame(step);
  }
  function stopRun() {
    if (!G.run) return;
    G.run = null;
    $("runBtn").classList.remove("stop"); $("runBtn").innerHTML = "▶ <span>はしらせる</span>";
    if (G.P) after(true);
  }
  function finishRun() {
    var r = G.run; stopRun();
    if (!r || r.hit || isQuiz()) return;
    var J = G.J;
    if (J && J.clear) showResult(J.stars, J);
    else if (J) setMsg("ぶつからずに はしれた！ でも おだい が まだ だよ");
  }

  /* ---------- よみかた もんだい ---------- */
  function badgeHtml(i) {
    var tr = G.P.fixed[i];
    return "<span class='badge' style='background:" + D.TYPES[tr.type].color + "'>" + (i + 1) + "</span>";
  }
  function qInfo(q) {
    var P = G.P, ans = D.quizAnswer(P.line, P.fixed, q), text = "", choices = [];
    var b = q.tr != null ? badgeHtml(q.tr) : "";
    var midSt = P.line.stations.slice(1, -1).map(function (s) { return s.i; });
    var times = function (a) { return [a - 2, a, a + 3, a + 5].sort(function (x, y) { return x - y; }).map(function (t) { return { v: t, html: D.hm(t) }; }); };
    var stc = function (list) { return list.map(function (i) { return { v: i, html: stName(i) }; }); };
    if (q.q === "arr") { text = b + " は " + stName(q.st) + " に なんじ なんぷん に つく？"; choices = times(ans); }
    else if (q.q === "dep") { text = b + " は " + stName(q.st) + " を なんじ なんぷん に でる？"; choices = times(ans); }
    else if (q.q === "count") {
      text = D.hm(q.win[0]) + "〜" + D.hm(q.win[1]) + " に " + stName(q.st) + " を でる " + (q.dir > 0 ? "くだり（した へ いく）" : "のぼり（うえ へ いく）") + " の でんしゃ は なんぼん？";
      choices = [1, 2, 3, 4].map(function (n) { return { v: n, html: n + "ほん" }; });
    } else if (q.q === "fast") {
      var a0 = P.fixed[q.among[0]];
      text = stName(a0.from) + " から " + stName(a0.to) + " まで いちばん はやく つく でんしゃ は？（かたむき が きゅう）";
      choices = q.among.map(function (i) { return { v: i, html: badgeHtml(i) + D.TYPES[P.fixed[i].type].name }; });
    } else if (q.q === "long") {
      text = b + " が いちばん ながく とまって いる えき は？（よこ に まっすぐ）";
      choices = stc(P.fixed[q.tr].stops.slice(1, -1).map(function (s) { return s[0]; }));
    } else if (q.q === "meet") {
      text = badgeHtml(q.a) + " と " + badgeHtml(q.b) + " が すれちがう えき は？";
      choices = stc(midSt);
    } else if (q.q === "pass") {
      text = badgeHtml(q.a) + " ふつう が " + badgeHtml(q.b) + " きゅうこう に おいこされる えき は？";
      choices = stc(midSt);
    }
    return { text: text, choices: choices, ans: ans };
  }
  function markFor(q, ans) {
    var P = G.P, st = P.line.stations;
    if (q.q === "arr" || q.q === "dep") return [{ t: ans, km: st[q.st].km }];
    if (q.q === "long") { var s = D.stopAt(P.fixed[q.tr], ans); return [{ t: (s[1] + s[2]) / 2, km: st[ans].km }]; }
    if (q.q === "meet" || q.q === "pass") { var s2 = D.stopAt(P.fixed[q.b], ans); return [{ t: s2[1], km: st[ans].km }]; }
    return [];
  }
  function showQuestion() {
    var Q = G.quiz, q = G.P.quiz[Q.i], info = qInfo(q);
    $("qText").innerHTML = "もんだい " + (Q.i + 1) + "/" + G.P.quiz.length + "　" + info.text;
    var box = $("choices"); box.innerHTML = "";
    info.choices.forEach(function (ch) {
      var b = document.createElement("button");
      b.className = "choice"; b.innerHTML = ch.html; b.dataset.v = ch.v;
      b.addEventListener("click", function () {
        if (Q.done || b.disabled) return;
        A.unlock();
        if (ch.v === info.ans) {
          A.ok(); b.classList.add("ok"); Q.done = true;
          G.marks = markFor(q, info.ans); draw();
          setMsg("⭕ せいかい！", "good");
          setTimeout(function () {
            if (!G.quiz || G.quiz !== Q) return;
            Q.i++; Q.done = false; G.marks = [];
            if (Q.i >= G.P.quiz.length) { var n = Q.miss === 0 ? 3 : Q.miss <= 1 ? 2 : 1; showResult(n, null); }
            else { showQuestion(); draw(); }
          }, 900 / G.fast);
        } else {
          A.ng(); b.classList.add("ng"); b.disabled = true; Q.miss++;
          setMsg("ちがう みたい。ずひょう を よく みて みよう", "bad");
        }
      });
      box.appendChild(b);
    });
    setMsg(q.q === "fast" ? "ヒント: かたむき が きゅう な せん ほど はやい" : q.q === "long" ? "ヒント: よこ に まっすぐ な ところ が とまって いる ところ" : "");
  }

  /* ---------- けっか ---------- */
  function showResult(n, J) {
    var id = G.P.stage.id;
    save.stars[id] = Math.max(save.stars[id] || 0, n); store();
    $("starCount").textContent = totalStars();
    $("resStars").innerHTML = "★★★".slice(0, n) + "<span class='off'>" + "★★★".slice(0, 3 - n) + "</span>";
    $("resTitle").textContent = n === 3 ? "めいじん！" : n === 2 ? "じょうず！" : "できた！";
    var t = "";
    if (J) {
      t = "ぶつからずに ぜんぶ はしれた！<br>まち じかん <b>" + J.wait + "ふん</b>（めやす " + G.P.par + "ふん）";
      if (G.P.bonus) t += "<br>★3 の おだい: " + (J.bonus ? "✔ できた" : "✖ まだ");
      if (n < 3) t += "<br><small>まつ じかん を へらす と ★ が ふえる よ</small>";
    } else {
      t = G.quiz && G.quiz.miss ? "まちがい " + G.quiz.miss + "かい。" : "ぜんもん いっぱつ で せいかい！";
    }
    $("resText").innerHTML = t;
    $("nextBtn").hidden = !byId(id + 1);
    $("result").hidden = false;
    A.chime();
  }
  $("againBtn").addEventListener("click", function () {
    A.tap(); $("result").hidden = true;
    var id = G.P.stage.id;
    if (!isQuiz()) { save.work[id] = []; store(); }
    openStage(id);
  });
  $("menuBtn").addEventListener("click", function () { A.tap(); $("result").hidden = true; showHome(); });
  $("nextBtn").addEventListener("click", function () { A.tap(); $("result").hidden = true; openStage(G.P.stage.id + 1); });

  /* ---------- テスト よう ---------- */
  window.DTTest = {
    open: openStage,
    fast: function (v) { G.fast = v ? 8 : 1; },
    specs: specs,
    ans: function () { return G.P.ans.map(function (t) { return D.fmtSpec(D.toSpec(G.P.line, t)); }); },
    judge: function () { return G.J && { clear: G.J.clear, stars: G.J.stars, conflicts: G.J.conflicts.length, wait: G.J.wait }; },
    running: function () { return !!G.run; },
    quiz: function () { return G.quiz && { i: G.quiz.i, miss: G.quiz.miss }; },
    quizAnswer: function () { var q = G.P.quiz[G.quiz.i]; return String(D.quizAnswer(G.P.line, G.P.fixed, q)); },
    // ずひょう の うえ の (じこく, えき) → がめん の ざひょう
    px: function (t, st) {
      var r = dia.getBoundingClientRect();
      var km = typeof st === "number" ? G.P.line.stations[st].km : st.km;
      return { x: r.left + V.x(t), y: r.top + V.y(km) };
    },
    // こたえ の でんしゃ を なぞる みち（がめん ざひょう）
    pathFor: function (spec) {
      var P = G.P, tr = D.trainOf(P.line, spec), st = P.line.stations, out = [], r = dia.getBoundingClientRect();
      var P2 = function (t, km) { out.push({ x: r.left + V.x(t), y: r.top + V.y(km) }); };
      var s = tr.stops;
      P2(s[0][2], st[s[0][0]].km);
      for (var k = 0; k + 1 < s.length; k++) {
        var a = st[s[k][0]].km, b = st[s[k + 1][0]].km;
        if (k > 0) for (var w = s[k][1]; w <= s[k][2]; w += 0.5) P2(w, a);
        for (var f = 1; f <= 6; f++) P2(s[k][2] + (s[k + 1][1] - s[k][2]) * f / 6, a + (b - a) * f / 6);
      }
      return out;
    },
    state: function () { return { user: G.user.length, sel: G.sel, stage: G.P && G.P.stage.id }; },
    save: function () { return JSON.parse(JSON.stringify(save)); }
  };

  syncSound();
  renderHome();
})();
