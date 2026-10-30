/* ============================================================
   しゅつどう！ 119 — がめん の きりかえ・ほぞん・そうさ
   ながれ: しゅつどう いちらん → しれいセンター（でんわ）→ うんてん → げんば
           （きゅうきゅう は → びょういん へ うんてん → びょういん）→ けっか
   ============================================================ */
(function (root) {
  "use strict";

  var D = root.S119_DATA, AU = root.S119_AUDIO, A = root.S119_ART;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "shutsudo-119-v1";

  // ---------------- ほぞん ----------------
  var st = { stars: {}, rides: {}, practice: {}, name: "", sound: true, siren: true, voice: true };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { var o = JSON.parse(raw); for (var k in o) if (Object.prototype.hasOwnProperty.call(st, k)) st[k] = o[k]; }
  } catch (e) { /* よめなくても あそべる */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ほぞん できなくても あそべる */ } }
  AU.opt.sound = st.sound; AU.opt.siren = st.siren; AU.opt.voice = st.voice;

  // ---------------- がめん ----------------
  var cur = "sMenu", drive = null, scene = null, call = null, last = 0;
  var TITLES = { sMenu: "🚒 しゅつどう！ 119", sMissions: "🚨 しゅつどう", sCall: "🎧 しれい センター", sDrive: "🚨 しゅつどう！", sScene: "🦺 げんば", sResult: "🏅 けっか",
    sPlist: "📞 でんわ れんしゅう", sPractice: "📞 でんわ れんしゅう", sZukan: "📖 ずかん", sSafe: "🦺 あんぜん" };
  var BACK = { sMissions: "sMenu", sCall: "sMissions", sDrive: "sMissions", sScene: "sMissions", sResult: "sMissions", sPlist: "sMenu", sPractice: "sPlist", sZukan: "sMenu", sSafe: "sMenu" };

  function show(id) {
    if (cur === "sCall" && call) { call.stop(); call = null; }
    if (cur === "sPractice" && call) { call.stop(); call = null; }
    if (cur === "sDrive" && id !== "sDrive") { AU.siren(null, false); }
    if (cur === "sScene" && id !== "sScene" && scene) { scene.stop(); }
    if (cur === "sZukan") stopZukanSiren();
    AU.hush();
    document.querySelectorAll(".screen").forEach(function (s) { s.hidden = s.id !== id; });
    cur = id;
    $("title").textContent = TITLES[id] || TITLES.sMenu;
    $("back").hidden = id === "sMenu";
    if (id === "sMissions") renderMissions();
    if (id === "sPlist") renderPlist();
    if (id === "sZukan") renderZukan();
    if (id !== "sDrive") drive = null;
    if (id !== "sScene") scene = null;
    if (id === "sMenu") sizeHero();
  }
  $("back").addEventListener("click", function () { AU.pop(); show(BACK[cur] || "sMenu"); });
  document.querySelectorAll("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () { AU.unlock(); AU.pop(); show(b.getAttribute("data-go")); });
  });

  // ---------------- オン／オフ ----------------
  function syncTog() {
    $("tSound").setAttribute("aria-pressed", String(st.sound)); $("tSound").textContent = st.sound ? "🔊" : "🔇";
    $("tSiren").setAttribute("aria-pressed", String(st.siren));
    $("tVoice").setAttribute("aria-pressed", String(st.voice));
  }
  syncTog();
  $("tSound").addEventListener("click", function () {
    st.sound = !st.sound; AU.opt.sound = st.sound; save(); syncTog();
    if (!st.sound) AU.stopAll(); else { AU.unlock(); AU.pop(); resumeSiren(); }
  });
  $("tSiren").addEventListener("click", function () {
    st.siren = !st.siren; AU.opt.siren = st.siren; save(); syncTog();
    if (!st.siren) AU.siren(null, false); else { AU.unlock(); resumeSiren(); }
  });
  $("tVoice").addEventListener("click", function () {
    st.voice = !st.voice; AU.opt.voice = st.voice; save(); syncTog();
    if (!st.voice) AU.hush(); else { AU.unlock(); AU.say("よみあげ オン"); }
  });
  function resumeSiren() { if (cur === "sDrive" && drive && drive.siren && !drive.done && drive.started) AU.siren(D.VEHICLES[drive.vid].siren, true); }

  // ---------------- メニュー の え ----------------
  var hero = $("hero"), hg = hero.getContext("2d"), heroW = 0, heroH = 0;
  function sizeHero() {
    var r = hero.getBoundingClientRect(), d = Math.min(2, root.devicePixelRatio || 1);
    heroW = r.width; heroH = r.height; hero.width = Math.round(heroW * d); hero.height = Math.round(heroH * d);
    hg.setTransform(d, 0, 0, d, 0, 0);
  }
  function drawHero(t) {
    if (!heroW) return;
    var g = hg, W = heroW, H = heroH, gy = H * 0.86;
    g.fillStyle = "#d0ebff"; g.fillRect(0, 0, W, H);
    for (var i = 0; i < 6; i++) {
      var bx = ((i * 160 - t * 20) % (W + 200) + W + 200) % (W + 200) - 100;
      g.fillStyle = ["#e9ecef", "#fff4e0", "#dee2e6"][i % 3]; g.fillRect(bx, gy - 60 - (i % 3) * 18, 90, 60 + (i % 3) * 18);
    }
    g.fillStyle = "#868e96"; g.fillRect(0, gy, W, H - gy);
    g.fillStyle = "#fff"; for (i = 0; i < W / 40 + 1; i++) g.fillRect(((i * 40 - t * 120) % (W + 40) + W + 40) % (W + 40) - 40, gy + (H - gy) / 2 - 1, 22, 3);
    var w = Math.min(150, W * 0.3), ids = ["pump", "amb", "patrol"];
    ids.forEach(function (id, k) {
      var x = ((t * 70 + k * (W + w) / 3) % (W + w * 1.3)) - w;
      A.side(g, id, x, gy + 6, w, t, {});
    });
  }

  // ---------------- しゅつどう いちらん ----------------
  function stars(n) { var s = ""; for (var i = 0; i < 3; i++) s += i < n ? "⭐" : "☆"; return s; }
  function renderMissions() {
    var box = $("mList"); box.innerHTML = "";
    D.MISSIONS.forEach(function (m) {
      var b = document.createElement("button"); b.type = "button"; b.className = "card";
      b.setAttribute("data-m", m.id);
      b.innerHTML = "<span class='ce'>" + m.emoji + "</span><span class='cb'><b>" + m.title + "</b><small><span class='line" + (m.line === 110 ? " p" : "") + "'>" + m.line + "ばん</span>" + m.addr + "</small></span><span class='st'>" + stars(st.stars[m.id] || 0) + "</span>";
      b.addEventListener("click", function () { AU.unlock(); AU.pop(); startMission(m); });
      box.appendChild(b);
    });
  }

  var mission = null, legs = [];
  function startMission(m) {
    mission = m; legs = [];
    show("sCall");
    call = new root.S119_CALL.Dispatch($("callRoot"), m, function (vid) { beginDrive(m, vid, "go"); });
  }

  // ---------------- うんてん ----------------
  var held = false;
  function beginDrive(m, vid, leg) {
    show("sDrive");
    var P = D.PLACES, from, to, target, dest;
    if (leg === "go") {
      from = P[m.start].road; to = m.target.road;
      target = { x: m.target.x, y: m.target.y, kind: m.scene === "fire" || m.scene === "ladder" ? "fire" : "", emoji: m.scene === "maigo" ? "🧒" : "🆘" };
      dest = "📍 " + m.addr + "（" + m.mark + "）";
    } else {
      from = m.target.road; to = P.hospital.road;
      target = { x: P.hospital.x, y: P.hospital.y, emoji: "🏥" };
      dest = "📍 びょういん へ";
    }
    $("hDest").textContent = dest;
    drive = new root.S119_DRIVE.Drive($("driveCv"), {
      vehicle: vid, from: from, to: to, target: target, siren: false, seed: m.id.charCodeAt(1) + (leg === "go" ? 0 : 5),
      auto: !!root.S119.autoDrive,
      onSlow: function (ok) { if (ok) AU.ok(); else AU.soft(); },
      onArrive: function (r) {
        legs.push(r);
        AU.siren(null, false);
        AU.fanfare(); AU.say("とうちゃく！");
        drive.say("とうちゃく！", "#d3f9d8");
        setTimeout(function () { if (cur === "sDrive") beginScene(m, vid, leg === "go" ? "site" : "hospital"); }, 1300);
      }
    });
    drive.vid = vid; drive.started = false;
    setGas(false);
    $("dStart").hidden = false;
    $("startTxt").textContent = D.VEHICLES[vid].name + " で " + (leg === "go" ? "げんば" : "びょういん") + " へ！";
    syncSirenBtn();
    drawStart(vid);
    drive.draw();
  }
  function drawStart(vid) {
    var cv = $("startCv"), r = cv.getBoundingClientRect(), d = Math.min(2, root.devicePixelRatio || 1);
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    var g = cv.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, r.width, r.height);
    var w = Math.min(r.width * 0.7, 260);
    A.side(g, vid, (r.width - w) / 2, r.height - 8, w, 0, {});
  }
  $("startBtn").addEventListener("click", function () {
    if (!drive) return;
    AU.unlock(); AU.ok();
    drive.started = true; drive.setSiren(true); syncSirenBtn();
    AU.siren(D.VEHICLES[drive.vid].siren, true);
    AU.say("しゅつどう します！");
    $("dStart").hidden = true;
  });
  function syncSirenBtn() {
    var on = drive && drive.siren;
    $("hSiren").classList.toggle("on", !!on);
    $("hSiren").textContent = on ? "🚨 サイレン ON" : "🔕 サイレン OFF";
  }
  $("hSiren").addEventListener("click", function () {
    if (!drive || !drive.started) return;
    drive.setSiren(!drive.siren); syncSirenBtn();
    AU.siren(D.VEHICLES[drive.vid].siren, drive.siren && !drive.done);
    if (!drive.siren) drive.say("サイレン が ないと、くるま が よけて くれないよ", "#ffe066");
  });
  function setGas(on) { held = on; if (drive) drive.accel = on && drive.started; $("cGas").classList.toggle("on", on); }
  function hold(btn, onDown, onUp) {
    btn.addEventListener("pointerdown", function (e) { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (x) { /* なし */ } onDown(); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) { btn.addEventListener(ev, function () { if (onUp) onUp(); }); });
    btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }
  hold($("cGas"), function () { AU.unlock(); setGas(true); }, function () { setGas(false); });
  hold($("cLeft"), function () { if (drive && drive.started) { drive.setIntent(-1); AU.pop(); } });
  hold($("cRight"), function () { if (drive && drive.started) { drive.setIntent(1); AU.pop(); } });
  // ちず を よこ に なぞって ハンドル
  (function () {
    var cv = $("driveCv"), sx = 0, used = false, down = false;
    cv.addEventListener("pointerdown", function (e) { down = true; sx = e.clientX; used = false; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* なし */ } });
    cv.addEventListener("pointermove", function (e) {
      if (!down || used || !drive || !drive.started) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 40) { used = true; if (drive.car.intent !== (dx > 0 ? 1 : -1)) drive.setIntent(dx > 0 ? 1 : -1); AU.pop(); }
    });
    ["pointerup", "pointercancel"].forEach(function (ev) { cv.addEventListener(ev, function () { down = false; }); });
  })();
  document.addEventListener("keydown", function (e) {
    if (cur !== "sDrive" || !drive || !drive.started) return;
    if (e.key === "ArrowLeft") drive.setIntent(-1);
    else if (e.key === "ArrowRight") drive.setIntent(1);
    else if (e.key === "ArrowUp" || e.key === " ") { setGas(true); e.preventDefault(); }
  });
  document.addEventListener("keyup", function (e) { if (e.key === "ArrowUp" || e.key === " ") setGas(false); });

  function hud() {
    if (!drive) return;
    $("hTime").textContent = drive.clock.toFixed(1) + "びょう";
    var h = drive.hint, nav = $("hNext"), c = drive.car, txt, soon = false;
    if (c.wait) { txt = "どっち に まがる？ ◀ ▶"; soon = true; }
    else if (h && h.dir) {
      var lr = h.dir < 0 ? "◀ ひだり" : "みぎ ▶";
      soon = h.n <= 2;
      txt = (soon ? "もうすぐ " : "つぎ は ") + lr + " に まがる";
      if (c.intent === h.dir) txt += " ✔";
    } else txt = "⬆ まっすぐ すすもう";
    if (nav.textContent !== txt) nav.textContent = txt;
    nav.classList.toggle("soon", soon);
    $("cLeft").classList.toggle("hint", !!(h && soon && h.dir < 0 && c.intent !== -1));
    $("cRight").classList.toggle("hint", !!(h && soon && h.dir > 0 && c.intent !== 1));
    $("cLeft").classList.toggle("on", c.intent === -1);
    $("cRight").classList.toggle("on", c.intent === 1);
  }

  // ---------------- げんば ----------------
  function beginScene(m, vid, phase) {
    show("sScene");
    $("sActs").innerHTML = "";
    scene = new root.S119_SCENE.Scene($("sceneCv"), m, {
      msg: function (t) { $("sMsg").textContent = t; },
      actions: function (list) {
        var box = $("sActs"); box.innerHTML = "";
        list.forEach(function (a) {
          var b = document.createElement("button"); b.type = "button"; b.className = "big go"; b.textContent = a.label;
          b.addEventListener("click", function () { AU.unlock(); a.fn(); });
          box.appendChild(b);
        });
      },
      done: function (r) {
        if (r && r.next === "hospital") beginDrive(m, vid, "hospital");
        else finishMission(m, vid);
      }
    }, phase);
  }
  (function () {
    var cv = $("sceneCv");
    function p(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener("pointerdown", function (e) { if (!scene) return; AU.unlock(); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* なし */ } var q = p(e); scene.down(q.x, q.y); });
    cv.addEventListener("pointermove", function (e) { if (!scene) return; var q = p(e); scene.move(q.x, q.y); });
    ["pointerup", "pointercancel"].forEach(function (ev) { cv.addEventListener(ev, function () { if (scene) scene.up(); }); });
  })();

  // ---------------- けっか ----------------
  function finishMission(m, vid) {
    var sum = 0, time = 0;
    legs.forEach(function (l) { sum += l.stars; time += l.time; });
    var s = Math.max(1, Math.round(sum / Math.max(1, legs.length)));
    var best = st.stars[m.id] || 0;
    if (s > best) st.stars[m.id] = s;
    st.rides[vid] = true;
    save();
    show("sResult");
    var box = $("rStars"); box.innerHTML = "";
    for (var i = 0; i < 3; i++) {
      var sp = document.createElement("span"); sp.textContent = i < s ? "⭐" : "☆"; sp.style.animationDelay = (i * 0.25) + "s";
      box.appendChild(sp);
      if (i < s) (function (k) { setTimeout(function () { AU.star(k); }, 250 * k + 200); })(i);
    }
    var msgs = { fire: "ほのお を ぜんぶ けして、まち を まもった！", ladder: "はしご を のばして、たかい ところ の ほのお も けせた！", amb: "びょういん まで ぶじ に はこべた！", maigo: "まいご の こ が かぞく に あえた！" };
    $("rTitle").textContent = "しゅつどう かんりょう！";
    var good = legs.reduce(function (a, l) { return a + l.good; }, 0), miss = legs.reduce(function (a, l) { return a + l.mistakes; }, 0);
    $("rText").innerHTML = msgs[m.scene] + "<br>うんてん じかん：" + time.toFixed(1) + "びょう<br>こうさてん の かくにん：👍 " + good + "かい" + (miss ? "／ とまって かくにん " + miss + "かい" : "") +
      (s < 3 ? "<br><small>こうさてん の てまえ で アクセル を はなして ゆっくり すすむ と、はやく つけるよ</small>" : "");
    AU.say("しゅつどう かんりょう！");
  }
  $("rAgain").addEventListener("click", function () { AU.pop(); if (mission) startMission(mission); });
  $("rList").addEventListener("click", function () { AU.pop(); show("sMissions"); });

  // ---------------- でんわ れんしゅう ----------------
  var nameIn = $("nameIn");
  nameIn.value = st.name || "";
  nameIn.addEventListener("change", function () { st.name = nameIn.value.trim().slice(0, 12); save(); });
  nameIn.addEventListener("input", function () { st.name = nameIn.value.trim().slice(0, 12); save(); });
  function renderPlist() {
    var box = $("pList"); box.innerHTML = "";
    D.PRACTICE.forEach(function (p) {
      var b = document.createElement("button"); b.type = "button"; b.className = "card";
      b.setAttribute("data-p", p.id);
      b.innerHTML = "<span class='ce'>" + p.emoji + "</span><span class='cb'><b>" + p.title + "</b><small><span class='line" + (p.number === "110" ? " p" : "") + "'>" + p.number + "ばん</span>の れんしゅう</small></span><span class='st'>" + (st.practice[p.id] ? "💮" : "") + "</span>";
      b.addEventListener("click", function () { AU.unlock(); AU.pop(); startPractice(p); });
      box.appendChild(b);
    });
  }
  function startPractice(p) {
    show("sPractice");
    call = new root.S119_CALL.Practice($("pRoot"), p, st.name || "", function (id) {
      st.practice[id] = true;
      save(); show("sPlist");
    });
  }

  // ---------------- ずかん ----------------
  var zTimer = 0, zBtn = null;
  function stopZukanSiren() { clearTimeout(zTimer); AU.siren(null, false); if (zBtn) { zBtn.textContent = "🔊 サイレン を きく"; zBtn = null; } }
  function renderZukan() {
    var box = $("zList"); box.innerHTML = "";
    D.ZUKAN.forEach(function (z) {
      var v = D.VEHICLES[z.id];
      var c = document.createElement("div"); c.className = "zcard";
      c.innerHTML = "<canvas></canvas><h3>" + v.emoji + " " + v.name + "</h3><p>" + z.text + "</p><p class='sir'>🔊 " + z.siren + "</p>" + (st.rides[z.id] ? "<span class='rode'>のった！</span>" : "");
      var b = document.createElement("button"); b.type = "button"; b.className = "big"; b.textContent = "🔊 サイレン を きく";
      b.addEventListener("click", function () {
        AU.unlock();
        var again = zBtn === b;
        stopZukanSiren();
        if (again) return;
        if (!st.sound || !st.siren) { b.textContent = st.sound ? "🚨 が オフ だよ" : "🔇 おと が オフ だよ"; return; }
        zBtn = b; b.textContent = "⏹ とめる";
        AU.siren(v.siren, true);
        zTimer = setTimeout(stopZukanSiren, 5000);
      });
      c.appendChild(b);
      box.appendChild(c);
      var cv = c.querySelector("canvas"), r = cv.getBoundingClientRect(), d = Math.min(2, root.devicePixelRatio || 1);
      cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
      var g = cv.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0);
      var w = Math.min(r.width * 0.62, z.id === "bike" ? 130 : 230), h = r.height;
      A.side(g, z.id, (r.width - w) / 2, h * 0.86, w, 0.1, {});
    });
  }

  // ---------------- ループ ----------------
  function loop(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    if (cur === "sDrive" && drive) {
      if (drive.started) { drive.accel = root.S119.autoDrive ? drive.accel : held; drive.update(dt); }
      drive.draw(); hud();
    } else if (cur === "sScene" && scene) { scene.update(dt); scene.draw(); }
    else if (cur === "sMenu") drawHero(ts / 1000);
    requestAnimationFrame(loop);
  }
  root.addEventListener("resize", function () {
    if (drive) drive.resize();
    if (scene) scene.resize();
    if (cur === "sMenu") sizeHero();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { AU.siren(null, false); AU.hose(false); AU.hush(); }
    else resumeSiren();
  });

  // テスト・おてほん よう
  root.S119 = root.S119 || {};
  root.S119.state = st;
  root.S119.drive = function () { return drive; };
  root.S119.scene = function () { return scene; };
  root.S119.screen = function () { return cur; };

  show("sMenu");
  requestAnimationFrame(loop);
})(window);
