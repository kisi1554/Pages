/* しりとり れっしゃ — がめんと うごき */
(function () {
  "use strict";

  var S = window.Shiritori;
  var WORDS = window.SHIRITORI_WORDS;
  var $ = function (id) { return document.getElementById(id); };

  // ---------- きろく（localStorage） ----------
  var KEY = "shiritori-ressha-v1";
  var store = { best: 0, seen: [], nigori: false, sound: true };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var o = JSON.parse(raw);
      if (o && typeof o === "object") {
        if (typeof o.best === "number") store.best = o.best;
        if (Array.isArray(o.seen)) store.seen = o.seen.filter(function (w) { return typeof w === "string"; });
        if (typeof o.nigori === "boolean") store.nigori = o.nigori;
        if (typeof o.sound === "boolean") store.sound = o.sound;
      }
    }
  } catch (e) { /* よめなくても あそべる */ }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ほぞん できなくても つづける */ }
  }
  function addSeen(w) {
    if (store.seen.indexOf(w) < 0) store.seen.push(w);
  }

  // ---------- こうかおん（WebAudio 合成） ----------
  var actx = null;
  function ac() {
    if (!store.sound) return null;
    if (!actx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) actx = new AC();
      } catch (e) { actx = null; }
    }
    if (actx && actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(freq, dur, type, vol, delay, toFreq) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (delay || 0);
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (toFreq) osc.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(dur, vol, delay, freq) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (delay || 0);
    var len = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf;
    f.type = "bandpass"; f.frequency.value = freq || 1500; f.Q.value = 1.2;
    g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t);
  }
  var SFX = {
    gachan: function () {          // れんけつ「ガチャン」
      noise(0.07, 0.5, 0, 2500);
      tone(110, 0.12, "square", 0.12, 0, 60);
      noise(0.1, 0.6, 0.11, 1800);
      tone(90, 0.15, "square", 0.12, 0.11, 50);
      tone(1320, 0.12, "triangle", 0.06, 0.2);
    },
    bubu: function () {            // ぶぶー
      tone(170, 0.18, "sawtooth", 0.12, 0);
      tone(150, 0.38, "sawtooth", 0.12, 0.22);
    },
    whistle: function () {         // きてき「ポーッ」
      [0, 0.55].forEach(function (dl, k) {
        var dur = k ? 0.9 : 0.4;
        tone(740, dur, "triangle", 0.16, dl);
        tone(932, dur, "sine", 0.1, dl);
        tone(1110, dur, "sine", 0.06, dl);
        noise(dur, 0.08, dl, 3000);
      });
    },
    depart: function () {          // しゅっぱつ「ポッ シュッシュッ」
      tone(784, 0.3, "triangle", 0.14, 0);
      tone(988, 0.3, "sine", 0.08, 0);
      for (var i = 0; i < 6; i++) noise(0.09, 0.35, 0.35 + i * 0.18, 900);
    },
    magic: function () {           // まほうの きっぷ
      [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, 0.25, "sine", 0.12, i * 0.08); });
    },
    fanfare: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.3, "triangle", 0.14, i * 0.12); });
    }
  };

  // ---------- よみあげ（speechSynthesis があれば） ----------
  var hasSpeech = "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";
  var jaVoice = null;
  function pickVoice() {
    try {
      var vs = window.speechSynthesis.getVoices() || [];
      jaVoice = vs.filter(function (v) { return /^ja/i.test(v.lang); })[0] || null;
    } catch (e) { jaVoice = null; }
  }
  if (hasSpeech) {
    pickVoice();
    try { window.speechSynthesis.onvoiceschanged = pickVoice; } catch (e) { /* なし */ }
  }
  function stopSpeech() {
    if (hasSpeech) try { window.speechSynthesis.cancel(); } catch (e) { /* なし */ }
  }
  /** よみあげて、おわったら onend（おとオフ・ひたいおうでも じかんで よぶ） */
  function speak(text, onend) {
    var called = false;
    function fin() { if (!called) { called = true; if (onend) onend(); } }
    if (!store.sound || !hasSpeech) { if (onend) setTimeout(fin, 750); return; }
    try {
      stopSpeech();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      if (jaVoice) u.voice = jaVoice;
      u.rate = 0.9; u.pitch = 1.15;
      u.onend = fin; u.onerror = fin;
      window.speechSynthesis.speak(u);
      if (onend) setTimeout(fin, 900 + text.length * 320); // onend が こない ブラウザ よけ
    } catch (e) { if (onend) setTimeout(fin, 750); }
  }

  // ---------- がめん ----------
  function show(id) {
    ["title", "game", "zukan"].forEach(function (s) { $(s).classList.toggle("active", s === id); });
    $("result").hidden = true;
    if (id === "title") renderTitle();
  }
  function renderTitle() {
    $("bestNum").textContent = store.best;
    var b = $("nigoriBtn");
    b.setAttribute("aria-pressed", store.nigori ? "true" : "false");
    b.querySelector("b").textContent = store.nigori ? "オン" : "オフ";
  }
  function renderSound() {
    $("soundBtn").textContent = store.sound ? "🔊" : "🔇";
    $("soundBtn").setAttribute("aria-pressed", store.sound ? "true" : "false");
  }

  // ---------- ゲーム ----------
  var PLAYERS = [{ name: "あお", c: "#3d8bfd" }, { name: "ぴんく", c: "#f0609e" }];
  var SOLO_COLORS = ["#f6a23b", "#4bb3e6", "#e85d75", "#7cb342", "#9b7bea", "#ef7d3c"];
  var KANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ";
  var G = null;

  function startGame(mode) {
    var start = S.pickStart(WORDS);
    G = {
      mode: mode, nigori: store.nigori, turn: 0,
      chain: [{ word: start, player: -1 }],
      used: new Set([start.w]),
      need: S.lastChar(start.w),
      cards: [], busy: false, over: false, perPlayer: [0, 0], endWord: null
    };
    show("game");
    var train = $("train");
    train.style.transition = "none";
    train.style.transform = "";
    train.innerHTML = "";
    train.appendChild(carEl(G.chain[0], 0));
    $("track").scrollLeft = 0;
    updateRails();
    updateCount();
    renderTurn();
    renderPrompt();
    dealCards();
    setButtons(true);
    speak("きかんしゃは 「" + start.w + "」。 " + needSpeech());
  }

  function wordCount() {
    return G.chain.filter(function (e, i) { return i > 0 && !e.rescue; }).length;
  }
  function updateCount() { $("countNum").textContent = wordCount(); }

  function needChars() {
    if (!G.nigori) return [G.need];
    var base = S.seion(G.need);
    return KANA.split("").filter(function (c) { return S.seion(c) === base; });
  }
  function needSpeech() {
    return needChars().map(function (c) { return "「" + c + "」"; }).join("か") + "で はじまる ことばは どれ？";
  }
  function renderPrompt() {
    var p = $("prompt");
    p.innerHTML = "";
    needChars().forEach(function (c) {
      var s = document.createElement("span");
      s.className = "need"; s.textContent = c;
      p.appendChild(s);
    });
    p.appendChild(document.createTextNode(" で はじまる ことばは どれ？"));
  }
  function renderTurn() {
    var t = $("turn");
    t.innerHTML = "";
    var s = document.createElement("span");
    s.className = "who";
    if (G.mode === "duo") {
      s.style.setProperty("--c", PLAYERS[G.turn].c);
      s.textContent = PLAYERS[G.turn].name + " の ばん";
    } else {
      s.style.setProperty("--c", "#2e8b57");
      s.textContent = "🚂 しりとり れっしゃ";
    }
    t.appendChild(s);
  }

  function carEl(entry, idx) {
    var d = document.createElement("div");
    d.className = "car";
    var win = document.createElement("span"); win.className = "win";
    var word = document.createElement("span"); word.className = "word";
    if (idx === 0) {
      d.classList.add("loco");
      var tag = document.createElement("span"); tag.className = "tag"; tag.textContent = "きかんしゃ";
      var sm = document.createElement("span"); sm.className = "smoke"; sm.textContent = "💨";
      d.appendChild(tag); d.appendChild(sm);
      win.textContent = entry.word.e; word.textContent = entry.word.w;
    } else if (entry.rescue) {
      d.classList.add("rescue");
      win.textContent = "🎫"; word.textContent = "のりかえ→" + entry.next;
    } else {
      var col = G.mode === "duo" ? PLAYERS[entry.player].c : SOLO_COLORS[(idx - 1) % SOLO_COLORS.length];
      d.style.setProperty("--c", col);
      win.textContent = entry.word.e; word.textContent = entry.word.w;
    }
    d.appendChild(win); d.appendChild(word);
    var wh = document.createElement("span"); wh.className = "wheels";
    wh.innerHTML = "<i></i><i></i>";
    d.appendChild(wh);
    return d;
  }

  function updateRails() {
    $("rails").style.width = Math.max($("track").clientWidth, $("train").scrollWidth) + "px";
  }
  function scrollToEnd() {
    var tr = $("track");
    tr.scrollTo({ left: tr.scrollWidth, behavior: "smooth" });
  }
  function appendCar() {
    var idx = G.chain.length - 1;
    var el = carEl(G.chain[idx], idx);
    el.classList.add("join");
    $("train").appendChild(el);
    updateRails();
    // さいごの しゃりょうが まんなかあたりに くるまで スクロール
    var tr = $("track");
    requestAnimationFrame(function () {
      tr.scrollTo({ left: Math.max(0, el.offsetLeft + el.offsetWidth / 2 - tr.clientWidth * 0.6), behavior: "smooth" });
    });
  }

  function dealCards() {
    G.cards = S.deal(G.need, G.used, G.nigori, WORDS);
    var box = $("cards");
    box.innerHTML = "";
    var playable = G.cards.some(function (c) { return c.kind !== "wrong"; });
    if (!playable) { finish("all"); return; }
    G.cards.forEach(function (c, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "card enter";
      b.style.animationDelay = (i * 0.06) + "s";
      if (c.kind === "rescue") {
        b.classList.add("rescue");
        b.innerHTML = '<span class="emo">🎫</span><span class="txt">まほうの きっぷ</span>';
        var sm = document.createElement("small");
        sm.textContent = "「" + c.next + "」へ のりかえ";
        b.appendChild(sm);
        b.setAttribute("aria-label", "まほうの きっぷ " + c.next + " へ のりかえ");
      } else {
        var emo = document.createElement("span"); emo.className = "emo"; emo.textContent = c.word.e;
        var txt = document.createElement("span"); txt.className = "txt";
        var chars = Array.from(c.word.w);
        var hl = document.createElement("span"); hl.className = "hl"; hl.textContent = chars[0];
        txt.appendChild(hl);
        txt.appendChild(document.createTextNode(chars.slice(1).join("")));
        b.appendChild(emo); b.appendChild(txt);
        b.setAttribute("aria-label", c.word.w);
      }
      b.addEventListener("click", function () { onCard(i, b); });
      b.addEventListener("animationend", function () { b.classList.remove("enter"); b.style.animationDelay = ""; }, { once: true });
      box.appendChild(b);
    });
  }

  function hint() {
    var els = $("cards").children;
    G.cards.forEach(function (c, i) {
      if (c.kind === "ok" || c.kind === "rescue") {
        var el = els[i];
        el.classList.remove("hint"); void el.offsetWidth; el.classList.add("hint");
        setTimeout(function () { el.classList.remove("hint"); }, 1100);
      }
    });
  }

  function onCard(i, el) {
    if (!G || G.busy || G.over) return;
    var c = G.cards[i], g = G;
    if (el.classList.contains("wrong")) return;

    if (c.kind === "wrong") {
      SFX.bubu();
      el.classList.add("wrong");
      el.disabled = true;
      hint();
      speak("「" + c.word.w + "」は つながらないよ");
      return;
    }

    G.busy = true;
    setButtons(false);

    if (c.kind === "trap") {
      el.classList.add("trap-picked");
      G.endWord = { word: c.word, player: G.mode === "duo" ? G.turn : 0 };
      addSeen(c.word.w); save();
      speak(c.word.w);
      setTimeout(function () {
        if (G !== g) return;
        SFX.whistle();
        speak("「ん」が ついちゃった！ しゃこに もどるよ");
        goDepot(function () { finish("n"); });
      }, 900);
      return;
    }

    el.classList.add("picked");
    SFX.gachan();
    var say;
    if (c.kind === "rescue") {
      SFX.magic();
      G.chain.push({ rescue: true, next: c.next, player: G.turn });
      G.need = c.next;
      say = "まほうの きっぷ！ " + needSpeech();
    } else {
      G.chain.push({ word: c.word, player: G.mode === "duo" ? G.turn : 0 });
      G.used.add(c.word.w);
      G.need = S.lastChar(c.word.w);
      G.perPlayer[G.mode === "duo" ? G.turn : 0]++;
      addSeen(c.word.w); save();
      if (G.mode === "duo") G.turn = 1 - G.turn;
      say = c.word.w + "。 " + (G.mode === "duo" ? PLAYERS[G.turn].name + "の ばん。 " : "") + needSpeech();
    }
    appendCar();
    updateCount();
    speak(say);
    setTimeout(function () {
      if (G !== g) return;
      renderTurn();
      renderPrompt();
      G.busy = false;
      setButtons(true);
      dealCards();
    }, 750);
  }

  function setButtons(on) {
    $("goBtn").disabled = !on;
    $("endBtn").disabled = !on;
  }

  /** しゅっぱつ！ … れっしゃが はしって、しゃりょうの ことばを じゅんに よむ */
  function runTrain() {
    if (!G || G.busy || G.over) return;
    var g = G;
    G.busy = true;
    setButtons(false);
    var tr = $("track"), cars = $("train").children;
    tr.classList.add("moving");
    SFX.depart();
    var i = 0;
    function next() {
      if (G !== g) return;
      if (i >= cars.length) {
        tr.classList.remove("moving");
        scrollToEnd();
        G.busy = false;
        setButtons(true);
        return;
      }
      var el = cars[i], e = G.chain[i];
      tr.scrollTo({ left: Math.max(0, el.offsetLeft + el.offsetWidth / 2 - tr.clientWidth / 2), behavior: "smooth" });
      el.classList.remove("lit"); void el.offsetWidth; el.classList.add("lit");
      i++;
      speak(e.rescue ? "のりかえ" : e.word.w, next);
    }
    setTimeout(next, 900);
  }

  /** しゃこへ もどる */
  function goDepot(cb) {
    var g = G, tr = $("track"), train = $("train");
    tr.scrollTo({ left: 0, behavior: "smooth" });
    tr.classList.add("moving");
    setTimeout(function () {
      if (G !== g) return;
      train.style.transition = "";
      train.style.transform = "translateX(-" + (train.scrollWidth + 40) + "px)";
      setTimeout(function () {
        if (G !== g) return;
        tr.classList.remove("moving");
        cb();
      }, 1700);
    }, 400);
  }

  function finish(reason) {
    if (!G || G.over) return;
    G.over = true;
    G.busy = true;
    setButtons(false);
    stopSpeech();
    var n = wordCount();
    var record = n > store.best;
    if (record) store.best = n;
    save();

    $("resTitle").textContent = reason === "n" ? "「ん」で おしまい！" : reason === "all" ? "ぜんぶ つないだ！" : "おしまい！";
    $("resMsg").textContent = reason === "n"
      ? "「" + G.endWord.word.w + "」で「ん」が ついたよ"
      : reason === "all" ? "つなげる ことばが なくなったよ。すごい！" : "おつかれさま！";
    $("resNum").textContent = n;
    $("resRecord").hidden = !record || n === 0;

    var pl = $("resPlayers");
    pl.innerHTML = "";
    if (G.mode === "duo") {
      PLAYERS.forEach(function (p, k) {
        var s = document.createElement("span");
        s.style.setProperty("--c", p.c);
        s.textContent = p.name + " " + G.perPlayer[k] + "りょう";
        pl.appendChild(s);
      });
    }

    var box = $("resWords");
    box.innerHTML = "";
    function chip(text, color, cls) {
      if (box.children.length) {
        var a = document.createElement("span"); a.className = "arrow"; a.textContent = "→";
        box.appendChild(a);
      }
      var s = document.createElement("span");
      s.textContent = text;
      if (color) s.style.setProperty("--c", color);
      if (cls) s.className = cls;
      box.appendChild(s);
    }
    G.chain.forEach(function (e, i) {
      if (i === 0) chip("🚂" + e.word.e + e.word.w, "#1f6b42");
      else if (e.rescue) chip("🎫のりかえ", "#f2b705");
      else chip(e.word.e + e.word.w, G.mode === "duo" ? PLAYERS[e.player].c : SOLO_COLORS[(i - 1) % SOLO_COLORS.length]);
    });
    if (G.endWord) chip(G.endWord.word.e + G.endWord.word.w, null, "end");

    $("result").hidden = false;
    if (record && n > 0) SFX.fanfare();
    speak("れんけつ " + n + "りょう！" + (record && n > 0 ? " しんきろく！" : ""));
  }

  // ---------- ずかん ----------
  var GENRES = ["いきもの", "たべもの", "のりもの", "もの", "しぜん", "からだ"];
  function renderZukan() {
    var list = $("zukanList");
    list.innerHTML = "";
    var seen = {};
    store.seen.forEach(function (w) { seen[w] = 1; });
    var got = WORDS.filter(function (o) { return seen[o.w]; }).length;
    $("zukanCount").textContent = got + " / " + WORDS.length;
    GENRES.forEach(function (gname) {
      var ws = WORDS.filter(function (o) { return o.g === gname; });
      if (!ws.length) return;
      var h = document.createElement("h3");
      h.textContent = gname + "（" + ws.filter(function (o) { return seen[o.w]; }).length + " / " + ws.length + "）";
      list.appendChild(h);
      var grid = document.createElement("div");
      grid.className = "zukan-grid";
      ws.forEach(function (o) {
        var d = document.createElement("div");
        var has = !!seen[o.w];
        d.className = "zk" + (has ? "" : " no");
        var e = document.createElement("span"); e.className = "emo"; e.textContent = has ? o.e : "❔";
        var t = document.createElement("span"); t.className = "txt"; t.textContent = has ? o.w : S.head(o.w) + "…";
        d.appendChild(e); d.appendChild(t);
        grid.appendChild(d);
      });
      list.appendChild(grid);
    });
    show("zukan");
    list.scrollTop = 0;
  }

  // ---------- ボタン ----------
  Array.prototype.forEach.call(document.querySelectorAll("[data-mode]"), function (b) {
    b.addEventListener("click", function () { ac(); startGame(b.getAttribute("data-mode")); });
  });
  $("nigoriBtn").addEventListener("click", function () {
    store.nigori = !store.nigori; save(); renderTitle();
    speak(store.nigori ? "にごり ゆるす。 「か」と「が」は おなじだよ" : "にごり ゆるさない");
  });
  $("zukanBtn").addEventListener("click", renderZukan);
  $("zukanBack").addEventListener("click", function () { show("title"); });
  $("soundBtn").addEventListener("click", function () {
    store.sound = !store.sound; save(); renderSound();
    if (!store.sound) stopSpeech(); else SFX.gachan();
  });
  $("homeBtn").addEventListener("click", function () { G = null; stopSpeech(); show("title"); });
  $("goBtn").addEventListener("click", runTrain);
  $("endBtn").addEventListener("click", function () {
    if (!G || G.busy || G.over) return;
    G.busy = true; setButtons(false);
    SFX.whistle();
    goDepot(function () { finish("end"); });
  });
  $("againBtn").addEventListener("click", function () { var m = G ? G.mode : "solo"; startGame(m); });
  $("menuBtn").addEventListener("click", function () { G = null; show("title"); });
  window.addEventListener("resize", function () { if (G) updateRails(); });

  renderSound();
  renderTitle();
})();
