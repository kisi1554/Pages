/* ============================================================
   てんびん パズル — ほんたい
   てんびんは SVG（viewBox -28 0 456 282。おさらが はしで きれない ように よこを ひろめに）。ささえ の じく は (200, 70)、うで の ながさ は 140。
   かくど th は プラス で ひだりが さがる。ばね-ダンパ で ゆらゆら → ぴたっと とまる。
   ============================================================ */
(function () {
  "use strict";

  var D = window.TenbinData;
  var SKEY = "tenbin-puzzle-v1";
  var NS = "http://www.w3.org/2000/svg";
  var MODES = {
    k: { name: "くらべっこ", icon: "🍉", lv: "★", stages: D.KURABE,
         desc: "どっちが おもい？ てんびんで くらべて おもい じゅんに ならべよう" },
    o: { name: "おきかえ すいり", icon: "🍌", lv: "★★", stages: D.OKIKAE,
         desc: "つりあった てんびんから「🍊 なんこ ぶん？」を かんがえよう" },
    t: { name: "つりあわせ", icon: "⚖️", lv: "★★〜★★★", stages: D.TSURIAI,
         desc: "1・2・5・10 の ぶんどうで ぴったり つりあわせよう" }
  };

  /* ---------- ほぞん ---------- */
  var save = { s: { k: [], o: [], t: [] }, coin: 0, sound: true };
  try {
    var raw = localStorage.getItem(SKEY);
    if (raw) {
      var p = JSON.parse(raw);
      if (p && typeof p === "object") {
        ["k", "o", "t"].forEach(function (m) { if (p.s && Array.isArray(p.s[m])) save.s[m] = p.s[m].map(function (x) { return x | 0; }); });
        save.coin = p.coin | 0;
        save.sound = p.sound !== false;
      }
    }
  } catch (e) {}
  function persist() { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} }
  function starsOf(m, i) { return save.s[m][i] | 0; }
  function unlocked(m, i) { return i === 0 || starsOf(m, i - 1) > 0; }
  function totalStars() {
    var t = save.coin;
    ["k", "o", "t"].forEach(function (m) { save.s[m].forEach(function (x) { t += x | 0; }); });
    return t;
  }

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
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || .3, t + .005);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
    }
    function noise(dur, freq, vol, when) {
      if (!save.sound || !ensure()) return;
      var t = ctx.currentTime + (when || 0), n = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource(); src.buffer = buf;
      var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 3; bp.frequency.value = freq;
      var g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      src.connect(bp); bp.connect(g); g.connect(master); src.start(t);
    }
    return {
      unlock: ensure,
      koton: function () { tone(300, 120, .16, "triangle", .4); noise(.05, 1200, .25); },      // ことん
      lift: function () { tone(520, 760, .08, "triangle", .15); },
      click: function () { tone(2400, 2400, .025, "square", .12); noise(.03, 4000, .3); tone(3300, 3300, .03, "square", .08, .05); }, // カチッ
      tap: function () { tone(880, 880, .05, "triangle", .12); },
      boo: function () { tone(170, 120, .22, "sawtooth", .14); tone(165, 115, .32, "sawtooth", .14, .26); },     // ぶぶー
      fanfare: function () {
        var seq = [[523, 0], [659, .12], [784, .24], [1047, .4], [784, .56], [1047, .68]];
        seq.forEach(function (s) { tone(s[0], s[0], .26, "triangle", .25, s[1]); tone(s[0] / 2, s[0] / 2, .26, "sine", .12, s[1]); });
        tone(1568, 1568, .5, "sine", .12, .8);
      }
    };
  })();

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var views = { home: $("home"), stages: $("stages"), play: $("play") };
  var backBtn = $("backBtn"), titleText = $("titleText"), soundBtn = $("soundBtn");
  var questionEl = $("question"), cluesEl = $("clues"), scaleBox = $("scaleBox"), statusEl = $("status"), panel = $("panel");
  var toastEl = $("toast"), modal = $("modal");
  var view = "home", cur = null, scale = null;

  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2000);
  }
  function setStatus(html) { statusEl.innerHTML = html || ""; }
  function starStr(n) {
    var s = ""; for (var i = 0; i < 3; i++) s += i < n ? "★" : '<span class="off">★</span>'; return s;
  }

  /* グラデーションは ページに 1つだけ（どの てんびんからも つかう） */
  (function () {
    var s = svgEl("svg", { width: 0, height: 0, "aria-hidden": "true", style: "position:absolute" }, document.body);
    var defs = svgEl("defs", {}, s);
    var g1 = svgEl("linearGradient", { id: "brass", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    svgEl("stop", { offset: "0", "stop-color": "#f3d77a" }, g1);
    svgEl("stop", { offset: "1", "stop-color": "#b8902c" }, g1);
    var g2 = svgEl("linearGradient", { id: "iron", x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    svgEl("stop", { offset: "0", "stop-color": "#8d949c" }, g2);
    svgEl("stop", { offset: ".45", "stop-color": "#d5dade" }, g2);
    svgEl("stop", { offset: "1", "stop-color": "#6c737b" }, g2);
  })();

  /* ---------- のせる もの の え ----------
     it = { t:"e", e:えもじ, w, badge? } | { t:"w", v:ぶんどう } | { t:"c", n:きんかの ばんごう, w }
     (x, y) は おく ばしょ の まんなか した。 */
  function drawThing(g, it, x, y, sz) {
    if (it.t === "w") {
      var hh = sz * (0.58 + 0.042 * it.v), ww = hh * 0.82, top = y - hh * 0.78;
      svgEl("circle", { cx: x, cy: top - hh * 0.08, r: hh * 0.13, class: "wt-body" }, g);
      svgEl("rect", { x: x - ww / 2, y: top, width: ww, height: hh * 0.78, rx: ww * 0.22, class: "wt-body" }, g);
      var t = svgEl("text", { x: x, y: y - hh * 0.22, class: "wt-text", "font-size": hh * 0.44 }, g);
      t.textContent = it.v;
    } else if (it.t === "c") {
      var r = sz * 0.44;
      svgEl("circle", { cx: x, cy: y - r - 1, r: r, class: "coin-body" }, g);
      svgEl("circle", { cx: x, cy: y - r - 1, r: r * 0.78, fill: "none", stroke: "#d9a400", "stroke-width": 1.5 }, g);
      var ct = svgEl("text", { x: x, y: y - r + r * 0.42, class: "coin-text", "font-size": r * 1.15 }, g);
      ct.textContent = it.n;
    } else {
      var et = svgEl("text", { x: x, y: y - sz * 0.14, class: "sc-emoji", "font-size": sz }, g);
      et.textContent = it.e;
      if (it.badge) {
        var bg = svgEl("g", { class: "sc-badge" }, g), br = sz * 0.27;
        svgEl("circle", { cx: x + sz * 0.38, cy: y - sz * 0.88, r: br }, bg);
        var bt = svgEl("text", { x: x + sz * 0.38, y: y - sz * 0.88 + br * 0.4, "font-size": br * 1.15 }, bg);
        bt.textContent = it.badge;
      }
    }
  }
  function weightIcon(v) {
    var s = svgEl("svg", { viewBox: "-24 -46 48 50", "aria-hidden": "true" });
    drawThing(s, { t: "w", v: v }, 0, 0, 44);
    return s;
  }
  function coinIcon(n) {
    var s = svgEl("svg", { viewBox: "-24 -46 48 50", "aria-hidden": "true" });
    drawThing(s, { t: "c", n: n }, 0, 0, 46);
    return s;
  }
  function wOf(it) { return it.t === "w" ? it.v : it.w; }
  function sumOf(arr) { return arr.reduce(function (s, it) { return s + wOf(it); }, 0); }

  /* ---------- てんびん ---------- */
  var CX = 200, CY = 70, ARM = 140, HANG = 100;
  var K = 70, C = 6.5;                               // ばね と ダンパ
  function Scale(host, opt) {
    this.opt = opt || {};
    this.left = []; this.right = [];
    this.th = 0; this.v = 0; this.target = 0; this.locked = false; this.running = false; this.dead = false;
    // ヒントよう の ちいさい てんびん は だい を きりおとして、のせた ものを おおきく みせる
    var vb = this.opt.small ? "-28 16 456 206" : "-28 0 456 282";
    var svg = this.svg = svgEl("svg", { viewBox: vb, role: "img", "aria-label": "てんびん" }, host);
    svgEl("path", { d: "M135 276 L265 276 L245 254 L155 254 Z", class: "sc-base" }, svg);
    svgEl("rect", { x: 192, y: 66, width: 16, height: 192, rx: 6, class: "sc-post" }, svg);
    var st = this.stops = svgEl("g", { class: "sc-stop" }, svg);
    [CX - ARM, CX + ARM].forEach(function (x) {
      svgEl("rect", { x: x - 18, y: CY + HANG + 20, width: 36, height: 254 - (CY + HANG + 20), rx: 4 }, st);
    });
    var self = this;
    this.pans = [0, 1].map(function (side) {
      var g = svgEl("g", {}, svg);
      svgEl("line", { x1: 0, y1: 0, x2: -66, y2: HANG, class: "sc-string" }, g);
      svgEl("line", { x1: 0, y1: 0, x2: 66, y2: HANG, class: "sc-string" }, g);
      svgEl("path", { d: "M-76 " + HANG + " Q0 " + (HANG + 34) + " 76 " + HANG + " Z", class: "sc-dish " + (side ? "r" : "l") }, g);
      var items = svgEl("g", {}, g);
      return { g: g, items: items };
    });
    var beam = this.beam = svgEl("g", {}, svg);
    svgEl("line", { x1: CX, y1: CY, x2: CX, y2: CY - 44, class: "sc-needle" }, beam);
    svgEl("rect", { x: CX - ARM - 6, y: CY - 7, width: ARM * 2 + 12, height: 14, rx: 7, class: "sc-beam" }, beam);
    svgEl("circle", { cx: CX - ARM, cy: CY, r: 6, class: "sc-pivot" }, beam);
    svgEl("circle", { cx: CX + ARM, cy: CY, r: 6, class: "sc-pivot" }, beam);
    svgEl("circle", { cx: CX, cy: CY, r: 10, class: "sc-pivot" }, svg);
    this.pose();
  }
  Scale.prototype.pose = function () {
    var r = this.th * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    this.beam.setAttribute("transform", "rotate(" + (-this.th).toFixed(3) + " " + CX + " " + CY + ")");
    this.pans[0].g.setAttribute("transform", "translate(" + (CX - ARM * c).toFixed(2) + " " + (CY + ARM * s).toFixed(2) + ")");
    this.pans[1].g.setAttribute("transform", "translate(" + (CX + ARM * c).toFixed(2) + " " + (CY - ARM * s).toFixed(2) + ")");
    this.stops.style.display = this.locked ? "" : "none";
  };
  Scale.prototype.drawSide = function (side) {
    var g = this.pans[side].items, arr = side ? this.right : this.left, n = arr.length, self = this;
    g.textContent = "";
    if (!n) return;
    var per = n <= 3 ? 3 : n <= 8 ? 4 : 5, sz = n <= 3 ? 42 : n <= 8 ? 31 : 25;
    if (this.opt.small) { per = n <= 2 ? 2 : 3; sz = n <= 2 ? 58 : 44; }
    arr.forEach(function (it, i) {
      var row = Math.floor(i / per), col = i % per, inRow = Math.min(per, n - row * per);
      var x = (col - (inRow - 1) / 2) * sz * 1.08, y = HANG - 2 - row * sz * 0.98;
      var ig = svgEl("g", { class: "sc-item" }, g);
      svgEl("rect", { x: x - sz * 0.54, y: y - sz, width: sz * 1.08, height: sz, class: "sc-hit" }, ig);
      drawThing(ig, it, x, y, sz);
      if (self.opt.onTap) ig.addEventListener("click", function (ev) { ev.stopPropagation(); self.opt.onTap(side, i, it); });
    });
  };
  /* なかみが かわったら よぶ。かたむきの めあてを きめて うごかす */
  Scale.prototype.update = function () {
    this.drawSide(0); this.drawSide(1);
    this.target = this.locked ? 0 : D.tilt(sumOf(this.left) - sumOf(this.right));
    this.pose();
    this.kick();
  };
  Scale.prototype.balanced = function () {
    return this.left.length > 0 && this.right.length > 0 && sumOf(this.left) === sumOf(this.right);
  };
  Scale.prototype.kick = function () {
    if (this.running || this.dead) return;
    this.running = true;
    var self = this, last = performance.now();
    function step(now) {
      if (self.dead) return;
      var dt = Math.min(.033, (now - last) / 1000); last = now;
      for (var k = 0; k < 4; k++) {
        var hdt = dt / 4, a = -K * (self.th - self.target) - C * self.v;
        self.v += a * hdt; self.th += self.v * hdt;
      }
      // ちいさく なったら ぴたっと とめる
      if (Math.abs(self.th - self.target) < .35 && Math.abs(self.v) < 2.5) {
        self.th = self.target; self.v = 0; self.pose(); self.running = false;
        if (self.opt.onSettle) self.opt.onSettle(self);
        return;
      }
      self.pose();
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  function sparkle() {
    var colors = ["✨", "⭐", "✨", "💫"];
    for (var i = 0; i < 12; i++) {
      var s = h("span", "spark", colors[i % colors.length]);
      var a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
      s.style.left = (50 + (Math.random() - .5) * 30) + "%";
      s.style.top = (40 + (Math.random() - .5) * 20) + "%";
      s.style.setProperty("--dx", Math.cos(a) * d + "px");
      s.style.setProperty("--dy", Math.sin(a) * d + "px");
      s.style.animationDelay = (Math.random() * .25) + "s";
      scaleBox.appendChild(s);
      setTimeout(function (el) { el.remove(); }.bind(null, s), 1500);
    }
  }
  function tiltText(sc, lName, rName) {
    var d = sumOf(sc.left) - sumOf(sc.right);
    if (!d) return '<span class="ok">つりあった！</span>';
    return d > 0 ? '<span class="l">ひだり' + (lName ? "（" + lName + "）" : "") + "</span> の ほうが おもい"
                 : '<span class="r">みぎ' + (rName ? "（" + rName + "）" : "") + "</span> の ほうが おもい";
  }

  /* ---------- がめん きりかえ ---------- */
  function show(v) {
    view = v;
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== v; });
    backBtn.hidden = v === "home";
    $("starCount").textContent = totalStars();
    if (v !== "play" && scale) { scale.dead = true; scale = null; }
  }
  function goHome() {
    show("home"); titleText.textContent = "てんびん パズル";
    var list = $("modeList"); list.textContent = "";
    Object.keys(MODES).forEach(function (m) {
      var M = MODES[m], got = save.s[m].reduce(function (a, b) { return a + (b | 0); }, 0);
      var b = h("button", "mode-card",
        '<span class="mi" aria-hidden="true">' + M.icon + '</span><span class="mt">' +
        '<span class="mn">' + M.name + '<span class="lv">' + M.lv + "</span></span>" +
        '<span class="md">' + M.desc + "</span>" +
        '<span class="mp">⭐ ' + got + " / " + M.stages.length * 3 + "</span></span>");
      b.addEventListener("click", function () { Sound.tap(); goStages(m); });
      list.appendChild(b);
    });
    var c = h("button", "mode-card bonus",
      '<span class="mi" aria-hidden="true">🪙</span><span class="mt">' +
      '<span class="mn">にせものの きんか<span class="lv">ボーナス</span></span>' +
      '<span class="md">9まいの うち 1まいだけ かるい。てんびん 2かい で みつけよう</span>' +
      '<span class="mp">' + (save.coin ? starStr(save.coin) : "まだ ちょうせん して いないよ") + "</span></span>");
    c.addEventListener("click", function () { Sound.tap(); startCoin(); });
    list.appendChild(c);
  }
  function goStages(m) {
    show("stages"); cur = { mode: m };
    var M = MODES[m];
    titleText.textContent = M.name;
    $("stagesLead").innerHTML = M.desc;
    var grid = $("stageGrid"); grid.textContent = "";
    M.stages.forEach(function (st, i) {
      var open = unlocked(m, i), n = starsOf(m, i);
      var pic = m === "k" ? st.items.map(function (x) { return x.e; }).join("")
              : m === "o" ? st.ask[0] + "＝" + st.ask[1] + "?" : st.e + (st.both ? "⇄" : "");
      var b = h("button", "card" + (n ? " cleared" : "") + (open ? "" : " locked"),
        (m === "t" ? '<span class="lvl">' + (st.lv === 3 ? "★★★" : "★★") + "</span>" : "") +
        '<span class="no">' + (open ? i + 1 : "🔒") + '</span><span class="pic">' + pic + '</span><span class="st">' + starStr(n) + "</span>");
      b.setAttribute("aria-label", "ステージ " + (i + 1) + (open ? "" : " まだ あかない"));
      b.addEventListener("click", function () {
        if (!open) { Sound.boo(); toast("まえの ステージを クリア すると あくよ"); return; }
        Sound.tap(); startStage(m, i);
      });
      grid.appendChild(b);
    });
  }
  function startStage(m, i) {
    show("play");
    titleText.textContent = MODES[m].name + " " + (i + 1);
    cur = { mode: m, idx: i };
    resetPlay();
    if (m === "k") startK(i); else if (m === "o") startO(i); else startT(i);
  }
  function resetPlay() {
    questionEl.innerHTML = ""; cluesEl.textContent = ""; cluesEl.hidden = true;
    scaleBox.textContent = ""; panel.textContent = ""; setStatus("");
    if (scale) scale.dead = true;
    views.play.scrollTop = 0;
  }
  backBtn.addEventListener("click", function () {
    Sound.tap(); closeModal();
    if (view === "play" && cur && cur.mode !== "coin") goStages(cur.mode); else goHome();
  });
  function syncSound() {
    soundBtn.setAttribute("aria-pressed", save.sound ? "true" : "false");
    soundBtn.textContent = save.sound ? "🔊" : "🔇";
  }
  soundBtn.addEventListener("click", function () { save.sound = !save.sound; persist(); syncSound(); if (save.sound) { Sound.unlock(); Sound.tap(); } });

  /* ---------- けっか ---------- */
  function closeModal() { modal.hidden = true; }
  function openModal(title, body, btns) {
    $("mTitle").innerHTML = title; $("mBody").innerHTML = body;
    var box = $("mBtns"); box.textContent = "";
    btns.forEach(function (b) {
      var e = h("button", "mbtn" + (b.main ? " main" : ""), b.label);
      e.addEventListener("click", function () { Sound.tap(); closeModal(); b.go(); });
      box.appendChild(e);
    });
    modal.hidden = false;
  }
  function finish(stars, body) {
    var m = cur.mode, i = cur.idx;
    if (m === "coin") save.coin = Math.max(save.coin, stars);
    else save.s[m][i] = Math.max(starsOf(m, i), stars);
    persist();
    $("starCount").textContent = totalStars();
    setTimeout(function () { Sound.fanfare(); }, 250);
    sparkle();
    var btns = [];
    if (m === "coin") {
      btns.push({ label: "もういちど", main: true, go: startCoin });
      btns.push({ label: "メニュー", go: goHome });
    } else {
      var next = i + 1 < MODES[m].stages.length;
      if (next) btns.push({ label: "つぎへ ▶", main: true, go: function () { startStage(m, i + 1); } });
      btns.push({ label: "もういちど", main: !next, go: function () { startStage(m, i); } });
      btns.push({ label: "いちらん", go: function () { goStages(m); } });
    }
    setTimeout(function () {
      openModal("できた！", '<div class="big-stars">' + starStr(stars).replace(/★/g, "⭐") + "</div>" + body, btns);
    }, 900);
  }
  function box(title) {
    var b = h("div", "box"); if (title) b.appendChild(h("h3", "", title)); panel.appendChild(b); return b;
  }

  /* ============================================================
     1. くらべっこ
     ============================================================ */
  function startK(i) {
    var st = D.KURABE[i], n = st.items.length, limit = D.KURABE_LIMIT[n];
    var items = st.items.map(function (x, j) { return { t: "e", e: x.e, w: x.w, id: j }; });
    var S = { pick: [], weighs: 0, seen: {}, misses: 0, dirty: false, done: false };
    questionEl.innerHTML = n === 2 ? "どっちが おもい？ てんびんに のせて くらべよう"
                                   : "おもい じゅんに ならべよう。てんびんで 2つずつ くらべてね";
    scale = new Scale(scaleBox, {
      onTap: function (side) { if (S.done) return; Sound.lift(); (side ? scale.right : scale.left).length = 0; changed(); },
      onSettle: function (sc) {
        if (!S.dirty) return; S.dirty = false;
        if (sc.left.length && sc.right.length) {
          var key = [sc.left[0].id, sc.right[0].id].sort().join("-");
          if (!S.seen[key]) { S.seen[key] = 1; S.weighs++; }
          setStatus(tiltText(sc, sc.left[0].e, sc.right[0].e));
        } else setStatus("");
        drawPanel();
      }
    });
    function changed() { S.dirty = true; scale.update(); drawPanel(); }
    function onScale(it) { return scale.left.indexOf(it) >= 0 || scale.right.indexOf(it) >= 0; }

    var trayBox = box("① てんびんに のせる <small>（タップ で のせる／おさらを タップ で おろす）</small>");
    var tray = h("div", "tray"); trayBox.appendChild(tray);
    var ansBox = box(n === 2 ? "② おもい ほうは どっち？" : "② おもい じゅんに タップ <small>（タップ で とりけし）</small>");
    var slots = h("div", "slots"), chips = h("div", "tray"), meta = h("div", "meta");
    chips.style.marginTop = "10px";
    ansBox.appendChild(slots); ansBox.appendChild(chips); ansBox.appendChild(meta);

    function drawPanel() {
      tray.textContent = "";
      items.forEach(function (it) {
        var b = h("button", "tbtn" + (onScale(it) ? " used" : ""), it.e);
        b.setAttribute("aria-label", it.e + " を のせる");
        b.addEventListener("click", function () {
          if (S.done) return;
          if (onScale(it)) { toast("もう のって いるよ"); return; }
          if (!scale.left.length) scale.left.push(it);
          else if (!scale.right.length) scale.right.push(it);
          else { toast("おさらの うえを タップ して おろしてね"); return; }
          Sound.koton(); changed();
        });
        tray.appendChild(b);
      });
      slots.textContent = "";
      for (var k = 0; k < n; k++) {
        if (k) slots.appendChild(h("span", "gt", "＞"));
        var it = S.pick[k];
        var label = n === 2 ? (k ? "かるい" : "おもい") : (k ? k + 1 + "ばん" : "いちばん");
        var sl = h("button", "slot" + (it ? " filled" : ""), "<small>" + label + "</small>" + (it ? it.e : ""));
        (function (k) {
          sl.addEventListener("click", function () { if (S.done || !S.pick[k]) return; Sound.lift(); S.pick.splice(k); drawPanel(); });
        })(k);
        slots.appendChild(sl);
      }
      chips.textContent = "";
      items.forEach(function (it) {
        var used = S.pick.indexOf(it) >= 0;
        var b = h("button", "tbtn" + (used ? " used" : ""), it.e);
        b.setAttribute("aria-label", it.e + " を こたえに いれる");
        b.addEventListener("click", function () {
          if (S.done || used) return;
          Sound.tap(); S.pick.push(it);
          if (S.pick.length === n - 1) items.forEach(function (x) { if (S.pick.indexOf(x) < 0) S.pick.push(x); });
          drawPanel();
          if (S.pick.length === n) setTimeout(check, 300);
        });
        chips.appendChild(b);
      });
      meta.textContent = "くらべた かいすう: " + S.weighs + " かい（めやす " + limit + " かい）";
    }
    function check() {
      var ok = S.pick.every(function (it, k) { return k === 0 || S.pick[k - 1].w > it.w; });
      if (!ok) {
        Sound.boo(); S.misses++; S.pick = []; drawPanel();
        setStatus("ちがう みたい… てんびんで たしかめて みよう");
        return;
      }
      S.done = true;
      var stars = S.misses ? 1 : (S.weighs >= n - 1 && S.weighs <= limit) ? 3 : 2;
      var order = S.pick.map(function (it) { return it.e; }).join(" ＞ ");
      var body = '<div class="explain"><p class="shiki">' + order + "</p>" +
        "<p>くらべた かいすう: " + S.weighs + " かい</p></div>" +
        '<p class="note">' + (stars === 3 ? "てんびんで しっかり しらべたね！"
          : S.misses ? "まちがえても あきらめずに できたね。"
          : S.weighs < n - 1 ? "あたり！ こんどは てんびんで ぜんぶ たしかめて みよう。"
          : "めやす より すくない かいすうで できると ⭐3 だよ。") + "</p>";
      finish(stars, body);
    }
    drawPanel();
    scale.update();
  }

  /* ============================================================
     2. おきかえ すいり
     ============================================================ */
  function startO(i) {
    var st = D.OKIKAE[i], tE = st.ask[0], uE = st.ask[1];
    function item(e) { return { t: "e", e: e, w: st.w[e] }; }
    var S = { misses: 0, measuring: false, done: false };
    questionEl.innerHTML = '<span class="big">' + tE + "</span> は <span class=\"big\">" + uE + "</span> なんこ ぶん？";
    cluesEl.hidden = false;
    st.scales.forEach(function (sides, k) {
      var c = h("div", "clue", '<span class="cap">ヒント ' + (k + 1) + "</span>");
      cluesEl.appendChild(c);
      var cs = new Scale(c, { small: true });
      cs.left = sides[0].map(item); cs.right = sides[1].map(item);
      cs.drawSide(0); cs.drawSide(1);
    });
    scale = new Scale(scaleBox, {
      onTap: function (side) {
        if (S.done || side === 0) { if (side === 0) toast(tE + " は おろせないよ"); return; }
        Sound.lift(); scale.right.pop(); relock();
      },
      onSettle: function (sc) {
        if (!S.measuring) return; S.measuring = false;
        if (sc.balanced()) {
          S.done = true; Sound.click();
          setStatus('<span class="ok">つりあった！ ' + tE + " ＝ " + uE + " " + sc.right.length + "こ</span>");
          var stars = S.misses === 0 ? 3 : S.misses === 1 ? 2 : 1;
          var r = D.deduce(st), lines = r.steps.map(function (s) {
            return "<p>" + s.e + " は " + uE + " <b>" + s.v + "こ</b> ぶん</p>";
          }).join("");
          finish(stars, '<div class="explain">' + lines + '<p class="shiki">' + tE + " ＝ " + uE + " × " + st.answer + "</p></div>" +
            (stars < 3 ? '<p class="note">ヒントの てんびんで わかる ものから じゅんに おきかえて いくと、さいしょ から ぴったり こたえられるよ。</p>' : ""));
        } else {
          S.misses++; Sound.boo();
          var heavy = sumOf(sc.left) > sumOf(sc.right);
          setStatus(heavy ? '<span class="l">' + tE + " の ほうが おもい</span>。" + uE + " を ふやそう"
                          : '<span class="r">' + uE + " の ほうが おもい</span>。" + uE + " を へらそう");
        }
      }
    });
    scale.left = [item(tE)];
    scale.locked = true;

    function relock() { scale.locked = true; S.measuring = false; scale.update(); drawCount(); setStatus(""); }
    function measure() {
      if (S.done) return;
      if (!scale.right.length) { toast("みぎに " + uE + " を のせてね"); return; }
      Sound.tap(); scale.locked = false; S.measuring = true; scale.update();
      setStatus("どうかな…");
    }

    var b1 = box("てんびんで たしかめる <small>（ささえを はずすと うごくよ）</small>");
    var acts = h("div", "actions"); b1.appendChild(acts);
    var add = h("button", "abtn", '<span class="em">' + uE + "</span>＋ のせる");
    var sub = h("button", "abtn", '<span class="em">' + uE + "</span>− おろす");
    var go = h("button", "abtn main wide", '<span class="em">⚖️</span>はかる');
    acts.appendChild(add); acts.appendChild(sub); acts.appendChild(go);
    var cnt = h("div", "meta"); b1.appendChild(cnt);
    function drawCount() { cnt.textContent = "みぎ: " + uE + " × " + scale.right.length; }
    add.addEventListener("click", function () {
      if (S.done) return;
      if (scale.right.length >= D.PAD_MAX) { toast("それ いじょう のらないよ"); return; }
      Sound.koton(); scale.right.push(item(uE)); relock();
    });
    sub.addEventListener("click", function () { if (S.done || !scale.right.length) return; Sound.lift(); scale.right.pop(); relock(); });
    go.addEventListener("click", measure);

    var b2 = box("すうじで こたえる");
    var pad = h("div", "pad"); b2.appendChild(pad);
    for (var n = 1; n <= D.PAD_MAX; n++) {
      var pb = h("button", "", String(n));
      pb.setAttribute("aria-label", n + "こ");
      (function (n) {
        pb.addEventListener("click", function () {
          if (S.done) return;
          scale.right = []; for (var k = 0; k < n; k++) scale.right.push(item(uE));
          Sound.koton(); relock(); setTimeout(measure, 250);
        });
      })(n);
      pad.appendChild(pb);
    }
    drawCount();
    scale.update();
  }

  /* ============================================================
     3. つりあわせ
     ============================================================ */
  function startT(i) {
    var st = D.TSURIAI[i];
    var obj = { t: "e", e: st.e, w: st.w, badge: st.show ? String(st.w) : "?", obj: true };
    var weights = D.expandInv(st.inv).map(function (v) { return { t: "w", v: v, at: 0 }; });   // at: 0 トレイ / -1 ひだり / 1 みぎ
    var minW = D.weighOptions(st.w, st.inv, !!st.both).min;
    var S = { side: 1, dirty: false, done: false };
    questionEl.innerHTML = st.both
      ? "ぶんどうを <b>ひだりにも みぎにも</b> のせて いいよ。ぴったり つりあわせよう"
      : '<span class="big">' + st.e + "</span> と おなじ おもさに なるように ぶんどうを のせよう";
    scale = new Scale(scaleBox, {
      onTap: function (side, idx, it) {
        if (S.done) return;
        if (it.obj) { toast(st.e + " は おろせないよ"); return; }
        Sound.lift(); it.at = 0; place();
      },
      onSettle: function (sc) {
        if (!S.dirty) return; S.dirty = false;
        if (sc.balanced()) {
          S.done = true; Sound.click();
          setStatus('<span class="ok">ぴったり つりあった！</span>');
          var L = weights.filter(function (w) { return w.at < 0; }).map(function (w) { return w.v; });
          var R = weights.filter(function (w) { return w.at > 0; }).map(function (w) { return w.v; });
          var used = L.length + R.length, stars = used <= minW ? 3 : 2;
          var shiki = st.e + (L.length ? " ＋ " + L.join(" ＋ ") : "") + " ＝ " + R.join(" ＋ ");
          finish(stars, '<div class="explain"><p class="shiki">' + shiki + "</p>" +
            "<p>" + st.e + " の おもさは <b>" + st.w + "</b></p>" +
            (L.length ? "<p>" + R.join(" ＋ ") + " − " + L.join(" − ") + " ＝ " + st.w + "（ひきざん）</p>" : "") + "</div>" +
            '<p class="note">' + (stars === 3 ? "いちばん すくない ぶんどう（" + minW + "こ）で できたね！"
              : "ぶんどう " + minW + "こ で できる のりかた も あるよ。さがして みよう！") + "</p>");
        } else setStatus(tiltText(sc, st.e, "ぶんどう"));
      }
    });
    function place() {
      scale.left = [obj].concat(weights.filter(function (w) { return w.at < 0; }));
      scale.right = weights.filter(function (w) { return w.at > 0; });
      S.dirty = true; scale.update(); drawTray();
    }

    var b = box("ぶんどう <small>（タップ で のせる／おさらを タップ で おろす）</small>");
    if (st.both) {
      var seg = h("div", "side-seg");
      var bl = h("button", "l", "⬅ ひだりへ"), br = h("button", "r", "みぎへ ➡");
      seg.appendChild(bl); seg.appendChild(br); b.appendChild(seg);
      var syncSeg = function () { bl.setAttribute("aria-pressed", S.side < 0); br.setAttribute("aria-pressed", S.side > 0); };
      bl.addEventListener("click", function () { Sound.tap(); S.side = -1; syncSeg(); });
      br.addEventListener("click", function () { Sound.tap(); S.side = 1; syncSeg(); });
      syncSeg();
    }
    var tray = h("div", "tray"); b.appendChild(tray);
    var acts = h("div", "actions"); acts.style.marginTop = "10px"; b.appendChild(acts);
    var clr = h("button", "abtn", '<span class="em">🔄</span>ぜんぶ おろす'); acts.appendChild(clr);
    clr.addEventListener("click", function () { if (S.done) return; Sound.lift(); weights.forEach(function (w) { w.at = 0; }); place(); });
    function drawTray() {
      tray.textContent = "";
      D.WEIGHT_VALUES.forEach(function (v) {
        var all = weights.filter(function (w) { return w.v === v; });
        if (!all.length) return;
        var left = all.filter(function (w) { return w.at === 0; });
        var bt = h("button", "tbtn" + (left.length ? "" : " used"));
        bt.appendChild(weightIcon(v)); bt.appendChild(h("small", "", "のこり " + left.length));
        bt.setAttribute("aria-label", v + " の ぶんどう");
        bt.addEventListener("click", function () {
          if (S.done) return;
          if (!left.length) { toast("もう ないよ"); return; }
          left[0].at = S.side; Sound.koton(); place();
        });
        tray.appendChild(bt);
      });
    }
    var tip = h("p", "note", st.show ? "かずを たして " + st.w + " に しよう。"
      : "おもさは ないしょ。かたむきを みながら さがそう。");
    b.appendChild(tip);
    scale.left = [obj];
    drawTray();
    scale.update();
  }

  /* ============================================================
     ボーナス: にせものの きんか
     ============================================================ */
  function startCoin() {
    show("play"); resetPlay();
    titleText.textContent = "にせものの きんか";
    cur = { mode: "coin" };
    var fake = 1 + Math.floor(Math.random() * D.COIN_N);
    var coins = []; for (var n = 1; n <= D.COIN_N; n++) coins.push({ t: "c", n: n, w: n === fake ? D.COIN_FAKE : D.COIN_REAL, at: 0 });
    var S = { side: -1, history: [], measuring: false, choosing: false, done: false };
    questionEl.innerHTML = "9まいの うち 1まいだけ <b>かるい にせもの</b>。てんびんを <b>2かい</b> だけ つかって みつけよう！";
    scale = new Scale(scaleBox, {
      onTap: function (side, idx, it) { if (S.done || S.choosing) return; Sound.lift(); it.at = 0; place(); },
      onSettle: function (sc) {
        if (!S.measuring) return; S.measuring = false;
        var L = sc.left.map(function (c) { return c.n; }), R = sc.right.map(function (c) { return c.n; });
        var res = D.coinResult(L, R, fake);
        S.history.push({ L: L, R: R, res: res });
        if (res === 0) Sound.click(); else Sound.koton();
        setStatus(res === 0 ? '<span class="ok">つりあった！</span>' : res > 0 ? '<span class="r">みぎ</span> が かるい（あがった）' : '<span class="l">ひだり</span> が かるい（あがった）');
        drawPanel();
      }
    });
    scale.locked = true;
    function place() {
      scale.left = coins.filter(function (c) { return c.at < 0; });
      scale.right = coins.filter(function (c) { return c.at > 0; });
      scale.locked = true; S.measuring = false; scale.update(); drawPanel();
    }
    var b = box("きんか <small>（タップ で のせる／おさらを タップ で おろす）</small>");
    var seg = h("div", "side-seg");
    var bl = h("button", "l", "⬅ ひだりへ"), br = h("button", "r", "みぎへ ➡");
    seg.appendChild(bl); seg.appendChild(br); b.appendChild(seg);
    function syncSeg() { bl.setAttribute("aria-pressed", S.side < 0); br.setAttribute("aria-pressed", S.side > 0); }
    bl.addEventListener("click", function () { Sound.tap(); S.side = -1; syncSeg(); });
    br.addEventListener("click", function () { Sound.tap(); S.side = 1; syncSeg(); });
    var tray = h("div", "tray"); b.appendChild(tray);
    var acts = h("div", "actions"); acts.style.marginTop = "10px"; b.appendChild(acts);
    var go = h("button", "abtn main"), pick = h("button", "abtn", '<span class="em">🔍</span>にせものは これ！');
    acts.appendChild(go); acts.appendChild(pick);
    var hb = box("しらべた こと"); var hist = h("ul", "hist"); hb.appendChild(hist);
    var hint = h("button", "abtn", '<span class="em">💡</span>ヒント'); hb.appendChild(hint);
    hint.addEventListener("click", function () {
      Sound.tap();
      toast(S.history.length ? "かるい ほう（つりあったら のこり）の 3まいから 1まい ずつ くらべよう" : "まず 3まい と 3まい を のせて みよう");
    });

    go.addEventListener("click", function () {
      if (S.done || S.choosing) return;
      if (S.history.length >= D.COIN_TRIES) { toast("もう はかれないよ。にせものを えらぼう"); return; }
      if (!scale.left.length || !scale.right.length) { toast("ひだりと みぎに のせてね"); return; }
      Sound.tap(); scale.locked = false; S.measuring = true; scale.update(); drawPanel();
    });
    pick.addEventListener("click", function () {
      if (S.done) return;
      Sound.tap(); S.choosing = !S.choosing;
      if (S.choosing) { coins.forEach(function (c) { c.at = 0; }); place(); S.choosing = true; setStatus("にせもの だと おもう きんかを タップ！"); }
      else setStatus("");
      drawPanel();
    });
    function judge(c) {
      S.done = true;
      var cands = D.coinCandidates(S.history);
      if (c.n === fake) {
        var sure = cands.length === 1;
        finish(sure ? 3 : 1, '<div class="explain"><p class="shiki">にせものは ' + fake + "ばん！</p>" +
          "<p>" + (sure ? "てんびんの けっかから、" + fake + "ばん しか ありえないと すいり できたね！"
                        : "あたり！ でも まだ ほかに " + (cands.length - 1) + "まい こうほが あったよ。うんが よかったね。") + "</p></div>" +
          '<p class="note">こつ: 9まいを 3まい ずつ 3つに わけると、1かいで のこりが 3まいに なるよ。</p>');
      } else {
        Sound.boo();
        c.reveal = true;
        coins[fake - 1].fakeShown = true;
        drawPanel();
        setTimeout(function () {
          openModal("ざんねん…", '<div class="explain"><p class="shiki">にせものは ' + fake + "ばん だったよ</p>" +
            (cands.indexOf(c.n) < 0 ? "<p>" + c.n + "ばん は てんびんの けっかと あわないね。</p>" : "<p>まだ しぼりきれて いなかったね。</p>") + "</div>" +
            '<p class="note">こつ: まず 3まい と 3まい を くらべよう。</p>',
            [{ label: "もういちど", main: true, go: startCoin }, { label: "メニュー", go: goHome }]);
        }, 600);
      }
    }
    function drawPanel() {
      syncSeg();
      seg.hidden = S.choosing;
      var left = D.COIN_TRIES - S.history.length;
      go.innerHTML = '<span class="em">⚖️</span>はかる（のこり ' + left + "）";
      go.disabled = left <= 0 || S.choosing;
      pick.innerHTML = S.choosing ? '<span class="em">↩</span>やめる' : '<span class="em">🔍</span>にせものは これ！';
      tray.textContent = "";
      coins.forEach(function (c) {
        var bt = h("button", "tbtn" + (c.at && !S.choosing ? " used" : "") + (S.choosing && !S.done ? " pick" : ""));
        bt.appendChild(coinIcon(c.n));
        if (c.fakeShown) bt.appendChild(h("small", "", "にせもの"));
        bt.setAttribute("aria-label", c.n + "ばんの きんか");
        bt.addEventListener("click", function () {
          if (S.done) return;
          if (S.choosing) { judge(c); return; }
          if (c.at) { toast("もう のって いるよ"); return; }
          c.at = S.side; Sound.koton(); place();
        });
        tray.appendChild(bt);
      });
      hist.textContent = "";
      if (!S.history.length) hist.appendChild(h("li", "", "まだ はかって いないよ"));
      S.history.forEach(function (r, k) {
        var mark = r.res === 0 ? "＝ つりあった" : r.res > 0 ? "→ みぎが かるい" : "→ ひだりが かるい";
        hist.appendChild(h("li", "", '<span class="no">' + "①②"[k] + "</span> " + r.L.join("・") + " ⚖️ " + r.R.join("・") + " " + mark));
      });
    }
    drawPanel();
    scale.update();
  }

  /* ---------- はじめ ---------- */
  document.addEventListener("pointerdown", function once() { Sound.unlock(); document.removeEventListener("pointerdown", once); });
  syncSound();
  goHome();
  // テスト・デバッグよう
  window.__tenbin = { startStage: startStage, startCoin: startCoin, get scale() { return scale; } };
})();
