/* ============================================================
   おんぷ ピアノ — うごき
   ============================================================ */
(function () {
  "use strict";
  var M = window.OnpuMusic, S = window.OnpuStaff, A = window.OnpuAudio;
  var $ = function (id) { return document.getElementById(id); };
  var TEMPOS = [60, 84, 108];

  /* ---------- ほぞん ---------- */
  var KEY = "onpu-piano-v1";
  var save = { sound: true, doremi: true, tempo: 1, yomi: { easy: 0, hard: 0 }, mato: 0, rhythm: {}, songs: {}, recs: [] };
  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") Object.keys(save).forEach(function (k) { if (k in raw) save[k] = raw[k]; });
  } catch (e) { /* よめなくても あそべる */ }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* いっぱい など */ } }

  function starStr(n, max) {
    var s = "";
    for (var i = 0; i < (max || 3); i++) s += i < n ? "★" : "☆";
    return s;
  }

  /* ============================================================
     けんばん
     ============================================================ */
  var kb = $("kb"), keysArea = $("keysArea");
  var view = { full: true, oct: 4, lock: false, pcOct: 4 };
  var keyEls = {};
  var held = {};                     // なまえ → おさえて いる ゆびの かず
  var nextNote = null;               // ひかって いる けんばん
  var forceNoDoremi = false;
  var keysMode = "none";             // "kb" | "tap" | "none"

  function visibleRange() {
    return view.full ? [M.LOW, M.HIGH] : ["C" + view.oct, "C" + (view.oct + 1)];
  }
  function pcBase() { return view.full ? view.pcOct : view.oct; }

  function pcLabel(name) {
    for (var code in M.KEYMAP) if (M.noteForCode(code, pcBase()) === name) return M.KEYLABEL[code];
    return "";
  }

  function renderKb() {
    var r = visibleRange();
    var names = M.keyRange(r[0], r[1]);
    var whites = names.filter(function (n) { return !M.isBlack(n); });
    var ww = 100 / whites.length;
    kb.innerHTML = "";
    keyEls = {};
    var wi = 0;
    names.forEach(function (n) {
      var el = document.createElement("div");
      el.dataset.note = n;
      if (M.isBlack(n)) {
        el.className = "key black";
        el.style.left = (wi * ww - ww * 0.31) + "%";
        el.style.width = (ww * 0.62) + "%";
        el.innerHTML = '<span class="pc">' + pcLabel(n) + "</span>";
      } else {
        el.className = "key white";
        wi++;
        el.innerHTML = (n === "C4" ? '<span class="mid" title="まんなかの ド"></span>' : "") +
          '<span class="pc">' + pcLabel(n) + '</span><span class="lbl">' + M.doremi(n) + "</span>";
      }
      kb.appendChild(el);
      keyEls[n] = el;
    });
    Object.keys(held).forEach(function (n) { if (keyEls[n]) keyEls[n].classList.add("on"); });
    if (nextNote && keyEls[nextNote]) keyEls[nextNote].classList.add("next");
    kb.classList.toggle("no-doremi", !save.doremi || forceNoDoremi);
    $("octBar").hidden = view.full;
    $("octDown").disabled = view.lock || view.oct <= 4;
    $("octUp").disabled = view.lock || view.oct >= 5;
    $("octLabel").textContent = view.oct === 4 ? "まんなか の ド から" : "たかい ド から";
  }

  function layoutKb() {
    // しろけん 15こ が 52px いじょう で ならぶ なら 2オクターブ、ちがえば 1オクターブ ＋ きりかえ
    var full = (keysArea.clientWidth || window.innerWidth) - 12 >= 15 * 52;
    view.full = full;
    renderKb();
  }

  function setOct(o) {
    o = Math.max(4, Math.min(5, o));
    if (o === view.oct) return;
    view.oct = o;
    if (!view.full) renderKb();
  }

  /** そのおとが みえる ように する（たてもち で 1オクターブ の とき） */
  function reveal(name) {
    if (view.full || !name) return;
    var m = M.midiOf(name), lo = M.midiOf("C" + view.oct);
    if (m >= lo && m <= lo + 12) return;
    setOct(m > M.midiOf("C5") ? 5 : 4);
  }

  function setNext(name) {
    if (nextNote && keyEls[nextNote]) keyEls[nextNote].classList.remove("next");
    nextNote = name;
    if (name) { reveal(name); if (keyEls[name]) keyEls[name].classList.add("next"); }
  }

  function flash(name, cls) {
    var el = keyEls[name];
    if (!el) return;
    el.classList.remove("good", "bad");
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, 380);
  }

  function lightDemo(name, on) {
    if (on) reveal(name);
    var el = keyEls[name];
    if (el) el.classList.toggle("demo", on);
  }

  var mode = null;                   // いまの あそび: { onNote, onTap, exit }

  function press(name) {
    A.noteOn(name);
    held[name] = (held[name] || 0) + 1;
    if (keyEls[name]) keyEls[name].classList.add("on");
    rec.down(name);
    if (mode && mode.onNote) mode.onNote(name);
  }

  function release(name) {
    if (!held[name]) return;
    held[name]--;
    if (held[name] > 0) return;
    delete held[name];
    A.noteOff(name);
    if (keyEls[name]) keyEls[name].classList.remove("on");
    rec.up(name);
  }

  function releaseAll() {
    Object.keys(held).forEach(function (n) { held[n] = 1; release(n); });
    pointers = {};
    pcDown = {};
  }

  // マルチタッチ ＋ なぞり（グリッサンド）
  var pointers = {};
  function noteAt(x, y) {
    var el = document.elementFromPoint(x, y);
    el = el && el.closest ? el.closest(".key") : null;
    return el && kb.contains(el) ? el.dataset.note : null;
  }
  kb.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    A.ensure();
    try { kb.setPointerCapture(e.pointerId); } catch (err) { /* ふるい ブラウザ */ }
    var n = noteAt(e.clientX, e.clientY);
    pointers[e.pointerId] = n;
    if (n) press(n);
  });
  kb.addEventListener("pointermove", function (e) {
    if (!(e.pointerId in pointers)) return;
    var n = noteAt(e.clientX, e.clientY), old = pointers[e.pointerId];
    if (n === old) return;
    pointers[e.pointerId] = n;
    if (old) release(old);
    if (n) press(n);
  });
  function lift(e) {
    if (!(e.pointerId in pointers)) return;
    var old = pointers[e.pointerId];
    delete pointers[e.pointerId];
    if (old) release(old);
  }
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) { kb.addEventListener(ev, lift); });
  kb.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  $("octDown").addEventListener("click", function () { setOct(view.oct - 1); });
  $("octUp").addEventListener("click", function () { setOct(view.oct + 1); });

  // リズムの タップ
  var tapPad = $("tapPad");
  tapPad.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    A.ensure();
    tapPad.classList.add("hit");
    setTimeout(function () { tapPad.classList.remove("hit"); }, 90);
    if (mode && mode.onTap) mode.onTap();
  });

  // PC の キーボード
  var pcDown = {};
  document.addEventListener("keydown", function (e) {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (keysMode === "tap") {
      if (e.code === "Space" || e.code in M.KEYMAP) {
        e.preventDefault();
        A.ensure();
        if (mode && mode.onTap) mode.onTap();
      }
      return;
    }
    if (keysMode !== "kb") return;
    if (e.code === "KeyZ" || e.code === "KeyX") {
      var d = e.code === "KeyZ" ? -1 : 1;
      if (view.full) { view.pcOct = Math.max(4, Math.min(5, view.pcOct + d)); renderKb(); }
      else if (!view.lock) setOct(view.oct + d);
      return;
    }
    var n = M.noteForCode(e.code, pcBase());
    if (!n) return;
    e.preventDefault();
    A.ensure();
    pcDown[e.code] = n;
    press(n);
  });
  document.addEventListener("keyup", function (e) {
    var n = pcDown[e.code];
    if (!n) return;
    delete pcDown[e.code];
    release(n);
  });
  window.addEventListener("blur", releaseAll);

  /* ============================================================
     がめん の きりかえ
     ============================================================ */
  var TITLES = { home: "🎹 おんぷ ピアノ", yomiMenu: "🎼 おんぷ よみ", yomi: "🎼 おんぷ よみ", mato: "🎯 まとあて",
    rhythmMenu: "🥁 リズム", rhythm: "🥁 リズム", songMenu: "🎶 きょく れんしゅう", song: "🎶 きょく れんしゅう", free: "🎙️ じゆう えんそう" };
  var PARENT = { yomiMenu: "home", yomi: "yomiMenu", mato: "yomiMenu", rhythmMenu: "home", rhythm: "rhythmMenu",
    songMenu: "home", song: "songMenu", free: "home" };
  var current = "home";

  function show(id, keys) {
    if (mode && mode.exit) mode.exit();
    mode = null;
    releaseAll();
    hideResult();
    setNext(null);
    forceNoDoremi = false;
    view.lock = false;
    document.querySelectorAll(".screen").forEach(function (s) { s.hidden = s.id !== id; });
    current = id;
    $("title").textContent = TITLES[id] || TITLES.home;
    $("backBtn").hidden = id === "home";
    keysMode = keys || "none";
    keysArea.hidden = keysMode === "none";
    kb.hidden = keysMode !== "kb";
    tapPad.hidden = keysMode !== "tap";
    if (keysMode === "kb") layoutKb();
    if (keysMode === "tap") $("octBar").hidden = true;
    $("stage").scrollTop = 0;
    if (id === "home") refreshHome();
  }

  $("backBtn").addEventListener("click", function () { goMenu(PARENT[current] || "home"); });
  document.querySelectorAll("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () { A.ensure(); goMenu(b.dataset.go); });
  });

  function goMenu(id) {
    if (id === "free") return startFree();
    show(id);
    if (id === "yomiMenu") refreshYomiMenu();
    if (id === "rhythmMenu") buildRhythmMenu();
    if (id === "songMenu") buildSongMenu();
  }

  /* ---------- けっか ---------- */
  var resultAgain = null, resultBack = null;
  function showResult(stars, text, again, back) {
    var h = "";
    for (var i = 0; i < 3; i++) h += i < stars ? "★" : '<span class="off">★</span>';
    $("resultStars").innerHTML = h;
    $("resultText").innerHTML = text;
    resultAgain = again; resultBack = back;
    $("result").hidden = false;
    A.jingle("clear");
  }
  function hideResult() { $("result").hidden = true; }
  $("resultAgain").addEventListener("click", function () { hideResult(); if (resultAgain) resultAgain(); });
  $("resultBack").addEventListener("click", function () { hideResult(); if (resultBack) resultBack(); });

  /* ---------- せってい ---------- */
  function refreshToggles() {
    $("soundBtn").textContent = save.sound ? "🔊" : "🔇";
    $("soundBtn").setAttribute("aria-pressed", save.sound ? "true" : "false");
    $("soundBtn").setAttribute("aria-label", save.sound ? "おと オン" : "おと オフ");
    $("doremiBtn").setAttribute("aria-pressed", save.doremi ? "true" : "false");
    kb.classList.toggle("no-doremi", !save.doremi || forceNoDoremi);
    document.querySelectorAll("[data-tempo]").forEach(function (b) {
      b.setAttribute("aria-pressed", +b.dataset.tempo === save.tempo ? "true" : "false");
    });
  }
  $("soundBtn").addEventListener("click", function () {
    save.sound = !save.sound;
    A.setOn(save.sound);
    persist(); refreshToggles();
  });
  $("doremiBtn").addEventListener("click", function () {
    save.doremi = !save.doremi;
    persist(); refreshToggles();
    if (mode && mode.onDoremi) mode.onDoremi();
  });
  document.querySelectorAll("[data-tempo]").forEach(function (b) {
    b.addEventListener("click", function () { save.tempo = +b.dataset.tempo; persist(); refreshToggles(); });
  });

  function refreshHome() {
    var ys = (save.yomi.easy || 0) + (save.yomi.hard || 0);
    $("subYomi").textContent = "★ " + ys + " / 6" + (save.mato ? "・🎯 " + save.mato : "");
    var rs = 0; Object.keys(save.rhythm).forEach(function (k) { rs += save.rhythm[k]; });
    $("subRhythm").textContent = "★ " + rs + " / " + M.RHYTHMS.length * 3;
    var ss = 0; Object.keys(save.songs).forEach(function (k) { ss += save.songs[k]; });
    $("subSong").textContent = "★ " + ss + " / " + M.SONGS.length * 3;
  }

  /* ============================================================
     1. おんぷ よみ
     ============================================================ */
  function refreshYomiMenu() {
    $("starYomiEasy").textContent = starStr(save.yomi.easy || 0);
    $("starYomiHard").textContent = starStr(save.yomi.hard || 0);
    $("bestMato").textContent = save.mato ? "さいこう 🎯 " + save.mato : "";
  }
  document.querySelectorAll("[data-yomi]").forEach(function (b) {
    b.addEventListener("click", function () {
      A.ensure();
      if (b.dataset.yomi === "mato") startMato(); else startYomi(b.dataset.yomi);
    });
  });

  function drawSingle(svg, name, opts) {
    opts = opts || {};
    var h = S.lines(0, 126) + S.clef(2);
    h += '<g class="' + (opts.hit ? "hit" : "") + '">' + S.note(82, name, 1, { color: opts.color }) + "</g>";
    if (opts.label) {
      h += '<text x="82" y="78" text-anchor="middle" font-size="15" font-weight="800" fill="#862e9c">' + opts.label + "</text>";
    }
    svg.innerHTML = h;
  }

  function startYomi(level) {
    var pool = level === "easy" ? M.keyRange("C4", "C5", true) : M.keyRange(M.LOW, M.HIGH, true);
    show("yomi", "kb");
    forceNoDoremi = level === "hard";
    if (level === "easy") { view.oct = 4; view.lock = true; }
    renderKb();
    var st = { q: 0, misses: 0, qMiss: 0, cur: null, lock: false };
    var svg = $("yomiSvg"), msg = $("yomiMsg");

    function say(t, cls) { msg.textContent = t; msg.className = "msg" + (cls ? " " + cls : ""); }
    function ask() {
      st.cur = M.pickNote(pool, st.cur);
      st.qMiss = 0; st.lock = false;
      $("yomiCount").textContent = (st.q + 1) + " / 10";
      $("yomiMiss").textContent = st.misses ? "✖ " + st.misses : "";
      setNext(null);
      drawSingle(svg, st.cur);
      say("この おんぷ は どれ？");
    }
    function finish() {
      var stars = M.starsForMisses(st.misses);
      if (stars > (save.yomi[level] || 0)) { save.yomi[level] = stars; persist(); }
      showResult(stars, "10もん クリア！<br>まちがい " + st.misses + " かい",
        function () { startYomi(level); }, function () { goMenu("yomiMenu"); });
    }
    var me = mode = {
      onNote: function (n) {
        if (st.lock) return;
        if (n === st.cur) {
          st.lock = true;
          flash(n, "good");
          setNext(null);
          say("せいかい！ " + M.doremi(n), "good");
          drawSingle(svg, st.cur, { color: "#2f9e44", label: M.doremi(n) });
          st.q++;
          setTimeout(function () { if (mode === me) { if (st.q >= 10) finish(); else ask(); } }, 750);
          return;
        }
        st.misses++; st.qMiss++;
        flash(n, "bad");
        $("yomiMiss").textContent = "✖ " + st.misses;
        svg.classList.remove("shake"); void svg.getBoundingClientRect(); svg.classList.add("shake");
        var same = M.doremi(n) === M.doremi(st.cur);
        say(same ? "おしい！ たかさ が ちがうよ" : "ちがうよ。もういちど", "bad");
        if (st.qMiss >= 2) {
          drawSingle(svg, st.cur, { label: M.doremi(st.cur) });
          setNext(st.cur);
        }
      },
      id: "yomi"
    };
    st.q = 0;
    ask();
  }

  /* ---------- まとあて ---------- */
  function startMato() {
    var pool = M.keyRange("C4", "C5", true);
    show("mato", "kb");
    view.oct = 4; view.lock = true;
    renderKb();
    var svg = $("matoSvg"), msg = $("matoMsg"), btn = $("matoStart");
    // がめんの よこはば に あわせて ごせんの ながさを きめる（たてもち でも おんぷ が ちいさく ならない）
    var box = svg.parentNode, aspect = (box.clientWidth || 400) / (box.clientHeight || 128);
    var TARGET = 46, SPAWN_X = Math.round(Math.max(210, Math.min(420, 128 * aspect)));
    svg.setAttribute("viewBox", "-6 -44 " + (SPAWN_X + 6) + " 128");
    var g = { run: false, notes: [], score: 0, life: 3, speed: 30, lastSpawn: 0, last: 0, raf: 0, prev: null };
    svg.innerHTML = S.lines(0, SPAWN_X - 6) + S.clef(2) +
      '<line x1="' + TARGET + '" y1="-34" x2="' + TARGET + '" y2="74" stroke="#f08c00" stroke-width="2" stroke-dasharray="4 4"/>' +
      '<g id="matoNotes"></g>';
    var layer = svg.querySelector("#matoNotes");

    function hud() {
      $("matoScore").textContent = g.score;
      $("matoLife").textContent = "❤️".repeat(g.life) + "🤍".repeat(3 - g.life);
    }
    function say(t, cls) { msg.textContent = t; msg.className = "msg" + (cls ? " " + cls : ""); }
    function paintTarget() {
      g.notes.forEach(function (n, i) {
        var color = i === 0 ? "#862e9c" : S.INK;
        n.el.innerHTML = S.note(0, n.name, 1, { color: color });
      });
    }
    function spawn() {
      var name = M.pickNote(pool, g.prev);
      g.prev = name;
      var el = document.createElementNS("http://www.w3.org/2000/svg", "g");
      layer.appendChild(el);
      g.notes.push({ name: name, x: SPAWN_X, el: el });
      paintTarget();
    }
    function frame(ts) {
      if (!g.run) return;
      var dt = Math.min(0.05, (ts - (g.last || ts)) / 1000);
      g.last = ts;
      g.notes.forEach(function (n) { n.x -= g.speed * dt; n.el.setAttribute("transform", "translate(" + n.x.toFixed(1) + ",0)"); });
      var tail = g.notes[g.notes.length - 1];
      if (!tail || tail.x < SPAWN_X - Math.max(58, Math.min(130, SPAWN_X / 3) - g.speed / 2)) spawn();
      if (g.notes.length && g.notes[0].x < TARGET) {
        var gone = g.notes.shift();
        gone.el.remove();
        g.life--;
        hud(); paintTarget();
        say("にげられた！ " + M.doremi(gone.name) + " だったよ", "bad");
        if (g.life <= 0) return end();
      }
      g.raf = requestAnimationFrame(frame);
    }
    function begin() {
      g.notes.forEach(function (n) { n.el.remove(); });
      g.notes = []; g.score = 0; g.life = 3; g.speed = 30; g.last = 0; g.run = true;
      btn.hidden = true;
      hud(); say("いちばん ひだり の おんぷ を ねらおう");
      spawn();
      g.raf = requestAnimationFrame(frame);
    }
    function end() {
      g.run = false;
      setNext(null);
      var best = g.score > (save.mato || 0);
      if (best) { save.mato = g.score; persist(); }
      var stars = g.score >= 30 ? 3 : g.score >= 15 ? 2 : g.score >= 5 ? 1 : 0;
      showResult(stars, "🎯 " + g.score + " こ あてたよ！" + (best ? "<br>さいこう きろく！" : "<br>さいこう " + save.mato + " こ"),
        begin, function () { goMenu("yomiMenu"); });
    }
    mode = {
      id: "mato",
      onNote: function (n) {
        if (!g.run || !g.notes.length) return;
        var t = g.notes[0];
        if (n !== t.name) {
          flash(n, "bad");
          say("ちがうよ！", "bad");
          return;
        }
        g.notes.shift();
        flash(n, "good");
        t.el.innerHTML = S.note(0, t.name, 1, { color: "#2f9e44" });
        t.el.firstChild.setAttribute("class", "hit");
        setTimeout(function () { t.el.remove(); }, 400);
        g.score++;
        g.speed = Math.min(95, 30 + g.score * 1.8);
        hud(); paintTarget();
        say(M.doremi(n) + "！", "good");
      },
      exit: function () { g.run = false; cancelAnimationFrame(g.raf); }
    };
    btn.hidden = false;
    btn.onclick = function () { A.ensure(); begin(); };
    hud();
    say("おんぷ が みぎ から ながれて くるよ");
  }

  /* ============================================================
     2. リズム
     ============================================================ */
  var RX0 = 50, RBEAT = 86;          // さいしょの はく の x と、1ぱく の はば
  function rhythmSvg(pattern, opts) {
    opts = opts || {};
    var h = '<line x1="0" y1="20" x2="400" y2="20" stroke="' + S.INK + '" stroke-width="1.4"/>' +
      S.barline(0) + S.barline(400, true);
    h += '<text x="16" y="16" text-anchor="middle" font-size="17" font-weight="800" fill="' + S.INK + '">4</text>' +
      '<text x="16" y="36" text-anchor="middle" font-size="17" font-weight="800" fill="' + S.INK + '">4</text>';
    var t = 0, ni = 0, pend = null;
    pattern.forEach(function (k, i) {
      var x = RX0 + t * RBEAT + (M.DUR[k] >= 2 ? 0 : 0);
      var isRest = k.charAt(k.length - 1) === "r";
      var color = opts.colors && opts.colors[i] || S.INK;
      if (isRest) {
        h += S.rest(x, M.DUR[k], { color: color });
      } else {
        var eighth = k === "e";
        var p = S.noteParts(x, "B4", M.DUR[k], { stemUp: true, stemLen: 34, noFlag: eighth, color: color });
        h += p.svg;
        if (eighth) {
          if (pend && Math.floor(pend.t) === Math.floor(t)) { h += S.beam(pend.x, p.stemX, p.stemEnd, S.INK); pend = null; }
          else pend = { x: p.stemX, t: t };
        }
        if (opts.marks) {
          var mk = opts.marks[ni];
          var mc = { "◎": "#2f9e44", "○": "#1971c2", "△": "#f08c00", "×": "#e03131" }[mk];
          h += '<text x="' + x + '" y="64" text-anchor="middle" font-size="22" font-weight="800" fill="' + mc + '">' + mk + "</text>";
        }
        ni++;
      }
      t += M.DUR[k];
    });
    for (var b = 0; b < 4; b++) {
      h += '<circle cx="' + (RX0 + b * RBEAT) + '" cy="-26" r="3" fill="#e7d2ef"/>';
    }
    if (opts.playhead) h += '<line id="rhHead" x1="-20" y1="-34" x2="-20" y2="44" stroke="#f08c00" stroke-width="3" stroke-linecap="round" opacity=".8"/>';
    return h;
  }

  function buildRhythmMenu() {
    refreshToggles();
    var list = $("rhythmList");
    list.innerHTML = "";
    M.RHYTHMS.forEach(function (p, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "rcard";
      b.innerHTML = '<span class="r-top"><span>' + (i + 1) + '</span><span class="r-star">' + starStr(save.rhythm[i] || 0) +
        '</span></span><svg viewBox="-10 -34 420 80" aria-hidden="true">' + rhythmSvg(p) + "</svg>";
      b.addEventListener("click", function () { A.ensure(); startRhythm(i); });
      list.appendChild(b);
    });
    var lg = [["q", "4ぶ おんぷ ・1ぱく"], ["e", "8ぶ おんぷ ・はんぶん"], ["h", "2ぶ おんぷ ・2はく"],
      ["qr", "4ぶ きゅうふ ・1ぱく やすみ"], ["hr", "2ぶ きゅうふ ・2はく やすみ"]];
    $("legend").innerHTML = lg.map(function (it) {
      var k = it[0], body = '<line x1="0" y1="20" x2="40" y2="20" stroke="' + S.INK + '" stroke-width="1.2"/>';
      body += k.charAt(k.length - 1) === "r" ? S.rest(20, M.DUR[k]) : S.note(18, "B4", M.DUR[k], { stemUp: true });
      return '<div><svg viewBox="0 -24 40 72" aria-hidden="true">' + body + "</svg>" + it[1] + "</div>";
    }).join("");
  }

  function startRhythm(idx) {
    var pattern = M.RHYTHMS[idx];
    show("rhythm", "tap");
    var svg = $("rhythmSvg"), msg = $("rhythmMsg"), dots = $("beats").children;
    var onsets = M.rhythmOnsets(pattern);
    var r = { run: false, demo: false, taps: [], t0: 0, m0: 0, beat: 0, raf: 0, expected: [] };
    $("rhythmNo").textContent = "No." + (idx + 1);
    $("rhythmStar").textContent = starStr(save.rhythm[idx] || 0);
    $("rhythmNext").hidden = true;
    svg.innerHTML = rhythmSvg(pattern, { playhead: true });

    function say(t, cls) { msg.textContent = t; msg.className = "msg" + (cls ? " " + cls : ""); }
    function setDots(i) {
      for (var k = 0; k < 4; k++) {
        dots[k].className = k === i ? "on" + (k === 0 ? " first" : "") : "";
      }
    }
    function run(demo) {
      if (r.run) return;
      A.ensure();
      r.beat = 60 / TEMPOS[save.tempo];
      r.t0 = A.now() + 0.3;
      r.m0 = r.t0 + 4 * r.beat;
      r.demo = demo; r.run = true; r.taps = [];
      for (var i = 0; i < 8; i++) A.click(r.t0 + i * r.beat, i % 4 === 0);
      r.expected = onsets.map(function (o) { return r.m0 + o * r.beat; });
      if (demo) r.expected.forEach(function (t) { A.tock(t); });
      svg.innerHTML = rhythmSvg(pattern, { playhead: true });
      $("rhythmStart").disabled = $("rhythmDemo").disabled = true;
      $("rhythmNext").hidden = true;
      r.raf = requestAnimationFrame(tick);
    }
    var COUNT = ["1", "2", "3", "はい！"];
    function tick() {
      if (!r.run) return;
      var now = A.now(), bi = Math.floor((now - r.t0) / r.beat);
      setDots(bi >= 0 ? bi % 4 : -1);
      if (bi < 0) say("よーい");
      else if (bi < 4) say(COUNT[bi], "");
      else if (bi < 8) say(r.demo ? "きいてね 👂" : "タン！ タン！", "good");
      var head = svg.querySelector("#rhHead");
      if (head) {
        var x = now < r.m0 ? -20 : RX0 + (now - r.m0) / r.beat * RBEAT;
        head.setAttribute("x1", x.toFixed(1)); head.setAttribute("x2", x.toFixed(1));
      }
      if (now > r.m0 + 4 * r.beat + 0.3) return finish();
      r.raf = requestAnimationFrame(tick);
    }
    function finish() {
      r.run = false;
      setDots(-1);
      $("rhythmStart").disabled = $("rhythmDemo").disabled = false;
      if (r.demo) {
        svg.innerHTML = rhythmSvg(pattern, { playhead: true });
        say("こんどは じぶんで タップ してね");
        return;
      }
      var res = M.judgeRhythm(r.expected, r.taps, r.beat);
      var stars = M.rhythmStars(res);
      svg.innerHTML = rhythmSvg(pattern, { marks: res.marks });
      var cnt = function (m) { return res.marks.filter(function (x) { return x === m; }).length; };
      if (stars === 0) {
        say("× が あるよ。もういちど！", "bad");
      } else {
        A.jingle("ok");
        say(starStr(stars) + "  ◎" + cnt("◎") + " ○" + cnt("○") + " △" + cnt("△") + (res.extra ? "  よけい " + res.extra : ""), "good");
        if (stars > (save.rhythm[idx] || 0)) { save.rhythm[idx] = stars; persist(); }
        $("rhythmStar").textContent = starStr(save.rhythm[idx] || 0);
        if (idx + 1 < M.RHYTHMS.length) $("rhythmNext").hidden = false;
      }
    }
    mode = {
      id: "rhythm",
      onTap: function () {
        A.tock();
        if (r.run && !r.demo) r.taps.push(A.heardNow());
      },
      exit: function () { r.run = false; cancelAnimationFrame(r.raf); setDots(-1); }
    };
    $("rhythmStart").onclick = function () { run(false); };
    $("rhythmDemo").onclick = function () { run(true); };
    $("rhythmNext").onclick = function () { startRhythm(idx + 1); };
    $("rhythmStart").disabled = $("rhythmDemo").disabled = false;
    setDots(-1);
    say("おてほん を きいて から、スタート で タップ しよう");
  }

  /* ============================================================
     3. きょく れんしゅう
     ============================================================ */
  var SONG_EMO = { kirakira: "⭐", kaeru: "🐸", mary: "🐑", chocho: "🦋", makiba: "🐄", yorokobi: "🎉", london: "🌉", boat: "🚣", jingle: "🔔" };

  var DEMO_LABEL = '👂 おてほん<span class="long"> を きく</span>';

  function buildSongMenu() {
    refreshToggles();
    var list = $("songList");
    list.innerHTML = "";
    M.SONGS.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "scard";
      b.innerHTML = '<span class="s-emo">' + (SONG_EMO[s.id] || "🎵") + '</span><span><span class="s-name">' + s.title +
        '</span><span class="s-meta">' + (s.level === 1 ? "★" : "★★") + "　" + s.origin + '</span><span class="s-star">' +
        starStr(save.songs[s.id] || 0) + "</span></span>";
      b.addEventListener("click", function () { A.ensure(); startSong(s); });
      list.appendChild(b);
    });
  }

  function startSong(song) {
    show("song", "kb");
    var evs = M.songEvents(song);
    var xs = [], bars = [], x = 16;
    evs.forEach(function (ev, i) {
      if (i > 0 && ev.start % song.meter === 0) { bars.push(x - 4); x += 14; }
      xs.push(x + 10);
      x += Math.max(38, ev.beats * 40) ;
    });
    var W = x + 30;
    var svg = $("songSvg"), clefSvg = $("songClef"), viewEl = svg.parentNode, msg = $("songMsg");
    clefSvg.innerHTML = S.lines(-4, 37) + S.clef(2);
    var st = { cur: 0, miss: 0, demo: false, timers: [], showAt: 0 };
    $("songName").textContent = (SONG_EMO[song.id] || "🎵") + " " + song.title;

    function say(t, cls) { msg.textContent = t; msg.className = "msg" + (cls ? " " + cls : ""); }
    function skipRests(i) { while (i < evs.length && evs[i].rest) i++; return i; }
    function draw() {
      var h = S.lines(0, W);
      bars.forEach(function (bx) { h += S.barline(bx); });
      h += S.barline(W - 12, true);
      evs.forEach(function (ev, i) {
        var color = i < st.showAt ? "#b8a9c9" : i === st.showAt ? "#862e9c" : S.INK;
        if (ev.rest) { h += S.rest(xs[i], ev.beats, { color: color }); return; }
        if (i === st.showAt) h += '<rect x="' + (xs[i] - 14) + '" y="-36" width="28" height="112" rx="10" fill="#fff3bf"/>';
        h += S.note(xs[i], ev.note, ev.beats, { color: color });
        if (save.doremi) {
          h += '<text x="' + xs[i] + '" y="78" text-anchor="middle" font-size="12" font-weight="800" fill="' +
            (i === st.showAt ? "#862e9c" : "#7a6a8c") + '">' + M.doremi(ev.note) + "</text>";
        }
      });
      // ハイライトの しかくは おんぷ より した に かく
      svg.innerHTML = h;
      var hl = svg.querySelector("rect[rx='10']");
      if (hl) svg.insertBefore(hl, svg.firstChild);
      size();
      $("songPos").textContent = Math.min(evs.filter(function (e, i) { return !e.rest && i < st.cur; }).length,
        evs.filter(function (e) { return !e.rest; }).length) + " / " + evs.filter(function (e) { return !e.rest; }).length;
    }
    function size() {
      var vh = viewEl.clientHeight || 200, vw = viewEl.clientWidth || 300;
      var scale = vh / 128;
      svg.setAttribute("viewBox", "0 -44 " + W + " 128");
      svg.style.width = (W * scale) + "px";
      var cx = xs[Math.min(st.showAt, xs.length - 1)] || 0;
      var tx = Math.min(0, vw * 0.28 - cx * scale);
      svg.style.transform = "translateX(" + tx.toFixed(1) + "px)";
    }
    function point() {
      st.cur = skipRests(st.cur);
      st.showAt = st.cur;
      draw();
      setNext(st.cur < evs.length ? evs[st.cur].note : null);
    }
    function finish() {
      setNext(null);
      var stars = M.starsForMisses(st.miss, 3);
      if (stars > (save.songs[song.id] || 0)) { save.songs[song.id] = stars; persist(); }
      showResult(stars, "「" + song.title + "」 ひけたね！<br>まちがい " + st.miss + " かい",
        function () { startSong(song); }, function () { goMenu("songMenu"); });
    }
    function stopDemo() {
      st.timers.forEach(clearTimeout);
      st.timers = [];
      if (!st.demo) return;
      st.demo = false;
      Object.keys(keyEls).forEach(function (n) { keyEls[n].classList.remove("demo"); });
      $("songDemo").innerHTML = DEMO_LABEL;
      point();
      say("ひかって いる けんばん を おしてね");
    }
    function demo() {
      if (st.demo) return stopDemo();
      st.demo = true;
      setNext(null);
      $("songDemo").innerHTML = "■ とめる";
      say("よく きいてね 👂");
      var beat = 60 / TEMPOS[save.tempo] * 1000;
      evs.forEach(function (ev, i) {
        st.timers.push(setTimeout(function () {
          st.showAt = i; draw();
          if (ev.rest) return;
          A.play(ev.note, ev.beats * beat / 1000 * 0.92);
          lightDemo(ev.note, true);
          st.timers.push(setTimeout(function () { lightDemo(ev.note, false); }, ev.beats * beat * 0.85));
        }, ev.start * beat + 300));
      });
      st.timers.push(setTimeout(stopDemo, M.totalBeats(song) * beat + 700));
    }
    var me = mode = {
      id: "song",
      onNote: function (n) {
        if (st.demo || st.cur >= evs.length) return;
        if (n === evs[st.cur].note) {
          flash(n, "good");
          st.cur++;
          point();
          say(["いいね！", "そのちょうし！", "じょうず！", "♪"][st.cur % 4], "good");
          if (st.cur >= evs.length) setTimeout(function () { if (mode === me) finish(); }, 500);
        } else {
          st.miss++;
          flash(n, "bad");
          say("ひかって いる けんばん だよ", "bad");
        }
      },
      onDoremi: draw,
      onResize: size,
      exit: stopDemo
    };
    $("songDemo").onclick = demo;
    $("songDemo").innerHTML = DEMO_LABEL;
    $("songRestart").onclick = function () { stopDemo(); st.cur = 0; st.miss = 0; point(); say("はじめから！"); };
    say("ひかって いる けんばん を おしてね");
    requestAnimationFrame(function () { if (mode === me) point(); });
  }

  /* ============================================================
     4. じゆう えんそう（ろくおん）
     ============================================================ */
  var MAX_EV = 600;
  var rec = {
    on: false, t0: 0, ev: [], open: {},
    down: function (n) {
      if (!this.on || this.ev.length >= MAX_EV) return;
      this.open[n] = performance.now() - this.t0;
    },
    up: function (n) {
      if (!this.on || !(n in this.open)) return;
      var t = this.open[n];
      delete this.open[n];
      this.ev.push([n, Math.round(t), Math.max(60, Math.round(performance.now() - this.t0 - t))]);
    }
  };
  var take = null, player = null;

  function playEvents(ev, onEnd) {
    stopPlayer();
    var timers = [];
    var end = 0;
    ev.slice().sort(function (a, b) { return a[1] - b[1]; }).forEach(function (e) {
      timers.push(setTimeout(function () { A.play(e[0], e[2] / 1000); lightDemo(e[0], true); }, e[1] + 100));
      timers.push(setTimeout(function () { lightDemo(e[0], false); }, e[1] + e[2] + 100));
      end = Math.max(end, e[1] + e[2]);
    });
    timers.push(setTimeout(function () { stopPlayer(); if (onEnd) onEnd(); }, end + 300));
    player = { timers: timers, onEnd: onEnd };
  }
  function stopPlayer() {
    if (!player) return;
    player.timers.forEach(clearTimeout);
    var cb = player.onEnd;
    player = null;
    Object.keys(keyEls).forEach(function (n) { keyEls[n].classList.remove("demo"); });
    if (cb) cb();
  }

  function startFree() {
    show("free", "kb");
    var msg = $("freeMsg");
    function stopRec() {
      if (!rec.on) return;
      Object.keys(rec.open).forEach(function (n) { rec.up(n); });
      rec.on = false;
      $("recBtn").classList.remove("on");
      $("recBtn").textContent = "● ろくおん";
      take = rec.ev.length ? rec.ev.slice() : null;
      msg.textContent = take ? "ろくおん できたよ！ ▶ で きける よ（" + take.length + " おと）" : "なにも ひいて いなかった よ";
      buttons();
    }
    function buttons() {
      $("recPlay").disabled = !take || rec.on;
      $("recSave").disabled = !take || rec.on;
      $("recPlay").textContent = player && player.kind === "take" ? "■ とめる" : "▶ さいせい";
    }
    function renderSlots() {
      var box = $("slots");
      box.innerHTML = "";
      for (var i = 0; i < 3; i++) {
        var r = save.recs[i];
        var d = document.createElement("div");
        if (!r) {
          d.className = "slot empty";
          d.textContent = "あき " + (i + 1);
        } else {
          d.className = "slot";
          var playing = player && player.kind === "slot" + i;
          d.innerHTML = '<span class="sl-name">🎵 きょく ' + (i + 1) + "<small>" + r.date + "・" + r.ev.length + ' おと</small></span>' +
            '<button type="button" data-act="play" aria-label="きく">' + (playing ? "■" : "▶") + "</button>" +
            '<button type="button" data-act="del" aria-label="けす">🗑️</button>';
          (function (idx, rr) {
            d.querySelector("[data-act=play]").onclick = function () {
              if (player && player.kind === "slot" + idx) { stopPlayer(); return; }
              A.ensure();
              playEvents(rr.ev, function () { renderSlots(); buttons(); });
              player.kind = "slot" + idx;
              renderSlots(); buttons();
            };
            d.querySelector("[data-act=del]").onclick = function () {
              if (!window.confirm("きょく " + (idx + 1) + " を けしても いい？")) return;
              if (player && player.kind === "slot" + idx) stopPlayer();
              save.recs.splice(idx, 1); persist(); renderSlots();
              msg.textContent = "けしたよ";
            };
          })(i, r);
        }
        box.appendChild(d);
      }
    }
    $("recBtn").onclick = function () {
      A.ensure();
      if (rec.on) return stopRec();
      stopPlayer();
      rec.on = true; rec.t0 = performance.now(); rec.ev = []; rec.open = {};
      $("recBtn").classList.add("on");
      $("recBtn").textContent = "■ とめる";
      msg.textContent = "ろくおん ちゅう… ひいてね 🎹";
      buttons();
    };
    $("recPlay").onclick = function () {
      if (!take) return;
      if (player && player.kind === "take") { stopPlayer(); return; }
      A.ensure();
      playEvents(take, function () { buttons(); renderSlots(); });
      player.kind = "take";
      buttons(); renderSlots();
    };
    $("recSave").onclick = function () {
      if (!take) return;
      if (save.recs.length >= 3) { msg.textContent = "いっぱい だよ。どれか 🗑️ で けしてね"; return; }
      var dt = new Date();
      save.recs.push({ date: (dt.getMonth() + 1) + "/" + dt.getDate() + " " + dt.getHours() + ":" + ("0" + dt.getMinutes()).slice(-2), ev: take });
      persist();
      msg.textContent = "きょく " + save.recs.length + " に ほぞん したよ 💾";
      take = null;
      buttons(); renderSlots();
    };
    mode = { id: "free", exit: function () { stopRec(); stopPlayer(); } };
    msg.textContent = "すきな ように ひいてね。● で ろくおん できるよ";
    buttons(); renderSlots();
  }

  /* ---------- はじまり ---------- */
  var rz = 0;
  window.addEventListener("resize", function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      if (keysMode === "kb") layoutKb();
      if (mode && mode.onResize) mode.onResize();
    }, 120);
  });
  A.setOn(save.sound);
  if (!Array.isArray(save.recs)) save.recs = [];
  refreshToggles();
  show("home");
})();
