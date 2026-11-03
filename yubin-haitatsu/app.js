/* ゆうびん はいたつ — がめん（ホーム・しわけ・はいたつ・おわり・クイズ・てがみを かこう） */
(function () {
  "use strict";
  const T = window.YHTown, R = window.YHRoute, A = window.YHAudio;
  const $ = (id) => document.getElementById(id);
  const KEY = "yubin-haitatsu-v1";
  const C = 10;          // 1マスの おおきさ（SVG の たんい）
  const M = 7;           // ちずの まわりの よはく
  const SVGNS = "http://www.w3.org/2000/svg";
  let STEP_MS = 120;     // バイクが 1マス すすむ じかん

  /* ---------- ほぞん ---------- */
  const save = { day: 1, cleared: 0, best: {}, letters: [], sound: true, quiz: {} };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s && typeof s === "object") Object.assign(save, s);
  } catch (e) { /* よめなくても あそべる */ }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても つづける */ } }

  /* ---------- こまかい どうぐ ---------- */
  function el(tag, attrs, parent) {
    const e = tag.startsWith("svg:") ? document.createElementNS(SVGNS, tag.slice(4)) : document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(e);
    return e;
  }
  let toastTimer = 0;
  function toast(msg, ms) {
    const t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), ms || 2200);
  }
  function shake(e) { e.classList.remove("shake"); void e.offsetWidth; e.classList.add("shake"); }
  const KIND = { hagaki: { e: "🎴", n: "はがき" }, futo: { e: "✉️", n: "ふうとう" }, kozutsumi: { e: "📦", n: "こづつみ" } };
  const ink = (ch) => T.CHOME_INKS[ch - 1];
  const tint = (ch) => T.CHOME_COLORS[ch - 1];

  /* ドラッグ（ゆびでも マウスでも）。うごかさずに はなしたら タップ */
  function dragify(node, targetSel, onDrop, onTap) {
    node.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      const id = e.pointerId, sx = e.clientX, sy = e.clientY;
      let ghost = null, over = null;
      try { node.setPointerCapture(id); } catch (er) { /* なにも しない */ }
      const targetAt = (x, y) => { const h = document.elementFromPoint(x, y); return h && h.closest(targetSel); };
      const move = (ev) => {
        if (ev.pointerId !== id) return;
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
          ghost = node.cloneNode(true); ghost.classList.add("ghost"); ghost.classList.remove("sel");
          document.body.appendChild(ghost); node.classList.add("dragging"); A.pick();
        }
        if (!ghost) return;
        ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px";
        const t = targetAt(ev.clientX, ev.clientY);
        if (t !== over) { if (over) over.classList.remove("over"); over = t; if (over) over.classList.add("over"); }
      };
      const end = (ev, cancel) => {
        if (ev.pointerId !== id) return;
        node.removeEventListener("pointermove", move); node.removeEventListener("pointerup", up); node.removeEventListener("pointercancel", cc);
        if (over) over.classList.remove("over");
        if (ghost) {
          ghost.remove(); node.classList.remove("dragging");
          if (!cancel) onDrop(targetAt(ev.clientX, ev.clientY));
        } else if (!cancel) onTap();
      };
      const up = (ev) => end(ev, false), cc = (ev) => end(ev, true);
      node.addEventListener("pointermove", move); node.addEventListener("pointerup", up); node.addEventListener("pointercancel", cc);
    });
  }

  function letterNode(L, town, full) {
    const h = town.houses[L.house];
    const n = el("div", { class: "letter " + L.kind + (L.express ? " express" : ""), role: "button", "data-id": L.id });
    el("span", { class: "k", text: KIND[L.kind].e }, n);
    const a = el("span", { class: "a" }, n);
    if (full) {
      el("span", { class: "tw", text: town.name }, a);
      el("span", { class: "nw", style: "color:" + ink(h.chome), text: h.chome + "ちょうめ" }, a);
      el("span", { class: "nw", text: " " + h.ban + "ばん " + h.go + "ごう" }, a);
    } else {
      const c = el("span", { class: "nw" }, a);
      el("span", { class: "chome-dot", style: "background:" + ink(h.chome) }, c);
      c.appendChild(document.createTextNode(h.chome + "ちょうめ"));
      el("span", { class: "nw", text: h.ban + "ばん " + h.go + "ごう" }, a);
    }
    el("span", { class: "n", text: h.name + " さま" + (L.who ? "（" + L.who + "）" : "") }, n);
    return n;
  }

  /* ---------- ちず（SVG） ---------- */
  function MapView(svg, opt) {
    this.svg = svg; this.opt = opt || {};
    this.z = 1; this.cx = 0; this.cy = 0;
    this.pointers = new Map();
    this.bind();
  }
  MapView.prototype.load = function (town) {
    const svg = this.svg, t = town;
    this.town = t;
    svg.innerHTML = "";
    this.bw = t.W * C + M * 2; this.bh = t.H * C + M * 2;
    this.cx = this.bw / 2 - M; this.cy = this.bh / 2 - M; this.z = 1;
    const g = el("svg:g", {}, svg);
    el("svg:rect", { x: -M, y: -M, width: this.bw, height: this.bh, fill: "#d8f0c8" }, g);
    // ちょうめの なまえ（まわりの よはく）
    const hw = t.W * C / 2, hh = t.H * C;
    [[1, hw / 2, -2.2], [2, hw * 1.5, -2.2], [3, hw / 2, hh + 5], [4, hw * 1.5, hh + 5]].forEach(([ch, x, y]) => {
      el("svg:text", { x, y, "text-anchor": "middle", class: "chome-label", fill: ink(ch), text: ch + "ちょうめ" }, g);
    });
    // みち
    const roads = el("svg:g", { fill: "#adb5bd" }, g);
    for (let y = 0; y < t.H; y++) for (let x = 0; x < t.W; x++) {
      if (t.road[y * t.W + x]) el("svg:rect", { x: x * C - 0.05, y: y * C - 0.05, width: C + 0.1, height: C + 0.1 }, roads);
    }
    // みちの まんなかの せん
    const lines = el("svg:g", { stroke: "#fff", "stroke-width": 0.5, "stroke-dasharray": "2 2", opacity: 0.8 }, g);
    for (let y = 0; y < t.H; y += 3) for (let x = 0; x < t.W - 1; x++) {
      if (T.isRoad(t, x, y) && T.isRoad(t, x + 1, y)) el("svg:line", { x1: x * C + C / 2, y1: y * C + C / 2, x2: x * C + C * 1.5, y2: y * C + C / 2 }, lines);
    }
    for (let x = 0; x < t.W; x += 3) for (let y = 0; y < t.H - 1; y++) {
      if (T.isRoad(t, x, y) && T.isRoad(t, x, y + 1)) el("svg:line", { x1: x * C + C / 2, y1: y * C + C / 2, x2: x * C + C / 2, y2: y * C + C * 1.5 }, lines);
    }
    // とおれない ところ
    for (const seg of t.cuts) for (const [x, y] of seg) {
      if (t.id === "mori") {
        el("svg:rect", { x: x * C, y: y * C, width: C, height: C, fill: "#8ce99a" }, g);
        el("svg:text", { x: x * C + C / 2, y: y * C + C * 0.62, "text-anchor": "middle", "dominant-baseline": "middle", "font-size": 7.5, text: "🌳" }, g);
      } else {
        el("svg:rect", { x: x * C + 0.6, y: y * C + 3, width: C - 1.2, height: 4, fill: "#ff922b", stroke: "#fff", "stroke-width": 0.6, "stroke-dasharray": "1.5 1.5" }, g);
        el("svg:text", { x: x * C + C / 2, y: y * C + 2.6, "text-anchor": "middle", "font-size": 4, text: "🚧" }, g);
      }
    }
    // ブロック（ちょうめの いろ）
    for (const b of t.blocks) {
      el("svg:rect", { x: b.x0 * C + 0.4, y: b.y0 * C + 0.4, width: 2 * C - 0.8, height: 2 * C - 0.8, rx: 1.5, fill: tint(b.chome) }, g);
    }
    // いえ
    this.houseEls = [];
    const hg = el("svg:g", {}, g);
    for (const h of t.houses) {
      // ブロックの まんなか（ばんの かんばん）から すこし はなす
      const px = (h.go === 1 || h.go === 4) ? -0.6 : 0.6, py = h.go <= 2 ? -0.6 : 0.6;
      const x = h.x * C + px, y = h.y * C + py;
      const e = el("svg:g", { class: "house", "data-h": h.id }, hg);
      el("svg:rect", { class: "body", x: x + 1.3, y: y + 3.2, width: C - 2.6, height: C - 4.4, rx: 0.6, fill: "#fff", stroke: "#868e96", "stroke-width": 0.35 }, e);
      el("svg:path", { d: `M${x + 0.7} ${y + 3.6} L${x + C / 2} ${y + 0.8} L${x + C - 0.7} ${y + 3.6} Z`, fill: ink(h.chome) }, e);
      el("svg:text", { x: x + C / 2, y: y + 6.6, "text-anchor": "middle", class: "hs-go", text: h.go }, e);
      el("svg:text", { x: x + C / 2, y: y + 8.6, "text-anchor": "middle", class: "hs-name", text: h.name }, e);
      // ポスト（ドアの ある がわ）
      const d = h.door, mp = { n: [x + C / 2 - 1, y + 0.1], s: [x + C / 2 - 1, y + C - 1.5], e: [x + C - 1.4, y + C / 2], w: [x, y + C / 2] }[d.side];
      el("svg:rect", { x: mp[0], y: mp[1], width: 2, height: 1.4, rx: 0.3, fill: "#e03131" }, e);
      this.houseEls[h.id] = e;
    }
    // ゆうびんきょく
    const o = t.office, ox = o.x * C, oy = o.y * C;
    el("svg:rect", { x: ox + 0.8, y: oy + 1.2, width: C - 1.6, height: C - 2, rx: 1, fill: "#e03131" }, g);
    el("svg:text", { x: ox + C / 2, y: oy + 6.4, "text-anchor": "middle", "font-size": 5.2, "font-weight": "bold", fill: "#fff", text: "〒" }, g);
    el("svg:text", { x: ox + C / 2, y: oy + 8.5, "text-anchor": "middle", "font-size": 1.7, fill: "#fff", text: "ゆうびんきょく" }, g);
    // ばんの かんばん（ブロックの まんなか）
    for (const b of t.blocks) {
      const sx = (b.x0 + 1) * C, sy = (b.y0 + 1) * C;
      const s = el("svg:g", { class: "ban-sign" }, g);
      el("svg:rect", { x: sx - 2.9, y: sy - 1.6, width: 5.8, height: 3.2, rx: 0.8, fill: ink(b.chome), stroke: "#fff", "stroke-width": 0.4 }, s);
      el("svg:text", { x: sx, y: sy + 0.9, "text-anchor": "middle", "font-size": 2.5, text: b.ban + "ばん" }, s);
    }
    this.over = el("svg:g", {}, g);
    this.top = el("svg:g", {}, g);
    this.apply();
  };
  MapView.prototype.apply = function () {
    const w = this.bw / this.z, h = this.bh / this.z;
    const minX = -M + w / 2, maxX = -M + this.bw - w / 2, minY = -M + h / 2, maxY = -M + this.bh - h / 2;
    this.cx = Math.min(maxX, Math.max(minX, this.cx)); this.cy = Math.min(maxY, Math.max(minY, this.cy));
    this.svg.setAttribute("viewBox", `${this.cx - w / 2} ${this.cy - h / 2} ${w} ${h}`);
  };
  MapView.prototype.zoomBy = function (f) { this.z = Math.min(4, Math.max(1, this.z * f)); this.apply(); };
  MapView.prototype.center = function (x, y) { this.cx = x * C + C / 2; this.cy = y * C + C / 2; this.apply(); };
  MapView.prototype.toWorld = function (cx, cy) {
    const p = this.svg.createSVGPoint(); p.x = cx; p.y = cy;
    const m = this.svg.getScreenCTM(); if (!m) return { x: 0, y: 0 };
    const q = p.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  };
  MapView.prototype.cellAt = function (cx, cy) {
    const w = this.toWorld(cx, cy);
    return { x: Math.floor(w.x / C), y: Math.floor(w.y / C) };
  };
  MapView.prototype.cellToScreen = function (x, y) {
    const p = this.svg.createSVGPoint(); p.x = x * C + C / 2; p.y = y * C + C / 2;
    const q = p.matrixTransform(this.svg.getScreenCTM());
    return { x: q.x, y: q.y };
  };
  MapView.prototype.bind = function () {
    const svg = this.svg;
    let start = null, mode = null, pinch0 = null;
    svg.addEventListener("pointerdown", (e) => {
      if (!this.town) return;
      e.preventDefault();
      try { svg.setPointerCapture(e.pointerId); } catch (er) { /* なにも しない */ }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: this.z };
        mode = "pinch"; return;
      }
      if (this.pointers.size > 2) return;
      start = { x: e.clientX, y: e.clientY, t: Date.now(), cx: this.cx, cy: this.cy };
      const cell = this.cellAt(e.clientX, e.clientY);
      mode = this.opt.onTraceStart && this.opt.onTraceStart(cell) ? "trace" : "maybe";
    });
    svg.addEventListener("pointermove", (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mode === "pinch" && this.pointers.size >= 2) {
        const [a, b] = [...this.pointers.values()];
        this.z = Math.min(4, Math.max(1, pinch0.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch0.d));
        this.apply(); return;
      }
      if (!start) return;
      if (mode === "trace") { this.opt.onTrace(this.cellAt(e.clientX, e.clientY)); return; }
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (mode === "maybe" && Math.hypot(dx, dy) > 10) mode = "pan";
      if (mode === "pan") {
        const r = svg.getBoundingClientRect();
        const s = Math.max((this.bw / this.z) / r.width, (this.bh / this.z) / r.height);
        this.cx = start.cx - dx * s; this.cy = start.cy - dy * s; this.apply();
      }
    });
    const up = (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      if (mode === "maybe" && e.type === "pointerup" && start) {
        const cell = this.cellAt(e.clientX, e.clientY);
        if (this.opt.onTap) this.opt.onTap(cell, T.houseAt(this.town, cell.x, cell.y));
      }
      if (mode === "trace" && this.opt.onTraceEnd) this.opt.onTraceEnd();
      if (this.pointers.size === 0) { mode = null; start = null; }
      else if (mode === "pinch") { mode = "done"; }
    };
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
    svg.addEventListener("wheel", (e) => { e.preventDefault(); this.zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
  };
  MapView.prototype.ring = function (h, cls, color) {
    const r = el("svg:rect", { x: h.x * C - 0.3, y: h.y * C - 0.3, width: C + 0.6, height: C + 0.6, rx: 2, fill: "none", stroke: color || "#fab005", "stroke-width": 1.4, class: cls || "pulse" }, this.top);
    return r;
  };
  MapView.prototype.clearTop = function () { this.top.innerHTML = ""; };
  MapView.prototype.polyline = function (cells, color, width, layer) {
    const pts = cells.map((c) => (c.x * C + C / 2) + "," + (c.y * C + C / 2)).join(" ");
    return el("svg:polyline", { points: pts, fill: "none", stroke: color, "stroke-width": width || 1.6, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0.85 }, layer || this.over);
  };
  MapView.prototype.bike = function (cls) {
    const g = el("svg:g", cls ? { class: cls } : { id: "bike" }, this.top);
    const inner = el("svg:g", {}, g);
    el("svg:circle", { cx: 0, cy: 0, r: 4.2, fill: "#fff", stroke: "#e03131", "stroke-width": 0.8, opacity: 0.9 }, inner);
    el("svg:text", { x: 0, y: 0.3, "text-anchor": "middle", "dominant-baseline": "middle", "font-size": 6, text: "🛵" }, inner);
    g.inner = inner;
    return g;
  };
  function placeBike(g, x, y, dir) {
    g.style.transform = `translate(${x * C + C / 2}px, ${y * C + C / 2}px)`;
    if (dir) g.inner.setAttribute("transform", dir > 0 ? "scale(-1,1)" : "");
  }

  /* ---------- がめんの きりかえ ---------- */
  const VIEWS = ["vHome", "vSort", "vMap", "vResult", "vQuiz", "vWrite"];
  let backTo = null;
  function show(v, back) {
    VIEWS.forEach((id) => ($(id).hidden = id !== v));
    document.body.classList.toggle("mapmode", v === "vMap");
    $("backBtn").hidden = v === "vHome";
    backTo = back || "home";
    window.scrollTo(0, 0);
  }
  $("backBtn").addEventListener("click", () => {
    stopGame();
    if (backTo === "write") openWrite(); else goHome();
  });
  function setSound(v) { save.sound = v; A.setOn(v); $("soundBtn").textContent = v ? "🔊" : "🔇"; persist(); }
  $("soundBtn").addEventListener("click", () => { setSound(!save.sound); if (save.sound) A.ok(); });
  setSound(save.sound !== false);

  function goHome() {
    $("dayLabel").textContent = save.day + "にちめ" + (save.cleared ? "（" + save.cleared + "にち くばったよ）" : "");
    $("writeLabel").textContent = save.letters.length ? "かいた てがみ " + save.letters.length + "つう" : "かいて、じぶんで とどける";
    show("vHome");
  }
  document.querySelectorAll(".mode").forEach((b) => b.addEventListener("click", () => {
    A.pick();
    const go = b.dataset.go;
    if (go === "day") startDay(save.day);
    else if (go === "quiz") openQuiz(save.quizTown || 0);
    else openWrite();
  }));

  /* ---------- しわけ ---------- */
  let G = null; // いまの はいたつ
  function startDay(day) {
    stopGame();
    const st = T.stage(day);
    const town = T.make(st.town);
    G = { mode: "day", day, town, letters: st.letters.map((l) => Object.assign({ done: false, pocket: 0 }, l)) };
    $("sortDay").textContent = day + "にちめ・" + town.name;
    renderSort();
    show("vSort");
    if (G.letters.some((l) => l.express)) setTimeout(() => A.hurry(), 200);
  }
  let sortSel = null;
  function renderSort() {
    const bag = $("sortBag"), pk = $("pockets");
    bag.innerHTML = ""; pk.innerHTML = "";
    const town = G.town;
    for (let ch = 1; ch <= 4; ch++) {
      const p = el("div", { class: "pocket", "data-ch": ch, style: `--pc:${ink(ch)};--pt:${tint(ch)}` }, pk);
      el("div", { class: "pn", html: "<b>" + ch + "</b>ちょうめ" }, p);
      const pin = el("div", { class: "pin" }, p);
      G.letters.filter((l) => l.pocket === ch).forEach((l) => el("span", { class: "mini", text: KIND[l.kind].e }, pin));
      p.addEventListener("click", () => { if (sortSel) dropToPocket(sortSel, p); });
    }
    G.letters.filter((l) => !l.pocket).forEach((l) => {
      const n = letterNode(l, town, true);
      if (sortSel === l) n.classList.add("sel");
      bag.appendChild(n);
      dragify(n, ".pocket", (tg) => { if (tg) dropToPocket(l, tg, n); }, () => { sortSel = sortSel === l ? null : l; A.pick(); renderSort(); });
    });
    $("goBtn").disabled = G.letters.some((l) => !l.pocket);
  }
  function dropToPocket(l, pocket, node) {
    const ch = +pocket.dataset.ch, h = G.town.houses[l.house];
    if (h.chome === ch) { l.pocket = ch; sortSel = null; A.pocket(); renderSort(); if (!G.letters.some((x) => !x.pocket)) toast("しわけ できた！ しゅっぱつ しよう"); }
    else {
      A.ng(); toast("あてなの ちょうめを よく みてね（" + h.chome + "ちょうめ だよ）");
      shake(pocket); if (node) shake(node);
    }
  }
  $("goBtn").addEventListener("click", () => startDelivery());

  /* ---------- はいたつ ---------- */
  const mapView = new MapView($("map"), {
    onTraceStart(cell) { return G && G.active && Math.abs(cell.x - G.tail().x) + Math.abs(cell.y - G.tail().y) <= 1; },
    onTrace(cell) { traceTo(cell); },
    onTap(cell, house) { tapMap(cell, house); },
  });
  // よこ むきの タブレットでは いえの カードを みぎの れつに だす（ちずを かくさない）
  const wideMQ = window.matchMedia("(min-width: 760px) and (orientation: landscape)");
  function placePanel() {
    const panel = $("panel");
    if (wideMQ.matches) document.querySelector(".side").insertBefore(panel, $("tray"));
    else $("mapWrap").appendChild(panel);
  }
  if (wideMQ.addEventListener) wideMQ.addEventListener("change", placePanel); else if (wideMQ.addListener) wideMQ.addListener(placePanel);
  placePanel();
  let stepTimer = 0, clockTimer = 0;
  function stopGame() {
    clearTimeout(stepTimer); clearInterval(clockTimer); clearTimeout(replayTimer);
    if (G) G.active = false;
  }
  function startDelivery() {
    const t = G.town;
    G.bike = { x: t.office.door.x, y: t.office.door.y };
    Object.assign(G, { queue: [], steps: 0, trail: [{ x: G.bike.x, y: G.bike.y }], t0: Date.now(), chimed: {}, hints: 0, misses: 0, bonus: 0, regularDone: 0, active: true, sel: null, moving: false, finished: false });
    G.tail = () => (G.queue.length ? G.queue[G.queue.length - 1] : G.bike);
    G.letters.sort((a, b) => (a.pocket - b.pocket) || (a.id - b.id));
    show("vMap", G.mode === "write" ? "write" : "home");
    mapView.load(t);
    mapView.clearTop();
    G.bikeEl = mapView.bike();
    placeBike(G.bikeEl, G.bike.x, G.bike.y);
    G.trailEl = mapView.polyline(G.trail, "#1c7ed6", 1.2);
    renderTray(); updateStatus(); updatePanel();
    clockTimer = setInterval(updateStatus, 250);
    msg(G.mode === "write" ? "ちずの いえを さがして とどけよう！" : "ゆうびんきょく から しゅっぱつ！", 2500);
    A.bike();
  }
  let msgTimer = 0;
  function msg(text, ms) {
    const m = $("msg"); m.textContent = text; m.hidden = !text;
    clearTimeout(msgTimer); if (ms) msgTimer = setTimeout(() => (m.hidden = true), ms);
  }
  function remaining() { return G.letters.filter((l) => !l.done); }
  function updateStatus() {
    if (!G || !G.t0) return;
    if (G.active) G.sec = Math.floor((Date.now() - G.t0) / 1000);
    $("stTime").textContent = G.sec || 0;
    $("stDist").textContent = G.steps;
    $("stLeft").textContent = remaining().length;
  }
  function renderTray() {
    const tray = $("tray"); tray.innerHTML = "";
    for (const l of remaining()) {
      const n = letterNode(l, G.town, false);
      if (G.sel === l) n.classList.add("sel");
      tray.appendChild(n);
      dragify(n, ".post", (tg) => { if (tg) deliver(l, G.town.houses[+tg.dataset.h], n); },
        () => { G.sel = G.sel === l ? null : l; A.pick(); renderTray(); });
    }
  }
  function enqueue(cells) {
    if (!cells.length) return;
    const wasIdle = !G.moving;
    G.queue.push(...cells);
    $("panel").hidden = true;
    if (wasIdle) { G.moving = true; if (cells.length > 1) A.bike(); step(); }
  }
  function step() {
    if (!G || !G.active) return;
    const c = G.queue.shift();
    if (!c) { G.moving = false; arrive(); return; }
    const dir = c.x - G.bike.x;
    G.bike = { x: c.x, y: c.y }; G.steps++;
    G.trail.push({ x: c.x, y: c.y });
    placeBike(G.bikeEl, c.x, c.y, dir);
    G.trailEl.setAttribute("points", G.trail.map((p) => (p.x * C + C / 2) + "," + (p.y * C + C / 2)).join(" "));
    if (mapView.z > 1.05) mapView.center(c.x, c.y);
    if (G.steps % 3 === 0) A.step();
    updateStatus();
    stepTimer = setTimeout(step, STEP_MS);
  }
  function traceTo(cell) {
    if (!G || !G.active) return;
    const last = G.tail();
    if (cell.x === last.x && cell.y === last.y) return;
    const dx = Math.sign(cell.x - last.x), dy = Math.sign(cell.y - last.y);
    if (dx && dy) return; // ななめは だめ
    const out = [];
    let x = last.x, y = last.y;
    while (x !== cell.x || y !== cell.y) {
      x += dx; y += dy;
      if (!T.isRoad(G.town, x, y)) break;
      out.push({ x, y });
    }
    enqueue(out);
  }
  function tapMap(cell, house) {
    if (!G || !G.active) return;
    const t = G.town;
    let goal = null;
    if (house) { goal = house.door; mapView.ring(house, "pulse").addEventListener("animationiteration", function f() { this.remove(); }, { once: true }); }
    else if (cell.x === t.office.x && cell.y === t.office.y) goal = t.office.door;
    else if (T.isRoad(t, cell.x, cell.y)) goal = cell;
    if (!goal) return;
    // いま はしって いる ときは、つぎの マスから さがしなおす
    const moving = G.queue.length > 0;
    const p = R.path(t, moving ? G.queue[0] : G.bike, goal);
    if (!p) return;
    if (moving) G.queue = [G.queue[0]].concat(p.slice(1));
    else if (p.length > 1) enqueue(p.slice(1));
    else arrive();
  }
  function housesHere() {
    return G.town.houses.filter((h) => h.door.x === G.bike.x && h.door.y === G.bike.y);
  }
  function arrive() {
    updatePanel();
    const t = G.town;
    const atOffice = G.bike.x === t.office.door.x && G.bike.y === t.office.door.y;
    if (G.mode === "day" && atOffice && !remaining().length && G.steps > 0) finishDay();
  }
  function updatePanel() {
    const panel = $("panel"); panel.innerHTML = "";
    const hs = housesHere();
    const t = G.town;
    for (const h of hs) {
      const card = el("div", { class: "house-card", style: "--hc:" + ink(h.chome) }, panel);
      const plate = el("div", { class: "hc-plate" }, card);
      el("span", { class: "nm", text: h.name }, plate);
      el("span", { class: "ad2", text: T.addrText(t, h, true) }, plate);
      const chimed = !!G.chimed[h.id];
      const post = el("button", { class: "post" + (chimed ? " hand" : ""), type: "button", "data-h": h.id, text: chimed ? "🙋 てわたし" : "📮 ポスト" }, card);
      const ch = el("button", { class: "chime", type: "button", "data-chime": h.id, text: "🔔" }, card);
      post.addEventListener("click", () => { if (G.sel) deliver(G.sel, h, null); else { toast("てがみを えらんで から ポストを タップ、または ドラッグ してね"); } });
      ch.addEventListener("click", () => {
        A.chime(); G.chimed[h.id] = true;
        setTimeout(() => { A.hai(); toast(h.name + "さん「はーい！」"); updatePanel(); }, 700);
      });
    }
    if (G.bike.x === t.office.door.x && G.bike.y === t.office.door.y && G.steps > 0 && G.mode === "day" && remaining().length) {
      el("div", { class: "office-card", text: "〒 ゆうびんきょく — まだ てがみが " + remaining().length + "つう あるよ" }, panel);
    }
    panel.hidden = !panel.children.length;
  }
  function deliver(l, h, node) {
    if (!G.active || l.done) return;
    const t = G.town, target = t.houses[l.house];
    if (!housesHere().includes(h)) { toast("その いえの まえまで いこう"); return; }
    if (target.id !== h.id) {
      G.misses++; A.ng();
      toast(T.missHint(target, h), 2800);
      if (node) shake(node);
      return;
    }
    if (l.kind === "kozutsumi" && !G.chimed[h.id]) {
      A.ng(); toast("おおきくて ポストに はいらない！ 🔔チャイムを おして てわたし しよう", 3000);
      const b = document.querySelector('.chime[data-chime="' + h.id + '"]');
      if (b) { b.classList.remove("flash"); void b.offsetWidth; b.classList.add("flash"); }
      return;
    }
    l.done = true; G.sel = null;
    if (l.kind === "kozutsumi") { A.hai(); toast("「ありがとう！」 てわたし できた"); } else A.post();
    if (l.express) {
      if (G.regularDone === 0) { G.bonus++; setTimeout(() => A.bonus(), 250); toast("⚡ そくたつ ボーナス！ はやく とどいた！"); }
    } else G.regularDone++;
    renderTray(); updateStatus(); updatePanel();
    if (!remaining().length) {
      if (G.mode === "write") { setTimeout(finishWrite, 600); return; }
      msg("ぜんぶ くばった！ 〒 ゆうびんきょく に もどろう");
      const o = t.office;
      mapView.ring({ x: o.x, y: o.y }, "pulse", "#e03131");
    }
  }
  $("hintBtn").addEventListener("click", () => {
    if (!G || !G.active) return;
    const l = G.sel || remaining()[0];
    if (!l) { const o = G.town.office; mapView.ring({ x: o.x, y: o.y }, "pulse", "#e03131"); return; }
    const h = G.town.houses[l.house];
    G.hints++; A.pick();
    const r = mapView.ring(h, "pulse");
    setTimeout(() => r.remove(), 3000);
    if (mapView.z > 1.05) mapView.center(h.x, h.y);
    msg(T.addrText(G.town, h, true) + " は ここ！", 2500);
  });
  $("zoomIn").addEventListener("click", () => { mapView.zoomBy(1.4); if (G) mapView.center(G.bike.x, G.bike.y); });
  $("zoomOut").addEventListener("click", () => mapView.zoomBy(1 / 1.4));

  /* ---------- おわり ---------- */
  const resView = new MapView($("resMap"), {});
  let replayTimer = 0;
  function finishDay() {
    stopGame();
    G.finished = true;
    A.fanfare();
    const t = G.town, o = t.office.door;
    const stops = G.letters.map((l) => t.houses[l.house].door);
    const best = R.bestOrder(t, o, stops, o);
    G.best = best;
    const sec = G.sec || 0;
    const ratio = G.steps / best.length;
    const stars = ratio <= 1 ? 3 : ratio <= 1.25 ? 2 : 1;
    $("resStars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    $("resTitle").textContent = G.day + "にちめ の はいたつ おわり！";
    $("resTime").textContent = sec; $("resDist").textContent = G.steps; $("resBest").textContent = best.length;
    let m = G.steps <= best.length ? "さいたん ルート！ めいじん ゆうびんやさん！" :
      ratio <= 1.25 ? "あと " + (G.steps - best.length) + "マス で さいたん！ おしい！" : "したの じゅんばんで まわると もっと はやいよ。つぎに いかそう！";
    if (G.bonus) m += "　⚡そくたつ ボーナス ×" + G.bonus;
    $("resMsg").textContent = m;
    const ol = $("resOrder"); ol.innerHTML = "";
    best.order.forEach((i) => {
      const L = G.letters[i], h = t.houses[L.house];
      el("li", { text: KIND[L.kind].e + " " + T.addrText(t, h, true) + "（" + h.name + "）" }, ol);
    });
    el("li", { text: "〒 ゆうびんきょく に もどる" }, ol);
    // ほぞん
    const rec = save.best[G.day];
    if (!rec || sec < rec.time) save.best[G.day] = { time: sec, dist: G.steps };
    if (G.day >= save.day) save.day = G.day + 1;
    save.cleared = Math.max(save.cleared || 0, G.day);
    persist();
    show("vResult");
    resView.load(t);
    replayRoutes();
  }
  function replayRoutes() {
    if (!G || !G.best) return;
    clearTimeout(replayTimer);
    const t = G.town, o = t.office.door;
    resView.over.innerHTML = ""; resView.clearTop();
    resView.polyline(G.trail, "#1c7ed6", 2.2);
    const stops = G.best.order.map((i) => t.houses[G.letters[i].house].door);
    const full = R.fullPath(t, o, stops, o);
    const line = resView.polyline(full, "#e03131", 1.4);
    line.setAttribute("stroke-dasharray", "2 1.2");
    G.letters.forEach((l) => resView.ring(t.houses[l.house], "", "#fab005"));
    const gb = resView.bike("ghostbike");
    let i = 0;
    const tick = () => {
      if (i >= full.length || $("vResult").hidden) return;
      const c = full[i], p = full[i - 1];
      placeBike(gb, c.x, c.y, p ? c.x - p.x : 0);
      i++; replayTimer = setTimeout(tick, Math.max(40, STEP_MS * 0.7));
    };
    tick();
  }
  $("replayBtn").addEventListener("click", replayRoutes);
  $("nextBtn").addEventListener("click", () => startDay(save.day));
  $("againBtn").addEventListener("click", () => startDay(G.day));

  /* ---------- じゅうしょ クイズ ---------- */
  const qView = new MapView($("qMap"), { onTap: (cell, h) => quizTap(h) });
  let Q = null;
  function townChips(box, cur, onPick) {
    box.innerHTML = "";
    T.TOWNS.forEach((d, i) => {
      const b = el("button", { class: "chip" + (i === cur ? " on" : ""), type: "button", text: d.emoji + " " + d.name }, box);
      b.addEventListener("click", () => { A.pick(); onPick(i); });
    });
  }
  function openQuiz(ti) {
    stopGame();
    save.quizTown = ti; persist();
    townChips($("qTowns"), ti, openQuiz);
    const town = T.make(ti);
    Q = { town, n: 0, score: 0, total: 10, lock: false };
    show("vQuiz");
    qView.load(town);
    nextQuiz();
  }
  function nextQuiz() {
    qView.clearTop();
    $("qChoices").innerHTML = "";
    if (Q.n >= Q.total) {
      const best = save.quiz[Q.town.id] || 0;
      if (Q.score > best) { save.quiz[Q.town.id] = Q.score; persist(); }
      $("qText").textContent = "おわり！ " + Q.total + "もん ちゅう " + Q.score + "もん せいかい" + (Q.score > best ? "（ベスト こうしん！）" : "");
      A.fanfare();
      const b = el("button", { class: "choice", type: "button", text: "もういちど" }, $("qChoices"));
      b.addEventListener("click", () => openQuiz(Q.town.idx));
      return;
    }
    Q.n++;
    $("qNum").textContent = Q.n; $("qScore").textContent = Q.score;
    const hs = Q.town.houses;
    Q.ans = hs[Math.floor(Math.random() * hs.length)];
    Q.type = Q.n % 2 ? "where" : "which";
    Q.lock = false;
    if (Q.type === "which") {
      $("qText").textContent = "ひかって いる いえの じゅうしょは？";
      qView.ring(Q.ans, "pulse", "#e03131");
      const opts = [Q.ans];
      for (let k = 0; opts.length < 3 && k < 100; k++) {
        const c = hs[Math.floor(Math.random() * hs.length)];
        if (opts.includes(c)) continue;
        // にて いる じゅうしょ（おなじ ちょうめ か、おなじ ばん・ごう）
        if (c.chome === Q.ans.chome || (c.ban === Q.ans.ban && c.go === Q.ans.go) || k > 60) opts.push(c);
      }
      T.shuffle(opts, Math.random).forEach((h) => {
        const b = el("button", { class: "choice", type: "button", text: T.addrText(Q.town, h, true) }, $("qChoices"));
        b.addEventListener("click", () => {
          if (Q.lock) return;
          Q.lock = true;
          if (h === Q.ans) { b.classList.add("right"); quizRight(); }
          else { b.classList.add("wrong"); quizWrong(); [...$("qChoices").children].forEach((x) => { if (x.textContent === T.addrText(Q.town, Q.ans, true)) x.classList.add("right"); }); }
        });
      });
    } else {
      $("qText").textContent = "「" + T.addrText(Q.town, Q.ans, true) + "」は どこ？ タップしてね";
    }
  }
  function quizTap(h) {
    if (!Q || Q.type !== "where" || Q.lock || !h) return;
    Q.lock = true;
    if (h === Q.ans) { qView.ring(h, "", "#2f9e44"); quizRight(); }
    else {
      qView.ring(h, "", "#868e96"); qView.ring(Q.ans, "pulse", "#2f9e44");
      $("qText").textContent = "それは " + T.addrText(Q.town, h, true) + "。こたえは ひかって いる いえ";
      quizWrong();
    }
  }
  function quizRight() { Q.score++; $("qScore").textContent = Q.score; A.ok(); toast("せいかい！"); setTimeout(nextQuiz, 1100); }
  function quizWrong() { A.ng(); setTimeout(nextQuiz, 2200); }

  /* ---------- てがみを かこう ---------- */
  const WHO = [["👴", "おじいちゃん"], ["👵", "おばあちゃん"], ["👨", "おとうさん"], ["👩", "おかあさん"], ["👦", "おにいちゃん"], ["👧", "おねえちゃん"],
    ["🧒", "おとうと"], ["👶", "いもうと"], ["🧑", "ともだち"], ["🧑‍🏫", "せんせい"]];
  const W = { who: null, town: 0, house: null };
  const wView = new MapView($("wMap"), { onTap: (cell, h) => { if (h) pickHouse(h); } });
  function wStep(n) { [1, 2, 3].forEach((i) => ($("wStep" + i).hidden = i !== n)); window.scrollTo(0, 0); }
  function openWrite() {
    stopGame();
    show("vWrite");
    wStep(1);
    const box = $("wWho"); box.innerHTML = "";
    WHO.forEach(([e, n]) => {
      const b = el("button", { type: "button" }, box);
      el("span", { class: "e", text: e }, b); b.appendChild(document.createTextNode(n));
      b.addEventListener("click", () => { A.pick(); W.who = n; openPick(W.town); });
    });
    const list = $("wList"); list.innerHTML = "";
    save.letters.slice().reverse().forEach((L) => {
      const b = el("button", { class: "wcard", type: "button" }, list);
      b.textContent = "✉️ " + L.who + "へ「" + (L.body || "").slice(0, 12) + ((L.body || "").length > 12 ? "…" : "") + "」";
      b.addEventListener("click", () => openLetter(L));
    });
  }
  function openLetter(L) {
    const mb = $("modalBody"); mb.innerHTML = "";
    el("div", { class: "mz", text: "〒 " + L.zip }, mb);
    el("div", { text: L.addr }, mb);
    el("div", { text: L.name + " さま（" + L.who + "）" }, mb);
    el("div", { class: "mb", text: L.body || "（なにも かいて いない てがみ）" }, mb);
    $("modal").hidden = false;
  }
  $("modalClose").addEventListener("click", () => ($("modal").hidden = true));
  function openPick(ti) {
    W.town = ti; W.house = null;
    wStep(2);
    $("wWhoName").textContent = W.who;
    townChips($("wTowns"), ti, openPick);
    wView.load(T.make(ti));
    $("wPicked").textContent = "まだ えらんで いないよ";
    $("wPickBtn").disabled = true;
  }
  function pickHouse(h) {
    W.house = h; A.pick();
    wView.clearTop(); wView.ring(h, "pulse", "#2f9e44");
    const t = T.make(W.town);
    $("wPicked").textContent = T.addrText(t, h) + "（" + h.name + "）";
    $("wPickBtn").disabled = false;
  }
  $("wPickBtn").addEventListener("click", () => {
    if (!W.house) return;
    const t = T.make(W.town), h = W.house;
    wStep(3);
    $("wAddr").textContent = T.addrText(t, h);
    $("wTo").textContent = h.name + " さま（" + W.who + "）";
    $("zip1").value = ""; $("zip2").value = ""; $("wErr").hidden = true;
    const tb = $("zipTable"); tb.innerHTML = "";
    const hr = el("tr", {}, tb); el("th", { text: t.name }, hr); el("th", { text: "ゆうびんばんごう" }, hr);
    for (let ch = 1; ch <= 4; ch++) {
      const r = el("tr", {}, tb);
      el("td", { html: '<span class="chome-dot" style="background:' + ink(ch) + '"></span>' + ch + "ちょうめ" }, r);
      el("td", { text: "〒 " + T.postal(t, ch) }, r);
    }
  });
  ["zip1", "zip2"].forEach((id) => $(id).addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9０-９]/g, "").replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFEE0));
    if (id === "zip1" && e.target.value.length >= 3) $("zip2").focus();
  }));
  $("wSendBtn").addEventListener("click", () => {
    const t = T.make(W.town), h = W.house;
    const want = T.postal(t, h.chome).split("-");
    const err = $("wErr");
    if ($("zip1").value !== want[0]) { err.textContent = "まえの 3けた（まちの ばんごう）が ちがうよ。ひょうを みてね"; err.hidden = false; A.ng(); return; }
    if ($("zip2").value !== want[1]) { err.textContent = "うしろの 4けた（ちょうめの ばんごう）が ちがうよ。" + h.chome + "ちょうめ を みてね"; err.hidden = false; A.ng(); return; }
    err.hidden = true;
    A.post();
    W.body = $("wBody").value.slice(0, 60);
    G = { mode: "write", day: 0, town: t, letters: [{ id: 0, house: h.id, kind: "futo", express: false, done: false, pocket: h.chome, who: W.who }] };
    setTimeout(startDelivery, 300);
  });
  function finishWrite() {
    stopGame();
    const t = G.town, h = t.houses[G.letters[0].house];
    const L = { who: W.who, name: h.name, addr: T.addrText(t, h), zip: T.postal(t, h.chome), body: W.body || "" };
    save.letters.push(L);
    while (save.letters.length > 20) save.letters.shift();
    persist();
    A.fanfare();
    $("wBody").value = "";
    openWrite();
    toast(W.who + "に とどいたよ！ " + G.steps + "マス はしった", 3000);
  }

  /* ---------- テストよう ---------- */
  window.YHTest = {
    fast(v) { STEP_MS = v ? 4 : 120; },
    state() {
      if (!G) return null;
      return { mode: G.mode, day: G.day, town: G.town.idx, active: !!G.active, moving: !!G.moving, steps: G.steps, bike: G.bike,
        letters: G.letters.map((l) => ({ id: l.id, kind: l.kind, express: l.express, done: l.done, pocket: l.pocket, house: l.house, chome: G.town.houses[l.house].chome, door: G.town.houses[l.house].door })),
        office: G.town.office };
    },
    cellToScreen(x, y) { return mapView.cellToScreen(x, y); },
    qCellToScreen(x, y) { return qView.cellToScreen(x, y); },
    wCellToScreen(x, y) { return wView.cellToScreen(x, y); },
    quiz() { return Q && { type: Q.type, ans: Q.ans && { x: Q.ans.x, y: Q.ans.y, text: T.addrText(Q.town, Q.ans, true) } }; },
    zoom() { return mapView.z; },
    startDay(d) { startDay(d); },
    save() { return JSON.parse(JSON.stringify(save)); },
  };

  goHome();
})();
