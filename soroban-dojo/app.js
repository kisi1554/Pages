/* ============================================================
   そろばん どうじょう — がめんの うごき
   ============================================================ */
(function () {
  "use strict";
  var S = window.Soroban;
  var $ = function (s) { return document.querySelector(s); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var KYU = function (n) { return n + "<ruby>級<rt>きゅう</rt></ruby>"; };

  /* ---------- きろく（localStorage） ---------- */
  var KEY = "soroban-dojo-v1";
  var store = { set: { sound: true, speech: true, finger: true, labels: true, speed: "1" }, stars: {}, kyu: 11, tests: {}, chal: {}, flash: 0 };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved) { store = Object.assign(store, saved); store.set = Object.assign({ sound: true, speech: true, finger: true, labels: true, speed: "1" }, saved.set); }
  } catch (e) { /* よめなくても あそべる */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ほぞん できなくても つづける */ } }

  /* ---------- おと（WebAudio の ごうせい おん だけ） ---------- */
  var ac = null;
  function actx() {
    if (!ac) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C(); }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  var noiseBuf = null;
  function pachi(t, vol, freq) {
    var c = actx(); if (!c) return;
    t = t || c.currentTime; vol = vol || 0.5; freq = freq || 2600;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    }
    var n = c.createBufferSource(); n.buffer = noiseBuf;
    var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 2.5;
    var g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    n.connect(bp); bp.connect(g); g.connect(c.destination); n.start(t);
    // かたい きの「コッ」
    var o = c.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(freq * 0.55, t); o.frequency.exponentialRampToValueAtTime(freq * 0.3, t + 0.03);
    var g2 = c.createGain(); g2.gain.setValueAtTime(vol * 0.5, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    o.connect(g2); g2.connect(c.destination); o.start(t); o.stop(t + 0.05);
  }
  function tone(f, t, len, type, vol) {
    var c = actx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + len + 0.02);
  }
  function sound(name) {
    if (!store.set.sound) return;
    var c = actx(); if (!c) return;
    var t = c.currentTime;
    if (name === "pachi") pachi(t, 0.55, 2400 + Math.random() * 600);
    else if (name === "jara") { for (var i = 0; i < 16; i++) pachi(t + i * 0.022 + Math.random() * 0.012, 0.25 + Math.random() * 0.25, 1800 + Math.random() * 1600); }
    else if (name === "ok") { tone(784, t, 0.18, "triangle"); tone(1175, t + 0.12, 0.3, "triangle"); }
    else if (name === "ng") { tone(220, t, 0.25, "square", 0.08); tone(196, t + 0.15, 0.3, "square", 0.08); }
    else if (name === "fanfare") { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, t + i * 0.13, 0.35, "triangle"); }); }
    else if (name === "tick") tone(1320, t, 0.06, "sine", 0.12);
  }
  function speak(text) {
    if (!store.set.speech || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text); u.lang = "ja-JP"; u.rate = 0.95;
      speechSynthesis.speak(u);
    } catch (e) { /* よみあげ できない ブラウザ */ }
  }

  /* ---------- そろばん ---------- */
  var soro = new SorobanView($("#soro"), {
    sound: sound, fingerOn: function () { return store.set.finger; }, labels: store.set.labels
  });
  var mini = new SorobanView($("#a-soro"), { sound: sound, fingerOn: function () { return false; }, maxRods: 7, maxCol: 50, noLabels: true });
  mini.interactive = false;

  /* ---------- がめん きりかえ ---------- */
  var cur = "home", backTo = null;
  function show(id, title, back) {
    document.querySelectorAll(".view").forEach(function (v) { v.hidden = v.id !== "v-" + id; });
    cur = id; backTo = back || null;
    $("#back").hidden = !back;
    $("#title").innerHTML = title || "🧮 そろばん どうじょう";
    window.scrollTo(0, 0);
  }
  function toast(html, ms) {
    var t = $("#toast"); t.innerHTML = html; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, ms || 1200);
  }
  function coach(html) { $("#coach").innerHTML = html || ""; }
  function phaseHtml(ph) {
    var parts = ph.text.split("｜");
    return parts.map(function (p, i) { return i === parts.length - 1 ? "<b>" + p + "</b>" : "<span class='sub'>" + p + "</span>"; }).join("<br>");
  }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  /* ---------- ステップ ---------- */
  var STEPS = [
    { id: 1, em: "🔢", name: "かずを おく", desc: "てん（ていいてん）で くらいを きめて かずを おこう",
      subs: [{ t: "1〜9", lo: 1, hi: 9 }, { t: "10〜99", lo: 10, hi: 99 }, { t: "100〜999", lo: 100, hi: 999 }] },
    { id: 2, em: "➕", name: "かんたんな たしざん・ひきざん", desc: "たまが たりる けいさん",
      subs: [{ t: "たす（1けた）", op: "+", kind: "direct" }, { t: "ひく（1けた）", op: "-", kind: "direct" }, { t: "たす（2けた）", op: "+", two: true }, { t: "ひく（2けた）", op: "-", two: true }] },
    { id: 3, em: "🖐️", name: "5の あわせ・わかれ", desc: "5だまを つかう こつ",
      subs: [{ t: "5の あわせ（たす）", op: "+", kind: "five", demo: [1, 4] }, { t: "5の わかれ（ひく）", op: "-", kind: "five", demo: [6, 4] }] },
    { id: 4, em: "🔟", name: "10の あわせ・わかれ", desc: "くりあがり・くりさがり",
      subs: [{ t: "10の あわせ（たす）", op: "+", kind: "ten", demo: [3, 7] }, { t: "10の わかれ（ひく）", op: "-", kind: "ten", demo: [11, 7] }] },
    { id: 5, em: "🌀", name: "5と10の くみあわせ", desc: "6＋7 みたいな むずかしい かたち",
      subs: [{ t: "たす（6＋7 など）", op: "+", kind: "fiveten", demo: [6, 7] }, { t: "ひく（13−6 など）", op: "-", kind: "fiveten", demo: [13, 6] }] },
    { id: 6, em: "📋", name: "みとりざん", desc: "たてに ならんだ かずを つぎつぎ たす",
      subs: [{ t: "2けた 3こ", d: 2, c: 3 }, { t: "2けた 4こ（ひく も）", d: 2, c: 4, minus: true }, { t: "3けた 3こ", d: 3, c: 3 }, { t: "3けた 4こ（ひく も）", d: 3, c: 4, minus: true }] }
  ];
  var KIND_TIP = {
    five: { "+": "5の あわせ: たしたい かずの 1だまが たりない ときは、5だまを おろして「5 との あいかた」を はらう。（4 を たす → 5 を いれて 1 を はらう）",
            "-": "5の わかれ: ひきたい かずの 1だまが たりない ときは、「5 との あいかた」を いれて 5だまを はらう。（4 を ひく → 1 を いれて 5 を はらう）" },
    ten: { "+": "10の あわせ: 10を こえる ときは「10 との あいかた」を はらって、となりの けたに 1 を たす。（7 を たす → 3 を はらって となりに 1）",
           "-": "10の わかれ: たりない ときは となりの けたから 1 を とって、「10 との あいかた」を いれる。（7 を ひく → となりから 1 とって 3 を いれる）" },
    fiveten: { "+": "5と10: 10の あわせで「あいかた」を はらう ときに、5の わかれ も つかう。（6＋7 → 3 を はらう には 2 を いれて 5 を はらう → となりに 1）",
               "-": "5と10: 10の わかれで「あいかた」を いれる ときに、5の あわせ も つかう。（13−6 → となりから 1、4 を いれる には 5 を いれて 1 を はらう）" }
  };
  function stepStars(id, i) { return store.stars[id + "-" + i] || 0; }
  function renderHome() {
    var h = "";
    STEPS.forEach(function (st) {
      var got = st.subs.reduce(function (s, _, i) { return s + stepStars(st.id, i); }, 0);
      h += "<button class='card step' data-step='" + st.id + "'><span class='em'>" + st.em + "</span><b>ステップ" + st.id + "<br>" + st.name +
        "</b><small>" + st.desc + "</small><span class='stars'>★ " + got + " / " + st.subs.length * 3 + "</span></button>";
    });
    $("#steps").innerHTML = h;
    $("#mykyu").innerHTML = store.kyu <= 10 ? "🥋 いまの <ruby>級<rt>きゅう</rt></ruby>: <b>" + KYU(store.kyu) + "</b>" : "🥋 しんさ テストで 10" + "<ruby>級<rt>きゅう</rt></ruby>に ちょうせん しよう";
    var b = Math.max(store.chal["1"] || 0, store.chal["2"] || 0);
    $("#best").textContent = b ? "（さいこう " + b + "もん）" : "";
  }

  /* ---------- そろばんを つかう がめん ---------- */
  var play = null;       // { mode, step, sub, list, i, miss, prob, busy, ... }
  var CHAL = [{ t: "1けた たす・ひく" }, { t: "2けた たす" }];

  function tabsHtml(items, on, attr) {
    return items.map(function (s, i) { return "<button class='tab" + (i === on ? " on" : "") + "' data-" + attr + "='" + i + "'>" + s.t + (attr === "sub" && play && play.step ? " <i>" + "★".repeat(stepStars(play.step.id, i)) + "</i>" : "") + "</button>"; }).join("");
  }
  function setBtns(list) {
    var map = { demo: "#b-demo", clear: "#b-clear", ok: "#b-ok" };
    Object.keys(map).forEach(function (k) {
      var b = $(map[k]); var lab = list[k]; b.hidden = !lab; if (lab) b.innerHTML = lab;
    });
  }

  function makeProblem(step, sub) {
    var r;
    if (step.id === 1) { var n = sub.lo + Math.floor(Math.random() * (sub.hi - sub.lo + 1)); return { start: 0, terms: [n], answer: n }; }
    if (step.id === 6) { r = S.makeMitori(sub.d, sub.c, !!sub.minus); return { start: 0, terms: r.terms, answer: r.answer, tate: true }; }
    r = sub.two ? S.makeDirect2(sub.op) : S.makeStepProblem(sub.kind, sub.op);
    return { start: r.a, terms: [r.op === "-" ? -r.b : r.b], answer: r.answer };
  }
  function probHtml(p) {
    if (p.tate) {
      return "<div class='tate'>" + p.terms.map(function (t) { return "<div>" + (t < 0 ? "−" : "") + fmt(Math.abs(t)) + "</div>"; }).join("") + "<div class='line'></div></div>";
    }
    if (!p.start) return "<div class='big'>" + fmt(p.answer) + "</div><div class='sm'>を そろばんに おこう</div>";
    var t = p.terms[0];
    return "<div class='big'>" + p.start + " " + (t < 0 ? "−" : "＋") + " " + Math.abs(t) + "</div><div class='sm'>" + p.start + " は もう おいて あるよ。" + Math.abs(t) + " を " + (t < 0 ? "ひこう" : "たそう") + "</div>";
  }
  function plan(p) { return S.planSeries(p.start, p.terms, soro.unit + 1).phases; }

  function startStep(stepId, subIdx) {
    var step = STEPS[stepId - 1];
    soro.stop();
    play = { mode: "step", step: step, subIdx: subIdx || 0, i: 0, miss: 0, n: 5, results: [] };
    show("play", step.em + " " + step.name, "home");
    $("#tabs").hidden = false;
    $("#tabs").innerHTML = tabsHtml(step.subs, play.subIdx, "sub");
    setBtns({ demo: "▶ みほん", clear: "ごはさん", ok: "できた！" });
    soro.interactive = true;
    soro.setLabels(store.set.labels);
    var sub = step.subs[play.subIdx];
    if (sub.demo) intro(sub); else nextProblem();
  }
  function dotsHtml() {
    var h = "";
    for (var i = 0; i < play.n; i++) h += "<span class='" + (play.results[i] === true ? "ok" : play.results[i] === false ? "ng" : i === play.i ? "now" : "") + "'></span>";
    return h;
  }

  /* こつの みほん（ステップ3〜5 の はじめ） */
  async function intro(sub) {
    var me = play;
    var p = { start: sub.demo[0], terms: [sub.op === "-" ? -sub.demo[1] : sub.demo[1]] };
    p.answer = p.start + p.terms[0];
    $("#prob").innerHTML = "<div class='tip'>💡 こつ</div>" + probHtml(p).replace(/<div class='sm'>.*<\/div>/, "");
    $("#dots").innerHTML = "";
    coach(KIND_TIP[sub.kind][sub.op]);
    me.busy = true;
    soro.interactive = false;
    setBtns({ ok: "とばす ⏭" });
    await soro.clearAll(true);
    soro.setValue(p.start, true);
    await wait(1800 * +store.set.speed);
    if (play !== me) return;
    var done = await soro.play(plan(p), +store.set.speed * 1.2, function (ph) { coach("💡 " + phaseHtml(ph)); });
    if (play !== me) return;
    if (done) { coach("💡 こたえは <b>" + p.answer + "</b>。おなじ かたちを れんしゅう しよう！"); await wait(1800); }
    if (play !== me) return;
    setBtns({ demo: "▶ みほん", clear: "ごはさん", ok: "できた！" });
    me.busy = false;
    nextProblem();
  }

  async function nextProblem() {
    var me = play, sub = me.step.subs[me.subIdx];
    me.prob = makeProblem(me.step, sub);
    me.retry = false;
    $("#prob").innerHTML = probHtml(me.prob);
    $("#dots").innerHTML = dotsHtml();
    coach(me.prob.start ? "" : "そろばんの たまを タップ・スワイプ して うごかそう");
    soro.interactive = false;
    await soro.clearAll(true);
    if (play !== me) return;
    if (me.prob.start) { soro.setValue(me.prob.start, true); await wait(300); }
    soro.interactive = true;
    if (me.prob.tate) coach("ぜんぶ たしたら「できた！」");
  }

  async function check() {
    var me = play, p = me.prob;
    var v = soro.value();
    if (v === p.answer) {
      sound("ok");
      if (!me.retry) me.results[me.i] = true;
      toast("⭕ せいかい！ " + fmt(p.answer));
      me.i++;
      $("#dots").innerHTML = dotsHtml();
      soro.interactive = false;
      await wait(900);
      if (play !== me) return;
      if (me.i >= me.n) return finishStep();
      return nextProblem();
    }
    sound("ng");
    if (!me.retry) { me.results[me.i] = false; me.miss++; }
    me.retry = true;
    $("#dots").innerHTML = dotsHtml();
    soro.interactive = false;
    me.busy = true;
    var target = S.fromNumber(p.answer, soro.N, soro.unit);
    var n = soro.markWrong(target);
    coach("❌ いまは <b>" + fmt(v) + "</b>。<span class='red'>あかい たま</span>が ちがう ところ（" + n + "こ）。<br>ただしい うごきを ゆっくり みてみよう");
    setBtns({ ok: "とばす ⏭" });
    await wait(2200);
    if (play !== me) return;
    await replay(me);
  }
  async function replay(me) {
    var p = me.prob;
    me.busy = true;
    soro.interactive = false;
    setBtns({ ok: "とばす ⏭" });
    await soro.clearAll(true);
    if (p.start) { soro.setValue(p.start, true); await wait(600); }
    await soro.play(plan(p), +store.set.speed * 1.15, function (ph) {
      coach((p.tate ? "（" + (ph.term + 1) + "ばんめ）" : "") + phaseHtml(ph));
    });
    if (play !== me) return;
    coach("こたえは <b>" + fmt(p.answer) + "</b>。こんどは じぶんで やってみよう！");
    await wait(900);
    if (play !== me) return;
    await soro.clearAll(true);
    if (p.start) soro.setValue(p.start, true);
    setBtns({ demo: "▶ みほん", clear: "ごはさん", ok: "できた！" });
    me.busy = false;
    soro.interactive = true;
  }
  function finishStep() {
    var me = play, okN = me.results.filter(function (x) { return x; }).length;
    var stars = me.miss === 0 ? 3 : me.miss <= 2 ? 2 : 1;
    var key = me.step.id + "-" + me.subIdx;
    store.stars[key] = Math.max(store.stars[key] || 0, stars);
    save();
    sound("fanfare");
    var nextSub = me.subIdx + 1 < me.step.subs.length ? me.subIdx + 1 : null;
    showResult("<div class='em'>🎉</div><h2>" + me.step.subs[me.subIdx].t + " クリア！</h2><p class='stars big'>" + "★".repeat(stars) + "<span class='off'>" + "★".repeat(3 - stars) + "</span></p><p>いっぱつで せいかい: " + okN + " / " + me.n + "</p>",
      function () { startStep(me.step.id, nextSub == null ? me.subIdx : nextSub); }, nextSub == null ? "もういちど" : "つぎへ →", "home");
  }

  /* ---------- しんさ ふう テスト ---------- */
  function renderTests() {
    var h = "";
    S.GRADES.forEach(function (g) {
      var open = g.kyu >= store.kyu - 1 || g.kyu === 10;
      var rec = store.tests[g.kyu];
      h += "<button class='kyu" + (store.kyu <= g.kyu ? " passed" : "") + "' data-kyu='" + g.kyu + "'" + (open ? "" : " disabled") + ">" +
        "<b>" + KYU(g.kyu) + "</b><span>" + g.digits + "けた × " + g.count + "こ" + (g.minus ? "（たす・ひく）" : "（たす）") + "<br>" + g.n + "もん・" + g.sec / 60 + "ぷん・" + g.pass + "もん で ごうかく</span>" +
        "<i>" + (store.kyu <= g.kyu ? "🏅 ごうかく" : open ? (rec ? "さいこう " + rec + "もん" : "ちょうせん！") : "🔒") + "</i></button>";
    });
    $("#kyulist").innerHTML = h;
  }
  var timer = null;
  function startTest(kyu) {
    var g = S.GRADES.find(function (x) { return x.kyu === kyu; });
    soro.stop();
    var list = [];
    for (var i = 0; i < g.n; i++) { var r = S.makeMitori(g.digits, g.count, g.minus); list.push({ start: 0, terms: r.terms, answer: r.answer, tate: true }); }
    play = { mode: "test", grade: g, list: list, i: 0, answers: [], t0: Date.now() };
    show("play", "📜 " + KYU(kyu) + " しんさ", "test");
    $("#tabs").hidden = true;
    setBtns({ clear: "ごはさん", ok: "つぎへ →" });
    soro.interactive = true;
    soro.setLabels(false);
    speak("ねがいましては");
    testShow();
    clearInterval(timer);
    timer = setInterval(function () {
      if (!play || play.mode !== "test") return clearInterval(timer);
      var left = g.sec - Math.floor((Date.now() - play.t0) / 1000);
      var el = $("#prob .timer"); if (el) el.textContent = "⏱ " + Math.floor(Math.max(0, left) / 60) + ":" + String(Math.max(0, left) % 60).padStart(2, "0");
      if (left <= 0) { clearInterval(timer); finishTest(true); }
    }, 250);
  }
  function testShow() {
    var p = play.list[play.i];
    play.prob = p;
    $("#prob").innerHTML = "<div class='testhead'><span>だい " + (play.i + 1) + " もん / " + play.grade.n + "</span><span class='timer'></span></div>" + probHtml(p);
    $("#dots").innerHTML = "";
    coach("こたえを そろばんに おいたら「つぎへ」");
    soro.clearAll(true);
  }
  function testNext() {
    play.answers[play.i] = soro.value();
    sound("pachi");
    play.i++;
    if (play.i >= play.list.length) { clearInterval(timer); return finishTest(false); }
    testShow();
  }
  function finishTest(timeUp) {
    var me = play, g = me.grade;
    var used = Math.min(g.sec, Math.round((Date.now() - me.t0) / 1000));
    var ok = me.list.filter(function (p, i) { return me.answers[i] === p.answer; }).length;
    var pass = S.judge(g, ok, used) && !(timeUp && me.answers.length < g.pass);
    store.tests[g.kyu] = Math.max(store.tests[g.kyu] || 0, ok);
    if (pass) store.kyu = Math.min(store.kyu, g.kyu);
    save();
    sound(pass ? "fanfare" : "ng");
    var rows = me.list.map(function (p, i) {
      var a = me.answers[i];
      return "<tr class='" + (a === p.answer ? "ok" : "ng") + "'><td>" + (i + 1) + "</td><td>" + p.terms.map(function (t, j) { return (t < 0 ? "−" : j ? "＋" : "") + Math.abs(t); }).join(" ") + "</td><td>" + fmt(p.answer) + "</td><td>" + (a == null ? "—" : fmt(a)) + "</td><td>" + (a === p.answer ? "⭕" : "❌") + "</td></tr>";
    }).join("");
    showResult("<div class='em'>" + (pass ? "🏅" : "💪") + "</div><h2>" + KYU(g.kyu) + " " + (pass ? "ごうかく！" : "ざんねん…") + "</h2>" +
      "<p>せいかい <b>" + ok + "</b> / " + g.n + "（ごうかくは " + g.pass + "もん）・じかん " + Math.floor(used / 60) + "ふん" + (used % 60) + "びょう" + (timeUp ? "（じかん ぎれ）" : "") + "</p>" +
      "<table class='rtable'><tr><th></th><th>もんだい</th><th>こたえ</th><th>きみ</th><th></th></tr>" + rows + "</table>",
      function () { startTest(g.kyu); }, "もういちど", "test");
  }

  /* ---------- ちょうせん（1ぷん） ---------- */
  function startChal(lv, go) {
    soro.stop();
    play = { mode: "chal", lv: lv || 0, ok: 0, running: false };
    show("play", "⏱️ ちょうせん", "home");
    $("#tabs").hidden = false;
    $("#tabs").innerHTML = tabsHtml(CHAL, play.lv, "chal");
    soro.setLabels(store.set.labels);
    setBtns({ ok: "スタート！" });
    var best = store.chal[String(play.lv + 1)] || 0;
    $("#prob").innerHTML = "<div class='big'>1ぷんで なんもん？</div><div class='sm'>こたえが そろばんに できたら つぎの もんだいへ。さいこう " + best + "もん</div>";
    $("#dots").innerHTML = "";
    coach("");
    soro.clearAll(true);
    soro.interactive = false;
    if (go) chalGo();
  }
  function chalProb() {
    var a, b, op;
    if (play.lv === 0) {
      op = Math.random() < 0.5 ? "+" : "-";
      a = Math.floor(Math.random() * 10); b = 1 + Math.floor(Math.random() * 9);
      if (op === "-" && a < b) { var x = a; a = b; b = x; }
      if (op === "-" && a < b) op = "+";
    } else { op = "+"; a = 10 + Math.floor(Math.random() * 90); b = 10 + Math.floor(Math.random() * 90); }
    return { start: a, terms: [op === "-" ? -b : b], answer: op === "-" ? a - b : a + b };
  }
  function chalShow() {
    var p = play.prob = chalProb();
    $("#prob").innerHTML = "<div class='testhead'><span>⭕ " + play.ok + "もん</span><span class='timer'></span></div>" + probHtml(p);
    soro.setValue(p.start, false);
  }
  function chalGo() {
    play.running = true; play.t0 = Date.now();
    setBtns({ clear: "ごはさん", ok: "パス" });
    soro.interactive = true;
    chalShow();
    clearInterval(timer);
    timer = setInterval(function () {
      if (!play || play.mode !== "chal") return clearInterval(timer);
      var left = 60 - Math.floor((Date.now() - play.t0) / 1000);
      var el = $("#prob .timer"); if (el) el.textContent = "⏱ " + Math.max(0, left);
      if (left <= 0) { clearInterval(timer); chalEnd(); }
    }, 200);
  }
  function chalEnd() {
    var me = play; me.running = false; soro.interactive = false;
    var k = String(me.lv + 1), best = store.chal[k] || 0, rec = me.ok > best;
    if (rec) store.chal[k] = me.ok;
    save();
    sound("fanfare");
    showResult("<div class='em'>" + (rec ? "🏆" : "⏱️") + "</div><h2>" + me.ok + "もん できた！</h2><p>" + CHAL[me.lv].t + (rec ? " ・ <b>しんきろく！</b>" : " ・ さいこう " + best + "もん") + "</p>",
      function () { startChal(me.lv, true); }, "もういちど", "home");
  }

  /* ---------- じゆうに さわる ---------- */
  function startFree() {
    soro.stop();
    play = { mode: "free" };
    show("play", "🖐️ じゆうに さわる", "home");
    $("#tabs").hidden = true;
    setBtns({ clear: "ごはさん" });
    soro.interactive = true;
    soro.setLabels(store.set.labels);
    $("#dots").innerHTML = "";
    coach("<b>てん</b> の ある けたが <b>いちの くらい</b>。うえの 5だまは「5」、したの 1だまは「1」");
    freeShow();
  }
  function freeShow() {
    var v = soro.value();
    $("#prob").innerHTML = "<div class='sm'>いま おいてある かず</div><div class='big'>" + (v === Math.floor(v) ? fmt(v) : v) + "</div>";
  }

  /* ---------- けっか ---------- */
  var resultAgain = null;
  function showResult(html, again, againLabel, back) {
    soro.interactive = false;
    $("#result").innerHTML = html;
    $("#r-again").textContent = againLabel || "もういちど";
    resultAgain = again;
    show("result", "けっか", back);
  }

  /* ---------- あんざん ---------- */
  var az = { m: "peek", o: { kind: 0, dig: 0, sec: 1 }, f: { dig: 0, cnt: 1, spd: 1 }, run: null };
  var AOPT = {
    peek: [["kind", "もんだい", ["よみとり", "たしざん", "ひきざん"]], ["dig", "けた", ["1けた", "2けた", "3けた"]], ["sec", "みえる じかん", ["2びょう", "1びょう", "0.5びょう"]]],
    flash: [["dig", "けた", ["1けた", "2けた"]], ["cnt", "かずの かず", ["3こ", "5こ", "7こ", "10こ"]], ["spd", "はやさ", ["ゆっくり", "ふつう", "はやい"]]]
  };
  function renderAnzan() {
    document.querySelectorAll("#a-tabs .tab").forEach(function (t) { t.classList.toggle("on", t.dataset.am === az.m); });
    var o = az.m === "peek" ? az.o : az.f;
    $("#a-opts").innerHTML = AOPT[az.m].map(function (row) {
      return "<div class='orow'><span>" + row[1] + "</span>" + row[2].map(function (l, i) { return "<button class='chip" + (o[row[0]] === i ? " on" : "") + "' data-ao='" + row[0] + "' data-v='" + i + "'>" + l + "</button>"; }).join("") + "</div>";
    }).join("");
    $("#a-opts").hidden = false;
    $("#a-start").hidden = false;
    $("#a-start").textContent = "はじめる";
    $("#keypad").hidden = true;
    $("#a-ans").innerHTML = "&nbsp;";
    $("#a-flash").textContent = "";
    $("#a-cover").hidden = true;
    $("#a-soro").style.visibility = az.m === "peek" ? "visible" : "hidden";
    $("#a-flash").hidden = az.m !== "flash";
    $("#a-q").innerHTML = az.m === "peek" ? "そろばんが ちらっと みえるよ。あたまの なかで たまを うごかそう" :
      "かずが つぎつぎ でるよ。ぜんぶ たすと いくつ？" + (store.flash ? "<br><small>クリアした いちばん むずかしい: " + store.flash + "てん</small>" : "");
    mini.clearAll(true);
  }
  var keyIn = "", keyResolve = null;
  function askKey(q) {
    keyIn = ""; $("#a-ans").textContent = "？"; $("#a-q").innerHTML = q;
    $("#keypad").hidden = false;
    return new Promise(function (r) { keyResolve = r; });
  }
  function key(k) {
    if (!keyResolve) return;
    sound("tick");
    if (k === "⌫") keyIn = keyIn.slice(0, -1);
    else if (k === "OK") { if (!keyIn) return; var r = keyResolve; keyResolve = null; $("#keypad").hidden = true; r(+keyIn); return; }
    else if (keyIn.length < 6) keyIn = (keyIn === "0" ? "" : keyIn) + k;
    $("#a-ans").textContent = keyIn || "？";
  }
  async function anzanRun() {
    var me = az.run = {};
    $("#a-opts").hidden = true; $("#a-start").hidden = true;
    if (az.m === "peek") {
      var ok = 0, N = 10, ms = [2000, 1000, 500][az.o.sec];
      for (var i = 0; i < N; i++) {
        var lo = Math.pow(10, az.o.dig);
        var a = (az.o.dig ? lo : 1) + Math.floor(Math.random() * (az.o.dig ? lo * 9 : 9));
        if (az.o.dig === 0) a = 1 + Math.floor(Math.random() * 9);
        var op = az.o.kind;
        var d = 1 + Math.floor(Math.random() * (op === 2 ? Math.min(9, a) : 9));
        var ans = op === 0 ? a : op === 1 ? a + d : a - d;
        $("#a-q").innerHTML = "だい " + (i + 1) + " もん / " + N + "　…よく みて！";
        $("#a-ans").innerHTML = "&nbsp;";
        $("#a-cover").hidden = true;
        await mini.clearAll(true);
        mini.setValue(a, false);
        await wait(ms);
        if (az.run !== me) return;
        $("#a-cover").hidden = false;
        var got = await askKey(op === 0 ? "いまの かずは？" : "いまの かず " + (op === 1 ? "＋ " : "− ") + d + " は？");
        if (az.run !== me) return;
        $("#a-cover").hidden = true;
        if (got === ans) { ok++; sound("ok"); $("#a-q").innerHTML = "⭕ せいかい！ " + ans; }
        else { sound("ng"); $("#a-q").innerHTML = "❌ こたえは <b>" + ans + "</b>"; }
        if (op) await mini.play(S.planSeries(a, [op === 1 ? d : -d], mini.unit + 1).phases, 0.5);
        await wait(1200);
        if (az.run !== me) return;
      }
      $("#a-q").innerHTML = "🎉 " + N + "もん ちゅう <b>" + ok + "</b>もん せいかい！";
    } else {
      var cnt = [3, 5, 7, 10][az.f.cnt], spd = [1500, 1000, 650][az.f.spd], dig = az.f.dig;
      var nums = [];
      for (var j = 0; j < cnt; j++) {
        var n; do { n = dig ? 10 + Math.floor(Math.random() * 90) : 1 + Math.floor(Math.random() * 9); } while (nums.length && n === nums[nums.length - 1]);
        nums.push(n);
      }
      var fl = $("#a-flash");
      fl.textContent = "";
      $("#a-q").innerHTML = "ねがいましては…";
      speak("ねがいましては");
      await wait(1600);
      $("#a-q").innerHTML = "よく みて！";
      for (j = 0; j < cnt; j++) {
        if (az.run !== me) return;
        fl.textContent = nums[j]; fl.classList.add("on"); sound("tick");
        await wait(spd * 0.8);
        fl.textContent = ""; fl.classList.remove("on");
        await wait(spd * 0.2);
      }
      var sum = nums.reduce(function (s, x) { return s + x; }, 0);
      var g2 = await askKey("ぜんぶで いくつ？");
      if (az.run !== me) return;
      var score = (dig + 1) * 10 + cnt * 2 + az.f.spd * 5;
      if (g2 === sum) { sound("fanfare"); if (score > (store.flash || 0)) { store.flash = score; save(); } }
      else sound("ng");
      fl.innerHTML = "<small>" + nums.join(" ＋ ") + " ＝</small><br>" + sum;
      $("#a-q").innerHTML = g2 === sum ? "⭕ せいかい！ すごい！" : "❌ こたえは <b>" + sum + "</b>（きみは " + g2 + "）";
    }
    $("#a-start").hidden = false; $("#a-start").textContent = "もういちど";
    $("#a-opts").hidden = false;
    az.run = null;
  }

  /* ---------- せってい ---------- */
  function syncSound() { $("#sound").textContent = store.set.sound ? "🔊" : "🔇"; }
  function openSettings() {
    document.querySelectorAll("[data-set]").forEach(function (i) {
      var k = i.dataset.set;
      if (i.type === "checkbox") i.checked = !!store.set[k]; else i.value = store.set[k];
    });
    var d = $("#dlg");
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
  }

  /* ---------- イベント ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    actx();
    if (t.dataset.step) return startStep(+t.dataset.step, 0);
    if (t.dataset.go === "test") { renderTests(); return show("test", "📜 しんさ ふう テスト", "home"); }
    if (t.dataset.go === "anzan") { az.run = null; keyResolve = null; show("anzan", "🧠 あんざん", "home"); return renderAnzan(); }
    if (t.dataset.go === "chal") return startChal(0);
    if (t.dataset.go === "free") return startFree();
    if (t.dataset.kyu) return startTest(+t.dataset.kyu);
    if (t.dataset.sub && play && play.mode === "step") return startStep(play.step.id, +t.dataset.sub);
    if (t.dataset.chal && play && play.mode === "chal" && !play.running) return startChal(+t.dataset.chal);
    if (t.dataset.am && !az.run) { az.m = t.dataset.am; return renderAnzan(); }
    if (t.dataset.ao) { (az.m === "peek" ? az.o : az.f)[t.dataset.ao] = +t.dataset.v; return renderAnzan(); }
    if (t.dataset.k) return key(t.dataset.k);
  });
  $("#back").addEventListener("click", function () {
    soro.stop(); clearInterval(timer); az.run = null; keyResolve = null; play = null;
    if (backTo === "test") { renderTests(); show("test", "📜 しんさ ふう テスト", "home"); }
    else { renderHome(); show("home"); }
  });
  $("#b-ok").addEventListener("click", function () {
    if (!play) return;
    if (play.busy) {           // みほん さいせい ちゅう → とばす
      soro.stop();
      var me = play;
      me.busy = false;
      setBtns({ demo: "▶ みほん", clear: "ごはさん", ok: "できた！" });
      if (!me.prob) return nextProblem();
      soro.clearAll(true).then(function () {
        if (play !== me) return;
        if (me.prob.start) soro.setValue(me.prob.start, false);
        coach(""); soro.interactive = true;
      });
      return;
    }
    if (play.mode === "step") return check();
    if (play.mode === "test") return testNext();
    if (play.mode === "chal") {
      if (!play.running) return chalGo();
      sound("ng"); return chalShow();
    }
  });
  $("#b-demo").addEventListener("click", function () { if (play && play.mode === "step" && !play.busy) replay(play); });
  $("#b-clear").addEventListener("click", async function () {
    if (!play || play.busy) return;
    var me = play;
    soro.interactive = false;
    speak("ごはさんで ねがいましては");
    await soro.clearAll(false);
    if (play !== me) return;
    if (me.prob && me.prob.start && me.mode !== "test") { await wait(250); soro.setValue(me.prob.start, true); }
    if (me.mode === "free") freeShow();
    soro.interactive = me.mode !== "chal" || me.running;
  });
  soro.onUser = function () {
    if (!play) return;
    if (play.mode === "free") freeShow();
    if (play.mode === "chal" && play.running && soro.value() === play.prob.answer) {
      var me = play;
      soro.interactive = false;
      setTimeout(function () {
        if (play !== me || !me.running) return;
        me.ok++; sound("ok"); chalShow(); soro.interactive = true;
      }, 220);
    }
  };
  $("#r-again").addEventListener("click", function () { if (resultAgain) resultAgain(); });
  $("#r-home").addEventListener("click", function () { renderHome(); show("home"); });
  $("#a-start").addEventListener("click", function () { anzanRun(); });
  $("#keypad").innerHTML = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "⌫", "0", "OK"].map(function (k) {
    return "<button class='key" + (k === "OK" ? " main" : "") + "' data-k='" + k + "'>" + k + "</button>";
  }).join("");
  $("#sound").addEventListener("click", function () { store.set.sound = !store.set.sound; save(); syncSound(); });
  $("#gear").addEventListener("click", openSettings);
  document.querySelectorAll("[data-set]").forEach(function (i) {
    i.addEventListener("change", function () {
      store.set[i.dataset.set] = i.type === "checkbox" ? i.checked : i.value;
      save(); syncSound();
      soro.setLabels(store.set.labels && !(play && play.mode === "test"));
    });
  });
  $("#reset").addEventListener("click", function () {
    if (!confirm("きろく（ほし・きゅう・さいこう）を ぜんぶ けしますか？")) return;
    store.stars = {}; store.kyu = 11; store.tests = {}; store.chal = {}; store.flash = 0;
    save(); renderHome(); $("#dlg").close();
  });
  document.addEventListener("keydown", function (e) {
    if (cur === "anzan" && keyResolve) {
      if (/^[0-9]$/.test(e.key)) key(e.key);
      else if (e.key === "Backspace") key("⌫");
      else if (e.key === "Enter") key("OK");
    }
  });

  syncSound();
  renderHome();
  show("home");
  window.__soro = { soro: soro, mini: mini, store: store, S: S };
})();
