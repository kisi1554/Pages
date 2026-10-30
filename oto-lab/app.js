/* ============================================================
   おとの ふしぎ ラボ — がめん（ホーム・じっけん 3ステップ・ノート・せってい）
   じっけんは experiments/*.js が OtoLab.add({...}) で とうろくする
   ============================================================ */
(function (root) {
  "use strict";
  var A = root.OtoAudio, P = root.OtoPhys, doc = root.document;
  var KEY = "oto-lab-v1", SVGNS = "http://www.w3.org/2000/svg";
  var exps = [], cur = null, step = 0, cleanup = null, loops = [], timers = [], rafId = 0, lastT = 0;

  // ---------- ほぞん ----------
  function load() {
    var s = null;
    try { s = JSON.parse(root.localStorage.getItem(KEY)); } catch (e) { s = null; }
    if (!s || typeof s !== "object") s = {};
    if (typeof s.sound !== "boolean") s.sound = true;
    if (typeof s.vol !== "number") s.vol = 0.4;
    s.mic = s.mic === true;
    if (!s.exp || typeof s.exp !== "object") s.exp = {};
    return s;
  }
  var st = load();
  function save() { try { root.localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ほぞん できなくても あそべる */ } }
  function es(id) {
    var e = st.exp[id];
    if (!e || typeof e !== "object") e = st.exp[id] = {};
    if (!e.found || typeof e.found !== "object") e.found = {};
    return e;
  }

  // ---------- こまかい どうぐ ----------
  function rb(s) { return String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>"); }
  function $(id) { return doc.getElementById(id); }
  function h(tag, attrs, html, parent) {
    var el = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") el.className = attrs[k]; else if (k === "on") Object.keys(attrs.on).forEach(function (ev) { el.addEventListener(ev, attrs.on[ev]); });
      else el.setAttribute(k, attrs[k]);
    });
    if (html != null) el.innerHTML = rb(html);
    if (parent) parent.appendChild(el);
    return el;
  }
  function sv(tag, attrs, parent) {
    var el = doc.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (k === "text") el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(el);
    return el;
  }
  function svgPt(svg, e) {
    var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    var q = p.matrixTransform(svg.getScreenCTM().inverse()); return { x: q.x, y: q.y };
  }
  function countFound(d) { var f = es(d.id).found; return d.findings.filter(function (x) { return f[x.id]; }).length; }

  // ---------- アニメの ループ（じっけんを かえると ぜんぶ とまる）----------
  function tick(t) {
    var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016; lastT = t;
    loops.slice().forEach(function (fn) { try { fn(dt, t / 1000); } catch (e) { console.error(e); } });
    rafId = loops.length ? root.requestAnimationFrame(tick) : 0;
    if (!rafId) lastT = 0;
  }
  function addLoop(fn) { loops.push(fn); if (!rafId) rafId = root.requestAnimationFrame(tick); }
  function teardown() {
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } }
    cleanup = null; loops = []; timers.forEach(clearTimeout); timers = [];
    if (rafId) root.cancelAnimationFrame(rafId); rafId = 0; lastT = 0;
    A.stopAll();
  }

  // ---------- がめんの きりかえ ----------
  function show(view) {
    ["home", "exp", "note"].forEach(function (v) { $("v-" + v).hidden = v !== view; });
    root.scrollTo(0, 0);
  }

  function renderHome() {
    teardown(); cur = null; show("home");
    var list = $("expList"); list.innerHTML = "";
    exps.forEach(function (d, i) {
      var e = es(d.id), n = countFound(d);
      var b = h("button", { type: "button", class: "excard" + (e.done ? " done" : ""), style: "--c:" + d.color, "data-id": d.id }, null, list);
      h("span", { class: "exno" }, String(i + 1), b);
      h("span", { class: "exem", "aria-hidden": "true" }, d.emoji, b);
      h("span", { class: "exname" }, d.title, b);
      h("span", { class: "exprog" }, "📒 " + n + " / " + d.findings.length + (e.done ? " 💮" : ""), b);
      b.addEventListener("click", function () { openExp(d.id); });
    });
  }

  function openExp(id, n) {
    var d = exps.filter(function (x) { return x.id === id; })[0];
    if (!d) return renderHome();
    cur = d; show("exp");
    $("expTitle").innerHTML = rb(d.emoji + " " + d.title);
    $("v-exp").style.setProperty("--c", d.color);
    goStep(n || (es(id).pick == null ? 1 : 2));
  }

  function goStep(n) {
    teardown(); step = n;
    Array.prototype.forEach.call(doc.querySelectorAll(".step"), function (b) {
      b.setAttribute("aria-current", +b.dataset.step === n ? "step" : "false");
    });
    var body = $("expBody"); body.innerHTML = ""; root.scrollTo(0, 0);
    if (n === 1) stepYosou(body); else if (n === 2) stepTamesu(body); else stepWakatta(body);
  }

  // ---- 1. よそう ----
  function stepYosou(body) {
    var d = cur, e = es(d.id), y = d.yosou;
    var card = h("div", { class: "qcard" }, null, body);
    h("p", { class: "qlead" }, "🤔 よそう しよう", card);
    h("p", { class: "q" }, y.q, card);
    var ch = h("div", { class: "choices" }, null, card), next;
    y.choices.forEach(function (c, i) {
      var b = h("button", { type: "button", class: "choice", "aria-pressed": String(e.pick === i) }, c.t, ch);
      b.addEventListener("click", function () {
        e.pick = i; save(); A.pop();
        Array.prototype.forEach.call(ch.children, function (x, k) { x.setAttribute("aria-pressed", String(k === i)); });
        next.hidden = false;
      });
    });
    h("p", { class: "hint" }, "あってる かな？ つぎの「ためす」で たしかめよう", card);
    next = h("button", { type: "button", class: "btn big" }, "🧪 ためして みよう ▶", body);
    next.hidden = e.pick == null;
    next.addEventListener("click", function () { goStep(2); });
  }

  // ---- 2. ためす ----
  function stepTamesu(body) {
    var d = cur, e = es(d.id);
    var wrap = h("div", { class: "trial" }, null, body);
    var stage = h("div", { class: "stagecol" }, null, wrap);
    var side = h("div", { class: "sidecol" }, null, wrap);
    var sayBox = h("div", { class: "say" }, null, side);
    var ctrl = h("div", { class: "ctrl" }, null, side);
    var strip = h("div", { class: "strip" }, null, side);
    h("p", { class: "striph" }, "📒 じっけん ノート", strip);
    var ul = h("ul", { class: "flist" }, null, strip);
    function drawStrip() {
      ul.innerHTML = "";
      d.findings.forEach(function (f) { h("li", { class: e.found[f.id] ? "got" : "" }, (e.found[f.id] ? "✅ " : "⬜ ") + f.t, ul); });
    }
    drawStrip();
    var nextB = h("button", { type: "button", class: "btn big" }, "💡 わかった ことへ ▶", body);
    nextB.addEventListener("click", function () { goStep(3); });
    if (d.safety) h("p", { class: "safety" }, d.safety, body);

    var ctx = {
      A: A, P: P, rb: rb, h: h, sv: sv, svgPt: svgPt, stage: stage, ctrl: ctrl, lab: st,
      say: function (html, cls) { sayBox.innerHTML = rb(html); sayBox.className = "say" + (cls ? " " + cls : ""); },
      found: function (fid) {
        if (e.found[fid]) return;
        var f = d.findings.filter(function (x) { return x.id === fid; })[0]; if (!f) return;
        e.found[fid] = true; save(); drawStrip(); A.ok();
        toast("📒 みつけた！ " + f.t);
      },
      loop: addLoop,
      after: function (ms, fn) { var id = setTimeout(fn, ms); timers.push(id); return id; },
      row: function (parent) { return h("div", { class: "row" }, null, parent || ctrl); },
      btn: function (label, fn, cls, parent) {
        var b = h("button", { type: "button", class: "btn" + (cls ? " " + cls : "") }, label, parent || ctrl);
        b.addEventListener("click", fn); return b;
      },
      slider: function (o) {
        var box = h("label", { class: "slider" }, null, o.parent || ctrl);
        h("span", { class: "slab" }, o.label, box);
        var line = h("span", { class: "sline" }, null, box);
        h("span", { class: "send" }, o.left || "", line);
        var inp = h("input", { type: "range", min: o.min, max: o.max, step: o.step || 1, value: o.value, "aria-label": o.aria || "" }, null, line);
        h("span", { class: "send" }, o.right || "", line);
        inp.addEventListener("input", function () { o.input(+inp.value); });
        if (o.change) inp.addEventListener("change", function () { o.change(+inp.value); });
        return inp;
      },
      seg: function (opts, val, fn, parent) {
        var box = h("div", { class: "seg" }, null, parent || ctrl), bs = [];
        opts.forEach(function (o) {
          var b = h("button", { type: "button", "aria-pressed": String(o.v === val) }, o.t, box); bs.push(b);
          b.addEventListener("click", function () { bs.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); fn(o.v); });
        });
        return box;
      },
      openSettings: openSettings
    };
    var c = d.mount(ctx);
    if (typeof c === "function") cleanup = c;
  }

  // ---- 3. わかった こと ----
  function stepWakatta(body) {
    var d = cur, e = es(d.id), y = d.yosou;
    var card = h("div", { class: "qcard" }, null, body);
    h("p", { class: "qlead" }, "🤔 よそう と くらべよう", card);
    h("p", { class: "q small" }, y.q, card);
    var ans = y.choices.filter(function (c) { return c.ok; })[0];
    if (e.pick != null && y.choices[e.pick]) {
      var hit = !!y.choices[e.pick].ok;
      h("p", { class: "res " + (hit ? "hit" : "miss") },
        "きみの よそう: <b>" + y.choices[e.pick].t + "</b><br>" + (hit ? "⭕ よそう どおり！" : "🔍 よそうと ちがった！ それも だいじな はっけん"), card);
    } else h("p", { class: "res" }, "まだ よそう して いないよ", card);
    h("p", { class: "ans" }, "こたえ: <b>" + ans.t + "</b>　" + y.why, card);

    var nb = h("div", { class: "qcard" }, null, body);
    h("p", { class: "qlead" }, "📒 じっけん ノート", nb);
    h("p", { class: "hint" }, "じぶんで たしかめた ことに しるしを つけよう（タップで つけたり けしたり）", nb);
    var ul = h("ul", { class: "flist big" }, null, nb);
    d.findings.forEach(function (f) {
      var li = h("li", null, null, ul);
      var b = h("button", { type: "button", class: "fbtn", "aria-pressed": String(!!e.found[f.id]) }, (e.found[f.id] ? "✅ " : "⬜ ") + f.t, li);
      b.addEventListener("click", function () {
        e.found[f.id] = !e.found[f.id]; save(); A.pop();
        b.setAttribute("aria-pressed", String(e.found[f.id])); b.innerHTML = rb((e.found[f.id] ? "✅ " : "⬜ ") + f.t);
      });
    });

    var mt = h("div", { class: "qcard matome" }, null, body);
    h("p", { class: "qlead" }, "💡 わかった こと", mt);
    d.matome.forEach(function (m) { h("p", { class: "mline" }, m, mt); });
    if (d.more) h("p", { class: "more" }, "🔭 もっと しりたい ひとへ: " + d.more, mt);

    var row = h("div", { class: "row center" }, null, body);
    var stampB = h("button", { type: "button", class: "btn big stampbtn" }, e.done ? "💮 はんこ おしたよ" : "💮 ノートに はんこを おす", row);
    stampB.addEventListener("click", function () {
      if (!e.done) { e.done = true; save(); A.stamp(); toast("💮 " + d.title + " かんりょう！"); }
      stampB.innerHTML = rb("💮 はんこ おしたよ");
    });
    var i = exps.indexOf(d);
    if (i < exps.length - 1) {
      var nx = h("button", { type: "button", class: "btn big sub" }, "つぎの じっけん ▶", row);
      nx.addEventListener("click", function () { openExp(exps[i + 1].id); });
    }
  }

  // ---------- ノート ----------
  function renderNote() {
    teardown(); cur = null; show("note");
    var box = $("noteList"); box.innerHTML = "";
    var total = 0, got = 0;
    exps.forEach(function (d, i) {
      var e = es(d.id), card = h("div", { class: "ncard" + (e.done ? " done" : ""), style: "--c:" + d.color }, null, box);
      var hd = h("button", { type: "button", class: "nhead" }, (i + 1) + ". " + d.emoji + " " + d.title + (e.done ? ' <span class="hanko">💮</span>' : ""), card);
      hd.addEventListener("click", function () { openExp(d.id, 3); });
      if (e.pick != null && d.yosou.choices[e.pick]) {
        h("p", { class: "npick" }, "よそう: " + d.yosou.choices[e.pick].t + (d.yosou.choices[e.pick].ok ? " ⭕" : " → 🔍"), card);
      }
      var ul = h("ul", { class: "flist" }, null, card);
      d.findings.forEach(function (f) { total++; if (e.found[f.id]) got++; h("li", { class: e.found[f.id] ? "got" : "" }, (e.found[f.id] ? "✅ " : "⬜ ") + f.t, ul); });
    });
    $("noteSum").innerHTML = rb("みつけた こと <b>" + got + "</b> / " + total);
  }

  // ---------- せってい（おうちの ひと むけ）----------
  function openSettings() {
    $("micOk").checked = st.mic;
    $("settings").hidden = false;
  }
  function closeSettings() {
    $("settings").hidden = true;
    if (cur && step === 2) goStep(2); // マイクの せってい を はんえい
  }

  var toastT = 0;
  function toast(html) {
    var t = $("toast"); t.innerHTML = rb(html); t.hidden = false; t.classList.remove("in"); void t.offsetWidth; t.classList.add("in");
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2600);
  }

  // ---------- おと の オン/オフ と 音量 ----------
  function syncSound() {
    A.on = st.sound; A.volume = st.vol;
    var b = $("soundBtn"); b.textContent = st.sound ? "🔊" : "🔇"; b.setAttribute("aria-pressed", String(st.sound));
    $("vol").value = Math.round(st.vol * 100); $("vol").disabled = !st.sound;
  }

  function init() {
    syncSound();
    $("soundBtn").addEventListener("click", function () { st.sound = !st.sound; save(); syncSound(); if (st.sound) A.pop(); });
    $("vol").addEventListener("input", function () { st.vol = +$("vol").value / 100; A.volume = st.vol; });
    $("vol").addEventListener("change", function () { save(); A.pop(); });
    $("noteBtn").addEventListener("click", renderNote);
    $("setBtn").addEventListener("click", openSettings);
    $("homeBtn").addEventListener("click", renderHome);
    $("noteBack").addEventListener("click", renderHome);
    $("expBack").addEventListener("click", renderHome);
    Array.prototype.forEach.call(doc.querySelectorAll(".step"), function (b) {
      b.addEventListener("click", function () { goStep(+b.dataset.step); });
    });
    $("setClose").addEventListener("click", closeSettings);
    $("settings").addEventListener("click", function (ev) { if (ev.target === $("settings")) closeSettings(); });
    $("micOk").addEventListener("change", function () { st.mic = $("micOk").checked; save(); });
    $("resetBtn").addEventListener("click", function () {
      if (!root.confirm("じっけん ノートを ぜんぶ けしますか？")) return;
      st.exp = {}; save(); $("settings").hidden = true; renderHome();
    });
    doc.addEventListener("pointerdown", function () { if (st.sound) A.unlock(); }, { passive: true });
    doc.addEventListener("visibilitychange", function () { if (doc.hidden) { if (cur && step === 2) goStep(2); A.stopAll(); } });
    renderHome();
  }

  root.OtoLab = { add: function (d) { exps.push(d); }, rb: rb, get exps() { return exps; } };
  doc.addEventListener("DOMContentLoaded", init);
})(this);
