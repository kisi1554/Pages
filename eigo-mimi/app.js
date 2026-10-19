// えいご みみ たんけん — アプリ本体
(function () {
  "use strict";
  var D = window.EM_DATA;
  var AU = window.EM_AUDIO || { words: {}, phonemes: {} };
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var main = $("#main");
  var ROUND = 10;

  // ================================================================ 記録（localStorage）
  var KEY = "eigo-mimi-v1";
  var S = load();
  function blank() {
    return { box: {}, cst: {}, wst: {}, days: {}, lvl: {}, hist: {}, learned: {}, set: { mute: false, vol: 0.9, sfx: true, ja: true } };
  }
  function load() {
    var s = blank();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        Object.keys(s).forEach(function (k) { if (o[k]) s[k] = o[k]; });
        s.set = Object.assign(blank().set, o.set || {});
      }
    } catch (e) { /* ほぞん できない ブラウザ */ }
    return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  function today() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function record(cid, words, ok, itemKey) {
    var d = today();
    S.days[d] = (S.days[d] || 0) + 1;
    if (cid) {
      var c = S.cst[cid] || (S.cst[cid] = { n: 0, ok: 0 });
      c.n++; if (ok) c.ok++;
      var h = S.hist[cid] || (S.hist[cid] = []);
      h.push(ok ? 1 : 0); if (h.length > 10) h.shift();
    }
    words.forEach(function (w) {
      var s = S.wst[w] || (S.wst[w] = { n: 0, ok: 0 });
      s.n++; if (ok) s.ok++;
    });
    if (itemKey) { // ライトナー 5はこ
      var b = S.box[itemKey] || 1;
      S.box[itemKey] = ok ? Math.min(5, b + 1) : 1;
    }
    save();
  }

  // ================================================================ 音（WebAudio）
  var ctx = null, master = null, buffers = {}, loading = {}, current = null;
  function ac() {
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      master = ctx.createGain();
      master.connect(ctx.destination);
      applyVol();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function applyVol() { if (master) master.gain.value = S.set.mute ? 0 : S.set.vol; }
  // iPhone は さいしょの タップで ロックを とく
  ["touchend", "pointerdown", "keydown"].forEach(function (ev) {
    document.addEventListener(ev, function unlock() {
      var c = ac();
      if (c) { var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); }
    }, { once: true, passive: true });
  });

  function fetchBuf(path) {
    if (buffers[path]) return Promise.resolve(buffers[path]);
    if (loading[path]) return loading[path];
    var c = ac();
    if (!c) return Promise.reject(new Error("no audio"));
    loading[path] = fetch("audio/" + path).then(function (r) {
      if (!r.ok) throw new Error(r.status + " " + path);
      return r.arrayBuffer();
    }).then(function (ab) {
      return new Promise(function (res, rej) {
        var pr = c.decodeAudioData(ab, res, rej); // あたらしい ブラウザは Promise も かえす
        if (pr && pr.catch) pr.catch(function () { /* rej で うけとる */ });
      });
    }).then(function (buf) { buffers[path] = buf; delete loading[path]; return buf; }, function (e) { delete loading[path]; throw e; });
    return loading[path];
  }
  function preload(paths) {
    return Promise.all(paths.map(function (p) { return fetchBuf(p).catch(function () { return null; }); }));
  }
  function stopAll() { if (current) { try { current.stop(); } catch (e) { /* */ } current = null; } }
  function playPath(path, rate) {
    return fetchBuf(path).then(function (buf) {
      stopAll();
      var c = ac(), src = c.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate || 1;
      src.connect(master);
      current = src;
      return new Promise(function (res) {
        src.onended = function () { if (current === src) current = null; res(); };
        src.start(0);
      });
    }).catch(function (e) { console.warn(e); });
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function playSeq(paths, rate, gap) {
    var p = Promise.resolve();
    paths.forEach(function (x, i) {
      p = p.then(function () { return playPath(x, rate); }).then(function () { if (i < paths.length - 1) return wait(gap || 450); });
    });
    return p;
  }
  // こうかおん（合成音）
  function sfx(kind) {
    if (!S.set.sfx || S.set.mute) return;
    var c = ac(); if (!c) return;
    var t = c.currentTime, notes = kind === "ok" ? [[880, 0], [1318, 0.12]] : kind === "up" ? [[523, 0], [659, 0.1], [784, 0.2], [1046, 0.3]] : [[220, 0], [196, 0.16]];
    notes.forEach(function (n) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = kind === "ng" ? "square" : "sine";
      o.frequency.value = n[0];
      g.gain.setValueAtTime(0.0001, t + n[1]);
      g.gain.exponentialRampToValueAtTime(kind === "ng" ? 0.06 : 0.2, t + n[1] + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + n[1] + 0.22);
      o.connect(g); g.connect(c.destination);
      o.start(t + n[1]); o.stop(t + n[1] + 0.25);
    });
  }

  // ================================================================ 録音の えらびかた
  var WORD = {};
  D.words.forEach(function (w) { WORD[w.w] = w; });
  function recs(w) { return (AU.words[w] || []); }
  function has(w) { return recs(w).length > 0 && !!WORD[w]; }
  // よく でてくる 話者 = 「しってる こえ」。上の だんかいでは ほかの 話者を つかう
  var FAMILIAR = (function () {
    var n = {};
    Object.keys(AU.words).forEach(function (w) { AU.words[w].forEach(function (r) { n[r.spk] = (n[r.spk] || 0) + 1; }); });
    return Object.keys(n).sort(function (a, b) { return n[b] - n[a]; }).slice(0, 3);
  })();
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // mode: "known"（しってる こえ）/ "new"（しらない こえ）/ "any"
  function pickRec(w, mode, avoidSpk) {
    var r = recs(w);
    if (!r.length) return null;
    var pool = r;
    if (mode === "known") { var k = r.filter(function (x) { return FAMILIAR.indexOf(x.spk) >= 0; }); if (k.length) pool = k; }
    if (mode === "new") { var u = r.filter(function (x) { return FAMILIAR.indexOf(x.spk) < 0; }); if (u.length) pool = u; }
    if (avoidSpk) { var a = pool.filter(function (x) { return x.spk !== avoidSpk; }); if (a.length) pool = a; }
    return rnd(pool);
  }
  // 2つの 単語を おなじ 人の こえで くらべる（いなければ べつの 人）
  function pairRecs(words) {
    var sets = words.map(function (w) { return recs(w); });
    var common = sets[0].map(function (r) { return r.spk; }).filter(function (s) {
      return sets.every(function (rs) { return rs.some(function (r) { return r.spk === s; }); });
    });
    if (common.length) {
      var s = rnd(common);
      return sets.map(function (rs) { return rs.filter(function (r) { return r.spk === s; })[0]; });
    }
    return sets.map(function (rs) { return rnd(rs); });
  }
  function accentLabel(r) {
    if (!r) return "";
    var a = { US: "アメリカ", UK: "イギリス", AU: "オーストラリア", CA: "カナダ", NZ: "ニュージーランド", IE: "アイルランド", ZA: "みなみアフリカ", IN: "インド", IPA: "おとの みほん" }[r.acc] || "えいご";
    var g = r.g === "female" ? "（じょせい）" : r.g === "male" ? "（だんせい）" : "";
    return "🎙️ " + a + g;
  }

  // ================================================================ 表示の 部品
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  // つづりを えがく。hl: { index: "ha"|"hb"|"hc" }
  function spellHTML(w, hl) {
    var o = WORD[w];
    if (!o) return esc(w);
    return o.g.map(function (g, i) {
      var cls = (hl && hl[i]) || (o.p[i] === "-" ? "sil" : "");
      return cls ? '<span class="' + cls + '">' + esc(g) + "</span>" : esc(g);
    }).join("");
  }
  // くらべる 単語の ちがう ところに いろを つける
  function diffHL(words) {
    var res = words.map(function () { return {}; });
    var ss = words.map(function (w) { return w.toLowerCase(); });
    var pre = 0, suf = 0, min = Math.min.apply(null, ss.map(function (s) { return s.length; }));
    while (pre < min && ss.every(function (s) { return s[pre] === ss[0][pre]; })) pre++;
    while (suf < min - pre && ss.every(function (s) { return s[s.length - 1 - suf] === ss[0][ss[0].length - 1 - suf]; })) suf++;
    var cls = ["ha", "hb", "hc"];
    words.forEach(function (w, k) {
      var o = WORD[w]; if (!o) return;
      var from = pre, to = w.length - suf, pos = 0;
      if (from >= to) { from = Math.max(0, pre - 1); to = Math.max(from + 1, to); } // milk / milky など
      o.g.forEach(function (g, i) {
        var a = pos, b = pos + g.length; pos = b;
        if (b > from && a < to) res[k][i] = cls[k];
      });
    });
    return res;
  }
  // 1つの 単語の なかで、注目する 音素に いろを つける
  function focusHL(w, phs) {
    var o = WORD[w], r = {};
    if (!o || !phs) return r;
    var cls = ["ha", "hb", "hc"];
    o.p.forEach(function (p, i) { var k = phs.indexOf(p); if (k >= 0) r[i] = cls[k]; });
    return r;
  }
  function picHTML(w) {
    var o = WORD[w];
    return '<span class="pic" aria-hidden="true">' + (o && o.e ? o.e : "🔤") + "</span>";
  }
  function jaHTML(w) { return S.set.ja && WORD[w] ? '<span class="ja">' + esc(WORD[w].ja) + "</span>" : ""; }
  function ipaOf(w) { var o = WORD[w]; return o ? "/" + o.p.filter(function (x) { return x !== "-"; }).join("").replace(/\+/g, "") + "/" : ""; }
  function soundCount(w) { var n = 0; WORD[w].p.forEach(function (p) { if (p !== "-") n += p.split("+").length; }); return n; }

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
  }

  // ================================================================ 画面の きりかえ
  var backTo = null;
  function setTitle(t, back) {
    $("#title").textContent = t;
    backTo = back || null;
    $("#backBtn").hidden = !back;
    window.scrollTo(0, 0);
  }
  $("#backBtn").addEventListener("click", function () { stopAll(); if (backTo) go(backTo); });
  function go(name, arg) {
    stopAll();
    var f = { home: home, kikiwake: kikiwakeMenu, zukan: zukan, phonics: phonicsMenu, cards: cardsMenu, parent: parent, credits: credits }[name];
    (f || home)(arg);
  }
  main.addEventListener("click", function (e) {
    var b = e.target.closest("[data-go]");
    if (b) go(b.getAttribute("data-go"));
  });

  // せってい
  function syncSettings() {
    $("#soundBtn").textContent = S.set.mute ? "🔇" : "🔊";
    $("#vol").value = S.set.vol;
    $("#sfx").checked = S.set.sfx;
    $("#showJa").checked = S.set.ja;
    applyVol();
  }
  $("#soundBtn").addEventListener("click", function () { S.set.mute = !S.set.mute; save(); syncSettings(); });
  $("#setBtn").addEventListener("click", function () { $("#settings").hidden = !$("#settings").hidden; });
  $("#vol").addEventListener("input", function () { S.set.vol = +this.value; S.set.mute = false; save(); syncSettings(); });
  $("#sfx").addEventListener("change", function () { S.set.sfx = this.checked; save(); });
  $("#showJa").addEventListener("change", function () { S.set.ja = this.checked; save(); });
  syncSettings();

  // ================================================================ ホーム
  function home() {
    setTitle("🎧 えいご みみ たんけん");
    main.innerHTML = "";
    main.appendChild($("#tplHome").content.cloneNode(true));
    var n = S.days[today()] || 0, wk = weekCount();
    var nw = Object.keys(AU.words).filter(has).length;
    $("#todayBox").innerHTML = "きょう <b>" + n + "</b> もん・こんしゅう <b>" + wk + "</b> もん れんしゅう したよ。" +
      (nw ? "" : "<br>⚠️ ろくおんが みつかりません。") + '<br><small class="note">ほんものの こえ ' + nw + " ご ／ はなす ひと " + speakerCount() + " にん</small>";
  }
  function weekCount() {
    var t = new Date(), n = 0;
    for (var i = 0; i < 7; i++) { var d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - i); n += S.days[d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())] || 0; }
    return n;
  }
  function speakerCount() {
    var s = {};
    Object.keys(AU.words).forEach(function (w) { AU.words[w].forEach(function (r) { s[r.spk] = 1; }); });
    return Object.keys(s).length;
  }

  // ================================================================ ききわけ
  // 録音の ある ペア・3つぐみ だけを つかう
  var CON = D.contrasts.map(function (c) {
    var pairs = (c.pairs || []).filter(function (p) { return p.every(has); });
    var sets = (c.sets || []).filter(function (p) { return p.every(has); });
    // 3つぐみの うち 2つ ずつも ペアとして つかう
    (c.sets || []).forEach(function (s) {
      for (var i = 0; i < s.length; i++) for (var j = i + 1; j < s.length; j++) {
        if (has(s[i]) && has(s[j]) && !pairs.some(function (p) { return p[0] === s[i] && p[1] === s[j]; })) pairs.push([s[i], s[j]]);
      }
    });
    return Object.assign({}, c, { pairs: pairs, sets: sets });
  }).filter(function (c) { return c.pairs.length >= 3; });
  var CMAP = {}; CON.forEach(function (c) { CMAP[c.id] = c; });

  var LEVELS = [
    { name: "えらぶ", desc: "きいて えらぶ（2つ）" },
    { name: "おなじ？ちがう？", desc: "2かい きいて おなじ か ちがう か" },
    { name: "3つから", desc: "3つの なかから えらぶ" },
    { name: "しらない こえ", desc: "はじめて きく ひとの こえ" }
  ];
  function lvlOf(cid) { return S.lvl[cid] || 0; }
  function maxLvl(c) { return LEVELS.length - 1; }
  function acc(cid) { var s = S.cst[cid]; return s && s.n ? Math.round(100 * s.ok / s.n) : null; }

  function kikiwakeMenu() {
    setTitle("👂 ききわけ", "home");
    var h = '<h2>どの おとを ききわける？</h2><div class="list">' +
      '<button type="button" class="pick wide" data-c="*"><b>🎯 おまかせ</b><small>にがてな ものを おおめに だすよ</small></button>';
    CON.forEach(function (c) {
      var a = acc(c.id), l = lvlOf(c.id);
      h += '<button type="button" class="pick" data-c="' + c.id + '"><b>' + esc(c.title) + "</b><small>" + esc(c.ja) + "</small>" +
        '<span class="stars">' + "★".repeat(l + 1) + "☆".repeat(maxLvl(c) - l) + "</span>" +
        "<small>" + (a == null ? "まだ" : a + "% せいかい") + "</small></button>";
    });
    h += "</div>";
    if (!CON.length) h += '<p class="note">ろくおんが ないので あそべません。</p>';
    main.innerHTML = h;
    main.querySelectorAll("[data-c]").forEach(function (b) {
      b.addEventListener("click", function () { startKiki(b.getAttribute("data-c")); });
    });
  }

  // にがてな 対立ほど よく でる（おまかせ）
  function weightCon(c) {
    var s = S.cst[c.id];
    if (!s || s.n < 4) return 3;
    return 1 + 6 * (1 - s.ok / s.n);
  }
  function weighted(items, wf) {
    var tot = 0, ws = items.map(function (x) { var w = wf(x); tot += w; return w; });
    var r = Math.random() * tot;
    for (var i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
  var BOXW = [0, 16, 8, 4, 2, 1];
  function itemKey(cid, words) { return cid + ":" + words.join("/"); }
  function chooseItem(c, useSets, last) {
    var items = useSets && c.sets.length ? c.sets : c.pairs;
    var it = weighted(items, function (p) {
      var k = itemKey(c.id, p);
      return (BOXW[S.box[k] || 1]) * (last && k === last ? 0.05 : 1);
    });
    return it;
  }

  function makeQuestion(c, last) {
    var lvl = lvlOf(c.id);
    var type = "pick2", voice = "known";
    if (lvl === 1) type = Math.random() < 0.6 ? "ax" : "pick2";
    if (lvl === 2) type = c.sets.length ? (Math.random() < 0.6 ? "pick3" : "ax") : (Math.random() < 0.5 ? "ax" : "pick2");
    if (lvl >= 3) { voice = "new"; type = rnd(c.sets.length ? ["pick3", "ax", "pick2"] : ["ax", "pick2"]); }
    var item = chooseItem(c, type === "pick3", last);
    var q = { c: c, type: type, item: item, key: itemKey(c.id, item), voice: voice };
    if (type === "ax") {
      var same = Math.random() < 0.45;
      var x = rnd(item), y = same ? x : rnd(item.filter(function (w) { return w !== x; }));
      var rx = pickRec(x, voice), ry = pickRec(y, voice, same ? rx.spk : null); // おなじ ことばは べつの 人の こえで
      q.ax = [x, y]; q.recs = [rx, ry]; q.answer = same ? "same" : "diff";
    } else {
      q.target = rnd(item);
      q.rec = pickRec(q.target, voice);
      q.opts = shuffle(item);
    }
    return q;
  }

  function questionPaths(q) {
    var list = [];
    q.item.forEach(function (w) { recs(w).forEach(function (r) { list.push(r.f); }); });
    return list;
  }

  var R = null; // いまの ラウンド
  function startKiki(cid) {
    if (!CON.length) return;
    R = { kind: "kiki", cid: cid, i: 0, res: [], last: null, rate: 1 };
    nextKiki();
  }
  function nextKiki() {
    if (R.i >= ROUND) return finish();
    var c = R.cid === "*" ? weighted(CON, weightCon) : CMAP[R.cid];
    var q = makeQuestion(c, R.last);
    R.q = q; R.last = q.key; R.answered = false;
    setTitle("👂 " + c.title, "kikiwake");
    main.innerHTML = '<div class="loading">🎧 よみこみちゅう…</div>';
    preload(questionPaths(q)).then(function () { if (R && R.q === q) renderKiki(q); });
  }
  function dotsHTML() {
    var h = '<div class="dots">';
    for (var i = 0; i < ROUND; i++) h += "<i class='" + (i < R.res.length ? (R.res[i] ? "ok" : "ng") : i === R.i ? "now" : "") + "'></i>";
    return h + "</div>";
  }
  function renderKiki(q) {
    var lvl = lvlOf(q.c.id);
    var h = '<div class="qhead">' + dotsHTML() + '<span class="lvl">' + "★".repeat(lvl + 1) + " " + LEVELS[lvl].name + "</span></div>";
    if (q.type === "ax") {
      h += '<p class="prompt">2かい きくよ。おなじ ことば？ ちがう ことば？</p>' + playRow() +
        '<div class="ax"><button type="button" class="opt" data-a="same"><span class="pic">🟰</span><b>おなじ</b></button>' +
        '<button type="button" class="opt" data-a="diff"><span class="pic">↔️</span><b>ちがう</b></button></div>';
    } else {
      var hl = diffHL(q.opts);
      h += '<p class="prompt">きこえた ほうを えらんでね</p>' + playRow() + '<div class="opts' + (q.opts.length === 3 ? " three" : "") + '">';
      q.opts.forEach(function (w, i) {
        h += '<button type="button" class="opt" data-a="' + esc(w) + '">' + picHTML(w) + '<span class="spell">' + spellHTML(w, hl[i]) + "</span>" + jaHTML(w) + "</button>";
      });
      h += "</div>";
    }
    h += '<div class="feedback" id="fb"></div>';
    main.innerHTML = h;
    bindPlay(function (rate) { return playQ(q, rate); });
    main.querySelectorAll("[data-a]").forEach(function (b) {
      b.addEventListener("click", function () { answerKiki(q, b.getAttribute("data-a"), b); });
    });
    setTimeout(function () { playQ(q, 1); }, 250);
  }
  function playRow() {
    return '<div class="playrow"><button type="button" class="big" id="again">🔊 もういちど</button><button type="button" class="big slow" id="slow">🐢 ゆっくり</button></div>';
  }
  function bindPlay(fn) {
    var a = $("#again"), s = $("#slow");
    function run(btn, rate) { btn.classList.add("playing"); fn(rate).then(function () { btn.classList.remove("playing"); }); }
    a.addEventListener("click", function () { run(a, 1); });
    s.addEventListener("click", function () { run(s, 0.8); }); // 0.75 より おそく しない（こえが ひくく なりすぎない）
  }
  function playQ(q, rate) {
    if (q.type === "ax") return playSeq([q.recs[0].f, q.recs[1].f], rate, 700);
    return playPath(q.rec.f, rate);
  }
  function answerKiki(q, a, btn) {
    if (R.answered) return;
    R.answered = true;
    var ok = q.type === "ax" ? a === q.answer : a === q.target;
    main.querySelectorAll("[data-a]").forEach(function (b) {
      var v = b.getAttribute("data-a");
      var right = q.type === "ax" ? v === q.answer : v === q.target;
      b.classList.add(right ? "ok" : (b === btn ? "ng" : "dim"));
    });
    sfx(ok ? "ok" : "ng");
    record(q.c.id, q.type === "ax" ? q.ax : [q.target], ok, q.key);
    R.res.push(ok);
    var lvUp = checkLevel(q.c);
    var words = q.type === "ax" ? (q.ax[0] === q.ax[1] ? q.item : q.ax) : q.item;
    var cmpLabel = words.join(" … ");
    var fb = $("#fb");
    var msg = ok ? "⭕ せいかい！" : "❌ おしい！";
    if (!ok && q.type !== "ax") msg += " こたえは <b>" + esc(q.target) + "</b>";
    if (!ok && q.type === "ax") msg += " こたえは 「" + (q.answer === "same" ? "おなじ" : "ちがう") + "」";
    fb.innerHTML = '<div class="res ' + (ok ? "ok" : "ng") + '">' + msg + "</div>" +
      '<div class="row"><button type="button" class="btn2" id="cmp">🔁 くらべる: ' + esc(cmpLabel) + "</button>" +
      '<button type="button" class="btn2 go" id="next">つぎへ ▶</button></div><div class="spk" id="spk"></div>';
    var cmpRecs = pairRecs(words);
    function cmp() {
      $("#spk").textContent = accentLabel(cmpRecs[0]);
      return playSeq(cmpRecs.map(function (r) { return r.f; }), 1, 600);
    }
    $("#cmp").addEventListener("click", cmp);
    $("#next").addEventListener("click", function () { stopAll(); R.i++; nextKiki(); });
    // こたえの あと かならず 2つを つづけて きかせる
    wait(ok ? 500 : 800).then(function () { if (R && R.q === q) cmp(); });
    if (lvUp) { sfx("up"); toast("⭐ レベルアップ！ " + LEVELS[lvlOf(q.c.id)].name); }
  }
  function checkLevel(c) {
    var h = S.hist[c.id] || [], l = lvlOf(c.id);
    if (l >= maxLvl(c) || h.length < 8) return false;
    var ok = h.reduce(function (a, b) { return a + b; }, 0);
    if (ok / h.length >= 0.8) { S.lvl[c.id] = l + 1; S.hist[c.id] = []; save(); return true; }
    return false;
  }
  function finish() {
    var ok = R.res.filter(Boolean).length;
    var back = R.kind === "kiki" ? "kikiwake" : R.kind === "ph" ? "phonics" : "cards";
    setTitle("🎉 おしまい", back);
    var star = ok >= 9 ? "🏆" : ok >= 7 ? "🌟" : ok >= 4 ? "👍" : "💪";
    main.innerHTML = '<div class="result"><div class="big-em">' + star + "</div><p>" + ROUND + " もん ちゅう <b>" + ok + "</b> もん せいかい！</p>" +
      '<div class="row feedback"><div class="row"><button type="button" class="btn2 go" id="again2">もういちど</button>' +
      '<button type="button" class="btn2" data-go="' + back + '">もどる</button></div></div></div>';
    var r = R;
    $("#again2").addEventListener("click", function () {
      if (r.kind === "kiki") startKiki(r.cid); else if (r.kind === "ph") startPh(r.sub); else startCards(r.sub);
    });
  }

  // ================================================================ おと ずかん
  var GROUPC = { "はれつ": "#ffe3e3", "まさつ": "#fff3bf", "はなの おと": "#e5dbff", "ながれる": "#d3f9d8",
    "みじかい": "#d0ebff", "ながい": "#c5f6fa", "にじゅう": "#ffdeeb", "r の つく": "#ffe8cc" };
  function zukan(ipa) {
    setTitle("📗 おと ずかん", "home");
    var h = "";
    [["c", "しいん（子音）24"], ["v", "ぼいん（母音）20"]].forEach(function (k) {
      h += "<h3>" + (k[0] === "c" ? "しいん" : "ぼいん") + "（" + (k[0] === "c" ? "<ruby>子音<rt>しいん</rt></ruby>" : "<ruby>母音<rt>ぼいん</rt></ruby>") + "） " + k[1].split(/(\d+)/)[1] + "</h3>";
      var groups = [];
      D.phonemes.forEach(function (p) { if (p.kind === k[0] && groups.indexOf(p.group) < 0) groups.push(p.group); });
      h += '<div class="legend">' + groups.map(function (g) { return '<span style="--pc:' + GROUPC[g] + '">' + g + "</span>"; }).join("") + "</div>";
      h += '<div class="ptable">';
      D.phonemes.forEach(function (p, i) {
        if (p.kind !== k[0]) return;
        h += '<button type="button" class="ph" data-i="' + i + '" style="--pc:' + GROUPC[p.group] + '"><b class="ipa">' + esc(disp(p.ipa)) + "</b><small>" + esc(p.name) + "</small></button>";
      });
      h += "</div>";
    });
    main.innerHTML = '<div id="pd"></div>' + h;
    main.querySelectorAll(".ph").forEach(function (b) {
      b.addEventListener("click", function () { showPh(D.phonemes[+b.getAttribute("data-i")]); });
    });
    if (ipa) { var p = D.phonemes.filter(function (x) { return x.ipa === ipa; })[0]; if (p) showPh(p); }
  }
  function disp(ipa) { return ipa === "r" ? "ɹ" : ipa; }
  function showPh(p) {
    var ex = p.ex.filter(has);
    var single = AU.phonemes[p.ipa] || [];
    var h = '<div class="detail"><div class="top"><div class="sym ipa" style="color:var(--accent)">/' + esc(disp(p.ipa)) + "/</div>" +
      '<div class="mouth">' + mouthSVG(p.mouth) + '</div><div class="tip">👄 ' + esc(p.tip) + "</div></div>" +
      '<div class="patterns">' + p.spell.map(function (s) { return "<span>" + esc(s) + "</span>"; }).join("") + "</div>" +
      '<div class="playrow">' + (single.length ? '<button type="button" class="big" id="single">🔊 おとだけ</button>' : '<span class="note">この おとだけの ろくおんは ないので、ことばで きいてね</span>') +
      '<button type="button" class="big slow" id="allEx">▶ ことばを ぜんぶ</button></div>' +
      '<div class="exs">' + ex.map(function (w) {
        return '<button type="button" class="opt" data-w="' + esc(w) + '">' + picHTML(w) + '<span class="spell">' + spellHTML(w, focusHL(w, [p.ipa])) + "</span>" + jaHTML(w) + "</button>";
      }).join("") + '</div><div class="spk" id="spk"></div></div>';
    $("#pd").innerHTML = h;
    var turn = {};
    function playW(w) {
      // タップする たびに 話者を かえる
      var r = recs(w); if (!r.length) return Promise.resolve();
      turn[w] = ((turn[w] == null ? -1 : turn[w]) + 1) % r.length;
      $("#spk").textContent = accentLabel(r[turn[w]]);
      return playPath(r[turn[w]].f, 1);
    }
    if (single.length) {
      var si = -1;
      $("#single").addEventListener("click", function () {
        si = (si + 1) % single.length;
        $("#spk").textContent = "🎙️ おとの みほん（こくさい おんせい きごう）";
        playPath(single[si].f, 1);
      });
    }
    $("#allEx").addEventListener("click", function () {
      var p0 = Promise.resolve();
      ex.forEach(function (w) { p0 = p0.then(function () { return playW(w); }).then(function () { return wait(400); }); });
    });
    $("#pd").querySelectorAll("[data-w]").forEach(function (b) {
      b.addEventListener("click", function () { playW(b.getAttribute("data-w")); });
    });
    preload(single.map(function (r) { return r.f; }).concat([].concat.apply([], ex.map(function (w) { return recs(w).map(function (r) { return r.f; }); }))));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // くちの かたち（まえから みた え）
  function mouthSVG(type) {
    var P = {
      lips: { w: 46, h: 0 }, lipteeth: { w: 50, h: 14, bite: 1 }, teeth: { w: 50, h: 18, tongue: "out" },
      ridge: { w: 50, h: 22, tongue: "tip" }, back: { w: 50, h: 26, tongue: "back" }, round: { w: 30, h: 22, round: 1 },
      kiss: { w: 22, h: 18, round: 1 }, open: { w: 46, h: 40, tongue: "low" }, wide: { w: 62, h: 34, tongue: "low" },
      mid: { w: 52, h: 24, tongue: "low" }, relax: { w: 46, h: 14, tongue: "low" }, smile: { w: 64, h: 12, teeth: 1 },
      r: { w: 34, h: 22, round: 1, tongue: "curl" }
    }[type] || { w: 46, h: 20 };
    var cx = 65, cy = 82, s = '<svg viewBox="0 0 130 130" role="img" aria-label="くちの かたち">';
    s += '<circle cx="65" cy="65" r="62" fill="#ffe0c2"/><circle cx="42" cy="44" r="6" fill="#333"/><circle cx="88" cy="44" r="6" fill="#333"/>';
    s += '<ellipse cx="30" cy="70" rx="9" ry="5" fill="#ffb3a7" opacity=".6"/><ellipse cx="100" cy="70" rx="9" ry="5" fill="#ffb3a7" opacity=".6"/>';
    if (P.h === 0) { // とじた くちびる
      s += '<path d="M' + (cx - P.w / 2) + " " + cy + " Q" + cx + " " + (cy - 6) + " " + (cx + P.w / 2) + " " + cy + " Q" + cx + " " + (cy + 8) + " " + (cx - P.w / 2) + " " + cy + 'Z" fill="#e8737a" stroke="#c44" stroke-width="2"/>';
      return s + "</svg>";
    }
    var rx = P.w / 2, ry = P.h / 2 + 3;
    s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (rx + 5) + '" ry="' + (ry + 5) + '" fill="#e8737a"/>';
    s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="#5a1d1d"/>';
    if (!P.round || P.h > 20) s += '<rect x="' + (cx - rx * 0.75) + '" y="' + (cy - ry) + '" width="' + rx * 1.5 + '" height="6" rx="2" fill="#fff"/>';
    if (P.teeth) s += '<rect x="' + (cx - rx * 0.8) + '" y="' + (cy + ry - 6) + '" width="' + rx * 1.6 + '" height="5" rx="2" fill="#fff"/>';
    if (P.bite) s += '<rect x="' + (cx - rx * 0.6) + '" y="' + (cy - 2) + '" width="' + rx * 1.2 + '" height="7" rx="2" fill="#fff"/><path d="M' + (cx - rx) + " " + (cy + 4) + " Q" + cx + " " + (cy + 10) + " " + (cx + rx) + " " + (cy + 4) + '" stroke="#e8737a" stroke-width="7" fill="none"/>';
    var t = P.tongue;
    if (t === "out") s += '<ellipse cx="' + cx + '" cy="' + (cy + 2) + '" rx="' + rx * 0.6 + '" ry="7" fill="#ff8fa3"/><rect x="' + (cx - rx * 0.6) + '" y="' + (cy - ry) + '" width="' + rx * 1.2 + '" height="6" rx="2" fill="#fff"/>';
    if (t === "tip") s += '<path d="M' + (cx - rx * 0.7) + " " + (cy + ry - 2) + " Q" + cx + " " + (cy - ry - 2) + " " + (cx + rx * 0.7) + " " + (cy + ry - 2) + 'Z" fill="#ff8fa3"/>';
    if (t === "back") s += '<path d="M' + (cx - rx * 0.8) + " " + (cy + ry - 1) + " Q" + cx + " " + (cy - 2) + " " + (cx + rx * 0.8) + " " + (cy + ry - 1) + 'Z" fill="#ff8fa3"/><circle cx="' + cx + '" cy="' + (cy - ry + 8) + '" r="3" fill="#ff8fa3"/>';
    if (t === "low") s += '<ellipse cx="' + cx + '" cy="' + (cy + ry - 5) + '" rx="' + rx * 0.7 + '" ry="5" fill="#ff8fa3"/>';
    if (t === "curl") s += '<path d="M' + (cx - rx * 0.6) + " " + (cy + ry - 2) + " Q" + cx + " " + (cy - 4) + " " + (cx + rx * 0.2) + " " + (cy + 2) + '" stroke="#ff8fa3" stroke-width="7" fill="none" stroke-linecap="round"/>';
    return s + "</svg>";
  }

  // ================================================================ フォニックス よみ
  var PHW = D.words.filter(function (w) { return has(w.w) && /^[a-z]+$/.test(w.w) && w.w.length >= 2 && w.w.length <= 7; }).map(function (w) { return w.w; });
  var PH_SUBS = [
    { id: "spell", em: "🔡", t: "つづりを えらぶ", d: "きいて ただしい つづりを えらぶ" },
    { id: "build", em: "🧩", t: "ならべて つづる", d: "もじの タイルを ならべる（ブレンディング）" },
    { id: "count", em: "🔢", t: "おとは いくつ？", d: "ship は 3つの おと（セグメンティング）" }
  ];
  function phonicsMenu() {
    setTitle("🔤 フォニックス よみ", "home");
    main.innerHTML = '<h2>どれで あそぶ？</h2><div class="list">' + PH_SUBS.map(function (s) {
      return '<button type="button" class="pick" data-s="' + s.id + '"><span style="font-size:40px">' + s.em + "</span><b>" + s.t + "</b><small>" + s.d + "</small></button>";
    }).join("") + "</div>";
    main.querySelectorAll("[data-s]").forEach(function (b) { b.addEventListener("click", function () { startPh(b.getAttribute("data-s")); }); });
  }
  // にた つづりの ことばを さがす（ミニマルペアの あいてを ゆうせん）
  function neighbors(w) {
    var out = [];
    CON.forEach(function (c) { c.pairs.forEach(function (p) { if (p.indexOf(w) >= 0) p.forEach(function (x) { if (x !== w && out.indexOf(x) < 0) out.push(x); }); }); });
    return out;
  }
  function fakeSpell(w) {
    // 音は おなじで つづりが ちがう まちがい（ee ↔ ea, ck ↔ k, c ↔ k など）
    var o = WORD[w], alts = { ee: "ea", ea: "ee", ck: "k", k: "ck", c: "k", ai: "ay", ay: "ai", oa: "ow", ow: "oa", sh: "s", th: "s", ph: "f", f: "ph", ir: "ur", ur: "er", er: "ir", igh: "ie", oo: "u", u: "oo", ar: "er" };
    var cands = [];
    o.g.forEach(function (g, i) {
      var a = alts[g.toLowerCase()]; if (!a) return;
      var c = o.g.slice(); c[i] = a; cands.push(c.join(""));
    });
    return cands;
  }
  function startPh(sub) {
    R = { kind: "ph", sub: sub, i: 0, res: [] };
    nextPh();
  }
  function phPick() {
    // まちがえた ことばを おおめに
    return weighted(PHW, function (w) { var s = S.wst[w]; return s && s.n ? 1 + 4 * (1 - s.ok / s.n) : 1.5; });
  }
  function nextPh() {
    if (R.i >= ROUND) return finish();
    var w = phPick(), q = { w: w, rec: pickRec(w, "any") };
    if (R.sub === "spell") {
      var opts = [w];
      shuffle(neighbors(w)).concat(shuffle(fakeSpell(w))).forEach(function (x) { if (opts.length < 3 && opts.indexOf(x) < 0) opts.push(x); });
      shuffle(PHW).forEach(function (x) { if (opts.length < 3 && opts.indexOf(x) < 0 && x[0] === w[0]) opts.push(x); });
      q.opts = shuffle(opts);
    }
    if (R.sub === "build") {
      var tiles = WORD[w].g.slice();
      var extra = shuffle(["a", "e", "i", "o", "u", "sh", "ee", "r", "l", "th", "ck", "n", "ng"]).filter(function (x) { return tiles.indexOf(x) < 0; }).slice(0, 2);
      q.tiles = shuffle(tiles.concat(extra));
      q.placed = [];
    }
    if (R.sub === "count") q.n = soundCount(w);
    R.q = q; R.answered = false;
    setTitle("🔤 " + PH_SUBS.filter(function (s) { return s.id === R.sub; })[0].t, "phonics");
    main.innerHTML = '<div class="loading">🎧 よみこみちゅう…</div>';
    preload([q.rec.f]).then(function () { if (R && R.q === q) renderPh(q); });
  }
  function renderPh(q) {
    var h = '<div class="qhead">' + dotsHTML() + "</div>";
    if (R.sub === "spell") {
      h += '<p class="prompt">きこえた ことばの つづりは どれ？</p>' + playRow() + '<div class="opts three">' +
        q.opts.map(function (x) { return '<button type="button" class="opt" data-a="' + esc(x) + '"><span class="spell">' + esc(x) + "</span></button>"; }).join("") + "</div>";
    } else if (R.sub === "build") {
      h += '<p class="prompt">' + picHTML(q.w).replace('class="pic"', 'class="pic" style="font-size:48px"') + "<br>もじを じゅんばんに ならべてね</p>" + playRow() +
        '<div class="slots" id="slots"></div><div class="tiles">' +
        q.tiles.map(function (t, i) { return '<button type="button" class="tile" data-t="' + i + '">' + esc(t) + "</button>"; }).join("") +
        '</div><div class="playrow" style="margin-top:12px"><button type="button" class="btn2" id="undo">↩ ひとつ もどす</button></div>';
    } else {
      h += '<p class="prompt">' + picHTML(q.w).replace('class="pic"', 'class="pic" style="font-size:48px"') + "<br>この ことばには おとが いくつ ある？</p>" + playRow() +
        '<div class="counts">' + [1, 2, 3, 4, 5, 6].map(function (n) { return '<button type="button" data-a="' + n + '">' + n + "</button>"; }).join("") + "</div>";
    }
    h += '<div class="feedback" id="fb"></div>';
    main.innerHTML = h;
    bindPlay(function (rate) { return playPath(q.rec.f, rate); });
    if (R.sub === "build") {
      var slotsEl = $("#slots");
      var drawSlots = function () {
        var n = WORD[q.w].g.length, sh = "";
        for (var i = 0; i < n; i++) sh += '<span class="slot' + (q.placed[i] != null ? " full" : "") + '">' + (q.placed[i] != null ? esc(q.tiles[q.placed[i]]) : "") + "</span>";
        slotsEl.innerHTML = sh;
      };
      drawSlots();
      main.querySelectorAll(".tile").forEach(function (b) {
        b.addEventListener("click", function () {
          if (R.answered) return;
          q.placed.push(+b.getAttribute("data-t")); b.disabled = true; drawSlots();
          if (q.placed.length === WORD[q.w].g.length) {
            var made = q.placed.map(function (i) { return q.tiles[i]; }).join("");
            answerPh(q, made === q.w);
          }
        });
      });
      $("#undo").addEventListener("click", function () {
        if (R.answered || !q.placed.length) return;
        var t = q.placed.pop(); main.querySelector('.tile[data-t="' + t + '"]').disabled = false; drawSlots();
      });
    } else {
      main.querySelectorAll("[data-a]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (R.answered) return;
          var a = b.getAttribute("data-a");
          var ok = R.sub === "spell" ? a === q.w : +a === q.n;
          main.querySelectorAll("[data-a]").forEach(function (x) {
            var v = x.getAttribute("data-a"), right = R.sub === "spell" ? v === q.w : +v === q.n;
            x.classList.add(right ? "ok" : x === b ? "ng" : "dim");
            if (R.sub === "count") x.style.background = right ? "#b2f2bb" : x === b ? "#ffc9c9" : "";
          });
          answerPh(q, ok);
        });
      });
    }
    setTimeout(function () { playPath(q.rec.f, 1); }, 250);
  }
  function segHTML(w) {
    var o = WORD[w];
    return '<div class="seg">' + o.g.map(function (g, i) {
      var p = o.p[i];
      return "<span" + (p === "-" ? ' class="sil"' : "") + ">" + esc(g) + '<small class="ipa">' + (p === "-" ? "（よまない）" : "/" + esc(p.replace("+", "")) + "/") + "</small></span>";
    }).join("") + "</div>";
  }
  function answerPh(q, ok) {
    R.answered = true;
    sfx(ok ? "ok" : "ng");
    record(null, [q.w], ok, null);
    R.res.push(ok);
    var nb = neighbors(q.w).filter(has).slice(0, 1);
    var fb = $("#fb");
    fb.innerHTML = '<div class="res ' + (ok ? "ok" : "ng") + '">' + (ok ? "⭕ せいかい！" : "❌ おしい！") + ' <span class="spell" style="font-size:32px">' + spellHTML(q.w) + "</span> " +
      (R.sub === "count" ? "＝ " + q.n + " つの おと" : "") + "</div>" + segHTML(q.w) +
      '<div class="row" style="margin-top:10px"><button type="button" class="btn2" id="cmp">🔁 くらべる: ' + esc([q.w].concat(nb).join(" … ")) + "</button>" +
      '<button type="button" class="btn2 go" id="next">つぎへ ▶</button></div>';
    var cr = pairRecs([q.w].concat(nb));
    var cmp = function () { return playSeq(cr.map(function (r) { return r.f; }), 1, 600); };
    $("#cmp").addEventListener("click", cmp);
    $("#next").addEventListener("click", function () { stopAll(); R.i++; nextPh(); });
    wait(500).then(function () { if (R && R.q === q) { if (nb.length) cmp(); else playPath(q.rec.f, 0.8); } });
  }

  // ================================================================ えいたんご カード
  var CARDW = D.words.filter(function (w) { return w.e && has(w.w); }).map(function (w) { return w.w; });
  var CARD_SUBS = [
    { id: "listen", em: "👂", t: "きいて えを えらぶ", d: "4まいの えから えらぶ" },
    { id: "look", em: "👀", t: "えを みて おとを えらぶ", d: "3つの こえを きいて えらぶ" },
    { id: "book", em: "📒", t: "ことば ずかん", d: "3かい あてた ことばが ならぶ" }
  ];
  function cardsMenu() {
    setTitle("🃏 えいたんご カード", "home");
    var n = Object.keys(S.learned).length;
    main.innerHTML = '<h2>どれで あそぶ？</h2><div class="list">' + CARD_SUBS.map(function (s) {
      return '<button type="button" class="pick" data-s="' + s.id + '"><span style="font-size:40px">' + s.em + "</span><b>" + s.t + "</b><small>" + (s.id === "book" ? n + " / " + CARDW.length + " ご" : s.d) + "</small></button>";
    }).join("") + "</div>";
    main.querySelectorAll("[data-s]").forEach(function (b) {
      b.addEventListener("click", function () { var s = b.getAttribute("data-s"); if (s === "book") wordBook(); else startCards(s); });
    });
  }
  function startCards(sub) { R = { kind: "card", sub: sub, i: 0, res: [] }; nextCard(); }
  function nextCard() {
    if (R.i >= ROUND) return finish();
    var w = weighted(CARDW, function (x) { return S.learned[x] ? 0.4 : 1.5; });
    var others = shuffle(CARDW.filter(function (x) { return x !== w && WORD[x].e !== WORD[w].e; }));
    // にた おとの ことばを まぜる
    var nb = neighbors(w).filter(function (x) { return CARDW.indexOf(x) >= 0 && WORD[x].e !== WORD[w].e; });
    var n = R.sub === "listen" ? 4 : 3, opts = [w];
    nb.concat(others).forEach(function (x) { if (opts.length < n && opts.indexOf(x) < 0 && opts.every(function (o) { return WORD[o].e !== WORD[x].e; })) opts.push(x); });
    var q = { w: w, opts: shuffle(opts) };
    q.recs = {}; q.opts.forEach(function (x) { q.recs[x] = pickRec(x, "any"); });
    R.q = q; R.answered = false;
    setTitle("🃏 " + CARD_SUBS.filter(function (s) { return s.id === R.sub; })[0].t, "cards");
    main.innerHTML = '<div class="loading">🎧 よみこみちゅう…</div>';
    preload(q.opts.map(function (x) { return q.recs[x].f; })).then(function () { if (R && R.q === q) renderCard(q); });
  }
  function renderCard(q) {
    var h = '<div class="qhead">' + dotsHTML() + "</div>";
    if (R.sub === "listen") {
      h += '<p class="prompt">きこえた ものは どれ？</p>' + playRow() + '<div class="opts four">' +
        q.opts.map(function (x) { return '<button type="button" class="opt" data-a="' + esc(x) + '">' + picHTML(x) + jaHTML(x) + "</button>"; }).join("") + "</div>";
    } else {
      h += '<p class="prompt">' + picHTML(q.w).replace('class="pic"', 'class="pic" style="font-size:80px"') + "<br>" + (S.set.ja ? esc(WORD[q.w].ja) + " は どの こえ？" : "どの こえ？") + "</p>" +
        '<div class="opts three">' + q.opts.map(function (x, i) {
          return '<div class="opt" style="gap:10px"><button type="button" class="big slow" data-p="' + esc(x) + '" style="min-width:0;width:100%">🔊 ' + "ABC"[i] + "</button>" +
            '<button type="button" class="btn2 go" data-a="' + esc(x) + '" style="width:100%">これ！</button><span class="spell" data-s="' + esc(x) + '" style="font-size:24px;visibility:hidden">' + esc(x) + "</span></div>";
        }).join("") + "</div>";
    }
    h += '<div class="feedback" id="fb"></div>';
    main.innerHTML = h;
    if (R.sub === "listen") {
      bindPlay(function (rate) { return playPath(q.recs[q.w].f, rate); });
      setTimeout(function () { playPath(q.recs[q.w].f, 1); }, 250);
    } else {
      main.querySelectorAll("[data-p]").forEach(function (b) {
        b.addEventListener("click", function () { b.classList.add("playing"); playPath(q.recs[b.getAttribute("data-p")].f, 1).then(function () { b.classList.remove("playing"); }); });
      });
    }
    main.querySelectorAll("[data-a]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (R.answered) return;
        R.answered = true;
        var a = b.getAttribute("data-a"), ok = a === q.w;
        main.querySelectorAll(R.sub === "listen" ? "[data-a]" : ".opt").forEach(function (x) {
          var v = x.getAttribute("data-a") || x.querySelector("[data-a]").getAttribute("data-a");
          x.classList.add(v === q.w ? "ok" : v === a ? "ng" : "dim");
        });
        main.querySelectorAll("[data-s]").forEach(function (s) { s.style.visibility = "visible"; });
        sfx(ok ? "ok" : "ng");
        record(null, [q.w], ok, null);
        R.res.push(ok);
        var s = S.wst[q.w];
        var newly = false;
        if (ok && s && s.ok >= 3 && !S.learned[q.w]) { S.learned[q.w] = today(); save(); newly = true; }
        var cmpW = ok ? [q.w] : [q.w, a];
        var fb = $("#fb");
        fb.innerHTML = '<div class="res ' + (ok ? "ok" : "ng") + '">' + (ok ? "⭕ せいかい！" : "❌ おしい！") + ' <span class="spell" style="font-size:32px">' + spellHTML(q.w) + "</span></div>" +
          (newly ? '<p>📒 ことば ずかんに はいったよ！</p>' : "") +
          '<div class="row"><button type="button" class="btn2" id="cmp">🔁 ' + esc(cmpW.join(" … ")) + "</button>" +
          '<button type="button" class="btn2 go" id="next">つぎへ ▶</button></div>';
        var cr = pairRecs(cmpW);
        var cmp = function () { return playSeq(cr.map(function (r) { return r.f; }), 1, 600); };
        $("#cmp").addEventListener("click", cmp);
        $("#next").addEventListener("click", function () { stopAll(); R.i++; nextCard(); });
        wait(500).then(function () { if (R && R.q === q) cmp(); });
      });
    });
  }
  function wordBook() {
    setTitle("📒 ことば ずかん", "cards");
    var n = Object.keys(S.learned).length;
    main.innerHTML = '<p class="note">3かい あてた ことばが あつまるよ。' + n + " / " + CARDW.length + ' ご。タップで こえが きこえるよ。</p><div class="wgrid">' +
      CARDW.map(function (w) {
        var l = !!S.learned[w];
        return '<button type="button" class="' + (l ? "" : "locked") + '" data-w="' + esc(w) + '"><span>' + (l ? WORD[w].e : "❔") + "</span>" + (l ? esc(w) : "？？？") + "</button>";
      }).join("") + '</div><div class="spk" id="spk"></div>';
    main.querySelectorAll("[data-w]").forEach(function (b) {
      b.addEventListener("click", function () {
        var w = b.getAttribute("data-w");
        if (!S.learned[w]) return;
        var r = pickRec(w, "any"); $("#spk").textContent = accentLabel(r); playPath(r.f, 1);
      });
    });
  }

  // ================================================================ ほごしゃ 画面
  function parent() {
    setTitle("👪 ほごしゃ がめん", "home");
    var rows = CON.map(function (c) {
      var s = S.cst[c.id] || { n: 0, ok: 0 }, a = s.n ? Math.round(100 * s.ok / s.n) : null;
      return "<tr><td><b>" + esc(c.title) + "</b><br><small>" + esc(c.ja) + "</small></td><td>" + s.n + "</td><td>" +
        (a == null ? "—" : a + '%<div class="bar"><i style="width:' + a + '%"></i></div>') + "</td><td>" + "★".repeat(lvlOf(c.id) + 1) + "<br><small>" + LEVELS[lvlOf(c.id)].name + "</small></td></tr>";
    }).join("");
    var weak = CON.filter(function (c) { return (S.cst[c.id] || {}).n >= 5; })
      .sort(function (x, y) { return S.cst[x.id].ok / S.cst[x.id].n - S.cst[y.id].ok / S.cst[y.id].n; }).slice(0, 3);
    var weakW = Object.keys(S.wst).filter(function (w) { return S.wst[w].n >= 3 && S.wst[w].ok < S.wst[w].n; })
      .sort(function (x, y) { return S.wst[x].ok / S.wst[x].n - S.wst[y].ok / S.wst[y].n; }).slice(0, 10);
    var boxes = [0, 0, 0, 0, 0, 0];
    Object.keys(S.box).forEach(function (k) { boxes[S.box[k]]++; });
    main.innerHTML =
      '<div class="panel kpis"><div class="kpi"><b>' + (S.days[today()] || 0) + '</b>きょうの もんだい数</div><div class="kpi"><b>' + weekCount() +
      '</b>この7日間</div><div class="kpi"><b>' + Object.keys(S.days).length + '</b>練習した日数</div><div class="kpi"><b>' + Object.keys(S.learned).length + "</b>覚えた単語</div></div>" +
      '<div class="panel"><h3 style="margin-top:0">苦手な対立 TOP3</h3>' +
      (weak.length ? "<ol>" + weak.map(function (c) { return "<li><b>" + esc(c.title) + "</b>（" + Math.round(100 * S.cst[c.id].ok / S.cst[c.id].n) + "%）— " + esc(c.ja) + "</li>"; }).join("") + "</ol>" : '<p class="note">各対立を5問以上解くと表示されます。</p>') +
      (weakW.length ? '<p class="note">間違えやすい単語: ' + weakW.map(esc).join(", ") + "</p>" : "") + "</div>" +
      '<div class="panel"><h3 style="margin-top:0">対立ごとの正答率</h3><table><tr><th>対立</th><th>回数</th><th>正答率</th><th>段階</th></tr>' + rows + "</table>" +
      '<p class="note">「ききわけ」は直近の正答率が8割を超えると段階が上がります（2択 → おなじ？ちがう？ → 3択 → 初めて聞く話者）。' +
      "間違えた組み合わせはライトナー方式（5つの箱）で多めに出題します。いまの箱: " + boxes.slice(1).map(function (n, i) { return "箱" + (i + 1) + "=" + n; }).join("・") + "</p></div>" +
      '<div class="panel"><h3 style="margin-top:0">このアプリについて</h3><p class="note">音声はすべて人の録音です（Wikimedia Commons / Lingua Libre）。録音のない単語は出題しません。' +
      "話者はアメリカ・イギリスなどさまざまです。録音ごとの作者とライセンスは「おとの クレジット」にあります。</p>" +
      '<button type="button" class="ghost" data-go="credits">🎙️ おとの クレジット</button></div>' +
      '<div class="panel"><button type="button" class="danger" id="reset">記録をすべて消す</button></div>';
    $("#reset").addEventListener("click", function () {
      if (!confirm("練習の記録をすべて消します。よろしいですか？")) return;
      var set = S.set; S = blank(); S.set = set; save(); parent();
    });
  }

  // ================================================================ クレジット
  function credits() {
    setTitle("🎙️ おとの クレジット", "home");
    main.innerHTML = '<div class="loading">よみこみちゅう…</div>';
    fetch("audio/credits.json").then(function (r) { return r.json(); }).then(function (cr) {
      var lic = {}, spk = {};
      cr.forEach(function (c) { lic[c.license] = (lic[c.license] || 0) + 1; spk[c.speaker] = 1; });
      var h = '<div class="panel"><p>このアプリの音声はすべて、<a href="https://commons.wikimedia.org/" target="_blank" rel="noopener">Wikimedia Commons</a>（' +
        '<a href="https://lingualibre.org/" target="_blank" rel="noopener">Lingua Libre</a> を含む）で公開されている人の録音です。' +
        "録音 " + cr.length + " ファイル・話者 " + Object.keys(spk).length + " 人。</p>" +
        '<p class="note">加工: ' + esc((cr[0] || {}).modified || "") + "。<br>CC BY-SA の素材は、加工したファイルも同じ CC BY-SA ライセンスで提供します。" +
        "CC0・パブリックドメインの素材も、出典として作者を記載しています。</p>" +
        "<p>" + Object.keys(lic).sort(function (a, b) { return lic[b] - lic[a]; }).map(function (k) { return esc(k) + "：" + lic[k] + " 件"; }).join("　") + "</p></div>" +
        '<div class="panel credits"><table><tr><th>音</th><th>作者・話者</th><th>ライセンス</th><th>元ファイル</th></tr>' +
        cr.map(function (c) {
          return "<tr><td>" + esc(c.word || "/" + c.phoneme + "/") + "</td><td>" + esc(c.author || c.speaker) + "</td><td>" +
            (c.license_url ? '<a href="' + esc(c.license_url) + '" target="_blank" rel="noopener">' + esc(c.license) + "</a>" : esc(c.license)) +
            '</td><td><a href="' + esc(c.source_url) + '" target="_blank" rel="noopener">' + esc(c.source_file) + "</a></td></tr>";
        }).join("") + "</table></div>";
      main.innerHTML = h;
    }).catch(function () {
      main.innerHTML = '<div class="panel"><p>クレジットを読み込めませんでした。<a href="audio/credits.json">audio/credits.json</a> を直接ご覧ください。</p></div>';
    });
  }

  // テスト用
  window.EM_APP = { go: go, state: function () { return S; }, CON: CON, PHW: PHW, CARDW: CARDW };
  home();
})();
