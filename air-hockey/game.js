// エアホッケー — がめんの すすめかた・ゆびの そうさ（マルチタッチ）・おと・ぶるっ・ほぞん
(function () {
  "use strict";
  const P = window.AHPhys, S = window.AHSim, A = window.AHAI, R = window.AHRender, AU = window.AHAudio;
  const sfx = AU.sfx;
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const SPEED = Math.max(0.1, Math.min(8, Number(qs.get("speed")) || 1));   // テスト用: しあいを はやく する
  const KEY = "air-hockey-v1";

  // ===== ほぞん =====
  let save = {
    mode: "duo", level: 1, target: 7, items: 1, theme: "normal", sound: true, vib: true, shake: true,
    rec: { duo: [0, 0], cpu: [[0, 0], [0, 0], [0, 0], [0, 0]], games: 0 },
  };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s && typeof s === "object") {
      save = Object.assign(save, s);
      if (!save.rec || !Array.isArray(save.rec.cpu) || save.rec.cpu.length !== 4) save.rec = { duo: [0, 0], cpu: [[0, 0], [0, 0], [0, 0], [0, 0]], games: 0 };
    }
  } catch (e) { /* よめなくても あそべる */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* むし */ } }
  AU.set(save.sound);

  // ===== がめん =====
  const cv = $("cv");
  R.init(cv);
  R.setTheme(save.theme);
  R.setShake(save.shake);

  let G = null, demo = null, paused = false, cfgLast = null, overShown = false;
  let bigText = "";
  function labels(mode, level) {
    const lv = A.LEVELS[level];
    if (mode === "cpu") return ["きみ", "CPU " + lv.em];
    if (mode === "watch") return ["CPU " + lv.em, "CPU " + lv.em];
    return ["あお", "あか"];
  }

  function newDemo() {
    demo = S.createGame({ target: 99, ctrl: ["cpu", "cpu"], levels: [2, 2], items: false, seed: 3 });
  }

  // ===== しあい =====
  function start(cfg) {
    cfgLast = cfg;
    const ctrl = cfg.mode === "duo" ? ["human", "human"] : cfg.mode === "cpu" ? ["human", "cpu"] : ["cpu", "cpu"];
    G = S.createGame({ target: cfg.target, ctrl, levels: [cfg.level, cfg.level], items: !!cfg.items, seed: cfg.seed });
    G.mode = cfg.mode; G.labels = labels(cfg.mode, cfg.level);
    paused = false; overShown = false; owners.clear();
    R.clearFx();
    hide("menu"); hide("pauseOv"); hide("overOv");
    placeButtons();
    bigText = "よーい…";
    sfx.start();
  }
  function toMenu() {
    G = null; paused = false; owners.clear();
    hide("pauseOv"); hide("overOv");
    R.clearFx();
    newDemo();
    show("menu"); refreshMenu(); placeButtons();
  }
  function pause() {
    if (!G || paused || G.phase === "over") return;
    paused = true; layoutHalves($("pauseOv")); show("pauseOv"); sfx.tap();
  }
  function resume() { paused = false; hide("pauseOv"); sfx.tap(); }
  function show(id) { $(id).classList.add("show"); }
  function hide(id) { $(id).classList.remove("show"); }

  function finish(winner) {
    if (overShown) return;
    overShown = true;
    const sc = G.match.score, mode = G.mode;
    save.rec.games++;
    if (mode === "duo") save.rec.duo[winner]++;
    else if (mode === "cpu") save.rec.cpu[cfgLast.level][winner === 0 ? 0 : 1]++;
    store();
    const ov = $("overOv");
    for (const h of ov.querySelectorAll(".half")) {
      const side = Number(h.dataset.side), res = h.querySelector(".res");
      let t;
      if (mode === "watch") t = (winner === 0 ? "🔵 あお" : "🔴 あか") + " の かち！";
      else if (mode === "cpu" && side === 1) t = winner === 1 ? "🤖 CPU の かち" : "🤖 CPU の まけ";
      else t = winner === side ? "🏆 かち！" : "😢 まけ…";
      res.textContent = t;
      res.classList.toggle("win", winner === side);
      h.querySelector(".score").textContent = sc[side] + " － " + sc[1 - side];
    }
    layoutHalves(ov);
    setTimeout(() => { if (G && G.phase === "over") show("overOv"); }, 350);
    if (mode === "cpu" && winner === 1) sfx.lose(); else sfx.win();
  }

  // ===== ゆび（マルチタッチ）=====
  // pointerId → がわ。じぶんの じんち で さわった ゆび が その がわ の マレット を うごかす
  const owners = new Map();
  function sideAt(t) {
    if (!G) return -1;
    if (G.mode === "watch") return -1;
    if (G.mode === "cpu") return 0;
    return t.y > P.L / 2 ? 0 : 1;
  }
  function moveTo(side, e) {
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    const last = evs && evs.length ? evs[evs.length - 1] : e;
    const r = cv.getBoundingClientRect();
    const t = R.toTable(last.clientX - r.left, last.clientY - r.top);
    const m = G.world.mallets[side];
    m.tx = t.x; m.ty = t.y;
  }
  cv.addEventListener("pointerdown", (e) => {
    AU.unlock();
    if (!G || paused) return;
    const r = cv.getBoundingClientRect();
    const side = sideAt(R.toTable(e.clientX - r.left, e.clientY - r.top));
    if (side < 0) return;
    for (const [id, s] of owners) if (s === side) owners.delete(id);   // あたらしい ゆび に かわる
    owners.set(e.pointerId, side);
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* むし */ }
    moveTo(side, e);
    e.preventDefault();
  }, { passive: false });
  cv.addEventListener("pointermove", (e) => {
    if (!G || paused) return;
    let side = owners.get(e.pointerId);
    if (side === undefined && e.pointerType === "mouse" && G.mode === "cpu") side = 0;   // パソコン: マウスを うごかす だけ で OK
    if (side === undefined) return;
    moveTo(side, e);
  }, { passive: true });
  const up = (e) => owners.delete(e.pointerId);
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);
  cv.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("touchmove", (e) => { if (e.target.closest && !e.target.closest(".box")) e.preventDefault(); }, { passive: false });

  // ===== ぶるっ =====
  let vibT = 0;
  function buzz(ms) {
    if (!save.vib || !navigator.vibrate || !G || G.mode === "watch") return;
    const n = performance.now();
    if (n - vibT < 70) return;
    vibT = n;
    try { navigator.vibrate(ms); } catch (e) { /* むし */ }
  }

  // ===== できごと → おと・えんしゅつ =====
  let hitT = 0, wallT = 0;
  function handle(events, live) {
    const now = performance.now();
    for (const e of events) {
      switch (e.type) {
        case "hit":
          if (e.power > 0.45) R.ring(e.x, e.y, e.power, e.side);
          if (!live) break;
          if (now - hitT > 30) { hitT = now; sfx.hit(e.speed, e.power); }
          if (e.power > 0.6) buzz(e.power > 2.5 ? 28 : 14);
          break;
        case "wall":
          if (!live || e.power < 0.25) break;
          if (now - wallT > 40) { wallT = now; sfx.wall(e.power); }
          if (e.power > 2) buzz(10);
          break;
        case "post":
          if (live) { sfx.post(e.power); buzz(14); }
          break;
        case "goal":
          R.goal(e.scorer, e.x);
          if (live) { sfx.goal(); buzz(120); }
          break;
        case "serve":
          { const s = P.serveSpot(e.side); R.pop(s.x, s.y); }
          if (live) {
            if (bigText) { bigText = ""; R.banner("スタート！", null, 1.1); }
            sfx.serve();
          }
          break;
        case "power":
          if (live) { sfx.item(); R.banner(e.info.em + " " + e.info.name, null, 2.2); }
          break;
        case "itemSpawn": if (live) sfx.itemSpawn(); break;
        case "fxEnd": if (live) sfx.fxEnd(); break;
        case "vanish": R.pop(e.x, e.y); break;
        case "reserve":
          if (live) R.banner("10びょう ルール！ あいての ばん", null, 1.8);
          break;
        case "over":
          if (live) finish(e.winner);
          break;
      }
    }
  }

  // ===== まいフレーム（ぶつりは こてい ティック。がめんの はやさ に かんけい なし）=====
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    if (G) {
      if (!paused) { S.update(G, dt * SPEED); handle(S.drain(G), true); }
      R.draw({ world: G.world, G, labels: G.labels, big: bigText }, paused ? 0 : dt);
    } else {
      if (!demo) newDemo();
      S.update(demo, dt);
      handle(S.drain(demo), false);
      R.draw({ world: demo.world, G: null, labels: null }, dt);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ===== ボタン の ばしょ・りょうがわ むき =====
  function placeButtons() {
    for (const side of [0, 1]) {
      const b = $("pause" + side);
      const human = G && (G.cfg.ctrl[side] === "human" || (G.mode === "watch" && side === 0));
      b.classList.toggle("show", !!human);
      const p = R.cornerFor(side, 56);
      b.style.left = p.x + "px"; b.style.top = p.y + "px";
      b.style.transform = "rotate(" + R.angleFor(side) + "deg)";
    }
  }
  function layoutHalves(ov) {
    const w = innerWidth, h = innerHeight, land = R.lay.landscape;
    for (const el of ov.querySelectorAll(".half")) {
      const side = Number(el.dataset.side), ang = R.angleFor(side);
      let bw, bh, cx, cy;
      if (land) { bw = h; bh = w / 2; cx = side === 0 ? w / 4 : w * 3 / 4; cy = h / 2; }
      else { bw = w; bh = h / 2; cx = w / 2; cy = side === 0 ? h * 3 / 4 : h / 4; }
      Object.assign(el.style, { width: bw + "px", height: bh + "px", left: (cx - bw / 2) + "px", top: (cy - bh / 2) + "px", transform: "rotate(" + ang + "deg)" });
    }
  }
  function onResize() {
    R.resize(); placeButtons();
    layoutHalves($("pauseOv")); layoutHalves($("overOv"));
  }
  new ResizeObserver(onResize).observe($("app"));
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", () => { if (document.hidden && G && G.mode !== "watch") pause(); });

  $("pause0").addEventListener("click", pause);
  $("pause1").addEventListener("click", pause);
  for (const ov of [$("pauseOv"), $("overOv")]) {
    ov.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const act = b.dataset.act;
      if (act === "resume") resume();
      else if (act === "menu") { sfx.tap(); toMenu(); }
      else if (act === "again") start(Object.assign({}, cfgLast, { seed: undefined }));
    });
  }

  // ===== メニュー =====
  function refreshMenu() {
    for (const b of document.querySelectorAll(".mode")) b.classList.toggle("on", b.dataset.mode === save.mode);
    for (const seg of document.querySelectorAll(".seg[data-key]")) {
      const k = seg.dataset.key;
      for (const b of seg.querySelectorAll("button")) b.classList.toggle("on", String(save[k]) === b.dataset.v);
    }
    $("optLevel").hidden = save.mode === "duo";
    $("tSound").classList.toggle("on", save.sound);
    $("tVib").classList.toggle("on", save.vib);
    $("tShake").classList.toggle("on", save.shake);
    $("tVib").hidden = !navigator.vibrate;
    const r = save.rec, lv = A.LEVELS;
    let t = "🏅 あお " + r.duo[0] + "かち ・ あか " + r.duo[1] + "かち";
    const cpu = r.cpu.map((x, i) => x[0] + x[1] ? lv[i].em + " " + x[0] + "かち" + x[1] + "まけ" : "").filter(Boolean);
    if (cpu.length) t += " ／ CPU: " + cpu.join("・");
    $("rec").textContent = r.games ? t : "";
  }
  for (const b of document.querySelectorAll(".mode")) b.addEventListener("click", () => { save.mode = b.dataset.mode; store(); refreshMenu(); sfx.pick(); });
  for (const seg of document.querySelectorAll(".seg[data-key]")) {
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const k = seg.dataset.key, v = b.dataset.v;
      save[k] = k === "theme" ? v : Number(v);
      if (k === "theme") R.setTheme(v);
      store(); refreshMenu(); sfx.pick();
    });
  }
  $("tSound").addEventListener("click", () => { save.sound = !save.sound; AU.set(save.sound); store(); refreshMenu(); sfx.pick(); });
  $("tVib").addEventListener("click", () => { save.vib = !save.vib; store(); refreshMenu(); sfx.pick(); if (save.vib) { try { navigator.vibrate(30); } catch (e) { /* むし */ } } });
  $("tShake").addEventListener("click", () => { save.shake = !save.shake; R.setShake(save.shake); store(); refreshMenu(); sfx.pick(); });
  $("bFlip").addEventListener("click", () => { $("menuBox").classList.toggle("flip"); sfx.tap(); });
  $("bStart").addEventListener("click", () => {
    AU.unlock();
    start({ mode: save.mode, level: save.level, target: save.target, items: save.items, seed: Number(qs.get("seed")) || undefined });
  });
  refreshMenu();
  newDemo();
  onResize();

  // テスト用
  window.AHG = {
    get G() { return G; }, get paused() { return paused; }, start, toMenu, pause, resume,
    table: (x, y) => R.toScreen(x, y),
  };
})();
