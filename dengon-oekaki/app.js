/* でんごん おえかき の がめん と そうさ */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var KEY = "dengon-oekaki-v1", AKEY = "dengon-oekaki-album-v1";
  var ICONS = ["🐶", "🐱", "🐰", "🐻", "🐼", "🦊", "🐸", "🐵", "🐯", "🦁", "🐧", "🐤", "🦄", "🐙", "🤖", "🌟"];
  var COLORS = ["#222222", "#e03131", "#1c7ed6", "#2f9e44", "#f59f00", "#ae3ec9"];
  var PARAMS = new URLSearchParams(location.search);

  /* ---------- ほぞん（try/catch） ---------- */
  function load(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  var cfg = Object.assign({ n: 4, level: "easy", laps: 1, time: 40, sfx: true, pen: true, voice: true, recent: [], players: [] }, load(KEY, {}));
  function saveCfg() { store(KEY, cfg); }
  function applySound() { Sound.on = cfg.sfx; Sound.pen = cfg.pen; Sound.voice = cfg.voice; }
  applySound();

  function defaultPlayer(i) { return { name: "", icon: ICONS[i % ICONS.length], little: false }; }
  for (var i = 0; i < 6; i++) if (!cfg.players[i]) cfg.players[i] = defaultPlayer(i);

  /* ---------- がめん きりかえ ---------- */
  var screen = "title";
  function show(id) {
    $$(".screen").forEach(function (s) { s.classList.toggle("hidden", s.id !== "s-" + id); });
    screen = id;
    if (id === "draw") fitPad();
  }
  function tapSound() { Sound.unlock(); Sound.tap(); }
  function on(sel, fn) { $(sel).addEventListener("click", function (e) { tapSound(); fn(e); }); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function modal(id, open) { $(id).classList.toggle("hidden", !open); }

  /* ---------- ひょうし ---------- */
  function syncToggles() {
    $("#t-sfx").setAttribute("aria-pressed", String(cfg.sfx));
    $("#t-pen").setAttribute("aria-pressed", String(cfg.pen));
    $("#t-voice").setAttribute("aria-pressed", String(cfg.voice));
  }
  syncToggles();
  [["#t-sfx", "sfx"], ["#t-pen", "pen"], ["#t-voice", "voice"]].forEach(function (p) {
    $(p[0]).addEventListener("click", function () {
      cfg[p[1]] = !cfg[p[1]]; applySound(); syncToggles(); saveCfg();
      Sound.unlock(); Sound.tap();
      if (p[1] === "voice" && cfg.voice) Sound.say("よみあげ オン");
      if (p[1] === "voice" && !cfg.voice) Sound.hush();
    });
  });
  on("#b-start", function () { renderSetup(); show("setup"); });
  on("#b-album", function () { renderAlbum(); show("album"); });
  on("#b-howto", function () { modal("#m-howto", true); });
  on("#b-howto-ok", function () { modal("#m-howto", false); });

  /* ---------- じゅんび ---------- */
  var iconFor = -1;
  function segOn(seg, attr, val) {
    $$(seg + " button").forEach(function (b) { b.classList.toggle("on", b.getAttribute(attr) === String(val)); });
  }
  function readNames() {
    $$(".p-name").forEach(function (inp) { cfg.players[+inp.dataset.i].name = inp.value.slice(0, 8); });
  }
  function renderSetup() {
    segOn("#seg-n", "data-n", cfg.n); segOn("#seg-lv", "data-lv", cfg.level);
    segOn("#seg-laps", "data-laps", cfg.laps); segOn("#seg-time", "data-time", cfg.time);
    var h = "";
    for (var i = 0; i < cfg.n; i++) {
      var p = cfg.players[i];
      h += '<div class="prow"><span class="num">' + (i + 1) + '</span>' +
        '<button class="p-icon" data-i="' + i + '" aria-label="あいこん">' + p.icon + '</button>' +
        '<input class="p-name" data-i="' + i + '" type="text" maxlength="8" autocomplete="off" spellcheck="false" placeholder="なまえ" value="' + esc(p.name) + '">' +
        '<button class="p-little' + (p.little ? " on" : "") + '" data-i="' + i + '">🐣<br>ちいさい こ</button></div>';
    }
    $("#plist").innerHTML = h;
  }
  $("#plist").addEventListener("input", function (e) {
    if (e.target.classList.contains("p-name")) { cfg.players[+e.target.dataset.i].name = e.target.value.slice(0, 8); saveCfg(); }
  });
  $("#plist").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    tapSound(); readNames();
    var i = +b.dataset.i;
    if (b.classList.contains("p-icon")) { iconFor = i; renderIcons(); modal("#m-icon", true); }
    if (b.classList.contains("p-little")) { cfg.players[i].little = !cfg.players[i].little; saveCfg(); renderSetup(); }
  });
  function renderIcons() {
    $("#icon-grid").innerHTML = ICONS.map(function (ic) { return '<button data-ic="' + ic + '">' + ic + "</button>"; }).join("");
  }
  $("#icon-grid").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b || iconFor < 0) return;
    tapSound();
    cfg.players[iconFor].icon = b.dataset.ic; saveCfg(); modal("#m-icon", false); renderSetup();
  });
  $("#m-icon").addEventListener("click", function (e) { if (e.target.id === "m-icon") modal("#m-icon", false); });
  [["#seg-n", "n"], ["#seg-lv", "lv"], ["#seg-laps", "laps"], ["#seg-time", "time"]].forEach(function (p) {
    $(p[0]).addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      tapSound(); readNames();
      var v = b.getAttribute("data-" + p[1]);
      if (p[1] === "n") cfg.n = +v; else if (p[1] === "lv") cfg.level = v; else if (p[1] === "laps") cfg.laps = +v; else cfg.time = +v;
      saveCfg(); renderSetup();
    });
  });
  on("#b-setup-back", function () { readNames(); saveCfg(); show("title"); });
  on("#b-go", function () { readNames(); saveCfg(); newGame(); });

  /* ---------- ゲーム ---------- */
  var G = null, rec = null, r = Math.random;
  function newGame() {
    var seed = PARAMS.has("seed") ? +PARAMS.get("seed") : undefined;
    if (seed != null && !isNaN(seed)) r = Game.rng(seed + 99);
    G = Game.create({ players: cfg.players.slice(0, cfg.n), level: cfg.level, laps: cfg.laps, seed: seed, avoid: cfg.recent, at: Date.now() });
    rec = null;
    toPass();
  }
  function remember(w) {
    cfg.recent = [w].concat((cfg.recent || []).filter(function (x) { return x !== w; })).slice(0, 40);
    saveCfg();
  }

  /* まわす がめん */
  function toPass() {
    Sound.hush();
    var i = Game.current(G);
    var fin = Game.done(G);
    var p = fin ? null : Game.who(G, i);
    $("#p-step").textContent = fin ? "おしまい！" : (i + 1) + " / " + G.total + " ばんめ ・ " + (Game.kindOf(i) === "draw" ? "🖍️ え の ばん" : "💬 ことば の ばん");
    $("#p-icon").textContent = fin ? "🎉" : p.icon;
    $("#p-name").textContent = fin ? "みんなで あつまって！" : "つぎは " + p.name + " さん";
    $("#p-msg").innerHTML = fin ? "どんな ふうに かわったかな？" : "ほかの ひとは <ruby>見<rt>み</rt></ruby>ないでね 🙈";
    $("#b-me").classList.toggle("hidden", fin);
    $("#p-holdhint").classList.toggle("hidden", fin);
    $("#b-show").classList.toggle("hidden", !fin);
    show("pass");
    Sound.pon();
    if (!fin) Sound.say("つぎは " + p.name + " さん");
  }
  /* ながおし 1びょう */
  (function () {
    var b = $("#b-me"), t = null;
    function cancel() { clearTimeout(t); t = null; b.classList.remove("pressing"); }
    b.addEventListener("pointerdown", function (e) {
      if (t) return;
      Sound.unlock();
      b.classList.add("pressing");
      t = setTimeout(function () { cancel(); Sound.ok(); startTurn(); }, 1000);
      e.preventDefault();
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { b.addEventListener(ev, cancel); });
    b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  })();
  on("#b-show", function () { startReveal(rec || saveRecord()); });

  function startTurn() {
    var i = Game.current(G);
    if (Game.kindOf(i) === "draw") { if (i === 0) showOdai(); else startDraw(); }
    else startWord();
  }

  /* おだい くじびき */
  function showOdai() {
    show("odai");
    var card = $("#o-card"), e = $("#o-e"), w = $("#o-w");
    var left = 2 - G.rerolls;
    $("#b-reroll").textContent = "🔄 べつの おだい（あと " + left + "）";
    $("#b-reroll").disabled = true; $("#b-draw").disabled = true;
    card.classList.add("spin"); w.textContent = ""; $("#o-msg").textContent = "くじびき ちゅう…";
    var list = ODAI[G.level], k = 0;
    var spin = setInterval(function () { e.textContent = list[Math.floor(Math.random() * list.length)].e; Sound.tick(k++ % 2); }, 90);
    setTimeout(function () {
      clearInterval(spin);
      card.classList.remove("spin");
      e.textContent = G.odai.e; w.textContent = G.odai.w;
      $("#o-msg").textContent = "これを え に かこう！";
      $("#b-reroll").disabled = left <= 0; $("#b-draw").disabled = false;
      Sound.ok();
      if (Game.who(G, 0).little) Sound.say("おだいは、" + G.odai.w + "。" + G.odai.w + " を かこう");
    }, PARAMS.has("fast") ? 50 : 1100);
  }
  on("#b-reroll", function () { if (G.rerolls < 2) { Game.reroll(G, r); showOdai(); } });
  on("#b-draw", function () { remember(G.odai.w); startDraw(); });
  on("#b-say-odai", function () { Sound.say(G.odai.w); });

  /* ---------- え の ばん ---------- */
  var pad = $("#pad"), pctx = pad.getContext("2d");
  var strokes = [], cur = null, active = null, color = COLORS[0], width = 7, eraser = false;
  var timer = null, remain = 0, drawWord = "", locked = false;
  $("#cols").innerHTML = COLORS.map(function (c, i) { return '<button class="col' + (i ? "" : " on") + '" data-c="' + c + '" style="background:' + c + '" aria-label="いろ ' + (i + 1) + '"></button>'; }).join("");
  $("#cols").addEventListener("click", function (e) {
    var b = e.target.closest(".col"); if (!b) return;
    tapSound(); color = b.dataset.c; eraser = false; toolUI();
  });
  $$(".wid").forEach(function (b) { b.addEventListener("click", function () { tapSound(); width = +b.dataset.w; toolUI(); }); });
  on("#b-eraser", function () { eraser = !eraser; toolUI(); });
  on("#b-undo", function () { strokes.pop(); redraw(); });
  function toolUI() {
    $$(".col").forEach(function (b) { b.classList.toggle("on", !eraser && b.dataset.c === color); });
    $$(".wid").forEach(function (b) { b.classList.toggle("on", +b.dataset.w === width); });
    $("#b-eraser").classList.toggle("on", eraser);
    $("#b-undo").disabled = !strokes.length;
  }
  function clearPad() { pctx.fillStyle = "#fff"; pctx.fillRect(0, 0, pad.width, pad.height); }
  function paint(s, from) {
    var pts = s.pts;
    pctx.strokeStyle = pctx.fillStyle = s.er ? "#fff" : s.c;
    pctx.lineWidth = s.w; pctx.lineCap = "round"; pctx.lineJoin = "round";
    if (pts.length === 1) { pctx.beginPath(); pctx.arc(pts[0][0], pts[0][1], s.w / 2, 0, Math.PI * 2); pctx.fill(); return; }
    pctx.beginPath();
    var a = Math.max(0, (from || 0) - 1);
    pctx.moveTo(pts[a][0], pts[a][1]);
    for (var i = a + 1; i < pts.length; i++) pctx.lineTo(pts[i][0], pts[i][1]);
    pctx.stroke();
  }
  function redraw() { clearPad(); strokes.forEach(function (s) { paint(s); }); toolUI(); }
  function fitPad() {
    var wrap = $("#pad-wrap"), box = $("#pad-box");
    var W = wrap.clientWidth, H = wrap.clientHeight;
    if (!W || !H) return;
    var w = Math.min(W, H * 4 / 3), h = w * 3 / 4;
    box.style.width = Math.floor(w) + "px"; box.style.height = Math.floor(h) + "px";
    $("#pad-hint").style.fontSize = Math.floor(h * 0.75) + "px";
  }
  window.addEventListener("resize", function () { if (screen === "draw") fitPad(); });
  function padXY(e) {
    var b = pad.getBoundingClientRect();
    return [Math.round(((e.clientX - b.left) / b.width) * pad.width), Math.round(((e.clientY - b.top) / b.height) * pad.height)];
  }
  pad.addEventListener("pointerdown", function (e) {
    if (locked || active !== null) return; /* 2ほんめの ゆびは むし */
    if (e.button > 0) return;
    active = e.pointerId;
    try { pad.setPointerCapture(e.pointerId); } catch (x) {}
    cur = { c: color, w: eraser ? 40 : width, er: eraser, pts: [padXY(e)] };
    strokes.push(cur); paint(cur);
    Sound.penStart();
    e.preventDefault();
  });
  pad.addEventListener("pointermove", function (e) {
    if (e.pointerId !== active || !cur) return;
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    if (!evs.length) evs = [e];
    var n0 = cur.pts.length, dist = 0;
    evs.forEach(function (ev) {
      var p = padXY(ev), q = cur.pts[cur.pts.length - 1];
      var d = Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]);
      if (d >= 2) { cur.pts.push(p); dist += d; }
    });
    if (cur.pts.length > n0) { paint(cur, n0); Sound.penMove(dist); }
    e.preventDefault();
  });
  function endStroke(e) {
    if (e.pointerId !== active) return;
    active = null; cur = null; Sound.penStop(); toolUI();
  }
  pad.addEventListener("pointerup", endStroke);
  pad.addEventListener("pointercancel", endStroke);
  pad.addEventListener("touchstart", function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
  pad.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  function startDraw() {
    var i = Game.current(G), p = Game.who(G, i), v = Game.visible(G, i);
    drawWord = v.text;
    $("#d-who").textContent = p.icon + " " + p.name;
    $("#d-word").textContent = v.text;
    $("#pad-hint").textContent = p.little && v.e ? v.e : "";
    $("#pad-msg").classList.add("hidden");
    strokes = []; cur = null; active = null; eraser = false; color = COLORS[0]; width = 7; locked = false;
    show("draw"); redraw();
    $("#b-done").disabled = false;
    if (p.little) Sound.say(v.text + " を かこう");
    clearInterval(timer);
    remain = cfg.time;
    renderTimer();
    if (cfg.time > 0) timer = setInterval(function () {
      remain -= 1; renderTimer();
      if (remain <= 0) { clearInterval(timer); timeUp(); }
      else Sound.tick(remain <= 5);
    }, 1000);
  }
  function renderTimer() {
    var el = $("#d-timer");
    el.textContent = cfg.time > 0 ? "⏱ " + Math.max(0, remain) : "";
    el.classList.toggle("hurry", cfg.time > 0 && remain <= 5);
  }
  function timeUp() {
    locked = true; Sound.penStop(); active = null; cur = null;
    Sound.timeUp();
    $("#pad-msg").classList.remove("hidden");
    $("#b-done").disabled = true;
    setTimeout(finishDraw, PARAMS.has("fast") ? 100 : 1200);
  }
  function exportImg() {
    var c = document.createElement("canvas"); c.width = 320; c.height = 240;
    var x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, 320, 240);
    x.drawImage(pad, 0, 0, 320, 240);
    return c.toDataURL("image/png");
  }
  function finishDraw() {
    clearInterval(timer); timer = null;
    Sound.penStop();
    Game.submit(G, { img: exportImg() });
    toPass();
  }
  on("#b-done", function () {
    if (!strokes.length) { $("#pad-box").classList.add("shake"); setTimeout(function () { $("#pad-box").classList.remove("shake"); }, 500); Sound.say("なにか かいてね"); return; }
    locked = true; Sound.ok(); finishDraw();
  });

  /* ---------- ことば の ばん ---------- */
  var how = "type", pending = "", pendingHow = "type";
  function startWord() {
    var i = Game.current(G), p = Game.who(G, i), v = Game.visible(G, i);
    $("#w-who").textContent = p.icon + " " + p.name;
    $("#w-img").src = v.img || "";
    $("#w-input").value = "";
    modal("#w-confirm", false);
    var ch = Game.choices(G, i, r);
    $("#w-choices").innerHTML = ch.map(function (c) {
      return '<button class="choice" data-w="' + esc(c.w) + '"><span class="ce">' + c.e + "</span><span>" + esc(c.w) + "</span></button>";
    }).join("");
    setHow(p.little ? "pick" : "type");
    show("word");
    if (p.little) Sound.say("なにの え かな？ えらんでね");
  }
  function setHow(h) {
    how = h; segOn("#seg-how", "data-how", h);
    $("#how-type").classList.toggle("hidden", h !== "type");
    $("#w-choices").classList.toggle("hidden", h !== "pick");
  }
  $("#seg-how").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    tapSound(); setHow(b.dataset.how);
  });
  function ask(text, h) {
    pending = Game.norm(text); pendingHow = h;
    if (!pending) {
      $("#w-input").classList.add("shake"); setTimeout(function () { $("#w-input").classList.remove("shake"); }, 500);
      return;
    }
    $("#w-input").blur();
    $("#w-final").textContent = pending;
    modal("#w-confirm", true);
    Sound.say(pending);
  }
  on("#w-ok", function () { ask($("#w-input").value, "type"); });
  $("#w-input").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); ask(this.value, "type"); } });
  $("#w-choices").addEventListener("click", function (e) {
    var b = e.target.closest(".choice"); if (!b) return;
    tapSound(); ask(b.dataset.w, "pick");
  });
  on("#w-no", function () { modal("#w-confirm", false); });
  on("#w-yes", function () {
    modal("#w-confirm", false);
    Sound.ok();
    Game.submit(G, { text: pending, how: pendingHow });
    toPass();
  });

  /* ---------- やめる ---------- */
  function askQuit() { modal("#m-quit", true); }
  on("#b-pass-quit", askQuit); on("#b-draw-quit", askQuit); on("#b-word-quit", askQuit);
  on("#b-quit-no", function () { modal("#m-quit", false); });
  on("#b-quit-yes", function () {
    modal("#m-quit", false); clearInterval(timer); Sound.penStop(); Sound.hush();
    G = null; show("title");
  });

  /* ---------- アルバム ---------- */
  function saveRecord() {
    rec = { id: "g" + (G.at || Date.now()) + "-" + G.seed, at: G.at || Date.now(), level: G.level, odai: G.odai, players: G.players, steps: G.steps, fav: -1 };
    putRecord(rec);
    return rec;
  }
  function putRecord(x) {
    var list = Game.albumAdd(load(AKEY, []), x, 10);
    while (list.length) {
      if (store(AKEY, list)) return true;
      if (list.length === 1) return false;
      list.pop(); /* いっぱい なら ふるい もの から けす */
    }
    return false;
  }
  function updateRecord(x) {
    var list = load(AKEY, []);
    var k = list.findIndex(function (y) { return y.id === x.id; });
    if (k >= 0) { list[k] = x; store(AKEY, list); }
  }
  function dateStr(t) {
    var d = new Date(t);
    return (d.getMonth() + 1) + "がつ " + d.getDate() + "にち " + d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function lastText(x) {
    for (var i = x.steps.length - 1; i >= 0; i--) if (x.steps[i].kind === "word") return x.steps[i].text;
    return null;
  }
  function renderAlbum() {
    var list = load(AKEY, []);
    if (!list.length) { $("#album-list").innerHTML = '<div class="empty">まだ ないよ。あそんで はっぴょう すると ここに のこるよ。</div>'; return; }
    $("#album-list").innerHTML = list.map(function (x, k) {
      var fav = x.fav >= 0 && x.steps[x.fav] && x.steps[x.fav].kind === "draw" ? x.steps[x.fav] : null;
      var img = fav ? fav.img : (x.steps[0] && x.steps[0].img) || "";
      var lt = lastText(x);
      return '<button class="alb" data-k="' + k + '"><img alt="" src="' + img + '"><div class="ttl">' + x.odai.e + " " + esc(x.odai.w) + (lt ? " → " + esc(lt) : "") + "</div>" +
        "<div>" + dateStr(x.at) + " ・ " + x.players.map(function (p) { return p.icon; }).join("") + (x.fav >= 0 ? " ・ ❤️" : "") + "</div></button>";
    }).join("");
  }
  $("#album-list").addEventListener("click", function (e) {
    var b = e.target.closest(".alb"); if (!b) return;
    tapSound();
    var list = load(AKEY, []);
    var x = list[+b.dataset.k]; if (!x) return;
    rec = x; G = null; showSum(true);
  });
  on("#b-album-back", function () { show("title"); });

  /* ---------- はっぴょう ---------- */
  var slides = [], si = 0, busy = false, revT = [];
  function later(fn, ms) { revT.push(setTimeout(fn, PARAMS.has("fast") ? Math.min(ms, 60) : ms)); }
  function startReveal(x) {
    rec = x;
    slides = Game.slides(x); si = -1; busy = false;
    revT.forEach(clearTimeout); revT = [];
    show("reveal");
    $("#r-boom").classList.add("hidden");
    $("#r-slide").innerHTML = '<div class="wait">どきどき…🥁</div>';
    $("#r-next").disabled = true;
    Sound.drumroll(1.2);
    later(function () { Sound.cymbal(); next(); }, 1300);
  }
  function slideHTML(s) {
    if (s.kind === "odai") return '<div class="lab">さいしょの おだい</div><div class="bige">' + s.e + '</div><div class="big">' + esc(s.text) + "</div>";
    var lab = '<div class="lab">' + s.icon + " " + esc(s.name) + " さん の " + (s.kind === "draw" ? "え" : "ことば") + "</div>";
    if (s.kind === "draw") return lab + '<img alt="え" src="' + s.img + '">';
    return lab + '<div class="big">「' + esc(s.text) + "」</div>";
  }
  function putSlide(s) {
    var el = $("#r-slide");
    el.classList.remove("flip"); void el.offsetWidth; el.classList.add("flip");
    el.innerHTML = slideHTML(s);
    $("#r-count").textContent = (si + 1) + " / " + slides.length;
    if (s.kind !== "draw") Sound.say(s.kind === "odai" ? "さいしょの おだいは、" + s.text : s.name + " さんは、" + s.text);
  }
  function same(a, b) { return Game.norm(a).replace(/ /g, "") === Game.norm(b).replace(/ /g, ""); }
  function next() {
    if (busy) return;
    si += 1;
    if (si >= slides.length) { showSum(false); return; }
    var last = si === slides.length - 1;
    $("#r-next").textContent = last ? "ぜんぶ ならべる ▶" : "つぎ ▶";
    if (last && slides.length > 2) {
      busy = true; $("#r-next").disabled = true;
      $("#r-slide").innerHTML = '<div class="wait">さいごは…🥁</div>';
      $("#r-count").textContent = (si + 1) + " / " + slides.length;
      Sound.hush(); Sound.drumroll(1.6);
      later(function () {
        busy = false; $("#r-next").disabled = false;
        putSlide(slides[si]);
        Sound.cymbal();
        var lt = lastText(rec);
        var boom = $("#r-boom");
        if (lt && same(lt, rec.odai.w)) { boom.textContent = "つたわった！🎉"; Sound.ok(); }
        else { boom.textContent = "ええーっ！"; Sound.eeh(0.05); }
        boom.classList.remove("hidden"); boom.style.animation = "none"; void boom.offsetWidth; boom.style.animation = "";
      }, 1700);
      return;
    }
    $("#r-next").disabled = false;
    if (si > 0) Sound.page();
    putSlide(slides[si]);
  }
  on("#r-next", next);
  on("#b-rev-skip", function () { revT.forEach(clearTimeout); busy = false; Sound.hush(); showSum(false); });

  /* ---------- まとめ ---------- */
  var albumMode = false;
  function showSum(fromAlbum) {
    albumMode = !!fromAlbum;
    Sound.hush();
    var x = rec;
    $("#sum-title").textContent = fromAlbum ? dateStr(x.at) + " の でんごん" : "ぜんぶ ならべると…";
    var items = Game.slides(x);
    $("#sum-list").innerHTML = items.map(function (s, k) {
      var st = k - 1;
      var head = s.kind === "odai" ? "🎯 おだい" : s.icon + " " + esc(s.name);
      var body = s.kind === "draw" ? '<img alt="" src="' + s.img + '">' : '<div class="txt">' + (s.kind === "odai" ? s.e + " " : "") + esc(s.text) + "</div>";
      var heart = s.kind === "odai" ? "" : '<button class="heart" data-st="' + st + '" aria-label="おきにいり">❤️</button>';
      return '<div class="sum-item' + (x.fav === st && st >= 0 ? " fav" : "") + '">' + heart + '<div class="lab">' + head + "</div>" + body + "</div>";
    }).join("");
    $("#b-again").classList.toggle("hidden", fromAlbum || !G);
    $("#b-del").classList.toggle("hidden", !fromAlbum);
    $("#b-sum-home").textContent = fromAlbum ? "◀ アルバム" : "🏠 おわる";
    show("sum");
  }
  $("#sum-list").addEventListener("click", function (e) {
    var b = e.target.closest(".heart"); if (!b) return;
    var st = +b.dataset.st;
    rec.fav = rec.fav === st ? -1 : st;
    if (rec.fav >= 0) Sound.heart(); else tapSound();
    updateRecord(rec);
    $$(".sum-item").forEach(function (el) {
      var h = el.querySelector(".heart");
      el.classList.toggle("fav", !!h && +h.dataset.st === rec.fav);
    });
  });
  on("#b-replay", function () { startReveal(rec); });
  on("#b-again", function () { if (G) newGame(); });
  on("#b-del", function () {
    var list = load(AKEY, []).filter(function (y) { return y.id !== rec.id; });
    store(AKEY, list); renderAlbum(); show("album");
  });
  on("#b-sum-home", function () { if (albumMode) { renderAlbum(); show("album"); } else show("title"); });

  /* まとめ がぞう（canvas）を つくって ダウンロード */
  function loadImg(src) {
    return new Promise(function (ok) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = src; });
  }
  function wrapText(x, text, maxW) {
    var lines = [], line = "";
    Array.from(text).forEach(function (ch) {
      if (x.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; } else line += ch;
    });
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }
  function makeSheet(x) {
    var items = Game.slides(x);
    var W = 720, PAD = 24, IMGW = 480, IMGH = 360, TXTH = 120, LAB = 36, GAP = 40;
    var H = 110;
    items.forEach(function (s) { H += LAB + (s.kind === "draw" ? IMGH : TXTH) + GAP; });
    H += 30;
    return Promise.all(items.map(function (s) { return s.kind === "draw" ? loadImg(s.img) : Promise.resolve(null); })).then(function (imgs) {
      var c = document.createElement("canvas"); c.width = W; c.height = H;
      var g = c.getContext("2d");
      var font = '"Hiragino Maru Gothic ProN", "BIZ UDPGothic", sans-serif';
      g.fillStyle = "#fff0f6"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#d6336c"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "bold 40px " + font; g.fillText("🖍️ でんごん おえかき", W / 2, 46);
      g.fillStyle = "#7a5a68"; g.font = "22px " + font; g.fillText(dateStr(x.at), W / 2, 86);
      var y = 110;
      items.forEach(function (s, k) {
        var st = k - 1;
        g.fillStyle = "#3b2a33"; g.font = "bold 24px " + font;
        g.fillText((s.kind === "odai" ? "🎯 おだい" : s.icon + " " + s.name + " さん") + (x.fav === st && st >= 0 ? "  ❤️" : ""), W / 2, y + LAB / 2);
        y += LAB;
        var bx = (W - IMGW) / 2, bh = s.kind === "draw" ? IMGH : TXTH;
        g.fillStyle = "#fff"; g.strokeStyle = x.fav === st && st >= 0 ? "#ff6b9a" : "#f3c4d7"; g.lineWidth = 4;
        g.beginPath(); if (g.roundRect) g.roundRect(bx, y, IMGW, bh, 18); else g.rect(bx, y, IMGW, bh); g.fill(); g.stroke();
        if (s.kind === "draw" && imgs[k]) g.drawImage(imgs[k], bx + 4, y + 4, IMGW - 8, bh - 8);
        if (s.kind !== "draw") {
          g.fillStyle = "#d6336c"; g.font = "bold 40px " + font;
          var t = (s.kind === "odai" ? s.e + " " : "") + s.text;
          var lines = wrapText(g, t, IMGW - 30);
          lines.forEach(function (ln, j) { g.fillText(ln, W / 2, y + bh / 2 + (j - (lines.length - 1) / 2) * 44); });
        }
        y += bh;
        if (k < items.length - 1) { g.fillStyle = "#f06595"; g.font = "bold 28px " + font; g.fillText("⬇", W / 2, y + GAP / 2); }
        y += GAP;
      });
      return c;
    });
  }
  on("#b-saveimg", function () {
    makeSheet(rec).then(function (c) {
      var d = new Date(rec.at);
      var name = "dengon-oekaki-" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0") + ".png";
      var go = function (url, revoke) {
        var a = document.createElement("a"); a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        if (revoke) setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      };
      if (c.toBlob) c.toBlob(function (b) { if (b) go(URL.createObjectURL(b), true); else go(c.toDataURL("image/png")); }, "image/png");
      else go(c.toDataURL("image/png"));
    });
  });

  /* ---------- たしかめ よう ---------- */
  window.DengonDebug = {
    state: function () {
      return {
        screen: screen, step: G ? Game.current(G) : -1, total: G ? G.total : 0,
        kind: G && !Game.done(G) ? Game.kindOf(Game.current(G)) : null,
        player: G && !Game.done(G) ? Game.who(G, Game.current(G)).name : null,
        strokes: strokes.length, remain: remain, how: how, slide: si, slides: slides.length, busy: busy,
        album: load(AKEY, []).length, fav: rec ? rec.fav : null
      };
    },
    game: function () { return G; },
    setRemain: function (n) { remain = n; }
  };
})();
