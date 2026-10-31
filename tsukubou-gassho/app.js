/* つくぼうの せみ がっしょう ｜ 画面・そうさ・えんしゅつ・保存 */
(function () {
  "use strict";
  const B = TG.Board, C = TG.Chara, S = TG.Stages, AU = TG.Audio;
  const $ = (id) => document.getElementById(id);
  const KEY = "tsukubou-gassho-v1";
  const W = B.W, H = B.H;

  /* ================= 保存 ================= */
  function defaults() {
    return {
      stagesDone: [], best: { easy: 0, normal: 0, hard: 0 }, maxChain: 0,
      flown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, garbage: 0, practice: [],
      settings: { bgm: true, se: true, diff: "easy" },
    };
  }
  function load() {
    const d = defaults();
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && typeof s === "object") {
        Object.assign(d, s);
        d.best = Object.assign(defaults().best, s.best || {});
        d.flown = Object.assign(defaults().flown, s.flown || {});
        d.settings = Object.assign(defaults().settings, s.settings || {});
        if (!Array.isArray(d.stagesDone)) d.stagesDone = [];
        if (!Array.isArray(d.practice)) d.practice = [];
      }
    } catch (e) { /* よめなくても あそべる */ }
    return d;
  }
  let save = load();
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても つづける */ } }
  AU.setBgm(save.settings.bgm);
  AU.setSe(save.settings.se);

  /* ================= セミの 絵 ================= */
  const IMG = {};
  [1, 2, 3, 4, 5, 9].forEach((id) => {
    IMG[id] = {};
    [["n", {}], ["b", { blink: true }], ["s", { sing: true }]].forEach(([k, o]) => {
      const im = new Image();
      im.src = C.dataUrl(C.svg(id, o));
      IMG[id][k] = im;
    });
  });

  /* ================= 画面 きりかえ ================= */
  const SCREENS = ["title", "modes", "story", "practice", "zukan", "settings", "game"];
  function show(id) {
    SCREENS.forEach((s) => { $(s).hidden = s !== id; });
    document.body.classList.toggle("playing", id === "game");
    if (id !== "game") { AU.bgmStop(); setPhaseClass(0); }
    if (id === "story") renderStages();
    if (id === "practice") renderProbs();
    if (id === "zukan") renderZukan();
    syncToggles();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => { AU.se("tap"); show(b.dataset.back); }));
  $("hero").innerHTML = C.hero();
  $("goModes").onclick = () => { AU.se("tap"); show("modes"); };
  $("goZukan").onclick = () => { AU.se("tap"); show("zukan"); };
  $("goSettings").onclick = () => { AU.se("tap"); show("settings"); };
  $("mStory").onclick = () => { AU.se("tap"); show("story"); };
  $("mEndless").onclick = () => { AU.se("tap"); startEndless(); };
  $("mPractice").onclick = () => { AU.se("tap"); show("practice"); };
  $("mZukan").onclick = () => { AU.se("tap"); show("zukan"); };

  // 音: さいしょの タップで はじめて ならせるように する
  const unlockOnce = () => { AU.unlock(); };
  window.addEventListener("pointerdown", unlockOnce, { capture: true });
  window.addEventListener("keydown", unlockOnce, { capture: true });

  function syncToggles() {
    document.querySelectorAll("[data-toggle]").forEach((b) => {
      const on = save.settings[b.dataset.toggle];
      b.classList.toggle("off", !on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll("[data-diff]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.diff === save.settings.diff ? "true" : "false"));
  }
  function toggle(k) {
    save.settings[k] = !save.settings[k];
    if (k === "bgm") AU.setBgm(save.settings.bgm);
    if (k === "se") AU.setSe(save.settings.se);
    store(); syncToggles();
    AU.se("tap");
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("[data-toggle]");
    if (t) toggle(t.dataset.toggle);
    const d = e.target.closest && e.target.closest("[data-diff]");
    if (d) { save.settings.diff = d.dataset.diff; store(); syncToggles(); AU.se("tap"); }
  });
  $("resetData").onclick = () => {
    dialog(`<h3>きろくを けす？</h3><p>すすみ・ベストスコア・ずかんが ぜんぶ きえるよ。</p>`,
      [["けす", () => { const st = save.settings; save = defaults(); save.settings = st; store(); toast("きろくを けしたよ"); }], ["やめる", null, true]]);
  };

  /* ================= ダイアログ・おしらせ ================= */
  function dialog(html, btns) {
    $("dlg").innerHTML = html + `<div class="btns">${btns.map((b, i) => `<button data-i="${i}" class="${b[2] ? "" : i === 0 ? "main" : ""}">${b[0]}</button>`).join("")}</div>`;
    $("ov").hidden = false;
    $("dlg").querySelectorAll(".btns button").forEach((el) => {
      el.onclick = () => { AU.se("tap"); $("ov").hidden = true; const f = btns[+el.dataset.i][1]; if (f) f(); };
    });
    const first = $("dlg").querySelector(".btns button");
    if (first) first.focus({ preventScroll: true });
  }
  let toastT = 0;
  function toast(msg, ms) {
    const t = $("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, ms || 2200);
  }
  const chainEl = $("chainText");
  function bigText(html) {
    chainEl.innerHTML = html;
    chainEl.classList.remove("show");
    void chainEl.offsetWidth;
    chainEl.classList.add("show");
  }
  const NUM = ["", "ひとり", "ふたり", "さんにん", "よにん", "ごにん", "ろくにん", "ななにん", "はちにん", "きゅうにん", "じゅうにん"];
  function chainLabel(n) { return (NUM[n] || n + "にん") + "で がっしょう！"; }
  function goalText(g) {
    switch (g.type) {
      case "clear": return `セミを ${g.n}ひき とばそう`;
      case "chain": return `${NUM[g.n]}で がっしょう（${g.n}れんさ）を ${g.times}かい`;
      case "kind": return `${C.BY[g.id].name}を ${g.n}ひき とばそう`;
      case "garbage": return `ぬけがらを ${g.n}こ けそう`;
      case "score": return `${g.n}てん とろう`;
      case "gassho": return `「だいがっしょう！」を ${g.n}かい`;
    }
    return "";
  }

  /* ================= ステージ・もんだい・ずかん の いちらん ================= */
  function stageOpen(i) { return i === 0 || save.stagesDone.indexOf(i - 1) >= 0 || save.stagesDone.indexOf(i) >= 0; }
  function renderStages() {
    $("stageList").innerHTML = S.STAGES.map((s, i) => {
      const open = stageOpen(i), done = save.stagesDone.indexOf(i) >= 0;
      return `<button class="day ${done ? "done" : ""} ${open ? "" : "lock"}" data-st="${i}" ${open ? "" : "disabled"}>
        <span class="d">${s.day}</span><span class="t">${s.title}</span><span class="s">${goalText(s.goal)}</span></button>`;
    }).join("");
    $("stageList").querySelectorAll("[data-st]").forEach((b) => { b.onclick = () => { AU.se("tap"); startStory(+b.dataset.st); }; });
  }
  function renderProbs() {
    $("probList").innerHTML = S.PRACTICE.map((p, i) => {
      const done = save.practice.indexOf(i) >= 0;
      return `<button class="day ${done ? "done" : ""}" data-pr="${i}"><span class="d">もんだい ${i + 1}</span>
        <span class="t">${NUM[p.target]}で がっしょう</span><span class="s">${p.target}れんさ を つくろう</span></button>`;
    }).join("");
    $("probList").querySelectorAll("[data-pr]").forEach((b) => { b.onclick = () => { AU.se("tap"); startPractice(+b.dataset.pr); }; });
  }
  const MORE_AT = 20;
  function renderZukan() {
    const open = C.LIST.filter((c) => save.flown[c.id] > 0).length + (save.garbage > 0 ? 1 : 0);
    $("zukanNote").textContent = `${open} / 6 ひらいたよ。セミを とばすと ずかんに のるよ（${MORE_AT}ひき とばすと まめちしき）。`;
    const cards = C.LIST.map((c) => {
      const n = save.flown[c.id] || 0;
      const says = S.STAGES.map((s, i) => (s.from === c.id && save.stagesDone.indexOf(i) >= 0 ? s.say : null)).filter(Boolean);
      if (!n) {
        return `<div class="zc lock" data-id="${c.id}" style="--c:#adb5bd"><div class="top"><img alt="" src="${C.dataUrl(C.svg(c.id))}">
          <div><h3>？？？</h3><p class="lockmsg">${c.id === 5 ? "ゆうがたに あえるかも…" : "まだ とばして いないよ"}</p></div></div></div>`;
      }
      return `<div class="zc" data-id="${c.id}" style="--c:${c.id === 4 ? "#343a40" : c.dark};--c2:${c.id === 4 ? "#343a40" : c.dark}">
        <div class="top"><img alt="${c.name}" src="${C.dataUrl(C.svg(c.id, { sing: true }))}">
          <div><h3>${c.name}</h3><div class="model">${c.model}・しるし: ${c.mark}</div>
          <button class="voice-btn" data-voice="${c.id}">▶ なきごえ</button></div></div>
        <dl><dt>なきごえ</dt><dd>「${c.voice}」</dd><dt>なく じき</dt><dd>${c.season}</dd><dt>なく じかん</dt><dd>${c.time}</dd><dt>おおきさ</dt><dd>${c.size}</dd><dt>せいかく</dt><dd>${c.who}</dd><dt>とばした</dt><dd>${n}ひき</dd></dl>
        <p>${c.about}</p>
        ${n >= MORE_AT ? `<p class="more">💡 ${c.more}</p>` : `<p class="lockmsg">💡 あと ${MORE_AT - n}ひき とばすと まめちしき</p>`}
        ${says.map((s) => `<p class="say">💬 「${s}」</p>`).join("")}
      </div>`;
    });
    const g = C.GARBAGE;
    cards.push(save.garbage > 0
      ? `<div class="zc" style="--c:#868e96;--c2:#495057"><div class="top"><img alt="" src="${C.dataUrl(C.svg(9))}"><div><h3>${g.name}</h3><div class="model">けした かず: ${save.garbage}こ</div></div></div><p>${g.about}</p></div>`
      : `<div class="zc lock" style="--c:#adb5bd"><div class="top"><img alt="" src="${C.dataUrl(C.svg(9))}"><div><h3>？？？</h3><p class="lockmsg">はいいろの なにか…</p></div></div></div>`);
    $("zukanList").innerHTML = cards.join("");
    $("zukanList").querySelectorAll("[data-voice]").forEach((b) => { b.onclick = () => { AU.unlock(); AU.voice(+b.dataset.voice); }; });
  }

  /* ================= ゲーム ================= */
  let G = null;           // いまの ゲーム
  let clock = 0;          // ゲームの とけい（とまっている あいだは すすまない）
  const waiters = [];
  function wait(ms) { return new Promise((res) => waiters.push({ at: clock + ms, res })); }

  function newGame(o) {
    const diff = save.settings.diff;
    const game = new B.Game({ diff, seed: o.seed || (Date.now() & 0x7fffffff), board: o.board, dayLen: o.dayLen,
      wrap: o.wrap, noGarbage: o.noGarbage });
    G = {
      mode: o.mode, diff, game, stage: o.stage, prob: o.prob, goal: o.goal || null,
      state: "busy", paused: false, fallAcc: 0, soft: false, elapsed: 0,
      offAnim: null, flyers: [], hintOn: false, phase: -1, done: false,
    };
    show("game");
    $("btnHint").hidden = o.mode !== "practice";
    chainEl.classList.remove("show"); chainEl.innerHTML = "";
    $("rainFx").classList.remove("on");
    $("toast").hidden = true;
    $("gaugeBox").hidden = o.mode === "practice";
    $("skyBox").hidden = o.mode === "practice";
    $("nextBox").style.visibility = o.mode === "practice" ? "hidden" : "";
    $("scoreLbl").textContent = o.mode === "practice" ? "もんだい" : "とくてん";
    layout();
    updatePhase(true);
    updateHud();
    AU.bgmStart(G.game.phase());
    return G;
  }

  function startEndless() {
    newGame({ mode: "endless", dayLen: 80, wrap: true });
    G.game.fill();
    spawnNext();
  }
  function startStory(i) {
    const st = S.STAGES[i];
    const board = st.rows ? B.fromRows(st.rows) : null;
    newGame({ mode: "story", stage: i, goal: st.goal, board, dayLen: st.dayLen || 60, wrap: false });
    G.paused = true;
    dialog(`<h3>${st.day}</h3><p>「${st.title}」</p><img class="face" alt="" src="${C.dataUrl(C.svg(st.from, { sing: true }))}">
      <p>きょうの めあて<br><b style="font-size:20px;color:#2b8a3e">${goalText(st.goal)}</b></p>
      <p class="sm">${diffName()}・${save.settings.diff === "easy" ? "つまっても ゆうだちで つづくよ" : "うえの まんなかまで つまると おしまい"}</p>`,
      [["はじめる！", () => { G.paused = false; AU.bgmStart(G.game.phase()); spawnNext(); }]]);
  }
  function startPractice(i) {
    const p = S.PRACTICE[i];
    newGame({ mode: "practice", prob: i, board: B.fromRows(p.rows), noGarbage: true, dayLen: 9999, wrap: false });
    G.game.queue = [];
    G.pair = B.spawn(p.pair[0], p.pair[1]);
    G.state = "aim";
    $("goal").innerHTML = `<span class="p">${i + 1}. ${NUM[p.target]}で がっしょう（${p.target}れんさ）</span><br>この くみを どこに おく？ ⬇ で おとす`;
    $("score").textContent = `${i + 1} / ${S.PRACTICE.length}`;
  }
  const diffName = () => ({ easy: "🌱 やさしい", normal: "🌳 ふつう", hard: "🔥 むずかしい" })[save.settings.diff];

  function spawnNext() {
    if (!G) return;
    const p = G.game.next();
    if (!p) { gameOver(); return; }
    G.pair = p;
    G.state = "fall";
    G.fallAcc = 0;
    drawNext();
  }

  /* ---------- そうさ ---------- */
  function canAct() { return G && !G.paused && (G.state === "fall" || G.state === "aim") && G.pair; }
  function act(a) {
    if (!canAct()) return;
    const b = G.game.board;
    let q = null;
    if (a === "left" || a === "right") {
      q = B.shift(b, G.pair, a === "left" ? -1 : 1, 0);
      if (q) { G.pair = q; AU.se("move"); }
    } else if (a === "rot") {
      q = B.rotate(b, G.pair, 1);
      if (q) { G.pair = q; AU.se("rotate"); }
    } else if (a === "drop") {
      G.pair = B.hardDrop(b, G.pair);
      land();
    }
  }
  function stepDown() {
    const q = B.shift(G.game.board, G.pair, 0, 1);
    if (q) { G.pair = q; return true; }
    land();
    return false;
  }

  // ボタン: おしっぱなしで くりかえし
  document.querySelectorAll(".pad").forEach((el) => {
    const a = el.dataset.act;
    let rep = 0;
    const stop = () => {
      el.classList.remove("on");
      clearTimeout(rep); clearInterval(rep); rep = 0;
      if (a === "down" && G) G.soft = false;
    };
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      el.classList.add("on");
      try { el.setPointerCapture(e.pointerId); } catch (er) { /* なくても よい */ }
      if (a === "down") {
        if (G && G.mode === "practice") { act("drop"); return; }
        if (G) G.soft = true;
        return;
      }
      act(a);
      if (a === "left" || a === "right") {
        rep = setTimeout(() => { rep = setInterval(() => act(a), 90); }, 260);
      }
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => el.addEventListener(ev, stop));
    // キーボードで ボタンを えらんで Enter したとき
    el.addEventListener("click", (e) => { if (e.detail === 0) act(a === "down" ? "drop" : a); });
  });

  // ばめんの スワイプ・タップ
  const cv = $("cv");
  let tp = null;
  cv.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (er) { /* なくても よい */ }
    tp = { x0: e.clientX, y0: e.clientY, ax: e.clientX, t0: performance.now(), moved: false, dropped: false };
  });
  cv.addEventListener("pointermove", (e) => {
    if (!tp || !G) return;
    const step = Math.max(18, G.cs * 0.9);
    let dx = e.clientX - tp.ax;
    while (Math.abs(dx) >= step) {
      act(dx > 0 ? "right" : "left");
      tp.ax += dx > 0 ? step : -step;
      dx = e.clientX - tp.ax;
      tp.moved = true;
    }
    const dy = e.clientY - tp.y0;
    if (!tp.dropped && dy > G.cs * 1.6 && dy > Math.abs(e.clientX - tp.x0) * 1.4) {
      tp.dropped = true; tp.moved = true;
      act("drop");
    }
  });
  const tpEnd = (e) => {
    if (!tp) return;
    const far = Math.hypot(e.clientX - tp.x0, e.clientY - tp.y0);
    if (!tp.moved && far < 14 && performance.now() - tp.t0 < 450) act("rot");
    tp = null;
  };
  cv.addEventListener("pointerup", tpEnd);
  cv.addEventListener("pointercancel", () => { tp = null; });

  // キーボード
  window.addEventListener("keydown", (e) => {
    if (!G || $("game").hidden) return;
    if (!$("ov").hidden) return;
    const k = e.key;
    if (k === "ArrowLeft") { act("left"); e.preventDefault(); }
    else if (k === "ArrowRight") { act("right"); e.preventDefault(); }
    else if (k === "ArrowUp" || k === " " || k === "x" || k === "X" || k === "z" || k === "Z") { if (!e.repeat || k === "ArrowUp") act("rot"); e.preventDefault(); }
    else if (k === "ArrowDown") { if (G.mode === "practice") { if (!e.repeat) act("drop"); } else G.soft = true; e.preventDefault(); }
    else if (k === "p" || k === "P" || k === "Escape") { pauseMenu(); e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => { if (e.key === "ArrowDown" && G) G.soft = false; });

  /* ---------- いちじ ていし ---------- */
  $("btnPause").onclick = () => pauseMenu();
  function pauseMenu() {
    if (!G || G.paused) return;
    G.paused = true; G.soft = false;
    AU.bgmStop();
    const btns = [["▶ つづける", resume]];
    if (G.mode === "story") btns.push(["🔁 はじめから", () => startStory(G.stage), true]);
    if (G.mode === "endless") btns.push(["🔁 はじめから", () => startEndless(), true]);
    if (G.mode === "practice") btns.push(["🔁 はじめから", () => startPractice(G.prob), true]);
    btns.push(["🏠 おわる", () => quitGame(), true]);
    dialog(`<h3>⏸ ひとやすみ</h3><div class="toggles"><button class="ibtn" data-toggle="bgm" aria-label="BGM">🎵</button><button class="ibtn" data-toggle="se" aria-label="こうかおん">🔊</button></div>`, btns);
    syncToggles();
  }
  function resume() { if (!G) return; G.paused = false; AU.bgmStart(G.game.phase()); }
  function quitGame() {
    if (G && G.mode === "endless") finishEndless(true);
    const m = G ? G.mode : "endless";
    G = null;
    show(m === "story" ? "story" : m === "practice" ? "practice" : "modes");
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden && G && !G.paused && !$("game").hidden) pauseMenu(); });
  window.addEventListener("blur", () => { if (G && !G.paused && !$("game").hidden && G.state === "fall") pauseMenu(); });

  /* ---------- ちゃくち → れんさ ---------- */
  async function land() {
    if (!G || G.state === "busy") return;
    const me = G;
    me.state = "busy";
    me.soft = false;
    const pair = me.pair;
    me.pair = null;
    const moves = B.lock(me.game.board, pair);
    AU.se("land");
    await animFalls(moves);
    if (G !== me) return;
    const steps = await runChain(me);
    if (G !== me) return;

    if (me.mode === "practice") { practiceResult(steps.length); return; }
    if (checkGoal()) return;

    // ぬけがらが ふる
    const n = me.game.garbageDue();
    if (n) {
      const placed = B.dropGarbage(me.game.board, n, me.game.rng);
      if (placed.length) {
        const fresh = {};
        placed.forEach((p) => { fresh[p.y * W + p.x] = p.y + 1; });
        startOffAnim(me, 160 + 40 * H, fresh);
        AU.se("garbage");
        await wait(160 + 40 * H);
        if (G !== me) return;
      }
    }
    // つまった？
    const top = me.game.checkTop();
    if (top.state === "rain") {
      AU.se("rain");
      $("rainFx").classList.remove("on"); void $("rainFx").offsetWidth; $("rainFx").classList.add("on");
      bigText("☔ ゆうだち！<small>うえの 4だんが ながれたよ</small>");
      top.gone.forEach((c) => { if (B.isSemi(c.c)) me.flyers.push({ id: c.c, x: c.x, y: c.y, t0: clock, dur: 700, rain: true }); });
      await wait(900);
      if (G !== me) return;
    } else if (top.state === "over") {
      gameOver();
      return;
    }
    updateHud();
    spawnNext();
  }

  async function runChain(me) {
    const steps = [];
    const voices = [];
    const g = me.game;
    for (;;) {
      const st = B.clearStep(g.board, steps.length + 1);
      if (!st) break;
      g.countStep(st);
      steps.push(st);
      st.groups.forEach((gr) => {
        if (voices.length >= 5) voices.shift();
        voices.push(gr.c);
        save.flown[gr.c] = (save.flown[gr.c] || 0) + gr.cells.length;
        gr.cells.forEach((c, i) => me.flyers.push({ id: gr.c, x: c.x, y: c.y, t0: clock + i * 15, dur: 420 }));
      });
      st.garbage.forEach((c) => me.flyers.push({ id: 9, x: c.x, y: c.y, t0: clock, dur: 380, crumble: true }));
      save.garbage += st.garbage.length;
      // れんさ ごとに なきごえを 1つずつ かさねる
      AU.chorus(voices.slice());
      if (steps.length >= 2) bigText(chainLabel(steps.length) + `<small>${st.points}てん</small>`);
      else bigText(`<small>${C.BY[st.groups[0].c].name}</small>「${C.BY[st.groups[0].c].voice}」`);
      updateHud(st.points);
      await wait(430);
      if (G !== me) return steps;
      const falls = B.gravity(g.board);
      await animFalls(falls);
      if (G !== me) return steps;
    }
    if (steps.length) {
      const r = g.endChain(steps);
      if (r.fin.chain > save.maxChain) save.maxChain = r.fin.chain;
      if (r.fin.tsukuBonus) {
        AU.voice(1, { short: true, finale: true, delay: 0.1 });
        bigText(`つくつく ぼーし… じーっ！<small>つくぼう ボーナス ×1.5</small>`);
        await wait(900);
      }
      if (r.fin.allClear) {
        AU.se("clear");
        bigText(`しーん… ぜんぶ とんだ！<small>＋1000てん</small>`);
        await wait(1000);
      }
      if (r.gassho) await daigassho(me);
      store();
      updatePhase(false);
      updateHud();
    }
    return steps;
  }

  async function daigassho(me) {
    const gone = B.clearAllGarbage(me.game.board);
    me.game.stats.garbage += gone.length;
    save.garbage += gone.length;
    gone.forEach((c) => me.flyers.push({ id: 9, x: c.x, y: c.y, t0: clock, dur: 600, crumble: true }));
    AU.se("gassho");
    AU.chorus([1, 2, 3, 4, 5]);
    bigText("🎵 だいがっしょう！ 🎵<small>ぬけがらが ぜんぶ きえた！</small>");
    await wait(1000);
    if (G !== me) return;
    await animFalls(B.gravity(me.game.board));
    // おちたら また つながるかも
    if (B.groups(me.game.board, 4).length) await runChain(me);
  }

  /* ---------- いちにちの ながれ ---------- */
  const PH_NAME = ["あさ", "ひる", "ゆうがた"];
  function setPhaseClass(p) { document.body.className = document.body.className.replace(/\bph\d\b/g, "").trim() + " ph" + p; }
  function updatePhase(first) {
    if (!G) return;
    const p = G.mode === "practice" ? 0 : G.game.phase();
    if (p !== G.phase) {
      const was = G.phase;
      G.phase = p;
      setPhaseClass(p);
      AU.bgmSetPhase(p);
      if (!first && was >= 0) {
        G.game.refreshQueue();
        drawNext();
        if (p === 2) toast("🌇 ゆうがたに なったよ。かなかな が きた！", 3000);
        else if (p === 1) toast("☀️ おひるに なったよ", 2000);
        else toast(`🌅 ${G.game.dayNo()}にちめの あさ！`, 2000);
        if (p === 2) AU.voice(5, { short: true });
      }
    }
    const fr = G.game.frac();
    $("sun").style.left = (fr * 100).toFixed(1) + "%";
    $("sun").textContent = p === 2 ? "🌇" : p === 1 ? "☀️" : "🌅";
    $("skyBox").title = PH_NAME[p];
  }

  /* ---------- めあて ---------- */
  function progress(goal) {
    const g = G.game, s = g.stats;
    switch (goal.type) {
      case "clear": return [g.cleared, goal.n];
      case "chain": return [g.chainsAtLeast(goal.n), goal.times];
      case "kind": return [s.kinds[goal.id] || 0, goal.n];
      case "garbage": return [s.garbage, goal.n];
      case "score": return [g.score, goal.n];
      case "gassho": return [s.gassho, goal.n];
    }
    return [0, 1];
  }
  function checkGoal() {
    if (!G || G.mode !== "story") return false;
    const [a, b] = progress(G.goal);
    if (a < b) return false;
    stageClear();
    return true;
  }
  function stageClear() {
    const i = G.stage, st = S.STAGES[i];
    G.state = "done"; G.paused = true;
    const first = save.stagesDone.indexOf(i) < 0;
    if (first) save.stagesDone.push(i);
    store();
    AU.bgmStop();
    AU.se("clear");
    setTimeout(() => AU.voice(st.from, { short: true }), 700);
    const c = C.BY[st.from];
    const btns = [];
    if (i + 1 < S.STAGES.length) btns.push(["つぎの ひへ ▶", () => startStory(i + 1)]);
    else btns.push(["🎉 ずかんを みる", () => { G = null; show("zukan"); }]);
    btns.push(["🏠 なつやすみ", () => { G = null; show("story"); }, true]);
    dialog(`<h3>🎉 ${st.day} クリア！</h3><img class="face" alt="" src="${C.dataUrl(C.svg(st.from, { sing: true }))}">
      <p><b>${c.name}</b>「${st.say}」</p>
      <p class="sm">${first ? "ずかんに ひとことが ふえたよ。" : ""}とくてん ${G.game.score}・いちばんの れんさ ${G.game.stats.maxChain}</p>
      ${i + 1 === S.STAGES.length ? "<p>なつやすみ ぜんぶ クリア！ おめでとう！</p>" : ""}`, btns);
  }

  function gameOver() {
    if (!G) return;
    G.state = "done"; G.paused = true;
    AU.bgmStop();
    AU.se("over");
    if (G.mode === "endless") { finishEndless(false); return; }
    const i = G.stage;
    dialog(`<h3>えだが いっぱい！</h3><p>うえの まんなかまで つまっちゃった。</p><p class="sm">とくてん ${G.game.score}</p>`,
      [["🔁 もういちど", () => startStory(i)], ["🏠 なつやすみ", () => { G = null; show("story"); }, true]]);
  }
  function finishEndless(quiet) {
    const d = G.diff, sc = G.game.score;
    const isNew = sc > (save.best[d] || 0);
    if (isNew) save.best[d] = sc;
    store();
    if (quiet) return;
    dialog(`<h3>おしまい！</h3>
      <dl class="res"><dt>とくてん</dt><dd>${sc}${isNew ? ' <span class="new">ベスト！</span>' : ""}</dd>
      <dt>ベスト</dt><dd>${save.best[d]}</dd><dt>いちばんの れんさ</dt><dd>${G.game.stats.maxChain}</dd>
      <dt>とばした セミ</dt><dd>${G.game.cleared}ひき</dd></dl><p class="sm">${diffName()}</p>`,
      [["🔁 もういちど", () => startEndless()], ["🏠 メニュー", () => { G = null; show("modes"); }, true]]);
  }

  /* ---------- れんしゅう ---------- */
  $("btnHint").onclick = () => {
    if (!G || G.mode !== "practice") return;
    G.hintOn = !G.hintOn;
    AU.se("tap");
    if (G.hintOn) toast("💡 " + S.PRACTICE[G.prob].tip, 3500);
  };
  async function practiceResult(chain) {
    const me = G, i = G.prob, p = S.PRACTICE[i];
    await wait(300);
    if (G !== me) return;
    G.state = "done";
    if (chain >= p.target) {
      if (save.practice.indexOf(i) < 0) save.practice.push(i);
      store();
      AU.se("ok");
      const btns = [];
      if (i + 1 < S.PRACTICE.length) btns.push(["つぎの もんだい ▶", () => startPractice(i + 1)]);
      btns.push(["🏠 もんだい いちらん", () => { G = null; show("practice"); }, true]);
      dialog(`<h3>⭕ せいかい！</h3><p>${chainLabel(chain)}</p><p class="sm">${save.practice.length} / ${S.PRACTICE.length} もん とけたよ</p>`, btns);
    } else {
      AU.se("ng");
      dialog(`<h3>おしい！</h3><p>${chain ? chain + "れんさ だったよ。" : "れんさに ならなかったよ。"}<br>${p.target}れんさ を めざそう。</p><p class="sm">💡ヒントを みても いいよ</p>`,
        [["🔁 もういちど", () => startPractice(i)], ["💡 ヒントつきで", () => { startPractice(i); G.hintOn = true; toast("💡 " + p.tip, 3500); }, true]]);
    }
  }

  /* ---------- HUD ---------- */
  function updateHud(pending) {
    if (!G || G.mode === "practice") return;
    $("score").textContent = G.game.score + (pending ? ` +${pending}` : "");
    $("gaugeFill").style.width = Math.min(100, G.game.gauge) + "%";
    $("gaugeBox").classList.toggle("full", G.game.gauge >= 80);
    if (G.mode === "story") {
      const [a, b] = progress(G.goal);
      $("goal").innerHTML = `めあて: ${goalText(G.goal)}<br><span class="p">${Math.min(a, b)} / ${b}</span>`;
    } else {
      $("goal").innerHTML = `${diffName()}・ベスト ${save.best[G.diff] || 0}<br>${G.game.dayNo()}にちめ`;
    }
  }

  /* ================= 描画 ================= */
  const ctx = cv.getContext("2d");
  const n1 = $("next1"), n2 = $("next2");
  let dpr = 1;
  function layout() {
    if (!G) return;
    const wrap = $("boardWrap");
    const r = wrap.getBoundingClientRect();
    const cs = Math.max(12, Math.floor(Math.min(r.width / W, r.height / H)));
    G.cs = cs;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = cs * W * dpr; cv.height = cs * H * dpr;
    cv.style.width = cs * W + "px"; cv.style.height = cs * H + "px";
    const land = window.matchMedia("(orientation: landscape)").matches;
    const ns = Math.round(Math.max(22, Math.min(land ? cs * 0.9 : cs * 0.55, 56)));
    [n1, n2].forEach((c, i) => {
      const s = i ? Math.round(ns * 0.8) : ns;
      c.width = s * dpr; c.height = s * 2 * dpr;
      c.style.width = s + "px"; c.style.height = s * 2 + "px";
    });
    drawNext();
  }
  if (window.ResizeObserver) new ResizeObserver(() => layout()).observe($("boardWrap"));
  window.addEventListener("resize", () => setTimeout(layout, 50));

  function drawNext() {
    if (!G) return;
    const q = G.game.queue;
    [[n1, q[0]], [n2, q[1]]].forEach(([c, pr]) => {
      const x = c.getContext("2d");
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, c.width, c.height);
      if (!pr) return;
      const s = c.width;
      drawSprite(x, pr[1], 0, 0, s, "n", 1);
      drawSprite(x, pr[0], 0, s, s, "n", 1);
    });
  }

  function drawSprite(x, id, px, py, s, v, alpha) {
    const im = IMG[id] && IMG[id][v || "n"];
    x.globalAlpha = alpha == null ? 1 : alpha;
    if (im && im.complete && im.naturalWidth) x.drawImage(im, px, py, s, s);
    else {
      const c = C.BY[id];
      x.fillStyle = c ? c.color : "#ccc";
      x.beginPath(); x.arc(px + s / 2, py + s / 2, s * 0.4, 0, Math.PI * 2); x.fill();
    }
    x.globalAlpha = 1;
  }

  // ちゃくち ばしょの かげ（それぞれ まっすぐ おちた さき）
  function ghostCells(b, p) {
    const cs = B.cells(B.hardDrop(b, p)).sort((u, v) => v.y - u.y);
    const tops = {};
    return cs.map((c) => {
      let y = tops[c.x] != null ? tops[c.x] : H - 1;
      if (tops[c.x] == null) { while (y >= 0 && b[y][c.x]) y--; }
      tops[c.x] = y - 1;
      return { x: c.x, y, c: c.c };
    });
  }

  function startOffAnim(me, dur, from) { me.offAnim = { t0: clock, dur, from }; }
  function animFalls(moves) {
    if (!G || !moves.length) return Promise.resolve();
    let maxD = 0;
    const fresh = {};
    moves.forEach((m) => { const d = m.to - m.from; fresh[m.to * W + m.x] = d; if (d > maxD) maxD = d; });
    const dur = 90 + maxD * 32;
    startOffAnim(G, dur, fresh);
    return wait(dur);
  }
  // おちている とちゅうの ずれ（マス）。うえへ ずらして かく
  function curOff(k) {
    const a = G.offAnim;
    if (!a || a.from[k] == null) return 0;
    const p = Math.min(1, (clock - a.t0) / a.dur);
    if (p >= 1) { G.offAnim = null; return 0; }
    return a.from[k] * (1 - p) * (1 - p);
  }

  function trunk(x, cs) {
    const w = cs * W, h = cs * H;
    const g = x.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "#6b4423"); g.addColorStop(0.5, "#9a6a3c"); g.addColorStop(1, "#6b4423");
    x.fillStyle = g;
    x.beginPath();
    if (x.roundRect) x.roundRect(0, 0, w, h, cs * 0.3); else x.rect(0, 0, w, h);
    x.fill();
    x.strokeStyle = "rgba(60,35,15,.35)"; x.lineWidth = Math.max(1, cs * 0.05);
    for (let i = 0; i < 7; i++) {
      const bx = (i + 0.5) * w / 7;
      x.beginPath();
      for (let y = 0; y <= h; y += cs) x.lineTo(bx + Math.sin(y / cs * 1.3 + i * 2) * cs * 0.12, y);
      x.stroke();
    }
    x.fillStyle = "rgba(60,35,15,.3)";
    [[1.2, 4.3], [4.6, 8.1], [2.5, 10.4]].forEach(([u, v]) => { x.beginPath(); x.ellipse(u * cs, v * cs, cs * 0.25, cs * 0.4, 0, 0, Math.PI * 2); x.fill(); });
    // えだの つけね（ここが つまると おしまい）
    x.strokeStyle = G.diff === "easy" ? "rgba(165,216,255,.9)" : "rgba(255,120,120,.9)";
    x.setLineDash([cs * 0.15, cs * 0.12]); x.lineWidth = Math.max(2, cs * 0.06);
    x.strokeRect(B.SPAWN_X * cs + 3, cs + 3, cs - 6, cs - 6);
    x.setLineDash([]);
  }

  function linkLines(x, b, cs, offFn) {
    x.lineCap = "round";
    x.lineWidth = cs * 0.24;
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
      const v = b[y][xx];
      if (!B.isSemi(v)) continue;
      const oy = offFn(y * W + xx);
      [[1, 0], [0, 1]].forEach(([dx, dy]) => {
        const nx = xx + dx, ny = y + dy;
        if (nx >= W || ny >= H || b[ny][nx] !== v) return;
        const oy2 = offFn(ny * W + nx);
        if (Math.abs(oy - oy2) > 0.01) return;
        x.strokeStyle = C.BY[v].id === 4 ? "#fd7e14" : C.BY[v].dark;
        x.beginPath();
        x.moveTo((xx + 0.5) * cs, (y - oy + 0.5 + (dy ? 0.25 : 0.15)) * cs);
        x.lineTo((nx + 0.5) * cs, (ny - oy2 + 0.5 + (dy ? -0.25 : 0.15)) * cs);
        x.stroke();
      });
    }
  }

  function blinkOf(k, t) { return ((t / 90 + k * 37) % 55) < 1.6; }

  function render() {
    if (!G || $("game").hidden || !G.cs) return;
    const cs = G.cs, b = G.game.board;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cs * W, cs * H);
    trunk(ctx, cs);
    const off = (k) => curOff(k);
    linkLines(ctx, b, cs, off);
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
      const v = b[y][xx];
      if (!v) continue;
      const k = y * W + xx;
      drawSprite(ctx, v, xx * cs, (y - off(k)) * cs, cs, v !== 9 && blinkOf(k, clock) ? "b" : "n");
    }
    // ガイド（やさしい）・ヒント（れんしゅう）
    if (G.pair && (G.state === "fall" || G.state === "aim")) {
      if (G.diff === "easy" || G.mode === "practice") {
        ghostCells(b, G.pair).forEach((c) => { if (c.y >= 0) drawSprite(ctx, c.c, c.x * cs, c.y * cs, cs, "n", 0.3); });
      }
      if (G.mode === "practice" && G.hintOn) {
        const pr = S.PRACTICE[G.prob];
        const ap = { x: pr.answer.x, y: pr.answer.rot === 0 ? 1 : 0, rot: pr.answer.rot, a: pr.pair[0], b: pr.pair[1] };
        const pulse = 0.5 + 0.5 * Math.sin(clock / 160);
        ctx.strokeStyle = `rgba(255,212,59,${0.5 + pulse * 0.5})`;
        ctx.lineWidth = Math.max(3, cs * 0.1);
        ghostCells(b, ap).forEach((c) => {
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(c.x * cs + 2, c.y * cs + 2, cs - 4, cs - 4, cs * 0.25); else ctx.rect(c.x * cs + 2, c.y * cs + 2, cs - 4, cs - 4);
          ctx.stroke();
        });
      }
      // おちてくる くみ（めを ぱちぱち・おなじ なかまなら てを つなぐ）
      const pc = B.cells(G.pair);
      if (G.pair.a === G.pair.b) {
        ctx.strokeStyle = G.pair.a === 4 ? "#fd7e14" : C.BY[G.pair.a].dark; ctx.lineWidth = cs * 0.24;
        ctx.beginPath(); ctx.moveTo((pc[0].x + 0.5) * cs, (pc[0].y + 0.6) * cs); ctx.lineTo((pc[1].x + 0.5) * cs, (pc[1].y + 0.6) * cs); ctx.stroke();
      }
      const bl = ((clock / 100) % 14) < 1.2;
      pc.forEach((c) => { if (c.y >= 0) drawSprite(ctx, c.c, c.x * cs, c.y * cs, cs, bl ? "b" : "n"); });
    }
    // とびたつ セミ
    G.flyers = G.flyers.filter((f) => clock - f.t0 < f.dur);
    G.flyers.forEach((f) => {
      const p = Math.max(0, (clock - f.t0) / f.dur);
      if (f.crumble) {
        const s = cs * (1 - p * 0.6);
        drawSprite(ctx, 9, f.x * cs + (cs - s) / 2, f.y * cs + (cs - s) / 2 + p * cs * 0.6, s, "n", 1 - p);
        return;
      }
      if (f.rain) { drawSprite(ctx, f.id, f.x * cs, (f.y + p * 3) * cs, cs, "b", 1 - p); return; }
      const hop = p < 0.3 ? -Math.sin(p / 0.3 * Math.PI) * 0.35 : -(p - 0.3) * (p - 0.3) * 12;
      const sc = 1 + Math.min(p, 0.3) * 0.8;
      const s = cs * sc;
      drawSprite(ctx, f.id, f.x * cs - (s - cs) / 2, (f.y + hop) * cs - (s - cs) / 2, s, "s", p < 0.7 ? 1 : (1 - p) / 0.3);
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = "#fff"; ctx.font = `${Math.round(cs * 0.5)}px sans-serif`;
      ctx.fillText("♪", (f.x + 0.75 + p * 0.3) * cs, (f.y + hop - 0.1 - p) * cs);
      ctx.globalAlpha = 1;
    });
  }

  /* ================= ループ ================= */
  let last = performance.now();
  function frame(t) {
    const dt = Math.min(100, t - last);
    last = t;
    if (G && !G.paused) {
      clock += dt;
      G.elapsed += dt / 1000;
      for (let i = waiters.length - 1; i >= 0; i--) if (clock >= waiters[i].at) { waiters[i].res(); waiters.splice(i, 1); }
      if (G.state === "fall" && G.pair) {
        G.fallAcc += dt;
        const iv = G.soft ? 45 : G.game.fallMs(G.elapsed);
        if (G.fallAcc >= iv) { G.fallAcc = 0; stepDown(); }
      }
    } else if (!G) {
      // ゲームの そとでは まっている ものを ぜんぶ おわらせる
      while (waiters.length) waiters.pop().res();
    }
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ================= テスト用 ================= */
  window.__tg = {
    get G() { return G; }, get save() { return save; }, B, S,
    show, startEndless, startStory, startPractice, act, layout,
    setRows(rows) { if (G) G.game.board = B.fromRows(rows); },
    setPair(a, b) { if (G) { G.pair = B.spawn(a, b); G.state = G.mode === "practice" ? "aim" : "fall"; } },
    setQueue(q) { if (G) { G.game.queue = q.map((p) => p.slice()); drawNext(); } },
  };

  show("title");
})();
