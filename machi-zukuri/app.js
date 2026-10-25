/* ============================================================
   まちづくり — がめん と そうさ
   ・1ほん ゆび: おく／なぞる（みる の ときは うごかす・タップで せつめい）
   ・2ほん ゆび: ズーム と いどう（PC は ホイール・みぎ ドラッグ）
   ・ほぞん: localStorage に 3スロット（city.js の toJSON。ランレングス で ちぢめる）
   ============================================================ */
(function () {
  "use strict";

  var D = window.MACHI_DATA, C = window.MACHI_CITY, Sim = window.MACHI_SIM, Renderer = window.MACHI_RENDER, K = window.CHIZU_SYMBOLS;
  var O = D.OBJ_ID, T = Renderer.T;
  var KEY = "machi-zukuri-v1", SLOT_KEY = "machi-zukuri-slot-";
  var MULTI = { road: 1, rail: 1, river: 1, erase: 1, house: 1, tree: 1, field: 1, park: 1, mansion: 1, station: 1 };
  var HINTS = {
    look: "タップ で せつめい。ゆび で うごかす、2ほん ゆび で ズーム",
    road: "なぞって みち を ひこう",
    rail: "なぞって せんろ を ひこう。みち と まじわると ふみきり",
    station: "せんろ の うえ に えき を おこう",
    river: "なぞって かわ を ひこう。みち や せんろ を ひくと はし に なるよ",
    erase: "なぞった ところ を けす",
    house: "みち の となり に いえ を おこう（なぞると たくさん）"
  };

  function $(id) { return document.getElementById(id); }
  function rb(s) { return String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>"); }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function store(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  var settings = { slot: 1, sound: true };
  try { var st = JSON.parse(load(KEY) || "null"); if (st) { settings.slot = st.slot >= 1 && st.slot <= 3 ? st.slot : 1; settings.sound = st.sound !== false; } } catch (e) { /* こわれて いたら つかわない */ }
  function saveSettings() { store(KEY, JSON.stringify(settings)); }

  // ================= おと（WebAudio） =================
  var AC = null, master = null;
  function ac() {
    if (!settings.sound) return null;
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        master = AC.createGain(); master.gain.value = 0.5; master.connect(AC.destination);
      } catch (e) { AC = null; return null; }
    }
    if (AC.state === "suspended") AC.resume();
    return AC;
  }
  function tone(f0, f1, dur, type, vol, delay) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  var last = {};
  function throttle(k, ms) { var n = Date.now(); if (last[k] && n - last[k] < ms) return false; last[k] = n; return true; }
  var SND = {
    place: function () { tone(330, 170, 0.12, "triangle", 0.35); tone(900, 500, 0.05, "sine", 0.08); },
    road: function () { if (throttle("road", 60)) tone(620, 540, 0.05, "sine", 0.1); },
    erase: function () { if (throttle("erase", 80)) tone(500, 200, 0.12, "sine", 0.12); },
    ng: function () { if (throttle("ng", 200)) tone(220, 180, 0.15, "square", 0.05); },
    station: function () { tone(784, 0, 0.5, "sine", 0.1); tone(659, 0, 0.7, "sine", 0.1, 0.3); },
    crossing: function () { for (var k = 0; k < 4; k++) tone(760, 0, 0.12, "triangle", 0.06, k * 0.32); },
    siren: function () { for (var k = 0; k < 3; k++) { tone(660, 0, 0.32, "sine", 0.06, k * 0.7); tone(550, 0, 0.32, "sine", 0.06, k * 0.7 + 0.35); } },
    mail: function () { tone(1320, 0, 0.3, "sine", 0.08); },
    voice: function () { tone(520, 700, 0.09, "sine", 0.07); },
    tap: function () { tone(700, 0, 0.06, "sine", 0.08); }
  };
  function play(n) { if (settings.sound && SND[n]) SND[n](); }

  // ================= まち =================
  var city, sim, undo = [];
  var R = new Renderer($("bg"), $("fg"), function () { bgDirty = true; });
  var bgDirty = true, running = false, speed = 1, tool = "road", lightQ = -1;

  function readSlot(n) {
    var s = load(SLOT_KEY + n);
    if (!s) return null;
    try { return C.fromJSON(s); } catch (e) { return null; }
  }
  function saveNow() {
    if (!city) return;
    var hp = C.happiness(city);
    store(SLOT_KEY + settings.slot, C.toJSON(city, { t: Math.round(sim.time), at: Date.now(), m: hp.value, p: hp.pop }));
  }
  var saveTimer = 0;
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 600); }

  function useCity(c, time) {
    city = c;
    if (!sim) sim = new Sim(c, { banner: banner, event: onSimEvent });
    else sim.reset(c);
    if (time != null) sim.time = time;
    undo = [];
    R.fit(c); bgDirty = true; updateMood(); updateGrow();
  }
  function openSlot(n) {
    settings.slot = n; saveSettings();
    var s = readSlot(n);
    if (s) useCity(s.city, s.meta.t);
    else { useCity(n === 1 && !load(SLOT_KEY + "init") ? C.sample() : C.blank(), 7 * 60); store(SLOT_KEY + "init", "1"); saveNow(); }
  }

  function edited() { C.changed(city); bgDirty = true; updateMood(); saveSoon(); }

  // ================= UI =================
  function buildPalette() {
    var pal = $("palette");
    D.TOOLS.forEach(function (t) {
      var b = document.createElement("button");
      b.className = "tool"; b.dataset.tool = t.id;
      b.innerHTML = '<span class="e" aria-hidden="true">' + t.emoji + '</span><span class="n">' + t.name + "</span>";
      b.addEventListener("click", function () { setTool(t.id); play("tap"); });
      pal.appendChild(b);
    });
  }
  function setTool(id) {
    tool = id;
    Array.prototype.forEach.call(document.querySelectorAll(".tool"), function (b) { b.classList.toggle("sel", b.dataset.tool === id); });
    var t = D.TOOLS.filter(function (x) { return x.id === id; })[0];
    $("hint").textContent = HINTS[id] || (t.name + " を おこう。タップ で 1つ おける");
    $("fg").style.cursor = id === "look" ? "grab" : "crosshair";
  }

  var bannerTimer = 0;
  function banner(text, kind) {
    var el = $("banner");
    el.textContent = text; el.className = "banner " + (kind || "");
    el.hidden = false;
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { el.hidden = true; }, 5200);
  }
  function inView(cell) {
    var p = R.toScreen(cell % city.w + 0.5, (cell / city.w | 0) + 0.5);
    return p.x > -20 && p.y > -20 && p.x < R.W + 20 && p.y < R.H + 20;
  }
  function onSimEvent(kind, cell) {
    if (kind === "station" && inView(cell) && throttle("st", 2500)) play("station");
    else if (kind === "crossing" && inView(cell) && throttle("cr", 3500)) play("crossing");
    else if (kind === "siren" && throttle("si", 3000)) play("siren");
    else if (kind === "mail" && inView(cell)) play("mail");
    else if (kind === "voice" && inView(cell)) play("voice");
  }

  function face(v) { return v >= 70 ? "😊" : v >= 40 ? "🙂" : v > 0 ? "😟" : "😶"; }
  function updateMood() {
    var hp = C.happiness(city);
    $("moodBtn").firstChild.nodeValue = face(hp.houses.length ? hp.value : 0) + " ";
    $("moodVal").textContent = hp.houses.length ? hp.value : "-";
  }
  function updateGrow() { $("growBtn").disabled = city.w >= C.MAX && city.h >= C.MAX; }

  function clockText() {
    var p = sim.period(), m = Math.floor(sim.time) % 1440, h = Math.floor(m / 60), mm = m % 60;
    return p.icon + " " + p.name + " " + h + ":" + (mm < 10 ? "0" : "") + mm + (running ? "" : "（とまってる）");
  }

  function sheet(id, on) { $(id).hidden = !on; }
  Array.prototype.forEach.call(document.querySelectorAll(".sheet"), function (s) {
    s.addEventListener("click", function (e) { if (e.target === s || e.target.closest("[data-close]")) s.hidden = true; });
  });

  // ---------- せつめい ----------
  function infoFor(i) {
    var o = city.obj[i], def = o ? D.OBJ[o] : null, g;
    if (!def) {
      if (city.road[i] && city.rail[i]) g = D.GROUND_INFO.crossing;
      else if (city.road[i] && city.base[i]) g = D.GROUND_INFO.bridge;
      else if (city.rail[i] && city.base[i]) g = D.GROUND_INFO.rbridge;
      else if (city.road[i]) g = D.GROUND_INFO.road;
      else if (city.rail[i]) g = D.GROUND_INFO.rail;
      else if (city.base[i]) g = D.GROUND_INFO.river;
      else g = D.GROUND_INFO.grass;
      def = g;
    }
    var html = '<p class="q">なにを する ところ？</p><p class="a">' + rb(def.what) + "</p>";
    if (def.who) html += '<p class="q">' + (o === O.house || o === O.mansion ? "だれが いるの？" : o === O.tree ? "ほかにも" : "はたらく ひと") + '</p><p class="a">' + rb(def.who) + "</p>";
    if (o === O.house || o === O.mansion) {
      var m = C.houseMood(city, i), v = Math.round(m.score * 100);
      html += '<p class="q">すんでる ひと の きもち ' + face(v) + " " + v + '</p><div class="meter"><i style="width:' + v + '%"></i></div><ul class="wish">';
      m.wish.slice(0, 4).forEach(function (w) { html += "<li>💬 " + w + "</li>"; });
      m.good.slice(0, 3).forEach(function (w) { html += '<li class="ok">😊 ' + w + "</li>"; });
      html += "</ul>";
    } else if (o && o !== O.tree && o !== O.field && o !== O.park && !C.doors(city, i).length && o !== O.station) {
      html += '<ul class="wish"><li>💬 みち に つながって いないよ。となり に みち を ひこう</li></ul>';
    }
    var kid = def.kigou || (city.rail[i] && !o ? "jr" : null);
    if (kid && K.BY_ID[kid]) {
      var s = K.BY_ID[kid];
      html += '<div class="kg">' + K.svg(kid, { conn: { e: 1, w: 1 } }) + "<p>ちずきごう: <b>" + rb(s.kanji) + "</b><br>" + rb(s.why) + "</p></div>";
    }
    $("infoEmoji").textContent = def.emoji || "";
    $("infoName").textContent = def.name;
    $("infoBody").innerHTML = html;
    sheet("info", true);
  }

  // ---------- にこにこ ----------
  $("moodBtn").addEventListener("click", function () {
    var hp = C.happiness(city), v = hp.value, html;
    if (!hp.houses.length) html = '<p class="a">まだ だれも すんで いないよ。🏠 いえ を おいてみよう！</p>';
    else {
      html = '<div class="mood-big"><span class="big">' + face(v) + "</span><span>にこにこ " + v + "<br><small>すんでる ひと " + hp.pop + " にん</small></span></div>";
      html += '<div class="meter"><i style="width:' + v + '%"></i></div>';
      var ws = Object.keys(hp.wishes).sort(function (a, b) { return hp.wishes[b] - hp.wishes[a]; }).slice(0, 5);
      if (ws.length) {
        html += '<p class="q">まちの こえ</p><ul class="wish">';
        ws.forEach(function (w) { html += "<li>💬 " + w + "</li>"; });
        html += "</ul>";
      } else html += '<p class="a">みんな にこにこ！ すてきな まち だね。</p>';
      html += '<p class="note" style="margin-top:10px">しせつ の ちかく に いえ が ある ほど にこにこ に なるよ。いえ を タップ すると その いえ の きもち が わかる。</p>';
    }
    $("moodBody").innerHTML = html;
    sheet("moodPanel", true);
  });

  // ---------- スロット ----------
  function thumb(cv, c) {
    var g = cv.getContext("2d"), s = Math.max(1, Math.floor(72 / Math.max(c.w, c.h)));
    cv.width = c.w * s; cv.height = c.h * s;
    var col = {}; col[O.house] = "#e8590c"; col[O.mansion] = "#868e96"; col[O.park] = "#2f9e44"; col[O.tree] = "#2b8a3e"; col[O.field] = "#b07a45";
    for (var i = 0; i < c.w * c.h; i++) {
      var o = c.obj[i];
      g.fillStyle = o ? (col[o] || "#f03e3e") : c.rail[i] ? "#343a40" : c.road[i] ? "#6f7680" : c.base[i] ? "#5bb8ec" : "#a6d36a";
      g.fillRect((i % c.w) * s, (i / c.w | 0) * s, s, s);
    }
  }
  function showSlots() {
    saveNow();
    var box = $("slotList"); box.innerHTML = "";
    [1, 2, 3].forEach(function (n) {
      var s = readSlot(n), b = document.createElement("button");
      b.className = "slot" + (n === settings.slot ? " cur" : "");
      var cv = document.createElement("canvas");
      var txt = document.createElement("div");
      if (s) {
        thumb(cv, s.city);
        var dt = s.meta.at ? new Date(s.meta.at) : null;
        txt.innerHTML = '<div class="t">まち ' + n + (n === settings.slot ? " （いま ここ）" : "") + '</div><div class="s">' + face(s.meta.m || 0) + " にこにこ " + (s.meta.m || 0) + "・" + (s.meta.p || 0) + " にん・" + s.city.w + "×" + s.city.h +
          (dt ? "<br>" + (dt.getMonth() + 1) + "/" + dt.getDate() + " " + dt.getHours() + ":" + ("0" + dt.getMinutes()).slice(-2) : "") + "</div>";
      } else txt.innerHTML = '<div class="t">まち ' + n + '</div><div class="s">まだ ないよ。タップ で あたらしく つくる</div>';
      b.appendChild(cv); b.appendChild(txt);
      b.addEventListener("click", function () { if (n !== settings.slot) { openSlot(n); play("place"); banner("🏘️ まち " + n + " を ひらいたよ", "info"); } sheet("slots", false); });
      box.appendChild(b);
    });
    $("clearBtn").textContent = "🧹 まっさら に する"; $("clearBtn").classList.remove("danger"); armed = false;
    sheet("slots", true);
  }
  var armed = false;
  $("slotBtn").addEventListener("click", showSlots);
  $("sampleBtn").addEventListener("click", function () { useCity(C.sample(), 7 * 60); saveNow(); sheet("slots", false); play("place"); banner("🏘️ おてほん の まち だよ。▶ で うごかしてみよう", "info"); });
  $("clearBtn").addEventListener("click", function () {
    if (!armed) { armed = true; this.textContent = "ほんとうに けす？ もういちど タップ"; this.classList.add("danger"); return; }
    useCity(C.blank(), 7 * 60); saveNow(); sheet("slots", false); play("erase");
  });

  // ---------- ボタン ----------
  function setRunning(on) {
    running = on;
    $("playBtn").textContent = on ? "⏸" : "▶";
    $("playBtn").setAttribute("aria-label", on ? "とめる" : "じかん を すすめる");
  }
  $("playBtn").addEventListener("click", function () { setRunning(!running); play("tap"); });
  $("speedBtn").addEventListener("click", function () { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; this.textContent = "×" + speed; play("tap"); });
  $("mapBtn").addEventListener("click", function () {
    R.map = !R.map; this.classList.toggle("on", R.map); bgDirty = true; play("tap");
    $("legend").hidden = !R.map; $("hint").hidden = R.map;
    if (R.map) buildLegend();
  });
  $("undoBtn").addEventListener("click", function () {
    var ch = undo.pop(); if (!ch) return;
    C.revert(city, ch); bgDirty = true; updateMood(); saveSoon(); play("erase");
  });
  $("fitBtn").addEventListener("click", function () { R.fit(city); bgDirty = true; play("tap"); });
  $("growBtn").addEventListener("click", function () {
    var r = C.expand(city); if (!r) return;
    var v = R.view, t = sim.time;
    city = r.city; sim.reset(city); sim.time = t; undo = [];
    v.ox -= r.ox * T * v.s; v.oy -= r.oy * T * v.s;
    C.changed(city); bgDirty = true; updateMood(); updateGrow(); saveNow(); play("place");
    banner("➕ とち が ひろがったよ！ " + city.w + "×" + city.h, "good");
  });
  $("soundBtn").addEventListener("click", function () {
    settings.sound = !settings.sound; saveSettings();
    this.textContent = settings.sound ? "🔊" : "🔇"; this.setAttribute("aria-pressed", settings.sound);
    if (settings.sound) play("tap");
  });

  $("legend").addEventListener("click", function () { this.classList.toggle("mini"); play("tap"); });
  function buildLegend() {
    var items = [], seen = {};
    function add(key, svg, name) { if (!seen[key]) { seen[key] = 1; items.push('<div class="it">' + svg + "<span>" + name + "</span></div>"); } }
    var n = city.w * city.h, i, hasRoad = false, hasRail = false;
    for (i = 0; i < n; i++) { if (city.road[i]) hasRoad = true; if (city.rail[i]) hasRail = true; }
    var box = function (inner) { return '<svg viewBox="0 0 100 100" aria-hidden="true">' + inner + "</svg>"; };
    if (hasRoad) add("road", box('<rect x="0" y="34" width="100" height="32" fill="#333"/><rect x="0" y="40" width="100" height="20" fill="#fff"/>'), "みち");
    if (hasRail) add("rail", K.svg("jr", { conn: { e: 1, w: 1 } }), "てつどう");
    Object.keys(city.byType).forEach(function (k) {
      var def = D.OBJ[k]; if (!def) return;
      if (def.id === "station") add("st", K.svg("station", { conn: { e: 1, w: 1 } }), "えき");
      else if (def.id === "house") add("h", box('<rect x="30" y="30" width="40" height="40" fill="#c9c2b2" stroke="#555" stroke-width="4"/>'), "たてもの");
      else if (def.id === "super" || def.id === "bakery") add("h", box('<rect x="30" y="30" width="40" height="40" fill="#c9c2b2" stroke="#555" stroke-width="4"/>'), "たてもの");
      else if (def.id === "mansion") add("m", box('<defs><pattern id="hp" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="12" stroke="#777" stroke-width="4"/></pattern></defs><rect x="18" y="18" width="64" height="64" fill="url(#hp)" stroke="#444" stroke-width="4"/>'), "たかい たてもの");
      else if (def.kigou) add(def.kigou, K.svg(def.kigou, { bg: "#fbf8ef" }), def.id === "park" || def.id === "tree" ? "き（こうえん）" : def.name);
    });
    var hasWater = false; for (i = 0; i < n; i++) if (city.base[i]) { hasWater = true; break; }
    if (hasWater) add("w", box('<rect x="0" y="0" width="100" height="100" fill="#bfe3fb"/><line x1="0" y1="20" x2="100" y2="20" stroke="#3d8fd1" stroke-width="5"/><line x1="0" y1="80" x2="100" y2="80" stroke="#3d8fd1" stroke-width="5"/>'), "かわ");
    $("legend").innerHTML = "<h3>🗺️ はんれい（きごう の いみ）<small> ▼タップ で たたむ</small></h3>" + items.join("");
  }

  // ================= さわる =================
  var fg = $("fg"), ptrs = {}, gesture = null;
  function local(e) { var r = fg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function cellAt(p) {
    var w = R.toWorld(p.x, p.y), x = Math.floor(w.x), y = Math.floor(w.y);
    if (x < 0 || y < 0 || x >= city.w || y >= city.h) return -1;
    return y * city.w + x;
  }
  function paintCell(i) {
    if (i < 0 || gesture.done[i]) return;
    gesture.done[i] = 1;
    var ch = C.apply(city, tool, i);
    if (!ch) { if (!gesture.changes.length && !gesture.moved) play("ng"); return; }
    gesture.changes.push(ch);
    C.changed(city); bgDirty = true;
    if (tool === "erase") play("erase"); else if (tool === "road" || tool === "rail" || tool === "river") play("road"); else play("place");
  }
  function paintLine(a, b) {
    // 4ほうこう で つながる ように マス を うめる
    var ax = a % city.w, ay = a / city.w | 0, bx = b % city.w, by = b / city.w | 0, guard = 0;
    while ((ax !== bx || ay !== by) && guard++ < 200) {
      if (Math.abs(bx - ax) >= Math.abs(by - ay)) ax += bx > ax ? 1 : -1; else ay += by > ay ? 1 : -1;
      paintCell(ay * city.w + ax);
    }
  }
  function endStroke(commit) {
    if (!gesture || gesture.type !== "paint") return;
    if (gesture.changes.length) {
      if (commit) { undo.push(gesture.changes); if (undo.length > 40) undo.shift(); edited(); }
      else { C.revert(city, gesture.changes); bgDirty = true; }
    }
  }
  function startPinch() {
    var ids = Object.keys(ptrs); if (ids.length < 2) return;
    var a = ptrs[ids[0]], b = ptrs[ids[1]];
    gesture = { type: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, s: R.view.s, ox: R.view.ox, oy: R.view.oy };
  }

  fg.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    try { fg.setPointerCapture(e.pointerId); } catch (er) { /* なくても よい */ }
    ac();
    var p = local(e); ptrs[e.pointerId] = p;
    var n = Object.keys(ptrs).length;
    if (n >= 2) { endStroke(false); startPinch(); return; }
    if (e.pointerType === "mouse" && e.button !== 0) { gesture = { type: "pan", x: p.x, y: p.y, moved: 99 }; return; }
    if (tool === "look" || R.map) { gesture = { type: "pan", x: p.x, y: p.y, sx: p.x, sy: p.y, moved: 0, t: Date.now() }; return; }
    gesture = { type: "paint", changes: [], done: {}, last: cellAt(p), moved: false, t: Date.now() };
    // タッチ は すこし まって から おく（2ほん め の ゆび が すぐ くる ことが ある）
    if (e.pointerType === "touch") gesture.pending = setTimeout(function () { if (gesture && gesture.type === "paint" && gesture.pending) { gesture.pending = 0; paintCell(gesture.last); } }, 70);
    else paintCell(gesture.last);
  }, { passive: false });

  fg.addEventListener("pointermove", function (e) {
    if (!ptrs[e.pointerId]) return;
    e.preventDefault();
    var p = local(e); ptrs[e.pointerId] = p;
    if (!gesture) return;
    if (gesture.type === "pinch") {
      var ids = Object.keys(ptrs); if (ids.length < 2) return;
      var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var v = R.view, ns = gesture.s * d / gesture.d;
      var wx = (gesture.mx - gesture.ox) / gesture.s, wy = (gesture.my - gesture.oy) / gesture.s;
      v.s = ns; v.ox = mx - wx * ns; v.oy = my - wy * ns;
      R.clamp(city); bgDirty = true;
    } else if (gesture.type === "pan") {
      R.view.ox += p.x - gesture.x; R.view.oy += p.y - gesture.y;
      gesture.moved += Math.abs(p.x - gesture.x) + Math.abs(p.y - gesture.y);
      gesture.x = p.x; gesture.y = p.y;
      R.clamp(city); bgDirty = true;
    } else if (gesture.type === "paint") {
      var i = cellAt(p);
      if (gesture.pending) { clearTimeout(gesture.pending); gesture.pending = 0; paintCell(gesture.last); }
      if (i >= 0 && i !== gesture.last) {
        gesture.moved = true;
        if (MULTI[tool]) { if (gesture.last >= 0) paintLine(gesture.last, i); else paintCell(i); }
        gesture.last = i;
      }
    }
  }, { passive: false });

  function up(e) {
    if (!ptrs[e.pointerId]) return;
    delete ptrs[e.pointerId];
    var n = Object.keys(ptrs).length;
    if (!gesture) return;
    if (gesture.type === "pinch") { if (n === 0) gesture = null; else gesture = { type: "pan", x: ptrs[Object.keys(ptrs)[0]].x, y: ptrs[Object.keys(ptrs)[0]].y, moved: 99 }; return; }
    if (n > 0) return;
    if (gesture.type === "paint") {
      if (gesture.pending) { clearTimeout(gesture.pending); gesture.pending = 0; paintCell(gesture.last); }
      endStroke(true);
    } else if (gesture.type === "pan" && gesture.moved < 10 && e.type === "pointerup") {
      var i = cellAt(local(e)); if (i >= 0) { play("tap"); infoFor(i); }
    }
    gesture = null;
  }
  fg.addEventListener("pointerup", up);
  fg.addEventListener("pointercancel", up);
  fg.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  fg.addEventListener("wheel", function (e) {
    e.preventDefault();
    var p = local(e), v = R.view, k = Math.exp(-e.deltaY * 0.0015), ns = v.s * k;
    v.ox = p.x - (p.x - v.ox) * ns / v.s; v.oy = p.y - (p.y - v.oy) * ns / v.s; v.s = ns;
    R.clamp(city); bgDirty = true;
  }, { passive: false });
  // あそぶ がめん の ページ スクロール・ズーム を ふせぐ
  $("stage").addEventListener("touchmove", function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });

  // ================= まいコマ =================
  var stage = $("stage");
  function resize() {
    var r = stage.getBoundingClientRect(), first = !R.W;
    var cx = R.W / 2, cy = R.H / 2;
    R.resize(r.width, r.height);
    if (first) R.fit(city);
    else { R.view.ox += r.width / 2 - cx; R.view.oy += r.height / 2 - cy; R.clamp(city); }
    bgDirty = true;
  }
  window.addEventListener("resize", resize);

  var prev = performance.now(), clockAcc = 0, tsec = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    var step = running ? dt * speed : 0;
    if (document.hidden) step = 0;
    var before = sim.ver;
    sim.step(step);
    tsec += dt;
    if (before !== sim.ver) bgDirty = true;
    var l = sim.light(), q = Math.round(l * 10) / 10;
    if (q !== lightQ) { lightQ = q; bgDirty = true; }
    if (bgDirty) { R.drawBG(city, q); bgDirty = false; }
    R.drawFG(city, sim, tsec, q);
    clockAcc += dt;
    if (clockAcc > 0.25) { clockAcc = 0; $("clock").textContent = clockText(); }
    requestAnimationFrame(frame);
  }

  // ================= はじめ =================
  buildPalette();
  setTool("road");
  $("soundBtn").textContent = settings.sound ? "🔊" : "🔇";
  $("soundBtn").setAttribute("aria-pressed", settings.sound);
  openSlot(settings.slot);
  resize();
  setInterval(function () { if (running) saveNow(); }, 15000);
  window.addEventListener("pagehide", saveNow);
  document.addEventListener("visibilitychange", function () { if (document.hidden) saveNow(); });
  requestAnimationFrame(frame);

  // ためし（Playwright）から さわる ため
  window.__machi = { get city() { return city; }, get sim() { return sim; }, R: R, setRunning: setRunning, setTool: setTool, infoFor: infoFor, openSlot: openSlot,
    setSpeed: function (s) { speed = s; }, redraw: function () { bgDirty = true; }, useCity: function (c, t) { useCity(c, t); } };
})();
