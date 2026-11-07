/* かみひこうき グライダー — がめん（えらぶ → おる → なげる → とぶ → けっか） */
(function () {
  "use strict";
  const F = window.Flight, Fo = window.Fold, Snd = window.Snd;
  const $ = (id) => document.getElementById(id);
  const KEY = "kamihikouki-v1";

  /* ---------- ほぞん ---------- */
  const save = { plane: "heso", color: 4, pat: "none", sky: "free", best: 0, daily: { key: "", best: 0 }, sound: true, bgm: true, flights: 0 };
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (d && typeof d === "object") Object.assign(save, d);
  } catch (e) { /* よめなくても あそべる */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* */ } }

  const COLORS = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc", "#f783ac", "#f8f9fa"];
  const PATS = [["none", "むじ"], ["dots", "みずたま"], ["stripe", "しましま"], ["star", "ほし"]];
  if (!F.PLANES[save.plane]) save.plane = "heso";
  if (!(save.color >= 0 && save.color < COLORS.length)) save.color = 4;
  if (!PATS.some((p) => p[0] === save.pat)) save.pat = "none";

  /* うすい いろ（かみ の うら） */
  function light(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k));
    return "rgb(" + c.join(",") + ")";
  }
  function dark(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - k)));
    return "rgb(" + c.join(",") + ")";
  }

  /* SVG の もよう */
  function patternDef(id, color, pat, scale) {
    const s = scale || 1;
    const ink = color === "#f8f9fa" ? "#74c0fc" : "rgba(255,255,255,.75)";
    let inner = "";
    if (pat === "dots") inner = `<circle cx="${8 * s}" cy="${8 * s}" r="${3.4 * s}" fill="${ink}"/><circle cx="0" cy="0" r="${3.4 * s}" fill="${ink}"/><circle cx="${16 * s}" cy="${16 * s}" r="${3.4 * s}" fill="${ink}"/><circle cx="${16 * s}" cy="0" r="${3.4 * s}" fill="${ink}"/><circle cx="0" cy="${16 * s}" r="${3.4 * s}" fill="${ink}"/>`;
    else if (pat === "stripe") inner = `<rect x="0" y="0" width="${16 * s}" height="${5 * s}" fill="${ink}"/>`;
    else if (pat === "star") inner = `<text x="${8 * s}" y="${11 * s}" font-size="${10 * s}" text-anchor="middle" fill="${ink}">★</text>`;
    const rot = pat === "stripe" ? ' patternTransform="rotate(35)"' : "";
    return `<pattern id="${id}" width="${16 * s}" height="${16 * s}" patternUnits="userSpaceOnUse"${rot}><rect width="${16 * s}" height="${16 * s}" fill="${color}"/>${inner}</pattern>`;
  }
  const polyStr = (pts) => pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");

  function layersSvg(layers, fillId, color, opt) {
    opt = opt || {};
    return layers.map((L) => {
      const fill = L.back ? light(color, 0.62) : `url(#${fillId})`;
      return `<polygon points="${polyStr(L.pts)}" fill="${fill}" stroke="${dark(color === "#f8f9fa" ? "#adb5bd" : color, 0.45)}" stroke-width="${opt.sw || 1.4}" stroke-linejoin="round"${L.moving ? ' filter="url(#shadow)"' : ""}/>`;
    }).join("");
  }

  /* ---------- おと ---------- */
  Snd.set(save.sound); Snd.setBgm(save.bgm);
  function syncSoundBtns() {
    $("soundBtn").setAttribute("aria-pressed", String(save.sound));
    $("soundBtn").textContent = save.sound ? "🔊" : "🔇";
    $("bgmBtn").setAttribute("aria-pressed", String(save.bgm && save.sound));
  }
  syncSoundBtns();
  $("soundBtn").addEventListener("click", () => { save.sound = !save.sound; Snd.set(save.sound); if (save.sound) Snd.unlock(); syncSoundBtns(); store(); });
  $("bgmBtn").addEventListener("click", () => { save.bgm = !save.bgm; Snd.setBgm(save.bgm); syncSoundBtns(); store(); });
  const unlockOnce = () => { Snd.unlock(); document.removeEventListener("pointerdown", unlockOnce); };
  document.addEventListener("pointerdown", unlockOnce);
  /* ながおし の メニュー を ださない */
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  /* ---------- がめん きりかえ ---------- */
  let screen = "pick";
  function show(name) {
    screen = name;
    $("scPick").hidden = name !== "pick";
    $("scFold").hidden = name !== "fold";
    $("scFly").hidden = name !== "fly";
    $("homeBtn").hidden = name === "pick";
    $("ovResult").hidden = true;
    if (name === "fly") { resizeCanvas(); }
    else { Snd.windStop(); }
  }
  $("homeBtn").addEventListener("click", () => { Snd.pick(); stopFlight(); renderPick(); show("pick"); });

  /* ---------- 1. えらぶ ---------- */
  function topViewSvg(id, color, pat, uid) {
    const L = Fo.topView(id);
    const b = Fo.bbox(L), pad = 10;
    return `<svg viewBox="${b.x0 - pad} ${b.y0 - pad} ${b.x1 - b.x0 + pad * 2} ${b.y1 - b.y0 + pad * 2}" aria-hidden="true"><defs>${patternDef(uid, COLORS[color], pat, 2)}</defs>${layersSvg(L, uid, COLORS[color], { sw: 3 })}</svg>`;
  }
  function todayKey() { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function renderPick() {
    $("planeList").innerHTML = F.PLANE_IDS.map((id) => {
      const p = F.PLANES[id];
      return `<button type="button" class="plane-card" data-plane="${id}" aria-pressed="${save.plane === id}">${topViewSvg(id, save.color, save.pat, "pv-" + id)}<b>${p.name}</b><small>${p.short}</small></button>`;
    }).join("");
    $("colorList").innerHTML = COLORS.map((c, i) => `<button type="button" class="sw" data-color="${i}" style="background:${c}" aria-label="いろ ${i + 1}" aria-pressed="${save.color === i}"></button>`).join("");
    $("patList").innerHTML = PATS.map(([id, name]) => `<button type="button" class="sw" data-pat="${id}" aria-pressed="${save.pat === id}"><svg viewBox="0 0 32 32"><defs>${patternDef("pp-" + id, COLORS[save.color], id, 1)}</defs><rect width="32" height="32" fill="url(#pp-${id})"/></svg>${name}</button>`).join("");
    document.querySelectorAll(".sky-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sky === save.sky)));
    const ds = F.dailySeed();
    $("dailyLabel").textContent = ds.label + " の そら。まいにち かわる よ";
    const dBest = save.daily.key === todayKey() ? save.daily.best : 0;
    $("bestLine").textContent = "🏆 いろいろ な そら の きろく: " + save.best + "メートル ／ 📅 きょう: " + dBest + "メートル";
  }
  $("scPick").addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.plane) { save.plane = t.dataset.plane; Snd.pick(); }
    else if (t.dataset.color != null) { save.color = +t.dataset.color; Snd.pick(); }
    else if (t.dataset.pat) { save.pat = t.dataset.pat; Snd.pick(); }
    else if (t.dataset.sky) { save.sky = t.dataset.sky; Snd.pick(); }
    else return;
    store(); renderPick();
  });
  $("goFold").addEventListener("click", () => { Snd.pick(); startFold(); });

  /* ---------- 2. おる ---------- */
  const fsvg = $("foldSvg");
  const fold = { layers: null, i: 0, t: 0, anim: false, done: false, drag: null };
  function steps() { return Fo.STEPS[save.plane]; }
  function startFold() {
    fold.layers = Fo.paper(); fold.i = 0; fold.t = 0; fold.anim = false; fold.done = false; fold.drag = null;
    show("fold");
    $("foldNext").hidden = true; $("foldAuto").hidden = false; $("foldHint").hidden = false;
    renderFold();
  }
  function renderFold() {
    const color = COLORS[save.color];
    const st = steps();
    $("foldDots").innerHTML = st.map((_, k) => `<span class="${k < fold.i ? "done" : k === fold.i && !fold.done ? "on" : ""}"></span>`).join("");
    const defs = `<defs>${patternDef("fp", color, save.pat, 2.2)}<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="2" dy="3" stdDeviation="3" flood-opacity=".25"/></filter><marker id="ah" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#e8590c"/></marker></defs>`;
    if (fold.done) {
      const L = Fo.topView(save.plane);
      const b = Fo.bbox(L);
      const crease = `<line x1="0" y1="${b.y0}" x2="0" y2="${b.y1}" stroke="${dark(color === "#f8f9fa" ? "#adb5bd" : color, 0.5)}" stroke-width="2"/>`;
      fsvg.innerHTML = defs + `<g class="done-plane"><g transform="translate(0 ${-(b.y0 + b.y1) / 2})">${layersSvg(L, "fp", color, { sw: 2 })}${crease}</g></g>` +
        `<text x="0" y="162" text-anchor="middle" font-size="19" font-weight="800" fill="#0b4a8b">できた！ ${F.PLANES[save.plane].name}</text>`;
      $("foldText").textContent = "かんせい！ つばさ を ひろげたら、そと へ なげ に いこう";
      return;
    }
    const s = st[fold.i];
    $("foldText").textContent = (fold.i + 1) + ". " + s.text;
    const frame = Fo.stepFrame(fold.layers, s, fold.t);
    let extra = "";
    if (fold.t < 0.02) {
      for (const f of s.folds) {
        const seg = Fo.axisSegment(fold.layers, f);
        if (seg) extra += `<line x1="${seg[0][0]}" y1="${seg[0][1]}" x2="${seg[1][0]}" y2="${seg[1][1]}" stroke="#e8590c" stroke-width="2.5" stroke-dasharray="8 6"/>`;
        const ar = Fo.flapArrow(fold.layers, f);
        if (ar) {
          const mx = (ar.from[0] + ar.to[0]) / 2, my = (ar.from[1] + ar.to[1]) / 2;
          const dx = ar.to[0] - ar.from[0], dy = ar.to[1] - ar.from[1];
          const cx = mx - dy * 0.25, cy = my + dx * 0.25;
          extra += `<path class="arrow-hint" d="M${ar.from[0]} ${ar.from[1]} Q${cx} ${cy} ${ar.to[0]} ${ar.to[1]}" fill="none" stroke="#e8590c" stroke-width="5" stroke-linecap="round" marker-end="url(#ah)"/>`;
        }
      }
    }
    fsvg.innerHTML = defs + layersSvg(frame, "fp", color) + extra;
  }
  function svgPt(e) {
    const m = fsvg.getScreenCTM();
    if (!m) return [0, 0];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  }
  function dragT(p0, p1) {
    const s = steps()[fold.i];
    let best = 0;
    for (const f of s.folds) {
      const ar = Fo.flapArrow(fold.layers, f);
      if (!ar) continue;
      const v = [ar.to[0] - ar.from[0], ar.to[1] - ar.from[1]];
      const L2 = Math.max(70 * 70, v[0] * v[0] + v[1] * v[1]);
      const d = [p1[0] - p0[0], p1[1] - p0[1]];
      best = Math.max(best, (d[0] * v[0] + d[1] * v[1]) / L2);
    }
    return Math.max(0, Math.min(1, best));
  }
  fsvg.addEventListener("pointerdown", (e) => {
    if (fold.anim || fold.done) return;
    e.preventDefault();
    try { fsvg.setPointerCapture(e.pointerId); } catch (er) { /* */ }
    fold.drag = { p0: svgPt(e), id: e.pointerId };
    Snd.crease();
  });
  fsvg.addEventListener("pointermove", (e) => {
    if (!fold.drag || fold.drag.id !== e.pointerId) return;
    fold.t = dragT(fold.drag.p0, svgPt(e));
    renderFold();
  });
  const fUp = (e) => {
    if (!fold.drag || fold.drag.id !== e.pointerId) return;
    fold.drag = null;
    animFold(fold.t > 0.3 ? 1 : 0);
  };
  fsvg.addEventListener("pointerup", fUp);
  fsvg.addEventListener("pointercancel", fUp);
  $("foldAuto").addEventListener("click", () => { if (!fold.anim && !fold.done) animFold(1); });

  function animFold(to) {
    fold.anim = true;
    const from = fold.t, t0 = performance.now(), dur = 380 * Math.abs(to - from) + 60;
    if (to === 1) Snd.fold();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      fold.t = from + (to - from) * (1 - Math.pow(1 - k, 2));
      renderFold();
      if (k < 1) { requestAnimationFrame(tick); return; }
      fold.anim = false; fold.t = 0;
      if (to === 1) {
        fold.layers = Fo.applyStep(fold.layers, steps()[fold.i]);
        fold.i++;
        if (fold.i >= steps().length) {
          fold.done = true; Snd.done();
          $("foldNext").hidden = false; $("foldAuto").hidden = true; $("foldHint").hidden = true;
        }
      }
      renderFold();
    };
    requestAnimationFrame(tick);
  }
  $("foldNext").addEventListener("click", () => { Snd.pick(); startFly(); });

  /* ---------- 3. とぶ ---------- */
  const cv = $("sky"), g = cv.getContext("2d");
  let W = 300, H = 200, DPR = 1, ppm = 6;
  const fl = { phase: "aim", s: null, world: null, label: "", cam: { x: -10, y: -2 }, trail: [], aim: null, acc: 0, last: 0, zone: "park", pat: null, landShown: false, raf: 0, popT: 0, birdsWith: null };

  function resizeCanvas() {
    const r = $("flyWrap").getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(100, r.width); H = Math.max(100, r.height);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ppm = Math.max(4.5, Math.min(14, H / 48));
  }
  window.addEventListener("resize", () => { if (screen === "fly") { resizeCanvas(); if (fl.phase !== "fly") draw(); } });

  function newWorld() {
    if (save.sky === "daily") {
      const d = F.dailySeed();
      fl.world = F.makeWorld(d.seed); fl.label = "📅 " + d.label + " の そら";
    } else {
      const n = 1 + Math.floor(Math.random() * 9999);
      fl.world = F.makeWorld(F.hash("free:" + n)); fl.label = "🎲 そら No." + n;
    }
    $("skyName").textContent = fl.label;
  }
  function makeCanvasPattern() {
    const c = document.createElement("canvas"); c.width = c.height = 16;
    const x = c.getContext("2d"); const col = COLORS[save.color];
    x.fillStyle = col; x.fillRect(0, 0, 16, 16);
    x.fillStyle = col === "#f8f9fa" ? "#74c0fc" : "rgba(255,255,255,.75)";
    if (save.pat === "dots") { x.beginPath(); x.arc(8, 8, 3, 0, 7); x.arc(0, 0, 3, 0, 7); x.arc(16, 0, 3, 0, 7); x.arc(0, 16, 3, 0, 7); x.arc(16, 16, 3, 0, 7); x.fill(); }
    else if (save.pat === "stripe") { x.fillRect(0, 0, 16, 5); x.fillRect(0, 8, 16, 0); }
    else if (save.pat === "star") { x.font = "11px sans-serif"; x.textAlign = "center"; x.fillText("★", 8, 12); }
    try { return g.createPattern(c, "repeat"); } catch (e) { return col; }
  }

  function startFly() {
    show("fly");
    fl.pat = makeCanvasPattern();
    resetThrow();
    if (!fl.raf) fl.raf = requestAnimationFrame(loop);
  }
  function resetThrow() {
    newWorld();
    fl.phase = "aim"; fl.s = null; fl.trail = []; fl.aim = null; fl.landShown = false; fl.zone = "park";
    fl.cam.x = F.START.x - (W * 0.3) / ppm; fl.cam.y = -2;
    $("aimHint").hidden = false; $("flyHint").hidden = true; $("easyThrow").hidden = false; $("pop").hidden = true;
    $("ovResult").hidden = true;
    updateHud();
  }
  function stopFlight() { fl.phase = "aim"; Snd.windStop(); }

  function doThrow(angle, speed) {
    if (fl.phase !== "aim") return;
    fl.s = F.throwPlane(save.plane, angle, speed);
    fl.phase = "fly"; fl.acc = 0; fl.last = performance.now();
    $("aimHint").hidden = true; $("easyThrow").hidden = true;
    $("flyHint").hidden = false;
    setTimeout(() => { if (fl.phase === "fly") $("flyHint").hidden = true; }, 6000);
    Snd.throw(); Snd.windStart();
    save.flights++; store();
  }
  $("easyThrow").addEventListener("click", () => doThrow(15, 11));

  /* ゆび: なげる まえ は スワイプ、とんで いる あいだ は おさえる */
  cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (er) { /* */ }
    if (fl.phase === "aim") {
      fl.aim = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), hist: [[performance.now(), e.clientX, e.clientY]] };
    } else if (fl.phase === "fly" && fl.s) {
      fl.s.hold = true;
    }
  });
  cv.addEventListener("pointermove", (e) => {
    if (fl.phase === "aim" && fl.aim && fl.aim.id === e.pointerId) {
      fl.aim.x = e.clientX; fl.aim.y = e.clientY;
      fl.aim.hist.push([performance.now(), e.clientX, e.clientY]);
      if (fl.aim.hist.length > 30) fl.aim.hist.shift();
      draw();
    }
  });
  function aimThrow() {
    const a = fl.aim;
    if (!a) return null;
    const dx = a.x - a.x0, dy = a.y - a.y0;
    const now = performance.now();
    /* はやさ は さいご の 0.25びょう の うごき で みる */
    let k = 0;
    while (k < a.hist.length - 1 && now - a.hist[k][0] > 250) k++;
    const h0 = a.hist[k], h1 = a.hist[a.hist.length - 1];
    const ms = Math.max(60, h1[0] - h0[0] || now - a.t0);
    const recent = Math.hypot(h1[1] - h0[1], h1[2] - h0[2]);
    const len = Math.hypot(dx, dy);
    const th = F.swipeToThrow(dx, dy, ms * len / Math.max(1, recent), Math.min(W, H));
    return { len, ...th };
  }
  const cvUp = (e) => {
    if (fl.phase === "aim" && fl.aim && fl.aim.id === e.pointerId) {
      const th = aimThrow();
      fl.aim = null;
      if (th && th.len > 24) doThrow(th.angle, th.speed);
      else draw();
    } else if (fl.s) fl.s.hold = false;
  };
  cv.addEventListener("pointerup", cvUp);
  cv.addEventListener("pointercancel", cvUp);
  document.addEventListener("keydown", (e) => {
    if (screen !== "fly" || e.code !== "Space") return;
    e.preventDefault();
    if (fl.phase === "aim") doThrow(15, 11);
    else if (fl.s) fl.s.hold = true;
  });
  document.addEventListener("keyup", (e) => { if (e.code === "Space" && fl.s) fl.s.hold = false; });

  /* ---------- ポップ（ことば） ---------- */
  let popTimer = 0;
  function pop(txt, ms) {
    const el = $("pop");
    el.textContent = txt; el.hidden = false;
    el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
    clearTimeout(popTimer);
    popTimer = setTimeout(() => { el.hidden = true; }, ms || 1700);
  }

  function onEvent(ev) {
    const t = ev.type;
    if (t === "enter") {
      const f = ev.f;
      if (f.type === "thermal") { pop("🦋 のぼる かぜ！ ふわーっ"); Snd.lift(); }
      else if (f.type === "wind") pop(f.wx < 0 ? "🌬️ むかいかぜ！ すすみ にくい" : "🌬️ おいかぜ！ びゅーん");
      else if (f.type === "rain") pop("☔ あめ！ かみ が ぬれて おもい");
      else if (f.type === "bldg") { pop("🏢 ビルかぜ！ かべ に そって のぼる"); Snd.lift(); }
    } else if (t === "bird") { pop("🐦 とり と いっしょ に とぼう！ おいかぜ"); Snd.chun(); fl.birdsWith = { f: ev.f, t: 0 }; }
    else if (t === "balloon") { pop("🎈 ぽん！ ふわっ"); Snd.pon(); }
    else if (t === "stall") { pop("🌀 のぼりすぎ！ くるっ"); Snd.stall(); }
    else if (t === "recover") pop("✨ たてなおした！", 1000);
    else if (t === "bonk") { pop("🏢 ぽよん！ ビル に ぶつかった"); Snd.bonk(); }
    else if (t === "land") {
      Snd.windStop();
      const sf = ev.surface;
      if (sf === "water" || sf === "sea") Snd.splash(); else Snd.pafu();
      pop("ふわっ… " + F.distance(fl.s) + "メートル！", 1400);
    }
  }

  const SURF = {
    grass: "くさ の うえ に ふわっ と ちゃくち", hill: "おか の うえ に ふわっ と ちゃくち", water: "かわ に ぷかぷか ちゃくち",
    road: "まち の みち に ぱふっ と ちゃくち", sand: "すなはま に ぱふっ と ちゃくち", sea: "うみ に ぷかぷか ちゃくち",
    cloud: "くも の うみ に ふわっ と ちゃくち", roof: "ビル の やね に ちゃくち！",
  };
  function showResult() {
    const s = fl.s, d = F.distance(s);
    const z = F.zoneAt(s.x);
    $("rWhere").textContent = z.emoji + " " + z.name + " ／ " + (SURF[s.surface] || "ちゃくち");
    $("rTitle").textContent = d + "メートル！";
    const bits = ["⏱️ " + Math.round(s.t) + "びょう", "⬆️ いちばん たかく " + Math.round(s.maxY) + "m"];
    if (s.balloons) bits.push("🎈×" + s.balloons);
    if (s.stalls) bits.push("🌀 くるっ×" + s.stalls);
    $("rSub").textContent = bits.join("　");
    let msg;
    if (save.sky === "daily") {
      const k = todayKey();
      if (save.daily.key !== k) save.daily = { key: k, best: 0 };
      if (d > save.daily.best) { save.daily.best = d; msg = "🏆 きょう の そら の きろく こうしん！"; }
      else msg = "📅 きょう の きろく: " + save.daily.best + "メートル";
    } else {
      if (d > save.best) { save.best = d; msg = "🏆 じこ ベスト こうしん！"; }
      else msg = "🏆 じこ ベスト: " + save.best + "メートル";
    }
    if (msg.startsWith("🏆 じこ ベスト こうしん") || msg.startsWith("🏆 きょう")) Snd.fanfare();
    $("rBest").textContent = msg;
    store();
    $("ovResult").hidden = false;
  }
  $("again").addEventListener("click", () => { Snd.pick(); resetThrow(); });
  $("refold").addEventListener("click", () => { Snd.pick(); stopFlight(); renderPick(); show("pick"); });

  function updateHud() {
    const s = fl.s;
    $("hudDist").innerHTML = (s ? F.distance(s) : 0) + "<small>メートル</small>";
    $("hudAlt").textContent = "⬆️ " + Math.max(0, Math.round(s ? s.y - F.terrain(s.x) : 0)) + "m";
    $("hudBal").textContent = "🎈 " + (s ? s.balloons : 0);
    const z = F.zoneAt(s ? s.x : 0);
    $("hudZone").textContent = z.emoji + " " + z.name;
  }

  /* ---------- ループ ---------- */
  let SIM = 1.25; // すこし はやおくり
  function loop(now) {
    fl.raf = requestAnimationFrame(loop);
    if (screen !== "fly") return;
    if (fl.phase === "fly" || (fl.s && fl.s.landed && !fl.landShown)) {
      const dt = Math.min(0.1, (now - fl.last) / 1000) * SIM;
      fl.last = now;
      fl.acc += dt;
      const s = fl.s;
      while (fl.acc >= 1 / 60) {
        fl.acc -= 1 / 60;
        const wasLanded = s.landed;
        for (const ev of F.step(s, 1 / 60, fl.world)) onEvent(ev);
        if (!wasLanded && s.landed) fl.phase = "landed";
        if (!s.landed && (!fl.trail.length || s.t - fl.trail[fl.trail.length - 1][2] > 0.12)) {
          fl.trail.push([s.x, s.y, s.t]);
          if (fl.trail.length > 400) fl.trail.shift();
        }
      }
      if (fl.birdsWith) fl.birdsWith.t += dt;
      Snd.windSet(s.landed ? 0 : s.airspeed);
      const z = F.zoneAt(s.x);
      if (z.id !== fl.zone) { fl.zone = z.id; pop(z.emoji + " " + z.name + " に きた！"); }
      if (s.landed && s.landT > 1.3 && !fl.landShown) { fl.landShown = true; showResult(); }
      updateHud();
    } else fl.last = now;
    draw();
  }

  /* ---------- え ---------- */
  const sx = (x) => (x - fl.cam.x) * ppm;
  const sy = (y) => H - (y - fl.cam.y) * ppm;
  const lerp = (a, b, k) => a + (b - a) * k;
  function mix(c1, c2, k) {
    const p = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const a = p(c1), b = p(c2);
    return "rgb(" + a.map((v, i) => Math.round(lerp(v, b[i], k))).join(",") + ")";
  }
  const SKY = { park: ["#74c0fc", "#e7f5ff"], river: ["#66b8f5", "#e3fafc"], town: ["#91a7ff", "#edf2ff"], sea: ["#339af0", "#fff9db"], cloud: ["#1c3f8f", "#a5d8ff"] };
  function skyColors(x) {
    const Z = F.ZONES;
    let i = 0;
    for (let k = 0; k < Z.length; k++) if (x >= Z[k].from) i = k;
    const cur = SKY[Z[i].id];
    const nxt = Z[i + 1];
    if (nxt && x > nxt.from - 80) {
      const k = (x - (nxt.from - 80)) / 80;
      const n = SKY[nxt.id];
      return [mix(cur[0], n[0], k), mix(cur[1], n[1], k)];
    }
    return cur;
  }
  function h01(n) { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }

  function emoji(ch, x, y, size, flip) {
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
    g.font = Math.round(size) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(ch, 0, 0); g.restore();
  }

  function draw() {
    if (screen !== "fly") return;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    const s = fl.s;
    /* カメラ */
    const px = s ? s.x : F.START.x, py = s ? s.y : F.START.y;
    fl.cam.x = px - (W * (s && !s.landed ? 0.33 : 0.4)) / ppm;
    const viewH = H / ppm;
    const ty = Math.max(-1.5, py - viewH * 0.5);
    fl.cam.y = lerp(fl.cam.y, ty, s ? 0.08 : 1);
    const t = s ? s.t : performance.now() / 1000;
    const x0 = fl.cam.x, x1 = fl.cam.x + W / ppm;

    /* そら */
    const sc = skyColors(fl.cam.x + W / ppm / 2);
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, sc[0]); gr.addColorStop(1, sc[1]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    /* とおく の くも（ゆっくり うごく） */
    g.fillStyle = "rgba(255,255,255,.7)";
    for (let k = -1; k < 6; k++) {
      const cxw = Math.floor(fl.cam.x * 0.15 / 60) + k;
      const cx = (cxw * 60 - fl.cam.x * 0.15) * ppm * 0.6 + W * 0.2;
      const cy = H * 0.18 + h01(cxw) * H * 0.25 + (fl.cam.y * 0.15) * ppm;
      const r = 14 + h01(cxw + 9) * 18;
      g.beginPath(); g.arc(cx, cy, r, 0, 7); g.arc(cx + r, cy + 4, r * 0.8, 0, 7); g.arc(cx - r, cy + 5, r * 0.7, 0, 7); g.fill();
    }
    /* とおく の やま／まち（パララックス） */
    const zid = F.zoneAt(fl.cam.x + W / ppm / 2).id;
    g.fillStyle = zid === "town" ? "rgba(92,124,250,.25)" : zid === "sea" || zid === "cloud" ? "rgba(255,255,255,.0)" : "rgba(64,192,87,.22)";
    g.beginPath(); g.moveTo(0, H);
    for (let X = 0; X <= W + 8; X += 8) {
      const wx = fl.cam.x * 0.3 + X / ppm;
      let h = zid === "town" ? 10 + Math.floor(h01(Math.floor(wx / 6)) * 4) * 5 : 9 + 6 * Math.sin(wx * 0.03) + 4 * Math.sin(wx * 0.07 + 1);
      g.lineTo(X, H - (h - fl.cam.y * 0.4) * ppm);
    }
    g.lineTo(W, H); g.fill();

    drawGround(x0, x1, t);
    if (fl.world) drawFeatures(x0, x1, t);

    /* スタート */
    g.fillStyle = "#fff"; g.strokeStyle = "#868e96"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(sx(-3), sy(F.HILL_END ? F.terrain(-3) : 0)); g.lineTo(sx(-3), sy(F.terrain(-3) + 4)); g.stroke();
    g.fillStyle = "#fa5252"; g.beginPath(); g.moveTo(sx(-3), sy(F.terrain(-3) + 4)); g.lineTo(sx(-0.8), sy(F.terrain(-3) + 3.4)); g.lineTo(sx(-3), sy(F.terrain(-3) + 2.8)); g.fill();
    emoji("🧒", sx(-1.2), sy(F.terrain(0) + 1.6), Math.max(26, ppm * 3.4));

    /* きょり の かんばん */
    g.font = "bold 13px sans-serif"; g.textAlign = "center"; g.textBaseline = "alphabetic";
    for (let m = Math.ceil(x0 / 50) * 50; m <= x1; m += 50) {
      if (m <= 0) continue;
      const gy = F.terrain(m);
      g.fillStyle = "#795548"; g.fillRect(sx(m) - 1.5, sy(gy + 2.6), 3, 2.6 * ppm);
      g.fillStyle = "#fff"; g.strokeStyle = "#795548"; g.lineWidth = 1.5;
      const bx = sx(m), by = sy(gy + 2.6);
      g.beginPath(); g.roundRect ? g.roundRect(bx - 22, by - 16, 44, 18, 5) : g.rect(bx - 22, by - 16, 44, 18); g.fill(); g.stroke();
      g.fillStyle = "#5d4037"; g.fillText(m + "m", bx, by - 3);
    }
    /* じこ ベスト の はた */
    const best = save.sky === "daily" ? (save.daily.key === todayKey() ? save.daily.best : 0) : save.best;
    if (best > 0 && best >= x0 && best <= x1) {
      const gy = F.groundAt(fl.world, best);
      g.strokeStyle = "#e8590c"; g.lineWidth = 2; g.beginPath(); g.moveTo(sx(best), sy(gy)); g.lineTo(sx(best), sy(gy + 6)); g.stroke();
      g.fillStyle = "#ffd43b"; g.beginPath(); g.moveTo(sx(best), sy(gy + 6)); g.lineTo(sx(best) + 22, sy(gy + 5.2)); g.lineTo(sx(best), sy(gy + 4.4)); g.fill();
      g.fillStyle = "#e8590c"; g.font = "bold 13px sans-serif"; g.fillText("🏆ベスト", sx(best) + 4, sy(gy + 6) - 4);
    }

    /* とんだ あと */
    if (fl.trail.length > 1) {
      g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 2.5; g.setLineDash([3, 7]);
      g.beginPath();
      fl.trail.forEach((p, i) => (i ? g.lineTo(sx(p[0]), sy(p[1])) : g.moveTo(sx(p[0]), sy(p[1]))));
      if (s && !s.landed) g.lineTo(sx(s.x), sy(s.y));
      g.stroke(); g.setLineDash([]);
    }

    /* ひこうき */
    if (s) {
      const gy = F.groundAt(fl.world, s.x);
      const hgt = s.y - gy;
      if (hgt < 30) {
        g.fillStyle = "rgba(0,0,0," + (0.18 * (1 - hgt / 30)).toFixed(3) + ")";
        g.beginPath(); g.ellipse(sx(s.x), sy(gy), 16, 4, 0, 0, 7); g.fill();
      }
      let ang = F.attitude(s);
      if (s.landed) ang = 0;
      else if (s.stalled) ang = ang - Math.PI * 2 * Math.min(1, s.stallT / 0.7);
      drawPlane(sx(s.x), sy(s.y) - (s.landed ? 3 : 0), ang);
      if (fl.birdsWith && s.birdT > 0) {
        const n = fl.birdsWith.f.n;
        for (let k = 0; k < n; k++) {
          const ox = -18 - k * 16 + Math.sin(t * 3 + k) * 4, oy = (k % 2 ? 14 : -14) + Math.sin(t * 5 + k * 2) * 3;
          emoji("🐦", sx(s.x) + ox, sy(s.y) + oy, 22, true);
        }
      }
    } else {
      /* てに もって いる */
      let ang = 0.25;
      const th = fl.aim ? aimThrow() : null;
      if (th) ang = th.angle * Math.PI / 180;
      drawPlane(sx(F.START.x), sy(F.START.y), ang);
      if (th && th.len > 10) {
        const L = 20 + th.speed * 7;
        const ax = sx(F.START.x), ay = sy(F.START.y);
        const ex = ax + Math.cos(ang) * L, ey = ay - Math.sin(ang) * L;
        g.strokeStyle = "#e8590c"; g.lineWidth = 6; g.lineCap = "round";
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(ex, ey); g.stroke();
        g.fillStyle = "#e8590c"; g.beginPath();
        g.moveTo(ex + Math.cos(ang) * 12, ey - Math.sin(ang) * 12);
        g.lineTo(ex + Math.cos(ang + 2.4) * 12, ey - Math.sin(ang + 2.4) * 12);
        g.lineTo(ex + Math.cos(ang - 2.4) * 12, ey - Math.sin(ang - 2.4) * 12); g.fill();
        g.fillStyle = "#16324f"; g.font = "bold 15px sans-serif"; g.textAlign = "left";
        g.fillText("つよさ " + "●".repeat(Math.max(1, Math.round((th.speed - 4) / 3))), ax + 10, ay + 34);
      }
    }
  }

  function drawGround(x0, x1, t) {
    const step = 4 / ppm;
    for (let x = Math.floor(x0 / step) * step; x <= x1 + step; x += step) {
      const sf = x < F.HILL_END && F.terrain(x) > 0.3 ? "grass" : F.surfaceAt(x);
      const gy = F.terrain(x);
      const top = sy(gy);
      const col = { grass: "#69db7c", water: "#4dabf7", road: "#adb5bd", sand: "#ffe066", sea: "#228be6", cloud: "#f8f9fa" }[sf];
      g.fillStyle = col; g.fillRect(sx(x), top, step * ppm + 1, H - top + 2);
      if (sf === "grass") { g.fillStyle = "#40c057"; g.fillRect(sx(x), top, step * ppm + 1, 4); g.fillStyle = "#51cf66"; g.fillRect(sx(x), top + 12, step * ppm + 1, H); g.fillStyle = "#c08a55"; g.fillRect(sx(x), Math.max(top + 60, sy(-1)), step * ppm + 1, H); }
      else if (sf === "road") { g.fillStyle = "#868e96"; g.fillRect(sx(x), top, step * ppm + 1, 4); g.fillStyle = "#495057"; g.fillRect(sx(x), top + 8, step * ppm + 1, H); }
      else if (sf === "sand") { g.fillStyle = "#fab005"; g.fillRect(sx(x), top + 8, step * ppm + 1, H); }
    }
    /* なみ・かわ の きらきら */
    g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 2;
    for (let x = Math.floor(x0 / 6) * 6; x <= x1; x += 6) {
      const sf = F.surfaceAt(x);
      if (sf !== "water" && sf !== "sea") continue;
      const yy = sy(0) + 6 + (h01(x) * 10);
      const ox = Math.sin(t * 1.5 + x) * 3;
      g.beginPath(); g.moveTo(sx(x) + ox, yy); g.quadraticCurveTo(sx(x + 1.5) + ox, yy - 4, sx(x + 3) + ox, yy); g.stroke();
    }
    /* くも の うみ */
    for (let x = Math.floor(x0 / 7) * 7; x <= x1 + 7; x += 7) {
      if (F.surfaceAt(x) !== "cloud") continue;
      g.fillStyle = "#fff";
      const r = (2.5 + h01(x) * 2) * ppm;
      g.beginPath(); g.arc(sx(x), sy(0) + 4, r, 0, 7); g.fill();
    }
    /* き・ボート など */
    for (let k = Math.floor(x0 / 13); k <= x1 / 13 + 1; k++) {
      const x = k * 13 + h01(k) * 6;
      const sf = x < F.HILL_END && F.terrain(x) > 0.3 ? "grass" : F.surfaceAt(x);
      const r = h01(k + 0.5);
      if (sf === "grass" && r < 0.55 && x > 3) {
        const gy = F.terrain(x), hh = 4 + r * 6;
        g.fillStyle = "#8d5524"; g.fillRect(sx(x) - 3, sy(gy + hh * 0.5), 6, hh * 0.5 * ppm);
        g.fillStyle = r < 0.25 ? "#2f9e44" : "#37b24d";
        g.beginPath(); g.arc(sx(x), sy(gy + hh * 0.7), hh * 0.38 * ppm, 0, 7); g.fill();
        if (r < 0.12) emoji("🌸", sx(x) + 6, sy(gy + hh * 0.8), 14);
      } else if (sf === "sea" && r < 0.12) emoji("⛵", sx(x), sy(1.6), Math.max(22, ppm * 3));
      else if (sf === "sea" && r > 0.94) emoji("🐳", sx(x), sy(0.4), Math.max(22, ppm * 3));
      else if (sf === "water" && r < 0.2) emoji("🦆", sx(x), sy(0.7), Math.max(18, ppm * 2.2), true);
      else if (sf === "road" && r < 0.3) emoji(r < 0.15 ? "🚗" : "🚌", sx(x), sy(1.1), Math.max(18, ppm * 2.4), true);
    }
  }

  const BLD = ["#ced4da", "#a5d8ff", "#ffd8a8", "#d0bfff"];
  const BAL = ["#ff6b6b", "#fcc419", "#51cf66", "#339af0", "#cc5de8"];
  function drawFeatures(x0, x1, t) {
    const fs = F.featuresIn(fl.world, x0 - 20, x1 + 20);
    const s = fl.s;
    for (const o of fs) {
      if (o.type === "thermal") {
        const gy = F.terrain(o.x);
        const L = sx(o.x - o.w / 2), R = sx(o.x + o.w / 2);
        const gr = g.createLinearGradient(L, 0, R, 0);
        gr.addColorStop(0, "rgba(255,236,153,0)"); gr.addColorStop(0.5, "rgba(255,236,153,.35)"); gr.addColorStop(1, "rgba(255,236,153,0)");
        g.fillStyle = gr; g.fillRect(L, sy(o.top), R - L, sy(gy) - sy(o.top));
        /* のぼる うずまき */
        g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 2;
        for (let k = 0; k < 5; k++) {
          const yy = gy + ((t * o.s * 3 + k * (o.top / 5)) % o.top);
          const xx = o.x + Math.sin(t * 2 + k) * o.w * 0.18;
          g.beginPath(); g.arc(sx(xx), sy(yy), 6, Math.PI * 0.2, Math.PI * 1.5); g.stroke();
        }
        for (let k = 0; k < 3; k++) {
          const a = t * 2.2 + k * 2.1;
          const by = gy + 4 + k * 7 + Math.sin(t + k) * 1.5;
          emoji("🦋", sx(o.x + Math.cos(a) * 3), sy(by + Math.sin(a) * 1.5), Math.max(16, ppm * 2.2), Math.cos(a + 1.57) > 0);
        }
      } else if (o.type === "wind") {
        const dir = Math.sign(o.wx);
        g.strokeStyle = dir < 0 ? "rgba(255,255,255,.8)" : "rgba(255,255,255,.8)";
        g.lineWidth = 2.5; g.lineCap = "round";
        const len = o.x1 - o.x0;
        for (let k = 0; k < 14; k++) {
          const ph = ((t * Math.abs(o.wx) * 1.5 + k * 7.3) % len);
          const xx = dir > 0 ? o.x0 + ph : o.x1 - ph;
          const yy = 3 + h01(k + o.id) * 45;
          if (xx < x0 - 5 || xx > x1 + 5) continue;
          g.beginPath(); g.moveTo(sx(xx), sy(yy)); g.lineTo(sx(xx - dir * 4), sy(yy)); g.stroke();
        }
        const lx = (o.x0 + o.x1) / 2;
        g.fillStyle = dir < 0 ? "rgba(224,49,49,.85)" : "rgba(47,158,68,.9)";
        g.font = "bold 14px sans-serif"; g.textAlign = "center";
        const label = dir < 0 ? "← むかいかぜ" : "おいかぜ →";
        emoji("🌬️", sx(lx) - 34, sy(52), 20, dir > 0);
        g.fillText(label, sx(lx) + 8, sy(52) + 5);
      } else if (o.type === "rain") {
        g.fillStyle = "rgba(73,80,87,.55)";
        for (let x = o.x0; x <= o.x1; x += 6) { g.beginPath(); g.arc(sx(x), sy(o.top + Math.sin(x) * 1.5), 3.5 * ppm, 0, 7); g.fill(); }
        g.strokeStyle = "rgba(51,154,240,.6)"; g.lineWidth = 1.5;
        for (let k = 0; k < 40; k++) {
          const xx = o.x0 + h01(k + o.id) * (o.x1 - o.x0);
          const yy = o.top - ((t * 18 + k * 3.1) % o.top);
          g.beginPath(); g.moveTo(sx(xx), sy(yy)); g.lineTo(sx(xx - 0.4), sy(yy - 1.6)); g.stroke();
        }
        emoji("☔", sx(o.x0 + 6), sy(o.top + 4), 22);
      } else if (o.type === "bldg") {
        g.fillStyle = BLD[o.color]; g.strokeStyle = "#495057"; g.lineWidth = 2;
        g.fillRect(sx(o.x0), sy(o.h), (o.x1 - o.x0) * ppm, o.h * ppm); g.strokeRect(sx(o.x0), sy(o.h), (o.x1 - o.x0) * ppm, o.h * ppm);
        g.fillStyle = "rgba(255,255,255,.75)";
        for (let wy = 3; wy < o.h - 1; wy += 4) for (let wx = o.x0 + 2; wx < o.x1 - 2; wx += 4) g.fillRect(sx(wx), sy(wy + 2), 1.6 * ppm, 1.8 * ppm);
        /* ビルかぜ の やじるし */
        g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 2;
        const yy = ((t * 6) % (o.h + 6));
        g.beginPath(); g.moveTo(sx(o.x0 - 6), sy(yy)); g.quadraticCurveTo(sx(o.x0 - 2), sy(yy + 3), sx(o.x0 - 1.5), sy(yy + 6)); g.stroke();
      } else if (o.type === "birds") {
        if (s && s.used[o.id]) continue;
        const b = F.birdPos(o, s ? s.t : t);
        for (let k = 0; k < o.n; k++) {
          const ox = (k - o.n / 2) * 3.2, oy = (k % 2) * 2.2 + Math.sin(t * 4 + k) * 0.6;
          emoji("🐦", sx(b.x + ox), sy(b.y + oy), Math.max(18, ppm * 2.6), true);
        }
      } else if (o.type === "balloon") {
        if (s && s.used[o.id]) continue;
        const yy = o.y + Math.sin(t * 1.4 + o.id) * 0.6;
        g.strokeStyle = "#868e96"; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(sx(o.x), sy(yy) + 1.4 * ppm); g.lineTo(sx(o.x) + 3, sy(yy) + 3.6 * ppm); g.stroke();
        g.fillStyle = BAL[o.hue];
        g.beginPath(); g.ellipse(sx(o.x), sy(yy), 1.1 * ppm + 3, 1.4 * ppm + 4, 0, 0, 7); g.fill();
        g.fillStyle = "rgba(255,255,255,.6)"; g.beginPath(); g.ellipse(sx(o.x) - 0.4 * ppm, sy(yy) - 0.5 * ppm, 2.5, 4, 0, 0, 7); g.fill();
      }
    }
  }

  /* よこ から みた かみひこうき（はな が みぎ） */
  const SHAPES = {
    yari: { body: [[30, 0], [-26, 7], [-26, -1]], wing: [[26, -1], [-28, -11], [-24, -1]] },
    heso: { body: [[22, 1], [-22, 7], [-22, -1]], wing: [[18, -1], [-24, -13], [-20, -1]], nose: [[22, 1], [14, -3], [12, 3]] },
    tsubasa: { body: [[20, 0], [-20, 6], [-20, -1]], wing: [[16, -1], [-24, -16], [-22, -8], [-18, -1]] },
  };
  function drawPlane(x, y, ang) {
    const sh = SHAPES[save.plane];
    const k = Math.max(0.8, Math.min(1.6, H / 330)) * F.PLANES[save.plane].size;
    const col = COLORS[save.color];
    g.save(); g.translate(x, y); g.rotate(-ang); g.scale(k, k);
    g.lineJoin = "round"; g.strokeStyle = dark(col === "#f8f9fa" ? "#adb5bd" : col, 0.5); g.lineWidth = 1.6;
    const poly = (pts, fill) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = fill; g.fill(); g.stroke(); };
    poly(sh.body, light(col, 0.45));
    poly(sh.wing, fl.pat || col);
    if (sh.nose) poly(sh.nose, light(col, 0.2));
    g.restore();
  }

  /* テスト よう */
  window.__kami = {
    F, Fo, save, fold, fl,
    get screen() { return screen; },
    throwWith: (a, v) => doThrow(a, v),
    setSim: (k) => { SIM = k; },
  };

  renderPick();
  show("pick");
})();
