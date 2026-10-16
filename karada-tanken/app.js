/* ============================================================
   からだ たんけん — ほんたい
   ・ばめんは KaradaData.COURSES[ci].scenes[si]。game.type ごとに GAMES[type](ctx) が うごかす。
   ・タイミングの ミニゲームは、いま タップすると あたる あいだ #stage に data-hit="1" を つける
     （じどう テストが これを みて タップする）。
   ============================================================ */
(function () {
  "use strict";

  var D = window.KaradaData, A = window.KaradaArt;
  var SKEY = "karada-tanken-v1";
  var NS = "http://www.w3.org/2000/svg";

  /* ---------- ほぞん ---------- */
  var save = { sound: true, fart: true, badges: {}, words: {}, clears: {} };
  try {
    var raw = localStorage.getItem(SKEY);
    if (raw) {
      var p = JSON.parse(raw);
      if (p && typeof p === "object") {
        save.sound = p.sound !== false;
        save.fart = p.fart !== false;
        if (p.badges && typeof p.badges === "object") save.badges = p.badges;
        if (p.words && typeof p.words === "object") save.words = p.words;
        if (p.clears && typeof p.clears === "object") save.clears = p.clears;
      }
    }
  } catch (e) {}
  function persist() { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} }

  /* ---------- もじ ---------- */
  function rb(s) { return String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>"); }
  function plain(s) { return String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "$2").replace(/<[^>]+>/g, ""); }
  function $(id) { return document.getElementById(id); }
  function mk(tag, attrs, parent) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function now() { return performance.now() / 1000; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- おと（WebAudio の ごうせいおん だけ） ---------- */
  var Sound = (function () {
    var ctx = null, master = null;
    function ensure() {
      if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = .8; master.connect(ctx.destination);
      return ctx;
    }
    function tone(f0, f1, dur, type, vol, when) {
      if (!save.sound || !ensure()) return;
      var t = ctx.currentTime + (when || 0), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || .3, t + .006);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
    }
    function noise(dur, freq, vol, when, type, rise) {
      if (!save.sound || !ensure()) return;
      var t = ctx.currentTime + (when || 0), n = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource(); src.buffer = buf;
      var f = ctx.createBiquadFilter(); f.type = type || "bandpass"; f.Q.value = 1.5; f.frequency.value = freq;
      var g = ctx.createGain();
      if (rise) { g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * .8); g.gain.linearRampToValueAtTime(.0001, t + dur); }
      else { g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); }
      src.connect(f); f.connect(g); g.connect(master); src.start(t);
    }
    return {
      unlock: ensure,
      tap: function () { tone(880, 880, .05, "triangle", .12); },
      good: function () { tone(660, 660, .09, "triangle", .22); tone(990, 990, .14, "triangle", .22, .08); },
      miss: function () { tone(240, 180, .16, "triangle", .2); },
      chew: function () { noise(.07, 1400, .5); noise(.06, 900, .4, .07); },
      gulp: function () { tone(420, 140, .28, "sine", .4); },
      push: function () { tone(190, 110, .22, "sine", .45); noise(.12, 400, .15); },
      slosh: function () { noise(.28, 500, .35, 0, "lowpass"); },
      pop: function () { tone(700, 1500, .09, "sine", .25); },
      drop: function () { tone(1300, 480, .16, "sine", .28); },
      dokun: function (v) {
        v = v || 1;
        tone(75, 50, .16, "sine", .9 * v); noise(.05, 160, .25 * v, 0, "lowpass");
        tone(90, 60, .13, "sine", .65 * v, .19);
      },
      breathIn: function () { noise(1.2, 1800, .14, 0, "bandpass", true); },
      breathOut: function () { noise(1.0, 900, .14, 0, "bandpass"); },
      word: function () { tone(1047, 1047, .08, "sine", .18); tone(1319, 1319, .12, "sine", .18, .07); },
      clear: function () {
        [[523, 0], [659, .12], [784, .24], [1047, .38], [784, .54], [1047, .66], [1319, .8]].forEach(function (n) { tone(n[0], n[0], .2, "triangle", .28, n[1]); });
      },
      fart: function () {
        if (!save.sound || !save.fart || !ensure()) return;
        // ちょっぴり「ぷっ」: のこぎりなみ ＋ ゆらぎ ＋ ローパス
        var t = ctx.currentTime, o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        var f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = "sawtooth"; o.frequency.setValueAtTime(105, t); o.frequency.exponentialRampToValueAtTime(70, t + .38);
        lfo.frequency.value = 28; lg.gain.value = 22; lfo.connect(lg); lg.connect(o.frequency);
        f.type = "lowpass"; f.frequency.value = 520;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.32, t + .03); g.gain.setValueAtTime(.3, t + .25); g.gain.exponentialRampToValueAtTime(.0001, t + .4);
        o.connect(f); f.connect(g); g.connect(master);
        o.start(t); lfo.start(t); o.stop(t + .45); lfo.stop(t + .45);
        noise(.3, 300, .12, 0, "lowpass");
      }
    };
  })();

  /* ---------- ヘッダー・がめん ---------- */
  var view = "home", run = null;
  var VIEWS = ["home", "course", "zukan"];
  function show(v) {
    view = v;
    VIEWS.forEach(function (n) { $(n).hidden = n !== v; });
    $("backBtn").hidden = v === "home";
    $("zukanBtn").hidden = v === "zukan";
    if (v !== "course") {
      document.documentElement.style.setProperty("--accent", "#c92a2a");
      $("titleEmoji").textContent = v === "zukan" ? "📖" : "🔬";
      $("titleText").textContent = v === "zukan" ? "からだ ずかん" : "からだ たんけん";
    }
  }
  function updateSoundBtn() {
    $("soundBtn").textContent = save.sound ? "🔊" : "🔇";
    $("soundBtn").setAttribute("aria-pressed", save.sound ? "true" : "false");
  }
  $("soundBtn").addEventListener("click", function () {
    save.sound = !save.sound; persist(); updateSoundBtn();
    if (save.sound) { Sound.unlock(); Sound.tap(); }
  });
  $("backBtn").addEventListener("click", function () {
    Sound.tap();
    if (view === "course") stopGame();
    renderHome(); show("home");
  });
  $("zukanBtn").addEventListener("click", function () {
    Sound.tap();
    if (view === "course") stopGame();
    renderZukan(); show("zukan");
  });
  document.addEventListener("pointerdown", function () { if (save.sound) Sound.unlock(); }, { once: true });

  var toastTimer = 0;
  function toast(html) {
    var t = $("toast"); t.innerHTML = html; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }
  function wordCount() { return Object.keys(D.WORDS).filter(function (k) { return save.words[k]; }).length; }
  function updateCounts() { $("wordCount").textContent = wordCount(); }

  /* ---------- ホーム ---------- */
  function renderHome() {
    var hots = D.COURSES.map(function (c) {
      return { x: c.hot[0], y: c.hot[1], color: c.color, e: c.emoji, label: c.name };
    });
    $("bodySvg").innerHTML = A.body({ hots: hots, label: "からだの ず" });
    Array.prototype.forEach.call($("bodySvg").querySelectorAll(".hot"), function (h) {
      h.addEventListener("click", function () { startCourse(+h.getAttribute("data-course")); });
    });
    var list = $("courseList"); list.innerHTML = "";
    D.COURSES.forEach(function (c, i) {
      var b = document.createElement("button");
      b.className = "course"; b.style.setProperty("--color", c.color); b.style.setProperty("--tint", c.tint);
      b.setAttribute("data-course", i);
      var got = !!save.badges[c.id];
      b.innerHTML = '<span class="ce" aria-hidden="true">' + c.emoji + "</span><span><span class=\"cn\">" + (i + 1) + ". " + c.name +
        '</span><span class="cs">' + rb(c.desc) + '</span></span><span class="cbadge' + (got ? "" : " off") + '"><span>🏅</span>' + (got ? "クリア" : c.scenes.length + "ばめん") + "</span>";
      b.addEventListener("click", function () { startCourse(i); });
      list.appendChild(b);
    });
    var row = $("badgeRow"), n = 0; row.innerHTML = "";
    D.COURSES.forEach(function (c) {
      var got = !!save.badges[c.id]; if (got) n++;
      row.insertAdjacentHTML("beforeend", '<div class="badge' + (got ? " got" : "") + '"><span class="be">' + c.badge.e + "</span>" + c.badge.name + "</div>");
    });
    row.insertAdjacentHTML("beforeend", '<div class="badge grand' + (n === D.COURSES.length ? " got" : "") + '"><span class="be">🎓</span>' +
      (n === D.COURSES.length ? "きみは からだ はかせ！" : "3つ あつめると からだ はかせ") + "</div>");
    updateCounts();
  }

  /* ---------- ずかん ---------- */
  function renderZukan() {
    var html = "", total = Object.keys(D.WORDS).length;
    D.COURSES.forEach(function (c, ci) {
      html += '<section class="zgroup"><h2>' + c.emoji + " " + c.name + '</h2><div class="zgrid">';
      Object.keys(D.WORDS).forEach(function (k) {
        var w = D.WORDS[k]; if (w.c !== ci) return;
        if (save.words[k]) html += '<div class="zcard" data-word="' + k + '"><div class="ze">' + w.e + '</div><div class="zn">' + rb(w.name) + '</div><div class="zd">' + rb(w.desc) + "</div></div>";
        else html += '<div class="zcard lock"><div><div class="ze">' + w.e + "</div>？？？<br><small>" + c.name + " で みつかるよ</small></div></div>";
      });
      html += "</div></section>";
    });
    $("zukanList").innerHTML = html;
    $("zukanCount").textContent = wordCount() + " / " + total;
  }

  /* ---------- コース ---------- */
  function startCourse(ci) {
    Sound.unlock(); Sound.tap();
    var c = D.COURSES[ci];
    run = { ci: ci, si: 0, flags: {}, game: null };
    var root = document.documentElement;
    root.style.setProperty("--c-color", c.color); root.style.setProperty("--c-tint", c.tint);
    root.style.setProperty("--accent", c.color);
    $("titleEmoji").textContent = c.emoji;
    $("titleText").textContent = c.name;
    show("course");
    var sh = $("shrink"); sh.hidden = false;
    sh.style.animation = "none"; void sh.offsetWidth; sh.style.animation = "";
    var kid = sh.querySelector(".shrink-kid"); kid.style.animation = "none"; void kid.offsetWidth; kid.style.animation = "";
    Sound.unlock();
    tone2();
    setTimeout(function () { sh.hidden = true; }, 1500);
    showScene(0, { travel: true, delay: 1.5 });
  }
  function tone2() { Sound.pop(); setTimeout(Sound.pop, 180); setTimeout(Sound.pop, 360); }

  function stopGame() {
    if (run && run.game) { run.game.dispose(); run.game = null; }
    if (travelDone) { travelDone = null; clearTimeout(travelTimer); $("travel").hidden = true; }
  }

  function routeOf(c) { return c.scenes.map(function (s) { return s.map; }); }
  function mapSvg(c, si, extra) {
    var o = { focus: c.scenes[si].org, dot: c.scenes[si].map, route: routeOf(c), step: si, color: c.color };
    for (var k in extra) o[k] = extra[k];
    return A.body(o);
  }
  /* からだマップを おおきく だす（つぎの ばめんへ いどう／マップを タップ） */
  var travelTimer = 0, travelDone = null;
  function showTravel(svgHtml, cap, ms, then) {
    var tr = $("travel");
    $("tmap").innerHTML = svgHtml; $("tcap").innerHTML = rb(cap);
    tr.hidden = false;
    clearTimeout(travelTimer);
    travelDone = function () { clearTimeout(travelTimer); tr.hidden = true; var f = then; travelDone = null; if (f) f(); };
    travelTimer = setTimeout(travelDone, ms);
  }
  $("travel").addEventListener("pointerdown", function (e) { e.preventDefault(); if (travelDone) travelDone(); });
  $("wmap").addEventListener("click", function () {
    if (!run || travelDone) return;
    Sound.tap();
    var c = D.COURSES[run.ci];
    showTravel(mapSvg(c, run.si, { kid: 22 }), "📍 いま ここ： " + c.scenes[run.si].place, 2500, null);
  });

  function showScene(si, opt) {
    opt = opt || {};
    stopGame();
    if (travelDone) { travelDone = null; clearTimeout(travelTimer); $("travel").hidden = true; }
    var c = D.COURSES[run.ci], sc = c.scenes[si];
    var prev = si > 0 ? c.scenes[si - 1] : null;
    run.si = si;
    $("wmap").innerHTML = mapSvg(c, si);
    $("wplace").innerHTML = rb(sc.place);
    $("picon").textContent = sc.icon;
    // すすみぐあい
    var prog = $("prog"); prog.innerHTML = "";
    c.scenes.forEach(function (s, i) {
      var li = document.createElement("li");
      li.textContent = s.icon;
      li.className = i < si ? "done" : i === si ? "now" : "";
      li.setAttribute("aria-label", plain(s.place) + (i < si ? " おわり" : i === si ? " いま" : ""));
      prog.appendChild(li);
    });
    $("place").innerHTML = rb(sc.place);
    $("intro").innerHTML = rb(sc.intro);
    $("choices").innerHTML = "";
    $("result").hidden = true; $("result").innerHTML = "";
    $("facts").hidden = true; $("facts").innerHTML = "";
    $("newWords").hidden = true; $("newWords").innerHTML = "";
    $("nextBtn").hidden = true;
    $("talkBody").scrollTop = 0;
    $("ctl").innerHTML = "";
    $("bubble").hidden = true;
    var art = A.scene[sc.art]();
    $("stageSvg").innerHTML = A.svg(art.vb, art.svg);
    var stage = $("stage");
    stage.setAttribute("data-game", sc.game.type);
    stage.setAttribute("data-scene", sc.id);
    stage.removeAttribute("data-done");
    stage.setAttribute("data-hit", "0");
    var ctx = makeCtx(sc, art);
    run.game = ctx;
    function go() { if (run && run.game === ctx) GAMES[sc.game.type](ctx); }
    if (!opt.travel) { go(); return; }
    var same = prev && prev.org === sc.org;
    var cap = !prev ? "たんけん スタート！ まずは " + sc.place + " から" :
      same ? sc.place + " で つぎの ミッション！" : "つぎは " + sc.place + " へ！";
    showTravel(mapSvg(c, si, { from: prev && !same ? prev.map : null, kid: 26, begin: opt.delay || 0 }), cap,
      (opt.delay || 0) * 1000 + (same ? 1300 : 1900), go);
  }

  function makeCtx(sc, art) {
    var rafId = 0, timers = [], listeners = [], finished = false, bubbleTimer = 0;
    var svgEl = $("stageSvg").querySelector("svg"), stage = $("stage");
    var ctx = {
      scene: sc, g: sc.game, art: art, svg: svgEl, stage: stage, flags: run.flags, ctl: $("ctl"),
      $: function (id) { return svgEl.querySelector("#" + id); },
      loop: function (fn) {
        var last = now();
        function step() { var t = now(); fn(t, Math.min(.05, t - last)); last = t; rafId = requestAnimationFrame(step); }
        rafId = requestAnimationFrame(step);
      },
      after: function (ms, fn) { timers.push(setTimeout(fn, ms)); },
      on: function (el, ev, fn, opt) { el.addEventListener(ev, fn, opt); listeners.push([el, ev, fn, opt]); },
      hit: function (on) { stage.setAttribute("data-hit", on ? "1" : "0"); },
      bubble: function (html, ms) {
        var b = $("bubble"); b.innerHTML = rb(html); b.hidden = false;
        b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
        clearTimeout(bubbleTimer);
        if (ms !== 0) bubbleTimer = setTimeout(function () { b.hidden = true; }, ms || 900);
      },
      pt: function (e) {
        var m = svgEl.getScreenCTM(); if (!m) return { x: 0, y: 0 };
        var p = svgEl.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
        p = p.matrixTransform(m.inverse());
        return { x: p.x, y: p.y };
      },
      isDone: function () { return finished; },
      finish: function (variant, html) {
        if (finished) return; finished = true;
        ctx.hit(false);
        stage.setAttribute("data-done", "1");
        var txt = html || (sc.done && (sc.done[variant] || sc.done.text)) || "";
        if (txt) { $("result").innerHTML = rb(txt); $("result").hidden = false; }
        if (sc.facts && sc.facts.length) {
          $("facts").innerHTML = sc.facts.map(function (f) { return "<li>" + rb(f) + "</li>"; }).join("");
          $("facts").hidden = false;
        }
        (sc.words || []).forEach(function (w) { learn(w); });
        showLearned(sc);
        Sound.good();
        $("nextBtn").hidden = false;
        $("nextBtn").textContent = run.si === D.COURSES[run.ci].scenes.length - 1 ? "ゴール！ ▶" : "つぎへ ▶";
        setTimeout(function () { var tb = $("talkBody"); tb.scrollTop = 0; }, 30);
      },
      dispose: function () {
        cancelAnimationFrame(rafId);
        timers.forEach(clearTimeout);
        listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
        clearTimeout(bubbleTimer);
      }
    };
    return ctx;
  }

  var learnedNow = [];
  function learn(id) {
    if (!D.WORDS[id]) return;
    if (learnedNow.indexOf(id) < 0) learnedNow.push(id);
    if (save.words[id]) return;
    save.words[id] = 1; persist(); updateCounts();
    Sound.word();
    toast("📖 ずかんに とうろく！ " + rb(D.WORDS[id].name));
  }
  function showLearned(sc) {
    var ids = (sc.words || []).slice();
    if (sc.game.spots) sc.game.spots.forEach(function (s) { if (ids.indexOf(s.word) < 0) ids.push(s.word); });
    if (!ids.length) return;
    $("newWords").innerHTML = "📖 おぼえた ことば：" + ids.map(function (id) { return "<span>" + rb(D.WORDS[id].name) + "</span>"; }).join("");
    $("newWords").hidden = false;
  }

  $("nextBtn").addEventListener("click", function () {
    Sound.tap();
    var c = D.COURSES[run.ci];
    if (run.si < c.scenes.length - 1) showScene(run.si + 1, { travel: true });
    else finishCourse();
  });

  function finishCourse() {
    stopGame();
    var c = D.COURSES[run.ci];
    var first = !save.badges[c.id];
    save.badges[c.id] = 1;
    save.clears[c.id] = (save.clears[c.id] | 0) + 1;
    persist();
    Sound.clear();
    var body = '<div class="big-badge">' + c.badge.e + "</div>" +
      '<div class="bname">🏅 ' + c.badge.name + "</div>";
    if (run.ci === 0) {
      var e = D.ending(run.flags);
      body += '<p class="end-title">' + rb(e.title) + '</p><div class="poop">' + A.svg("-60 -40 120 80", A.poop(e.poop)) + "</div><p>" + rb(e.text) + "</p>";
    }
    var all = D.COURSES.every(function (x) { return save.badges[x.id]; });
    body += "<p>ずかんの ことば：<b>" + wordCount() + "</b> / " + Object.keys(D.WORDS).length + "</p>";
    if (all) body += '<p class="end-title">🎓 バッジが 3つ そろった！ きみは からだ はかせ！</p>';
    openModal(first ? "からだ はかせ バッジ ゲット！" : "コース クリア！", body, [
      { label: "🏠 メニューへ", id: "mHome", fn: function () { renderHome(); show("home"); } },
      { label: "📖 ずかん", id: "mZukan", sub: true, fn: function () { renderZukan(); show("zukan"); } }
    ]);
  }

  function openModal(title, body, btns) {
    $("mTitle").innerHTML = title; $("mBody").innerHTML = body;
    var box = $("mBtns"); box.innerHTML = "";
    btns.forEach(function (b) {
      var el = document.createElement("button");
      el.className = "big-btn" + (b.sub ? " sub" : ""); el.id = b.id; el.textContent = b.label;
      el.addEventListener("click", function () { Sound.tap(); $("modal").hidden = true; b.fn(); });
      box.appendChild(el);
    });
    $("modal").hidden = false;
  }

  /* ============================================================
     ミニゲーム
     ============================================================ */
  var GAMES = {};

  /* --- くち: タイミングよく かむ --- */
  GAMES.chew = function (ctx) {
    var g = ctx.g, svg = ctx.svg, food = ctx.$("food"), spit = ctx.$("spit");
    var top = ctx.$("teethTop"), bot = ctx.$("teethBot");
    var chews = 0, miss = 0, bite = 0, zw = .26, inZone = false, gulped = false, t0 = now();
    var meter = mk("g", {}, svg);
    mk("rect", { x: 56, y: 280, width: 288, height: 26, rx: 13, fill: "#fff", stroke: "#e8590c", "stroke-width": 3 }, meter);
    var zone = mk("rect", { y: 283, height: 20, rx: 10, fill: "#8ce99a" }, meter);
    var cur = mk("rect", { y: 274, width: 12, height: 38, rx: 6, fill: "#e8590c", stroke: "#fff", "stroke-width": 2 }, meter);
    function setZone() { zone.setAttribute("x", 60 + (0.5 - zw / 2) * 280); zone.setAttribute("width", zw * 280); }
    setZone();
    ctx.ctl.innerHTML = '<span class="counter">かんだ かいすう <b id="chewN">0</b> / ' + g.goal + '</span><button class="big-btn sub" id="gulpBtn" hidden>ごっくん！</button>';
    var gulpBtn = $("gulpBtn");

    function drawFood() {
      var s = "";
      if (chews === 0) {
        s = '<path d="M200 92 Q214 92 252 162 Q260 182 238 182 L162 182 Q140 182 148 162 Q186 92 200 92Z" fill="#fff" stroke="#dee2e6" stroke-width="3"/>' +
          '<rect x="168" y="150" width="64" height="32" rx="4" fill="#2f3e2f"/>' +
          '<circle cx="188" cy="130" r="4" fill="#333"/><circle cx="212" cy="130" r="4" fill="#333"/><path d="M193 140 Q200 146 207 140" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
      } else {
        var n = Math.min(3 + chews * 2, 22), r = Math.max(7, 24 - chews * 2.2), sweet = Math.min(1, chews / g.goal);
        var col = sweet > .6 ? "#fff0f6" : "#fff";
        for (var i = 0; i < n; i++) {
          var a = i * 2.39996, rr = 14 + (i % 5) * 11 + (i * 7 % 13);
          var x = 200 + Math.cos(a) * rr * 1.5, y = 146 + Math.sin(a) * rr * .65;
          s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (r * (0.8 + (i % 3) * .15)).toFixed(1) + '" fill="' + col + '" stroke="#dee2e6" stroke-width="2"/>';
          if (i % 4 === 1) s += '<rect x="' + (x - 4).toFixed(1) + '" y="' + (y - 3).toFixed(1) + '" width="' + (r * .7).toFixed(1) + '" height="' + (r * .5).toFixed(1) + '" fill="#2f3e2f" rx="1.5"/>';
        }
        if (sweet >= .5) s += '<text x="268" y="112" font-size="26">✨</text><text x="118" y="190" font-size="20">✨</text>';
      }
      food.innerHTML = s;
    }
    drawFood();

    function doGulp() {
      if (gulped) return; gulped = true;
      ctx.flags.well = chews >= g.goal; ctx.flags.chews = chews;
      gulpBtn.hidden = true;
      Sound.gulp();
      food.style.transition = "transform .6s ease-in, opacity .6s";
      food.style.transformOrigin = "200px 146px";
      food.style.transform = "translate(0px,-70px) scale(.2)"; food.style.opacity = "0";
      ctx.bubble("ごっくん！", 1200);
      meter.style.opacity = ".3";
      ctx.after(650, function () { ctx.finish(ctx.flags.well ? "well" : "quick"); });
    }
    ctx.on(gulpBtn, "click", function (e) { e.stopPropagation(); doGulp(); });
    ctx.on(svg, "pointerdown", function (e) {
      e.preventDefault();
      if (gulped) return;
      bite = 1;
      Sound.chew();
      if (inZone) {
        chews++; miss = 0;
        $("chewN").textContent = chews;
        ctx.bubble(chews >= g.goal ? "よく かめた！" : "かみっ！ " + chews, 700);
        mk("circle", { cx: 120 + Math.random() * 160, cy: 200 + Math.random() * 30, r: 5, fill: "#a5d8ff", opacity: ".9" }, spit);
        if (spit.childNodes.length > 10) spit.removeChild(spit.firstChild);
        drawFood();
        if (chews >= g.min) gulpBtn.hidden = false;
        if (chews >= g.goal) ctx.after(500, doGulp);
      } else {
        miss++;
        ctx.bubble("みどりの ときに タップ！", 800);
        if (miss >= 3 && zw < .5) { zw += .08; setZone(); }
      }
    });
    ctx.loop(function (t) {
      var ph = ((t - t0) % 1.7) / 1.7, pos = .5 - .5 * Math.cos(ph * Math.PI * 2);
      cur.setAttribute("x", 60 + pos * 280 - 6);
      inZone = !gulped && Math.abs(pos - .5) <= zw / 2 - .015;
      ctx.hit(inZone);
      zone.setAttribute("fill", inZone ? "#40c057" : "#8ce99a");
      bite = Math.max(0, bite - .12);
      var b = Math.sin(bite * Math.PI / 2);
      bot.setAttribute("transform", "translate(0 " + (-58 * b).toFixed(1) + ")");
      top.setAttribute("transform", "translate(0 " + (40 * b).toFixed(1) + ")");
    });
  };

  /* --- えらぶ（ぶんき・クイズ） --- */
  GAMES.choice = function (ctx) {
    var g = ctx.g, box = $("choices");
    $("intro").innerHTML = rb(ctx.scene.intro) + "<br><b>" + rb(g.question) + "</b>";
    g.options.forEach(function (o, i) {
      var b = document.createElement("button");
      b.className = "choice"; b.innerHTML = rb(o.label);
      b.setAttribute("data-opt", i);
      if (o.correct) b.setAttribute("data-correct", "1");
      ctx.on(b, "click", function () {
        if (ctx.isDone()) return;
        if (g.quiz) {
          if (o.correct) {
            b.classList.add("ok");
            Array.prototype.forEach.call(box.children, function (x) { x.disabled = true; });
            ctx.finish(null, o.reply);
          } else {
            b.classList.add("ng"); b.disabled = true;
            Sound.miss();
            $("result").innerHTML = rb(o.reply); $("result").hidden = false;
          }
        } else {
          for (var k in o.set) ctx.flags[k] = o.set[k];
          b.classList.add("ok");
          Array.prototype.forEach.call(box.children, function (x) { x.disabled = true; });
          if (o.set && o.set.water) {
            var w = ctx.svg.querySelector("path:nth-of-type(3)");
            if (w) { w.style.transition = "transform 1s"; w.style.transformOrigin = "200px 270px"; w.style.transform = "scaleY(.35)"; }
            Sound.gulp();
          }
          ctx.finish(null, o.reply);
        }
      });
      box.appendChild(b);
    });
  };

  /* --- しょくどう: なみに あわせて おしすすめる --- */
  GAMES.push = function (ctx) {
    var g = ctx.g, f = ctx.flags;
    var need = g.base + (f.well === false ? g.bigLump : 0) + (f.water === false ? g.dry : 0);
    var R = f.well === false ? 30 : 19, period = 60 / g.bpm, win = .2;
    var walls = ctx.$("walls"), eso = ctx.$("eso");
    var lumen = mk("path", { fill: "#fff0f0" }, walls);
    var bands = mk("g", { stroke: "#ff8787", "stroke-width": 2, opacity: ".6" }, walls);
    for (var yy = 10; yy < 300; yy += 22) mk("path", { d: "M100 " + yy + " L124 " + (yy + 4) + " M200 " + yy + " L176 " + (yy + 4) }, bands);
    var cue = mk("circle", { fill: "none", stroke: "#e8590c", "stroke-width": 4, "stroke-dasharray": "8 6" }, eso);
    var bolus = mk("g", {}, eso);
    var lumpCol = f.well === false ? "#f1e3c6" : "#fff4e0";
    bolus.innerHTML = '<circle r="' + R + '" fill="' + lumpCol + '" stroke="#d9a066" stroke-width="3"/>' +
      '<circle cx="-6" cy="-3" r="2.6" fill="#5c3a24"/><circle cx="6" cy="-3" r="2.6" fill="#5c3a24"/><path d="M-5 5 Q0 9 5 5" stroke="#5c3a24" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      (f.water ? '<g fill="#74c0fc"><circle cx="' + (R + 2) + '" cy="-8" r="4"/><circle cx="' + (-R - 3) + '" cy="6" r="3.5"/><circle cx="4" cy="' + (R + 3) + '" r="3"/></g>' : "");
    var pushes = 0, by = 42, ty = 42, t0 = now() + .6, lastBeat = -1, miss = 0, stuckShown = false;
    ctx.ctl.innerHTML = '<span class="counter">のこり <b id="pushN">' + need + "</b> かい</span>" +
      (f.well === false ? '<span class="counter">⚠️ かたまりが おおきい</span>' : "") +
      (f.water === false ? '<span class="counter">🏜️ おみず なし</span>' : "");
    function gauss(x, s) { return Math.exp(-(x * x) / (2 * s * s)); }
    ctx.on(ctx.svg, "pointerdown", function (e) {
      e.preventDefault();
      if (ctx.isDone()) return;
      var t = now() - t0, k = Math.round(t / period), dt = Math.abs(t - k * period);
      if (t > -win && dt <= win && k !== lastBeat) {
        lastBeat = k; pushes++; miss = 0;
        ty = 42 + (pushes / need) * 218;
        Sound.push();
        $("pushN").textContent = need - pushes;
        if (f.well === false && !stuckShown && pushes === 2) { stuckShown = true; ctx.bubble("う〜ん、つかえそう……！", 1100); }
        else ctx.bubble("ぎゅっ！", 600);
        if (pushes >= need) ctx.after(700, function () { ctx.finish(need > g.base ? "slow" : "smooth"); });
      } else {
        miss++; Sound.miss();
        ctx.bubble("わっかが ちいさく なったら タップ！", 900);
        if (miss >= 4) win = .3;
      }
    });
    ctx.loop(function (tt, dt) {
      var t = tt - t0, ph = ((t % period) + period) % period / period;
      var dist = Math.min(ph, 1 - ph) * period;
      var amp = gauss(dist, .09);
      by += (ty - by) * Math.min(1, dt * 7);
      var sy = by - R - 16;
      var L = "", Rr = "";
      for (var y = -10; y <= 310; y += 8) {
        var bul = (R - 18 + 6) * gauss(y - by, R * .9), sq = 17 * amp * gauss(y - sy, 13);
        L += (y === -10 ? "M" : " L") + (128 - bul + sq).toFixed(1) + " " + y;
        Rr = " L" + (172 + bul - sq).toFixed(1) + " " + y + Rr;
      }
      lumen.setAttribute("d", L + Rr + " Z");
      bolus.setAttribute("transform", "translate(150 " + by.toFixed(1) + ")");
      var open = !ctx.isDone() && t > -win && dist <= win;
      ctx.hit(open && Math.round(t / period) !== lastBeat);
      var approach = ph > .45 ? (1 - ph) / .55 : 0;
      cue.setAttribute("cx", 150); cue.setAttribute("cy", sy);
      cue.setAttribute("r", (14 + approach * 50).toFixed(1));
      cue.setAttribute("opacity", ctx.isDone() ? 0 : (ph > .45 || ph < .08) ? 1 : .15);
      cue.setAttribute("stroke", open ? "#2f9e44" : "#e8590c");
    });
  };

  /* --- い: ぐるぐる かきまぜる --- */
  GAMES.stir = function (ctx) {
    var g = ctx.g, f = ctx.flags, c = ctx.art.center;
    var need = f.well === false ? g.turnsBig : g.turns, acc = 0, total = Math.PI * 2 * need;
    var stuff = ctx.$("stuff"), juice = ctx.$("juice"), guide = ctx.$("guide");
    var base = mk("ellipse", { cx: c[0], cy: c[1] + 10, rx: 130, ry: 100, fill: "#f4b860", opacity: 0 }, stuff);
    var lumpG = mk("g", {}, stuff), lumps = [];
    var n = f.well === false ? 9 : 16, r0 = f.well === false ? 24 : 13;
    for (var i = 0; i < n; i++) {
      var a = i * 2.39996, rr = 18 + (i % 4) * 22;
      lumps.push(mk("circle", { cx: c[0] + Math.cos(a) * rr * 1.3, cy: c[1] + Math.sin(a) * rr, r: r0, fill: i % 3 ? "#fff4e0" : "#f1e3c6", stroke: "#d9a066", "stroke-width": 2 }, lumpG));
    }
    mk("circle", { cx: c[0], cy: c[1], r: 72, fill: "none", stroke: "#e8590c", "stroke-width": 3, "stroke-dasharray": "6 8", opacity: .7 }, guide);
    mk("path", { d: "M" + (c[0] + 72) + " " + (c[1] - 6) + " l-9 -10 m9 10 l9 -9", stroke: "#e8590c", "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, guide);
    var finger = mk("text", { "font-size": 34, "text-anchor": "middle" }, guide); finger.textContent = "👆";
    ctx.ctl.innerHTML = '<span class="counter">どろどろ ど <b id="stirN">0</b>%</span>';
    var down = false, last = null, moved = 0, lastSlosh = 0, spawnT = 0;
    function add(d) {
      acc += d;
      var p = Math.min(1, acc / total);
      $("stirN").textContent = Math.floor(p * 100);
      if (acc - lastSlosh > Math.PI / 2) { lastSlosh = acc; Sound.slosh(); }
      if (p >= 1 && !ctx.isDone()) { ctx.bubble("どろどろ〜！", 1000); ctx.after(400, function () { ctx.finish(need > g.turns ? "slow" : "smooth"); }); }
    }
    ctx.on(ctx.svg, "pointerdown", function (e) {
      e.preventDefault(); down = true; moved = 0;
      try { ctx.svg.setPointerCapture(e.pointerId); } catch (er) {}
      var p = ctx.pt(e); last = Math.atan2(p.y - c[1], p.x - c[0]);
    });
    ctx.on(ctx.svg, "pointermove", function (e) {
      if (!down || ctx.isDone()) return;
      var p = ctx.pt(e), dx = p.x - c[0], dy = p.y - c[1];
      if (dx * dx + dy * dy < 200) return;
      var a = Math.atan2(dy, dx), d = a - last;
      if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
      last = a;
      if (Math.abs(d) < 1.2) { moved += Math.abs(d); add(Math.abs(d)); }
    });
    function up() {
      if (!down) return; down = false;
      if (moved < .15 && !ctx.isDone()) { add(Math.PI / 4); ctx.bubble("ぐるぐる なぞると はやいよ！", 900); }
    }
    ctx.on(ctx.svg, "pointerup", up); ctx.on(ctx.svg, "pointercancel", up);
    ctx.loop(function (t, dt) {
      var p = Math.min(1, acc / total);
      lumpG.setAttribute("transform", "rotate(" + (acc * 57.3).toFixed(1) + " " + c[0] + " " + c[1] + ")");
      lumps.forEach(function (l, i) { l.setAttribute("r", (r0 * (1 - p * .85) + (i % 3)).toFixed(1)); l.setAttribute("opacity", (1 - p * .7).toFixed(2)); });
      base.setAttribute("opacity", (p * .95).toFixed(2));
      if (acc < Math.PI * 2) {
        var fa = t * 2.4; finger.setAttribute("x", c[0] + Math.cos(fa) * 72); finger.setAttribute("y", c[1] + Math.sin(fa) * 72 + 12);
      } else guide.setAttribute("opacity", 0);
      spawnT -= dt;
      if (spawnT <= 0 && !ctx.isDone()) {
        spawnT = .5;
        var ang = Math.random() * Math.PI * 2;
        var d = mk("text", { x: c[0] + Math.cos(ang) * 105, y: c[1] + Math.sin(ang) * 80, "font-size": 16, "text-anchor": "middle" }, juice);
        d.textContent = "💧"; d.style.filter = "hue-rotate(-120deg)";
        d.setAttribute("data-life", 1);
        d.setAttribute("data-ang", ang);
      }
      Array.prototype.slice.call(juice.childNodes).forEach(function (d) {
        var life = +d.getAttribute("data-life") - dt * .9, ang = +d.getAttribute("data-ang");
        if (life <= 0) { juice.removeChild(d); return; }
        d.setAttribute("data-life", life);
        d.setAttribute("x", c[0] + Math.cos(ang) * (40 + 65 * life)); d.setAttribute("y", c[1] + Math.sin(ang) * (30 + 50 * life));
        d.setAttribute("opacity", Math.min(1, life * 2).toFixed(2));
      });
    });
  };

  /* --- しょうちょう: えいようを けつえきへ --- */
  GAMES.nutrient = function (ctx) {
    var g = ctx.g, parts = ctx.$("parts"), cells = ctx.$("cells");
    var spawned = 0, got = 0, list = [], COLORS = ["#ffd43b", "#ff922b", "#69db7c", "#ffa8a8"];
    ctx.ctl.innerHTML = '<span class="counter">わたした えいよう <b id="nutN">0</b> / ' + g.count + "</span>";
    var cellList = [];
    for (var i = 0; i < 9; i++) cellList.push(mk("ellipse", { cx: i * 50, cy: 267, rx: 11, ry: 7, fill: "#c92a2a", stroke: "#ff8787", "stroke-width": 2 }, cells));
    function spawn() {
      if (spawned >= g.count) return;
      var id = spawned++;
      var x = 40 + Math.random() * 320, y = 40 + Math.random() * 100;
      var el = mk("g", { class: "np", "data-np": id }, parts);
      el.innerHTML = '<circle r="24" fill="transparent"/><circle r="14" fill="' + COLORS[id % 4] + '" stroke="#fff" stroke-width="3"/><text y="5" font-size="13" text-anchor="middle">✨</text>';
      var o = { el: el, x: x, y: y, vx: (Math.random() - .5) * 30, vy: (Math.random() - .5) * 20, mode: "float", ph: Math.random() * 6 };
      list.push(o);
      ctx.on(el, "pointerdown", function (e) {
        e.preventDefault(); e.stopPropagation();
        if (o.mode !== "float") return;
        o.mode = "go"; o.tx = Math.round((o.x - 14) / 32) * 32 + 14; o.tx = clamp(o.tx, 14, 398);
        Sound.pop();
        el.removeAttribute("data-np");
      });
    }
    for (var k = 0; k < 4; k++) spawn();
    ctx.loop(function (t, dt) {
      cellList.forEach(function (c2) { var x = (+c2.getAttribute("cx") + dt * 60) % 450; c2.setAttribute("cx", x); });
      list.forEach(function (o) {
        if (o.mode === "float") {
          o.x += o.vx * dt; o.y += o.vy * dt + Math.sin(t * 2 + o.ph) * .2;
          if (o.x < 24 || o.x > 376) o.vx *= -1; if (o.y < 26 || o.y > 150) o.vy *= -1;
        } else if (o.mode === "go") {
          o.x += (o.tx - o.x) * Math.min(1, dt * 6); o.y += 260 * dt;
          if (o.y >= 267) { o.y = 267; o.mode = "flow"; got++; $("nutN").textContent = got; ctx.bubble("けつえきに のった！", 700); spawn(); if (got >= g.count) ctx.after(700, done); }
        } else if (o.mode === "flow") {
          o.x += 140 * dt; if (o.x > 430) { o.mode = "gone"; o.el.setAttribute("opacity", 0); }
        }
        o.el.setAttribute("transform", "translate(" + o.x.toFixed(1) + " " + o.y.toFixed(1) + ")" + (o.mode === "flow" ? " scale(.6)" : ""));
      });
    });
    function done() {
      // でんしゃ 1りょう と くらべる
      var s = '<g class="compare"><rect x="0" y="0" width="400" height="300" fill="#fffdf7" opacity=".97"/>' +
        '<text x="200" y="38" font-size="22" font-weight="800" text-anchor="middle" fill="#c92a2a">しょうちょう は およそ 6m</text>' +
        '<g transform="translate(20 70)"><rect width="360" height="64" rx="10" fill="#e9ecef" stroke="#495057" stroke-width="3"/>' +
        '<rect y="44" width="360" height="8" fill="#20c997"/>';
      for (var w = 0; w < 7; w++) s += '<rect x="' + (14 + w * 50) + '" y="10" width="34" height="26" rx="4" fill="#a5d8ff" stroke="#495057" stroke-width="2"/>';
      s += '<circle cx="50" cy="70" r="8" fill="#495057"/><circle cx="90" cy="70" r="8" fill="#495057"/><circle cx="270" cy="70" r="8" fill="#495057"/><circle cx="310" cy="70" r="8" fill="#495057"/>' +
        '<text x="180" y="100" font-size="15" font-weight="800" text-anchor="middle" fill="#495057">でんしゃ 1りょう（およそ 20m）</text></g>' +
        '<g transform="translate(20 196)"><path d="M0 0 L108 0" stroke="#ff922b" stroke-width="14" stroke-linecap="round"/>' +
        '<path d="M0 -14 L0 14 M108 -14 L108 14" stroke="#c92a2a" stroke-width="3"/>' +
        '<text x="122" y="6" font-size="15" font-weight="800" fill="#e8590c">← しょうちょう（3ぶんの1 くらい）</text>' +
        '<text x="0" y="50" font-size="19">🧒🧒🧒🧒🧒</text><text x="122" y="46" font-size="15" font-weight="800" fill="#495057">きみが 5〜6にん ぶん</text></g></g>';
      ctx.svg.insertAdjacentHTML("beforeend", s);
      var cmp = ctx.svg.lastChild; cmp.style.opacity = 0; cmp.style.transition = "opacity .5s";
      requestAnimationFrame(function () { cmp.style.opacity = 1; });
      ctx.finish();
    }
  };

  /* --- だいちょう: みずを すいとる → うんち → ぷっ --- */
  GAMES.absorb = function (ctx) {
    var g = ctx.g, f = ctx.flags, path = ctx.$("colonPath"), L = path.getTotalLength();
    var need = f.water === false ? g.dropsDry : g.drops, got = 0;
    var drops = ctx.$("drops"), mass = ctx.$("mass"), poopG = ctx.$("poop");
    ctx.ctl.innerHTML = '<span class="counter">すいとった みず <b id="dropN">0</b> / ' + need + '</span><button class="big-btn sub" id="fartBtn" aria-pressed="' + save.fart + '">💨 おならの おと ' + (save.fart ? "オン" : "オフ") + "</button>";
    ctx.on($("fartBtn"), "click", function () {
      save.fart = !save.fart; persist();
      this.textContent = "💨 おならの おと " + (save.fart ? "オン" : "オフ"); this.setAttribute("aria-pressed", save.fart);
      if (save.fart) Sound.fart();
    });
    var blobs = [];
    for (var i = 0; i < 7; i++) blobs.push({ el: mk("circle", { r: 16, fill: "#c99a6b", opacity: .85 }, mass), s: i * 28 });
    var list = [];
    for (var k = 0; k < need; k++) {
      var at = L * (.12 + .74 * (k + .5) / need), p = path.getPointAtLength(at), p2 = path.getPointAtLength(Math.min(L, at + 1));
      var nx = -(p2.y - p.y), ny = p2.x - p.x, nl = Math.sqrt(nx * nx + ny * ny) || 1;
      var off = (k % 2 ? 12 : -12);
      var el = mk("g", { class: "drop", "data-drop": k, transform: "translate(" + (p.x + nx / nl * off).toFixed(1) + " " + (p.y + ny / nl * off).toFixed(1) + ")" }, drops);
      el.innerHTML = '<circle r="24" fill="transparent"/><path d="M0 -16 Q12 0 10 6 Q8 15 0 15 Q-8 15 -10 6 Q-12 0 0 -16Z" fill="#4dabf7" stroke="#fff" stroke-width="2.5"/><circle cx="-3" cy="4" r="3" fill="#fff" opacity=".7"/>';
      (function (el, x, y, nx, ny) {
        ctx.on(el, "pointerdown", function (e) {
          e.preventDefault(); e.stopPropagation();
          if (el.getAttribute("data-drop") === null) return;
          el.removeAttribute("data-drop");
          Sound.drop(); got++; $("dropN").textContent = got;
          el.style.transition = "transform .7s ease-in, opacity .7s";
          var sgn = (x > 200) ? 1 : -1;
          el.setAttribute("transform", "translate(" + (x + 70 * sgn) + " " + (y - 30) + ") scale(.5)");
          el.style.opacity = 0;
          ctx.bubble("からだに もどった！", 700);
          if (got >= need) ctx.after(700, makePoop);
        });
      })(el, p.x, p.y, nx / nl, ny / nl);
      list.push(el);
    }
    var speed = 18;
    ctx.loop(function (t, dt) {
      var p = got / need;
      blobs.forEach(function (b, i) {
        b.s = (b.s + dt * speed) % (L * .9);
        var q = path.getPointAtLength(b.s);
        b.el.setAttribute("cx", q.x.toFixed(1)); b.el.setAttribute("cy", q.y.toFixed(1));
        b.el.setAttribute("fill", p > .7 ? "#8a5a3c" : p > .3 ? "#a87449" : "#c99a6b");
        b.el.setAttribute("r", (16 - p * 5).toFixed(1));
      });
    });
    function makePoop() {
      var e = D.ending(f);
      mass.setAttribute("opacity", .25);
      poopG.innerHTML = '<g transform="translate(200 150) scale(1.4)"><g class="bounce">' + A.poop(e.poop) + "</g></g>";
      var b = poopG.querySelector(".bounce");
      b.animate([{ transform: "translateY(-60px) scale(.3)" }, { transform: "translateY(6px) scale(1.1)" }, { transform: "none" }], { duration: 600, easing: "ease-out" });
      Sound.pop();
      ctx.bubble(e.poop === "koro" ? "コロコロ うんち……" : "バナナ うんち！", 1200);
      ctx.after(1100, function () {
        Sound.fart();
        var puff = mk("g", { transform: "translate(204 268)" }, poopG);
        puff.innerHTML = '<circle r="16" fill="#d8f5a2" opacity=".8"/><circle cx="16" cy="-6" r="11" fill="#d8f5a2" opacity=".8"/><circle cx="-14" cy="-8" r="10" fill="#d8f5a2" opacity=".8"/>' +
          '<text x="34" y="-14" font-size="24" font-weight="800" fill="#5c940d">ぷっ</text>';
        puff.animate([{ opacity: 0, transform: "translate(204px,268px) scale(.3)" }, { opacity: 1, transform: "translate(204px,262px) scale(1)" }], { duration: 400, fill: "forwards" });
        ctx.after(500, function () { ctx.finish(); });
      });
    }
  };

  /* --- はい: ながおしで いきを すう --- */
  GAMES.breathe = function (ctx) {
    var g = ctx.g, lungs = ctx.$("lungs"), air = ctx.$("air"), rbc = ctx.$("rbc");
    var v = 0, holding = false, phase = "idle", count = 0, spawnT = 0;
    var cells = [];
    for (var i = 0; i < g.count; i++) {
      var cg = mk("g", { transform: "translate(" + (34 + i * 34) + " 30)" }, rbc);
      cg.innerHTML = '<ellipse rx="13" ry="9" fill="#ffc9c9" stroke="#fa5252" stroke-width="2"/>';
      cells.push(cg);
    }
    mk("text", { x: 18, y: 60, "font-size": 12, "font-weight": 800, fill: "#c92a2a" }, rbc).textContent = "さんそを もった けつえき";
    ctx.ctl.innerHTML = '<button class="big-btn" id="holdBtn">😮 すう（ながおし）</button><span class="counter">いき <b id="brN">0</b> / ' + g.count + "</span>";
    var btn = $("holdBtn");
    function start(e) {
      e.preventDefault();
      if (ctx.isDone() || phase === "out") return;
      holding = true; phase = "in"; btn.classList.add("on");
      Sound.breathIn();
      ctx.bubble("すって〜", 0);
    }
    function end() {
      if (!holding) return;
      holding = false; btn.classList.remove("on");
      if (v >= .85) {
        phase = "out"; Sound.breathOut(); ctx.bubble("はいて〜", 900);
        var c = cells[count]; count++;
        if (c) c.innerHTML = '<ellipse rx="13" ry="9" fill="#e03131" stroke="#a51111" stroke-width="2"/><circle cx="6" cy="-8" r="5" fill="#74c0fc" stroke="#fff" stroke-width="1.5"/>';
        $("brN").textContent = count;
      } else {
        phase = "back"; ctx.bubble("もっと ながく すって！", 900); Sound.miss();
      }
    }
    ctx.on(btn, "pointerdown", start);
    ctx.on(ctx.svg, "pointerdown", start);
    ctx.on(window, "pointerup", end);
    ctx.on(window, "pointercancel", end);
    function dot(color, x, y, vy, label) {
      var d = mk("circle", { cx: x, cy: y, r: 6, fill: color, stroke: "#fff", "stroke-width": 1.5 }, air);
      d.setAttribute("data-vy", vy);
      return d;
    }
    ctx.loop(function (t, dt) {
      if (phase === "in" && holding) v = Math.min(1, v + dt / 1.2);
      else if (phase === "out" || phase === "back") {
        v = Math.max(0, v - dt / (phase === "out" ? 1.0 : .6));
        if (v <= 0) {
          phase = "idle";
          if (count >= g.count && !ctx.isDone()) ctx.finish();
        }
      }
      ctx.stage.setAttribute("data-full", v >= .85 ? "1" : "0");
      ctx.stage.setAttribute("data-phase", phase);
      lungs.style.transform = "scale(" + (1 + .13 * v).toFixed(3) + ")";
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = .12;
        if (phase === "in" && holding) dot("#4dabf7", 200 + (Math.random() - .5) * 10, 0, 160);
        if (phase === "out") dot("#adb5bd", 200 + (Math.random() - .5) * 10, 96, -160);
      }
      Array.prototype.slice.call(air.childNodes).forEach(function (d) {
        var vy = +d.getAttribute("data-vy"), y = +d.getAttribute("cy") + vy * dt;
        var x = +d.getAttribute("cx");
        if (vy > 0 && y > 96) { x += (x < 200 ? -1 : 1) * 70 * dt + (Math.random() - .5) * 2; }
        d.setAttribute("cy", y.toFixed(1)); d.setAttribute("cx", x.toFixed(1));
        if (y > 200 || y < -10) air.removeChild(d);
      });
    });
  };

  /* --- しんぞう: ドクンに あわせて タップ --- */
  GAMES.beat = function (ctx) {
    var g = ctx.g, period = 60 / g.bpm, win = Math.min(.2, period * .3);
    var heart = ctx.$("heartG"), cueG = ctx.$("cue"), flow = ctx.$("flow"), path = ctx.$("loopPath"), L = path.getTotalLength();
    var t0 = now() + 1.2, hits = 0, lastHit = -1, lastSound = -1, squeeze = 0, boost = 0, miss = 0;
    var cue = mk("circle", { cx: 200, cy: 160, fill: "none", "stroke-width": 6 }, cueG);
    mk("circle", { cx: 200, cy: 160, r: 92, fill: "none", stroke: "#ffa8a8", "stroke-width": 3, "stroke-dasharray": "4 6" }, cueG);
    var dots = [];
    for (var i = 0; i < 26; i++) dots.push({ el: mk("circle", { r: 7, stroke: "#fff", "stroke-width": 1.5 }, flow), s: i / 26 * L });
    if (g.run) { var rr = mk("text", { x: 26, y: 290, "font-size": 34 }, ctx.svg); rr.textContent = "🏃💦"; }
    ctx.ctl.innerHTML = '<span class="counter">ぴったり <b id="beatN">0</b> / ' + g.hits + '</span><span class="counter">♥ 1ぷんかんに ' + g.bpm + " かいの テンポ</span>";
    ctx.on(ctx.svg, "pointerdown", function (e) {
      e.preventDefault();
      if (ctx.isDone()) return;
      var t = now() - t0, k = Math.round(t / period), d = Math.abs(t - k * period);
      if (k >= 0 && d <= win && k !== lastHit) {
        lastHit = k; hits++; miss = 0; squeeze = 1; boost = 1;
        Sound.dokun(1);
        $("beatN").textContent = hits;
        ctx.bubble(hits >= g.hits ? "ばっちり！" : "ドクン！", 500);
        if (hits >= g.hits) ctx.after(600, function () { ctx.finish(); });
      } else {
        miss++; Sound.miss();
        ctx.bubble("わっかが かさなったら！", 800);
        if (miss >= 4) win = Math.min(.26, period * .4);
      }
    });
    ctx.loop(function (tt, dt) {
      var t = tt - t0, k = Math.round(t / period);
      // おてほんの ちいさな ドクン
      if (t >= -0.01 && Math.floor(t / period + 0.5) !== lastSound && Math.abs(t - k * period) < .03 && !ctx.isDone()) {
        lastSound = k; if (lastHit !== k) Sound.dokun(.35);
      }
      var ph = ((t % period) + period) % period / period;
      var approach = 1 - ph;
      var open = !ctx.isDone() && k >= 0 && Math.abs(t - k * period) <= win && k !== lastHit;
      ctx.hit(open);
      cue.setAttribute("r", (92 + approach * 70).toFixed(1));
      cue.setAttribute("stroke", open ? "#2f9e44" : "#f76707");
      cue.setAttribute("opacity", ctx.isDone() || t < -period ? 0 : .9);
      squeeze = Math.max(0, squeeze - dt * 5);
      heart.style.transform = "scale(" + (1 - .1 * Math.sin(squeeze * Math.PI)).toFixed(3) + ")";
      boost = Math.max(0, boost - dt * 2.5);
      var sp = (40 + 260 * boost) * (g.bpm / 80);
      dots.forEach(function (d) {
        d.s = (d.s + sp * dt) % L;
        var q = path.getPointAtLength(d.s);
        d.el.setAttribute("cx", q.x.toFixed(1)); d.el.setAttribute("cy", q.y.toFixed(1));
        d.el.setAttribute("fill", d.s < L / 2 ? "#e03131" : "#4c6ef5");
      });
    });
  };

  /* --- しらべる: ひかる ？ を タップ --- */
  GAMES.explore = function (ctx) {
    var g = ctx.g, layer = ctx.$("spots"), seen = 0;
    g.spots.forEach(function (s) {
      var el = mk("g", { class: "spot", "data-spot": s.id, role: "button", "aria-label": plain(s.label) }, layer);
      el.innerHTML = '<circle cx="' + s.x + '" cy="' + s.y + '" r="' + (s.r + 8) + '" fill="transparent"/>' +
        '<circle class="q" cx="' + s.x + '" cy="' + s.y + '" r="' + s.r + '" fill="none" stroke="#f59f00" stroke-width="4"/>' +
        '<circle class="mark" cx="' + s.x + '" cy="' + s.y + '" r="11" fill="#f59f00" stroke="#fff" stroke-width="2.5"/>' +
        '<text class="mt" x="' + s.x + '" y="' + (s.y + 5) + '" font-size="14" font-weight="800" fill="#fff" text-anchor="middle">？</text>';
      ctx.on(el, "pointerdown", function (e) {
        e.preventDefault();
        Sound.tap();
        $("result").innerHTML = "<b>" + rb(s.label) + "</b>：" + rb(s.text); $("result").hidden = false;
        learn(s.word);
        if (el.classList.contains("seen")) return;
        el.classList.add("seen"); seen++;
        el.querySelector(".mark").setAttribute("fill", "#40c057");
        el.querySelector(".mt").textContent = "✓";
        ctx.bubble(s.label, 1100);
        $("expN").textContent = seen;
        if (seen >= g.spots.length) ctx.after(900, function () {
          var last = $("result").innerHTML;
          ctx.finish();
          $("result").innerHTML = last + "<br>" + rb(ctx.scene.done.text);
        });
      });
    });
    ctx.ctl.innerHTML = '<span class="counter">しらべた ところ <b id="expN">0</b> / ' + g.spots.length + "</span>";
  };

  /* --- ほね パズル --- */
  GAMES.bones = function (ctx) {
    var slotsG = ctx.$("slots"), piecesG = ctx.$("pieces"), B = D.BONES;
    var filled = {}, placed = 0, sel = null, drag = null;
    B.forEach(function (b) {
      var s = mk("g", { class: "slot ghost", "data-slot": b.id, "data-kind": b.kind }, slotsG);
      s.innerHTML = A.place(b, A.bone(b.kind));
    });
    // トレー（ひだり 6・みぎ 5）。じゅんばんは まぜる
    var order = B.map(function (b, i) { return i; });
    for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
    var pieces = {};
    order.forEach(function (bi, k) {
      var b = B[bi], left = k < 6, row = left ? k : k - 6;
      var home = { x: left ? 50 : 350, y: left ? 38 + row * 65 : 56 + row * 72 };
      var el = mk("g", { class: "piece", "data-piece": b.id, "data-kind": b.kind }, piecesG);
      el.innerHTML = '<circle class="hit" r="52" fill="#fff" opacity=".55" stroke="#d0bfff" stroke-width="3"/>' + A.bone(b.kind);
      var pc = { b: b, el: el, home: home, done: false };
      pieces[b.id] = pc;
      setT(pc, home.x, home.y, .58, 0);
      ctx.on(el, "pointerdown", function (e) {
        e.preventDefault(); e.stopPropagation();
        if (pc.done) return;
        Sound.tap();
        var p = ctx.pt(e);
        drag = { pc: pc, x0: p.x, y0: p.y, moved: false };
        try { ctx.svg.setPointerCapture(e.pointerId); } catch (er) {}
      });
    });
    function setT(pc, x, y, sc, rot) {
      pc.el.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + rot + ") scale(" + sc + ")");
    }
    function select(pc) {
      if (sel) sel.el.classList.remove("sel");
      sel = pc; if (pc) pc.el.classList.add("sel");
      if (pc) ctx.bubble(pc.b.name + " を どこに はめる？", 1400);
    }
    function back(pc) { setT(pc, pc.home.x, pc.home.y, .58, 0); }
    function tryPlace(pc, p) {
      var cands = B.filter(function (b) { return !filled[b.id]; }).map(function (b) {
        var dx = b.x - p.x, dy = b.y - p.y; return { b: b, d: Math.sqrt(dx * dx + dy * dy) };
      }).filter(function (c) { return c.d < 48; }).sort(function (a, b) { return a.d - b.d; });
      var ok = cands.filter(function (c) { return c.b.kind === pc.b.kind; });
      if (ok.length) {
        var b = ok[0].b;
        filled[b.id] = pc.b.id; pc.done = true; placed++;
        pc.el.classList.remove("sel"); sel = null;
        pc.el.querySelector(".hit").setAttribute("opacity", 0);
        pc.el.style.transition = "transform .25s ease-out";
        setT(pc, b.x, b.y, 1, b.rot);
        pc.el.removeAttribute("data-piece"); pc.el.style.pointerEvents = "none";
        var slot = slotsG.querySelector('[data-slot="' + b.id + '"]'); slot.setAttribute("opacity", 0); slot.classList.add("filled");
        Sound.good();
        ctx.bubble("ぴったり！ " + pc.b.name, 1100);
        $("boneN").textContent = placed;
        if (placed >= B.length) ctx.after(700, function () { ctx.finish(); });
        return;
      }
      if (cands.length) {
        Sound.miss(); ctx.bubble("そこは ちがう ほね みたい", 1000);
        hint(pc.b.kind);
      } else if (drag && drag.moved) { ctx.bubble("かげの ところに はめてね", 900); }
      back(pc);
      if (!drag || drag.moved) select(null);
    }
    function hint(kind) {
      B.forEach(function (b) {
        if (b.kind !== kind || filled[b.id]) return;
        var s = slotsG.querySelector('[data-slot="' + b.id + '"]');
        s.animate([{ opacity: .35 }, { opacity: 1 }, { opacity: .35 }], { duration: 900 });
      });
    }
    ctx.on(ctx.svg, "pointermove", function (e) {
      if (!drag) return;
      var p = ctx.pt(e), dx = p.x - drag.x0, dy = p.y - drag.y0;
      if (!drag.moved && dx * dx + dy * dy > 64) { drag.moved = true; drag.pc.el.style.transition = "none"; select(null); }
      if (drag.moved) setT(drag.pc, p.x, p.y, .9, 0);
    });
    ctx.on(ctx.svg, "pointerup", function (e) {
      var p = ctx.pt(e);
      if (drag) {
        var d = drag;
        if (d.moved) { tryPlace(d.pc, p); drag = null; return; }
        drag = null;
        select(sel === d.pc ? null : d.pc);
        return;
      }
    });
    ctx.on(ctx.svg, "pointerdown", function (e) {
      if (!sel) return;
      var p = ctx.pt(e);
      tryPlace(sel, p);
    });
    ctx.ctl.innerHTML = '<span class="counter">はめた ほね <b id="boneN">0</b> / ' + B.length + "</span>";
  };

  /* --- きんにく: スライダーで うでを まげる --- */
  GAMES.muscle = function (ctx) {
    var armG = ctx.$("armG"), v = 20, st = { bic: "n", tri: "n", labels: true }, bent = false, straight = false, idle = 0;
    ctx.ctl.innerHTML = '<div class="slider-box"><span>のばす</span><input type="range" id="armSl" min="0" max="100" value="20" aria-label="うでを まげる"><span>まげる</span></div>' +
      '<div class="tasks"><span id="tBend">① まげて みよう</span><span id="tStr">② のばして みよう</span></div>';
    var sl = $("armSl");
    function draw() { armG.innerHTML = A.arm(v * 1.35, st); }
    draw();
    ctx.on(sl, "input", function () {
      var nv = +sl.value;
      if (nv === v) return;
      if (nv > v) { st.bic = "c"; st.tri = "r"; } else { st.bic = "r"; st.tri = "c"; }
      v = nv; idle = 0; draw();
      if (!bent && v >= 90) { bent = true; $("tBend").classList.add("ok"); Sound.good(); ctx.bubble("うちがわの きんにくが ちぢんだ！", 1400); }
      if (bent && !straight && v <= 10) {
        straight = true; $("tStr").classList.add("ok"); ctx.bubble("そとがわの きんにくが ちぢんだ！", 1400);
        ctx.after(900, function () { ctx.finish(); });
      }
    });
    ctx.loop(function (t, dt) {
      idle += dt;
      if (idle > .8 && st.bic !== "n") { st.bic = "n"; st.tri = "n"; draw(); }
    });
  };

  /* ---------- はじめ ---------- */
  updateSoundBtn();
  renderHome();
  show("home");
})();
