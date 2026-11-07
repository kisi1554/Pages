/* うちゅう ステーション の いちにち — がめん と あそび */
(function () {
  "use strict";
  const F = window.Float, D = window.UData, S = window.Snd;
  const W = D.ROOM_W, H = D.ROOM_H, NR = D.ROOMS.length, WORLD = W * NR;
  const KEY = "uchu-ichinichi-v1";
  const NS = "http://www.w3.org/2000/svg";
  const $ = (id) => document.getElementById(id);

  /* ---------- ほぞん ---------- */
  let st = { done: {}, cards: {}, sound: true, visited: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const o = JSON.parse(raw); if (o && typeof o === "object") st = Object.assign(st, o); }
  } catch (e) { /* ほぞん できなくても あそべる */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* */ } }

  /* ---------- SVG の こまかい てつだい ---------- */
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, size, attrs) {
    const t = el("text", Object.assign({ x, y, "font-size": size || 20, "text-anchor": "middle", "dominant-baseline": "central" }, attrs || {}), parent);
    t.textContent = s;
    return t;
  }

  /* ---------- ひこうし の え ---------- */
  function astronaut(parent, opt) {
    opt = opt || {};
    const g = el("g", { class: "astro" }, parent);
    const armL = el("path", { d: "M-12 -2 Q-26 -16 -30 -30", stroke: "#4263eb", "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, g);
    const armR = el("path", { d: "M12 -2 Q26 -16 30 -30", stroke: "#4263eb", "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, g);
    el("path", { d: "M-6 18 Q-10 30 -16 36 M6 18 Q10 30 16 36", stroke: "#364fc7", "stroke-width": 8, fill: "none", "stroke-linecap": "round" }, g);
    el("rect", { x: -14, y: -8, width: 28, height: 30, rx: 10, fill: "#4c6ef5" }, g);
    el("rect", { x: -6, y: -4, width: 12, height: 6, rx: 2, fill: "#ffd43b" }, g); // ワッペン（オリジナル）
    el("circle", { cx: 0, cy: -22, r: 15, fill: "#ffd8a8" }, g);
    el("path", { d: "M-15 -24 Q-14 -40 0 -39 Q14 -40 15 -24 Q8 -32 -2 -31 Q-10 -31 -15 -24Z", fill: "#5c3d2e" }, g);
    const eyes = el("g", {}, g);
    el("circle", { cx: -5, cy: -22, r: 2.2, fill: "#222" }, eyes);
    el("circle", { cx: 5, cy: -22, r: 2.2, fill: "#222" }, eyes);
    const sleep = el("path", { d: "M-8 -22 q3 2 6 0 M2 -22 q3 2 6 0", stroke: "#222", "stroke-width": 1.6, fill: "none", display: "none" }, g);
    el("path", { d: "M-4 -15 Q0 -12 4 -15", stroke: "#c92a2a", "stroke-width": 1.6, fill: "none", "stroke-linecap": "round" }, g);
    if (opt.scale) g.setAttribute("transform", `scale(${opt.scale})`);
    return {
      g,
      pose(t, x, y, rot, s) {
        const k = Math.sin(t * 2.2) * 6;
        armL.setAttribute("d", `M-12 -2 Q-26 ${-14 + k} -30 ${-28 + k}`);
        armR.setAttribute("d", `M12 -2 Q26 ${-14 - k} 30 ${-28 - k}`);
        g.setAttribute("transform", `translate(${x} ${y}) rotate(${rot || 0}) scale(${s || 1})`);
      },
      sleep(on) { eyes.setAttribute("display", on ? "none" : ""); sleep.setAttribute("display", on ? "" : "none"); },
    };
  }

  /* ---------- ステーション ---------- */
  const svg = $("stage");
  const HATCH_Y0 = 70, HATCH_Y1 = 230;
  const RAILS = [];
  const HOTSPOTS = [];
  function buildStation() {
    const defs = el("defs", {}, svg);
    const grad = el("linearGradient", { id: "earthG", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: "0", "stop-color": "#74c0fc" }, grad);
    el("stop", { offset: "1", "stop-color": "#1864ab" }, grad);
    // うちゅう の ほし（そと）
    el("rect", { x: -400, y: -100, width: WORLD + 800, height: H + 200, fill: "#0b1230" }, svg);
    D.ROOMS.forEach((rm, i) => {
      const x0 = i * W;
      const g = el("g", { class: "room" }, svg);
      el("rect", { x: x0, y: 0, width: W, height: H, fill: rm.wall }, g);
      // かべ の パネル
      for (let k = 0; k < 4; k++) el("rect", { x: x0 + 10 + k * 97, y: 8, width: 88, height: 22, rx: 4, fill: "#fff", opacity: 0.55 }, g);
      for (let k = 0; k < 4; k++) el("rect", { x: x0 + 10 + k * 97, y: H - 30, width: 88, height: 22, rx: 4, fill: "#fff", opacity: 0.55 }, g);
      decorate(g, i, x0);
      // てすり
      [80, 200, 320].forEach((rx) => {
        [52, 248].forEach((ry) => {
          const r = el("rect", { x: x0 + rx - 26, y: ry - 5, width: 52, height: 10, rx: 5, fill: "#fab005", stroke: "#e67700", "stroke-width": 2, class: "rail" }, g);
          r.dataset.rail = RAILS.length;
          RAILS.push({ x: x0 + rx, y: ry });
        });
      });
      // へや の なまえ

    });
    // へや の あいだ の かべ と ハッチ
    for (let i = 0; i <= NR; i++) {
      const x = i * W;
      el("rect", { x: x - 8, y: 0, width: 16, height: i === 0 || i === NR ? H : HATCH_Y0, fill: "#adb5bd" }, svg);
      if (i > 0 && i < NR) {
        el("rect", { x: x - 8, y: HATCH_Y1, width: 16, height: H - HATCH_Y1, fill: "#adb5bd" }, svg);
        el("rect", { x: x - 10, y: HATCH_Y0 - 6, width: 20, height: 6, rx: 3, fill: "#868e96" }, svg);
        el("rect", { x: x - 10, y: HATCH_Y1, width: 20, height: 6, rx: 3, fill: "#868e96" }, svg);
      }
    }
  }

  function hotspot(g, x, y, emoji, card, label) {
    const h = el("g", { class: "hot", transform: `translate(${x} ${y})` }, g);
    el("circle", { r: 26, fill: "#fff", opacity: 0.9, stroke: "#4c6ef5", "stroke-width": 2 }, h);
    txt(h, 0, 1, emoji, 26);
    const q = txt(h, 20, -20, "？", 14, { fill: "#e8590c", "font-weight": 700 });
    h.dataset.card = card;
    HOTSPOTS.push({ x, y, card, q, label });
    return h;
  }

  function decorate(g, i, x0) {
    if (i === 0) {
      // ねぶくろ（かべ に ゆわえて ある）
      el("rect", { x: x0 + 40, y: 70, width: 70, height: 150, rx: 30, fill: "#748ffc" }, g);
      el("line", { x1: x0 + 75, y1: 90, x2: x0 + 75, y2: 210, stroke: "#dbe4ff", "stroke-width": 3, "stroke-dasharray": "4 3" }, g);
      el("rect", { x: x0 + 36, y: 100, width: 78, height: 6, fill: "#495057" }, g);
      el("rect", { x: x0 + 36, y: 180, width: 78, height: 6, fill: "#495057" }, g);
      txt(g, x0 + 75, 236, "ねぶくろ", 11, { fill: "#364fc7" });
      el("rect", { x: x0 + 150, y: 80, width: 70, height: 46, rx: 6, fill: "#fff", stroke: "#adb5bd" }, g);
      txt(g, x0 + 185, 103, "💻", 24);
      hotspot(g, x0 + 300, 120, "🚽", "toire", "トイレ");
    } else if (i === 1) {
      el("rect", { x: x0 + 120, y: 170, width: 160, height: 22, rx: 6, fill: "#adb5bd" }, g);
      ["#ff8787", "#69db7c", "#ffd43b", "#74c0fc", "#da77f2"].forEach((c, k) => {
        el("rect", { x: x0 + 60 + k * 50, y: 70, width: 34, height: 44, rx: 6, fill: c }, g);
        el("rect", { x: x0 + 70 + k * 50, y: 66, width: 14, height: 6, fill: "#495057" }, g); // マジックテープ
      });
      txt(g, x0 + 150, 155, "♨️", 22);
      txt(g, x0 + 250, 155, "🥫", 22);
      hotspot(g, x0 + 340, 200, "♻️", "mizu", "みず の リサイクル");
    } else if (i === 2) {
      for (let k = 0; k < 3; k++) {
        el("rect", { x: x0 + 40 + k * 120, y: 70, width: 90, height: 70, rx: 6, fill: "#fff", stroke: "#adb5bd" }, g);
        el("circle", { cx: x0 + 60 + k * 120, cy: 90, r: 4, fill: ["#40c057", "#fa5252", "#fab005"][k] }, g);
      }
      txt(g, x0 + 85, 115, "💧", 22); txt(g, x0 + 205, 115, "🔥", 22); txt(g, x0 + 325, 115, "🌱", 22);
      el("rect", { x: x0 + 120, y: 170, width: 160, height: 50, rx: 8, fill: "#c3fae8", stroke: "#63e6be" }, g);
      txt(g, x0 + 200, 195, "グローブ ボックス", 11, { fill: "#087f5b" });
    } else if (i === 3) {
      el("rect", { x: x0 + 100, y: 220, width: 140, height: 14, rx: 7, fill: "#495057" }, g);
      el("line", { x1: x0 + 130, y1: 220, x2: x0 + 150, y2: 150, stroke: "#f03e3e", "stroke-width": 3 }, g);
      el("line", { x1: x0 + 210, y1: 220, x2: x0 + 190, y2: 150, stroke: "#f03e3e", "stroke-width": 3 }, g);
      txt(g, x0 + 170, 244, "ランニングマシン", 11, { fill: "#c92a2a" });
      txt(g, x0 + 320, 190, "🚲", 40);
    } else if (i === 4) {
      el("circle", { cx: x0 + 200, cy: 175, r: 80, fill: "#495057" }, g);
      el("circle", { cx: x0 + 200, cy: 175, r: 70, fill: "#0b1230" }, g);
      el("circle", { cx: x0 + 200, cy: 300, r: 110, fill: "url(#earthG)" }, g);
      el("path", { d: `M${x0 + 150} 205 q20 -10 40 0 q15 8 30 -2`, stroke: "#8ce99a", "stroke-width": 9, fill: "none", "stroke-linecap": "round" }, g);
      el("circle", { cx: x0 + 200, cy: 175, r: 70, fill: "none", stroke: "#adb5bd", "stroke-width": 4 }, g);
      txt(g, x0 + 200, 130, "✨", 14);
    }
  }

  /* ---------- うごき ---------- */
  const A = F.body({ x: 200, y: 150, r: 24 });
  const look = astronaut(svg);
  let camX = 0, lastT = 0, simT = 0, lastRoom = -1;

  function room() { return Math.max(0, Math.min(NR - 1, Math.floor(A.x / W))); }

  function stepAstro(dt) {
    const px = A.x;
    F.step(A, dt, F.SPACE, { x0: 8, y0: 0, x1: WORLD - 8, y1: H });
    // ハッチ（へや の さかい）: あな の そと なら はねかえる
    for (let i = 1; i < NR; i++) {
      const bx = i * W;
      const near = Math.abs(A.x - bx) < A.r + 8;
      const inHole = A.y - A.r > HATCH_Y0 - 4 && A.y + A.r < HATCH_Y1 + 4;
      if (near && !inHole) {
        if (px <= bx) { A.x = bx - A.r - 8; A.vx = -Math.abs(A.vx) * 0.6; }
        else { A.x = bx + A.r + 8; A.vx = Math.abs(A.vx) * 0.6; }
        if (Math.abs(A.vx) > 15) S.bonk();
      }
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, lastT ? (now - lastT) / 1000 : 0.016);
    lastT = now; simT += dt;
    stepAstro(dt);
    look.pose(simT, A.x, A.y, Math.max(-25, Math.min(25, A.vx * 0.12)), 1);
    // がめん の かたち に あわせて みえる はば を かえる（たて スマホ でも うえした いっぱい に）
    const rc = svg.getBoundingClientRect();
    const vw = rc.height > 0 ? Math.max(320, Math.min(W * 1.6, (H * rc.width) / rc.height)) : W;
    const target = Math.max(0, Math.min(WORLD - vw, A.x - vw / 2));
    camX += (target - camX) * Math.min(1, dt * 4);
    svg.setAttribute("viewBox", `${camX.toFixed(1)} 0 ${vw.toFixed(1)} ${H}`);
    const r = room();
    if (r !== lastRoom) { lastRoom = r; onRoom(r); }
    requestAnimationFrame(frame);
  }

  function onRoom(r) {
    st.visited[r] = true; save();
    $("roomSign").textContent = D.ROOMS[r].emoji + " " + D.ROOMS[r].name;
    updateUI();
  }

  /* ---------- スワイプ で ける・タップ で つかむ ---------- */
  let down = null;
  function nearestRail() {
    let best = null, bd = 1e9;
    for (const r of RAILS) { const d = Math.hypot(r.x - A.x, r.y - A.y); if (d < bd) { bd = d; best = r; } }
    return { rail: best, d: bd };
  }
  function canKick() {
    if (F.speed(A) < 25) return true;
    const gap = 60;
    if (A.y - A.r < gap || H - A.y - A.r < gap || A.x - A.r < gap || WORLD - A.x - A.r < gap) return true;
    for (let i = 1; i < NR; i++) {
      if (Math.abs(A.x - i * W) - A.r < gap && !(A.y > HATCH_Y0 + A.r && A.y < HATCH_Y1 - A.r)) return true;
    }
    return nearestRail().d < 90;
  }
  let kickedOnce = false;
  function doKick(dx, dy) {
    if (!canKick()) { toast("ういてる あいだ は けれない よ！ かべ や てすり に とどく まで まとう"); return; }
    F.kick(A, dx, dy, 1.2);
    S.unlock(); S.kick();
    if (!kickedOnce) { kickedOnce = true; toast("けった！ ちから を くわえない と、ずっと すすみ つづける よ"); }
  }
  function doGrab() {
    S.unlock();
    const n = nearestRail();
    if (n.d > 110) { toast("てすり が とおい よ。きいろ の てすり の ちかく で つかもう"); return false; }
    F.grab(A);
    A.x += (n.rail.x - A.x) * 0.25; A.y += (n.rail.y - A.y) * 0.25;
    S.grab();
    toast("かちっ！ てすり に つかまって とまった");
    // いどう ミッション: 5つ の へや を まわって、つかまる
    if (!st.done.idou && D.ROOMS.every((_, i) => st.visited[i])) finishMission("idou", true);
    return true;
  }

  svg.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now(), target: e.target };
    try { svg.setPointerCapture(e.pointerId); } catch (er) { /* */ }
  });
  svg.addEventListener("pointerup", (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    const len = Math.hypot(dx, dy);
    const tgt = down.target;
    down = null;
    if (len > 18) { doKick(dx, dy); return; }
    // タップ
    const hot = tgt && tgt.closest && tgt.closest(".hot");
    if (hot) { S.unlock(); S.tap(); gainCards([hot.dataset.card], true); return; }
    if (tgt && tgt.classList && tgt.classList.contains("rail")) { doGrab(); return; }
    S.unlock();
  });
  svg.addEventListener("pointercancel", () => { down = null; });
  $("grabBtn").addEventListener("click", doGrab);

  /* キーボード でも（やじるし で ける・スペース で つかむ） */
  document.addEventListener("keydown", (e) => {
    if (!$("ovMission").hidden || openOv()) return;
    const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (m) { e.preventDefault(); doKick(m[0] * 120, m[1] * 120); }
    else if (e.key === " ") { e.preventDefault(); doGrab(); }
  });

  /* ---------- ひょうじ ---------- */
  let toastTimer = 0;
  function toast(s, ms) {
    const t = $("toast");
    t.textContent = s; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2600);
  }

  function roomMission(r) {
    if (r === 0) return st.done.asa ? "yoru" : "asa";
    const m = D.MISSIONS.find((x) => x.room === r);
    return m ? m.id : null;
  }

  function updateUI() {
    const r = room();
    const chips = $("chips");
    chips.innerHTML = "";
    D.MISSIONS.forEach((m) => {
      const c = document.createElement("button");
      c.type = "button";
      c.className = "chip" + (st.done[m.id] ? " done" : "") + (m.room === r && roomMission(r) === m.id ? " here" : "");
      c.textContent = m.emoji;
      c.setAttribute("aria-label", m.time + " " + m.name + (st.done[m.id] ? " おわった" : ""));
      c.addEventListener("click", () => openList());
      chips.appendChild(c);
    });
    const id = roomMission(r);
    const btn = $("missionBtn");
    if (id) {
      const m = D.MISSIONS.find((x) => x.id === id);
      btn.hidden = false;
      btn.dataset.id = id;
      btn.textContent = st.done[id] ? `✅ ${m.time}：${m.name}（もう いちど）` : `▶ ${m.time}：${m.name}`;
    } else btn.hidden = true;
    // つぎ に やる こと
    const next = D.MISSIONS.find((m) => !st.done[m.id]);
    $("hint").textContent = next ? (next.id === "idou" && !st.done.idou ? "🧗 " + next.hint : "つぎ は " + next.emoji + " " + next.hint)
      : "ぜんぶ おわった！ 📇 で まめちしき を よみかえそう";
    HOTSPOTS.forEach((h) => h.q.setAttribute("display", st.cards[h.card] ? "none" : ""));
    $("cardsBtn").setAttribute("aria-label", `まめちしき カード（${Object.keys(st.cards).length} まい）`);
  }

  $("missionBtn").addEventListener("click", () => { S.unlock(); openMission($("missionBtn").dataset.id); });

  /* ---------- オーバーレイ ---------- */
  const OVS = ["ovMission", "ovList", "ovCompare", "ovCards", "ovEnd"];
  function openOv() { return OVS.find((id) => !$(id).hidden); }
  function show(id) { OVS.forEach((o) => { if (o !== id) hide(o); }); $(id).hidden = false; }
  function hide(id) {
    $(id).hidden = true;
    if (id === "ovMission") stopLoop();
    if (id === "ovCompare") cmpStop();
  }
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => hide(b.closest(".ov").id)));
  OVS.forEach((id) => $(id).addEventListener("click", (e) => { if (e.target.id === id) hide(id); }));

  /* ---------- カード ---------- */
  function gainCards(ids, popup) {
    const fresh = ids.filter((id) => !st.cards[id]);
    fresh.forEach((id) => { st.cards[id] = true; });
    if (fresh.length) save();
    updateUI();
    if (popup) openCards(ids[0]);
    return fresh;
  }
  function openCards(focus) {
    const grid = $("cardGrid");
    grid.innerHTML = "";
    $("cardCount").textContent = `${Object.keys(st.cards).length} / ${D.CARDS.length}`;
    D.CARDS.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      const have = !!st.cards[c.id];
      b.className = "kcard" + (have ? "" : " no");
      b.innerHTML = have ? `<span class="e">${c.emoji}</span><span>${c.title}</span>` : `<span class="e">❔</span><span>まだ ひみつ</span>`;
      b.dataset.id = c.id;
      b.addEventListener("click", () => detail(c.id));
      grid.appendChild(b);
    });
    $("cardDetail").hidden = true;
    show("ovCards");
    if (focus) detail(focus);
  }
  function detail(id) {
    const c = D.CARDS.find((x) => x.id === id);
    const box = $("cardDetail");
    box.hidden = false;
    if (!st.cards[id]) { box.innerHTML = "<b>❔ まだ ひみつ</b><br>ミッション を やったり、へや の 「？」 を タップ すると もらえる よ。"; return; }
    box.innerHTML = `<b>${c.emoji} ${c.title}</b><br>${c.text}`;
  }
  $("cardsBtn").addEventListener("click", () => { S.unlock(); openCards(); });

  /* ---------- リスト ---------- */
  function openList() {
    const ul = $("mList");
    ul.innerHTML = "";
    D.MISSIONS.forEach((m) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="mk">${st.done[m.id] ? "✅" : m.emoji}</span><span><b>${m.time}：${m.name}</b><small>${m.hint}</small></span>`;
      ul.appendChild(li);
    });
    show("ovList");
  }
  $("listBtn").addEventListener("click", () => { S.unlock(); openList(); });
  function newDay() {
    st.done = {}; st.visited = {}; st.visited[room()] = true; save();
    A.x = 200; A.y = 150; F.grab(A);
    updateUI();
  }
  $("resetBtn").addEventListener("click", () => { newDay(); hide("ovList"); toast("🌅 あたらしい いちにち の はじまり！"); });
  $("endAgain").addEventListener("click", () => { newDay(); hide("ovEnd"); });
  $("endCards").addEventListener("click", () => openCards());

  /* ---------- おと ---------- */
  function soundUI() {
    const b = $("soundBtn");
    b.textContent = st.sound ? "🔊" : "🔇";
    b.setAttribute("aria-pressed", st.sound ? "true" : "false");
  }
  $("soundBtn").addEventListener("click", () => { st.sound = !st.sound; S.set(st.sound); save(); soundUI(); });

  /* ======================================================================
   * ミッション
   * ==================================================================== */
  let loopId = 0, loopFn = null;
  function loop(fn) {
    stopLoop();
    loopFn = fn;
    let last = 0;
    const tick = (now) => {
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      if (loopFn) loopFn(dt);
      loopId = requestAnimationFrame(tick);
    };
    loopId = requestAnimationFrame(tick);
  }
  function stopLoop() { cancelAnimationFrame(loopId); loopFn = null; }

  const art = () => $("mArt"), ctl = () => $("mCtl");
  function setText(s) { $("mText").innerHTML = s; }
  function newArt(bg) {
    const box = art();
    box.innerHTML = "";
    const s = el("svg", { viewBox: "0 0 300 200" }, box);
    if (bg) el("rect", { x: 0, y: 0, width: 300, height: 200, fill: bg }, s);
    return s;
  }
  function button(label, fn, cls) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn " + (cls || "mission"); b.textContent = label;
    b.addEventListener("click", fn);
    ctl().appendChild(b);
    return b;
  }
  function progress() {
    const p = document.createElement("div");
    p.className = "prog"; p.innerHTML = "<i></i>";
    ctl().before ? art().after(p) : ctl().appendChild(p);
    return (v) => { p.firstChild.style.width = Math.round(Math.min(1, v) * 100) + "%"; };
  }
  function clearStep() {
    stopLoop();
    ctl().innerHTML = "";
    document.querySelectorAll("#ovMission .prog, #ovMission .got").forEach((x) => x.remove());
  }
  function artPoint(e, s) {
    const rc = s.getBoundingClientRect();
    return { x: ((e.clientX - rc.left) / rc.width) * 300, y: ((e.clientY - rc.top) / rc.height) * 200 };
  }

  function openMission(id) {
    const m = D.MISSIONS.find((x) => x.id === id);
    if (!m) return;
    $("mTitle").textContent = `${m.emoji} ${m.time}：${m.name}`;
    clearStep();
    show("ovMission");
    MISSION_FN[id]();
  }

  function finishMission(id, fromStation) {

    st.done[id] = true; save();
    const fresh = gainCards(D.MISSION_CARDS[id] || [], false);
    S.pikon();
    updateUI();
    if (fromStation) {
      toast(`✅ ミッション クリア！「${D.MISSIONS.find((x) => x.id === id).name}」` + (fresh.length ? ` 📇 カード ${fresh.length}まい` : ""), 3500);
      return;
    }
    clearStep();
    const got = document.createElement("div");
    got.className = "got";
    const cs = (D.MISSION_CARDS[id] || []).map((c) => D.CARDS.find((x) => x.id === c));
    got.innerHTML = `<b>✅ ミッション クリア！</b>` + (cs.length ? `<br>📇 まめちしき カード：` + cs.map((c) => `${c.emoji} ${c.title}`).join("、") : "");
    ctl().before(got);
    if (cs.length) button("📇 カード を よむ", () => openCards(cs[0].id), "sub");
    if (id === "yoru") button("🌙 おつかれさま", () => openEnd());
    else button("👍 ステーション に もどる", () => hide("ovMission"));

  }

  /* --- あさ: おきる・はみがき --- */
  function mAsa() {
    // 1. ジッパー
    setText("おはよう！ ねぶくろ の ジッパー を したに ひっぱって あけよう（ゆび で したへ なぞる か、ボタン）。");
    const s = newArt("#dbe4ff");
    for (let k = 0; k < 6; k++) el("rect", { x: 10 + k * 48, y: 6, width: 40, height: 14, rx: 3, fill: "#fff", opacity: 0.6 }, s);
    const who = astronaut(s);
    el("rect", { x: 105, y: 40, width: 90, height: 150, rx: 36, fill: "#748ffc" }, s);
    const open = el("path", { d: "M150 60 L150 60", stroke: "#ffd8a8", "stroke-width": 0, fill: "#4c6ef5" }, s);
    el("line", { x1: 150, y1: 60, x2: 150, y2: 180, stroke: "#dbe4ff", "stroke-width": 3, "stroke-dasharray": "5 3" }, s);
    const tab = el("rect", { x: 142, y: 55, width: 16, height: 14, rx: 4, fill: "#ffd43b", stroke: "#e67700" }, s);
    who.pose(0, 150, 50, 0, 0.9); who.sleep(true);
    let p = 0, t = 0;
    const bar = progress();
    const set = (v) => {
      p = Math.min(1, v);
      const y = 60 + p * 120;
      tab.setAttribute("y", y - 5);
      open.setAttribute("d", `M150 60 Q${150 - 22 * p} ${(60 + y) / 2} 150 ${y} Q${150 + 22 * p} ${(60 + y) / 2} 150 60Z`);
      bar(p);
      if (p >= 1) { S.zip(); who.sleep(false); setTimeout(brush, 500); }
    };
    let dragY = null;
    s.addEventListener("pointerdown", (e) => { dragY = artPoint(e, s).y; });
    s.addEventListener("pointermove", (e) => {
      if (dragY == null || p >= 1) return;
      const y = artPoint(e, s).y;
      if (y > dragY) { set(p + (y - dragY) / 120); if (Math.random() < 0.3) S.zip(); }
      dragY = y;
    });
    s.addEventListener("pointerup", () => { dragY = null; });
    button("⬇ ジッパー を ひく", () => { if (p < 1) { S.zip(); set(p + 0.25); } });
    loop((dt) => { t += dt; who.pose(t * (p >= 1 ? 1 : 0.2), 150, 50 - p * 10, 0, 0.9); });

    // 2. はみがき
    function brush() {
      clearStep();
      setText("はみがき を しよう。ながしだい で みず を ながせない ので、<b>のみこんでも だいじょうぶ な はみがきこ</b> を つかう ひと も いる よ。");
      const s2 = newArt("#e7f5ff");
      const w = astronaut(s2);
      const br = el("g", {}, s2);
      el("rect", { x: -3, y: -30, width: 6, height: 44, rx: 3, fill: "#20c997" }, br);
      el("rect", { x: -5, y: -36, width: 10, height: 10, rx: 2, fill: "#fff", stroke: "#adb5bd" }, br);
      const bub = el("g", {}, s2);
      let n = 0, tt = 0;
      const bar2 = progress();
      loop((dt) => { tt += dt; w.pose(tt, 150, 120, 0, 1.6); br.setAttribute("transform", `translate(${189 + Math.sin(tt * 20) * (n ? 4 : 0)} 104) rotate(-80)`); });
      button("🪥 ごしごし", () => {
        n++; S.tap(); bar2(n / 5);
        el("circle", { cx: 170 + Math.random() * 30, cy: 70 + Math.random() * 30, r: 3 + Math.random() * 5, fill: "#fff", stroke: "#74c0fc" }, bub);
        if (n >= 5) setTimeout(towel, 400);
      });
    }
    // 3. かお を ふく
    function towel() {
      clearStep();
      setText("かお は ぬれタオル で ふく よ（みず を かける と、しずく が かお に くっついて とれない）。タオル で かお を なでよう。");
      const s3 = newArt("#fff4e6");
      const w = astronaut(s3);
      const tw = el("rect", { x: 220, y: 40, width: 50, height: 34, rx: 8, fill: "#ff8787", stroke: "#fff", "stroke-width": 3 }, s3);
      let rub = 0, tt = 0, last = null;
      const bar3 = progress();
      const add = (v) => { rub = Math.min(1, rub + v); bar3(rub); if (rub >= 1) { S.pikon(); setTimeout(() => finishMission("asa"), 300); rub = 2; } };
      loop((dt) => { tt += dt; w.pose(tt, 150, 125, 0, 1.6); });
      s3.addEventListener("pointerdown", (e) => { last = artPoint(e, s3); });
      s3.addEventListener("pointermove", (e) => {
        if (!last || rub > 1) return;
        const q = artPoint(e, s3);
        tw.setAttribute("x", q.x - 25); tw.setAttribute("y", q.y - 17);
        if (Math.hypot(q.x - 150, q.y - 90) < 50) add(Math.hypot(q.x - last.x, q.y - last.y) / 300);
        last = q;
      });
      s3.addEventListener("pointerup", () => { last = null; });
      button("🧻 ふきふき", () => {
        if (rub > 1) return;
        S.water(); tw.setAttribute("x", 120 + Math.random() * 10); tw.setAttribute("y", 70); add(0.25);
      });
    }
  }

  /* --- あさごはん --- */
  function mGohan() {
    setText("あさごはん は ふくろ に はいった かわかした ごはん。<b>おゆ を いれて もどそう</b>（3かい）。");
    const s = newArt("#fff3bf");
    const bag = el("g", { transform: "translate(150 110)" }, s);
    const body = el("rect", { x: -40, y: -50, width: 80, height: 100, rx: 14, fill: "#e9ecef", stroke: "#868e96", "stroke-width": 2 }, bag);
    txt(bag, 0, -5, "🍛", 34);
    el("rect", { x: -8, y: -62, width: 16, height: 14, rx: 3, fill: "#495057" }, bag);
    txt(s, 240, 60, "♨️", 34);
    let n = 0;
    const bar = progress();
    button("♨️ おゆ を いれる", () => {
      if (n >= 3) return;
      n++; S.water(); bar(n / 3);
      body.setAttribute("x", -40 - n * 5); body.setAttribute("width", 80 + n * 10);
      body.setAttribute("fill", ["#e9ecef", "#fff3bf", "#ffe8cc", "#ffd8a8"][n]);
      if (n >= 3) setTimeout(spoon, 500);
    });

    function spoon() {
      clearStep();
      setText("できあがり！ あっ、<b>てを はなした スプーン が ふわふわ ただよって いく</b>！ ゆび で タップ して つかまえよう。");
      const s2 = newArt("#fff3bf");
      const bag2 = el("g", { transform: "translate(70 120)" }, s2);
      el("rect", { x: -40, y: -50, width: 80, height: 100, rx: 14, fill: "#ffd8a8", stroke: "#868e96", "stroke-width": 2 }, bag2);
      txt(bag2, 0, -5, "🍛", 34);
      const sp = el("g", { class: "spoon" }, s2);
      el("ellipse", { cx: 0, cy: -16, rx: 9, ry: 12, fill: "#ced4da", stroke: "#868e96", "stroke-width": 2 }, sp);
      el("rect", { x: -3, y: -4, width: 6, height: 34, rx: 3, fill: "#ced4da", stroke: "#868e96", "stroke-width": 2 }, sp);
      el("circle", { r: 40, fill: "transparent" }, sp);
      const b = F.body({ x: 110, y: 90, vx: 55, vy: -32, r: 22 });
      let rot = 0, caught = false;
      loop((dt) => {
        if (caught) return;
        F.step(b, dt, F.SPACE, { x0: 0, y0: 0, x1: 300, y1: 200 });
        rot += dt * 40;
        sp.setAttribute("transform", `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${rot.toFixed(1)})`);
      });
      s2.addEventListener("pointerdown", (e) => {
        if (caught) return;
        const q = artPoint(e, s2);
        if (Math.hypot(q.x - b.x, q.y - b.y) < 44) {
          caught = true; S.grab();
          setText("つかまえた！ うちゅう では ごはん も ふくろ の まま、こぼさない ように たべる よ。");
          setTimeout(() => finishMission("gohan"), 700);
        } else S.tap();
      });
    }
  }

  /* --- じっけん --- */
  function mJikken() {
    // 1. みず の たま を つくる
    setText("ストロー から みず を だして みよう。<b>ボタン を おしつづける</b> と みず が でる よ。");
    const s = newArt("#d3f9d8");
    el("rect", { x: 0, y: 150, width: 90, height: 12, fill: "#63e6be" }, s);
    el("path", { d: "M20 156 L120 110", stroke: "#fa5252", "stroke-width": 7, "stroke-linecap": "round" }, s);
    const rg = F.ring(16, 4);
    const ball = el("path", { fill: "#74c0fc", opacity: 0.85, stroke: "#1c7ed6", "stroke-width": 2 }, s);
    const shine = el("ellipse", { rx: 6, ry: 4, fill: "#fff", opacity: 0.8 }, s);
    let holding = false, cx = 160, cy = 95, t = 0, phase = 1, pokes = 0;
    const bar = progress();
    loop((dt) => {
      t += dt;
      if (phase === 1 && holding) grow(dt * 30);
      F.stepRing(rg, dt);
      if (phase === 2) { cx = 160 + Math.sin(t * 0.5) * 10; cy = 95 + Math.cos(t * 0.4) * 6; }
      ball.setAttribute("d", F.ringPath(rg, cx, cy));
      shine.setAttribute("cx", cx - rg.rest * 0.4); shine.setAttribute("cy", cy - rg.rest * 0.4);
    });
    function grow(v) {
      if (phase !== 1) return;
      rg.rest = Math.min(48, rg.rest + v);
      rg.pts.forEach((p) => { p.r = Math.max(p.r, rg.rest * 0.9); });
      cx = 120 + rg.rest; bar((rg.rest - 4) / 44);
      if (rg.rest >= 48) { phase = 2; S.poyon(); setTimeout(pokeStep, 300); }
    }
    const hb = button("💧 みず を だす（おしつづける）", () => { grow(8); S.water(); });
    hb.addEventListener("pointerdown", () => { holding = true; S.water(); });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => hb.addEventListener(ev, () => { holding = false; }));

    // 2. つつく
    function pokeStep() {
      ctl().innerHTML = "";
      document.querySelectorAll("#ovMission .prog").forEach((x) => x.remove());
      setText("まるい <b>みず の たま</b> が できた！ ゆび で つついて みよう（3かい）。ぷるぷる ゆれて、また まるく もどる よ。");
      const bar2 = progress();
      const doPoke = (q) => {
        const ang = Math.atan2(q.y - cy, q.x - cx);
        F.poke(rg, ang, 140); S.poyon();
        pokes++; bar2(pokes / 3);
        if (pokes === 3) setTimeout(flame, 1400);
      };
      s.addEventListener("pointerdown", (e) => {
        if (phase !== 2 || pokes >= 3) return;
        const q = artPoint(e, s);
        if (Math.hypot(q.x - cx, q.y - cy) < rg.rest + 30) doPoke(q);
      });
      button("👆 つつく", () => { if (pokes < 3) doPoke({ x: cx - 40, y: cy + Math.random() * 20 - 10 }); });
    }

    // 3. ほのお
    function flame() {
      clearStep();
      setText("こんど は ほのお の かたち を くらべよう。");
      const s3 = newArt("#212529");
      txt(s3, 75, 22, "🌏 ちきゅう", 14, { fill: "#fff" });
      txt(s3, 225, 22, "🛰️ うちゅう", 14, { fill: "#fff" });
      el("line", { x1: 150, y1: 10, x2: 150, y2: 190, stroke: "#495057", "stroke-width": 2 }, s3);
      const fl = el("g", { opacity: 0 }, s3);
      el("path", { d: "M75 150 Q50 120 75 50 Q100 120 75 150Z", fill: "#ffa94d" }, fl);
      el("path", { d: "M75 148 Q62 125 75 85 Q88 125 75 148Z", fill: "#ffe066" }, fl);
      el("circle", { cx: 225, cy: 120, r: 30, fill: "#4dabf7", opacity: 0.6 }, fl);
      el("circle", { cx: 225, cy: 120, r: 18, fill: "#a5d8ff", opacity: 0.7 }, fl);
      [75, 225].forEach((x) => el("rect", { x: x - 2, y: 148, width: 4, height: 30, fill: "#adb5bd" }, s3));
      let lit = false, tt = 0;
      loop((dt) => { tt += dt; if (lit) fl.setAttribute("transform", `translate(0 ${Math.sin(tt * 9) * 1.2})`); });
      const b = button("🔥 ひ を つける", () => {
        if (lit) return;
        lit = true; fl.setAttribute("opacity", 1); S.kiran();
        setText("ちきゅう では あたたまった くうき が のぼる ので ほそながい ほのお。<b>うちゅう では くうき が のぼらない ので、まるく あおっぽい ほのお</b> に なる よ。");
        b.remove();
        button("🌱 つぎ の じっけん へ", plant);
      });
    }

    // 4. しょくぶつ
    function plant() {
      clearStep();
      setText("しょくぶつ の そだち を しらべよう。<b>ひかり を あてる</b> と…？（3かい）");
      const s4 = newArt("#e6fcf5");
      el("rect", { x: 40, y: 30, width: 220, height: 150, rx: 10, fill: "#fff", stroke: "#63e6be", "stroke-width": 3 }, s4);
      const lamp = el("circle", { cx: 240, cy: 60, r: 12, fill: "#ced4da" }, s4);
      el("rect", { x: 110, y: 150, width: 60, height: 22, rx: 4, fill: "#a0522d" }, s4);
      const stem = el("path", { d: "M140 150 L140 145", stroke: "#2f9e44", "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, s4);
      const leaves = el("g", {}, s4);
      let n = 0;
      const bar4 = progress();
      button("💡 ひかり を あてる", () => {
        if (n >= 3) return;
        n++; S.kiran(); bar4(n / 3);
        lamp.setAttribute("fill", "#ffd43b");
        const tipX = 140 + n * 18, tipY = 150 - n * 28;
        stem.setAttribute("d", `M140 150 Q140 ${150 - n * 20} ${tipX} ${tipY}`);
        el("ellipse", { cx: 140 + n * 12, cy: 150 - n * 22, rx: 10, ry: 5, fill: "#51cf66", transform: `rotate(-25 ${140 + n * 12} ${150 - n * 22})` }, leaves);
        if (n >= 3) {
          setText("うえ も した も ない うちゅう でも、しょくぶつ は <b>ひかり の ほう へ のびる</b> よ。うちゅう で やさい を そだてる じっけん も して いる。");
          setTimeout(() => finishMission("jikken"), 1800);
        }
      });
    }
  }

  /* --- うんどう --- */
  function mUndou() {
    setText("おもさ を かんじない と きんにく と ほね が よわく なる。だから まいにち やく 2じかん うんどう！ <b>ひだり・みぎ を こうご に</b> おして はしろう。");
    const s = newArt("#ffe3e3");
    el("rect", { x: 70, y: 168, width: 160, height: 16, rx: 8, fill: "#495057" }, s);
    const belt = el("line", { x1: 80, y1: 176, x2: 220, y2: 176, stroke: "#868e96", "stroke-width": 3, "stroke-dasharray": "8 6" }, s);
    const cordL = el("line", { stroke: "#f03e3e", "stroke-width": 3 }, s);
    const cordR = el("line", { stroke: "#f03e3e", "stroke-width": 3 }, s);
    txt(s, 255, 110, "ゴム", 12, { fill: "#c92a2a" });
    const w = astronaut(s);
    const clock = txt(s, 60, 30, "0ぷん / 120ぷん", 14, { fill: "#c92a2a", "font-weight": 700 });
    let steps = 0, lastFoot = "", t = 0, off = 0;
    const N = 16;
    const bar = progress();
    loop((dt) => {
      t += dt;
      const bob = Math.abs(Math.sin(off * 0.5)) * 3;
      w.pose(t, 150, 128 - bob, 0, 1.2);
      cordL.setAttribute("x1", 135); cordL.setAttribute("y1", 125 - bob); cordL.setAttribute("x2", 85); cordL.setAttribute("y2", 168);
      cordR.setAttribute("x1", 165); cordR.setAttribute("y1", 125 - bob); cordR.setAttribute("x2", 215); cordR.setAttribute("y2", 168);
      belt.setAttribute("stroke-dashoffset", off * 6);
    });
    const press = (foot) => {
      if (steps >= N) return;
      if (foot === lastFoot) { S.bonk(); setText("<b>こうご に</b> おそう！ ひだり → みぎ → ひだり …"); return; }
      lastFoot = foot; steps++; off += 1; S.step(); bar(steps / N);
      clock.textContent = `${Math.round((steps / N) * 120)}ぷん / 120ぷん`;
      if (steps >= N) {
        setText("2じかん はしった（はやおくり）！ ゴム で からだ を ゆか に おさえて いる から、ういて しまわずに はしれる よ。");
        setTimeout(() => finishMission("undou"), 1200);
      }
    };
    button("👟 ひだり", () => press("L"), "sub");
    button("👟 みぎ", () => press("R"), "sub");
  }

  /* --- まど: ちきゅう を みる --- */
  function mMado() {
    setText("まど から ちきゅう を みよう。ステーション は やく 90ぷん で 1しゅう。<b>🌅 ひので を 2かい</b> みて、<b>🗾 にほん の うえ</b> を とおったら クリア！");
    const s = newArt("#0b1230");
    for (let i = 0; i < 40; i++) el("circle", { cx: (i * 73) % 300, cy: (i * 41) % 200, r: i % 5 === 0 ? 1.4 : 0.8, fill: "#fff", opacity: 0.7 }, s);
    const CX = 140, CY = 105, R = 55, OR = 82;
    // たいよう（みぎ）
    el("circle", { cx: 300, cy: CY, r: 30, fill: "#ffd43b", opacity: 0.9 }, s);
    txt(s, 278, 30, "☀️ たいよう", 11, { fill: "#ffe066" });
    el("circle", { cx: CX, cy: CY, r: OR, fill: "none", stroke: "#4c6ef5", "stroke-width": 1, "stroke-dasharray": "3 4" }, s);
    const earth = el("g", {}, s);
    el("circle", { cx: CX, cy: CY, r: R, fill: "url(#mEarth)" }, s);
    const defs = el("defs", {}, s);
    const rgd = el("radialGradient", { id: "mEarth" }, defs);
    el("stop", { offset: "0", "stop-color": "#74c0fc" }, rgd);
    el("stop", { offset: "1", "stop-color": "#1971c2" }, rgd);
    s.appendChild(earth);
    // りく（くるくる まわる）
    [[30, 0.7, 14], [100, 0.5, 18], [200, 0.75, 12], [260, 0.4, 16]].forEach(([a, rr, sz]) => {
      const x = CX + Math.cos((a * Math.PI) / 180) * R * rr, y = CY - Math.sin((a * Math.PI) / 180) * R * rr;
      el("ellipse", { cx: x, cy: y, rx: sz, ry: sz * 0.6, fill: "#69db7c", opacity: 0.9 }, earth);
    });
    const jp = el("g", {}, earth);
    const JR = R * 0.78, J0 = (F.japanAngle(0) * Math.PI) / 180;
    jp.setAttribute("transform", `translate(${(CX + Math.cos(J0) * JR).toFixed(1)} ${(CY - Math.sin(J0) * JR).toFixed(1)})`);
    // よる の かげ（ひだり はんぶん）
    el("path", { d: `M${CX} ${CY - R} A${R} ${R} 0 0 0 ${CX} ${CY + R}Z`, fill: "#000", opacity: 0.6 }, s);
    const lights = el("circle", { r: 4, fill: "#ffe066", opacity: 0 }, s);
    const st0 = el("g", {}, s);
    el("rect", { x: -9, y: -3, width: 18, height: 6, fill: "#74c0fc", stroke: "#fff", "stroke-width": 1 }, st0);
    el("rect", { x: -3, y: -5, width: 6, height: 10, fill: "#dee2e6" }, st0);
    const hud = txt(s, 8, 14, "", 12, { fill: "#fff", "text-anchor": "start", "font-weight": 700 });
    const dn = txt(s, 8, 32, "", 12, { fill: "#ffe066", "text-anchor": "start", "font-weight": 700 });
    const rise = txt(s, 8, 186, "", 12, { fill: "#ffd8a8", "text-anchor": "start", "font-weight": 700 });
    const jpT = txt(s, 292, 186, "", 12, { fill: "#ff8787", "text-anchor": "end", "font-weight": 700 });
    el("circle", { r: 4, fill: "#fa5252", stroke: "#fff", "stroke-width": 1.5 }, jp);
    txt(jp, 0, -9, "にほん", 9, { fill: "#fff", "font-weight": 700 });

    let tm = 0, speed = 8, risesN = 0, japan = false, done = false, near = false;
    loop((dt) => {
      const t0 = tm;
      tm += dt * speed;
      const sa = F.stationAngle(tm), ja = F.japanAngle(tm);
      const rad = (sa * Math.PI) / 180;
      st0.setAttribute("transform", `translate(${(CX + Math.cos(rad) * OR).toFixed(1)} ${(CY - Math.sin(rad) * OR).toFixed(1)}) rotate(${(-sa - 90).toFixed(0)})`);
      const jr = (ja * Math.PI) / 180;
      const jx = CX + Math.cos(jr) * JR, jy = CY - Math.sin(jr) * JR;
      earth.setAttribute("transform", `rotate(${(-(360 * tm) / F.DAY).toFixed(2)} ${CX} ${CY})`);
      // にほん が よる なら まち の あかり
      lights.setAttribute("cx", jx); lights.setAttribute("cy", jy);
      lights.setAttribute("opacity", F.isDay(ja) ? 0 : 0.8);
      const h = Math.floor(tm / 60), mi = Math.floor(tm % 60);
      hud.textContent = `⏱ ${h}じかん ${mi}ふん`;
      dn.textContent = F.isDay(sa) ? "☀️ ひる" : "🌙 よる";
      const nr = F.sunrises(t0, tm);
      if (nr > 0) { risesN += nr; S.kiran(); }
      rise.textContent = `🌅 ひので ${risesN}かい`;
      const gap = F.angleGap(sa, ja);
      if (gap < 9 && !near) {
        near = true; japan = true; S.pikon();
        jpT.textContent = "🗾 にほん の うえ！";
      } else if (gap > 20) { near = false; if (japan) jpT.textContent = "🗾 にほん ✅"; }
      if (!done && risesN >= 2 && japan) {
        done = true;
        setText(`${h}じかん で ひので ${risesN}かい！ 24じかん だと <b>ひので は ${F.sunrisesPerDay()}かい</b>。ステーション は 1びょう で やく 8キロ すすむ ので、ちきゅう は どんどん かわって みえる よ。`);
        ctl().innerHTML = "";
        button("✅ ミッション クリア", () => finishMission("mado"));
      }
    });
    const fast = button("⏩ はやおくり", () => {
      speed = speed === 8 ? 60 : 8;
      fast.textContent = speed === 8 ? "⏩ はやおくり" : "▶ ふつう";
    }, "sub");
    fast.id = "fastBtn";
  }

  /* --- よる --- */
  function mYoru() {
    const rest = D.MISSIONS.filter((m) => m.id !== "yoru" && !st.done[m.id]);
    if (rest.length) {
      setText("まだ ねる まえ に やる こと が ある よ：<br>" + rest.map((m) => `${m.emoji} ${m.time}：${m.name}`).join("<br>"));
      newArt("#1b1f3b");
      txt(art().firstChild, 150, 100, "🌙 … まだ ねむく ない", 18, { fill: "#fff" });
      button("👍 わかった", () => hide("ovMission"));
      return;
    }
    setText("きょう も おつかれさま。かべ に ゆわえた <b>ねぶくろ</b> に はいろう。");
    const s = newArt("#1b1f3b");
    for (let i = 0; i < 25; i++) el("circle", { cx: (i * 53) % 300, cy: (i * 29) % 200, r: 0.9, fill: "#fff", opacity: 0.5 }, s);
    el("rect", { x: 95, y: 20, width: 110, height: 170, rx: 10, fill: "#364fc7" }, s);
    const w = astronaut(s);
    const bag = el("rect", { x: 112, y: 70, width: 76, height: 120, rx: 30, fill: "#748ffc", opacity: 0 }, s);
    [90, 160].forEach((y) => el("rect", { x: 100, y, width: 100, height: 5, fill: "#adb5bd" }, s));
    const zz = txt(s, 210, 50, "", 18, { fill: "#ffe066" });
    let inBag = false, sleep = false, t = 0;
    loop((dt) => {
      t += dt;
      w.pose(t * (sleep ? 0.6 : 1.4), 150, inBag ? 75 : 110, 0, 1.3);
      if (sleep) zz.textContent = ["z", "zz", "zzz"][Math.floor(t) % 3];
    });
    const b1 = button("🛌 ねぶくろ に はいる", () => {
      inBag = true; bag.setAttribute("opacity", 1); s.appendChild(bag); s.appendChild(w.g); S.zip();
      w.g.parentNode.insertBefore(bag, w.g.nextSibling);
      setText("うえ も した も ない から、たった まま でも ねられる。ねむる と <b>うで が ふわっと うく</b> よ。");
      b1.remove();
      button("🌙 おやすみ", () => {
        sleep = true; w.sleep(true); S.fanfare();
        setTimeout(() => finishMission("yoru"), 1600);
      });
    });
  }

  const MISSION_FN = { asa: mAsa, gohan: mGohan, jikken: mJikken, undou: mUndou, mado: mMado, yoru: mYoru,
    idou: () => { setText(D.MISSIONS.find((m) => m.id === "idou").hint); button("👍 わかった", () => hide("ovMission")); } };

  /* ---------- おつかれさま ---------- */
  function openEnd() {
    const s = $("endArt");
    s.innerHTML = "";
    for (let i = 0; i < 50; i++) el("circle", { cx: (i * 67) % 300, cy: (i * 37) % 120, r: i % 6 ? 0.8 : 1.5, fill: "#fff", opacity: 0.8 }, s);
    el("circle", { cx: 150, cy: 330, r: 220, fill: "#0c1a3a" }, s);
    el("circle", { cx: 150, cy: 330, r: 220, fill: "none", stroke: "#4dabf7", "stroke-width": 3, opacity: 0.6 }, s);
    // まち の あかり（にほん の ような ゆみなり）
    const city = [[200, 150], [192, 156], [185, 160], [176, 166], [168, 170], [160, 172], [150, 176], [142, 180], [206, 142], [212, 134], [120, 185], [100, 190], [80, 180], [230, 170], [245, 180]];
    city.forEach(([x, y], i) => el("circle", { cx: x, cy: y, r: i < 8 ? 2.4 : 1.6, fill: "#ffe066", opacity: 0.9 }, s));
    txt(s, 150, 40, "🛰️", 26);
    hide("ovMission");
    show("ovEnd");
  }

  /* ---------- ちきゅう と くらべる ---------- */
  let cmpExp = "water", cmpId = 0;
  const CMP_TEXT = {
    water: "うちゅう では こぼれた みず が <b>まるい たま</b> に なって ふわふわ うく。ちきゅう では じゅうりょく で <b>した に おちて</b> みずたまり に なる。",
    ball: "うちゅう では てを はなした ボール は <b>その ばしょ に うかんだ まま</b>（すこし うごいて いれば まっすぐ すすむ）。ちきゅう では <b>おちて はずむ</b>。",
  };
  function cmpStop() { cancelAnimationFrame(cmpId); cmpId = 0; }
  function cmpDraw(run) {
    cmpStop();
    $("cmpText").innerHTML = CMP_TEXT[cmpExp];
    const sv = [$("cmpSpace"), $("cmpEarth")];
    const sims = sv.map((s, i) => {
      s.innerHTML = "";
      el("rect", { x: 0, y: 0, width: 160, height: 200, fill: i ? "#e7f5ff" : "#dbe4ff" }, s);
      el("rect", { x: 0, y: 188, width: 160, height: 12, fill: i ? "#8ce99a" : "#adb5bd" }, s);
      const opt = i ? F.EARTH : F.SPACE;
      const bounds = { x0: 0, y0: 0, x1: 160, y1: 188 };
      if (cmpExp === "water") {
        el("path", { d: "M14 40 L40 40 L36 70 L18 70Z", fill: "#fff", stroke: "#868e96", "stroke-width": 2, transform: "rotate(60 27 55)" }, s);
        if (i === 0) {
          const rg = F.ring(14, 14), b = F.body({ x: 48, y: 62, vx: run ? 14 : 0, vy: run ? 6 : 0, r: 14 });
          const p = el("path", { fill: "#74c0fc", stroke: "#1c7ed6", "stroke-width": 1.5, opacity: run ? 1 : 0 }, s);
          if (run) F.poke(rg, 0, 60);
          return { step(dt) { F.step(b, dt, opt, bounds); F.stepRing(rg, dt); p.setAttribute("d", F.ringPath(rg, b.x, b.y)); } };
        }
        const drops = run ? [0, 1, 2, 3, 4].map((k) => F.body({ x: 46 + k * 3, y: 60 + k * 2, vx: 18 + k * 6, vy: -10 + k * 4, r: 4 })) : [];
        const ds = drops.map(() => el("ellipse", { rx: 4, ry: 5, fill: "#4dabf7" }, s));
        const pud = el("ellipse", { cx: 75, cy: 188, rx: 0, ry: 4, fill: "#4dabf7", opacity: 0.8 }, s);
        let landed = 0;
        return { step(dt) {
          drops.forEach((d, k) => {
            if (d.gone) return;
            F.step(d, dt, opt, bounds);
            ds[k].setAttribute("cx", d.x); ds[k].setAttribute("cy", d.y);
            if (d.y >= 188 - d.r - 0.5) { d.gone = true; ds[k].remove(); landed++; pud.setAttribute("rx", 10 + landed * 7); }
          });
        } };
      }
      // ボール
      el("path", { d: "M50 30 q10 -10 20 0 l0 14 l-20 0z", fill: "#ffd8a8" }, s);
      const b = F.body({ x: 60, y: 60, vx: run ? 6 : 0, vy: run ? 3 : 0, r: 12 });
      const g = el("g", {}, s);
      el("circle", { r: 12, fill: "#fff", stroke: "#212529", "stroke-width": 1.5 }, g);
      el("path", { d: "M-4 -4 L4 -4 L6 3 L0 7 L-6 3Z", fill: "#212529" }, g);
      g.setAttribute("transform", `translate(${b.x} ${b.y})`);
      return { step(dt) { F.step(b, dt, opt, bounds); g.setAttribute("transform", `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`); } };
    });
    if (!run) return;
    S.water();
    let last = 0, tt = 0;
    const tick = (now) => {
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now; tt += dt;
      sims.forEach((x) => x.step(dt));
      if (tt < 6) cmpId = requestAnimationFrame(tick);
    };
    cmpId = requestAnimationFrame(tick);
  }
  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x === t));
    cmpExp = t.dataset.exp; cmpDraw(false);
  }));
  $("cmpGo").addEventListener("click", () => { S.unlock(); cmpDraw(true); });
  $("compareBtn").addEventListener("click", () => { S.unlock(); show("ovCompare"); cmpDraw(false); });

  /* ---------- はじまり ---------- */
  buildStation();
  svg.appendChild(look.g);
  S.set(st.sound);
  soundUI();
  updateUI();
  requestAnimationFrame(frame);
  // 1かいめ の タッチ で おと（ファン）を はじめる
  document.addEventListener("pointerdown", () => S.unlock(), { once: true });

  // テスト（check.js）から つかう
  window.__uchu = {
    get st() { return st; }, A, room,
    teleport(r) { A.x = r * W + W / 2; A.y = 150; F.grab(A); },
  };
})();
