/* ============================================================
   ちずきごう たからさがし — うごき
   ・がめん: home / cards（きごう カード）/ stages / hunt（たからさがし）/ maker（ちず づくり）/ zukan
   ・ほぞん: localStorage "chizu-takara-v1"（よみかきは try/catch）
   ・おと: WebAudio の ごうせいおん だけ
   ============================================================ */
(function () {
  "use strict";
  var S = window.CHIZU_SYMBOLS, R = window.CHIZU_RULES, STAGES = window.CHIZU_STAGES;
  var KEY = "chizu-takara-v1", MAKE_N = 10, NS = "http://www.w3.org/2000/svg";

  function rb(s) { return String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>"); }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ---------------- ほぞん ----------------
  var save = { sound: true, stars: {}, right: {}, maps: [null, null, null], slot: 0 };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { var o = JSON.parse(raw); for (var k in o) if (o[k] != null) save[k] = o[k]; }
  } catch (e) { /* よめなくても あそべる */ }
  if (!Array.isArray(save.maps) || save.maps.length !== 3) save.maps = [null, null, null];
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても つづける */ } }
  function learned(id) { return (save.right[id] || 0) >= 2; }
  function learnedCount() { return S.SYMBOLS.filter(function (s) { return learned(s.id); }).length; }

  // ---------------- おと ----------------
  var sound = (function () {
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
    function noise(dur, freq, vol, when, type) {
      if (!save.sound || !ensure()) return;
      var t = ctx.currentTime + (when || 0), n = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource(); src.buffer = buf;
      var f = ctx.createBiquadFilter(); f.type = type || "bandpass"; f.Q.value = 1.2; f.frequency.value = freq;
      var g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(master); src.start(t);
    }
    return {
      unlock: ensure,
      tap: function () { tone(880, 880, .05, "triangle", .12); },
      step: function () { noise(.07, 420, .5, 0, "lowpass"); tone(150, 90, .07, "sine", .18); },
      bump: function () { tone(180, 120, .14, "square", .1); },
      good: function () { tone(660, 660, .09, "triangle", .22); tone(990, 990, .14, "triangle", .22, .08); },
      miss: function () { tone(260, 190, .18, "triangle", .2); },
      dig: function () { for (var i = 0; i < 3; i++) { noise(.16, 900 - i * 200, .55, i * .2, "bandpass"); tone(120, 70, .1, "sine", .14, i * .2); } },
      chest: function () {
        [523, 659, 784, 1047].forEach(function (f, i) { tone(f, f, .22, "triangle", .2, .6 + i * .11); });
        for (var i = 0; i < 6; i++) tone(1800 + i * 220, 2400 + i * 220, .08, "sine", .07, 1.1 + i * .06);
      },
      place: function () { tone(520, 700, .06, "sine", .16); }
    };
  })();
  document.addEventListener("pointerdown", function () { sound.unlock(); }, { once: true });

  function paintSound() { $("soundBtn").textContent = save.sound ? "🔊" : "🔇"; $("soundBtn").setAttribute("aria-pressed", save.sound ? "true" : "false"); }
  $("soundBtn").addEventListener("click", function () { save.sound = !save.sound; store(); paintSound(); sound.tap(); });

  var toastTimer = 0;
  function toast(html) {
    var t = $("toast"); t.innerHTML = html; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 1800);
  }

  // ---------------- ちずを かく（たからさがし・ちずづくり・ホーム で つかう） ----------------
  var RAIL = { "=": "jr", "-": "rail", "E": "station" };
  function isRail(c) { return !!RAIL[c]; }
  function railConn(map, x, y) {
    var c = map[y][x], conn = {};
    function at(xx, yy) { return map[yy] && map[yy][xx]; }
    if (isRail(at(x, y - 1))) conn.n = 1;
    if (isRail(at(x, y + 1))) conn.s = 1;
    if (isRail(at(x + 1, y))) conn.e = 1;
    if (isRail(at(x - 1, y))) conn.w = 1;
    if (c === "E") { // えきは となりの せんろの しゅるいに あわせる
      var nb = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
      if (nb.indexOf("-") >= 0 && nb.indexOf("=") < 0) conn.other = 1;
    }
    return conn;
  }
  function cellSvg(map, x, y) {
    var c = map[y][x], s = S.BY_CODE[c], bg = "#fbf6e6", inner = "";
    if (s) {
      if (s.bg) bg = s.bg;
      if (s.kind === "rail") inner = '<g fill="none" stroke="#2b2b2b">' + s.draw(railConn(map, x, y)) + "</g>";
      else if (s.kind === "land") inner = '<g fill="none" stroke="#3d4a2a" transform="translate(6 6) scale(.88)">' + s.draw() + "</g>";
      else inner = '<rect x="9" y="9" width="82" height="82" rx="16" fill="#fff" stroke="#c9bd98" stroke-width="3"/>' +
        '<g fill="none" stroke="#2b2b2b" transform="translate(17 17) scale(.66)">' + s.draw() + "</g>";
    }
    return '<g transform="translate(' + x * 100 + " " + y * 100 + ')"><rect width="100" height="100" fill="' + bg + '"/>' + inner + "</g>";
  }
  function mapSvg(map, extra) {
    var N = map.length, out = "";
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) out += cellSvg(map, x, y);
    var grid = "";
    for (var i = 1; i < N; i++) grid += '<line x1="' + i * 100 + '" y1="0" x2="' + i * 100 + '" y2="' + N * 100 + '"/><line x1="0" y1="' + i * 100 + '" x2="' + N * 100 + '" y2="' + i * 100 + '"/>';
    return '<svg class="map" viewBox="-6 -6 ' + (N * 100 + 12) + " " + (N * 100 + 12) + '" xmlns="' + NS + '">' +
      '<rect x="-6" y="-6" width="' + (N * 100 + 12) + '" height="' + (N * 100 + 12) + '" rx="14" fill="#7a6a45"/>' +
      '<g class="cells">' + out + "</g>" +
      '<g stroke="#000" stroke-opacity=".12" stroke-width="2">' + grid + "</g>" + (extra || "") + "</svg>";
  }
  // たんけんたい（ぼうしの こども）
  var HERO = '<g class="hero-body">' +
    '<ellipse cx="50" cy="88" rx="24" ry="7" fill="#000" opacity=".18"/>' +
    '<path d="M30 86 Q30 62 50 60 Q70 62 70 86 Z" fill="#e8590c" stroke="#7a2e05" stroke-width="3"/>' +
    '<circle cx="50" cy="44" r="18" fill="#ffd8b5" stroke="#8a5a3a" stroke-width="3"/>' +
    '<circle cx="44" cy="46" r="2.6" fill="#333"/><circle cx="56" cy="46" r="2.6" fill="#333"/>' +
    '<path d="M44 53 Q50 57 56 53" stroke="#333" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M24 36 Q50 26 76 36 Q66 32 64 22 Q50 12 36 22 Q34 32 24 36 Z" fill="#c9a55a" stroke="#6b5220" stroke-width="3"/>' +
    '</g>';
  var CHEST = '<svg viewBox="0 0 120 100" xmlns="' + NS + '" aria-hidden="true">' +
    '<path d="M14 44 Q14 18 60 18 Q106 18 106 44 Z" fill="#b8741a" stroke="#5a3608" stroke-width="4"/>' +
    '<rect x="14" y="44" width="92" height="44" rx="4" fill="#d08a2a" stroke="#5a3608" stroke-width="4"/>' +
    '<rect x="14" y="40" width="92" height="9" fill="#f2c94c" stroke="#5a3608" stroke-width="3"/>' +
    '<rect x="52" y="44" width="16" height="20" rx="3" fill="#f2c94c" stroke="#5a3608" stroke-width="3"/>' +
    '<circle cx="60" cy="54" r="3" fill="#5a3608"/>' +
    '<path d="M30 18 L28 8 M60 14 L60 2 M90 18 L92 8" stroke="#f2c94c" stroke-width="4" stroke-linecap="round"/></svg>';

  function cellFromEvent(svg, ev, N) {
    var r = svg.getBoundingClientRect(), vb = N * 100 + 12;
    var x = ((ev.clientX - r.left) / r.width) * vb - 6, y = ((ev.clientY - r.top) / r.height) * vb - 6;
    x = Math.floor(x / 100); y = Math.floor(y / 100);
    if (x < 0 || y < 0 || x >= N || y >= N) return null;
    return [x, y];
  }

  function symChip(code, withName) {
    var s = S.BY_CODE[code];
    return '<span class="chip" data-code="' + code + '">' + S.svg(s.id, { cls: "chip-svg" }) + (withName ? '<span class="chip-name">' + s.name + "</span>" : "") + "</span>";
  }

  // ---------------- がめん きりかえ ----------------
  var VIEWS = ["home", "cards", "stages", "hunt", "maker", "zukan"];
  var current = "home", backTo = null;
  function show(v, title, back) {
    VIEWS.forEach(function (n) { $(n).hidden = n !== v; });
    current = v; backTo = back || null;
    $("backBtn").hidden = !backTo;
    $("titleEmoji").hidden = !!title;
    $("titleText").innerHTML = title || "ちずきごう たからさがし";
    $("learnCount").textContent = learnedCount();
    document.body.dataset.view = v;
  }
  $("backBtn").addEventListener("click", function () { sound.tap(); closeModal(); if (backTo) backTo(); });
  $("zukanBtn").addEventListener("click", function () { sound.tap(); closeModal(); var b = current === "zukan" ? backTo : (function (v, t, bk) { return function () { show(v, t, bk); if (v === "stages") renderStages(); }; })(current, $("titleText").innerHTML, backTo); openZukan(b || goHome); });

  function goHome() {
    show("home");
    var st = 0; for (var k in save.stars) st += save.stars[k];
    $("starTotal").textContent = st ? "★ " + st + " / " + STAGES.length * 3 : "";
    $("heroMap").innerHTML = mapSvg(["J.t..", "..t.P", "=E===", "S..n.", ".w..T"]);
  }
  $("goCards").addEventListener("click", function () { sound.tap(); startCards(); });
  $("goStages").addEventListener("click", function () { sound.tap(); openStages(); });
  $("goMaker").addEventListener("click", function () { sound.tap(); openMaker(); });

  // ---------------- モーダル ----------------
  function openModal(art, title, body, btns) {
    $("modalArt").innerHTML = art || ""; $("modalTitle").innerHTML = title; $("modalBody").innerHTML = body || "";
    var box = $("modalBtns"); box.innerHTML = "";
    btns.forEach(function (b) {
      var e = el("button", "big" + (b.sub ? " sub" : ""), b.label); e.id = b.id || "";
      e.addEventListener("click", function () { sound.tap(); closeModal(); b.go(); }); box.appendChild(e);
    });
    $("modal").hidden = false;
  }
  function closeModal() { $("modal").hidden = true; }

  // ============================================================
  //  1. きごう カード
  // ============================================================
  var quiz = null;
  function pickQuestions() {
    var all = S.SYMBOLS.slice();
    // おぼえて いない もの → せいかいが すくない もの を さきに
    shuffle(all).sort(function (a, b) { return (save.right[a.id] || 0) - (save.right[b.id] || 0); });
    return all.slice(0, 10).map(function (s, i) { return { id: s.id, type: i % 2 ? "name" : "sym" }; });
  }
  function distractors(id) {
    // いちばん にて いる なかま（CONFUSE の さきに ある グループ）から じゅんに 2つ
    var pool = [];
    S.CONFUSE.forEach(function (g) { if (g.indexOf(id) >= 0) shuffle(g.slice()).forEach(function (x) { if (x !== id && pool.indexOf(x) < 0) pool.push(x); }); });
    pool = pool.slice(0, 2);
    shuffle(S.SYMBOLS.map(function (s) { return s.id; })).forEach(function (x) { if (pool.length < 3 && x !== id && pool.indexOf(x) < 0) pool.push(x); });
    return pool;
  }
  function startCards() {
    quiz = { list: pickQuestions(), i: 0, ok: 0, wrong: [], retry: false, newly: [] };
    show("cards", "きごう カード", goHome);
    askCard();
  }
  function askCard() {
    var q = quiz.list[quiz.i], s = S.BY_ID[q.id];
    $("qBar").style.width = (quiz.i / quiz.list.length * 100) + "%";
    $("qNum").textContent = (quiz.i + 1) + " / " + quiz.list.length;
    $("qAgain").hidden = !q.again;
    $("qFeed").hidden = true;
    var box = $("qBox"), ch = $("choices");
    var opts = shuffle([q.id].concat(distractors(q.id)));
    ch.innerHTML = ""; ch.className = "choices " + (q.type === "sym" ? "names" : "syms");
    if (q.type === "sym") box.innerHTML = '<p class="qtext">この きごうは なに？</p><div class="qsym">' + S.svg(q.id) + "</div>";
    else box.innerHTML = '<p class="qtext"><b class="qname">' + rb(s.kanji) + "</b> の きごうは どれ？</p>";
    opts.forEach(function (id) {
      var b = el("button", "choice", q.type === "sym" ? S.BY_ID[id].name : S.svg(id));
      b.dataset.id = id; if (q.type !== "sym") b.setAttribute("aria-label", S.BY_ID[id].name);
      b.addEventListener("click", function () { answerCard(b, id); });
      ch.appendChild(b);
    });
  }
  function answerCard(btn, id) {
    if (!$("qFeed").hidden) return;
    var q = quiz.list[quiz.i], s = S.BY_ID[q.id], ok = id === q.id;
    Array.prototype.forEach.call($("choices").children, function (b) {
      b.disabled = true;
      if (b.dataset.id === q.id) b.classList.add("right");
    });
    if (ok) {
      sound.good(); quiz.ok += q.again ? 0 : 1;
      var was = learned(q.id); save.right[q.id] = (save.right[q.id] || 0) + 1; store();
      if (!was && learned(q.id)) quiz.newly.push(q.id);
      $("qFeedHead").innerHTML = "⭕ せいかい！" + (learned(q.id) && !was ? " <span class=\"new\">ずかんに とうろく！</span>" : "");
    } else {
      sound.miss(); btn.classList.add("wrong");
      if (!q.again || quiz.list.filter(function (x) { return x.id === q.id; }).length < 3)
        quiz.list.push({ id: q.id, type: q.type, again: true }); // あとで もういちど
      $("qFeedHead").innerHTML = "おしい！ こたえは これ。<span class=\"later\">あとで もういちど でるよ</span>";
    }
    $("qFeed").className = "feed " + (ok ? "ok" : "ng");
    $("qFeedSym").innerHTML = S.svg(q.id);
    $("qFeedName").innerHTML = rb(s.kanji);
    $("qFeedWhy").innerHTML = "<b>なぜ この かたち？</b> " + rb(s.why);
    $("qFeed").hidden = false;
    $("learnCount").textContent = learnedCount();
    setTimeout(function () { $("qNext").focus({ preventScroll: true }); }, 0);
  }
  $("qNext").addEventListener("click", function () {
    sound.tap(); quiz.i++;
    if (quiz.i < quiz.list.length) { askCard(); return; }
    $("qBar").style.width = "100%";
    var first = quiz.list.filter(function (x) { return !x.again; }).length;
    var body = '<p class="big-num">' + quiz.ok + " / " + first + " もん せいかい</p>";
    if (quiz.newly.length) body += '<p>ずかんに とうろく した きごう</p><div class="mini-row">' + quiz.newly.map(function (id) { return S.svg(id); }).join("") + "</div>";
    body += "<p>おぼえた きごう <b>" + learnedCount() + " / " + S.SYMBOLS.length + "</b></p>";
    openModal('<div class="modal-emoji">🃏</div>', "カード おしまい！", body, [
      { label: "もういちど", go: startCards, id: "cardsAgain" },
      { label: "📖 ずかんを みる", sub: true, go: function () { openZukan(goHome); } },
      { label: "ホームへ", sub: true, go: goHome }
    ]);
  });

  // ============================================================
  //  ずかん
  // ============================================================
  function openZukan(back) {
    show("zukan", "📖 きごう ずかん", back);
    $("zukanLead").innerHTML = "おぼえた きごう <b>" + learnedCount() + " / " + S.SYMBOLS.length + "</b>　（カードで 2かい せいかい すると ⭐ が つくよ）";
    var g = $("zukanGrid"); g.innerHTML = "";
    S.SYMBOLS.forEach(function (s) {
      var c = el("div", "zcard" + (learned(s.id) ? " got" : ""),
        '<div class="zsym">' + S.svg(s.id) + "</div>" +
        '<div class="ztext"><p class="zname">' + rb(s.kanji) + (learned(s.id) ? ' <span class="zstar">⭐</span>' : "") + "</p>" +
        '<p class="zwhy">' + rb(s.why) + "</p></div>");
      g.appendChild(c);
    });
  }

  // ============================================================
  //  2. たからさがし
  // ============================================================
  function unlocked(i) { return i === 0 || save.stars[STAGES[i - 1].id] > 0; }
  function openStages() { show("stages", "💎 たからさがし", goHome); renderStages(); }
  function renderStages() {
    var g = $("stageGrid"); g.innerHTML = "";
    STAGES.forEach(function (st, i) {
      var open = unlocked(i), stars = save.stars[st.id] || 0;
      var b = el("button", "stage-btn" + (open ? "" : " locked") + (st.dirs === 8 ? " d8" : ""),
        '<span class="sno">' + st.id + "</span>" +
        '<span class="stitle">' + (open ? st.title : "🔒") + "</span>" +
        '<span class="smeta">' + st.dirs + "ほうい・ヒント " + st.hints.length + "</span>" +
        '<span class="sstars">' + "★★★".slice(0, stars) + '<i>' + "★★★".slice(stars) + "</i></span>");
      b.disabled = !open; b.dataset.stage = st.id;
      b.addEventListener("click", function () { sound.tap(); startHunt(i); });
      g.appendChild(b);
    });
  }

  var hunt = null;
  function startHunt(idx) {
    var st = STAGES[idx], sol = R.solve(st);
    hunt = { idx: idx, st: st, sol: sol, pos: st.start.slice(), hint: 0, miss: 0, missHere: 0, busy: false, n: 1, holes: [], done: false };
    show("hunt", "💎 " + st.id + ". " + st.title, openStages);
    buildPad(st.dirs);
    drawHunt(); renderHints();
    say(st.id === 8 ? "ここから 8ほうい！ ななめに すすむ ときも 1マス だよ" : "ヒントを よんで、たんけんたいを うごかそう");
    if (st.id === 1) say("ヒントの ばしょに ついたら「ここだ！」を おしてね");
  }
  function say(t, cls) { var m = $("huntMsg"); m.innerHTML = t; m.className = "msg" + (cls ? " " + cls : ""); }

  function drawHunt() {
    var st = hunt.st, N = st.map.length, extra = "";
    // ついた チェックポイント（はた）
    hunt.sol.path.slice(0, hunt.hint).forEach(function (p, i) {
      extra += '<g transform="translate(' + p.pos[0] * 100 + " " + p.pos[1] * 100 + ')" class="flag"><path d="M28 86 L28 18" stroke="#5a3608" stroke-width="5"/><path d="M30 18 L70 30 L30 44 Z" fill="#e03131"/><text x="48" y="36" font-size="18" fill="#fff" text-anchor="middle" font-weight="800">' + (i + 1) + "</text></g>";
    });
    hunt.holes.forEach(function (p) { extra += '<ellipse class="hole" cx="' + (p[0] * 100 + 50) + '" cy="' + (p[1] * 100 + 70) + '" rx="26" ry="11" fill="#6b4a1e" opacity=".55"/>'; });
    extra += '<rect id="glow" class="glow" width="100" height="100" rx="12" fill="none" stroke="#f59f00" stroke-width="10" visibility="hidden"/>';
    extra += '<g id="hero" class="hero" style="transform: translate(' + hunt.pos[0] * 100 + "px," + hunt.pos[1] * 100 + 'px)">' + HERO + "</g>";
    $("mapBox").innerHTML = mapSvg(st.map, extra);
    $("mapBox").dataset.pos = hunt.pos.join(",");
  }
  function moveHero() {
    var h = document.getElementById("hero");
    if (h) h.style.transform = "translate(" + hunt.pos[0] * 100 + "px," + hunt.pos[1] * 100 + "px)";
    $("mapBox").dataset.pos = hunt.pos.join(",");
  }

  function renderHints() {
    var st = hunt.st, box = $("hintList"); box.innerHTML = "";
    var pos = st.start;
    for (var i = 0; i <= Math.min(hunt.hint, st.hints.length - 1); i++) {
      var parts = R.hintParts(st, st.hints[i], i, pos, { showDir: st.showDir });
      var html = parts.map(function (p) {
        if (typeof p === "string") return rb(p);
        if (p.sym) return symChip(p.sym, st.showName);
        return '<b class="dir">' + R.DIRS[p.dir].name + "</b>";
      }).join("");
      var done = i < hunt.hint;
      var row = el("div", "hint" + (done ? " done" : " now"), '<span class="hno">' + (done ? "✓" : i + 1) + '</span><p>' + html + "</p>");
      box.appendChild(row);
      pos = hunt.sol.path[i].pos;
    }
    box.scrollTop = box.scrollHeight;
    var last = hunt.hint === st.hints.length - 1;
    $("actBtn").innerHTML = last ? "⛏️ ほる！" : "🚩 ここだ！";
    $("actBtn").classList.toggle("last", last);
    $("hunt").dataset.hint = hunt.hint;
  }
  $("hintList").addEventListener("click", function (ev) {
    var c = ev.target.closest(".chip"); if (!c) return;
    var s = S.BY_CODE[c.dataset.code]; sound.tap();
    toast(S.svg(s.id) + "<span>" + rb(s.kanji) + "</span>");
  });

  // ほういじしん つきの パッド
  function buildPad(dirs) {
    var pad = $("pad");
    Array.prototype.slice.call(pad.querySelectorAll(".dbtn")).forEach(function (b) { b.remove(); });
    var order = ["nw", "n", "ne", "w", null, "e", "sw", "s", "se"];
    order.forEach(function (k, i) {
      if (!k) return;
      var d = R.DIRS[k], b = el("button", "dbtn d-" + k, '<span class="dn">' + d.name + '</span><span class="dm">' + d.mark + "</span>");
      b.style.gridArea = (Math.floor(i / 3) + 1) + " / " + (i % 3 + 1);
      b.dataset.dir = k; b.setAttribute("aria-label", d.name + "へ すすむ");
      if (dirs === 4 && k.length === 2) b.classList.add("off");
      b.addEventListener("click", function () { if (!b.classList.contains("off")) walk(k, hunt.n); });
      pad.appendChild(b);
    });
    $("compass").innerHTML = compassSvg(dirs);
    var steps = $("steps"); steps.innerHTML = "";
    for (var n = 1; n <= 5; n++) (function (n) {
      var b = el("button", "stepn" + (n === 1 ? " on" : ""), n + "<small>マス</small>");
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", n === 1 ? "true" : "false"); b.dataset.n = n;
      b.addEventListener("click", function () {
        sound.tap(); hunt.n = n;
        Array.prototype.forEach.call(steps.children, function (c) { var on = +c.dataset.n === n; c.classList.toggle("on", on); c.setAttribute("aria-checked", on ? "true" : "false"); });
      });
      steps.appendChild(b);
    })(n);
  }
  function compassSvg(dirs) {
    var t = "";
    [["n", 0], ["e", 90], ["s", 180], ["w", 270], ["ne", 45], ["se", 135], ["sw", 225], ["nw", 315]].forEach(function (d) {
      var big = d[0].length === 1, r = big ? 44 : 34, w = big ? 9 : 6;
      if (!big && dirs === 4) return;
      t += '<path transform="rotate(' + d[1] + ' 50 50)" d="M50 ' + (50 - r) + " L" + (50 + w) + " 50 L" + (50 - w) + ' 50 Z" fill="' + (d[0] === "n" ? "#e03131" : big ? "#3b4a63" : "#8b97ab") + '"/>';
    });
    return '<svg viewBox="0 0 100 100" xmlns="' + NS + '"><circle cx="50" cy="50" r="48" fill="#fffdf4" stroke="#b8a46a" stroke-width="3"/>' + t +
      '<circle cx="50" cy="50" r="6" fill="#f2c94c" stroke="#5a3608" stroke-width="2"/></svg>';
  }

  var walking = null;
  function walk(dir, n) {
    if (!hunt || hunt.done || hunt.busy) return;
    var d = R.DIRS[dir], k = 0;
    hunt.busy = true;
    (function next() {
      var np = [hunt.pos[0] + d.dx, hunt.pos[1] + d.dy];
      if (!R.inside(hunt.st, np)) { sound.bump(); say("これ いじょう すすめないよ（ちずの はし）"); hunt.busy = false; return; }
      hunt.pos = np; moveHero(); sound.step(); k++;
      if (k < n) walking = setTimeout(next, 230);
      else { hunt.busy = false; say(d.name + " へ " + n + "マス すすんだ"); }
    })();
  }

  // ちずの マスを タップ → となり なら 1マス
  $("mapBox").addEventListener("click", function (ev) {
    if (!hunt || hunt.done || hunt.busy) return;
    var svg = $("mapBox").querySelector("svg"), c = cellFromEvent(svg, ev, hunt.st.map.length);
    if (!c) return;
    var dx = c[0] - hunt.pos[0], dy = c[1] - hunt.pos[1];
    if (!dx && !dy) { var s = S.BY_CODE[hunt.st.map[c[1]][c[0]]]; if (s) toast(S.svg(s.id) + "<span>" + rb(s.kanji) + "</span>"); return; }
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) { say("となりの マスを タップすると 1マス すすむよ"); sound.bump(); return; }
    var dir = R.dirTo(hunt.pos, c);
    if (hunt.st.dirs === 4 && dir.length === 2) { say("この ステージは ななめに すすめないよ"); sound.bump(); return; }
    walk(dir, 1);
  });

  $("actBtn").addEventListener("click", function () {
    if (!hunt || hunt.done || hunt.busy) return;
    var st = hunt.st, target = hunt.sol.path[hunt.hint].pos, last = hunt.hint === st.hints.length - 1;
    if (R.same(hunt.pos, target)) {
      hunt.missHere = 0;
      if (last) { finishHunt(); return; }
      sound.good(); hunt.hint++;
      drawHunt(); renderHints();
      say("🚩 せいかい！ つぎの ヒントだ", "ok");
      return;
    }
    hunt.miss++; hunt.missHere++;
    if (last) {
      sound.dig();
      if (!hunt.holes.some(function (p) { return R.same(p, hunt.pos); })) hunt.holes.push(hunt.pos.slice());
      drawHunt();
    } else sound.miss();
    say("🤔 ここじゃ ないみたい…" + (hunt.missHere >= 2 ? " ひかって いる ところから かんがえて みよう" : ""), "ng");
    $("mapBox").classList.remove("shake"); void $("mapBox").offsetWidth; $("mapBox").classList.add("shake");
    if (hunt.missHere >= 2) glowHelp();
  });
  // こまった ときの てがかり: ヒントの きごう（なければ ひとつ まえの ばしょ）を ひからせる
  function glowHelp() {
    var h = hunt.st.hints[hunt.hint], p;
    if (h.sym) p = R.find(hunt.st, h.sym)[0];
    else p = hunt.hint ? hunt.sol.path[hunt.hint - 1].pos : hunt.st.start;
    var g = document.getElementById("glow"); if (!g) return;
    g.setAttribute("x", p[0] * 100); g.setAttribute("y", p[1] * 100); g.setAttribute("visibility", "visible");
  }
  $("retryBtn").addEventListener("click", function () { sound.tap(); if (hunt && !hunt.busy) startHunt(hunt.idx); });

  function finishHunt() {
    hunt.done = true; sound.dig(); sound.chest();
    var st = hunt.st, stars = hunt.miss === 0 ? 3 : hunt.miss <= 2 ? 2 : 1;
    var best = Math.max(save.stars[st.id] || 0, stars); save.stars[st.id] = best; store();
    var p = st.treasure;
    var g = document.createElementNS(NS, "g");
    g.setAttribute("class", "found"); g.setAttribute("transform", "translate(" + p[0] * 100 + " " + p[1] * 100 + ")");
    g.innerHTML = '<ellipse cx="50" cy="78" rx="38" ry="14" fill="#6b4a1e" opacity=".6"/><g transform="translate(8 14) scale(.7)">' + CHEST.replace(/^<svg[^>]*>|<\/svg>$/g, "") + "</g>";
    var svg = $("mapBox").querySelector("svg"); svg.appendChild(g);
    say("💎 たからばこ だ！", "ok");
    var nextIdx = hunt.idx + 1;
    setTimeout(function () {
      var btns = [];
      if (nextIdx < STAGES.length) btns.push({ label: "つぎの ステージ ›", id: "nextStage", go: function () { startHunt(nextIdx); } });
      btns.push({ label: "もういちど", sub: true, go: function () { startHunt(hunt.idx); } });
      btns.push({ label: "ステージ えらび", sub: true, go: openStages });
      openModal('<div class="chest">' + CHEST + "</div>", "たからばこを みつけた！",
        '<p class="stars-big">' + "★★★".slice(0, stars) + "<i>" + "★★★".slice(stars) + "</i></p>" +
        "<p>" + (hunt.miss ? "まちがい " + hunt.miss + "かい" : "まちがい なし！ すごい！") + "</p>" +
        (nextIdx === STAGES.length ? "<p><b>ぜんぶの たからを みつけたね！ ちず はかせ だ！</b></p>" : ""), btns);
    }, 1300);
  }

  // ============================================================
  //  3. ちず づくり
  // ============================================================
  var make = null;
  function emptyMap() { var r = []; for (var i = 0; i < MAKE_N; i++) r.push(new Array(MAKE_N + 1).join(".")); return r; }
  function openMaker() {
    show("maker", "✏️ ちず づくり", goHome);
    if (!make) make = { tool: "P", painting: false };
    loadSlot(save.slot || 0);
    buildPalette();
  }
  function loadSlot(i) {
    save.slot = i; make.map = (save.maps[i] || emptyMap()).slice(); store();
    drawMaker(); drawSlots();
  }
  function drawSlots() {
    var box = $("slots"); box.innerHTML = "";
    [0, 1, 2].forEach(function (i) {
      var m = save.maps[i], used = m && m.join("").replace(/\./g, "").length;
      var b = el("button", "slot" + (i === save.slot ? " on" : ""), '<span class="slot-map">' + (m ? mapSvg(m) : "") + '</span><span>ちず ' + (i + 1) + (used ? "" : "<small>（から）</small>") + "</span>");
      b.setAttribute("role", "tab"); b.setAttribute("aria-selected", i === save.slot ? "true" : "false");
      b.addEventListener("click", function () { sound.tap(); loadSlot(i); });
      box.appendChild(b);
    });
  }
  function drawMaker() { $("makeBox").innerHTML = mapSvg(make.map); }
  function buildPalette() {
    var p = $("palette"); p.innerHTML = "";
    S.SYMBOLS.concat([{ code: ".", name: "けす" }]).forEach(function (s) {
      var b = el("button", "pal" + (make.tool === s.code ? " on" : ""),
        (s.code === "." ? '<span class="eraser">🧽</span>' : S.svg(s.id)) + '<span class="pal-name">' + (s.short || s.name) + "</span>");
      b.dataset.code = s.code; b.setAttribute("aria-label", s.name);
      b.addEventListener("click", function () {
        sound.tap(); make.tool = s.code;
        Array.prototype.forEach.call(p.children, function (c) { c.classList.toggle("on", c.dataset.code === s.code); });
        $("makeTip").innerHTML = s.code === "." ? "けしたい マスを タップ" : "<b>" + s.name + "</b> を おく マスを タップ（なぞっても OK）";
      });
      p.appendChild(b);
    });
  }
  function paint(ev) {
    var svg = $("makeBox").querySelector("svg"), c = cellFromEvent(svg, ev, MAKE_N);
    if (!c) return;
    var row = make.map[c[1]];
    if (row[c[0]] === make.tool) return;
    make.map[c[1]] = row.slice(0, c[0]) + make.tool + row.slice(c[0] + 1);
    save.maps[save.slot] = make.map.slice(); store();
    drawMaker(); sound.place();
    if (make.tool !== ".") { var s = S.BY_CODE[make.tool]; toast(S.svg(s.id) + "<span>" + rb(s.kanji) + "</span>"); }
  }
  $("makeBox").addEventListener("pointerdown", function (ev) { make.painting = true; paint(ev); try { $("makeBox").setPointerCapture(ev.pointerId); } catch (e) { /* なくても よい */ } });
  $("makeBox").addEventListener("pointermove", function (ev) { if (make && make.painting) paint(ev); });
  ["pointerup", "pointercancel", "pointerleave"].forEach(function (n) { $("makeBox").addEventListener(n, function () { if (make) { make.painting = false; drawSlots(); } }); });
  $("clearMap").addEventListener("click", function () {
    sound.tap();
    openModal('<div class="modal-emoji">🗑️</div>', "ちず " + (save.slot + 1) + " を ぜんぶ けす？", "", [
      { label: "けす", id: "clearYes", go: function () { save.maps[save.slot] = null; store(); loadSlot(save.slot); } },
      { label: "やめる", sub: true, go: function () {} }
    ]);
  });

  // ---------------- はじめ ----------------
  paintSound();
  goHome();
})();
