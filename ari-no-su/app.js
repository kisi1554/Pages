/* ありの す たんけん ｜ がめんの そうさ・ほぞん・ループ */
(function () {
  "use strict";
  const ARI = window.ARI;
  const Sim = ARI.Sim, R = ARI.Render, Snd = ARI.Sound;
  const KEY = "ari-no-su-v1";
  const KEY_SET = "ari-no-su-settings";
  const $ = id => document.getElementById(id);

  let S = null;
  const ui = { food: "sugar", loupe: false, pher: false, speed: 1, bubble: null, ripples: [] };
  let paused = false;

  // ---------------------------------------------------------------- ほぞん
  function loadJSON(k) {
    try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function saveJSON(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ほぞん できなくても あそべる */ }
  }
  function save() { if (S && !paused && !S.quiet) saveJSON(KEY, Sim.serialize(S)); }
  function saveSettings() { saveJSON(KEY_SET, { sound: Snd.on, food: ui.food }); }

  // ---------------------------------------------------------------- はじめる
  function start(species, keepBadges) {
    const old = S;
    S = Sim.create(species);
    if (keepBadges && old) S.badges = Object.assign({}, old.badges);
    R.reset();
    Sim.alloc(S);
    save();
    renderStats(true);
  }

  // とじて いた じかんぶん すこし すすめる（うえかぎり あり）
  function catchUp(savedAt, done) {
    const away = (Date.now() - (savedAt || Date.now())) / 1000;
    if (away < 60) return done(null);
    const gameSec = Math.min(150, away / 20);
    let ticks = Math.round(gameSec * 30);
    const before = Sim.stats(S);
    S.food = Math.min(300, S.food + Math.min(12, away / 300));
    S.quiet = true;
    $("busy").hidden = false;
    paused = true;
    const chunk = () => {
      for (let n = 0; n < 600 && ticks > 0; n++, ticks--) Sim.step(S);
      if (ticks > 0) return setTimeout(chunk, 0);
      S.quiet = false;
      S.ev.length = 0; S.msgs.length = 0;
      for (const a of S.ants) { a.px = a.x; a.py = a.y; }
      $("busy").hidden = true;
      paused = false;
      const after = Sim.stats(S);
      done({ away, before, after });
    };
    setTimeout(chunk, 30);
  }

  function welcomeBack(r) {
    if (!r) return;
    const dw = r.after.workers - r.before.workers;
    const db = (r.after.egg + r.after.larva + r.after.pupa) - (r.before.egg + r.before.larva + r.before.pupa);
    const h = r.away >= 3600 ? Math.floor(r.away / 3600) + "じかん" : Math.max(1, Math.floor(r.away / 60)) + "ふん";
    let t = "おかえり！ " + h + " とじて いた あいだに ";
    if (dw > 0) t += "なかまが " + dw + "ひき ふえたよ";
    else if (db > 0) t += "たまごや ようちゅうが ふえたよ";
    else t += "ありたちは すの なかで くらして いたよ";
    toast(t, 5000);
  }

  // ---------------------------------------------------------------- おしらせ
  let toastTimer = 0;
  const toastQ = [];
  function toast(text, ms) {
    toastQ.push({ text, ms: ms || 3200 });
    if (!toastTimer) nextToast();
  }
  function nextToast() {
    const el = $("toast");
    const m = toastQ.shift();
    if (!m) { el.hidden = true; toastTimer = 0; return; }
    el.textContent = m.text; el.hidden = false;
    $("hint").hidden = true;
    toastTimer = setTimeout(nextToast, toastQ.length > 2 ? 1400 : m.ms);
  }

  // ---------------------------------------------------------------- じょうたい の ひょうじ
  let lastStatKey = "";
  function renderStats(force) {
    const st = Sim.stats(S);
    const key = [st.workers, st.egg, st.larva, st.pupa, st.rooms, Math.floor(st.food), st.season, st.line, st.males + st.gynes].join(",");
    if (!force && key === lastStatKey) return;
    lastStatKey = key;
    const cells = [
      ["🐜", "はたらきあり", st.workers],
      ["🥚", "たまご", st.egg],
      ["🐛", "ようちゅう", st.larva],
      ["🟤", "さなぎ", st.pupa],
      ["🏠", "へや", st.rooms + "/" + st.roomTotal],
      ["🍯", "えさ", Math.floor(st.food)],
      ["📅", "きせつ", st.season, "season"],
      st.males + st.gynes ? ["🪽", "はねあり", st.males + st.gynes] : ["👃", "ぎょうれつ", st.line],
    ];
    $("stats").innerHTML = cells.map(c => '<div class="stat' + (c[3] ? " " + c[3] : "") + '"><span class="v">' + c[0] + " " + c[2] + '</span><span class="k">' + c[1] + "</span></div>").join("");
    $("winterEm").textContent = S.winter ? "🌸" : "❄️";
    $("winterLbl").textContent = S.winter ? "はるに する" : "ふゆ";
    $("evRain").disabled = S.winter || !!S.rain;
    $("evEnemy").disabled = S.winter;
    const nb = Object.keys(S.badges).length;
    $("badgeCount").hidden = !nb;
    $("badgeCount").textContent = nb;
  }

  // ---------------------------------------------------------------- できごと → おと・おしらせ
  function handleEvents() {
    for (const e of S.ev) {
      if (e.k === "dig") Snd.dig();
      else if (e.k === "find") Snd.find();
      else if (e.k === "place") Snd.place();
      else if (e.k === "born") Snd.born();
      else if (e.k === "room") Snd.room();
      else if (e.k === "rain") Snd.rain();
      else if (e.k === "winter") Snd.winter();
      else if (e.k === "flight") Snd.flight();
      else if (e.k === "badge") {
        Snd.badge();
        const b = ARI.BADGES.find(x => x.id === e.id);
        if (b) toast("🏅 バッジ「" + b.name + "」を もらった！", 3600);
      }
    }
    S.ev.length = 0;
    for (const m of S.msgs) toast(m.text);
    S.msgs.length = 0;
  }

  // ---------------------------------------------------------------- タップ
  function onTap(e) {
    Snd.ensure();
    const r = $("cv").getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    const w = R.toWorld(cx, cy);
    const sc = R.scale();
    const a = Sim.antAt(S, w.x, w.y, Math.max(2.4, 18 / sc));
    $("hint").hidden = true;
    if (a) {
      Snd.tap();
      if (ui.loupe) openLoupe(a);
      else ui.bubble = { id: a.id, until: performance.now() + 4000 };
      return;
    }
    if (w.y < Sim.SURF + 1.5) {
      const res = Sim.placeFood(S, w.x, ui.food);
      ui.ripples.push({ x: cx, y: cy, t: performance.now() });
      if (res === "winter") toast("ふゆは ありが そとに でないよ。はるまで まってね");
      else if (res === "rain") toast("あめが やんだら とりに くるよ");
      else if (!S.badges.line && !S._placedOnce) { S._placedOnce = true; toast("えさを おいたよ。ありが みつけるまで まってね"); }
      return;
    }
    toast("ここは つちの なか。えさは じめんの うえに おいてね", 2200);
  }

  // ---------------------------------------------------------------- むしめがね
  function openLoupe(a) {
    Sim.badge(S, "loupe");
    const info = ARI.KIND_INFO[a.kind] || ARI.KIND_INFO.worker;
    const sp = ARI.SPECIES.find(x => x.id === S.species);
    $("loupeTitle").textContent = "🔍 " + info.title + "（" + sp.name + "）";
    $("loupeNow").textContent = "いま: " + Sim.stateText(S, a);
    $("loupeText").textContent = info.text;
    const c = $("loupeCv"), g = c.getContext("2d");
    const w = c.width, h = c.height;
    g.clearRect(0, 0, w, h);
    const bx = w * 0.17, by = h * 0.16, bw = w * 0.66, bh = h * 0.68;
    g.save(); g.translate(bx, by);
    const k = R.drawBig(g, bw, bh, a.kind, S.species);
    g.restore();
    const cx = bx + bw * 0.47, cy = by + bh * 0.5;
    const P = (x, y) => [cx + x * k, cy + y * k];
    const qn = a.kind === "queen" || a.kind === "gyne";
    const labels = [
      ["しょっかく", P(6.2, -0.9), [w * 0.82, h * 0.1]],
      ["あたま", P(2.9, 0.3), [w * 0.84, h * 0.88]],
      ["むね", P(0.75, -0.5), [w * 0.5, h * 0.08]],
      ["はら", P(qn ? -3.3 : -2.8, 0.6), [w * 0.15, h * 0.88]],
      ["あし（6ぽん）", P(0.8, 3.3), [w * 0.5, h * 0.93]],
    ];
    if (a.kind === "male" || a.kind === "gyne") labels.push(["はね", P(-4.5, -1.6), [w * 0.15, h * 0.1]]);
    g.font = "bold 30px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    for (const [t, p, q] of labels) {
      g.strokeStyle = "#a04a1a"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
      g.fillStyle = "#a04a1a"; g.beginPath(); g.arc(p[0], p[1], 6, 0, 7); g.fill();
      const tw = g.measureText(t).width + 18;
      g.fillStyle = "rgba(255,255,255,.95)"; g.fillRect(q[0] - tw / 2, q[1] - 20, tw, 40);
      g.strokeRect(q[0] - tw / 2, q[1] - 20, tw, 40);
      g.fillStyle = "#3a2614"; g.fillText(t, q[0], q[1] + 1);
    }
    openModal("mLoupe");
  }

  // ---------------------------------------------------------------- ずかん・きろく
  function openZukan() {
    const list = $("zukanList");
    list.innerHTML = ARI.SPECIES.map((sp, i) =>
      '<div class="zcard' + (sp.play ? " play" : "") + '"><canvas width="360" height="150" data-i="' + i + '"></canvas>' +
      '<div class="zn">' + sp.name + (sp.id === S.species ? '<span class="tag">いま そだてている</span>' : sp.play ? '<span class="tag">そだてられる</span>' : "") + "</div>" +
      '<div class="zs">おおきさ ' + sp.size + "・" + sp.where + "</div>" +
      '<p class="zo">' + sp.one + (sp.more ? "<br>" + sp.more : "") + "</p></div>").join("");
    list.querySelectorAll("canvas").forEach(c => {
      const sp = ARI.SPECIES[+c.dataset.i];
      const look = Object.assign({ leg: sp.look.body, shine: "rgba(255,240,220,.22)" }, sp.look);
      R.drawBig(c.getContext("2d"), c.width, c.height, "worker", "kurooo",
        { look, head: sp.look.head, thorax: sp.look.thorax, gaster: sp.look.gaster, waist: sp.look.waist, bigHead: sp.bigHead, spines: sp.spines });
    });
    openModal("mZukan");
  }

  function openRec() {
    const st = Sim.stats(S), rec = S.rec;
    const min = Math.floor(rec.playT / 60);
    const sp = ARI.SPECIES.find(x => x.id === S.species);
    const items = [
      ["🐜", "いまの はたらきあり", st.workers + "ひき"],
      ["🏆", "いちばん おおかった とき", rec.maxAnts + "ひき"],
      ["🏠", "へやの かず", st.rooms + " / " + st.roomTotal],
      ["🐣", "うまれた なかま", rec.born + "ひき"],
      ["🐜🐜", "いちばん ながい ぎょうれつ", rec.lineMax + "ひき"],
      ["⏱️", "そだてた じかん", min + "ふん"],
      ["📅", "なんねんめ", S.year + "ねんめ・" + st.season],
      ["🔬", "しゅるい", sp.name],
    ];
    $("recList").innerHTML = items.map(c => '<div class="stat"><span class="v">' + c[0] + " " + c[2] + '</span><span class="k">' + c[1] + "</span></div>").join("");
    $("badgeList").innerHTML = ARI.BADGES.map(b => {
      const got = !!S.badges[b.id];
      return '<div class="badge' + (got ? "" : " no") + '"><span class="be">' + (got ? b.emoji : "❔") + '</span><span class="bn">' + b.name + '</span><br><span class="bd">' + b.desc + "</span></div>";
    }).join("");
    openModal("mRec");
  }

  function openModal(id) { $(id).hidden = false; }
  function closeModals() { document.querySelectorAll(".modal").forEach(m => { if (m.id !== "mStart" || S) m.hidden = true; }); }

  // ---------------------------------------------------------------- ボタン
  function bind() {
    $("cv").addEventListener("pointerdown", e => { if (S && !paused) onTap(e); });
    document.querySelectorAll(".pick").forEach(b => b.addEventListener("click", () => {
      ui.food = b.dataset.food;
      document.querySelectorAll(".pick").forEach(o => o.classList.toggle("on", o === b));
      saveSettings();
    }));
    $("btnLoupe").addEventListener("click", () => {
      ui.loupe = !ui.loupe;
      $("btnLoupe").setAttribute("aria-pressed", ui.loupe);
      toast(ui.loupe ? "むしめがね: ありを タップすると おおきく みえるよ" : "むしめがね おしまい", 2200);
    });
    $("btnPher").addEventListener("click", () => {
      ui.pher = !ui.pher;
      $("btnPher").setAttribute("aria-pressed", ui.pher);
      if (ui.pher) toast("ピンクの ところが においの みち。じかんが たつと きえるよ", 2600);
    });
    $("btnSpeed").addEventListener("click", () => {
      ui.speed = ui.speed === 1 ? 2 : ui.speed === 2 ? 4 : 1;
      $("speedLbl").textContent = "はやさ ×" + ui.speed;
    });
    $("evRain").addEventListener("click", () => { Snd.ensure(); if (!Sim.startRain(S)) toast("いまは あめを ふらせられないよ"); });
    $("evEnemy").addEventListener("click", () => { Snd.ensure(); if (!Sim.spawnHazard(S)) toast("いまは てきが こないよ"); });
    $("evWinter").addEventListener("click", () => { Snd.ensure(); Sim.setSeason(S, S.winter ? 0 : 3); renderStats(true); });
    $("btnSound").addEventListener("click", () => {
      Snd.on = !Snd.on;
      $("btnSound").textContent = Snd.on ? "🔊" : "🔇";
      if (Snd.on) { Snd.ensure(); Snd.tap(); }
      saveSettings();
    });
    $("btnZukan").addEventListener("click", openZukan);
    $("btnRec").addEventListener("click", openRec);
    $("btnHelp").addEventListener("click", () => { $("startPick").hidden = true; $("startClose").hidden = false; openModal("mStart"); });
    $("startClose").addEventListener("click", closeModals);
    $("btnReset").addEventListener("click", () => { closeModals(); openModal("mConfirm"); });
    document.querySelectorAll("[data-species]").forEach(b => b.addEventListener("click", () => {
      Snd.ensure();
      start(b.dataset.species, true);
      closeModals();
      $("mStart").hidden = true;
      toast("じょおうあり 1ぴきと はたらきあり 5ひきの すだよ。じめんの うえに えさを おいてみよう", 4200);
    }));
    document.querySelectorAll(".modal .close").forEach(b => b.addEventListener("click", closeModals));
    document.querySelectorAll(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m && S) closeModals(); }));
    window.addEventListener("resize", () => R.resize());
    document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
    window.addEventListener("pagehide", save);
    setInterval(save, 10000);
  }

  // ---------------------------------------------------------------- ループ
  let last = performance.now(), acc = 0, statT = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (S && !paused) {
      acc += dt * ui.speed;
      let n = 0;
      while (acc >= Sim.TICK && n < 16) { Sim.step(S); acc -= Sim.TICK; n++; }
      if (n >= 16) acc = 0;
      handleEvents();
      R.draw(S, ui, Math.min(1, acc / Sim.TICK));
      statT += dt;
      if (statT > 0.4) { statT = 0; renderStats(); }
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- きどう
  function boot() {
    const set = loadJSON(KEY_SET) || {};
    Snd.on = set.sound !== false;
    $("btnSound").textContent = Snd.on ? "🔊" : "🔇";
    if (set.food) {
      ui.food = set.food;
      document.querySelectorAll(".pick").forEach(o => o.classList.toggle("on", o.dataset.food === ui.food));
    }
    R.init($("cv"));
    bind();
    const saved = loadJSON(KEY);
    let restored = null;
    try { restored = saved ? Sim.deserialize(saved) : null; } catch (e) { restored = null; }
    if (restored) {
      S = restored;
      renderStats(true);
      catchUp(saved.savedAt, r => { welcomeBack(r); renderStats(true); save(); });
    } else {
      openModal("mStart");
      // うしろで うごいている すがたを みせておく
      S = Sim.create("kurooo");
      S.quiet = true;
      Sim.alloc(S);
      paused = false;
      renderStats(true);
    }
    requestAnimationFrame(frame);
  }

  // テスト・デバッグ よう
  window.__ari = {
    get S() { return S; },
    step(n) { for (let i = 0; i < n; i++) Sim.step(S); handleEvents(); },
    spawn(n) { for (let i = 0; i < n; i++) { const p = Sim.slot(S, 1); const a = Sim.makeAnt(S, "worker", p.x, p.y); a.age = 100 + i; S.ants.push(a); } Sim.alloc(S); },
    food(x, t) { return Sim.placeFood(S, x, t || "sugar"); },
    save, ui,
  };

  boot();
})();
