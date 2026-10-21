/* ============================================================
   さむらい vs にんじゃ — がめん・そうさ・セーブ
   たたかいの なかみは engine.js、CPU は ai.js、えは draw.js、おとは audio.js
   ============================================================ */
(function () {
  "use strict";
  var SN = window.SN, AI = window.SNAI, D = window.SNDraw, A = window.SNAudio, DATA = window.SNData;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  // ---------- セーブ ----------
  var KEY = "samurai-ninja-v1";
  var save = { story: { samurai: 0, ninja: 0 }, cards: [], snd: true, bgm: true, pick: {} };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var o = JSON.parse(raw);
      if (o && typeof o === "object") {
        if (o.story) { save.story.samurai = +o.story.samurai || 0; save.story.ninja = +o.story.ninja || 0; }
        if (Array.isArray(o.cards)) save.cards = o.cards.filter(function (c) { return typeof c === "string"; });
        if (typeof o.snd === "boolean") save.snd = o.snd;
        if (typeof o.bgm === "boolean") save.bgm = o.bgm;
        if (o.pick && typeof o.pick === "object") save.pick = o.pick;
      }
    }
  } catch (e) { /* よめなくても あそべる */ }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* むし */ } }
  A.setOn(save.snd); A.setBgm(save.bgm);

  // {漢字|かんじ} → <ruby>
  function rb(s) {
    return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; })
      .replace(/\{([^|}]+)\|([^}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>");
  }
  function plain(s) { return String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "$1"); }

  // ---------- がめんの きりかえ ----------
  var current = "title";
  function show(id) {
    $$(".screen").forEach(function (s) { s.hidden = s.id !== "scr-" + id; });
    current = id;
    if (id !== "battle") stopLoop();
    if (id === "title") { drawTitle(); updateCounts(); }
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-go]");
    if (!b) return;
    A.unlock(); A.play("tap");
    var g = b.getAttribute("data-go");
    if (g === "story") openStory(storySide);
    else if (g === "cpu" || g === "vs") openPick(g);
    else if (g === "zukan") openZukan();
    else if (g === "help") openHelp();
    else show(g);
  });
  $$(".tog[data-tog]").forEach(function (b) {
    var k = b.getAttribute("data-tog");
    b.setAttribute("aria-pressed", String(save[k]));
    b.addEventListener("click", function () {
      save[k] = !save[k]; persist();
      b.setAttribute("aria-pressed", String(save[k]));
      if (k === "snd") A.setOn(save.snd); else A.setBgm(save.bgm);
      A.unlock(); A.play("tap");
    });
  });

  function updateCounts() {
    var s = save.cards.length + " / " + DATA.CARDS.length;
    $("#zukan-count").textContent = "(" + s + ")";
    $("#zukan-count2").textContent = s;
  }

  function mini(ch, pal, size, pose) {
    var c = document.createElement("canvas");
    c.width = c.height = (size || 76) * 2;
    D.portrait(c, ch, pal, pose);
    return c;
  }

  function drawTitle() {
    var c = $("#title-cv"), ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    var g = ctx.createRadialGradient(360, 160, 20, 360, 160, 260);
    g.addColorStop(0, "rgba(255,212,59,0.55)"); g.addColorStop(1, "rgba(255,212,59,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
    [[200, 1, "samurai", "samurai"], [520, -1, "ninja", "ninja"]].forEach(function (p) {
      ctx.save(); ctx.translate(p[0], 290); ctx.scale(1.75, 1.75); ctx.translate(0, -SN.GROUND);
      D.drawFighter(ctx, { ch: p[2], x: 0, y: SN.GROUND, face: p[1], st: p[2] === "samurai" ? "guard" : "idle", sf: 0, smoke: 0, inv: 0, idx: p[1] > 0 ? 0 : 1, onG: true, jumps: 0 }, 0.6, p[3]);
      ctx.restore();
    });
    ctx.save(); ctx.translate(360, 150); ctx.rotate(-0.08);
    ctx.font = "900 70px " + getComputedStyle(document.body).fontFamily;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 10; ctx.strokeStyle = "#fff"; ctx.strokeText("VS", 0, 0);
    ctx.fillStyle = "#a61e4d"; ctx.fillText("VS", 0, 0);
    ctx.restore();
  }

  // ---------- えらぶ（CPU と たいせん ／ 2人 たいせん） ----------
  var CHOICES = {
    ch: [["samurai", "さむらい", "ゆっくり・つよい"], ["ninja", "にんじゃ", "すばやい・2だんジャンプ"]],
    lv: [[0, "よわい", "はじめて むけ"], [2, "ふつう", ""], [4, "つよい", "うでだめし"]],
    stage: [["machi", "じょうかまち"], ["take", "たけばやし"], ["yane", "やねの うえ"], ["tenshu", "おしろの てんしゅ"], ["random", "おまかせ"]]
  };
  var pickMode = "cpu";
  function openPick(mode) {
    pickMode = mode;
    var P = save.pick[mode] || {};
    var sel = {
      p1: P.p1 || "samurai", p2: P.p2 || "ninja",
      lv: P.lv !== undefined ? P.lv : 0, stage: P.stage || "random"
    };
    $("#pick-title").textContent = mode === "cpu" ? "CPU と たいせん" : "2人 たいせん";
    var body = $("#pick-body"); body.innerHTML = "";
    function row(title, key, list, withPic) {
      var r = document.createElement("div"); r.className = "pick-row";
      r.innerHTML = "<h3>" + title + "</h3>";
      var opts = document.createElement("div"); opts.className = "opts";
      list.forEach(function (it) {
        var b = document.createElement("button"); b.className = "opt";
        if (withPic) b.appendChild(mini(it[0], it[0] === "samurai" ? "samurai" : "ninja", 72));
        b.insertAdjacentHTML("beforeend", "<span>" + it[1] + "</span>" + (it[2] ? "<small>" + it[2] + "</small>" : ""));
        b.setAttribute("aria-pressed", String(sel[key] === it[0]));
        b.addEventListener("click", function () {
          sel[key] = it[0]; A.play("tap");
          Array.prototype.forEach.call(opts.children, function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        });
        opts.appendChild(b);
      });
      r.appendChild(opts); body.appendChild(r);
    }
    if (mode === "cpu") {
      row("あなたは どっち？", "p1", CHOICES.ch, true);
      row("あいて（CPU）は？", "p2", CHOICES.ch, true);
      row("CPU の つよさ", "lv", CHOICES.lv);
    } else {
      row("1P（ひだり がわ の ボタン）", "p1", CHOICES.ch, true);
      row("2P（みぎ がわ の ボタン）", "p2", CHOICES.ch, true);
    }
    row("ステージ", "stage", CHOICES.stage);
    if (mode === "vs") body.insertAdjacentHTML("beforeend", '<p class="note">タブレットを よこむきに して、ひだり半分（はんぶん）が 1P、みぎ半分が 2P。PC は 1P: A D W ＋ F G H R、2P: ← → ↑ ＋ J K L I</p>'.replace("半分（はんぶん）", "<ruby>半分<rt>はんぶん</rt></ruby>").replace("みぎ半分", "みぎ<ruby>半分<rt>はんぶん</rt></ruby>"));
    $("#pick-go").onclick = function () {
      A.unlock();
      save.pick[mode] = sel; persist();
      var stage = sel.stage === "random" ? ["machi", "take", "yane", "tenshu", "yuu"][Math.random() * 5 | 0] : sel.stage;
      var pal2 = sel.p2 === sel.p1 ? (sel.p2 === "samurai" ? "samurai2" : "ninja4") : sel.p2;
      startBattle({ mode: mode, p1: sel.p1, p2: sel.p2, pal1: sel.p1, pal2: pal2, lv: sel.lv, stage: stage,
        n1: mode === "vs" ? "1P " + CHOICES.ch[sel.p1 === "samurai" ? 0 : 1][1] : "あなた（" + (sel.p1 === "samurai" ? "さむらい" : "にんじゃ") + "）",
        n2: mode === "vs" ? "2P " + CHOICES.ch[sel.p2 === "samurai" ? 0 : 1][1] : "CPU " + CHOICES.lv.filter(function (l) { return l[0] === sel.lv; })[0][1] });
    };
    show("pick");
  }

  // ---------- ストーリー ----------
  var storySide = "samurai";
  function openStory(side) {
    storySide = side || "samurai";
    $$(".tab").forEach(function (t) { t.setAttribute("aria-selected", String(t.getAttribute("data-side") === storySide)); });
    var S = DATA.STORY[storySide], done = save.story[storySide], ul = $("#story-list");
    ul.innerHTML = "";
    S.list.forEach(function (st, i) {
      var li = document.createElement("li");
      var b = document.createElement("button"); b.className = "st-item" + (i === done ? " next" : "");
      b.disabled = i > done;
      b.innerHTML = '<span class="no">' + (i + 1) + "</span>";
      b.appendChild(mini(st.foe, st.pal, 76));
      b.insertAdjacentHTML("beforeend", '<span class="tx"><span class="nm">' + st.name + '</span><br><span class="stg">' + D.STAGES[st.stage].name +
        '</span> <span class="lv">' + "★★★★★".slice(0, st.lv + 1) + '</span></span><span class="mark">' + (i < done ? "✅" : i === done ? "⚔️" : "🔒") + "</span>");
      b.addEventListener("click", function () { A.unlock(); startStory(storySide, i); });
      li.appendChild(b); ul.appendChild(li);
    });
    show("story");
  }
  $$(".tab").forEach(function (t) { t.addEventListener("click", function () { A.play("tap"); openStory(t.getAttribute("data-side")); }); });

  function startStory(side, i) {
    var S = DATA.STORY[side], st = S.list[i];
    startBattle({ mode: "story", side: side, idx: i, p1: S.me, p2: st.foe, pal1: S.pal, pal2: st.pal, lv: st.lv, stage: st.stage,
      n1: "あなた（" + (S.me === "samurai" ? "さむらい" : "にんじゃ") + "）", n2: st.name, say: st.say });
  }

  // ---------- ずかん ----------
  function cardArt(c, size) {
    if (typeof c.icon === "string") { var s = document.createElement("span"); s.className = "art"; s.textContent = c.icon; return s; }
    var cv = document.createElement("canvas"); cv.width = cv.height = (size || 80) * 2;
    var ctx = cv.getContext("2d"), w = cv.width, k = c.icon.draw;
    if (k === "samurai") D.portrait(cv, "samurai", "samurai");
    else if (k === "ninja") D.portrait(cv, "ninja", "ninja");
    else if (k === "bow") {
      D.portrait(cv, "samurai", "samurai", "bow");
      // おじぎ（portrait では bowK を つかう）
      ctx.clearRect(0, 0, w, w);
      ctx.save(); var s = w / 190; ctx.translate(w / 2, w - 8 * s); ctx.scale(s, s); ctx.translate(0, -SN.GROUND);
      D.drawFighter(ctx, { ch: "samurai", x: 0, y: SN.GROUND, face: 1, st: "idle", pose: "bow", bowK: 1, sf: 0, smoke: 0, inv: 0, idx: 0, onG: true }, 0, "samurai");
      ctx.restore();
    } else {
      ctx.save(); ctx.translate(w / 2, w / 2); ctx.scale(w / 160, w / 160);
      if (k === "katana") { ctx.rotate(-0.6); drawKatanaIcon(ctx); }
      else if (k === "shuriken") D.drawShuriken(ctx, 0, 0, 0.3, 4);
      else if (k === "kunai") { ctx.rotate(-0.7); ctx.scale(2.6, 2.6); kunaiIcon(ctx); }
      else if (k === "kabuto") kabutoIcon(ctx);
      else if (k === "castle") castleIcon(ctx);
      ctx.restore();
    }
    return cv;
  }
  function drawKatanaIcon(ctx) {
    ctx.lineCap = "round";
    ctx.strokeStyle = "#2b2b2b"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(-35, 0); ctx.stroke();
    ctx.fillStyle = "#c9a227"; ctx.beginPath(); ctx.ellipse(-32, 0, 5, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e9eef3"; ctx.strokeStyle = "#9aa7b4"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-28, -5); ctx.quadraticCurveTo(20, -9, 72, -16); ctx.lineTo(68, -6); ctx.quadraticCurveTo(20, 2, -28, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function kunaiIcon(ctx) {
    ctx.strokeStyle = "#555"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-14, 0, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#6b4f3a"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(2, 0); ctx.stroke();
    ctx.fillStyle = "#adb5bd"; ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(26, 0); ctx.lineTo(2, 6); ctx.closePath(); ctx.fill();
  }
  function kabutoIcon(ctx) {
    ctx.fillStyle = "#34407a"; ctx.beginPath(); ctx.arc(0, 10, 46, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#26305e"; ctx.beginPath(); ctx.moveTo(-60, 10); ctx.lineTo(60, 10); ctx.lineTo(70, 34); ctx.lineTo(-70, 34); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#e03131"; ctx.lineWidth = 3;
    for (var y = 16; y < 34; y += 8) { ctx.beginPath(); ctx.moveTo(-62, y); ctx.lineTo(62, y); ctx.stroke(); }
    ctx.fillStyle = "#f2c94c"; ctx.strokeStyle = "#b8860b"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, -20); ctx.quadraticCurveTo(-40, -50, -30, -74); ctx.quadraticCurveTo(-24, -46, 0, -30); ctx.quadraticCurveTo(24, -46, 30, -74); ctx.quadraticCurveTo(40, -50, 6, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function castleIcon(ctx) {
    ctx.fillStyle = "#8a8f98"; ctx.beginPath(); ctx.moveTo(-70, 70); ctx.lineTo(70, 70); ctx.lineTo(56, 40); ctx.lineTo(-56, 40); ctx.closePath(); ctx.fill();
    [[-48, 10, 96, 30], [-36, -24, 72, 28], [-24, -54, 48, 24]].forEach(function (r) {
      ctx.fillStyle = "#fff"; ctx.fillRect(r[0], r[1], r[2], r[3]);
      ctx.fillStyle = "#3d4a5c"; ctx.beginPath(); ctx.moveTo(r[0] - 14, r[1] + 6); ctx.lineTo(r[0] + r[2] + 14, r[1] + 6); ctx.lineTo(r[0] + r[2] - 4, r[1] - 8); ctx.lineTo(r[0] + 4, r[1] - 8); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = "#f2c94c"; ctx.fillRect(-28, -70, 6, 10); ctx.fillRect(22, -70, 6, 10);
  }

  function openZukan() {
    var box = $("#cards"); box.innerHTML = "";
    DATA.CARDS.forEach(function (c, i) {
      var have = save.cards.indexOf(c.id) >= 0;
      var b = document.createElement("button");
      b.className = "zcard " + c.side + (have ? "" : " locked");
      if (have) { b.appendChild(cardArt(c, 80)); b.insertAdjacentHTML("beforeend", "<span>" + rb(c.title) + "</span>"); }
      else b.innerHTML = '<span class="art">❓</span><span>' + (i + 1) + "ばん</span><small>" + (c.side === "samurai" ? "さむらい の みち" : "しのび の にんむ") + " で</small>";
      b.addEventListener("click", function () { A.play("tap"); if (have) openCard(c); });
      box.appendChild(b);
    });
    updateCounts();
    show("zukan");
  }
  function openCard(c, onClose) {
    var body = $("#modal-body");
    body.innerHTML = "<h3>" + rb(c.title) + "</h3>";
    var art = cardArt(c, 110); art.style.margin = "0 auto"; art.style.display = "block";
    if (art.tagName === "SPAN") { art.style.textAlign = "center"; art.style.fontSize = "64px"; }
    body.appendChild(art);
    if (c.story) body.insertAdjacentHTML("beforeend", '<div class="box story"><h4>📖 おはなし の なか では…</h4><p>' + rb(c.story) + "</p></div>");
    body.insertAdjacentHTML("beforeend", '<div class="box real"><h4>🔍 ' + (c.side === "ninja" ? "ほんとうの しのび は…" : "ほんとうは…") + "</h4>" + c.real.map(function (p) { return "<p>" + rb(p) + "</p>"; }).join("") + "</div>");
    modal([["とじる", true, onClose]]);
  }

  function openHelp() {
    var h = '<h3>あそびかた</h3>' +
      '<p>あいての たいりょく（みどりの ゲージ）を 0 に したら かち！ ひっさつ ゲージ が たまると ✨ ひっさつわざ が つかえる。</p>' +
      '<table><tr><th></th><th>さむらい</th><th>にんじゃ</th></tr>' +
      '<tr><th>うごき</th><td>ゆっくり。こうげき が つよい</td><td>すばやい。2だん ジャンプ</td></tr>' +
      '<tr><th>こうげき</th><td>きる（つづけて おすと 3れんげき）</td><td>くない（はやい れんげき）</td></tr>' +
      '<tr><th>ガード／しゅりけん</th><td>かまえ（おしている あいだ ガード。こうげきの ちょくぜんに おすと はじき返し！）</td><td>しゅりけん（3まい まで。じかんで もどる）</td></tr>' +
      '<tr><th>ひっさつ</th><td>いあい（おして ためて、はなすと いっせん。ジャンプちゅうの あいてに よく あたる）</td><td>かわりみ（こうげきを うけた しゅんかん まるたに かわって うしろへ）</td></tr>' +
      '<tr><th>けむりだま</th><td>―</td><td>ゲージ すこしで すがたが みえにくく なる</td></tr></table>' +
      '<p>🔑 かちかた の ヒント: かまえ は れんげき に つよい。しゅりけん は かまえ を けずる。うしろ に まわると かまえ は きかない。いあい は ジャンプちゅう に あたりやすい。</p>' +
      '<p>⌨️ PC: 1P は A D（いどう）W（ジャンプ）F（こうげき）G（ガード／しゅりけん）H（ひっさつ）R（けむり）。1人の ときは ← → ↑ と Z X C V でも うごく。2P は ← → ↑ と J K L I。</p>';
    $("#modal-body").innerHTML = h;
    modal([["わかった！", true]]);
  }

  // ---------- ダイアログ ----------
  function modal(btns) {
    var m = $("#modal"), box = $("#modal-btns");
    box.innerHTML = "";
    btns.forEach(function (b) {
      var el = document.createElement("button"); el.textContent = b[0]; if (b[1]) el.className = "main";
      el.addEventListener("click", function () { A.play("tap"); m.hidden = true; if (b[2]) b[2](); });
      box.appendChild(el);
    });
    m.hidden = false;
  }

  // ============================================================
  //  そうさ（がめんの ボタン・キーボード）
  // ============================================================
  var padKeys = [{}, {}];          // padKeys[p][k] = おしている ゆびの かず
  var ptrMap = {};                 // pointerId → {p, k, el}
  var keyState = {};
  var KEYS1 = { KeyA: "l", KeyD: "r", KeyW: "j", KeyF: "a", KeyG: "b", KeyH: "s", KeyR: "k" };
  var KEYS1b = { ArrowLeft: "l", ArrowRight: "r", ArrowUp: "j", Space: "j", KeyZ: "a", KeyX: "b", KeyC: "s", KeyV: "k" };
  var KEYS2 = { ArrowLeft: "l", ArrowRight: "r", ArrowUp: "j", KeyJ: "a", KeyK: "b", KeyL: "s", KeyI: "k" };

  window.addEventListener("keydown", function (e) {
    if (current !== "battle") return;
    if (e.code === "Escape" || e.code === "KeyP") { togglePause(); return; }
    keyState[e.code] = true;
    if (/^(Arrow|Space)/.test(e.code)) e.preventDefault();
  });
  window.addEventListener("keyup", function (e) { keyState[e.code] = false; });
  window.addEventListener("blur", function () { keyState = {}; padKeys = [{}, {}]; ptrMap = {}; $$(".pk.on").forEach(function (x) { x.classList.remove("on"); }); });

  function readInput(p) {
    var I = {}, k, vs = B && B.cfg.mode === "vs";
    var pk = padKeys[p];
    for (k in pk) if (pk[k] > 0) I[k] = true;
    var maps = p === 0 ? (vs ? [KEYS1] : [KEYS1, KEYS1b, KEYS2]) : (vs ? [KEYS2] : []);
    maps.forEach(function (map) { for (var c in map) if (keyState[c]) I[map[c]] = true; });
    return I;
  }

  function setPtr(id, el) {
    var old = ptrMap[id];
    if (old && old.el === el) return;
    if (old) { padKeys[old.p][old.k]--; if (padKeys[old.p][old.k] <= 0) old.el.classList.remove("on"); delete ptrMap[id]; }
    if (el) {
      var p = +el.getAttribute("data-p"), k = el.getAttribute("data-k");
      ptrMap[id] = { p: p, k: k, el: el };
      padKeys[p][k] = (padKeys[p][k] || 0) + 1;
      el.classList.add("on");
      A.unlock();
    }
  }
  function pkAt(x, y, p) {
    var el = document.elementFromPoint(x, y);
    el = el && el.closest ? el.closest(".pk") : null;
    // ゆびを すべらせても じぶんの パッドの ボタン だけ
    if (el && p !== undefined && +el.getAttribute("data-p") !== p) return null;
    return el;
  }
  var padsEl = $("#pads");
  padsEl.addEventListener("pointerdown", function (e) {
    var el = e.target.closest(".pk"); if (!el) return;
    e.preventDefault();
    setPtr(e.pointerId, el);
  });
  window.addEventListener("pointermove", function (e) {
    var cur = ptrMap[e.pointerId]; if (!cur) return;
    var el = pkAt(e.clientX, e.clientY, cur.p);
    // ← → の あいだ だけ すべらせて きりかえ られる。ほかは はなれるまで おしっぱなし
    if (el && el !== cur.el && (cur.k === "l" || cur.k === "r") && (el.getAttribute("data-k") === "l" || el.getAttribute("data-k") === "r")) setPtr(e.pointerId, el);
  });
  ["pointerup", "pointercancel"].forEach(function (t) { window.addEventListener(t, function (e) { setPtr(e.pointerId, null); }); });
  padsEl.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  function buildPads(cfg) {
    padsEl.innerHTML = "";
    padsEl.className = "pads" + (cfg.mode === "vs" ? " vs" : "");
    padKeys = [{}, {}]; ptrMap = {};
    var players = cfg.mode === "vs" ? [0, 1] : [0];
    players.forEach(function (p) {
      var ch = p === 0 ? cfg.p1 : cfg.p2, sam = ch === "samurai";
      var pad = document.createElement("div"); pad.className = "pad p" + (p + 1) + "c";
      var mv = document.createElement("div"); mv.className = "grp mv";
      var acts = document.createElement("div"); acts.className = "grp acts";
      function btn(parent, k, label, icon, sub) {
        var b = document.createElement("button"); b.className = "pk"; b.setAttribute("data-k", k); b.setAttribute("data-p", p);
        b.setAttribute("aria-label", label);
        b.innerHTML = (icon ? '<span class="i">' + icon + "</span>" : "") + "<span>" + label + "</span>" + (sub ? "<small>" + sub + "</small>" : "");
        parent.appendChild(b); return b;
      }
      btn(mv, "l", "◀", ""); btn(mv, "r", "▶", "");
      btn(acts, "j", "ジャンプ", "⤴️");
      btn(acts, "a", sam ? "きる" : "くない", sam ? "⚔️" : "🗡️");
      btn(acts, "b", sam ? "かまえ" : "しゅりけん", sam ? "🛡️" : "✴️");
      btn(acts, "s", sam ? "いあい" : "かわりみ", "✨", "ひっさつ");
      if (!sam) btn(acts, "k", "けむりだま", "💨");
      pad.appendChild(mv); pad.appendChild(acts);
      padsEl.appendChild(pad);
    });
    // こがおの ボタン に ラベルを みじかく
    $$(".pk[data-k=l]").forEach(function (b) { b.querySelector("span").textContent = "◀"; });
    $$(".pk[data-k=r]").forEach(function (b) { b.querySelector("span").textContent = "▶"; });
  }

  // ============================================================
  //  たたかい
  // ============================================================
  var B = null, raf = 0, last = 0, acc = 0, paused = false;
  var cv = $("#cv"), ctx = cv.getContext("2d"), view = { w: 1000, scale: 1, dpr: 1 };

  function startBattle(cfg) {
    var m = SN.createMatch({ p1: cfg.p1, p2: cfg.p2 });
    B = {
      cfg: cfg, m: m, phase: "intro", pt: 0, t: 0,
      cpu: cfg.mode === "vs" ? null : new AI.CPU(1, cfg.lv, (Date.now() & 0xffff) + 1),
      fx: new D.Effects(), cam: 700 - view.w / 2, shake: 0, banner: ""
    };
    m.fighters.forEach(function (f) { f.pose = "idle"; f.bowK = 0; });
    buildPads(cfg);
    for (var i = 0; i < 2; i++) $("#hud" + i + " .nm").textContent = i ? cfg.n2 : cfg.n1;
    $("#hint").innerHTML = cfg.mode === "vs" ? "" : hintText(cfg.p1);
    show("battle");
    resize();
    B.cam = clampCam(700 - view.w / 2);
    paused = false;
    B.song = cfg.stage === "yane" || cfg.stage === "take" ? 1 : 0;
    A.startBgm(B.song);
    startLoop();
  }
  function hintText(ch) {
    return ch === "samurai"
      ? "🛡️ かまえ は れんげき に つよい。あいてが こうげき する ちょくぜんに おすと はじき返す！<br>✨ ゲージが たまったら いあい（おして ためて、はなす）"
      : "✴️ しゅりけん で かまえ を けずろう。2だん ジャンプ で うしろに まわりこむ！<br>✨ かわりみ は こうげきを うける まえに つかう";
  }

  function clampCam(x) { return Math.max(0, Math.min(SN.ARENA_W - view.w, x)); }

  function resize() {
    if (current !== "battle") return;
    var wrap = $("#stage-wrap"), aw = wrap.clientWidth, ah = wrap.clientHeight;
    if (!aw || !ah) return;
    var portrait = window.innerHeight > window.innerWidth * 1.15;
    // たてスマホは ステージを うえに ちいさく（ボタンの ばしょを ひろく）
    if (portrait) ah = Math.min(ah, aw * 0.75);
    var vw = Math.max(760, Math.min(1000, 500 * aw / ah));
    var cw = Math.min(aw, ah * vw / 500), ch = cw * 500 / vw;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = cw + "px"; cv.style.height = ch + "px";
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    view.w = vw; view.scale = cv.width / vw; view.dpr = dpr;
  }
  window.addEventListener("resize", function () { resize(); });
  window.addEventListener("orientationchange", function () { setTimeout(resize, 200); });

  function startLoop() { cancelAnimationFrame(raf); last = performance.now(); acc = 0; raf = requestAnimationFrame(loop); }
  function stopLoop() { cancelAnimationFrame(raf); raf = 0; if (A) A.stopBgm(); }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!paused) {
      acc += dt;
      var n = 0;
      while (acc >= 1 / 60 && n < 5) { tick(); acc -= 1 / 60; n++; }
      if (n === 5) acc = 0;
    }
    render();
  }

  function setBanner(s) {
    var b = $("#banner");
    if (s === B.banner) return;
    B.banner = s;
    if (s) { b.textContent = s; b.classList.add("show"); } else b.classList.remove("show");
  }

  function tick() {
    var m = B.m, F = m.fighters, cfg = B.cfg;
    B.t++; B.pt++;
    B.fx.update();
    if (B.shake > 0) B.shake *= 0.85;
    if (B.phase === "intro") {
      var talk = cfg.say ? 110 : 0, pt = B.pt;
      var bowA = talk + 10, bowB = talk + 90;
      F.forEach(function (f) {
        f.pose = pt >= bowA && pt < bowB ? "bow" : "idle";
        f.bowK = pt < bowA ? 0 : pt < bowA + 20 ? (pt - bowA) / 20 : pt < bowB - 20 ? 1 : Math.max(0, (bowB - pt) / 20);
      });
      if (pt === bowA + 4) { setBanner("れい！"); A.play("don"); }
      if (pt === bowB) setBanner("");
      if (pt === bowB + 10) { setBanner("はじめ！"); A.play("hajime"); }
      if (pt >= bowB + 40) { setBanner(""); B.phase = "fight"; B.pt = 0; F.forEach(function (f) { f.pose = null; }); }
    } else if (B.phase === "fight") {
      var in0 = readInput(0), in1 = B.cpu ? B.cpu.input(m) : readInput(1);
      var before = F.map(function (f) { return f.st + ":" + f.mvName; });
      SN.step(m, [in0, in1]);
      F.forEach(function (f, i) {
        if (f.st === "atk" && f.sf === 1 && before[i] !== "atk:" + f.mvName) A.play("slash");
      });
      m.events.forEach(onEvent);
      if (m.over) { B.phase = "ko"; B.pt = 0; }
    } else if (B.phase === "ko") {
      SN.step(m, [{}, {}]);
      var w = m.winner;
      F.forEach(function (f, i) { f.pose = (w === -1 || i !== w) ? "kneel" : "idle"; f.vx = 0; });
      if (B.pt === 1) setBanner(m.reason === "time" ? "そこまで！" : "");
      if (B.pt === 60) setBanner("");
      if (B.pt >= 150) {
        B.phase = "rei"; B.pt = 0;
        var c = (F[0].x + F[1].x) / 2;
        c = Math.max(SN.XMIN + 130, Math.min(SN.XMAX - 130, c));
        B.reiFrom = [F[0].x, F[1].x];
        var left = F[0].x <= F[1].x ? 0 : 1;
        B.reiTo = []; B.reiTo[left] = c - 120; B.reiTo[1 - left] = c + 120;
      }
    } else if (B.phase === "rei") {
      SN.step(m, [{}, {}]);
      var p = B.pt, k = Math.min(1, p / 40);
      F.forEach(function (f, i) {
        f.y = SN.GROUND; f.onG = true;
        f.x = B.reiFrom[i] + (B.reiTo[i] - B.reiFrom[i]) * k;
        f.face = F[1 - i].x > f.x ? 1 : -1;
        f.smoke = 0; f.inv = 0;
        if (p < 40) { f.pose = Math.abs(B.reiTo[i] - B.reiFrom[i]) > 8 ? "walk" : "idle"; f.bowK = 0; }
        else { f.pose = "bow"; f.bowK = p < 60 ? (p - 40) / 20 : p < 110 ? 1 : Math.max(0, (130 - p) / 20); }
      });
      if (p === 44) { setBanner("れい！"); A.play("don"); }
      if (p === 120) setBanner("");
      if (p >= 140) { B.phase = "result"; showResult(); }
    }
    // カメラ
    var mid = (F[0].x + F[1].x) / 2;
    B.cam += (clampCam(mid - view.w / 2) - B.cam) * 0.15;
    updateHud();
  }

  function onEvent(e) {
    var fx = B.fx;
    switch (e.t) {
      case "hit":
        fx.burst(e.x, e.y, e.dmg >= 12 ? 14 : 7, e.iai ? "#fff3bf" : "#ffd43b", e.dmg >= 12 ? 7 : 4.5);
        fx.text(e.x, e.y - 40, e.iai ? "ズバッ！" : e.shot ? "カッ！" : e.dmg >= 12 ? "ドカッ！" : "ポカッ", e.iai ? "#ffe066" : "#fff", e.iai ? 46 : e.dmg >= 12 ? 40 : 30);
        A.play("hit", e.dmg >= 12);
        if (e.dmg >= 12) B.shake = 10;
        break;
      case "kin": fx.burst(e.x, e.y, 5, "#fff", 4); fx.text(e.x, e.y - 30, "キン！", "#e7f5ff", 34); A.play("kin"); break;
      case "parry": fx.ring(e.x, e.y, "#ffe066"); fx.burst(e.x, e.y, 10, "#ffe066", 6); fx.text(e.x, e.y - 40, "はじいた！", "#ffe066", 40); A.play("parry"); break;
      case "reflect": fx.text(e.x, e.y - 30, "はねかえした！", "#ffe066", 34); break;
      case "break": fx.burst(e.x, e.y, 10, "#adb5bd", 5); fx.text(e.x, e.y - 30, "かまえが くずれた！", "#ffc9c9", 30); A.play("brk"); break;
      case "throw": A.play("shu"); fx.text(e.x, e.y - 30, "シュッ", "#e9ecef", 24); break;
      case "doron": fx.smoke(e.x, e.y, 16, 26); fx.text(e.x, e.y - 60, "ドロン！", "#d0bfff", 42); A.play("doron"); break;
      case "smoke": fx.smoke(e.x, e.y, 22, 30); fx.text(e.x, e.y - 60, "ドロン", "#e9ecef", 34); A.play("doron"); break;
      case "jump": if (e.n === 2) { fx.ring(e.x, e.y, "rgba(255,255,255,0.7)"); } A.play("jump"); break;
      case "land": fx.dust(e.x, e.y); break;
      case "charge": fx.text(e.x, e.y - 70, "いあい…", "#ffe066", 30); A.play("charge"); break;
      case "iai": A.play("zuba"); B.shake = 6; break;
      case "kawaReady": fx.text(e.x, e.y - 70, "かわりみ の じゅつ！", "#b2f2bb", 28); A.play("seal"); break;
      case "ko": A.play("don"); B.shake = 12; break;
    }
  }

  function updateHud() {
    var F = B.m.fighters;
    for (var i = 0; i < 2; i++) {
      var f = F[i], el = $("#hud" + i);
      var hpK = Math.max(0, f.hp / f.C.hp);
      el.querySelector(".hp i").style.width = (hpK * 100).toFixed(1) + "%";
      el.querySelector(".hp").classList.toggle("low", hpK < 0.3);
      el.querySelector(".sp i").style.width = f.sp.toFixed(1) + "%";
      el.querySelector(".sp").classList.toggle("full", f.sp >= 100);
      var sub = f.C.guard ? "🛡️ かまえ " + "■■■■■".slice(0, Math.ceil(f.gp / 20)) + "□□□□□".slice(0, 5 - Math.ceil(f.gp / 20))
        : "✴️ " + "●●●".slice(0, f.stock) + "○○○".slice(0, 3 - f.stock) + (f.smoke > 0 ? " 💨" : "");
      el.querySelector(".sub").textContent = sub;
      var pad = padsEl.children[B.cfg.mode === "vs" ? i : 0];
      if (pad && (i === 0 || B.cfg.mode === "vs")) {
        var s = pad.querySelector('[data-k="s"]'); if (s) s.classList.toggle("ready", f.sp >= 100);
        var b = pad.querySelector('[data-k="b"]'); if (b && f.C.shuriken) b.classList.toggle("dim", f.stock <= 0);
        var k = pad.querySelector('[data-k="k"]'); if (k) k.classList.toggle("dim", f.sp < 40 || f.smoke > 0);
      }
    }
    if (B.phase === "fight" || B.phase === "intro") $("#timer").textContent = Math.max(0, Math.ceil((B.m.time - B.m.frame) / 60));
  }

  function render() {
    if (!B) return;
    var m = B.m, F = m.fighters, t = B.t / 60;
    ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    var sx = B.shake > 0.5 ? (Math.random() - 0.5) * B.shake : 0, sy = B.shake > 0.5 ? (Math.random() - 0.5) * B.shake : 0;
    ctx.save();
    ctx.translate(-B.cam + sx, sy);
    D.drawStage(ctx, B.cfg.stage, B.cam, view.w, t);
    m.logs.forEach(function (l) { D.drawLog(ctx, l); });
    B.fx.draw(ctx, false);
    // こうげき している ほうを てまえに
    var order = (F[0].st === "atk" || F[0].st === "iai") && !(F[1].st === "atk" || F[1].st === "iai") ? [1, 0] : [0, 1];
    order.forEach(function (i) { D.drawFighter(ctx, F[i], t, i ? B.cfg.pal2 : B.cfg.pal1); });
    m.shots.forEach(function (p) { D.drawShuriken(ctx, p.x, p.y, p.rot, 1.2); });
    B.fx.draw(ctx, true);
    // ふきだし
    if (B.phase === "intro" && B.cfg.say && B.pt < 110) D.bubble(ctx, F[1].x, F[1].y - 175, B.cfg.say);
    if ((B.phase === "ko" && B.pt > 20) || (B.phase === "rei" && B.pt < 30)) {
      F.forEach(function (f, i) { if (f.pose === "kneel") D.bubble(ctx, f.x, f.y - 150, "まいった！"); });
    }
    ctx.restore();
  }

  // ---------- けっか ----------
  function showResult() {
    var m = B.m, cfg = B.cfg, w = m.winner, body = $("#modal-body");
    var youWin = w === 0, html = "";
    var winSide = w < 0 ? null : (w === 0 ? cfg.p1 : cfg.p2);
    if (cfg.mode === "vs") {
      html = '<p class="result-big">' + (w < 0 ? "ひきわけ！" : (w === 0 ? "1P" : "2P") + " の かち！") + "</p>";
    } else {
      html = '<p class="result-big">' + (w < 0 ? "ひきわけ！" : youWin ? "かち！" : "まけちゃった…") + "</p>";
      if (!youWin) html += '<p class="center">' + (cfg.p1 === "samurai" ? "🛡️ れんげき には かまえ、とびこんで きたら いあい！" : "✴️ とおくから しゅりけん、ちかづいたら ジャンプで うしろへ！") + "</p>";
    }
    body.innerHTML = html;
    if (winSide) body.insertBefore(mini(winSide, w === 0 ? cfg.pal1 : cfg.pal2, 110, "win"), body.firstChild);
    var btns = [];
    if (cfg.mode === "story") {
      var S = DATA.STORY[cfg.side];
      if (youWin) {
        var st = S.list[cfg.idx];
        if (save.story[cfg.side] < cfg.idx + 1) save.story[cfg.side] = cfg.idx + 1;
        var card = DATA.CARDS.filter(function (c) { return c.id === st.card; })[0];
        var fresh = card && save.cards.indexOf(card.id) < 0;
        if (fresh) save.cards.push(card.id);
        persist();
        if (card) {
          body.insertAdjacentHTML("beforeend", '<div class="getcard">' + (fresh ? "🎴 ずかん カード を てに いれた！<br>" : "🎴 ずかん カード: ") + "「" + rb(card.title) + "」</div>");
          btns.push(["カードを みる", false, function () { openCard(card, function () { showResult(); }); }]);
        }
        if (cfg.idx + 1 < S.list.length) btns.push(["つぎへ ▶", true, function () { startStory(cfg.side, cfg.idx + 1); }]);
        else body.insertAdjacentHTML("beforeend", '<p class="center">🎉 ' + S.title + " を ぜんぶ クリア！ おめでとう！</p>");
      }
      btns.push(["もういちど", !youWin, function () { startStory(cfg.side, cfg.idx); }]);
      btns.push(["ストーリーへ", false, function () { openStory(cfg.side); }]);
      if (youWin) A.play("win"); else A.play("lose");
    } else {
      btns.push(["もういちど", true, function () { startBattle(cfg); }]);
      btns.push(["メニューへ", false, function () { show("title"); }]);
      if (cfg.mode === "vs" || youWin) A.play("win"); else A.play("lose");
    }
    A.stopBgm();
    modal(btns);
  }

  // ---------- ちょっと まって ----------
  function togglePause() {
    if (!B || B.phase === "result") return;
    paused = !paused;
    if (paused) {
      A.stopBgm();
      $("#modal-body").innerHTML = '<h3>ちょっと まって</h3><p class="center">' + (save.snd ? "🔊 おと オン" : "🔇 おと オフ") + "</p>";
      modal([["つづける", true, function () { paused = false; last = performance.now(); A.startBgm(B.song); }],
        [save.snd ? "🔇 おとを けす" : "🔊 おとを だす", false, function () { save.snd = !save.snd; persist(); A.setOn(save.snd); syncTogs(); paused = false; togglePause(); }],
        ["やめる", false, function () { paused = false; B = null; show("title"); }]]);
    }
  }
  function syncTogs() { $$(".tog[data-tog]").forEach(function (b) { b.setAttribute("aria-pressed", String(save[b.getAttribute("data-tog")])); }); }
  $("#pause-btn").addEventListener("click", function () { togglePause(); });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && current === "battle" && B && !paused && B.phase !== "result") togglePause();
  });

  // テスト よう
  window.__sn = { get B() { return B; }, startBattle: startBattle, save: save, show: show, openStory: openStory, openZukan: openZukan, readInput: readInput, openCard: openCard };

  show("title");
})();
