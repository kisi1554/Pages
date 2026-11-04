/* でんき の ゆくえ — がめん */
(function () {
  "use strict";
  const KEY = "denki-yukue-v1";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const P = Grid.PLANTS;

  const INFO = {
    solar: { e: "☀️", name: "たいようこう", c: "#fab005" },
    wind: { e: "🌬️", name: "ふうりょく", c: "#4dabf7" },
    dam: { e: "💧", name: "ダム", c: "#1c7ed6" },
    fire: { e: "🔥", name: "かりょく", c: "#f03e3e" },
    batt: { e: "🔋", name: "でんち", c: "#40c057" },
  };
  const WX = { hare: "☀️", kumori: "☁️", ame: "🌧️", yuki: "❄️" };
  const WXN = { hare: "はれ", kumori: "くもり", ame: "あめ", yuki: "ゆき" };
  const TERR = { umi: "うみぞい", yama: "やま", hara: "はら" };
  const POS = {
    u1: [38, 64], u2: [38, 140], u3: [38, 214],
    y1: [128, 40], y2: [232, 34], y3: [338, 42],
    h1: [362, 122], h2: [362, 202], h3: [108, 160], h4: [236, 234],
  };

  // ---------- ほぞん ----------
  let save = { stars: {}, builds: {}, set: { sound: true, slow: false } };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") {
      save.stars = raw.stars || {}; save.builds = raw.builds || {};
      save.set = Object.assign(save.set, raw.set || {});
    }
  } catch (e) { /* よめなくても あそべる */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても あそべる */ } }
  Sound.set(save.set.sound);

  // ---------- がめん きりかえ ----------
  let view = "title", stage = null, build = {}, pick = null;
  function show(v) {
    view = v;
    for (const id of ["vTitle", "vPrep", "vPlay", "vResult", "vZukan"]) $("#" + id).hidden = id !== "v" + v[0].toUpperCase() + v.slice(1);
    $("#homeBtn").hidden = v !== "title";
    $("#backBtn").hidden = v === "title";
    $("#ttl").textContent = v === "title" ? "⚡ でんき の ゆくえ" : v === "zukan" ? "📖 はつでん ずかん" :
      stage ? `${stage.icon} ${stage.id}. ${stage.name}` : "⚡ でんき の ゆくえ";
    if (v !== "play") { stopLoop(); Sound.ambient(null); }
    window.scrollTo(0, 0);
  }
  $("#backBtn").addEventListener("click", () => {
    Sound.tap();
    if (view === "play") { stopLoop(); openPrep(stage); }
    else if (view === "prep" || view === "result" || view === "zukan") openTitle();
  });
  $("#sndBtn").addEventListener("click", () => {
    save.set.sound = !save.set.sound; Sound.set(save.set.sound); store(); sndIcon();
    if (save.set.sound) Sound.tap();
  });
  function sndIcon() { $("#sndBtn").textContent = save.set.sound ? "🔊" : "🔇"; $("#sndBtn").setAttribute("aria-pressed", save.set.sound); }
  sndIcon();
  document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });

  // ---------- タイトル ----------
  const unlocked = (st) => st.id === 1 || (save.stars[st.id - 1] || 0) > 0 || (save.stars[st.id] || 0) > 0;
  function openTitle() {
    stage = null;
    const g = $("#stageGrid");
    g.innerHTML = "";
    for (const st of STAGES) {
      const b = document.createElement("button");
      const n = save.stars[st.id] || 0, open = unlocked(st);
      b.type = "button"; b.className = "st-btn" + (open ? "" : " lock"); b.dataset.id = st.id;
      b.innerHTML = `<span class="no">ステージ ${st.id}</span><span class="ic">${open ? st.icon : "🔒"}</span>` +
        `<span class="nm">${st.name}</span><span class="sr">${"★".repeat(n)}${"☆".repeat(3 - n)}</span>`;
      b.addEventListener("click", () => {
        if (!open) { Sound.nope(); toast("まえ の ステージ を クリア しよう"); return; }
        Sound.tap(); openPrep(st);
      });
      g.appendChild(b);
    }
    speedLabel();
    show("title");
  }
  function speedLabel() { $("#speedBtn").textContent = save.set.slow ? "🐢 はやさ: ゆっくり" : "🐇 はやさ: ふつう"; }
  $("#speedBtn").addEventListener("click", () => { save.set.slow = !save.set.slow; store(); speedLabel(); Sound.tap(); });
  $("#zukanBtn").addEventListener("click", () => { Sound.tap(); openZukan(); });

  // ---------- ちず（SVG） ----------
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  let map = null, mapParts = null;
  function buildMap(st) {
    const snow = (st.weather || []).some((w) => w[1] === "yuki");
    const svg = el("svg", { viewBox: "0 0 400 260", class: "map", role: "img", "aria-label": "まち の ちず" });
    el("rect", { x: 0, y: 0, width: 400, height: 260, fill: snow ? "#e7f5ff" : "#b2f2bb" }, svg);
    // はら の もよう
    for (let i = 0; i < 26; i++) el("circle", { cx: (i * 97) % 400, cy: 70 + ((i * 53) % 185), r: 2, fill: snow ? "#d0ebff" : "#8ce99a" }, svg);
    // やま
    const mt = el("g", {}, svg);
    [[60, 70, 120, 0], [110, 66, 175, 4], [180, 62, 250, -4], [240, 70, 300, 6], [290, 64, 360, 2], [340, 70, 410, 8]].forEach(([a, h, b, d], k) => {
      const top = (a + b) / 2 + d;
      el("polygon", { points: `${a},${h} ${top},${4 + (k % 2) * 8} ${b},${h}`, fill: k % 2 ? "#51cf66" : "#40c057" }, mt);
      el("polygon", { points: `${top - 10},${16 + (k % 2) * 8} ${top},${4 + (k % 2) * 8} ${top + 10},${16 + (k % 2) * 8}`, fill: "#fff", opacity: snow ? 1 : 0.7 }, mt);
    });
    // かわ
    el("path", { d: "M232 54 C 220 90, 160 80, 140 100 S 90 120, 60 118", fill: "none", stroke: "#74c0fc", "stroke-width": 7, "stroke-linecap": "round" }, svg);
    // うみ
    el("path", { d: "M0 0 H62 C 72 40, 54 80, 70 120 S 58 200, 72 260 H0 Z", fill: "#74c0fc" }, svg);
    for (let k = 0; k < 6; k++) el("path", { d: `M8 ${30 + k * 40} q 6 -5 12 0 t 12 0`, fill: "none", stroke: "#d0ebff", "stroke-width": 2 }, svg);
    // まち（たてもの の からだ → よる の かげ → まど）
    const city = el("g", {}, svg);
    const night = el("rect", { x: 0, y: 0, width: 400, height: 260, fill: "#1b1f3b", opacity: 0, "pointer-events": "none" });
    const wins = el("g", {});
    const B = [[158, 120, 26, 70], [188, 96, 30, 94], [222, 130, 22, 60], [248, 106, 28, 84], [280, 138, 24, 52],
      [150, 176, 20, 28], [204, 176, 22, 28], [262, 178, 24, 26], [298, 176, 18, 28]];
    const winList = [];
    B.forEach(([x, y, w, h], k) => {
      const house = k >= 5;
      el("rect", { x, y, width: w, height: h, rx: 2, fill: house ? "#ffc9c9" : ["#adb5bd", "#91a7ff", "#ced4da", "#a5d8ff", "#ffd8a8"][k % 5] }, city);
      if (house) el("polygon", { points: `${x - 3},${y} ${x + w / 2},${y - 12} ${x + w + 3},${y}`, fill: "#e03131" }, city);
      for (let yy = y + 6; yy < y + h - 8; yy += 12) for (let xx = x + 4; xx < x + w - 6; xx += 9) {
        winList.push(el("rect", { x: xx, y: yy, width: 5, height: 6, class: "win", fill: "#e7f5ff" }, wins));
      }
    });
    el("rect", { x: 140, y: 205, width: 180, height: 6, fill: "#868e96" }, city); // みち
    svg.appendChild(night); svg.appendChild(wins);
    // スロット
    const slotG = el("g", {}, svg), slots = {};
    for (const id of st.slots) {
      const [x, y] = POS[id];
      const g = el("g", { class: "slot", "data-id": id, transform: `translate(${x} ${y})` }, slotG);
      el("circle", { class: "ring", r: 24 }, g);
      const plus = el("text", { class: "plus", y: -2 }, g); plus.textContent = "＋";
      const tag = el("text", { class: "tag", y: 36 }, g); tag.textContent = TERR[Grid.SLOTS[id]];
      const art = el("g", {}, g);
      slots[id] = { g, plus, art, parts: {} };
    }
    const sky = el("text", { x: 384, y: 22, "font-size": 22, "text-anchor": "end" }, svg);
    const cardMark = el("text", { x: 230, y: 92, "font-size": 18, "text-anchor": "middle", opacity: 0 }, svg); cardMark.textContent = "💡✋";
    map = svg; mapParts = { night, wins: winList, slots, sky, cardMark };
    return svg;
  }

  function drawPlant(id, type) {
    const s = mapParts.slots[id];
    s.art.innerHTML = ""; s.parts = {};
    s.g.classList.toggle("filled", !!type);
    s.plus.style.display = type ? "none" : "";
    if (!type) return;
    const a = s.art;
    if (type === "solar") {
      for (const dx of [-12, 2]) {
        el("polygon", { points: `${dx - 6},10 ${dx},-10 ${dx + 14},-10 ${dx + 8},10`, fill: "#1864ab", stroke: "#e7f5ff", "stroke-width": 1.2 }, a);
        el("line", { x1: dx - 3, y1: 0, x2: dx + 11, y2: 0, stroke: "#a5d8ff", "stroke-width": 1 }, a);
      }
      s.parts.glow = el("circle", { cx: 12, cy: -16, r: 6, fill: "#ffd43b", opacity: 0 }, a);
    } else if (type === "wind") {
      el("line", { x1: 0, y1: -6, x2: 0, y2: 20, stroke: "#f8f9fa", "stroke-width": 3.5, "stroke-linecap": "round" }, a);
      const rot = el("g", { transform: "translate(0 -6)" }, a);
      for (let k = 0; k < 3; k++) el("path", { d: "M0 0 L -2.5 -3 L 0 -19 L 2.5 -3 Z", fill: "#fff", stroke: "#adb5bd", "stroke-width": 0.8, transform: `rotate(${k * 120})` }, rot);
      el("circle", { r: 2.5, fill: "#495057" }, rot);
      s.parts.rot = rot; s.parts.ang = 0;
    } else if (type === "dam") {
      s.parts.water = el("rect", { x: -18, y: -16, width: 22, height: 18, fill: "#339af0" }, a);
      el("polygon", { points: "4,-18 12,-18 18,14 -2,14", fill: "#adb5bd", stroke: "#868e96", "stroke-width": 1 }, a);
      s.parts.flow = el("path", { d: "M14 4 q 6 6 4 14", stroke: "#d0ebff", "stroke-width": 4, fill: "none", "stroke-linecap": "round", opacity: 0 }, a);
    } else if (type === "fire") {
      el("rect", { x: -16, y: -4, width: 26, height: 18, fill: "#868e96", rx: 2 }, a);
      el("rect", { x: 4, y: -20, width: 6, height: 18, fill: "#495057" }, a);
      s.parts.flame = el("rect", { x: -11, y: 3, width: 6, height: 6, fill: "#ffa94d", opacity: 0.3 }, a);
      s.parts.smoke = [0, 1, 2].map(() => el("circle", { class: "smoke", cx: 7, cy: -22, r: 4, opacity: 0 }, a));
      s.parts.t = 0;
    } else if (type === "batt") {
      el("rect", { x: -14, y: -16, width: 28, height: 32, rx: 4, fill: "#f8f9fa", stroke: "#495057", "stroke-width": 2 }, a);
      el("rect", { x: -5, y: -20, width: 10, height: 4, fill: "#495057" }, a);
      s.parts.level = el("rect", { x: -11, y: -13, width: 22, height: 26, fill: "#51cf66" }, a);
      s.parts.arrow = el("text", { y: 6, "font-size": 16, "text-anchor": "middle", fill: "#212529" }, a);
    }
  }

  // ---------- じゅんび ----------
  function openPrep(st) {
    stage = st;
    build = Object.assign({}, save.builds[st.id] || {});
    for (const id in build) if (!st.slots.includes(id) || !st.types.includes(build[id])) delete build[id];
    if (Grid.summarize(st, build).cost > st.budget) build = {};
    pick = null;
    $("#prepMap").innerHTML = "";
    $("#prepMap").appendChild(buildMap(st));
    for (const id of st.slots) drawPlant(id, build[id]);
    $("#prepIntro").textContent = st.intro;
    drawForecast(st);
    drawPalette();
    for (const id of st.slots) {
      mapParts.slots[id].g.addEventListener("click", () => tapSlot(id));
    }
    refreshPrep();
    show("prep");
  }
  function drawForecast(st) {
    const fc = Grid.forecast(st), box = $("#fcStrip");
    box.innerHTML = "";
    const max = Math.max(...fc.demand);
    for (let k = 0; k < 8; k++) {
      const from = k * 15, to = from + 15;
      const d = Math.max(...fc.demand.slice(from, to));
      const w = fc.weather[from + 7], wind = fc.wind.slice(from, to).reduce((a, b) => a + b, 0) / 15;
      const h = k * 3;
      const night = h + 1.5 < st.sun[0] || h + 1.5 > st.sun[1];
      const div = document.createElement("div");
      div.className = "fc";
      div.innerHTML = `<span>${h}じ</span><span class="e">${night && w === "hare" ? "🌙" : WX[w]}</span>` +
        `<span>${wind < 0.08 ? "－" : wind < 0.4 ? "🍃" : wind < 0.7 ? "🌬️" : "💨"}</span>` +
        `<span class="d"><i style="height:${Math.round((d / max) * 100)}%"></i></span>`;
      box.appendChild(div);
    }
    let pk = 0; fc.demand.forEach((d, i) => { if (d > fc.demand[pk]) pk = i; });
    const notes = [`つかう でんき（あおい ぼう）が いちばん おおい のは <b>${Math.floor(fc.hour[pk])}じ ごろ</b>。`];
    if (st.types.includes("dam")) notes.push(`ダム の みず: 1つ ${st.water}${st.inflow ? "（あめ で ふえる）" : ""}。`);
    if (st.cards) notes.push(`せつでん カード ${st.cards}まい。`);
    $("#fcNote").innerHTML = notes.join(" ");
  }
  function drawPalette() {
    const box = $("#palette");
    box.innerHTML = "";
    for (const t of Grid.TYPES) {
      if (!stage.types.includes(t)) continue;
      const b = document.createElement("button");
      b.type = "button"; b.className = "pal"; b.dataset.t = t;
      b.innerHTML = `<span class="pi">${INFO[t].e}</span><span class="pn">${INFO[t].name}</span><span class="pc">💰${P[t].cost}</span>`;
      box.appendChild(b);
      palDrag(b, t);
    }
  }
  function refreshPrep() {
    const sm = Grid.summarize(stage, build);
    $("#budget").textContent = `💰 ${stage.budget - sm.cost} / ${stage.budget}`;
    const make = sm.solarCap + sm.windCap + sm.damCap + sm.fireCap;
    $("#capInfo").textContent = `いちばん おおく つくれる: ⚡${Math.round(make)}（つかう の さいだい ⚡${Math.round(Math.max(...Grid.forecast(stage).demand))}）`;
    for (const b of $$(".pal")) {
      const t = b.dataset.t;
      b.classList.toggle("sel", pick === t);
      b.classList.toggle("poor", sm.cost + P[t].cost > stage.budget);
    }
    map.classList.toggle("picking", !!pick);
    for (const id of stage.slots) {
      const g = mapParts.slots[id].g;
      const can = !!pick && Grid.canPlace(stage, build, id, pick);
      g.classList.toggle("can", can);
      g.classList.toggle("cant", !!pick && !can && !build[id]);
    }
    $("#startBtn").disabled = Object.keys(build).length === 0;
  }
  function whyNot(id, t) {
    if (build[id]) return "ここ には もう たって いるよ";
    if (!P[t].where.includes(Grid.SLOTS[id])) {
      return t === "dam" ? "ダム は やま に しか つくれない よ" : t === "fire" ? "かりょく は やま に は つくれない よ" :
        t === "batt" ? "でんち は まち の ちかく（はら・うみぞい）に おこう" : "ここ には おけない よ";
    }
    if (Grid.summarize(stage, build).cost + P[t].cost > stage.budget) return "よさん が たりない よ";
    return "ここ には おけない よ";
  }
  function place(id, t) {
    if (!Grid.canPlace(stage, build, id, t)) { Sound.nope(); toast(whyNot(id, t)); return false; }
    build[id] = t; drawPlant(id, t); Sound.place();
    save.builds[stage.id] = build; store();
    if (Grid.summarize(stage, build).cost + Math.min(...stage.types.map((x) => P[x].cost)) > stage.budget) pick = null;
    refreshPrep();
    return true;
  }
  function tapSlot(id) {
    if (view !== "prep") return;
    if (build[id]) {
      delete build[id]; drawPlant(id, null); Sound.remove();
      save.builds[stage.id] = build; store(); refreshPrep(); return;
    }
    if (!pick) { toast("した の はつでんしょ を えらんで から ○ を タップ してね"); Sound.nope(); return; }
    place(id, pick);
  }
  // ドラッグ（タップ なら えらぶ だけ）
  function palDrag(btn, t) {
    let ghost = null, sx = 0, sy = 0, moved = false, over = null;
    const slotAt = (x, y) => {
      const e = document.elementFromPoint(x, y);
      const g = e && e.closest && e.closest(".slot");
      return g ? g.getAttribute("data-id") : null;
    };
    btn.addEventListener("pointerdown", (e) => {
      sx = e.clientX; sy = e.clientY; moved = false;
      try { btn.setPointerCapture(e.pointerId); } catch (er) { /* ok */ }
    });
    btn.addEventListener("pointermove", (e) => {
      if (!btn.hasPointerCapture || !btn.hasPointerCapture(e.pointerId)) return;
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) {
        moved = true;
        ghost = document.createElement("div"); ghost.className = "ghost"; ghost.textContent = INFO[t].e;
        document.body.appendChild(ghost);
        pick = t; refreshPrep();
      }
      if (moved) {
        ghost.style.left = e.clientX + "px"; ghost.style.top = e.clientY + "px";
        const id = slotAt(e.clientX, e.clientY);
        if (over !== id) {
          if (over) mapParts.slots[over].g.classList.remove("over");
          over = id;
          if (over) mapParts.slots[over].g.classList.add("over");
        }
      }
    });
    const end = (e, cancel) => {
      if (ghost) { ghost.remove(); ghost = null; }
      if (over) { mapParts.slots[over].g.classList.remove("over"); }
      if (moved) {
        const id = cancel ? null : slotAt(e.clientX, e.clientY);
        if (id) place(id, t);
        else refreshPrep();
      } else if (!cancel) {
        pick = t; Sound.tap(); refreshPrep();
      }
      over = null; moved = false;
    };
    btn.addEventListener("pointerup", (e) => end(e, false));
    btn.addEventListener("pointercancel", (e) => end(e, true));
  }
  $("#startBtn").addEventListener("click", () => { Sound.start(); startPlay(); });

  // ---------- プレイ ----------
  let sim = null, ctl = null, timer = 0, lastT = 0, acc = 0, paused = false, cardReq = false, autopilot = false;
  let stepMs = 500, wasShort = false, raf = 0, prevWx = null;
  function startPlay() {
    sim = Grid.createSim(stage, build);
    const a = Grid.auto(sim, { round: true });
    ctl = { dam: a.dam, fire: a.fire, batt: "charge" };
    $("#playMap").innerHTML = ""; $("#playMap").appendChild(map);
    map.classList.remove("picking", "dark", "flick");
    for (const id of stage.slots) { mapParts.slots[id].g.classList.remove("can", "cant"); mapParts.slots[id].g.querySelector(".tag").style.display = "none"; mapParts.slots[id].g.style.display = build[id] ? "" : "none"; }
    $("#ctlDam").hidden = sim.cap.damCap === 0;
    $("#ctlFire").hidden = sim.cap.fireCap === 0;
    $("#ctlBatt").hidden = sim.cap.battSize === 0;
    $("#cardBtn").hidden = !stage.cards;
    $("#co2Mark").style.left = "66.6%"; $("#wasteMark").style.left = "66.6%";
    $("#blackout").hidden = true; $("#pauseCover").hidden = true;
    paused = false; cardReq = false; wasShort = false; prevWx = null; acc = 0;
    stepMs = save.set.slow ? 750 : 500;
    setSlider("dam", ctl.dam); setSlider("fire", ctl.fire); setMode("charge");
    show("play");
    resizeGraph();
    updatePlay(null);
    lastT = performance.now();
    loop();
  }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function loop() {
    raf = requestAnimationFrame(loop);
    const now = performance.now(), dt = Math.min(200, now - lastT); lastT = now;
    if (!paused && sim && !sim.done) {
      acc += dt;
      while (acc >= stepMs && !sim.done) { acc -= stepMs; tick(); }
    }
    animate(dt);
  }
  function tick() {
    if (autopilot) {
      const a = Grid.auto(sim, { round: true }); setSlider("dam", a.dam); setSlider("fire", a.fire); setMode(a.batt);
      if (Grid.cardPlan(stage).includes(sim.i)) cardReq = true;
    }
    const rec = sim.step({ dam: ctl.dam, fire: ctl.fire, batt: ctl.batt, card: cardReq });
    cardReq = false;
    updatePlay(rec);
    if (rec.short) { if (!wasShort) toast("たりない！ でんき を ふやして！"); Sound.warn(); }
    else if (wasShort) Sound.restore();
    wasShort = rec.short;
    if (rec.weather !== prevWx && prevWx) toast(`${WX[rec.weather]} ${WXN[rec.weather]} に なった！`);
    prevWx = rec.weather;
    if (sim.done) finish();
  }
  function finish() {
    Sound.ambient(null);
    if (sim.blackout) {
      map.classList.add("dark"); map.classList.remove("flick");
      Sound.blackout();
      $("#blackout").hidden = false;
      setTimeout(() => { $("#blackout").hidden = true; openResult(); }, 1600);
    } else setTimeout(openResult, 500);
  }
  function hhmm(h) { const m = Math.floor(h * 60) % 1440; return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; }
  function updatePlay(rec) {
    const st = stage, cap = sim.cap;
    const i = Math.min(sim.i, Grid.STEPS - 1), h = rec ? rec.hour + Grid.DT / 2 : 0;
    $("#clock").textContent = hhmm(h);
    const wx = sim.fc.weather[i], isNight = h < st.sun[0] || h > st.sun[1];
    $("#wx").textContent = isNight && wx === "hare" ? "🌙" : WX[wx];
    // かお
    let face = "😊", ft = "たりてる";
    if (rec) {
      const spare = rec.supply + (ctl.batt === "discharge" ? 0 : 0) - rec.demand;
      if (rec.short) { face = "😱"; ft = "たりない！"; }
      else if (spare < rec.demand * 0.08 && rec.waste < 0.5) { face = "😐"; ft = "ぎりぎり"; }
      else if (rec.waste > rec.demand * 0.35) { face = "😅"; ft = "あまってる"; }
    }
    $("#face").textContent = face; $("#faceTxt").textContent = ft;
    map.classList.toggle("flick", !!(rec && rec.short));
    // よる の くらさ
    const dark = h < st.sun[0] - 0.5 || h > st.sun[1] + 0.5 ? 0.5 : h < st.sun[0] + 1 ? 0.5 * (st.sun[0] + 1 - h) / 1.5 : h > st.sun[1] - 1 ? 0.5 * (h - st.sun[1] + 1) / 1.5 : 0;
    mapParts.night.setAttribute("opacity", Math.max(0, Math.min(0.5, dark)).toFixed(2));
    const lit = dark > 0.15 ? "#ffd43b" : "#e7f5ff";
    if (mapParts.lit !== lit) { for (const w of mapParts.wins) w.setAttribute("fill", lit); mapParts.lit = lit; }
    mapParts.sky.textContent = isNight && wx === "hare" ? "🌙" : WX[wx];
    mapParts.cardMark.setAttribute("opacity", sim.cardLeft > 0 ? 1 : 0);
    // メーター
    const cm = st.co2Max * 1.5, wm = st.wasteMax * 1.5;
    $("#co2Bar").style.width = Math.min(100, (sim.co2 / cm) * 100) + "%";
    $("#co2Bar").classList.toggle("over", sim.co2 > st.co2Max);
    $("#co2Val").textContent = Math.round(sim.co2);
    $("#wasteBar").style.width = Math.min(100, (sim.waste / wm) * 100) + "%";
    $("#wasteBar").classList.toggle("over", sim.waste > st.wasteMax);
    $("#wasteVal").textContent = Math.round(sim.waste);
    // ダム・かりょく・でんち
    if (cap.damCap) {
      $("#waterBar").style.width = Math.min(100, (sim.water / Math.max(1, cap.water0 || cap.waterMax / 1.5)) * 100) + "%";
      $("#damOut").textContent = rec ? `⚡${rec.dam.toFixed(1)}` : "";
    }
    if (cap.fireCap) $("#fireOut").textContent = rec ? `⚡${rec.fire.toFixed(1)}　けむり が でる よ` : "";
    if (cap.battSize) {
      const pc = Math.round((sim.batt / cap.battSize) * 100);
      $("#battVal").textContent = pc + "%"; $("#battBar").style.width = pc + "%";
    }
    $("#cardN").textContent = `×${sim.cards}`;
    $("#cardBtn").disabled = sim.cards === 0 || sim.cardLeft > 0 || sim.done;
    $("#cardBtn").classList.toggle("active", sim.cardLeft > 0);
    // しぜん の ようす
    if (rec) {
      const parts = [];
      if (cap.solarCap) parts.push(`☀️ ⚡${rec.solar.toFixed(1)}`);
      if (cap.windCap) parts.push(`🌬️ ⚡${rec.wind.toFixed(1)}`);
      parts.push(`🏘️ つかう ⚡${rec.demand.toFixed(1)}`);
      $("#natureTxt").textContent = parts.join("　");
      Sound.ambient({ city: rec.demand / (st.peak * 1.6), wind: cap.windCap ? rec.windV : 0, dam: cap.damCap ? rec.dam / cap.damCap : 0 });
    } else $("#natureTxt").textContent = "";
    drawGraph($("#graph"), sim, true);
    plantLevels(rec);
  }
  function plantLevels(rec) {
    const cap = sim.cap;
    for (const id of stage.slots) {
      const t = build[id], p = mapParts.slots[id].parts;
      if (!t) continue;
      if (t === "solar") p.glow.setAttribute("opacity", rec ? Math.min(1, sim.fc.sun[rec.i] * 1.2).toFixed(2) : 0);
      if (t === "wind") p.speed = rec ? rec.windV : 0;
      if (t === "dam") {
        const r = cap.water0 ? Math.min(1, sim.water / cap.water0) : 0;
        p.water.setAttribute("height", (18 * r).toFixed(1)); p.water.setAttribute("y", (2 - 18 * r).toFixed(1));
        p.flow.setAttribute("opacity", rec && cap.damCap ? Math.min(1, rec.dam / cap.damCap + 0.1 * (rec.dam > 0)).toFixed(2) : 0);
      }
      if (t === "fire") { p.level = rec ? rec.fire / cap.fireCap : ctl.fire; p.flame.setAttribute("opacity", (0.2 + 0.8 * p.level).toFixed(2)); }
      if (t === "batt") {
        const r = cap.battSize ? sim.batt / cap.battSize : 0;
        p.level.setAttribute("height", (26 * r).toFixed(1)); p.level.setAttribute("y", (13 - 26 * r).toFixed(1));
        p.arrow.textContent = rec && rec.charge > 0.05 ? "⬆" : rec && rec.dis > 0.05 ? "⬇" : "";
      }
    }
  }
  function animate(dt) {
    if (!mapParts || view !== "play") return;
    for (const id of stage.slots) {
      const t = build[id], p = mapParts.slots[id].parts;
      if (t === "wind" && p.rot) { p.ang = (p.ang + (p.speed || 0) * dt * 0.5) % 360; p.rot.setAttribute("transform", `translate(0 -6) rotate(${p.ang.toFixed(1)})`); }
      if (t === "fire" && p.smoke) {
        p.t = (p.t + dt / 1600) % 1;
        p.smoke.forEach((c, k) => {
          const f = (p.t + k / 3) % 1;
          c.setAttribute("cy", (-22 - f * 26).toFixed(1)); c.setAttribute("cx", (7 + f * 8).toFixed(1));
          c.setAttribute("r", (3 + f * 5).toFixed(1)); c.setAttribute("opacity", ((1 - f) * 0.8 * (p.level || 0)).toFixed(2));
        });
      }
    }
  }

  // スライダー（タッチ・マウス・キー）
  function setSlider(k, v) {
    v = Math.max(0, Math.min(1, Math.round(v * 20) / 20));
    if (ctl) ctl[k] = v;
    const s = $("#" + k + "Slider");
    s.querySelector(".fill").style.width = v * 100 + "%";
    s.querySelector(".thumb").style.left = v * 100 + "%";
    s.setAttribute("aria-valuenow", Math.round(v * 100));
    $("#" + k + "Val").textContent = Math.round(v * 100) + "%";
    if (k === "fire" && map && view === "play") plantLevels(null);
  }
  for (const s of $$(".slider")) {
    const k = s.dataset.k, tr = s.querySelector(".track");
    const at = (e) => { const r = tr.getBoundingClientRect(); setSlider(k, (e.clientX - r.left) / r.width); };
    s.addEventListener("pointerdown", (e) => { e.preventDefault(); try { s.setPointerCapture(e.pointerId); } catch (er) { /* ok */ } at(e); Sound.tap(); });
    s.addEventListener("pointermove", (e) => { if (s.hasPointerCapture && s.hasPointerCapture(e.pointerId)) at(e); });
    s.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.1 : 0;
      if (d) { e.preventDefault(); setSlider(k, ctl[k] + d); }
    });
  }
  function setMode(m) {
    if (ctl) ctl.batt = m;
    for (const b of $$(".bmode")) b.classList.toggle("on", b.dataset.m === m);
  }
  for (const b of $$(".bmode")) b.addEventListener("click", () => { setMode(b.dataset.m); Sound.tap(); });
  $("#cardBtn").addEventListener("click", () => {
    if (!sim || sim.cards === 0 || sim.cardLeft > 0) return;
    cardReq = true; Sound.card(); toast("💡 みんな、つかわない でんき を けして〜！");
    $("#cardBtn").disabled = true;
  });
  function setPause(p) { paused = p; $("#pauseCover").hidden = !p; $("#pauseBtn").textContent = p ? "▶" : "⏸"; if (p) Sound.ambient(null); }
  $("#pauseBtn").addEventListener("click", () => { Sound.tap(); setPause(!paused); });
  $("#resumeBtn").addEventListener("click", () => { Sound.tap(); setPause(false); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && view === "play" && sim && !sim.done) setPause(true); });

  // ---------- グラフ ----------
  function resizeGraph() {
    for (const c of [$("#graph"), $("#resGraph")]) {
      const r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1;
      if (r.width > 0) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
    }
  }
  window.addEventListener("resize", () => { resizeGraph(); if (sim && (view === "play" || view === "result")) { drawGraph($("#graph"), sim, true); drawGraph($("#resGraph"), sim, false); } });
  function drawGraph(cv, s, live) {
    const g = cv.getContext("2d"), W = cv.width, H = cv.height;
    if (!W || !H) return;
    const d = window.devicePixelRatio || 1;
    g.clearRect(0, 0, W, H);
    const L = 28 * d, R = 14 * d, T = 6 * d, B = 18 * d;
    const max = Math.max(...s.fc.demand) * 1.35;
    const X = (i) => L + ((W - L - R) * i) / Grid.STEPS, Y = (v) => H - B - ((H - B - T) * Math.min(v, max)) / max;
    // よる
    g.fillStyle = "#edf2ff";
    for (let i = 0; i < Grid.STEPS; i++) { const h = s.fc.hour[i]; if (h < s.st.sun[0] || h > s.st.sun[1]) g.fillRect(X(i), T, X(1) - X(0) + 0.5, H - B - T); }
    // めもり
    g.strokeStyle = "#dee2e6"; g.lineWidth = 1; g.fillStyle = "#868e96"; g.font = `${10 * d}px sans-serif`; g.textAlign = "center";
    for (let h = 0; h <= 24; h += 6) { const x = X(h / Grid.DT); g.beginPath(); g.moveTo(x, T); g.lineTo(x, H - B); g.stroke(); g.fillText(h + "じ", x, H - 4 * d); }
    g.textAlign = "right"; g.fillText("⚡", L - 6 * d, T + 10 * d);
    // つくる でんき（きいろ）
    const log = s.log;
    if (log.length) {
      g.fillStyle = "rgba(252,196,25,.65)";
      g.beginPath(); g.moveTo(X(0), Y(0));
      log.forEach((r, k) => { g.lineTo(X(k), Y(r.supply)); g.lineTo(X(k + 1), Y(r.supply)); });
      g.lineTo(X(log.length), Y(0)); g.closePath(); g.fill();
      // たりない ところ
      g.fillStyle = "rgba(224,49,49,.55)";
      log.forEach((r, k) => { if (r.short) g.fillRect(X(k), Y(r.demand), X(k + 1) - X(k), Y(r.supply) - Y(r.demand)); });
    }
    // つかう でんき（あお）: よそう は うすく
    g.lineWidth = 2 * d;
    g.strokeStyle = "rgba(28,126,214,.35)"; g.setLineDash([5 * d, 4 * d]);
    g.beginPath(); s.fc.demand.forEach((v, k) => { const x = X(k + 0.5), y = Y(v); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    g.setLineDash([]);
    if (log.length) {
      g.strokeStyle = "#1c7ed6"; g.lineWidth = 3 * d;
      g.beginPath(); log.forEach((r, k) => { const x = X(k + 0.5), y = Y(r.demand); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    }
    if (live) { const x = X(log.length); g.strokeStyle = "#e8590c"; g.lineWidth = 2 * d; g.beginPath(); g.moveTo(x, T); g.lineTo(x, H - B); g.stroke(); }
  }

  // ---------- けっか ----------
  function openResult() {
    const r = sim.result();
    const prev = save.stars[stage.id] || 0;
    if (r.count > prev) { save.stars[stage.id] = r.count; store(); }
    $("#resTitle").textContent = r.blackout ? "🌑 まっくら に なっちゃった…" : r.count === 3 ? "🎉 かんぺき！ ★3" : "😊 1にち のりきった！";
    $("#resStars").innerHTML = [0, 1, 2].map((k) => `<span class="${r.stars[k] ? "" : "off"}">★</span>`).join("");
    const li = (ok, t) => `<li>${ok ? "✅" : "⬜"} ${t}</li>`;
    $("#resList").innerHTML =
      li(r.stars[0], r.blackout ? `まっくら に しなかった（${hhmm(sim.i * Grid.DT)} に まっくら）` : "まっくら に しなかった") +
      li(r.stars[1], `けむり が すくない（☁️ ${Math.round(r.co2)} ／ めやす ${stage.co2Max} いか）`) +
      li(r.stars[2], `むだ が すくない（🗑️ ${Math.round(r.waste)} ／ めやす ${stage.wasteMax} いか）`);
    let tip = "💡 " + stage.tip;
    if (r.blackout) tip = "💡 たりなく なり そう な とき は、ダム の ゲート を あける・かりょく の ひ を つよく する・でんち を「だす」に する。グラフ の うすい あおい せん が この さき つかう でんき の よそう だよ。";
    else if (!r.stars[1]) tip = "💡 けむり を へらす には、たいようこう や ふうりょく を ふやして、あまった ぶん を でんち に ためよう。";
    else if (!r.stars[2]) tip = "💡 むだ を へらす には、かりょく の ひ を つよく しすぎない こと。あまる とき は でんち を「ためる」に しよう。";
    $("#resTip").textContent = tip;
    const next = STAGES[stage.id];
    $("#nextBtn").hidden = !next || r.count === 0;
    show("result");
    resizeGraph();
    drawGraph($("#resGraph"), sim, false);
    if (r.count > 0) Sound.fanfare(r.count);
  }
  $("#retryBtn").addEventListener("click", () => { Sound.start(); startPlay(); });
  $("#rebuildBtn").addEventListener("click", () => { Sound.tap(); openPrep(stage); });
  $("#nextBtn").addEventListener("click", () => { Sound.tap(); openPrep(STAGES[stage.id]); });
  $("#menuBtn").addEventListener("click", () => { Sound.tap(); openTitle(); });

  // ---------- ずかん ----------
  const ZUKAN = [
    ["solar", "おひさま の ひかり を パネル で でんき に かえる。", "けむり が でない。やね の うえ にも おける。", "よる は 0。くもり や あめ だと すこし しか つくれない。"],
    ["wind", "かぜ で ふうしゃ を まわして でんき を つくる。", "けむり が でない。かぜ が あれば よる も うごく。", "かぜ が ない と とまる。どれ だけ ふくか は その ひ しだい。"],
    ["dam", "ダム に ためた みず を おとして、みずぐるま を まわす（すいりょく）。", "けむり が でない。ほしい とき に すぐ ふやせる。", "みず に かぎり が ある。つくれる ばしょ は やま だけ。"],
    ["fire", "ガス や せきたん を もやして、ゆげ で タービン を まわす。", "いつでも ほしい だけ つくれる。", "けむり（CO₂ ＝ にさんか たんそ）が でて、ちきゅう が あたたまる げんいん に なる。"],
    ["batt", "あまった でんき を ためて おき、たりない とき に だす。", "ひる の たいよう を よる に つかえる。", "でんき を つくる わけ では ない。いっぱい に なったら それ いじょう ためられない。"],
  ];
  function openZukan() {
    const box = $("#zukanList");
    box.innerHTML = ZUKAN.map(([t, what, good, bad]) =>
      `<div class="zcard" style="--c:${INFO[t].c}"><h3>${INFO[t].e} ${INFO[t].name}</h3><p>${what}</p>` +
      `<p class="good">👍 ${good}</p><p class="bad">👎 ${bad}</p><p>💰 ${P[t].cost}</p></div>`).join("") +
      `<div class="zcard small" style="--c:#868e96"><h3>⚛️ ほか にも…</h3><p><ruby>原子力<rt>げんしりょく</rt></ruby> はつでん という はつでん も ある。` +
      `けむり は でない けど、とりあつかい が とても むずかしい ので、この ゲーム には でて こないよ。</p></div>` +
      `<div class="zcard small" style="--c:#1c7ed6"><h3>📈 でんき の きほん</h3><p>でんき は ためる のが にがて なので、` +
      `<b>つかう ぶん と おなじ だけ を いつも つくって</b> いるんだ。たりない と ていでん、つくりすぎ も むだ に なる。` +
      `いちばん たくさん つかう じかん（ピーク）は、みんな が いえ に かえる ゆうがた から よる。</p></div>`;
    show("zukan");
  }

  // ---------- ちいさな メッセージ ----------
  let toastT = 0;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 1800);
  }

  // テスト よう
  window.DYTest = {
    save: () => JSON.parse(JSON.stringify(save)),
    sim: () => sim && { cards: sim.cards, i: sim.i, done: sim.done, blackout: sim.blackout, co2: sim.co2, waste: sim.waste, batt: sim.batt },
    ctl: () => Object.assign({}, ctl),
    build: () => Object.assign({}, build),
    speed: (ms) => { stepMs = ms; },
    autopilot: (on) => { autopilot = !!on; },
    pause: (p) => setPause(!!p),
  };

  openTitle();
})();
