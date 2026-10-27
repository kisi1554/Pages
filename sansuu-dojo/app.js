/* ============================================================
   さんすう どうじょう — がめん の うごき
   ============================================================ */
(function () {
  "use strict";
  var SD = window.SD, H = SD.h, E = SD.esc;
  var $ = function (s) { return document.querySelector(s); };
  var st = SD.load();
  var FAST = /[?&]fast=1/.test(location.search);
  var rec = function () { return st.rec[st.cur]; };
  var kid = function () { return st.kids.filter(function (k) { return k.id === st.cur; })[0] || st.kids[0]; };
  var save = function () { SD.save(st); };
  var rng = SD.rng();

  function applySet() {
    SD.audio.sound = !!st.set.sound; SD.audio.speech = !!st.set.speech;
    SD.timeScale = FAST ? 0 : st.set.fast ? 0.55 : 1;
    $("#sound").textContent = st.set.sound ? "🔊" : "🔇";
    var bi = SD.curBelt(rec());
    $("#kid").innerHTML = SD.chara.obi(Math.max(0, bi), 30).replace("<svg", bi < 0 ? '<svg style="opacity:.25"' : "<svg") + "<span>" + E(kid().name) + "</span>";
  }

  /* ---------- がめん きりかえ ---------- */
  var VIEWS = ["home", "map", "unit", "q", "result", "book", "rooms", "parent"];
  var cur = { view: "home", tool: null, run: null, back: null, quiz: null };
  function stopAll() {
    cur.run = null;
    SD.audio.stop();
    if (cur.tool) { try { cur.tool.destroy(); } catch (e) { /* もう ない */ } cur.tool = null; }
    document.querySelectorAll(".toolbar").forEach(function (b) { b.innerHTML = ""; });
  }
  function show(v, title, back) {
    stopAll();
    $("#toast").hidden = true;
    VIEWS.forEach(function (x) { $("#v-" + x).hidden = x !== v; });
    $("#back").hidden = v === "home";
    $("#title").innerHTML = title ? H(title) : "🥋 さんすう どうじょう";
    cur.view = v; cur.back = back || home;
    window.scrollTo(0, 0);
  }
  $("#back").addEventListener("click", function () { SD.audio.sfx("tap"); (cur.back || home)(); });

  function toast(text, ng) {
    var t = $("#toast");
    t.innerHTML = H(text); t.className = "toast" + (ng ? " ng" : ""); t.hidden = false;
    clearTimeout(toast.tm);
    toast.tm = setTimeout(function () { t.hidden = true; }, 900);
  }
  function btn(label, cls, fn) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "btn " + (cls || ""); b.innerHTML = H(label);
    b.addEventListener("click", function () { SD.audio.sfx("tap"); fn(); });
    return b;
  }
  function setBtns(sel, list) { var box = $(sel); box.innerHTML = ""; list.forEach(function (b) { if (b) box.appendChild(b); }); }
  function mountTool(wrap, host, spec) {
    if (cur.tool) { try { cur.tool.destroy(); } catch (e) { /* もう ない */ } cur.tool = null; }
    var w = $(wrap); w.querySelector(".toolbar").innerHTML = "";
    if (!spec) { w.classList.add("off"); $(host).innerHTML = ""; return null; }
    w.classList.remove("off");
    var name = spec.name || spec.tool;
    cur.tool = SD.tools[name]($(host), JSON.parse(JSON.stringify(spec.cfg || {})));
    return cur.tool;
  }
  var speak = function (text) { return SD.audio.speak(text); };
  var beltName = function (bi) { return bi < 0 ? "みならい" : SD.BELTS[bi].name; };

  /* ---------- ホーム ---------- */
  function home() {
    show("home");
    applySet();
    var r = rec(), bi = SD.curBelt(r), today = SD.today(), done = !!r.stamps[today];
    var greet = done ? "きょう の けいこ は おわり。よく がんばった のう！" : bi < 0 ? "ようこそ、さんすう どうじょう へ！ まず は しろおび を めざそう" : "きょう も けいこ を はじめよう！";
    $("#h-shihan").innerHTML = SD.chara.tanuki(done ? "happy" : "normal") + '<p class="bubble">' + H(greet) + "</p>";
    var nb = Math.min(bi + 1, SD.BELTS.length - 1), us = SD.unitsOf(SD.BELTS[nb].id);
    var got = us.filter(function (u) { return SD.uRec(r, u.id).stars > 0; }).length;
    var next = bi >= SD.BELTS.length - 1 ? "くろおび！ すばらしい" : "つぎ は " + SD.BELTS[nb].name + "：たんげん " + got + " / " + us.length + (us.length && got === us.length ? "（しょうきゅう しけん を うけよう！）" : "");
    $("#h-me").innerHTML = SD.chara.gi(bi) + "<div style='flex:1'><b>" + E(kid().name) + "</b> ・ " + beltName(bi) +
      "<small>" + H(next) + "</small><div class='bar2'><i style='width:" + (us.length ? Math.round(got / us.length * 100) : 0) + "%'></i></div></div>";
    $("#keiko-hanko").hidden = !done;
    $("#keiko-sub").innerHTML = H(done ? "きょう は もう はんこ を もらったよ（もういちど も できる）" : "5ふん・にがて ＋ ふくしゅう ＋ あたらしい");
  }
  $("#go-keiko").addEventListener("click", function () { SD.audio.sfx("tap"); startKeiko(); });
  document.querySelectorAll("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () { SD.audio.sfx("tap"); ({ map: map, book: book, rooms: rooms, parent: parent })[b.getAttribute("data-go")](); });
  });

  /* ---------- おび の みち ---------- */
  function map() {
    show("map", "🥋 おび の みち");
    var r = rec(), bi = SD.curBelt(r), now = SD.currentUnit(r), out = "";
    SD.BELTS.forEach(function (b, i) {
      var us = SD.unitsOf(b.id), passed = SD.passed(r, b.id), locked = !r.free && i > bi + 1;
      out += '<section class="beltsec' + (locked ? " locked" : "") + '" style="border-color:' + b.line + '"><h2>' + SD.chara.obi(i, 44) + b.name + " <small>" + b.grade + "</small>" + (passed ? '<span class="got">✓ とった！</span>' : "") + "</h2>";
      if (!us.length && b.id !== "kuro") out += '<p class="soon">じゅんび ちゅう（つぎ の アップデート で ふえるよ）</p>';
      else {
        out += '<div class="ugrid">';
        us.forEach(function (u) {
          var ur = SD.uRec(r, u.id), open = SD.unitOpen(r, u);
          out += '<button class="ucard' + (u === now && open ? " now" : "") + '" data-u="' + u.id + '"' + (open ? "" : " disabled") + '><span class="em">' + (open ? u.em : "🔒") + "</span><b>" + H(u.title) + "</b><small>" + H(u.sub || "") + '</small><span class="st">' + "★★★".slice(0, ur.stars) + '<span style="color:#e5ddd3">' + "★★★".slice(ur.stars) + "</span></span></button>";
        });
        out += "</div>";
        if (SD.testUnits(b.id).length) {
          var to = SD.testOpen(r, b.id), tr = r.tests[b.id];
          out += '<button class="testbtn' + (passed ? " passed" : "") + '" data-test="' + b.id + '"' + (to ? "" : " disabled") + ">📜 " + b.name + " の しょうきゅう しけん" + (tr ? "（さいこう " + tr.best + "/10）" : "") + "</button>";
        }
      }
      out += "</section>";
    });
    out += '<p class="note">' + H("たんげん を ★1 いじょう に すると つぎ が ひらくよ。ぜんぶ ひらいたら しょうきゅう しけん（10もん・8もん で ごうかく）。") + "</p>";
    $("#map").innerHTML = out;
    $("#map").querySelectorAll("[data-u]").forEach(function (b) { b.addEventListener("click", function () { SD.audio.sfx("tap"); openUnit(SD.U(b.getAttribute("data-u"))); }); });
    $("#map").querySelectorAll("[data-test]").forEach(function (b) { b.addEventListener("click", function () { SD.audio.sfx("tap"); startTest(b.getAttribute("data-test")); }); });
    var n = $("#map .ucard.now");
    if (n && n.scrollIntoView) n.scrollIntoView({ block: "center" });
  }

  /* ---------- 単元: おてほん → やってみる → れんしゅう ---------- */
  function openUnit(u, step) {
    var ur = SD.uRec(rec(), u.id);
    step = step || (!ur.demo ? "demo" : !ur.exp ? "exp" : "prac");
    if (step === "prac") return startPractice(u);
    show("unit", u.em + " " + u.title, map);
    var steps = [["demo", "① おてほん", ur.demo], ["exp", "② やってみる", ur.exp], ["prac", "③ れんしゅう", ur.stars > 0]];
    var box = $("#u-steps"); box.innerHTML = "";
    steps.forEach(function (s) {
      var b = document.createElement("button");
      b.className = (s[0] === step ? "on" : "") + (s[2] ? " done" : ""); b.textContent = s[1];
      b.addEventListener("click", function () { SD.audio.sfx("tap"); openUnit(u, s[0]); });
      box.appendChild(b);
    });
    $("#u-face").innerHTML = SD.chara.tanuki("normal");
    if (step === "demo") runDemo(u); else runExplore(u);
  }
  function say(sel, text, mood) {
    $(sel).innerHTML = H(text);
    if (mood) $(sel.replace("say", "face").replace("text", "face")).innerHTML = SD.chara.tanuki(mood);
  }
  function runDemo(u) {
    var token = cur.run = {}, t = mountTool("#u-toolwrap", "#u-tool", u.demo), ur = SD.uRec(rec(), u.id);
    var end = function () {
      if (token !== cur.run || token.ended) return;
      token.ended = true;
      ur.demo = 1; save();
      say("#u-say", "わかった かな？ つぎ は じぶん で さわって みよう！", "happy");
      $("#u-steps").children[0].classList.add("done");
      setBtns("#u-btns", [btn("▶ もういちど", "", function () { openUnit(u, "demo"); }), btn("② やってみる →", "main", function () { openUnit(u, "exp"); })]);
    };
    setBtns("#u-btns", [btn("⏭ とばす", "", function () { SD.audio.stop(); end(); })]);
    u.demo.steps.reduce(function (p, s) {
      return p.then(function () {
        if (token !== cur.run || token.ended) return;
        say("#u-say", s.say, "normal");
        return Promise.all([speak(s.say), s.act && t ? s.act(t) : SD.wait(300)]);
      });
    }, SD.wait(300)).then(end);
  }
  function runExplore(u) {
    var token = cur.run = {}, ex = u.explore, t = mountTool("#u-toolwrap", "#u-tool", ex), i = 0, ur = SD.uRec(rec(), u.id);
    var task = function () {
      if (token !== cur.run) return;
      var tk = ex.tasks[i];
      if (tk.cfg) t = mountTool("#u-toolwrap", "#u-tool", { name: ex.tool, cfg: tk.cfg });
      say("#u-say", tk.say, "normal"); speak(tk.say);
      setBtns("#u-btns", [btn("🔈", "small", function () { speak(tk.say); }), btn("できた！", "main", function () {
        if (tk.check(t)) {
          SD.audio.sfx("don"); toast("できた！");
          i++;
          if (i < ex.tasks.length) setTimeout(task, 900 * Math.max(SD.timeScale, 0.05)); else finish();
        } else {
          SD.audio.sfx("ng");
          say("#u-say", (tk.hint || "もう すこし！") + "　" + tk.say, "think");
        }
      })]);
    };
    var finish = function () {
      ur.exp = 1; save();
      $("#u-steps").children[1].classList.add("done");
      var m = "じょうず！ どうぐ の つかいかた が わかったね。つぎ は れんしゅう だ";
      say("#u-say", m, "happy"); speak(m);
      setBtns("#u-btns", [btn("もういちど さわる", "", function () { openUnit(u, "exp"); }), btn("③ れんしゅう →", "main", function () { startPractice(u); })]);
    };
    task();
  }

  /* ---------- もんだい を とく ---------- */
  function inputMode(p) {
    var u = SD.U(p.u);
    if (p.choices) return "choice";
    if (u.input === "choice") return "choice";
    if (rec().grade === "k" && typeof p.ans === "number" && p.ans <= 20) return "choice";
    return "pad";
  }
  function startPractice(u) {
    runQuiz(SD.makePractice(u, rng), "p", { u: u });
  }
  function startTest(beltId) {
    runQuiz(SD.makeTest(beltId, rng), "t", { belt: beltId });
  }
  function startKeiko() {
    var k = SD.makeKeiko(rec(), rng, SD.today());
    runQuiz(k.list, "k", { u: k.unit });
  }
  function runQuiz(list, mode, meta) {
    var title = mode === "t" ? "📜 " + SD.belt(meta.belt).name + " しょうきゅう しけん" : mode === "k" ? "📅 きょう の けいこ" : mode === "r" ? "🔁 まちがえた ところ" : meta.u.em + " " + meta.u.title + "：れんしゅう";
    show("q", title, mode === "p" ? function () { openUnit(meta.u, "exp"); } : mode === "k" ? home : map);
    cur.quiz = { list: list, mode: mode, meta: meta, i: 0, res: [], requeued: {} };
    renderQ();
  }
  function dots() {
    var Q = cur.quiz, out = "";
    Q.list.forEach(function (_, i) { var r = Q.res[i]; out += '<span class="' + (i === Q.i ? "now" : r ? (r.ok ? "ok" : "ng") : "") + '"></span>'; });
    $("#q-dots").innerHTML = out;
  }
  function renderQ() {
    var Q = cur.quiz, p = Q.list[Q.i];
    Q.tries = 0; Q.t0 = Date.now(); Q.input = ""; Q.locked = false;
    var u = SD.U(p.u);
    $("#q-tag").innerHTML = H((Q.mode === "t" ? (Q.i + 1) + " / " + Q.list.length + "もんめ" : u.em + " " + u.title) + (p.from ? '<span class="from">' + p.from + "</span>" : ""));
    dots();
    $("#q-face").innerHTML = SD.chara.tanuki("normal");
    $("#q-text").innerHTML = H(p.q);
    $("#q-expr").innerHTML = p.expr ? H(p.expr) : "";
    var showTool = p.tool && (p.toolAnswer || (p.lv === 0 && Q.mode !== "t"));
    $("#q-pic").innerHTML = p.pic && !(showTool && !p.picWithTool) ? p.pic : "";
    mountTool("#q-toolwrap", "#q-tool", showTool ? p.tool : null);
    $("#q-fb").innerHTML = "";
    $("#q-choices").innerHTML = ""; $("#q-pad").innerHTML = ""; $("#q-ans").innerHTML = ""; $("#q-ans").classList.add("off");
    $("#q-choices").classList.toggle("wide", !!p.wide);
    var btns = [];
    if (p.toolAnswer) btns.push(btn("できた！", "main", function () { submit(cur.tool ? cur.tool.value() : null); }));
    else if (inputMode(p) === "choice") {
      var ch = p.choices || SD.numChoices(p.ans, rng, 0, Math.max(10, p.ans + 3), 3);
      ch.forEach(function (c) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "choice"; b.innerHTML = H(c.h); b.setAttribute("data-v", c.v);
        b.addEventListener("click", function () { if (Q.locked) return; SD.audio.sfx("tap"); Q.lastBtn = b; submit(c.v); });
        $("#q-choices").appendChild(b);
      });
    } else {
      $("#q-ans").classList.remove("off");
      drawAns();
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach(function (d) { padKey(String(d), "", function () { if (Q.input.length < 4) { Q.input = (Q.input === "0" ? "" : Q.input) + d; SD.audio.sfx("poko"); drawAns(); } }); });
      padKey("けす", "del", function () { Q.input = Q.input.slice(0, -1); SD.audio.sfx("poko2"); drawAns(); });
      padKey("こたえる", "go", function () { if (Q.input !== "") submit(Number(Q.input)); });
    }
    setBtns("#q-btns", btns);
    speak(p.say || (p.q + "　" + (p.expr || "")));
  }
  function padKey(label, cls, fn) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "key " + cls; b.textContent = label; b.setAttribute("data-k", label);
    b.addEventListener("click", function () { if (!cur.quiz.locked) fn(); });
    $("#q-pad").appendChild(b);
  }
  function drawAns() {
    var Q = cur.quiz, p = Q.list[Q.i];
    $("#q-ans").innerHTML = E(Q.input) + '<span class="caret"></span>' + (p.suffix ? "<small>" + H(p.suffix) + "</small>" : "");
  }
  function ansLabel(p) {
    if (p.choices) { var c = p.choices.filter(function (x) { return String(x.v) === String(p.ans); })[0]; if (c) return c.h; }
    if (p.ansLabel) return p.ansLabel;
    if (p.kind && p.kind.op === "clock") return SD.M.fmtTime(p.kind.h, p.kind.m);
    return String(p.ans) + (p.suffix || "");
  }
  function submit(given) {
    var Q = cur.quiz, p = Q.list[Q.i], r = rec();
    if (Q.locked) return;
    var ok = SD.check(p, given), first = Q.tries === 0;
    if (first) {
      var mis = ok ? null : SD.diagnose(p, given);
      SD.logResult(r, p, ok, Date.now() - Q.t0, mis, Q.mode);
      if (Q.mode !== "r") SD.leitnerUpdate(r, p, ok, SD.today());
      Q.res[Q.i] = { p: p, ok: ok, given: given, mis: mis };
      save();
    }
    if (ok) {
      Q.locked = true;
      SD.audio.sfx("don"); toast(Q.tries ? "できた！" : "ドン！ せいかい");
      $("#q-face").innerHTML = SD.chara.tanuki("happy");
      if (Q.lastBtn) Q.lastBtn.classList.add("ok");
      $("#q-fb").innerHTML = '<span class="hint">' + SD.chara.kotori("happy").replace("<svg", '<svg style="width:40px;height:40px;vertical-align:middle"') + H(SD.rng().pick(["ピッコ：すごい！ しゅっぱつ しんこう！", "ピッコ：ぴったり！ ていじ うんてん！", "ピッコ：いいね！ つぎ の えき へ！"])) + "</span>";
      setTimeout(advance, 950 * Math.max(SD.timeScale, 0.05));
      Q.lastBtn = null;
      return;
    }
    if (Q.mode === "t") {
      Q.locked = true;
      SD.audio.sfx("tap");
      setTimeout(advance, 500 * Math.max(SD.timeScale, 0.05));
      return;
    }
    Q.tries++;
    SD.audio.sfx("ng");
    if (Q.lastBtn) { Q.lastBtn.classList.add("ng"); Q.lastBtn.disabled = true; Q.lastBtn = null; }
    $("#q-face").innerHTML = SD.chara.tanuki("think");
    var code = SD.diagnose(p, given);
    if (Q.tries === 1) {
      var hint = code && SD.HINTS[code] ? SD.HINTS[code] : "おしい！ もういちど かんがえて みよう";
      $("#q-fb").innerHTML = '<span class="hint">💡 ' + H(hint) + "</span>";
      speak(hint);
      Q.input = ""; if ($("#q-ans").classList.contains("off") === false) drawAns();
      // どうぐ が でて いない ときは「どうぐ を つかう」
      if (p.tool && !cur.tool) setBtns("#q-btns", [btn("🧰 どうぐ を つかう", "", function () { mountTool("#q-toolwrap", "#q-tool", p.tool); $("#q-pic").innerHTML = ""; })]);
      return;
    }
    Q.locked = true;
    $("#q-fb").innerHTML = '<span class="hint">こたえ は <span class="ans">' + H(ansLabel(p)) + "</span>" + (p.explain ? "<br>" + p.explain : "") + "</span>";
    speak("こたえ は " + SD.say(ansLabel(p)));
    // じかん を あけて もういちど（おなじ れんしゅう の さいご に）
    if ((Q.mode === "p" || Q.mode === "k") && !Q.requeued[p.key]) {
      Q.requeued[p.key] = 1;
      var again = SD.build(SD.U(p.u), p.params, Math.min(1, p.lv)); again.from = "もういちど";
      Q.list.push(again);
    }
    setBtns("#q-btns", [btn("つぎ へ →", "main", advance)]);
  }
  function advance() {
    var Q = cur.quiz;
    if (!Q || cur.view !== "q") return;
    Q.i++;
    if (Q.i >= Q.list.length) finish(); else renderQ();
  }

  /* ---------- けっか ---------- */
  function resTable(res) {
    var rows = res.map(function (x) {
      var p = x.p;
      return "<tr class='" + (x.ok ? "" : "ng") + "'><td>" + (x.ok ? "⭕" : "❌") + "</td><td>" + H(p.expr || p.q.replace(/<[^>]+>/g, "")) + "</td><td>" + H(ansLabel(p)) + "</td></tr>";
    });
    return '<table class="rtable"><tr><th></th><th>もんだい</th><th>こたえ</th></tr>' + rows.join("") + "</table>";
  }
  function finish() {
    var Q = cur.quiz, r = rec(), res = Q.res.filter(Boolean), okN = res.filter(function (x) { return x.ok; }).length, html = "", bts = [];
    var wrong = res.filter(function (x) { return !x.ok; });
    var redo = function () {
      runQuiz(wrong.map(function (x) { var p = SD.build(SD.U(x.p.u), x.p.params, 0); p.from = "もういちど"; return p; }), "r", Q.meta);
    };
    show("result", "けっか", Q.mode === "p" ? map : Q.mode === "k" ? home : map);
    if (Q.mode === "p") {
      var u = Q.meta.u, ur = SD.uRec(r, u.id), miss = res.length - okN, stars = SD.starsFor(miss, res.length), was = ur.stars;
      ur.stars = Math.max(ur.stars, stars); ur.n++; save();
      var nx = SD.unitsOf(u.belt), idx = nx.indexOf(u), nextU = nx[idx + 1];
      html = SD.chara.tanuki("cheer") + "<h2>" + H(u.title) + " の れんしゅう おわり！</h2><div class='stars'>" + "★★★".slice(0, stars) + "<span class='off'>" + "★★★".slice(stars) + "</span></div>" +
        "<p>" + res.length + "もん ちゅう " + okN + "もん いっぱつ で せいかい" + (was === 0 ? "。あたらしい たんげん が ひらいたよ！" : "") + "</p>" + resTable(res);
      bts.push(btn("もういちど", "", function () { startPractice(u); }));
      if (nextU) bts.push(btn("つぎ：" + nextU.title + " →", "main", function () { openUnit(nextU); }));
      else if (SD.testOpen(r, u.belt) && !SD.passed(r, u.belt)) bts.push(btn("📜 しょうきゅう しけん へ", "main", function () { startTest(u.belt); }));
      else bts.push(btn("おび の みち へ", "main", map));
      speak(stars === 3 ? "ぜんもん いっぱつ！ みごと じゃ" : "よく がんばった！");
    } else if (Q.mode === "t") {
      var b = SD.belt(Q.meta.belt), bi = SD.beltIdx(b.id), pass = okN >= SD.TEST_PASS, already = SD.passed(r, b.id);
      var tr = r.tests[b.id] || (r.tests[b.id] = { best: 0, n: 0 });
      tr.best = Math.max(tr.best, okN); tr.n++;
      var before = SD.curBelt(r);
      if (pass && !already) r.belts.push(b.id);
      save();
      html = SD.chara.tanuki(pass ? "cheer" : "think") + "<h2>" + b.name + " しょうきゅう しけん</h2><div class='stars' style='color:" + (pass ? "var(--ok)" : "#d9480f") + "'>" + okN + " / " + res.length + "</div>" +
        (pass ? "<p><b>ごうかく！</b>" + (already ? " さすが じゃ。" : " " + b.name + " を さずける！") + "</p>" : "<p><b>あと すこし！</b><br>まちがえた ところ を もう いちど けいこ しよう。" + SD.TEST_PASS + "もん で ごうかく だよ</p>") + resTable(res);
      if (!pass && wrong.length) bts.push(btn("🔁 まちがえた ところ を けいこ", "main", redo));
      bts.push(btn(pass ? "おび の みち へ" : "もういちど しけん", pass ? "main" : "", pass ? map : function () { startTest(b.id); }));
      speak(pass ? "ごうかく！" : "あと すこし！ まちがえた ところ を もう いちど けいこ しよう");
      if (pass && !already) setTimeout(function () { menjo(before, bi); }, 400 * Math.max(SD.timeScale, 0.05));
    } else if (Q.mode === "k") {
      var today = SD.today(), firstToday = !r.stamps[today];
      r.stamps[today] = { n: res.length, ok: okN };
      save();
      html = '<div class="hanko big" style="position:relative;margin:10px auto;top:0;right:0;width:96px;height:96px;font-size:20px">けいこ<br>ずみ</div>' +
        "<h2>きょう の けいこ おわり！</h2><p>" + res.length + "もん ちゅう " + okN + "もん いっぱつ で せいかい。" + (firstToday ? "けいこ{帳|ちょう} に はんこ を おしたよ！" : "") + "</p>" + resTable(res);
      SD.audio.sfx("stamp");
      bts.push(btn("📒 けいこ{帳|ちょう}", "", book));
      bts.push(btn("ホーム へ", "main", home));
    } else {
      html = SD.chara.tanuki("happy") + "<h2>まちがえた ところ の けいこ おわり</h2><p>" + okN + " / " + res.length + " いっぱつ で せいかい</p>" + resTable(res);
      if (Q.meta.belt) bts.push(btn("📜 しけん に もういちど", "main", function () { startTest(Q.meta.belt); }));
      bts.push(btn("おび の みち へ", "", map));
    }
    $("#result").innerHTML = html + '<div class="btns" id="r-btns"></div>';
    setBtns("#r-btns", bts);
  }

  /* ---------- しょうきゅう の めんじょう ---------- */
  function menjo(from, to) {
    var b = SD.BELTS[to], m = $("#menjo");
    m.innerHTML = '<div class="scroll"><div class="gis">' + SD.chara.gi(from) + '<span style="font-size:30px">→</span>' + SD.chara.gi(to).replace('class="gi"', 'class="gi new"') + "</div>" +
      "<h2>めんじょう</h2><p><b>" + E(kid().name) + "</b> どの<br>あなた は さんすう の しゅぎょう に はげみ<br>" +
      '<b style="color:' + (b.id === "shiro" ? "#555" : b.line) + ';font-size:22px">' + b.name + "</b> に しょうきゅう した<br>ことを ここに みとめます</p>" +
      '<p class="sign">' + SD.today().replace(/-/g, ". ") + "<br>" + SD.chara.tanuki("cheer").replace("<svg", '<svg style="width:60px;height:70px;vertical-align:middle"') + " ぽんた しはん</p>" +
      '<div class="btns"><button class="btn main" id="menjo-ok">ありがとう ございました！</button></div></div>';
    m.hidden = false;
    SD.audio.sfx("fanfare");
    speak("おめでとう！ " + b.name + " に しょうきゅう じゃ！");
    var colors = ["#e03131", "#f08c00", "#ffd43b", "#2f9e44", "#1c7ed6", "#7048e8", b.color];
    for (var i = 0; i < 40; i++) {
      var c = document.createElement("i");
      c.className = "confetti"; c.style.left = Math.random() * 100 + "vw"; c.style.background = colors[i % colors.length];
      c.style.animationDuration = (2 + Math.random() * 2) + "s"; c.style.animationDelay = Math.random() * 0.8 + "s";
      document.body.appendChild(c);
      setTimeout(function (el) { return function () { el.remove(); }; }(c), 5000);
    }
    $("#menjo-ok").addEventListener("click", function () { SD.audio.sfx("tap"); m.hidden = true; applySet(); });
  }

  /* ---------- けいこ帳 ---------- */
  function book(offset) {
    offset = typeof offset === "number" ? offset : 0;
    show("book", "📒 けいこ{帳|ちょう}");
    var r = rec(), now = new Date(), d0 = new Date(now.getFullYear(), now.getMonth() + offset, 1), today = SD.today();
    var days = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate(), out = "";
    var keys = Object.keys(r.stamps).sort(), streak = 0, t = SD.dayNum(today);
    if (!r.stamps[today]) t -= 1;
    while (r.stamps[SD.dayStr(t)]) { streak++; t--; }
    out += '<div class="bookinfo"><div>はんこ<b>' + keys.length + "</b>こ</div><div>れんぞく<b>" + streak + "</b>にち</div><div>" + H("{今|いま}") + " の おび<b style='font-size:18px'>" + beltName(SD.curBelt(r)) + "</b></div></div>";
    out += '<div class="calhead"><button class="btn small" id="b-prev">◀ まえ</button><b>' + d0.getFullYear() + "ねん " + (d0.getMonth() + 1) + "がつ</b><button class=\"btn small\" id=\"b-next\"" + (offset >= 0 ? " disabled" : "") + ">つぎ ▶</button></div>";
    out += '<div class="cal">' + ["にち", "げつ", "か", "すい", "もく", "きん", "ど"].map(function (w) { return '<div class="dow">' + w + "</div>"; }).join("");
    for (var i = 0; i < d0.getDay(); i++) out += "<div></div>";
    for (var dd = 1; dd <= days; dd++) {
      var key = SD.today(new Date(d0.getFullYear(), d0.getMonth(), dd)), s = r.stamps[key];
      out += '<div class="d' + (key === today ? " today" : "") + '">' + dd + (s ? '<span class="st">' + s.ok + "/" + s.n + "</span>" : "") + "</div>";
    }
    out += "</div><p class='note'>" + H("きょう の けいこ を おわらせる と、その ひ に はんこ が つくよ（なか の かず は いっぱつ で せいかい した かず）。") + "</p>";
    $("#book").innerHTML = out;
    $("#b-prev").addEventListener("click", function () { book(offset - 1); });
    $("#b-next").addEventListener("click", function () { if (offset < 0) book(offset + 1); });
  }

  /* ---------- となり の へや ---------- */
  var ROOMS = [
    { app: "kids-addition-game", em: "🍎", name: "たしざん とっくん", desc: "5+3・6+3 を くだもの で", units: ["tasu10"] },
    { app: "blueline-tashizan", em: "🚇", name: "ブルーライン たしざん", desc: "でんしゃ で すうちょくせん", units: ["tasu10", "mittsu", "kazu20"] },
    { app: "rhythm-tashizan", em: "🥁", name: "リズムで たしざん", desc: "うたって おぼえる たしざん", units: ["tasu10", "kuriagari", "ikutsu"] },
    { app: "speed-tashizan", em: "⏱️", name: "スピード たしざん", desc: "10もん タイム アタック", units: ["kuriagari", "kurisagari"] },
    { app: "manabi-densha", em: "🚃", name: "まなび でんしゃ", desc: "えき に つく たび 1もん", units: ["hiku10", "kazu20", "mittsu"] },
    { app: "soroban-dojo", em: "🧮", name: "そろばん どうじょう", desc: "5 と 10 の こつ", units: ["ikutsu", "kazu100", "kazu1000"] },
    { app: "cake-wakekko", em: "🍰", name: "ケーキ わけっこ", desc: "わけて ぶんすう の はじめ", units: ["bunsu"] },
    { app: "tenbin-puzzle", em: "⚖️", name: "てんびん パズル", desc: "おもさ で しき を かんがえる", units: ["kuraberu", "chosen"] },
    { app: "ao-tokei", em: "🕰️", name: "あおちゃん の とけい", desc: "とけい の よみかた", units: ["tokei1", "tokei2", "jikan"] },
    { app: "zukei-lab", em: "🧊", name: "さわって ずけい ラボ", desc: "はこ を まわして ひらく", units: ["katachi", "hako", "sankaku"] }
  ];
  SD.ROOMS = ROOMS;
  function roomsFor(uid) { return ROOMS.filter(function (r) { return r.units.indexOf(uid) >= 0; }); }
  function rooms() {
    show("rooms", "🚪 となり の へや");
    var out = '<p class="note">' + H("どうじょう の となり には、ひとつ の わざ を とことん みがく へや が あるよ。") + '</p><div class="rooms">';
    ROOMS.forEach(function (r) {
      var us = r.units.map(SD.U).filter(Boolean).map(function (u) { return u.title; });
      out += '<a class="room" href="../' + r.app + '/"><span class="em">' + r.em + "</span><span><b>" + r.name + "</b><small>" + H(r.desc) + (us.length ? "<br>かんけい：" + H(us.join("・")) : "") + "</small></span></a>";
    });
    $("#rooms").innerHTML = out + "</div>";
  }

  /* ---------- ほごしゃ ---------- */
  var parentOk = false, pview = null;
  function parent() {
    show("parent", "👪 おうち の ひと");
    if (!parentOk && !FAST) {
      var a = rng.int(12, 19), b = rng.int(3, 8);
      $("#parent").innerHTML = '<div class="gate"><p>おとな の かた へ：こたえ を いれて ください</p><p style="font-size:28px;font-weight:bold">' + a + " × " + b + ' = ?</p><input id="g-in" type="text" inputmode="numeric" autocomplete="off"><div class="btns"><button class="btn main" id="g-ok">ひらく</button></div></div>';
      $("#g-ok").addEventListener("click", function () {
        if (Number($("#g-in").value) === a * b) { parentOk = true; parent(); } else { $("#g-in").value = ""; SD.audio.sfx("ng"); }
      });
      return;
    }
    pview = pview && st.rec[pview] ? pview : st.cur;
    var r = st.rec[pview], k = st.kids.filter(function (x) { return x.id === pview; })[0], S = SD.stats(r), bi = SD.curBelt(r), out = "";
    out += '<div class="ktabs">' + st.kids.map(function (x) { return '<button data-k="' + x.id + '" class="' + (x.id === pview ? "on" : "") + '">' + E(x.name) + "</button>"; }).join("") + "</div>";
    // めやす
    var g = SD.GRADES.filter(function (x) { return x.id === r.grade; })[0] || SD.GRADES[0];
    var diff = bi - g.belt, verdict = diff > 0 ? "めやす より すすんで います" : diff === 0 ? "めやす どおり です" : "めやす まで あと " + (-diff) + "つ の おび です";
    out += '<section class="psec"><h3>🎯 学年 の めやす</h3><div class="prow"><label>学年 <select id="p-grade">' + SD.GRADES.map(function (x) { return '<option value="' + x.id + '"' + (x.id === r.grade ? " selected" : "") + ">" + x.name + "</option>"; }).join("") + "</select></label></div>" +
      '<p class="meyasu">' + E(k.name) + " さん は いま <b>" + beltName(bi) + "</b>。" + g.name + " の めやす は <b>" + SD.BELTS[g.belt].name + "</b> まで。→ " + verdict + "</p>" +
      '<p class="note">ねんちょう を えらぶ と、こたえ は すうじ を えらぶ かたち に なります（1ねん いじょう は すうじ キーパッド）。</p></section>';
    // すすみ
    out += '<section class="psec"><h3>🥋 おび ごと の すすみ</h3><table class="ptable"><tr><th>おび</th><th>たんげん</th><th>しけん</th></tr>';
    SD.BELTS.forEach(function (b, i) {
      var us = SD.unitsOf(b.id), got = us.filter(function (u) { return SD.uRec(r, u.id).stars > 0; }).length, tr = r.tests[b.id];
      out += "<tr><td>" + SD.chara.obi(i, 34) + " " + b.name + "<br><small>" + b.grade + "</small></td><td>" + (us.length ? got + " / " + us.length : "じゅんび ちゅう") + "</td><td>" + (SD.passed(r, b.id) ? "✅ ごうかく" : tr ? "さいこう " + tr.best + "/10" : "—") + "</td></tr>";
    });
    out += "</table></section>";
    // 単元 ごと
    out += '<section class="psec"><h3>📊 たんげん ごと の せいとうりつ・じかん</h3><table class="ptable"><tr><th>たんげん</th><th>かいすう</th><th>せいとうりつ</th><th>1もん</th><th>★</th></tr>';
    SD.units.forEach(function (u) {
      var s = S.units[u.id], ur = SD.uRec(r, u.id);
      if (!s && !ur.stars) return;
      var pct = s && s.n ? Math.round(s.ok / s.n * 100) : 0;
      out += "<tr><td>" + u.em + " " + H(u.title) + "</td><td class='n'>" + (s ? s.n : 0) + "</td><td><span class='bar3' style='width:" + Math.round(pct * 0.6) + "px;background:" + (pct >= 80 ? "#2b8a3e" : pct >= 60 ? "#f08c00" : "#c92a2a") + "'></span> " + pct + "%</td><td class='n'>" + (s ? (s.avg / 1000).toFixed(1) + "びょう" : "—") + "</td><td>" + "★★★".slice(0, ur.stars) + "</td></tr>";
    });
    out += "</table>" + (Object.keys(S.units).length ? "" : '<p class="note">まだ きろく が ありません。</p>') + "</section>";
    // にがて
    var types = Object.keys(S.types).map(function (t) { return { t: t, n: S.types[t].n, ok: S.types[t].ok }; }).filter(function (x) { return x.n >= 3 && x.ok / x.n < 0.9; })
      .sort(function (a, b) { return a.ok / a.n - b.ok / b.n; }).slice(0, 6);
    var mis = Object.keys(S.mis).sort(function (a, b) { return S.mis[b] - S.mis[a]; }).slice(0, 4);
    out += '<section class="psec"><h3>🔍 にがて な かた</h3>' + (types.length ? "<ul>" + types.map(function (x) { return "<li><b>" + H(x.t) + "</b>：" + Math.round(x.ok / x.n * 100) + "%（" + x.n + "もん）</li>"; }).join("") + "</ul>" : '<p class="note">3もん いじょう といて 9わり みまん の かた は ありません。</p>') +
      (mis.length ? "<p><b>よく ある まちがえ かた</b></p><ul>" + mis.map(function (m) { return "<li>" + H(SD.HINTS[m] || m) + "（" + S.mis[m] + "かい）</li>"; }).join("") + "</ul>" : "") +
      "<p class='note'>にがて ばこ（もう いちど でる もんだい）：" + Object.keys(r.L).length + "もん</p></section>";
    // まいにち の グラフ（14にち）
    out += '<section class="psec"><h3>📅 さいきん 14にち の けいこ</h3>' + dayChart(r) + "</section>";
    // せってい
    out += '<section class="psec"><h3>⚙️ すすめかた</h3><div class="prow"><label><input type="checkbox" id="p-free"' + (r.free ? " checked" : "") + "> どの たんげん から でも えらべる（じゅんばん に ひらかない）</label></div>" +
      '<div class="prow"><select id="p-from">' + SD.BELTS.map(function (b, i) { return '<option value="' + i + '">' + b.name + " から はじめる</option>"; }).join("") + '</select><button class="btn small" id="p-start">きりかえ</button></div>' +
      '<p class="note">「◯◯おび から はじめる」と、それ より まえ の おび を とった こと に して、学年 に あわせて とちゅう から すすめられます。</p></section>';
    // きょうだい
    out += '<section class="psec"><h3>👧👦 きょうだい（3にん まで）</h3>' + st.kids.map(function (x) {
      return '<div class="prow"><input type="text" data-name="' + x.id + '" value="' + E(x.name) + '" maxlength="10"><button class="btn small" data-del="' + x.id + '"' + (st.kids.length < 2 ? " disabled" : "") + ">けす</button></div>";
    }).join("") + (st.kids.length < SD.MAX_KIDS ? '<div class="prow"><button class="btn small" id="p-add">＋ ふやす</button></div>' : "") +
      '<div class="prow"><button class="btn small" id="p-reset">' + E(k.name) + " の きろく を けす</button></div></section>";
    $("#parent").innerHTML = out;
    var P = $("#parent");
    P.querySelectorAll("[data-k]").forEach(function (b) { b.addEventListener("click", function () { pview = b.getAttribute("data-k"); parent(); }); });
    $("#p-grade").addEventListener("change", function () { r.grade = this.value; save(); parent(); });
    $("#p-free").addEventListener("change", function () { r.free = this.checked; save(); });
    $("#p-start").addEventListener("click", function () {
      var i = Number($("#p-from").value);
      if (confirm(SD.BELTS[i].name + " から はじめますか？（それ より まえ の おび を とった こと に します）")) { SD.startFrom(r, i); save(); parent(); }
    });
    P.querySelectorAll("[data-name]").forEach(function (inp) {
      inp.addEventListener("change", function () { var x = st.kids.filter(function (y) { return y.id === inp.getAttribute("data-name"); })[0]; x.name = inp.value.trim() || x.name; save(); applySet(); });
    });
    P.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () { var id = b.getAttribute("data-del"); if (confirm("きろく ごと けしますか？")) { SD.removeKid(st, id); save(); pview = null; applySet(); parent(); } });
    });
    if ($("#p-add")) $("#p-add").addEventListener("click", function () { var id = SD.addKid(st); save(); pview = id; parent(); });
    $("#p-reset").addEventListener("click", function () { if (confirm(k.name + " の きろく を ぜんぶ けしますか？")) { st.rec[pview] = SD.newRec(); save(); parent(); } });
  }
  function dayChart(r) {
    var t = SD.dayNum(SD.today()), counts = [], max = 1;
    for (var i = 13; i >= 0; i--) counts.push({ d: SD.dayStr(t - i), n: 0, ok: 0 });
    r.log.forEach(function (e) {
      var k = SD.today(new Date(e.t));
      counts.forEach(function (c) { if (c.d === k) { c.n++; c.ok += e.ok; } });
    });
    counts.forEach(function (c) { max = Math.max(max, c.n); });
    var W = 340, Hh = 130, bw = W / 14, s = '<svg class="chart" viewBox="0 0 ' + W + " " + Hh + '" role="img" aria-label="14にち の もんだい すう">';
    counts.forEach(function (c, i) {
      var h = c.n / max * 90, ho = c.ok / max * 90, x = i * bw + 3;
      s += '<rect x="' + x + '" y="' + (100 - h) + '" width="' + (bw - 6) + '" height="' + h + '" rx="3" fill="#99e9f2"/>';
      s += '<rect x="' + x + '" y="' + (100 - ho) + '" width="' + (bw - 6) + '" height="' + ho + '" rx="3" fill="#0b7285"/>';
      if (c.n) s += '<text x="' + (x + (bw - 6) / 2) + '" y="' + (96 - h) + '" font-size="10" text-anchor="middle" fill="#3b2a1e">' + c.n + "</text>";
      s += '<text x="' + (x + (bw - 6) / 2) + '" y="116" font-size="10" text-anchor="middle" fill="#7a6555">' + Number(c.d.slice(8)) + "</text>";
      if (r.stamps[c.d]) s += '<circle cx="' + (x + (bw - 6) / 2) + '" cy="126" r="3" fill="#e03131"/>';
    });
    s += '<line x1="0" y1="100" x2="' + W + '" y2="100" stroke="#e2d3c3"/></svg>';
    return s + '<p class="note"><span style="color:#0b7285">■</span> いっぱつ で せいかい　<span style="color:#99e9f2">■</span> まちがえた　<span style="color:#e03131">●</span> はんこ</p>';
  }

  /* ---------- だれ が けいこ する？ ---------- */
  function kidDialog() {
    var f = $("#kid-form"), out = "<h3>だれ が けいこ する？</h3>";
    st.kids.forEach(function (k) {
      out += '<button type="button" class="kidpick' + (k.id === st.cur ? " on" : "") + '" data-pick="' + k.id + '">' + SD.chara.gi(SD.curBelt(st.rec[k.id])) + E(k.name) + " ・ " + beltName(SD.curBelt(st.rec[k.id])) + "</button>";
    });
    if (st.kids.length < SD.MAX_KIDS) out += '<div class="row"><input type="text" id="kid-new" placeholder="なまえ" maxlength="10"><button type="button" class="btn small" id="kid-add">＋ ふやす</button></div>';
    out += '<div class="row"><button class="btn main small">とじる</button></div>';
    f.innerHTML = out;
    f.querySelectorAll("[data-pick]").forEach(function (b) { b.addEventListener("click", function () { st.cur = b.getAttribute("data-pick"); save(); $("#dlg-kid").close(); home(); }); });
    if ($("#kid-add")) $("#kid-add").addEventListener("click", function () { var n = $("#kid-new").value.trim(); var id = SD.addKid(st, n || null); if (id) { st.cur = id; save(); } $("#dlg-kid").close(); home(); });
    $("#dlg-kid").showModal();
  }
  $("#kid").addEventListener("click", function () { SD.audio.sfx("tap"); kidDialog(); });

  /* ---------- せってい ---------- */
  $("#gear").addEventListener("click", function () {
    document.querySelectorAll("[data-set]").forEach(function (c) { c.checked = !!st.set[c.getAttribute("data-set")]; });
    $("#dlg").showModal();
  });
  document.querySelectorAll("[data-set]").forEach(function (c) {
    c.addEventListener("change", function () { st.set[c.getAttribute("data-set")] = c.checked; save(); applySet(); });
  });
  $("#sound").addEventListener("click", function () { st.set.sound = !st.set.sound; save(); applySet(); SD.audio.sfx("poko"); });
  $("#q-say").addEventListener("click", function () { var Q = cur.quiz; if (Q) { var p = Q.list[Q.i]; speak(p.say || (p.q + "　" + (p.expr || ""))); } });

  // テスト（Playwright）用 の のぞきまど
  window.__sd = {
    st: st,
    get p() { return cur.quiz && cur.view === "q" ? cur.quiz.list[cur.quiz.i] : null; },
    get tool() { return cur.tool; },
    get view() { return cur.view; },
    openUnit: function (id, step) { openUnit(SD.U(id), step); },
    home: home, map: map
  };

  /* ---------- はじめて の とき: なまえ と 学年 ---------- */
  function welcome() {
    var f = $("#kid-form");
    f.innerHTML = "<h3>ようこそ！ さんすう どうじょう へ</h3>" + SD.chara.tanuki("happy").replace("<svg", '<svg style="width:90px;height:104px;align-self:center"') +
      '<label>なまえ <input type="text" id="w-name" maxlength="10" placeholder="なまえ"></label><p style="margin:4px 0">なんねんせい？</p>' +
      SD.GRADES.filter(function (g) { return ["k", "1a", "2a"].indexOf(g.id) >= 0; }).map(function (g) {
        return '<button type="button" class="kidpick" data-g="' + g.id + '">' + (g.id === "k" ? "🧸 ねんちょう" : g.id === "1a" ? "🎒 1ねんせい" : "📚 2ねんせい") + "</button>";
      }).join("");
    f.querySelectorAll("[data-g]").forEach(function (b) {
      b.addEventListener("click", function () {
        var n = $("#w-name").value.trim();
        if (n) kid().name = n;
        rec().grade = b.getAttribute("data-g");
        st.seen = 1; save(); $("#dlg-kid").close(); home();
      });
    });
    $("#dlg-kid").showModal();
  }

  applySet();
  home();
  if (!st.seen && !FAST) welcome();
})();
