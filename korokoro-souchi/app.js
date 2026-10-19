/* ============================================================
   ころころ そうち — がめん と そうさ
   ============================================================ */
(function () {
  "use strict";
  var K = window.KoroParts, P = window.KoroPhysics, STAGES = window.KoroStages.STAGES, COURSES = window.KoroStages.COURSES, SND = window.KoroSound;
  var W = K.W, H = K.H, FLOOR = K.FLOOR;
  var KEY = "korokoro-souchi-v1";

  /* ---------- ほぞん ---------- */
  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { d = null; }
    d = d && typeof d === "object" ? d : {};
    if (!d.cleared || typeof d.cleared !== "object") d.cleared = {};
    if (!Array.isArray(d.slots)) d.slots = [];
    while (d.slots.length < 5) d.slots.push(null);
    if (d.sound === undefined) d.sound = true;
    if (typeof d.goal !== "string") d.goal = "chiin";
    return d;
  }
  var store = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ほぞん できなくても あそべる */ }
  }

  /* ---------- じょうたい ---------- */
  var mode = null;          // "stage" | "free"
  var stageIdx = 0;
  var layout = [];          // いまの ぶひん（f:1 は うごかせない）
  var inv = null;           // つかえる かず（じゆう モードは null = むせいげん）
  var groups = [];          // へんしゅう ちゅうの からだ（えを かく よう）
  var sim = null;           // うごかして いる せかい
  var acc = 0, ringAt = null, clearShown = false;
  var tool = null, sel = -1, drag = null, hint = null, flash = null;
  var squash = {}, confetti = [];
  var placedMemo = {};      // ステージごとに おいた ぶひんを おぼえておく（このかいだけ）
  var clearArm = 0;

  var $ = function (id) { return document.getElementById(id); };
  var cv = $("cv"), ctx = cv.getContext("2d");
  var view = { s: 1, ox: 0, oy: 0, w: 0, h: 0, dpr: 1 };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function snap(v) { return Math.round(v / 5) * 5; }
  function norm(a) { a = ((a + 180) % 360 + 360) % 360 - 180; return a === -180 ? 180 : a; }

  /* ---------- トースト ---------- */
  var toastTimer = 0;
  function toast(msg, ms) {
    var t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, ms || 1800);
  }

  /* ---------- おと ---------- */
  function syncSound() {
    $("soundBtn").textContent = store.sound ? "🔊" : "🔇";
    $("soundBtn").setAttribute("aria-pressed", store.sound ? "true" : "false");
    SND.set(store.sound);
  }
  $("soundBtn").addEventListener("click", function () {
    store.sound = !store.sound; save(); syncSound(); if (store.sound) SND.click();
  });

  /* ============================================================
     ホーム
     ============================================================ */
  // コース: やさしい（31〜50）・コース1（1〜15）・コース2（16〜30）。それぞれの 1ばんめは さいしょから あそべる
  function courseOf(i) {
    for (var k = 0; k < COURSES.length; k++) if (i >= COURSES[k].from && i < COURSES[k].to) return COURSES[k];
    return COURSES[0];
  }
  function unlocked(i) {
    var c = courseOf(i);
    return i === c.from || !!store.cleared[i] || !!store.cleared[i - 1];
  }
  function nextInCourse(i) { return i + 1 < courseOf(i).to ? i + 1 : -1; }

  function renderHome() {
    var g = $("stageGrid"); g.innerHTML = "";
    COURSES.forEach(function (c) {
      var n = c.to - c.from, done = 0;
      for (var j = c.from; j < c.to; j++) if (store.cleared[j]) done++;
      var h = document.createElement("h3"); h.className = "grid-sec" + (c.id === "easy" ? " easy" : "");
      h.textContent = c.name + "　" + done + " / " + n;
      g.appendChild(h);
      for (var i = c.from; i < c.to; i++) (function (i) {
        var st = STAGES[i], k = i - c.from;
        var b = document.createElement("button");
        b.className = "stage-btn" + (c.id === "easy" ? " easy" : "") + (store.cleared[i] ? " done" : "") + (unlocked(i) ? "" : " lock");
        b.setAttribute("data-i", i);
        var lv = c.id === "easy" ? "♪" : c.id === "c4" ? "🔥🔥🔥".slice(0, 2 * (Math.floor(k / 10) + 1)) : c.id === "c5" ? "👑" : "★★★★".slice(0, Math.min(4, Math.floor(k / 5) + 1));
        b.innerHTML = '<span class="lv">' + lv + '</span><span class="n">' + (k + 1) + '</span><span class="nm">' + st.name + "</span>";
        b.setAttribute("aria-label", c.name + " " + (k + 1) + " " + st.name + (store.cleared[i] ? " クリアずみ" : ""));
        b.addEventListener("click", function () {
          SND.unlock();
          if (!unlocked(i)) { toast("まえの ステージを クリアすると ひらくよ"); SND.ng(); return; }
          SND.click(); openStage(i);
        });
        g.appendChild(b);
      })(i);
    });
  }

  function showHome() {
    stop();
    rememberStage();
    mode = null;
    $("home").hidden = false; $("play").hidden = true; $("backBtn").hidden = true;
    $("titleText").textContent = "ころころ そうち";
    renderHome();
  }
  $("backBtn").addEventListener("click", function () { SND.click(); showHome(); });
  $("freeBtn").addEventListener("click", function () { SND.unlock(); SND.click(); openFree(); });

  /* ============================================================
     あそぶ がめん
     ============================================================ */
  function showPlay(title) {
    $("home").hidden = true; $("play").hidden = false; $("backBtn").hidden = false;
    $("titleText").textContent = title;
    tool = null; sel = -1; drag = null; hint = null; confetti = [];
    rebuild(); renderToolbox(); updateButtons(); resize();
  }

  function rememberStage() {
    if (mode === "stage") placedMemo[stageIdx] = layout.filter(function (p) { return !p.f; });
  }

  function openStage(i) {
    rememberStage();
    stop();
    mode = "stage"; stageIdx = i;
    var st = STAGES[i];
    inv = st.inv;
    layout = clone(st.fixed).concat(clone(placedMemo[i] || []));
    var c = courseOf(i);
    var short = { easy: "やさしい ", c1: "コース1 ", c2: "コース2 ", c3: "コース3 ", c4: "コース4 ", c5: "コース5 " }[c.id] || "";
    $("stageNo").textContent = short + (i - c.from + 1) + " / " + (c.to - c.from);
    $("hintText").textContent = st.hint;
    $("hintBtn").hidden = false; $("slotBtn").hidden = true;
    showPlay(st.name);
  }

  var FREE_START = [
    { t: "board_l", x: 300, y: 300, a: 15 }, { t: "steel", x: 140, y: 205, a: 0 }, { t: "bell", x: 1050, y: 730, a: 0 }
  ];
  function openFree() {
    stop();
    mode = "free"; inv = null;
    layout = Array.isArray(store.free) ? clone(store.free) : clone(FREE_START);
    $("stageNo").textContent = "じゆう";
    $("hintText").textContent = "すきな ように つくろう！ ベルを ならせるかな？";
    $("hintBtn").hidden = true; $("slotBtn").hidden = false;
    showPlay("じゆう モード");
  }

  function changed() {
    rebuild(); renderToolbox(); updateButtons();
    if (mode === "free") { store.free = layout; save(); }
  }
  function rebuild() { groups = layout.map(function (p, i) { return K.build(p, i); }); }

  function remaining(t) {
    if (!inv) return Infinity;
    var n = inv[t] || 0;
    layout.forEach(function (p) { if (!p.f && p.t === t) n--; });
    return n;
  }

  /* ---------- どうぐばこ ---------- */
  function renderToolbox() {
    var box = $("toolbox"); box.innerHTML = "";
    var types = inv ? K.ORDER.filter(function (t) { return inv[t]; }) : K.ORDER;
    var dpr = Math.min(3, window.devicePixelRatio || 1);
    types.forEach(function (t) {
      var info = K.TYPES[t], rem = remaining(t);
      var b = document.createElement("button");
      b.className = "tool" + (tool === t ? " sel" : "") + (rem <= 0 ? " empty" : "");
      b.setAttribute("aria-label", info.name + (info.sub ? "（" + info.sub + "）" : "") + (inv ? " のこり " + rem : ""));
      var c = document.createElement("canvas"); c.width = 48 * dpr; c.height = 48 * dpr;
      var cx = c.getContext("2d"); K.icon(cx, t, 48 * dpr);
      b.appendChild(c);
      var nm = document.createElement("span"); nm.className = "nm";
      nm.innerHTML = info.name + (info.sub ? "<small>" + info.sub + "</small>" : "");
      b.appendChild(nm);
      var cnt = document.createElement("span"); cnt.className = "cnt"; cnt.textContent = inv ? rem : "∞";
      b.appendChild(cnt);
      b.addEventListener("pointerdown", function (e) { toolDown(e, t, b); });
      box.appendChild(b);
    });
  }

  function updateButtons() {
    var running = !!sim;
    var go = $("goBtn");
    go.classList.toggle("stop", running);
    go.innerHTML = running ? '<span class="ic">⏹</span><span>もどす</span>' : '<span class="ic">▶</span><span>スタート</span>';
    go.setAttribute("aria-label", running ? "とめて もとに もどす" : "スタート");
    var p = sel >= 0 ? layout[sel] : null;
    $("rotBtn").disabled = running || !p || K.TYPES[p.t].rot === "none";
    $("trashBtn").disabled = running;
    $("clearBtn").disabled = running || !layout.some(function (q) { return !q.f; });
    $("toolbox").style.opacity = running ? ".45" : "";
    $("toolbox").style.pointerEvents = running ? "none" : "";
  }

  /* ---------- がめんの おおきさ ---------- */
  function resize() {
    var box = $("stageBox"), r = box.getBoundingClientRect();
    var dpr = Math.min(2.5, window.devicePixelRatio || 1);
    view.dpr = dpr; view.w = r.width; view.h = r.height;
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    var pad = 6;
    view.s = Math.min((r.width - pad * 2) / W, (r.height - pad * 2) / H);
    view.ox = (r.width - W * view.s) / 2; view.oy = (r.height - H * view.s) / 2;
  }
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe($("stageBox"));

  function toWorld(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s };
  }
  function inCanvas(e) {
    var r = cv.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }
  function overTrash(e) {
    var r = $("trashBtn").getBoundingClientRect();
    return e.clientX >= r.left - 8 && e.clientX <= r.right + 8 && e.clientY >= r.top - 8 && e.clientY <= r.bottom + 8;
  }

  /* ---------- おく・うごかす・まわす・けす ---------- */
  // いまの ステージの「ボールを おく わく」（じゆう モードは なし）
  var flashZone = 0;
  function zones() { return mode === "stage" ? (STAGES[stageIdx].ballZones || null) : null; }
  function zoneMsg(p) {
    if (!K.inBallZone(zones(), p)) { toast("ボールは みどりの わくの なかに おいてね"); flashZone = performance.now(); return true; }
    if (mode === "stage" && (p.t === "steel" || p.t === "rubber" || p.t === "domino" || p.t === "seesaw") && K.touchesBell(layout, p, layout.indexOf(p))) {
      toast("ベルに くっつけては おけないよ"); return true;
    }
    if (mode === "stage" && p.t === "domino" && !K.standsStill(layout, p, layout.indexOf(p))) { toast("ドミノは たなや ゆかの うえに たててね"); return true; }
    return false;
  }

  function newPart(t, x, y) {
    var p = { t: t, x: snap(x), y: snap(y), a: 0 };
    if (t === "bucket") K.bucketDefaults(p);
    return p;
  }

  function tryPlace(t, x, y) {
    if (remaining(t) <= 0) { toast("もう ないよ"); SND.ng(); return false; }
    var p = K.seatDomino(layout, newPart(t, x, y), -1);
    if (!K.inBallZone(zones(), p)) { toast("ボールは みどりの わくの なかに おいてね"); SND.ng(); flashZone = performance.now(); return false; }
    if (!K.canPlace(layout, p, -1, zones(), mode === "stage")) { if (!zoneMsg(p)) toast("ここには おけないよ"); SND.ng(); return false; }
    layout.push(p); sel = layout.length - 1;
    if (remaining(t) <= 0) tool = null;
    SND.pop(); changed();
    return true;
  }

  function rotatePart(i, dir) {
    var p = layout[i], before = clone(p), r = K.TYPES[p.t].rot;
    if (r === "none") { toast("これは まわらないよ"); return; }
    if (r === "step") p.a = norm((p.a || 0) + 15 * dir);
    else if (r === "seesaw") { var seq = [-15, 0, 15], k = seq.indexOf(p.a || 0); p.a = seq[((k < 0 ? 1 : k) + dir + 3) % 3]; }
    else if (r === "flip") { K.bucketDefaults(p); p.gx = -p.gx; }
    if (!K.canPlace(layout, p, i, zones(), mode === "stage")) {
      layout[i] = before; toast("ぶつかるので まわせないよ"); SND.ng();
    } else SND.click();
    changed();
  }

  function removePart(i) {
    layout.splice(i, 1); sel = -1; SND.trash(); changed();
  }

  cv.addEventListener("pointerdown", function (e) {
    SND.unlock();
    if (sim) { toast("⏹ で とめてから うごかしてね"); return; }
    var w = toWorld(e);
    var tol = Math.min(40, 12 / view.s);
    var i = K.pick(layout, w.x, w.y, tol);
    if (i >= 0) {
      if (layout[i].f) {
        if (tool) { tryPlace(tool, w.x, w.y); return; }
        toast("グレーの ぶひんは うごかせないよ"); SND.ng();
        flash = { i: i, t: performance.now() };
        if (tool) tryPlace(tool, w.x, w.y);
        return;
      }
      drag = { kind: "move", i: i, sx: e.clientX, sy: e.clientY, ox: layout[i].x, oy: layout[i].y, wx: w.x, wy: w.y, moved: false, valid: true };
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* なくても よい */ }
      sel = i; updateButtons();
      return;
    }
    if (tool) { tryPlace(tool, w.x, w.y); return; }
    sel = -1; updateButtons();
    if (inv) toast("したの どうぐばこ から ぶひんを えらんでね");
  });

  cv.addEventListener("pointermove", function (e) {
    if (!drag || drag.kind !== "move") return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 8) return;
    drag.moved = true;
    var w = toWorld(e), p = layout[drag.i];
    p.x = snap(drag.ox + w.x - drag.wx); p.y = snap(drag.oy + w.y - drag.wy);
    if (p.t === "domino") p.y = K.seatDomino(layout, p, drag.i).y;
    drag.trash = overTrash(e);
    drag.valid = !drag.trash && K.canPlace(layout, p, drag.i, zones(), mode === "stage");
    $("trashBtn").classList.toggle("hot", drag.trash);
    rebuild();
  });

  function endMove(e) {
    if (!drag || drag.kind !== "move") return;
    var d = drag; drag = null;
    $("trashBtn").classList.remove("hot");
    if (!d.moved) { rotatePart(d.i, 1); return; }
    if (overTrash(e)) { removePart(d.i); return; }
    var p = layout[d.i];
    if (!d.valid) { var zp = { t: p.t, x: p.x, y: p.y, a: p.a }; p.x = d.ox; p.y = d.oy; if (!zoneMsg(zp)) toast("ここには おけないよ"); SND.ng(); }
    else SND.click();
    changed();
  }
  cv.addEventListener("pointerup", endMove);
  cv.addEventListener("pointercancel", function () {
    if (drag && drag.kind === "move") { var p = layout[drag.i]; p.x = drag.ox; p.y = drag.oy; drag = null; changed(); }
  });

  // どうぐばこ から: タップで えらぶ / ひっぱって おく
  function toolDown(e, t, el) {
    SND.unlock();
    if (sim) return;
    e.preventDefault();
    drag = { kind: "new", t: t, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, valid: false };
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* なくても よい */ }
    var move = function (ev) {
      if (!drag || drag.kind !== "new") return;
      if (!drag.moved && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) < 10) return;
      drag.moved = true;
      if (inCanvas(ev)) {
        var w = toWorld(ev);
        drag.ghost = K.seatDomino(layout, newPart(t, w.x, w.y), -1);
        drag.valid = remaining(t) > 0 && K.canPlace(layout, drag.ghost, -1, zones(), mode === "stage");
      } else drag.ghost = null;
    };
    var up = function (ev) {
      el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
      var d = drag; drag = null;
      if (!d || d.kind !== "new") return;
      if (!d.moved) {
        if (remaining(t) <= 0) { toast("もう ないよ"); SND.ng(); return; }
        tool = tool === t ? null : t; sel = -1; SND.click();
        if (tool) toast("ステージを タップして おこう");
        renderToolbox(); updateButtons();
        return;
      }
      if (d.ghost && ev.type === "pointerup") {
        if (remaining(t) <= 0) { toast("もう ないよ"); SND.ng(); }
        else if (!d.valid) { if (!zoneMsg(d.ghost)) toast("ここには おけないよ"); SND.ng(); }
        else { layout.push(d.ghost); sel = layout.length - 1; SND.pop(); changed(); }
      }
    };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  }

  $("rotBtn").addEventListener("click", function () { if (sel >= 0 && !sim) rotatePart(sel, -1); });
  $("trashBtn").addEventListener("click", function () {
    if (sim) return;
    if (sel >= 0 && !layout[sel].f) removePart(sel);
    else toast("ぶひんを ここへ ひっぱると けせるよ");
  });
  $("clearBtn").addEventListener("click", function () {
    if (sim) return;
    var now = Date.now();
    if (now - clearArm > 2500) { clearArm = now; toast("もういちど おすと、おいた ぶひんを ぜんぶ けすよ", 2500); return; }
    clearArm = 0;
    layout = layout.filter(function (p) { return p.f; }); sel = -1; tool = null; SND.trash(); changed();
  });

  /* ---------- ヒント ---------- */
  $("hintBtn").addEventListener("click", function () {
    if (mode !== "stage") return;
    SND.click();
    var st = STAGES[stageIdx], used = {};
    var miss = null;
    for (var i = 0; i < st.sol.length; i++) {
      var s = st.sol[i], ok = false;
      for (var j = 0; j < layout.length; j++) {
        var p = layout[j];
        if (p.f || used[j] || p.t !== s.t) continue;
        if (Math.hypot(p.x - s.x, p.y - s.y) < 30 && Math.abs(norm((p.a || 0) - (s.a || 0))) < 1) { used[j] = 1; ok = true; break; }
      }
      if (!ok) { miss = s; break; }
    }
    if (!miss) { toast("ばっちり！ ▶ スタート を おしてみよう"); return; }
    hint = { p: clone(miss), t: performance.now() };
    toast(st.hint, 2600);
  });

  /* ---------- スタート / ストップ ---------- */
  $("goBtn").addEventListener("click", function () {
    SND.unlock();
    if (sim) { stop(); SND.click(); return; }
    if (drag) return;
    sim = K.buildWorld(clone(layout));
    acc = 0; ringAt = null; clearShown = false; bellFx = null; squash = {}; confetti = []; tool = null; hint = null;
    SND.click(); renderToolbox(); updateButtons();
  });

  function stop() {
    if (!sim) return;
    sim = null; ringAt = null; confetti = []; squash = {};
    SND.roll(0);
    $("clearBox").hidden = true;
    updateButtons();
  }

  function material(b) { return b.tag === "steel" ? "steel" : b.tag === "rubber" ? "rubber" : "wood"; }
  function stepSim(dt) {
    acc += Math.min(dt, 0.1);
    var n = 0, w = sim.world;
    while (acc >= P.DT && n < 16) {
      w.step(); acc -= P.DT; n++;
      for (var i = 0; i < w.events.length; i++) {
        var ev = w.events[i];
        if (ev.a.tag === "bell" || ev.b.tag === "bell") continue;
        if (ev.spring) {
          SND.boyon();
          var sp = ev.a.tag === "spring" ? ev.a : ev.b; squash[sp.part] = w.time;
        } else if (ev.speed > 140) {
          var m = ev.a.tag === "steel" || ev.b.tag === "steel" ? "steel"
            : (ev.a.tag === "rubber" || ev.b.tag === "rubber") && ev.a.tag !== "domino" && ev.b.tag !== "domino" ? "rubber" : material(ev.a.tag === "domino" ? ev.a : ev.b);
          SND.katan(m, ev.speed / 900);
        }
      }
      if (w.bell && ringAt === null) { ringAt = w.time; onBell(); }
    }
    if (n === 16) acc = 0;
    // ころころ: ころがって いる ボールの はやさで おおきさを かえる
    var lv = 0;
    w.bodies.forEach(function (b) {
      if (b.shape === "c" && b.mode === P.DYNAMIC && b.alive && !b.sleep && b.touched) lv += Math.hypot(b.vx, b.vy);
    });
    SND.roll(Math.min(1, lv / 900));
  }

  var bellFx = null;   // ベルが なったときに でる えもじ
  function onBell() {
    var g = SND.goal();
    bellFx = { e: g.e, name: g.name, t: performance.now() };
    $("clearIcon").textContent = g.e;
    var bells = [];
    layout.forEach(function (p) { if (p.t === "bell") bells.push(p); });
    bells.forEach(function (p) { burstConfetti(p.x, p.y); });
    if (mode === "stage") {
      var first = !store.cleared[stageIdx];
      store.cleared[stageIdx] = true; save();
      setTimeout(function () {
        if (!sim || clearShown) return;
        clearShown = true; SND.fanfare();
        var used = layout.filter(function (p) { return !p.f; }).length;
        $("clearMsg").textContent = "「" + STAGES[stageIdx].name + "」 ぶひん " + used + "こ で クリア！" + (first && nextInCourse(stageIdx) >= 0 ? " つぎの ステージが ひらいたよ" : "");
        $("nextBtn").textContent = nextInCourse(stageIdx) >= 0 ? "つぎへ ›" : "メニューへ";
        $("clearBox").hidden = false;
      }, 1500);
    } else {
      toast(g.name + "！ やったね！");
    }
  }
  $("againBtn").addEventListener("click", function () { SND.click(); stop(); });
  $("nextBtn").addEventListener("click", function () {
    SND.click(); stop();
    var nx = nextInCourse(stageIdx);
    if (nx >= 0) openStage(nx); else showHome();
  });

  /* ---------- かみふぶき ---------- */
  var CONF = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#da77f2", "#ff922b"];
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }   // みための ためだけ
  function burstConfetti(x, y) {
    for (var i = 0; i < 90; i++) {
      var a = -Math.PI / 2 + (rnd() - 0.5) * 2.4, sp = 300 + rnd() * 700;
      confetti.push({ x: x, y: y - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rnd() * 6, vr: (rnd() - 0.5) * 14,
        c: CONF[i % CONF.length], w: 8 + rnd() * 8, h: 5 + rnd() * 6, life: 3 + rnd() * 1.5 });
    }
  }
  function updateConfetti(dt) {
    for (var i = confetti.length - 1; i >= 0; i--) {
      var c = confetti[i];
      c.vy += 900 * dt; c.vx *= 1 - 1.5 * dt; c.vy *= 1 - 1.2 * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt; c.life -= dt;
      if (c.life <= 0 || c.y > H + 50) confetti.splice(i, 1);
    }
  }

  /* ============================================================
     え を かく
     ============================================================ */
  function drawBackground(t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#eef6ff"); g.addColorStop(1, "#fbf8ff");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(95,61,196,.07)"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var x = 50; x < W; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, FLOOR); }
    for (var y = 50; y < FLOOR; y += 50) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    ctx.fillStyle = "#b08968"; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = "#8ce99a"; ctx.fillRect(0, FLOOR, W, 7);
    ctx.fillStyle = "rgba(0,0,0,.08)";
    for (var k = 0; k < W; k += 40) ctx.fillRect(k + 10, FLOOR + 14, 18, 4);
    ctx.strokeStyle = "#6741d9"; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4);
  }

  function drawLayout(gs, running, now) {
    var di = 0, wt = sim ? sim.world.time : 0;
    for (var i = 0; i < layout.length; i++) {
      var p = layout[i];
      var o = { time: running ? wt : now / 1000, running: running, idx: p.t === "domino" ? di++ : 0 };
      if (p.t === "bell" && ringAt !== null) o.ring = wt - ringAt + 0.001;
      if (p.t === "spring" && squash[i] != null) o.squash = Math.max(0, 1 - (wt - squash[i]) * 5);
      if (flash && flash.i === i && now - flash.t < 500) {
        ctx.save(); ctx.translate(Math.sin((now - flash.t) / 25) * 4, 0);
        K.draw(ctx, p, gs[i], o); ctx.restore();
      } else K.draw(ctx, p, gs[i], o);
      if (!running && p.t === "bell") {
        ctx.fillStyle = "#e67700"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("ゴール", p.x, p.y - 52);
      }
      if (running && p.t === "bell" && bellFx) {
        // なった おとの えもじが ぴょこっと でる
        var age = (now - bellFx.t) / 1000;
        if (age < 2.2) {
          var up = Math.min(1, age * 4), sc = 1 + 0.25 * Math.sin(Math.min(age, 0.6) * Math.PI / 0.6);
          ctx.save(); ctx.globalAlpha = Math.min(1, (2.2 - age) * 2);
          ctx.translate(p.x, p.y - 70 - 50 * up); ctx.scale(sc, sc);
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.font = "64px sans-serif"; ctx.fillStyle = "#000"; ctx.fillText(bellFx.e, 0, 0);
          ctx.font = "bold 30px sans-serif"; ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.fillStyle = "#e8590c";
          ctx.strokeText(bellFx.name, 0, 52); ctx.fillText(bellFx.name, 0, 52);
          ctx.restore();
        }
      }
    }
  }

  function outline(p, color, dash) {
    var r = K.partBox(p), m = 8;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash(dash || []);
    ctx.strokeRect(r[0] - m, r[1] - m, r[2] - r[0] + m * 2, r[3] - r[1] + m * 2);
    ctx.restore();
  }

  var lastT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0; lastT = now;
    if ($("play").hidden) return;
    if (sim) stepSim(dt);
    updateConfetti(dt);

    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = "#e4ddfb"; ctx.fillRect(0, 0, view.w, view.h);
    ctx.translate(view.ox, view.oy); ctx.scale(view.s, view.s);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    drawBackground(now);
    drawLayout(sim ? sim.groups : groups, !!sim, now);

    if (!sim) {
      if (sel >= 0 && layout[sel]) {
        var bad = drag && drag.kind === "move" && drag.moved && !drag.valid;
        outline(layout[sel], bad ? "#e03131" : "#7048e8", bad ? [] : [10, 8]);
      }
      if (drag && drag.kind === "new" && drag.ghost) {
        ctx.save(); ctx.globalAlpha = 0.7;
        K.draw(ctx, drag.ghost, K.build(drag.ghost, -1), { idx: 0 });
        ctx.restore();
        outline(drag.ghost, drag.valid ? "#7048e8" : "#e03131", drag.valid ? [10, 8] : []);
      }
      var zs = zones();
      if (zs) {
        // ボールを おく わく。ボールを もっている ときと、わくの そとに おこうと した ときは こく
        var holding = tool === "steel" || tool === "rubber" || (drag && ((drag.kind === "new" && (drag.t === "steel" || drag.t === "rubber")) ||
          (drag.kind === "move" && layout[drag.i] && (layout[drag.i].t === "steel" || layout[drag.i].t === "rubber"))));
        var fl = now - flashZone < 900;
        zs.forEach(function (z) {
          var left = zs.length && remaining(z.t) > 0;
          if (!left && !holding && !fl) return;
          ctx.save();
          ctx.fillStyle = fl ? "rgba(47,158,68,.28)" : holding ? "rgba(47,158,68,.16)" : "rgba(47,158,68,.08)";
          ctx.fillRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0);
          ctx.strokeStyle = "#2f9e44"; ctx.lineWidth = fl ? 5 : 3; ctx.setLineDash([10, 7]);
          ctx.strokeRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0);
          ctx.setLineDash([]); ctx.fillStyle = "#2b8a3e"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center";
          ctx.fillText((z.t === "steel" ? "てつだま" : "ゴムだま") + "は ここ", (z.x0 + z.x1) / 2, z.y0 > 30 ? z.y0 - 8 : z.y1 + 22);
          ctx.restore();
        });
      }
      if (hint) {
        var age = (now - hint.t) / 1000;
        if (age > 6) hint = null;
        else {
          ctx.save(); ctx.globalAlpha = 0.25 + 0.25 * Math.abs(Math.sin(age * 3));
          K.draw(ctx, hint.p, K.build(hint.p, -1), { idx: 0 });
          ctx.restore();
          outline(hint.p, "#f59f00", [6, 6]);
        }
      }
    }
    for (var i = 0; i < confetti.length; i++) {
      var c = confetti[i];
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.globalAlpha = Math.min(1, c.life);
      ctx.fillStyle = c.c; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * Math.abs(Math.cos(c.r * 1.3)) + 1);
      ctx.restore();
    }
    ctx.restore();
  }
  requestAnimationFrame(frame);

  /* ============================================================
     じゆう モード の ほぞん スロット
     ============================================================ */
  function thumb(c, lay) {
    var x = c.getContext("2d"), s = c.width / W;
    x.setTransform(s, 0, 0, s, 0, 0);
    x.fillStyle = "#f4f1ff"; x.fillRect(0, 0, W, H);
    x.fillStyle = "#b08968"; x.fillRect(0, FLOOR, W, H - FLOOR);
    var di = 0;
    lay.forEach(function (p, i) {
      try { K.draw(x, p, K.build(clone(p), i), { idx: p.t === "domino" ? di++ : 0 }); } catch (e) { /* こわれた データは とばす */ }
    });
  }
  function renderSlots() {
    var box = $("slots"); box.innerHTML = "";
    store.slots.forEach(function (lay, i) {
      var row = document.createElement("div"); row.className = "slot";
      var c = document.createElement("canvas"); c.width = 240; c.height = 160;
      if (lay) thumb(c, lay);
      row.appendChild(c);
      var meta = document.createElement("div"); meta.className = "meta";
      meta.innerHTML = "<b>スロット " + (i + 1) + "</b><br>" + (lay ? "ぶひん " + lay.length + "こ" : "からっぽ");
      row.appendChild(meta);
      var btns = document.createElement("div"); btns.className = "btns";
      var sv = document.createElement("button"); sv.className = "pill primary"; sv.textContent = "ほぞん";
      sv.addEventListener("click", function () {
        store.slots[i] = clone(layout); save(); SND.pop(); renderSlots(); toast("スロット " + (i + 1) + " に ほぞん したよ");
      });
      var ld = document.createElement("button"); ld.className = "pill"; ld.textContent = "よみこむ"; ld.disabled = !lay;
      ld.addEventListener("click", function () {
        if (!store.slots[i]) return;
        layout = clone(store.slots[i]).filter(function (p) { return p && K.TYPES[p.t]; });
        sel = -1; SND.pop(); changed(); $("slotBox").hidden = true; toast("スロット " + (i + 1) + " を よみこんだよ");
      });
      btns.appendChild(sv); btns.appendChild(ld); row.appendChild(btns);
      box.appendChild(row);
    });
  }
  $("slotBtn").addEventListener("click", function () { SND.click(); stop(); renderSlots(); $("slotBox").hidden = false; });
  $("slotClose").addEventListener("click", function () { SND.click(); $("slotBox").hidden = true; });

  /* ---------- テスト よう の まど ---------- */
  window.KoroApp = {
    openStage: openStage, openFree: openFree, showHome: showHome,
    getLayout: function () { return layout; },
    placeSolution: function () { if (mode === "stage") { layout = clone(STAGES[stageIdx].fixed).concat(clone(STAGES[stageIdx].sol)); changed(); } },
    start: function () { if (!sim) $("goBtn").click(); },
    running: function () { return !!sim; },
    bell: function () { return ringAt !== null; },
    store: function () { return store; }
  };

  /* ---------- ゴールの おと を えらぶ ---------- */
  function renderGoals() {
    var box = $("goalList"); box.innerHTML = "";
    SND.GOALS.forEach(function (g) {
      var b = document.createElement("button");
      b.className = "goal-opt" + (store.goal === g.id ? " sel" : "");
      b.setAttribute("aria-pressed", store.goal === g.id ? "true" : "false");
      b.innerHTML = '<span class="ge">' + g.e + '</span><span class="gn">' + g.name + "</span>";
      b.addEventListener("click", function () {
        store.goal = g.id; save(); SND.setGoal(g.id);
        if (!store.sound) toast("おとが オフに なっているよ 🔇");
        SND.goal(g.id === "random" ? null : g.id);
        renderGoals(); syncGoalBtn();
      });
      box.appendChild(b);
    });
  }
  function syncGoalBtn() {
    var g = SND.GOALS.filter(function (x) { return x.id === store.goal; })[0] || SND.GOALS[0];
    $("goalBtn").textContent = g.e;
    $("goalBtn").setAttribute("aria-label", "ゴールの おと: " + g.name);
  }
  $("goalBtn").addEventListener("click", function () { SND.unlock(); SND.click(); renderGoals(); $("goalBox").hidden = false; });
  $("goalClose").addEventListener("click", function () { SND.click(); $("goalBox").hidden = true; });

  SND.setGoal(store.goal);
  syncGoalBtn();
  syncSound();
  showHome();
})();
