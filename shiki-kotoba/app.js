// しきの ことば … あそびの ほんたい
(function () {
  "use strict";
  var D = window.SK_WORDS, M = window.SK_MORA;
  var WORDS = D.WORDS, SN = D.SEASON_NAME, SEASONS = D.SEASONS;
  var BY_ID = {};
  WORDS.forEach(function (w) { BY_ID[w.id] = w; });
  var SEASON_ICON = { haru: "🌸", natsu: "🌻", aki: "🍁", fuyu: "⛄", shinnen: "🎍" };
  var SEASON_BOX = { haru: "さくら", natsu: "ひまわり", aki: "もみじ", fuyu: "ゆきだるま" };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function ruby(w) { return w.kanji ? "<ruby>" + esc(w.kanji) + "<rt>" + esc(w.kana) + "</rt></ruby>" : esc(w.kana); }
  function kigoLabel(w) {
    if (!w.kigo.length) return "<ruby>季語<rt>きご</rt></ruby>では ない";
    if (w.kigo.length > 1) return "さいじきに よって " + w.kigo.map(function (s) { return SN[s]; }).join("・") + " の どちらも ある";
    if (w.kigo[0] === "shinnen") return "しんねん（おしょうがつ）";
    return SN[w.kigo[0]];
  }

  // ---------- ほぞん ----------
  var KEY = "shikiKotoba.v1";
  var S = { seen: {}, haiku: [], best: {}, sound: true };
  try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); if (o && typeof o === "object") S = Object.assign(S, o); } } catch (e) {}
  if (!Array.isArray(S.haiku)) S.haiku = [];
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function see(w) { if (!S.seen[w.id]) { S.seen[w.id] = 1; save(); } }
  function setBest(k, v) { if (!(S.best[k] >= v)) { S.best[k] = v; save(); return true; } return false; }

  // ---------- おと（WebAudio 合成）----------
  var ac = null;
  function ctx() {
    if (!S.sound) return null;
    try {
      if (!ac) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C(); }
      if (ac.state === "suspended") ac.resume();
    } catch (e) { return null; }
    return ac;
  }
  function tone(a, t0, f0, f1, dur, vol, type) {
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.03, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
    return o;
  }
  var noiseBuf = null;
  function noise(a, t0, dur, vol, ftype, f0, f1, q) {
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = ftype; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.05, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(a.destination);
    s.start(t0); s.stop(t0 + dur + 0.02);
  }
  var SFX = {
    // うぐいす「ほーー ほけきょ」
    haru: function (a, t) {
      tone(a, t, 1200, 1350, 0.55, 0.18);
      tone(a, t + 0.7, 1500, 2100, 0.12, 0.16);
      tone(a, t + 0.85, 2300, 1900, 0.1, 0.16);
      tone(a, t + 0.98, 1800, 2600, 0.22, 0.16);
    },
    // せみ「みーん みーん」… 四角い 波を こまかく ふるわせる
    natsu: function (a, t) {
      for (var i = 0; i < 2; i++) {
        var t0 = t + i * 0.45;
        var o = tone(a, t0, 3200, 3600, 0.38, 0.05, "square");
        var lfo = a.createOscillator(), lg = a.createGain();
        lfo.frequency.value = 38; lg.gain.value = 600;
        lfo.connect(lg); lg.connect(o.frequency);
        lfo.start(t0); lfo.stop(t0 + 0.4);
      }
    },
    // すずむし「りーん りーん」
    aki: function (a, t) {
      for (var i = 0; i < 3; i++) {
        var t0 = t + i * 0.32;
        for (var k = 0; k < 6; k++) tone(a, t0 + k * 0.035, 4200, 4150, 0.05, 0.08);
      }
    },
    // こがらし「ひゅうう」
    fuyu: function (a, t) { noise(a, t, 1.1, 0.35, "bandpass", 500, 1600, 6); noise(a, t + 0.4, 0.8, 0.2, "bandpass", 1400, 600, 8); },
    shinnen: function (a, t) { SFX.fuyu(a, t); },
    // カルタの パシッ
    pashi: function (a, t) { noise(a, t, 0.07, 0.6, "highpass", 1800, 1800, 0.7); tone(a, t, 180, 70, 0.08, 0.3, "triangle"); },
    ng: function (a, t) { tone(a, t, 330, 300, 0.16, 0.12, "triangle"); tone(a, t + 0.17, 260, 220, 0.22, 0.12, "triangle"); },
    ok: function (a, t) { [660, 880].forEach(function (f, i) { tone(a, t + i * 0.09, f, f, 0.14, 0.12, "triangle"); }); },
    fan: function (a, t) { [523, 659, 784, 1047].forEach(function (f, i) { tone(a, t + i * 0.12, f, f, 0.25, 0.13, "triangle"); }); },
    pop: function (a, t) { tone(a, t, 600, 900, 0.07, 0.1, "sine"); },
  };
  function sfx(name) { var a = ctx(); if (a && SFX[name]) try { SFX[name](a, a.currentTime + 0.02); } catch (e) {} }

  // ---------- よみあげ ----------
  var hasTTS = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
  var jaVoice = null;
  function pickVoice() { try { var vs = speechSynthesis.getVoices() || []; jaVoice = vs.filter(function (v) { return /^ja/i.test(v.lang); })[0] || null; } catch (e) {} }
  if (hasTTS) { pickVoice(); try { speechSynthesis.addEventListener("voiceschanged", pickVoice); } catch (e) {} }
  function speak(text, rate) {
    if (!hasTTS || !S.sound) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text.replace(/\s+/g, " "));
      u.lang = "ja-JP"; u.rate = rate || 0.9; if (jaVoice) u.voice = jaVoice;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function hush() { if (hasTTS) try { speechSynthesis.cancel(); } catch (e) {} }

  // ---------- がめん ----------
  var TITLES = { home: "しきの ことば", hako: "きせつの はこ", karuta: "きせつ カルタ", quiz: "はいくの きせつ", haiku: "はいくを つくろう", zukan: "ことば ずかん" };
  var cur = "home", timers = [];
  function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function show(name) {
    clearTimers(); hush();
    document.querySelectorAll(".screen").forEach(function (s) { s.hidden = s.id !== name; });
    $("back").hidden = name === "home";
    $("title").textContent = TITLES[name];
    cur = name;
    window.scrollTo(0, 0);
    if (INIT[name]) INIT[name]();
  }
  $("back").onclick = function () { show("home"); };
  document.querySelectorAll("[data-go]").forEach(function (b) { b.onclick = function () { ctx(); show(b.dataset.go); }; });
  function paintSnd() { $("snd").textContent = S.sound ? "🔊" : "🔇"; $("snd").setAttribute("aria-pressed", S.sound ? "true" : "false"); }
  $("snd").onclick = function () { S.sound = !S.sound; save(); paintSnd(); if (!S.sound) hush(); else sfx("pop"); };
  paintSnd();

  var toastT = 0;
  function toast(html, ms) {
    var t = $("toast"); t.innerHTML = html; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, ms || 1800);
  }

  function cardHTML(w, opt) {
    opt = opt || {};
    return '<div class="w-emoji" aria-hidden="true">' + w.emoji + '</div>' +
      '<div class="w-kana">' + esc(w.kana) + '</div>' +
      (w.kanji ? '<div class="w-kanji">' + ruby(w) + '</div>' : "") +
      (opt.genre ? '<div class="w-genre">' + D.GENRES[w.genre] + '</div>' : "");
  }

  // こよみ の ずれ を みせる おび（くらし と はいく）
  var LIFE_OF_MONTH = [0, "fuyu", "fuyu", "haru", "haru", "haru", "natsu", "natsu", "natsu", "aki", "aki", "aki", "fuyu"];
  var KIGO_OF_MONTH = [0, "fuyu", "haru", "haru", "haru", "natsu", "natsu", "natsu", "aki", "aki", "aki", "fuyu", "fuyu"];
  function calHTML(mark) {
    function row(label, arr) {
      var h = '<div class="cal-row"><span class="cal-l">' + label + '</span>';
      for (var m = 1; m <= 12; m++) h += '<span class="cal-m s-' + arr[m] + (mark && mark.indexOf(m) >= 0 ? " mk" : "") + '">' + m + '</span>';
      return h + "</div>";
    }
    return row("くらし", LIFE_OF_MONTH) + row("はいく", KIGO_OF_MONTH) +
      '<p class="cal-note">はいくの きせつは りっしゅん（2がつ4か ごろ）・りっか（5がつ5か ごろ）・りっしゅう（8がつ7か ごろ）・りっとう（11がつ7か ごろ）で かわるよ。いろ: <b class="s-haru">はる</b><b class="s-natsu">なつ</b><b class="s-aki">あき</b><b class="s-fuyu">ふゆ</b></p>';
  }

  var INIT = {};

  // ---------- ホーム ----------
  INIT.home = function () {
    var n = Object.keys(S.seen).filter(function (k) { return BY_ID[k]; }).length;
    $("zkCount").textContent = "であった ことば " + n + " / " + WORDS.length;
  };

  // ---------- きせつの はこ ----------
  var H = null;
  INIT.hako = function () {
    $("hakoSetup").hidden = false; $("hakoPlay").hidden = true;
    var b = [];
    if (S.best.hako_life != null) b.push("🏠 くらし さいこう " + S.best.hako_life + "/10");
    if (S.best.hako_kigo != null) b.push("📜 はいく さいこう " + S.best.hako_kigo + "/10");
    $("hakoBest").textContent = b.join("　");
  };
  document.querySelectorAll("[data-rule]").forEach(function (btn) {
    btn.onclick = function () { ctx(); startHako(btn.dataset.rule); };
  });
  function hakoAns(w) { return H.rule === "life" ? w.life : w.kigo[0]; }
  function startHako(rule) {
    var pool = rule === "life" ? WORDS : WORDS.filter(function (w) { return w.kigo.length === 1 && w.kigo[0] !== "shinnen"; });
    var deck;
    if (rule === "kigo") {
      // ずれる ことば を 4こ まぜる
      var sh = shuffle(pool.filter(D.isShifted)).slice(0, 4);
      deck = shuffle(sh.concat(shuffle(pool.filter(function (w) { return !D.isShifted(w); })).slice(0, 6)));
    } else {
      // きせつが かたよらない ように
      deck = [];
      var bySeason = {};
      SEASONS.forEach(function (s) { bySeason[s] = shuffle(pool.filter(function (w) { return w.life === s; })); });
      for (var i = 0; i < 10; i++) deck.push(bySeason[SEASONS[(i + Math.floor(Math.random() * 4)) % 4]].pop());
      deck = shuffle(deck);
    }
    H = { rule: rule, deck: deck, i: 0, score: 0, miss: 0, counts: { haru: 0, natsu: 0, aki: 0, fuyu: 0 } };
    $("hakoSetup").hidden = true; $("hakoPlay").hidden = false;
    $("hakoRule").innerHTML = rule === "life" ? "🏠 くらしの きせつ" : "📜 はいくの きせつ";
    var bx = $("boxes"); bx.innerHTML = "";
    SEASONS.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "box s-" + s; b.dataset.s = s;
      b.innerHTML = '<span class="b-emoji">' + SEASON_ICON[s] + '</span><span class="b-name">' + SN[s] + '</span><span class="b-sub">' + SEASON_BOX[s] + '</span><span class="b-n">0</span>';
      b.onclick = function () { hakoDrop(s); };
      bx.appendChild(b);
    });
    hakoNext();
  }
  function hakoNext() {
    if (H.i >= H.deck.length) return hakoEnd();
    var w = H.deck[H.i];
    H.miss = 0; H.lock = false;
    $("hakoProg").textContent = (H.i + 1) + " / " + H.deck.length;
    var c = $("hakoCard");
    c.className = "wcard enter"; c.style.transform = "";
    c.innerHTML = cardHTML(w, { genre: true });
    $("hakoMsg").innerHTML = H.rule === "life" ? "くらしの なかで いつの ことば かな？" : "はいくでは どの きせつ かな？";
  }
  function hakoDrop(s) {
    if (!H || H.lock) return;
    var w = H.deck[H.i], ans = hakoAns(w);
    var box = document.querySelector('.box[data-s="' + s + '"]');
    if (s === ans) {
      H.lock = true; see(w);
      if (H.miss === 0) H.score++;
      H.counts[s]++;
      box.querySelector(".b-n").textContent = H.counts[s];
      box.classList.remove("bump"); void box.offsetWidth; box.classList.add("bump");
      sfx(s);
      var c = $("hakoCard"), br = box.getBoundingClientRect(), cr = c.getBoundingClientRect();
      c.className = "wcard fly";
      c.style.transform = "translate(" + (br.left + br.width / 2 - cr.left - cr.width / 2) + "px," + (br.top + br.height / 2 - cr.top - cr.height / 2) + "px) scale(.2)";
      var m = (H.miss === 0 ? "⭕ せいかい！ " : "⭕ そう！ ") + esc(w.kana) + " は " + SN[s] + "。" + esc(w.note);
      if (H.rule === "kigo" && D.isShifted(w)) m += '<br><span class="why">くらしでは ' + SN[w.life] + "。" + esc(w.why) + "</span>";
      $("hakoMsg").innerHTML = m;
      later(function () { H.i++; hakoNext(); }, H.rule === "kigo" && D.isShifted(w) ? 3600 : 1900);
    } else {
      H.miss++;
      sfx("ng");
      box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
      var c2 = $("hakoCard"); c2.className = "wcard"; c2.style.transform = "";
      var hint = H.miss >= 2 ? "こたえは " + SEASON_ICON[ans] + " " + SN[ans] + " の はこ だよ" : "ちがうよ。もういちど かんがえて みよう";
      if (H.rule === "kigo" && D.isShifted(w) && s === w.life) hint = "くらしでは " + SN[w.life] + "。でも はいくでは べつの きせつ だよ";
      $("hakoMsg").innerHTML = "🤔 " + hint;
    }
  }
  function hakoEnd() {
    var k = "hako_" + H.rule, best = setBest(k, H.score);
    sfx("fan");
    $("hakoMsg").innerHTML = "";
    var c = $("hakoCard"); c.className = "wcard result"; c.style.transform = "";
    c.innerHTML = '<div class="w-emoji">' + (H.score >= 9 ? "🏆" : H.score >= 6 ? "🎉" : "🌱") + '</div><div class="w-kana">' + H.score + ' / 10</div><div class="w-kanji">いっぱつで せいかい' + (best ? "<br>🆕 さいこう きろく！" : "") + "</div>" +
      '<div class="r-btns"><button type="button" class="big go" id="hakoRe">もういちど</button><button type="button" class="big alt" id="hakoTop">えらびなおす</button></div>';
    $("hakoRe").onclick = function () { startHako(H.rule); };
    $("hakoTop").onclick = function () { INIT.hako(); };
    H.lock = true;
  }
  // ドラッグ
  (function () {
    var c = $("hakoCard"), st = null;
    function boxAt(x, y) {
      var hit = null;
      document.querySelectorAll(".box").forEach(function (b) {
        var r = b.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) hit = b;
      });
      return hit;
    }
    function mark(b) { document.querySelectorAll(".box").forEach(function (x) { x.classList.toggle("over", x === b); }); }
    c.addEventListener("pointerdown", function (e) {
      if (!H || H.lock || c.classList.contains("result")) return;
      st = { x: e.clientX, y: e.clientY, id: e.pointerId, drag: false };
      try { c.setPointerCapture(e.pointerId); } catch (er) {}
      ctx();
    });
    c.addEventListener("pointermove", function (e) {
      if (!st || e.pointerId !== st.id) return;
      var dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.drag && Math.hypot(dx, dy) > 8) { st.drag = true; c.className = "wcard drag"; }
      if (st.drag) { c.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + dx / 30 + "deg)"; mark(boxAt(e.clientX, e.clientY)); }
    });
    function up(e) {
      if (!st || e.pointerId !== st.id) return;
      var s = st; st = null; mark(null);
      if (s.drag) {
        var b = e.type === "pointerup" ? boxAt(e.clientX, e.clientY) : null;
        if (b) hakoDrop(b.dataset.s);
        else { c.className = "wcard"; c.style.transform = ""; }
      } else if (!H.lock) {
        $("hakoMsg").innerHTML = "👇 カードを はこへ ひっぱるか、はこを タップ してね";
      }
    }
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
  })();

  // ---------- カルタ ----------
  var K = null;
  var KSEASONS = [["all", "ぜんぶ"], ["haru", "🌸 はる"], ["natsu", "🌻 なつ"], ["aki", "🍁 あき"], ["fuyu", "⛄ ふゆ"]];
  var KFOES = [["solo", "🧒 ひとりで"], ["easy", "🐣 よわい"], ["mid", "🐥 ふつう"], ["hard", "🦅 つよい"]];
  var kOpt = { season: "all", foe: "mid" };
  function seg(el, list, key) {
    el.innerHTML = "";
    list.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = it[1];
      b.setAttribute("aria-pressed", kOpt[key] === it[0] ? "true" : "false");
      b.onclick = function () { kOpt[key] = it[0]; seg(el, list, key); };
      el.appendChild(b);
    });
  }
  INIT.karuta = function () {
    $("karutaSetup").hidden = false; $("karutaPlay").hidden = true;
    seg($("kSeason"), KSEASONS, "season"); seg($("kFoe"), KFOES, "foe");
    $("karutaBest").textContent = S.best.karuta_win ? "CPU に かった かず: " + S.best.karuta_win : "";
  };
  $("kStart").onclick = function () {
    ctx();
    var pool = WORDS.filter(function (w) { return kOpt.season === "all" || w.life === kOpt.season; });
    var cards = shuffle(pool).slice(0, 8);
    K = { cards: cards, left: cards.slice(), you: 0, cpu: 0, otetsuki: 0, cur: null, freeze: 0, cpuT: 0, solo: kOpt.foe === "solo", foe: kOpt.foe, t0: Date.now() };
    $("karutaSetup").hidden = true; $("karutaPlay").hidden = false;
    $("kCpuBox").hidden = K.solo;
    $("kYou").textContent = "0"; $("kCpu").textContent = "0";
    var bd = $("kBoard"); bd.innerHTML = "";
    cards.forEach(function (w) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "fuda"; b.dataset.id = w.id;
      b.innerHTML = '<span class="f-ini">' + esc(w.kana[0]) + '</span><span class="f-emoji">' + w.emoji + '</span><span class="f-kana">' + esc(w.kana) + '</span>';
      b.onclick = function () { karutaTap(w, b); };
      bd.appendChild(b);
    });
    $("kYomi").innerHTML = "よーい…";
    later(karutaRead, 1200);
  };
  $("kAgain").onclick = function () { if (K && K.cur) speak(K.cur.yomi, 0.85); };
  function karutaRead() {
    if (!K.left.length) return karutaEnd();
    var w = K.left[Math.floor(Math.random() * K.left.length)];
    K.cur = w; K.taken = false;
    see(w);
    var y = $("kYomi"), txt = w.yomi, i = 0;
    y.innerHTML = '<span class="yomi-t"></span>';
    var span = y.firstChild;
    speak(txt, 0.85);
    (function step() {
      if (K.cur !== w || K.taken) return;
      i++; span.textContent = txt.slice(0, i);
      if (i < txt.length) later(step, 150);
    })();
    if (!K.solo) {
      var len = txt.length * 150;
      var f = { easy: 1.25, mid: 0.85, hard: 0.55 }[K.foe];
      K.cpuT = later(function () { if (K.cur === w && !K.taken) karutaTake(w, "cpu"); }, len * f + 900 + Math.random() * 900);
    }
  }
  function karutaTap(w, b) {
    if (!K || !K.cur || K.taken || b.classList.contains("gone")) return;
    if (Date.now() < K.freeze) { toast("✋ おてつきで おやすみ ちゅう", 900); return; }
    if (w === K.cur) karutaTake(w, "you");
    else {
      K.otetsuki++; K.freeze = Date.now() + 1500;
      sfx("ng");
      b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake");
      toast("❌ おてつき！ すこし まってね", 1400);
      document.body.classList.add("frozen");
      later(function () { document.body.classList.remove("frozen"); }, 1500);
    }
  }
  function karutaTake(w, who) {
    K.taken = true; clearTimeout(K.cpuT);
    hush();
    sfx("pashi");
    var b = document.querySelector('.fuda[data-id="' + w.id + '"]');
    b.classList.add("gone", who);
    K[who]++;
    $(who === "you" ? "kYou" : "kCpu").textContent = K[who];
    K.left = K.left.filter(function (x) { return x !== w; });
    $("kYomi").innerHTML = '<span class="yomi-t">' + esc(w.yomi) + '</span><span class="yomi-who">' + (who === "you" ? "🧒 パシッ！ とれた！" : "🤖 CPU が とったよ") + "</span>";
    later(karutaRead, 1700);
  }
  function karutaEnd() {
    K.cur = null;
    var sec = Math.round((Date.now() - K.t0) / 1000), msg;
    if (K.solo) msg = "🎉 ぜんぶ とれたよ！ " + sec + "びょう・おてつき " + K.otetsuki + "かい";
    else if (K.you > K.cpu) { msg = "🏆 かち！ " + K.you + " たい " + K.cpu; S.best.karuta_win = (S.best.karuta_win || 0) + 1; save(); }
    else if (K.you === K.cpu) msg = "🤝 ひきわけ " + K.you + " たい " + K.cpu;
    else msg = "😢 まけ… " + K.you + " たい " + K.cpu + "。もういちど！";
    sfx("fan");
    $("kYomi").innerHTML = '<span class="yomi-t">' + msg + '</span><span class="r-btns"><button type="button" class="big go" id="kRe">もういちど</button><button type="button" class="big alt" id="kTop">えらびなおす</button></span>';
    $("kRe").onclick = function () { $("kStart").onclick(); };
    $("kTop").onclick = function () { INIT.karuta(); };
  }

  // ---------- はいくの きせつ（クイズ）----------
  var Q = null;
  INIT.quiz = function () {
    $("quizSetup").hidden = false; $("quizPlay").hidden = true;
    $("calIntro").innerHTML = calHTML();
    $("quizBest").textContent = S.best.quiz != null ? "さいこう " + S.best.quiz + " / 10" : "";
  };
  $("qStart").onclick = function () {
    ctx();
    var sh = shuffle(WORDS.filter(D.isShifted)).slice(0, 8);
    var same = shuffle(WORDS.filter(function (w) { return w.kigo.length === 1 && w.kigo[0] === w.life; })).slice(0, 2);
    Q = { list: shuffle(sh.concat(same)), i: 0, score: 0 };
    $("quizSetup").hidden = true; $("quizPlay").hidden = false;
    quizShow();
  };
  function quizShow() {
    if (Q.i >= Q.list.length) return quizEnd();
    var w = Q.list[Q.i];
    Q.done = false;
    $("qProg").textContent = (Q.i + 1) + " / " + Q.list.length;
    $("qCard").className = "wcard enter";
    $("qCard").innerHTML = cardHTML(w, { genre: true });
    $("qText").innerHTML = "「" + esc(w.kana) + "」は くらしでは <b class='s-" + w.life + "t'>" + SN[w.life] + "</b>。<br>でも はいくでは？";
    $("qExplain").hidden = true;
    var bx = $("qBtns"); bx.innerHTML = "";
    SEASONS.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "qbtn s-" + s; b.dataset.s = s;
      b.innerHTML = SEASON_ICON[s] + " " + SN[s];
      b.onclick = function () { quizAns(s); };
      bx.appendChild(b);
    });
  }
  function quizAns(s) {
    if (Q.done) return;
    Q.done = true;
    var w = Q.list[Q.i], ans = w.kigo[0], ok = s === ans;
    see(w);
    if (ok) { Q.score++; sfx(ans); } else sfx("ng");
    document.querySelectorAll(".qbtn").forEach(function (b) {
      b.disabled = true;
      if (b.dataset.s === ans) b.classList.add("right");
      else if (b.dataset.s === s) b.classList.add("wrong");
    });
    var marks = { たなばた: [7], あさがお: [7, 8], すいか: [8], あまのがわ: [8], えだまめ: [8], とうもろこし: [8], ぼんおどり: [8], おぼん: [8], とんぼ: [8],
      こいのぼり: [5], かしわもち: [5], こどものひ: [5], ははのひ: [5], いちご: [5], たけのこ: [5], わかば: [5], おちば: [11], しちごさん: [11], たこあげ: [1, 2], バレンタイン: [2] }[w.kana];
    var ex = $("qExplain");
    ex.hidden = false;
    ex.innerHTML = '<p class="ex-h">' + (ok ? "⭕ せいかい！" : "❌ ざんねん") + " はいくでは <b>" + SEASON_ICON[ans] + " " + SN[ans] + "</b></p>" +
      "<p>" + (D.isShifted(w) ? esc(w.why) : esc(w.kana) + " は くらしでも はいくでも " + SN[ans] + "。ずれない ことば だよ。") + "</p>" +
      '<div class="cal">' + calHTML(marks) + "</div>" +
      '<button type="button" class="big go" id="qNext">' + (Q.i + 1 >= Q.list.length ? "けっか を みる" : "つぎへ ▶") + "</button>";
    $("qNext").onclick = function () { Q.i++; quizShow(); };
    ex.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function quizEnd() {
    var best = setBest("quiz", Q.score);
    sfx("fan");
    $("qCard").className = "wcard result";
    $("qCard").innerHTML = '<div class="w-emoji">' + (Q.score >= 9 ? "🏆" : Q.score >= 6 ? "🎉" : "🌱") + '</div><div class="w-kana">' + Q.score + " / 10</div>" + (best ? '<div class="w-kanji">🆕 さいこう きろく！</div>' : "");
    $("qText").innerHTML = "むかしの こよみ の きせつ、おぼえたかな？";
    $("qBtns").innerHTML = "";
    $("qExplain").hidden = false;
    $("qExplain").innerHTML = '<div class="r-btns"><button type="button" class="big go" id="qRe">もういちど</button><button type="button" class="big alt" id="qTop">もどる</button></div>';
    $("qRe").onclick = function () { $("qStart").onclick(); };
    $("qTop").onclick = function () { INIT.quiz(); };
  }

  // ---------- はいくを つくろう ----------
  var OTHER = [
    "そら", "かぜ", "あさ", "よる", "みち", "にわ", "やま", "うみ", "かわ", "ほし", "ねこ", "いぬ", "まど", "て",
    "ぼく", "わたし", "みんな", "ママ", "パパ", "ともだち", "おばあちゃん", "おとうと", "いもうと",
    "ひかる", "ゆれる", "とんだ", "ないた", "わらう", "ねむる", "あるく", "まつ", "さく", "ふる", "みつけた", "あそぶ", "たべた",
    "しずか", "ちいさな", "おおきな", "まあるい", "あかい", "しろい", "あおい", "うれしい", "たのしい", "さみしい", "いいにおい",
    "きらきら", "ふわふわ", "ころころ", "ぽかぽか", "ひらひら", "ざあざあ", "そっと", "ぎゅっと", "ゆっくり", "いっしょに", "きょうも", "ちょっと",
    "まどのそと", "かえりみち", "がっこう", "ゆれている", "まっている", "ねむってる", "わらってる", "とんでいく", "ひとりきり",
  ];
  var PARTS = ["の", "に", "が", "を", "と", "や", "は", "へ", "も", "よ", "ね", "かな", "から", "まで"];
  var TARGET = [5, 7, 5];
  var HK = { lines: [[], [], []], act: 0, tab: "haru" };
  var HTABS = [["haru", "🌸 はる"], ["natsu", "🌻 なつ"], ["aki", "🍁 あき"], ["fuyu", "⛄ ふゆ"], ["shinnen", "🎍 しんねん"], ["other", "💬 ことば"], ["parts", "の・に・が"]];
  function pText(p) { return p.k ? BY_ID[p.k].kana : p.t; }
  function lineText(l) { return l.map(pText).join(""); }
  INIT.haiku = function () { hkTabs(); hkPieces(); hkRender(); hkSavedRender(); };
  function hkTabs() {
    var el = $("hkTabs"); el.innerHTML = "";
    HTABS.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = t[1]; b.setAttribute("aria-pressed", HK.tab === t[0] ? "true" : "false");
      b.onclick = function () { HK.tab = t[0]; hkTabs(); hkPieces(); };
      el.appendChild(b);
    });
  }
  function hkPieces() {
    var el = $("hkPieces"); el.innerHTML = "";
    var list;
    if (HK.tab === "other") list = OTHER.map(function (t) { return { t: t }; });
    else if (HK.tab === "parts") list = PARTS.map(function (t) { return { t: t }; });
    else list = WORDS.filter(function (w) { return w.kigo.indexOf(HK.tab) >= 0; }).map(function (w) { return { k: w.id }; });
    list.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "piece" + (p.k ? " kigo s-" + HK.tab : "");
      var txt = pText(p);
      b.dataset.text = txt;
      b.innerHTML = (p.k ? '<span class="p-e">' + BY_ID[p.k].emoji + "</span>" : "") + esc(txt) + '<span class="p-n">' + M.count(txt) + "</span>";
      b.onclick = function () { hkAdd(p); };
      el.appendChild(b);
    });
  }
  function hkAdd(p) {
    var l = HK.lines[HK.act];
    l.push(p);
    if (p.k) see(BY_ID[p.k]);
    sfx("pop");
    // ぴったりに なったら つぎの ぎょうへ
    if (M.count(lineText(l)) === TARGET[HK.act]) {
      for (var i = 1; i <= 2; i++) { var n = (HK.act + i) % 3; if (M.count(lineText(HK.lines[n])) < TARGET[n]) { HK.act = n; break; } }
    }
    hkRender();
  }
  function hkRender() {
    var el = $("hkLines"); el.innerHTML = "";
    HK.lines.forEach(function (l, i) {
      var n = M.count(lineText(l)), t = TARGET[i];
      var row = document.createElement("div");
      row.className = "hk-line" + (i === HK.act ? " act" : "") + (n === t ? " ok" : n > t ? " over" : "");
      row.onclick = function (e) { if (e.target.closest(".lp")) return; HK.act = i; hkRender(); };
      var h = '<span class="hk-t">' + t + '</span><span class="hk-ps">';
      l.forEach(function (p, j) { h += '<button type="button" class="lp' + (p.k ? " kigo" : "") + '" data-j="' + j + '">' + esc(pText(p)) + "</button>"; });
      if (!l.length) h += '<span class="hk-ph">' + (i === HK.act ? "👇 したの ピースを タップ" : "ここを タップ して えらぶ") + "</span>";
      h += '</span><span class="hk-c">' + n + " / " + t + (n === t ? " ✨" : "") + '</span><span class="hk-m">' + M.split(lineText(l)).join("・") + "</span>";
      row.innerHTML = h;
      row.querySelectorAll(".lp").forEach(function (b) {
        b.onclick = function () { l.splice(+b.dataset.j, 1); HK.act = i; hkRender(); };
      });
      el.appendChild(row);
    });
    // きせつの ことばの チェック
    var kigos = [];
    HK.lines.forEach(function (l) { l.forEach(function (p) { if (p.k && kigos.indexOf(p.k) < 0) kigos.push(p.k); }); });
    var counts = HK.lines.map(function (l) { return M.count(lineText(l)); });
    var all = counts[0] === 5 && counts[1] === 7 && counts[2] === 5;
    var msg;
    if (kigos.length >= 2) msg = "🤔 きせつが ふたつ あるよ（" + kigos.map(function (k) { return BY_ID[k].kana; }).join("・") + "）。<ruby>季語<rt>きご</rt></ruby>は 1つ が きほん だよ";
    else if (kigos.length === 1) { var w = BY_ID[kigos[0]]; msg = SEASON_ICON[w.kigo[0]] + " きせつの ことば「" + esc(w.kana) + "」で " + kigoLabel(w) + " の はいく"; }
    else msg = "🌸 まず きせつの ことば（<ruby>季語<rt>きご</rt></ruby>）を 1つ いれよう";
    if (all) msg += kigos.length === 1 ? "。<b>5・7・5 ぴったり！ できた！</b>" : "。5・7・5 ぴったり！";
    else if (counts.some(function (c, i) { return c > TARGET[i]; })) msg += "。<br>おおい ぎょう は ピースを タップ すると けせるよ";
    $("hkMsg").innerHTML = msg;
    $("hkSave").disabled = !HK.lines.every(function (l) { return l.length; });
  }
  $("hkUndo").onclick = function () {
    for (var i = 0; i < 3; i++) { var n = (HK.act + 3 - i) % 3; if (HK.lines[n].length) { HK.lines[n].pop(); HK.act = n; break; } }
    hkRender();
  };
  $("hkClear").onclick = function () { HK.lines = [[], [], []]; HK.act = 0; hkRender(); };
  $("hkRead").onclick = function () { speak(HK.lines.map(lineText).join("、 "), 0.8); };
  $("hkSave").onclick = function () {
    if (S.haiku.length >= 10) { toast("📚 10こ で いっぱい。ふるい はいくを 🗑 で けしてね", 2600); return; }
    var kigo = [];
    HK.lines.forEach(function (l) { l.forEach(function (p) { if (p.k) kigo.push(p.k); }); });
    S.haiku.unshift({ lines: HK.lines.map(function (l) { return l.map(function (p) { return p.k ? { k: p.k } : { t: p.t }; }); }), kigo: kigo, at: Date.now() });
    save(); sfx("fan");
    toast("💾 ほぞん したよ！", 1500);
    HK.lines = [[], [], []]; HK.act = 0;
    hkRender(); hkSavedRender();
  };
  function hkSavedRender() {
    var el = $("hkSaved"); el.innerHTML = "";
    $("hkSavedN").textContent = S.haiku.length + " / 10";
    if (!S.haiku.length) { el.innerHTML = '<li class="empty">まだ ないよ。つくって 💾 ほぞん してね</li>'; return; }
    S.haiku.forEach(function (h, i) {
      var li = document.createElement("li");
      var lines = h.lines.map(function (l) {
        return l.map(function (p) { return p.k && BY_ID[p.k] ? '<b class="kg">' + esc(BY_ID[p.k].kana) + "</b>" : esc(p.k ? "" : p.t); }).join("");
      });
      var w = h.kigo && h.kigo.length === 1 && BY_ID[h.kigo[0]];
      li.innerHTML = '<span class="sv-ic">' + (w ? SEASON_ICON[w.kigo[0]] : "🖌️") + '</span><span class="sv-t">' + lines.join("<br>") + '</span><button type="button" class="sv-b" aria-label="よむ">🔊</button><button type="button" class="sv-b" aria-label="けす">🗑</button>';
      var bs = li.querySelectorAll(".sv-b");
      bs[0].onclick = function () { speak(h.lines.map(function (l) { return l.map(function (p) { return p.k ? (BY_ID[p.k] || {}).kana || "" : p.t; }).join(""); }).join("、 "), 0.8); };
      bs[1].onclick = function () { if (confirm("この はいくを けす？")) { S.haiku.splice(i, 1); save(); hkSavedRender(); } };
      el.appendChild(li);
    });
  }

  // ---------- ずかん ----------
  var zkTab = "haru";
  INIT.zukan = function () {
    var el = $("zkTabs"); el.innerHTML = "";
    SEASONS.forEach(function (s) {
      var n = WORDS.filter(function (w) { return w.life === s && S.seen[w.id]; }).length;
      var all = WORDS.filter(function (w) { return w.life === s; }).length;
      var b = document.createElement("button");
      b.type = "button"; b.innerHTML = SEASON_ICON[s] + " " + SN[s] + " <small>" + n + "/" + all + "</small>";
      b.setAttribute("aria-pressed", zkTab === s ? "true" : "false");
      b.onclick = function () { zkTab = s; INIT.zukan(); };
      el.appendChild(b);
    });
    var total = Object.keys(S.seen).filter(function (k) { return BY_ID[k]; }).length;
    $("zkN").textContent = "ぜんぶで " + total + " / " + WORDS.length + " こ。くらしの きせつ で ならべて いるよ";
    var g = $("zkGrid"); g.innerHTML = "";
    WORDS.filter(function (w) { return w.life === zkTab; }).forEach(function (w) {
      var b = document.createElement("button");
      b.type = "button";
      if (S.seen[w.id]) {
        b.className = "zk s-" + w.life + (D.isShifted(w) ? " shift" : "");
        b.innerHTML = '<span class="zk-e">' + w.emoji + '</span><span class="zk-k">' + esc(w.kana) + "</span>";
        b.onclick = function () { detail(w); };
      } else {
        b.className = "zk locked"; b.innerHTML = '<span class="zk-e">？</span><span class="zk-k">？？？</span>';
        b.onclick = function () { toast("まだ であって いないよ", 1000); };
      }
      g.appendChild(b);
    });
  };
  function detail(w) {
    $("modalBody").innerHTML = '<div class="d-card s-' + w.life + '">' + cardHTML(w) + "</div>" +
      '<dl class="d-dl"><dt>ジャンル</dt><dd>' + D.GENRES[w.genre] + "</dd>" +
      "<dt>くらしの きせつ</dt><dd>" + SEASON_ICON[w.life] + " " + SN[w.life] + "</dd>" +
      "<dt>はいくの きせつ</dt><dd>" + (w.kigo.length === 1 ? SEASON_ICON[w.kigo[0]] + " " : "") + kigoLabel(w) + (D.isShifted(w) ? ' <span class="tag">ずれる！</span>' : "") + "</dd></dl>" +
      '<p class="d-note">' + esc(w.note) + "</p>" + (w.why ? '<p class="d-why">📜 ' + esc(w.why) + "</p>" : "") +
      '<button type="button" class="big alt" id="dRead">🔊 「' + esc(w.yomi) + "」</button>";
    $("dRead").onclick = function () { speak(w.yomi, 0.85); };
    $("modal").hidden = false;
  }
  $("modalClose").onclick = function () { $("modal").hidden = true; hush(); };
  $("modal").onclick = function (e) { if (e.target === $("modal")) { $("modal").hidden = true; hush(); } };

  // テスト用（?screen=haiku など）
  var m = /[?&]screen=(\w+)/.exec(location.search);
  show(m && TITLES[m[1]] ? m[1] : "home");
  window.SK_APP = { S: S, show: show, BY_ID: BY_ID };
})();
